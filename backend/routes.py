"""HTTP routes for model training, prediction, recommendations, and dashboard data."""

import base64
import csv
import io
import json
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import f1_score, mean_squared_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from constants import (
    ALL_FEATURES,
    BKT_TO_MID,
    CATEGORICAL_FEATURES,
    GOAL_WEIGHTS,
    NUMERIC_FEATURES,
    SCHEMA,
)
from ml import (
    SEED,
    _require_trained,
    add_stage1_pred,
    add_stage2_pred,
    feature_engineering,
    validate_input_schema,
)
from auth import SignupRequest, create_user, get_current_user, influencer_tier_from_followers, validate_email
from database import get_connection, utc_now_iso
from schemas import (
    CampaignCreateRequest,
    CampaignEvaluationRequest,
    CampaignSelectionRequest,
    InfluencerInput,
    InfluencerProfileRequest,
    InvitationResponseRequest,
    BrandInfluencerCreateRequest,
    BrandInfluencerUpdateRequest,
    RecommendRequest,
    TrainRequest,
    UncertaintyRequest,
)
from state import STATE
from training import train_models

router = APIRouter()


def _loaded_model_name(state_key: str, fallback: str) -> str:
    loaded_path = STATE.get("model_files", {}).get(state_key)
    return Path(loaded_path).name if loaded_path else fallback


def _json_loads(raw: Optional[str], fallback):
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback


def _serialize_campaign(row) -> dict:
    payload = _json_loads(row["payload"], {})
    prediction_result = _json_loads(row["prediction_result"], None)
    selected = _json_loads(row["selected_influencers"], [])
    actual_results = _json_loads(row["actual_results"], None)
    budget_source = payload.get("budget")
    if budget_source is None and prediction_result:
        budget_source = prediction_result.get("budget_used_usd")
    budget = float(budget_source or 0)
    revenue = float((actual_results or {}).get("actual_revenue_usd") or (prediction_result or {}).get("pred_revenue_usd") or 0)
    roi = (actual_results or {}).get("actual_roi")
    if roi is None and prediction_result:
        roi = round(float(prediction_result.get("pred_roi_post_hoc", 0)) * 100)

    return {
        "id": row["id"],
        "name": row["name"],
        "status": row["status"],
        "payload": payload,
        "prediction_result": prediction_result,
        "selectedInfluencers": selected,
        "actualResults": actual_results,
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "budget": budget,
        "spent": budget if row["status"] in {"launched", "completed"} else 0,
        "category": payload.get("category") or payload.get("brand_category") or "Lifestyle",
        "platform": payload.get("platform") or "Instagram",
        "influencers": [i.get("name") or i.get("influencer_id") for i in selected],
        "metrics": {
            "reach": int(float(payload.get("followers") or 0) * 0.4),
            "engagement": (actual_results or {}).get("actual_engagement_rate")
            or (prediction_result or {}).get("pred_engagement_rate", 0),
            "conversions": int(revenue / 50) if revenue else 0,
            "roi": roi or 0,
        },
    }


def _pdf_escape(value: Any) -> str:
    text = str(value)
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _build_simple_pdf(title: str, lines: list[str]) -> bytes:
    content_lines = [
        "BT",
        "/F1 18 Tf",
        "50 770 Td",
        f"({_pdf_escape(title)}) Tj",
        "/F1 11 Tf",
        "0 -28 Td",
    ]
    for line in lines:
        safe_line = _pdf_escape(line[:105])
        content_lines.append(f"({safe_line}) Tj")
        content_lines.append("0 -16 Td")
    content_lines.append("ET")
    content = "\n".join(content_lines).encode("latin-1", "replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(content)).encode("ascii") + b" >>\nstream\n" + content + b"\nendstream",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("ascii")
    )
    return bytes(pdf)


def _prepare_recommendation_pool(pool: pd.DataFrame) -> pd.DataFrame:
    """Fill optional/derived recommendation fields when callers submit raw profile data."""
    pool = pool.copy()
    followers = pd.to_numeric(pool.get("followers_count", 0), errors="coerce").fillna(0)
    likes = pd.to_numeric(pool.get("hist_avg_likes_per_post", 0), errors="coerce").fillna(0)
    comments = pd.to_numeric(pool.get("hist_avg_comments_per_post", 0), errors="coerce").fillna(0)
    reach = pd.to_numeric(pool.get("hist_avg_reach_per_post", followers * 0.4), errors="coerce").fillna(followers * 0.4)
    auth = pd.to_numeric(pool.get("audience_authenticity_score", 80), errors="coerce").fillna(80)

    defaults = {
        "hist_avg_reach_per_post": reach,
        "hist_avg_shares_per_post": 0,
        "hist_avg_saves_per_post": 0,
        "audience_female_pct": 50,
        "account_age_years": 3.0,
        "is_verified": 0,
        "hist_posts_per_week": 4.0,
        "audience_18_24_pct": 35,
        "audience_25_34_pct": 30,
        "audience_35plus_pct": 35,
        "audience_concentration_score": 0.65,
        "campaign_duration_days": 30,
        "primary_audience_geo": "Nigeria",
        "brand_category": "Tech",
        "target_audience_age": "25-34",
        "engagement_per_follower": ((likes + comments) / (followers + 1)).clip(0.001, 0.15),
        "interaction_velocity": (comments / (likes + 1)).clip(0.03, 0.40),
        "reach_quality_score": ((reach / (followers + 1)) * auth / 100).clip(0.01, 0.85),
        "content_consistency_score": 50,
    }
    for column, value in defaults.items():
        if column not in pool.columns:
            pool[column] = value
        else:
            pool[column] = pool[column].fillna(value)
    return pool


