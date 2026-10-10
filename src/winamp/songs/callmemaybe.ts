import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Call Me Maybe (16-Bit Remake)" — D major, 120 BPM, an imagined sugar-rush crush anthem after Carly Rae
 * Jepsen's #2. A disco-string stab riff (staccato strings) is the whole plot; palm-muted square chugs, snaps,
 * handclaps and a bubbly bell hook. The pre-chorus holds its breath (stabs stop, EP only), the chorus is the
 * text message you rewrite five times, and the tag is a stop-time "hey!" count-in that never actually slows
 * down. Verse D A Bm G; chorus G D A Bm / G D A A.
 * Intro (4 bars) → loop of 40 bars (≈80 s): verse (8) → pre (4) → chorus (8) → verse′ (8) → chorus (8)
 * → stop-time tag and build (4).
 */
const D = 38;
const A = 45;
const Bm = 47;
const G = 43;

const lead: Note[] = [];
const sparkle: Note[] = [];
const chug: Note[] = [];
const riff: Note[] = [];
const stabs: Note[] = [];
const keys: Note[] = [];
const bass: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// The string-stab disco riff: off-beat pushes, the song's opening handshake.
const RIFF: Note[] = [
  [0, 69, 1, 0.72],
  [0, 74, 1, 0.72],
  [2, 71, 1, 0.66],
  [2, 74, 1, 0.66],
  [4, 73, 1.5, 0.78],
  [4, 78, 1.5, 0.78],
  [7, 74, 1, 0.62],
  [7, 78, 1, 0.62],
  [8, 71, 1, 0.7],
  [8, 76, 1, 0.7],
  [10, 73, 1, 0.66],
  [10, 76, 1, 0.66],
  [12, 74, 2.5, 0.8],
  [12, 78, 2.5, 0.8],
];
function stringRiff(bar: number, strength: number) {
  phrase(riff, bar, RIFF, strength);
}

function chugs(bar: number, root: number, strength: number) {
  for (let s = 0; s < 16; s += 2) chug.push([bar * 16 + s, root + 12, 1.6, (s % 4 ? 0.44 : 0.6) * strength]);
}

function powerStab(bar: number, root: number, steps: number[], strength: number) {
  for (const s of steps) {
    for (const pitch of [root + 12, root + 19, root + 24]) stabs.push([bar * 16 + s, pitch, 1.8, 0.72 * strength]);
  }
}

function popBass(bar: number, root: number, strength: number) {
  for (const [s, interval] of [
    [0, 0],
    [3, 0],
    [6, 7],
    [8, 0],
    [11, 0],
    [14, 12],
  ] as const) {
    bass.push([bar * 16 + s, root + interval, 2.4, (s === 0 || s === 8 ? 0.8 : 0.6) * strength]);
  }
}

// Bouncy pop kit: kick 1-and, snaps on 2/4, 8th hats, claps in the chorus.
function popKit(bar: number, opts: { clap?: boolean; crash?: boolean; fill?: boolean } = {}) {
  const at = bar * 16;
  drums.push([at, DRUM.kick, 1, 0.84], [at + 6, DRUM.kick, 1, 0.6], [at + 10, DRUM.kick, 1, 0.74]);
  for (const s of [4, 12]) drums.push([at + s, DRUM.rim, 1, 0.5]);
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.6, 0.24]);
  if (opts.clap) for (const s of [4, 12]) drums.push([at + s, DRUM.clap, 1, 0.5]);
  if (opts.crash) drums.push([at, DRUM.crash, 4, 0.45]);
  if (opts.fill)
    drums.push([at + 13, DRUM.tomHigh, 0.5, 0.44], [at + 14, DRUM.snare, 0.5, 0.48], [at + 15, DRUM.tomLow, 0.5, 0.5]);
}

