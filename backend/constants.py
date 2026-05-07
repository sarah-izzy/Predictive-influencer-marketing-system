"""Shared constants for the influencer prediction pipeline."""

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
