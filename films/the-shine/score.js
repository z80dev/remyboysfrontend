// THE SHINE — original horror score. The gramophone lullaby is the spine:
// bright in the barber room, sparse at the mirror, slowed and sour under the title.
import { T, BARBER, STALK, MATCH, MATCH_CLOCK, CHASE_EV, CHASE_CLOCK } from './timeline.js';

const LB = 0.36; // lullaby eighth note (≈83 bpm 3/4)
// [eighthIndex, midi, durEighths] — original E-aeolian nursery phrase
const PHRASE = [
  [0, 76, 2], [2, 79, 1], [3, 78, 1], [4, 76, 2], [6, 71, 2],
  [8, 74, 1], [9, 76, 1], [10, 72, 1], [11, 71, 1], [12, 69, 2], [14, 67, 2],
];
const BASS = [[0, 52], [4, 47], [8, 48], [12, 43]];

export function score(k) {
  // ---- custom voices ----------------------------------------------------------
  const musicBox = (t, m, dur = 1.6, det = 0.0045, g = 0.042) => {
    k.at(t, () => {
      const f = k.hz(m);
      k.bell(t, f * (1 - det), g, dur, 2.02, 4);
      k.bell(t, f * (1 + det), g * 0.9, dur * 0.9, 2.0, 4);
      const o = k.osc('sine', f / 4, t, 0.16); // felt thump under each note
      k.out(o, 0.028, 0.1);
    });
  };
  const creak = (t, g = 0.045) => {
    k.at(t, () => {
      const o = k.osc('sawtooth', 215, t, 0.85);
      o.frequency.setValueAtTime(215, t);
      o.frequency.exponentialRampToValueAtTime(138, t + 0.85);
      const f = k.ac.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 2;
      o.connect(f);
      k.out(f, g, 0.35);
      const n = k.noise(t, 0.35);
      const nf = k.ac.createBiquadFilter();
      nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 1.5;
      n.connect(nf);
      k.out(nf, g * 0.25, 0.3);
    });
  };
  const crackle = (t0, dur, g = 0.014) => {
    for (let i = 0; i < dur / 0.12; i++) {
      k.tick(t0 + i * 0.12 + k.R() * 0.05, g, 2100 + k.R() * 900);
    }
  };
  const whisper = (t) => {
    k.at(t, () => {
      for (const [fq, q, g] of [[640, 3, 0.014], [1180, 4, 0.01]]) {
        const n = k.noise(t, 1.7);
        const f = k.ac.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q;
        n.connect(f);
        k.out(f, g, 0.5, (k.R() - 0.5) * 0.6);
      }
    });
  };
  const strike = (t) => {
    k.at(t, () => {
      const n = k.noise(t, 0.22);
      const f = k.ac.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 1900;
      n.connect(f);
      k.out(f, 0.24, 0.3);
      for (let i = 0; i < 3; i++) k.tick(t + 0.02 + i * 0.03, 0.05, 2600 - i * 500);
    });
  };
  const thunkMetal = (t, g = 0.5) => {
    k.clunk(t, g);
    k.bell(t, 1830, 0.05, 0.3, 4.5, 7);
    k.tick(t + 0.012, 0.06, 1400);
  };
  const smashGlass = (t) => {
    k.glass(t, 0.55, 1.8);
    k.impact(t, 0.9, 48);
    k.sub(t, 0.75, 80, 24, 2.4);
  };
  const gramLoop = (t0, det = 0.0045, g = 0.042, beat = LB, withBass = true) => {
    for (const [b, m, d] of PHRASE) musicBox(t0 + b * beat, m, d * beat + 0.6, det, g);
    if (withBass) for (const [b, m] of BASS) musicBox(t0 + b * beat, m - 12, 1.6, det, g * 0.8);
  };

  // ---- storm (0–10) -------------------------------------------------------------
  k.swell(0.1, 3.2, 0.1);
  k.wind(0, 10, 0.2);
  k.rain(0, 21, 0.13);
  k.drone(0, 10, [29, 36, 41], 0.05);
  k.thunder(2.24, 0.45); k.thunder(4.64, 0.4); k.thunder(6.94, 0.5);

  // ---- hall (10–21) ---------------------------------------------------------------
  k.drone(10, 21, [33, 40, 45], 0.04);
  k.wind(10, 21, 0.09);
  creak(11.4); creak(15.8, 0.03);
  k.heartbeat(17.6, 0.35);
  k.thunder(19.14, 0.35);

  // ---- barber room (21–32) ----------------------------------------------------------
  creak(21.15, 0.05); // the door swings shut
  k.sub(23.9, 0.4);
  crackle(24, 7.6, 0.012); // the gramophone wakes
  gramLoop(24);
  gramLoop(24 + 16 * LB);
  k.drone(21, 32, [31, 38, 42, 43], 0.045); // semitone cluster: something is wrong here
  k.thunder(31.04, 0.45);

  // ---- stalk (32–43) ---------------------------------------------------------------
  k.drone(32, 43, [30, 37, 42], 0.05);
  k.wind(32, 43.5, 0.16);
  const hb = [];
  for (let i = 0; i < 15; i++) hb.push(34 + i * 0.55 + i * i * 0.008); // accelerando
  hb.forEach((tt, i) => k.heartbeat(tt, 0.3 + (0.2 * i) / 15));
  STALK.snuff.slice(0, 4).forEach((st) => k.whoosh(T.stalk + st, 0.5, 0.05, 500, 1300));
  whisper(41.3);

  // ---- the match (43–50) -------------------------------------------------------------
  k.rain(43, 46.4, 0.03); // held breath — almost nothing else
  [43.8, 44.35, 44.85, 45.25].forEach((tt, i) => k.heartbeat(tt, 0.5 + i * 0.04));
  MATCH.rattle.forEach((rt) => k.tick(T.match + rt, 0.05, 1800));
  strike(T.match + MATCH.strike);
  const sc = T.match + MATCH.strike;
  k.braam(sc + 0.05, [30, 37, 42], 3, 0.5);
  k.strings(sc + 0.05, [54, 55, 61], 2.6, 0.08, 0.015, 2);
  k.impact(sc, 0.85);
  k.sub(sc, 0.6);
  k.choir(sc + 0.2, [43, 50], 2.4, 0.05);
  k.swell(sc, sc + 0.8, 0.26);
  k.drone(sc + 0.3, sc + 1.9, [31, 36], 0.04);
  const bolt = T.match + MATCH.bolt;
  k.whoosh(bolt, 0.7, 0.28);
  k.taiko(bolt + 0.05, 0.5);
  k.riser(bolt + 0.1, bolt + 1.7, 0.24);

  // ---- chase (50–62) -------------------------------------------------------------------
  const slow0 = T.chase + CHASE_CLOCK.filmT(CHASE_EV.slide0); // real-time window where the world slows
  const slow1 = T.chase + CHASE_CLOCK.filmT(CHASE_EV.slide1);
  for (let tt = 50.2; tt < 59.5; tt += 0.48) {
    if (tt > slow0 - 0.1 && tt < slow1 + 0.1) continue; // percussion drops out in slow-mo
    k.taiko(tt, 0.32);
    k.taiko(tt + 0.24, 0.55);
  }
  const chords = [[45, 52, 57], [45, 52, 57], [47, 53, 58], [44, 51, 56]];
  for (let i = 0, tt = 50.15; tt < 59.5; tt += 0.24, i++) {
    if (tt > slow0 - 0.1 && tt < slow1 + 0.3) continue;
    k.strings(tt, chords[i % 4], 0.22, 0.045, 0.008, 0.14, 2600);
  }
  k.riser(slow0 + 0.1, slow1 - 0.1, 0.24); // rises through the silence
  const ev = (g) => CHASE_CLOCK.abs(g);
  k.whoosh(ev(CHASE_EV.burstA), 0.6, 0.3);
  k.clunk(ev(CHASE_EV.burstA) + 0.02, 0.5);
  creak(ev(CHASE_EV.burstB) + 0.05, 0.05);
  k.clunk(ev(CHASE_EV.burstB) + 0.1, 0.4);
  k.whoosh(ev(CHASE_EV.razor), 0.5, 0.32, 1200, 5200);
  thunkMetal(ev(CHASE_EV.stick), 0.55);
  k.clunk(ev(CHASE_EV.doorHit), 0.6);
  k.crash(ev(CHASE_EV.doorHit) + 0.04, 0.2);
  k.impact(ev(CHASE_EV.slam), 0.95);
  k.sub(ev(CHASE_EV.slam), 0.8, 90, 26, 2.4);
  k.taiko(ev(CHASE_EV.slam) + 0.02, 0.7);
  CHASE_EV.thunk.forEach((tg, i) => thunkMetal(ev(tg), 0.5 - i * 0.05));

  // ---- mirror (62–72) --------------------------------------------------------------------
  k.drone(62, 69, [28, 35, 40], 0.035);
  crackle(62.2, 1.2, 0.008); // the dying match
  musicBox(64.8, 76, 1.4); musicBox(66.0, 72, 1.3); musicBox(66.9, 71, 1.2); musicBox(67.0, 67, 2.2, 0.0045, 0.03);
  k.thunder(67.55, 0.5);
  k.strings(67.5, [55, 56, 62], 2.4, 0.06, 0.01, 1.6);
  k.choir(67.6, [56, 63], 2, 0.05);
  k.riser(69.4, 71.45, 0.3);
  k.choir(69.4, [57, 64], 2.2, 0.06);
  k.drone(69.4, 72, [27, 34, 41], 0.05);
  [70.2, 70.7, 71.15].forEach((tt) => k.heartbeat(tt, 0.38));
  smashGlass(71.6); // then silence

  // ---- title (72–77) ----------------------------------------------------------------------
  crackle(72.7, 1.6, 0.01);
  gramLoop(72.8, 0.011, 0.036, LB * 1.35, false); // slowed, badly out of tune
  k.pad(72.8, [40, 47, 52], 4.2, 0.03);
  k.bell(76.4, k.hz(40), 0.07, 1.6, 2, 3);
  k.sub(76.4, 0.3, 60, 30, 1.2);
}
