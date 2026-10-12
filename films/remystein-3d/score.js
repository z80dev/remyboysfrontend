// Original score: "Follicle Fortress", a 150 BPM E-minor FM march, not a transcription.
// Two-operator sine FM gives the brass/organ/bass their early sound-card character. All notes and
// foley are synthesized offline; filmT() keeps the score locked to the raycaster's hit-stop clock.
import {
  TITLE, DURATION, TALLY0, TALLY, filmT, heroDist, heroPos, GUARDS, guardDeath,
  BOSS, BOSS_STOMPS, BOSS_SHOTS, PISTOL_SHOTS, CG_SHOTS, PICKUPS, DOORS, DAMAGE, BOOMS, SWITCH_G,
} from './choreo.js';

function fm(kit, t, midi, dur, gain, { ratio = 2, index = 2, pan = 0, send = 0.03, attack = 0.004 } = {}) {
  kit.at(t, () => {
    const { ac, osc, env, out, hz } = kit;
    const f = hz(midi), carrier = osc('sine', f, t, dur + 0.09);
    const mod = osc('sine', f * ratio, t, dur + 0.09), depth = ac.createGain();
    depth.gain.setValueAtTime(f * index, t);
    depth.gain.exponentialRampToValueAtTime(f * index * 0.18 + 0.01, t + dur);
    mod.connect(depth).connect(carrier.frequency);
    const a = ac.createGain();
    env(a.gain, t, attack, gain, dur * 0.5, gain * 0.45, 0.08, dur * 0.5);
    carrier.connect(a);
    out(a, 1, send, pan);
  });
}

function noiseHit(kit, t, dur, gain, freq, pan = 0, type = 'bandpass') {
  kit.at(t, () => {
    const n = kit.noise(t, dur), f = kit.ac.createBiquadFilter(), a = kit.ac.createGain();
    f.type = type; f.frequency.value = freq; f.Q.value = 0.7;
    kit.env(a.gain, t, 0.001, gain, dur, 0, 0.015);
    n.connect(f).connect(a); kit.out(a, 1, 0.015, pan);
  });
}

function bend(kit, t, f0, f1, dur, gain, type = 'sine', pan = 0) {
  kit.at(t, () => {
    const o = kit.osc(type, f0, t, dur), a = kit.ac.createGain();
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    kit.env(a.gain, t, 0.002, gain, dur, 0, 0.015);
    o.connect(a); kit.out(a, 1, 0.02, pan);
  });
}

