import { GESTURE_EMOJI, GESTURE_LABEL_ES } from '../utils/gameLogic'
import TieBreakerPicker from './tiebreakers/TieBreakerPicker'
import { DEFAULT_TIE_BREAKER_ID } from '../tiebreakers/registry'

export default function ResultOverlay({
  visible,
  roundResult,
  player1Name,
  player2Name,
  onNewRound,
  onStartTieBreaker,
}) {
  if (!visible || !roundResult) return null

  const { gestures, winner } = roundResult
  const g1 = gestures.player1
  const g2 = gestures.player2
  const isTie = winner === 'tie' && g1 && g2

  let title = ''
  let subtitle = ''
  let emoji = ''

  if (!g1 || !g2) {
    title = '¡Ups! Sin gesto'
    subtitle = 'Muéstralo bien: piedra, papel o tijera'
    emoji = '🤔'
  } else if (isTie) {
    title = '¡Empate!'
    subtitle = 'Operación Maletín en breve — ¡no cogáis el tanga!'
    emoji = '🤝'
  } else if (winner === 'player1') {
    title = `¡${player1Name} gana!`
    subtitle = `${GESTURE_LABEL_ES[g1]} le gana a ${GESTURE_LABEL_ES[g2]}`
    emoji = '🏆'
  } else {
    title = `¡${player2Name} gana!`
    subtitle = `${GESTURE_LABEL_ES[g2]} le gana a ${GESTURE_LABEL_ES[g1]}`
    emoji = '🏆'
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-[var(--ink)]/40 p-4 backdrop-blur-[2px]">
      <div className="card-sticker animate-bounce-in mx-auto my-4 w-full max-w-lg p-8 text-center">
        <p className="text-7xl leading-none" aria-hidden>
          {emoji}
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold text-[var(--ink)]">{title}</h2>
        <p className="mt-2 font-semibold text-[var(--ink-soft)]">{subtitle}</p>

        <div className="mt-8 flex items-center justify-center gap-4 sm:gap-8">
          <div className="card-sticker card-sticker--p1 flex-1 max-w-[140px] px-3 py-4">
            <p className="truncate font-display text-sm font-bold text-[var(--p1)]">
              {player1Name}
            </p>
            <p className="mt-1 text-5xl">{g1 ? GESTURE_EMOJI[g1] : '❓'}</p>
            <p className="mt-1 text-xs font-bold text-[var(--ink-soft)]">
              {g1 ? GESTURE_LABEL_ES[g1] : '—'}
            </p>
          </div>

          <span className="font-display text-2xl font-bold text-[var(--ink)]">VS</span>

          <div className="card-sticker card-sticker--p2 flex-1 max-w-[140px] px-3 py-4">
            <p className="truncate font-display text-sm font-bold text-[var(--p2)]">
              {player2Name}
            </p>
            <p className="mt-1 text-5xl">{g2 ? GESTURE_EMOJI[g2] : '❓'}</p>
            <p className="mt-1 text-xs font-bold text-[var(--ink-soft)]">
              {g2 ? GESTURE_LABEL_ES[g2] : '—'}
            </p>
          </div>
        </div>

        {isTie ? (
          <>
            <button
              type="button"
              onClick={() => onStartTieBreaker(DEFAULT_TIE_BREAKER_ID)}
              className="btn-play btn-play--coral mt-8 w-full max-w-xs px-8 py-3"
            >
              Caza de Sobres ✉️ (#4) →
            </button>
            <TieBreakerPicker
              onSelect={onStartTieBreaker}
              onSkip={onNewRound}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={onNewRound}
            className="btn-play btn-play--primary mt-8 w-full max-w-xs px-8 py-3"
          >
            Otra ronda →
          </button>
        )}
      </div>
    </div>
  )
}
