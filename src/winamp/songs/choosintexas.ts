import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Choosin' Texas (16-Bit Remake)" — A major, 116 BPM with a lazy 16th swing, an imagined hill-country hoedown
 * after Ella Langley's #2. Fiddle (violin) and banjo-rolls (plucked guitar) trade over a boom-chuck kit, a walking
 * boogie bass (root-5th-6th-7th), honky-tonk piano fills and a harp run into each section — a "welcome to town"
 * level theme. Loop of 32 bars (≈66 s): fiddle A (8) → banjo and piano B (8) → fiddle A′ with 3rds (8)
 * → stop-time breakdown and build (8). A A D A | A A D E turnaround; B on D and E.
 */
const A = 45;
const D = 38;
const E = 40;
const fiddle: Note[] = [];
const harmony: Note[] = [];
const banjo: Note[] = [];
const guitar: Note[] = [];
const piano: Note[] = [];
const harp: Note[] = [];
const bass: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

function strum(target: Note[], bar: number, step: number, pitches: number[], length: number, velocity: number) {
  pitches.forEach((pitch, i) => target.push([bar * 16 + step + i * 0.06, pitch, length, velocity - i * 0.03]));
}

// Boom-chuck: low root on 1 and 3, chord strums on 2 and 4 — the country engine.
function boomChuck(bar: number, root: number, chuck: number[]) {
  const at = bar * 16;
  guitar.push([at, root, 3.5, 0.72], [at + 8, root + 7 > root + 9 ? root + 7 - 12 : root + 7, 3.5, 0.62]);
  strum(guitar, bar, 4, chuck, 3, 0.5);
  strum(guitar, bar, 12, chuck, 3, 0.46);
}

// Classic country boogie: root, 5th, 6th, b7 walk up and back, quarter notes.
function boogie(bar: number, root: number) {
  const at = bar * 16;
  const walk = [root, root + 7, root + 9, root + 10, root + 12, root + 10, root + 9, root + 7];
  walk.forEach((pitch, i) => bass.push([at + i * 2, pitch, 1.8, i % 2 ? 0.6 : 0.78]));
}

function kit(bar: number, variant = 0) {
  const at = bar * 16;
  drums.push([at, DRUM.kick, 1, 0.78]);
  if (variant !== 2) drums.push([at + 10, DRUM.kick, 1, 0.5]);
  for (const s of [4, 12]) drums.push([at + s, DRUM.snare, 1, variant === 2 ? 0.4 : 0.5]);
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.6, s % 4 ? 0.2 : 0.28]);
  for (let s = 1; s < 16; s += 2) drums.push([at + s, DRUM.shaker, 0.5, 0.11]);
  if (variant === 1) {
    drums.push([at + 13, DRUM.tomHigh, 0.5, 0.4], [at + 14, DRUM.tomMid, 0.5, 0.42], [at + 15, DRUM.tomLow, 0.5, 0.44]);
  }
}

function tambourine(bar: number) {
  for (let s = 0; s < 16; s += 4) drums.push([bar * 16 + s, DRUM.tambourine, 1, s % 8 ? 0.26 : 0.36]);
}

