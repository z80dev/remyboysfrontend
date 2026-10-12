import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Light Up the Rooftops" — F major, 92 BPM, an original slow-burn stadium anthem in the style of fun.'s
 * #3 (original melodies; only the genre, tempo, groove and arrangement arc are borrowed). The verse is a sparse
 * piano ballad with a soft kick and rim. The pre-chorus climbs over floor toms. The chorus is the slow, enormous
 * half-time stomp: kick on 1, a huge snare-clap on 3, piano pounding 8ths, brass, timpani and a crowd choir under
 * a soaring trumpet. The bridge is a hand-clap chant before the last, doubled chorus.
 * Verse F Am Dm B♭ F Am B♭ C; pre Dm C B♭ C; chorus F C Dm B♭ F C B♭ C; chant Dm B♭ F C.
 * Intro (4 bars) → loop of 32 bars (≈83 s): verse (8) → pre (4) → chorus (8) → chant (4) → chorus, doubled (8).
 */
type Chord = [bass: number, triad: number[]];
const F: Chord = [41, [53, 57, 60]];
const Am: Chord = [45, [52, 57, 60]];
const Dm: Chord = [38, [50, 53, 57]];
const Bb: Chord = [34, [50, 53, 58]];
const C: Chord = [36, [52, 55, 60]];
const verse = [F, Am, Dm, Bb, F, Am, Bb, C];
const pre = [Dm, C, Bb, C];
const chorus = [F, C, Dm, Bb, F, C, Bb, C];
const chant = [Dm, Bb, F, C];

const voice: Note[] = [];
const trumpet: Note[] = [];
const piano: Note[] = [];
const brass: Note[] = [];
const strings: Note[] = [];
const choir: Note[] = [];
const timpani: Note[] = [];
const bass: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// Ballad piano: low root, half-note chords, a quiet 8th pulse in the right hand.
function balladPiano(bar: number, chord: Chord, strength: number) {
  const at = bar * 16;
  piano.push([at, chord[0] + 12, 8, 0.5 * strength]);
  for (const s of [0, 8]) for (const p of chord[1]) piano.push([at + s, p + 12, 7, 0.4 * strength]);
  for (const s of [4, 6, 12, 14]) piano.push([at + s, chord[1][2] + 12, 1.6, 0.22 * strength]);
}

// Anthem piano: pounding 8th-note block chords.
function poundPiano(bar: number, chord: Chord, strength: number) {
  const at = bar * 16;
  for (let s = 0; s < 16; s += 2) {
    for (const p of chord[1]) piano.push([at + s, p + 12, 1.8, (s % 4 ? 0.36 : 0.48) * strength]);
    piano.push([at + s, chord[0] + 12, 1.8, 0.4 * strength]);
  }
}

// Half-time stomp: kick on 1 (and a pickup), giant snare + clap + floor tom on 3, tambourine 8ths.
function stomp(bar: number, opts: { crash?: boolean; fill?: boolean } = {}) {
  const at = bar * 16;
  drums.push([at, DRUM.kick, 1, 0.95], [at + 6, DRUM.kick, 1, 0.6], [at + 14, DRUM.kick, 1, 0.5]);
  drums.push([at + 8, DRUM.snare, 1.5, 0.86], [at + 8, DRUM.clap, 1, 0.56], [at + 8, DRUM.tomLow, 1, 0.42]);
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.tambourine, 0.6, s % 4 ? 0.14 : 0.22]);
  if (opts.crash) drums.push([at, DRUM.crash, 8, 0.52]);
  if (opts.fill)
    drums.push(
      [at + 12, DRUM.tomHigh, 0.5, 0.56],
      [at + 13, DRUM.tomMid, 0.5, 0.6],
      [at + 14, DRUM.tomLow, 0.5, 0.64],
      [at + 15, DRUM.tomLow, 0.5, 0.7],
    );
}