def _score_0_100(value: Any, low: float, high: float) -> float:
    numeric = float(value or 0)
    return round(float(np.clip((numeric - low) / (high - low + 1e-9), 0, 1) * 100), 2)


def _influencer_grade(row: pd.Series) -> dict:
    """Named brand-side grading markers returned with every recommendation."""
    engagement_score = _score_0_100(row.get("pred_er"), 0, 10)
    authenticity_score = round(float(np.clip(row.get("audience_authenticity_score", 0), 0, 100)), 2)
    fake_penalty = round(float(np.clip(100 - row.get("fake_follower_pct", 0) * 2, 0, 100)), 2)
    conversion_score = _score_0_100(row.get("pred_cvr"), 0, 10)
    roi_score = _score_0_100(row.get("pred_roi"), -1, 3)
    demographics_score = round(float(np.clip(
        (
            float(row.get("audience_age_match_score", 0)) * 0.65
            + float(row.get("audience_geo_match", 0)) * 0.35
        ) * 100,
        0,
        100,
    )), 2)
    sentiment_score = round(float(np.clip(row.get("hist_sentiment_score", 0), 0, 1) * 100), 2)
    historical_score = round(float(np.clip(row.get("pred_success", 0), 0, 1) * 100), 2)
    reach_quality_score = round(float(np.clip(row.get("reach_quality_score", 0), 0, 1) * 100), 2)
    consistency_score = round(float(np.clip(row.get("content_consistency_score", 0), 0, 100)), 2)

    markers = {
        "engagementRate": engagement_score,
        "audienceAuthenticity": round((authenticity_score * 0.75 + fake_penalty * 0.25), 2),
        "brandAlignment": round(float(np.clip(row.get("brand_alignment_score", 0), 0, 1) * 100), 2),
        "conversionRate": conversion_score,
        "predictedRoi": roi_score,
        "audienceDemographicsMatch": demographics_score,
        "sentimentScore": sentiment_score,
        "historicalCampaignPerformance": historical_score,
        "reachQuality": reach_quality_score,
        "postingConsistency": consistency_score,
    }
    overall = round(sum(markers.values()) / len(markers), 2)
    return {
        "overall": overall,
        "markers": markers,
        "explanation": (
            f"Ranked highly for {row.get('niche', 'niche')} alignment, "
            f"{round(float(row.get('pred_success', 0)) * 100)}% success probability, "
            f"and projected ROI of {round(float(row.get('pred_roi', 0)) * 100)}%."
        ),
    }


def _require_brand(user: dict) -> None:
    if user["role"] != "brand":
        raise HTTPException(status_code=403, detail="Brand account required")


def _require_influencer(user: dict) -> None:
    if user["role"] != "influencer":
        raise HTTPException(status_code=403, detail="Influencer account required")


def _first_number(*values, default: float = 0) -> float:
    for value in values:
        try:
            if value is not None and value != "":
                return float(value)
        except (TypeError, ValueError):
            continue
    return default


def _budget_bracket_from_amount(amount: Any) -> str:
    budget = _first_number(amount, default=5000)
    if budget < 1000:
        return "<$1K"
    if budget < 5000:
        return "$1K-$5K"
    if budget < 20000:
        return "$5K-$20K"
    if budget < 100000:
        return "$20K-$100K"
    return ">$100K"


def _profile_from_user_row(row, profile: dict | None = None) -> dict:
    profile = profile or {}
    followers = int(profile.get("followersCount") or profile.get("followers") or row["followers"] or 0)
    category = profile.get("niche") or profile.get("category") or row["category"] or "Lifestyle"
    tier = profile.get("influencerTier") or row["tier"] or influencer_tier_from_followers(followers)
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "username": row["username"],
        "avatar": row["avatar"],
        "category": category,
        "followers": followers,
        "tier": tier,
        "createdAt": row["created_at"],
        "profile": {
            "displayName": profile.get("displayName") or row["name"],
            "category": category,
            "niche": category,
            "platform": profile.get("platform") or (profile.get("platforms") or ["Instagram"])[0],
            "influencerTier": tier,
            "followersCount": followers,
            **profile,
        },
    }


