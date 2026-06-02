export type TwerkPlayerId = 'player1' | 'player2'

export type PoseLandmark = {
  x: number
  y: number
  z?: number
  visibility?: number
}

export type TwerkPoseFrame = {
  hipCenterX: number
  hipCenterY: number
  shoulderCenterX: number
  shoulderCenterY: number
  kneeCenterY: number
  hipZ: number
  shoulderZ: number
  kneeBend: number
  postureValid: boolean
  timestamp: number
}

export type TwerkScoreBreakdown = {
  total: number
  amplitude: number
  frequency: number
  speed: number
  consistency: number
  postureRatio: number
  multiplier: number
  frames: number
  combo: boolean
  title: string
}

export type TwerkScoringState = {
  frames: TwerkPoseFrame[]
  smoothedHipY: number | null
  lastDirection: number
  directionChanges: number
  stillFrames: number
  validPostureFrames: number
  speedTotal: number
  lastHipY: number | null
  comboUntil: number
}

const MAX_HISTORY = 120
const SMOOTHING = 0.35
const MIN_DIRECTION_DELTA = 0.006
const STILL_SPEED = 0.0022

const L = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
} as const

export function createTwerkScoringState(): TwerkScoringState {
  return {
    frames: [],
    smoothedHipY: null,
    lastDirection: 0,
    directionChanges: 0,
    stillFrames: 0,
    validPostureFrames: 0,
    speedTotal: 0,
    lastHipY: null,
    comboUntil: 0,
  }
}

function visible(point?: PoseLandmark) {
  return Boolean(point && (point.visibility == null || point.visibility > 0.35))
}

function avg(a: number, b: number) {
  return (a + b) / 2
}

function pointAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark) {
  const abx = a.x - b.x
  const aby = a.y - b.y
  const cbx = c.x - b.x
  const cby = c.y - b.y
  const dot = abx * cbx + aby * cby
  const magA = Math.hypot(abx, aby)
  const magC = Math.hypot(cbx, cby)
  if (magA === 0 || magC === 0) return 180
  const cosine = Math.max(-1, Math.min(1, dot / (magA * magC)))
  return (Math.acos(cosine) * 180) / Math.PI
}

export function poseLandmarksToTwerkFrame(
  landmarks: PoseLandmark[] | null | undefined,
  timestamp: number,
): TwerkPoseFrame | null {
  if (!landmarks?.length) return null

  const leftHip = landmarks[L.LEFT_HIP]
  const rightHip = landmarks[L.RIGHT_HIP]
  const leftKnee = landmarks[L.LEFT_KNEE]
  const rightKnee = landmarks[L.RIGHT_KNEE]
  const leftShoulder = landmarks[L.LEFT_SHOULDER]
  const rightShoulder = landmarks[L.RIGHT_SHOULDER]

  if (
    !visible(leftHip) ||
    !visible(rightHip) ||
    !visible(leftKnee) ||
    !visible(rightKnee) ||
    !visible(leftShoulder) ||
    !visible(rightShoulder)
  ) {
    return null
  }

  const hipCenterX = avg(leftHip.x, rightHip.x)
  const hipCenterY = avg(leftHip.y, rightHip.y)
  const shoulderCenterX = avg(leftShoulder.x, rightShoulder.x)
  const shoulderCenterY = avg(leftShoulder.y, rightShoulder.y)
  const kneeCenterY = avg(leftKnee.y, rightKnee.y)
  const hipZ = avg(leftHip.z ?? 0, rightHip.z ?? 0)
  const shoulderZ = avg(leftShoulder.z ?? 0, rightShoulder.z ?? 0)

  const leftBend = pointAngle(leftHip, leftKnee, {
    x: leftKnee.x,
    y: leftKnee.y + Math.abs(leftKnee.y - leftHip.y || 0.12),
  })
  const rightBend = pointAngle(rightHip, rightKnee, {
    x: rightKnee.x,
    y: rightKnee.y + Math.abs(rightKnee.y - rightHip.y || 0.12),
  })
  const kneeBend = 180 - avg(leftBend, rightBend)

  const shouldersForward = shoulderZ < hipZ - 0.018 || Math.abs(shoulderCenterX - hipCenterX) > 0.035
  const kneesFlexed = kneeCenterY > hipCenterY + 0.09 && kneeBend > 18
  const torsoLeaning = shoulderCenterY < hipCenterY - 0.09

  return {
    hipCenterX,
    hipCenterY,
    shoulderCenterX,
    shoulderCenterY,
    kneeCenterY,
    hipZ,
    shoulderZ,
    kneeBend,
    postureValid: shouldersForward && kneesFlexed && torsoLeaning,
    timestamp,
  }
}

