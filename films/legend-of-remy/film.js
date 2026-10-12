// THE LEGEND OF REMY — a 15 s top-down action-adventure "gameplay capture": a Remy with hair cuts through the Cabald
// (bald Remys), pushes the block, fells the Cabald Moblin and claims the HAIR TONIC.
// The game renders at a native 960×540 and is upscaled 2× nearest; post adds a light CRT, bloom and grain.
// Final edit: 1.16× gameplay clock reserves a three-second, fully readable reward hold.
// Picture/SFX share choreo.filmT; dungeon floor switch, bent-arm item pose and non-erasing blast rings stay seek-safe.
import { W, H, hash } from 'filmkit/lib.js';
import { INTRO, DURATION, LW, LH, filmT, warp, area, SPIN, BOSS_HITS, BOSS_DIE, HOLD, HURT } from './choreo.js';
import { prepareGame, drawPlay, ART, text } from './game.js';
import * as A from './art.js';
import { score } from './score.js';

let title;
const blit = (ctx, low) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, LW, LH, 0, 0, W, H);
};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const IMPACT = 0.3;

function drawTitle(lt) {
  const x = title.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  const sh = lt > IMPACT && lt < IMPACT + 0.3 ? 6 * Math.exp(-(lt - IMPACT) * 14) * Math.sin((lt - IMPACT) * 90) : 0;
  const g = x.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0, '#050814'); g.addColorStop(0.55, '#0c1a2a'); g.addColorStop(1, '#0a2418');
  x.fillStyle = g; x.fillRect(0, 0, LW, LH);
  for (let i = 0; i < 80; i++) {
    const sx = Math.floor(hash(i) * LW), sy = Math.floor(hash(i + 500) * LH * 0.6), tw = Math.sin(lt * 6 + i) > 0.5;
    x.fillStyle = tw ? '#ffffff' : '#5a6a98';
    x.fillRect(sx, sy, 1, 1);
  }
  x.save(); x.translate(0, Math.round(sh));
  // forest silhouette
  for (let i = 0; i < 26; i++) {
    const tx = i * 40 - 10 + hash(i + 40) * 20, th = 70 + hash(i + 60) * 60;
    x.fillStyle = i % 2 ? '#081a10' : '#0b2214';
    x.beginPath(); x.ellipse(tx, LH - th * 0.6, 34, th * 0.6, 0, 0, 7); x.fill();
  }
  x.fillStyle = '#06120c'; x.fillRect(0, LH - 40, LW, 40);
  // the sword plunges into the stone behind the logo
  const SW = 4, sw = ART.sword, rest = 290;
  const fall = lt < IMPACT ? rest - 520 * (1 - (lt / IMPACT) ** 2) : rest;
  x.fillStyle = '#3a3a52'; x.fillRect(LW / 2 - 60, rest - 6, 120, 30); x.fillStyle = '#5c5c78'; x.fillRect(LW / 2 - 56, rest - 6, 112, 6);
  if (lt < IMPACT) for (let k = 1; k < 6; k++) { x.globalAlpha = 0.18; x.drawImage(sw, LW / 2 - 6.5 * SW, fall - 56 * SW - k * 40, 13 * SW, 56 * SW); }
  x.globalAlpha = 1;
  x.drawImage(sw, Math.round(LW / 2 - 6.5 * SW), Math.round(fall - 50 * SW + 46), 13 * SW, 56 * SW);
  if (lt >= IMPACT && lt < IMPACT + 0.5) {
    const u = (lt - IMPACT) / 0.5;
    x.save(); x.globalAlpha = 1 - u; x.strokeStyle = '#ffe9a0'; x.lineWidth = 3;
    for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.283, d0 = 20 + 300 * u, d1 = d0 + 40; x.beginPath(); x.moveTo(LW / 2 + Math.cos(a) * d0, rest + Math.sin(a) * d0 * 0.6); x.lineTo(LW / 2 + Math.cos(a) * d1, rest + Math.sin(a) * d1 * 0.6); x.stroke(); }
    x.restore();
  }
  // logo
  if (lt >= IMPACT) {
    const u = lt - IMPACT, s = u < 0.14 ? 1.5 - 0.5 * (u / 0.14) ** 2 : 1 + 0.04 * Math.exp(-(u - 0.14) * 12) * Math.sin((u - 0.14) * 50);
    const top = 'THE LEGEND OF', n = Math.floor(u / 0.025);
    text(x, top.slice(0, n), LW / 2, 92, { size: 24, align: 'center', color: '#ffd860', shadow: '#5a2a00' });
    x.save(); x.translate(LW / 2, 196); x.scale(s, s);
    x.font = '120px "Press Start 2P"'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const [dx, dy, c] of [[8, 8, '#1a0408'], [-4, 0, '#ffd860'], [4, 0, '#ffd860'], [0, -4, '#ffd860'], [0, 4, '#ffd860'], [-4, -4, '#ffd860'], [4, 4, '#a86a10'], [4, -4, '#ffd860'], [-4, 4, '#a86a10']]) { x.fillStyle = c; x.fillText('REMY', dx, dy); }
    const lg = x.createLinearGradient(0, -60, 0, 60); lg.addColorStop(0, '#ff6a4a'); lg.addColorStop(0.5, '#d01828'); lg.addColorStop(1, '#7a0818');
    x.fillStyle = lg; x.fillText('REMY', 0, 0);
    x.fillStyle = 'rgba(255,220,200,0.55)'; x.fillRect(-250, -40, 500, 6);
    x.restore();
    // shine sweep
    if (u > 0.25 && u < 0.6) {
      const sx = LW / 2 - 300 + 600 * ((u - 0.25) / 0.35);
      x.save(); x.globalCompositeOperation = 'source-atop'; x.restore();
      x.save(); x.globalAlpha = 0.5; x.fillStyle = '#ffffff';
      x.beginPath(); x.moveTo(sx, 130); x.lineTo(sx + 22, 130); x.lineTo(sx - 18, 262); x.lineTo(sx - 40, 262); x.fill(); x.restore();
    }
  }
  // subtitle ribbon
  if (lt > 0.62) {
    const u = clamp01((lt - 0.62) / 0.14), rw = Math.round(440 * u);
    x.fillStyle = '#4a0a14'; x.fillRect(LW / 2 - rw / 2 - 4, 282, rw + 8, 40);
    x.fillStyle = '#b81c2c'; x.fillRect(LW / 2 - rw / 2, 286, rw, 32);
    x.fillStyle = '#e8485a'; x.fillRect(LW / 2 - rw / 2, 286, rw, 4);
    if (u >= 1) text(x, 'A HAIR TO THE PAST', LW / 2, 294, { size: 16, align: 'center', color: '#fff4dc', shadow: '#4a0a14' });
  }
  if (lt > 0.86) {
    const a = clamp01((lt - 0.86) / 0.08);
    text(x, 'VS. THE CABALD', LW / 2, 352, { size: 16, align: 'center', color: '#8ae8ff', alpha: a });
    x.globalAlpha = a; x.drawImage(ART.heroHead, LW / 2 - 168, 344); x.drawImage(ART.baldHead, LW / 2 + 136, 344); x.globalAlpha = 1;
  }
  if (lt > 1.02 && Math.floor(lt / 0.12) % 2 === 0) text(x, 'PRESS START', LW / 2, 410, { size: 16, align: 'center', color: '#ffe27a' });
  text(x, '©2026 REMY BOYS', LW / 2, 470, { size: 8, align: 'center', color: '#6a8aa0', shadow: null });
  x.restore();
  // press-start flash out
  if (lt > INTRO - 0.12) { x.globalAlpha = clamp01((lt - (INTRO - 0.12)) / 0.1); x.fillStyle = '#ffffff'; x.fillRect(0, 0, LW, LH); x.globalAlpha = 1; }
  return title;
}

