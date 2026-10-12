// REMYTRIS pixel art, generated once in prepare() at the game's native 960×540: bald-head block tiles, the
// night sky over St. Remy's onion domes, ornate folk frames. The Remy rig and head atlas come from remy-bros.
import { hash } from 'filmkit/lib.js';
export { canvas, loadRemy, drawRemy, loadHeads, headIcon } from '../remy-bros/art.js';
import { canvas } from '../remy-bros/art.js';

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

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

// ---------- palette ----------
export const INK = '#0e0818';
export const TCOL = {
  I: ['#2ec8e8', '#b4f6ff', '#1476a0', '#0c4c6c'],
  O: ['#f6c82c', '#fff4a8', '#b47a10', '#6e4a06'],
  T: ['#ac4ce0', '#e6b4ff', '#62228e', '#3a1258'],
  S: ['#4ccc4a', '#bcf6a8', '#1e7c2e', '#0e4a1a'],
  Z: ['#ea423e', '#ffb0a0', '#8e1a20', '#560c12'],
  J: ['#4068ea', '#b0c6ff', '#1c2e8e', '#0e1a56'],
  L: ['#f28c2c', '#ffd6a8', '#9c4c10', '#5e2a06'],
  G: ['#6c6a7c', '#aeacbc', '#383644', '#22202c'],
};

// ---------- block tile (24×24): bevelled folk-enamel frame; the bald head is drawn on top at draw time ----------
export function tile(t, s = 24) {
  const [base, hi, lo, deep] = TCOL[t].map(rgb);
  const P = pixels(s, s);
  const mix = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      let c;
      if (x === 0 || y === 0 || x === s - 1 || y === s - 1) c = rgb(INK);
      else if (y <= 2 && x < s - 2) c = x === 1 && y === 1 ? [255, 255, 255] : hi;
      else if (x <= 2 && y < s - 2) c = hi;
      else if (y >= s - 3 || x >= s - 3) c = y >= s - 2 || x >= s - 2 ? deep : lo;
      else {
        const u = (y - 3) / (s - 6);
        c = mix(mix(hi, base, 0.55), base, Math.min(1, u * 1.6));
        if (u > 0.6) c = mix(base, lo, (u - 0.6) * 0.9);
        // a little enamel gloss
        if (x - y > 8 && x - y < 11 && y < s / 2) c = mix(c, [255, 255, 255], 0.35);
      }
      P.set(x, y, c);
    }
  return P.done();
}
// Smaller tile for the queue / hold / logo (no head).
export function miniTile(t, s) {
  const [base, hi, lo, deep] = TCOL[t].map(rgb);
  const P = pixels(s, s);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      let c = base;
      if (x === 0 || y === 0 || x === s - 1 || y === s - 1) c = rgb(INK);
      else if (y === 1 || x === 1) c = hi;
      else if (y === s - 2 || x === s - 2) c = s > 10 && (y === s - 2 && x === s - 2) ? deep : lo;
      if (s > 12 && x === 2 && y === 2) c = [255, 255, 255];
      P.set(x, y, c);
    }
  return P.done();
}

// Variants of the heads atlas: grey (garbage), white silhouette (flashes).
export function atlasVariants(atlas) {
  const w = atlas.width, h = atlas.height;
  const grey = canvas(w, h), gx = grey.getContext('2d');
  gx.drawImage(atlas, 0, 0);
  const img = gx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.3 * d[i] + 0.55 * d[i + 1] + 0.15 * d[i + 2];
    d[i] = Math.round(l * 0.82 + 10); d[i + 1] = Math.round(l * 0.82 + 8); d[i + 2] = Math.round(l * 0.9 + 18);
  }
  gx.putImageData(img, 0, 0);
  const white = canvas(w, h), wx = white.getContext('2d');
  wx.drawImage(atlas, 0, 0);
  wx.globalCompositeOperation = 'source-in';
  wx.fillStyle = '#fff';
  wx.fillRect(0, 0, w, h);
  return { grey, white };
}

// ---------- night sky ----------
export function sky(w, h) {
  const stops = [[0, '#05031a'], [0.3, '#120a36'], [0.55, '#25124e'], [0.78, '#4a1c5c'], [1, '#86345e']].map(([p, c]) => [p, rgb(c)]);
  const P = pixels(w, h), bands = 18;
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const q = v * bands, b0 = Math.floor(q), f = q - b0;
      const p = Math.min(1, (f * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? b0 + 1 : b0) / bands);
      let k = 0;
      while (k < stops.length - 2 && p > stops[k + 1][0]) k++;
      const [pa, ca] = stops[k], [pb, cb] = stops[k + 1], u = (p - pa) / (pb - pa);
      P.set(x, y, ca.map((a, i) => Math.round(a + (cb[i] - a) * u)));
    }
  }
  return P.done();
}

