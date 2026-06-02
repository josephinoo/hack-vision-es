import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'
import type { PoseLandmark, TwerkPlayerId } from './twerkScoring'

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const POSE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'

let filesetPromise: Promise<unknown> | null = null
let detectorPromise: Promise<PoseLandmarker> | null = null

export type AssignedPose = {
  id: TwerkPlayerId
  landmarks: PoseLandmark[]
  screenX: number
  hipCenterY: number
  nose: PoseLandmark | null
}

export type PoseDetection = {
  player1: AssignedPose | null
  player2: AssignedPose | null
  poses: AssignedPose[]
  raw: PoseLandmarkerResult | null
  timestamp: number
}

async function getFileset() {
  if (!filesetPromise) filesetPromise = FilesetResolver.forVisionTasks(WASM_CDN)
  return filesetPromise
}

export async function getPoseLandmarker() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const vision = await getFileset()
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: POSE_MODEL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 2,
        minPoseDetectionConfidence: 0.45,
        minPosePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      })
    })().catch((err) => {
      detectorPromise = null
      throw err
    })
  }
  return detectorPromise
}

function centerX(landmarks: PoseLandmark[]) {
  const leftHip = landmarks[23]
  const rightHip = landmarks[24]
  const nose = landmarks[0]
  if (leftHip && rightHip) return (leftHip.x + rightHip.x) / 2
  return nose?.x ?? 0.5
}

function hipCenterY(landmarks: PoseLandmark[]) {
  const leftHip = landmarks[23]
  const rightHip = landmarks[24]
  if (leftHip && rightHip) return (leftHip.y + rightHip.y) / 2
  return 0.5
}

export function assignPosePlayers(
  result: PoseLandmarkerResult | null,
): PoseDetection {
  const rawPoses = result?.landmarks ?? []

  const poses = rawPoses
    .map((landmarks) => {
      const typed = landmarks as PoseLandmark[]
      return {
        landmarks: typed,
        screenX: 1 - centerX(typed),
        hipCenterY: hipCenterY(typed),
        nose: typed[0] ?? null,
      }
    })
    .sort((a, b) => a.screenX - b.screenX)
    .slice(0, 2)
    .map((pose, index) => ({
      ...pose,
      id: index === 0 ? 'player1' : 'player2',
    })) as AssignedPose[]

  return {
    player1: poses.find((pose) => pose.id === 'player1') ?? null,
    player2: poses.find((pose) => pose.id === 'player2') ?? null,
    poses,
    raw: result,
    timestamp: performance.now(),
  }
}

export class PoseDetector {
  private detector: PoseLandmarker | null = null

  async init() {
    this.detector = await getPoseLandmarker()
    return this
  }

  detect(video: HTMLVideoElement, timestamp = performance.now()) {
    if (!this.detector) return assignPosePlayers(null)
    const result = this.detector.detectForVideo(video, timestamp)
    return assignPosePlayers(result)
  }
}
