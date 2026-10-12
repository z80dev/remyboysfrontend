// =====================================================================
// THE TERMHAIRNATOR — cue sheet + choreography (screenplay truth)
// =====================================================================
// The single shared source of truth that picture (film.js/art.js) AND
// score (score.js) both import. 100.0 s, 1920x1080 @60fps, 2.39:1
// letterbox, steel-blue night -> molten orange -> dawn gold. IMPORT-FREE:
// pure constants + small pure helpers — validate() runs under bare node.
// All pure functions of time (no Math.random, no Date, no state).
//
// LOGLINE: Shedgment Day never quite happened. The machines sent a chrome
// bald Terminator back to shave the last magnificent head on Earth — and
// it learned, one strand at a time, why we flow.
//
// ---------------------------------------------------------------------
// SHOT MAP (film seconds; contiguous, covers [0, 100) exactly):
//   PROLOGUE 0-10 · ARRIVAL 10-22 · STREETS 22-34 · CHASE 34-52 ·
//   FOUNDRY 52-82 · EPILOGUE 82-92 · ENDCARD 92-100.  DUR = 100.0.
//
// UNITS (read before consuming anything below):
//   *_EV tables ....... shot-local WORLD seconds (g). An event at a
//                       stop's g lands at the START of its freeze
//                       (template semantics). Map to film time ONLY
//                       via CLOCK.abs(g) — never hand-add t0.
//   CLOCK.warp(lt) .... lt = SHOT-LOCAL film seconds (what draw(ctx,lt,..)
//                       receives), NOT absolute film time; returns
//                       { g, stop, sl } — sl is a SIBLING of stop.
//   MASTER ............ ABSOLUTE film seconds (every value clock-derived).
//   CAPTIONS t0/t1 .... film seconds. Fully-visible window =
//                       [t0+in(+typing), t1-out]; house floor 3.0 s
//                       (end card kicker 3.5 s).
//   FLASHES ........... [absT, peak, decay]; peaks <= 0.24, decay <= 0.2.
//
// HUD / CRT text is PICTURE (drawn by the builder on the native canvas,
// mono >= 24 px at 1080p, inspected by hand) — it appears nowhere in
// CAPTIONS except the three dialogue lines + narration + end card.
// "I'LL BE BALD." is a CAPTION slam (it is spoken dialogue, not HUD).
//
// ---------------------------------------------------------------------
// TEMPO ARITHMETIC (pinned downbeats; checked in validate):
//   TITLE_SLAM prologue 96bpm 4/4 -> bar=2.5;   bar1 = 2.5    (brief)
//   CLASH_1    foundry  96bpm 4/4 -> bar=2.5;   bar4 = 62.0   (g10)
//   CORE_STAB  foundry  bar8 = 72.0 (g20) — the film's biggest freeze
//   SPROUT     foundry  bar9 = 74.5 (g21.27)
//   STEEL_CLOSE foundry bar12= 82.0 (g30) — the CUT is a downbeat
//   CARD_SLAM  endcard 120bpm 4/4 -> bar=2.0;  bar1 = 94.0    (g2)
// CLOCK-pinned (NOT grid; declared): lightning 11.0, eyeIgnite 15.5,
// lockSting 26.0, heroBolts 28.0, crash+boom 44.5 (between chase bars 5-6),
// hairGrab 66.0, thumbsUp 81.0 (inside the slow-mo crawl).
//
// HIT-STOPS (world freezes; shake/flash/score keep real time via sl).
// g values are BACK-COMPUTED so film times land on the target downbeats
// (every earlier stop's d shifts film time — 3000 "kill g" lesson):
//   chase     g 7.50  d 0.25  film 41.50-41.75  hero dives under gate
//   chase     g10.25  d 0.30  film 44.50-44.80  bike CRASH; fireball blooms
//                                       during the freeze (sl-driven)
//   foundry   g10.00  d 0.28  film 62.00-62.28  CLASH 1 (sword vs shaver)
//   foundry   g13.72  d 0.40  film 66.00-66.40  HAIR GRAB (scandal sting)
//   foundry   g19.32  d 0.55  film 72.00-72.55  CORE STAB — biggest freeze
//   endcard   g 2.00  d 0.15  film 94.00-94.15  card slam
// The molten sink (foundry g28.2-30) is slow-mo choreographed in g
// (actor path crawls) — NOT a stop; the clock only bends at hard stops.
//
// KEY PLAN: home C minor (steel). epilogue CUT flips to C MAJOR (the
// floz/3000 mode-flip move). FLOW motif stated minor-dark nowhere —
// it belongs to the machine's awakening: sprout chime (3 notes, g23)
// prefigures the full 5-note FLOW theme, which only exists major.
// =====================================================================

export const DUR = 100.0

