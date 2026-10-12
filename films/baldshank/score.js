// THE BALDSHANK REDEMPTION — original score. Prison-ballad idiom; every note original
// (no Thomas Newman, no Mozart, no parody of any existing cue — the shapes below are our
// own). All cue times come from ./timeline.js: every EV_* beat schedules on e.f = filmT(e.g),
// scene bounds on SCENES/SHOTS, card windows on CAPS t0/t1, and the hit-stop pins on
// STOPS via PIN = filmT(g), REL = PIN + d — nothing here re-types a timeline time by hand.
// Sub-beat offsets inside a section are the tempo spine (below), documented in the bar map.
//
// TEMPO SPINE: 75 BPM ballad, BEAT = 0.8 s, BAR = 3.2 s (4/4), anchored at film 0.
// The clock gives two gifts and we take both: 57.6 = 18 x 3.2 (the storm opens ON bar 18)
// and 67.2 = 21 x 3.2 (HIT-STOP 1 lands EXACTLY on bar 21's downbeat). Cuts at 32.4 /
// 48.9 / 80.96 fall off the grid; motifs there are placed on their local nearest beat,
// while every sync-critical pin rides e.f exactly.
//
// BAR MAP (bar n spans film [3.2n, 3.2n + 3.2)):
//   bar 0-4   0.0    S1 arrival: rain bus (0-4.2), gates 4.2, lineup 5.2, SHAVE ROOM 9-14.4
//   bar 5     16.0   warden speech close, cell night, TITLE card in 17.8 (bar 5 beat 2.25)
//   bar 6     19.2   title out 20.8 (beat 2.0), S2 yard in 21.1
//   bar 7-9   22.4   yard warmth, comb deal 26.5-29.5, RITA poster 29.9
//   bar 10    32.0   S3: office 32.6 (beat 0.75), needle drop 33.2 (beat 1.5), aria 33.4
//   bar 11-13 35.2   ARIA body: yard stop 35.6, release 39.0, orchestral climax 40.4
//   bar 14    44.8   burst-in 45.0 (beat 0.25), needle skitter 45.15, DRY ROOM sting 46.2
//   bar 15    48.0   S4: library 49.2, music-box years
//   bar 16    51.2   beam reveal 52.5, BROOKS farewell 53.6 (solo piano)
//   bar 17    54.4   ledger tension creep 55.6-57.35 — ends ON bar 18
//   bar 18    57.6   S5 STORM opens ON the downbeat; seasons wipe 58.0
//   bar 19-20 60.8   thunder gathers 61.3, roll call 62.2, empty cell 63.0, warden rage
//   bar 21    67.2   HIT-STOP 1 = PIN1, lands exactly on this downbeat; tunnel reveal 67.9
//   bar 22-23 70.4   tunnel dig (muffled) 69.15-72.05, crawl 72.35-74.8, creek emerge 75.65
//   bar 24    76.8   lightning 77.1, rip onset 77.9, PIN2 78.3 (beat 1.875), CASCADE 78.56
//   bar 25    80.0   S6 dawn, bugle slam 82.06, sirens 82.86
//   bar 26-27 83.2   parole 85.96, P1/P2 warmth, stamp 90.36 (bar 28 beat 0.45)
//   bar 28    89.6   APPROVED-FLOW stamp 90.36, beam bookend 91.86
//   bar 29    92.8   postcard 93.66, sandline 94.66, BEACH REVEAL 95.46
//   bar 30-31 96.0   the withheld +12 lands 97.06, reunion 98.86, fade 100.06, DRY button
//
// MOTIF PLAN (all original):
//   HOPE   [0,+4,+7,+9,+12] on root 53 (F): an unbroken RISING line — hope only climbs —
//          short-short-short-short-held. THE +12 (F4) IS WITHHELD: every airing stops at
//          +9 and the octave lands exactly once, at the beach reveal (EV_S6.beachReveal.f),
//          then returns as the dry final button. Airings: title (piano+strings, no +12),
//          S1 cell-night fragment [+0,+4] piano pp, S2 pluck fragments, S4 music-box
//          variation (bar-anchored, transposing +2 per poster swap as the growth chart
//          climbs), S5 tunnel detuned -20 cents (19 winters old), S6 beach COMPLETE.
//   REGIME [0,0,+3,0,-2] on root 38 (D): low ostinato D-D-F-D-C, taiko-adjacent — heavy
//          downbeats, short dark saw bass (cut <= 400). Statements: S1 shave room (I),
//          S1 warden speech (II, bar 5), S5 roll call (III, angry), rage accelerando into
//          HIT-STOP 1. DEVELOPMENT: in the tunnel the SAME ostinato rhythm returns GENTLE
//          (soft marimba plucks) — Andy dug to the regime's rhythm for 19 years and made
//          it his. Ledger creep (S4c) is the ostinato's sneaky pizzicato shadow.
//   CASCADE  HOPE run INVERTED: at the rip release the five motif notes pour DOWN
//          [12,9,7,4,0] as bells (nineteen years of held hope falling out), then re-rise
//          into the full F-major bloom. The only downward statement of the motif in the
//          film — the payoff is hope let go.
//   ARIA   original soprano duet over the locked punchup.md lyric (6 lines, O FLUSSO...),
//          F major, phrases at ariaStart.f + [0, 2.2, 3.9, 5.6, 7.0, 8.6]; climax = the
//          held F5 ("...mi TROVA") landing on EV_S3.ariaEnd.f; "CHE FLUSSO!" cadenza tops
//          at A5. Killed by the record scratch at EV_S3.burstIn.f.
//
// HIT-STOPS (both in S5, both from STOPS, no hand math):
//   PIN1 = filmT(STOP1_G) = 67.2 = bar 21.0: the rock's HOLLOW THUNK lands at the START
//   of the freeze (house rule); a high shimmer swell is HARD-CUT at REL1 = 67.4 (choke),
//   the poster peel (EV_S5.posterPeel.f = 67.5) sounds just after release, awe chord at
//   tunnelReveal. All rage cues are scheduled to finish by 67.15 — the freeze is clean.
//   PIN2 = filmT(STOP2_G) = 78.3: THE BIGGEST HIT — braam + impact + sub + tear + choir
//   bloom all AT the freeze start; the braam/choir sustain THROUGH the freeze (dur spans
//   REL2 = 78.56); the cascade bells start at REL2 exactly. Rain keeps running through
//   both freezes (effects age on real film t — the frame stays alive).
//
// BED DUCKING: the aria's sustained bed (strings/choir/bass pedal) rides ONE gain bus,
// ducked to 0.67 (-3.5 dB) from the first vocal phrase until the scratch; the cascade
// warm bed rides another bus ducked to 0.67 under the hair-rain shimmer. Impacts, braams
// and the soprano sit ABOVE the beds — tier discipline leaves the headroom.
//
// SFX PALETTE (score owns all audio): bus engine hum, rain layers, gate/lock clunks,
// clipper buzz (noise+square blend, pulsed on the four shave strokes, panned along the
// march), intake stamp thunk, cap-peel tick + sliver glint, needle drop + vinyl surface
// noise, record scratch + run-out groove ticks, dry-room slot clank + drip, page flips,
// ledger clock ticks, sack thud, thunder (distant + crack), muffled tunnel rain, comb
// dig scrapes, crawl swishes + pipe drips, creek splash, lightning crack, cap rip
// (fabric strain + noise burst + pitch drop), cascade shimmer, bugle call, newspaper
// slam, distant sirens, parole stamp thock, beam-carve scratches, crow caws (JAKE),
// gulls + wave swells.
//
// SCHEDULING DISCIPLINE: no kit instrument is ever called inside an at() callback (the
// event list is sorted once after score() returns) — composite voices build raw
// osc->gain->filter nodes inside ONE at() each. Every chain leaves through kit.out with
// an explicit envelope; exponential ramps always land positive (>= 0.0001). Determinism:
// kit.R only, no Math.random/Date.
//
// LOUDNESS STRATEGY (engine peak-normalises to -1 dBFS, two-pass -14 LUFS later at the
// director stage; our job is internal balance so loudnorm never pumps):
//   tier 1 beds (rain/wind/drones/vinyl bed/waves)   g 0.02-0.055
//   tier 2 ostinati (regime bass/plucks/ticks)       g 0.025-0.07
//   tier 3 leads (soprano/box/piano/bugle)           g 0.045-0.11
//   tier 4 pins (title, both hit-stops, stamp)       g 0.1-0.16, impact <= 0.5, sub <= 0.38
// Bass short and dark (cut <= 500) so it never masks choir/piano; choir <= 0.045 (its
// hard send is 0.9); taiko only where the Cabald speaks. The final button and the last
// wave are built ALL-DRY (send 0) so the shared 1.3 s IR never re-excites: last audio
// decays to zero ~100.9, short of the 101.0 last frame.
import {
  CAPS,
  DRAWN,
  DURATION,
  EV_S1,
  EV_S2,
  EV_S3,
  EV_S4,
  EV_S5,
  EV_S6,
  EV_TITLE,
  SHOTS,
  STOP1_G,
  STOP2_G,
  STOPS,
  filmT,
  clipperX,
} from './timeline.js'

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit

  // ---------- clock: pins (freeze starts) and rels (where picture resumes) ----------
  const PIN1 = filmT(STOP1_G)
  const REL1 = PIN1 + STOPS[0].d
  const PIN2 = filmT(STOP2_G)
  const REL2 = PIN2 + STOPS[1].d
  const shotT = (name) => SHOTS.find((s) => s.name === name).t0
  const capT = (id) => CAPS.find((c) => c.id === id).t0
  const BEAT = 0.8
  const BAR = 3.2
  const BTN = DURATION - 0.7 // the dry button: 0.7 s of nothing after the last note
  const SHIM_END = REL2 + 2.0 // cascade shimmer window ends
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x))

  // ---------- custom voices (each builds raw nodes inside ONE at()) ----------
  // bus engine: AM-buzzed detuned saw pair through a dark lowpass (raiders motor lineage)
  const busHum = (t0, t1, { g = 0.05, f = 55, buzz = 23 } = {}) =>
    at(t0, () => {
      const dur = t1 - t0
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 320
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 0.5)
      a.gain.setValueAtTime(g, t1 - 0.4)
      a.gain.linearRampToValueAtTime(0, t1)
      for (const det of [0, 8]) {
        const o = osc('sawtooth', f, t0, dur)
        o.detune.value = det
        o.connect(lp)
      }
      const am = osc('sine', buzz, t0, dur)
      const ag = ac.createGain()
      ag.gain.value = g * 0.4
      am.connect(ag).connect(a.gain)
      lp.connect(a)
      out(a, 1, 0.1, 0.15)
    })

  // cold detuned strings cluster (the S1 walls; slow bow, no vibrato, wide)
  const detStrings = (t0, t1, notes, cents = 24, g = 0.022, cut = 1500) =>
    at(t0, () => {
      const dur = t1 - t0
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + Math.min(1.2, dur / 3))
      a.gain.setValueAtTime(g, t1 - Math.min(1.0, dur / 3))
      a.gain.linearRampToValueAtTime(0, t1)
      for (const m of notes)
        for (const det of [-cents, cents]) {
          const lp = ac.createBiquadFilter()
          lp.type = 'lowpass'
          lp.frequency.value = cut
          const o = osc('sawtooth', hz(m), t0, dur)
          o.detune.value = det
          o.connect(lp).connect(a)
        }
      out(a, 1, 0.5, 0, 0.7)
    })

  // clipper buzz: filtered noise + square blend, envelope pulsed on each shave stroke
  const buzz = (t0, t1, strokes, pan, g = 0.075) =>
    at(t0, () => {
      const dur = t1 - t0
      const sq = osc('square', 92, t0, dur)
      const sqg = ac.createGain()
      sqg.gain.value = 0.5
      const bp2 = ac.createBiquadFilter()
      bp2.type = 'bandpass'
      bp2.frequency.value = 1700
      bp2.Q.value = 1.1
      sq.connect(sqg).connect(bp2)
      const n = noise(t0, dur)
      const hp = ac.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 3300
      const ng = ac.createGain()
      ng.gain.value = 0.45
      n.connect(hp).connect(ng).connect(bp2)
      const a = ac.createGain()
      a.gain.setValueAtTime(g * 0.45, t0)
      for (const st of strokes) {
        if (st <= t0 || st >= t1) continue
        a.gain.setValueAtTime(g * 0.45, st - 0.02)
        a.gain.linearRampToValueAtTime(g, st + 0.008)
        a.gain.exponentialRampToValueAtTime(g * 0.4, st + 0.14)
      }
      a.gain.setValueAtTime(g * 0.4, t1 - 0.05)
      a.gain.linearRampToValueAtTime(0, t1)
      bp2.connect(a)
      out(a, 1, 0.12, pan)
    })

  // music box: bright additive bell an octave up (kit.bell recipe, + optional detune)
  const boxNote = (t, m, d = 0.9, g = 0.042, cents = 0, dry = false) =>
    at(t, () => {
      const f = hz(m + 12) * Math.pow(2, cents / 1200)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.003)
      a.gain.exponentialRampToValueAtTime(0.001, t + d)
      for (const [mul, kg] of [[1, 1], [3.42, 0.22], [6.8, 0.06]]) {
        const o = osc('sine', f * mul, t, d)
        const og = ac.createGain()
        og.gain.value = kg
        o.connect(og).connect(a)
      }
      out(a, 1, dry ? 0 : 0.3, -0.12)
    })

  // deadpan muted bassoon blat (Cabald comedy)
  const blatD = (t, m, dur = 0.22, g = 0.075, pan = 0) =>
    at(t, () => {
      const o = osc('sawtooth', hz(m) * 0.99, t, dur)
      o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.05)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 520
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.02)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(lp).connect(a)
      out(a, 1, 0.14, pan)
    })

  // hollow domino shake: tremoloed bandpass shiver
  const shake = (t, dur = 0.3, g = 0.05) =>
    at(t, () => {
      const n = noise(t, dur)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 760
      bp.Q.value = 1.1
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.03)
      a.gain.linearRampToValueAtTime(0, t + dur)
      const am = osc('square', 15, t, dur)
      const ag = ac.createGain()
      ag.gain.value = g * 0.55
      am.connect(ag).connect(a.gain)
      n.connect(bp).connect(a)
      out(a, 1, 0.1, 0.2)
    })

  // the polite deadpan "hm" shrug (guard at the poster; warden at NONE ON FILE)
  function hmShrug(t) {
    at(t, () => {
      const o = osc('sine', 235, t, 0.14)
      o.frequency.exponentialRampToValueAtTime(207, t + 0.12)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 500
      bp.Q.value = 1.4
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(0.04, t + 0.02)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
      o.connect(bp).connect(a)
      out(a, 1, 0.05, 0.2)
    })
  }

  // crow caw: saw glide through a formant band, fluttered (JAKE)
  const caw = (t, pan = 0.25, g = 0.05) =>
    at(t, () => {
      const o = osc('sawtooth', 740, t, 0.24)
      o.frequency.exponentialRampToValueAtTime(520, t + 0.2)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1500
      bp.Q.value = 2
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.03)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.24)
      const am = osc('square', 28, t, 0.24)
      const ag = ac.createGain()
      ag.gain.value = g * 0.5
      am.connect(ag).connect(a.gain)
      o.connect(bp).connect(a)
      out(a, 1, 0.2, pan)
    })

  // THE SOPRANO (custom voice): detuned saw pair + brightness octave through three
  // vowel formant bandpasses, late-blooming vibrato, breath noise. This is the aria's
  // PA voice; kit.choir pads ('a'/'o'/'u') sit under it as the chorus.
  const soprano = (t, m, dur, { g = 0.1, vowel = 'a', send = 0.55, pan = 0, cents = 0 } = {}) =>
    at(t, () => {
      const f = hz(m) * Math.pow(2, cents / 1200)
      const sum = ac.createGain()
      sum.gain.value = 0.34
      const vib = osc('sine', 5.3, t, dur + 0.1)
      const vg = ac.createGain()
      vg.gain.setValueAtTime(2, t)
      vg.gain.linearRampToValueAtTime(16, t + Math.min(0.5, dur * 0.6))
      vib.connect(vg)
      for (const det of [-7, 6]) {
        const o = osc('sawtooth', f, t, dur + 0.08)
        o.detune.value = det
        vib.connect(o.detune)
        o.connect(sum)
      }
      const ot = osc('triangle', f * 2, t, dur + 0.08)
      const otg = ac.createGain()
      otg.gain.value = 0.12
      ot.connect(otg).connect(sum)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + Math.min(0.14, dur * 0.3))
      a.gain.setValueAtTime(g * 0.9, t + Math.max(0.2, dur - 0.16))
      a.gain.linearRampToValueAtTime(0, t + dur + 0.06)
      const FORM = vowel === 'a'
        ? [[760, 1, 6], [1400, 0.55, 8], [2850, 0.22, 9]]
        : vowel === 'o'
          ? [[480, 1, 6], [860, 0.5, 7], [2700, 0.1, 9]]
          : [[340, 1, 6], [700, 0.3, 7], [2500, 0.08, 9]]
      for (const [fq, k, q] of FORM) {
        const bp = ac.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = fq
        bp.Q.value = q
        const fg = ac.createGain()
        fg.gain.value = k * 2.4
        sum.connect(bp).connect(fg).connect(a)
      }
      const br = noise(t, dur + 0.05)
      const bb = ac.createBiquadFilter()
      bb.type = 'bandpass'
      bb.frequency.value = 3200
      bb.Q.value = 1.2
      const bg = ac.createGain()
      bg.gain.setValueAtTime(0, t)
      bg.gain.linearRampToValueAtTime(g * 0.22, t + 0.05)
      bg.gain.exponentialRampToValueAtTime(0.001, t + dur)
      br.connect(bb).connect(bg)
      out(a, 1, send, pan, 0.5)
      out(bg, 1, send * 0.5, pan + 0.1)
    })

  // vinyl: needle drop + surface noise bed (diegetic record; sparse seeded ticks + hiss)
  const vinyl = (t0, t1, g = 0.014) =>
    at(t0, () => {
      const n = noise(t0, t1 - t0)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 4200
      bp.Q.value = 0.6
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 0.15)
      a.gain.setValueAtTime(g, t1 - 0.1)
      a.gain.linearRampToValueAtTime(0, t1)
      n.connect(bp).connect(a)
      out(a, 1, 0.15, 0)
      for (let tt = t0 + 0.08; tt < t1 - 0.1; tt += 0.05 + kit.R() * 0.14) {
        const tk = noise(tt, 0.012)
        const hp = ac.createBiquadFilter()
        hp.type = 'highpass'
        hp.frequency.value = 5200
        const tg = ac.createGain()
        tg.gain.setValueAtTime(g * (0.4 + kit.R()), tt)
        tg.gain.exponentialRampToValueAtTime(0.001, tt + 0.012)
        tk.connect(hp).connect(tg)
        out(tg, 1, 0.05, (kit.R() - 0.5) * 0.6)
      }
    })

  // record scratch: noise sweep + tone pitch-drop (the aria dies here)
  const scratch = (t, g = 0.12) =>
    at(t, () => {
      const n = noise(t, 0.2)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(2600, t)
      bp.frequency.exponentialRampToValueAtTime(380, t + 0.2)
      bp.Q.value = 1.4
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
      n.connect(bp).connect(a)
      out(a, 1, 0.1, 0)
      const o = osc('square', 900, t, 0.24)
      o.frequency.exponentialRampToValueAtTime(70, t + 0.22)
      const og = ac.createGain()
      og.gain.setValueAtTime(g * 0.7, t)
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.24)
      o.connect(og)
      out(og, 1, 0.08, 0)
    })

  // run-out groove ticks, decelerating
  const runout = (t, g = 0.05) =>
    at(t, () => {
      let tt = t
      for (let i = 0; i < 5; i++) {
        const o = osc('sine', 210, tt, 0.05)
        o.frequency.exponentialRampToValueAtTime(150, tt + 0.04)
        const a = ac.createGain()
        a.gain.setValueAtTime(g * (1 - i * 0.13), tt)
        a.gain.exponentialRampToValueAtTime(0.001, tt + 0.05)
        o.connect(a)
        out(a, 1, 0.05, -0.1)
        tt += 0.09 + i * 0.06
      }
    })

  // dry felt piano (send 0) — the DRY ROOM and the final button
  const dryPiano = (t, m, d = 1.6, g = 0.09) =>
    at(t, () => {
      const f0 = hz(m)
      const a = ac.createGain()
      a.gain.value = 1
      for (let nn = 1; nn <= 6; nn++) {
        const f = f0 * nn * Math.sqrt(1 + 0.0004 * nn * nn)
        if (f > 10000) break
        const o = osc('sine', f, t, d)
        const pg = ac.createGain()
        pg.gain.setValueAtTime((g / Math.pow(nn, 1.3)) * (nn === 2 ? 1.4 : 1), t)
        pg.gain.exponentialRampToValueAtTime(0.001, t + d / (0.7 + nn * 0.55))
        o.connect(pg).connect(a)
      }
      out(a, 1, 0)
    })

  // beam carve: a scratch cluster of bandpassed ticks (BROOKS WAS BALD / SO WAS RED)
  const carve = (t0, n = 6, g = 0.04) =>
    at(t0, () => {
      const offs = [0, 0.13, 0.29, 0.42, 0.58, 0.74, 0.9, 1.04]
      for (let i = 0; i < n; i++) {
        const tt = t0 + offs[i % offs.length]
        const nz = noise(tt, 0.05)
        const bp = ac.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = 2300 + (i % 3) * 420
        bp.Q.value = 3
        const a = ac.createGain()
        a.gain.setValueAtTime(g * (0.7 + (i % 2) * 0.3), tt)
        a.gain.exponentialRampToValueAtTime(0.001, tt + 0.05)
        nz.connect(bp).connect(a)
        out(a, 1, 0.18, -0.15)
      }
    })

  // paper flip / page turn: short filtered wind burst
  const paperFlip = (t, g = 0.05) =>
    at(t, () => {
      const n = noise(t, 0.18)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(900, t)
      bp.frequency.exponentialRampToValueAtTime(1900, t + 0.15)
      bp.Q.value = 0.8
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.03)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      n.connect(bp).connect(a)
      out(a, 1, 0.12, 0.1)
    })

  // comb dig scrape / crawl swish: short filtered noise with forward motion
  const scrape = (t, f = 1100, dur = 0.24, g = 0.06, pan = 0) =>
    at(t, () => {
      const n = noise(t, dur)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(f * 0.7, t)
      bp.frequency.exponentialRampToValueAtTime(f * 1.4, t + dur)
      bp.Q.value = 1.2
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.04)
      a.gain.exponentialRampToValueAtTime(0.001, t + dur)
      n.connect(bp).connect(a)
      out(a, 1, 0.3, pan)
    })

  // pipe drip plip
  const drip = (t, g = 0.05, f = 950) =>
    at(t, () => {
      const o = osc('sine', f, t, 0.1)
      o.frequency.exponentialRampToValueAtTime(f * 0.34, t + 0.08)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      o.connect(a)
      out(a, 1, 0.4, 0.15)
    })

  // creek splash: noise burst + three droplets
  const splash = (t, g = 0.14) =>
    at(t, () => {
      const n = noise(t, 0.5)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(2200, t)
      bp.frequency.exponentialRampToValueAtTime(500, t + 0.45)
      bp.Q.value = 0.7
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      n.connect(bp).connect(a)
      out(a, 1, 0.35, 0)
      for (const [dt, f] of [[0.16, 1400], [0.3, 1100], [0.44, 900]]) {
        const o = osc('sine', f, t + dt, 0.08)
        o.frequency.exponentialRampToValueAtTime(f * 0.5, t + dt + 0.06)
        const og = ac.createGain()
        og.gain.setValueAtTime(g * 0.25, t + dt)
        og.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.08)
        o.connect(og)
        out(og, 1, 0.3, 0.1)
      }
    })

  // lightning crack: sharp highpassed snap + mid thump (thunder body via kit.thunder)
  const crack = (t, g = 0.16) =>
    at(t, () => {
      const n = noise(t, 0.09)
      const hp = ac.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 2800
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
      n.connect(hp).connect(a)
      out(a, 1, 0.3, 0.1)
      const o = osc('sine', 130, t + 0.01, 0.3)
      o.frequency.exponentialRampToValueAtTime(55, t + 0.28)
      const og = ac.createGain()
      og.gain.setValueAtTime(g * 0.8, t + 0.01)
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      o.connect(og)
      out(og, 1, 0.2, 0)
    })

  // cap rip: fabric strain (rise) + the tear itself (noise burst + pitch drop)
  const ripStrain = (t0, t1, g = 0.06) =>
    at(t0, () => {
      const n = noise(t0, t1 - t0)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(320, t0)
      bp.frequency.exponentialRampToValueAtTime(950, t1)
      bp.Q.value = 2.2
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t1)
      n.connect(bp).connect(a)
      out(a, 1, 0.15, -0.1)
    })
  const ripTear = (t, g = 0.16) =>
    at(t, () => {
      const n = noise(t, 0.32)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(1400, t)
      bp.frequency.exponentialRampToValueAtTime(420, t + 0.28)
      bp.Q.value = 0.7
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.32)
      n.connect(bp).connect(a)
      out(a, 1, 0.2, -0.15)
      const o = osc('sawtooth', 400, t, 0.26)
      o.frequency.exponentialRampToValueAtTime(90, t + 0.24)
      const og = ac.createGain()
      og.gain.setValueAtTime(g * 0.5, t)
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.26)
      o.connect(og)
      out(og, 1, 0.12, 0.1)
    })

  // hollow thunk: the rock through the poster — low drop + resonant knock
  const hollowThunk = (t, g = 0.16) =>
    at(t, () => {
      const o = osc('sine', 190, t, 0.16)
      o.frequency.exponentialRampToValueAtTime(80, t + 0.13)
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
      o.connect(a)
      out(a, 1, 0.1, 0)
      const n = noise(t, 0.1)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 340
      bp.Q.value = 3.2
      const ng = ac.createGain()
      ng.gain.setValueAtTime(g * 0.7, t)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      n.connect(bp).connect(ng)
      out(ng, 1, 0.25, 0)
    })

  // shimmer swell HARD-CUT at tCut (raiders cymbalChoke lineage, glassy)
  const shimmerChoke = (t, tCut, g = 0.13) =>
    at(t, () => {
      const n = noise(t, tCut - t + 0.02)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 6200
      bp.Q.value = 0.8
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + (tCut - t) * 0.7)
      a.gain.linearRampToValueAtTime(0.0001, tCut)
      a.gain.linearRampToValueAtTime(0, tCut + 0.01)
      n.connect(bp).connect(a)
      out(a, 1, 0.35, 0, 0.6)
    })

  // bugle note: bandpassed saw, tiny vibrato (the wake-up call is a triadic original)
  const bugleN = (t, m, d, g = 0.09) =>
    at(t, () => {
      const f = hz(m)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = Math.min(2200, f * 2.4)
      bp.Q.value = 1.6
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t)
      a.gain.linearRampToValueAtTime(g, t + 0.03)
      a.gain.setValueAtTime(g, t + Math.max(0.06, d - 0.1))
      a.gain.linearRampToValueAtTime(0, t + d)
      const o = osc('sawtooth', f, t, d + 0.05)
      const o2 = osc('square', f, t, d + 0.05)
      const o2g = ac.createGain()
      o2g.gain.value = 0.25
      const vb = osc('sine', 5.6, t, d + 0.05)
      const vg = ac.createGain()
      vg.gain.value = 7
      vb.connect(vg)
      vg.connect(o.detune)
      vg.connect(o2.detune)
      o.connect(bp)
      o2.connect(o2g).connect(bp)
      bp.connect(a)
      out(a, 1, 0.45, 0.1)
    })

  // distant siren: slow alternating glide, faded to nothing
  const siren = (t0, t1, g = 0.02) =>
    at(t0, () => {
      const o = osc('sine', 700, t0, t1 - t0)
      o.frequency.setValueAtTime(700, t0)
      o.frequency.linearRampToValueAtTime(950, t0 + 0.5)
      o.frequency.linearRampToValueAtTime(700, t0 + 1.0)
      o.frequency.linearRampToValueAtTime(950, t0 + 1.5)
      o.frequency.linearRampToValueAtTime(700, t0 + 2.0)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1200
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + 0.4)
      a.gain.linearRampToValueAtTime(0, t1)
      o.connect(lp).connect(a)
      out(a, 1, 0.6, -0.5)
    })

  // beach wave: one lowpassed noise swell, up then receding
  const wave = (t0, dur = 2.4, g = 0.05, dry = false) =>
    at(t0, () => {
      const n = noise(t0, dur)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(420, t0)
      lp.frequency.linearRampToValueAtTime(760, t0 + dur * 0.45)
      lp.frequency.linearRampToValueAtTime(380, t0 + dur)
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + dur * 0.45)
      a.gain.linearRampToValueAtTime(0, t0 + dur)
      n.connect(lp).connect(a)
      out(a, 1, dry ? 0 : 0.08, -0.2, 0.5)
    })

  // gull: two whines gliding down, panned off the water
  const gull = (t, pan = 0.4, g = 0.035) =>
    at(t, () => {
      for (const [dt, f0, f1] of [[0, 1250, 880], [0.3, 1180, 840]]) {
        const o = osc('sine', f0, t + dt, 0.3)
        o.frequency.exponentialRampToValueAtTime(f1, t + dt + 0.26)
        const a = ac.createGain()
        a.gain.setValueAtTime(0, t + dt)
        a.gain.linearRampToValueAtTime(g, t + dt + 0.05)
        a.gain.linearRampToValueAtTime(0, t + dt + 0.3)
        o.connect(a)
        out(a, 1, 0.25, pan)
      }
    })

  // stamp thock: the APPROVED-FLOW slam (dry-ish)
  const stampThock = (t, g = 0.5) => {
    kit.kick(t, g)
    at(t, () => {
      const n = noise(t, 0.1)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 520
      const a = ac.createGain()
      a.gain.setValueAtTime(g * 0.5, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      n.connect(lp).connect(a)
      out(a, 1, 0.08, 0)
    })
    kit.tick(t + 0.05, 0.05, 2400)
  }

  // newspaper slam (bugle hits the rack)
  const paperSlam = (t, g = 0.16) =>
    at(t, () => {
      const n = noise(t, 0.16)
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(1800, t)
      bp.frequency.exponentialRampToValueAtTime(500, t + 0.14)
      bp.Q.value = 0.9
      const a = ac.createGain()
      a.gain.setValueAtTime(g, t)
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
      n.connect(bp).connect(a)
      out(a, 1, 0.15, -0.1)
    })

  // glint — kit.bell takes Hz
  const glint = (t, m, g = 0.045, d = 0.9) => kit.bell(t, hz(m), g, d, 3.5, 2)

  // sustained-bed voices (used INSIDE the bed-bus at() closures only)
  const busStringsPad = (bus, t0, notes, g, cut, atk, hold, rel) => {
    for (const m of notes)
      for (const det of [-7, 6]) {
        const lp = ac.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = cut
        const a = ac.createGain()
        a.gain.setValueAtTime(0, t0)
        a.gain.linearRampToValueAtTime(g, t0 + atk)
        a.gain.setValueAtTime(g, t0 + hold)
        a.gain.linearRampToValueAtTime(0, t0 + hold + rel)
        const o = osc('sawtooth', hz(m), t0, hold + rel)
        o.detune.value = det
        o.connect(lp).connect(a).connect(bus)
      }
  }
  const busChoirPad = (bus, t0, notes, g, vowel, atk, hold, rel) => {
    const FORM = vowel === 'a' ? [[800, 1], [1150, 0.5], [2900, 0.25]] : vowel === 'o' ? [[450, 1], [800, 0.4], [2830, 0.12]] : [[325, 1], [700, 0.2], [2530, 0.08]]
    for (const m of notes) {
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = Math.min(1400, hz(m) * 2.5)
      bp.Q.value = 0.7
      const a = ac.createGain()
      a.gain.setValueAtTime(0, t0)
      a.gain.linearRampToValueAtTime(g, t0 + atk)
      a.gain.setValueAtTime(g, t0 + hold)
      a.gain.linearRampToValueAtTime(0, t0 + hold + rel)
      for (const [type, kg] of [['sine', 1], ['triangle', 0.45]]) {
        const o = osc(type, hz(m), t0, hold + rel)
        const og = ac.createGain()
        og.gain.value = kg
        o.connect(og).connect(bp)
      }
      bp.connect(a).connect(bus)
    }
  }
  const busBassPedal = (bus, t0, m, g, dur) => {
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 440
    const a = ac.createGain()
    a.gain.setValueAtTime(0, t0)
    a.gain.linearRampToValueAtTime(g, t0 + 0.05)
    a.gain.setValueAtTime(g, t0 + dur - 0.15)
    a.gain.linearRampToValueAtTime(0, t0 + dur)
    for (const det of [0, 6]) {
      const o = osc('sawtooth', hz(m), t0, dur)
      o.detune.value = det
      o.connect(lp)
    }
    lp.connect(a).connect(bus)
  }

  // REGIME ostinato: D-D-F-D-C in short dark bass notes (schedule-time loop)
  const REGIME = [0, 0, 3, 0, -2]
  const regimeOst = (t0, t1, step, root = 38, g = 0.05, cut = 380) => {
    let k = 0
    for (let t = t0; t < t1 - 0.01; t += step, k++)
      kit.bass(t, root + REGIME[k % 5], step * 0.8, g, 'sawtooth', cut)
  }
  // REGIME taiko line, optional accelerando
  const regimeTaiko = (t0, t1, step0, step1, g = 0.32) => {
    let t = t0
    let k = 0
    while (t < t1 - 0.02) {
      const p = (t - t0) / Math.max(0.1, t1 - t0)
      kit.taiko(t, g * (k % 2 === 0 ? 1 : 0.7), 58 - Math.round(6 * p))
      t += step0 + (step1 - step0) * p
      k++
    }
  }
  // HOPE ladder (motif table): [0,+4,+7,+9,+12] on root 53. Airings below schedule the
  // notes directly so each statement can withhold the +12 (see MOTIF PLAN).
  const HOPE = [0, 4, 7, 9, 12]

  // ======================== A. S1 — ARRIVAL (f 0-17.6) ========================
  kit.rain(0.0, shotT('s1c'), 0.04) // rain over the hills, through the gates, into the room
  kit.drone(0.0, EV_S1.gates.f, [38, 45], 0.028, 280) // the walls hum, cold
  detStrings(0.3, 8.6, [50, 57], 26, 0.018, 1200) // detuned: nothing is right here
  busHum(0.2, EV_S1.gates.f + 0.2, { g: 0.05 }) // the bus idles in and dies
  kit.clunk(EV_S1.gates.f, 0.28) // the gates
  kit.taiko(EV_S1.gates.f, 0.24, 50) // distant, flat: the Cabald
  kit.bass(EV_S1.gates.f, 38, 0.35, 0.12, 'sawtooth', 320) // REGIME fragment
  kit.bass(EV_S1.gates.f + BEAT, 38, 0.35, 0.1, 'sawtooth', 320)
  kit.piano(EV_S1.lineup.f, 69, 1.4, 0.05) // the seed of hope, asked not stated
  kit.piano(EV_S1.lineup.f + BEAT / 2, 72, 1.6, 0.045)
  regimeOst(3 * BAR, 5 * BAR, BEAT / 2, 38, 0.045) // bar 3: SHAVE ROOM — REGIME statement I
  regimeTaiko(3 * BAR, shotT('s1d'), BEAT, BEAT, 0.3)
  // the buzz pans along the clipper march (clipperX is pure in g; f = g here); the two
  // segments split at the midpoint between strokes 2 and 3, ending at the loupe squint
  const buzzMid = (EV_S1.shaveStrokes[1].f + EV_S1.shaveStrokes[2].f) / 2
  const buzzEnd = EV_S1.loupeSquint.f - 0.4
  const buzzPanA = clamp((clipperX((EV_S1.shaveStrokes[0].g + EV_S1.shaveStrokes[1].g) / 2) - 960) / 960, -0.7, 0.7)
  const buzzPanB = clamp((clipperX((EV_S1.shaveStrokes[2].g + EV_S1.shaveStrokes[3].g) / 2) - 960) / 960, -0.7, 0.7)
  buzz(EV_S1.shaveMarch.f, buzzMid, [EV_S1.shaveStrokes[0].f, EV_S1.shaveStrokes[1].f], buzzPanA)
  buzz(buzzMid, buzzEnd, [EV_S1.shaveStrokes[2].f, EV_S1.shaveStrokes[3].f], buzzPanB)
  for (const st of EV_S1.shaveStrokes) kit.tick(st.f + 0.02, 0.05, 4200) // one tick per stroke
  kit.glass(EV_S1.snowPeak.f, 0.1, 1.6) // hair-snow peak
  kit.tick(EV_S1.loupeSquint.f, 0.045, 5200) // the loupe squint
  kit.kick(EV_S1.stampThunk.f, 0.4) // HAIR: N/A thunked on the file
  stampThock(EV_S1.stampThunk.f, 0.35)
  kit.clunk(EV_S1.wardenEnter.f, 0.3) // the warden
  kit.braam(EV_S1.wardenEnter.f, [38], 0.7, 0.08, 0.5)
  kit.bass(5 * BAR, 26, 0.8, 0.16, 'sawtooth', 300) // bar 5: REGIME statement II under the speech
  kit.taiko(5 * BAR, 0.42, 45)
  kit.taiko(5 * BAR + BEAT, 0.36, 45)
  detStrings(5 * BAR, 4 * BAR + 4 * BEAT, [38, 44], 30, 0.02, 700)
  // cell night: the secret, one quiet box fragment (no +5th yet — the seed only)
  boxNote(4 * BAR + 4 * BEAT - 0.6, 53, 0.7, 0.03) // 16.6
  boxNote(4 * BAR + 4 * BEAT - 0.2, 57, 0.7, 0.028)
  kit.tick(EV_S1.capPeel.f, 0.05, 3000) // the bald-cap edge lifts
  glint(EV_S1.capPeel.f + 0.1, 77, 0.035, 0.8) // one crimson sliver, F5
  kit.blip(EV_S1.capPeel.f + 0.4, 2600, 0.02, 0.06, 'sine') // the rat winks (g 17.45)

  // ======================== B. TITLE — HOPE stated, +12 withheld (f 17.6-20.8) ========================
  const T1 = CAPS.find((c) => c.id === 'T1')
  kit.piano(T1.t0, 53, 0.5, 0.09) // root with the card...
  kit.piano(EV_TITLE.titleIn.f, 57, 0.42, 0.085) // ...rising with the type-on
  kit.piano(EV_TITLE.titleIn.f + 0.4, 60, 0.42, 0.085)
  kit.piano(EV_TITLE.titleIn.f + 0.8, 62, 2.2, 0.09) // ...and STOPS at +9. No F4. Not yet.
  kit.strings(EV_TITLE.titleSet.f, [53, 57, 60, 62], 1.8, 0.036, 0.5)
  kit.choir(EV_TITLE.titleSet.f, [57, 60, 62], 1.7, 0.026, 'a')
  kit.bass(T1.t0, 41, 1.6, 0.13, 'triangle', 380)
  kit.glass(EV_TITLE.kicker.f, 0.07, 1.2)
  kit.crash(EV_TITLE.titleSet.f, 0.05)
  kit.pluck(shotT('s2a') - 0.3, 60, 0.055, 2000) // hand-off pluck into the yard
  kit.pluck(shotT('s2a') - 0.15, 62, 0.05, 2000)

  // ======================== C. S2 — THE YARD & THE COMB (f 20.8-32.4) ========================
  kit.pad(EV_S2.yardIn.f, [53, 57, 60], 4.8, 0.042, 1600, 0.5) // warmth
  detStrings(EV_S2.yardIn.f + 0.2, EV_S2.dealOpen.f - 0.2, [53, 60], 10, 0.016, 1800) // gentle, almost in tune
  const YARDP = [53, 57, 60, 57]
  for (let k = 0; EV_S2.yardIn.f + 0.1 + k * BEAT < EV_S2.dealOpen.f - 0.3; k++)
    kit.pluck(EV_S2.yardIn.f + 0.1 + k * BEAT, YARDP[k % 4], 0.048, 1900, 0.2) // pizzicato warmth
  kit.pluck(EV_S2.firstTrade.f, 60, 0.06, 2200) // the first trade
  kit.pluck(EV_S2.firstTrade.f + 0.14, 62, 0.055, 2200) // ...and its answer
  kit.clunk(EV_S2.dealOpen.f, 0.14)
  blatD(EV_S2.dealOpen.f, 43, 0.2, 0.06) // the deal opens, deadpan
  glint(EV_S2.combReveal.f, 89, 0.05, 0.6) // the tiny comb, held to one eye
  kit.blip(EV_S2.combReveal.f + 0.05, hz(93), 0.03, 0.09, 'sine') // micro up-zip
  kit.clunk(EV_S2.combScale.f, 0.18) // the domino reads BIGGER
  blatD(EV_S2.combScale.f + 0.08, 41, 0.26, 0.07) // ...comedy pause
  shake(EV_S2.combHandover.f + 0.3, 0.3, 0.045) // the hollow domino shakes: nothing inside
  kit.pluck(EV_S2.combHandover.f, 57, 0.06, 2100) // give...
  kit.pluck(EV_S2.combHandover.f + 0.16, 60, 0.06, 2100) // ...and take
  kit.swell(EV_S2.posterUp.f, EV_S2.posterUp.f + 0.7, 0.045) // RITA goes up
  kit.choir(EV_S2.posterUp.f + 0.3, [53, 57, 60], 1.9, 0.024, 'o') // crimson promise, warm
  glint(EV_S2.posterUp.f + 0.5, 77, 0.035, 1.1)
  kit.strings(EV_S2.posterUp.f + 0.4, [53, 57, 60, 62], 2.1, 0.028, 0.7)
  blatD(EV_S2.guardShrug.f, 45, 0.18, 0.06) // the shrug
  hmShrug(EV_S2.guardShrug.f + 0.1)

  // ======================== D. S3 — THE ARIA (f 32.4-48.9) ========================
  kit.clunk(EV_S3.officeIn.f, 0.3) // the door locks
  detStrings(EV_S3.officeIn.f - 0.2, EV_S3.needleDrop.f, [50, 51], 30, 0.018, 900) // semitone creep
  kit.kick(EV_S3.needleDrop.f, 0.3) // the needle drops
  kit.tick(EV_S3.needleDrop.f + 0.02, 0.06, 3400)
  vinyl(EV_S3.needleDrop.f + 0.1, EV_S3.needleSkitter.f - 0.05, 0.013) // surface noise, runs to the skitter
  kit.pluck(EV_S3.ariaStart.f, 53, 0.055, 2200) // harp-ish arpeggio intro
  kit.pluck(EV_S3.ariaStart.f + 0.09, 57, 0.05, 2200)
  kit.pluck(EV_S3.ariaStart.f + 0.18, 60, 0.05, 2200)
  kit.pluck(EV_S3.ariaStart.f + 0.27, 65, 0.05, 2200)
  kit.pluck(EV_S3.ariaStart.f + 0.36, 69, 0.05, 2200)
  kit.pluck(EV_S3.ariaStart.f + 0.45, 72, 0.07, 2200)
  // PHRASES (punchup.md lyric, one phrase per line; offsets from ariaStart.f):
  const A0 = EV_S3.ariaStart.f
  const PH = [0, 2.2, 3.9, 5.6, 7.0, 8.6].map((o) => A0 + o)
  // the aria bed bus: sustained strings/choir/bass, ducked -3.5 dB under the vocal
  at(A0, () => {
    const bus = ac.createGain()
    bus.gain.setValueAtTime(1, A0)
    bus.gain.linearRampToValueAtTime(0.67, A0 + 0.3) // duck under the duet
    bus.gain.setValueAtTime(0.67, PH[4] - 0.1)
    bus.gain.linearRampToValueAtTime(0.6, PH[4] + 0.4) // deeper at the climax phrase
    bus.gain.setValueAtTime(0.6, PH[5] + 0.8)
    bus.gain.linearRampToValueAtTime(1, PH[5] + 2.2) // release before the burst
    busStringsPad(bus, A0 + 0.2, [53, 57, 60], 0.0085, 2200, 0.9, 10.0, 0.6) // stops clean before the burst
    busChoirPad(bus, EV_S3.yardStop.f, [53, 60, 65], 0.012, 'a', 1.2, 6.6, 1.6) // the yard hums along
    busBassPedal(bus, A0, 41, 0.12, 11.0)
    out(bus, 1, 0.55, 0) // one shared PA-wet room send
  })
  // 1. O FLUSSO, O FLUSSO SANTISSIMO
  soprano(PH[0], 69, 0.5, { g: 0.095 })
  soprano(PH[0] + 0.5, 72, 0.5, { g: 0.095 })
  soprano(PH[0] + 1.0, 74, 0.7, { g: 0.1 })
  soprano(PH[0] + 1.7, 72, 0.25, { g: 0.085 })
  soprano(PH[0] + 1.95, 69, 0.45, { g: 0.085 })
  // 2. VOLA SOPRA IL MURO GRIGIO (the duet opens: mezzo a third below, 'o')
  soprano(PH[1], 72, 0.35, { g: 0.1 })
  soprano(PH[1] + 0.35, 74, 0.35, { g: 0.1 })
  soprano(PH[1] + 0.7, 77, 0.55, { g: 0.105 })
  soprano(PH[1] + 1.25, 74, 0.45, { g: 0.095 })
  soprano(PH[1], 69, 0.35, { g: 0.075, vowel: 'o', pan: 0.15 })
  soprano(PH[1] + 0.35, 70, 0.35, { g: 0.075, vowel: 'o', pan: 0.15 })
  soprano(PH[1] + 0.7, 74, 0.55, { g: 0.08, vowel: 'o', pan: 0.15 })
  // 3. IO TI COLTIVAI NEL BUIO (inward, descending)
  soprano(PH[2], 74, 0.35, { g: 0.1 })
  soprano(PH[2] + 0.35, 72, 0.35, { g: 0.1 })
  soprano(PH[2] + 0.7, 70, 0.55, { g: 0.1 })
  soprano(PH[2] + 1.25, 69, 0.45, { g: 0.095 })
  soprano(PH[2], 70, 0.35, { g: 0.07, vowel: 'o', pan: 0.15 })
  soprano(PH[2] + 0.7, 67, 0.55, { g: 0.07, vowel: 'o', pan: 0.15 })
  // 4. DICIANNOVE INVERNI, UN GRANELLO (the climb)
  soprano(PH[3], 69, 0.3, { g: 0.1 })
  soprano(PH[3] + 0.3, 70, 0.3, { g: 0.1 })
  soprano(PH[3] + 0.6, 72, 0.35, { g: 0.105 })
  soprano(PH[3] + 0.95, 74, 0.45, { g: 0.105 })
  // 5. E IL VENTO FIN MI TROVA (climax: held F5 lands on ariaEnd.f = PH[4] + 0.6)
  soprano(PH[4], 72, 0.3, { g: 0.105 })
  soprano(PH[4] + 0.3, 74, 0.3, { g: 0.105 })
  soprano(PH[4] + 0.6, 77, 1.5, { g: 0.11 })
  soprano(PH[4] + 0.6, 74, 1.2, { g: 0.08, vowel: 'o', pan: 0.15 })
  kit.strings(PH[4], [53, 57, 60, 62, 65], 2.6, 0.042, 0.4) // full orchestra lift
  kit.choir(PH[4] + 0.1, [60, 65, 69], 2.4, 0.04, 'a')
  kit.crash(PH[4] + 0.6, 0.09)
  kit.bass(PH[4] + 0.6, 41, 1.4, 0.15, 'sawtooth', 400)
  kit.glass(PH[4] + 0.6, 0.1, 1.5)
  // 6. CHE FLUSSO! CHE FLUSSO! (cadenza, tops at A5)
  soprano(PH[5], 79, 0.3, { g: 0.1 })
  soprano(PH[5] + 0.3, 77, 0.3, { g: 0.1 })
  soprano(PH[5] + 0.7, 81, 0.45, { g: 0.11 })
  soprano(PH[5] + 1.15, 79, 0.6, { g: 0.1 })
  soprano(PH[5], 74, 0.3, { g: 0.075, vowel: 'o', pan: 0.15 })
  soprano(PH[5] + 0.7, 77, 0.45, { g: 0.075, vowel: 'o', pan: 0.15 })
  kit.strings(PH[5] - 0.1, [53, 60, 65], 1.6, 0.032, 0.5) // coda bed to the scratch
  kit.flutter(EV_S3.sprinklerPass.f, EV_S3.sprinklerPass.f + 0.9, 0.02) // mist off the speaker
  kit.blip(EV_S3.sprinklerPass.f + 0.2, hz(88), 0.018, 0.06, 'sine')
  kit.blip(EV_S3.sprinklerPass.f + 0.5, hz(91), 0.016, 0.06, 'sine')
  kit.pluck(EV_S3.leanBack.f, 62, 0.05, 2000) // feet on the desk
  kit.pluck(EV_S3.yardHoldRelease.f, 57, 0.05, 2000) // the pigeon returns on the next phrase
  // the burst: tension 16ths, then the scratch kills the record
  for (let t = EV_S3.burstRun.f; t < EV_S3.burstIn.f - 0.05; t += 0.19)
    kit.tick(t, 0.04 + (t % 0.4 < 0.2 ? 0.02 : 0), 1800)
  kit.bass(EV_S3.burstRun.f, 38, 0.2, 0.07, 'sawtooth', 340)
  kit.bass(EV_S3.burstRun.f + 0.57, 38, 0.2, 0.07, 'sawtooth', 340)
  kit.bass(EV_S3.burstRun.f + 1.14, 36, 0.2, 0.07, 'sawtooth', 340)
  kit.kick(EV_S3.burstIn.f, 0.5) // the door BURSTS
  scratch(EV_S3.burstIn.f, 0.13)
  runout(EV_S3.needleSkitter.f, 0.05) // the run-out groove
  // THE DRY ROOM: solitary, no conditioner, everything dead dry
  kit.sub(EV_S3.dryRoom.f, 0.28, 60, 30, 1.2)
  at(EV_S3.dryRoom.f + 0.05, () => {
    const n = noise(EV_S3.dryRoom.f + 0.05, 0.3)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 260
    const a = ac.createGain()
    a.gain.setValueAtTime(0.09, EV_S3.dryRoom.f + 0.05)
    a.gain.exponentialRampToValueAtTime(0.001, EV_S3.dryRoom.f + 0.35)
    n.connect(lp).connect(a)
    out(a, 1, 0) // dry: the reverb dies with the music
  })
  kit.clunk(EV_S3.dryRoom.f + 0.35, 0.16) // the welded conditioner slot
  drip(EV_S3.dryRoom.f + 1.2, 0.04, 800) // one drip, very far away
  dryPiano(EV_S3.dryRoom.f + 2.1, 53, 1.8, 0.06) // "worth it." — one dry F

  // ======================== E. S4 — YEARS PASS (f 48.9-57.6) ========================
  boxNote(EV_S4.broomCloset.f, 53, 0.8, 0.04) // the music box takes over the motif
  boxNote(EV_S4.broomCloset.f + BEAT, 57, 0.8, 0.038)
  boxNote(EV_S4.broomCloset.f + 2 * BEAT, 60, 0.8, 0.038)
  boxNote(EV_S4.broomCloset.f + 3 * BEAT, 62, 1.6, 0.04) // +9 again — still no octave
  kit.strings(EV_S4.broomCloset.f + 0.3, [53, 60], 3.4, 0.024, 1.0)
  caw(EV_S4.broomCloset.f + 1.4, 0.3, 0.045) // JAKE in the fan draft
  caw(EV_S4.broomCloset.f + 2.0, 0.35, 0.035)
  // BROOKS WAS BALD carved into the beam (DRAWN B1)
  carve(DRAWN.find((d) => d.id === 'B1').f0, 7, 0.035)
  // BROOKS farewell: solo piano, restrained, gentle not grim
  const BF = EV_S4.brooksFarewell.f
  kit.piano(BF, 62, 0.9, 0.085)
  kit.piano(BF + 0.9, 65, 0.9, 0.08)
  kit.piano(BF + 1.8, 69, 1.4, 0.085)
  kit.piano(BF + 3.3, 67, 0.8, 0.07)
  kit.piano(BF + 4.1, 65, 0.9, 0.07)
  kit.piano(BF + 5.0, 62, 1.8, 0.075)
  kit.strings(BF + 3.2, [50, 57], 2.6, 0.02, 1.0) // one soft swell under the last notes
  caw(EV_S4.ledgerIn.f - 0.15, -0.25, 0.03) // the crow perches
  // ledger tension creep: the REGIME ostinato's sneaky pizzicato shadow
  kit.tick(EV_S4.ledgerIn.f, 0.02, 2600)
  regimeOst(EV_S4.ledgerIn.f + 0.1, EV_S4.pocketSack.f + 0.3, BEAT / 2, 38, 0.035, 420)
  detStrings(EV_S4.ledgerIn.f, EV_S4.pocketSack.f + 0.2, [38, 44], 22, 0.014, 700)
  paperFlip(EV_S4.pageTurns[0].f, 0.05) // page turns
  paperFlip(EV_S4.pageTurns[1].f, 0.045)
  kit.tick(EV_S4.noneOnFile.f, 0.05, 3200) // NO. 42, SHED: NONE ON FILE — the room stops
  hmShrug(EV_S4.noneOnFile.f + 0.08)
  kit.kick(EV_S4.pocketSack.f, 0.2) // the warden pockets the sack anyway
  at(EV_S4.pocketSack.f + 0.02, () => {
    const n = noise(EV_S4.pocketSack.f + 0.02, 0.22)
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1100
    bp.Q.value = 0.9
    const a = ac.createGain()
    a.gain.setValueAtTime(0.04, EV_S4.pocketSack.f + 0.02)
    a.gain.exponentialRampToValueAtTime(0.001, EV_S4.pocketSack.f + 0.24)
    n.connect(bp).connect(a)
    out(a, 1, 0.1, 0.2)
  })
  kit.riser(shotT('s5a') - 0.6, shotT('s5a'), 0.06) // into the storm

  // ======================== F. S5 — THE STORM ESCAPE (f 57.6-80.96) ========================
  // bar 18 downbeat: the seasons wipe — the music box climbs as the chart climbs
  kit.wind(EV_S5.seasonsWipe.f, EV_S5.thunderGather.f, 0.03, 200, 600)
  const SEASONS = [53, 55, 57]
  for (let bar = 0; bar < 3; bar++) {
    const t0 = 18 * BAR + bar * BAR
    for (let b = 0; b < 4; b++)
      boxNote(t0 + b * BEAT, SEASONS[bar] + HOPE[b], 0.85, 0.036 - bar * 0.004)
  }
  kit.thunder(EV_S5.thunderGather.f, 0.24, 5.0) // distant, gathering
  kit.wind(EV_S5.thunderGather.f, EV_S5.rockThrow.f, 0.04, 180, 700)
  // REGIME statement III: roll call, angry
  kit.taiko(EV_S5.rollCall.f, 0.4, 52)
  kit.braam(EV_S5.rollCall.f, [38, 41, 44], 0.9, 0.09, 0.55)
  regimeOst(EV_S5.rollCall.f, EV_S5.emptyCell.f, BEAT / 2, 38, 0.055)
  // empty cell: GRAND PAUSE — one heartbeat, nothing else
  kit.heartbeat(EV_S5.emptyCell.f, 0.4)
  kit.heartbeat(EV_S5.emptyCell.f + 0.5, 0.34)
  kit.taiko(EV_S5.emptyCell.f + 0.1, 0.2, 46) // the last echo dies
  // warden rage: accelerando into the throw
  regimeTaiko(EV_S5.emptyCell.f + 0.8, EV_S5.rockThrow.f, 0.55, 0.24, 0.34)
  regimeOst(EV_S5.emptyCell.f + 0.8, EV_S5.rockThrow.f - 0.1, 0.2, 38, 0.05)
  kit.riser(PIN1 - 0.8, PIN1, 0.1) // ends exactly at the freeze
  kit.tick(EV_S5.rockOnset.f, 0.05, 2200) // fingers close on the rock
  kit.whoosh(EV_S5.rockThrow.f, 0.12, 0.14, 500, 2800) // the hurl
  // ======== HIT-STOP 1: PIN1 = bar 21 downbeat. The hollow thunk IS the downbeat. ========
  hollowThunk(PIN1, 0.16)
  kit.impact(PIN1, 0.42, 52)
  kit.sub(PIN1, 0.34, 66, 26, 1.4)
  kit.braam(PIN1, [38], 1.0, 0.1, 0.6)
  shimmerChoke(66.5, REL1, 0.12) // the world holds its breath — cut at the release
  kit.tick(EV_S5.posterPeel.f, 0.04, 2800) // poster peels, just after release
  kit.clunk(EV_S5.posterPeel.f + 0.06, 0.1)
  kit.kick(REL1, 0.22) // the world un-freezes
  kit.choir(EV_S5.tunnelReveal.f, [53, 60, 65], 2.4, 0.03, 'u') // awe: the tunnel
  kit.strings(EV_S5.tunnelReveal.f + 0.1, [53, 60], 2.2, 0.024, 0.8)
  kit.glass(EV_S5.tunnelReveal.f + 0.05, 0.08, 1.4)
  // the tunnel: muffled, close, 19 winters old. The REGIME ostinato returns GENTLE —
  // Andy dug to its rhythm until it was his.
  at(EV_S5.tunnelIn.f, () => {
    const n = noise(EV_S5.tunnelIn.f, EV_S5.tunnelOut.f - EV_S5.tunnelIn.f)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 850
    const a = ac.createGain()
    a.gain.setValueAtTime(0, EV_S5.tunnelIn.f)
    a.gain.linearRampToValueAtTime(0.02, EV_S5.tunnelIn.f + 0.4)
    a.gain.linearRampToValueAtTime(0, EV_S5.tunnelOut.f) // muffled rain in the pipe walls
    n.connect(lp).connect(a)
    out(a, 1, 0.45, 0, 0.6)
  })
  const TUNEP = [38, 41, 36, 38]
  for (let k = 0; k < 4; k++)
    kit.pluck(EV_S5.tunnelIn.f + 0.15 + k * BEAT, TUNEP[k], 0.04, 1200, 0.24) // gentle regime plucks
  boxNote(EV_S5.tunnelIn.f + 0.35, 53, 0.8, 0.028, -20) // the box, 19 winters flat
  boxNote(EV_S5.tunnelIn.f + 1.15, 57, 0.8, 0.026, -20)
  boxNote(EV_S5.tunnelIn.f + 1.95, 60, 1.2, 0.028, -20)
  for (const e of EV_S5.digStrokes) scrape(e.f, 800, 0.3, 0.06, -0.2) // one dig per stroke
  kit.heartbeat(EV_S5.tunnelIn.f + 0.4, 0.22)
  kit.heartbeat(EV_S5.tunnelIn.f + 1.0, 0.18)
  kit.riser(EV_S5.tunnelOut.f - 0.4, EV_S5.crawlIn.f, 0.05)
  // the crawl: deeper, slower, water in the low spots
  const CRAWL0 = EV_S5.crawlIn.f + 0.2
  const CRAWL1 = EV_S5.crawlOut.f - 0.05
  for (let t = CRAWL0; t < CRAWL1; t += (CRAWL1 - CRAWL0) / 5) scrape(t, 620, 0.4, 0.05, t % 0.8 < 0.4 ? -0.3 : 0.3)
  drip(EV_S5.crawlIn.f + 0.5, 0.045, 900)
  drip(EV_S5.crawlIn.f + 1.3, 0.04, 1000)
  drip(EV_S5.crawlIn.f + 2.1, 0.035, 850)
  kit.heartbeat(EV_S5.crawlIn.f + 0.3, 0.2)
  kit.heartbeat(EV_S5.crawlIn.f + 1.1, 0.17)
  kit.heartbeat(EV_S5.crawlIn.f + 1.9, 0.15)
  kit.riser(74.3, EV_S5.creekEmerge.f, 0.09) // bursting out
  // the creek: rain FULL, splash, wind up
  splash(EV_S5.creekEmerge.f, 0.14)
  kit.rain(EV_S5.creekEmerge.f, PIN2 - 0.05, 0.055)
  kit.wind(EV_S5.creekEmerge.f, EV_S5.capRipOnset.f, 0.045, 300, 1400)
  kit.whoosh(EV_S5.creekEmerge.f + 0.05, 0.4, 0.1, 400, 2400) // arms up into the storm
  // lightning (FLASHES[0] = filmT(76.9))
  crack(EV_S5.lightningHit.f, 0.16)
  kit.thunder(EV_S5.lightningHit.f + 0.05, 0.42, 4.5)
  kit.glass(EV_S5.lightningHit.f + 0.02, 0.09, 1.6)
  // the rip begins: fabric strains, heartbeat, riser — then THE FREEZE
  ripStrain(EV_S5.capRipOnset.f, PIN2, 0.06)
  kit.heartbeat(EV_S5.capRipOnset.f + 0.15, 0.3)
  kit.heartbeat(EV_S5.capRipOnset.f + 0.42, 0.26)
  kit.riser(EV_S5.capRipOnset.f, PIN2, 0.09)
  // ======== HIT-STOP 2: PIN2. The single biggest hit of the film. ========
  ripTear(PIN2, 0.16) // the tear, at the exact start of the freeze
  kit.braam(PIN2, [26, 38], 2.4, 0.14, 0.9) // sustains THROUGH the freeze
  kit.impact(PIN2, 0.5, 50)
  kit.sub(PIN2, 0.38, 70, 24, 2.2)
  kit.choir(PIN2, [53, 57, 60, 65], 2.6, 0.045, 'a', 1.0, 1.4) // choir bloom rides the freeze out
  kit.crash(PIN2, 0.13)
  kit.glass(PIN2 + 0.03, 0.12, 1.8)
  kit.kick(REL2, 0.3) // release
  // THE CASCADE (REL2): hope pours down [12,9,7,4,0] as bells, then re-rises
  for (let i = 0; i < 5; i++) glint(REL2 + 0.02 + i * 0.09, 65 + HOPE[4 - i], 0.055 - i * 0.004, 0.8)
  for (let i = 0; i < 6; i++) glint(REL2 + 0.55 + i * 0.08, 65 + HOPE[i], 0.05, 0.9)
  // hair-rain shimmer texture: tiny seeded bell sprinkle over the opening-up strings
  at(REL2, () => {
    let tt = REL2 + 0.1
    while (tt < SHIM_END) {
      const m = 77 + Math.floor(kit.R() * 3) * 4
      const f = hz(m)
      const o = osc('sine', f * 2, tt, 0.5)
      const og = ac.createGain()
      og.gain.setValueAtTime(0.012 + kit.R() * 0.008, tt)
      og.gain.exponentialRampToValueAtTime(0.001, tt + 0.5)
      o.connect(og)
      out(og, 1, 0.5, (kit.R() - 0.5) * 1.2)
      tt += 0.07 + kit.R() * 0.12
    }
  })
  // warm bed bus under the shimmer, ducked -3.5 dB while the cascade sparkles
  at(PIN2, () => {
    const bus = ac.createGain()
    bus.gain.setValueAtTime(0, PIN2)
    bus.gain.linearRampToValueAtTime(1, REL2 + 0.15)
    bus.gain.linearRampToValueAtTime(0.67, REL2 + 0.5) // duck under the shimmer
    bus.gain.setValueAtTime(0.67, SHIM_END - 0.4)
    bus.gain.linearRampToValueAtTime(1, SHIM_END)
    bus.gain.setValueAtTime(1, SHIM_END + 0.8)
    bus.gain.linearRampToValueAtTime(0, SHIM_END + 1.8) // hand off to S6
    busStringsPad(bus, REL2, [53, 57, 60, 62], 0.01, 2400, 1.0, 3.2, 1.2)
    busChoirPad(bus, REL2 + 0.3, [60, 65, 69], 0.013, 'a', 1.1, 3.0, 1.4)
    busBassPedal(bus, REL2, 41, 0.13, 4.0)
    out(bus, 1, 0.55, 0)
  })
  kit.strings(EV_S5.cascadeSettle.f, [53, 60, 62, 65], 2.6, 0.03, 0.9) // music opens up
  kit.choir(EV_S5.cascadeSettle.f + 0.2, [53, 60, 65], 2.4, 0.028, 'o')
  kit.wind(EV_S5.cascadeSettle.f, shotT('s6a') + 0.2, 0.03, 400, 1600)
  glint(EV_S5.capRipRecoil.f, 72, 0.04, 1.0) // recoil snap into the bloom

  // ======================== G. S6 — MORNING & THE BEACH (f 80.96-101) ========================
  kit.blip(EV_S6.dawn.f, hz(81), 0.02, 0.07, 'sine') // a bird, first light
  kit.blip(EV_S6.dawn.f + 0.3, hz(76), 0.016, 0.06, 'sine')
  // the bugle wakes the yard (original triadic call) and the BUGLE slams the rack
  bugleN(EV_S6.bugleSlam.f - 0.55, 65, 0.18, 0.085)
  bugleN(EV_S6.bugleSlam.f - 0.35, 69, 0.18, 0.085)
  bugleN(EV_S6.bugleSlam.f - 0.15, 72, 0.55, 0.09)
  kit.kick(EV_S6.bugleSlam.f, 0.5) // FLOW DAILY BUGLE hits the rack
  paperSlam(EV_S6.bugleSlam.f + 0.02, 0.16)
  kit.clunk(EV_S6.bugleSlam.f, 0.2)
  siren(EV_S6.sirens.f, EV_S6.sirens.f + 2.2, 0.02) // distant, wrong end of the yard
  kit.blip(EV_S6.sirens.f + 0.15, hz(84), 0.02, 0.06, 'sine') // the pigeon reads the rack copy
  // parole: hushed, one note per question; P2 turns it warm
  kit.clunk(EV_S6.paroleDoor.f, 0.2)
  dryPiano(EV_S6.paroleDoor.f + 0.3, 69, 1.6, 0.045) // "Rehabilitated?"
  kit.heartbeat(CAPS.find((c) => c.id === 'P1').t1 - 1.0, 0.22)
  kit.piano(capT('P2'), 53, 0.5, 0.07) // RED's answer: hope returns
  kit.piano(capT('P2') + 0.4, 57, 0.5, 0.065)
  kit.piano(capT('P2') + 0.8, 60, 1.4, 0.07)
  kit.strings(capT('P2') + 0.9, [53, 60], 2.6, 0.022, 0.9)
  stampThock(EV_S6.stampSlam.f, 0.5) // APPROVED-FLOW (FLASHES[1] = filmT(89.9))
  kit.clunk(EV_S6.stampSlam.f, 0.3)
  kit.sub(EV_S6.stampSlam.f, 0.26, 68, 30, 1.0)
  kit.tick(EV_S6.inkSmudge.f, 0.04, 2100) // the comb-shaped ink smudge held to camera
  kit.braam(EV_S6.beamBookend.f, [26], 0.8, 0.07, 0.5) // the beam, one more time
  carve(DRAWN.find((d) => d.id === 'B2').f0, 5, 0.03) // SO WAS RED.
  dryPiano(EV_S6.beamBookend.f + 0.3, 53, 1.6, 0.05)
  // the postcard promises the beach: bell run up
  for (const [i, m] of [65, 69, 72, 77].entries()) glint(EV_S6.postcardIn.f + i * 0.11, m, 0.04, 0.9)
  // the sandline: waves begin, gulls wheel
  wave(EV_S6.sandlineWalk.f, 2.4, 0.045)
  wave(EV_S6.sandlineWalk.f + 2.4, 2.3, 0.05)
  wave(EV_S6.fadeStart.f - 0.8, 1.55, 0.04, true) // last wave runs out dry with the fade
  gull(EV_S6.sandlineWalk.f + 0.15, 0.45, 0.03)
  gull(EV_S6.windContact.f + 0.45, -0.4, 0.025)
  // ======== BEACH REVEAL: the COMPLETE hope motif. The +12, withheld for 77 seconds. ========
  const BR = EV_S6.beachReveal.f
  kit.piano(BR, 53, 0.45, 0.095)
  kit.piano(BR + 0.4, 57, 0.45, 0.09)
  kit.piano(BR + 0.8, 60, 0.45, 0.09)
  kit.piano(BR + 1.2, 62, 0.45, 0.095)
  kit.piano(BR + 1.6, 65, 2.4, 0.1) // F4 — the withheld note, finally sung
  kit.strings(BR + 1.5, [53, 57, 60, 62, 65], 3.4, 0.036, 0.7)
  kit.choir(BR + 1.6, [60, 65, 69], 3.0, 0.038, 'a')
  kit.bass(BR + 1.5, 41, 2.6, 0.14, 'triangle', 420)
  kit.glass(BR + 1.6, 0.1, 1.5)
  kit.wind(EV_S6.windContact.f, 99.4, 0.035, 800, 2200) // the mane catches the wind
  kit.bell(EV_S6.boatNamePass.f + 0.05, hz(79), 0.035, 1.2, 3.5, 2) // THE FLOW IS GOOD
  // reunion wide: the final bloom, then the fade
  kit.strings(EV_S6.reunionWide.f, [53, 57, 60, 62], 1.6, 0.028, 0.5)
  kit.choir(EV_S6.reunionWide.f + 0.1, [57, 60, 62], 1.5, 0.024, 'o')
  // DRY ENDING BUTTON: one last F, send 0, no tail — the film closes like a door
  dryPiano(BTN, 65, 1.4, 0.085) // the motif's last note, once more, dry
  dryPiano(BTN, 53, 1.3, 0.06)
  at(BTN, () => {
    const o = osc('sine', 55, BTN, 0.7)
    o.frequency.exponentialRampToValueAtTime(30, BTN + 0.65)
    const a = ac.createGain()
    a.gain.setValueAtTime(0.16, BTN)
    a.gain.exponentialRampToValueAtTime(0.001, BTN + 0.6)
    o.connect(a)
    out(a, 1, 0) // dry
  })
  void DURATION // the score spans exactly the timeline's film; asserted by the self-check
}

export const audio = { seed: 1994, reverb: 1.3, reverbGain: 0.25 }