export function score(kit) {
  const beat = 0.4, step = beat / 2;
  // Attract-screen logo: a rising brass sting followed by the hero's minor-key call.
  [52, 59, 64].forEach((m, i) => fm(kit, 0.12 + i * 0.045, m, 0.34, 0.12, { ratio: 1, index: 3, pan: (i - 1) * 0.2 }));
  [76, 79, 78, 71].forEach((m, i) => fm(kit, 0.38 + i * 0.18, m, 0.14, 0.095, { ratio: 2, index: 2.4 }));
  bend(kit, 0.22, 110, 36, 0.24, 0.24);

  // Original sixteen-step melody; the second pass answers it a fourth below, then resolves.
  const motif = [76, null, 79, 78, 76, 71, 74, null, 76, 83, 81, 79, 78, null, 74, 71];
  const answer = [71, 74, 76, null, 78, 76, 74, 71, 69, null, 72, 74, 75, 74, 71, null];
  const roots = [40, 40, 43, 38, 40, 40, 36, 47];
  for (let n = 0; TITLE + n * step < TALLY0 - 0.12; n++) {
    const t = TITLE + n * step, bar = Math.floor(n / 8), root = roots[bar % roots.length];
    const boss = t >= filmT(BOSS.roar) && t < filmT(BOSS.death);
    const riff = n % 4 === 3 ? root + 7 : n % 4 === 2 ? root + 12 : root;
    fm(kit, t, riff, 0.135, boss ? 0.125 : 0.105, { ratio: 1, index: 2.8 });
    const notes = Math.floor(n / 16) % 2 ? answer : motif, m = notes[n % 16];
    if (m != null) {
      fm(kit, t, m, n % 4 === 0 ? 0.23 : 0.13, boss ? 0.105 : 0.09, { ratio: 2, index: boss ? 4 : 2.3, pan: -0.17 });
      if (boss && n % 2 === 0) fm(kit, t, m - 12, 0.14, 0.055, { ratio: 3, index: 1.8, pan: 0.2 });
    }
    if (n % 8 === 0) [root + 12, root + 19, root + 22].forEach((m, i) => fm(kit, t, m, 1.2, 0.04, { ratio: 1, index: 1.2, pan: (i - 1) * 0.28, attack: 0.025 }));
    noiseHit(kit, t, 0.026, n % 2 ? 0.022 : 0.038, 7600, 0.23, 'highpass');
    if (n % 4 === 0 || (boss && n % 8 === 7)) bend(kit, t, 155, 42, 0.14, 0.19);
    if (n % 4 === 2) { noiseHit(kit, t, 0.1, 0.095, 2300, -0.08); fm(kit, t, 48, 0.07, 0.055, { ratio: 5.4, index: 6 }); }
  }

  // Footfalls follow actual travelled distance rather than wall-clock velocity.
  let nextStep = 0.65;
  for (let g = 0; g < 9.18; g += 1 / 120) {
    if (heroDist(g) < nextStep) continue;
    const side = Math.floor(nextStep / 0.65) % 2 ? -0.12 : 0.12;
    noiseHit(kit, filmT(g), 0.048, 0.026, 450, side);
    nextStep += 0.65;
  }
  for (const d of DOORS) {
    const t = filmT(d.open[0]), dur = d.open[1] - d.open[0];
    noiseHit(kit, t, dur, 0.085, 1050);
    bend(kit, t, 135, 82, dur, 0.038, 'triangle');
    noiseHit(kit, filmT(d.open[1]), 0.07, 0.12, 700);
  }
  for (const g of PISTOL_SHOTS) {
    const t = filmT(g);
    noiseHit(kit, t, 0.075, 0.24, 1850);
    bend(kit, t, 165, 48, 0.095, 0.18);
    noiseHit(kit, t + 0.038, 0.018, 0.065, 4500, 0.12);
  }
  for (const g of CG_SHOTS) {
    const t = filmT(g);
    noiseHit(kit, t, 0.038, 0.145, 1950, -0.06);
    bend(kit, t, 145, 62, 0.045, 0.105);
    fm(kit, t + 0.035, 92, 0.014, 0.018, { ratio: 3.7, index: 5, pan: 0.36, send: 0 });
  }
  for (const e of GUARDS) {
    const p = heroPos(e.alert), pan = Math.max(-0.6, Math.min(0.6, (e.y - p.y) * 0.18));
    bend(kit, filmT(e.alert), 180, 105, 0.16, 0.055, 'sawtooth', pan);
    for (const g of e.fire) { noiseHit(kit, filmT(g), 0.05, 0.12, 1700, pan); bend(kit, filmT(g), 130, 48, 0.06, 0.06, 'sine', pan); }
    const t = filmT(guardDeath(e));
    bend(kit, t + 0.06, 170, 55, 0.22, 0.045, 'sawtooth', pan);
    noiseHit(kit, t + 0.31, 0.07, 0.08, 370, pan);
  }
  for (const [g] of DAMAGE) bend(kit, filmT(g), 105, 45, 0.15, 0.065, 'triangle');
  for (const g of BOSS_STOMPS) { bend(kit, filmT(g), 82, 30, 0.14, 0.11); noiseHit(kit, filmT(g), 0.055, 0.06, 430); }
  bend(kit, filmT(BOSS.roar), 120, 38, 0.32, 0.1, 'sawtooth');
  for (const g of BOSS_SHOTS) noiseHit(kit, filmT(g), 0.026, 0.07, 1250, Math.round(g * 100) % 2 ? -0.3 : 0.3);
  for (const it of PICKUPS) {
    const t = filmT(it.g), notes = it.kind === 'chaingun' ? [64, 71, 76, 83] : it.kind === 'key' ? [76, 80, 83] : [83, 88];
    notes.forEach((m, i) => fm(kit, t + i * 0.055, m, 0.12, it.kind === 'chaingun' ? 0.11 : 0.055, { ratio: 2, index: 1.1, pan: 0.15 }));
  }
  BOOMS.forEach((g, i) => {
    const t = filmT(g), gain = i === 0 ? 0.3 : 0.14;
    noiseHit(kit, t, i === 0 ? 0.5 : 0.22, gain, 650);
    bend(kit, t, 100, 25, i === 0 ? 0.38 : 0.18, gain * 0.8);
  });
  noiseHit(kit, filmT(SWITCH_G), 0.04, 0.11, 2100);
  [71, 76].forEach((m, i) => fm(kit, filmT(SWITCH_G) + i * 0.075, m, 0.11, 0.075, { ratio: 1, index: 0.8 }));

  // Intermission: counter ticks and a bright E-major victory answer, continuously moving until fade.
  noiseHit(kit, TALLY0, 0.35, 0.025, 6000, 0, 'highpass');
  const victory = [76, 80, 83, 88, 83, 80, 78, 83, 80, 76, 71, 76, 80, 83];
  victory.forEach((m, i) => {
    const t = TALLY0 + 0.13 + i * 0.2;
    if (t < DURATION - 0.2) fm(kit, t, m, 0.16, 0.095, { ratio: 2, index: 1.4, pan: -0.1 });
  });
  for (let n = 0; n < 7; n++) {
    const t = TALLY0 + n * beat;
    fm(kit, t, n % 2 ? 47 : 40, 0.25, 0.1, { ratio: 1, index: 1.5 });
    noiseHit(kit, t, 0.027, 0.035, 7300, 0.2, 'highpass');
  }
  for (const win of [TALLY.kill, TALLY.secret, TALLY.treasure]) {
    for (let t = win[0]; t < win[1]; t += 0.065) fm(kit, t, 95, 0.012, 0.025, { ratio: 1, index: 0.4, send: 0 });
    fm(kit, win[1], 88, 0.15, 0.085, { ratio: 2, index: 1 });
  }
  [52, 59, 64, 68, 76].forEach((m, i) => fm(kit, TALLY.perfect + i * 0.025, m, 0.65, 0.065, { ratio: 1, index: 2, pan: (i - 2) * 0.15 }));
}