@router.get("/brand/influencers")
def list_registered_influencers(user: dict = Depends(get_current_user)):
    """Return all registered influencer accounts and saved profile details."""
    _require_brand(user)
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT u.*, p.profile
            FROM users u
            LEFT JOIN influencer_profiles p ON p.user_id = u.id
            WHERE u.role = 'influencer'
            ORDER BY u.created_at DESC
            """
        ).fetchall()
    return [
        _profile_from_user_row(row, _json_loads(row["profile"], {}))
        for row in rows
    ]


@router.post("/brand/influencers")
def create_registered_influencer(req: BrandInfluencerCreateRequest, user: dict = Depends(get_current_user)):
    """Create an influencer account and optional profile details from the brand manager UI."""
    _require_brand(user)
    influencer = create_user(SignupRequest(
        name=req.name,
        email=req.email,
        username=req.username,
        password=req.password,
        role="influencer",
        category=req.category,
        followers=req.followers,
    ))
    profile = {
        "displayName": req.profile.get("displayName") or req.name,
        "category": req.category,
        "niche": req.profile.get("niche") or req.category,
        "followers": req.followers,
        "followersCount": req.followers,
        "influencerTier": req.profile.get("influencerTier") or influencer_tier_from_followers(req.followers),
        "platform": req.profile.get("platform") or "Instagram",
        **req.profile,
    }
    now = utc_now_iso()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO influencer_profiles (user_id, profile, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET profile = excluded.profile, updated_at = excluded.updated_at
            """,
            (influencer["id"], json.dumps(profile), now),
        )
        row = conn.execute(
            """
            SELECT u.*, p.profile
            FROM users u
            LEFT JOIN influencer_profiles p ON p.user_id = u.id
            WHERE u.id = ?
            """,
            (influencer["id"],),
        ).fetchone()
    return {"success": True, "influencer": _profile_from_user_row(row, _json_loads(row["profile"], {}))}


@router.put("/brand/influencers/{influencer_id}")
def update_registered_influencer(influencer_id: str, req: BrandInfluencerUpdateRequest, user: dict = Depends(get_current_user)):
    """Update an influencer account and profile details."""
    _require_brand(user)
    email = validate_email(req.email)
    tier = req.tier or influencer_tier_from_followers(req.followers)
    avatar = req.name[:1].upper() or req.username[:1].upper()
    profile = {
        "displayName": req.profile.get("displayName") or req.name,
        "category": req.category,
        "niche": req.profile.get("niche") or req.category,
        "followers": req.followers,
        "followersCount": req.followers,
        "influencerTier": tier,
        "platform": req.profile.get("platform") or "Instagram",
        **req.profile,
    }
    now = utc_now_iso()
    try:
        with get_connection() as conn:
            existing = conn.execute(
                "SELECT * FROM users WHERE id = ? AND role = 'influencer'",
                (influencer_id,),
            ).fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Influencer not found")
            conn.execute(
                """
                UPDATE users
                SET name = ?, email = ?, username = ?, avatar = ?, category = ?, followers = ?, tier = ?
                WHERE id = ? AND role = 'influencer'
                """,
                (req.name.strip(), email, req.username.strip(), avatar, req.category, req.followers, tier, influencer_id),
            )
            conn.execute(
                """
                INSERT INTO influencer_profiles (user_id, profile, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET profile = excluded.profile, updated_at = excluded.updated_at
                """,
                (influencer_id, json.dumps(profile), now),
            )
            row = conn.execute(
                """
                SELECT u.*, p.profile
                FROM users u
                LEFT JOIN influencer_profiles p ON p.user_id = u.id
                WHERE u.id = ?
                """,
                (influencer_id,),
            ).fetchone()
    except Exception as exc:
        message = str(exc).lower()
        if "unique constraint failed" in message and "email" in message:
            raise HTTPException(status_code=409, detail="Email is already registered") from exc
        if "unique constraint failed" in message and "username" in message:
            raise HTTPException(status_code=409, detail="Username is already taken") from exc
        raise
    return {"success": True, "influencer": _profile_from_user_row(row, _json_loads(row["profile"], {}))}


@router.delete("/brand/influencers/{influencer_id}")
def delete_registered_influencer(influencer_id: str, user: dict = Depends(get_current_user)):
    """Delete an influencer account and its profile."""
    _require_brand(user)
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE id = ? AND role = 'influencer'",
            (influencer_id,),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Influencer not found")
        conn.execute("DELETE FROM users WHERE id = ? AND role = 'influencer'", (influencer_id,))
    return {"success": True}


