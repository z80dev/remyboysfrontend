// REMY TEMPLATE — a 6 s two-shot film: a VS card built from the 600×600 originals (media/remy), then a
// pixel duel on a 960×540 low-res canvas (upscaled 2× nearest) where a Remy with hair (#42) sends a
// Cabald (bald #5) flying. Copy the folder to films/<name>/ and rename title/output.
import { W, H, hash } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js';   // shared Remy rig: canvas, loadRemy, drawRemy, loadHeads, headIcon
import { DURATION, VS, LW, LH, GY, HERO, FOE, HIT_G, BANNER_G, IRIS_OUT, warp, filmT, heroX, foeX, foeY, foeRot } from './choreo.js';
import { score } from './score.js';

const FONT = '"Press Start 2P"';
const ART = {};
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

async function img(url) { const i = new Image(); i.src = url; await i.decode(); return i; }

// Pixel text on the low-res canvas (crisp after the 2× nearest upscale). 16 px minimum.
function text(x, s, a, b, { size = 16, color = '#fff', shadow = '#1a1228', align = 'left', alpha = 1 } = {}) {
  x.save();
  x.globalAlpha *= alpha;
  x.font = `${size}px ${FONT}`;
  x.textAlign = align;
  x.textBaseline = 'top';
  const k = Math.max(1, size / 8);
  if (shadow) { x.fillStyle = shadow; x.fillText(s, Math.round(a + k), Math.round(b + k)); }
  x.fillStyle = color;
  x.fillText(s, Math.round(a), Math.round(b));
  x.restore();
}

// ---------- analytic particles: an event list evaluated by age, no simulation state ----------
const P = [];
const ev = (g, kind, x, y) => P.push({ g, kind, x, y, seed: P.length * 13 + 7 });
ev(HIT_G, 'stars', 500, GY - 60);
ev(HIT_G, 'ring', 500, GY - 50);
function drawParticles(x, g) {
  for (const p of P) {
    const age = g - p.g;
    if (age < 0 || age > 0.6) continue;
    const r = (k) => hash(p.seed * 31 + k);
    if (p.kind === 'stars') {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + r(i), d = 20 + 160 * age * (0.6 + 0.4 * r(i + 9));
        x.fillStyle = i % 2 ? '#ffe27a' : '#ffffff';
        x.fillRect(Math.round(p.x + Math.cos(a) * d) - 2, Math.round(p.y + Math.sin(a) * d) - 2, 5, 5);
      }
    } else if (p.kind === 'ring') {
      x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.globalAlpha = 1 - age / 0.6;
      x.beginPath(); x.arc(p.x, p.y, 10 + 140 * age, 0, 7); x.stroke();
      x.globalAlpha = 1;
    }
  }
}

function drawDuel(lt) {
  const { g, stop } = warp(lt);
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  // shake runs on shot (real) time, so it keeps moving through the freeze
  const d = lt - (filmT(HIT_G) - VS), k = d >= 0 && d < 0.3 ? 6 * Math.exp(-d * 14) : 0;
  x.save();
  x.translate(Math.round(k * Math.sin(d * 95)), Math.round(k * Math.cos(d * 77)));
  // repaint EVERY pixel each frame: the low-res canvas persists between frames, gaps show stale frames
  x.fillStyle = '#1a1228'; x.fillRect(-20, -20, LW + 40, LH + 40);
  // sky + ground: banded, never a single flat fill
  const bands = ['#2a1650', '#3b1d6e', '#55308a', '#7a46a0', '#a85fa8'];
  bands.forEach((c, i) => { x.fillStyle = c; x.fillRect(-10, -10 + i * 80, LW + 20, 82); });
  for (let i = 0; i < 60; i++) { x.fillStyle = '#ffffff'; x.fillRect(Math.floor(hash(i) * LW), Math.floor(hash(i + 99) * 300), 2, 2); }
  x.fillStyle = '#1a1228'; x.fillRect(-10, 400, LW + 20, 160);
  x.fillStyle = '#3a2a1a'; x.fillRect(-10, GY, LW + 20, LH - GY + 10);
  x.fillStyle = '#6a4a2a'; x.fillRect(-10, GY, LW + 20, 6);
  // actors (run cycle: alternate leg lift from x phase; flip = face left)
  const run = (px) => { const s = Math.sin(px / 30 * Math.PI * 2); return { lift: [Math.round(Math.max(0, s) * 6), Math.round(Math.max(0, -s) * 6)], stride: [Math.round(s * 2), Math.round(-s * 2)], lean: 0.05 }; };
  const fx = foeX(g);
  if (g < HIT_G) A.drawRemy(x, ART.foe, fx, GY, { ...run(fx), flip: true });
  else A.drawRemy(x, ART.foe, fx, foeY(g), { rot: foeRot(g), white: stop != null });
  A.drawRemy(x, ART.hero, heroX(g), GY, { ...(g < HIT_G ? run(heroX(g)) : { lean: -0.06 }), glow: '#ffe27a', glowA: g >= HIT_G ? 0.8 : 0.35 });
  drawParticles(x, g);
  if (g >= BANNER_G) text(x, 'CABALD DOWN!', LW / 2, 150, { size: 32, align: 'center', color: '#ffe27a', alpha: clamp01((g - BANNER_G) / 0.1) });
  x.restore();
  // HUD (outside the shake)
  x.drawImage(ART.heroHead2, 24, 18); text(x, 'REMY', 64, 26);
  x.drawImage(ART.foeHead2, LW - 56, 18); text(x, 'CABALD', LW - 64, 26, { align: 'right', color: '#ffb0c8' });
  // iris out: moveTo(cx + r, cy) BEFORE arc, or evenodd draws a wedge
  const u = clamp01((g - IRIS_OUT.g0) / (IRIS_OUT.g1 - IRIS_OUT.g0));
  if (u > 0) {
    const rad = Math.max(0, 640 * (1 - u) ** 2), cx = heroX(g), cy = GY - 50;
    x.fillStyle = '#000';
    x.beginPath(); x.rect(0, 0, LW, LH); x.moveTo(cx + rad, cy); x.arc(cx, cy, rad, 0, 7, true); x.fill('evenodd');
  }
  return ART.low;
}

