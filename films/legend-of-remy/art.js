// Pixel art for THE LEGEND OF REMY: 3/4 top-down overworld + dungeon, all procedural and deterministic,
// generated once in prepare() at the game's native 960×540. The Remy rig comes from ../remy-bros/art.js.
import { hash } from 'filmkit/lib.js';
import { canvas, loadRemy, drawRemy, loadHeads, headIcon } from '../remy-bros/art.js';

export { canvas, loadRemy, drawRemy, loadHeads, headIcon };

export const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;
function vn(x, y, s = 0) { // value noise 2D, smooth
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
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
  const get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  const done = () => (ctx.putImageData(img, 0, 0), c);
  return { c, set, get, done, w, h, d };
}

// circles: [[cx, cy, r]]; shades: [outline, shadow, base, light, highlight]
export function blob(w, h, circles, shades, { outline = true, flatBottom = false, seams = null, tex = 0, seed = 0 } = {}) {
  w = Math.round(w); h = Math.round(h);
  const P = pixels(w, h);
  const m = new Int16Array(w * h).fill(-1);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let best = -1, bi = -1;
      const yy = flatBottom && y >= h - 1 ? h - 2 : y;
      for (let i = 0; i < circles.length; i++) {
        const [cx, cy, r] = circles[i], d = Math.hypot(x + 0.5 - cx, yy + 0.5 - cy);
        if (d < r && 1 - d / r > best) { best = 1 - d / r; bi = i; }
      }
      m[y * w + x] = bi;
    }
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : m[y * w + x]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = m[y * w + x];
      if (i < 0) continue;
      const [cx, cy, r] = circles[i];
      const nx = (x + 0.5 - cx) / r, ny = (y + 0.5 - cy) / r;
      let l = -0.55 * nx - 0.8 * ny + (h2(x, y, 3 + seed) - 0.5) * 0.12;
      if (tex) l += (vn(x / 4, y / 4, seed + 9) - 0.5) * tex;
      const edge = outline && (at(x - 1, y) < 0 || at(x + 1, y) < 0 || at(x, y - 1) < 0 || (!flatBottom && at(x, y + 1) < 0));
      let col = l > 0.62 ? shades[4] : l > 0.18 ? shades[3] : l > -0.38 ? shades[2] : shades[1];
      if (seams) { const up = at(x, y - 1); if (up >= 0 && up !== i && circles[up][1] < cy) col = seams; }
      P.set(x, y, edge ? shades[0] : col);
    }
  return P.done();
}

// ---------- palette ----------
export const PAL = {
  ink: '#141020',
  grass: '#5aae3e', grassLo: '#3f8f34', grassHi: '#7cc858', grassDk: '#2e6e2a', grassPale: '#9ee070',
  path: '#d6b67a', pathLo: '#b48c52', pathHi: '#ecd29a', pathDk: '#8a6438',
  water: '#3a7ad8', waterDk: '#2b5fbc', waterHi: '#7cbcf4', foam: '#e6f6ff', sand: '#e6dcae', sandDk: '#b8a874',
  cliff: '#a8784c', cliffHi: '#d0a06a', cliffLo: '#7a5034', cliffDk: '#4e3020',
  rock: ['#2a2a38', '#5e5e72', '#8c8ca2', '#b8b8cc', '#e2e2f0'],
  leaf: ['#123a1e', '#23663a', '#348a44', '#56ae52', '#8ed472'],
  bush: ['#123a1e', '#2c7a34', '#41a046', '#68c45a', '#a6e888'],
};

