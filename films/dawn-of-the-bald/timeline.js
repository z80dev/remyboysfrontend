// DAWN OF THE BALD — timeline.js. Cue sheet + choreography spine: the ONE shared
// source of truth that picture (film.js/art.js/horde.js), score (score.js) and QA
// all import. 100.0 s, 1920x1080@60, painted 2D stage, letterbox 0.8. Pure functions
// of time; no imports, no Math.random, no Date, no state between frames.
//
// GENRE: George A. Romero siege parody. The Cabald contagion is THE SHEDDING: the
// afflicted feel nothing, their hair simply lets go, and they join the bald horde.
// Hairy Remys are the living; bald Remys are the horde. Hero #42 (crimson hair,
// sword) shepherds the last survivors of Hairham City through one night inside the
// CUTZ GALLERY barbershop mall, then flies into the dawn.
//
// SCENE MAP (world g-seconds; film f = filmT(g) once the two hit-stops fold in):
//   S1 broadcast   0-13.5   RBG ACTION NEWS emergency bulletin, CRT degrade
//   TITLE         13.5-18.5 dusk ridge, horde silhouettes, stark title + tagline
//   S2 the house  18.5-34.0 dawn suburb: boarded windows, the friend turns, escape
//   S3 the road   34.0-47.0 golden-hour highway: the risen, the tackle (STOP 1),
//                           the hill reveal of the lit mall
//   S4 sanctuary  47.0-66.0 barbershop mall interior, muzak, barricade, the hat
//                           blows off (FRINGE's ring), quarantine in CHAIR 3,
//                           dusk arrival of the horde at the glass
//   S5 the siege  66.0-86.0 night: glass spiderwebs, breach (STOP 2), slow-mo
//                           flood under the mirror ball, sword hallway, FRINGE
//                           turns, the MERCY BUZZ
//   S6 dawn       86.0-100.0 rooftop, FLOW 6 chopper, the look back at the
//                           swaying horde, salute, away into the sunrise, end cards
//
// CAST (roles; ids finalized in casting.md after reviewed contact sheets — hero 42
// is canon and fixed. Provisional ids below are PATCHED IN PLACE once casting.md
// rules; every module reads ids ONLY from this table):
//   42     REME FLOW      hero      crimson hair, sword (canon)
//   TBD    FRINGE         survivor  hat hairStyle; the hat blows off in S4
//   TBD    CURLS          survivor  smallest/youngest read, big hair
//   TBD    PERM           survivor  elder, silver flow (the last perm in Hairham)
//   TBD    ANCHOR         broadcast framed 600x600 original on the news desk
//   TBDx12 HORDE_NEAR     near bald sprites (clean fronts, no text overlays)
//   TBDx20 HORDE_FAR      far bald pool for depth rows
//
// CLOCK RULE (load-bearing): all beat times below are GLOBAL seconds in the
// PRE-STOP world domain (g). The film's two hit-stops live at STOP1_G (S3 car-door
// tackle) and STOP2_G (S5 glass breach), so film time f = filmT(g):
//   f = g                    for g <= 41.2
//   f = g + 0.16             for 41.2 < g <= 72.0
//   f = g + 0.38             for g > 72.0
// An event scheduled AT a stop's g lands at the START of its freeze (house rule;
// equality is intentional). Effects (shake/flash/sparks) age on real film t;
// actors/blocking resolve g = warp(t).g. Score/SFX import this mapper, never a
// hand-added guessed delay.

export const DURATION = 100.0

