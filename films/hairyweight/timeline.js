// THE HAIRYWEIGHT CHAMPIONSHIP — a Remy Boys pay-per-view. 87 s, 1920x1080 full-frame broadcast.
// This file is the single timing truth imported by film.js (picture + captions + HUD) AND score.js.
//
// -------------------------------------------------------------------------------------------------
// DOMAINS (read this before consuming any number below)
// -------------------------------------------------------------------------------------------------
// g  = the ABSOLUTE WORLD TIMELINE. One clock for the whole film, shared by every event:
//      PUNCHES, KNOCKDOWNS, KO and STOPS are all in g. It is NOT shot-local (unlike
//      fade-to-bald's per-shot clocks) and it is NOT the rendered seconds: hit-stops freeze g.
// rt = REAL rendered seconds (what filmkit measures, where cuts/captions/HUD graphics live).
//      warp(rt) maps rt -> g (drawing clock); filmT(g) maps g -> rt (SFX scheduling clock).
//      Convention follows the SKILL.md warp() pattern: an impact lands at the START of its freeze.
// BELLS, CAPTIONS, HUD windows, REPLAY, ROUND bands are broadcast graphics/SFX: they are in REAL
// seconds (rt). Event-derived real times are precomputed below (filmT), never guessed.
// GRID: BPM 80, beat 0.75 s, bar 3.00 s, D = 87 = 29 bars exactly. Every shot cut, every bell,
// every punch and every ref count lands on a beat (multiple of 0.75). film.js should declare
// grid: { bar: 3 } and lint: { captionHold: 3, safe: { margin: 0.05, letterbox: false } }.
//
// HUD ZONES (1920x1080) — captions must respect these:
//   top-left     score bug (names + round + tallies)   x 60..620,   y 28..120   (on at first bell)
//   top-right    RPPV network bug y 24..70, punch-stat panel below it x 1280..1860 y 84..176
//   bottom-left  commentary lower-thirds: x >= 60, single line y in the 940..990 band
//   bottom-right NOTHING. Ever. (Broadcast superstition.)
//
// CAPTION HOLD ARITHMETIC (hold = t1 - t0 - in - out; lint minimum 3 s, all windows inside one shot)
//   id        shot      t0     t1     in   out   hold
//   ppvOpen   coldExt   1.2    5.8    .3   .3    5.8-1.2-0.6 = 4.0  OK
//   vsTitle   vsIn      9.4   14.6    .3   .3   14.6-9.4-0.6 = 4.6  OK
//   r1Sharp   r1Open   28.2   32.6    .3   .3   32.6-28.2-0.6 = 3.8  OK
//   r1Dom     r1Dom    34.0   38.2    .3   .3   38.2-34.0-0.6 = 3.6  OK
//   kdown     kdown    39.3   43.0    .3   .3   43.0-39.3-0.6 = 3.1  OK (ends as hero rises)
//   corner1   corner   45.6   50.2    .3   .3   50.2-45.6-0.6 = 4.0  OK
//   round3    r3Open   51.05  54.8    .25  .25  54.8-51.05-0.5 = 3.25 OK
//   skip2     r3Open   53.0   56.8    .3   .3   56.8-53.0-0.6 = 3.2  OK (chy y966 vs card y300: clear)
//   replayChy replay   60.5   65.3    .3   .3   65.3-60.5-0.6 = 4.2  OK
//   koChy     ko       72.1   77.4    .3   .3   77.4-72.1-0.6 = 4.7  OK
//   andNew    belt     82.0   86.6    .35  .4   86.6-82.0-0.75 = 3.85 OK
//   andNewSub belt     82.0   86.6    .35  .4   86.6-82.0-0.75 = 3.85 OK (per-line y 430 / 560)
//   kick      belt     82.9   86.6    .3   .3   86.6-82.9-0.6 = 3.1  OK (bottom-center; bug/stats are OFF)
// Reading text >= 28 px everywhere (chy 34, kick 30, sub 64, card 110, title 150).
// -------------------------------------------------------------------------------------------------

// ---- 1. clock grid -----------------------------------------------------------------------------
export const BPM = 80;
export const BEAT = 60 / BPM; // 0.75 s — everything punchy lands on this
export const BAR = 4 * BEAT;  // 3.00 s — every cut sits on this (filmkit grid bar)
export const D = 87;          // refined from the 88 s brief to close exactly 29 bars of 3 s

