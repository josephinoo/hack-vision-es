import { useCallback, useRef, useState } from 'react'
import Camera from './components/Camera'
import PlayerPanel from './components/PlayerPanel'
import Countdown from './components/Countdown'
import ResultOverlay from './components/ResultOverlay'
import PenaltyOverlay from './components/PenaltyOverlay'
import { useRpsDetection } from './hooks/useRpsDetection'
import { useHolisticPenalty } from './hooks/useHolisticPenalty'
import { useGameFlow, PHASE } from './hooks/useGameFlow'
import { usePenaltyGame } from './hooks/usePenaltyGame'
import { bothHandsDetected, createPlayerLock } from './utils/assignPlayers'

function NameSetup({ onStart }) {
  const [p1, setP1] = useState('Jugador 1')
  const [p2, setP2] = useState('Jugador 2')

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight text-white">
          Piedra, Papel o Tijera
        </h1>
        <p className="mt-2 text-slate-400">
          Dos personas frente a la misma cámara · Mano izquierda vs mano derecha
        </p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-blue-400">Jugador 1 (izquierda)</span>
          <input
            type="text"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            className="rounded-lg border border-blue-500/50 bg-slate-800 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={20}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-red-400">Jugador 2 (derecha)</span>
          <input
            type="text"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            className="rounded-lg border border-red-500/50 bg-slate-800 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-500"
            maxLength={20}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => onStart({ player1: p1.trim() || 'Jugador 1', player2: p2.trim() || 'Jugador 2' })}
        className="rounded-xl bg-emerald-500 px-10 py-3 text-lg font-bold text-slate-900 transition hover:bg-emerald-400"
      >
        Empezar juego
      </button>

      <p className="max-w-md text-center text-xs text-slate-500">
        Necesitas permitir acceso a la cámara. Colócate frente al monitor: una
        persona a la izquierda y otra a la derecha del encuadre.
      </p>
    </div>
  )
}

