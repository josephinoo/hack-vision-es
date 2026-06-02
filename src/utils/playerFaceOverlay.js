/** @typedef {'neutral' | 'focused' | 'happy' | 'sad' | 'shocked' | 'hype'} PlayerExpression */

const imageCache = new Map()

/** Canvas comparte el mismo -scale-x-100 que el vídeo: coords sin volver a espejar. */
function canvasPx(point, width, height) {
  return { x: point.x * width, y: point.y * height }
}

export function preloadPlayerAvatars(urls) {
  const unique = [...new Set(urls.filter(Boolean))]
  return Promise.all(
    unique.map(
      (url) =>
        new Promise((resolve) => {
          if (imageCache.has(url) && imageCache.get(url).complete) {
            resolve(imageCache.get(url))
            return
          }
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = () => resolve(null)
          img.src = url
          imageCache.set(url, img)
        }),
    ),
  )
}

/** J1 = izquierda en pantalla (screenX bajo), J2 = derecha. */
export function poseInPlayerZone(pose, playerId) {
  const sx = pose?.screenX ?? 0.5
  if (playerId === 'player1') return sx < 0.46
  if (playerId === 'player2') return sx > 0.54
  return false
}

export function getPoseForPlayer(poseDetection, playerId) {
  if (!poseDetection) return null

  const direct = poseDetection[playerId]
  if (direct && poseInPlayerZone(direct, playerId)) return direct

  const fromList = poseDetection.poses?.find((p) => poseInPlayerZone(p, playerId))
  return fromList ?? null
}

function computeFacePlacement(landmarks, width, height) {
  const nose = landmarks[0]
  const leftEye = landmarks[2] ?? landmarks[1]
  const rightEye = landmarks[5] ?? landmarks[4]

  if (
    nose &&
    leftEye &&
    rightEye &&
    (nose.visibility == null || nose.visibility > 0.35)
  ) {
    const pN = canvasPx(nose, width, height)
    const pL = canvasPx(leftEye, width, height)
    const pR = canvasPx(rightEye, width, height)
    const eyeDist = Math.hypot(pR.x - pL.x, pR.y - pL.y)
    const cx = (pL.x + pR.x) / 2
    const cy = (pN.y + pL.y + pR.y) / 3 - eyeDist * 0.12
    const radius = Math.max(26, Math.min(eyeDist * 0.82, width * 0.09))
    return { cx, cy, radius }
  }

  const lSh = landmarks[11]
  const rSh = landmarks[12]
  if (nose && lSh && rSh) {
    const pN = canvasPx(nose, width, height)
    const p1 = canvasPx(lSh, width, height)
    const p2 = canvasPx(rSh, width, height)
    const shoulderW = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    return {
      cx: pN.x,
      cy: pN.y - shoulderW * 0.08,
      radius: Math.max(24, Math.min(shoulderW * 0.34, width * 0.08)),
    }
  }

  if (!nose) return null
  const pN = canvasPx(nose, width, height)
  return { cx: pN.x, cy: pN.y, radius: Math.max(24, width * 0.06) }
}

