// GALAREMY — a 15 s fixed-shooter "gameplay capture": Remy (with hair) flies against the Cabald (bald Remys).
// The game renders at a native 960×540 and is upscaled 2× nearest; post adds a light CRT, bloom and grain.
// Delivery: filmkit render galaremy --force → output/galaremy/galaremy.mp4 (1920×1080, 60 fps).
// Beats: attract logo → swooping formation → capture/rescue → dual challenge PERFECT →
// exposed-core Cabald boss → pixel-shatter explosion → 42/42 tally / 84,350-point stage clear.
// Native arcade UI is composited with the game deliberately, so the subtle CRT treatment remains consistent.
import { W, H } from 'filmkit/lib.js';
import { INTRO, DURATION, LW, LH, filmT, B } from './choreo.js';
import { prepareGame, drawGame, drawSpace, ART, text } from './game.js';
import * as A from './art.js';
import { score } from './score.js';

let title, logo;

const blit = (ctx, low) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, LW, LH, 0, 0, W, H);
};
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Chunky arcade logo: banded fire gradient, chrome line, deep extrusion and ink outline.
function buildLogo() {
  const s = 'GALAREMY', size = 64, pad = 20, w = s.length * size + pad * 2, h = size + pad * 2 + 12;
  const face = A.canvas(w, h), f = face.getContext('2d');
  f.font = `${size}px "Press Start 2P"`; f.textBaseline = 'top';
  f.fillStyle = '#fff'; f.fillText(s, pad, pad);
  f.globalCompositeOperation = 'source-atop';
  const bands = ['#fff8d0', '#ffe27a', '#ffd23a', '#ffb43a', '#ff8a2a', '#ff5a2a', '#ff3a3a', '#e8264a', '#c81e6a', '#9a1a7a'];
  for (let i = 0; i < 16; i++) { f.fillStyle = bands[Math.min(bands.length - 1, Math.floor(i * bands.length / 16))]; f.fillRect(0, pad + i * 4, w, 4); }
  f.fillStyle = '#ffffff'; f.fillRect(0, pad + 30, w, 2);
  const c = A.canvas(w, h), x = c.getContext('2d');
  const ext = A.silhouette(face, '#3a1a8a'), ext2 = A.silhouette(face, '#1a0c48'), ink = A.silhouette(face, '#0c0a1a');
  for (let i = 9; i >= 1; i--) x.drawImage(i > 5 ? ext2 : ext, i, i);
  for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]]) x.drawImage(ink, dx, dy);
  x.drawImage(face, 0, 0);
  return c;
}

