import { DRUM, type Instrument } from './song'

export interface Voice {
  end: number
  stop(at: number): void
  dispose(): void
}

/**
 * Original, runtime-only Direct Sound palette: band-limited single-cycle reeds,
 * layered sections, two-operator FM keys, damped harmonic plucks and synthesized
 * percussion. No downloaded samples, processors, timers or per-note noise buffers.
 * Best registers: bass/tuba 28–60, guitar 40–84, winds/strings 48–96,
 * bells/music box 60–108. Other MIDI pitches work, but intentionally sound sampled.
 * Nominal melodic gain aims near 0.11 RMS at velocity .8 before part/master gain;
 * attacks and naturally decaying instruments are intentionally more dynamic.
 */
type Wave = 'sine' | 'pulse' | 'hollow' | 'saw' | 'reed' | 'flute' | 'organ' | 'guitar' | 'harp' | 'round'
type Melodic = Exclude<Instrument, 'drums'>
interface Patch {
  wave: Wave
  gain: number
  attack: number
  decay: number
  sustain: number
  release: number
  cutoff?: number
  dark?: number
  spread?: number
  vibrato?: number
  rate?: number
  scoop?: number
  fm?: number
  index?: number
  sub?: number
  breath?: number
  transient?: number
  short?: number
}

// Sustained patches use compact two-oscillator ensembles, not unbounded unison.
// Plucks use harmonic excitation + falling lowpass (a cheap, stable KS equivalent).
const PATCH: Record<Melodic, Patch> = {
  square: { wave: 'pulse', gain: .245, attack: .006, decay: .12, sustain: .86, release: .07, cutoff: 9000, vibrato: 11, rate: 5.2 },
  square50: { wave: 'hollow', gain: .235, attack: .006, decay: .1, sustain: .9, release: .07, cutoff: 8500, vibrato: 8 },
  saw_lead: { wave: 'saw', gain: .28, attack: .012, decay: .15, sustain: .86, release: .1, cutoff: 6500, dark: 2800, vibrato: 13, scoop: -35 },
  flute: { wave: 'flute', gain: .25, attack: .045, decay: .15, sustain: .9, release: .12, cutoff: 6000, vibrato: 15, rate: 5.4, breath: .024 },
  ocarina: { wave: 'round', gain: .245, attack: .025, decay: .14, sustain: .94, release: .12, cutoff: 4500, vibrato: 8, rate: 4.8 },
  trumpet: { wave: 'saw', gain: .31, attack: .035, decay: .13, sustain: .86, release: .09, cutoff: 5500, dark: 2300, vibrato: 12, scoop: -75 },
  violin: { wave: 'saw', gain: .34, attack: .06, decay: .2, sustain: .91, release: .18, cutoff: 6200, dark: 3700, spread: 5, vibrato: 19, rate: 5.7 },
  whistle: { wave: 'sine', gain: .225, attack: .012, decay: .08, sustain: .96, release: .08, vibrato: 15, rate: 6.4, scoop: -18 },
  epiano: { wave: 'sine', gain: .32, attack: .004, decay: .85, sustain: .35, release: .3, fm: 2, index: 1.2 },
  piano: { wave: 'round', gain: .34, attack: .003, decay: 1.2, sustain: .3, release: .2, fm: 1, index: 1.75, transient: .02 },
  harp: { wave: 'harp', gain: .34, attack: .003, decay: 1.35, sustain: .16, release: .65, cutoff: 9500, dark: 1600 },
  guitar: { wave: 'guitar', gain: .34, attack: .003, decay: .7, sustain: .18, release: .2, cutoff: 7500, dark: 1200, transient: .026 },
  marimba: { wave: 'sine', gain: .36, attack: .002, decay: .28, sustain: .06, release: .15, fm: 4, index: .7, short: .7 },
  bell: { wave: 'sine', gain: .32, attack: .002, decay: 1.5, sustain: .14, release: .8, fm: 3.5, index: 1.5 },
  music_box: { wave: 'sine', gain: .32, attack: .002, decay: .6, sustain: .08, release: .35, fm: 2.76, index: .85, short: 1.2 },
  organ: { wave: 'organ', gain: .24, attack: .006, decay: .06, sustain: .95, release: .055 },
  accordion: { wave: 'reed', gain: .33, attack: .026, decay: .12, sustain: .93, release: .09, cutoff: 7200, spread: 7, vibrato: 5 },
  strings: { wave: 'saw', gain: .36, attack: .14, decay: .25, sustain: .95, release: .32, cutoff: 5200, dark: 3300, spread: 9, vibrato: 7, rate: 4.7 },
  strings_stacc: { wave: 'saw', gain: .38, attack: .009, decay: .16, sustain: .25, release: .075, cutoff: 6300, dark: 1800, spread: 8, short: .23 },
  brass: { wave: 'saw', gain: .36, attack: .025, decay: .15, sustain: .86, release: .13, cutoff: 6600, dark: 2600, spread: 5, scoop: -45 },
  choir: { wave: 'saw', gain: .42, attack: .12, decay: .25, sustain: .93, release: .35, spread: 4, vibrato: 9, rate: 4.6 },
  pad: { wave: 'round', gain: .33, attack: .16, decay: .3, sustain: .95, release: .42, cutoff: 3600, dark: 1800, spread: 8, vibrato: 4, rate: 3.4 },
  orch_hit: { wave: 'saw', gain: .4, attack: .004, decay: .25, sustain: .12, release: .2, cutoff: 7800, dark: 1800, spread: 11, sub: .25, transient: .1, short: .5 },
  bass: { wave: 'hollow', gain: .28, attack: .004, decay: .18, sustain: .8, release: .07, cutoff: 2300, dark: 850, sub: .35 },
  bass_finger: { wave: 'guitar', gain: .34, attack: .006, decay: .42, sustain: .45, release: .095, cutoff: 3200, dark: 650, transient: .01 },
  bass_slap: { wave: 'round', gain: .36, attack: .002, decay: .3, sustain: .36, release: .09, fm: 2, index: 1.6, cutoff: 6500, dark: 1300, transient: .055 },
  bass_saw: { wave: 'saw', gain: .3, attack: .004, decay: .17, sustain: .8, release: .07, cutoff: 4300, dark: 1700, sub: .3 },
  tuba: { wave: 'reed', gain: .3, attack: .035, decay: .2, sustain: .88, release: .12, cutoff: 2100, dark: 900, scoop: -40, vibrato: 5 },
  timpani: { wave: 'sine', gain: .36, attack: .003, decay: .55, sustain: .08, release: .3, fm: 1.5, index: .85, scoop: 130, transient: .09, short: 1.1 },
}

