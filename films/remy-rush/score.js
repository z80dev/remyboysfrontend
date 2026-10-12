// Genesis-style score: 2-operator FM voices (sine carrier, sine modulator with an index envelope) for slap bass,
// brass lead, stabs and e-piano; DAC-style drums; PSG squares for the classic SFX. All original, all synthesized.
// Film-time aligned through choreo.filmT so each sound lands on its frame (hit-stops included).
import {
  INTRO, filmT, CARD, REV, BOOST_G, LOOP_G, loopEnd, SPRING_G, LOCK_G, HURT_G, BOSS_HITS, BOSS_DIE, BOSS_FLEE, BOOMS, WRECK_LAND,
  BADNIKS, TAKEOFFS, RING_EVENTS, SIGN, SIGN_FLIPS, TALLY, G_END,
} from './choreo.js';

const T = filmT;
const M0 = INTRO; // zone music
const MB = T(LOCK_G); // boss music
const BAR = (MB - M0) / 4; // 4 bars of zone theme exactly fill the run (~171 BPM)
const E8 = BAR / 8;
const MK = T(BOSS_DIE); // boss music cut
const MR = T(9.3); // zone theme reprise as Remy runs for the sign
const MS = T(SIGN.t0); // reprise cut
const MJ = T(SIGN.t1); // act clear jingle

