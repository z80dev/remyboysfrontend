// THE BALD AND THE BEAUTIFUL — original daytime-soap pastiche score (84 s, film time)
// 90 BPM · 6/8 (BAR = 2.0 s, eighth = 1/3 s) · A minor. CUES are absolute film seconds
// (see timeline.js); the single hit-stop (the slap, world g = SLAP_G) is mapped with
// filmT() so the SFX + sting land on the frozen frame. Form:
//   0–14   cold open: A-pedal drone + heartbeat + three organ flashback stings
//   14–26  TITLE THEME — 6/8 minor: sustained strings lead over drawbar organ chords,
//          piano arpeggios, light taiko pulse; ends on a dramatic E7 half-cadence
//   26–42  parlour bed: soft organ/piano romance-tension; riser1 → the twin reveal
//   42–60  menace: low strings + sparse piano + heartbeats, thunder, DUN×3
//          (A2 → G2 → F2, one step lower each), the SLAP SFX + sting inside the freeze,
//          menacing half-cadence out
//   60–72  clinic: detuned music-box unease; riser2 → the toupee reveal (major sting + harp)
//   72–78  cliffhanger: record scratch on the freeze, organ minor swell cut dead at the reprise
//   78–84  END THEME — the title theme returns faster and major-lifted (A major),
//          resolving with the gong at 83.0 and ringing into silence before 83.95
// All melodies, chords and figures are original. Custom voices (drawbar organ, harp,
// music box, slap, record scratch, gong shimmer) are built via kit.at + kit.osc /
// kit.noise / kit.out. Beds under dialogue (26–60) sit ~6–10 dB under the stings.

import { CUES, filmT, SLAP_G, BAR, BPM, DUR } from './timeline.js'

