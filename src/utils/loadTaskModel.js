/**
 * Carga un modelo MediaPipe Tasks (.task) como Uint8Array para modelAssetBuffer.
 * @param {string} taskUrl - Ruta pública al archivo .task
 * @returns {Promise<Uint8Array>}
 */
export async function loadTaskModel(taskUrl) {
  const response = await fetch(taskUrl)
  if (!response.ok) {
    throw new Error(
      `No se pudo cargar el modelo .task (${response.status}): ${taskUrl}`,
    )
  }
  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}