def _recommendation_record_from_profile(row, profile: dict, campaign_payload: dict) -> dict:
    followers = int(_first_number(profile.get("followersCount"), profile.get("followers"), row["followers"], default=10000))
    niche = profile.get("niche") or profile.get("category") or row["category"] or "Lifestyle"
    brand_category = campaign_payload.get("brandCategory") or campaign_payload.get("category") or campaign_payload.get("brand_category") or "Lifestyle"
    category_match = str(niche).lower() == str(brand_category).lower()
    brand_alignment = max(
        _first_number(profile.get("brand_alignment_score"), profile.get("brandAlignmentScore"), default=0.85 if category_match else 0.55),
        0.85 if category_match else 0,
    )
    return {
        "influencer_id": row["name"],
        "followers_count": followers,
        "hist_avg_likes_per_post": _first_number(profile.get("hist_avg_likes_per_post"), profile.get("avgLikes")),
        "hist_avg_comments_per_post": _first_number(profile.get("hist_avg_comments_per_post"), profile.get("avgComments")),
        "hist_avg_shares_per_post": _first_number(profile.get("hist_avg_shares_per_post"), profile.get("avgShares")),
        "hist_avg_saves_per_post": _first_number(profile.get("hist_avg_saves_per_post"), profile.get("avgSaves")),
        "hist_avg_reach_per_post": _first_number(profile.get("hist_avg_reach_per_post"), profile.get("avgViews"), default=followers * 0.4),
        "fake_follower_pct": _first_number(profile.get("fake_follower_pct"), profile.get("fakeFollowerPct"), default=8),
        "audience_authenticity_score": _first_number(profile.get("audience_authenticity_score"), profile.get("authenticityScore"), default=80),
        "brand_alignment_score": brand_alignment,
        "audience_age_match_score": _first_number(profile.get("audience_age_match_score"), profile.get("audienceAgeMatchScore"), default=0.65),
        "audience_geo_match": int(_first_number(profile.get("audience_geo_match"), profile.get("audienceGeoMatch"), default=1)),
        "hist_sentiment_score": _first_number(profile.get("hist_sentiment_score"), profile.get("sentimentScore"), default=0.7),
        "account_age_years": _first_number(profile.get("account_age_years"), profile.get("accountAgeYears"), default=3),
        "is_verified": int(_first_number(profile.get("is_verified"), profile.get("isVerified"))),
        "hist_posts_per_week": _first_number(profile.get("hist_posts_per_week"), profile.get("postsPerWeek"), default=4),
        "audience_female_pct": _first_number(profile.get("audience_female_pct"), profile.get("audienceFemalePct"), default=50),
        "audience_18_24_pct": _first_number(profile.get("audience_18_24_pct"), default=35),
        "audience_25_34_pct": _first_number(profile.get("audience_25_34_pct"), default=30),
        "audience_35plus_pct": _first_number(profile.get("audience_35plus_pct"), default=35),
        "audience_concentration_score": _first_number(profile.get("audience_concentration_score"), profile.get("audienceConcentrationScore"), default=0.65),
        "reach_quality_score": _first_number(profile.get("reach_quality_score"), profile.get("reachQualityScore"), default=0.3),
        "content_consistency_score": _first_number(profile.get("content_consistency_score"), profile.get("contentConsistencyScore"), default=50),
        "platform": profile.get("platform") or "Instagram",
        "niche": niche,
        "influencer_tier": profile.get("influencerTier") or row["tier"] or influencer_tier_from_followers(followers),
        "primary_audience_geo": profile.get("primary_audience_geo") or profile.get("primaryAudienceGeo") or "Nigeria",
        "brand_category": brand_category,
        "campaign_budget_bracket": campaign_payload.get("campaign_budget_bracket") or _budget_bracket_from_amount(campaign_payload.get("budget")),
        "campaign_duration_days": int(_first_number(campaign_payload.get("campaignDuration"), campaign_payload.get("campaign_duration_days"), default=30)),
        "campaign_goal": campaign_payload.get("campaignGoal") or campaign_payload.get("campaign_goal") or "Sales Conversion",
        "target_audience_age": campaign_payload.get("targetAudienceAge") or campaign_payload.get("target_audience_age") or "25-34",
        "payment_model": campaign_payload.get("paymentModel") or campaign_payload.get("payment_model") or "Flat Fee",
        "rule_min_followers_met": 1 if followers >= 1000 else 0,
        "rule_niche_match": 1 if category_match or brand_alignment >= 0.5 else 0,
        "rule_budget_feasible": 1,
    }


@router.get("/health")
def health():
    return {
        "status": "ok",
        "trained": STATE["trained"],
        "modelSource": STATE.get("model_source"),
        "modelFiles": STATE.get("model_files"),
        "modelLoadError": STATE.get("model_load_error"),
        "modelLoadWarning": STATE.get("model_load_warning"),
    }


@router.get("/schema")
def get_schema():
    return SCHEMA


@router.post("/train")
def train(req: TrainRequest):
    """Generate a synthetic dataset and train the in-memory ML pipelines."""
    return train_models(req.n_samples, req.save_models)


@router.post("/validate")
def validate(data: Dict[str, Any]):
    """Validate a single influencer+campaign input dict against the schema."""
    try:
        cleaned = validate_input_schema(data)
        return {"valid": True, "cleaned_input": cleaned}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/predict")
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
    cls_pipe = STATE["cls_pipe"]
    if not hasattr(cls_pipe, "predict_proba"):
        raise HTTPException(status_code=500, detail="Loaded success classifier does not support probability prediction")
    success_prob = float(cls_pipe.predict_proba(row[ALL_FEATURES])[0][1])

    return {
        "pred_engagement_rate":   round(pred_er, 4),
        "pred_conversion_rate":   round(pred_cvr, 4),
        "pred_revenue_usd":       round(pred_revenue, 2),
        "pred_roi_post_hoc":      pred_roi,
        "success_probability":    round(success_prob, 4),
        "success_classifier_model": _loaded_model_name("cls_pipe", "success_cls_v4.pkl"),
        "budget_used_usd":        budget,
    }


