export default function Countdown({ label, visible, stabilityRatio }) {
  if (!visible || !label) return null

  const isYa = label === '¡YA!'
  const trackingOk = stabilityRatio == null || stabilityRatio >= 0.35

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div
        className={`animate-bounce-in rounded-2xl px-10 py-6 text-center font-black shadow-2xl ${
          isYa
            ? 'bg-amber-500 text-slate-900 text-6xl md:text-7xl'
            : 'bg-slate-900/80 text-white text-7xl md:text-8xl backdrop-blur-sm'
        }`}
      >
        {isYa ? label : `${label}...`}
      </div>
      {!isYa && !trackingOk && (
        <p className="mt-3 rounded-lg bg-amber-600/90 px-4 py-2 text-sm font-medium text-white">
          Acerca las manos a la cámara
        </p>
      )}
    </div>
  )
}
