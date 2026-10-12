// POKéREMY pixel art: battle back-sprites derived from the committed quest sprites (face repainted as the back of
// the head), plus every procedural tile, prop and background. Built once in prepare(); deterministic (hash only).
import { hash } from 'filmkit/lib.js';
import { canvas } from '../remy-bros/art.js';

export { canvas };
const MEDIA = new URL('../../media/quest/', import.meta.url);
export const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;

export async function loadImg(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}
export const loadAtlas = (name) => loadImg(new URL(name, MEDIA).href);
export function atlasCell(atlas, i, k = 1) {
  const c = canvas(16 * k, 16 * k), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(atlas, (i % 67) * 16, Math.floor(i / 67) * 16, 16, 16, 0, 0, 16 * k, 16 * k);
  return c;
}

export function pixels(w, h) {
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
  return { c, set, done, w, h, d };
}

// White (or any colour) silhouette of a canvas.
export function tint(src, col) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = col;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}
// Integer nearest upscale.
export function upscale(src, k) {
  const c = canvas(src.width * k, src.height * k), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

// ---------- back sprites ----------
// R: loadRemy() result. cfg: { chin (last hair row), xMin (head starts here; sword/arm columns left of it are kept),
// keep (rows ≤ keep untouched, e.g. a hat), hair (hex), crop (last row kept: waist) }.
// The head blob from R.top..chin is repainted as hair seen from behind (strands, crown shine, nape), the shirt
// print is flattened into the shirt colour, and the result is mirrored (the sword hand swaps sides).
export function backSprite(R, cfg) {
  const w = R.w, h = R.h, src = R.c.getContext('2d').getImageData(0, 0, w, h).data;
  const P = pixels(w, cfg.crop + 1);
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
  const px = (x, y) => { const i = (y * w + x) * 4; return [src[i], src[i + 1], src[i + 2]]; };
  const lum = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const hairC = rgb(cfg.hair), shirtC = rgb(cfg.shirt), skinC = rgb(cfg.skin);
  // hair shades sampled from the sprite's own hair pixels, darkest → brightest
  const samples = [];
  for (let y = R.top; y <= cfg.chin; y++) for (let x = cfg.xMin; x < w; x++) if (A(x, y) > 0 && dist(px(x, y), hairC) < 70) samples.push(px(x, y));
  samples.sort((a, b) => lum(a) - lum(b));
  const q = (f) => samples[Math.min(samples.length - 1, Math.floor(f * samples.length))] ?? hairC;
  const shades = [q(0.04), q(0.25), q(0.55), q(0.85), q(0.97).map((v) => Math.min(255, Math.round(v * 1.22 + 8)))];
  const ink = [29, 20, 26];
  // per-row extents of the head blob (from xMin)
  const L = [], Rr = [];
  for (let y = 0; y < h; y++) {
    let l = -1, r = -1;
    for (let x = cfg.xMin; x < w; x++) if (A(x, y) > 0) { if (l < 0) l = x; r = x; }
    L[y] = l; Rr[y] = r;
  }
  const headH = cfg.chin - R.top;
  for (let y = 0; y <= cfg.crop; y++) {
    for (let x = 0; x < w; x++) {
      if (A(x, y) === 0) continue;
      const o = px(x, y);
      let col = o;
      // ragged nape: strand tips end 1 row above to 1 row below the chin line
      const napeY = cfg.chin + Math.floor(h2(Math.floor(x / 2), 7) * 3) - 1;
      const head = y >= R.top && y <= napeY && x >= cfg.xMin && y > cfg.keep;
      if (head) {
        const edge = A(x - 1, y) === 0 || A(x + 1, y) === 0 || A(x, y - 1) === 0 || x === cfg.xMin;
        if (edge) col = ink;
        else if (y === napeY) col = shades[0];
        else {
          const u = (y - R.top) / headH;
          const dl = x - L[y], dr = Rr[y] - x, dm = Math.min(dl, dr);
          const sx = x + Math.round(Math.sin(y * 0.35 + x * 0.1) * 1.2);
          const strand = h2(Math.floor(sx / 2), 3);
          let k = 2 + (strand > 0.72 ? 1 : strand < 0.22 ? -1 : 0);
          const cx = (L[y] + Rr[y]) / 2, rel = (x - cx) / Math.max(1, (Rr[y] - L[y]) / 2);
          // crown shine: an anime halo band, brighter toward the lit (left) side
          const band = Math.abs(u - 0.26 - rel * rel * 0.06) < 0.055;
          if (band && strand > 0.3) k = rel < 0.3 ? 4 : 3;
          if (u < 0.08) k = Math.max(k, 3);
          if (dm <= 1) k = Math.min(k, 1);
          if (rel > 0.55) k -= 1; // shadow side
          if (u > 0.82) k -= 1;
          // dark parting strands
          if (h2(Math.floor(sx / 2), 9) > 0.86 && u > 0.35) k = Math.min(k, 1);
          col = shades[Math.max(0, Math.min(4, k))];
        }
      } else if (y > cfg.chin + 2 && x >= cfg.xMin) {
        // torso: flatten the print into the shirt colour, keep outline, skin and the darkest seams
        const edge = A(x - 1, y) === 0 || A(x + 1, y) === 0 || A(x, y - 1) === 0;
        const d = dist(o, shirtC), ds = dist(o, skinC);
        if (!edge && d > 44 && ds > 40 && lum(o) > 40) {
          const k = h2(x, y, 5) * 0.06 + (x - (L[y] + Rr[y]) / 2) / Math.max(1, Rr[y] - L[y]) * -0.25;
          col = shirtC.map((v) => Math.max(0, Math.min(255, Math.round(v * (1 + k)))));
        }
      }
      P.set(x, y, col);
    }
  }
  const c = P.done();
  // mirror: seen from behind
  const m = canvas(c.width, c.height), mx = m.getContext('2d');
  mx.translate(c.width, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0);
  return m;
}

// ---------- blob shading ----------
export function blob(w, h, circles, shades, { outline = true, flatBottom = false, seams = null } = {}) {
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
      if (seams) { const up = at(x, y - 1); if (up >= 0 && up !== i && circles[up][1] < cy) col = seams; }
      P.set(x, y, edge ? shades[0] : col);
    }
  return P.done();
}