@router.post("/recommend")
def recommend(req: RecommendRequest):
    """
    Production recommendation engine.
    Layer 1 - Business rules (hard filters)
    Layer 2 - Sequential ML predictions (ER -> CVR -> Revenue)
    Layer 3 - Goal-weighted composite score -> Top-N ranking
    """
    _require_trained()

    if req.campaign_goal not in GOAL_WEIGHTS:
        raise HTTPException(status_code=400, detail=f"Unknown campaign_goal. Choose from {list(GOAL_WEIGHTS)}")

    try:
        pool = pd.DataFrame(req.pool)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid pool data: {e}")
    pool = _prepare_recommendation_pool(pool)

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
    if req.max_followers is not None:
        pool = pool[pool["followers_count"] <= req.max_followers]
    if req.require_geo_match:
        pool = pool[pool.get("audience_geo_match", pd.Series([1]*len(pool))) == 1]

    n_after = len(pool)

    if n_after == 0:
        return {"filtered": n_before, "passed": 0, "recommendations": [],
                "message": "Zero influencers passed filters - loosen constraints."}

    pool = feature_engineering(pool).reset_index(drop=True)

    # Layer 2: ML predictions
    Xp = pool[ALL_FEATURES]
    pool["pred_er"]  = STATE["s1_pipe"].predict(Xp)
    Xp_s2 = add_stage1_pred(Xp, pool["pred_er"].values)
    pred_cvr_pool = STATE["s2_pipe"].predict(Xp_s2)
    pool["pred_cvr"] = pred_cvr_pool
    Xp_s3 = add_stage2_pred(Xp, pool["pred_er"].values, pool["pred_cvr"].values)
    pool["pred_revenue"] = STATE["s3_pipe"].predict(Xp_s3)
    cls_pipe = STATE["cls_pipe"]
    if not hasattr(cls_pipe, "predict_proba"):
        raise HTTPException(status_code=500, detail="Loaded success classifier does not support probability prediction")
    pool["pred_success"] = cls_pipe.predict_proba(Xp)[:,1]
    pool["budget_used_usd"] = pool["campaign_budget_bracket"].map(BKT_TO_MID).fillna(12500)
    pool["pred_roi"] = (pool["pred_revenue"] - pool["budget_used_usd"]) / (pool["budget_used_usd"] + 1)

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
        "audience_age_match_score","audience_geo_match","hist_sentiment_score",
        "reach_quality_score","content_consistency_score","hist_posts_per_week",
        "pred_er","pred_cvr","pred_revenue","pred_roi","pred_success","composite_score"
    ] if c in result.columns]
    recommendations = result[out_cols].to_dict(orient="records")
    for idx, row in result.iterrows():
        recommendations[idx - 1]["grading"] = _influencer_grade(row)

    return {
        "filtered": n_before,
        "passed":   n_after,
        "campaign_goal": req.campaign_goal,
        "follower_range": {
            "min": req.min_followers,
            "max": req.max_followers,
        },
        "goal_weights":  w,
        "success_classifier_model": _loaded_model_name("cls_pipe", "success_cls_v4.pkl"),
        "recommendations": recommendations,
    }


@router.post("/recommend/export")
def export_recommendations_csv(req: RecommendRequest, user: dict = Depends(get_current_user)):
    """Run recommendations and export the Top-N ranking as a CSV file."""
    _require_brand(user)
    result = recommend(req)
    rows = result.get("recommendations", [])
    columns = [
        "rank",
        "influencer_id",
        "platform",
        "niche",
        "influencer_tier",
        "followers_count",
        "audience_authenticity_score",
        "fake_follower_pct",
        "brand_alignment_score",
        "audience_age_match_score",
        "audience_geo_match",
        "hist_sentiment_score",
        "reach_quality_score",
        "content_consistency_score",
        "pred_er",
        "pred_cvr",
        "pred_revenue",
        "pred_roi",
        "pred_success",
        "composite_score",
        "grade_overall",
        "grade_engagement_rate",
        "grade_audience_authenticity",
        "grade_brand_alignment",
        "grade_conversion_rate",
        "grade_predicted_roi",
        "grade_audience_demographics_match",
        "grade_sentiment_score",
        "grade_historical_campaign_performance",
        "grade_reach_quality",
        "grade_posting_consistency",
        "recommendation_explanation",
    ]
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for index, row in enumerate(rows, start=1):
        grading = row.get("grading", {})
        markers = grading.get("markers", {})
        writer.writerow({
            "rank": index,
            **row,
            "grade_overall": grading.get("overall"),
            "grade_engagement_rate": markers.get("engagementRate"),
            "grade_audience_authenticity": markers.get("audienceAuthenticity"),
            "grade_brand_alignment": markers.get("brandAlignment"),
            "grade_conversion_rate": markers.get("conversionRate"),
            "grade_predicted_roi": markers.get("predictedRoi"),
            "grade_audience_demographics_match": markers.get("audienceDemographicsMatch"),
            "grade_sentiment_score": markers.get("sentimentScore"),
            "grade_historical_campaign_performance": markers.get("historicalCampaignPerformance"),
            "grade_reach_quality": markers.get("reachQuality"),
            "grade_posting_consistency": markers.get("postingConsistency"),
            "recommendation_explanation": grading.get("explanation"),
        })
    filename = f"recommendations-{utc_now_iso()[:10]}.csv"
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/uncertainty")
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


