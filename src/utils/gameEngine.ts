import {
  addTwerkFrame,
  calculateTwerkScore,
  createTwerkScoringState,
  poseLandmarksToTwerkFrame,
  type TwerkPlayerId,
  type TwerkScoreBreakdown,
  type TwerkScoringState,
} from './twerkScoring'
import type { PoseDetection } from './poseDetector'

export type TwerkPhase = 'countdown' | 'playing' | 'finished'

export type TwerkResult = {
  winner: TwerkPlayerId | 'tie'
  scores: Record<TwerkPlayerId, TwerkScoreBreakdown>
  ranking: Array<{ id: TwerkPlayerId; score: number }>
}

export type TwerkSnapshot = {
  phase: TwerkPhase
  countdownLabel: string
  timeLeft: number
  scores: Record<TwerkPlayerId, TwerkScoreBreakdown>
  result: TwerkResult | null
}

const COUNTDOWN_MS = 3600
const ROUND_MS = 10_000

function emptyScore(): TwerkScoreBreakdown {
  return calculateTwerkScore(createTwerkScoringState())
}

function buildResult(scores: Record<TwerkPlayerId, TwerkScoreBreakdown>): TwerkResult {
  const ranking = [
    { id: 'player1' as const, score: scores.player1.total },
    { id: 'player2' as const, score: scores.player2.total },
  ].sort((a, b) => b.score - a.score)

  let winner: TwerkPlayerId | 'tie' = 'tie'
  if (scores.player1.total > scores.player2.total) winner = 'player1'
  if (scores.player2.total > scores.player1.total) winner = 'player2'

  return { winner, scores, ranking }
}

export class TwerkingGameEngine {
  private startedAt = performance.now()
  private roundStartedAt = 0
  private finished = false
  private lastPoseTimestamp = 0
  private states: Record<TwerkPlayerId, TwerkScoringState> = {
    player1: createTwerkScoringState(),
    player2: createTwerkScoringState(),
  }
  private scores: Record<TwerkPlayerId, TwerkScoreBreakdown> = {
    player1: emptyScore(),
    player2: emptyScore(),
  }

  reset(now = performance.now()) {
    this.startedAt = now
    this.roundStartedAt = 0
    this.finished = false
    this.lastPoseTimestamp = 0
    this.states = {
      player1: createTwerkScoringState(),
      player2: createTwerkScoringState(),
    }
    this.scores = {
      player1: emptyScore(),
      player2: emptyScore(),
    }
  }

  update(detection: PoseDetection | null, now = performance.now()): TwerkSnapshot {
    const phase = this.getPhase(now)

    if (phase === 'playing' && detection && detection.timestamp !== this.lastPoseTimestamp) {
      this.lastPoseTimestamp = detection.timestamp
      this.addPose('player1', detection.player1?.landmarks ?? null, detection.timestamp)
      this.addPose('player2', detection.player2?.landmarks ?? null, detection.timestamp)
    }

    if (phase === 'finished' && !this.finished) {
      this.finished = true
      this.scores = {
        player1: calculateTwerkScore(this.states.player1),
        player2: calculateTwerkScore(this.states.player2),
      }
    }

    const result = phase === 'finished' ? buildResult(this.scores) : null

    return {
      phase,
      countdownLabel: this.getCountdownLabel(now),
      timeLeft: this.getTimeLeft(now),
      scores: this.scores,
      result,
    }
  }

  private addPose(
    player: TwerkPlayerId,
    landmarks: PoseDetection['player1']['landmarks'] | null,
    timestamp: number,
  ) {
    const frame = poseLandmarksToTwerkFrame(landmarks, timestamp)
    this.scores[player] = addTwerkFrame(this.states[player], frame)
  }

  private getPhase(now: number): TwerkPhase {
    if (now - this.startedAt < COUNTDOWN_MS) return 'countdown'
    if (!this.roundStartedAt) this.roundStartedAt = this.startedAt + COUNTDOWN_MS
    if (now - this.roundStartedAt < ROUND_MS) return 'playing'
    return 'finished'
  }

  private getCountdownLabel(now: number) {
    const elapsed = now - this.startedAt
    if (elapsed >= COUNTDOWN_MS) return 'YA!'
    if (elapsed < 900) return '3'
    if (elapsed < 1800) return '2'
    if (elapsed < 2700) return '1'
    return 'YA!'
  }

  private getTimeLeft(now: number) {
    if (!this.roundStartedAt) return ROUND_MS / 1000
    const remaining = Math.max(0, ROUND_MS - (now - this.roundStartedAt))
    return Math.ceil(remaining / 1000)
  }
}
