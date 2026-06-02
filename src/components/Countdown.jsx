export default function Countdown({ label, visible, stabilityRatio }) {
  if (!visible || !label) return null

  const isYa = label === '¡YA!'
  const trackingOk = stabilityRatio == null || stabilityRatio >= 0.35

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center">
      <div
        className={`animate-bounce-in font-display font-bold ${
          isYa
            ? 'rounded-3xl border-4 border-[var(--ink)] bg-[var(--coral)] px-12 py-8 text-6xl text-white shadow-[8px_8px_0_var(--ink)] md:text-8xl'
            : 'rounded-3xl border-4 border-[var(--ink)] bg-white px-14 py-10 text-7xl text-[var(--ink)] shadow-[8px_8px_0_var(--ink)] md:text-8xl'
        }`}
      >
        {isYa ? label : label}
        {!isYa && (
          <span className="block text-4xl text-[var(--ink-soft)] md:text-5xl">…</span>
        )}
      </div>
      {!isYa && !trackingOk && (
        <p className="status-chip status-chip--wait mt-4 animate-pop">
          Acerca las manos a la cámara
        </p>
      )}
    </div>
  )
}
