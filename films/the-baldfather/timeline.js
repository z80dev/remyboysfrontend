// THE BALDFATHER — a Remy Boys mafia-epic parody. Cue sheet + choreography: every
// number the picture and the score share lives here. New Flow City, 1947: the bald
// CABALD family takes hair; hero 42 is anointed DON OF THE FLOW and takes it back.
// Power is a haircut.
// Tempo grid: 3/4 Sicilian waltz @ 90 BPM (beat = 2/3 s) → BAR = 2.000 s, 45 bars in
// 90 s. All cut points (28 / 50 / 80) sit on bar lines; bar lines = even seconds,
// half-bars = odd seconds.
// Purity: every frame is a pure function of film time t (or world g through a clock).
// No Math.random, no Date, no state between frames. Hit-stops freeze WORLD time via
// the makeClock warp; shake/flash/score stay real time. Comments give FILM seconds;
// clocked events are marked LOCAL g vs FILM t.

export const DURATION = 90

// ---------- shot map (film seconds) ----------
export const T = {
  study: 0,   // S1 THE STUDY — supplicant + the Don   0–28
  visit: 28,  // S2 THE RAZOR'S VISIT — Vito's bedroom 28–50
  chapel: 50, // S3 THE CROWNING WAR — chapel montage  50–80
  end: 80,    // S4 THE NEW DON — the chair, the wig   80–90
}

// ---------- cast (contact-sheet verified; see BRIEF; near sprites, foot anchor) ----------
export const CAST = {
  don: 3807,       // DON BALDONE — bald, black sweater, stern brows; strokes the red wig
  bonasera: 909,   // BONASERA — silver hair, navy suit+tie; the hairy supplicant
  vito: 37,        // VITO — biggest flow in the catalog ("Gold Flow"); the razored victim
  enforcer1: 1793, // Cabald enforcer — bald, dark top; leads the tiptoe
  enforcer2: 2061, // Cabald enforcer — bald, dark top; carries the scissors caseBag
  enforcer3: 129,  // the eager goon — open smile reads even in silhouette
  priest: 83,      // PRIEST — anoints 42 in the Chapel of the Flow
  daughter: 96,    // WEDDING DAUGHTER — the muffled wedding through the study window
  hero: 42,        // HERO 42 — Crimson Flow + sword; sword CEREMONIAL, sheathed, held low
}

// ---------- shot clocks: hit-stops freeze world time; shake/flash/score stay real ----------
// An event scheduled AT a stop's g lands at the START of its freeze (intentional).
export function makeClock(t0, stops = []) {
  const warp = (ts) => {
    let acc = 0
    for (const s of stops) {
      const rs = s.g + acc
      if (ts < rs) return { g: ts - acc, stop: null, sl: 0 }
      if (ts < rs + s.d) return { g: s.g, stop: s, sl: ts - rs }
      acc += s.d
    }
    return { g: ts - acc, stop: null, sl: 0 }
  }
  const filmT = (g) => {
    let acc = 0
    for (const s of stops) if (s.g < g) acc += s.d
    return g + acc
  }
  return { t0, stops, warp, filmT, abs: (g) => t0 + filmT(g) }
}

// S2 clock: ONE hit-stop at the mirror reveal — LOCAL g 17.2, d 0.14 (film 45.2).
// abs() of anything at/after g 17.2 lands 0.14 s later in film time.
export const VISIT_CLOCK = makeClock(T.visit, [{ g: 17.2, d: 0.14 }])
// S3 clock: NO hit-stops (montage stabs are straight cuts) — exported for uniformity.
export const CHAPEL_CLOCK = makeClock(T.chapel, [])

