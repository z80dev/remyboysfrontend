import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Payphone (16-Bit Remake)" — C♯ minor, 110 BPM, an imagined city pop-rock night after Maroon 5 & Wiz
 * Khalifa's #4. Clean plucked-guitar 16ths and an electric piano lean against a moody pad; the chorus swings
 * the door open — bright stabs and a lead that won't mope. The "rap" bridge is a busy pulse riff over a
 * half-time stomp, and the whole thing ends at a payphone: a music box dials a touch-tone figure, the line
 * clicks, and the loop picks up the receiver again.
 * Verse C♯m A E B; chorus E B C♯m A; bridge F♯m G♯ C♯m B.
 * Intro (4 bars, dial tone) → loop of 40 bars (≈87 s): verse (8) → pre (4) → chorus (8) → verse′ (8)
 * → chorus (8) → pulse bridge (4).
 */
type Chord = [bass: number, arp: number[]];
const Csm: Chord = [37, [49, 52, 56, 61]];
const A: Chord = [45, [49, 52, 57, 61]];
const E: Chord = [40, [47, 52, 56, 59]];
const B: Chord = [47, [47, 51, 54, 59]];
const Fsm: Chord = [42, [46, 49, 54, 57]];
const Gs: Chord = [44, [48, 51, 56, 59]];
const verse = [Csm, A, E, B, Csm, A, E, B];
const chorus = [E, B, Csm, A, E, B, Csm, A];

const lead: Note[] = [];
const pulse: Note[] = [];
const guitar: Note[] = [];
const stabs: Note[] = [];
const keys: Note[] = [];
const pad: Note[] = [];
const dial: Note[] = [];
const bass: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// Clean-guitar 16th comp: plucks in pairs, breathing with the chords.
function comp(bar: number, chord: Chord, strength: number) {
  const pattern = [0, 2, 1, 2, 0, 2, 3, 2, 0, 2, 1, 3, 2, 1, 0, 2];
  for (let s = 0; s < 16; s++) {
    if (s % 4 === 3) continue;
    guitar.push([bar * 16 + s, chord[1][pattern[s]], 1.4, (s % 2 ? 0.3 : 0.42) * strength]);
  }
}

function subBass(bar: number, root: number, strength: number) {
  bass.push([bar * 16, root, 6, 0.76 * strength]);
  bass.push([bar * 16 + 8, root, 4, 0.6 * strength]);
  bass.push([bar * 16 + 14, root + 5, 2, 0.4 * strength]);
}

function popRockKit(bar: number, opts: { clap?: boolean; crash?: boolean; fill?: boolean; half?: boolean } = {}) {
  const at = bar * 16;
  drums.push([at, DRUM.kick, 1, 0.84], [at + (opts.half ? 10 : 8), DRUM.kick, 1, 0.72]);
  for (const s of [4, 12]) drums.push([at + s, DRUM.snare, 1, 0.68]);
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.6, 0.22]);
  if (opts.clap) for (const s of [4, 12]) drums.push([at + s, DRUM.clap, 1, 0.36]);
  if (opts.crash) drums.push([at, DRUM.crash, 4, 0.45]);
  if (opts.fill)
    drums.push(
      [at + 12, DRUM.tomHigh, 0.5, 0.46],
      [at + 13, DRUM.tomMid, 0.5, 0.48],
      [at + 14, DRUM.snare, 0.5, 0.5],
      [at + 15, DRUM.tomLow, 0.5, 0.52],
    );
}

function powerStab(bar: number, root: number, steps: number[], strength: number) {
  for (const s of steps) {
    for (const pitch of [root + 12, root + 19, root + 24]) stabs.push([bar * 16 + s, pitch, 1.8, 0.74 * strength]);
  }
}

const verseMelody: Note[][] = [
  [
    [0, 61, 4, 0.72],
    [6, 63, 2, 0.62],
    [8, 64, 4, 0.74],
    [12, 61, 2, 0.62],
    [14, 59, 2, 0.6],
  ],
  [
    [0, 57, 4, 0.7],
    [4, 59, 2, 0.62],
    [6, 61, 2, 0.64],
    [8, 64, 6, 0.74],
    [14, 63, 2, 0.62],
  ],
  [
    [0, 64, 4, 0.72],
    [4, 66, 2, 0.64],
    [6, 68, 2, 0.66],
    [8, 71, 6, 0.78],
    [14, 68, 2, 0.64],
  ],
  [
    [0, 66, 4, 0.72],
    [4, 64, 2, 0.64],
    [6, 63, 2, 0.62],
    [8, 61, 6, 0.7],
    [14, 59, 2, 0.58],
  ],
];
const chorusMelody: Note[][] = [
  [
    [0, 68, 4, 0.86],
    [4, 71, 2, 0.78],
    [6, 73, 2, 0.8],
    [8, 76, 6, 0.9],
    [14, 73, 2, 0.76],
  ],
  [
    [0, 71, 4, 0.84],
    [4, 73, 2, 0.78],
    [6, 71, 2, 0.76],
    [8, 68, 6, 0.86],
    [14, 66, 2, 0.74],
  ],
  [
    [0, 64, 2, 0.76],
    [2, 66, 2, 0.76],
    [4, 68, 4, 0.84],
    [8, 73, 2, 0.8],
    [10, 71, 2, 0.78],
    [12, 68, 4, 0.82],
  ],
  [
    [0, 69, 4, 0.82],
    [4, 71, 4, 0.82],
    [8, 73, 6, 0.86],
    [14, 71, 2, 0.76],
  ],
];
// The busy "verse" riff for the bridge — the rapper on a pulse wave.
const PULSE: Note[] = [
  [0, 61, 1],
  [1, 61, 1],
  [2, 64, 1],
  [3, 63, 1],
  [4, 61, 1],
  [5, 59, 1],
  [6, 61, 2],
  [8, 56, 1],
  [9, 58, 1],
  [10, 59, 1],
  [11, 61, 1],
  [12, 63, 2],
  [14, 64, 2],
];

