import { memo } from 'react'
import { MALETIN_DECOYS } from '../tiebreakers/operacionMaletin'

const DECOY_EMOJIS = MALETIN_DECOYS.map((d) => d.emoji).join(' ')

function Hearts({ value, max, className = '' }) {
  return (
    <span className={`leading-none ${className}`} aria-label={`${value} de ${max} vidas`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < value ? '' : 'opacity-20 grayscale'}>
          {'\u2764\uFE0F'}
        </span>
      ))}
    </span>
  )
}

/** Progreso visual: hasta winScore maletines llenos (billete + 💼). */
function BriefcaseTrack({ filled, max, itemImageSrc }) {
  const count = Math.max(0, Math.min(max, filled))
  return (
    <div
      className="flex items-center justify-center gap-1.5"
      role="img"
      aria-label={`${count} de ${max} maletines`}
    >
      {Array.from({ length: max }).map((_, i) => {
        const isFilled = i < count
        return (
          <div
            key={i}
            className={`relative flex h-9 w-10 items-center justify-center rounded-lg border-2 transition-all ${
              isFilled
                ? 'border-[var(--sun)] bg-amber-50 shadow-[2px_2px_0_var(--ink)]'
                : 'border-[var(--ink)]/20 bg-white/70 opacity-45'
            }`}
          >
            <span className="absolute -top-1.5 text-base leading-none" aria-hidden>
              💼
            </span>
            {isFilled ? (
              <img
                src={itemImageSrc}
                alt=""
                className="mt-1 h-5 w-auto object-contain"
              />
            ) : (
              <span className="mt-1 text-[10px] font-bold text-[var(--ink-soft)]">···</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ScoringTitle({ itemImageSrc, winScore }) {
  return (
    <div className="w-full rounded-xl border-2 border-[var(--ink)] bg-[var(--ink)]/90 px-3 py-2 text-center shadow-[3px_3px_0_var(--ink)] backdrop-blur-sm">
      <p className="font-display text-sm font-black uppercase tracking-wide text-[#5ef0a8] sm:text-base">
        Suma puntos con{' '}
        <span className="inline-flex items-center gap-0.5 align-middle">
          <span className="text-xl leading-none">💼</span>
          <img src={itemImageSrc} alt="" className="h-5 w-auto object-contain" />
        </span>
        <span className="text-[var(--sun)]"> — primero en {winScore} gana</span>
      </p>
      <p className="mt-0.5 font-display text-sm font-black uppercase tracking-wide text-[#ff6b6b] sm:text-base">
        Pierde con <span className="text-xl align-middle">{DECOY_EMOJIS}</span>
      </p>
    </div>
  )
}

function PlayerHudCard({
  name,
  side,
  score,
  health,
  maxHealth,
  winScore,
  itemImageSrc,
}) {
  const border = side === 'left' ? 'border-[var(--p1)]' : 'border-[var(--p2)]'
  const nameColor = side === 'left' ? 'text-[var(--p1)]' : 'text-[var(--p2)]'
  const align = side === 'right' ? 'text-right' : ''

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col gap-1 rounded-2xl border-[3px] ${border} bg-white/95 px-3 py-2 shadow-[3px_3px_0_var(--ink)] ${align}`}
    >
      <div className={`font-display text-xs font-bold uppercase sm:text-sm ${nameColor}`}>
        {name}
      </div>
      <BriefcaseTrack filled={score} max={winScore} itemImageSrc={itemImageSrc} />
      <Hearts value={health} max={maxHealth} className="text-xl sm:text-2xl" />
    </div>
  )
}

function MaletinHudBar({
  status,
  scores,
  health,
  maxHealth,
  winScore,
  timeLeft,
  itemImageSrc,
  player1Name,
  player2Name,
}) {
  if (status !== 'playing' && status !== 'intro') return null

  return (
    <div className="pointer-events-none z-40 flex w-full max-w-3xl shrink-0 flex-col gap-2">
      <ScoringTitle itemImageSrc={itemImageSrc} winScore={winScore} />
      <div className="flex w-full items-stretch gap-2">
        <PlayerHudCard
          side="left"
          name={player1Name}
          score={scores.player1}
          health={health.player1}
          maxHealth={maxHealth}
          winScore={winScore}
          itemImageSrc={itemImageSrc}
        />
        {status === 'playing' && (
          <div className="flex shrink-0 flex-col items-center justify-center self-center rounded-full bg-[var(--sun)] px-3 py-2 font-mono text-lg font-black text-[var(--ink)] shadow-[2px_2px_0_var(--ink)] sm:text-xl">
            {timeLeft}s
          </div>
        )}
        <PlayerHudCard
          side="right"
          name={player2Name}
          score={scores.player2}
          health={health.player2}
          maxHealth={maxHealth}
          winScore={winScore}
          itemImageSrc={itemImageSrc}
        />
      </div>
    </div>
  )
}

function MaletinFinishModal({
  tieBreaker,
  finishResult,
  scores,
  winScore,
  itemImageSrc,
  player1Name,
  player2Name,
  resolvedWinner,
  onContinue,
}) {
  const final = finishResult.scores ?? scores
  const subtitle = (() => {
    if (finishResult.reason === 'race') {
      const winnerName =
        resolvedWinner === 'player1' ? player1Name : player2Name
      return `¡${winnerName} completa los ${winScore} maletines!`
    }
    if (finishResult.reason === 'ko') {
      const winnerName =
        resolvedWinner === 'player1' ? player1Name : player2Name
      return resolvedWinner === 'tie'
        ? '¡Ambos sin vida a la vez! Empate trágico'
        : `El rival se quedó sin vida — ¡gana ${winnerName}!`
    }
    if (resolvedWinner === 'tie') {
      return `Tiempo — empate a ${final.player1} maletines`
    }
    const winnerName =
      resolvedWinner === 'player1' ? player1Name : player2Name
    const w = final[resolvedWinner]
    const l = final[resolvedWinner === 'player1' ? 'player2' : 'player1']
    return `Tiempo — gana ${winnerName} (${w} vs ${l} maletines)`
  })()

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/50 p-4">
      <div className="card-sticker animate-bounce-in pointer-events-auto w-full max-w-lg p-8 text-center">
        <p className="text-6xl" aria-hidden>
          {tieBreaker.pickerEmoji}
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold text-[var(--ink)]">
          {tieBreaker.bannerTitle}
        </h2>
        <p className="mt-2 font-semibold text-[var(--ink-soft)]">{subtitle}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-sm font-bold uppercase text-[var(--p1)]">
              {player1Name}
            </span>
            <BriefcaseTrack
              filled={final.player1}
              max={winScore}
              itemImageSrc={itemImageSrc}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-sm font-bold uppercase text-[var(--p2)]">
              {player2Name}
            </span>
            <BriefcaseTrack
              filled={final.player2}
              max={winScore}
              itemImageSrc={itemImageSrc}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="btn-play btn-play--mint mt-8 px-8 py-3"
        >
          Seguir jugando
        </button>
      </div>
    </div>
  )
}

/**
 * Desempate #3 — part="hud" encima de la cámara; part="stage" ítems en el vídeo.
 */
function MaletinOverlay({
  part = 'all',
  visible,
  tieBreaker,
  status,
  items = [],
  scores = { player1: 0, player2: 0 },
  health = { player1: 3, player2: 3 },
  maxHealth = 3,
  winScore = 3,
  timeLeft = 0,
  winner,
  briefcaseSize = 58,
  itemImageSrc = '/images/billete.png',
  player1Name,
  player2Name,
  finishResult,
  onContinue,
}) {
  if (!visible || !tieBreaker) return null

  const resolvedWinner = finishResult?.winner ?? winner

  if (part === 'hud') {
    return (
      <MaletinHudBar
        status={status}
        scores={scores}
        health={health}
        maxHealth={maxHealth}
        winScore={winScore}
        timeLeft={timeLeft}
        itemImageSrc={itemImageSrc}
        player1Name={player1Name}
        player2Name={player2Name}
      />
    )
  }

  if (status === 'finished' && finishResult && part === 'finish') {
    return (
      <MaletinFinishModal
        tieBreaker={tieBreaker}
        finishResult={finishResult}
        scores={scores}
        winScore={winScore}
        itemImageSrc={itemImageSrc}
        player1Name={player1Name}
        player2Name={player2Name}
        resolvedWinner={resolvedWinner}
        onContinue={onContinue}
      />
    )
  }

  if (part !== 'stage') return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-2xl"
      style={{ contain: 'layout paint' }}
    >

      {status === 'intro' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--ink)]/45">
          <div className="card-sticker animate-bounce-in mx-4 max-w-sm p-5 text-center">
            <p className="text-5xl" aria-hidden>
              {tieBreaker.pickerEmoji}
            </p>
            <p className="mt-2 font-display text-xl font-bold text-[var(--ink)]">
              {tieBreaker.bannerTitle}
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink-soft)]">
              <span className="font-bold text-[var(--ink)]">✊ Cierra el puño para coger.</span>
              <br />
              <span className="text-[#0d7a52]">
                💼 = +1 maletín — el primero en {winScore} gana.
              </span>{' '}
              <span className="text-[var(--coral)]">
                {DECOY_EMOJIS} = −1 maletín y −1 vida.
              </span>
              <br />
              ¡Sin vida, pierdes!
            </p>
          </div>
        </div>
      )}

      {status === 'playing' &&
        items.map((item) =>
          item.kind === 'decoy' ? (
            <div
              key={item.id}
              className="absolute z-20 animate-bounce-in"
              style={{
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="flex flex-col items-center rounded-xl border-2 border-[var(--coral)] bg-white px-2 py-1 shadow-[3px_3px_0_var(--ink)]">
                <span className="text-3xl leading-none" aria-hidden>
                  {item.emoji}
                </span>
                <span className="font-display text-[9px] font-bold uppercase text-[var(--coral)]">
                  {item.label}
                </span>
              </div>
            </div>
          ) : (
            <div
              key={item.id}
              className="absolute z-30 animate-bounce-in"
              style={{
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="relative flex flex-col items-center rounded-lg ring-2 ring-[var(--sun)] ring-offset-1 drop-shadow-[3px_3px_0_var(--ink)]">
                <span className="absolute -top-2 text-2xl" aria-hidden>
                  💼
                </span>
                <img
                  src={itemImageSrc}
                  alt="Maletín"
                  className="object-contain"
                  style={{ width: briefcaseSize, height: 'auto' }}
                />
              </div>
            </div>
          ),
        )}
    </div>
  )
}

export default memo(MaletinOverlay)
