'use client'

import type { ModelKey } from '@/types/detection'

const MODELS: { key: ModelKey; label: string; sub: string }[] = [
  { key: 'detect',  label: 'detect',  sub: 'LibreYOLO9t' },
  { key: 'segment', label: 'segment', sub: 'LibreRFDETRs' },
  { key: 'pose',    label: 'pose',    sub: 'LibreYOLONASs' },
]

interface ModelSelectorProps {
  current:  ModelKey
  onChange: (m: ModelKey) => void
}

export default function ModelSelector({ current, onChange }: ModelSelectorProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-mono text-[9px] text-fg-muted tracking-[0.2em] uppercase mb-1 px-1">
        model
      </p>
      <div className="flex gap-1">
        {MODELS.map(({ key, label, sub }) => {
          const active = current === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={[
                'flex-1 flex flex-col items-center gap-[2px] px-2 py-2 border transition-all duration-150',
                active
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-bg-2 text-fg-muted hover:border-border/80 hover:text-fg',
              ].join(' ')}
            >
              <span className="font-mono text-[10px] tracking-wider uppercase">{label}</span>
              <span className={`font-mono text-[8px] tracking-wide ${active ? 'text-accent/70' : 'text-fg-muted/60'}`}>
                {sub}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
