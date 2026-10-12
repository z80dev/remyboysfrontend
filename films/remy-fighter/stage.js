// Stage: "NEON ALLEY" — a night market street with parallax skyline, shopfronts and neon, a cheering crowd of
// haired Remys (and a few Cabald hecklers) behind a barricade, and a wet row-scrolled floor with reflections.
import { hash } from 'filmkit/lib.js';
import { canvas, loadFighter, blit, INK } from './rig.js';
import { LW, LH, GY, SW } from './choreo.js';

export const FONT = '"Press Start 2P"';
const CAMMAX = SW - LW;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);
const R = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };

// dithered vertical gradient
export function dither(w, h, stops, bands = 16) {
  const c = canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
  const S = stops.map(([p, col]) => [p, rgb(col)]);
  for (let y = 0; y < h; y++) {
    const q = (y / (h - 1)) * bands, b0 = Math.floor(q), f = q - b0;
    for (let xx = 0; xx < w; xx++) {
      const p = Math.min(1, (f * 16 > BAYER[(y & 3) * 4 + (xx & 3)] ? b0 + 1 : b0) / bands);
      let k = 0;
      while (k < S.length - 2 && p > S[k + 1][0]) k++;
      const [pa, ca] = S[k], [pb, cb] = S[k + 1], u = Math.min(1, Math.max(0, (p - pa) / (pb - pa)));
      const i = (y * w + xx) * 4;
      d[i] = ca[0] + (cb[0] - ca[0]) * u; d[i + 1] = ca[1] + (cb[1] - ca[1]) * u; d[i + 2] = ca[2] + (cb[2] - ca[2]) * u; d[i + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

// neon text tube: glow + core, rendered once (lit and unlit)
function neonText(s, size, col, { vertical = false } = {}) {
  const pad = 14, ch = size + 2;
  const tw = vertical ? size + pad * 2 : s.length * size + pad * 2, th = vertical ? s.length * ch + pad * 2 : size + pad * 2;
  const mk = (lit) => {
    const c = canvas(tw, th), x = c.getContext('2d');
    x.font = `${size}px ${FONT}`;
    x.textBaseline = 'top';
    const put = (fill, blur, a) => {
      x.save();
      x.globalAlpha = a;
      x.fillStyle = fill;
      x.shadowColor = col;
      x.shadowBlur = blur;
      if (vertical) [...s].forEach((l, i) => x.fillText(l, pad, pad + i * ch));
      else x.fillText(s, pad, pad);
      x.restore();
    };
    if (lit) { put(col, 12, 1); put(col, 5, 1); put('#ffffff', 0, 0.75); }
    else put('#3a2a44', 0, 1);
    return c;
  };
  return { on: mk(true), off: mk(false), w: tw, h: th };
}

// ---------- layers ----------
function skyline(w, h, seed, cols, { minH, maxH, winA }) {
  const c = canvas(w, h), x = c.getContext('2d');
  let bx = -10;
  let i = 0;
  while (bx < w) {
    const bw = 40 + Math.floor(hash(seed + i * 3) * 70), bh = minH + Math.floor(hash(seed + i * 3 + 1) * (maxH - minH));
    const top = h - bh;
    R(x, cols[0], bx, top, bw, bh);
    R(x, cols[1], bx, top, 2, bh);
    if (hash(seed + i * 9) > 0.55) { R(x, cols[0], bx + bw / 2 - 1, top - 18, 2, 18); R(x, '#ff3a5a', bx + bw / 2 - 1, top - 20, 3, 2); }
    if (hash(seed + i * 11) > 0.6) R(x, cols[0], bx + 6, top - 8, bw - 12, 8);
    for (let wy = top + 6; wy < h - 6; wy += 8)
      for (let wx = bx + 5; wx < bx + bw - 6; wx += 6) {
        const r = h2(wx, wy, seed);
        if (r < winA) R(x, r < winA * 0.25 ? '#7ae0ff' : r < winA * 0.6 ? '#ffd27a' : '#ff9a5a', wx, wy, 3, 4);
        else if (r < winA + 0.12) R(x, cols[1], wx, wy, 3, 4);
      }
    bx += bw + 2 + Math.floor(hash(seed + i * 7) * 8);
    i++;
  }
  return c;
}

const SIGNS = [];
function street(w, h) {
  const c = canvas(w, h), x = c.getContext('2d');
  const walls = [['#2a1838', '#3a2450', '#1a0f26'], ['#30182a', '#48243c', '#1e0e1c'], ['#1c2038', '#2a3050', '#10142a'], ['#2e2030', '#443048', '#1c121e']];
  const shops = [
    { name: 'HAIR SALON', col: '#ff5ac8', awn: ['#ff5ac8', '#ffffff'] },
    { name: 'RAMEN', col: '#5af0ff', awn: ['#d8322c', '#ffd27a'] },
    { name: 'ARCADE', col: '#ffe14a', awn: ['#3a5aff', '#ffffff'] },
    { name: 'BARBER', col: '#ff6a4a', awn: ['#d8322c', '#ffffff'], pole: true },
    { name: 'NO BALDS', col: '#8aff6a', awn: ['#2a8a4a', '#d8ffd0'] },
    { name: 'KARAOKE', col: '#c87aff', awn: ['#6a2aa8', '#ffd0ff'] },
  ];
  let bx = 0, i = 0;
  while (bx < w) {
    const bw = 180 + Math.floor(hash(i * 5 + 1) * 70), top = 120 + Math.floor(hash(i * 5 + 2) * 80), P = walls[i % 4], shop = shops[i % shops.length];
    // facade with brick speckle
    R(x, P[0], bx, top, bw, h - top);
    for (let yy = top; yy < h; yy += 4) for (let xx = bx + ((yy / 4) % 2) * 6; xx < bx + bw; xx += 12) if (h2(xx, yy, 2) > 0.6) R(x, P[2], xx, yy, 11, 1);
    R(x, P[1], bx, top, bw, 3);
    R(x, P[2], bx, top + 3, bw, 2);
    R(x, P[2], bx + bw - 3, top, 3, h - top);
    // rooftop clutter
    if (hash(i * 13) > 0.5) { R(x, '#140a1e', bx + 20, top - 26, 30, 26); R(x, '#140a1e', bx + 24, top - 34, 22, 8); R(x, '#241634', bx + 22, top - 24, 4, 22); }
    else { R(x, '#140a1e', bx + bw - 60, top - 12, 40, 12); R(x, '#241634', bx + bw - 56, top - 10, 32, 2); }
    // windows with blinds; some lit
    for (let wy = top + 18; wy < h - 150; wy += 34)
      for (let wx = bx + 16; wx < bx + bw - 30; wx += 30) {
        const lit = h2(wx, wy, 5) > 0.62;
        R(x, INK, wx - 2, wy - 2, 18, 24);
        R(x, lit ? (h2(wx, wy, 6) > 0.5 ? '#c8945a' : '#b8609a') : '#160d26', wx, wy, 14, 20);
        if (lit) { R(x, 'rgba(255,240,200,0.35)', wx, wy, 14, 2); R(x, 'rgba(40,10,30,0.4)', wx + 6, wy, 2, 20); }
        R(x, P[1], wx - 3, wy + 21, 20, 2);
      }
    // fire escape on some
    if (i % 2 === 1) for (let fy = top + 50; fy < h - 150; fy += 34) { R(x, '#0e0816', bx + 10, fy, bw - 20, 3); for (let k = bx + 12; k < bx + bw - 12; k += 6) R(x, '#0e0816', k, fy - 12, 1, 12); R(x, '#0e0816', bx + 10, fy - 12, bw - 20, 1); }
    // shopfront: awning + bright window + door
    const sy = h - 120;
    R(x, '#0c0814', bx + 6, sy, bw - 12, 120);
    const win = x.createLinearGradient(0, sy + 30, 0, h);
    win.addColorStop(0, '#ffe0b0'); win.addColorStop(1, '#c86a5a');
    x.fillStyle = win; x.fillRect(bx + 14, sy + 34, bw - 70, 70);
    for (let k = 0; k < 5; k++) R(x, 'rgba(60,20,40,0.5)', bx + 18 + k * ((bw - 78) / 5), sy + 60 + (k % 2) * 6, 12, 44 - (k % 2) * 6); // silhouettes inside
    R(x, '#3a2030', bx + bw - 50, sy + 34, 30, 86); R(x, '#ffcf7a', bx + bw - 46, sy + 40, 22, 30);
    // awning stripes with scalloped edge
    for (let k = 0; bx + 4 + k * 12 < bx + bw - 4; k++) {
      R(x, shop.awn[k % 2], bx + 4 + k * 12, sy + 6, 12, 18);
      x.fillStyle = shop.awn[k % 2]; x.beginPath(); x.arc(bx + 10 + k * 12, sy + 24, 6, 0, Math.PI); x.fill();
    }
    R(x, 'rgba(0,0,0,0.35)', bx + 4, sy + 18, bw - 8, 6);
    R(x, INK, bx + 4, sy + 4, bw - 8, 2);
    // neon sign over the awning (drawn live for flicker); vertical blade sign on alternate buildings
    const sign = neonText(shop.name, 16, shop.col);
    SIGNS.push({ ...sign, x: bx + bw / 2 - sign.w / 2, y: sy - 42, col: shop.col, ph: i });
    if (i % 2 === 0) {
      const v = neonText(['REMY', 'HAIR', 'MANE', 'LOCKS', 'FADE'][i % 5], 16, ['#5af0ff', '#ff5ac8', '#ffe14a'][i % 3], { vertical: true });
      R(x, '#0c0814', bx + bw - 34, top + 30, 30, v.h - 8);
      R(x, '#5a4a6a', bx + bw - 34, top + 30, 30, 2);
      SIGNS.push({ ...v, x: bx + bw - 34 - 8, y: top + 26, ph: i + 7 });
    }
    if (shop.pole) SIGNS.push({ pole: true, x: bx + 8, y: sy - 4 });
    bx += bw + 6;
    // alley gap
    R(x, '#07040e', bx - 6, top + 40, 6, h - top - 40);
    i++;
  }
  return c;
}

function barricade(w) {
  const c = canvas(w, 40), x = c.getContext('2d');
  R(x, INK, 0, 0, w, 40);
  R(x, '#b8c4dc', 0, 2, w, 3);
  R(x, '#e8f0ff', 0, 2, w, 1);
  R(x, '#2a2244', 0, 6, w, 30);
  for (let k = 0; k < w; k += 120) { R(x, '#d8322c', k, 8, 60, 26); R(x, '#ffd27a', k + 60, 8, 60, 26); }
  x.font = `8px ${FONT}`;
  x.textBaseline = 'top';
  for (let k = 0; k < w; k += 240) {
    x.fillStyle = '#ffffff'; x.fillText('REMY FIGHTER', k + 8, 13);
    x.fillStyle = INK; x.fillText('WORLD TOUR', k + 134, 13);
    x.fillStyle = '#ffffff'; x.fillText('II', k + 8, 24); x.fillStyle = INK; x.fillText('2026', k + 134, 24);
  }
  for (let k = 0; k < w; k += 60) { R(x, '#8a94b0', k, 0, 3, 40); R(x, '#d0d8ec', k, 0, 1, 40); }
  R(x, '#8a94b0', 0, 34, w, 4);
  return c;
}

// floor texture in world space (wider than the stage for the row-scroll overscan)
const FLOOR_Y = 420;
function floor(w, h) {
  const c = canvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#241c38'); g.addColorStop(1, '#3a2e4c');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // pavers: rows get taller toward the camera
  let y = 0, row = 0;
  while (y < h) {
    const rh = Math.round(6 + row * 2.4), off = (row % 2) * 20;
    for (let bx = -off; bx < w; bx += 40) {
      const v = h2(bx, row, 3);
      R(x, v > 0.7 ? '#3e3456' : v > 0.35 ? '#342c4a' : '#2c2540', bx + 1, y + 1, 38, rh - 1);
      R(x, 'rgba(255,255,255,0.05)', bx + 1, y + 1, 38, 1);
    }
    R(x, '#0e0a18', 0, y, w, 1);
    y += rh;
    row++;
  }
  // puddles (glossy patches the neon reflects in)
  for (let i = 0; i < 18; i++) {
    const px = hash(i + 40) * w, py = 14 + hash(i + 41) * (h - 30), pw = 40 + hash(i + 42) * 90;
    x.fillStyle = 'rgba(10,8,20,0.55)';
    x.beginPath(); x.ellipse(px, py, pw, 4 + py * 0.05, 0, 0, 7); x.fill();
  }
  // painted street line + manhole
  R(x, 'rgba(255,220,120,0.35)', 0, 70, w, 3);
  return c;
}

// ---------- crowd ----------
const CROWD_IDS = [1, 7, 9, 26, 41, 54, 65, 77, 111, 123, 150, 200, 256, 300, 333, 404, 500, 512, 640, 700, 777, 888, 999, 1024, 1234, 1337, 1500, 1800, 2000, 2048, 2222, 2500, 2600, 3000, 3333, 3500, 4096, 4200];
const CABALD_IDS = [0, 5, 23, 233];
export const ST = {};
export async function prepareStage() {
  ST.sky = dither(LW, 360, [[0, '#07041a'], [0.45, '#1e0c40'], [0.75, '#4a1458'], [0.92, '#a02a6a'], [1, '#ff6a7a']]);
  ST.far = skyline(LW + Math.ceil(CAMMAX * 0.15) + 20, 230, 11, ['#1c0f3a', '#2a1a52'], { minH: 70, maxH: 210, winA: 0.12 });
  ST.mid = skyline(LW + Math.ceil(CAMMAX * 0.3) + 20, 260, 23, ['#120828', '#1e1240'], { minH: 90, maxH: 240, winA: 0.2 });
  ST.street = street(LW + Math.ceil(CAMMAX * 0.6) + 40, 400);
  ST.barricade = barricade(LW + Math.ceil(CAMMAX * 0.85) + 40);
  ST.floor = floor(LW + Math.ceil(CAMMAX * 1.3) + 80, LH - FLOOR_Y);
  ST.crowd = [];
  const cw = LW + CAMMAX * 0.85 + 40;
  const fans = await Promise.all(CROWD_IDS.map((i) => loadFighter(i, true)));
  const cab = await Promise.all(CABALD_IDS.map((i) => loadFighter(i, true)));
  for (let row = 0; row < 2; row++) {
    const n = Math.ceil(cw / 40);
    for (let k = 0; k < n; k++) {
      const idx = row * 17 + k;
      const bad = row === 0 && k % 9 === 4;
      ST.crowd.push({
        F: bad ? cab[Math.floor(k / 9) % cab.length] : fans[(idx * 7) % fans.length],
        x: k * 40 + (row ? 20 : 0) + hash(idx + 300) * 10,
        feet: row ? 412 : 430,
        row, bad, ph: hash(idx + 500) * 6.28, rate: 7 + hash(idx + 600) * 5,
        sign: !bad && hash(idx + 700) > 0.82 ? ['GO REMY!', 'HAIR!', 'MANE 4 LIFE', '#42 ♥', 'NO BALDS'][(idx * 3) % 5] : bad ? 'CABALD' : null,
        flip: hash(idx + 800) > 0.5,
      });
    }
  }
  ST.crowd.sort((a, b) => a.row === b.row ? 0 : b.row - a.row);
  ST.signs = SIGNS;
  ST.lanterns = Array.from({ length: 22 }, (_, i) => ({ x: i * 62 + 20, sag: i % 6, col: ['#ff3a3a', '#ff8a2a', '#ff3a7a'][i % 3] }));
  ST.reflect = canvas(LW, LH - FLOOR_Y);
}

// hype: 0..1 crowd excitement; ko: crowd erupts; flash: background strobe weight
export function drawStage(x, cam, ts, { hype = 0, ko = false, dim = 0 } = {}) {
  x.drawImage(ST.sky, 0, 0);
  // moon
  const mx = 610 - Math.round(cam * 0.05), my = 128;
  x.fillStyle = 'rgba(255,220,240,0.08)'; x.beginPath(); x.arc(mx, my, 60, 0, 7); x.fill();
  x.fillStyle = '#f4e6ff'; x.beginPath(); x.arc(mx, my, 34, 0, 7); x.fill();
  x.fillStyle = '#d8c4ec'; x.beginPath(); x.arc(mx + 8, my + 6, 7, 0, 7); x.fill(); x.beginPath(); x.arc(mx - 12, my - 8, 5, 0, 7); x.fill(); x.beginPath(); x.arc(mx - 6, my + 14, 4, 0, 7); x.fill();
  // stars
  for (let i = 0; i < 70; i++) {
    const sx = Math.floor(hash(i + 10) * LW), sy = Math.floor(hash(i + 20) * 200);
    x.globalAlpha = Math.sin(ts * (2 + hash(i) * 4) + i) > 0.2 ? 0.9 : 0.35;
    R(x, '#ffffff', sx, sy, 1, 1);
  }
  x.globalAlpha = 1;
  x.drawImage(ST.far, -Math.round(cam * 0.15), 360 - 230 - 40);
  // searchlights sweeping behind the mid skyline
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 2; k++) {
    const bx = 180 + k * 600 - cam * 0.3, a = -Math.PI / 2 + Math.sin(ts * 0.9 + k * 2) * 0.45;
    x.globalAlpha = 0.07;
    x.fillStyle = k ? '#7ae0ff' : '#ff7ad8';
    x.beginPath(); x.moveTo(bx, 330); x.lineTo(bx + Math.cos(a - 0.06) * 600, 330 + Math.sin(a - 0.06) * 600); x.lineTo(bx + Math.cos(a + 0.06) * 600, 330 + Math.sin(a + 0.06) * 600); x.fill();
  }
  x.restore();
  x.drawImage(ST.mid, -Math.round(cam * 0.3), 360 - 260 - 10);
  // street facades
  const sx0 = -Math.round(cam * 0.6);
  x.drawImage(ST.street, sx0, 20);
  // neon signs (flicker on hashed beats)
  for (const s of ST.signs) {
    const px = Math.round(s.x + sx0), py = Math.round(s.y + 20);
    if (px > LW + 40 || px + (s.w ?? 20) < -40) continue;
    if (s.pole) {
      R(x, INK, px - 1, py - 1, 10, 46); R(x, '#ffffff', px, py, 8, 44);
      for (let k = -2; k < 12; k++) { const yy = py + ((k * 8 + ts * 40) % 48 + 48) % 48 - 4; x.save(); x.beginPath(); x.rect(px, py, 8, 44); x.clip(); R(x, k % 2 ? '#d8322c' : '#3a5aff', px, yy, 8, 4); x.restore(); }
      R(x, '#c8d0e0', px - 2, py - 5, 12, 5); R(x, '#c8d0e0', px - 2, py + 44, 12, 5);
      continue;
    }
    const fl = hash(Math.floor(ts * 12) * 13 + s.ph * 101);
    const on = !(fl > 0.93 && s.ph % 3 === 1);
    x.drawImage(on ? s.on : s.off, px, py);
  }
  // lantern strings (sway)
  for (let row = 0; row < 2; row++) {
    const y0 = 118 + row * 40, off = -cam * (0.65 + row * 0.05);
    x.strokeStyle = '#0c0814'; x.lineWidth = 1;
    x.beginPath();
    for (let xx = -20; xx <= LW + 20; xx += 8) { const wx = xx - off; const yy = y0 + 14 * Math.sin(((wx % 186) / 186) * Math.PI) ** 2; xx === -20 ? x.moveTo(xx, yy) : x.lineTo(xx, yy); }
    x.stroke();
    for (const L of ST.lanterns) {
      const lx = Math.round(L.x * 1.0 + off + row * 31);
      const wl = ((lx - off) % 186 + 186) % 186;
      if (lx < -20 || lx > LW + 20) continue;
      const ly = y0 + 14 * Math.sin((wl / 186) * Math.PI) ** 2 + 4 + Math.round(Math.sin(ts * 2 + L.x) * 1.5);
      const sw = Math.round(Math.sin(ts * 2.3 + L.x * 0.1) * 2);
      x.fillStyle = 'rgba(255,90,60,0.18)'; x.beginPath(); x.arc(lx + sw, ly + 8, 14, 0, 7); x.fill();
      R(x, INK, lx - 6 + sw, ly, 13, 16); R(x, L.col, lx - 5 + sw, ly + 1, 11, 14); R(x, '#ffd27a', lx - 2 + sw, ly + 3, 4, 10);
      R(x, '#2a1010', lx - 5 + sw, ly + 5, 11, 1); R(x, '#2a1010', lx - 5 + sw, ly + 10, 11, 1);
      R(x, '#ffd27a', lx - 3 + sw, ly - 1, 7, 2); R(x, '#ffd27a', lx - 3 + sw, ly + 15, 7, 2);
    }
  }
  // crowd behind the barricade
  const cx0 = -cam * 0.85;
  for (const p of ST.crowd) {
    const px = p.x + cx0;
    if (px < -40 || px > LW + 40) continue;
    const amp = p.bad ? (ko ? 0 : 1.5) : 2 + 9 * hype;
    const jump = Math.max(0, Math.sin(ts * p.rate + p.ph)) * amp;
    const sink = p.bad && ko ? 10 : 0;
    blit(x, p.F, px, p.feet - Math.round(jump) + sink, 1, { flip: p.flip });
    if (p.row === 1) { x.globalAlpha = 0.35; R(x, '#140a28', px - 26, p.feet - 80 - Math.round(jump), 52, 80); x.globalAlpha = 1; }
    if (p.sign && (p.row === 0 || p.bad)) {
      const sy = p.feet - 106 - Math.round(jump * 1.3) + sink, sw = p.sign.length * 8 + 8;
      R(x, '#5a3a20', px - 1, sy + 14, 2, 26);
      R(x, INK, px - sw / 2 - 1, sy - 1, sw + 2, 18);
      R(x, p.bad ? '#3b1d5e' : '#fff6e0', px - sw / 2, sy, sw, 16);
      x.font = `8px ${FONT}`; x.textBaseline = 'top'; x.textAlign = 'center';
      x.fillStyle = p.bad ? '#d8b0ff' : '#d8322c'; x.fillText(p.sign, Math.round(px), sy + 4);
      x.textAlign = 'left';
    }
  }
  x.drawImage(ST.barricade, Math.round(cx0) - 20, 392);
  // floor: per-row scroll for perspective (rows nearer the camera move faster)
  for (let y = FLOOR_Y; y < LH; y++) {
    const p = 0.86 + ((y - FLOOR_Y) / (LH - FLOOR_Y)) * 0.42;
    x.drawImage(ST.floor, Math.round(cam * p) + 20, y - FLOOR_Y, LW, 1, 0, y, LW, 1);
  }
  // wet reflections of the neon: mirrored, rippled, faint
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (const s of ST.signs) {
    if (s.pole) continue;
    const px = Math.round(s.x + sx0);
    if (px > LW || px + s.w < 0) continue;
    for (let k = 0; k < 7; k++) {
      const yy = FLOOR_Y + 10 + k * 12 + (s.ph % 3) * 4;
      if (yy > LH) break;
      const wob = Math.round(Math.sin(ts * 3 + k * 1.7 + s.ph) * 3);
      x.globalAlpha = 0.16 * (1 - k / 7);
      x.drawImage(s.on, 0, Math.max(0, s.h - 20 - k * 3), s.w, 6, px + wob, yy, s.w, 4);
    }
  }
  x.restore();
  if (dim > 0) { x.fillStyle = `rgba(6,2,16,${dim})`; x.fillRect(0, 0, LW, LH); }
}

// steam from a vent on the floor (world x)
export function drawSteam(x, cam, ts) {
  const vx = 300 - cam * 1.1, vy = 500;
  if (vx < -80 || vx > LW + 80) return;
  R(x, '#0e0a18', vx - 22, vy - 3, 44, 7); R(x, '#3a3450', vx - 20, vy - 2, 40, 5);
  for (let k = -16; k <= 16; k += 6) R(x, '#0e0a18', vx + k, vy - 2, 2, 5);
  for (let i = 0; i < 14; i++) {
    const age = ((ts * 0.8 + i / 14) % 1), r = 6 + age * 26;
    x.globalAlpha = 0.18 * (1 - age);
    x.fillStyle = '#d8d0f0';
    x.beginPath(); x.arc(vx + Math.sin(i * 2.3 + ts) * 8 + age * 20, vy - 6 - age * 120, r, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
}
