// Pixel art for GALAREMY, generated once in prepare(): the hero fighter (Remy's red hair as swept wings, his head
// in the canopy), winged bald Cabald heads, the giant boss parts, the dithered nebula and a bald planet.
// Everything is deterministic (hash-based value noise, no Math.random).
import { hash } from 'filmkit/lib.js';
import { canvas } from '../remy-bros/art.js';

export { canvas };
const MEDIA = new URL('../../media/quest/', import.meta.url);
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export async function loadImg(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}
export const loadHeads = () => loadImg(new URL('heads.webp', MEDIA).href);
export const loadSprite = (i, far) => loadImg(new URL(`sprites/${far ? 'far/' : ''}${i}.webp`, MEDIA).href);
export function headIcon(atlas, i, k = 1) {
  const c = canvas(16 * k, 16 * k);
  c.getContext('2d').drawImage(atlas, (i % 67) * 16, Math.floor(i / 67) * 16, 16, 16, 0, 0, 16 * k, 16 * k);
  return c;
}

// Raster a colour function into a canvas, then add a 1px outline around every opaque pixel.
function raster(w, h, fn, ink = '#0c0a1a') {
  const G = new Array(w * h).fill(null);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) G[y * w + x] = fn(x, y);
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const put = (i, col) => { const [r, g, b] = rgb(col); d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (G[i]) { put(i, G[i]); continue; }
    if (!ink) continue;
    const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && G[yy * w + xx];
    if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) put(i, ink);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
export function scaled(src, k) {
  const c = canvas(Math.round(src.width * k), Math.round(src.height * k));
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c;
}
// Solid-colour silhouette (hit flashes, glows) and tinted copies.
export function silhouette(src, col = '#ffffff') {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = col;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}
export function tinted(src, col, a) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = a;
  x.fillStyle = col;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---------- hero fighter ----------
// 38×46, nose up, centre x = 19. Canopy centre (19, 17), radius 9: the pilot's head goes in there.
export const SHIP_W = 38, SHIP_H = 46, CANOPY = [19, 17];
const HAIR = ['#4a0e0c', '#8a2016', '#c6382a', '#ec6a3c', '#ffb08a'];
const METAL = ['#3a3f58', '#6e7896', '#aab4cc', '#e2e8f4', '#ffffff'];
export function shipSprite(head) {
  const hull = (X, Y) => (Y < 1.5 ? 0 : Y < 14 ? 0.8 + (Y - 1.5) * 0.46 : Y < 34 ? 6.5 : Y < 41 ? 6.5 - (Y - 34) * 0.55 : -1);
  const tri = (v) => Math.abs(((v % 1) + 1) % 1 - 0.5) * 2; // 0..1..0
  const c = raster(SHIP_W, SHIP_H, (x, y) => {
    const X = x + 0.5 - 19, Y = y + 0.5, ax = Math.abs(X);
    // canopy glass
    const cr = Math.hypot(X, Y - CANOPY[1]);
    if (cr <= 9.3) return cr > 8.3 ? (X < 0 ? METAL[3] : METAL[1]) : '#141c44';
    // wingtip cannons
    if (ax >= 15.5 && ax <= 18.6 && Y >= 21 && Y <= 38) return Y < 24 ? METAL[4] : ax < 16.6 ? METAL[3] : ax > 17.6 ? METAL[0] : METAL[2];
    // swept wings: Remy's hair, strands running along the sweep, tufts at the trailing edge
    if (ax >= 3.5 && ax <= 17.2) {
      const yt = 18.5 + (ax - 3.5) * 0.82, yb = 33.5 + (ax - 3.5) * 0.5 - 3.2 * tri((ax - 3.5) / 4.4);
      if (Y >= yt && Y <= yb) {
        if (Y - yt < 1.4) return HAIR[4];
        if (yb - Y < 1.3) return HAIR[0];
        const q = Y - 0.82 * ax;
        const band = Math.floor(q / 2.2) % 3;
        return [HAIR[2], HAIR[3], HAIR[1]][(band + 3) % 3];
      }
    }
    // engines
    if (ax >= 2.2 && ax <= 6.2 && Y >= 36 && Y <= 43.5) return Y > 41.5 ? '#20222e' : ax > 5 ? METAL[0] : METAL[1];
    // hull
    const hw = hull(X, Y);
    if (hw > 0 && ax <= hw) {
      if (Y < 4.5) return '#ff5a3a';
      if (Y > 29 && Y < 31.6) return '#e03a2a';
      const n = X / hw;
      return n < -0.45 ? METAL[4] : n < 0.25 ? METAL[3] : n < 0.7 ? METAL[2] : METAL[1];
    }
    return null;
  });
  // pilot + glass highlight
  const x = c.getContext('2d');
  x.save();
  x.beginPath(); x.arc(CANOPY[0], CANOPY[1], 8.3, 0, 7); x.clip();
  x.drawImage(head, CANOPY[0] - 8, CANOPY[1] - 8);
  x.fillStyle = 'rgba(160,210,255,0.22)';
  x.fillRect(0, 0, SHIP_W, SHIP_H);
  x.fillStyle = 'rgba(255,255,255,0.75)';
  x.fillRect(CANOPY[0] - 6, CANOPY[1] - 6, 2, 1); x.fillRect(CANOPY[0] - 7, CANOPY[1] - 5, 1, 3);
  x.restore();
  return c;
}

