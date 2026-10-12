// HAIRTANIC — a Remy Boys Titanic parody. Cue sheet + choreography: the single shared
// source of truth that picture (film.js/art.js) AND score (score.js) both import.
// 90 s, 1920×1080 @60fps, 2D filmkit full-res painted-vector stage, letterbox 0.8,
// period-caption melodrama. All pure functions of time (no Math.random, no Date,
// no state carried between frames).
//
// CLOCK RULE (load-bearing): shots 5 and 7 carry hit-stops / a slow-mo window, so for
// any event in those shots score and picture MUST resolve film time with
// STEER.abs(g) / IMPACT.abs(g). NEVER hand-add t0 + g in a stopped shot — the stop
// shifts every later event in the shot. Plain shots (no clock): abs = t0 + g is exact.
// An event scheduled AT a stop's g lands at the START of its freeze (the-shine convention).

export const DUR = 90

// ---------- shot map (film seconds; contiguous, covers [0, 90)) ----------
// CUTS:        0   9    18    26    33    43    52    60    69    79    85   90
export const CUTS = [0, 9, 18, 26, 33, 43, 52, 60, 69, 79, 85, 90]

export const SHOTS = [
  { name: 'wreck',      t0: 0,  t1: 9,  desc: 'Cold open: slow push to the rusted wreck, submersible lamps, OLD ROSE 1627 edge frame, pendant case' },
  { name: 'southampton', t0: 9,  t1: 18, desc: 'Departure: dock, streamers, CAL 1558 boards with pendant, ROSE 2373 behind, quartet on dock, painted banner; whistle blast at EV.whistle' },
  { name: 'bow',        t0: 18, t1: 26, desc: 'JACK 42 at the rail, arms wide; ROSE 2373 behind' },
  { name: 'sunset',     t0: 26, t1: 33, desc: 'Stern two-shot, manes horizontal in the wind, sun going down' },
  { name: 'steerage',   t0: 33, t1: 43, desc: 'Jig: DANCERS 96/220/273, JACK cuts in, barrel-slap hit-stop (STEER clock, stop g 5.4 d 0.16), quartet peeks down the stairwell then taps its foot' },
  { name: 'hairberg',   t0: 43, t1: 52, desc: 'Night bridge: LOOKOUTS 961/501 (binoculars baked), immense STILL white bald-head berg dead ahead, scalp glint (EV.bergGlint), CAPTAIN 2636, dandruff snow' },
  { name: 'impact',     t0: 52, t1: 60, desc: 'HIT at 54.6 (IMPACT clock: stop g 2.6 d 0.28, then 0.5x slow-mo window g 2.88–3.68), permanent ~4deg list, rivets pop, lamps swing' },
  { name: 'quartet',    t0: 60, t1: 69, desc: 'Quartet on the listing deck: they finish a phrase, bow to nobody, keep playing; waterline climbs, deck chair slides' },
  { name: 'door',       t0: 69, t1: 79, desc: 'ROSE on the door panel, JACK chin-deep, red hair fanned; intertitle volley; grip slips at EV.gripSlip' },
  { name: 'pendant',    t0: 79, t1: 85, desc: 'Survey-ship stern at night: OLD ROSE drops the HEART OF THE FLOW-CEAN at EV.pendantDrop and follows it down' },
  { name: 'endcard',    t0: 85, t1: 90, desc: 'Engraved navy card: waterline rises THROUGH the title, letters sink, stinger, credit' },
]

