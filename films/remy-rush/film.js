// REMY RUSH — a 15 s Genesis-style "gameplay capture": red-haired sword Remy #42 races through HAIRLINE HILL ACT 1.
// The Cabald's bald robots free animals when defeated; Dr. Baldnik scatters Remy's rings, then loses his hover-pod.
// Native 960×540 art upscales 2× nearest; the gameplay HUD/tally bypass post. All animation and FM/SFX share choreo.js cues.
import { W, H } from 'filmkit/lib.js';
import { INTRO, DURATION, LW, LH, filmT, BOSS_HITS, BOSS_DIE, HURT_G, BADNIKS, BOOMS, SPRING_G } from './choreo.js';
import { prepareGame, drawLevel, drawBackdrop, ART, text } from './game.js';
import * as A from './art.js';
import { score } from './score.js';

let title;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const blit = (ctx, low) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, LW, LH, 0, 0, W, H);
};
const backOut = (u) => { u = clamp01(u); const s = 2.2; return 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2; };

export const START_PRESS = 1.16;
function drawTitle(lt) {
  const x = title.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  drawBackdrop(x, 200 + lt * 160, 30, lt);
  const cx = LW / 2, cy = 214;
  // emblem pops in
  const es = backOut((lt - 0.06) / 0.3);
  if (es > 0) {
    const E = ART.emblem;
    x.save(); x.translate(cx, cy); x.scale(es, es);
    x.drawImage(E, Math.round(-E.width / 2), Math.round(-E.height / 2));
    x.restore();
  }
  // Remy rises out of the emblem (clipped above the ribbon)
  const ry = 1 - backOut((lt - 0.34) / 0.3);
  if (lt > 0.34) {
    x.save();
    x.beginPath(); x.rect(0, 0, LW, 262); x.clip();
    const hop = lt > 0.95 && lt < 1.15 ? -Math.round(10 * Math.sin(((lt - 0.95) / 0.2) * Math.PI)) : 0;
    A.drawRemy(x, ART.heroNear, cx + 10, 330 + 240 * ry + hop, { quills: { c: ART.quillsNear, x: -38, y: -3 }, sx: 2, sy: 2 });
    x.restore();
  }
  // ribbon
  const rb = easeRib(lt);
  if (rb > 0) {
    const w = Math.round(560 * rb), y0 = 256, h = 62;
    x.fillStyle = '#7a1010';
    for (const s of [-1, 1]) {
      x.beginPath();
      const ex = cx + s * (w / 2 - 10);
      x.moveTo(ex, y0 + 14); x.lineTo(ex + s * 60, y0 + 14); x.lineTo(ex + s * 40, y0 + h / 2 + 14); x.lineTo(ex + s * 60, y0 + h + 14); x.lineTo(ex, y0 + h + 14); x.fill();
    }
    x.fillStyle = '#10142a'; x.fillRect(cx - w / 2 - 3, y0 - 3, w + 6, h + 6);
    x.fillStyle = '#d82828'; x.fillRect(cx - w / 2, y0, w, h);
    x.fillStyle = '#ff6a5a'; x.fillRect(cx - w / 2, y0, w, 6);
    x.fillStyle = '#a01818'; x.fillRect(cx - w / 2, y0 + h - 6, w, 6);
    if (rb >= 1) text(x, 'REMY RUSH', cx, y0 + 11, { size: 40, align: 'center', color: '#ffffff', shadow: '#10142a', outline: true });
  }
  // logo shine
  if (lt > 0.62 && lt < 0.92) {
    const sx = cx - 300 + 640 * ((lt - 0.62) / 0.3);
    x.save(); x.beginPath(); x.rect(cx - 280, 256, 560, 62); x.clip();
    x.globalAlpha = 0.55; x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(sx, 256); x.lineTo(sx + 26, 256); x.lineTo(sx - 10, 318); x.lineTo(sx - 36, 318); x.fill();
    x.restore();
  }
  // eye glint
  if (lt > 1.0 && lt < 1.2) {
    const u = (lt - 1.0) / 0.2, r = Math.round(10 * Math.sin(u * Math.PI));
    x.fillStyle = '#ffffff'; x.fillRect(cx + 40 - r, 186, r * 2 + 1, 2); x.fillRect(cx + 40, 186 - r, 2, r * 2 + 1);
  }
  if (lt > 0.62) text(x, 'VS. THE CABALD', cx, 346, { size: 16, align: 'center', color: '#ff8ab0', outline: true, alpha: clamp01((lt - 0.62) / 0.08) });
  const blinkRate = lt > START_PRESS ? 0.05 : 0.2;
  if (lt > 0.8 && Math.floor(lt / blinkRate) % 2 === 0) text(x, 'PRESS START BUTTON', cx, 404, { size: 16, align: 'center', color: '#ffffff', outline: true });
  text(x, '©2026 REMY BOYS', LW - 24, LH - 28, { size: 8, align: 'right', color: '#ffffff', outline: true });
  // fade in, and out to black after START
  const dark = Math.max(1 - clamp01(lt / 0.1), clamp01((lt - 1.3) / 0.18));
  if (dark > 0) { x.globalAlpha = dark; x.fillStyle = '#000'; x.fillRect(0, 0, LW, LH); x.globalAlpha = 1; }
  return title;
}
const easeRib = (lt) => clamp01((lt - 0.52) / 0.1) ** 0.5;

export default {
  title: 'REMY RUSH — Hairline Hill Zone Act 1',
  output: 'remy-rush.mp4',
  duration: DURATION,
  fonts: [{ family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href }],
  async prepare() {
    await prepareGame();
    title = A.canvas(LW, LH);
  },
  shots: [
    {
      name: 'title',
      t0: 0,
      t1: INTRO,
      draw(ctx, lt) { blit(ctx, drawTitle(lt)); },
      fx: () => ({ bloom: 0.16, bloomThresh: 0.86, crt: 0.16, vignette: 0.6, grain: 0.012, aber: 0.0007, sat: 1.08 }),
    },
    {
      name: 'zone',
      t0: INTRO,
      t1: DURATION,
      draw(ctx, lt, dur, t, overlay) {
        const frame = drawLevel(lt);
        blit(ctx, frame.low);
        blit(overlay, frame.ui);
      },
      fx: () => ({ bloom: 0.12, bloomThresh: 0.9, crt: 0.12, vignette: 0.5, grain: 0.01, aber: 0.0005, sat: 1.08, contrast: 1.03 }),
    },
  ],
  flashes: [
    [0.36, 0.3, 0.1],
    ...BADNIKS.map((b) => [filmT(b.g), 0.1, 0.06]),
    [filmT(SPRING_G), 0.06, 0.05],
    [filmT(HURT_G), 0.22, 0.08],
    ...BOSS_HITS.map((g) => [filmT(g), g === BOSS_DIE ? 0.5 : 0.22, g === BOSS_DIE ? 0.25 : 0.08]),
    ...BOOMS.filter((_, i) => i % 3 === 0).map((b) => [filmT(b.g), 0.08, 0.06]),
  ],
  score,
  audio: { seed: 7, reverb: 1.1, reverbGain: 0.22 },
  lint: { safe: { margin: 0.03 } },
};
