// BALDZILLA — original tokusatsu/kaiju score. Two motifs share the root A:
//   DOME MOTIF (menace)  — slow descending A-minor lament: A2 G#2 F2 E2 A1  (MIDI 45 44 41 40 33)
//   FLOW THEME (hope)    — rising A-major phrase:      C#4 E4 F#4 G#4 A4 C#5 (MIDI 61 64 66 68 69 73)
// The lament falls to the root; the theme climbs out of it — the ending is the menace resolving.
import { DUR, T, SEA, NEWS, RAMP, RAMP_CLOCK, LAB, BATTLE, BATTLE_CLOCK, DAWN } from './timeline.js';

// g-domain (shot-local world time with hit-stops) -> absolute film seconds.
const RA = (g) => RAMP_CLOCK.abs(g);
const BA = (g) => BATTLE_CLOCK.abs(g);

// FLOW THEME: [midi, stepMultiplier] — step is the phrase unit (lab ≈ 0.55 s, dawn ≈ 0.62 s).
const FLOW = [61, 64, 66, 68, 69, 73];
// DOME MOTIF notes, low + an octave double (development adds the double, then upper F/A colour).
const DOME = [[33, 45], [32, 44], [29, 41], [28, 40]];

export default function score(k) {
  const J = (a = 0.011) => (k.R() - 0.5) * 2 * a; // humanize

  // ---- custom voices ---------------------------------------------------------
  // Distorted kaiju growl: saw bending down under a dirt layer, wide.
  const growl = (t, g = 0.3) => {
    k.at(t, () => {
      const o = k.osc('sawtooth', 68, t, 1.9);
      o.frequency.setValueAtTime(68, t);
      o.frequency.exponentialRampToValueAtTime(36, t + 1.9);
      const f = k.ac.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 1.2;
      o.connect(f);
      k.out(f, g, 0.5, 0, 0.75);
      const n = k.noise(t, 1.4);
      const nf = k.ac.createBiquadFilter();
      nf.type = 'bandpass'; nf.frequency.value = 160; nf.Q.value = 0.8;
      n.connect(nf);
      k.out(nf, g * 0.32, 0.5, 0, 0.7);
    });
  };
  // Air-raid siren: triangle gliding 500→850→500, two full cycles, tremolo, gain swell.
  const siren = (t0, t1, g = 0.055) => {
    k.at(t0, () => {
      const o = k.osc('triangle', 500, t0, t1 - t0);
      const cyc = (t1 - t0) / 2;
      o.frequency.setValueAtTime(500, t0);
      for (let i = 0; i < 2; i++) {
        o.frequency.exponentialRampToValueAtTime(850, t0 + cyc * i + cyc / 2);
        o.frequency.exponentialRampToValueAtTime(500, t0 + cyc * (i + 1));
      }
      const a = k.ac.createGain();
      k.env(a.gain, t0, 1.2, g, cyc, 0.02, 0.5);
      const trem = k.ac.createGain();
      const lfo = k.osc('sine', 5.5, t0, t1 - t0);
      const lg = k.ac.createGain();
      lg.gain.value = g * 0.4;
      lfo.connect(lg).connect(trem.gain);
      o.connect(trem).connect(a);
      k.out(a, 1, 0.45, 0, 0.5);
    });
  };
  // POLISH RAY: singing sine with vibrato, sustained across the sweep.
  const beamTone = (t, dur, f0 = 2000, g = 0.09) => {
    k.at(t, () => {
      const o = k.osc('sine', f0, t, dur);
      const lfo = k.osc('sine', 6.5, t, dur);
      const lg = k.ac.createGain();
      lg.gain.value = f0 * 0.018;
      lfo.connect(lg).connect(o.frequency);
      const a = k.ac.createGain();
      k.env(a.gain, t, 0.03, g, dur * 0.75, 0.02, 0.45);
      o.connect(a);
      k.out(a, 1, 0.4, 0.1);
    });
  };
  // Battle ray: harsher saw + noise, slightly flat-bent.
  const beamRage = (t, dur, f0 = 1250, g = 0.1) => {
    k.at(t, () => {
      const o = k.osc('sawtooth', f0, t, dur);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.86, t + dur);
      const bp = k.ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f0 * 1.3; bp.Q.value = 1.1;
      o.connect(bp);
      k.out(bp, g, 0.4, -0.15);
      const n = k.noise(t, dur);
      const nf = k.ac.createBiquadFilter();
      nf.type = 'bandpass'; nf.frequency.value = f0 * 1.7; nf.Q.value = 0.9;
      n.connect(nf);
      k.out(nf, g * 0.4, 0.35, 0.2);
    });
  };
  // One high sine hanging inside a hit-stop freeze (time-freeze feel).
  const freezeSine = (t, f, dur, g = 0.045) => {
    k.at(t, () => {
      const o = k.osc('sine', f, t, dur);
      const a = k.ac.createGain();
      k.env(a.gain, t, 0.012, g, dur - 0.02);
      o.connect(a);
      k.out(a, 1, 0.45);
    });
  };
  // Doppler jet: falling glide + smoke hiss.
  const doppler = (t) => {
    k.sweepDown(t, 0.9, 1500, 200, 0.2, 'sawtooth');
    k.hiss(t + 0.15, 0.6, 0.1);
  };
  // FLOW CANNON launch: spring-boing (comedic elastic glide up and settle).
  const boing = (t, g = 0.16) => {
    k.at(t, () => {
      const o = k.osc('sine', 160, t, 0.55);
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(560, t + 0.16);
      o.frequency.exponentialRampToValueAtTime(240, t + 0.5);
      const a = k.ac.createGain();
      k.env(a.gain, t, 0.008, g, 0.48);
      o.connect(a);
      k.out(a, 1, 0.3, 0.25);
    });
  };
  // Tonic glob fizz: short rising blips + airy hiss (the green burst).
  const fizz = (t) => {
    for (let i = 0; i < 6; i++) k.blip(t + i * 0.07, 520 + i * 190, 0.045, 0.06, 'sine');
    k.hiss(t, 0.5, 0.07);
  };
  // Outboard motor: chugging square blips, decaying, panned to the fleeing boat.
  const chug = (t0, t1, rate = 9, f0 = 120, g0 = 0.05) => {
    const n = Math.floor((t1 - t0) * rate);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      k.blip(t0 + i / rate + J(0.003), f0 * (1 - u * 0.25), g0 * (1 - u * 0.7), 0.05, 'square');
    }
  };
  // Pencil scratch on the blueprint.
  const pencil = (t) => {
    k.at(t, () => {
      const n = k.noise(t, 0.05);
      const f = k.ac.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 2400 + k.R() * 900; f.Q.value = 2.2;
      n.connect(f);
      k.out(f, 0.02, 0.15, (k.R() - 0.5) * 0.7);
    });
  };
  // Gull: high short downward chirp.
  const gull = (t, pan = 0) => {
    k.at(t, () => {
      const o = k.osc('sine', 2600, t, 0.17);
      o.frequency.exponentialRampToValueAtTime(1700, t + 0.16);
      const a = k.ac.createGain();
      k.env(a.gain, t, 0.02, 0.028, 0.14);
      o.connect(a);
      k.out(a, 1, 0.4, pan);
    });
  };
  // DOME MOTIF braam statement, i-th recurrence (development: wider doubling each time).
  const domeBraam = (t, i, g = 0.4, dur = 2.2, soft = false) => {
    const [lo, hi] = DOME[i % 4];
    const notes = i === 0 ? [lo, hi]
      : i === 1 ? [lo, hi, lo - 12]
      : [lo, hi, lo - 12, hi + 12];
    k.braam(t, notes, dur, g, 1 + i * 0.25);
    if (i >= 1) soft ? k.kick(t, 0.55) : k.taiko(t, 0.45 + i * 0.1); // kick: short tail near freezes
  };

  // ============================================================================
  // 0–14 THE SEA — dark sub drone, growing taiko pulse, breach, roar, title
  // ============================================================================
  k.drone(T.sea, T.sea + 11.8, [28, 33, 40], 0.045);          // ends clear of the news stinger
  k.wind(T.sea, T.sea + 8.2, 0.14, 300, 900);
  k.taiko(T.sea + 0.9, 0.22);                                  // slow pulse, every ~3.5 s, growing
  k.taiko(T.sea + 4.4, 0.38);
  for (let tt = SEA.ripples, i = 0, iv = 0.5; tt < 6.9; i++) { // ripple ticks accelerating
    k.tick(tt + J(0.004), 0.04 + i * 0.004, 1800 + i * 120);
    iv *= 0.84; tt += iv;
  }
  k.riser(T.sea + 5.5, T.sea + SEA.breach, 0.2);
  k.impact(T.sea + SEA.breach, 0.85, 50);                      // BREACH
  k.thunder(T.sea + SEA.breach + 0.05, 0.6);
  k.crash(T.sea + SEA.breach + 0.1, 0.3);
  k.sub(T.sea + SEA.breach, 0.7, 90, 26, 2.6);
  k.hiss(T.sea + SEA.breach + 0.05, 1.2, 0.16);                // water sheets off
  k.impact(T.sea + SEA.roar, 0.6, 55);                         // ROAR
  domeBraam(T.sea + SEA.roar + 0.05, 0, 0.42, 1.4);            // DOME MOTIF, note 1 (A)
  domeBraam(T.sea + 10.2, 1, 0.4, 1.0);                        // note 2 (G#) — clamped before the title
  growl(T.sea + SEA.roar, 0.3);
  chug(T.sea + SEA.flee, T.sea + 11.0, 9, 120, 0.05);          // boat flees, panned right
  k.braam(T.sea + SEA.title, [28, 33, 40, 45], 3, 0.5);        // TITLE SLAM
  k.taiko(T.sea + SEA.title, 0.85);
  k.impact(T.sea + SEA.title, 0.9);
  k.crash(T.sea + SEA.title + 0.02, 0.25);
  k.drone(T.sea + 11.9, T.news + 0.05, [28, 33], 0.03);        // kicker silence-ish bed

  // ============================================================================
  // 14–28 THE NEWS — ticking desk bed, footage field recording, siren rising
  // ============================================================================
  domeBraam(NEWS.deskA, 2, 0.38, 0.8);                         // stinger: motif fragment (F)
  domeBraam(NEWS.deskA + 0.75, 3, 0.4, 1.2);                   // fragment (E)
  for (let tt = T.news + 0.2; tt < NEWS.footage - 0.15; tt += 0.5) k.tick(tt, 0.05, 2400); // desk clock
  for (let tt = T.news + 0.05, i = 0; tt < NEWS.footage - 0.3; tt += 0.25, i++) {
    k.bass(tt, [33, 33, 40, 33][i % 4], 0.2, 0.14, 'square', 500); // muted pulse 8ths
  }
  for (let tt = T.news + 0.6; tt < NEWS.footage - 0.5; tt += 1.1 + k.R() * 0.9) {
    k.blip(tt, 1320 + k.R() * 300, 0.03, 0.06);                // news-desk data blips
  }
  k.rain(NEWS.footage, NEWS.deskB, 0.1);                       // FOOTAGE: bed drops out
  k.wind(NEWS.footage, NEWS.deskB, 0.12, 200, 700);
  [0.4, 1.8, 3.2].forEach((o) => {                             // distant heavy steps, every 1.4 s
    k.impact(NEWS.footage + o, 0.28, 42);
    k.sub(NEWS.footage + o, 0.2, 60, 30, 1.2);
  });
  k.braam(NEWS.footage + 1.9, [28, 40], 2.4, 0.3);             // one distant roar, wide
  for (let tt = NEWS.deskB + 0.1, i = 0; tt < T.rampage - 0.3; tt += 0.22, i++) {
    k.bass(tt, [33, 33, 45, 33][i % 4], 0.18, 0.16, 'square', 600); // desk B: more urgent
  }
  for (let tt = NEWS.deskB + 0.15; tt < NEWS.siren; tt += 0.4) k.tick(tt, 0.05, 2600);
  siren(NEWS.siren, T.rampage + 0.3, 0.055);                   // air-raid siren, 2 cycles → rampage
  k.crowd(T.rampage - 2, T.rampage + 0.3, 0.1);                // crowd rising under the cut

  // ============================================================================
  // 28–48 RAMPAGE — full kaiju score (all event times via RAMP_CLOCK)
  // Freeze windows (percussion silent): beamHit stop RA(13.4)..+0.12, slow-mo RA(13.55)..RA(14.4)
  // ============================================================================
  k.drone(T.rampage, RA(RAMP.charge) + 0.3, [28, 33, 40], 0.04); // ducked out before the beam climax
  const slow0 = RA(RAMP.rates[0].from), slow1 = RA(RAMP.rates[0].to);
  const hitStop0 = RA(RAMP.beamHit);
  // Freeze/slow-mo discipline: skip the grid inside [freeze−0.5, slow-mo end]; in the last second
  // before the freeze swap taiko (1 s decay) for kick (0.42 s) so no tail rings across the stop.
  const rampDead = (tt) => (tt > hitStop0 - 0.5 && tt < slow1 + 0.1);
  for (let tt = T.rampage + 0.1, i = 0; tt < RA(RAMP.heroWide); tt += 0.5, i++) {
    if (rampDead(tt)) continue;
    if (tt > hitStop0 - 1.0) { k.kick(tt + J(), 0.5); continue; } // short tails into the freeze
    k.taiko(tt + J(), i % 4 === 0 ? 0.8 : 0.55);
    k.kick(tt + 0.25 + J(), 0.5);                              // kick on the off-beat 8th
  }
  for (let tt = T.rampage + 0.35; tt < hitStop0 - 0.35; tt += 0.5) {
    k.hat(tt, 0.1);                                            // hats until just before the freeze
  }
  k.heartbeat(slow0 + 0.35, 0.4);                              // slow-mo: a heartbeat, time stretching
  k.heartbeat(slow0 + 1.2, 0.34);
  k.strings(slow0 + 0.05, [69, 76], 1.5, 0.035, 0.02, 0.8);    // sustained high string over the sweep
  [RA(RAMP.footA), RA(RAMP.footB)].forEach((tt, i) => {        // footfalls: impact lands at freeze START
    k.impact(tt, 0.85 - i * 0.1, 48);
    k.sub(tt, 0.7, 85, 26, 2.2);
    k.clunk(tt + 0.02, 0.5);
  });
  RAMP.tanks.forEach((tg, i) => {                              // tank volleys: thump + crack + puff
    const tt = RA(tg);
    k.kick(tt, 0.6);
    k.hiss(tt + 0.03, 0.12, 0.14);                             // muzzle crack
    k.hat(tt + 0.5 + J(0.01), 0.12);                           // tracer arrival
    k.tick(tt + 0.55, 0.05, 2100);
    k.hiss(tt + 0.62 + i * 0.05, 0.4, 0.05);                   // shell puff
  });
  k.sweepDown(RA(RAMP.dustOff), 0.5, 420, 90, 0.14, 'sine');   // dust-off brush: dismissive
  k.riser(RA(RAMP.charge), RA(RAMP.beam), 0.18);               // charge: gleam riser
  for (let i = 0; i < 14; i++) k.blip(RA(RAMP.charge) + i * 0.055, 900 + i * 160, 0.03, 0.04, 'sine'); // whine
  k.whoosh(RA(RAMP.beam), 0.5, 0.28, 300, 3200);               // BEAM fires
  k.glitch(RA(RAMP.beam), 0.18, 0.07);                         // short: silent before the hit-stop
  beamTone(RA(RAMP.beam), RA(RAMP.sweepEnd) - RA(RAMP.beam));  // singing sweep, fades by sweepEnd
  k.glass(RA(RAMP.beamHit), 0.55, 1.8);                        // BEAM HIT: lands at freeze start
  k.impact(RA(RAMP.beamHit), 0.9, 48);
  k.crash(RA(RAMP.beamHit) + 0.02, 0.28);
  doppler(RA(RAMP.jetHit));                                    // jet tumbles through the sweep
  domeBraam(RA(0.5), 0, 0.4, 2.2);                             // DOME MOTIF in the rampage, developing:
  domeBraam(RA(4.6), 1, 0.42, 2.2);                            //   more doubling + taiko each recurrence
  domeBraam(RA(8.6), 2, 0.44, 2.2);
  domeBraam(RA(12.4), 3, 0.46, 0.9, true);                     //   clamped short + kick: before the freeze
  // heroWide: groove halves, motif inverted into a question, riser into the cut.
  const hw = RA(RAMP.heroWide);
  [hw + 0.55, hw + 1.55].forEach((tt) => k.taiko(tt, 0.35));   // halved groove
  k.kick(hw + 2.55, 0.5);                                      // short tail: silent before the 48 s cut
  k.strings(hw, [33, 40], 2.0, 0.05, 0.9, 0.9);                // question form: A–E rising
  k.strings(hw + 0.9, [41, 44], 1.4, 0.05, 0.6, 0.8);          //   F–G# unresolved, clamped < 48 s
  k.heartbeat(hw + 0.7, 0.32);
  k.heartbeat(hw + 1.6, 0.28);
  k.riser(T.lab - 1.6, T.lab - 0.25, 0.24);                    // into the cut (world g 19.6 maps past
                                                               // the 48 s trim, so the riser clamps to it)

  // ============================================================================
  // 48–62 THE PLAN — dawn of hope: FLOW THEME on felt piano, cards, convoy
  // ============================================================================
  FLOW.forEach((m, i) => k.piano(T.lab + 0.8 + i * 0.55, m, 0.09, 2.2)); // solo FLOW THEME, sparse
  for (let tt = LAB.blueprint[0] + 0.1; tt < LAB.blueprint[1]; tt += 0.16 + k.R() * 0.12) pencil(tt);
  for (let tt = LAB.blueprint[1] - 1.5, i = 0; tt < LAB.cards[0] - 0.1; tt += 0.28, i++) {
    k.pluck(tt, [57, 61, 64, 69][i % 4], 0.05);                // harp-ish arpeggio joins
  }
  [64, 66, 68, 71, 73].forEach((m, i) => {                     // five member cards: warm bells rising
    k.bell(LAB.cards[0] + i * 0.5, k.hz(m), 0.09, 1.4, 2.5, 2);
  });
  k.pad(LAB.cards[0] + 1.6, [45, 52, 57, 61], 3.2, 0.05);      // pad chords from 54, ends at convoy
  k.pad(LAB.convoy + 0.4, [45, 52, 61], 2.6, 0.045);           // releases clear of the stamp
  for (let tt = LAB.convoy, i = 0; tt < LAB.stamp - 0.1; tt += 0.24, i++) {
    k.kick(tt, i % 4 === 0 ? 0.7 : 0.5);                       // convoy: driving 8th pulse, traveling
    k.bass(tt + J(0.004), [33, 33, 45, 33][i % 4], 0.2, 0.22, 'sawtooth', 700);
    k.hat(tt + 0.12, 0.09);
  }
  k.drone(LAB.convoy, LAB.stamp, [28, 35], 0.045);             // engine hum
  k.whoosh(LAB.convoy + 1.2, 0.8, 0.08, 300, 1400);            // passing night air
  k.clunk(LAB.stamp, 0.6);                                     // STAMP
  k.kick(LAB.stamp, 0.6);
  k.tick(LAB.stamp + 0.05, 0.06, 1200);
  k.riser(LAB.stamp + 0.2, T.battle - 0.1, 0.26);              // 60.8 → 62

  // ============================================================================
  // 62–78 BATTLE — double-time war score, then the wonder (times via BATTLE_CLOCK)
  // Freeze windows (percussion silent): strike BA(6.0)..+0.16, shellHit BA(8.6)..+0.22
  // ============================================================================
  const strikeT = BA(BATTLE.strike), shellT = BA(BATTLE.shellHit);
  const wonder0 = BA(BATTLE.grow[0]);
  // Freeze discipline: total grid silence [freeze−0.5, freeze+0.4]; within 1 s before a freeze the
  // taiko (1 s decay) is swapped for kick (0.42 s) so no tail rings across the stop.
  const nearStop = (tt, f) => (tt > f - 0.5 && tt < f + 0.4);
  const shortTail = (tt, f) => (tt > f - 1.0 && tt <= f - 0.5);
  for (let tt = T.battle + 0.15, i = 0; tt < wonder0 - 0.45; tt += 0.25, i++) {
    if (nearStop(tt, strikeT) || nearStop(tt, shellT)) continue;
    if (shortTail(tt, strikeT) || shortTail(tt, shellT)) {
      k.kick(tt + J(), 0.5);                                   // short tails into the freezes
      continue;
    }
    k.taiko(tt + J(), i % 2 === 0 ? 0.6 : 0.4);                // taiko double-time
    if (i % 4 === 0) k.kick(tt, 0.45);
    k.strings(tt, [[57], [64], [60], [64]][i % 4], 0.2, 0.042, 0.008, 0.14); // ostinato 8ths
  }
  k.choir(T.battle + 0.1, [33, 40, 45], 5.3, 0.04, 'o', 1.4, 0.4); // war chorus, released before the strike
  k.heartbeat(T.battle + 0.6, 0.4);                            // charge g 0.8
  k.swell(T.battle + 0.3, BA(BATTLE.beam) - 0.05, 0.12, 12000); // rising shimmer into the ray
  beamRage(BA(BATTLE.beam), BA(BATTLE.parry) - BA(BATTLE.beam) - 0.05); // BEAM, higher + aggressive
  k.glitch(BA(BATTLE.beam), 0.3, 0.07);
  k.bell(BA(BATTLE.parry), 2200, 0.14, 0.5, 4.2, 6);           // PARRY: metallic spark
  k.at(BA(BATTLE.parry), () => {                               // spark dust
    const n = k.noise(BA(BATTLE.parry), 0.18);
    const f = k.ac.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 3800;
    n.connect(f);
    k.out(f, 0.12, 0.35);
  });
  k.hat(BA(BATTLE.parry), 0.14);
  k.riser(BA(BATTLE.leap) - 0.9, BA(BATTLE.leap), 0.22);       // LEAP
  k.whoosh(BA(BATTLE.leap), 0.5, 0.18, 400, 2600);
  k.impact(strikeT, 0.9, 48);                                  // STRIKE — full stop-hit at freeze start
  k.crash(strikeT + 0.02, 0.3);
  k.sub(strikeT, 0.7, 85, 24, 2.2);
  freezeSine(strikeT + 0.03, 2600, 0.34, 0.045);               // one high sine across the 0.16 s freeze
  k.whoosh(BA(BATTLE.cannonFire), 0.5, 0.3, 200, 2800);        // CANNON fires
  boing(BA(BATTLE.cannonFire) + 0.05, 0.16);
  for (let i = 0; i < 6; i++) k.blip(BA(BATTLE.cannonFire) + i / 12, 140, 0.04 - i * 0.004, 0.05, 'square');
  k.impact(shellT, 0.85, 50);                                  // SHELL HIT — stop 2, lands at freeze start
  k.sub(shellT, 0.6, 80, 26, 2.0);
  fizz(shellT + BATTLE.stops[1].d);                            // green burst spills out of the freeze
  // The wonder: g 9.0–11.0, percussion gone. FLOW THEME rises with the mane, surge by surge.
  const surges = BATTLE.grow.map(BA);                          // [71.38, 72.18, 72.98]
  k.swell(Math.max(surges[0] - 0.6, shellT + BATTLE.stops[1].d), surges[0], 0.12); // shimmers aligned to
  k.swell(surges[1] - 0.6, surges[1], 0.16);                   //   the surges, the first starting only
  k.swell(surges[2] - 0.6, surges[2], 0.2);                    //   after the shell freeze releases
  k.piano(surges[0], FLOW[0], 0.1, 2); k.piano(surges[0] + 0.3, FLOW[1], 0.1, 2);
  k.pluck(surges[0] + 0.15, 57, 0.06); k.pluck(surges[0] + 0.45, 61, 0.06);
  k.piano(surges[1], FLOW[2], 0.11, 2); k.piano(surges[1] + 0.3, FLOW[3], 0.11, 2);
  k.pluck(surges[1] + 0.15, 64, 0.07); k.pluck(surges[1] + 0.45, 69, 0.07);
  k.piano(surges[2], FLOW[4], 0.12, 2.4); k.piano(surges[2] + 0.35, FLOW[5], 0.13, 2.6);
  k.pluck(surges[2] + 0.15, 73, 0.08); k.pluck(surges[2] + 0.55, 76, 0.07); // register surge
  k.strings(surges[2], [57, 61, 64, 69], 3.4, 0.05, 0.9, 1.5); // strings swell under the full mane
  k.choir(surges[0], [57, 61, 64], 4, 0.05, 'a');              // soft choir of wonder
  k.sweepDown(BA(BATTLE.stagger), 0.9, 220, 60, 0.1, 'sine');  // the ray dies; monster reels, softly
  k.pad(BA(BATTLE.bow), [45, 52, 57, 61, 64], 3.6, 0.05);      // BOW: one warm held chord
  [45, 52, 61, 69].forEach((m) => k.piano(BA(BATTLE.bow) + 0.05, m, 0.1, 3.4)); // FLOW cadence held
  k.heartbeat(BA(BATTLE.bow) + 0.6, 0.3);                      // two heartbeats, slowing
  k.heartbeat(BA(BATTLE.bow) + 1.6, 0.24);

  // ============================================================================
  // 78–90 THE DAWN — surf, FLOW THEME full, the nod, the turn, resolve
  // ============================================================================
  k.rain(T.dawn, DUR - 1, 0.05);                               // surf wash (ends before the last second)
  k.swell(T.dawn + 0.1, T.dawn + 2.6, 0.12);
  k.swell(DAWN.away[0] + 1.0, DAWN.away[1] - 0.9, 0.1);
  k.wind(T.dawn, DAWN.fade - 1.7, 0.08, 400, 1200);            // warm wind
  k.strings(T.dawn + 0.4, [45, 52, 57], 6.2, 0.045, 1.5, 1.8); // bed, released before the endcard
  k.choir(T.dawn + 0.6, [61, 64, 69], 5, 0.04, 'a', 1.8, 2.2); // soft choir
  FLOW.forEach((m, i) => k.piano(T.dawn + 0.5 + i * 0.62, m, 0.13, 2.6)); // FLOW THEME, slower, wide
  k.piano(DAWN.nod, 45, 0.16, 3);                              // THE NOD: single low piano note
  [66, 69, 71].forEach((m, i) => k.piano(DAWN.turn + 0.2 + i * 0.6, m, 0.11, 2.2)); // TURN: lifts a 4th
  k.strings(DAWN.away[0] + 0.2, [57, 61], 3.2, 0.04, 1.3, 1.2); // one string line, done by the endcard
  k.piano(DAWN.away[0] + 1.6, 69, 0.09, 2.4);                  // piano alone with the monster
  k.piano(DAWN.away[0] + 2.9, 64, 0.08, 2.2);
  gull(DAWN.away[0] + 1.0, -0.55); gull(DAWN.away[0] + 3.3, 0.5); // two gulls
  [0.1, 0.6, 1.1, 1.6].forEach((o, i) => {                     // ENDCARD: final FLOW cadence
    k.piano(DAWN.endcard + o, [64, 66, 68, 69][i], 0.12 + i * 0.01, 1.6);
  });
  k.piano(DAWN.endcard + 1.6, 45, 0.15, 1.5);                  // home root: A
  k.swell(DAWN.endcard + 0.4, DAWN.endcard + 1.6, 0.1);        // shimmer into the last hit
  k.sub(DAWN.endcard + 1.6, 0.35, 55, 30, 1.5);                // gentle hit, g~0.35
  k.impact(DAWN.endcard + 1.6, 0.35, 55);
  k.bell(DAWN.endcard + 1.65, k.hz(76), 0.05, 1.4, 2.5, 2);    // last air — decays fully by 89.9
}
