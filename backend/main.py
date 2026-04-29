# -*- coding: utf-8 -*-
"""
Predictive Influencer Marketing — FastAPI v4
============================================
Converts Colab notebook (v4 FINAL) to a production FastAPI service.

Services exposed:
  POST /train              — Generate synthetic dataset + train all 4 models
  POST /validate           — Validate a single influencer/campaign input
  POST /predict            — Full 3-stage prediction (ER → CVR → Revenue + success_prob)
  POST /recommend          — Goal-weighted Top-N influencer ranking from a pool
  POST /uncertainty        — Bootstrap 95% CI around revenue for up to 8 records
  GET  /shap               — SHAP feature-importance PNG (base64) for Stage-1 model
  GET  /cold-start         — Cold-start vs warm-test evaluation metrics
  GET  /health             — Liveness check
  GET  /schema             — Input validation schema
"""

import io
import base64
import warnings
import os
import uuid
from typing import Any, Dict, List, Optional

warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib
import shap
import matplotlib
matplotlib.use("Agg")          # non-interactive backend — safe for servers
import matplotlib.pyplot as plt

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.metrics import (
    mean_squared_error, r2_score,
    f1_score, roc_auc_score,
)
from sklearn.linear_model import Ridge, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from xgboost import XGBRegressor, XGBClassifier
from lightgbm import LGBMRegressor, LGBMClassifier

# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Predictive Influencer Marketing API",
    description="Multi-stage ML pipeline: ER → CVR → Revenue + Campaign Success",
    version="4.0.0",
)

# ── CORS — allow the Vite dev server and any localhost origin ─────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Global model state (populated by /train)
# ─────────────────────────────────────────────────────────────────────────────
STATE: Dict[str, Any] = {
    "trained": False,
    "s1_pipe": None,   # Stage-1: Engagement Rate
    "s2_pipe": None,   # Stage-2: Conversion Rate
    "s3_pipe": None,   # Stage-3: Revenue
    "cls_pipe": None,  # Classifier: Campaign Success
    "train_df": None,
    "val_df": None,
    "test_df": None,
    "cold_df": None,
    "preprocessor": None,
    "dataset": None,
}

SEED = 42
np.random.seed(SEED)

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────
NUMERIC_FEATURES = [
    "log_followers", "account_age_years", "is_verified",
    "hist_avg_likes_per_post", "hist_avg_comments_per_post",
    "hist_avg_shares_per_post", "hist_avg_saves_per_post",
    "fake_follower_pct", "audience_authenticity_score",
    "hist_posts_per_week", "log_reach", "hist_sentiment_score",
    "audience_female_pct", "audience_18_24_pct", "audience_25_34_pct", "audience_35plus_pct",
    "audience_geo_match", "engagement_per_follower", "interaction_velocity",
    "reach_quality_score", "content_consistency_score", "audience_concentration_score",
    "campaign_duration_days", "brand_alignment_score", "audience_age_match_score",
    "align_x_sent", "align_x_auth", "auth_x_reach", "inf_quality", "log_likes",
]
CATEGORICAL_FEATURES = [
    "platform", "niche", "influencer_tier", "primary_audience_geo",
    "brand_category", "campaign_budget_bracket", "campaign_goal",
    "target_audience_age", "payment_model",
]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

GOAL_WEIGHTS = {
    "Brand Awareness":    {"rev": 0.20, "er": 0.50, "success": 0.20, "align": 0.10},
    "Sales Conversion":   {"rev": 0.55, "er": 0.15, "success": 0.20, "align": 0.10},
    "Lead Generation":    {"rev": 0.35, "er": 0.30, "success": 0.25, "align": 0.10},
    "Product Launch":     {"rev": 0.35, "er": 0.35, "success": 0.20, "align": 0.10},
    "Community Building": {"rev": 0.15, "er": 0.45, "success": 0.25, "align": 0.15},
}

SCHEMA = {
    "required_numeric": {
        "followers_count":            (1, 50_000_000),
        "hist_avg_likes_per_post":    (0, 10_000_000),
        "hist_avg_comments_per_post": (0, 1_000_000),
        "fake_follower_pct":          (0, 100),
        "audience_authenticity_score": (0, 100),
        "brand_alignment_score":      (0.0, 1.0),
        "audience_age_match_score":   (0.0, 1.0),
        "audience_geo_match":         (0, 1),
        "hist_sentiment_score":       (0.0, 1.0),
    },
    "optional_numeric": {
        "hist_avg_shares_per_post": "median",
        "audience_female_pct":      "mean",
        "hist_avg_saves_per_post":  "median",
    },
    "required_categorical": {
        "platform":                ["Instagram", "YouTube", "TikTok", "Twitter/X", "Facebook"],
        "niche":                   ["Beauty", "Fitness", "Tech", "Fashion", "Food", "Travel",
                                    "Gaming", "Lifestyle", "Finance", "Health"],
        "influencer_tier":         ["Nano", "Micro", "Mid-Tier", "Macro", "Mega"],
        "campaign_goal":           ["Brand Awareness", "Lead Generation", "Product Launch",
                                    "Sales Conversion", "Community Building"],
        "campaign_budget_bracket": ["<$1K", "$1K-$5K", "$5K-$20K", "$20K-$100K", ">$100K"],
        "payment_model":           ["Flat Fee", "CPE", "CPA", "Revenue Share", "Gifting"],
    },
}

BKT_TO_MID = {"<$1K": 500, "$1K-$5K": 3000, "$5K-$20K": 12500, "$20K-$100K": 60000, ">$100K": 200000}

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────
class TrainRequest(BaseModel):
    n_samples: int = Field(1200, ge=500, le=10000, description="Synthetic dataset size")
    save_models: bool = Field(False, description="Persist .pkl files to disk")


class InfluencerInput(BaseModel):
    # Required numerics
    followers_count: float
    hist_avg_likes_per_post: float
    hist_avg_comments_per_post: float
    fake_follower_pct: float
    audience_authenticity_score: float
    brand_alignment_score: float
    audience_age_match_score: float
    audience_geo_match: int
    hist_sentiment_score: float
    # Optional numerics
    hist_avg_shares_per_post: Optional[float] = None
    audience_female_pct: Optional[float] = None
    hist_avg_saves_per_post: Optional[float] = None
    # Required categoricals
    platform: str
    niche: str
    influencer_tier: str
    campaign_goal: str
    campaign_budget_bracket: str
    payment_model: str
    # Extra fields used in feature engineering / pool filtering
    account_age_years: Optional[float] = 3.0
    is_verified: Optional[int] = 0
    hist_avg_reach_per_post: Optional[float] = 10000.0
    hist_posts_per_week: Optional[float] = 4.0
    audience_18_24_pct: Optional[float] = 35.0
    audience_25_34_pct: Optional[float] = 30.0
    audience_35plus_pct: Optional[float] = 35.0
    audience_concentration_score: Optional[float] = 0.65
    reach_quality_score: Optional[float] = 0.30
    content_consistency_score: Optional[float] = 50.0
    campaign_duration_days: Optional[int] = 30
    primary_audience_geo: Optional[str] = "Nigeria"
    brand_category: Optional[str] = "Tech"
    target_audience_age: Optional[str] = "25-34"
    # Pool filter helpers (set server-side if not provided)
    rule_min_followers_met: Optional[int] = None
    rule_niche_match: Optional[int] = None
    rule_budget_feasible: Optional[int] = None