// ---------- overworld screen backgrounds ----------
// def: { seed, cliff: [y0, y1] | null, water: [[cx, cy, rx, ry]], path: [{ x0, x1, y, w } | { x, y0, y1, w }], trees, rocks, bushes, flowers, extra(ctx) }
export function overworld(def) {
  const W = 960, H = 440, P = pixels(W, H), s = def.seed;
  const inWater = (x, y) => {
    let v = 1e9;
    for (const [cx, cy, rx, ry] of def.water) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry) - (vn(x / 18, y / 18, s + 3) - 0.5) * 0.18;
      v = Math.min(v, (d - 1) * Math.min(rx, ry));
    }
    return v; // <0 inside, distance-ish in px
  };
  const pathD = (x, y) => {
    let v = 1e9;
    for (const p of def.path) {
      const n = (vn(x / 14, y / 14, s + 5) - 0.5) * 8;
      if (p.y != null) { if (x >= p.x0 - 20 && x <= p.x1 + 20) v = Math.min(v, Math.abs(y - p.y) - p.w + n + Math.max(0, p.x0 - x, x - p.x1)); }
      else if (y >= p.y0 - 20 && y <= p.y1 + 20) v = Math.min(v, Math.abs(x - p.x) - p.w + n + Math.max(0, p.y0 - y, y - p.y1));
    }
    return v;
  };
  const cl = def.cliff;
  const cliffBot = (x) => cl ? cl[1] + Math.round(3 * Math.sin(x * 0.05 + s) + 2 * Math.sin(x * 0.13)) : -1;
  const cliffTop = (x) => cl ? cl[0] + Math.round(2 * Math.sin(x * 0.07 + s * 2)) : -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let c;
      const cb = cliffBot(x), ct = cliffTop(x);
      if (cl && y < ct) {
        // plateau grass (a touch darker), lip
        c = vn(x / 22, y / 22, s + 1) + bay(x, y) * 0.3 > 0.85 ? PAL.grassLo : PAL.grass;
        if (h2(x >> 2, y >> 2, s) > 0.86 && (x & 3) === 1 && (y & 3) < 2) c = PAL.grassDk;
        if (y >= ct - 3) c = y === ct - 1 ? PAL.cliffDk : PAL.grassHi;
      } else if (cl && y < cb) {
        // 3/4 cliff face: strata, vertical cracks, lit top, shaded base
        const fy = (y - ct) / (cb - ct);
        const strata = Math.floor((y - ct + Math.round(3 * Math.sin(x * 0.09 + s))) / 9);
        const crack = (x + strata * 13 + Math.floor(h2(strata, 0, s) * 40)) % 37;
        c = fy < 0.14 ? PAL.cliffHi : PAL.cliff;
        if (crack < 2) c = PAL.cliffLo;
        if (crack === 2 && fy > 0.14) c = PAL.cliffHi;
        if ((y - ct + Math.round(3 * Math.sin(x * 0.09 + s))) % 9 === 0 && fy > 0.14) c = PAL.cliffLo;
        if (fy > 0.8) c = bay(x, y) < (fy - 0.8) * 5 ? PAL.cliffDk : c === PAL.cliffHi ? PAL.cliff : c;
        if (h2(x, y, s + 11) > 0.95) c = PAL.cliffLo;
      } else {
        const wd = inWater(x, y), pd = pathD(x, y);
        if (wd < 0) {
          const depth = -wd;
          c = depth < 3 ? PAL.waterHi : depth < 5 ? PAL.water : vn(x / 30, y / 12, s + 7) + bay(x, y) * 0.35 > 0.75 ? PAL.waterDk : PAL.water;
          if (depth > 6 && ((x + Math.round(4 * Math.sin(y * 0.4))) % 23 === 0) && y % 6 === 0) c = PAL.waterHi;
        } else if (wd < 3) c = wd < 1.2 ? PAL.sandDk : PAL.sand;
        else if (pd < 0) {
          c = PAL.path;
          if (pd > -3) c = bay(x, y) < 0.5 ? PAL.pathLo : PAL.path;
          else if (h2(x, y, s + 4) > 0.94) c = PAL.pathLo;
          else if (h2(x, y, s + 6) > 0.95) c = PAL.pathHi;
          // pebbles
          const px = x >> 3, py = y >> 3;
          if (h2(px, py, s + 8) > 0.9 && pd < -4) { const lx = (x & 7) - 3, ly = (y & 7) - 3; if (lx * lx + ly * ly * 1.5 < 4) c = lx + ly < 0 ? PAL.pathHi : PAL.pathDk; }
        } else {
          // grass: base tone with sparse soft patches + regular tuft marks on a grid
          const n = vn(x / 16, y / 16, s + 2);
          c = n + bay(x, y) * 0.22 > 0.9 ? PAL.grassHi : n + bay(x, y) * 0.22 < 0.18 ? PAL.grassLo : PAL.grass;
          const cx = x >> 3, cy = y >> 3, lx = x & 7, ly = y & 7;
          if (h2(cx, cy, s) > 0.6) {
            const ox = Math.floor(h2(cx, cy, s + 1) * 3);
            if ((ly === 5 && (lx === 1 + ox || lx === 3 + ox)) || (ly === 4 && lx === 2 + ox)) c = PAL.grassDk;
            if (ly === 3 && lx === 2 + ox) c = PAL.grassHi;
          }
          if (pd < 3 && bay(x, y) > 0.6) c = PAL.pathLo;
          // cast shadow under the cliff
          if (cl && y < cb + 7 && y >= cb) c = bay(x, y) < 1 - (y - cb) / 7 ? PAL.grassDk : c;
        }
      }
      P.set(x, y, c);
    }
  const c = P.done(), x = c.getContext('2d');
  return c;
}