// ---------- shot clocks: hit-stops freeze world time; shake/flash/score stay real ----------
// makeClock copied VERBATIM from films/baldzilla/timeline.js (the stops + rates variant).
//   stops: [{g,d}] freeze world time at g for d real seconds (impact lands at freeze START).
//   rates: [{from,to,k}] world runs at k× real (0.5 = slow-mo) inside [from,to); 1× elsewhere.
//   No stop may sit inside a rate window.
export function makeClock(t0, stops = [], rates = []) {
  const pts = [0];
  for (const r of rates) pts.push(r.from, r.to);
  for (const s of stops) pts.push(s.g);
  pts.sort((a, b) => a - b);
  const G = [...new Set(pts.filter((p) => p >= 0))].filter((p, i, a) => i === 0 || p > a[i - 1]);
  const rateAt = (g) => { for (const r of rates) if (g >= r.from && g < r.to) return r.k; return 1; };
  const stopAt = (g) => { for (const s of stops) if (Math.abs(s.g - g) < 1e-9) return s; return null; };
  const segs = [];
  for (let i = 0; i < G.length; i++) segs.push({ g0: G[i], g1: i + 1 < G.length ? G[i + 1] : Infinity, k: rateAt(G[i]) });
  const warp = (lt) => {
    let rem = lt;
    for (const s of segs) {
      const span = (s.g1 - s.g0) / s.k;
      if (rem < span) return { g: s.g0 + rem * s.k, stop: null, sl: 0 };
      rem -= span;
      const st = stopAt(s.g1);
      if (st) { if (rem < st.d) return { g: s.g1, stop: st, sl: rem }; rem -= st.d; }
    }
    return { g: segs[segs.length - 1].g0 + rem, stop: null, sl: 0 };
  };
  const filmT = (g) => {
    let t = 0;
    for (const s of segs) {
      if (g <= s.g1 + 1e-9) return t + (g - s.g0) / s.k;
      t += (s.g1 - s.g0) / s.k;
      const st = stopAt(s.g1);
      if (st && g > s.g1 + 1e-9) t += st.d;
    }
    return t;
  };
  return { t0, stops, rates, warp, filmT, abs: (g) => t0 + filmT(g) };
}

// S5 steerage: one barrel-slap mini hit-stop. Film 33 + 5.4 = 38.40 (freeze start);
// world resumes at g 5.4 / film 38.56. Score: STEER.abs(g) for anything in [33, 43).
export const STEER = makeClock(33, [{ g: 5.4, d: 0.16 }], [])

// S7 impact: 0.28 s hit-stop at g 2.6 (abs 54.60), then a brief 0.5x slow-mo window
// g [2.88, 3.68) — film 55.16 → 56.76 (1.6 s of screen time for 0.8 s of world).
// Stop sits OUTSIDE the rate window (the makeClock invariant). Slow-mo ends at
// g 3.68 / film 56.76; 1x resumes; the ~4deg list settles from EV.listStart.
// Film window abs: [IMPACT.abs(2.88), IMPACT.abs(3.68)] = [55.16, 56.76].
export const IMPACT = makeClock(52, [{ g: 2.6, d: 0.28 }], [{ from: 2.88, to: 3.68, k: 0.5 }])

// ---------- EVents: every shared cue with shot index (1-based = S number), shot-local g, ABS film time ----------
// score.js: read .abs, never recompute. Shown abs values verified against the clocks above.
export const EV = {
  whistle:       { shot: 2,  g: 6.8, abs: 15.8 },             // plain shot: 9 + 6.8 — the banner card is up, blast lands under it
  barrelSlap:    { shot: 5,  g: 5.4, abs: STEER.abs(5.4) },   // 38.40 — lands at freeze START (0.16 s stop follows)
  bergGlint:     { shot: 6,  g: 1.6, abs: 44.6 },             // plain shot: 43 + 1.6 — scalp glint under the lookout's first line
  impactHit:     { shot: 7,  g: 2.6, abs: IMPACT.abs(2.6) },  // 54.60 — HIT, freeze starts; s7_slam caption t0 === this
  listStart:     { shot: 7,  g: 3.8, abs: IMPACT.abs(3.8) },  // 56.88 — just after slow-mo ends (56.76); permanent ~4deg list begins
  gripSlip:      { shot: 9,  g: 8.8, abs: 77.8 },             // plain shot: 69 + 8.8 — inside ROSE's "I'LL NEVER LET FLOW." window
  pendantDrop:   { shot: 10, g: 2.4, abs: 81.4 },             // plain shot: 79 + 2.4 — gold leaves her hand as the narr lands
  titleSinkStart:{ shot: 11, g: 1.5, abs: 86.5 },             // plain shot: 85 + 1.5 — waterline starts rising THROUGH the engraved title
}