// ---- cast (verified in CASTING.md; ids are quest ids, palettes are art.json rows) --------------
export const CAST = {
  HERO: 14,   // CRIMSON CROWN — pink/coral flow, trail tint #de9b9c
  CHAMP: 1217,// PEARL SOUL — bald, white gi + black belt, aura #dad6d3
  REF: 46,    // Silver Flow — white official shirt
  CORNER1: 202, // Cobalt Flow — blue jersey cutman
  CORNER2: 208, // Cobalt Crown — cream tee; also drafted as round-card holder (see ROUND_GIRL)
};
export const NAMES = {
  hero: 'CRIMSON CROWN', champ: 'PEARL SOUL', ref: 'SILVER FLOW',
  c1: 'COBALT FLOW', c2: 'COBALT CROWN',
};
export const TINT = {
  heroTrail: '#de9b9c', champAura: '#dad6d3', refAcccent: '#f9f0f1',
  c1: '#014c90', c2: '#7aaed5',
};
// VS-card crops for the 600x600 originals (from CASTING.md framing notes; builder clamps)
export const CARD_CROPS = {
  hero:  { src: '../../media/remy/Character14.webp',  cx: 280, cy: 310, size: 420 },
  champ: { src: '../../media/remy/Character1217.webp', cx: 300, cy: 300, size: 420 },
};

// Tale of the tape — played absolutely straight.
export const TAPE = {
  hero:  { record: '42-0-1',  recordNote: 'one draw: fell asleep', reach: 'ONE COMB',
           stance: 'SOUTHCLAW', home: 'THE FLOW' },
  champ: { record: '892-2',   recordNote: 'both losses: barber',   reach: 'RAZOR-LENGTH',
           stance: 'ORTHODOX', home: 'THE CABALD MOON BASE' },
};

