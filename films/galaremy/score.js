// Original 2A03-style score: pulse (12.5 / 25 / 50 % duty), triangle bass, noise drums; every SFX synthesized.
// All cues come from choreo (film-time aligned through filmT, hit-stops included) so sounds land on their frames.
import { INTRO, filmT, B, SHOTS, HITS, PELLETS, CHAL, ENEMIES, DURATION } from './choreo.js';

const E8 = 0.2; // eighth note at 150 BPM
const BAR = E8 * 8;

// Main theme, E minor: Em – C – D – B, two passes (second an octave-flourish variation).
const THEME = [
  [[64, 1], [0, 1], [67, 1], [71, 1], [76, 2], [74, 1], [71, 1]],
  [[72, 1], [0, 1], [71, 1], [67, 1], [64, 2], [67, 1], [69, 1]],
  [[74, 1], [0, 1], [72, 1], [71, 1], [69, 2], [71, 1], [72, 1]],
  [[71, 1], [75, 1], [78, 1], [83, 1], [81, 2], [78, 1], [75, 1]],
];
const CH = [[40, [64, 67, 71]], [36, [60, 64, 67]], [38, [62, 66, 69]], [35, [63, 66, 71]]];

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
      const l = osc('sine', 7, t, dur), lg = ac.createGain();
      lg.gain.value = hz(m) * 0.014 * vib;
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
  const tri = (t, m, dur, { g = 0.3, to = null } = {}) => at(t, () => {
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
  const kickD = (t, g = 0.36) => { tri(t, 52, 0.09, { g, to: 28 }); nz(t, 0.03, { f: 1200, type: 'lowpass', g: 0.2 }); };
  const snare = (t, g = 0.2) => { nz(t, 0.12, { f: 1800, type: 'bandpass', g, q: 0.6 }); tri(t, 50, 0.05, { g: 0.18, to: 40 }); };
  const hat = (t, g = 0.05, d = 0.03) => nz(t, d, { f: 7000, g });
  const T = filmT;
  const panX = (x) => Math.max(-0.6, Math.min(0.6, (x - 480) / 300));

  // ================= title =================
  nz(0.0, 0.34, { f: 400, type: 'bandpass', f1: 7000, g: 0.07 });
  for (let i = 0; i < 8; i++) pulse(0.02 + i * 0.038, 52 + i * 5, 0.04, { duty: 0.125, g: 0.08 + i * 0.01 });
  // logo slam
  kickD(0.33, 0.62); nz(0.33, 0.6, { f: 6000, type: 'lowpass', f1: 300, g: 0.4, send: 0.2 }); tri(0.33, 40, 0.42, { g: 0.42, to: 26 });
  [64, 67, 71, 74].forEach((m, i) => pulse(0.33, m + 12, 0.5, { duty: i % 2 ? 0.125 : 0.25, g: 0.07, vib: 0.6, dec: 0.5, pan: (i - 1.5) * 0.3 }));
  // attract motif
  [[76, 0], [79, 1], [83, 2], [88, 3], [86, 5], [83, 6], [79, 7], [81, 8], [83, 10]].forEach(([m, s]) => pulse(0.48 + s * 0.1, m, s === 10 ? 0.3 : 0.09, { duty: 0.25, g: 0.15, vib: s === 10 ? 1 : 0 }));
  [[40, 0.48], [43, 0.88], [45, 1.08]].forEach(([m, t]) => tri(t, m, 0.36, { g: 0.24 }));
  [0.48, 0.88].forEach((t) => kickD(t, 0.3)); [0.68, 1.08].forEach((t) => snare(t, 0.14));
  // fighter launch
  pulse(1.08, 48, 0.4, { duty: 0.125, g: 0.08, to: 96 }); nz(1.08, 0.42, { f: 300, type: 'bandpass', f1: 9000, g: 0.12, q: 1.2 });
  pulse(1.38, 88, 0.05, { duty: 0.5, g: 0.12 }); pulse(1.43, 95, 0.06, { duty: 0.5, g: 0.12 }); // credit blip

  // ================= stage start fanfare =================
  const S0 = INTRO;
  nz(S0, 0.5, { f: 9000, type: 'lowpass', f1: 400, g: 0.16 }); // warp-in rush
  [[64, 0], [67, 1], [71, 2], [76, 3], [74, 4], [76, 5], [79, 6]].forEach(([m, s]) => pulse(S0 + s * 0.075, m + 12, s === 6 ? 0.2 : 0.07, { duty: 0.5, g: 0.13 }));
  [[52, 0], [55, 0.225], [59, 0.45]].forEach(([m, d]) => tri(S0 + d, m - 12, 0.2, { g: 0.24 }));

  // ================= music sections =================
  const loop = (t0, t1, bars, { intense = false, lead = true } = {}) => {
    for (let b = 0; ; b++) {
      const bt = t0 + b * BAR;
      if (bt >= t1) break;
      const [root, chord] = CH[(bars + b) % 4];
      let s = 0;
      if (lead) for (const [m, len] of THEME[(bars + b) % 4]) {
        const t = bt + s * E8;
        if (m && t < t1) pulse(t, m + 12, Math.min(len * E8 * 0.88, t1 - t), { duty: 0.25, g: 0.13, vib: len > 1 ? 0.6 : 0 });
        if (m && t < t1 && intense) pulse(t + 0.01, m, Math.min(len * E8 * 0.8, t1 - t - 0.01), { duty: 0.125, g: 0.04, pan: 0.3 });
        s += len;
      }
      for (let e = 0; e < 8; e++) {
        const t = bt + e * E8;
        if (t >= t1) break;
        tri(t, root + (e % 2 ? 12 : 0), E8 * 0.85, { g: 0.18 });
        if (e === 0 || e === 4 || (e === 7 && intense)) kickD(t, 0.3);
        if (e === 2 || e === 6) snare(t, 0.15);
        hat(t, e % 2 ? 0.04 : 0.025);
        for (let k = 0; k < 2; k++) { const tt = t + k * E8 / 2; if (tt < t1) pulse(tt, chord[(e * 2 + k) % 3] + 12, 0.05, { duty: 0.125, g: 0.026, pan: -0.35 }); }
      }
    }
  };
  // stage 1: from the fanfare until the tractor beam
  loop(S0 + 0.6, T(B.beam0), 0);
  // ship 2 back in → rescue → dual
  loop(T(B.ship2In[1]), T(B.dock), 2, { intense: true });
  loop(T(B.dock) + 0.32, T(B.chalText[0]), 0, { intense: true, lead: false });

  // challenging stage: bright G-major 16th runs
  const CR = [[79, 83, 86, 83], [78, 81, 86, 81], [76, 79, 83, 79], [76, 79, 84, 79]], CB = [43, 38, 40, 36];
  const c0 = T(B.chalText[0]), c1 = T(B.perfect[0]);
  [79, 83, 86, 91].forEach((m, i) => pulse(c0 + i * 0.06, m, 0.06, { duty: 0.5, g: 0.12 }));
  for (let h = 0; ; h++) {
    const ht = c0 + 0.3 + h * 0.4;
    if (ht >= c1) break;
    const run = CR[h % 4];
    for (let k = 0; k < 8; k++) { const t = ht + k * 0.05; if (t < c1) pulse(t, run[k % 4] + (k >= 4 ? 12 : 0) - 12, 0.045, { duty: 0.25, g: 0.07, pan: 0.2 }); }
    tri(ht, CB[h % 4], 0.18, { g: 0.2 }); tri(ht + 0.2, CB[h % 4] + 12, 0.18, { g: 0.18 });
    kickD(ht, 0.28); snare(ht + 0.2, 0.13); hat(ht + 0.1); hat(ht + 0.3);
  }
  // PERFECT fanfare + bonus
  const PF = T(B.perfect[0] + 0.12);
  [[67, 71, 74, 79], [72, 76, 79, 84], [74, 78, 81, 86]].forEach((grp, k) => grp.forEach((m, i) => pulse(PF + k * 0.13 + i * 0.03, m + 12, 0.06, { duty: 0.5, g: 0.12 })));
  [79, 83, 86, 91].forEach((m, i) => pulse(PF + 0.4, m, 0.32, { duty: i ? 0.125 : 0.5, g: 0.08, vib: 1 }));
  tri(PF, 43, 0.38, { g: 0.26 }); kickD(PF, 0.4); nz(PF + 0.4, 0.4, { f: 6000, g: 0.06 });
  for (let t = PF + 0.36; t < T(B.perfect[1]) - 0.1; t += 0.05) pulse(t, 96, 0.02, { duty: 0.5, g: 0.035, pan: 0.2 });

  // warning siren
  for (let t = T(B.warn[0]), i = 0; t < T(B.warn[1]); t += 0.125, i++) pulse(t, i % 2 ? 72 : 77, 0.12, { duty: 0.5, g: 0.11, vib: 0.4 });
  tri(T(B.warn[0]), 28, T(B.warn[1]) - T(B.warn[0]) + 0.3, { g: 0.22 });
  // boss theme: E phrygian pump, ominous lead
  const b0 = T(B.bossIn[1]) - 0.05, b1 = T(B.final);
  const BOSSL = [[76, 2], [77, 1], [76, 1], [74, 2], [71, 2], [72, 2], [71, 1], [67, 1], [69, 2], [64, 2]];
  let s = 0;
  for (const [m, len] of BOSSL) { const t = b0 + s * 0.1; if (t >= b1) break; pulse(t, m, Math.min(len * 0.1 * 0.92, b1 - t), { duty: 0.25, g: 0.12, vib: len > 1 ? 0.8 : 0 }); s += len; }
  for (let t = b0, i = 0; t < b1; t += 0.1, i++) {
    tri(t, [40, 40, 52, 40, 41, 40, 52, 43][i % 8], 0.085, { g: 0.2 });
    if (i % 4 === 0) kickD(t, 0.32);
    if (i % 4 === 2) snare(t, 0.13);
    hat(t, 0.025);
  }

  // victory fanfare (E major) + tally + end
  const V = T(B.clear);
  [[64, 68, 71, 76], [69, 73, 76, 81], [71, 75, 78, 83]].forEach((grp, k) => {
    grp.forEach((m, i) => pulse(V + k * 0.2 + i * 0.045, m + 12, 0.07, { duty: 0.5, g: 0.13 }));
    tri(V + k * 0.2, [40, 45, 47][k], 0.19, { g: 0.28 }); kickD(V + k * 0.2, 0.32);
  });
  const VC = V + 0.62;
  [76, 80, 83, 88].forEach((m, i) => pulse(VC, m + (i ? 0 : 12), 0.95, { duty: i ? 0.125 : 0.5, g: 0.09, vib: 1, dec: 0.8, pan: (i - 1.5) * 0.25 }));
  tri(VC, 40, 0.95, { g: 0.3 }); snare(VC, 0.2); nz(VC, 0.9, { f: 6000, g: 0.05 });
  B.tally.forEach((tt, i) => { const t = T(tt); pulse(t, 84 + i * 2, 0.05, { duty: 0.5, g: 0.1 }); });
  for (let t = T(B.tally[3]); t < T(B.tally[3] + 0.35); t += 0.04) pulse(t, 96, 0.02, { duty: 0.5, g: 0.04, pan: -0.2 });
  // end sting: the Cabald has fallen
  const EN = T(B.end);
  [[71, 0], [76, 0.1], [80, 0.2], [83, 0.3], [88, 0.4]].forEach(([m, d]) => pulse(EN + d, m, d === 0.4 ? DURATION - EN - 0.45 : 0.09, { duty: 0.25, g: 0.12, vib: d === 0.4 ? 1 : 0, dec: 0.7 }));
  [64, 68, 71].forEach((m) => pulse(EN + 0.4, m, DURATION - EN - 0.45, { duty: 0.125, g: 0.05, dec: 0.7 }));
  tri(EN + 0.4, 28, DURATION - EN - 0.45, { g: 0.26 });
  kickD(EN + 0.4, 0.4); nz(EN + 0.4, 0.6, { f: 7000, g: 0.06 });

  // ================= SFX =================
  // player shots (one sound per volley)
  const vol = new Set();
  for (const sh of SHOTS) {
    const key = sh.g.toFixed(4);
    if (vol.has(key)) continue;
    vol.add(key);
    const t = T(sh.g), dual = SHOTS.filter((o) => o.g.toFixed(4) === key).length > 1;
    pulse(t, dual ? 91 : 88, 0.075, { duty: 0.25, g: dual ? 0.11 : 0.1, to: 62, send: 0.02, pan: panX(sh.bx) });
    nz(t, 0.03, { f: 5000, g: 0.05, pan: panX(sh.bx) });
  }
  // hits / kills
  const done = new Set();
  for (const h of HITS) {
    const t = T(h.gk), pan = panX(h.x);
    if (h.type === 'giant') {
      const fin = h.kill;
      tri(t, 45, 0.12, { g: 0.4, to: 30 }); nz(t, 0.14, { f: 2600, type: 'bandpass', g: 0.32, q: 1.4 });
      pulse(t, 64, 0.08, { duty: 0.5, g: 0.12, to: 52 }); pulse(t + 0.01, 83, 0.06, { duty: 0.125, g: 0.08 });
      if (fin) { kickD(t, 0.7); nz(t, 1.0, { f: 5000, type: 'lowpass', f1: 120, g: 0.5, send: 0.25 }); tri(t, 40, 0.9, { g: 0.42, to: 22 }); }
      continue;
    }
    if (!h.kill) { pulse(t, 84, 0.05, { duty: 0.5, g: 0.14, to: 79, pan }); nz(t, 0.06, { f: 3200, type: 'bandpass', g: 0.22, q: 2, pan }); continue; }
    const key = h.gk.toFixed(4);
    if (done.has(key)) continue; // pairs: one bigger sound
    done.add(key);
    const pair = HITS.filter((o) => o.gk.toFixed(4) === key).length > 1, big = h.type === 'boss';
    nz(t, big ? 0.45 : 0.24, { f: big ? 3000 : 2400, type: 'lowpass', f1: 160, g: big ? 0.42 : pair ? 0.32 : 0.28, pan, send: big ? 0.15 : 0.06 });
    pulse(t, h.type === 'chal' ? 79 : 70, 0.11, { duty: 0.5, g: 0.1, to: h.type === 'chal' ? 55 : 43, pan });
    if (big) { kickD(t, 0.5); tri(t, 43, 0.3, { g: 0.3, to: 28 }); }
    if (h.type === 'chal') pulse(t + 0.05, [88, 91, 93, 95, 96, 98, 100, 103][CHAL.findIndex((e) => e === h.e) >> 1] ?? 91, 0.05, { duty: 0.125, g: 0.05, pan });
  }
  // dive swoops (descending whistle)
  for (const e of ENEMIES) for (const sg of e.segs) if (sg.ease === 'dive') pulse(T(sg.t0), 96, 0.55, { duty: 0.125, g: 0.035, to: 70, vib: 0.5, pan: -0.2 });
  // formation entry flourishes
  [0.3, 0.82].forEach((g0) => [76, 79, 83, 88].forEach((m, i) => pulse(T(g0) + i * 0.035, m, 0.04, { duty: 0.125, g: 0.04 })));
  // enemy pellets
  for (const p of PELLETS) pulse(T(p.t0), 79, 0.05, { duty: 0.5, g: 0.04, to: 72, pan: panX(p.x0) });
  // tractor beam: wobbling two-tone ladder, then the capture spiral
  for (let t = T(B.beam0), i = 0; t < T(B.beam1); t += 0.045, i++) {
    const up = t < T(B.rise1);
    pulse(t, (up ? 58 : 66) + (i % 2 ? 7 : 0) + Math.min(12, i * 0.5), 0.042, { duty: 0.5, g: 0.06, pan: -0.15 });
  }
  nz(T(B.beam0), T(B.beam1) - T(B.beam0), { f: 600, type: 'bandpass', f1: 2400, g: 0.08, q: 3 });
  for (let k = 0; k < 6; k++) pulse(T(B.capture) + k * 0.08, 84 - k * 3, 0.08, { duty: 0.25, g: 0.08, to: 72 - k * 3, vib: 1 });
  // "fighter captured" lament
  [[71, 0], [70, 0.16], [69, 0.32], [64, 0.48]].forEach(([m, d], i) => pulse(T(B.capText[0]) + 0.1 + d, m, i === 3 ? 0.42 : 0.14, { duty: 0.25, g: 0.12, vib: i === 3 ? 1 : 0 }));
  tri(T(B.capText[0]) + 0.1, 40, 0.9, { g: 0.2 });
  // ship 2 warp-in
  pulse(T(B.ship2In[0]), 60, 0.28, { duty: 0.125, g: 0.06, to: 84 });
  // captive released → spirals down → docks
  [72, 76, 79, 84, 88, 91].forEach((m, i) => pulse(T(B.release) + 0.06 + i * 0.05, m, 0.05, { duty: 0.25, g: 0.09 }));
  for (let t = T(B.release) + 0.1, i = 0; t < T(B.dock); t += 0.06, i++) pulse(t, 91 - i * 1.4, 0.05, { duty: 0.125, g: 0.035, pan: 0.2 });
  const D = T(B.dock);
  kickD(D, 0.55); nz(D, 0.4, { f: 4000, type: 'bandpass', g: 0.2, q: 0.8 });
  [64, 71, 76, 79, 83, 88, 91, 95].forEach((m, i) => pulse(D + 0.02 + i * 0.034, m, 0.06, { duty: i % 2 ? 0.125 : 0.5, g: 0.12 }));
  pulse(D + 0.3, 88, 0.3, { duty: 0.25, g: 0.1, vib: 1 });
  // jaw opening growl + core hum
  tri(T(B.jaw), 33, 0.4, { g: 0.24, to: 28 }); nz(T(B.jaw), 0.35, { f: 300, type: 'lowpass', g: 0.2 });
  // final chain + mega blast
  for (let k = 0; k < 14; k++) {
    const t = T(B.final) + 0.3 + (k * (T(B.mega) - T(B.final) - 0.35)) / 14;
    nz(t, 0.22, { f: 2600, type: 'lowpass', f1: 150, g: 0.3, pan: ((k * 37) % 11) / 10 - 0.5, send: 0.1 });
    tri(t, 40 - (k % 4), 0.1, { g: 0.22, to: 28 });
  }
  const M = T(B.mega);
  kickD(M, 0.8); tri(M, 36, 1.4, { g: 0.5, to: 18 });
  nz(M, 1.8, { f: 8000, type: 'lowpass', f1: 80, g: 0.7, send: 0.35 });
  nz(M + 0.05, 1.2, { f: 1500, type: 'bandpass', f1: 200, g: 0.3, q: 0.6, send: 0.3 });
  for (let k = 0; k < 8; k++) nz(M + 0.25 + k * 0.08, 0.05, { f: 6000, g: 0.07, pan: (k % 3 - 1) * 0.5 });
  // ship exit
  pulse(T(B.shipOut[0]), 55, 0.45, { duty: 0.125, g: 0.07, to: 100 }); nz(T(B.shipOut[0]) + 0.1, 0.45, { f: 500, type: 'bandpass', f1: 9000, g: 0.1, q: 1 });
}
