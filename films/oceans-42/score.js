// OCEAN'S FORTY-TWO — original score + SFX. 120 BPM funk-heist, bar = 2 s (B = 0.5 s).
// One timing truth: every cue is scheduled from timeline.js (T = shot starts, EV = events).
//
// THE THEME — 2-bar call + 2-bar answer in A minor, first stated by the crew pluck:
//   CALL  (beats): A  C·  B·  A·  |  E· D· C·  B·      (syncopated pickups, stepwise fall)
//   ANSW  (beats): C· B· A· G· A | C· B· A             (descent, half-step resolves home)
// It returns transformed to C major at dawn, and stabs the title card at FORTY-TWO.
//
// Form: intro(0) crew(10) plan(18) floor(26) vent(36) vault(42) alarm(56) dawn(66) title(72).
import { EV, B, BAR, T } from './timeline.js';

// ---- the theme: [beat offset, midi]; beats × B = seconds (all grid math, no magic numbers) ----
const CALL = [[0, 69], [0.75, 72], [1.5, 71], [2.5, 69], [4, 76], [4.75, 74], [5.5, 72], [6.5, 71]];
const ANSW = [[0, 72], [0.75, 71], [1.5, 69], [2.25, 67], [3, 69], [4.5, 72], [5.25, 71], [6, 69]];
// major transform — same contour re-centred on C (A-minor degrees mapped to C-major degrees)
const CALL_MAJ = [[0, 72], [0.75, 76], [1.5, 74], [2.5, 72], [4, 79], [4.75, 77], [5.5, 76], [6.5, 74]];
const ANSW_MAJ = [[0, 76], [0.75, 74], [1.5, 72], [2.25, 69], [3, 72], [4.5, 76], [5.25, 74], [6, 72]];

