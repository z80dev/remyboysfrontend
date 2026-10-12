// THE BIG SHEDDING — original noir-jazz score (74 s) ─────────────────────────
// Slow smoky ballad, ~78 BPM feel, no strict grid. Form / keys / themes:
//
//   0–10   street  C natural minor — RAIN THEME (felt piano, rubato) answered
//          by a lonely muted trumpet; rain bed, distant thunder.
//   10–24  office  Cm — slow walking bass + sparse comping; client 14.5 =
//          sub swell + thunder + Db-over-C suspended cluster (never resolves);
//          dossier 18.6 = short riser + paper hiss.
//   24–38  trail   Cm — brushes + upright bass settle into a lazy swing;
//          goons 33.4 = C/Db cluster drone; marquee 36.2 = brass/sax stab
//          (Gm → C7b9) pivoting the key to F minor.
//   38–52  club    F minor — VILLAIN SAX THEME, first full statement at the
//          Baron spotlight 40.0; razor 44.6 = held high Eb + filter riser;
//          hero 47.0 = theme thins to bare bass + ride tick; stare 49.6 =
//          near silence, heartbeat, one riser into the fight.
//   52–…   fight   Cm double-time riff. EVERY hit is placed with
//          fightFilmT(g) — the fight runs on warped time (freezes + slow-mo).
//          clash g4.9 FREEZE cuts to near silence; split g5.35 = falling
//          sine; resume g5.9 = hard re-entry; hair g6.15 = one quiet pluck;
//          lights g6.35 = relax onto Ab major.
//   …–74   dawn    Ab major — RAIN THEME returns over strings + soft choir;
//          PAID thud 62.6; one warm brassy title hit 65.4; THE END 69.8
//          thins to a final piano note + high bell, faded before 73.5.
//
// All melodies are original. Custom voices (trumpet, sax, ride tick, brushes,
// filter riser, pluck-boing) are built from kit.at + kit.osc/kit.noise/kit.out.

import { FIGHT, T, fightFilmT } from "./timeline.js";

