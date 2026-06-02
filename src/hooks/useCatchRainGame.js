import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getPenaltyGrabbers,
  getPointerGrabbers,
  tryGrabItem,
} from '../utils/grabDetection'
import {
  playBombExplosion,
  playEnvelopeCatch,
  warmupGameAudio,
} from '../utils/gameSfx'

let itemId = 0
let effectId = 0

const BURST_MS = 520
const BOMB_TO_BOOM_MS = 75

/**
 * @param {import('../tiebreakers/types.js').CatchRainGameConfig} config
 */
function spawnItem(config) {
  const bombChance = config.bombChance ?? 0
  const isBomb = bombChance > 0 && Math.random() < bombChance

  if (isBomb) {
    return {
      id: ++itemId,
      kind: 'bomb',
      x: 0.05 + Math.random() * 0.9,
      y: -0.05 - Math.random() * 0.15,
      speed: config.fallSpeedMin + Math.random() * (config.fallSpeedMax - config.fallSpeedMin),
      emoji: config.bombEmoji ?? '💣',
      imageSrc: null,
      rotation: (Math.random() - 0.5) * 20,
      wobble: Math.random() * Math.PI * 2,
    }
  }

  const emoji =
    config.itemType === 'emoji'
      ? config.itemEmoji ?? '✉️'
      : null

  return {
    id: ++itemId,
    kind: 'envelope',
    x: 0.05 + Math.random() * 0.9,
    y: -0.05 - Math.random() * 0.15,
    speed: config.fallSpeedMin + Math.random() * (config.fallSpeedMax - config.fallSpeedMin),
    emoji,
    imageSrc: config.itemType === 'image' ? config.itemImageSrc : null,
    rotation: (Math.random() - 0.5) * 40,
    wobble: Math.random() * Math.PI * 2,
  }
}

function applyItemTouch(scores, player, item, config) {
  if (item.kind === 'bomb') {
    const penalty = config.bombPenalty ?? 5
    scores[player] = Math.max(0, scores[player] - penalty)
  } else {
    scores[player] += 1
  }
}

function spawnBurst(x, y, kind) {
  return {
    id: ++effectId,
    x,
    y,
    kind,
    createdAt: Date.now(),
  }
}

function handleItemCaught(item, config, effectsRef) {
  const sfx = config.enableSfx !== false
  if (item.kind === 'bomb') {
    if (sfx) void playBombExplosion().catch(() => {})
    effectsRef.push(spawnBurst(item.x, item.y, 'bomb'))
  } else {
    if (sfx) void playEnvelopeCatch().catch(() => {})
    effectsRef.push(spawnBurst(item.x, item.y, 'sparkle'))
  }
}

/**
 * @param {{ active: boolean, detection: object, config: import('../tiebreakers/types.js').CatchRainGameConfig, onFinish?: Function }} opts
 */
export function useCatchRainGame({ active, detection, config, onFinish }) {
  const [timeLeft, setTimeLeft] = useState(config.durationMs / 1000)
  const [scores, setScores] = useState({ player1: 0, player2: 0 })
  const [items, setItems] = useState([])
  const [burstEffects, setBurstEffects] = useState([])
  const [status, setStatus] = useState('intro')
  const itemsRef = useRef([])
  const effectsRef = useRef([])
  const scoresRef = useRef({ player1: 0, player2: 0 })
  const lastSpawnRef = useRef(0)
  const rafRef = useRef(null)
  const finishedRef = useRef(false)
  const detectionRef = useRef(detection)
  const configRef = useRef(config)

  detectionRef.current = detection
  configRef.current = config

  const reset = useCallback(() => {
    itemsRef.current = []
    effectsRef.current = []
    scoresRef.current = { player1: 0, player2: 0 }
    setItems([])
    setBurstEffects([])
    setScores({ player1: 0, player2: 0 })
    setTimeLeft(config.durationMs / 1000)
    setStatus('intro')
    finishedRef.current = false
    lastSpawnRef.current = 0
  }, [config.durationMs])

  useEffect(() => {
    if (!active) {
      reset()
      return
    }
    const t = setTimeout(() => {
      if (config.enableSfx !== false) warmupGameAudio()
      setStatus('playing')
    }, config.introMs)
    return () => clearTimeout(t)
  }, [active, config.introMs, config.enableSfx, reset])

  useEffect(() => {
    if (!active || status !== 'playing') return

    const cfg = configRef.current
    const endAt = Date.now() + cfg.durationMs

    const tick = () => {
      const now = Date.now()
      const remaining = Math.max(0, endAt - now)
      setTimeLeft(Math.ceil(remaining / 1000))

      const progress = 1 - remaining / cfg.durationMs
      const spawnEvery =
        cfg.spawnEveryStart -
        progress * (cfg.spawnEveryStart - cfg.spawnEveryEnd)

      if (now - lastSpawnRef.current > spawnEvery) {
        lastSpawnRef.current = now
        if (itemsRef.current.length < cfg.maxItems) {
          itemsRef.current = [...itemsRef.current, spawnItem(cfg)]
        }
      }

      const grabbers = cfg.usePointerFingerOnly
        ? getPointerGrabbers(detectionRef.current)
        : getPenaltyGrabbers(detectionRef.current)

      const nextItems = []

      for (const item of itemsRef.current) {
        const next = {
          ...item,
          y: item.y + item.speed * 0.016,
          wobble: item.wobble + 0.08,
        }

        if (next.y >= 1.15) continue

        const who = tryGrabItem(grabbers, next, cfg.grabRadius)
        if (who) {
          applyItemTouch(scoresRef.current, who, next, cfg)
          handleItemCaught(next, cfg, effectsRef.current)
          continue
        }

        nextItems.push(next)
      }

      effectsRef.current = effectsRef.current.filter(
        (e) => now - e.createdAt < BURST_MS,
      )

      itemsRef.current = nextItems
      setScores({ ...scoresRef.current })
      setItems([...itemsRef.current])
      setBurstEffects([...effectsRef.current])

      if (remaining <= 0 && !finishedRef.current) {
        finishedRef.current = true
        setStatus('finished')
        const final = { ...scoresRef.current }
        let winner = 'tie'
        if (final.player1 > final.player2) winner = 'player1'
        else if (final.player2 > final.player1) winner = 'player2'
        onFinish?.({ scores: final, winner })
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active, status, onFinish])

  return {
    timeLeft,
    scores,
    items,
    burstEffects,
    burstMs: BURST_MS,
    bombToBoomMs: BOMB_TO_BOOM_MS,
    status,
    itemSize: config.itemSize,
    scoreLabel: config.scoreLabel,
    reset,
  }
}
