// REMY RUN pixel art: every sprite (cars, palms, signs, gates, skies) is generated once in prepare() from code.
// Remy sprites/heads come from the repo's quest atlases through the remy-bros rig.
import { hash } from 'filmkit/lib.js';
export { loadRemy, drawRemy, loadHeads, headIcon } from '../remy-bros/art.js';

export const FONT = '"Press Start 2P"';
const MEDIA = new URL('../../media/quest/', import.meta.url);

export const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
};
export const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
export const shade = (a, k) => (k >= 0 ? mix(a, '#ffffff', k) : mix(a, '#000000', -k));
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;

// ---------- pixel buffer ----------
export function pix(w, h) {
  w = Math.round(w); h = Math.round(h);
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const P = {
    c, w, h, d,
    set(x, y, col, a = 255) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= w || y >= h || !col) return;
      const [r, g, b] = typeof col === 'string' ? rgb(col) : col;
      const i = (y * w + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
    },
    get(x, y) { return x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]; },
    rgbAt(x, y) { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; },
    rect(x, y, rw, rh, col) { for (let yy = Math.round(y); yy < Math.round(y + rh); yy++) for (let xx = Math.round(x); xx < Math.round(x + rw); xx++) P.set(xx, yy, col); },
    // filled ellipse; fn(nx, ny) may return a colour per pixel (normalised coords −1..1)
    ell(cx, cy, rx, ry, col, clip = null) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
          if (nx * nx + ny * ny > 1) continue;
          if (clip && !clip(x, y)) continue;
          P.set(x, y, typeof col === 'function' ? col(nx, ny, x, y) : col);
        }
    },
    // convex/concave polygon fill (even-odd scanline)
    poly(pts, col) {
      const ys = pts.map((p) => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
      for (let y = y0; y <= y1; y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
          if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) P.set(x, y, typeof col === 'function' ? col(x, y) : col);
      }
    },
    line(x0, y0, x1, y1, col) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) P.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), col);
    },
    // dark outline around opaque pixels
    outline(ink = '#120a1e') {
      const m = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = d[(y * w + x) * 4 + 3] > 0 ? 1 : 0;
      const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : m[y * w + x]);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (!m[y * w + x] && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) P.set(x, y, ink);
    },
    done() { ctx.putImageData(img, 0, 0); return c; },
  };
  return P;
}

// ---------- tiny 3×5 font (plates, small sign print) ----------
const F35 = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111111101101',
  N: '110101101101101', O: '010101101101010', P: '110101110100100', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110',
  6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110', '-': '000000111000000', '!': '010010010000010',
  '.': '000000000000010', "'": '010010000000000', '?': '110001010000010', '/': '001001010100100', ':': '000010000010000', '+': '000010111010000',
};
export function tiny(P, s, x, y, col, k = 1) {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = F35[ch];
    if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') P.rect(cx + (i % 3) * k, y + Math.floor(i / 3) * k, k, k, col);
    cx += 4 * k;
  }
}
export const tinyW = (s, k = 1) => s.length * 4 * k - k;

// Canvas text helper (Press Start 2P), crisp-ish at multiples of 8.
export function text(x, s, a, b, { size = 8, color = '#fff', shadow = '#140a24', align = 'left', alpha = 1, sk = 0, outline = null } = {}) {
  x.save();
  x.globalAlpha *= alpha;
  x.font = `${size}px ${FONT}`;
  x.textAlign = align;
  x.textBaseline = 'top';
  if (sk) x.transform(1, 0, -sk, 1, sk * (b + size), 0);
  const k = Math.max(1, Math.round(size / 8));
  if (outline) {
    x.fillStyle = outline;
    for (const [dx, dy] of [[-k, 0], [k, 0], [0, -k], [0, k], [-k, -k], [k, k], [-k, k], [k, -k]]) x.fillText(s, Math.round(a + dx), Math.round(b + dy));
  }
  if (shadow) { x.fillStyle = shadow; x.fillText(s, Math.round(a + k), Math.round(b + k)); }
  x.fillStyle = color;
  x.fillText(s, Math.round(a), Math.round(b));
  x.restore();
}

// ---------- palettes ----------
export const SKIN = {};
export async function loadSkins(ids) {
  const res = await fetch(new URL('art.json', MEDIA).href);
  const rows = (await res.json()).rows;
  for (const i of ids) SKIN[i] = { skin: '#' + rows[i][0], hair: '#' + rows[i][1] };
}

export const CAR_COLS = [
  { body: '#8a4ad8', hi: '#c08cff', lo: '#4e2490' }, // purple
  { body: '#e8e4f0', hi: '#ffffff', lo: '#9a92b4' }, // white
  { body: '#1fb0a2', hi: '#7cf0dc', lo: '#0c6a64' }, // teal
  { body: '#f2c02a', hi: '#fff09a', lo: '#b07410' }, // yellow
  { body: '#4a86f0', hi: '#9cc4ff', lo: '#22488e' }, // blue
];
const INK = '#120a1e', GLASS = '#2a2448', GLASS_HI = '#6a6ca8', CHROME = '#d8dcec', CHROME_LO = '#7a7e9a', TIRE = '#16121c', TIRE_HI = '#3a3444';