// ---- 2. SHOTS — contiguous [0, D), every cut on the 3 s bar ------------------------------------
export const SHOTS = [
  { name: 'coldExt',   t0: 0,  t1: 6,
    // Night exterior of The Flow Dome. Slow push-in on the marquee: THE HAIRYWEIGHT CHAMPIONSHIP,
    // chase lights blinking on the bar grid; steam, taxi rolls through frame at ~3.0.
    // RPPV bug fades on top-right at rt 1.5. Camera: dolly-in, 0 -> 6, ease-out.
  },
  { name: 'coldInt',   t0: 6,  t1: 9,
    // Hard cut inside: packed house, ring glow centre, hard handheld sway; crowd roar peaks.
    // A spotlight sweep crosses the lens at 7.5. RPPV bug stays. Camera: handheld drift right.
  },
  { name: 'vsIn',      t0: 9,  t1: 15,
    // TALE OF THE TAPE. Two framed originals slide in from left/right on red Chyron rails (9.0-11.0),
    // then stat lines count up on beats (record/reach/stance/home, TAPE data) 11.0-14.6.
    // Camera: locked graphic frame; cards get a 1.03 scale settle.
  },
  { name: 'vsStare',   t0: 15, t1: 18,
    // Staredown punch-in: cards squeeze to circles, faces close, slow zoom 1.0 -> 1.12,
    // bone-white aura vs pink trail flicker. Deadpan. No caption; the drone score does it.
  },
  { name: 'walkHero',  t0: 18, t1: 21,
    // Hero's walk: enters stage LEFT, walks RIGHT with cornermen 202 (front) and 208 (rear),
    // single overhead spotlight cone, pink trail particles on the beat. Crowd phone flashes.
    // Camera: low tracking shot, parallax crowd foreground.
  },
  { name: 'walkChamp', t0: 21, t1: 24,
    // Champ's walk: mirrored from stage RIGHT walking LEFT, colder light, bone-white aura,
    // crowd notably quieter (gag). Camera: slower, lower, wider — menace through staging.
  },
  { name: 'refTalk',   t0: 24, t1: 27,
    // Centre ring: ref 46 between both fighters, touching gloves, deadpan instructions;
    // champ does not blink (he cannot). Camera: slow push to mid-shot, both profiles.
  },
  { name: 'r1Open',    t0: 27, t1: 33,
    // BELL (rt 27.0). Champ comes out sharp: jab-jab-hook, hero covers up. Rope-a-dope staging,
    // champ centred, hero backpedalling left. Camera: ringside float, slight whip on each jab.
  },
  { name: 'r1Dom',     t0: 33, t1: 39,
    // Champ dominance: body shot doubles him, jab snaps the head back; hero wobbles (lean 0.12 sine).
    // KNOCKDOWN PUNCH at g 36.75 (freeze 0.20): champ hook, hero dips, legs go. He falls through
    // the cut — wide ringside follow. Camera: slow push during the beating.
  },
  { name: 'kdown',     t0: 39, t1: 45,
    // Overhead-ish wide: hero on the canvas, ref 46 counts (HUD numbers 1-6, rt 38.25..42.0),
    // hero rolls, grabs the ropes, is UP at world 42.75 (rt 43.21) — barely. Bell (rt 45.0) saves him.
    // Camera: static wide for the count, then quick low push as he rises.
  },
  { name: 'corner',    t0: 45, t1: 51,
    // Hero's corner: 202 works the cutman sponge, 208 yells strategy (the ONE COMB REACH line),
    // heartbeat pulse in the vignette. Behind them the champ's shadow crosses the canvas twice.
    // Camera: tight on the stool, rack-focus to the shadow at 49.0.
  },
  { name: 'r3Open',    t0: 51, t1: 57,
    // BELL (rt 51.0). 208 holds the ROUND 3 placard on his way out (he is also the card guy).
    // Hero springs out, first jabs land (g 52.5, 53.25), crowd wakes. Camera: hero-centred float.
  },
  { name: 'r3Combo',   t0: 57, t1: 60,
    // THE COMBO: body-upper-hook, two mini freezes (g 57.0, 59.25). Champ wobble-staggers.
    // The 59.25 freeze ends at rt 59.99 — the impact IS the cut into replay.
    // Camera: handheld, punch-in on each contact.
  },
  { name: 'replay',    t0: 60, t1: 66,
    // INSTANT REPLAY: sketch-filter (posterised edges, paper white), slow-mo at ~0.45x replaying
    // world [56.5, 59.4], tape-rewind glitch 60-61.5, flashing REPLAY watermark top-centre.
    // Commentator caption wonders how that landed. Camera: broadcast quad-split for 0.8 s at entry.
  },
  { name: 'r3Live',    t0: 66, t1: 69,
    // Back live: snap out of sketch to full colour, champ legs gone (stagger loop), hero shadowboxes
    // to the crowd. Camera: orbital half-arc, one full sweep.
  },
  { name: 'ko',        t0: 69, t1: 78,
    // THE END: champ loads the haymaker (g 69.75, misses), hero DUCKS under (70.5), plants and lands
    // the counter uppercut at g 71.25 — BIG freeze 0.55 s (rt 71.99-72.54), flash + shake.
    // Champ falls (world 71.8 -> 72.4), ref counts 1-2-3 (rt 74.25/75.0/75.75), waves it off rt 77.25.
    // Camera: whip-pan on the swing, locked low-angle for the uppercut, top-down for the count.
  },
  { name: 'belt',      t0: 78, t1: 87,
    // Aftermath: ref raises hero's paw then buckles on the belt (rt 79.5); 202+208 hoist him (81.0);
    // FREEZE-FRAME at rt 82.5 (grain up, vignette in, everything holds). AND NEEEEEW card over it,
    // end kicker underneath. Camera: slow hero-crane up to freeze; after 82.5 nothing moves but type.
    // Intentional end: last 0.4 s dips to black.
  },
];

