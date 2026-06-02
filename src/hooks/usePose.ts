import { useCallback, useEffect, useRef, useState } from 'react'
import { PoseDetector, type PoseDetection } from '../utils/poseDetector'

const EMPTY_DETECTION: PoseDetection = {
  player1: null,
  player2: null,
  poses: [],
  raw: null,
  timestamp: 0,
}

export function usePose(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  { enabled = true } = {},
) {
  const detectorRef = useRef<PoseDetector | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detection, setDetection] = useState<PoseDetection>(EMPTY_DETECTION)

  useEffect(() => {
    let cancelled = false

    new PoseDetector()
      .init()
      .then((detector) => {
        if (cancelled) return
        detectorRef.current = detector
        setReady(true)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })

    return () => {
      cancelled = true
    }
  }, [])

  const loop = useCallback(() => {
    const video = videoRef.current
    const detector = detectorRef.current

    if (!enabled || !video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime
      try {
        setDetection(detector.detect(video, performance.now()))
      } catch {
        /* Skip a transient MediaPipe frame failure. */
      }
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [enabled, videoRef])

  useEffect(() => {
    if (!ready || !enabled) return
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [ready, enabled, loop])

  return { ready, error, detection }
}
