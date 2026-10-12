// Procedural pixel art: 64×64 wall / floor / ceiling textures and billboard sprites (decor, pickups),
// generated once in prepare() straight into Uint32 RGBA buffers. Deterministic (hash-based).
import { hash } from 'filmkit/lib.js';
import { canvas } from '../remy-bros/art.js';

const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const pack = (r, g, b, a = 255) => (((a << 24) | (Math.max(0, Math.min(255, b | 0)) << 16) | (Math.max(0, Math.min(255, g | 0)) << 8) | Math.max(0, Math.min(255, r | 0))) >>> 0);

// Pixel buffer with crisp primitives. e = emissive mask (drawn full-bright by the engine).
export class Px {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); this.e = null; }
  set(x, y, c, k = 0, em = false) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = typeof c === 'string' ? hex(c) : c;
    this.d[y * this.w + x] = pack(r + k, g + k, b + k);
    if (em) (this.e ??= new Uint8Array(this.w * this.h))[y * this.w + x] = 1;
  }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.d[y * this.w + x]; }
  rect(x, y, w, h, c, { noise = 0, seed = 0, em = false } = {}) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c, noise ? (h2(i, j, seed) - 0.5) * noise : 0, em);
  }
  disc(cx, cy, r, c, o = {}) {
    for (let j = Math.floor(cy - r); j <= cy + r; j++)
      for (let i = Math.floor(cx - r); i <= cx + r; i++) if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) this.set(i, j, c, o.noise ? (h2(i, j, o.seed ?? 0) - 0.5) * o.noise : 0, o.em);
  }
  ring(cx, cy, r0, r1, c, o = {}) {
    for (let j = Math.floor(cy - r1); j <= cy + r1; j++)
      for (let i = Math.floor(cx - r1); i <= cx + r1; i++) {
        const d = (i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2;
        if (d <= r1 * r1 && d >= r0 * r0) this.set(i, j, c, o.noise ? (h2(i, j, 3) - 0.5) * o.noise : 0, o.em);
      }
  }
  // Paint an image (canvas / bitmap) with an alpha threshold; optional nearest scale.
  img(src, sx, sy, sw, sh, dx, dy, dw, dh, { smooth = false } = {}) {
    const c = canvas(Math.round(dw), Math.round(dh)), x = c.getContext('2d');
    x.imageSmoothingEnabled = smooth;
    if (smooth) x.imageSmoothingQuality = 'high';
    x.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    for (let j = 0; j < c.height; j++)
      for (let i = 0; i < c.width; i++) {
        const o = (j * c.width + i) * 4;
        if (d[o + 3] < 110) continue;
        this.set(dx + i, dy + j, [d[o], d[o + 1], d[o + 2]]);
      }
  }
  outline(c) {
    const src = this.d.slice();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (src[y * this.w + x]) continue;
        const n = (i, j) => i >= 0 && j >= 0 && i < this.w && j < this.h && src[j * this.w + i];
        if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) this.set(x, y, c);
      }
    return this;
  }
  canvas() {
    const c = canvas(this.w, this.h), x = c.getContext('2d'), im = x.createImageData(this.w, this.h);
    new Uint32Array(im.data.buffer).set(this.d);
    x.putImageData(im, 0, 0);
    return c;
  }
}
export const fromCanvas = (c) => {
  const p = new Px(c.width, c.height);
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const u = new Uint32Array(d.buffer);
  for (let i = 0; i < u.length; i++) p.d[i] = (u[i] >>> 24) > 100 ? (u[i] | 0xff000000) >>> 0 : 0;
  return p;
};