export default {
  title: 'THE LEGEND OF REMY — A Hair to the Past',
  output: 'legend-of-remy.mp4',
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
      fx: (lt) => ({ bloom: 0.5, bloomThresh: 0.55, crt: 0.16, vignette: 0.8, grain: 0.015, aber: 0.0008, exposure: lt < 0.05 ? -2 : 0 }),
    },
    {
      name: 'play',
      t0: INTRO,
      t1: DURATION,
      draw(ctx, lt) { blit(ctx, drawPlay(lt).low); },
      fx: (lt) => {
        const dun = area(warp(lt).g) === 'dun';
        return dun
          ? { bloom: 0.32, bloomThresh: 0.62, crt: 0.13, vignette: 0.7, grain: 0.014, aber: 0.0006, sat: 1.08, contrast: 1.04 }
          : { bloom: 0.12, bloomThresh: 0.9, crt: 0.12, vignette: 0.55, grain: 0.012, aber: 0.0005, sat: 1.06, contrast: 1.03 };
      },
    },
  ],
  flashes: [[IMPACT, 0.45, 0.1], [filmT(HURT.g), 0.2, 0.06], [filmT(SPIN.hit), 0.3, 0.08], [filmT(BOSS_HITS[2]), 0.35, 0.1], [filmT(BOSS_DIE.t1), 0.5, 0.18], [filmT(HOLD), 0.25, 0.12]],
  score,
  audio: { seed: 23, reverb: 1.4, reverbGain: 0.28 },
  lint: { safe: { margin: 0.03 } },
};
