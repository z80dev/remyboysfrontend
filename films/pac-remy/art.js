// Pixel art for PAC-REMY, generated once in prepare() at the game's native 960×540.
// Heads come from the committed quest atlases (16 px front heads + 16 px side heads); everything else is procedural.
import { hash } from 'filmkit/lib.js';
import { MAZE, COLS, ROWS, TILE, TUNNEL_ROW } from './choreo.js';

const MEDIA = new URL('../../media/quest/', import.meta.url);

export const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
};
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

async function loadImg(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}
export const loadAtlas = (name) => loadImg(new URL(name, MEDIA).href);
export function cell16(atlas, i, k = 1) {
  const c = canvas(16 * k, 16 * k), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(atlas, (i % 67) * 16, Math.floor(i / 67) * 16, 16, 16, 0, 0, 16 * k, 16 * k);
  return c;
}
// recolour every opaque pixel (white silhouettes, tints)
export function silhouette(src, col) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = col;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}
export function tint(src, col, a) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = a;
  x.fillStyle = col;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}
// soft glow sprite: the source silhouette blurred in a colour, padded
export function glowOf(src, col, blur = 4, pad = 10) {
  const c = canvas(src.width + pad * 2, src.height + pad * 2), x = c.getContext('2d');
  x.filter = `blur(${blur}px)`;
  x.drawImage(silhouette(src, col), pad, pad);
  x.filter = 'none';
  return c;
}

// ---------- the neon maze ----------
// Walls are drawn from a distance field: the wall region is inset from the corridors and opened with a
// disc so block corners round off, then its boundary becomes the neon tube. Walls connected to the
// screen edge get a second, inner tube (the arcade's double border).
export function mazeArt() {
  const W = COLS * TILE, H = ROWS * TILE;
  const open = (c, r) => {
    if (r < 0 || r >= ROWS) return false;
    if (c < 0 || c >= COLS) return r === TUNNEL_ROW;
    return MAZE[r][c] !== '#';
  };
  // border-connected wall tiles (flood fill from off-grid)
  const border = new Uint8Array(COLS * ROWS);
  const q = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if ((r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) && !open(c, r)) { border[r * COLS + c] = 1; q.push([c, r]); }
  while (q.length) {
    const [c, r] = q.pop();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = c + dc, m = r + dr;
      if (n < 0 || m < 0 || n >= COLS || m >= ROWS || open(n, m) || border[m * COLS + n]) continue;
      border[m * COLS + n] = 1;
      q.push([n, m]);
    }
  }
  // distance from each pixel to the open-tile set
  const D = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
    if (open(c, r)) { D[y * W + x] = 0; continue; }
    let best = 99;
    for (let rr = r - 2; rr <= r + 2; rr++) for (let cc = c - 2; cc <= c + 2; cc++) {
      if (!open(cc, rr)) continue;
      const x0 = cc * TILE, y0 = rr * TILE, px = x + 0.5, py = y + 0.5;
      const dx = Math.max(x0 - px, 0, px - (x0 + TILE)), dy = Math.max(y0 - py, 0, py - (y0 + TILE));
      best = Math.min(best, Math.hypot(dx, dy));
    }
    D[y * W + x] = best;
  }
  const R = 5;
  const disc = [];
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R * R + 0.5) disc.push([dx, dy]);
  const opened = (e, only) => {
    const A = new Uint8Array(W * H), O = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) A[i] = D[i] >= e + R ? 1 : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (D[y * W + x] < e) continue;
      if (only && !only(x, y)) continue;
      for (const [dx, dy] of disc) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) { O[y * W + x] = 1; break; } // off-canvas counts as solid wall
        if (A[yy * W + xx]) { O[y * W + x] = 1; break; }
      }
    }
    return O;
  };
  const isBorderPx = (x, y) => border[Math.floor(y / TILE) * COLS + Math.floor(x / TILE)] === 1;
  const O1 = opened(5, null); // e + R < TILE / 2, so one-tile-thick walls keep a body
  const O2 = opened(10, isBorderPx);
  // boundary rings: k = 0 outer pixel, 1 inner pixel
  const ring = (O, x, y) => {
    if (!O[y * W + x]) return -1;
    for (let k = 1; k <= 2; k++)
      for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        if (!O[yy * W + xx]) return k - 1;
      }
    return -1;
  };
  const make = (core, hot, fill) => {
    const line = canvas(W, H), lx = line.getContext('2d'), img = lx.createImageData(W, H), d = img.data;
    const cc = rgb(core), hc = rgb(hot), fc = rgb(fill);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = ring(O1, x, y), b = ring(O2, x, y), i = (y * W + x) * 4;
      let col = null, al = 255;
      if (a === 0 || b === 0) col = cc;
      else if (a === 1 || b === 1) col = hc;
      else if (O1[y * W + x]) { col = fc; al = 150 + Math.round(30 * hash(x * 31 + y * 977)); }
      if (!col) continue;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = al;
    }
    lx.putImageData(img, 0, 0);
    return line;
  };
  const build = (core, hot, fill, glow) => {
    const tube = make(core, hot, fill);
    const lines = make(core, hot, '#000000');
    // strip the fill out of the glow source
    const lx = lines.getContext('2d'), id = lx.getImageData(0, 0, W, H), d = id.data;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] === 0) d[i + 3] = 0;
    lx.putImageData(id, 0, 0);
    const c = canvas(W + 40, H + 40), x = c.getContext('2d');
    x.filter = 'blur(6px)'; x.globalAlpha = 0.55; x.drawImage(silhouette(lines, glow), 20, 20);
    x.filter = 'blur(2px)'; x.globalAlpha = 0.9; x.drawImage(silhouette(lines, glow), 20, 20);
    x.filter = 'none'; x.globalAlpha = 1;
    x.drawImage(tube, 20, 20);
    return c;
  };
  return {
    blue: build('#3a52ff', '#a8b8ff', '#070a2a', '#2030ff'),
    white: build('#ffffff', '#ffffff', '#1c1f48', '#c8d0ff'),
    pad: 20,
  };
}

