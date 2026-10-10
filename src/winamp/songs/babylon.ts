import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Babylon (16-Bit Remake)" — D phrygian, 96 BPM half-time, an imagined desert-palace groove after Taylor Swift's
 * #4. An oud-style plucked 16th riff (guitar) circles the ♭2, hand drums answer, a sub bass sways underneath and
 * an eerie whistle floats the hook; the chorus crowns it with choir, brass hits and a strings ostinato. The bridge
 * is the throne room: organ, timpani and a bell counting the hour, then the groove returns.
 * Verse Dm Dm B♭ C; chorus B♭ C Dm Dm / B♭ C Gm A; bridge Dm E♭ F Gm.
 * Intro (4 bars) → loop of 44 bars (≈110 s): vamp (8) → verse (8) → chorus (8) → throne-room bridge (8)
 * → build (4) → chorus (8).
 */
type Chord = [bass: number, pad: number[], stab: number[]];
const Dm: Chord = [38, [50, 53, 57], [62, 65, 69]];
const Eb: Chord = [39, [51, 55, 58], [63, 67, 70]];
const F: Chord = [41, [53, 57, 60], [65, 69, 72]];
const Gm: Chord = [43, [55, 58, 62], [67, 70, 74]];
const Bb: Chord = [46, [58, 62, 65], [70, 74, 77]];
const C: Chord = [48, [55, 60, 64], [67, 72, 75]];
const Am: Chord = [45, [57, 60, 64], [69, 72, 76]];
const verse = [Dm, Dm, Bb, C, Dm, Dm, Bb, C];
const chorus = [Bb, C, Dm, Dm, Bb, C, Gm, Am];

const whistle: Note[] = [];
const oud: Note[] = [];
const stabs: Note[] = [];
const strings: Note[] = [];
const choir: Note[] = [];
const organ: Note[] = [];
const timpani: Note[] = [];
const bell: Note[] = [];
const bass: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// The oud riff: a circle in 16ths around the phrygian ♭2, transposed to each chord's root.
const RIFF: Note[] = [
  [0, 62, 1],
  [1, 65, 1],
  [2, 62, 1],
  [3, 63, 1],
  [4, 62, 1],
  [5, 67, 1],
  [6, 65, 1],
  [7, 62, 1],
  [8, 62, 1],
  [9, 65, 1],
  [10, 70, 1],
  [11, 69, 1],
  [12, 67, 1],
  [13, 65, 1],
  [14, 63, 1],
  [15, 62, 1],
];

function swayBass(bar: number, root: number, strength: number) {
  const at = bar * 16;
  bass.push([at, root, 5, 0.8 * strength]);
  bass.push([at + 6, root + 3, 2, 0.56 * strength]);
  bass.push([at + 8, root, 5, 0.72 * strength]);
  bass.push([at + 14, root + 5, 2, 0.5 * strength]);
}

// Hand-drum kit: half-time kick and congas talking, tambourine 8ths, woodblock like distant workers.
function hands(bar: number, opts: { full?: boolean; strength?: number } = {}) {
  const at = bar * 16;
  const strength = opts.strength ?? 1;
  drums.push([at, DRUM.kick, 1, 0.84 * strength], [at + 10, DRUM.kick, 1, 0.6 * strength]);
  drums.push(
    [at + 3, DRUM.conga, 0.8, 0.5 * strength],
    [at + 6, DRUM.conga, 0.8, 0.4 * strength],
    [at + 11, DRUM.bongo, 0.6, 0.42 * strength],
    [at + 14, DRUM.conga, 0.8, 0.48 * strength],
  );
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.tambourine, 0.8, (s % 4 ? 0.14 : 0.2) * strength]);
  if (opts.full) {
    for (const s of [4, 12]) drums.push([at + s, DRUM.snare2, 0.8, 0.5 * strength]);
    drums.push([at + 7, DRUM.bongo, 0.5, 0.36 * strength]);
  }
}

const hook: Note[][] = [
  [
    [0, 74, 3, 0.82],
    [4, 72, 2, 0.7],
    [6, 70, 2, 0.72],
    [8, 74, 3, 0.84],
    [12, 77, 2, 0.84],
    [14, 75, 2, 0.7],
  ],
  [
    [0, 74, 2, 0.8],
    [2, 75, 1, 0.66],
    [4, 77, 4, 0.86],
    [8, 74, 2, 0.74],
    [10, 72, 2, 0.7],
    [12, 70, 4, 0.72],
  ],
  [
    [0, 69, 2, 0.76],
    [2, 70, 1, 0.66],
    [4, 72, 4, 0.82],
    [8, 77, 2, 0.82],
    [10, 75, 2, 0.74],
    [12, 74, 4, 0.78],
  ],
  [
    [0, 72, 3, 0.8],
    [4, 74, 2, 0.74],
    [6, 75, 2, 0.72],
    [8, 77, 6, 0.86],
    [14, 74, 2, 0.74],
  ],
];

// Intro: a desert wind — tambourine, breath of pad, the oud tuning up, one bell far away.
for (let i = 0; i < 4; i++) {
  for (let s = 0; s < 16; s += 2) drums.push([i * 16 + s, DRUM.tambourine, 0.8, s % 4 ? 0.1 : 0.16]);
  choir.push([i * 16, 50, 15.5, 0.22], [i * 16, 57, 15.5, 0.2]);
  if (i >= 2) phrase(oud, i, RIFF.slice(0, 8), 0.5);
  if (i === 3) bell.push([i * 16 + 12, 74, 4, 0.4]);
}