function Game({ names, onBack }) {
  const videoRef = useRef(null)
  const playerLockRef = useRef(null)
  const frozenCanvasRef = useRef(null)
  const [frozenFrame, setFrozenFrame] = useState(null)
  const [penaltyActive, setPenaltyActive] = useState(false)
  const [penaltyResult, setPenaltyResult] = useState(null)

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    let canvas = frozenCanvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      frozenCanvasRef.current = canvas
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    setFrozenFrame(canvas)
  }, [])

  const {
    ready: rpsReady,
    error: rpsError,
    detection: rpsDetection,
    recognizeBurst,
    resetStability,
  } = useRpsDetection(videoRef, {
    enabled: true,
    active: true,
    playerLockRef,
  })

  const {
    ready: holisticReady,
    error: holisticError,
    detection: penaltyDetection,
  } = useHolisticPenalty(videoRef, {
    enabled: penaltyActive,
    playerLockRef,
  })

  const ready = penaltyActive ? (holisticReady && rpsReady) : rpsReady
  const error = penaltyActive ? (holisticError || rpsError) : rpsError
  const detection = penaltyActive 
    ? {
        ...penaltyDetection,
        player1: rpsDetection.player1 || penaltyDetection.player1,
        player2: rpsDetection.player2 || penaltyDetection.player2,
      } 
    : rpsDetection

  const {
    phase,
    countdownLabel,
    roundResult,
    scores,
    newRound,
    resetScores,
    awardPenaltyWinner,
  } = useGameFlow({
    detection,
    recognizeBurst,
    onCaptureFrame: captureFrame,
    playerLockRef,
    resetStability,
    paused: penaltyActive,
  })

  const handlePenaltyFinish = useCallback(
    (result) => {
      setPenaltyResult(result)
      if (result.winner !== 'tie') {
        awardPenaltyWinner(result.winner)
      }
    },
    [awardPenaltyWinner],
  )

  const {
    timeLeft: penaltyTime,
    scores: billeteScores,
    bills,
    status: penaltyStatus,
    billSize,
  } = usePenaltyGame({
    active: penaltyActive,
    detection,
    onFinish: handlePenaltyFinish,
  })

  const handleNewRound = () => {
    setFrozenFrame(null)
    setPenaltyActive(false)
    setPenaltyResult(null)
    newRound()
  }

  const handleStartPenalty = () => {
    setFrozenFrame(null)
    setPenaltyResult(null)
    if (detection.assignment) {
      playerLockRef.current = createPlayerLock(detection.assignment)
    }
    setPenaltyActive(true)
  }

  const handlePenaltyContinue = () => {
    setPenaltyActive(false)
    setPenaltyResult(null)
    newRound()
  }

  const frozen =
    (phase === PHASE.RESULT || phase === PHASE.CAPTURE) && !penaltyActive
  const p1Detected = Boolean(detection.player1)
  const p2Detected = Boolean(detection.player2)
  const bothReady = detection.handsStable || bothHandsDetected(detection.assignment)

  const displayGesture1 = penaltyActive
    ? null
    : phase === PHASE.RESULT
      ? roundResult?.gestures?.player1
      : detection.player1?.gesture
  const displayGesture2 = penaltyActive
    ? null
    : phase === PHASE.RESULT
      ? roundResult?.gestures?.player2
      : detection.player2?.gesture

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <h1 className="text-lg font-bold text-white">Piedra · Papel · Tijera</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetScores}
            className="rounded-lg px-3 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Reiniciar puntos
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-3 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Cambiar nombres
          </button>
        </div>
      </header>

      {!ready && !error && (
        <p className="py-4 text-center text-slate-400 animate-pulse-ring">
          {penaltyActive
            ? 'Cargando MediaPipe Holistic (penitencia)…'
            : 'Cargando modelo RPS (.task)…'}
        </p>
      )}
      {error && (
        <p className="py-4 text-center text-red-400">
          Error al cargar MediaPipe: {error}
        </p>
      )}

      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 lg:flex-row lg:items-stretch lg:justify-center">
        <PlayerPanel
          side="left"
          name={names.player1}
          detected={p1Detected}
          gesture={displayGesture1}
          score={scores.player1}
          phase={phase === PHASE.RESULT ? 'result' : 'play'}
          penaltyMode={penaltyActive}
          billetes={billeteScores.player1}
        />

        <div className="relative flex flex-1 flex-col items-center justify-center">
          <Camera
            ref={videoRef}
            detection={detection}
            phase={penaltyActive ? 'penalty' : phase}
            frozen={frozen}
            frozenFrame={frozenFrame}
          />

          <PenaltyOverlay
            visible={penaltyActive}
            status={penaltyStatus}
            timeLeft={penaltyTime}
            scores={billeteScores}
            bills={bills}
            billSize={billSize}
            player1Name={names.player1}
            player2Name={names.player2}
            penaltyResult={penaltyResult}
            onContinue={handlePenaltyContinue}
          />

          <Countdown
            visible={phase === PHASE.COUNTDOWN && !penaltyActive}
            label={countdownLabel}
            stabilityRatio={detection.stabilityRatio}
          />

          <ResultOverlay
            visible={phase === PHASE.RESULT && !penaltyActive}
            roundResult={roundResult}
            player1Name={names.player1}
            player2Name={names.player2}
            onNewRound={handleNewRound}
            onStartPenalty={handleStartPenalty}
          />

          {penaltyActive && penaltyStatus === 'playing' && (
            <p className="mt-3 text-center text-sm font-bold text-amber-400">
              Solo billetes: acerca la mano al billete para cogerlo
            </p>
          )}

          {phase === PHASE.WAITING && !penaltyActive && (
            <p
              className={`mt-3 text-center text-sm font-medium ${
                bothReady ? 'text-green-400' : 'text-amber-400'
              }`}
            >
              {bothReady
                ? '¡Ambas manos estables! Preparando cuenta atrás…'
                : 'Coloca ambas manos quietas en tu zona (izq. / der.)…'}
            </p>
          )}

          {phase === PHASE.COUNTDOWN && !penaltyActive && (
            <p className="mt-3 text-center text-sm font-medium text-slate-300">
              Mantén las manos visibles · al &quot;¡YA!&quot; muestra piedra, papel o tijera
            </p>
          )}
        </div>

        <PlayerPanel
          side="right"
          name={names.player2}
          detected={p2Detected}
          gesture={displayGesture2}
          score={scores.player2}
          phase={phase === PHASE.RESULT ? 'result' : 'play'}
          penaltyMode={penaltyActive}
          billetes={billeteScores.player2}
        />
      </main>
    </div>
  )
}

export default function App() {
  const [started, setStarted] = useState(false)
  const [names, setNames] = useState({ player1: 'Jugador 1', player2: 'Jugador 2' })

  if (!started) {
    return (
      <NameSetup
        onStart={(n) => {
          setNames(n)
          setStarted(true)
        }}
      />
    )
  }

  return (
    <Game
      names={names}
      onBack={() => setStarted(false)}
    />
  )
}
