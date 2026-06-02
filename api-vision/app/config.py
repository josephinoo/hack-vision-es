from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings — can be overridden via environment variables
    or a .env file placed at the project root.

    Example .env:
        WEIGHTS_DIR=./weights
        DETECT_WEIGHT=LibreYOLO9t.pt
        HOST=0.0.0.0
        PORT=8000
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Model weights ──────────────────────────────────────────────────────────
    weights_dir: Path = Path("weights")
    detect_weight: str = "LibreYOLO9t.pt"
    segment_weight: str = "LibreRFDETRs-seg.pt"
    pose_weight: str = "LibreYOLONASs-pose.pt"

    # ── Server ─────────────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000

    # ── CORS ───────────────────────────────────────────────────────────────────
    cors_origins: list[str] = ["*"]

    # ── Inference ──────────────────────────────────────────────────────────────
    http_timeout: float = 15.0       # seconds for remote URL downloads
    jpeg_quality: int = 90           # quality of /detect/annotated response

    @property
    def detect_weight_path(self) -> Path:
        return self.weights_dir / self.detect_weight

    @property
    def segment_weight_path(self) -> Path:
        return self.weights_dir / self.segment_weight

    @property
    def pose_weight_path(self) -> Path:
        return self.weights_dir / self.pose_weight


settings = Settings()