// ---------- the shared clock (makeClock pattern, raiders/pirates lineage) ----------
export const STOP1_G = 41.2                        // HIT-STOP 1: car-door tackle
export const STOP2_G = 72.0                        // HIT-STOP 2: glass breach slam
export const STOPS = [
  { g: STOP1_G, d: 0.16 },                         // door slams onto the goon; hero skids
  { g: STOP2_G, d: 0.22 },                         // the pane folds; shards hang mid-air
]
export function makeClock(t0, stops = []) {
  const warp = (ts) => {                           // FILM time -> { g, stop, sl }
    let acc = 0
    for (const s of stops) {
      const rs = s.g + acc
      if (ts < rs) return { g: ts - acc, stop: null, sl: 0 }
      if (ts < rs + s.d) return { g: s.g, stop: s, sl: ts - rs }
      acc += s.d
    }
    return { g: ts - acc, stop: null, sl: 0 }
  }
  const filmT = (g) => {                           // PRE-STOP world g -> FILM time
    let acc = 0
    for (const s of stops) if (s.g < g) acc += s.d
    return g + acc
  }
  return { t0, stops, warp, filmT, abs: (g) => t0 + filmT(g) }
}
export const CLOCK = makeClock(0, STOPS)           // the ONE film clock (t0 = 0)
export const warp = CLOCK.warp                     // warp(filmT) -> { g, stop, sl }
export const filmT = CLOCK.filmT                   // filmT(g) -> film seconds
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// ---------- letterbox-safe stage (letterbox 0.8 -> ~109 px bars) ----------
export const W = 1920, H = 1080
export const SAFE = { letterbox: 0.8, bandY: [111, 969], captionYMax: 915, xMin: 0, xMax: 1920 }
export const GROUND = 930                          // default feet line (inside the band)
export const GROUNDS = {
  s1: 0, title: 930, s2: 930, s2int: 900, s3: 930, s3hill: 880,
  s4: 910, s4ext: 930, s5: 910, s6: 930,
}

// ---------- shot table (29 shots, contiguous, covers [0, DURATION)) ----------
// film.js maps each name to a draw fn; t0/t1 are FILM seconds (already filmT-folded
// — computed from the g-domain scene map above so nothing drifts).
const SH = (name, g0, g1) => ({ name, t0: filmT(g0), t1: filmT(g1) })
export const SHOTS = [
  SH('s1.static', 0, 1.6),          // channel lock out of snow
  SH('s1.anchor', 1.6, 5.0),        // anchor wide, lower third 1
  SH('s1.map', 5.0, 9.0),           // the Shed Zone map + field photos
  SH('s1.recede', 9.0, 11.5),       // anchor's own hairline lets go on camera
  SH('s1.degrade', 11.5, 13.5),     // signal collapse to static
  SH('title.ridge', 13.5, 18.5),    // dusk ridge, silhouette horde, title + tagline
  SH('s2.yard', 18.5, 23.5),        // dawn wide; hero boards the windows
  SH('s2.friend', 23.5, 28.5),      // the friend sways, hair lets go, turns: bald
  SH('s2.press', 28.5, 31.5),       // blinds close; shapes between the hedges
  SH('s2.garage', 31.5, 34.0),      // garage exit, shadows cross the front window
  SH('s3.wide', 34.0, 37.0),        // highway golden hour, abandoned cars
  SH('s3.rise', 37.0, 38.5),        // the risen stand up between the cars
  SH('s3.run', 38.5, 44.0),         // escape run + car-door tackle (STOP 1 at 41.2)
  SH('s3.hill', 44.0, 47.0),        // crest: the lit mall below, a hand waves
  SH('s4.int', 47.0, 50.5),         // interior wide: checkers, mirrors, MUZAK on
  SH('s4.perm', 50.5, 52.5),        // PERM intro; the gleam glint
  SH('s4.barricade', 52.5, 57.0),   // chair tosses; CURLS fits through the gap
  SH('s4.hat', 57.0, 60.5),         // the gust; hat off; the ring; muzak dies
  SH('s4.chair3', 60.5, 62.5),      // quarantine: FRINGE sits in CHAIR 3
  SH('s4.dusk', 62.5, 66.0),        // exterior dusk: the horde arrives at the glass
  SH('s5.mass', 66.0, 70.0),        // night; hundreds at the glass; flicker
  SH('s5.spider', 70.0, 73.0),      // palm; spiderweb; BREACH (STOP 2 at 72.0)
  SH('s5.flood', 73.0, 76.0),       // slow-mo flood under the mirror ball, muzak peak
  SH('s5.hallway', 76.0, 81.5),     // sideways tracking sword line (3 strikes)
  SH('s5.buzz', 81.5, 86.0),        // FRINGE turns; the mercy buzz; roof door
  SH('s6.roof', 86.0, 88.5),        // pre-dawn rooftop, wind, distant thump
  SH('s6.lift', 88.5, 91.0),        // FLOW 6 descends; PERM + CURLS hoisted
  SH('s6.lookback', 91.0, 94.6),    // the swaying horde faces the sunrise; salute; board
  SH('s6.away', 94.6, 99.62),       // chopper into the dawn; end cards (filmT-folded to 100.0)
]

