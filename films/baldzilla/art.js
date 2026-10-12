// BALDZILLA · baked sets, the monster rig, mane, and analytic particles.
// Stage lives on a 960×540 low canvas, blitted 2× nearest to 1920×1080.
// Everything deterministic: pure functions of time, hash/rng only.
import { E, hash, lerp, seg, clamp } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js';
import { LW, LH } from './timeline.js';

const MEDIA_REMY = new URL('../../media/remy/', import.meta.url);
async function portrait(id) {
  const img = new Image();
  img.src = new URL(`Character${id}.webp`, MEDIA_REMY).href;
  await img.decode();
  return img;
}

// Circle face crops from the 600×600 originals (QA'd centres inherited from hair-we-go).
export const PCROP = {
  42: { cx: 345, cy: 245, r: 148 },
  30: { cx: 300, cy: 272, r: 154 },
  46: { cx: 300, cy: 276, r: 154 },
  1000: { cx: 300, cy: 258, r: 146 },
  4: { cx: 300, cy: 268, r: 150 },
};

export const S = {}; // singleton state, filled by load()

// Kaiju sprite anchors as fractions of sprite height (QA'd on stills):
// dome ≈ head crown (high: alpha-top is already the scalp), eye ≈ upper face.
const KF = { dome: 0.09, eye: 0.245 };
export function kAnchor(R, x, feet, s, which, flip = false) {
  const h = R.bottom + 1 - R.top;
  const fy = R.top + KF[which] * R.h;
  const ax = R.w * (which === 'eye' ? 0.66 : 0.5);
  return { x: x + (flip ? -1 : 1) * (ax - R.w / 2) * s, y: feet - (R.bottom + 1 - fy) * s, r: h * s };
}

export function silhouette(R, color) {
  const c = A.canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, R.w, R.h);
  return c;
}
const silCache = new Map();
function tintedSil(R, color) {
  if (!silCache.has(color)) silCache.set(color, silhouette(R, color));
  return silCache.get(color);
}

// ---------- load ----------
export async function load(TL) {
  S.T = TL;
  S.low = A.canvas(LW, LH);
  S.x = S.low.getContext('2d');
  S.kaiju = await A.loadRemy(TL.CAST.KAIJU, false);
  S.kaijuSil = silhouette(S.kaiju, '#0a101e');
  S.band = [];
  for (const id of TL.CAST.BAND) S.band.push(await A.loadRemy(id, false));
  S.anchorRemy = await A.loadRemy(TL.CAST.ANCHOR, false);
  S.heads = await A.loadHeads();
  S.iconAnchor = A.headIcon(S.heads, TL.CAST.ANCHOR, 6);
  S.portraits = {};
  for (const id of TL.CAST.BAND) S.portraits[id] = await portrait(id);
  bakeSky();
  bakeSkyline();
  bakeBuildings();
  bakeRooftop();
  bakeLab();
  bakeVehicles();
}

// ---------- stage plumbing ----------
export const beginLow = () => {
  const x = S.x;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.filter = 'none';
  x.clearRect(0, 0, LW, LH); // never inherit pixels from a previous frame/seek
  return x;
};
export function blit(ctx) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, 1920, 1080);
}
// Deterministic shake: jitter from hashed time quanta, exponential decay.
export function shakeOf(t, SHAKES) {
  let a = 0;
  for (const [t0, amp, dec] of SHAKES) {
    const dt = t - t0;
    if (dt >= 0 && dt < 1.2) a = Math.max(a, amp * Math.exp(-dt * dec));
  }
  if (a <= 0.01) return [0, 0];
  return [(hash(Math.floor(t * 240)) - 0.5) * 2 * a, (hash(Math.floor(t * 240) + 7) - 0.5) * 2 * a * 0.7];
}

