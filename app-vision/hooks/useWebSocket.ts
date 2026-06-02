'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Detection, WSStatus } from '@/types/detection'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000/ws/stream'
const INITIAL_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 30000
const MAX_RETRIES = 5
// Code 1013 = server closed intentionally (e.g. model unavailable) — don't retry
const NO_RETRY_CODES = new Set([1013])

interface UseWebSocketReturn {
  detections: Detection[]
  status: WSStatus
  send: (data: ArrayBuffer | Blob) => void
  reconnect: () => void
}

export function useWebSocket(model: string = 'detect'): UseWebSocketReturn {
  const wsRef       = useRef<WebSocket | null>(null)
  const retryCount  = useRef(0)
  const backoffRef  = useRef(INITIAL_BACKOFF_MS)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmounting  = useRef(false)

  const [detections, setDetections] = useState<Detection[]>([])
  const [status, setStatus]         = useState<WSStatus>('connecting')

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const connect = useCallback(() => {
    if (unmounting.current) return
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
      wsRef.current.close()
    }

    setStatus('connecting')

    let ws: WebSocket
    try {
      const url = new URL(WS_URL)
      url.searchParams.set('model', model)
      ws = new WebSocket(url.toString())
    } catch {
      setStatus('error')
      scheduleRetry()
      return
    }

    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      retryCount.current = 0
      backoffRef.current = INITIAL_BACKOFF_MS
      setStatus('connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string)
        if (data.error) return
        setDetections(data.detections ?? [])
      } catch { /* ignore malformed */ }
    }

    ws.onerror = () => {
      setStatus('error')
    }

    ws.onclose = (event) => {
      if (unmounting.current) return
      setDetections([])
      // Don't retry if server intentionally closed (model unavailable etc.)
      if (NO_RETRY_CODES.has(event.code)) {
        setStatus('error')
        return
      }
      if (retryCount.current >= MAX_RETRIES) {
        setStatus('error')
        return
      }
      setStatus('disconnected')
      scheduleRetry()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model])

  const scheduleRetry = useCallback(() => {
    clearTimer()
    const delay = backoffRef.current
    backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS)
    retryCount.current++
    timerRef.current = setTimeout(connect, delay)
  }, [connect])

  const reconnect = useCallback(() => {
    retryCount.current = 0
    backoffRef.current = INITIAL_BACKOFF_MS
    clearTimer()
    connect()
  }, [connect])

  const send = useCallback((data: ArrayBuffer | Blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data)
    }
  }, [])

  useEffect(() => {
    unmounting.current = false
    connect()
    return () => {
      unmounting.current = true
      clearTimer()
      wsRef.current?.close()
    }
  }, [connect])

  return { detections, status, send, reconnect }
}
