// THE HAIRYWEIGHT CHAMPIONSHIP — live pay-per-view broadcast score.
// 80 BPM (beat 0.75 s, bar 3 s), 29 bars, D = 87. C-minor arc that turns major for the belt:
// fanfare open -> tale-of-the-tape horns -> walk anthems -> round percussion -> knockdown hush
// -> corner heartbeat -> comeback build -> replay dream -> snap-back -> KO silence/eruption
// -> C major triumph fanfare with an intentional ending.
// Two-domain rule: every world-g event (punches, knockdown, KO, swings) is scheduled through
// filmT(); BELLS, HUD counts, CROWD swells and the section grid are already REAL seconds.
// All foley/section times come from timeline.js — no hand-added delays.
import {
  D, BEAT, BAR, BELLS, PUNCHES, KNOCKDOWNS, KO, CROWD, SCORE_MAP, STOPS_REAL, HUD, filmT,
} from './timeline.js';

const S = Object.fromEntries(SCORE_MAP.map((s) => [s.name, s]));
const KO_STOP = STOPS_REAL.find((s) => s.g === KO.t);
const KO_T = KO_STOP.real;            // 71.99 — the uppercut lands at the START of its freeze
const KO_OUT = KO_T + KO_STOP.d;      // 72.54 — freeze releases, crowd may erupt
const KD_T = filmT(KNOCKDOWNS[0].t);  // 37.01 — knockdown punch real time
const E8 = BEAT / 2;                  // eighth note, 0.375 s