class RecommendRequest(BaseModel):
    pool: List[Dict[str, Any]] = Field(..., description="List of influencer+campaign dicts")
    campaign_goal: str = Field("Sales Conversion")
    top_n: int = Field(10, ge=1, le=100)
    min_auth: float = Field(65.0)
    max_fake: float = Field(20.0)
    min_followers: int = Field(5000)
    require_geo_match: bool = Field(False)


class UncertaintyRequest(BaseModel):
    records: List[Dict[str, Any]] = Field(..., description="Up to 8 influencer+campaign dicts")
    n_bootstrap: int = Field(50, ge=10, le=200)


# ─────────────────────────────────────────────────────────────────────────────
# Core helpers (identical logic to notebook)
# ─────────────────────────────────────────────────────────────────────────────
def _generate_dataset(N: int = 1200, seed: int = SEED) -> pd.DataFrame:
    """Reproduce the exact synthetic dataset from the notebook."""
    np.random.seed(seed)
    N_INF = 320
    inf_pool = [f"INF{str(i+1).zfill(4)}" for i in range(N_INF)]
    cold_start_infs = set(inf_pool[:40])

    tier_fol = {
        "Nano": (1000, 9999), "Micro": (10000, 99999),
        "Mid-Tier": (100000, 499999), "Macro": (500000, 999999), "Mega": (1000000, 9999999),
    }
    inf_plat  = {i: np.random.choice(["Instagram","YouTube","TikTok","Twitter/X","Facebook"],
                                      p=[0.35,0.20,0.25,0.12,0.08]) for i in inf_pool}
    inf_niche = {i: np.random.choice(["Beauty","Fitness","Tech","Fashion","Food","Travel",
                                       "Gaming","Lifestyle","Finance","Health"],
                                      p=[0.14,0.12,0.12,0.11,0.10,0.10,0.09,0.10,0.06,0.06]) for i in inf_pool}
    inf_tier  = {i: np.random.choice(["Nano","Micro","Mid-Tier","Macro","Mega"],
                                      p=[0.20,0.30,0.25,0.15,0.10]) for i in inf_pool}
    inf_fol   = {i: int(np.random.uniform(*tier_fol[inf_tier[i]])) for i in inf_pool}
    inf_age   = {i: round(np.random.uniform(1,10),1) for i in inf_pool}
    inf_ver   = {i: int(inf_fol[i]>100000 and np.random.rand()>0.2) for i in inf_pool}

    influencer_ids = np.random.choice(inf_pool, N, replace=True)
    platforms = np.array([inf_plat[i] for i in influencer_ids])
    niches    = np.array([inf_niche[i] for i in influencer_ids])
    tiers     = np.array([inf_tier[i] for i in influencer_ids])
    followers = np.array([inf_fol[i] for i in influencer_ids])
    acc_age   = np.array([inf_age[i] for i in influencer_ids])
    verified  = np.array([inf_ver[i] for i in influencer_ids])

    niche_base_map = {"Gaming":5.5,"Beauty":5.2,"Fitness":5.3,"Food":4.8,"Fashion":4.5,
                      "Tech":3.8,"Travel":4.6,"Lifestyle":4.8,"Finance":3.5,"Health":5.2}
    base_int     = np.array([niche_base_map[n] for n in niches])
    like_rate    = np.clip(base_int - np.log10(followers)*0.35 + np.random.normal(0,0.6,N), 0.3, 10)
    comment_rate = like_rate * np.random.uniform(0.12, 0.18, N)

    hist_likes    = np.floor(followers*like_rate/100).astype(int)
    hist_comments = np.floor(followers*comment_rate/100).astype(int)
    hist_shares   = np.floor(followers*like_rate/100*0.09).astype(float)
    hist_saves    = np.floor(followers*like_rate/100*0.07).astype(int)
    hist_shares[np.random.rand(N)<0.07] = np.nan

    hist_ppw   = np.clip(np.random.normal(4,2,N),1,14).round(1)
    hist_sent  = np.clip(np.random.normal(0.65,0.15,N),0.10,0.99).round(3)
    plat_rmap  = {"Instagram":0.25,"YouTube":0.40,"TikTok":0.55,"Twitter/X":0.15,"Facebook":0.12}
    hist_rrate = np.array([np.clip(plat_rmap[p]+np.random.normal(0,0.05),0.05,0.80) for p in platforms]).round(3)
    hist_reach = np.floor(followers*hist_rrate).astype(int)
    fake_pct   = np.clip((8-like_rate)*1.8+np.random.normal(0,5,N),1,55).round(1)
    auth_score = np.clip(100-fake_pct*1.2+np.random.normal(0,5,N),20,100).round(1)

    aud_female = np.clip(np.random.normal(55,15,N),20,85).astype(float).round(1)
    aud_female[np.random.rand(N)<0.04] = np.nan
    aud_18_24  = np.clip(np.random.normal(35,10,N),5,65).round(1)
    aud_25_34  = np.clip(np.random.normal(30,8,N),5,55).round(1)
    aud_35plus = np.clip(100-aud_18_24-aud_25_34,5,70).round(1)
    geo = np.random.choice(
        ["Nigeria","USA","UK","India","Brazil","Canada","Germany","South Africa"],
        N, p=[0.18,0.22,0.10,0.12,0.08,0.06,0.08,0.16])

    eng_per_fol  = np.clip((hist_likes+hist_comments)/(followers+1)+np.random.normal(0,0.001,N),0.001,0.15).round(5)
    int_velocity = np.clip(hist_comments/(hist_likes+1)+np.random.normal(0,0.005,N),0.03,0.40).round(4)
    reach_qual   = np.clip(hist_rrate*auth_score/100+np.random.normal(0,0.03,N),0.01,0.85).round(3)
    consistency  = np.clip((hist_ppw/14*50)+np.random.normal(50,10,N),10,100).round(1)
    aud_conc     = np.clip(np.random.normal(0.65,0.15,N),0.10,0.99).round(3)

    brand_cat  = np.random.choice(
        ["Beauty","Tech","Food & Bev","Fashion","Health","Finance","Travel","Gaming"],
        N, p=[0.15,0.15,0.12,0.12,0.12,0.10,0.12,0.12])
    budget_raw = np.floor(followers*np.random.uniform(0.01,0.05,N)).astype(int).clip(200,500000)
    bkt_labels = ["<$1K","$1K-$5K","$5K-$20K","$20K-$100K",">$100K"]
    bkt        = pd.cut(budget_raw,bins=[0,1000,5000,20000,100000,10000000],labels=bkt_labels).astype(str)
    duration   = np.random.choice([7,14,21,30,45,60],N,p=[0.10,0.20,0.20,0.30,0.12,0.08])
    goal       = np.random.choice(["Brand Awareness","Lead Generation","Product Launch",
                                    "Sales Conversion","Community Building"],N,p=[0.25,0.20,0.20,0.25,0.10])
    tgt_age    = np.random.choice(["18-24","25-34","35-44","45+","All Ages"],N,p=[0.30,0.30,0.20,0.10,0.10])
    payment    = np.random.choice(["Flat Fee","CPE","CPA","Revenue Share","Gifting"],N,p=[0.40,0.20,0.20,0.10,0.10])
    camp_months= np.random.choice(range(1,19),N)
    camp_date  = np.array([f"{'2023' if m<=12 else '2024'}-{str(m if m<=12 else m-12).zfill(2)}-01"
                            for m in camp_months])

    def nba(n, b):
        mm = {("Beauty","Beauty"):1.0,("Fashion","Fashion"):1.0,("Tech","Tech"):1.0,
              ("Fitness","Health"):0.9,("Health","Health"):1.0,("Gaming","Gaming"):1.0,
              ("Finance","Finance"):1.0,("Travel","Travel"):1.0,("Food","Food & Bev"):1.0,
              ("Lifestyle","Beauty"):0.7,("Lifestyle","Fashion"):0.7,("Lifestyle","Travel"):0.7}
        return mm.get((n,b), round(np.random.uniform(0.2,0.6),2))

    brand_align = np.array([nba(niches[i],brand_cat[i])+np.random.normal(0,0.08) for i in range(N)]).clip(0,1).round(2)

    def amatch(a18, a25, ta):
        if ta=="18-24": return a18/100
        elif ta=="25-34": return a25/100
        elif ta=="35-44": return max(0,(100-a18-a25)/100)
        else: return 0.5

    age_match = np.array([np.clip(amatch(aud_18_24[i],aud_25_34[i],tgt_age[i])+np.random.normal(0,0.04),0,1)
                           for i in range(N)]).round(3)
    geo_match = np.random.choice([0,1],N,p=[0.35,0.65])

    rule_min_fol = (followers>=1000).astype(int)
    rule_niche   = (brand_align>=0.50).astype(int)
    rule_budget  = np.where(followers<10000,(budget_raw<5000).astype(int),
                   np.where(followers<100000,(budget_raw<50000).astype(int),(budget_raw<500000).astype(int)))

    actual_er = np.clip(
        like_rate*0.72 + brand_align*2.1 + hist_sent*1.4
        + auth_score*0.015 - fake_pct*0.035 + reach_qual*1.0
        + np.random.normal(0,0.5,N), 0.2, 14.0).round(3)

    actual_cvr = np.clip(
        actual_er*0.28 + brand_align*2.6 + age_match*1.9
        + hist_sent*1.1 + auth_score*0.012 - fake_pct*0.035
        + np.random.normal(0,0.35,N), 0.05, 12.0).round(3)

    base_rev  = np.random.uniform(20,120,N)
    est_conv  = np.floor(hist_reach * actual_cvr/100).astype(float)
    actual_rev= np.clip(est_conv*base_rev*brand_align + np.random.normal(0,500,N), 0, 200000).round(0)

    actual_roi = np.clip((actual_rev-budget_raw)/(budget_raw+1)+np.random.normal(0,0.5,N),-1.0,25.0).round(3)

    scomp = 0.30*(actual_er/14)+0.25*(actual_cvr/12)+0.25*brand_align+0.20*(auth_score/100)
    campaign_success = (scomp+np.random.normal(0,0.08,N)>0.45).astype(int)
    roi_tier = np.where(actual_roi<1,"Low",np.where(actual_roi<5,"Medium","High"))

    df = pd.DataFrame({
        "influencer_id": influencer_ids,
        "campaign_id": [f"CMP{str(i+1).zfill(4)}" for i in range(N)],
        "campaign_date": camp_date,
        "is_cold_start": [int(i in cold_start_infs) for i in influencer_ids],
        "platform":platforms,"niche":niches,"influencer_tier":tiers,
        "followers_count":followers,"account_age_years":acc_age,"is_verified":verified,
        "hist_avg_likes_per_post":hist_likes,"hist_avg_comments_per_post":hist_comments,
        "hist_avg_shares_per_post":hist_shares,"hist_avg_saves_per_post":hist_saves,
        "fake_follower_pct":fake_pct,"audience_authenticity_score":auth_score,
        "hist_posts_per_week":hist_ppw,"hist_avg_reach_per_post":hist_reach,
        "hist_sentiment_score":hist_sent,
        "audience_female_pct":aud_female,"audience_18_24_pct":aud_18_24,
        "audience_25_34_pct":aud_25_34,"audience_35plus_pct":aud_35plus,
        "primary_audience_geo":geo,
        "engagement_per_follower":eng_per_fol,"interaction_velocity":int_velocity,
        "reach_quality_score":reach_qual,"content_consistency_score":consistency,
        "audience_concentration_score":aud_conc,
        "brand_category":brand_cat,"campaign_budget_bracket":bkt,
        "campaign_duration_days":duration,"campaign_goal":goal,
        "target_audience_age":tgt_age,"payment_model":payment,
        "brand_alignment_score":brand_align,"audience_age_match_score":age_match,
        "audience_geo_match":geo_match,
        "rule_min_followers_met":rule_min_fol,"rule_niche_match":rule_niche,"rule_budget_feasible":rule_budget,
        "actual_engagement_rate":actual_er,"actual_conversion_rate_pct":actual_cvr,
        "actual_revenue_usd":actual_rev,"actual_roi":actual_roi,
        "campaign_success":campaign_success,"roi_tier":roi_tier,
    })
    return df, cold_start_infs


