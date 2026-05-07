"""Feature engineering, validation, and reusable ML pipeline helpers."""

import warnings

import numpy as np
import pandas as pd
from fastapi import HTTPException
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from constants import CATEGORICAL_FEATURES, NUMERIC_FEATURES, SCHEMA
from state import STATE

warnings.filterwarnings("ignore")

SEED = 42
np.random.seed(SEED)


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
    """Identical to notebook - applied at both train time and inference."""
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
    """Validate a single input dict - same logic as notebook."""
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
