// GOLDFLOW score — original spy-jazz. Surf twang, sultry wordless croon, brass stabs,
// bongos, strings, celeste. Every cue is clock-driven from the shared timeline so
// hit-stop freezes retime the picture and score together. No copyrighted melodies.
import { T, BARREL_EV, TOWER_CLOCK, TOWER_EV, TITLES, CREDITS, LAIR_CLOCK, LAIR_EV } from './timeline.js'

const A2 = TOWER_CLOCK.abs, AL = LAIR_CLOCK.abs

export function score(kit) {
  const { ac, at, osc, noise, out, hz, R } = kit

  // ---------- custom voices ----------
  const vox = (t, m, dur, { g = 0.13, send = 0.4 } = {}) => at(t, () => {
    const f = hz(m)
    const vg = ac.createGain()
    vg.gain.setValueAtTime(0, t)
    vg.gain.linearRampToValueAtTime(g, t + 0.14)
    vg.gain.setValueAtTime(g, t + Math.max(0.16, dur - 0.4))
    vg.gain.linearRampToValueAtTime(0, t + dur)
    const oscs = []
    // two parallel formants make the 'ah'
    for (const [fc, q, kg] of [[620, 3, 0.5], [1080, 4, 0.34]]) {
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'; bp.frequency.value = fc; bp.Q.value = q
      const bg = ac.createGain(); bg.gain.value = kg
      bp.connect(bg).connect(vg)
      for (const det of [-6, 6]) {
        const o = osc('sawtooth', f, t, dur)
        o.detune.value = det
        o.connect(bp)
        oscs.push(o)
      }
    }
    const sub = osc('sine', f, t, dur)
    const sg = ac.createGain(); sg.gain.value = 0.3
    sub.connect(sg).connect(vg)
    // vibrato blooms in after the attack
    const lfo = osc('sine', 5.2, t, dur)
    const lg = ac.createGain()
    lg.gain.setValueAtTime(0, t)
    lg.gain.linearRampToValueAtTime(7, t + 0.45)
    lfo.connect(lg)
    for (const o of oscs) lg.connect(o.detune)
    out(vg, 1, send, -0.08)
  })
  const twang = (t, m, { g = 0.14, echo = true } = {}) => at(t, () => {
    const tw = (tt, gg) => {
      const o = osc('sawtooth', hz(m) * 1.045, tt, 0.4)
      o.frequency.exponentialRampToValueAtTime(hz(m), tt + 0.07)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'; bp.frequency.value = Math.min(2400, hz(m) * 3.4); bp.Q.value = 1.1
      const a = ac.createGain()
      a.gain.setValueAtTime(gg, tt)
      a.gain.exponentialRampToValueAtTime(0.001, tt + 0.34)
      o.connect(bp).connect(a)
      out(a, 1, 0.22, 0.1)
    }
    tw(t, g)
    if (echo) { tw(t + 0.22, g * 0.42); tw(t + 0.44, g * 0.18) }
  })
  const brass = (t, notes, dur, { g = 0.2, send = 0.25 } = {}) => at(t, () => {
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.035)
    a.gain.setValueAtTime(g, t + Math.max(0.05, dur - 0.2))
    a.gain.linearRampToValueAtTime(0, t + dur)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(1100, t)
    lp.frequency.linearRampToValueAtTime(2600, t + 0.12)
    lp.connect(a)
    for (const m of notes) {
      for (const det of [-5, 5]) {
        const o = osc('sawtooth', hz(m) * 0.985, t, dur)
        o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.08)
        o.detune.value = det
        o.connect(lp)
      }
    }
    out(a, 1, send, 0.06)
  })
  const bongo = (t, { hi = false, g = 0.07 } = {}) => at(t, () => {
    const o = osc('sine', hi ? 330 : 210, t, 0.1)
    o.frequency.exponentialRampToValueAtTime(hi ? 190 : 130, t + 0.09)
    const a = ac.createGain()
    a.gain.setValueAtTime(g, t)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    o.connect(a)
    out(a, 1, 0.15, hi ? 0.25 : -0.2)
    const n = noise(t, 0.02)
    const na = ac.createGain(); na.gain.value = g * 0.5
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000
    n.connect(hp).connect(na)
    out(na, 1, 0.05, hi ? 0.25 : -0.2)
  })
  const nz = (t, dur, { f = 4000, type = 'highpass', g = 0.1, f1 = null } = {}) => at(t, () => {
    const n = noise(t, dur)
    const flt = ac.createBiquadFilter()
    flt.type = type; flt.frequency.setValueAtTime(f, t)
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur)
    const a = ac.createGain()
    a.gain.setValueAtTime(g, t)
    a.gain.exponentialRampToValueAtTime(0.001, t + dur)
    n.connect(flt).connect(a)
    out(a, 1, 0.08)
  })
  const blip = (t, f, { g = 0.07, dur = 0.07, to = null, type = 'square' } = {}) => at(t, () => {
    const o = osc(type, f, t, dur)
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
    const a = ac.createGain()
    a.gain.setValueAtTime(g, t)
    a.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(a)
    out(a, 1, 0.1)
  })
  const pluck = (t, m, { g = 0.07, cut = 2600 } = {}) => at(t, () => {
    const o = osc('triangle', hz(m), t, 0.3)
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut
    const a = ac.createGain()
    a.gain.setValueAtTime(g, t)
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
    o.connect(lp).connect(a)
    out(a, 1, 0.2)
  })

  // ============================== A. gun barrel (0–6) ==============================
  kit.drone(0.0, 4.0, [38, 45], 0.05, 400)
  const riff = [38, 38, 41, 38, 38, 41, 43, 38]
  riff.forEach((m, i) => twang(0.25 + i * 0.42, m, { g: i === 7 ? 0.16 : 0.12 }))
  for (let i = 0; i < 9; i++) kit.hat(0.35 + i * 0.42, 0.05)
  // comb strokes
  for (let i = 0; i < 3; i++) blip(T.barrel + BARREL_EV.comb + 0.12 + i * 0.24, 2400, { g: 0.05, to: 1600 })
  // the shot
  brass(T.barrel + BARREL_EV.shot, [50, 57, 62], 0.7, { g: 0.26 })
  kit.impact(T.barrel + BARREL_EV.shot, 0.8, 50)
  kit.sub(T.barrel + BARREL_EV.shot, 0.5, 90, 30, 1.6)
  kit.whoosh(T.barrel + BARREL_EV.flood, 0.9, 0.28, 300, 1800)
  kit.sweepDown(T.barrel + BARREL_EV.wipe, 0.5, 3200, 220, 0.16)

  // ============================== B. cabald tower (6–22, 120 BPM) ==============================
  const B = 2, E8 = 0.25 // bar, eighth @120
  const roots = [38, 38, 34, 34, 31, 31, 33, 33] // Dm Dm Bb Bb Gm Gm A A
  for (let bar = 0; bar < 8; bar++) {
    const t0 = T.tower + bar * B, r = roots[bar]
    // Ostinate low pulse + pulse-tri bass
    for (let e = 0; e < 8; e++) {
      const tt = t0 + e * E8
      if (e % 2 === 0) pluck(tt, e % 4 === 0 ? r : r + 7, { g: bar < 1.5 ? 0.075 : 0.1, cut: 900 })
      if (bar >= 2 && e % 4 === 2) twang(tt, r + 24, { g: 0.07, echo: false })
    }
    if (bar >= 4) { bongo(t0, { g: 0.09 }); bongo(t0 + E8 * 1.5, { hi: true, g: 0.08 }); bongo(t0 + E8 * 3, { g: 0.09 }); bongo(t0 + E8 * 4.5, { hi: true, g: 0.08 }); bongo(t0 + E8 * 6, { g: 0.09 }) }
  }
  // climb beam zaps
  for (const b of [TOWER_EV.beam1, TOWER_EV.beam2]) blip(T.tower + b - 0.3, 1800, { g: 0.06, to: 2400, dur: 0.25, type: 'sine' })
  // riser into the vault
  kit.riser(A2(8.6), A2(TOWER_EV.grab) - 0.02, 0.16)
  // the grab (lands on the freeze)
  brass(A2(TOWER_EV.grab), [50, 57, 65], 0.5, { g: 0.24 })
  kit.impact(A2(TOWER_EV.grab), 0.6, 55)
  // alarm
  for (let i = 0; i < 7; i++) blip(T.tower + TOWER_EV.alarm + i * 0.42, i % 2 ? 932 : 880, { g: 0.055, dur: 0.3 })
  // the escape
  kit.whoosh(T.tower + TOWER_EV.dive, 0.7, 0.3)
  kit.whoosh(T.tower + TOWER_EV.chute, 0.5, 0.24, 600, 2600)
  kit.wind(T.tower + 13.1, 3.6, 0.14)
  // pompadour grows (comic upward glide), then the plume
  blip(T.tower + TOWER_EV.tuft, 300, { g: 0.06, to: 900, dur: 1.2, type: 'sine' })
  nz(T.tower + TOWER_EV.plume, 0.5, { f: 2500, f1: 500, g: 0.14, type: 'bandpass' })
  // iris into the titles: harp-ish run
  const IRIS_RUN = [62, 65, 69, 72, 74, 77]
  for (let i = 0; i < IRIS_RUN.length; i++) kit.bell(T.tower + TOWER_EV.iris + i * 0.07, hz(IRIS_RUN[i]), 0.05, 0.7)

  // ============================== C. the song (22–48, 100 BPM) ==============================
  const SB = 2.4, SE = 0.3 // bar, eighth @100
  const chords = [
    [50, 57, 62], [50, 57, 62], [50, 57, 62], [45, 52, 57],
    [50, 57, 62], [46, 53, 58], [41, 48, 53], [45, 49, 52],
    [50, 57, 62], [46, 53, 58], [50, 57, 62, 64],
  ]
  chords.forEach((c, bar) => {
    const t0 = T.titles + bar * SB
    kit.pad(t0, c, SB * 0.96, 0.045, 1400, 0.5)
    // bass
    for (let e = 0; e < 8; e += 2) pluck(t0 + e * SE, e % 4 === 0 ? c[0] - 12 : c[0] - 5, { g: 0.075, cut: 700 })
    if (bar >= 2) {
      bongo(t0 + SE, {}); bongo(t0 + SE * 3, { hi: true }); bongo(t0 + SE * 4, {}); bongo(t0 + SE * 6.5, { hi: true })
      if (bar >= 4) { kit.hat(t0, 0.05); kit.hat(t0 + SE * 2, 0.04); kit.hat(t0 + SE * 4, 0.05); kit.hat(t0 + SE * 6, 0.04) }
    }
    // piano commentary
    if (bar < 2) c.forEach((m, i) => kit.piano(t0 + 0.3 + i * 0.28, m + 12, 0.1, 1.6))
  })
  // chorus brass stabs from the slam bar
  const CHORUS_BARS = [4, 5, 6, 7, 8]
  for (const bar of CHORUS_BARS) brass(T.titles + bar * SB, chords[bar].map((m) => m - 12), 0.5, { g: bar === 4 ? 0.26 : 0.15 })
  // the slam itself
  kit.impact(T.titles + TITLES.slam, 0.7, 52)
  kit.crash(T.titles + TITLES.slam, 0.2)
  kit.sub(T.titles + TITLES.slam, 0.5, 80, 30, 1.4)
  // shimmer sweep under the title gleam
  const SHIM = [74, 76, 78, 81, 86]
  for (let i = 0; i < SHIM.length; i++) kit.bell(T.titles + TITLES.slam + 0.8 + i * 0.09, hz(SHIM[i]), 0.045, 0.9)
  // the melody — wordless croon, original tune (bar, eighth, len, midi)
  const MEL = [
    [2, 0, 3, 69], [2, 4, 2, 65], [2, 6, 2, 64],
    [3, 0, 4, 62], [3, 6, 2, 57],
    [4, 0, 3, 74], [4, 4, 2, 72], [4, 6, 2, 69],
    [5, 0, 4, 70], [5, 4, 2, 69], [5, 6, 2, 65],
    [6, 0, 3, 69], [6, 4, 2, 67], [6, 6, 2, 65],
    [7, 0, 6, 64], [7, 6, 2, 62],
    [8, 0, 3, 77], [8, 4, 2, 76], [8, 6, 2, 74],
    [9, 0, 2, 72], [9, 2, 2, 70], [9, 4, 4, 69],
    [10, 0, 8, 74],
  ]
  for (const [bar, e, len, m] of MEL) vox(T.titles + bar * SB + e * SE, m, len * SE + 0.1)
  // soft choir under the last held note
  kit.choir(T.titles + 10 * SB, [62, 65, 69], 2.3, 0.035, 'a')
  // vignette accents under the credits
  kit.whoosh(T.titles + CREDITS[2][0] + 0.3, 0.4, 0.12)
  // parade fanfare + iris
  const FANFARE = [4, 5, 7]
  for (let i = 0; i < FANFARE.length; i++) {
    const m = FANFARE[i]
    brass(T.titles + TITLES.parade + i * 0.5, [50 + m, 57 + m, 62 + m].map((x) => x - 12), 0.4, { g: 0.14 })
  }
  kit.sweepDown(T.titles + TITLES.iris, 0.8, 2600, 300, 0.14)

  // ============================== D. briefing (48–56) ==============================
  const DP = [[62, 66, 69], [62, 69, 73], [59, 62, 66], [62, 66, 69]]
  DP.forEach((c, bar) => {
    const t0 = T.brief + bar * B
    c.forEach((m, i) => pluck(t0 + i * E8 * 2, m, { g: 0.1 }))
    pluck(t0 + E8 * 4, c[0] - 12, { g: 0.13, cut: 600 })
  })
  nz(T.brief + 2.0, 0.25, { f: 3000, g: 0.07, type: 'bandpass' }) // dossier slide
  kit.clunk(T.brief + 3.0, 0.5) // the stamp
  for (let i = 0; i < 6; i++) blip(T.brief + 1.2 + i * 0.36, 1900, { g: 0.05 }) // route ticks
  blip(T.brief + 4.2, 1300, { g: 0.06, to: 1800, dur: 0.12 }) // Q enters
  for (let i = 0; i < 3; i++) blip(T.brief + 4.6 + i * 0.14, 2500 - i * 300, { g: 0.055 }) // combush ratchet
  blip(T.brief + 5.8, 1500, { g: 0.06, dur: 0.1 }) // radio
  kit.tick(T.brief + 5.95, 0.1)

  // ============================== E. bald mountain (56–82, 120 BPM) ==============================
  const LC = [38, 38, 36, 36, 38, 38, 34, 33, 38, 34, 33, 38, 38]
  const lairBars = 13
  for (let bar = 0; bar < lairBars; bar++) {
    const g0 = bar * B, r = LC[bar]
    const t0 = AL(g0)
    if (g0 < 2) kit.drone(t0, B, [r, r + 7], 0.05, 380)
    for (let e = 0; e < 8; e++) {
      const et = g0 + e * E8
      if (et >= LAIR_EV.rush && et < LAIR_EV.splash - 1.2) {
        const tt = t0 + e * E8
        if (e % 2 === 0) pluck(tt, e % 4 === 0 ? r : r + 7, { g: 0.08, cut: 800 })
        if (e === 7 && bar % 2 === 1) twang(tt, r + 24, { g: 0.06, echo: false })
      }
    }
    if (g0 >= LAIR_EV.rush && g0 < LAIR_EV.sweep - B) {
      bongo(t0, {}); bongo(t0 + E8 * 1.5, { hi: true }); bongo(t0 + E8 * 3, {}); bongo(t0 + E8 * 4.5, { hi: true })
      if (bar % 2 === 0) kit.kick(t0, 0.5)
      kit.kick(t0 + E8 * 4, 0.4)
    }
  }
  // villain line swell
  kit.strings(57.4, [50, 57, 62], 3.0, 0.04)
  // the hits (each lands on its freeze)
  brass(AL(LAIR_EV.hit1), [50, 57, 62], 0.4, { g: 0.2 })
  brass(AL(LAIR_EV.hit2), [50, 57, 62], 0.4, { g: 0.2 })
  kit.impact(AL(LAIR_EV.hit1), 0.5, 55)
  // ODDFOB: taiko menace
  for (let i = 0; i < 5; i++) kit.taiko(AL(LAIR_EV.oddfob) + i * 0.42, i === 4 ? 0.8 : 0.4)
  // the hat
  kit.whoosh(AL(LAIR_EV.hatThrow), 0.9, 0.26, 500, 2800)
  kit.bell(AL(LAIR_EV.clang), 1567, 0.3, 0.38)
  kit.bell(AL(LAIR_EV.clang), 2093, 0.16, 0.42)
  nz(AL(LAIR_EV.clang), 0.25, { f: 5000, g: 0.16 })
  // console zap + sparks
  for (let i = 0; i < 3; i++) blip(AL(LAIR_EV.console) + i * 0.1, 2200 - i * 500, { g: 0.05, to: 400, dur: 0.12 })
  // duel sword shings
  kit.bell(AL(LAIR_EV.lunge1), 2637, 0.08, 0.5)
  brass(AL(LAIR_EV.disarm), [50, 57, 62], 0.5, { g: 0.24 })
  kit.impact(AL(LAIR_EV.disarm), 0.55, 50)
  // the taunt: drums out, drone in
  kit.drone(72.6, 2.6, [38, 44], 0.05, 350)
  // the kill
  kit.whoosh(AL(LAIR_EV.sweep), 0.4, 0.3)
  kit.impact(AL(LAIR_EV.splash), 0.9, 48)
  kit.crash(AL(LAIR_EV.splash), 0.26)
  kit.sub(AL(LAIR_EV.splash), 0.7, 90, 26, 2.2)
  nz(AL(LAIR_EV.splash), 1.4, { f: 900, f1: 180, g: 0.3, type: 'lowpass' })
  // drips in the silence, then the gilded rise (D major — the gold payoff)
  kit.bell(AL(LAIR_EV.splash) + 0.9, 1976, 0.05, 1.1)
  kit.bell(AL(LAIR_EV.splash) + 1.5, 1567, 0.04, 1.3)
  const RISE = [62, 66, 69, 74, 78]
  RISE.forEach((m, i) => kit.bell(AL(LAIR_EV.rise) + i * 0.16, hz(m), 0.07, 1.6))
  kit.choir(AL(LAIR_EV.rise) + 0.4, [62, 66, 69], 2.8, 0.04, 'a')
  kit.swell(AL(LAIR_EV.rise), AL(LAIR_EV.statue), 0.1)
  // the pickup + exit
  pluck(AL(LAIR_EV.vial) + 0.2, 74, { g: 0.07 })
  pluck(AL(LAIR_EV.vial) + 0.5, 69, { g: 0.06 })
  kit.sweepDown(AL(LAIR_EV.iris), 0.9, 2200, 260, 0.13)

  // ============================== F. tag (82–90) ==============================
  kit.pad(82.0, [50, 57, 62, 65], 4.4, 0.05, 1500, 0.8)
  kit.pad(86.4, [46, 53, 58, 62], 3.4, 0.05, 1500, 0.8)
  vox(82.8, 69, 2.6, { g: 0.1 })
  vox(85.6, 65, 2.2, { g: 0.1 })
  // M on the wire
  for (let i = 0; i < 3; i++) blip(83.4 + i * 0.7, 1200 + i * 60, { g: 0.03, dur: 0.08 })
  // end card + slate
  const ENDGLISS = [62, 66, 69, 74, 78, 81]
  for (let i = 0; i < ENDGLISS.length; i++) kit.bell(85.8 + i * 0.08, hz(ENDGLISS[i]), 0.05, 1.1)
  kit.bell(88.8, hz(86), 0.09, 1.6)
  kit.tick(89.4, 0.06)
}
