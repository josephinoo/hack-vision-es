const items = [
  { emoji: '✊', top: '8%', left: '4%', rotate: '-12deg', delay: '0s', size: '3.5rem' },
  { emoji: '✋', top: '15%', right: '6%', rotate: '8deg', delay: '0.5s', size: '4rem' },
  { emoji: '✌️', bottom: '18%', left: '7%', rotate: '6deg', delay: '1s', size: '3.25rem' },
  { emoji: '✊', bottom: '12%', right: '4%', rotate: '-8deg', delay: '1.5s', size: '3rem' },
  { emoji: '✋', top: '42%', left: '2%', rotate: '15deg', delay: '0.8s', size: '2.5rem', faint: true },
  { emoji: '✌️', top: '55%', right: '3%', rotate: '-14deg', delay: '1.2s', size: '2.75rem', faint: true },
]

export function FloatingHands() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
      {items.map((item, i) => (
        <span
          key={i}
          className={`absolute select-none animate-float ${item.faint ? 'opacity-[0.12]' : 'opacity-[0.22]'}`}
          style={{
            top: item.top,
            left: item.left,
            right: item.right,
            fontSize: item.size,
            transform: `rotate(${item.rotate})`,
            animationDelay: item.delay,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  )
}

export function HeroHands() {
  return (
    <div className="relative mx-auto flex h-28 w-full max-w-xs items-end justify-center gap-2 sm:gap-4" aria-hidden>
      <span className="animate-wiggle text-6xl sm:text-7xl" style={{ animationDelay: '0s' }}>
        ✊
      </span>
      <span
        className="animate-wiggle -mb-2 text-7xl sm:text-8xl"
        style={{ animationDelay: '0.3s' }}
      >
        ✋
      </span>
      <span className="animate-wiggle text-6xl sm:text-7xl" style={{ animationDelay: '0.6s' }}>
        ✌️
      </span>
    </div>
  )
}