// Fiddle melody A — big Texas long-bows with pickup 8ths.
const melodyA: Note[][] = [
  [
    [0, 76, 2, 0.8],
    [2, 74, 1, 0.66],
    [3, 76, 1, 0.7],
    [4, 78, 2, 0.82],
    [6, 76, 2, 0.72],
    [8, 73, 3, 0.76],
    [12, 74, 2, 0.7],
    [14, 76, 2, 0.74],
  ],
  [
    [0, 78, 3, 0.84],
    [3, 79, 1, 0.7],
    [4, 81, 4, 0.88],
    [8, 78, 2, 0.74],
    [10, 76, 2, 0.72],
    [12, 74, 4, 0.72],
  ],
  [
    [0, 76, 2, 0.8],
    [2, 74, 1, 0.66],
    [3, 76, 1, 0.7],
    [4, 78, 2, 0.82],
    [6, 76, 2, 0.72],
    [8, 73, 3, 0.76],
    [12, 74, 2, 0.7],
    [14, 76, 2, 0.74],
  ],
  [
    [0, 73, 4, 0.76],
    [4, 69, 4, 0.7],
    [8, 66, 4, 0.68],
    [12, 71, 2, 0.7],
    [14, 73, 2, 0.72],
  ],
  [
    [0, 81, 2, 0.86],
    [2, 78, 1, 0.72],
    [3, 81, 1, 0.76],
    [4, 83, 2, 0.88],
    [6, 81, 2, 0.78],
    [8, 78, 3, 0.8],
    [12, 76, 2, 0.74],
    [14, 78, 2, 0.76],
  ],
  [
    [0, 79, 3, 0.84],
    [3, 78, 1, 0.7],
    [4, 76, 4, 0.82],
    [8, 74, 2, 0.72],
    [10, 71, 2, 0.7],
    [12, 69, 4, 0.72],
  ],
  [
    [0, 76, 2, 0.8],
    [2, 78, 2, 0.78],
    [4, 79, 2, 0.8],
    [6, 78, 2, 0.76],
    [8, 76, 4, 0.8],
    [12, 74, 2, 0.72],
    [14, 76, 2, 0.74],
  ],
  [
    [0, 74, 4, 0.78],
    [4, 76, 2, 0.74],
    [6, 74, 2, 0.72],
    [8, 71, 4, 0.76],
    [12, 69, 2, 0.7],
    [14, 71, 2, 0.72],
  ],
];
// Section B melody — banjo-friendly, bouncier, sits on D and E.
const melodyB: Note[][] = [
  [
    [0, 74, 1, 0.72],
    [2, 74, 1, 0.68],
    [4, 78, 2, 0.78],
    [6, 74, 1, 0.68],
    [8, 73, 1, 0.68],
    [10, 74, 1, 0.7],
    [12, 78, 4, 0.78],
  ],
  [
    [0, 78, 1, 0.76],
    [2, 78, 1, 0.72],
    [4, 81, 2, 0.82],
    [6, 78, 1, 0.72],
    [8, 76, 2, 0.76],
    [10, 74, 2, 0.72],
    [12, 76, 4, 0.76],
  ],
  [
    [0, 79, 2, 0.8],
    [2, 78, 1, 0.72],
    [4, 76, 1, 0.72],
    [6, 74, 1, 0.7],
    [8, 76, 2, 0.76],
    [10, 79, 2, 0.78],
    [12, 83, 4, 0.84],
  ],
  [
    [0, 81, 3, 0.82],
    [3, 79, 1, 0.72],
    [4, 78, 2, 0.76],
    [8, 74, 2, 0.72],
    [10, 71, 2, 0.7],
    [12, 68, 4, 0.7],
  ],
];

const chordOf = [A, A, D, A, A, A, D, E];
const chuckA = [57, 61, 64];
const chuckD = [57, 62, 66];
const chuckE = [56, 59, 64];

// Banjo roll: forward 16th rolls on the chord tones.
function roll(bar: number, pitches: number[], strength: number) {
  const order = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 2, 1, 0, 1];
  for (let s = 0; s < 16; s++) banjo.push([bar * 16 + s, pitches[order[s]], 0.8, (s % 4 ? 0.4 : 0.56) * strength]);
}

function harpRun(bar: number, from: number, up: boolean) {
  for (let i = 0; i < 8; i++) harp.push([bar * 16 + 8 + i, from + (up ? 2 : -2) * i, 1.5, 0.5 - i * 0.02]);
}

// Intro (4 bars): guitar and boogie settle in, fiddle double-stops tune up.
for (let i = 0; i < 4; i++) {
  boomChuck(i, A, chuckA);
  boogie(i, A);
  kit(i, i === 3 ? 1 : 0);
}
phrase(fiddle, 3, [
  [12, 69, 1, 0.5],
  [13, 73, 1, 0.55],
  [14, 76, 1, 0.6],
  [15, 81, 1, 0.62],
]);

const LOOP = 4;
let bar = LOOP;

// Fiddle A over boom-chuck.
chordOf.forEach((root, i) => {
  const chuck = root === D ? chuckD : root === E ? chuckE : chuckA;
  boomChuck(bar, root, chuck);
  boogie(bar, root);
  kit(bar, i % 4);
  tambourine(bar);
  phrase(fiddle, bar, melodyA[i]);
  if (i === 0) drums.push([bar * 16, DRUM.crash, 4, 0.4]);
  if (i === 7) harpRun(bar, 69, true);
  bar++;
});

