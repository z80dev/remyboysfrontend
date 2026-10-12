// Pixel art for REMY RUSH, generated once in prepare() at the game's native 960×540 (hash-based, deterministic).
// The Remy rig is adapted from films/remy-bros/art.js: quills, a figure-8 "peel-out" leg wheel and tinting added.
import { hash } from 'filmkit/lib.js';

const MEDIA = new URL('../../media/quest/', import.meta.url);

export const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
};
const RGB = {};
const rgb = (h) => RGB[h] ?? (RGB[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;

function pixels(w, h) {
  w = Math.round(w); h = Math.round(h);
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const set = (x, y, col, a = 255) => {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const [r, g, b] = typeof col === 'string' ? rgb(col) : col;
    const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
  };
  const get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  const done = () => (ctx.putImageData(img, 0, 0), c);
  return { c, set, get, done, w, h };
}
// Outline every opaque pixel's transparent neighbours (pixel-art ink line).
function outline(c, col = '#10142a') {
  const w = c.width, h = c.height, x = c.getContext('2d'), src = x.getImageData(0, 0, w, h), d = src.data;
  const out = x.createImageData(w, h), o = out.data, [r, g, b] = rgb(col);
  const op = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && d[(yy * w + xx) * 4 + 3] > 40;
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const i = (yy * w + xx) * 4;
      if (op(xx, yy)) { o[i] = d[i]; o[i + 1] = d[i + 1]; o[i + 2] = d[i + 2]; o[i + 3] = d[i + 3]; continue; }
      if (op(xx - 1, yy) || op(xx + 1, yy) || op(xx, yy - 1) || op(xx, yy + 1)) { o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = 255; }
    }
  x.putImageData(out, 0, 0);
  return c;
}

async function loadImg(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

// ---------- Remy rig ----------
export async function loadRemy(i, far) {
  const img = await loadImg(new URL(`sprites/${far ? 'far/' : ''}${i}.webp`, MEDIA).href);
  const f = far ? 9 : 6, PAD = 2, bodyH = 576 / f, bodyW = 432 / f, hem = Math.max(2, Math.round(3 * 6 / f));
  const c = canvas(img.width, img.height), x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let top = c.height, bottom = 0;
  for (let y = 0; y < c.height; y++)
    for (let xx = 0; xx < c.width; xx++)
      if (d[(y * c.width + xx) * 4 + 3] > 0) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  return { c, w: c.width, h: c.height, legTop: Math.round(PAD + bodyH + hem), cx: PAD + Math.floor(bodyW / 2), top, bottom };
}

const scratch = [];
const getScratch = (k, w, h) => {
  let s = scratch[k];
  if (!s || s.width < w || s.height < h) s = scratch[k] = canvas(w + 8, h + 8);
  const x = s.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1;
  x.clearRect(0, 0, s.width, s.height);
  return s;
};

// Figure-8 leg blur ("peel-out"): red shoes and dark trousers smeared along a lemniscate.
function legWheel(sc, cx, cy, phase, a = 15) {
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2, s = Math.sin(t), den = 1 + s * s;
    const px = Math.round(cx + (a * Math.cos(t)) / den), py = Math.round(cy + (a * 0.75 * s * Math.cos(t)) / den);
    const k = ((i / 48 + phase) % 1 + 1) % 1;
    sc.fillStyle = k < 0.18 ? '#ff4a3a' : k < 0.36 ? '#c81c24' : k < 0.5 ? '#ffffff' : k < 0.75 ? '#4a3c48' : '#2a2030';
    sc.fillRect(px - 1, py - 1, 3, 3);
  }
  sc.fillStyle = '#2a2030';
  sc.fillRect(cx - 3, cy - 6, 6, 4);
}

// Compose a posed Remy (legs + sheared body) into scratch, then place it with feet at (x, feet).
// o: { lift, stride, lean, flip, sx, sy, rot, alpha, tint, tintA, quills: {c, x, y}, wheel: phase }
const M = 32;
export function drawRemy(ctx, R, x, feet, o = {}) {
  const W = R.w + M * 2, Hh = R.h + M * 2;
  const s = getScratch(0, W, Hh), sc = s.getContext('2d');
  const [ll, lr] = o.lift ?? [0, 0], [sl, sr] = o.stride ?? [0, 0], lean = o.lean ?? 0;
  const lh = R.h - R.legTop;
  if (o.quills) {
    const q = o.quills, dx = Math.round((R.legTop - q.y - q.c.height / 2) * lean);
    sc.drawImage(q.c, M + q.x + dx, M + q.y);
  }
  if (o.wheel != null) legWheel(sc, M + R.cx, M + R.legTop + 4, o.wheel);
  else {
    sc.drawImage(R.c, 0, R.legTop, R.cx, lh, M + sl, M + R.legTop - ll, R.cx, lh);
    sc.drawImage(R.c, R.cx, R.legTop, R.w - R.cx, lh, M + R.cx + sr, M + R.legTop - lr, R.w - R.cx, lh);
  }
  for (let y = 0; y < R.legTop; y += 2) {
    const hgt = Math.min(2, R.legTop - y), dx = Math.round((R.legTop - y) * lean);
    sc.drawImage(R.c, 0, y, R.w, hgt, M + dx, M + y, R.w, hgt);
  }
  if (o.tint) {
    sc.globalCompositeOperation = 'source-atop';
    sc.globalAlpha = o.tintA ?? 1;
    sc.fillStyle = o.tint;
    sc.fillRect(0, 0, s.width, s.height);
    sc.globalCompositeOperation = 'source-over';
    sc.globalAlpha = 1;
  }
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  const ax = M + R.w / 2, ay = M + R.bottom + 1;
  ctx.translate(Math.round(x), Math.round(feet));
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.flip ? -1 : 1) * (o.sx ?? 1), o.sy ?? 1);
  ctx.drawImage(s, -ax, -ay);
  ctx.restore();
}

