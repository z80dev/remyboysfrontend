import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Dracula (16-Bit Remake)" — F minor, 116 BPM, an imagined gothic-disco after Tame Impala & JENNIE's #10.
 * A coffin lid creaks open onto a funk bassline: four-on-the-floor, open hats on the offbeats, disco strings
 * sawing 16ths, a whistle lead swooping like a theremin through the echo. The bridge is the castle organ with
 * timpani and choir — cape over the face — then a roll out of the crypt into the biggest mirror-ball chorus.
 * Vamp Fm Fm B♭ C; chorus B♭ C Fm Fm / B♭ C Fm Gm; castle Db E♭ Fm Fm.
 * Intro (4 bars) → loop of 44 bars (≈91 s): groove (8) → verse A (8) → chorus (8) → castle bridge (8)
 * → build (4) → chorus double (8).
 */
type Chord = [bass: number, pad: number[], disco: number[]];
const Fm: Chord = [41, [53, 56, 60], [65, 68, 72]];
const Bb: Chord = [46, [58, 62, 65], [70, 74, 77]];
const C7: Chord = [48, [55, 60, 64], [67, 72, 75]];
const Db: Chord = [49, [56, 61, 65], [68, 73, 77]];
const Gm: Chord = [43, [55, 58, 62], [67, 70, 74]];
const vamp = [Fm, Fm, Bb, C7];
const chorusLine = [Bb, C7, Fm, Fm, Bb, C7, Fm, Gm];
const castle = [Db, Db, Fm, Fm, Db, Db, C7, C7];

const lead: Note[] = [];
const strings: Note[] = [];
const choir: Note[] = [];
const organ: Note[] = [];
const timpani: Note[] = [];
const bell: Note[] = [];
const bass: Note[] = [];
const pad: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// Funk bassline: syncopated with a ghost-note hiccup, walks to the next root at the bar line.
const FUNK: Note[] = [
  [0, 0, 1.5],
  [3, 0, 0.8],
  [6, 3, 1],
  [8, 0, 1.5],
  [11, 5, 0.8],
  [12, 3, 1],
  [14, -2, 1.8],
];
function funkBass(bar: number, root: number, strength: number) {
  for (const [step, interval, length] of FUNK) {
    bass.push([bar * 16 + step, root + interval, length, (step === 0 || step === 8 ? 0.84 : 0.62) * strength]);
  }
}

// Disco kit: four-on-the-floor, clap, open hats on the "and", ride in the choruses.
function discoKit(bar: number, opts: { crash?: boolean; fill?: boolean; strength?: number } = {}) {
  const at = bar * 16;
  const strength = opts.strength ?? 1;
  for (let s = 0; s < 16; s += 4) drums.push([at + s, DRUM.kick, 1, 0.92 * strength]);
  for (const s of [4, 12]) drums.push([at + s, DRUM.clap, 1, 0.66 * strength]);
  for (const s of [2, 6, 10, 14]) drums.push([at + s, DRUM.hatOpen, 1.1, 0.34 * strength]);
  for (const s of [0, 4, 8, 12]) drums.push([at + s, DRUM.hatPedal, 0.5, 0.24 * strength]);
  if (opts.crash) drums.push([at, DRUM.crash, 5, 0.55 * strength]);
  if (opts.fill)
    drums.push(
      [at + 12, DRUM.tomHigh, 0.5, 0.5],
      [at + 13, DRUM.tomMid, 0.5, 0.52],
      [at + 14, DRUM.snare, 0.5, 0.56],
      [at + 15, DRUM.tomLow, 0.5, 0.6],
    );
}

// Disco strings: 16ths sawing the chord, octave pops on the top.
function sawStrings(bar: number, chord: Chord, strength: number) {
  for (let s = 0; s < 16; s++) {
    strings.push([bar * 16 + s, chord[2][s % 3], 1.2, (s % 4 === 0 ? 0.42 : 0.3) * strength]);
  }
  strings.push([bar * 16 + 14, chord[2][2] + 12, 1.6, 0.36 * strength]);
}

