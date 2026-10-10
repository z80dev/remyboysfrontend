import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Patient Zero (16-Bit Remake)" — F♯ minor, 126 BPM, a dark synth-pop outbreak imagined from Taylor Swift's #1.
 * The conceit is the title: the 16th-note ostinato is the pathogen. It surfaces in one bell, spreads to the pluck,
 * then the bass, the strings and the choir until every part is infected; a piano "quarantine" isolates the hook
 * before the final, double-strength wave. Verse F♯m D A E; chorus F♯m D A E / F♯m D E C♯.
 * Intro (8 bars) → loop of 44 bars (≈84 s): pulse (8) → chorus (8) → infected drop, ostinato everywhere (8)
 * → quarantine piano (8) → rebuild (4) → final chorus (8).
 */
type Chord = [bass: number, stab: number[], pad: number[]];
const Fsm: Chord = [42, [66, 69, 73, 78], [54, 57, 61]];
const D: Chord = [38, [66, 69, 74, 78], [50, 54, 57]];
const A: Chord = [45, [69, 73, 76, 81], [49, 52, 57]];
const E: Chord = [40, [68, 71, 76, 80], [52, 56, 59]];
const Csm: Chord = [37, [61, 64, 68, 73], [49, 52, 56]];
const verse = [Fsm, D, A, E, Fsm, D, A, E];
const chorus = [Fsm, D, A, E, Fsm, D, E, Csm];

const lead: Note[] = [];
const double: Note[] = [];
const bell: Note[] = [];
const pluck: Note[] = [];
const stabs: Note[] = [];
const strings: Note[] = [];
const choir: Note[] = [];
const piano: Note[] = [];
const bass: Note[] = [];
const pad: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.92, velocity * strength]);
  }
}

// The pathogen: a 16th-note arpeggio that works over every chord of the song.
const PATHOGEN = [0, 2, 1, 3, 2, 1, 2, 0, 1, 2, 3, 1, 0, 2, 1, 2];
function infect(bar: number, chord: Chord, strength: number, octave = 0) {
  for (let s = 0; s < 16; s++) {
    pluck.push([bar * 16 + s, chord[1][PATHOGEN[s]] + octave, 0.7, (s % 4 === 0 ? 0.68 : 0.5) * strength]);
  }
}

function stab(bar: number, chord: Chord, steps: number[], strength: number) {
  for (const s of steps) for (const pitch of chord[1]) stabs.push([bar * 16 + s, pitch, 1.5, 0.74 * strength]);
}

function pulseBass(bar: number, root: number, strength: number, drive = false) {
  const at = bar * 16;
  if (drive) {
    for (const s of [2, 6, 10, 14]) bass.push([at + s, root + (s === 14 ? 12 : 0), 1.7, 0.84 * strength]);
  } else {
    for (let s = 0; s < 16; s += 2) bass.push([at + s, root, 1, (s % 4 ? 0.5 : 0.74) * strength]);
  }
}

function beat(bar: number, opts: { clap?: boolean; open?: boolean; strength?: number } = {}) {
  const at = bar * 16;
  const strength = opts.strength ?? 1;
  for (let s = 0; s < 16; s += 4) drums.push([at + s, DRUM.kick, 1, 0.94 * strength]);
  if (opts.clap) for (const s of [4, 12]) drums.push([at + s, DRUM.clap, 1, 0.74 * strength]);
  for (const s of [2, 6, 10, 14]) {
    drums.push([at + s, opts.open ? DRUM.hatOpen : DRUM.hatClosed, opts.open ? 1.2 : 0.6, 0.4 * strength]);
  }
}

function sustain(target: Note[], bar: number, tones: number[], velocity: number, transpose = 0) {
  target.push(...tones.map((pitch): Note => [bar * 16, pitch + transpose, 15.6, velocity]));
}