const ZONE = [
  { root: 41, chord: [65, 69, 72, 76], mel: [[69, 1], [72, 1], [77, 2], [76, 1], [72, 1], [74, 2]] },
  { root: 43, chord: [67, 71, 74, 76], mel: [[74, 1], [71, 1], [79, 2], [0, 1], [74, 1], [76, 1], [79, 1]] },
  { root: 40, chord: [64, 67, 71, 74], mel: [[79, 2], [76, 1], [74, 1], [71, 2], [74, 1], [76, 1]] },
  { root: 45, chord: [64, 67, 69, 72], mel: [[77, 1], [76, 1], [74, 1], [72, 1], [76, 4]] },
];

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit;
  // ---- FM voice ----
  const fm = (t, m, dur, { ratio = 1, i0 = 3, i1 = 1, idec = 0.12, a = 0.004, dec = 0.15, sus = 0.6, rel = 0.05, g = 0.15, pan = 0, send = 0.06, vib = 0, to = null, detune = 0, ratio2 = 0, i2 = 0 } = {}) => at(t, () => {
    const f = hz(m), end = t + dur;
    const car = osc('sine', f, t, dur + rel + 0.02);
    if (detune) car.detune.setValueAtTime(detune, t);
    if (to != null) car.frequency.exponentialRampToValueAtTime(hz(to), end);
    const mod = osc('sine', f * ratio, t, dur + rel + 0.02);
    if (to != null) mod.frequency.exponentialRampToValueAtTime(hz(to) * ratio, end);
    const mg = ac.createGain();
    mg.gain.setValueAtTime(f * ratio * i0, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(0.01, f * ratio * i1), t + idec);
    mod.connect(mg).connect(car.frequency);
    if (ratio2) { // second modulator in series for brighter brass
      const m2 = osc('sine', f * ratio2, t, dur + rel + 0.02), g2 = ac.createGain();
      g2.gain.setValueAtTime(f * ratio2 * i2, t);
      g2.gain.exponentialRampToValueAtTime(Math.max(0.01, f * ratio2 * i2 * 0.3), t + idec * 2);
      m2.connect(g2).connect(mod.frequency);
    }
    if (vib) {
      const l = osc('sine', 5.6, t, dur + rel), lg = ac.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(f * 0.012 * vib, t + Math.min(0.25, dur * 0.6));
      l.connect(lg).connect(car.frequency);
    }
    const amp = ac.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(g, t + a);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0005, g * sus), t + a + dec);
    amp.gain.setValueAtTime(Math.max(0.0005, g * sus), Math.max(t + a + dec, end));
    amp.gain.linearRampToValueAtTime(0, Math.max(t + a + dec, end) + rel);
    car.connect(amp);
    out(amp, 1, send, pan);
  });
  const bass = (t, m, d, g = 0.2) => fm(t, m, d, { ratio: 1, i0: 6, i1: 1.4, idec: 0.09, dec: 0.18, sus: 0.45, rel: 0.03, g, send: 0.01 });
  const lead = (t, m, d, g = 0.12, pan = 0) => {
    fm(t, m, d, { ratio: 1, i0: 2.4, i1: 1.6, idec: 0.2, a: 0.012, dec: 0.3, sus: 0.75, rel: 0.06, g, vib: d > 0.25 ? 1 : 0, pan: pan - 0.12, send: 0.1, ratio2: 3, i2: 0.6 });
    fm(t, m + 12, d, { ratio: 2, i0: 1, i1: 0.4, idec: 0.2, a: 0.012, dec: 0.3, sus: 0.6, rel: 0.06, g: g * 0.22, detune: 7, pan: pan + 0.2, send: 0.1 });
  };
  const stab = (t, ms, g = 0.045, d = 0.09) => ms.forEach((m, k) => fm(t, m, d, { ratio: 1, i0: 3.5, i1: 0.8, idec: 0.06, dec: 0.08, sus: 0.3, rel: 0.03, g, pan: (k - 1.5) * 0.25, send: 0.05 }));
  const ep = (t, m, g = 0.035, pan = 0.3) => fm(t, m, 0.12, { ratio: 14, i0: 1.6, i1: 0.05, idec: 0.15, dec: 0.2, sus: 0.2, rel: 0.05, g, pan, send: 0.12 });
  const bell = (t, m, g = 0.06, pan = 0, d = 0.3) => fm(t, m, d, { ratio: 3.5, i0: 2.2, i1: 0.1, idec: 0.25, dec: 0.3, sus: 0.15, rel: 0.1, g, pan, send: 0.15 });
  // ---- DAC-style drums ----
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
  const sweep = (t, f0, f1, dur, g, type = 'sine', pan = 0) => at(t, () => {
    const o = osc(type, f0, t, dur);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(a);
    out(a, 1, 0.02, pan);
  });
  const kick = (t, g = 0.5) => { sweep(t, 150, 42, 0.22, g); nz(t, 0.015, { f: 3000, g: 0.12 }); };
  const snare = (t, g = 0.2) => { nz(t, 0.16, { f: 1900, type: 'bandpass', g, q: 0.5 }); sweep(t, 230, 150, 0.08, g * 0.9, 'triangle'); };
  const hat = (t, g = 0.05, d = 0.03) => nz(t, d, { f: 8000, g });
  const crash = (t, g = 0.09) => nz(t, 1.1, { f: 5200, g, send: 0.2 });
  const tom = (t, f0, g = 0.35) => sweep(t, f0, f0 * 0.55, 0.18, g);
  const orch = (t, ms, g = 0.07) => { ms.forEach((m, k) => fm(t, m, 0.32, { ratio: 1, i0: 5, i1: 1.2, idec: 0.12, a: 0.003, dec: 0.25, sus: 0.25, rel: 0.1, g, pan: (k - 1.5) * 0.3, send: 0.25, ratio2: 2, i2: 1 })); nz(t, 0.2, { f: 2500, type: 'bandpass', g: 0.18, q: 0.6, send: 0.2 }); kick(t, 0.5); };
  // ---- PSG square SFX ----
  const waves = {};
  const pulseWave = (duty) => {
    if (waves[duty]) return waves[duty];
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) { re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty); im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) ** 2; }
    return (waves[duty] = ac.createPeriodicWave(re, im));
  };
  const sq = (t, m, dur, { g = 0.08, to = null, pan = 0, duty = 0.5, send = 0.03 } = {}) => at(t, () => {
    const o = osc('square', hz(m), t, dur + 0.02);
    o.setPeriodicWave(pulseWave(duty));
    if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(g, t);
    a.gain.setValueAtTime(g, t + dur * 0.7);
    a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(a);
    out(a, 1, send, pan);
  });

  // ================= TITLE =================
  nz(0.0, 0.36, { f: 600, type: 'bandpass', f1: 7000, g: 0.08, q: 1.2 });
  orch(0.36, [60, 64, 67, 72], 0.08); crash(0.36, 0.1); bass(0.36, 36, 0.4, 0.26);
  [[0.58, 67], [0.64, 69], [0.7, 72], [0.76, 74]].forEach(([t, m]) => lead(t, m, 0.07, 0.12));
  lead(0.82, 76, 0.32, 0.13);
  [0.58, 0.82].forEach((t) => hat(t, 0.05));
  snare(0.76, 0.14); kick(0.82, 0.4); bass(0.82, 41, 0.2, 0.2);
  orch(1.0, [65, 69, 72, 77], 0.07); bass(1.0, 43, 0.3, 0.24);
  // START pressed: PSG chime + fall into the zone
  sq(1.16, 84, 0.06, { g: 0.09 }); sq(1.22, 91, 0.16, { g: 0.08 });
  sweep(1.3, 900, 120, 0.2, 0.08, 'triangle');

  // ================= ZONE THEME =================
  const zoneBar = (t0, b, until) => {
    const Z = ZONE[b % 4];
    let s = 0;
    for (const [m, len] of Z.mel) {
      const t = t0 + s * E8;
      if (m && t < until) lead(t, m, Math.min(len * E8 * 0.92, until - t), 0.11);
      s += len;
    }
    const bassPat = [0, 0, 12, 0, 7, 0, 12, 10];
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * E8;
      if (t >= until) break;
      bass(t, Z.root + bassPat[e], E8 * 0.8, 0.19);
      if (e % 2) stab(t, Z.chord, 0.032);
      if (e === 0 || e === 3 || (e === 5 && b % 2)) kick(t, 0.42);
      if (e === 2 || e === 6) snare(t, 0.17);
      hat(t, e % 2 ? 0.045 : 0.03);
      if (e === 7) hat(t + E8 * 0.5, 0.05, 0.08);
      for (let k = 0; k < 2; k++) { const tt = t + k * E8 / 2; if (tt < until) ep(tt, Z.chord[(e * 2 + k) % 4] + 12, 0.022, (k ? 0.35 : -0.35)); }
    }
    if (b % 4 === 3) [5, 6, 7].forEach((e) => { const t = t0 + e * E8 + E8 / 2; if (t < until) snare(t, 0.11); });
  };
  crash(M0, 0.07);
  for (let b = 0; b < 4; b++) zoneBar(M0 + b * BAR, b, MB);
  // reprise as Remy runs for the sign
  zoneBar(MR, 0, MS);
  crash(MR, 0.06);

  // ================= BOSS THEME =================
  const B8 = E8;
  const bossBass = [36, 36, 48, 36, 39, 36, 46, 36, 36, 36, 48, 36, 42, 41, 39, 38];
  const bossLead = [[67, 4], [68, 4], [67, 3], [66, 1], [63, 4], [62, 4], [60, 6], [0, 2]];
  for (let b = 0; MB + b * BAR < MK; b++) {
    const t0 = MB + b * BAR;
    orch(t0, b % 2 ? [56, 60, 63, 68] : [55, 60, 63, 67], 0.05);
    for (let i = 0; i < 16; i++) { const t = t0 + i * B8 / 2; if (t < MK) bass(t, bossBass[i], B8 * 0.42, 0.17); }
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * B8;
      if (t >= MK) break;
      kick(t, e % 2 ? 0.28 : 0.42);
      if (e === 2 || e === 6) snare(t, 0.18);
      hat(t + B8 / 2, 0.05);
      if (b % 2 === 1 && e >= 6) { tom(t, 220); tom(t + B8 / 2, 160); }
    }
  }
  { let s = 0; for (const [m, len] of bossLead) { const t = MB + s * B8; if (m && t < MK) lead(t, m, Math.min(len * B8 * 0.95, MK - t), 0.1, 0.1); s += len; } }

  // ================= ACT CLEAR JINGLE =================
  const J = MJ;
  [[0, 72], [0.09, 76], [0.18, 79]].forEach(([d, m]) => lead(J + d, m, 0.08, 0.12));
  lead(J + 0.27, 84, 0.3, 0.13);
  [[0.6, 82], [0.69, 81], [0.78, 77]].forEach(([d, m]) => lead(J + d, m, 0.08, 0.12));
  lead(J + 0.87, 79, 0.18, 0.12);
  lead(J + 1.05, 84, 0.7, 0.13);
  orch(J, [60, 64, 67, 72], 0.05); orch(J + 0.6, [58, 65, 70, 74], 0.05); orch(J + 1.05, [60, 64, 67, 76], 0.06);
  bass(J, 36, 0.5, 0.2); bass(J + 0.6, 34, 0.4, 0.2); bass(J + 1.05, 36, 0.7, 0.22);
  crash(J + 1.05, 0.09);
  [79, 84, 88, 91, 88, 84].forEach((m, i) => bell(J + 1.1 + i * 0.07, m, 0.03, (i % 2 ? 0.4 : -0.4), 0.2));
  [0.27, 0.45].forEach((d) => snare(J + d, 0.12));

  // ================= SFX =================
  // zone card swish in / out
  nz(M0, 0.25, { f: 900, type: 'bandpass', f1: 5000, g: 0.08, q: 1 });
  nz(T(CARD.out), 0.25, { f: 5000, type: 'bandpass', f1: 800, g: 0.06, q: 1 });
  // peel-out rev and launch
  at(T(REV.t0), () => {
    const t = T(REV.t0), d = T(REV.t1) - t;
    const o = osc('sawtooth', 80, t, d), a = ac.createGain(), lp = ac.createBiquadFilter(), trem = osc('square', 18, t, d), tg = ac.createGain();
    o.frequency.exponentialRampToValueAtTime(520, t + d);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t); lp.frequency.exponentialRampToValueAtTime(4000, t + d);
    tg.gain.value = 0.04; trem.connect(tg).connect(a.gain);
    a.gain.setValueAtTime(0.0, t); a.gain.linearRampToValueAtTime(0.07, t + d);
    o.connect(lp).connect(a); out(a, 1, 0.03);
  });
  { const t = T(REV.t1); nz(t, 0.4, { f: 3000, type: 'bandpass', f1: 400, g: 0.22, q: 0.7 }); sq(t, 72, 0.18, { g: 0.07, to: 48 }); kick(t, 0.3); }
  // rings: the alternating left/right "ching"
  RING_EVENTS.forEach((g, i) => {
    const t = T(g), p = i % 2 ? 0.5 : -0.5;
    bell(t, 88, 0.05, p, 0.05); bell(t + 0.045, 95, 0.055, p, 0.35);
  });
  // jumps
  for (const g of TAKEOFFS) {
    if (g === SPRING_G) continue;
    sq(T(g), g > 10 ? 62 : 55, 0.16, { g: 0.07, to: g > 10 ? 79 : 74, duty: 0.25 });
  }
  // badnik pops
  for (const b of BADNIKS) {
    const t = T(b.g);
    nz(t, 0.3, { f: 2500, type: 'lowpass', f1: 200, g: 0.4 }); kick(t, 0.4);
    sq(t, 76, 0.1, { g: 0.07, to: 50 });
    sq(t + 0.05, 84, 0.05, { g: 0.05, duty: 0.25 }); // bounce-off blip
  }
  // dash panel + loop wind
  { const t = T(BOOST_G); sq(t, 60, 0.25, { g: 0.06, to: 96, duty: 0.125 }); nz(t, 0.35, { f: 600, type: 'bandpass', f1: 6000, g: 0.14, q: 0.8 }); }
  { const t = T(LOOP_G), d = T(loopEnd) - t; nz(t, d, { f: 400, type: 'bandpass', f1: 2400, g: 0.1, q: 0.6, send: 0.1 }); }
  // spring boing
  { const t = T(SPRING_G); fm(t, 55, 0.35, { ratio: 1, i0: 4, i1: 0.5, idec: 0.3, g: 0.14, to: 79, vib: 3 }); sq(t, 60, 0.2, { g: 0.05, to: 84, duty: 0.25 }); }
  // boss arrival: hover hum
  at(T(LOCK_G), () => {
    const t = T(LOCK_G), d = T(BOSS_FLEE + 0.6) - t;
    const o = osc('sawtooth', 55, t, d), l = osc('sine', 7, t, d), lg = ac.createGain(), a = ac.createGain(), lp = ac.createBiquadFilter();
    lg.gain.value = 4; l.connect(lg).connect(o.frequency);
    lp.type = 'lowpass'; lp.frequency.value = 380;
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.05, t + 0.4); a.gain.setValueAtTime(0.05, t + d - 0.3); a.gain.linearRampToValueAtTime(0, t + d);
    o.connect(lp).connect(a); out(a, 1, 0.02, 0.2);
  });
  // ring loss on the hit: thump + rings spilling everywhere
  { const t = T(HURT_G);
    nz(t, 0.3, { f: 1800, type: 'lowpass', f1: 150, g: 0.4 }); kick(t, 0.5); fm(t, 50, 0.2, { ratio: 1.41, i0: 8, i1: 1, idec: 0.1, g: 0.12 });
    for (let i = 0; i < 12; i++) bell(t + 0.03 + i * 0.035, 96 - (i % 4) * 3 - Math.floor(i / 4), 0.04, (i % 3 - 1) * 0.7, 0.18);
  }
  // boss hits: metal clank
  for (const g of BOSS_HITS) {
    const t = T(g), fin = g === BOSS_DIE;
    fm(t, 57, 0.3, { ratio: 1.414, i0: 10, i1: 0.5, idec: 0.15, g: 0.18, dec: 0.25, sus: 0.1 });
    fm(t, 69, 0.2, { ratio: 2.76, i0: 6, i1: 0.3, idec: 0.1, g: 0.08, pan: 0.2 });
    nz(t, 0.18, { f: 3500, type: 'bandpass', g: 0.25, q: 1 }); kick(t, 0.45);
    if (fin) { nz(t, 0.9, { f: 2500, type: 'lowpass', f1: 80, g: 0.5, send: 0.3 }); sweep(t, 120, 30, 0.6, 0.5); crash(t, 0.12); }
  }
  // explosion chain
  for (const b of BOOMS) { const t = T(b.g); nz(t, 0.28, { f: 2200, type: 'lowpass', f1: 120, g: 0.32, pan: b.pan, send: 0.12 }); sweep(t, 90, 40, 0.15, 0.22); }
  // wrecking ball lands
  { const t = T(WRECK_LAND); kick(t, 0.6); nz(t, 0.4, { f: 900, type: 'lowpass', f1: 100, g: 0.35 }); }
  // the pod sputters away
  for (let i = 0; i < 7; i++) { const t = T(BOSS_FLEE) + i * 0.08; nz(t, 0.06, { f: 700, type: 'lowpass', g: 0.15, pan: 0.2 + i * 0.08 }); }
  sq(T(BOSS_FLEE), 70, 0.5, { g: 0.04, to: 45, duty: 0.25, pan: 0.5 });
  // signpost: a flick each time the plate goes edge-on
  sq(T(SIGN.t0), 79, 0.05, { g: 0.06 });
  for (const g of SIGN_FLIPS) { sq(T(g), 91, 0.03, { g: 0.06, duty: 0.25 }); nz(T(g), 0.02, { f: 6000, g: 0.05 }); }
  // tally countdown + cha-ching
  for (let t = T(TALLY.count0); t < T(TALLY.count1); t += 0.045) sq(t, 96, 0.022, { g: 0.04, pan: 0.2 });
  { const t = T(TALLY.count1); nz(t, 0.06, { f: 4000, type: 'bandpass', g: 0.2, q: 2 }); bell(t + 0.04, 91, 0.07, 0, 0.6); bell(t + 0.04, 96, 0.05, 0.3, 0.6); }
  // tally lines whoosh in
  nz(T(TALLY.t0), 0.2, { f: 1200, type: 'bandpass', f1: 5000, g: 0.07 });
  void G_END;
}