function domeShade(base, hi, lo) {
  return (nx, ny) => {
    const l = -0.45 * nx - 0.75 * ny;
    return l > 0.55 ? hi : l > -0.15 ? base : lo;
  };
}
// Bald dome seen from behind (in a window): skin with a specular glint.
function baldBack(P, cx, cy, r, skin, clip) {
  const lo = shade(skin, -0.28), hi = shade(skin, 0.35);
  P.ell(cx - r - 1, cy + 2, 3, 4, lo, clip);
  P.ell(cx + r + 1, cy + 2, 3, 4, lo, clip);
  P.ell(cx, cy, r, r * 1.05, (nx, ny) => (nx * -0.5 + ny * -0.7 > 0.55 ? hi : nx * -0.4 + ny * -0.5 > -0.5 ? skin : lo), clip);
  P.set(cx - Math.round(r * 0.35), cy - Math.round(r * 0.45), '#ffffff');
  P.set(cx - Math.round(r * 0.35) + 1, cy - Math.round(r * 0.45), '#ffffff');
  P.set(cx - Math.round(r * 0.35), cy - Math.round(r * 0.45) + 1, '#ffffff');
}

// ---------- traffic car faces (rear / side / front) ----------
// Every face of a car shares its height so the yaw "box" billboard lines up.
export function bugFaces(col, skin, sideHead, frontHead) {
  const C = CAR_COLS[col], H = 84;
  // rear
  const R = pix(128, H);
  R.ell(64, 52, 58, 36, domeShade(C.body, C.hi, C.lo), (x, y) => y < 74);
  R.ell(22, 60, 20, 15, domeShade(C.body, C.hi, C.lo));
  R.ell(106, 60, 20, 15, domeShade(C.body, C.hi, C.lo));
  R.rect(8, 60, 112, 12, C.body);
  R.rect(8, 68, 112, 4, C.lo);
  const win = (x, y) => ((x + 0.5 - 64) / 30) ** 2 + ((y + 0.5 - 32) / 14) ** 2 <= 1;
  R.ell(64, 32, 30, 14, GLASS);
  baldBack(R, 64, 38, 11, skin, win);
  for (let i = 0; i < 6; i++) R.set(46 + i, 22 + i, GLASS_HI), R.set(48 + i, 22 + i, GLASS_HI);
  for (let k = 0; k < 4; k++) R.rect(48, 50 + k * 3, 32, 1, C.lo);
  R.ell(18, 56, 6, 5, '#ff2a3a'); R.ell(110, 56, 6, 5, '#ff2a3a');
  R.rect(15, 54, 3, 2, '#ffb0a0'); R.rect(107, 54, 3, 2, '#ffb0a0');
  R.rect(6, 72, 116, 4, CHROME); R.rect(6, 75, 116, 1, CHROME_LO);
  R.rect(50, 62, 28, 9, '#f6e6a0'); R.rect(50, 70, 28, 1, '#a08a40'); tiny(R, 'BALD', 50 + 14 - tinyW('BALD') / 2, 64, INK);
  R.rect(14, 76, 18, 8, TIRE); R.rect(96, 76, 18, 8, TIRE); R.rect(16, 76, 14, 1, TIRE_HI); R.rect(98, 76, 14, 1, TIRE_HI);
  R.rect(84, 74, 6, 4, '#4a4458');
  R.outline(INK);
  // side (nose to the right)
  const S = pix(232, H);
  S.poly([[12, 70], [12, 54], [30, 40], [70, 18], [120, 12], [160, 20], [196, 44], [220, 52], [224, 70]], (x, y) => (y < 30 ? C.hi : y < 58 ? C.body : C.lo));
  S.poly([[78, 22], [118, 16], [150, 22], [168, 40], [78, 40]], GLASS);
  if (sideHead) blitHead(S, sideHead, 106, 8, 2, (x, y) => y < 41 && S.get(x, y) > 0);
  S.rect(116, 22, 1, 18, C.lo);
  S.line(80, 41, 80, 64, C.lo); S.line(150, 41, 152, 64, C.lo);
  S.ell(48, 70, 18, 18, (nx, ny) => (nx * nx + ny * ny < 0.25 ? CHROME : TIRE), (x, y) => y < 84);
  S.ell(184, 70, 18, 18, (nx, ny) => (nx * nx + ny * ny < 0.25 ? CHROME : TIRE), (x, y) => y < 84);
  S.ell(48, 70, 22, 20, C.lo, (x, y) => y < 58 && S.get(x, y) === 0);
  S.rect(4, 64, 10, 4, CHROME); S.rect(220, 62, 10, 4, CHROME);
  S.ell(214, 52, 5, 4, '#fff6c0'); S.ell(16, 56, 3, 3, '#ff2a3a');
  S.outline(INK);
  // front
  const F = pix(128, H);
  F.ell(64, 54, 56, 32, domeShade(C.body, C.hi, C.lo), (x, y) => y < 74);
  F.ell(22, 60, 20, 15, domeShade(C.body, C.hi, C.lo));
  F.ell(106, 60, 20, 15, domeShade(C.body, C.hi, C.lo));
  F.rect(8, 60, 112, 12, C.body);
  F.ell(64, 30, 32, 13, GLASS);
  if (frontHead) blitHead(F, frontHead, 48, 12, 2, (x, y) => ((x + 0.5 - 64) / 32) ** 2 + ((y + 0.5 - 30) / 13) ** 2 <= 1);
  F.ell(22, 58, 9, 9, '#fff6c0'); F.ell(106, 58, 9, 9, '#fff6c0'); F.ell(20, 56, 3, 3, '#ffffff'); F.ell(104, 56, 3, 3, '#ffffff');
  F.ell(64, 56, 7, 7, CHROME); tiny(F, 'C', 63, 54, INK);
  F.rect(6, 72, 116, 4, CHROME);
  F.rect(14, 76, 18, 8, TIRE); F.rect(96, 76, 18, 8, TIRE);
  F.outline(INK);
  return { rear: R.done(), side: S.done(), front: F.done(), w: 128, l: 232, h: H };
}

