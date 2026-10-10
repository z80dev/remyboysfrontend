import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Pink Clouding (16-Bit Remake)" — A major, 74 BPM, an imagined sky-level daydream after Taylor Swift's #5.
 * Everything floats: harp 8th arpeggios rollmaj7 colors, a music box and bell sprinkle like sunlight, strings and
 * a warm pad hold the air up, a breathy flute sings the melody and the kit is barely there (kick, rim, shaker).
 * Long echo turns every phrase into cotton. Verse A E/G♯ F♯m7 Dmaj9; chorus D E C♯m7 F♯m7.
 * Intro (4 bars) → loop of 32 bars (≈104 s): A flute (8) → B music box lead (8) → A′ both (8)
 * → C thin air, harp feature (8).
 */
type Chord = [bass: number, voicing: number[]];
const A: Chord = [45, [57, 61, 64, 71]];
const Eg: Chord = [44, [56, 59, 64, 66]];
const Fsm7: Chord = [42, [54, 57, 61, 64]];
const Dmaj9: Chord = [38, [54, 57, 61, 64]];
const D: Chord = [38, [54, 57, 62, 64]];
const E: Chord = [40, [56, 59, 63, 66]];
const Csm7: Chord = [37, [49, 52, 56, 59]];
const progressionA = [A, Eg, Fsm7, Dmaj9, A, Eg, Fsm7, Dmaj9];
const progressionB = [D, E, Csm7, Fsm7, D, E, Csm7, Fsm7];
const progressionC = [Dmaj9, Fsm7, A, E, Dmaj9, Fsm7, A, Eg];

const flute: Note[] = [];
const box: Note[] = [];
const keys: Note[] = [];
const harp: Note[] = [];
const strings: Note[] = [];
const pad: Note[] = [];
const bell: Note[] = [];
const bass: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// Harp: rolling 8th arpeggio up through the voicing, one note per step like a trickle.
function roll(bar: number, chord: Chord, strength: number) {
  const [root, voicing] = chord;
  const run = [root + 12, ...voicing, voicing[1] + 12, voicing[2] + 12];
  for (let s = 0; s < 8; s++) harp.push([bar * 16 + s * 2, run[s], 2.2, (s % 2 ? 0.32 : 0.44) * strength]);
}

function strum(bar: number, chord: Chord, strength: number) {
  chord[1].forEach((pitch, i) => keys.push([bar * 16 + i * 0.08, pitch, 12, (0.4 - i * 0.02) * strength]));
}

function floatBass(bar: number, root: number, strength: number) {
  bass.push([bar * 16, root, 11, 0.6 * strength]);
  bass.push([bar * 16 + 12, root + 7, 3.5, 0.4 * strength]);
}

// Barely a kit: heartbeat kick, rim on 3, shaker like breeze.
function driftKit(bar: number, strength = 1) {
  const at = bar * 16;
  drums.push([at, DRUM.kick, 1, 0.6 * strength]);
  if (strength > 0.8) drums.push([at + 10, DRUM.kick, 1, 0.4 * strength]);
  drums.push([at + 8, DRUM.rim, 1, 0.34 * strength]);
  for (let s = 0; s < 16; s++) drums.push([at + s, DRUM.shaker, 0.5, (s % 4 ? 0.07 : 0.12) * strength]);
}

