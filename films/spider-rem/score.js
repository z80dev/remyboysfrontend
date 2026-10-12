// ==============================================================================================
// SPIDER-REM — "With Great Hair Comes Great Flow" — original score (Remy Boys, 90 s, 80 BPM)
// ==============================================================================================
// Cue sheet — 9 cues over SCORE_MAP (windows are REAL rt; beat 0.75 s, bar 3.00 s):
//
//  1. museumCurious  0–15    shy pizzicato field trip (bars 1–5), bells on bars 2/4; the SNAP at
//                            13.50 (filmT of the bite) takes the music with it — TOTAL SILENCE
//                            until the 15.0 riser.
//  2. transformBraam 15–21    riser 15→16.5; braam + sub + choir on the title slam 16.5; strand-
//                            rise plucks one per beat; thins to a single pad by 21.
//  3. mirrorWhimsy   21–24    soft pluck fragment 74/76/78; blip on the reflex THWIP 22.5; bell
//                            23.25 as the strand waves back.
//  4. suitFanfare    24–36    MOTIF STATEMENT #1 — pluck lead + soft brass chords, bars 24/27/30/33;
//                            kick+clap enter on bar 33; melody b3 (74) lands ON the yank 34.5.
//  5. swingDrive     36–51    MOTIF STATEMENT #2 octave UP (brass lead); kick b1/b3, clap b2/b4,
//                            hat 8ths; brass stabs on 36/39/42/45 (+ the 48 stab fused into the
//                            catch); whooshes at filmT(37.5/40.5/43.5); catch impact+taiko at
//                            filmT(48.0)=48.14; hush: heartbeat + crowd + piano echo 74 @ 49.5.
//  6. newsSting      51–57    paper whoosh 51.0; Dm brass stab + glass on the headline slam 52.5;
//                            drone 53.25→57; riser 55.5→57.
//  7. goblinMenace   57–69    detuned tritone drone [36,42] + glider flutter; braam 57.5; taiko
//                            singles 58.5/60; marching taiko 8ths from 63 (flake bombs); flow-
//                            sense 66–69 goes LOW-PASS: half-density ostinato [50,53,55,53],
//                            dark Dm strings pad, powder hiss 67.5, riser 67.9→69.0 punches out.
//  8. skyBattle      69–78    taiko EVERY beat (strong-weak-weak-medium); 8th-note string
//                            ostinato [50,53,55,53] (D minor); punch stab at filmT(70.5)=70.80;
//                            rising volley stabs at filmT(73.5/74.25/75.0); WRAP at
//                            filmT(76.5)=76.94 impact+sub+glass, then SILENCE through the 0.30
//                            freeze (→77.24); release whoosh 77.4, hero exit blip 77.7.
//  9. sunsetPayoff   78–89.5  MOTIF STATEMENT #3 — half-time, warm strings lead over strings/choir
//                            pads, bars 78/81/84/87; melody truncates: 78 @ 87.0, 74 @ 88.5 held
//                            to 89.5; tagline bloom 80.0; bell twinkle at filmT(86.25); solo
//                            celeste 74 @ 88.5; ALL OUT 89.5, room tone to 90.
//
// Beds: wind 36–69 (city altitude), faint crowd 0–51 split AROUND the bite silence.
// Discipline: every world-g event scheduled through filmT() — never hand-added delays; hit-stop
// windows stay silent; bass ≤ 0.28, pads ≤ 0.05 under leads; no randomness (no Math.random).
// ==============================================================================================
import { BEAT, BAR, D, SCORE_MAP, MOTIF, STOPS, filmT, GOBLIN, BOMBS, LAND_C, LOUSE, IRIS } from './timeline.js';

const S = Object.fromEntries(SCORE_MAP.map((s) => [s.name, s]));
const E8 = BEAT / 2;                          // 0.375 s — the eighth note
const BITE_REAL = filmT(STOPS[0].g);          // 13.50 — the SNAP; freeze starts, music dies
const CATCH_REAL = filmT(48.0);               // 48.14 — rescue catch lands at freeze START
const PUNCH_REAL = filmT(GOBLIN.contact.t);   // 70.80 — aerial punch at freeze START
const WRAP_REAL = filmT(76.5);                // 76.94 — money-shot cinch; freeze runs to 77.24

