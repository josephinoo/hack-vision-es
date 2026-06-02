import { useCallback, useEffect, useRef, useState } from 'react'
import Camera from './components/Camera'
import PlayerPanel from './components/PlayerPanel'
import Countdown from './components/Countdown'
import ResultOverlay from './components/ResultOverlay'
import CatchRainOverlay from './components/tiebreakers/CatchRainOverlay'
import MaletinOverlay from './components/MaletinOverlay'
import GameShell from './components/GameShell'
import GameHeader, { HeaderButton } from './components/GameHeader'
import { HeroHands } from './components/decor/FloatingHands'
import { useRpsDetection } from './hooks/useRpsDetection'
import { useHolisticPenalty } from './hooks/useHolisticPenalty'
import { useGameFlow, PHASE } from './hooks/useGameFlow'
import { useCatchRainGame } from './hooks/useCatchRainGame'
import { useOperacionMaletin } from './hooks/useOperacionMaletin'
import { getTieBreaker, DEFAULT_TIE_BREAKER_ID } from './tiebreakers/registry'
import { cazaSobresTieBreaker } from './tiebreakers/cazaSobres'
import { DEV_ALWAYS_MALETIN } from './tiebreakers/operacionMaletin'
import { bothHandsDetected, createPlayerLock } from './utils/assignPlayers'
import { warmupGameAudio } from './utils/gameSfx'

function NameSetup({ onStart }) {
  const [p1, setP1] = useState('Jugador 1')
  const [p2, setP2] = useState('Jugador 2')

  return (
    <GameShell className="items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-lg">
        <HeroHands />

        <div className="card-sticker mt-2 p-8 sm:p-10">
          <p className="text-center font-display text-sm font-semibold uppercase tracking-[0.2em] text-[var(--coral)]">
            Salón de juegos
          </p>
          <h1 className="mt-2 text-center font-display text-4xl font-bold leading-[1.05] text-[var(--ink)] sm:text-5xl">
            Piedra, Papel
            <br />
            <span className="text-[var(--p1)]">o</span>{' '}
            <span className="text-[var(--p2)]">Tijera</span>
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-center text-base font-semibold leading-relaxed text-[var(--ink-soft)]">
            Dos jugadores, una cámara. Izquierda contra derecha — ¡sin trampas!
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-display text-sm font-bold text-[var(--p1)]">
                Jugador 1 · lado izquierdo
              </span>
              <input
                type="text"
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                className="input-play"
                maxLength={20}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-display text-sm font-bold text-[var(--p2)]">
                Jugador 2 · lado derecho
              </span>
              <input
                type="text"
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                className="input-play input-play--p2"
                maxLength={20}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() =>
              onStart({
                player1: p1.trim() || 'Jugador 1',
                player2: p2.trim() || 'Jugador 2',
              })
            }
            className="btn-play btn-play--primary mt-8 w-full py-3.5"
          >
            ¡A jugar!
          </button>
        </div>

        <p className="mt-6 text-center text-sm font-semibold text-[var(--ink-soft)]">
          Necesitas cámara web · colocaos frente al monitor, uno a cada lado
        </p>
      </div>
    </GameShell>
  )
}

