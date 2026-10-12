// 2A03-style score, all original: title fanfare, overworld march, dungeon ostinato, boss loop, secret chime,
// item-get fanfare and every SFX. Film-time aligned through choreo.filmT so each sound lands on its frame.
import {
  INTRO, filmT, SLASHES, SPIN, HURT, PUSH, LEAP, HOLD, DASH, GRASS, ENEMIES, DIE_G, PICKUPS, REFILL, CHIME, SHUTTER_OPEN,
  SHUTTER_CLOSE, ROAR, SPEAR, CHARGE, BOSS_HITS, BOSS_DIE, TONIC, TEXT, IRIS_OUT, FADE_DUN, hudLife,
} from './choreo.js';

const S16 = 0.1; // sixteenth at 150 BPM
const BAR = S16 * 16;
const M0 = INTRO, M1 = filmT(FADE_DUN.t0);

// overworld march (G major): [midi, sixteenths]
const MELODY = [
  [[67, 3], [74, 1], [74, 4], [72, 2], [71, 2], [72, 4]],
  [[69, 3], [71, 1], [72, 2], [74, 2], [76, 6], [0, 2]],
  [[79, 3], [78, 1], [76, 2], [74, 2], [72, 3], [71, 1], [69, 4]],
  [[74, 2], [74, 1], [74, 1], [78, 4], [79, 6], [0, 2]],
];
// half-bar chords: [bass root, triad]
const CHORDS = [
  [[43, [67, 71, 74]], [47, [67, 71, 74]]],
  [[45, [69, 72, 76]], [48, [67, 72, 76]]],
  [[40, [67, 71, 76]], [38, [66, 69, 74]]],
  [[38, [66, 69, 74]], [43, [67, 71, 74]]],
];

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
  const tri = (t, m, dur, { g = 0.3, to = null, send = 0.02 } = {}) => at(t, () => {
    const o = osc('triangle', hz(m), t, dur + 0.02);
    if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.setValueAtTime(g, t + Math.max(0.005, dur - 0.015));
    a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(a);
    out(a, 1, send);
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
  const kickD = (t, g = 0.36) => { tri(t, 52, 0.09, { g, to: 28 }); nz(t, 0.03, { f: 1200, type: 'lowpass', g: 0.2 }); };
  const snare = (t, g = 0.2) => { nz(t, 0.11, { f: 1800, type: 'bandpass', g, q: 0.6 }); tri(t, 50, 0.05, { g: 0.18, to: 40 }); };
  const hat = (t, g = 0.05, d = 0.03) => nz(t, d, { f: 7000, g });
  const T = filmT;

  // ================= TITLE =================
  nz(0.0, 0.3, { f: 400, type: 'bandpass', f1: 5000, g: 0.12, q: 1.2 }); // sword falling
  pulse(0.02, 96, 0.28, { duty: 0.125, g: 0.06, to: 72 });
  kickD(0.3, 0.7); nz(0.3, 0.6, { f: 3000, type: 'lowpass', f1: 150, g: 0.45 }); tri(0.3, 38, 0.4, { g: 0.42, to: 26 });
  pulse(0.3, 103, 0.5, { duty: 0.125, g: 0.08, dec: 0.3 }); pulse(0.3, 98, 0.5, { duty: 0.125, g: 0.06, dec: 0.3, pan: 0.3 });
  // original title motif
  const TM = [[0.36, 74, 0.11], [0.48, 79, 0.11], [0.6, 81, 0.07], [0.68, 83, 0.26], [0.95, 81, 0.07], [1.03, 79, 0.07], [1.11, 86, 0.3]];
  TM.forEach(([t, m, d]) => { pulse(t, m, d, { duty: 0.5, g: 0.17, vib: d > 0.2 ? 1 : 0, dec: 0.75 }); pulse(t + 0.015, m - 12, d, { duty: 0.125, g: 0.05, pan: -0.3 }); });
  [[0.34, 43, 0.33], [0.68, 40, 0.26], [0.95, 48, 0.15], [1.11, 50, 0.3]].forEach(([t, m, d]) => tri(t, m, d, { g: 0.28 }));
  [[0.68, [67, 71, 76]], [0.95, [67, 72, 76]], [1.11, [66, 69, 74]]].forEach(([t, ch]) => ch.forEach((m, k) => pulse(t, m, 0.08, { duty: 0.125, g: 0.05, pan: k - 1 })));
  snare(0.95, 0.12); snare(1.03, 0.12); snare(1.11, 0.18);
  // PRESS START
  pulse(1.38, 88, 0.05, { duty: 0.5, g: 0.14 }); pulse(1.43, 95, 0.12, { duty: 0.5, g: 0.14 });
  nz(1.38, 0.15, { f: 2000, f1: 8000, type: 'bandpass', g: 0.06 });

  // ================= OVERWORLD MARCH =================
  for (let b = 0; b < 4; b++) {
    const t0 = M0 + b * BAR;
    let s = 0;
    for (const [m, len] of MELODY[b]) {
      const t = t0 + s * S16;
      if (m && t < M1) {
        const d = Math.min(len * S16 * 0.92, M1 - t);
        pulse(t, m, d, { duty: 0.25, g: 0.2, vib: len > 3 ? 0.7 : 0, dec: 0.7 });
        pulse(t + 0.02, m, d, { duty: 0.125, g: 0.045, pan: 0.35, send: 0.15 }); // echo
      }
      s += len;
    }
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * 2 * S16;
      if (t >= M1) break;
      const [root, chord] = CHORDS[b][e < 4 ? 0 : 1];
      tri(t, root + (e % 2 ? 12 : 0), 2 * S16 * 0.85, { g: 0.2 });
      // 16th arpeggio counter-line
      for (let k = 0; k < 2; k++) { const tt = t + k * S16; if (tt < M1) pulse(tt, chord[(e * 2 + k) % 3], 0.06, { duty: 0.125, g: 0.032, pan: -0.35 }); }
      if (e % 4 === 0) kickD(t, 0.3);
      if (e % 4 === 2) snare(t, 0.16);
      hat(t + S16, 0.035);
      if (b === 3 && e >= 4) { snare(t + S16, 0.1); }
    }
  }

  // ================= DUNGEON =================
  const D0 = T(FADE_DUN.t1), D1 = T(SHUTTER_CLOSE.t0);
  const DB = [38, 38, 45, 50, 49, 50, 45, 41];
  for (let i = 0, t = D0; t < D1; i++, t += 0.15) {
    tri(t, DB[i % 8], 0.13, { g: 0.22 });
    if (i % 4 === 0) pulse(t, [86, 85, 82, 81][(i / 4) % 4], 0.3, { duty: 0.125, g: 0.035, vib: 1.5, send: 0.3, pan: 0.3 });
    if (i % 2 === 1) hat(t, 0.025);
    if (i % 8 === 0) kickD(t, 0.22);
  }

  // ================= BOSS =================
  const B0 = T(SHUTTER_CLOSE.t1), B1 = T(BOSS_HITS[2]);
  const BB = [40, 52, 40, 53, 40, 52, 40, 51];
  for (let i = 0, t = B0 + 0.3; t < B1; i++, t += 0.08) {
    tri(t, BB[i % 8], 0.07, { g: 0.22 });
    if (i % 4 === 0) kickD(t, 0.3);
    if (i % 8 === 4) snare(t, 0.16);
    if (i % 2 === 1) hat(t, 0.03);
  }
  const BL = [[0, 71, 2], [2, 72, 2], [4, 71, 2], [6, 70, 2], [8, 71, 4], [12, 76, 4], [16, 75, 2], [18, 76, 2], [20, 79, 4], [24, 78, 8]];
  for (const [s, m, len] of BL) { const t = B0 + 0.3 + s * 0.08; if (t < B1) pulse(t, m, Math.min(len * 0.08 * 0.9, B1 - t), { duty: 0.25, g: 0.15, vib: len > 3 ? 1 : 0 }); }

  // ================= SFX =================
  const swing = (t, hi = false) => { nz(t, 0.1, { f: 900, f1: 6000, type: 'bandpass', g: 0.22, q: 1.4 }); pulse(t, hi ? 84 : 79, 0.06, { duty: 0.5, g: 0.08, to: 67 }); };
  const hitS = (t, g = 1) => { pulse(t, 62, 0.08, { duty: 0.5, g: 0.22 * g, to: 36 }); nz(t, 0.09, { f: 1100, type: 'lowpass', g: 0.4 * g }); kickD(t, 0.45 * g); nz(t, 0.04, { f: 4000, g: 0.15 * g }); };
  const poofS = (t) => { nz(t, 0.28, { f: 3200, f1: 300, type: 'bandpass', g: 0.22, q: 0.8 }); [84, 79, 72].forEach((m, i) => pulse(t + i * 0.03, m, 0.03, { duty: 0.125, g: 0.06 })); };
  const gemS = (t, v) => { const b = v === 5 ? 91 : 88; pulse(t, b, 0.05, { duty: 0.5, g: 0.14 }); pulse(t + 0.05, b + 7, 0.22, { duty: 0.5, g: 0.13, dec: 0.5 }); if (v === 5) pulse(t + 0.1, b + 12, 0.18, { duty: 0.5, g: 0.1, dec: 0.5 }); };
  const heartS = (t) => [84, 88, 91, 96].forEach((m, i) => pulse(t + i * 0.045, m, 0.08, { duty: 0.25, g: 0.12 }));

  for (const s of SLASHES) swing(T(s.g), s.dir === 'up');
  for (const e of ENEMIES) {
    if (e.hit !== SPIN.hit) hitS(T(e.hit));
    poofS(T(e.hit + DIE_G));
    if (e.spawn > 0) nz(T(e.spawn), 0.25, { f: 1500, f1: 400, type: 'bandpass', g: 0.08 });
    if (e.spit) { pulse(T(e.spit), 70, 0.07, { duty: 0.5, g: 0.14, to: 84 }); nz(T(e.spit), 0.05, { f: 2000, type: 'bandpass', g: 0.15 }); }
  }
  // grass cut
  nz(T(GRASS[0].cut), 0.14, { f: 5000, g: 0.22 }); nz(T(GRASS[0].cut) + 0.05, 0.08, { f: 3500, type: 'bandpass', g: 0.12 });
  for (const p of PICKUPS) if (p.g < 50) (p.kind === 'heart' ? heartS(T(p.g)) : gemS(T(p.g), p.v));
  // hurt
  const th = T(HURT.g);
  pulse(th, 50, 0.22, { duty: 0.125, g: 0.24, to: 38 }); pulse(th, 57, 0.08, { duty: 0.5, g: 0.16 }); pulse(th + 0.08, 52, 0.1, { duty: 0.5, g: 0.16 });
  nz(th, 0.2, { f: 2000, type: 'lowpass', f1: 200, g: 0.4 }); kickD(th, 0.5);
  // low-health alarm while at one heart
  for (let t = th + 0.32; t < T(4.98); t += 0.24) { pulse(t, 96, 0.045, { duty: 0.5, g: 0.06, pan: 0.2 }); pulse(t + 0.06, 93, 0.04, { duty: 0.5, g: 0.04, pan: 0.2 }); }
  // spin charge → ting → release → triple hit
  const c0 = T(SPIN.c0), cf = T(SPIN.full);
  for (let i = 0, n = 12; i < n; i++) pulse(c0 + ((cf - c0) * i) / n, 60 + i * 2, (cf - c0) / n, { duty: 0.125, g: 0.05 + i * 0.004, pan: -0.2 });
  pulse(cf, 100, 0.25, { duty: 0.125, g: 0.12, dec: 0.4 }); pulse(cf + 0.04, 107, 0.2, { duty: 0.125, g: 0.08, dec: 0.4 });
  const tr = T(SPIN.g0);
  nz(tr, 0.3, { f: 500, f1: 7000, type: 'bandpass', g: 0.32, q: 1.2 }); pulse(tr, 60, 0.22, { duty: 0.25, g: 0.12, to: 96 });
  const ts = T(SPIN.hit);
  hitS(ts, 1.2); hitS(ts + 0.03, 0.7); hitS(ts + 0.06, 0.6); nz(ts, 0.4, { f: 2500, type: 'lowpass', f1: 120, g: 0.35, send: 0.2 });
  [79, 83, 86, 91].forEach((m, i) => pulse(ts + 0.14 + i * 0.05, m, 0.06, { duty: 0.5, g: 0.12 }));
  // into the cliff door: stepped descent
  [72, 67, 64, 60, 55].forEach((m, i) => pulse(T(FADE_DUN.t0) + i * 0.06, m, 0.05, { duty: 0.5, g: 0.12 }));
  // block push: grinding stone
  for (let t = T(PUSH.b0); t < T(PUSH.b1); t += 0.035) nz(t, 0.05, { f: 380, type: 'lowpass', g: 0.32, send: 0.02 });
  tri(T(PUSH.b0), 33, T(PUSH.b1) - T(PUSH.b0), { g: 0.16 });
  kickD(T(PUSH.b1), 0.4); nz(T(PUSH.b1), 0.1, { f: 600, type: 'lowpass', g: 0.3 });
  // SECRET FOUND — original shimmer: rising major-7 run with echo, ringing top
  const tc = T(CHIME);
  [76, 83, 88, 92, 95, 99, 100, 104].forEach((m, i) => {
    pulse(tc + i * 0.055, m, 0.07, { duty: 0.25, g: 0.14, send: 0.2 });
    pulse(tc + i * 0.055 + 0.11, m, 0.06, { duty: 0.125, g: 0.05, pan: 0.4, send: 0.3 });
  });
  pulse(tc + 0.44, 100, 0.5, { duty: 0.5, g: 0.1, vib: 1.2, dec: 0.5, send: 0.35 }); tri(tc + 0.44, 64, 0.4, { g: 0.2 });
  // shutters
  const so = T(SHUTTER_OPEN.t0);
  nz(so, 0.25, { f: 1200, type: 'bandpass', g: 0.18, q: 2 }); pulse(so, 48, 0.25, { duty: 0.125, g: 0.08, to: 60 }); kickD(T(SHUTTER_OPEN.t1), 0.3);
  const sc = T(SHUTTER_CLOSE.t1);
  kickD(sc, 0.6); nz(sc, 0.25, { f: 1800, type: 'lowpass', f1: 200, g: 0.4 }); pulse(sc, 45, 0.12, { duty: 0.5, g: 0.12, to: 33 });
  // boss roar
  const tr0 = T(ROAR.t0), rd = T(ROAR.t1) - tr0;
  pulse(tr0, 43, rd, { duty: 0.5, g: 0.16, to: 34, vib: 4, dec: 0.9 }); pulse(tr0, 44, rd, { duty: 0.125, g: 0.08, to: 35, vib: 3, pan: 0.3 });
  nz(tr0, rd, { f: 900, type: 'lowpass', f1: 300, g: 0.3 }); kickD(tr0, 0.5);
  // spear
  nz(T(SPEAR.wind), 0.08, { f: 1500, type: 'bandpass', g: 0.12 });
  nz(T(SPEAR.g0), 0.24, { f: 1200, f1: 4000, type: 'bandpass', g: 0.2, q: 1.5 });
  nz(T(DASH.g0), 0.1, { f: 3000, f1: 6000, type: 'bandpass', g: 0.12 });
  const tsp = T(SPEAR.g1);
  pulse(tsp, 96, 0.12, { duty: 0.125, g: 0.12, dec: 0.4 }); pulse(tsp, 89, 0.18, { duty: 0.5, g: 0.08, dec: 0.4 }); nz(tsp, 0.15, { f: 3000, g: 0.25 }); kickD(tsp, 0.4);
  // boss stomps
  [CHARGE.t0 + 0.06, CHARGE.t0 + 0.12, CHARGE.t1].forEach((g) => { kickD(T(g), 0.5); nz(T(g), 0.12, { f: 500, type: 'lowpass', g: 0.3 }); });
  // boss hits
  BOSS_HITS.forEach((h, i) => {
    const t = T(h);
    hitS(t, i === 2 ? 1.4 : 1.1);
    pulse(t, [67, 70, 74][i], 0.1, { duty: 0.25, g: 0.14, to: [43, 46, 38][i] });
    if (i === 2) { nz(t, 0.6, { f: 4000, type: 'lowpass', f1: 100, g: 0.5, send: 0.3 }); tri(t, 36, 0.4, { g: 0.4, to: 24 }); }
  });
  swing(T(LEAP.g0) + 0.02, true); nz(T(LEAP.g0), 0.1, { f: 2000, f1: 5000, type: 'bandpass', g: 0.1 });
  // boss death chain + final burst
  for (let i = 0; i < 9; i++) {
    const t = T(BOSS_DIE.t0 + 0.08 + i * 0.064);
    nz(t, 0.22, { f: 1800, type: 'lowpass', f1: 120, g: 0.36, pan: ((i % 3) - 1) * 0.4, send: 0.15 }); tri(t, 40 - (i % 3), 0.12, { g: 0.26, to: 28 });
  }
  const tb = T(BOSS_DIE.t1);
  nz(tb, 1.0, { f: 3000, type: 'lowpass', f1: 60, g: 0.6, send: 0.35 }); tri(tb, 36, 0.6, { g: 0.45, to: 22 }); kickD(tb, 0.8);
  // tonic appears
  [84, 88, 91, 96, 100].forEach((m, i) => pulse(T(TONIC.g0) + i * 0.035, m, 0.05, { duty: 0.125, g: 0.07, send: 0.25 }));
  // ITEM GET — original fanfare
  const F0 = T(HOLD);
  [[72, 76, 79], [77, 81, 84], [79, 83, 86]].forEach((grp, k) => {
    grp.forEach((m, i) => pulse(F0 + k * 0.21 + i * 0.07, m, 0.08, { duty: 0.5, g: 0.16 }));
    tri(F0 + k * 0.21, [48, 53, 55][k], 0.19, { g: 0.3 });
    snare(F0 + k * 0.21, 0.1);
  });
  const FC = F0 + 0.63;
  [[84, 0.5], [88, 0.125], [91, 0.125]].forEach(([m, d], i) => pulse(FC, m, 0.9, { duty: d, g: i ? 0.08 : 0.15, vib: 1, dec: 0.75, send: 0.15 }));
  tri(FC, 36, 0.9, { g: 0.34 }); kickD(FC, 0.4); nz(FC, 0.7, { f: 6000, g: 0.05 });
  [96, 91, 88, 84, 79, 76].forEach((m, i) => pulse(FC + 0.95 + i * 0.07, m, 0.12, { duty: 0.125, g: 0.06 - i * 0.006, send: 0.3, pan: (i % 2 ? 0.3 : -0.3) }));
  // heart refill ticks
  for (let i = 0; i < 3; i++) pulse(T(REFILL.t0) + i * ((T(REFILL.t1) - T(REFILL.t0)) / 3), 91 + i * 2, 0.06, { duty: 0.5, g: 0.08, pan: 0.3 });
  // Text arrives as a readable complete message, with a short confirmation chime.
  pulse(T(TEXT.t0), 88, 0.07, { duty: 0.5, g: 0.045, pan: -0.15 });
  pulse(T(TEXT.t0) + 0.07, 95, 0.12, { duty: 0.5, g: 0.04, pan: -0.15 });
  [72, 76, 79].forEach((m, i) => pulse(14.15 + i * 0.1, m, 0.45, { duty: 0.125, g: 0.035, dec: 0.35, send: 0.2 }));
  // iris out
  pulse(T(IRIS_OUT.t0), 84, T(IRIS_OUT.t1) - T(IRIS_OUT.t0), { duty: 0.125, g: 0.05, to: 60 });
}
