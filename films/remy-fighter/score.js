// Arcade score: 2-op FM bass/brass + pulse leads + noise drums, a formant "announcer" voice, and every SFX.
// Film-time aligned through choreo.filmT so each hit sound lands on its frame (hit-stops and slow motion included).
import {
  FIGHT, SELECT, VERSUS, QUOTE as QUOTE_T, filmT, HITS, KICK_G, BPUNCH, JUMP, JK_G, PUNCH_G, SLASH_G, DK, DK_HIT, BALL, SUPER_G, SUPER_D,
  BEAM, BEAM_CLASH, BEAM_HITS, KO_G, KO_STOP, SLOW, LAND, WIN_G, YOUWIN_G, PERFECT_G, ROUND_G, FIGHT_G,
} from './choreo.js';
import { P1_STEPS, P1_PICK, CPU_PICK, QUOTE, QUOTE_TYPE, CHALLENGER } from './screens.js';

const VOW = {
  a: [730, 1090, 2440], o: [570, 840, 2410], u: [300, 870, 2240], i: [270, 2290, 3010], e: [530, 1840, 2480],
  er: [490, 1350, 1690], I: [390, 1990, 2550], O: [450, 800, 2830], U: [640, 1190, 2390], n: [250, 1600, 2600], r: [420, 1300, 1600],
};
// words: [kind, dur, a, b?] — kind 'v' voiced (a → b), 'c' consonant noise, 'g' gap
const WORDS = {
  round: [['v', 0.06, 'r'], ['v', 0.2, 'a', 'u'], ['v', 0.07, 'n'], ['c', 0.03, 'd']],
  one: [['v', 0.05, 'u'], ['v', 0.16, 'U'], ['v', 0.12, 'n']],
  fight: [['c', 0.08, 'f'], ['v', 0.28, 'a', 'i'], ['g', 0.03], ['c', 0.05, 't']],
  ko: [['c', 0.04, 'k'], ['v', 0.17, 'e', 'i'], ['g', 0.07], ['v', 0.34, 'O', 'u']],
  youwin: [['v', 0.17, 'i', 'u'], ['v', 0.05, 'u'], ['v', 0.13, 'I'], ['v', 0.12, 'n']],
  perfect: [['c', 0.03, 'p'], ['v', 0.13, 'er'], ['c', 0.07, 'f'], ['v', 0.13, 'e'], ['c', 0.04, 'k'], ['g', 0.02], ['c', 0.05, 't']],
  remy: [['v', 0.06, 'r'], ['v', 0.12, 'e'], ['v', 0.06, 'n'], ['v', 0.2, 'i']],
  versus: [['c', 0.05, 'f'], ['v', 0.12, 'er'], ['c', 0.07, 's'], ['v', 0.12, 'U'], ['c', 0.12, 's']],
  hairdouken: [['c', 0.05, 'h'], ['v', 0.13, 'e', 'er'], ['c', 0.02, 'd'], ['v', 0.12, 'O', 'u'], ['c', 0.03, 'k'], ['v', 0.1, 'e'], ['v', 0.08, 'n']],
  shin: [['c', 0.09, 'sh'], ['v', 0.12, 'I'], ['v', 0.07, 'n']],
  ha: [['c', 0.05, 'h'], ['v', 0.2, 'a']],
  no: [['v', 0.07, 'n'], ['v', 1.1, 'O', 'u']],
  ugh: [['v', 0.1, 'U']],
};

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit;
  const waves = {};
  const pulseWave = (duty) => {
    if (waves[duty]) return waves[duty];
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) { re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty); im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) ** 2; }
    return (waves[duty] = ac.createPeriodicWave(re, im));
  };
  // ---------- voices ----------
  const pulse = (t, m, dur, { duty = 0.25, g = 0.18, pan = 0, to = null, send = 0.05, vib = 0, dec = 0.6 } = {}) => at(t, () => {
    const o = osc('square', hz(m), t, dur + 0.02);
    o.setPeriodicWave(pulseWave(duty));
    if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur);
    if (vib) { const l = osc('sine', 6, t, dur), lg = ac.createGain(); lg.gain.value = hz(m) * 0.014 * vib; l.connect(lg).connect(o.frequency); }
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
    a.gain.linearRampToValueAtTime(g, t + 0.003);
    a.gain.setValueAtTime(g, t + Math.max(0.004, dur - 0.015));
    a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(a);
    out(a, 1, 0.02);
  });
  // 2-operator FM (bass, brass, bells)
  const fm = (t, m, dur, { g = 0.2, ratio = 1, index = 2, idx1 = 0.2, decay = 0.25, attack = 0.004, pan = 0, send = 0.06, to = null, width = 0 } = {}) => at(t, () => {
    const f = hz(m);
    const car = osc('sine', f, t, dur + 0.05), mod = osc('sine', f * ratio, t, dur + 0.05);
    if (to != null) { car.frequency.exponentialRampToValueAtTime(hz(to), t + dur); mod.frequency.exponentialRampToValueAtTime(hz(to) * ratio, t + dur); }
    const mg = ac.createGain();
    mg.gain.setValueAtTime(f * index, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, f * index * idx1), t + decay);
    mod.connect(mg).connect(car.frequency);
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + attack);
    a.gain.setValueAtTime(g, t + Math.max(attack + 0.002, dur - 0.03));
    a.gain.linearRampToValueAtTime(0, t + dur);
    car.connect(a);
    out(a, 1, send, pan, width);
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
  const kickD = (t, g = 0.36) => { tri(t, 50, 0.1, { g, to: 26 }); nz(t, 0.025, { f: 1500, type: 'lowpass', g: 0.2 }); };
  const snare = (t, g = 0.2) => { nz(t, 0.14, { f: 1900, type: 'bandpass', g, q: 0.6 }); tri(t, 52, 0.05, { g: 0.18, to: 40 }); };
  const hat = (t, g = 0.05, d = 0.03) => nz(t, d, { f: 7500, g });
  const crash = (t, g = 0.12) => nz(t, 1.2, { f: 5000, g, send: 0.2 });

  // formant announcer
  const say = (t, word, { pitch = 110, fall = 0.75, g = 0.5, send = 0.35, rate = 1, pan = 0 } = {}) => {
    const segs = WORDS[word];
    const total = segs.reduce((a, s) => a + s[1], 0) / rate;
    at(t, () => {
      const src = osc('sawtooth', pitch, t, total + 0.1);
      src.frequency.setValueAtTime(pitch * 1.08, t);
      src.frequency.linearRampToValueAtTime(pitch, t + total * 0.3);
      src.frequency.linearRampToValueAtTime(pitch * fall, t + total);
      const vib = osc('sine', 5.5, t, total), vg = ac.createGain();
      vg.gain.value = pitch * 0.02; vib.connect(vg).connect(src.frequency);
      const voiced = ac.createGain();
      voiced.gain.setValueAtTime(0, t);
      const sum = ac.createGain();
      const F = [0, 1, 2].map((k) => {
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass'; bp.Q.value = [9, 12, 14][k];
        const gg = ac.createGain(); gg.gain.value = [1.3, 0.8, 0.35][k];
        src.connect(bp).connect(gg).connect(sum);
        return bp;
      });
      sum.connect(voiced);
      // grit: arcade-sample crunch + band limit
      const sh = ac.createWaveShaper(), curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const v = i / 127.5 - 1; curve[i] = Math.tanh(v * 2.2); }
      sh.curve = curve;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
      const outG = ac.createGain(); outG.gain.value = g;
      voiced.connect(sh).connect(lp).connect(outG);
      out(outG, 1, send, pan);
      let tt = t;
      for (const [kind, d0, a, b] of segs) {
        const d = d0 / rate;
        if (kind === 'v') {
          const A = VOW[a], B = VOW[b ?? a];
          F.forEach((bp, k) => { bp.frequency.linearRampToValueAtTime(A[k], tt + 0.02); bp.frequency.linearRampToValueAtTime(B[k], tt + d); });
          const lvl = a === 'n' || a === 'r' ? 0.45 : 1;
          voiced.gain.linearRampToValueAtTime(lvl, tt + 0.015);
          voiced.gain.setValueAtTime(lvl, tt + d - 0.01);
        } else {
          voiced.gain.linearRampToValueAtTime(0, tt + 0.012);
          voiced.gain.setValueAtTime(0, tt + d - 0.005);
          if (kind === 'c') {
            const spec = { f: [1800, 'highpass', 0.18], s: [5000, 'highpass', 0.22], sh: [2600, 'bandpass', 0.3], h: [1400, 'bandpass', 0.18], t: [3500, 'highpass', 0.35], k: [2000, 'bandpass', 0.4], p: [900, 'lowpass', 0.4], d: [2500, 'bandpass', 0.3] }[a];
            const n = noise(tt, d), fl = ac.createBiquadFilter(), ng = ac.createGain();
            fl.type = spec[1]; fl.frequency.value = spec[0]; fl.Q.value = 1.2;
            ng.gain.setValueAtTime(spec[2] * g * 1.6, tt);
            ng.gain.exponentialRampToValueAtTime(0.001, tt + d + 0.02);
            n.connect(fl).connect(ng);
            out(ng, 1, send * 0.6, pan);
          }
        }
        tt += d;
      }
      voiced.gain.linearRampToValueAtTime(0, tt + 0.03);
    });
    return total;
  };

  // ---------- SFX ----------
  const whoosh = (t, g = 0.16, f0 = 500, f1 = 3000, d = 0.12) => nz(t, d, { f: f0, type: 'bandpass', f1, g, q: 1.2, send: 0.02 });
  const hitS = (t, big = false) => {
    tri(t, big ? 47 : 52, big ? 0.16 : 0.1, { g: 0.5, to: 24 });
    nz(t, big ? 0.18 : 0.1, { f: 2600, type: 'lowpass', f1: 300, g: big ? 0.55 : 0.4 });
    nz(t, 0.04, { f: 3200, type: 'bandpass', g: 0.35, q: 1.5 });
    pulse(t, big ? 64 : 70, 0.05, { duty: 0.5, g: 0.1, to: 40 });
    if (big) { kickD(t, 0.55); nz(t + 0.02, 0.3, { f: 900, type: 'lowpass', g: 0.25, send: 0.15 }); }
  };
  const blockS = (t) => { pulse(t, 96, 0.04, { duty: 0.5, g: 0.12 }); pulse(t + 0.01, 101, 0.06, { duty: 0.125, g: 0.08 }); nz(t, 0.05, { f: 6000, g: 0.25 }); tri(t, 60, 0.04, { g: 0.25, to: 40 }); };
  const jumpS = (t) => pulse(t, 60, 0.12, { duty: 0.125, g: 0.08, to: 72 });
  const landS = (t, g = 0.5) => { tri(t, 40, 0.18, { g, to: 22 }); nz(t, 0.25, { f: 700, type: 'lowpass', g: g * 0.8, send: 0.1 }); };

  // ---------- TITLE (0 – 1.3) ----------
  nz(0.0, 0.14, { f: 600, type: 'bandpass', f1: 5000, g: 0.12 });
  const stab = (t, notes, g = 0.12, dur = 0.5) => notes.forEach((m, i) => fm(t, m, dur, { g, ratio: 1, index: 3.5, idx1: 0.3, decay: 0.3, attack: 0.008, pan: (i - 1) * 0.3, send: 0.2 }));
  kickD(0.12, 0.7); nz(0.12, 0.6, { f: 3000, type: 'lowpass', f1: 120, g: 0.5, send: 0.2 }); tri(0.12, 38, 0.4, { g: 0.45, to: 26 });
  stab(0.12, [60, 63, 67, 72], 0.1, 0.34);
  kickD(0.4, 0.8); crash(0.4, 0.18); nz(0.4, 0.7, { f: 2500, type: 'lowpass', f1: 100, g: 0.55, send: 0.25 }); tri(0.4, 36, 0.5, { g: 0.5, to: 24 });
  stab(0.4, [56, 63, 68, 72, 75], 0.1, 0.5);
  [79, 84, 87, 91, 96].forEach((m, i) => pulse(0.64 + i * 0.035, m, 0.05, { duty: 0.125, g: 0.08, send: 0.15 }));
  // credit "coin" at PRESS START
  pulse(0.88, 83, 0.06, { duty: 0.5, g: 0.13 }); pulse(0.94, 88, 0.3, { duty: 0.5, g: 0.13, dec: 0.5 });
  fm(1.0, 43, 0.28, { g: 0.22, index: 2 }); fm(1.15, 48, 0.14, { g: 0.2, index: 2 });

  // ---------- SELECT (1.3 – 2.4): bouncy loop, cursor blips ----------
  const E = 0.1, S0 = SELECT;
  for (let i = 0; i < 11; i++) {
    const t = S0 + i * E, m = [38, 50, 45, 50, 41, 53, 48, 53, 38, 50, 45][i];
    fm(t, m, E * 0.9, { g: 0.2, index: 2.5, idx1: 0.2, decay: 0.08 });
    if (i % 2 === 0) kickD(t, 0.28); else hat(t, 0.05);
    pulse(t, [74, 77, 81, 77, 72, 76, 79, 76, 74, 77, 81][i] + 12, 0.05, { duty: 0.125, g: 0.05, pan: 0.3 });
  }
  P1_STEPS.slice(1).forEach(([lt]) => pulse(S0 + lt, 84, 0.04, { duty: 0.5, g: 0.12 }));
  for (let lt = 0.07; lt < CPU_PICK; lt += 0.07) pulse(S0 + lt, 91, 0.02, { duty: 0.5, g: 0.05, pan: 0.4 });
  const pick = (t) => { pulse(t, 79, 0.05, { duty: 0.5, g: 0.14 }); pulse(t + 0.05, 91, 0.2, { duty: 0.25, g: 0.13, dec: 0.5 }); nz(t, 0.2, { f: 5000, g: 0.08 }); };
  pick(S0 + P1_PICK); say(S0 + P1_PICK + 0.05, 'remy', { pitch: 120, g: 0.55 });
  pick(S0 + CPU_PICK); fm(S0 + CPU_PICK, 34, 0.3, { g: 0.25, index: 4, to: 30 });

  // ---------- VERSUS (2.4 – 3.2) ----------
  whoosh(VERSUS, 0.25, 300, 4000, 0.25);
  const V = VERSUS + 0.2;
  kickD(V, 0.8); crash(V, 0.2); nz(V, 0.8, { f: 2000, type: 'lowpass', f1: 90, g: 0.6, send: 0.3 }); tri(V, 33, 0.6, { g: 0.5, to: 24 });
  stab(V, [50, 57, 62, 65], 0.11, 0.55);
  say(V + 0.06, 'versus', { pitch: 92, g: 0.6, send: 0.45 });
  for (let i = 0; i < 10; i++) snare(V + 0.25 + i * 0.033, 0.05 + i * 0.012);

  // ---------- FIGHT ----------
  const T = filmT;
  const tR = T(ROUND_G) + 0.05, tF = T(FIGHT_G);
  const r1 = say(tR, 'round', { pitch: 100, g: 0.6, send: 0.45 });
  say(tR + r1 + 0.06, 'one', { pitch: 104, g: 0.6, send: 0.45 });
  nz(tR, 0.3, { f: 300, type: 'bandpass', f1: 3000, g: 0.06 });
  say(tF, 'fight', { pitch: 118, fall: 0.6, g: 0.75, send: 0.5 });
  kickD(tF, 0.7); crash(tF, 0.16); stab(tF, [62, 65, 69, 74], 0.08, 0.3);

  // fight theme (D minor, 160 BPM) from FIGHT! to the K.O.; it drops out under the super freeze
  const E8 = 60 / 160 / 2, BAR = E8 * 8;
  const M0 = tF + BAR / 2, M1 = T(KO_G), FZ0 = T(SUPER_G), FZ1 = FZ0 + SUPER_D;
  const live = (t) => t < M1 && (t < FZ0 - 0.02 || t >= FZ1);
  const MEL = [
    [[74, 2], [77, 1], [81, 2], [79, 1], [77, 1], [76, 1]],
    [[74, 2], [72, 1], [76, 3], [0, 1], [72, 1]],
    [[74, 1], [77, 1], [82, 2], [81, 1], [79, 1], [77, 1], [79, 1]],
    [[81, 3], [76, 1], [73, 2], [76, 1], [81, 1]],
  ];
  const ROOT = [38, 36, 34, 33], CH = [[62, 65, 69], [60, 64, 67], [58, 62, 65], [57, 61, 64]];
  // pickup into the theme
  [62, 65, 69].forEach((m, i) => pulse(tF + 0.3 + i * E8 * 0.67, m + 12, E8 * 0.6, { duty: 0.25, g: 0.12 }));
  for (let b = 0; b < 6; b++) {
    const t0 = M0 + b * BAR;
    if (t0 >= M1) break;
    let s = 0;
    for (const [m, len] of MEL[b % 4]) {
      const t = t0 + s * E8;
      if (m && live(t)) {
        const dur = Math.min(len * E8 * 0.92, M1 - t);
        pulse(t, m, dur, { duty: 0.25, g: 0.19, vib: len > 1 ? 0.7 : 0, send: 0.08 });
        pulse(t + 0.01, m - 12, dur, { duty: 0.5, g: 0.05, pan: -0.25 });
        if (b >= 2) fm(t, m + 12, Math.min(dur, 0.12), { g: 0.04, ratio: 3.5, index: 1.5, decay: 0.1, pan: 0.3 });
      }
      s += len;
    }
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * E8;
      if (!live(t)) continue;
      fm(t, ROOT[b % 4] + (e % 2 ? 12 : 0), E8 * 0.85, { g: 0.2, index: 3, idx1: 0.15, decay: 0.09 });
      if (e % 2) CH[b % 4].forEach((m, k) => pulse(t, m + 12, 0.06, { duty: 0.125, g: 0.03, pan: k - 1 === 0 ? 0 : (k - 1) * 0.35 }));
      if (e === 0 || e === 3 || e === 4) kickD(t, 0.32);
      if (e === 2 || e === 6) snare(t, 0.18);
      hat(t, e % 2 ? 0.045 : 0.03);
      hat(t + E8 / 2, 0.02);
      if (b % 4 === 3 && e >= 6) snare(t + E8 / 2, 0.12);
    }
  }
  kit.crowd(T(FIGHT_G), T(KO_G), 0.025);

  // moves
  whoosh(T(KICK_G - 0.06), 0.14);
  whoosh(T(BPUNCH.act - 0.06), 0.18, 300, 1800, 0.14);
  say(T(BPUNCH.t0), 'ugh', { pitch: 85, g: 0.3, send: 0.1 });
  jumpS(T(JUMP.t0));
  whoosh(T(JK_G - 0.05), 0.14);
  whoosh(T(PUNCH_G - 0.04), 0.12, 700, 3500, 0.08);
  whoosh(T(SLASH_G - 0.06), 0.18, 1500, 7000, 0.12);
  pulse(T(SLASH_G - 0.04), 100, 0.1, { duty: 0.125, g: 0.06, to: 88, send: 0.2 });
  landS(T(JUMP.t1), 0.25);
  // HAIR-DOUKEN: the yell's "KEN" lands on the release
  say(T(DK.t0) - 0.12, 'hairdouken', { pitch: 175, fall: 0.9, g: 0.55, send: 0.3, rate: 1.05 });
  const dr = T(DK.rel);
  nz(dr, 0.25, { f: 400, type: 'bandpass', f1: 2500, g: 0.3 }); fm(dr, 55, 0.25, { g: 0.18, index: 5, to: 43 });
  for (let t = dr + 0.05; t < T(DK_HIT); t += 0.05) nz(t, 0.04, { f: 2000, type: 'bandpass', g: 0.08, q: 2 });
  // boss dome ball
  say(T(BALL.t0) + 0.02, 'ha', { pitch: 80, fall: 0.8, g: 0.5, send: 0.2 });
  const br = T(BALL.rel);
  for (let i = 0; i < 6; i++) pulse(br + i * 0.06, 50 - i, 0.06, { duty: 0.5, g: 0.07, vib: 2, pan: 0.3 });
  nz(br, 0.25, { f: 300, type: 'bandpass', f1: 1200, g: 0.2, pan: 0.3 });
  // hits + blocks
  for (const h of HITS) {
    if (h.ko) continue;
    if (h.kind === 'block') blockS(T(h.g));
    else hitS(T(h.g), h.big);
  }
  // SUPER: freeze sting, cut-in voice, release blast, beam roar
  const sz = T(SUPER_G);
  kickD(sz, 0.7); nz(sz, 0.5, { f: 6000, g: 0.15, send: 0.3 });
  stab(sz, [62, 69, 74, 77], 0.1, 0.25);
  [74, 78, 81, 86, 90, 93, 98].forEach((m, i) => pulse(sz + 0.05 + i * 0.03, m, 0.05, { duty: 0.125, g: 0.08, send: 0.25 }));
  at(sz, () => {
    const o = osc('sawtooth', 80, sz, SUPER_D), lp = ac.createBiquadFilter(), a = ac.createGain();
    o.frequency.exponentialRampToValueAtTime(320, sz + SUPER_D);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, sz); lp.frequency.exponentialRampToValueAtTime(4000, sz + SUPER_D);
    a.gain.setValueAtTime(0, sz); a.gain.linearRampToValueAtTime(0.1, sz + SUPER_D * 0.9); a.gain.linearRampToValueAtTime(0, sz + SUPER_D);
    o.connect(lp).connect(a); out(a, 1, 0.2);
  });
  const sh = say(sz + 0.18, 'shin', { pitch: 165, g: 0.6, send: 0.4 });
  say(sz + 0.18 + sh + 0.02, 'hairdouken', { pitch: 182, fall: 0.85, g: 0.62, send: 0.4, rate: 0.95 });
  const bz = T(BEAM.rel) - 0.01;
  kickD(bz, 0.9); crash(bz, 0.2);
  nz(bz, 0.6, { f: 3000, type: 'lowpass', f1: 200, g: 0.6, send: 0.2 });
  at(bz, () => {
    const end = T(BEAM.end), n = noise(bz, end - bz), bp = ac.createBiquadFilter(), a = ac.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    a.gain.setValueAtTime(0, bz);
    a.gain.linearRampToValueAtTime(0.32, bz + 0.03);
    a.gain.setValueAtTime(0.32, end - 0.25);
    a.gain.linearRampToValueAtTime(0, end);
    const trem = osc('square', 24, bz, end - bz), tg = ac.createGain(); tg.gain.value = 0.1; trem.connect(tg).connect(a.gain);
    n.connect(bp).connect(a); out(a, 1, 0.12, 0, 0.5);
    const sub = osc('sawtooth', 55, bz, end - bz), sl = ac.createBiquadFilter(), sg = ac.createGain();
    sl.type = 'lowpass'; sl.frequency.value = 400; sg.gain.setValueAtTime(0.14, bz); sg.gain.linearRampToValueAtTime(0, end);
    sub.connect(sl).connect(sg); out(sg, 1, 0.05);
  });
  const cl = T(BEAM_CLASH);
  nz(cl, 0.5, { f: 2500, type: 'lowpass', f1: 100, g: 0.5, send: 0.3 }); pulse(cl, 88, 0.2, { duty: 0.125, g: 0.08, to: 60 }); tri(cl, 40, 0.25, { g: 0.4, to: 24 });
  BEAM_HITS.forEach((g, i) => { if (i % 3 === 0) say(T(g) + 0.01, 'ugh', { pitch: 95 - i * 2, g: 0.28, send: 0.1 }); });

  // K.O.: the music cuts, the last hit booms, the announcer echoes, the boss wails in slow motion
  const ko = T(KO_G);
  hitS(ko, true);
  kickD(ko, 1); crash(ko, 0.25);
  nz(ko, 1.6, { f: 1800, type: 'lowpass', f1: 60, g: 0.7, send: 0.5 });
  tri(ko, 31, 1.2, { g: 0.55, to: 20 });
  say(ko + KO_STOP + 0.02, 'ko', { pitch: 98, fall: 0.8, g: 0.8, send: 0.7 });
  say(ko + KO_STOP + 0.55, 'ko', { pitch: 98, fall: 0.8, g: 0.28, send: 0.8 });
  say(ko + 0.08, 'no', { pitch: 120, fall: 0.5, g: 0.38, send: 0.4, rate: 0.85 });
  at(ko, () => { // slow-motion drone
    const d = KO_STOP + SLOW.d, o = osc('sawtooth', 46, ko, d), lp = ac.createBiquadFilter(), a = ac.createGain();
    o.frequency.linearRampToValueAtTime(38, ko + d);
    lp.type = 'lowpass'; lp.frequency.value = 260;
    a.gain.setValueAtTime(0, ko); a.gain.linearRampToValueAtTime(0.16, ko + 0.2); a.gain.linearRampToValueAtTime(0, ko + d);
    o.connect(lp).connect(a); out(a, 1, 0.3, 0, 0.4);
  });
  kit.crowd(ko + 0.2, QUOTE_T + 0.1, 0.11);
  landS(T(LAND[0]), 0.7); nz(T(LAND[0]), 0.4, { f: 1200, type: 'lowpass', g: 0.4 });
  landS(T(LAND[1]), 0.3);

  // YOU WIN / PERFECT: fanfare
  const yw = T(YOUWIN_G), pf = T(PERFECT_G);
  jumpS(T(WIN_G));
  say(yw + 0.02, 'youwin', { pitch: 112, g: 0.7, send: 0.5 });
  say(pf + 0.02, 'perfect', { pitch: 118, fall: 0.7, g: 0.75, send: 0.5 });
  const fan = [[62, 66, 69, 74], [64, 67, 71, 76], [66, 69, 74, 78]];
  fan.forEach((grp, k) => {
    const t = yw + k * 0.16;
    grp.forEach((m, i) => fm(t, m, 0.15, { g: 0.06, ratio: 1, index: 2.5, decay: 0.1, pan: (i - 1.5) * 0.2, send: 0.15 }));
    fm(t, [38, 40, 42][k], 0.15, { g: 0.2, index: 2.5, decay: 0.1 });
    kickD(t, 0.3);
  });
  const FC = yw + 0.48;
  [74, 78, 81, 86].forEach((m, i) => fm(FC, m, 0.9, { g: 0.06, ratio: 1, index: 2, idx1: 0.5, decay: 0.4, pan: (i - 1.5) * 0.25, send: 0.25, width: 0.3 }));
  [86, 90, 93].forEach((m, i) => pulse(FC + i * 0.04, m, 0.7 - i * 0.04, { duty: 0.25, g: 0.07, vib: 1, dec: 0.7 }));
  fm(FC, 38, 0.9, { g: 0.22, index: 2 }); crash(FC, 0.12); snare(FC, 0.2);
  for (let t = pf + 0.3; t < pf + 0.7; t += 0.04) pulse(t, 96, 0.025, { duty: 0.5, g: 0.035, pan: 0.2 });
  pulse(pf + 0.7, 91, 0.05, { duty: 0.5, g: 0.1 }); pulse(pf + 0.75, 96, 0.25, { duty: 0.5, g: 0.1, dec: 0.5 });

  // ---------- WIN QUOTE ----------
  const q0 = QUOTE_T;
  whoosh(q0, 0.15, 400, 2000, 0.2);
  const n = QUOTE[0].length + QUOTE[1].length, dt = (QUOTE_TYPE[1] - QUOTE_TYPE[0]) / n;
  for (let i = 0; i < n; i++) if ((QUOTE[0] + QUOTE[1])[i] !== ' ') pulse(q0 + QUOTE_TYPE[0] + i * dt, 84 + (i % 3) * 2, 0.02, { duty: 0.5, g: 0.05, pan: 0.15 });
  // calm victory theme bed
  [[50, 0], [55, 0.4], [57, 0.8]].forEach(([m, d]) => fm(q0 + d, m - 12, 0.38, { g: 0.16, index: 1.6, decay: 0.2 }));
  [[74, 0.0], [78, 0.2], [81, 0.4], [79, 0.6], [78, 0.8], [76, 1.0], [78, 1.2]].forEach(([m, d]) => pulse(q0 + d, m, 0.18, { duty: 0.25, g: 0.08, vib: 0.5 }));
  // HERE COMES A NEW CHALLENGER!
  const ch = q0 + CHALLENGER;
  kickD(ch, 0.8); crash(ch, 0.18); stab(ch, [61, 64, 68, 73], 0.1, 0.3);
  for (let i = 0; i < 4; i++) {
    pulse(ch + 0.05 + i * 0.14, 81, 0.07, { duty: 0.5, g: 0.11 });
    pulse(ch + 0.12 + i * 0.14, 76, 0.07, { duty: 0.5, g: 0.11 });
  }
  fm(ch, 37, 0.6, { g: 0.24, index: 4 });
}