// ---------- CAPTIONS ----------
// Schema: { id, text, t0, t1, style, x, y, anim, in, out, minHold?, span? }
//   anims: rise | fade | line | type | cut
//   styles (defined in film.js captionStyles): title {F.anton 132 y540 anim line},
//     kicker {F.mono 26 y430 anim fade track 6}, caption {default y930 40px},
//     sub {30px y986}, lower {left x140 y860}
// LINT CONTRACT: captionHold 2.2, safe margin 0.05, letterbox true (0.8 → safe band
// y ≈ 162..918; we stay inside y 200..915, center x 960). The style defaults y930/y986
// are NEVER used bare — every caption carries an explicit y inside the band.
// LANE MODEL: captions in the MAIN lane (slugs, dialogue, narration) are strictly
// sequential with >= 0.15 s gaps and never overlap. Two sanctioned SIDE lanes run
// concurrently, per goldflow precedent (its tagline/credits/slate overlap and pass):
//   • title lane: s1_titleSub sits under s1_title (same window, y 540 vs 640)
//   • credit lane: s11_credit runs under s11_tag/s11_stinger (y 892)
// SPAN: s9_narr is the only caption crossing a cut (79), flagged span:true —
// the "SHE LET FLOW." button must land after the grip slip and breathe into S10.
//
// HOLD-ARITHMETIC TABLE — hold = (t1 - out) - (t0 + in); pass = hold >= 2.2, or
// hold >= minHold for reasoned period-intertitle volleys (floor 1.6):
//   | id           | t0    | t1    | in  | out | hold | ok/minHold        |
//   |--------------|-------|-------|-----|-----|------|-------------------|
//   | s1_slug      | 0.80  | 4.35  | 0.5 | 0.5 | 2.55 | ok (>=2.2)        |
//   | s1_vo        | 4.55  | 6.67  | 0.2 | 0.15| 1.77 | minHold 1.6 (VO card) |
//   | s1_title     | 6.82  | 8.97  | 0.3 | 0.2 | 1.65 | minHold 1.6 (title card; 3 windows cannot all clear 2.2 inside 9 s) |
//   | s1_titleSub  | 6.82  | 8.97  | 0.2 | 0.15| 1.80 | minHold 1.6 (side lane under title) |
//   | s2_slug      | 9.45  | 12.50 | 0.4 | 0.4 | 2.25 | ok                |
//   | s2_cal       | 12.65 | 15.50 | 0.3 | 0.3 | 2.25 | ok                |
//   | s2_banner    | 15.65 | 17.90 | 0.3 | 0.2 | 1.75 | minHold 1.6 (banner intertitle; cut at 18 caps the window) |
//   | s3_jack      | 18.50 | 21.40 | 0.3 | 0.3 | 2.30 | ok                |
//   | s3_rose      | 21.60 | 24.90 | 0.3 | 0.3 | 2.70 | ok                |
//   | s4_narr      | 26.50 | 29.35 | 0.3 | 0.3 | 2.25 | ok                |
//   | s4_jack      | 29.55 | 32.80 | 0.3 | 0.3 | 2.65 | ok                |
//   | s5_narr1     | 33.50 | 36.40 | 0.3 | 0.3 | 2.30 | ok                |
//   | s5_narr2     | 36.60 | 40.60 | 0.3 | 0.3 | 3.40 | ok                |
//   | s6_lookout   | 43.40 | 46.30 | 0.3 | 0.3 | 2.30 | ok                |
//   | s6_captain   | 46.50 | 49.40 | 0.3 | 0.3 | 2.30 | ok                |
//   | s6_telegram  | 49.60 | 51.90 | 0.3 | 0.15| 1.85 | minHold 1.6 (telegram card; cut at 52 caps it) |
//   | s7_captain   | 52.30 | 54.45 | 0.25| 0.25| 1.65 | minHold 1.6 (pre-impact volley; must clear out before HIT 54.6) |
//   | s7_slam      | 54.60 | 57.05 | 0   | 0.2 | 2.25 | ok (in:0, anim cut, t0 === EV.impactHit.abs) |
//   | s7_narr      | 57.25 | 59.95 | 0.3 | 0.15| 2.25 | ok                |
//   | s8_narr1     | 60.50 | 63.60 | 0.3 | 0.3 | 2.50 | ok                |
//   | s8_narr2     | 63.80 | 67.30 | 0.3 | 0.3 | 2.90 | ok                |
//   | s9_jack1     | 69.40 | 71.50 | 0.25| 0.2 | 1.65 | minHold 1.6 (volley) |
//   | s9_rose1     | 71.65 | 73.75 | 0.25| 0.2 | 1.65 | minHold 1.6 (volley) |
//   | s9_jack2     | 73.90 | 76.00 | 0.25| 0.2 | 1.65 | minHold 1.6 (volley) |
//   | s9_rose2     | 76.15 | 78.25 | 0.25| 0.2 | 1.65 | minHold 1.6 (volley; EV.gripSlip 77.8 lands inside) |
//   | s9_narr      | 78.40 | 80.55 | 0.15| 0.35| 1.65 | minHold 1.6 (span:true across cut 79) |
//   | s10_narr     | 80.70 | 84.30 | 0.3 | 0.3 | 3.00 | ok                |
//   | s11_tag      | 85.40 | 87.70 | 0.3 | 0.3 | 1.70 | minHold 1.6 (epitaph; 3 texts share 5 s) |
//   | s11_stinger  | 87.90 | 89.88 | 0.2 | 0.15| 1.63 | minHold 1.6 (stinger before DUR) |
//   | s11_credit   | 85.60 | 89.60 | 0.4 | 0.4 | 3.20 | ok (credit side lane) |
// Caption ↔ shot ownership: every t0 sits inside its shot; nothing crosses a cut
// except s9_narr (span:true). All y in [200, 915]; x 960.
export const CAPTIONS = [
  // S1 0–9 wreck cold open
  { id: 's1_slug', text: 'THE NORTH ATLANTIC — EIGHTY-FOUR YEARS LATER', t0: 0.8, t1: 4.35, style: 'kicker', x: 960, y: 430, anim: 'fade', in: 0.5, out: 0.5 },
  { id: 's1_vo', text: 'EVERY WRECK KEEPS ITS HAIRDRESSER’S SECRETS.', t0: 4.55, t1: 6.67, style: 'kicker', x: 960, y: 430, anim: 'fade', in: 0.2, out: 0.15, minHold: 1.6 },
  { id: 's1_title', text: 'HAIRTANIC', t0: 6.82, t1: 8.97, style: 'title', x: 960, y: 540, anim: 'line', in: 0.3, out: 0.2, minHold: 1.6 },
  { id: 's1_titleSub', text: 'A REMY BOYS UNSINKABLE ROMANCE', t0: 6.82, t1: 8.97, style: 'sub', x: 960, y: 640, anim: 'fade', in: 0.2, out: 0.15, minHold: 1.6 },
  // S2 9–18 departure Southampton
  { id: 's2_slug', text: 'SOUTHAMPTON — APRIL 10, 1912', t0: 9.45, t1: 12.5, style: 'kicker', x: 960, y: 430, anim: 'fade', in: 0.4, out: 0.4 },
  { id: 's2_cal', text: 'CAL — SHE IS UNSINKABLE. I READ THE BROCHURE.', t0: 12.65, t1: 15.5, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.3 },
  { id: 's2_banner', text: 'THE REMY STAR LINE PRESENTS\nTHE UNSINKABLE RMS HAIRTANIC', t0: 15.65, t1: 17.9, style: 'caption', x: 960, y: 520, anim: 'rise', in: 0.3, out: 0.2, minHold: 1.6 },
  // S3 18–26 bow
  { id: 's3_jack', text: 'JACK — LOOK AT ME! I AM THE MASTER OF MY FLOW!', t0: 18.5, t1: 21.4, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.3 },
  { id: 's3_rose', text: 'ROSE — THE HAIR WILL RULE ITSELF.', t0: 21.6, t1: 24.9, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.3 },
  // S4 26–33 sunset romance
  { id: 's4_narr', text: 'THE SUN SET. THE HAIR DID NOT.', t0: 26.5, t1: 29.35, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.3 },
  { id: 's4_jack', text: 'JACK — I HAVE NOTHING. I HAVE A COMB. I AM COMPLETE.', t0: 29.55, t1: 32.8, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.3 },
  // S5 33–43 steerage jig
  { id: 's5_narr1', text: 'STEERAGE — WHERE THE HAIR IS HONEST.', t0: 33.5, t1: 36.4, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.3 },
  { id: 's5_narr2', text: 'THE QUARTET DISAPPROVED. THEN TAPPED ITS FOOT.', t0: 36.6, t1: 40.6, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.3 },
  // S6 43–52 hair-berg night bridge
  { id: 's6_lookout', text: 'LOOKOUT — THAT IS NO ICEBERG. THAT IS A FOREHEAD.', t0: 43.4, t1: 46.3, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.3 },
  { id: 's6_captain', text: 'CAPTAIN — FULL AHEAD. AND SOMEBODY FETCH MY RAZOR.', t0: 46.5, t1: 49.4, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.3 },
  { id: 's6_telegram', text: 'UNSINKABLE. UNCONDITIONABLE. UN-COMBABLE. — C.', t0: 49.6, t1: 51.9, style: 'caption', x: 960, y: 500, anim: 'type', in: 0.3, out: 0.15, minHold: 1.6 },
  // S7 52–60 impact
  { id: 's7_captain', text: 'CAPTAIN — SCALP. DEAD AHEAD.', t0: 52.3, t1: 54.45, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.25, out: 0.25, minHold: 1.6 },
  { id: 's7_slam', text: 'WE HAVE STRUCK A HEAD.', t0: 54.6, t1: 57.05, style: 'caption', x: 960, y: 500, anim: 'cut', in: 0, out: 0.2 },
  { id: 's7_narr', text: 'THE CABALD’S ULTIMATE WEAPON: A VERY LARGE, VERY CALM HEAD.', t0: 57.25, t1: 59.95, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.15 },
  // S8 60–69 quartet on the listing deck
  { id: 's8_narr1', text: 'THEY PLAYED AS SHE SANK. THE SET WAS NOT OVER.', t0: 60.5, t1: 63.6, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.3 },
  { id: 's8_narr2', text: 'TIPPING HAD NOT YET BEEN INVENTED.', t0: 63.8, t1: 67.3, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.3 },
  // S9 69–79 the door (intertitle volley)
  { id: 's9_jack1', text: 'JACK — THERE WAS ROOM ON THE DOOR.', t0: 69.4, t1: 71.5, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.25, out: 0.2, minHold: 1.6 },
  { id: 's9_rose1', text: 'ROSE — IT WOULD HAVE LISTED.', t0: 71.65, t1: 73.75, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.25, out: 0.2, minHold: 1.6 },
  { id: 's9_jack2', text: 'JACK — I WAS MOSTLY HAIR. I WAS BUOYANT.', t0: 73.9, t1: 76.0, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.25, out: 0.2, minHold: 1.6 },
  { id: 's9_rose2', text: 'ROSE — I’LL NEVER LET FLOW.', t0: 76.15, t1: 78.25, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.25, out: 0.2, minHold: 1.6 },
  { id: 's9_narr', text: 'SHE LET FLOW.', t0: 78.4, t1: 80.55, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.15, out: 0.35, minHold: 1.6, span: true },
  // S10 79–85 pendant
  { id: 's10_narr', text: 'THE FLOW-CEAN KEEPS ITS OWN.', t0: 80.7, t1: 84.3, style: 'caption', x: 960, y: 868, anim: 'fade', in: 0.3, out: 0.3 },
  // S11 85–90 final card
  { id: 's11_tag', text: 'SHE SANK. THE HAIR DID NOT.', t0: 85.4, t1: 87.7, style: 'caption', x: 960, y: 660, anim: 'fade', in: 0.3, out: 0.3, minHold: 1.6 },
  { id: 's11_stinger', text: 'THE DOOR WAS BIG ENOUGH.', t0: 87.9, t1: 89.88, style: 'caption', x: 960, y: 740, anim: 'fade', in: 0.2, out: 0.15, minHold: 1.6 },
  { id: 's11_credit', text: 'A REMY BOYS PICTURE · MCMXII/MMDXXVI', t0: 85.6, t1: 89.6, style: 'sub', x: 960, y: 892, anim: 'fade', in: 0.4, out: 0.4 },
]