const melodyA: Note[][] = [
  [
    [0, 73, 4, 0.7],
    [6, 71, 2, 0.6],
    [8, 69, 6, 0.72],
    [14, 68, 2, 0.58],
  ],
  [
    [0, 66, 4, 0.68],
    [4, 68, 2, 0.62],
    [6, 69, 2, 0.64],
    [8, 71, 6, 0.7],
    [14, 73, 2, 0.64],
  ],
  [
    [0, 73, 3, 0.72],
    [3, 74, 1, 0.6],
    [4, 73, 2, 0.68],
    [8, 69, 4, 0.68],
    [12, 66, 2, 0.6],
    [14, 68, 2, 0.62],
  ],
  [
    [0, 69, 4, 0.7],
    [4, 71, 2, 0.64],
    [6, 73, 2, 0.68],
    [8, 78, 6, 0.78],
    [14, 76, 2, 0.66],
  ],
  [
    [0, 81, 4, 0.78],
    [4, 78, 2, 0.68],
    [6, 76, 2, 0.66],
    [8, 73, 6, 0.74],
    [14, 71, 2, 0.62],
  ],
  [
    [0, 73, 4, 0.7],
    [4, 76, 2, 0.66],
    [6, 78, 2, 0.7],
    [8, 81, 6, 0.8],
    [14, 78, 2, 0.68],
  ],
  [
    [0, 78, 3, 0.74],
    [3, 76, 1, 0.62],
    [4, 73, 4, 0.7],
    [8, 71, 4, 0.66],
    [12, 69, 2, 0.62],
    [14, 68, 2, 0.6],
  ],
  [
    [0, 66, 6, 0.68],
    [8, 69, 4, 0.64],
    [12, 71, 2, 0.62],
    [14, 73, 2, 0.66],
  ],
];
const melodyB: Note[][] = [
  [
    [0, 74, 2, 0.66],
    [2, 78, 2, 0.7],
    [4, 81, 4, 0.78],
    [8, 78, 2, 0.68],
    [10, 76, 2, 0.64],
    [12, 74, 4, 0.66],
  ],
  [
    [0, 76, 4, 0.7],
    [4, 78, 4, 0.72],
    [8, 80, 2, 0.7],
    [10, 78, 2, 0.66],
    [12, 76, 4, 0.66],
  ],
  [
    [0, 76, 2, 0.66],
    [2, 73, 2, 0.62],
    [4, 76, 4, 0.7],
    [8, 80, 2, 0.68],
    [10, 76, 2, 0.64],
    [12, 73, 4, 0.66],
  ],
  [
    [0, 74, 4, 0.66],
    [4, 73, 2, 0.62],
    [6, 71, 2, 0.6],
    [8, 69, 6, 0.66],
    [14, 66, 2, 0.56],
  ],
  [
    [0, 74, 2, 0.66],
    [2, 78, 2, 0.7],
    [4, 81, 4, 0.78],
    [8, 85, 2, 0.8],
    [10, 81, 2, 0.72],
    [12, 78, 4, 0.68],
  ],
  [
    [0, 76, 4, 0.7],
    [4, 78, 4, 0.72],
    [8, 80, 2, 0.7],
    [10, 78, 2, 0.66],
    [12, 81, 4, 0.72],
  ],
  [
    [0, 85, 3, 0.78],
    [3, 81, 1, 0.66],
    [4, 80, 2, 0.7],
    [8, 78, 4, 0.7],
    [12, 76, 2, 0.64],
    [14, 73, 2, 0.64],
  ],
  [
    [0, 74, 8, 0.7],
    [8, 76, 4, 0.66],
    [12, 78, 4, 0.68],
  ],
];

// Intro: harp alone, then the pad blooms.
for (let i = 0; i < 4; i++) {
  roll(i, progressionA[i], i === 0 ? 1 : 0.9);
  if (i >= 1) pad.push(...progressionA[i][1].map((pitch): Note => [i * 16, pitch, 15.5, 0.3]));
  if (i === 3) bell.push([3 * 16 + 12, 85, 3, 0.4], [3 * 16 + 14, 88, 2, 0.34]);
}

const LOOP = 4;
let bar = LOOP;

// A: flute over the full float.
progressionA.forEach((chord, i) => {
  roll(bar, chord, 1);
  strum(bar, chord, 1);
  floatBass(bar, chord[0], 1);
  driftKit(bar);
  phrase(flute, bar, melodyA[i]);
  strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.24]));
  if (i % 2 === 1)
    for (const [s, k] of [
      [2, 3],
      [7, 2],
      [12, 3],
    ])
      bell.push([bar * 16 + s, chord[1][k] + 12, 2.5, 0.36]);
  bar++;
});