export function pickupFaces(col, skin, sideHead, frontHead) {
  const C = CAR_COLS[col], H = 92;
  const R = pix(140, H);
  // cab roof + rear window
  R.rect(30, 6, 80, 34, C.body); R.rect(30, 6, 80, 4, C.hi); R.rect(36, 12, 68, 24, GLASS);
  const win = (x, y) => x >= 36 && x < 104 && y >= 12 && y < 36;
  baldBack(R, 70, 30, 11, skin, win);
  for (let i = 0; i < 8; i++) R.set(40 + i, 14 + i, GLASS_HI);
  // bed + tailgate
  R.rect(6, 40, 128, 36, C.body); R.rect(6, 40, 128, 3, C.hi); R.rect(6, 72, 128, 4, C.lo);
  R.rect(22, 48, 96, 20, shade(C.body, -0.08)); R.rect(22, 48, 96, 2, C.lo);
  tiny(R, 'CABALD', 70 - tinyW('CABALD', 2) / 2, 53, C.lo, 2);
  R.rect(6, 44, 10, 22, '#ff2a3a'); R.rect(124, 44, 10, 22, '#ff2a3a'); R.rect(8, 46, 3, 8, '#ffb0a0'); R.rect(126, 46, 3, 8, '#ffb0a0');
  R.rect(4, 76, 132, 5, '#4a4458'); R.rect(4, 76, 132, 1, CHROME_LO);
  R.rect(58, 66, 24, 9, '#f6e6a0'); tiny(R, 'NO1', 70 - tinyW('NO1') / 2, 68, INK);
  R.rect(12, 81, 22, 11, TIRE); R.rect(106, 81, 22, 11, TIRE);
  R.outline(INK);
  const S = pix(250, H);
  S.rect(8, 40, 236, 34, C.body); S.rect(8, 40, 236, 3, C.hi); S.rect(8, 70, 236, 4, C.lo);
  S.poly([[150, 40], [160, 8], [214, 8], [234, 40]], C.body); S.poly([[164, 12], [208, 12], [224, 38], [164, 38]], GLASS);
  if (sideHead) blitHead(S, sideHead, 176, 12, 2, (x, y) => y < 39);
  S.rect(148, 42, 1, 28, C.lo);
  S.ell(52, 76, 16, 16, (nx, ny) => (nx * nx + ny * ny < 0.25 ? CHROME : TIRE), (x, y) => y < 92);
  S.ell(204, 76, 16, 16, (nx, ny) => (nx * nx + ny * ny < 0.25 ? CHROME : TIRE), (x, y) => y < 92);
  S.rect(240, 52, 6, 6, '#fff6c0'); S.rect(4, 46, 5, 10, '#ff2a3a');
  S.outline(INK);
  const F = pix(140, H);
  F.rect(30, 6, 80, 34, C.body); F.rect(30, 6, 80, 4, C.hi); F.rect(36, 12, 68, 26, GLASS);
  if (frontHead) blitHead(F, frontHead, 54, 8, 2, (x, y) => x >= 36 && x < 104 && y >= 12 && y < 38);
  F.rect(6, 40, 128, 36, C.body); F.rect(6, 40, 128, 3, C.hi);
  F.rect(30, 50, 80, 16, '#2a2436'); for (let k = 0; k < 4; k++) F.rect(32, 52 + k * 4, 76, 2, CHROME_LO);
  F.rect(10, 48, 16, 10, '#fff6c0'); F.rect(114, 48, 16, 10, '#fff6c0');
  F.rect(4, 76, 132, 5, CHROME);
  F.rect(12, 81, 22, 11, TIRE); F.rect(106, 81, 22, 11, TIRE);
  F.outline(INK);
  return { rear: R.done(), side: S.done(), front: F.done(), w: 140, l: 250, h: H };
}

function blitHead(P, head, x0, y0, k, clip) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const i = ((head.y + y) * head.w + head.x + x) * 4, dd = head.d;
    if (dd[i + 3] === 0) continue;
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) {
      const px = x0 + x * k + a, py = y0 + y * k + b;
      if (!clip || clip(px, py)) P.set(px, py, [dd[i], dd[i + 1], dd[i + 2]]);
    }
  }
}
// atlas → { d, w, x, y } accessor for head i
export function atlasHead(atlasData, w, i) {
  return { d: atlasData, w, x: (i % 67) * 16, y: Math.floor(i / 67) * 16 };
}

export function truckFace(skin) {
  const W = 176, H = 196, P = pix(W, H);
  const box = '#ece6f6', boxLo = '#b4aacc', boxHi = '#ffffff';
  P.rect(4, 0, W - 8, 168, box);
  for (let x = 8; x < W - 8; x += 12) P.rect(x, 4, 2, 160, boxLo);
  P.rect(4, 0, W - 8, 4, boxHi); P.rect(4, 164, W - 8, 4, boxLo);
  P.rect(W / 2 - 1, 4, 2, 160, '#8a80a4');
  // logo: giant shiny bald head
  P.rect(16, 18, W - 32, 112, '#3a1d5e');
  P.rect(16, 18, W - 32, 3, '#6a3a9e');
  P.ell(W / 2, 64, 30, 30, (nx, ny) => (nx * -0.5 + ny * -0.7 > 0.5 ? '#ffe6d4' : nx * -0.4 + ny * -0.5 > -0.5 ? skin : shade(skin, -0.3)));
  P.ell(W / 2 - 31, 68, 5, 8, shade(skin, -0.2)); P.ell(W / 2 + 31, 68, 5, 8, shade(skin, -0.2));
  P.rect(W / 2 - 14, 60, 8, 3, INK); P.rect(W / 2 + 6, 60, 8, 3, INK); P.rect(W / 2 - 8, 76, 16, 2, INK);
  for (const [sx, sy] of [[W / 2 - 14, 44], [W / 2 + 30, 38], [W / 2 - 40, 50]]) { P.rect(sx - 4, sy, 9, 1, '#ffffff'); P.rect(sx, sy - 4, 1, 9, '#ffffff'); }
  tiny(P, 'CABALD', W / 2 - tinyW('CABALD', 3) / 2, 100, '#ffd34a', 3);
  tiny(P, 'WAX CO.', W / 2 - tinyW('WAX CO.', 2) / 2, 120, '#ffffff', 2);
  tiny(P, "HOW'S MY SHINE?", W / 2 - tinyW("HOW'S MY SHINE?") / 2, 140, '#5a4a7a');
  P.rect(4, 168, W - 8, 8, '#3a3448'); P.rect(10, 172, W - 20, 4, '#ffcf3a');
  for (let x = 12; x < W - 12; x += 16) P.rect(x, 172, 8, 4, '#2a2436');
  P.rect(8, 150, 10, 14, '#ff2a3a'); P.rect(W - 18, 150, 10, 14, '#ff2a3a');
  P.rect(14, 176, 34, 20, TIRE); P.rect(W - 48, 176, 34, 20, TIRE); P.rect(30, 176, 2, 20, TIRE_HI); P.rect(W - 32, 176, 2, 20, TIRE_HI);
  P.outline(INK);
  return { rear: P.done(), w: W, h: H };
}

