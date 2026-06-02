import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  drawLandmarks,
  drawCenterDivider,
  drawZoneBorders,
} from '../utils/drawLandmarks'

const Camera = forwardRef(function Camera(
  { detection, phase, frozen, frozenFrame },
  ref,
) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useImperativeHandle(ref, () => videoRef.current)

  useEffect(() => {
    let stream = null

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
        }
      } catch (err) {
        console.error('Error al acceder a la cámara:', err)
      }
    }

    startCamera()
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    let rafId

    const draw = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const w = video.videoWidth || 640
      const h = video.videoHeight || 480
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h

      ctx.clearRect(0, 0, w, h)

      if (frozen && frozenFrame) {
        ctx.drawImage(frozenFrame, 0, 0, w, h)
      }

      drawZoneBorders(ctx, w, h)
      drawCenterDivider(ctx, w, h)

      if (detection.player1?.landmarks) {
        drawLandmarks(ctx, detection.player1.landmarks, '#3b82f6', w, h)
      }
      if (detection.player2?.landmarks) {
        drawLandmarks(ctx, detection.player2.landmarks, '#ef4444', w, h)
      }

      rafId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafId)
  }, [detection, frozen, frozenFrame])

  const showGuide = phase === 'waiting'

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-xl bg-black shadow-xl"
    >
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover -scale-x-100 ${
          frozen ? 'opacity-0' : 'opacity-100'
        }`}
        playsInline
        muted
        autoPlay
      />

      {frozen && frozenFrame && (
        <img
          alt="Frame capturado"
          className="absolute inset-0 h-full w-full object-cover -scale-x-100"
          src={frozenFrame.toDataURL?.() ?? ''}
          ref={(img) => {
            if (!img || !frozenFrame) return
            try {
              img.src = frozenFrame.toDataURL('image/jpeg', 0.92)
            } catch {
              /* ignore */
            }
          }}
        />
      )}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full object-cover -scale-x-100 pointer-events-none"
      />

      {showGuide && (
        <>
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded-lg bg-blue-600/80 px-2 py-1 text-xs font-bold text-white">
            Jugador 1 →
          </div>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-red-600/80 px-2 py-1 text-xs font-bold text-white">
            ← Jugador 2
          </div>
        </>
      )}

      {phase === 'waiting' && (
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-sm text-white/90 drop-shadow">
          Coloca una mano a cada lado de la línea central
        </div>
      )}
    </div>
  )
})

export default Camera