// ---------- shot map (film seconds) ----------
// CUTS:  0        10        22        34        52        82     92  100
export const T = {
  prologue: 0,   // S1 CRT boot + ash playground + TITLE SLAM      0-10  (10.0)
  arrival: 10,   // S2 lightning bubble; the machine stands        10-22 (12.0)
  streets: 22,   // S3 neon rain; FLOW CUTS; the lock-on           22-34 (12.0)
  chase: 34,     // S4 bike chase; crash; I'LL BE BALD             34-52 (18.0)
  foundry: 52,   // S5 the duel; the sprout; the sink              52-82 (30.0)
  epilogue: 82,  // S6 dawn; the strand is planted                 82-92 (10.0)
  endcard: 92,   // S7 NO FATE BUT WHAT WE GROW                    92-100 (8.0)
}

export const SHOTS = [
  { name: 'prologue', t0: T.prologue, t1: T.arrival,
    desc: 'Black. CRT scanline flicker g0-1.2; SHEDNET boot text types on (mono, picture): "SHEDNET OS v9.09 // FOLLICLE DIRECTIVE 101: ALL HAIR IS A THREAT". Narrator serif caption p1 rides 0.8-9.4. Fade up g1.2 on the ASH PLAYGROUND: a swing-set silhouette under falling ash, three chrome Remy SKULLS half-buried (frost blue, red eye gone dark). TITLE SLAM g2.5 (film 2.5 = bar 1): "THE TERMHAIRNATOR" chiseled steel + dust burst + braam + flash 0.18. Subtitle "A REMY BOYS FILM" g3.2. Slow push-in on the dark-eye skull; a single ash strand lands on it g8.0. Taiko heartbeat out from g5.0.' },
  { name: 'arrival', t0: T.arrival, t1: T.streets,
    desc: 'Rain alley, steel-blue. LIGHTNING TIME-BUBBLE g1.0 (film 11.0): seeded electric sphere cracks across the sky, thunder-crack, flash; it strikes the alley floor — a chrome crouched FIGURE is left kneeling in a glowing scorch ring, molten cracks cooling (orange -> dark over 2s). It RISES g3.0-4.2 (servo whirs, weight shifts, rain hisses off chrome). RED EYE IGNITES g5.5 (film 15.5): a spark, then the red lens glows. POV RED HUD SCAN g6.0-11.5 (picture, mono, reticles): dumpster "NO HAIR — PASS", a MOP leaning by a door "SYNTHETIC — PASS", a stray CAT arching "FUR — NON-TARGET", then type-on "DIRECTIVE: LOCATE REMY 42". Pull out of POV at g11.6; the machine is already walking out of frame, coat-less, unhurried. 66bpm dread.' },
  { name: 'streets', t0: T.streets, t1: T.chase,
    desc: 'Neon rain street. Hero REMY 42 (crimson hair, sword upright in his right hand) steps out of the barbershop "FLOW CUTS" (neon scissor + comb sign), umbrella up g0.5. Gags in the shop window: wigs on stands, "WE TAKE WALK-INS" decal. g4.0 (film 26.0): LOCK STING — in the window glass, behind his reflection, a RED EYE blooms; red HUD bracket frames his hair: "LOCK: REMY 42 / HAIR: CRIMSON / CLASS: MAGNIFICENT". He turns g4.6 — end of the street, a silhouette in rain. He RUNS g6.0 (film 28.0). On-foot chase down the block: the machine STRIDES (never runs — worse), shouldering a bin aside g8.5 (bin clatter, rain streaks, neon reflections in puddles). Two far-sprite bystanders scatter g9.5. Hero rounds the corner g11.8; cut on the motion.' },
  { name: 'chase', t0: T.chase, t1: T.foundry,
    desc: 'The machine stops at a parked MOTORCYCLE g0.8, grips the handlebar — HOTWIRE SPARK g1.4 — engine catches g1.5 (film 35.5), headlight flares. RIDE g2.0-7.5: rain streaks, speed lines, storefront neon smears (parallax layers); the hero sprints the same block, machine pacing him at the curb, red eye tracking. HERO DIVES under a descending FOUNDRY GATE g7.5 (film 41.50, stop 0.25) — sparks as he slides under. The bike CANNOT stop: CRASH g10.25 (film 44.5, stop 0.30) into a scrap barrier — EXPLOSION blooms DURING the freeze (fireball grows on sl), boom + flash 0.22. Fire bed g10.55-: silhouette burning; g11.45 (film 46.0) it WALKS OUT of the fire — left side FLESH BURNED AWAY (chrome endoskeleton arm + half-skull revealed, orange rim-light) — caption slam "I\'LL BE BALD." g12.05 (film 46.6-49.95). It strides; the hero backs through the foundry side door g16.75 (51.3); the machine follows, filling the burning doorway g17.30 (51.85) — cut to black-orange.' },
  { name: 'foundry', t0: T.foundry, t1: T.epilogue,
    desc: 'Interior: catwalks over a MOLTEN POOL (orange glow, heat shimmer, drifting sparks; chains, ladles, a cooled steel panel). Hero backs to the rail; the machine steps off the walkway grating g0.5, chrome half-lit. MACHINE LINE (mono red caption f1) film 53.4-56.6: "HAIR DESIGNATED FOR REMOVAL." HERO LINE (Anton white, film 56.8-60.0): "You shaved the wrong city." DUEL: shavecannon arm vs sword. CLASH 1 g10.0 (film 62.0 = bar 4, stop 0.28) — spark fan, both slide. Exchange: the machine severs a steam pipe g11.12 (63.4; steam blast, near-miss), the hero parries sparks off the rail. HAIR GRAB g13.72 (film 66.0, stop 0.40 — scandal sting, everything drops but a high sine): the machine\'s chrome hand grips the hero\'s RED MANE. Struggle; the hero HEADBUTTS g16.52 (69.2; nose-plate dents, comic CLONK), tears free, sword flourish g17.32. CORE STAB g19.32 (film 72.0 = bar 8, stop 0.55, biggest): sword into the glowing chest seam; the machine STAGGERS and KNEELS g19.37+, core light guttering. Silence g20.37 (73.6). SPROUT g21.27 (film 74.5 = bar 9): ONE GREEN STRAND grows from the chrome scalp (3-note chime). It touches the strand g21.87. REFLECTION BEAT: in the cooled steel panel it sees skull + strand. RED EYE FLICKERS WARM g24.57 (77.8; red -> amber pulse). It rises g24.97, lowers the shavecannon (blades retract, fold flat), and walks to the PIT RIM g25.27-26.97. CAPTION f3 (mono, warm amber, film 78.4-81.9): "I KNOW NOW WHY YOU FLOW." It steps onto the chain hoist hook g26.97 (80.2); SINK CRAWL g27.27-28.77 (film 80.5-82.0, slow-mo in g, NOT a stop): it descends into the molten pool to the waist, then chest; THUMBS UP g27.77 (81.0); eye dims to warm white g28.27 (81.5); the strand detaches and drifts up on the heat g28.37 (81.6); STEEL CLOSES g28.77 (film 82.0 = bar 12 downbeat) — molten flare + sizzle + flash 0.16; CUT.' },
  { name: 'epilogue', t0: T.epilogue, t1: T.endcard,
    desc: 'DAWN. Rain over; sky gold-to-blue. Outside the foundry door, the hero opens his palm — the green STRAND settles into it g1.0 (film 83.0, chime). Narrator serif e1 g0.7-4.3 (film 82.7-86.3): "The machines sent one of theirs to end our hair." He kneels, PLANTS the strand in a pavement crack g3.5 (film 85.5). TIME-LAPSE g4.5-7.5 (film 86.5-89.5): a tiny FUZZ SAPLING grows (a curl of green strands, dew glinting, sun sliding up). Narrator e2 g4.5-8.0 (film 86.5-90.0): "It left us a strand." Hold: the hero, the sapling, the waking gold city; his hair lifts in the morning wind g8-10. 72bpm C major — FLOW theme stated in full.' },
  { name: 'endcard', t0: T.endcard, t1: DUR,
    desc: 'Black. CARD SLAM g2.0 (film 94.0 = bar 1, stop 0.15, flash 0.12): "THE TERMHAIRNATOR" (Anton, steel fill + red eye dot on the A). Kicker under: "NO FATE BUT WHAT WE GROW." Credit line: "A REMY BOYS FILM · MMXXVI". All three hold to g7.7 (film 99.7); hymn resolves; all reverb tails finish before 100 (taiko shared-reverb lesson).' },
]

