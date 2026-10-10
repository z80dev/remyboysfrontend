// Pixel art: the Remy sprite rig (cut from the committed quest sprites) and every level tile, generated once in
// prepare() at the game's native 960×540 resolution. Everything is deterministic (hash-based, no Math.random).
import { hash } from 'filmkit/lib.js';

const MEDIA = new URL('../../media/quest/', import.meta.url);

export const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return c;
};
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);

// Direct pixel buffer for generated art.
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

async function loadImg(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

// ---------- Remy rig ----------
// Quest sprites: body (crop/f rows) + hem + pants + shoes, 2px pad. far = f 9, near = f 6 (scripts/quest-art.py).
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
  // White silhouette for glows / hit flashes.
  const sil = canvas(c.width, c.height), sx = sil.getContext('2d');
  sx.drawImage(c, 0, 0);
  sx.globalCompositeOperation = 'source-in';
  sx.fillStyle = '#fff';
  sx.fillRect(0, 0, c.width, c.height);
  return { c, sil, w: c.width, h: c.height, legTop: PAD + bodyH + hem, cx: PAD + Math.floor(bodyW / 2), top, bottom };
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

// Compose a posed Remy (legs + sheared body) into scratch, then place it with feet at (x, feet).
// o: { lift: [l, r], stride: [l, r], lean, flip, sx, sy, upside, alpha, glow: colour, glowA, white }
export function drawRemy(ctx, R, x, feet, o = {}) {
  const M = 6, W = R.w + M * 2, Hh = R.h + M * 2;
  const s = getScratch(0, W, Hh), sc = s.getContext('2d');
  const [ll, lr] = o.lift ?? [0, 0], [sl, sr] = o.stride ?? [0, 0], lean = o.lean ?? 0;
  const src = o.white ? R.sil : R.c;
  const lh = R.h - R.legTop;
  sc.drawImage(src, 0, R.legTop, R.cx, lh, M + sl, M + R.legTop - ll, R.cx, lh);
  sc.drawImage(src, R.cx, R.legTop, R.w - R.cx, lh, M + R.cx + sr, M + R.legTop - lr, R.w - R.cx, lh);
  for (let y = 0; y < R.legTop; y += 3) {
    const hgt = Math.min(3, R.legTop - y), dx = Math.round((R.legTop - y) * lean);
    sc.drawImage(src, 0, y, R.w, hgt, M + dx, M + y, R.w, hgt);
  }
  if (o.glow) {
    const g = getScratch(1, W, Hh), gc = g.getContext('2d');
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2]]) gc.drawImage(s, dx, dy);
    gc.globalCompositeOperation = 'source-in';
    gc.fillStyle = o.glow;
    gc.fillRect(0, 0, g.width, g.height);
    ctx.save();
    ctx.globalAlpha = (o.alpha ?? 1) * (o.glowA ?? 1);
    place(ctx, g, R, x, feet, o, M);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  place(ctx, s, R, x, feet, o, M);
  ctx.restore();
}
function place(ctx, s, R, x, feet, o, M) {
  const ax = M + R.w / 2, ay = M + R.bottom + 1;
  ctx.translate(Math.round(x), Math.round(feet));
  if (o.rot) ctx.rotate(o.rot);
  if (o.upside) ctx.translate(0, -(R.bottom - R.top + 1));
  ctx.scale((o.flip ? -1 : 1) * (o.sx ?? 1), (o.sy ?? 1) * (o.upside ? -1 : 1));
  ctx.drawImage(s, -ax, -ay);
}

// Bald head crop (for the kicked "shell").
export function headCrop(R) {
  const h = 44, c = canvas(R.w, h);
  c.getContext('2d').drawImage(R.c, 0, R.top, R.w, h, 0, 0, R.w, h);
  return c;
}

