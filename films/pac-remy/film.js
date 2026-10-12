// PAC-REMY — a 15 s maze-chase "gameplay capture": a Remy with hair clears Round 1 and eats the Cabald
// (four bald Remys) in a 200-400-800-1600 chain. The game renders at a native 960×540 (the intermission
// at 640×360) and is upscaled with nearest-neighbour; post adds CRT, bloom and grain.
// Round cues and legal corridor tracks live in choreo.js. The tonic lands at 4.51 s; the solved
// 200/400/800/1600 catches land at 5.21/5.84/6.80/8.37 s, followed by MANE MAGNET and a 6120 clear.
// The 11.09–13.19 s hair-break gag exposes Chromey's wig; the final chase ends with an iris close.
// Score and arcade effects are original pulse/triangle/noise synthesis, with no sampled game audio.
import { W, H } from 'filmkit/lib.js';
import { INTRO, MAZE_END, INTER_END, DURATION, LW, LH, filmT, TONIC_G, EATS, CLEAR, VORTEX } from './choreo.js';
import { prepareGame, drawRound } from './game.js';
import { prepareScenes, drawTitle, drawIntermission, drawHiscore, INTER } from './scenes.js';
import { score } from './score.js';

const blit = (ctx, low) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, low.width, low.height, 0, 0, W, H);
};
const ARCADE = { crt: 0.16, vignette: 0.7, grain: 0.012, aber: 0.0007, sat: 1.08, contrast: 1.04 };

export default {
  title: 'PAC-REMY — Round 1',
  output: 'pac-remy.mp4',
  duration: DURATION,
  fonts: [{ family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href }],
  async prepare() {
    await prepareGame();
    prepareScenes();
  },
  shots: [
    {
      name: 'attract',
      t0: 0,
      t1: INTRO,
      draw(ctx, lt) { blit(ctx, drawTitle(lt)); },
      fx: (lt) => ({ ...ARCADE, bloom: 0.55, bloomThresh: 0.45, exposure: lt < 0.05 ? -2 : 0 }),
    },
    {
      name: 'round-1',
      t0: INTRO,
      t1: MAZE_END,
      draw(ctx, lt) { blit(ctx, drawRound(lt).low); },
      fx: () => ({ ...ARCADE, bloom: 0.7, bloomThresh: 0.35, bloomWide: 0.8 }),
    },
    {
      name: 'hair-break',
      t0: MAZE_END,
      t1: INTER_END,
      draw(ctx, lt) { blit(ctx, drawIntermission(lt)); },
      fx: (lt) => ({ ...ARCADE, bloom: 0.5, bloomThresh: 0.4, fade: Math.max(0, 1 - lt / 0.12) }),
    },
    {
      name: 'high-scores',
      t0: INTER_END,
      t1: DURATION,
      draw(ctx, lt, dur) { blit(ctx, drawHiscore(lt, dur)); },
      fx: () => ({ ...ARCADE, bloom: 0.55, bloomThresh: 0.4 }),
    },
  ],
  flashes: [
    [0.2, 0.3, 0.08],
    [filmT(TONIC_G), 0.3, 0.1],
    ...EATS.map((e) => [filmT(e.g), e.n === 3 ? 0.35 : 0.14, e.n === 3 ? 0.12 : 0.06]),
    [filmT(VORTEX.g1), 0.35, 0.12],
    [filmT(CLEAR.g0), 0.2, 0.06],
    [MAZE_END + INTER.pop, 0.25, 0.08],
  ],
  score,
  audio: { seed: 23, reverb: 1.1, reverbGain: 0.2 },
  lint: { safe: { margin: 0.03 } },
};