// Verse vocal lines (F♯5 = 78), dark and clipped.
const verseMelody: Note[][] = [
  [
    [0, 78, 2, 0.8],
    [2, 81, 2, 0.76],
    [4, 83, 2, 0.84],
    [6, 81, 1, 0.7],
    [7, 78, 1, 0.68],
    [8, 81, 3, 0.78],
    [12, 78, 2, 0.7],
    [14, 76, 2, 0.72],
  ],
  [
    [0, 78, 2, 0.8],
    [2, 81, 2, 0.76],
    [4, 85, 3, 0.9],
    [7, 83, 1, 0.72],
    [8, 81, 2, 0.76],
    [10, 78, 2, 0.72],
    [12, 74, 3, 0.74],
  ],
  [
    [0, 81, 2, 0.82],
    [2, 83, 2, 0.8],
    [4, 85, 2, 0.86],
    [6, 83, 1, 0.72],
    [7, 81, 1, 0.7],
    [8, 83, 3, 0.84],
    [12, 86, 2, 0.86],
    [14, 85, 2, 0.8],
  ],
  [
    [0, 83, 4, 0.86],
    [4, 81, 2, 0.76],
    [6, 78, 2, 0.74],
    [8, 81, 4, 0.8],
    [12, 83, 2, 0.78],
    [14, 85, 2, 0.82],
  ],
  [
    [0, 78, 2, 0.8],
    [2, 81, 2, 0.76],
    [4, 83, 2, 0.84],
    [6, 81, 1, 0.7],
    [7, 78, 1, 0.68],
    [8, 81, 3, 0.78],
    [12, 78, 2, 0.7],
    [14, 76, 2, 0.72],
  ],
  [
    [0, 78, 2, 0.8],
    [2, 81, 2, 0.76],
    [4, 85, 3, 0.9],
    [7, 83, 1, 0.72],
    [8, 81, 2, 0.76],
    [10, 78, 2, 0.72],
    [12, 74, 3, 0.74],
  ],
  [
    [0, 85, 2, 0.88],
    [2, 83, 2, 0.82],
    [4, 81, 2, 0.8],
    [6, 78, 2, 0.76],
    [8, 81, 4, 0.82],
    [12, 83, 2, 0.78],
    [14, 85, 2, 0.8],
  ],
  [
    [0, 83, 2, 0.84],
    [2, 81, 2, 0.8],
    [4, 78, 2, 0.82],
    [6, 76, 2, 0.76],
    [8, 78, 6, 0.84],
    [14, 74, 2, 0.74],
  ],
];
const chorusMelody: Note[][] = [
  [
    [0, 78, 1.5, 0.9],
    [2, 78, 1.5, 0.84],
    [4, 81, 2, 0.88],
    [6, 83, 2, 0.86],
    [8, 85, 4, 0.94],
    [12, 83, 2, 0.84],
    [14, 81, 2, 0.86],
  ],
  [
    [0, 78, 2, 0.9],
    [2, 81, 2, 0.86],
    [4, 83, 3, 0.9],
    [7, 85, 1, 0.84],
    [8, 86, 4, 0.94],
    [12, 83, 2, 0.84],
    [14, 81, 2, 0.86],
  ],
  [
    [0, 81, 2, 0.88],
    [2, 83, 2, 0.86],
    [4, 85, 2, 0.9],
    [6, 86, 2, 0.88],
    [8, 88, 4, 0.96],
    [12, 85, 2, 0.86],
    [14, 83, 2, 0.84],
  ],
  [
    [0, 81, 3, 0.88],
    [3, 78, 2, 0.8],
    [6, 76, 2, 0.78],
    [8, 78, 6, 0.86],
    [14, 80, 2, 0.78],
  ],
  [
    [0, 78, 1.5, 0.9],
    [2, 78, 1.5, 0.84],
    [4, 81, 2, 0.88],
    [6, 83, 2, 0.86],
    [8, 85, 4, 0.94],
    [12, 83, 2, 0.84],
    [14, 81, 2, 0.86],
  ],
  [
    [0, 78, 2, 0.9],
    [2, 81, 2, 0.86],
    [4, 83, 3, 0.9],
    [7, 85, 1, 0.84],
    [8, 86, 4, 0.94],
    [12, 83, 2, 0.84],
    [14, 81, 2, 0.86],
  ],
  [
    [0, 85, 2, 0.9],
    [2, 86, 2, 0.88],
    [4, 88, 4, 0.96],
    [8, 90, 4, 0.94],
    [12, 88, 2, 0.86],
    [14, 86, 2, 0.84],
  ],
  [
    [0, 85, 2, 0.88],
    [2, 83, 2, 0.84],
    [4, 81, 2, 0.82],
    [6, 80, 2, 0.8],
    [8, 78, 4, 0.86],
    [12, 76, 2, 0.78],
    [14, 73, 2, 0.8],
  ],
];

// Intro: patient zero hums alone — one bell, a heartbeat kick, a pad; the pluck catches it at bar 4.
for (let i = 0; i < 8; i++) {
  const chord = verse[i];
  drums.push([i * 16, DRUM.kick, 1, 0.5 + i * 0.05]);
  if (i >= 2) for (const s of [8, 10, 12, 14]) drums.push([i * 16 + s, DRUM.hatClosed, 0.5, 0.16 + i * 0.015]);
  if (i >= 4) infect(i, chord, 0.35 + (i - 4) * 0.08);
  sustain(pad, i, chord[2], 0.3 + i * 0.015);
  bell.push([i * 16 + 8, chord[1][2] + 12, 3, 0.4 + i * 0.02], [i * 16 + 14, chord[1][1] + 12, 2, 0.34]);
  if (i === 6 || i === 7)
    for (const s of [12, 13, 14, 15]) drums.push([i * 16 + s, DRUM.snare, 0.5, 0.3 + (s - 12) * 0.09]);
}
phrase(
  bell,
  6,
  chorusMelody[6].map(([s, p, l, v]) => [s, p - 12, l, (v ?? 0.8) * 0.6] as Note),
  1,
  12,
);

const LOOP = 8;
let bar = LOOP;