export function limoFaces(skins, sideHeads, frontHead) {
  const H = 76, body = '#1c1828', hi = '#4a4462', lo = '#0a0812', gold = '#ffcf3a', goldLo = '#b07a10';
  const R = pix(156, H);
  R.rect(22, 4, 112, 28, body); R.rect(22, 4, 112, 3, hi);
  R.rect(28, 9, 100, 20, GLASS);
  const win = (x, y) => x >= 28 && x < 128 && y >= 9 && y < 29;
  [44, 78, 112].forEach((cx, k) => baldBack(R, cx, 26, 9, skins[k], win));
  R.rect(6, 32, 144, 30, body); R.rect(6, 32, 144, 3, hi); R.rect(6, 58, 144, 4, lo);
  R.rect(6, 40, 144, 2, gold); R.rect(6, 42, 144, 1, goldLo);
  R.rect(6, 44, 30, 8, '#ff2a3a'); R.rect(120, 44, 30, 8, '#ff2a3a'); R.rect(8, 45, 26, 2, '#ffb0a0'); R.rect(122, 45, 26, 2, '#ffb0a0');
  R.rect(52, 46, 52, 10, gold); R.rect(53, 47, 50, 8, '#2a1d06'); tiny(R, 'CABALD 1', 78 - tinyW('CABALD 1') / 2, 49, gold);
  R.rect(4, 62, 148, 5, CHROME); R.rect(14, 67, 24, 9, TIRE); R.rect(118, 67, 24, 9, TIRE);
  // pennants on the rear fenders
  for (const fx of [10, 144]) { R.rect(fx, 0, 1, 32, CHROME); R.poly([[fx + 1, 0], [fx + 12, 4], [fx + 1, 8]], '#8a3ad8'); }
  R.outline(INK);
  const L = 400, S = pix(L, H);
  S.rect(8, 30, L - 16, 34, body); S.rect(8, 30, L - 16, 3, hi); S.rect(8, 40, L - 16, 2, gold);
  S.poly([[60, 30], [80, 6], [L - 90, 6], [L - 64, 30]], body);
  for (let k = 0; k < 4; k++) {
    const x0 = 86 + k * 58;
    S.rect(x0, 10, 50, 18, GLASS);
    if (sideHeads[k % sideHeads.length]) blitHead(S, sideHeads[k % sideHeads.length], x0 + 10, 8, 2, (x, y) => x >= x0 && x < x0 + 50 && y >= 10 && y < 28);
  }
  S.rect(L - 84, 10, 20, 18, GLASS);
  S.ell(70, 64, 14, 14, (nx, ny) => (nx * nx + ny * ny < 0.25 ? CHROME : TIRE), (x, y) => y < H);
  S.ell(L - 70, 64, 14, 14, (nx, ny) => (nx * nx + ny * ny < 0.25 ? CHROME : TIRE), (x, y) => y < H);
  S.rect(L - 10, 44, 6, 6, '#fff6c0'); S.rect(4, 44, 5, 8, '#ff2a3a');
  S.outline(INK);
  const F = pix(156, H);
  F.rect(22, 4, 112, 28, body); F.rect(22, 4, 112, 3, hi); F.rect(28, 9, 100, 20, GLASS);
  if (frontHead) blitHead(F, frontHead, 62, 2, 2, (x, y) => x >= 28 && x < 128 && y >= 9 && y < 29);
  F.rect(6, 32, 144, 30, body); F.rect(6, 32, 144, 3, hi);
  F.rect(52, 40, 52, 18, gold); for (let k = 0; k < 5; k++) F.rect(54, 42 + k * 3, 48, 1, goldLo);
  F.rect(10, 40, 30, 10, '#fff6c0'); F.rect(116, 40, 30, 10, '#fff6c0');
  F.ell(78, 30, 5, 5, gold); F.set(76, 28, '#ffffff');
  F.rect(4, 62, 148, 5, CHROME); F.rect(14, 67, 24, 9, TIRE); F.rect(118, 67, 24, 9, TIRE);
  F.outline(INK);
  return { rear: R.done(), side: S.done(), front: F.done(), w: 156, l: L, h: H };
}