// S1 THE STUDY — no clock: LOCAL g IS FILM t. Values are FILM seconds.
export const STUDY_EV = {
  studioCard: 0.6, cityCard: 4.0, titleIn: 8.0, // cards; title holds 8.0–14.0 (CAPTIONS)
  bonaseraEnter: 1.6, bonaseraSettle: 6.0,      // supplicant walks in, reaches the bow mark
  donRise: 18.8,                                // rises AS the scandal line lands (donLine in)
  kissRing: 26.0,                               // inside donFavor 23.0–27.4
  iris: 27.4,                                   // iris/wipe to the bedroom, out on bar 28
}

// S2 THE RAZOR'S VISIT — LOCAL g from T.visit (28); FILM = VISIT_CLOCK.abs(g).
export const VISIT_EV = {
  enter: 1.5, tiptoeStart: 2.5,                  // FILM 29.5 / 30.5
  snip1: 7.5, snip2: 8.6,                        // FILM 35.5 / 36.6 — steel glints, no gore
  vanish: 10.0,                                  // FILM 38.0 — silhouettes gone
  stir: 12.0, sheetPull: 12.5, wigReveal: 15.0,  // FILM 40.0 / 40.5 / 43.0 — the flow, on the pillow
  headTouch: 16.5,                               // FILM 44.5 — he feels the scalp: BALD
  mirrorJump: 17.2, scream: 17.4, whip: 19.5,    // FILM 45.2 (hit-stop start) / 45.54 / 47.64
}

// S3 THE CROWNING WAR — LOCAL g from T.chapel (50); CHAPEL_CLOCK.abs(g) = 50 + g.
export const CHAPEL_EV = {
  establish: 0, anoint: 3.0, question: 3.4, // FILM 50.0 / 53.0 / 53.4 (priestQ 53.4–57.2)
  bells: 21.0,                              // FILM 71.0 — peal over the barrage peak
  rise: 24.0,                               // FILM 74.0 — 42 rises, resolve 73–80
  iris: 29.4,                               // FILM 79.4 — wipe to S4 on bar 80
}

// S4 THE NEW DON — no clock: LOCAL g IS FILM t offset (FILM = T.end + g).
export const END_EV = {
  studyIn: 0,           // FILM 80.0 — the study again, colder
  wigPickup: 3.0,       // FILM 83.0 — he picks up the red wig
  stroke: 4.0,          // FILM 84.0 — the caress begins (one 4 s cycle, 84.0–88.0)
  doorClose: 5.5,       // FILM 85.5 — door thud on Bonasera outside (no flash)
  endTitle: 5.8,        // FILM 85.8 — end card in (CAPTIONS.endTitle 85.8–89.8)
  fin: 8.6,             // FILM 88.6 — hold black to 90
}

// ---------- baptism montage (FILM t): on each organ stab, a Cabald de-wigging ----------
// Four main vignettes of 2.6 s each (≥ 2.4 floor, so a gag reads), starts on integer
// seconds alternating bar line / half-bar line: 58, 61, 64, 67 — each leaves a 0.4 s
// chapel answer beat ("I DO."). Barrage: 3 × 1.1 s mini-vignettes 69.6–72.9 so the
// chapel return lands exactly on the bar at 73.0. stab = t0 + 0.4 everywhere.
// Total montage 58.0–72.9 (inside 57.5–76).
export const MONTAGE = [
  { t0: 58.0, t1: 60.6, kind: 'barbershop', stab: 58.4 },  // rug-yank mid-shave
  { t0: 61.0, t1: 63.6, kind: 'consiglieri', stab: 61.4 }, // toupee snatch mid-sentence
  { t0: 64.0, t1: 66.6, kind: 'studyLift', stab: 64.4 },   // the Don's prize wig lifted
  { t0: 67.0, t1: 69.6, kind: 'vault', stab: 67.4 },       // vault of wigs discovered
  { t0: 69.6, t1: 70.7, kind: 'rain', stab: 70.0 },        // barrage: wigs rain down
  { t0: 70.7, t1: 71.8, kind: 'parade', stab: 71.1 },      // bare-headed parade
  { t0: 71.8, t1: 72.9, kind: 'sign', stab: 72.2 },        // barber-pole sign spins bald
]

