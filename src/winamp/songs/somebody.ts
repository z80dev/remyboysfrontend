import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Two-Chord Goodbye" — D minor, 128 BPM, an original art-pop breakup duet in the
 * style of Gotye & Kimbra's year-ender (original melodies; only the genre, groove and arrangement arc are
 * borrowed). Built on whisper-to-shout contrast: a two-chord Dm–C vamp with a woody marimba ostinato, nylon plucks
 * and a dry rim/shaker kit under a low, conversational voice (ocarina). The second voice (flute) answers the same
 * tune an octave up while the bass enters. Then the chorus breaks wide open: the first voice belts an octave higher
 * (saw lead) over the full kit, strings and choir, and the second chorus becomes a duet. After that the room
 * empties to the ostinato alone.
 * Verse Dm C Dm C Dm C B♭ C; chorus Dm B♭ F C Dm B♭ Gm A.
 * Intro (4 bars) → loop of 40 bars (≈75 s): verse (8) → answer verse (8) → lift (2) → chorus (8) → duet chorus (8)
 * → empty room (4) → breath (2).
 */
type Chord = [bass: number, arp: number[], pad: number[]];
const Dm: Chord = [38, [50, 53, 57, 62], [50, 53, 57]];
const C: Chord = [36, [48, 52, 55, 60], [48, 52, 55]];
const Bb: Chord = [34, [46, 50, 53, 58], [50, 53, 58]];
const F: Chord = [41, [53, 57, 60, 65], [53, 57, 60]];
const Gm: Chord = [43, [50, 55, 58, 62], [50, 55, 58]];
const A: Chord = [45, [49, 52, 57, 61], [49, 52, 57]];
const verse = [Dm, C, Dm, C, Dm, C, Bb, C];
const chorus = [Dm, Bb, F, C, Dm, Bb, Gm, A];

const voice1: Note[] = [];
const voice2: Note[] = [];
const belt: Note[] = [];
const marimba: Note[] = [];
const plucks: Note[] = [];
const strings: Note[] = [];
const choir: Note[] = [];
const bass: Note[] = [];
const pad: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// Marimba ostinato over the chord's upper tones: a lopsided 3+3+2 figure that never quite resolves.
const OSTINATO: [step: number, tone: number, vel: number][] = [
  [0, 3, 0.62],
  [3, 2, 0.48],
  [6, 3, 0.56],
  [8, 1, 0.54],
  [10, 2, 0.5],
  [12, 3, 0.58],
  [14, 0, 0.46],
];
function ostinato(bar: number, chord: Chord, strength: number) {
  for (const [s, tone, vel] of OSTINATO) marimba.push([bar * 16 + s, chord[1][tone] + 12, 2, vel * strength]);
}

// Nylon plucks: root on 1, upper tones on the off-beats, a lot of air.
function pluck(bar: number, chord: Chord, strength: number) {
  const at = bar * 16;
  plucks.push([at, chord[1][0], 6, 0.5 * strength]);
  for (const [s, tone] of [
    [4, 2],
    [6, 3],
    [10, 1],
    [12, 2],
  ] as const)
    plucks.push([at + s, chord[1][tone], 3, 0.34 * strength]);
}

function roundBass(bar: number, root: number, strength: number) {
  bass.push([bar * 16, root, 6, 0.74 * strength]);
  bass.push([bar * 16 + 6, root, 2, 0.46 * strength]);
  bass.push([bar * 16 + 10, root + 12, 2, 0.42 * strength]);
  bass.push([bar * 16 + 12, root, 4, 0.6 * strength]);
}

// Dry verse kit: kick on 1 and the "and" of 2, rim on 2 and 4, a soft 16th shaker.
function dryKit(bar: number, opts: { answer?: boolean } = {}) {
  const at = bar * 16;
  drums.push([at, DRUM.kick, 1, 0.7], [at + 6, DRUM.kick, 1, 0.5]);
  for (const s of [4, 12]) drums.push([at + s, DRUM.rim, 1, opts.answer ? 0.5 : 0.42]);
  for (let s = 0; s < 16; s++) drums.push([at + s, DRUM.shaker, 0.4, s % 2 ? 0.05 : 0.09]);
  if (opts.answer) drums.push([at + 14, DRUM.kick, 1, 0.42]);
}

// Chorus kit: everything opens up.
function bigKit(bar: number, opts: { crash?: boolean; fill?: boolean } = {}) {
  const at = bar * 16;
  drums.push([at, DRUM.kick, 1, 0.92], [at + 6, DRUM.kick, 1, 0.66], [at + 10, DRUM.kick, 1, 0.78]);
  for (const s of [4, 12]) drums.push([at + s, DRUM.snare, 1, 0.74], [at + s, DRUM.clap, 1, 0.3]);
  for (const s of [2, 6, 10, 14]) drums.push([at + s, DRUM.hatOpen, 1.4, 0.2]);
  for (const s of [0, 4, 8, 12]) drums.push([at + s, DRUM.hatClosed, 0.5, 0.16]);
  if (opts.crash) drums.push([at, DRUM.crash, 6, 0.5]);
  if (opts.fill)
    drums.push(
      [at + 12, DRUM.tomHigh, 0.5, 0.5],
      [at + 13, DRUM.tomMid, 0.5, 0.54],
      [at + 14, DRUM.tomLow, 0.5, 0.58],
      [at + 15, DRUM.tomLow, 0.5, 0.62],
    );
}