// ---------- objects ----------
export function tree(seed, w = 84) {
  const h = Math.round(w * 1.12), c = canvas(w, h), x = c.getContext('2d');
  // trunk + roots
  const tw = Math.round(w * 0.2), tx = Math.round(w / 2 - tw / 2), ty = Math.round(h * 0.62);
  const tr = pixels(w, h);
  for (let y = ty; y < h - 2; y++) {
    const flare = Math.max(0, y - (h - 12)) * 0.9;
    for (let xx = Math.round(tx - flare); xx < Math.round(tx + tw + flare); xx++) {
      const u = (xx - (tx - flare)) / (tw + flare * 2);
      let col = u < 0.25 ? '#a8703c' : u < 0.7 ? '#7c4c26' : '#54321a';
      if ((xx * 3 + Math.floor(y / 4)) % 7 === 0) col = '#54321a';
      if (xx === Math.round(tx - flare) || xx === Math.round(tx + tw + flare) - 1 || y === h - 3) col = PAL.ink;
      tr.set(xx, y, col);
    }
  }
  x.drawImage(tr.done(), 0, 0);
  const cs = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(seed) * 2, r = w * (0.2 + 0.05 * hash(seed + i));
    cs.push([w / 2 + Math.cos(a) * w * 0.26, h * 0.38 + Math.sin(a) * h * 0.2, r]);
  }
  cs.push([w / 2, h * 0.36, w * 0.3]);
  x.drawImage(blob(w, Math.round(h * 0.74), cs, PAL.leaf, { tex: 0.5, seed, seams: PAL.leaf[1] }), 0, 0);
  return c;
}
export function boulder(seed, w = 40) {
  const h = Math.round(w * 0.8), cs = [[w * 0.5, h * 0.55, w * 0.42], [w * 0.32, h * 0.62, w * 0.3], [w * 0.68, h * 0.6, w * 0.3]];
  const c = blob(w, h, cs, PAL.rock, { seed, flatBottom: true, tex: 0.3 });
  const x = c.getContext('2d');
  x.fillStyle = PAL.rock[1];
  const k = Math.round(w * 0.45 + hash(seed) * 6);
  x.fillRect(k, Math.round(h * 0.3), 1, Math.round(h * 0.2)); x.fillRect(k + 1, Math.round(h * 0.5), 1, 3);
  return c;
}
export function bush(seed, w = 40) {
  const h = Math.round(w * 0.78), cs = [];
  for (let i = 0; i < 4; i++) cs.push([w * (0.25 + 0.17 * i), h * (0.6 - 0.12 * Math.sin((i / 3) * Math.PI)), w * (0.24 + 0.04 * hash(seed + i))]);
  cs.push([w * 0.5, h * 0.42, w * 0.28]);
  const c = blob(w, h, cs, PAL.bush, { seed, flatBottom: true, tex: 0.35, seams: PAL.bush[1] });
  return c;
}
// tall grass tuft: frame k (sway), cut = stubble
export function tuft(k, cut = false) {
  const w = 34, h = 30, P = pixels(w, h);
  const blades = [[4, 16], [9, 24], [14, 20], [17, 27], [21, 22], [26, 25], [30, 16]];
  for (const [bx, bh0] of blades) {
    const bh = cut ? 5 + (bx % 3) : bh0;
    const lean = cut ? 0 : (bx - 17) * 0.18 + (k ? 1.5 : -0.5);
    for (let i = 0; i < bh; i++) {
      const y = h - 1 - i, u = i / bh, xx = Math.round(bx + lean * u * u * 2);
      const wd = u < 0.6 ? 3 : u < 0.88 ? 2 : 1;
      for (let j = 0; j < wd; j++) P.set(xx + j - 1, y, j === 0 ? '#a6e878' : j === wd - 1 ? '#3a9a3a' : '#66c84e');
      P.set(xx - 2, y, '#1a4a1e'); P.set(xx + wd - 1, y, '#1a4a1e');
      if (i === bh - 1) P.set(xx - 1, y - 1, '#1a4a1e');
    }
  }
  if (cut) for (let xx = 2; xx < 32; xx++) if (h2(xx, 0, 7) > 0.4) P.set(xx, h - 1, '#2a6a26');
  return P.done();
}
export function flower(k, col) {
  const P = pixels(9, 9), o = k ? 1 : 0;
  for (const [dx, dy] of [[0, -2], [-2, 0], [2, 0], [0, 2]]) { P.set(4 + dx + o, 4 + dy, col); P.set(4 + dx + o + (dx ? 0 : 1), 4 + dy + (dy ? 0 : 1), col); }
  P.set(4 + o, 4, '#ffe24a'); P.set(5 + o, 5, '#ffe24a');
  P.set(4, 8, '#2e6e2a'); P.set(4, 7, '#2e6e2a');
  return P.done();
}
export function lily() {
  const c = blob(18, 12, [[9, 6, 8]], ['#1a4a2a', '#2c7a34', '#41a046', '#68c45a', '#a6e888'], {});
  const x = c.getContext('2d'); x.clearRect(9, 1, 3, 5);
  return c;
}

