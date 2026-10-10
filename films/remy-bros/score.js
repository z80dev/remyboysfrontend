// 2A03-style score: pulse (12.5 / 25 / 50 % duty), triangle bass, noise drums, every SFX synthesized.
// Film-time aligned through choreo.filmT so each sound lands on its frame (hit-stops included).
import { INTRO, filmT, JUMPS, ENEMIES, FIRE_T, BRICK_G, PIT_COINS, POWER_G, Q1, Q2, KICK_G, SHELL_HITS, SHELL_CRASH, FIREWORKS, TALLY, FLAG_RISE } from './choreo.js';

const E8 = 0.2; // eighth note at 150 BPM
const BAR = E8 * 8;
const M0 = INTRO; // level music start
const M1 = filmT(10.2); // flag grab: music cuts

const MELODY = [
  [[76, 1], [76, 1], [0, 1], [79, 1], [0, 1], [76, 1], [72, 1], [74, 1]],
  [[76, 2], [72, 1], [69, 2], [0, 1], [71, 1], [72, 1]],
  [[74, 1], [74, 1], [0, 1], [77, 1], [0, 1], [74, 1], [72, 1], [69, 1]],
  [[71, 2], [67, 1], [74, 3], [0, 1], [79, 1]],
  [[79, 1], [76, 1], [79, 1], [81, 1], [79, 1], [76, 1], [72, 1], [76, 1]],
  [[81, 2], [79, 1], [76, 2], [72, 1], [74, 1], [76, 1]],
  [[77, 1], [81, 1], [84, 1], [81, 1], [77, 1], [0, 1], [81, 1], [79, 1]],
  [[79, 1], [81, 1], [83, 1], [86, 2], [83, 1], [84, 2]],
];
const CHORDS = [[48, [60, 64, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [59, 62, 67]]];

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit;
  const waves = {};
  const pulseWave = (duty) => {
    if (waves[duty]) return waves[duty];
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) { re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty); im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.sin(k * Math.PI * duty); }
    return (waves[duty] = ac.createPeriodicWave(re, im));
  };
  // ---- voices ----
  const pulse = (t, m, dur, { duty = 0.25, g = 0.18, pan = 0, to = null, send = 0.05, vib = 0, dec = 0.6 } = {}) => at(t, () => {
    const o = osc('square', hz(m), t, dur + 0.02);
    o.setPeriodicWave(pulseWave(duty));
    if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur);
    if (vib) {
      const l = osc('sine', 6, t, dur), lg = ac.createGain();
      lg.gain.value = hz(m) * 0.012 * vib;
      l.connect(lg).connect(o.frequency);
    }
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
  const snare = (t, g = 0.22) => { nz(t, 0.12, { f: 1800, type: 'bandpass', g, q: 0.6 }); tri(t, 50, 0.05, { g: 0.2, to: 40 }); };
  const hat = (t, g = 0.06, d = 0.03) => nz(t, d, { f: 7000, g });

  // ---- title card jingle ----
  nz(0.0, 0.5, { f: 800, type: 'bandpass', f1: 6000, g: 0.05 });
  kickD(0.36, 0.6); nz(0.36, 0.4, { f: 2500, type: 'lowpass', f1: 200, g: 0.35 }); tri(0.36, 40, 0.3, { g: 0.4, to: 28 });
  [72, 76, 79, 84, 88, 91].forEach((m, i) => pulse(0.42 + i * 0.05, m, 0.06, { duty: 0.125, g: 0.16 }));
  pulse(0.72, 91, 0.32, { duty: 0.25, g: 0.14, vib: 1 });
  [[0.6, 45], [0.68, 44], [0.76, 43]].forEach(([t, m]) => pulse(t, m, 0.08, { duty: 0.5, g: 0.12 }));
  pulse(0.92, 79, 0.08, { duty: 0.5, g: 0.16 }); pulse(1.0, 84, 0.34, { duty: 0.5, g: 0.16, dec: 0.7 });
  pulse(1.3, 83, 0.05, { duty: 0.5, g: 0.12 }); pulse(1.35, 88, 0.12, { duty: 0.5, g: 0.12 });

  // ---- level music ----
  const intense = filmT(4.3); // after the power-up the arranger opens up
  for (let b = 0; b < 8; b++) {
    const t0 = M0 + b * BAR;
    if (t0 >= M1) break;
    const [root, chord] = CHORDS[b % 4];
    let s = 0;
    for (const [m, len] of MELODY[b]) {
      const t = t0 + s * E8;
      if (m && t < M1) pulse(t, m, Math.min(len * E8 * 0.9, M1 - t), { duty: 0.25, g: 0.21, vib: len > 1 ? 0.6 : 0 });
      if (m && t < M1 && t >= intense) pulse(t + 0.012, m - 12, Math.min(len * E8 * 0.85, M1 - t - 0.012), { duty: 0.125, g: 0.05, pan: 0.25 });
      s += len;
    }
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * E8;
      if (t >= M1) break;
      tri(t, root + (e % 2 ? 12 : 0), E8 * 0.85, { g: 0.2 });
      if (e % 2) chord.slice(1).forEach((m, k) => pulse(t, m, 0.07, { duty: 0.125, g: 0.045, pan: k ? 0.3 : -0.3 }));
      if (e === 0 || e === 4 || (e === 5 && b % 2)) kickD(t);
      if (e === 2 || e === 6) snare(t);
      hat(t + (e % 2 ? 0 : 0), e % 2 ? 0.05 : 0.03);
      if (b === 3 && e >= 6) { snare(t + E8 / 2, 0.16); }
      if (t >= intense) {
        // 16th arpeggio counter-line
        for (let k = 0; k < 2; k++) {
          const tt = t + k * E8 / 2;
          if (tt < M1) pulse(tt, chord[(e * 2 + k) % 3] + 12, 0.06, { duty: 0.125, g: 0.035, pan: -0.35 });
        }
      }
    }
  }

  // ---- SFX ----
  const T = filmT;
  const jumpS = (t, big = false) => pulse(t, big ? 62 : 67, big ? 0.22 : 0.15, { duty: 0.25, g: 0.2, to: big ? 91 : 86, send: 0.02 });
  const stompS = (t) => { pulse(t, 79, 0.11, { duty: 0.5, g: 0.22, to: 52 }); nz(t, 0.08, { f: 900, type: 'lowpass', g: 0.35 }); kickD(t, 0.5); };
  const coinS = (t, g = 0.16) => { pulse(t, 83, 0.06, { duty: 0.5, g }); pulse(t + 0.06, 88, 0.36, { duty: 0.5, g, dec: 0.5 }); };
  const bonkS = (t) => { tri(t, 45, 0.08, { g: 0.45, to: 33 }); nz(t, 0.05, { f: 600, type: 'lowpass', g: 0.25 }); };
  const kickS = (t, m = 60) => { nz(t, 0.1, { f: 2400, type: 'bandpass', g: 0.32, q: 1 }); pulse(t, m, 0.07, { duty: 0.5, g: 0.18, to: m - 20 }); };

  pulse(M0, 55, 0.08, { duty: 0.5, g: 0.16 }); pulse(M0 + 0.1, 50, 0.08, { duty: 0.5, g: 0.16 }); pulse(M0 + 0.2, 55, 0.08, { duty: 0.5, g: 0.16 }); pulse(M0 + 0.3, 62, 0.12, { duty: 0.5, g: 0.16 });
  const stompG = new Set(ENEMIES.map((e) => e.gh));
  for (const j of JUMPS) {
    if (stompG.has(j.t0)) continue;
    jumpS(T(j.t0), j.t0 > 9.5 && j.t0 < 9.7);
  }
  bonkS(T(Q1.hit)); coinS(T(Q1.hit));
  bonkS(T(Q2.hit));
  tri(T(Q2.hit) + 0.04, 55, 0.4, { g: 0.3, to: 79 });
  for (const e of ENEMIES) if (e.death === 'stomp') stompS(T(e.gh));
  // power-up: rising arpeggio across the freeze
  [60, 64, 67, 72, 64, 67, 72, 76, 67, 72, 76, 79, 84].forEach((m, i) => pulse(T(POWER_G) + i * 0.042, m, 0.05, { duty: i % 2 ? 0.125 : 0.25, g: 0.18 }));
  nz(T(POWER_G), 0.6, { f: 400, type: 'bandpass', f1: 8000, g: 0.08 });
  FIRE_T.forEach((tf) => { pulse(T(tf), 84, 0.07, { duty: 0.25, g: 0.16, to: 60 }); nz(T(tf), 0.05, { f: 5000, g: 0.08 }); });
  ENEMIES.filter((e) => e.death === 'fire').forEach((e) => kickS(T(e.gh), 58));
  // bricks
  nz(T(BRICK_G), 0.35, { f: 3000, type: 'lowpass', f1: 300, g: 0.45 }); bonkS(T(BRICK_G));
  [0.04, 0.09, 0.15].forEach((d) => nz(T(BRICK_G) + d, 0.05, { f: 1500, type: 'bandpass', g: 0.2, q: 2 }));
  PIT_COINS.forEach((c, i) => coinS(T(c.g), 0.12 + i * 0.01));
  // shell
  kickS(T(KICK_G), 48); kickD(T(KICK_G), 0.6);
  SHELL_HITS.forEach((g, i) => { kickS(T(g), 64 + i * 4); pulse(T(g), [76, 79, 83, 88][i], 0.08, { duty: 0.25, g: 0.14 }); });
  [79, 83, 86, 91, 88, 95].forEach((m, i) => pulse(T(SHELL_HITS[3]) + 0.1 + i * 0.07, m, 0.07, { duty: 0.5, g: 0.16 }));
  nz(T(SHELL_CRASH), 0.5, { f: 1800, type: 'lowpass', f1: 120, g: 0.5 }); kickD(T(SHELL_CRASH), 0.7);
  // flag grab + slide
  kickD(M1, 0.7); nz(M1, 0.3, { f: 3000, type: 'bandpass', g: 0.25, q: 0.8 }); pulse(M1, 96, 0.25, { duty: 0.125, g: 0.14, dec: 0.4 });
  const slide0 = T(10.2) + 0.1, slide1 = T(10.75);
  for (let i = 0, n = 14; i < n; i++) pulse(slide0 + ((slide1 - slide0) * i) / n, 91 - i * 2, (slide1 - slide0) / n, { duty: 0.25, g: 0.13 });
  bonkS(slide1);
  // course clear fanfare
  const F0 = T(10.86);
  const fan = [[72, 76, 79, 84], [77, 81, 84, 89], [79, 83, 86, 91]];
  fan.forEach((grp, k) => {
    grp.forEach((m, i) => pulse(F0 + k * 0.28 + i * 0.06, m, 0.07, { duty: 0.5, g: 0.17 }));
    tri(F0 + k * 0.28, [48, 53, 55][k], 0.26, { g: 0.34 });
    kickD(F0 + k * 0.28, 0.4);
  });
  const FC = F0 + 0.84;
  [84, 88, 91].forEach((m, i) => pulse(FC, m, 0.85, { duty: i ? 0.125 : 0.5, g: 0.13, vib: 1, dec: 0.8 }));
  tri(FC, 36, 0.85, { g: 0.36 }); snare(FC, 0.25); nz(FC, 0.8, { f: 6000, g: 0.06 });
  // time tally ticks
  for (let t = T(TALLY.t0); t < T(TALLY.t1); t += 0.06) pulse(t, 96, 0.025, { duty: 0.5, g: 0.04, pan: 0.2 });
  pulse(T(FLAG_RISE.t0), 79, 0.3, { duty: 0.25, g: 0.08, to: 91 });
  // fireworks: whistle up, boom, crackle
  FIREWORKS.forEach((g, i) => {
    const t = T(g), b = t + 0.28 * 1;
    pulse(t, 84, 0.26, { duty: 0.125, g: 0.05, to: 96, pan: [-0.4, 0.4, 0][i] });
    nz(b, 0.6, { f: 2000, type: 'lowpass', f1: 90, g: 0.55, pan: [-0.4, 0.4, 0][i], send: 0.2 });
    tri(b, 40, 0.25, { g: 0.4, to: 26 });
    for (let k = 0; k < 6; k++) nz(b + 0.12 + k * 0.07 + (k % 2) * 0.02, 0.03, { f: 6000, g: 0.08, pan: (k % 3 - 1) * 0.5 });
  });
}
