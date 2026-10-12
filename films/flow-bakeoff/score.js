// THE GREAT FLOW BAKE-OFF — original 6/8 "flow waltz" score (84 s, film time)
// 90 BPM dotted-quarter · compound bar = 2.0 s (eighth = 1/3 s) · G major, +2 lift to A.
// Every cue is scheduled in FILM seconds straight from timeline.js (EV/T/BAR/DUR); the
// music runs straight through the picture freezes — impact onsets land exactly ON
// EV.chop / EV.ovenSlam / EV.handshake. Form:
//   A   0–8    exterior: pluck flow-motif over G/Em/C/D, soft pad, seeded bird bells,
//              light hat tick on dotted-2, tiny swell lifting into the title
//   A2  8–14   titles: motif doubled bell + strings, crash + cymbal swell ON titleSlam,
//              buoyant, clean D→G cadence landing at 14
//   B   14–22  brief: theme softens to strings; judge insert (19.3) darkens to a Bm
//              pad drone + sustained cello-ish B1, resolved out by the montage downbeat
//   C   22–36  montage groove: kick on beat 1, clap on beat 3, swung eighth hats, pluck
//              16th arpeggios; woodblocks ON punch1/punch2; chop impact ON the freeze +
//              three chop woodblocks; rolling swish; piping bell run up; whisk whirr +
//              comedic triangle ding
//   D   36–46  oven: Em unease, tick pulse, riser → collapse = SAD HORN (muted brass
//              G3→Eb3, original) + wet splat; fire whoosh + seeded crackle + comic
//              alarm blips; hero slide whistle; oven SLAM = big impact + sub drop and
//              everything ducks; timelapse tick accelerando + harp run DOWN; key lift
//              G→A landing exactly at 46
//   E   46–60  judging: sparse pizzicato + panned tick-tock; dry bite crunches; DRY. /
//              BURNT. muted-horn stingers (BURNT a semitone lower, sadder); smoke puff;
//              drumroll crescendo; cloche harp gliss + sparkle; accelerating heartbeats;
//              HARD SILENCE 59.5–60.0 — nothing starts there, all tails spent by 59.5
//   F   60–70  handshake: DUN braam (low strings + sub) ON EV.dun, heartbeats, held-
//              breath choir, handshake impact + warm strings bloom + choir swell +
//              seeded confetti chimes ON the freeze; host gasp; cheer swell; fanfare
//              pickup rising to the dominant
//   G   70–84  finale: fanfare stabs in A major ON the banner, crowd applause, trophy
//              gleam, smoke-gag puff, the judge's four dry slow claps slightly out of
//              time, one last full motif statement, plagal D→A cadence, and under the
//              slate fade the oven-timer triple DING — dry and done by 84
// The flow motif (G4–B4–D5–B4–A4–G4; +2 = A4–C#5–E5–C#5–B4–A4) and every voice here are
// original — nothing quotes a real show. Custom voices (woodblock, muted horn, splat,
// slide whistle, chirp, tick-tock, roll, swish, crunch, puff, gasp, dry clap, cozy ding,
// harp gliss) build on kit.at + kit.osc/noise and always mix through kit.out. Beds sit
// well under stings, drums are moderate, impacts own the lows.

import { EV, T, BAR, DUR } from './timeline.js'

const BQ = BAR / 3 // dotted-quarter beat = 2/3 s
const E8 = BAR / 6 // eighth = 1/3 s
const E16 = BAR / 12 // sixteenth = 1/6 s