function Game({ names, onBack }) {
  const videoRef = useRef(null)
  const playerLockRef = useRef(null)
  const frozenCanvasRef = useRef(null)
  const [frozenFrame, setFrozenFrame] = useState(null)
  const [tieBreakerId, setTieBreakerId] = useState(null)
  const [tieBreakerResult, setTieBreakerResult] = useState(null)

  const tieBreaker = tieBreakerId ? getTieBreaker(tieBreakerId) : null
  const isCatchRain = Boolean(tieBreaker?.gameConfig)
  const isMaletin = tieBreaker?.kind === 'maletin'
  const tieBreakerActive = Boolean(tieBreakerId && tieBreaker?.implemented)
  const catchConfig = tieBreaker?.gameConfig ?? cazaSobresTieBreaker.gameConfig

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
    detection: holisticDetection,
  } = useHolisticPenalty(videoRef, {
    enabled: tieBreakerActive && tieBreaker?.requiresHandTracking,
    playerLockRef,
  })

  const ready =
    tieBreakerActive && tieBreaker?.requiresHandTracking
      ? holisticReady && rpsReady
      : rpsReady
  const error =
    tieBreakerActive && tieBreaker?.requiresHandTracking
      ? holisticError || rpsError
      : rpsError

  const detection = tieBreakerActive
    ? {
        ...holisticDetection,
        player1: rpsDetection.player1 || holisticDetection.player1,
        player2: rpsDetection.player2 || holisticDetection.player2,
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
    paused: tieBreakerActive,
  })

  const handleTieBreakerFinish = useCallback(
    (result) => {
      setTieBreakerResult(result)
      if (result.winner !== 'tie') {
        awardPenaltyWinner(result.winner)
      }
    },
    [awardPenaltyWinner],
  )

  const {
    timeLeft: tieTimeLeft,
    scores: catchScores,
    items: catchItems,
    burstEffects,
    burstMs,
    bombToBoomMs,
    status: tieStatus,
    itemSize,
    scoreLabel,
  } = useCatchRainGame({
    active: tieBreakerActive && isCatchRain,
    detection,
    config: catchConfig,
    onFinish: handleTieBreakerFinish,
  })

  const maletin = useOperacionMaletin({
    active: tieBreakerActive && isMaletin,
    detection,
    config: tieBreaker?.maletinConfig,
    onFinish: handleTieBreakerFinish,
  })

  const handleNewRound = () => {
    setFrozenFrame(null)
    setTieBreakerId(null)
    setTieBreakerResult(null)
    newRound()
  }

  const handleStartTieBreaker = useCallback(
    (id) => {
    const def = getTieBreaker(id)
    if (!def?.implemented) return
    if (!def.gameConfig && def.kind !== 'maletin') return

    warmupGameAudio()

    setFrozenFrame(null)
    setTieBreakerResult(null)
    if (detection.assignment) {
      playerLockRef.current = createPlayerLock(detection.assignment)
    }
    setTieBreakerId(id)
  },
    [detection.assignment],
  )

  const handleTieBreakerContinue = () => {
    setTieBreakerId(null)
    setTieBreakerResult(null)
    newRound()
  }

  // Rama desempate-maletin: lanzar #3 siempre para probar
  useEffect(() => {
    if (!DEV_ALWAYS_MALETIN) return
    const t = setTimeout(() => handleStartTieBreaker('operacion-maletin'), 1800)
    return () => clearTimeout(t)
  }, [handleStartTieBreaker])

  useEffect(() => {
    if (DEV_ALWAYS_MALETIN) return
    const isTie =
      phase === PHASE.RESULT &&
      roundResult?.winner === 'tie' &&
      roundResult?.gestures?.player1 &&
      roundResult?.gestures?.player2
    if (!isTie || tieBreakerId) return
    const t = setTimeout(
      () => handleStartTieBreaker(DEFAULT_TIE_BREAKER_ID),
      1300,
    )
    return () => clearTimeout(t)
  }, [phase, roundResult, tieBreakerId, handleStartTieBreaker])

  useEffect(() => {
    if (!DEV_ALWAYS_MALETIN) return
    if (phase !== PHASE.RESULT || tieBreakerId) return
    const t = setTimeout(() => handleStartTieBreaker('operacion-maletin'), 900)
    return () => clearTimeout(t)
  }, [phase, roundResult, tieBreakerId, handleStartTieBreaker])

  const frozen =
    (phase === PHASE.RESULT || phase === PHASE.CAPTURE) && !tieBreakerActive
  const p1Detected = Boolean(detection.player1)
  const p2Detected = Boolean(detection.player2)
  const bothReady = detection.handsStable || bothHandsDetected(detection.assignment)

  const tieScores = isMaletin ? maletin.scores : catchScores

  const displayGesture1 = tieBreakerActive
    ? null
    : phase === PHASE.RESULT
      ? roundResult?.gestures?.player1
      : detection.player1?.gesture
  const displayGesture2 = tieBreakerActive
    ? null
    : phase === PHASE.RESULT
      ? roundResult?.gestures?.player2
      : detection.player2?.gesture

  return (
    <GameShell>
      <GameHeader title="Piedra · Papel · Tijera">
        <HeaderButton onClick={resetScores}>Reiniciar</HeaderButton>
        <HeaderButton onClick={onBack}>Salir</HeaderButton>
      </GameHeader>

      {!ready && !error && (
        <p className="relative z-10 py-4 text-center font-display font-semibold text-[var(--ink-soft)] animate-pulse-ring">
          {tieBreakerActive
            ? `Cargando ${tieBreaker?.title ?? 'desempate'}…`
            : 'Preparando el detector de gestos…'}
        </p>
      )}
      {error && (
        <p className="relative z-10 py-4 text-center font-bold text-[var(--coral)]">
          Error MediaPipe: {error}
        </p>
      )}

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 p-4 lg:flex-row lg:items-stretch lg:p-6">
        <PlayerPanel
          side="left"
          name={names.player1}
          detected={p1Detected}
          gesture={displayGesture1}
          score={scores.player1}
          phase={phase === PHASE.RESULT ? 'result' : 'play'}
          tieBreakerMode={tieBreakerActive}
          tieBreakerScore={tieScores.player1}
          tieBreakerScoreLabel={isMaletin ? 'puntos' : scoreLabel}
          tieBreakerEmoji={tieBreaker?.pickerEmoji}
        />

        <div className="relative flex w-full max-w-3xl flex-1 flex-col items-center justify-center pt-4">
          <Camera
            ref={videoRef}
            detection={detection}
            phase={tieBreakerActive ? 'tiebreaker' : phase}
            frozen={frozen}
            frozenFrame={frozenFrame}
            tieBreakerHint={tieBreaker?.bannerPlaying}
          />

          <CatchRainOverlay
            visible={tieBreakerActive && isCatchRain}
            tieBreaker={tieBreaker}
            status={tieStatus}
            timeLeft={tieTimeLeft}
            scores={catchScores}
            items={catchItems}
            burstEffects={burstEffects}
            burstMs={burstMs}
            bombToBoomMs={bombToBoomMs}
            itemSize={itemSize}
            scoreLabel={scoreLabel}
            player1Name={names.player1}
            player2Name={names.player2}
            finishResult={tieBreakerResult}
            onContinue={handleTieBreakerContinue}
          />

          <MaletinOverlay
            visible={tieBreakerActive && isMaletin}
            tieBreaker={tieBreaker}
            status={maletin.status}
            items={maletin.items}
            scores={maletin.scores}
            health={maletin.health}
            maxHealth={maletin.maxHealth}
            timeLeft={maletin.timeLeft}
            briefcaseSize={maletin.briefcaseSize}
            itemImageSrc={maletin.itemImageSrc}
            player1Name={names.player1}
            player2Name={names.player2}
            finishResult={tieBreakerResult}
            onContinue={handleTieBreakerContinue}
          />

          <Countdown
            visible={phase === PHASE.COUNTDOWN && !tieBreakerActive}
            label={countdownLabel}
            stabilityRatio={detection.stabilityRatio}
          />

          <ResultOverlay
            visible={phase === PHASE.RESULT && !tieBreakerActive}
            roundResult={roundResult}
            player1Name={names.player1}
            player2Name={names.player2}
            onNewRound={handleNewRound}
            onStartTieBreaker={handleStartTieBreaker}
          />

          {tieBreakerActive && isCatchRain && tieStatus === 'playing' && (
            <p className="status-chip status-chip--wait mt-4">
              {tieBreaker?.bannerPlaying}
            </p>
          )}

          {DEV_ALWAYS_MALETIN && !tieBreakerActive && phase === PHASE.WAITING && (
            <p className="status-chip status-chip--ready mt-4">
              Modo prueba: Operación Maletín en breve…
            </p>
          )}

          {phase === PHASE.WAITING && !tieBreakerActive && (
            <p
              className={`status-chip mt-4 ${
                bothReady ? 'status-chip--ready' : 'status-chip--wait'
              }`}
            >
              {bothReady
                ? '¡Manos listas! Cuenta atrás en breve…'
                : 'Quietas en vuestra zona (izq. / der.)…'}
            </p>
          )}

          {phase === PHASE.COUNTDOWN && !tieBreakerActive && (
            <p className="mt-4 text-center text-sm font-bold text-[var(--ink-soft)]">
              Al «¡YA!» — piedra, papel o tijera
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
          tieBreakerMode={tieBreakerActive}
          tieBreakerScore={tieScores.player2}
          tieBreakerScoreLabel={isMaletin ? 'puntos' : scoreLabel}
          tieBreakerEmoji={tieBreaker?.pickerEmoji}
        />
      </main>
    </GameShell>
  )
}

/** Deeplink: ?game=maletin (o #maletin) salta el setup y arranca el desafío. */
function getDeepLinkGame() {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  const g = (q.get('game') || window.location.hash.replace('#', '')).toLowerCase()
  return g || null
}

export default function App() {
  const [deepLink] = useState(getDeepLinkGame)
  const [started, setStarted] = useState(() => deepLink === 'maletin')
  const [names, setNames] = useState({ player1: 'Ábalos', player2: 'Koldo' })

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

  return <Game names={names} onBack={() => setStarted(false)} />
}
