"""ASGI entry point for the predictive influencer marketing backend.

Run locally with:
    uvicorn main:app --reload
"""

from app import create_app

app = create_app()