// The low voice: talky, repeated notes, phrases that start after the downbeat.
const VERSE: Note[][] = [
  [
    [2, 62, 2, 0.66],
    [4, 62, 2, 0.6],
    [6, 65, 2, 0.66],
    [8, 64, 3, 0.64],
    [12, 62, 2, 0.6],
  ],
  [
    [2, 60, 2, 0.62],
    [4, 60, 2, 0.58],
    [6, 64, 2, 0.64],
    [8, 62, 6, 0.64],
  ],
  [
    [2, 62, 2, 0.64],
    [4, 65, 2, 0.64],
    [6, 67, 2, 0.68],
    [8, 69, 3, 0.72],
    [12, 67, 2, 0.64],
    [14, 65, 2, 0.6],
  ],
  [
    [0, 64, 4, 0.66],
    [4, 62, 2, 0.6],
    [8, 60, 6, 0.62],
  ],
  [
    [2, 62, 2, 0.66],
    [4, 62, 2, 0.6],
    [6, 65, 2, 0.66],
    [8, 64, 3, 0.64],
    [12, 62, 2, 0.6],
  ],
  [
    [2, 60, 2, 0.62],
    [4, 64, 2, 0.62],
    [6, 67, 2, 0.68],
    [8, 64, 6, 0.64],
  ],
  [
    [2, 65, 2, 0.66],
    [4, 65, 2, 0.62],
    [6, 62, 2, 0.62],
    [8, 65, 4, 0.68],
    [12, 62, 2, 0.6],
  ],
  [
    [0, 64, 4, 0.66],
    [6, 67, 2, 0.64],
    [8, 64, 7, 0.62],
  ],
];

// The belted chorus: long held notes an octave above where the verse lived.
const CHORUS: Note[][] = [
  [
    [0, 69, 6, 0.9],
    [6, 70, 2, 0.8],
    [8, 69, 4, 0.86],
    [12, 65, 4, 0.78],
  ],
  [
    [0, 65, 2, 0.78],
    [2, 67, 2, 0.8],
    [4, 69, 4, 0.86],
    [8, 70, 6, 0.9],
    [14, 69, 2, 0.78],
  ],
  [
    [0, 72, 6, 0.94],
    [6, 70, 2, 0.82],
    [8, 69, 4, 0.86],
    [12, 67, 4, 0.8],
  ],
  [
    [0, 67, 4, 0.84],
    [4, 65, 2, 0.78],
    [6, 64, 2, 0.78],
    [8, 67, 8, 0.86],
  ],
  [
    [0, 69, 6, 0.9],
    [6, 72, 2, 0.86],
    [8, 74, 6, 0.96],
    [14, 72, 2, 0.82],
  ],
  [
    [0, 70, 4, 0.88],
    [4, 69, 2, 0.82],
    [6, 67, 2, 0.8],
    [8, 65, 8, 0.84],
  ],
  [
    [0, 67, 4, 0.84],
    [4, 70, 4, 0.88],
    [8, 69, 4, 0.86],
    [12, 67, 4, 0.82],
  ],
  [
    [0, 64, 6, 0.86],
    [6, 65, 2, 0.8],
    [8, 61, 8, 0.84],
  ],
];

// The second voice's counter-line in the duet chorus: answers in the gaps, a third above.
const COUNTER: Note[][] = [
  [[12, 74, 4, 0.62]],
  [
    [12, 74, 2, 0.6],
    [14, 77, 2, 0.62],
  ],
  [[12, 76, 4, 0.64]],
  [
    [12, 76, 2, 0.6],
    [14, 72, 2, 0.58],
  ],
  [[12, 77, 4, 0.66]],
  [
    [12, 74, 2, 0.62],
    [14, 72, 2, 0.6],
  ],
  [[12, 74, 4, 0.64]],
  [
    [8, 69, 4, 0.62],
    [12, 73, 4, 0.66],
  ],
];

// Intro: the ostinato alone, then the plucks.
for (let i = 0; i < 4; i++) {
  ostinato(i, verse[i], i < 2 ? 0.85 : 1);
  if (i >= 2) pluck(i, verse[i], 0.8);
  if (i === 3) for (let s = 8; s < 16; s++) drums.push([i * 16 + s, DRUM.shaker, 0.4, 0.04 + (s - 8) * 0.012]);
}