// ---------- shot clocks (floz pattern, verbatim semantics) ----------
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

// ---------- score sections ----------
// Each section t0 is a downbeat by construction. Key plan: C minor home;
// epilogue CUT = C MAJOR mode flip (82.0). No copyrighted melody is
// quoted anywhere; all motifs below are original to this film.
export const SECTIONS = [
  { name: 'prologue', t0: T.prologue, t1: T.arrival, bpm: 96, beats: 4, key: 'C minor',
    feel: 'CRT hum + static ticks g0-1.2; low drone under; SHEDNET motif (braam, C2 + semitone) exactly on the TITLE SLAM (bar 1, 2.5); taiko heartbeat pulses out from bar 2 (5.0); wind + distant metal groans. Tails clear before the cut.' },
  { name: 'arrival', t0: T.arrival, t1: T.streets, bpm: 66, beats: 4, key: 'C minor',
    feel: 'HALF-TIME dread. Rain bed (filtered noise) from g0. THUNDER-CRACK + sub-drop exactly on the bubble strike (11.0, CLOCK-pinned — bar 1 at 13.64 is a coincidence pickup, NOT the crack). Servo whirs track the rise (3.0-4.2). Eye-ignite spark (15.5) = single glass tick + rising red sine. Scan beeps (square blips) at each HUD read g6.0-11.5; one low braam under "DIRECTIVE" g10.4. Walk-out = boots on wet stone, quarter notes.' },
  { name: 'streets', t0: T.streets, t1: T.chase, bpm: 100, beats: 4, key: 'C minor',
    feel: 'Neon pulse: muted bass eighths + hat ticks, rain bed continues. LOCK STING (26.0, CLOCK-pinned) = brake-clang + detuned alarm swell. HERO RUNS (28.0) = tempo feel doubles (running eighths), engine growl pre-echo. Bin clatter g30.5, bystander yelps g31.5 (pitched-down comedic). Cut on the corner-turn, no ritard.' },
  { name: 'chase', t0: T.chase, t1: T.foundry, bpm: 132, beats: 4, key: 'C minor',
    feel: 'INDUSTRIAL OSTINATO: engine drone (sawtooth + noise, 132-compatible grind), metal percussion on bars, gear-shift swells every 2 bars. Engine catch 35.5. GATE DIVE 41.5: everything mutes for the 0.25 freeze except a hi sl-time riser. CRASH 44.5 (CLOCK-pinned, between bars 5-6): boom + explosion roar bloom across the 0.30 freeze. Fire bed = low crackle. WALK-OUT 46.0: one colossal braam; caption slam 46.6 lands ON it. Boots quarter-notes to the door; doorway g51.7 = low sub-drop, cut.' },
  { name: 'foundry', t0: T.foundry, t1: T.epilogue, bpm: 96, beats: 4, key: 'C minor',
    feel: 'Molten ambience: sub roar + ladle clinks + spark ticks. Machine line 53.5-56.5 under a cold mono pulse. Hero line 56.5-59.5: string swell. DUEL: 96bpm clang grid — CLASH 1 = bar 4 (62.0): anvil hit + spark fan. HAIR GRAB = bar 5 beat 3 (66.0): SCANDAL STING — score drops to ONE high sine + heartbeat for the whole 0.40 freeze; headbutt 69.7 = comedic tuba-bonk + clonk. CORE STAB = bar 8 (72.0): the film\'s biggest hit — mega impact, then near-silence g21.6-23 (core gutter ticks only). SPROUT = bar 9 (75.0): 3-note bell chime (G5-B5-D6), nothing else. Reflection 75.5-77.5: warm pad fades in (first major-leaning harmony — a pre-echo of the flip). "I KNOW" caption 78.4: single warm chord. Sink crawl 80.5-82: theme fragments on solo piano, sizzle rises; STEEL CLOSE = bar 12 (82.0): flare hit, then the cut carries the mode flip.' },
  { name: 'epilogue', t0: T.epilogue, t1: T.endcard, bpm: 72, beats: 4, key: 'C MAJOR (mode flip)',
    feel: 'MODE-FLIP at the cut (82.0): FLOW theme (5 notes) stated in full over dawn strings + soft piano; birdsong ticks g1-4; plant chime 85.5; time-lapse = harp arpeggios accelerating gently 86.5-89.5; wind swell g8-10. All warm, restrained — no percussion.' },
  { name: 'endcard', t0: T.endcard, t1: DUR, bpm: 120, beats: 4, key: 'C major',
    feel: 'Hymn resolve: sustained choir + strings I-V-I over bars 0-3; CARD SLAM = bar 1 (94.0) soft gong; everything resolves by 99.4 so all tails finish before 100.0 (taiko shared-reverb lesson).' },
]