// dungeon entrance carved into the cliff: stone facade, bald-head emblem, dark arch
export function facade() {
  const w = 168, h = 132, P = pixels(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const inner = x >= 8 && x < w - 8;
      if (!inner && y < 12) continue;
      const row = Math.floor(y / 10), bx = (x + (row & 1 ? 10 : 0)) % 20, by = y % 10;
      let c = '#8a86a8';
      if (by === 9 || bx === 19) c = '#3e3a58';
      else if (by === 0 || bx === 0) c = '#bab6d4';
      else if (h2(x, y, 21) > 0.9) c = '#76729a';
      if (y < 12) c = y < 3 ? '#d8d4ee' : y === 11 ? '#3e3a58' : '#a8a4c6';
      if (x === 0 || x === w - 1 || (x === 7 && y < 12) || (x === w - 8 && y < 12) || y === 0) c = PAL.ink;
      // pillars
      for (const px of [22, w - 38]) if (x >= px && x < px + 16 && y > 18) { const u = (x - px) / 16; c = u < 0.2 ? '#e0dcf4' : u < 0.7 ? '#a8a4c6' : '#5e5a80'; if (x === px || x === px + 15) c = PAL.ink; if ((y - 18) % 26 < 3) c = '#4a4668'; }
      P.set(x, y, c);
    }
  // arch doorway
  const dw = 52, dh = 70, dx = w / 2 - dw / 2, dy = h - dh;
  for (let y = 0; y < dh; y++)
    for (let x = 0; x < dw; x++) {
      const nx = (x + 0.5 - dw / 2) / (dw / 2), ny = (y - dw / 2) / (dw / 2);
      if (y < dw / 2 && nx * nx + ny * ny > 1) continue;
      const edge = y < dw / 2 ? nx * nx + ny * ny > 0.8 : Math.abs(nx) > 0.88;
      P.set(dx + x, dy + y, edge ? '#2a2640' : y > dh - 6 ? '#0c0a14' : '#06040c');
    }
  // steps
  for (let i = 0; i < 2; i++) for (let x = dx - 6 + i * 3; x < dx + dw + 6 - i * 3; x++) { P.set(x, h - 1 - i * 3, PAL.ink); P.set(x, h - 2 - i * 3, '#bab6d4'); P.set(x, h - 3 - i * 3, '#8a86a8'); }
  const c = P.done(), x = c.getContext('2d');
  // bald emblem above the arch: shiny dome, frowning eyes
  const ex = w / 2, ey = 30;
  x.fillStyle = PAL.ink; x.beginPath(); x.arc(ex, ey, 17, 0, 7); x.fill();
  x.fillStyle = '#c8b8a0'; x.beginPath(); x.arc(ex, ey, 15, 0, 7); x.fill();
  x.fillStyle = '#9a8870'; x.beginPath(); x.arc(ex + 3, ey + 4, 12, 0, 7); x.fill();
  x.fillStyle = '#c8b8a0'; x.beginPath(); x.arc(ex - 1, ey - 1, 11, 0, 7); x.fill();
  x.fillStyle = '#fff6e0'; x.fillRect(ex - 9, ey - 10, 5, 3); x.fillRect(ex - 10, ey - 7, 2, 3);
  x.fillStyle = PAL.ink; x.fillRect(ex - 8, ey + 1, 5, 4); x.fillRect(ex + 3, ey + 1, 5, 4); x.fillRect(ex - 9, ey - 1, 6, 1); x.fillRect(ex + 3, ey - 1, 6, 1);
  x.fillRect(ex - 4, ey + 9, 8, 2);
  return c;
}