// Theremin contours: long swoops with wide intervals — the whistle's fast vibrato does the wobble.
const hookA: Note[][] = [
  [
    [0, 77, 4, 0.82],
    [4, 80, 2, 0.74],
    [6, 79, 2, 0.72],
    [8, 77, 6, 0.84],
    [14, 72, 2, 0.68],
  ],
  [
    [0, 75, 3, 0.78],
    [3, 77, 1, 0.66],
    [4, 80, 4, 0.82],
    [8, 84, 4, 0.86],
    [12, 82, 2, 0.76],
    [14, 80, 2, 0.74],
  ],
  [
    [0, 82, 2, 0.8],
    [2, 80, 2, 0.76],
    [4, 79, 2, 0.76],
    [6, 77, 2, 0.74],
    [8, 82, 6, 0.84],
    [14, 84, 2, 0.78],
  ],
  [
    [0, 85, 3, 0.84],
    [3, 84, 1, 0.72],
    [4, 82, 4, 0.8],
    [8, 77, 6, 0.82],
    [14, 75, 2, 0.7],
  ],
];
const hookB: Note[][] = [
  [
    [0, 89, 4, 0.88],
    [4, 87, 2, 0.78],
    [6, 85, 2, 0.78],
    [8, 82, 6, 0.86],
    [14, 80, 2, 0.74],
  ],
  [
    [0, 87, 3, 0.84],
    [3, 85, 1, 0.74],
    [4, 84, 2, 0.78],
    [6, 87, 2, 0.8],
    [8, 89, 6, 0.88],
    [14, 87, 2, 0.78],
  ],
  [
    [0, 84, 2, 0.8],
    [2, 85, 2, 0.78],
    [4, 87, 2, 0.8],
    [6, 89, 2, 0.82],
    [8, 92, 6, 0.9],
    [14, 89, 2, 0.78],
  ],
  [
    [0, 87, 4, 0.84],
    [4, 85, 2, 0.76],
    [6, 84, 2, 0.76],
    [8, 82, 4, 0.8],
    [12, 80, 2, 0.72],
    [14, 77, 2, 0.74],
  ],
];

// Intro: the crypt opens — bell tolls, an organ breath, then the heartbeat finds four-on-the-floor.
for (let i = 0; i < 4; i++) {
  bell.push([i * 16 + 4, 53, 5, 0.44]);
  pad.push([i * 16, 41, 15.5, 0.3], [i * 16, 48, 15.5, 0.26]);
  if (i >= 2) {
    discoKit(i, { strength: 0.8 });
    funkBass(i, Fm[0], 0.85);
  }
  if (i === 3) for (let s = 12; s < 16; s++) drums.push([i * 16 + s, DRUM.shaker, 0.5, 0.2 + (s - 12) * 0.06]);
}

const LOOP = 4;
let bar = LOOP;

// Groove: the band locks in — strings ride the 16ths, no lead yet, the whistle is still waking up.
vamp.forEach((chord, i) => {
  discoKit(bar, { crash: i === 0 });
  funkBass(bar, chord[0], 1);
  sawStrings(bar, chord, 0.9);
  if (i >= 2) choir.push(...chord[1].map((pitch): Note => [bar * 16, pitch + 12, 15.5, 0.3]));
  if (i === 3)
    phrase(lead, bar, [
      [12, 77, 2, 0.6],
      [14, 80, 2, 0.64],
    ]);
  bar++;
});

// Verse A: the theremin swoops in.
vamp.forEach((chord, i) => {
  discoKit(bar, { crash: i === 0 });
  funkBass(bar, chord[0], 1);
  sawStrings(bar, chord, 0.9);
  phrase(lead, bar, hookA[i]);
  if (i % 2 === 1) bell.push([bar * 16 + 8, chord[2][2], 4, 0.36]);
  bar++;
});
vamp.forEach((chord, i) => {
  discoKit(bar, { fill: i === 3 });
  funkBass(bar, chord[0], 1);
  sawStrings(bar, chord, 0.9);
  phrase(lead, bar, hookB[i]);
  choir.push(...chord[1].map((pitch): Note => [bar * 16, pitch + 12, 15.5, 0.28]));
  bar++;
});

