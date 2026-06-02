import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePose } from '../hooks/usePose'
import {
  TwerkingGameEngine,
  type TwerkResult,
  type TwerkSnapshot,
} from '../utils/gameEngine'
import {
  buildConfetti,
  createOverlayState,
  drawTwerkingOverlay,
} from '../utils/overlays'

type Props = {
  active: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  player1Name: string
  player2Name: string
  onFinish?: (result: TwerkResult) => void
  onContinue?: () => void
}

const EMPTY_SCORE = {
  total: 0,
  amplitude: 0,
  frequency: 0,
  speed: 0,
  consistency: 0,
  postureRatio: 0,
  multiplier: 1,
  frames: 0,
  combo: false,
  title: '',
}

const EMPTY_SNAPSHOT: TwerkSnapshot = {
  phase: 'countdown',
  countdownLabel: '3',
  timeLeft: 10,
  scores: {
    player1: EMPTY_SCORE,
    player2: EMPTY_SCORE,
  },
  result: null,
}

const REGGAETON_EMBED_URL =
  'https://www.youtube.com/embed/CiOjEMNlsy0?autoplay=1&playsinline=1&controls=1&rel=0&modestbranding=1'

function playerLabel(player: 'player1' | 'player2', player1Name: string, player2Name: string) {
  return player === 'player1' ? player1Name : player2Name
}

function loserLine(result: TwerkResult, player1Name: string, player2Name: string) {
  if (result.winner === 'tie') return 'Empate técnico de cadera'
  const loser = result.winner === 'player1' ? player2Name : player1Name
  return `${loser}: NIVEL DE CADERA INSUFICIENTE`
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] font-bold uppercase tracking-wide text-slate-300">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-white/10">
        <div
          className="h-full rounded bg-amber-300"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  )
}