# Additional GET endpoints for frontend integration

@router.get("/influencers")
def get_influencers():
    """
    Return sampled test influencers with ML predictions.
    Requires trained models.
    """
    _require_trained()

    if STATE.get("test_df") is None:
        return []

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


@router.get("/campaigns")
def get_campaigns(user: dict = Depends(get_current_user)):
    """Return campaigns owned by the signed-in brand."""
    _require_brand(user)
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],),
        ).fetchall()
    return [_serialize_campaign(row) for row in rows]


@router.get("/campaigns/{campaign_id}/report")
def get_campaign_report(campaign_id: str, user: dict = Depends(get_current_user)):
    """Generate a downloadable PDF campaign report for the signed-in brand."""
    _require_brand(user)
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM campaigns WHERE id = ? AND user_id = ?",
            (campaign_id, user["id"]),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign = _serialize_campaign(row)
    payload = campaign["payload"]
    prediction = campaign["prediction_result"] or {}
    actual = campaign["actualResults"] or {}
    selected = campaign["selectedInfluencers"] or []
    influencer_names = [
        str(item.get("name") or item.get("influencer_id") or item.get("id") or "Influencer")
        for item in selected
    ]

    lines = [
        f"Campaign ID: {campaign['id']}",
        f"Status: {campaign['status']}",
        f"Brand: {user['name']}",
        f"Created: {campaign['createdAt']}",
        f"Updated: {campaign['updatedAt'] or 'N/A'}",
        "",
        "Campaign Configuration",
        f"Goal: {payload.get('campaignGoal') or payload.get('campaign_goal') or 'N/A'}",
        f"Category: {campaign['category']}",
        f"Platform: {campaign['platform']}",
        f"Budget: ${campaign['budget']:,.2f}",
        f"Payment Model: {payload.get('paymentModel') or payload.get('payment_model') or 'N/A'}",
        f"Duration: {payload.get('campaign_duration_days') or payload.get('duration') or 'N/A'}",
        f"Target Audience: {payload.get('targetAudience') or payload.get('target_audience_age') or 'N/A'}",
        "",
        "Prediction Results",
        f"Predicted Engagement Rate: {prediction.get('pred_engagement_rate', 'N/A')}",
        f"Predicted Conversion Rate: {prediction.get('pred_conversion_rate', 'N/A')}",
        f"Predicted Revenue USD: {prediction.get('pred_revenue_usd', 'N/A')}",
        f"Predicted ROI: {prediction.get('pred_roi_post_hoc', 'N/A')}",
        f"Success Probability: {prediction.get('success_probability', 'N/A')}",
        "",
        "Actual Results",
        f"Actual Engagement Rate: {actual.get('actual_engagement_rate', 'N/A')}",
        f"Actual Conversion Rate: {actual.get('actual_conversion_rate', 'N/A')}",
        f"Actual Revenue USD: {actual.get('actual_revenue_usd', 'N/A')}",
        f"Actual ROI: {actual.get('actual_roi', 'N/A')}",
        f"Notes: {actual.get('notes', 'N/A')}",
        "",
        "Selected Influencers",
        ", ".join(influencer_names) if influencer_names else "No influencers selected yet.",
    ]
    pdf = _build_simple_pdf(f"Campaign Report: {campaign['name']}", lines)
    filename = f"{campaign['id']}-report.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/campaigns/{campaign_id}/recommendations")
def get_campaign_recommendations(campaign_id: str, user: dict = Depends(get_current_user)):
    """Rank registered influencer profiles for a specific brand campaign."""
    _require_brand(user)
    _require_trained()
    with get_connection() as conn:
        campaign_row = conn.execute(
            "SELECT * FROM campaigns WHERE id = ? AND user_id = ?",
            (campaign_id, user["id"]),
        ).fetchone()
        if not campaign_row:
            raise HTTPException(status_code=404, detail="Campaign not found")
        influencer_rows = conn.execute(
            """
            SELECT u.*, p.profile
            FROM users u
            LEFT JOIN influencer_profiles p ON p.user_id = u.id
            WHERE u.role = 'influencer'
            ORDER BY u.name
            """
        ).fetchall()

    campaign = _serialize_campaign(campaign_row)
    payload = campaign["payload"] or {}
    pool = [
        _recommendation_record_from_profile(row, _json_loads(row["profile"], {}), payload)
        for row in influencer_rows
    ]
    if not pool:
        return {
            "campaign": campaign,
            "filtered": 0,
            "passed": 0,
            "campaign_goal": payload.get("campaignGoal") or payload.get("campaign_goal") or "Sales Conversion",
            "recommendations": [],
        }

    campaign_goal = payload.get("campaignGoal") or payload.get("campaign_goal") or "Sales Conversion"
    min_followers = int(float(
        payload.get("minFollowers")
        or payload.get("targetMinFollowers")
        or payload.get("followersMin")
        or 1000
    ))
    max_followers_raw = (
        payload.get("maxFollowers")
        or payload.get("targetMaxFollowers")
        or payload.get("followersMax")
    )
    max_followers = int(float(max_followers_raw)) if max_followers_raw not in (None, "") else None
    if max_followers is not None and max_followers < min_followers:
        min_followers, max_followers = max_followers, min_followers
    result = recommend(RecommendRequest(
        pool=pool,
        campaign_goal=campaign_goal,
        top_n=min(20, len(pool)),
        min_auth=50,
        max_fake=30,
        min_followers=min_followers,
        max_followers=max_followers,
        require_geo_match=False,
    ))
    result["campaign"] = campaign
    return result