export function score(k) {
  const { at, ac, osc, noise, out, hz, R } = k;

  // ================= custom voices (built from verified primitives only) =================
  // Brass: 4 detuned saws + triangle sub through a blooming lowpass and an explicit ADSR-ish env.
  const brass = (t, m, dur, g = 0.12, o = {}) => at(t, () => {
    const { atk = 0.045, rel = 0.14, cut = 2400, send = 0.35, pan = 0, width = 0.45 } = o;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(cut * 0.5, t);
    lp.frequency.linearRampToValueAtTime(cut, t + Math.max(0.14, atk * 2));
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + atk);
    a.gain.setValueAtTime(g, t + Math.max(atk, dur * 0.65));
    a.gain.linearRampToValueAtTime(0, t + dur + rel);
    for (const det of [-9, -4, 5, 11]) {
      const w = osc('sawtooth', hz(m), t, dur + rel);
      w.detune.value = det;
      w.connect(lp);
    }
    const sb = osc('triangle', hz(m - 12), t, dur + rel);
    const sg = ac.createGain(); sg.gain.value = 0.45;
    sb.connect(sg).connect(lp);
    lp.connect(a);
    out(a, 1, send, pan, width);
  });
  const brassChord = (t, notes, dur, g, o = {}) => {
    notes.forEach((m, i) => brass(t, m, dur, g, { ...o, pan: ((i % 3) - 1) * 0.35 }));
  };

  // Glockenspiel: sine + inharmonic upper partials, fast attack, exponential ring-out.
  const glock = (t, m, g = 0.05, dur = 0.6) => at(t, () => {
    const f0 = hz(m);
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.003);
    a.gain.exponentialRampToValueAtTime(0.0002, t + dur);
    for (const [mul, kg] of [[1, 1], [2.76, 0.35], [5.4, 0.12]]) {
      const w = osc('sine', f0 * mul, t, dur);
      const pg = ac.createGain(); pg.gain.value = kg;
      w.connect(pg).connect(a);
    }
    out(a, 1, 0.3, (R() - 0.5) * 0.5);
  });

  // Ring bell: boxing bell = inharmonic partial stack + short noise strike.
  const ringBell = (t, g = 0.5) => at(t, () => {
    const f0 = 620;
    [[1, 1, 2.1], [2.01, 0.6, 1.6], [2.94, 0.45, 1.15], [4.13, 0.28, 0.8], [5.43, 0.16, 0.55]]
      .forEach(([mul, kg, kd], i) => {
        const w = osc('sine', f0 * mul, t, kd + 0.2);
        const pg = ac.createGain();
        pg.gain.setValueAtTime(0, t);
        pg.gain.linearRampToValueAtTime(g * kg * 0.55, t + 0.002);
        pg.gain.exponentialRampToValueAtTime(0.0002, t + kd);
        w.connect(pg);
        out(pg, 1, 0.45, (i % 2 ? 1 : -1) * 0.09 * i);
      });
    const n = noise(t, 0.05);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 1.5;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(g * 0.5, t + 0.001);
    ng.gain.exponentialRampToValueAtTime(0.0002, t + 0.045);
    n.connect(bp).connect(ng);
    out(ng, 1, 0.3);
  });

  // Punch thud: sine pitch-drop body + bandpass smack + air slap. Present, not absurd.
  const PUNCH_G = { jab: 0.4, body: 0.55, hook: 0.62, upper: 0.8 };
  const PUNCH_F = { jab: 1250, body: 800, hook: 720, upper: 620 };
  const punch = (t, kind, gMul = 1) => at(t, () => {
    const g = (PUNCH_G[kind] ?? 0.5) * gMul;
    const dk = kind === 'upper' ? 0.26 : kind === 'jab' ? 0.1 : 0.17;
    const w = osc('sine', 165, t, dk + 0.1);
    w.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.exponentialRampToValueAtTime(0.0002, t + dk);
    w.connect(a);
    out(a, 1, 0.15, 0, 0.25);
    const n = noise(t, 0.12);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = PUNCH_F[kind] ?? 800; bp.Q.value = 0.9;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(g * 0.75, t + 0.003);
    ng.gain.exponentialRampToValueAtTime(0.0002, t + 0.09);
    n.connect(bp).connect(ng);
    out(ng, 1, 0.2, 0, 0.3);
    const s = noise(t, 0.03);
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3800;
    const sg = ac.createGain();
    sg.gain.setValueAtTime(0, t);
    sg.gain.linearRampToValueAtTime(g * 0.22, t + 0.002);
    sg.gain.exponentialRampToValueAtTime(0.0002, t + 0.025);
    s.connect(hp).connect(sg);
    out(sg, 1, 0.1);
  });

  // Cloth/sponge foley swish for the corner.
  const swish = (t, g = 0.05) => at(t, () => {
    const n = noise(t, 0.25);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.setValueAtTime(700, t);
    bp.frequency.linearRampToValueAtTime(1400, t + 0.15);
    bp.Q.value = 1;
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.05);
    a.gain.exponentialRampToValueAtTime(0.0002, t + 0.2);
    n.connect(bp).connect(a);
    out(a, 1, 0.2, (R() - 0.5) * 0.6);
  });

  // Tape rewind: two rising saw/square tones with 9 Hz flutter through a bandpass.
  const rewind = (t0, t1, g = 0.13) => at(t0, () => {
    const dur = t1 - t0;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.1;
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t0);
    a.gain.linearRampToValueAtTime(g, t0 + 0.06);
    a.gain.setValueAtTime(g, t1 - 0.05);
    a.gain.linearRampToValueAtTime(0, t1);
    const w1 = osc('sawtooth', 180, t0, dur);
    w1.frequency.exponentialRampToValueAtTime(1150, t1);
    const w2 = osc('square', 90, t0, dur);
    w2.frequency.exponentialRampToValueAtTime(575, t1);
    const g2 = ac.createGain(); g2.gain.value = 0.4;
    w1.connect(bp); w2.connect(g2).connect(bp);
    const lfo = osc('sine', 9, t0, dur);
    const lg = ac.createGain(); lg.gain.value = 70;
    lfo.connect(lg); lg.connect(w1.detune); lg.connect(w2.detune);
    bp.connect(a);
    out(a, 1, 0.25, 0, 0.5);
  });

  // ================= 1. crowd bed (0..D) — filtered noise wash following CROWD ============
  at(0, () => {
    // Duck/hush inserts (real seconds): champ walk, count hush, KO-freeze vacuum, final fade.
    const A = { pop: 0.16, ooh: 0.22, roar: 0.7, erupt: 0.75 };
    const Rls = { pop: 1.4, ooh: 0.9, roar: 2.6, erupt: 4.5 };
    const base = (t) => t < 6 ? 0.08 : t < 20.8 ? 0.24 : t < 27 ? 0.12 : t < 37.4 ? 0.24
      : t < 43 ? 0.08 : t < 45 ? 0.2 : t < 51 ? 0.12 : t < 72 ? 0.24 : 0.28;
    const EV = [
      { t: 20.8, lvl: 0.12, a: 0.5, r: 0, p: 0 },            // champ walk — the air leaves
      { t: 37.5, lvl: 0.08, a: 0.35, r: 0, p: 0 },           // ref-count hush
      { t: KO_T - 1e-4, lvl: 0.05, a: 0.05, r: 0, p: 0 },    // KO freeze vacuum (before erupt)
      { t: 86.1, lvl: 0.0004, a: 0.7, r: 0, p: 0 },          // crowd tail to black
      ...CROWD.map((c) => ({ t: c.real, lvl: c.level, a: A[c.type], r: Rls[c.type], p: 1 })),
    ].sort((x, y) => (x.t - y.t) || (x.p - y.p));

    // Build one piecewise-linear anchor curve, then paint it onto three noise layers.
    const anchors = [];
    let seg = { t0: 0, v0: 0.0002, t1: 0, v1: 0.0002 };
    const levelAt = (t) => seg.t1 <= seg.t0 ? seg.v1
      : seg.v0 + (seg.v1 - seg.v0) * Math.min(1, Math.max(0, (t - seg.t0) / (seg.t1 - seg.t0)));
    const to = (ta, tb, v) => { anchors.push([ta, levelAt(ta)]); anchors.push([tb, Math.max(0.0002, v)]); seg = { t0: tb, v0: Math.max(0.0002, v), t1: tb, v1: Math.max(0.0002, v) }; };
    for (const e of EV) {
      to(e.t, e.t + e.a, e.lvl);
      if (e.r > 0) to(e.t + e.a, e.t + e.a + e.r, base(e.t + e.a + e.r));
    }
    for (const [mult, type, freq, q] of [
      [0.8, 'lowpass', 380, 0.5],   // distant rumble body
      [0.9, 'bandpass', 750, 0.8],  // roar body
      [0.6, 'bandpass', 2400, 1.4], // airy hiss (answers eruptions)
    ]) {
      const n = noise(0, D + 0.2);
      const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0002, 0);
      for (const [t, v] of anchors) g.gain.linearRampToValueAtTime(Math.max(0.0002, v * mult), t);
      n.connect(f).connect(g);
      out(g, 1, 0.12, 0, 0.85);
    }
    // Distant PA hum leaking into the marquee exterior (gone once we crash inside at 6).
    const hum = osc('sine', 118, 0, 8);
    const hg = ac.createGain();
    hg.gain.setValueAtTime(0, 0);
    hg.gain.linearRampToValueAtTime(0.006, 2);
    hg.gain.linearRampToValueAtTime(0, 7.5);
    hum.connect(hg);
    out(hg, 1, 0.1);
  });

  // ================= 2. openFanfare (S.openFanfare 0..9) — broadcast open =================
  {
    const T = S.openFanfare.t0;
    brassChord(T, [36, 43, 48, 52], 2.4, 0.1, { atk: 0.25 });
    brass(T + 0, 60, 0.55, 0.13); brass(T + 0.75, 64, 0.3, 0.12);
    brass(T + 1.5, 67, 0.55, 0.13); brass(T + 2.25, 72, 1.4, 0.13, { atk: 0.06 });
    brass(T + 3, 67, 0.55, 0.12); brass(T + 3.75, 69, 0.3, 0.11);
    brass(T + 4.5, 71, 0.55, 0.12); brass(T + 5.25, 72, 0.6, 0.12);
    for (const [tt, m] of [[0.5, 84], [1.5, 84], [2.25, 88], [3, 91], [3.75, 88], [4.5, 84], [5.25, 79]]) glock(tt, m, 0.045, 0.55);
    // sub-boom: we crash inside the dome at 6
    k.impact(6, 0.8, 46); k.crash(6, 0.2); k.sub(6, 0.5, 78, 32, 2); k.taiko(6, 0.8, 46);
    glock(6.06, 96, 0.05, 0.7); glock(6.31, 91, 0.04, 0.7);
    brassChord(6.5, [43, 48, 55, 60, 64], 2.3, 0.11, { atk: 0.5 });
    k.taiko(6.5, 0.35, 50); k.taiko(7.25, 0.3, 50); k.taiko(8, 0.45, 56);
  }

  // ================= 3. vsHorns (S.vsHorns 9..18) — tale of the tape ======================
  {
    const T = S.vsHorns.t0;
    brassChord(T, [48, 52, 55, 60], 0.7, 0.13, { atk: 0.03, rel: 0.1 });
    brassChord(T + 1.5, [53, 57, 60, 65], 0.7, 0.12, { atk: 0.03, rel: 0.1 });
    brassChord(T + 3, [43, 47, 50, 55], 0.7, 0.12, { atk: 0.03, rel: 0.1 });
    brassChord(T + 4.5, [48, 52, 55, 60], 1.2, 0.12, { atk: 0.03, rel: 0.1 });
    for (let i = 0; i < 5; i++) k.tick(T + 2 + i * 0.75, 0.04 + i * 0.006, 2600 + i * 180); // stat count-up
    k.drone(15, 18, [36, 37], 0.05, 320);                       // the stare: semitone dread
    k.sub(15, 0.25, 55, 40, 2.6);
  }

  // ================= 4. heroWalk (S.heroWalk 18..21) — cocky anthem =======================
  {
    const T = S.heroWalk.t0;
    k.impact(T, 0.4, 55); k.crash(T, 0.12);
    const wb = [36, 36, 43, 36, 41, 43, 36, 43];
    const wp = [60, 60, 62, 60, 67, 65, 62, 60];
    for (let i = 0; i < 8; i++) {
      k.bass(T + i * E8, wb[i], 0.32, 0.26, 'sawtooth', 520);
      k.pluck(T + i * E8, wp[i], 0.07, 3200, 0.2);
    }
    for (let i = 0; i < 4; i++) k.clap(T + i * BEAT, 0.3);
    for (const [tt, m] of [[18, 84], [18.75, 88], [19.5, 91]]) glock(tt, m, 0.045, 0.6);
  }

  // ================= 5. champMenace (S.champMenace 21..27) — air leaves ===================
  {
    const T = S.champMenace.t0;
    k.drone(T, 27, [30, 36], 0.055, 380);                       // F#-C tritone
    k.strings(T, [36, 43], 0.3, 0.12, 0.02, 0.08, 900);
    k.strings(T + 1.5, [36, 43], 0.3, 0.11, 0.02, 0.08, 900);
    k.strings(T + 3, [35, 42], 0.3, 0.11, 0.02, 0.08, 850);
    k.strings(T + 4.5, [34, 41], 0.4, 0.12, 0.02, 0.08, 800);
    k.sub(T + 0.75, 0.4, 70, 30, 1.4); k.sub(T + 2.25, 0.35, 65, 28, 1.4); k.sub(T + 4.5, 0.3, 60, 26, 1.6);
    k.braam(26.5, [30, 36], 0.45, 0.14, 0.7);
    k.riser(26.4, 27, 0.09); k.taiko(26.625, 0.3, 56);
  }

  // ================= 6. roundPerc (S.roundPerc 27..KD_T) — taiko round 1 ==================
  {
    const T = S.roundPerc.t0;
    k.crash(T, 0.16);
    for (let b = T; b < KD_T - 0.5; b += BAR) {                 // bars 27/30/33
      k.taiko(b, 0.7, 60); k.taiko(b + 1.5, 0.5, 56);
      k.taiko(b + 0.75, 0.3, 105); k.taiko(b + 2.25, 0.32, 105);
    }
    k.taiko(36, 0.7, 60);                                       // partial bar before the knockdown
    for (let t = T + 0.375; t < KD_T - 0.15; t += 0.75) k.hat(t, 0.05, 0.04);
    k.strings(33, [48, 51, 55], 4, 0.05, 3.7, 0.15, 2100);      // rising strings into the KD
    for (let i = 0; i < 10; i++) k.bass(33 + i * E8, i % 2 ? 43 : 36, 0.32, 0.28);
    for (const p of PUNCHES) if (p.who === 'champ' && p.kind === 'jab' && p.t < 37) k.tick(filmT(p.t) + 0.012, 0.045, 1900);
  }

  // ================= 7. hush (KD_T..45) — sting, silence, count ===========================
  {
    k.impact(KD_T, 0.65, 52); k.taiko(KD_T, 0.85, 52);          // knockdown sting at 37.01
    k.strings(KD_T, [49, 50, 56], 0.45, 0.11, 0.012, 1.1, 3000);
    k.kick(39, 0.35); k.kick(42, 0.35);                         // single low pulses
    for (const c of HUD.counts) if (c.real < 43) k.tick(c.real, 0.055, 2300 + c.n * 130);
    glock(43.21, 79, 0.04, 0.9);                                // he's up — sparkle
    k.riser(43.4, 45, 0.12);                                    // crowd rising into the bell
  }

  // ================= 8. cornerHeart (S.cornerHeart 45..51) — heartbeat ====================
  {
    const T = S.cornerHeart.t0;
    for (let i = 0; i < 4; i++) k.heartbeat(T + 0.4 + i * 1.5, 0.42 + i * 0.045);
    swish(46.2, 0.05); swish(47.5, 0.045); swish(49.15, 0.05);  // cutman sponge/cloth
    k.drone(48.5, 51, [30, 36], 0.05, 340);                     // the shadow crosses
    k.taiko(50.625, 0.3, 58); k.riser(50.5, 51, 0.08);
  }

  // ================= 9. comebackBuild (S.comebackBuild 51..60) — ostinato =================
  {
    const T = S.comebackBuild.t0;
    k.crash(T, 0.14);
    const bars = [
      { root: 36, pad: [48, 51, 55], ost: [48, 51, 55, 58, 60, 58, 55, 51], pg: 0.03, og: 0.06, cut: 2800 },
      { root: 44, pad: [44, 48, 51], ost: [44, 48, 51, 56, 60, 56, 51, 48], pg: 0.034, og: 0.07, cut: 3100 },
      { root: 46, pad: [46, 50, 53], ost: [46, 50, 53, 58, 62, 58, 53, 50], pg: 0.04, og: 0.08, cut: 3400 },
    ];
    bars.forEach((b, bi) => {
      const t0 = T + bi * BAR;
      k.bass(t0, b.root, 2.7, 0.28);
      k.pad(t0, b.pad, 2.9, b.pg, 1100, 0.3);
      for (let i = 0; i < 8; i++) k.pluck(t0 + i * E8, b.ost[i], b.og, b.cut, 0.2);
    });
    for (let i = 0; i < 8; i++) k.clap(54 + i * BEAT, 0.22 + i * 0.012);
    for (let t = 54.375; t < 59.9; t += 0.75) k.hat(t, 0.04, 0.04);
    k.strings(57, [46, 50, 53, 58], 3, 0.05, 0.5, 0.4, 2400);
    const star = PUNCHES.find((p) => p.t === 57 && p.kind === 'upper');
    k.taiko(filmT(star.t), 0.5, 55);                            // the replay star, real 57.46
    k.riser(58.5, T + 9, 0.16);                                 // riser 58.5-60 into the replay cut
  }

  // ================= 10. replayRewind (S.replayRewind 60..66) — sketch dream ==============
  {
    const T = S.replayRewind.t0;
    rewind(T, T + 1.5, 0.13); k.glitch(T + 0.1, 1.3, 0.045);    // tape rewind 60-61.5
    k.pad(T + 1.5, [36, 43, 48, 51, 58], 4.4, 0.038, 650, 1.5); // dreamy half-time pad
    k.sub(T + 1.5, 0.2, 50, 36, 4);
    const ghost = [48, 55, 51, 58, 55, 48];                     // LP-filtered ostinato ghost
    for (let i = 0; i < 6; i++) k.pluck(T + 1.5 + i * 0.75, ghost[i], 0.04, 750, 0.35);
    glock(62, 84, 0.035, 1.3); glock(63.5, 87, 0.03, 1.3); glock(65, 91, 0.03, 1.1);
    k.riser(65.25, 66, 0.1);
    k.sweepDown(65.85, 0.15, 900, 200, 0.06, 'triangle');       // pre-snap tape stop
  }

  // ================= 11. liveRise (S.liveRise 66..69) — snap back =========================
  {
    const T = S.liveRise.t0;
    k.impact(T, 0.5, 55); k.crash(T, 0.18); k.taiko(T, 0.6, 60);
    k.bass(T, 36, 2.8, 0.3);
    const ost = [48, 51, 55, 58, 60, 58, 55, 51];
    for (let i = 0; i < 8; i++) k.pluck(T + i * E8, ost[i], 0.085, 3600, 0.2);
    for (let i = 0; i < 4; i++) k.clap(T + i * BEAT, 0.3);
    for (let i = 0; i < 4; i++) k.hat(T + 0.375 + i * 0.75, 0.05, 0.04);
    brassChord(T, [48, 55, 60, 64], 1.4, 0.1, { atk: 0.35 });
    brassChord(T + 1.5, [46, 53, 58, 65], 1.4, 0.1, { atk: 0.35 });
    k.sub(69, 0.35, 60, 34, 2.8); k.taiko(69, 0.4, 52);         // thin out for the end sequence
    k.swell(70.9, KO_T, 0.2, 11000);                            // reverse cymbal INTO the uppercut
  }

  // ================= 12. koImpact (KO_T..78) — the end ====================================
  {
    k.impact(KO_T, 1, 46); k.taiko(KO_T, 0.9, 50); k.glass(KO_T, 0.12, 0.5); // flash + shake
    // KO_T+0.02 .. KO_OUT (71.99..72.54) is deliberate hit-stop silence — nothing scheduled.
    k.strings(KO_OUT + 0.26, [36, 43, 48, 52], 3.6, 0.05, 1, 0.8, 1600);     // awe chord, 72.8
    for (const c of HUD.counts) if (c.real > KO_OUT) k.tick(c.real, 0.07, 2300 + c.n * 130);
    k.taiko(HUD.counts[HUD.counts.length - 1].real, 0.5, 48);   // the count of three lands
    k.braam(KO.waveReal, [36, 43, 48], 1.2, 0.16, 0.85);        // it's over, official
    k.crash(KO.waveReal, 0.16);
  }

  // ================= 13. triumphFanfare (S.triumphFanfare 78..D) — MAJOR ==================
  {
    const T = S.triumphFanfare.t0;
    brassChord(T, [41, 48, 53, 57, 60], 2.9, 0.11, { atk: 0.2 });            // F major
    k.bass(T, 29, 2.7, 0.26, 'sawtooth', 420);
    k.choir(T, [48, 53, 60], 2.9, 0.04, 'a', 0.6, 1);
    brass(T, 60, 0.6, 0.13); brass(T + 0.75, 60, 0.3, 0.12); brass(T + 1.5, 65, 1.3, 0.13, { atk: 0.05 });
    k.clunk(79.5, 0.35); glock(79.55, 84, 0.05, 0.9);          // belt buckled
    brassChord(81, [43, 48, 55, 60, 64], 3.2, 0.12, { atk: 0.15 });          // lift: C/G
    k.choir(81, [48, 55, 60, 64], 3.2, 0.045, 'a', 0.5, 1.2);
    k.strings(81, [48, 55, 60, 64], 3.4, 0.04, 0.6, 1, 2200);
    k.bass(81, 31, 3, 0.28, 'sawtooth', 420);
    brass(81, 64, 0.6, 0.13); brass(81.75, 65, 0.3, 0.12); brass(82.5, 67, 0.6, 0.13);
    // freeze-frame at 82.5: glock stab + twinkle + mini tape-stop
    k.impact(82.5, 0.45, 50); glock(82.5, 84, 0.09, 1.4); glock(82.5, 91, 0.07, 1.2);
    k.glass(82.5, 0.16, 0.7); k.sweepDown(82.5, 0.45, 440, 60, 0.07, 'sawtooth');
    // final C major chord — released by ~86.5, crowd tail fades by 86.8. No click.
    brassChord(83.25, [36, 48, 55, 64, 67, 72], 2.6, 0.12, { atk: 0.3, rel: 0.9 });
    k.choir(83.25, [48, 55, 64], 2.2, 0.05, 'a', 0.7, 1);
    k.bass(83.25, 36, 2.6, 0.3, 'sawtooth', 380);
    k.sub(83.25, 0.3, 45, 33, 2.8);
    for (const [tt, m] of [[83.25, 84], [83.5, 88], [83.75, 91], [84, 96]]) glock(tt, m, 0.05, 1.2);
  }

  // ================= foley: bells, punches, swings, counts ================================
  for (const b of BELLS) { ringBell(b, 0.5); }
  ringBell(BELLS[1] + 0.42, 0.28);                              // round-end echo double
  for (const p of PUNCHES) {
    const t = filmT(p.t);
    if (p.landed) punch(t, p.kind, p.t === KO.t ? 1.1 : 1);
    else if (p.t === KO.swing) k.whoosh(t - 0.6, 0.6, 0.22, 250, 2600);   // the haymaker
    else k.whoosh(t - 0.3, 0.3, 0.1, 320, 2000);                          // sails over the crouch
    if (p.t === 36.75) k.whoosh(t - 0.5, 0.5, 0.16, 300, 2800);           // knockdown windup
  }
}

export default score;
