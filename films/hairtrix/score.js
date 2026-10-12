// THE HAIRTRIX — score.js (composer owns this file only). Dark propulsive ELECTRONIC, 92 s.
// Original motifs only — no Matrix themes, no Rob Dougan melody, no recognizable interpolation.
//
// TIMING LAW: every cue is scheduled from timeline.js — filmT(g) for world events, FREEZES.*.film1
// for freeze resumes, barStart/beatT for the music grid, EV_FILM_KEYS via evFilm (already film
// seconds). Nothing re-types a number the timeline owns. Impacts land at the START of their
// freeze = filmT(STOP.g); a scored hard silence (SILENCES) immediately precedes dojoHit / trainClip
// / volleyFreeze and NOTHING onsets inside those windows (inSilence guard below).
//
// BULLET-TIME LAW (55.0–63.0, FREEZES.bullet): the world hangs, so the score hangs with it.
// The ONLY cues inside the window are the designed freeze bed — held sub + air + the slow orbit
// siren peaking at the half-sweep (film 59.1) + the weightless motif statement + the big riser
// that resolves AT the resume (63.0), where the full band slams back. No drums, no pulses, no
// forward motion inside the freeze.
//
// MOTIFS (both original):
//   FOLLICLE(r) — rising minor-pentatonic seed [0, +3, +5, +7, +10] (E4 G4 A4 B4 D5 at r=64).
//     The Comb-One's theme: hidden in the terminal rain, arpeggio engine of the dojo/lobby,
//     weightless bell statement at the bullet-time half-sweep, triumphant fanfare (+5, A) at the
//     end card, resolving to A MAJOR (C#) — the key change up and the intentional end.
//   CABALD(r) — menace seed [0, −1, −6] (E2 Eb2 Bb1 at r=40): semitone drop + tritone drop.
//     Title braam, "THE HAIRTRIX HAS YOU" sting, wall-in on the roof, subway drone (E/Bb).
//
// LOUDNESS STAGING (binding, from the hairpera QA lessons): the mix is staged so that after the
// renderer's peak normalization to −1 dBFS the integrated loudness lands ≈ −13 ± 1 LUFS with
// true peak ≤ −1.5 dBTP:
//   • Broad body carries the loudness: bass beds 0.18–0.24, pulse arps 0.07–0.13, pads/choir
//     0.04–0.065, drones 0.05–0.08, kick 0.3–0.5. Dense 120 BPM sections (dojo→payoff) are the
//     loudness engine.
//   • True-peak holders are capped: impacts ≤ 0.85 (train), braams ≤ 0.26, gunshots peak-clipped
//     at ±0.5 inside the baked PCM, sub drops ≤ 0.4 — sustained body sits ≥ 6 dB under impacts.
//   • CLICK LAW: the shared kit noise buffer is never played raw. EVERY noise-based sound here is
//     baked (mkNoiseBaked) with its attack/hold/release envelope in the PCM and clipped to ±0.5 —
//     no fade-in can be defeated by a near-full-scale first sample. Exponential ramps only to
//     positive endpoints. No raw oscillator is ever connected straight to the bus.
//
// AUDIO SUGGEST for film.js (builder owns audio config): see AUDIO_SUGGEST below
//   { seed: 36036, reverb: 1.3, reverbShape: 2.6, reverbGain: 0.3, lufs: -14 }
//   (tight industrial room: short dense tail, modest send).
import {
  DUR, BAR, BEAT, barStart, filmT, evFilm,
  FREEZES, SILENCES, ORBIT,
  TERMINAL_EV, CONTACT_EV, CONSTRUCT_EV, TRAINING_EV, JUMPPROG_EV, ROOFTOP_EV,
  LOBBY_EV, SUBWAY_EV, PAYOFF_EV,
  WAVE, VOLLEY,
} from './timeline.js';

export const AUDIO_SUGGEST = { seed: 36036, reverb: 1.3, reverbShape: 2.6, reverbGain: 0.3, lufs: -14 };

// ---- motif tables (MIDI) ---------------------------------------------------------------------
const FOLLICLE = (r) => [r, r + 3, r + 5, r + 7, r + 10];   // rising pentatonic seed
const CABALD = (r) => [r, r - 1, r - 6];                    // semitone drop + tritone drop

// ---- deterministic randomness (no Math.random; hash/LCG — call-order independent) ------------
const H = (n) => {                     // integer hash → [0,1)
  let x = (n | 0) + 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};
const lcg = (s) => () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;

