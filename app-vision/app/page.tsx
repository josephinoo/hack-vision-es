'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import DetectionCanvas  from '@/components/DetectionCanvas'
import DetectionPanel   from '@/components/DetectionPanel'
import StatusBar        from '@/components/StatusBar'
import ModelSelector    from '@/components/ModelSelector'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useCamera }    from '@/hooks/useCamera'
import type { Detection, ModelKey } from '@/types/detection'

// ── Demo mode detections ──────────────────────────────────────────────────────
const DEMO_CLASSES = ['person', 'car', 'dog', 'laptop', 'bottle', 'chair']

function makeDemoDetections(t: number): Detection[] {
  const count = 2 + Math.floor(Math.sin(t * 0.5) * 1.5 + 1.5)
  return Array.from({ length: count }, (_, i) => {
    const phase = t * 0.4 + i * 2.1
    const cx    = 320 + Math.sin(phase) * 180
    const cy    = 240 + Math.cos(phase * 0.7) * 120
    const w     = 80 + Math.sin(t + i) * 20
    const h     = 100 + Math.cos(t * 0.8 + i) * 25

    return {
      class:      DEMO_CLASSES[i % DEMO_CLASSES.length],
      confidence: 0.72 + Math.sin(t + i * 0.5) * 0.18,
      box:        { x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 },
    }
  })
}

export default function HomePage() {
  const [model, setModel]   = useState<ModelKey>('detect')
  const [isDemo, setIsDemo] = useState(false)
  const [demoDetections, setDemoDetections] = useState<Detection[]>([])

  const demoRef = useRef<number>(0)
  const demoRaf = useRef<ReturnType<typeof setInterval> | null>(null)

  const { detections: wsDetections, status, send, reconnect } = useWebSocket(model)
  const { videoRef, isActive, start, stop } = useCamera(
    useCallback((blob: Blob) => {
      blob.arrayBuffer().then((buf) => send(buf))
    }, [send])
  )

  // Switch to demo if WS never connects after 3 s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (status !== 'connected') setIsDemo(true)
    }, 3000)
    if (status === 'connected') {
      clearTimeout(timer)
      setIsDemo(false)
    }
    return () => clearTimeout(timer)
  }, [status])

  // Demo animation loop
  useEffect(() => {
    if (!isDemo) {
      if (demoRaf.current) {
        clearInterval(demoRaf.current)
        demoRaf.current = null
      }
      return
    }
    let t = 0
    demoRaf.current = setInterval(() => {
      t += 0.05
      demoRef.current = t
      setDemoDetections(makeDemoDetections(t))
    }, 80)

    return () => {
      if (demoRaf.current) clearInterval(demoRaf.current)
    }
  }, [isDemo])

  const detections = isDemo ? demoDetections : wsDetections

  return (
    <div className="flex flex-col min-h-screen bg-bg">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          {/* Bracket logo */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M2 10 V2 H8"  stroke="#ff4500" strokeWidth="1.5" fill="none"/>
            <path d="M18 10 V2 H12" stroke="#ff4500" strokeWidth="1.5" fill="none"/>
            <path d="M2 10 V18 H8"  stroke="#ff4500" strokeWidth="1.5" fill="none"/>
            <path d="M18 10 V18 H12" stroke="#ff4500" strokeWidth="1.5" fill="none"/>
          </svg>
          <h1 className="font-title text-[22px] tracking-widest leading-none text-fg">
            VISION
          </h1>
          <span className="font-mono text-[9px] text-fg-muted tracking-[0.2em]">
            · libreyolo · detector
          </span>
        </div>

        {/* Camera controls */}
        <div className="flex items-center gap-2">
          {!isActive ? (
            <button
              onClick={start}
              className="font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 bg-accent text-bg hover:bg-accent-2 transition-colors"
            >
              start camera
            </button>
          ) : (
            <button
              onClick={stop}
              className="font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 border border-border text-fg-muted hover:border-fg-muted hover:text-fg transition-colors"
            >
              stop
            </button>
          )}
        </div>
      </header>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <StatusBar
        status={status}
        count={detections.length}
        model={model}
        isDemo={isDemo}
        onReconnect={reconnect}
      />

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <main className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* Left — Canvas (60%) */}
        <section className="lg:w-[60%] flex flex-col border-r border-border">
          {/* CRT vignette wrapper */}
          <div className="relative flex-1">
            <DetectionCanvas
              videoRef={videoRef}
              detections={detections}
              isDemo={isDemo}
              isActive={isActive}
              model={model}
            />
            {/* CRT vignette overlay */}
            <div className="absolute inset-0 crt-vignette pointer-events-none" />
          </div>

          {/* Coordinate readout bar */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-bg-2">
            <span className="font-mono text-[9px] text-fg-muted tracking-wider">
              frame · {isActive ? '5fps' : '--'}
            </span>
            <span className="font-mono text-[9px] text-fg-muted">·</span>
            <span className="font-mono text-[9px] text-fg-muted tracking-wider">
              ws · {isDemo ? 'demo' : status}
            </span>
            {detections[0] && (
              <>
                <span className="font-mono text-[9px] text-fg-muted">·</span>
                <span className="font-mono text-[9px] text-accent tracking-wider">
                  [{Math.round(detections[0].box.x1)}, {Math.round(detections[0].box.y1)}]
                  → [{Math.round(detections[0].box.x2)}, {Math.round(detections[0].box.y2)}]
                </span>
              </>
            )}
          </div>
        </section>

        {/* Right — Panel (40%) */}
        <aside className="lg:w-[40%] flex flex-col overflow-hidden">

          {/* Model selector */}
          <div className="p-4 border-b border-border">
            <ModelSelector current={model} onChange={setModel} />
          </div>

          {/* Detection count header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="font-mono text-[9px] text-fg-muted tracking-[0.2em] uppercase">
              detections
            </span>
            <span className="font-mono text-[10px] font-bold text-accent">
              {String(detections.length).padStart(2, '0')}
            </span>
          </div>

          {/* Scrollable detection list */}
          <div className="flex-1 overflow-y-auto">
            <DetectionPanel detections={detections} />
          </div>

          {/* Footer info */}
          <div className="px-4 py-3 border-t border-border bg-bg-2">
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[9px] text-fg-muted tracking-wider">
                powered by libreyolo · mit license
              </p>
              <p className="font-mono text-[9px] text-fg-muted/50">
                ws://localhost:8000/ws/stream
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
