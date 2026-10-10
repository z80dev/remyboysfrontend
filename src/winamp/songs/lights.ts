import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Lights (16-Bit Remake)" — A minor, 118 BPM, an imagined neon-grid electropop after Ellie Goulding's #5.
 * A pulsing 8th synth and an airy pad under a high, weightless voice (whistle); the chorus opens the floor —
 * four-on-the-floor, a 16th arp, strings and the voice doubled in 6ths. The strobe section gates the pluck
 * between kick hits, the breakdown is just bells and echo in the dark, and the build sweeps back up.
 * Verse Am F C G; chorus C G Am F / C G F F; strobe Am F C G.
 * Intro (4 bars) → loop of 40 bars (≈81 s): verse (8) → pre (4) → chorus (8) → verse′ (8) → chorus (8)
 * → strobe breakdown and build (4).
 */
type Chord = [bass: number, pad: number[], arp: number[]];
const Am: Chord = [45, [57, 60, 64], [69, 72, 76, 81]];
const F: Chord = [41, [53, 57, 60], [65, 69, 72, 77]];
const C: Chord = [48, [55, 60, 64], [67, 72, 76, 79]];
const G: Chord = [43, [55, 59, 62], [67, 71, 74, 79]];
const verse = [Am, F, C, G, Am, F, C, G];
const chorus = [C, G, Am, F, C, G, F, F];

const lead: Note[] = [];
const double: Note[] = [];
const arp: Note[] = [];
const pluck: Note[] = [];
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

// The pulse: gated pluck 8ths, breathing with the kick.
function pulse(bar: number, chord: Chord, strength: number, gated = false) {
  for (let s = 0; s < 16; s += 2) {
    if (gated && (s === 6 || s === 14)) continue;
    pluck.push([bar * 16 + s, chord[2][(s / 2) % 4], 1.4, (s % 4 ? 0.36 : 0.52) * strength]);
  }
}

// Chorus arp: 16ths rolling up.
function roll(bar: number, chord: Chord, strength: number) {
  for (let s = 0; s < 16; s++)
    arp.push([bar * 16 + s, chord[2][s % 4] + (s >= 8 ? 12 : 0), 1.2, (s % 4 ? 0.26 : 0.38) * strength]);
}

function synthBass(bar: number, root: number, strength: number, offbeat = false) {
  if (offbeat) {
    for (const s of [2, 6, 10, 14]) bass.push([bar * 16 + s, root, 1.7, 0.8 * strength]);
  } else {
    for (let s = 0; s < 16; s += 2) bass.push([bar * 16 + s, root, 1.6, (s % 4 ? 0.52 : 0.74) * strength]);
  }
}

function floorKit(bar: number, opts: { clap?: boolean; crash?: boolean; fill?: boolean; strength?: number } = {}) {
  const at = bar * 16;
  const strength = opts.strength ?? 1;
  for (let s = 0; s < 16; s += 4) drums.push([at + s, DRUM.kick, 1, 0.88 * strength]);
  if (opts.clap) for (const s of [4, 12]) drums.push([at + s, DRUM.clap, 1, 0.6 * strength]);
  for (const s of [2, 6, 10, 14]) drums.push([at + s, DRUM.hatOpen, 1.1, 0.3 * strength]);
  for (const s of [0, 4, 8, 12]) drums.push([at + s, DRUM.hatPedal, 0.5, 0.2 * strength]);
  if (opts.crash) drums.push([at, DRUM.crash, 5, 0.45 * strength]);
  if (opts.fill) drums.push([at + 12, DRUM.snare, 0.5, 0.5], [at + 14, DRUM.snare, 0.5, 0.56]);
}

const verseMelody: Note[][] = [
  [
    [0, 81, 4, 0.72],
    [6, 79, 2, 0.62],
    [8, 76, 6, 0.72],
    [14, 74, 2, 0.6],
  ],
  [
    [0, 77, 4, 0.7],
    [4, 79, 2, 0.64],
    [6, 81, 2, 0.66],
    [8, 84, 6, 0.76],
    [14, 81, 2, 0.64],
  ],
  [
    [0, 79, 3, 0.72],
    [3, 76, 1, 0.6],
    [4, 72, 4, 0.68],
    [8, 76, 4, 0.7],
    [12, 79, 2, 0.66],
    [14, 81, 2, 0.68],
  ],
  [
    [0, 83, 4, 0.74],
    [4, 81, 2, 0.68],
    [6, 79, 2, 0.66],
    [8, 74, 6, 0.7],
    [14, 76, 2, 0.62],
  ],
];
const chorusMelody: Note[][] = [
  [
    [0, 84, 4, 0.86],
    [4, 88, 2, 0.8],
    [6, 86, 2, 0.78],
    [8, 84, 6, 0.88],
    [14, 81, 2, 0.74],
  ],
  [
    [0, 79, 4, 0.84],
    [4, 83, 2, 0.78],
    [6, 81, 2, 0.76],
    [8, 79, 6, 0.86],
    [14, 76, 2, 0.72],
  ],
  [
    [0, 81, 4, 0.84],
    [4, 84, 2, 0.8],
    [6, 86, 2, 0.8],
    [8, 88, 6, 0.9],
    [14, 86, 2, 0.76],
  ],
  [
    [0, 77, 4, 0.82],
    [4, 81, 2, 0.78],
    [6, 84, 2, 0.8],
    [8, 89, 6, 0.9],
    [14, 86, 2, 0.74],
  ],
  [
    [0, 84, 4, 0.86],
    [4, 88, 2, 0.8],
    [6, 86, 2, 0.78],
    [8, 84, 6, 0.88],
    [14, 81, 2, 0.74],
  ],
  [
    [0, 79, 4, 0.84],
    [4, 83, 2, 0.78],
    [6, 81, 2, 0.76],
    [8, 79, 6, 0.86],
    [14, 76, 2, 0.72],
  ],
  [
    [0, 77, 3, 0.8],
    [3, 76, 1, 0.68],
    [4, 74, 4, 0.78],
    [8, 76, 4, 0.78],
    [12, 77, 2, 0.74],
    [14, 79, 2, 0.76],
  ],
  [
    [0, 81, 6, 0.84],
    [8, 79, 4, 0.78],
    [12, 76, 4, 0.74],
  ],
];

