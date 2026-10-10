import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Hate That I Made You Love Me (16-Bit Remake)" — C♯ minor, 92 BPM, an imagined smoky confession after Ariana
 * Grande's #8. Finger snaps and a heartbeat sub under rootless electric-piano voicings; a breathy flute sings the
 * confession and a whistle answers it a bar later — what you said, echoing back. Strings swell with regret in the
 * chorus, a bell counts the damage. Half-time R&B in game-ballad clothing.
 * Verse C♯m A E B; pre F♯m G♯ C♯m G♯; chorus A E B C♯m / A E B B.
 * Intro (4 bars) → loop of 40 bars (≈104 s): groove (4) → verse (8) → pre (4) → chorus (8) → verse′ whistle lead (8)
 * → pre (4) → chorus (4, drums out, strings up).
 */
type Chord = [bass: number, voicing: number[]];
const Csm: Chord = [37, [49, 52, 56, 59]];
const A: Chord = [33, [52, 55, 59, 64]];
const E: Chord = [40, [52, 56, 59, 63]];
const B: Chord = [35, [51, 54, 59, 63]];
const Fsm: Chord = [42, [54, 56, 61, 64]];
const Gs: Chord = [44, [56, 60, 63, 66]];
const verse = [Csm, A, E, B, Csm, A, E, B];
const pre = [Fsm, Gs, Csm, Gs];
const chorus = [A, E, B, Csm, A, E, B, B];

const flute: Note[] = [];
const whistle: Note[] = [];
const keys: Note[] = [];
const bell: Note[] = [];
const strings: Note[] = [];
const swell: Note[] = [];
const bass: Note[] = [];
const pad: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// Rootless EP voicings, pushed an 8th late like a held breath.
function comp(bar: number, chord: Chord, strength: number) {
  const [, voicing] = chord;
  voicing.forEach((pitch, i) => keys.push([bar * 16 + i * 0.07, pitch, 7, (0.44 - i * 0.02) * strength]));
  voicing.slice(1).forEach((pitch, i) => keys.push([bar * 16 + 10 + i * 0.07, pitch, 5, (0.36 - i * 0.02) * strength]));
}

function subBass(bar: number, root: number, strength: number) {
  bass.push([bar * 16, root, 9, 0.74 * strength]);
  bass.push([bar * 16 + 10, root + 10, 5, 0.42 * strength]);
}

// Snap kit: kick on 1, snaps on 3, hats ghost the 16ths.
function snapKit(bar: number, opts: { light?: boolean } = {}) {
  const at = bar * 16;
  const strength = opts.light ? 0.75 : 1;
  drums.push([at, DRUM.kick, 1, 0.68 * strength]);
  drums.push([at + 8, DRUM.rim, 1, 0.52 * strength], [at + 8, DRUM.clap, 1, 0.2 * strength]);
  if (!opts.light) drums.push([at + 11, DRUM.kick, 1, 0.4 * strength]);
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.5, 0.1 * strength]);
}

const verseMelody: Note[][] = [
  [
    [0, 73, 3, 0.72],
    [4, 71, 1, 0.6],
    [5, 68, 3, 0.66],
    [8, 73, 2, 0.7],
    [10, 76, 2, 0.7],
    [12, 78, 4, 0.74],
  ],
  [
    [0, 76, 3, 0.72],
    [4, 74, 1, 0.6],
    [5, 71, 3, 0.68],
    [8, 68, 4, 0.68],
    [12, 73, 2, 0.66],
    [14, 71, 2, 0.64],
  ],
  [
    [0, 71, 2, 0.7],
    [2, 73, 2, 0.7],
    [4, 76, 4, 0.74],
    [8, 80, 2, 0.74],
    [10, 78, 2, 0.7],
    [12, 76, 4, 0.72],
  ],
  [
    [0, 78, 4, 0.74],
    [4, 76, 2, 0.68],
    [6, 74, 2, 0.66],
    [8, 71, 6, 0.72],
    [14, 68, 2, 0.62],
  ],
  [
    [0, 73, 3, 0.72],
    [4, 71, 1, 0.6],
    [5, 68, 3, 0.66],
    [8, 73, 2, 0.7],
    [10, 76, 2, 0.7],
    [12, 78, 4, 0.74],
  ],
  [
    [0, 76, 3, 0.72],
    [4, 74, 1, 0.6],
    [5, 71, 3, 0.68],
    [8, 68, 4, 0.68],
    [12, 73, 2, 0.66],
    [14, 71, 2, 0.64],
  ],
  [
    [0, 80, 4, 0.78],
    [4, 78, 2, 0.7],
    [6, 76, 2, 0.7],
    [8, 73, 4, 0.72],
    [12, 71, 2, 0.66],
    [14, 73, 2, 0.68],
  ],
  [
    [0, 74, 4, 0.72],
    [4, 73, 2, 0.66],
    [6, 71, 2, 0.66],
    [8, 68, 6, 0.7],
    [14, 66, 2, 0.6],
  ],
];
const chorusMelody: Note[][] = [
  [
    [0, 76, 4, 0.84],
    [4, 81, 2, 0.78],
    [6, 80, 2, 0.76],
    [8, 76, 6, 0.82],
    [14, 73, 2, 0.7],
  ],
  [
    [0, 80, 3, 0.8],
    [3, 78, 1, 0.68],
    [4, 76, 2, 0.74],
    [6, 73, 2, 0.72],
    [8, 76, 6, 0.8],
    [14, 71, 2, 0.7],
  ],
  [
    [0, 78, 4, 0.8],
    [4, 83, 2, 0.8],
    [6, 85, 2, 0.82],
    [8, 83, 4, 0.84],
    [12, 78, 2, 0.74],
    [14, 76, 2, 0.72],
  ],
  [
    [0, 73, 6, 0.8],
    [8, 76, 2, 0.72],
    [10, 78, 2, 0.72],
    [12, 80, 4, 0.78],
  ],
];

