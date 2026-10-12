// Indigenous Peoples' Day 2026 promo stills: ten static poster variations, one per 1 s shot.
// Rendered as stills at t = i + 0.5 (filmkit stills); nothing animates.
// Imagery is deliberately respectful: landscapes, harvest, sky and generic geometric bands; no costumes or
// headdresses on the Remys, no sacred-specific symbols.
// Cast (all hairy heroes, checked on contact sheets for clean shirts / no meme text):
//   portraits 42 hero, 40 Chichén Itzá backdrop (cropped above the shirt print and snack bag), 4 green, 7 sky, 33 blue, 39 terraces
//   sprites   4 7 11 13 16 19 24 28 33 37 39 40 41 42 44 47 49 64 68  (12 rejected: gold block prop; 53: bikini print)
import { W, H, F, txt, measure, hash, rng, vnoise, mixHex, alpha, shade } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js';

const MEDIA = new URL('../../media/', import.meta.url);
const TITLE = 'HAPPY INDIGENOUS PEOPLES’ DAY';
const DATE = 'OCTOBER 12, 2026';

// Earth palette.
const C = {
  ink: '#22140f', bark: '#4a2a1c', clay: '#b8462a', terra: '#d0623a', ochre: '#e3a33a', sun: '#f6c55a',
  cream: '#f5e7c9', sand: '#e9cf9c', teal: '#1f8a83', turq: '#38b2a6', sage: '#7e9a5c', pine: '#20402f',
  dusk: '#3b2350', night: '#0f1530', plum: '#6b2f4a',
};

const SPRITES = [4, 7, 11, 13, 16, 19, 24, 28, 33, 37, 39, 40, 41, 42, 44, 47, 49, 64, 68];
const PORTRAITS = [42, 40, 4, 7, 33, 39];
let P = {}, N = {}, FAR = {}, heads, minis, bald;

async function img(url) {
  const i = new Image();
  i.src = url;
  await i.decode();
  return i;
}

