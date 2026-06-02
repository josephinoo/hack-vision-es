const BILLETE_SRC = '/images/billete.png'

export default function PenaltyOverlay({
  visible,
  status,
  timeLeft,
  scores,
  bills,
  billSize,
  player1Name,
  player2Name,
  onContinue,
  penaltyResult,
}) {
  if (!visible) return null

  if (status === 'finished' && penaltyResult) {
    const { winner, scores: final } = penaltyResult
    let title = '¡Penitencia terminada!'
    let subtitle = ''

    if (winner === 'tie') {
      subtitle = `Empate en billetes: ${final.player1} – ${final.player2}`
    } else if (winner === 'player1') {
      subtitle = `${player1Name} cogió más billetes (${final.player1} vs ${final.player2})`
    } else {
      subtitle = `${player2Name} cogió más billetes (${final.player2} vs ${final.player1})`
    }

    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm">
        <div className="animate-bounce-in mx-4 max-w-lg rounded-2xl border-2 border-amber-500 bg-slate-900 p-8 text-center shadow-2xl">
          <img src={BILLETE_SRC} alt="" className="mx-auto h-20 w-auto" />
          <h2 className="mt-4 text-3xl font-black text-amber-400">{title}</h2>
          <p className="mt-2 text-slate-300">{subtitle}</p>
          <div className="mt-6 flex justify-center gap-10 text-lg font-bold">
            <span className="text-blue-400">
              {player1Name}: {final.player1} 💵
            </span>
            <span className="text-red-400">
              {player2Name}: {final.player2} 💵
            </span>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="mt-8 rounded-xl bg-emerald-500 px-8 py-3 text-lg font-bold text-slate-900 hover:bg-emerald-400"
          >
            Seguir jugando
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-40 overflow-hidden rounded-xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-900/40 via-transparent to-amber-950/50" />

      <div className="absolute left-0 right-0 top-0 z-50 bg-amber-600/95 px-3 py-2 text-center shadow-lg">
        <p className="text-lg font-black uppercase tracking-wide text-slate-900">
          ¡Penitencia! — Coge billetes
        </p>
        {status === 'intro' ? (
          <p className="text-sm font-medium text-slate-900/90">
            Las dos personas: ¡a por los billetes con la mano!
          </p>
        ) : (
          <p className="text-sm font-medium text-slate-900/90">
            Solo puedes coger billetes · quien más coja gana · {timeLeft}s
          </p>
        )}
      </div>

      <div className="absolute left-2 top-14 z-50 rounded-lg bg-blue-600/90 px-3 py-1 font-bold text-white">
        {player1Name}: {scores.player1} 💵
      </div>
      <div className="absolute right-2 top-14 z-50 rounded-lg bg-red-600/90 px-3 py-1 font-bold text-white">
        {player2Name}: {scores.player2} 💵
      </div>

      {status === 'intro' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60">
          <div className="animate-bounce-in text-center">
            <img src={BILLETE_SRC} alt="Billete" className="mx-auto h-24 w-auto drop-shadow-lg" />
            <p className="mt-4 text-2xl font-black text-amber-300">¡Empate!</p>
            <p className="mt-2 text-white">Penitencia para los dos…</p>
            <p className="mt-1 text-sm text-slate-300">Preparados</p>
          </div>
        </div>
      )}

      {status === 'playing' &&
        bills.map((bill) => (
          <img
            key={bill.id}
            src={BILLETE_SRC}
            alt=""
            className={`pointer-events-none absolute z-30 object-contain drop-shadow-lg transition-transform ${
              bill.pop ? 'scale-125 opacity-90' : ''
            } ${bill.grabbedBy === 'player1' ? 'ring-2 ring-blue-400' : ''} ${
              bill.grabbedBy === 'player2' ? 'ring-2 ring-red-400' : ''
            }`}
            style={{
              left: `${bill.x * 100}%`,
              top: `${bill.y * 100}%`,
              width: billSize,
              height: 'auto',
              transform: `translate(-50%, -50%) ${bill.pop ? 'scale(1.3)' : ''}`,
              transition: bill.grabbedBy ? 'transform 0.15s' : 'none',
            }}
          />
        ))}
    </div>
  )
}