// Intro: the grid hums awake — pad, pulse, one bell per bar.
for (let i = 0; i < 4; i++) {
  pulse(i, verse[i], 0.7);
  pad.push(...verse[i][1].map((pitch): Note => [i * 16, pitch, 15.5, 0.24]));
  bell.push([i * 16 + 8, verse[i][2][3], 3, 0.34]);
  if (i >= 2) floorKit(i, { strength: 0.75 });
}

const LOOP = 4;
let bar = LOOP;

function verseBars(second: boolean) {
  verse.forEach((chord, i) => {
    floorKit(bar, { clap: i >= 4 });
    pulse(bar, chord, 1);
    synthBass(bar, chord[0], 1);
    phrase(lead, bar, verseMelody[i % 4], second ? 0.9 : 1);
    if (second) phrase(double, bar, verseMelody[i % 4], 0.5, -4);
    if (i >= 4) strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.2]));
    bar++;
  });
}

// Pre: drums thin to kick+pulse, strings rise, the voice climbs the dark.
function preBars() {
  for (let i = 0; i < 4; i++) {
    const chord = [Am, F, C, G][i];
    const at = bar * 16;
    for (let s = 0; s < 16; s += 4) drums.push([at + s, DRUM.kick, 1, 0.8]);
    pulse(bar, chord, 0.8);
    synthBass(bar, chord[0], 0.7);
    strings.push(...chord[1].map((pitch): Note => [at, pitch, 15.5, 0.24 + i * 0.03]));
    const climb: Note[][] = [
      [
        [0, 76, 4, 0.66],
        [6, 79, 2, 0.64],
        [8, 81, 6, 0.7],
      ],
      [
        [0, 79, 4, 0.7],
        [6, 81, 2, 0.68],
        [8, 84, 6, 0.74],
      ],
      [
        [0, 81, 4, 0.72],
        [4, 84, 4, 0.76],
        [8, 86, 4, 0.78],
        [12, 88, 4, 0.8],
      ],
      [
        [0, 88, 8, 0.82],
        [12, 86, 2, 0.74],
        [14, 84, 2, 0.72],
      ],
    ];
    phrase(lead, bar, climb[i]);
    if (i === 3) for (const s of [12, 14]) drums.push([at + s, DRUM.snare, 0.5, 0.42 + (s - 12) * 0.08]);
    bar++;
  }
}

function chorusBars(big: boolean) {
  chorus.forEach((chord, i) => {
    floorKit(bar, { clap: true, crash: i === 0 || i === 4, fill: i === 7 });
    roll(bar, chord, 1);
    synthBass(bar, chord[0], 1, true);
    phrase(lead, bar, chorusMelody[i]);
    phrase(double, bar, chorusMelody[i], big ? 0.55 : 0.45, -9);
    strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.28]));
    bar++;
  });
}

verseBars(false);
preBars();
chorusBars(false);
verseBars(true);
chorusBars(true);

// Strobe breakdown and build: the pluck gated between kick hits, bells alone in the dark, then the sweep back.
for (let i = 0; i < 4; i++) {
  const chord = verse[i];
  floorKit(bar, { strength: i >= 2 ? 0.9 : 0.7 });
  pulse(bar, chord, 1, true);
  synthBass(bar, chord[0], 0.8, i >= 2);
  bell.push([bar * 16 + 4, chord[2][2], 2.5, 0.34], [bar * 16 + 12, chord[2][3], 2.5, 0.3]);
  if (i === 3) {
    for (const s of [12, 13, 14, 15]) drums.push([bar * 16 + s, DRUM.snare, 0.5, 0.4 + (s - 12) * 0.11]);
    strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.36]));
  }
  bar++;
}

export default {
  title: "Lights (16-Bit Remake)",
  bpm: 118,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.6,
  echoBeats: 0.75,
  echoFeedback: 0.3,
  parts: [
    { inst: "whistle", notes: lead, vol: 0.5, pan: 0.08, reverb: 0.35, echo: 0.28 },
    { inst: "flute", notes: double, vol: 0.46, pan: -0.22, reverb: 0.35, echo: 0.2 },
    { inst: "square50", notes: arp, vol: 0.26, pan: 0.3, reverb: 0.14, echo: 0.2 },
    { inst: "square50", notes: pluck, vol: 0.3, pan: -0.3, reverb: 0.12, echo: 0.16 },
    { inst: "strings", notes: strings, vol: 0.2, pan: 0.25, reverb: 0.42 },
    { inst: "pad", notes: pad, vol: 0.24, pan: 0, reverb: 0.4 },
    { inst: "bell", notes: bell, vol: 0.26, pan: 0.35, reverb: 0.45, echo: 0.35 },
    { inst: "bass", notes: bass, vol: 0.56, pan: 0, reverb: 0.03 },
    { inst: "drums", notes: drums, vol: 0.68, pan: 0, reverb: 0.08 },
  ],
} satisfies Song;
