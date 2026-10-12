// THE LORD OF THE FLOW — a Remy Boys epic. Original epic-fantasy score, 80 BPM · bar = 3 s · 30 bars.
// 100 % original material (parody of the GENRE, not of any tune — no Shore/Holst melodic content).
//
// One timing truth: every cue is scheduled from timeline.js — SCORE_ABS (precomputed warped hits:
// crack 43.68, collapse 45.2, splash 65.84, grief 48.25, erupt 67.5 …), T (shot boundaries) for
// section windows, the per-shot EV tables for micro-cues, and BRIDGE_CLOCK/CRATER_CLOCK.abs() for
// the warped g-domain hits SCORE_ABS does not carry (struggle, dragGrip, swallowed). Nothing here
// re-types a number the timeline owns.
//
// THE FLOW THEME (original, D major, dignified; beats relative to its phrase start):
//   A (8 beats):  A3 – D4 – F#4 – E4 – D4 – G4 – F#4(held)   pickup rising a 4th, stepwise settle
//   B (3 beats):  D4 – F#4 – D4                              the answer home
//   · SHEAR 13.7: pastoral whistle over warm pad, day → night (glint 17.6 = eerie bell, the
//     melody suspends under it); the B answer hands off into the horn statement.
//   · FELLOWSHIP 21.3: horn-call variant (inverted contour, peaks on A4) + walking pulse.
//   · CRATER 61.8: the theme warped — slowed 1.3×, F#→F minor colour — cut off by the lunge.
//   · RESCUE 72.0: horn statement of A, major and warm, over "THE FLOW IS COMING".
//   · RETURN 76.5: full pastoral reprise (whistle + strings + choir) into the final cadence —
//     the melody's home D4 lands at 84.75 as the top of the final chord.
//   · END 84.0: final chord peaks ~87, decays to exactly 90.0 (envelope arithmetic: strings 0 at
//     89.6, pad/choir ramp to 0 at exactly 90.0, bell decayed 89.05, last air sine done 89.6).
//
// Hit-stop discipline (baldzilla rule): the pit is silent inside the freezes — the last pre-slam
// cue is a short-tail kick ending 43.42, the slam itself is one dry tick AT 43.5, and the staff
// CRACK fires at SCORE_ABS.crack (43.68) the instant the freeze releases. Same at the lunge
// (63.9 + 0.14). Percussion is absent inside both slow-mo windows (heartbeat + air sine instead).
// Custom voices (whistle, horn, anvil, sparks, thud, feet, snare, growl, tremLow, whisperTex,
// croak, drip, glint, eyeSwirl, wingbeat, airSine, crackNoise, rumble, rockChunks, warpBox) are
// all kit.at + kit.osc/noise/env/out. Deterministic: kit.R only (seeded). kit.thunder is avoided —
// its random walk can schedule a ramp past its own end ramp on short durations.
import {
  ASH_EV,
  ASSEMBLY_EV,
  B,
  BALROG_EV,
  BANNERS_EV,
  BAR,
  BRIDGE_CLOCK,
  BRIDGE_EV,
  CLIMB_EV,
  CRATER_CLOCK,
  CRATER_EV,
  EMBRACE_EV,
  ESCAPE_EV,
  EYE_EV,
  FORGE_EV,
  GOLBALD_EV,
  HAIRIFY_EV,
  HORDE_EV,
  LUNGE_EV,
  MELT_EV,
  MINES_ENTER_EV,
  MINES_HALL_EV,
  RESCUE_EV,
  RETURN_EV,
  RIDGE_EV,
  SCORE_ABS,
  SHEAR_DAY_EV,
  SHEAR_NIGHT_EV,
  T,
  TITLE_EV,
  TOWERS_EV,
  WRAITH_EV,
} from "./timeline.js";

