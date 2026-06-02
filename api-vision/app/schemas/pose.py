"""Pydantic schemas for the pose estimation endpoint."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.detection import BoundingBox

# COCO 17-keypoint order (index → name)
COCO_KEYPOINT_NAMES: list[str] = [
    "nose",
    "left_eye", "right_eye",
    "left_ear", "right_ear",
    "left_shoulder", "right_shoulder",
    "left_elbow", "right_elbow",
    "left_wrist", "right_wrist",
    "left_hip", "right_hip",
    "left_knee", "right_knee",
    "left_ankle", "right_ankle",
]


class KeyPoint(BaseModel):
    name: str
    x: float
    y: float
    confidence: float


class PosePerson(BaseModel):
    box: BoundingBox
    confidence: float
    keypoints: list[KeyPoint]


class PoseResponse(BaseModel):
    count: int
    persons: list[PosePerson]
