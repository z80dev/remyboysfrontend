import { getGamesAudio, isGamesMuted, noise, playJingle, playMusic, stopMusic, stopSounds, sweep, tone } from '../kit'
import { baseCadetTheme } from './music/base-cadet'
import { missionTheme } from './music/mission'
import { extraBall, missionComplete, missionStart, promotion } from './music/jingles'

const last = new Map<string, number>()
let currentMusic: 'base' | 'mission' | undefined

/** Call on music, mission, mute and pause changes. A muted call never creates nodes. */
export function setPinballMusic(enabled: boolean, mission: boolean): void {
  if (!enabled || isGamesMuted()) {
    if (currentMusic) stopMusic(200)
    currentMusic = undefined
    return
  }
  const next = mission ? 'mission' : 'base'
  if (currentMusic === next) return
  playMusic(mission ? missionTheme : baseCadetTheme, 1000)
  currentMusic = next
}

/** Releases pinball music and scheduled effects without touching another game's graph. */
export function stopPinballAudio(): void {
  if (currentMusic) stopMusic(200)
  currentMusic = undefined
  last.clear()
  stopSounds('pinball')
}

/** Canonical effect names mirror table/rule events; level is bumper upgrade or plunger strength. */
export function sound(event: string, level = 1): void {
  const audio = getGamesAudio()
  if (isGamesMuted() || !audio || audio.ctx.state !== 'running') return
  const now = audio.ctx.currentTime
  const previous = last.get(event)
  const spacing = event === 'wormhole' || event === 'hyperspace' || event === 'black-hole' || event === 'tilt' ? 0.12
    : event === 'mission' || event === 'mission-complete' || event === 'promotion' || event === 'extra' || event === 'replay' ? 1
    : event === 'drain' || event === 'plunger-release' || event === 'ball-saved' ? 0.1
    : event === 'bumper' || event === 'satellite' || event === 'ramp' ? 0.05 : 0.04
  if (previous !== undefined && now - previous < spacing) return
  last.set(event, now)
  switch (event) {
    case 'flipper':
      noise(0.035, { filter: 'lowpass', freq: 450, vol: 0.11, owner: 'pinball' })
      tone(90, 0.065, { type: 'sine', vol: 0.16, owner: 'pinball' })
      break
    case 'bumper':
    case 'satellite': {
      const pitch = 600 + (Math.max(1, Math.min(4, level)) - 1) * 100
      sweep(pitch * 1.35, pitch, 0.08, { type: 'sine', vol: 0.16, owner: 'pinball' })
      tone(pitch, 0.105, { type: 'triangle', vol: 0.08, owner: 'pinball' })
      noise(0.018, { freq: 1600, vol: 0.06, owner: 'pinball' })
      break
    }
    case 'slingshot':
      noise(0.045, { freq: 2600, to: 700, vol: 0.15, owner: 'pinball' })
      sweep(240, 100, 0.055, { type: 'triangle', vol: 0.1, owner: 'pinball' })
      break
    case 'drop':
    case 'target':
      noise(0.04, { freq: 1800, q: 2, vol: 0.12, owner: 'pinball' })
      tone(210, 0.055, { type: 'square', vol: 0.055, owner: 'pinball' })
      break
    case 'rollover':
    case 'spinner':
      tone(1450, 0.028, { type: 'sine', vol: 0.08, owner: 'pinball' })
      break
    case 'ramp':
      noise(0.115, { freq: 400, to: 5500, q: 0.8, vol: 0.17, attack: 0.025, owner: 'pinball' })
      break
    case 'wormhole':
    case 'hyperspace':
    case 'black-hole':
      sweep(1100, 130, 0.28, { type: 'sine', vol: 0.16, fmRatio: 2.01, fmDepth: 220, owner: 'pinball' })
      break
    case 'mission':
      void playJingle(missionStart, 'pinball')
      break
    case 'mission-complete':
      void playJingle(missionComplete, 'pinball')
      break
    case 'promotion':
      void playJingle(promotion, 'pinball')
      break
    case 'drain':
      sweep(440, 65, 0.24, { type: 'square', vol: 0.09, owner: 'pinball' })
      break
    case 'tilt':
      tone(85, 0.3, { type: 'sawtooth', vol: 0.1, owner: 'pinball' })
      tone(89, 0.3, { type: 'square', vol: 0.045, owner: 'pinball' })
      break
    case 'extra':
    case 'replay':
      void playJingle(extraBall, 'pinball')
      break
    case 'plunger-pull':
      sweep(75, 180 + Math.max(0, Math.min(1, level)) * 120, 0.07, { type: 'triangle', vol: 0.065, owner: 'pinball' })
      noise(0.045, { freq: 350, q: 4, vol: 0.04, owner: 'pinball' })
      break
    case 'plunger-release':
      tone(90, 0.07, { type: 'sine', vol: 0.16, owner: 'pinball' })
      noise(0.03, { filter: 'lowpass', freq: 800, vol: 0.1, owner: 'pinball' })
      sweep(540, 110, 0.16, { type: 'triangle', vol: 0.11, vibrato: 35, owner: 'pinball' })
      break
    case 'ball-saved':
      tone(660, 0.1, { type: 'sine', vol: 0.09, owner: 'pinball' })
      tone(990, 0.1, { type: 'sine', vol: 0.09, delay: 0.1, owner: 'pinball' })
      break
    case 'fuel-low':
      tone(330, 0.1, { type: 'square', vol: 0.055, owner: 'pinball' })
      break
    case 'nudge':
      noise(0.04, { filter: 'lowpass', freq: 250, vol: 0.09, owner: 'pinball' })
      break
  }
}
