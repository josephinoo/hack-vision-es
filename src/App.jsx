import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Camera from './components/Camera'
import PlayerPanel from './components/PlayerPanel'
import Countdown from './components/Countdown'
import ResultOverlay from './components/ResultOverlay'
import CatchRainOverlay from './components/tiebreakers/CatchRainOverlay'
import TwerkingChallenge from './components/TwerkingChallenge'
import MaletinOverlay from './components/MaletinOverlay'
import GameShell from './components/GameShell'
import GameHeader, { HeaderButton } from './components/GameHeader'
import PlayerSelect from './components/PlayerSelect'
import { DEFAULT_ROSTER, rosterToGameNames } from './config/players'
import { useRpsDetection } from './hooks/useRpsDetection'
import { useHolisticPenalty } from './hooks/useHolisticPenalty'
import { useGameFlow, PHASE } from './hooks/useGameFlow'
import { useCatchRainGame } from './hooks/useCatchRainGame'
import { useOperacionMaletin } from './hooks/useOperacionMaletin'
import { getTieBreaker } from './tiebreakers/registry'
import { cazaSobresTieBreaker } from './tiebreakers/cazaSobres'
import { bothHandsDetected, createPlayerLock } from './utils/assignPlayers'
import { warmupGameAudio } from './utils/gameSfx'
import { usePose } from './hooks/usePose'
import { useBombFlash } from './hooks/useBombFlash'
import {
  preloadPlayerAvatars,
  resolvePlayerExpressions,
} from './utils/playerFaceOverlay'

