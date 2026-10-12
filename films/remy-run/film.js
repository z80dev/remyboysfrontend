// REMY RUN — a 15 s "gameplay capture" of an OutRun-style arcade racer: a Remy with hair floors a red convertible
// through Hairline Beach and Cabald Canyon, outrunning (and bumping off the road) the bald Cabald.
// The game renders at a native 640×360 and is upscaled 3× nearest; post adds a light CRT, bloom and grain.
// Production: procedural roadside/car art; authentic Quest #42 hero and canonical bald traffic/crew.
// The 128 BPM original FM score shares hit-stop-aware cues with the race; the HUD is composited after post.
import { W, H } from 'filmkit/lib.js';
import { LW, LH, T_TITLE, T_RACE, T_END, DURATION, filmT, G, BOSS_LAND, RADIO_OK } from './choreo.js';
import { prepareGame, drawRace } from './game.js';
import { prepareScenes, drawTitle, drawRadio, drawEnding, ENDING_FW } from './scenes.js';
import { score } from './score.js';

const blit = (ctx, low) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, LW, LH, 0, 0, W, H);
};
const look = { crt: 0.14, vignette: 0.6, grain: 0.014, aber: 0.0006, sat: 1.08, contrast: 1.04 };

export default {
  title: 'REMY RUN — The Cabald Chase',
  output: 'remy-run.mp4',
  duration: DURATION,
  fonts: [{ family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href }],
  async prepare() {
    await prepareGame();
    await prepareScenes();
  },
  shots: [
    { name: 'title', t0: 0, t1: T_TITLE, draw(ctx, lt) { blit(ctx, drawTitle(lt)); }, fx: () => ({ ...look, bloom: 0.4, bloomThresh: 0.62 }) },
    { name: 'radio', t0: T_TITLE, t1: T_RACE, draw(ctx, lt, d, t) { blit(ctx, drawRadio(lt, t)); }, fx: () => ({ ...look, bloom: 0.32, bloomThresh: 0.66 }) },
    {
      name: 'race',
      t0: T_RACE,
      t1: T_END,
      draw(ctx, lt, d, t, overlay) {
        const race = drawRace(lt);
        blit(ctx, race.low);
        blit(overlay, race.hud);
      },
      fx: (lt, t) => {
        const nitro = t >= filmT(G.nitro) && t < filmT(G.boss + 0.5);
        return { ...look, bloom: 0.26, bloomThresh: 0.72, aber: nitro ? 0.001 : look.aber };
      },
    },
    { name: 'ending', t0: T_END, t1: DURATION, draw(ctx, lt) { blit(ctx, drawEnding(lt)); }, fx: () => ({ ...look, bloom: 0.34, bloomThresh: 0.66 }) },
  ],
  flashes: [
    [0.32, 0.3, 0.1], [RADIO_OK, 0.18, 0.08], [filmT(G.launch), 0.15, 0.08], [filmT(G.bump), 0.22, 0.07], [filmT(G.check), 0.25, 0.12],
    [filmT(G.nitro), 0.35, 0.12], [filmT(G.smashE), 0.22, 0.06], [filmT(G.smashF), 0.25, 0.06], [filmT(G.boss), 0.55, 0.16],
    [filmT(BOSS_LAND), 0.25, 0.1], [filmT(G.goal), 0.4, 0.14], ...ENDING_FW.map((f) => [T_END + f.t, 0.1, 0.08]),
  ],
  score,
  audio: { seed: 7, reverb: 1.6, reverbGain: 0.32 },
  lint: { safe: { margin: 0.03 } },
};
