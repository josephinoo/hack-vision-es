import { useCallback, useEffect, useRef, useState } from 'react'
import { getPenaltyGrabbers, tryGrabBill } from '../utils/grabDetection'

const DURATION_MS = 18_000
const BILL_SIZE = 72
const GRAB_RADIUS = 0.18
const MAX_BILLS = 16

let billId = 0

function spawnBill() {
  return {
    id: ++billId,
    x: 0.1 + Math.random() * 0.8,
    y: -0.06,
    speed: 0.32 + Math.random() * 0.22,
    grabbedBy: null,
    pop: false,
  }
}

export function usePenaltyGame({ active, detection, onFinish }) {
  const [timeLeft, setTimeLeft] = useState(DURATION_MS / 1000)
  const [scores, setScores] = useState({ player1: 0, player2: 0 })
  const [bills, setBills] = useState([])
  const [status, setStatus] = useState('intro')
  const billsRef = useRef([])
  const scoresRef = useRef({ player1: 0, player2: 0 })
  const lastSpawnRef = useRef(0)
  const rafRef = useRef(null)
  const finishedRef = useRef(false)
  const detectionRef = useRef(detection)

  detectionRef.current = detection

  const reset = useCallback(() => {
    billsRef.current = []
    scoresRef.current = { player1: 0, player2: 0 }
    setBills([])
    setScores({ player1: 0, player2: 0 })
    setTimeLeft(DURATION_MS / 1000)
    setStatus('intro')
    finishedRef.current = false
    lastSpawnRef.current = 0
  }, [])

  useEffect(() => {
    if (!active) {
      reset()
      return
    }
    const t = setTimeout(() => setStatus('playing'), 1800)
    return () => clearTimeout(t)
  }, [active, reset])

  useEffect(() => {
    if (!active || status !== 'playing') return

    const endAt = Date.now() + DURATION_MS

    const tick = () => {
      const now = Date.now()
      const remaining = Math.max(0, endAt - now)
      setTimeLeft(Math.ceil(remaining / 1000))

      const elapsed = DURATION_MS - remaining
      const spawnEvery = Math.max(180, 550 - elapsed / 30)

      if (now - lastSpawnRef.current > spawnEvery) {
        lastSpawnRef.current = now
        if (billsRef.current.filter((b) => !b.grabbedBy).length < MAX_BILLS) {
          billsRef.current = [...billsRef.current, spawnBill()]
        }
      }

      const grabbers = getPenaltyGrabbers(detectionRef.current)

      billsRef.current = billsRef.current
        .map((bill) => {
          if (bill.grabbedBy) return bill
          const next = { ...bill, y: bill.y + bill.speed * 0.016 }

          const who = tryGrabBill(grabbers, next, GRAB_RADIUS)
          if (who === 'player1') {
            scoresRef.current.player1 += 1
            return { ...next, grabbedBy: 'player1', pop: true }
          }
          if (who === 'player2') {
            scoresRef.current.player2 += 1
            return { ...next, grabbedBy: 'player2', pop: true }
          }
          return next
        })
        .filter((b) => b.grabbedBy || b.y < 1.12)

      setScores({ ...scoresRef.current })
      setBills([...billsRef.current])

      if (remaining <= 0 && !finishedRef.current) {
        finishedRef.current = true
        setStatus('finished')
        const final = { ...scoresRef.current }
        let winner = 'tie'
        if (final.player1 > final.player2) winner = 'player1'
        else if (final.player2 > final.player1) winner = 'player2'
        onFinish?.({ scores: final, winner })
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active, status, onFinish])

  return { timeLeft, scores, bills, status, billSize: BILL_SIZE, reset }
}