// Intro: the groove settles — EP, snaps, sub, and a pad like a dim room.
for (let i = 0; i < 4; i++) {
  comp(i, verse[i], 0.9);
  subBass(i, verse[i][0], 0.9);
  snapKit(i, { light: i < 2 });
  pad.push(...verse[i][1].map((pitch): Note => [i * 16, pitch, 15.5, 0.26]));
  if (i === 3) bell.push([3 * 16 + 12, 80, 3, 0.32]);
}

const LOOP = 4;
let bar = LOOP;

function verseBars(leadPart: Note[]) {
  verse.forEach((chord, i) => {
    comp(bar, chord, 1);
    subBass(bar, chord[0], 1);
    snapKit(bar);
    phrase(leadPart, bar, verseMelody[i]);
    pad.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.24]));
    if (i % 2 === 1) bell.push([bar * 16 + 12, chord[1][2] + 12, 2.5, 0.3]);
    bar++;
  });
  // The echo answers the last bar — what you said, coming back.
  phrase(whistle, bar - 2, verseMelody[7], 0.5, 12);
}

function preBars() {
  pre.forEach((chord, i) => {
    comp(bar, chord, 1);
    subBass(bar, chord[0], 0.9);
    snapKit(bar);
    strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.24 + i * 0.03]));
    const climb: Note[][] = [
      [
        [0, 69, 2, 0.66],
        [2, 73, 2, 0.7],
        [4, 78, 4, 0.74],
      ],
      [
        [0, 71, 2, 0.7],
        [2, 73, 2, 0.7],
        [4, 78, 4, 0.76],
      ],
      [
        [0, 80, 4, 0.78],
        [4, 78, 2, 0.7],
        [6, 76, 2, 0.72],
      ],
      [
        [0, 78, 4, 0.76],
        [4, 80, 2, 0.74],
        [6, 82, 2, 0.76],
        [8, 83, 6, 0.8],
      ],
    ];
    phrase(flute, bar, climb[i]);
    bar++;
  });
}

function chorusBars(strip: boolean) {
  chorus.forEach((chord, i) => {
    comp(bar, chord, 1);
    subBass(bar, chord[0], 1);
    snapKit(bar, { light: strip });
    phrase(flute, bar, chorusMelody[i % 4]);
    strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, strip ? 0.4 : 0.3]));
    if (!strip) phrase(whistle, bar, chorusMelody[i % 4], 0.45, 12);
    bell.push([bar * 16 + 4, chord[1][3] + 12, 2.5, 0.3]);
    if (i === 0) drums.push([bar * 16, DRUM.crash, 5, 0.32]);
    if (i === 3 || i === 7) for (const pitch of chord[1]) swell.push([bar * 16 + 12, pitch + 12, 4, 0.34]);
    bar++;
  });
}

verseBars(flute);
preBars();
chorusBars(false);
// Verse′: the whistle has the confession now; the flute harmonizes underneath, an octave down memory.
verse.forEach((chord, i) => {
  comp(bar, chord, 1);
  subBass(bar, chord[0], 1);
  snapKit(bar);
  phrase(whistle, bar, verseMelody[i], 0.85, 12);
  if (i >= 4) phrase(flute, bar, verseMelody[i], 0.6, -12);
  strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.22]));
  bar++;
});
phrase(whistle, bar - 2, verseMelody[7], 0.5, 12);

preBars();
// Stripped final chorus: drums almost gone, strings up, the bell tallying.
chorus.slice(0, 4).forEach((chord, i) => {
  comp(bar, chord, 1);
  subBass(bar, chord[0], 1);
  snapKit(bar, { light: true });
  phrase(flute, bar, chorusMelody[i], 0.9);
  strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.44]));
  bell.push([bar * 16, chord[1][3] + 12, 3, 0.34], [bar * 16 + 8, chord[1][2] + 12, 3, 0.3]);
  pad.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.24]));
  bar++;
});

export default {
  title: "Hate That I Made You Love Me (16-Bit Remake)",
  bpm: 92,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.55,
  echoBeats: 0.75,
  echoFeedback: 0.32,
  parts: [
    { inst: "flute", notes: flute, vol: 0.6, pan: 0.12, reverb: 0.32, echo: 0.2 },
    { inst: "whistle", notes: whistle, vol: 0.42, pan: -0.25, reverb: 0.35, echo: 0.3 },
    { inst: "epiano", notes: keys, vol: 0.5, pan: -0.15, reverb: 0.28, echo: 0.08 },
    { inst: "bell", notes: bell, vol: 0.26, pan: 0.35, reverb: 0.4, echo: 0.28 },
    { inst: "strings", notes: strings, vol: 0.2, pan: 0.3, reverb: 0.45 },
    { inst: "strings_stacc", notes: swell, vol: 0.2, pan: 0, reverb: 0.35 },
    { inst: "bass", notes: bass, vol: 0.56, pan: 0, reverb: 0.04 },
    { inst: "pad", notes: pad, vol: 0.22, pan: 0.2, reverb: 0.4 },
    { inst: "drums", notes: drums, vol: 0.56, pan: 0, reverb: 0.12 },
  ],
} satisfies Song;
