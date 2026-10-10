import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Been By Now (16-Bit Remake)" — D major, 78 BPM half-time, an imagined heartland ballad after Morgan Wallen's
 * #7. Strummed guitar arps and a warm pad ride home at sunset; a violin sighs the steel-guitar lines, piano
 * answers in gospel 6ths, and the chorus opens wide with strings, choir and a brass swell. The bridge is the porch
 * at dusk — electric piano and the violin alone — before one last wide-open chorus.
 * Verse D A Bm G; chorus G D A Bm / G D A A; bridge Em7 G D A.
 * Intro (4 bars) → loop of 40 bars (≈123 s): verse (8) → chorus (8) → verse′ with fills (8) → chorus (8)
 * → porch bridge (4) → build (4) → double chorus (8).
 */
type Chord = [bass: number, arp: number[]];
const D: Chord = [38, [50, 54, 57, 62]];
const A: Chord = [45, [49, 52, 57, 61]];
const Bm: Chord = [47, [50, 54, 59, 62]];
const G: Chord = [43, [50, 55, 59, 62]];
const Em7: Chord = [40, [47, 50, 55, 59]];
const verse = [D, A, Bm, G, D, A, Bm, G];
const chorus = [G, D, A, Bm, G, D, A, A];
const bridge = [Em7, G, D, A];

const violin: Note[] = [];
const fills: Note[] = [];
const guitar: Note[] = [];
const piano: Note[] = [];
const keys: Note[] = [];
const strings: Note[] = [];
const choir: Note[] = [];
const swell: Note[] = [];
const bass: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// Strummed arpeggio: picked 8ths through the voicing, down-up like a driver's thumb on the wheel.
function pick(bar: number, chord: Chord, strength: number) {
  const [, arp] = chord;
  const order = [0, 1, 2, 3, 2, 1, 2, 3];
  for (let s = 0; s < 8; s++) guitar.push([bar * 16 + s * 2, arp[order[s]], 2.2, (s % 2 ? 0.34 : 0.48) * strength]);
}

function heartBass(bar: number, root: number, strength: number) {
  bass.push([bar * 16, root, 8, 0.72 * strength]);
  bass.push([bar * 16 + 10, root + 7, 5, 0.46 * strength]);
}

// Half-time country kit: kick on 1, brush snare on 3, ghost hats, tambourine in the choruses.
function kit(bar: number, opts: { chorus?: boolean; fill?: boolean } = {}) {
  const at = bar * 16;
  drums.push([at, DRUM.kick, 1, 0.72], [at + 10, DRUM.kick, 1, 0.42]);
  drums.push([at + 8, DRUM.snare, 1, opts.chorus ? 0.5 : 0.42], [at + 8, DRUM.rim, 1, 0.18]);
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.6, s % 4 ? 0.14 : 0.2]);
  for (let s = 1; s < 16; s += 2) drums.push([at + s, DRUM.shaker, 0.5, 0.09]);
  if (opts.chorus) for (let s = 0; s < 16; s += 4) drums.push([at + s, DRUM.tambourine, 1, s % 8 ? 0.24 : 0.34]);
  if (opts.fill) drums.push([at + 12, DRUM.tomMid, 0.6, 0.4], [at + 14, DRUM.snare, 0.5, 0.42]);
}

const verseMelody: Note[][] = [
  [
    [0, 66, 4, 0.68],
    [6, 69, 2, 0.6],
    [8, 71, 4, 0.7],
    [12, 69, 2, 0.62],
    [14, 66, 2, 0.6],
  ],
  [
    [0, 73, 3, 0.72],
    [4, 71, 1, 0.6],
    [6, 69, 2, 0.64],
    [8, 66, 6, 0.68],
    [14, 68, 2, 0.6],
  ],
  [
    [0, 71, 4, 0.7],
    [4, 74, 2, 0.68],
    [8, 73, 3, 0.72],
    [12, 71, 2, 0.64],
    [14, 69, 2, 0.62],
  ],
  [
    [0, 67, 4, 0.68],
    [4, 71, 2, 0.66],
    [6, 74, 2, 0.7],
    [8, 79, 6, 0.74],
    [14, 78, 2, 0.64],
  ],
  [
    [0, 81, 4, 0.76],
    [6, 78, 2, 0.66],
    [8, 74, 4, 0.72],
    [12, 76, 2, 0.66],
    [14, 78, 2, 0.68],
  ],
  [
    [0, 79, 3, 0.72],
    [4, 78, 1, 0.62],
    [6, 76, 2, 0.66],
    [8, 73, 6, 0.7],
    [14, 71, 2, 0.62],
  ],
  [
    [0, 74, 4, 0.72],
    [4, 78, 2, 0.7],
    [8, 81, 4, 0.76],
    [12, 78, 2, 0.68],
    [14, 76, 2, 0.66],
  ],
  [
    [0, 74, 6, 0.72],
    [8, 73, 2, 0.64],
    [10, 71, 2, 0.64],
    [12, 69, 4, 0.66],
  ],
];
const chorusMelody: Note[][] = [
  [
    [0, 78, 4, 0.84],
    [4, 81, 2, 0.78],
    [6, 83, 2, 0.8],
    [8, 86, 4, 0.88],
    [12, 83, 2, 0.78],
    [14, 81, 2, 0.76],
  ],
  [
    [0, 81, 4, 0.82],
    [4, 78, 2, 0.74],
    [6, 76, 2, 0.74],
    [8, 78, 6, 0.82],
    [14, 74, 2, 0.72],
  ],
  [
    [0, 76, 2, 0.78],
    [2, 78, 2, 0.78],
    [4, 81, 4, 0.84],
    [8, 83, 2, 0.8],
    [10, 81, 2, 0.78],
    [12, 83, 4, 0.82],
  ],
  [
    [0, 85, 4, 0.86],
    [4, 83, 2, 0.8],
    [6, 81, 2, 0.78],
    [8, 78, 6, 0.84],
    [14, 74, 2, 0.74],
  ],
];