function drawTitle(lt) {
  const x = title.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  drawSpace(x, 0, lt, { title: true });
  // logo zooms in from deep space and slams to a stop
  const T0 = 0.32, u = clamp01(lt / T0);
  const k = lt < T0 ? 1 + 5 * (1 - u) ** 3 : 1 + 0.06 * Math.exp(-(lt - T0) * 12) * Math.cos((lt - T0) * 50);
  const shake = lt > T0 && lt < T0 + 0.25 ? 5 * Math.exp(-(lt - T0) * 18) * Math.sin(lt * 120) : 0;
  const lw = logo.width * k, lh = logo.height * k, cx = LW / 2, cy = 112;
  x.globalAlpha = clamp01(lt / 0.12);
  x.drawImage(logo, Math.round(cx - lw / 2 + shake), Math.round(cy - lh / 2), Math.round(lw), Math.round(lh));
  x.globalAlpha = 1;
  if (lt > 0.52 && lt < 0.86) {
    const sx = cx - logo.width / 2 + (logo.width + 120) * ((lt - 0.52) / 0.34) - 60;
    x.save(); x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = 0.55; x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(sx, cy - 60); x.lineTo(sx + 26, cy - 60); x.lineTo(sx - 14, cy + 60); x.lineTo(sx - 40, cy + 60); x.fill();
    x.restore();
  }
  if (lt > 0.42) text(x, 'VS. THE CABALD', LW / 2, 178, { size: 16, align: 'center', color: '#ff6a9a', alpha: clamp01((lt - 0.42) / 0.06) });
  // score advance table
  if (lt > 0.55) text(x, '- SCORE ADVANCE TABLE -', LW / 2, 214, { size: 8, align: 'center', color: '#5ae0ff' });
  [['zako', 'ZAKO CABALD', '50'], ['goei', 'GOEI CABALD', '80'], ['boss', 'BOSS CABALD', '150']].forEach(([t, name, pts], i) => {
    const a = lt - 0.62 - i * 0.1;
    if (a < 0) return;
    const yy = 234 + i * 52, slide = Math.round(80 * (1 - sm(clamp01(a / 0.12))));
    x.drawImage(ART.legend[t][Math.floor(lt * 7 + i) % 2], 300 - slide, yy);
    text(x, name, 372 + slide, yy + 16, { size: 16, color: '#ffffff' });
    text(x, '.....', 560 + slide, yy + 16, { size: 16, color: '#5a4a8a', shadow: null });
    text(x, pts + ' PTS', 660 + slide, yy + 16, { size: 16, color: '#ffd23a' });
  });
  // the hero fighter launches out of frame just before the cut
  const L0 = 1.08;
  if (lt > 0.9) {
    const a = lt - L0, sy = a < 0 ? 470 + 40 * (1 - clamp01((lt - 0.9) / 0.18)) : 470 - 900 * a * a * 2.4;
    const sxp = 820;
    x.save(); x.translate(sxp, Math.round(sy)); x.scale(2, 2);
    for (const s of [-1, 1]) { const len = 6 + Math.round(4 * Math.abs(Math.sin(lt * 80 + s))) + (a > 0 ? 14 : 0); x.fillStyle = '#ff6a2a'; x.fillRect(s * 4 - 2, 21, 4, len + 3); x.fillStyle = '#ffe27a'; x.fillRect(s * 4 - 1, 21, 2, len); }
    x.drawImage(ART.ship, -19, -23);
    x.restore();
    if (a > 0) { x.globalAlpha = 0.5; x.fillStyle = '#ffd27a'; x.fillRect(sxp - 3, Math.round(sy) + 40, 6, Math.round(Math.min(300, 900 * a))); x.globalAlpha = 1; }
  }
  if (lt > 0.95 && Math.floor(lt / 0.1) % 2 === 0) text(x, 'PUSH START BUTTON', LW / 2, 418, { size: 16, align: 'center', color: '#ffd23a' });
  text(x, '©2026 REMY BOYS', LW / 2, 470, { size: 8, align: 'center', color: '#8a7ab8', shadow: null });
  text(x, 'CREDIT  1', 40, 510, { size: 8, color: '#8a7ab8', shadow: null });
  text(x, 'HI 30000', LW - 40, 510, { size: 8, align: 'right', color: '#ff3a4a', shadow: null });
  return title;
}
const sm = (u) => u * u * (3 - 2 * u);

export default {
  title: 'GALAREMY — vs. the Cabald',
  output: 'galaremy.mp4',
  duration: DURATION,
  fonts: [{ family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href }],
  async prepare() {
    await document.fonts.load('16px "Press Start 2P"');
    await prepareGame();
    title = A.canvas(LW, LH);
    logo = buildLogo();
  },
  shots: [
    {
      name: 'title',
      t0: 0,
      t1: INTRO,
      draw(ctx, lt) { blit(ctx, drawTitle(lt)); },
      fx: (lt) => ({ bloom: 0.5, bloomThresh: 0.55, crt: 0.16, vignette: 0.8, grain: 0.015, aber: 0.0008, exposure: lt < 0.08 ? -2 + lt * 25 : 0 }),
    },
    {
      name: 'game',
      t0: INTRO,
      t1: DURATION,
      draw(ctx, lt) { blit(ctx, drawGame(lt).low); },
      fx: (lt, t) => ({ bloom: 0.45, bloomThresh: 0.58, crt: 0.14, vignette: 0.6, grain: 0.012, aber: 0.0006, sat: 1.08, contrast: 1.04, fade: clamp01((t - (DURATION - 0.3)) / 0.3) }),
    },
  ],
  flashes: [[0.33, 0.45, 0.1], [filmT(B.capture), 0.15, 0.1], [filmT(B.release), 0.2, 0.08], [filmT(B.dock), 0.35, 0.12], [filmT(B.final), 0.4, 0.12], [filmT(B.mega), 0.9, 0.35]],
  score,
  audio: { seed: 23, reverb: 1.4, reverbGain: 0.25 },
  lint: { safe: { margin: 0.03 } },
};