// ---------- props ----------
const px = (x, c, a, b, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(a, b, w, h); };

// Hair tonic: the power pellet. 12×18 green bottle with a gold label.
export function tonic() {
  const c = canvas(12, 18), x = c.getContext('2d');
  px(x, '#1a1228', 4, 0, 4, 3); px(x, '#c08850', 5, 0, 2, 2);
  px(x, '#1a1228', 3, 3, 6, 2); px(x, '#d8f4ff', 4, 3, 4, 2);
  px(x, '#1a1228', 1, 5, 10, 13); px(x, '#d8f4ff', 2, 6, 8, 11);
  px(x, '#2fd65a', 2, 8, 8, 9); px(x, '#a6ffb4', 2, 8, 8, 2); px(x, '#c8ffd2', 3, 11, 2, 4);
  px(x, '#ffd34a', 4, 11, 5, 4); px(x, '#c87810', 5, 12, 3, 1); px(x, '#c87810', 5, 14, 3, 1);
  return c;
}
// Bonus item: a golden comb, 20×12.
export function comb() {
  const c = canvas(20, 12), x = c.getContext('2d');
  px(x, '#5a2e06', 0, 0, 20, 5);
  px(x, '#ffcc2e', 1, 1, 18, 3); px(x, '#fff6b0', 1, 1, 18, 1); px(x, '#e08a0c', 1, 3, 18, 1);
  px(x, '#ff4a8a', 8, 1, 4, 2); px(x, '#ffd0e0', 8, 1, 1, 1);
  for (let i = 0; i < 9; i++) {
    const tx = 1 + i * 2;
    px(x, '#5a2e06', tx, 5, 2, 6 + (i % 2));
    px(x, '#ffcc2e', tx, 5, 1, 5 + (i % 2));
  }
  return c;
}
// Wig: the hair of a front head (everything but the face), for the intermission gag.
export function wigFrom(head16) {
  const c = canvas(16, 16), x = c.getContext('2d');
  x.drawImage(head16, 0, 0);
  const id = x.getImageData(0, 0, 16, 16), d = id.data;
  for (let y = 0; y < 16; y++) for (let xx = 0; xx < 16; xx++) {
    const i = (y * 16 + xx) * 4;
    const keep = y <= 6 || ((xx <= 3 || xx >= 13) && y <= 12);
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    const skin = r > 170 && g > 150; // face highlights
    if (!keep || skin || (y > 6 && b > r)) d[i + 3] = 0;
  }
  x.putImageData(id, 0, 0);
  return c;
}

