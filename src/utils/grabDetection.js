/** Puntos de agarre: muñeca + yemas (mejor para coger billetes) */
const GRAB_INDICES = [0, 4, 8, 12, 16, 20]

/** MediaPipe Hand: punta del dedo índice */
const INDEX_FINGER_TIP = 8

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

export function getPointerFingerTip(landmarks, mirrored = true) {
  const p = landmarks?.[INDEX_FINGER_TIP]
  if (!p) return null
  let x = p.x
  if (mirrored) x = 1 - x
  return { x, y: p.y }
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

function assignHolisticHandToPlayer(wristXMirrored) {
  return wristXMirrored < 0.5 ? 'player1' : 'player2'
}

/**
 * Solo punta del índice por jugador (colisión “tocar” con el dedo).
 */
export function getPointerGrabbers(detection) {
  const grabbers = { player1: [], player2: [] }

  const addTip = (player, landmarks) => {
    const tip = getPointerFingerTip(landmarks, true)
    if (tip) grabbers[player].push(tip)
  }

  addTip('player1', detection?.player1?.landmarks)
  addTip('player2', detection?.player2?.landmarks)

  const hol = detection?.holistic
  for (const landmarks of [hol?.leftHandLandmarks, hol?.rightHandLandmarks].filter(Boolean)) {
    const wrist = landmarks[0]
    if (!wrist) continue
    const player = assignHolisticHandToPlayer(1 - wrist.x)
    const tip = getPointerFingerTip(landmarks, true)
    if (tip && grabbers[player].length === 0) {
      grabbers[player].push(tip)
    }
  }

  return grabbers
}

/**
 * Puntos de agarre por jugador (mano completa).
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
  for (const landmarks of [hol?.leftHandLandmarks, hol?.rightHandLandmarks].filter(Boolean)) {
    const wrist = landmarks[0]
    if (!wrist) continue
    const player = assignHolisticHandToPlayer(1 - wrist.x)
    const pts = getGrabPoints(landmarks, true)
    if (grabbers[player].length < pts.length) {
      grabbers[player] = pts
    }
  }

  return grabbers
}

/** Colisión punto ↔ centro del ítem (coords normalizadas). */
export function tryGrabItem(grabbers, item, radius) {
  const hit = (points) =>
    points.length > 0 && points.some((p) => distanceNorm(p, item) < radius)

  const p1 = hit(grabbers.player1)
  const p2 = hit(grabbers.player2)

  if (p1 && !p2) return 'player1'
  if (p2 && !p1) return 'player2'
  if (p1 && p2) {
    const d1 = Math.min(...grabbers.player1.map((p) => distanceNorm(p, item)))
    const d2 = Math.min(...grabbers.player2.map((p) => distanceNorm(p, item)))
    return d1 <= d2 ? 'player1' : 'player2'
  }
  return null
}

/** @deprecated use tryGrabItem */
export const tryGrabBill = tryGrabItem
