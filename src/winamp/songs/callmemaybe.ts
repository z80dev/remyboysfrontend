import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Pocket Dial Crush" — G major, 120 BPM, an original bubblegum dance-pop crush song in the style of
 * Carly Rae Jepsen's #2 (original melodies; only the genre, groove and arrangement are borrowed). Strummed guitar
 * and a four-on-the-floor kick carry the verse; the pre-chorus drops to half-time with long strings and a climbing
 * lead; the chorus is bright staccato string stabs, octave-bouncing synth bass, claps and a bell sparkle under a
 * short, punchy hook. Ends on a stop-time tag that snaps straight back to the verse.
 * Verse G C Em D; pre Em D C D; chorus C D G Em C D G G.
 * Intro (4 bars) → loop of 40 bars (≈80 s): verse (8) → pre (4) → chorus (8) → verse′ (8) → chorus (8) → tag (4).
 */
type Chord = [bass: number, triad: number[]];
const G: Chord = [43, [55, 59, 62]];
const C: Chord = [36, [55, 60, 64]];
const D: Chord = [38, [54, 57, 62]];
const Em: Chord = [40, [55, 59, 64]];
const verse = [G, C, Em, D, G, C, Em, D];
const pre = [Em, D, C, D];
const chorus = [C, D, G, Em, C, D, G, G];

const lead: Note[] = [];
const sparkle: Note[] = [];
const guitar: Note[] = [];
const stabs: Note[] = [];
const strings: Note[] = [];
const bass: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// Strummed acoustic: down, down-up, up-down-up; strings fanned a hair apart.
const STRUM: [step: number, vel: number, down: boolean][] = [
  [0, 0.56, true],
  [4, 0.46, true],
  [6, 0.34, false],
  [10, 0.36, false],
  [12, 0.46, true],
  [14, 0.32, false],
];
function strum(bar: number, chord: Chord, strength: number) {
  const voicing = [chord[0] + 12, ...chord[1]];
  for (const [s, vel, down] of STRUM) {
    const order = down ? voicing : [...voicing].reverse();
    order.forEach((pitch, k) => guitar.push([bar * 16 + s + k * 0.08, pitch, 2, vel * strength]));
  }
}

// Staccato string stabs: pushed off-beats, the chorus's whole personality.
const STAB_STEPS = [0, 3, 6, 10, 12];
function stringStabs(bar: number, chord: Chord, strength: number, steps = STAB_STEPS) {
  for (const s of steps) {
    for (const pitch of chord[1]) stabs.push([bar * 16 + s, pitch + 12, 1, (s === 0 ? 0.76 : 0.64) * strength]);
  }
}

// Synth bass bouncing between octaves on 8ths.
function octaveBass(bar: number, root: number, strength: number) {
  for (let s = 0; s < 16; s += 2)
    bass.push([bar * 16 + s, root + (s % 4 ? 12 : 0), 1.6, (s % 4 ? 0.5 : 0.72) * strength]);
}

function dancePop(bar: number, opts: { open?: boolean; crash?: boolean; fill?: boolean } = {}) {
  const at = bar * 16;
  for (const s of [0, 4, 8, 12]) drums.push([at + s, DRUM.kick, 1, 0.86]);
  for (const s of [4, 12]) drums.push([at + s, DRUM.clap, 1, 0.6], [at + s, DRUM.snare, 1, 0.36]);
  for (let s = 0; s < 16; s++) drums.push([at + s, DRUM.hatClosed, 0.4, s % 4 === 2 ? 0.26 : 0.12]);
  if (opts.open) for (const s of [2, 6, 10, 14]) drums.push([at + s, DRUM.hatOpen, 1.2, 0.22]);
  if (opts.crash) drums.push([at, DRUM.crash, 6, 0.48]);
  if (opts.fill) for (const s of [12, 13, 14, 15]) drums.push([at + s, DRUM.snare, 0.5, 0.46 + (s - 12) * 0.08]);
}

