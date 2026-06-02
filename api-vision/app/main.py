"""
LibreYOLO Vision API — application entry point.

Run:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.config import settings
from app.routers import detect, pose, segment, stream

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)-8s │ %(name)s │ %(message)s",
)
logger = logging.getLogger("api-vision")


# ──────────────────────────────────────────────────────────────────────────────
# Lifespan
# ──────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — loading models …")
    models.load_all()
    logger.info("All models ready. API is live.")
    yield
    logger.info("Shutting down — releasing models …")
    models.release_all()


# ──────────────────────────────────────────────────────────────────────────────
# App
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="LibreYOLO Vision API",
    description=(
        "Real-time object **detection**, instance **segmentation**, and **pose estimation** "
        "powered by [LibreYOLO](https://github.com/LibreYOLO/libreyolo).\n\n"
        "Supports file upload, remote URL, base64, and WebSocket frame streaming."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(detect.router)
app.include_router(segment.router)
app.include_router(pose.router)
app.include_router(stream.router)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"], summary="API health check")
def health():
    """Returns the API status and the list of currently loaded model keys."""
    return {
        "status": "ok",
        "models": models.available(),
    }