// Active vignette at FILM t, or null between/around them.
export const vignetteAt = (t) => {
  for (const v of MONTAGE) if (t >= v.t0 && t < v.t1) return v
  return null
}

// ---------- screen flashes: [absoluteT, peak, decay] — peaks ≤ .2, decay ≤ .2 ----------
export const FLASHES = [
  [VISIT_CLOCK.abs(VISIT_EV.snip1), 0.08, 0.07],               // steel glint 1 (subtle)
  [VISIT_CLOCK.abs(VISIT_EV.snip2), 0.08, 0.07],               // steel glint 2 (subtle)
  [VISIT_CLOCK.abs(VISIT_EV.mirrorJump), 0.16, 0.1],           // mirror jump-cut
  ...MONTAGE.map((v) => [v.stab, 0.12, 0.1]),                  // 7 organ-stab pops
]
export const flashK = (t) => {
  let k = 0
  for (const f of FLASHES) if (t >= f[0]) k = Math.max(k, f[1] * Math.exp(-(t - f[0]) / f[2]))
  return k
}

// ---------- pure position math ----------
const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const outC = (u) => 1 - (1 - u) ** 3

// Bonasera (S1, g = FILM t): in through the study door (offscreen left, x −140) at
// 1.6, eased to the bow mark x 560 by the settle at 6.0, holds; a small fear-tremble
// starts when the Don rises at 18.8.
export function bonaseraX(g) {
  const e0 = STUDY_EV.bonaseraEnter
  const e1 = STUDY_EV.bonaseraSettle
  if (g < e0) return -140
  if (g < e1) return -140 + 700 * outC(cl((g - e0) / (e1 - e0)))
  if (g < STUDY_EV.donRise) return 560
  return 560 + 5 * Math.sin((g - STUDY_EV.donRise) * 3.1)
}

// The wig-stroke phase shared by S1 and S4: one slow 0.25 Hz caress (4 s cycle),
// phase 0..1, pure in the elapsed stroking time.
const strokePhase = (tau) => 0.5 - 0.5 * Math.cos((Math.PI / 2) * tau)

// S1: the Don's hand freezes while he speaks the scandal line (donLine 18.8–22.6,
// CAPTIONS) — donStroke returns null for that window and resumes without a jump
// (elapsed time is mapped, so the phase at 22.6 equals the frozen phase at 18.8).
const DON_LINE_T1 = 22.6 // donLine out (see CAPTIONS)
export function donStroke(t) {
  if (t >= STUDY_EV.donRise && t <= DON_LINE_T1) return null
  const tau = t <= STUDY_EV.donRise ? t : t - (DON_LINE_T1 - STUDY_EV.donRise)
  return strokePhase(tau)
}

// S4 mirror: the same stroke phase restarted when 42 begins the caress
// (END_EV.stroke, FILM 84.0) — one full 4 s cycle, 84.0–88.0.
export function wigStrokeMirror(t) {
  if (t < T.end + END_EV.stroke) return null
  return strokePhase(t - (T.end + END_EV.stroke))
}

// S2 enforcers (LOCAL g from T.visit): staggered tiptoe entries from the left door,
// flanking the bed, all planted by g 7.0 (first snip 7.5). i = 1 carries caseBag.
const ENFORCER_IN = [2.5, 3.1, 3.7]    // tiptoeStart + 0.6 i (VISIT_EV.tiptoeStart)
const ENFORCER_STOP = [620, 880, 1120] // flank marks around the bed at x 960
const ENFORCER_SET = 7.0               // planted-by LOCAL g (FILM 35.0)

export function enforcerPath(g, i) {
  const tin = ENFORCER_IN[i]
  if (g < tin || g >= VISIT_EV.vanish) return null
  const u = outC(cl((g - tin) / (ENFORCER_SET - tin)))
  return {
    x: -120 + (ENFORCER_STOP[i] + 120) * u,
    bob: 14 * Math.abs(Math.sin((g - tin) * 2.4)) * (1 - 0.9 * u), // tiptoe: slow + deep vs walk
    caseBag: i === 1,
    planted: u >= 1,
  }
}