// ---------- dungeon rooms ----------
// pal: { top, face, faceLo, faceHi, side, floor, floorLo, floorHi, ink }
export function room(pal, { doorN = true, doorS = true, seed = 0, carpet = null } = {}) {
  const W = 960, H = 440, P = pixels(W, H);
  const T = 84, S = 44, B = 40; // wall thickness top / side / bottom
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let c;
      const inFloor = x >= S && x < W - S && y >= T && y < H - B;
      if (inFloor) {
        // floor tiles 40×40 with bevel + diamond inlay
        const fx = (x - S) % 40, fy = (y - T) % 40;
        c = pal.floor;
        if (fx === 0 || fy === 0) c = pal.floorLo;
        else if (fx === 1 || fy === 1) c = pal.floorHi;
        else if (Math.abs(fx - 20) + Math.abs(fy - 20) === 12) c = pal.floorLo;
        else if (h2(x, y, seed) > 0.94) c = pal.floorLo;
        if (carpet && x >= carpet[0] && x < carpet[1] && y >= T) { c = (fx + fy) % 8 < 1 ? '#5a1424' : '#8a1e34'; if (x - carpet[0] < 4 || carpet[1] - x <= 4) c = '#e8b040'; }
        // ambient occlusion near walls
        const ao = Math.min(x - S, W - S - 1 - x, (y - T) * 0.7, H - B - 1 - y);
        if (ao < 10 && bay(x, y) * 10 > ao) c = pal.floorLo;
        if (ao < 3) c = pal.ink;
      } else {
        // walls: top band = wall tops (light), then 3/4 brick face (top wall), bevelled sides
        const top = y < 16 || x < 14 || x >= W - 14 || y >= H - 12;
        if (top) {
          c = pal.top;
          if (h2(x >> 1, y >> 1, seed + 3) > 0.9) c = pal.faceHi;
          if (y === 15 && x >= 14 && x < W - 14) c = pal.ink;
          if (x === 13 && y >= 15 && y < H - 12) c = pal.ink;
          if (x === W - 14 && y >= 15 && y < H - 12) c = pal.ink;
          if (y === H - 12 && x >= 13 && x <= W - 14) c = pal.ink;
        } else if (y < T) {
          const row = Math.floor((y - 16) / 12), bx = (x + (row & 1 ? 14 : 0)) % 28, by = (y - 16) % 12;
          c = pal.face;
          if (by === 11 || bx === 27) c = pal.faceLo;
          else if (by === 0 || bx === 0) c = pal.faceHi;
          if (y > T - 8) c = bay(x, y) < (y - (T - 8)) / 8 ? pal.ink : c;
        } else {
          // side / bottom walls in perspective
          const d = x < S ? x - 14 : x >= W - S ? W - 15 - x : y - (H - B);
          const row = Math.floor(d / 10);
          c = row % 2 ? pal.side : pal.face;
          if (d % 10 === 0) c = pal.faceLo;
          if (x >= S && x < W - S) { const bx = (x + (Math.floor((y - (H - B)) / 10) & 1 ? 14 : 0)) % 28; if (bx === 0) c = pal.faceLo; }
          else { const by = (y + (Math.floor(d / 10) & 1 ? 14 : 0)) % 28; if (by === 0) c = pal.faceLo; }
        }
      }
      P.set(x, y, c);
    }
  const c = P.done(), x = c.getContext('2d');
  const door = (cx, north) => {
    if (north) {
      x.fillStyle = pal.ink; x.fillRect(cx - 34, 6, 68, T - 4);
      x.fillStyle = pal.faceHi; x.fillRect(cx - 32, 8, 64, 6);
      x.fillStyle = '#05040a'; x.fillRect(cx - 26, 18, 52, T - 16);
      x.fillStyle = pal.top; x.fillRect(cx - 34, 10, 6, T - 10); x.fillRect(cx + 28, 10, 6, T - 10);
      x.fillStyle = pal.ink; x.fillRect(cx - 28, 14, 2, T - 12); x.fillRect(cx + 26, 14, 2, T - 12);
    } else {
      x.fillStyle = pal.ink; x.fillRect(cx - 34, H - B - 2, 68, B + 2);
      x.fillStyle = '#05040a'; x.fillRect(cx - 26, H - B, 52, B);
      x.fillStyle = pal.top; x.fillRect(cx - 34, H - B, 6, B); x.fillRect(cx + 28, H - B, 6, B);
    }
  };
  if (doorN) door(480, true);
  if (doorS) door(480, false);
  return c;
}
export const DUN = {
  blue: { top: '#6c78b4', face: '#4a5490', faceLo: '#2a3060', faceHi: '#7884c4', side: '#3e4680', floor: '#5a6488', floorLo: '#3c4466', floorHi: '#76809e', ink: '#0c0c1c' },
  boss: { top: '#8a5a7a', face: '#6a3858', faceLo: '#3a1830', faceHi: '#9a6488', side: '#582c4a', floor: '#4e3a52', floorLo: '#32223a', floorHi: '#6a5470', ink: '#0e0610' },
};
export function block() {
  const w = 40, h = 44, P = pixels(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let c;
      if (y < 34) { c = '#8c96c4'; if (x < 3 || y < 3) c = '#d0d8f8'; else if (x > w - 4 || y > 30) c = '#5a6494'; if ((x === 8 || x === w - 9) && y > 6 && y < 28) c = '#5a6494'; if ((y === 8 || y === 26) && x > 8 && x < w - 9) c = '#5a6494'; if ((x === 9 || y === 9) && x > 8 && y > 8 && x < w - 9 && y < 27) c = '#b0b8e0'; }
      else { c = '#3a4078'; if ((x + 2) % 10 === 0) c = '#262a58'; }
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1 || y === 34) c = '#0c0c1c';
      P.set(x, y, c);
    }
  return P.done();
}
export function torchBowl() {
  const w = 28, h = 30, P = pixels(w, h);
  for (let y = 12; y < h; y++)
    for (let x = 0; x < w; x++) {
      const half = y < 20 ? 13 - (y - 12) * 0.3 : 6;
      if (Math.abs(x + 0.5 - w / 2) > half) continue;
      const u = (x - (w / 2 - half)) / (half * 2);
      let c = u < 0.3 ? '#e8c060' : u < 0.7 ? '#b08030' : '#6a4818';
      if (Math.abs(Math.abs(x + 0.5 - w / 2) - half) < 1 || y === 12 || y === h - 1) c = '#1a1008';
      if (y === 13) c = '#3a2008';
      P.set(x, y, c);
    }
  return P.done();
}