// ---------- cast (ids PATCHED from casting.md; roles are the stable keys) ----------
export const CAST = {
  HERO: 42,       // canon
  FRINGE: 834,    // casting.md ruled — bald, plain grey sweatshirt, clean front
  FRIEND: 1242,   // casting.md ruled — bald neighbor, soft-blue tee, turns in S2
  CURLS: 158,     // casting.md ruled — copper crown mop, young read
  PERM: 1889,     // casting.md ruled — silver-cream flow + mustache, elder read
  ANCHOR: 392,    // casting.md ruled — midnight flow, black tee; framed orig on the desk
  HORDE_NEAR: [1217, 174, 980, 233, 321, 585, 456, 554, 129, 555, 347, 690], // casting.md ruled
  HORDE_FAR: [5, 142, 152, 183, 219, 307, 382, 458, 564, 582, 645, 704, 808, 882, 892, 1017, 1061, 1249, 908, 685], // casting.md ruled
}
export const HERO = CAST.HERO

// ---------- beats (world g; every module schedules through filmT) ----------
export const EV_S1 = {
  tvOn: 0.35,          // channel lock: static tears -> broadcast frame
  anchor: 1.7,         // anchor looks up at camera
  lower1: 2.5,         // 'THE SHEDDING — DAY 3'
  mapCut: 5.0,         // hard cut to the map board
  zoneGrow: 5.4,       // the Shed Zone blotch grows through the county
  lower2: 5.9,         // 'AFFLICTED FEEL NOTHING. THEY SIMPLY LET GO.'
  anchorBack: 8.9,     // back to desk
  recede: 9.8,         // anchor scratches head; hairline lets go strand by strand
  anchorStare: 10.9,   // he stares at his own hand, deadpan
  degrade: 11.6,       // rolling bar, chroma tears, audio slurs
  deadAir: 13.1,       // full static one beat before the cut
}
export const EV_TITLE = {
  in: 14.3,            // title fades up over the ridge
  tag: 15.7,           // tagline under it
  hordePass: 16.4,     // a close silhouette crosses the ridge foreground
  out: 18.2,
}
export const EV_S2 = {
  in: 18.6,            // dawn wide: sodium porch light still on
  boards: [20.0, 21.2, 22.4],  // three nail hits (score rides these exactly)
  look: 23.7,          // hero notices the friend in the yard
  sway: 24.3,          // friend sways, back to us, hair sacrelax
  shed: 24.8,          // first strands let go (hair-fall begins)
  turn: 26.1,          // friend turns: BALD. arms rise slow
  blinds: 27.2,        // hero gently pulls the blind (dread beat, no stab)
  hedges: 28.8,        // three more silhouettes rise between the hedges
  arm: 30.0,           // hero straps the sword, grabs the duffel
  garage: 31.6,        // garage door grinds up
  exit: 32.4,          // hero rolls out low
  cross: 33.2,         // shapes cross the front window as he leaves
}
export const EV_S3 = {
  wide: 34.1,          // highway wide, birds (dread motif answers)
  scavenge: 35.6,      // hero at a station wagon, tries the door
  rise: 37.1,          // risen stand in the car gaps (6, then 6 more)
  run: 38.6,           // escape run, screen-left
  doorGrab: 40.4,      // goon lunges from behind a van door
  tackle: STOP1_G,     // 41.2 HIT-STOP 1: door slams the goon flat
  clear: 42.6,         // sword sweep drops two more, gap opens
  hill: 44.1,          // hero crests the hill, wind, hold
  reveal: 44.9,        // the valley: CUTZ GALLERY lit, pole spinning
  wave: 45.7,          // tiny figure on the roof waves both arms
}
export const EV_S4 = {
  in: 47.1,            // interior wide; fluoro hum; checkers
  muzakOn: 47.7,       // MUZAK starts (cheery, tinny, band-limited)
  inspect: 48.6,       // FRINGE mirror-on-pole checks CURLS' hairline
  permWalk: 50.7,      // PERM walks the line; the perm speaks for itself
  glint: 51.4,         // perm gleam: star glint across the silver
  tosses: [53.0, 54.0, 55.0],  // styling chairs stacked before the doors
  gap: 55.8,           // CURLS slips the last chair through the gap, thumbs up
  gust: 57.1,          // wind under the doors; hair ripples
  hatLift: 57.7,       // FRINGE's hat lifts off his head
  hatOff: 58.4,        // hat tumbles away — the RING is visible
  spot: 59.0,          // muzak record-STOPS; all eyes; low drone in
  ringGrow: 59.4,      // the bald ring spreads a few more pixels (time-lapse dread)
  quarantine: 60.7,    // FRINGE walks alone to CHAIR 3, sits
  clippersDown: 61.7,  // hero sets clippers by the sink, solemn (does NOT use them yet)
  duskCut: 62.6,       // exterior dusk wide
  arrive: 63.2,        // first rank of the horde enters frame
  press: 64.1,         // first palm flattens on the glass
  flicker: 65.3,       // fluorescents stutter once
}
export const EV_S5 = {
  night: 66.1,         // interior night; horde massed; shapes layered deep
  muzakCreep: 66.5,    // MUZAK resumes — same tune, slower, hollow (under a bed)
  swayAll: 67.8,       // the mass sways in slow unison (Romero melancholy)
  palm: 69.2,          // a second palm; a forehead against the glass
  spider: 70.1,        // first crack spokes radiate from the palm
  webGrow: 71.0,       // web reaches the frame edges
  breach: STOP2_G,     // 72.0 HIT-STOP 2: pane folds inward, shards hang
  flood: 73.1,         // horde floods in SLOW-MO; mirror ball turns; muzak full
  ballGleam: 74.2,     // mirror ball throws rotating glints across the horde
  strikes: [76.8, 78.4, 80.0],  // hallway line: three sword strikes ride the score
  permLine: 80.6,      // PERM holds the sink line with the straight razor
  turn: 81.6,          // FRINGE's hair lets go all at once — snow
  hesitate: 82.8,      // hero's swing stops mid-arc; he lowers the sword
  buzzPlug: 83.6,      // MERCY BUZZ: clippers hum up to speed, into the beat
  buzzPass: 84.3,      // first pass clean; second pass across
  smile: 85.1,         // FRINGE smiles, pats his own head: 'clean.'
  doorSlam: 85.3,      // roof door slams; horde takes the floor behind
                       // (was 85.9 g = film 86.28, landing inside S6 — pulled back)
}
export const EV_S6 = {
  roof: 86.1,          // pre-dawn rooftop; wind; Hairham glows faint below
  thump: 86.8,         // distant rotor thump (off-screen)
  chopper: 87.3,       // FLOW 6 nose-up over the parapet, light lancing
  liftLines: 88.6,     // lines drop; PERM first, CURLS in the pack
  hoist: 89.4,         // both hoisted, CURLS waves both arms
  lookback: 91.1,      // hero at the parapet: the mall below, horde fills it,
  swayMass: 91.9,      //   every bald head facing the coming sunrise, swaying
  salute: 93.1,        // sword salute to PERM's line below
  board: 93.9,         // hero grabs the skid, pulled up
  away: 94.7,          // chopper banks into the sunrise
  card: 96.4,          // end card fades up as the sky takes the chopper
}

