// B.T. THE EXTRA-BALDESTRAL — score. The original "TUFT" motif (A C A Eb F) is the
// through-line: hushed sparse statement in the shed, toy pizzicato in the bond montage,
// full Williams-style flight statement in the high octave, solo piano at the sprout,
// and descending echoes as the hair-comet leaves. 92 s, D-centered, cold → warm.
// Every picture hit is scheduled from timeline.js (T windows, *_EV micro-cues, clock
// .abs() across hit-stop freezes, FLASHES for flashes without clocks). No copyrighted melodies.
import {
  T, MOTIF, FLASHES,
  SHED_EV, SHED_CLOCK,
  BOND_EV, BOND_CLOCK,
  TITLE_EV,
  STREET_EV,
  PURSUIT_EV, PURSUIT_CLOCK,
  FLIGHT_EV,
  SHIP_EV, SHIP_CLOCK,
} from './timeline.js'

export function score(kit) {
  const { ac, at, osc, out, hz, R } = kit
  const J = () => (R() - 0.5) * 0.012 // deterministic humanize (seeded RNG only)

  // ---------- clock-derived hits (the only truth for picture hits) ----------
  const UFO = FLASHES[0][0]                             // 6.5  UFO thud behind the treeline
  const SCONE = SHED_CLOCK.abs(SHED_EV.coneLock)        // 12.4 cone locks dead on the shape
  const SP = SHED_CLOCK.abs(SHED_EV.reveal)             // 13.6 the eyes catch the beam — freeze
  const SDROP = SHED_CLOCK.abs(SHED_EV.drop)            // 15.32 flashlight hits the floor
  const WIG = BOND_CLOCK.abs(BOND_EV.wigCU)             // 18.4 THE HAIR HAT
  const WIGBOB = BOND_CLOCK.abs(BOND_EV.wigBob)         // 19.6 one slow dignified bob
  const TOSS = BOND_CLOCK.abs(BOND_EV.toss)             // 21.2 candy toss
  const CATCH = BOND_CLOCK.abs(BOND_EV.catch)           // 21.9 candy catch
  const BURP = BOND_CLOCK.abs(BOND_EV.burp)             // 22.8 glitter burp
  const HEAL = BOND_CLOCK.abs(BOND_EV.touch)            // 24.6 glowing-finger heal
  const POP = BOND_CLOCK.abs(BOND_EV.pop)               // 25.4 band-aid pops
  const HOP = BOND_CLOCK.abs(BOND_EV.hideHop)           // 27.2 scamper to hide
  const CRACK = BOND_CLOCK.abs(BOND_EV.doorCrack)       // 27.6 the door cracks…
  const FRZ = BOND_CLOCK.abs(BOND_EV.freeze)            // 28.0 comic freeze (mum near-miss)
  const DOOR = BOND_CLOCK.abs(BOND_EV.doorClose)        // 30.4 door closes
  const FISH = BOND_CLOCK.abs(BOND_EV.pointFish)        // 30.8 goldfish punchline
  const SLAM = T.title + TITLE_EV.slam                  // 34.0 title slam
  const FLICK = T.title + TITLE_EV.flicker              // 36.4 title flicker
  const VAN = T.street + STREET_EV.vanCut               // 44.6 hard cut: the Cabald van
  const SNAP = FLASHES[3][0]                            // 44.8 roof light snaps on
  const VDOOR = T.street + STREET_EV.doorSlide          // 46.2 agents step out
  const CUTS = PURSUIT_EV.cuts.map((c) => PURSUIT_CLOCK.abs(c)) // 50.4 51.5 52.6 53.7
  const SK = PURSUIT_CLOCK.abs(PURSUIT_EV.skid)         // 58.8 brakes. RAVINE. — freeze
  const WHEEL = PURSUIT_CLOCK.abs(PURSUIT_EV.wheelSpin) // 59.52 wheels keep spinning
  const LAUNCH = T.flight                               // 60.0 launch (flash-verified)
  const RISE = T.flight + FLIGHT_EV.rise                // 60.9 nose up
  const MOONCUT = T.flight + FLIGHT_EV.moonShot         // 62.0 cut to the moon
  const TRAIL = T.flight + FLIGHT_EV.trail              // 65.5 trail blooms = THEME begins
  const PEAK = TRAIL + 3.6                              // 69.1 note 5 = the fermata peak
  const EXIT = T.flight + FLIGHT_EV.crossOut            // 70.4 exit streak
  const HEAL2 = SHIP_CLOCK.abs(SHIP_EV.touch)           // 78.2 fingertip-glow touch
  const SPRA = SHIP_CLOCK.abs(SHIP_EV.sprout)           // 79.5 THE SPROUT — freeze
  const LIFT = SHIP_CLOCK.abs(SHIP_EV.liftoff)          // 84.7 liftoff (clock shifts +0.1)
  const COMET = SHIP_CLOCK.abs(SHIP_EV.comet)           // 85.7 hair-comet
  const ALONE = SHIP_CLOCK.abs(SHIP_EV.cometEnd)        // 87.7 boy alone

  // ---------- custom voices ----------
  // Music-box pluck: struck-tine partials (1 / 3.4 / 6.7), instant attack, metal decay.
  const mbox = (t, m, { g = 0.09, dur = 1.0 } = {}) => at(t, () => {
    const f = hz(m)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.006)
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = Math.min(6000, Math.max(1500, f * 5))
    for (const [r, kg, dk] of [[1, 1, dur], [3.4, 0.3, dur * 0.4], [6.7, 0.12, dur * 0.18]]) {
      const o = osc('sine', f * r, t, dk + 0.05)
      const pg = ac.createGain()
      pg.gain.setValueAtTime(kg, t)
      pg.gain.exponentialRampToValueAtTime(0.0001, t + dk)
      o.connect(pg).connect(lp)
    }
    lp.connect(a)
    out(a, 1, 0.3, -0.16)
  })
  // Glassy celeste: near-harmonic sines (1 / 2.02 / 4.01), soft ping, long shimmer.
  const celeste = (t, m, { g = 0.05, dur = 1.6, pan = 0.22 } = {}) => at(t, () => {
    const f = hz(m)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.0001, t)
    a.gain.linearRampToValueAtTime(g, t + 0.018)
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    for (const [r, kg] of [[1, 1], [2.02, 0.4], [4.01, 0.12]]) {
      const o = osc('sine', f * r, t, dur + 0.05)
      const pg = ac.createGain()
      pg.gain.value = kg
      o.connect(pg).connect(a)
    }
    out(a, 1, 0.38, pan)
  })

  // ============================== A. STREAK (0–8) — hushed awe, cold ==============================
  kit.wind(0.0, 8.0, 0.11, 180, 520)
  kit.drone(0.0, 8.0, [26, 33], 0.05, 320)              // low pad drone D2/A2
  kit.bell(2.0, hz(50), 0.085, 3.0, 2.76)               // one distant toll
  kit.riser(3.2, 6.4, 0.16)                             // builds under the UFO
  kit.impact(UFO, 0.8, 50)                              // the thud (flash-locked)
  kit.crash(UFO, 0.2)
  kit.sub(UFO, 0.5, 78, 28, 2.2)

  // ============================== B. SHED (8–16) — held breath, then the eyes ==============================
  kit.wind(8.0, 16.0, 0.09, 240, 420)
  for (let i = 0; i < 6; i++) kit.heartbeat(8.5 + i * 1.1, 0.26 + i * 0.028) // fear rises
  mbox(10.5, MOTIF.low[0], { g: 0.085 })                // sparse motif, notes 1–3
  mbox(11.3, MOTIF.low[1], { g: 0.08 })
  mbox(12.1, MOTIF.low[2], { g: 0.085 })
  kit.bell(SCONE, hz(50), 0.06, 2.6, 2.76)              // the cone locks — distant toll answers
  kit.pluck(SP, MOTIF.low[0], 0.13, 2200, 0.16)         // reveal stab (A + Eb = the motif's ache)
  kit.pluck(SP + 0.02, MOTIF.low[3], 0.1, 2200, 0.2)
  kit.impact(SP, 0.55, 50)
  kit.sub(SP, 0.35, 70, 30, 1.4)
  kit.clunk(SDROP, 0.3)                                 // flashlight hits the floor

  // ============================== C. BOND (16–32) — warm pizzicato comedy, 120 BPM ==============================
  const CB = 2.0, CE = 0.25                             // bar, eighth @ 120
  const OST = [50, 53, 57, 60]                          // D–F–A–C ostinato
  const TWKL = [88, 84, 86]
  const ANS = [[65, 69], [64, 67]]
  for (let bar = 0; bar < 6; bar++) {
    const t0 = T.bond + bar * CB
    kit.pad(t0, [53, 60, 64, 67], CB * 0.98, 0.036, 1500, 0.45) // F lydian warmth
    for (let e = 0; e < 8; e++) {
      const tt = t0 + e * CE
      kit.pluck(tt + J(), OST[e % 4], e % 4 === 0 ? 0.085 : 0.065, 1500, 0.2, 'sawtooth')
    }
    kit.bass(t0, 38, 0.42, 0.22, 'triangle', 320)       // D2 pizzicato bass
    kit.bass(t0 + 1.0, 38, 0.38, 0.18, 'triangle', 320)
    mbox(t0 + 0.5, TWKL[bar % 3], { g: 0.05 })          // bell twinkle
    kit.piano(t0 + 1.5, ANS[bar % 2][0], 0.07, 1.1)     // piano answers
    kit.piano(t0 + 1.62, ANS[bar % 2][1], 0.06, 1.1)
  }
  mbox(WIG, MOTIF.low[0], { g: 0.11 })                  // wig-gag stinger
  mbox(WIG + 0.07, MOTIF.low[3], { g: 0.1 })
  kit.bell(WIG + 0.15, hz(93), 0.05, 1.2)
  kit.blip(WIGBOB, 440, 0.04, 0.3, 'sine')              // one slow dignified bob
  kit.whoosh(TOSS, 0.16, 0.08, 500, 2000)               // candy up…
  kit.tick(CATCH, 0.06, 3600)                           // …caught
  const BGLISS = [81, 84, 88, 91]
  BGLISS.forEach((m, i) => kit.bell(BURP + i * 0.05, hz(m), 0.04, 0.9)) // glitter burp gliss
  kit.glass(HEAL, 0.07, 0.35)                           // healing fizz
  kit.pluck(POP, 69, 0.11, 3000, 0.12)                  // band-aid pops
  kit.tick(POP + 0.04, 0.07, 4200)
  kit.whoosh(HOP, 0.18, 0.08, 400, 1500)                // scamper
  kit.hiss(CRACK, 0.35, 0.04)                           // the door…
  // COMIC FREEZE: everything stops — wind only + one very quiet braam swell.
  kit.wind(FRZ, 30.2, 0.07, 260, 380)
  kit.braam(FRZ + 0.3, [26, 38], 1.9, 0.07, 0.45)       // fades exactly at the resume
  kit.clunk(DOOR, 0.25)                                 // door shuts
  for (let tt = 30.2; tt < 31.9; tt += CE) {            // lighter pizzicato sneaks back
    const m = OST[Math.round((tt - 30.2) / CE) % 4]
    kit.pluck(tt + J(), m, 0.05, 1400, 0.2, 'sawtooth')
  }
  kit.bass(30.2, 38, 0.6, 0.15, 'triangle', 300)
  kit.tick(FISH, 0.07, 3400)                            // goldfish punchline: tick…
  kit.blip(FISH + 0.06, 1760, 0.05, 0.09, 'square')     // …blip

  // ============================== D. TITLE (32–38) — the slam ==============================
  kit.swell(32.3, 33.9, 0.08)
  kit.braam(SLAM, [38, 45, 50], 2.6, 0.26, 1)
  kit.taiko(SLAM, 0.9, 55)
  kit.crash(SLAM, 0.22)
  kit.impact(SLAM, 0.75, 48)
  kit.sub(SLAM, 0.55, 80, 28, 2.2)
  kit.choir(SLAM, [26, 38, 41, 45, 48], 3.6, 0.045, 'a', 1.2, 1.6) // low Dm add9 pad
  kit.bell(FLICK, hz(86), 0.04, 0.8)                    // title flicker
  kit.bell(FLICK + 0.09, hz(89), 0.035, 0.8)

  // ============================== E. STREET (38–48) — candy joy, then the van ==============================
  kit.crowd(38.0, 44.4, 0.045)                          // distant trick-or-treaters
  const EB = 2.0, EE = 0.25
  const EROOT = [38, 43, 38, 43]                        // D G D G
  for (let bar = 0; bar < 4; bar++) {
    const t0 = T.street + bar * EB, r = EROOT[bar]
    for (let e = 0; e < 8; e++) {
      const tt = t0 + e * EE
      if (tt >= VAN - 0.01) break                       // joy cut dead by the van cut
      const m = [r + 12, r + 16, r + 19, r + 24, r + 19, r + 16, r + 12, r + 19][e]
      kit.pluck(tt + J(), m, e % 4 === 0 ? 0.09 : 0.07, 2200, 0.2, 'sawtooth')
    }
    if (t0 < VAN) kit.bass(t0, r, 0.45, 0.22, 'triangle', 340)
    if (t0 + 1.0 < VAN) kit.bass(t0 + 1.0, r + 7, 0.4, 0.17, 'triangle', 340)
  }
  kit.pad(38.0, [50, 57, 62, 66], 4.0, 0.04, 1600, 0.6)
  kit.pad(42.0, [55, 59, 62, 67], 2.5, 0.04, 1600, 0.4) // ends right at the drop
  mbox(38.5, 86, { g: 0.05 })
  mbox(40.5, 89, { g: 0.05 })
  mbox(42.5, 86, { g: 0.05 })
  kit.whoosh(40.0, 0.6, 0.2, 400, 1800)                 // bike pass
  kit.braam(VAN, [38, 44], 2.2, 0.2, 0.7)               // the mood drops (tritone)
  kit.drone(VAN, 48.0, [26, 32], 0.035, 300)
  kit.tick(SNAP, 0.07, 4800)                            // roof light snaps on
  const EHB = [45.2, 46.3, 47.4]
  EHB.forEach((tt, i) => kit.heartbeat(tt, 0.42 + i * 0.03))
  kit.pluck(45.6, 44, 0.12, 800, 0.3)                   // sparse low tritones
  kit.pluck(46.4, 38, 0.12, 800, 0.3)
  kit.pluck(47.2, 44, 0.12, 800, 0.3)
  kit.clunk(VDOOR, 0.35)                                // agents out
  kit.hiss(VDOOR, 0.5, 0.05)

  // ============================== F. PURSUIT (48–60) — 128 BPM chase, then prayer ==============================
  const FB = 1.875, FE = FB / 8                         // bar, eighth @ 128
  let ti = 0
  for (let t = 48.0; t < SK - 0.12; t += FE, ti++) {    // taiko 8th-note ostinato
    const acc = ti % 4 === 0 ? 0.5 : ti % 2 === 0 ? 0.3 : 0.2
    kit.taiko(t, acc, ti % 8 < 4 ? 62 : 58)
  }
  for (const tc of CUTS) {                              // cross-cut accents
    kit.whoosh(tc, 0.14, 0.08, 800, 2400)
    kit.tick(tc, 0.05, 3000)
  }
  for (let t = 50.0; t < 58.4; t += FB / 2) {           // D/G# tritone stabs, bar + beat 3
    const gg = t < 54 ? 0.09 : 0.07
    kit.pluck(t, 50, gg, 2600, 0.14, 'sawtooth')
    kit.pluck(t, 56, gg, 2600, 0.14, 'sawtooth')
  }
  for (let i = 0; i < 6; i++) kit.heartbeat(52.0 + i * 1.1, 0.36 + i * 0.024)
  kit.strings(54.0, [50, 51, 56], SK - 54.0, 0.04, 0.7, 0.9, 2300) // tremolo cluster
  kit.riser(55.0, 58.7, 0.2)
  kit.impact(SK, 0.9, 50)                               // the skid (flash-locked)
  kit.crash(SK + 0.02, 0.16)
  kit.sub(SK, 0.6, 72, 26, 2.0)
  kit.heartbeat(SK + 0.15, 0.45)                        // heartbeat ONLY to 59.4
  kit.heartbeat(SK + 0.45, 0.34)
  kit.flutter(WHEEL, WHEEL + 0.25, 0.05)                // wheels keep spinning, faint
  kit.wind(SK + 0.1, 60.0, 0.08, 240, 360)              // one second of prayer

  // ============================== G. FLIGHT (60–71) — the theme, 84 BPM half-time ==============================
  kit.swell(59.0, LAUNCH + 0.02, 0.15)                  // breath swelling to the riser peak
  kit.taiko(LAUNCH, 0.9, 50)                            // single taiko
  kit.sub(LAUNCH, 0.5, 85, 30, 2.4)
  kit.whoosh(RISE, 0.9, 0.18, 300, 1900)                // nose up
  kit.strings(61.0, [38], 6.0, 0.055, 1.7, 2.0, 1500)   // low D pedal, swelling — holds through
  kit.choir(63.2, [50, 57, 62, 65], 4.2, 0.042, 'a', 1.6, 2.0) // moon cut: soft Dm choir
  const ARP = [74, 77, 81, 86]                          // harp-ish bells D–F–A–D
  for (let i = 0; i < 4; i++) kit.bell(64.4 + i * (60 / 168), hz(ARP[i]), 0.05, 1.4)
  const THD = [0.75, 0.4, 1.5, 1.5, 2.8]                // dotted · staccato · long · long · fermata
  MOTIF.flight.forEach((m, i) => {
    const t = TRAIL + i * 0.9, d = THD[i]
    kit.strings(t, [m], d, 0.085, 0.12, 0.4, 3200)
    kit.choir(t, [m], d + 0.15, 0.045, 'a', 0.14, 0.5)
  })
  kit.swell(68.2, PEAK, 0.1)                            // into the peak
  kit.choir(PEAK, [50, 57, 62, 65, 69], 2.8, 0.055, 'a', 0.4, 1.4) // choir bloom
  kit.crash(PEAK, 0.2)
  kit.strings(PEAK, [38, 45], 2.8, 0.05, 0.4, 1.4, 1800)
  kit.crash(EXIT, 0.1)                                  // exit streak: soft crash only
  kit.pad(EXIT, [38, 50, 57, 62], 1.8, 0.035, 1400, 0.8)

  // ============================== H. SHIP (71–88) — the goodbye, the sprout ==============================
  kit.pad(71.0, [38, 45, 50], 2.4, 0.038, 1100, 0.9)    // bare pad as strings subside
  kit.wind(71.0, 74.6, 0.06, 260, 620)                  // ramp glow begins
  celeste(71.6, 81, { g: 0.03 })
  celeste(72.4, 84, { g: 0.036 })
  celeste(73.2, 86, { g: 0.044 })                       // shimmer rising with the ship light
  kit.piano(74.8, 38, 0.08, 3.2)                        // solo piano, low D under
  MOTIF.low.slice(0, 4).forEach((m, i) => kit.piano(74.8 + i * 1.1, m, 0.15, 1.7))
  kit.piano(SPRA, MOTIF.low[4], 0.16, 2.4)              // note 5 lands ON the sprout freeze
  kit.bell(SPRA, hz(86), 0.07, 2.4, 2.76)
  kit.impact(SPRA, 0.3, 45)
  kit.swell(SPRA - 0.15, SPRA + 1.3, 0.04)
  kit.pad(HEAL2, [50, 54, 57, 62], 3.4, 0.045, 1500, 0.5) // fingertip touch: picardy D major
  celeste(HEAL2, 93, { g: 0.04, dur: 1.8 })
  kit.choir(80.2, [50, 57, 62], 3.8, 0.034, 'a', 1.3, 1.5) // choir hum under
  kit.whoosh(LIFT, 1.5, 0.24, 160, 2400)                // liftoff
  kit.swell(LIFT - 0.4, LIFT + 1.0, 0.12)
  const ECHO = [[86.0, 57], [86.6, 60], [87.2, 57]]     // hair-comet: motif 1–3, descending feel
  for (const [t, m] of ECHO) {
    kit.piano(t, m, 0.11, 1.1)
    kit.bell(t + 0.16, hz(m + 12), 0.045, 1.6)          // a bell answers each
  }
  kit.pad(ALONE, [38, 50], 1.3, 0.03, 900, 0.7)         // pad only — the boy alone

  // ============================== I. END (88–92) — warm, no braam ==============================
  kit.pad(88.0, [38, 50, 54, 57, 62], 3.9, 0.04, 1200, 1.0)
  kit.wind(88.2, 92.0, 0.05, 320, 200)
  kit.swell(91.5, 92.0, 0.09)
  kit.bell(91.6, hz(74), 0.055, 2.8, 2.4)               // the single last word
}