const LOOP = 4;
let bar = LOOP;

// Vamp: the groove alone — oud, hands, sub bass — no lead yet.
verse.slice(0, 4).forEach((chord, i) => {
  phrase(
    oud,
    bar,
    RIFF.map(([s, p, l, v]) => [s, p + (chord[0] - 38), l, (v ?? 0.8) * 0.9] as Note),
  );
  hands(bar, { full: i >= 2 });
  swayBass(bar, chord[0], 1);
  bar++;
});

// Verse: the whistle hook floats in over strings.
verse.forEach((chord, i) => {
  phrase(
    oud,
    bar,
    RIFF.map(([s, p, l, v]) => [s, p + (chord[0] - 38), l, (v ?? 0.8) * 0.85] as Note),
  );
  hands(bar, { full: true });
  swayBass(bar, chord[0], 1);
  phrase(whistle, bar, hook[i % 4]);
  strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch + 12, 15.5, 0.3]));
  if (i === 0) drums.push([bar * 16, DRUM.crash, 5, 0.4]);
  bar++;
});

// Chorus: crowned — choir block chords, brass hits on the answer, strings ostinato in 8ths.
function chorusBars(big: boolean) {
  chorus.forEach((chord, i) => {
    phrase(
      oud,
      bar,
      RIFF.map(([s, p, l, v]) => [s, p + (chord[0] - 38), l, (v ?? 0.8) * 0.8] as Note),
    );
    hands(bar, { full: true });
    swayBass(bar, chord[0], 1);
    choir.push(...chord[1].map((pitch): Note => [bar * 16, pitch + 12, 15.5, big ? 0.5 : 0.42]));
    for (const s of [0, 10]) for (const pitch of chord[2]) stabs.push([bar * 16 + s, pitch, 2, 0.7]);
    for (let s = 2; s < 16; s += 2) strings.push([bar * 16 + s, chord[1][(s / 2) % 3] + 12, 1.8, 0.3]);
    if (big) phrase(whistle, bar, hook[i % 4], 0.85);
    if (i === 0) drums.push([bar * 16, DRUM.crash, 5, 0.5]);
    if (i === 7) for (const s of [12, 14]) drums.push([bar * 16 + s, DRUM.timpaniRoll, 1, 0.5]);
    bar++;
  });
}
chorusBars(false);

// Throne-room bridge: organ chords, timpani heartbeat, the bell counting; the whistle pleads above.
const throne = [Dm, Eb, F, Gm, Dm, Eb, F, Gm];
throne.forEach((chord, i) => {
  const at = bar * 16;
  organ.push(...chord[1].map((pitch): Note => [at, pitch, 15.5, 0.4]));
  timpani.push([at, chord[0], 3, 0.7], [at + 10, chord[0], 2, 0.5]);
  bass.push([at, chord[0], 15.5, 0.5]);
  if (i % 2 === 0) bell.push([at + 8, chord[2][2], 4, 0.4]);
  if (i >= 2) drums.push([at + 4, DRUM.snare2, 0.8, 0.3], [at + 12, DRUM.snare2, 0.8, 0.34]);
  if (i >= 4)
    phrase(
      oud,
      bar,
      RIFF.slice(8).map(([s, p, l, v]) => [s, p + (chord[0] - 38), l, (v ?? 0.8) * 0.7] as Note),
    );
  if (i >= 6) phrase(whistle, bar, hook[i - 6], 0.7);
  bar++;
});

// Build: roll out of the throne room.
chorus.slice(0, 4).forEach((chord, i) => {
  const spacing = i < 2 ? 2 : 1;
  for (let s = 0; s < 16; s += spacing) drums.push([bar * 16 + s, DRUM.snare2, 0.45, Math.min(0.9, 0.34 + i * 0.15)]);
  hands(bar, { strength: i >= 2 ? 1 : 0.6 });
  swayBass(bar, chord[0], 0.8);
  bar++;
});

chorusBars(true);

export default {
  title: "Babylon (16-Bit Remake)",
  bpm: 96,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.6,
  echoBeats: 0.75,
  echoFeedback: 0.3,
  parts: [
    { inst: "whistle", notes: whistle, vol: 0.5, pan: 0.1, reverb: 0.35, echo: 0.3 },
    { inst: "guitar", notes: oud, vol: 0.48, pan: -0.2, reverb: 0.22 },
    { inst: "brass", notes: stabs, vol: 0.22, pan: -0.25, reverb: 0.25 },
    { inst: "strings", notes: strings, vol: 0.2, pan: 0.3, reverb: 0.4 },
    { inst: "choir", notes: choir, vol: 0.24, pan: 0.25, reverb: 0.45 },
    { inst: "organ", notes: organ, vol: 0.32, pan: -0.3, reverb: 0.35 },
    { inst: "timpani", notes: timpani, vol: 0.6, pan: 0.15, reverb: 0.3 },
    { inst: "bell", notes: bell, vol: 0.24, pan: 0.35, reverb: 0.45, echo: 0.3 },
    { inst: "bass", notes: bass, vol: 0.56, pan: 0, reverb: 0.05 },
    { inst: "drums", notes: drums, vol: 0.66, pan: 0, reverb: 0.14 },
  ],
} satisfies Song;