// ---------- GBC palette ----------
export const GB = {
  ink: '#181828', paper: '#f8f8f0', cream: '#f8f0d0',
  ui: '#283058', uiHi: '#7888c8', uiLo: '#101830',
  hpG: '#40c838', hpGHi: '#a8f878', hpY: '#f8b800', hpYHi: '#fff070', hpR: '#f83820', hpRHi: '#ff9880',
  exp: '#3888f8', expHi: '#a8d0ff',
  hair: '#893c3b', hairHi: '#d06a5a', hairLo: '#4a1a1e',
};

// ---------- battle background (640 × 264 field) ----------
export function battleBg(w, h) {
  const P = pixels(w, h);
  const sky = [[0, '#b8e0f8'], [0.32, '#d8f0f8'], [0.55, '#f0f8e8']].map(([p, c]) => [p, rgb(c)]);
  const lerpC = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
  const HZ = 128; // horizon
  // distant tree line (bumps) and hills
  const ridge = (x) => HZ - 10 - 9 * Math.abs(Math.sin(x * 0.045 + 1)) - 6 * Math.abs(Math.sin(x * 0.11)) - 4 * h2(Math.floor(x / 6), 1);
  const hill = (x) => HZ - 18 - 20 * Math.sin(x * 0.006 + 0.6) - 8 * Math.sin(x * 0.017);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let c;
      if (y < HZ) {
        const v = y / HZ * 0.55, bands = 10, qv = v * bands / 0.55, b0 = Math.floor(qv);
        const pk = (qv - b0) > bay(x, y) ? b0 + 1 : b0;
        const p = Math.min(0.55, (pk / bands) * 0.55);
        let k = 0;
        while (k < sky.length - 2 && p > sky[k + 1][0]) k++;
        c = lerpC(sky[k][1], sky[k + 1][1], (p - sky[k][0]) / (sky[k + 1][0] - sky[k][0]));
        if (y >= hill(x)) c = rgb((y - hill(x)) < 2 ? '#88c8a0' : '#a8d8b0');
        if (y >= ridge(x)) {
          const top = y - ridge(x) < 1.5;
          c = rgb(top ? '#3a8a58' : (h2(Math.floor(x / 3), Math.floor(y / 3), 4) > 0.8 ? '#5aa870' : '#4a9a64'));
        }
      } else {
        // meadow: banded greens that brighten toward the viewer, with dithered transitions and blade flecks
        const v = (y - HZ) / (h - HZ);
        const cols = ['#78b850', '#88c858', '#98d060', '#a8d868'].map(rgb);
        const qv = v * 3, b0 = Math.floor(qv), pick = qv - b0 > bay(x, y) ? Math.min(3, b0 + 1) : b0;
        c = cols[pick];
        const fl = h2(x, y, 8);
        if (fl > 0.985) c = rgb('#c8f090');
        else if (fl < 0.012 + v * 0.01) c = rgb('#60a040');
        // grass tufts
        const tx = Math.floor(x / 23), ty = Math.floor(y / 17);
        const tuft = h2(tx, ty, 11);
        if (tuft > 0.7) {
          const ox = tx * 23 + Math.floor(h2(tx, ty, 12) * 16), oy = ty * 17 + 10;
          const dx = x - ox, dy = oy - y;
          if (dy >= 0 && dy < 4 && (dx === 0 || dx === 2 || dx === 4) && dy < (dx === 2 ? 4 : 3)) c = rgb('#4e9038');
        }
      }
      P.set(x, y, c);
    }
  return P.done();
}

