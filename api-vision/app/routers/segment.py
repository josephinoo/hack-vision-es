"""Segmentation router — POST /segment."""

from __future__ import annotations

import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app import models
from app.schemas.detection import BoundingBox
from app.schemas.segmentation import Polygon, SegmentDetection, SegmentResponse
from app.utils.image import bytes_to_pil, fetch_url

router = APIRouter(prefix="/segment", tags=["Segmentation"])


def _require_segment():
    model = models.get("segment")
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Segmentation model is not available. "
                "Ensure 'LibreRFDETRs-seg.pt' exists in weights/ and that "
                "the rfdetr extra is installed: pip install -e \".[rfdetr]\""
            ),
        )
    return model


@router.post(
    "",
    response_model=SegmentResponse,
    summary="Instance segmentation — boxes + polygon masks",
)
async def segment(
    file: UploadFile | None = File(default=None),
    url: str | None = Form(default=None),
):
    """
    Uses `LibreRFDETRs-seg.pt`.  
    Returns bounding boxes **and** per-object polygon mask coordinates.

    **Requires:** `pip install -e ".[rfdetr]"` inside the `libreyolo/` directory.
    """
    model = _require_segment()

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
            detail=f"Segmentation inference failed: {exc}",
        )

    boxes  = result.boxes.xyxy.tolist() if result.boxes is not None else []
    confs  = result.boxes.conf.tolist() if result.boxes is not None else []
    clss   = result.boxes.cls.tolist()  if result.boxes is not None else []
    names  = result.names

    masks_xy: list = []
    if hasattr(result, "masks") and result.masks is not None and hasattr(result.masks, "xy"):
        masks_xy = result.masks.xy  # list of np.ndarray (N, 2)

    detections: list[SegmentDetection] = []
    for i, (b, conf, c) in enumerate(zip(boxes, confs, clss)):
        polygon: Polygon | None = None
        if i < len(masks_xy) and masks_xy[i] is not None:
            pts = masks_xy[i]
            polygon = Polygon(
                points=pts.tolist() if isinstance(pts, np.ndarray) else pts
            )

        detections.append(
            SegmentDetection(
                cls=names[int(c)],
                confidence=round(float(conf), 4),
                box=BoundingBox(x1=b[0], y1=b[1], x2=b[2], y2=b[3]),
                mask=polygon,
            )
        )

    return SegmentResponse(count=len(detections), detections=detections)
