import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Boston (16-Bit Remake)" — B minor, 160 BPM, an imagined windows-down night-drive after STELLA LEFTY's #6.
 * Palm-muted-style square chugs and a driving kit push down the highway; the pre-chorus lifts the headlights and
 * the chorus is the bridge at 2 a.m. — big stabs, strings, and a saw lead hanging out over the barrier. The
 * middle eight is the city skyline from across the water: bells and a pad, engines idling, then the last run.
 * Verse Bm G D A; chorus D A Bm G; bridge G A Bm.
 * Intro (8 bars) → loop of 48 bars (≈115 s): riff (4) → verse (8) → chorus (8) → verse′ (8) → chorus (8)
 * → skyline bridge (8) → build (4) → chorus (8, doubled).
 */
const Bm = 47;
const G = 43;
const D = 50;
const A = 45;
const lead: Note[] = [];
const chug: Note[] = [];
const stabs: Note[] = [];
const strings: Note[] = [];
const bell: Note[] = [];
const bass: Note[] = [];
const pad: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

const chugOf = (root: number) => root + 12;
function chugs(bar: number, root: number, strength: number) {
  for (let s = 0; s < 16; s += 2) chug.push([bar * 16 + s, chugOf(root), 1.6, (s % 4 ? 0.5 : 0.66) * strength]);
}

function powerStab(bar: number, root: number, steps: number[], strength: number) {
  for (const s of steps) {
    for (const pitch of [root + 12, root + 19, root + 24]) stabs.push([bar * 16 + s, pitch, 2, 0.76 * strength]);
  }
}

function driveBass(bar: number, root: number, strength: number) {
  for (let s = 0; s < 16; s += 2)
    bass.push([bar * 16 + s, root - 12 + (s === 14 ? 12 : 0), 1.8, (s % 4 ? 0.6 : 0.8) * strength]);
}

function driveKit(bar: number, opts: { crash?: boolean; fill?: boolean; strength?: number } = {}) {
  const at = bar * 16;
  const strength = opts.strength ?? 1;
  drums.push(
    [at, DRUM.kick, 1, 0.9 * strength],
    [at + 8, DRUM.kick, 1, 0.78 * strength],
    [at + 14, DRUM.kick, 1, 0.56 * strength],
  );
  for (const s of [4, 12]) drums.push([at + s, DRUM.snare, 1, 0.74 * strength]);
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.6, 0.28 * strength]);
  if (opts.crash) drums.push([at, DRUM.crash, 5, 0.55 * strength]);
  if (opts.fill)
    drums.push([at + 13, DRUM.tomHigh, 0.5, 0.5], [at + 14, DRUM.tomMid, 0.5, 0.54], [at + 15, DRUM.tomLow, 0.5, 0.58]);
}

const verseMelody: Note[][] = [
  [
    [0, 71, 2, 0.74],
    [2, 74, 2, 0.78],
    [4, 78, 3, 0.82],
    [8, 76, 2, 0.74],
    [10, 74, 2, 0.72],
    [12, 71, 3, 0.74],
  ],
  [
    [0, 74, 2, 0.76],
    [2, 76, 2, 0.78],
    [4, 79, 3, 0.84],
    [8, 78, 2, 0.76],
    [10, 74, 2, 0.72],
    [12, 71, 3, 0.74],
  ],
  [
    [0, 71, 1, 0.7],
    [1, 74, 1, 0.72],
    [2, 78, 4, 0.84],
    [6, 81, 2, 0.84],
    [8, 79, 2, 0.78],
    [12, 76, 3, 0.76],
  ],
  [
    [0, 74, 2, 0.74],
    [2, 71, 2, 0.72],
    [4, 69, 4, 0.76],
    [8, 66, 4, 0.7],
    [12, 69, 2, 0.7],
    [14, 71, 2, 0.72],
  ],
];
const chorusMelody: Note[][] = [
  [
    [0, 74, 2, 0.88],
    [2, 71, 2, 0.82],
    [4, 74, 2, 0.86],
    [6, 78, 4, 0.92],
    [10, 76, 2, 0.8],
    [12, 74, 2, 0.82],
    [14, 71, 2, 0.8],
  ],
  [
    [0, 74, 2, 0.88],
    [2, 78, 2, 0.86],
    [4, 81, 4, 0.94],
    [8, 78, 2, 0.84],
    [10, 76, 2, 0.8],
    [12, 74, 4, 0.84],
  ],
  [
    [0, 76, 2, 0.84],
    [2, 78, 2, 0.84],
    [4, 81, 2, 0.9],
    [6, 83, 2, 0.9],
    [8, 81, 2, 0.86],
    [10, 78, 2, 0.82],
    [12, 76, 2, 0.8],
    [14, 74, 2, 0.82],
  ],
  [
    [0, 71, 4, 0.84],
    [4, 74, 4, 0.86],
    [8, 78, 6, 0.9],
    [14, 76, 2, 0.8],
  ],
];