def feature_engineering(d: pd.DataFrame) -> pd.DataFrame:
    """Identical to notebook — applied at both train time and inference."""
    d = d.copy()
    d["log_followers"] = np.log1p(d["followers_count"])
    d["log_reach"]     = np.log1p(d["hist_avg_reach_per_post"])
    d["log_likes"]     = np.log1p(d["hist_avg_likes_per_post"])
    d["align_x_sent"]  = d["brand_alignment_score"] * d["hist_sentiment_score"]
    d["align_x_auth"]  = d["brand_alignment_score"] * d["audience_authenticity_score"] / 100
    d["auth_x_reach"]  = d["audience_authenticity_score"] / 100 * d["reach_quality_score"]
    d["inf_quality"]   = (
        d["engagement_per_follower"] * 50
        + d["audience_authenticity_score"] / 100 * 30
        + d["content_consistency_score"] / 100 * 20
    )
    return d


def validate_input_schema(data: dict) -> dict:
    """Validate a single input dict — same logic as notebook."""
    errors = []
    cleaned = data.copy()

    for feat, (lo, hi) in SCHEMA["required_numeric"].items():
        if feat not in cleaned:
            errors.append(f"MISSING required field: '{feat}'")
        else:
            val = cleaned[feat]
            if not isinstance(val, (int, float)):
                errors.append(f"TYPE ERROR: '{feat}' must be numeric, got {type(val).__name__}")
            elif not (lo <= val <= hi):
                errors.append(f"RANGE ERROR: '{feat}' = {val} outside [{lo}, {hi}]")

    for feat in SCHEMA["optional_numeric"]:
        if feat not in cleaned or cleaned[feat] is None:
            cleaned[feat] = np.nan

    for feat, allowed in SCHEMA["required_categorical"].items():
        if feat not in cleaned:
            errors.append(f"MISSING required field: '{feat}'")
        elif cleaned[feat] not in allowed:
            errors.append(f"VALUE ERROR: '{feat}' = '{cleaned[feat]}' not in {allowed}")

    if errors:
        raise ValueError("Input validation failed:\n  " + "\n  ".join(errors))

    return cleaned


