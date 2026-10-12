// REMY KONG pixel art, generated once in prepare() at the game's native 960×540. Deterministic (hash, no Math.random).
// The Remy rig itself (drawRemy, heads atlas) is shared with remy-bros.
import { hash } from 'filmkit/lib.js';
import { canvas, drawRemy, loadHeads, headIcon } from '../remy-bros/art.js';

export { canvas, drawRemy, loadHeads, headIcon };
const MEDIA = new URL('../../media/quest/', import.meta.url);
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);

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
  const done = () => (ctx.putImageData(img, 0, 0), c);
  return { c, set, done, w, h };
}
async function loadImg(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

// ---------- Remy sprites at any scale ----------
// k < 1: smooth downscale then hard alpha (crisp pixel art at the new size); k ≥ 1 integer: nearest.
// Returns the rig struct drawRemy expects (legTop / cx / top / bottom rescaled).
export async function loadSprite(i, { far = false, k = 1 } = {}) {
  const img = await loadImg(new URL(`sprites/${far ? 'far/' : ''}${i}.webp`, MEDIA).href);
  const f = far ? 9 : 6, PAD = 2, bodyH = 576 / f, bodyW = 432 / f, hem = Math.max(2, Math.round((3 * 6) / f));
  const w = Math.round(img.width * k), h = Math.round(img.height * k);
  const c = canvas(w, h), x = c.getContext('2d');
  x.imageSmoothingEnabled = k < 1;
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, 0, 0, w, h);
  const id = x.getImageData(0, 0, w, h), d = id.data;
  let top = h, bottom = 0;
  for (let p = 0; p < w * h; p++) {
    const a = d[p * 4 + 3];
    if (k < 1) {
      if (a >= 110) { const s = 255 / a; d[p * 4] = Math.min(255, d[p * 4] * s); d[p * 4 + 1] = Math.min(255, d[p * 4 + 1] * s); d[p * 4 + 2] = Math.min(255, d[p * 4 + 2] * s); d[p * 4 + 3] = 255; }
      else d[p * 4 + 3] = 0;
    }
    if (d[p * 4 + 3] > 0) { const yy = Math.floor(p / w); top = Math.min(top, yy); bottom = Math.max(bottom, yy); }
  }
  x.putImageData(id, 0, 0);
  const sil = canvas(w, h), sx = sil.getContext('2d');
  sx.drawImage(c, 0, 0);
  sx.globalCompositeOperation = 'source-in';
  sx.fillStyle = '#fff';
  sx.fillRect(0, 0, w, h);
  return { c, sil, w, h, legTop: Math.round((PAD + bodyH + hem) * k), cx: Math.round((PAD + Math.floor(bodyW / 2)) * k), top, bottom };
}

// Round head cropped off a scaled sprite: the "bowling ball".
export function headBall(R) {
  const s = Math.min(R.w, Math.round((R.bottom - R.top) * 0.6));
  const c = canvas(s, s);
  c.getContext('2d').drawImage(R.c, Math.round((R.w - s) / 2), R.top, s, s, 0, 0, s, s);
  return c;
}

// ---------- palette ----------
export const PAL = {
  ink: '#07050f',
  g0: '#ffb0c4', g1: '#ff3d6e', g2: '#d81e52', g3: '#8c0c34', g4: '#4a0420', // girders
  lad: '#5cf0ff', ladLo: '#1aa0c0', ladHi: '#d8ffff',
  rivet: '#ffd02a', rivetHi: '#fff7b0', rivetLo: '#b07000',
  wood: '#c8692a', woodHi: '#f4a25a', woodLo: '#8a3c14', woodInk: '#3a1406', band: '#3a3c66', bandHi: '#7a80b8',
  drum: '#2a60e8', drumHi: '#8ab4ff', drumLo: '#14309a', drumInk: '#0a1240',
  hud: '#ff3a4a', hudBlue: '#4a8aff', hudCyan: '#7af0ff',
};

// ---------- girder segment (32×12): rails + truss lattice ----------
export function girderSeg() {
  const P = pixels(32, 12);
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 32; x++) {
      let c = null;
      if (y === 0) c = PAL.g0;
      else if (y === 1) c = PAL.g1;
      else if (y === 2) c = PAL.g2;
      else if (y === 9) c = PAL.g1;
      else if (y === 10) c = PAL.g2;
      else if (y === 11) c = PAL.g4;
      else {
        // web: diagonals forming triangles, 16 px period
        const a = (x + y * 1) % 16, b = (x - y + 64) % 16;
        if (a < 2 || b < 2) c = (a < 1 || b < 1) ? PAL.g1 : PAL.g3;
      }
      if (c) P.set(x, y, c);
    }
  // bolt heads at the segment joint
  P.set(1, 4, PAL.g0); P.set(1, 7, PAL.g0); P.set(30, 4, PAL.g3); P.set(30, 7, PAL.g3);
  return P.done();
}
export function rivet() {
  const P = pixels(8, 10);
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 8; x++) {
      const head = y < 4 && x >= 0 && x < 8, shank = y >= 4 && x >= 2 && x < 6;
      if (!head && !shank) continue;
      let c = PAL.rivet;
      if (x === 0 || y === 0 || (head && x === 7) || (shank && (x === 2 || x === 5)) || y === 9 || (y === 3 && (x < 2 || x > 5))) c = PAL.rivetLo;
      if ((y === 1 && x > 0 && x < 4) || (x === 1 && y === 2)) c = PAL.rivetHi;
      P.set(x, y, c);
    }
  return P.done();
}

