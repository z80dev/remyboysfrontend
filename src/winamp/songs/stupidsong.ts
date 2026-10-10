import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Stupid Song (16-Bit Remake)" — G major, 172 BPM, an imagined brat-pop sprint after Olivia Rodrigo's #9.
 * The conceit is the title: the hook is an earworm that will not stay out. It bursts into the verses uninvited,
 * gets a dreamy music-box lullaby middle eight ("finally, peace") and is rudely interrupted by an orchestra hit
 * into a doubled last chorus. Gang "hey!"s, stop-time hits, power stabs, a punk kit with the crash left on.
 * Verse Em C G D; chorus G D Em C / C C D D lift.
 * Intro (4 bars) → loop of 48 bars (≈100 s): verse (8) → chorus (8) → verse with interruptions (8) → chorus (8)
 * → lullaby + rude awakening (8) → build (8) → double chorus (8).
 */
const G = 43;
const D = 50;
const Em = 40;
const C = 48;

const lead: Note[] = [];
const burst: Note[] = [];
const stabs: Note[] = [];
const choir: Note[] = [];
const box: Note[] = [];
const strings: Note[] = [];
const bass: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

function powerStab(bar: number, root: number, steps: number[], strength: number) {
  for (const s of steps) {
    for (const pitch of [root + 12, root + 19, root + 24]) stabs.push([bar * 16 + s, pitch, 1.8, 0.76 * strength]);
  }
}

function punkBass(bar: number, root: number, strength: number, sparse = false) {
  const steps = sparse ? [0, 4, 8, 12] : [0, 2, 4, 6, 8, 10, 12, 14];
  for (const s of steps) bass.push([bar * 16 + s, root - 12, 1.9, (s % 4 ? 0.66 : 0.84) * strength]);
}

function punkKit(bar: number, opts: { crash?: boolean; fill?: boolean; half?: boolean; strength?: number } = {}) {
  const at = bar * 16;
  const strength = opts.strength ?? 1;
  drums.push([at, DRUM.kick, 1, 0.9 * strength], [at + (opts.half ? 10 : 8), DRUM.kick, 1, 0.78 * strength]);
  for (const s of [4, 12]) drums.push([at + s, DRUM.snare, 1, 0.76 * strength]);
  if (!opts.half) for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.6, 0.3 * strength]);
  if (opts.crash) drums.push([at, DRUM.crash, 4, 0.55 * strength]);
  if (opts.fill) {
    drums.push(
      [at + 12, DRUM.snare, 0.5, 0.6],
      [at + 13, DRUM.snare, 0.5, 0.64],
      [at + 14, DRUM.tomMid, 0.5, 0.64],
      [at + 15, DRUM.tomLow, 0.5, 0.68],
    );
  }
}

function gang(bar: number, step: number, pitch: number) {
  choir.push([bar * 16 + step, pitch, 1, 0.6], [bar * 16 + step, pitch + 7, 1, 0.5]);
  drums.push([bar * 16 + step, DRUM.clap, 1, 0.4]);
}

// The earworm: four notes that are too pleased with themselves. G B D E → G, up, down, snap.
const EARWORM: Note[] = [
  [0, 79, 1.5, 0.92],
  [2, 83, 1.5, 0.88],
  [4, 81, 1.5, 0.9],
  [6, 76, 1, 0.84],
  [7, 79, 3, 0.92],
];
const EARWORM_B: Note[] = [
  [0, 79, 1.5, 0.92],
  [2, 83, 1.5, 0.88],
  [4, 84, 2, 0.94],
  [6, 83, 1, 0.86],
  [7, 81, 3, 0.9],
];
const verseTune: Note[][] = [
  [
    [0, 71, 2, 0.78],
    [2, 74, 2, 0.8],
    [4, 76, 3, 0.82],
    [8, 74, 2, 0.74],
    [10, 71, 2, 0.72],
    [12, 67, 3, 0.74],
  ],
  [
    [0, 72, 2, 0.78],
    [2, 76, 2, 0.8],
    [4, 79, 3, 0.84],
    [8, 76, 2, 0.74],
    [10, 72, 2, 0.72],
    [12, 69, 3, 0.74],
  ],
  [
    [0, 71, 1, 0.74],
    [1, 74, 1, 0.76],
    [2, 79, 4, 0.86],
    [6, 78, 2, 0.76],
    [8, 76, 2, 0.74],
    [10, 74, 2, 0.72],
    [12, 71, 3, 0.76],
  ],
  [
    [0, 72, 4, 0.8],
    [4, 74, 2, 0.76],
    [6, 76, 2, 0.78],
    [8, 79, 6, 0.84],
    [14, 78, 2, 0.74],
  ],
];
const chorusTune: Note[][] = [
  [...EARWORM.map(([s, p, l, v]) => [s, p, l, v ?? 0.9] as Note), [10, 83, 2, 0.86], [12, 79, 3, 0.88]],
  [...EARWORM_B.map(([s, p, l, v]) => [s, p, l, v ?? 0.9] as Note), [10, 79, 2, 0.84], [12, 74, 3, 0.86]],
  [
    [0, 81, 2, 0.88],
    [2, 79, 2, 0.84],
    [4, 76, 2, 0.84],
    [6, 74, 2, 0.8],
    [8, 71, 4, 0.84],
    [12, 76, 2, 0.8],
    [14, 79, 2, 0.84],
  ],
  [
    [0, 81, 4, 0.88],
    [4, 84, 4, 0.92],
    [8, 88, 6, 0.94],
    [14, 86, 2, 0.84],
  ],
];

