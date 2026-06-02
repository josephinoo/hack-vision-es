export default function PlayerAvatar({
  src,
  name,
  size = 'md',
  accent = 'var(--p1)',
  selected = false,
}) {
  const sizeClass =
    size === 'lg'
      ? 'h-28 w-28 sm:h-32 sm:w-32'
      : size === 'sm'
        ? 'h-10 w-10'
        : 'h-16 w-16'

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative overflow-hidden rounded-full border-[3px] bg-white shadow-[3px_3px_0_var(--ink)] transition ${sizeClass} ${
          selected ? 'ring-4 ring-offset-2' : ''
        }`}
        style={{
          borderColor: accent,
          ...(selected ? { ringColor: accent } : {}),
        }}
      >
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>
      {size !== 'sm' && name && (
        <span className="font-display text-lg font-bold" style={{ color: accent }}>
          {name}
        </span>
      )}
    </div>
  )
}
