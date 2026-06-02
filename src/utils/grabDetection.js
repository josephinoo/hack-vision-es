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

/**
 * Asigna manos a J1 (izq.) / J2 (der.) por posición X en pantalla (coords espejadas).
 * @param {Array<{ tip: { x: number, y: number }, landmarks?: unknown[] }>} hands
 */
function assignHandsByScreenX(hands) {
  const grabbers = { player1: [], player2: [] }
  if (hands.length === 0) return grabbers

  const sorted = [...hands].sort((a, b) => a.tip.x - b.tip.x)

  if (sorted.length >= 2) {
    grabbers.player1.push(sorted[0].tip)
    grabbers.player2.push(sorted[sorted.length - 1].tip)
  } else {
    const slot = sorted[0].tip.x < 0.5 ? 'player1' : 'player2'
    grabbers[slot].push(sorted[0].tip)
  }

  return grabbers
}

function collectHolisticHandTips(holistic) {
  const hands = []
  for (const landmarks of [
    holistic?.leftHandLandmarks,
    holistic?.rightHandLandmarks,
  ].filter(Boolean)) {
    const tip = getPointerFingerTip(landmarks, true)
    if (tip) hands.push({ tip, landmarks })
  }
  return hands
}

/**
 * Solo punta del índice — prioriza Holistic y posición en pantalla (no etiqueta Left/Right).
 */
export function getPointerGrabbers(detection) {
  const hol = detection?.holistic
  const fromHolistic = collectHolisticHandTips(hol)

  if (fromHolistic.length > 0) {
    return assignHandsByScreenX(fromHolistic)
  }

  const fallback = []
  const t1 = getPointerFingerTip(detection?.player1?.landmarks, true)
  const t2 = getPointerFingerTip(detection?.player2?.landmarks, true)
  if (t1) fallback.push({ tip: t1 })
  if (t2) fallback.push({ tip: t2 })

  return assignHandsByScreenX(fallback)
}

/**
 * Puntos de agarre por jugador (mano completa).
 */
export function getPenaltyGrabbers(detection) {
  const hol = detection?.holistic
  const holHands = collectHolisticHandTips(hol)

  if (holHands.length > 0) {
    const withPoints = holHands.map((h) => ({
      tip: h.tip,
      points: getGrabPoints(h.landmarks, true),
    }))
    const sorted = [...withPoints].sort((a, b) => a.tip.x - b.tip.x)
    const grabbers = { player1: [], player2: [] }

    if (sorted.length >= 2) {
      grabbers.player1.push(...sorted[0].points)
      grabbers.player2.push(...sorted[sorted.length - 1].points)
    } else {
      const slot = sorted[0].tip.x < 0.5 ? 'player1' : 'player2'
      grabbers[slot].push(...sorted[0].points)
    }
    return grabbers
  }

  const grabbers = { player1: [], player2: [] }
  const addPlayer = (player, landmarks) => {
    if (!landmarks) return
    grabbers[player].push(...getGrabPoints(landmarks, true))
  }
  addPlayer('player1', detection?.player1?.landmarks)
  addPlayer('player2', detection?.player2?.landmarks)
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
