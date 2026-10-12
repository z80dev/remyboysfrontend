// THE PHANTOM OF THE HAIRPERA — score.js (composer owns this file only).
// Original gothic-romantic score, 96 s. NO Webber/ALW melodic echoes: the Phantom motif is an
// ASCENDING phrygian gesture reaching a tritone and resolving DOWN a semitone (never a
// descending chromatic riff). Leroux is public domain; every note here is original.
//
// LAW: every cue is scheduled from timeline.js — filmT(g) for world events, barStart/BEAT for
// the music grid. Nothing here re-types a number the timeline owns. Impacts land at the START
// of their freeze = filmT(STOP.g); a scored hard silence (timeline SILENCES) immediately
// precedes each hit and NOTHING may onset inside those windows.
//
// AUDIO LAW for film.js (documented here, owned there):
//   audio: { seed: 1881, reverb: 1.4, reverbShape: 1.4, reverbGain: 0.3, lufs: -14 }
//   (exported below as AUDIO_SUGGEST; gothic stone = short dense reverb, modest send)
//
// GAIN STAGING (QA round 2, qa-audio.md D1): the draft mix was I −18.77 / TP −0.89, so
// loudnorm's linear path needed +4.77 dB and fell back to dynamic normalization, squashing the
// crash tutti. Since the renderer pins the sample peak to −1 dBFS, integrated loudness only
// moves when the BROAD BODY rises while the IMPULSIVE peak-holders fall. Staging, relative to
// the QA-measured mix: body/beds/sections ×1.55 at the call layer (≈ ×2.8 vs the QA mix on the
// sustained mass — targets post-peak-norm I ≈ −13.5 LUFS), true-peak holders ×0.62 (impacts,
// kick, cymbal, clunk, glass, sub), and the crash tutti re-voiced toward SUSTAINED energy
// (braam/organ cluster/tam-tam/crowd/choir up ~×3, sub-thumps down) so it stays the clear peak
// at low crest. Waltz raised with the body. Waltz trimmed ~−1.5 dB to widen
// the crash-vs-waltz gap in the delivered mix.
//
// CLICK LAW (qa-audio.md D2): every noise-based onset starts with a 2–6 ms linear fade-in.
// Stock noise voices (hiss/crowd/glass/wind/flutter/riser/swell) are rebuilt below on
// kit.noise with micro-ramped envelopes; custom voices (organ chiff, key click, harp, metal
// ring, tam-tam, timpani) ramp from 0.0001 — no un-ramped steps out of digital silence.
import {
  DUR, SECTION, BAR, BEAT, barStart, beatT, filmT,
  SILENCES,
  OVERTURE_EV, REHEARSAL_EV, MIRROR_EV, LAIR_BEATS,
  MASQ_EV, MASQ_FREEZE, DUEL_EV, CHANDELIER_EV, CODA_EV,
} from './timeline.js';

export const AUDIO_SUGGEST = { seed: 1881, reverb: 1.4, reverbGain: 0.3, lufs: -14 };

// ---- motif tables (MIDI). PHANTOM(r): root, minor 2nd up, minor 3rd up, TRITONE reach, resolve
// down a semitone. D minor r=62 → D Eb F Ab G. C minor r=60 → C Db Eb Gb F.
const PHANTOM = (r) => [r, r + 1, r + 3, r + 6, r + 5];
// CHRISTINE(r): innocent diatonic rising SIXTH opening (F4→D5 = +9), then stepwise fall.
const CHRISTINE = (r) => [r, r + 9, r + 7, r + 4];