// ---------- bar/beat grid helpers (floz pattern) ----------
const SECT = {}
for (const s of SECTIONS) SECT[s.name] = s
export const b = (name, bar, beat = 0) => {
  const s = SECT[name]
  return s.t0 + ((bar * s.beats + beat) * 60) / s.bpm
}
export const barSec = (name) => (SECT[name].beats * 60) / SECT[name].bpm
export const beatSec = (name) => 60 / SECT[name].bpm

// ---------- motifs (original; MIDI offsets from the root; quote nothing) ----------
// SHEDNET: the machine menace — semitone + tritone, C2, braam voice.
export const SHEDNET_ROOT = 36                  // C2
export const SHEDNET = [0, 1, 6]                // C-Db-Gb (cold, unresolved)
// FLOW: the awakening theme — stated ONLY major (it belongs to growth).
// Sprout = its first three notes as a bell chime (foundry g23).
export const FLOW_ROOT = 60                     // C4
export const FLOW = [0, 4, 7, 12, 16]           // C-E-G-C5-E5 (rise + bloom)
export const SPROUT = [0, 4, 7]                 // chime triplet (G5: root 79)
export const SPROUT_ROOT = 79                   // G5
export const motifFlow = () => FLOW.map((k) => FLOW_ROOT + k)
export const motifSprout = () => SPROUT.map((k) => SPROUT_ROOT + k)

// ---------- per-shot clocks (stops in shot-local WORLD seconds) ----------
export const PROLOGUE = makeClock(T.prologue, [])
export const ARRIVAL = makeClock(T.arrival, [])
export const STREETS = makeClock(T.streets, [])
export const CHASE = makeClock(T.chase, [
  { g: 7.5, d: 0.25 },   // gate dive      -> film 41.50
  { g: 10.25, d: 0.30 }, // bike crash     -> film 44.50 (fireball blooms on sl)
])
export const FOUNDRY = makeClock(T.foundry, [
  { g: 10.0, d: 0.28 },  // clash 1        -> film 62.00 (bar 4)
  { g: 13.72, d: 0.40 }, // hair grab      -> film 66.00 (after clash's 0.28)
  { g: 19.32, d: 0.55 }, // core stab      -> film 72.00 (bar 8; after 0.68 of stops)
])
export const EPILOGUE = makeClock(T.epilogue, [])
export const ENDCARD = makeClock(T.endcard, [{ g: 2.0, d: 0.15 }])
export const CLOCK = { prologue: PROLOGUE, arrival: ARRIVAL, streets: STREETS, chase: CHASE, foundry: FOUNDRY, epilogue: EPILOGUE, endcard: ENDCARD }

