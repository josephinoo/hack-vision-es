export default function GameHeader({ title, children }) {
  return (
    <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-[var(--ink)] bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl border-[3px] border-[var(--ink)] bg-[var(--sun)] text-xl shadow-[3px_3px_0_var(--ink)]"
          aria-hidden
        >
          ✊
        </span>
        <h1 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
          {title}
        </h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  )
}

export function HeaderButton({ children, onClick, variant = 'ghost' }) {
  const styles =
    variant === 'danger'
      ? 'bg-[var(--p2-light)] hover:bg-[var(--p2)] hover:text-white'
      : 'bg-white hover:bg-[var(--cream-dark)]'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border-2 border-[var(--ink)] px-3 py-1.5 font-display text-sm font-semibold text-[var(--ink)] transition ${styles}`}
    >
      {children}
    </button>
  )
}