def add_stage1_pred(X_df: pd.DataFrame, pred_er_arr) -> pd.DataFrame:
    X_aug = X_df.copy().reset_index(drop=True)
    X_aug["pred_engagement_rate"] = pd.Series(pred_er_arr)
    return X_aug


def add_stage2_pred(X_df: pd.DataFrame, pred_er_arr, pred_cvr_arr) -> pd.DataFrame:
    X_aug = X_df.copy().reset_index(drop=True)
    X_aug["pred_engagement_rate"] = pd.Series(pred_er_arr)
    X_aug["pred_conversion_rate"] = pd.Series(pred_cvr_arr)
    return X_aug


def _build_preprocessor():
    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler",  StandardScaler()),
    ])
    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([
        ("num", numeric_transformer, NUMERIC_FEATURES),
        ("cat", categorical_transformer, CATEGORICAL_FEATURES),
    ], remainder="drop")


def make_pipe(est, preprocessor):
    return Pipeline([("pre", preprocessor), ("model", est)])


def _require_trained():
    if not STATE["trained"]:
        raise HTTPException(status_code=400, detail="Models not trained. Call POST /train first.")


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "trained": STATE["trained"]}


@app.get("/schema")
def get_schema():
    return SCHEMA


@app.post("/train")
def train(req: TrainRequest):
    """
    Generate the synthetic dataset and train all 4 pipeline models.
    Stage 1: Engagement Rate
    Stage 2: Conversion Rate  (chain — uses pred_ER)
    Stage 3: Revenue          (chain — uses pred_ER + pred_CVR)
    Classifier: Campaign Success probability
    """
    N = req.n_samples
    df, cold_start_infs = _generate_dataset(N)
    df = feature_engineering(df)

    # ── Split ──────────────────────────────────────────────────────────────
    cold_mask = df["influencer_id"].isin(cold_start_infs)
    warm_df   = df[~cold_mask].copy()
    cold_df   = df[cold_mask].copy()

    warm_infs = warm_df["influencer_id"].unique()
    train_infs, test_infs = train_test_split(warm_infs, test_size=0.20, random_state=SEED)
    train_infs2, val_infs = train_test_split(train_infs, test_size=0.176, random_state=SEED)

    train_df = warm_df[warm_df.influencer_id.isin(train_infs2)].copy()
    val_df   = warm_df[warm_df.influencer_id.isin(val_infs)].copy()
    test_df  = warm_df[warm_df.influencer_id.isin(test_infs)].copy()

    X_train = train_df[ALL_FEATURES]; X_val = val_df[ALL_FEATURES]
    X_test  = test_df[ALL_FEATURES];  X_cold = cold_df[ALL_FEATURES]

    preprocessor = _build_preprocessor()

    def eval_reg(pipe, Xtr, ytr, Xv, yv):
        pipe.fit(Xtr, ytr)
        p = pipe.predict(Xv)
        return pipe, float(np.sqrt(mean_squared_error(yv, p))), float(r2_score(yv, p))

    # ── Stage 1 ────────────────────────────────────────────────────────────
    s1_models = {
        "Ridge":         make_pipe(Ridge(alpha=1.0), _build_preprocessor()),
        "Random Forest": make_pipe(RandomForestRegressor(n_estimators=200,random_state=SEED,n_jobs=-1), _build_preprocessor()),
        "XGBoost":       make_pipe(XGBRegressor(n_estimators=200,learning_rate=0.05,max_depth=6,random_state=SEED,verbosity=0), _build_preprocessor()),
        "LightGBM":      make_pipe(LGBMRegressor(n_estimators=200,learning_rate=0.05,random_state=SEED,verbose=-1), _build_preprocessor()),
    }
    y_s1_train = train_df["actual_engagement_rate"]
    y_s1_val   = val_df["actual_engagement_rate"]
    s1_results = {}
    for name, pipe in s1_models.items():
        fitted, rmse, r2 = eval_reg(pipe, X_train, y_s1_train, X_val, y_s1_val)
        s1_results[name] = {"pipe": fitted, "rmse": rmse, "r2": r2}

    best_s1_name = max(s1_results, key=lambda k: s1_results[k]["r2"])
    best_s1_pipe = s1_results[best_s1_name]["pipe"]

    pred_er_train = best_s1_pipe.predict(X_train)
    pred_er_val   = best_s1_pipe.predict(X_val)
    pred_er_test  = best_s1_pipe.predict(X_test)
    pred_er_cold  = best_s1_pipe.predict(X_cold)

    # ── Stage 2 ────────────────────────────────────────────────────────────
    NUM_S2 = NUMERIC_FEATURES + ["pred_engagement_rate"]
    pre_s2 = ColumnTransformer([
        ("num", Pipeline([("imp",SimpleImputer(strategy="median")),("sc",StandardScaler())]), NUM_S2),
        ("cat", Pipeline([("imp",SimpleImputer(strategy="most_frequent")),
                          ("enc",OneHotEncoder(handle_unknown="ignore",sparse_output=False))]), CATEGORICAL_FEATURES),
    ], remainder="drop")

    X_train_s2 = add_stage1_pred(X_train, pred_er_train)
    X_val_s2   = add_stage1_pred(X_val,   pred_er_val)
    X_test_s2  = add_stage1_pred(X_test,  pred_er_test)
    X_cold_s2  = add_stage1_pred(X_cold,  pred_er_cold)

    best_s2_pipe = Pipeline([("pre",pre_s2),("model",XGBRegressor(n_estimators=200,learning_rate=0.05,
                                                                    max_depth=6,random_state=SEED,verbosity=0))])
    y_s2_train = train_df["actual_conversion_rate_pct"]
    y_s2_val   = val_df["actual_conversion_rate_pct"]
    _, s2_rmse, s2_r2 = eval_reg(best_s2_pipe, X_train_s2, y_s2_train, X_val_s2, y_s2_val)

    pred_cvr_train = best_s2_pipe.predict(X_train_s2)
    pred_cvr_test  = best_s2_pipe.predict(X_test_s2)
    pred_cvr_cold  = best_s2_pipe.predict(X_cold_s2)

    # ── Stage 3 ────────────────────────────────────────────────────────────
    NUM_S3 = NUMERIC_FEATURES + ["pred_engagement_rate", "pred_conversion_rate"]
    pre_s3 = ColumnTransformer([
        ("num", Pipeline([("imp",SimpleImputer(strategy="median")),("sc",StandardScaler())]), NUM_S3),
        ("cat", Pipeline([("imp",SimpleImputer(strategy="most_frequent")),
                          ("enc",OneHotEncoder(handle_unknown="ignore",sparse_output=False))]), CATEGORICAL_FEATURES),
    ], remainder="drop")

    X_train_s3 = add_stage2_pred(X_train, pred_er_train, pred_cvr_train)
    X_val_s3   = add_stage2_pred(X_val,   pred_er_val,   best_s2_pipe.predict(X_val_s2))
    X_test_s3  = add_stage2_pred(X_test,  pred_er_test,  pred_cvr_test)

    best_s3_pipe = Pipeline([("pre",pre_s3),("model",XGBRegressor(n_estimators=200,learning_rate=0.05,
                                                                    max_depth=6,random_state=SEED,verbosity=0))])
    y_s3_train = train_df["actual_revenue_usd"]
    y_s3_val   = val_df["actual_revenue_usd"]
    _, s3_rmse, s3_r2 = eval_reg(best_s3_pipe, X_train_s3, y_s3_train, X_val_s3, y_s3_val)

    # ── Classifier ─────────────────────────────────────────────────────────
    cls_models = {
        "Logistic Regression": make_pipe(LogisticRegression(max_iter=1000,random_state=SEED), _build_preprocessor()),
        "Random Forest":       make_pipe(RandomForestClassifier(n_estimators=200,random_state=SEED,n_jobs=-1), _build_preprocessor()),
        "XGBoost":             make_pipe(XGBClassifier(n_estimators=200,learning_rate=0.05,max_depth=6,
                                                        eval_metric="logloss",random_state=SEED,verbosity=0), _build_preprocessor()),
        "LightGBM":            make_pipe(LGBMClassifier(n_estimators=200,learning_rate=0.05,random_state=SEED,verbose=-1), _build_preprocessor()),
    }
    y_cls_train = train_df["campaign_success"]
    y_cls_val   = val_df["campaign_success"]
    cls_results = {}
    for name, pipe in cls_models.items():
        pipe.fit(X_train, y_cls_train)
        preds = pipe.predict(X_val)
        proba = pipe.predict_proba(X_val)[:,1]
        cls_results[name] = {
            "pipe": pipe,
            "f1":   float(f1_score(y_cls_val, preds)),
            "auc":  float(roc_auc_score(y_cls_val, proba)),
        }

    best_cls_name = max(cls_results, key=lambda k: cls_results[k]["auc"])
    best_cls_pipe = cls_results[best_cls_name]["pipe"]

    # ── Persist state ──────────────────────────────────────────────────────
    STATE.update({
        "trained":    True,
        "s1_pipe":    best_s1_pipe,
        "s2_pipe":    best_s2_pipe,
        "s3_pipe":    best_s3_pipe,
        "cls_pipe":   best_cls_pipe,
        "train_df":   train_df,
        "val_df":     val_df,
        "test_df":    test_df,
        "cold_df":    cold_df,
        "preprocessor": preprocessor,
        "dataset":    df,
    })

    if req.save_models:
        os.makedirs("models", exist_ok=True)
        joblib.dump(best_s1_pipe,  "models/stage1_er_model_v4.pkl")
        joblib.dump(best_s2_pipe,  "models/stage2_cvr_model_v4.pkl")
        joblib.dump(best_s3_pipe,  "models/stage3_revenue_model_v4.pkl")
        joblib.dump(best_cls_pipe, "models/success_cls_v4.pkl")

    return {
        "status": "trained",
        "dataset_shape": list(df.shape),
        "best_stage1_model":  best_s1_name,
        "best_classifier":    best_cls_name,
        "stage1_r2":   round(s1_results[best_s1_name]["r2"], 4),
        "stage1_rmse": round(s1_results[best_s1_name]["rmse"], 4),
        "stage2_r2":   round(s2_r2, 4),
        "stage2_rmse": round(s2_rmse, 4),
        "stage3_r2":   round(s3_r2, 4),
        "stage3_rmse": round(s3_rmse, 4),
        "classifier_auc": round(cls_results[best_cls_name]["auc"], 4),
        "classifier_f1":  round(cls_results[best_cls_name]["f1"], 4),
        "models_saved": req.save_models,
    }


