// PLANET REMY — "The Mane Event". Cue sheet: the one timing truth shared by picture,
// captions and score. A dawn-to-dawn day cycle in eight documentary beats.
export const DURATION = 62
export const LW = 960, LH = 540 // native pixel stage, upscaled 2× nearest to 1920×1080

// Shot boundaries (film seconds). 8 beats of one day.
export const T = {
  dawn: 0,     // pre-dawn → sunrise over the valley
  herd: 7,     // the Flow herd at graze, long lens
  portrait: 15, // the alpha, field-guide card + portrait cut-in
  ritual: 23,  // the Mane Display, golden hour
  ridge: 31,   // dusk — the Cabald appear on the ridge
  charge: 39,  // the raid, the clash, the retreat
  morning: 48, // next dawn, calm returns
  card: 56,    // end card
}

// Cast — chosen from inspected sheets output/_contact/planet-remy-cast-{near,orig}.png:
//   42   hero, crimson flow, sword (canon protagonist; never mirrored — shirt print)
//   24   gold flow, prop-free clean silhouette (may mirror)
//   1    aqua crown, teal hair (never mirrored — shirt print)
//   7    cobalt flow, blue bowl cut; carries a bat, staged as a foraging club (never mirrored)
//   2    midnight flow, black hair (never mirrored — shirt print)
//   13   cobalt flow, deep blue, slim blue blade (never mirrored — shirt print)
// Cabald (bald, all clean sprites; 5/1217/23/225 may mirror):
//   1217 pearl soul, gi — raid leader    5 gold soul — canon villain
//   23   midnight soul, heavy dark sword 225 crimson soul
export const HERO = 42
export const HERD = [24, 1, 7, 2, 13]
export const RAID = [1217, 5, 23, 225]

// Charge-shot hit-stop: game time of the clash inside the charge beat, freeze length.
export const HIT_G = 3.3
export const STOPS = [{ g: HIT_G, d: 0.14 }]

// ---------- narration + stamps ----------
// Punchlines ≤ 7 words carry minHold 2.2–2.5: short text, generous real reading time.
export const NARR = [
  { id: 'n1', text: 'Dawn, in the Flow Valley.\nThe most improbable herd on Earth begins to stir.', t0: 3.2, t1: 7.0 },
  { id: 'n2a', text: 'The Remy herd. Every mane a different shade — no two alike.', t0: 7.6, t1: 11.4 },
  { id: 'n2b', text: 'They graze. They gossip. Mostly, they pose.', t0: 11.5, t1: 14.8, minHold: 2.5 },
  { id: 'n3a', text: 'The alpha. Crimson mane, immaculately kept.', t0: 15.6, t1: 19.4 },
  { id: 'n3b', text: 'His blade? Purely ceremonial. Probably.', t0: 19.62, t1: 22.7, minHold: 2.5 },
  { id: 'n4a', text: 'Morning brings the ancient ritual: the Mane Display.', t0: 23.3, t1: 26.9 },
  { id: 'n4b', text: 'Points are deducted for frizz.', t0: 27.3, t1: 30.7, minHold: 2.5 },
  { id: 'n5a', text: 'But the valley keeps others.\nWhere hair grows thin, the Cabald gather.', t0: 31.5, t1: 35.4 },
  { id: 'n5b', text: 'Bald. Patient. Immaculately buffed.', t0: 35.6, t1: 38.7, minHold: 2.5 },
  { id: 'n6a', text: 'The raid comes at dusk. The herd does not run.', t0: 39.4, t1: 42.4, minHold: 2.4 },
  { id: 'n6b', text: 'The Cabald remember why they lost.', t0: 44.4, t1: 48.0 },
  { id: 'n7a', text: 'By morning, the valley is calm. It always is.', t0: 48.7, t1: 52.5 },
  { id: 'n7b', text: 'The hair endures.', t0: 52.9, t1: 55.7, minHold: 2.2 },
]
export const LOCS = [
  { id: 'l1', text: 'FLOW VALLEY — 5:58 AM', t0: 1.2, t1: 6.8 },
  { id: 'l2', text: 'THE GRAZING PLAINS — 6:20 AM', t0: 7.3, t1: 14.7 },
  { id: 'l2b', text: 'THE GRAZING PLAINS — 6:47 AM', t0: 15.3, t1: 22.7 },
  { id: 'l3', text: 'THE GROOMING ROCKS — 7:41 AM', t0: 23.3, t1: 30.7 },
  { id: 'l4', text: 'THE RIDGE — 7:58 PM', t0: 31.3, t1: 38.7 },
  { id: 'l6', text: 'FLOW VALLEY — 7:59 PM', t0: 39.3, t1: 47.9 },
  { id: 'l5', text: 'FLOW VALLEY — NEXT MORNING', t0: 48.3, t1: 55.7 },
]
export const CARD = [
  { id: 'kicker', text: 'A NATURAL HISTORY OF THE REMY BOYS', t0: 1.2, t1: 5.2, style: 'kicker' },
  { id: 'ot', text: 'PLANET REMY', t0: 2.0, t1: 6.9, style: 'ot' },
  { id: 'title', text: 'PLANET REMY', t0: 56.4, t1: 61.9, style: 'epic' },
  { id: 'epi', text: 'THE MANE EVENT', t0: 57.0, t1: 61.9, style: 'epi-sub' },
  { id: 'next', text: 'Next time — The Mating Displays of the Cobalt Flow.', t0: 57.6, t1: 61.6, style: 'card-sub' },
  { id: 'credit', text: 'Filmed on location. No Remys were shaved.', t0: 57.6, t1: 61.6, style: 'card-tiny' },
]
