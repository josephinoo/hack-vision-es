/** Puntos de agarre: muñeca + yemas (mejor para coger billetes) */
const GRAB_INDICES = [0, 4, 8, 12, 16, 20]

export function getGrabPoints(landmarks, mirrored = true) {
  if (!landmarks?.length) return []
  const points = []
  for (const i of GRAB_INDICES) {
    const p = landmarks[i]
    if (!p) continue
    let x = p.x
    if (mirrored) x = 1 - x
    points.push({ x, y: p.y })
  }
  return points
}

export function getGrabPoint(landmarks, mirrored = true) {
  const points = getGrabPoints(landmarks, mirrored)
  if (points.length === 0) return null
  const x = points.reduce((s, p) => s + p.x, 0) / points.length
  const y = points.reduce((s, p) => s + p.y, 0) / points.length
  return { x, y }
}

export function distanceNorm(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/**
 * Puntos de agarre por jugador para la penitencia (solo billetes).
 * Usa asignación + fallback por posición en pantalla desde Holistic.
 */
export function getPenaltyGrabbers(detection) {
  const grabbers = { player1: [], player2: [] }

  const addPlayer = (player, landmarks) => {
    if (!landmarks) return
    grabbers[player].push(...getGrabPoints(landmarks, true))
  }

  addPlayer('player1', detection?.player1?.landmarks)
  addPlayer('player2', detection?.player2?.landmarks)

  const hol = detection?.holistic
  const extraHands = [
    hol?.leftHandLandmarks,
    hol?.rightHandLandmarks,
  ].filter(Boolean)

  for (const landmarks of extraHands) {
    const wrist = landmarks[0]
    if (!wrist) continue
    let x = 1 - wrist.x
    const player = x < 0.5 ? 'player1' : 'player2'
    const pts = getGrabPoints(landmarks, true)
    if (grabbers[player].length < pts.length) {
      grabbers[player] = pts
    }
  }

  return grabbers
}

export function tryGrabBill(grabbers, bill, radius) {
  const hit = (points) => points.some((p) => distanceNorm(p, bill) < radius)

  const p1 = hit(grabbers.player1)
  const p2 = hit(grabbers.player2)

  if (p1 && !p2) return 'player1'
  if (p2 && !p1) return 'player2'
  if (p1 && p2) {
    const d1 = Math.min(...grabbers.player1.map((p) => distanceNorm(p, bill)))
    const d2 = Math.min(...grabbers.player2.map((p) => distanceNorm(p, bill)))
    return d1 <= d2 ? 'player1' : 'player2'
  }
  return null
}