const VERSE: Note[][] = [
  [
    [2, 71, 1, 0.74],
    [3, 71, 1, 0.68],
    [4, 71, 2, 0.74],
    [6, 72, 2, 0.72],
    [8, 74, 3, 0.8],
    [12, 71, 2, 0.7],
  ],
  [
    [2, 72, 1, 0.72],
    [3, 72, 1, 0.68],
    [4, 72, 2, 0.74],
    [6, 71, 2, 0.7],
    [8, 67, 4, 0.74],
    [12, 69, 2, 0.7],
  ],
  [
    [2, 71, 1, 0.74],
    [3, 71, 1, 0.68],
    [4, 71, 2, 0.74],
    [6, 74, 2, 0.76],
    [8, 76, 3, 0.82],
    [12, 74, 2, 0.74],
    [14, 71, 2, 0.7],
  ],
  [
    [0, 69, 4, 0.74],
    [6, 66, 2, 0.68],
    [8, 69, 6, 0.72],
  ],
];

const PRE: Note[][] = [
  [
    [0, 71, 2, 0.74],
    [2, 71, 2, 0.7],
    [4, 72, 2, 0.74],
    [6, 74, 4, 0.8],
    [12, 71, 4, 0.72],
  ],
  [
    [0, 74, 2, 0.76],
    [2, 74, 2, 0.72],
    [4, 76, 2, 0.78],
    [6, 78, 4, 0.84],
    [12, 74, 4, 0.74],
  ],
  [
    [0, 76, 2, 0.78],
    [2, 76, 2, 0.74],
    [4, 79, 2, 0.82],
    [6, 76, 4, 0.8],
    [12, 72, 4, 0.74],
  ],
  [
    [0, 74, 4, 0.8],
    [4, 78, 4, 0.86],
    [8, 81, 7, 0.92],
  ],
];

const HOOK_A: Note[] = [
  [0, 79, 2, 0.9],
  [2, 79, 1, 0.82],
  [3, 76, 3, 0.86],
  [6, 79, 2, 0.88],
  [8, 81, 4, 0.94],
  [12, 79, 2, 0.84],
  [14, 76, 2, 0.8],
];
const HOOK_B: Note[] = [
  [0, 78, 2, 0.88],
  [2, 78, 1, 0.8],
  [3, 74, 3, 0.84],
  [6, 78, 2, 0.86],
  [8, 81, 6, 0.94],
  [14, 78, 2, 0.8],
];
const CHORUS: Note[][] = [
  HOOK_A,
  HOOK_B,
  [
    [0, 79, 3, 0.9],
    [3, 78, 1, 0.8],
    [4, 74, 4, 0.84],
    [8, 71, 2, 0.8],
    [10, 74, 2, 0.82],
    [12, 79, 4, 0.9],
  ],
  [
    [0, 76, 6, 0.88],
    [6, 74, 2, 0.8],
    [8, 71, 8, 0.84],
  ],
  HOOK_A,
  HOOK_B,
  [
    [0, 79, 2, 0.88],
    [2, 81, 2, 0.9],
    [4, 83, 4, 0.96],
    [8, 81, 2, 0.88],
    [10, 79, 2, 0.84],
    [12, 78, 4, 0.86],
  ],
  [
    [0, 79, 10, 0.92],
    [12, 74, 2, 0.8],
    [14, 78, 2, 0.84],
  ],
];

// Bell sparkle answering the hook in its gaps (G major pentatonic).
function bellAnswer(bar: number, chord: Chord, strength: number) {
  const [a, b, c] = chord[1].map((p) => p + 24);
  sparkle.push(
    [bar * 16 + 12, a, 1, 0.42 * strength],
    [bar * 16 + 13, b, 1, 0.44 * strength],
    [bar * 16 + 14, c, 1, 0.46 * strength],
    [bar * 16 + 15, a + 12, 1, 0.48 * strength],
  );
}

// Intro: guitar alone, then the string stabs tease the chorus.
[G, C, Em, D].forEach((chord, i) => {
  strum(i, chord, 0.9);
  if (i >= 2) stringStabs(i, chord, 0.7);
  if (i >= 1) for (const s of [0, 4, 8, 12]) drums.push([i * 16 + s, DRUM.kick, 1, 0.5 + i * 0.08]);
  if (i === 3) for (const s of [12, 13, 14, 15]) drums.push([i * 16 + s, DRUM.clap, 0.5, 0.36 + (s - 12) * 0.08]);
});