// ---------- roadside ----------
export function palm(seed, h = 230) {
  const w = 150, P = pix(w, h);
  const lean = (hash(seed) - 0.5) * 50, base = w / 2;
  // trunk: segmented, curving
  const pts = [];
  for (let y = h - 1; y > 34; y--) {
    const u = (h - 1 - y) / (h - 35);
    pts.push([base + lean * u * u, y]);
  }
  for (const [x, y] of pts) {
    const u = (h - 1 - y) / (h - 35), tw = Math.round(7 - 3 * u);
    const band = Math.floor(y / 6) % 2;
    for (let k = -tw; k <= tw; k++) P.set(x + k, y, k < -tw + 2 ? '#3a2018' : k > tw - 3 ? '#5a3424' : band ? '#9a6440' : '#b47a4c');
    if (y % 6 === 0) for (let k = -tw; k <= tw; k++) P.set(x + k, y, '#5a3424');
  }
  const tx = base + lean, ty = 36;
  // fronds: drooping arcs
  const fronds = 9;
  for (let f = 0; f < fronds; f++) {
    const a = -Math.PI + (f / (fronds - 1)) * Math.PI + (hash(seed * 9 + f) - 0.5) * 0.3;
    const len = 52 + hash(seed * 7 + f) * 22, droop = 0.9 + hash(seed * 5 + f) * 0.6;
    for (let s = 0; s <= len; s++) {
      const u = s / len, dx = Math.cos(a) * s, dy = Math.sin(a) * s * 0.55 + droop * u * u * 46;
      const x = tx + dx, y = ty + dy, thick = Math.round(4 * Math.sin(Math.PI * Math.min(1, u * 1.2)) + 1);
      for (let k = -thick; k <= thick; k++) {
        const col = k < 0 ? '#3ea84a' : k === 0 ? '#2a7a3a' : '#1f5a32';
        P.set(x + (Math.abs(Math.sin(a)) > 0.7 ? k : 0), y + (Math.abs(Math.sin(a)) > 0.7 ? 0 : k), col);
      }
      if (s % 3 === 0 && u > 0.15) for (let k = 1; k < 7 * (1 - u) + 2; k++) { P.set(x - k * 0.4, y + k, '#2a7a3a'); P.set(x + k * 0.4, y + k, '#1f5a32'); }
    }
  }
  P.ell(tx, ty + 4, 7, 6, '#5a3424'); P.ell(tx - 4, ty + 7, 4, 4, '#7a4a2a'); P.ell(tx + 4, ty + 8, 4, 4, '#6a3a22');
  P.outline(INK);
  return P.done();
}

export function cactus(seed) {
  const w = 60, h = 110, P = pix(w, h);
  const g = (nx) => (nx < -0.4 ? '#7ad06a' : nx < 0.3 ? '#3e9a4a' : '#1f6a36');
  const col = (x0, y0, y1, r) => { for (let y = y0; y <= y1; y++) for (let x = -r; x <= r; x++) P.set(x0 + x, y, g(x / r)); P.ell(x0, y0, r, r, (nx) => g(nx)); };
  col(30, 14, h - 1, 9);
  const lh = 36 + Math.floor(hash(seed) * 20), rh = 26 + Math.floor(hash(seed + 1) * 22);
  col(12, lh, lh + 26, 6); for (let x = 12; x <= 30; x++) for (let k = -5; k <= 5; k++) P.set(x, lh + 26 + k, g(k / 5));
  col(48, rh, rh + 20, 6); for (let x = 30; x <= 48; x++) for (let k = -5; k <= 5; k++) P.set(x, rh + 20 + k, g(k / 5));
  for (let y = 18; y < h; y += 6) P.set(27, y, '#c8f0a0'), P.set(33, y + 3, '#c8f0a0');
  P.outline(INK);
  return P.done();
}

export function rock(seed, w = 120, h = 200) {
  const P = pix(w, h);
  const top = (x) => 8 + 18 * Math.abs(Math.sin(x * 0.07 + seed)) + 10 * hash(Math.floor(x / 9) + seed * 13);
  for (let x = 6; x < w - 6; x++) {
    const t = Math.round(top(x)), edgeL = x < 14, edgeR = x > w - 18;
    for (let y = t; y < h; y++) {
      const band = Math.floor((y + 4 * Math.sin(x * 0.2)) / 14) % 3;
      let c = band === 0 ? '#c8582e' : band === 1 ? '#a8401f' : '#d8703a';
      if (edgeL) c = '#e8905a';
      if (edgeR) c = '#6e2a1a';
      if (y < t + 3) c = '#f0a86a';
      if (h2(x, y, seed) > 0.94) c = '#5a2016';
      P.set(x, y, c);
    }
  }
  P.outline(INK);
  return P.done();
}

// Billboard on two posts. draw(ctx, w, h) paints the face.
export function billboard(w, h, face, post = 60) {
  const W = w + 8, Ht = h + 8 + post, c = canvas(W, Ht), x = c.getContext('2d');
  x.fillStyle = INK; x.fillRect(W * 0.22 - 4, h, 8, post + 8); x.fillRect(W * 0.78 - 4, h, 8, post + 8);
  x.fillStyle = '#6a6278'; x.fillRect(W * 0.22 - 3, h, 6, post + 8); x.fillRect(W * 0.78 - 3, h, 6, post + 8);
  x.fillStyle = '#9a92a8'; x.fillRect(W * 0.22 - 3, h, 2, post + 8); x.fillRect(W * 0.78 - 3, h, 2, post + 8);
  x.fillStyle = INK; x.fillRect(0, 0, W, h + 8);
  x.fillStyle = '#d8d0e4'; x.fillRect(2, 2, W - 4, h + 4);
  x.save(); x.translate(4, 4); x.beginPath(); x.rect(0, 0, w, h); x.clip(); face(x, w, h); x.restore();
  // lamps
  for (const lx of [W * 0.3, W * 0.7]) { x.fillStyle = INK; x.fillRect(lx - 4, h + 6, 8, 4); x.fillStyle = '#fff6c0'; x.fillRect(lx - 3, h + 7, 6, 2); }
  return c;
}

