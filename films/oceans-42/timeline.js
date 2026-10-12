// OCEAN'S FORTY-TWO — a Remy Boys heist. Timing truth for picture, HUD and score.
// 76 s at 120 BPM: every shot boundary sits on a bar line (bar = 2 s, beat = 0.5 s).
// Smooth 1080p media shots (strip, dossier, plan, title); pixel world shots
// (floor, vent, vault, alarm, dawn) paint a 960×540 stage, upscaled 2× nearest.

export const BPM = 120;
export const B = 60 / BPM;        // 0.5 s beat
export const BAR = B * 4;         // 2.0 s bar
export const DURATION = 76;
export const LW = 960;            // native pixel-stage size
export const LH = 540;

// ---- cast (verified against contact sheets + quest-bald.json) ----
export const CAST = {
  LEADER: 42,    // red hair, katana — "the Blade"
  GHOST: 32,     // silver hair, tinted glasses, blue saber — "the Ghost" (laser work)
  WHEEL: 66,     // grey keffiyeh + scarf — "the Wheel"
  FACE: 26,      // cobalt crown, yellow jersey — "the Face" (inside man)
  SPARK: 9,      // red flow, grey poncho, red saber — "the Spark" (distraction)
  HOUSE: 452,    // tuxedo Cabald — "The House", casino owner
  SHADES: 468,   // black shades Cabald — head of security
  PITBOSS: 744,  // golden-arches shades — pit boss
  GUARD_A: 585,  // clean grunt
  GUARD_B: 458,  // clean grunt
};
export const CREW = [
  { id: CAST.LEADER, name: 'THE BLADE', epithet: 'CRIMSON FLOW', hex: '#c85a5a', role: 'leader · katana · ex-house dealer' },
  { id: CAST.GHOST, name: 'THE GHOST', epithet: 'SILVER FLOW', hex: '#b9c4cc', role: 'locks · optics · 400+ heists' },
  { id: CAST.WHEEL, name: 'THE WHEEL', epithet: 'PEARL CROWN', hex: '#cbbfa8', role: 'getaway · 0 tickets · 0 limits' },
  { id: CAST.FACE, name: 'THE FACE', epithet: 'COBALT CROWN', hex: '#4f7bd9', role: 'inside man · high roller' },
  { id: CAST.SPARK, name: 'THE SPARK', epithet: 'CRIMSON FLOW', hex: '#e08a4f', role: 'distraction · jackpot magnet' },
];

// ---- shot table (t0 on bar lines) ----
export const T = {
  strip: 0,    // cold open — neon Remypolis, THE BALD PALACE
  dossier: 10, // the crew — five ID cards slam in
  plan: 18,    // the plan — blueprint, arrows, T-minus
  floor: 26,   // infiltration — casino floor, jackpot distraction
  vent: 36,    // the ducts — tray slide, drop
  vault: 42,   // the vault — laser cut, door fall, GOLDEN MULLET
  alarm: 56,   // alarm — red flood, sprint, getaway launch
  dawn: 66,    // dawn boulevard — mullet flag on the antenna
  title: 72,   // neon title card
  end: DURATION,
};
export const SHOTS = [
  { name: 'strip', t0: T.strip, t1: T.dossier },
  { name: 'dossier', t0: T.dossier, t1: T.plan },
  { name: 'plan', t0: T.plan, t1: T.floor },
  { name: 'floor', t0: T.floor, t1: T.vent },
  { name: 'vent', t0: T.vent, t1: T.vault },
  { name: 'vault', t0: T.vault, t1: T.alarm },
  { name: 'alarm', t0: T.alarm, t1: T.dawn },
  { name: 'dawn', t0: T.dawn, t1: T.title },
  { name: 'title', t0: T.title, t1: T.end },
];

// ---- hit-stop clocks (world time freezes; shake/flash stay on real time) ----
export function makeClock(t0, stops) {
  return {
    t0,
    warp(lt) {
      let acc = 0;
      for (const s of stops) {
        const rs = s.g + acc;
        if (lt < rs) return { g: lt - acc, stop: null, sl: 0 };
        if (lt < rs + s.d) return { g: s.g, stop: s, sl: lt - rs };
        acc += s.d;
      }
      return { g: lt - acc, stop: null, sl: 0 };
    },
    filmT(g) {
      let acc = 0;
      for (const s of stops) if (s.g < g) acc += s.d;
      return t0 + g + acc;
    },
  };
}
// vault shot: door-breach freeze. alarm shot: gate-burst micro-freeze.
export const VAULT_CLOCK = makeClock(T.vault, [{ g: 6.0, d: 0.35 }]);
export const ALARM_CLOCK = makeClock(T.alarm, [{ g: 8.6, d: 0.18 }]);