interface Bank {
  waves: Map<Wave, PeriodicWave>
  noise?: AudioBuffer
  metal?: AudioBuffer
}
const banks = new WeakMap<BaseAudioContext, Bank>()
function bankFor(ctx: BaseAudioContext): Bank {
  let bank = banks.get(ctx)
  if (!bank) {
    bank = { waves: new Map() }
    banks.set(ctx, bank)
  }
  return bank
}

function waveFor(ctx: BaseAudioContext, bank: Bank, name: Wave): PeriodicWave {
  const existing = bank.waves.get(name)
  if (existing) return existing
  const real = new Float32Array(65)
  const imag = new Float32Array(65)
  let energy = 0
  for (let n = 1; n < imag.length; n++) {
    switch (name) {
      case 'sine': imag[n] = n === 1 ? 1 : 0; break
      case 'pulse':
        real[n] = Math.sin(n * Math.PI / 2) / n
        imag[n] = (1 - Math.cos(n * Math.PI / 2)) / n
        break
      case 'hollow': imag[n] = n % 2 ? 1 / n : 0; break
      case 'saw': imag[n] = (n % 2 ? 1 : -1) / n; break
      case 'reed': imag[n] = (n % 2 ? 1 : .45) / n ** 1.15; break
      case 'flute': imag[n] = n === 1 ? 1 : n === 2 ? .16 : n === 3 ? .055 : 0; break
      case 'organ': imag[n] = n === 1 ? 1 : n === 2 ? .48 : n === 3 ? .3 : n === 4 ? .22 : n === 6 ? .13 : n === 8 ? .08 : 0; break
      case 'guitar': imag[n] = Math.sin(n * .78) / n ** 1.65; break
      case 'harp': imag[n] = 1 / n ** 1.35; break
      case 'round': imag[n] = n === 1 ? 1 : n === 2 ? .23 : n === 3 ? .09 : 0; break
    }
    energy += real[n] * real[n] + imag[n] * imag[n]
  }
  const scale = 1 / Math.sqrt(energy)
  for (let n = 1; n < imag.length; n++) {
    real[n] *= scale
    imag[n] *= scale
  }
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: true })
  bank.waves.set(name, wave)
  return wave
}