export default function score(kit) {
  // ---- QA round 2 gain staging (applied once, here) ----------------------------------------
  // BODY raises every bed/section voice; TP_CUT pulls down the true-peak holders so the
  // peak-normalized mix has room for the loudnorm linear path. Customs scale their own g by
  // BODY inside their factories; stock instruments are staged through this proxy.
  const BODY = 2.5, TP_CUT = 0.62;
  const TP_HOLDERS = new Set(['impact', 'kick', 'crash', 'clunk', 'glass', 'sub']);
  const PASS = new Set(['braam']);   // crash-only voice: its call args are already staged
  const GAIN_ARG = {
    kick: 1, clap: 1, hat: 1, crash: 1, bass: 3, pluck: 2, pad: 3, bell: 2, impact: 1,
    riser: 2, sweepDown: 4, tick: 1, blip: 2, glitch: 2, drone: 3, braam: 3, taiko: 1,
    strings: 3, choir: 3, piano: 2, sub: 1, swell: 2, rain: 2, thunder: 1, wind: 2,
    glass: 1, clunk: 1, hiss: 2, heartbeat: 1, crowd: 2, whoosh: 2, flutter: 2,
  };
  // EARLY: +12% on every section before the chandelier (the crash zone args are compensated
  // for BODY alone) — lifts integrated loudness without touching the tutti's peak.
  const EARLY = 1.12, EARLY_UNTIL = 80;
  const k = new Proxy(kit, {
    get(o, name) {
      const gi = GAIN_ARG[name];
      if (gi === undefined) return o[name];
      return (...a) => {
        if (typeof a[gi] === 'number' && !PASS.has(name)) {
          const tp = TP_HOLDERS.has(name);
          const t0 = a[0];
          const early = !tp && !PASS.has(name) && typeof t0 === 'number' && (t0 < 54 || (t0 >= 68 && t0 < EARLY_UNTIL)) ? EARLY : 1;
          a[gi] = a[gi] * (tp ? TP_CUT : BODY * early);
        }
        return o[name](...a);
      };
    },
  });

  // QA-final P1 (verified by waveform on partial renders): single-sample ticks at voice
  // onsets persist regardless of the GAIN-node envelope, so the amplitude guarantee lives in
  // the BUFFER DATA itself. mkNoiseBaked bakes clipped noise with the full envelope (attack,
  // hold, exponential tail, optional per-sample modulator) into the buffer: no sample can
  // exceed `peak` through any path.
  const mkNoiseBaked = (t, dur, peak, { atk = 0.004, hold = 0.6, fadeOut = 0.08, mod = null } = {}) => {
    const sr = k.ac.sampleRate || 48000;
    const len = Math.max(1, Math.ceil(sr * dur));
    const buf = k.ac.createBuffer(1, len, sr);
    const ch = buf.getChannelData(0);
    const atkS = Math.max(1, atk * sr), holdS = hold * len, tailS = Math.max(1, fadeOut * sr);
    for (let i = 0; i < len; i++) {
      let a = Math.min(1, i / atkS);
      if (i > holdS) a *= Math.exp(-4.5 * (i - holdS) / Math.max(1, len - holdS));
      if (len - i < tailS) a *= (len - i) / tailS;
      if (mod) a *= mod(i / sr);
      const v = (k.R() * 2 - 1) * 0.9;
      ch[i] = (v > 0.5 ? 0.5 : v < -0.5 ? -0.5 : v) * a * peak;
    }
    const src = k.ac.createBufferSource();
    src.buffer = buf;
    src.start(t);
    src.stop(t + dur);
    return src;
  };
  const flatBus = (peak, voice) => {
    const bus = k.ac.createGain(); bus.gain.value = 1; bus.__peak = peak; bus.__voice = voice;
    return bus;
  };
  // ================= custom voices (all inside kit.at; never a raw osc to the bus) ============

  // THE PIPE ORGAN (centerpiece). Additive: fundamental + sine partials 2/3/4 (octave, fifth,
  // super-octave mixture), slow attack, chiff = bright partial burst (~80 ms, faded in 3 ms) +
  // quiet key click (2 ms fade), full range (no lowpass). bus.__peak/__voice are inert expandos.
  const organ = (t, midi, dur, { g = 0.08, send = 0.42, pan = 0, width = 0.6,
                                 atk = 0.12, chiff = 0.5, bright = 1 } = {}) => k.at(t, () => {
    g *= BODY * (((t < 54) || (t >= 68 && t < EARLY_UNTIL)) ? EARLY : 1);
    const f = k.hz(midi);
    g *= t < EARLY_UNTIL ? EARLY : 1;
    const bus = k.ac.createGain(); bus.gain.value = 1; bus.__peak = g; bus.__voice = 'organ';
    const env = k.ac.createGain();                       // slow sustain envelope
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(g, t + atk);
    env.gain.setValueAtTime(g, t + Math.max(atk + 0.01, dur * 0.85));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    const W = [1, 0.42 * bright, 0.26 * bright, 0.15 * bright];
    for (let i = 0; i < 4; i++) {
      const o = k.osc('sine', f * (i + 1), t, dur + 0.3);
      const pg = k.ac.createGain(); pg.gain.value = W[i];
      o.connect(pg).connect(env);
    }
    env.connect(bus);
    // chiff: 60–90 ms bright partial burst, faded in 3 ms (no step), bypasses the slow attack.
    // Level 0.75·g (QA P2: raised from 0.5 — onset HF was +4.3 dB, spec ≥ 6 dB).
    const ch = k.osc('sine', f * 6, t, 0.1);
    const cg = k.ac.createGain();
    cg.gain.setValueAtTime(0.0001, t);
    cg.gain.linearRampToValueAtTime(g * 0.75 * chiff, t + 0.003);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
    ch.connect(cg).connect(bus);
    // quiet key click, baked (no step possible)
    const n = mkNoiseBaked(t, 0.03, g * 0.15, { atk: 0.002, hold: 0.3, fadeOut: 0.008 });
    const hp = k.ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
    n.connect(hp).connect(bus);
    k.out(bus, 1, send, pan, width);
  });
  const organChord = (t, midis, dur, o = {}) => midis.forEach((m, i) =>
    organ(t, m, dur, { ...o, pan: (o.pan ?? 0) + (midis.length > 1 ? (i / (midis.length - 1) - 0.5) * 0.5 : 0) }));

  // Harp (custom pluck voice: sine + slightly sharp 2nd partial, 2 ms fade-in, fast decay).
  const harpN = (t, midi, { g = 0.045, dur = 0.25, pan = 0 } = {}) => k.at(t, () => {
    g *= BODY * (((t < 54) || (t >= 68 && t < EARLY_UNTIL)) ? EARLY : 1);
    const f = k.hz(midi);
    const bus = k.ac.createGain(); bus.__peak = g; bus.__voice = 'harp';
    for (const [m, w] of [[1, 1], [2.003, 0.3]]) {
      const o = k.osc('sine', f * m, t, dur);
      const eg = k.ac.createGain();
      eg.gain.setValueAtTime(0.0001, t);
      eg.gain.linearRampToValueAtTime(g * w, t + 0.002);
      eg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(eg).connect(bus);
    }
    k.out(bus, 1, 0.35, pan, 0);
  });
  const harpGliss = (t0, midis, step = 0.06, accel = 1, opts = {}) => {
    let t = t0, st = step;
    for (const m of midis) { harpN(t, m, opts); t += st; st *= accel; }
  };

  // Gondola water lap: lowpassed noise pat (starts from 0.0001 — no step).
  const waterLap = (t, { g = 0.045, dur = 0.9 } = {}) => k.at(t, () => {
    g *= BODY * (((t < 54) || (t >= 68 && t < EARLY_UNTIL)) ? EARLY : 1);
    const n = mkNoiseBaked(t, dur, g, { atk: dur * 0.4, hold: 0.55, fadeOut: 0.15 });
    const lp = k.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 0.6;
    const bus = flatBus(g, 'water');
    n.connect(lp).connect(bus); k.out(bus, 1, 0.4, (k.R() - 0.5) * 0.7, 0.4);
  });

  // ---- noise-stock replacements (QA D2): the kit's hiss/crowd/glass/wind/flutter/riser/swell
  // start un-ramped; these rebuild each on kit.noise with 3–6 ms fade-ins. ----
  const hissF = (t, dur, g = 0.12, fade = 0.006) => k.at(t, () => {
    g *= BODY * (((t < 54) || (t >= 68 && t < EARLY_UNTIL)) ? EARLY : 1);
    const n = mkNoiseBaked(t, dur, g, { atk: fade, hold: 0.6, fadeOut: 0.1 });
    const bus = flatBus(g, 'hiss');
    n.connect(bus); k.out(bus, 1, 0.25, (k.R() - 0.5) * 0.4, 0);
  });
  const crowdF = (t0, t1, g = 0.15) => k.at(t0, () => {
    g *= BODY * (t0 < EARLY_UNTIL ? EARLY : 1);
    const n = mkNoiseBaked(t0, t1 - t0, g, { atk: 0.05, hold: 0.7, fadeOut: 0.15 });
    const bp = k.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 0.35;
    const bus = flatBus(g, 'crowd');
    n.connect(bp).connect(bus); k.out(bus, 1, 0.3, 0, 0.6);
  });
  const glassF = (t, g = 0.3, spread = 1.4) => k.at(t, () => {
    g *= BODY * (((t < 54) || (t >= 68 && t < EARLY_UNTIL)) ? EARLY : 1);
    const bus = k.ac.createGain(); bus.__peak = g; bus.__voice = 'glass';
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.04 * spread * (0.6 + k.R() * 0.8);
      const n = mkNoiseBaked(tt, 0.55, g * 0.6, { atk: 0.003, hold: 0.25, fadeOut: 0.12 });
      const hp = k.ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2800 + i * 900;
      n.connect(hp).connect(bus);
    }
    k.out(bus, 1, 0.4, (k.R() - 0.5) * 0.5, 0.6);
  });
  const windF = (t0, t1, g = 0.15, f0 = 400, f1 = 1600) => k.at(t0, () => {
    g *= BODY * (t0 < EARLY_UNTIL ? EARLY : 1);
    const n = mkNoiseBaked(t0, t1 - t0, g, { atk: Math.min(0.8, (t1 - t0) * 0.3), hold: 0.75, fadeOut: 0.2 });
    const bp = k.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.5;
    bp.frequency.setValueAtTime(f0, t0); bp.frequency.linearRampToValueAtTime(f1, t1);
    const bus = flatBus(g, 'wind');
    n.connect(bp).connect(bus); k.out(bus, 1, 0.3, 0, 0.5);
  });
  const flutterF = (t0, t1, g = 0.12) => k.at(t0, () => {
    g *= BODY * (t0 < EARLY_UNTIL ? EARLY : 1);
    const period = 1 / 17;
    const n = mkNoiseBaked(t0, t1 - t0, g, { atk: 0.005, hold: 0.9, fadeOut: 0.1,
      mod: (ts) => ((ts % period) < period / 2 ? 1 : 0.15) });   // 17 Hz gate baked in
    const bus = flatBus(g, 'flutter');
    n.connect(bus); k.out(bus, 1, 0.25, 0, 0.3);
  });
  const riserF = (t0, t1, g = 0.18) => k.at(t0, () => {
    g *= BODY * (t0 < EARLY_UNTIL ? EARLY : 1);
    const dur = t1 - t0;
    const bus = k.ac.createGain(); bus.__peak = g; bus.__voice = 'riser';
    const n = mkNoiseBaked(t0, dur, g * 0.7, { atk: dur * 0.85, hold: 1.0, fadeOut: 0.05 });
    const bp = k.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(300, t0); bp.frequency.linearRampToValueAtTime(7000, t1);
    n.connect(bp).connect(bus);
    const o = k.osc('sawtooth', 110, t0, dur + 0.05);
    o.frequency.setValueAtTime(110, t0); o.frequency.linearRampToValueAtTime(880, t1);
    const og = k.ac.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.linearRampToValueAtTime(0.3, t0 + dur * 0.85);
    og.gain.linearRampToValueAtTime(0.0001, t1);
    o.connect(og).connect(bus);
    k.out(bus, 1, 0.25, 0, 0);
  });
  const swellF = (t0, t1, g = 0.25) => k.at(t0, () => {
    g *= BODY * (t0 < EARLY_UNTIL ? EARLY : 1);
    const dur = t1 - t0;
    const n = mkNoiseBaked(t0, dur, g, { atk: dur * 0.95, hold: 1.0, fadeOut: 0.03 });
    const hp = k.ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4500;
    const bus = flatBus(g, 'swell');
    n.connect(hp).connect(bus); k.out(bus, 1, 0.35, 0, 0.4);
  });

  // Sword metal ring: inharmonic sine cluster (2 ms fade-in per partial), rings out through a
  // hit-stop freeze.
  const metalRing = (t, { g = 0.2, base = 1180, dur = 1.2 } = {}) => k.at(t, () => {
    g *= BODY * (((t < 54) || (t >= 68 && t < EARLY_UNTIL)) ? EARLY : 1);
    const bus = k.ac.createGain(); bus.__peak = g; bus.__voice = 'ring';
    const R = [1, 2.756, 5.404, 8.933], W = [1, 0.5, 0.3, 0.2], D = [1, 0.7, 0.45, 0.3];
    R.forEach((r, i) => {
      const o = k.osc('sine', base * r * (1 + (k.R() - 0.5) * 0.004), t, dur);
      const eg = k.ac.createGain();
      eg.gain.setValueAtTime(0.0001, t);
      eg.gain.linearRampToValueAtTime(g * W[i], t + 0.002);
      eg.gain.exponentialRampToValueAtTime(0.0001, t + dur * D[i]);
      o.connect(eg).connect(bus);
    });
    k.out(bus, 1, 0.3, (k.R() - 0.5) * 0.6, 0);
  });

  // Bowed-saw scrape (parry / draw): narrow bandpass noise sweep, ramps from 0.0001.
  const scrape = (t, dur, { g = 0.08, f0 = 2800, f1 = 5400, q = 6 } = {}) => k.at(t, () => {
    g *= BODY * (((t < 54) || (t >= 68 && t < EARLY_UNTIL)) ? EARLY : 1);
    const n = mkNoiseBaked(t, dur + 0.05, g, { atk: dur * 0.3, hold: 0.6, fadeOut: 0.1 });
    const bp = k.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.linearRampToValueAtTime(f1, t + dur);
    const bus = flatBus(g, 'scrape');
    n.connect(bp).connect(bus); k.out(bus, 1, 0.2, 0.2, 0);
  });

  // Toy flute (waltz melody): sine + soft 2nd partial, breath noise, late vibrato.
  const flute = (t, midi, dur, { g = 0.05, pan = -0.1 } = {}) => k.at(t, () => {
    g *= BODY * (((t < 54) || (t >= 68 && t < EARLY_UNTIL)) ? EARLY : 1);
    const f = k.hz(midi);
    const a = k.ac.createGain(); a.__peak = g; a.__voice = 'flute';
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.06);
    a.gain.setValueAtTime(g, t + dur * 0.8);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    const o = k.osc('sine', f, t, dur + 0.1);
    const o2 = k.osc('sine', f * 2, t, dur + 0.1);
    const g2 = k.ac.createGain(); g2.gain.value = 0.12;
    o.connect(a); o2.connect(g2).connect(a);
    const lfo = k.osc('sine', 5.2, t, dur + 0.1);
    const lg = k.ac.createGain();
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(5, t + Math.min(0.25, dur * 0.5));
    lfo.connect(lg); lg.connect(o.detune);
    const n = mkNoiseBaked(t, Math.min(0.12, dur), g * 0.15, { atk: 0.004, hold: 0.7, fadeOut: 0.03 });
    const bp = k.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 1;
    const bus = flatBus(g * 0.15, 'flutebreath');
    n.connect(bp).connect(bus);
    k.out(bus, 1, 0.25, pan, 0.2);
    k.out(a, 1, 0.25, pan, 0.2);
  });

  // Chandelier creak (sawtooth pitch drop through a narrow bandpass; ramps from 0.0001).
  const creak = (t, { g = 0.05, dur = 0.5 } = {}) => k.at(t, () => {
    g *= BODY * (((t < 54) || (t >= 68 && t < EARLY_UNTIL)) ? EARLY : 1);
    const o = k.osc('sawtooth', 92, t, dur);
    o.frequency.setValueAtTime(92, t); o.frequency.exponentialRampToValueAtTime(64, t + dur);
    const bp = k.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 260; bp.Q.value = 9;
    const a = k.ac.createGain(); a.__peak = g; a.__voice = 'creak';
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.1);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(bp).connect(a); k.out(a, 1, 0.3, -0.3, 0);
  });

  // Timpani (custom): triangle-bass drop + thump noise, 2–3 ms fade-ins (peak ≈ 0.2 rule).
  const timpani = (t, { g = 0.2, f = 70, dur = 0.9 } = {}) => k.at(t, () => {
    g *= BODY * (((t < 54) || (t >= 68 && t < EARLY_UNTIL)) ? EARLY : 1);
    const bus = k.ac.createGain(); bus.__peak = g; bus.__voice = 'timpani';
    const o = k.osc('triangle', f, t, dur + 0.1);
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.78, t + 0.18);
    const a = k.ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g * 0.9, t + 0.003);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a).connect(bus);
    const n = mkNoiseBaked(t, 0.06, g * 0.5, { atk: 0.002, hold: 0.3, fadeOut: 0.03 });
    const lp = k.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
    n.connect(lp).connect(bus);
    k.out(bus, 1, 0.25, 0, 0);
  });

  // Tam-tam (custom): 6-partial inharmonic clang (2 ms fade-in per partial) + noise sheen.
  const tamTam = (t, { g = 0.2, dur = 3 } = {}) => k.at(t, () => {
    g *= BODY * (((t < 54) || (t >= 68 && t < EARLY_UNTIL)) ? EARLY : 1);
    const bus = k.ac.createGain(); bus.__peak = g; bus.__voice = 'tamtam';
    [1, 1.53, 2.31, 3.17, 4.42, 5.83].forEach((r, i) => {
      const o = k.osc('sine', 82 * r, t, dur);
      const eg = k.ac.createGain();
      eg.gain.setValueAtTime(0.0001, t);
      eg.gain.linearRampToValueAtTime(g * 0.5 * Math.pow(0.72, i), t + 0.002);
      eg.gain.exponentialRampToValueAtTime(0.0001, t + dur * Math.pow(0.8, i));
      o.connect(eg).connect(bus);
    });
    const n = mkNoiseBaked(t, dur * 0.5, g * 0.3, { atk: 0.02, hold: 0.3, fadeOut: 0.2 });
    const bp = k.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.4;
    n.connect(bp).connect(bus);
    k.out(bus, 1, 0.45, 0, 0.3);
  });

  // ---- helpers -----------------------------------------------------------------
  // Hard silences are LAW: nothing may ONSET inside a scored silence window.
  const inSilence = (t) => SILENCES.some(s => t >= s.from - 1e-6 && t < s.to - 1e-6);
  const cue = (t, fn) => { if (!inSilence(t)) fn(t); };   // guard for grid-derived cues

  // ---- film-time constants (EVERY number from timeline.js) ----------------------
  const T = {
    match:    filmT(OVERTURE_EV.matchStrike),        // 1.5
    title:    filmT(OVERTURE_EV.titleIn),            // 3.0
    bloom:    filmT(OVERTURE_EV.bloom),              // 6.0
    place:    filmT(OVERTURE_EV.placeCard),          // 7.5
    carlotta: filmT(REHEARSAL_EV.carlottaScale),     // 12.75
    bustle:   filmT(REHEARSAL_EV.bustle),            // 14.25
    crash:    filmT(REHEARSAL_EV.backdropCrash),     // 18.0 (STOP)
    gaspR:    filmT(REHEARSAL_EV.gasp),              // 18.75
    whisper:  filmT(REHEARSAL_EV.whisper),           // 19.5
    christineIn: filmT(MIRROR_EV.christineIn),       // 24.75
    softSong: filmT(MIRROR_EV.softSong),             // 25.5
    flames:   filmT(MIRROR_EV.flamesLean),           // 28.5
    glassGlow: filmT(MIRROR_EV.glassGlow),           // 30.0
    faceFade: filmT(MIRROR_EV.faceFade),             // 31.5
    hand:     filmT(MIRROR_EV.handExtend),           // 33.0
    sheSteps: filmT(MIRROR_EV.sheSteps),             // 33.75
    touch:    filmT(MIRROR_EV.mirrorTouch),          // 34.5
    iris:     filmT(MIRROR_EV.irisClose),            // 35.25
    gondola:  filmT(LAIR_BEATS.gondolaIn),           // 37.5
    rises:    LAIR_BEATS.candleRise.map(filmT),      // 39.0 / 39.75 / 40.5 / 41.25
    swell:    filmT(LAIR_BEATS.organSwell),          // 42.0
    entranced: filmT(LAIR_BEATS.entranced),          // 43.5
    peak:     filmT(LAIR_BEATS.organPeak),           // 48.0
    descent:  filmT(LAIR_BEATS.descent),             // 51.0
    waltzIn:  filmT(MASQ_EV.waltzIn),                // 54.0
    confetti: filmT(MASQ_EV.confetti),               // 54.75
    break_:   filmT(MASQ_EV.masqBreak),              // 60.0
    freeze:   filmT(MASQ_FREEZE),                    // 61.0
    descend:  filmT(MASQ_EV.phantomDescend),         // 63.0
    release:  filmT(MASQ_EV.waltzRelease),           // 65.0
    circle:   filmT(DUEL_EV.circle),                 // 68.75
    draw:     filmT(DUEL_EV.swordsDraw),             // 71.0
    clash1:   filmT(DUEL_EV.clash1),                 // 72.5 (STOP)
    parry:    filmT(DUEL_EV.parry),                  // 73.625
    clash2:   filmT(DUEL_EV.clash2),                 // 75.5 (STOP)
    cane:     filmT(DUEL_EV.caneKnock),              // 76.625
    mask:     filmT(DUEL_EV.maskOff),                // 77.0
    swirl:    filmT(DUEL_EV.vanishSwirl),            // 77.75
    done:     filmT(DUEL_EV.vanishDone),             // 79.25
    above:    filmT(CHANDELIER_EV.phantomAbove),     // 80.5
    snap:     filmT(CHANDELIER_EV.cableSnap),        // 82.0 (STOP)
    swing:    filmT(CHANDELIER_EV.swingPeak),        // 83.5
    plunge:   filmT(CHANDELIER_EV.plunge),           // 84.0
    chanCrash: filmT(CHANDELIER_EV.chandelierCrash), // 86.0 (STOP)
    dust:     filmT(CHANDELIER_EV.dustSettle),       // 88.0
    smoke:    filmT(CODA_EV.smokeClear),             // 90.75
    throne:   filmT(CODA_EV.throneReveal),           // 91.5
    gutter:   filmT(CODA_EV.candleGutter),           // 94.5
    irisBlack: filmT(CODA_EV.irisBlack),             // 95.25
  };

  // ===========================================================================
  // A. OVERTURE (0–12) — 80 BPM 4/4, D minor. Candle → title → house reveal.
  //    No percussion: candle and velvet only. Stone-room sends.
  // ===========================================================================
  const PED_END = SILENCES[0].from - 0.9;                  // pedal tapers away before the silence
  hissF(T.match - 0.95, 0.8, 0.09, 0.03);   // match scrape: 30 ms baked fade-in from silence   // 30 ms ramp in digital silence                        // match scrape foley (faded in 4 ms)
  k.tick(T.match, 0.09, 3400);                             // the strike itself
  k.bell(T.match + 0.03, 2637, 0.1, 0.7, 4, 2);            // celesta-ish ping as the candle catches
  // pedal D fifth fades in under the flame
  organ(T.match, 38, PED_END - T.match, { g: 0.13, atk: 1.2, width: 0.5, chiff: 0.2 });
  organ(T.match + 0.05, 45, PED_END - 0.05 - T.match, { g: 0.1, atk: 1.2, width: 0.5, chiff: 0.2 });
  organ(T.title, 50, 2.9, { g: 0.11, atk: 0.5 });          // title: add the octave, two voices
  k.choir(T.title, [62, 69], 2.8, 0.06, 'o', 1.2, 1.5);    // choir 'o' pp
  organ(T.bloom, 53, 3.0, { g: 0.1, atk: 0.4 });           // bloom: full Dm colour
  organ(T.bloom, 57, 3.0, { g: 0.09, atk: 0.4 });
  k.choir(T.bloom, [62, 65, 69], 2.9, 0.09, 'a', 0.8, 1.6);
  harpGliss(T.bloom, [50, 57, 62, 65, 69, 74], 0.055, 1.04, { g: 0.07 });   // the house reveals
  k.bell(T.place, 1174.7, 0.09, 2.2);                      // place card: one chime over the pedal
  // Phantom motif, first statement pp (foreshadow) — ascending phrygian, tritone resolves down
  const ovM = PHANTOM(62), ovD = [0.6, 0.6, 0.6, 0.75, 0.45];
  { let t = barStart('overture', 3); for (let i = 0; i < ovM.length; i++) {   // bar 4 downbeat
      organ(t, ovM[i], ovD[i], { g: 0.09, atk: 0.06, bright: 0.8, chiff: 0.8 }); t += ovD[i]; } }

  // ===========================================================================
  // B. REHEARSAL (12–24) — 80 BPM 4/4, A minor turn. Carlotta's coloratura (comic),
  //    THE BACKDROP CRASH, the whisper. Hard silence 17.25–18.0.
  // ===========================================================================
  k.strings(barStart('rehearsal', 0), [57, 64, 69], 2.6, 0.07, 0.5, 0.4);   // pulse restarts
  harpGliss(barStart('rehearsal', 0), [45, 52, 57, 60], 0.08, 1, { g: 0.06 });   // harp restart
  // Carlotta: comic square-blip coloratura. Bar 1 = rising arpeggio from her pickup; bar 2
  // climbs denser and higher — and is CUT by the hard silence before the crash.
  const ARPS = [
    { notes: [69, 72, 76, 81], t0: T.carlotta, step: BEAT.rehearsal },
    { notes: [72, 76, 79, 84, 88], t0: barStart('rehearsal', 1), step: BEAT.rehearsal / 2 },
  ];
  ARPS.forEach(({ notes, t0, step }) => notes.forEach((m, i) =>
    cue(t0 + i * step, (t) =>
      k.blip(t, k.hz(m), 0.06 + i * 0.008, 0.08, 'square'))));
  k.strings(T.carlotta, [69], 1.3, 0.05, 0.1, 0.2);
  k.strings(barStart('rehearsal', 1), [60, 64, 67], 2.1, 0.055, 0.5, 0.25); // cut before the silence
  // stagehand bustle: pizzicato walk + boot ticks
  [45, 40, 45, 47].forEach((m, i) => k.pluck(T.bustle + i * BEAT.rehearsal, m, 0.11, 700, 0.22, 'triangle'));
  [0, 0.2, 0.4, 0.6].forEach(d => k.tick(T.bustle + d, 0.05, 1800));
  // HARD SILENCE 17.25–18.0 (timeline SILENCES[0]) — nothing onsets there; preCrash is visual.
  // BACKDROP CRASH — lands at the freeze start, boom rings through the 0.25 s stop.
  k.impact(T.crash, 0.5, 45);
  k.crash(T.crash + 0.02, 0.12);
  tamTam(T.crash + 0.05, { g: 0.092, dur: 2.2 });
  // the ascending motif inverted, quiet, wrong on purpose (contour inversion with tritone)
  [50, 49, 47, 45].forEach((m, i) =>
    organ(T.crash + 0.05 + i * 0.32, m, 0.3, { g: 0.075, atk: 0.03, bright: 0.7, chiff: 1 }));
  k.choir(T.gaspR, [69, 76, 81], 0.5, 0.075, 'a', 0.02, 0.35);   // chorus gasp: choked chord
  crowdF(T.gaspR - 0.05, T.gaspR + 0.85, 0.076);                  // audience gasp foley
  k.strings(T.gaspR, [57, 64], 1.5, 0.05, 0.3, 0.4);             // strings resume pp
  k.drone(T.whisper, barStart('rehearsal', 4) - 0.4, [33, 45], 0.06, 300);    // one low drone bed
  k.strings(barStart('rehearsal', 3), [45], 1.2, 0.06, 0.6, 0.5);            // solo cello, unresolved
  k.strings(barStart('rehearsal', 3) + 2 * BEAT.rehearsal, [47], 1.0, 0.06, 0.6, 0.6);

  // ===========================================================================
  // C. MIRROR (24–36) — 80 BPM 4/4, her key (F warmth), pp–mp. Duet motif; the organ
  //    answers early; SUSPEND at MIRROR_TOUCH (held chord, no attack), harp into the iris.
  // ===========================================================================
  k.piano(T.christineIn, 53, 0.1, 2.5);                    // felt piano, her room
  k.piano(T.christineIn, 65, 0.085, 2.5);
  k.strings(T.christineIn, [57, 65], 2.6, 0.05, 1.0, 1.0);
  const chM = CHRISTINE(65), chD = [1.2, 0.9, 0.9];        // F4 → D5 (rising sixth) → C5 → A4
  { let t = T.softSong; for (let i = 0; i < 3; i++) { k.piano(t, chM[i], 0.12, chD[i]); t += chD[i]; } }
  k.choir(T.softSong, [65, 74], 2.6, 0.05, 'u', 0.9, 1.2);
  // the organ answers a bar EARLY — her motif, octave down, dark (the flames lean on its entry)
  const anM = CHRISTINE(53), anD = [1.1, 0.75, 0.75, 1.1];
  { let t = T.flames; for (let i = 0; i < 4; i++) {
      organ(t, anM[i], anD[i], { g: 0.09, atk: 0.08, bright: 0.8, chiff: 0.9 }); t += anD[i]; } }
  organ(T.glassGlow, 38, T.iris - T.glassGlow - 0.05, { g: 0.085, atk: 0.8 });   // pedal D returns
  k.choir(T.faceFade, [45, 50, 53], 2.4, 0.05, 'u', 1.2, 1.4);   // male choir behind the glass
  k.strings(T.hand, [53, 57, 62], 2.6, 0.06, 0.7, 1.0);    // suspended 6-3 — HELD through the touch
  k.piano(T.sheSteps, 62, 0.07, 1.5);
  // MIRROR_TOUCH: no attack (the suspension carries it) — one harp gliss starts and lands on the iris
  harpGliss(T.touch, [50, 53, 57, 62, 65, 69, 74, 77], 0.1, 1.05, { g: 0.06 });

  // ===========================================================================
  // D. LAIR (36–54) — 80 BPM 4/4, C minor. THE CENTERPIECE: black-water drone → gondola →
  //    candelabra rises → THE ANTHEM OF THE BALD (organ ostinato + ascending phrygian theme,
  //    tritone resolution) → Christine's line over the ostinato → peak → descent.
  // ===========================================================================
  k.drone(SECTION.lair, T.swell, [36, 43], 0.075, 400);    // black water: sub drone, no rhythm
  waterLap(T.gondola, { g: 0.075 }); waterLap(T.gondola + 0.9, { g: 0.07 });
  waterLap(T.gondola + 1.8, { g: 0.07 }); waterLap(T.gondola + 2.7, { g: 0.06 });
  k.pluck(T.gondola, 48, 0.085, 600, 0.3, 'triangle');     // one oar stroke per bar
  k.pluck(T.gondola + 2 * BAR.lair, 43, 0.085, 600, 0.3, 'triangle');
  // candelabras rise ON their beats: harp gliss + bright organ single + tick, rising each beat
  const RISE_N = [60, 63, 67, 72];
  const RISE_G = [[55, 58, 60], [58, 60, 63], [60, 63, 67], [63, 67, 70]];
  T.rises.forEach((t, i) => {
    harpGliss(t, RISE_G[i], 0.06, 1, { g: 0.085 });
    organ(t, RISE_N[i], 1.4, { g: 0.12, atk: 0.06, chiff: 0.8, bright: 1 });
    k.tick(t, 0.1, 5200);
  });
  // THE ANTHEM OF THE BALD — bars 3–6. Pedal + rocking Eb/G ostinato + phrygian theme.
  organ(T.swell, 36, 9.0, { g: 0.13, atk: 0.3, width: 0.7 });             // C pedal 42–51
  const eighth = BEAT.lair / 2;
  for (let i = 0; T.swell + i * eighth < T.descent - 1e-6; i++)            // 24 eighths 42→51
    cue(T.swell + i * eighth, (t) => organ(t, i % 2 ? 39 : 43, 0.3,
      { g: 0.095, atk: 0.04, pan: i % 2 ? -0.28 : 0.28, chiff: 0.7 }));
  const MEL = PHANTOM(60), MEL_D = [0.75, 0.75, 0.75, 1.5, 1.5];
  const MEL2 = MEL.slice(0, 4), MEL2_D = [0.75, 0.75, 0.75, 0.75];
  const statement = (t0, notes, durs, g, bright, width) => {
    let t = t0;
    for (let i = 0; i < notes.length; i++) {
      organ(t, notes[i], durs[i], { g, atk: 0.05, bright, width, chiff: 0.7, pan: 0.12 });
      k.blip(t + 0.02, k.hz(notes[i]) * 3, 0.03, 0.06);    // pipe shimmer on the attack
      t += durs[i];
    }
    return t;
  };
  statement(T.swell, MEL, MEL_D, 0.17, 1.1, 0.6);          // statement 1 (bars 3–4)
  organChord(barStart('lair', 3) + 2 * BEAT.lair, [51, 58], 0.9, { g: 0.085, atk: 0.1 });   // false cadence
  statement(T.peak, MEL2, MEL2_D, 0.17, 1.2, 0.8);         // full statement (bar 5 peak)
  statement(T.peak, MEL2.map(m => m + 12), MEL2_D, 0.095, 1.2, 0.85);   // octave up
  k.choir(T.swell, [60, 63, 67], 3.4, 0.07, 'a', 0.7, 1.5);
  k.strings(T.swell, [48, 55, 60], 3.4, 0.06, 0.6, 1.0);
  k.choir(T.peak, [48, 55, 60, 63], 3.0, 0.085, 'a', 0.5, 1.4);
  k.strings(T.peak, [48, 55], 3.0, 0.075, 0.4, 0.8);
  tamTam(T.peak, { g: 0.1, dur: 2.6 });                   // tam-tam roll pp at the peak
  tamTam(T.peak + 1.5, { g: 0.068, dur: 2.0 });
  // Christine over the ostinato — the duet (her motif in C minor, diatonic)
  const duM = CHRISTINE(68), duD = [1.1, 0.75, 0.75, 1.4]; // Ab4 → F5 (rising sixth) → Eb5 → C5
  { let t = T.entranced; for (let i = 0; i < 4; i++) {
      k.strings(t, [duM[i]], duD[i], 0.07, 0.15, 0.3); t += duD[i]; } }
  k.choir(T.entranced, [68, 76], 2.6, 0.055, 'o', 0.6, 1.2);
  // descent — organ thins, harp leads out
  [[65, 0.7], [63, 0.7], [60, 0.6]].forEach(([m, d], i) =>
    organ(T.descent + i * 0.7, m, d, { g: 0.12, atk: 0.06, chiff: 0.6 }));
  [[51.0, 36], [51.75, 36], [52.5, 36]].forEach(([t, m]) =>                 // ostinato thins to quarters
    cue(t, (tt) => organ(tt, m, 0.28, { g: 0.085, atk: 0.04, chiff: 0.5 })));
  harpGliss(beatT('lair', 6, 4), [48, 51, 55, 60, 63, 67, 72], 0.06, 1.03, { g: 0.07 });
  organChord(SECTION.masquerade - 0.25, [36, 39, 43, 48], 0.22, { g: 0.085, atk: 0.03 }); // cut short

  // ===========================================================================
  // E. MASQUERADE (54–68) — 180 BPM 3/4, F major Viennese waltz, 1 s bars.
  //    Oom-pah-pah + flute; bar 7 break to snap pizz; freeze tableau; Red Death = low
  //    "wrong" organ fifth; terrified release; hard cut, rooftop starts cold.
  //    (QA staging: waltz trimmed ~−1.5 dB so the crash tutti owns the top of the mix.)
  // ===========================================================================
  const OOM = [41, 48];                                    // F2 / C3 alternating
  const PAH = [[65, 69, 72], [58, 62, 65], [60, 64, 67], [65, 69, 72]];  // F Bb C7 F
  const TUNE = [77, 81, 84, 84, 81, 77, 79, 81, 82, 81, 79, 77, 77, 79, 81, 82, 81, 79];
  for (let b = 0; b < 6; b++) {                            // bars 1–6: full waltz
    const t = T.waltzIn + b;                               // bar = 1 s exactly (BAR.masquerade)
    cue(t, (tt) => k.bass(tt, OOM[b % 2], 0.4, 0.128, 'triangle', 300));          // oom
    cue(t + BEAT.masquerade, (tt) =>                                               // pah-pah
      k.strings(tt, PAH[b % 4], 0.16, 0.025, 0.02, 0.05));
    cue(t + 2 * BEAT.masquerade, (tt) =>
      k.strings(tt, PAH[(b + 1) % 4], 0.16, 0.025, 0.02, 0.05));
    for (let beat = 0; beat < 3; beat++) cue(t + beat * BEAT.masquerade, (tt) =>
      flute(tt, TUNE[b * 3 + beat], 0.3, { g: 0.049 }));
    cue(t + 0.5, (tt) => k.bell(tt, 2093, 0.022, 0.4, 4, 2));   // confetti glock, off-beat
  }
  // bar 7: THE BREAK — waltz CUTS to a single snapped pizzicato, one beat of air, low drone
  k.clap(T.break_, 0.1);
  k.pluck(T.break_, 41, 0.1, 900, 0.25, 'triangle');
  [77, 72, 69].forEach((m, i) => k.pluck(T.break_ + (i + 1) * BEAT.masquerade, m, 0.06, 2400, 0.22));
  k.drone(T.break_ + 0.66, 64.8, [39], 0.05, 220);         // the wrong-in-F shadow underneath
  // bars 8–11: FREEZE tableau — solo pizz + snaps + creaking chandelier only
  for (let b = 7; b < 11; b++) {
    const t = T.freeze + (b - 7);
    cue(t, (tt) => k.pluck(tt, 41, 0.077, 900, 0.22, 'triangle'));
    cue(t + BEAT.masquerade, (tt) => k.clap(tt, 0.06));
  }
  creak(T.freeze + 0.2, { g: 0.08 }); creak(T.freeze + 1.4, { g: 0.07 }); creak(T.freeze + 2.6, { g: 0.08 });
  // bar 10: RED DEATH descends — low organ fifth, deliberately wrong in F (Eb–Bb over Ab)
  organ(T.descend, 39, 1.9, { g: 0.14, atk: 0.4, bright: 0.9, pan: -0.2, chiff: 0.3 });
  organ(T.descend, 46, 1.9, { g: 0.12, atk: 0.4, bright: 0.9, pan: 0.2, chiff: 0.3 });
  organ(T.descend + 0.2, 44, 1.7, { g: 0.075, atk: 0.5, bright: 0.8, chiff: 0.2 });
  k.taiko(T.descend, 0.25, 55);
  // bar 12: terrified waltz resumes — same tune, one voice lighter
  for (let b = 11; b < 14; b++) {
    const t = T.release + (b - 11);
    cue(t, (tt) => k.bass(tt, OOM[b % 2], 0.4, 0.128, 'triangle', 300));
    cue(t + BEAT.masquerade, (tt) => k.strings(tt, PAH[b % 4], 0.16, 0.025, 0.02, 0.05));
    for (let beat = 0; beat < 3; beat++) cue(t + beat * BEAT.masquerade, (tt) =>
      flute(tt, TUNE[(b - 11) * 3 + beat], 0.3, { g: 0.035 }));
    if (b >= 12) for (let e = 0; e < 6; e++) cue(t + e * BEAT.masquerade / 2, (tt) =>   // accelerando feel
      k.hat(tt, 0.026, 0.04));                                                             // (tempo stays 180)
  }
  // hard cut on the last downbeat — no ritardando; rooftop starts cold.

  // ===========================================================================
  // F. ROOFTOP (68–80) — 160 BPM 4/4, E minor duel. Strings ostinato + taiko; two clashes
  //    (each with a hard scored silence before); mask-off = choir gasp → heartbeat.
  // ===========================================================================
  windF(SECTION.rooftop, T.clash1 - 0.4, 0.075, 300, 900);   // moon wind (faded), cut pre-silence
  windF(T.clash1 + 0.1, T.clash2 - 0.5, 0.07, 300, 900);
  [[0, 1.2], [1, 1.2], [2, 1.05], [4, 1.05]].forEach(([b, d]) =>
    k.strings(barStart('rooftop', b), [52, 59, 64], d, 0.036, 0.3, 0.15));   // bed, ends before silences
  const OST = [40, 47, 52, 47, 40, 47, 55, 47];            // E B E B E B G B
  const SKIP = new Set();                                  // beats inside scored silences / on hits
  SILENCES.forEach(s => { for (let b = 0; b <= 64; b++) {
    const t = SECTION.rooftop + b * BEAT.rooftop;
    if (t >= s.from - 1e-6 && t < s.to + 1e-6) SKIP.add(b); } });
  for (let b = 0; SECTION.rooftop + b * BEAT.rooftop < T.mask - 1e-6; b++) {   // ostinato → mask-off
    const t = SECTION.rooftop + b * BEAT.rooftop;
    if (SKIP.has(b)) continue;
    cue(t, (tt) => k.pluck(tt, OST[b % 8], 0.05, 1800, 0.18));
  }
  [0, 1, 2, 4].forEach(b => cue(barStart('rooftop', b), (tt) => k.taiko(tt, 0.11, 60)));
  [T.circle, T.circle + 0.3, T.circle + 0.6].forEach(t => k.tick(t, 0.05, 1300));   // boot steps
  riserF(T.draw - 0.25, T.draw, 0.12);                     // swords draw: slide up + metallic tick
  k.tick(T.draw, 0.09, 6000);
  scrape(T.draw, 0.4, { g: 0.08 });
  // HARD SILENCES 72.125–72.5 and 75.125–75.5 — the duelling ostinato cuts into both.
  k.impact(T.clash1, 0.4, 90);
  metalRing(T.clash1, { g: 0.21, base: 1250, dur: 1.2 });  // ring-out rides the 0.15 s freeze
  k.crash(T.clash1 + 0.02, 0.1);
  scrape(T.parry, 0.5, { g: 0.1, f0: 3000, f1: 5600 });   // blade scrape, boots slide
  k.impact(T.clash2, 0.48, 80);
  metalRing(T.clash2, { g: 0.24, base: 990, dur: 1.4 });   // same recipe, bigger
  k.crash(T.clash2 + 0.02, 0.11);
  [1976, 1568, 1175, 988].forEach((f, i) =>                // cane spins away: comedy blip fall
    k.blip(T.cane + i * 0.125, f, 0.08 - i * 0.013, 0.09));
  k.clunk(T.cane, 0.28);
  k.choir(T.mask, [64, 71, 76, 80], 0.7, 0.1, 'a', 0.02, 0.4);   // CHOIR GASP at the reveal
  k.bell(T.mask, 2637, 0.07, 1.4);                         // moon-glint bell
  k.heartbeat(T.mask + 0.6, 0.17); k.heartbeat(T.mask + 1.2, 0.2); k.heartbeat(T.mask + 1.8, 0.25);
  flutterF(T.swirl, T.swirl + 0.85, 0.11);                 // cape swirl + bat-fog
  k.whoosh(T.swirl - 0.05, 0.7, 0.17, 400, 2800);
  organ(T.swirl, 40, 1.4, { g: 0.085, atk: 0.2, bright: 0.7, chiff: 0.3 });   // his root, faded
  organ(T.swirl, 45, 1.2, { g: 0.05, atk: 0.3, bright: 0.6, chiff: 0.2 });    // + the wrong 4th
  organ(T.done, 40, 2.0, { g: 0.1, atk: 0.5, bright: 0.7, chiff: 0.2 });      // lone low E root

  // ===========================================================================
  // G. CHANDELIER (80–90) — 120 BPM 4/4, C minor. Tam-tam swell → HARD SILENCE → snap →
  //    plunge (riser + accelerating harp) → HARD SILENCE → THE CRASH TUTTI (loudest moment
  //    by design) → shards → dust → unresolved dominant into the coda.
  // ===========================================================================
  swellF(80.1, 81.5, 0.2);                                 // tam-tam swell, ends AT the silence
  [[80.0, 0.45], [80.5, 0.45], [81.0, 0.4]].forEach(([t, d]) =>
    k.strings(t, [48, 55], d, 0.055, 0.04, 0.08));         // strings tremolo, cut before 81.5
  organ(T.above, 60, 0.4, { g: 0.085, atk: 0.05, chiff: 0.8, bright: 0.9 });   // motif, final form
  organ(T.above + 0.4, 61, 0.4, { g: 0.085, atk: 0.05, chiff: 0.8, bright: 0.9 });   // pp fragment
  organ(T.above + 0.8, 63, 0.18, { g: 0.075, atk: 0.05, chiff: 0.8, bright: 0.9 });
  // HARD SILENCE 81.5–82.0 — even the tremolo cuts.
  k.clunk(T.snap, 0.4);                                    // CABLE SNAP: pluck lands at the freeze
  k.pluck(T.snap, 88, 0.12, 4000, 0.3);
  k.blip(T.snap, 3200, 0.06, 0.08);
  creak(T.snap + 0.35, { g: 0.08 });
  k.strings(T.snap + 0.5, [51, 55], 0.9, 0.05, 0.2, 0.2);  // swing tension
  creak(T.snap + 0.9, { g: 0.07 });
  k.sweepDown(T.swing, 0.45, 1400, 300, 0.12, 'sine');     // widest swing: gliss down
  // THE PLUNGE — riser + falling shear + accelerating harp gliss; no beat during the fall.
  riserF(T.snap + 0.3, T.plunge, 0.2);
  k.sweepDown(T.plunge, 1.2, 2200, 200, 0.12, 'sawtooth');
  k.whoosh(T.plunge, 1.3, 0.26, 200, 3000);
  k.sub(T.plunge, 0.3, 80, 32, 1.4);
  harpGliss(T.plunge, [64, 65, 67, 68, 70, 72, 73, 75, 76, 78, 80, 81, 84], 0.065, 1.06, { g: 0.085 });
  // HARD SILENCE 85.5–86.0 — dead air, then:
  // THE CRASH TUTTI — the loudest moment of the film by a clear margin (staged: sustained
  // bodies boosted, impulse peaks shaved, so it survives the linear loudnorm path intact).
  k.impact(T.chanCrash, 0.73, 42);
  k.kick(T.chanCrash, 0.44);
  k.braam(T.chanCrash, [36, 43, 48], 2.6, 1.3, 1.0);
  organChord(T.chanCrash, [36, 43, 48, 51, 55, 60], 2.6, { g: 0.19, atk: 0.02, chiff: 1, width: 0.9 });
  k.strings(T.chanCrash, [48, 55], 2.6, 0.09, 0.02, 0.6);          // tutti strings bed
  k.choir(T.chanCrash, [48, 55, 60], 3.0, 0.09, 'a', 0.02, 0.9);   // tutti choir
  tamTam(T.chanCrash, { g: 0.78, dur: 3.8 });
  timpani(T.chanCrash, { g: 0.148, f: 70 });
  timpani(T.chanCrash + 0.05, { g: 0.116, f: 52 });
  glassF(T.chanCrash, 0.15, 1.6);
  k.crash(T.chanCrash, 0.19);
  crowdF(T.chanCrash + 0.05, 88.4, 0.44);                  // crowd panic through the freeze
  [3136, 3729, 4186].forEach((f, i) => k.bell(T.chanCrash + 0.02 + i * 0.02, f, 0.05, 0.5, 5, 2));
  glassF(T.chanCrash + 0.4, 0.116, 1.2);                    // shards
  [2793, 3322].forEach((f, i) => k.bell(T.chanCrash + 0.42 + i * 0.03, f, 0.04, 0.4, 5, 2));
  organ(T.dust, 36, 1.6, { g: 0.085, atk: 0.4, chiff: 0.3 });   // dust: broken pedal + drips
  hissF(T.dust + 0.4, 0.5, 0.05);
  k.tick(T.dust + 0.9, 0.05, 4200); k.tick(T.dust + 1.3, 0.04, 3800);
  k.strings(barStart('chandelier', 4) + 3 * BEAT.chandelier, [55, 59, 62], 0.5, 0.07, 0.15, 0.3);

  // ===========================================================================
  // H. CODA (90–96) — 80 BPM, D minor → D MAJOR Picardy. Solo choir + soft organ; the
  //    motif's three notes finally at rest; candle gutter; final held root. Intentional end.
  // ===========================================================================
  const CODA1 = barStart('coda', 0), CODA2 = barStart('coda', 1);
  organ(CODA1, 38, CODA2 - CODA1, { g: 0.095, atk: 0.6, chiff: 0.2 });   // the broken pedal settles
  organ(CODA1, 45, CODA2 - CODA1, { g: 0.07, atk: 0.6, chiff: 0.2 });
  organ(CODA1 + 0.1, 53, 1.3, { g: 0.055, atk: 0.7, chiff: 0.2 });       // D minor colour (F natural)
  k.choir(CODA1 + 0.4, [62, 65], 2.4, 0.07, 'u', 1.0, 1.5);               // solo choir, spent
  k.piano(T.smoke, 50, 0.15, 2.2);                             // felt piano enters
  k.piano(T.smoke, 65, 0.12, 2.2);
  organ(T.throne, 54, 2.6, { g: 0.07, atk: 0.5, chiff: 0.2 }); // PICARDY: F# — the turn lands
  k.choir(T.throne, [62, 66, 69], 2.6, 0.085, 'o', 0.8, 1.4);   // warm D major 'o'
  [62, 64, 66].forEach((m, i) => k.piano(T.throne + i * BEAT.coda, m, 0.085, 1.2));  // D–E–F#, at rest
  k.piano(CODA2, 38, 0.14, 1.8);                               // bar 2: piano alone
  k.piano(CODA2, 54, 0.1, 1.8);
  k.piano(CODA2, 57, 0.085, 1.8);
  hissF(T.gutter, 0.25, 0.08);                                 // the candle gutters — last sound
  k.tick(T.gutter + 0.05, 0.08, 2600);
  k.tick(T.gutter + 0.2, 0.05, 3100);
  // iris to black at T.irisBlack: NO music under the iris.
  k.piano(DUR - 0.4, 38, 0.14, 0.5);                           // final low D root under the end card
  k.sub(DUR - 0.4, 0.28, 60, 36, 0.4);                         // held, and STOP. Not a fade-loop.
}
