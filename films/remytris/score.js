// Original “Snow on the Well”: D harmonic-minor dance, not Korobeiniki.
// Picture and score share the accelerando and every lock/clear cue in choreo.js.
import { bt, INTRO, END_T, TETRIS_T, CLEARS, LOCKS, HOLDS, GARBAGE, LEVELUP_B } from './choreo.js';

export function score(kit) {
  const chip = (t, m, d = 0.12, g = 0.08, type = 'square') => kit.blip(t, kit.hz(m), g, d, type);
  const motifs = [
    [74, 77, 76, 74, 73, 69, 70, 73, 74, 81, 77, 76, 74, 73, 69, 74],
    [77, 81, 82, 81, 77, 76, 74, 73, 70, 74, 77, 76, 73, 69, 73, 74],
    [81, 82, 85, 82, 81, 77, 76, 73, 74, 77, 81, 77, 76, 73, 69, 74],
  ];
  for (let i = 0; i < 8; i++) {
    const t = 0.1 + i * 0.075;
    chip(t, [62, 65, 69, 73, 74, 77, 81, 86][i], 0.11, 0.08);
    kit.tick(t + 0.2, 0.035, 1500);
  }
  [74, 77, 81].forEach((m, i) => chip(0.98 + i * 0.055, m, 0.18, 0.065));
  kit.kick(1.12, 0.3);
  // Balalaika-like alternating tonic/fifth plucks, oom-pah triangle bass and ornamental pulse lead.
  for (let b = 0; bt(b) < END_T - 0.2; b += 0.5) {
    const t = bt(b), d = Math.min(0.19, (bt(b + 0.5) - t) * 0.76);
    const phase = Math.floor(b / 8) % 3;
    const m = motifs[phase][Math.round(b * 2) % 16];
    const duck = Math.abs(t - TETRIS_T) < 0.22 ? 0.55 : 1;
    chip(t, m, d, 0.075 * duck);
    if (b >= 20 && b < 24) chip(t + d * 0.35, m + 12, d * 0.35, 0.026);
    if (b % 1 === 0) {
      const root = Math.floor(b / 4) % 4 === 3 ? 45 : 50;
      kit.bass(t, b % 2 === 0 ? root : root + 7, d * 1.2, 0.16, 'triangle', 1400);
      kit.kick(t, b % 2 === 0 ? 0.26 : 0.14);
      if (b % 2) [62, 65, 69].forEach((n, i) => kit.pluck(t + i * 0.012, n, 0.022, 2800, 0.1, 'square'));
    }
    kit.hat(t, 0.032, 0.025);
  }
  for (const s of LOCKS) {
    kit.tick(s.t - 0.045, 0.055, 2400);
    kit.kick(s.t, s.kind === 'soft' ? 0.16 : 0.32);
    chip(s.t, 38, 0.045, 0.095, 'triangle');
  }
  for (const h of HOLDS) {
    chip(h.t, 81, 0.06, 0.08); chip(h.t + 0.065, 74, 0.085, 0.06);
  }
  for (const c of CLEARS) {
    const notes = c.n === 4 ? [74, 77, 81, 86, 89, 93, 98] : [74, 77, 81, 86].slice(0, c.n + 1);
    notes.forEach((m, i) => chip(c.t + 0.05 + i * 0.055, m, c.n === 4 ? 0.22 : 0.12, 0.085));
    kit.clap(c.t + 0.07, c.n === 4 ? 0.24 : 0.12);
    if (c.n === 4) { kit.impact(c.t, 0.35, 62); kit.crash(c.t, 0.13); }
  }
  chip(bt(GARBAGE.throw), 57, 0.1, 0.09);
  kit.sweepDown(bt(GARBAGE.throw), bt(GARBAGE.hit) - bt(GARBAGE.throw), 700, 90, 0.12, 'square');
  kit.kick(bt(GARBAGE.hit), 0.5);
  [74, 81, 86].forEach((m, i) => chip(bt(LEVELUP_B) + i * 0.08, m, 0.13, 0.095));
  kit.riser(bt(22), TETRIS_T, 0.06);
  // Major victory cadence over the animated rocket launch; deliberate tail before the fade.
  const fanfare = [74, 78, 81, 86, 81, 86, 90, 93];
  fanfare.forEach((m, i) => chip(END_T + 0.3 + i * 0.17, m, 0.2, 0.09));
  for (let i = 0; i < 5; i++) {
    const t = END_T + 0.3 + i * 0.34;
    kit.bass(t, i % 2 ? 57 : 50, 0.22, 0.16, 'triangle');
    kit.kick(t, 0.25);
  }
  kit.whoosh(END_T + 0.75, 0.8, 0.12, 180, 2200);
  [74, 78, 81, 86].forEach((m) => chip(14.2, m, 0.48, 0.045, 'triangle'));
  [13.75, 14, 14.3].forEach((t) => kit.clap(t, 0.09));
}
