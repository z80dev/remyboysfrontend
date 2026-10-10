import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Cleveland! (16-Bit Remake)" — E minor, 152 BPM, an imagined rust-belt stadium anthem after Taylor Swift's #3.
 * A dropped-D-ish guitar riff and driving 8th bass under organ verses; the chorus is the crowd: power stabs,
 * strings, a choir chanting the title and a saw lead reaching for the cheap seats. Bridge is the "lake effect" —
 * hushed bells over the water — before the last push. Verse Em G D A; chorus C G D Em / C G A B lift.
 * Intro (8 bars) → loop of 44 bars (≈116 s): riff (4) → verse (8) → chorus (8) → riff + verse (12)
 * → lake-effect bridge (4) → build (4) → double chorus (8, keys double the lead).
 */
const Em = 40;
const G = 43;
const D = 38;
const A = 45;
const C = 36;
const B = 47;
const lead: Note[] = [];
const keys: Note[] = [];
const riff: Note[] = [];
const stabs: Note[] = [];
const strings: Note[] = [];
const choir: Note[] = [];
const organ: Note[] = [];
const bell: Note[] = [];
const bass: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// The riff: low E pedal with a G-A-B climb — one guitar, doubled by nothing, the whole identity of the song.
const RIFF: Note[] = [
  [0, 40, 1],
  [1, 40, 1],
  [2, 43, 2],
  [4, 45, 2],
  [6, 47, 2],
  [8, 40, 1],
  [9, 40, 1],
  [10, 50, 2],
  [12, 47, 2],
  [14, 43, 2],
];

function powerStab(bar: number, root: number, steps: number[], strength: number) {
  for (const s of steps) {
    for (const pitch of [root + 24, root + 31, root + 36]) stabs.push([bar * 16 + s, pitch, 1.6, 0.74 * strength]);
  }
}

function driveBass(bar: number, root: number, strength: number) {
  for (let s = 0; s < 16; s += 2)
    bass.push([bar * 16 + s, root + (s === 14 ? 12 : 0), 1.8, (s % 4 ? 0.62 : 0.82) * strength]);
}

function rockKit(bar: number, opts: { crash?: boolean; fill?: boolean; strength?: number } = {}) {
  const at = bar * 16;
  const strength = opts.strength ?? 1;
  drums.push(
    [at, DRUM.kick, 1, 0.92 * strength],
    [at + 8, DRUM.kick, 1, 0.8 * strength],
    [at + 11, DRUM.kick, 1, 0.6 * strength],
  );
  for (const s of [4, 12]) drums.push([at + s, DRUM.snare, 1, 0.78 * strength]);
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.6, 0.3 * strength]);
  if (opts.crash) drums.push([at, DRUM.crash, 5, 0.6 * strength]);
  if (opts.fill) {
    drums.push(
      [at + 12, DRUM.snare, 0.5, 0.6],
      [at + 13, DRUM.tomHigh, 0.5, 0.6],
      [at + 14, DRUM.tomMid, 0.5, 0.64],
      [at + 15, DRUM.tomLow, 0.5, 0.68],
    );
  }
}

// Verse melody — organ comp under a guitar that sings before the chorus explodes.
const verseMelody: Note[][] = [
  [
    [0, 76, 2, 0.78],
    [2, 79, 2, 0.8],
    [4, 83, 3, 0.86],
    [8, 81, 2, 0.78],
    [10, 79, 2, 0.76],
    [12, 76, 3, 0.78],
  ],
  [
    [0, 79, 2, 0.8],
    [2, 81, 2, 0.8],
    [4, 83, 4, 0.88],
    [8, 84, 2, 0.82],
    [10, 83, 2, 0.8],
    [12, 81, 3, 0.78],
  ],
  [
    [0, 81, 2, 0.8],
    [2, 83, 2, 0.82],
    [4, 86, 3, 0.88],
    [8, 85, 2, 0.8],
    [10, 83, 2, 0.78],
    [12, 81, 3, 0.78],
  ],
  [
    [0, 79, 2, 0.8],
    [2, 78, 2, 0.78],
    [4, 79, 4, 0.82],
    [8, 74, 2, 0.74],
    [10, 76, 2, 0.76],
    [12, 78, 3, 0.78],
  ],
];
const chorusMelody: Note[][] = [
  [
    [0, 88, 4, 0.96],
    [4, 86, 2, 0.86],
    [6, 84, 2, 0.84],
    [8, 86, 6, 0.9],
    [14, 83, 2, 0.8],
  ],
  [
    [0, 84, 4, 0.9],
    [4, 83, 2, 0.84],
    [6, 81, 2, 0.82],
    [8, 83, 6, 0.88],
    [14, 79, 2, 0.8],
  ],
  [
    [0, 81, 2, 0.86],
    [2, 83, 2, 0.86],
    [4, 86, 4, 0.92],
    [8, 88, 4, 0.96],
    [12, 86, 2, 0.86],
    [14, 84, 2, 0.84],
  ],
  [
    [0, 83, 4, 0.88],
    [4, 81, 2, 0.82],
    [6, 79, 2, 0.8],
    [8, 76, 6, 0.84],
    [14, 78, 2, 0.8],
  ],
];