// Platform: an elliptical grass pad with a dark rim and dithered light.
export function platform(rx, ry) {
  const w = rx * 2 + 2, h = ry * 2 + 8;
  const P = pixels(w, h);
  const cx = w / 2, cy = ry + 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      const r = nx * nx + ny * ny;
      // side wall (earth) under the top ellipse
      const ny2 = (y + 0.5 - cy - 6) / ry;
      const r2 = nx * nx + ny2 * ny2;
      if (r <= 1) {
        const lit = -nx * 0.4 - ny * 0.9;
        let c = lit > 0.35 + bay(x, y) * 0.3 ? '#b8e888' : lit > -0.3 + bay(x, y) * 0.3 ? '#88c860' : '#68a848';
        if (r > 0.86) c = '#3a7838';
        if (r > 0.95) c = '#24502c';
        if (h2(x, y, 2) > 0.975 && r < 0.8) c = '#e0f8b8';
        P.set(x, y, c);
      } else if (r2 <= 1 && y > cy) {
        P.set(x, y, r2 > 0.9 ? '#2a1c18' : (y - cy) % 3 === 0 && h2(x, 1) > 0.5 ? '#7a5030' : '#946038');
      }
    }
  return P.done();
}

// ---------- props ----------
// REMY BALL: crimson top with a little hair curl, white bottom, black band, button. rot frames 0..3 (quarter turns of the curl).
export function ball(frame = 0) {
  const s = 14, P = pixels(s, s + 4), c = s / 2, oy = 4;
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (d > c) continue;
      let col = y < c - 1 ? '#d83838' : y > c ? '#f0f0f0' : '#181828';
      if (y < c - 1 && x + y < 7) col = '#ff8a78';
      if (y > c && x + y > 19) col = '#b8b8c8';
      if (d > c - 1) col = '#181828';
      const bd = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (bd < 2.6) col = bd < 1.6 ? '#ffffff' : '#181828';
      P.set(x, y + oy, col);
    }
  // hair curl on top
  const curls = [[[6, 3], [7, 2], [8, 1], [9, 1], [10, 2]], [[5, 2], [6, 1], [7, 1], [8, 2], [8, 3]], [[7, 3], [7, 2], [6, 1], [5, 1], [4, 2]], [[8, 3], [7, 1], [7, 2], [6, 2], [6, 3]]][frame % 4];
  for (const [x, y] of curls) { P.set(x, y, '#893c3b'); P.set(x, y - 1 < 0 ? 0 : y - 1, '#d06a5a', y - 1 < 0 ? 0 : 255); }
  return P.done();
}

// Shampoo bottle, 16×28.
export function bottle() {
  const c = canvas(16, 28), x = c.getContext('2d');
  const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  R(5, 0, 6, 2, '#181828'); R(6, 0, 4, 1, '#f8f8f0');
  R(4, 2, 8, 5, '#181828'); R(5, 2, 6, 4, '#f070b0'); R(5, 2, 2, 4, '#ffb0d8');
  R(1, 7, 14, 21, '#181828'); R(2, 8, 12, 19, '#f890c8'); R(2, 8, 3, 19, '#ffc8e4'); R(11, 8, 3, 19, '#d05898');
  R(3, 12, 10, 10, '#f8f8f0'); R(3, 12, 10, 1, '#d8d0e8');
  R(4, 14, 8, 2, '#3888f8'); R(5, 17, 6, 1, '#f070b0'); R(5, 19, 4, 1, '#b0b0c8');
  return c;
}