export function tinted(src, col, a) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = a; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return c;
}
export async function loadAtlas(name) {
  return loadImg(new URL(name, MEDIA).href);
}
export function icon(atlas, i, k = 1, flip = false) {
  const c = canvas(16 * k, 16 * k), x = c.getContext('2d');
  if (flip) { x.translate(16 * k, 0); x.scale(-1, 1); }
  x.drawImage(atlas, (i % 67) * 16, Math.floor(i / 67) * 16, 16, 16, 0, 0, 16 * k, 16 * k);
  return c;
}

// ---------- hero extras ----------
const QB = ['#42141c', '#8c2430', '#bc3e3c', '#ef6b50', '#ffb58a'];
// Swept-back red quills extend hero #42's real hair silhouette, rather than replacing the Remy.
export function quills() {
  const w = 44, h = 46, P = pixels(w, h);
  const spikes = [[12, 26, 30, 8], [21, 4, 36, 9.5], [30, -16, 31, 8.5], [38, -36, 22, 6.5]]; // base y, angle (deg up), length, half-width
  for (const [by, deg, L, W] of spikes) {
    const a = Math.PI - (deg * Math.PI) / 180, dx = Math.cos(a), dy = -Math.sin(a), nx = -dy, ny = dx;
    for (let s = 0; s <= L; s += 0.4) {
      const u = s / L, half = W * (1 - u) ** 1.15, bend = -0.016 * s * s;
      const cx = 40 + dx * s, cy = by + dy * s + bend;
      for (let q = -half; q <= half; q += 0.4) {
        const side = q / Math.max(0.5, half);
        P.set(cx + nx * q, cy + ny * q, side < -0.35 ? QB[3] : side < 0.35 ? QB[2] : QB[1]);
      }
    }
  }
  return outline(P.done(), QB[0]);
}
// Spin-ball: quill disc with Remy's side head tumbling inside; frames at 45°.
export function ballFrames(sideHead, n = 8) {
  const S = 52, r = 22;
  return Array.from({ length: n }, (_, f) => {
    const a0 = (f / n) * Math.PI * 2;
    const P = pixels(S, S), c0 = S / 2;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - c0, dy = y + 0.5 - c0, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) - a0;
        const spike = 3.5 * Math.max(0, Math.cos(ang * 5)) ** 3;
        if (d > r + spike) continue;
        const swirl = Math.sin(ang * 5 + d * 0.32);
        const lit = (-dx * 0.6 - dy * 0.8) / r;
        let col = lit > 0.45 ? QB[3] : lit > -0.2 ? QB[2] : QB[1];
        if (swirl > 0.82 && d > 8) col = QB[4];
        if (d > r - 1.5 && spike < 0.5) col = QB[1];
        P.set(x, y, col);
      }
    const c = outline(P.done(), QB[0]), x = c.getContext('2d');
    x.save(); x.translate(c0, c0); x.rotate(a0); x.drawImage(sideHead, -16, -17); x.restore();
    return c;
  });
}

// ---------- level palette ----------
export const PAL = {
  ink: '#10142a',
  grassHi: '#b6ff6a', grass: '#46d23a', grassMid: '#2aa82c', grassLo: '#16762a', grassInk: '#0a3a18',
  chkA: '#d8862e', chkAHi: '#f6b45a', chkALo: '#a85a18', chkB: '#8a4416', chkBHi: '#a85a22', chkBLo: '#5e2a0a',
  water: '#2c7ce0', waterLo: '#1a52b0', waterHi: '#8cd4ff',
  ring: '#ffd02a', ringHi: '#fff6b4', ringLo: '#d88a0a', ringInk: '#6a3a00',
};

// ---------- sky ----------
export function sky(w, h) {
  const stops = [[0, '#1c3cc0'], [0.25, '#2c5ee0'], [0.5, '#4c8cf4'], [0.7, '#86c4ff'], [1, '#d4f2ff']].map(([p, c]) => [p, rgb(c)]);
  const P = pixels(w, h), bands = 16;
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const q = v * bands, b0 = Math.floor(q), f = q - b0;
      const p = Math.min(1, (f > bayer(x, y) ? b0 + 1 : b0) / bands);
      let k = 0;
      while (k < stops.length - 2 && p > stops[k + 1][0]) k++;
      const [pa, ca] = stops[k], [pb, cb] = stops[k + 1], u = (p - pa) / (pb - pa);
      P.set(x, y, ca.map((a, i) => Math.round(a + (cb[i] - a) * u)));
    }
  }
  return P.done();
}

