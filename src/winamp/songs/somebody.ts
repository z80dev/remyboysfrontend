import { DRUM, type Note, type Song } from "../../quest/music/song";

/**
 * "Somebody That I Used to Know (16-Bit Remake)" — D minor, 118 BPM, an imagined art-pop breakup duet after
 * Gotye & Kimbra's year-ender. A pentatonic marimba hook wanders alone; verse 1 is the low, wounded voice
 * (ocarina) over plucked arpeggios and a heartbeat; verse 2 is the high, sharper answer (flute) with the bass
 * arriving between them. The chorus is the argument: half-time stomp, the hook doubled on bells, strings and a
 * choir that takes nobody's side. Then the room empties and the hook is left alone again.
 * Verse Dm B♭ F C; chorus Dm F C Gm / Dm F B♭ A.
 * Intro (4 bars) → loop of 40 bars (≈81 s): verse 1 (8) → verse 2 (8) → chorus (8) → chorus, louder (8)
 * → empty room (4) → build (4).
 */
type Chord = [bass: number, arp: number[], pad: number[]];
const Dm: Chord = [38, [50, 53, 57, 62], [50, 53, 57]];
const Bb: Chord = [34, [50, 53, 58, 62], [50, 53, 58]];
const F: Chord = [41, [53, 57, 60, 65], [53, 57, 60]];
const C: Chord = [36, [52, 55, 60, 64], [48, 52, 55]];
const Gm: Chord = [43, [50, 55, 58, 62], [50, 55, 58]];
const A: Chord = [45, [49, 52, 57, 61], [45, 49, 52]];
const verse = [Dm, Bb, F, C, Dm, Bb, F, C];
const chorus = [Dm, F, C, Gm, Dm, F, Bb, A];

const voice1: Note[] = [];
const voice2: Note[] = [];
const hook: Note[] = [];
const arps: Note[] = [];
const strings: Note[] = [];
const choir: Note[] = [];
const bass: Note[] = [];
const pad: Note[] = [];
const drums: Note[] = [];

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.95, velocity * strength]);
  }
}

// Plucked arpeggio: steady 8ths, thumb on the root.
function pick(bar: number, chord: Chord, strength: number) {
  const order = [0, 1, 2, 3, 2, 1, 2, 3];
  for (let s = 0; s < 8; s++) arps.push([bar * 16 + s * 2, chord[1][order[s]], 2.4, (s % 2 ? 0.32 : 0.46) * strength]);
}

function subBass(bar: number, root: number, strength: number) {
  bass.push([bar * 16, root, 11, 0.72 * strength]);
  bass.push([bar * 16 + 12, root + 7, 3.5, 0.42 * strength]);
}

// Heartbeat kit: kick like a pulse, rim like a sigh, brushes in the second verse.
function heartKit(bar: number, opts: { fuller?: boolean } = {}) {
  const at = bar * 16;
  drums.push([at, DRUM.kick, 1, 0.66], [at + 10, DRUM.kick, 1, 0.5]);
  drums.push([at + 8, DRUM.rim, 1, opts.fuller ? 0.4 : 0.3]);
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.shaker, 0.5, opts.fuller ? 0.09 : 0.06]);
  if (opts.fuller) {
    for (const s of [4, 12]) drums.push([at + s, DRUM.snare, 1, 0.4]);
    drums.push([at + 6, DRUM.hatClosed, 0.5, 0.16]);
  }
}

// Half-time argument stomp.
function stompKit(bar: number, opts: { crash?: boolean; fill?: boolean } = {}) {
  const at = bar * 16;
  drums.push([at, DRUM.kick, 1, 0.86], [at + 8, DRUM.kick, 1, 0.7], [at + 14, DRUM.kick, 1, 0.5]);
  for (const s of [4, 12]) drums.push([at + s, DRUM.snare, 1, 0.6], [at + s, DRUM.clap, 1, 0.24]);
  for (const s of [2, 6, 10, 14]) drums.push([at + s, DRUM.hatClosed, 0.6, 0.2]);
  if (opts.crash) drums.push([at, DRUM.crash, 5, 0.42]);
  if (opts.fill) drums.push([at + 12, DRUM.tomMid, 0.5, 0.44], [at + 14, DRUM.tomLow, 0.5, 0.48]);
}