// ---------- horde scale (counts owned here; horde.js consumes, film.js places) ----------
export const HORDE = {
  titleRidge: { n: 26, rows: 2 },      // silhouettes crossing the dusk ridge
  s2hedges: 3,                          // early risers between the hedges
  s3risen: [6, 6],                      // two waves at the highway
  s4arrive: { n: 22, rows: 2 },         // dusk arrival at the glass (exterior)
  s5mass: { n: 46, rows: 3 },           // night mass at the glass (through it)
  s5flood: { n: 40, rows: 2 },          // inside, slow-mo (QA-C: raise the count)
  s5hallway: 9,                         // hallway line depth
  s6below: { n: 60, rows: 3 },          // rooftop lookback, tiny in the mall below
}

// ---------- muzak state machine (score.js is the ONLY consumer) ----------
// ON 47.7 (cheery, band-limited, slightly warped) -> CUT 59.0 (record-stop +
// tape warble down) -> SILENCE (drone only) 59.0-66.5 -> CREEP 66.5 (same tune,
// -2 semitones, 0.85x, hollow band) -> FULL 73.1 (front of mix, the gag peaks)
// -> UNDER 80.0 (ducked under the hallway line) -> DUCK 83.6 (clippers take the
// beat) -> FADE 85.9 -> OUT by 86.6 (wind owns S6).
export const MUZAK = {
  on: 47.7, cut: 59.0, creep: 66.5, full: 73.1, under: 80.0, duck: 83.6, fade: 85.9,
}