// ---------- sky / sea ----------
export function bakeSky() {
  const c = A.canvas(LW + 80, LH), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, '#04060f'); g.addColorStop(0.55, '#0a1024'); g.addColorStop(1, '#131c3c');
  x.fillStyle = g; x.fillRect(0, 0, c.width, 330);
  for (let i = 0; i < 90; i++) {
    const sx = hash(i * 3 + 1) * c.width, sy = hash(i * 3 + 2) * 280;
    x.fillStyle = `rgba(210,225,255,${0.25 + hash(i * 3 + 3) * 0.6})`;
    x.fillRect(sx, sy, hash(i + 40) > 0.8 ? 2 : 1, 1);
  }
  S.sky = c;
}
export function moon(x, mx, my, r, t, glow = 1) {
  const g = x.createRadialGradient(mx, my, r * 0.4, mx, my, r * 5);
  g.addColorStop(0, `rgba(226,232,248,${0.5 * glow})`); g.addColorStop(1, 'rgba(226,232,248,0)');
  x.fillStyle = g; x.fillRect(mx - r * 5, my - r * 5, r * 10, r * 10);
  x.fillStyle = '#dfe6f4'; x.beginPath(); x.arc(mx, my, r, 0, 7); x.fill();
  x.fillStyle = 'rgba(150,162,190,0.5)';
  for (let i = 0; i < 5; i++) {
    const a = hash(i * 11) * 7, d = hash(i * 13) * r * 0.6;
    x.beginPath(); x.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, 1.5 + hash(i) * 2.5, 0, 7); x.fill();
  }
}
export function cloudSlabs(x, t, tint = 'rgba(30,40,74,0.8)') {
  for (let i = 0; i < 5; i++) {
    const cy = 40 + i * 34, cx = ((i * 260 + t * (5 + i * 2.4)) % (LW + 420)) - 300;
    x.fillStyle = tint;
    x.beginPath();
    x.ellipse(cx, cy, 120 + hash(i) * 60, 9 + hash(i + 5) * 6, 0, 0, 7);
    x.fill();
  }
}
// Animated sea rows. o: {horizon, palette, t, glintX, glintA, sun}
export function seaRows(x, o) {
  const { horizon, t } = o;
  const pal = o.palette ?? ['#182449', '#141f40', '#1b2750', '#101a35'];
  for (let y = horizon; y < LH + 4; y += 2) {
    const d = (y - horizon) / (LH - horizon);
    const w = Math.sin(y * 0.32 + t * 1.7) + Math.sin(y * 0.13 - t * 1.1) * 0.6;
    const idx = clamp(Math.floor(d * pal.length + w * 0.55), 0, pal.length - 1);
    x.fillStyle = pal[idx];
    x.fillRect(0, y, LW, 2);
    if (hash(y * 17 + Math.floor(t * 3)) > 0.94) {
      x.fillStyle = `rgba(190,205,240,${0.1 + d * 0.14})`;
      x.fillRect(hash(y) * LW, y, 8 + hash(y + 2) * 18, 1);
    }
  }
  if (o.glintX != null) {
    x.globalCompositeOperation = 'lighter';
    for (let y = horizon + 4; y < LH; y += 3) {
      const d = (y - horizon) / (LH - horizon);
      const w = Math.sin(y * 0.32 + t * 1.7);
      const gx = o.glintX + w * 8 * d + (hash(y * 5) - 0.5) * 14 * d;
      const a = (o.glintA ?? 0.35) * (0.5 + 0.5 * Math.sin(t * 3 + y * 0.5)) * (0.3 + d);
      x.fillStyle = o.glintColor ?? 'rgba(235,240,255,ALPHA)'.replace('ALPHA', a.toFixed(3));
      x.fillRect(gx, y, 2 + d * 4, 2);
    }
    x.globalCompositeOperation = 'source-over';
  }
}