// Banjo and piano B — fiddle lays out, rolls and honky fills carry it.
const chordsB = [D, D, A, A, E, E, A, A];
chordsB.forEach((root, i) => {
  const chuck = root === D ? chuckD : root === E ? chuckE : chuckA;
  boomChuck(bar, root, chuck);
  boogie(bar, root);
  kit(bar, i % 4);
  roll(
    bar,
    chuck.map((p) => p + 12),
    1,
  );
  phrase(piano, bar, melodyB[i % 4], 0.85);
  if (i === 3)
    piano.push(
      [bar * 16 + 12, 76, 1, 0.5],
      [bar * 16 + 13, 79, 1, 0.52],
      [bar * 16 + 14, 83, 1, 0.54],
      [bar * 16 + 15, 88, 1, 0.56],
    );
  if (i === 7) harpRun(bar, 81, false);
  bar++;
});

// Fiddle A′ — harmony fiddle a 3rd below, banjo keeps rolling.
chordOf.forEach((root, i) => {
  const chuck = root === D ? chuckD : root === E ? chuckE : chuckA;
  boomChuck(bar, root, chuck);
  boogie(bar, root);
  kit(bar, i % 4);
  tambourine(bar);
  phrase(fiddle, bar, melodyA[i]);
  if (i > 3) phrase(harmony, bar, melodyA[i], 0.6, -4);
  roll(
    bar,
    chuck.map((p) => p + 12),
    0.7,
  );
  bar++;
});

// Stop-time breakdown and build: band hits on 1, fiddle talks, everyone counts it back in.
const LICKS: Note[][] = [
  [
    [0, 76, 1, 0.7],
    [2, 73, 1, 0.66],
    [4, 69, 2, 0.7],
    [8, 73, 1, 0.68],
    [10, 76, 1, 0.7],
    [12, 81, 3, 0.8],
  ],
  [
    [0, 74, 2, 0.72],
    [4, 76, 2, 0.72],
    [8, 78, 2, 0.76],
    [12, 79, 3, 0.78],
  ],
  [
    [0, 81, 1, 0.78],
    [2, 81, 1, 0.74],
    [4, 83, 2, 0.8],
    [8, 79, 2, 0.74],
    [12, 76, 3, 0.72],
  ],
  [
    [0, 74, 2, 0.74],
    [4, 73, 2, 0.72],
    [8, 69, 4, 0.74],
    [12, 66, 2, 0.68],
    [14, 69, 2, 0.7],
  ],
];
for (let i = 0; i < 4; i++) {
  const at = bar * 16;
  drums.push([at, DRUM.kick, 1, 0.8], [at + 4, DRUM.snare, 1, 0.55], [at + 8, DRUM.kick, 1, 0.7]);
  strum(guitar, bar, 0, chuckA, 6, 0.5);
  bass.push([at, A, 7, 0.7]);
  const lick = LICKS[i];
  phrase(fiddle, bar, lick);
  bar++;
}
for (let s = 0; s < 16; s++) drums.push([(bar - 1) * 16 + s, DRUM.shaker, 0.5, 0.1 + s * 0.012]);
for (const s of [12, 13, 14, 15]) drums.push([(bar - 1) * 16 + s, DRUM.snare, 0.5, 0.35 + (s - 12) * 0.12]);

export default {
  title: "Choosin' Texas (16-Bit Remake)",
  bpm: 116,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  swing: 0.22,
  room: 0.4,
  echoBeats: 0.5,
  echoFeedback: 0.15,
  parts: [
    { inst: "violin", notes: fiddle, vol: 0.62, pan: 0.15, reverb: 0.3, echo: 0.12 },
    { inst: "violin", notes: harmony, vol: 0.4, pan: -0.2, reverb: 0.3 },
    { inst: "guitar", notes: banjo, vol: 0.42, pan: 0.35, reverb: 0.2 },
    { inst: "guitar", notes: guitar, vol: 0.5, pan: -0.3, reverb: 0.18 },
    { inst: "piano", notes: piano, vol: 0.5, pan: 0.1, reverb: 0.25 },
    { inst: "harp", notes: harp, vol: 0.4, pan: -0.15, reverb: 0.3 },
    { inst: "bass_finger", notes: bass, vol: 0.6, pan: 0, reverb: 0.04 },
    { inst: "drums", notes: drums, vol: 0.7, pan: 0, reverb: 0.12 },
  ],
} satisfies Song;