const VERSE: Note[][] = [
  [
    [0, 65, 2, 0.7],
    [2, 65, 2, 0.64],
    [4, 67, 2, 0.68],
    [6, 69, 4, 0.74],
    [12, 67, 2, 0.64],
    [14, 65, 2, 0.62],
  ],
  [
    [0, 64, 4, 0.7],
    [4, 64, 2, 0.62],
    [6, 65, 2, 0.64],
    [8, 64, 4, 0.68],
    [12, 60, 4, 0.62],
  ],
  [
    [0, 62, 2, 0.66],
    [2, 65, 2, 0.68],
    [4, 69, 2, 0.74],
    [6, 69, 4, 0.72],
    [10, 67, 2, 0.66],
    [12, 65, 4, 0.66],
  ],
  [
    [0, 65, 6, 0.7],
    [6, 62, 2, 0.62],
    [8, 62, 7, 0.64],
  ],
  [
    [0, 65, 2, 0.7],
    [2, 65, 2, 0.64],
    [4, 67, 2, 0.68],
    [6, 69, 4, 0.74],
    [12, 67, 2, 0.64],
    [14, 65, 2, 0.62],
  ],
  [
    [0, 64, 2, 0.68],
    [2, 67, 2, 0.7],
    [4, 72, 4, 0.78],
    [8, 69, 4, 0.72],
    [12, 67, 4, 0.66],
  ],
  [
    [0, 65, 4, 0.7],
    [4, 67, 2, 0.68],
    [6, 69, 2, 0.72],
    [8, 70, 6, 0.76],
    [14, 69, 2, 0.66],
  ],
  [
    [0, 67, 8, 0.74],
    [8, 64, 4, 0.66],
    [12, 67, 4, 0.7],
  ],
];

const PRE: Note[][] = [
  [
    [0, 69, 4, 0.74],
    [4, 69, 2, 0.68],
    [6, 70, 2, 0.72],
    [8, 72, 8, 0.78],
  ],
  [
    [0, 72, 4, 0.76],
    [4, 72, 2, 0.7],
    [6, 74, 2, 0.74],
    [8, 76, 8, 0.82],
  ],
  [
    [0, 74, 4, 0.78],
    [4, 74, 2, 0.72],
    [6, 72, 2, 0.72],
    [8, 70, 8, 0.78],
  ],
  [
    [0, 72, 4, 0.8],
    [4, 74, 4, 0.84],
    [8, 76, 4, 0.88],
    [12, 79, 4, 0.92],
  ],
];

const CHORUS: Note[][] = [
  [
    [0, 77, 6, 0.94],
    [6, 76, 2, 0.84],
    [8, 77, 4, 0.9],
    [12, 72, 4, 0.82],
  ],
  [
    [0, 79, 6, 0.96],
    [6, 77, 2, 0.86],
    [8, 76, 8, 0.9],
  ],
  [
    [0, 74, 4, 0.88],
    [4, 77, 4, 0.92],
    [8, 81, 6, 1],
    [14, 79, 2, 0.86],
  ],
  [
    [0, 77, 8, 0.94],
    [8, 74, 4, 0.86],
    [12, 72, 4, 0.84],
  ],
  [
    [0, 77, 6, 0.94],
    [6, 76, 2, 0.84],
    [8, 77, 4, 0.9],
    [12, 72, 4, 0.82],
  ],
  [
    [0, 79, 4, 0.94],
    [4, 81, 4, 0.98],
    [8, 79, 4, 0.92],
    [12, 76, 4, 0.86],
  ],
  [
    [0, 74, 4, 0.88],
    [4, 77, 4, 0.92],
    [8, 79, 8, 0.96],
  ],
  [
    [0, 77, 6, 0.94],
    [6, 76, 2, 0.86],
    [8, 72, 8, 0.9],
  ],
];

// Crowd "oh" answering the end of each chorus line.
function crowd(bar: number, chord: Chord, strength: number) {
  for (const p of chord[1]) {
    choir.push([bar * 16, p + 12, 15.5, 0.24 * strength]);
    choir.push([bar * 16 + 12, p + 12, 4, 0.5 * strength]);
  }
}

// Chant: a three-note gang shout on the chord's top tone, claps on every beat.
function chantBar(bar: number, chord: Chord, strength: number) {
  const at = bar * 16;
  const top = chord[1][2] + 12;
  for (const p of [top, top - 12]) {
    choir.push([at, p, 3, 0.56 * strength], [at + 4, p, 3, 0.56 * strength], [at + 8, p + 2, 6, 0.62 * strength]);
  }
  for (const s of [0, 4, 8, 12]) drums.push([at + s, DRUM.clap, 1, 0.5 * strength]);
  drums.push([at, DRUM.kick, 1, 0.8 * strength], [at + 8, DRUM.kick, 1, 0.7 * strength]);
  bass.push([at, chord[0], 15, 0.6 * strength]);
}