export default function score(kit) {
  const { ac, at, osc, noise, out, env, hz, R } = kit

  // ── harmony tables — flow waltz in G (A–C), the +2 lift to A (D→G) ────────
  const GG = {
    G: { root: 43, pad: [43, 55, 59, 62], arp: [55, 59, 62, 67] },
    Em: { root: 40, pad: [40, 52, 55, 59], arp: [52, 55, 59, 64] },
    C: { root: 36, pad: [48, 55, 60, 64], arp: [55, 60, 64, 67] },
    D: { root: 38, pad: [38, 50, 54, 57], arp: [50, 54, 57, 62] },
  }
  const AA = {
    A: { root: 45, pad: [45, 57, 61, 64] },
    Fsm: { root: 42, pad: [42, 54, 57, 61] },
    D: { root: 38, pad: [38, 50, 54, 57] },
  }

  // ── custom voices ─────────────────────────────────────────────────────────
  // wood block: sine knock + bandpassed click, mostly dry
  const woodblock = (t, g = 0.3, f = 1100) => at(t, () => {
    const o = osc('sine', f, t, 0.09)
    o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.07)
    const a = ac.createGain()
    env(a.gain, t, 0.001, g, 0.07)
    o.connect(a)
    out(a, 1, 0.12, (R() - 0.5) * 0.4)
    const n = noise(t, 0.03)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f * 1.8
    bp.Q.value = 2
    const ng = ac.createGain()
    env(ng.gain, t, 0.001, g * 0.55, 0.018)
    n.connect(bp).connect(ng)
    out(ng, 1, 0.08)
  })

  // muted brass (the SAD HORN / DRY.-BURNT. stinger): detuned saws through a
  // plunger-ish bandpass with a gentle pitch sag. Original — two descending notes
  // at the collapse, one low note at the stamps.
  const mutedHorn = (t, m, dur, g = 0.14, cut = 780) => at(t, () => {
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(cut, t)
    bp.frequency.exponentialRampToValueAtTime(cut * 0.72, t + dur)
    bp.Q.value = 1.5
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + 0.045)
    a.gain.setValueAtTime(g * 0.8, t + dur * 0.7)
    a.gain.linearRampToValueAtTime(0, t + dur + 0.15)
    for (const det of [-6, 5]) {
      const o = osc('sawtooth', hz(m) * 1.012, t, dur + 0.2)
      o.detune.value = det
      o.frequency.exponentialRampToValueAtTime(hz(m) * 0.986, t + dur) // mute sag
      o.connect(bp)
    }
    bp.connect(a)
    out(a, 1, 0.3, 0.15)
  })

  // wet splat: lowpassed noise blob + glop body
  const splat = (t, g = 0.4) => at(t, () => {
    const n = noise(t, 0.4)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(1400, t)
    lp.frequency.exponentialRampToValueAtTime(180, t + 0.3)
    const a = ac.createGain()
    env(a.gain, t, 0.006, g, 0.28)
    n.connect(lp).connect(a)
    out(a, 1, 0.15)
    const o = osc('sine', 160, t, 0.25)
    o.frequency.exponentialRampToValueAtTime(55, t + 0.18)
    const og = ac.createGain()
    env(og.gain, t, 0.004, g * 0.5, 0.2)
    o.connect(og)
    out(og, 1, 0.1)
  })

  // soft slide whistle gliding up (the hero's loaf slide)
  const slideUp = (t, dur, f0, f1, g = 0.06) => at(t, () => {
    const o = osc('sine', f0, t, dur + 0.1)
    o.frequency.exponentialRampToValueAtTime(f1, t + dur)
    const vib = osc('sine', 6.5, t, dur + 0.1)
    const vg = ac.createGain()
    vg.gain.value = 12
    vib.connect(vg).connect(o.detune)
    const a = ac.createGain()
    env(a.gain, t, 0.03, g, dur * 0.8, 0.0001, 0.06)
    o.connect(a)
    out(a, 1, 0.25, -0.2)
  })

  // morning bird: high short bell chirp, sometimes doubled (seeded via R at schedule time)
  const chirp = (t, g = 0.032) => {
    const f = 2600 + R() * 1600
    kit.bell(t, f, g, 0.12, 4.6, 2)
    if (R() < 0.6) kit.bell(t + 0.09 + R() * 0.05, f * (0.92 + R() * 0.18), g * 0.8, 0.1, 4.6, 2)
  }

  // panned clock tick / tock (kit.tick has no pan, so this one is ours)
  const tickTock = (t, pan, g = 0.048, f = 3000) => at(t, () => {
    const n = noise(t, 0.03)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f
    bp.Q.value = 4
    const a = ac.createGain()
    env(a.gain, t, 0.001, g, 0.02)
    n.connect(bp).connect(a)
    out(a, 1, 0.08, pan)
  })

  // snare-ish drumroll hit
  const roll = (t, g = 0.05) => at(t, () => {
    const n = noise(t, 0.06)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1900
    bp.Q.value = 1.1
    const a = ac.createGain()
    env(a.gain, t, 0.001, g, 0.045)
    n.connect(bp).connect(a)
    out(a, 1, 0.2, (R() - 0.5) * 0.5)
  })

  // shaker-ish swish: short bandpassed noise swell
  const swish = (t, dur, g = 0.05, f = 3400) => at(t, () => {
    const n = noise(t, dur + 0.05)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(f, t)
    bp.frequency.exponentialRampToValueAtTime(f * 0.55, t + dur)
    bp.Q.value = 1.4
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    a.gain.linearRampToValueAtTime(g, t + dur * 0.3)
    a.gain.linearRampToValueAtTime(0, t + dur)
    n.connect(bp).connect(a)
    out(a, 1, 0.25)
  })

  // dry bite crunch: short noise burst, no reverb send
  const crunch = (t, g = 0.16) => at(t, () => {
    const n = noise(t, 0.09)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(2600, t)
    bp.frequency.exponentialRampToValueAtTime(900, t + 0.07)
    bp.Q.value = 0.8
    const a = ac.createGain()
    env(a.gain, t, 0.002, g, 0.06)
    n.connect(bp).connect(a)
    out(a, 1, 0, 0.15)
  })

  // tiny smoke puff
  const puff = (t, g = 0.075) => at(t, () => {
    const n = noise(t, 0.25)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(900, t)
    lp.frequency.exponentialRampToValueAtTime(250, t + 0.2)
    const a = ac.createGain()
    env(a.gain, t, 0.02, g, 0.18)
    n.connect(lp).connect(a)
    out(a, 1, 0.2)
  })

  // comic host gasp: inhale sweep + blip
  const gasp = (t, g = 0.09) => at(t, () => {
    const n = noise(t, 0.24)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(420, t)
    bp.frequency.exponentialRampToValueAtTime(1900, t + 0.16)
    bp.Q.value = 1.1
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.exponentialRampToValueAtTime(g, t + 0.13)
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
    n.connect(bp).connect(a)
    out(a, 1, 0.25, 0.3)
  })

  // the judge's comedy clap: triple-burst noise, bone dry
  const dryClap = (t, g = 0.34) => at(t, () => {
    const n = noise(t, 0.2)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1500
    bp.Q.value = 0.9
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t)
    for (let i = 0; i < 3; i++) {
      a.gain.linearRampToValueAtTime(g, t + i * 0.012 + 0.001)
      a.gain.exponentialRampToValueAtTime(g * 0.18, t + i * 0.012 + 0.011)
    }
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    n.connect(bp).connect(a)
    out(a, 1, 0)
  })

  // cozy oven-timer ding: FM bell + slightly detuned twin
  const cozyDing = (t, f, g = 0.1) => {
    kit.bell(t, f, g, 0.3, 3.4, 2)
    kit.bell(t, f * 1.0035, g * 0.6, 0.3, 3.4, 2)
  }

  // harp-style bell gliss
  const gliss = (t, notes, { g = 0.06, dt = 0.16, dur = 0.6 } = {}) =>
    notes.forEach((m, i) => kit.bell(t + i * dt, hz(m), g, dur, 2.2, 1.2))

  // ================ A · EXTERIOR (0–8) — warm morning ================
  const MOTIF_G = [67, 71, 74, 71, 69, 67] // G4 B4 D5 B4 A4 G4 — the flow motif
  const MOFF = [0, BQ, BAR, BAR + BQ, 2 * BAR, 2 * BAR + BQ] // one bar per chord
  for (const [ch, t0] of [['G', 0], ['Em', BAR], ['C', 2 * BAR], ['D', 3 * BAR]]) {
    const c = GG[ch]
    kit.pad(t0, c.pad, 1.92, 0.034, 1100, 0.5)
    kit.bass(t0, c.root, 1.7, 0.16, 'triangle', 480)
    kit.hat(t0 + BQ, 0.05, 0.05) // light tick on dotted-2
  }
  MOTIF_G.forEach((m, i) => kit.pluck(T.ext + MOFF[i], m, 0.075, 3000, 0.5))
  kit.pluck(T.ext + 3 * BAR, 74, 0.07, 2600, 1.6) // held D5 — the lift into the title
  for (let i = 0; i < 6; i++) chirp(0.8 + i * 1.15 + R() * 0.5, 0.032) // seeded birds
  kit.swell(7.3, 8.0, 0.07) // tiny lift into the title
  kit.pluck(7.33, 71, 0.06, 2800, 0.3)
  kit.pluck(7.67, 74, 0.065, 3000, 0.3)

  // ================ A2 · TITLES (8–14) — the flow waltz, buoyant ================
  kit.swell(7.9, EV.titleSlam, 0.12) // cymbal swell peaking ON the slam
  kit.crash(EV.titleSlam, 0.2)
  kit.impact(EV.titleSlam, 0.3, 56)
  kit.bell(EV.titleSlam + 0.02, hz(79), 0.07, 1.2, 3, 2)
  const A2_MEL = [[8.0, 67], [8 + BQ, 71], [10.0, 74], [10 + BQ, 76], [12.0, 74], [13.33, 69]]
  for (const [t, m] of A2_MEL) {
    const d = t === 12.0 ? 1.25 : 0.55
    kit.strings(t, [m], d, 0.05, 0.09, 0.35, 2400) // the motif doubled…
    kit.bell(t, hz(m), 0.055, 0.9, 3, 2) // …bell + strings
  }
  for (const [ch, t0] of [['G', 8], ['C', 10], ['D', 12]]) {
    const c = GG[ch]
    kit.pad(t0, c.pad, 1.92, 0.038, 1300, 0.35)
    kit.bass(t0, c.root, 1.7, 0.18, 'triangle', 520)
    kit.hat(t0, 0.04, 0.04)
    kit.hat(t0 + BQ, 0.055, 0.05)
  }

  // ================ B · BRIEF (14–22) — the theme softens ================
  kit.strings(14.0, [67], 1.85, 0.048, 0.25, 0.5, 2000) // G4 lands on the cadence
  kit.strings(16.0, [71], 0.6, 0.048, 0.12, 0.3, 2100)
  kit.strings(16 + BQ, [74], 1.15, 0.048, 0.12, 0.4, 2100)
  kit.strings(18.5, [69], 0.65, 0.042, 0.12, 0.35, 2000) // thins before the judge
  kit.pad(14.0, GG.G.pad, 1.92, 0.03, 1000, 0.6)
  kit.pad(16.0, GG.Em.pad, 1.92, 0.03, 1000, 0.6)
  kit.pad(18.0, GG.Em.pad, 1.25, 0.026, 900, 0.6)
  woodblock(EV.challenge, 0.22, 950) // the SHOWSTOPPER stamp
  // judge insert (19.3): darken — Bm pad drone + sustained cello-ish B1 under his line
  kit.drone(EV.judgeECU1, EV.judgeECU1End, [35, 47], 0.042, 380)
  kit.strings(EV.judgeECU1, [35], 2.45, 0.05, 0.7, 0.9, 460)
  kit.pad(EV.judgeECU1, [47, 50, 54], 2.4, 0.024, 700, 0.9)
  kit.pluck(21.7, 55, 0.06, 1300, 0.5) // G pickup resolving into the montage

  // ================ C · MONTAGE (22–36) — the baking groove ================
  const C_CH = ['G', 'Em', 'C', 'D', 'G', 'Em', 'C'] // chop lands on the D bar
  const ARP = [0, 1, 2, 1, 3, 1, 2, 3, 0, 1, 2, 1]
  C_CH.forEach((ch, bar) => {
    const t = T.montage + bar * BAR
    const c = GG[ch]
    kit.kick(t, 0.5) // beat 1
    kit.clap(t + 2 * E8, 0.3) // beat 3
    for (let e = 0; e < 6; e++) kit.hat(t + e * E8 + (e % 2 ? 0.05 : 0), e % 2 ? 0.045 : 0.065, 0.04)
    kit.bass(t, c.root, 0.55, 0.26, 'sawtooth', 620)
    kit.bass(t + 2 * E8, c.root + 7, 0.22, 0.2, 'sawtooth', 560)
    kit.bass(t + 4 * E8, c.root + 12, 0.3, 0.2, 'sawtooth', 600)
    for (let i = 0; i < 12; i++) kit.pluck(t + i * E16, c.arp[ARP[i]], 0.04, 3400, 0.16)
    kit.pad(t, c.pad, 1.9, 0.024, 1200, 0.3)
  })
  woodblock(EV.punch1, 0.34, 1150) // PROVE. PUNCH. PROVE.
  woodblock(EV.punch2, 0.34, 1050)
  // THE CHOP — sharp impact ON the freeze, three chops right after it lifts
  kit.impact(EV.chop, 0.85, 52)
  kit.tick(EV.chop + 0.01, 0.09, 4200)
  woodblock(28.2, 0.3, 1100)
  woodblock(28.35, 0.26, 1000)
  woodblock(28.5, 0.22, 920)
  // rolling (29.4–31.4): shaker swish per dotted-quarter, brightening
  ;[[29.4, 0.05, 3400], [29.4 + BQ, 0.058, 3700], [29.4 + 2 * BQ, 0.066, 4000], [31.08, 0.075, 4300]]
    .forEach(([t, g, f]) => swish(t, 0.3, g, f))
  // piping (31.6–34.2): delicate bell run up, quiet
  const PIPE = [79, 83, 86, 91, 95, 98] // G5 B5 D6 G6 B6 D7
  PIPE.forEach((m, i) => kit.bell(EV.pipeStart + 0.05 + i * 0.43, hz(m), 0.042, 0.5, 3.2, 1.4))
  // whisk (34.2–35.8): accelerating whirr rising in pitch
  at(EV.whiskStart, () => {
    const n = noise(EV.whiskStart, EV.whiskEnd - EV.whiskStart)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.6
    bp.frequency.setValueAtTime(280, EV.whiskStart)
    bp.frequency.exponentialRampToValueAtTime(2400, EV.whiskEnd)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, EV.whiskStart)
    a.gain.exponentialRampToValueAtTime(0.07, EV.whiskEnd - 0.2)
    a.gain.linearRampToValueAtTime(0, EV.whiskEnd)
    n.connect(bp).connect(a)
    out(a, 1, 0.2)
  })
  kit.flutter(EV.whiskStart, EV.whiskEnd, 0.05)
  ;[[34.2, 900], [34.5, 1150], [34.72, 1400], [34.87, 1650], [34.96, 1900]].forEach(([t, f]) =>
    swish(t, 0.1, 0.05, f))
  kit.bell(EV.whiskEnd, 2350, 0.1, 1.1, 4.8, 1.6) // comedic triangle ding

  // ================ D · OVEN (36–46) — unease, fire, SLAM, timelapse ================
  for (let t = 36.0, i = 0; t < 42.9; t += BQ, i++) // uneasy tick pulse, ducks at the slam
    kit.tick(t, 0.05, i % 2 ? 2100 : 2800)
  kit.riser(EV.ovenOpenMoss, EV.collapse, 0.16) // 37.2 → 38.4
  // the collapse: SAD HORN (G3 → Eb3, our muted brass) + wet splat
  mutedHorn(EV.collapse, 55, 0.36, 0.13)
  mutedHorn(EV.collapse + 0.34, 51, 0.62, 0.14, 700)
  splat(EV.collapse + 0.03, 0.4)
  kit.impact(EV.collapse, 0.22, 44)
  // fire (40.2): whoosh + seeded crackle pops + comic alternating alarm
  kit.whoosh(EV.fireStart, 0.7, 0.18, 200, 2400)
  for (let ct = EV.fireStart + 0.1; ct < 42.3; ) {
    const t0 = ct
    const g = 0.022 + R() * 0.034
    const f = 1200 + R() * 2400
    const pan = (R() - 0.5) * 0.8
    at(t0, () => {
      const n = noise(t0, 0.04)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = f
      bp.Q.value = 2.2
      const a = ac.createGain()
      env(a.gain, t0, 0.001, g, 0.03)
      n.connect(bp).connect(a)
      out(a, 1, 0.12, pan)
    })
    ct += 0.09 + R() * 0.24
  }
  for (let i = 0; i < 6; i++) kit.blip(40.4 + i * 0.3, i % 2 ? 622 : 880, 0.045, 0.1)
  slideUp(EV.heroSlide, 0.55, 500, 1350, 0.05) // the loaf slides in
  // THE OVEN SLAM — big impact + sub drop; everything else ducks (no cues 42.9–44.0)
  kit.impact(EV.ovenSlam, 1.0, 44)
  kit.sub(EV.ovenSlam, 0.7, 95, 26, 1.9)
  kit.clunk(EV.ovenSlam, 0.5)
  kit.crash(EV.ovenSlam, 0.12)
  // timelapse (44–46): tick accelerando + harp-ish run DOWN + key lift G→A
  kit.bass(44.0, 43, 0.9, 0.2, 'triangle', 460) // G…
  kit.bass(45.0, 45, 0.95, 0.2, 'triangle', 480) // …A lands at 46
  for (let t = 44.0, iv = 0.42; t < 45.95 && iv > 0.05; t += iv, iv *= 0.82)
    kit.tick(t, 0.045 + (t - 44.0) * 0.02, 3000)
  const DOWN = [86, 84, 83, 81, 79, 78, 76, 74] // D6 → D5, G major
  DOWN.forEach((m, i) => kit.bell(44.0 + i * 0.22, hz(m), 0.055, 0.55, 2.4, 1.3))
  kit.swell(45.3, 46.0, 0.09)
  kit.pad(46.0, AA.A.pad, 1.9, 0.032, 1000, 0.4) // A major, exactly at 46

  // ================ E · JUDGING (46–60) — sparse, dry, HARD SILENCE ================
  const E_BARS = [[46, 45, 52], [48, 43, 50], [50, 50, 57], [52, 47, 54], [54, 45, 52], [56, 52, 59]]
  for (const [t, n1, n2] of E_BARS) {
    kit.pluck(t, n1, 0.08, 850, 0.3, 'triangle') // pizzicato
    kit.pluck(t + 1.0, n2, 0.065, 800, 0.28, 'triangle')
    tickTock(t, -0.35, 0.048, 3000) // tick left…
    tickTock(t + 1.0, 0.35, 0.048, 2100) // …tock right
  }
  crunch(EV.bite1, 0.17) // dry
  crunch(EV.bite2, 0.16)
  // stingers — DRY. / BURNT. (a semitone lower, sadder): one muted low horn + thud
  mutedHorn(EV.dry, 43, 0.55, 0.16, 640) // G2
  kit.impact(EV.dry, 0.28, 46)
  kit.sub(EV.dry, 0.16, 88, 40, 0.4)
  mutedHorn(EV.burnt, 42, 0.7, 0.15, 600) // F#2
  kit.impact(EV.burnt, 0.26, 44)
  kit.sub(EV.burnt, 0.16, 84, 38, 0.45)
  puff(EV.smokePuff, 0.075)
  // drumroll (55.5–57.0): noise rolls crescendo (iv floor guards the shrink)
  for (let t = EV.drumroll, iv = 0.11; t < 56.9 && iv > 0.025; t += iv, iv *= 0.92)
    roll(t, 0.02 + 0.1 * ((t - EV.drumroll) / 1.4))
  kit.swell(EV.drumroll, EV.clocheLift, 0.08)
  // cloche lift: harp gliss up (6 notes over 0.8 s) + sparkle bells
  gliss(EV.clocheLift, [69, 73, 76, 81, 85, 88], { g: 0.06, dt: 0.16, dur: 0.6 })
  kit.glass(EV.clocheLift + 0.15, 0.1, 0.45)
  kit.bell(EV.clocheLift + 0.2, hz(93), 0.05, 0.8, 3.4, 2)
  kit.bell(EV.clocheLift + 0.45, hz(97), 0.045, 0.8, 3.4, 2)
  // the held breath before the verdict: heartbeats accelerate — tails spent by 59.5
  kit.heartbeat(58.2, 0.22)
  kit.heartbeat(58.55, 0.27)
  kit.heartbeat(58.82, 0.32)
  // HARD SILENCE 59.5–60.0 — nothing starts here; every tail above ends before 59.5.

  // ================ F · THE HANDSHAKE (60–70) ================
  kit.braam(EV.dun, [33, 45], 2.0, 0.3) // DUN — low strings + sub
  kit.strings(EV.dun, [33, 45, 52], 1.8, 0.06, 0.02, 0.9, 650)
  kit.sub(EV.dun, 0.4, 78, 30, 1.3)
  kit.taiko(EV.dun, 0.55, 50)
  kit.heartbeat(60.6, 0.3)
  kit.heartbeat(61.2, 0.3)
  kit.choir(61.9, [57, 61, 64], 0.85, 0.022, 'o', 0.45, 0.2) // held breath, very quiet
  kit.swell(EV.grasp, EV.handshake, 0.07) // breath into the freeze
  // THE HANDSHAKE — impact + warm strings bloom + choir swell + confetti chimes
  kit.impact(EV.handshake, 0.8, 50)
  kit.strings(EV.handshake, [45, 52, 57, 61, 64], 2.6, 0.05, 0.25, 1.3, 2200)
  kit.choir(EV.handshake, [57, 61, 64, 69], 2.5, 0.05, 'a', 0.7, 1.0) // major, A
  kit.sub(EV.handshake, 0.3, 80, 40, 1.2)
  kit.bell(EV.handshake + 0.01, hz(81), 0.09, 1.4, 3, 2)
  for (let i = 0; i < 7; i++) { // seeded confetti chimes, 63.1–64.5
    const t0 = 63.1 + R() * 1.35
    const m = [81, 85, 88, 93, 97][Math.floor(R() * 5)]
    kit.bell(t0, hz(m), 0.048, 0.6, 3.2, 1.8)
  }
  gasp(EV.hostGasp, 0.09)
  kit.crowd(EV.cheer, EV.cheer + 1.5, 0.15)
  // fanfare pickup (66.5–70): rising statement, ends on the dominant lift
  kit.crash(66.5, 0.2)
  const RISE = [[66.5, 69], [66.5 + BQ, 71], [67.83, 73], [68.5, 76], [69.17, 78], [69.67, 80]]
  for (const [t, m] of RISE) {
    kit.strings(t, [m], t < 69 ? 0.55 : 0.6, 0.055, 0.06, 0.3, 2600)
    kit.pluck(t, m + 12, 0.05, 3600, 0.3)
  }
  kit.bass(66.5, 45, 1.9, 0.2, 'triangle', 500)
  kit.bass(68.5, 40, 1.45, 0.22, 'sawtooth', 560) // E pedal — the dominant
  ;[[66.5, 0.3], [67.17, 0.34], [67.83, 0.38], [68.5, 0.45], [69.0, 0.5], [69.5, 0.55]]
    .forEach(([t, g]) => kit.taiko(t, g, 55))
  kit.swell(69.0, 70.0, 0.1)

  // ================ G · FINALE (70–84) — fanfare in A major ================
  kit.crash(EV.banner, 0.3) // banner crash
  kit.impact(EV.banner, 0.55, 48)
  kit.taiko(EV.banner, 0.65)
  kit.crowd(EV.banner, 74.0, 0.13) // applause
  const STABS = [
    [70.2, [45, 52, 61, 64, 69], 33], // A
    [71.2, [38, 50, 54, 57, 62], 38], // D
    [72.2, [45, 52, 61, 64, 69], 45], // A
    [73.0, [40, 47, 56, 59, 64], 40], // E — dominant colour before the claps
  ]
  for (const [t, ch, root] of STABS) {
    kit.strings(t, ch, 0.95, 0.06, 0.02, 0.45, 2400)
    kit.taiko(t, 0.45, 52)
    kit.bass(t, root, 0.85, 0.26, 'sawtooth', 640)
  }
  ;[85, 88, 93].forEach((m, i) => kit.bell(EV.trophyLift + i * 0.12, hz(m), 0.08, 0.9, 3, 2)) // gleam
  kit.glass(EV.trophyLift, 0.1, 0.35)
  puff(EV.smokeGag, 0.07) // gold is still smouldering
  // comedy: the judge's four slow dry claps, slightly out of time
  ;[74.4, 75.13, 75.79, 76.54].forEach((t) => dryClap(t, 0.34))
  kit.pad(74.0, AA.A.pad, 1.9, 0.02, 900, 0.6) // whisper bed under the claps
  // one last full statement of the flow motif (+2), 76–82
  kit.crash(76, 0.14)
  for (const [t0, ch] of [[76, 'A'], [78, 'Fsm'], [80, 'D']]) {
    const c = AA[ch]
    kit.pad(t0, c.pad, 1.92, 0.036, 1300, 0.25)
    kit.bass(t0, c.root, 1.7, 0.24, 'sawtooth', 620)
  }
  const MOTIF_A = [69, 73, 76, 73, 71, 69] // A4 C#5 E5 C#5 B4 A4
  MOTIF_A.forEach((m, i) => {
    kit.strings(76 + MOFF[i], [m], i === 5 ? 1.15 : 0.55, 0.058, 0.07, 0.3, 2600)
    kit.bell(76 + MOFF[i], hz(m), 0.055, 0.9, 3, 2)
  })
  ;[76, 77, 78, 79, 80, 81.5].forEach((t, i) => kit.taiko(t, 0.24 + i * 0.03, 55))
  // plagal-ish cadence: IV (D) at 81.5 → I (A) at 82.5
  kit.strings(81.5, [38, 50, 54, 57], 0.95, 0.05, 0.08, 0.4, 1800)
  kit.strings(82.5, [45, 52, 57, 61, 64], 0.7, 0.055, 0.03, 0.55, 2100)
  kit.pad(82.5, [45, 57, 61], 1.2, 0.04, 1200, 0.12)
  kit.bass(82.5, 33, 1.2, 0.26, 'sawtooth', 560)
  kit.sub(82.5, 0.25, 70, 38, 0.9)
  kit.bell(82.5, hz(81), 0.08, 1.1, 3, 2)
  kit.choir(82.5, [57, 61, 64], 0.9, 0.03, 'a', 0.25, 0.5)
  // EV.finalDing — the oven timer, three slightly detuned cozy dings, dry by 84
  ;[[83.0, 0.1], [83.35, 0.09], [83.7, 0.08]].forEach(([t, g]) => cozyDing(t, 1760, g))
  void DUR // timing truth imported whole; every cue above is clamped to [0, DUR+0.5]
}