function chant(bar: number, pitches: number[]) {
  // "CLEVE-LAND!": two eighths and a held half, the crowd on the answer.
  for (const pitch of pitches) {
    choir.push([bar * 16, pitch, 1.5, 0.6], [bar * 16 + 2, pitch, 1.5, 0.56], [bar * 16 + 4, pitch, 6, 0.68]);
  }
}

// Intro: the riff, alone with the kit, building a floor tom into the verse.
for (let i = 0; i < 8; i++) {
  phrase(riff, i, RIFF, i < 4 ? 0.8 : 1);
  rockKit(i, { crash: i % 4 === 0, fill: i === 3 || i === 7, strength: i < 2 ? 0.7 : 1 });
  if (i >= 4) driveBass(i, Em, 0.9);
  if (i >= 6)
    phrase(
      riff,
      i,
      RIFF.map(([s, p, l]) => [s, p + 12, l, 0.6] as Note),
    );
}

const LOOP = 8;
let bar = LOOP;

function verseBars(withRiff: boolean) {
  [Em, G, D, A, Em, G, D, A].forEach((root, i) => {
    rockKit(bar, { fill: i === 7 });
    driveBass(bar, root, 1);
    if (withRiff) phrase(riff, bar, RIFF);
    const voicing = [root + 24, root + 28, root + 31];
    organ.push(
      [bar * 16, voicing[0], 15.5, 0.4],
      [bar * 16, voicing[1], 15.5, 0.36],
      [bar * 16, voicing[2], 15.5, 0.34],
    );
    if (!withRiff) phrase(lead, bar, verseMelody[i % 4]);
    if (withRiff && i >= 4) phrase(lead, bar, verseMelody[i - 4], 0.8);
    bar++;
  });
}

function chorusBars(big: boolean) {
  const roots = [C, G, D, Em, C, G, A, B];
  roots.forEach((root, i) => {
    rockKit(bar, { crash: i % 2 === 0, fill: i === 7 });
    driveBass(bar, root, 1);
    powerStab(bar, root, [0, 6, 10], 1);
    const pad = [root + 24, root + 31, root + 36];
    strings.push(...pad.map((pitch): Note => [bar * 16, pitch, 15.5, 0.36]));
    if (i < 4 || i >= 6) phrase(lead, bar, chorusMelody[i % 4]);
    if (i === 4 || i === 5) chant(bar, [root + 36, root + 43]);
    if (big) phrase(keys, bar, chorusMelody[i % 4], 0.6, 12);
    if (i === 5) chant(bar, [root + 36, root + 43]);
    bar++;
  });
}

verseBars(false);
chorusBars(false);
verseBars(true);

// Lake-effect bridge: the stadium holds its breath — bells over still strings, kick like a heartbeat.
for (let i = 0; i < 4; i++) {
  const root = [Em, C, G, D][i];
  drums.push([bar * 16, DRUM.kick, 1, 0.5]);
  strings.push(...[root + 24, root + 31, root + 36].map((pitch): Note => [bar * 16, pitch, 15.5, 0.24]));
  bell.push([bar * 16 + 2, root + 43, 3, 0.4], [bar * 16 + 8, root + 48, 4, 0.34]);
  bass.push([bar * 16, root, 15.5, 0.5]);
  bar++;
}
phrase(lead, bar - 1, [
  [8, 81, 2, 0.7],
  [10, 83, 2, 0.74],
  [12, 86, 4, 0.8],
]);

// Build: snare doubles, stabs return a bar apart, then together.
for (let i = 0; i < 4; i++) {
  const root = [C, G, A, B][i];
  const spacing = i < 2 ? 2 : 1;
  for (let s = 0; s < 16; s += spacing) drums.push([bar * 16 + s, DRUM.snare2, 0.45, Math.min(0.92, 0.36 + i * 0.14)]);
  driveBass(bar, root, 0.7 + i * 0.1);
  if (i >= 2) powerStab(bar, root, [0, 8], 0.8);
  bar++;
}

chorusBars(true);

export default {
  title: "Cleveland! (16-Bit Remake)",
  bpm: 152,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.5,
  echoBeats: 0.5,
  echoFeedback: 0.22,
  parts: [
    { inst: "saw_lead", notes: lead, vol: 0.62, pan: 0.05, reverb: 0.22, echo: 0.18 },
    { inst: "square", notes: keys, vol: 0.2, pan: 0.3, reverb: 0.2, echo: 0.2 },
    { inst: "guitar", notes: riff, vol: 0.58, pan: -0.25, reverb: 0.2 },
    { inst: "brass", notes: stabs, vol: 0.24, pan: -0.15, reverb: 0.22 },
    { inst: "strings", notes: strings, vol: 0.22, pan: 0.3, reverb: 0.4 },
    { inst: "choir", notes: choir, vol: 0.26, pan: 0.25, reverb: 0.45 },
    { inst: "organ", notes: organ, vol: 0.3, pan: -0.35, reverb: 0.25 },
    { inst: "bell", notes: bell, vol: 0.26, pan: 0.4, reverb: 0.4, echo: 0.3 },
    { inst: "bass_saw", notes: bass, vol: 0.56, pan: 0, reverb: 0.03 },
    { inst: "drums", notes: drums, vol: 0.7, pan: 0, reverb: 0.09 },
  ],
} satisfies Song;