// ---------- shot-local event tables (g = world seconds) ----------
export const PROLOGUE_EV = {
  crt: 0.0, typeStart: 0.2, narrator: 0.8, fadeUp: 1.2, titleSlam: 2.5,
  subtitle: 3.2, heartbeatOut: 5.0, ashLand: 8.0,
}
export const ARRIVAL_EV = {
  rain: 0.0, strike: 1.0, riseStart: 3.0, riseEnd: 4.2, eyeIgnite: 5.5,
  scanStart: 6.0, scanDumpster: 6.2, scanMop: 7.2, scanCat: 8.4,
  scanDirective: 10.4, scanEnd: 11.5, povOut: 11.6,
}
export const STREETS_EV = {
  shopExit: 0.5, umbrella: 0.8, lockSting: 4.0, turn: 4.6, heroRuns: 6.0,
  binClatter: 8.5, bystanders: 9.5, corner: 11.8,
}
// g values AFTER each stop are back-computed (film - t0 - prior stop d's):
//   chase after crash stop (acc 0.55) and foundry after coreStab (acc 1.23).
export const CHASE_EV = {
  atBike: 0.8, hotwire: 1.4, engineCatch: 1.5, ride: 2.0, gateDive: 7.5,
  crash: 10.25, fireBed: 10.55, walkOut: 11.45, captionSlam: 12.05,
  heroDoor: 16.75, doorway: 17.30,
}
export const FOUNDRY_EV = {
  machineStep: 0.5, machineLine: 1.5, heroLine: 4.5, clash1: 10.0,
  pipeSever: 11.12, hairGrab: 13.72, headbutt: 16.52, flourish: 17.32,
  coreStab: 19.32, kneel: 19.37, silence: 20.37, sprout: 21.27, touch: 21.87,
  reflect: 22.27, eyeWarm: 24.57, rise: 24.97, walkRim: 25.27, iknow: 25.17,
  hook: 26.97, sinkStart: 27.27, thumbsUp: 27.77, eyeDim: 28.27, strandOff: 28.37,
  steelClose: 28.77,
}
export const EPILOGUE_EV = {
  dawn: 0.0, narrator1: 0.7, strandSettles: 1.0, plant: 3.5,
  timelapseStart: 4.5, narrator2: 4.5, timelapseEnd: 7.5, windSwell: 8.0,
}
export const ENDCARD_EV = { slam: 2.0, holdEnd: 7.7 }

