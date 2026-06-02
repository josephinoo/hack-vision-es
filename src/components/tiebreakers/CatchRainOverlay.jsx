/**
 * Overlay genérico para desempates tipo “lluvia + coger con la mano”.
 * @param {{ visible: boolean, tieBreaker: import('../../tiebreakers/types.js').TieBreakerDefinition, status: string, timeLeft: number, scores: object, items: object[], itemSize: number, scoreLabel: string, player1Name: string, player2Name: string, onContinue: () => void, finishResult: object | null }} props
 */
export default function CatchRainOverlay({
  visible,
  tieBreaker,
  status,
  timeLeft,
  scores,
  items,
  itemSize,
  scoreLabel,
  player1Name,
  player2Name,
  onContinue,
  finishResult,
}) {
  if (!visible || !tieBreaker) return null

  if (status === 'finished' && finishResult) {
    const { winner, scores: final } = finishResult
    let subtitle = ''

    if (winner === 'tie') {
      subtitle = `Empate: ${final.player1} – ${final.player2} ${scoreLabel}`
    } else if (winner === 'player1') {
      subtitle = `${player1Name} gana el desempate (${final.player1} vs ${final.player2} ${scoreLabel})`
    } else {
      subtitle = `${player2Name} gana el desempate (${final.player2} vs ${final.player1} ${scoreLabel})`
    }

    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--ink)]/50 p-4">
        <div className="card-sticker animate-bounce-in w-full max-w-lg p-8 text-center">
          <p className="text-6xl" aria-hidden>
            {tieBreaker.pickerEmoji}
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold text-[var(--ink)]">
            ¡Tiempo!
          </h2>
          <p className="mt-2 font-semibold text-[var(--ink-soft)]">{subtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 font-display text-lg font-bold">
            <span className="rounded-full border-2 border-[var(--p1)] bg-[var(--p1-light)] px-4 py-1 text-[var(--p1)]">
              {player1Name}: {final.player1}
            </span>
            <span className="rounded-full border-2 border-[var(--p2)] bg-[var(--p2-light)] px-4 py-1 text-[var(--p2)]">
              {player2Name}: {final.player2}
            </span>
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

  const isMassiveRain = tieBreaker.id === 'caza-sobres'

  return (
    <div className="absolute inset-0 z-40 overflow-hidden rounded-2xl">
      {isMassiveRain && status === 'playing' && (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden
          style={{
            background:
              'repeating-linear-gradient(180deg, transparent, transparent 12px, rgba(255,209,102,0.15) 12px, rgba(255,209,102,0.15) 24px)',
          }}
        />
      )}

      <div className="absolute left-0 right-0 top-0 z-50 border-b-[3px] border-[var(--ink)] bg-[var(--sun)] px-3 py-2.5 text-center shadow-[0_4px_0_var(--ink)]">
        <p className="font-display text-lg font-bold uppercase tracking-wide text-[var(--ink)]">
          {tieBreaker.bannerTitle}
        </p>
        {status === 'intro' ? (
          <p className="text-sm font-bold text-[var(--ink-soft)]">{tieBreaker.bannerIntro}</p>
        ) : (
          <p className="text-sm font-bold text-[var(--ink-soft)]">
            {tieBreaker.bannerPlaying} · {timeLeft}s
          </p>
        )}
      </div>

      <div className="absolute left-2 top-[4.5rem] z-50 rounded-full border-2 border-[var(--ink)] bg-white px-3 py-1 font-display text-sm font-bold text-[var(--p1)] shadow-[2px_2px_0_var(--ink)]">
        {player1Name}: {scores.player1}
      </div>
      <div className="absolute right-2 top-[4.5rem] z-50 rounded-full border-2 border-[var(--ink)] bg-white px-3 py-1 font-display text-sm font-bold text-[var(--p2)] shadow-[2px_2px_0_var(--ink)]">
        {player2Name}: {scores.player2}
      </div>

      {status === 'intro' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
          <div className="animate-bounce-in max-w-sm px-6 text-center">
            <p className="text-7xl leading-none animate-wiggle" aria-hidden>
              {tieBreaker.pickerEmoji}
            </p>
            {isMassiveRain && (
              <p className="mt-2 text-4xl leading-tight" aria-hidden>
                ✉️ ✉️ 💣
              </p>
            )}
            <p className="mt-4 font-display text-3xl font-bold text-[var(--ink)]">¡Empate!</p>
            <p className="mt-2 text-lg font-bold text-[var(--ink-soft)]">
              {tieBreaker.bannerIntro}
            </p>
            <p className="mt-3 font-display text-sm font-semibold uppercase tracking-widest text-[var(--coral)]">
              ¿Listos?
            </p>
          </div>
        </div>
      )}

      {status === 'playing' &&
        items.map((item) => (
          <span
            key={item.id}
            className={`pointer-events-none absolute z-30 select-none leading-none ${
              item.kind === 'bomb'
                ? 'drop-shadow-[0_0_10px_rgba(255,80,80,0.9)]'
                : 'drop-shadow-[0_2px_4px_rgba(45,49,66,0.25)]'
            }`}
            style={{
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              fontSize: item.kind === 'bomb' ? itemSize * 1.05 : itemSize,
              transform: `translate(-50%, -50%) rotate(${item.rotation + Math.sin(item.wobble) * 8}deg)`,
            }}
          >
            {item.imageSrc ? (
              <img
                src={item.imageSrc}
                alt=""
                className="object-contain drop-shadow-lg"
                style={{ width: itemSize, height: 'auto' }}
              />
            ) : (
              item.emoji
            )}
          </span>
        ))}
    </div>
  )
}