// Intro: chugs alone with the kit, a pickup lead wail at the end.
for (let i = 0; i < 8; i++) {
  chugs(i, Bm, 0.85);
  driveKit(i, { crash: i % 4 === 0, fill: i === 3 || i === 7, strength: i < 2 ? 0.75 : 1 });
  if (i >= 4) {
    driveBass(i, Bm, 0.9);
    powerStab(i, Bm, [0], 0.5);
  }
}
phrase(lead, 7, [
  [12, 71, 2, 0.7],
  [14, 74, 2, 0.74],
]);

const LOOP = 8;
let bar = LOOP;

function verseBars(second: boolean) {
  [Bm, G, D, A, Bm, G, D, A].forEach((root, i) => {
    driveKit(bar, { fill: i === 7 });
    chugs(bar, root, 1);
    driveBass(bar, root, 1);
    if (!second || i >= 4) phrase(lead, bar, verseMelody[i % 4], second ? 0.9 : 1);
    if (i % 2 === 1) powerStab(bar, root, [8], 0.55);
    if (second) strings.push(...[root, root + 7, root + 12].map((pitch): Note => [bar * 16, pitch, 15.5, 0.2]));
    bar++;
  });
}

function chorusBars(big: boolean) {
  [D, A, Bm, G, D, A, Bm, G].forEach((root, i) => {
    driveKit(bar, { crash: i % 2 === 0, fill: i === 7 });
    chugs(bar, root, 1);
    driveBass(bar, root, 1);
    powerStab(bar, root, [0, 6], 1);
    phrase(lead, bar, chorusMelody[i % 4]);
    strings.push(...[root, root + 7, root + 12].map((pitch): Note => [bar * 16, pitch, 15.5, 0.3]));
    if (big) phrase(lead, bar, chorusMelody[i % 4], 0.5, 12);
    bar++;
  });
}

verseBars(false);
chorusBars(false);
verseBars(true);
chorusBars(false);

// Skyline bridge: across the water — bells, pad, engine-idle bass; the kit whispers, then wakes.
const skyline = [G, A, Bm, Bm, G, A, Bm, Bm];
skyline.forEach((root, i) => {
  const at = bar * 16;
  pad.push(...[root, root + 7, root + 12].map((pitch): Note => [at, pitch, 15.5, 0.3]));
  bass.push([at, root - 12, 7, 0.5], [at + 8, root - 12, 7, 0.46]);
  bell.push([at + 2, root + 24, 3, 0.38], [at + 9, root + 31, 4, 0.32]);
  if (i >= 2) for (const s of [4, 12]) drums.push([at + s, DRUM.snare2, 0.8, 0.3]);
  if (i >= 4) {
    chugs(bar, root, 0.6);
    phrase(
      lead,
      bar,
      [
        [0, 78, 4, 0.7],
        [6, 74, 2, 0.64],
        [8, 71, 6, 0.72],
      ],
      i >= 6 ? 1 : 0.8,
    );
  }
  if (i === 7) for (const s of [12, 13, 14, 15]) drums.push([at + s, DRUM.snare, 0.5, 0.4 + (s - 12) * 0.11]);
  bar++;
});

// Build: headlights back on.
const restart = [G, A, Bm, Bm];
restart.forEach((root, i) => {
  driveKit(bar, { crash: i === 3, strength: 0.8 + i * 0.07 });
  chugs(bar, root, 0.7 + i * 0.1);
  driveBass(bar, root, 0.8 + i * 0.07);
  if (i >= 2) powerStab(bar, root, [0], 0.7);
  bar++;
});

chorusBars(true);

export default {
  title: "Boston (16-Bit Remake)",
  bpm: 160,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.5,
  echoBeats: 0.5,
  echoFeedback: 0.2,
  parts: [
    { inst: "saw_lead", notes: lead, vol: 0.62, pan: 0.05, reverb: 0.22, echo: 0.18 },
    { inst: "square50", notes: chug, vol: 0.3, pan: -0.3, reverb: 0.12 },
    { inst: "brass", notes: stabs, vol: 0.24, pan: -0.1, reverb: 0.2 },
    { inst: "strings", notes: strings, vol: 0.2, pan: 0.3, reverb: 0.4 },
    { inst: "bell", notes: bell, vol: 0.26, pan: 0.4, reverb: 0.4, echo: 0.3 },
    { inst: "bass", notes: bass, vol: 0.56, pan: 0, reverb: 0.03 },
    { inst: "pad", notes: pad, vol: 0.24, pan: 0.15, reverb: 0.35 },
    { inst: "drums", notes: drums, vol: 0.7, pan: 0, reverb: 0.09 },
  ],
} satisfies Song;
