// Original score: a 1910s parlour pianist follows the picture. One custom honky-tonk piano voice
// built from kit primitives carries everything; the train, horn and steel get small bespoke voices.
// Period practice: silents had music and projector noise, no foley — so the SFX are all
// "music-adjacent" (whistle, clang, honk) plus the projector bed. Every cue imports the timeline.
import { FINALE, PARLOUR, RESCUE, SNATCH, T, TRACKS, filmT } from "./timeline.js";

// ---- the piano: 5 detuned partials + a hammer thump, quick attack, long exp decay ----
const pno = (k, t, m, o = {}) =>
  k.at(t, () => {
    const { g = 0.14, dur = 0.8, pan = 0, send = 0.26, bright = 1 } = o;
    const f = k.hz(m);
    const mix = k.ac.createGain();
    const parts = [
      ["sine", 1, 1],
      ["sine", 2.004, 0.4 * bright],
      ["sine", 2.997, 0.17 * bright],
      ["triangle", 4.01, 0.08 * bright],
      ["sine", 6.02, 0.05],
    ];
    for (const [type, ratio, pg] of parts) {
      const osc = k.osc(type, f * ratio, t, dur + 0.12);
      const og = k.ac.createGain();
      og.gain.value = pg;
      osc.connect(og).connect(mix);
    }
    const n = k.noise(t, 0.03);
    const nf = k.ac.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = Math.min(6500, f * 4);
    nf.Q.value = 0.7;
    const ng = k.ac.createGain();
    ng.gain.setValueAtTime(0.4 * g, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    n.connect(nf).connect(ng).connect(mix);
    const a = k.ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.005);
    a.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    mix.connect(a);
    k.out(a, 1, send, pan);
  });

// ---- small voices ----
const whistle = (k, t, dur, g = 0.12, pan = 0.08) =>
  k.at(t, () => {
    for (const f of [587.3, 740]) {
      const o = k.osc("sine", f, t, dur);
      const v = k.osc("sine", 5.3, t, dur);
      const vg = k.ac.createGain();
      vg.gain.setValueAtTime(0, t + 0.15);
      vg.gain.linearRampToValueAtTime(5, t + 0.5);
      v.connect(vg);
      vg.connect(o.detune);
      const a = k.ac.createGain();
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(g, t + 0.06);
      a.gain.setValueAtTime(g * 0.9, t + dur - 0.22);
      a.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(a);
      k.out(a, 1, 0.4, pan);
    }
  });
const chuff = (k, t, g = 0.09) =>
  k.at(t, () => {
    const n = k.noise(t, 0.17);
    const bp = k.ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(560, t);
    bp.frequency.exponentialRampToValueAtTime(220, t + 0.15);
    const a = k.ac.createGain();
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    n.connect(bp).connect(a);
    k.out(a, 1, 0.3, -0.12);
    const th = k.osc("sine", 74, t, 0.1);
    const tg = k.ac.createGain();
    tg.gain.setValueAtTime(g * 0.9, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    th.connect(tg);
    k.out(tg, 1, 0.08, 0);
  });
const clang = (k, t, g = 0.14) =>
  k.at(t, () => {
    for (const [f, pg] of [
      [1244, 1],
      [1661, 0.7],
      [2218, 0.5],
      [2960, 0.35],
      [3730, 0.2],
    ]) {
      const o = k.osc("sine", f, t, 0.5);
      const a = k.ac.createGain();
      a.gain.setValueAtTime(g * pg * 0.16, t);
      a.gain.exponentialRampToValueAtTime(0.0006, t + 0.45);
      o.connect(a);
      k.out(a, 1, 0.5, 0.1);
    }
    const n = k.noise(t, 0.06);
    const hp = k.ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3000;
    const a2 = k.ac.createGain();
    a2.gain.setValueAtTime(g * 0.5, t);
    a2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    n.connect(hp).connect(a2);
    k.out(a2, 1, 0.3, 0);
  });
const cym = (k, t, g = 0.16) =>
  k.at(t, () => {
    const n = k.noise(t, 1.4);
    const bp = k.ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 5600;
    bp.Q.value = 0.5;
    const a = k.ac.createGain();
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.0008, t + 1.35);
    n.connect(bp).connect(a);
    k.out(a, 1, 0.5, 0);
  });