function noiseFor(ctx: BaseAudioContext, bank: Bank, metal: boolean): AudioBuffer {
  const cached = metal ? bank.metal : bank.noise
  if (cached) return cached
  // 22 kHz source texture evokes GBA sample playback; filters still run at host rate.
  const sampleRate = 22050
  const buffer = ctx.createBuffer(1, sampleRate * 2, sampleRate)
  const data = buffer.getChannelData(0)
  let seed = 0x674a912b
  for (let i = 0; i < data.length; i++) {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    const white = (seed >>> 0) / 2147483648 - 1
    if (metal) {
      const t = i / sampleRate
      // Inharmonic cymbal modes + air, cached once rather than six oscillators/hit.
      data[i] = .22 * (Math.sin(t * 2 * Math.PI * 359) + Math.sin(t * 2 * Math.PI * 537)
        + Math.sin(t * 2 * Math.PI * 811) + Math.sin(t * 2 * Math.PI * 1423)
        + Math.sin(t * 2 * Math.PI * 2137) + Math.sin(t * 2 * Math.PI * 3211)) + white * .32
    } else data[i] = white
  }
  if (metal) bank.metal = buffer
  else bank.noise = buffer
  return buffer
}

/** The only public note factory. All sources, including modulators, have finite stops. */
export function synthesize(ctx: BaseAudioContext, output: AudioNode, inst: Instrument, midi: number, at: number, duration: number, velocity: number): Voice {
  const start = Math.max(ctx.currentTime, Number.isFinite(at) ? at : ctx.currentTime)
  const length = Math.max(.012, Number.isFinite(duration) ? duration : .1)
  const vel = Math.max(0, Math.min(1, Number.isFinite(velocity) ? velocity : .8))
  const pitch = Math.max(0, Math.min(127, Number.isFinite(midi) ? midi : 60))
  const hz = Math.min(ctx.sampleRate * .2, 440 * 2 ** ((pitch - 69) / 12))
  const bank = bankFor(ctx)
  const nodes: AudioNode[] = []
  const sources: AudioScheduledSourceNode[] = []
  const amp = ctx.createGain()
  nodes.push(amp)
  if (vel > 0) amp.connect(output)
  let end = start + length + .1
  let stopped = Number.POSITIVE_INFINITY
  let disposed = false
  let ended = 0
  let attackEnd = start
  let decayEnd = start
  let releaseStart = start
  let peak = 0
  let sustain = 0

  function gain(value: number, destination: AudioNode | AudioParam): GainNode {
    const node = ctx.createGain()
    node.gain.value = value
    if (destination instanceof AudioNode) node.connect(destination)
    else node.connect(destination)
    nodes.push(node)
    return node
  }
  function filter(type: BiquadFilterType, frequency: number, q: number, destination: AudioNode): BiquadFilterNode {
    const node = ctx.createBiquadFilter()
    node.type = type
    node.frequency.value = Math.min(ctx.sampleRate * .45, frequency)
    node.Q.value = q
    node.connect(destination)
    nodes.push(node)
    return node
  }
  function oscillator(frequency: number, wave: Wave, destination: AudioNode | AudioParam, level = 1, detune = 0): OscillatorNode {
    const node = ctx.createOscillator()
    node.setPeriodicWave(waveFor(ctx, bank, wave))
    node.frequency.setValueAtTime(Math.min(ctx.sampleRate * .45, frequency), start)
    node.detune.value = detune
    if (level !== 1) node.connect(gain(level, destination))
    else if (destination instanceof AudioNode) node.connect(destination)
    else node.connect(destination)
    sources.push(node)
    nodes.push(node)
    return node
  }
  function noise(destination: AudioNode, level: number, metal = false): GainNode {
    const envelope = gain(level, destination)
    const source = ctx.createBufferSource()
    source.buffer = noiseFor(ctx, bank, metal)
    source.loop = true
    source.connect(envelope)
    sources.push(source)
    nodes.push(source)
    return envelope
  }
  function envelope(attack: number, decay: number, hold: number, release: number, level: number, body: number): void {
    attackEnd = start + Math.min(attack, hold * .65)
    decayEnd = Math.min(attackEnd + decay, start + hold)
    releaseStart = start + hold
    end = releaseStart + release
    peak = level
    sustain = level * body
    amp.gain.setValueAtTime(0, start)
    amp.gain.linearRampToValueAtTime(peak, attackEnd)
    amp.gain.exponentialRampToValueAtTime(Math.max(.00001, sustain), decayEnd)
    amp.gain.setValueAtTime(Math.max(.00001, sustain), releaseStart)
    amp.gain.exponentialRampToValueAtTime(.00001, end)
    amp.gain.setValueAtTime(0, end + .002)
    end += .004
  }
  function burst(parameter: AudioParam, level: number, decay: number, delay = 0): void {
    const time = start + delay
    parameter.setValueAtTime(0, start)
    parameter.setValueAtTime(level, time)
    parameter.exponentialRampToValueAtTime(.00001, time + decay)
  }
  function drumTone(frequency: number, level: number, decay: number, sweep = 1, wave: Wave = 'sine'): void {
    const volume = gain(0, amp)
    burst(volume.gain, level, decay)
    const source = oscillator(frequency * sweep, wave, volume)
    source.frequency.exponentialRampToValueAtTime(frequency, start + Math.min(.08, decay * .5))
  }
  function drumNoise(level: number, decay: number, frequency: number, type: BiquadFilterType = 'highpass', metal = false): GainNode {
    const tone = filter(type, frequency, type === 'bandpass' ? .75 : .6, amp)
    const volume = noise(tone, 0, metal)
    burst(volume.gain, level, decay)
    return volume
  }

  if (inst !== 'drums') {
    const patch = PATCH[inst]
    const hold = patch.short ? Math.min(length, patch.short) : length
    envelope(patch.attack, patch.decay, hold, patch.release, patch.gain * vel, patch.sustain)
    let destination: AudioNode = amp
    if (patch.cutoff) {
      const cutoff = Math.max(hz * 1.5, patch.cutoff * (.45 + vel * .55))
      const lowpass = filter('lowpass', cutoff, .65, amp)
      if (patch.dark) {
        const dark = Math.min(ctx.sampleRate * .45, Math.max(hz * 1.25, patch.dark * (.55 + vel * .45)))
        lowpass.frequency.setValueAtTime(Math.min(ctx.sampleRate * .45, cutoff * .55), start)
        lowpass.frequency.linearRampToValueAtTime(Math.min(ctx.sampleRate * .45, cutoff), start + Math.min(.035, hold * .4))
        lowpass.frequency.exponentialRampToValueAtTime(dark, start + Math.max(.04, Math.min(patch.decay, hold)))
      }
      destination = lowpass
    }
    if (inst === 'choir') {
      // Fixed vowel formants, not pitch-tracking wah: parallel aah bands + chest.
      const sum = gain(1, amp)
      const chest = filter('lowpass', 650, .5, gain(.48, sum))
      const mouth = filter('bandpass', 900, 1.7, gain(1.4, sum))
      const presence = filter('bandpass', 2400, 2.2, gain(.7, sum))
      const inlet = gain(1, chest)
      inlet.connect(mouth)
      inlet.connect(presence)
      destination = inlet
    }
    const carriers: OscillatorNode[] = []
    const mainLevel = patch.sub ? 1 / (1 + patch.sub) : 1
    if (patch.spread) {
      carriers.push(oscillator(hz, patch.wave, destination, mainLevel * .56, -patch.spread))
      carriers.push(oscillator(hz, patch.wave, destination, mainLevel * .56, patch.spread))
    } else carriers.push(oscillator(hz, patch.wave, destination, mainLevel))
    if (patch.sub) oscillator(hz / 2, 'sine', destination, patch.sub * mainLevel)
    if (patch.fm) {
      const index = gain(0, carriers[0].frequency)
      const depth = hz * (patch.index ?? 1) * (.2 + vel * .8)
      index.gain.setValueAtTime(depth, start)
      index.gain.exponentialRampToValueAtTime(Math.max(.01, depth * .06), start + Math.max(.025, patch.decay * .8))
      oscillator(hz * patch.fm, 'sine', index)
    }
    if (patch.scoop) {
      for (const carrier of carriers) {
        const detune = carrier.detune.value
        carrier.detune.setValueAtTime(detune + patch.scoop, start)
        carrier.detune.linearRampToValueAtTime(detune, start + (inst === 'timpani' ? .08 : .065))
      }
    }
    if (patch.vibrato) {
      const depth = gain(0, carriers[0].detune)
      for (let i = 1; i < carriers.length; i++) depth.connect(carriers[i].detune)
      depth.gain.setValueAtTime(0, start)
      depth.gain.setValueAtTime(0, start + .12)
      depth.gain.linearRampToValueAtTime(patch.vibrato, start + .3)
      oscillator(patch.rate ?? 5.1, 'sine', depth)
    }
    if (patch.breath) noise(filter('bandpass', Math.min(8000, hz * 3), .7, amp), patch.breath)
    if (patch.transient) {
      const tick = noise(filter('bandpass', inst === 'timpani' ? 600 : 2600, .7, amp), 0)
      burst(tick.gain, patch.transient * (0.3 + vel), inst === 'timpani' ? .11 : .025)
    }
  } else {
    // Each drum is a tuned body plus a separate noisy/metallic articulation.
    // The score's duration only gates the timpani roll; other drums are one-shots.
    let tail = .25
    switch (Math.round(pitch)) {
      case DRUM.kick:
        tail = .38
        drumTone(48, .55, .32, 3.4)
        drumNoise(.16, .018, 2400, 'lowpass')
        break
      case DRUM.rim:
        tail = .1
        drumTone(1680, .28, .035, 1.1, 'round')
        drumTone(430, .18, .065)
        drumNoise(.12, .016, 1800)
        break
      case DRUM.snare:
      case DRUM.snare2:
        tail = .3
        drumTone(pitch === DRUM.snare2 ? 210 : 175, .3, .12, 1.45)
        drumTone(330, .1, .08)
        drumNoise(.8, pitch === DRUM.snare2 ? .24 : .18, pitch === DRUM.snare2 ? 2400 : 1500)
        break
      case DRUM.clap: {
        tail = .27
        const claps = drumNoise(.65, .2, 1500, 'bandpass')
        for (let i = 0; i < 3; i++) {
          claps.gain.setValueAtTime(.75 - i * .1, start + i * .013)
          claps.gain.exponentialRampToValueAtTime(.04, start + i * .013 + .01)
        }
        claps.gain.setValueAtTime(.42, start + .043)
        claps.gain.exponentialRampToValueAtTime(.00001, start + .25)
        break
      }
      case DRUM.tomLow:
      case DRUM.tomMid:
      case DRUM.tomHigh: {
        const frequency = pitch === DRUM.tomLow ? 95 : pitch === DRUM.tomMid ? 135 : 185
        tail = .42
        drumTone(frequency, .43, .36, 1.7)
        drumTone(frequency * 1.58, .16, .14, 1.1)
        drumNoise(.18, .04, 1200, 'lowpass')
        break
      }
      case DRUM.hatClosed:
      case DRUM.hatPedal:
      case DRUM.hatOpen:
        tail = pitch === DRUM.hatOpen ? .5 : pitch === DRUM.hatPedal ? .12 : .075
        drumNoise(.55, tail, 6300, 'highpass', true)
        drumNoise(.21, tail * .7, 7400)
        break
      case DRUM.crash:
        tail = 1.65
        drumNoise(.62, 1.6, 3500, 'highpass', true)
        drumNoise(.32, .95, 6200)
        break
      case DRUM.ride:
        tail = .95
        drumNoise(.34, .85, 4700, 'highpass', true)
        drumTone(3200, .15, .5)
        drumTone(5110, .08, .34)
        break
      case DRUM.tambourine:
        tail = .21
        drumNoise(.6, .19, 4700, 'highpass', true)
        drumNoise(.18, .035, 2600, 'bandpass')
        break
      case DRUM.cowbell:
        tail = .22
        drumTone(560, .23, .2, 1, 'hollow')
        drumTone(845, .17, .16, 1, 'hollow')
        break
      case DRUM.shaker:
        tail = .12
        drumNoise(.62, .11, 6200)
        break
      case DRUM.conga:
      case DRUM.bongo: {
        const frequency = pitch === DRUM.conga ? 215 : 390
        tail = .25
        drumTone(frequency, .42, .23, 1.42)
        drumTone(frequency * 1.61, .14, .08)
        drumNoise(.14, .026, 1900, 'bandpass')
        break
      }
      case DRUM.woodblock:
        tail = .11
        drumTone(820, .35, .085, 1, 'round')
        drumTone(1240, .19, .055)
        break
      case DRUM.timpaniRoll: {
        tail = length + .38
        const body = gain(0, amp)
        oscillator(73.42, 'sine', body, .38)
        oscillator(110.13, 'sine', body, .13)
        noise(filter('lowpass', 1050, .65, body), .3)
        body.gain.setValueAtTime(0, start)
        for (let t = 0, hit = 0; t < length; t += .075, hit++) {
          const strength = (.62 + .32 * Math.min(1, t / Math.max(.1, length))) * (hit % 2 ? .84 : 1)
          body.gain.setValueAtTime(strength * .25, start + t)
          body.gain.linearRampToValueAtTime(strength, start + Math.min(length, t + .003))
          body.gain.exponentialRampToValueAtTime(.16, start + Math.min(length, t + .072))
        }
        body.gain.setValueAtTime(.6, start + length)
        body.gain.exponentialRampToValueAtTime(.00001, start + tail)
        break
      }
      default:
        // Unmapped GM notes remain a short neutral stick, never a hanging voice.
        tail = .09
        drumTone(1100, .25, .07)
        break
    }
    envelope(.001, .001, Math.max(.003, tail - .018), .02, vel, 1)
  }

  const naturalEnd = end
  function envelopeAt(time: number): number {
    if (time <= start) return 0
    if (time < attackEnd) return peak * (time - start) / (attackEnd - start)
    if (time < decayEnd) return peak * (Math.max(.00001, sustain) / Math.max(.00001, peak)) ** ((time - attackEnd) / (decayEnd - attackEnd))
    if (time <= releaseStart) return sustain
    return Math.max(.00001, sustain) * (.00001 / Math.max(.00001, sustain)) ** Math.min(1, (time - releaseStart) / (naturalEnd - .004 - releaseStart))
  }
  const voice: Voice = {
    get end() { return end },
    stop(time: number) {
      if (disposed) return
      const when = Math.max(ctx.currentTime, Number.isFinite(time) ? time : ctx.currentTime)
      if (when >= stopped || when >= end) return
      stopped = when
      // Holding the scheduled envelope avoids clicks even when stolen mid-attack.
      if (typeof amp.gain.cancelAndHoldAtTime === 'function') amp.gain.cancelAndHoldAtTime(when)
      else {
        const value = envelopeAt(when)
        amp.gain.cancelScheduledValues(when)
        amp.gain.setValueAtTime(value, when)
      }
      amp.gain.linearRampToValueAtTime(0, when + .01)
      end = when + .012
      for (const source of sources) source.stop(end)
    },
    dispose() {
      if (disposed) return
      disposed = true
      for (const source of sources) {
        source.onended = null
        source.stop()
      }
      for (const node of nodes) node.disconnect()
    },
  }
  for (const source of sources) {
    source.onended = () => {
      ended++
      if (ended === sources.length) voice.dispose()
    }
    source.start(start)
    source.stop(end)
  }
  return voice
}
