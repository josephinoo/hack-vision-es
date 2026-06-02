import { FloatingHands } from './decor/FloatingHands'

export default function GameShell({ children, className = '' }) {
  return (
    <div className={`relative z-10 flex min-h-full flex-col ${className}`}>
      <div className="game-bg" aria-hidden />
      <FloatingHands />
      {children}
    </div>
  )
}