// 16px overworld heads atlas → single head canvas, scaled k×.
export async function loadHeads() {
  return loadImg(new URL('heads.webp', MEDIA).href);
}
export function headIcon(atlas, i, k = 1) {
  const c = canvas(16 * k, 16 * k);
  c.getContext('2d').drawImage(atlas, (i % 67) * 16, Math.floor(i / 67) * 16, 16, 16, 0, 0, 16 * k, 16 * k);
  return c;
}

// ---------- palette ----------
export const PAL = {
  ink: '#1a1228',
  skyTop: '#3a6fd8', skyMid: '#5f9cf0', skyLow: '#9fd4ff', skyHz: '#d7f1ff',
  grassHi: '#a8f07c', grass: '#5ccc4a', grassLo: '#2f9a3a', grassInk: '#16502a',
  dirt: '#c0702f', dirtLo: '#96501f', dirtDeep: '#6e3818', dirtHi: '#e29852', rock: '#8a6a58', rockHi: '#b89a84',
  brick: '#c8622c', brickHi: '#f09456', brickLo: '#94401c', mortar: '#4a1c0c',
  q: '#f8b420', qHi: '#ffe27a', qLo: '#c4700e', qInk: '#5a2e06',
  used: '#9a6a3c', usedHi: '#c4945e', usedLo: '#6a4222',
  hard: '#b4683a', hardHi: '#eaa06a', hardLo: '#6c3618',
  coin: '#ffcc2e', coinHi: '#fff6b0', coinLo: '#e08a0c', coinInk: '#6e4000',
};

// ---------- blob shading (clouds, bushes, hills, canopies) ----------
// circles: [[cx, cy, r]]; shades: [outline, shadow, base, light, highlight]
function blob(w, h, circles, shades, { outline = true, flatBottom = false, seams = null, belly = 0 } = {}) {
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
      const edge = outline && (at(x - 1, y) < 0 || at(x + 1, y) < 0 || at(x, y - 1) < 0 || (!flatBottom && at(x, y + 1) < 0));
      let col = l > 0.62 ? shades[4] : l > 0.2 ? shades[3] : l > -0.35 ? shades[2] : shades[1];
      if (belly && y > h * (1 - belly)) col = shades[1];
      // seam where a lower puff tucks under a higher one
      if (seams) { const up = at(x, y - 1); if (up >= 0 && up !== i && circles[up][1] < cy) col = seams; }
      P.set(x, y, edge ? shades[0] : col);
    }
  return P.done();
}

export function cloud(seed, w = 120) {
  const h = Math.round(w * 0.55), cs = [];
  const n = 4 + Math.floor(hash(seed) * 3);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, r = (0.13 + 0.1 * Math.sin(Math.PI * u) + 0.05 * hash(seed * 31 + i)) * w;
    cs.push([w * (0.1 + 0.8 * u), h * 0.62 - r * 0.55 * Math.sin(Math.PI * u) - 1, r]);
  }
  for (let i = 0; i < 3; i++) cs.push([w * (0.22 + 0.28 * i), h - w * 0.1, w * 0.13]);
  return blob(w, h, cs, ['#7fa9e0', '#d3e3f8', '#ffffff', '#ffffff', '#ffffff'], { flatBottom: true, seams: '#c4d8f4', belly: 0.22 });
}
export function bush(seed, w = 72) {
  const h = Math.round(w * 0.5), cs = [];
  const n = 3 + Math.floor(hash(seed) * 2);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, r = (0.16 + 0.1 * Math.sin(Math.PI * u)) * w;
    cs.push([w * (0.16 + 0.68 * u), h - r * 0.8, r]);
  }
  return blob(w, h, cs, [PAL.grassInk, '#2c8a3a', '#43b24a', '#6fd65e', '#b4f590'], { flatBottom: true, seams: '#2c8a3a' });
}

