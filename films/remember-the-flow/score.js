// REMEMBER THE FLOW — a Remy Boys documentary. Original score, 80 BPM · bar = 3 s · 26 bars · D.
// One timing truth: every cue is scheduled from timeline.js — T (shot boundaries) for section
// windows, EV (picture events) for micro-cues, CLASH_CLOCK.filmT() for anything inside the clash
// shot so the hit-stop freeze maps correctly. Nothing here re-types a number the timeline owns.
//
// THE FLOW MOTIF (original) — a pickup rising a MAJOR SIXTH, then a stepwise settle:
//   D4 – B4 – A4 – F#4 – E4 – (D4)      in beats: [62,0] [71,1] [69,2] [66,3] [64,4] ([62,5])
//   · TITLE 7.5–12: solo piano, ends OPEN on the held E4 (the question)
//   · CH I 12–24: the piano answers with the settle home; a music box echoes it at 19.5
//   · CH III 46.5: fife states it transformed (octave 5, march rhythm, D major) into the clash
//   · 70.5: restated in full on piano + strings, resolving into the final chord at 76.5
// Custom voices (fife pulse wave, music box, bugle, cold brass swell, parry shing, topple thud,
// march feet, snare, projector click) are all built with kit.at, explicit envelopes, and mixed
// through kit.out. Deterministic: kit.R only.
import { T, SHOTS, EV, CLASH_CLOCK, BAR, B } from './timeline.js';

