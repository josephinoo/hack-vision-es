import { useState } from 'react'
import GameShell from './GameShell'
import { HeroHands } from './decor/FloatingHands'
import PlayerAvatar from './PlayerAvatar'
import {
  DEFAULT_ROSTER,
  PLAYER_PROFILES,
  rosterToGameNames,
  swapRosterSides,
} from '../config/players'

function ProfilePicker({ selectedId, onPick, accent }) {
  return (
    <div className="mt-4 flex w-full justify-center gap-3">
      {Object.values(PLAYER_PROFILES).map((profile) => {
        const active = profile.id === selectedId
        return (
          <button
            key={profile.id}
            type="button"
            onClick={() => onPick(profile)}
            className={`rounded-xl border-[3px] p-2 transition-transform ${
              active
                ? 'border-[var(--ink)] bg-white shadow-[3px_3px_0_var(--ink)] scale-105'
                : 'border-[var(--ink)]/20 bg-white/80 opacity-80 hover:opacity-100'
            }`}
            style={active ? { outline: `2px solid ${accent}` } : undefined}
            aria-pressed={active}
            aria-label={`Elegir ${profile.name}`}
          >
            <PlayerAvatar src={profile.avatar} name={profile.name} size="sm" accent={accent} />
            <span className="mt-1 block text-center font-display text-xs font-bold text-[var(--ink)]">
              {profile.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SlotCard({ profile, slotLabel, sideHint, accent, onPick }) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-2xl border-[3px] border-[var(--ink)] bg-white p-5 shadow-[4px_4px_0_var(--ink)]">
      <span className="badge-pill mb-3" style={{ borderColor: accent, color: accent }}>
        {slotLabel}
      </span>
      <PlayerAvatar src={profile.avatar} name={profile.name} size="lg" accent={accent} />
      <p className="mt-3 text-center text-sm font-bold text-[var(--ink-soft)]">{sideHint}</p>
      <ProfilePicker selectedId={profile.id} onPick={onPick} accent={accent} />
    </div>
  )
}

export default function PlayerSelect({ onStart }) {
  const [roster, setRoster] = useState(DEFAULT_ROSTER)

  return (
    <GameShell className="items-center justify-center px-4 py-8">
      <div className="relative z-10 w-full max-w-2xl">
        <HeroHands />

        <div className="card-sticker mt-2 p-6 sm:p-8">
          <p className="text-center font-display text-sm font-semibold uppercase tracking-[0.2em] text-[var(--coral)]">
            Piedra, Papel o Tijera
          </p>
          <h1 className="mt-2 text-center font-display text-3xl font-bold text-[var(--ink)] sm:text-4xl">
            Elegid vuestro jugador
          </h1>
          <p className="mx-auto mt-3 max-w-md text-center text-sm font-semibold text-[var(--ink-soft)]">
            Cada lado elige su cara · J1 izquierda · J2 derecha
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-stretch">
            <SlotCard
              profile={roster.player1}
              slotLabel="Jugador 1"
              sideHint="← Lado izquierdo"
              accent="var(--p1)"
              onPick={(profile) => setRoster((r) => ({ ...r, player1: profile }))}
            />
            <div className="flex items-center justify-center py-2 sm:py-0">
              <span className="font-display text-3xl font-black text-[var(--ink)]/25">VS</span>
            </div>
            <SlotCard
              profile={roster.player2}
              slotLabel="Jugador 2"
              sideHint="Lado derecho →"
              accent="var(--p2)"
              onPick={(profile) => setRoster((r) => ({ ...r, player2: profile }))}
            />
          </div>

          <button
            type="button"
            onClick={() => setRoster((r) => swapRosterSides(r))}
            className="btn-play btn-play--ghost mx-auto mt-6 px-6 py-2 text-sm"
          >
            ↕ Intercambiar lados
          </button>

          <button
            type="button"
            onClick={() => onStart(rosterToGameNames(roster))}
            className="btn-play btn-play--primary mt-6 w-full py-3.5"
          >
            ¡A jugar!
          </button>
        </div>

        <p className="mt-6 text-center text-sm font-semibold text-[var(--ink-soft)]">
          Permitid acceso a la cámara · colocaos frente al monitor
        </p>
      </div>
    </GameShell>
  )
}