// ---------- sky (dithered bands) ----------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function sky(w, h) {
  const stops = [[0, '#3466d0'], [0.35, '#4d8ae6'], [0.62, '#76b4f6'], [0.82, '#a8dcff'], [1, '#e2f6ff']].map(([p, c]) => [p, rgb(c)]);
  const P = pixels(w, h), bands = 14;
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const q = v * bands, b0 = Math.floor(q), f = q - b0;
      const pick = f * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? b0 + 1 : b0;
      const p = Math.min(1, pick / bands);
      let k = 0;
      while (k < stops.length - 2 && p > stops[k + 1][0]) k++;
      const [pa, ca] = stops[k], [pb, cb] = stops[k + 1], u = (p - pa) / (pb - pa);
      P.set(x, y, ca.map((a, i) => Math.round(a + (cb[i] - a) * u)));
    }
  }
  return P.done();
}

// ---------- far mountains ----------
export function mountains(w, h) {
  const P = pixels(w, h);
  const haze = rgb('#bcd8f6');
  const ranges = [
    { n: 16, step: 100, base: 30, var: 50, s: 0.85, lit: '#b2caf0', shade: '#9ab6e6', snowL: '#ffffff', snowS: '#dbe7f8', seed: 1 },
    { n: 13, step: 125, base: 85, var: 45, s: 1.0, lit: '#93b2e6', shade: '#7b9bd6', snowL: '#f6faff', snowS: '#c9d9f2', seed: 2 },
  ];
  for (const R of ranges) {
    const peaks = Array.from({ length: R.n }, (_, i) => ({ x: i * R.step + hash(i + R.seed * 50) * R.step * 0.6, y: R.base + hash(i + R.seed * 70) * R.var, s: R.s * (0.8 + 0.4 * hash(i + R.seed * 90)) }));
    for (let x = 0; x < w; x++) {
      let top = 1e9, own = null;
      for (const p of peaks) { const t = p.y + Math.abs(x - p.x) * p.s; if (t < top) { top = t; own = p; } }
      top = Math.round(top);
      const lit = x < own.x;
      const snowLine = own.y + 20 + Math.floor(h2(Math.floor(x / 3), 1, R.seed) * 4) * 2;
      for (let y = Math.max(0, top); y < h; y++) {
        let c = rgb(y < snowLine ? (lit ? R.snowL : R.snowS) : lit ? R.lit : R.shade);
        // ridge streaks down the shaded faces
        if (!lit && y >= snowLine && ((x - own.x) * 0.7 + y) % 17 < 1.2) c = rgb(R.shade).map((v) => v - 12);
        const f = Math.max(0, (y - h * 0.55) / (h * 0.45));
        if (f > 0 && f * 16 > BAYER[(y & 3) * 4 + (x & 3)] * 0.9) c = c.map((v, i) => Math.round(v + (haze[i] - v) * Math.min(1, f + 0.2)));
        P.set(x, y, c);
      }
    }
  }
  return P.done();
}

