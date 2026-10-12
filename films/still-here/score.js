// STILL HERE — score. Cinematic trailer: 120 BPM, every cue on the bar grid (2 s bars).
import { T } from './timeline.js'

const hz = (m) => 440 * 2 ** ((m - 69) / 12)

// THE REMY THEME — F major, warm, five notes (F A C D F-high)
const THEME = [65, 69, 72, 74, 77]
// theme rhythm (s offsets): step 0.4, the top F arrives late and is held
const THEME_AT = [0, 0.4, 0.8, 1.2, 1.8]
// dark transform — the theme pulled to F minor, an octave down, stripped to its kernel
const THEME_DARK = [53, 56, 60, 62]

export function score(k) {
  // k = the filmkit audio kit. All times are ABSOLUTE film seconds (0–64). MIDI notes are numbers.

  // ── ACT I · BOOT (0–8) ─────────────────────────────────────────────────────
  // BIOS 0–2.4: machine noise only, no music yet
  k.tick(T.boot + 0.02, 0.06) // power-on relay
  k.hiss(T.boot, 2.4, 0.05) // PSU whine under the POST screen
  k.blip(0.5, 880, 0.06) // BIOS beep 1
  k.blip(1.3, 1245, 0.06) // BIOS beep 2
  k.blip(1.9, 880, 0.06) // BIOS beep 3

  // Remy OS xp boot logo 2.4–6: one low hum, quiet marquee ticks, whoosh into the desktop
  k.drone(T.bootLogo, T.desk, [33, 45], 0.05, 300)
  for (let n = 0; n <= 8; n++) k.tick(T.bootLogo + 0.2 + n * 0.35, 0.05) // progress marquee
  k.whoosh(5.3, 0.7) // into desktop reveal

  // Desktop reveal 6–8: the theme's first phrase, solo felt piano
  ;[0.1, 0.5, 0.9, 1.3].forEach((o, i) => k.piano(T.desk + o, THEME[i], 0.14, 1.6))
  k.swell(T.desk + 0.6, T.genesis, 0.2)

  // ── ACT II · GENESIS (8–16) — the wall of 4,490 Remys builds ──────────────
  THEME_AT.forEach((o, i) => {
    k.piano(T.genesis + o, THEME[i], 0.18, i === 4 ? 2.2 : 0.55) // full statement, top F held
    k.bell(T.genesis + o + 0.1, hz(THEME[i] + 12), 0.05) // octave-up sparkle echo
  })
  for (let b = 0; b < 4; b++) k.pad(T.genesis + b * 2, [53, 60, 65], 2, 0.045) // F pad, even bars
  for (let t = T.genesis + 4; t < T.golden; t += 0.5) k.hat(t, 0.06) // hat eighths lift from bar 12
  k.swell(T.genesis + 6.2, T.golden, 0.22)
  k.crash(T.golden, 0.15) // land the cut into the golden age

  // ── ACT III · GOLDEN (16–24) — the OS world, full groove ─────────────────
  for (let i = 0; i < 4; i++) k.bass(T.golden + i * 2, i % 2 ? 31 : 29, 1.6, 0.3) // F–G, bars 16/18/20/22
  const ARP = [65, 72, 74, 77, 74, 72] // sixteenth-note arpeggio from 18
  let ai = 0
  for (let t = T.golden + 2; t < T.turn; t += 0.25, ai++) k.pluck(t, ARP[ai % 6], 0.05)
  ;[2, 4, 6].forEach((o) => k.clap(T.golden + o, 0.3)) // backbeat on bars 18/20/22
  ;[0, 4].forEach((o) => k.pad(T.golden + o, [53, 57, 60, 65], 4, 0.04)) // wide F pad
  k.swell(T.golden + 6.2, T.turn, 0.24) // the act ends BRIGHT

  // ── ACT IV · THE TURN (24–26) — hard cut, let it ring ────────────────────
  k.braam(T.turn, [36, 43, 48], 2.2, 0.42, 1.2)
  k.impact(T.turn, 0.9, 48)
  k.glitch(T.turn, 1.6, 0.12)
  // nothing else 24–26 — the braam IS the glitch storm's downbeat

  // ── ACT V · DARK (26–34) — Cabald wall → RUG LORD → BSOD ─────────────────
  // taiko war drums, strong–weak every half bar through 33
  for (let i = 0; i <= 14; i++) k.taiko(T.dark + i * 0.5, i % 2 === 0 ? 0.8 : 0.45)
  // the theme, corrupted: F minor, low, halting — under the villain reveal
  ;[0.5, 0.9, 1.3, 1.7].forEach((o, i) => k.piano(T.dark + o, THEME_DARK[i], 0.1, 1.6))
  for (let t = T.dark + 0.4; t < T.dark + 5; t += 0.8) k.heartbeat(t, 0.5) // pulse to 31
  ;[0, 4].forEach((o) => k.choir(T.dark + o, [38, 50], 4, 0.05, 'o', 1.8, 2)) // mournful 'o'
  k.sub(T.dark + 2, 0.7, 90, 30, 2.2)
  k.riser(T.dark + 2, T.ruglord, 0.25) // into RUG LORD
  k.braam(T.ruglord, [30, 36, 42], 2.0, 0.36) // the lord announces himself
  k.thunder(T.ruglord + 0.05, 0.4)
  k.sweepDown(T.bsod, 1.2, 1200, 60, 0.35) // BSOD: the world pitch-drops
  // near-silence — one sad drone, two dying ticks, one last glitch
  k.drone(T.bsod + 0.4, T.floor, [31], 0.04, 220)
  k.tick(T.bsod + 0.9, 0.05, 1400)
  k.tick(T.bsod + 1.7, 0.05, 900)
  k.glitch(T.bsod + 2.1, 0.4, 0.06)

  // ── ACT VI · THE FLOOR (34–42) — hollow, sparse, the crash ───────────────
  ;[[0.3, 53], [2.3, 51], [4.3, 48], [6.3, 46]].forEach(([o, m]) => k.piano(T.floor + o, m, 0.16, 2.5)) // descending lows
  k.thunder(T.floor + 0.15, 0.45)
  k.wind(T.floor, T.recovery, 0.16) // cold air all act
  k.sweepDown(T.floor + 0.4, 2.5, 900, 90, 0.3) // falling (ends just before the slam)
  ;[1, 5].forEach((o) => k.strings(T.floor + o, [41, 44], 2, 0.035, 0.8, 1.0)) // trembling dyad
  k.impact(T.floorSlam, 1.0, 44) // THE FLOOR
  k.sub(T.floorSlam, 0.8, 120, 26, 3.0)
  k.piano(T.recovery - 0.4, 41, 0.14, 2) // last low piano — the bottom: low F

  // ── ACT VII · RECOVERY (42–52) — hope returns, the V ─────────────────────
  THEME_AT.forEach((o, i) => {
    k.piano(T.recovery + 0.2 + o, THEME[i], 0.17, i === 4 ? 2.0 : 0.55) // theme restored
    k.bell(T.recovery + 0.3 + o, hz(THEME[i] + 12), 0.04) // octave doubling, quiet
  })
  ;[0, 4].forEach((o) => k.pad(T.recovery + o, [53, 60, 65], 4, 0.04)) // bars 42 / 46
  k.strings(T.recovery + 4, [53, 57, 60, 65], 4, 0.045) // strings enter at 46
  k.choir(T.rise, [53, 60, 65], 4, 0.05, 'a') // voices open at 48
  k.bass(T.rise, 29, 3.8, 0.28)
  for (let i = 0; i < 8; i++) k.taiko(T.rise + i * 0.5, 0.4 + (i * 0.5) / 7) // build 48→51.5, g 0.4→0.9
  k.swell(T.title - 2, T.title, 0.3) // 50 → 52
  k.crash(T.title, 0.2) // the title hits

  // ── ACT VIII · TITLE (52–64) ──────────────────────────────────────────────
  k.braam(T.title, [29, 36, 41, 48], 3.2, 0.45, 1.3) // the big braam
  k.impact(T.title, 1.0, 40)
  k.impact(T.titleSlam, 0.7, 55) // REMY BOYS slam
  k.taiko(T.titleSlam, 0.9)
  k.pad(T.titleSlam, [41, 48, 53], 5, 0.045) // sustain under the card
  ;[2, 4].forEach((o) => {
    // ensemble hits at 54 and 56
    k.taiko(T.title + o, 0.8)
    k.strings(T.title + o, [53, 60, 65], 1.6, 0.05, 0.3, 0.8)
  })
  // dramatic gap: nothing scheduled 56.9–57.0 — one breath before the name
  k.braam(T.stillHere, [41, 48, 53], 2.8, 0.4) // STILL HERE.
  k.choir(T.stillHere, [65, 72, 77], 3, 0.055, 'a') // the theme triad, octave up, triumphant
  k.crash(T.stillHere, 0.18)

  // end card 60.5: the theme, solo piano, letting go
  ;[[2.4, 65, 2.0], [2.9, 69, 2.0], [3.4, 72, 3.2]].forEach(([o, m, d]) =>
    k.piano(T.stillHere + o, m, 0.13, d),
  )
  k.bell(T.endcard + 0.5, hz(77), 0.06, 2.4) // one high F, ringing
  k.sub(T.endcard + 2, 0.4, 60, 30, 1.3) // final exhale (trimmed to end by 63.8)
  k.tick(T.end - 0.3, 0.05, 660) // screen goes dark
}
