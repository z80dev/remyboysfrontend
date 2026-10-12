// Game Boy-style 4-channel score: pulse 1 (lead), pulse 2 (harmony / SFX), wave (bass), noise (drums).
// Original themes: title sting, Route 42 walk, wild battle (with an intro run), victory, level-up, evolution,
// congratulations fanfare. SFX land on frames through choreo.filmT (hit-stops included).
import { TITLE, ROUTE, BATTLE0, EVO0, EV, B, MENUS, filmT, evoFlips, WALK_END, STEP, FLASH, SWIRL, DURATION } from './choreo.js';

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit;
  const waves = {};
  const pulseWave = (duty) => {
    if (waves[duty]) return waves[duty];
    const n = 40, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) { re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty); im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.sin(k * Math.PI * duty); }
    return (waves[duty] = ac.createPeriodicWave(re, im));
  };
  // GB wave channel: a 4-bit-ish rounded saw for a punchy bass
  let gbWave = null;
  const waveTable = () => {
    if (gbWave) return gbWave;
    const n = 24, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (k % 2 ? 1 : 0.55) / Math.pow(k, 1.15);
    return (gbWave = ac.createPeriodicWave(re, im));
  };
  // ---- voices ----
  const pulse = (t, m, dur, { duty = 0.25, g = 0.18, pan = 0, to = null, send = 0.05, vib = 0, dec = 0.65, vr = 6 } = {}) => at(t, () => {
    const o = osc('square', hz(m), t, dur + 0.02);
    o.setPeriodicWave(pulseWave(duty));
    if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur);
    if (vib) {
      const l = osc('sine', vr, t, dur), lg = ac.createGain();
      lg.gain.value = hz(m) * 0.012 * vib;
      l.connect(lg).connect(o.frequency);
    }
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.linearRampToValueAtTime(g * dec, t + Math.min(dur * 0.5, 0.09));
    a.gain.setValueAtTime(g * dec, t + Math.max(0.005, dur - 0.012));
    a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(a);
    out(a, 1, send, pan);
  });
  const wave = (t, m, dur, { g = 0.2, to = null } = {}) => at(t, () => {
    const o = osc('sine', hz(m), t, dur + 0.02);
    o.setPeriodicWave(waveTable());
    if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2400;
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.setValueAtTime(g, t + Math.max(0.005, dur - 0.015));
    a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(lp).connect(a);
    out(a, 1, 0.02);
  });
  const nz = (t, dur, { f = 4000, type = 'highpass', g = 0.12, q = 0.7, f1 = null, pan = 0, send = 0.04 } = {}) => at(t, () => {
    const n = noise(t, dur), flt = ac.createBiquadFilter();
    flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(flt).connect(a);
    out(a, 1, send, pan);
  });
  const kick = (t, g = 0.3) => { wave(t, 50, 0.08, { g, to: 30 }); nz(t, 0.03, { f: 1000, type: 'lowpass', g: 0.2 }); };
  const snare = (t, g = 0.2) => nz(t, 0.11, { f: 2200, type: 'bandpass', g, q: 0.55 });
  const hat = (t, g = 0.05) => nz(t, 0.025, { f: 7500, g });
  const blip = (t, m = 96, g = 0.1) => pulse(t, m, 0.035, { duty: 0.5, g, send: 0.01 });
  const select = (t) => { pulse(t, 84, 0.04, { duty: 0.5, g: 0.12 }); pulse(t + 0.04, 91, 0.06, { duty: 0.5, g: 0.12 }); };
  // GB "cry": pulse with wobbling bends + grit
  const cry = (t, m, { dur = 0.32, g = 0.17, fall = 0 } = {}) => {
    at(t, () => {
      const o = osc('square', hz(m), t, dur + 0.02);
      o.setPeriodicWave(pulseWave(0.5));
      const f = o.frequency;
      f.setValueAtTime(hz(m), t);
      f.linearRampToValueAtTime(hz(m + 7 - fall), t + dur * 0.2);
      f.linearRampToValueAtTime(hz(m + 2 - fall), t + dur * 0.45);
      f.linearRampToValueAtTime(hz(m + 5 - fall * 1.5), t + dur * 0.6);
      f.exponentialRampToValueAtTime(hz(m - 9 - fall * 2), t + dur);
      const l = osc('square', 28, t, dur), lg = ac.createGain();
      lg.gain.value = hz(m) * 0.05;
      l.connect(lg).connect(f);
      const a = ac.createGain();
      a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + 0.01);
      a.gain.setValueAtTime(g, t + dur * 0.7); a.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(a); out(a, 1, 0.06);
    });
    nz(t, dur * 0.8, { f: 1800, type: 'bandpass', g: 0.08, q: 1.2, f1: 700 });
  };

  // ================= TITLE (0 – 1.0) =================
  nz(0.0, 0.26, { f: 600, type: 'bandpass', f1: 7000, g: 0.05 });
  const L = 0.24; // logo lands
  kick(L, 0.45); nz(L, 0.5, { f: 3000, type: 'lowpass', f1: 200, g: 0.32, send: 0.12 }); wave(L, 43, 0.4, { g: 0.28, to: 31 });
  [67, 71, 74, 79, 83, 86].forEach((m, i) => pulse(L + 0.03 + i * 0.035, m, 0.05, { duty: 0.125, g: 0.14 }));
  [[0.44, [79, 83, 86]], [0.62, [81, 84, 88]]].forEach(([t, ch]) => ch.forEach((m, k) => pulse(t, m, 0.16, { duty: k ? 0.125 : 0.5, g: k ? 0.07 : 0.15 })));
  wave(0.44, 43, 0.17, { g: 0.2 }); wave(0.62, 45, 0.17, { g: 0.2 });
  pulse(0.8, 86, 0.08, { duty: 0.5, g: 0.14 }); wave(0.8, 47, 0.08, { g: 0.2 });
  // START pressed
  pulse(0.88, 91, 0.04, { duty: 0.5, g: 0.13 }); pulse(0.92, 98, 0.1, { duty: 0.5, g: 0.11, dec: 0.4 });

  // ================= ROUTE 42 (1.0 – 1.8) =================
  const R0 = ROUTE.t0, RE8 = 0.133; // brisk walking tune
  const routeMel = [[79, 1], [83, 1], [86, 2], [84, 1], [83, 1], [81, 2]];
  let s = 0;
  for (const [m, len] of routeMel) { const t = R0 + 0.02 + s * RE8; if (t < R0 + FLASH.t0) pulse(t, m, Math.min(len * RE8 * 0.9, R0 + FLASH.t0 - t), { duty: 0.25, g: 0.16, vib: len > 1 ? 0.5 : 0 }); s += len; }
  for (let e = 0; e < 6; e++) {
    const t = R0 + 0.02 + e * RE8;
    wave(t, [43, 50, 47, 50, 45, 50][e], RE8 * 0.8, { g: 0.19 });
    if (e % 2) [71, 74].forEach((m, k) => pulse(t, m, 0.06, { duty: 0.125, g: 0.045, pan: k ? 0.3 : -0.3 }));
    hat(t, e % 2 ? 0.04 : 0.025);
  }
  // grass rustles on steps into the tall grass; glint of the bald dome; the "!"
  for (let k = 2; k <= 3; k++) nz(R0 + (k - 1) * STEP + 0.02, 0.09, { f: 5000, type: 'bandpass', g: 0.12, q: 0.9, pan: 0.1 });
  pulse(R0 + 0.6, 100, 0.06, { duty: 0.125, g: 0.06 });
  pulse(R0 + 0.66, 88, 0.05, { duty: 0.5, g: 0.16 }); pulse(R0 + 0.71, 95, 0.1, { duty: 0.5, g: 0.16, dec: 0.5 });
  // encounter flashes + the battle intro run over the swirl
  const F0 = R0 + FLASH.t0;
  for (let i = 0; i < 6; i++) nz(F0 + i * 0.033, 0.03, { f: 3000 + i * 600, type: 'bandpass', g: 0.08 });
  const run = [88, 85, 82, 79, 76, 73, 70, 67, 64, 67, 70];
  run.forEach((m, i) => { pulse(F0 + i * 0.041, m, 0.045, { duty: 0.25, g: 0.16 }); pulse(F0 + i * 0.041 + 0.01, m - 12, 0.04, { duty: 0.125, g: 0.06, pan: 0.3 }); });
  wave(F0, 40, 0.45, { g: 0.22, to: 52 });
  nz(R0 + SWIRL.t0, 0.25, { f: 400, type: 'bandpass', f1: 5000, g: 0.09, q: 1.5 });

  // ================= WILD BATTLE (BATTLE0 → faint) =================
  const E8 = 0.18, BAR = E8 * 8, M0 = BATTLE0;
  const MEND = filmT(B.faintCry);
  const MEL = [
    [[76, 2], [79, 1], [78, 1], [76, 1], [74, 1], [71, 2]],
    [[72, 1], [74, 1], [76, 2], [79, 2], [76, 1], [74, 1]],
    [[74, 2], [78, 1], [81, 1], [79, 1], [78, 1], [74, 2]],
    [[75, 1], [78, 1], [81, 1], [83, 3], [81, 1], [78, 1]],
    [[76, 1], [76, 1], [83, 2], [81, 1], [79, 1], [78, 1], [79, 1]],
    [[84, 3], [83, 1], [81, 1], [79, 1], [76, 1], [79, 1]],
  ];
  const ROOTS = [40, 36, 38, 35, 40, 36];
  const CH = [[64, 67, 71], [64, 67, 72], [66, 69, 74], [63, 66, 71], [64, 67, 71], [64, 67, 72]];
  for (let b = 0; b < MEL.length; b++) {
    const t0 = M0 + b * BAR;
    if (t0 >= MEND) break;
    let ss = 0;
    for (const [m, len] of MEL[b]) {
      const t = t0 + ss * E8;
      if (t < MEND) pulse(t, m, Math.min(len * E8 * 0.9, MEND - t), { duty: 0.25, g: 0.19, vib: len > 1 ? 0.7 : 0, vr: 7 });
      ss += len;
    }
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * E8;
      if (t >= MEND) break;
      // driving octave bass with a chromatic pickup into the next bar
      const r = ROOTS[b], walk = e === 7 ? ROOTS[(b + 1) % ROOTS.length] + 1 : r + (e % 2 ? 12 : 0);
      wave(t, walk, E8 * 0.42, { g: 0.21 });
      wave(t + E8 / 2, r + 12, E8 * 0.3, { g: 0.14 });
      // harmony: 16th arpeggio on pulse 2
      for (let k = 0; k < 2; k++) { const tt = t + (k * E8) / 2; if (tt < MEND) pulse(tt, CH[b][(e * 2 + k) % 3], 0.05, { duty: 0.125, g: 0.045, pan: -0.3 }); }
      if (e === 0 || e === 3 || e === 4 || (e === 6 && b % 2)) kick(t);
      if (e === 2 || e === 6) snare(t);
      hat(t + E8 / 2, 0.035); hat(t, 0.02);
    }
  }
  // ---- battle SFX ----
  const T = filmT;
  cry(T(B.foeCry), 62, { g: 0.16 });
  nz(T(B.slide[0]), 0.38, { f: 2000, type: 'bandpass', f1: 600, g: 0.05 });
  // send-out: throw whistle, pop, sparkle, REMY's cry
  pulse(T(B.ball[0]), 72, B.ball[1] - B.ball[0], { duty: 0.125, g: 0.07, to: 88 });
  nz(T(B.pop), 0.2, { f: 3000, type: 'bandpass', g: 0.28, q: 0.7, f1: 900 }); kick(T(B.pop), 0.3);
  [91, 95, 98, 103].forEach((m, i) => pulse(T(B.pop) + 0.03 + i * 0.035, m, 0.05, { duty: 0.5, g: 0.07, pan: (i % 2 ? 0.3 : -0.3) }));
  cry(T(B.heroCry), 70, { dur: 0.26, g: 0.14 });
  // menus: cursor blips + A presses
  select(T(B.press1)); select(T(B.press2)); select(T(B.press3));
  B.steps2.forEach((g) => blip(T(g), 93, 0.08));
  // HAIR WHIP
  nz(T(B.lunge[0]), 0.12, { f: 1500, type: 'bandpass', f1: 4000, g: 0.1 });
  B.slashes.forEach((g, i) => {
    nz(T(g) - 0.05, 0.07, { f: 2500, type: 'bandpass', f1: 9000, g: 0.12, q: 1.2, pan: i % 2 ? 0.3 : -0.3 });
    nz(T(g), 0.13, { f: 1800, type: 'lowpass', f1: 300, g: 0.38 }); kick(T(g), 0.35);
    pulse(T(g), 64 - i * 2, 0.07, { duty: 0.5, g: 0.12, to: 48 });
  });
  nz(T(B.foeBlink1[0]), 0.06, { f: 2600, type: 'bandpass', g: 0.12 });
  // HEAD SHINE
  cry(T(B.shineHop[0]), 60, { dur: 0.18, g: 0.1 });
  [96, 100, 103, 108].forEach((m, i) => pulse(T(B.glint[0]) + i * 0.03, m, 0.08, { duty: 0.125, g: 0.08, dec: 0.4 }));
  nz(T(B.shineFlash[0]), 0.16, { f: 6000, g: 0.16, f1: 2000, type: 'bandpass', q: 0.5 });
  nz(T(B.heroBlink[0]), 0.14, { f: 1500, type: 'lowpass', f1: 250, g: 0.34 }); kick(T(B.heroBlink[0]), 0.35);
  // SUPER SHAMPOO
  pulse(T(B.bottle[0]), 60, 0.1, { duty: 0.25, g: 0.11, to: 79 });
  nz(T(B.stream[0]), B.stream[1] - B.stream[0], { f: 1200, type: 'bandpass', f1: 3500, g: 0.12, q: 2 });
  for (let i = 0; i < 16; i++) {
    const t = T(B.stream[0]) + i * 0.025 + (i % 3) * 0.004;
    pulse(t, 76 + ((i * 7) % 12), 0.03, { duty: 0.5, g: 0.05, to: 88 + ((i * 5) % 10), pan: ((i % 5) - 2) * 0.2 });
  }
  pulse(T(B.foam[0]), 60, B.impact - B.foam[0], { duty: 0.125, g: 0.07, to: 84 });
  // the super-effective hit: crunch, drop, stab
  const IM = T(B.impact);
  nz(IM, 0.55, { f: 4000, type: 'lowpass', f1: 150, g: 0.55, send: 0.15 }); kick(IM, 0.55); wave(IM, 40, 0.35, { g: 0.3, to: 28 });
  [52, 59, 64, 71].forEach((m, k) => pulse(IM, m, 0.22, { duty: k % 2 ? 0.125 : 0.5, g: 0.07, dec: 0.5 }));
  for (let i = 0; i < 9; i++) pulse(IM + 0.17 + i * 0.03, 90 + ((i * 5) % 9), 0.02, { duty: 0.5, g: 0.05, pan: ((i % 3) - 1) * 0.4 });
  nz(T(B.foeBlink2[0]), 0.06, { f: 2600, type: 'bandpass', g: 0.12 });
  // faint: low cry, falling slide, thud
  cry(T(B.faintCry), 58, { dur: 0.36, g: 0.15, fall: 6 });
  pulse(T(B.faintSlide[0]), 76, B.faintSlide[1] - B.faintSlide[0], { duty: 0.5, g: 0.1, to: 40 });
  kick(T(B.faintSlide[1]), 0.3); nz(T(B.faintSlide[1]), 0.12, { f: 900, type: 'lowpass', g: 0.2 });

  // ================= VICTORY (after "fainted!") =================
  const V0 = T(7.26), VE8 = 0.12;
  const VIC = [[72, 1], [76, 1], [79, 1], [84, 3], [83, 1], [81, 1], [79, 2], [81, 1], [83, 1], [84, 4], [79, 2], [76, 2], [79, 2], [74, 4]];
  const LV = T(B.lvUp);
  s = 0;
  for (const [m, len] of VIC) {
    const t = V0 + s * VE8;
    if (t >= LV - 0.02) break;
    pulse(t, m, Math.min(len * VE8 * 0.9, LV - t), { duty: 0.5, g: 0.15, vib: len > 2 ? 0.6 : 0 });
    s += len;
  }
  for (let e = 0; e < 40; e++) {
    const t = V0 + e * VE8;
    if (t >= LV - 0.02) break;
    wave(t, [48, 55, 52, 55][e % 4] + (e >= 8 && e < 16 ? 5 : e >= 16 ? 7 : 0), VE8 * 0.8, { g: 0.18 });
    if (e % 2) pulse(t, [64, 67][(e >> 1) % 2], 0.06, { duty: 0.125, g: 0.04, pan: 0.3 });
    if (e % 4 === 0) kick(t, 0.22); if (e % 4 === 2) snare(t, 0.12);
  }
  // EXP fill: the rising "zwee"
  pulse(T(B.expFill[0]), 60, B.expFill[1] - B.expFill[0], { duty: 0.25, g: 0.09, to: 96, dec: 1 });
  // LEVEL UP jingle
  [[0, 79, 0.08], [0.09, 79, 0.08], [0.18, 79, 0.08], [0.27, 84, 0.32]].forEach(([d, m, len]) => {
    pulse(LV + d, m, len, { duty: 0.5, g: 0.17, vib: len > 0.2 ? 0.8 : 0 });
    pulse(LV + d, m - 5, len, { duty: 0.125, g: 0.07, pan: 0.3 });
  });
  wave(LV, 48, 0.26, { g: 0.2 }); wave(LV + 0.27, 43, 0.3, { g: 0.2 });

  // ================= EVOLUTION =================
  const E0 = EVO0;
  const flick0 = E0 + EV.flick[0], rev = E0 + EV.reveal;
  // suspense: pedal + rising two-note figure
  for (let t = E0 + 0.05, i = 0; t < rev - 0.05; t += 0.18, i++) {
    const up = Math.min(7, Math.floor(i / 2));
    pulse(t, 64 + up, 0.08, { duty: 0.25, g: 0.1 }); pulse(t + 0.09, 69 + up, 0.08, { duty: 0.25, g: 0.09 });
    wave(t, 40, 0.16, { g: 0.17 });
    if (i % 2 === 0) nz(t, 0.05, { f: 6000, g: 0.03 });
  }
  nz(flick0, rev - flick0, { f: 500, type: 'bandpass', f1: 6000, g: 0.06, q: 2 });
  evoFlips.forEach((e, i) => pulse(E0 + e, i % 2 ? 91 : 86, 0.025, { duty: 0.5, g: 0.05, pan: i % 2 ? 0.3 : -0.3 }));
  // reveal
  nz(rev, 0.8, { f: 5000, type: 'lowpass', f1: 200, g: 0.5, send: 0.25 }); kick(rev, 0.5); wave(rev, 36, 0.5, { g: 0.3 });
  [72, 76, 79, 84, 88, 91].forEach((m, i) => pulse(rev + i * 0.03, m, 0.06, { duty: 0.125, g: 0.1 }));
  // congratulations fanfare
  const C0 = rev + 0.12, CE8 = 0.1;
  const FAN = [[72, 1], [72, 1], [72, 1], [76, 2], [79, 2], [84, 2], [83, 1], [84, 4]];
  s = 0;
  for (const [m, len] of FAN) {
    const t = C0 + s * CE8;
    pulse(t, m, len * CE8 * 0.9, { duty: 0.5, g: 0.16, vib: len > 2 ? 0.8 : 0 });
    pulse(t, m - 4, len * CE8 * 0.9, { duty: 0.125, g: 0.06, pan: 0.3 });
    s += len;
  }
  for (let e = 0; e < 14; e++) wave(C0 + e * CE8, [48, 55, 52, 55][e % 4] + (e >= 10 ? 5 : 0), CE8 * 0.8, { g: 0.17 });
  // end card: title motif sting + final chord
  const EC = E0 + EV.end;
  kick(EC, 0.4); nz(EC, 0.4, { f: 6000, type: 'lowpass', f1: 400, g: 0.25, send: 0.15 });
  [67, 71, 74, 79, 83, 86].forEach((m, i) => pulse(EC + i * 0.035, m, 0.05, { duty: 0.125, g: 0.13 }));
  [79, 83, 86, 91].forEach((m, k) => pulse(EC + 0.24, m, DURATION - EC - 0.3, { duty: k ? 0.125 : 0.5, g: k ? 0.06 : 0.13, vib: 1, dec: 0.8 }));
  wave(EC + 0.24, 43, DURATION - EC - 0.3, { g: 0.22 });
  snare(EC + 0.24, 0.2); nz(EC + 0.24, 0.6, { f: 7000, g: 0.05 });
}
