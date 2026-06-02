/**
 * Adapta HolisticLandmarker (tasks-vision) para asignación y dibujo.
 */

export function holisticResultToHandFormat(holisticResult) {
  const landmarks = []
  const handednesses = []

  const left = holisticResult?.leftHandLandmarks?.[0]
  const right = holisticResult?.rightHandLandmarks?.[0]

  if (left?.length) {
    landmarks.push(left)
    handednesses.push([{ categoryName: 'Left', score: 1 }])
  }
  if (right?.length) {
    landmarks.push(right)
    handednesses.push([{ categoryName: 'Right', score: 1 }])
  }

  return {
    landmarks,
    handednesses,
    gestures: landmarks.map(() => []),
  }
}

export function holisticResultToVisual(holisticResult) {
  if (!holisticResult) return null

  return {
    poseLandmarks: holisticResult.poseLandmarks?.[0] ?? null,
    leftHandLandmarks: holisticResult.leftHandLandmarks?.[0] ?? null,
    rightHandLandmarks: holisticResult.rightHandLandmarks?.[0] ?? null,
  }
}

/** @deprecated alias */
export function handResultsToAssignFormat(holisticResult) {
  return holisticResultToHandFormat(holisticResult)
}

export function toVisualLandmarks(holisticResult) {
  return holisticResultToVisual(holisticResult)
}
