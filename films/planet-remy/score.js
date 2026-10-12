// Original score for PLANET REMY. Documentary language, not chiptune: a felt-piano
// theme ("The Hair") stated at dawn, developed through the day, darkened to B minor
// for the Cabald, resolved to D major at the close. 80 BPM beat grid (0.75 s).
// Every clash/impact cue is scheduled through filmT so picture and sound share one clock.
import { T } from './timeline.js'
import { filmT, HIT_G } from './choreo.js'

const B = 0.75 // beat
// The Hair theme: D F# A B A F#
const MOTIF = [74, 78, 81, 83, 81, 78]
const MOTIF_LO = MOTIF.map((m) => m - 12)

export function score(kit) {
  const { ac, at, osc, out, hz, R } = kit
  const bellHz = (m) => hz(m)

  // birdsong: two quick falling sine chirps, panned off-centre
  const chirp = (t, f0 = 3200 + R() * 900) => at(t, () => {
    for (let i = 0; i < 2; i++) {
      const o = osc('sine', f0 * (1 + 0.16 * i), t + i * 0.15, 0.1)
      o.frequency.exponentialRampToValueAtTime(f0 * 0.72, t + i * 0.15 + 0.09)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t + i * 0.15)
      a.gain.linearRampToValueAtTime(0.045, t + i * 0.15 + 0.015)
      a.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.1)
      o.connect(a)
      out(a, 1, 0.18, 0.3, 0)
    }
  })

  // ---------------- dawn (0–7): stillness, then the sun ----------------
  kit.drone(0, 8.2, [38, 45], 0.042, 340)
  kit.wind(0, 7.2, 0.09, 300, 900)
  kit.piano(0.7, 50, 0.12, 3.5)
  kit.piano(1.9, 57, 0.10, 3.5)
  kit.piano(2.9, 62, 0.11, 3.5)
  chirp(1.25); chirp(2.1, 3800); chirp(5.4); chirp(6.3, 3600)
  kit.swell(3.2, 4.0, 0.20)
  // sunrise bloom at 4.0
  kit.impact(4.0, 0.32, 49)
  kit.strings(4.0, [38, 50, 57, 62], 2.4, 0.05, 0.5)
  kit.choir(4.05, [62, 69, 74], 2.2, 0.032, 'a', 0.7)
  kit.bell(4.02, bellHz(74), 0.055, 2.6)

  // ---------------- the herd (7–15): light-footed day groove ----------------
  const bars = [[7, [50, 57, 62]], [10, [55, 59, 62]], [13, [57, 61, 64]]] // D  G  A
  bars.forEach(([t0, chord], bi) => {
    kit.bass(t0, chord[0] - 12, 1.5, 0.16, 'sawtooth', 480)
    kit.bass(t0 + 1.5, chord[0] - 12, 1.2, 0.11, 'sawtooth', 480)
    kit.piano(t0 + 0.02, chord[1], 0.085, 2.6)
    kit.piano(t0 + 0.02, chord[2], 0.07, 2.6)
    ;[0, 1, 2, 3].forEach((b) => {
      if (b % 2 === 0) kit.pluck(t0 + b * B, MOTIF[bi % 2 === 0 ? b % 4 : (b + 2) % 4], 0.05, 2600, 0.3)
      kit.hat(t0 + b * B + B / 2, 0.028)
    })
  })
  chirp(7.6, 4200); chirp(9.4); chirp(12.2, 3900); chirp(13.9)

  // ---------------- the alpha (15–23): solo piano, close and warm ----------------
  kit.strings(15.4, [38, 45, 50], 6.6, 0.03, 2.6)
  MOTIF.forEach((m, i) => kit.piano(15.4 + i * 0.9, m, 0.13, 3.2))
  MOTIF_LO.forEach((m, i) => kit.piano(19.0 + i * 0.62, m, 0.10, 2.8))
  kit.choir(19.2, [62, 69], 3.2, 0.02, 'u', 1.8)

  // ---------------- the Mane Display (23–31): mischievous plucks ----------------
  const rbar = [23, 24.8, 26.6, 28.4, 30.2] // 1.8 s bars
  const RPAT = [[74, 78, 81, 78], [76, 79, 81, 84], [78, 81, 83, 86], [74, 78, 81, 78], [71, 74, 78, 74]]
  rbar.forEach((t0, bi) => {
    kit.bass(t0, [38, 43, 45, 38, 38][bi], 1.5, 0.13, 'sawtooth', 520)
    kit.bass(t0 + 0.9, [45, 50, 52, 45, 45][bi], 0.8, 0.10, 'sawtooth', 520)
    RPAT[bi].forEach((m, i) => kit.pluck(t0 + i * 0.45, m, 0.055, 3000, 0.26))
    if (bi % 2 === 1) kit.tick(t0 + 0.45, 0.05, 3800)
  })
  // the leap (27.6 crest) — rise, shimmer, land
  kit.swell(26.9, 27.62, 0.16, 6500)
  kit.bell(27.62, bellHz(78), 0.05, 1.6)
  kit.bell(27.76, bellHz(81), 0.05, 1.6)
  kit.bell(27.9, bellHz(86), 0.06, 2.2)
  kit.taiko(28.35, 0.4, 58)
  chirp(29.6); chirp(30.3, 4100)

  // ---------------- the ridge (31–39): B minor, patient ----------------
  kit.drone(31, 39.4, [35, 47, 54], 0.05, 300)
  kit.wind(31, 39.4, 0.08, 260, 800)
  kit.braam(33.4, [35, 47, 54], 2.8, 0.2)
  ;[33.5, 35.0, 36.3, 37.1, 37.7, 38.2, 38.6].forEach((t, i) => kit.taiko(t, 0.42 + i * 0.04, 58))
  kit.strings(35.4, [59, 62, 66], 2.6, 0.045, 1.8, 1.6, 1900)
  kit.riser(37.4, 39.0, 0.15)

  // ---------------- the charge (39–48): gallop → freeze → fanfare ----------------
  const gallop = [39.0, 39.5, 40.0, 40.4, 40.8, 41.15, 41.5, 41.85, 42.1]
  gallop.forEach((t, i) => kit.taiko(t, 0.5, 60))
  for (let t = 39.0, i = 0; t < filmT(HIT_G) - 0.05; t += B / 2, i++)
    kit.bass(t, [35, 35, 38, 35][i % 4], 0.16, 0.15, 'sawtooth', 460)
  for (let t = 39.0, i = 0; t < filmT(HIT_G) - 0.05; t += B / 4, i++)
    if (i % 2 === 0) kit.pluck(t, [59, 62, 66, 62][i % 4], 0.035, 2200, 0.14)
  kit.whoosh(41.95, 0.4, 0.26)
  const clash = filmT(HIT_G)
  kit.impact(clash, 0.85, 43)
  kit.sub(clash, 0.65, 120, 30, 1.3)
  kit.crash(clash, 0.22)
  kit.taiko(clash, 0.95, 55)
  kit.bell(clash + 0.02, bellHz(83), 0.05, 3.2) // rings through the freeze
  const land = filmT(HIT_G + 0.79)
  kit.taiko(land, 0.5, 56)
  kit.whoosh(land - 0.1, 0.3, 0.2)
  // scurry of the retreat
  for (let t = filmT(4.2), i = 0; t < filmT(5.6); t += 0.24, i++)
    kit.hat(t, 0.03 + 0.008 * (i % 3))
  // fanfare: the herd holds
  kit.strings(44.6, [50, 57, 62], 1.1, 0.055, 0.12, 0.8)
  kit.strings(45.2, [55, 62, 66], 1.1, 0.06, 0.12, 0.8)
  kit.strings(45.8, [57, 61, 64], 1.3, 0.065, 0.12, 0.9)
  kit.choir(45.85, [62, 66, 69], 2.2, 0.038, 'a', 0.5)
  kit.piano(45.82, 62, 0.2, 3)
  kit.crash(45.8, 0.16)
  kit.strings(46.9, [50, 57, 62, 69], 1.0, 0.05, 0.3, 1.4)

  // ---------------- next morning (48–56): the theme returns ----------------
  kit.wind(48, 56, 0.07, 300, 1000)
  kit.strings(48.6, [38, 45, 50], 6.8, 0.032, 2.6)
  MOTIF.forEach((m, i) => kit.piano(48.6 + i * 0.9, m, 0.12, 3.4))
  kit.choir(50.6, [62, 69], 4.6, 0.024, 'o', 2.2)
  kit.bell(53.0, bellHz(78), 0.045, 2.2)
  chirp(49.5); chirp(52.6, 4000); chirp(54.8)

  // ---------------- end card (56–62): restatement, one held D ----------------
  MOTIF.slice(0, 4).forEach((m, i) => kit.piano(56.6 + i * 0.72, m, 0.13, 3))
  kit.strings(58.0, [50, 57, 62, 66], 2.9, 0.05, 1.1)
  kit.choir(58.4, [62, 66, 69], 3.1, 0.03, 'a', 1.2)
  kit.swell(59.6, 61.3, 0.11, 7000)
  kit.impact(60.9, 0.28, 45)
  kit.bell(61.0, bellHz(50), 0.04, 2.6)
}