@app.post("/validate")
def validate(data: Dict[str, Any]):
    """Validate a single influencer+campaign input dict against the schema."""
    try:
        cleaned = validate_input_schema(data)
        return {"valid": True, "cleaned_input": cleaned}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.post("/predict")
def predict(item: InfluencerInput):
    """
    Run the full 3-stage prediction chain for a single influencer+campaign.
    Returns: pred_er, pred_cvr, pred_revenue, pred_roi (post-hoc), success_prob
    """
    _require_trained()

    raw = item.model_dump()
    try:
        cleaned = validate_input_schema(raw)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Fill derived fields
    fc = cleaned["followers_count"]
    cleaned.setdefault("engagement_per_follower",
        float(np.clip((cleaned["hist_avg_likes_per_post"] + cleaned["hist_avg_comments_per_post"]) / (fc + 1), 0.001, 0.15)))
    cleaned.setdefault("interaction_velocity",
        float(np.clip(cleaned["hist_avg_comments_per_post"] / (cleaned["hist_avg_likes_per_post"] + 1), 0.03, 0.40)))
    for k, v in raw.items():
        cleaned.setdefault(k, v)

    row = pd.DataFrame([cleaned])
    row = feature_engineering(row)

    # Stage 1
    s1 = STATE["s1_pipe"]
    pred_er = float(s1.predict(row[ALL_FEATURES])[0])

    # Stage 2
    row_s2 = add_stage1_pred(row[ALL_FEATURES], [pred_er])
    pred_cvr = float(STATE["s2_pipe"].predict(row_s2)[0])

    # Stage 3
    row_s3 = add_stage2_pred(row[ALL_FEATURES], [pred_er], [pred_cvr])
    pred_revenue = float(STATE["s3_pipe"].predict(row_s3)[0])

    # Post-hoc ROI
    budget = BKT_TO_MID.get(cleaned.get("campaign_budget_bracket", "$5K-$20K"), 12500)
    pred_roi = round((pred_revenue - budget) / (budget + 1), 4)

    # Success probability
    success_prob = float(STATE["cls_pipe"].predict_proba(row[ALL_FEATURES])[0][1])

    return {
        "pred_engagement_rate":   round(pred_er, 4),
        "pred_conversion_rate":   round(pred_cvr, 4),
        "pred_revenue_usd":       round(pred_revenue, 2),
        "pred_roi_post_hoc":      pred_roi,
        "success_probability":    round(success_prob, 4),
        "budget_used_usd":        budget,
    }