// Bedsheet slides 12.5 → 15.0 LOCAL (FILM 40.5 → 43.0), a constant slow creep:
// 0 before the pull, 1.0 exactly at VISIT_EV.wigReveal when the flow is fully shown.
export const sheetPull = (g) => cl((g - VISIT_EV.sheetPull) / (VISIT_EV.wigReveal - VISIT_EV.sheetPull))

// studyLift vignette (FILM 64.0–66.6): the Don's prize wig rises off the desk to a
// silhouetted hand at the top of frame — smoothstep ease-in-out with a slight sway.
export function wigLiftPath(t) {
  const v = vignetteAt(t)
  if (!v || v.kind !== 'studyLift') return null
  const u = cl((t - v.t0) / (v.t1 - v.t0))
  const e = u * u * (3 - 2 * u)
  return { x: 960 + 26 * Math.sin(u * 5.2), y: 760 - 560 * e, rot: 0.14 * Math.sin(u * 4.1) }
}

// 42 in the chapel (LOCAL g from T.chapel): sinks to the kneel at the anoint (3.0,
// head bowed), holds bowed through the whole montage, rises at CHAPEL_EV.rise (24.0,
// FILM 74.0). Y offsets only.
export function heroKneel(g) {
  if (g < CHAPEL_EV.anoint) return 0
  if (g < CHAPEL_EV.rise) return 46 * outC(cl((g - CHAPEL_EV.anoint) / 1.4))
  return 46 * (1 - outC(cl((g - CHAPEL_EV.rise) / 1.3)))
}

// ---------- captions (FILM t) — paste-verbatim source for film.js ----------
// Hold arithmetic (id | t0 | t1 | hold | ok / minHold):
//   studioCard |  0.6  |  3.6  | 3.0  | ok (≥ 3.0)
//   cityCard   |  4.0  |  7.4  | 3.4  | ok
//   title      |  8.0  | 14.0  | 6.0  | ok (main title)
//   bonLine    | 14.8  | 18.4  | 3.6  | ok
//   donLine    | 18.8  | 22.6  | 3.8  | ok
//   donFavor   | 23.0  | 27.4  | 4.4  | ok
//   priestQ    | 53.4  | 57.2  | 3.8  | ok
//   iDo1..4    | stab+0.15 | vignette t1 | 2.05 | minHold 1.2 — emphatic montage punctuation:
//     five characters answering the priest, timed to the organ-stab grammar; a full 3 s
//     hold would smother the intercut. minHold 1.2 keeps it readable at 60 fps.
//   donTitle   | 76.4  | 79.6  | 3.2  | ok
//   endTitle   | 85.8  | 89.8  | 4.0  | ok
//   tagline    | 86.8  | 89.8  | 3.0  | ok
export const CAPTIONS = [
  { id: 'studioCard', text: 'A REMY BOYS PICTURE', t0: 0.6, t1: 3.6, style: 'card-sm serif' },
  { id: 'cityCard', text: 'NEW FLOW CITY — 1947', t0: 4.0, t1: 7.4, style: 'card-sm serif' },
  { id: 'title', text: 'THE BALDFATHER', t0: 8.0, t1: 14.0, style: 'title-lg serif letterspaced y300' },
  { id: 'bonLine', text: "SOMEONE RAZORED MY SON'S FLOW.", t0: 14.8, t1: 18.4, style: 'lower-third' },
  { id: 'donLine', text: 'WHY DID YOU GO TO THE BARBERS?', t0: 18.8, t1: 22.6, style: 'lower-third' },
  { id: 'donFavor', text: 'SOME DAY — I WILL ASK A SERVICE OF YOU.', t0: 23.0, t1: 27.4, style: 'lower-third' },
  { id: 'priestQ', text: 'DO YOU RENOUNCE THE RAZOR?', t0: 53.4, t1: 57.2, style: 'lower-third' },
  { id: 'iDo1', text: 'I DO.', t0: 58.55, t1: 60.6, style: 'lower-third emphatic', minHold: 1.2 }, // MONTAGE[0] stab 58.4
  { id: 'iDo2', text: 'I DO.', t0: 61.55, t1: 63.6, style: 'lower-third emphatic', minHold: 1.2 }, // MONTAGE[1] stab 61.4
  { id: 'iDo3', text: 'I DO.', t0: 64.55, t1: 66.6, style: 'lower-third emphatic', minHold: 1.2 }, // MONTAGE[2] stab 64.4
  { id: 'iDo4', text: 'I DO.', t0: 67.55, t1: 69.6, style: 'lower-third emphatic', minHold: 1.2 }, // MONTAGE[3] stab 67.4
  { id: 'donTitle', text: 'DON OF THE FLOW', t0: 76.4, t1: 79.6, style: 'title-lg serif' },
  { id: 'endTitle', text: 'THE BALDFATHER', t0: 85.8, t1: 89.8, style: 'title-lg serif letterspaced y300' },
  { id: 'tagline', text: 'KEEP YOUR FRIENDS CLOSE — AND YOUR HAIR CLOSER.', t0: 86.8, t1: 89.8, style: 'card-sm serif caps' },
]