export function score(kit) {
  const k = kit;
  const { ac, at, osc, noise, env, out, hz, R } = kit;

  // ---------- shared bar/beat grid (barsBeats helper; no absolute-time guesswork) ----------
  const bt = (beats) => beats * B; // beat offset → seconds (bar n = bt(4n); half-bar = bt(2))
  // melodies are [midi, startBeat, durBeats] arrays, played from a phrase-start time
  const playMelody = (notes, t0, voice) =>
    notes.forEach(([m, b0, bD], i) => voice(t0 + bt(b0), m, bt(bD), i));

  // ================= custom voices =================

  // cached periodic-wave pulse (25% duty) — bright fife-ish lead
  const waves = {};
  const pulseWave = (duty) => waves[duty] || (waves[duty] = (() => {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let kk = 1; kk < n; kk++) {
      re[kk] = (2 / (kk * Math.PI)) * Math.sin(kk * Math.PI * duty) * Math.cos(kk * Math.PI * duty);
      im[kk] = (2 / (kk * Math.PI)) * Math.sin(kk * Math.PI * duty) * Math.sin(kk * Math.PI * duty);
    }
    return ac.createPeriodicWave(re, im);
  })());

  // FIFE: bright 25% pulse lead + a whiff of breath; quick attack, clean release
  const fife = (t, m, dur, g = 0.09) => at(t, () => {
    const o = osc('square', hz(m), t, dur + 0.06);
    o.setPeriodicWave(pulseWave(0.25));
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.012);
    a.gain.setValueAtTime(g * 0.92, t + Math.max(0.015, dur - 0.045));
    a.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    o.connect(a);
    out(a, 1, 0.16, -0.12);
    const n = noise(t, 0.07);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(9500, hz(m) * 3);
    bp.Q.value = 1.4;
    const ng = ac.createGain();
    env(ng.gain, t, 0.006, g * 0.14, 0.05);
    n.connect(bp).connect(ng);
    out(ng, 1, 0.12, -0.12);
  });

  // MUSIC BOX: high sine + inharmonic twinkle partial, fast attack, long ring (Ch I answer)
  const musicBox = (t, m, g = 0.05, dur = 1.0) => at(t, () => {
    const f0 = hz(m);
    const a = ac.createGain();
    a.gain.value = 1;
    for (const [mult, amp] of [[1, 1], [4 * (1 + (R() - 0.5) * 0.01), 0.18]]) {
      const o = osc('sine', f0 * mult, t, dur);
      const pg = ac.createGain();
      pg.gain.setValueAtTime(0, t);
      pg.gain.linearRampToValueAtTime(g * amp, t + 0.003);
      pg.gain.exponentialRampToValueAtTime(1e-4, t + dur * (mult === 1 ? 1 : 0.45));
      o.connect(pg).connect(a);
    }
    out(a, 1, 0.35, Math.max(-0.5, Math.min(0.5, (m - 80) / 24)));
  });

  // BUGLE: harmonic-series brass voice (partials 1–5), lip scoop, late vibrato, slow swell
  const bugle = (t, m, dur, g = 0.1) => at(t, () => {
    const f = hz(m);
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.09);
    a.gain.setValueAtTime(g, t + Math.max(0.1, dur - 0.12));
    a.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    const vib = osc('sine', 4.8, t, dur + 0.1);
    const vg = ac.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(5, t + 0.5);
    vib.connect(vg);
    for (const [n, amp] of [[1, 1], [2, 0.5], [3, 0.32], [4, 0.2], [5, 0.12]]) {
      const o = osc('sine', f * n * 0.986, t, dur + 0.08);
      o.frequency.linearRampToValueAtTime(f * n, t + 0.07);
      vg.connect(o.detune);
      const pg = ac.createGain();
      pg.gain.value = amp / 1.6;
      o.connect(pg).connect(a);
    }
    out(a, 1, 0.4, 0, 0.2);
  });

  // COLD BRASS SWELL: narrow detuned saws, filter opening, long crescendo into the war map
  const brassSwell = (t0, t1, notes, g = 0.05) => at(t0, () => {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 1.1;
    lp.frequency.setValueAtTime(110, t0);
    lp.frequency.exponentialRampToValueAtTime(620, t1 - 0.1);
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t0);
    a.gain.exponentialRampToValueAtTime(g, t1 - 0.05);
    a.gain.linearRampToValueAtTime(0, t1);
    for (const m of notes)
      for (const det of [-9, 0, 8]) {
        const o = osc('sawtooth', hz(m), t0, t1 - t0);
        o.detune.value = det;
        o.connect(lp);
      }
    lp.connect(a);
    out(a, 1, 0.35, 0, 0.4);
  });

  // PARRY SHING: metal on metal — rising bandpass noise + three inharmonic rings
  const shing = (t, g = 0.06) => at(t, () => {
    const n = noise(t, 0.2);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(5600, t);
    bp.frequency.exponentialRampToValueAtTime(8600, t + 0.09);
    bp.Q.value = 2.2;
    const a = ac.createGain();
    env(a.gain, t, 0.003, g, 0.14, 0.0001, 0.04);
    n.connect(bp).connect(a);
    out(a, 1, 0.3, 0.25);
    for (const f of [2734, 4170, 6230]) {
      const o = osc('sine', f, t, 0.5);
      const og = ac.createGain();
      env(og.gain, t, 0.002, g * 0.16, 0.38);
      o.connect(og);
      out(og, 1, 0.4, 0.25);
    }
  });

  // TOPPLE THUD: body on the ground — falling sine + lowpassed noise, panned per faller
  const thud = (t, g = 0.36, pan = 0) => at(t, () => {
    const o = osc('sine', 96, t, 0.4);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
    const a = ac.createGain();
    env(a.gain, t, 0.004, g, 0.3);
    o.connect(a);
    out(a, 1, 0.25, pan);
    const n = noise(t, 0.16);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    const ng = ac.createGain();
    env(ng.gain, t, 0.003, g * 0.55, 0.12);
    n.connect(lp).connect(ng);
    out(ng, 1, 0.2, pan);
  });

  // MARCH FEET: column of five — soft dust thump, alternating pan
  const feet = (t, g = 0.055, pan = 0) => at(t, () => {
    const n = noise(t, 0.09);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const a = ac.createGain();
    env(a.gain, t, 0.004, g, 0.075);
    n.connect(lp).connect(a);
    out(a, 1, 0.12, pan);
    const o = osc('triangle', 88, t, 0.1);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.09);
    const og = ac.createGain();
    env(og.gain, t, 0.003, g * 0.7, 0.08);
    o.connect(og);
    out(og, 1, 0.1, pan);
  });

  // MARCH SNARE: bandpassed noise burst (+ body snap when close; distant = wetter, duller)
  const snare = (t, g = 0.08, distant = false) => at(t, () => {
    const n = noise(t, distant ? 0.22 : 0.14);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = distant ? 1500 : 2000;
    bp.Q.value = distant ? 0.7 : 1.0;
    const a = ac.createGain();
    env(a.gain, t, 0.002, g, distant ? 0.16 : 0.1);
    n.connect(bp).connect(a);
    out(a, 1, distant ? 0.55 : 0.3);
    if (!distant) {
      const o = osc('sine', 195, t, 0.07);
      const og = ac.createGain();
      env(og.gain, t, 0.001, g * 0.4, 0.05);
      o.connect(og);
      out(og, 1, 0.15);
    }
  });

  // PROJECTOR CLICK: one mechanical click in the decay of the final chord
  const projectorClick = (t) => at(t, () => {
    const n = noise(t, 0.03);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1700;
    bp.Q.value = 1.6;
    const a = ac.createGain();
    env(a.gain, t, 0.001, 0.07, 0.022);
    n.connect(bp).connect(a);
    out(a, 1, 0.25);
    const o = osc('sine', 165, t, 0.06);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.05);
    const og = ac.createGain();
    env(og.gain, t, 0.001, 0.045, 0.05);
    o.connect(og);
    out(og, 1, 0.15);
  });

  // camera shutter: two-blade soft tick pair (below the bed; trimmed with the ch1a pull-down)
  const shutter = (t) => {
    k.tick(t, 0.03, 2600);
    k.tick(t + 0.07, 0.022, 1900);
  };

  // ================= THE FLOW MOTIF =================
  // pickup rising a major sixth, stepwise settle; TITLE version ends open on the held E
  const MOTIF_TITLE = [[62, 0, 1], [71, 1, 1], [69, 2, 1], [66, 3, 1], [64, 4, 2]];
  const MOTIF_FULL = [[62, 0, 1], [71, 1, 1], [69, 2, 1], [66, 3, 1], [64, 4, 1], [62, 5, 2.5]];
  const MOTIF_MARCH = [[74, 0, 0.5], [83, 0.5, 1], [81, 1.5, 0.5], [78, 2, 1], [76, 3, 0.5],
    [74, 3.5, 0.5], [78, 4, 0.5], [83, 4.5, 1], [81, 5.5, 0.5], [78, 6, 1], [81, 7, 2.4]];

  // ================ 0–7.5 COLD OPEN — room tone, breathing drone, sparse felt piano ================
  k.wind(T.coldopen, T.title, 0.014, 110, 260);                 // very low room tone
  k.drone(T.coldopen + 0.5, T.title, [38, 45], 0.022, 260);     // one low string drone, LFO breath
  k.piano(bt(1), 62, 0.085, 2.2);                               // D4 alone
  k.piano(bt(3), 57, 0.07, 2.0);                                // A3 …
  k.piano(bt(3), 64, 0.07, 2.0);                                // … + E4
  k.piano(bt(5), 66, 0.065, 1.8);                               // F#4
  k.piano(bt(7), 57, 0.065, 2.0);                               // A3 …
  k.piano(bt(7), 62, 0.065, 2.0);                               // … + D4
  k.piano(bt(8.5), 64, 0.06, 1.2);                              // E4 leads to the title

  // ================ 7.5–12 TITLE — FLOW MOTIF, solo piano, ends open ================
  k.flutter(EV.flutter, EV.leaderFlicker[1], 0.045);            // projector flutter enters
  k.tick(EV.count2, 0.04, 1400);                                // leader countdown ghosts
  k.tick(EV.count1, 0.04, 1400);
  playMelody(MOTIF_TITLE, T.title, (t, m, d, i) =>
    k.piano(t, m, [0.12, 0.135, 0.115, 0.105, 0.1][i], d));     // ends open on the held E4
  k.piano(T.title + bt(2), 38, 0.09, 2.5);                      // low D under the settle
  k.strings(T.title + bt(2), [38, 45], 2.0, 0.035, 1.4, 1.0, 1200); // low strings join, gone by 12

  // ================ 12–24 CH I — warm piano + soft major pad; music box answer 19.5–24 ================
  k.pad(T.ch1card, [38, 50, 57, 62], 3, 0.032, 950, 1.6);       // D major — resolves at the ch1a cut
  k.pad(T.ch1a, [43, 50, 59, 62], 5.5, 0.019, 950, 1.6);        // G major, pulled ~4 LU (QA: ch1a was loudest)
  k.pad(T.ch1card + 3 * BAR, [45, 52, 61, 64], 3, 0.028, 950, 1.2); // A major — turns at 24
  k.strings(T.ch1a, [50, 57, 62], 5.5, 0.014, 2.0, 1.5, 1800);  // inner warmth (pulled with the pad)
  k.piano(T.ch1card, 62, 0.11, 1.8);                            // the settle answers the open E
  k.piano(T.ch1card, 50, 0.08, 2.2);
  // gains: warm in ch1card (12–15), scaled ~0.63× under the ch1a plate (15–19.5) — QA fix 5
  const CH1_DYADS = [[2, 66, 69, 0.066], [4, 59, 62, 0.042], [6, 55, 62, 0.042],
    [8, 57, 64, 0.042], [10, 62, 66, 0.066], [12, 61, 64, 0.06], [14, 62, 66, 0.06]];
  for (const [b, m1, m2, g] of CH1_DYADS) {
    k.piano(T.ch1card + bt(b), m1, g, 1.5);
    k.piano(T.ch1card + bt(b), m2, g, 1.5);
  }
  // music-box echo of the settle (19.5–24), high and bright; F# rings into the minor turn
  const BOX = [[0, 83, 0.05, 0.9], [1, 81, 0.045, 0.7], [2, 78, 0.05, 0.9],
    [3, 74, 0.04, 0.7], [4, 76, 0.04, 0.7], [5, 78, 0.035, 1.2]];
  for (const [b, m, g, d] of BOX) musicBox(T.ch1b + bt(b), m, g, d);

  // ================ 24–31.5 TURN — modal shift to minor; drone thickens; poster swell ================
  k.drone(T.ch2card, T.ch2b, [38, 45, 48], 0.03, 300);          // D–A–C thickens, colder
  k.pad(T.ch2card, [38, 45, 53], 5, 0.026, 800, 1.8);           // D minor
  k.piano(T.ch2card, 62, 0.07, 1.5);                            // minor third — the colour turns
  k.piano(T.ch2card, 65, 0.07, 1.5);
  k.piano(T.ch2card + bt(2), 57, 0.06, 1.5);
  k.piano(T.ch2card + bt(2), 62, 0.06, 1.5);
  k.piano(T.ch2card + bt(4), 65, 0.055, 1.5);
  k.piano(T.ch2card + bt(4), 69, 0.055, 1.5);
  k.piano(T.ch2card + bt(8), 62, 0.05, 1.4);
  k.piano(T.ch2card + bt(8), 65, 0.05, 1.4);
  brassSwell(T.ch2a, T.ch2b, [26, 38, 45], 0.05);               // cold low brass swell, 27–31.5

  // ================ 31.5–39 WAR MAP — slow taiko, low ostinato, riser (no melodrama) ================
  // taiko pulse from EV.taikoIn, growing; ghost hits echo the front-line throb
  for (const [b, g] of [[0, 0.5], [2, 0.55], [4, 0.6], [5.5, 0.22], [6, 0.65], [7.5, 0.24], [8, 0.7]])
    k.taiko(EV.taikoIn + bt(b), g);
  k.strings(EV.taikoIn, [38], 6.5, 0.028, 2.5, 0.8, 500);       // low D pedal
  const OST = [[0, [38], 0.032], [2, [38, 45], 0.034], [4, [48], 0.036],
    [6, [38, 45], 0.04], [8, [46], 0.042]];                     // B♭ darkest, under the riser
  for (const [b, notes, g] of OST)
    k.strings(EV.taikoIn + bt(b), notes, 1.3, g, 0.22, 0.45, 850);
  k.riser(EV.riser[0], EV.riser[1], 0.2);                       // 37–39, ends exactly at the cut

  // ================ 39–46.5 OCCUPATION + CH3 CARD — sparse, cold; snare fades in at 45 ================
  k.wind(EV.windIn, T.ch3a, 0.05, 260, 900);                    // base cold wind, 39–46.5
  k.wind(T.ch2c + BAR / 2, T.ch2c + BAR, 0.06, 380, 1500);      // gusts
  k.wind(T.ch2c + 2 * BAR + 0.2, T.ch2c + 3 * BAR + 0.2, 0.065, 420, 1600);
  k.drone(T.ch2c, T.ch3a, [38], 0.018, 240);                    // thin cold bed
  k.piano(T.ch2c + BAR / 2, 62, 0.05, 1.4);                     // sparse cold piano
  k.piano(EV.noticeBoard, 38, 0.05, 1.2);                       // a beat on the SHINE ZONE notice
  k.piano(EV.noticeBoard, 45, 0.05, 1.2);
  k.piano(T.ch2c + 3.5 * BAR, 65, 0.04, 1.0);                   // aching F leads to Chapter III
  snare(EV.snareIn, 0.04, true);                                // distant snare fades in 45.0
  snare(EV.snareIn + B, 0.028, true);
  snare(EV.snareIn + 1.5 * B, 0.035, true);

  // ================ 46.5–55.5 CH III — full march at 80 BPM, then the clash ================
  // bass drum on 1/3 (every half-bar), snare accents on 2/4 with ghosts
  for (const [b, g] of [[0, 0.42], [2, 0.4], [4, 0.42], [6, 0.45], [8, 0.45], [9, 0.3]])
    k.kick(EV.fifeIn + bt(b), g);
  for (const [b, g] of [[1, 0.8], [1.5, 0.35], [3, 0.8], [3.5, 0.35], [5, 0.8], [5.5, 0.35],
    [6, 0.3], [6.5, 0.4], [7, 0.5], [7.5, 0.6]])                // charge roll into parry 1
    snare(EV.fifeIn + bt(b), g * 0.11);
  k.taiko(EV.swordLift, 0.4);                                   // the greatsword rises
  playMelody(MOTIF_MARCH, EV.fifeIn, (t, m, d) => fife(t, m, d, 0.09)); // fife states the motif
  for (let i = 0, t = EV.stepOff; t < T.ch3b + bt(3); t += B, i++) // column marches from step-off
    feet(t, i % 2 ? 0.05 : 0.065, i % 2 ? -0.3 : 0.3);
  // clash cues — parries, then the final clash ON THE FREEZE CLOCK
  shing(EV.parry1, 0.06);
  k.kick(EV.parry1, 0.3);
  shing(EV.parry2, 0.065);
  k.kick(EV.parry2, 0.35);
  const TF = CLASH_CLOCK.filmT(2.6);                            // 53.60 — the 0.22 s freeze begins
  k.impact(TF, 0.7, 44);                                        // peaks trimmed ~0.6 dB (QA: dBTP)
  k.kick(TF, 0.65);                                             // low thump under the impact
  shing(TF, 0.075);
  for (const dt of [0.35, 0.2, 0.1]) snare(TF - dt, 0.055);     // press rolls straight into it
  // everything else holds silent through the freeze; the squad topples through it
  EV.topple.forEach((t, i) => thud(t, 0.31 - i * 0.015, i % 2 ? -0.2 : 0.2));
  k.taiko(EV.swordPlant, 0.45);                                 // victory hits (trimmed for dBTP)
  k.kick(EV.swordPlant, 0.45);
  k.crash(EV.swordPlant, 0.1);
  k.strings(EV.bannerDrop, [38, 45, 50, 54], 1.2, 0.045, 0.08, 0.7, 2400); // warm resolve…
  k.piano(EV.bannerDrop, 50, 0.075, 1.4);                       // …as HAIR RETURNS lands
  k.piano(EV.bannerDrop, 57, 0.07, 1.4);
  k.piano(EV.bannerDrop, 62, 0.07, 1.4);

  // ================ 55.5–63 VETERAN — solo piano, intimate; near-silence 61.8–63 ================
  k.whoosh(EV.gateHairOut[0], 0.9, 0.08);                       // the gate hair flutters away
  k.wind(T.veteran, T.memorial, 0.012, 140, 320);               // room tone only under the quiet
  k.piano(T.veteran, 50, 0.085, 2.4);                           // intimate dyads
  k.piano(T.veteran, 57, 0.085, 2.4);
  k.piano(T.veteran + bt(1), 62, 0.07, 1.6);
  k.piano(T.veteran + bt(2), 65, 0.065, 2.0);
  k.piano(T.veteran + bt(2), 69, 0.065, 2.0);
  k.piano(T.veteran + bt(4), 57, 0.06, 1.8);
  k.piano(T.veteran + bt(4), 62, 0.06, 1.8);
  k.piano(T.veteran + bt(6), 71, 0.055, 1.2);                   // a trace of the motif: B4 A4 F#4
  k.piano(T.veteran + bt(7), 69, 0.05, 1.2);
  k.piano(T.veteran + bt(8), 66, 0.055, 1.6);                   // last note decays into the quiet

  // ================ 63–70.5 MEMORIAL — bugle call + choir; soft bell at the hero light ================
  k.choir(T.memorial, [50, 57, 62], 4.2, 0.04, 'a', 2.0, 1.8);  // D — dawn warmth
  k.choir(T.memorial + bt(5), [43, 50, 59, 62], 3.0, 0.036, 'o', 1.6, 1.2); // G — under the bell
  // bugle: original dignified call on the D3 harmonic series (A4 D5 F#5 A5) — no real call quoted
  bugle(EV.bugle, 69, 0.7, 0.085);
  bugle(EV.bugle + B, 74, 1.4, 0.1);
  bugle(EV.bugle + 3 * B, 78, 1.25, 0.1);
  bugle(T.memorial + bt(7), 74, 0.7, 0.09);                     // answer phrase after the bell
  bugle(T.memorial + bt(8), 78, 0.7, 0.09);
  bugle(T.memorial + bt(9), 81, 1.0, 0.09);                     // held dominant → resolves at 70.5
  k.bell(EV.bell, hz(74), 0.075, 3.0);                          // soft bell with the hero light

  // ================ 70.5–78 END — motif restated piano + strings; final chord; one click ================
  k.strings(EV.motifRestate, [38, 45, 54], 3.0, 0.04, 1.2, 1.0, 2000);   // D
  k.strings(EV.motifRestate + BAR, [43, 50, 59], 2.25, 0.038, 0.8, 0.7, 2000);   // G
  k.strings(EV.motifRestate + bt(7), [45, 52, 61], 0.75, 0.036, 0.25, 0.45, 2000); // A → final
  playMelody(MOTIF_FULL, EV.motifRestate, (t, m, d, i) =>
    k.piano(t, m, [0.12, 0.13, 0.11, 0.1, 0.1, 0.12][i], d));   // full motif, settles home
  k.piano(EV.motifRestate + bt(1), 83, 0.045, 0.85);            // octave shimmer on the sixth
  k.piano(EV.motifRestate, 38, 0.09, 3.0);                      // low root
  // final chord at EV.finalChord (76.5), fully resolved and silent before 78 (peaks trimmed ~1 dB)
  k.strings(EV.finalChord, [38, 45, 54], 0.9, 0.045, 0.05, 0.55, 2200);
  k.pad(EV.finalChord, [38, 50, 57], 1.1, 0.031, 1200, 0.12);
  k.piano(EV.finalChord, 50, 0.09, 1.2);
  k.piano(EV.finalChord, 57, 0.08, 1.2);
  k.piano(EV.finalChord, 62, 0.08, 1.2);
  k.piano(EV.finalChord, 66, 0.065, 1.2);
  projectorClick(EV.projectorClick);                            // one click, 77.0 — then silence

  // ================ SFX — sprocket flutter at every archival shot start, shutters ================
  for (const s of SHOTS)
    if (s.register === 'archival') k.flutter(s.t0, s.t0 + 0.55, 0.035);
  shutter(EV.shutter1);
  shutter(EV.shutter2);
}
