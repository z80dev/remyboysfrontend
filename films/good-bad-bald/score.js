// THE GOOD, THE BAD & THE BALD — original spaghetti-western score. 120 BPM, D minor, bar = 2 s.
// One timing truth: every cue is scheduled from timeline.js (T = shots, EV = picture events,
// HEARTBEATS = the standoff thump grid, DRAW_CLOCK = the quick-draw hit-stop clock).
//
// THE THEME — an original 8-bar D-minor whistle motif (pastiche, nothing quoted):
//   CALL    bars 4–5 (8–12)    D5 F5 E5 D5 · C5 A4 D5(long) — the motif, arching to the tonic
//   ARCH    bar 6 (12–13.4)    E5 F5 G5 A5 — the peak; the held subline D5 answers it, alone
//   TOWN    bars 8–11 (16–24)  motif restated + twang answer, then the phrase re-centred
//                              a 6th up (B♭5 D6 C6 B♭5 · A5 E5 A5) over ♭VI–V
//   FINALE  56–67.5            reprise in D MAJOR (F♯5/C♯5), decrescendo to whistle alone by 66
// Custom voices — whistle, twang, boing, chant, howl, hawkCry, creak, buzzFly, ricZip, gallop,
// shing, rustle, bang, braamBent — all built on kit.at and always mixed through kit.out.
import { T, EV, HEARTBEATS, DRAW_CLOCK, B, BAR, DURATION } from './timeline.js'

