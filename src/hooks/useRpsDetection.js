/* eslint-disable react-hooks/preserve-manual-memoization */
import { useCallback, useEffect, useRef, useState } from 'react'
import { assignPlayers, bothHandsDetected } from '../utils/assignPlayers'
import { parseGesture } from '../utils/gameLogic'
import { createHandStabilityTracker } from '../utils/handStability'
import { mergeCaptureSamples } from '../utils/captureGestures'
import { getRpsPipeline } from '../utils/visionPipeline'

const MIN_SCORE = 0.8
const PREVIEW_MIN_SCORE = 0.55

function processRpsFrame(gestureResults, lock) {
  const assignment = assignPlayers(gestureResults, { mirrored: true, lock })
  const minScore = lock ? PREVIEW_MIN_SCORE : MIN_SCORE

  const toPlayerData = (hand) => {
    if (!hand) return null
    const gesture = hand.gesture
    return {
      landmarks: hand.landmarks,
      gesture: parseGesture(gesture, minScore),
      gestureRaw: gesture,
      score: gesture?.score ?? 0,
      handedness: hand.handedness,
    }
  }

  return {
    player1: toPlayerData(assignment.player1),
    player2: toPlayerData(assignment.player2),
    assignment,
    raw: gestureResults,
    holistic: null,
  }
}

/** Detección RPS: únicamente GestureRecognizer + .task */
export function useRpsDetection(
  videoRef,
  { enabled = true, active = true, playerLockRef = null } = {},
) {
  const pipelineRef = useRef(null)
  const rafRef = useRef(null)
  const lastVideoTimeRef = useRef(-1)
  const stabilityTrackerRef = useRef(createHandStabilityTracker(18, 0.5))
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [detection, setDetection] = useState({
    player1: null,
    player2: null,
    assignment: { player1: null, player2: null },
    raw: null,
    holistic: null,
    bothHandsNow: false,
    handsStable: false,
    stabilityRatio: 0,
  })

  useEffect(() => {
    let cancelled = false

    getRpsPipeline()
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

  const runRecognition = useCallback(() => {
    const video = videoRef.current
    const pipeline = pipelineRef.current
    if (!video || !pipeline || video.readyState < 2) return null

    const lock = playerLockRef?.current ?? null
    const gestureResults = pipeline.gestureRecognizer.recognizeForVideo(
      video,
      performance.now(),
    )
    return processRpsFrame(gestureResults, lock)
  }, [videoRef, playerLockRef])

  useEffect(() => {
    if (!ready || !enabled || !active) return

    const detectLoop = () => {
      const video = videoRef.current
      const pipeline = pipelineRef.current

      if (!enabled || !active || !video || !pipeline || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detectLoop)
        return
      }

      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime
        try {
          const processed = runRecognition()
          if (!processed) {
            rafRef.current = requestAnimationFrame(detectLoop)
            return
          }

          const bothNow = bothHandsDetected(processed.assignment)
          const tracker = stabilityTrackerRef.current
          tracker.push(bothNow)

          setDetection({
            ...processed,
            bothHandsNow: bothNow,
            handsStable: tracker.isStable(),
            stabilityRatio: tracker.recentRatio(),
          })
        } catch {
          /* frame skip */
        }
      }

      rafRef.current = requestAnimationFrame(detectLoop)
    }

    rafRef.current = requestAnimationFrame(detectLoop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [ready, enabled, active, runRecognition, videoRef])

  const resetStability = useCallback(() => {
    stabilityTrackerRef.current.reset()
  }, [])

  const recognizeBurst = useCallback(
    async (sampleCount = 12) => {
      const samples = []
      for (let i = 0; i < sampleCount; i++) {
        const snap = runRecognition()
        if (snap) samples.push(snap)
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }
      const merged = mergeCaptureSamples(samples)
      return {
        ...merged,
        assignment: {
          player1: merged.player1
            ? { landmarks: merged.player1.landmarks, gesture: merged.player1.gestureRaw }
            : null,
          player2: merged.player2
            ? { landmarks: merged.player2.landmarks, gesture: merged.player2.gestureRaw }
            : null,
        },
        samples,
      }
    },
    [runRecognition],
  )

  return {
    ready,
    error,
    detection,
    recognizeBurst,
    resetStability,
  }
}
