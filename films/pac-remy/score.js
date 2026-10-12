// Arcade sound chip: pulse voices (12.5 / 25 / 50 % duty), triangle bass, noise; every cue synthesized.
// Original melodies only. Film-time aligned through choreo.filmT so each sound lands on its frame.
import {
  INTRO, GO, MAZE_END, INTER_END, DURATION, filmT, TONIC_G, EATS, STOPS, PELLETS, FRUIT, VORTEX, CLEAR, LAST_EAT, TRACKS,
} from './choreo.js';
import { INTER } from './scenes.js';

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
  const pulse = (t, m, dur, { duty = 0.25, g = 0.18, pan = 0, to = null, send = 0.05, vib = 0, dec = 0.6, f = null, fTo = null } = {}) => at(t, () => {
    const f0 = f ?? hz(m);
    const o = osc('square', f0, t, dur + 0.02);
    o.setPeriodicWave(pulseWave(duty));
    if (to != null || fTo != null) o.frequency.exponentialRampToValueAtTime(fTo ?? hz(to), t + dur);
    if (vib) {
      const l = osc('sine', 6, t, dur), lg = ac.createGain();
      lg.gain.value = f0 * 0.012 * vib;
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
  const tri = (t, m, dur, { g = 0.2, to = null, f = null, fTo = null } = {}) => at(t, () => {
    const o = osc('triangle', f ?? hz(m), t, dur + 0.02);
    if (to != null || fTo != null) o.frequency.exponentialRampToValueAtTime(fTo ?? hz(to), t + dur);
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
  // a wobbling tone (sirens): base frequency ramps f0 → f1, LFO rate / depth
  const siren = (t, dur, { f0, f1 = f0, rate, depth, g, wave = 'triangle', duty = null, pan = 0 }) => at(t, () => {
    const o = osc(wave === 'pulse' ? 'square' : wave, f0, t, dur + 0.02);
    if (duty) o.setPeriodicWave(pulseWave(duty));
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f1, t + dur);
    const l = osc('triangle', rate, t, dur), lg = ac.createGain();
    lg.gain.value = depth;
    l.connect(lg).connect(o.frequency);
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.02);
    a.gain.setValueAtTime(g, t + Math.max(0.03, dur - 0.02));
    a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(a);
    out(a, 1, 0.03, pan);
  });
  const kickD = (t, g = 0.36) => { tri(t, 50, 0.09, { g, to: 28 }); nz(t, 0.03, { f: 1200, type: 'lowpass', g: 0.2 }); };
  const snare = (t, g = 0.18) => { nz(t, 0.11, { f: 1800, type: 'bandpass', g, q: 0.6 }); tri(t, 50, 0.05, { g: 0.16, to: 40 }); };
  const hat = (t, g = 0.05) => nz(t, 0.03, { f: 7000, g });
  // waka: alternating down / up sweeps, one per pellet
  let wk = 0;
  const waka = (t, g = 0.15) => {
    const down = wk++ % 2 === 0;
    const [a, b] = down ? [520, 240] : [240, 520];
    tri(t, 0, 0.065, { f: a, fTo: b, g: g * 1.4 });
    pulse(t, 0, 0.06, { f: a, fTo: b, duty: 0.5, g: g * 0.35, send: 0.01 });
  };
  const ting = (t, g = 0.12, m = 100) => { pulse(t, m, 0.4, { duty: 0.125, g, dec: 0.35, vib: 0.5 }); pulse(t + 0.05, m + 7, 0.3, { duty: 0.125, g: g * 0.6, dec: 0.3 }); };

  // Running (non-frozen) film intervals of the round between two game times.
  const after = (g) => filmT(g) + STOPS.filter((s) => s.g === g).reduce((a, s) => a + s.d, 0); // film time a freeze at g releases
  const runs = (g0, g1) => {
    const cuts = [g0, ...STOPS.map((s) => s.g).filter((g) => g > g0 && g < g1), g1];
    const segs = [];
    for (let k = 0; k < cuts.length - 1; k++) segs.push([after(cuts[k]), filmT(cuts[k + 1])]);
    return segs.filter(([a, b]) => b - a > 0.02);
  };

  // ================= ATTRACT =================
  nz(0.0, 0.25, { f: 600, type: 'bandpass', f1: 5000, g: 0.05 });
  [72, 74, 76, 77, 79, 81, 83, 84].forEach((m, i) => { pulse(0.18 + i * 0.03, m, 0.05, { duty: 0.25, g: 0.13 }); });
  kickD(0.18, 0.5); tri(0.18, 36, 0.3, { g: 0.3, to: 31 });
  [60, 64, 67, 72].forEach((m, k) => pulse(0.42, m + 12, 0.32, { duty: k ? 0.125 : 0.5, g: 0.09, vib: 0.6, dec: 0.7 }));
  tri(0.42, 48, 0.3, { g: 0.22 });
  ting(0.46, 0.06, 103);
  [0, 1, 2, 3].forEach((i) => { const t = 0.5 + i * 0.12; pulse(t, 79 - i * 2, 0.09, { duty: 0.5, g: 0.1, to: 67 - i * 2 }); hat(t, 0.04); });
  for (let k = 0; k < 9; k++) waka(0.6 + k * 0.088, 0.1);
  pulse(1.0, 84, 0.05, { duty: 0.5, g: 0.08 }); pulse(1.06, 91, 0.12, { duty: 0.5, g: 0.08 });
  [[1.2, 67], [1.32, 72], [1.44, 76]].forEach(([t, m]) => { pulse(t, m, 0.08, { duty: 0.25, g: 0.1 }); tri(t, m - 24, 0.1, { g: 0.18 }); });

  // ================= READY! jingle (original) =================
  const S = 0.05, J0 = INTRO;
  const LEAD = [76, 79, 84, 0, 83, 79, 76, 74, 77, 81, 86, 0, 84, 81, 77, 76, 74, 77, 81, 79, 83, 86, 91, 0];
  LEAD.forEach((m, i) => { if (m) pulse(J0 + i * S, m, i === 22 ? 0.12 : S * 0.9, { duty: 0.25, g: 0.19, vib: i === 22 ? 0.8 : 0 }); });
  LEAD.forEach((m, i) => { if (m) pulse(J0 + i * S + 0.012, m - 12, S * 0.8, { duty: 0.125, g: 0.06, pan: 0.3 }); });
  const BASS = [48, 55, 48, 55, 53, 60, 53, 60, 55, 62, 55, 59];
  BASS.forEach((m, i) => tri(J0 + i * 0.1, m, 0.09, { g: 0.22 }));
  [0, 4, 8].forEach((k) => kickD(J0 + k * 0.1, 0.3));
  [2, 6, 10].forEach((k) => snare(J0 + k * 0.1, 0.12));
  for (let k = 0; k < 12; k++) hat(J0 + k * 0.1 + 0.05, 0.03);
  pulse(J0 + 1.15, 72, 0.05, { duty: 0.5, g: 0.12 }); tri(J0 + 1.15, 48, 0.05, { g: 0.2 });

  // ================= ROUND =================
  // siren: rises as the bald heads close in
  for (const [a, b] of runs(GO, TONIC_G)) siren(a, b - a, { f0: 330, f1: 470, rate: 2.9, depth: 95, g: 0.075, wave: 'triangle' });
  // waka per pellet the hero eats himself
  for (const p of PELLETS) if (!p.vortex && !p.power) waka(filmT(p.g));
  // hair tonic: a chord hit, then a sweep
  const TT = filmT(TONIC_G);
  kickD(TT, 0.55); nz(TT, 0.3, { f: 300, type: 'bandpass', f1: 6000, g: 0.14 });
  [60, 64, 67, 72, 76].forEach((m, i) => pulse(TT + i * 0.03, m + 12, 0.24 - i * 0.03, { duty: i % 2 ? 0.125 : 0.25, g: 0.12 }));
  pulse(TT + 0.15, 72, 0.15, { duty: 0.5, g: 0.1, to: 96 });
  tri(TT, 36, 0.28, { g: 0.3, to: 48 });
  // frightened warble while they flee (silent through each freeze)
  for (const [a, b] of runs(TONIC_G, LAST_EAT)) siren(a, b - a, { f0: 190, f1: 230, rate: 8.5, depth: 70, g: 0.06, wave: 'pulse', duty: 0.5, pan: -0.1 });
  // eyes racing home: a thin fast whine
  for (const [i, T] of TRACKS.entries()) {
    const e = EATS.find((q) => q.i === i);
    for (const [a, b] of runs(e.g + 0.001, Math.min(T.home, CLEAR.g0))) siren(a, b - a, { f0: 1400, f1: 1500, rate: 14, depth: 260, g: 0.018, wave: 'triangle', pan: 0.3 });
  }
  // each ghost eaten: a zipping gulp, pitched up the chain; the 1600 gets the boom
  for (const e of EATS) {
    const t = filmT(e.g), up = e.n * 3;
    pulse(t, 0, 0.22, { f: 160 * 2 ** (up / 12), fTo: 1900 * 2 ** (up / 12), duty: 0.25, g: 0.15 });
    tri(t, 0, 0.18, { f: 90, fTo: 700 * 2 ** (up / 12), g: 0.2 });
    nz(t, 0.08, { f: 2600, type: 'bandpass', g: 0.25, q: 1 });
    kickD(t, 0.45);
    [76, 79, 84].forEach((m, k) => pulse(t + 0.2 + k * 0.03, m + up, 0.05, { duty: 0.5, g: 0.08 }));
    if (e.n === 3) {
      nz(t, 0.5, { f: 2200, type: 'lowpass', f1: 100, g: 0.45, send: 0.15 });
      tri(t, 36, 0.4, { g: 0.32, to: 26 });
      [72, 76, 79, 84, 88].forEach((m, k) => pulse(t + 0.26 + k * 0.035, m + 3, 0.06, { duty: 0.25, g: 0.1 }));
    }
  }
  // bonus comb
  const TF = filmT(FRUIT.g);
  pulse(TF, 72, 0.05, { duty: 0.5, g: 0.13, to: 84 }); pulse(TF + 0.05, 84, 0.07, { duty: 0.5, g: 0.13, to: 96 }); ting(TF + 0.06, 0.05, 108);
  // MANE MAGNET: everything left on the board pours in
  const V0 = filmT(VORTEX.g0), V1 = filmT(VORTEX.g1);
  pulse(V0, 48, V1 - V0, { duty: 0.125, g: 0.09, to: 96, dec: 0.9 });
  pulse(V0, 55, V1 - V0, { duty: 0.25, g: 0.05, to: 103, dec: 0.9, pan: 0.35 });
  nz(V0, V1 - V0 + 0.1, { f: 400, type: 'bandpass', f1: 9000, g: 0.08, q: 1.2 });
  const arrivals = PELLETS.filter((p) => p.vortex).map((p) => filmT(p.g)).sort((a, b) => a - b);
  let last = -1, n = 0;
  for (const t of arrivals) if (t - last > 0.028) { last = t; waka(t, 0.07 + 0.05 * Math.min(1, n++ / 20)); }
  [60, 64, 67, 72, 76, 79, 84].forEach((m, k) => pulse(V0 + k * 0.11, m + 12, 0.08, { duty: 0.125, g: 0.07, pan: k % 2 ? 0.3 : -0.3 }));
  kickD(V1, 0.6); nz(V1, 0.4, { f: 3000, type: 'lowpass', f1: 200, g: 0.35, send: 0.15 }); tri(V1, 40, 0.3, { g: 0.3, to: 28 });
  // ROUND CLEAR fanfare (the maze flashes)
  const C0 = filmT(CLEAR.g0);
  const fan = [[72, 76, 79], [74, 77, 81], [76, 79, 84]];
  fan.forEach((grp, k) => {
    grp.forEach((m, i) => pulse(C0 + k * 0.18 + i * 0.04, m, 0.08, { duty: 0.5, g: 0.13 }));
    tri(C0 + k * 0.18, [48, 50, 52][k], 0.16, { g: 0.24 });
    kickD(C0 + k * 0.18, 0.32);
  });
  const CF = C0 + 0.54;
  [84, 88, 91].forEach((m, i) => pulse(CF, m, 0.5, { duty: i ? 0.125 : 0.5, g: 0.11, vib: 1, dec: 0.75 }));
  tri(CF, 36, 0.5, { g: 0.3 }); snare(CF, 0.2); nz(CF, 0.5, { f: 6000, g: 0.05 });
  for (let k = 0; k < 4; k++) pulse(C0 + k * 0.24, 103, 0.05, { duty: 0.125, g: 0.03, pan: 0.4 });

  // ================= HAIR BREAK (intermission) =================
  const I0 = MAZE_END, E = 0.0625;
  const TUNE = [77, 0, 81, 84, 0, 81, 79, 77, 76, 0, 79, 82, 0, 79, 77, 76];
  const stopT = I0 + INTER.pop;
  for (let rep = 0; rep < 2; rep++) TUNE.forEach((m, i) => {
    const t = I0 + 0.05 + (rep * 16 + i) * E;
    if (!m || t >= stopT) return;
    pulse(t, m, E * 0.85, { duty: 0.25, g: 0.15 });
  });
  for (let k = 0; k < 16; k++) {
    const t = I0 + 0.05 + k * 2 * E;
    if (t >= stopT) break;
    tri(t, [41, 48, 41, 48, 43, 50, 43, 50][k % 8], E * 1.6, { g: 0.2 });
    if (k % 2 === 0) kickD(t, 0.22); else snare(t, 0.08);
  }
  // snag: elastic stretch, then the pop
  pulse(I0 + INTER.snag, 0, INTER.pop - INTER.snag, { f: 180, fTo: 520, duty: 0.5, g: 0.12, vib: 3 });
  nz(stopT, 0.06, { f: 1800, type: 'bandpass', g: 0.3, q: 2 }); tri(stopT, 0, 0.12, { f: 600, fTo: 120, g: 0.3 });
  // the dome is revealed
  ting(stopT + 0.03, 0.14, 103); ting(stopT + 0.13, 0.06, 110);
  // embarrassed slide whistle
  pulse(I0 + INTER.stop + 0.05, 0, 0.36, { f: 1300, fTo: 330, duty: 0.5, g: 0.08, vib: 1.5 });
  // flee: zip
  pulse(I0 + INTER.flee, 0, 0.2, { f: 300, fTo: 2400, duty: 0.125, g: 0.12 }); nz(I0 + INTER.flee, 0.18, { f: 1200, type: 'bandpass', f1: 6000, g: 0.12 });

  // ================= HIGH SCORES =================
  const H0 = INTER_END;
  kickD(H0, 0.4);
  const HS = [[72, 0.08], [76, 0.08], [79, 0.08], [84, 0.16], [83, 0.08], [79, 0.08], [81, 0.16], [84, 0.3]];
  let ht = H0 + 0.06;
  HS.forEach(([m, d]) => { pulse(ht, m, d * 0.9, { duty: 0.25, g: 0.16 }); pulse(ht + 0.01, m - 12, d * 0.8, { duty: 0.125, g: 0.05, pan: 0.3 }); ht += d; });
  [[0, 48], [0.24, 53], [0.48, 55], [0.72, 48]].forEach(([d, m]) => { tri(H0 + 0.06 + d, m, 0.2, { g: 0.22 }); tri(H0 + 0.18 + d, m + 7, 0.1, { g: 0.16 }); });
  [0.06, 0.3, 0.54, 0.78].forEach((d, k) => { kickD(H0 + d, 0.26); snare(H0 + d + 0.12, 0.08); });
  for (let k = 0; k < 5; k++) pulse(H0 + 0.08 + k * 0.08, 96, 0.03, { duty: 0.5, g: 0.04, pan: 0.2 });
  const HF = H0 + 1.08;
  [72, 76, 79, 84].forEach((m, i) => pulse(HF, m + 12, DURATION - HF - 0.12, { duty: i ? 0.125 : 0.25, g: 0.08, vib: 0.8, dec: 0.75 }));
  tri(HF, 36, DURATION - HF - 0.12, { g: 0.26 }); snare(HF, 0.14); nz(HF, 0.6, { f: 6000, g: 0.04 });
  for (let k = 0; k < 7; k++) waka(H0 + 0.1 + k * 0.2, 0.07);
  // iris close
  pulse(DURATION - 0.34, 84, 0.26, { duty: 0.5, g: 0.08, to: 48 });
}
