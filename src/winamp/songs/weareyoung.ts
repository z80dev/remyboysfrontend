import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "We Are Young (16-Bit Remake)" — F major, 116 BPM, an imagined slow-burn anthem after fun.'s #3. A piano
 * fingerpicks the verses over a stomp-clap heartbeat; the pre holds its breath while claps double, and the
 * chorus is the whole stadium: brass, strings, choir "whoa"s and timpani under a trumpet lead reaching for the
 * last row. The bridge is the quiet before — a music box and held breath — one bell, then everyone back in.
 * Verse F C Dm B♭; chorus F Dm B♭ C; bridge B♭ C F F.
 * Intro (4 bars) → loop of 40 bars (≈83 s): verse (8) → build (4) → chorus (8) → verse′ (8) → chorus, doubled (8)
 * → held breath (4).
 */
type Chord = [bass: number, arp: number[], pad: number[]];
const F: Chord = [41, [53, 57, 60, 65], [53, 57, 60]];
const C: Chord = [36, [52, 55, 60, 64], [48, 52, 55]];
const Dm: Chord = [38, [50, 53, 57, 62], [50, 53, 57]];
const Bb: Chord = [34, [50, 53, 58, 62], [50, 53, 58]];
const verse = [F, C, Dm, Bb, F, C, Dm, Bb];
const chorus = [F, Dm, Bb, C, F, Dm, Bb, C];

const lead: Note[] = [];
const piano: Note[] = [];
const stabs: Note[] = [];
const strings: Note[] = [];
const choir: Note[] = [];
const box: Note[] = [];
const timpani: Note[] = [];
const bass: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// Piano fingerpicking: 8ths, warm, thumb-low.
function pick(bar: number, chord: Chord, strength: number) {
  const order = [0, 1, 2, 3, 2, 1, 2, 3];
  for (let s = 0; s < 8; s++) piano.push([bar * 16 + s * 2, chord[1][order[s]], 2.4, (s % 2 ? 0.36 : 0.5) * strength]);
}

function subBass(bar: number, root: number, strength: number) {
  bass.push([bar * 16, root, 8, 0.74 * strength]);
  bass.push([bar * 16 + 10, root + 7, 5, 0.44 * strength]);
}

// Stomp-clap: kick + floor tom on 1 and 3, claps on 2 and 4, no hats — the crowd is the kit.
function stomp(bar: number, opts: { fuller?: boolean } = {}) {
  const at = bar * 16;
  drums.push(
    [at, DRUM.kick, 1, 0.85],
    [at, DRUM.tomLow, 1, 0.4],
    [at + 8, DRUM.kick, 1, 0.7],
    [at + 8, DRUM.tomLow, 1, 0.34],
  );
  for (const s of [4, 12]) {
    drums.push([at + s, DRUM.clap, 1, 0.55]);
    if (opts.fuller) drums.push([at + s, DRUM.snare, 1, 0.4]);
  }
  if (opts.fuller) for (let s = 2; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.6, 0.14]);
}

function powerStab(bar: number, chord: Chord, steps: number[], strength: number) {
  for (const s of steps) {
    for (const pitch of [chord[0] + 12, chord[0] + 19, chord[0] + 24])
      stabs.push([bar * 16 + s, pitch, 1.8, 0.74 * strength]);
  }
}

const verseMelody: Note[][] = [
  [
    [0, 65, 4, 0.72],
    [6, 67, 2, 0.62],
    [8, 69, 4, 0.74],
    [12, 67, 2, 0.62],
    [14, 65, 2, 0.6],
  ],
  [
    [0, 64, 4, 0.7],
    [4, 65, 2, 0.62],
    [6, 67, 2, 0.64],
    [8, 72, 6, 0.76],
    [14, 71, 2, 0.62],
  ],
  [
    [0, 69, 4, 0.72],
    [4, 70, 2, 0.64],
    [6, 72, 2, 0.66],
    [8, 74, 6, 0.76],
    [14, 72, 2, 0.64],
  ],
  [
    [0, 70, 4, 0.7],
    [4, 69, 2, 0.64],
    [6, 67, 2, 0.62],
    [8, 65, 6, 0.7],
    [14, 64, 2, 0.58],
  ],
];
const chorusMelody: Note[][] = [
  [
    [0, 72, 4, 0.88],
    [4, 74, 2, 0.78],
    [6, 77, 2, 0.82],
    [8, 81, 6, 0.94],
    [14, 79, 2, 0.76],
  ],
  [
    [0, 77, 4, 0.84],
    [4, 76, 2, 0.76],
    [6, 74, 2, 0.74],
    [8, 72, 6, 0.86],
    [14, 74, 2, 0.74],
  ],
  [
    [0, 74, 2, 0.78],
    [2, 76, 2, 0.78],
    [4, 79, 4, 0.86],
    [8, 77, 2, 0.8],
    [10, 74, 2, 0.76],
    [12, 77, 4, 0.84],
  ],
  [
    [0, 79, 4, 0.84],
    [4, 79, 2, 0.76],
    [6, 81, 2, 0.8],
    [8, 84, 6, 0.92],
    [14, 81, 2, 0.78],
  ],
];
// The "whoa-oh": crowd answer under the chorus lead.
function whoa(bar: number, chord: Chord) {
  for (const pitch of chord[2]) {
    choir.push([bar * 16 + 8, pitch + 12, 2, 0.5], [bar * 16 + 10, pitch + 12, 4.5, 0.56]);
  }
}