const verseMelody: Note[][] = [
  [
    [0, 69, 2, 0.76],
    [2, 71, 2, 0.72],
    [4, 74, 3, 0.8],
    [8, 73, 2, 0.7],
    [10, 71, 2, 0.7],
    [12, 69, 3, 0.74],
  ],
  [
    [0, 71, 2, 0.74],
    [2, 73, 2, 0.72],
    [4, 76, 3, 0.8],
    [8, 74, 2, 0.72],
    [10, 73, 2, 0.7],
    [12, 71, 3, 0.72],
  ],
  [
    [0, 74, 1, 0.72],
    [1, 76, 1, 0.74],
    [2, 78, 4, 0.84],
    [6, 76, 2, 0.72],
    [8, 74, 2, 0.7],
    [10, 71, 2, 0.68],
    [12, 73, 3, 0.72],
  ],
  [
    [0, 71, 4, 0.74],
    [4, 69, 2, 0.7],
    [6, 67, 2, 0.68],
    [8, 66, 6, 0.72],
    [14, 69, 2, 0.68],
  ],
];
const chorusMelody: Note[][] = [
  [
    [0, 78, 2, 0.88],
    [2, 78, 2, 0.8],
    [4, 81, 4, 0.92],
    [8, 78, 2, 0.82],
    [10, 76, 2, 0.78],
    [12, 74, 3, 0.82],
  ],
  [
    [0, 76, 2, 0.84],
    [2, 74, 2, 0.78],
    [4, 73, 4, 0.86],
    [8, 76, 2, 0.8],
    [10, 78, 2, 0.82],
    [12, 81, 3, 0.88],
  ],
  [
    [0, 78, 2, 0.86],
    [2, 81, 2, 0.86],
    [4, 83, 4, 0.92],
    [8, 81, 2, 0.84],
    [10, 78, 2, 0.8],
    [12, 81, 3, 0.88],
  ],
  [
    [0, 78, 4, 0.86],
    [4, 76, 2, 0.8],
    [6, 74, 2, 0.78],
    [8, 71, 6, 0.84],
    [14, 74, 2, 0.78],
  ],
];
// The bell hook: bubbly pentatonic answer, glockenspiel energy.
const BELL: Note[][] = [
  [
    [0, 90, 2, 0.4],
    [2, 93, 2, 0.42],
    [4, 95, 3, 0.46],
    [8, 93, 2, 0.4],
    [10, 90, 2, 0.38],
    [12, 86, 3, 0.4],
  ],
  [
    [0, 95, 2, 0.44],
    [2, 98, 2, 0.46],
    [4, 100, 3, 0.5],
    [8, 98, 2, 0.42],
    [10, 95, 2, 0.4],
    [12, 93, 3, 0.42],
  ],
];

function gang(bar: number, step: number, pitch: number) {
  stabs.push([bar * 16 + step, pitch, 1, 0.5], [bar * 16 + step, pitch + 7, 1, 0.42]);
  drums.push([bar * 16 + step, DRUM.clap, 1, 0.4]);
}

// Intro: the string riff and claps introduce themselves.
for (let i = 0; i < 4; i++) {
  stringRiff(i, i === 3 ? 0.8 : 1);
  popKit(i, { clap: i >= 2, crash: i === 0 });
  if (i >= 2) popBass(i, [D, A, Bm, G][i], 0.8);
}

const LOOP = 4;
let bar = LOOP;

function verseBars(second: boolean) {
  [D, A, Bm, G, D, A, Bm, G].forEach((root, i) => {
    popKit(bar, { fill: i === 7 });
    chugs(bar, root, 1);
    popBass(bar, root, 1);
    if (!second) stringRiff(bar, 0.5);
    else stringRiff(bar, 0.8);
    phrase(lead, bar, verseMelody[i % 4], second ? 0.9 : 1);
    if (second) phrase(sparkle, bar, BELL[i % 2], 0.7);
    if (i % 2 === 1) gang(bar, 14, 67);
    bar++;
  });
}

