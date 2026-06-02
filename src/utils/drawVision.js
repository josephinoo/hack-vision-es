import { drawLandmarks, drawConnections } from './drawLandmarks'
import { POSE_CONNECTIONS } from './poseConnections'

/**
 * Dibuja pose + manos (equivalente visual a @mediapipe/holistic).
 */
export function drawVisionSkeleton(ctx, visual, width, height) {
  if (!visual) return

  if (visual.poseLandmarks?.length) {
    drawConnections(ctx, visual.poseLandmarks, POSE_CONNECTIONS, width, height, {
      color: 'rgba(52, 211, 153, 0.65)',
      lineWidth: 3,
    })
    drawLandmarks(
      ctx,
      visual.poseLandmarks,
      'rgba(52, 211, 153, 0.5)',
      width,
      height,
      2,
      [],
    )
  }

  if (visual.leftHandLandmarks?.length) {
    drawLandmarks(ctx, visual.leftHandLandmarks, '#60a5fa', width, height, 4)
  }

  if (visual.rightHandLandmarks?.length) {
    drawLandmarks(ctx, visual.rightHandLandmarks, '#f87171', width, height, 4)
  }
}
