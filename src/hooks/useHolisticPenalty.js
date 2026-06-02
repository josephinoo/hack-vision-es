import { useCallback, useEffect, useRef, useState } from 'react'
import { assignPlayers } from '../utils/assignPlayers'
import {
  holisticResultToHandFormat,
  holisticResultToVisual,
} from '../utils/landmarksAdapter'
import { getHolisticPipeline } from '../utils/visionPipeline'

function processHolisticFrame(holisticResult, lock) {
  const holisticHands = holisticResultToHandFormat(holisticResult)
  const assignment = assignPlayers(holisticHands, { mirrored: true, lock })

  const toPlayer = (hand) =>
    hand
      ? {
          landmarks: hand.landmarks,
          gesture: null,
          gestureRaw: null,
          score: 0,
          handedness: hand.handedness,
        }
      : null

  return {
    player1: toPlayer(assignment.player1),
    player2: toPlayer(assignment.player2),
    assignment,
    raw: null,
    holistic: holisticResultToVisual(holisticResult),
    bothHandsNow: Boolean(assignment.player1 && assignment.player2),
    handsStable: false,
    stabilityRatio: 0,
  }
}

/** Penitencia: solo HolisticLandmarker de MediaPipe (sin .task RPS) */
export function useHolisticPenalty(
  videoRef,
  { enabled = false, playerLockRef = null } = {},
) {
  const pipelineRef = useRef(null)
  const rafRef = useRef(null)
  const lastVideoTimeRef = useRef(-1)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [detection, setDetection] = useState({
    player1: null,
    player2: null,
    assignment: { player1: null, player2: null },
    holistic: null,
    bothHandsNow: false,
  })

  useEffect(() => {
    let cancelled = false

    getHolisticPipeline()
      .then((pipeline) => {
        if (!cancelled) {
          pipelineRef.current = pipeline
          setReady(true)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const detectLoop = useCallback(() => {
    const video = videoRef.current
    const pipeline = pipelineRef.current

    if (!enabled || !video || !pipeline || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop)
      return
    }

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime
      try {
        const holisticResult = pipeline.holisticLandmarker.detectForVideo(
          video,
          performance.now(),
        )
        const lock = playerLockRef?.current ?? null
        const processed = processHolisticFrame(holisticResult, lock)
        setDetection(processed)
      } catch {
        /* frame skip */
      }
    }

    rafRef.current = requestAnimationFrame(detectLoop)
  }, [videoRef, enabled, playerLockRef])

  useEffect(() => {
    if (!ready || !enabled) return
    rafRef.current = requestAnimationFrame(detectLoop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [ready, enabled, detectLoop])

  return { ready, error, detection }
}
