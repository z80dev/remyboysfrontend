import { chord, getGamesAudio, isGamesMuted, playJingle, stopSounds, sweep, tone } from '../kit'
import { wallBusy, type Game } from './engine'
import { fanfare } from './music/fanfare'

const soft = { vol: 0.06, owner: 'jezzbald' }
const tick = { vol: 0.018, type: 'sine' as const, owner: 'jezzbald' }
const harmony = [48, 55, 60]

/** A single sustained voice follows wall growth; SFX are owned and cancelled on every pause and close. */
export class GameAudio {
  private oscillator: OscillatorNode | null = null
  private gain: GainNode | null = null
  private starts = 0
  private completions = 0
  private losses = 0
  private bounce = -1000
  private phase = 'playing'

  update(g: Game): void {
    if (g.starts !== this.starts) {
      this.starts = g.starts
      tone(700, 0.025, soft)
    }
    if (g.completions !== this.completions) {
      this.completions = g.completions
      sweep(180, 70, 0.08, soft)
      chord(harmony, 0.12, soft)
    }
    if (g.losses !== this.losses) {
      this.losses = g.losses
      sweep(160, 45, 0.22, soft)
    }
    for (let i = 0; i < g.atomCount; i++) {
      if (g.bounceAt[i] > this.bounce && g.elapsed - this.bounce >= 40) {
        this.bounce = g.elapsed
        tone(500 + (i % 8) * 65, 0.015, tick)
        break
      }
    }
    if (g.phase !== this.phase) {
      this.phase = g.phase
      if (g.phase === 'complete') void playJingle(fanfare, 'jezzbald')
      if (g.phase === 'over') sweep(400, 80, 0.65, soft)
    }
    const audio = getGamesAudio()
    if (!wallBusy(g) || g.phase !== 'playing' || isGamesMuted() || !audio || audio.ctx.state !== 'running') {
      this.stopGrowth()
      return
    }
    if (!this.oscillator) {
      this.oscillator = audio.ctx.createOscillator()
      this.gain = audio.ctx.createGain()
      this.oscillator.type = 'square'
      this.gain.gain.setValueAtTime(0, audio.ctx.currentTime)
      this.gain.gain.linearRampToValueAtTime(0.018, audio.ctx.currentTime + 0.03)
      this.oscillator.connect(this.gain).connect(audio.out)
      this.oscillator.start()
    }
    this.oscillator.frequency.setTargetAtTime(150 + Math.max(g.halves[0].length, g.halves[1].length) * 0.7, audio.ctx.currentTime, 0.04)
  }

  private stopGrowth(): void {
    if (!this.oscillator || !this.gain) return
    const oscillator = this.oscillator
    const gain = this.gain
    const now = oscillator.context.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(0, now + 0.02)
    oscillator.stop(now + 0.03)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
    this.oscillator = null
    this.gain = null
  }

  reset(): void {
    this.stop()
    this.starts = this.completions = this.losses = 0
    this.bounce = -1000
    this.phase = 'playing'
  }

  stop(): void {
    this.stopGrowth()
    stopSounds('jezzbald')
  }
}