export default function TwerkingChallenge({
  active,
  videoRef,
  player1Name,
  player2Name,
  onFinish,
  onContinue,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef(new TwerkingGameEngine())
  const overlayStateRef = useRef(createOverlayState())
  const rafRef = useRef<number | null>(null)
  const [snapshot, setSnapshot] = useState<TwerkSnapshot>(EMPTY_SNAPSHOT)
  const { ready, error, detection } = usePose(videoRef, { enabled: active })
  const detectionRef = useRef(detection)
  const onFinishRef = useRef(onFinish)
  const finishedSentRef = useRef(false)
  const frozenFrameRef = useRef<string | null>(null)
  const confetti = useMemo(() => buildConfetti(100), [snapshot.result])

  useEffect(() => {
    detectionRef.current = detection
  }, [detection])

  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  const captureFinalFrame = useCallback(() => {
    if (frozenFrameRef.current) return
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    frozenFrameRef.current = canvas.toDataURL('image/jpeg', 0.9)
  }, [videoRef])

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      finishedSentRef.current = false
      frozenFrameRef.current = null
      setSnapshot(EMPTY_SNAPSHOT)
      return
    }

    engineRef.current.reset()
    overlayStateRef.current = createOverlayState()
    finishedSentRef.current = false
    frozenFrameRef.current = null

    const tick = () => {
      const now = performance.now()
      const currentDetection = detectionRef.current
      const next = engineRef.current.update(currentDetection, now)
      setSnapshot(next)

      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx && video) {
        const width = video.videoWidth || 1280
        const height = video.videoHeight || 720
        if (canvas.width !== width) canvas.width = width
        if (canvas.height !== height) canvas.height = height
        drawTwerkingOverlay({
          ctx,
          width,
          height,
          poses: currentDetection.poses,
          scores: next.scores,
          phase: next.phase,
          now,
          overlayState: overlayStateRef.current,
        })
      }

      if (next.phase === 'finished' && next.result) {
        captureFinalFrame()
        if (!finishedSentRef.current) {
          finishedSentRef.current = true
          onFinishRef.current?.(next.result)
        }
      }

      if (next.phase !== 'finished') {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active, captureFinalFrame, videoRef])

  if (!active) return null

  const { scores, result } = snapshot
  const winnerName =
    result?.winner && result.winner !== 'tie'
      ? playerLabel(result.winner, player1Name, player2Name)
      : 'EMPATE'
  const topTitle =
    scores.player1.title || scores.player2.title || 'TWERKING CHALLENGE'

  return (
    <div className="absolute inset-0 z-50 overflow-hidden rounded-xl">
      {snapshot.phase === 'finished' && frozenFrameRef.current && (
        <img
          src={frozenFrameRef.current}
          alt="Ultimo frame congelado"
          className="absolute inset-0 h-full w-full object-cover -scale-x-100"
        />
      )}

      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-fuchsia-950/30 via-transparent to-slate-950/70" />

      <div className="absolute left-0 right-0 top-0 z-20 px-4 py-3 text-center">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-200">
          Twerking Challenge
        </p>
        <h2 className="mt-1 text-2xl font-black uppercase text-white drop-shadow-lg">
          {topTitle}
        </h2>
      </div>

      {!ready && !error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 text-center">
          <p className="animate-pulse-ring rounded-xl bg-slate-900/90 px-5 py-3 text-sm font-bold text-amber-200">
            Cargando MediaPipe Pose...
          </p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 text-center">
          <p className="max-w-md rounded-xl border border-red-500 bg-slate-900 px-5 py-4 text-sm text-red-200">
            Error al cargar MediaPipe Pose: {error}
          </p>
        </div>
      )}

      {snapshot.phase === 'countdown' && ready && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45">
          <div className="animate-bounce-in text-center">
            <p className="text-8xl font-black text-amber-300 drop-shadow-2xl md:text-9xl">
              {snapshot.countdownLabel}
            </p>
            <p className="mt-2 text-lg font-bold uppercase tracking-wide text-white">
              Hombros delante, rodillas flexionadas
            </p>
          </div>
        </div>
      )}

      {snapshot.phase === 'playing' && (
        <>
          <div className="absolute right-3 top-20 z-30 w-64 overflow-hidden rounded-lg border border-amber-300/70 bg-slate-950/90 p-2 shadow-xl">
            <p className="mb-1 truncate text-xs font-black uppercase tracking-wide text-amber-200">
              Reggaeton mode
            </p>
            <iframe
              key="reggaeton-twerking-track"
              title="Reggaeton Twerking Challenge"
              className="h-20 w-full rounded bg-black"
              src={REGGAETON_EMBED_URL}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-8xl font-black text-white/90 drop-shadow-2xl">
              {snapshot.timeLeft}
            </p>
          </div>

          {(scores.player1.combo || scores.player2.combo) && (
            <div className="absolute bottom-28 left-0 right-0 z-30 text-center">
              <span className="animate-bounce-in rounded-xl border-2 border-amber-300 bg-fuchsia-600/90 px-6 py-3 text-3xl font-black text-white shadow-2xl">
                TWERK COMBO
              </span>
            </div>
          )}
        </>
      )}

      <div className="absolute bottom-3 left-3 z-20 w-52 rounded-lg border border-blue-400/70 bg-slate-950/80 p-3">
        <p className="mb-2 truncate text-sm font-black text-blue-300">{player1Name}</p>
        <Metric label="Amplitud" value={scores.player1.amplitude} />
        <Metric label="Frecuencia" value={scores.player1.frequency} />
        <Metric label="Velocidad" value={scores.player1.speed} />
        <Metric label="Consistencia" value={scores.player1.consistency} />
      </div>

      <div className="absolute bottom-3 right-3 z-20 w-52 rounded-lg border border-red-400/70 bg-slate-950/80 p-3">
        <p className="mb-2 truncate text-sm font-black text-red-300">{player2Name}</p>
        <Metric label="Amplitud" value={scores.player2.amplitude} />
        <Metric label="Frecuencia" value={scores.player2.frequency} />
        <Metric label="Velocidad" value={scores.player2.speed} />
        <Metric label="Consistencia" value={scores.player2.consistency} />
      </div>

      {result && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/82 p-4 backdrop-blur-sm">
          {confetti.map((piece) => (
            <span
              key={piece.id}
              className="twerk-confetti"
              style={{
                left: `${piece.left}%`,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                backgroundColor: piece.color,
              }}
            />
          ))}

          <div className="animate-bounce-in w-full max-w-2xl rounded-2xl border-2 border-amber-300 bg-slate-950/95 p-6 text-center shadow-2xl">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-300">
              GANADOR
            </p>
            <h3 className="mt-2 text-4xl font-black uppercase text-white">
              {winnerName}
            </h3>
            <p className="mt-2 text-lg font-bold text-red-200">
              {loserLine(result, player1Name, player2Name)}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {result.ranking.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-white/15 bg-white/8 p-4"
                >
                  <p className="text-xs font-bold uppercase text-slate-400">
                    #{index + 1} {playerLabel(entry.id, player1Name, player2Name)}
                  </p>
                  <p className="mt-1 text-4xl font-black text-amber-300">
                    {entry.score}
                  </p>
                  <p className="text-xs text-slate-400">puntos</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onContinue}
              className="mt-7 rounded-xl bg-emerald-500 px-8 py-3 text-lg font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              Seguir jugando
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