// The wandering pentatonic hook (D minor pentatonic), one thought at a time.
const HOOK: Note[][] = [
  [
    [0, 74, 2, 0.62],
    [2, 77, 2, 0.6],
    [4, 79, 3, 0.66],
    [8, 81, 2, 0.64],
    [10, 79, 2, 0.6],
    [12, 77, 4, 0.62],
  ],
  [
    [0, 74, 2, 0.62],
    [2, 77, 2, 0.6],
    [4, 84, 3, 0.7],
    [8, 81, 2, 0.64],
    [10, 79, 2, 0.6],
    [12, 74, 4, 0.62],
  ],
  [
    [0, 81, 2, 0.66],
    [2, 79, 2, 0.62],
    [4, 77, 3, 0.64],
    [8, 74, 2, 0.6],
    [10, 77, 2, 0.6],
    [12, 79, 4, 0.64],
  ],
  [
    [0, 84, 4, 0.7],
    [4, 81, 2, 0.64],
    [6, 79, 2, 0.62],
    [8, 77, 4, 0.64],
    [12, 79, 2, 0.6],
    [14, 81, 2, 0.64],
  ],
];
const verse1Melody: Note[][] = [
  [
    [0, 62, 4, 0.66],
    [6, 65, 2, 0.58],
    [8, 67, 4, 0.68],
    [12, 65, 2, 0.58],
    [14, 62, 2, 0.56],
  ],
  [
    [0, 58, 4, 0.64],
    [4, 60, 2, 0.58],
    [6, 62, 2, 0.6],
    [8, 65, 6, 0.66],
    [14, 63, 2, 0.56],
  ],
  [
    [0, 65, 4, 0.66],
    [4, 67, 2, 0.6],
    [6, 69, 2, 0.62],
    [8, 72, 6, 0.7],
    [14, 70, 2, 0.6],
  ],
  [
    [0, 67, 4, 0.66],
    [4, 65, 2, 0.6],
    [6, 63, 2, 0.58],
    [8, 62, 6, 0.64],
    [14, 60, 2, 0.56],
  ],
];
const verse2Melody: Note[][] = [
  [
    [0, 74, 3, 0.74],
    [4, 72, 1, 0.6],
    [5, 70, 3, 0.68],
    [8, 69, 2, 0.66],
    [10, 67, 2, 0.62],
    [12, 65, 4, 0.66],
  ],
  [
    [0, 70, 4, 0.7],
    [4, 69, 2, 0.64],
    [6, 67, 2, 0.64],
    [8, 65, 6, 0.68],
    [14, 67, 2, 0.62],
  ],
  [
    [0, 72, 4, 0.72],
    [4, 74, 2, 0.68],
    [6, 77, 2, 0.72],
    [8, 81, 6, 0.78],
    [14, 79, 2, 0.66],
  ],
  [
    [0, 77, 4, 0.74],
    [4, 76, 2, 0.66],
    [6, 74, 2, 0.66],
    [8, 72, 6, 0.72],
    [14, 70, 2, 0.62],
  ],
];

// Intro: the hook alone with a pad — the thought before anyone speaks.
for (let i = 0; i < 4; i++) {
  phrase(hook, i, HOOK[i]);
  pad.push(...verse[i][2].map((pitch): Note => [i * 16, pitch, 15.5, 0.26]));
}

const LOOP = 4;
let bar = LOOP;

// Verse 1: the low voice, wounded and quiet.
verse.forEach((chord, i) => {
  pick(bar, chord, 1);
  heartKit(bar);
  phrase(voice1, bar, verse1Melody[i % 4]);
  if (i % 2 === 1) phrase(hook, bar, HOOK[(i - 1) % 4], 0.5);
  bar++;
});