// ---------- blob shading ----------
function blob(w, h, circles, shades, { outline: ol = true, flatBottom = false, seams = null, belly = 0 } = {}) {
  w = Math.round(w); h = Math.round(h);
  const P = pixels(w, h);
  const inside = (x, y) => {
    let best = -1, bi = -1;
    for (let i = 0; i < circles.length; i++) {
      const [cx, cy, r] = circles[i], d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < r && 1 - d / r > best) { best = 1 - d / r; bi = i; }
    }
    return bi;
  };
  const m = new Int16Array(w * h).fill(-1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = flatBottom && y >= h - 1 ? inside(x, h - 2) : inside(x, y);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : m[y * w + x]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = m[y * w + x];
      if (i < 0) continue;
      const [cx, cy, r] = circles[i];
      const nx = (x + 0.5 - cx) / r, ny = (y + 0.5 - cy) / r;
      const l = -0.55 * nx - 0.8 * ny + (h2(x, y, 3) - 0.5) * 0.1;
      const edge = ol && (at(x - 1, y) < 0 || at(x + 1, y) < 0 || at(x, y - 1) < 0 || (!flatBottom && at(x, y + 1) < 0));
      let col = l > 0.62 ? shades[4] : l > 0.2 ? shades[3] : l > -0.35 ? shades[2] : shades[1];
      if (belly && y > h * (1 - belly)) col = shades[1];
      if (seams) { const up = at(x, y - 1); if (up >= 0 && up !== i && circles[up][1] < cy) col = seams; }
      P.set(x, y, edge ? shades[0] : col);
    }
  return P.done();
}
export function cloud(seed, w = 120) {
  const h = Math.round(w * 0.42), cs = [];
  const n = 4 + Math.floor(hash(seed) * 3);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, r = (0.12 + 0.1 * Math.sin(Math.PI * u) + 0.05 * hash(seed * 31 + i)) * w;
    cs.push([w * (0.1 + 0.8 * u), h * 0.7 - r * 0.5 * Math.sin(Math.PI * u) - 1, r]);
  }
  return blob(w, h, cs, ['#8cb8f0', '#cfe4fa', '#ffffff', '#ffffff', '#ffffff'], { flatBottom: true, seams: '#c4dcf6', belly: 0.25 });
}

// ---------- far mountains (two ranges, haze at the base) ----------
export function mountains(w, h) {
  const P = pixels(w, h), haze = rgb('#a8d8f8');
  const ranges = [
    { n: 14, step: 120, base: 10, var: 40, s: 0.9, lit: '#9cb4ec', shade: '#7e98da', rim: '#d8e6ff', seed: 1 },
    { n: 12, step: 140, base: 50, var: 30, s: 1.15, lit: '#5e9ab8', shade: '#4a7ea6', rim: '#9ed2e0', seed: 2 },
  ];
  for (const R of ranges) {
    const peaks = Array.from({ length: R.n }, (_, i) => ({ x: i * R.step + hash(i + R.seed * 50) * R.step * 0.6, y: R.base + hash(i + R.seed * 70) * R.var, s: R.s * (0.8 + 0.4 * hash(i + R.seed * 90)) }));
    for (let x = 0; x < w; x++) {
      let top = 1e9, own = null;
      for (const p of peaks) for (const off of [0, w, -w]) { const t = p.y + Math.abs(x - p.x - off) * p.s; if (t < top) { top = t; own = { ...p, x: p.x + off }; } }
      top = Math.round(top);
      const lit = x < own.x;
      for (let y = Math.max(0, top); y < h; y++) {
        let c = rgb(y < top + 2 ? R.rim : lit ? R.lit : R.shade);
        if (!lit && ((x - own.x) * 0.8 + y) % 15 < 1.3) c = c.map((v) => v - 14);
        const f = Math.max(0, (y - h * 0.45) / (h * 0.55));
        if (f > 0 && f > bayer(x, y) * 0.9) c = c.map((v, i) => Math.round(v + (haze[i] - v) * Math.min(1, f * 0.8 + 0.1)));
        P.set(x, y, c);
      }
    }
  }
  return P.done();
}

// ---------- lake strip (line-scrolled in the game) ----------
export function water(w, h) {
  const P = pixels(w, h);
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      let c = v < 0.08 ? '#d4f2ff' : v < 0.2 ? (bayer(x, y) < 0.5 ? '#8ccaf8' : '#5aa6ee') : v < 0.55 ? PAL.water : PAL.waterLo;
      const streak = h2(Math.floor(x / (10 + (y % 5) * 4)), y, 9);
      if (v > 0.1 && streak > 0.86) c = v < 0.5 ? '#ffffff' : PAL.waterHi;
      else if (v > 0.1 && streak > 0.74) c = v < 0.5 ? PAL.waterHi : '#4a92e8';
      P.set(x, y, c);
    }
  }
  return P.done();
}

