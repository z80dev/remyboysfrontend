// Arcade score: pulse (12.5 / 25 / 50 % duty), triangle bass, noise drums, every SFX synthesized.
// Film-time aligned through choreo.filmT so each sound lands on its frame (hit-stops included).
import {
  T_TITLE, INTRO, filmT, ROUTE, JUMPS, JUMP_D, HAMMER, SMASH, BARRELS, THROWS, POUNDS, burnTimes, RIVETS, COLLAPSE,
  KONG_FALL, HEART_G, CLEAR_G, TALLY, IRIS, TOP_G, MINION, STOPS, DURATION,
} from './choreo.js';
import { KONG_LAND } from './cards.js';

const E8 = 0.2, BAR = E8 * 8;
const STAGE = [
  [[69, 1], [72, 1], [76, 2], [74, 1], [72, 1], [71, 1], [72, 1]],
  [[69, 2], [65, 1], [69, 1], [72, 2], [0, 1], [72, 1]],
  [[74, 1], [71, 1], [67, 1], [71, 1], [74, 2], [76, 1], [74, 1]],
  [[71, 2], [68, 1], [71, 1], [76, 3], [0, 1]],
  [[81, 1], [84, 1], [88, 2], [86, 1], [84, 1], [83, 1], [84, 1]],
  [[81, 2], [77, 1], [81, 1], [84, 2], [0, 1], [84, 1]],
];
const ROOTS = [45, 41, 43, 40];

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit;
  const waves = {};
  const pulseWave = (duty) => {
    if (waves[duty]) return waves[duty];
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) { re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty); im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.sin(k * Math.PI * duty); }
    return (waves[duty] = ac.createPeriodicWave(re, im));
  };
  const pulse = (t, m, dur, { duty = 0.25, g = 0.18, pan = 0, to = null, send = 0.05, vib = 0, dec = 0.6 } = {}) => at(t, () => {
    const o = osc('square', hz(m), t, dur + 0.02);
    o.setPeriodicWave(pulseWave(duty));
    if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur);
    if (vib) { const l = osc('sine', 6, t, dur), lg = ac.createGain(); lg.gain.value = hz(m) * 0.012 * vib; l.connect(lg).connect(o.frequency); }
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.linearRampToValueAtTime(g * dec, t + Math.min(dur * 0.5, 0.08));
    a.gain.setValueAtTime(g * dec, t + Math.max(0.005, dur - 0.012));
    a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(a);
    out(a, 1, send, pan);
  });
  const tri = (t, m, dur, { g = 0.32, to = null } = {}) => at(t, () => {
    const o = osc('triangle', hz(m), t, dur + 0.02);
    if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.setValueAtTime(g, t + Math.max(0.005, dur - 0.015));
    a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(a);
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
  const kickD = (t, g = 0.38) => { tri(t, 52, 0.09, { g, to: 28 }); nz(t, 0.03, { f: 1200, type: 'lowpass', g: 0.22 }); };
  const snare = (t, g = 0.2) => { nz(t, 0.12, { f: 1800, type: 'bandpass', g, q: 0.6 }); tri(t, 50, 0.05, { g: 0.18, to: 40 }); };
  const hat = (t, g = 0.05, d = 0.03) => nz(t, d, { f: 7000, g });
  const tom = (t, m = 40, g = 0.42) => { tri(t, m, 0.12, { g, to: m - 10 }); nz(t, 0.05, { f: 500, type: 'lowpass', g: 0.25 }); };
  const T = filmT;

  // ================= title =================
  pulse(0.02, 88, 0.05, { duty: 0.5, g: 0.16 }); pulse(0.07, 95, 0.3, { duty: 0.5, g: 0.15, dec: 0.5 }); // coin in
  for (let i = 0; i < 18; i++) pulse(0.05 + i * 0.03, 60 + i * 2, 0.025, { duty: 0.125, g: 0.08, pan: (i % 2 ? 0.3 : -0.3) });
  tri(0.3, 40, 0.3, { g: 0.25, to: 64 }); nz(0.3, 0.3, { f: 300, type: 'bandpass', f1: 3000, g: 0.08 }); // the leap
  kickD(KONG_LAND, 0.7); nz(KONG_LAND, 0.45, { f: 2400, type: 'lowpass', f1: 150, g: 0.45 }); tri(KONG_LAND, 36, 0.35, { g: 0.4, to: 26 });
  for (let t = KONG_LAND + 0.15; t < T_TITLE - 0.05; t += 0.15) tom(t, (Math.round((t - KONG_LAND) / 0.15) % 2) ? 43 : 40, 0.32);
  [[0.76, 72, 0.08], [0.86, 79, 0.08], [0.96, 84, 0.08], [1.06, 83, 0.08], [1.16, 84, 0.3]].forEach(([t, m, d]) => {
    pulse(t, m, d, { duty: 0.5, g: 0.17 }); pulse(t + 0.01, m - 12, d, { duty: 0.25, g: 0.06, pan: 0.3 });
  });
  tri(0.76, 48, 0.36, { g: 0.24 }); tri(1.16, 43, 0.3, { g: 0.24 });

  // ================= how much hair =================
  const H0 = T_TITLE + 0.04;
  [[0, 67], [0.1, 72], [0.2, 76], [0.3, 72], [0.4, 79], [0.5, 76], [0.6, 81], [0.7, 79]].forEach(([d, m]) => pulse(H0 + d, m, 0.085, { duty: 0.5, g: 0.18 }));
  [[0, 48], [0.2, 52], [0.4, 53], [0.6, 55]].forEach(([d, m]) => tri(H0 + d, m, 0.18, { g: 0.22 }));
  [84, 88, 91].forEach((m, i) => pulse(H0 + 0.82, m, 0.3, { duty: i ? 0.125 : 0.5, g: 0.12, vib: 1, dec: 0.8 }));
  tri(H0 + 0.82, 36, 0.3, { g: 0.26 }); kickD(H0 + 0.82, 0.4);
  for (let k = 0; k < 4; k++) hat(H0 + k * 0.2, 0.04);

  // ================= stage =================
  const ham0 = T(HAMMER.grab) + 0.32, ham1 = T(HAMMER.end), stop = T(TOP_G);
  const inHammer = (t) => t >= T(HAMMER.grab) && t < ham1;
  const M0 = INTRO;
  for (let b = 0; b < 8; b++) {
    const t0 = M0 + b * BAR;
    if (t0 >= stop) break;
    const root = ROOTS[b % 4];
    let s = 0;
    for (const [m, len] of STAGE[b < 4 ? b : b === 4 ? 4 : b === 5 ? 5 : b - 4]) {
      const t = t0 + s * E8;
      const d = Math.min(len * E8 * 0.85, stop - t);
      if (m && t < stop && !inHammer(t) && d > 0.02) pulse(t, m, d, { duty: 0.25, g: 0.19, vib: len > 1 ? 0.5 : 0 });
      s += len;
    }
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * E8;
      if (t >= stop) break;
      if (inHammer(t)) continue;
      tri(t, root + [0, 12, 7, 12, 0, 12, 7, 12][e], E8 * 0.8, { g: 0.2 });
      if (e % 2) pulse(t, root + 24 + (e % 4 === 1 ? 3 : 7), 0.06, { duty: 0.125, g: 0.04, pan: 0.3 });
      if (e === 0 || e === 4) kickD(t, 0.32);
      if (e === 2 || e === 6) snare(t, 0.14);
      hat(t, e % 2 ? 0.04 : 0.025);
    }
  }
  // hammer theme: urgent 16ths in C, double time
  const HF = [[72, 76, 79, 76], [74, 77, 81, 77], [76, 79, 84, 79], [77, 81, 86, 84]];
  for (let i = 0, t = ham0; t < ham1 - 0.02; i++, t += 0.1) {
    const beat = Math.floor(i / 4), m = HF[beat % 4][i % 4];
    pulse(t, m, 0.075, { duty: 0.125, g: 0.15, pan: -0.1 });
    if (i % 2 === 0) tri(t, [48, 50, 52, 53][beat % 4] + (i % 4 ? 12 : 0), 0.09, { g: 0.2 });
    if (i % 4 === 0) kickD(t, 0.34);
    if (i % 8 === 4) snare(t, 0.16);
    hat(t, 0.03, 0.02);
  }
  // ---- footsteps (the walk tick) and ladder rungs ----
  for (const s of ROUTE) {
    if (s.t0 > TOP_G + 1) break;
    if (s.k === 'walk') for (let g = s.t0; g < s.t1; g += 0.1) {
      if (JUMPS.some((j) => Math.abs(g - j.apex) < JUMP_D / 2)) continue;
      const k = Math.round((g - s.t0) / 0.1) % 2;
      pulse(T(g), k ? 50 : 45, 0.03, { duty: 0.5, g: 0.07 }); nz(T(g), 0.02, { f: 3000, g: 0.05 });
    }
    if (s.k === 'climb') for (let g = s.t0; g < s.t1; g += 0.09) pulse(T(g), 57, 0.025, { duty: 0.25, g: 0.05 });
  }
  // ---- jumps ----
  for (const j of JUMPS) {
    pulse(T(j.apex - JUMP_D / 2), 64, 0.14, { duty: 0.25, g: 0.16, to: 83, send: 0.02 });
    if (j.pts) { pulse(T(j.apex), 84, 0.05, { duty: 0.5, g: 0.13 }); pulse(T(j.apex) + 0.05, 91, 0.22, { duty: 0.5, g: 0.13, dec: 0.5 }); }
    tri(T(j.apex + JUMP_D / 2), 43, 0.05, { g: 0.2, to: 36 });
  }
  // ---- hammer grab: rising arpeggio across the freeze ----
  [60, 64, 67, 72, 76, 79, 84, 88].forEach((m, i) => pulse(T(HAMMER.grab) + i * 0.035, m, 0.045, { duty: i % 2 ? 0.125 : 0.25, g: 0.17 }));
  nz(T(HAMMER.grab), 0.35, { f: 400, type: 'bandpass', f1: 8000, g: 0.08 });
  // hammer runs out: warning blips
  for (let t = T(HAMMER.end - 0.45); t < ham1; t += 0.12) pulse(t, 96, 0.03, { duty: 0.5, g: 0.06 });
  // ---- smashes ----
  SMASH.forEach((g, i) => {
    const t = T(g);
    nz(t, 0.16, { f: 2600, type: 'bandpass', g: 0.4, q: 0.9, f1: 500 }); kickD(t, 0.55);
    pulse(t, [79, 83, 86, 88][i], 0.09, { duty: 0.25, g: 0.15 }); pulse(t + 0.08, [86, 88, 91, 95][i], 0.12, { duty: 0.5, g: 0.12 });
    if (i < 2) for (const d of [0.03, 0.07, 0.12]) nz(t + d, 0.04, { f: 1400, type: 'bandpass', g: 0.16, q: 2 });
    if (i === 3) { nz(t, 0.4, { f: 2000, type: 'lowpass', f1: 120, g: 0.4 }); pulse(t + 0.18, 76, 0.2, { duty: 0.125, g: 0.08, to: 52 }); }
  });
  // ---- Kong: throws, pounds ----
  for (const t0 of THROWS) {
    if (t0 > COLLAPSE) continue;
    tom(T(t0 - 0.32), 38, 0.18); // heave
    nz(T(t0 - 0.06), 0.18, { f: 600, type: 'bandpass', f1: 3500, g: 0.1, q: 1.2 }); // swing
    tri(T(t0), 45, 0.05, { g: 0.2, to: 40 });
  }
  for (const [a, b] of POUNDS) for (let g = a; g < b; g += 0.15) tom(T(g), (Math.round((g - a) / 0.15) % 2) ? 43 : 40, 0.26);
  // barrels hitting girders after a drop (only once the stage runs)
  for (const b of BARRELS) for (const l of b.legs) if (l.k === 'fall' && l.t1 > 0.05 && l.t1 < COLLAPSE) tri(T(l.t1), 36, 0.06, { g: 0.13, to: 30 });
  // oil drum flares
  for (const g of burnTimes()) if (g > 0) { nz(T(g), 0.5, { f: 300, type: 'bandpass', f1: 2400, g: 0.22, q: 0.6 }); pulse(T(g), 52, 0.2, { duty: 0.5, g: 0.06, to: 40 }); }
  // minion pops out
  pulse(T(MINION.born), 60, 0.16, { duty: 0.25, g: 0.1, to: 84 });

  // ================= the fall =================
  const top = T(TOP_G);
  [[0, 72], [0.07, 76], [0.14, 79], [0.21, 84]].forEach(([d, m]) => pulse(top + d, m, 0.07, { duty: 0.5, g: 0.15 }));
  RIVETS.forEach((r, i) => { pulse(T(r.pop), 96 - i, 0.05, { duty: 0.25, g: 0.12, pan: r.x < 480 ? -0.4 : 0.4 }); pulse(T(r.pop) + 0.03, 88 - i, 0.04, { duty: 0.5, g: 0.06 }); });
  nz(T(COLLAPSE), 0.9, { f: 900, type: 'lowpass', f1: 80, g: 0.5, send: 0.15 });
  tri(T(COLLAPSE), 33, 0.6, { g: 0.3, to: 26 });
  for (let k = 0; k < 6; k++) nz(T(COLLAPSE) + 0.05 + k * 0.07, 0.06, { f: 1200, type: 'bandpass', g: 0.14, q: 1.5, pan: (k % 2 ? 0.4 : -0.4) });
  const f0 = T(KONG_FALL.t0), f1 = T(KONG_FALL.t1);
  pulse(f0, 88, f1 - f0, { duty: 0.125, g: 0.13, to: 52, vib: 0.4 });
  pulse(f0, 76, f1 - f0, { duty: 0.5, g: 0.06, to: 40 });
  kickD(f1, 0.9); tri(f1, 33, 0.5, { g: 0.5, to: 24 }); nz(f1, 0.8, { f: 2500, type: 'lowpass', f1: 70, g: 0.7, send: 0.2 });
  nz(f1 + 0.02, 0.3, { f: 5000, type: 'highpass', g: 0.08 });
  // dizzy wobble
  for (let k = 0; k < 6; k++) pulse(f1 + 0.25 + k * 0.1, k % 2 ? 79 : 76, 0.06, { duty: 0.125, g: 0.05, pan: k % 2 ? 0.4 : -0.4 });

  // ================= heart + clear =================
  const h = T(HEART_G);
  [76, 79, 84, 88, 91, 96].forEach((m, i) => pulse(h + i * 0.04, m, 0.05, { duty: 0.25, g: 0.13 }));
  const FAN = [[0.28, 72, 48], [0.43, 76, 52], [0.58, 79, 55], [0.73, 84, 60]];
  FAN.forEach(([d, m, b]) => { pulse(h + d, m, 0.12, { duty: 0.5, g: 0.18 }); pulse(h + d + 0.01, m - 5, 0.12, { duty: 0.25, g: 0.06, pan: 0.3 }); tri(h + d, b - 12, 0.13, { g: 0.24 }); kickD(h + d, 0.3); });
  const FC = h + 0.9;
  [84, 88, 91].forEach((m, i) => pulse(FC, m, 1.0, { duty: i ? 0.125 : 0.5, g: 0.12, vib: 1, dec: 0.75 }));
  tri(FC, 36, 1.0, { g: 0.3 }); snare(FC, 0.2); nz(FC, 0.9, { f: 6000, g: 0.05 });
  for (let t = T(TALLY.t0); t < T(TALLY.t1); t += 0.05) pulse(t, 96, 0.02, { duty: 0.5, g: 0.035, pan: 0.25 });
  // iris close and the end sting
  const i0 = T(IRIS.t0), i1 = T(IRIS.t1);
  for (let k = 0; k < 6; k++) pulse(i0 + k * ((i1 - i0) / 6), 84 - k * 3, 0.05, { duty: 0.25, g: 0.08 });
  pulse(i1 + 0.02, 72, 0.5, { duty: 0.5, g: 0.1, dec: 0.5 }); pulse(i1 + 0.02, 76, 0.5, { duty: 0.125, g: 0.06 }); tri(i1 + 0.02, 48, 0.5, { g: 0.22 });
}