// ---------- city ----------
export function bakeSkyline() {
  const w = LW + 160, h = 300, c = A.canvas(w, h), x = c.getContext('2d');
  let bx = 0;
  while (bx < w) {
    const bw = 36 + hash(bx * 3 + 1) * 60, bh = 90 + hash(bx * 7 + 2) * 190;
    const shade = 18 + hash(bx + 31) * 14;
    x.fillStyle = `rgb(${shade},${shade + 6},${shade + 22})`;
    x.fillRect(bx, h - bh, bw, bh);
    x.fillStyle = 'rgba(255,240,200,0.75)';
    const cols = Math.max(1, Math.floor(bw / 10)), rows = Math.floor(bh / 12);
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++)
      if (hash(bx + cx * 13 + cy * 71) > 0.86) x.fillRect(bx + 3 + cx * 10, h - bh + 5 + cy * 12, 3, 5);
    if (hash(bx + 77) > 0.72) { x.fillStyle = 'rgba(120,132,160,0.9)'; x.fillRect(bx + bw / 2, h - bh - 12, 1, 12); }
    if (bh > 230) { x.fillStyle = '#e2554a'; x.fillRect(bx + bw / 2, h - bh - 14, 2, 2); S.beacons ||= []; S.beacons.push([bx + bw / 2 + 1, h - bh - 13]); }
    bx += bw + 2 + hash(bx + 5) * 10;
  }
  S.skyline = c;
}
// Individual collapsible towers for the rampage street/beam scene.
export function bakeBuildings() {
  const mk = (w, h, kind, seed) => {
    const c = A.canvas(w, h), x = c.getContext('2d');
    const base = kind === 0 ? ['#3a3f5c', '#4c5376', '#262a44'] : ['#54424e', '#6a5260', '#3a2e3a'];
    x.fillStyle = base[1]; x.fillRect(0, 0, w, h);
    x.fillStyle = base[0]; x.fillRect(0, 0, Math.floor(w * 0.28), h);
    x.fillStyle = base[2]; x.fillRect(w - 8, 0, 8, h);
    const cols = Math.floor((w - 14) / 12), rows = Math.floor((h - 16) / 13);
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      const v = hash(seed + cx * 13 + cy * 71);
      x.fillStyle = v > 0.87 ? '#ffd98a' : v > 0.8 ? '#c9d6ee' : kind === 0 ? '#181c30' : '#241a24';
      x.fillRect(7 + cx * 12, 8 + cy * 13, 6, 8);
    }
    x.fillStyle = base[2]; x.fillRect(w * 0.3, -10, w * 0.4, 10); // parapet
    if (hash(seed) > 0.5) { x.fillStyle = '#1b1f33'; x.fillRect(w * 0.55, -26, 4, 26); x.fillStyle = '#e2554a'; x.fillRect(w * 0.55 + 1, -28, 2, 2); }
    return c;
  };
  S.towers = [
    { x: 96, w: 92, h: 250, c: mk(92, 250, 0, 11) },
    { x: 214, w: 74, h: 190, c: mk(74, 190, 1, 23) },
    { x: 512, w: 100, h: 290, c: mk(100, 290, 0, 37) }, // the beam victim
    { x: 640, w: 78, h: 210, c: mk(78, 210, 1, 51) },
    { x: 762, w: 96, h: 260, c: mk(96, 260, 0, 67) },
  ];
}
export function rubbleMound(x, bx, groundY, w, t) {
  x.fillStyle = '#23233c';
  x.beginPath();
  x.moveTo(bx - w / 2, groundY);
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    x.lineTo(bx - w / 2 + u * w, groundY - (Math.sin(u * Math.PI) * (18 + hash(i + 9) * 10)));
  }
  x.lineTo(bx + w / 2, groundY);
  x.fill();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const a = clamp(1 - ((t * 0.5 + hash(i * 7) * 2) % 2), 0, 1);
    x.fillStyle = `rgba(160,120,90,${0.06 * a})`;
    x.beginPath(); x.arc(bx - w * 0.2 + i * w * 0.2, groundY - 26 - a * 30, 14 + a * 16, 0, 7); x.fill();
  }
  x.globalCompositeOperation = 'source-over';
}

