import { DRUM, type Note, type Song } from '../../quest/music/song'

/**
 * "Remy Whippin' Intro" — D major, 150 BPM, a once-only startup sting (loopStart = length, ~6.4 s plus tail).
 * Amiga-cracktro fanfare: a whip crack, a two-octave pulse sweep over a snare roll, then a ♭VI–♭VII–I brass climb
 * (B♭ "da-da-DAA", C "da-da-DAA", a 32nd pickup) landing on a held D major with a tracker-style chord arpeggio,
 * glockenspiel sparkle and a timpani roll ringing into the reverb.
 */
const lead: Note[] = []
const arp: Note[] = []
const brass: Note[] = []
const hit: Note[] = []
const strings: Note[] = []
const bass: Note[] = []
const bell: Note[] = []
const pad: Note[] = []
const piano: Note[] = []
const timpani: Note[] = []
const drums: Note[] = []

// Bar 0: the crack, then the sweep climbs while the snare roll tightens from 16ths to 32nds.
drums.push([0, DRUM.clap, 1, 1], [0, DRUM.snare2, 1, 0.8], [0, DRUM.rim, 1, 0.9], [0, DRUM.hatOpen, 2, 0.6])
for (const [i, pitch] of [50, 52, 57, 62, 64, 69, 74, 76, 81, 86, 88, 93].entries()) {
  arp.push([2 + i, pitch, 1.3, 0.5 + i * 0.03])
}
bass.push([2, 38, 13, 0.7])
for (let i = 0; i < 4; i++) drums.push([8 + i, DRUM.snare, 0.5, 0.32 + i * 0.06])
for (let i = 0; i < 8; i++) drums.push([12 + i * 0.5, DRUM.snare, 0.4, 0.55 + i * 0.05])
for (let i = 0; i < 8; i++) timpani.push([8 + i, 45, 1.2, 0.25 + i * 0.05])

// Bar 1: B♭ then C, each a rising triad with matching section stabs.
const climb: [at: number, bassNote: number, chord: number[], tune: number[]][] = [
  [16, 34, [58, 62, 65, 70], [74, 77, 82]],
  [24, 36, [60, 64, 67, 72], [76, 79, 84]],
]
for (const [at, bassNote, chord, tune] of climb) {
  lead.push([at, tune[0], 1.8, 0.86], [at + 2, tune[1], 1.8, 0.88], [at + 4, tune[2], 3.6, 0.94])
  for (const [offset, length, velocity] of [[0, 1.6, 0.8], [2, 1.6, 0.74], [4, 3.4, 0.9]]) {
    for (const pitch of chord) brass.push([at + offset, pitch, length, velocity])
  }
  for (const pitch of chord) hit.push([at, pitch, 3, 0.8])
  bass.push([at, bassNote, 3.6, 0.9], [at + 4, bassNote, 3.6, 0.85])
  timpani.push([at, bassNote + 12, 3, 0.85])
  drums.push([at, DRUM.kick, 1, 1], [at, DRUM.crash, 4, 0.5], [at + 2, DRUM.kick, 1, 0.75])
  drums.push([at + 4, DRUM.kick, 1, 0.95], [at + 4, DRUM.snare, 1, 0.85])
}
// The 32nd pickup run into the tonic.
for (const [i, pitch] of [81, 83, 84, 85].entries()) lead.push([30 + i * 0.5, pitch, 0.45, 0.72 + i * 0.05])
drums.push([29, DRUM.tomHigh, 1, 0.7], [30, DRUM.tomMid, 1, 0.78], [31, DRUM.tomLow, 1, 0.86])

// Bar 2+: the big D major. Voices let go from the top down while piano and pad decay into the reverb.
const tonic = [62, 66, 69, 74]
lead.push([32, 86, 20, 0.92])
for (const pitch of tonic) brass.push([32, pitch, 18, 0.86])
for (const [i, pitch] of [78, 74, 69, 66, 62, 57, 50].entries()) strings.push([32, pitch, 20 + i, 0.72])
for (const pitch of [50, 57, 62, 66, 69]) pad.push([32, pitch, 30, 0.62])
for (const pitch of [38, 50, 57, 62, 66, 69, 74]) piano.push([32, pitch, 30, 0.78])
for (const pitch of tonic) hit.push([32, pitch, 4, 0.95])
bass.push([32, 38, 20, 1])
timpani.push([32, 38, 5, 1])
for (let i = 0; i < 16; i++) timpani.push([38 + i * 0.5, 38, 0.8, 0.5 - i * 0.02])
drums.push([32, DRUM.kick, 1, 1], [32, DRUM.crash, 8, 0.9], [32, DRUM.clap, 1, 0.7], [32, DRUM.snare, 1, 0.8])
for (const [i, pitch] of [74, 78, 81, 86, 90, 93].entries()) bell.push([32 + i, pitch, 10, 0.62 - i * 0.03])
// Tracker chord arpeggio (root–3rd–5th–octave at 32nds), dying away under the echo.
for (let i = 0; i < 40; i++) arp.push([32 + i * 0.5, [74, 78, 81, 86][i % 4], 0.45, 0.62 - i * 0.012])

export default {
  title: "Remy Whippin' Intro",
  bpm: 150,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 64,
  loopStart: 64,
  room: 0.75,
  echoBeats: 0.75,
  echoFeedback: 0.32,
  parts: [
    { inst: 'square', notes: lead, vol: 0.5, pan: 0, reverb: 0.22, echo: 0.22 },
    { inst: 'square50', notes: arp, vol: 0.34, pan: 0.3, reverb: 0.2, echo: 0.3 },
    { inst: 'brass', notes: brass, vol: 0.24, pan: -0.15, reverb: 0.3 },
    { inst: 'orch_hit', notes: hit, vol: 0.2, pan: 0, reverb: 0.35 },
    { inst: 'strings', notes: strings, vol: 0.19, pan: -0.3, reverb: 0.4 },
    { inst: 'bass_saw', notes: bass, vol: 0.42, pan: 0, reverb: 0.05 },
    { inst: 'pad', notes: pad, vol: 0.24, pan: 0.2, reverb: 0.5 },
    { inst: 'piano', notes: piano, vol: 0.3, pan: -0.1, reverb: 0.45 },
    { inst: 'bell', notes: bell, vol: 0.3, pan: 0.4, reverb: 0.5, echo: 0.2 },
    { inst: 'timpani', notes: timpani, vol: 0.38, pan: -0.1, reverb: 0.3 },
    { inst: 'drums', notes: drums, vol: 0.5, pan: 0, reverb: 0.14 },
  ],
} satisfies Song