export function chevron(dir) {
  const w = 60, h = 70, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = INK; x.fillRect(27, 30, 6, 40); x.fillStyle = '#8a8298'; x.fillRect(28, 30, 4, 40);
  x.fillStyle = INK; x.fillRect(0, 0, w, 34);
  x.fillStyle = '#ffffff'; x.fillRect(2, 2, w - 4, 30);
  x.fillStyle = '#e8203a';
  for (let k = 0; k < 2; k++) {
    const ox = 10 + k * 20;
    x.beginPath();
    if (dir > 0) { x.moveTo(ox, 6); x.lineTo(ox + 8, 6); x.lineTo(ox + 18, 17); x.lineTo(ox + 8, 28); x.lineTo(ox, 28); x.lineTo(ox + 10, 17); }
    else { x.moveTo(ox + 18, 6); x.lineTo(ox + 10, 6); x.lineTo(ox, 17); x.lineTo(ox + 10, 28); x.lineTo(ox + 18, 28); x.lineTo(ox + 8, 17); }
    x.fill();
  }
  return c;
}

// Barber pole sign: "CABALD BARBER — SHAVES ONLY"
export function barber(baldIcon) {
  return billboard(176, 72, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a1a5e'); g.addColorStop(1, '#5a2a8e');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // pole
    x.fillStyle = '#ffffff'; x.fillRect(6, 6, 16, h - 12);
    x.fillStyle = '#e8203a'; for (let y = -16; y < h; y += 12) { x.beginPath(); x.moveTo(6, y); x.lineTo(22, y + 8); x.lineTo(22, y + 13); x.lineTo(6, y + 5); x.fill(); }
    x.fillStyle = '#3a6ae8'; for (let y = -10; y < h; y += 12) { x.beginPath(); x.moveTo(6, y); x.lineTo(22, y + 8); x.lineTo(22, y + 10); x.lineTo(6, y + 2); x.fill(); }
    x.fillStyle = '#ffd34a'; x.fillRect(4, 2, 20, 5); x.fillRect(4, h - 7, 20, 5);
    text(x, 'CABALD', 32, 10, { size: 16, color: '#ffd34a', shadow: '#120a1e' });
    text(x, 'BARBER', 32, 30, { size: 16, color: '#ffffff', shadow: '#120a1e' });
    text(x, 'SHAVES ONLY', 32, 54, { size: 8, color: '#ff8ab8', shadow: null });
    x.drawImage(baldIcon, w - 34, 6);
  });
}
export function tonic(heroIcon) {
  return billboard(184, 80, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#ff3a7a'); g.addColorStop(1, '#ff9a3a');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) { x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.moveTo(140, 40); x.arc(140, 40, 120, i * 0.52, i * 0.52 + 0.26); x.fill(); }
    // bottle
    x.fillStyle = '#120a1e'; x.fillRect(118, 18, 34, 56); x.fillRect(128, 6, 14, 14);
    x.fillStyle = '#7affb0'; x.fillRect(120, 30, 30, 42); x.fillStyle = '#d8fff0'; x.fillRect(122, 32, 6, 30);
    x.fillStyle = '#c08850'; x.fillRect(130, 8, 10, 10);
    x.fillStyle = '#ffd34a'; x.fillRect(124, 44, 22, 12);
    text(x, 'HAIR', 8, 8, { size: 16, color: '#ffffff', shadow: '#5a0a2a' });
    text(x, 'TONIC', 8, 28, { size: 16, color: '#ffffff', shadow: '#5a0a2a' });
    text(x, 'GROWS ON', 8, 54, { size: 8, color: '#fff6a0', shadow: null });
    text(x, 'YOU!', 8, 66, { size: 8, color: '#fff6a0', shadow: null });
    x.drawImage(heroIcon, 158, 4);
  });
}
export function remyBoard(heroIcon2) {
  return billboard(176, 80, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#12d0e8'); g.addColorStop(1, '#2a5ae8');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.drawImage(heroIcon2, 8, 8);
    text(x, 'REMY', 56, 10, { size: 16, color: '#ffffff', shadow: '#0a1a5e' });
    text(x, 'BOYS', 56, 30, { size: 16, color: '#ffd34a', shadow: '#0a1a5e' });
    text(x, 'HAIR IS LIFE', 8, 60, { size: 8, color: '#ffffff', shadow: '#0a1a5e' });
  });
}
export function shinyBoard(baldIcon2) {
  return billboard(184, 80, (x, w, h) => {
    x.fillStyle = '#120a1e'; x.fillRect(0, 0, w, h);
    const g = x.createRadialGradient(36, 40, 4, 36, 40, 60); g.addColorStop(0, '#ffd34a'); g.addColorStop(1, 'rgba(255,211,74,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.drawImage(baldIcon2, 4, 8);
    text(x, 'CABALD', 72, 8, { size: 16, color: '#ffd34a', shadow: '#5a2a00' });
    text(x, 'COUNTRY', 72, 28, { size: 8, color: '#ffffff', shadow: null });
    text(x, 'KEEP IT', 72, 46, { size: 8, color: '#ff8ab8', shadow: null });
    text(x, 'SHINY', 72, 60, { size: 16, color: '#ff8ab8', shadow: '#3a0a2a' });
  });
}
export function crossing(baldIcon) {
  const w = 72, h = 110, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = INK; x.fillRect(33, 60, 6, 50); x.fillStyle = '#8a8298'; x.fillRect(34, 60, 4, 50);
  x.save(); x.translate(36, 36); x.rotate(Math.PI / 4);
  x.fillStyle = INK; x.fillRect(-26, -26, 52, 52); x.fillStyle = '#ffd31a'; x.fillRect(-23, -23, 46, 46); x.fillStyle = INK; x.fillRect(-20, -20, 40, 40); x.fillStyle = '#ffd31a'; x.fillRect(-19, -19, 38, 38);
  x.restore();
  x.drawImage(baldIcon, 20, 14);
  text(x, 'BALD', 36, 48, { size: 8, color: '#120a1e', shadow: null, align: 'center' });
  x.fillStyle = INK; x.fillRect(6, 78, 60, 22); x.fillStyle = '#ffd31a'; x.fillRect(8, 80, 56, 18);
  text(x, 'XING', 36, 85, { size: 8, color: '#120a1e', shadow: null, align: 'center' });
  return c;
}
export function forkSign(baldIcon, heroIcon) {
  return billboard(260, 76, (x, w, h) => {
    x.fillStyle = '#1a7a3a'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffffff'; x.fillRect(3, 3, w - 6, 2); x.fillRect(3, h - 5, w - 6, 2); x.fillRect(w / 2 - 1, 8, 2, h - 16);
    x.drawImage(heroIcon, 10, 8);
    text(x, 'HAIRLINE', 30, 12, { size: 8, color: '#ffffff', shadow: null });
    text(x, 'HWY', 30, 24, { size: 8, color: '#ffffff', shadow: null });
    text(x, 'EASY', 10, 42, { size: 8, color: '#9affb0', shadow: null });
    x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(10, 62); x.lineTo(22, 54); x.lineTo(22, 59); x.lineTo(56, 59); x.lineTo(56, 65); x.lineTo(22, 65); x.lineTo(22, 70); x.fill();
    x.drawImage(baldIcon, w - 26, 8);
    text(x, 'CABALD', w / 2 + 8, 12, { size: 8, color: '#ffffff', shadow: null });
    text(x, 'CANYON', w / 2 + 8, 24, { size: 8, color: '#ffffff', shadow: null });
    text(x, 'HARD', w / 2 + 8, 42, { size: 8, color: '#ff8a8a', shadow: null });
    x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(w - 10, 62); x.lineTo(w - 22, 54); x.lineTo(w - 22, 59); x.lineTo(w - 56, 59); x.lineTo(w - 56, 65); x.lineTo(w - 22, 65); x.lineTo(w - 22, 70); x.fill();
  }, 70);
}

// Gate banner: spans the road; pillars drawn separately (see game.js).
export function banner(label, { bg = '#e8203a', fg = '#ffffff', checker = false, w = 320, h = 40 } = {}) {
  const c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = INK; x.fillRect(0, 0, w, h);
  x.fillStyle = bg; x.fillRect(2, 2, w - 4, h - 4);
  if (checker) for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < w / 8; xx++) { x.fillStyle = (xx + yy) % 2 ? '#ffffff' : INK; x.fillRect(xx * 8, yy === 0 ? 2 : h - 10, 8, 8); }
  x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(2, 2, w - 4, 3);
  text(x, label, w / 2, h / 2 - 8, { size: 16, color: fg, shadow: INK, align: 'center' });
  return c;
}
export function pillar(h = 200, col = '#d8d0e4') {
  const w = 20, P = pix(w, h);
  for (let y = 0; y < h; y++) for (let x = 2; x < w - 2; x++) P.set(x, y, x < 6 ? '#ffffff' : x > w - 7 ? shade(col, -0.35) : col);
  for (let y = 10; y < h; y += 24) P.rect(2, y, w - 4, 3, shade(col, -0.5));
  P.outline(INK);
  return P.done();
}