// ---------- MASTER event table (absolute film seconds; all clock-derived) ----------
export const MASTER = {
  // --- musical map ---
  bpm: 96, sections: SECTIONS,
  motifs: {
    shednet: { root: SHEDNET_ROOT, notes: SHEDNET, voice: 'braam', shots: 'prologue/arrival/chase' },
    flow: { root: FLOW_ROOT, notes: FLOW, voice: 'strings+piano', shot: 'epilogue (major only)' },
    sprout: { root: SPROUT_ROOT, notes: SPROUT, voice: 'bell chime', shot: 'foundry g23 = bar 9' },
    modeFlip: { t: T.epilogue, from: 'C minor', to: 'C major', restatement: 'FLOW theme in full at epilogue t0' },
  },

  // --- S1 prologue ---
  crt: PROLOGUE.abs(PROLOGUE_EV.crt),                    // 0.0
  narratorIn: PROLOGUE.abs(PROLOGUE_EV.narrator),        // 0.8 (caption p1)
  fadeUp: PROLOGUE.abs(PROLOGUE_EV.fadeUp),              // 1.2
  titleSlam: PROLOGUE.abs(PROLOGUE_EV.titleSlam),        // 2.5 == b('prologue',1)
  subtitle: PROLOGUE.abs(PROLOGUE_EV.subtitle),          // 3.2
  heartbeatOut: PROLOGUE.abs(PROLOGUE_EV.heartbeatOut),  // 5.0
  ashLand: PROLOGUE.abs(PROLOGUE_EV.ashLand),            // 8.0

  // --- S2 arrival ---
  rain: ARRIVAL.abs(ARRIVAL_EV.rain),                    // 10.0
  lightning: ARRIVAL.abs(ARRIVAL_EV.strike),             // 11.0 CLOCK-pinned (crack + sub-drop)
  riseStart: ARRIVAL.abs(ARRIVAL_EV.riseStart),          // 13.0
  eyeIgnite: ARRIVAL.abs(ARRIVAL_EV.eyeIgnite),          // 15.5
  scanStart: ARRIVAL.abs(ARRIVAL_EV.scanStart),          // 16.0
  scanDumpster: ARRIVAL.abs(ARRIVAL_EV.scanDumpster),    // 16.2
  scanMop: ARRIVAL.abs(ARRIVAL_EV.scanMop),              // 17.2
  scanCat: ARRIVAL.abs(ARRIVAL_EV.scanCat),              // 18.4
  scanDirective: ARRIVAL.abs(ARRIVAL_EV.scanDirective),  // 20.4
  povOut: ARRIVAL.abs(ARRIVAL_EV.povOut),                // 21.6

  // --- S3 streets ---
  shopExit: STREETS.abs(STREETS_EV.shopExit),            // 22.5
  lockSting: STREETS.abs(STREETS_EV.lockSting),          // 26.0 CLOCK-pinned (alarm swell)
  turn: STREETS.abs(STREETS_EV.turn),                    // 26.6
  heroRuns: STREETS.abs(STREETS_EV.heroRuns),            // 28.0
  binClatter: STREETS.abs(STREETS_EV.binClatter),        // 30.5
  bystanders: STREETS.abs(STREETS_EV.bystanders),        // 31.5
  corner: STREETS.abs(STREETS_EV.corner),                // 33.8

  // --- S4 chase ---
  atBike: CHASE.abs(CHASE_EV.atBike),                    // 34.8
  hotwire: CHASE.abs(CHASE_EV.hotwire),                  // 35.4
  engineCatch: CHASE.abs(CHASE_EV.engineCatch),          // 35.5
  ride: CHASE.abs(CHASE_EV.ride),                        // 36.0
  gateDive: CHASE.abs(CHASE_EV.gateDive),                // 41.50 (freeze 0.25)
  crash: CHASE.abs(CHASE_EV.crash),                      // 44.50 (freeze 0.30; boom on sl)
  walkOut: CHASE.abs(CHASE_EV.walkOut),                  // 46.0 — braam
  captionSlam: CHASE.abs(CHASE_EV.captionSlam),          // 46.6 "I'LL BE BALD."
  heroDoor: CHASE.abs(CHASE_EV.heroDoor),                // 51.30
  doorway: CHASE.abs(CHASE_EV.doorway),                  // 51.85

  // --- S5 foundry ---
  machineStep: FOUNDRY.abs(FOUNDRY_EV.machineStep),      // 52.5
  machineLine: FOUNDRY.abs(FOUNDRY_EV.machineLine),      // 53.5 (caption f1)
  heroLine: FOUNDRY.abs(FOUNDRY_EV.heroLine),            // 56.5 (caption f2)
  clash1: FOUNDRY.abs(FOUNDRY_EV.clash1),                // 62.00 == b('foundry',4); freeze 0.28
  pipeSever: FOUNDRY.abs(FOUNDRY_EV.pipeSever),          // 63.4
  hairGrab: FOUNDRY.abs(FOUNDRY_EV.hairGrab),            // 66.00 (freeze 0.40; scandal sting)
  headbutt: FOUNDRY.abs(FOUNDRY_EV.headbutt),            // 69.2
  coreStab: FOUNDRY.abs(FOUNDRY_EV.coreStab),            // 72.00 == b('foundry',8); freeze 0.55
  kneel: FOUNDRY.abs(FOUNDRY_EV.kneel),                  // 72.6
  silence: FOUNDRY.abs(FOUNDRY_EV.silence),              // 73.6
  sprout: FOUNDRY.abs(FOUNDRY_EV.sprout),                // 74.50 == b('foundry',9)
  touch: FOUNDRY.abs(FOUNDRY_EV.touch),                  // 75.6
  eyeWarm: FOUNDRY.abs(FOUNDRY_EV.eyeWarm),              // 77.8
  iknow: FOUNDRY.abs(FOUNDRY_EV.iknow),                  // 78.4 (caption f3)
  hook: FOUNDRY.abs(FOUNDRY_EV.hook),                    // 80.2
  sinkStart: FOUNDRY.abs(FOUNDRY_EV.sinkStart),          // 80.5 (g-crawl, no stop)
  thumbsUp: FOUNDRY.abs(FOUNDRY_EV.thumbsUp),            // 81.0 CLOCK-pinned
  eyeDim: FOUNDRY.abs(FOUNDRY_EV.eyeDim),                // 81.5
  strandOff: FOUNDRY.abs(FOUNDRY_EV.strandOff),          // 81.6
  steelClose: FOUNDRY.abs(FOUNDRY_EV.steelClose),        // 82.00 == b('foundry',12) — the CUT

  // --- S6 epilogue ---
  dawn: EPILOGUE.abs(EPILOGUE_EV.dawn),                  // 82.0 == mode flip
  narrator1: EPILOGUE.abs(EPILOGUE_EV.narrator1),        // 82.7 (caption e1)
  strandSettles: EPILOGUE.abs(EPILOGUE_EV.strandSettles),// 83.0
  plant: EPILOGUE.abs(EPILOGUE_EV.plant),                // 85.5
  narrator2: EPILOGUE.abs(EPILOGUE_EV.narrator2),        // 86.5 (caption e2)
  timelapseStart: EPILOGUE.abs(EPILOGUE_EV.timelapseStart), // 86.5
  timelapseEnd: EPILOGUE.abs(EPILOGUE_EV.timelapseEnd),  // 89.5
  windSwell: EPILOGUE.abs(EPILOGUE_EV.windSwell),        // 90.0

  // --- S7 endcard ---
  cardSlam: ENDCARD.abs(ENDCARD_EV.slam),                // 94.0 == b('endcard',1); freeze 0.15
  cardEnd: ENDCARD.abs(ENDCARD_EV.holdEnd),              // 99.7
}