export function score(kit) {
  const { ac, at, hz, osc, noise, out } = kit
  const E8 = BAR / 6 // 6/8 eighth = 1/3 s

  // ── custom voices ─────────────────────────────────────────────────────────
  // Drawbar organ: sine partials at 0.5/1/2/3 (×2 detuned for chorus) through one
  // shared lowpass + envelope. Handles stabs (atk ≈ 8 ms), beds (atk ≈ 0.5 s) and
  // the TBC swell (atk 1.1 s, hard cut by the release).
  const organ = (t, notes, dur, { g = 0.05, cut = 1500, atk = 0.02, rel = 0.3, sus = 0.75 } = {}) =>
    at(t, () => {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = cut
      lp.Q.value = 0.4
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + atk)
      a.gain.setValueAtTime(g, t + Math.max(atk, dur * sus))
      a.gain.linearRampToValueAtTime(0, t + dur + rel) // linear tail — never clicks
      for (const m of notes) {
        const f = hz(m)
        for (const [r, k] of [[0.5, 0.5], [1, 1], [2, 0.42], [3, 0.2]]) {
          if (f * r < 30) continue
          for (const det of [-4, 3]) {
            const o = osc('sine', f * r, t, dur + rel + 0.05)
            o.detune.value = det
            o.connect(lp)
          }
        }
      }
      lp.connect(a)
      out(a, 1, 0.35, 0, 0.5)
    })

  // Harp-ish glissando: a fast run of soft FM bells.
  const harp = (t, notes, { g = 0.06, dt = 0.055, dur = 0.6 } = {}) =>
    notes.forEach((m, i) => kit.bell(t + i * dt, hz(m), g, dur, 2.0, 1.1))

  // Music box: a bright FM bell with a slow-beating detuned ghost — the "unease".
  const mb = (t, m, g) => {
    kit.bell(t, hz(m), g, 0.9, 3.0, 1.8)
    kit.bell(t, hz(m) * 1.0045, g * 0.5, 0.9, 3.0, 1.8)
  }

  // ── COLD OPEN (0–14): drone + heartbeat + flashback stings ────────────────
  kit.drone(CUES.drone, CUES.theme - 0.1, [33, 45, 52], 0.045, 380) // low A pedal
  for (let i = 0; i < 9; i++) kit.heartbeat(CUES.heartbeat0 + i * 1.5, 0.2 + i * 0.02)
  CUES.sting.forEach((t, i) => {
    organ(t, i < 2 ? [45, 52, 57, 60] : [45, 52, 57, 60, 62], 0.5, { g: 0.085, cut: 1400, atk: 0.008, rel: 0.3 })
    kit.taiko(t, 0.5, 52)
    kit.strings(t, [33, 45], 0.9, 0.05, 0.015, 0.6, 700)
  })

  // ── TITLE THEME (14–26): 6 bars of 6/8, Am–F–Dm–E–Am–E7 ──────────────────
  const LEAD = [
    // [t, midi, dur] — original minor-key soap melody, one bar per chord
    [0.0, 69, 2 * E8 - 0.03], [1 * E8, 72, 2 * E8 - 0.03], [2 * E8, 76, 2 * E8 - 0.03],
    [BAR, 77, 4 * E8 - 0.04], [BAR + 2 * E8, 76, 2 * E8 - 0.03],
    [2 * BAR, 74, 2 * E8 - 0.03], [2 * BAR + 1 * E8, 77, 2 * E8 - 0.03], [2 * BAR + 2 * E8, 81, 2 * E8 - 0.03],
    [3 * BAR, 80, 4 * E8 - 0.04], [3 * BAR + 2 * E8, 76, 2 * E8 - 0.03],
    [4 * BAR, 81, 4 * E8 - 0.04], [4 * BAR + 2 * E8, 84, 2 * E8 - 0.03],
    [5 * BAR, 83, 2 * E8 - 0.03], [5 * BAR + 2 * E8, 80, 3.5 * E8],
  ]
  const TH = [ // [organ chord, piano arp] per bar
    { org: [45, 52, 57, 60], arp: [45, 52, 60, 64, 60, 52] }, // Am
    { org: [41, 48, 57, 60], arp: [41, 48, 57, 60, 57, 48] }, // F
    { org: [50, 57, 62, 65], arp: [50, 57, 65, 69, 65, 57] }, // Dm
    { org: [40, 52, 56, 59], arp: [40, 52, 59, 64, 59, 52] }, // E
    { org: [45, 52, 57, 60], arp: [45, 52, 60, 64, 69, 64] }, // Am
    { org: [40, 50, 56, 59], arp: [40, 50, 59, 62, 59, 50] }, // E7 — dramatic half-cadence
  ]
  kit.crash(CUES.theme, 0.15)
  TH.forEach(({ org, arp }, bar) => {
    const t = CUES.theme + bar * BAR
    organ(t, org, bar === 5 ? 1.6 : 1.9, { g: 0.05, cut: 1500, atk: 0.05, rel: bar === 5 ? 0.4 : 0.3 })
    for (let e = 0; e < 6; e++) kit.piano(t + e * E8, arp[e], 0.085, 1.0)
    kit.taiko(t, 0.24, 55) // light timpani pulse: downbeat + beat 4
    kit.taiko(t + 1.0, 0.13, 55)
  })
  LEAD.forEach(([o, m, d]) => kit.strings(CUES.theme + o, [m], d, 0.055, 0.1, 0.45, 2400))
  kit.strings(CUES.theme + 5 * BAR, [40, 52], 1.6, 0.045, 0.15, 0.8, 1800) // cadence body
  kit.swell(CUES.theme + 5 * BAR - 1.1, CUES.theme + 5 * BAR, 0.08) // breath into the cadence
  kit.impact(CUES.theme + 5 * BAR, 0.3, 50)
  kit.taiko(CUES.theme + 5 * BAR, 0.4, 50)

  // gliss into the parlour scene (24.6)
  harp(CUES.gliss1, [88, 84, 81, 76, 72, 69, 64], { g: 0.055, dt: 0.05, dur: 0.55 })

  // ── PARLOUR BED (26.2–42): soft organ/piano, quiet under dialogue ─────────
  const bed = { g: 0.03, cut: 1100, atk: 0.5, rel: 0.6 }
  organ(CUES.underscoreA, [45, 52, 60, 64], 3.9, bed)                    // Am
  organ(CUES.underscoreA + 4.0, [41, 48, 57, 64], 3.9, bed)              // Fmaj7
  organ(CUES.underscoreA + 8.0, [50, 57, 62, 65], 1.0, { ...bed, rel: 0.5 }) // Dm (short — riser takes over)
  kit.riser(CUES.riser1, CUES.stingZoom + 0.02, 0.13)
  // reveal sting on the crash zoom (35.3)
  organ(CUES.stingZoom, [40, 52, 56, 59], 1.6, { g: 0.095, cut: 1700, atk: 0.01, rel: 0.5 })
  kit.impact(CUES.stingZoom, 0.42, 52)
  kit.taiko(CUES.stingZoom, 0.5, 50)
  kit.crash(CUES.stingZoom, 0.1)
  harp(CUES.stingZoom + 0.05, [57, 60, 64, 69, 72, 76, 81], { g: 0.06, dt: 0.06, dur: 0.6 })
  organ(CUES.stingZoom + 2.0, [45, 52, 60], 1.9, { ...bed, g: 0.028 })   // Am
  organ(CUES.stingZoom + 4.0, [40, 52, 59], 1.9, { ...bed, g: 0.028 })   // E
  kit.choir(CUES.gasp1, [57, 60, 64], 0.25, 0.08, 'a', 0.04, 0.3)        // the gasp
  ;[[27.3, 64], [28.6, 60], [31.3, 65], [32.6, 60], [38.4, 64], [40.4, 59]].forEach(([t, m]) =>
    kit.piano(t, m, 0.045, 1.3))
  kit.piano(CUES.menace - 0.9, 45, 0.04, 1.6)

  // ── MENACE BED (44–60): low strings, sparse piano, heartbeats, thunder ────
  kit.strings(CUES.menace, [33, 45, 48], 13.5, 0.04, 1.5, 2.2, 620)      // sustained to ~59.7
  ;[[44.05, 45], [46.05, 40], [48.05, 41], [52.05, 45], [54.05, 43], [56.05, 41]].forEach(([t, m]) =>
    kit.piano(t, m, 0.05, 1.7))
  ;[44.2, 45.6, 47.0].forEach((t) => kit.heartbeat(t, 0.2))
  ;[[52.7, 0.22], [53.5, 0.26], [54.2, 0.3], [54.75, 0.35], [55.15, 0.4]].forEach(([t, g]) => kit.heartbeat(t, g)) // the lunge
  ;[[55.95, 0.45], [56.9, 0.32]].forEach(([t, g]) => kit.heartbeat(t, g)) // after the slap
  CUES.thunder.forEach((t, i) => kit.thunder(t, i ? 0.28 : 0.38, 3.5))    // lightning through the window

  // DUN / DUN / DUN — the reveal figure, OUR notes: A2 → G2 → F2 (one step lower each)
  const DUN_ROOTS = [45, 43, 41]
  CUES.duns.forEach((t, i) => {
    const m = DUN_ROOTS[i]
    organ(t, [m, m + 7, m + 12], 0.55, { g: 0.1, cut: 900, atk: 0.008, rel: 0.35 })
    kit.taiko(t, 0.6 + i * 0.05, 50 - i * 3)
    kit.strings(t, [m - 12], 0.9, 0.055, 0.02, 0.6, 500)
    kit.sub(t, 0.28, 95, 34, 0.55)
  })

  // THE SLAP — SFX at filmT(SLAP_G) so the crack lands on the first frozen frame;
  // an organ sting 50 ms in rings through the 0.35 s freeze.
  const slapT = filmT(SLAP_G)
  kit.clap(slapT, 0.55)
  kit.impact(slapT, 0.4, 62)
  at(slapT, () => {
    // bright crack: wide noise burst…
    const n = noise(slapT, 0.12)
    const hp = ac.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1600
    const a = ac.createGain()
    a.gain.setValueAtTime(0.5, slapT)
    a.gain.exponentialRampToValueAtTime(0.0001, slapT + 0.08)
    n.connect(hp).connect(a)
    out(a, 1, 0.25, 0.25)
    // …plus a ~2 ms snap transient on top
    const n2 = noise(slapT, 0.04)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 3400
    bp.Q.value = 1.4
    const a2 = ac.createGain()
    a2.gain.setValueAtTime(0.38, slapT)
    a2.gain.exponentialRampToValueAtTime(0.0001, slapT + 0.022)
    n2.connect(bp).connect(a2)
    out(a2, 1, 0.2, -0.3)
  })
  organ(slapT + 0.05, [45, 52, 57, 60], 0.9, { g: 0.1, cut: 1600, atk: 0.006, rel: 0.5 })

  // menacing half-cadence ending the twin scene (58.2)
  organ(CUES.cadence1, [40, 50, 56, 59], 0.7, { g: 0.085, cut: 1200, atk: 0.01, rel: 0.5 })
  kit.taiko(CUES.cadence1, 0.45, 48)
  kit.strings(CUES.cadence1, [40], 0.8, 0.05, 0.03, 0.6, 700)
  kit.piano(CUES.cadence1 + 0.05, 40, 0.07, 1.8)

  // ── CLINIC (60.4–72): detuned music-box unease ────────────────────────────
  const MB = [ // [melody over the bar, low piano root]
    [[81, 88, 84, 88, 84, 76], 45], // Am
    [[84, 88, 91, 88, 84, 79], 48], // C
    [[81, 84, 88, 84, 81, 88], 45], // Am
    [[81, 84, 88, 84, 81, 76], 45], // Am
    [[86, 89, 93, 89, 86, 81], 50], // Dm
    [[80, 83, 88, 83, 80, 76], 40], // Em
  ]
  MB.forEach(([mel, root], bar) => {
    const t = CUES.musicbox + bar * BAR
    const g = bar < 3 ? 0.05 : 0.042 // thin out after the reveal
    mel.forEach((m, e) => mb(t + e * E8, m, g))
    kit.piano(t, root, 0.045, 1.7)
  })
  kit.riser(CUES.riser2, CUES.stingBig, 0.15)
  // the toupee reveal (66.4): MAJOR sting + harp run
  organ(CUES.stingBig, [45, 52, 61, 64, 69], 1.4, { g: 0.09, cut: 1900, atk: 0.008, rel: 0.6 })
  kit.impact(CUES.stingBig, 0.5, 48)
  kit.taiko(CUES.stingBig, 0.55, 48)
  kit.crash(CUES.stingBig, 0.14)
  harp(CUES.stingBig + 0.04, [57, 61, 64, 69, 73, 76, 81, 85], { g: 0.075, dt: 0.05, dur: 0.6 })
  kit.choir(CUES.gasp2, [57, 60, 64], 0.25, 0.09, 'a', 0.04, 0.35)

  // ── CLIFFHANGER (72–78): freeze → scratch → TBC swell ─────────────────────
  kit.piano(72.4, 45, 0.05, 2.2) // held breath
  kit.piano(73.4, 41, 0.04, 1.6)
  at(CUES.scratch, () => {
    // vinyl record scratch: filtered noise pitch-drop + a wobbling saw drop
    const n = noise(CUES.scratch, 0.4)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(3200, CUES.scratch)
    bp.frequency.exponentialRampToValueAtTime(220, CUES.scratch + 0.33)
    bp.Q.value = 2.5
    const a = ac.createGain()
    a.gain.setValueAtTime(0.22, CUES.scratch)
    a.gain.exponentialRampToValueAtTime(0.0001, CUES.scratch + 0.36)
    n.connect(bp).connect(a)
    out(a, 1, 0.2, -0.15)
    const o = osc('sawtooth', 900, CUES.scratch, 0.32)
    o.frequency.exponentialRampToValueAtTime(90, CUES.scratch + 0.28)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1200
    const b = ac.createGain()
    b.gain.setValueAtTime(0.1, CUES.scratch)
    b.gain.exponentialRampToValueAtTime(0.0001, CUES.scratch + 0.3)
    o.connect(lp).connect(b)
    out(b, 1, 0.15)
  })
  // "TO BE CONTINUED…" organ minor swell: ~1.1 s rise, holds, CUT dead at 78.0
  organ(CUES.swellTBC, [45, 52, 57, 60, 64], 2.45, { g: 0.06, cut: 1300, atk: 1.1, rel: 0.15, sus: 0.96 })
  kit.sub(CUES.swellTBC, 0.25, 75, 32, 2.4)

  // ── END THEME (78–83): the title theme, faster (eighth = 0.25 s) + major ──
  const E8B = BAR / 8 // 0.25 s — the reprise hurries, soap-credits style
  kit.crash(CUES.endTheme, 0.2)
  kit.sub(CUES.endTheme, 0.3, 90, 40, 1.2)
  kit.strings(CUES.endTheme, [45, 52, 57, 61], 4.6, 0.04, 0.5, 1.0, 2200) // A major bed
  const LEAD2 = [
    [0.0, 69], [E8B, 73], [2 * E8B, 76], [3 * E8B, 81, 0.7],          // A: A C# E A(hold)
    [1.5, 78], [1.75, 81], [2.0, 86, 0.95],                            // D: F# A D6(hold)
    [3.0, 85], [3.25, 83], [3.5, 81, 0.7],                             // A: C# B A(hold)
    [4.25, 76], [4.5, 81, 0.95],                                       // resolves home
  ]
  const ORG2 = [
    [0.0, [45, 52, 61, 64], 1.4],  // A
    [1.5, [38, 57, 62, 66], 1.4],  // D
    [3.0, [45, 52, 61, 64], 1.4],  // A
  ]
  const ARP2 = [
    [0.0, [45, 52, 61, 64, 69, 64]],
    [1.5, [50, 57, 66, 69, 66, 57]],
    [3.0, [45, 52, 61, 64, 69, 76]],
  ]
  ORG2.forEach(([o, ch, d]) => organ(CUES.endTheme + o, ch, d, { g: 0.05, cut: 1700, atk: 0.05, rel: 0.3 }))
  ARP2.forEach(([o, arp]) => arp.forEach((m, e) => kit.piano(CUES.endTheme + o + e * E8B, m, 0.07, 0.55)))
  LEAD2.forEach(([o, m, d]) => kit.strings(CUES.endTheme + o, [m], d ?? 2 * E8B - 0.03, 0.055, 0.05, 0.35, 2600))
  ;[[0.0, 0.3], [0.75, 0.15], [1.5, 0.25], [2.0, 0.15], [3.0, 0.3], [3.75, 0.12], [4.5, 0.2]].forEach(([o, g]) =>
    kit.taiko(CUES.endTheme + o, g, 55))
  kit.crash(CUES.endTheme + 3.0, 0.12)
  kit.choir(CUES.endTheme + 3.0, [57, 61, 64, 69], 2.0, 0.038, 'a', 0.4, 1.2)
  ;[45, 52, 61, 64, 69, 73].forEach((m, i) => kit.piano(CUES.endTheme + 4.5 + i * 0.07, m, 0.06, 0.9)) // final roll

  // ── GONG (83.0): resolution + ring-out into silence before 83.95 ──────────
  organ(CUES.gong, [45, 52, 57, 61, 64], 0.55, { g: 0.07, cut: 1800, atk: 0.01, rel: 0.3 }) // A major, ends ~83.85
  kit.impact(CUES.gong, 0.45, 42)
  kit.taiko(CUES.gong, 0.5, 46)
  kit.bell(CUES.gong, hz(45), 0.2, 0.8, 2.76, 5)  // inharmonic gong fundamental
  kit.bell(CUES.gong + 0.01, hz(45) * 1.5, 0.09, 0.7, 1.42, 4)
  at(CUES.gong, () => {
    const n = noise(CUES.gong, 0.9)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 840
    bp.Q.value = 9
    const a = ac.createGain()
    a.gain.setValueAtTime(0.09, CUES.gong)
    a.gain.exponentialRampToValueAtTime(0.0001, CUES.gong + 0.82)
    n.connect(bp).connect(a)
    out(a, 1, 0.5)
  })
}

export default score
