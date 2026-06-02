'use client'

import type { WSStatus, ModelKey } from '@/types/detection'

interface StatusBarProps {
  status:      WSStatus
  count:       number
  model:       ModelKey
  isDemo:      boolean
  onReconnect: () => void
}

const STATUS_LABELS: Record<WSStatus, string> = {
  connecting:    'connecting…',
  connected:     'live · running',
  disconnected:  'disconnected',
  error:         'connection error',
  demo:          'demo mode',
}

const STATUS_DOT: Record<WSStatus, string> = {
  connecting:    'bg-warning animate-blink',
  connected:     'bg-success animate-pulse-dot',
  disconnected:  'bg-fg-muted',
  error:         'bg-red-500',
  demo:          'bg-warning animate-pulse-dot',
}

export default function StatusBar({
  status, count, model, isDemo, onReconnect,
}: StatusBarProps) {
  const effectiveStatus = isDemo ? 'demo' : status

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-2">
      {/* Left: status indicator */}
      <div className="flex items-center gap-2">
        <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${STATUS_DOT[effectiveStatus]}`} />
        <span className="font-mono text-[10px] text-fg-muted tracking-[0.15em] uppercase">
          ● {STATUS_LABELS[effectiveStatus]}
        </span>
      </div>

      {/* Center: object count */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-fg-muted">
          <span className="text-accent font-bold">{String(count).padStart(2, '0')}</span>
          {' '}objects
        </span>
        <span className="text-border">·</span>
        <span className="font-mono text-[10px] text-fg-muted truncate max-w-[140px]">
          {model}
        </span>
      </div>

      {/* Right: reconnect */}
      {(status === 'error' || status === 'disconnected') && !isDemo && (
        <button
          onClick={onReconnect}
          className="font-mono text-[9px] text-accent hover:text-accent-2 tracking-wider uppercase transition-colors px-2 py-1 border border-accent/20 hover:border-accent/50"
        >
          reconnect
        </button>
      )}
    </div>
  )
}
