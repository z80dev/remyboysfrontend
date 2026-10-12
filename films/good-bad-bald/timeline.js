// THE GOOD, THE BAD & THE BALD — a Remy Boys western. Timing truth for picture, HUD and score.
// 72 s at 120 BPM: every shot boundary sits on a bar line (bar = 2 s, beat = 0.5 s).
// Smooth 1080p painted western throughout, 2.39:1 letterbox. One hit-stop clock on the quick-draw.

export const BPM = 120;
export const B = 60 / BPM;        // 0.5 s beat
export const BAR = B * 4;         // 2.0 s bar
export const DURATION = 72;

// ---- cast (casting report: contact sheets read + quest-bald.json + art.json verified) ----
// GOOD 109  crimson flow, plain white sweatshirt — no props, no slogan text (#42 rejected: shirt text)
// BAD   5    gold soul, yellow tee — Cabald boss
// BALD  1217 pearl soul, gi — dome-perfect for the toupee prop
export const CAST = {
  GOOD: 109,
  BAD: 5,
  BALD: 1217,
  GANG: [233, 419, 142],   // violet / moss / pearl shirts, clean sprites
  PATRONS: [1002, 1032],   // 1002 wears a brown fedora — born saloon extra
  KEEPER: 1000,            // cobalt flow — saloon keeper
};
export const TRIO = [
  { id: CAST.GOOD, name: 'THE GOOD', epithet: 'CRIMSON FLOW', hex: '#c8553f' },
  { id: CAST.BAD, name: 'THE BAD', epithet: 'GOLD SOUL', hex: '#dccc5e' },
  { id: CAST.BALD, name: '& THE BALD', epithet: 'PEARL SOUL', hex: '#dad6d3' },
];

// ---- shot table (t0 on bar lines) ----
export const T = {
  dawn: 0,     // cold open — painted desert at first light, lone rider on the horizon
  title: 8,    // main title — three wanted-poster panels slam in over a sunset sky
  town: 16,    // arrival — Hairline's one street; the Good rides in, the Cabald watch
  saloon: 24,  // the saloon — keeper, patrons, a wanted poster, razors being sharpened
  standoff: 34,// the standoff — trio walks out, wind, dust, hearts, eyes
  draw: 48,    // the draw — bell, twitch, muzzle flash, hit-stop, a toupee in flight
  aftermath: 56,// dust settles; a tumbleweed wearing the toupee; hair toss; HAIR JUSTICE.
  fin: 68,     // dusk silhouette, FIN card, one last howl
  end: DURATION,
};
export const SHOTS = [
  { name: 'dawn', t0: T.dawn, t1: T.title },
  { name: 'title', t0: T.title, t1: T.town },
  { name: 'town', t0: T.town, t1: T.saloon },
  { name: 'saloon', t0: T.saloon, t1: T.standoff },
  { name: 'standoff', t0: T.standoff, t1: T.draw },
  { name: 'draw', t0: T.draw, t1: T.aftermath },
  { name: 'aftermath', t0: T.aftermath, t1: T.fin },
  { name: 'fin', t0: T.fin, t1: T.end },
];

// ---- hit-stop clock for the quick-draw: world freezes on the muzzle flash ----
export function makeClock(t0, stops) {
  return {
    t0,
    stops,
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
export const DRAW_CLOCK = makeClock(T.draw, [{ g: 1.0, d: 0.25 }]);

// ---- events (film time, seconds — picture and score share these) ----
export const EV = {
  // dawn
  fadeIn: [0, 1.1],
  coyote: 2.6,          // lone howl across the flats
  tumble1: 4.0,         // tumbleweed crosses the foreground
  hawk: 6.5,
  // title
  p1: 8.6, p2: 9.7, p3: 10.8,   // one wanted-poster slam per trio member
  titleSlam: 11.9,      // THE GOOD, THE BAD & THE BALD
  subline: 13.4,        // "a Remy Boys western"
  // town
  enter: 16.3,          // horse + rider enter left, trot to mid-street
  arrive: 21.0,         // horse halts at the hitching post
  dismount: 21.4,
  walkDoors: 22.1,      // the Good crosses to the saloon doors
  doorsSwing: 23.4,     // batwings part — cut on the swing
  // saloon
  posterIn: 25.4,       // camera pushes in on the wanted poster
  shing: [27.6, 29.2, 30.6],  // razors kissed to strops
  fly: [28.2, 33.4],    // the only patron who isn't afraid
  cuGood: [31.0, 32.2],
  cuBad: [32.3, 33.4],
  // standoff
  burst: 34.05,         // the Cabald kick out of the saloon
  out: [34.4, 35.0, 35.6],
  halt: 39.0,           // trio reaches their marks
  windUp: 39.6,         // wind starts crawling
  tumble2: 41.2,        // background tumbleweed
  cuGood2: [42.4, 44.0],
  cuBad2: [44.1, 45.3],
  cuBald: [45.4, 46.8], // the toupee flutters
  riser: [46.2, 47.94],
  // draw (g-domain events carry the 0.25 s freeze shift via DRAW_CLOCK.filmT)
  bell: 48.0,
  twitch: 48.85,        // fingers hover… the Bald's toupee lifts
  shot: DRAW_CLOCK.filmT(1.0),      // 49.00 — muzzle flash + freeze
  fold: DRAW_CLOCK.filmT(1.55),     // 49.80 — the Bad topples, hat spinning off
  toupee: DRAW_CLOCK.filmT(1.7),    // 49.95 — the toupee is airborne
  ric: [DRAW_CLOCK.filmT(2.4), DRAW_CLOCK.filmT(2.7)],  // ricochets zing
  clipDrop: 51.4,       // clippers hit the dirt
  flee: 51.8,           // the gang runs for the hills
  // aftermath
  tumbleToupee: [59.4, 63.0],  // a tumbleweed, wearing the toupee, rolls home
  keeperOut: 57.6,
  cheer: 58.6,
  hairToss: 59.4,       // the Good whips the crimson flow into the wind
  stamp: 61.0,          // HAIR JUSTICE.
  // fin
  finCard: 69.4,
  brand: 70.4,
  howl: 70.2,
  fade: [71.2, 72.0],
};

// heartbeat grid for the standoff: 18 thumps, 0.62 s apart easing to 0.26 s — ends before the bell
export const HEARTBEATS = (() => {
  const ts = [];
  let t = 40.4;
  for (let i = 0; i < 18; i++) {
    ts.push(+t.toFixed(3));
    t += 0.6 - (i / 17) * 0.35;
  }
  return ts;
})();

// ---- declarative captions (post overlay; full-visible hold ≥ 3.4 s after fades) ----
export const CAPTIONS = [
  { id: 'pres', text: 'REMY BOYS presents', t0: 1.4, t1: 6.6, style: 'loc' },
  { id: 'loc', text: 'HAIRLINE · FRONTIER TERRITORY', t0: 17.0, t1: 21.8, style: 'loc' },
  { id: 'tag', text: 'HIGH NOON WAS AN HOUR AGO.', t0: 40.6, t1: 45.4, style: 'tag' },
  { id: 'stamp', text: 'HAIR JUSTICE.', t0: 61.0, t1: 65.6, style: 'stampc' },
];

export const FLASHES = [
  [EV.bell, 0.1, 0.14],
  [EV.shot, 0.32, 0.12],
  [EV.stamp, 0.15, 0.12],
];
