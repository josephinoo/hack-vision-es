"""WebSocket streaming router — /ws/stream."""

from __future__ import annotations

import io
import logging
import numpy as np

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from PIL import Image

from app import models

logger = logging.getLogger("api-vision.stream")

router = APIRouter(tags=["Streaming"])

COCO_KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]


@router.websocket("/ws/stream")
async def ws_stream(websocket: WebSocket, model: str = "detect"):
    """
    **Real-time frame streaming over WebSocket.**

    The client sends raw JPEG bytes for each frame; the server responds with
    a JSON string containing the detections for that frame.

    ```
    Response shape per frame:
    {
      "count": 2,
      "detections": [
        {
          "class": "person",
          "confidence": 0.91,
          "box": {"x1": 100, "y1": 50, "x2": 300, "y2": 400}
        }
      ]
    }
    ```

    **JavaScript example:**
    ```js
    const ws = new WebSocket("ws://localhost:8000/ws/stream")
    ws.binaryType = "arraybuffer"
    ws.send(frameBlob)
    ws.onmessage = (e) => console.log(JSON.parse(e.data))
    ```
    """
    await websocket.accept()
    logger.info("WebSocket client connected: %s", websocket.client)

    model_obj = models.get(model)
    if model_obj is None:
        await websocket.send_json({"error": "Detection model is not available."})
        await websocket.close(code=1013)
        return

    try:
        while True:
            raw: bytes = await websocket.receive_bytes()

            try:
                pil    = Image.open(io.BytesIO(raw)).convert("RGB")
                result = model_obj(pil)

                boxes  = result.boxes.xyxy.tolist() if result.boxes is not None else []
                confs  = result.boxes.conf.tolist()  if result.boxes is not None else []
                clss   = result.boxes.cls.tolist()   if result.boxes is not None else []
                names  = result.names

                # ── Masks (segmentation) ───────────────────────────────────────
                masks_xy: list = []
                try:
                    if hasattr(result, "masks") and result.masks is not None:
                        raw_masks = getattr(result.masks, "xy", None)
                        if raw_masks is not None:
                            masks_xy = list(raw_masks)
                except Exception:
                    pass

                # ── Keypoints (pose) ──────────────────────────────────────────
                kps_data: list = []
                try:
                    if hasattr(result, "keypoints") and result.keypoints is not None:
                        kps_tensor = getattr(result.keypoints, "data", None)
                        if kps_tensor is not None:
                            kps_data = kps_tensor.tolist()
                except Exception:
                    pass

                detections = []
                for i, (b, conf, c) in enumerate(zip(boxes, confs, clss)):
                    det: dict = {
                        "class": names.get(int(c), "?"),
                        "confidence": round(float(conf), 4),
                        "box": {"x1": b[0], "y1": b[1], "x2": b[2], "y2": b[3]},
                    }

                    if i < len(masks_xy) and masks_xy[i] is not None:
                        pts = masks_xy[i]
                        det["mask"] = {"points": pts.tolist() if isinstance(pts, np.ndarray) else list(pts)}

                    if i < len(kps_data):
                        keypoints = []
                        for j, kp in enumerate(kps_data[i]):
                            kp_name = COCO_KEYPOINT_NAMES[j] if j < len(COCO_KEYPOINT_NAMES) else f"kp_{j}"
                            conf_val = round(float(kp[2]), 4) if len(kp) > 2 else 1.0
                            keypoints.append({"name": kp_name, "x": kp[0], "y": kp[1], "confidence": conf_val})
                        det["keypoints"] = keypoints

                    detections.append(det)

                await websocket.send_json({"count": len(detections), "detections": detections})

            except Exception as exc:
                logger.warning("Frame processing error (%s): %s", model, exc)
                await websocket.send_json({"error": str(exc), "count": 0, "detections": []})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected: %s", websocket.client)
