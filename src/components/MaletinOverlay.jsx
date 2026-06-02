import { MALETIN_DECOYS } from '../tiebreakers/operacionMaletin'

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

/** Título grande: qué suma y qué resta. */
function ScoringTitle() {
  const decoys = MALETIN_DECOYS.map((d) => d.emoji).join(' ')
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex flex-col items-center gap-1 bg-[var(--ink)]/80 px-3 py-2 text-center backdrop-blur-sm">
      <p className="font-display text-base font-black uppercase tracking-wide text-[#5ef0a8] sm:text-xl">
        Suma puntos con 💼
      </p>
      <p className="font-display text-base font-black uppercase tracking-wide text-[#ff6b6b] sm:text-xl">
        Pierde puntos con <span className="text-2xl align-middle">{decoys}</span>
      </p>
    </div>
  )
}

/**
 * Overlay Desempate #3 — supervivencia: maletines suman, señuelos restan y quitan vida.
 * El "stage" replica el tamaño de la cámara para que los elementos solo salgan dentro.
 */
export default function MaletinOverlay({
  visible,
  tieBreaker,
  status,
  items = [],
  scores = { player1: 0, player2: 0 },
  health = { player1: 3, player2: 3 },
  maxHealth = 3,
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

  if (status === 'finished' && finishResult) {
    const final = finishResult.scores ?? scores
    let subtitle = ''
    if (finishResult.reason === 'ko') {
      const winnerName = resolvedWinner === 'player1' ? player1Name : player2Name
      subtitle =
        resolvedWinner === 'tie'
          ? '¡Ambos sin vida a la vez! Empate trágico'
          : `El rival se quedó sin vida — ¡gana ${winnerName}!`
    } else if (resolvedWinner === 'tie') {
      subtitle = `Empate a ${final.player1} puntos`
    } else if (resolvedWinner === 'player1') {
      subtitle = `${player1Name} gana (${final.player1} vs ${final.player2} puntos)`
    } else {
      subtitle = `${player2Name} gana (${final.player2} vs ${final.player1} puntos)`
    }

    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--ink)]/50 p-4">
        <div className="card-sticker animate-bounce-in w-full max-w-lg p-8 text-center">
          <p className="text-6xl" aria-hidden>
            {tieBreaker.pickerEmoji}
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold text-[var(--ink)]">
            {tieBreaker.bannerTitle}
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

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center">
      {/* stage del mismo tamaño que la cámara → confina los elementos */}
      <div className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-2xl">
        <ScoringTitle />

        {/* HUD de vida grande por jugador */}
        {(status === 'playing' || status === 'intro') && (
          <>
            <div className="absolute left-2 top-20 z-40 rounded-2xl border-[3px] border-[var(--p1)] bg-white/95 px-3 py-1.5 shadow-[3px_3px_0_var(--ink)]">
              <div className="font-display text-xs font-bold uppercase text-[var(--p1)]">
                {player1Name}
              </div>
              <Hearts value={health.player1} max={maxHealth} className="text-2xl" />
              <div className="font-display text-lg font-black text-[var(--ink)]">
                {scores.player1} <span className="text-sm">pts</span>
              </div>
            </div>
            <div className="absolute right-2 top-20 z-40 rounded-2xl border-[3px] border-[var(--p2)] bg-white/95 px-3 py-1.5 text-right shadow-[3px_3px_0_var(--ink)]">
              <div className="font-display text-xs font-bold uppercase text-[var(--p2)]">
                {player2Name}
              </div>
              <Hearts value={health.player2} max={maxHealth} className="text-2xl" />
              <div className="font-display text-lg font-black text-[var(--ink)]">
                {scores.player2} <span className="text-sm">pts</span>
              </div>
            </div>
          </>
        )}

        {/* Cronómetro */}
        {status === 'playing' && (
          <div className="absolute left-1/2 top-20 z-40 -translate-x-1/2 rounded-full bg-[var(--sun)] px-4 py-1 font-mono text-xl font-black text-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
            {timeLeft}s
          </div>
        )}

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
                <span className="text-[#0d7a52]">💼 = +1 punto.</span>{' '}
                <span className="text-[var(--coral)]">
                  {MALETIN_DECOYS.map((d) => d.emoji).join(' ')} = −1 punto y −1 vida.
                </span>
                <br />
                ¡Sin vida, pierdes!
              </p>
            </div>
          </div>
        )}

        {/* Elementos (confinados al stage) */}
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
    </div>
  )
}