// ---------- items / icons ----------
// gem (rupee-like): elongated hexagon, frame k = shine phase
export function gem(base, k = 0) {
  const w = 12, h = 20, P = pixels(w, h);
  const cols = base === 'blue' ? ['#0c1e5a', '#2a5ae0', '#5a9cff', '#c8e4ff'] : base === 'red' ? ['#4a0c14', '#d02a38', '#ff6a72', '#ffd0d4'] : ['#0a3a14', '#20a03a', '#56e070', '#d0ffd8'];
  for (let y = 0; y < h; y++) {
    const half = y < 5 ? 1 + y : y > h - 6 ? 1 + (h - 1 - y) : 5;
    for (let x = Math.round(w / 2 - half); x < Math.round(w / 2 + half); x++) {
      const edge = x === Math.round(w / 2 - half) || x === Math.round(w / 2 + half) - 1 || y === 0 || y === h - 1;
      let c = x < w / 2 ? cols[2] : cols[1];
      if (Math.abs(x + 0.5 - w / 2) < 2 && y > 3 && y < h - 4) c = cols[2];
      if (x < w / 2 - 1 && y > 3 && y < 9) c = cols[3];
      if ((y + k * 6) % 20 === Math.round(x * 0.5 + 2) % 20 && !edge) c = '#ffffff';
      P.set(x, y, edge ? cols[0] : c);
    }
  }
  return P.done();
}
const HEART = ['.##..##.', '#hh##..#', '#h....r#', '#.....r#', '.#...r#.', '..#.r#..', '...##...'];
export function heart(fill = 1, k = 2, outline = '#141020') {
  // 8×7 design scaled k×
  const P = pixels(8 * k, 7 * k);
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 8; x++) {
      const ch = HEART[y][x];
      const inside = ch !== '.' || (y > 0 && y < 6 && x > HEART[y].indexOf('#') && x < HEART[y].lastIndexOf('#'));
      if (!inside) continue;
      let c;
      if (ch === '#') c = outline;
      else if (fill === 0 || (fill === 0.5 && x >= 4)) c = '#3a2030';
      else c = ch === 'h' ? '#ffb0b8' : ch === 'r' ? '#a01828' : '#e8283c';
      for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) P.set(x * k + a, y * k + b, c);
    }
  return P.done();
}
export function sword() {
  // pointing up; pivot (grip centre) at (6, 50)
  const w = 13, h = 56, P = pixels(w, h);
  for (let y = 0; y < 42; y++) {
    const half = y < 5 ? Math.max(0.5, y * 0.6) : 3;
    for (let x = Math.round(6.5 - half - 0.01); x <= Math.round(6.5 + half - 1); x++) {
      const edgeL = x === Math.round(6.5 - half - 0.01), edgeR = x === Math.round(6.5 + half - 1);
      let c = x < 6 ? '#f2f8ff' : x === 6 ? '#b8c8e8' : '#7c90bc';
      if (x === 6 && y > 8 && y < 38) c = '#5a6c9c';
      P.set(x, y, edgeL || edgeR ? '#1a1a30' : c);
    }
  }
  for (let x = 0; x < w; x++) { const c = x === 0 || x === w - 1 ? '#1a1a30' : x < 6 ? '#8a7cf0' : '#4c3cb0'; for (let y = 42; y < 46; y++) P.set(x, y, y === 42 || y === 45 ? '#1a1a30' : c); }
  P.set(6, 43, '#ffe24a'); P.set(6, 44, '#ffb020');
  for (let y = 46; y < 53; y++) for (let x = 5; x < 8; x++) P.set(x, y, x === 5 ? '#c08850' : x === 7 ? '#5a3418' : '#8a5a2c');
  for (let x = 4; x < 9; x++) for (let y = 53; y < 56; y++) P.set(x, y, x === 4 || x === 8 || y === 55 ? '#1a1a30' : '#ffd040');
  return P.done();
}
export function tonic() {
  const c = canvas(18, 26), x = c.getContext('2d');
  const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  R(6, 0, 6, 5, '#141020'); R(7, 1, 4, 3, '#c08850');
  R(5, 5, 8, 4, '#141020'); R(6, 5, 6, 4, '#d8f4ff');
  R(1, 9, 16, 17, '#141020'); R(2, 10, 14, 15, '#d8f4ff');
  R(3, 13, 12, 11, '#42e86a'); R(3, 13, 12, 2, '#a6ffb4'); R(4, 16, 3, 5, '#c8ffd2');
  R(6, 17, 6, 4, '#ffd34a'); R(7, 18, 4, 2, '#c87810');
  R(3, 11, 2, 9, '#ffffff');
  return c;
}
export function key() {
  const P = pixels(10, 18), c = '#ffd040', d = '#8a5a10';
  for (let y = 0; y < 7; y++) for (let x = 1; x < 9; x++) { const r = Math.hypot(x - 4.5, y - 3); if (r < 3.8 && r > 1.3) P.set(x, y, r > 2.6 ? d : c); }
  for (let y = 6; y < 18; y++) { P.set(4, y, c); P.set(5, y, d); }
  for (const y of [12, 15]) { P.set(6, y, c); P.set(7, y, c); P.set(6, y + 1, d); P.set(7, y + 1, d); }
  return P.done();
}
export function bomb() {
  const c = canvas(16, 18), x = c.getContext('2d');
  x.fillStyle = '#141020'; x.beginPath(); x.arc(8, 11, 7, 0, 7); x.fill();
  x.fillStyle = '#3a4ac8'; x.beginPath(); x.arc(8, 11, 6, 0, 7); x.fill();
  x.fillStyle = '#8a9cff'; x.fillRect(5, 7, 3, 2);
  x.fillStyle = '#c8a070'; x.fillRect(8, 1, 2, 4); x.fillStyle = '#ffd040'; x.fillRect(10, 0, 2, 2);
  return c;
}
export function spear() {
  // pointing down, 14×90
  const w = 14, h = 90, P = pixels(w, h);
  for (let y = 0; y < 70; y++) for (let x = 5; x < 9; x++) P.set(x, y, x === 5 ? '#c08850' : x === 8 ? '#4a2a14' : '#8a5a2c');
  for (let y = 0; y < 70; y += 12) for (let x = 5; x < 9; x++) P.set(x, y, '#c8c8d8');
  for (let y = 70; y < h; y++) {
    const half = Math.max(0.5, (h - y) * 0.32);
    for (let x = Math.round(7 - half); x < Math.round(7 + half); x++) P.set(x, y, x === Math.round(7 - half) || x === Math.round(7 + half) - 1 ? '#1a1a30' : x < 7 ? '#f0f4ff' : '#8a96b8');
  }
  for (let x = 1; x < 13; x++) { P.set(x, 69, '#1a1a30'); P.set(x, 70, x < 7 ? '#e0c060' : '#a07820'); P.set(x, 71, '#1a1a30'); }
  return P.done();
}

