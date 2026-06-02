# api-vision

FastAPI backend para detección de objetos en tiempo real, segmentación y estimación de poses con **LibreYOLO**.

---

## Estructura del paquete

```
api-vision/
├── app/
│   ├── main.py             ← Entrada FastAPI + lifespan + registro de routers
│   ├── config.py           ← Ajustes via pydantic-settings / .env
│   ├── models.py           ← Registro de modelos (carga única al arrancar)
│   ├── schemas/
│   │   ├── detection.py    ← BoundingBox, Detection, DetectionResponse
│   │   ├── segmentation.py ← SegmentDetection, SegmentResponse, Polygon
│   │   └── pose.py         ← KeyPoint, PosePerson, PoseResponse
│   ├── routers/
│   │   ├── detect.py       ← /detect, /detect/url, /detect/annotated, /detect/base64
│   │   ├── segment.py      ← /segment
│   │   ├── pose.py         ← /pose
│   │   └── stream.py       ← WebSocket /ws/stream
│   └── utils/
│       └── image.py        ← bytes_to_pil, fetch_url, decode_base64, pil_to_jpeg_bytes
└── pyproject.toml
```

---

## Instalación

### 1 — Activar el entorno virtual del proyecto

```bash
# Desde la raíz del monorepo
source libreyolo/.venv/bin/activate   # macOS / Linux
```

### 2 — Instalar la API

```bash
cd api-vision
pip install -e .
```

### 3 — Segmentación (opcional)

```bash
# Dentro de libreyolo/ instalar el extra rfdetr
cd ../libreyolo
pip install -e ".[rfdetr]"
cd ../api-vision
```

### 4 — Pesos de los modelos

Coloca los archivos `.pt` en `weights/` (al mismo nivel que `api-vision/`):

```
hack-vision-es/
├── api-vision/
└── weights/
    ├── LibreYOLO9t.pt          ← detección (requerido)
    ├── LibreRFDETRs-seg.pt     ← segmentación (opcional)
    └── LibreYOLONASs-pose.pt   ← pose (opcional)
```

---

## Configuración via `.env`

Crea un archivo `.env` en `api-vision/` (opcional):

```env
WEIGHTS_DIR=../weights
DETECT_WEIGHT=LibreYOLO9t.pt
SEGMENT_WEIGHT=LibreRFDETRs-seg.pt
POSE_WEIGHT=LibreYOLONASs-pose.pt
PORT=8000
JPEG_QUALITY=90
```

---

## Arrancar el servidor

```bash
# Desde api-vision/
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Documentación interactiva: <http://localhost:8000/docs>

---

## Endpoints y ejemplos

### `GET /health`

```bash
curl http://localhost:8000/health
# {"status":"ok","models":["detect","segment","pose"]}
```

---

### `POST /detect` — archivo o URL como campo de formulario

```bash
# Con archivo
curl -X POST http://localhost:8000/detect \
  -F "file=@foto.jpg"

# Con URL
curl -X POST http://localhost:8000/detect \
  -F "url=https://ultralytics.com/images/zidane.jpg"
```

Respuesta:

```json
{
  "count": 2,
  "detections": [
    {
      "cls": "person",
      "confidence": 0.9134,
      "box": { "x1": 100.0, "y1": 50.0, "x2": 300.0, "y2": 400.0 }
    }
  ]
}
```

---

### `POST /detect/url` — URL como JSON

```bash
curl -X POST http://localhost:8000/detect/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://ultralytics.com/images/zidane.jpg"}'
```

---

### `POST /detect/annotated` — imagen JPEG con cajas

```bash
curl -X POST http://localhost:8000/detect/annotated \
  -F "file=@foto.jpg" \
  --output resultado.jpg
```

---

### `POST /detect/base64` — base64 (ideal para JavaScript)

```bash
curl -X POST http://localhost:8000/detect/base64 \
  -H "Content-Type: application/json" \
  -d "{\"image\": \"$(base64 -i foto.jpg)\"}"
```

Desde JavaScript:

```js
const toBase64 = (file) => new Promise((res, rej) => {
  const reader = new FileReader()
  reader.onload  = () => res(reader.result)  // incluye el prefijo data-URI
  reader.onerror = rej
  reader.readAsDataURL(file)
})

const image = await toBase64(inputEl.files[0])
const resp  = await fetch("http://localhost:8000/detect/base64", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ image }),
})
console.log(await resp.json())
```

---

### `POST /segment` — segmentación de instancias

```bash
curl -X POST http://localhost:8000/segment \
  -F "file=@foto.jpg"
```

Respuesta:

```json
{
  "count": 1,
  "detections": [
    {
      "cls": "car",
      "confidence": 0.8812,
      "box": { "x1": 10, "y1": 20, "x2": 200, "y2": 300 },
      "mask": {
        "points": [[10,20],[50,15],[200,22],[195,300],[12,298]]
      }
    }
  ]
}
```

---

### `POST /pose` — estimación de pose (17 keypoints COCO)

```bash
curl -X POST http://localhost:8000/pose \
  -F "file=@persona.jpg"
```

Respuesta:

```json
{
  "count": 1,
  "persons": [
    {
      "box": { "x1": 50, "y1": 30, "x2": 350, "y2": 600 },
      "confidence": 0.9421,
      "keypoints": [
        { "name": "nose",       "x": 180.5, "y": 55.2, "confidence": 0.99 },
        { "name": "left_eye",   "x": 172.1, "y": 48.3, "confidence": 0.97 }
      ]
    }
  ]
}
```

---

### WebSocket `/ws/stream` — streaming en tiempo real

El cliente envía frames JPEG crudos como bytes; el servidor responde con JSON por frame.

```js
const ws = new WebSocket("ws://localhost:8000/ws/stream")
ws.binaryType = "arraybuffer"

// Enviar un frame desde un <canvas>
function sendFrame(canvas) {
  canvas.toBlob((blob) => {
    blob.arrayBuffer().then((buf) => ws.send(buf))
  }, "image/jpeg", 0.8)
}

// Recibir detecciones
ws.onmessage = (e) => {
  const { count, detections } = JSON.parse(e.data)
  console.log(`${count} objetos:`, detections)
}

// Stream de cámara a 15 fps
const video  = document.querySelector("video")
const canvas = document.createElement("canvas")
const ctx    = canvas.getContext("2d")

setInterval(() => {
  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
  ctx.drawImage(video, 0, 0)
  sendFrame(canvas)
}, 1000 / 15)
```