// Start lights gantry face
export function lightsBox() {
  const c = canvas(84, 30), x = c.getContext('2d');
  x.fillStyle = INK; x.fillRect(0, 0, 84, 30); x.fillStyle = '#2a2436'; x.fillRect(2, 2, 80, 26);
  return c;
}

// Smoke puff (soft pixel blob), tinted
export function puff(col = '#e8e2f0', lo = '#a89ec0') {
  const P = pix(32, 32);
  P.ell(16, 16, 15, 15, (nx, ny, x, y) => {
    const l = -0.5 * nx - 0.7 * ny;
    const r2 = nx * nx + ny * ny;
    if (r2 > 0.8 && bayer(x, y) > 0.5) return null;
    return l > 0.2 ? '#ffffff' : l > -0.4 ? col : lo;
  });
  return P.done();
}

// Gold trophy
export function trophy() {
  const P = pix(40, 52);
  const g = (nx) => (nx < -0.4 ? '#fff6b0' : nx < 0.2 ? '#ffcf3a' : nx < 0.6 ? '#e09a10' : '#a86a08');
  P.ell(20, 14, 16, 14, (nx, ny) => g(nx), (x, y) => y >= 2);
  P.rect(4, 2, 32, 4, '#ffcf3a'); P.rect(4, 2, 32, 1, '#fff6b0');
  P.ell(4, 14, 5, 7, '#e09a10', (x, y) => x < 6); P.ell(36, 14, 5, 7, '#a86a08', (x, y) => x > 34);
  P.rect(16, 28, 8, 10, '#e09a10'); P.rect(16, 28, 3, 10, '#fff6b0');
  P.rect(10, 38, 20, 6, '#ffcf3a'); P.rect(6, 44, 28, 8, '#5a2a10'); P.rect(6, 44, 28, 2, '#8a4a20');
  P.rect(12, 46, 16, 4, '#ffcf3a');
  P.set(12, 10, '#ffffff'); P.set(13, 9, '#ffffff'); P.set(12, 9, '#ffffff');
  P.outline(INK);
  return P.done();
}