// ---------- monster ----------
// o: { s, x, feet, g, flip, walking, charge (0..1), beam (0..1), eyeGlow (0..1), mane (0..1), wind, sil, alpha }
export function drawKaiju(x, o) {
  const R = S.kaiju, { g } = o;
  const walking = o.walking ?? 0;
  const ph = g * 5.2;
  const opts = {
    sx: o.s, sy: o.s, flip: o.flip ?? false,
    lift: [Math.max(0, Math.sin(ph)) * 4 * walking, Math.max(0, -Math.sin(ph)) * 4 * walking],
    stride: [Math.sin(ph) * 5 * walking, -Math.sin(ph) * 5 * walking],
    lean: Math.sin(ph) * 0.012 * walking + (o.lean ?? 0),
    rot: o.rot ?? 0,
    alpha: o.alpha ?? 1,
    glow: o.glow, glowA: o.glowA,
  };
  if (o.sy != null) opts.sy = o.s * o.sy; // bow squash
  const src = o.sil ? { ...R, c: typeof o.sil === 'string' ? tintedSil(R, o.sil) : o.sil } : R;
  const dome = kAnchor(R, o.x, o.feet, o.s, 'dome', o.flip);
  // mane back layer (behind the head)
  if ((o.mane ?? 0) > 0) drawMane(x, dome.x, dome.y, o.s, g, o.mane, o.wind ?? 0, o.flip ?? false, true);
  A.drawRemy(x, src, o.x, o.feet, opts);
  // dome gleam / charge
  if ((o.charge ?? 0) > 0) {
    x.globalCompositeOperation = 'lighter';
    const r = 16 * o.s * (0.4 + o.charge);
    const gr = x.createRadialGradient(dome.x, dome.y, 1, dome.x, dome.y, r);
    gr.addColorStop(0, `rgba(255,255,255,${0.5 * o.charge})`);
    gr.addColorStop(0.4, `rgba(210,235,255,${0.25 * o.charge})`);
    gr.addColorStop(1, 'rgba(210,235,255,0)');
    x.fillStyle = gr;
    x.fillRect(dome.x - r, dome.y - r, r * 2, r * 2);
    x.globalCompositeOperation = 'source-over';
  }
  // eye glow
  if ((o.eyeGlow ?? 0) > 0) {
    const eye = kAnchor(R, o.x, o.feet, o.s, 'eye', o.flip);
    x.globalCompositeOperation = 'lighter';
    const gr = x.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, 5.5 * o.s);
    gr.addColorStop(0, `rgba(255,90,60,${0.55 * o.eyeGlow})`);
    gr.addColorStop(1, 'rgba(255,60,40,0)');
    x.fillStyle = gr;
    x.fillRect(eye.x - 5.5 * o.s, eye.y - 5.5 * o.s, 11 * o.s, 11 * o.s);
    x.globalCompositeOperation = 'source-over';
  }
  // mane front layer
  if ((o.mane ?? 0) > 0) drawMane(x, dome.x, dome.y, o.s, g, o.mane, o.wind ?? 0, o.flip ?? false, false);
  return dome;
}

// The mane: 26 analytic strands fanned from the dome, growing in surges, wind-animated.
export function drawMane(x, cx, cy, s, g, grow, wind, flip, back) {
  const N = 26, domeR = 9.5 * s;
  x.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const isBack = i < 10;
    if (isBack !== back) continue;
    const h1 = hash(i * 17 + 3), h2 = hash(i * 17 + 5), h3 = hash(i * 17 + 9);
    const surge = h3 < 0.34 ? 0 : h3 < 0.67 ? 1 : 2; // which growth wave
    const gp = clamp((grow - surge) / (1 - surge * 0.25), 0, 1);
    if (gp <= 0) continue;
    const len = (isBack ? 3.4 : 2.7) * domeR * (0.7 + h1 * 0.6) * E.outBack(gp);
    const fan = lerp(-Math.PI * 0.96, -Math.PI * 0.04, (i % 16) / 15) + (h2 - 0.5) * 0.22;
    const flipA = flip ? Math.PI - fan : fan;
    const wdir = wind * (0.5 + h1 * 0.8);
    const segs = 8;
    let px = cx + Math.cos(flipA) * domeR * 0.7, py = cy + Math.sin(flipA) * domeR * 0.7;
    x.beginPath(); x.moveTo(px, py);
    for (let j = 1; j <= segs; j++) {
      const u = j / segs;
      const sway = Math.sin(g * (1.6 + h2 * 1.5) + i * 1.3 + j * 0.5) * 0.14 * u * (1 + Math.abs(wind));
      let a = flipA + sway + wdir * u * 0.85 + Math.sin(u * 3 + i) * 0.08;
      if (flip) a = Math.PI - a;
      px += Math.cos(a) * (len / segs); py += Math.sin(a) * (len / segs);
      x.lineTo(px, py);
    }
    const layer = i % 3;
    x.strokeStyle = isBack ? ['#6e1d14', '#6e1d14', '#8c2618'][layer]
      : ['#b8302a', '#d94536', '#f06a4a'][layer];
    if (!isBack && layer === 2 && hash(i * 31) > 0.5) x.strokeStyle = '#ffb27a';
    x.lineWidth = Math.max(1, (isBack ? 2.6 : 2.1) * s * (0.5 + h2 * 0.6));
    x.globalAlpha = back ? 0.85 : 1;
    x.stroke();
  }
  x.globalAlpha = 1;
  // root cap blends strands into the scalp
  if (!back) {
    const gr = x.createRadialGradient(cx, cy, 1, cx, cy, domeR * 1.5);
    gr.addColorStop(0, '#7a1f16'); gr.addColorStop(1, 'rgba(122,31,22,0)');
    x.fillStyle = gr;
    x.beginPath(); x.arc(cx, cy, domeR * 1.5, 0, 7); x.fill();
  }
}