// ---------- SCORE — shared musical plan (score.js consumes sections; cues come from EV) ----------
// bars = sectionLen * bpm / 60 / beatsPerBar (S5 counted in 6/8: 6 eighths per bar at
// an eighth-note pulse of 140). Sections are self-contained: treat each t0 as a downbeat.
//
// OFF-BAR CUT FLAGS — every cut lands off the bar EXCEPT 52 and 60:
//   t9  : S1 ends at 2.25 bars (60bpm) — 1-beat overshoot; composer takes a pickup into S2.
//   t18 : S2 ends at 3.75 bars (100bpm) — 3-beat overshoot; pickup bar into S3.
//   t26 : S3 ends at 2.93 bars (88bpm) — off; suggest a 1-beat anacrusis into S4.
//   t33 : S4 ends at 2.22 bars (76bpm) — off; romantic theme elides into the jig pickup.
//   t43 : S5 ends at 3.89 bars (6/8 @140 eighth pulse) — off; stomp cut on the last eighth.
//   t52 : S6 drone is rubato (2.03 nominal bars) — free; S7 enters ON the bar
//         (52 s = exactly bar 26 of a 120 BPM grid from t 0).
//   t60 : S7 ends bar-perfect (4.00 bars) — S8 downbeat lands ON the cut.
//   t69 : S8 ends at 2.25 bars (60bpm hymn) — fermata + breath pickup into S9.
//   t79 : S9 ends at 2.25 bars (54bpm) — half-bar; let the heartbeat continue across as the pivot.
//   t85 : S10 ends at 1.65 bars (66bpm) — off; S11 cadence enters after a beat's silence
//         (1.25 nominal bars — final chord simply rings past DUR).
// Suggested handling: pickup (anacrusis) bars at 9/18/26/33/43/69/79/85; hard downbeats at 52 and 60.
export const SCORE = {
  sections: [
    { name: 'wreckColdOpen', t0: 0,  t1: 9,  bpm: 60,  bars: 2.25, feel: 'elegiac solo piano, long swells, faint hydrophone drone',                 key: 'A minor' },
    { name: 'southampton',   t0: 9,  t1: 18, bpm: 100, bars: 3.75, feel: 'proud maritime march 4/4, brass + snare; whistle blast accent at EV.whistle', key: 'C major' },
    { name: 'bowMasterOfFlow', t0: 18, t1: 26, bpm: 88, bars: 2.93, feel: 'warm build, strings rising to the arms-wide climax',                      key: 'D major' },
    { name: 'sunsetRomance', t0: 26, t1: 33, bpm: 76,  bars: 2.22, feel: 'romantic theme, full statement: harp, horns, manes in the wind',           key: 'F major' },
    { name: 'steerageJig',   t0: 33, t1: 43, bpm: 140, bars: 3.89, feel: 'duple stomp jig, 6/8 lilt (eighth pulse), fiddles + bodhran; dead stop at EV.barrelSlap (STEER.abs), foot-tap joins a bar later', key: 'G mixolydian' },
    { name: 'hairberg',      t0: 43, t1: 52, bpm: 54,  bars: 2.03, feel: 'eerie stillness: low drone, violin harmonics, dandruff-snow celesta; glint ping at EV.bergGlint', key: 'E minor drone' },
    { name: 'impact',        t0: 52, t1: 60, bpm: 120, bars: 4,    feel: 'impact ostinato + clock-driven stabs THROUGH the 0.28s freeze and 0.5x slow-mo — schedule with IMPACT.abs, never 52+g', key: 'C minor' },
    { name: 'quartetElegy',  t0: 60, t1: 69, bpm: 60,  bars: 2.25, feel: 'slow 4/4 hymn, NOT a waltz: string-quartet elegy sagging in whole-steps as she lists', key: 'A minor' },
    { name: 'door',          t0: 69, t1: 79, bpm: 54,  bars: 2.25, feel: 'sparse piano + heartbeat kick under the volleys; silence pocket at EV.gripSlip', key: 'F minor' },
    { name: 'pendant',       t0: 79, t1: 85, bpm: 66,  bars: 1.65, feel: 'piano + one bell at EV.pendantDrop, strings fading as she follows it down', key: 'C major' },
    { name: 'endcard',       t0: 85, t1: 90, bpm: 60,  bars: 1.25, feel: 'final cadence + swell under the title sink (EV.titleSinkStart); last chord rings past DUR', key: 'C major (resolves the opening A minor)' },
  ],
}

