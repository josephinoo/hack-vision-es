import { GESTURE_EMOJI, GESTURE_LABEL_ES } from '../utils/gameLogic'

export default function ResultOverlay({
  visible,
  roundResult,
  player1Name,
  player2Name,
  onNewRound,
}) {
  if (!visible || !roundResult) return null

  const { gestures, winner } = roundResult
  const g1 = gestures.player1
  const g2 = gestures.player2

  let title = ''
  let subtitle = ''
  let emoji = ''

  if (!g1 || !g2) {
    title = 'Gestos no detectados'
    subtitle = 'Asegúrate de mostrar piedra, papel o tijera claramente'
    emoji = '🤔'
  } else if (winner === 'tie') {
    title = '¡Empate!'
    subtitle = 'Ambos eligieron lo mismo'
    emoji = '🤝'
  } else if (winner === 'player1') {
    title = `¡Gana ${player1Name}!`
    subtitle = `${GESTURE_LABEL_ES[g1]} vence a ${GESTURE_LABEL_ES[g2]}`
    emoji = '🏆'
  } else {
    title = `¡Gana ${player2Name}!`
    subtitle = `${GESTURE_LABEL_ES[g2]} vence a ${GESTURE_LABEL_ES[g1]}`
    emoji = '🏆'
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm">
      <div className="animate-bounce-in mx-4 max-w-lg rounded-2xl border border-slate-600 bg-slate-900 p-8 text-center shadow-2xl">
        <p className="text-6xl" aria-hidden>
          {emoji}
        </p>
        <h2 className="mt-4 text-3xl font-black text-white">{title}</h2>
        <p className="mt-2 text-slate-300">{subtitle}</p>

        <div className="mt-8 flex justify-center gap-8">
          <div className="text-center">
            <p className="text-sm text-blue-400">{player1Name}</p>
            <p className="text-5xl">{g1 ? GESTURE_EMOJI[g1] : '❓'}</p>
            <p className="text-sm text-slate-400">
              {g1 ? GESTURE_LABEL_ES[g1] : 'Sin gesto'}
            </p>
          </div>
          <p className="self-center text-2xl font-bold text-slate-500">VS</p>
          <div className="text-center">
            <p className="text-sm text-red-400">{player2Name}</p>
            <p className="text-5xl">{g2 ? GESTURE_EMOJI[g2] : '❓'}</p>
            <p className="text-sm text-slate-400">
              {g2 ? GESTURE_LABEL_ES[g2] : 'Sin gesto'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewRound}
          className="mt-8 rounded-xl bg-emerald-500 px-8 py-3 text-lg font-bold text-slate-900 transition hover:bg-emerald-400"
        >
          Nueva ronda
        </button>
      </div>
    </div>
  )
}