// bald-head bust on a pedestal (dungeon statue), stone palette
export function statue(pal = ['#141020', '#3e4472', '#646ca0', '#9aa2d0', '#d8dcf6']) {
  const w = 44, h = 70, c = canvas(w, h), x = c.getContext('2d');
  const R = (a, b, ww, hh, col) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); };
  // pedestal: lit top face + darker front
  R(4, 40, 36, 30, pal[0]); R(5, 41, 34, 8, pal[3]); R(5, 49, 34, 20, pal[2]); R(5, 49, 34, 2, pal[1]);
  R(8, 54, 28, 2, pal[1]); R(8, 62, 28, 2, pal[1]); R(5, 41, 34, 1, pal[4]);
  // bust
  x.drawImage(blob(36, 42, [[18, 18, 15], [18, 34, 11]], pal, { seed: 4 }), 4, 0);
  R(13, 18, 5, 3, pal[0]); R(26, 18, 5, 3, pal[0]); R(12, 16, 7, 1, pal[0]); R(25, 16, 7, 1, pal[0]);
  R(18, 27, 8, 2, pal[1]);
  R(11, 6, 5, 2, '#ffffff'); R(10, 8, 2, 3, pal[4]);
  return c;
}
export function pot() {
  const c = blob(30, 30, [[15, 18, 12], [15, 10, 8]], ['#2a1408', '#8a4a22', '#b46a34', '#d89050', '#f4c080'], { seed: 6 });
  const x = c.getContext('2d');
  x.fillStyle = '#2a1408'; x.fillRect(8, 4, 14, 5);
  x.fillStyle = '#d89050'; x.fillRect(9, 5, 12, 2);
  x.fillStyle = '#1a0a04'; x.fillRect(10, 7, 10, 1);
  x.fillStyle = '#6a3414'; x.fillRect(4, 18, 22, 2);
  return c;
}