function Game({ names, onBack, deepLinkGame }) {
  const videoRef = useRef(null)
  const playerLockRef = useRef(null)
  const frozenCanvasRef = useRef(null)
  const [frozenFrame, setFrozenFrame] = useState(null)
  const [tieBreakerId, setTieBreakerId] = useState(null)
  const [tieBreakerResult, setTieBreakerResult] = useState(null)
  const [tieBreakersPlayed, setTieBreakersPlayed] = useState(0)

  const nextTieBreakerId =
    tieBreakersPlayed === 0 ? 'caza-sobres' : 'twerking-challenge'
  const tieBreaker = tieBreakerId ? getTieBreaker(tieBreakerId) : null
  const isCatchRainTieBreaker = Boolean(tieBreaker?.gameConfig)
  const isTwerkingTieBreaker = tieBreaker?.componentType === 'twerking'
  const isMaletin = tieBreaker?.kind === 'maletin'
  const tieBreakerActive =
    isCatchRainTieBreaker || isTwerkingTieBreaker || isMaletin
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

  const { detection: poseDetection } = usePose(videoRef, {
    enabled: !isTwerkingTieBreaker,
  })

  useEffect(() => {
    preloadPlayerAvatars([names.player1Avatar, names.player2Avatar])
  }, [names.player1Avatar, names.player2Avatar])

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
        // Holistic primero: RPS a veces asigna la mano derecha siempre a J1
        player1: holisticDetection.player1 || rpsDetection.player1,
        player2: holisticDetection.player2 || rpsDetection.player2,
        assignment:
          holisticDetection.assignment?.player1 && holisticDetection.assignment?.player2
            ? holisticDetection.assignment
            : rpsDetection.assignment,
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
    active: isCatchRainTieBreaker,
    detection,
    config: catchConfig,
    onFinish: handleTieBreakerFinish,
  })

  const maletin = useOperacionMaletin({
    active: isMaletin,
    detection,
    config: tieBreaker?.maletinConfig,
    onFinish: handleTieBreakerFinish,
  })

  const bombFlash = useBombFlash(
    isCatchRainTieBreaker && tieStatus === 'playing',
    catchScores,
  )

  const playerExpressions = useMemo(
    () =>
      resolvePlayerExpressions({
        phase: tieBreakerActive ? 'tiebreaker' : phase,
        roundResult,
        tieBreakerActive,
        tieStatus,
        catchScores,
        bombFlash,
      }),
    [
      phase,
      roundResult,
      tieBreakerActive,
      tieStatus,
      catchScores,
      bombFlash,
    ],
  )

  const getPanelTieScore = (player) => {
    if (isMaletin) return maletin.scores[player]
    if (isTwerkingTieBreaker) {
      return tieBreakerResult?.scores?.[player]?.total ?? 0
    }
    return catchScores[player]
  }

  const panelScoreLabel = isMaletin
    ? 'maletines'
    : isTwerkingTieBreaker
      ? 'twerk pts'
      : scoreLabel

  const handleNewRound = () => {
    setFrozenFrame(null)
    setTieBreakerId(null)
    setTieBreakerResult(null)
    newRound()
  }

  const handleStartTieBreaker = useCallback(
    (id) => {
      const def = getTieBreaker(id)
      const canRun =
        def?.gameConfig ||
        def?.componentType === 'twerking' ||
        def?.kind === 'maletin'
      if (!def?.implemented || !canRun) return

      warmupGameAudio()

      setFrozenFrame(null)
      setTieBreakerResult(null)
      if (detection.assignment) {
        playerLockRef.current = createPlayerLock(detection.assignment)
      }
      setTieBreakersPlayed((count) => count + 1)
      setTieBreakerId(id)
    },
    [detection.assignment],
  )

  // Deeplink ?game=maletin: arranca el desafío una sola vez en cuanto hay detector.
  const didAutoStartRef = useRef(false)
  useEffect(() => {
    if (didAutoStartRef.current || deepLinkGame !== 'maletin' || !ready) return
    didAutoStartRef.current = true
    handleStartTieBreaker('operacion-maletin')
  }, [deepLinkGame, ready, handleStartTieBreaker])

  const handleResetScores = () => {
    resetScores()
    setTieBreakersPlayed(0)
  }

  const handleTieBreakerContinue = () => {
    setTieBreakerId(null)
    setTieBreakerResult(null)
    newRound()
  }

  const frozen =
    (phase === PHASE.RESULT || phase === PHASE.CAPTURE) && !tieBreakerActive
  const p1Detected = Boolean(detection.player1)
  const p2Detected = Boolean(detection.player2)
  const bothReady = detection.handsStable || bothHandsDetected(detection.assignment)

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
        <HeaderButton onClick={handleResetScores}>Reiniciar</HeaderButton>
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
          avatar={names.player1Avatar}
          detected={p1Detected}
          gesture={displayGesture1}
          score={scores.player1}
          phase={phase === PHASE.RESULT ? 'result' : 'play'}
          tieBreakerMode={tieBreakerActive}
          tieBreakerScore={getPanelTieScore('player1')}
          tieBreakerScoreLabel={panelScoreLabel}
          tieBreakerEmoji={tieBreaker?.pickerEmoji}
        />

        <div className="relative flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-2 pt-4">
          {isMaletin && (
            <MaletinOverlay
              part="hud"
              visible={maletin.status !== 'idle'}
              tieBreaker={tieBreaker}
              status={maletin.status}
              scores={maletin.scores}
              health={maletin.health}
              maxHealth={maletin.maxHealth}
              winScore={maletin.winScore}
              timeLeft={maletin.timeLeft}
              itemImageSrc={maletin.itemImageSrc}
              player1Name={names.player1}
              player2Name={names.player2}
            />
          )}

          <Camera
            ref={videoRef}
            detection={detection}
            phase={tieBreakerActive ? 'tiebreaker' : phase}
            frozen={frozen}
            frozenFrame={frozenFrame}
            tieBreakerHint={tieBreaker?.bannerPlaying}
            poseDetection={poseDetection}
            playerAvatars={{
              player1: names.player1Avatar,
              player2: names.player2Avatar,
            }}
            playerExpressions={playerExpressions}
            showPlayerFaces={!isTwerkingTieBreaker}
          />

          <CatchRainOverlay
            visible={isCatchRainTieBreaker}
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

          {isMaletin && (
            <MaletinOverlay
              part="stage"
              visible={maletin.status === 'intro' || maletin.status === 'playing'}
              tieBreaker={tieBreaker}
              status={maletin.status}
              items={maletin.items}
              winScore={maletin.winScore}
              briefcaseSize={maletin.briefcaseSize}
              itemImageSrc={maletin.itemImageSrc}
            />
          )}

          {isMaletin && maletin.status === 'finished' && (
            <MaletinOverlay
              part="finish"
              visible
              tieBreaker={tieBreaker}
              status={maletin.status}
              scores={maletin.scores}
              winScore={maletin.winScore}
              itemImageSrc={maletin.itemImageSrc}
              player1Name={names.player1}
              player2Name={names.player2}
              finishResult={tieBreakerResult}
              onContinue={handleTieBreakerContinue}
            />
          )}

          <TwerkingChallenge
            active={isTwerkingTieBreaker}
            videoRef={videoRef}
            player1Name={names.player1}
            player2Name={names.player2}
            player1Avatar={names.player1Avatar}
            player2Avatar={names.player2Avatar}
            onFinish={handleTieBreakerFinish}
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
            defaultTieBreakerId={nextTieBreakerId}
          />

          {isCatchRainTieBreaker && tieStatus === 'playing' && (
            <p className="status-chip status-chip--wait mt-4">
              {tieBreaker?.bannerPlaying}
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
          avatar={names.player2Avatar}
          detected={p2Detected}
          gesture={displayGesture2}
          score={scores.player2}
          phase={phase === PHASE.RESULT ? 'result' : 'play'}
          tieBreakerMode={tieBreakerActive}
          tieBreakerScore={getPanelTieScore('player2')}
          tieBreakerScoreLabel={panelScoreLabel}
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
  const [names, setNames] = useState(() => rosterToGameNames(DEFAULT_ROSTER))

  if (!started) {
    return (
      <PlayerSelect
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
      deepLinkGame={deepLink}
      onBack={() => setStarted(false)}
    />
  )
}