// ---------- barrels ----------
// End-on (rolling) frames: rim, staves, iron ring, rotating cross brace.
export function barrelEnd(frame, n = 8) {
  const s = 28, P = pixels(s, s), a0 = (frame / n) * Math.PI;
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const dx = x + 0.5 - s / 2, dy = y + 0.5 - s / 2, r = Math.hypot(dx, dy);
      if (r > s / 2) continue;
      let c = PAL.wood;
      if (r > s / 2 - 1.3) c = PAL.woodInk;
      else if (r > s / 2 - 3.2) c = PAL.band;
      else if (r > s / 2 - 4.4) c = PAL.woodLo;
      else {
        const ca = Math.cos(a0), sa = Math.sin(a0);
        const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
        if (Math.abs(u) < 1.4 || Math.abs(v) < 1.4) c = PAL.woodLo;
        else if (dx + dy < -6) c = PAL.woodHi;
        else if (h2(x, y, 3) > 0.92) c = PAL.woodLo;
      }
      if (r > s / 2 - 3.2 && r <= s / 2 - 1.3 && dx + dy < -8) c = PAL.bandHi;
      P.set(x, y, c);
    }
  return P.done();
}
// Side view (falling / on ladders): 2 frames for the tumble.
export function barrelSide(frame) {
  const w = 32, h = 26, P = pixels(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5) / w * 2 - 1, ny = (y + 0.5) / h * 2 - 1;
      const bulge = 1 - 0.18 * nx * nx;
      if (Math.abs(ny) > bulge) continue;
      let c = PAL.wood;
      const edge = Math.abs(ny) > bulge - 0.12 || Math.abs(nx) > 0.94;
      if (edge) c = PAL.woodInk;
      else if (Math.abs(Math.abs(nx) - 0.62) < 0.08) c = PAL.band;
      else if (ny < -0.45) c = PAL.woodHi;
      else if (ny > 0.55) c = PAL.woodLo;
      else if ((y + frame * 3) % 6 === 0) c = PAL.woodLo;
      P.set(x, y, c);
    }
  return P.done();
}
export function barrelUpright() {
  const w = 22, h = 30, P = pixels(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5) / w * 2 - 1, ny = (y + 0.5) / h * 2 - 1;
      const bulge = 1 - 0.16 * ny * ny;
      if (Math.abs(nx) > bulge) continue;
      let c = PAL.wood;
      if (Math.abs(nx) > bulge - 0.12 || Math.abs(ny) > 0.95) c = PAL.woodInk;
      else if (Math.abs(Math.abs(ny) - 0.6) < 0.08) c = PAL.band;
      else if (nx < -0.45) c = PAL.woodHi;
      else if (nx > 0.55) c = PAL.woodLo;
      else if ((x + 1) % 5 === 0) c = PAL.woodLo;
      P.set(x, y, c);
    }
  return P.done();
}

// ---------- oil drum ----------
const OIL = ['###.#.#..', '#.#.#.#..', '#.#.#.#..', '#.#.#.#..', '###.#.###'];
export function drum(w, h) {
  const P = pixels(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5) / w;
      let c = nx < 0.18 ? PAL.drumLo : nx < 0.34 ? PAL.drumHi : nx > 0.84 ? PAL.drumLo : PAL.drum;
      if (x === 0 || x === w - 1 || y === h - 1) c = PAL.drumInk;
      if (y < 3 || (y >= 8 && y < 10) || (y >= h - 9 && y < h - 7)) c = y === 0 ? PAL.drumHi : PAL.drumInk;
      if (y === 1 || y === 2) c = '#1a1a2a';
      P.set(x, y, c);
    }
  const ox = Math.round(w / 2 - 9);
  OIL.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '#') return;
    for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) P.set(ox + x * 2 + a, 15 + y * 2 + b, '#ffffff');
  }));
  return P.done();
}

// ---------- hammer (head up) ----------
export function hammer() {
  const P = pixels(16, 22);
  for (let y = 0; y < 22; y++)
    for (let x = 0; x < 16; x++) {
      let c = null;
      if (y < 9) { // head
        if (x === 0 || x === 15 || y === 0 || y === 8) c = '#2a1a2a';
        else c = y < 3 ? '#ffffff' : x < 4 ? '#e8e0d0' : y > 6 ? '#8a7f8f' : '#c8c0d0';
      } else if (x >= 6 && x < 10) { // handle
        c = x === 6 || x === 9 ? '#4a2008' : x === 7 ? '#e8a060' : '#b06a2a';
        if (y === 21) c = '#4a2008';
      }
      if (c) P.set(x, y, c);
    }
  return P.done();
}