// ---------- checkerboard soil ----------
function soil(P, x, y, ox, oy, cell = 32) {
  const cx = Math.floor((x + ox) / cell), cy = Math.floor((y + oy) / cell), lx = (x + ox) % cell, ly = (y + oy) % cell;
  const a = (cx + cy) % 2 === 0;
  let c = a ? PAL.chkA : PAL.chkB;
  if (lx < 3 || ly < 3) c = a ? PAL.chkAHi : PAL.chkBHi;
  if (lx > cell - 4 || ly > cell - 4) c = a ? PAL.chkALo : PAL.chkBLo;
  if (!a && lx > 8 && lx < 12 && ly > 8 && ly < cell - 8) c = PAL.chkBLo; // carved seam
  if (h2(x, y, 4) > 0.94) c = a ? PAL.chkALo : PAL.chkBLo;
  return c;
}
// Ground tile (64 wide, repeats): grass lip with hanging scallops over checker soil.
export const GRASS_H = 14;
export function groundTile(h) {
  const w = 64, P = pixels(w, h);
  for (let x = 0; x < w; x++) {
    const sc = GRASS_H + Math.round(4 * Math.abs(Math.sin((x / 16) * Math.PI)) + (h2(x, 2) > 0.7 ? 1 : 0));
    for (let y = 0; y < h; y++) {
      let c;
      if (y === 0) c = PAL.grassInk;
      else if (y < 3) c = (x + y * 3) % 9 === 0 ? '#ffffff' : PAL.grassHi;
      else if (y < 7) c = h2(x, y) > 0.8 ? PAL.grassHi : PAL.grass;
      else if (y < sc - 2) c = h2(x, y) > 0.85 ? PAL.grass : PAL.grassMid;
      else if (y < sc) c = PAL.grassLo;
      else if (y === sc) c = PAL.grassInk;
      else {
        c = soil(P, x, y - GRASS_H, 0, 0);
        if (y < sc + 4) c = rgb(c).map((v) => Math.round(v * 0.62)); // shadow under the grass
      }
      P.set(x, y, c);
    }
  }
  return P.done();
}

// ---------- mid layer: GHZ-style islands with checker cliffs, palms; waterfall slots returned ----------
export function islands(w, h) {
  const c = canvas(w, h), x = c.getContext('2d');
  const falls = [];
  const P = pixels(w, h);
  const isl = [];
  for (let i = 0, px = 20; px < w - 100; i++) {
    const iw = 160 + Math.floor(hash(i + 400) * 160), top = 40 + Math.floor(hash(i + 410) * 70);
    isl.push({ x0: px, x1: px + iw, top });
    px += iw + 40 + Math.floor(hash(i + 420) * 90);
  }
  for (const I of isl) {
    for (let xx = I.x0; xx < I.x1; xx++) {
      const e = Math.min(xx - I.x0, I.x1 - 1 - xx);
      const t = I.top + (e < 6 ? 6 - e : 0);
      for (let y = t; y < h; y++) {
        let col;
        if (y < t + 2) col = '#0e4a22';
        else if (y < t + 7) col = h2(xx, y, 2) > 0.8 ? '#8ae860' : '#3cb43a';
        else if (y < t + 9) col = '#1c6a2a';
        else {
          const cs = 16, cx = Math.floor((xx - I.x0) / cs), cy = Math.floor((y - t) / cs), a = (cx + cy) % 2 === 0;
          col = a ? '#b8743a' : '#7a4220';
          if ((y - t) % cs < 2 || (xx - I.x0) % cs < 2) col = a ? '#d0905a' : '#8e5230';
          const f = (y - t) / (h - t);
          if (f > 0.5 && f > 0.5 + bayer(xx, y) * 0.5) col = a ? '#8a6a5a' : '#5a4440'; // fades into the lake haze
        }
        if (e === 0) col = '#0e2a1a';
        P.set(xx, y, col);
      }
    }
    if (I.x1 - I.x0 > 220) falls.push({ x: I.x0 + Math.floor((I.x1 - I.x0) * (0.3 + 0.3 * hash(I.x0))), top: I.top + 6, w: 10 + Math.floor(hash(I.x0 + 1) * 8) });
  }
  x.drawImage(P.done(), 0, 0);
  // little palms on the islands
  for (const I of isl) {
    const n = 1 + Math.floor(hash(I.x0 + 7) * 2);
    for (let k = 0; k < n; k++) {
      const p = palm(I.x0 * 3 + k, 0.45);
      x.drawImage(p, Math.round(I.x0 + 18 + k * 70 + hash(I.x0 + k) * 30), I.top - p.height + 4);
    }
  }
  return { c, falls };
}

// ---------- palm tree (k = scale) ----------
export function palm(seed, k = 1) {
  const W = Math.round(150 * k), H = Math.round(200 * k), P = pixels(W, H);
  const bx = W / 2 + 6 * k, lean = (hash(seed) - 0.5) * 30 * k, topY = 40 * k;
  // trunk: banded segments, slight curve
  for (let y = Math.floor(topY); y < H; y++) {
    const u = (y - topY) / (H - topY), cx = bx + lean * (1 - u) * (1 - u), half = (4 + 2.5 * u) * k;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const band = Math.floor((y - topY) / (7 * k)) % 2, nx = (x - cx) / half;
      let c = band ? '#c8945a' : '#a8703a';
      if (nx < -0.4) c = band ? '#e8b878' : '#c8945a';
      if (nx > 0.5) c = '#7a4a22';
      if (Math.abs(nx) > 0.95) c = '#3a2010';
      P.set(x, y, c);
    }
  }
  const tx = bx + lean, ty = topY;
  // fronds: drooping arcs
  const fr = [[-2.7, 1], [-2.1, 0.9], [-1.2, 0.8], [-0.5, 0.95], [0.25, 0.9], [-1.65, 0.7], [-0.9, 0.75]];
  for (const [a0, len] of fr) {
    const L = 68 * k * len;
    for (let s = 0; s < L; s++) {
      const u = s / L, a = a0 + (Math.cos(a0) > 0 ? 1 : -1) * 0.0 + u * u * 1.1 * (Math.cos(a0) > 0 ? 1 : -1);
      const px = tx + Math.cos(a0) * s, py = ty + Math.sin(a0) * s + u * u * 34 * k;
      const wdt = Math.max(1, 9 * k * Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.05)));
      for (let q = -wdt; q <= wdt; q++) {
        const ex = px + Math.sin(a0) * q * 0.4, ey = py + q * 0.9;
        const edge = Math.abs(q) > wdt - 1;
        const notch = (Math.floor(s / (4 * k)) % 2 === 0 && Math.abs(q) > wdt * 0.5);
        if (notch) continue;
        P.set(ex, ey, edge ? '#0e4a22' : q < 0 ? '#5cd84a' : '#28a038');
      }
      void a;
    }
  }
  // coconuts
  for (const [dx, dy] of [[-4, 4], [3, 6], [0, 9]]) for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (xx * xx + yy * yy <= 9 * k * k + 3) P.set(tx + dx * k + xx, ty + dy * k + yy, xx + yy < -1 ? '#a87038' : '#5a3418');
  return outline(P.done(), '#0b2a14');
}