// Intro: the piano and a hum, the hall filling up.
for (let i = 0; i < 4; i++) {
  pick(i, verse[i], 0.9);
  choir.push([i * 16, verse[i][2][0], 15.5, 0.2], [i * 16, verse[i][2][2], 15.5, 0.18]);
  drums.push([i * 16, DRUM.kick, 1, 0.5]);
}

const LOOP = 4;
let bar = LOOP;

function verseBars(second: boolean) {
  verse.forEach((chord, i) => {
    stomp(bar, { fuller: second && i >= 4 });
    pick(bar, chord, 1);
    subBass(bar, chord[0], 1);
    phrase(lead, bar, verseMelody[i % 4], second ? 0.9 : 1);
    if (second) strings.push(...chord[2].map((pitch): Note => [bar * 16, pitch, 15.5, 0.2]));
    if (i % 2 === 1) whoa(bar, chord);
    bar++;
  });
}

function chorusBars(big: boolean) {
  chorus.forEach((chord, i) => {
    stomp(bar, { fuller: true });
    pick(bar, chord, 1);
    subBass(bar, chord[0], 1);
    powerStab(bar, chord, [0, 8], 1);
    phrase(lead, bar, chorusMelody[i % 4]);
    strings.push(...chord[2].map((pitch): Note => [bar * 16, pitch, 15.5, 0.3]));
    whoa(bar, chord);
    timpani.push([bar * 16, chord[0], 3, 0.6]);
    if (big) phrase(lead, bar, chorusMelody[i % 4], 0.5, 12);
    if (i === 0) drums.push([bar * 16, DRUM.crash, 5, 0.5]);
    if (i === 7)
      drums.push(
        [bar * 16 + 12, DRUM.tomHigh, 0.5, 0.5],
        [bar * 16 + 13, DRUM.tomMid, 0.5, 0.52],
        [bar * 16 + 14, DRUM.tomLow, 0.5, 0.56],
        [bar * 16 + 15, DRUM.crash, 4, 0.4],
      );
    bar++;
  });
}

verseBars(false);
// build
for (let i = 0; i < 4; i++) {
  const chord = [Bb, C, F, F][i] ?? F;
  stomp(bar, { fuller: true });
  pick(bar, chord, 0.9);
  subBass(bar, chord[0], 0.9);
  const spacing = i < 2 ? 4 : i < 3 ? 2 : 1;
  for (let s = 0; s < 16; s += spacing) drums.push([bar * 16 + s, DRUM.clap, 0.8, Math.min(0.8, 0.4 + i * 0.1)]);
  if (i === 3) timpani.push([bar * 16 + 12, 41, 4, 0.7]);
  const climb: Note[][] = [
    [
      [0, 69, 4, 0.7],
      [6, 72, 2, 0.68],
      [8, 74, 6, 0.74],
    ],
    [
      [0, 72, 4, 0.72],
      [6, 74, 2, 0.7],
      [8, 77, 6, 0.78],
    ],
    [
      [0, 74, 4, 0.74],
      [4, 77, 4, 0.78],
      [8, 79, 4, 0.8],
      [12, 81, 4, 0.82],
    ],
    [
      [0, 81, 6, 0.86],
      [8, 84, 8, 0.9],
    ],
  ];
  phrase(lead, bar, climb[i]);
  bar++;
}
chorusBars(false);
verseBars(true);
chorusBars(true);

// Held breath: a music box and one bell; the crowd hums; then the loop runs it all back.
const heldBreath = [Bb, C, F, F];
heldBreath.forEach((chord, i) => {
  const at = bar * 16;
  box.push([at, chord[2][0] + 12, 3, 0.4], [at + 4, chord[2][1] + 12, 3, 0.36], [at + 8, chord[2][2] + 12, 4, 0.38]);
  choir.push([at, chord[2][0], 15.5, 0.22], [at, chord[2][2], 15.5, 0.2]);
  bass.push([at, chord[0], 15.5, 0.4]);
  drums.push([at, DRUM.kick, 1, 0.4]);
  if (i === 3) for (const s of [12, 13, 14, 15]) drums.push([at + s, DRUM.shaker, 0.5, 0.08 + (s - 12) * 0.04]);
  bar++;
});

export default {
  title: "We Are Young (16-Bit Remake)",
  bpm: 116,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.6,
  echoBeats: 0.75,
  echoFeedback: 0.25,
  parts: [
    { inst: "trumpet", notes: lead, vol: 0.6, pan: 0.05, reverb: 0.25, echo: 0.15 },
    { inst: "piano", notes: piano, vol: 0.5, pan: -0.2, reverb: 0.25 },
    { inst: "brass", notes: stabs, vol: 0.24, pan: -0.15, reverb: 0.22 },
    { inst: "strings", notes: strings, vol: 0.2, pan: 0.3, reverb: 0.42 },
    { inst: "choir", notes: choir, vol: 0.24, pan: 0.25, reverb: 0.45 },
    { inst: "music_box", notes: box, vol: 0.3, pan: 0.35, reverb: 0.4, echo: 0.25 },
    { inst: "timpani", notes: timpani, vol: 0.6, pan: 0.15, reverb: 0.3 },
    { inst: "bass_finger", notes: bass, vol: 0.54, pan: 0, reverb: 0.05 },
    { inst: "drums", notes: drums, vol: 0.66, pan: 0, reverb: 0.12 },
  ],
} satisfies Song;
