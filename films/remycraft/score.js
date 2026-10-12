import { T, MINES, BUILD } from './timeline.js';
// "Oak & Ember": an original D-major thumb-piano / nylon-pluck miniature.
// Gentle open fifths grow into hand percussion, then resolve to a broad sunset chord.
export function score(k) {
  const { ac, at, osc, noise, out, hz } = k;
  const nylon = (t, note, dur = .65, gain = .14, pan = 0) => at(t, () => {
    const a = ac.createGain(); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(gain, t + .004); a.gain.exponentialRampToValueAtTime(.0001, t + dur);
    for (const [harm, level] of [[1, 1], [2, .32], [3, .13], [4, .035]]) { const o = osc('sine', hz(note) * harm, t, dur); const g = ac.createGain(); g.gain.value = level; o.connect(g).connect(a); }
    out(a, 1, .18, pan);
  });
  const grit = (t, dur, gain, f, pan = 0) => at(t, () => { const n = noise(t, dur), b = ac.createBiquadFilter(), a = ac.createGain(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = .75; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(gain, t + .003); a.gain.exponentialRampToValueAtTime(.0001, t + dur); n.connect(b).connect(a); out(a, 1, .05, pan); });
  const roots = [50, 47, 55, 57, 50, 47, 55, 57];
  const motif = [74, 81, 78, 76, 74, 69, 73, 76, 79, 78, 74, 71, 76, 81, 78, 73];
  for (let i = 0; i < 28; i++) { const t = .2 + i * .375; nylon(t, motif[i % 16], .75, t < 4 ? .12 : .14, i % 2 ? .26 : -.26); if (i % 4 === 0) { nylon(t, roots[Math.floor(i / 4)], 1.3, .105, -.1); nylon(t + .12, roots[Math.floor(i / 4)] + 7, .9, .06, .2); } }
  k.pad(.2, [62, 66, 69], 3.3, .016, 1000, .8); k.pad(4, [59, 62, 66], 3.4, .021, 1300, .5); k.pad(8, [57, 61, 64], 2.4, .023, 1600, .3);
  for (let t = 4.125; t < 10.4; t += .375) { k.kick(t, .19); grit(t + .18, .11, .1, 1100, .3); k.hat(t, .025, .035); }
  for (const m of MINES) { for (const [i, t] of m.hits.entries()) { grit(t, .07, .24, 1900 - i * 180, -.35); nylon(t, 42 + i * 2, .12, .14, -.3); } grit(m.pop, .18, .17, 3700, -.3); nylon(m.pop + .18, 86, .24, .07); }
  for (const b of BUILD) { grit(b.t, .055, .17, 640, .1); nylon(b.t, 48, .08, .085, .1); }
  grit(5.65, .08, .22, 550); k.whoosh(8.25, .3, .09, 1200, 3800); k.riser(T.fuse, T.blast, .055); grit(11.8, .3, .11, 3600, -.2);
  for (let t = T.fuse; t < T.blast; t += .14) grit(t, .045, .035, 6300, -.15);
  k.impact(T.blast, .6, 65); grit(T.blast, .4, .35, 1300); k.crash(T.blast, .07);
  for (let i = 0; i < 8; i++) grit(T.blast + .17 + i * .065, .1, .06, 450 + i * 90, (i % 2 ? 1 : -1) * .4);
  const endMelody = [[11.6, 74], [11.85, 78], [12.1, 81], [12.5, 86], [13, 81], [13.5, 78], [14, 74]];
  for (const [t, n] of endMelody) nylon(t, n, Math.min(1.3, 14.98 - t), .16, .1);
  for (const n of [50, 57, 62, 66, 69]) nylon(12.05 + (n % 3) * .025, n, 2.6, .065, (n % 2 ? .3 : -.3));
  k.pad(11.7, [62, 66, 69, 74], 2.8, .029, 1300, .7); k.bell(T.reward, hz(86), .065, 1.8, 2, .7);
}