// ---------- sunflower (frame f: petal rotation) ----------
export function sunflower(f) {
  const w = 30, h = 64, P = pixels(w, h), cx = 15, cy = 13;
  for (let y = 22; y < h; y++) { P.set(cx, y, '#1c7a2a'); P.set(cx + 1, y, '#2aa83a'); }
  for (const [ly, dir] of [[38, -1], [48, 1]]) for (let i = 0; i < 9; i++) for (let q = 0; q < 3 - Math.abs(i - 4) / 2; q++) P.set(cx + dir * (i + 1), ly - i * 0.5 + q, q === 0 ? '#5cd84a' : '#2aa83a');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + f * (Math.PI / 8);
    for (let s = 6; s < 13; s++) for (let q = -2; q <= 2; q++) {
      const px = cx + Math.cos(a) * s - Math.sin(a) * q * (1 - (s - 6) / 9), py = cy + Math.sin(a) * s + Math.cos(a) * q * (1 - (s - 6) / 9);
      P.set(px, py, q < 0 ? '#fff27a' : '#ffc81a');
    }
  }
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const d = x * x + y * y; if (d <= 38) P.set(cx + x, cy + y, d > 26 ? '#7a3a0a' : (x + y) % 3 === 0 ? '#c86a1a' : '#a4521a'); }
  return outline(P.done());
}
export function purpleFlower(seed) {
  const w = 28, h = 26, P = pixels(w, h);
  for (let i = 0; i < 5; i++) { const x = 4 + i * 5; for (let y = 10; y < h; y++) P.set(x + (y % 4 === 0 ? 1 : 0), y, '#1c7a2a'); }
  for (let i = 0; i < 5; i++) {
    const cx = 4 + i * 5, cy = 4 + Math.floor(hash(seed * 7 + i) * 8);
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) P.set(cx + x, cy + y, x * x + y * y <= 2 ? '#ffffff' : x + y < 0 ? '#e48aff' : '#a838d8');
  }
  return outline(P.done());
}

// Totem pole of carved bald heads, wings on top (the Cabald's idol).
export function totem(heads) {
  const w = 56, h = 40 + heads.length * 34, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#5a3418'; x.fillRect(14, 30, 28, h - 30);
  heads.forEach((hd, i) => {
    const y = 34 + i * 34;
    x.fillStyle = i % 2 ? '#c8803a' : '#e09a4a'; x.fillRect(12, y, 32, 34);
    x.fillStyle = '#7a4418'; x.fillRect(12, y + 32, 32, 2);
    x.drawImage(hd, 12, y + 1);
  });
  // tint the faces wood-brown so they read as carved
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = 0.42; x.fillStyle = '#a0581c'; x.fillRect(0, 30, w, h);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  // wings
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    x.fillStyle = i % 2 ? '#f8f8ff' : '#d8dcff';
    const wx = s < 0 ? 12 - 10 - i * 3 : 44 + i * 3;
    x.fillRect(wx, 14 + i * 4, 10, 18 - i * 3);
  }
  x.fillStyle = '#e09a4a'; x.fillRect(10, 22, 36, 12);
  x.fillStyle = '#ffd34a'; x.fillRect(20, 4, 16, 20);
  x.fillStyle = '#ff6a2a'; x.fillRect(24, 8, 8, 12);
  return outline(c);
}

// ---------- loop (ring band with grass on the inner running surface) ----------
export function loopArt(r, th = 40) {
  const R2 = r + th, S = Math.round(R2 * 2 + 8), c0 = S / 2, P = pixels(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - c0, dy = y + 0.5 - c0, d = Math.hypot(dx, dy);
      if (d < r - 7 || d > R2) continue;
      let col;
      if (d < r - 5) col = PAL.grassInk;
      else if (d < r - 2) col = PAL.grassHi;
      else if (d < r + 4) col = PAL.grass;
      else if (d < r + 7) col = PAL.grassLo;
      else if (d < r + 8) col = PAL.grassInk;
      else if (d > R2 - 2) col = PAL.ink;
      else {
        // polar checker so the cells follow the curve
        const a = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2), ci = Math.floor(a * 36), cj = Math.floor((d - r - 8) / 16);
        const A = (ci + cj) % 2 === 0, ld = (d - r - 8) % 16, la = (a * 36) % 1;
        col = A ? PAL.chkA : PAL.chkB;
        if (ld < 2 || la < 0.1) col = A ? PAL.chkAHi : PAL.chkBHi;
        if (ld > 13 || la > 0.88) col = A ? PAL.chkALo : PAL.chkBLo;
        if (d < r + 12) col = rgb(col).map((v) => Math.round(v * 0.62));
      }
      P.set(x, y, col);
    }
  return P.done();
}