// Verse 2: the answer, sharper; the bass moves in between them.
verse.forEach((chord, i) => {
  pick(bar, chord, 1);
  heartKit(bar, { fuller: i >= 4 });
  subBass(bar, chord[0], 1);
  phrase(voice2, bar, verse2Melody[i % 4]);
  strings.push(...chord[2].map((pitch): Note => [bar * 16, pitch, 15.5, 0.2]));
  if (i % 2 === 1) phrase(hook, bar, HOOK[(i - 1) % 4], 0.6);
  bar++;
});

// Chorus: the argument — half-time stomp, hook doubled an octave up, both voices, choir neutral.
function chorusBars(big: boolean) {
  chorus.forEach((chord, i) => {
    stompKit(bar, { crash: i === 0 || i === 4, fill: i === 7 });
    pick(bar, chord, 1);
    subBass(bar, chord[0], 1);
    phrase(hook, bar, HOOK[i % 4], big ? 1 : 0.9);
    phrase(hook, bar, HOOK[i % 4], 0.5, 12);
    phrase(voice1, bar, verse2Melody[i % 4], big ? 0.85 : 0.7, -12);
    phrase(voice2, bar, verse2Melody[i % 4], 0.6);
    strings.push(...chord[2].map((pitch): Note => [bar * 16, pitch, 15.5, big ? 0.36 : 0.28]));
    choir.push(...chord[2].map((pitch): Note => [bar * 16, pitch + 12, 15.5, big ? 0.4 : 0.3]));
    bar++;
  });
}
chorusBars(false);
chorusBars(true);

// Empty room: everything stops but the hook and a held pad; the heartbeat slows.
for (let i = 0; i < 4; i++) {
  const chord = chorus[i];
  phrase(hook, bar, HOOK[i], 0.5);
  pad.push(...chord[2].map((pitch): Note => [bar * 16, pitch, 15.5, 0.3]));
  drums.push([bar * 16, DRUM.kick, 1, 0.4]);
  if (i === 3) for (const s of [12, 13, 14, 15]) drums.push([bar * 16 + s, DRUM.shaker, 0.5, 0.08 + (s - 12) * 0.04]);
  bar++;
}

// Build: the pulse comes back.
for (let i = 0; i < 4; i++) {
  const chord = chorus[4 + i];
  const spacing = i < 2 ? 2 : 1;
  for (let s = 0; s < 16; s += spacing) drums.push([bar * 16 + s, DRUM.snare2, 0.45, Math.min(0.85, 0.3 + i * 0.14)]);
  pick(bar, chord, 0.7 + i * 0.08);
  subBass(bar, chord[0], 0.7);
  strings.push(...chord[2].map((pitch): Note => [bar * 16, pitch, 15.5, 0.22 + i * 0.03]));
  bar++;
}

export default {
  title: "Somebody That I Used to Know (16-Bit Remake)",
  bpm: 118,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.55,
  echoBeats: 0.75,
  echoFeedback: 0.28,
  parts: [
    { inst: "ocarina", notes: voice1, vol: 0.58, pan: -0.18, reverb: 0.32, echo: 0.18 },
    { inst: "flute", notes: voice2, vol: 0.58, pan: 0.18, reverb: 0.32, echo: 0.18 },
    { inst: "marimba", notes: hook, vol: 0.52, pan: 0.05, reverb: 0.28, echo: 0.22 },
    { inst: "guitar", notes: arps, vol: 0.46, pan: -0.3, reverb: 0.2 },
    { inst: "strings", notes: strings, vol: 0.2, pan: 0.3, reverb: 0.42 },
    { inst: "choir", notes: choir, vol: 0.22, pan: 0.25, reverb: 0.45 },
    { inst: "bass_finger", notes: bass, vol: 0.54, pan: 0, reverb: 0.05 },
    { inst: "pad", notes: pad, vol: 0.22, pan: 0, reverb: 0.4 },
    { inst: "drums", notes: drums, vol: 0.62, pan: 0, reverb: 0.12 },
  ],
} satisfies Song;
