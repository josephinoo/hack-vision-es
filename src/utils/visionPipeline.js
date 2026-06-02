import {
  FilesetResolver,
  GestureRecognizer,
  HolisticLandmarker,
} from '@mediapipe/tasks-vision'
import { loadTaskModel } from './loadTaskModel'

const RPS_TASK_URL = '/models/rock_paper_scissors.task'
const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'

const HOLISTIC_MODEL =
  'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task'

let wasmFilesetPromise = null
let rpsPipelinePromise = null
let holisticPipelinePromise = null

function getWasmFileset() {
  if (!wasmFilesetPromise) {
    wasmFilesetPromise = FilesetResolver.forVisionTasks(WASM_CDN)
  }
  return wasmFilesetPromise
}

const HAND_TRACKING = {
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
}

/** Piedra / papel / tijera: solo modelo .task custom */
export async function getRpsPipeline() {
  if (!rpsPipelinePromise) {
    rpsPipelinePromise = (async () => {
      const [vision, modelAssetBuffer] = await Promise.all([
        getWasmFileset(),
        loadTaskModel(RPS_TASK_URL),
      ])

      const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetBuffer,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        ...HAND_TRACKING,
      })

      return { gestureRecognizer }
    })().catch((err) => {
      rpsPipelinePromise = null
      throw err
    })
  }
  return rpsPipelinePromise
}

/** Penitencia: solo MediaPipe Holistic (sin .task RPS) */
export async function getHolisticPipeline() {
  if (!holisticPipelinePromise) {
    holisticPipelinePromise = (async () => {
      const vision = await getWasmFileset()

      const holisticLandmarker = await HolisticLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HOLISTIC_MODEL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        ...HAND_TRACKING,
      })

      return { holisticLandmarker }
    })().catch((err) => {
      holisticPipelinePromise = null
      throw err
    })
  }
  return holisticPipelinePromise
}