export function score(kit) {
  const { at, ac, osc, out, hz } = kit;

  // ---------------- custom voices (kit primitives only; brass per hairyweight verified shape) ---
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

  // Goblin drone: two detuned saws per note (tritone 36+42) + sub octave, slow swell in/out.
  const goblinDrone = (t0, t1, notes, g = 0.05, cut = 460) => at(t0, () => {
    const dur = t1 - t0;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 1.1; lp.frequency.value = cut;
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t0);
    a.gain.linearRampToValueAtTime(g, t0 + 1.2);
    a.gain.setValueAtTime(g, t1 - 1.0);
    a.gain.linearRampToValueAtTime(0.0001, t1);
    for (const m of notes) for (const det of [-11, 9]) {
      const w = osc('sawtooth', hz(m), t0, dur);
      w.detune.value = det;
      w.connect(lp);
    }
    const sb = osc('triangle', hz(notes[0] - 12), t0, dur);
    const sg = ac.createGain(); sg.gain.value = 0.5;
    sb.connect(sg).connect(lp);
    lp.connect(a);
    out(a, 1, 0.2, 0, 0.4);
  });

  // Web-strand fire: chirp + short air hump (paired with the picture's THWIP! slams).
  const thwip = (t, g = 0.09) => {
    kit.blip(t, 1500, g, 0.07, 'square');
    kit.whoosh(t, 0.16, g * 0.9, 700, 4200);
  };

  // Lead voices for the motif walker.
  const pluckLead = (t, m, dur, g) => kit.pluck(t, m, g, 3600, Math.max(0.2, dur), 'sawtooth');
  const brassLead = (t, m, dur, g) => brass(t, m, dur, g, { atk: 0.05, cut: 2600 });
  const strLead = (t, m, dur, g) => kit.strings(t, [m], Math.max(0.5, dur), g, 0.3, 0.35, 2400);

  // ---------------- motif walker: schedules MOTIF.bars on the bar grid from t0 ----------------
  // o.lead(t, midi, durSec, g) melody voice · o.chord(t, [roots], dur) harmony · o.oct shifts the
  // melody · o.beatGap seconds per melodic beat (BEAT straight, 2*BEAT half-time) · o.maxBeat
  // drops late beats in a bar · o.nBars bars played · o.capT hard end for tails · o.legato
  // scales note length (1.2 = warm overlap for strings).
  function motif(t0, o) {
    const { lead, g, chord = null, oct = 0, beatGap = BEAT, maxBeat = 4, nBars = 4, capT = Infinity, legato = 0.92 } = o;
    MOTIF.bars.slice(0, nBars).forEach((bar, i) => {
      const bt = t0 + i * BAR;
      if (chord) chord(bt, bar.chord, BAR * 0.94);
      for (const [beat, m, dBeats = 1] of bar.mel) {
        if (beat > maxBeat) continue;
        const t = bt + (beat - 1) * beatGap;
        const dur = Math.min(dBeats * beatGap * legato, capT - t);
        if (dur > 0.1) lead(t, m + oct, dur, g);
      }
    });
  }

  // ---------------- beds: faint street murmur 0–51 (split by the bite silence), altitude wind --
  kit.crowd(0, BITE_REAL, 0.03);                 // museum morning — dies WITH the music at 13.50
  kit.crowd(S.transformBraam.t0, S.swingDrive.t1, 0.035); // 15–51, back with the transform riser
  kit.wind(36, 69, 0.05, 400, 1600);             // city altitude under swing/battle; out by 69

  // ======================= CUE 1 museumCurious (0–15, bars 1–5) ================================
  {
    const T = S.museumCurious.t0;
    kit.pad(T + 0.75, [38, 45], 12, 0.045, 1100, 2.5);  // D drone under the pizzicato (audible bed)
    const piz = [50, 54, 57, 62];                       // D F# A D — curious pizzicato quarters
    for (let i = 0; T + 0.75 + i * BEAT < BITE_REAL - 0.4; i++) {
      kit.pluck(T + 0.75 + i * BEAT, piz[i % 4], 0.13, 3000, 0.24);
    }
    // bells on bars 2/4, plus the exhibit-case glint on beat 7.5
    for (const [t, m, g] of [[4.5, 86, 0.09], [7.5, 88, 0.07], [10.5, 86, 0.075], [11.25, 91, 0.065]]) {
      kit.bell(t, hz(m), g, 1.4);
    }
    // THE BITE — g 13.5 -> rt 13.50: impact + glass ON the snap; total silence follows.
    kit.impact(BITE_REAL, 0.85, 50);
    kit.taiko(BITE_REAL, 0.8, 55);
    kit.glass(BITE_REAL, 0.15, 1.3);
    // BITE_REAL + 0.14 .. 15.0 is deliberate dead silence — nothing scheduled here.
  }

  // ======================= CUE 2 transformBraam (15–21, bars 6–7) ==============================
  {
    kit.riser(S.transformBraam.t0, 16.5, 0.14);         // vertigo crawl into the title slam
    const T = 16.5;                                     // rt (pre-stop g == rt; title slams HERE)
    kit.braam(T, [38, 45], 2.5, 0.24, 1.0);             // the braam — SPIDER-REM slams ON this
    kit.sub(T, 0.45, 82, 30, 2.2);
    kit.choir(T, [62, 66, 69], 4.5, 0.035, 'a', 1.0, 1.5);    // awe, D major
    kit.strings(T, [38, 45, 50], 4.5, 0.032, 1.2, 1.2, 1300); // swell under the strand-rise
    [62, 66, 69, 74].forEach((m, i) => kit.pluck(T + i * BEAT, m, 0.038, 2400, 0.3)); // 1 strand/beat
    kit.pad(19.5, [38, 45], 1.5, 0.025, 700, 0.8);      // thin to one pad by 21
  }

  // ======================= CUE 3 mirrorWhimsy (21–24, bar 8) ===================================
  {
    for (const [t, m] of [[21.0, 74], [21.75, 76], [22.125, 78]]) kit.pluck(t, m, 0.055, 3000, 0.25);
    kit.blip(22.5, 1100, 0.06, 0.09);                   // the reflex THWIP (comedy)
    kit.hiss(22.5, 0.1, 0.035);                         // strand sizzle
    kit.bell(23.25, hz(81), 0.04, 1.4);                 // the strand waves back
  }

  // ======================= CUE 4 suitFanfare (24–36, bars 9–12) ================================
  // MOTIF STATEMENT #1 — pluck lead, one MOTIF bar per panel bar (24/27/30/33), capped at 36.
  {
    motif(24, {
      lead: pluckLead, g: 0.085, capT: 36,
      chord: (t, ch, dur) => brassChord(t, ch, dur, 0.055, { atk: 0.35, cut: 1500 }),
    });
    // bar 4 (33–36): the rhythm section sneaks in — legend building
    kit.kick(33, 0.4); kit.kick(34.5, 0.34);            // kick b1/b3
    kit.clap(33.75, 0.22); kit.clap(35.25, 0.24);       // clap b2/b4
    for (let i = 0; i < 8; i++) kit.hat(33 + i * E8, i % 2 ? 0.028 : 0.045);
    // panel gags: scissors snip (g 26.25 -> rt 26.39), lens glint 31.5, first THWIP 34.5 + yank 34.64
    kit.tick(26.39, 0.08, 3600); kit.tick(26.46, 0.06, 3200);
    kit.bell(31.5, hz(93), 0.026, 0.8);
    thwip(34.5, 0.09);                                  // motif b3 (74) lands ON this very beat
    kit.tick(34.64, 0.07, 2400);                        // the yank (rt; shake @ 34.64)
  }

  // ======================= CUE 5 swingDrive (36–51, bars 13–17) ================================
  {
    // MOTIF STATEMENT #2 — octave UP, brass lead, chords + rhythm drive; capped before the catch.
    motif(36, {
      lead: brassLead, g: 0.115, oct: 12, capT: 48.0,
      chord: (t, ch, dur) => brassChord(t, [ch[0], ch[1], ch[0] + 12], dur, 0.07, { atk: 0.2 }),
    });
    for (let b = 0; b < 4; b++) {                       // bars 36/39/42/45
      const t0 = 36 + b * BAR;
      const root = MOTIF.bars[b].chord[0] - 12;         // D B G A lows
      kit.bass(t0, root, 1.35, 0.26);                   // b1 (bass <= 0.28)
      kit.bass(t0 + 2 * BEAT, root, 1.2, 0.24);         // b3
      kit.kick(t0, 0.42); kit.kick(t0 + 2 * BEAT, 0.34);
      kit.clap(t0 + BEAT, 0.26); kit.clap(t0 + 3 * BEAT, 0.28);
      for (let i = 0; i < 8; i++) kit.hat(t0 + i * E8, i % 2 ? 0.03 : 0.05);
    }
    // brass stabs on every bar line 36/39/42/45; the 48 stab is fused into the catch below
    for (let b = 0; b < 4; b++) {
      const ch = MOTIF.bars[b].chord;
      brassChord(36 + b * BAR, [ch[0], ch[1], ch[0] + 12], 0.6, 0.1, { atk: 0.03, rel: 0.12 });
    }
    // one whoosh per arc bottom (mid-bar, g 37.5/40.5/43.5), release + rooftop roll off leg C
    for (const gT of [37.5, 40.5, 43.5]) kit.whoosh(filmT(gT), 0.7, 0.16, 280, 2600);
    kit.whoosh(filmT(44.25), 0.4, 0.08, 400, 2800);     // release flight
    kit.clunk(filmT(LAND_C.land), 0.16);                // land-and-roll
    kit.riser(filmT(46.6), CATCH_REAL, 0.09);           // the headfirst dive (g 46.6–48.0)
    // THE CATCH — g 48.0 -> rt 48.14, freeze START: sting, then the air goes still.
    kit.impact(CATCH_REAL, 0.8, 50);
    kit.taiko(CATCH_REAL, 0.85, 55);
    brassChord(CATCH_REAL, [45, 52, 57], 1.0, 0.09, { atk: 0.02, rel: 0.2 }); // bar-48 stab, fused
    // hush 48.9–51: heartbeat + crowd bed + one warm piano echo of motif bar 1.
    kit.heartbeat(49.0, 0.4);
    kit.heartbeat(50.3, 0.45);
    kit.piano(49.5, 74, 0.13, 3);
  }

  // ======================= CUE 6 newsSting (51–57, bars 18–19) =================================
  {
    kit.whoosh(51.0, 1.1, 0.12, 180, 1600);             // The Daily Flow page-spin
    kit.impact(52.5, 0.35, 58);                         // paper slams flat (shake @ 52.5)
    brassChord(52.5, [38, 41, 45], 0.8, 0.13, { atk: 0.02, rel: 0.12 }); // Dm sting on the headline
    kit.glass(52.5, 0.12, 1.0);                         // ink glint
    kit.drone(53.25, 57, [36], 0.04, 420);              // menace creeping under the print
    kit.riser(55.5, 57.0, 0.1);                         // into the villain cue
  }

  // ======================= CUE 7 goblinMenace (57–69, bars 20–23) ==============================
  {
    goblinDrone(57, 66.2, [36, 42], 0.05, 460);         // detuned tritone saws — the Goblin
    kit.flutter(57.5, 66.0, 0.045);                     // flake-glider engine snarl
    kit.braam(57.5, [36, 42], 2.0, 0.2, 0.8);           // he crests the skyline
    kit.taiko(58.5, 0.5, 58); kit.taiko(60.0, 0.5, 58); // under the villain lower-third
    for (let i = 0; i < 4; i++) kit.tick(60.75 + i * E8, 0.032, 2600); // bored finger drums
    for (let i = 0; i < 8; i++) {                       // marching taiko 8ths from 63.0 (bombs)
      kit.taiko(63.0 + i * E8, i % 2 ? 0.3 : 0.55, i % 2 ? 74 : 62);
    }
    for (const b of BOMBS) kit.whoosh(filmT(b.g0), 0.5, 0.1, 500, 2200); // bomb lobs, via filmT
    // flow-sense 66–69: LOW-PASS feel — thin muffled texture, half-density ostinato
    for (let i = 0; i < 4; i++) kit.pluck(66 + i * BEAT, [50, 53, 55, 53][i], 0.045, 900, 0.3);
    kit.strings(66, [36, 43, 48], 3, 0.03, 0.8, 1.0, 900); // dark Dm pad
    kit.hiss(67.5, 0.5, 0.045);                         // FLAKE-POW powder puff (near miss)
    kit.riser(67.9, 69.0, 0.14);                        // punches out of the slow-mo
  }

  // ======================= CUE 8 skyBattle (69–78, bars 24–26) =================================
  {
    kit.crash(69, 0.16);                                // snap back to full speed and colour
    const ACC = [0.85, 0.4, 0.4, 0.6];                  // strong–weak–weak–medium per beat
    for (let i = 0; 69 + i * BEAT <= 76.5; i++) {       // taiko EVERY beat until the wrap
      kit.taiko(69 + i * BEAT, ACC[i % 4], i % 4 ? 74 : 62);
    }
    for (let i = 0; 69 + i * E8 < 76.7; i++) {          // 8th-note string ostinato, D minor
      kit.pluck(69 + i * E8, [50, 53, 55, 53][i % 4], 0.05, 2200, 0.16);
    }
    kit.bass(69, 38, 2.8, 0.26); kit.bass(72, 38, 2.8, 0.26); kit.bass(75, 38, 1.35, 0.26);
    // AERIAL PUNCH — g 70.5 -> rt 70.80, freeze START: stab + body hits
    kit.impact(PUNCH_REAL, 0.85, 52);
    kit.taiko(PUNCH_REAL, 0.9, 52);
    brassChord(PUNCH_REAL, [38, 45, 50], 0.9, 0.14, { atk: 0.02, rel: 0.14 });
    // THE VOLLEY — three THWIPs on g 73.5/74.25/75.0, brass rising with each pin
    const VOL_STABS = [[45, 50], [47, 52], [50, 57]];
    GOBLIN.volleyG.forEach((gT, i) => {
      const t = filmT(gT);
      thwip(t, 0.09);
      brassChord(t, VOL_STABS[i], 0.5, 0.13, { atk: 0.02, rel: 0.1 });
    });
    // WRAP FINISH — g 76.5 -> rt 76.94, the BIG freeze: slam, then silence through 77.24.
    kit.impact(WRAP_REAL, 0.9, 46);
    kit.sub(WRAP_REAL, 0.5, 80, 26, 1.5);
    kit.glass(WRAP_REAL, 0.18, 1.2);
    // 77.24..77.4 silent — then the release.
    kit.whoosh(GOBLIN.boing, 0.5, 0.2, 200, 2200);      // the cocoon boings
    kit.blip(77.7, 900, 0.055, 0.09);                   // hero thwips away
  }

  // ======================= CUE 9 sunsetPayoff (78–89.5, bars 27–30) ============================
  {
    // MOTIF STATEMENT #3 — half-time, warm strings lead over strings/choir pads, bars 78/81/84.
    const warmChord = (t, ch, dur) => {
      kit.strings(t, [ch[0], ch[1], ch[0] + 12], dur, 0.04, 0.9, 1.2, 1600);
      kit.choir(t, [ch[0] + 12, ch[1] + 12, ch[0] + 24], dur, 0.03, 'a', 1.0, 1.4);
      kit.bass(t, ch[0] - 12, dur * 0.95, 0.2, 'triangle', 400);
    };
    motif(78, {
      lead: strLead, g: 0.05, chord: warmChord, beatGap: BEAT * 2, maxBeat: 2, nBars: 3,
      capT: IRIS.t0, legato: 1.2,
    });
    // bar 4 (87) truncates per the cue sheet: 78 @ 87.0, then 74 @ 88.5 HELD to 89.5 (pickup out)
    warmChord(87, MOTIF.bars[3].chord, 2.4);
    strLead(87.0, 78, 2.0, 0.05);
    strLead(88.5, 74, 0.8, 0.05);
    // tagline card 80.0: one warm D-major bloom under "WITH GREAT HAIR COMES GREAT FLOW"
    brassChord(80.0, [38, 45, 50, 57], 2.6, 0.055, { atk: 0.6, cut: 1400 });
    // the louse SALUTES — g 86.25 -> rt 86.99: bell twinkle, then solo celeste D5 @ 88.5
    kit.bell(filmT(LOUSE.saluteG), hz(93), 0.055, 1.8);
    kit.bell(filmT(LOUSE.saluteG) + 0.12, hz(98), 0.035, 1.4);
    kit.bell(88.5, hz(74), 0.05, 1.6);                  // celeste D5 — last note of the film
    kit.wind(89.5, D, 0.03, 300, 800);                  // room tone to black
    // ALL OUT 89.5 — nothing scheduled past the iris.
  }
}

export default score;