// ---------- shared drawing helpers ----------
function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
function fillAll(ctx, style) {
  ctx.fillStyle = style;
  ctx.fillRect(0, 0, W, H);
}
// Rolling ridge from summed value noise, filled to the bottom.
function ridge(ctx, y0, amp, freq, seed, color) {
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) {
    const n = vnoise(x * freq, seed) * 0.65 + vnoise(x * freq * 2.7, seed + 9) * 0.25 + vnoise(x * freq * 7, seed + 17) * 0.1;
    ctx.lineTo(x, y0 - n * amp);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
// Flat-topped mesas with lit left faces.
function mesas(ctx, base, seed, col, lit, list) {
  for (const [x, w, h] of list) {
    const r = rng(seed + x);
    const lean = 18 + r() * 22;
    ctx.beginPath();
    ctx.moveTo(x - lean, base);
    ctx.lineTo(x, base - h);
    ctx.lineTo(x + w, base - h);
    ctx.lineTo(x + w + lean * 1.4, base);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - lean, base);
    ctx.lineTo(x, base - h);
    ctx.lineTo(x + w * 0.28, base - h);
    ctx.lineTo(x + w * 0.18, base);
    ctx.closePath();
    ctx.fillStyle = lit;
    ctx.fill();
    // Strata lines.
    ctx.strokeStyle = alpha('#000000', 0.12);
    ctx.lineWidth = 3;
    for (let k = 1; k < 4; k++) {
      const y = base - h + (h * k) / 4 + (r() - 0.5) * 8;
      ctx.beginPath();
      ctx.moveTo(x - lean * (1 - (base - y) / h), y);
      ctx.lineTo(x + w + lean * 1.4 * (1 - (base - y) / h), y);
      ctx.stroke();
    }
  }
}
// Stepped diamond built from square cells.
function diamond(ctx, cx, cy, n, cell, cols) {
  cols.forEach((col, k) => {
    const m = n - k * 2;
    if (m < 0) return;
    ctx.fillStyle = col;
    for (let r = -m; r <= m; r++) {
      const span = m - Math.abs(r);
      ctx.fillRect(Math.round(cx - (span + 0.5) * cell), Math.round(cy + (r - 0.5) * cell), Math.round((span * 2 + 1) * cell), cell);
    }
  });
}
// Generic geometric band: stripes, stepped diamonds and chevron teeth.
function band(ctx, y, h, o = {}) {
  const bg = o.bg ?? C.ink, a = o.a ?? C.terra, b = o.b ?? C.turq, c = o.c ?? C.cream, d = o.d ?? C.ochre;
  ctx.fillStyle = bg;
  ctx.fillRect(0, y, W, h);
  const s = Math.max(4, Math.round(h / 12));
  ctx.fillStyle = d;
  ctx.fillRect(0, y + s, W, s);
  ctx.fillRect(0, y + h - 2 * s, W, s);
  const step = h * 1.6, cell = Math.max(2, Math.round((h - 6 * s) / 7));
  const off = o.offset ?? 0;
  for (let i = -1, x = off; x < W + step; i++, x += step) {
    diamond(ctx, x, y + h / 2, 3, cell, i % 2 ? [a, c, b] : [b, c, a]);
    // Teeth between diamonds.
    const tx = x + step / 2;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(tx - cell * 1.5, y + 3 * s);
    ctx.lineTo(tx, y + h / 2);
    ctx.lineTo(tx + cell * 1.5, y + 3 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx - cell * 1.5, y + h - 3 * s);
    ctx.lineTo(tx, y + h / 2);
    ctx.lineTo(tx + cell * 1.5, y + h - 3 * s);
    ctx.fill();
  }
}
// Title fitted to maxW (shrinks, never clips).
function title(ctx, s, x, y, maxW, size, o = {}) {
  const font = o.font ?? F.anton, track = o.track ?? 2;
  let sz = size;
  while (measure(ctx, s, sz, font, track, o.weight ?? '') > maxW && sz > 12) sz -= 2;
  txt(ctx, s, x, y, { size: sz, font, track, align: o.align ?? 'center', color: o.color ?? C.cream, shadow: o.shadow, off: o.off, glow: o.glow, glowBlur: o.glowBlur, weight: o.weight, stroke: o.stroke, strokeW: o.strokeW });
  return sz;
}
function brand(ctx, color, x = W - 60, y = H - 44, align = 'right') {
  txt(ctx, 'REMY BOYS', x, y, { size: 30, font: F.anton, track: 6, color, align });
}
function portrait(ctx, im, cx, cy, r, ring, ring2) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  ctx.fillStyle = ring2 ?? C.ink;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(im, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}
function sun(ctx, x, y, r, core, halo) {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3.2);
  g.addColorStop(0, alpha(halo, 0.55));
  g.addColorStop(1, alpha(halo, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();
}
function stars(ctx, seed, n, yMax) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * yMax, s = r() < 0.08 ? 3 : r() < 0.4 ? 2 : 1.2;
    ctx.fillStyle = alpha('#fff6dc', 0.35 + r() * 0.6);
    ctx.fillRect(x, y, s, s);
  }
}
function remy(ctx, id, x, feet, s, o = {}) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // Soft contact shadow.
  if (!o.noShadow) {
    ctx.fillStyle = alpha('#000000', 0.28);
    ctx.beginPath();
    ctx.ellipse(x, feet + 2, 26 * s * (o.far ? 0.7 : 1), 5 * s * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  A.drawRemy(ctx, o.far ? FAR[id] : N[id], x, feet, { sx: s, sy: s, flip: o.flip, glow: o.glow, glowA: o.glowA, lean: o.lean ?? 0 });
  ctx.restore();
}
function grain(ctx, seed, a = 0.05) {
  const r = rng(seed);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = r() < 0.5 ? alpha('#000000', a) : alpha('#ffffff', a);
    ctx.fillRect(r() * W, r() * H, 2, 2);
  }
}

