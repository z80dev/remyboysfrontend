// "MAGICAL HAIR SHOWER" — an original 128 BPM synthwave / YM2151-style FM track (FM slap bass, FM brass lead,
// DX-style e-piano stabs, gated snare, 16th arps), plus the radio-select snippets and every game SFX.
// Film-time aligned through choreo.filmT so each sound lands on its frame (hit-stops included).
import {
  T_TITLE, T_RACE, T_END, DURATION, M0, BEAT, BAR, RADIO, RADIO_OK, G, filmT, warp, rpm, BOSS_LAND,
} from './choreo.js';
import { ENDING_FW } from './scenes.js';

const S16 = BEAT / 4;
// chords per race bar: [bass root, chord tones]
const CHORDS = [
  [41, [65, 69, 72, 76]], // Fmaj7
  [43, [67, 71, 74, 76]], // G6
  [40, [64, 67, 71, 74]], // Em7
  [45, [69, 72, 76, 79]], // Am7(9)
  [41, [65, 69, 72, 76]], // F → G (beats 3–4)
];
// lead: [16th, midi, length in 16ths]
const LEAD = [
  [[0, 76, 3], [3, 77, 1], [4, 79, 2], [6, 81, 4], [10, 79, 2], [12, 76, 2], [14, 72, 2]],
  [[0, 74, 3], [3, 76, 1], [4, 79, 3], [7, 74, 1], [8, 71, 2], [10, 74, 2], [12, 79, 4]],
  [[0, 83, 2], [2, 81, 2], [4, 79, 2], [6, 76, 2], [8, 79, 3], [11, 81, 1], [12, 83, 4]],
  [[0, 84, 3], [3, 83, 1], [4, 81, 2], [6, 84, 2], [8, 88, 4], [12, 86, 2], [14, 83, 2]],
  [[0, 84, 4], [4, 81, 2], [6, 84, 2], [8, 86, 3], [11, 88, 1], [12, 91, 4]],
];

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit;

  // ---------- voices ----------
  // 2-op FM: sine carrier, sine modulator (ratio), modulation index envelope.
  const fm = (t, m, dur, o = {}) => at(t, () => {
    const { ratio = 1, index = 2, index1 = null, idec = dur, g = 0.12, pan = 0, send = 0.12, atk = 0.004, sus = 0.7, dec = 0.12, rel = 0.06, vib = 0, bus = null, to = null, fb = 0 } = o;
    const f = hz(m), len = dur + rel + 0.05;
    const car = osc('sine', f, t, len), mod = osc('sine', f * ratio, t, len);
    if (to != null) { car.frequency.exponentialRampToValueAtTime(hz(to), t + dur); mod.frequency.exponentialRampToValueAtTime(hz(to) * ratio, t + dur); }
    const mg = ac.createGain();
    mg.gain.setValueAtTime(f * index, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(0.01, f * (index1 ?? index * 0.15)), t + Math.max(0.01, idec));
    mod.connect(mg).connect(car.frequency);
    if (fb) { const m2 = osc('sine', f * ratio * 2, t, len), g2 = ac.createGain(); g2.gain.value = f * fb; m2.connect(g2).connect(car.frequency); }
    if (vib) { const l = osc('sine', 5.6, t, len), lg = ac.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012 * vib, t + Math.min(0.25, dur)); l.connect(lg).connect(car.frequency); }
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + atk);
    a.gain.linearRampToValueAtTime(g * sus, t + atk + dec);
    a.gain.setValueAtTime(g * sus, t + Math.max(atk + dec, dur));
    a.gain.linearRampToValueAtTime(0, t + dur + rel);
    car.connect(a);
    if (bus) a.connect(bus); else out(a, 1, send, pan);
  });
  const nz = (t, dur, { f = 4000, type = 'highpass', g = 0.12, q = 0.7, f1 = null, pan = 0, send = 0.04, atk = 0, bus = null } = {}) => at(t, () => {
    const n = noise(t, dur), flt = ac.createBiquadFilter();
    flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const a = ac.createGain();
    if (atk) { a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + atk); } else a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(flt).connect(a);
    if (bus) a.connect(bus); else out(a, 1, send, pan);
  });
  const sq = (t, m, dur, { g = 0.08, to = null, pan = 0, send = 0.08, type = 'square', bus = null } = {}) => at(t, () => {
    const o = osc(type, hz(m), t, dur + 0.02);
    if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.setValueAtTime(g, t + Math.max(0.005, dur - 0.015)); a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(a);
    if (bus) a.connect(bus); else out(a, 1, send, pan);
  });
  // instruments
  const bass = (t, m, d, g = 0.2, bus) => fm(t, m, d, { ratio: 1, index: 3.2, index1: 0.4, idec: 0.09, g, sus: 0.55, dec: 0.08, rel: 0.03, send: 0.02, bus });
  const brass = (t, m, d, g = 0.1, bus) => {
    fm(t, m, d, { ratio: 1, index: 1.4, index1: 2.6, idec: 0.12, g, atk: 0.03, sus: 0.85, dec: 0.1, rel: 0.12, vib: d > 0.3 ? 1 : 0, send: 0.18, bus });
    fm(t, m + 12, d, { ratio: 2, index: 0.8, index1: 0.4, idec: 0.2, g: g * 0.25, atk: 0.02, sus: 0.7, rel: 0.1, send: 0.2, pan: 0.2, bus });
  };
  const ep = (t, m, d, g = 0.04, pan = 0, bus) => { fm(t, m, d, { ratio: 1, index: 1.2, index1: 0.2, idec: 0.4, g, sus: 0.4, dec: 0.3, rel: 0.2, send: 0.25, pan, bus }); fm(t, m, 0.08, { ratio: 14, index: 0.6, index1: 0.01, idec: 0.06, g: g * 0.5, sus: 0.1, dec: 0.05, rel: 0.02, send: 0.2, pan, bus }); };
  const bell = (t, m, d = 0.5, g = 0.05, pan = 0, bus) => fm(t, m, d, { ratio: 3.5, index: 2.5, index1: 0.1, idec: d * 0.6, g, sus: 0.3, dec: d * 0.4, rel: 0.2, send: 0.35, pan, bus });
  const arp = (t, m, g = 0.026, pan = 0) => sq(t, m, S16 * 0.7, { g, pan, send: 0.12, type: 'square' });
  const kick = (t, g = 0.55) => kit.kick(t, g);
  const snare = (t, g = 0.2) => { // gated-reverb snare
    nz(t, 0.05, { f: 1900, type: 'bandpass', g: g * 1.2, q: 0.8 });
    at(t, () => {
      const n = noise(t, 0.2), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.5;
      const a = ac.createGain(); a.gain.setValueAtTime(g * 0.7, t); a.gain.setValueAtTime(g * 0.55, t + 0.13); a.gain.linearRampToValueAtTime(0, t + 0.16);
      n.connect(f).connect(a); out(a, 1, 0.4);
    });
    fm(t, 50, 0.05, { ratio: 1.4, index: 2, g: g * 0.6, sus: 0.2, dec: 0.04, rel: 0.02, to: 43, send: 0 });
  };
  const hat = (t, g = 0.035, d = 0.03, pan = 0.25) => nz(t, d, { f: 8000, g, pan });
  const crash = (t, g = 0.14) => kit.crash(t, g);

  // ---------- radio bus: band-limited "car radio" for the station snippets ----------
  const radioIn = ac.createGain();
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
  radioIn.connect(hp).connect(lp);
  out(lp, 1.4, 0.05);

  // ================= TITLE =================
  nz(0.0, 0.32, { f: 300, type: 'bandpass', f1: 5000, g: 0.16, q: 1.2, atk: 0.28 });
  kick(0.32, 0.8); crash(0.32, 0.2); kit.sub(0.32, 0.5, 80, 30, 0.8);
  [60, 64, 67, 72].forEach((m) => brass(0.32, m, 0.55, 0.06));
  bass(0.32, 36, 0.5, 0.25);
  [0, 1, 2, 3, 4, 5].forEach((i) => bell(0.36 + i * 0.045, [84, 88, 91, 96, 91, 96][i], 0.3, 0.035, i % 2 ? 0.4 : -0.4));
  bell(0.52, 103, 0.6, 0.04, 0.3); // logo shine "ting"
  [0.7, 0.98].forEach((t) => sq(t, 84, 0.06, { g: 0.04 }));
  sq(1.12, 79, 0.07, { g: 0.06, type: 'square' }); sq(1.19, 91, 0.16, { g: 0.06 }); // coin / credit

  // ================= RADIO SELECT =================
  const knob = (t0, t1) => { for (let t = t0; t < t1; t += 0.025) nz(t, 0.012, { f: 3200, type: 'bandpass', g: 0.08, q: 4, pan: 0.3 }); };
  // static between stations
  const statics = [[T_TITLE, RADIO[0].t0], [RADIO[0].t1, RADIO[1].t0], [RADIO[1].t1, RADIO[2].t0]];
  for (const [a, b] of statics) { nz(a, b - a + 0.02, { f: 2600, type: 'bandpass', g: 0.16, q: 0.5, bus: radioIn }); knob(a, b); }
  // PERM WAVE: bright steel-drum calypso
  {
    const s = RADIO[0];
    [74, 78, 81, 86, 81, 78, 74, 81].forEach((m, i) => bell(s.t0 + i * 0.03, m, 0.12, 0.07, 0, radioIn));
    [62, 69].forEach((m, i) => bass(s.t0 + i * 0.12, m - 12, 0.1, 0.2, radioIn));
    [0, 0.06, 0.12, 0.18].forEach((d) => nz(s.t0 + d, 0.02, { f: 6000, g: 0.08, bus: radioIn }));
  }
  // PARTING BREEZE: mellow e-piano and a sighing lead
  {
    const s = RADIO[1];
    [64, 67, 71, 74].forEach((m) => ep(s.t0, m, 0.25, 0.08, 0, radioIn));
    brass(s.t0 + 0.04, 79, 0.2, 0.08, radioIn);
    bass(s.t0, 40, 0.24, 0.2, radioIn);
  }
  // MAGICAL HAIR SHOWER: the real track (intro) — leaves the radio filter and opens up full range
  const I0 = RADIO[2].t0;
  CHORDS[0][1].forEach((m) => ep(I0, m, 0.5, 0.05, 0, radioIn));
  bass(I0, 41, 0.2, 0.18, radioIn);
  kit.pad(I0 + 0.05, [53, 60, 64, 69], M0 - I0 + 0.4, 0.035, 1400, 0.3);
  for (let t = I0 + S16 * 2, k = 0; t < M0 - 0.01; t += S16, k++) arp(t, CHORDS[0][1][k % 4] + 12, 0.012 + 0.016 * ((t - I0) / (M0 - I0)), k % 2 ? 0.35 : -0.35);
  // OK chime
  [84, 88, 91].forEach((m, i) => bell(RADIO_OK + i * 0.05, m, 0.4, 0.05));
  // drum fill into the launch (also the race start beeps)
  for (let k = 0; k < 4; k++) snare(M0 - BEAT + k * S16, 0.06 + k * 0.035);
  kit.riser(T_RACE - 0.25, M0, 0.08);
  sq(T_RACE, 69, 0.14, { g: 0.07, type: 'square', pan: 0 }); // red light beep
  sq(M0, 81, 0.32, { g: 0.08, type: 'square' }); // GO

  // ================= RACE MUSIC =================
  const LEAD_END = filmT(G.goal) + BEAT * 2;
  for (let b = 0; b < 5; b++) {
    const t0 = M0 + b * BAR, [root, chord] = CHORDS[b];
    const hi = b >= 3; // nitro: the arranger opens up
    // bass: syncopated FM slap, octave pops
    const pat = [[0, 0], [3, 0], [4, 12], [6, 0], [8, 0], [10, 12], [11, 0], [14, 7]];
    for (const [s, off] of pat) {
      let r = root;
      if (b === 4 && s >= 8) r = 43; // F → G
      bass(t0 + s * S16, r + off, S16 * (off === 12 ? 1.2 : 1.8), off === 12 ? 0.15 : 0.2);
    }
    // drums
    for (let s = 0; s < 16; s++) {
      const t = t0 + s * S16;
      if (s % 4 === 0) kick(t, s === 0 ? 0.62 : 0.5);
      if (s === 4 || s === 12) snare(t, 0.2);
      hat(t, s % 4 === 2 ? 0.05 : 0.028, s % 4 === 2 ? 0.09 : 0.025, s % 2 ? 0.3 : -0.2);
    }
    if (b === 2) for (let k = 0; k < 4; k++) snare(t0 + (12 + k) * S16, 0.08 + k * 0.03);
    // e-piano offbeat stabs
    const ch = b === 4 ? null : chord;
    for (const s of [2, 6, 10, 14]) {
      const c = b === 4 && s >= 8 ? CHORDS[1][1] : ch ?? chord;
      c.forEach((m, k) => ep(t0 + s * S16, m, S16 * 1.5, 0.026, k % 2 ? 0.3 : -0.3));
    }
    // synth pad wash
    kit.pad(t0, (b === 4 ? [53, 57, 60, 64] : chord.map((m) => m - 12)), BAR * (b === 4 ? 0.5 : 1) + 0.05, hi ? 0.03 : 0.022, hi ? 2400 : 1500, 0.15);
    if (b === 4) kit.pad(t0 + BAR / 2, [55, 59, 62, 64], BAR / 2 + 0.3, 0.03, 2400, 0.08);
    // 16th arp
    for (let s = 0; s < 16; s++) {
      const c = b === 4 && s >= 8 ? CHORDS[1][1] : chord;
      arp(t0 + s * S16, c[(s * (hi ? 3 : 1)) % 4] + (hi ? 24 : 12) - (s % 8 > 5 ? 12 : 0), hi ? 0.03 : 0.022, s % 2 ? 0.4 : -0.4);
    }
    // lead
    for (const [s, m, len] of LEAD[b]) {
      const t = t0 + s * S16;
      if (t >= LEAD_END) continue;
      const d = Math.min(len * S16 * 0.92, LEAD_END - t);
      brass(t, m, d, hi ? 0.1 : 0.085);
      if (hi) brass(t + 0.008, m - 12, d, 0.035);
    }
  }
  // ================= ENDING: victory fanfare in C =================
  const E0 = T_END;
  const fan = [[60, 64, 67], [62, 65, 69], [64, 67, 71]];
  fan.forEach((c, k) => { c.forEach((m) => brass(E0 - BEAT + k * (BEAT / 3), m + 12, BEAT / 3 * 0.9, 0.06)); bass(E0 - BEAT + k * (BEAT / 3), [36, 38, 40][k], BEAT / 3, 0.2); });
  kick(E0, 0.7); crash(E0, 0.2); snare(E0, 0.2);
  [72, 76, 79, 84].forEach((m) => brass(E0, m, BEAT * 1.5, 0.07));
  bass(E0, 36, BEAT, 0.24);
  kit.pad(E0, [48, 55, 60, 64, 67], DURATION - E0 - 0.3, 0.04, 2200, 0.1);
  // victory hook (2 bars, half-time feel)
  const VH = [[0.0, 79, 1], [0.5, 81, 0.5], [1, 84, 1], [2, 83, 0.5], [2.5, 81, 0.5], [3, 79, 1], [4, 76, 0.5], [4.5, 79, 0.5], [5, 84, 3]];
  for (const [bt, m, l] of VH) { const t = E0 + BEAT * 1.5 + bt * BEAT * 0.5; if (t < DURATION - 0.4) brass(t, m, Math.min(l * BEAT * 0.5 * 0.92, DURATION - 0.35 - t), 0.075); }
  for (let s = 0; s * BEAT < DURATION - E0 - 0.5; s++) {
    const t = E0 + s * BEAT;
    if (s > 0) kick(t, 0.4);
    if (s % 2 === 1) snare(t, 0.14);
    bass(t, [36, 43, 41, 43, 36][s % 5], BEAT * 0.8, 0.16);
    [60, 64, 67].forEach((m, k) => ep(t + BEAT / 2, m + 12, BEAT * 0.4, 0.02, k ? 0.3 : -0.3));
    for (let k = 0; k < 4; k++) arp(t + k * S16, [72, 76, 79, 84][(s + k) % 4] + 12, 0.016, k % 2 ? 0.4 : -0.4);
  }
  // final chord
  const FC = DURATION - 1.15;
  [60, 64, 67, 72, 76].forEach((m) => brass(FC, m + 12, 0.85, 0.05));
  bell(FC, 96, 1.0, 0.04); crash(FC, 0.12);
  ENDING_FW.forEach((f, i) => {
    const t = T_END + f.t;
    nz(t, 0.5, { f: 1800, type: 'lowpass', f1: 80, g: 0.2, pan: [-0.4, 0.4, 0, 0.5][i], send: 0.3 });
    for (let k = 0; k < 5; k++) nz(t + 0.12 + k * 0.07, 0.03, { f: 6500, g: 0.04, pan: (k % 3 - 1) * 0.5 });
  });
  kit.crowd(E0, DURATION - 0.2, 0.06);

  // ================= ENGINE =================
  // A V12 drone whose pitch follows the revs; automation sampled every 25 ms of film time.
  at(T_RACE - 0.01, () => {
    const t0 = T_RACE - 0.01, t1 = T_END + 0.05;
    const o1 = osc('sawtooth', 40, t0, t1 - t0), o2 = osc('square', 20, t0, t1 - t0), o3 = osc('sawtooth', 80.5, t0, t1 - t0);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
    const a = ac.createGain();
    const g2 = ac.createGain(); g2.gain.value = 0.5;
    const g3 = ac.createGain(); g3.gain.value = 0.25;
    o1.connect(f); o2.connect(g2).connect(f); o3.connect(g3).connect(f); f.connect(a);
    a.gain.setValueAtTime(0, t0);
    for (let t = t0; t <= t1; t += 0.025) {
      const { g } = warp(Math.max(0, t - T_RACE));
      const r = rpm(g), fr = 34 + 120 * r;
      o1.frequency.linearRampToValueAtTime(fr, t);
      o2.frequency.linearRampToValueAtTime(fr / 2, t);
      o3.frequency.linearRampToValueAtTime(fr * 2.01, t);
      f.frequency.linearRampToValueAtTime(300 + 1400 * r, t);
      const fade = Math.min(1, (t - t0) / 0.05) * Math.min(1, (t1 - t) / 0.15);
      a.gain.linearRampToValueAtTime(0.05 * (0.6 + 0.6 * r) * fade, t);
    }
    out(a, 1, 0.02);
  });

  // ================= RACE SFX =================
  const T = filmT;
  const screech = (t, d, g = 0.07, pan = 0) => at(t, () => {
    const n = noise(t, d), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 6;
    const l = osc('sine', 13, t, d), lg = ac.createGain(); lg.gain.value = 500; l.connect(lg).connect(f.frequency);
    const a = ac.createGain(); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + 0.03); a.gain.setValueAtTime(g, t + d * 0.6); a.gain.linearRampToValueAtTime(0, t + d);
    n.connect(f).connect(a); out(a, 1, 0.1, pan);
  });
  const crunch = (t, g = 0.4, pan = 0) => {
    kit.clunk(t, g); nz(t, 0.35, { f: 3000, type: 'lowpass', f1: 200, g: g * 0.8, pan, send: 0.15 });
    [0.03, 0.07, 0.12].forEach((d) => nz(t + d, 0.04, { f: 4500, type: 'bandpass', g: g * 0.3, q: 3, pan }));
  };
  const pass = (t, pan, g = 0.16) => kit.whoosh(t - 0.25, 0.5, g, 300, 2600);
  screech(M0, 0.45, 0.08);
  pass(T(G.passA), -0.5); pass(T(G.passB), 0.5); pass(T(G.truck), 0.4, 0.2); pass(T(G.miss), 0.6, 0.2);
  sq(T(G.miss), 88, 0.06, { g: 0.04 }); sq(T(G.miss) + 0.07, 93, 0.1, { g: 0.04 });
  // bump: crunch + spinning car squeal + bonus blips
  crunch(T(G.bump), 0.4, 0.3); screech(T(G.bump) + 0.05, 0.7, 0.07, 0.5);
  [76, 83].forEach((m, i) => sq(T(G.bump) + 0.08 + i * 0.06, m, 0.06, { g: 0.05 }));
  // hill crest: air, then landing thump
  kit.whoosh(T(G.crest) - 0.2, 0.5, 0.1, 500, 3000); kick(T(G.crest + 0.35), 0.35);
  // fork: turn-signal clicks
  for (let k = 0; k < 4; k++) nz(T(G.fork - 0.3) + k * 0.18, 0.015, { f: 3000, type: 'bandpass', g: 0.08, q: 5, pan: 0.4 });
  // checkpoint: gate whoosh + the "extended play" jingle
  kit.whoosh(T(G.check) - 0.3, 0.5, 0.18, 400, 4000);
  [72, 76, 79, 84, 88].forEach((m, i) => bell(T(G.check) + i * 0.05, m + 12, 0.25, 0.045, i % 2 ? 0.3 : -0.3));
  [[0.3, [79, 84, 88]], [0.42, [79, 84, 88]], [0.54, [81, 86, 89]]].forEach(([d, c]) => c.forEach((m) => sq(T(G.check) + d, m, 0.1, { g: 0.025, type: 'square' })));
  // nitro: boom, jet rush, riser into the boss
  kit.impact(T(G.nitro), 0.4, 50); kit.whoosh(T(G.nitro) - 0.1, 0.4, 0.25, 200, 6000);
  at(T(G.nitro), () => {
    const t0 = T(G.nitro), t1 = T(G.boss) + 0.1, n = noise(t0, t1 - t0), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(600, t0); f.frequency.exponentialRampToValueAtTime(3000, t1);
    const a = ac.createGain(); a.gain.setValueAtTime(0.0001, t0); a.gain.exponentialRampToValueAtTime(0.07, t0 + 0.2); a.gain.setValueAtTime(0.07, t1 - 0.1); a.gain.linearRampToValueAtTime(0, t1);
    n.connect(f).connect(a); out(a, 1, 0.1, 0);
  });
  kit.riser(T(G.boss) - 1.0, T(G.boss), 0.08);
  // smashes
  crunch(T(G.smashE), 0.45, -0.4); [79, 86].forEach((m, i) => sq(T(G.smashE) + 0.06 + i * 0.05, m, 0.05, { g: 0.05 }));
  crunch(T(G.smashF), 0.5, 0.4); [83, 88, 91].forEach((m, i) => sq(T(G.smashF) + 0.06 + i * 0.05, m, 0.05, { g: 0.05 }));
  kit.whoosh(T(G.smashE), 0.6, 0.12, 300, 2000); kit.whoosh(T(G.smashF), 0.6, 0.12, 300, 2000);
  // boss: impact, metal, boom on landing
  kit.impact(T(G.boss), 0.9, 45); crunch(T(G.boss), 0.6, 0.2); crash(T(G.boss), 0.22); kit.sub(T(G.boss), 0.5, 90, 28, 1.2);
  kit.glass(T(G.boss) + 0.02, 0.12, 0.6);
  nz(T(BOSS_LAND), 0.8, { f: 2200, type: 'lowpass', f1: 60, g: 0.45, pan: 0.5, send: 0.3 }); kit.clunk(T(BOSS_LAND), 0.3);
  // goal: stab + cheer
  crash(T(G.goal), 0.2); kit.crowd(T(G.goal), T_END + 0.3, 0.07);
  [84, 88, 91, 96].forEach((m, i) => bell(T(G.goal) + i * 0.04, m, 0.5, 0.05, i % 2 ? 0.35 : -0.35));
  for (let k = 0; k < 8; k++) nz(T(G.goal) + 0.05 + k * 0.05, 0.03, { f: 5000, g: 0.05, pan: (k % 2 ? 0.6 : -0.6) });
  screech(T(G.goal + 0.35), 0.5, 0.05);
  kit.whoosh(T(G.end - 0.3), 0.35, 0.12, 400, 3000); // blinds wipe
}
