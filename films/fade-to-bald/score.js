// FADE TO BALD — score. Smoky small-combo noir at ~92 BPM swing, D minor, hopeful D major coda.
// Every cue is scheduled from timeline.js (T for windows, *_EV for micro-cues, clocks' .abs()
// for anything inside a freeze). Nothing here re-types a number the timeline owns.
import { T, STREETS_EV, STREETS_CLOCK, CLUB_EV, CLUB_CLOCK, ROOF_EV, ROOF_CLOCK } from './timeline.js';

const BEAT = 0.652;      // 92 BPM
const BAR = BEAT * 4;    // 2.609
const J = (k, a = 0.011) => (k.R() - 0.5) * 2 * a; // deterministic humanize

// swing 8th grid within a bar: straight beats, dragged upbeats
const SW8 = [0, 0.43, 0.652, 1.082, 1.304, 1.734, 1.956, 2.386];
const SWG = [1, 0.42, 0.62, 0.42, 0.95, 0.42, 0.62, 0.42];

export function score(k) {
  // ---- custom voices (adapted from the verified big-shedding recipes) ----
  // Ride cymbal tick: short metallic noise burst, bandpass ~7 kHz.
  const ride = (t, g = 0.05) => k.at(t, () => {
    const n = k.noise(t, 0.1);
    const bp = k.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 7000; bp.Q.value = 1.4;
    const a = k.ac.createGain();
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    n.connect(bp).connect(a); k.out(a, 1, 0.12, 0.3);
  });
  // Wire brushes: slow noise swell, bandpass 5–8 kHz.
  const brush = (t, g = 0.05) => k.at(t, () => {
    const n = k.noise(t, 0.6);
    const bp = k.ac.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.setValueAtTime(5200, t); bp.frequency.linearRampToValueAtTime(7600, t + 0.5); bp.Q.value = 0.9;
    const a = k.ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.15);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    n.connect(bp).connect(a); k.out(a, 1, 0.1, -0.2);
  });
  // Muted Harmon-style trumpet: saw + detuned square, bandpass ~1.3 kHz, late vibrato.
  const trumpet = (t, midi, dur, { g = 0.11, send = 0.3, pan = -0.12 } = {}) => k.at(t, () => {
    const f0 = k.hz(midi);
    const bp = k.ac.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1250, t); bp.frequency.linearRampToValueAtTime(1450, t + dur); bp.Q.value = 2;
    const o1 = k.osc('sawtooth', f0, t, dur + 0.06);
    const o2 = k.osc('square', f0 * 1.004, t, dur + 0.06);
    const g2 = k.ac.createGain(); g2.gain.value = 0.35;
    o1.connect(bp); o2.connect(g2).connect(bp);
    const lfo = k.osc('sine', 5.5, t, dur + 0.06);
    const lg = k.ac.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(6, t + Math.max(0.3, dur * 0.6));
    lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune);
    const a = k.ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.03);
    a.gain.setValueAtTime(g * 0.92, t + Math.max(0.05, dur * 0.75));
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    bp.connect(a);
    k.out(a, 1, send, pan);
  });
  // Breathy tenor sax — the Cabald's voice: saw, opening lowpass, 5 Hz vibrato.
  const sax = (t, midi, dur, { g = 0.1, send = 0.34, pan = 0.14 } = {}) => k.at(t, () => {
    const f0 = k.hz(midi);
    const lp = k.ac.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(1600, t + dur * 0.7);
    lp.Q.value = 1.1;
    const o = k.osc('sawtooth', f0, t, dur + 0.2);
    const lfo = k.osc('sine', 5, t, dur + 0.2);
    const lg = k.ac.createGain();
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(7, t + dur * 0.5);
    lfo.connect(lg); lg.connect(o.detune);
    const a = k.ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.05);
    a.gain.setValueAtTime(g * 0.9, t + dur * 0.8);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
    o.connect(lp).connect(a);
    const n = k.noise(t, dur);
    const hp = k.ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3200;
    const na = k.ac.createGain(); na.gain.value = g * 0.1;
    n.connect(hp).connect(na);
    k.out(a, 1, send, pan); k.out(na, 1, send * 0.5, pan);
  });
  // Heel clicks on tile (her entrances).
  const heels = (t0, t1, g = 0.045) => {
    let i = 0;
    for (let tt = t0; tt < t1; tt += 0.32, i++) k.tick(tt, g * (i % 2 ? 0.7 : 1), 2500 + (i % 3) * 220);
  };

  // ---- texture beds ----
  k.rain(0.15, 74.9, 0.13);              // the storm, quits when the comb goes up
  k.rain(74.9, 78.4, 0.04);              // dying drip
  k.thunder(2.2, 0.42, 2.6);
  k.thunder(6.9, 0.34, 2.2);
  k.thunder(12.8, 0.22, 1.8);            // distant, over the office

  // ---- A. skyline titles (0–11): solo piano in the rain ----
  k.drone(0.3, 11, [38, 45], 0.035, 420);
  const pianoA = [[0.9, 50], [2.0, 53], [3.4, 57], [4.7, 64], [6.2, 62], [7.8, 60], [9.2, 57]];
  for (const [tt, m] of pianoA) k.piano(tt, m, 0.11, 3.4);

  // ---- B. the office (11–24): trio enters when she does ----
  const B0 = 13.2;
  for (let bt = B0; bt < 23.5; bt += BAR) {
    brush(bt, 0.045);
    for (let i = 0; i < 8; i++) ride(bt + SW8[i] + J(k), 0.05 * SWG[i]);
  }
  const walkB = [38, 41, 45, 48, 34, 38, 41, 45, 43, 46, 50, 43, 33, 37, 40, 45];
  for (let i = 0; i < walkB.length; i++) {
    const tt = B0 + i * BEAT;
    if (tt < 23.4) k.bass(tt + J(k), walkB[i], BEAT * 0.95, 0.14, 'triangle', 420);
  }
  // the motif, stated as she crosses the room
  const MOTIF = [[62, 0.5], [65, 0.5], [64, 0.75], [62, 1.25], [57, 2.0]];
  for (const at of [15.6, 19.0]) {
    let tt = at;
    for (const [mm, dd] of MOTIF) { trumpet(tt, mm, dd, {}); tt += dd; }
  }
  heels(15.1, 18.9, 0.04);
  k.piano(14.6, 50, 0.07, 1.6); k.piano(14.6, 53, 0.06, 1.6); k.piano(14.6, 57, 0.05, 1.6);

  // ---- C. the pitch (24–36): intimate, piano + bass + one bell ----
  for (const [tt, m] of [[24.6, 38], [27.1, 34], [29.7, 43], [32.3, 33]]) k.bass(tt, m, 1.9, 0.13, 'triangle', 380);
  for (const [tt, m] of [[25.2, 62], [26.6, 60], [28.0, 57], [31.2, 65], [32.8, 62]]) k.piano(tt, m, 0.1, 2.6);
  k.bell(30.6, 1174.7, 0.07, 1.6);       // the polaroid glint
  k.tick(33.92, 0.1, 5200);              // the retainer coin lands
  k.blip(33.92, 2600, 0.05, 0.09);
  k.riser(34.8, 36.0, 0.12);

  // ---- D. the streets (36–51): the band walks; the alley stops time ----
  const D0 = 36.4;
  for (let bt = D0; bt < 42.6; bt += BAR) {
    brush(bt, 0.05);
    for (let i = 0; i < 8; i++) ride(bt + SW8[i] + J(k), 0.052 * SWG[i]);
  }
  const walkD = [38, 41, 43, 45, 46, 45, 43, 41, 38, 41, 45, 48, 50, 48, 45, 41];
  for (let i = 0; i < walkD.length; i++) k.bass(D0 + i * BEAT + J(k), walkD[i], BEAT * 0.95, 0.15, 'triangle', 420);
  // tenor sax surveys the street
  const SAXP = [[37.4, 57, 0.6], [38.3, 60, 0.5], [39.1, 62, 0.9], [40.4, 60, 0.5], [41.0, 57, 0.6], [41.8, 55, 1.0]];
  for (const [tt, m, d] of SAXP) sax(tt, m, d, {});
  // stop-time face-off
  k.piano(42.9, 50, 0.08, 0.5); k.piano(42.9, 53, 0.07, 0.5); k.piano(42.9, 57, 0.06, 0.5);
  k.piano(44.0, 45, 0.08, 0.5); k.piano(44.0, 49, 0.07, 0.5); k.piano(44.0, 52, 0.06, 0.5);
  for (let tt = 44.8; tt < 47.1; tt += 0.5) k.tick(tt, 0.03, 1400);
  // PUNCH 1 — lands on the first frozen frame
  const TF1 = STREETS_CLOCK.abs(STREETS_EV.punch1);
  k.whoosh(TF1 - 0.2, 0.18, 0.3, 300, 1400);
  k.impact(TF1, 0.55, 46);
  k.kick(TF1, 0.46);
  k.crash(TF1 + 0.02, 0.14);
  // band flinches back in
  for (let bt = 48.0; bt < 50.4; bt += BEAT) ride(bt, 0.05);
  k.bass(48.0, 38, BEAT, 0.15, 'triangle', 420);
  k.bass(48.65, 41, BEAT, 0.15, 'triangle', 420);
  k.bass(49.3, 45, BEAT, 0.15, 'triangle', 420);
  const TF2 = STREETS_CLOCK.abs(STREETS_EV.counter);
  k.impact(TF2, 0.48, 46);
  k.crash(TF2 + 0.02, 0.12);

  // ---- E. the club (51–66): sparse lamp-lit tension, then the rip ----
  for (const [tt, m] of [[51.4, 38], [54.0, 34], [56.6, 38]]) k.bass(tt, m, 2.3, 0.13, 'triangle', 360);
  for (let tt = 51.4; tt < 61.6; tt += BEAT) k.hat(tt, 0.035, 0.05);
  k.piano(52.4, 50, 0.06, 1.2); k.piano(52.4, 53, 0.055, 1.2); k.piano(52.4, 57, 0.05, 1.2);
  k.piano(54.9, 50, 0.06, 1.2); k.piano(54.9, 56, 0.055, 1.2);
  k.braam(56.0, [38, 45], 2.6, 0.18, 0.7);   // the boss steps out of the dark
  heels(57.6, 59.7, 0.035);
  k.bell(59.9, 987.8, 0.05, 1.2);
  k.riser(61.4, 62.78, 0.2);
  // HARD SILENCE 62.3–62.8 — everything above cuts into it; nothing new sounds there.
  const TF3 = CLUB_CLOCK.abs(CLUB_EV.rip);   // 62.8 — the wig leaves her head
  k.sweepDown(TF3, 0.5, 3400, 260, 0.26, 'sawtooth'); // the rip itself
  k.impact(TF3 + 0.02, 0.58, 40);
  k.crash(TF3 + 0.04, 0.16);
  k.braam(TF3 + 0.06, [36, 43], 2.8, 0.23, 0.9);
  for (const tt of [63.4, 63.66, 64.2, 64.46, 65.0, 65.26]) k.heartbeat(tt, 0.4);
  k.taiko(65.3, 0.2, 62); k.taiko(65.6, 0.24, 62); k.taiko(65.85, 0.3, 62); k.taiko(66.0, 0.36, 62);

  // ---- F. rooftop (66–77): full band, the climb, the payoff ----
  const F0 = 66.2;
  for (let bt = F0; bt < 74.2; bt += BAR) {
    brush(bt, 0.05);
    for (let i = 0; i < 8; i++) ride(bt + SW8[i] + J(k), 0.055 * SWG[i]);
  }
  const walkF = [38, 41, 45, 48, 34, 38, 41, 45, 43, 46, 50, 53, 45, 49, 52, 55, 38, 41, 45, 48, 50, 48, 45, 41, 38, 41, 45, 48, 50, 52, 53, 55];
  for (let i = 0; i < walkF.length; i++) {
    const tt = F0 + i * BEAT;
    if (tt < 74.1) k.bass(tt + J(k), walkF[i], BEAT * 0.95, 0.15, 'triangle', 420);
  }
  const TF4 = ROOF_CLOCK.abs(ROOF_EV.upper); // 67.9 — the uppercut
  k.whoosh(TF4 - 0.18, 0.16, 0.28, 260, 1200);
  k.impact(TF4, 0.53, 46);
  k.crash(TF4 + 0.02, 0.15);
  // trumpet climbs to the payoff
  const CLIMB = [[69.0, 62, 0.6], [69.8, 65, 0.6], [70.6, 67, 0.5], [71.2, 69, 0.7], [72.0, 70, 0.5], [72.7, 69, 0.5]];
  for (const [tt, m, d] of CLIMB) trumpet(tt, m, d, { g: 0.1 });
  const TF5 = ROOF_CLOCK.abs(ROOF_EV.pile);  // 72.64 — the kingpin meets the tower
  k.impact(TF5, 0.42, 50);
  k.clunk(TF5 + 0.06, 0.4);
  k.sweepDown(TF5 + 0.3, 0.6, 880, 180, 0.14, 'triangle'); // the skid, played for laughs
  // THE COMB GOES UP — rain quits, the key turns major
  k.crash(74.6, 0.2);
  k.bell(74.6, 1174.7, 0.11, 2.4);
  k.pad(74.6, [50, 54, 57, 62], 2.8, 0.05, 1500, 0.5);
  k.bell(75.5, 880, 0.06, 1.8);

  // ---- G. coda (77–86): solo piano, paid in full ----
  for (const [tt, m] of [[77.6, 50], [78.4, 54], [79.2, 57], [80.0, 62], [81.0, 61], [81.6, 62]]) k.piano(tt, m, 0.1, 3.2);
  for (const m of [38, 50, 54, 57]) k.piano(82.4, m, 0.11, 3.6); // final D major, left hand under
  k.tick(84.6, 0.035, 1800);
  k.piano(85.0, 38, 0.07, 2.8);          // last low D under the end card
}