const LOOP = 4;
let bar = LOOP;

// Verse: the low voice, almost spoken.
verse.forEach((chord, i) => {
  ostinato(bar, chord, 0.9);
  pluck(bar, chord, 1);
  dryKit(bar);
  phrase(voice1, bar, VERSE[i]);
  bar++;
});

// Answer verse: the second voice takes the same tune an octave up; the bass walks in under her.
verse.forEach((chord, i) => {
  ostinato(bar, chord, 0.9);
  pluck(bar, chord, 1);
  dryKit(bar, { answer: true });
  roundBass(bar, chord[0], 0.9);
  phrase(voice2, bar, VERSE[i], 0.95, 12);
  pad.push(...chord[2].map((pitch): Note => [bar * 16, pitch, 15.5, 0.14]));
  bar++;
});

// Lift: the kit drops out, strings swell, a tom roll throws it into the chorus.
[Bb, C].forEach((chord, i) => {
  const at = bar * 16;
  ostinato(bar, chord, 0.7);
  strings.push(...chord[2].map((pitch): Note => [at, pitch + 12, 15.5, 0.26 + i * 0.1]));
  bass.push([at, chord[0], 15.5, 0.6]);
  if (i === 1) {
    for (let s = 8; s < 16; s++) drums.push([at + s, DRUM.snare, 0.5, 0.3 + (s - 8) * 0.06]);
    phrase(voice1, bar, [
      [8, 64, 2, 0.7],
      [10, 65, 2, 0.74],
      [12, 67, 4, 0.8],
    ]);
  }
  bar++;
});

function chorusBars(duet: boolean) {
  chorus.forEach((chord, i) => {
    bigKit(bar, { crash: i === 0 || i === 4, fill: i === 7 });
    ostinato(bar, chord, 1);
    pluck(bar, chord, 0.8);
    roundBass(bar, chord[0], 1);
    phrase(belt, bar, CHORUS[i]);
    if (duet) {
      phrase(voice2, bar, CHORUS[i], 0.6, 12);
      phrase(voice2, bar, COUNTER[i], 0.9);
    }
    strings.push(...chord[2].map((pitch): Note => [bar * 16, pitch + 12, 15.5, duet ? 0.4 : 0.32]));
    choir.push(...chord[2].map((pitch): Note => [bar * 16, pitch, 15.5, duet ? 0.42 : 0.3]));
    bar++;
  });
}
chorusBars(false);
chorusBars(true);

// Empty room: only the ostinato and a pad, the second voice humming the verse back from far away.
[Dm, C, Dm, C].forEach((chord, i) => {
  ostinato(bar, chord, 0.8);
  pad.push(...chord[2].map((pitch): Note => [bar * 16, pitch, 15.5, 0.24]));
  phrase(voice2, bar, VERSE[i], 0.45, 12);
  if (i % 2 === 0) drums.push([bar * 16, DRUM.kick, 1, 0.44]);
  bar++;
});

// Breath: the ostinato thins to its first note, then the loop starts the story again.
[Dm, C].forEach((chord, i) => {
  const at = bar * 16;
  marimba.push([at, chord[1][3] + 12, 4, 0.5], [at + 8, chord[1][1] + 12, 4, 0.4]);
  pad.push(...chord[2].map((pitch): Note => [at, pitch, 15.5, 0.2]));
  if (i === 1) for (let s = 8; s < 16; s++) drums.push([at + s, DRUM.shaker, 0.4, 0.04 + (s - 8) * 0.012]);
  bar++;
});

export default {
  title: "Two-Chord Goodbye",
  bpm: 128,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.5,
  echoBeats: 0.75,
  echoFeedback: 0.26,
  parts: [
    { inst: "ocarina", notes: voice1, vol: 0.62, pan: -0.12, reverb: 0.26, echo: 0.14 },
    { inst: "flute", notes: voice2, vol: 0.56, pan: 0.16, reverb: 0.3, echo: 0.16 },
    { inst: "saw_lead", notes: belt, vol: 0.5, pan: 0, reverb: 0.3, echo: 0.18 },
    { inst: "marimba", notes: marimba, vol: 0.5, pan: 0.22, reverb: 0.22, echo: 0.12 },
    { inst: "guitar", notes: plucks, vol: 0.44, pan: -0.32, reverb: 0.18 },
    { inst: "strings", notes: strings, vol: 0.22, pan: 0.3, reverb: 0.42 },
    { inst: "choir", notes: choir, vol: 0.22, pan: -0.2, reverb: 0.45 },
    { inst: "bass_finger", notes: bass, vol: 0.56, pan: 0, reverb: 0.04 },
    { inst: "pad", notes: pad, vol: 0.2, pan: 0, reverb: 0.4 },
    { inst: "drums", notes: drums, vol: 0.64, pan: 0, reverb: 0.1 },
  ],
} satisfies Song;