// ---------- the POLISH RAY ----------
// o: {x0,y0,x1,y1, w, a} additive white-blue beam with flicker.
export function drawBeam(x, t, o) {
  const { x0, y0, x1, y1 } = o;
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  const nx = -dy / L, ny = dx / L;
  const fl = 0.8 + 0.2 * hash(Math.floor(t * 30));
  x.globalCompositeOperation = 'lighter';
  x.beginPath();
  x.moveTo(x0 + nx * o.w * 2.4, y0 + ny * o.w * 2.4); x.lineTo(x1 + nx * o.w * 4, y1 + ny * o.w * 4);
  x.lineTo(x1 - nx * o.w * 4, y1 - ny * o.w * 4); x.lineTo(x0 - nx * o.w * 2.4, y0 - ny * o.w * 2.4);
  x.closePath();
  x.fillStyle = `rgba(150,200,255,${0.16 * o.a * fl})`; x.fill();
  x.beginPath();
  x.moveTo(x0 + nx * o.w, y0 + ny * o.w); x.lineTo(x1 + nx * o.w * 1.8, y1 + ny * o.w * 1.8);
  x.lineTo(x1 - nx * o.w * 1.8, y1 - ny * o.w * 1.8); x.lineTo(x0 - nx * o.w, y0 - ny * o.w);
  x.closePath();
  x.fillStyle = `rgba(235,246,255,${0.85 * o.a * fl})`; x.fill();
  const gr = x.createRadialGradient(x1, y1, 1, x1, y1, o.w * 9);
  gr.addColorStop(0, `rgba(255,255,255,${0.9 * o.a})`); gr.addColorStop(0.5, `rgba(190,220,255,${0.35 * o.a})`); gr.addColorStop(1, 'rgba(190,220,255,0)');
  x.fillStyle = gr; x.fillRect(x1 - o.w * 9, y1 - o.w * 9, o.w * 18, o.w * 18);
  x.globalCompositeOperation = 'source-over';
}

// ---------- particles (analytic; events are immutable tables) ----------
export function splashRings(x, g, ev, color = '200,220,255') {
  for (const e of ev) {
    const age = g - e.g;
    if (age < 0 || age > e.life) continue;
    const u = age / e.life;
    x.strokeStyle = `rgba(${color},${(1 - u) * 0.7})`;
    x.lineWidth = 2;
    x.beginPath(); x.ellipse(e.x, e.y, e.r0 + u * e.r1, (e.r0 + u * e.r1) * 0.28, 0, 0, 7); x.stroke();
    if (e.bits) bits(x, g, e, color, 300);
  }
}
export function dustPuffs(x, g, ev, color = '150,155,175') {
  x.globalCompositeOperation = 'lighter';
  for (const e of ev) {
    const age = g - e.g;
    if (age < 0 || age > e.life) continue;
    const u = age / e.life;
    for (let i = 0; i < 5; i++) {
      const a = hash(e.seed + i) * 7, d = u * (30 + hash(e.seed + i + 4) * 46);
      x.fillStyle = `rgba(${color},${(1 - u) * 0.3})`;
      x.beginPath(); x.arc(e.x + Math.cos(a) * d, e.y - 4 + Math.sin(a) * d * 0.5 - u * 22, 9 + u * 26, 0, 7); x.fill();
    }
  }
  x.globalCompositeOperation = 'source-over';
}
// Ballistic shards for a building shatter: derived from the tower rect, seeded.
export function shatter(x, g, hitG, bx, by, bw, bh, seed) {
  const age = g - hitG;
  if (age < 0) return;
  for (let i = 0; i < 64; i++) {
    const h1 = hash(seed + i * 3), h2 = hash(seed + i * 3 + 1), h3 = hash(seed + i * 3 + 2);
    const sx = bx + h1 * bw, sy = by + h2 * bh;
    const vx = (h2 - 0.5) * 95, vy = -34 - h3 * 150;
    const px = sx + vx * age, py = sy + vy * age + 0.5 * 300 * age * age;
    if (py > 560) continue;
    x.save();
    x.translate(px, py); x.rotate(age * (h1 - 0.5) * 9);
    x.fillStyle = ['#4c5376', '#262a44', '#ffd98a', '#6a5260'][i % 4];
    const sz = 4 + h3 * 5;
    x.fillRect(-sz / 2, -sz / 2, sz, sz);
    x.restore();
  }
}
export function bits(x, g, e, color = '255,240,200', grav = 380) {
  for (let i = 0; i < e.bits; i++) {
    const h1 = hash(e.seed + i * 7), h2 = hash(e.seed + i * 7 + 3);
    const vx = (h1 - 0.5) * e.spread, vy = -e.up * (0.4 + h2);
    const px = e.x + vx * (g - e.g), py = e.y + vy * (g - e.g) + 0.5 * grav * (g - e.g) ** 2;
    if (py > (e.floor ?? 520)) continue;
    x.fillStyle = `rgba(${color},${0.9 * clamp(1 - (g - e.g) / 1.4, 0, 1)})`;
    x.fillRect(px, py, 2, 2);
  }
}
export function rain(x, t, k = 1, tint = '190,205,235') {
  const layers = [[70, 900, 26, 0.1, 1], [46, 1250, 44, 0.15, 1.5], [22, 1700, 74, 0.2, 2]];
  layers.forEach(([n, sp, len, a, w], li) => {
    x.strokeStyle = `rgba(${tint},${a * k})`;
    x.lineWidth = w;
    x.beginPath();
    for (let i = 0; i < n * k; i++) {
      const px = (hash(i * 3 + li * 771) * (LW + 300) + t * 60 - 300) % (LW + 300);
      const py = (hash(i * 5 + li * 91) * LH + sp * t) % (LH + 60) - 30;
      x.moveTo(px, py); x.lineTo(px - len * 0.22, py + len);
    }
    x.stroke();
  });
}
export function embers(x, t, n = 40) {
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 13), h2 = hash(i * 13 + 5);
    const px = (h1 * LW + Math.sin(t * 0.7 + i) * 18 + 40) % LW;
    const py = 480 - ((h2 * 500 + t * (14 + h1 * 20)) % 500);
    const a = 0.4 + 0.6 * Math.sin(t * 6 + i * 2.3) ** 2;
    x.fillStyle = `rgba(255,${140 + Math.floor(h1 * 70)},60,${a * 0.9})`;
    x.fillRect(px, py, 2, 2);
  }
  x.globalCompositeOperation = 'source-over';
}