// ---------- walls ----------
function stone(seed, { moss = false, tint = [0, 0, 0] } = {}) {
  const p = new Px(64, 64);
  p.rect(0, 0, 64, 64, '#26262c');
  const rows = [15, 17, 15, 17];
  let y = 0;
  rows.forEach((rh, r) => {
    let x = -Math.floor(h2(r, seed) * 20);
    let k = 0;
    while (x < 64) {
      const w = 14 + Math.floor(h2(r, k, seed + 1) * 18);
      const g = 96 + Math.floor(h2(r, k, seed + 2) * 40);
      for (let j = y + 1; j < y + rh - 1; j++)
        for (let i = x + 1; i < x + w - 1; i++) {
          const ii = ((i % 64) + 64) % 64;
          let v = g + (h2(ii, j, seed) - 0.5) * 22 + (h2(ii >> 1, j >> 1, seed + 9) - 0.5) * 14;
          if (j === y + 1 || i === x + 1) v += 28;
          if (j === y + rh - 2 || i === x + w - 2) v -= 34;
          let c = [v + tint[0], v + tint[1], v + 6 + tint[2]];
          if (moss && h2(ii >> 1, j >> 1, seed + 5) > 0.72 && j > y + rh - 7) c = [v * 0.45, v * 0.7, v * 0.35];
          p.set(ii, j, c);
        }
      x += w; k++;
    }
    y += rh;
  });
  // cracks
  for (let n = 0; n < 3; n++) {
    let cx = Math.floor(h2(n, 1, seed + 20) * 64), cy = Math.floor(h2(n, 2, seed + 20) * 64);
    for (let s = 0; s < 9; s++) { p.set(cx, cy, '#3a3a40'); cx += h2(n, s, seed) > 0.5 ? 1 : 0; cy += 1; }
  }
  return p;
}

function wood(seed, { dark = 0 } = {}) {
  const p = new Px(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const plank = Math.floor(x / 8), gx = x % 8;
      const grain = Math.sin((y + h2(plank, 0, seed) * 40) * 0.35 + Math.sin(y * 0.11 + plank) * 2) * 10;
      let v = 108 + h2(plank, 1, seed) * 26 + grain + (h2(x, y, seed) - 0.5) * 10 - dark;
      if (gx === 0) v -= 46;
      if (gx === 1) v += 14;
      p.set(x, y, [v * 0.98, v * 0.6, v * 0.32]);
    }
  // frame rails and recessed panel
  const bevel = (x0, y0, x1, y1, hi, lo) => {
    for (let x = x0; x <= x1; x++) { p.set(x, y0, hi); p.set(x, y1, lo); }
    for (let y = y0; y <= y1; y++) { p.set(x0, y, hi); p.set(x1, y, lo); }
  };
  for (let y = 0; y < 5; y++) for (let x = 0; x < 64; x++) { const c = p.d[y * 64 + x]; p.d[y * 64 + x] = pack((c & 255) * 0.75, ((c >> 8) & 255) * 0.75, ((c >> 16) & 255) * 0.75); }
  for (let y = 59; y < 64; y++) for (let x = 0; x < 64; x++) { const c = p.d[y * 64 + x]; p.d[y * 64 + x] = pack((c & 255) * 0.75, ((c >> 8) & 255) * 0.75, ((c >> 16) & 255) * 0.75); }
  bevel(0, 0, 63, 4, '#c08850', '#3a1e0c');
  bevel(0, 59, 63, 63, '#c08850', '#3a1e0c');
  bevel(5, 9, 58, 54, '#3a1e0c', '#c08850');
  bevel(6, 10, 57, 53, '#4a2a12', '#a87040');
  return p;
}

function brick(seed, { soot = 0 } = {}) {
  const p = new Px(64, 64);
  p.rect(0, 0, 64, 64, '#5a4c48', { noise: 18, seed });
  for (let r = 0; r < 8; r++) {
    const off = r % 2 ? 8 : 0;
    for (let k = -1; k < 4; k++) {
      const x0 = k * 16 + off, base = h2(r, k, seed);
      const col = [138 + base * 40, 44 + base * 18, 30 + base * 10];
      for (let j = r * 8 + 1; j < r * 8 + 7; j++)
        for (let i = x0 + 1; i < x0 + 15; i++) {
          if (i < 0 || i >= 64) continue;
          let k2 = (h2(i, j, seed + 3) - 0.5) * 22;
          if (j === r * 8 + 1) k2 += 26;
          if (j === r * 8 + 6 || i === x0 + 14) k2 -= 30;
          const s = 1 - soot * Math.max(0, (j - 20) / 44) * h2(i >> 2, j >> 2, 9);
          p.set(i, j, [(col[0] + k2) * s, (col[1] + k2 * 0.5) * s, (col[2] + k2 * 0.4) * s]);
        }
    }
  }
  return p;
}

function emblemHead(p, cx, cy, heads, k) {
  // bald Remy head from the overworld atlas (#0), nearest-scaled
  p.img(heads, 0, 0, 16, 16, cx - 8 * k, cy - 8 * k, 16 * k, 16 * k);
}