// ---------- PAL — per-shot palette hexes ----------
export const PAL = {
  s1:  { abyss: '#071222', water: '#16324e', hullRust: '#4a3226', rust: '#6b4530', lampWarm: '#ffd9a0' },
  s2:  { sky: '#b9c7d4', sea: '#33506b', timber: '#6b4f33', tungsten: '#f2e3c2', bannerRed: '#a3322a' },
  s3:  { sky: '#cfe2ee', seaSteel: '#2e4a66', deck: '#8a6a44', coat: '#14181f' },
  s4:  { sun: '#ffd08a', orange: '#f2a65a', ember: '#e2783c', seaDusk: '#57456b', silhouette: '#241a14' },
  s5:  { tungsten: '#f5d9a0', wood: '#7a5230', brass: '#c9a45c', vestRed: '#b3402e', vestGreen: '#3f6b4f' },
  s6:  { night: '#060b14', sea: '#0a1826', bergMoon: '#c9d8e4', moonWhite: '#eef4fa', glint: '#ffffff', lamp: '#ffcf8a' },
  s7:  { night: '#08101c', ice: '#d8e6f0', spark: '#ffd27a', rivetBrass: '#c9a45c', deep: '#0a1826' },
  s8:  { deckCold: '#16283c', waterline: '#0a1928', lampWarm: '#f0d6a8', black: '#0b0e13' },
  s9:  { blackWater: '#04080f', doorPine: '#8a6a44', hairRed: '#b8402a', breathFog: '#cfd9e2', skinLamp: '#e8c9a0' },
  s10: { seaNight: '#071018', searchlight: '#eef4fa', hull: '#1c2836', pendantGold: '#d9b45c', wake: '#24405c' },
  s11: { navy: '#0c1830', engraveGold: '#c9b06a', waterline: '#3f6b8f', ink: '#060a12', foam: '#dfe9f2' },
}

