import type { AssignedPose } from './poseDetector'
import type { TwerkPlayerId, TwerkScoreBreakdown } from './twerkScoring'
import type { TwerkResult } from './gameEngine'
import { drawPlayerFace, getPoseForPlayer } from './playerFaceOverlay.js'

type FaceExpression = 'neutral' | 'focused' | 'happy' | 'sad' | 'shocked' | 'hype'

export type MoneyParticle = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  ttl: number
  color: string
}

export type TwerkOverlayState = {
  particles: MoneyParticle[]
  nextParticleId: number
}

export function createOverlayState(): TwerkOverlayState {
  return { particles: [], nextParticleId: 1 }
}

const CONNECTIONS = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [24, 26],
  [25, 27],
  [26, 28],
]

function px(point: { x: number; y: number }, width: number, height: number) {
  return { x: point.x * width, y: point.y * height }
}

/** Mismo criterio que manos y caras: canvas con -scale-x-100, sin doble espejo. */
function canvasPx(point: { x: number; y: number }, width: number, height: number) {
  return { x: point.x * width, y: point.y * height }
}

function drawPose(ctx: CanvasRenderingContext2D, pose: AssignedPose, width: number, height: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.lineCap = 'round'

  for (const [a, b] of CONNECTIONS) {
    const from = pose.landmarks[a]
    const to = pose.landmarks[b]
    if (!from || !to) continue
    const p1 = canvasPx(from, width, height)
    const p2 = canvasPx(to, width, height)
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()
  }

  for (const point of pose.landmarks) {
    if (!point || point.visibility != null && point.visibility < 0.35) continue
    const p = canvasPx(point, width, height)
    ctx.beginPath()
    ctx.fillStyle = color
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function twerkFaceExpression(
  player: TwerkPlayerId,
  score: TwerkScoreBreakdown,
  phase: 'countdown' | 'playing' | 'finished',
  scores: Record<TwerkPlayerId, TwerkScoreBreakdown>,
  result: TwerkResult | null | undefined,
): FaceExpression {
  if (phase === 'countdown') return 'focused'
  if (phase === 'finished' && result) {
    if (result.winner === 'tie') return 'shocked'
    if (result.winner === player) return 'happy'
    if (result.winner) return 'sad'
  }
  if (phase === 'playing' && score.combo) return 'hype'
  const other = scores[player === 'player1' ? 'player2' : 'player1'].total
  if (score.total > other + 80) return 'hype'
  if (score.total < other - 80) return 'sad'
  return 'happy'
}

function drawDisco(ctx: CanvasRenderingContext2D, width: number, height: number, now: number) {
  const hueA = (now / 18) % 360
  const hueB = (hueA + 120) % 360

  ctx.save()
  const gradient = ctx.createRadialGradient(width * 0.5, 0, 10, width * 0.5, height * 0.5, width)
  gradient.addColorStop(0, `hsla(${hueA}, 95%, 55%, 0.28)`)
  gradient.addColorStop(0.45, 'rgba(0, 0, 0, 0)')
  gradient.addColorStop(1, `hsla(${hueB}, 95%, 55%, 0.22)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < 7; i += 1) {
    const x = ((Math.sin(now / 520 + i) + 1) / 2) * width
    ctx.strokeStyle = `hsla(${(hueA + i * 48) % 360}, 100%, 65%, 0.22)`
    ctx.lineWidth = width * 0.025
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  ctx.restore()
}

function spawnParticles(
  state: TwerkOverlayState,
  pose: AssignedPose,
  width: number,
  height: number,
  strong: boolean,
) {
  if (!strong || state.particles.length > 90) return
  const hip = pose.landmarks[23] && pose.landmarks[24]
    ? {
        x: (pose.landmarks[23].x + pose.landmarks[24].x) / 2,
        y: (pose.landmarks[23].y + pose.landmarks[24].y) / 2,
      }
    : pose.nose
  if (!hip) return
  const p = canvasPx(hip, width, height)
  for (let i = 0; i < 4; i += 1) {
    state.particles.push({
      id: state.nextParticleId,
      x: p.x,
      y: p.y,
      vx: (Math.random() - 0.5) * 5,
      vy: -2 - Math.random() * 4,
      rotation: Math.random() * Math.PI,
      ttl: 50 + Math.random() * 35,
      color: Math.random() > 0.5 ? '#22c55e' : '#facc15',
    })
    state.nextParticleId += 1
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, state: TwerkOverlayState) {
  ctx.save()
  state.particles = state.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx,
      y: particle.y + particle.vy,
      vy: particle.vy + 0.15,
      rotation: particle.rotation + 0.12,
      ttl: particle.ttl - 1,
    }))
    .filter((particle) => particle.ttl > 0)

  for (const particle of state.particles) {
    ctx.save()
    ctx.translate(particle.x, particle.y)
    ctx.rotate(particle.rotation)
    ctx.globalAlpha = Math.min(1, particle.ttl / 35)
    ctx.fillStyle = particle.color
    ctx.fillRect(-12, -6, 24, 12)
    ctx.fillStyle = '#052e16'
    ctx.font = '700 10px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('$', 0, 0)
    ctx.restore()
  }
  ctx.restore()
}

function drawPowerBar(
  ctx: CanvasRenderingContext2D,
  player: TwerkPlayerId,
  score: TwerkScoreBreakdown,
  width: number,
  height: number,
) {
  const left = player === 'player1' ? width * 0.04 : width * 0.72
  const top = height * 0.08
  const barWidth = width * 0.24
  const barHeight = 18
  const color = player === 'player1' ? '#3b82f6' : '#ef4444'

  ctx.save()
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)'
  ctx.fillRect(left, top, barWidth, 54)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.strokeRect(left, top, barWidth, 54)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 13px system-ui'
  ctx.fillText(player === 'player1' ? 'J1 TWERK POWER' : 'J2 TWERK POWER', left + 10, top + 18)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'
  ctx.fillRect(left + 10, top + 28, barWidth - 20, barHeight)
  ctx.fillStyle = color
  ctx.fillRect(left + 10, top + 28, (barWidth - 20) * Math.min(1, score.total / 1000), barHeight)
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 15px system-ui'
  ctx.textAlign = 'right'
  ctx.fillText(String(score.total), left + barWidth - 10, top + 43)
  ctx.restore()
}

export function drawTwerkingOverlay({
  ctx,
  width,
  height,
  poses,
  scores,
  phase,
  now,
  overlayState,
  player1Avatar,
  player2Avatar,
  result,
}: {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  poses: AssignedPose[]
  scores: Record<TwerkPlayerId, TwerkScoreBreakdown>
  phase: 'countdown' | 'playing' | 'finished'
  now: number
  overlayState: TwerkOverlayState
  player1Avatar?: string
  player2Avatar?: string
  result?: TwerkResult | null
}) {
  ctx.clearRect(0, 0, width, height)
  drawDisco(ctx, width, height, now)

  const poseBundle = { player1: poses.find((p) => p.id === 'player1') ?? null, player2: poses.find((p) => p.id === 'player2') ?? null, poses }
  const player1 = getPoseForPlayer(poseBundle, 'player1')
  const player2 = getPoseForPlayer(poseBundle, 'player2')

  if (player1) {
    if (player1Avatar) {
      drawPlayerFace(
        ctx,
        player1,
        player1Avatar,
        twerkFaceExpression('player1', scores.player1, phase, scores, result),
        width,
        height,
        '#2563eb',
      )
    }
    drawPose(ctx, player1, width, height, 'rgba(96, 165, 250, 0.85)')
    spawnParticles(overlayState, player1, width, height, scores.player1.combo && phase === 'playing')
  }
  if (player2) {
    if (player2Avatar) {
      drawPlayerFace(
        ctx,
        player2,
        player2Avatar,
        twerkFaceExpression('player2', scores.player2, phase, scores, result),
        width,
        height,
        '#dc2626',
      )
    }
    drawPose(ctx, player2, width, height, 'rgba(248, 113, 113, 0.85)')
    spawnParticles(overlayState, player2, width, height, scores.player2.combo && phase === 'playing')
  }

  drawPowerBar(ctx, 'player1', scores.player1, width, height)
  drawPowerBar(ctx, 'player2', scores.player2, width, height)
  drawParticles(ctx, overlayState)
}

export function buildConfetti(count = 80) {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 2.4 + Math.random() * 1.4,
    color: ['#22c55e', '#facc15', '#38bdf8', '#fb7185'][index % 4],
  }))
}
