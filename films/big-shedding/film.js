import { prepareArt } from "./art.js";
import { drawClub, drawDawn, drawFight, drawOffice, drawStreet, drawTrail } from "./scenes.js";
import { score } from "./score.js";
// THE BIG SHEDDING — a Remy noir. 74 s, 2.39:1 letterbox held throughout.
// Six acts, one post look per act; VO + dialogue as declarative captions.
import { COPY, FIGHT, SHOTS, T, fightFilmT } from "./timeline.js";

const DRAWS = {
  street: drawStreet,
  office: drawOffice,
  trail: drawTrail,
  club: drawClub,
  fight: drawFight,
  dawn: drawDawn,
};

// one post look per act; letterbox never lifts
const FX = {
  street: (lt) => ({
    letterbox: 1,
    vignette: 1.05,
    grain: 0.016,
    bloom: 0.16,
    bloomThresh: 0.78,
    streak: 0.12,
    sat: 0.62,
    tint: [0.94, 0.99, 1.1],
    contrast: 1.06,
    exposure: lt < 0.35 ? -0.9 * (1 - lt / 0.35) : 0,
    fade: Math.max(0, 1 - lt / 0.5),
  }),
  office: () => ({
    letterbox: 1,
    vignette: 0.95,
    grain: 0.015,
    bloom: 0.12,
    bloomThresh: 0.8,
    sat: 0.58,
    tint: [0.95, 0.98, 1.08],
    contrast: 1.05,
    exposure: 0.14,
  }),
  trail: () => ({
    letterbox: 1,
    vignette: 1.0,
    grain: 0.016,
    bloom: 0.15,
    bloomThresh: 0.78,
    streak: 0.1,
    sat: 0.62,
    tint: [0.94, 0.99, 1.1],
    contrast: 1.06,
  }),
  club: () => ({
    letterbox: 1,
    vignette: 1.1,
    grain: 0.015,
    bloom: 0.18,
    bloomThresh: 0.72,
    sat: 0.68,
    tint: [1.04, 0.94, 1.02],
    contrast: 1.08,
    haze: 0.06,
    hazeColor: [0.2, 0.08, 0.12],
  }),
  fight: () => ({
    letterbox: 1,
    vignette: 1.05,
    grain: 0.017,
    bloom: 0.2,
    bloomThresh: 0.75,
    sat: 0.66,
    tint: [1.02, 0.96, 1.04],
    contrast: 1.1,
  }),
  dawn: (lt) => ({
    letterbox: 1,
    vignette: 0.6,
    grain: 0.012,
    bloom: 0.14,
    bloomThresh: 0.8,
    sat: 0.85,
    warm: 0.16,
    contrast: 1.02,
    fade: Math.max(0, Math.min(1, (lt - 12.6) / 1.0)),
  }),
};

export default {
  title: "THE BIG SHEDDING — a Remy noir",
  output: "big-shedding.mp4",
  duration: T.end,
  async prepare() {
    await prepareArt();
  },
  shots: SHOTS.map(([name, t0, t1]) => ({
    name,
    t0,
    t1,
    draw(ctx, lt, dur, t, ov) {
      DRAWS[name](ctx, lt, t, ov);
    },
    fx: FX[name],
  })),
  captionStyles: () => ({
    vo: {
      font: '"Cormorant Garamond"',
      size: 40,
      weight: 500,
      color: "#e9e4d6",
      align: "center",
      x: 960,
      y: 846,
      lineHeight: 1.28,
      anim: "fade",
      in: 0.55,
      out: 0.4,
      track: 0.5,
      shadow: "rgba(0,0,0,0.8)",
    },
    dlg: {
      font: '"Space Grotesk"',
      size: 30,
      weight: 500,
      color: "#dfe6f2",
      align: "center",
      x: 960,
      y: 856,
      lineHeight: 1.3,
      anim: "rise",
      in: 0.4,
      out: 0.35,
      rise: 12,
      shadow: "rgba(0,0,0,0.85)",
    },
  }),
  captions: [
    { id: "v1", style: "vo", text: COPY.v1, t0: 1.2, t1: 5.6 },
    { id: "v2", style: "vo", text: COPY.v2, t0: 5.85, t1: 9.8 },
    { id: "d1", style: "dlg", text: COPY.d1, t0: 11.0, t1: 15.2 },
    { id: "d2", style: "dlg", text: COPY.d2, t0: 16.4, t1: 20.8 },
    { id: "v3", style: "vo", text: COPY.v3, t0: 24.4, t1: 28.4 },
    { id: "d3", style: "dlg", text: COPY.d3, t0: 29.8, t1: 34.0 },
    // VO bridges the trail→club cut on purpose
    { id: "v4", style: "vo", text: COPY.v4, t0: 34.45, t1: 38.6, span: true },
    { id: "d4", style: "dlg", text: COPY.d4, t0: 40.2, t1: 44.4 },
    { id: "d5", style: "dlg", text: COPY.d5, t0: 45.4, t1: 49.15 },
    { id: "v5", style: "vo", text: COPY.v5, t0: 52.4, t1: 56.6 },
    { id: "v6", style: "vo", text: COPY.v6, t0: 61.2, t1: 65.2 },
  ],
  flashes: [
    [7.55, 0.22, 0.2], // street lightning (triple strobe, soft ramps)
    [7.75, 0.22, 0.2],
    [7.95, 0.28, 0.24],
    [T.client, 0.34, 0.2],
    [T.client + 0.28, 0.24, 0.16], // client arrival double-strike
    [T.client + 0.9, 0.26, 0.16],
    [fightFilmT(FIGHT.hitA), 0.26, 0.12],
    [fightFilmT(FIGHT.hitB), 0.28, 0.12],
    [fightFilmT(FIGHT.clash), 0.45, 0.16],
    [T.titleSlam, 0.2, 0.1],
  ],
  score,
  audio: { seed: 4490, reverb: 2.4, reverbGain: 0.42 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
};