function drawExpression(ctx, expression, radius) {
  const r = radius
  ctx.save()

  switch (expression) {
    case 'happy':
      ctx.fillStyle = 'rgba(255, 100, 120, 0.35)'
      ctx.beginPath()
      ctx.ellipse(-r * 0.38, r * 0.08, r * 0.14, r * 0.09, 0, 0, Math.PI * 2)
      ctx.ellipse(r * 0.38, r * 0.08, r * 0.14, r * 0.09, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(30, 20, 20, 0.55)'
      ctx.lineWidth = Math.max(2, r * 0.06)
      ctx.beginPath()
      ctx.arc(0, r * 0.12, r * 0.32, 0.2, Math.PI - 0.2)
      ctx.stroke()
      break
    case 'sad':
      ctx.strokeStyle = 'rgba(30, 20, 20, 0.55)'
      ctx.lineWidth = Math.max(2, r * 0.06)
      ctx.beginPath()
      ctx.arc(0, r * 0.35, r * 0.28, Math.PI + 0.25, -0.25)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-r * 0.35, -r * 0.22)
      ctx.lineTo(-r * 0.15, -r * 0.08)
      ctx.moveTo(r * 0.35, -r * 0.22)
      ctx.lineTo(r * 0.15, -r * 0.08)
      ctx.stroke()
      break
    case 'focused':
      ctx.strokeStyle = 'rgba(30, 20, 20, 0.5)'
      ctx.lineWidth = Math.max(2, r * 0.07)
      ctx.beginPath()
      ctx.moveTo(-r * 0.38, -r * 0.28)
      ctx.lineTo(-r * 0.12, -r * 0.2)
      ctx.moveTo(r * 0.38, -r * 0.28)
      ctx.lineTo(r * 0.12, -r * 0.2)
      ctx.stroke()
      break
    case 'shocked':
      ctx.fillStyle = 'rgba(30, 20, 20, 0.45)'
      ctx.beginPath()
      ctx.ellipse(0, r * 0.18, r * 0.14, r * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(-r * 0.28, -r * 0.12, r * 0.11, 0, Math.PI * 2)
      ctx.arc(r * 0.28, -r * 0.12, r * 0.11, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'hype':
      ctx.fillStyle = 'rgba(255, 220, 80, 0.4)'
      ctx.font = `bold ${Math.max(14, r * 0.35)}px system-ui`
      ctx.textAlign = 'center'
      ctx.fillText('🔥', 0, -r * 0.55)
      ctx.strokeStyle = 'rgba(30, 20, 20, 0.45)'
      ctx.lineWidth = Math.max(2, r * 0.05)
      ctx.beginPath()
      ctx.arc(0, r * 0.1, r * 0.3, 0.15, Math.PI - 0.15)
      ctx.stroke()
      break
    default:
      break
  }

  ctx.restore()
}

/**
 * Foto del jugador solo en la cabeza (ojos/nariz). No tapa las manos.
 */
export function drawPlayerFace(ctx, pose, avatarUrl, expression, width, height, borderColor) {
  if (!pose?.landmarks?.length || !avatarUrl) return

  const placement = computeFacePlacement(pose.landmarks, width, height)
  if (!placement) return

  const img = imageCache.get(avatarUrl)
  if (!img || !img.complete || !img.naturalWidth) return

  const { cx, cy, radius } = placement

  ctx.save()
  ctx.translate(cx, cy)

  ctx.save()
  ctx.beginPath()
  ctx.ellipse(0, 0, radius * 0.9, radius * 1.02, 0, 0, Math.PI * 2)
  ctx.clip()

  const size = radius * 2.1
  ctx.drawImage(img, -size / 2, -size / 2 - radius * 0.08, size, size)
  ctx.restore()

  ctx.strokeStyle = borderColor
  ctx.lineWidth = Math.max(2, radius * 0.08)
  ctx.beginPath()
  ctx.ellipse(0, 0, radius * 0.9, radius * 1.02, 0, 0, Math.PI * 2)
  ctx.stroke()

  if (expression && expression !== 'neutral') {
    drawExpression(ctx, expression, radius)
  }

  ctx.restore()
}

export function resolvePlayerExpressions({
  phase,
  roundResult,
  tieBreakerActive,
  tieStatus,
  catchScores,
  bombFlash,
}) {
  let player1 = 'neutral'
  let player2 = 'neutral'

  if (bombFlash?.player1) player1 = 'shocked'
  if (bombFlash?.player2) player2 = 'shocked'

  if (phase === 'countdown') {
    return { player1: 'focused', player2: 'focused' }
  }

  if (phase === 'result' && roundResult?.winner) {
    const { winner } = roundResult
    if (winner === 'tie') {
      return { player1: 'shocked', player2: 'shocked' }
    }
    if (winner === 'player1') {
      return { player1: 'happy', player2: 'sad' }
    }
    if (winner === 'player2') {
      return { player1: 'sad', player2: 'happy' }
    }
  }

  if (
    (tieBreakerActive || phase === 'tiebreaker') &&
    tieStatus === 'playing'
  ) {
    const diff = (catchScores?.player1 ?? 0) - (catchScores?.player2 ?? 0)
    if (diff >= 3) {
      player1 = 'hype'
      player2 = 'sad'
    } else if (diff <= -3) {
      player2 = 'hype'
      player1 = 'sad'
    } else if (diff > 0) {
      player1 = 'happy'
    } else if (diff < 0) {
      player2 = 'happy'
    }
  }

  return { player1, player2 }
}
