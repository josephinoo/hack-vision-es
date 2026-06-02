'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

const FRAME_INTERVAL_MS = 200
const JPEG_QUALITY      = 0.8

interface UseCameraReturn {
  videoRef:   React.RefObject<HTMLVideoElement>
  isActive:   boolean
  hasError:   boolean
  start:      () => Promise<void>
  stop:       () => void
}

export function useCamera(
  onFrame: (blob: Blob) => void
): UseCameraReturn {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const canvasRef   = useRef<HTMLCanvasElement | null>(null)

  const [isActive, setIsActive] = useState(false)
  const [hasError, setHasError] = useState(false)

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || video.readyState < video.HAVE_CURRENT_DATA) return

    // Lazy-create an off-screen canvas once
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => { if (blob) onFrame(blob) },
      'image/jpeg',
      JPEG_QUALITY
    )
  }, [onFrame])

  const start = useCallback(async () => {
    setHasError(false)

    // Try rear camera first (mobile), fall back to front
    const constraints: MediaStreamConstraints[] = [
      { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: 'user',        width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: true },
    ]

    let stream: MediaStream | null = null
    for (const c of constraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(c)
        break
      } catch { /* try next */ }
    }

    if (!stream) {
      setHasError(true)
      return
    }

    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }

    setIsActive(true)

    // Start frame capture loop
    intervalRef.current = setInterval(captureFrame, FRAME_INTERVAL_MS)
  }, [captureFrame])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => { stop() }
  }, [stop])

  return { videoRef, isActive, hasError, start, stop }
}
