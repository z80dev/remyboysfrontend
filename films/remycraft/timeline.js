// One timing truth for block state, inventory, choreography and original score.
export const T = { end: 15, build: 4, raid: 8, fuse: 8.55, blast: 10.5, reward: 12 };
export const MINES = [
  { p: [-5, 1, 0], hits: [1.2, 1.65, 2.1], pop: 2.18 },
  { p: [-5, 1, -1], hits: [2.5, 2.85, 3.2], pop: 3.28 },
];
// Grid-aligned deck and staircase. Every step has a column down to the bank.
export const BUILD = [
  { t: 4.25, p: [-3, 0, 0] }, { t: 4.6, p: [-2, 0, 0] },
  { t: 4.95, p: [-1, 0, 0] }, { t: 5.3, p: [0, 0, 0] },
  { t: 5.65, p: [1, 0, 0] }, { t: 6, p: [1, 1, 0] },
  { t: 6.3, p: [2, 0, 0] }, { t: 6.3, p: [2, 1, 0] },
  { t: 6.3, p: [2, 2, 0] }, { t: 6.65, p: [3, 0, 0] },
  { t: 6.65, p: [3, 1, 0] }, { t: 6.65, p: [3, 2, 0] },
  { t: 6.65, p: [3, 3, 0] },
];
export const STEPS = [
  [4, -4, .5], [4.65, -3, .5], [5, -2, .5], [5.35, -1, .5],
  [5.7, 0, .5], [6.15, 1, 1.5], [6.5, 2, 2.5], [7.05, 3, 3.5],
];
export const clamp = v => Math.max(0, Math.min(1, v));
export const u = (t, a, b) => clamp((t - a) / (b - a));
export const ease = x => x * x * (3 - 2 * x);
export function heroPath(t) {
  if (t < 3.35) return [-6.6, .5, -.6 - ease(u(t, 2.22, 2.48))];
  if (t < 4) return [-6.6 + 2.6 * ease(u(t, 3.35, 4)), .5, -1.6 * (1 - ease(u(t, 3.35, 4)))];
  for (let i = 0; i < STEPS.length - 1; i++) {
    const [a, x, y] = STEPS[i], [b, xx, yy] = STEPS[i + 1];
    if (t < b) { const q = u(t, a, b); return [x + (xx - x) * q, y + (yy - y) * q + (yy > y ? .65 * Math.sin(q * Math.PI) : 0), 0]; }
  }
  return [3, 3.5, 0];
}
export function countBuilt(t) { return BUILD.filter(b => t >= b.t).length; }
