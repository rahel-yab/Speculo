from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.rate_limit import limiter
from app.routers import auth, credits, qa, search, videos
from app.services.storage import StorageService

storage = StorageService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await storage.ensure_bucket()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, lifespan=lifespan, default_response_class=ORJSONResponse)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(credits.router)
    app.include_router(videos.router)
    app.include_router(search.router)
    app.include_router(qa.router)

    @app.get("/health")
    async def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    return app