// ---------- onion domes ----------
// One tower: drum with arched windows, an onion dome with swirled stripes, a gold spire.
function tower(P, cx, base, o) {
  const { dw, dh, R, oh, cols, lit, sil } = o;
  const top = base - dh;
  // drum
  for (let y = top; y < base; y++)
    for (let x = Math.round(cx - dw / 2); x < Math.round(cx + dw / 2); x++) {
      const rel = (x - (cx - dw / 2)) / dw;
      let c = sil ?? (rel < 0.18 ? o.wallHi : rel > 0.78 ? o.wallLo : o.wall);
      if (!sil && (y - top) % 18 === 0) c = o.wallLo;
      P.set(x, y, c);
    }
  if (!sil) {
    // arched windows, some lit
    const nw = Math.max(1, Math.floor(dw / 12));
    for (let i = 0; i < nw; i++) {
      const wx = Math.round(cx - dw / 2 + (i + 0.5) * (dw / nw)) - 2;
      for (let row = 0; row < Math.floor(dh / 26); row++) {
        const wy = top + 8 + row * 26;
        const on = h2(wx, wy, 3) > 0.35;
        for (let yy = 0; yy < 9; yy++)
          for (let xx = 0; xx < 4; xx++) {
            if (yy === 0 && (xx === 0 || xx === 3)) continue;
            P.set(wx + xx, wy + yy, on ? (yy < 3 ? '#fff2b0' : lit) : '#1a0e26');
          }
      }
    }
  }
  // collar
  for (let x = Math.round(cx - dw / 2 - 2); x < Math.round(cx + dw / 2 + 2); x++) for (let y = top - 3; y < top; y++) P.set(x, y, sil ?? (y === top - 3 ? '#ffe08a' : '#c8902a'));
  // onion
  const dtop = top - 3 - oh;
  for (let y = dtop; y < top - 3; y++) {
    const v = (y - dtop) / oh;
    const r = Math.max(dw / 2 - 1, R * Math.sin(Math.PI * Math.pow(v, 1.36)));
    for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++) {
      const nx = (x - cx) / Math.max(1, r);
      if (sil) { P.set(x, y, sil); continue; }
      const stripe = Math.floor(((x - cx) * 1.1 + (y - dtop) * 0.7 + 200) / Math.max(3, R / 3.5)) % 2;
      let c = rgb(cols[stripe]);
      const l = -0.6 * nx - 0.3 * (v - 0.4);
      if (l > 0.35) c = c.map((q) => Math.min(255, q + 60));
      else if (l < -0.3) c = c.map((q) => Math.round(q * 0.6));
      if (Math.abs(nx) > 0.93) c = rgb(INK);
      P.set(x, y, c);
    }
  }
  // spire + finial
  const sp = 10 + Math.round(R * 0.3);
  for (let y = dtop - sp; y < dtop + 2; y++) { P.set(cx, y, sil ?? '#ffd34a'); if (!sil) P.set(cx - 1, y, '#a8701a'); }
  for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 0], [0, 1]]) P.set(cx + dx, dtop - sp - 3 + dy, sil ?? '#fff2b0');
}

