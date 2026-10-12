// "A CUT ABOVE" — original J-rock opening for the Remy Boys anime OP (46.05 s, A minor, 172 BPM).
// One timing truth: every onset is computed from timeline.js (B = one bar = 240/172 s, E8 = B/8).
// THE MOTIF (E5 D5 C5 A4 B4 C5 — a rising-falling resolve figure) binds the whole track:
//   cold open: solo piano statement → resolve: warm piano restatement → chorus: lead guitar up the
//   octave, harmonized in diatonic 3rds → end card: its last three notes softly on piano.
// Sections: cold / skyline / gleam / run / storm / resolve / slash / combo / leap / title.
import { T, B, RUN, STORM, SLASH, SLASH_CLOCK, COMBO, COMBO_CLOCK, LEAP, TITLE } from './timeline.js';

// The motif, and the diatonic 3rd-below harmony line that shadows MOTIF+12 in the chorus.
const MOTIF = [76, 74, 72, 69, 71, 72];
const HARM3 = [84, 83, 81, 77, 79, 81]; // under 88 86 84 81 83 84: C6 B5 A5 F5 G5 A5

export function score(kit) {
  const { ac, at, osc, noise, out, hz } = kit;

  // ---------- grid (computed from the bar; never hardcoded film seconds) ----------
  const BEAT = B / 4; // quarter note
  const E8 = B / 8; // eighth note = 30/172 s
  const S16 = B / 16; // sixteenth

  // ---------- voices ----------
  // Soft-clip curve for the guitar bus (cached Float32Array; the WaveShaper node itself is
  // created per note inside at() so node creation stays deferred).
  const gCurve = (() => {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) c[i] = Math.tanh(2.8 * (((i / (n - 1)) * 2) - 1));
    return c;
  })();
  // Distorted power chord: root + 5th + octave, 2 detuned saws (±8 cents) each, soft-clipped,
  // LPF ~3.5k, bus gain ~0.16 per chord voice, panned slightly right.
  const power = (t, root, dur, { g = 0.16, pan = 0.2, cut = 3500, mute = 0 } = {}) => at(t, () => {
    const pre = ac.createGain();
    pre.gain.value = 0.6;
    const ws = ac.createWaveShaper();
    ws.curve = gCurve;
    ws.oversample = '2x';
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = cut; lp.Q.value = 0.8;
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.008);
    a.gain.linearRampToValueAtTime(g * (mute ? 0.35 : 0.8), t + Math.max(0.014, dur * 0.7));
    a.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    for (const m of [root, root + 7, root + 12])
      for (const dt of [-8, 8]) {
        const o = osc('sawtooth', hz(m), t, dur + 0.06);
        o.detune.value = dt;
        o.connect(pre);
      }
    pre.connect(ws).connect(lp).connect(a);
    out(a, 1, 0.05, pan);
  });
  // Lead guitar/synth: 2 detuned saws + delayed vibrato, LPF, envelope, panned slightly left —
  // sits above the chugs. g ≈ 0.22–0.28 for the melody line.
  const lead = (t, m, dur, { g = 0.24, pan = -0.22, cut = 4200, send = 0.06 } = {}) => at(t, () => {
    const f = hz(m);
    const o1 = osc('sawtooth', f, t, dur + 0.08), o2 = osc('sawtooth', f, t, dur + 0.08);
    o1.detune.value = -6; o2.detune.value = 6;
    const v = osc('sine', 5.5, t, dur + 0.08), vg = ac.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(7, t + Math.min(0.3, dur));
    v.connect(vg); vg.connect(o1.detune); vg.connect(o2.detune);
    const mix = ac.createGain();
    mix.gain.value = 0.55;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = cut; lp.Q.value = 1;
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.012);
    a.gain.linearRampToValueAtTime(g * 0.78, t + Math.max(0.024, dur * 0.75));
    a.gain.linearRampToValueAtTime(0, t + dur + 0.03);
    o1.connect(mix); o2.connect(mix);
    mix.connect(lp).connect(a);
    out(a, 1, send, pan);
  });
  const tri = (t, m, dur, { g = 0.2, to = null } = {}) => at(t, () => {
    const o = osc('triangle', hz(m), t, dur + 0.03);
    if (to != null) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.setValueAtTime(g, t + Math.max(0.005, dur - 0.015));
    a.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(a);
    out(a, 1, 0.03);
  });
  const nz = (t, dur, { f = 4000, f1 = null, type = 'highpass', g = 0.12, q = 0.7, pan = 0, send = 0.04, atk = 0 } = {}) => at(t, () => {
    const n = noise(t, dur), flt = ac.createBiquadFilter();
    flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const a = ac.createGain();
    if (atk) { a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + atk); }
    else a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(flt).connect(a);
    out(a, 1, send, pan);
  });
  // Snare: filtered-noise crack + short falling tone snap.
  const snare = (t, g = 0.16) => {
    nz(t, 0.09, { f: 1900, type: 'bandpass', g, q: 0.9, send: 0.05 });
    tri(t, 56, 0.08, { g: g * 0.5, to: 110 });
  };
  // Sparse low tom (storm half-time).
  const triTom = (t, g = 0.15) => tri(t, 43, 0.28, { g, to: 50 });
  // Metallic "shing": highpassed noise burst + high sine cluster, fast decay.
  const shing = (t, g = 0.18) => {
    nz(t, 0.45, { f: 6500, type: 'highpass', g, q: 0.7, send: 0.06 });
    [2650, 3350, 3980].forEach((f, i) => at(t, () => {
      const o = osc('sine', f, t, 0.5);
      const a = ac.createGain();
      a.gain.setValueAtTime(0.0001, t);
      a.gain.exponentialRampToValueAtTime(g * 0.14, t + 0.004);
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.32 + i * 0.08);
      o.connect(a);
      out(a, 1, 0.3, i - 1);
    }));
  };
  // Comic pitch-drop "boing" for the flying goon.
  const boing = (t) => at(t, () => {
    const o = osc('square', 780, t, 0.55);
    o.frequency.exponentialRampToValueAtTime(170, t + 0.45);
    const lfo = osc('sine', 11, t, 0.55), lg = ac.createGain();
    lg.gain.value = 55;
    lfo.connect(lg).connect(o.frequency);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    const a = ac.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(0.07, t + 0.012);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(lp).connect(a);
    out(a, 1, 0.08, 0.3);
  });
  // One bar of full chorus band: kick 1&3 + off-beat 8th, snare 2&4, hats, power chords on
  // every 8th, straight-8th bass.
  const chorusBar = (t0, powRoot, bassRoot, openHat = 0) => {
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * E8;
      if (e === 0 || e === 4 || e === 7) kit.kick(t, e === 0 ? 0.52 : 0.4);
      if (e === 2 || e === 6) snare(t, 0.18);
      kit.hat(t, e % 2 ? 0.05 : 0.03, e % 2 && openHat ? 0.12 : 0.045);
      power(t, powRoot, E8 * 0.88, { g: 0.16 });
      kit.bass(t, bassRoot, E8 * 0.85, 0.24);
    }
  };

  // ================= COLD — solo piano states the motif (bars 0–2) =================
  kit.wind(T.cold, T.skyline, 0.05, 320, 720); // soft lonely wind bed
  kit.piano(T.cold, 45, 0.13, 3.2); // low A2 anchor, bar 1 beat 1
  {
    const offs = [0, 0.6, 1.1, 2.05, 3.1]; // sparse rubato-ish beat placements
    MOTIF.slice(0, 5).forEach((m, i) => kit.piano(T.cold + BEAT * offs[i], m, 0.15, 2.6));
    kit.piano(T.cold + B + BEAT * 0.3, MOTIF[5], 0.15, 2.8); // C5 resolve floats into bar 2
  }

  // ================= SKYLINE — feedback swell, first chugs, snare build (bars 2–4) =================
  nz(T.skyline, T.gleam - T.skyline, { f: 350, f1: 2600, type: 'bandpass', q: 1.1, g: 0.075, atk: 1.7 }); // filtered-noise feedback swell
  nz(3 * B, B, { f: 1200, f1: 4200, type: 'bandpass', q: 1.4, g: 0.05, atk: 0.9 }); // second layer, bar 2
  kit.pad(3 * B, [45, 52, 57], B + 0.05, 0.03, 900, 0.25); // low Am bed under the chugs
  for (let e = 0; e < 8; e++) power(3 * B + e * E8, 45, E8 * 0.6, { g: 0.11, pan: 0.25, mute: 1, cut: 1700 }); // palm-muted Am chugs
  for (let k = 0; k < 8; k++) snare(4 * B - 2 * BEAT + k * S16, 0.03 + (k / 7) * 0.13); // 16th roll crescendo, last half-bar
  kit.riser(T.gleam - B, T.gleam, 0.05);

  // ================= GLEAM — full band entry, driving power-chord riff (bars 4–6) =================
  kit.crash(T.gleam, 0.22); // crash + full band exactly at the cut
  shing(T.gleam, 0.17); // blade-gleam metallic shing
  kit.kick(T.gleam, 0.5);
  // bar 1: syncopated Am gallop on 16th positions
  for (const s of [0, 3, 6, 8, 11, 14]) power(4 * B + s * S16, 45, S16 * 1.7, { g: 0.15 });
  for (let e = 0; e < 8; e++) {
    const t = 4 * B + e * E8;
    if (e === 0 || e === 4 || e === 7) kit.kick(t, e === 0 ? 0.5 : 0.4);
    if (e === 2 || e === 6) snare(t, 0.16);
    kit.hat(t, e % 2 ? 0.045 : 0.028);
    kit.bass(t, 33, E8 * 0.85, 0.24);
  }
  // bar 2: Am → G → F → E descent, one chord per two eighths
  const DESC = [[45, 33], [45, 33], [43, 31], [43, 31], [41, 29], [41, 29], [40, 28], [40, 28]];
  DESC.forEach(([p, b], e) => {
    const t = 5 * B + e * E8;
    power(t, p, E8 * 0.82, { g: 0.16 });
    kit.bass(t, b, E8 * 0.85, 0.24);
    if (e === 0 || e === 4 || e === 6) kit.kick(t, 0.4);
    if (e === 2 || e === 6) snare(t, 0.16);
    kit.hat(t, e % 2 ? 0.045 : 0.028);
  });
  for (let k = 0; k < 4; k++) snare(6 * B - BEAT + k * S16, 0.08 + k * 0.025); // fill into the run
  kit.riser(T.run - BEAT, T.run, 0.07);

  // ================= RUN — full groove, Am F C G | Am F (Dm→E) (bars 6–12) =================
  kit.crash(T.run, 0.18);
  const RUNB = [ // per bar: bass root, power root, stab tones, clean arp
    { b: 33, p: 45, stab: [69, 76], arp: [57, 60, 64, 69] }, // Am
    { b: 29, p: 41, stab: [69, 77], arp: [53, 57, 60, 65] }, // F
    { b: 36, p: 48, stab: [67, 76], arp: [55, 60, 64, 67] }, // C
    { b: 31, p: 43, stab: [67, 79], arp: [55, 59, 62, 67] }, // G
    { b: 33, p: 45, stab: [69, 76], arp: [57, 60, 64, 69] }, // Am
    { b: 38, p: 50, stab: [69, 77], arp: [57, 62, 65, 69], // Dm,
      split: { e: 4, b: 40, p: 52, stab: [68, 76], arp: [56, 59, 64, 68] } }, // → E (dominant into storm)
  ];
  RUNB.forEach((c, bar) => {
    const t0 = (6 + bar) * B;
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * E8;
      const cc = c.split && e >= c.split.e ? c.split : c;
      if (e === 0 || e === 4 || e === 7) kit.kick(t, e === 0 ? 0.5 : 0.38); // kick 1&3 + off-beat 8th
      if (e === 2 || e === 6) snare(t, 0.17); // snare 2&4
      kit.hat(t, e % 2 ? 0.048 : 0.028); // straight 8th hats
      kit.bass(t, cc.b, E8 * 0.85, 0.24); // driving straight 8ths on the roots
      if (e === 0 || e === 4 || e === 7) power(t, cc.p, E8 * 0.6, { g: 0.12, pan: 0.25, mute: 1, cut: 1900 }); // chug locks with kick
      if (e === 1 || e === 3) cc.stab.forEach((m, i) => lead(t, m, 0.16, { g: 0.075 - i * 0.015, cut: 3000, pan: -0.15 })); // rhythmic stabs — melody saved
      if (e >= 4) kit.pluck(t, cc.arp[e - 4], 0.055, 3800, 0.2, 'triangle'); // clean arp answers beats 3–4
    }
  });
  RUN.jumps.forEach((j) => kit.whoosh(T.run + j, 0.5, 0.18, 400, 3400)); // roof-gap jumps
  [T.card1, T.card2, T.card3].forEach((ct) => { // name cards: bright double ping
    kit.blip(ct, 1320, 0.06, 0.06);
    kit.blip(ct + 0.07, 1980, 0.05, 0.08);
    nz(ct, 0.05, { f: 7000, g: 0.04 });
  });
  for (let k = 0; k < 6; k++) snare(12 * B - BEAT * 1.5 + k * S16, 0.06 + k * 0.02); // fill into the storm

  // ================= STORM — half-time dread, rain, thunder, Bdim tension (bars 12–16) =================
  kit.crash(T.storm, 0.16);
  kit.kick(T.storm, 0.5);
  kit.rain(T.storm, T.resolve + 1.5, 0.09); // rain bed, tail fades past the section line
  kit.drone(T.storm, T.resolve, [33, 45], 0.05, 320); // low A drone
  STORM.bolts.forEach((bt, i) => kit.thunder(T.storm + bt, 0.42 + i * 0.07, 3)); // each lightning bolt
  for (let bar = 0; bar < 4; bar++) {
    const t0 = (12 + bar) * B;
    const trem = bar < 2 ? [57, 60, 64] : [59, 62, 65]; // Am → Bdim rising tension
    const tg = bar < 2 ? 0.02 : 0.028;
    kit.kick(t0, 0.48); // half-time: kick on 1 only
    if (bar > 0) triTom(t0 + 6 * E8, 0.15); // sparse low tom
    for (let e = 0; e < 8; e++) kit.strings(t0 + e * E8, trem, E8 * 0.9, tg, 0.02, 0.12, 2100); // tremolo strings, 8ths
  }
  for (let k = 0; k < 16; k++) snare(15 * B + k * S16, 0.025 + (k / 15) * 0.14); // roll across the whole last bar
  kit.riser(T.resolve - 1.2 * B, T.resolve, 0.15); // long riser into resolve

  // ================= RESOLVE — warm motif, F G Am Am, heartbeat build (bars 16–20) =================
  const RESC = [[41, 48, 53, 57, 60], [43, 50, 55, 59, 62], [45, 52, 57, 60, 64], [45, 52, 57, 60, 64]]; // F G Am Am
  RESC.forEach((ch, bar) => kit.strings(T.resolve + bar * B, ch, B * 1.02, 0.04, 0.5, 0.9, 2400));
  kit.bell(T.resolve, 880, 0.05, 1.5); // sun cracks through — soft A5 chime
  kit.piano(T.resolve, 41, 0.13, 3); // low F anchor
  MOTIF.forEach((m, i) => { // the motif restated warmly, straighter than the cold open
    const [bt, ln] = [[0, 1.6], [1, 0.9], [2, 1.8], [4, 0.9], [5, 0.9], [6, 2.6]][i];
    kit.piano(T.resolve + bt * BEAT, m, 0.15, Math.min(2.8, ln * BEAT + 1));
  });
  for (let e = 0; e < 8; e++) { // build: kick heartbeat-8ths from bar 3
    kit.kick(18 * B + e * E8, e % 2 ? 0.24 : 0.42);
    kit.kick(19 * B + e * E8, e % 2 ? 0.3 : 0.48);
    if (e === 2 || e === 6) snare(19 * B + e * E8, 0.15);
  }
  for (let k = 0; k < 8; k++) snare(20 * B - 2 * BEAT + k * S16, 0.07 + k * 0.018); // drum fill, last half-bar
  kit.riser(T.slash - 2 * BEAT, T.slash, 0.13);
  kit.crash(T.slash, 0.26); // BIG crash exactly at T.slash

  // ================= SLASH — CHORUS I: Am F C, the motif in 3rds (bars 20–23) =================
  [[45, 33], [41, 29], [48, 36]].forEach(([p, b], bar) => { // A2 / F2 / C3 power roots
    const t0 = (20 + bar) * B;
    kit.crash(t0, 0.17);
    chorusBar(t0, p, b);
  });
  [[0, 0, 1.75], [0, 1, 0.9], [0, 2, 1.9], [1, 0, 0.9], [1, 1, 0.9], [1, 2, 2.6]].forEach(([bar, bt, ln], i) => {
    const t = T.slash + bar * B + bt * BEAT; // THE MOTIF up the octave, harmonized a 3rd below
    lead(t, MOTIF[i] + 12, ln * BEAT * 0.95, { g: 0.24, pan: -0.22 });
    lead(t, HARM3[i], ln * BEAT * 0.95, { g: 0.13, pan: -0.05, cut: 3200 });
  });
  kit.whoosh(SLASH_CLOCK.filmT(SLASH.dash), 0.4, 0.15, 500, 4000); // the dash
  {
    const ti = SLASH_CLOCK.filmT(SLASH.contact); // THE impact — onset at the start of the 0.22 s hit-stop
    kit.kick(ti, 0.55);
    kit.crash(ti, 0.24);
    shing(ti, 0.2);
    nz(ti, 0.3, { f: 3200, type: 'lowpass', f1: 250, g: 0.3 });
  }

  // ================= COMBO — CHORUS II: G Am F, whip / spin-kick / flying goon (bars 23–26) =================
  [[43, 31], [45, 33], [41, 29]].forEach(([p, b], bar) => { // G / Am / F
    const t0 = (23 + bar) * B;
    kit.crash(t0, 0.17);
    chorusBar(t0, p, b);
  });
  [ // answering phrase, same 3rd-below pairing [beat, lenBeats, lead, harmony]
    [[0, 0.9, 86, 83], [1, 1, 88, 84], [2, 1.9, 91, 88]],
    [[0, 1.9, 88, 84], [2, 1.9, 86, 83]],
    [[0, 1.5, 81, 77], [1.5, 1, 84, 81], [3, 1.4, 88, 84]],
  ].forEach((barNotes, bar) => barNotes.forEach(([bt, ln, m, hm]) => {
    const t = T.combo + bar * B + bt * BEAT;
    lead(t, m, ln * BEAT * 0.95, { g: 0.24, pan: -0.22 });
    lead(t, hm, ln * BEAT * 0.95, { g: 0.12, pan: -0.05, cut: 3200 });
  }));
  kit.whoosh(COMBO_CLOCK.filmT(COMBO.whip), 0.45, 0.16, 700, 5200); // hair whip
  {
    const tc = COMBO_CLOCK.filmT(COMBO.kick); // BIGGER impact on the spin-kick hit-stop
    kit.kick(tc, 0.55);
    kit.crash(tc, 0.22);
    shing(tc, 0.18);
    kit.sweepDown(tc, 0.5, 1500, 55, 0.2, 'sawtooth');
    kit.sub(tc, 0.5);
  }
  boing(COMBO_CLOCK.filmT(COMBO.fly)); // goon flies — comic pitch drop

  // ================= LEAP — chorus PEAK: C G Am F, strings double, wind swell (bars 26–30) =================
  [[48, 36], [43, 31], [45, 33], [41, 29]].forEach(([p, b], bar) => { // C / G / Am / F
    const t0 = (26 + bar) * B;
    kit.crash(t0, 0.18);
    chorusBar(t0, p, b, 1); // open hats on the off-beats
  });
  [ // motif varied up yet another register, peak on A6 over the F bar
    [[0, 1.5, 88, 84], [1.5, 1.5, 86, 83], [3, 1, 84, 81]],
    [[0, 1, 83, 79], [1, 1, 84, 81], [2, 1, 86, 83], [3, 1, 88, 84]],
    [[0, 1.5, 81, 77], [1.5, 1, 84, 81], [2.5, 1.4, 88, 84]],
    [[0, 3.6, 93, 89]],
  ].forEach((barNotes, bar) => barNotes.forEach(([bt, ln, m, hm]) => {
    const t = T.leap + bar * B + bt * BEAT, d = ln * BEAT * 0.95;
    lead(t, m, d, { g: 0.24, pan: -0.22 });
    lead(t, hm, d, { g: 0.12, pan: -0.05, cut: 3200 });
    kit.strings(t, [m, hm], d + 0.3, 0.03, 0.04, 0.3, 3000); // strings layer doubles the lead
  }));
  kit.wind(T.leap + LEAP.jump, T.leap + 2.5, 0.1, 500, 2400); // wind swells through the flight
  kit.swell(T.title - BEAT, T.title, 0.2, 9000); // swell into the title

  // ================= TITLE — massive slam, Am(add9) ring-out, end-card callback (bars 30–33) =================
  {
    const ts = T.title + TITLE.slam; // one dramatic beat of near-silence, then the slam
    kit.kick(ts, 0.6);
    kit.crash(ts, 0.3);
    kit.braam(ts, [33, 45, 57], 2.6, 0.24, 0.8); // braam-low Am
    kit.sub(ts, 0.55);
    kit.choir(ts, [57, 60, 64, 71], 2.3, 0.05, 'a', 0.3, 1.55); // Am(add9): A C E B, held, ringing out
    kit.strings(ts, [45, 52, 57, 60, 64, 71], 2.1, 0.035, 0.25, 1.5); // release lands before T.end
    const tf = T.title + TITLE.fade - 0.8; // end-card callback: the motif's last 3 notes, rest on A
    kit.piano(tf, 72, 0.09, 1.2);
    kit.piano(tf + 0.6 * BEAT, 71, 0.09, 1.2);
    kit.piano(tf + 1.15 * BEAT, 72, 0.09, 1.2);
    kit.piano(tf + 1.75 * BEAT, 69, 0.085, 0.6); // ...soft A, its decay completes by T.end
  }
}