function drawVs(ctx, lt, overlay) {
  ctx.fillStyle = '#0b0820'; ctx.fillRect(0, 0, W, H);
  // originals are opaque 600×600 renders: frame them as portrait panels, never as sprites
  const slide = (1 - clamp01(lt / 0.35)) ** 3 * 900;
  ctx.drawImage(ART.heroArt, 160 - slide, 240, 600, 600);
  ctx.drawImage(ART.foeArt, 1160 + slide, 240, 600, 600);
  ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 8;
  ctx.strokeRect(160 - slide, 240, 600, 600); ctx.strokeRect(1160 + slide, 240, 600, 600);
  // reading type on the overlay: composited after bloom/grade, stays crisp
  const o = overlay;
  o.save();
  o.font = `96px ${FONT}`; o.textAlign = 'center'; o.textBaseline = 'middle';
  o.globalAlpha = clamp01((lt - 0.35) / 0.1);
  o.fillStyle = '#ff4a6a'; o.fillText('VS', W / 2, 540);
  o.font = `32px ${FONT}`; o.fillStyle = '#ffffff';
  o.fillText('REMY', 460, 160); o.fillText('THE CABALD', 1460, 160);
  o.restore();
}

export default {
  title: 'Remy template',
  output: 'remy-template.mp4',
  duration: DURATION,
  fonts: [{ family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href }],
  async prepare() {
    ART.hero = await A.loadRemy(HERO, false);  // near cut (76×116)
    ART.foe = await A.loadRemy(FOE, false);
    const heads = await A.loadHeads();
    ART.heroHead2 = A.headIcon(heads, HERO, 2);
    ART.foeHead2 = A.headIcon(heads, FOE, 2);
    ART.heroArt = await img(new URL(`../../media/remy/Character${HERO}.webp`, import.meta.url).href);
    ART.foeArt = await img(new URL(`../../media/remy/Character${FOE}.webp`, import.meta.url).href);
    ART.low = A.canvas(LW, LH);
  },
  shots: [
    { name: 'vs', t0: 0, t1: VS, draw(ctx, lt, dur, t, overlay) { drawVs(ctx, lt, overlay); }, fx: () => ({ bloom: 0.3, bloomThresh: 0.8, vignette: 0.7, grain: 0.015 }) },
    {
      name: 'duel', t0: VS, t1: DURATION,
      draw(ctx, lt) { ctx.imageSmoothingEnabled = false; ctx.drawImage(drawDuel(lt), 0, 0, LW, LH, 0, 0, W, H); },
      fx: () => ({ bloom: 0.14, bloomThresh: 0.9, crt: 0.12, vignette: 0.55, grain: 0.012 }),
    },
  ],
  flashes: [[filmT(HIT_G), 0.4, 0.1]],
  score,
  audio: { seed: 7, reverb: 1.2, reverbGain: 0.25 },
  lint: { safe: { margin: 0.03 } },
};
