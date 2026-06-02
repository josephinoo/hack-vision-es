"""Pydantic schemas for detection endpoints."""

from __future__ import annotations

from pydantic import BaseModel, HttpUrl


# ── Input schemas ─────────────────────────────────────────────────────────────

class UrlPayload(BaseModel):
    url: HttpUrl


class Base64Payload(BaseModel):
    """
    Accepts a raw base64 string or a full data-URI string such as:
    `data:image/jpeg;base64,/9j/4AAQSkZJRg...`
    """
    image: str


# ── Output schemas ────────────────────────────────────────────────────────────

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    cls: str
    confidence: float
    box: BoundingBox


class DetectionResponse(BaseModel):
    count: int
    detections: list[Detection]
