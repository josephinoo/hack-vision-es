import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FilesetResolver,
  GestureRecognizer,
} from '@mediapipe/tasks-vision'
import { assignPlayers, bothHandsDetected } from '../utils/assignPlayers'
import { parseGesture } from '../utils/gameLogic'
import { loadTaskModel } from '../utils/loadTaskModel'
import { createHandStabilityTracker } from '../utils/handStability'
import { mergeCaptureSamples } from '../utils/captureGestures'

const RPS_TASK_URL = '/models/rock_paper_scissors.task'
const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MIN_SCORE = 0.8
const PREVIEW_MIN_SCORE = 0.55

export function useGestureRecognizer(
  videoRef,
  { enabled = true, active = true, playerLockRef = null } = {},
) {
  const recognizerRef = useRef(null)
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
    bothHandsNow: false,
    handsStable: false,
    stabilityRatio: 0,
  })

  const processResults = useCallback(
    (results) => {
      const lock = playerLockRef?.current ?? null
      const assignment = assignPlayers(results, { mirrored: true, lock })
      const minScore = lock ? PREVIEW_MIN_SCORE : MIN_SCORE

      const toPlayerData = (hand) => {
        if (!hand) return null
        const gesture = parseGesture(hand.gesture, minScore)
        return {
          landmarks: hand.landmarks,
          gesture,
          gestureRaw: hand.gesture,
          score: hand.gesture?.score ?? 0,
          handedness: hand.handedness,
        }
      }

      return {
        player1: toPlayerData(assignment.player1),
        player2: toPlayerData(assignment.player2),
        assignment,
        raw: results,
      }
    },
    [playerLockRef],
  )

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const [vision, modelAssetBuffer] = await Promise.all([
          FilesetResolver.forVisionTasks(WASM_CDN),
          loadTaskModel(RPS_TASK_URL),
        ])

        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetBuffer,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        if (!cancelled) {
          recognizerRef.current = recognizer
          setReady(true)
        } else {
          recognizer.close()
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      }
    }

    init()
    return () => {
      cancelled = true
      recognizerRef.current?.close()
      recognizerRef.current = null
    }
  }, [])

  const runRecognition = useCallback(() => {
    const video = videoRef.current
    const recognizer = recognizerRef.current
    if (!video || !recognizer || video.readyState < 2) return null
    const results = recognizer.recognizeForVideo(video, performance.now())
    return processResults(results)
  }, [videoRef, processResults])

  const detectLoop = useCallback(() => {
    const video = videoRef.current
    const recognizer = recognizerRef.current

    if (!enabled || !active || !video || !recognizer || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop)
      return
    }

    const now = performance.now()
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime
      try {
        const processed = runRecognition()
        if (!processed) return

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
  }, [videoRef, enabled, active, runRecognition])

  useEffect(() => {
    if (!ready || !enabled) return
    rafRef.current = requestAnimationFrame(detectLoop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [ready, enabled, detectLoop])

  const resetStability = useCallback(() => {
    stabilityTrackerRef.current.reset()
  }, [])

  const recognizeOnce = useCallback(() => {
    return runRecognition()
  }, [runRecognition])

  /** Varias muestras en frames consecutivos para captura más fiable en "¡YA!" */
  const recognizeBurst = useCallback(async (sampleCount = 12) => {
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
  }, [runRecognition])

  return {
    ready,
    error,
    detection,
    recognizeOnce,
    recognizeBurst,
    resetStability,
    recognizerRef,
  }
}