function banner(heads) {
  const p = stone(11);
  // rod
  p.rect(13, 2, 38, 3, '#3a2410'); p.rect(13, 2, 38, 1, '#8a6030'); p.rect(12, 1, 2, 5, '#c8a040'); p.rect(50, 1, 2, 5, '#c8a040');
  for (let y = 5; y < 60; y++)
    for (let x = 17; x < 47; x++) {
      const notch = y > 50 && Math.abs(x - 31.5) < (y - 50) * 1.6;
      if (notch) continue;
      const fold = Math.sin((x - 17) * 0.62) * 16;
      let c = [122 + fold, 18 + fold * 0.2, 46 + fold * 0.4];
      if (x < 19 || x > 44) c = [216, 168, 56];
      p.set(x, y, c);
    }
  p.disc(32, 24, 10.5, '#e8e0d0');
  p.ring(32, 24, 9.5, 11, '#d8a838');
  emblemHead(p, 32, 25, heads, 1);
  for (let y = 40; y < 44; y++) for (let x = 21; x < 43; x++) p.set(x, y, '#d8a838', (h2(x, y) - 0.5) * 20);
  for (let y = 46; y < 48; y++) for (let x = 24; x < 40; x++) p.set(x, y, '#d8a838', (h2(x, y) - 0.5) * 20);
  return p;
}

function portrait(R, seed) {
  const p = wood(4);
  // gilt frame
  p.rect(13, 8, 38, 46, '#6a4a10');
  p.rect(14, 9, 36, 44, '#d8a838', { noise: 30, seed });
  p.rect(14, 9, 36, 1, '#fff0a0'); p.rect(14, 9, 1, 44, '#fff0a0');
  p.rect(14, 52, 36, 1, '#7a5810'); p.rect(49, 9, 1, 44, '#7a5810');
  p.rect(17, 12, 30, 38, '#4a3008');
  const bg = [[34, 74, 70], [70, 40, 80], [40, 50, 90], [80, 60, 30], [30, 70, 40]][seed % 5];
  for (let y = 13; y < 49; y++) for (let x = 18; x < 46; x++) { const k = (y - 13) * 1.2; p.set(x, y, [bg[0] + 30 - k, bg[1] + 30 - k, bg[2] + 30 - k]); }
  // bald Remy bust: head + shoulders, smooth-downscaled
  const sx = R.w / 2 - 34;
  p.img(R.c, sx, 9, 68, 80, 18, 13, 28, 36, { smooth: true });
  p.rect(17, 48, 30, 2, '#4a3008');
  // plaque
  p.rect(26, 54, 12, 3, '#d8a838'); p.rect(27, 55, 10, 1, '#7a5810');
  return p;
}

function seal(heads) {
  const p = brick(21);
  p.disc(32, 30, 22, '#3a1a10');
  p.ring(32, 30, 18, 21.5, '#d8a838', { noise: 40 });
  p.ring(32, 30, 18, 18.8, '#7a5810');
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; p.disc(32 + Math.cos(a) * 19.8, 30 + Math.sin(a) * 19.8, 1.3, '#fff0a0'); }
  p.disc(32, 30, 17.5, '#7a1020', { noise: 18 });
  emblemHead(p, 32, 30, heads, 2);
  // ribbon
  for (let x = 12; x < 52; x++) for (let y = 50; y < 57; y++) { if (Math.abs(x - 32) > 17 && (y - 50) < Math.abs(x - 32) - 17 - 2) continue; p.set(x, y, '#c82838', (h2(x, y) - 0.5) * 20); }
  p.rect(18, 52, 28, 1, '#ff8090');
  return p;
}