// Intro: a payphone wakes up — dial tone hum, touch-tone blips, coins drop, the band picks up.
for (let i = 0; i < 4; i++) {
  pad.push([i * 16, 37, 15.5, 0.22], [i * 16, 44, 15.5, 0.18]);
  if (i === 0) {
    dial.push([0, 73, 1, 0.4], [2, 78, 1, 0.4], [5, 85, 1, 0.4], [8, 73, 1, 0.4], [11, 80, 1, 0.4], [14, 78, 1, 0.4]);
    drums.push([6, DRUM.rim, 1, 0.3], [13, DRUM.rim, 1, 0.3]);
  }
  if (i >= 2) {
    comp(i, verse[i], 0.8);
    popRockKit(i, { crash: i === 2 });
  }
}

const LOOP = 4;
let bar = LOOP;

function verseBars(second: boolean) {
  verse.forEach((chord, i) => {
    popRockKit(bar, { fill: i === 7 });
    comp(bar, chord, 1);
    subBass(bar, chord[0], 1);
    keys.push([bar * 16, chord[1][1], 15.5, 0.32], [bar * 16, chord[1][2], 15.5, 0.3]);
    if (!second || i >= 4) phrase(lead, bar, verseMelody[i % 4], second ? 0.9 : 1);
    if (second) pad.push([bar * 16, chord[0] + 12, 15.5, 0.24]);
    bar++;
  });
}

function preBars() {
  [Fsm, Gs, Csm, B].forEach((chord, i) => {
    popRockKit(bar, { clap: i >= 2 });
    comp(bar, chord, 0.9);
    subBass(bar, chord[0], 0.9);
    const climb: Note[][] = [
      [
        [0, 61, 4, 0.7],
        [6, 63, 2, 0.68],
        [8, 66, 6, 0.74],
      ],
      [
        [0, 63, 4, 0.72],
        [6, 66, 2, 0.7],
        [8, 68, 6, 0.76],
      ],
      [
        [0, 66, 4, 0.74],
        [4, 68, 2, 0.72],
        [6, 69, 2, 0.72],
        [8, 73, 6, 0.8],
      ],
      [
        [0, 71, 4, 0.78],
        [4, 73, 2, 0.76],
        [6, 75, 2, 0.78],
        [8, 76, 6, 0.84],
      ],
    ];
    phrase(lead, bar, climb[i]);
    if (i === 3) for (const s of [12, 14]) drums.push([bar * 16 + s, DRUM.snare, 0.5, 0.4 + (s - 12) * 0.08]);
    bar++;
  });
}

function chorusBars(big: boolean) {
  chorus.forEach((chord, i) => {
    popRockKit(bar, { clap: true, crash: i === 0 || i === 4, fill: i === 7 });
    comp(bar, chord, 1);
    subBass(bar, chord[0], 1);
    powerStab(bar, chord[0], [0, 8], 1);
    phrase(lead, bar, chorusMelody[i % 4]);
    if (big) phrase(lead, bar, chorusMelody[i % 4], 0.5, 12);
    bar++;
  });
}

verseBars(false);
preBars();
chorusBars(false);
verseBars(true);
preBars();
chorusBars(true);

// Pulse bridge: half-time stomp, the riff working overtime; last bar dials the phone again.
const bridgeLine = [Fsm, Gs, Csm, B];
bridgeLine.forEach((chord, i) => {
  const at = bar * 16;
  popRockKit(bar, { half: true, crash: i === 0 });
  subBass(bar, chord[0], 1);
  phrase(
    pulse,
    bar,
    PULSE.map(([s, p, l]) => [s, p + (i === 3 ? 1 : 0), l, 0.72] as Note),
  );
  keys.push([at, chord[1][1], 15.5, 0.3], [at, chord[1][2], 15.5, 0.28]);
  if (i === 3) {
    dial.push([at + 8, 73, 1, 0.4], [at + 9.5, 78, 1, 0.4], [at + 11, 85, 1, 0.4], [at + 13, 73, 1, 0.4]);
    drums.push([at + 15, DRUM.rim, 1, 0.4]);
  }
  bar++;
});

export default {
  title: "Payphone (16-Bit Remake)",
  bpm: 110,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.55,
  echoBeats: 0.5,
  echoFeedback: 0.22,
  parts: [
    { inst: "saw_lead", notes: lead, vol: 0.62, pan: 0.05, reverb: 0.2, echo: 0.18 },
    { inst: "square50", notes: pulse, vol: 0.3, pan: 0.3, reverb: 0.14, echo: 0.12 },
    { inst: "guitar", notes: guitar, vol: 0.48, pan: -0.3, reverb: 0.18 },
    { inst: "brass", notes: stabs, vol: 0.22, pan: -0.15, reverb: 0.2 },
    { inst: "epiano", notes: keys, vol: 0.42, pan: 0.15, reverb: 0.25 },
    { inst: "pad", notes: pad, vol: 0.22, pan: 0.2, reverb: 0.4 },
    { inst: "music_box", notes: dial, vol: 0.34, pan: -0.4, reverb: 0.3, echo: 0.3 },
    { inst: "bass", notes: bass, vol: 0.56, pan: 0, reverb: 0.03 },
    { inst: "drums", notes: drums, vol: 0.68, pan: 0, reverb: 0.1 },
  ],
} satisfies Song;