// A bubble of radius r (canvas size 2r+2).
export function bubble(r) {
  const s = r * 2 + 2, P = pixels(s, s), c = s / 2;
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (d > r) continue;
      let col = '#d8f0ff', a = 150;
      if (d > r - 1.2) { col = '#5888d8'; a = 255; }
      else if (d > r - 2.2 && x + y > s) { col = '#f8b0e0'; a = 220; }
      const hx = c - r * 0.4, hy = c - r * 0.4;
      if (Math.hypot(x + 0.5 - hx, y + 0.5 - hy) < Math.max(1, r * 0.28)) { col = '#ffffff'; a = 255; }
      P.set(x, y, col, a);
    }
  return P.done();
}

// ---------- overworld tiles (16 × 16) ----------
export function groundTile(seed) {
  const P = pixels(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let c = '#a8e078';
    const r = h2(x, y, seed);
    if (r > 0.93) c = '#88c860';
    if ((x === 3 || x === 11) && (y === 4 || y === 12) && seed % 2) c = '#78b850';
    P.set(x, y, c);
  }
  return P.done();
}
export function pathTile(seed) {
  const P = pixels(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let c = '#f0d8a0';
    const r = h2(x, y, seed + 20);
    if (r > 0.94) c = '#c8a868';
    else if (r < 0.04) c = '#fff0c8';
    P.set(x, y, c);
  }
  return P.done();
}
// Tall grass, GSC style: two rows of W-shaped tufts. sway: 0 / 1 frames; rustle: blades parted.
export function tallGrass(sway = 0) {
  const P = pixels(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P.set(x, y, '#58b040');
  const tuft = (ox, oy) => {
    const s = sway ? 1 : 0;
    for (let k = 0; k < 3; k++) {
      const bx = ox + k * 3;
      for (let j = 0; j < 6; j++) {
        const lean = k === 0 ? -1 : k === 2 ? 1 : 0;
        const xx = bx + Math.round((lean * (5 - j)) / 4) + (j < 2 ? s : 0), yy = oy + j;
        P.set(xx, yy, j < 2 ? '#c0f080' : j < 4 ? '#287828' : '#184818');
        if (j > 1) P.set(xx + 1, yy, '#388c30');
      }
    }
  };
  tuft(0, 1); tuft(8, 1); tuft(4, 9); tuft(12, 9); tuft(-4, 9);
  return P.done();
}
export function tree() {
  // 32 × 32: round canopy over a stubby trunk (overworld border tree)
  const c = canvas(32, 32), x = c.getContext('2d');
  x.drawImage(blob(32, 28, [[16, 11, 11], [8, 17, 8], [24, 17, 8], [16, 19, 9]], ['#183818', '#286828', '#388838', '#58b048', '#90d870'], { seams: '#286828' }), 0, 0);
  x.fillStyle = '#183818'; x.fillRect(12, 25, 8, 7);
  x.fillStyle = '#7a4a28'; x.fillRect(13, 25, 6, 6);
  x.fillStyle = '#a06838'; x.fillRect(13, 25, 2, 6);
  return c;
}
export function flower(frame) {
  const P = pixels(8, 8);
  const pts = frame ? [[3, 1], [1, 3], [5, 3], [3, 5]] : [[2, 1], [4, 1], [1, 4], [5, 4]];
  for (const [a, b] of pts) { P.set(a, b, '#f84858'); P.set(a + 1, b, '#f84858'); P.set(a, b + 1, '#c82838'); P.set(a + 1, b + 1, '#f84858'); }
  P.set(3, 3, '#fff070'); P.set(4, 3, '#fff070'); P.set(3, 4, '#f8c020'); P.set(4, 4, '#fff070');
  return P.done();
}
export function sign() {
  const c = canvas(16, 16), x = c.getContext('2d');
  const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  R(7, 9, 2, 7, '#5a3820'); R(1, 1, 14, 9, '#3a2010'); R(2, 2, 12, 7, '#c88848'); R(2, 2, 12, 1, '#e8b070');
  R(4, 4, 8, 1, '#5a3820'); R(4, 6, 6, 1, '#5a3820');
  return c;
}
export function ledge() {
  const P = pixels(16, 6);
  for (let x = 0; x < 16; x++) {
    P.set(x, 0, '#88c860'); P.set(x, 1, '#286828'); P.set(x, 2, '#184818');
    for (let y = 3; y < 6; y++) P.set(x, y, (x + y) % 4 === 0 ? '#78b850' : '#a8e078');
  }
  return P.done();
}
