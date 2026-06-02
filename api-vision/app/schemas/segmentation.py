"""Pydantic schemas for the segmentation endpoint."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.detection import BoundingBox


class Polygon(BaseModel):
    """2-D polygon as a list of [x, y] pairs."""
    points: list[list[float]]


class SegmentDetection(BaseModel):
    cls: str
    confidence: float
    box: BoundingBox
    mask: Polygon | None = None


class SegmentResponse(BaseModel):
    count: int
    detections: list[SegmentDetection]