// ---------- CAM — one brief move per shot (push = scale factor on the stage) ----------
export const CAM = [
  { shot: 1,  move: 'push',  params: { from: 1.0,  to: 1.18, tilt: -1, drift: [4, -2] } },   // slow push toward the wreck
  { shot: 2,  move: 'drift', params: { from: 1.0,  to: 1.06, tilt: 0,  drift: [18, 0] } },   // lateral dock drift with the boarding
  { shot: 3,  move: 'push',  params: { from: 1.0,  to: 1.12, tilt: 2,  drift: [0, 0] } },    // push in on arms-wide
  { shot: 4,  move: 'orbit', params: { from: 1.0,  to: 1.08, tilt: -1, drift: [-6, 3] } },   // slow stern drift, manes horizontal
  { shot: 5,  move: 'push',  params: { from: 1.05, to: 1.15, tilt: 1,  drift: [10, 4] } },   // jig bounce, handheld-ish
  { shot: 6,  move: 'push',  params: { from: 1.0,  to: 1.14, tilt: -2, drift: [0, -4] } },   // the forehead berg looms
  { shot: 7,  move: 'push',  params: { from: 1.0,  to: 1.22, tilt: 0,  drift: [0, 0], shakeAt: EV.impactHit.abs } }, // freeze push; shake on HIT
  { shot: 8,  move: 'tilt',  params: { from: 1.0,  to: 1.05, tilt: 3,  drift: [0, 8] } },    // sag with the ~4deg list
  { shot: 9,  move: 'hold',  params: { from: 1.0,  to: 1.05, tilt: -1, drift: [3, -2] } },   // locked two-shot, micro drift
  { shot: 10, move: 'tilt',  params: { from: 1.0,  to: 1.1,  tilt: 6,  drift: [0, 20] } },   // tilt down following the pendant
  { shot: 11, move: 'push',  params: { from: 1.0,  to: 1.04, tilt: 0,  drift: [0, 0] } },    // static engraved card
]
