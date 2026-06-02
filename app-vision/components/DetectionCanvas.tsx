'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { Detection, ModelKey } from '@/types/detection'
import { MODEL_LABELS } from '@/types/detection'

// Corner arm length in px
const CORNER_LEN = 24
const CORNER_W   = 4
const ACCENT     = '#ff4500'
const LABEL_BG   = 'rgba(13,13,11,0.82)'
const LABEL_FG   = '#ff4500'
const LERP_SPEED = 0.25  // 0 = no smoothing, 1 = instant

interface RenderedBox {
  x1: number; y1: number; x2: number; y2: number
}

interface DetectionCanvasProps {
  videoRef:   React.RefObject<HTMLVideoElement>
  detections: Detection[]
  isDemo:     boolean
  isActive:   boolean
  model:      ModelKey
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpBox(from: RenderedBox, to: RenderedBox, t: number): RenderedBox {
  return {
    x1: lerp(from.x1, to.x1, t),
    y1: lerp(from.y1, to.y1, t),
    x2: lerp(from.x2, to.x2, t),
    y2: lerp(from.y2, to.y2, t),
  }
}

function drawCorners(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.strokeStyle = ACCENT
  ctx.lineWidth   = CORNER_W
  ctx.lineCap     = 'square'

  const L = CORNER_LEN

  ctx.beginPath()
  // Top-left
  ctx.moveTo(x1, y1 + L); ctx.lineTo(x1, y1); ctx.lineTo(x1 + L, y1)
  // Top-right
  ctx.moveTo(x2 - L, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + L)
  // Bottom-right
  ctx.moveTo(x2, y2 - L); ctx.lineTo(x2, y2); ctx.lineTo(x2 - L, y2)
  // Bottom-left
  ctx.moveTo(x1 + L, y2); ctx.lineTo(x1, y2); ctx.lineTo(x1, y2 - L)
  ctx.stroke()
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  const pad = 4
  ctx.font = `500 11px "JetBrains Mono", ui-monospace, monospace`
  const tw  = ctx.measureText(text).width

  ctx.fillStyle = LABEL_BG
  ctx.fillRect(x, y - 18, tw + pad * 2, 18)

  ctx.fillStyle = LABEL_FG
  ctx.fillText(text, x + pad, y - 5)
}

export default function DetectionCanvas({
  videoRef, detections, isDemo, isActive, model,
}: DetectionCanvasProps) {
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const rafRef          = useRef<number>(0)
  const renderedBoxes   = useRef<Map<string, RenderedBox>>(new Map())
  // Keep detections in a ref so draw() never needs to be recreated
  const detectionsRef   = useRef<Detection[]>(detections)
  const modelRef        = useRef<ModelKey>(model)

  useEffect(() => { detectionsRef.current = detections }, [detections])
  useEffect(() => { modelRef.current = model }, [model])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas) { rafRef.current = requestAnimationFrame(draw); return }

    const ctx = canvas.getContext('2d')
    if (!ctx) { rafRef.current = requestAnimationFrame(draw); return }

    // Match canvas to video natural size
    const srcW = video?.videoWidth  || canvas.parentElement?.clientWidth  || 640
    const srcH = video?.videoHeight || canvas.parentElement?.clientHeight || 360
    if (canvas.width !== srcW || canvas.height !== srcH) {
      canvas.width  = srcW
      canvas.height = srcH
    }

    // Draw video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    } else {
      ctx.fillStyle = '#0d0d0b'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // Scale detections — use ref to avoid recreating draw on every update
    const currentDetections = detectionsRef.current
    const scaleX = canvas.width  / (video?.videoWidth  || canvas.width)
    const scaleY = canvas.height / (video?.videoHeight || canvas.height)

    const nextIds = new Set<string>()
    currentDetections.forEach((det, i) => {
      const id  = `${det.class}-${i}`
      nextIds.add(id)

      const target: RenderedBox = {
        x1: det.box.x1 * scaleX,
        y1: det.box.y1 * scaleY,
        x2: det.box.x2 * scaleX,
        y2: det.box.y2 * scaleY,
      }

      const prev = renderedBoxes.current.get(id) ?? target
      const cur  = lerpBox(prev, target, LERP_SPEED)
      renderedBoxes.current.set(id, cur)

      drawCorners(ctx, cur.x1, cur.y1, cur.x2, cur.y2)

      const label = `${det.class} · ${det.confidence.toFixed(2)}`
      drawLabel(ctx, label, cur.x1, cur.y1)
    })

    // Remove stale lerped boxes
    for (const key of renderedBoxes.current.keys()) {
      if (!nextIds.has(key)) renderedBoxes.current.delete(key)
    }

    rafRef.current = requestAnimationFrame(draw)
  // Only videoRef is a real dependency — detections come via ref now
  }, [videoRef])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  return (
    <div className="relative w-full bg-bg overflow-hidden" style={{ aspectRatio: '16/9' }}>

      {/* Hidden video element (source) */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
        muted
        playsInline
        autoPlay
      />

      {/* Canvas draws video + overlays */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="scanline-bar" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,69,0,0.04) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,69,0,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      {/* Top-left: LIVE badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <span className={`w-2 h-2 rounded-full ${isDemo ? 'bg-warning' : isActive ? 'bg-success animate-pulse-dot' : 'bg-fg-muted'}`} />
        <span className="font-mono text-[10px] tracking-widest uppercase text-fg-muted">
          {isDemo ? 'demo mode' : isActive ? 'live · running' : 'standby'}
        </span>
      </div>

      {/* Bottom-left: object count */}
      <div className="absolute bottom-3 left-3 z-10">
        <span className="font-mono text-[11px] tracking-wider text-accent font-bold">
          {String(detections.length).padStart(2, '0')} objects
        </span>
      </div>

      {/* Bottom-right: model name */}
      <div className="absolute bottom-3 right-3 z-10">
        <span className="font-mono text-[10px] text-fg-muted tracking-wide">
          {MODEL_LABELS[model]}
        </span>
      </div>

      {/* Demo banner */}
      {isDemo && (
        <div className="absolute top-10 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <span className="font-mono text-[10px] text-warning tracking-wider px-3 py-1 border border-warning/30 bg-bg/80">
            ● demo mode — connect api to go live
          </span>
        </div>
      )}

      {/* Camera not started overlay */}
      {!isActive && !isDemo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-accent/40">
            <rect x="4" y="4" width="8" height="8" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="36" y="4" width="8" height="8" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="4" y="36" width="8" height="8" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="36" y="36" width="8" height="8" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <p className="font-mono text-[11px] text-fg-muted">press start to activate camera</p>
        </div>
      )}
    </div>
  )
}