export function score(kit) {
  const { ac, osc, hz } = kit;
  const engineAt = kit.at;   // the renderer's queue: [t, fn] pushed here, sorted ONCE, flushed in time order

  // ---- film-time constants (EVERY number derived from timeline.js) ----------------------------
  const T = {
    // terminal (world g = film t before the first stop)
    crtOn: filmT(TERMINAL_EV.crtOn), wakeUp: filmT(TERMINAL_EV.wakeUp),
    hareLine: filmT(TERMINAL_EV.hareLine), rainStorm: filmT(TERMINAL_EV.rainStorm),
    titleSlam: filmT(TERMINAL_EV.titleSlam), glitchOut: filmT(TERMINAL_EV.glitchOut),
    cutOut: filmT(TERMINAL_EV.cutOut),
    // contact
    deskGlitch: filmT(CONTACT_EV.deskGlitch), whisper: filmT(CONTACT_EV.screenWhisper),
    boothBlack: filmT(CONTACT_EV.boothBlack), underpassIn: filmT(CONTACT_EV.underpassIn),
    mousseIn: filmT(CONTACT_EV.mousseIn), hasYou: filmT(CONTACT_EV.hasYou),
    carDoor: filmT(CONTACT_EV.carDoor), cutWhite: filmT(CONTACT_EV.cutWhite),
    // construct
    whiteIn: filmT(CONSTRUCT_EV.whiteIn), pills: filmT(CONSTRUCT_EV.pillsOffered),
    reach: filmT(CONSTRUCT_EV.choiceReach), redTaken: filmT(CONSTRUCT_EV.redTaken),
    blueFade: filmT(CONSTRUCT_EV.blueFade), mirrorLiquid: filmT(CONSTRUCT_EV.mirrorLiquid),
    mirrorBreak: filmT(CONSTRUCT_EV.mirrorBreak), podFall: filmT(CONSTRUCT_EV.podFall),
    podWake: filmT(CONSTRUCT_EV.podWake), podsWide: filmT(CONSTRUCT_EV.podsWide),
    hoverIn: filmT(CONSTRUCT_EV.hoverIn), welcome: filmT(CONSTRUCT_EV.welcomeSay),
    whiteOut: filmT(CONSTRUCT_EV.whiteOutEv),
    // training / jump
    dojoIn: filmT(TRAINING_EV.dojoIn), sparStart: filmT(TRAINING_EV.sparStart),
    combo1: filmT(TRAINING_EV.combo1), dojoHit: filmT(TRAINING_EV.dojoHit),
    recoil: filmT(TRAINING_EV.recoil), combRaise: filmT(TRAINING_EV.combRaise),
    combBend: filmT(TRAINING_EV.combBend), cutRoof: filmT(TRAINING_EV.cutRoof),
    jumpCut: filmT(JUMPPROG_EV.jumpCut), runUp: filmT(JUMPPROG_EV.runUp),
    apex: filmT(JUMPPROG_EV.jumpApex), land: filmT(JUMPPROG_EV.jumpLand),
    // roof
    roofIn: filmT(ROOFTOP_EV.roofIn), wallIn: filmT(ROOFTOP_EV.wallIn),
    smirk: filmT(ROOFTOP_EV.smirkFront), waveAim: filmT(ROOFTOP_EV.waveAim),
    waveFire: filmT(ROOFTOP_EV.waveFire),
    // bullet time (FREEZES are law for the window; orbit cam from ORBIT)
    bt0: FREEZES.bullet.film0, bt1: FREEZES.bullet.film1,
    orbit0: ORBIT.cam0, orbit1: ORBIT.cam1,
    halfSweep: ORBIT.cam0 + (ORBIT.cam1 - ORBIT.cam0) / 2,     // 59.1 — motif peak
    snapUp: evFilm('snapUp'), whipPast: evFilm('whipPast'),
    dodgeSettle: evFilm('dodgeSettle'), parapetChew: evFilm('parapetChew'),
    // lobby
    lobbyIn: filmT(LOBBY_EV.lobbyEntry), deskLine: filmT(LOBBY_EV.deskLine),
    pillar1: filmT(LOBBY_EV.pillarHit1), crossFire: filmT(LOBBY_EV.crossFire),
    cartwheel: filmT(LOBBY_EV.cartwheel), cartLand: filmT(LOBBY_EV.cartwheelLand),
    pillar2: filmT(LOBBY_EV.pillarHit2), pillar3: filmT(LOBBY_EV.pillarHit3),
    stairSprint: filmT(LOBBY_EV.stairSprint), exitCut: filmT(LOBBY_EV.lobbyExitCut),
    // subway
    subwayIn: filmT(SUBWAY_EV.subwayArrival), standoff: filmT(SUBWAY_EV.platformStandoff),
    clippers: filmT(SUBWAY_EV.clippersSay), shades: filmT(SUBWAY_EV.shadesOff),
    dash: filmT(SUBWAY_EV.duelDash), grapple: filmT(SUBWAY_EV.grapple),
    train: filmT(SUBWAY_EV.trainClip), expressClear: filmT(SUBWAY_EV.expressClear),
    localStops: filmT(SUBWAY_EV.localStops), doors: filmT(SUBWAY_EV.doorsOpen),
    reskin: filmT(SUBWAY_EV.reskinReveal), narrowEyes: filmT(SUBWAY_EV.narrowEyes),
    // payoff
    swarmIn: filmT(PAYOFF_EV.swarmIn), swarmFire: filmT(PAYOFF_EV.swarmFire),
    volleyFz: FREEZES.volley.film0, volleyDrop: FREEZES.volley.film1,
    pluck: evFilm('pluckBullet'), brass: filmT(PAYOFF_EV.brassClatter),
    crouch: filmT(PAYOFF_EV.crouch), liftoff: filmT(PAYOFF_EV.liftoff),
    endcard: filmT(PAYOFF_EV.endcard), fadeOut: filmT(PAYOFF_EV.fadeOut),
  };
  // per-bullet pan from the timeline's muzzle tables: stage x (0..960) → pan (−0.8..+0.8)
  const wavePan = (x) => (x / 960) * 1.6 - 0.8;

  // ---- hard silences are LAW: nothing onsets inside a scored silence window -------------------
  const inSilence = (t) => SILENCES.some(s => t >= s.from - 1e-6 && t < s.to - 1e-6);
  // kit.at() invokes its callback with NO arguments, so the time must be closed over — the
  // wrapper below hands t back to the cue body at event time. Finite guard keeps a NaN time
  // (a typo'd clock) from becoming an unsortable dead event.
  //
  // NESTED-REGISTRATION LAW (real-engine fix): renderScore sorts kit.events ONCE, then flushes
  // strictly in time order, creating nodes one window ahead of playback. Every voice below
  // registers its own nodes through at()/cue() (the kit's deferred instruments likewise), so a
  // voice called from inside another event body was APPENDED behind the sorted prefix — reached
  // only by the final flush, where start(t) was already in the past: the cue never sounded. The
  // composer harness ran callbacks inline, so the nesting passed there and broke only on the
  // real engine (draft: spar groove, jumpprog hits, the 63.0 resume slam, the whole lobby engine
  // + exchange fire, and the subway pulse were all silent). While an event body is executing we
  // therefore run nested registrations IMMEDIATELY and drain anything the kit's instruments
  // appended, so their nodes are created inside the current flush window with start(t) still
  // future — every cue sounds exactly at its film time. Determinism is unchanged: outer events
  // still fire in the engine's sorted order; nesting executes inside it.
  let executing = false;
  const at = (t, fn) => {
    if (!Number.isFinite(t)) return;
    if (executing) { fn(); return; }
    const n0 = kit.events.length;
    engineAt(t, () => {
      const was = executing;
      executing = true;
      try {
        fn();
        while (kit.events.length > n0) {           // drain kit-instrument registrations too
          const batch = kit.events.splice(n0);
          for (const [, nested] of batch) nested();
        }
      } finally {
        executing = was;
      }
    });
  };
  const cue = (t, fn) => { if (Number.isFinite(t) && !inSilence(t)) at(t, () => fn(t)); };

  // =========================== noise: baked PCM only (CLICK LAW) ================================
  // mkNoiseBaked (proven hairpera pattern): the envelope lives IN the buffer, peak-clipped at
  // ±clip. No shared-buffer onset can ever click through a fade-in.
  const mkNoiseBaked = (t, dur, peak, { atk = 0.004, hold = 0.6, fadeOut = 0.08, mod = null, seed = 7, clip = 0.5 } = {}) => {
    const sr = ac.sampleRate || 48000;
    const len = Math.max(1, Math.ceil(sr * dur));
    const buf = ac.createBuffer(1, len, sr);
    const ch = buf.getChannelData(0);
    const r = lcg((seed * 2654435761) >>> 0);
    const atkS = Math.max(1, atk * sr), holdS = hold * len, tailS = Math.max(1, fadeOut * sr);
    for (let i = 0; i < len; i++) {
      let a = Math.min(1, i / atkS);
      if (i > holdS) a *= Math.exp(-4.5 * (i - holdS) / Math.max(1, len - holdS));
      if (len - i < tailS) a *= (len - i) / tailS;
      if (mod) a *= mod(i / sr);
      const v = (r() * 2 - 1) * 0.9;
      ch[i] = (v > clip ? clip : v < -clip ? -clip : v) * a * peak;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.start(t);
    src.stop(t + dur + 0.02);
    return src;
  };

  // ---- retro pulse voice (proven pattern): cached periodic waves, 12.5/25/50% duty -------------
  const waves = {};
  const pulseWave = (duty) => {
    if (waves[duty]) return waves[duty];
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty);
      im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.sin(k * Math.PI * duty);
    }
    return (waves[duty] = ac.createPeriodicWave(re, im));
  };
  const pulse = (t, m, dur, { duty = 0.25, g = 0.12, pan = 0, to = null, send = 0.06 } = {}) => cue(t, () => {
    const o = osc('square', hz(m), t, dur + 0.02);
    o.setPeriodicWave(pulseWave(duty));
    if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.setValueAtTime(g, t + Math.max(0.005, dur - 0.012));
    a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(a);
    kit.out(a, 1, send, pan);
  });

  // triangle bass (~0.2 in THIS voice, per the skill)
  const tri = (t, m, dur, { g = 0.2, to = null, pan = 0, send = 0.03 } = {}) => cue(t, () => {
    const o = osc('triangle', hz(m), t, dur + 0.02);
    if (to != null) o.frequency.exponentialRampToValueAtTime(hz(to), t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.setValueAtTime(g, t + Math.max(0.005, dur - 0.015));
    a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(a);
    kit.out(a, 1, send, pan);
  });

  // FM industrial stab: carrier oscillators frequency-modulated by faster sines
  const fmStab = (t, ms, dur = 0.16, { g = 0.09, ratio = 2.01, index = 1.8, pan = 0, send = 0.12, type = 'square' } = {}) => cue(t, () => {
    const bus = ac.createGain();
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.linearRampToValueAtTime(g, t + 0.004);
    bus.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;
    for (const m of ms) {
      const car = osc(type, hz(m), t, dur + 0.03);
      const mod = osc('sine', hz(m) * ratio, t, dur + 0.03);
      const mg = ac.createGain(); mg.gain.value = hz(m) * index * 0.01;
      mod.connect(mg); mg.connect(car.frequency);
      car.connect(lp);
    }
    lp.connect(bus);
    kit.out(bus, 1, send, pan);
  });

  // ---- baked noise voices ---------------------------------------------------------------------
  const hatN = (t, g = 0.04, open = false, pan = 0) => at(t, () => {
    const dur = open ? 0.16 : 0.045;
    const n = mkNoiseBaked(t, dur, g, { atk: 0.001, hold: 0.12, fadeOut: 0.01, seed: 11 });
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8200;
    const bus = ac.createGain(); bus.gain.value = 1;
    n.connect(hp).connect(bus);
    kit.out(bus, 1, 0.03, pan);
  });
  const snareN = (t, g = 0.12, pan = 0) => at(t, () => {
    const n = mkNoiseBaked(t, 0.16, g, { atk: 0.001, hold: 0.06, seed: 23 });
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.8;
    const bus = ac.createGain(); bus.gain.value = 1;
    n.connect(bp).connect(bus);
    const o = osc('triangle', 196, t, 0.1);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(g * 0.55, t + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    o.connect(og).connect(bus);
    kit.out(bus, 1, 0.08, pan);
  });
  const crashN = (t, g = 0.15, seed = 31) => at(t, () => {
    const n = mkNoiseBaked(t, 2.0, g, { atk: 0.002, hold: 0.1, seed });
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5200;
    const bus = ac.createGain(); bus.gain.value = 1;
    n.connect(hp).connect(bus);
    kit.out(bus, 1, 0.3, (H(seed) - 0.5) * 0.5);
  });
  const kickD = (t, g = 0.42) => at(t, () => {
    const o = osc('sine', 150, t, 0.3);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.002);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(a);
    kit.out(a, 1, 0.02);
    const n = mkNoiseBaked(t, 0.02, g * 0.3, { atk: 0.001, hold: 0.2, fadeOut: 0.005, seed: 41 });
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    const nb = ac.createGain(); nb.gain.value = 1;
    n.connect(hp).connect(nb);
    kit.out(nb, 1, 0);
  });
  const riserN = (t0, t1, g = 0.15, seed = 53) => cue(t0, () => {
    const dur = t1 - t0;
    const bus = ac.createGain(); bus.gain.value = 1;
    const n = mkNoiseBaked(t0, dur, g * 0.75, { atk: dur * 0.85, hold: 1.0, fadeOut: 0.03, seed });
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(7000, t1);
    n.connect(bp).connect(bus);
    const o = osc('sawtooth', 110, t0, dur + 0.05);
    o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(880, t1);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.linearRampToValueAtTime(g * 0.3, t0 + dur * 0.85);
    og.gain.linearRampToValueAtTime(0.0001, t1);
    const olp = ac.createBiquadFilter(); olp.type = 'lowpass'; olp.Q.value = 1;
    olp.frequency.setValueAtTime(400, t0); olp.frequency.exponentialRampToValueAtTime(5000, t1);
    o.connect(olp).connect(og).connect(bus);
    kit.out(bus, 1, 0.22, 0);
  });
  const windBed = (t0, t1, g = 0.05, f0 = 300, f1 = 900, seed = 61) => cue(t0, () => {
    const n = mkNoiseBaked(t0, t1 - t0, g, { atk: Math.min(1.2, (t1 - t0) * 0.25), hold: 0.8, fadeOut: 0.25,
      mod: (ts) => 0.72 + 0.28 * Math.sin(2 * Math.PI * 0.21 * ts + H(seed) * 6), seed });
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.6;
    bp.frequency.setValueAtTime(f0, t0); bp.frequency.linearRampToValueAtTime(f1, t1);
    const bus = ac.createGain(); bus.gain.value = 1;
    n.connect(bp).connect(bus);
    kit.out(bus, 1, 0.3, 0, 0.6);
  });
  const airBed = (t0, t1, g = 0.035, seed = 71) => cue(t0, () => {
    const n = mkNoiseBaked(t0, t1 - t0, g, { atk: 0.5, hold: 0.92, fadeOut: 0.06,
      mod: (ts) => 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.13 * ts), seed });
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 480;
    const bus = ac.createGain(); bus.gain.value = 1;
    n.connect(lp).connect(bus);
    kit.out(bus, 1, 0.35, 0, 0.7);
  });
  const swellN = (t0, t1, g = 0.09, f0 = 400, f1 = 6000, seed = 83) => cue(t0, () => {
    const n = mkNoiseBaked(t0, t1 - t0, g, { atk: (t1 - t0) * 0.95, hold: 1.0, fadeOut: 0.02, seed });
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(f0, t0); lp.frequency.exponentialRampToValueAtTime(f1, t1);
    const bus = ac.createGain(); bus.gain.value = 1;
    n.connect(lp).connect(bus);
    kit.out(bus, 1, 0.3, 0, 0.5);
  });
  const whooshN = (t, dur = 0.5, g = 0.1, f0 = 300, f1 = 3000, pan = 0, seed = 97) => cue(t, () => {
    const n = mkNoiseBaked(t, dur, g, { atk: dur * 0.4, hold: 0.55, fadeOut: 0.08, seed });
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.3;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    bp.frequency.exponentialRampToValueAtTime(f0, t + dur);
    const bus = ac.createGain(); bus.gain.value = 1;
    n.connect(bp).connect(bus);
    kit.out(bus, 1, 0.2, pan);
  });
  const sweepN = (t, dur, g, f0, f1, type = 'bandpass', q = 1, seed = 103) => at(t, () => {
    const n = mkNoiseBaked(t, dur, g, { atk: Math.min(0.05, dur * 0.3), hold: 0.6, fadeOut: 0.08, seed });
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const bus = ac.createGain(); bus.gain.value = 1;
    n.connect(f).connect(bus);
    kit.out(bus, 1, 0.2, 0);
  });

  // GUNSHOT: crack + body + thump, all baked/enveloped, peak-clipped at ±0.5 in the PCM.
  const shot = (t, seed, pan = 0, g = 0.42) => at(t, () => {
    const bus = ac.createGain(); bus.gain.value = 1;
    const crack = mkNoiseBaked(t, 0.09, g * 0.85, { atk: 0.001, hold: 0.04, fadeOut: 0.01, seed });
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
    crack.connect(hp).connect(bus);
    const body = mkNoiseBaked(t, 0.3, g, { atk: 0.001, hold: 0.15, fadeOut: 0.06, seed: seed + 1 });
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1;
    lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(320, t + 0.28);
    body.connect(lp).connect(bus);
    const o = osc('sine', 130, t, 0.18);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.14);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(g * 0.8, t + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(og).connect(bus);
    kit.out(bus, 1, 0.18, pan);
  });

  // stone / marble impact: low thud + gravel chunks + dust
  const stone = (t, g = 0.18, { chunks = 5, seed = 127, f = 52 } = {}) => at(t, () => {
    const bus = ac.createGain(); bus.gain.value = 1;
    const o = osc('sine', f * 2.2, t, 0.5);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(g, t + 0.003);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(og).connect(bus);
    const rumble = mkNoiseBaked(t, 0.42, g * 0.6, { atk: 0.002, hold: 0.2, fadeOut: 0.1, seed });
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    rumble.connect(lp).connect(bus);
    for (let i = 0; i < chunks; i++) {
      const tt = t + 0.02 + H(seed + i * 7) * 0.3;
      const c = mkNoiseBaked(tt, 0.06, g * (0.3 + H(seed + i * 13) * 0.4), { atk: 0.001, hold: 0.1, fadeOut: 0.01, seed: seed + i });
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
      bp.frequency.value = 700 + H(seed + i * 3) * 1100;
      const cb = ac.createGain(); cb.gain.value = 1;
      c.connect(bp).connect(cb);
      kit.out(cb, 1, 0.15, (H(seed + i * 17) - 0.5) * 1.2);
    }
    kit.out(bus, 1, 0.2, 0);
  });

  // glass: high sine cluster + bright noise burst (mirror break, doors)
  const glassN = (t, g = 0.16, spread = 0.7, seed = 151) => at(t, () => {
    const bus = ac.createGain(); bus.gain.value = 1;
    const n = mkNoiseBaked(t, 0.4, g * 0.8, { atk: 0.001, hold: 0.08, fadeOut: 0.1, seed });
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
    n.connect(hp).connect(bus);
    for (let i = 0; i < 5; i++) {
      const tt = t + H(seed + i * 5) * spread;
      const f = 2200 + H(seed + i * 11) * 4200;
      const o = osc('sine', f, tt, 0.8);
      const og = ac.createGain();
      og.gain.setValueAtTime(0.0001, tt);
      og.gain.linearRampToValueAtTime(g * 0.06, tt + 0.002);
      og.gain.exponentialRampToValueAtTime(0.0001, tt + 0.5 + H(seed + i) * 0.4);
      o.connect(og).connect(bus);
    }
    kit.out(bus, 1, 0.35, (H(seed) - 0.5) * 0.8);
  });

  // train roar: layered rumble + bandpass sweep, deterministic
  const roarN = (t0, t1, g = 0.22, seed = 163) => at(t0, () => {
    const bus = ac.createGain(); bus.gain.value = 1;
    const n = mkNoiseBaked(t0, t1 - t0, g, { atk: 0.06, hold: 0.7, fadeOut: 0.12, seed });
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(220, t0);
    bp.frequency.exponentialRampToValueAtTime(1200, t0 + (t1 - t0) * 0.45);
    bp.frequency.exponentialRampToValueAtTime(150, t1);
    n.connect(bp).connect(bus);
    const o = osc('sawtooth', 55, t0, t1 - t0 + 0.05);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.linearRampToValueAtTime(g * 0.7, t0 + 0.08);
    og.gain.linearRampToValueAtTime(0.0001, t1);
    o.connect(lp).connect(og).connect(bus);
    kit.out(bus, 1, 0.25, 0);
  });

  // brass tinkle: tiny struck sines — few, quiet (shell casings)
  const tinkle = (t, seed, g = 0.026) => at(t, () => {
    const f = 4200 + H(seed) * 2400;
    const bus = ac.createGain(); bus.gain.value = 1;
    for (const [r, w] of [[1, 1], [2.7, 0.35]]) {
      const o = osc('sine', f * r, t, 0.18);
      const og = ac.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.linearRampToValueAtTime(g * w, t + 0.002);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(og).connect(bus);
    }
    kit.out(bus, 1, 0.25, (H(seed + 1) - 0.5) * 1.4);
  });

  // metal ring: inharmonic partials (industrial horror, train scream, dojo ring-out)
  const metalRing = (t, { g = 0.14, base = 620, dur = 1.6, seed = 181 } = {}) => at(t, () => {
    const bus = ac.createGain(); bus.gain.value = 1;
    const R = [1, 2.756, 5.404, 8.933], W = [1, 0.5, 0.3, 0.2], D = [1, 0.7, 0.45, 0.3];
    R.forEach((r, i) => {
      const o = osc('sine', base * r * (1 + (H(seed + i) - 0.5) * 0.006), t, dur);
      const og = ac.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.linearRampToValueAtTime(g * W[i], t + 0.002);
      og.gain.exponentialRampToValueAtTime(0.0001, t + dur * D[i]);
      o.connect(og).connect(bus);
    });
    kit.out(bus, 1, 0.3, (H(seed) - 0.5) * 0.6);
  });

  // held sub (the frozen-time bed): two detuned sines, slow in/out
  const heldSub = (t0, t1, m = 28, g = 0.15) => cue(t0, () => {
    const dur = t1 - t0;
    const bus = ac.createGain(); bus.gain.value = 1;
    bus.gain.setValueAtTime(0.0001, t0);
    bus.gain.linearRampToValueAtTime(g, t0 + 0.7);
    bus.gain.setValueAtTime(g, t1 - 0.3);
    bus.gain.linearRampToValueAtTime(0.0001, t1);
    for (const det of [0, 0.4]) {
      const o = osc('sine', hz(m), t0, dur + 0.05);
      o.detune.value = det * 100;
      o.connect(bus);
    }
    kit.out(bus, 1, 0.05, 0);
  });

  // sub bloom (drop): 60→32 style hit
  const bloomSub = (t, g = 0.32, f0 = 60, f1 = 32, dur = 1.6) => cue(t, () => {
    const o = osc('sine', f0, t, dur);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.012);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a);
    kit.out(a, 1, 0.08);
  });

  // orbit siren: filtered triangle gliss up to the half-sweep, down to the settle
  const sirenSweep = (t0, tPeak, t1, g = 0.045) => cue(t0, () => {
    const o = osc('triangle', 220, t0, t1 - t0 + 0.05);
    o.frequency.setValueAtTime(220, t0);
    o.frequency.exponentialRampToValueAtTime(660, tPeak);
    o.frequency.exponentialRampToValueAtTime(330, t1);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.1;
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t0);
    a.gain.linearRampToValueAtTime(g, t0 + 1.2);
    a.gain.setValueAtTime(g, t1 - 0.6);
    a.gain.linearRampToValueAtTime(0.0001, t1);
    o.connect(bp).connect(a);
    kit.out(a, 1, 0.4, 0, 0.5);
  });

  // clippers buzz: detuned squares amplitude-gated by a fast square LFO ("a thousand clippers")
  const clipperBuzz = (t0, t1, g = 0.045) => cue(t0, () => {
    const gate = ac.createGain(); gate.gain.value = 0.5;
    const lfo = osc('square', 82, t0, t1 - t0);
    const lg = ac.createGain(); lg.gain.value = 0.5;
    lfo.connect(lg); lg.connect(gate.gain);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.8;
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t0);
    a.gain.linearRampToValueAtTime(g, t0 + 0.25);
    a.gain.setValueAtTime(g, t1 - 0.3);
    a.gain.linearRampToValueAtTime(0.0001, t1);
    for (const f of [185, 187.5]) {
      const o = osc('square', f, t0, t1 - t0);
      o.connect(bp);
    }
    bp.connect(gate).connect(a);
    kit.out(a, 1, 0.2, 0.15);
  });

  // whisper shimmer: high glassy sines + breath band (TRIMNITY on the glass)
  const whisperShimmer = (t, dur = 1.6, g = 0.045) => at(t, () => {
    const bus = ac.createGain(); bus.gain.value = 1;
    for (const f of [2800, 3150, 4200]) {
      const o = osc('sine', f, t, dur);
      const og = ac.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.linearRampToValueAtTime(g * 0.4, t + dur * 0.4);
      og.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(og).connect(bus);
    }
    const n = mkNoiseBaked(t, dur, g * 0.5, { atk: dur * 0.3, hold: 0.6, fadeOut: 0.1, seed: 191 });
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 1.5;
    n.connect(bp).connect(bus);
    kit.out(bus, 1, 0.4, -0.2, 0.4);
  });

  // glitch tear: columns smear upward (descending blips + reverse sweep)
  const glitchTear = (t0, t1, g = 0.07) => cue(t0, () => {
    for (let i = 0; i < 7; i++) {
      const tt = t0 + i * (t1 - t0) / 7;
      at(tt, () => kit.blip(tt, 2400 - i * 260 + H(i + 3) * 120, g * (1 - i * 0.09), 0.03, 'square'));
    }
    sweepN(t0, t1 - t0, g * 0.6, 800, 4800);
  });

  // pod-horror fall: the world drops away (tri gliss down through a lowpass)
  const fallDrone = (t, dur = 1.0, g = 0.13) => cue(t, () => {
    const o = osc('triangle', 200, t, dur + 0.05);
    o.frequency.exponentialRampToValueAtTime(52, t + dur);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.05);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp).connect(a);
    kit.out(a, 1, 0.2, 0);
  });

  // the comb bends: a note curling down like soft plastic
  const bendNote = (t, m0, m1, dur = 0.85, g = 0.12) => cue(t, () => {
    const o = osc('triangle', hz(m0), t, dur + 0.05);
    o.frequency.exponentialRampToValueAtTime(hz(m1), t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.05);
    a.gain.setValueAtTime(g, t + dur * 0.7);
    a.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(a);
    kit.out(a, 1, 0.3, 0);
  });

  // weightless glassy hold (construct / apex / pluck): near-harmonic sines, slow env
  const glassHold = (t, dur, m, g = 0.04) => cue(t, () => {
    const f = hz(m);
    const bus = ac.createGain(); bus.gain.value = 1;
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.linearRampToValueAtTime(g, t + Math.min(0.4, dur * 0.3));
    bus.gain.setValueAtTime(g, t + dur * 0.75);
    bus.gain.linearRampToValueAtTime(0.0001, t + dur);
    for (const r of [1, 2.02, 3.01]) {
      const o = osc('sine', f * r, t, dur + 0.05);
      const og = ac.createGain(); og.gain.value = r === 1 ? 1 : 0.25 / r;
      o.connect(og).connect(bus);
    }
    kit.out(bus, 1, 0.45, 0.1);
  });

  // rotor throb (hovercraft / train wash): 12 Hz gate baked into the PCM
  const rotorN = (t0, t1, g = 0.045) => cue(t0, () => {
    const n = mkNoiseBaked(t0, t1 - t0, g, { atk: 0.3, hold: 0.85, fadeOut: 0.1, seed: 199,
      mod: (ts) => ((ts % (1 / 12)) < 0.5 / 12 ? 1 : 0.2) });
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const bus = ac.createGain(); bus.gain.value = 1;
    n.connect(lp).connect(bus);
    kit.out(bus, 1, 0.15, 0, 0.5);
  });

  // granular clatter (the payoff bullet drop): hashed drop grid, decaying
  const clatter = (t0, t1, nDrops = 14, g = 0.06, seed = 211) => at(t0, () => {
    for (let i = 0; i < nDrops; i++) {
      const tt = t0 + Math.pow(H(seed + i * 3), 0.8) * (t1 - t0);
      at(tt, () => {
        const gg = g * (0.5 + H(seed + i * 7) * 0.8) * (1 - (tt - t0) / (t1 - t0 + 0.3));
        const o = osc('sine', 2600 + H(seed + i) * 3600, tt, 0.12);
        const og = ac.createGain();
        og.gain.setValueAtTime(0.0001, tt);
        og.gain.linearRampToValueAtTime(gg, tt + 0.002);
        og.gain.exponentialRampToValueAtTime(0.0001, tt + 0.1);
        o.connect(og);
        kit.out(og, 1, 0.3, (H(seed + i * 11) - 0.5) * 1.5);
        const n = mkNoiseBaked(tt, 0.05, gg * 0.7, { atk: 0.001, hold: 0.1, fadeOut: 0.01, seed: seed + i });
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        const nb = ac.createGain(); nb.gain.value = 1;
        n.connect(lp).connect(nb);
        kit.out(nb, 1, 0.1, (H(seed + i * 13) - 0.5) * 1.2);
      });
    }
  });

  // =========================== groove engines ====================================================
  // dojo spar groove (120 BPM, bar = 2 s). density: 1 kick+bass · 2 +hats · 3 full (+snare+arp)
  const BASS8 = [40, 40, 47, 40, 43, 40, 45, 43];            // E minor riff, eighths
  const ARPN = [64, 67, 71, 74, 71, 67];                     // FOLLICLE tones as the arp cell
  const sparGroove = (bar, density, gKick = 0.42) => {
    const t0 = barStart('dojo', bar);
    for (let b = 0; b < 4; b++) cue(t0 + b * BEAT.dojo, (t) => kickD(t, gKick));
    for (let e = 0; e < 8; e++) cue(t0 + e * BEAT.dojo / 2, (t) => tri(t, BASS8[e], 0.21, { g: 0.2 }));
    if (density >= 2) for (let e = 0; e < 8; e++) cue(t0 + e * BEAT.dojo / 2, (t) =>
      hatN(t, e % 2 ? 0.028 : 0.05, false, (e % 4) * 0.12 - 0.18));
    if (density >= 3) {
      for (const b of [1, 3]) cue(t0 + b * BEAT.dojo, (t) => snareN(t, 0.12, 0.1));
      for (let s = 0; s < 16; s++) cue(t0 + s * BEAT.dojo / 4, (t) =>
        pulse(t, ARPN[s % 6], 0.09, { duty: 0.25, g: 0.075, pan: (s % 4) * 0.1 - 0.15 }));
    }
  };

  // lobby industrial engine — also fires the bullet-time resume bar (63.0 pickup)
  const LOBBY_BASS = [40, 40, 43, 40, 40, 46, 45, 43];       // adds the Bb tritone color
  const lobbyGroove = (t0, t1) => {
    for (let bar = 0; t0 + bar * BAR.lobby < t1 - 1e-6; bar++) {
      const b0 = t0 + bar * BAR.lobby;
      for (let b = 0; b < 4; b++) cue(b0 + b * BEAT.lobby, (t) => kickD(t, 0.4));
      for (const b of [1, 3]) cue(b0 + b * BEAT.lobby, (t) => snareN(t, 0.13, 0.12));
      for (let s = 0; s < 16; s++) cue(b0 + s * BEAT.lobby / 4, (t) =>
        hatN(t, s % 4 === 2 ? 0.04 : 0.026, s % 8 === 7, (s % 4) * 0.12 - 0.18));
      for (let e = 0; e < 8; e++) cue(b0 + e * BEAT.lobby / 2, (t) =>
        kit.bass(t, LOBBY_BASS[e], 0.2, 0.22, 'sawtooth', 640));
      cue(b0, (t) => fmStab(t, [40, 55], 0.15, { g: 0.08, pan: -0.1 }));
    }
  };

  // subway narrowed pulse: kick quarters + dark bluesy riff (E G A Bb)
  const SUB_RIFF = [40, 40, 43, 45, 40, 40, 46, 45];
  const subwayPulse = (t0, t1) => {
    for (let bar = 0; t0 + bar * BAR.subway < t1 - 1e-6; bar++) {
      const b0 = t0 + bar * BAR.subway;
      for (let b = 0; b < 4; b++) cue(b0 + b * BEAT.subway, (t) => kickD(t, 0.36));
      for (let q = 0; q < 8; q++) cue(b0 + q * BEAT.subway / 2, (t) =>
        tri(t, SUB_RIFF[q], 0.42, { g: 0.2 }));
      for (const b of [1, 3]) cue(b0 + b * BEAT.subway, (t) =>
        pulse(t, SUB_RIFF[(b * 2) % 8] + 12, 0.4, { duty: 0.25, g: 0.075, pan: b === 1 ? -0.2 : 0.2 }));
    }
  };

  // ===========================================================================
  // A. TERMINAL (0–12) — 80 BPM phosphor ambience: sub pulse, CRT tick grid,
  //    filtered wind, hidden FOLLICLE fragment in the rain, title braam (CABALD), glitch out.
  // ===========================================================================
  windBed(0.05, 11.9, 0.045, 260, 900, 5);
  kit.drone(0.05, 11.85, [28, 40], 0.07, 260);                       // E1+E2 phosphor hum
  for (let i = 0; i < 16; i++) cue(i * BEAT.terminal, (t) =>          // CRT ticks on the 80 grid
    kit.tick(t, i % 4 === 0 ? 0.05 : 0.026, i % 4 === 0 ? 3000 : 2200));
  cue(T.crtOn, (t) => { kit.blip(t, 1320, 0.05, 0.07, 'sine'); kit.tick(t + 0.02, 0.04, 3600); });
  { // keystrokes: deterministic clusters as the lines type on
    const K1 = [0, 0.12, 0.27, 0.39, 0.58, 0.66, 0.89, 1.02];
    K1.forEach((d, i) => cue(T.wakeUp + d, (t) => kit.tick(t, 0.045, 2600 + H(i) * 1400)));
    const K2 = [0, 0.16, 0.3, 0.52, 0.61, 0.88];
    K2.forEach((d, i) => cue(T.hareLine + d, (t) => kit.tick(t, 0.04, 2600 + H(i + 9) * 1400)));
  }
  { // rainStorm: FOLLICLE notes 1–3 surface quietly from the glyph rain + rain swells
    swellN(T.rainStorm - 0.6, T.rainStorm + 1.4, 0.028, 600, 2400, 7);
    FOLLICLE(64).slice(0, 3).forEach((m, i) =>
      pulse(T.rainStorm + i * 0.5, m, 0.42, { duty: 0.125, g: 0.07, pan: -0.1 }));
  }
  { // titleSlam: THE braam + CABALD under it
    kit.braam(T.titleSlam, [40, 52, 59], 2.4, 0.21, 1);
    kit.impact(T.titleSlam, 0.58, 46);
    kit.taiko(T.titleSlam, 0.5, 52);
    crashN(T.titleSlam, 0.15, 9);
    bloomSub(T.titleSlam, 0.32, 70, 30, 2.0);
    CABALD(40).forEach((m, i) => pulse(T.titleSlam + i * 0.7, m, i === 2 ? 1.5 : 0.6,
      { duty: 0.5, g: 0.13 }));
  }
  glitchTear(T.glitchOut, T.glitchOut + 0.6, 0.07);                   // columns smear upward
  cue(T.cutOut, (t) => {                                              // the white scanline collapses
    kit.sweepDown(t, 0.22, 2600, 55, 0.1, 'sine');
    kit.tick(t, 0.05, 4200);
  });

  // ===========================================================================
  // B. CONTACT (12–20) — brooding half-time pulse; whisper shimmer; power-down;
  //    underpass walking bass; CABALD sting on "THE HAIRTRIX HAS YOU".
  // ===========================================================================
  for (let bar = 0; bar < 3; bar++) {
    const b0 = barStart('contact', bar);                              // 12 / 14 / 16
    cue(b0, (t) => kickD(t, 0.3));
    for (let e = 0; e < 8; e++) cue(b0 + e * BEAT.contact / 2, (t) => hatN(t, 0.02, false, (e % 4) * 0.1 - 0.15));
    tri(b0, 40, 1.2, { g: 0.2 });                                     // brooding E pedal swells
    tri(b0 + 1, 40, 0.8, { g: 0.15 });
  }
  cue(T.deskGlitch, (t) => { kit.blip(t, 900 + H(1) * 500, 0.05, 0.05, 'square'); kit.blip(t + 0.09, 1500, 0.04, 0.04, 'square'); });
  whisperShimmer(T.whisper, 1.7, 0.045);                              // TRIMNITY on the glass
  cue(T.boothBlack, (t) => sweepN(t, 0.5, 0.08, 1200, 120));          // power-down whoosh
  kit.drone(T.underpassIn, T.cutWhite - 0.05, [28, 40], 0.05, 320);   // sodium-lit underpass
  [0.1, 1.1, 1.6, 2.1].forEach((d) => cue(T.underpassIn + d, (t) => bloomSub(t, 0.1, 52, 40, 0.4))); // idle
  kit.taiko(T.mousseIn, 0.32, 55);                                    // MOUSSE-PHEUS steps out
  { // walking bass from mousseIn to the white flood
    const WK = [40, 43, 45, 47];
    for (let i = 0; i < 6; i++) tri(T.mousseIn + i * BEAT.contact, WK[i % 4], 0.42, { g: 0.18 });
  }
  cue(T.hasYou, (t) => {                                              // THE HAIRTRIX HAS YOU — sting
    fmStab(t, [52, 51, 46], 0.5, { g: 0.1, ratio: 3.01 });
    kit.braam(t, [40, 46], 1.6, 0.1, 0.5);                            // E + Bb tritone shadow
    kit.tick(t, 0.05, 5200);
  });
  cue(T.carDoor, (t) => { kit.clunk(t, 0.3); sweepN(t, 0.3, 0.035, 4000, 900, 'highpass', 0.7); });
  swellN(T.cutWhite - 0.75, T.cutWhite + 0.05, 0.09, 400, 6000, 13);  // flood to white

  // ===========================================================================
  // C. CONSTRUCT (20–34) — weightless held pads (no drums); silence beat, then the low
  //    bloom at redTaken; mirror liquid → burst; cold industrial pod farm; warm root.
  // ===========================================================================
  kit.pad(T.whiteIn, [59, 64, 71], 2.9, 0.04, 2200, 1.2);             // white void: airy fifth
  cue(T.pills, (t) => {                                               // the palm opens: red + blue
    kit.bell(t, hz(88), 0.05, 1.6);                                   // red — bright E6
    kit.bell(t + 0.15, hz(83), 0.04, 1.6);                            // blue — cool B5
  });
  cue(T.reach, (t) => whooshN(t, 0.3, 0.03, 600, 1600));              // the push-in breath
  airBed(T.reach + 0.4, T.redTaken, 0.028, 17);                       // the silence beat (choice)
  cue(T.redTaken, (t) => {                                            // low bloom under the heartbeat
    kit.heartbeat(t, 0.18); kit.heartbeat(t + 0.55, 0.22); kit.heartbeat(t + 1.1, 0.26);
    bloomSub(t, 0.34, 62, 32, 1.7);
    kit.pad(t, [40, 47, 52], 1.7, 0.05, 1500, 0.3);
  });
  cue(T.blueFade, (t) => glassHold(t, 0.8, 100, 0.03));               // the blue dissolves
  at(T.mirrorLiquid, () => {                                          // the mirror goes liquid:
    const bus = ac.createGain(); bus.gain.value = 1;                  // two sines beating 3 Hz apart
    bus.gain.setValueAtTime(0.0001, T.mirrorLiquid);
    bus.gain.linearRampToValueAtTime(0.035, T.mirrorLiquid + 0.4);
    bus.gain.setValueAtTime(0.035, T.mirrorLiquid + 0.9);
    bus.gain.linearRampToValueAtTime(0.0001, T.mirrorLiquid + 1.15);
    for (const f of [659, 662]) {
      const o = osc('sine', f, T.mirrorLiquid, 1.2);
      o.connect(bus);
    }
    kit.out(bus, 1, 0.4, 0.15);
  });
  cue(T.mirrorBreak, (t) => {                                         // liquid bursts THROUGH frame
    glassN(t, 0.2, 0.8, 23);
    kit.impact(t, 0.6, 48);
    bloomSub(t, 0.3, 70, 30, 1.4);
  });
  fallDrone(T.podFall, 1.1, 0.14);                                    // falling through dark water
  kit.drone(T.podFall, T.whiteOut - 0.1, [28, 31], 0.06, 300);        // cold blue pod farm bed
  cue(T.podWake, (t) => {                                             // cold industrial horror
    metalRing(t, { g: 0.13, base: 620, dur: 1.7, seed: 29 });
    bloomSub(t, 0.28, 66, 34, 1.5);
    sweepN(t, 1.0, 0.05, 1800, 300, 'bandpass', 2);                   // fluid drains
  });
  kit.choir(T.podsWide, [40, 47, 52], 2.7, 0.035, 'u', 1.0, 1.2);     // infinite pods: eerie hum
  kit.taiko(T.podWake + 0.9, 0.2, 46);                                // a distant pod thud
  cue(T.hoverIn, (t) => {                                             // floodlight cone + rotor
    kit.sweepDown(t, 0.9, 3200, 900, 0.05, 'sine');
    rotorN(t, T.whiteOut - 0.15, 0.045);
  });
  kit.pad(T.welcome, [40, 47, 52, 59], 2.0, 0.05, 1600, 0.5);         // WARM ROOT: open fifth
  kit.bell(T.welcome + 0.2, hz(76), 0.035, 2.0);
  swellN(T.whiteOut - 0.7, T.whiteOut + 0.1, 0.08, 500, 7000, 37);    // floodlight blows to white

  // ===========================================================================
  // D. DOJO (34–44) — the propulsive beat ENTERS. Spar groove → HARD SILENCE 39.55–40.0 →
  //    palm strike rings through the 0.18 s freeze → comb bend → riser to the jump cut.
  // ===========================================================================
  sparGroove(0, 1);                                                   // 34: kick + bass
  cue(T.dojoIn, (t) => { kit.taiko(t, 0.3, 58); kit.tick(t, 0.04, 3000); });   // the bow
  sparGroove(1, 2);                                                   // 36: + hats
  sparGroove(2, 3);                                                   // 38: full (+snare+arp)
  cue(T.combo1, (t) => { kickD(t, 0.36); snareN(t + 0.1, 0.09, -0.15); });     // the flurry
  sparGroove(4, 3);                                                   // 42: full, after the bend
  { // HARD SILENCE 39.55–40.0 — the groove cuts into it (grid guard skips the tail)
    const pal = T.dojoHit;                                            // = freeze start, film 40.0
    kit.impact(pal, 0.75, 50);                                        // palm strike
    kit.taiko(pal, 0.5, 50);
    metalRing(pal, { g: 0.09, base: 300, dur: 1.1, seed: 31 });
    bloomSub(pal, 0.3, 65, 30, 1.6);
  }
  cue(T.recoil, (t) => sweepN(t, 0.45, 0.06, 900, 250));              // FLOW skids across the mats
  kit.bell(T.combRaise, hz(88), 0.045, 2.2);                          // the comb raised: sparse bell
  bendNote(T.combBend, 76, 70, 0.85, 0.12);                           // THERE IS NO FOLLICLE
  heldSub(T.combBend, T.combBend + 0.9, 40, 0.08);
  riserN(42.9, T.jumpCut, 0.12, 43);                                  // riser INTO the jump cut
  [43.4, 43.7, 43.9, 44.05, 44.2, 44.3].forEach((t, i) => cue(t, (tt) =>
    kit.blip(tt, 1400 - i * 140, 0.04 - i * 0.004, 0.03, 'sine')));   // accelerating ticks

  // ===========================================================================
  // E. JUMPPROG (44–48) — sprint, apex suspension, heavy landing, one bar of near-quiet.
  // ===========================================================================
  cue(T.cutRoof, (t) => whooshN(t, 0.35, 0.05, 500, 1800));           // the hard cut to the roof
  cue(T.jumpCut, (t) => kit.impact(t, 0.5, 46));                      // the impossible gap
  { // runUp: sprint pulse
    for (const t of [44.5, 45.0, 45.5, 46.0]) cue(t, (tt) => kickD(tt, 0.3));
    for (const t of [46.0, 46.25]) cue(t, (tt) => kickD(tt, 0.32));
    for (let i = 0; i < 15; i++) cue(44.5 + i * BEAT.jumpprog / 4, (t) => hatN(t, 0.03));
    for (let e = 0; e < 7; e++) cue(44.5 + e * BEAT.jumpprog / 2, (t) => tri(t, 40, 0.2, { g: 0.18 }));
  }
  cue(T.apex, (t) => {                                                // apex hang: everything suspends
    kit.pad(t, [52, 64, 71], 1.1, 0.05, 2600, 0.12);
    glassHold(t, 1.15, 88, 0.035);
    whooshN(t, 0.5, 0.06, 400, 1800);                                 // coat flare
    kit.heartbeat(t + 0.15, 0.14);
  });
  cue(T.land, (t) => {                                                // hard landing on the far ledge
    kit.impact(t, 0.7, 46);
    bloomSub(t, 0.3, 70, 30, 1.6);
    stone(t, 0.14, { chunks: 3, seed: 47, f: 48 });
    sweepN(t + 0.15, 0.4, 0.05, 800, 200);                            // the skid
  });

  // ===========================================================================
  // F. ROOF (48–54) — taiko-ish industrial build; CABALD walks out; five cracks at waveFire;
  //    the time-stretch slows INTO the freeze.
  // ===========================================================================
  windBed(T.roofIn, T.bt0 - 0.05, 0.05, 300, 800, 53);                // night rooftop wind
  kit.drone(49.0, T.bt0 - 0.05, [28, 34], 0.05, 200);                 // E/Bb tritone menace
  { // the build: taiko eighths crescendo + ticking hats + pulse bass
    let i = 0;
    for (let t = 48.5; t < 54.5; t += BEAT.roof / 2, i++) {
      const u = (t - 48.5) / 6;
      cue(t, (tt) => kit.taiko(tt, 0.1 + u * 0.12, i % 2 ? 58 : 62));
      cue(t, (tt) => hatN(tt, 0.026 + u * 0.012));
      if (i % 2 === 0) cue(t, (tt) => tri(tt, i % 8 < 4 ? 40 : 43, 0.2, { g: 0.17 }));
    }
  }
  CABALD(40).forEach((m, i) => pulse(T.wallIn + i * 0.7, m, i === 2 ? 0.4 : 0.55,
    { duty: 0.5, g: 0.14 }));                                         // four balds + SMIRK: the motif
  cue(T.smirk, (t) => { kit.taiko(t, 0.35, 50); sweepN(t, 0.3, 0.06, 2400, 3600, 'bandpass', 6); });
  { // waveAim: five pistols level — five cocking ticks, hashed pan via freq spread
    for (let i = 0; i < 5; i++) cue(T.waveAim + i * 0.035, (t) =>
      kit.tick(t, 0.05, 3400 + H(60 + i) * 900));
    swellN(T.waveAim + 0.1, T.waveAim + 0.7, 0.04, 300, 1200, 63);
  }
  { // waveFire: FIVE cracks, pan from the WAVE muzzle table
    WAVE.muzzleX.forEach((x, i) =>
      shot(T.waveFire + i * 0.028, 70 + i, wavePan(x), 0.42 + H(i) * 0.1));
  }
  riserN(T.waveFire, 54.9, 0.13, 77);                                 // the tracer wave crawls…
  { // …and time thickens: decelerating blips sink toward the freeze
    const TS = [[52.6, 1400, 0.05], [53.2, 1100, 0.045], [53.7, 850, 0.04], [54.1, 620, 0.034],
                [54.4, 440, 0.028], [54.62, 320, 0.024], [54.78, 240, 0.02], [54.88, 180, 0.016]];
    TS.forEach(([t, f, g]) => cue(t, (tt) => kit.blip(tt, f, g, 0.05, 'sine')));
  }

  // ===========================================================================
  // G. BULLET TIME (55.0–63.0) — THE SIGNATURE CUE. The world hangs: drums suspend.
  //    ONLY the designed freeze bed lives here: held sub + air + the orbit siren peaking
  //    at the half-sweep (59.1) + the weightless FOLLICLE statement + the huge riser that
  //    resolves AT the resume (63.0), where the full band slams back on the drop.
  // ===========================================================================
  cue(T.bt0, (t) => {                                                 // the freeze bloom: glassy
    kit.impact(t, 0.4, 40);
    sweepN(t, 0.8, 0.03, 900, 3600, 'bandpass', 2, 81);
  });
  heldSub(T.bt0, T.bt1, 28, 0.15);                                    // the held sub, 8 s
  airBed(T.bt0 + 0.05, T.bt1 - 0.05, 0.035, 87);                      // the stopped air
  sirenSweep(T.orbit0, T.halfSweep, T.orbit1, 0.045);                 // synced to the 320° orbit
  kit.pad(T.halfSweep, [52, 59, 64], 3.7, 0.04, 2000, 1.2);           // weightless pad under
  { // the motif peak: FOLLICLE, weightless, an octave up, bells
    const FM = FOLLICLE(76), FD = [0.55, 0.55, 0.55, 0.9, 1.0];
    let t = T.halfSweep;
    FM.forEach((m, i) => { kit.bell(t, hz(m), 0.05, 2.2); t += FD[i]; });
  }
  riserN(61.5, T.bt1, 0.2, 91);                                       // THE riser INTO the resume
  { // sub-rise + accelerating ticks under the riser
    at(61.5, () => {
      const o = osc('sawtooth', 55, 61.5, 1.55);
      o.frequency.setValueAtTime(55, 61.5);
      o.frequency.exponentialRampToValueAtTime(220, T.bt1);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(200, 61.5); lp.frequency.exponentialRampToValueAtTime(1800, T.bt1);
      const a = ac.createGain();
      a.gain.setValueAtTime(0.0001, 61.5);
      a.gain.linearRampToValueAtTime(0.08, 62.6);
      a.gain.linearRampToValueAtTime(0.0001, T.bt1);
      o.connect(lp).connect(a);
      kit.out(a, 1, 0.15, 0);
    });
    [62.4, 62.55, 62.68, 62.79, 62.88, 62.94].forEach((t, i) => cue(t, (tt) =>
      kit.tick(tt, 0.035 + i * 0.006, 2800 + i * 300)));
  }
  { // RESUME (63.0): the full band slams back on the drop + the picture's whip tail
    cue(T.bt1, (t) => { kickD(t, 0.5); kit.impact(t, 0.53, 48); crashN(t, 0.16, 95); });
    lobbyGroove(T.bt1, T.exitCut);                                    // one engine: 63.0 → the smash cut
    cue(T.snapUp, (t) => whooshN(t, 0.25, 0.08, 500, 2200));          // FLOW snaps upright
    [[0, -0.5], [0.06, 0.05], [0.13, 0.6]].forEach(([d, p], i) =>     // tracers scream past the ear
      cue(T.whipPast + d, (t) => sweepN(t, 0.12, 0.12, 3400, 900, 'bandpass', 2.2, 101 + i)));
    cue(T.dodgeSettle, (t) => sweepN(t, 0.2, 0.07, 1400, 700, 'bandpass', 1.2)); // coat cracks
    cue(T.parapetChew, (t) => {                                       // rounds chew the parapet
      stone(t, 0.16, { chunks: 5, seed: 107, f: 50 });
      [0.05, 0.12, 0.2, 0.3].forEach((d, i) => cue(t + d, (tt) => kit.tick(tt, 0.04, 3800 + i * 500)));
    });
  }

  // ===========================================================================
  // H. LOBBY (64–74) — full-tilt industrial (the engine runs from the 63.0 resume);
  //    pillar hits on their clocks, hashed exchange fire, brass tinkles, sprint riser.
  // ===========================================================================
  cue(T.lobbyIn, (t) => {                                             // glass doors burst
    glassN(t, 0.22, 0.6, 113);
    kit.clunk(t, 0.35);
    whooshN(t + 0.05, 0.4, 0.07, 300, 1600);
  });
  cue(T.deskLine, (t) => {                                            // the clone line rises
    fmStab(t, [40, 46], 0.22, { g: 0.1 });
    for (let i = 0; i < 5; i++) at(t + i * 0.04, () =>
      kit.blip(t + i * 0.04, 210 + i * 46, 0.035, 0.05, 'square'));
  });
  cue(T.pillar1, (t) => stone(t, 0.2, { seed: 121, f: 52 }));         // first pillar chews
  { // crossFire → stairSprint: the exchange, hashed shots on the beat grid
    const FIRE = [67.0, 67.5, 68.0, 68.25, 69.0, 69.5, 70.25, 70.75, 71.0, 71.75, 72.0, 72.75];
    FIRE.forEach((ft, i) => cue(ft, (t) =>
      shot(t, 130 + i, (i % 2 ? 1 : -1) * (0.25 + H(140 + i) * 0.4), 0.26 + H(150 + i) * 0.14)));
    [67.35, 68.3, 70.3, 70.42, 71.6].forEach((t, i) => tinkle(t, 160 + i));     // brass on marble
  }
  cue(T.cartwheel, (t) => whooshN(t, 0.35, 0.09, 600, 2400, -0.2));   // the cartwheel
  cue(T.cartLand, (t) => { kickD(t, 0.5); stone(t, 0.1, { chunks: 2, seed: 131, f: 46 }); });
  cue(T.pillar2, (t) => {                                             // CENTER PILLAR GUTTED (STOP 0.2)
    kit.impact(t, 0.8, 45);
    kit.taiko(t, 0.5, 48);
    stone(t, 0.3, { chunks: 6, seed: 137, f: 44 });
    bloomSub(t, 0.32, 60, 30, 1.4);
    crashN(t, 0.12, 139);
  });
  cue(T.pillar3, (t) => stone(t, 0.16, { seed: 149, f: 50 }));        // third pillar chews
  { // stairSprint: riser + accelerating kicks into the smash cut
    riserN(T.stairSprint, T.exitCut, 0.15, 151);
    let j = 0;
    for (let t = T.stairSprint; t < T.exitCut - 0.05; t += 0.25, j++) cue(t, (tt) =>
      kickD(tt, 0.26 + j * 0.02));
  }
  cue(T.exitCut, (t) => {                                             // SMASH CUT on the sprint
    kit.impact(t, 0.5, 44);
    kit.sweepDown(t, 0.3, 1800, 100, 0.1, 'sawtooth');
  });

  // ===========================================================================
  // I. SUBWAY (74–84) — pulse narrowing; the express that doesn't stop; clipper buzz under
  //    the line; HARD SILENCE 79.55–80.0; the train clip rings through the 0.35 s freeze;
  //    hollow wind, brake, chime, one dry footstep, swell to the payoff.
  // ===========================================================================
  subwayPulse(74.0, 79.5);                                            // narrowed: no hats, no arp
  cue(T.subwayIn, (t) => {                                            // express roars through
    roarN(t, t + 1.8, 0.22, 157);
    rotorN(t + 0.2, t + 1.6, 0.04);                                   // papers in the wash
    whooshN(t, 1.2, 0.1, 200, 900);
  });
  kit.drone(T.standoff, 79.5, [28, 34], 0.05, 220);                   // E/Bb standoff drone
  clipperBuzz(T.clippers, 79.5, 0.045);                               // a thousand clippers (cut at silence)
  cue(T.shades, (t) => { kit.tick(t, 0.05, 4600); kit.bell(t + 0.03, 2960, 0.03, 1.2); });
  riserN(78.7, 79.5, 0.12, 163);                                      // dash build — ends AT the silence
  [79.12, 79.28, 79.44].forEach((t, i) => cue(t, (tt) => kickD(tt, 0.3 + i * 0.06)));
  cue(T.grapple, (t) => kit.impact(t, 0.18, 40));                     // locked… then dead air
  { // trainClip (STOP 0.35): the headlight wash — the loudest hit of the middle act
    kit.impact(T.train, 0.75, 42);
    metalRing(T.train, { g: 0.16, base: 420, dur: 1.9, seed: 167 });  // metal scream
    metalRing(T.train + 0.03, { g: 0.1, base: 415, dur: 1.5, seed: 173 });
    bloomSub(T.train, 0.4, 75, 26, 2.2);
    roarN(T.train, T.train + 0.9, 0.26, 179);
    crashN(T.train, 0.18, 181);
  }
  windBed(T.expressClear, T.localStops + 1.2, 0.07, 250, 700, 191);   // hollow: FLOW alone in wind
  cue(T.localStops, (t) => { sweepN(t, 0.9, 0.05, 2600, 1900, 'bandpass', 8); sweepN(t + 0.1, 0.7, 0.035, 4000, 1200, 'highpass', 0.7); });
  cue(T.doors, (t) => { kit.bell(t, 988, 0.04, 1.0); kit.bell(t + 0.18, 1318, 0.04, 1.2); sweepN(t, 0.35, 0.03, 5000, 2000, 'highpass', 0.7); });
  cue(T.reskin, (t) => sweepN(t, 0.09, 0.07, 400, 120, 'lowpass', 1)); // one dry footstep: him again
  swellN(T.narrowEyes, 84.2, 0.07, 300, 2200, 197);                   // the eyes narrow → payoff
  kit.heartbeat(T.narrowEyes + 0.3, 0.16);

  // ===========================================================================
  // J. PAYOFF (84–92) — volley cracks → HARD SILENCE → the 1.1 s freeze on a held A sub →
  //    the drop clatter → liftoff → KEY CHANGE UP: FOLLICLE in A, resolved A major end card.
  // ===========================================================================
  cue(T.swarmIn, (t) => { fmStab(t, [40, 46], 0.2, { g: 0.09, pan: -0.2 }); fmStab(t + 0.1, [40, 46], 0.2, { g: 0.09, pan: 0.2 }); });
  VOLLEY.muzzleX.forEach((x, i) =>                                    // the volley cracks
    shot(T.swarmFire + i * 0.025, 203 + i, wavePan(x), 0.4 + H(i + 30) * 0.08));
  { // volleyFreeze (85.0–86.1): the world hangs on ONE hand — held A sub + air + a glass A5
    heldSub(T.volleyFz, T.volleyDrop, 33, 0.14);                      // A1 — the key-change seed
    airBed(T.volleyFz + 0.05, T.volleyDrop - 0.05, 0.03, 211);
    glassHold(T.volleyFz + 0.1, 0.95, 93, 0.04);
  }
  cue(T.pluck, (t) => { glassHold(t, 0.35, 93, 0.055); kit.tick(t + 0.02, 0.03, 5200); }); // the pluck
  cue(T.volleyDrop, (t) => {                                          // RESUME: every bullet drops dead
    kickD(t, 0.35);
    clatter(t, 86.9, 14, 0.06, 223);
  });
  [0, 1, 2].forEach((i) => tinkle(T.brass + i * 0.05, 233 + i, 0.035)); // brass settles
  cue(T.crouch, (t) => kit.impact(t, 0.12, 40));                      // the crouch
  riserN(T.crouch + 0.05, T.liftoff, 0.15, 241);                      // coiling for the sky
  cue(T.liftoff, (t) => {                                             // he rockets upward, hair first
    whooshN(t, 1.2, 0.2, 150, 2800);
    kit.impact(t, 0.5, 46);
    bloomSub(t, 0.32, 70, 30, 1.6);
    at(t, () => {
      const o = osc('triangle', 110, t, 1.6);
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(440, t + 1.5);          // the ascent
      const a = ac.createGain();
      a.gain.setValueAtTime(0.0001, t);
      a.gain.linearRampToValueAtTime(0.1, t + 0.3);
      a.gain.linearRampToValueAtTime(0.0001, t + 1.5);
      o.connect(a);
      kit.out(a, 1, 0.3, 0);
    });
  });
  { // endcard 88.6: THE KEY CHANGE UP — braam on A, FOLLICLE fanfare +5, resolved A major
    kit.braam(T.endcard, [33, 45, 52], 3.0, 0.23, 1);
    kit.impact(T.endcard, 0.7, 46);
    kit.taiko(T.endcard, 0.6, 50);
    crashN(T.endcard, 0.18, 251);
    kit.choir(T.endcard, [45, 52, 57, 61], 3.2, 0.055, 'a', 0.3, 1.2); // A major: the C# lands
    [69, 74, 76, 81].forEach((m, i) => kit.bell(T.endcard + 0.1 + i * 0.18, hz(m), 0.045, 1.8)); // streak
    const FF = FOLLICLE(69), FFD = [0.5, 0.5, 0.5, 0.5, 1.0];          // A4 C5 D5 E5 G5, on the grid
    let t = 89.0;                                                      // payoff bar 3 beat 3
    FF.forEach((m, i) => { pulse(t, m, FFD[i] * 0.92, { duty: 0.5, g: 0.13, pan: i % 2 ? 0.15 : -0.15 }); t += FFD[i]; });
    kit.pad(90.0, [45, 52, 61, 64], 1.9, 0.055, 1800, 0.4);            // bar 4: RESOLVED A major
    heldSub(90.0, 91.8, 33, 0.1);                                      // the final root, held
    airBed(T.fadeOut, DUR - 0.1, 0.02, 227);                           // the tail out
  }
  // fadeOut at 91.0: the picture fades — the pad's natural decay IS the ending. No loop. STOP.
}
export default score;