// ---------- winged Cabald (art at 28×24, head 1× at (6,4); scaled 2× by enemySprite) ----------
const ell = (X, Y, cx, cy, rx, ry) => ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2;
const WINGS = {
  zako: [
    [[4.4, 6.2, 4.2, 3.4]], [[4.0, 13, 3.8, 3.6]],
  ],
  goei: [[[3.6, 10, 3.7, 6.4]], [[4.6, 11, 2.5, 5.8]]],
  boss: [[[3.2, 10.5, 3.9, 7.6]], [[4.3, 11.5, 2.7, 7.0]]],
  chal: [[[3.2, 7, 4.2, 1.7], [3.6, 11.4, 3.8, 1.6]], [[3.6, 8, 3.6, 1.6], [3.9, 12.2, 3.2, 1.5]]],
};
const WCOL = {
  zako: ['#dff4ff', '#7ab8ff', '#ffffff'],
  goei: ['#e8323a', '#ffd23a', '#fff2f2'],
  boss: ['#2ec85a', '#a8ff8a', '#ffe14a'],
  bossHurt: ['#7a4aff', '#c8a8ff', '#ff6ad8'],
  chal: ['#5ae0ff', '#c8f8ff', '#ffffff'],
};
export function enemySprite(type, head, frame, hurt = false) {
  const wings = WINGS[type][frame], [base, inner, edge] = WCOL[hurt ? 'bossHurt' : type];
  const art = raster(28, 24, (x, y) => {
    const X = x + 0.5, Y = y + 0.5, mx = X < 14 ? X : 28 - X;
    // the head is pasted over the middle; wings live at the sides
    for (const [cx, cy, rx, ry] of wings) {
      const e = ell(mx, Y, cx, cy, rx, ry);
      if (e <= 1) return e > 0.6 ? edge : e < 0.22 ? inner : base;
    }
    if (type === 'zako' && X > 11.5 && X < 16.5 && Y > 18 && Y < 23.5) return Y > 22.5 ? (X > 13 && X < 15 ? '#2a1a0a' : null) : Math.floor(Y) % 2 ? '#ffd23a' : '#3a240c';
    if (type === 'chal' && X > 12.5 && X < 15.5 && Y > 18 && Y < 24) return Math.floor(Y) % 2 ? '#ff5ad8' : '#8a2a9a';
    if (type === 'boss') {
      // antennae with bulb tips
      for (const s of [-1, 1]) {
        const ax = 14 + s * (X - 14);
        if (Y >= 1 && Y <= 5 && Math.abs(ax - (10.5 - (5 - Y) * 0.6)) < 0.6) return '#ffe14a';
        if (ell(ax, Y, 8, 1.2, 1.3, 1.3) <= 1) return '#ff6ad8';
      }
    }
    return null;
  });
  art.getContext('2d').drawImage(head, 6, 4);
  return scaled(art, 2);
}

// ---------- giant boss ----------
// Head: the near sprite cropped to the skull (x 9..64, y 12..65) at 4×. Eye boxes (crop coords) for the red glare.
export const GIANT_K = 4;
export function giantHead(img) {
  const cw = 56, ch = 54, c = canvas(cw, ch), x = c.getContext('2d');
  x.drawImage(img, 9, 12, cw, ch, 0, 0, cw, ch);
  const angry = canvas(cw, ch), ax = angry.getContext('2d');
  ax.drawImage(c, 0, 0);
  const id = ax.getImageData(0, 0, cw, ch), d = id.data;
  for (let y = 30; y < 44; y++) for (let xx = 8; xx < 54; xx++) {
    const i = (y * cw + xx) * 4;
    if (d[i + 3] < 200) continue;
    const lum = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    if (lum < 70) { d[i] = 255; d[i + 1] = 40 + (y % 2) * 30; d[i + 2] = 70; }
  }
  ax.putImageData(id, 0, 0);
  return { head: scaled(c, GIANT_K), angry: scaled(angry, GIANT_K), sil: silhouette(scaled(c, GIANT_K)), small: c };
}
// Saucer collar the head sits in (art 150×24 → 2×): lit rim, hatch in the middle, cannon pods at both ends.
export function saucer() {
  const W = 150, Hh = 26;
  return scaled(raster(W, Hh, (x, y) => {
    const X = x + 0.5 - 75, Y = y + 0.5, e = ell(X, Y, 0, 11, 74, 10.5);
    // cannon pods
    for (const s of [-1, 1]) if (Math.abs(X - s * 66) < 3.2 && Y > 14 && Y < 25.5) return Y > 23 ? '#ff4a6a' : Math.abs(X - s * 66) < 1.2 ? '#aab4cc' : '#4a4e66';
    if (e > 1) return null;
    if (Math.abs(X) < 15 && Y > 13) return null; // hatch cut-out (doors + core drawn live)
    if (Y < 6) return Y < 3.4 ? '#e2e8f4' : '#aab4cc';
    if (Y < 11) return Math.abs(Math.floor(X / 6)) % 2 ? '#7a6aa8' : '#8a7ab8';
    if (Y < 13) return '#2a1e48'; // light channel
    return Y < 17 ? '#4a3a78' : '#2a2048';
  }), 2);
}
export function hatchDoor() {
  return scaled(raster(15, 11, (x, y) => (y < 2 ? '#aab4cc' : (x + y) % 5 === 0 ? '#2a2048' : y > 8 ? '#3a2e60' : '#5a4a8a')), 2);
}