// Pulse: clipped square lead over heartbeat kick; the pluck keeps infecting, stabs surface every other bar.
verse.forEach((chord, i) => {
  beat(bar, { clap: i >= 4, strength: 0.9 });
  pulseBass(bar, chord[0], i >= 2 ? 0.9 : 0.6);
  infect(bar, chord, 0.5 + i * 0.05);
  phrase(lead, bar, verseMelody[i]);
  sustain(strings, bar, chord[2], 0.34, 12);
  if (i % 2) stab(bar, chord, [0], 0.6);
  if (i === 0) drums.push([bar * 16, DRUM.crash, 6, 0.55]);
  bar++;
});

function chorusBars(big: boolean) {
  for (let i = 0; i < 8; i++) {
    const chord = chorus[i];
    beat(bar, { clap: true, open: true });
    pulseBass(bar, chord[0], 1, true);
    infect(bar, chord, big ? 0.8 : 0.7);
    stab(bar, chord, [0, 6, 10], 1);
    phrase(lead, bar, chorusMelody[i]);
    if (big) phrase(double, bar, chorusMelody[i], 0.6, -12);
    sustain(strings, bar, chord[2], 0.42, 12);
    sustain(choir, bar, chord[2], big ? 0.5 : 0.42);
    if (i % 4 === 0) drums.push([bar * 16, DRUM.crash, 6, 0.7]);
    if (i === 7) for (const s of [12, 13, 14, 15]) drums.push([bar * 16 + s, DRUM.snare, 0.5, 0.4 + (s - 12) * 0.1]);
    bar++;
  }
}
chorusBars(false);

// Infected drop: the ostinato has spread — pluck double-tracked in octaves, organ-style stabs on every stab.
chorus.forEach((chord, i) => {
  beat(bar, { clap: true, open: true });
  pulseBass(bar, chord[0], 1, true);
  infect(bar, chord, 0.95);
  infect(bar, chord, 0.6, -12);
  stab(bar, chord, [0, 3, 6, 10, 12], 0.9);
  sustain(choir, bar, chord[2], 0.46);
  phrase(double, bar, chorusMelody[i], 0.5, -12);
  bell.push([bar * 16 + 8, chord[1][3], 2, 0.4]);
  if (i % 4 === 0) drums.push([bar * 16, DRUM.crash, 6, 0.6]);
  bar++;
});

// Quarantine: drums and synth out; the hook isolated on piano with strings and the original bell.
chorus.forEach((chord, i) => {
  phrase(piano, bar, chorusMelody[i], 0.74, -12);
  sustain(strings, bar, chord[2], 0.5, 12);
  bell.push([bar * 16 + 8, chord[1][2] + 12, 3, 0.36], [bar * 16 + 14, chord[1][1] + 12, 2, 0.3]);
  if (i === 0) drums.push([bar * 16, DRUM.crash, 8, 0.5]);
  if (i >= 6) drums.push([bar * 16 + 4, DRUM.rim, 1, 0.3], [bar * 16 + 12, DRUM.rim, 1, 0.3]);
  bar++;
});

// Rebuild: snare roll doubles, the ostinato and kick fight their way back.
chorus.slice(0, 4).forEach((chord, i) => {
  const at = bar * 16;
  const spacing = i < 2 ? 2 : 1;
  for (let s = 0; s < 16; s += spacing)
    drums.push([at + s, DRUM.snare2, 0.45, Math.min(0.92, 0.34 + (i * 16 + s) / 90)]);
  infect(bar, chord, 0.4 + i * 0.12);
  sustain(strings, bar, chord[2], 0.36 + i * 0.03, 12);
  if (i >= 2) for (let s = 0; s < 16; s += 4) drums.push([at + s, DRUM.kick, 1, 0.88]);
  bar++;
});
phrase(lead, bar - 1, [
  [12, 78, 2, 0.8],
  [14, 81, 2, 0.84],
]);

chorusBars(true);

export default {
  title: "Patient Zero (16-Bit Remake)",
  bpm: 126,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.55,
  echoBeats: 0.75,
  echoFeedback: 0.26,
  parts: [
    { inst: "saw_lead", notes: lead, vol: 0.6, pan: 0.05, reverb: 0.2, echo: 0.2 },
    { inst: "violin", notes: double, vol: 0.3, pan: -0.25, reverb: 0.3 },
    { inst: "bell", notes: bell, vol: 0.3, pan: 0.35, reverb: 0.4, echo: 0.3 },
    { inst: "square50", notes: pluck, vol: 0.26, pan: 0.3, reverb: 0.14, echo: 0.26 },
    { inst: "brass", notes: stabs, vol: 0.22, pan: -0.2, reverb: 0.22 },
    { inst: "strings", notes: strings, vol: 0.2, pan: -0.35, reverb: 0.4 },
    { inst: "choir", notes: choir, vol: 0.24, pan: 0.35, reverb: 0.45 },
    { inst: "piano", notes: piano, vol: 0.6, pan: 0.1, reverb: 0.35, echo: 0.22 },
    { inst: "bass_saw", notes: bass, vol: 0.55, pan: 0, reverb: 0.03 },
    { inst: "pad", notes: pad, vol: 0.28, pan: 0, reverb: 0.1 },
    { inst: "drums", notes: drums, vol: 0.68, pan: 0, reverb: 0.07 },
  ],
} satisfies Song;
