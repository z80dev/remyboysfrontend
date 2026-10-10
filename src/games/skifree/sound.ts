import { getGamesAudio, isGamesMuted, noise, sweep, tone } from '../kit'
import type { GameEvent } from './types'

/** A quiet continuous ski hiss. Event sounds are short and use the shared games graph. */
export function createSkiAudio() {
  let hiss: AudioBufferSourceNode | null = null
  let filter: BiquadFilterNode | null = null
  let gain: GainNode | null = null
  let lastUpdate = -1
  const last: Partial<Record<GameEvent, number>> = {}

  function stopHiss() {
    if (!hiss) return
    hiss.stop()
    hiss.disconnect()
    filter?.disconnect()
    gain?.disconnect()
    hiss = null
    filter = null
    gain = null
    lastUpdate = -1
  }

  function update(speed: number, running: boolean) {
    const audio = getGamesAudio()
    if (!running || speed < 0.5 || isGamesMuted() || !audio || audio.ctx.state !== 'running') {
      stopHiss()
      return
    }
    const now = audio.ctx.currentTime
    if (!hiss) {
      hiss = audio.ctx.createBufferSource()
      hiss.buffer = audio.noise
      hiss.loop = true
      filter = audio.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.Q.value = 0.5
      gain = audio.ctx.createGain()
      gain.gain.value = 0
      hiss.connect(filter).connect(gain).connect(audio.out)
      hiss.start()
    }
    if (now - lastUpdate < 0.04) return
    lastUpdate = now
    filter!.frequency.setTargetAtTime(Math.min(4200, 260 + speed * 36), now, 0.08)
    gain!.gain.setTargetAtTime(Math.min(0.035, speed * 0.00075), now, 0.05)
  }

  function event(name: GameEvent) {
    const audio = getGamesAudio()
    if (isGamesMuted() || !audio || audio.ctx.state !== 'running') return
    const now = audio.ctx.currentTime
    if (now - (last[name] ?? -1) < 0.04) return
    last[name] = now
    switch (name) {
      case 'jump':
        sweep(260, 680, 0.16, { type: 'sine', vol: 0.085 })
        break
      case 'land':
        noise(0.08, { filter: 'lowpass', freq: 850, vol: 0.055 })
        break
      case 'trick':
        sweep(780, 330, 0.2, { type: 'triangle', vol: 0.07 })
        break
      case 'crash':
        noise(0.19, { filter: 'lowpass', freq: 340, to: 110, vol: 0.12 })
        sweep(100, 38, 0.13, { type: 'sine', vol: 0.08 })
        break
      case 'dog':
        sweep(1050, 620, 0.09, { type: 'triangle', vol: 0.075 })
        sweep(1100, 680, 0.08, { type: 'triangle', vol: 0.055, delay: 0.1 })
        break
      case 'roar':
        noise(0.65, { filter: 'bandpass', freq: 540, to: 280, q: 3, vol: 0.13, attack: 0.04 })
        noise(0.5, { filter: 'bandpass', freq: 1250, to: 760, q: 4, vol: 0.065, attack: 0.04 })
        sweep(115, 52, 0.64, { type: 'sawtooth', vol: 0.04, attack: 0.04 })
        break
      case 'gobble':
        noise(0.09, { filter: 'lowpass', freq: 420, vol: 0.09 })
        sweep(165, 64, 0.12, { type: 'triangle', vol: 0.09 })
        break
      case 'burp':
        sweep(105, 42, 0.28, { type: 'sawtooth', vol: 0.045 })
        noise(0.2, { filter: 'bandpass', freq: 280, q: 2, vol: 0.07 })
        break
      case 'fast':
        noise(0.35, { filter: 'bandpass', freq: 700, to: 2800, vol: 0.075 })
        break
      case 'gate-pass':
        tone(660, 0.045, { type: 'sine', vol: 0.025 })
        break
      case 'gate-miss':
        tone(160, 0.1, { type: 'triangle', vol: 0.045 })
        break
      case 'course-finish':
        tone(523, 0.12, { type: 'triangle', vol: 0.055 })
        tone(659, 0.12, { type: 'triangle', vol: 0.055, delay: 0.12 })
        tone(784, 0.24, { type: 'triangle', vol: 0.055, delay: 0.24 })
        break
    }
  }

  return { event, update, dispose: stopHiss }
}
