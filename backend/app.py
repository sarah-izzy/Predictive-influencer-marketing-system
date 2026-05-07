"""FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import init_auth_storage, router as auth_router
from model_store import load_models_once
from routes import router

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]


def create_app() -> FastAPI:
    init_auth_storage()
    app = FastAPI(
        title="Predictive Influencer Marketing API",
        description="Multi-stage ML pipeline: ER -> CVR -> Revenue + Campaign Success",
        version="4.0.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth_router)
    app.include_router(router)

    @app.on_event("startup")
    def load_persisted_models() -> None:
        load_models_once()

    return app