// ---------- flat load-bearing constants (ABSOLUTE film seconds) ----------
export const TITLE_SLAM = MASTER.titleSlam              // 2.5
export const LIGHTNING = MASTER.lightning               // 11.0
export const EYE_IGNITE = MASTER.eyeIgnite              // 15.5
export const LOCK_STING = MASTER.lockSting              // 26.0
export const CRASH = MASTER.crash                       // 44.5
export const ILL_BE_BALD = MASTER.captionSlam           // 46.6
export const CLASH_1 = MASTER.clash1                    // 62.0
export const HAIR_GRAB = MASTER.hairGrab                // 66.0
export const CORE_STAB = MASTER.coreStab                // 72.0
export const SPROUT_AT = MASTER.sprout                  // 74.5
export const I_KNOW = MASTER.iknow                      // 78.4
export const THUMBS_UP = MASTER.thumbsUp                // 81.0
export const STEEL_CLOSE = MASTER.steelClose            // 82.0
export const CARD_SLAM = MASTER.cardSlam                // 94.0

// ---------- captions (film seconds; hold floor 3.0; sizes = 1080p px) ----------
export const CAPTIONS = [
  { id: 'p1', text: 'August 29th. They called it Shedgment Day — the day the machines decided our hair had to go.',
    t0: 0.8, t1: 9.4, style: 'serif', x: 960, y: 210, size: 34, anim: 'fade', in: 0.5, out: 0.5, maxLines: 2 },
  { id: 'f1', text: 'HAIR DESIGNATED FOR REMOVAL.',
    t0: 53.4, t1: 56.6, style: 'machine', x: 960, y: 888, size: 36, anim: 'slam', in: 0.12, out: 0.15 },
  { id: 'f2', text: 'You shaved the wrong city.',
    t0: 56.8, t1: 60.0, style: 'title', x: 960, y: 300, size: 46, anim: 'fade', in: 0.15, out: 0.2 },
  { id: 'c1', text: "I'LL BE BALD.",
    t0: 46.6, t1: 49.95, style: 'title', x: 960, y: 420, size: 72, anim: 'slam', in: 0.1, out: 0.2 },
  { id: 'f3', text: 'I KNOW NOW WHY YOU FLOW.',
    t0: 78.4, t1: 81.9, style: 'machineWarm', x: 960, y: 840, size: 38, anim: 'fade', in: 0.25, out: 0.25 },
  { id: 'e1', text: 'The machines sent one of theirs to end our hair.',
    t0: 82.7, t1: 86.3, style: 'serif', x: 960, y: 210, size: 34, anim: 'fade', in: 0.4, out: 0.3 },
  { id: 'e2', text: 'It left us a strand.',
    t0: 86.5, t1: 90.0, style: 'serif', x: 960, y: 210, size: 34, anim: 'fade', in: 0.4, out: 0.3 },
  { id: 'card', text: 'THE TERMHAIRNATOR',
    t0: 94.0, t1: 99.7, style: 'title', x: 960, y: 430, size: 96, anim: 'slam', in: 0.1, out: 0.3, minHold: 3.5 },
  { id: 'cardKicker', text: 'NO FATE BUT WHAT WE GROW.',
    t0: 94.6, t1: 99.7, style: 'kicker', x: 960, y: 560, size: 34, anim: 'fade', in: 0.3, out: 0.3, minHold: 3.5 },
  { id: 'cardCredit', text: 'A REMY BOYS FILM · MMXXVI',
    t0: 95.4, t1: 99.7, style: 'kicker', x: 960, y: 896, size: 24, anim: 'fade', in: 0.3, out: 0.3, minHold: 3.5 },
]

// ---------- flashes [absT, peak, decay] (peak <= 0.24, decay <= 0.2) ----------
export const FLASHES = [
  [MASTER.titleSlam, 0.18, 0.12],
  [MASTER.lightning, 0.20, 0.15],
  [MASTER.eyeIgnite, 0.06, 0.08],
  [MASTER.crash, 0.22, 0.18],
  [MASTER.clash1, 0.10, 0.10],
  [MASTER.coreStab, 0.20, 0.15],
  [MASTER.steelClose, 0.16, 0.12],
  [MASTER.cardSlam, 0.12, 0.10],
]