export function score(k) {
  const B = 60 / 78; // beat ≈ 0.769 s — lazy 2am pulse, used loosely
  const E8 = B / 4; // double-time eighth for the fight riff
  const J = (a = 0.011) => (k.R() - 0.5) * 2 * a; // deterministic humanize
  const ft = fightFilmT; // world-g → absolute film time (the only legal mapping)

  // Fight cue times — always through fightFilmT, freeze tails read from FIGHT.
  const swingT = ft(FIGHT.swingA); // bat swing
  const parryT = ft(FIGHT.hitA); // parry + freeze 1
  const barT = ft(FIGHT.hitB); // goon B into the bottles + freeze 2
  const clashT = ft(FIGHT.clash); // THE freeze — near silence
  const splitT = ft(FIGHT.split); // slow-mo razor split
  const resumeT = ft(FIGHT.slowmoEnd); // motion resumes
  const kneelT = ft(FIGHT.kneel);
  const hairT = ft(FIGHT.hair);
  const lightsT = ft(FIGHT.lightsOn);
  const dawnT = T.dawn; // = T.fight + warped fight length (≈ 60.73)
  const stopD = (g) => {
    const s = FIGHT.stops.find((s) => s.g === g);
    return s ? s.d : 0;
  };

  // ── custom voices ────────────────────────────────────────────────────────
  // Muted Harmon-style trumpet: saw + slightly detuned square through a
  // bandpass ~1.3 kHz, sharp attack, 5.5 Hz vibrato (±6 cents) fading in.
  const trumpet = (t, midi, dur, { g = 0.12, send = 0.3, pan = -0.12 } = {}) =>
    k.at(t, () => {
      const f0 = k.hz(midi);
      const bp = k.ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(1250, t);
      bp.frequency.linearRampToValueAtTime(1450, t + dur);
      bp.Q.value = 2;
      const o1 = k.osc("sawtooth", f0, t, dur + 0.06);
      const o2 = k.osc("square", f0 * 1.004, t, dur + 0.06);
      const g2 = k.ac.createGain();
      g2.gain.value = 0.35;
      o1.connect(bp);
      o2.connect(g2).connect(bp);
      const lfo = k.osc("sine", 5.5, t, dur + 0.06);
      const lg = k.ac.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.setValueAtTime(0, t + 0.25);
      lg.gain.linearRampToValueAtTime(6, t + Math.max(0.3, 1.0)); // cents
      lfo.connect(lg);
      lg.connect(o1.detune);
      lg.connect(o2.detune);
      const a = k.ac.createGain();
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(g, t + 0.03);
      a.gain.setValueAtTime(g * 0.92, t + Math.max(0.05, dur * 0.75));
      a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      bp.connect(a);
      // faint breath through the mute
      const n = k.noise(t, dur);
      const hp = k.ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 3200;
      const na = k.ac.createGain();
      na.gain.setValueAtTime(0, t);
      na.gain.linearRampToValueAtTime(g * 0.1, t + 0.05);
      na.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(hp).connect(na);
      k.out(a, 1, send, pan);
      k.out(na, 1, send * 0.6, pan);
    });

  // Breathy tenor sax — THE VILLAIN'S VOICE: saw through a lowpass opening
  // 700→1600 Hz, 5 Hz vibrato, filtered breath noise at ~10% of the tone.
  const sax = (t, midi, dur, { g = 0.13, pan = 0.14, send = 0.28 } = {}) =>
    k.at(t, () => {
      const lp = k.ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(700, t);
      lp.frequency.exponentialRampToValueAtTime(1600, t + dur);
      lp.Q.value = 1.1;
      const o = k.osc("sawtooth", k.hz(midi), t, dur + 0.25);
      const lfo = k.osc("sine", 5, t, dur + 0.25);
      const lg = k.ac.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.setValueAtTime(0, t + 0.3);
      lg.gain.linearRampToValueAtTime(9, t + Math.max(0.35, 1.1)); // cents
      lfo.connect(lg);
      lg.connect(o.detune);
      const a = k.ac.createGain();
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(g, t + 0.05);
      a.gain.setValueAtTime(g * 0.9, t + Math.max(0.07, dur * 0.75));
      a.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2); // 0.2 s tail
      o.connect(lp).connect(a);
      const n = k.noise(t, dur + 0.2);
      const hp = k.ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 2500;
      const na = k.ac.createGain();
      na.gain.setValueAtTime(0, t);
      na.gain.linearRampToValueAtTime(g * 0.1, t + 0.07);
      na.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
      n.connect(hp).connect(na);
      k.out(a, 1, send, pan);
      k.out(na, 1, send * 0.5, pan);
    });

  // Ride cymbal tick: short metallic noise burst, bandpass ~7 kHz.
  const ride = (t, g = 0.05) =>
    k.at(t, () => {
      const n = k.noise(t, 0.1);
      const bp = k.ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 7000;
      bp.Q.value = 1.4;
      const a = k.ac.createGain();
      a.gain.setValueAtTime(g, t);
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      n.connect(bp).connect(a);
      k.out(a, 1, 0.12, 0.3);
    });

  // Wire brushes: slow noise swell, bandpass 5–8 kHz, attack .15 decay .3.
  const brush = (t, g = 0.05) =>
    k.at(t, () => {
      const n = k.noise(t, 0.6);
      const bp = k.ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(5200, t);
      bp.frequency.linearRampToValueAtTime(7600, t + 0.5);
      bp.Q.value = 0.9;
      const a = k.ac.createGain();
      a.gain.setValueAtTime(0.0001, t);
      a.gain.linearRampToValueAtTime(g, t + 0.15);
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      n.connect(bp).connect(a);
      k.out(a, 1, 0.1, -0.2);
    });

  // Slow filter riser — the razor: noise brightening under a held note.
  const filterRise = (t0, t1, { g = 0.055, f0 = 280, f1 = 6200 } = {}) =>
    k.at(t0, () => {
      const n = k.noise(t0, t1 - t0 + 0.1);
      const lp = k.ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(f0, t0);
      lp.frequency.exponentialRampToValueAtTime(f1, t1);
      lp.Q.value = 0.8;
      const a = k.ac.createGain();
      a.gain.setValueAtTime(0.0001, t0);
      a.gain.exponentialRampToValueAtTime(g, t1);
      a.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.08);
      n.connect(lp).connect(a);
      k.out(a, 1, 0.1, 0);
    });

  // Tiny pizzicato "boing" for the single sprouting hair — quiet, quick bend.
  const boing = (t) =>
    k.at(t, () => {
      const o = k.osc("triangle", 620, t, 0.34);
      o.frequency.setValueAtTime(620, t);
      o.frequency.exponentialRampToValueAtTime(170, t + 0.18);
      const a = k.ac.createGain();
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(0.05, t + 0.008);
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(a);
      k.out(a, 1, 0.2, 0.15);
    });

  // E-piano comp voice: kit.bell as a soft FM tine (ratio 1.4, index 2).
  const ep = (t, midi, g = 0.035, dur = 1.3) => k.bell(t, k.hz(midi), g, dur, 1.4, 2);

  // ── ACT I — STREET (0–10): rain, thunder, rubato RAIN THEME ────────────
  k.rain(0.05, T.club, 0.1); // rain bed through the club cut (gains down there)
  k.rain(T.club, dawnT, 0.045); // …and it STOPS exactly at dawn (60.73)
  k.wind(0.2, 9.9, 0.05, 350, 1200);
  k.thunder(2.0, 0.32, 4); // distant, unhurried
  k.thunder(7.5, 0.26, 4);
  // RAIN THEME, C natural minor — original motif, spaced rubato (no grid):
  k.piano(0.6 + J(), 72, 0.13, 2.4); // C5
  k.piano(2.55 + J(), 67, 0.12, 1.5); // G4 — under the wanted poster (T.poster)
  k.piano(2.62, 55, 0.06, 1.6); // G3 shadow of the poster slide
  k.piano(4.1 + J(), 68, 0.11, 0.7); // Ab4
  k.piano(4.85 + J(), 67, 0.11, 0.7); // G4
  k.piano(5.65 + J(), 63, 0.11, 1.3); // Eb4
  k.piano(7.25 + J(), 65, 0.1, 0.6); // F4
  k.piano(7.95 + J(), 62, 0.1, 0.6); // D4
  k.piano(8.65, 60, 0.12, 1.9); // C4 — lets the lamp burn into the office cut
  // one lonely muted-trumpet phrase ~4–7, echoing the motif from far off:
  trumpet(4.35, 67, 1.1, { g: 0.085, send: 0.55, pan: 0.4 });
  trumpet(5.55, 63, 0.6, { g: 0.08, send: 0.55, pan: 0.4 });
  trumpet(6.25, 65, 0.55, { g: 0.08, send: 0.55, pan: 0.4 });
  trumpet(6.85, 62, 1.0, { g: 0.08, send: 0.55, pan: 0.4 });

  // ── ACT II — OFFICE (10–24): walking bass, client at 14.5, dossier 18.6 ─
  k.piano(10.02, 36, 0.11, 3.0); // low C anchor on the cut
  k.piano(10.05 + J(), 48, 0.075, 2.6); // Cm7 comp
  k.piano(10.05 + J(), 51, 0.06, 2.6);
  k.piano(10.05 + J(), 58, 0.055, 2.6);
  k.bass(10.0, 36, 0.95, 0.16, "triangle", 420); // slow walk C2
  k.bass(11.0 + J(), 39, 0.95, 0.15, "triangle", 420); // Eb2
  k.bass(12.0 + J(), 44, 0.95, 0.15, "triangle", 420); // Ab2
  k.piano(12.1 + J(), 43, 0.06, 1.8); // Gm7b5 color
  k.piano(12.1 + J(), 46, 0.05, 1.8);
  k.piano(12.1 + J(), 53, 0.05, 1.8);
  k.bass(13.0 + J(), 43, 1.2, 0.15, "triangle", 420); // G2, hangs before the door
  // T.client — the silhouette + lightning: sub swell, thunder, SUSPENDED
  // chord (Db/C cluster) that pointedly does NOT resolve:
  k.sub(T.client, 0.5, 90, 28, 2.5);
  k.thunder(T.client, 0.45, 4.5);
  [60, 61, 65, 68].forEach((m) => k.piano(T.client + 0.05, m, 0.05, 5.0));
  k.pad(T.client, [36, 61, 65, 68], 4.5, 0.04, 800, 0.9);
  // T.reveal — MIDNIGHT's portrait: a floating Ab(add9) shimmer, still no home
  k.piano(16.25, 44, 0.05, 3.0);
  k.piano(16.25, 51, 0.045, 3.0);
  k.piano(16.25, 55, 0.04, 3.0);
  k.piano(16.3 + J(), 58, 0.035, 3.0);
  ep(16.25, 80, 0.03, 1.8); // faint tine glint
  // office pulse resumes under the portrait
  k.bass(16.2, 36, 1.2, 0.15, "triangle", 420);
  k.bass(17.6 + J(), 41, 0.8, 0.14, "triangle", 420);
  // T.caseFile — dossier slides: short riser + paper hiss + low landing note
  k.riser(T.caseFile - 0.62, T.caseFile - 0.02, 0.06);
  k.hiss(T.caseFile - 0.02, 0.6, 0.05);
  k.piano(T.caseFile, 39, 0.09, 2.0);
  k.bass(T.caseFile + J(), 39, 0.9, 0.14, "triangle", 420);
  k.piano(19.5 + J(), 41, 0.06, 2.0); // Fm7 comp
  k.piano(19.5 + J(), 44, 0.05, 2.0);
  k.piano(19.5 + J(), 48, 0.05, 2.0);
  k.piano(19.55, 65, 0.05, 1.6);
  k.bass(20.4 + J(), 36, 0.8, 0.14, "triangle", 420);
  k.bass(21.2 + J(), 44, 0.8, 0.14, "triangle", 420);
  k.piano(21.3 + J(), 46, 0.055, 1.6); // Bb color, lifts the hat off the desk
  k.piano(21.3 + J(), 53, 0.05, 1.6);
  k.piano(21.3 + J(), 57, 0.045, 1.6);
  // T.standUp — Flow rises: little bass walk-up out of the office
  k.bass(22.2, 43, 0.5, 0.15, "triangle", 420);
  k.bass(22.7 + J(), 46, 0.5, 0.15, "triangle", 420);
  k.bass(23.2 + J(), 48, 0.7, 0.15, "triangle", 420);
  k.riser(23.5, T.trail - 0.02, 0.045); // breath into the trail cut

  // ── ACT III — TRAIL (24–38): brushes + bass, lazy swing ─────────────────
  // walking line, one bar (4 beats) at a time, bars at 24.0 / 27.08 / 30.15:
  const walk = (t, m, d = 0.72) => k.bass(t + J(), m, d, 0.15, "triangle", 440);
  walk(T.trail, 36); // C2  bar 1 (Cm): C–Eb–G–Bb rising
  walk(T.trail + B, 39);
  walk(T.trail + 2 * B, 43);
  walk(T.trail + 3 * B, 46);
  walk(27.08, 41); // bar 2 (Fm7): F–Ab–C–Eb
  walk(27.08 + B, 44);
  walk(27.08 + 2 * B, 48);
  walk(27.08 + 3 * B, 51);
  walk(30.15, 44); // bar 3: lament fall Ab–G–F–Eb
  walk(30.15 + B, 43);
  walk(30.15 + 2 * B, 41);
  walk(30.15 + 3 * B, 39);
  walk(33.23, 36, 1.6); // bar 4: low C pedal under the goons
  // brushes on 2 and 4, slight late-swing placement:
  [24.77, 26.31, 27.85, 29.39, 30.92, 32.46].forEach((t) => brush(t + J(0.02), 0.045));
  // sparse comping between footsteps:
  k.piano(25.0 + J(), 48, 0.06, 2.4);
  k.piano(25.0 + J(), 51, 0.05, 2.4);
  k.piano(25.0 + J(), 58, 0.05, 2.4);
  k.piano(28.1 + J(), 44, 0.055, 2.2);
  k.piano(28.1 + J(), 48, 0.05, 2.2);
  k.piano(28.1 + J(), 51, 0.045, 2.2);
  k.piano(31.2 + J(), 41, 0.055, 2.0);
  k.piano(31.2 + J(), 44, 0.05, 2.0);
  k.piano(31.2 + J(), 48, 0.045, 2.0);
  // T.clue — the glowing strand: tiny bell sparkle, music barely breathes
  k.bell(T.clue, k.hz(87), 0.045, 1.6, 2.4, 2.2);
  k.bell(T.clue + 0.16, k.hz(91), 0.04, 1.6, 2.4, 2.2);
  k.piano(T.clue + 0.02, 79, 0.05, 2.0);
  // T.witness — the ORDERLY flash-card: a muted-trumpet "question"
  trumpet(T.witness, 67, 0.22, { g: 0.09, pan: 0.25 });
  trumpet(T.witness + 0.25, 70, 0.5, { g: 0.09, pan: 0.25 });
  // T.goons — two silhouettes: brushes stop, C/Db cluster drone simmers
  k.drone(T.goons, T.signTilt - 0.05, [36, 37, 43], 0.045, 420);
  k.bass(T.goons, 36, 2.7, 0.13, "sine", 320);
  k.riser(35.4, T.signTilt - 0.02, 0.05);
  // T.signTilt — the COMB CLUB marquee: bold brass/sax stab, Gm → C7b9
  // (V of F minor) pivots the film into the club's key:
  k.impact(T.signTilt, 0.35, 50);
  trumpet(T.signTilt, 67, 1.0, { g: 0.11 });
  trumpet(T.signTilt, 79, 0.9, { g: 0.07 });
  sax(T.signTilt, 55, 1.3, { g: 0.1 });
  trumpet(37.35, 64, 0.5, { g: 0.08 }); // E natural — the leading tone grins
  trumpet(37.35, 70, 0.5, { g: 0.09 });
  sax(37.35, 48, 0.55, { g: 0.1 });

  // ── ACT IV — CLUB (38–52): the Baron, F minor ───────────────────────────
  k.piano(T.club + 0.02, 41, 0.1, 3.0); // low F octave on the cut
  k.piano(T.club + 0.02, 53, 0.06, 3.0);
  k.pad(T.club, [41, 44, 48], 2.4, 0.035, 700, 0.5); // dark Fm bed
  k.bass(T.club, 41, 1.6, 0.15, "triangle", 420);
  k.bass(39.0 + J(), 36, 0.9, 0.14, "triangle", 420);
  brush(38.77 + J(0.02), 0.035);
  brush(39.54 + J(0.02), 0.035);
  // T.baron — spotlight snaps: band falls away for THE VILLAIN SAX THEME.
  // Original 8-note melody in F minor, played behind the beat:
  k.impact(T.baron, 0.22, 48);
  ride(T.baron + 0.02, 0.04);
  sax(39.78, 60, 0.28, { g: 0.1 }); // pickup C4
  sax(40.12, 65, 1.15, { g: 0.14 }); // F4 — held, smoke curling
  sax(41.35, 68, 0.6, { g: 0.13 }); // Ab4
  sax(42.02, 67, 0.55, { g: 0.13 }); // G4
  sax(42.62, 65, 0.85, { g: 0.13 }); // F4
  sax(43.55, 73, 0.42, { g: 0.12 }); // Db5 — the minor 6th ache
  sax(44.02, 72, 0.5, { g: 0.12 }); // C5, left hanging…
  // sparse comping + patient bass under the theme:
  k.piano(41.4 + J(), 55, 0.06, 2.0); // Gm7b5 (ii of Fm)
  k.piano(41.4 + J(), 61, 0.05, 2.0);
  k.piano(41.4 + J(), 65, 0.05, 2.0);
  k.piano(43.1 + J(), 48, 0.06, 1.4); // C7b9 (V): C–E–Bb–Db
  k.piano(43.1 + J(), 64, 0.05, 1.4);
  k.piano(43.1 + J(), 70, 0.05, 1.4);
  k.piano(43.1 + J(), 73, 0.045, 1.4);
  k.bass(40.4 + J(), 41, 1.1, 0.14, "triangle", 420);
  k.bass(41.9 + J(), 36, 0.8, 0.13, "triangle", 420);
  k.bass(43.2 + J(), 37, 0.8, 0.13, "triangle", 420); // Db2 menace
  k.bass(44.3 + J(), 36, 0.9, 0.13, "triangle", 420);
  // T.razorUp — high sustained Eb over the Fm world + slow filter riser:
  filterRise(43.5, T.razorUp, { g: 0.055 });
  k.riser(43.7, T.razorUp - 0.02, 0.05);
  trumpet(T.razorUp, 75, 2.3, { g: 0.1, send: 0.4 });
  k.bass(T.razorUp, 41, 2.2, 0.12, "sine", 320);
  // T.heroEnter — she steps in: theme thins to BARE bass + ride tick,
  // a descending lament F–Eb–Db–C, slowing as she walks:
  k.bass(T.heroEnter, 41, 0.75, 0.15, "triangle", 420);
  ride(T.heroEnter, 0.04);
  k.bass(47.8, 39, 0.75, 0.14, "triangle", 420);
  ride(47.8, 0.035);
  k.bass(48.6, 37, 0.75, 0.14, "triangle", 420);
  ride(48.6, 0.03);
  k.bass(49.4, 36, 0.9, 0.12, "sine", 320); // last breath of the bar
  // T.stare — near silence: one bulb, two silhouettes, a heartbeat:
  k.heartbeat(49.9, 0.24);
  k.heartbeat(50.42, 0.27);
  k.heartbeat(50.88, 0.31);
  k.heartbeat(51.26, 0.36);
  k.riser(51.0, T.fight - 0.03, 0.13); // the one riser into the fight

  // ── ACT V — FIGHT (52 → dawnT): warped time, hits via fightFilmT ────────
  const RIFF = [36, 48, 46, 48, 36, 48, 44, 46]; // Cm menace, double-time
  const riff = (t0, t1) => {
    for (let t = t0, i = 0; t < t1 - 0.02; t += E8, i++) {
      const d = Math.min(E8 * 0.9, (t1 - t) * 0.8); // never ring into a freeze
      k.bass(t + J(0.006), RIFF[i % 8], d, 0.2, "sawtooth", 480);
      k.hat(t, i % 2 ? 0.035 : 0.06, 0.04);
      if (i % 4 === 0) k.kick(t, 0.42);
      if (i % 8 === 6) k.kick(t, 0.3);
    }
  };
  // cut to the fight — the theme lands (still Cm):
  k.impact(T.fight, 0.6, 55);
  k.taiko(T.fight, 0.5, 62);
  k.crash(T.fight, 0.1);
  trumpet(T.fight + 0.25, 67, 0.14, { g: 0.1 });
  trumpet(T.fight + 0.42, 70, 0.2, { g: 0.1 });
  riff(T.fight + 0.04, swingT - 0.04);
  k.taiko(ft(FIGHT.goonsAdvance), 0.25, 70); // goons advance (g 0.3)
  // g1.55 — bat swing:
  k.whoosh(swingT, 0.3, 0.18, 500, 3800);
  // g1.8 — parry: sharp impact + metallic ping, then the freeze holds:
  k.impact(parryT, 0.5, 70);
  k.clunk(parryT, 0.3);
  k.bell(parryT, 2360, 0.05, 0.4, 2.7, 4);
  k.bell(parryT + 0.01, 3540, 0.03, 0.3, 2.7, 4);
  riff(parryT + stopD(FIGHT.hitA) + 0.02, barT - 0.05);
  // g3.1 — goon B meets the bottle shelf:
  k.glass(barT, 0.3);
  k.impact(barT, 0.45, 60);
  riff(barT + stopD(FIGHT.hitB) + 0.02, clashT - 0.03);
  trumpet(55.6, 67, 0.16, { g: 0.11 }); // short fight licks under the stalk
  trumpet(55.8, 70, 0.18, { g: 0.11 });
  trumpet(56.05, 72, 0.24, { g: 0.11 });
  trumpet(56.5, 68, 0.18, { g: 0.1 });
  trumpet(56.72, 67, 0.3, { g: 0.1 });
  // g4.9 — THE CLASH: cut to near silence, exactly here. One dying ping and
  // a held-breath low note; nothing else until the slow-mo:
  k.bell(clashT, 1975, 0.05, 0.6, 2.7, 4);
  k.piano(clashT + 0.05, 39, 0.06, 1.4);
  // g5.35 — razor splits in slow motion: a pitch-falling tone, subtle:
  k.sweepDown(splitT, 1.2, 1300, 110, 0.1, "sine");
  // g5.9 — motion resumes: the fight theme lands HARD one last time:
  k.impact(resumeT, 0.55, 55);
  k.taiko(resumeT, 0.45, 58);
  k.crash(resumeT, 0.09);
  trumpet(resumeT + 0.02, 67, 0.16, { g: 0.11 });
  trumpet(resumeT + 0.18, 70, 0.18, { g: 0.11 });
  trumpet(resumeT + 0.38, 72, 0.28, { g: 0.1 });
  riff(resumeT + 0.04, resumeT + 0.44);
  // g5.95 — the Baron drops: one low piano C, ring into the light:
  k.piano(kneelT + 0.01, 48, 0.1, 1.6);
  // g6.15 — a single hair sprouts: tiny pluck + quiet bend ("boing", tasteful):
  k.pluck(hairT, 79, 0.045, 3000, 0.16, "triangle");
  boing(hairT + 0.01);
  // g6.35 — house lights flicker up: the score exhales onto Ab major:
  k.clunk(lightsT, 0.18);
  k.strings(lightsT, [56, 60, 63], 3.0, 0.04, 0.6, 1.5); // Ab–C–Eb

  // ── ACT VI — DAWN (60.73–74): Ab major, the rain theme comes home ───────
  // (rain bed above already stops exactly at dawnT)
  k.piano(dawnT + 0.02, 44, 0.07, 4.0); // Abmaj7 pad in felt piano
  k.piano(dawnT + 0.02, 48, 0.06, 4.0);
  k.piano(dawnT + 0.02, 51, 0.055, 4.0);
  k.piano(dawnT + 0.02, 55, 0.05, 4.0);
  k.strings(dawnT, [51, 56, 60], 4.5, 0.045, 1.0, 1.8); // Eb–Ab–C
  k.bass(dawnT, 44, 2.4, 0.11, "sine", 300);
  k.choir(62.0, [56, 63, 68], 5.0, 0.028, "a", 1.6, 2.0); // soft, wordless
  // RAIN THEME transposed to Ab major — same shape, now warm:
  k.piano(60.9, 75, 0.13, 2.0); // Eb5
  k.piano(62.35 + J(), 72, 0.12, 1.2); // C5
  // 62.6 — the PAID stamp: a soft thud, almost a smile:
  k.impact(62.6, 0.32, 50);
  k.clunk(62.6, 0.15);
  k.piano(63.4 + J(), 73, 0.11, 0.55); // Db5
  k.piano(64.05 + J(), 70, 0.11, 0.55); // Bb4
  k.piano(64.75, 68, 0.12, 1.4); // Ab4, leaning on the tonic
  k.bass(63.2, 36, 1.8, 0.1, "sine", 300);
  // 65.4 — TITLE SLAM: one warm brassy Ab chord (not bombastic — it's noir):
  k.impact(T.titleSlam, 0.4, 52);
  k.piano(T.titleSlam + 0.02, 44, 0.12, 2.5);
  k.strings(T.titleSlam, [56, 63, 68, 72], 3.0, 0.05, 0.5, 1.4);
  trumpet(T.titleSlam, 63, 2.4, { g: 0.08, send: 0.35 });
  trumpet(T.titleSlam, 68, 2.4, { g: 0.08, send: 0.35 });
  trumpet(T.titleSlam, 72, 2.6, { g: 0.07, send: 0.35 });
  k.bass(T.titleSlam, 44, 2.6, 0.11, "sine", 300);
  k.piano(66.4 + J(), 72, 0.11, 1.6); // melody settles after the slam
  // 67.6 — the kicker caption: a gentle piano answer:
  k.piano(T.kicker, 68, 0.1, 2.2);
  k.piano(T.kicker + 0.01, 72, 0.07, 2.2);
  ep(68.3, 75, 0.03, 1.6);
  // 69.8 — THE END: thin out. One piano note + one high bell, ringing out
  // and fully faded BEFORE 73.5 (bell done by ~72.5; piano by ~73.3):
  k.piano(T.theEnd - 0.05, 56, 0.15, 3.4); // final low Ab
  k.bell(T.theEnd + 0.2, 1661.2, 0.075, 2.5, 3.5, 3); // Ab6, rings out
  k.bell(T.theEnd + 0.25, 1244.5, 0.04, 2.2, 3.5, 3); // Eb6 ghost above it
}