// ---------- skies (dithered bands) ----------
export function skyGrad(w, h, stops, bands = 18, stars = 0) {
  const st = stops.map(([p, c]) => [p, rgb(c)]);
  const P = pix(w, h);
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const q = v * bands, b0 = Math.floor(q), f = q - b0;
      const p = Math.min(1, (f > bayer(x, y) ? b0 + 1 : b0) / bands);
      let k = 0;
      while (k < st.length - 2 && p > st[k + 1][0]) k++;
      const [pa, ca] = st[k], [pb, cb] = st[k + 1], u = Math.max(0, Math.min(1, (p - pa) / (pb - pa)));
      P.set(x, y, ca.map((a, i) => a + (cb[i] - a) * u));
    }
  }
  for (let i = 0; i < stars; i++) {
    const sx = Math.floor(hash(i + 31) * w), sy = Math.floor(hash(i + 77) ** 1.6 * h * 0.55);
    P.set(sx, sy, hash(i + 5) > 0.7 ? '#ffffff' : '#c8b8ff');
  }
  return P.done();
}

// Synthwave sun with slats (transparent canvas)
export function sun(r = 62) {
  const P = pix(r * 2 + 2, r * 2 + 2);
  const top = rgb('#fff27a'), mid = rgb('#ffa03a'), bot = rgb('#ff2a7a');
  P.ell(r + 1, r + 1, r, r, (nx, ny, x, y) => {
    const v = (ny + 1) / 2;
    if (v > 0.5) { const k = (v - 0.5) / 0.5, gap = 1 + Math.floor(k * 6), per = 10; if ((y - Math.floor(r)) % per < gap && v > 0.55) return null; }
    const c = v < 0.5 ? top.map((a, i) => a + (mid[i] - a) * (v / 0.5)) : mid.map((a, i) => a + (bot[i] - a) * ((v - 0.5) / 0.5));
    return c;
  });
  return P.done();
}

// Wrap-around cloud streak layer
export function cloudLayer(w, h, seed, cols) {
  const P = pix(w, h);
  for (let n = 0; n < 26; n++) {
    const cx = hash(seed + n * 3) * w, cy = 10 + hash(seed + n * 3 + 1) ** 1.3 * (h - 24), len = 60 + hash(seed + n * 7) * 160, th = 3 + Math.floor(hash(seed + n * 11) * 7);
    for (let k = -1; k <= 1; k++) {
      for (let x = -len / 2; x < len / 2; x++) {
        const u = x / (len / 2), t = th * Math.sqrt(Math.max(0, 1 - u * u));
        for (let y = -t; y < t * 0.6; y++) {
          const px = ((Math.round(cx + x + k * w) % w) + w) % w, py = Math.round(cy + y);
          if (k !== 0) continue;
          const v = (y + t) / (t * 1.6 + 0.01);
          const edge = Math.abs(u) > 0.8 && bayer(px, py) > 0.5;
          if (edge) continue;
          P.set(px, py, v < 0.35 ? cols[0] : v < 0.75 ? cols[1] : cols[2]);
        }
      }
    }
  }
  return P.done();
}

// Far layer: islands + headland palms over a sea strip (stage 1), mesas (stage 2)
export function islands(w, h) {
  const P = pix(w, h);
  for (let x = 0; x < w; x++) {
    const hh = Math.max(0, 30 * Math.sin(x * 0.011) + 14 * Math.sin(x * 0.037 + 1) - 10) + (Math.sin(x * 0.004 + 2) > 0.6 ? 18 * Math.sin(x * 0.02) ** 2 : 0);
    for (let y = Math.round(h - hh); y < h; y++) P.set(x, y, y < h - hh + 2 ? '#8a3a8a' : '#5a2268');
  }
  for (let i = 0; i < 18; i++) {
    const px = Math.floor(hash(i + 400) * w), base = h - 4;
    let topY = h;
    for (let y = 0; y < h; y++) if (P.get(px, y)) { topY = y; break; }
    if (topY > h - 6) continue;
    const th = 14 + Math.floor(hash(i + 401) * 12);
    for (let y = 0; y < th; y++) P.set(px + Math.round(y * y * 0.01), topY - y, '#3a1450');
    const tx = px + Math.round(th * th * 0.01), ty = topY - th;
    for (let a = 0; a < 6; a++) for (let s = 0; s < 9; s++) { const an = -Math.PI + a * 0.62; P.set(tx + Math.cos(an) * s, ty + Math.sin(an) * s * 0.5 + s * s * 0.06, '#3a1450'); }
    void base;
  }
  return P.done();
}
export function mesas(w, h) {
  const P = pix(w, h);
  const peaks = Array.from({ length: 14 }, (_, i) => ({ x: i * (w / 14) + hash(i + 70) * 60, top: 20 + hash(i + 71) * 50, half: 30 + hash(i + 72) * 60 }));
  for (let x = 0; x < w; x++) {
    let top = h;
    for (const p of peaks) {
      for (const off of [-w, 0, w]) {
        const d = Math.abs(x - p.x - off);
        if (d < p.half) top = Math.min(top, p.top + (d > p.half - 10 ? (d - (p.half - 10)) * 3 : 0));
      }
    }
    for (let y = Math.round(top); y < h; y++) {
      const v = (y - top) / (h - top + 1);
      let c = v < 0.05 ? '#ff8a5a' : (x + y) % 2 && v < 0.12 ? '#e85a4a' : '#8a2a5a';
      if (v > 0.5 && bayer(x, y) < (v - 0.5) * 1.6) c = '#5a1a52';
      P.set(x, y, c);
    }
  }
  return P.done();
}
export const PALETTE = { INK, GLASS, CHROME, TIRE };
