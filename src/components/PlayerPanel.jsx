import { GESTURE_EMOJI, GESTURE_LABEL_ES } from '../utils/gameLogic'

export default function PlayerPanel({
  side,
  name,
  detected,
  gesture,
  score,
  phase,
}) {
  const isLeft = side === 'left'
  const borderColor = isLeft ? 'border-blue-500' : 'border-red-500'
  const textColor = isLeft ? 'text-blue-400' : 'text-red-400'
  const bgGlow = isLeft ? 'from-blue-500/10' : 'from-red-500/10'

  const gestureLabel = gesture ? GESTURE_LABEL_ES[gesture] : '—'
  const gestureEmoji = gesture ? GESTURE_EMOJI[gesture] : '❓'

  return (
    <aside
      className={`flex w-44 shrink-0 flex-col gap-3 rounded-xl border-2 ${borderColor} bg-gradient-to-b ${bgGlow} to-slate-900/80 p-4`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className={`truncate text-sm font-bold ${textColor}`}>
          {isLeft ? 'J1' : 'J2'}: {name}
        </h2>
        <span
          className={`text-lg ${detected ? 'text-green-400' : 'text-slate-500'}`}
          aria-label={detected ? 'Mano detectada' : 'Mano no detectada'}
        >
          {detected ? '✓' : '✗'}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1 rounded-lg bg-slate-800/60 py-3">
        <span className="text-4xl" aria-hidden>
          {phase === 'result' && gesture ? gestureEmoji : detected ? '👋' : '🖐️'}
        </span>
        <p className="text-center text-sm font-medium text-slate-200">
          {phase === 'result' && gesture ? gestureLabel : 'Esperando gesto'}
        </p>
      </div>

      <p className="text-center text-lg font-bold text-white">
        Puntos: <span className={textColor}>{score}</span>
      </p>

      {isLeft ? (
        <p className="text-center text-xs text-slate-400">← Pon tu mano aquí</p>
      ) : (
        <p className="text-center text-xs text-slate-400">Pon tu mano aquí →</p>
      )}
    </aside>
  )
}