export function score(kit) {
  const k = kit;
  const { ac, at, osc, noise, out, R, hz } = kit;

  // ---------- custom voices (built on kit.at; all envelope endpoints positive) ----------
  // Dying-neon electric buzz: detuned mains-hum saws, bandpassed, gain stuttered via kit.R.
  const buzz = (t, dur = 0.35, g = 0.08) => at(t, () => {
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.4;
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    const o1 = osc('sawtooth', 96, t, dur + 0.05), o2 = osc('sawtooth', 96.7, t, dur + 0.05);
    o1.connect(bp); o2.connect(bp); bp.connect(a);
    const n = noise(t, dur);
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4500;
    const na = ac.createGain();
    na.gain.setValueAtTime(0.0001, t);
    n.connect(hp).connect(na);
    let tt = t;
    while (tt < t + dur) {
      const on = R() < 0.7;
      a.gain.setValueAtTime(on ? g * (0.4 + R() * 0.6) : 0.0001, tt);
      na.gain.setValueAtTime(on ? g * 0.35 : 0.0001, tt);
      tt += 0.025 + R() * 0.05;
    }
    a.gain.linearRampToValueAtTime(0, t + dur);
    na.gain.linearRampToValueAtTime(0, t + dur);
    out(a, 1, 0.2, -0.35); out(na, 1, 0.2, 0.4);
  });
  // Klaxon: two-tone square blare (hi/lo swap each second), lowpassed, panned alternately.
  const klaxon = (t, g = 0.3) => at(t, () => {
    const up = Math.round(t) % 2 === 0;
    const f1 = up ? 830 : 620, f2 = up ? 620 : 830;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800;
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.012);
    a.gain.setValueAtTime(g, t + 0.44);
    a.gain.linearRampToValueAtTime(0.0001, t + 0.5);
    a.gain.linearRampToValueAtTime(g, t + 0.512);
    a.gain.setValueAtTime(g, t + 0.94);
    a.gain.linearRampToValueAtTime(0, t + 0.98);
    const o = osc('square', f1, t, 1.0);
    o.frequency.setValueAtTime(f2, t + 0.5);
    const o2 = osc('sawtooth', f1 / 2, t, 1.0);
    o2.frequency.setValueAtTime(f2 / 2, t + 0.5);
    const sg = ac.createGain(); sg.gain.value = 0.4;
    o.connect(lp); o2.connect(sg).connect(lp); lp.connect(a);
    out(a, 1, 0.12, up ? -0.25 : 0.25);
  });
  // Laser sizzle: bandpassed noise rising across the arc + quiet sine climb + sparse crackle.
  const sizzle = (t0, t1) => at(t0, () => {
    const dur = t1 - t0;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 7;
    bp.frequency.setValueAtTime(1000, t0);
    bp.frequency.exponentialRampToValueAtTime(7200, t1);
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t0);
    a.gain.exponentialRampToValueAtTime(0.09, t1 - 0.05);
    a.gain.linearRampToValueAtTime(0, t1);
    noise(t0, dur).connect(bp).connect(a);
    out(a, 1, 0.25, 0.25);
    const o = osc('sine', 1700, t0, dur);
    o.frequency.exponentialRampToValueAtTime(5600, t1);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.02, t1 - 0.05);
    og.gain.linearRampToValueAtTime(0, t1);
    o.connect(og);
    out(og, 1, 0.2, -0.2);
    for (let i = 0; i < 6; i++) {
      const ct = t0 + 0.3 + R() * (dur - 0.4);
      const n = noise(ct, 0.02);
      const nb = ac.createBiquadFilter();
      nb.type = 'bandpass'; nb.frequency.value = 4000 + R() * 4000; nb.Q.value = 5;
      const ng = ac.createGain();
      ng.gain.setValueAtTime(0.0001, ct);
      ng.gain.linearRampToValueAtTime(0.03, ct + 0.003);
      ng.gain.exponentialRampToValueAtTime(0.0001, ct + 0.03);
      n.connect(nb).connect(ng);
      out(ng, 1, 0.1, R() - 0.5);
    }
  });
  // Tea-tray slide through the ducts: metal bandpass sweep + falling triangle whine.
  const traySlide = (t) => at(t, () => {
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(3600, t + 0.35);
    bp.frequency.exponentialRampToValueAtTime(800, t + 0.72);
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(0.09, t + 0.2);
    a.gain.linearRampToValueAtTime(0.0001, t + 0.75);
    noise(t, 0.8).connect(bp).connect(a);
    out(a, 1, 0.3, 0.2);
    const o = osc('triangle', 1800, t, 0.6);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.55);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(0.045, t + 0.05);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(og);
    out(og, 1, 0.25, -0.15);
  });
  // Getaway engine: detuned saws revving up through an opening lowpass + tyre-skid chirp.
  const engineRev = (t0, t1, g = 0.15) => at(t0, () => {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(260, t0);
    lp.frequency.exponentialRampToValueAtTime(2100, t1);
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t0);
    a.gain.exponentialRampToValueAtTime(g, t1 - 0.03);
    a.gain.linearRampToValueAtTime(0.0001, t1);
    for (const det of [0, 1.7]) {
      const o = osc('sawtooth', 62 + det, t0, t1 - t0 + 0.05);
      o.frequency.exponentialRampToValueAtTime(305 + det, t1);
      o.connect(lp);
    }
    lp.connect(a);
    out(a, 1, 0.2, -0.1);
    const skid = noise(t0, 0.3);
    const sb = ac.createBiquadFilter();
    sb.type = 'bandpass'; sb.Q.value = 4;
    sb.frequency.setValueAtTime(2600, t0);
    sb.frequency.exponentialRampToValueAtTime(1100, t0 + 0.28);
    const sg = ac.createGain();
    sg.gain.setValueAtTime(0.0001, t0);
    sg.gain.linearRampToValueAtTime(0.1, t0 + 0.03);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    skid.connect(sb).connect(sg);
    out(sg, 1, 0.2, 0.3);
  });
  // Comic pitch-drop for the velvet-rope trip.
  const comicSlide = (t) => at(t, () => {
    const o = osc('square', 640, t, 0.55);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.5);
    const v = osc('sine', 9, t, 0.55), vg = ac.createGain();
    vg.gain.value = 34;
    v.connect(vg).connect(o.frequency);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900;
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(0.11, t + 0.015);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(lp).connect(a);
    out(a, 1, 0.1, 0.35);
  });
  // Dawn birds: two quick up-down sine chirps.
  const chirp = (t, f, pan) => at(t, () => {
    for (const d of [0, 0.13]) {
      const o = osc('sine', f, t + d, 0.12);
      o.frequency.exponentialRampToValueAtTime(f * 1.32, t + d + 0.05);
      o.frequency.exponentialRampToValueAtTime(f * 0.95, t + d + 0.1);
      const a = ac.createGain();
      a.gain.setValueAtTime(0.0001, t + d);
      a.gain.linearRampToValueAtTime(0.04, t + d + 0.008);
      a.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.11);
      o.connect(a);
      out(a, 1, 0.15, pan);
    }
  });
  // The theme on plucks; beat offsets × B keep it on the grid.
  const motif = (t0, notes, g, cut, dur, type = 'sawtooth') =>
    notes.forEach(([b, m]) => k.pluck(t0 + b * B, m, g, cut, dur, type));

  // ================ INTRO 0–10 — Am neon-noir ================
  k.pad(T.strip, [45, 52, 57, 60, 64], 10, 0.04, 850, 1.4); // dark Am pad, whole intro
  for (let i = 0; i < 5; i++) k.sub(T.strip + i * BAR, 0.32, 72, 40, 1.8); // low sub pulse per bar
  k.bell(T.strip + 1.4, hz(81), 0.055, 2.4); // occasional neon bell (A5)
  k.bell(T.strip + 5.15, hz(76), 0.05, 2.0); // (E5)
  for (const t of EV.signBuzz) buzz(t, 0.4, 0.085); // dying sign stutters
  k.whoosh(EV.limoPass, 1.4, 0.2, 150, 1800); // the limo glides past
  k.riser(T.dossier - 1.8, T.dossier, 0.18); // 8.2 → 10, lands on the groove

  // ================ CREW 10–18 — heist-funk groove + THE THEME ================
  k.pad(T.dossier, [45, 52, 57, 60], 4, 0.028, 1200); // Am under the call
  k.pad(T.dossier + 4, [41, 48, 53, 57], 4, 0.028, 1200); // F under the answer
  const CREW_ROOTS = [33, 33, 29, 31]; // Am Am F G
  const funkBar = (t0, root, hot) => {
    const G = hot ? 1 : 0.62;
    k.kick(t0, 0.85 * G); k.kick(t0 + 1.5 * B, 0.55 * G); k.kick(t0 + 2.75 * B, 0.5 * G);
    k.clap(t0 + B, hot ? 0.34 : 0.2); k.clap(t0 + 3 * B, hot ? 0.34 : 0.2);
    for (let e = 0; e < 8; e++) k.hat(t0 + e * B / 2, (e % 2 ? 0.075 : 0.045) * G, 0.05);
    // syncopated bass riff: root · root · 5th · root · octave · b7
    const riff = [[0, 0, 0.5], [0.75, 0, 0.3], [1.5, 7, 0.3], [2.25, 0, 0.3], [3, 12, 0.35], [3.5, 10, 0.45]];
    for (const [b, iv, d] of riff) k.bass(t0 + b * B, root + iv, d, hot ? 0.22 : 0.15, 'triangle', 900);
  };
  for (let b = 0; b < 4; b++) funkBar(T.dossier + b * BAR, CREW_ROOTS[b], true);
  motif(T.dossier, CALL, 0.075, 3200, 0.3); // the call — bars 10–12
  motif(T.dossier + 8 * B, ANSW, 0.075, 3200, 0.3); // the answer — bars 14–16
  for (const t of EV.cards) { k.whoosh(t - 0.16, 0.22, 0.16, 1600, 350); k.clunk(t + 0.01, 0.42); } // card slams

  // ================ PLAN 18–26 — stripped tension, T-minus ================
  k.tick(EV.planDraw, 0.05, 1600);
  k.blip(EV.planDraw, 820, 0.04, 0.05, 'square');
  for (const t of EV.arrows) k.whoosh(t, 0.35, 0.13, 600, 2800); // entrance → slots → vent → vault
  for (let t = T.plan; t < T.floor - 0.01; t += B / 2) // clock-tick pulse on 8ths
    k.tick(t, Number.isInteger(t) ? 0.06 : 0.035, 2800);
  { // accelerating countdown blips through the counter window, pitch + rate rising
    const [c0, c1] = EV.counter;
    let t = c0, dt = 0.5, n = 0;
    while (t < c1 - 0.12 && n < 32) {
      k.blip(t, 520 + (t - c0) * 150, 0.04, 0.045, 'square');
      t += dt; dt *= 0.92; n++;
    }
    k.tick(c1 - 0.2, 0.05, 2600); k.tick(c1 - 0.1, 0.055, 3000); k.tick(c1 - 0.03, 0.06, 3400);
    k.sub(c1, 0.6, 95, 34, 1.5); // downbeat sub-hit at zero
    k.impact(c1, 0.4, 60);
  }
  EV.chips.forEach((t, i) => { k.blip(t, 980 + i * 180, 0.05, 0.08, 'square'); k.tick(t + 0.02, 0.04, 2200); });
  k.drone(T.floor - 3.6, T.floor, [33, 45], 0.045, 260); // low A pulse from 22.4
  k.riser(T.floor - 1.4, T.floor, 0.2); // 24.6 → 26

  // ================ FLOOR 26–36 — muted groove + tension pad, jackpot ================
  k.pad(T.floor, [45, 48, 52, 55], 10, 0.03, 1000, 1.0); // Am7 tension bed
  const FLOOR_ROOTS = [33, 33, 29, 31, 33];
  for (let b = 0; b < 5; b++) funkBar(T.floor + b * BAR, FLOOR_ROOTS[b], false);
  k.whoosh(EV.crewIn, 0.35, 0.12, 400, 2000);
  k.tick(EV.insetOn, 0.05, 3400); k.blip(EV.insetOn, 1200, 0.04, 0.05, 'square'); // CAM 04 on
  { // JACKPOT — coin cascade, casino crowd, bell
    k.crash(EV.jackpot, 0.1);
    k.bell(EV.jackpot, hz(88), 0.07, 1.4);
    k.crowd(EV.jackpot, EV.jackpot + 1.2, 0.13);
    const POOL = [81, 84, 86, 88, 91, 93];
    for (let i = 0; i < 14; i++) {
      const t = EV.jackpot + 0.04 + i * 0.085 + (R() - 0.5) * 0.02;
      k.blip(t, hz(POOL[Math.min(i >> 1, 5)]), 0.045, 0.06, 'square');
    }
  }
  for (let t = EV.shadesPan[0]; t < EV.shadesPan[1] - 0.05; t += 0.4) k.tick(t, 0.05, 2500); // scanner
  k.bell(EV.charm, hz(88), 0.04, 1.2); // the FACE works the pit boss
  k.whoosh(EV.slip, 0.4, 0.15, 700, 2600); // crouch-walk slip behind the slots
  EV.hatch.forEach((t, i) => { k.whoosh(t - 0.14, 0.16, 0.09, 900, 350); k.clunk(t + 0.01, 0.42 + i * 0.08); });

  // ================ VENT 36–42 — sparse and dark ================
  k.drone(T.vent, T.vault, [33, 45], 0.03, 220); // faint dark bed
  for (let i = 0; i < 3; i++) k.heartbeat(T.vent + 0.8 + i * 1.2, 0.38); // slow sub heartbeat
  for (const t of [EV.slide[0] + 0.2, (EV.slide[0] + EV.slide[1]) / 2, EV.slide[1]]) traySlide(t);
  for (const t of EV.streaks) k.tick(t, 0.035, 5200); // light through passing grates
  k.whoosh(EV.grateDrop, 0.32, 0.2, 1500, 260); // the drop
  k.clunk(EV.land, 0.55); k.hiss(EV.land + 0.05, 0.5, 0.07); // dusty landing
  for (const t of EV.heart) k.heartbeat(t, 0.42);
  k.tick(T.alarm - 0.2, 0.06, 3000); // single tick 41.8

  // ================ VAULT 42–56 — the centerpiece ================
  k.drone(T.vault, EV.contact, [38, 50], 0.05, 280); // low Dm drone from 42
  k.blip(EV.beamOn, 1500, 0.05, 0.06, 'square'); // laser armed
  sizzle(EV.arc[0], EV.arc[1]); // sizzle rising across the traced circle
  EV.bolts.forEach((t, i) => { k.bell(t, 1900 + i * 260, 0.09, 0.5, 5.1, 5); k.tick(t, 0.04, 3000); }); // bolt pings
  k.impact(EV.contact, 0.85, 50); // THE DOOR FALLS — then 0.35 s hit-stop of near-silence
  k.hiss(EV.dust, 0.9, 0.09); // dust settles
  k.drone(EV.dust + 0.15, EV.shadow[0], [38, 50], 0.04, 240); // drone resumes under the reveal
  k.choir(EV.reveal[0], [50, 57, 62, 65, 69], 2.2, 0.05, 'a', 0.6, 0.5); // reverent Dm voices
  [[0, 74], [0.35, 77], [0.7, 81], [1.2, 86], [1.6, 89]].forEach(([o, m]) =>
    k.bell(EV.reveal[0] + o, hz(m), 0.05, 1.6)); // bell swell for the GOLDEN MULLET
  k.heartbeat(EV.shadow[0] + 0.2, 0.5); k.heartbeat(EV.shadow[0] + 0.8, 0.55); // 52.4 / 53.0
  k.pad(53.6, [50, 57, 62], 2.4, 0.032, 900, 0.5); // soft resume
  k.bell(EV.domeLift, hz(98), 0.07, 1.1, 4.2, 3); k.tick(EV.domeLift, 0.04, 3600); // glass chime
  k.taiko(EV.lift, 0.75); k.crash(EV.lift, 0.15); // triumphant D-major sting (picardy lift)
  k.strings(EV.lift, [50, 54, 57, 62], 1.3, 0.055, 0.12, 0.8, 3000);
  k.riser(55.15, T.alarm, 0.22); // 55.15 → 55.95, cuts dead exactly at 56.0 (tracks the post-freeze lift)

  // ================ ALARM 56–66 — the chase ================
  const klax = (t) => klaxon(t, 0.3);
  for (let i = 0; i < 4; i++) klax(EV.klaxon + i); // two-tone blare 56.0 → 60.0
  const chaseBar = (t0, root) => {
    for (let bt = 0; bt < 4; bt++) k.kick(t0 + bt * B, 0.7); // four on the floor
    k.clap(t0 + B, 0.26); k.clap(t0 + 3 * B, 0.26);
    for (let s = 0; s < 16; s++) k.hat(t0 + s * B / 4, s % 2 ? 0.06 : 0.032, 0.035); // 16ths
    for (let e = 0; e < 8; e++) k.bass(t0 + e * B / 2, root + (e === 6 ? 12 : 0), 0.21, 0.17, 'sawtooth', 850);
  };
  const ALARM_ROOTS = [40, 40, 36, 38]; // Em Em C D
  for (let b = 0; b < 4; b++) chaseBar(T.alarm + b * BAR, ALARM_ROOTS[b]);
  { // last bar 64 runs only until the gate slams
    const t0 = T.alarm + 4 * BAR;
    k.kick(t0, 0.7); k.kick(t0 + B, 0.7);
    for (let s = 0; s < 8; s++) k.hat(t0 + s * B / 4, s % 2 ? 0.06 : 0.032, 0.035);
    k.bass(t0, 40, 0.21, 0.17, 'sawtooth', 850); k.bass(t0 + B / 2, 40, 0.21, 0.17, 'sawtooth', 850);
  }
  comicSlide(EV.ropeTrip); // guards hit the velvet rope
  k.clunk(EV.pileup, 0.5); k.clunk(EV.pileup + 0.15, 0.42); // the pile-up
  k.whoosh(EV.doorBurst - 0.16, 0.2, 0.16, 500, 3200); k.clunk(EV.doorBurst, 0.5); // door burst
  engineRev(EV.carSkid, EV.launch); // skid + rev 60.2 → 61.0
  k.clunk(EV.pileIn[0], 0.34); k.clunk(EV.pileIn[1], 0.3); // bodies pile in
  k.whoosh(EV.launch - 0.14, 0.5, 0.22, 220, 3200); k.sub(EV.launch, 0.5, 95, 42, 1.4); // launch
  k.impact(EV.gate, 0.85, 50); k.clunk(EV.gate + 0.04, 0.6); // the gate — big
  k.crash(EV.clear, 0.2); k.swell(EV.clear, T.dawn, 0.08); // clear — swell into dawn

  // ================ DAWN 66–72 — C major, the theme transformed ================
  k.pad(T.dawn, [48, 55, 60, 64], 6, 0.05, 1400, 0.9); // warm C pad
  motif(T.dawn, CALL_MAJ, 0.075, 2600, 0.5, 'triangle'); // the call, in the light
  motif(T.dawn + 4, ANSW_MAJ.slice(0, 5), 0.07, 2600, 0.5, 'triangle'); // answer, ending on C
  for (let i = 0; i < 6; i++) k.hat(T.dawn + i, 0.035, 0.06); // soft half-time hats
  chirp(EV.birds[0], 2900, 0.45); chirp(EV.birds[1], 3350, -0.45);
  k.bell(70.0, hz(84), 0.06, 2.2); // C6 bell

  // ================ TITLE 72–76 ================
  buzz(EV.buzz, 1.0, 0.05); // electric hum under the flickering letters
  for (let i = 0; i < 7; i++) k.tick(EV.word1 + i * 0.06, 0.035, 4200); // OCEAN'S flicker
  { // FORTY-TWO slam — the theme in C, punchy
    k.kick(EV.word2, 0.75); k.taiko(EV.word2, 0.55); k.crash(EV.word2, 0.13);
    [60, 64, 67, 72].forEach((m) => k.pluck(EV.word2, m, 0.05, 3200, 0.4)); // C-major stab
    motif(EV.word2, CALL_MAJ.slice(0, 4), 0.11, 3600, 0.24); // C E· D· C·
  }
  k.pluck(EV.subline, 79, 0.05, 2600, 0.3, 'triangle'); // pluck answer: G → E
  k.pluck(EV.subline + 0.25, 76, 0.045, 2600, 0.3, 'triangle');
  k.tick(EV.chipsTitle, 0.05, 3600); k.tick(EV.chipsTitle + 0.08, 0.04, 4200);
  { // final chord at 74.35 — rings out and settles before the file ends at 76
    k.pad(74.35, [48, 55, 60, 64, 72], 0.9, 0.05, 1500, 0.05);
    k.bass(74.35, 36, 0.9, 0.2, 'triangle', 700);
    [60, 64, 67].forEach((m) => k.pluck(74.35, m, 0.05, 2800, 0.5, 'triangle'));
    k.bell(74.35, hz(84), 0.05, 0.9, 3.5);
  }
}