export function score(kit) {
  const k = kit;
  const { ac, at, osc, noise, env, out, hz, R } = kit;
  const J = (a = 0.008) => (R() - 0.5) * 2 * a; // sparing humanize, seeded

  // ---------- grid helpers (no absolute-time guesswork) ----------
  const bt = (beats) => beats * B; // beat → seconds (BAR = bt(4) = 3 s)
  // melodies are [midi, startBeat, durBeats], played from a phrase-start time
  const playMelody = (notes, t0, voice, unit = B) =>
    notes.forEach(([m, b0, bD], i) => voice(t0 + b0 * unit, m, bD * unit, i));

  // ================= custom voices =================

  // WHISTLE: soft pastoral flute — 32 % pulse wave, rounded by a lowpass, breath noise on top
  const pulseWave = (() => {
    const n = 48;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let kk = 1; kk < n; kk++) {
      re[kk] = (2 / (kk * Math.PI)) * Math.sin(kk * Math.PI * 0.32) * Math.cos(kk * Math.PI * 0.32);
      im[kk] = (2 / (kk * Math.PI)) * Math.sin(kk * Math.PI * 0.32) * Math.sin(kk * Math.PI * 0.32);
    }
    return ac.createPeriodicWave(re, im);
  })();
  const whistle = (t, m, dur, g = 0.07) =>
    at(t, () => {
      const o = osc("square", hz(m), t, dur + 0.08);
      o.setPeriodicWave(pulseWave);
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2300;
      const a = ac.createGain();
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(g, t + 0.035);
      a.gain.setValueAtTime(g * 0.9, t + Math.max(0.05, dur - 0.06));
      a.gain.linearRampToValueAtTime(0, t + dur + 0.03);
      o.connect(lp).connect(a);
      out(a, 1, 0.3, -0.15);
      const n = noise(t, 0.07);
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = Math.min(9000, hz(m) * 2.5);
      bp.Q.value = 1.2;
      const ng = ac.createGain();
      env(ng.gain, t, 0.01, g * 0.1, 0.05);
      n.connect(bp).connect(ng);
      out(ng, 1, 0.25, -0.2);
    });

  // HORN: harmonic-series brass (partials 1–5), lip scoop, late vibrato — the fellowship voice
  const horn = (t, m, dur, g = 0.085) =>
    at(t, () => {
      const f = hz(m);
      const a = ac.createGain();
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(g, t + 0.08);
      a.gain.setValueAtTime(g, t + Math.max(0.1, dur - 0.12));
      a.gain.linearRampToValueAtTime(0, t + dur + 0.05);
      const vib = osc("sine", 4.6, t, dur + 0.1);
      const vg = ac.createGain();
      vg.gain.setValueAtTime(0, t);
      vg.gain.linearRampToValueAtTime(5, t + 0.45);
      vib.connect(vg);
      for (const [n, amp] of [
        [1, 1],
        [2, 0.5],
        [3, 0.3],
        [4, 0.18],
        [5, 0.1],
      ]) {
        const o = osc("sine", f * n * 0.988, t, dur + 0.08);
        o.frequency.linearRampToValueAtTime(f * n, t + 0.06);
        vg.connect(o.detune);
        const pg = ac.createGain();
        pg.gain.value = amp / 1.7;
        o.connect(pg).connect(a);
      }
      out(a, 1, 0.42, 0, 0.25);
    });

  // ANVIL: metallic clunk + high ring (the forging)
  const anvil = (t, g = 0.42, ring = true) =>
    at(t, () => {
      k.clunk(t, g);
      if (ring) k.bell(t + 0.01, 1832, g * 0.1, 0.5, 4.5, 7);
    });

  // SPARKS: forging spark scatter — one tick + an airy hiss puff
  const sparks = (t, g = 0.085) =>
    at(t, () => {
      k.tick(t + J(0.004), g * (0.6 + R() * 0.4), 2600 + R() * 1400);
      k.hiss(t + 0.02, 0.28, g * 0.5);
    });

  // THUD: heavy cloth/stone fall — soft body + low whoosh (falling banners)
  const thud = (t, g = 0.26, pan = 0) =>
    at(t, () => {
      k.kick(t, g);
      k.whoosh(t + 0.03, 0.35, g * 0.2, 260, 90);
    });

  // MARCH FEET: column step — dust thump + body, alternating pan (remember-the-flow pattern)
  const feet = (t, g = 0.05, pan = 0) =>
    at(t, () => {
      const n = noise(t, 0.09);
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      const a = ac.createGain();
      env(a.gain, t, 0.004, g, 0.075);
      n.connect(lp).connect(a);
      out(a, 1, 0.12, pan);
      const o = osc("triangle", 88, t, 0.1);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.09);
      const og = ac.createGain();
      env(og.gain, t, 0.003, g * 0.7, 0.08);
      o.connect(og);
      out(og, 1, 0.1, pan);
    });

  // MARCH SNARE: distant bandpassed burst
  const snare = (t, g = 0.08) =>
    at(t, () => {
      const n = noise(t, 0.22);
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1500;
      bp.Q.value = 0.7;
      const a = ac.createGain();
      env(a.gain, t, 0.002, g, 0.16);
      n.connect(bp).connect(a);
      out(a, 1, 0.55);
    });

  // GROWL: BALDROG — saw bending down under a dirt layer, wide
  const growl = (t, g = 0.26) =>
    at(t, () => {
      const o = osc("sawtooth", 66, t, 1.9);
      o.frequency.exponentialRampToValueAtTime(34, t + 1.9);
      const f = ac.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 240;
      f.Q.value = 1.2;
      o.connect(f);
      out(f, g, 0.5, 0, 0.75);
      const n = noise(t, 1.3);
      const nf = ac.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.value = 150;
      nf.Q.value = 0.8;
      n.connect(nf);
      out(nf, g * 0.3, 0.5, 0, 0.7);
    });

  // TREM LOW: bowed tremolo cluster — saws + lowpass behind a square-LFO gate
  const tremLow = (t0, t1, notes, g = 0.042) =>
    at(t0, () => {
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 640;
      const trem = ac.createGain();
      trem.gain.value = 0.55;
      const lfo = osc("square", 8.5, t0, t1 - t0);
      const lg = ac.createGain();
      lg.gain.value = 0.45;
      lfo.connect(lg).connect(trem.gain);
      const a = ac.createGain();
      env(a.gain, t0, 0.5, g, Math.max(0.2, t1 - t0 - 1.0), 0, 0.5);
      for (const m of notes) {
        const o = osc("sawtooth", hz(m), t0, t1 - t0 + 0.4);
        o.detune.value = (R() - 0.5) * 14;
        o.connect(lp);
      }
      lp.connect(trem).connect(a);
      out(a, 1, 0.5, 0, 0.6);
    });

  // WHISPER TEX: filtered-noise whisper bed (the ashlands, Golbald)
  const whisperTex = (t0, t1, g = 0.02) =>
    at(t0, () => {
      for (const [fq, q] of [
        [640, 3],
        [1180, 4],
      ]) {
        const n = noise(t0, t1 - t0);
        const f = ac.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = fq;
        f.Q.value = q;
        const a = ac.createGain();
        env(
          a.gain,
          t0,
          Math.min(1.2, (t1 - t0) / 3),
          g * (fq === 640 ? 1 : 0.7),
          Math.max(0.2, t1 - t0) * 0.55,
          0,
          Math.max(0.2, (t1 - t0) * 0.2),
        );
        n.connect(f).connect(a);
        out(a, 1, 0.5, (R() - 0.5) * 0.6);
      }
    });

  // CROAK: Golbald — a pair of detuned low blips bending down + a dry rasp
  const croak = (t, g = 0.055) =>
    at(t, () => {
      for (const [f, d] of [
        [96, 0.13],
        [99.5, 0.1],
      ]) {
        const o = osc("square", f, t, d + 0.02);
        o.frequency.exponentialRampToValueAtTime(f * 0.72, t + d);
        const a = ac.createGain();
        env(a.gain, t, 0.006, g, d);
        o.connect(a);
        out(a, 1, 0.2, -0.3);
      }
      const n = noise(t, 0.09);
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 320;
      bp.Q.value = 1.4;
      const ng = ac.createGain();
      env(ng.gain, t, 0.008, g * 0.35, 0.07);
      n.connect(bp).connect(ng);
      out(ng, 1, 0.15, -0.3);
    });

  // DRIP: mine water drop — high sine blip falling away, lost in hall reverb
  const drip = (t, f = 1700, g = 0.035) =>
    at(t, () => {
      const o = osc("sine", f, t, 0.09);
      o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.08);
      const a = ac.createGain();
      env(a.gain, t, 0.003, g, 0.07);
      o.connect(a);
      out(a, 1, 0.75, (R() - 0.5) * 1.2);
    });

  // GLINT: the Razor catches the light — one eerie bell + a high string harmonic
  const glint = (t) =>
    at(t, () => {
      k.bell(t, 1480, 0.085, 2.8, 5.9, 4);
      const o = osc("sine", 2961, t, 1.6);
      const a = ac.createGain();
      env(a.gain, t, 0.02, 0.02, 1.5);
      o.connect(a);
      out(a, 1, 0.6, 0.3);
    });

  // EYE SWIRL: two sines beating ~3 Hz under a slow tremolo — the search-beam unease
  const eyeSwirl = (t0, t1, g = 0.034) =>
    at(t0, () => {
      const trem = ac.createGain();
      trem.gain.value = 0.7;
      const lfo = osc("sine", 1.7, t0, t1 - t0);
      const lg = ac.createGain();
      lg.gain.value = 0.3;
      lfo.connect(lg).connect(trem.gain);
      const a = ac.createGain();
      env(a.gain, t0, 0.4, g, Math.max(0.2, t1 - t0 - 0.9), 0, 0.5);
      for (const f of [392, 395.2]) osc("sine", f, t0, t1 - t0 + 0.4).connect(trem);
      trem.connect(a);
      out(a, 1, 0.55, 0.2, 0.4);
    });

  // WINGBEAT: the Great Eagle — one low air whoosh
  const wingbeat = (t, g = 0.14, pan = 0) =>
    at(t, () => {
      k.whoosh(t, 0.42, g, 170, 700);
    });

  // AIR SINE: one high sine hanging (slow-mo time feel; final-card air)
  const airSine = (t, dur, f, g = 0.03) =>
    at(t, () => {
      const o = osc("sine", f, t, dur);
      const a = ac.createGain();
      env(a.gain, t, 0.015, g, Math.max(0.05, dur - 0.02));
      o.connect(a);
      out(a, 1, 0.5);
    });

  // CRACK NOISE: the dry wood-and-stone crack at the freeze release
  const crackNoise = (t) =>
    at(t, () => {
      const n = noise(t, 0.16);
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(3400, t);
      bp.frequency.exponentialRampToValueAtTime(900, t + 0.12);
      bp.Q.value = 1.1;
      const a = ac.createGain();
      env(a.gain, t, 0.002, 0.32, 0.13);
      n.connect(bp).connect(a);
      out(a, 1, 0.35);
    });

  // RUMBLE: falling-filtered noise bed (chasm, stone, collapse) — deterministic envelope
  const rumble = (t, g = 0.25, dur = 2.0) =>
    at(t, () => {
      const n = noise(t, dur);
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(900, t);
      lp.frequency.exponentialRampToValueAtTime(90, t + dur);
      const a = ac.createGain();
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(g, t + 0.06);
      a.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      n.connect(lp).connect(a);
      out(a, 1, 0.55, 0, 0.7);
    });

  // ROCK CHUNKS: discrete stone falls inside a crumble
  const rockChunks = (t, g = 0.28) =>
    at(t, () => {
      for (let i = 0; i < 3; i++) {
        const n = noise(t + i * 0.2 + J(0.02), 0.1);
        const lp = ac.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 700 - i * 90;
        const ng = ac.createGain();
        env(ng.gain, t + i * 0.2, 0.004, g * 0.3, 0.09);
        n.connect(lp).connect(ng);
        out(ng, 1, 0.4, (R() - 0.5) * 1.2);
      }
    });

  // WARP BOX: the temptation voice — detuned bell pair, slowed and minor
  const warpBox = (t, m, dur, g = 0.05) =>
    at(t, () => {
      k.bell(t, hz(m) * 0.996, g, dur + 0.7, 2.02, 4);
      const o = osc("sine", hz(m) * 1.004, t, dur + 0.6);
      const a = ac.createGain();
      env(a.gain, t, 0.002, g * 0.8, dur + 0.5);
      o.connect(a);
      out(a, 1, 0.5);
    });

  // ================= THE FLOW THEME (data tables) =================
  const FLOW_A = [
    [57, 0, 1],
    [62, 1, 1],
    [66, 2, 1.5],
    [64, 3.5, 0.5],
    [62, 4, 1],
    [67, 5, 1],
    [66, 6, 2],
  ];
  const FLOW_B = [
    [62, 0, 1],
    [66, 2, 1],
    [62, 3, 1],
  ];
  const HORN_A = [
    [62, 0, 1],
    [66, 1, 1],
    [69, 2, 1.5],
    [67, 3.5, 0.5],
    [66, 4, 1],
    [62, 5, 1],
    [57, 6, 2],
  ];
  const HORN_B = [
    [62, 0, 1],
    [61, 1, 1],
  ]; // the variant darkens to C natural — unresolved
  const REPR_B = [
    [64, 0, 1],
    [66, 1, 1],
    [69, 2, 1],
    [62, 3, 1.5],
  ]; // cadence: …A4 → home D4 lands ON the final chord
  const FALL_FIG = [
    [62, 0],
    [61, 0.5],
    [57, 1.0],
    [53, 1.5],
    [50, 1.9],
  ]; // falling lament, 0.5 s steps

  // ============================================================================
  // BARS 1–2 · COLD OPEN 0–6 — low choir + distant horn call over a deep drone
  // (consumes SCORE_ABS.choirIn .2, titleLand .9; TITLE_EV subIn/mistThicken)
  // ============================================================================
  k.drone(SCORE_ABS.choirIn, T.forgePlate + 0.05, [26, 38], 0.028, 200); // deep drone under everything
  k.choir(SCORE_ABS.choirIn + 0.1, [38, 45, 50], 4.4, 0.042, "o", 2.2, 1.3); // low choir pad, released at 6.0
  horn(T.mistTitle + TITLE_EV.subIn - 0.5, 45, bt(0.75), 0.055); // distant call rises: A2 …
  horn(T.mistTitle + TITLE_EV.subIn - 0.5 + bt(0.75), 50, bt(1.5), 0.055); // … D3 (ends 4.15)
  horn(T.mistTitle + TITLE_EV.mistThicken - 1.05, 50, bt(2), 0.05); // the answer, held to the cut

  // ============================================================================
  // BARS 3–5a · PROLOGUE PLATES 6–13.5 — anvil + horde march + the kingdom falls
  // (consumes forgeSparks 6.2, hordeDrums 7.5, bannersFall 9.5; FORGE/HORDE/BANNERS_EV)
  // ============================================================================
  // — plate I: the forging (6–7.5) rides HOT: fast-attack furnace drone + rumble bed under four
  //   anvil blows on the FORGE_EV.sparks rhythm (QA: this window measured −34 LU — near-dead)
  k.drone(T.forgePlate, T.hordePlate + 0.1, [26, 33, 38], 0.05, 260); // furnace drone, attack 0.53 s
  k.drone(T.hordePlate + 0.1, T.shearDay - 0.1, [26, 33, 38], 0.028, 260); // dark bed, plates II–III
  rumble(T.forgePlate, 0.05, 1.45); // furnace breath under the hammer rhythm
  anvil(T.forgePlate + FORGE_EV.sparks[0], 0.55);
  anvil(T.forgePlate + FORGE_EV.sparks[1], 0.4, false);
  anvil(T.forgePlate + FORGE_EV.sparks[2], 0.6);
  anvil(T.forgePlate + FORGE_EV.sparks[3], 0.45, false);
  sparks(T.forgePlate + FORGE_EV.sparks[0], 0.12);
  sparks(T.forgePlate + FORGE_EV.sparks[2], 0.12);
  // — plate II: the horde marches (7.5–9): taiko + column feet + distant snare
  k.taiko(SCORE_ABS.hordeDrums, 0.5);
  k.taiko(T.hordePlate + HORDE_EV.drumStep, 0.42);
  feet(T.hordePlate + HORDE_EV.marchIn + bt(0.5), 0.05, -0.3);
  snare(T.hordePlate + HORDE_EV.drumStep, 0.05);
  // — plate III: banners fall (9–13.5) — a falling lament in strings, minor
  k.strings(SCORE_ABS.bannersFall, [38], 3.4, 0.04, 0.5, 1.0, 900); // low pedal under the legend
  FALL_FIG.slice(0, 3).forEach(([m, b], i) =>
    k.strings(SCORE_ABS.bannersFall + b * 0.5 + i * 0.06, [m], 1.0, 0.036 - i * 0.002, 0.25, 0.6, 1300),
  );
  thud(T.fallPlate + 1.1, 0.26, -0.35);
  thud(T.fallPlate + 2.9, 0.2, 0.3);
  k.pad(10.8, [38, 45, 50, 53], 2.5, 0.024, 850, 1.0); // D minor settles, gone by 13.5
  k.swell(12.9, SCORE_ABS.shearTheme - 0.1, 0.08); // the colour turns gold into the Shear

  // ============================================================================
  // BARS 5b–7 · THE SHEAR 13.5–21 — FLOW THEME stated, day → night
  // (consumes shearTheme 13.7, nightSolo 16.9, glint 17.6; SHEAR_DAY/NIGHT_EV)
  // ============================================================================
  k.pad(SCORE_ABS.shearTheme, [50, 57, 62, 66], 2.8, 0.04, 1100, 1.2); // warm D major pad (day)
  for (
    let i = 0;
    i < 3;
    i++ // harp-ish plucks through the golden day
  )
    k.pluck(SCORE_ABS.shearTheme + i * bt(1), [50, 57, 62][i], 0.042, 3000, 0.25);
  playMelody(FLOW_A, SCORE_ABS.shearTheme, (t, m, d) => whistle(t, m, d, 0.068)); // THE THEME
  k.pad(T.shearNight, [38, 45, 50, 53], 4.0, 0.032, 800, 0.8); // night: the pad darkens (D minor)
  k.strings(SCORE_ABS.nightSolo, [38], 1.6, 0.05, 0.3, 1.0, 900); // the Razor out of the earth
  glint(SCORE_ABS.glint); // the glint: eerie bell + high harmonic — the theme suspends beneath
  playMelody(FLOW_B, SCORE_ABS.shearTheme + bt(8), (t, m, d) => whistle(t, m, d, 0.05)); // the answer,
  // ↑ crosses the assembly cut by design; its last D4 hands off into the horn statement.

  // ============================================================================
  // BARS 8–11 · THE FELLOWSHIP 21–33 — horn variant + walking pulse, wraith darkens
  // (consumes fellowshipHorns 21.3, marchStep 24.4, wraithSting 29.5; ASSEMBLY/RIDGE/WRAITH_EV)
  // ============================================================================
  playMelody(HORN_A, SCORE_ABS.fellowshipHorns, (t, m, d) => horn(t, m, d, 0.082)); // the variant
  playMelody(HORN_B, SCORE_ABS.fellowshipHorns + bt(8), (t, m, d) => horn(t, m, d, 0.07)); // answer, 27.3
  // walking pulse from step-off: half-bar bass walk D–G–B♭–A into the mines gate
  const WALK = [
    [38, 0],
    [43, 1],
    [46, 2],
    [45, 4],
  ];
  for (const [m, i] of WALK) k.bass(SCORE_ABS.marchStep + i * BAR, m, 0.32, 0.16, "sawtooth", 480);
  feet(SCORE_ABS.marchStep, 0.052, -0.3); // boots on the step-off
  snare(SCORE_ABS.marchStep + BAR / 2, 0.075);
  tremLow(SCORE_ABS.wraithSting, T.minesEnter - 0.1, [34, 40], 0.042); // wraith: low tritone tremolo
  k.strings(SCORE_ABS.wraithSting, [58, 59, 64], 2.6, 0.038, 2.0, 0.85, 1400); // dissonant swell, no explosion
  k.riser(31.5, T.minesEnter - 0.05, 0.13); // the gate swallows them — cut, no impact

  // ============================================================================
  // BARS 12–13 · THE MINES 33–39 — near-silence: crackle, heartbeat, drips, hall
  // (consumes minesDrone 33.1, rumble 38.6; MINES_ENTER/HALL_EV torch seeds/flicker)
  // ============================================================================
  k.drone(SCORE_ABS.minesDrone, T.eyeTower, [26, 38], 0.026, 180); // sparse dark fifth drone
  for (const g of MINES_ENTER_EV.torchSeeds.slice(0, 2)) k.tick(T.minesEnter + g + J(0.01), 0.014, 2000 + R() * 700);
  for (const g of [MINES_HALL_EV.torchFlicker[0], MINES_HALL_EV.torchFlicker[2]])
    k.tick(T.minesHall + g + J(0.01), 0.016, 2100 + R() * 700);
  k.heartbeat(T.minesEnter + 1.6, 0.26);
  drip(T.minesEnter + MINES_ENTER_EV.torchSeeds[0] + 0.55, 1560);
  drip(T.minesEnter + MINES_ENTER_EV.torchSeeds[2] + 0.65, 1980);
  rumble(SCORE_ABS.rumble, 0.16, 2.2); // first chasm rumble under the floor

  // ============================================================================
  // BAR 14 · BALDROG 39–42 — braam + taiko + choir cluster + riser
  // (consumes braam 41.8, slam 43.5; BALROG_EV chasmGlow/rise/eclipse/roar, BRIDGE_EV plant)
  // ============================================================================
  k.taiko(T.balrogRise + BALROG_EV.chasmGlow, 0.28); // the pit wakes
  growl(T.balrogRise + BALROG_EV.rise, 0.24); // the bald head rises
  k.braam(SCORE_ABS.braam, [26, 33, 38], 1.2, 0.42, 1.1); // THE ROAR
  k.choir(SCORE_ABS.braam, [37, 38, 45], 1.2, 0.05, "o", 0.5, 0.4); // semitone cluster, released 43.4
  k.taiko(SCORE_ABS.braam, 0.55);
  tremLow(T.balrogRise + BALROG_EV.eclipse, SCORE_ABS.braam + 1.3, [37, 38], 0.04); // eclipse tremolo
  k.riser(SCORE_ABS.braam, SCORE_ABS.slam - 0.08, 0.18); // rises exactly to the freeze
  k.clunk(T.bridgeStand + BRIDGE_EV.plant, 0.28); // the staff plants
  k.kick(SCORE_ABS.slam - 0.5, 0.45); // short tail — silent through the hit-stop

  // ============================================================================
  // BAR 15 · THE SLAM 42–45 — pit silence, then the crack ON the freeze release
  // (consumes slam 43.5, crack 43.68; BRIDGE_EV shout/slam — no stinger under the shout)
  // ============================================================================
  k.tick(SCORE_ABS.slam, 0.06, 900); // the freeze: one dry contact — the crack IS the hit
  crackNoise(SCORE_ABS.crack); // THE CRACK — wood/stone, at the freeze release
  k.impact(SCORE_ABS.crack, 0.75, 48);
  k.sub(SCORE_ABS.crack, 0.5, 90, 30, 1.6);
  rumble(SCORE_ABS.crack + 0.08, 0.2, 2.0); // the bridge groans
  k.clunk(SCORE_ABS.crack + 1.15, 0.3); // a span shifts

  // ============================================================================
  // BAR 16 · THE FALL 45–48 — slow-mo falling strings, the drag, swallowed
  // (consumes collapse 45.2, fallSlow [45.2 46.4]; BRIDGE_CLOCK for dragGrip/swallowed)
  // ============================================================================
  k.impact(SCORE_ABS.collapse, 0.9, 44); // the span gives way
  k.sub(SCORE_ABS.collapse, 0.7, 80, 24, 2.4);
  rumble(SCORE_ABS.collapse, 0.3, 2.2); // stonefall bed
  rockChunks(SCORE_ABS.collapse + 0.15, 0.3);
  FALL_FIG.slice(0, 4).forEach(
    (
      [m, b],
      i, // time-dilated lament through the 0.45× window
    ) => k.strings(SCORE_ABS.fallSlow[0] + b, [m], 1.1, 0.038, 0.15, 0.7, 1200),
  );
  k.heartbeat(SCORE_ABS.collapse + 0.7, 0.32); // the slow-mo heartbeat
  growl(BRIDGE_CLOCK.abs(BRIDGE_EV.dragGrip), 0.2); // the fire whip takes Grandflo (abs 45.38)
  k.sub(BRIDGE_CLOCK.abs(BRIDGE_EV.swallowed), 0.45, 70, 24, 1.6); // both vanish (abs 46.94)

  // ============================================================================
  // BAR 17 · GRIEF 48–49.5 → ASHLANDS 49.5–51 — one solo note + air, then sub drone
  // (consumes grief 48.25, ashSub 49.9; ESCAPE_EV.griefNote, ASH_EV)
  // ============================================================================
  k.strings(SCORE_ABS.grief, [45], 1.2, 0.05, 0.3, 0.95, 1200); // the solo note, fading by 50.4
  k.wind(SCORE_ABS.grief + 0.15, T.eyeTower - 0.2, 0.03, 280, 780); // air, growing into ash-wind
  k.drone(SCORE_ABS.ashSub, T.eyeTower, [26, 33], 0.03, 180); // the ashlands sub drone
  whisperTex(SCORE_ABS.ashSub, 53.6, 0.02); // drifting whisper texture

  // ============================================================================
  // BARS 18–19a · GOLBALD 51–55.5 — croaks, the whisper, the skuttle off
  // (consumes whisperCue 51.3; GOLBALD_EV whisper/clutch/skulkOff)
  // ============================================================================
  croak(SCORE_ABS.whisperCue, 0.055); // "my preciousss flow…"
  croak(T.golbaldRock + GOLBALD_EV.clutch, 0.04); // he clutches the toupee

  // ============================================================================
  // BAR 19b · THE EYE 55.5–57 — slow unsettling swirl + beam
  // (consumes eyeSwivel 55.7; EYE_EV beam)
  // ============================================================================
  eyeSwirl(SCORE_ABS.eyeSwivel, T.domeClimb, 0.034); // beating sines — the Eye turns
  k.whoosh(T.eyeTower + EYE_EV.beam, 0.9, 0.055, 500, 1800); // the search-beam sweeps

  // ============================================================================
  // BARS 20–21 · CLIMB + CRATER 57–63 — taiko builds, ostinato, the theme warped
  // (consumes taikoIn 57.8; CLIMB_EV emberSeeds/windPeak; CRATER_EV reflection)
  // ============================================================================
  k.wind(T.domeClimb - 0.3, T.craterEdge + 0.4, 0.06, 300, 1100); // climb wind
  k.taiko(SCORE_ABS.taikoIn, 0.32); // the taiko pulse, building by bars
  k.taiko(SCORE_ABS.taikoIn + BAR, 0.42);
  const OST = [33, 33, 45]; // low string ostinato, thinning at the rim
  OST.forEach((m, i) => k.strings(SCORE_ABS.taikoIn + i * B, [m], 0.2, 0.034, 0.01, 0.14, 700));
  // temptation: the theme warped — slowed 1.3×, F natural — cut off by the lunge
  const WU = B * 1.3;
  const warpT = T.craterEdge + CRATER_EV.reflection[0];
  warpBox(warpT, 57, WU, 0.05);
  warpBox(warpT + WU, 62, WU, 0.05);
  warpBox(warpT + 2 * WU, 65, 0.13, 0.048); // the minor tell — severed by the hit-stop

  // ============================================================================
  // BAR 22 · THE LUNGE 63–66 — freeze, slow-mo tumble, splash ON SCORE_ABS
  // (consumes lunge 63.9, tumbleSlow [64.94 65.84], splash 65.84; CRATER_CLOCK for struggle)
  // ============================================================================
  k.impact(SCORE_ABS.lunge, 0.65, 48); // the lunge lands at freeze start
  airSine(SCORE_ABS.lunge, 0.12, 2400, 0.035); // one high sine across the 0.14 s freeze
  k.whoosh(CRATER_CLOCK.abs(LUNGE_EV.struggle), 0.3, 0.12, 400, 1400); // grappling (abs 64.24)
  k.heartbeat(SCORE_ABS.tumbleSlow[0] + 0.04, 0.4); // slow-mo: the tumble stretches time
  airSine(SCORE_ABS.tumbleSlow[0] + 0.06, 0.7, 3400, 0.028);
  k.impact(SCORE_ABS.splash, 0.85, 46); // THE SPLASH
  k.sub(SCORE_ABS.splash, 0.65, 90, 26, 2.2);
  k.hiss(SCORE_ABS.splash + 0.06, 1.4, 0.15); // lava steam

  // ============================================================================
  // BAR 23 · MELT + ERUPTION 66–69 — full tutti + impact + choir
  // (consumes melt 66.4, erupt 67.5; MELT_EV)
  // ============================================================================
  k.hiss(SCORE_ABS.melt, 1.0, 0.09); // the Razor melts
  k.impact(SCORE_ABS.erupt, 0.95, 42); // THE ERUPTION
  k.braam(SCORE_ABS.erupt, [26, 33, 38], 4.4, 0.5, 1.2); // sustains through the hairify wave (QA: montage had a level hole at 70.5–72)
  k.crash(SCORE_ABS.erupt + 0.05, 0.3);
  k.choir(SCORE_ABS.erupt, [38, 45, 53], 3.6, 0.055, "a", 0.3, 0.9); // the mountain sings, rides to 72.0
  k.taiko(SCORE_ABS.erupt, 0.8);

  // ============================================================================
  // BAR 24 · TOWERS FALL + HAIRIFY 69–72 — crumble, the Eye bursts, fragments bloom
  // (consumes crumble 69.1, eyeBurst 69.6, hairifyIn 70.5; TOWERS/HAIRIFY_EV)
  // ============================================================================
  rumble(SCORE_ABS.crumble, 0.3, 2.2); // the Dark Tower cracks
  rockChunks(SCORE_ABS.crumble + 0.1, 0.32);
  k.glass(SCORE_ABS.eyeBurst, 0.38, 1.2); // THE EYE bursts into hair-confetti
  k.taiko(SCORE_ABS.hairifyIn, 0.5); // the wavefront keeps the eruption's pulse
  for (
    let i = 0;
    i < 3;
    i++ // the theme fragments bloom across the horde, L→R
  )
    k.pluck(SCORE_ABS.hairifyIn + i * bt(0.8), [50, 57, 62][i], 0.07, 3400, 0.22);
  HAIRIFY_EV.bursts.slice(0, 1).forEach((g, i) => k.bell(T.hairify + g, hz([69, 73][i]), 0.045, 1.0, 2.5, 2));
  k.swell(71.3, SCORE_ABS.rescueTheme, 0.16); // into the rescue — lifts from energy, not a hole

  // ============================================================================
  // BARS 25–26a · RESCUE 72–76.5 — "THE FLOW IS COMING": warm swell + horn theme
  // (consumes rescueTheme 72.0, swoop 73.2, grab 74.4; RESCUE_EV)
  // ============================================================================
  k.pad(SCORE_ABS.rescueTheme, [38, 45, 54], 4.3, 0.05, 1200, 0.8); // big warm bed, ends 76.5
  playMelody(FLOW_A, SCORE_ABS.rescueTheme, (t, m, d) => horn(t, m, d, 0.09)); // horn statement —
  // its held F#4 (76.5–78) is the pedal the reprise starts over (stretto at the climax).
  wingbeat(SCORE_ABS.swoop, 0.13, -0.45); // the Great Eagle commits (73.2)
  wingbeat(SCORE_ABS.grab + 0.1, 0.14, 0.15); // talons close (74.4)
  k.clunk(SCORE_ABS.grab, 0.32);

  // ============================================================================
  // BARS 26b–28 · THE RETURN 76.5–84 — fullest, warmest reprise, embrace lands soft
  // (consumes returnTheme 76.5, grandfloGlow 77.5, embrace 82.2; RETURN/EMBRACE_EV)
  // ============================================================================
  k.strings(SCORE_ABS.returnTheme, [38, 45], 5.4, 0.04, 1.5, 1.1, 1400); // warm bed, done by 83
  k.pad(SCORE_ABS.returnTheme, [50, 57, 62, 66], 5.8, 0.042, 1100, 1.0); // released at 82.5
  k.choir(SCORE_ABS.returnTheme + 0.1, [50, 57], 5.4, 0.04, "a", 2.0, 1.5); // gentle backing choir
  playMelody(FLOW_A, SCORE_ABS.returnTheme, (t, m, d) => whistle(t, m, d, 0.072)); // THE REPRISE
  k.pluck(SCORE_ABS.returnTheme, 50, 0.045, 3000, 0.25); // one harp ground pluck under the reprise
  k.bell(SCORE_ABS.grandfloGlow, hz(74), 0.05, 2.0, 2.5, 2); // the white glow (77.5)
  k.strings(SCORE_ABS.embrace, [50, 57, 62], 1.3, 0.04, 0.5, 0.9, 1600); // the embrace (82.2)
  playMelody(REPR_B, SCORE_ABS.embrace + bt(0.4), (t, m, d) => whistle(t, m, d, 0.078)); // cadence —
  // the final D4 lands at 84.75 as the top of the final chord.

  // ============================================================================
  // BARS 29–30 · END CARDS 84–90 — final chord peaks ~87, decays exactly to 90.0
  // (consumes finalChord 84.0; END_EV fade [88.6 90])
  // ============================================================================
  k.strings(SCORE_ABS.finalChord, [38, 45, 50, 57], 2.5, 0.05, 0.4, 3.1, 2200); // gain 0 at 89.6
  k.pad(SCORE_ABS.finalChord, [50, 57, 62, 66], 5.8, 0.036, 1200, 0.15); // gain 0 at exactly 90.0
  k.sub(SCORE_ABS.finalChord, 0.26, 60, 28, 2.5); // warm floor, gone by 86.5
  k.bell(SCORE_ABS.finalChord + 0.05, hz(74), 0.045, 5.0, 2.5, 2); // decayed fully by 89.05
  airSine(87.0, 2.55, 1174.7, 0.015); // last air — D6, decayed by 89.55, into the fade
}
