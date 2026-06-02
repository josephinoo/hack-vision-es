import { useCallback, useEffect, useRef, useState } from 'react'
import { MALETIN_DECOYS } from '../tiebreakers/operacionMaletin'
import { getFistGrabbers, tryGrabItem } from '../utils/grabDetection'
import { playBombExplosion, playEnvelopeCatch } from '../utils/gameSfx'

const DEFAULT_CONFIG = {
  introMs: 1500,
  durationMs: 35_000,
  grabRadius: 0.14,
  itemSize: 58,
  startHealth: 3,
  briefcaseChance: 0.4,
  itemLifetimeMs: 2600,
  spawnEveryMinMs: 700,
  spawnEveryMaxMs: 1500,
  maxItemsOnScreen: 3,
}

let spawnId = 0

// Confinar a la zona visible de la cámara (lejos de bordes)
function randomPosition() {
  return {
    x: 0.2 + Math.random() * 0.6,
    y: 0.28 + Math.random() * 0.46,
  }
}

function pickDecoy() {
  return MALETIN_DECOYS[Math.floor(Math.random() * MALETIN_DECOYS.length)]
}

const emptyPair = () => ({ player1: 0, player2: 0 })

/**
 * Desempate #3 — supervivencia: maletines suman, señuelos restan y quitan vida.
 * Pierdes si te quedas sin vida; al acabar el tiempo gana quien tenga más puntos.
 */
export function useOperacionMaletin({ active, detection, config, onFinish }) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const [status, setStatus] = useState('idle')
  const [items, setItems] = useState([])
  const [scores, setScores] = useState(emptyPair())
  const [health, setHealth] = useState({
    player1: cfg.startHealth,
    player2: cfg.startHealth,
  })
  const [timeLeft, setTimeLeft] = useState(Math.ceil(cfg.durationMs / 1000))
  const [winner, setWinner] = useState(null)

  const detectionRef = useRef(detection)
  detectionRef.current = detection

  const itemsRef = useRef([])
  const scoresRef = useRef(emptyPair())
  const healthRef = useRef({ player1: cfg.startHealth, player2: cfg.startHealth })
  const spawnTimerRef = useRef(null)
  const endAtRef = useRef(0)
  const rafRef = useRef(null)
  const finishedRef = useRef(false)

  const sync = useCallback(() => {
    setItems([...itemsRef.current])
    setScores({ ...scoresRef.current })
    setHealth({ ...healthRef.current })
  }, [])

  const finish = useCallback(
    (win, extra = {}) => {
      if (finishedRef.current) return
      finishedRef.current = true
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      setWinner(win)
      setStatus('finished')
      onFinish?.({ winner: win, scores: { ...scoresRef.current }, ...extra })
    },
    [onFinish],
  )

  const reset = useCallback(() => {
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    spawnTimerRef.current = null
    rafRef.current = null
    finishedRef.current = false
    itemsRef.current = []
    scoresRef.current = emptyPair()
    healthRef.current = { player1: cfg.startHealth, player2: cfg.startHealth }
    setStatus('idle')
    setItems([])
    setScores(emptyPair())
    setHealth({ player1: cfg.startHealth, player2: cfg.startHealth })
    setTimeLeft(Math.ceil(cfg.durationMs / 1000))
    setWinner(null)
  }, [cfg.startHealth, cfg.durationMs])

  const spawnItem = useCallback(() => {
    if (finishedRef.current) return
    if (itemsRef.current.length < cfg.maxItemsOnScreen) {
      const isBriefcase = Math.random() < cfg.briefcaseChance
      const base = {
        id: ++spawnId,
        ...randomPosition(),
        expiresAt: Date.now() + cfg.itemLifetimeMs,
      }
      const item = isBriefcase
        ? { ...base, kind: 'briefcase' }
        : (() => {
            const d = pickDecoy()
            return { ...base, kind: 'decoy', decoyId: d.id, emoji: d.emoji, label: d.label }
          })()
      itemsRef.current = [...itemsRef.current, item]
      sync()
    }
  }, [
    cfg.maxItemsOnScreen,
    cfg.briefcaseChance,
    cfg.itemLifetimeMs,
    sync,
  ])

  const scheduleSpawn = useCallback(() => {
    if (finishedRef.current) return
    const delay =
      cfg.spawnEveryMinMs +
      Math.random() * (cfg.spawnEveryMaxMs - cfg.spawnEveryMinMs)
    spawnTimerRef.current = setTimeout(() => {
      spawnItem()
      scheduleSpawn()
    }, delay)
  }, [cfg.spawnEveryMinMs, cfg.spawnEveryMaxMs, spawnItem])

  useEffect(() => {
    if (!active) {
      reset()
      return
    }
    finishedRef.current = false
    setStatus('intro')
    const introT = setTimeout(() => {
      setStatus('playing')
      endAtRef.current = Date.now() + cfg.durationMs
      scheduleSpawn()
    }, cfg.introMs)
    return () => {
      clearTimeout(introT)
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)
    }
  }, [active, reset, scheduleSpawn, cfg.introMs, cfg.durationMs])

  useEffect(() => {
    if (!active || status !== 'playing') return

    const tick = () => {
      if (finishedRef.current) return
      const now = Date.now()

      // tiempo
      const remaining = Math.max(0, endAtRef.current - now)
      setTimeLeft(Math.ceil(remaining / 1000))

      // expira señuelos/maletines no cogidos
      const before = itemsRef.current.length
      itemsRef.current = itemsRef.current.filter((i) => i.expiresAt > now)
      let dirty = itemsRef.current.length !== before

      // colisiones (solo cuenta con el puño cerrado = "coger")
      const grabbers = getFistGrabbers(detectionRef.current)
      const survivors = []
      for (const item of itemsRef.current) {
        const who = tryGrabItem(grabbers, item, cfg.grabRadius)
        if (!who) {
          survivors.push(item)
          continue
        }
        dirty = true
        if (item.kind === 'briefcase') {
          scoresRef.current[who] += 1
          playEnvelopeCatch()
        } else {
          scoresRef.current[who] -= 1
          healthRef.current[who] = Math.max(0, healthRef.current[who] - 1)
          playBombExplosion()
        }
        // el ítem cogido desaparece (no se vuelve a contar)
      }
      itemsRef.current = survivors
      if (dirty) sync()

      // ¿alguien sin vida?
      if (healthRef.current.player1 <= 0 || healthRef.current.player2 <= 0) {
        const p1Dead = healthRef.current.player1 <= 0
        const p2Dead = healthRef.current.player2 <= 0
        let win = 'tie'
        if (p1Dead && !p2Dead) win = 'player2'
        else if (p2Dead && !p1Dead) win = 'player1'
        finish(win, { reason: 'ko' })
        return
      }

      // fin de tiempo → más puntos gana
      if (remaining <= 0) {
        const { player1, player2 } = scoresRef.current
        let win = 'tie'
        if (player1 > player2) win = 'player1'
        else if (player2 > player1) win = 'player2'
        finish(win, { reason: 'time' })
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active, status, finish, cfg.grabRadius, sync])

  return {
    status,
    items,
    scores,
    health,
    maxHealth: cfg.startHealth,
    timeLeft,
    winner,
    briefcaseSize: cfg.itemSize,
    itemImageSrc: cfg.itemImageSrc ?? '/images/billete.png',
  }
}