// ---------- heart ----------
const HEART = ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'];
export function heart(k = 3, broken = false) {
  const w = 9 * k, h = 8 * k, P = pixels(w + 2, h + 2);
  const at = (x, y) => y >= 0 && y < 8 && x >= 0 && x < 9 && HEART[y][x] === '#';
  for (let y = -1; y <= 8; y++)
    for (let x = -1; x <= 9; x++) {
      const on = at(x, y), nb = at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1);
      if (!on && !nb) continue;
      for (let yy = 0; yy < k; yy++)
        for (let xx = 0; xx < k; xx++) {
          let c = on ? '#ff2a5e' : '#5a0420';
          if (on && ((x === 1 && y === 1) || (x === 2 && y === 1 && yy < k / 2) || (x === 1 && y === 2 && xx < k / 2))) c = '#ffd0dc';
          else if (on && (y >= 5 || x >= 7)) c = '#c8104a';
          if (broken && on && Math.abs(x - 4 - (y % 2 ? 0.5 : 0)) < 0.6) continue;
          if (!on && (xx === 0 || yy === 0 || xx === k - 1 || yy === k - 1) && k > 2) { /* outline fills whole cell */ }
          P.set(1 + x * k + xx, 1 + y * k + yy, c);
        }
    }
  return P.done();
}

// ---------- night skyline backdrop (very dark, dithered) ----------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function skyline(w, h) {
  const P = pixels(w, h);
  const top = [10, 8, 22], bot = [24, 12, 40];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = y / h, q = v * 10, b0 = Math.floor(q), f = q - b0;
      const k = (f * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? b0 + 1 : b0) / 10;
      P.set(x, y, top.map((a, i) => Math.round(a + (bot[i] - a) * k)));
    }
  // stars
  for (let i = 0; i < 140; i++) {
    const sx = Math.floor(hash(i + 11) * w), sy = Math.floor(hash(i + 211) * h * 0.6);
    P.set(sx, sy, hash(i + 411) > 0.8 ? '#8a86c8' : '#3a3870');
  }
  // two layers of towers
  const layers = [
    { n: 26, base: h, min: 120, max: 260, col: [16, 12, 34], win: [52, 44, 96], lit: [150, 110, 70], seed: 1, wmin: 34, wmax: 70 },
    { n: 20, base: h, min: 60, max: 170, col: [22, 15, 44], win: [70, 56, 120], lit: [210, 150, 80], seed: 2, wmin: 44, wmax: 90 },
  ];
  for (const L of layers) {
    let x0 = -20;
    for (let i = 0; x0 < w; i++) {
      const bw = Math.round(L.wmin + hash(i + L.seed * 97) * (L.wmax - L.wmin));
      const bh = Math.round(L.min + hash(i + L.seed * 131) * (L.max - L.min));
      const ty = L.base - bh;
      for (let y = ty; y < h; y++)
        for (let x = x0; x < x0 + bw; x++) {
          let c = L.col;
          const wx = (x - x0 - 4) % 7, wy = (y - ty - 6) % 9;
          if (x - x0 > 3 && x0 + bw - x > 4 && y - ty > 5 && wx >= 0 && wx < 3 && wy >= 0 && wy < 4) {
            const cell = h2(Math.floor((x - x0) / 7) + i * 50, Math.floor((y - ty) / 9), L.seed);
            c = cell > 0.93 ? L.lit : cell > 0.5 ? L.win : L.col;
          }
          if (y === ty) c = L.col.map((v) => v + 10);
          P.set(x, y, c);
        }
      // antenna
      if (hash(i + L.seed * 17) > 0.7) for (let y = ty - 14; y < ty; y++) P.set(x0 + Math.floor(bw / 2), y, L.col.map((v) => v + 8));
      x0 += bw + Math.round(hash(i + L.seed * 7) * 10);
    }
  }
  return P.done();
}

// ---------- title block letters (5×7) ----------
export const FONT5 = {
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
};
export function block(s) {
  const P = pixels(s, s);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      let c = PAL.g1;
      if (x === s - 1 || y === s - 1) c = PAL.g4;
      else if (x === 0 || y === 0) c = PAL.g0;
      else if (x === s - 2 || y === s - 2) c = PAL.g3;
      else if ((x + y) % 7 === 0) c = PAL.g2;
      P.set(x, y, c);
    }
  P.set(3, 3, PAL.rivetHi); P.set(4, 3, PAL.rivet); P.set(3, 4, PAL.rivet); P.set(4, 4, PAL.rivetLo);
  return P.done();
}