function door() {
  const p = new Px(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      let v = 0;
      if (x % 8 === 0) v = -40; else if (x % 8 === 1) v = 26; else if (x % 8 === 7) v = -14;
      if (y < 4 || y > 59) v -= 22;
      const n = (h2(x, y, 5) - 0.5) * 10;
      p.set(x, y, [88 + v + n, 104 + v + n, 132 + v + n]);
    }
  p.rect(0, 4, 64, 1, '#c8d4ec'); p.rect(0, 59, 64, 1, '#2a3248');
  for (let x = 3; x < 64; x += 8) { p.set(x, 2, '#e0e8ff'); p.set(x, 61, '#e0e8ff'); }
  // lock plate & handle slot
  p.rect(50, 26, 9, 14, '#3a4258'); p.rect(51, 27, 7, 12, '#8a98b8'); p.rect(53, 29, 3, 8, '#141824');
  p.rect(51, 27, 7, 1, '#d8e0f8');
  return p;
}
function jamb() {
  const p = new Px(64, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const v = (y % 8 < 4 ? 10 : -10) + (h2(x, y, 8) - 0.5) * 8 + (x < 4 || x > 59 ? -20 : 0); p.set(x, y, [70 + v, 78 + v, 96 + v]); }
  for (let y = 4; y < 64; y += 8) p.rect(0, y, 64, 1, '#2a3040');
  return p;
}
function elevator(sw) {
  const p = new Px(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const band = Math.floor(y / 16);
      let v = 140 + (band % 2 ? 10 : -6) + (h2(x >> 2, y, 4) - 0.5) * 12 + Math.sin(x * 0.9 + band) * 3;
      if (y % 16 === 0) v += 40; if (y % 16 === 15) v -= 60;
      p.set(x, y, [v * 0.82, v * 0.9, v]);
    }
  for (let y = 3; y < 64; y += 16) { p.set(3, y + 4, '#f0f4ff'); p.set(60, y + 4, '#f0f4ff'); }
  if (sw) {
    const on = sw === 'on';
    p.rect(20, 14, 24, 36, '#1a1e28'); p.rect(21, 15, 22, 34, '#4a5262'); p.rect(22, 16, 20, 32, '#2a303c');
    p.rect(21, 15, 22, 1, '#a8b4c8');
    p.rect(29, 21, 6, 22, '#0a0c10');
    // lever
    const ly = on ? 18 : 34;
    p.rect(30, on ? 22 : 32, 4, 10, '#c8ccd4');
    p.rect(28, ly, 8, 8, on ? '#40ff70' : '#ff3040', { em: true });
    p.rect(29, ly + 1, 3, 2, '#ffffff', { em: true });
    // lamp
    p.rect(24, 42, 4, 4, on ? '#40ff70' : '#401010', { em: on });
    p.rect(36, 42, 4, 4, on ? '#401010' : '#ff3040', { em: !on });
  }
  return p;
}
function pillar() {
  const p = new Px(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const ridge = Math.cos(((x % 16) / 16) * Math.PI * 2) * 22;
      let v = 120 + ridge + (h2(x, y, 31) - 0.5) * 14 + Math.sin(y * 0.3 + x * 0.2) * 4;
      if (y < 6 || y > 57) v = 150 + (y % 3) * 12 - (y > 57 ? 30 : 0);
      p.set(x, y, [v * 0.95, v * 0.88, v * 0.86]);
    }
  return p;
}

// ---------- floors / ceilings ----------
function flags(seed) {
  const p = new Px(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const t = (x >> 5) + (y >> 5) * 2;
      let v = 74 + h2(t, 0, seed) * 18 + (h2(x, y, seed) - 0.5) * 14;
      if (x % 32 === 0 || y % 32 === 0) v = 40;
      else if (x % 32 === 1 || y % 32 === 1) v += 14;
      p.set(x, y, [v, v, v + 6]);
    }
  return p;
}
function carpet() {
  const p = new Px(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const dx = Math.abs(((x + 16) % 32) - 16), dy = Math.abs(((y + 16) % 32) - 16);
      const dia = dx + dy;
      let c = [104, 26, 30];
      if (dia === 12 || dia === 13) c = [184, 140, 56];
      else if (dia < 5) c = [140, 46, 40];
      const n = (h2(x, y, 41) - 0.5) * 14;
      p.set(x, y, [c[0] + n, c[1] + n * 0.5, c[2] + n * 0.5]);
    }
  return p;
}
function checker() {
  const p = new Px(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const t = ((x >> 5) + (y >> 5)) % 2;
      const vein = Math.sin(x * 0.3 + y * 0.17 + Math.sin(y * 0.2) * 2) > 0.92 ? 18 : 0;
      const n = (h2(x, y, 51) - 0.5) * 10 + vein;
      const c = t ? [82, 36, 38] : [36, 30, 36];
      p.set(x, y, [c[0] + n, c[1] + n, c[2] + n]);
      if (x % 32 === 0 || y % 32 === 0) p.set(x, y, [20, 16, 18]);
    }
  return p;
}
function plate() {
  const p = new Px(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      let v = 96 + (h2(x, y, 61) - 0.5) * 10;
      const a = ((x + y) % 8 === 0 && Math.floor(x / 8) % 2 === Math.floor(y / 8) % 2) || ((x - y + 64) % 8 === 0 && Math.floor(x / 8) % 2 !== Math.floor(y / 8) % 2);
      if (a) v += 40;
      if (x % 32 === 0 || y % 32 === 0) v = 50;
      p.set(x, y, [v * 0.9, v * 0.95, v]);
    }
  return p;
}
function ceil(kind) {
  const p = new Px(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const n = (h2(x, y, 71 + kind) - 0.5) * 8;
      let c;
      if (kind === 0) c = [62, 62, 66];
      else if (kind === 1) { const beam = x % 32 < 6; c = beam ? [70, 42, 24] : [92, 82, 70]; if (x % 32 === 5) c = [40, 24, 12]; }
      else if (kind === 2) { c = [52, 40, 44]; if (x % 16 === 0 || y % 16 === 0) c = [36, 26, 30]; }
      else { c = [150, 156, 166]; if (x % 32 < 2 || y % 32 < 2) c = [80, 84, 92]; }
      p.set(x, y, [c[0] + n, c[1] + n, c[2] + n]);
    }
  return p;
}