function preBars() {
  [G, A, Bm, Bm].forEach((root, i) => {
    popKit(bar, { clap: false });
    chugs(bar, root, 0.7);
    if (i >= 2) popBass(bar, root, 0.8);
    keys.push([bar * 16, root + 12, 15.5, 0.4], [bar * 16, root + 16, 15.5, 0.36], [bar * 16, root + 19, 15.5, 0.34]);
    const climb: Note[][] = [
      [
        [0, 74, 4, 0.68],
        [6, 76, 2, 0.66],
        [8, 78, 6, 0.72],
      ],
      [
        [0, 76, 4, 0.7],
        [6, 78, 2, 0.68],
        [8, 81, 6, 0.76],
      ],
      [
        [0, 78, 2, 0.72],
        [2, 79, 2, 0.72],
        [4, 81, 4, 0.78],
        [8, 83, 4, 0.8],
        [12, 85, 3, 0.82],
      ],
      [
        [0, 83, 4, 0.8],
        [4, 81, 2, 0.74],
        [6, 78, 2, 0.72],
        [8, 81, 6, 0.82],
      ],
    ];
    phrase(lead, bar, climb[i]);
    if (i === 3) for (const s of [12, 14]) drums.push([bar * 16 + s, DRUM.snare, 0.5, 0.4 + (s - 12) * 0.06]);
    bar++;
  });
}

function chorusBars(big: boolean) {
  [G, D, A, Bm, G, D, A, A].forEach((root, i) => {
    popKit(bar, { clap: true, crash: i === 0 || i === 4, fill: i === 7 });
    chugs(bar, root, 1);
    popBass(bar, root, 1);
    stringRiff(bar, 1);
    powerStab(bar, root, [0, 8], 0.9);
    phrase(lead, bar, chorusMelody[i % 4]);
    phrase(sparkle, bar, BELL[i % 2], big ? 1 : 0.8);
    if (i % 2 === 1) gang(bar, 12, 67);
    bar++;
  });
}

verseBars(false);
preBars();
chorusBars(false);
verseBars(true);
chorusBars(false);

// Stop-time tag: hits on 1 and "hey!" — the count-in that runs straight back to the top.
for (let i = 0; i < 4; i++) {
  const at = bar * 16;
  const root = [G, A, Bm, D][i];
  drums.push([at, DRUM.kick, 1, 0.85], [at + 4, DRUM.snare, 1, 0.55]);
  powerStab(bar, root, [0], 0.8);
  gang(bar, 4, 67);
  if (i >= 2) {
    popKit(bar, { clap: true });
    chugs(bar, root, 0.8);
  }
  if (i === 3) stringRiff(bar, 0.9);
  if (i === 3) for (const s of [12, 13, 14, 15]) drums.push([at + s, DRUM.snare, 0.5, 0.42 + (s - 12) * 0.1]);
  bar++;
}

export default {
  title: "Call Me Maybe (16-Bit Remake)",
  bpm: 120,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.5,
  echoBeats: 0.5,
  echoFeedback: 0.2,
  parts: [
    { inst: "square", notes: lead, vol: 0.6, pan: 0.05, reverb: 0.18, echo: 0.15 },
    { inst: "bell", notes: sparkle, vol: 0.3, pan: 0.35, reverb: 0.35, echo: 0.25 },
    { inst: "square50", notes: chug, vol: 0.28, pan: -0.3, reverb: 0.12 },
    { inst: "strings_stacc", notes: riff, vol: 0.3, pan: 0.15, reverb: 0.22, echo: 0.12 },
    { inst: "brass", notes: stabs, vol: 0.24, pan: -0.15, reverb: 0.2 },
    { inst: "epiano", notes: keys, vol: 0.4, pan: 0.2, reverb: 0.25 },
    { inst: "bass", notes: bass, vol: 0.56, pan: 0, reverb: 0.03 },
    { inst: "drums", notes: drums, vol: 0.68, pan: 0, reverb: 0.1 },
  ],
} satisfies Song;
