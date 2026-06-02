import { useEffect, useRef, useState } from 'react'

const FLASH_MS = 700

/**
 * Breve expresión "shocked" cuando un jugador toca una bomba en caza de sobres.
 */
export function useBombFlash(active, catchScores) {
  const prevScores = useRef({ player1: 0, player2: 0 })
  const timers = useRef({ player1: null, player2: null })
  const [flash, setFlash] = useState({ player1: false, player2: false })

  useEffect(() => {
    if (!active) {
      prevScores.current = { player1: 0, player2: 0 }
      setFlash({ player1: false, player2: false })
      return
    }

    const prev = prevScores.current
    const curr = catchScores

    const trigger = (player) => {
      if (curr[player] < prev[player]) {
        setFlash((f) => ({ ...f, [player]: true }))
        if (timers.current[player]) clearTimeout(timers.current[player])
        timers.current[player] = setTimeout(() => {
          setFlash((f) => ({ ...f, [player]: false }))
        }, FLASH_MS)
      }
    }

    trigger('player1')
    trigger('player2')
    prevScores.current = { ...curr }
  }, [active, catchScores])

  useEffect(
    () => () => {
      if (timers.current.player1) clearTimeout(timers.current.player1)
      if (timers.current.player2) clearTimeout(timers.current.player2)
    },
    [],
  )

  return flash
}
