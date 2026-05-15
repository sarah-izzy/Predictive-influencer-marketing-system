"""Seed registered influencer users with full ML-ready profile data."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).with_name("influencer.db")

ROWS = [
    ("influencer-travel-vibes", "Travel Vibes", "influencer@test.com", "travel_vibes", "Travel", "Instagram", 45000, 3200, 260, 130, 210, 26000, 88, 6, 0.86, 0.78, 1, 0.82, 58, 36, 42, 22, 0.68, 5, 4.2, 0, 0.51, 82, 72, 430, 18500),
    ("influencer-beauty-aura", "Beauty Aura", "beauty.aura@test.com", "beauty_aura", "Beauty", "TikTok", 120000, 9800, 740, 410, 860, 71000, 91, 5, 0.92, 0.84, 1, 0.88, 76, 48, 37, 15, 0.73, 6, 3.5, 1, 0.54, 86, 79, 910, 38200),
    ("influencer-tech-lens", "Tech Lens", "tech.lens@test.com", "tech_lens", "Tech", "YouTube", 83000, 5100, 430, 220, 390, 49000, 84, 9, 0.81, 0.76, 1, 0.74, 32, 27, 45, 28, 0.61, 3.5, 5.1, 0, 0.50, 74, 68, 520, 24600),
    ("influencer-fit-flow", "Fit Flow", "fit.flow@test.com", "fit_flow", "Fitness", "Instagram", 67000, 4700, 390, 190, 510, 41000, 87, 7, 0.83, 0.80, 1, 0.79, 54, 34, 44, 22, 0.66, 5.5, 3.8, 0, 0.53, 84, 73, 610, 27100),
    ("influencer-foodie-lagos", "Foodie Lagos", "foodie.lagos@test.com", "foodie_lagos", "Food", "Instagram", 38000, 2900, 220, 120, 260, 23000, 82, 11, 0.77, 0.72, 1, 0.81, 61, 31, 46, 23, 0.70, 4.5, 2.9, 0, 0.46, 78, 64, 360, 14200),
    ("influencer-game-hub", "Game Hub", "game.hub@test.com", "game_hub", "Gaming", "YouTube", 210000, 13200, 1200, 650, 720, 125000, 79, 14, 0.74, 0.69, 0, 0.70, 28, 52, 34, 14, 0.58, 4, 6.3, 1, 0.43, 76, 66, 790, 33600),
    ("influencer-fashion-edit", "Fashion Edit", "fashion.edit@test.com", "fashion_edit", "Fashion", "TikTok", 96000, 7600, 560, 300, 680, 59000, 85, 8, 0.89, 0.82, 1, 0.83, 72, 43, 39, 18, 0.71, 6.5, 3.2, 0, 0.52, 88, 77, 720, 30900),
    ("influencer-health-voice", "Health Voice", "health.voice@test.com", "health_voice", "Health", "Facebook", 54000, 3100, 280, 170, 240, 30000, 90, 4, 0.84, 0.75, 1, 0.86, 63, 18, 40, 42, 0.64, 3, 5.8, 1, 0.50, 80, 70, 480, 22100),
    ("influencer-finance-daily", "Finance Daily", "finance.daily@test.com", "finance_daily", "Finance", "Twitter/X", 76000, 3600, 310, 260, 180, 43000, 83, 10, 0.80, 0.73, 1, 0.68, 38, 20, 47, 33, 0.60, 5, 4.7, 0, 0.47, 75, 63, 410, 19800),
    ("influencer-life-with-zara", "Life With Zara", "life.zara@test.com", "life_with_zara", "Lifestyle", "Instagram", 150000, 10400, 890, 430, 910, 88000, 89, 6, 0.87, 0.81, 1, 0.85, 69, 39, 43, 18, 0.75, 7, 4.4, 1, 0.55, 90, 81, 1020, 42100),
]


def tier_for(followers: int) -> str:
    if followers < 10_000:
        return "Nano"
    if followers < 100_000:
        return "Micro"
    if followers < 500_000:
        return "Mid-Tier"
    if followers < 1_000_000:
        return "Macro"
    return "Mega"


def make_profile(row: tuple) -> dict:
    (
        _user_id, name, _email, username, category, platform, followers, likes, comments,
        shares, saves, reach, auth, fake, align, age_match, geo_match, sentiment, female,
        a18, a25, a35, concentration, posts, age_years, verified, reach_quality,
        consistency, success_rate, conversions, revenue,
    ) = row
    engagement_rate = round(((likes + comments + shares + saves) / followers) * 100, 2)
    tier = tier_for(followers)
    return {
        "displayName": name,
        "bio": f"{category} creator focused on authentic brand collaborations.",
        "category": category,
        "niche": category,
        "platform": platform,
        "platforms": [platform],
        "influencerTier": tier,
        "followers": followers,
        "followersCount": followers,
        "handle": f"@{username}",
        "engagementRate": engagement_rate,
        "avgLikes": likes,
        "avgComments": comments,
        "avgShares": shares,
        "avgSaves": saves,
        "avgViews": reach,
        "hist_avg_likes_per_post": likes,
        "hist_avg_comments_per_post": comments,
        "hist_avg_shares_per_post": shares,
        "hist_avg_saves_per_post": saves,
        "hist_avg_reach_per_post": reach,
        "hist_posts_per_week": posts,
        "fakeFollowerPct": fake,
        "fake_follower_pct": fake,
        "authenticityScore": auth,
        "audience_authenticity_score": auth,
        "brandAlignmentScore": align,
        "brand_alignment_score": align,
        "audienceAgeMatchScore": age_match,
        "audience_age_match_score": age_match,
        "audienceGeoMatch": geo_match,
        "audience_geo_match": geo_match,
        "sentimentScore": sentiment,
        "hist_sentiment_score": sentiment,
        "audienceFemalePct": female,
        "audience_female_pct": female,
        "audience_18_24_pct": a18,
        "audience_25_34_pct": a25,
        "audience_35plus_pct": a35,
        "audienceConcentrationScore": concentration,
        "audience_concentration_score": concentration,
        "primaryAudienceGeo": "Nigeria",
        "primary_audience_geo": "Nigeria",
        "accountAgeYears": age_years,
        "account_age_years": age_years,
        "isVerified": verified,
        "is_verified": verified,
        "reachQualityScore": reach_quality,
        "reach_quality_score": reach_quality,
        "contentConsistencyScore": consistency,
        "content_consistency_score": consistency,
        "historicalConversions": conversions,
        "historicalRevenue": revenue,
        "campaignSuccessRate": success_rate,
        "postRate": int(followers * 0.025),
        "storyRate": int(followers * 0.01),
        "reelRate": int(followers * 0.018),
    }


def main() -> None:
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH, timeout=5) as conn:
        conn.row_factory = sqlite3.Row
        current = conn.execute("SELECT password_hash FROM users WHERE username = 'travel_vibes'").fetchone()
        if not current:
            raise RuntimeError("Expected existing travel_vibes user to reuse password hash.")
        password_hash = current["password_hash"]

        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("DELETE FROM users WHERE role = 'influencer'")
        for row in ROWS:
            user_id, name, email, username, category, _platform, followers, *_rest = row
            tier = tier_for(followers)
            conn.execute(
                """
                INSERT INTO users (
                    id, name, email, username, password_hash, role, avatar,
                    company, category, followers, tier, created_at
                )
                VALUES (?, ?, ?, ?, ?, 'influencer', ?, NULL, ?, ?, ?, ?)
                """,
                (user_id, name, email, username, password_hash, name[0].upper(), category, followers, tier, now),
            )
            conn.execute(
                "INSERT INTO influencer_profiles (user_id, profile, updated_at) VALUES (?, ?, ?)",
                (user_id, json.dumps(make_profile(row)), now),
            )

        seeded = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'influencer'").fetchone()[0]
        print(f"Seeded {seeded} influencers")


if __name__ == "__main__":
    main()