// ---------- space ----------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// periodic value noise (period py cells in y) + fbm
function n2(x, y, s, py) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const h = (a, b) => hash(a * 7349 + (((b % py) + py) % py) * 92821 + s * 1013);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, s, py) {
  let v = 0, amp = 0.5, k = 1;
  for (let o = 0; o < 5; o++) { v += amp * n2(x * k, y * k, s + o * 17, py * k); amp *= 0.5; k *= 2; }
  return v;
}
// Dithered nebula: tiles vertically (height = cell * py).
export function nebula(w, h) {
  const cell = 135, py = Math.round(h / cell);
  const c = canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
  const pal = [
    [[30, 10, 52], [62, 18, 92], [112, 32, 128], [176, 64, 168], [236, 128, 214]],
    [[8, 26, 56], [16, 52, 96], [24, 96, 138], [52, 150, 182], [140, 220, 236]],
  ];
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const u = xx / cell, v = yy / cell;
    let dens = fbm(u, v, 3, py);
    dens = Math.max(0, dens - 0.44) * 3.1 * (0.55 + 0.45 * fbm(u * 0.5 + 7, v * 0.5, 9, Math.max(1, py >> 1)));
    const hue = fbm(u * 0.7 + 3, v * 0.7, 21, py) > 0.5 ? 1 : 0;
    const lv = dens * 5 + BAYER[(yy % 4) * 4 + (xx % 4)] / 16 - 0.5;
    const L = Math.max(-1, Math.min(4, Math.floor(lv)));
    const i = (yy * w + xx) * 4;
    if (L < 0) { d[i + 3] = 0; continue; }
    const [r, g, b] = pal[hue][L];
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = L === 0 ? 120 : 200;
  }
  x.putImageData(img, 0, 0);
  return c;
}
// A smooth, shiny, utterly bald planet (with one specular glint and a thin ring).
export function baldPlanet(r) {
  const s = r * 2 + 40, c = canvas(s, s), x = c.getContext('2d'), img = x.createImageData(s, s), d = img.data;
  const ramp = [[40, 22, 30], [86, 50, 52], [140, 90, 78], [190, 140, 112], [232, 196, 160], [255, 244, 226]];
  const cx = s / 2, cy = s / 2;
  for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) {
    const X = (xx + 0.5 - cx) / r, Y = (yy + 0.5 - cy) / r, rr = X * X + Y * Y, i = (yy * s + xx) * 4;
    // ring (behind + in front handled by drawing order: simple tilted ellipse band)
    const ry = (Y - X * 0.18) / 0.22, ringD = Math.hypot(X, ry);
    const inRing = ringD > 1.3 && ringD < 1.48 && !(rr < 1 && ry < 0);
    if (rr > 1 && !inRing) continue;
    let L;
    if (rr <= 1 && !(inRing && ry > 0)) {
      const z = Math.sqrt(1 - rr), lit = Math.max(0, -0.55 * X - 0.6 * Y + 0.58 * z);
      const spec = Math.pow(Math.max(0, lit), 18) * 2.2;
      L = 0.4 + lit * 3.6 + spec * 2;
      L += BAYER[(yy % 4) * 4 + (xx % 4)] / 16 - 0.5;
      L = Math.max(0, Math.min(5, Math.floor(L)));
      const [rC, gC, bC] = ramp[L];
      d[i] = rC; d[i + 1] = gC; d[i + 2] = bC; d[i + 3] = 255;
    } else {
      const k = (BAYER[(yy % 4) * 4 + (xx % 4)] / 16) < 0.6 ? 1 : 0;
      d[i] = 120 + k * 60; d[i + 1] = 110 + k * 50; d[i + 2] = 160 + k * 40; d[i + 3] = 220;
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

// Stage badge pennant (Galaga-style flag icon).
export function badge(col) {
  return raster(9, 14, (x, y) => {
    if (x === 0 && y >= 1) return '#d8d8e8';
    if (x >= 1 && y >= 1 && y <= 8 && x <= 8 - Math.abs(y - 4.5) * 0.6) return y < 3 ? '#ffffff' : col;
    return null;
  });
}
