// Original launch-commercial score, 120 BPM. Everything is scheduled in film seconds from timeline.js.
// Groove D–A–Bm–G; the turn drops to a B-minor drone; the title restates the motif with choir/strings/taiko.
import { S, EV, DLG, GROOVE0, GROOVE1, BAR } from './timeline.js';

export function score(kit) {
  const k = kit;

  // ---- boot: hum, breath, then the chime ----
  k.drone(0.2, 7.6, [26, 38], 0.045, 220);
  k.tick(0.7, 0.03); k.tick(2.7, 0.03); k.tick(4.7, 0.03);
  k.glass(EV.chime, 0.22);
  [62, 66, 69, 74].forEach((m, i) => k.bell(EV.chime + i * 0.09, k.hz(m), 0.09, 1.6));
  k.riser(5.4, 8.0, 0.08);

  // ---- logon: pads bloom, click, welcome ----
  k.pad(8.0, [50, 57, 62], 3.6, 0.05);
  k.pad(10.0, [54, 62, 66], 3.8, 0.05);
  k.blip(EV.curClick1, 1400, 0.12, 0.04);
  k.blip(EV.curClick1 + 0.03, 900, 0.08, 0.05);
  k.swell(EV.welcome, S.desktop - 0.1, 0.16);

  // ---- the groove (14 → 47.5): four-on-the-floor, backbeat claps, bass, pluck motif ----
  const bars = Math.floor((GROOVE1 - GROOVE0) / BAR);
  for (let b = 0; b < bars; b++) {
    const t0 = GROOVE0 + b * BAR;
    const root = [38, 45, 47, 43][b % 4];
    const hot = t0 >= 24 && t0 < 40;           // montage = full energy
    const quotes = t0 >= 40;                    // testimonials = pulled back
    for (let beat = 0; beat < 4; beat++) {
      const t = t0 + beat * 0.5;
      k.kick(t, quotes ? 0.5 : hot ? 1 : 0.75);
      if (!quotes) k.hat(t + 0.25, hot ? 0.11 : 0.06, 0.05);
      if (!quotes && (beat === 1 || beat === 3)) k.clap(t, hot ? 0.4 : 0.22);
    }
    if (!quotes) k.bass(t0 + 0.75, root, 0.2, 0.3);
    k.bass(t0, root, 0.45, quotes ? 0.2 : 0.28);
    k.bass(t0 + 1.25, root + 12, 0.2, quotes ? 0.14 : 0.2);
    k.pad(t0, [root + 12, root + 19, root + 24], BAR, quotes ? 0.05 : 0.035);
    // pluck motif: D–F#–A–B restated each two bars, octave lift on odd phrases
    if (!quotes) {
      const oct = b % 4 >= 2 ? 12 : 0;
      const motif = [[0, 62], [0.5, 66], [1.0, 69], [1.25, 71], [1.5, 69], [1.75, 66]];
      for (const [dt, m] of motif) k.pluck(t0 + dt, m + oct, hot ? 0.075 : 0.05, 2800, 0.3);
    } else {
      k.pluck(t0, 74, 0.05, 2400, 0.5);
      k.pluck(t0 + 1.5, [69, 71][b % 2], 0.04, 2400, 0.5);
    }
  }
  // montage slams
  for (const t of [EV.slamA, EV.slamB, EV.slamC, EV.slamD]) {
    k.whoosh(t - 0.28, 0.4, 0.2);
    k.clunk(t + 0.02, 0.4);
  }
  // game foley
  for (let t = EV.sweep0; t <= EV.sweep1; t += 0.25) k.tick(t, 0.035, 3600); // mines reveal
  k.blip(EV.flagPlant, 620, 0.14, 0.14); k.blip(EV.flagPlant + 0.07, 880, 0.1, 0.12);
  for (let t = 32.4; t < 35.2; t += 0.533) k.blip(t, 300, 0.06, 0.1, 'sine'); // jezz boings
  k.clunk(EV.boxed, 0.5); k.blip(EV.boxed + 0.05, 520, 0.1, 0.1, 'square');
  k.clunk(EV.flip, 0.6);
  [36.9, 37.4, 38.4].forEach((t, i) => k.bell(t, k.hz(74 + i * 3), 0.08, 0.7)); // pinball bumpers
  k.blip(EV.mult, 1180, 0.1, 0.1);

  // ---- the turn (48 → 54) ----
  k.sweepDown(EV.turn, 1.6, 3000, 220, 0.3);
  k.drone(48, 54, [35, 47, 50], 0.07, 300);
  DLG.forEach((t, i) => { k.blip(t, 240 - i * 14, 0.1, 0.13, 'square'); k.tick(t + 0.02, 0.05, 2400); });
  k.braam(EV.bigDlg, [35, 47, 50], 2.6, 0.32);
  for (let t = 49.5; t < 54; t += 1) k.heartbeat(t, 0.28);

  // ---- restore (54 → 62) ----
  k.whoosh(EV.menu - 0.2, 0.35, 0.14);
  k.blip(EV.pick, 1000, 0.1, 0.05);
  for (let b = 0; b < 4; b++) {
    const t0 = 56 + b * BAR;
    k.taiko(t0, 0.5 + b * 0.12); k.taiko(t0 + 1, 0.35 + b * 0.09);
    const root = [38, 41, 45, 38][b]; // Dm–F–A building to the D-major lift at the title
    k.bass(t0, root, 0.45, 0.26);
    for (const [dt, m] of [[0, 62], [0.5, 65], [1, 69], [1.5, 65]]) k.pluck(t0 + dt, m + (b === 3 ? 12 : 0), 0.06, 2600, 0.25);
  }
  k.riser(58.4, EV.bar1, 0.16);
  k.choir(59.6, [50, 57, 62], 3.2, 0.05);
  k.impact(EV.done, 0.5);

  // ---- title (62 → 70): full reprise ----
  k.crash(EV.slamTitle, 0.26);
  k.whoosh(EV.slamTitle - 0.3, 0.45, 0.22);
  const mel = [[62.6, 62], [63.1, 66], [63.6, 69], [64.1, 74], [64.8, 73], [65.3, 69], [65.8, 71], [66.6, 74]];
  for (const [t, m] of mel) k.piano(t, m, 0.22, 2.6);
  k.strings(62.6, [38, 50, 57, 66], 7, 0.075);
  k.choir(64.0, [50, 54, 57, 62], 5.6, 0.06);
  [62, 64, 66, 68].forEach((t, i) => {
    k.kick(t, 0.8); k.taiko(t + 1, 0.5);
    k.bass(t, [38, 43, 45, 38][i], 0.5, 0.3);
  });
  k.swell(67.4, 69.4, 0.14);
  k.bell(68.4, k.hz(86), 0.07, 1.4); k.bell(68.9, k.hz(90), 0.06, 1.4);
  k.crash(68.2, 0.16);

  // ---- outro: the last click ----
  k.pad(70.0, [50, 57, 62], 1.8, 0.055);
  k.blip(EV.curClick2, 1500, 0.13, 0.035);
  k.clunk(EV.curClick2 + 0.03, 0.3);
  k.bell(71.8, k.hz(98), 0.07, 1.2);
}
