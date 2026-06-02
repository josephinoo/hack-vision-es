/**
 * Brief hit feedback: bomb 💣 → 💥, envelope ✨
 */
export default function BurstEffect({
  effect,
  itemSize,
  bombToBoomMs,
  burstMs,
}) {
  const age = Date.now() - effect.createdAt
  const progress = Math.min(1, age / burstMs)

  if (effect.kind === 'bomb') {
    const exploding = age >= bombToBoomMs
    return (
      <span
        className="pointer-events-none absolute z-[35] select-none leading-none"
        style={{
          left: `${effect.x * 100}%`,
          top: `${effect.y * 100}%`,
          fontSize: itemSize * (exploding ? 1.35 : 1.1),
          transform: `translate(-50%, -50%) scale(${exploding ? 0.9 + progress * 0.9 : 1 + (1 - progress) * 0.2})`,
          opacity: exploding ? 1 - progress * 0.85 : 1,
          filter: exploding
            ? 'drop-shadow(0 0 14px rgba(255,90,60,0.95))'
            : 'drop-shadow(0 0 8px rgba(255,80,80,0.8))',
        }}
      >
        {exploding ? '💥' : '💣'}
        {exploding && (
          <span
            className="absolute left-1/2 top-1/2 -z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400/50"
            style={{
              transform: `translate(-50%, -50%) scale(${1.2 + progress * 2})`,
              opacity: 0.6 * (1 - progress),
            }}
            aria-hidden
          />
        )}
      </span>
    )
  }

  return (
    <span
      className="pointer-events-none absolute z-[35] select-none leading-none"
      style={{
        left: `${effect.x * 100}%`,
        top: `${effect.y * 100}%`,
        fontSize: itemSize * 0.85,
        transform: `translate(-50%, -50%) scale(${0.6 + progress * 0.5})`,
        opacity: 1 - progress,
      }}
      aria-hidden
    >
      ✨
    </span>
  )
}