// Chorus: mirror ball — strings up, choir doubles the lead a 6th below, bell accents.
function chorusBars(big: boolean) {
  chorusLine.forEach((chord, i) => {
    discoKit(bar, { crash: i % 4 === 0, fill: i === 7 });
    funkBass(bar, chord[0], 1);
    sawStrings(bar, chord, 1);
    phrase(lead, bar, hookA[i % 4]);
    if (big) phrase(lead, bar, hookA[i % 4], 0.5, -9);
    choir.push(...chord[1].map((pitch): Note => [bar * 16, pitch + 12, 15.5, big ? 0.42 : 0.34]));
    for (const s of [0, 10]) bell.push([bar * 16 + s, chord[2][s ? 1 : 2], 2.5, 0.32]);
    bar++;
  });
}
chorusBars(false);

// Castle bridge: the organ takes it home — timpani heartbeats, choir chanting, cape drama in 3/3rds of F minor.
castle.forEach((chord, i) => {
  const at = bar * 16;
  organ.push(...chord[1].map((pitch): Note => [at, pitch, 15.5, 0.42]));
  choir.push(...chord[1].map((pitch): Note => [at, pitch + 12, 15.5, 0.4]));
  timpani.push([at, chord[0], 3, 0.72], [at + 8, chord[0], 2, 0.5], [at + 12, chord[0] + 7, 3, 0.6]);
  bass.push([at, chord[0], 15.5, 0.55]);
  if (i % 2 === 0) bell.push([at + 4, chord[2][2], 5, 0.4]);
  if (i >= 4) {
    discoKit(bar, { strength: 0.7 });
    funkBass(bar, chord[0], 0.7);
    phrase(lead, bar, hookB[i - 4], 0.8);
  }
  if (i === 7) for (let s = 12; s < 16; s++) drums.push([at + s, DRUM.timpaniRoll, 0.8, 0.4 + (s - 12) * 0.1]);
  bar++;
});

// Build: roll out of the crypt.
chorusLine.slice(0, 4).forEach((chord, i) => {
  const spacing = i < 2 ? 2 : 1;
  for (let s = 0; s < 16; s += spacing) drums.push([bar * 16 + s, DRUM.snare2, 0.45, Math.min(0.9, 0.36 + i * 0.14)]);
  discoKit(bar, { strength: i >= 2 ? 1 : 0.75 });
  funkBass(bar, chord[0], 0.8 + i * 0.05);
  if (i >= 2) sawStrings(bar, chord, 0.8);
  bar++;
});

chorusBars(true);

export default {
  title: "Dracula (16-Bit Remake)",
  bpm: 116,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.6,
  echoBeats: 0.75,
  echoFeedback: 0.28,
  parts: [
    { inst: "whistle", notes: lead, vol: 0.5, pan: 0.08, reverb: 0.35, echo: 0.32 },
    { inst: "strings_stacc", notes: strings, vol: 0.26, pan: 0.3, reverb: 0.25 },
    { inst: "choir", notes: choir, vol: 0.24, pan: -0.3, reverb: 0.45 },
    { inst: "organ", notes: organ, vol: 0.32, pan: -0.2, reverb: 0.4 },
    { inst: "timpani", notes: timpani, vol: 0.6, pan: 0.15, reverb: 0.3 },
    { inst: "bell", notes: bell, vol: 0.24, pan: 0.35, reverb: 0.45, echo: 0.3 },
    { inst: "bass_slap", notes: bass, vol: 0.56, pan: 0, reverb: 0.04 },
    { inst: "pad", notes: pad, vol: 0.26, pan: 0.1, reverb: 0.4 },
    { inst: "drums", notes: drums, vol: 0.7, pan: 0, reverb: 0.09 },
  ],
} satisfies Song;
