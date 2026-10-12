// POKéREMY — HAIR VERSION: a 15 s Game Boy Color-era monster battle "capture". A wild BALD REMY (the Cabald)
// jumps REMY in the tall grass of Route 42; HAIR WHIP, HEAD SHINE, SUPER SHAMPOO, a faint, a level up and an
// evolution. Native 640×360 (overworld 320×180) upscaled nearest, with an LCD pixel grid; the score is a 4-channel
// GB-style synth (2 pulses, wave, noise) with every SFX synthesized.
// Finished cut: readable fixed-size reward popups and an immediate post-reveal evolution announcement.
// All animation samples choreography time directly; the retained Remy Bros sprite loader is read-only.
import { W, H } from 'filmkit/lib.js';
import { DURATION, LW, LH, OW, OH, TITLE, ROUTE, BATTLE0, EVO0, EV, B, filmT } from './choreo.js';
import { prepareGame, drawTitle, drawRoute, drawBattle, drawEvolution } from './game.js';
import { canvas } from './art.js';
import { score } from './score.js';

const grids = {};
// LCD pixel grid: faint dark seams between the big pixels (k = screen pixels per native pixel).
function grid(k) {
  if (grids[k]) return grids[k];
  const c = canvas(W, H), x = c.getContext('2d');
  x.fillStyle = 'rgba(10,14,28,0.16)';
  for (let i = k - 1; i < W; i += k) x.fillRect(i, 0, 1, H);
  for (let j = k - 1; j < H; j += k) x.fillRect(0, j, W, 1);
  return (grids[k] = c);
}
const blit = (ctx, low, w, h) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, w, h, 0, 0, W, H);
  ctx.drawImage(grid(Math.round(W / w)), 0, 0);
};
const LCD = { vignette: 0.5, grain: 0.012, aber: 0.0004, crt: 0.03 };

export default {
  title: 'POKéREMY — Hair Version',
  output: 'pokeremy.mp4',
  duration: DURATION,
  fonts: [{ family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href }],
  async prepare() {
    await prepareGame();
  },
  shots: [
    {
      name: 'title',
      t0: TITLE.t0,
      t1: TITLE.t1,
      draw(ctx, lt) { blit(ctx, drawTitle(lt), LW, LH); },
      fx: (lt) => ({ ...LCD, bloom: 0.3, bloomThresh: 0.72, sat: 1.05, exposure: lt < 0.04 ? -2 : 0 }),
    },
    {
      name: 'route',
      t0: ROUTE.t0,
      t1: ROUTE.t1,
      draw(ctx, lt) { blit(ctx, drawRoute(lt), OW, OH); },
      fx: () => ({ ...LCD, bloom: 0.1, bloomThresh: 0.92, sat: 1.04 }),
    },
    {
      name: 'battle',
      t0: BATTLE0,
      t1: EVO0,
      draw(ctx, lt) { blit(ctx, drawBattle(lt).low, LW, LH); },
      fx: () => ({ ...LCD, bloom: 0.12, bloomThresh: 0.92, sat: 1.04 }),
    },
    {
      name: 'evolution',
      t0: EVO0,
      t1: DURATION,
      draw(ctx, lt) { blit(ctx, drawEvolution(lt), LW, LH); },
      fx: (lt) => (lt < EV.end
        ? { ...LCD, bloom: 0.35, bloomThresh: 0.93, sat: 1.08 }
        : { ...LCD, bloom: 0.18, bloomThresh: 0.9, sat: 1.05, fade: Math.max(0, (lt - (DURATION - EVO0 - 0.2)) / 0.2) }),
    },
  ],
  flashes: [[0.24, 0.25, 0.08], [filmT(B.impact), 0.3, 0.1], [filmT(B.pop), 0.15, 0.08], [EVO0 + EV.reveal, 0.6, 0.25], [EVO0 + EV.end, 0.3, 0.1]],
  score,
  audio: { seed: 42, reverb: 1.0, reverbGain: 0.2 },
  lint: { safe: { margin: 0.03 } },
};
