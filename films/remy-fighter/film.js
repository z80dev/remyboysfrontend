// REMY FIGHTER II — THE WORLD HAIRIOR. A 15 s versus-fighter "gameplay capture": attract title, player select,
// VS screen, then one round on the Neon Alley stage where Remy (#42) perfects the Cabald boss M.BALDSON (#1217).
// The game renders at a native 960×540 and is upscaled 2× nearest; post adds a light CRT, bloom on the neon and grain.
// Finished cue sheet: 0–3.2 s attract/select/VS; 3.2–13 s deterministic combat with contact hit-stops,
// red-lag damage, four-hit hair combo, portrait super, nine-hit KO and perfect victory; 13–15 s win quote.
// All audio is original procedural FM/pulse/formant synthesis (score.js), with no sampled game music.
import { W, H } from 'filmkit/lib.js';
import { DURATION, LW, LH, SELECT, VERSUS, FIGHT, QUOTE, filmT, FIGHT_G, SUPER_G, SUPER_D, KO_G, PERFECT_G, YOUWIN_G, BEAM_CLASH, DK_HIT, SLASH_G, warp } from './choreo.js';
import { prepareFight, drawFight } from './fight.js';
import { prepareScreens, drawTitle, drawSelect, drawVersus, drawQuote, P1_PICK, CPU_PICK, CHALLENGER } from './screens.js';
import { score } from './score.js';

const blit = (ctx, low) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, LW, LH, 0, 0, W, H);
};
const CRT = { crt: 0.14, vignette: 0.6, grain: 0.012, aber: 0.0006 };

export default {
  title: 'REMY FIGHTER II — The World Hairior',
  output: 'remy-fighter.mp4',
  duration: DURATION,
  fonts: [{ family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href }],
  async prepare() {
    await prepareFight();
    await prepareScreens();
  },
  shots: [
    {
      name: 'title', t0: 0, t1: SELECT,
      draw(ctx, lt) { blit(ctx, drawTitle(lt)); },
      fx: (lt) => ({ ...CRT, bloom: 0.45, bloomThresh: 0.6, exposure: lt < 0.05 ? -2 : 0 }),
    },
    {
      name: 'select', t0: SELECT, t1: VERSUS,
      draw(ctx, lt) { blit(ctx, drawSelect(lt)); },
      fx: () => ({ ...CRT, bloom: 0.2, bloomThresh: 0.8 }),
    },
    {
      name: 'versus', t0: VERSUS, t1: FIGHT,
      draw(ctx, lt) { blit(ctx, drawVersus(lt)); },
      fx: () => ({ ...CRT, bloom: 0.4, bloomThresh: 0.65 }),
    },
    {
      name: 'fight', t0: FIGHT, t1: QUOTE,
      draw(ctx, lt) { blit(ctx, drawFight(lt).low); },
      fx: (lt) => {
        const { stop, sl } = warp(lt);
        const sup = stop?.kind === 'super' ? 1 : 0, ko = stop?.kind === 'ko' || stop?.kind === 'slow' ? 1 : 0;
        return { ...CRT, bloom: 0.32 + 0.15 * sup, bloomThresh: 0.72, aber: 0.0006 + 0.0012 * sup + 0.001 * ko * (stop?.kind === 'ko' ? 1 : Math.max(0, 1 - sl)), sat: 1.08, contrast: 1.04 };
      },
    },
    {
      name: 'quote', t0: QUOTE, t1: DURATION,
      draw(ctx, lt) { blit(ctx, drawQuote(lt)); },
      fx: () => ({ ...CRT, bloom: 0.3, bloomThresh: 0.7 }),
    },
  ],
  flashes: [
    [0.12, 0.3, 0.08], [0.4, 0.45, 0.1], [SELECT + P1_PICK, 0.15, 0.06], [SELECT + CPU_PICK, 0.12, 0.06], [VERSUS + 0.2, 0.35, 0.1],
    [filmT(FIGHT_G), 0.25, 0.08], [filmT(SLASH_G), 0.1, 0.05], [filmT(DK_HIT), 0.15, 0.06], [filmT(SUPER_G), 0.3, 0.08], [filmT(SUPER_G) + SUPER_D, 0.45, 0.12],
    [filmT(BEAM_CLASH), 0.2, 0.08], [filmT(KO_G), 0.4, 0.25], [filmT(YOUWIN_G), 0.12, 0.08], [filmT(PERFECT_G), 0.2, 0.08], [QUOTE + CHALLENGER, 0.3, 0.1],
  ],
  score,
  audio: { seed: 42, reverb: 1.4, reverbGain: 0.3 },
  lint: { safe: { margin: 0.03 } },
};