// ---------- props ----------
export function spikes(n) {
  const w = n * 16, h = 26, P = pixels(w, h + 6);
  for (let i = 0; i < n; i++) for (let y = 0; y < h; y++) {
    const half = Math.floor((y / h) * 7);
    for (let x = -half; x <= half; x++) P.set(i * 16 + 8 + x, y, x < -half / 3 ? '#ffffff' : x < half / 3 ? '#b8c0d8' : '#6a7090');
  }
  for (let x = 0; x < w; x++) for (let y = h; y < h + 6; y++) P.set(x, y, y === h ? '#ffffff' : y > h + 3 ? '#4a5070' : '#9aa2c0');
  return outline(P.done());
}
// Diagonal spring (up-right): k = 0 compressed .. 1 extended
export function spring(k) {
  const c = canvas(64, 64), x = c.getContext('2d');
  x.translate(18, 52); x.rotate(-Math.PI / 4);
  x.fillStyle = '#5a6078'; x.fillRect(-16, -4, 32, 10);
  x.fillStyle = '#b8c0d8'; x.fillRect(-16, -4, 32, 3);
  const ext = 4 + 16 * k;
  for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#8a90a8' : '#e8ecf8'; x.fillRect(-10, -4 - (ext * (i + 1)) / 4, 20, Math.max(2, ext / 4 - 1)); }
  x.fillStyle = '#c81c24'; x.fillRect(-17, -4 - ext - 9, 34, 9);
  x.fillStyle = '#ff6a5a'; x.fillRect(-17, -4 - ext - 9, 34, 3);
  x.fillStyle = '#ffd34a'; x.fillRect(-6, -4 - ext - 7, 12, 4);
  return outline(c);
}
// Dash panel: arrows light up in sequence (frame f)
export function booster(f) {
  const w = 72, h = 12, P = pixels(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) P.set(x, y, y < 2 ? '#e8ecf8' : y > h - 3 ? '#3a3f58' : '#6a7090');
  for (let i = 0; i < 4; i++) {
    const on = (i + f) % 4 === 0, col = on ? '#ffffff' : '#ffd34a';
    for (let y = 3; y < h - 3; y++) { const dx = Math.abs(y - h / 2 + 0.5); for (let q = 0; q < 4; q++) P.set(8 + i * 16 + dx + q, y, on ? col : i % 2 ? '#ffb020' : col); }
  }
  return outline(P.done());
}

// ---------- rings (spin frames: width factor) ----------
export function ring(k) {
  const S = 24, P = pixels(S, S), w = Math.max(1.2, 11 * Math.abs(k)), h = 11, c0 = S / 2;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - c0) / w, ny = (y + 0.5 - c0) / h, d = Math.hypot(nx, ny);
      const inner = w > 4 ? 0.58 : -1;
      if (d > 1 || d < inner) continue;
      let col = PAL.ring;
      if (d > 0.88 || (d < inner + 0.12 && inner > 0)) col = PAL.ringInk;
      else if (nx < -0.2 && ny < 0.25) col = PAL.ringHi;
      else if (nx > 0.35 || ny > 0.55) col = PAL.ringLo;
      if (w <= 4) col = Math.abs(nx) < 0.5 ? PAL.ringHi : PAL.ringLo;
      P.set(x, y, col);
    }
  return P.done();
}