const DOMES = [['#e8403c', '#fff0e0'], ['#2ab06a', '#ffd34a'], ['#3c64e8', '#f4f4ff'], ['#f6c82c', '#c8282c'], ['#ac4ce0', '#ffd34a'], ['#2ec8e8', '#ffffff']];
export function skyline(w, h) {
  const P = pixels(w, h);
  const sil = rgb('#1c1036'), sil2 = rgb('#2a1748');
  // far city: silhouettes of domes and roofs
  for (let i = 0; i < 26; i++) {
    const cx = Math.round(i * 40 + hash(i + 3) * 30), base = h;
    const dh = 40 + Math.round(hash(i + 7) * 70), dw = 12 + Math.round(hash(i + 9) * 10);
    tower(P, cx, base, { dw, dh, R: dw * 0.85, oh: dw * 1.3, sil: i % 2 ? sil : sil2 });
  }
  // lit windows in the far city
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(hash(i + 400) * w), y = h - Math.floor(hash(i + 401) * 40) - 4;
    if (P.get(x, y)) { P.set(x, y, '#ffcf6a'); P.set(x + 1, y, '#ffcf6a'); }
  }
  // St. Remy's: two colourful clusters, one each side of the well
  const wall = { wall: '#d8c8b8', wallHi: '#fff2e0', wallLo: '#9a8070', lit: '#ffc24a' };
  const red = { wall: '#c8463a', wallHi: '#f08a6a', wallLo: '#7e2420', lit: '#ffd06a' };
  const clusters = [
    [[40, 92, 22, 24, 34, 0, wall], [92, 150, 30, 34, 48, 1, red], [150, 110, 24, 28, 40, 2, wall], [206, 70, 18, 20, 30, 3, red], [262, 128, 26, 30, 44, 4, wall], [318, 84, 20, 22, 32, 5, red]],
    [[648, 96, 22, 24, 34, 3, red], [700, 140, 28, 32, 46, 0, wall], [760, 104, 24, 26, 38, 5, red], [814, 160, 32, 36, 52, 2, wall], [872, 112, 24, 28, 40, 1, red], [928, 82, 20, 22, 32, 4, wall]],
  ];
  for (const cl of clusters) for (const [cx, dh, dw, R, oh, ci, st] of cl) tower(P, cx, h, { dw, dh, R, oh, cols: DOMES[ci], ...st });
  return P.done();
}

// Snowy rooftop strip the heroes stand on.
export function snowGround(w, h) {
  const P = pixels(w, h);
  for (let x = 0; x < w; x++) {
    const top = 3 + Math.round(2 * Math.sin(x * 0.07) + 1.5 * Math.sin(x * 0.19 + 1) + (h2(x, 1) > 0.85 ? 1 : 0));
    for (let y = top; y < h; y++) {
      let c = y === top ? '#ffffff' : y < top + 4 ? '#e8f0ff' : y < top + 7 ? '#c4d0f0' : '#8a90c8';
      if (y > top + 7) {
        // stone under the snow
        const by = Math.floor((y - top - 8) / 8), bx = Math.floor((x + (by & 1) * 12) / 24);
        c = (y - top - 8) % 8 === 0 || (x + (by & 1) * 12) % 24 === 0 ? '#2a1a3a' : h2(bx, by, 5) > 0.5 ? '#5a4468' : '#4c3a5c';
      }
      if (y > top && y < top + 7 && h2(x, y, 9) > 0.94) c = '#ffffff';
      P.set(x, y, c);
    }
  }
  return P.done();
}

// ---------- ornate folk frame (red enamel with gold diamonds) ----------
export function frame(w, h, b = 8) {
  const P = pixels(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (d >= b) continue;
      let c;
      if (d === 0 || d === b - 1) c = INK;
      else if (d === 1) c = '#ffe08a';
      else if (d === b - 2) c = '#c8902a';
      else {
        // diamond chain along the band
        const along = d === x || d === w - 1 - x ? y : x;
        const m = along % 10, k = Math.abs(m - 5) + Math.abs(d - (b - 1) / 2) * 2;
        c = k < 3 ? (k < 1.5 ? '#fff2b0' : '#ffd34a') : '#a8182a';
        if (k >= 3 && (d === 2)) c = '#d8303c';
      }
      P.set(x, y, c);
    }
  // gold corner studs
  for (const [cx, cy] of [[b / 2, b / 2], [w - b / 2, b / 2], [b / 2, h - b / 2], [w - b / 2, h - b / 2]])
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      const r = Math.abs(x) + Math.abs(y);
      if (r <= 4) P.set(cx + x - 0.5, cy + y - 0.5, r === 4 ? INK : r < 2 ? '#fff6c8' : '#ffc23a');
    }
  return P.done();
}
// Small panel frame (2px gold line).
export function panel(w, h) {
  const P = pixels(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (d > 3) continue;
      P.set(x, y, d === 0 || d === 3 ? INK : d === 1 ? '#ffd34a' : '#a8182a');
    }
  return P.done();
}
// Onion-dome finial for the playfield corners.
export function finial(cols = DOMES[0]) {
  const P = pixels(28, 44);
  tower(P, 14, 44, { dw: 10, dh: 6, R: 11, oh: 20, cols, wall: '#d8c8b8', wallHi: '#fff2e0', wallLo: '#9a8070', lit: '#ffc24a' });
  return P.done();
}
export { DOMES };