const honk = (k, t, g = 0.09) =>
  k.at(t, () => {
    for (const f of [220, 277]) {
      const o = k.osc("square", f, t, 0.17);
      const lp = k.ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 850;
      const a = k.ac.createGain();
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(g, t + 0.015);
      a.gain.setValueAtTime(g, t + 0.12);
      a.gain.linearRampToValueAtTime(0, t + 0.17);
      o.connect(lp).connect(a);
      k.out(a, 1, 0.2, 0.15);
    }
  });
const boing = (k, t, g = 0.11) =>
  k.at(t, () => {
    const o = k.osc("triangle", 620, t, 0.5);
    o.frequency.setValueAtTime(620, t);
    o.frequency.exponentialRampToValueAtTime(170, t + 0.45);
    const a = k.ac.createGain();
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    o.connect(a);
    k.out(a, 1, 0.25, 0.1);
  });
const snap = (k, t, g = 0.16) =>
  k.at(t, () => {
    const n = k.noise(t, 0.05);
    const hp = k.ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2500;
    const a = k.ac.createGain();
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(hp).connect(a);
    k.out(a, 1, 0.25, 0);
    pno(k, t, 69, { g: g * 0.7, dur: 0.14, pan: 0.1 });
  });

// projector bed: soft rumble + flutter, under everything
function projector(k, dur) {
  k.at(0, () => {
    const n = k.noise(0, dur);
    const lp = k.ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 95;
    const g = k.ac.createGain();
    g.gain.value = 0.013;
    const flut = k.osc("sine", 0.6, 0, dur);
    const fg = k.ac.createGain();
    fg.gain.value = 0.004;
    flut.connect(fg);
    fg.connect(g.gain);
    n.connect(lp).connect(g);
    k.out(g, 1, 0, 0);
  });
}