// ---------- badniks (bald heads in robot shells); frame f animates ----------
const shade = (lit, cols) => (lit > 0.45 ? cols[3] : lit > -0.1 ? cols[2] : lit > -0.55 ? cols[1] : cols[0]);
export function motobug(head, f) {
  const w = 72, h = 56, P = pixels(w, h);
  const red = ['#7a0a10', '#b81a1a', '#e83a2a', '#ff8a6a'];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x - 42) / 26, ny = (y - 30) / 22;
    if (nx * nx + ny * ny <= 1 && y <= 38) {
      let col = shade(-0.6 * nx - 0.8 * ny, red);
      const spot = [[36, 18], [50, 22], [44, 32], [56, 34]].some(([sx, sy]) => (x - sx) ** 2 + (y - sy) ** 2 < 14);
      if (spot) col = '#1a1018';
      if (nx < -0.2 && ny < -0.4 && (x + y) % 5 === 0) col = '#ffffff';
      P.set(x, y, col);
    }
    if (y > 37 && y < 44 && x > 18 && x < 68) P.set(x, y, y < 39 ? '#e8ecf8' : '#8a90a8');
  }
  // wheel
  for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) {
    const d = Math.hypot(x, y);
    if (d > 10) continue;
    const a = Math.atan2(y, x) + f * 0.8;
    let col = d > 7 ? '#2a2a34' : d > 3 ? (Math.cos(a * 3) > 0.5 ? '#e8ecf8' : '#5a6078') : '#ffd34a';
    P.set(44 + x, 45 + y, col);
  }
  // exhaust pipe + antenna
  for (let x = 64; x < 71; x++) for (let y = 34; y < 38; y++) P.set(x, y, y === 34 ? '#e8ecf8' : '#8a90a8');
  for (let y = 0; y < 8; y++) P.set(48, y + 2, '#8a90a8');
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) P.set(47 + x, y, f % 2 ? '#ffd34a' : '#ff5a2a');
  const c = outline(P.done()), x = c.getContext('2d');
  x.drawImage(head, 2, 12);
  return outline(c);
}
export function buzzer(head, f) {
  const w = 92, h = 60, P = pixels(w, h);
  const yel = ['#8a5a00', '#d8a00a', '#ffd02a', '#fff08a'];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x - 64) / 22, ny = (y - 34) / 12;
    if (nx * nx + ny * ny <= 1) { const stripe = Math.floor((x - 42) / 7) % 2 === 1; P.set(x, y, stripe ? '#1a1a24' : shade(-0.3 * nx - 0.9 * ny, yel)); }
    const tx = (x - 40) / 13, ty = (y - 32) / 10;
    if (tx * tx + ty * ty <= 1) P.set(x, y, shade(-0.5 * tx - 0.8 * ty, ['#3a3f58', '#6a7090', '#b8c0d8', '#ffffff']));
  }
  // stinger cannon
  for (let i = 0; i < 12; i++) for (let q = -2; q <= 2; q++) P.set(78 + i * 0.4 + q, 44 + i, q < 0 ? '#e8ecf8' : '#8a90a8');
  // wings
  const wy = f % 2 ? 12 : 4;
  for (const [cx, sz] of [[44, 1], [56, 0.85]]) for (let y = -9; y <= 9; y++) for (let x = -14; x <= 14; x++) {
    const d = (x / (14 * sz)) ** 2 + (y / (8 * sz)) ** 2;
    if (d <= 1) P.set(cx + x, wy + 8 + y + x * 0.2, d > 0.75 ? '#5a8ab8' : (x + y) % 4 === 0 ? '#ffffff' : '#cfe8ff', 210);
  }
  const c = outline(P.done()), x = c.getContext('2d');
  x.drawImage(head, 2, 14);
  return outline(c);
}
export function crabmeat(head, f) {
  const w = 104, h = 70, P = pixels(w, h);
  const red = ['#6a0a14', '#a81a24', '#e0402a', '#ff9070'];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x - 52) / 30, ny = (y - 46) / 16;
    if (nx * nx + ny * ny <= 1) P.set(x, y, y > 52 ? '#f0d8b0' : shade(-0.4 * nx - 0.9 * ny, red));
  }
  // legs
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const lx = 52 + s * (14 + k * 8), up = (k + f) % 2 ? 2 : 0;
    for (let i = 0; i < 10; i++) { P.set(lx + s * i * 0.6, 56 + i - up, '#a81a24'); P.set(lx + s * i * 0.6 + 1, 56 + i - up, '#e0402a'); }
  }
  // claws (raised, snapping)
  for (const s of [-1, 1]) {
    const cx = 52 + s * 40, cy = 20 + (f % 2 ? 2 : 0);
    for (let i = 0; i < 16; i++) { P.set(52 + s * (26 + i * 0.6), 44 - i * 1.2, '#a81a24'); P.set(52 + s * (27 + i * 0.6), 44 - i * 1.2, '#e0402a'); }
    for (let y = -10; y <= 10; y++) for (let x = -9; x <= 9; x++) {
      const d = (x / 9) ** 2 + (y / 10) ** 2, gap = y < 2 && y > -3 && x * s > -2 && f % 2;
      if (d <= 1 && !gap) P.set(cx + x, cy + y, shade(-0.5 * x / 9 - 0.8 * y / 10, red));
    }
  }
  const c = outline(P.done()), x = c.getContext('2d');
  x.drawImage(head, 36, 8);
  return outline(c);
}

// ---------- freed animals ----------
export function animal(kind, f) {
  const P = pixels(22, 22);
  const R = (x0, y0, w, h, col) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) P.set(x, y, col); };
  if (kind === 'rabbit') {
    const up = f ? 0 : 2;
    R(7, 2 + up, 3, 8, '#ffffff'); R(11, 1 + up, 3, 9, '#ffffff'); R(8, 4 + up, 1, 5, '#ff9ab8'); R(12, 3 + up, 1, 6, '#ff9ab8');
    R(5, 9 + up, 11, 9 - up, '#ffffff'); R(6, 15, 10, 3, '#e0e4f0'); R(13, 11 + up, 2, 2, '#1a1018'); R(15, 13 + up, 2, 1, '#ff6a8a');
    R(f ? 3 : 5, 18, 5, 3, '#e0e4f0'); R(f ? 13 : 12, 18, 5, 3, '#e0e4f0');
    R(8, 0 + up, 6, 2, '#5ad0ff'); // fresh hair tuft
  } else if (kind === 'bird') {
    R(5, 7, 12, 9, '#3a8aff'); R(8, 11, 8, 5, '#ffffff'); R(14, 8, 2, 2, '#1a1018'); R(17, 10, 3, 2, '#ffb020');
    R(3, 10, 3, 3, '#1a5ad8');
    if (f) R(4, 1, 8, 6, '#5aa6ff'); else R(4, 14, 8, 5, '#5aa6ff');
    R(9, 4, 5, 3, '#ffd34a');
  } else {
    R(5, 8, 10, 10, '#c8803a'); R(7, 12, 6, 6, '#f0d8b0'); R(12, 10, 2, 2, '#1a1018'); R(14, 12, 2, 1, '#5a2a10');
    R(1, f ? 4 : 6, 5, 11, '#e09a4a'); R(1, f ? 4 : 6, 2, 11, '#a85a18'); R(9, 5, 2, 3, '#c8803a'); R(f ? 5 : 6, 18, 4, 3, '#a85a18'); R(11, 18, 4, 3, '#a85a18');
    R(8, 4, 6, 2, '#ff5ab0');
  }
  return outline(P.done());
}