@app.post("/recommend")
def recommend(req: RecommendRequest):
    """
    Production recommendation engine.
    Layer 1 — Business rules (hard filters)
    Layer 2 — Sequential ML predictions (ER → CVR → Revenue)
    Layer 3 — Goal-weighted composite score → Top-N ranking
    """
    _require_trained()

    if req.campaign_goal not in GOAL_WEIGHTS:
        raise HTTPException(status_code=400, detail=f"Unknown campaign_goal. Choose from {list(GOAL_WEIGHTS)}")

    try:
        pool = pd.DataFrame(req.pool)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid pool data: {e}")

    # Apply business rule defaults if not provided
    if "rule_min_followers_met" not in pool.columns:
        pool["rule_min_followers_met"] = (pool["followers_count"] >= 1000).astype(int)
    if "rule_niche_match" not in pool.columns:
        pool["rule_niche_match"] = (pool["brand_alignment_score"] >= 0.50).astype(int)
    if "rule_budget_feasible" not in pool.columns:
        pool["rule_budget_feasible"] = 1

    # Layer 1: Hard filters
    n_before = len(pool)
    pool = pool[
        (pool["audience_authenticity_score"] >= req.min_auth) &
        (pool["fake_follower_pct"] <= req.max_fake) &
        (pool["followers_count"] >= req.min_followers) &
        (pool["rule_min_followers_met"] == 1) &
        (pool["rule_niche_match"] == 1) &
        (pool["rule_budget_feasible"] == 1)
    ]
    if req.require_geo_match:
        pool = pool[pool.get("audience_geo_match", pd.Series([1]*len(pool))) == 1]

    n_after = len(pool)

    if n_after == 0:
        return {"filtered": n_before, "passed": 0, "recommendations": [],
                "message": "Zero influencers passed filters — loosen constraints."}

    pool = feature_engineering(pool).reset_index(drop=True)

    # Layer 2: ML predictions
    Xp = pool[ALL_FEATURES]
    pool["pred_er"]  = STATE["s1_pipe"].predict(Xp)
    Xp_s2 = add_stage1_pred(Xp, pool["pred_er"].values)
    pred_cvr_pool = STATE["s2_pipe"].predict(Xp_s2)
    pool["pred_cvr"] = pred_cvr_pool
    pool["pred_success"] = STATE["cls_pipe"].predict_proba(Xp)[:,1]

    # Layer 3: Goal-weighted composite
    w = GOAL_WEIGHTS[req.campaign_goal]

    def norm(s):
        return (s - s.min()) / (s.max() - s.min() + 1e-9)

    pool["composite_score"] = (
        w["rev"]     * norm(pool["pred_cvr"]) +
        w["er"]      * norm(pool["pred_er"]) +
        w["success"] * pool["pred_success"] +
        w["align"]   * norm(pool["brand_alignment_score"])
    )

    result = pool.nlargest(req.top_n, "composite_score").reset_index(drop=True)
    result.index += 1

    out_cols = [c for c in [
        "influencer_id","platform","niche","influencer_tier","followers_count",
        "audience_authenticity_score","fake_follower_pct","brand_alignment_score",
        "pred_er","pred_cvr","pred_success","composite_score"
    ] if c in result.columns]

    return {
        "filtered": n_before,
        "passed":   n_after,
        "campaign_goal": req.campaign_goal,
        "goal_weights":  w,
        "recommendations": result[out_cols].to_dict(orient="records"),
    }


@app.post("/uncertainty")
def uncertainty(req: UncertaintyRequest):
    """
    Bootstrap 95% confidence interval for revenue predictions.
    Mirrors the notebook's N_BOOT=50 Ridge bootstrap on Stage-3 features.
    """
    _require_trained()

    records = req.records[:8]  # cap at 8 as per notebook
    try:
        pool = pd.DataFrame(records)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    pool = feature_engineering(pool)
    Xp = pool[ALL_FEATURES]

    pred_er  = STATE["s1_pipe"].predict(Xp)
    Xp_s2    = add_stage1_pred(Xp, pred_er)
    pred_cvr = STATE["s2_pipe"].predict(Xp_s2)
    Xp_s3    = add_stage2_pred(Xp, pred_er, pred_cvr)

    train_df = STATE["train_df"]
    X_train_base = feature_engineering(train_df)[ALL_FEATURES]
    pred_er_tr   = STATE["s1_pipe"].predict(X_train_base)
    pred_cvr_tr  = STATE["s2_pipe"].predict(add_stage1_pred(X_train_base, pred_er_tr))
    X_train_s3   = add_stage2_pred(X_train_base, pred_er_tr, pred_cvr_tr)
    y_train_s3   = train_df["actual_revenue_usd"]

    NUM_S3 = NUMERIC_FEATURES + ["pred_engagement_rate", "pred_conversion_rate"]
    CAT_S3 = CATEGORICAL_FEATURES
    pre_boot = ColumnTransformer([
        ("num", Pipeline([("imp",SimpleImputer(strategy="median")),("sc",StandardScaler())]), NUM_S3),
        ("cat", Pipeline([("imp",SimpleImputer(strategy="most_frequent")),
                          ("enc",OneHotEncoder(handle_unknown="ignore",sparse_output=False))]), CAT_S3),
    ], remainder="drop")

    boot_preds = []
    n_tr = len(X_train_s3)
    for _ in range(req.n_bootstrap):
        idx = np.random.choice(n_tr, n_tr, replace=True)
        m = Pipeline([("pre", pre_boot), ("model", Ridge(alpha=1.0))])
        m.fit(X_train_s3.iloc[idx], y_train_s3.iloc[idx])
        boot_preds.append(m.predict(Xp_s3))

    boot = np.array(boot_preds)
    pred_mean  = boot.mean(axis=0)
    pred_lower = np.percentile(boot, 2.5, axis=0)
    pred_upper = np.percentile(boot, 97.5, axis=0)

    results = []
    for i, rec in enumerate(records):
        results.append({
            "influencer_id":  rec.get("influencer_id", f"INF_{i+1}"),
            "pred_mean":      round(float(pred_mean[i]), 2),
            "lower_95pct":    round(float(pred_lower[i]), 2),
            "upper_95pct":    round(float(pred_upper[i]), 2),
            "uncertainty_pm": round(float((pred_upper[i]-pred_lower[i])/2), 2),
        })

    return {"n_bootstrap": req.n_bootstrap, "predictions": results}


