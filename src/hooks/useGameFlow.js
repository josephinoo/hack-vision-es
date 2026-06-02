import { useCallback, useEffect, useRef, useState } from 'react'
import { bothHandsDetected, createPlayerLock } from '../utils/assignPlayers'
import { determineWinner } from '../utils/gameLogic'

export const PHASE = {
  WAITING: 'waiting',
  COUNTDOWN: 'countdown',
  CAPTURE: 'capture',
  RESULT: 'result',
}

const COUNTDOWN_SECONDS = 3
const COUNTDOWN_GRACE_MS = 1500
const WAIT_STABLE_MS = 400

export function useGameFlow({
  detection,
  recognizeBurst,
  onCaptureFrame,
  playerLockRef,
  resetStability,
  paused = false,
}) {
  const [phase, setPhase] = useState(PHASE.WAITING)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [countdownLabel, setCountdownLabel] = useState('')
  const [roundResult, setRoundResult] = useState(null)
  const [scores, setScores] = useState({ player1: 0, player2: 0 })
  const countdownTimerRef = useRef(null)
  const handsLostSinceRef = useRef(null)
  const stableSinceRef = useRef(null)
  const captureDoneRef = useRef(false)

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }, [])

  const clearPlayerLock = useCallback(() => {
    if (playerLockRef) playerLockRef.current = null
  }, [playerLockRef])

  const startCountdown = useCallback((assignment) => {
    clearCountdownTimer()
    handsLostSinceRef.current = null
    if (playerLockRef) {
      playerLockRef.current = createPlayerLock(assignment)
    }
    setPhase(PHASE.COUNTDOWN)
    setCountdown(COUNTDOWN_SECONDS)
    setCountdownLabel(String(COUNTDOWN_SECONDS))

    let remaining = COUNTDOWN_SECONDS
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1
      if (remaining > 0) {
        setCountdown(remaining)
        setCountdownLabel(String(remaining))
      } else {
        clearCountdownTimer()
        setCountdown(0)
        setCountdownLabel('¡YA!')
        setPhase(PHASE.CAPTURE)
      }
    }, 1000)
  }, [clearCountdownTimer, playerLockRef])

  useEffect(() => {
    if (paused || phase !== PHASE.WAITING) return

    if (detection.handsStable) {
      if (!stableSinceRef.current) stableSinceRef.current = Date.now()
      if (Date.now() - stableSinceRef.current >= WAIT_STABLE_MS) {
        startCountdown(detection.assignment)
      }
    } else {
      stableSinceRef.current = null
    }
  }, [paused, phase, detection.handsStable, detection.assignment, startCountdown])

  useEffect(() => {
    if (paused || phase !== PHASE.COUNTDOWN) return

    const handsOk =
      detection.bothHandsNow ||
      detection.handsStable ||
      bothHandsDetected(detection.assignment)

    if (handsOk) {
      handsLostSinceRef.current = null
      return
    }

    if (!handsLostSinceRef.current) {
      handsLostSinceRef.current = Date.now()
      return
    }

    if (Date.now() - handsLostSinceRef.current < COUNTDOWN_GRACE_MS) return

    clearCountdownTimer()
    clearPlayerLock()
    resetStability?.()
    stableSinceRef.current = null
    setPhase(PHASE.WAITING)
    setCountdown(COUNTDOWN_SECONDS)
    setCountdownLabel('')
  }, [
    paused,
    phase,
    detection.bothHandsNow,
    detection.handsStable,
    detection.assignment,
    clearCountdownTimer,
    clearPlayerLock,
    resetStability,
  ])

  useEffect(() => {
    if (paused || phase !== PHASE.CAPTURE) {
      captureDoneRef.current = false
      return
    }
    if (captureDoneRef.current) return
    captureDoneRef.current = true

    let cancelled = false

    async function capture() {
      const snapshot = await recognizeBurst(14)
      if (cancelled) return

      onCaptureFrame?.()

      const g1 = snapshot?.player1?.gesture ?? null
      const g2 = snapshot?.player2?.gesture ?? null
      const winner = determineWinner(g1, g2)

      setRoundResult({
        player1: snapshot?.player1 ?? null,
        player2: snapshot?.player2 ?? null,
        gestures: { player1: g1, player2: g2 },
        winner,
      })

      if (winner === 'player1') {
        setScores((s) => ({ ...s, player1: s.player1 + 1 }))
      } else if (winner === 'player2') {
        setScores((s) => ({ ...s, player2: s.player2 + 1 }))
      }

      clearPlayerLock()
      setPhase(PHASE.RESULT)
    }

    capture()
    return () => {
      cancelled = true
    }
  }, [paused, phase, recognizeBurst, onCaptureFrame, clearPlayerLock])

  const newRound = useCallback(() => {
    clearCountdownTimer()
    clearPlayerLock()
    resetStability?.()
    stableSinceRef.current = null
    handsLostSinceRef.current = null
    setPhase(PHASE.WAITING)
    setCountdown(COUNTDOWN_SECONDS)
    setCountdownLabel('')
    setRoundResult(null)
  }, [clearCountdownTimer, clearPlayerLock, resetStability])

  const resetScores = useCallback(() => {
    setScores({ player1: 0, player2: 0 })
  }, [])

  const awardPenaltyWinner = useCallback((winner) => {
    if (winner === 'player1') {
      setScores((s) => ({ ...s, player1: s.player1 + 1 }))
    } else if (winner === 'player2') {
      setScores((s) => ({ ...s, player2: s.player2 + 1 }))
    }
  }, [])

  useEffect(() => () => clearCountdownTimer(), [clearCountdownTimer])

  return {
    phase,
    countdown,
    countdownLabel,
    roundResult,
    scores,
    newRound,
    resetScores,
    awardPenaltyWinner,
  }
}