export function addTwerkFrame(
  state: TwerkScoringState,
  frame: TwerkPoseFrame | null,
): TwerkScoreBreakdown {
  if (!frame) return calculateTwerkScore(state)

  const smoothedHipY =
    state.smoothedHipY == null
      ? frame.hipCenterY
      : state.smoothedHipY * (1 - SMOOTHING) + frame.hipCenterY * SMOOTHING

  const previousHipY = state.lastHipY
  const speed = previousHipY == null ? 0 : Math.abs(smoothedHipY - previousHipY)
  const direction =
    previousHipY == null || speed < MIN_DIRECTION_DELTA
      ? state.lastDirection
      : smoothedHipY > previousHipY
        ? 1
        : -1

  if (direction !== 0 && state.lastDirection !== 0 && direction !== state.lastDirection) {
    state.directionChanges += 1
  }

  state.smoothedHipY = smoothedHipY
  state.lastHipY = smoothedHipY
  state.lastDirection = direction || state.lastDirection
  state.speedTotal += speed
  if (speed < STILL_SPEED) state.stillFrames += 1
  if (frame.postureValid) state.validPostureFrames += 1
  if (speed > 0.022) state.comboUntil = frame.timestamp + 650

  state.frames.push({ ...frame, hipCenterY: smoothedHipY })
  if (state.frames.length > MAX_HISTORY) state.frames.shift()

  return calculateTwerkScore(state)
}

export function calculateTwerkScore(state: TwerkScoringState): TwerkScoreBreakdown {
  const frames = state.frames.length
  if (frames < 2) {
    return {
      total: 0,
      amplitude: 0,
      frequency: 0,
      speed: 0,
      consistency: 0,
      postureRatio: 0,
      multiplier: 1,
      frames,
      combo: false,
      title: '',
    }
  }

  const hips = state.frames.map((frame) => frame.hipCenterY)
  const amplitudeRaw = Math.max(...hips) - Math.min(...hips)
  const avgSpeedRaw = state.speedTotal / Math.max(1, frames - 1)
  const cycles = state.directionChanges / 2
  const postureRatio = state.validPostureFrames / frames
  const movementRatio = 1 - state.stillFrames / frames

  const amplitude = Math.min(1, amplitudeRaw / 0.18)
  const frequency = Math.min(1, cycles / 8)
  const speed = Math.min(1, avgSpeedRaw / 0.018)
  const consistency = Math.max(0, Math.min(1, movementRatio))

  let multiplier = 1
  if (amplitudeRaw > 0.13) multiplier *= 1.2
  if (cycles > 5) multiplier *= 1.5
  if (postureRatio > 0.8) multiplier *= 2
  if (postureRatio < 0.35) multiplier *= 0.62

  const weighted =
    amplitude * 40 + frequency * 30 + speed * 20 + consistency * 10
  const total = Math.max(0, Math.min(1000, Math.round(weighted * 10 * multiplier)))

  return {
    total,
    amplitude: Math.round(amplitude * 100),
    frequency: Math.round(frequency * 100),
    speed: Math.round(speed * 100),
    consistency: Math.round(consistency * 100),
    postureRatio,
    multiplier,
    frames,
    combo: state.comboUntil > performance.now(),
    title:
      total >= 900
        ? 'AMENAZA NACIONAL DEL TWERKING'
        : total >= 700
          ? 'REY DEL TWERKING'
          : '',
  }
}
