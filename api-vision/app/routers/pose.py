"""Pose estimation router — POST /pose."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app import models
from app.schemas.detection import BoundingBox
from app.schemas.pose import COCO_KEYPOINT_NAMES, KeyPoint, PosePerson, PoseResponse
from app.utils.image import bytes_to_pil, fetch_url

router = APIRouter(prefix="/pose", tags=["Pose"])


def _require_pose():
    model = models.get("pose")
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Pose model is not available. "
                "Ensure 'LibreYOLONASs-pose.pt' exists in the weights/ directory."
            ),
        )
    return model


@router.post(
    "",
    response_model=PoseResponse,
    summary="Pose estimation — bounding boxes + 17 COCO keypoints per person",
)
async def pose(
    file: UploadFile | None = File(default=None),
    url: str | None = Form(default=None),
):
    """
    Uses `LibreYOLONASs-pose.pt`.  
    Detects every person in the image and returns their bounding box together with
    the 17 COCO skeleton keypoints (each with coordinates and confidence score).

    **COCO keypoint order:**  
    nose, left_eye, right_eye, left_ear, right_ear,  
    left_shoulder, right_shoulder, left_elbow, right_elbow,  
    left_wrist, right_wrist, left_hip, right_hip,  
    left_knee, right_knee, left_ankle, right_ankle
    """
    model = _require_pose()

    if file is not None:
        raw = await file.read()
    elif url is not None:
        raw = await fetch_url(url)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either a 'file' (multipart) or a 'url' form field.",
        )

    pil = await bytes_to_pil(raw)

    try:
        result = model(pil)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pose inference failed: {exc}",
        )

    boxes  = result.boxes.xyxy.tolist() if result.boxes is not None else []
    confs  = result.boxes.conf.tolist() if result.boxes is not None else []

    # result.keypoints.data — tensor (N_persons, 17, 3): [x, y, conf]
    kps_data: list = []
    if hasattr(result, "keypoints") and result.keypoints is not None:
        kps_data = result.keypoints.data.tolist()

    persons: list[PosePerson] = []
    for i, (b, conf) in enumerate(zip(boxes, confs)):
        keypoints: list[KeyPoint] = []
        if i < len(kps_data):
            for j, kp in enumerate(kps_data[i]):
                name = COCO_KEYPOINT_NAMES[j] if j < len(COCO_KEYPOINT_NAMES) else f"kp_{j}"
                keypoints.append(
                    KeyPoint(name=name, x=kp[0], y=kp[1], confidence=round(kp[2], 4))
                )

        persons.append(
            PosePerson(
                box=BoundingBox(x1=b[0], y1=b[1], x2=b[2], y2=b[3]),
                confidence=round(float(conf), 4),
                keypoints=keypoints,
            )
        )

    return PoseResponse(count=len(persons), persons=persons)