// ---------- mid hills with trees ----------
export function hills(w, h) {
  const c = canvas(w, h), x = c.getContext('2d');
  const back = [], front = [];
  for (let i = 0; i < 30; i++) back.push([i * 95 + hash(i) * 50, h + 30, 70 + hash(i + 9) * 60]);
  for (let i = 0; i < 34; i++) front.push([i * 80 + 30 + hash(i + 3) * 40, h + 22, 46 + hash(i + 19) * 34]);
  x.drawImage(blob(w, h, back, ['#2a6e5a', '#3b8a6c', '#4a9e7a', '#5fb48a', '#84cba0'], { seams: '#3b8a6c' }), 0, 0);
  const surf = (tx) => {
    let t = h;
    for (const [cx, cy, r] of back) if (Math.abs(tx - cx) < r) t = Math.min(t, cy - Math.sqrt(r * r - (tx - cx) ** 2));
    return t;
  };
  for (let i = 0; i < 90; i++) {
    const tw = 10 + Math.floor(hash(i + 302) * 10), tx = Math.floor(hash(i + 300) * w), base = Math.round(surf(tx + tw / 2)) + 4;
    const tall = hash(i + 303) > 0.5;
    const tree = tall
      ? blob(tw, tw * 2, [[tw / 2, tw * 0.6, tw * 0.42], [tw / 2, tw * 1.05, tw * 0.5], [tw / 2, tw * 1.45, tw * 0.5]], ['#1c5244', '#276650', '#327a5e', '#4a9672', '#6cb68a'])
      : blob(tw, tw + 4, [[tw / 2, tw / 2, tw / 2], [tw / 2, tw / 2 + 4, tw / 2.4]], ['#1c5244', '#276650', '#327a5e', '#4a9672', '#6cb68a']);
    x.fillStyle = '#3a2a22';
    x.fillRect(tx + Math.floor(tw / 2) - 1, base - 6, 2, 6);
    x.drawImage(tree, tx, base - tree.height - 3);
  }
  x.drawImage(blob(w, h, front, ['#1f6a40', '#2d874c', '#3ca457', '#58bd66', '#8ade86'], { seams: '#2d874c' }), 0, 0);
  return c;
}

// ---------- ground strip (whole level width, pits cut out) ----------
export function ground(w, h, pits) {
  const P = pixels(w, h);
  const inPit = (x) => pits.some(([l, r]) => x >= l && x < r);
  for (let x = 0; x < w; x++) {
    if (inPit(x)) continue;
    const edgeL = inPit(x - 1) || inPit(x - 2), edgeR = inPit(x + 1) || inPit(x + 2);
    const drip = 7 + Math.round(2 * Math.sin(x * 0.55) + 1.5 * Math.sin(x * 1.3 + 1) + (h2(x, 1) > 0.8 ? 2 : 0));
    for (let y = 0; y < h; y++) {
      let c;
      if (y === 0) c = PAL.grassInk;
      else if (y < 3) c = (x + y) % 7 === 0 ? '#d6ffb0' : PAL.grassHi;
      else if (y < drip - 1) c = h2(x, y) > 0.86 ? PAL.grassHi : PAL.grass;
      else if (y < drip) c = PAL.grassLo;
      else if (y === drip) c = PAL.grassInk;
      else {
        // dirt: tile-scale clumps + speckle + embedded rocks, darker with depth
        const tx = Math.floor(x / 12), ty = Math.floor((y + 6 * (tx & 1)) / 12);
        const n = h2(tx, ty, 5);
        c = y > h - 22 ? PAL.dirtLo : PAL.dirt;
        if (y > h - 10) c = PAL.dirtDeep;
        const lx = (x % 12) - 6, ly = ((y + 6 * (tx & 1)) % 12) - 6;
        if (n > 0.72 && lx * lx + ly * ly * 1.6 < 11) c = lx + ly < -2 ? PAL.rockHi : PAL.rock;
        else if (h2(x, y, 6) > 0.93) c = PAL.dirtHi;
        else if (h2(x, y, 7) > 0.9) c = PAL.dirtLo;
      }
      if (edgeL || edgeR) {
        if (inPit(edgeL ? x - 1 : x + 1)) c = y < drip ? PAL.grassInk : '#3a1a0c';
        else if (y > drip) c = PAL.dirtLo;
      }
      P.set(x, y, c);
    }
  }
  return P.done();
}