// Intro: count-in claps, stop-time hits and "hey!" — the band agreeing on nothing.
for (let i = 0; i < 4; i++) {
  const at = i * 16;
  drums.push([at, DRUM.rim, 1, 0.5]);
  for (let s = 4; s < 16; s += 4) drums.push([at + s, DRUM.rim, 1, 0.4]);
  if (i >= 2) gang(i, 0, 67);
  if (i >= 1) powerStab(i, [Em, C, G, D][i], [0], 0.7);
  if (i === 3) {
    phrase(burst, 3, EARWORM, 0.8, 12);
    gang(3, 14, 67);
  }
}

const LOOP = 4;
let bar = LOOP;

function verseBars(interrupted: boolean) {
  [Em, C, G, D, Em, C, G, D].forEach((root, i) => {
    punkKit(bar, { fill: i === 7, crash: i === 0 });
    punkBass(bar, root, 1);
    powerStab(bar, root, [0, 8], 0.8);
    phrase(lead, bar, verseTune[i % 4], interrupted && i >= 4 ? 0.85 : 1);
    if (i % 2 === 1) gang(bar, 12, 67);
    // The earworm barges in mid-verse, twice, like you knew it would.
    if (interrupted && (i === 1 || i === 5)) {
      phrase(burst, bar, EARWORM, 0.75, 12);
      gang(bar, 10, 72);
    }
    bar++;
  });
}

function chorusBars(big: boolean) {
  [G, D, Em, C, C, C, D, D].forEach((root, i) => {
    punkKit(bar, { crash: i % 2 === 0, fill: i === 7 });
    punkBass(bar, root, 1);
    powerStab(bar, root, [0, 6, 10], 1);
    phrase(lead, bar, chorusTune[i % 4]);
    gang(bar, 8, 67);
    strings.push(...[root, root + 7, root + 12].map((pitch): Note => [bar * 16, pitch, 15.5, 0.22]));
    if (big) phrase(burst, bar, chorusTune[i % 4], 0.6, 12);
    bar++;
  });
}

verseBars(false);
chorusBars(false);
verseBars(true);
chorusBars(false);

// Lullaby: the earworm as a music box — you can almost fall asleep — pads, soft kit, peace for six bars.
for (let i = 0; i < 8; i++) {
  const root = [G, Em, C, D, G, Em, C, D][i];
  box.push(
    [bar * 16, 79, 3, 0.5],
    [bar * 16 + 4, 83, 3, 0.46],
    [bar * 16 + 8, 81, 3, 0.48],
    [bar * 16 + 12, 76, 3, 0.44],
  );
  if (i >= 4) box.push([bar * 16 + 8, 86, 4, 0.42]);
  strings.push(...[root, root + 7, root + 12].map((pitch): Note => [bar * 16, pitch, 15.5, 0.2]));
  drums.push([bar * 16, DRUM.kick, 1, 0.4]);
  for (let s = 0; s < 16; s += 4) drums.push([bar * 16 + s, DRUM.shaker, 0.5, 0.08]);
  punkBass(bar, root, 0.5, true);
  if (i >= 6) for (const s of [0, 2, 4]) drums.push([bar * 16 + 12 + s, DRUM.snare, 0.5, 0.3 + s * 0.08]);
  bar++;
}
// Rude awakening: orchestra hit, everything at once, the earworm louder than ever.
for (const pitch of [67, 72, 76, 79]) stabs.push([bar * 16, pitch, 3, 0.9]);
drums.push([bar * 16, DRUM.crash, 4, 0.7], [bar * 16, DRUM.kick, 1, 0.95], [bar * 16, DRUM.snare, 1, 0.9]);
phrase(lead, bar, EARWORM_B, 1);

// Build: run at it twice as fast as sense allows.
for (let i = 0; i < 7; i++) {
  punkKit(bar, { crash: i === 0, strength: 0.85 });
  punkBass(bar, [G, C, G, D, G, C, D, D][i], 0.9);
  if (i >= 4) powerStab(bar, [G, C, G, D, G, C, D, D][i], [0], 0.8);
  gang(bar, 8, 67);
  bar++;
}

chorusBars(true);

export default {
  title: "Stupid Song (16-Bit Remake)",
  bpm: 172,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.45,
  echoBeats: 0.5,
  echoFeedback: 0.2,
  parts: [
    { inst: "square", notes: lead, vol: 0.6, pan: 0.05, reverb: 0.18, echo: 0.15 },
    { inst: "square50", notes: burst, vol: 0.34, pan: 0.35, reverb: 0.18, echo: 0.2 },
    { inst: "brass", notes: stabs, vol: 0.24, pan: -0.15, reverb: 0.2 },
    { inst: "choir", notes: choir, vol: 0.3, pan: 0.25, reverb: 0.35 },
    { inst: "music_box", notes: box, vol: 0.34, pan: -0.3, reverb: 0.4, echo: 0.25 },
    { inst: "strings", notes: strings, vol: 0.18, pan: 0.3, reverb: 0.4 },
    { inst: "bass_saw", notes: bass, vol: 0.56, pan: 0, reverb: 0.03 },
    { inst: "drums", notes: drums, vol: 0.72, pan: 0, reverb: 0.08 },
  ],
} satisfies Song;
