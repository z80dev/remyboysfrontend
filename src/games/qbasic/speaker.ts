import { envelope, getGamesAudio, isGamesMuted, midiHz } from '../kit'
import { parseMml } from './mml'

export type MmlPlayback = { stop: () => void; done: Promise<void>; duration: number; background: boolean }

/** Single-voice PC speaker through the kit master, with explicit disposal for DOS program lifecycle. */
export function playMml(source: string): MmlPlayback {
  const score = parseMml(source)
  let timer: number | undefined
  let oscillator: OscillatorNode | undefined
  let gain: GainNode | undefined
  let stopped = false
  let resolve!: () => void
  const done = new Promise<void>((finish) => { resolve = finish })
  const release = () => {
    if (oscillator) {
      oscillator.onended = null
      try { oscillator.stop() } catch { /* A naturally-ended voice is already stopped. */ }
      oscillator.disconnect()
      oscillator = undefined
    }
    gain?.disconnect()
    gain = undefined
  }
  const stop = () => {
    if (stopped) return
    stopped = true
    clearTimeout(timer)
    release()
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', visibility)
    resolve()
  }
  const visibility = () => { if (document.hidden) stop() }
  const audio = getGamesAudio()
  if (!audio || isGamesMuted() || audio.ctx.state !== 'running' || (typeof document !== 'undefined' && document.hidden)) {
    stop()
    return { stop, done, duration: score.duration, background: score.background }
  }
  const origin = audio.ctx.currentTime
  let index = 0
  const next = () => {
    if (stopped) return
    release()
    if (isGamesMuted() || audio.ctx.state !== 'running' || index === score.notes.length) { stop(); return }
    const note = score.notes[index++]
    const at = Math.max(audio.ctx.currentTime, origin + note.start)
    if (note.midi !== null) {
      oscillator = audio.ctx.createOscillator()
      gain = audio.ctx.createGain()
      oscillator.type = 'square'
      oscillator.frequency.value = midiHz(note.midi)
      envelope(gain.gain, at, 0.12, note.duration * note.gate, 0.002)
      oscillator.connect(gain).connect(audio.out)
      oscillator.start(at)
      oscillator.stop(at + note.duration * note.gate)
    }
    timer = window.setTimeout(next, Math.max(0, (origin + note.start + note.duration - audio.ctx.currentTime) * 1000))
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', visibility)
  next()
  return { stop, done, duration: score.duration, background: score.background }
}