// B: chorus lift — music box takes the lead an octave up, flute harmonizes below, strings swell.
progressionB.forEach((chord, i) => {
  roll(bar, chord, 1);
  strum(bar, chord, 0.9);
  floatBass(bar, chord[0], 1);
  driftKit(bar);
  phrase(box, bar, melodyB[i], 0.8, 12);
  if (i >= 4) phrase(flute, bar, melodyB[i], 0.7);
  strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.32]));
  pad.push(...chord[1].map((pitch): Note => [bar * 16, pitch - 12, 15.5, 0.3]));
  if (i === 0) drums.push([bar * 16, DRUM.crash, 6, 0.3]);
  bar++;
});

// A′: both leads, harp doubles to 16ths, bell answers.
progressionA.forEach((chord, i) => {
  roll(bar, chord, 1);
  const [root, voicing] = chord;
  const run = [
    root + 12,
    ...voicing,
    voicing[1] + 12,
    voicing[2] + 12,
    voicing[3] + 12,
    root + 36,
    voicing[1] + 24,
    voicing[2] + 24,
  ];
  for (let s = 0; s < 16; s++) harp.push([bar * 16 + s, run[s % 8], 1.6, s % 2 ? 0.2 : 0.3]);
  strum(bar, chord, 1);
  floatBass(bar, chord[0], 1);
  driftKit(bar);
  phrase(flute, bar, melodyA[i]);
  phrase(
    box,
    bar,
    melodyA[i].map(([s, p, l, v]) => [s + 0.5, p + 12, l, (v ?? 0.8) * 0.5] as Note),
  );
  strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.28]));
  if (i % 2 === 0)
    for (const [s, k] of [
      [4, 2],
      [9, 3],
      [13, 1],
    ])
      bell.push([bar * 16 + s, chord[1][k] + 12, 3, 0.38]);
  bar++;
});

// C: thin air — the floor drops away; harp feature with pad and sprinkles, kit down to a shaker.
progressionC.forEach((chord, i) => {
  roll(bar, chord, 0.9);
  pad.push(...chord[1].map((pitch): Note => [bar * 16, pitch - 12, 15.5, 0.32]));
  bass.push([bar * 16, chord[0], 15.5, 0.4]);
  for (let s = 0; s < 16; s++) drums.push([bar * 16 + s, DRUM.shaker, 0.5, s % 4 ? 0.06 : 0.1]);
  if (i >= 4) {
    driftKit(bar, 0.9);
    phrase(flute, bar, melodyA[i - 4], 0.75);
    strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.2]));
  }
  if (i % 2 === 1)
    for (const [s, k] of [
      [3, 3],
      [8, 2],
      [12, 3],
    ])
      bell.push([bar * 16 + s, chord[1][k] + 24, 2, 0.3]);
  bar++;
});

export default {
  title: "Pink Clouding (16-Bit Remake)",
  bpm: 74,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.7,
  echoBeats: 1.5,
  echoFeedback: 0.35,
  parts: [
    { inst: "flute", notes: flute, vol: 0.62, pan: 0.1, reverb: 0.35, echo: 0.25 },
    { inst: "music_box", notes: box, vol: 0.34, pan: 0.35, reverb: 0.4, echo: 0.3 },
    { inst: "epiano", notes: keys, vol: 0.42, pan: -0.2, reverb: 0.3 },
    { inst: "harp", notes: harp, vol: 0.4, pan: -0.3, reverb: 0.35, echo: 0.15 },
    { inst: "strings", notes: strings, vol: 0.2, pan: 0.3, reverb: 0.45 },
    { inst: "pad", notes: pad, vol: 0.22, pan: -0.25, reverb: 0.4 },
    { inst: "bell", notes: bell, vol: 0.24, pan: 0.4, reverb: 0.45, echo: 0.35 },
    { inst: "bass_finger", notes: bass, vol: 0.5, pan: 0, reverb: 0.06 },
    { inst: "drums", notes: drums, vol: 0.5, pan: 0, reverb: 0.16 },
  ],
} satisfies Song;