// ---------- boss: hover-pod hull ----------
export function podHull() {
  const w = 156, h = 92, P = pixels(w, h);
  const hull = ['#5a6078', '#9aa2c0', '#d8dcec', '#ffffff'];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x - 78) / 76, ny = (y - 18) / 66;
    if (y < 18 || nx * nx + ny * ny > 1) continue;
    let col = shade(-0.45 * nx - 0.7 * ny + 0.2, hull);
    if (y >= 30 && y < 40) col = Math.floor((x + y) / 7) % 2 ? '#1a1a24' : '#ffd02a'; // hazard band
    if (y < 21) col = '#3a3f58';
    P.set(x, y, col);
  }
  // headlight and jet nozzle
  for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 25) P.set(22 + x, 52 + y, x * x + y * y < 8 ? '#ffffff' : '#ffe27a');
  for (let y = 78; y < 90; y++) for (let x = 64; x < 92; x++) P.set(x, y, y < 81 ? '#d8dcec' : '#5a6078');
  return outline(P.done());
}
// Robotnik-grade handlebar moustache (56×20; centre at 28, 6).
export function moustache() {
  const P = pixels(56, 20);
  for (let y = 0; y < 20; y++) for (let x = 0; x < 56; x++) {
    const u = (x - 28) / 28, ax = Math.abs(u);
    const top = 4 + ax * 3 - (ax > 0.75 ? (ax - 0.75) * 40 : 0), bot = 12 - ax * 6 + (ax > 0.75 ? -(ax - 0.75) * 20 : 0);
    if (y < top || y > bot || ax > 1) continue;
    P.set(x, y, y < top + 2 ? '#ffb060' : y > bot - 2 ? '#7a3008' : '#d86a1c');
  }
  return outline(P.done(), '#3a1404');
}
// Checkered wrecking ball (rotation a).
export function wreckBall(a, r = 24) {
  const S = r * 2 + 4, P = pixels(S, S), c0 = S / 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - c0, dy = y + 0.5 - c0, d = Math.hypot(dx, dy);
    if (d > r) continue;
    const nz = Math.sqrt(Math.max(0, 1 - (d / r) ** 2)), u = Math.atan2(dx / r, nz) + a, v = Math.asin(Math.max(-1, Math.min(1, dy / r)));
    const chk = (Math.floor(u / (Math.PI / 4) + 8) + Math.floor(v / (Math.PI / 6) + 8)) % 2 === 0;
    const lit = (-dx * 0.5 - dy * 0.7) / r + nz * 0.6;
    let col = chk ? (lit > 0.75 ? '#ffffff' : lit > 0.25 ? '#d8dcec' : '#8a90a8') : (lit > 0.75 ? '#5a6078' : lit > 0.25 ? '#2a2f48' : '#14182a');
    if (dx < -r * 0.3 && dy < -r * 0.3 && d < r * 0.75 && d > r * 0.5 && lit > 0.8) col = '#ffffff';
    P.set(x, y, col);
  }
  return outline(P.done());
}

// ---------- signpost plate faces ----------
export function signFace(img) {
  const S = 60, c = canvas(S, S), x = c.getContext('2d');
  x.fillStyle = '#10142a'; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 7); x.fill();
  x.fillStyle = '#2f56e6'; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, 7); x.fill();
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 6, 0, 7); x.fill();
  x.fillStyle = '#9cc0ff'; x.beginPath(); x.arc(S / 2 + 2, S / 2 + 2, S / 2 - 8, 0, 7); x.fill();
  if (img) x.drawImage(img, S / 2 - img.width / 2, S / 2 - img.height / 2 + 1);
  return c;
}

// ---------- title emblem ----------
export function emblem(R = 118) {
  const S = R * 2 + 8, P = pixels(S + 220, S), c0x = S / 2 + 110, c0 = S / 2;
  // wings
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
    const len = 120 - i * 14, y0 = c0 - 70 + i * 22, x0 = c0x + s * (R - 20);
    for (let k = 0; k < len; k++) for (let q = 0; q < 16; q++) {
      const yy = y0 + q + k * 0.22 * (i - 2) * 0.3 + (k / len) ** 2 * 18;
      const end = len - k < 12 && q > (len - k) * 1.3;
      if (end) continue;
      P.set(x0 + s * k, yy, q < 2 ? '#2a3a8a' : q < 6 ? '#ffffff' : q < 13 ? '#e2e8ff' : '#aab8f0');
    }
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - c0, dy = y + 0.5 - c0, d = Math.hypot(dx, dy);
    if (d > R) continue;
    let col;
    if (d > R - 4) col = '#6a3a00';
    else if (d > R - 14) col = dx + dy < -40 ? '#fff6b4' : dx + dy > 60 ? '#d88a0a' : '#ffd02a';
    else if (d > R - 17) col = '#6a3a00';
    else {
      const a = Math.atan2(dy, dx), star = 0.55 + 0.45 * Math.abs(Math.cos(a * 4));
      col = d / (R - 17) < star * 0.92 ? (d < 30 ? '#ffffff' : '#e8f0ff') : d / (R - 17) < star ? '#9cc0ff' : (d < R * 0.6 ? '#2f56e6' : '#1a34c8');
    }
    P.set(x + 110, y, col);
  }
  return outline(P.done(), '#10142a');
}