@router.post("/campaigns")
def create_campaign(req: CampaignCreateRequest, user: dict = Depends(get_current_user)):
    """Persist a brand campaign form submission and its latest ML prediction."""
    _require_brand(user)
    campaign_id = f"camp-{uuid.uuid4().hex[:12]}"
    now = utc_now_iso()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO campaigns (
                id, user_id, name, payload, prediction_result, status,
                selected_influencers, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                campaign_id,
                user["id"],
                req.name,
                json.dumps(req.payload),
                json.dumps(req.prediction_result) if req.prediction_result is not None else None,
                "recommended" if req.prediction_result else "draft",
                json.dumps([]),
                now,
                now,
            ),
        )
        row = conn.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone()

    return {
        "success": True,
        "campaign": _serialize_campaign(row),
    }


@router.post("/campaigns/{campaign_id}/select")
def select_influencers(campaign_id: str, req: CampaignSelectionRequest, user: dict = Depends(get_current_user)):
    """Attach selected influencers to a campaign and create invitations."""
    _require_brand(user)
    now = utc_now_iso()
    with get_connection() as conn:
        campaign = conn.execute(
            "SELECT * FROM campaigns WHERE id = ? AND user_id = ?",
            (campaign_id, user["id"]),
        ).fetchone()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        conn.execute(
            """
            UPDATE campaigns
            SET selected_influencers = ?, status = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (json.dumps(req.influencers), "selected", now, campaign_id, user["id"]),
        )

        influencer_users = conn.execute("SELECT * FROM users WHERE role = 'influencer'").fetchall()
        fallback_user_id = influencer_users[0]["id"] if influencer_users else None
        existing_refs = {
            row["influencer_ref"]
            for row in conn.execute("SELECT influencer_ref FROM invitations WHERE campaign_id = ?", (campaign_id,)).fetchall()
        }
        for influencer in req.influencers:
            ref = str(influencer.get("influencer_id") or influencer.get("id") or influencer.get("name") or uuid.uuid4().hex[:8])
            if ref in existing_refs:
                continue
            name = str(influencer.get("name") or influencer.get("influencer_id") or ref)
            conn.execute(
                """
                INSERT INTO invitations (
                    id, campaign_id, brand_user_id, influencer_user_id, influencer_ref,
                    influencer_name, status, message, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                """,
                (
                    f"inv-{uuid.uuid4().hex[:12]}",
                    campaign_id,
                    user["id"],
                    fallback_user_id,
                    ref,
                    name,
                    req.message,
                    now,
                ),
            )
        row = conn.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone()

    return {"success": True, "campaign": _serialize_campaign(row)}


@router.post("/campaigns/{campaign_id}/launch")
def launch_campaign(campaign_id: str, user: dict = Depends(get_current_user)):
    """Mark a selected campaign as launched."""
    _require_brand(user)
    with get_connection() as conn:
        campaign = conn.execute(
            "SELECT * FROM campaigns WHERE id = ? AND user_id = ?",
            (campaign_id, user["id"]),
        ).fetchone()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        selected = _json_loads(campaign["selected_influencers"], [])
        if not selected:
            raise HTTPException(status_code=400, detail="Select at least one influencer before launch")
        conn.execute(
            "UPDATE campaigns SET status = 'launched', updated_at = ? WHERE id = ?",
            (utc_now_iso(), campaign_id),
        )
        row = conn.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone()
    return {"success": True, "campaign": _serialize_campaign(row)}


@router.post("/campaigns/{campaign_id}/complete")
def complete_campaign(campaign_id: str, req: CampaignEvaluationRequest, user: dict = Depends(get_current_user)):
    """Store actual campaign results for evaluation and future retraining."""
    _require_brand(user)
    results = req.model_dump()
    with get_connection() as conn:
        campaign = conn.execute(
            "SELECT * FROM campaigns WHERE id = ? AND user_id = ?",
            (campaign_id, user["id"]),
        ).fetchone()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        conn.execute(
            """
            UPDATE campaigns
            SET actual_results = ?, status = 'completed', updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (json.dumps(results), utc_now_iso(), campaign_id, user["id"]),
        )
        row = conn.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone()
    return {"success": True, "campaign": _serialize_campaign(row)}


@router.get("/earnings")
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


@router.get("/invitations")
def get_invitations(user: dict = Depends(get_current_user)):
    """Return campaign invitations for the signed-in influencer."""
    _require_influencer(user)
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT i.*, c.name AS campaign_name, c.payload, c.status AS campaign_status,
                   u.name AS brand_name
            FROM invitations i
            JOIN campaigns c ON c.id = i.campaign_id
            JOIN users u ON u.id = i.brand_user_id
            WHERE i.influencer_user_id = ? OR i.influencer_user_id IS NULL
            ORDER BY i.created_at DESC
            """,
            (user["id"],),
        ).fetchall()

    invitations = []
    for row in rows:
        payload = _json_loads(row["payload"], {})
        invitations.append({
            "id": row["id"],
            "campaignId": row["campaign_id"],
            "campaignName": row["campaign_name"],
            "brandName": row["brand_name"],
            "budget": float(payload.get("budget") or 0),
            "platform": payload.get("platform") or "Instagram",
            "category": payload.get("category") or "Lifestyle",
            "description": row["message"] or f"Collaboration request for {row['influencer_name']}.",
            "deadline": payload.get("endDate") or payload.get("deadline") or "2026-06-30",
            "status": row["status"],
            "receivedDate": row["created_at"],
            "campaignStatus": row["campaign_status"],
        })
    return invitations


@router.post("/invitations/{invitation_id}/respond")
def respond_to_invitation(invitation_id: str, req: InvitationResponseRequest, user: dict = Depends(get_current_user)):
    """Accept or decline an invitation."""
    _require_influencer(user)
    with get_connection() as conn:
        invitation = conn.execute(
            """
            SELECT * FROM invitations
            WHERE id = ? AND (influencer_user_id = ? OR influencer_user_id IS NULL)
            """,
            (invitation_id, user["id"]),
        ).fetchone()
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")
        conn.execute(
            """
            UPDATE invitations
            SET status = ?, influencer_user_id = COALESCE(influencer_user_id, ?), responded_at = ?
            WHERE id = ?
            """,
            (req.status, user["id"], utc_now_iso(), invitation_id),
        )
    return {"success": True, "status": req.status}


@router.get("/profile")
def get_profile(user: dict = Depends(get_current_user)):
    """Return the signed-in influencer profile."""
    _require_influencer(user)
    with get_connection() as conn:
        row = conn.execute("SELECT profile FROM influencer_profiles WHERE user_id = ?", (user["id"],)).fetchone()
    if row:
        return _json_loads(row["profile"], {})
    return {
        "displayName": user["name"],
        "category": user.get("category") or "Lifestyle",
        "niche": user.get("category") or "Lifestyle",
        "followers": user.get("followers") or 10000,
        "followersCount": user.get("followers") or 10000,
        "influencerTier": user.get("tier") or influencer_tier_from_followers(user.get("followers") or 10000),
        "platform": "Instagram",
        "platforms": ["Instagram"],
    }


@router.put("/profile")
def update_profile(req: InfluencerProfileRequest, user: dict = Depends(get_current_user)):
    """Persist influencer profile setup details."""
    _require_influencer(user)
    now = utc_now_iso()
    profile = req.profile
    category = profile.get("niche") or profile.get("category") or user.get("category") or "Lifestyle"
    followers = int(float(profile.get("followersCount") or profile.get("followers") or user.get("followers") or 10000))
    tier = profile.get("influencerTier") or influencer_tier_from_followers(followers)
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO influencer_profiles (user_id, profile, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET profile = excluded.profile, updated_at = excluded.updated_at
            """,
            (user["id"], json.dumps(profile), now),
        )
        conn.execute(
            """
            UPDATE users
            SET category = ?, followers = ?, tier = ?
            WHERE id = ?
            """,
            (category, followers, tier, user["id"]),
        )
    return {"success": True, "profile": profile, "updatedAt": now}


@router.get("/analytics")
def get_analytics():
    """
    Return analytics derived from training data and ML predictions.
    Requires trained models.
    """
    _require_trained()

    empty = {
        "influencers": [],
        "engagementTrends": [],
        "roiPredictions": [],
        "categoryPerformance": [],
        "platformData": []
    }
    if STATE.get("train_df") is None:
        return empty

    train_df = STATE["train_df"].copy()
    if len(train_df) == 0:
        return empty

    test_df = STATE["test_df"].copy() if STATE.get("test_df") is not None else pd.DataFrame()
    if test_df is None:
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


@router.get("/shap")
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
    plt.title("SHAP - Stage 1 ER Model (no engagement_rate in features -)", fontweight="bold")
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=120, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode("utf-8")

    return {"image_base64": img_b64, "format": "png",
            "note": "Decode base64 and render as image. Top features by mean |SHAP| value."}


@router.get("/cold-start")
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
