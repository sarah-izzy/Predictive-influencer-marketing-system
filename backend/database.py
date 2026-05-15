"""SQLite-backed user storage for authentication."""

from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

DB_PATH = Path(os.getenv("INFLUENCER_DB_PATH", Path(__file__).with_name("influencer.db")))


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('brand', 'influencer')),
                avatar TEXT NOT NULL,
                company TEXT,
                category TEXT,
                followers INTEGER,
                tier TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS campaigns (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                payload TEXT NOT NULL,
                prediction_result TEXT,
                status TEXT NOT NULL DEFAULT 'draft',
                selected_influencers TEXT,
                actual_results TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        existing_campaign_cols = {
            row["name"] for row in conn.execute("PRAGMA table_info(campaigns)").fetchall()
        }
        campaign_migrations = {
            "status": "ALTER TABLE campaigns ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'",
            "selected_influencers": "ALTER TABLE campaigns ADD COLUMN selected_influencers TEXT",
            "actual_results": "ALTER TABLE campaigns ADD COLUMN actual_results TEXT",
            "updated_at": "ALTER TABLE campaigns ADD COLUMN updated_at TEXT",
        }
        for col, sql in campaign_migrations.items():
            if col not in existing_campaign_cols:
                conn.execute(sql)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS invitations (
                id TEXT PRIMARY KEY,
                campaign_id TEXT NOT NULL,
                brand_user_id TEXT NOT NULL,
                influencer_user_id TEXT,
                influencer_ref TEXT NOT NULL,
                influencer_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                message TEXT,
                created_at TEXT NOT NULL,
                responded_at TEXT,
                FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
                FOREIGN KEY(brand_user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(influencer_user_id) REFERENCES users(id) ON DELETE SET NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS influencer_profiles (
                user_id TEXT PRIMARY KEY,
                profile TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
