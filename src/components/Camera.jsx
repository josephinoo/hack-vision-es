import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  drawLandmarks,
  drawCenterDivider,
  drawZoneBorders,
} from '../utils/drawLandmarks'
import { drawVisionSkeleton } from '../utils/drawVision'
import { drawPlayerFace, getPoseForPlayer } from '../utils/playerFaceOverlay'

const Camera = forwardRef(function Camera(
  {
    detection,
    phase,
    frozen,
    frozenFrame,
    tieBreakerHint,
    poseDetection,
    playerAvatars,
    playerExpressions,
    showPlayerFaces = true,
  },
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

      if (detection.holistic) {
        drawVisionSkeleton(ctx, detection.holistic, w, h)
      }

      if (showPlayerFaces && playerAvatars && poseDetection) {
        const expr = playerExpressions ?? { player1: 'neutral', player2: 'neutral' }
        const p1Pose = getPoseForPlayer(poseDetection, 'player1')
        const p2Pose = getPoseForPlayer(poseDetection, 'player2')

        if (p1Pose && playerAvatars.player1) {
          drawPlayerFace(
            ctx,
            p1Pose,
            playerAvatars.player1,
            expr.player1,
            w,
            h,
            '#4361ee',
          )
        }
        if (p2Pose && playerAvatars.player2) {
          drawPlayerFace(
            ctx,
            p2Pose,
            playerAvatars.player2,
            expr.player2,
            w,
            h,
            '#f72585',
          )
        }
      }

      if (detection.player1?.landmarks) {
        drawLandmarks(ctx, detection.player1.landmarks, '#4361ee', w, h, 5)
      }
      if (detection.player2?.landmarks) {
        drawLandmarks(ctx, detection.player2.landmarks, '#f72585', w, h, 5)
      }

      rafId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafId)
  }, [detection, frozen, frozenFrame, poseDetection, playerAvatars, playerExpressions, showPlayerFaces])

  const showGuide = phase === 'waiting'

  return (
    <div
      ref={containerRef}
      className="camera-booth relative aspect-video w-full max-w-3xl overflow-hidden bg-[var(--ink)]"
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
          <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border-2 border-[var(--ink)] bg-[var(--p1)] px-3 py-1 font-display text-xs font-bold text-white shadow-[2px_2px_0_var(--ink)]">
            J1 →
          </div>
          <div className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border-2 border-[var(--ink)] bg-[var(--p2)] px-3 py-1 font-display text-xs font-bold text-white shadow-[2px_2px_0_var(--ink)]">
            ← J2
          </div>
        </>
      )}

      {phase === 'waiting' && (
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-10 flex justify-center px-4">
          <span className="rounded-full border-2 border-[var(--ink)] bg-white/95 px-4 py-1.5 font-display text-sm font-semibold text-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
            Una mano a cada lado del centro
          </span>
        </div>
      )}

      {phase === 'tiebreaker' && (
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-10 flex justify-center px-4">
          <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--sun)] px-4 py-1.5 font-display text-sm font-bold text-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
            {tieBreakerHint ?? '¡Coge todo lo que caiga!'}
          </span>
        </div>
      )}
    </div>
  )
})

export default Camera
