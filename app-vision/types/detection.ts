/** Detection TypeScript types matching the api-vision WebSocket response format */

export interface BoundingBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface Detection {
  class: string
  confidence: number
  box: BoundingBox
  mask?: { points: number[][] }
  keypoints?: KeyPoint[]
}

// Keypoint for pose estimation
export interface KeyPoint {
  name: string
  x: number
  y: number
  confidence: number
}

// Pose person
export interface PosePerson {
  box: BoundingBox
  confidence: number
  keypoints: KeyPoint[]
}

// WebSocket message shapes from api-vision
export interface DetectionMessage {
  count: number
  detections: Detection[]
  error?: string
}

export interface PoseMessage {
  count: number
  persons: PosePerson[]
  error?: string
}

// Interpolated detection used by canvas (with lerp state)
export interface LerpedDetection extends Detection {
  // Current rendered position (interpolated)
  rendered: BoundingBox
}

export type ModelKey = 'detect' | 'segment' | 'pose'

export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'demo'

export const MODEL_LABELS: Record<ModelKey, string> = {
  detect:  'LibreYOLO9t · detection',
  segment: 'LibreRFDETRs · segment',
  pose:    'LibreYOLONASs · pose',
}
