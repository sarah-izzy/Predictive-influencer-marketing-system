"""Pydantic request models used by the API routes."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

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
    max_followers: Optional[int] = Field(None)
    target_platform: Optional[str] = Field(None)
    target_niche: Optional[str] = Field(None)
    require_geo_match: bool = Field(False)


class UncertaintyRequest(BaseModel):
    records: List[Dict[str, Any]] = Field(..., description="Up to 8 influencer+campaign dicts")
    n_bootstrap: int = Field(50, ge=10, le=200)


class CampaignCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    payload: Dict[str, Any]
    prediction_result: Optional[Dict[str, Any]] = None


class CampaignSelectionRequest(BaseModel):
    influencers: List[Dict[str, Any]] = Field(..., min_length=1)
    message: Optional[str] = None


class CampaignEvaluationRequest(BaseModel):
    actual_engagement_rate: float = Field(..., ge=0)
    actual_conversion_rate: float = Field(..., ge=0)
    actual_revenue_usd: float = Field(..., ge=0)
    actual_roi: float
    notes: Optional[str] = None


class InvitationResponseRequest(BaseModel):
    status: str = Field(..., pattern="^(accepted|declined)$")


class InfluencerProfileRequest(BaseModel):
    profile: Dict[str, Any]


class BrandInfluencerCreateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    username: str = Field(..., min_length=3)
    password: str = Field("password123", min_length=6)
    category: str = "Lifestyle"
    followers: int = Field(10000, ge=0)
    profile: Dict[str, Any] = Field(default_factory=dict)


class BrandInfluencerUpdateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    username: str = Field(..., min_length=3)
    category: str = "Lifestyle"
    followers: int = Field(10000, ge=0)
    tier: Optional[str] = None
    profile: Dict[str, Any] = Field(default_factory=dict)