// ---- 3. EVENTS (all t in WORLD g; real times via filmT below) ----------------------------------
// Every t is a beat multiple (t / 0.75 is an integer) — checkable with the grid test.
export const PUNCHES = [
  // Round 1 — champ dominance (hero throws one desperate miss).
  { t: 28.5,  who: 'champ', kind: 'jab',   landed: true },
  { t: 30.0,  who: 'champ', kind: 'jab',   landed: true },
  { t: 31.5,  who: 'champ', kind: 'hook',  landed: true },  // STOP 0.14
  { t: 33.75, who: 'champ', kind: 'jab',   landed: true },
  { t: 34.5,  who: 'hero',  kind: 'jab',   landed: false }, // cornered, sails over the crouch
  { t: 35.25, who: 'champ', kind: 'hook',  landed: true },
  { t: 36.0,  who: 'champ', kind: 'body',  landed: true },  // STOP 0.12 — the doubling body shot
  { t: 36.75, who: 'champ', kind: 'hook',  landed: true },  // KNOCKDOWN punch — STOP 0.20
  { t: 37.5,  who: 'champ', kind: 'jab',   landed: true },  // flex while hero is already going
  // Round 3 — the comeback.
  { t: 52.5,  who: 'hero',  kind: 'jab',   landed: true },
  { t: 53.25, who: 'hero',  kind: 'jab',   landed: true },
  { t: 54.0,  who: 'hero',  kind: 'hook',  landed: true },
  { t: 54.75, who: 'champ', kind: 'body',  landed: true },  // champ's last good moment
  { t: 55.5,  who: 'hero',  kind: 'body',  landed: true },
  { t: 56.25, who: 'hero',  kind: 'hook',  landed: true },
  { t: 57.0,  who: 'hero',  kind: 'upper', landed: true },  // STOP 0.16 — the replay star
  { t: 57.75, who: 'champ', kind: 'hook',  landed: false }, // champ swings at a memory
  { t: 58.5,  who: 'hero',  kind: 'jab',   landed: true },
  { t: 59.25, who: 'hero',  kind: 'hook',  landed: true },  // STOP 0.12 — freeze ends ON the cut
  // The end.
  { t: 69.75, who: 'champ', kind: 'hook',  landed: false }, // the wild haymaker
  { t: 71.25, who: 'hero',  kind: 'upper', landed: true },  // THE KO — STOP 0.55
];

export const KNOCKDOWNS = [
  // t/upAt in world g; count numbers are a REAL-time broadcast graphic (see HUD.counts).
  { t: 36.75, who: 'hero',  upAt: 42.75 }, // six-count; up 0.75 beats before the rt-45 bell
  { t: 71.25, who: 'champ', upAt: null },  // he is not getting up. waveReal below.
];

export const BELLS = [27, 45, 51]; // REAL seconds: R1 open, R1 close, R3 open (round 2 skipped, sorry)

export const KO = {
  t: 71.25,            // world g of the counter uppercut (freeze starts here)
  swing: 69.75,        // champ haymaker (miss)
  duck: 70.5,          // hero slides under it
  fall: [71.8, 72.4],  // champ's canvas arc, world g (starts when the freeze releases)
  waveReal: 77.25,     // ref waves it off — real seconds, on the beat, 0.75 before the cut
};

// ---- hit-stop warp table ------------------------------------------------------------------------
// Convention: STOPS are in the ABSOLUTE WORLD TIMELINE g (same domain as PUNCHES/KO) — one global
// clock, NOT shot-local. An impact lands at the START of its freeze. warp(rt) maps real -> g for
// drawing; filmT(g) maps g -> real for SFX. Score.js imports these exact helpers; no hand delays.
// Every stop sits entirely inside one shot (checked); none straddles a cut.
export const STOPS = [
  { g: 31.5,  d: 0.14 }, // champ hook, R1 — head-snap
  { g: 36.0,  d: 0.12 }, // champ body, R1 — the doubling shot
  { g: 36.75, d: 0.2 },  // KNOCKDOWN punch — the legs go (max "small" stop)
  { g: 57.0,  d: 0.16 }, // hero upper, comeback combo
  { g: 59.25, d: 0.12 }, // hero hook — freeze ends rt 59.99, the cut finishes the sentence
  { g: 71.25, d: 0.55 }, // THE KO uppercut — the BIG one, 0.55 s of silence
];

export function warp(rt) {
  let acc = 0;
  for (const s of STOPS) {
    const rs = s.g + acc;                    // real time this stop starts
    if (rt < rs) return { g: rt - acc, stop: null, sl: 0 };
    if (rt < rs + s.d) return { g: s.g, stop: s, sl: rt - rs };
    acc += s.d;
  }
  return { g: rt - acc, stop: null, sl: 0 };
}
export function filmT(g) {
  let acc = 0;
  for (const s of STOPS) if (s.g < g) acc += s.d;
  return g + acc;
}
// Real-time mirror of STOPS for composer/builder tables (never guess these).
export const STOPS_REAL = STOPS.map((s) => ({ g: s.g, d: s.d, real: filmT(s.g) }));