// ---- events (film time, seconds — the score and picture share these) ----
export const EV = {
  // strip
  limoPass: 2.2,           // long black limo glides past the marquees
  signBuzz: [5.8, 6.5, 7.1], // dying neon letters stutter
  // dossier
  cards: [10.5, 11.6, 12.7, 13.8, 14.9], // one slam per crew member, in CREW order
  // plan
  planDraw: 18.2,
  arrows: [19.0, 20.5, 22.0], // flow arrows: entrance→slots, slots→vent, vent→vault
  counter: [20.0, 25.4],      // T-MINUS 02:00 → 00:00
  chips: [20.8, 22.9, 24.0],  // CUT POWER · JACKPOT · EXFIL
  // floor
  crewIn: 26.4,
  insetOn: 26.8,              // security-cam inset (CAM 04) starts recording
  jackpot: 29.0,              // SPARK hits the jackpot — confetti, crowd, bells
  shadesPan: [30.6, 32.2],    // MR. SHADES scans the floor
  charm: 31.0,                // FACE works the pit boss at the tables
  slip: 33.2,                 // BLADE + GHOST crouch-walk behind the slot row
  hatch: [35.0, 35.6],        // floor grate opens; both drop in
  // vent
  slide: [36.4, 39.4],        // tea-tray slide through the duct
  streaks: [37.2, 38.4],      // light streaks through passing grates
  grateDrop: 39.7,
  land: 40.2,                 // dusty landing
  heart: [40.6, 41.4],
  // vault
  beamOn: 44.0,
  arc: [44.2, 46.8],          // red laser traces the circle
  bolts: [47.2, 47.5, 47.8],  // locking bolts pop
  contact: VAULT_CLOCK.filmT(6.0),   // door lands — 48.00, freeze 0.35 s holds the thud
  dust: 48.05,
  reveal: [49.4, 51.4],       // light rises on the pedestal
  shadow: [52.2, 53.4],       // SHADES' silhouette crosses the door glass
  freezeCrew: [52.6, 53.1],
  // g-domain events past the 6.0 freeze carry its 0.35 s shift in film time
  domeLift: 54.35,            // g 12.0
  lift: 54.95,                // g 12.6 — the mullet held aloft, Simba-style
  // alarm
  klaxon: 56.0,
  ropeTrip: 58.6,             // guards hit the velvet rope
  pileup: 59.4,               // pit boss + Shades pile on
  doorBurst: 59.9,
  carSkid: 60.2,
  pileIn: [60.4, 60.9],
  launch: 61.0,
  gate: ALARM_CLOCK.filmT(8.6), // 64.60, micro-freeze
  clear: 65.2,
  // dawn
  birds: [67.2, 68.6],
  // title
  buzz: 72.2,
  word1: 72.4,                // OCEAN'S letters flicker on (7 letters, 60 ms apart)
  word2: 73.2,                // FORTY-TWO slams in gold
  subline: 73.8,
  chipsTitle: 74.4,
  fade: [75.2, 76.0],
};

// ---- declarative captions (post overlay; windows sized so full-visible hold ≥ 3.4 s after 0.4 s fades) ----
export const CAPTIONS = [
  { id: 'city1', text: 'REMYPOLIS · 3:00 A.M.', t0: 0.9, t1: 5.1, style: 'loc' },
  { id: 'city2', text: 'THE HOUSE ALWAYS WINS.', t0: 5.4, t1: 9.6, style: 'tag' },
  { id: 'mullet', text: 'THE GOLDEN MULLET', t0: 49.4, t1: 53.8, style: 'gold' },
  { id: 'loses', text: 'THE HOUSE ALWAYS LOSES.', t0: 67.2, t1: 71.6, style: 'tag' },
];

// ---- flashes [t, peak, decay] — sharp cracks; a dark scene turns to grey soup under big slow flashes ----
export const FLASHES = [
  [EV.jackpot, 0.18, 0.1],
  [EV.contact, 0.3, 0.13],
  [EV.klaxon, 0.26, 0.18],
  [EV.launch, 0.22, 0.12],
  [EV.gate, 0.32, 0.15],
  [EV.word2, 0.28, 0.14],
];
