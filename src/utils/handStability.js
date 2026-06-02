/**
 * Suavizado temporal: evita parpadeos cuando MediaPipe pierde una mano 1–2 frames.
 */
export function createHandStabilityTracker(windowSize = 18, minRatio = 0.55) {
  const buffer = []

  return {
    push(bothDetected) {
      buffer.push(Boolean(bothDetected))
      if (buffer.length > windowSize) buffer.shift()
    },
    reset() {
      buffer.length = 0
    },
    isStable() {
      if (buffer.length < Math.max(6, Math.floor(windowSize * 0.4))) return false
      const hits = buffer.filter(Boolean).length
      return hits / buffer.length >= minRatio
    },
    recentRatio() {
      if (buffer.length === 0) return 0
      return buffer.filter(Boolean).length / buffer.length
    },
  }
}