// ---------- caption ledger (reading text on the overlay; styles in film.js) ----------
export const CAPS = [
  { id: 'title', text: 'DAWN OF THE BALD', t0: filmT(14.3), t1: filmT(18.5), style: 'title', y: 330 },
  { id: 'tag', text: 'WHEN THERE IS NO MORE HAIR IN HELL, THE BALD WILL WALK THE EARTH.', t0: filmT(14.4), t1: filmT(18.5), style: 'tagline', y: 430 },
  { id: 'endtitle', text: 'DAWN OF THE BALD', t0: filmT(96.2), t1: 99.9, style: 'title', y: 500, anim: 'cut', in: 0 },
  { id: 'endtag', text: 'NO HAIR IS SAFE.', t0: filmT(96.2), t1: 99.9, style: 'tagline', y: 580, anim: 'cut', in: 0 },
]

// ---------- drawn-text ledger (single source; pixel/CRT/HUD text lives on the
// native canvas and is QA'd by eye, per skill rules — lint cannot judge it) ----------
export const DRAWN = {
  station: 'FLOW 6 NEWS',
  program: 'RBG ACTION NEWS — EMERGENCY BULLETIN',
  lower1: 'THE SHEDDING — DAY 3',
  lower2: 'AFFLICTED FEEL NOTHING. THEY SIMPLY LET GO.',
  anchor: 'DAN FLOWSTER · FLOW 6',
  ticker: 'HAIRHAM CITY UNDER FLOW ORDER · SALONS CLOSED · REMAIN CALM · CONDITIONER DOES NOT WORK · STAY HAIRY ·',
  mapTitle: 'FOLLICLE COUNTY',
  zone: 'THE SHED ZONE',
  city: 'HAIRHAM',
  mall: 'CUTZ GALLERY',
  mallSub: 'MALL OF FLOW · 200 STORES · 1 BARBER',
  chopper: 'FLOW 6',
  chair3: 'CHAIR 3',
  roof: 'STAFF ONLY',
}

// ---------- self-check: shots contiguous, beats inside their shots, caps held ----------
const chk = []
{
  let cur = 0
  for (const s of SHOTS) {
    if (Math.abs(s.t0 - cur) > 1e-9) chk.push(`shot ${s.name} gap at ${s.t0}`)
    if (s.t1 <= s.t0) chk.push(`shot ${s.name} empty`)
    cur = s.t1
  }
  if (Math.abs(cur - DURATION) > 1e-9) chk.push(`shots end ${cur} != ${DURATION}`)
  const SCENE_BEATS = [
    ['s1', EV_S1, 0, 13.5], ['title', EV_TITLE, 13.5, 18.5], ['s2', EV_S2, 18.5, 34],
    ['s3', EV_S3, 34, 47], ['s4', EV_S4, 47, 66], ['s5', EV_S5, 66, 86], ['s6', EV_S6, 86, 99.62],
  ]
  for (const [nm, ev, a, b] of SCENE_BEATS) for (const [k, g] of Object.entries(ev)) {
    if (Array.isArray(g)) { for (const x of g) if (x < a || x >= b) chk.push(`${nm}.${k}[${x}] outside ${a}-${b}`); continue }
    if (g < a || g >= b) chk.push(`${nm}.${k}=${g} outside ${a}-${b}`)
  }
  for (const c of CAPS) if (c.t1 - c.t0 < 3) chk.push(`cap ${c.id} hold ${c.t1 - c.t0}`)
  if (EV_S3.tackle !== STOP1_G || EV_S5.breach !== STOP2_G) chk.push('stop beats detached from STOPS')
  for (const s of STOPS) if (s.g < 0 || s.g >= DURATION) chk.push('stop outside film')
}
if (chk.length) throw new Error('timeline self-check failed:\n' + chk.join('\n'))