export function score(k) {
  projector(k, T.end + 0.5);

  // ================= I · TITLE =================
  const roll = [48, 52, 55, 60, 64];
  roll.forEach((m, i) => pno(k, 0.55 + i * 0.05, m, { g: 0.12, dur: 1.5, pan: -0.05 }));
  for (const m of [36, 43, 48, 55]) pno(k, 1.2, m, { g: 0.14, dur: 1.4, pan: -0.12 });
  for (let i = 0; i < 8; i++) pno(k, 2.35 + i * 0.117, i % 2 ? 59 : 55, { g: 0.06, dur: 0.14 });
  // the title lands at 3.45
  k.swell(2.9, 3.42, 0.16);
  [36, 48, 52, 55, 60, 64, 67].forEach((m, i) =>
    pno(k, 3.45 + i * 0.03, m, { g: 0.15, dur: 1.7, pan: i % 2 ? 0.08 : -0.08 }),
  );
  [60, 62, 64, 67, 69, 72, 74, 76].forEach((m, i) => pno(k, 3.95 + i * 0.055, m, { g: 0.1, dur: 0.4, pan: 0.15 }));
  for (let i = 0; i < 4; i++) {
    const tt = 4.7 + i * 0.62;
    const ch = i % 2 ? [53, 60, 65] : [48, 55, 64];
    ch.forEach((m, j) => pno(k, tt + j * 0.012, m, { g: 0.075, dur: 0.55, pan: -0.05 }));
  }
  for (const m of [43, 47, 53, 59]) pno(k, 7.15, m, { g: 0.12, dur: 0.5, pan: -0.1 });
  for (const m of [36, 48, 52, 55, 60]) pno(k, 7.55, m, { g: 0.13, dur: 0.7, pan: 0 });

  // ================= II · PARLOUR (112 BPM two-step, C) =================
  const B = 60 / 112;
  const v = (i) => T.parlour + i * B;
  const CH = [
    [48, 52, 55],
    [48, 52, 55],
    [53, 57, 60],
    [48, 52, 55],
    [50, 55, 59],
    [48, 52, 55],
  ];
  for (let i = 0; i < 11; i++) {
    pno(k, v(i), i % 4 === 2 ? 43 : i % 4 === 0 ? 36 : 43, { g: 0.17, dur: 0.42, pan: -0.14, bright: 0.6 });
    if (i % 2 === 1) {
      const bar = Math.floor(i / 2) % 6;
      CH[bar].forEach((m, j) => pno(k, v(i) + j * 0.012, m, { g: 0.08, dur: 0.2, pan: -0.05, bright: 0.85 }));
    }
  }
  const MEL = [
    [0, 64],
    [0.5, 67],
    [1, 72, 1],
    [2, 67],
    [2.5, 69],
    [3, 67],
    [3.5, 64],
    [4, 67, 1],
    [5, 65],
    [5.5, 69],
    [6, 72, 1],
    [7, 69],
    [7.5, 67],
    [8, 65],
    [8.5, 62],
    [9, 65, 1],
    [10, 67, 0.5],
  ];
  for (const [i, m, len] of MEL) pno(k, v(i), m, { g: 0.17, dur: (len ?? 0.5) * B * 1.6, pan: 0.16 });
  // romance under the heart iris: cantabile over arpeggios
  const romT = PARLOUR.heart[0] + T.parlour;
  const romE = PARLOUR.heart[2] + T.parlour;
  for (const [tt, m] of [
    [romT, 69],
    [romT + 0.8, 72],
    [romT + 1.7, 71],
    [romE - 0.7, 67],
  ])
    pno(k, tt, m, { g: 0.12, dur: 1.1, pan: 0.14, send: 0.34 });
  for (let tt = romT - 0.1; tt < romE + 0.4; tt += 0.2675) {
    const step = Math.round((tt - romT + 0.1) / 0.2675) % 4;
    pno(k, tt, [48, 52, 55, 59][step], { g: 0.055, dur: 0.5, pan: -0.1 });
  }
  // goons peek: sneaky chromatic creep into the villain key
  for (let i = 0; i < 4; i++) pno(k, T.snatch - 2.4 + i * 0.55, 36 + i, { g: 0.15, dur: 0.3, pan: -0.14, bright: 0.6 });
  for (let i = 0; i < 8; i++) pno(k, T.snatch - 1.4 + i * 0.16, i % 2 ? 68 : 69, { g: 0.045, dur: 0.12, pan: 0.1 });

  // ================= III · SNATCH (A minor, the villain tread) =================
  const W = 60 / 104;
  const a = (i) => T.snatch + i * W;
  for (let i = 0; i < 6; i++) {
    pno(k, a(i), 33, { g: 0.13, dur: 0.4, pan: -0.14, bright: 0.6 });
    if (i % 2 === 1) [57, 60, 64].forEach((m, j) => pno(k, a(i) + j * 0.012, m, { g: 0.06, dur: 0.18, pan: -0.04 }));
  }
  [57, 60, 59, 60, 57, 56, 57, 52].forEach((m, i) =>
    pno(k, T.snatch + i * 0.29, m, { g: 0.055, dur: 0.22, pan: 0.12 }),
  );
  // the grab
  for (const gt of [SNATCH.grab[0] + T.snatch, SNATCH.grab[0] + T.snatch + 0.32])
    [57, 60, 64].forEach((m, j) => pno(k, gt + j * 0.01, m, { g: 0.11, dur: 0.3, pan: 0 }));
  // motorcar putt-putt
  const carT = SNATCH.carIn[0] + T.snatch;
  for (let i = 0; i < 14; i++)
    pno(k, carT + i * 0.144, i % 2 ? 40 : 33, { g: i < 2 ? 0.02 : 0.11, dur: 0.13, pan: -0.1, bright: 0.5 });
  pno(k, SNATCH.boss[0] + T.snatch, 33, { g: 0.17, dur: 0.5, pan: -0.14 });
  pno(k, SNATCH.boss[0] + T.snatch, 45, { g: 0.13, dur: 0.4, pan: -0.1 });
  // mustache twirl: tremolo
  const tw0 = SNATCH.twirl[0] + T.snatch;
  const tw1 = SNATCH.twirl[1] + T.snatch;
  for (let i = 0; i < 12; i++)
    pno(k, tw0 + (i * (tw1 - tw0)) / 12, i % 2 ? 69 : 64, { g: 0.04 + (i / 12) * 0.07, dur: 0.16, pan: 0.08 });
  // the getaway: chromatic climb + horn
  const outT = SNATCH.carOut[0] + T.snatch;
  [33, 34, 35, 36].forEach((m, i) => pno(k, outT + i * 0.34, m, { g: 0.16, dur: 0.3, pan: -0.14, bright: 0.6 }));
  [57, 60, 59, 62, 60, 64].forEach((m, i) => pno(k, outT + i * 0.17, m, { g: 0.1, dur: 0.2, pan: 0.12 }));
  honk(k, outT + 0.4);
  honk(k, outT + 0.72);

  // ================= IV · PERIL CARD (tremolo + rising bass) =================
  for (let i = 0; i < 27; i++)
    pno(k, T.cardPeril + 0.25 + i * 0.147, i % 2 ? 69 : 62, { g: 0.035 + (i / 27) * 0.05, dur: 0.13, pan: 0 });
  [26, 28, 29, 31].forEach((m, i) =>
    pno(k, T.cardPeril + 0.5 + i * 1.0, m, { g: 0.15, dur: 0.8, pan: -0.14, bright: 0.6 }),
  );
  [55, 59, 62].forEach((m, j) => pno(k, T.tracks - 0.3 + j * 0.012, m, { g: 0.12, dur: 0.4, pan: 0 }));

  // ================= V · TRACKS (152 BPM gallop, G) =================
  const Cb = 60 / 152;
  const c = (i) => T.tracks + i * Cb;
  for (let i = 0; i < 29; i++) {
    pno(k, c(i), [31, 31, 28, 31, 33, 31][Math.floor(i / 5) % 6], { g: 0.16, dur: 0.24, pan: -0.14, bright: 0.6 });
    [
      [55, 59, 62],
      [55, 59, 62],
      [52, 55, 59],
      [55, 59, 62],
      [57, 60, 64],
      [55, 59, 62],
    ][Math.floor(i / 5) % 6].forEach((m, j) => pno(k, c(i) + Cb / 2 + j * 0.01, m, { g: 0.06, dur: 0.13, pan: -0.04 }));
  }
  const CMEL = [
    [0, 67],
    [1, 67],
    [2, 71],
    [3, 74],
    [4, 72],
    [5, 71],
    [6, 69],
    [7, 71],
    [8, 69, 2],
    [10, 67],
    [11, 74],
    [12, 76],
    [13, 74],
    [14, 71],
    [15, 69],
    [16, 67, 2],
    [18, 69],
    [19, 69],
    [20, 72],
    [21, 76],
    [22, 74],
    [23, 72],
    [24, 71],
    [26, 67, 3],
  ];
  for (const [i, m, len] of CMEL) pno(k, c(i), m, { g: 0.165, dur: (len ?? 0.55) * Cb * 1.7, pan: 0.16 });
  // the 5:15 announces itself: chuffs accelerating toward the cut
  for (let tt = T.tracks + 1.2, i = 0; tt < T.cardHero - 0.4; i++) {
    const u = (tt - T.tracks - 1.2) / (T.cardHero - T.tracks - 1.6);
    chuff(k, tt, 0.03 + u * 0.045);
    tt += 0.55 - u * 0.27;
  }
  whistle(k, T.tracks + TRACKS.whistleFar, 0.9, 0.045);

  // ================= VI · HERO CARD (fanfare) =================
  const h0 = T.cardHero + 0.5;
  for (const [tt, m] of [
    [h0, 55],
    [h0 + 0.42, 60],
    [h0 + 0.84, 64],
  ])
    pno(k, tt, m, { g: 0.13, dur: 0.35, pan: 0.12 });
  pno(k, h0 + 1.34, 67, { g: 0.16, dur: 1.3, pan: 0.16 });
  [48, 52, 55].forEach((m, j) => pno(k, h0 + 1.34 + j * 0.02, m, { g: 0.12, dur: 1.2, pan: -0.08 }));
  [60, 64, 67, 72, 76].forEach((m, i) => pno(k, T.cardHero + 3.0 + i * 0.06, m, { g: 0.09, dur: 0.35, pan: 0.14 }));

  // ================= VII · RESCUE (the duel + the pass) =================
  const R = 60 / 152;
  const r = (i) => T.rescue + i * R;
  for (let i = 0; i < 18; i++) {
    if (i > 8 && i < 17) continue; // the pass takes over the low end
    pno(k, r(i), [31, 31, 28, 31][Math.floor(i / 4) % 4], { g: 0.15, dur: 0.24, pan: -0.14, bright: 0.6 });
    [
      [55, 59, 62],
      [55, 59, 62],
      [52, 55, 59],
      [55, 59, 62],
    ][Math.floor(i / 4) % 4].forEach((m, j) => pno(k, r(i) + R / 2 + j * 0.01, m, { g: 0.055, dur: 0.12, pan: -0.04 }));
  }
  const RMEL = [
    [0, 67],
    [1, 67],
    [2, 71],
    [3, 74],
    [4, 74],
    [5, 72],
    [6, 71],
    [7, 69],
    [8, 67, 2],
  ];
  for (const [i, m, len] of RMEL) pno(k, r(i), m, { g: 0.16, dur: (len ?? 0.55) * R * 1.7, pan: 0.16 });
  // steel + boater, all cued through the hit-stop clock
  clang(k, filmT(RESCUE.clashA), 0.1);
  clang(k, filmT(RESCUE.clashB), 0.1);
  clang(k, filmT(RESCUE.clash), 0.16);
  cym(k, filmT(RESCUE.clash), 0.14);
  [43, 55, 59, 62, 67].forEach((m, i) =>
    pno(k, filmT(RESCUE.clash) + i * 0.02, m, { g: 0.15, dur: 1.1, pan: i % 2 ? 0.06 : -0.06 }),
  );
  boing(k, filmT(RESCUE.hatFly + 0.05));
  pno(k, filmT(RESCUE.fall + 0.45), 28, { g: 0.18, dur: 0.9, pan: -0.1 });
  // ropes
  snap(k, filmT(RESCUE.snap[0]));
  snap(k, filmT(RESCUE.snap[1]));
  for (const s of RESCUE.ropes) pno(k, filmT(s), 79, { g: 0.05, dur: 0.1, pan: 0.12 });
  // she rises
  [48, 55, 64].forEach((m, j) => pno(k, filmT(RESCUE.rise[1]) + j * 0.02, m, { g: 0.11, dur: 1.4, pan: -0.04 }));
  pno(k, filmT(RESCUE.rise[1]) + 0.1, 72, { g: 0.12, dur: 1.2, pan: 0.16 });
  // THE PASS: barrelhouse octaves + whistle + chuffs, then sudden quiet
  const pass0 = filmT(RESCUE.trainPass[0]);
  const pass1 = filmT(RESCUE.trainPass[1]);
  for (let tt = pass0 + 0.4, i = 0; tt < pass1 - 0.35; i++) {
    const u = (tt - pass0 - 0.4) / (pass1 - pass0 - 0.75);
    pno(k, tt, i % 2 ? 45 : 33, { g: 0.1 + u * 0.07, dur: 0.11, pan: -0.08, bright: 0.55 });
    tt += 0.165 - u * 0.05;
  }
  whistle(k, pass0 + 0.5, 1.5, 0.13);
  for (let tt = pass0 + 0.15; tt < pass1 - 0.2; tt += 0.13) chuff(k, tt, 0.09 + 0.03 * Math.sin(tt * 7));
  [55, 59, 62, 67, 71, 74, 79].forEach((m, i) => pno(k, pass1 - 0.28 + i * 0.045, m, { g: 0.1, dur: 0.5, pan: 0.15 }));
  cym(k, pass1 - 0.1, 0.15);
  for (let i = 0; i < 6; i++) pno(k, pass1 + 0.3 + i * 0.15, i % 2 ? 72 : 67, { g: 0.035, dur: 0.13, pan: 0 });
  // warmth returns
  const warm = pass1 + 1.2;
  for (const [tt, m] of [
    [warm, 64],
    [warm + 0.5, 67],
    [warm + 1.0, 72],
  ])
    pno(k, tt, m, { g: 0.12, dur: 0.9, pan: 0.15, send: 0.34 });
  [48, 52, 55].forEach((m, j) => pno(k, warm + j * 0.012, m, { g: 0.08, dur: 2.2, pan: -0.06 }));
  [67, 71, 74, 79].forEach((m, i) =>
    pno(k, filmT(RESCUE.stroke + 0.35) + i * 0.07, m, { g: 0.08, dur: 0.5, pan: 0.12 }),
  );

  // ================= VIII · FINALE (the theme, legato, at dusk) =================
  const F = 60 / 112;
  const f = (i) => T.finale + i * F;
  const FMEL = [
    [0, 64],
    [1, 67],
    [2, 72, 2],
    [4, 69],
    [5, 72],
    [6, 76, 2],
    [8, 74],
    [9, 72],
    [10, 71],
    [12, 67, 2],
  ];
  for (const [i, m, len] of FMEL) pno(k, f(i), m, { g: 0.125, dur: (len ?? 1) * F * 1.5, pan: 0.15, send: 0.34 });
  for (let i = 0; i < 15; i++) {
    if (i % 4 === 0) pno(k, f(i), i % 8 === 0 ? 36 : 43, { g: 0.13, dur: 0.9, pan: -0.14, bright: 0.6 });
    pno(k, f(i) + (i % 4 === 0 ? F * 0.5 : 0), [52, 55, 59, 55][i % 4], { g: 0.05, dur: 0.7, pan: -0.08 });
    if (i % 4 !== 0) pno(k, f(i), [48, 52, 55, 59][i % 4], { g: 0.05, dur: 0.6, pan: -0.08 });
  }
  [67, 71, 74, 79].forEach((m, i) => pno(k, T.finale + FINALE.stroke + i * 0.07, m, { g: 0.08, dur: 0.5, pan: 0.12 }));
  [48, 55, 64].forEach((m, j) => pno(k, T.finis - 0.45 + j * 0.012, m, { g: 0.1, dur: 0.6, pan: -0.06 }));

  // ================= IX · FINIS (diminished gasp → big C → bump-ba-dum) =================
  for (let i = 0; i < 6; i++)
    pno(k, T.finis + 0.5 + i * 0.15, [58, 61, 64, 67][i % 4], {
      g: 0.05 + i * 0.008,
      dur: 0.14,
      pan: i % 2 ? 0.06 : -0.06,
    });
  [36, 48, 52, 55, 60, 64, 67, 72].forEach((m, i) =>
    pno(k, T.finis + 1.5 + i * 0.035, m, { g: 0.14, dur: 2.2, pan: i % 2 ? 0.08 : -0.08 }),
  );
  [38, 50, 53, 59].forEach((m, j) => pno(k, T.finis + 3.7 + j * 0.02, m, { g: 0.11, dur: 0.7, pan: -0.06 }));
  pno(k, T.finis + 4.9, 43, { g: 0.16, dur: 0.3, pan: -0.1 });
  pno(k, T.finis + 5.25, 43, { g: 0.14, dur: 0.25, pan: -0.1 });
  [36, 48, 52, 55].forEach((m, j) =>
    pno(k, T.finis + 5.6 + j * 0.02, m, { g: 0.15, dur: 1.5, pan: j % 2 ? 0.05 : -0.05 }),
  );
}
