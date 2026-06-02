import { GESTURE_EMOJI, GESTURE_LABEL_ES } from '../utils/gameLogic'
import TieBreakerPicker from './tiebreakers/TieBreakerPicker'
import { getTieBreaker } from '../tiebreakers/registry'

export default function ResultOverlay({
  visible,
  roundResult,
  player1Name,
  player2Name,
  onNewRound,
  onStartTieBreaker,
  defaultTieBreakerId,
}) {
  if (!visible || !roundResult) return null

  const { gestures, winner } = roundResult
  const g1 = gestures.player1
  const g2 = gestures.player2
  const isTie = winner === 'tie' && g1 && g2
  const defaultTieBreaker = defaultTieBreakerId
    ? getTieBreaker(defaultTieBreakerId)
    : null

  let content
  if (!g1 || !g2) {
    content = {
      title: 'Ups, sin gesto',
      subtitle: 'Muestralo bien: piedra, papel o tijera',
      emoji: '?',
    }
  } else if (isTie) {
    content = {
      title: 'Empate',
      subtitle: 'Elegid un desempate o seguid jugando',
      emoji: 'VS',
    }
  } else if (winner === 'player1') {
    content = {
      title: `${player1Name} gana`,
      subtitle: `${GESTURE_LABEL_ES[g1]} le gana a ${GESTURE_LABEL_ES[g2]}`,
      emoji: 'WIN',
    }
  } else {
    content = {
      title: `${player2Name} gana`,
      subtitle: `${GESTURE_LABEL_ES[g2]} le gana a ${GESTURE_LABEL_ES[g1]}`,
      emoji: 'WIN',
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-[var(--ink)]/40 p-4 backdrop-blur-[2px]">
      <div className="card-sticker animate-bounce-in mx-auto my-4 w-full max-w-lg p-8 text-center">
        <p className="font-display text-6xl font-bold leading-none text-[var(--coral)]" aria-hidden>
          {content.emoji}
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold text-[var(--ink)]">
          {content.title}
        </h2>
        <p className="mt-2 font-semibold text-[var(--ink-soft)]">{content.subtitle}</p>

        <div className="mt-8 flex items-center justify-center gap-4 sm:gap-8">
          <div className="card-sticker card-sticker--p1 max-w-[140px] flex-1 px-3 py-4">
            <p className="truncate font-display text-sm font-bold text-[var(--p1)]">
              {player1Name}
            </p>
            <p className="mt-1 text-5xl">{g1 ? GESTURE_EMOJI[g1] : '?'}</p>
            <p className="mt-1 text-xs font-bold text-[var(--ink-soft)]">
              {g1 ? GESTURE_LABEL_ES[g1] : '-'}
            </p>
          </div>

          <span className="font-display text-2xl font-bold text-[var(--ink)]">VS</span>

          <div className="card-sticker card-sticker--p2 max-w-[140px] flex-1 px-3 py-4">
            <p className="truncate font-display text-sm font-bold text-[var(--p2)]">
              {player2Name}
            </p>
            <p className="mt-1 text-5xl">{g2 ? GESTURE_EMOJI[g2] : '?'}</p>
            <p className="mt-1 text-xs font-bold text-[var(--ink-soft)]">
              {g2 ? GESTURE_LABEL_ES[g2] : '-'}
            </p>
          </div>
        </div>

        {isTie ? (
          <>
            <button
              type="button"
              onClick={() => onStartTieBreaker(defaultTieBreakerId)}
              className="btn-play btn-play--coral mt-8 w-full max-w-xs px-8 py-3"
            >
              {defaultTieBreaker
                ? `${defaultTieBreaker.title} (#${defaultTieBreaker.number})`
                : 'Desempate'}
            </button>
            <TieBreakerPicker onSelect={onStartTieBreaker} onSkip={onNewRound} />
          </>
        ) : (
          <button
            type="button"
            onClick={onNewRound}
            className="btn-play btn-play--primary mt-8 w-full max-w-xs px-8 py-3"
          >
            Otra ronda
          </button>
        )}
      </div>
    </div>
  )
}