// ---------- decor sprites (64 px per unit) ----------
function lamp(shade, glow) {
  const p = new Px(32, 34);
  p.rect(15, 0, 2, 12, '#2a2a2a');
  // conical shade
  for (let y = 12; y < 22; y++) { const w = 4 + (y - 12) * 1.2; for (let x = Math.round(16 - w); x < Math.round(16 + w); x++) p.set(x, y, shade, (x < 16 ? 14 : -14) + (y === 12 ? 30 : 0)); }
  p.rect(5, 22, 22, 2, shade, { noise: 0 });
  p.rect(5, 23, 22, 1, '#1a1a1a');
  p.disc(16, 25.5, 4.5, glow, { em: true });
  p.disc(16, 25, 2.5, '#ffffff', { em: true });
  return p.outline('#101010');
}
function chandelier() {
  const p = new Px(40, 34);
  p.rect(19, 0, 2, 10, '#3a2a10');
  p.rect(6, 12, 28, 3, '#c8a038'); p.rect(6, 12, 28, 1, '#fff0a0');
  p.rect(19, 9, 2, 6, '#c8a038');
  for (const x of [6, 13, 20, 27, 33]) { p.rect(x, 8, 2, 4, '#e8e0c8'); p.disc(x + 1, 6, 2.2, '#ffd060', { em: true }); p.set(x + 1, 5, '#ffffff', 0, true); }
  for (let y = 15; y < 26; y++) for (const x of [9, 30]) if ((y - 15) % 3 < 2) p.set(x + (y % 2), y, '#ff8080', 0, true);
  p.disc(20, 20, 3, '#ff4050', { em: true });
  return p.outline('#200808');
}
function barrel() {
  const p = new Px(26, 34);
  for (let y = 0; y < 34; y++) {
    const bulge = Math.sin((y / 33) * Math.PI) * 2.5, w = 9.5 + bulge;
    for (let x = Math.round(13 - w); x < Math.round(13 + w); x++) {
      const sh = Math.cos(((x - 13) / w) * 1.4) * 40 - 20;
      const stave = (x + 1) % 5 === 0 ? -25 : 0;
      p.set(x, y, [120 + sh + stave, 72 + sh * 0.6 + stave, 34 + sh * 0.3 + stave]);
    }
  }
  for (const y of [4, 5, 28, 29, 16]) for (let x = 0; x < 26; x++) if (p.get(x, y)) p.set(x, y, [70, 74, 80], (x > 8 && x < 14 ? 50 : 0));
  p.rect(6, 0, 14, 2, '#5a3416');
  return p.outline('#140a04');
}
function plant() {
  const p = new Px(40, 60);
  // pot
  for (let y = 44; y < 60; y++) { const w = 9 - (y - 44) * 0.25; for (let x = Math.round(20 - w); x < Math.round(20 + w); x++) p.set(x, y, [176, 92, 50], (x < 18 ? 24 : -16)); }
  p.rect(10, 42, 20, 3, '#c87a48'); p.rect(10, 42, 20, 1, '#ffb080');
  // fronds
  for (let f = 0; f < 9; f++) {
    const a = -Math.PI / 2 + (f - 4) * 0.33, len = 22 + h2(f, 1) * 12;
    for (let s = 0; s < len; s++) {
      const bend = (s / len) ** 2 * 10 * Math.sign(f - 4 || 1);
      const x = 20 + Math.cos(a) * s + bend, y = 43 + Math.sin(a) * s + (s / len) ** 2 * 6;
      const g = 110 + (s / len) * 70 + h2(f, s) * 20;
      p.set(x, y, [40, g, 50]); p.set(x + 1, y, [30, g - 30, 40]);
      if (s % 3 === 0 && s > 4) { p.set(x - 2, y + 1, [50, g + 10, 60]); p.set(x + 3, y + 1, [30, g - 20, 40]); }
    }
  }
  return p.outline('#0a1a08');
}
function armor() {
  const p = new Px(32, 62);
  const steel = (x, y, w, h, k = 0) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) p.set(i, j, [150 + k, 156 + k, 170 + k], Math.cos(((i - x) / w) * Math.PI) * 30 - 6); };
  p.rect(6, 58, 20, 4, '#3a3a40');
  steel(10, 40, 5, 18); steel(17, 40, 5, 18);
  steel(8, 22, 16, 19);
  steel(4, 22, 5, 16, -14); steel(23, 22, 5, 16, -14);
  steel(11, 6, 10, 15);
  p.rect(12, 12, 8, 2, '#141418'); p.rect(15, 14, 2, 5, '#141418');
  p.rect(15, 1, 2, 6, '#c82020'); p.rect(14, 2, 4, 2, '#e83030');
  p.rect(8, 30, 16, 2, '#c8a038');
  // halberd
  p.rect(28, 4, 2, 56, '#6a4020');
  p.rect(26, 4, 6, 7, '#d0d8e0'); p.rect(25, 6, 2, 3, '#e8f0f8');
  return p.outline('#0e0e12');
}
function table() {
  const p = new Px(64, 34);
  p.rect(2, 10, 60, 6, '#8a5428', { noise: 16 }); p.rect(2, 10, 60, 1, '#d09060');
  p.rect(4, 16, 56, 2, '#5a3416');
  for (const x of [6, 54]) p.rect(x, 18, 4, 16, '#6a3c18');
  // chairs behind / beside
  for (const x of [-1, 49]) { p.rect(x + 3, 2, 12, 2, '#6a3c18'); p.rect(x + 3, 2, 2, 30, '#5a3416'); p.rect(x + 13, 2, 2, 30, '#5a3416'); p.rect(x + 3, 20, 12, 3, '#7a4a20'); }
  // a plate of (bald-approved) roast
  p.rect(24, 7, 16, 3, '#e8e8e8'); p.disc(32, 6, 5, '#a85a20'); p.disc(30, 5, 2, '#e0a060');
  return p.outline('#140a04');
}
function flagStand(heads) {
  const p = new Px(32, 64);
  p.rect(10, 60, 12, 4, '#3a3a3a'); p.rect(15, 4, 2, 57, '#8a6a30'); p.disc(16, 3, 2.5, '#e8c048');
  for (let y = 7; y < 40; y++) for (let x = 17; x < 31; x++) { const w = Math.sin(x * 0.5 + y * 0.12) * 14; p.set(x, y, [96 + w, 24 + w * 0.3, 120 + w], 0); }
  p.disc(24, 19, 5.5, '#e8e0d0');
  p.img(heads, 0, 0, 16, 16, 20, 15, 8, 8, { smooth: true });
  p.rect(17, 7, 14, 1, '#e8c048'); p.rect(17, 39, 14, 1, '#e8c048');
  return p.outline('#100810');
}

