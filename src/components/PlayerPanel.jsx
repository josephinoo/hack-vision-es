import { GESTURE_EMOJI, GESTURE_LABEL_ES } from '../utils/gameLogic'
import PlayerAvatar from './PlayerAvatar'

export default function PlayerPanel({
  side,
  name,
  avatar,
  detected,
  gesture,
  score,
  phase,
  tieBreakerMode = false,
  tieBreakerScore = 0,
  tieBreakerScoreLabel = 'objetos',
  tieBreakerEmoji = '💵',
}) {
  const isLeft = side === 'left'
  const cardClass = isLeft ? 'card-sticker card-sticker--p1' : 'card-sticker card-sticker--p2'
  const accent = isLeft ? 'var(--p1)' : 'var(--p2)'
  const label = isLeft ? 'Jugador 1' : 'Jugador 2'

  const gestureLabel = gesture ? GESTURE_LABEL_ES[gesture] : '—'
  const gestureEmoji = gesture ? GESTURE_EMOJI[gesture] : '❓'

  return (
    <aside className={`flex w-44 shrink-0 flex-col gap-3 p-4 sm:w-48 ${cardClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {avatar && (
            <PlayerAvatar src={avatar} name={name} size="sm" accent={accent} />
          )}
          <div className="min-w-0">
            <span
              className="badge-pill mb-1.5"
              style={{ borderColor: accent, color: accent }}
            >
              {label}
            </span>
            <h2 className="truncate font-display text-base font-bold leading-tight text-[var(--ink)]">
              {name}
            </h2>
          </div>
        </div>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] text-sm font-bold ${
            detected
              ? 'bg-[#d8faeb] text-[#0d7a52]'
              : 'bg-[var(--cream-dark)] text-[var(--ink-soft)]'
          }`}
          aria-label={detected ? 'Mano detectada' : 'Mano no detectada'}
        >
          {detected ? '✓' : '?'}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-[var(--ink)]/20 bg-white/70 py-4">
        {tieBreakerMode ? (
          <>
            <span className="text-5xl leading-none" aria-hidden>
              {tieBreakerEmoji}
            </span>
            <p className="font-display text-2xl font-bold text-[var(--ink)]">
              {tieBreakerScore}
            </p>
            <p className="text-center text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
              {tieBreakerScoreLabel}
            </p>
          </>
        ) : (
          <>
            <span className="text-5xl leading-none" aria-hidden>
              {phase === 'result' && gesture ? gestureEmoji : detected ? '👋' : '🖐️'}
            </span>
            <p className="text-center text-sm font-bold text-[var(--ink-soft)]">
              {phase === 'result' && gesture ? gestureLabel : 'Esperando…'}
            </p>
          </>
        )}
      </div>

      <div className="rounded-xl border-2 border-[var(--ink)] bg-white px-3 py-2 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">
          Puntos
        </p>
        <p className="font-display text-3xl font-bold" style={{ color: accent }}>
          {score}
        </p>
      </div>

      <p className="text-center text-xs font-semibold text-[var(--ink-soft)]">
        {tieBreakerMode
          ? isLeft
            ? '← ¡Atrapad!'
            : '¡Atrapad! →'
          : isLeft
            ? '← Tu zona'
            : 'Tu zona →'}
      </p>
    </aside>
  )
}
