// THE HAIR APPARENT — a Remy Boys silent film (1922). Academy ratio (1440×1080 pillarboxed in
// 1920×1080), hand-cranked 16 fps world motion, projector flicker/weave/scratches, ragtime piano.
import { H, W, hash } from "filmkit/lib.js";
import { prepareArt, wear } from "./art.js";
import * as D from "./scenes.js";
import { score } from "./score.js";
import { DURATION, OX, RESCUE, SH, SW, T, filmT, weave } from "./timeline.js";

const LIM = '"Limelight"';
const RYE = '"Rye"';
const SER = '"Cormorant Garamond"';
const INK = "#241708";

const ART = {};

// frame(): clip to the Academy stage, apply gate weave, repaint the bars over any bleed, add wear.
function frame(ctx, t, seed, paint) {
  const fq = Math.floor(t * 16);
  const wv = weave(fq, seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(OX, 0, SW, SH);
  ctx.clip();
  ctx.translate(Math.round(OX + wv.x), Math.round(wv.y));
  paint();
  ctx.restore();
  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, OX + 3, H);
  ctx.fillRect(W - OX - 3, 0, OX + 3, H);
  wear(ctx, t, seed, OX);
}

// nitrate print look: desaturate, warm the tint, flicker the lamp house
const flicker = (t, base = 0) => base + 0.05 * (hash(Math.floor(t * 18) * 17 + 3) - 0.5) + 0.018 * Math.sin(t * 0.9);
const FX = {
  card: {
    sat: 0.02,
    tint: [1.1, 0.96, 0.76],
    contrast: 1.05,
    grain: 0.095,
    weave: 0.4,
    vignette: 1.05,
    bloom: 0.04,
    bloomThresh: 0.9,
  },
  street: {
    sat: 0.03,
    tint: [1.1, 0.965, 0.78],
    contrast: 1.06,
    grain: 0.08,
    vignette: 1.18,
    bloom: 0.1,
    bloomThresh: 0.86,
    weave: 0.22,
  },
  rail: {
    sat: 0.03,
    tint: [1.1, 0.96, 0.77],
    contrast: 1.07,
    grain: 0.085,
    vignette: 1.22,
    bloom: 0.12,
    bloomThresh: 0.84,
    weave: 0.22,
  },
  finale: {
    sat: 0.02,
    tint: [1.16, 0.92, 0.68],
    contrast: 1.1,
    grain: 0.09,
    vignette: 1.35,
    bloom: 0.16,
    bloomThresh: 0.8,
    weave: 0.22,
    exposure: -0.22,
  },
};
const fxOf =
  (look, exp = 0) =>
  (lt, t) => ({ ...FX[look], exposure: flicker(t, exp) });

const SHOTS = [
  { name: "title", look: "card", draw: (x, lt) => D.drawTitle(x, ART, lt) },
  { name: "parlour", look: "street", draw: (x, lt) => D.drawParlour(x, ART, lt) },
  { name: "snatch", look: "street", draw: (x, lt) => D.drawSnatch(x, ART, lt) },
  { name: "cardPeril", look: "card", draw: (x, lt) => D.drawCardPeril(x, ART, lt) },
  { name: "tracks", look: "rail", draw: (x, lt) => D.drawTracks(x, ART, lt) },
  { name: "cardHero", look: "card", draw: (x, lt) => D.drawCardHero(x, ART, lt) },
  { name: "rescue", look: "rail", draw: (x, lt) => D.drawRescue(x, ART, lt) },
  { name: "finale", look: "finale", draw: (x, lt, dur, t) => D.drawFinale(x, ART, lt, t) },
  { name: "finis", look: "card", draw: (x, lt) => D.drawFinis(x, ART, lt) },
];
const KEYS = Object.keys(T).slice(0, -1); // title..finis (drop `end`)

export default {
  title: "THE HAIR APPARENT — a Remy Boys silent film",
  output: "hair-apparent.mp4",
  duration: DURATION,
  fonts: [
    { family: "Limelight", url: new URL("./fonts/limelight.woff2", import.meta.url).href },
    { family: "Rye", url: new URL("./fonts/rye.woff2", import.meta.url).href },
  ],
  async prepare() {
    Object.assign(ART, await prepareArt());
  },
  shots: SHOTS.map((s, i) => ({
    name: s.name,
    t0: T[KEYS[i]],
    t1: T[KEYS[i + 1]] ?? DURATION,
    draw(ctx, lt, dur, t) {
      frame(ctx, t, i * 31 + 7, () => s.draw(ctx, lt, dur, t));
    },
    fx: fxOf(s.look),
  })),
  flashes: [[filmT(RESCUE.clash), 0.13, 0.3]], // steel clash — kept low: sepia mid-tones grey out above ~0.3
  captionStyles: () => ({
    presents: { font: RYE, size: 44, color: INK, y: 500, anim: "fade", in: 0.4, out: 0.35, track: 2 },
    title: { font: LIM, size: 100, color: INK, y: 452, anim: "fade", in: 0.35, out: 0.3, track: 2 },
    subtitle: { font: SER, weight: 500, size: 42, color: "#4a3416", y: 596, anim: "fade", in: 0.5, out: 0.35 },
    inter: { font: LIM, size: 56, color: INK, y: 520, lineHeight: 1.4, anim: "fade", in: 0.45, out: 0.35 },
    quote: {
      font: SER,
      weight: 600,
      size: 46,
      color: "#3c2a12",
      y: 648,
      lineHeight: 1.4,
      anim: "fade",
      in: 0.5,
      out: 0.4,
    },
    dusk: {
      font: SER,
      weight: 600,
      size: 46,
      color: "#f6ead0",
      y: 250,
      anim: "fade",
      in: 0.6,
      out: 0.4,
      shadow: "#241708",
    },
    finis: { font: LIM, size: 130, color: INK, y: 470, anim: "fade", in: 0.6, out: 0.5, track: 4 },
    credit: { font: RYE, size: 30, color: "#4a3416", y: 762, anim: "fade", in: 0.5, out: 0.4, track: 1 },
  }),
  captions: [
    { id: "presents", style: "presents", text: "REMY BOYS PICTURES PRESENTS", t0: 0.7, t1: 3.4, minHold: 1.8 },
    { id: "title", style: "title", text: "THE HAIR APPARENT", t0: 3.45, t1: 7.3 },
    { id: "subtitle", style: "subtitle", text: "A MELODRAMA IN THREE REELS", t0: 3.45, t1: 7.3 },
    {
      id: "peril",
      style: "inter",
      text: "MISS TRESSES, TIED TO THE TRACKS!\nTHE 5:15 TO BALDVILLE — DUE ANY MOMENT!",
      t0: 30.5,
      t1: 34.5,
    },
    { id: "hero", style: "inter", text: "NEVER FEAR!\nFAIRHAIR IS HERE!", t0: 46.6, t1: 50.5 },
    { id: "dusk", style: "dusk", text: "AND SO THE HAIRLOOM WAS RESTORED", t0: 66.2, t1: 70.6 },
    { id: "finis", style: "finis", text: "FINIS", t0: 72.7, t1: 78.7 },
    { id: "noharm", style: "quote", text: "NO HAIRS WERE HARMED\nIN THE MAKING OF THIS PICTURE", t0: 74.6, t1: 78.7 },
    { id: "credit", style: "credit", text: "REMY BOYS PICTURES · MMXXVI", t0: 74.6, t1: 78.7 },
  ],
  score,
  audio: { seed: 42, reverb: 1.7, reverbGain: 0.3 },
  lint: { captionHold: 3 },
};
