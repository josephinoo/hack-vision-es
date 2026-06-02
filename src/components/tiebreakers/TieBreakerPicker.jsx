import { TIE_BREAKERS } from '../../tiebreakers/registry'

export default function TieBreakerPicker({ onSelect, onSkip }) {
  return (
    <div className="mt-8 w-full">
      <p className="font-display text-sm font-bold uppercase tracking-widest text-[var(--ink-soft)]">
        Elige desempate
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {TIE_BREAKERS.map((tb) => (
          <li key={tb.id}>
            <button
              type="button"
              disabled={!tb.implemented}
              onClick={() => tb.implemented && onSelect(tb.id)}
              className={`flex w-full items-center gap-3 rounded-xl border-[3px] px-4 py-3 text-left transition ${
                tb.implemented
                  ? 'border-[var(--ink)] bg-white shadow-[3px_3px_0_var(--ink)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--ink)]'
                  : 'cursor-not-allowed border-[var(--ink)]/25 bg-[var(--cream-dark)] opacity-70'
              } ${tb.number === 4 && tb.implemented ? 'ring-2 ring-[var(--sun)] ring-offset-2' : ''}`}
            >
              <span className="text-3xl" aria-hidden>
                {tb.pickerEmoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-display font-bold text-[var(--ink)]">
                  {tb.number != null ? `#${tb.number} · ` : ''}
                  {tb.title}
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-[var(--ink-soft)]">
                  {tb.implemented ? tb.description : 'Próximamente'}
                </span>
              </span>
              {!tb.implemented && (
                <span className="badge-pill shrink-0 text-[10px]">WIP</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSkip}
        className="mt-4 w-full text-center text-sm font-bold text-[var(--ink-soft)] underline-offset-2 hover:underline"
      >
        Sin desempate — otra ronda
      </button>
    </div>
  )
}
