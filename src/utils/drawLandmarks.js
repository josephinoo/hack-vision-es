const CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [5, 9],
  [9, 13],
  [13, 17],
]

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('@mediapipe/tasks-vision').NormalizedLandmark[]} landmarks
 * @param {string} color
 * @param {number} width
 * @param {number} height
 */
export function drawLandmarks(ctx, landmarks, color, width, height) {
  if (!landmarks?.length) return

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2

  for (const [a, b] of CONNECTIONS) {
    const p1 = landmarks[a]
    const p2 = landmarks[b]
    if (!p1 || !p2) continue
    ctx.beginPath()
    ctx.moveTo(p1.x * width, p1.y * height)
    ctx.lineTo(p2.x * width, p2.y * height)
    ctx.stroke()
  }

  for (const point of landmarks) {
    ctx.beginPath()
    ctx.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function drawCenterDivider(ctx, width, height) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.lineWidth = 3
  ctx.setLineDash([12, 8])
  ctx.beginPath()
  ctx.moveTo(width / 2, 0)
  ctx.lineTo(width / 2, height)
  ctx.stroke()
  ctx.restore()
}

export function drawZoneBorders(ctx, width, height) {
  ctx.save()
  ctx.lineWidth = 4

  ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)'
  ctx.strokeRect(8, 8, width / 2 - 16, height - 16)

  ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)'
  ctx.strokeRect(width / 2 + 8, 8, width / 2 - 16, height - 16)

  ctx.restore()
}
