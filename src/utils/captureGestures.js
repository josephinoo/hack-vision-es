import { parseGesture, normalizeGesture } from './gameLogic'

const CAPTURE_MIN_SCORE = 0.8
const CAPTURE_FALLBACK_SCORE = 0.55

function bestGestureFromCandidates(candidates) {
  let best = null
  for (const c of candidates) {
    const raw = c?.gestureRaw
    if (!raw) continue
    const score = raw.score ?? 0
    const name = normalizeGesture(raw.categoryName)
    if (!name) continue
    if (!best || score > best.score) {
      best = { gesture: name, score, gestureRaw: raw, landmarks: c.landmarks }
    }
  }
  if (!best) return null
  if (best.score >= CAPTURE_MIN_SCORE) return best
  if (best.score >= CAPTURE_FALLBACK_SCORE) return best
  return null
}

/**
 * Combina varias muestras de captura y elige el gesto con mayor score por jugador.
 */
export function mergeCaptureSamples(samples) {
  const p1Candidates = []
  const p2Candidates = []

  for (const s of samples) {
    if (s?.player1) p1Candidates.push(s.player1)
    if (s?.player2) p2Candidates.push(s.player2)
  }

  const pick = (candidates) => {
    const best = bestGestureFromCandidates(candidates)
    if (!best) {
      const last = candidates[candidates.length - 1]
      return last
        ? {
            landmarks: last.landmarks,
            gesture: parseGesture(last.gestureRaw, CAPTURE_FALLBACK_SCORE),
            gestureRaw: last.gestureRaw,
            score: last.score ?? 0,
          }
        : null
    }
    return {
      landmarks: best.landmarks,
      gesture: best.gesture,
      gestureRaw: best.gestureRaw,
      score: best.score,
    }
  }

  return {
    player1: pick(p1Candidates),
    player2: pick(p2Candidates),
  }
}