// Intro: guitar and shaker alone, a violin slide up into town.
for (let i = 0; i < 4; i++) {
  pick(i, verse[i], 0.9);
  for (let s = 0; s < 16; s += 2) drums.push([i * 16 + s, DRUM.shaker, 0.5, s % 4 ? 0.07 : 0.12]);
  if (i === 3)
    violin.push(
      [3 * 16 + 12, 61, 1, 0.4],
      [3 * 16 + 13, 64, 1, 0.44],
      [3 * 16 + 14, 68, 1, 0.48],
      [3 * 16 + 15, 71, 1, 0.5],
    );
}

const LOOP = 4;
let bar = LOOP;

function verseBars(second: boolean) {
  verse.forEach((chord, i) => {
    pick(bar, chord, 1);
    heartBass(bar, chord[0], 1);
    kit(bar);
    phrase(violin, bar, verseMelody[i]);
    if (second && i >= 4) phrase(fills, bar, verseMelody[i], 0.6, 4);
    if (i % 2 === 1) piano.push([bar * 16 + 8, chord[1][2] + 12, 3, 0.4], [bar * 16 + 8.5, chord[1][3] + 12, 3, 0.36]);
    if (second) strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.18]));
    bar++;
  });
}

function chorusBars(big: boolean) {
  chorus.forEach((chord, i) => {
    pick(bar, chord, 1);
    heartBass(bar, chord[0], 1);
    kit(bar, { chorus: true, fill: i === 7 });
    phrase(violin, bar, chorusMelody[i % 4]);
    strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.3]));
    choir.push(...chord[1].slice(1).map((pitch): Note => [bar * 16, pitch + 12, 15.5, big ? 0.44 : 0.36]));
    if (i === 0 || i === 4) drums.push([bar * 16, DRUM.crash, 5, 0.4]);
    if (i === 7) for (const pitch of chord[1]) swell.push([bar * 16 + 8, pitch + 12, 7, 0.4]);
    if (big) phrase(fills, bar, chorusMelody[i % 4], 0.55, 4);
    bar++;
  });
}

verseBars(false);
chorusBars(false);
verseBars(true);
chorusBars(false);

// Porch bridge: dusk — electric piano and the violin, trading eight bars of quiet.
bridge.forEach((chord, i) => {
  const at = bar * 16;
  chord[1].forEach((pitch, j) => keys.push([at + j * 0.06, pitch, 14, 0.4 - j * 0.02]));
  bass.push([at, chord[0], 15.5, 0.42]);
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.shaker, 0.5, s % 4 ? 0.06 : 0.1]);
  if (i === 0)
    phrase(violin, bar, [
      [0, 74, 4, 0.66],
      [6, 71, 2, 0.58],
      [8, 67, 6, 0.68],
    ]);
  if (i === 1)
    phrase(violin, bar, [
      [0, 71, 4, 0.66],
      [6, 74, 2, 0.62],
      [8, 78, 6, 0.7],
    ]);
  if (i === 2)
    phrase(violin, bar, [
      [0, 78, 3, 0.7],
      [4, 76, 1, 0.6],
      [6, 74, 2, 0.64],
      [8, 71, 6, 0.68],
    ]);
  if (i === 3) {
    phrase(violin, bar, [
      [0, 69, 4, 0.68],
      [6, 73, 2, 0.66],
      [8, 78, 4, 0.72],
      [12, 81, 4, 0.74],
    ]);
    for (const s of [12, 13, 14, 15]) drums.push([at + s, DRUM.snare, 0.5, 0.3 + (s - 12) * 0.1]);
  }
  bar++;
});

// Build: the band walks back up the drive.
bridge.forEach((chord, i) => {
  pick(bar, chord, 0.7 + i * 0.1);
  kit(bar, i >= 2 ? { chorus: true } : {});
  strings.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.2 + i * 0.03]));
  if (i >= 2) choir.push(...chord[1].slice(1).map((pitch): Note => [bar * 16, pitch + 12, 15.5, 0.3]));
  bar++;
});

chorusBars(true);

export default {
  title: "Been By Now (16-Bit Remake)",
  bpm: 78,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  swing: 0.12,
  room: 0.6,
  echoBeats: 1.0,
  echoFeedback: 0.25,
  parts: [
    { inst: "violin", notes: violin, vol: 0.6, pan: 0.12, reverb: 0.32, echo: 0.14 },
    { inst: "violin", notes: fills, vol: 0.4, pan: -0.2, reverb: 0.32 },
    { inst: "guitar", notes: guitar, vol: 0.5, pan: -0.3, reverb: 0.2 },
    { inst: "piano", notes: piano, vol: 0.46, pan: 0.25, reverb: 0.28 },
    { inst: "epiano", notes: keys, vol: 0.44, pan: -0.1, reverb: 0.26 },
    { inst: "strings", notes: strings, vol: 0.2, pan: 0.3, reverb: 0.42 },
    { inst: "choir", notes: choir, vol: 0.22, pan: 0.35, reverb: 0.45 },
    { inst: "brass", notes: swell, vol: 0.2, pan: 0, reverb: 0.3 },
    { inst: "bass_finger", notes: bass, vol: 0.56, pan: 0, reverb: 0.05 },
    { inst: "drums", notes: drums, vol: 0.64, pan: 0, reverb: 0.12 },
  ],
} satisfies Song;
