'use client'

import type { Detection } from '@/types/detection'

interface DetectionPanelProps {
  detections: Detection[]
}

const CONF_COLOR = (conf: number) => {
  if (conf >= 0.85) return 'text-success'
  if (conf >= 0.6)  return 'text-warning'
  return 'text-fg-muted'
}

export default function DetectionPanel({ detections }: DetectionPanelProps) {
  if (detections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3">
        <div className="w-8 h-px bg-border" />
        <p className="font-mono text-[11px] text-fg-muted tracking-wider">no detections</p>
        <div className="w-8 h-px bg-border" />
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-[2px]">
      {detections.map((det, i) => {
        const { x1, y1, x2, y2 } = det.box
        const w = Math.round(x2 - x1)
        const h = Math.round(y2 - y1)

        return (
          <li
            key={`${det.class}-${i}`}
            className="group flex flex-col gap-[2px] px-3 py-2 bg-bg-2 border border-transparent hover:border-border transition-all duration-150 animate-fade-in"
          >
            {/* Class + confidence */}
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[12px] text-fg tracking-wide truncate">
                {det.class}
              </span>
              <span className={`font-mono text-[12px] font-bold shrink-0 ${CONF_COLOR(det.confidence)}`}>
                {det.confidence.toFixed(2)}
              </span>
            </div>

            {/* Box coordinates */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[9px] text-fg-muted tracking-wider">
                x1:{Math.round(x1)} y1:{Math.round(y1)}
              </span>
              <span className="font-mono text-[9px] text-fg-muted">·</span>
              <span className="font-mono text-[9px] text-fg-muted tracking-wider">
                x2:{Math.round(x2)} y2:{Math.round(y2)}
              </span>
            </div>

            {/* Size bar */}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-px bg-border relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-accent/40 transition-all duration-300"
                  style={{ width: `${Math.min(det.confidence * 100, 100)}%` }}
                />
              </div>
              <span className="font-mono text-[9px] text-fg-muted shrink-0">
                {w}×{h}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