const LOOP = 4;
let bar = LOOP;

function verseBars(second: boolean) {
  verse.forEach((chord, i) => {
    dancePop(bar, { fill: i === 7 && second });
    strum(bar, chord, 1);
    bass.push([bar * 16, chord[0], 6, 0.66], [bar * 16 + 8, chord[0], 6, 0.6]);
    phrase(lead, bar, VERSE[i % 4], second ? 0.95 : 1);
    if (second) stringStabs(bar, chord, 0.45, [6, 14]);
    bar++;
  });
}

function preBars() {
  pre.forEach((chord, i) => {
    const at = bar * 16;
    drums.push([at, DRUM.kick, 1, 0.8], [at + 8, DRUM.kick, 1, 0.7], [at + 8, DRUM.clap, 1, 0.5]);
    for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.4, 0.14]);
    strum(bar, chord, 0.75);
    strings.push(...chord[1].map((pitch): Note => [at, pitch + 12, 15.5, 0.3 + i * 0.05]));
    bass.push([at, chord[0], 15, 0.64]);
    phrase(lead, bar, PRE[i]);
    if (i === 3) for (let s = 8; s < 16; s++) drums.push([at + s, DRUM.snare, 0.5, 0.3 + (s - 8) * 0.07]);
    bar++;
  });
}

function chorusBars() {
  chorus.forEach((chord, i) => {
    dancePop(bar, { open: true, crash: i === 0 || i === 4, fill: i === 7 });
    stringStabs(bar, chord, 1);
    octaveBass(bar, chord[0], 1);
    strum(bar, chord, 0.6);
    phrase(lead, bar, CHORUS[i]);
    if (i % 2 === 1) bellAnswer(bar, chord, 1);
    bar++;
  });
}

verseBars(false);
preBars();
chorusBars();
verseBars(true);
chorusBars();

// Stop-time tag: everything hits on 1 and the "and" of 2, then the guitar and kick run back to the verse.
[C, D, G, D].forEach((chord, i) => {
  const at = bar * 16;
  stringStabs(bar, chord, 1, [0, 6]);
  bass.push([at, chord[0], 1.6, 0.8], [at + 6, chord[0], 1.6, 0.74]);
  drums.push(
    [at, DRUM.kick, 1, 0.9],
    [at, DRUM.crash, 3, 0.4],
    [at + 6, DRUM.kick, 1, 0.8],
    [at + 6, DRUM.clap, 1, 0.6],
  );
  if (i === 3) {
    strum(bar, chord, 0.9);
    for (const s of [8, 12]) drums.push([at + s, DRUM.kick, 1, 0.7]);
    for (const s of [12, 13, 14, 15]) drums.push([at + s, DRUM.clap, 0.5, 0.4 + (s - 12) * 0.08]);
  }
  phrase(
    lead,
    bar,
    i < 3
      ? [
          [0, chord[1][2] + 12, 1, 0.84],
          [6, chord[1][1] + 12, 1, 0.8],
        ]
      : [[0, 79, 4, 0.84]],
  );
  bar++;
});

export default {
  title: "Pocket Dial Crush",
  bpm: 120,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.42,
  echoBeats: 0.5,
  echoFeedback: 0.18,
  parts: [
    { inst: "square", notes: lead, vol: 0.6, pan: 0.04, reverb: 0.16, echo: 0.12 },
    { inst: "bell", notes: sparkle, vol: 0.28, pan: 0.38, reverb: 0.32, echo: 0.24 },
    { inst: "guitar", notes: guitar, vol: 0.4, pan: -0.32, reverb: 0.14 },
    { inst: "strings_stacc", notes: stabs, vol: 0.36, pan: 0.2, reverb: 0.2 },
    { inst: "strings", notes: strings, vol: 0.22, pan: 0.25, reverb: 0.38 },
    { inst: "bass", notes: bass, vol: 0.54, pan: 0, reverb: 0.03 },
    { inst: "drums", notes: drums, vol: 0.68, pan: 0, reverb: 0.08 },
  ],
} satisfies Song;