export function score(kit) {
  const k = kit
  const { ac, at, osc, noise, env, out, hz } = kit

  // ---------- custom voices (cached waveform, explicit envelopes, positive endpoints) ----------
  const waves = {}
  const softTriangle = () => waves.st || (waves.st = (() => {
    const n = 24, re = new Float32Array(n), im = new Float32Array(n)
    for (let i = 1; i < n; i += 2) im[i] = ((i >> 1) % 2 ? -1 : 1) / (i * i) // mellow, whistle-ish
    return ac.createPeriodicWave(re, im)
  })())

  // lone whistle: soft triangle + delayed vibrato (5.5 Hz, ~6 cents) + a whiff of breath
  const whistle = (t, m, dur, { g = 0.16, slideFrom = null } = {}) => at(t, () => {
    const o = osc('sine', hz(m), t, dur + 0.3)
    o.setPeriodicWave(softTriangle())
    if (slideFrom != null) {
      o.frequency.setValueAtTime(hz(slideFrom), t)
      o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.14) // portamento into the note
    }
    const vib = osc('sine', 5.5, t, dur + 0.3)
    const vg = ac.createGain()
    vg.gain.setValueAtTime(0, t)
    vg.gain.setValueAtTime(0, t + 0.18)
    vg.gain.linearRampToValueAtTime(6, t + 0.55) // vibrato only once the attack has settled
    vib.connect(vg).connect(o.detune)
    const a = ac.createGain()
    env(a.gain, t, 0.07, g, dur, g * 0.7, 0.2)
    o.connect(a)
    out(a, 1, 0.35, 0, 0.15)
    const n = noise(t, 0.28)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = Math.min(9000, hz(m) * 2.5)
    bp.Q.value = 1.2
    const ng = ac.createGain()
    env(ng.gain, t, 0.05, g * 0.12, 0.22, g * 0.05, 0.08)
    n.connect(bp).connect(ng)
    out(ng, 1, 0.25, 0, 0.2)
  })

  // twanged guitar pluck: fast pitch dip, lowpassed, slapback echo panned opposite
  const twang = (t, m, { g = 0.12, pan = -0.25, dur = 0.9 } = {}) => at(t, () => {
    const o = osc('sawtooth', hz(m) * 1.06, t, dur + 0.1)
    o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.06)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1800
    lp.Q.value = 1
    const a = ac.createGain()
    env(a.gain, t, 0.004, g, dur, 0.0001, 0.05)
    o.connect(lp).connect(a)
    out(a, 1, 0.3, pan)
    const dl = ac.createDelay(1)
    dl.delayTime.value = 0.26
    const fb = ac.createGain()
    fb.gain.value = 0.25
    const eg = ac.createGain()
    eg.gain.value = 0.5
    a.connect(dl)
    dl.connect(fb).connect(dl)
    dl.connect(eg)
    out(eg, 1, 0.15, pan > 0 ? -0.3 : 0.3)
  })

  // jew's harp: sine with exponential pitch drop + 2nd harmonic, fast decay
  const boing = (t, { g = 0.14 } = {}) => at(t, () => {
    const o = osc('sine', 90, t, 0.5)
    o.frequency.exponentialRampToValueAtTime(52, t + 0.16)
    const o2 = osc('sine', 180, t, 0.3)
    o2.frequency.exponentialRampToValueAtTime(104, t + 0.14)
    const a = ac.createGain()
    env(a.gain, t, 0.003, g, 0.32)
    const a2 = ac.createGain()
    env(a2.gain, t, 0.002, g * 0.35, 0.18)
    o.connect(a)
    o2.connect(a2)
    out(a, 1, 0.18, 0.2)
    out(a2, 1, 0.18, 0.2)
  })

  // men-in-a-room 'ah': detuned saws through a formant-ish bandpass, slow attack
  const chant = (t, notes, dur, { g = 0.06, atk = 0.5 } = {}) => at(t, () => {
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 800
    bp.Q.value = 1.1
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + atk)
    a.gain.setValueAtTime(g, t + Math.max(atk, dur - 0.4))
    a.gain.linearRampToValueAtTime(0, t + dur)
    for (const m of notes)
      for (const det of [-10, 3, 9]) {
        const o = osc('sawtooth', hz(m), t, dur + 0.1)
        o.detune.value = det
        o.connect(bp)
      }
    bp.connect(a)
    out(a, 1, 0.45, 0, 0.6)
  })

  // coyote: sine glide up then down, vibrato arriving late, one canyon echo
  const howl = (t, { g = 0.05 } = {}) => at(t, () => {
    const o = osc('sine', 520, t, 1.5)
    o.frequency.exponentialRampToValueAtTime(780, t + 0.45)
    o.frequency.exponentialRampToValueAtTime(420, t + 1.4)
    const vib = osc('sine', 6, t, 1.5)
    const vg = ac.createGain()
    vg.gain.setValueAtTime(0, t)
    vg.gain.linearRampToValueAtTime(14, t + 0.7)
    vib.connect(vg).connect(o.detune)
    const a = ac.createGain()
    env(a.gain, t, 0.12, g, 1.15, g * 0.3, 0.25)
    o.connect(a)
    out(a, 1, 0.5, 0.1)
    const dl = ac.createDelay(1)
    dl.delayTime.value = 0.45
    const eg = ac.createGain()
    eg.gain.value = 0.3
    a.connect(dl).connect(eg)
    out(eg, 1, 0.1, -0.2)
  })

  // hawk: short falling square cry, tiny
  const hawkCry = (t, { g = 0.035 } = {}) => at(t, () => {
    const o = osc('square', 1400, t, 0.3)
    o.frequency.exponentialRampToValueAtTime(900, t + 0.22)
    const a = ac.createGain()
    env(a.gain, t, 0.02, g, 0.2, g * 0.4, 0.08)
    o.connect(a)
    out(a, 1, 0.35, -0.35)
  })

  // saloon door / old wood: slow falling saw, lowpassed, quiet
  const creak = (t, { g = 0.05 } = {}) => at(t, () => {
    const o = osc('sawtooth', 85, t, 1.3)
    o.frequency.exponentialRampToValueAtTime(65, t + 1.2)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 300
    const a = ac.createGain()
    env(a.gain, t, 0.18, g, 0.85, g * 0.5, 0.25)
    o.connect(lp).connect(a)
    out(a, 1, 0.15)
  })

  // the fly who isn't afraid: saw through bandpass with 28 Hz AM wobble — barely there
  const buzzFly = (t0, t1) => at(t0, () => {
    const o = osc('sawtooth', 210, t0, t1 - t0 + 0.05)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1100
    bp.Q.value = 2
    const gate = ac.createGain()
    gate.gain.value = 0.5
    const lfo = osc('sine', 28, t0, t1 - t0 + 0.05)
    const lg = ac.createGain()
    lg.gain.value = 0.5
    lfo.connect(lg).connect(gate.gain)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t0)
    a.gain.linearRampToValueAtTime(0.025, t0 + 0.4)
    a.gain.setValueAtTime(0.025, t1 - 0.3)
    a.gain.linearRampToValueAtTime(0, t1)
    o.connect(bp).connect(gate).connect(a)
    out(a, 1, 0.1, -0.2)
  })

  // razor kissed to a strop: bright bandpassed noise flick
  const shing = (t) => at(t, () => {
    const n = noise(t, 0.16)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(6500, t)
    bp.frequency.exponentialRampToValueAtTime(8800, t + 0.1)
    bp.Q.value = 2.5
    const a = ac.createGain()
    env(a.gain, t, 0.004, 0.07, 0.12, 0.0001, 0.03)
    n.connect(bp).connect(a)
    out(a, 1, 0.25, 0.3)
  })

  // wanted poster pushed into frame: stuttered lowpassed paper rustle
  const rustle = (t) => at(t, () => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1400
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.09
      a.gain.linearRampToValueAtTime(0.06 - i * 0.012, tt + 0.03)
      a.gain.linearRampToValueAtTime(0.008, tt + 0.07)
    }
    a.gain.linearRampToValueAtTime(0, t + 0.34)
    noise(t, 0.35).connect(lp).connect(a)
    out(a, 1, 0.2, -0.1)
  })

  // the Cabald kick out: door bang = swept lowpass noise thump + low body
  const bang = (t) => at(t, () => {
    const n = noise(t, 0.25)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(900, t)
    lp.frequency.exponentialRampToValueAtTime(160, t + 0.2)
    const a = ac.createGain()
    env(a.gain, t, 0.003, 0.55, 0.22)
    n.connect(lp).connect(a)
    out(a, 1, 0.35)
    const o = osc('sine', 82, t, 0.3)
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18)
    const og = ac.createGain()
    env(og.gain, t, 0.002, 0.4, 0.25)
    o.connect(og)
    out(og, 1, 0.2)
  })

  // THE BALD close-up: braam on F2 that bends and sags — the toupee is in danger
  const braamBent = (t) => at(t, () => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.Q.value = 1.2
    lp.frequency.setValueAtTime(140, t)
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.3)
    lp.frequency.exponentialRampToValueAtTime(220, t + 1.4)
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(0.18, t + 0.08)
    a.gain.setTargetAtTime(0.09, t + 0.3, 0.4)
    a.gain.linearRampToValueAtTime(0, t + 1.4)
    for (const det of [-12, 0, 11]) {
      const o = osc('sawtooth', hz(41) * 1.07, t, 1.45)
      o.detune.value = det
      o.frequency.exponentialRampToValueAtTime(hz(41) * 0.94, t + 0.55) // the bend
      o.connect(lp)
    }
    lp.connect(a)
    out(a, 1, 0.4, 0, 0.5)
  })

  // ricochet zing: falling sine whistle + faint noise tick
  const ricZip = (t, pan = 0.3) => at(t, () => {
    const o = osc('sine', 2800, t, 0.4)
    o.frequency.exponentialRampToValueAtTime(700, t + 0.35)
    const a = ac.createGain()
    env(a.gain, t, 0.006, 0.09, 0.3, 0.0001, 0.06)
    o.connect(a)
    out(a, 1, 0.35, pan)
    const n = noise(t, 0.03)
    const hp = ac.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 6000
    const ng = ac.createGain()
    env(ng.gain, t, 0.001, 0.03, 0.02)
    n.connect(hp).connect(ng)
    out(ng, 1, 0.1, pan)
  })

  // hoofbeats: soft kick on the strong thud, dust-puff noise+tri on the weak, swung 8ths
  const gallop = (t0, t1, { g = 0.2, fadeIn = 0, fade = 0, step = B / 2 } = {}) => {
    let i = 0
    for (let t = t0; t < t1 - 0.02; t += step, i++) {
      const tHit = t + (i % 2 ? step * 0.16 : 0) // light swing on the off-thud
      let f = 1
      if (fadeIn > 0) f = Math.min(f, 0.25 + 0.75 * ((tHit - t0) / fadeIn))
      if (fade > 0) f = Math.min(f, Math.max(0, (t1 - tHit) / fade))
      const gg = g * f
      if (gg < 0.004) continue
      if (i % 2 === 0) k.kick(tHit, gg)
      else at(tHit, () => {
        const n = noise(tHit, 0.09)
        const lp = ac.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 380
        const a = ac.createGain()
        env(a.gain, tHit, 0.004, gg * 0.8, 0.08)
        n.connect(lp).connect(a)
        out(a, 1, 0.1)
        const o = osc('triangle', 95, tHit, 0.12)
        o.frequency.exponentialRampToValueAtTime(55, tHit + 0.1)
        const og = ac.createGain()
        env(og.gain, tHit, 0.003, gg * 0.6, 0.1)
        o.connect(og)
        out(og, 1, 0.08)
      })
    }
  }

  // ================ DAWN 0–8 — flats at first light ================
  k.wind(T.dawn, T.title, 0.13)
  twang(T.dawn, 38, { g: 0.12, dur: 1.9 }) // D2 whole-note let
  twang(T.dawn + BAR, 50, { g: 0.09, dur: 1.9 }) // D3
  twang(T.dawn + BAR, 45, { g: 0.07, dur: 1.9 }) // +A2
  twang(T.dawn + 2 * BAR, 38, { g: 0.12, dur: 1.9 })
  twang(T.dawn + 3 * BAR, 50, { g: 0.09, dur: 1.9 })
  twang(T.dawn + 3 * BAR, 45, { g: 0.07, dur: 1.9 })
  howl(EV.coyote) // 2.6 — lone howl across the flats
  hawkCry(EV.hawk) // 6.5
  gallop(EV.hawk, T.title, { g: 0.1, fadeIn: 1.2 }) // the rider grows out of the heat haze

  // ================ TITLE 8–16 — MAIN THEME, D minor ================
  chant(T.title, [50, 53, 57], 5.3, { g: 0.055 }) // Dm men — released before the subline
  const gallopBar = (t0) => {
    k.kick(t0, 0.3) // beat 1
    k.kick(t0 + 1.5 * B, 0.22) // beat 2.5
    for (let e = 0; e < 8; e++) k.hat(t0 + e * B / 2, e % 2 ? 0.022 : 0.038, 0.04)
  }
  gallopBar(T.title)
  gallopBar(T.title + BAR)
  for (let e = 0; e < 5; e++) k.hat(T.title + 8 * B + e * B / 2, 0.03 - e * 0.004, 0.04) // thinning toward the subline
  const CALL = [[0, 74], [0.5, 77], [1, 76], [1.5, 74], [2, 72], [2.5, 69], [3, 74]] // D5 F5 E5 D5 · C5 A4 D5
  CALL.forEach(([off, m], i) => whistle(T.title + off, m, i === 6 ? 1.2 : 0.42, { g: 0.16 }))
  const ARCH = [[0, 76], [0.35, 77], [0.7, 79], [1.05, 81]] // E5 F5 G5 A5 — the peak
  ARCH.forEach(([off, m]) => whistle(T.title + 4 * BAR + off, m, 0.3, { g: 0.14 }))
  whistle(EV.subline, 74, 2.3, { g: 0.16, slideFrom: 81 }) // 13.4 — the held D5 answers, alone
  const ANSW = [[0, 62], [0.18, 60], [0.36, 57], [0.58, 50]] // twang rip: D4 C4 A3 D3
  ANSW.forEach(([off, m]) => twang(T.title + 9 * B + off, m, { g: 0.1, dur: 0.55 })) // 12.5, after the call
  for (const t of [EV.p1, EV.p2, EV.p3]) { // wanted-poster slams 8.6 / 9.7 / 10.8
    twang(t, 62, { g: 0.13, dur: 0.5 })
    k.taiko(t, 0.42)
  }
  k.braam(EV.titleSlam, [38, 45], 3) // 11.9 — THE GOOD, THE BAD & THE BALD
  k.taiko(EV.titleSlam, 0.6)
  k.sub(EV.titleSlam, 0.35, 73, 36, 1.6) // low D under the slam

  // ================ TOWN 16–24 — theme continues, strings join ================
  chant(T.town, [50, 53, 57], 8, { g: 0.05 })
  k.strings(T.town, [50, 57, 62, 65], 8, 0.035, 1.2, 0.8) // Dm bed, released by 24.8
  k.pad(T.town, [38, 45, 50], 4, 0.026, 750, 1.4) // D
  k.pad(T.town + 2 * BAR, [46, 50, 53], 2, 0.026, 850, 0.5) // B♭ under the 6th-up phrase
  k.pad(T.town + 3 * BAR, [45, 49, 52], 2, 0.026, 850, 0.5) // A (V)
  gallop(EV.enter, EV.arrive, { g: 0.22, step: B }) // trot to the hitching post, 16.3–21
  CALL.forEach(([off, m], i) => whistle(T.town + off, m, i === 6 ? 1.0 : 0.42, { g: 0.15 }))
  ANSW.forEach(([off, m]) => twang(T.town + 7 * B + off, m, { g: 0.09, dur: 0.5 })) // 19.5, under the held D5
  const SIXUP = [[0, 82], [0.5, 86], [1, 84], [1.5, 82], [2, 81], [2.5, 76]] // B♭5 D6 C6 B♭5 · A5 E5
  SIXUP.forEach(([off, m]) => whistle(T.town + 4 * BAR + off, m, 0.42, { g: 0.15 }))
  whistle(T.town + 4 * BAR + 3, 81, 0.8, { g: 0.15 }) // A5 held — resolves exactly at the saloon cut
  k.kick(EV.dismount, 0.5) // 21.4 — boots hit the street
  creak(EV.dismount, { g: 0.04 })
  creak(EV.doorsSwing, { g: 0.05 }) // 23.4 — the batwings
  k.piano(EV.doorsSwing, 50, 0.08, 2.0) // faint saloon piano, one flat D

  // ================ SALOON 24–34 — strip to tension ================
  k.drone(T.saloon, T.standoff, [38, 45], 0.03, 320) // room tone D2/A2
  for (let i = 0; i < 5; i++) boing(T.saloon + i * BAR) // jew's harp on 24/26/28/30/32
  buzzFly(EV.fly[0], EV.fly[0] + 2.4) // 28.2
  buzzFly(EV.fly[1] - 1.6, EV.fly[1] + 0.2) // 31.8–33.6
  rustle(EV.posterIn) // 25.4
  for (const t of EV.shing) { // razors 27.6 / 29.2 / 30.6
    shing(t)
    k.tick(t, 0.04, 5200)
  }
  k.braam(EV.cuBad[0], [36], 1.5, 0.22) // 32.3 — the Bad looks up

  // ================ STANDOFF 34–48 — hearts, wind, the long wait ================
  bang(EV.burst) // 34.05 — the doors take the kick
  for (let i = 0; i < 3; i++) k.taiko(T.standoff + i * BAR, 0.5) // bars 17–19, alone
  for (let i = 0; i < HEARTBEATS.length; i++) {
    const g = 0.25 + (i / (HEARTBEATS.length - 1)) * 0.6 // 0.25 → 0.85 across the grid
    k.heartbeat(HEARTBEATS[i], g)
  }
  for (const t of [41.0, 42.5, 44.2, 45.8]) k.tick(t, 0.05, 3000) // spur shifts (cue-map constants, between thumps)
  k.wind(EV.windUp, T.draw, 0.2) // 39.6–48, envelope lands zero exactly on the cut
  k.flutter(EV.tumble2, EV.tumble2 + 1.2, 0.04) // 41.2 — background tumbleweed
  k.braam(EV.cuGood2[0], [38], 2, 0.18) // 42.4
  k.braam(EV.cuBad2[0], [36], 1.6, 0.2) // 44.1
  braamBent(EV.cuBald[0]) // 45.4 — the dome, bent
  k.riser(EV.riser[0], EV.riser[1], 0.3) // 46.2–47.94
  // HARD SILENCE 47.95–48.0 — everything above cuts into it; nothing new is scheduled there.

  // ================ DRAW 48–56 — the bell, the shot ================
  k.bell(EV.bell, 98, 0.32, 4) // the noon bell, ringing over the freeze
  k.impact(EV.bell, 0.4, 45)
  k.wind(EV.twitch - 0.55, EV.twitch + 0.05, 0.04) // 48.3–48.9 — held breath
  k.tick(EV.twitch, 0.05, 3000) // 48.85 — the fingers
  at(EV.shot, () => { // 49.00 — THE GUNSHOT: white-noise burst, loudest event of the film
    const n = noise(EV.shot, 0.2)
    const a = ac.createGain()
    env(a.gain, EV.shot, 0.001, 1.0, 0.14)
    n.connect(a)
    out(a, 1, 0.55) // let the canyon ring
  })
  k.impact(EV.shot, 1.0, 38)
  k.sub(EV.shot, 0.6, 120, 30, 1.6)
  k.hiss(EV.shot + 2 * DRAW_CLOCK.stops[0].d, 1.0, 0.05) // gunsmoke lingers two stop-durations (49.5)
  EV.ric.forEach((t, i) => ricZip(t, i % 2 ? -0.35 : 0.35)) // 50.65 / 50.95
  k.kick(EV.fold, 0.6) // 49.8 — the Bad topples
  at(EV.fold, () => {
    const n = noise(EV.fold, 0.3)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 240
    const a = ac.createGain()
    env(a.gain, EV.fold, 0.004, 0.3, 0.25)
    n.connect(lp).connect(a)
    out(a, 1, 0.25)
  })
  k.whoosh(EV.toupee, 0.5, 0.18) // 49.95 — airborne
  k.flutter(EV.toupee, EV.toupee + 0.9, 0.07) // the comedy
  k.clunk(EV.clipDrop, 0.5) // 51.4 — clippers hit the dirt
  gallop(EV.flee, EV.flee + 2.7, { g: 0.3, fade: 1.0 }) // the gang runs, fading to nothing

  // ================ AFTERMATH 56–68 — REPRISE IN D MAJOR ================
  k.strings(T.aftermath, [50, 57, 62, 66], 2, 0.036, 0.8, 1.0) // D
  k.strings(T.aftermath + BAR, [45, 52, 57, 61], 2, 0.034, 0.6, 1.0) // A
  k.strings(T.aftermath + 2 * BAR, [50, 57, 62, 66], 4, 0.034, 0.8, 1.2) // D, under the stamp
  k.strings(T.aftermath + 4 * BAR, [45, 52, 57, 61], 1.2, 0.024, 0.4, 0.9) // A at 64, gone by 66
  k.pad(T.aftermath, [38, 50, 57], 10, 0.026, 700, 2.0) // warm D pedal, faded out at 66
  const swayBar = (t0, f) => {
    k.kick(t0, 0.32 * f) // beat 1
    k.kick(t0 + 2 * B, 0.26 * f) // beat 3
    k.hat(t0 + B, 0.028 * f, 0.05)
    k.hat(t0 + 3 * B, 0.028 * f, 0.05)
  }
  const SWAY_F = [1, 1, 0.9, 0.7, 0.45] // bars 28–32; the last bar decrescendos into 66
  SWAY_F.forEach((f, i) => swayBar(T.aftermath + i * BAR, f))
  const MAJOR = [[0, 74], [0.5, 78], [1, 76], [1.5, 74], [2, 73], [2.5, 69], [3, 74]] // D5 F♯5 E5 D5 · C♯5 A4 D5
  MAJOR.forEach(([off, m], i) => whistle(T.aftermath + off, m, i === 6 ? 1.9 : 0.42, { g: 0.15 }))
  const WALK_UP = [[0, 69], [0.5, 71], [1, 73], [1.5, 74], [2, 76], [2.5, 78], [3, 76]] // A4 B4 C♯5 D5 · E5 F♯5 E5
  WALK_UP.forEach(([off, m]) => whistle(T.aftermath + 3 * BAR + off, m, 0.4, { g: 0.14 })) // 62–65
  whistle(T.aftermath + 4 * BAR + 3 * B, 74, 2.0, { g: 0.14 }) // 65.5 — final held D5, whistle alone from 66
  k.crowd(EV.cheer - 0.4, EV.cheer + 3, 0.1) // saloon murmur 58.2–61.6
  twang(EV.hairToss, 74, { g: 0.12, dur: 0.7, pan: 0.2 }) // 59.4 — the crimson flow
  k.taiko(EV.stamp, 0.55) // 61.0 — HAIR JUSTICE.
  chant(EV.stamp, [50, 57, 62], 1.4, { g: 0.07, atk: 0.08 }) // D stab
  k.swell(EV.stamp, EV.stamp + 2, 0.06)

  // ================ FIN 68–72 — dusk, one last howl ================
  k.wind(T.fin, DURATION, 0.1)
  howl(EV.howl) // 70.2 — answered by the canyon echo, dying with the fade
  twang(EV.finCard, 74, { g: 0.12, dur: 1.6, pan: 0 }) // 69.4 — final D5, centred
  k.pad(EV.finCard, [38, 50, 57, 62, 66], 2.0, 0.045, 1300, 0.8) // D major swell 69.4 → 71.4
  // the tail rings out to 72.0 exactly — intentional ending.
}