// ---------- blocks ----------
const QMARK = ['..####..', '.##..##.', '.##..##.', '.....##.', '....##..', '...##...', '...##...', '........', '...##...', '...##...'];
function bevel(P, s, ink, hi, base, lo) {
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      let c = base;
      if (x === 0 || y === 0 || x === s - 1 || y === s - 1) c = ink;
      else if (x === 1 || y === 1) c = hi;
      else if (x === s - 2 || y === s - 2) c = lo;
      P.set(x, y, c);
    }
}
export function qBlock(shine) {
  const P = pixels(24, 24);
  const base = shine > 0.66 ? '#ffd040' : shine > 0.33 ? PAL.q : '#e8a018';
  bevel(P, 24, PAL.qInk, PAL.qHi, base, PAL.qLo);
  for (const [rx, ry] of [[3, 3], [19, 3], [3, 19], [19, 19]]) { P.set(rx, ry, PAL.qInk); P.set(rx + 1, ry, PAL.qInk); P.set(rx, ry + 1, PAL.qInk); P.set(rx + 1, ry + 1, PAL.qLo); }
  QMARK.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '#') return;
    P.set(8 + x + 1, 6 + y + 1, PAL.qLo);
  }));
  QMARK.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && P.set(8 + x, 6 + y, '#fffdf0')));
  return P.done();
}
export function usedBlock() {
  const P = pixels(24, 24);
  bevel(P, 24, '#3a2010', PAL.usedHi, PAL.used, PAL.usedLo);
  for (const [rx, ry] of [[3, 3], [19, 3], [3, 19], [19, 19]]) { P.set(rx, ry, '#3a2010'); P.set(rx + 1, ry + 1, '#3a2010'); }
  return P.done();
}
export function brick() {
  const P = pixels(24, 24);
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 24; x++) {
      const row = Math.floor(y / 6), off = row & 1 ? 6 : 0, bx = (x + off) % 12, by = y % 6;
      let c = PAL.brick;
      if (by === 5 || bx === 11) c = PAL.mortar;
      else if (by === 0 || bx === 0) c = PAL.brickHi;
      else if (by === 4 || bx === 10) c = PAL.brickLo;
      else if (h2(x, y, 11) > 0.9) c = PAL.brickLo;
      if (y === 0) c = PAL.ink;
      P.set(x, y, c);
    }
  return P.done();
}
export function hardBlock() {
  const P = pixels(24, 24);
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 24; x++) {
      let c = PAL.hard;
      if (x === 0 || y === 0 || x === 23 || y === 23) c = '#3a1a0a';
      else if (x < 4 && y < 24 - x - 1 && y >= x) c = x < 2 ? PAL.hardHi : PAL.hard;
      if (x > 0 && y > 0 && x < 23 && y < 23) {
        if (y <= 3 && x >= y && x <= 23 - y) c = PAL.hardHi;
        else if (x <= 3 && y > x && y < 23 - x) c = '#d68a54';
        else if (y >= 20 && x >= 23 - y && x <= y) c = PAL.hardLo;
        else if (x >= 20 && y > 23 - x && y < x) c = '#8a4622';
        else if (h2(x, y, 12) > 0.92) c = '#c47a48';
      }
      P.set(x, y, c);
    }
  return P.done();
}

// ---------- pipe ----------
const PIPE_COLS = ['#0c3a16', '#156a2a', '#1f8a36', '#2fb34a', '#5fd96f', '#b4f7a8', '#7ae682', '#3fc054', '#2fb34a', '#2fb34a', '#2a9e42', '#1f8a36', '#156a2a', '#0c3a16'];
export function pipe(w, h) {
  const P = pixels(w + 6, h);
  const col = (x, W) => PIPE_COLS[Math.min(PIPE_COLS.length - 1, Math.floor((x / W) * PIPE_COLS.length))];
  for (let y = 0; y < h; y++) {
    const lip = y < 18, W = lip ? w + 6 : w, ox = lip ? 0 : 3;
    for (let x = 0; x < W; x++) {
      let c = col(x, W);
      if (x === 0 || x === W - 1 || y === 0 || (lip && y === 17)) c = PAL.ink;
      if (lip && y === 16) c = '#0f4a1c';
      if (!lip && y === 18) c = '#0f4a1c';
      P.set(ox + x, y, c);
    }
  }
  return P.done();
}