// =====================================================================
// SCORE CUE SHEET — the composer reads ONLY this block. All times are
// FILM seconds, derived from the event tables above; LOCAL g events are
// converted with the clock .abs() semantics (VISIT carries one +0.14 s
// hit-stop at 45.2; CHAPEL has none, abs = 50 + g). Bar = 2.000 s:
// oom-pah-pah on the half-bar grid, cadences on even seconds.
// =====================================================================
// S1 THE STUDY 0–28 — Sicilian waltz, SPARSE, under dialogue (pluck lead + pad + triangle)
//   0.6   first pluck, picture start (STUDY_EV.studioCard)
//   1.6   Bonasera enters (STUDY_EV.bonaseraEnter) — pickup phrase under the door
//   4.0   oom-pah-pah settles (STUDY_EV.cityCard)
//   6.0   supplicant settled at the desk (STUDY_EV.bonaseraSettle)
//   8.0   title in — waltz swells a shade (STUDY_EV.titleIn; title holds 8.0–14.0)
//   14.8  bonLine in — drop to bass + triangle only (CAPTIONS.bonLine, out 18.4)
//   18.8  DON RISES / scandal line in — low string swell (STUDY_EV.donRise; donLine 18.8–22.6)
//   22.6  donLine out — swell releases
//   23.0  donFavor in (CAPTIONS.donFavor, out 27.4)
//   26.0  ring kiss — one soft muted accent (STUDY_EV.kissRing)
//   27.4  iris out begins (STUDY_EV.iris) — waltz thins to the pluck
// S2 THE RAZOR'S VISIT 28–50 — creep: low strings + heartbeat + pizzicato
//   28.0  hard cut (T.visit) — waltz STOPS dead on the bar
//   29.5  door; enforcers enter (VISIT_CLOCK.abs(VISIT_EV.enter) = 29.5)
//   30.0  HEARTBEAT starts (bar line, half-bar after the cut)
//   30.0  PIZZICATO tiptoe rhythm begins (follows enforcerPath bob)
//   30.5  tiptoe begins (VISIT_CLOCK.abs(VISIT_EV.tiptoeStart) = 30.5)
//   35.5  SNIP 1 — steel tick (VISIT_CLOCK.abs(VISIT_EV.snip1) = 35.5)
//   36.6  SNIP 2 — steel tick (VISIT_CLOCK.abs(VISIT_EV.snip2) = 36.6)
//   38.0  enforcers vanish (VISIT_CLOCK.abs(VISIT_EV.vanish) = 38.0) — pizzicato stops
//   40.0  Vito stirs (VISIT_CLOCK.abs(VISIT_EV.stir) = 40.0) — strings creep up
//   40.5  sheet pull begins (abs 40.5) → 43.0 reveal (abs 43.0) — slow crescendo
//   44.5  head touch (VISIT_CLOCK.abs(VISIT_EV.headTouch) = 44.5) — EVERYTHING drops out
//   45.2  MIRROR JUMP + 0.14 s hit-stop — STING (VISIT_CLOCK.abs(VISIT_EV.mirrorJump) = 45.2)
//   45.2  scream riser begins → peaks 46.0 (scream at abs 45.54)
//   47.64 whip to black (VISIT_CLOCK.abs(VISIT_EV.whip) = 47.64) — whip thud only
//   47.5–48.0  SILENCE (the 47.64 thud is the last sound before the chapel)
// S3 THE CROWNING WAR 50–80 — chapel organ + bells; stabs land ON the de-wig cuts
//   50.0  chapel establish — organ enters on the bar (CHAPEL_CLOCK.abs(CHAPEL_EV.establish))
//   53.0  anoint — full organ chord + first BELLS (CHAPEL_CLOCK.abs(CHAPEL_EV.anoint) = 53.0)
//   53.4  priest question in (CHAPEL_EV.question; CAPTIONS.priestQ, out 57.2) — organ thins
//   58.0  vignette 1 barbershop 58.0–60.6 — STAB 58.4 (MONTAGE[0].stab); "I DO." 58.55–60.6
//   61.0  vignette 2 consiglieri 61.0–63.6 — STAB 61.4 (MONTAGE[1].stab); "I DO." 61.55–63.6
//   64.0  vignette 3 studyLift 64.0–66.6 — STAB 64.4 (MONTAGE[2].stab); "I DO." 64.55–66.6
//   67.0  vignette 4 vault 67.0–69.6 — STAB 67.4 (MONTAGE[3].stab); "I DO." 67.55–69.6
//   69.6  BARRAGE begins — percussion 69.6–73, mini-vignettes 1.1 s:
//         69.6–70.7 (STAB 70.0), 70.7–71.8 (STAB 71.1), 71.8–72.9 (STAB 72.2)
//   71.0  BELLS PEAL (CHAPEL_CLOCK.abs(CHAPEL_EV.bells) = 71.0) under the barrage peak
//   73.0  chapel return on the bar (barrage ends 72.9) — organ resumes; resolve 73–80
//   74.0  42 rises (CHAPEL_CLOCK.abs(CHAPEL_EV.rise) = 74.0) — resolution chord
//   76.4  DON OF THE FLOW caption (CAPTIONS.donTitle, out 79.6) — organ holds beneath
//   79.4  iris out (CHAPEL_CLOCK.abs(CHAPEL_EV.iris) = 79.4) — organ thins to one pedal tone
// S4 THE NEW DON 80–90 — the waltz returns darker, solo
//   80.0  study again (T.end; END_EV.studyIn = 80.0) — solo dark waltz, half tempo feel
//   83.0  wig pickup (END_EV.wigPickup = 83.0) — waltz holds its breath
//   84.0  the stroke (END_EV.stroke = 84.0) — one phrase, one 4 s caress (84.0–88.0)
//   85.5  DOOR THUD (END_EV.doorClose = 85.5) — waltz cut dead (no flash, thud + bell only)
//   85.8  end title in (END_EV.endTitle = 85.8; CAPTIONS.endTitle 85.8–89.8)
//   86.2  SINGLE BELL
//   86.8  tagline in (CAPTIONS.tagline 86.8–89.8)
//   88.5  ALL MUSIC OUT — silence to end (fin at END_EV.fin = 88.6; hold black to DURATION 90)
// =====================================================================