// ---------- vehicles ----------
export function bakeVehicles() {
  // tank
  let c = A.canvas(40, 20), x = c.getContext('2d');
  x.fillStyle = '#2c3428'; x.fillRect(2, 8, 34, 8);
  x.fillStyle = '#1c231a'; for (let i = 0; i < 8; i++) x.fillRect(3 + i * 4, 15, 3, 4);
  x.fillStyle = '#3a4433'; x.fillRect(10, 3, 16, 6);
  x.fillStyle = '#20261d'; x.fillRect(24, 5, 15, 2);
  x.fillStyle = '#4a5540'; x.fillRect(12, 4, 5, 4);
  S.tank = c;
  // truck
  c = A.canvas(64, 26); x = c.getContext('2d');
  x.fillStyle = '#3d4a3a'; x.fillRect(0, 8, 46, 12);
  x.fillStyle = '#2c372b'; x.fillRect(0, 6, 46, 3);
  x.fillStyle = '#59685a'; x.fillRect(46, 2, 16, 18);
  x.fillStyle = '#9db4c4'; x.fillRect(49, 4, 6, 5); x.fillRect(57, 4, 4, 5);
  x.fillStyle = '#15180f';
  x.beginPath(); x.arc(10, 21, 4, 0, 7); x.arc(24, 21, 4, 0, 7); x.arc(52, 21, 4, 0, 7); x.fill();
  S.truck = c;
  // jet
  c = A.canvas(26, 12); x = c.getContext('2d');
  x.fillStyle = '#39424e';
  x.beginPath(); x.moveTo(0, 6); x.lineTo(18, 2); x.lineTo(26, 6); x.lineTo(18, 9); x.closePath(); x.fill();
  x.fillRect(4, 5, 10, 2);
  S.jet = c;
  // boat (bright enough to read on a night sea)
  c = A.canvas(30, 16); x = c.getContext('2d');
  x.fillStyle = '#8a7458'; x.beginPath(); x.moveTo(1, 10); x.lineTo(29, 10); x.lineTo(24, 15); x.lineTo(6, 15); x.closePath(); x.fill();
  x.fillStyle = '#c9b48e'; x.fillRect(2, 10, 26, 1);
  x.fillStyle = '#a08a64'; x.fillRect(10, 4, 9, 6);
  x.fillStyle = '#3a2f22'; x.fillRect(14, 0, 1, 5);
  S.boat = c;
}