// ---------- ghost bodies ----------
// A ghost sheet in the ghost's colour that the bald head pokes out of: 28 px wide, wavy skirt (2 frames).
export function ghostBody(col, frame, { shade = null, hi = null } = {}) {
  const w = 30, h = 26, c = canvas(w, h), x = c.getContext('2d');
  const base = rgb(col), sh = shade ? rgb(shade) : base.map((v) => Math.round(v * 0.62)), hl = hi ? rgb(hi) : base.map((v) => Math.min(255, Math.round(v + (255 - v) * 0.45)));
  const img = x.createImageData(w, h), d = img.data;
  const inside = (xx, yy) => {
    const cx = w / 2, top = 2;
    if (yy < top) return false;
    // shoulders: rounded top
    const ry = yy - top;
    const half = ry < 8 ? Math.sqrt(Math.max(0, 64 - (8 - ry) ** 2)) * (w / 2 - 1) / 8 : w / 2 - 1;
    if (Math.abs(xx + 0.5 - cx) > half) return false;
    // skirt: 4 points, phase per frame
    const ph = frame ? 3.5 : 0, k = ((xx + ph) % 7) / 7;
    const skirt = h - 1 - Math.round(4 * Math.abs(k - 0.5) * 2);
    return yy <= skirt;
  };
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    if (!inside(xx, yy)) continue;
    const edge = !inside(xx - 1, yy) || !inside(xx + 1, yy) || !inside(xx, yy + 1) || !inside(xx, yy - 1);
    let col3 = base;
    if (xx > w * 0.68 || yy > h - 7) col3 = sh;
    if (xx < w * 0.3 && yy < h * 0.5) col3 = hl;
    if (edge) col3 = sh.map((v) => Math.round(v * 0.55));
    const i = (yy * w + xx) * 4;
    d[i] = col3[0]; d[i + 1] = col3[1]; d[i + 2] = col3[2]; d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

// Ghost sprite: body + 2× bald head, composed once per (ghost, mode, frame). 34×46, anchor = centre.
export const GW = 34, GH = 46;
export function ghostSprite(head32, body, { mode = 'normal' } = {}) {
  const c = canvas(GW, GH), x = c.getContext('2d');
  x.drawImage(body, 2, 18);
  if (mode === 'normal') x.drawImage(head32, 1, 0);
  else {
    // frightened: the head goes blue, the eyes go pale, a wobbly mouth
    const pale = mode === 'flash' ? '#ff6a6a' : '#ffd0b0';
    x.drawImage(tint(head32, mode === 'flash' ? '#ffffff' : '#2438ff', mode === 'flash' ? 0.65 : 0.62), 1, 0);
    for (const ex of [9, 23]) { px(x, pale, ex, 18, 3, 3); }
    for (let i = 0; i < 6; i++) px(x, pale, 7 + i * 3, 26 + (i % 2 ? -1 : 1), 3, 1);
  }
  return c;
}
// Eyes only (an eaten ghost flying home). 24×12, pupils look in (dc, dr).
export function eyes(x, cx, cy, dc, dr) {
  for (const s of [-1, 1]) {
    const ex = Math.round(cx + s * 6), ey = Math.round(cy);
    x.fillStyle = '#ffffff';
    x.fillRect(ex - 3, ey - 5, 6, 10); x.fillRect(ex - 4, ey - 4, 8, 8);
    x.fillStyle = '#2438ff';
    x.fillRect(ex - 2 + dc * 2, ey - 2 + dr * 3, 4, 4);
  }
}

// ---------- the chomping hero ----------
// The side head (facing right) splits at a hinge behind the mouth: the jaw swings open, the crown tips back.
// open ∈ [0,1]. Draw centred at (cx, cy); dir: {dc, dr}; k = pixel scale.
const HINGE = { x: 5, y: 11 };
export function drawChomp(x, side16, cx, cy, open, dc, dr, k = 2, o = {}) {
  const S = 16 * k;
  x.save();
  x.translate(Math.round(cx), Math.round(cy));
  if (dr) x.rotate(dr < 0 ? -Math.PI / 2 : Math.PI / 2);
  if (dc < 0 || (dr && o.flipV)) x.scale(-1, 1);
  if (o.sx || o.sy) x.scale(o.sx ?? 1, o.sy ?? 1);
  x.translate(-S / 2, -S / 2 - k);
  const a = open * 0.62; // radians
  const hx = HINGE.x * k, hy = HINGE.y * k;
  // mouth interior
  if (a > 0.02) {
    x.fillStyle = '#2a0610';
    x.beginPath(); x.moveTo(hx, hy);
    x.lineTo(S + 4, hy - Math.tan(a * 0.4) * (S - hx) - 2);
    x.lineTo(S + 4, hy + Math.tan(a * 0.6) * (S - hx) + 2);
    x.closePath(); x.fill();
    x.fillStyle = '#c8405a';
    x.fillRect(hx + 6 * k, hy + Math.round(Math.tan(a * 0.6) * 5 * k) - k, 4 * k, k);
  }
  const src = o.white ? side16.white : side16.c;
  // crown (above the hinge)
  x.save();
  x.translate(hx, hy); x.rotate(-a * 0.4); x.translate(-hx, -hy);
  x.beginPath(); x.rect(-4, -4, S + 8, hy + 4); x.clip();
  x.drawImage(src, 0, 0, S, S);
  x.restore();
  // jaw (below)
  x.save();
  x.translate(hx, hy); x.rotate(a * 0.6); x.translate(-hx, -hy);
  x.beginPath(); x.rect(-4, hy, S + 8, S); x.clip();
  x.drawImage(src, 0, 0, S, S);
  x.restore();
  x.restore();
}
export function sideHead(atlas, i, k = 2) {
  const c = cell16(atlas, i, k);
  return { c, white: silhouette(c, '#ffffff') };
}
