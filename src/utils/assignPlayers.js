/**
 * Asigna cada mano detectada a Jugador 1 (izquierda) o Jugador 2 (derecha).
 * Opción A: posición X del landmark de muñeca (índice 0).
 * Opción B (fallback): handedness de MediaPipe.
 * Con lock: mantiene la misma mano por jugador durante countdown/captura.
 */

function buildEntries(results, mirrored) {
  const hands = results.landmarks ?? []
  const handednesses = results.handednesses ?? []
  const gestures = results.gestures ?? []

  return hands.map((landmarks, i) => {
    let x = landmarks[0]?.x ?? 0.5
    if (mirrored) x = 1 - x

    return {
      index: i,
      x,
      handedness: handednesses[i]?.[0]?.categoryName ?? null,
      landmarks,
      gesture: gestures[i]?.[0] ?? null,
    }
  })
}

function assignByPosition(entries) {
  let player1 = null
  let player2 = null

  const byPosition = [...entries].sort((a, b) => a.x - b.x)

  if (byPosition.length >= 2) {
    player1 = byPosition[0]
    player2 = byPosition[byPosition.length - 1]
  } else if (byPosition.length === 1) {
    const hand = byPosition[0]
    if (hand.x < 0.5) player1 = hand
    else player2 = hand
  }

  if (!player1 || !player2) {
    for (const hand of entries) {
      if (!player1 && hand.handedness === 'Left') player1 = hand
      else if (!player2 && hand.handedness === 'Right') player2 = hand
    }
  }

  if (!player1 || !player2) {
    for (const hand of entries) {
      if (!player1 && hand.x < 0.5) player1 = hand
      else if (!player2 && hand.x >= 0.5) player2 = hand
    }
  }

  return { player1, player2 }
}

function assignWithLock(entries, lock) {
  const MAX_DIST = 0.35
  let player1 = null
  let player2 = null

  const assignToSlot = (hand, slot) => {
    if (slot === 1) player1 = hand
    else player2 = hand
  }

  for (const hand of entries) {
    const d1 = Math.abs(hand.x - lock.player1.x)
    const d2 = Math.abs(hand.x - lock.player2.x)

    if (d1 <= d2 && d1 < MAX_DIST) {
      if (!player1 || d1 < Math.abs(player1.x - lock.player1.x)) assignToSlot(hand, 1)
    } else if (d2 < MAX_DIST) {
      if (!player2 || d2 < Math.abs(player2.x - lock.player2.x)) assignToSlot(hand, 2)
    }
  }

  if (!player1 || !player2) {
    const fallback = assignByPosition(entries)
    if (!player1) player1 = fallback.player1
    if (!player2) player2 = fallback.player2
  }

  return { player1, player2 }
}

export function createPlayerLock(assignment) {
  if (!assignment?.player1 || !assignment?.player2) return null
  return {
    player1: { x: assignment.player1.x, handedness: assignment.player1.handedness },
    player2: { x: assignment.player2.x, handedness: assignment.player2.handedness },
  }
}

export function assignPlayers(results, { mirrored = true, lock = null } = {}) {
  const entries = buildEntries(results, mirrored)

  if (entries.length === 0) {
    return { player1: null, player2: null }
  }

  if (lock?.player1 && lock?.player2) {
    return assignWithLock(entries, lock)
  }

  return assignByPosition(entries)
}

export function bothHandsDetected(assignment) {
  return Boolean(assignment?.player1 && assignment?.player2)
}

/** Al menos una mano con landmarks válidos en el resultado crudo */
export function countRawHands(results) {
  return results?.landmarks?.length ?? 0
}