// ---------- lab set ----------
export function bakeLab() {
  const c = A.canvas(LW, LH), x = c.getContext('2d');
  x.fillStyle = '#122029'; x.fillRect(0, 0, LW, LH);
  x.fillStyle = '#0d1a22'; x.fillRect(0, 0, LW, 300);
  for (let i = 0; i < 10; i++) { x.fillStyle = 'rgba(60,90,105,0.25)'; x.fillRect(i * 100 + 8, 20, 2, 260); }
  x.fillStyle = '#1a2f3a'; x.fillRect(0, 300, LW, 240);
  x.fillStyle = '#0f1d26'; for (let i = 0; i < 24; i++) x.fillRect(i * 44, 300, 2, 240);
  x.fillStyle = '#0c161e'; x.fillRect(0, 296, LW, 8);
  S.lab = c;
}

// ---------- rooftop set ----------
export function bakeRooftop() {
  const c = A.canvas(LW, 170), x = c.getContext('2d');
  x.fillStyle = '#232733'; x.fillRect(0, 0, LW, 170);
  x.fillStyle = '#1b1f2a'; x.fillRect(0, 0, LW, 10);
  for (let i = 0; i < 130; i++) {
    x.fillStyle = hash(i * 7) > 0.5 ? '#2c3140' : '#1e222d';
    x.fillRect(hash(i * 3) * LW, 10 + hash(i * 5) * 158, 3 + hash(i) * 4, 2);
  }
  x.fillStyle = '#161a24'; x.fillRect(0, 150, LW, 20);
  S.roof = c;
}

// ---------- walk cycles ----------
export function runPose(g, speed = 1) {
  const ph = g * 11 * speed;
  return {
    lift: [Math.max(0, Math.sin(ph)) * 5, Math.max(0, -Math.sin(ph)) * 5],
    stride: [Math.sin(ph) * 7, -Math.sin(ph) * 7],
    lean: 0.06,
  };
}
export function shadow(x, px, feet, w, a = 0.4) {
  x.fillStyle = `rgba(4,6,14,${a})`;
  x.beginPath(); x.ellipse(px, feet + 1, w, w * 0.24, 0, 0, 7); x.fill();
}

// ---------- news graphics ----------
export function seismograph(x, t, bx, by, w, h, amp) {
  x.fillStyle = '#04140c'; x.fillRect(bx, by, w, h);
  x.strokeStyle = 'rgba(60,160,100,0.25)'; x.lineWidth = 1;
  for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(bx, by + (h / 4) * i); x.lineTo(bx + w, by + (h / 4) * i); x.stroke(); }
  for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(bx + (w / 8) * i, by); x.lineTo(bx + (w / 8) * i, by + h); x.stroke(); }
  x.strokeStyle = '#46e08a'; x.lineWidth = 1.5;
  x.beginPath();
  for (let px = 0; px <= w; px += 2) {
    const tt = t - (w - px) * 0.08;
    const v = Math.sin(tt * 9) * 0.5 + Math.sin(tt * 23.7) * 0.3 + (hash(Math.floor(tt * 14)) - 0.5) * 0.9;
    const y = by + h / 2 + v * (h / 2 - 4) * amp;
    px === 0 ? x.moveTo(bx + px, y) : x.lineTo(bx + px, y);
  }
  x.stroke();
}
export function evacMap(x, t, bx, by, w, h) {
  x.fillStyle = '#0b1220'; x.fillRect(bx, by, w, h);
  x.strokeStyle = 'rgba(90,110,150,0.5)'; x.lineWidth = 1;
  for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(bx + 8 + i * 22, by + 6); x.lineTo(bx + 8 + i * 22, by + h - 6); x.stroke(); }
  for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(bx + 6, by + 8 + i * 20); x.lineTo(bx + w - 6, by + 8 + i * 20); x.stroke(); }
  const blink = hash(Math.floor(t * 2.5)) > 0.35;
  if (blink) {
    x.fillStyle = '#e2554a';
    x.beginPath(); x.arc(bx + w * 0.55, by + h * 0.52, 9, 0, 7); x.fill();
    x.strokeStyle = 'rgba(226,85,74,0.7)';
    x.lineWidth = 2;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      x.beginPath(); x.moveTo(bx + w * 0.55 + dx * 14, by + h * 0.52 + dy * 14);
      x.lineTo(bx + w * 0.55 + dx * 26, by + h * 0.52 + dy * 26); x.stroke();
    }
  }
  x.fillStyle = '#ffd98a'; x.font = '8px "JetBrains Mono"'; x.fillText('FLOW CITY', bx + 8, by + 12);
}