// ---------- coin (spin frame: width factor) ----------
export function coin(k) {
  const w = Math.max(2, Math.round(14 * Math.abs(k))), h = 18, P = pixels(16, h), ox = Math.floor((16 - w) / 2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5) / w * 2 - 1, ny = (y + 0.5) / h * 2 - 1;
      const r = nx * nx + ny * ny;
      if (r > 1.0 && w > 3) continue;
      let c = PAL.coin;
      if (r > 0.7 || w <= 3) c = r > 0.86 || w <= 3 ? PAL.coinInk : PAL.coinLo;
      else if (nx < -0.25 && ny < 0.3) c = PAL.coinHi;
      else if (Math.abs(nx) < 0.18 && Math.abs(ny) < 0.5 && w > 8) c = PAL.coinLo;
      P.set(ox + x, y, c);
    }
  return P.done();
}

// ---------- castle ----------
export function castle(w) {
  const h = 210, P = pixels(w, h);
  const keep = { x0: 28, x1: w - 28, y0: 64 };
  const towerY = 0, tower = { x0: w / 2 - 34, x1: w / 2 + 34 };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const inKeep = y >= keep.y0 + 14 && x >= 0 && x < w;
      const crenKeep = y >= keep.y0 && y < keep.y0 + 14 && Math.floor(x / 14) % 2 === 0;
      const inTower = x >= tower.x0 && x < tower.x1 && y >= towerY + 14 && y < keep.y0 + 14;
      const crenTower = x >= tower.x0 && x < tower.x1 && y >= towerY && y < towerY + 14 && Math.floor((x - tower.x0) / 12) % 2 === 0;
      if (!(inKeep || crenKeep || inTower || crenTower)) continue;
      const row = Math.floor(y / 8), bx = (x + (row & 1 ? 8 : 0)) % 16, by = y % 8;
      let c = '#b8b2c8';
      if (by === 7 || bx === 15) c = '#4a4058';
      else if (by === 0 || bx === 0) c = '#e2ddf0';
      else if (h2(x, y, 13) > 0.9) c = '#9c94b0';
      // outlines
      const solid = (xx, yy) => {
        if (xx < 0 || xx >= w || yy < 0 || yy >= h) return false;
        return (yy >= keep.y0 + 14) || (yy >= keep.y0 && yy < keep.y0 + 14 && Math.floor(xx / 14) % 2 === 0) ||
          (xx >= tower.x0 && xx < tower.x1 && yy >= towerY + 14 && yy < keep.y0 + 14) ||
          (xx >= tower.x0 && xx < tower.x1 && yy >= towerY && yy < towerY + 14 && Math.floor((xx - tower.x0) / 12) % 2 === 0);
      };
      if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1)) c = PAL.ink;
      P.set(x, y, c);
    }
  // door arch + windows
  const door = (x, y, dw, dh) => {
    for (let yy = 0; yy < dh; yy++)
      for (let xx = 0; xx < dw; xx++) {
        const nx = (xx + 0.5 - dw / 2) / (dw / 2), ny = yy - dw / 2;
        if (ny < 0 && nx * nx + (ny / (dw / 2)) ** 2 > 1) continue;
        P.set(x + xx, y + yy, '#120a1c');
      }
  };
  door(w / 2 - 22, h - 70, 44, 70);
  door(w / 2 - 8, 26, 16, 26);
  door(30, 110, 14, 24);
  door(w - 44, 110, 14, 24);
  return P.done();
}

// ---------- flags ----------
export function flag(colour, icon) {
  const w = 44, h = 34, P = pixels(w, h);
  for (let y = 0; y < h; y++) {
    const half = h / 2, span = Math.round(w * (1 - Math.abs(y + 0.5 - half) / half));
    for (let x = w - span; x < w; x++) P.set(x, y, x === w - span || y === 0 || y === h - 1 ? PAL.ink : colour);
  }
  const c = P.done();
  if (icon) c.getContext('2d').drawImage(icon, w - 22, h / 2 - 8);
  return c;
}
