"""Shared image-processing utilities."""

from __future__ import annotations

import base64
import io

import httpx
from fastapi import HTTPException, status
from PIL import Image

from app.config import settings


async def bytes_to_pil(data: bytes) -> Image.Image:
    """Decode raw bytes to a PIL RGB Image; raises 422 on failure."""
    try:
        return Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot decode image: {exc}",
        )


async def fetch_url(url: str) -> bytes:
    """Download image bytes from a URL; raises 400/502 on failure."""
    try:
        async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
            resp = await client.get(url, follow_redirects=True)
            resp.raise_for_status()
            return resp.content
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Remote server returned {exc.response.status_code}.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not fetch URL: {exc}",
        )


def decode_base64(b64: str) -> bytes:
    """Strip optional data-URI prefix and decode base64 to bytes; raises 422 on failure."""
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    try:
        return base64.b64decode(b64)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid base64 string: {exc}",
        )


def pil_to_jpeg_bytes(image: Image.Image, quality: int | None = None) -> bytes:
    """Encode a PIL image to JPEG bytes."""
    q = quality if quality is not None else settings.jpeg_quality
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=q)
    return buf.getvalue()