// ---------- flow cannon ----------
export function drawCannon(x, cx, cy, s, aim, fire, t) {
  x.save();
  x.translate(cx, cy);
  x.scale(s, s);
  // tripod base
  x.fillStyle = '#2a2f3c';
  x.fillRect(-26, -8, 52, 10);
  x.fillRect(-22, 2, 6, 14); x.fillRect(16, 2, 6, 14); x.fillRect(-3, 2, 6, 14);
  // tonic tank (sphere with window + bubbles)
  x.fillStyle = '#173a22'; x.beginPath(); x.arc(-34, -22, 15, 0, 7); x.fill();
  x.fillStyle = '#2c7a3f'; x.beginPath(); x.arc(-34, -22, 12, 0, 7); x.fill();
  x.fillStyle = '#57c46a'; x.beginPath(); x.arc(-37, -25, 4.5, 0, 7); x.fill();
  for (let i = 0; i < 4; i++) {
    const by = ((t * 18 + i * 9) % 22);
    x.fillStyle = `rgba(140,235,160,${0.7 - by / 30})`;
    x.beginPath(); x.arc(-34 + Math.sin(i * 2 + t * 3) * 6, -16 - by * 0.5, 1.4, 0, 7); x.fill();
  }
  // barrel + coils, aimed up-left by `aim` (0 flat, 1 raised)
  x.save();
  x.translate(0, -12); x.rotate(-0.62 * aim - 0.12);
  const rec = fire > 0 ? Math.max(0, 1 - fire * 5) * 7 : 0;
  x.translate(-rec, 0);
  x.fillStyle = '#39404f'; x.fillRect(-6, -7, 56, 14);
  x.fillStyle = '#4c556a'; x.fillRect(-6, -7, 56, 4);
  x.fillStyle = '#20242e'; x.fillRect(46, -8, 6, 16);
  x.strokeStyle = '#b06a2e'; x.lineWidth = 3;
  for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(8 + i * 11, 0, 6, 0, 7); x.stroke(); }
  x.fillStyle = '#8a4a1c'; x.fillRect(0, 7, 40, 3);
  x.restore();
  // cable
  x.strokeStyle = '#141821'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(-20, -6); x.quadraticCurveTo(-8, 8, 6, 4); x.stroke();
  x.restore();
}

// ---------- news studio ----------
export function drawDesk(x, t, anchorRemy) {
  // backdrop
  x.fillStyle = '#0b1526'; x.fillRect(0, 0, LW, LH);
  x.fillStyle = '#0a1220'; x.fillRect(0, 0, LW, 90);
  // city monitor behind anchor
  x.save();
  x.translate(180, 96);
  x.drawImage(S.skyline, 0, 40, 560, 180, 0, 0, 380, 122);
  x.fillStyle = 'rgba(140,180,240,0.08)'; x.fillRect(0, 0, 380, 122);
  x.strokeStyle = '#1f3554'; x.lineWidth = 3; x.strokeRect(0, 0, 380, 122);
  x.restore();
  // anchor body behind desk
  const bob = Math.sin(t * 2.1) * 1.5;
  A.drawRemy(x, anchorRemy, 640, 334 + bob, { sx: 2.6, sy: 2.6, lean: Math.sin(t * 1.3) * 0.012 });
  // desk
  x.fillStyle = '#141d30'; x.fillRect(320, 318, 640, 222);
  x.fillStyle = '#1b2740'; x.fillRect(320, 318, 640, 14);
  x.fillStyle = '#0e1524'; x.fillRect(352, 352, 140, 26);
  x.strokeStyle = '#2a3c5e'; x.lineWidth = 2; x.strokeRect(352, 352, 140, 26);
  x.font = '11px "JetBrains Mono"'; x.fillStyle = '#7f97ad';
  x.fillText('GUS · FLOW CITY', 360, 369);
  // mic
  x.fillStyle = '#20242e'; x.fillRect(560, 296, 4, 24);
  x.fillStyle = '#3a3f4d'; x.beginPath(); x.arc(562, 292, 7, 0, 7); x.fill();
  x.fillStyle = '#565c6e'; x.beginPath(); x.arc(562, 292, 4, 0, 7); x.fill();
}