// ---- 4. CAPTIONS (broadcast Chyron look; ready for film.js `captions` + `captionStyles`) --------
// All commentary <= 6 words; single-line y inside the 940..990 band; x >= 60; clear of the HUD
// zones above. Full hold >= 3 s — arithmetic table in the header comment. lineHeight is a
// MULTIPLIER, never pixels.
export const CAPTION_STYLES = {
  chy: { // commentary lower-third; film.js draws the red Chyron bar behind it, x 52..(60+width+24)
    font: 'Anton', weight: '', size: 34, color: '#f4f1ea', align: 'left', x: 60, y: 966,
    lineHeight: 1.05, track: 1, anim: 'rise', rise: 14, in: 0.3, out: 0.3,
    glow: '#000000', glowBlur: 10,
  },
  roundCard: { // centre-ring ROUND placard (also mirrored on 208's physical placard in art)
    font: 'Anton', weight: '', size: 110, color: '#ffffff', align: 'center', x: 960, y: 300,
    lineHeight: 1.0, track: 6, anim: 'line', in: 0.25, out: 0.25,
    glow: '#000000', glowBlur: 16,
  },
  ppvTitle: { // the freeze-frame call, line 1
    font: 'Anton', weight: '', size: 150, color: '#ffffff', align: 'center', x: 960, y: 430,
    lineHeight: 1.0, track: 4, anim: 'rise', rise: 26, in: 0.35, out: 0.4,
    glow: '#000000', glowBlur: 22,
  },
  ppvSub: { // the freeze-frame call, line 2 — per-line y (430 / 560), never a \n block
    font: 'Anton', weight: '', size: 64, color: '#f2c4c4', align: 'center', x: 960, y: 560,
    lineHeight: 1.0, track: 8, anim: 'rise', rise: 20, in: 0.35, out: 0.4,
    glow: '#000000', glowBlur: 14,
  },
  ppvKick: { // end kicker, bottom-centre (bug/stats are off by then; not in the chyron corner)
    font: '"Space Grotesk"', weight: 700, size: 30, color: '#d8d4cb', align: 'center', x: 960,
    y: 962, lineHeight: 1.0, track: 6, anim: 'fade', in: 0.3, out: 0.3,
    glow: '#000000', glowBlur: 8,
  },
};

export const CAPTIONS = [
  { id: 'ppvOpen',  style: 'chy', text: 'LIVE FROM THE FLOW DOME',           t0: 1.2,  t1: 5.8 },
  { id: 'vsTitle',  style: 'chy', text: 'TALE OF THE TAPE',                  t0: 9.4,  t1: 14.6 },
  { id: 'r1Sharp',  style: 'chy', text: 'CHAMP COMES OUT SHARP',             t0: 28.2, t1: 32.6 },
  { id: 'r1Dom',    style: 'chy', text: 'SOUTHCLAW PRESSURE IS REAL',        t0: 34.0, t1: 38.2 },
  { id: 'kdown',    style: 'chy', text: 'CRIMSON CROWN IS DOWN',             t0: 39.3, t1: 43.0 },
  { id: 'corner1',  style: 'chy', text: 'ONE COMB REACH. USE IT.',           t0: 45.6, t1: 50.2 },
  { id: 'round3',   style: 'roundCard', text: 'ROUND 3',
    t0: 51.05, t1: 54.8, in: 0.25, out: 0.25 },
  { id: 'skip2',    style: 'chy', text: 'WE SKIPPED ROUND 2. SORRY.',        t0: 53.0, t1: 56.8 },
  { id: 'replayChy',style: 'chy', text: 'HOW DID THAT LAND?',                t0: 60.5, t1: 65.3 },
  { id: 'koChy',    style: 'chy', text: 'COUNTER UPPER. GOODNIGHT.',         t0: 72.1, t1: 77.4 },
  { id: 'andNew',   style: 'ppvTitle', text: 'AND NEEEEEW...',               t0: 82.0, t1: 86.6 },
  { id: 'andNewSub',style: 'ppvSub',  text: 'HAIRYWEIGHT CHAMPION OF THE WOOOORLD', t0: 82.0, t1: 86.6 },
  { id: 'kick',     style: 'ppvKick', text: 'A REMY BOYS PAY-PER-VIEW',          t0: 82.9, t1: 86.6 },
];

