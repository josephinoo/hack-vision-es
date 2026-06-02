let audioCtx = null

async function ensureCtx() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume()
  }
  return audioCtx
}

function makeNoiseBuffer(ctx, durationSec) {
  const sampleRate = ctx.sampleRate
  const length = Math.floor(sampleRate * durationSec)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    const progress = i / length
    const env = Math.exp(-progress * 6)
    data[i] = (Math.random() * 2 - 1) * env
  }
  return buffer
}

/** Call once when the mini-game starts (needs prior user gesture). */
export async function warmupGameAudio() {
  const ctx = await ensureCtx()
  if (!ctx) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.setValueAtTime(0.0001, t + 0.05)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.06)
}

/** Bright positive “ting” for catching an envelope. */
export async function playEnvelopeCatch() {
  const ctx = await ensureCtx()
  if (!ctx) return

  const t = ctx.currentTime

  const playTone = (freq, start, peak, end) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(end + 0.02)
  }

  playTone(1318.5, t, 0.28, t + 0.18)
  playTone(1760, t + 0.03, 0.14, t + 0.22)
}

/**
 * Explosion: crack (mid/high) + body (noise) + sub thump.
 * Mid band is loud on laptop speakers — old version was mostly sub-bass.
 */
export async function playBombExplosion() {
  const ctx = await ensureCtx()
  if (!ctx) return

  const t = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(1, t)
  master.connect(ctx.destination)

  // --- 1) Sharp crack (short, highpassed noise) ---
  const crackSrc = ctx.createBufferSource()
  crackSrc.buffer = makeNoiseBuffer(ctx, 0.12)
  const crackHp = ctx.createBiquadFilter()
  crackHp.type = 'highpass'
  crackHp.frequency.setValueAtTime(700, t)
  const crackGain = ctx.createGain()
  crackGain.gain.setValueAtTime(0.9, t)
  crackGain.gain.linearRampToValueAtTime(0.001, t + 0.14)
  crackSrc.connect(crackHp)
  crackHp.connect(crackGain)
  crackGain.connect(master)
  crackSrc.start(t)
  crackSrc.stop(t + 0.15)

  // --- 2) Body (bandpassed noise, audible mids) ---
  const bodySrc = ctx.createBufferSource()
  bodySrc.buffer = makeNoiseBuffer(ctx, 0.35)
  const bodyBp = ctx.createBiquadFilter()
  bodyBp.type = 'bandpass'
  bodyBp.frequency.setValueAtTime(320, t)
  bodyBp.Q.setValueAtTime(0.7, t)
  const bodyGain = ctx.createGain()
  bodyGain.gain.setValueAtTime(0.75, t)
  bodyGain.gain.linearRampToValueAtTime(0.001, t + 0.38)
  bodySrc.connect(bodyBp)
  bodyBp.connect(bodyGain)
  bodyGain.connect(master)
  bodySrc.start(t)

  // --- 3) Sub thump ---
  const thump = ctx.createOscillator()
  thump.type = 'sine'
  thump.frequency.setValueAtTime(95, t)
  thump.frequency.exponentialRampToValueAtTime(42, t + 0.22)
  const thumpGain = ctx.createGain()
  thumpGain.gain.setValueAtTime(0.65, t)
  thumpGain.gain.linearRampToValueAtTime(0.001, t + 0.3)
  thump.connect(thumpGain)
  thumpGain.connect(master)
  thump.start(t)
  thump.stop(t + 0.32)

  // --- 4) Short “whump” square layer for punch ---
  const punch = ctx.createOscillator()
  punch.type = 'square'
  punch.frequency.setValueAtTime(180, t)
  punch.frequency.exponentialRampToValueAtTime(60, t + 0.1)
  const punchGain = ctx.createGain()
  punchGain.gain.setValueAtTime(0.12, t)
  punchGain.gain.linearRampToValueAtTime(0.001, t + 0.12)
  const punchLp = ctx.createBiquadFilter()
  punchLp.type = 'lowpass'
  punchLp.frequency.setValueAtTime(400, t)
  punch.connect(punchLp)
  punchLp.connect(punchGain)
  punchGain.connect(master)
  punch.start(t)
  punch.stop(t + 0.14)
}