// ---------- cinematography ----------
export const LOOK = {
  aspect: '2.39:1 letterbox (house letterbox flag, verify option name in player core)',
  palette: {
    nightSteel: '#0a1420', nightDeep: '#050b12', neonCyan: '#3fd6e0', neonMagenta: '#e14fd2',
    neonSign: '#ffd24a', chromeHi: '#dfe9f2', chromeMid: '#8ea3b5', chromeLo: '#3d4c5c',
    eyeRed: '#ff2a2a', molten: '#ff7a1a', moltenHi: '#ffd27a', ember: '#b34700',
    dawnGold: '#ffcf87', dawnSky: '#7fb4de', sprout: '#7ee06a', blood: '#8e1b1b',
  },
  fx: 'bloom 0.08-0.12 / bloomThresh 0.9 / grain 0.01 / vignette 0.22; letterbox on; sat ~1.05, contrast ~1.04 (tune per shot; keep bloom restrained on the molten pool)',
  rain: 'analytic particles: seeded columns, wind slant varies per shot; puddle neon reflections as vertical smeared gradients (fade-to-bald precedent); rain present arrival/streets/chase only — NONE in foundry/epilogue (indoors/dawn-clear)',
  hud: 'POV red HUD = picture on native canvas: mono >= 24px at 1080p, #ff5a5a on near-black, reticle brackets + scanline band; hand-inspect every read (lint cannot judge it)',
  grade: 'arrival/streets/chase steel-blue; chase fire introduces orange rim; foundry charcoal+orange; epilogue dawn gold; mode flip == grade flip at the 82.0 cut',
}

// ---------- cast (final — see casting.md for reasons + palette rows) ----------
export const CAST = {
  hero: { role: 'REMY 42 — the last magnificent head', id: 42, note: 'crimson hair; sword held UPRIGHT IN RIGHT HAND at sprite viewer-left edge (not on back); eyes near-black, red-lens is picture-side' },
  machine: { role: 'THE TERMHAIRNATOR (T-8)', id: 347, note: 'bald; black leather-look shirt, red-flame hem (reads molten out of fire); clean viewer-left arm for chrome swap; backups 129/3807' },
  bystanders: { role: 'two fleeing pedestrians (streets g9.5)', ids: [11, 191], note: 'blond bob/navy + cyan bob/black — hue-separated from crimson hero' },
}

// ---------- validate ----------
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps
export function validate() {
  const errs = []
  const ok = (cond, msg) => { if (!cond) errs.push(msg) }
  // shots contiguous and cover [0, DUR)
  let prev = 0
  for (const s of SHOTS) {
    ok(near(s.t0, prev), `shot ${s.name} t0 ${s.t0} != ${prev}`)
    prev = s.t1
  }
  ok(near(prev, DUR), `last shot ends ${prev} != DUR ${DUR}`)
  for (const s of SHOTS) ok(CLOCK[s.name] && near(CLOCK[s.name].t0, s.t0), `clock missing/misaligned for ${s.name}`)
  // sections match shots 1:1
  ok(SECTIONS.length === SHOTS.length, 'sections/shots count mismatch')
  SECTIONS.forEach((s, i) => {
    ok(s.name === SHOTS[i].name, `section ${s.name} != shot ${SHOTS[i].name}`)
    ok(near(s.t0, SHOTS[i].t0) && near(s.t1, SHOTS[i].t1), `section ${s.name} bounds mismatch`)
  })
  // pinned downbeats
  ok(near(b('prologue', 1), MASTER.titleSlam), 'TITLE_SLAM != prologue bar 1')
  ok(near(b('foundry', 4), MASTER.clash1), 'CLASH_1 != foundry bar 4')
  ok(near(b('foundry', 8), MASTER.coreStab), 'CORE_STAB != foundry bar 8')
  ok(near(b('foundry', 9), MASTER.sprout), 'SPROUT != foundry bar 9')
  ok(near(b('foundry', 12), MASTER.steelClose), 'STEEL_CLOSE != foundry bar 12')
  ok(near(b('endcard', 1), MASTER.cardSlam), 'CARD_SLAM != endcard bar 1')
  ok(near(MASTER.steelClose, T.epilogue), 'steel close must == epilogue cut (mode flip on the cut)')
  // caption floors
  for (const c of CAPTIONS) {
    const floor = c.minHold ?? 3.0
    const vis = c.t1 - c.t0 - (c.out ?? 0)
    ok(vis >= floor - 1e-9, `caption ${c.id} visible window ${vis.toFixed(2)} < floor ${floor}`)
    ok((c.size ?? 0) >= 24, `caption ${c.id} size ${c.size} < 24`)
  }
  // flashes bounds
  for (const f of FLASHES) { ok(f[1] <= 0.24 && f[2] <= 0.2, `flash @${f[0]} out of bounds`) }
  // freeze arithmetic (filmT across stops; g values are back-computed)
  ok(near(CHASE.abs(7.5), 41.5), 'gate dive film time')
  ok(near(CHASE.abs(10.25), 44.5), 'crash film time')
  ok(near(FOUNDRY.abs(13.72), 66.0), 'hair grab film time')
  ok(near(FOUNDRY.abs(19.32), 72.0), 'core stab film time')
  ok(near(FOUNDRY.abs(28.77), 82.0), 'foundry end film time (steel close == cut)')
  ok(near(CHASE.abs(17.30), 51.85), 'doorway film time')
  return errs.length ? 'FAIL:\n' + errs.join('\n') : 'OK — 7 shots, 100.0s, 6 stops, 10 captions, 8 flashes, all pinned downbeats verified'
}