// ---------- the ten variations ----------
const V = [
  // 1. Sunrise over the mesas, the crew on the ridge.
  function sunrise(ctx) {
    fillAll(ctx, vgrad(ctx, 0, H, ['#2c2350', '#8a3b4f', '#e0744a', '#f5c06a']));
    sun(ctx, 960, 610, 150, '#ffe39a', '#ffb45a');
    mesas(ctx, 720, 3, shade(C.plum, 0.9), '#8e4256', [[60, 260, 170], [520, 180, 120], [1180, 340, 200], [1640, 200, 140]]);
    ridge(ctx, 760, 70, 0.004, 5, '#6d2c37');
    ridge(ctx, 860, 60, 0.006, 8, '#45201f');
    band(ctx, H - 96, 96);
    const crew = [13, 4, 24, 42, 33, 7, 39];
    crew.forEach((id, i) => remy(ctx, id, 330 + i * 210, 905 - Math.abs(i - 3) * 8, 3, { flip: i > 3 }));
    title(ctx, TITLE, 960, 150, 1700, 120, { color: '#fff3d6', shadow: alpha(C.ink, 0.55), off: 6 });
    txt(ctx, 'Honoring the first peoples of this land', 960, 228, { size: 50, font: F.serif, weight: 'italic 600', align: 'center', color: '#ffe7c0' });
    brand(ctx, C.cream, W - 60, H - 118);
  },

  // 2. Portrait gallery on cream paper.
  function gallery(ctx) {
    fillAll(ctx, C.cream);
    grain(ctx, 21, 0.035);
    band(ctx, 0, 110);
    band(ctx, H - 110, 110, { offset: 90 });
    const ids = [4, 7, 42, 39, 33];
    const rr = [118, 118, 150, 118, 118];
    ids.forEach((id, i) => portrait(ctx, P[id], 260 + i * 350, 640 + (i === 2 ? -10 : 0), rr[i], i % 2 ? C.turq : C.terra));
    title(ctx, TITLE, 960, 300, 1680, 118, { color: C.ink });
    txt(ctx, 'Celebrating Indigenous cultures, histories & resilience', 960, 372, { size: 44, font: F.grot, weight: '500', align: 'center', color: C.clay });
    brand(ctx, C.ink, W - 60, H - 140);
    txt(ctx, DATE, 60, H - 140, { size: 30, font: F.anton, track: 6, color: C.ink });
  },

  // 3. Night sky over the mountains.
  function night(ctx) {
    fillAll(ctx, vgrad(ctx, 0, H, ['#070a1c', C.night, '#2b2557', '#4b3260']));
    stars(ctx, 33, 520, 720);
    // Milky band.
    ctx.save();
    ctx.translate(960, 380);
    ctx.rotate(-0.35);
    const mg = ctx.createLinearGradient(0, -120, 0, 120);
    mg.addColorStop(0, alpha('#c8b8ff', 0));
    mg.addColorStop(0.5, alpha('#c8b8ff', 0.13));
    mg.addColorStop(1, alpha('#c8b8ff', 0));
    ctx.fillStyle = mg;
    ctx.fillRect(-1400, -120, 2800, 240);
    ctx.restore();
    sun(ctx, 1640, 420, 62, '#fff4d8', '#a8b8ff');
    ridge(ctx, 700, 260, 0.003, 41, '#1e1d44');
    ridge(ctx, 800, 160, 0.005, 43, '#16142f');
    ridge(ctx, 900, 70, 0.007, 47, '#0d0b1d');
    const crew = [13, 39, 42, 64, 68];
    crew.forEach((id, i) => remy(ctx, id, 600 + i * 180, 958 - Math.abs(i - 2) * 6, 3, { flip: i > 2, glow: '#bfcaff', glowA: 0.35 }));
    title(ctx, TITLE, 960, 190, 1500, 104, { color: '#fff4d8', glow: alpha('#a8b8ff', 0.6), glowBlur: 30 });
    txt(ctx, 'Under the same stars, on Indigenous land', 960, 262, { size: 46, font: F.serif, weight: 'italic 600', align: 'center', color: '#d9d2ff' });
    brand(ctx, '#d9d2ff');
    txt(ctx, DATE, 60, H - 44, { size: 30, font: F.anton, track: 6, color: '#d9d2ff' });
  },

  // 4. The Three Sisters harvest.
  function harvest(ctx) {
    fillAll(ctx, vgrad(ctx, 0, H, ['#f7d488', '#f0b65c', '#d9883e']));
    sun(ctx, 1640, 420, 95, '#fff0c0', '#ffd27a');
    ridge(ctx, 560, 80, 0.003, 61, '#b9733c');
    ridge(ctx, 640, 50, 0.005, 63, '#8e5a2c');
    // Field.
    ctx.fillStyle = vgrad(ctx, 620, H, ['#6f7d3a', '#4f5b28']);
    ctx.fillRect(0, 640, W, H - 640);
    const r = rng(64);
    // Corn stalks (back rows smaller).
    for (let row = 0; row < 3; row++) {
      const base = 690 + row * 90, s = 0.6 + row * 0.25;
      for (let x = -20 + row * 37; x < W + 40; x += 95 - row * 10) {
        if (row === 2 && x > 420 && x < 1520) continue;
        const h = (260 + r() * 70) * s, sway = (r() - 0.5) * 20;
        ctx.strokeStyle = shade('#6f9a3a', 0.75 + row * 0.1);
        ctx.lineWidth = 7 * s;
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.quadraticCurveTo(x + sway, base - h * 0.5, x + sway * 1.5, base - h);
        ctx.stroke();
        ctx.fillStyle = shade('#7fae45', 0.8 + row * 0.1);
        for (let l = 0; l < 4; l++) {
          const ly = base - h * (0.25 + l * 0.18), dir = l % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(x + sway * 0.6, ly);
          ctx.quadraticCurveTo(x + dir * 70 * s, ly - 40 * s, x + dir * 110 * s, ly + 10 * s);
          ctx.quadraticCurveTo(x + dir * 60 * s, ly - 14 * s, x + sway * 0.6, ly + 8 * s);
          ctx.fill();
        }
        // Ear of corn.
        ctx.fillStyle = C.sun;
        ctx.beginPath();
        ctx.ellipse(x + sway + 14 * s, base - h * 0.55, 10 * s, 26 * s, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a7c56a';
        ctx.beginPath();
        ctx.ellipse(x + sway + 8 * s, base - h * 0.52, 8 * s, 24 * s, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Squash and bean vines along the front.
    for (let i = 0; i < 7; i++) {
      const x = 80 + i * 225 + (r() - 0.5) * 60, y = 1010 + (r() - 0.5) * 20, w = 70 + r() * 30;
      const col = i % 3 === 0 ? C.terra : i % 3 === 1 ? C.ochre : '#d7863a';
      ctx.fillStyle = shade(col, 0.7);
      ctx.beginPath();
      ctx.ellipse(x + 4, y + 6, w, w * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(x, y, w, w * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(col, 0.6);
      ctx.lineWidth = 3;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.ellipse(x, y, Math.abs(k) * w * 0.3 + 4, w * 0.6, 0, -Math.PI / 2, Math.PI / 2, k < 0);
        ctx.stroke();
      }
      ctx.fillStyle = '#3e6b2c';
      ctx.beginPath();
      ctx.ellipse(x - w * 0.9, y - 20, 34, 18, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    const crew = [41, 42, 11, 7];
    crew.forEach((id, i) => remy(ctx, id, 620 + i * 230, 960, 3, { flip: i > 1 }));
    title(ctx, TITLE, 960, 165, 1600, 112, { color: C.ink, shadow: alpha('#fff1c8', 0.7), off: 5 });
    txt(ctx, 'Corn · Beans · Squash — the Three Sisters still feed the world', 960, 240, { size: 44, font: F.grot, weight: '600', align: 'center', color: '#5a2614' });
    brand(ctx, C.cream);
  },

  // 5. Hero sun: #42 haloed by rays and a diamond ring.
  function heroSun(ctx) {
    fillAll(ctx, C.clay);
    const cx = 960, cy = 470;
    for (let i = 0; i < 28; i++) {
      const a0 = (i / 28) * Math.PI * 2, a1 = ((i + 0.5) / 28) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 1600, a0, a1);
      ctx.closePath();
      ctx.fillStyle = C.terra;
      ctx.fill();
    }
    const vg = ctx.createRadialGradient(cx, cy, 200, cx, cy, 1100);
    vg.addColorStop(0, alpha(C.ochre, 0.35));
    vg.addColorStop(1, alpha(C.ink, 0.45));
    fillAll(ctx, vg);
    // Diamond ring around the portrait.
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      diamond(ctx, cx + Math.cos(a) * 300, cy + Math.sin(a) * 300, 2, 9, i % 2 ? [C.turq, C.cream] : [C.ochre, C.ink]);
    }
    portrait(ctx, P[42], cx, cy, 230, C.cream, C.ink);
    ctx.fillStyle = alpha(C.ink, 0.82);
    ctx.fillRect(0, 838, W, 242);
    band(ctx, 838, 34, { bg: C.ink });
    title(ctx, TITLE, 960, 975, 1760, 118, { color: C.cream });
    txt(ctx, 'From the Remy Boys family to yours', 960, 1040, { size: 38, font: F.grot, weight: '500', align: 'center', color: C.sun });
    txt(ctx, DATE, 60, 70, { size: 32, font: F.anton, track: 6, color: C.cream });
    brand(ctx, C.cream, W - 60, 70);
  },

  // 6. Mosaic wall of Remys behind a title plaque.
  function mosaic(ctx) {
    fillAll(ctx, C.ink);
    const cell = 60, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    let id = 0;
    ctx.imageSmoothingEnabled = true;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        while (bald.has(id)) id++;
        ctx.drawImage(minis, (id % 67) * 32, Math.floor(id / 67) * 32, 32, 32, x * cell, y * cell, cell, cell);
        id += 7;
      }
    // Earth wash so the plaque reads.
    fillAll(ctx, alpha('#3a1a10', 0.55));
    const px = 280, py = 290, pw = W - 560, ph = 500;
    ctx.fillStyle = alpha('#000000', 0.4);
    ctx.fillRect(px + 14, py + 18, pw, ph);
    ctx.fillStyle = C.cream;
    ctx.fillRect(px, py, pw, ph);
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    ctx.translate(0, 0);
    band(ctx, py, 70);
    band(ctx, py + ph - 70, 70, { offset: 60 });
    ctx.restore();
    title(ctx, 'HAPPY', 960, py + 190, pw - 120, 100, { color: C.clay, track: 18 });
    title(ctx, 'INDIGENOUS PEOPLES’ DAY', 960, py + 320, pw - 120, 120, { color: C.ink });
    txt(ctx, 'Many faces, one land — honoring those who were here first', 960, py + 395, { size: 36, font: F.grot, weight: '600', align: 'center', color: C.teal });
    brand(ctx, C.cream);
    txt(ctx, DATE, 60, H - 44, { size: 30, font: F.anton, track: 6, color: C.cream });
  },

  // 7. Dusk lake, canoe crew.
  function canoe(ctx) {
    const hz = 600;
    fillAll(ctx, vgrad(ctx, 0, hz, ['#2e2a5c', '#a2507a', '#f2925a', '#ffd08a']));
    sun(ctx, 1320, hz - 30, 95, '#ffe7a8', '#ff9a5a');
    ridge(ctx, hz - 40, 230, 0.0028, 71, '#5a3560');
    ridge(ctx, hz, 120, 0.0045, 73, '#3a2448');
    // Lake with mirrored glow streaks.
    ctx.fillStyle = vgrad(ctx, hz, H, ['#6b4a78', '#2c2350', '#151233']);
    ctx.fillRect(0, hz, W, H - hz);
    const r = rng(75);
    for (let i = 0; i < 70; i++) {
      const y = hz + 8 + Math.pow(r(), 1.6) * 420, w = 40 + r() * 220 * (1 - (y - hz) / 520);
      const x = 1320 + (r() - 0.5) * (120 + (y - hz) * 0.9);
      ctx.fillStyle = alpha('#ffcf8a', 0.15 + r() * 0.35);
      ctx.fillRect(x - w / 2, y, w, 3);
    }
    // Canoe crew: draw Remys, then the hull over their legs.
    const cy = 900;
    [33, 42, 4].forEach((id, i) => remy(ctx, id, 700 + i * 220, cy + 10, 3, { noShadow: true }));
    ctx.fillStyle = '#5a2e1a';
    ctx.beginPath();
    ctx.moveTo(470, cy - 70);
    ctx.quadraticCurveTo(960, cy - 40, 1450, cy - 70);
    ctx.quadraticCurveTo(1400, cy + 40, 1180, cy + 50);
    ctx.lineTo(740, cy + 50);
    ctx.quadraticCurveTo(520, cy + 40, 470, cy - 70);
    ctx.fill();
    ctx.fillStyle = '#8a4a2a';
    ctx.beginPath();
    ctx.moveTo(470, cy - 70);
    ctx.quadraticCurveTo(960, cy - 40, 1450, cy - 70);
    ctx.quadraticCurveTo(960, cy - 22, 470, cy - 70);
    ctx.fill();
    // Hull stripe.
    ctx.strokeStyle = C.ochre;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(520, cy - 30);
    ctx.quadraticCurveTo(960, cy - 2, 1400, cy - 30);
    ctx.stroke();
    // Paddles held at the bow and stern Remys' outer sides.
    ctx.strokeStyle = '#3a1d10';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(575, cy - 150);
    ctx.lineTo(470, cy + 90);
    ctx.moveTo(1345, cy - 150);
    ctx.lineTo(1450, cy + 90);
    ctx.stroke();
    ctx.fillStyle = '#3a1d10';
    for (const [x, y, a] of [[462, cy + 110, 0.41], [1458, cy + 110, -0.41]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Hull reflection.
    ctx.fillStyle = alpha('#2a1408', 0.45);
    ctx.beginPath();
    ctx.ellipse(960, cy + 62, 420, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = alpha('#ffcf8a', 0.45);
    ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(960, cy + 44 + k * 22, 560 + k * 80, 10 + k * 4, 0, 0, Math.PI);
      ctx.stroke();
    }
    title(ctx, TITLE, 960, 150, 1650, 112, { color: '#fff1d6', shadow: alpha('#2a1840', 0.6), off: 6 });
    txt(ctx, 'Honoring the peoples, waters and lands that came first', 960, 222, { size: 44, font: F.serif, weight: 'italic 600', align: 'center', color: '#ffe2c2' });
    brand(ctx, '#ffe2c2');
    txt(ctx, DATE, 60, H - 44, { size: 30, font: F.anton, track: 6, color: '#ffe2c2' });
  },

  // 8. Riso poster: flat shapes, offset print, stacked type.
  function riso(ctx) {
    fillAll(ctx, '#f3e3c3');
    const ink = (col, dx, dy, fn) => {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.fillStyle = col;
      fn();
      ctx.restore();
    };
    const sunShape = () => { ctx.beginPath(); ctx.arc(1360, 430, 300, 0, Math.PI * 2); ctx.fill(); };
    ctx.globalCompositeOperation = 'multiply';
    ink(alpha('#e86a3a', 0.95), 0, 0, sunShape);
    ink(alpha('#f2b640', 0.8), 14, -10, sunShape);
    const steps = () => {
      ctx.beginPath();
      ctx.moveTo(760, 900);
      const pts = [[760, 760], [880, 760], [880, 660], [1000, 660], [1000, 560], [1120, 560], [1120, 460], [1240, 460], [1240, 380], [1480, 380], [1480, 460], [1600, 460], [1600, 560], [1720, 560], [1720, 660], [1840, 660], [1840, 760], [1960, 760], [1960, 900]];
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
    };
    ink(alpha('#3a5cb8', 0.45), -12, 10, steps);
    ctx.globalCompositeOperation = 'source-over';
    ink('#1f8a83', 0, 0, steps);
    ctx.fillStyle = '#2a1a14';
    ctx.fillRect(0, 900, W, 180);
    band(ctx, 900, 60, { bg: '#2a1a14' });
    // Head icons marching along the ground.
    ctx.imageSmoothingEnabled = false;
    const ids = [42, 4, 11, 24, 33, 13, 39, 7, 41, 64, 68, 40];
    ids.forEach((id, i) => ctx.drawImage(A.headIcon(heads, id, 6), 70 + i * 152, 975, 96, 96));
    // Stacked type, left column.
    const lines = [['HAPPY', C.clay], ['INDIGENOUS', '#1f2a5a'], ['PEOPLES’', '#1f2a5a'], ['DAY', C.clay]];
    lines.forEach(([s, col], i) => {
      txt(ctx, s, 90 + 5, 230 + i * 165 + 5, { size: 170, font: F.anton, track: 4, color: alpha('#e86a3a', 0.4) });
      title(ctx, s, 90, 230 + i * 165, 760, 170, { color: col, align: 'left', track: 4 });
    });
    txt(ctx, 'Rooted here. Still here. Celebrated here.', 92, 860, { size: 34, font: F.grot, weight: '700', color: '#2a1a14' });
    txt(ctx, 'REMY BOYS · ' + DATE, W - 60, 80, { size: 30, font: F.anton, track: 6, color: '#2a1a14', align: 'right' });
    grain(ctx, 88, 0.05);
  },

  // 9. Featured portrait: Remy #40 before the Kukulcán pyramid, framed in steps.
  function feature(ctx) {
    fillAll(ctx, vgrad(ctx, 0, H, [C.teal, '#16615c']));
    grain(ctx, 91, 0.04);
    // Stepped frame.
    const x = 140, y = 150, s = 780;
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = [C.ink, C.ochre, C.cream, C.terra, C.ink][k];
      const p = 60 - k * 12;
      ctx.fillRect(x - p, y - p, s + p * 2, s + p * 2);
    }
    for (const [cx, cy] of [[x - 60, y - 60], [x + s + 60, y - 60], [x - 60, y + s + 60], [x + s + 60, y + s + 60]])
      diamond(ctx, cx, cy, 3, 14, [C.cream, C.terra, C.ink]);
    ctx.drawImage(P[40], 120, 0, 440, 440, x, y, s, s);
    const tx = 1060;
    title(ctx, 'HAPPY', tx, 300, 760, 110, { color: C.sun, align: 'left', track: 14 });
    title(ctx, 'INDIGENOUS', tx, 450, 760, 150, { color: C.cream, align: 'left' });
    title(ctx, 'PEOPLES’ DAY', tx, 600, 760, 150, { color: C.cream, align: 'left' });
    ctx.fillStyle = C.ochre;
    ctx.fillRect(tx, 640, 300, 8);
    const sub = ['Honoring the Indigenous peoples', 'of the Americas — past, present', 'and future.'];
    sub.forEach((s2, i) => txt(ctx, s2, tx, 716 + i * 54, { size: 42, font: F.grot, weight: '500', color: '#e8f4ef' }));
    txt(ctx, DATE, tx, 960, { size: 32, font: F.anton, track: 6, color: C.sun });
    brand(ctx, C.cream, W - 60, 960);
  },

  // 10. Autumn forest gathering: a crowd of Remys.
  function gathering(ctx) {
    fillAll(ctx, vgrad(ctx, 0, H, ['#f0c27a', '#e39a5a', '#b4583a']));
    sun(ctx, 960, 470, 120, '#fff0c8', '#ffcf8a');
    const r = rng(101);
    // Pines in three depths.
    const pine = (x, base, h, col) => {
      ctx.fillStyle = col;
      for (let t = 0; t < 4; t++) {
        const ty = base - h + t * h * 0.22, tw = h * (0.16 + t * 0.09);
        ctx.beginPath();
        ctx.moveTo(x, ty);
        ctx.lineTo(x - tw, ty + h * 0.3);
        ctx.lineTo(x + tw, ty + h * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillRect(x - h * 0.03, base - h * 0.12, h * 0.06, h * 0.14);
    };
    ridge(ctx, 640, 90, 0.004, 103, '#a8573e');
    for (let x = -20; x < W + 40; x += 46) pine(x + r() * 20, 700 + r() * 20, 170 + r() * 80, '#7a4a3a');
    for (let x = -40; x < W + 60; x += 80) {
      if (x > 640 && x < 1280) continue;
      pine(x + r() * 30, 780 + r() * 20, 280 + r() * 120, '#3d3a2e');
    }
    ctx.fillStyle = vgrad(ctx, 770, H, ['#6b3a26', '#3a2016']);
    ctx.fillRect(0, 770, W, H - 770);
    // Autumn leaves (deterministic).
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = [C.ochre, C.terra, '#e8c25a', C.clay][i % 4];
      ctx.beginPath();
      ctx.ellipse(r() * W, 790 + r() * 290, 7, 4, r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // Back row far sprites, front row near.
    const back = [16, 19, 28, 37, 44, 47, 49, 11, 40];
    back.forEach((id, i) => remy(ctx, id, 520 + i * 110, 860, 2, { far: true, flip: i % 2 === 1 }));
    const front = [7, 13, 24, 42, 4, 64, 39];
    front.forEach((id, i) => remy(ctx, id, 390 + i * 190, 975, 2.6, { flip: i > 3 }));
    title(ctx, TITLE, 960, 150, 1650, 112, { color: '#fff4dc', shadow: alpha('#5a2416', 0.6), off: 6 });
    txt(ctx, 'Gathered in gratitude for the original caretakers of this land', 960, 222, { size: 42, font: F.serif, weight: 'italic 600', align: 'center', color: '#fff0d4' });
    brand(ctx, C.cream);
    txt(ctx, DATE, 60, H - 44, { size: 30, font: F.anton, track: 6, color: C.cream });
  },
];

export default {
  title: 'Happy Indigenous Peoples’ Day — Remy Boys promo stills',
  output: 'ipd-promo.mp4',
  duration: V.length,
  async prepare() {
    const ps = PORTRAITS.map(async (id) => (P[id] = await img(new URL(`remy/Character${id}.webp`, MEDIA).href)));
    const ns = SPRITES.map(async (id) => {
      N[id] = await A.loadRemy(id, false);
      FAR[id] = await A.loadRemy(id, true);
    });
    const misc = (async () => {
      heads = await A.loadHeads();
      minis = await img(new URL('quest/minis.webp', MEDIA).href);
      bald = new Set((await (await fetch(new URL('../../scripts/quest-bald.json', import.meta.url).href)).json()).bald);
    })();
    await Promise.all([...ps, ...ns, misc]);
  },
  shots: V.map((fn, i) => ({
    name: fn.name,
    t0: i,
    t1: i + 1,
    draw(ctx) {
      ctx.save();
      fn(ctx);
      ctx.restore();
    },
  })),
};
