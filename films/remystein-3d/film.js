// REMYSTEIN 3D — a 15 s raycaster "gameplay capture": a Remy with hair storms Castle Baldenstein, guns down
// the Cabald's guards and their mech-suited commander HANS GLATZE, and flips the elevator switch.
// The game renders at a native 640×360 (software raycaster) and is upscaled 3× nearest; post adds a light
// CRT, bloom and grain.
import { W, H } from 'filmkit/lib.js';
import { TITLE, DURATION, LW, LH, TALLY0, filmT, BOSS, CHAINGUN_G, DAMAGE, BOOMS } from './choreo.js';
import { prepareGame, drawGame } from './game.js';
import { prepareScreens, drawTitle, drawEnd } from './screens.js';
import { score } from './score.js';

const blit = (ctx, low) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, LW, LH, 0, 0, W, H);
};

export default {
  title: 'REMYSTEIN 3D — Floor 1',
  output: 'remystein-3d.mp4',
  duration: DURATION,
  fonts: [{ family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href }],
  async prepare() {
    await prepareGame();
    prepareScreens();
  },
  shots: [
    {
      name: 'title',
      t0: 0,
      t1: TITLE,
      draw(ctx, lt) { blit(ctx, drawTitle(lt)); },
      fx: (lt) => ({ bloom: 0.5, bloomThresh: 0.55, crt: 0.18, vignette: 0.9, grain: 0.02, aber: 0.0009, exposure: lt < 0.08 ? -3 : 0, fade: Math.max(0, (lt - (TITLE - 0.08)) / 0.08) }),
    },
    {
      name: 'floor-1',
      t0: TITLE,
      t1: TALLY0,
      draw(ctx, lt) { blit(ctx, drawGame(lt).low); },
      fx: () => ({ bloom: 0.42, bloomThresh: 0.62, crt: 0.16, vignette: 0.7, grain: 0.018, aber: 0.0008, contrast: 1.06, sat: 1.08 }),
    },
    {
      name: 'tally',
      t0: TALLY0,
      t1: DURATION,
      draw(ctx, lt, dur, t) { blit(ctx, drawEnd(t)); },
      fx: (lt, t) => ({ bloom: 0.35, bloomThresh: 0.6, crt: 0.16, vignette: 0.75, grain: 0.018, aber: 0.0008, fade: Math.max(0, (t - (DURATION - 0.15)) / 0.15) }),
    },
  ],
  flashes: [
    [0.22, 0.4, 0.12],
    [filmT(CHAINGUN_G), 0.25, 0.12],
    ...DAMAGE.map(([g]) => [filmT(g), 0.12, 0.08]),
    [filmT(BOSS.death), 0.75, 0.22],
    ...BOOMS.slice(1).map((g) => [filmT(g), 0.18, 0.1]),
  ],
  score,
  audio: { seed: 3, reverb: 0.4, reverbGain: 0.1 },
  lint: { safe: { margin: 0.03 } },
};