// ---- 5. HUD -------------------------------------------------------------------------------------
export const HUD = {
  // Score bug (top-left): on at the first bell, off when the gloves come off.
  bug: { t0: BELLS[0], t1: 78 },
  // RPPV network bug (top-right corner): on from the cold open, stays for the whole broadcast.
  netBug: { t0: 1.5, t1: D, text: 'RPPV' },
  // Punch-stat panel (top-right, under netBug). Tallies tick ONLY on landed punches, at the
  // punch's REAL time — derived from PUNCHES, never separate numbers.
  // Final tallies: hero 9 of 10, champ 9 of 11 (deadpan: it's a draw on paper).
  punchStats: { x0: 1280, x1: 1860, y0: 84, y1: 176, ticks: PUNCHES.filter((p) => p.landed)
    .map((p) => ({ real: filmT(p.t), who: p.who, kind: p.kind })) },
  // Ref count numbers: REAL-time centre-ring graphics, one per beat, drawn across cuts.
  counts: [
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ n: i + 1, real: 38.25 + i * BEAT })),   // hero count 1-6
    ...[0, 1, 2].map((i) => ({ n: i + 1, real: 74.25 + i * BEAT })),            // champ count 1-3
  ],
  waveReal: KO.waveReal,                       // ref waves it off
  // Round bands (real): the broadcast claims round 3 happened.
  roundBands: [
    { t0: 27, t1: 45, label: 'ROUND 1' },
    { t0: 45, t1: 51, label: 'BREAK' },
    { t0: 51, t1: KO.waveReal, label: 'ROUND 3' },
    { t0: KO.waveReal, t1: D, label: 'FINAL' },
  ],
  // Round clock derivation rule: it is ALWAYS 3:00. The Cabald Athletic Commission's clock is
  // stuck (deadpan gag). A "real" rule would be 180 - (t - band.t0) clamped to 0 inside the
  // active band — deliberately not used; do not "fix" the clock.
  roundClock: (t) => '3:00',
  // INSTANT REPLAY window (real) replaying the comeback combo (world g), sketch + slow-mo.
  replay: { t0: 60, t1: 66, srcG: [56.5, 59.4], rate: 0.45, watermark: 'REPLAY',
            watermarkPos: { x: 960, y: 110, align: 'center' } }, // top-centre: stats own top-right
  // Round-card beat: no card girl — cornerman 208 does double duty on his way out (gag).
  roundGirl: { t0: 51, t1: 54.6, who: CAST.CORNER2, placard: 'ROUND 3' },
};