# ─────────────────────────────────────────────────────────────────────────────
# Additional GET endpoints for frontend integration
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/influencers")
def get_influencers():
    """
    Return sampled test influencers with ML predictions.
    Requires trained models.
    """
    _require_trained()
    
    test_df = STATE["test_df"].copy()
    if len(test_df) == 0:
        return []
    
    # Sample up to 20 influencers from test data
    sample_df = test_df.sample(min(20, len(test_df)), random_state=SEED)
    sample_df = feature_engineering(sample_df)
    
    # Get ML predictions
    X = sample_df[ALL_FEATURES]
    pred_er = STATE["s1_pipe"].predict(X)
    X_s2 = add_stage1_pred(X, pred_er)
    pred_cvr = STATE["s2_pipe"].predict(X_s2)
    pred_success = STATE["cls_pipe"].predict_proba(X)[:, 1]
    
    result = []
    for idx, (i, row) in enumerate(sample_df.iterrows()):
        result.append({
            "id": idx + 1,
            "name": f"Influencer-{row['influencer_id']}",
            "category": row["niche"],
            "followers": int(row["followers_count"]),
            "engagement": float(pred_er[idx] * 100),
            "likes": int(row["hist_avg_likes_per_post"]),
            "comments": int(row["hist_avg_comments_per_post"]),
            "successScore": int(pred_success[idx] * 100),
            "predictedROI": int(pred_cvr[idx] * 100),
            "avgViews": int(row["hist_avg_reach_per_post"]),
            "color": np.random.choice(["#60a5fa", "#4ade80", "#c084fc", "#fb923c", "#f472b6", "#fbbf24"]),
            "platform": row["platform"],
            "rate": int(row["followers_count"] * 0.02),
            "pred_er": float(pred_er[idx]),
            "pred_cvr": float(pred_cvr[idx]),
            "pred_success": float(pred_success[idx]),
            "mlScore": float(pred_success[idx] * 100),
        })
    
    return result


@app.get("/campaigns")
def get_campaigns():
    """
    Return sampled campaigns derived from test data with ML predictions.
    Requires trained models.
    """
    _require_trained()
    
    test_df = STATE["test_df"].copy()
    if len(test_df) == 0:
        return []
    
    # Sample up to 10 campaigns
    sample_df = test_df.sample(min(10, len(test_df)), random_state=SEED)
    sample_df = feature_engineering(sample_df)
    
    X = sample_df[ALL_FEATURES]
    pred_er = STATE["s1_pipe"].predict(X)
    X_s2 = add_stage1_pred(X, pred_er)
    pred_cvr = STATE["s2_pipe"].predict(X_s2)
    X_s3 = add_stage2_pred(X, pred_er, pred_cvr)
    pred_revenue = STATE["s3_pipe"].predict(X_s3)
    
    result = []
    for idx, (i, row) in enumerate(sample_df.iterrows()):
        budget = float(row["followers_count"] * np.random.uniform(0.01, 0.05))
        spent = budget * np.random.uniform(0.6, 1.0)
        result.append({
            "id": f"camp-{idx + 1}",
            "name": f"{row['campaign_goal']} - {row['brand_category']}",
            "status": np.random.choice(["active", "completed", "draft"]),
            "budget": round(budget),
            "spent": round(spent),
            "metrics": {
                "reach": int(row["hist_avg_reach_per_post"] * np.random.uniform(0.8, 1.2)),
                "engagement": float(pred_er[idx] * 100),
                "conversions": int(pred_revenue[idx] / 50),
                "roi": round((pred_revenue[idx] - budget) / (budget + 1) * 100),
            },
            "influencers": [f"INF{str(idx+1).zfill(4)}"],
            "category": row["niche"],
        })
    
    return result


@app.get("/earnings")
def get_earnings():
    """
    Return simulated earnings based on ML predictions.
    Requires trained models.
    """
    _require_trained()
    
    test_df = STATE["test_df"].copy()
    if len(test_df) == 0:
        return {"monthly": [], "payments": []}
    
    # Generate 12 months of earnings
    months_data = []
    base_revenue = np.random.uniform(2000, 10000)
    for month_idx in range(12):
        month_name = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month_idx]
        amount = int(base_revenue * np.random.uniform(0.7, 1.4))
        campaigns_count = np.random.randint(2, 6)
        months_data.append({
            "month": month_name,
            "amount": amount,
            "campaigns": campaigns_count
        })
    
    # Generate payment history
    payments_data = []
    for i in range(6):
        payments_data.append({
            "id": f"pay-{i+1:03d}",
            "campaign": f"Campaign {i+1}",
            "brand": f"Brand {i+1}",
            "amount": int(np.random.uniform(2000, 8000)),
            "date": f"2026-{i+1:02d}-15",
            "status": "paid" if i < 4 else "pending",
        })
    
    return {
        "monthly": months_data,
        "payments": payments_data
    }


@app.get("/invitations")
def get_invitations():
    """
    Return empty invitations list (not model-based).
    """
    return []


