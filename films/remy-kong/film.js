// REMY KONG — a 15 s arcade "gameplay capture": a Remy with hair climbs the 25 m girders past the barrels of a giant
// bald Remy, grabs the hammer, reaches the top and brings the whole Cabald construction site down.
// The game renders at a native 960×540 and is upscaled 2× nearest; post adds CRT, bloom and grain.
import { W, H } from 'filmkit/lib.js';
import { T_TITLE, INTRO, DURATION, LW, LH, filmT, HAMMER, KONG_FALL, HEART_G, SMASH, COLLAPSE } from './choreo.js';
import { prepareGame, drawStage } from './game.js';
import { prepareCards, drawTitle, drawHowHigh, KONG_LAND } from './cards.js';
import { score } from './score.js';

const blit = (ctx, low) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, LW, LH, 0, 0, W, H);
};
const look = (o = {}) => ({ bloom: 0.32, bloomThresh: 0.62, crt: 0.2, vignette: 0.7, grain: 0.014, aber: 0.0009, sat: 1.08, contrast: 1.04, ...o });

export default {
  title: 'REMY KONG — 25 m',
  output: 'remy-kong.mp4',
  duration: DURATION,
  fonts: [{ family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href }],
  async prepare() {
    await prepareGame();
    prepareCards();
  },
  shots: [
    { name: 'title', t0: 0, t1: T_TITLE, draw(ctx, lt) { blit(ctx, drawTitle(lt)); }, fx: (lt) => look({ bloom: 0.4, exposure: lt < 0.05 ? -2 : 0 }) },
    { name: 'how-high', t0: T_TITLE, t1: INTRO, draw(ctx, lt) { blit(ctx, drawHowHigh(lt)); }, fx: () => look() },
    { name: 'stage', t0: INTRO, t1: DURATION, draw(ctx, lt) { blit(ctx, drawStage(lt).low); }, fx: () => look() },
  ],
  flashes: [[KONG_LAND, 0.25, 0.1], [filmT(HAMMER.grab), 0.3, 0.1], ...SMASH.map((s) => [filmT(s), 0.1, 0.06]), [filmT(COLLAPSE), 0.12, 0.1], [filmT(KONG_FALL.t1), 0.4, 0.14], [filmT(HEART_G), 0.15, 0.1]],
  score,
  audio: { seed: 25, reverb: 1.1, reverbGain: 0.22 },
  lint: { safe: { margin: 0.03 } },
};
