// SUPER REMY — a 15 s platformer "gameplay capture": a Remy with hair clears World 1-1 of the Cabald (bald Remys).
// The game renders at a native 960×540 and is upscaled 2× nearest; post adds a light CRT, bloom and grain.
import { W, H, hash } from 'filmkit/lib.js';
import { INTRO, DURATION, LW, LH, filmT, POWER_G, FIREWORKS } from './choreo.js';
import { prepareGame, drawLevel, ART, text } from './game.js';
import * as A from './art.js';
import { score } from './score.js';

let title;

const blit = (ctx, low) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, LW, LH, 0, 0, W, H);
};

function drawTitle(lt) {
  const x = title.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  const g = x.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0, '#07061a'); g.addColorStop(0.7, '#1a1240'); g.addColorStop(1, '#2a1650');
  x.fillStyle = g; x.fillRect(0, 0, LW, LH);
  for (let i = 0; i < 90; i++) {
    const sx = Math.floor(hash(i) * LW), sy = Math.floor(hash(i + 500) * LH * 0.9), tw = Math.sin(lt * 7 + i) > 0.6;
    x.fillStyle = tw ? '#ffffff' : '#7a76b8';
    x.fillRect(sx, sy, tw && i % 5 === 0 ? 2 : 1, tw && i % 5 === 0 ? 2 : 1);
  }
  // ground band with the bald horde silhouettes marching
  x.fillStyle = '#120c2a'; x.fillRect(0, 430, LW, 110);
  for (let i = 0; i < 12; i++) {
    const R = ART.enemies[[5, 0, 233, 419, 1034, 482, 98, 287, 952, 183][i % 10]];
    const ex = ((i * 92 - lt * 60) % (LW + 120) + LW + 120) % (LW + 120) - 60;
    A.drawRemy(x, R, ex, 470 + (Math.floor(lt / 0.18 + i) % 2), { flip: Math.floor(lt / 0.18 + i) % 2 === 1, alpha: 0.9 });
  }
  x.fillStyle = 'rgba(18,12,42,0.55)'; x.fillRect(0, 400, LW, 140);
  // logo plate drops in
  const drop = lt < 0.36 ? -260 * (1 - (lt / 0.36) ** 2) : 6 * Math.exp(-(lt - 0.36) * 14) * Math.sin((lt - 0.36) * 40);
  const px = 230, py = Math.round(70 + drop), pw = 500, ph = 170;
  x.fillStyle = '#1a1228'; x.fillRect(px - 4, py - 4, pw + 8, ph + 8);
  x.fillStyle = '#6a2008'; x.fillRect(px, py, pw, ph);
  x.fillStyle = '#d8581a'; x.fillRect(px + 4, py + 4, pw - 8, ph - 8);
  x.fillStyle = '#ffb070'; x.fillRect(px + 4, py + 4, pw - 8, 4); x.fillRect(px + 4, py + 4, 4, ph - 8);
  x.fillStyle = '#8a3008'; x.fillRect(px + 4, py + ph - 8, pw - 8, 4); x.fillRect(px + pw - 8, py + 4, 4, ph - 8);
  for (const [rx, ry] of [[12, 12], [pw - 18, 12], [12, ph - 18], [pw - 18, ph - 18]]) { x.fillStyle = '#4a1406'; x.fillRect(px + rx, py + ry, 6, 6); x.fillStyle = '#ffb070'; x.fillRect(px + rx, py + ry, 2, 2); }
  text(x, 'SUPER', px + pw / 2, py + 22, { size: 24, align: 'center', color: '#ffe8c8', shadow: '#4a1406' });
  text(x, 'REMY', px + pw / 2, py + 62, { size: 80, align: 'center', color: '#ffe8c8', shadow: '#4a1406' });
  x.drawImage(ART.heroHead2, px + pw - 62, py + 20);
  text(x, '©2026 REMY BOYS', px + pw - 8, py + ph + 10, { size: 8, align: 'right', color: '#ffb070', shadow: null });
  // logo shine sweep
  if (lt > 0.5 && lt < 0.9) {
    const sx = px + (pw + 80) * ((lt - 0.5) / 0.4) - 40;
    x.save(); x.beginPath(); x.rect(px + 4, py + 4, pw - 8, ph - 8); x.clip();
    x.globalAlpha = 0.45; x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(sx, py); x.lineTo(sx + 24, py); x.lineTo(sx - 16, py + ph); x.lineTo(sx - 40, py + ph); x.fill();
    x.restore();
  }
  if (lt > 0.56) text(x, 'VS. THE CABALD', LW / 2, 278, { size: 16, align: 'center', color: '#ff4a6a', alpha: Math.min(1, (lt - 0.56) / 0.08) });
  if (lt > 0.8) {
    text(x, 'WORLD 1-1', LW / 2, 318, { size: 16, align: 'center' });
    x.drawImage(ART.heroHead2, LW / 2 - 52, 348);
    text(x, '×  3', LW / 2 - 8, 356, { size: 16 });
  }
  if (lt > 1.0 && Math.floor(lt / 0.12) % 2 === 0) text(x, 'PRESS START', LW / 2, 400, { size: 16, align: 'center', color: '#ffe27a' });
  return title;
}

export default {
  title: 'SUPER REMY — World 1-1',
  output: 'super-remy.mp4',
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
      fx: (lt) => ({ bloom: 0.45, bloomThresh: 0.6, crt: 0.16, vignette: 0.8, grain: 0.015, aber: 0.0008, exposure: lt < 0.06 ? -2 : 0 }),
    },
    {
      name: 'level',
      t0: INTRO,
      t1: DURATION,
      draw(ctx, lt) { blit(ctx, drawLevel(lt).low); },
      fx: () => ({ bloom: 0.14, bloomThresh: 0.9, crt: 0.12, vignette: 0.55, grain: 0.012, aber: 0.0005, sat: 1.06, contrast: 1.03 }),
    },
  ],
  flashes: [[0.37, 0.35, 0.08], [filmT(POWER_G), 0.4, 0.1], [filmT(10.2), 0.25, 0.08], ...FIREWORKS.map((g) => [filmT(g) + 0.28, 0.12, 0.08])],
  score,
  audio: { seed: 11, reverb: 1.2, reverbGain: 0.25 },
  lint: { safe: { margin: 0.03 } },
};