// ---- 6. SCORE_MAP (all windows REAL seconds; sections sit on the bar grid where they can) --------
// kit schedule note: punch/bell/count SFX must use filmT()/the *_REAL tables below, never offsets.
export const SCORE_MAP = [
  { name: 'crowdBed',       t0: 0,  t1: D,
    intent: 'arena ambience under everything; follows CROWD swells; hush during both counts',
    inst: 'filtered noise wash, distant PA hum, stereo roars' },
  { name: 'openFanfare',    t0: 0,  t1: 9,
    intent: 'broadcast open; marquee sparkle; sub-boom when we crash inside at 6',
    inst: 'brass fanfare, glockenspiel twinkle, timpani boom at 6' },
  { name: 'vsHorns',        t0: 9,  t1: 18,
    intent: 'tale-of-the-tape pomp; horn stabs on card slides 9/10.5; count-up ticks 11-14.6; drone 15-18',
    inst: 'tutti horn stabs, ticking woodblock count, low sust drone for the stare' },
  { name: 'heroWalk',       t0: 18, t1: 21,
    intent: 'hero walk anthem — cocky, bright, crowd claps on beats',
    inst: 'pluck ostinato, claps, pink-glow chime accents' },
  { name: 'champMenace',    t0: 21, t1: 27,
    intent: 'champ walk + ref instructions: the air leaves the room',
    inst: 'staccato low strings, sub drops, deadened crowd' },
  { name: 'roundPerc',      t0: 27, t1: 37,
    intent: 'round 1 percussion at 80 BPM; accent every champ landed punch (filmT table)',
    inst: 'taiko + snare shell, rimshot jabs, rising strings to the knockdown' },
  { name: 'hush',           t0: 37, t1: 45,
    intent: 'knockdown sting at 37.01 then near-silence; ref count clicks on HUD.counts; crowd roar on the rise (43.21)',
    inst: 'orchestral sting, single low pulse, count click track' },
  { name: 'cornerHeart',    t0: 45, t1: 51,
    intent: 'heartbeat ~54 BPM (two thumps per bar), cutman foley; menace returns at 48.5 under the shadow',
    inst: 'kick heartbeat, sponge/cloth foley, low drone' },
  { name: 'comebackBuild',  t0: 51, t1: 60,
    intent: 'rising ostinato; hero punch pops at each landed g; riser 58.5-60 into the replay cut',
    inst: 'ostinato pluck + bass, clap groove, tension riser' },
  { name: 'replayRewind',   t0: 60, t1: 66,
    intent: 'tape-rewind FX 60-61.5, then the combo score low-passed/muffled under the sketch look',
    inst: 'reel rewind whir, LP-filtered ostinato, shimmer' },
  { name: 'liveRise',       t0: 66, t1: 69,
    intent: 'snap back to full band, one more level up; crowd can smell it',
    inst: 'full groove, brass swells on the half-bar' },
  { name: 'koImpact',       t0: 69, t1: 78,
    intent: 'biggest impact at 71.99, total hit-stop silence to 72.54, then crowd eruption; count clicks 74.25-75.75; ref wave 77.25',
    inst: 'full-kit impact + reverse cymbal, eruption wall, clicks' },
  { name: 'triumphFanfare', t0: 78, t1: D,
    intent: 'victory fanfare under the belt (79.5) and the lift (81); freeze hit + twinkle at 82.5; intentional end, 0.4 s tail to silence',
    inst: 'brass triumph fanfare, choir pad, glock freeze-stab, tape-stop end' },
];

// Crowd swells cued AT EVENT TIMES (real seconds, derived from the event tables):
export const CROWD = [
  { real: 0,     level: 0.5,  type: 'roar'  },                       // broadcast open
  { real: 6,     level: 0.75, type: 'roar'  },                       // interior crash
  ...BELLS.map((t) => ({ real: t, level: 0.6, type: 'pop' })),          // bell pops
  { real: filmT(36.75), level: 0.9, type: 'ooh' },                      // knockdown gasp
  { real: filmT(42.75), level: 0.85, type: 'roar' },                    // hero beats the count
  ...PUNCHES.filter((p) => p.landed && p.who === 'hero' && p.t >= 52)
    .map((p) => ({ real: filmT(p.t), level: p.kind === 'upper' ? 0.8 : 0.55, type: 'pop' })),
  { real: filmT(71.25), level: 1.0, type: 'erupt' },                    // THE KO (post-freeze)
  { real: KO.waveReal, level: 0.9, type: 'roar' },                      // it's over, official
  { real: 79.5,  level: 0.7, type: 'pop'  },                            // belt buckled
  { real: 82.5,  level: 0.8, type: 'roar' },                            // freeze-frame pop
].sort((a, b) => a.real - b.real);

// Camera shake / flash accents, real time — same events the score hits (peaks <= 0.3, decay <= 0.2).
export const SHAKES = [
  { real: filmT(36.75), amp: 6,   decay: 7 }, // knockdown punch
  { real: filmT(57.0),  amp: 4,   decay: 6 }, // comeback upper
  { real: filmT(71.25), amp: 9,   decay: 8 }, // THE KO
  { real: 82.5,         amp: 2,   decay: 4 }, // freeze-frame thud
];
export const FLASHES = [
  { real: filmT(36.75), peak: 0.26, decay: 0.16 },
  { real: filmT(71.25), peak: 0.34, decay: 0.2 },
  { real: 82.5,         peak: 0.18, decay: 0.3 }, // freeze white-pop, quick settle
];