// Intro: the piano alone in an empty hall.
[F, Am, Dm, C].forEach((chord, i) => {
  balladPiano(i, chord, 0.85);
  if (i === 3) timpani.push([i * 16 + 12, 36, 4, 0.5]);
});

const LOOP = 4;
let bar = LOOP;

// Verse: piano ballad, a soft heartbeat kick and rim.
verse.forEach((chord, i) => {
  const at = bar * 16;
  balladPiano(bar, chord, 1);
  drums.push([at, DRUM.kick, 1, 0.56], [at + 8, DRUM.rim, 1, 0.34]);
  if (i >= 4) {
    bass.push([at, chord[0], 15, 0.56]);
    strings.push(...chord[1].map((pitch): Note => [at, pitch + 12, 15.5, 0.16]));
  }
  phrase(voice, bar, VERSE[i]);
  bar++;
});

// Pre: floor toms in 8ths, building; strings rise.
pre.forEach((chord, i) => {
  const at = bar * 16;
  balladPiano(bar, chord, 1);
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.tomLow, 0.6, 0.3 + i * 0.06 + (s % 4 ? 0 : 0.08)]);
  drums.push([at, DRUM.kick, 1, 0.7]);
  bass.push([at, chord[0], 15, 0.6]);
  strings.push(...chord[1].map((pitch): Note => [at, pitch + 12, 15.5, 0.22 + i * 0.05]));
  phrase(voice, bar, PRE[i]);
  if (i === 3) {
    for (let s = 8; s < 16; s++) drums.push([at + s, DRUM.snare, 0.5, 0.36 + (s - 8) * 0.07]);
    timpani.push([at + 8, 36, 8, 0.7]);
  }
  bar++;
});

function chorusBars(doubled: boolean) {
  chorus.forEach((chord, i) => {
    const at = bar * 16;
    stomp(bar, { crash: i === 0 || i === 4, fill: i === 7 });
    poundPiano(bar, chord, 1);
    bass.push([at, chord[0], 7, 0.8], [at + 8, chord[0], 7, 0.74]);
    for (const s of [0, 8]) for (const p of chord[1]) brass.push([at + s, p + 12, 6, 0.6]);
    strings.push(...chord[1].map((pitch): Note => [at, pitch + 24, 15.5, doubled ? 0.36 : 0.28]));
    timpani.push([at, chord[0], 4, 0.7], [at + 8, chord[0], 4, 0.56]);
    crowd(bar, chord, doubled ? 1 : 0.8);
    phrase(trumpet, bar, CHORUS[i]);
    phrase(voice, bar, CHORUS[i], doubled ? 0.7 : 0.55, -12);
    if (doubled) phrase(trumpet, bar, CHORUS[i], 0.45, 12);
    bar++;
  });
}

chorusBars(false);
chant.forEach((chord, i) => {
  chantBar(bar, chord, 0.8 + i * 0.06);
  if (i === 3) for (let s = 12; s < 16; s++) drums.push([bar * 16 + s, DRUM.snare, 0.5, 0.5 + (s - 12) * 0.1]);
  bar++;
});
chorusBars(true);

export default {
  title: "Light Up the Rooftops",
  bpm: 92,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.7,
  echoBeats: 0.75,
  echoFeedback: 0.22,
  parts: [
    { inst: "ocarina", notes: voice, vol: 0.6, pan: -0.06, reverb: 0.3, echo: 0.12 },
    { inst: "trumpet", notes: trumpet, vol: 0.58, pan: 0.06, reverb: 0.32, echo: 0.14 },
    { inst: "piano", notes: piano, vol: 0.5, pan: -0.2, reverb: 0.28 },
    { inst: "brass", notes: brass, vol: 0.22, pan: 0.2, reverb: 0.3 },
    { inst: "strings", notes: strings, vol: 0.2, pan: 0.3, reverb: 0.45 },
    { inst: "choir", notes: choir, vol: 0.26, pan: -0.25, reverb: 0.5 },
    { inst: "timpani", notes: timpani, vol: 0.58, pan: 0.12, reverb: 0.35 },
    { inst: "bass_finger", notes: bass, vol: 0.56, pan: 0, reverb: 0.04 },
    { inst: "drums", notes: drums, vol: 0.7, pan: 0, reverb: 0.22 },
  ],
} satisfies Song;