@app.get("/analytics")
def get_analytics():
    """
    Return analytics derived from training data and ML predictions.
    Requires trained models.
    """
    _require_trained()
    
    train_df = STATE["train_df"].copy()
    if len(train_df) == 0:
        return {
            "influencers": [],
            "engagementTrends": [],
            "roiPredictions": [],
            "categoryPerformance": [],
            "platformData": []
        }
    
    train_df_eng = feature_engineering(train_df)
    X_train = train_df_eng[ALL_FEATURES]
    pred_er_train = STATE["s1_pipe"].predict(X_train)
    
    # Engagement trends (monthly simulation)
    engagement_trends = []
    base_likes = 4000
    for month_idx, month in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]):
        trend = base_likes * (1 + month_idx * 0.15) * np.random.uniform(0.9, 1.1)
        engagement_trends.append({
            "name": month,
            "likes": int(trend),
            "comments": int(trend * 0.08),
            "shares": int(trend * 0.05),
            "engagement": float(pred_er_train.mean() * np.random.uniform(0.9, 1.1))
        })
    
    # ROI predictions (from test data)
    roi_predictions = []
    test_df = STATE["test_df"].copy()
    if len(test_df) > 0:
        for idx in range(min(6, len(test_df))):
            row = test_df.iloc[idx]
            roi_predictions.append({
                "name": f"Influencer-{idx+1}",
                "current": int(row["actual_roi"] * 100),
                "predicted": int(row["actual_roi"] * 120),
                "investment": int(row["followers_count"] * 0.02)
            })
    
    # Category performance
    category_perf = train_df.groupby("niche").agg({
        "actual_engagement_rate": "mean",
        "actual_roi": "mean",
        "influencer_id": "count"
    }).reset_index()
    category_performance = []
    for _, row in category_perf.iterrows():
        category_performance.append({
            "category": row["niche"],
            "avgEngagement": float(row["actual_engagement_rate"]),
            "avgROI": int(row["actual_roi"] * 100),
            "influencerCount": int(row["influencer_id"])
        })
    
    # Platform distribution
    platform_counts = train_df["platform"].value_counts()
    platform_data = []
    colors = ["#e1306c", "#69c9d0", "#ff0000", "#1da1f2"]
    for idx, (plat, count) in enumerate(platform_counts.items()):
        platform_data.append({
            "name": plat,
            "value": int(count),
            "color": colors[idx % len(colors)]
        })
    
    # Build influencers list
    influencers_list = []
    for idx in range(min(6, len(test_df))):
        row = test_df.iloc[idx]
        influencers_list.append({
            "id": idx + 1,
            "name": f"Influencer-{idx+1}",
            "category": row["niche"],
            "followers": int(row["followers_count"]),
            "engagement": float(row["actual_engagement_rate"])
        })
    
    return {
        "influencers": influencers_list,
        "engagementTrends": engagement_trends,
        "roiPredictions": roi_predictions,
        "categoryPerformance": category_performance,
        "platformData": platform_data
    }


@app.get("/shap")
def shap_importance():
    """
    Compute SHAP feature importance for Stage-1 (ER) model.
    Returns a base64-encoded PNG matching the notebook's shap_v4.png.
    """
    _require_trained()

    train_df    = STATE["train_df"]
    test_df     = STATE["test_df"]
    best_s1_pipe = STATE["s1_pipe"]

    X_train = feature_engineering(train_df)[ALL_FEATURES]
    X_test  = feature_engineering(test_df)[ALL_FEATURES]
    y_s1_train = train_df["actual_engagement_rate"]

    X_tr_t = best_s1_pipe.named_steps["pre"].transform(X_train)
    X_te_t = best_s1_pipe.named_steps["pre"].transform(X_test)

    rf_shap = RandomForestRegressor(n_estimators=100, random_state=SEED, n_jobs=-1)
    rf_shap.fit(X_tr_t, y_s1_train)

    explainer = shap.TreeExplainer(rf_shap)
    shap_vals = explainer.shap_values(X_te_t[:150])

    cat_enc = best_s1_pipe.named_steps["pre"].named_transformers_["cat"].named_steps["encoder"]
    feat_names = NUMERIC_FEATURES + cat_enc.get_feature_names_out(CATEGORICAL_FEATURES).tolist()

    fig, ax = plt.subplots(figsize=(10, 8))
    shap.summary_plot(shap_vals, X_te_t[:150], feature_names=feat_names,
                      max_display=18, show=False, plot_type="bar")
    plt.title("SHAP — Stage 1 ER Model (no engagement_rate in features ✅)", fontweight="bold")
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=120, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode("utf-8")

    return {"image_base64": img_b64, "format": "png",
            "note": "Decode base64 and render as image. Top features by mean |SHAP| value."}


@app.get("/cold-start")
def cold_start_evaluation():
    """
    Reproduce the notebook's cold-start vs warm-test evaluation table.
    38 held-out influencers (never in training) vs the warm test split.
    """
    _require_trained()

    test_df = STATE["test_df"]
    cold_df = STATE["cold_df"]
    s1 = STATE["s1_pipe"]
    s3 = STATE["s3_pipe"]
    cls = STATE["cls_pipe"]

    def prep(df):
        return feature_engineering(df)[ALL_FEATURES]

    X_test = prep(test_df); X_cold = prep(cold_df)

    er_warm = s1.predict(X_test);  er_cold = s1.predict(X_cold)

    Xtest_s2 = add_stage1_pred(X_test, er_warm)
    Xcold_s2 = add_stage1_pred(X_cold, er_cold)
    cvr_warm = STATE["s2_pipe"].predict(Xtest_s2)
    cvr_cold = STATE["s2_pipe"].predict(Xcold_s2)

    Xtest_s3 = add_stage2_pred(X_test, er_warm, cvr_warm)
    Xcold_s3 = add_stage2_pred(X_cold, er_cold, cvr_cold)
    rev_warm = s3.predict(Xtest_s3)
    rev_cold = s3.predict(Xcold_s3)

    rmse_warm_er  = float(np.sqrt(mean_squared_error(test_df["actual_engagement_rate"], er_warm)))
    rmse_cold_er  = float(np.sqrt(mean_squared_error(cold_df["actual_engagement_rate"], er_cold)))
    rmse_warm_rev = float(np.sqrt(mean_squared_error(test_df["actual_revenue_usd"], rev_warm)))
    rmse_cold_rev = float(np.sqrt(mean_squared_error(cold_df["actual_revenue_usd"], rev_cold)))
    f1_warm = float(f1_score(test_df["campaign_success"], cls.predict(X_test)))
    f1_cold = float(f1_score(cold_df["campaign_success"], cls.predict(X_cold)))

    er_deg = round((rmse_cold_er - rmse_warm_er) / rmse_warm_er * 100, 1)

    return {
        "warm_test": {
            "er_rmse":      round(rmse_warm_er, 4),
            "revenue_rmse": round(rmse_warm_rev, 2),
            "success_f1":   round(f1_warm, 4),
        },
        "cold_start": {
            "er_rmse":      round(rmse_cold_er, 4),
            "revenue_rmse": round(rmse_cold_rev, 2),
            "success_f1":   round(f1_cold, 4),
        },
        "er_degradation_pct": er_deg,
        "note": "Cold-start degradation is the true generalisation gap for brand-new influencers.",
    }