// ---------- pickups ----------
function clip() {
  const p = new Px(20, 14);
  p.rect(2, 4, 16, 9, '#3a3c44'); p.rect(2, 4, 16, 2, '#8a90a0'); p.rect(3, 6, 14, 1, '#5a5e6a');
  for (let i = 0; i < 4; i++) { p.rect(4 + i * 4, 0, 3, 5, '#e0b040'); p.rect(4 + i * 4, 0, 1, 4, '#fff0b0'); p.rect(4 + i * 4, 0, 3, 1, '#b07820'); }
  p.rect(5, 9, 10, 2, '#e8e8e8');
  return p.outline('#0a0a0e');
}
function tonic() {
  const p = new Px(16, 24);
  p.rect(5, 0, 6, 4, '#8a5a2c'); p.rect(6, 1, 4, 2, '#c08850');
  p.rect(5, 4, 6, 3, '#d8f4ff');
  p.rect(2, 7, 12, 16, '#d8f4ff');
  p.rect(3, 11, 10, 11, '#42e86a', { em: true }); p.rect(3, 11, 10, 2, '#a6ffb4', { em: true }); p.rect(4, 14, 2, 5, '#c8ffd2', { em: true });
  p.rect(5, 15, 6, 4, '#ffd34a'); p.rect(6, 16, 4, 1, '#c87810');
  p.rect(7, 8, 2, 2, '#ff3a3a'); p.rect(6, 9, 4, 1, '#ff3a3a');
  return p.outline('#0a1a10');
}
function chaingunPickup() {
  const p = new Px(44, 18);
  for (let i = 0; i < 4; i++) p.rect(2, 3 + i * 2, 24, 1, i % 2 ? '#5a6070' : '#a8b0c0');
  p.rect(2, 2, 3, 10, '#2a2e36'); p.rect(24, 1, 4, 12, '#3a3e48');
  p.rect(28, 2, 12, 10, '#4a505c'); p.rect(28, 2, 12, 2, '#a0a8b8');
  p.rect(32, 12, 5, 5, '#5a3416'); p.rect(40, 5, 3, 4, '#2a2e36');
  p.rect(12, 12, 10, 3, '#e0b040');
  return p.outline('#08080a');
}
function crown() {
  const p = new Px(22, 16);
  p.rect(2, 7, 18, 8, '#e0a820'); p.rect(2, 7, 18, 1, '#fff0a0'); p.rect(2, 14, 18, 1, '#8a5a10');
  for (const x of [2, 9, 16]) { p.rect(x, 2, 4, 6, '#e0a820'); p.rect(x + 1, 0, 2, 2, '#fff0a0'); }
  p.rect(5, 10, 3, 3, '#ff2850', { em: true }); p.rect(10, 9, 3, 3, '#30c8ff', { em: true }); p.rect(15, 10, 3, 3, '#40ff70', { em: true });
  return p.outline('#2a1a04');
}
function comb() {
  const p = new Px(24, 14);
  p.rect(1, 1, 22, 5, '#e8b828'); p.rect(1, 1, 22, 1, '#fff4b0'); p.rect(2, 3, 20, 1, '#ffe070');
  for (let x = 2; x < 22; x += 2) p.rect(x, 6, 1, 7, '#d8a018');
  p.rect(9, 2, 6, 3, '#ff3a8a', { em: true });
  return p.outline('#2a1a04');
}
function key() {
  const p = new Px(22, 12);
  p.ring(5.5, 6, 2, 5, '#f0c030'); p.rect(10, 5, 11, 3, '#f0c030'); p.rect(16, 8, 2, 3, '#f0c030'); p.rect(19, 8, 2, 3, '#f0c030');
  p.rect(10, 5, 11, 1, '#fff4b0');
  return p.outline('#2a1a04');
}

export async function buildTextures(heads, portraitRemys) {
  return {
    stone: stone(1).d, stone2: stone(2, { moss: true }).d,
    banner: banner(heads).d,
    wood: wood(3).d, wood2: wood(5, { dark: 14 }).d,
    portraits: portraitRemys.map((R, i) => portrait(R, i).d),
    brick: brick(7).d, brick2: brick(8, { soot: 0.6 }).d,
    seal: seal(heads).d,
    door: door().d, jamb: jamb().d,
    elevator: elevator().d, switchOff: elevator('off').d, switchOn: elevator('on').d,
    pillar: pillar().d,
    floors: [flags(1).d, carpet().d, checker().d, plate().d],
    ceils: [ceil(0).d, ceil(1).d, ceil(2).d, ceil(3).d],
  };
}
export function buildSprites(heads) {
  return {
    lamp: lamp('#2a8a3a', '#fff2a0'), lampR: chandelier(), lampE: lamp('#5a6a8a', '#d0f0ff'),
    barrel: barrel(), plant: plant(), armor: armor(), table: table(), flag: flagStand(heads),
    clip: clip(), tonic: tonic(), chaingun: chaingunPickup(), crown: crown(), comb: comb(), key: key(),
  };
}
