"""Detection router — /detect, /detect/url, /detect/annotated, /detect/base64."""

from __future__ import annotations

import io

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from PIL import Image

from app import models
from app.schemas.detection import (
    Base64Payload,
    BoundingBox,
    Detection,
    DetectionResponse,
    UrlPayload,
)
from app.utils.image import bytes_to_pil, decode_base64, fetch_url, pil_to_jpeg_bytes

router = APIRouter(prefix="/detect", tags=["Detection"])


# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers (scoped to this router)
# ──────────────────────────────────────────────────────────────────────────────

def _require_detect():
    model = models.get("detect")
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Detection model is not available.",
        )
    return model


def _run_inference(model, pil: Image.Image) -> DetectionResponse:
    try:
        result = model(pil)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failed: {exc}",
        )

    boxes  = result.boxes.xyxy.tolist() if result.boxes is not None else []
    confs  = result.boxes.conf.tolist() if result.boxes is not None else []
    clss   = result.boxes.cls.tolist()  if result.boxes is not None else []
    names  = result.names

    detections = [
        Detection(
            cls=names[int(c)],
            confidence=round(float(conf), 4),
            box=BoundingBox(x1=b[0], y1=b[1], x2=b[2], y2=b[3]),
        )
        for b, conf, c in zip(boxes, confs, clss)
    ]
    return DetectionResponse(count=len(detections), detections=detections)


def _annotated_jpeg(model, pil: Image.Image) -> bytes:
    try:
        result = model(pil)
        annotated = Image.fromarray(result.plot())
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Annotation failed: {exc}",
        )
    return pil_to_jpeg_bytes(annotated)


async def _resolve_image(
    file: UploadFile | None, url: str | None
) -> Image.Image:
    if file is not None:
        raw = await file.read()
    elif url is not None:
        raw = await fetch_url(url)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either a 'file' (multipart) or a 'url' form field.",
        )
    return await bytes_to_pil(raw)


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=DetectionResponse,
    summary="Detect objects — file or URL form field",
)
async def detect(
    file: UploadFile | None = File(default=None),
    url: str | None = Form(default=None),
):
    """
    Accepts **multipart/form-data** with:
    - `file` — image file upload, **or**
    - `url`  — publicly accessible image URL as a form field
    """
    model = _require_detect()
    pil   = await _resolve_image(file, url)
    return _run_inference(model, pil)


@router.post(
    "/url",
    response_model=DetectionResponse,
    summary="Detect objects from URL (JSON body)",
)
async def detect_url(payload: UrlPayload):
    """Convenience endpoint: `{"url": "https://..."}` as JSON."""
    model = _require_detect()
    raw   = await fetch_url(str(payload.url))
    pil   = await bytes_to_pil(raw)
    return _run_inference(model, pil)


@router.post(
    "/annotated",
    response_class=Response,
    summary="Detect and return annotated JPEG",
    responses={200: {"content": {"image/jpeg": {}}}},
)
async def detect_annotated(
    file: UploadFile | None = File(default=None),
    url: str | None = Form(default=None),
):
    """Returns a **JPEG** image with bounding boxes drawn by LibreYOLO."""
    model = _require_detect()
    pil   = await _resolve_image(file, url)
    jpeg  = _annotated_jpeg(model, pil)
    return Response(content=jpeg, media_type="image/jpeg")


@router.post(
    "/base64",
    response_model=DetectionResponse,
    summary="Detect objects from a base64-encoded image",
)
async def detect_base64(payload: Base64Payload):
    """
    Send `{"image": "<base64>"}`.  
    The string may include a data-URI prefix (`data:image/jpeg;base64,...`).  
    Ideal for JavaScript clients that cannot use FormData.
    """
    model = _require_detect()
    raw   = decode_base64(payload.image)
    pil   = await bytes_to_pil(raw)
    return _run_inference(model, pil)
