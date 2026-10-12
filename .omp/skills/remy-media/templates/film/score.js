// Chiptune score: 2A03-style pulse (periodic wave), triangle bass, filtered noise drums, plus core kit
// instruments for the VS card. Every SFX is scheduled through filmT so it lands on its frame.
import { VS, HIT_G, BANNER_G, filmT } from './choreo.js';

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit;
  const waves = {};
  const pulseWave = (duty) => {
    if (waves[duty]) return waves[duty];
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) { re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty); im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.sin(k * Math.PI * duty); }
    return (waves[duty] = ac.createPeriodicWave(re, im));
  };
  const pulse = (t, m, dur, { duty = 0.25, g = 0.18, pan = 0, to = null, send = 0.05 } = {}) => at(t, () => {
    const o = osc('square', hz(m), t, dur + 0.02);
    o.setPeriodicWave(pulseWave(duty));
    if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.setValueAtTime(g, t + Math.max(0.005, dur - 0.012));
    a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(a);
    out(a, 1, send, pan);
  });
  const tri = (t, m, dur, { g = 0.2, to = null } = {}) => at(t, () => {
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
  const nz = (t, dur, { f = 4000, type = 'highpass', g = 0.12, q = 0.7, f1 = null } = {}) => at(t, () => {
    const n = noise(t, dur), flt = ac.createBiquadFilter();
    flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(flt).connect(a);
    out(a, 1, 0.04);
  });
  const kickD = (t, g = 0.38) => { tri(t, 52, 0.09, { g, to: 28 }); nz(t, 0.03, { f: 1200, type: 'lowpass', g: 0.22 }); };

  // VS card: a core-kit impact under a chip sting
  kit.impact(0.05);
  [60, 64, 67, 72].forEach((m, i) => pulse(0.1 + i * 0.07, m, 0.07, { duty: 0.5, g: 0.16 }));
  pulse(0.45, 79, 0.5, { duty: 0.25, g: 0.14 });

  // duel groove: 150 BPM eighths until the impact
  const E8 = 0.2;
  for (let t = VS, i = 0; t < filmT(HIT_G) - 0.01; t += E8, i++) {
    tri(t, [45, 57][i % 2], E8 * 0.85, { g: 0.2 });     // bass: g ≈ 0.2, never louder
    if (i % 4 === 0) kickD(t);
    nz(t, 0.03, { f: 7000, g: i % 2 ? 0.05 : 0.03 });
    pulse(t, [69, 72, 76, 81][i % 4], 0.08, { duty: 0.125, g: 0.08 });
  }
  // impact (lands on the hit-stop frame), banner fanfare
  const hit = filmT(HIT_G);
  kickD(hit, 0.6); nz(hit, 0.4, { f: 2500, type: 'lowpass', f1: 200, g: 0.4 }); pulse(hit, 79, 0.2, { duty: 0.5, g: 0.2, to: 52 });
  const b = filmT(BANNER_G);
  [[72, 76, 79], [77, 81, 84], [79, 83, 86]].forEach((c, k) => c.forEach((m, i) => pulse(b + k * 0.2 + i * 0.05, m, 0.07, { duty: 0.5, g: 0.15 })));
  pulse(b + 0.6, 84, 0.7, { duty: 0.5, g: 0.15 }); tri(b + 0.6, 48, 0.7, { g: 0.22 });
}
