"""
Model registry — loads each LibreYOLO model exactly once at startup
and exposes them through a typed singleton.
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings

logger = logging.getLogger("api-vision.models")

# ──────────────────────────────────────────────────────────────────────────────
# Internal registry
# ──────────────────────────────────────────────────────────────────────────────
_registry: dict[str, Any] = {}


def load_all() -> None:
    """
    Load every model whose weight file exists on disk.
    Called once inside the FastAPI lifespan context manager.
    """
    from libreyolo import LibreYOLO  # deferred to avoid slow imports at module level

    _load_model("detect", settings.detect_weight_path, LibreYOLO, required=True)
    _load_model("segment", settings.segment_weight_path, LibreYOLO, required=False)
    _load_model("pose", settings.pose_weight_path, LibreYOLO, required=False)


def _load_model(key: str, weight_path, loader_cls, *, required: bool) -> None:
    if not weight_path.exists():
        if required:
            raise FileNotFoundError(
                f"Required weight not found: {weight_path}. "
                "Place the .pt file inside the weights/ directory."
            )
        logger.warning("Optional weight not found (%s) — endpoint '%s' disabled.", weight_path, key)
        return

    logger.info("Loading '%s' model from %s …", key, weight_path.name)
    _registry[key] = loader_cls(str(weight_path))
    logger.info("  ✓ '%s' ready.", key)


def release_all() -> None:
    """Release all model references (called on shutdown)."""
    _registry.clear()
    logger.info("All models released.")


# ──────────────────────────────────────────────────────────────────────────────
# Public accessors
# ──────────────────────────────────────────────────────────────────────────────

def get(key: str) -> Any | None:
    """Return the model for *key*, or None if it was not loaded."""
    return _registry.get(key)


def available() -> list[str]:
    """Return names of all successfully loaded models."""
    return list(_registry.keys())
