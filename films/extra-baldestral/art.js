// B.T. THE EXTRA-BALDESTRAL — baked pixel sets, character repaints and live painters.
// Everything deterministic: hash-seeded, no Math.random, every painter pure in t.
import { hash } from 'filmkit/lib.js';
import { canvas } from '../remy-bros/art.js';

export const OVER = 40;
export const LW = 960, LH = 540;

const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const c255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// ---- character repaints -------------------------------------------------------

// Repaint a rig's skin/shirt hues toward alien targets, preserving pixel luminance ramps.
// A final pass suppresses stray blue highlights (the source art's scalp shine).
export function alienify(R, map, tol = 42) {
  const c = canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  const id = x.getImageData(0, 0, R.w, R.h), d = id.data;
  for (const [fromHex, toHex] of map) {
    const [fr, fg, fb] = rgbOf(fromHex), [tr, tg, tb] = rgbOf(toHex);
    const fL = (fr + fg + fb) / 3;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      const dist = Math.hypot(d[i] - fr, d[i + 1] - fg, d[i + 2] - fb);
      if (dist > tol) continue;
      const k = Math.min(1.25, Math.max(0.55, ((d[i] + d[i + 1] + d[i + 2]) / 3) / (fL || 1)));
      d[i] = c255(tr * k); d[i + 1] = c255(tg * k); d[i + 2] = c255(tb * k);
    }
  }
  for (let i = 0; i < d.length; i += 4) { // blue scalp shine → soft sage
    if (d[i + 3] < 8) continue;
    if (d[i + 2] > d[i] + 30 && d[i + 2] > 140) {
      const k = 0.8;
      d[i] = c255(d[i] * 0.5 + 100 * k); d[i + 1] = c255(d[i + 1] * 0.5 + 128 * k); d[i + 2] = c255(d[i + 2] * 0.5 + 118 * k);
    }
  }
  x.putImageData(id, 0, 0);
  return { ...R, c };
}

// Flat colour silhouette rig (moon crossing, doorway cut-outs, goon cones).
export function darkRig(R, hex) {
  const one = () => {
    const c = canvas(R.w, R.h), x = c.getContext('2d');
    x.drawImage(R.sil, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = hex;
    x.fillRect(0, 0, R.w, R.h);
    return c;
  };
  return { ...R, c: one(), sil: one() };
}

// ---- night sky + moon ---------------------------------------------------------

// Indigo gradient with static starfield (twinkle painted live).
export function bakeNightSky(w, h, seed = 7) {
  const c = canvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#070a18');
  g.addColorStop(0.5, '#0c1226');
  g.addColorStop(0.85, '#131b34');
  g.addColorStop(1, '#1a2340');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 190; i++) {
    const sx = h2(i, seed, 1) * w, sy = h2(i, seed, 2) * h * 0.86;
    const m = h2(i, seed, 3);
    x.fillStyle = `rgba(${210 + m * 45},${218 + m * 38},${238 + m * 17},${0.25 + m * 0.6})`;
    x.fillRect(Math.floor(sx), Math.floor(sy), m > 0.93 ? 2 : 1, m > 0.93 ? 2 : 1);
  }
  for (let i = 0; i < 4; i++) { // thin cloud ribs
    const cy = 30 + h2(i, seed, 4) * h * 0.4, cw = 130 + h2(i, seed, 5) * 220;
    const cx = h2(i, seed, 6) * w;
    x.fillStyle = `rgba(24,32,58,${0.35 + h2(i, seed, 7) * 0.2})`;
    x.beginPath(); x.ellipse(cx, cy, cw * 0.5, 7 + h2(i, seed, 8) * 6, 0, 0, 7); x.fill();
  }
  return c;
}

// Live star twinkle: alpha oscillation per star, same hash layout as bakeNightSky.
export function starTwinkle(ctx, t, w, h, seed = 7, k = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 190; i++) {
    const m = h2(i, seed, 3);
    if (m < 0.55) continue;
    const a = 0.1 + 0.5 * (0.5 + 0.5 * Math.sin(t * (0.8 + m * 1.7) + i * 2.1));
    ctx.fillStyle = `rgba(226,236,252,${a * k * m})`;
    const sx = Math.floor(h2(i, seed, 1) * w), sy = Math.floor(h2(i, seed, 2) * h * 0.86);
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.restore();
}

// Harvest moon with craters, Bayer-dithered terminator, dark rim.
export function bakeMoon(r) {
  const s = r * 2 + 6, c = canvas(s, s), x = c.getContext('2d');
  const cx = s / 2, cy = s / 2;
  const P = { base: [255, 217, 160], lit: [255, 236, 200], dim: [226, 166, 104], rim: [64, 42, 24] };
  const id = x.createImageData(s, s), d = id.data;
  const craters = [
    [cx - r * 0.35, cy - r * 0.3, r * 0.22], [cx + r * 0.25, cy - r * 0.42, r * 0.15],
    [cx + r * 0.38, cy + r * 0.12, r * 0.19], [cx - r * 0.15, cy + r * 0.35, r * 0.24],
    [cx + r * 0.02, cy - r * 0.05, r * 0.11], [cx - r * 0.52, cy + r * 0.18, r * 0.12],
  ];
  for (let py = 0; py < s; py++)
    for (let px = 0; px < s; px++) {
      const dx = px + 0.5 - cx, dy = py + 0.5 - cy, dd = Math.hypot(dx, dy);
      if (dd > r) continue;
      const i = (py * s + px) * 4;
      let col = P.base;
      const l = -0.5 * dx / r - 0.62 * dy / r; // light from upper-left
      if (l > 0.3) col = P.lit;
      else if (l < -0.42) col = P.dim;
      let k = 1;
      for (const [crx, cry, cr] of craters) {
        const cd = Math.hypot(px + 0.5 - crx, py + 0.5 - cry) / cr;
        if (cd < 1) k = Math.min(k, 0.82 + 0.1 * cd - (cd > 0.72 ? 0.14 : 0));
      }
      const dith = ((l + 0.42) * 14 > BAYER[(py & 3) * 4 + (px & 3)] ? 1 : 0);
      const kk = k * (0.96 + 0.06 * dith);
      d[i] = c255(col[0] * kk); d[i + 1] = c255(col[1] * kk); d[i + 2] = c255(col[2] * kk); d[i + 3] = 255;
      if (dd > r - 1.6) { d[i] = P.rim[0] + 120; d[i + 1] = P.rim[1] + 110; d[i + 2] = P.rim[2] + 90; }
    }
  x.putImageData(id, 0, 0);
  return c;
}

// ---- suburban street ----------------------------------------------------------

// Row of gabled houses with porches, picket fence, sidewalk; jack-o-lanterns painted live.
export function bakeHouses(w) {
  const c = canvas(w, 420), x = c.getContext('2d');
  const G = 350; // yard line in strip coords
  // treeline behind
  x.fillStyle = '#0a1020';
  for (let i = 0; i < 64; i++) {
    const tx = i * (w / 60), th = 60 + h2(i, 31) * 44;
    x.beginPath(); x.moveTo(tx - 14, 150); x.lineTo(tx, 150 - th); x.lineTo(tx + 14, 150); x.closePath(); x.fill();
  }
  x.fillStyle = '#0c1326'; x.fillRect(0, 146, w, 22);
  // telephone pole + wires
  x.fillStyle = '#0a0f1c'; x.fillRect(620, 90, 7, 262);
  x.fillRect(606, 100, 36, 5); x.fillRect(610, 118, 28, 4);
  x.strokeStyle = 'rgba(12,17,30,0.9)'; x.lineWidth = 1.5;
  x.beginPath(); x.moveTo(0, 103); x.quadraticCurveTo(310, 118, 620, 103); x.moveTo(620, 103); x.quadraticCurveTo(820, 112, w, 104); x.stroke();
  // houses
  let hx = -30;
  while (hx < w) {
    const hw = 165 + h2(hx, 41) * 60, hh = 96 + h2(hx, 42) * 30;
    const shade = 22 + h2(hx, 43) * 9;
    x.fillStyle = `rgb(${shade + 8},${shade + 12},${shade + 26})`;
    x.fillRect(hx, G - hh - 46, hw, hh + 46);                       // body
    x.fillStyle = `rgb(${shade + 3},${shade + 6},${shade + 18})`;
    x.beginPath(); x.moveTo(hx - 10, G - hh - 44); x.lineTo(hx + hw / 2, G - hh - 94); x.lineTo(hx + hw + 10, G - hh - 44); x.closePath(); x.fill(); // roof
    x.fillStyle = `rgb(${shade + 16},${shade + 20},${shade + 34})`;
    x.fillRect(hx - 12, G - hh - 50, hw + 24, 7);                   // fascia
    if (h2(hx, 44) > 0.5) { x.fillStyle = '#0a0f1c'; x.fillRect(hx + hw * 0.6, G - hh - 86, 12, 26); x.fillRect(hx + hw * 0.6 - 3, G - hh - 90, 18, 6); } // chimney
    // windows (some warm)
    for (let wx = hx + 16; wx < hx + hw - 26; wx += 38) {
      const warm = h2(Math.floor(wx), 45) > 0.62;
      x.fillStyle = warm ? 'rgba(255,178,86,0.85)' : 'rgba(16,22,38,0.95)';
      x.fillRect(wx, G - hh - 16, 22, 24);
      x.strokeStyle = `rgb(${shade + 20},${shade + 24},${shade + 38})`; x.lineWidth = 2;
      x.strokeRect(wx, G - hh - 16, 22, 24);
      x.beginPath(); x.moveTo(wx + 11, G - hh - 14); x.lineTo(wx + 11, G - hh + 6); x.moveTo(wx + 2, G - hh - 4); x.lineTo(wx + 20, G - hh - 4); x.stroke();
      if (warm) { x.fillStyle = 'rgba(255,150,60,0.14)'; x.beginPath(); x.arc(wx + 11, G - hh - 4, 26, 0, 7); x.fill(); }
    }
    // porch
    const pw = 52;
    x.fillStyle = `rgb(${shade + 6},${shade + 10},${shade + 22})`;
    x.fillRect(hx + 6, G - 58, pw, 8);
    x.fillStyle = `rgb(${shade + 4},${shade + 7},${shade + 19})`;
    x.fillRect(hx + 8, G - 50, 4, 50); x.fillRect(hx + pw + 2, G - 50, 4, 50);
    x.fillStyle = `rgb(${shade + 10},${shade + 14},${shade + 28})`;
    x.fillRect(hx + 2, G - 64, pw + 12, 7);
    x.fillStyle = `rgb(${shade + 2},${shade + 4},${shade + 14})`; x.fillRect(hx + 6, G - 57, pw, 4);
    // porch rail balusters
    x.fillStyle = `rgb(${shade + 8},${shade + 11},${shade + 24})`;
    for (let b = 0; b < 7; b++) x.fillRect(hx + 14 + b * 7, G - 50, 2, 20);
    // door
    x.fillStyle = `rgb(${shade + 14},${shade + 16},${shade + 24})`;
    x.fillRect(hx + hw * 0.18, G - 52, 20, 52);
    x.fillStyle = 'rgba(255,190,110,0.5)'; x.fillRect(hx + hw * 0.18 + 4, G - 44, 12, 14);
    hx += hw + 20 + h2(hx, 46) * 26;
  }
  // picket fence row
  x.fillStyle = '#141a2c';
  for (let px = 0; px < w; px += 13) {
    x.fillRect(px, G - 2, 7, 26);
    x.beginPath(); x.moveTo(px, G - 2); x.lineTo(px + 3.5, G - 8); x.lineTo(px + 7, G - 2); x.closePath(); x.fill();
  }
  x.fillStyle = '#161d30'; x.fillRect(0, G + 4, w, 4); x.fillRect(0, G + 16, w, 4);
  // lawn + sidewalk
  const g2 = x.createLinearGradient(0, G + 24, 0, 420);
  g2.addColorStop(0, '#10182a'); g2.addColorStop(1, '#0a0f1e');
  x.fillStyle = g2; x.fillRect(0, G + 24, w, 420 - G - 24);
  x.fillStyle = '#151b2b'; x.fillRect(0, 366, w, 30);
  x.fillStyle = 'rgba(10,14,26,0.8)';
  for (let s = 0; s < w; s += 42) x.fillRect(s, 366, 2, 30);
  x.fillStyle = 'rgba(26,34,54,0.5)'; x.fillRect(0, 366, w, 2);
  return c;
}

// Jack-o-lantern with flicker (drawn per porch).
export function pumpkin(ctx, x, y, t, seed = 1, s = 1) {
  const flick = 0.75 + 0.25 * hash(seed * 91 + Math.floor(t * 18));
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(s, s);
  ctx.fillStyle = '#c05a12';
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 6.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8821e';
  ctx.beginPath(); ctx.ellipse(-2.5, 0, 5, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#7c3c0c'; ctx.fillRect(-1.5, -8, 3, 3);
  ctx.fillStyle = `rgba(255,214,120,${flick})`;
  ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-1.5, -2); ctx.lineTo(-3, 0.5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(1.5, -2); ctx.lineTo(3, 0.5); ctx.closePath(); ctx.fill();
  ctx.fillRect(-3, 2.5, 6, 1.6);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(255,150,46,${0.16 * flick})`;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill();
  ctx.restore();
}

// ---- the shed -----------------------------------------------------------------

export function bakeShedExt() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(OVER, OVER);
  const G = 440;
  const g = x.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0, '#0a0f22'); g.addColorStop(1, '#101a33');
  x.fillStyle = g; x.fillRect(-OVER, -OVER, w, h);
  // back fence
  x.fillStyle = '#0d1220';
  for (let px = -OVER; px < LW + OVER; px += 16) x.fillRect(px, 250, 9, 90);
  x.fillRect(-OVER, 262, w, 4); x.fillRect(-OVER, 296, w, 4);
  // shed
  const sx = 560, sw = 300, sh = 190;
  x.fillStyle = '#241a16'; x.fillRect(sx, G - sh, sw, sh);
  x.fillStyle = '#2e211b';
  for (let pl = 0; pl < sw; pl += 22) x.fillRect(sx + pl + 2, G - sh + 4, 18, sh - 8); // planks
  x.fillStyle = '#1a120e';
  for (let pl = 24; pl < sw; pl += 22) x.fillRect(sx + pl, G - sh, 2, sh);            // gaps
  x.fillStyle = '#38281f';
  x.beginPath(); x.moveTo(sx - 16, G - sh + 4); x.lineTo(sx + 44, G - sh - 58); x.lineTo(sx + sw + 16, G - sh - 58); x.lineTo(sx + sw + 10, G - sh + 4); x.closePath(); x.fill();
  x.fillStyle = '#4a3527'; x.fillRect(sx - 18, G - sh - 2, sw + 36, 8);                // eave
  x.fillStyle = '#1f1610'; x.fillRect(sx + 60, G - sh - 56, 3, 52);                    // sprung plank gap shadow
  // door gap (the 12px slit)
  x.fillStyle = '#05070d'; x.fillRect(sx + 96, G - 128, 14, 128);
  x.strokeStyle = '#4a3527'; x.lineWidth = 3; x.strokeRect(sx + 96, G - 128, 14, 128);
  // nail rows
  x.fillStyle = '#594334';
  for (let ny = G - sh + 14; ny < G - 10; ny += 34) { x.fillRect(sx + 12, ny, 2, 2); x.fillRect(sx + sw - 14, ny, 2, 2); }
  // yard
  const gg = x.createLinearGradient(0, G, 0, LH);
  gg.addColorStop(0, '#101a2c'); gg.addColorStop(1, '#0a1220');
  x.fillStyle = gg; x.fillRect(-OVER, G, w, LH - G + OVER);
  x.fillStyle = 'rgba(30,44,70,0.5)'; x.fillRect(-OVER, G, w, 2);
  for (let i = 0; i < 70; i++) { // grass tufts
    const gx2 = -OVER + h2(i, 61) * (LW + 2 * OVER), gy = G + 6 + h2(i, 62) * 70;
    x.fillStyle = `rgba(26,40,62,${0.5 + h2(i, 63) * 0.4})`;
    x.fillRect(gx2, gy, 2, 3 + h2(i, 64) * 3);
  }
  // a lone tree, left
  x.fillStyle = '#0c1120'; x.fillRect(120, 200, 12, G - 200);
  x.beginPath(); x.arc(126, 168, 58, 0, 7); x.arc(88, 206, 36, 0, 7); x.arc(166, 200, 40, 0, 7); x.fill();
  return c;
}

export function bakeShedInt() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(OVER, OVER);
  const G = 452;
  x.fillStyle = '#171008'; x.fillRect(-OVER, -OVER, w, h);
  for (let pl = -OVER; pl < LW + OVER; pl += 26) { // wall planks
    x.fillStyle = h2(Math.floor(pl), 71) > 0.5 ? '#241812' : '#201510';
    x.fillRect(pl, -OVER, 24, G - (-OVER));
    x.fillStyle = '#120b06'; x.fillRect(pl + 24, -OVER, 2, G + OVER);
  }
  x.fillStyle = '#3a2a1c';
  for (let ny = -20; ny < G - 20; ny += 44)
    for (let nx = -OVER + 13; nx < LW + OVER; nx += 104) { x.fillRect(nx, ny, 2, 2); }
  // floor
  x.fillStyle = '#1c1410'; x.fillRect(-OVER, G, w, LH - G + OVER);
  x.fillStyle = '#241a12'; x.fillRect(-OVER, G, w, 3);
  for (let fb = 0; fb < 16; fb++) { x.fillStyle = `rgba(10,6,4,${0.3 + fb * 0.03})`; x.fillRect(-OVER, G + 8 + fb * 7, w, 3); }
  // clutter silhouettes
  x.fillStyle = '#0e0906';
  x.fillRect(70, G - 120, 5, 120); x.fillRect(40, G - 128, 66, 9); x.fillRect(52, G - 128, 8, 128); x.fillRect(90, G - 128, 8, 128); // rake
  x.fillRect(210, G - 96, 3, 96); x.fillRect(196, G - 96, 32, 26); // paint can
  x.fillRect(300, G - 70, 86, 70); x.fillStyle = '#150d08'; x.fillRect(306, G - 64, 74, 26); // crate stack
  x.fillStyle = '#0e0906'; x.fillRect(760, G - 110, 62, 8); x.fillRect(774, G - 102, 7, 102); x.fillRect(800, G - 102, 7, 102); // shelf + bucket
  // hanging coat on a nail
  x.fillStyle = '#120c08';
  x.beginPath(); x.moveTo(880, 30); x.lineTo(916, 34); x.lineTo(910, 128); x.quadraticCurveTo(898, 140, 886, 128); x.closePath(); x.fill();
  // old bike rim against the wall
  x.strokeStyle = '#0e0a06'; x.lineWidth = 3;
  x.beginPath(); x.arc(660, G - 46, 34, 0, 7); x.stroke();
  return c;
}

// ---- the bedroom ---------------------------------------------------------------

export function bakeBedroom() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(OVER, OVER);
  const G = 448;
  const g = x.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0, '#1a2036'); g.addColorStop(0.7, '#232a44'); g.addColorStop(1, '#1c2238');
  x.fillStyle = g; x.fillRect(-OVER, -OVER, w, h);
  // wallpaper stripes + dots
  for (let px = -OVER; px < LW + OVER; px += 34) {
    x.fillStyle = 'rgba(255,214,150,0.045)'; x.fillRect(px, -OVER, 12, G + OVER);
    x.fillStyle = 'rgba(255,190,120,0.05)';
    for (let py = 40; py < G - 70; py += 46) {
      x.beginPath(); x.arc(px + 22, py, 2.5, 0, 7); x.fill();
      x.beginPath(); x.arc(px + 6, py + 22, 2, 0, 7); x.fill();
    }
  }
  // baseboard + floor
  x.fillStyle = '#141a2c'; x.fillRect(-OVER, G - 14, w, 14);
  x.fillStyle = 'rgba(120,140,190,0.14)'; x.fillRect(-OVER, G - 14, w, 2);
  const fg = x.createLinearGradient(0, G, 0, LH);
  fg.addColorStop(0, '#2c2033'); fg.addColorStop(1, '#1c1424');
  x.fillStyle = fg; x.fillRect(-OVER, G, w, LH - G + OVER);
  for (let fb = 0; fb < 12; fb++) { x.fillStyle = 'rgba(10,6,14,0.35)'; x.fillRect(-OVER + (fb % 2) * 40, G + 2 + fb * 8, w, 2); }
  // rug
  x.fillStyle = '#3a2a3c'; x.beginPath(); x.ellipse(560, G + 44, 210, 26, 0, 0, 7); x.fill();
  x.fillStyle = '#4c3650'; x.beginPath(); x.ellipse(560, G + 44, 160, 18, 0, 0, 7); x.fill();
  x.fillStyle = '#5c4260'; x.beginPath(); x.ellipse(560, G + 44, 90, 10, 0, 0, 7); x.fill();
  // window, center — night sky shows through (sky painted behind)
  x.fillStyle = '#0a0f22'; x.fillRect(388, 96, 172, 150);
  x.strokeStyle = '#3a3050'; x.lineWidth = 10; x.strokeRect(388, 96, 172, 150);
  x.strokeStyle = '#332a48'; x.lineWidth = 5;
  x.beginPath(); x.moveTo(474, 101); x.lineTo(474, 241); x.moveTo(393, 171); x.lineTo(555, 171); x.stroke();
  // curtains
  x.fillStyle = '#2e2440';
  x.beginPath(); x.moveTo(368, 88); x.quadraticCurveTo(384, 180, 372, 252); x.lineTo(392, 252); x.quadraticCurveTo(398, 170, 392, 88); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(580, 88); x.quadraticCurveTo(564, 180, 576, 252); x.lineTo(556, 252); x.quadraticCurveTo(550, 170, 556, 88); x.closePath(); x.fill();
  x.fillStyle = '#4a3a5c'; x.fillRect(364, 82, 224, 8);
  // bed, left
  x.fillStyle = '#2a2038'; x.fillRect(60, 250, 26, 200); // headboard
  x.fillStyle = '#332646'; x.fillRect(60, 250, 26, 40);
  x.fillStyle = '#3a2c50'; x.fillRect(86, 316, 220, 20);  // mattress
  x.fillStyle = '#5c3e5e'; x.fillRect(86, 300, 214, 20);  // blanket
  x.fillStyle = '#6e4c6e'; x.fillRect(86, 300, 214, 6);
  x.fillStyle = '#e8dcc8'; x.fillRect(92, 282, 58, 22);   // pillow
  x.fillStyle = '#d0c2ac'; x.fillRect(92, 298, 58, 5);
  x.fillStyle = '#241a30'; x.fillRect(84, 336, 12, 114); x.fillRect(294, 336, 12, 114); // legs
  // nightstand + lamp base, right of bed
  x.fillStyle = '#2c2138'; x.fillRect(316, 348, 64, 100);
  x.fillStyle = '#3a2c4c'; x.fillRect(312, 342, 72, 8);
  // door, far left
  x.fillStyle = '#181226'; x.fillRect(-14, 168, 78, 282);
  x.strokeStyle = '#3a2f52'; x.lineWidth = 4; x.strokeRect(-14, 168, 78, 282);
  x.fillStyle = '#2a2140'; x.fillRect(-4, 186, 58, 60); x.fillRect(-4, 258, 58, 90);
  x.fillStyle = '#c9b48a'; x.beginPath(); x.arc(54, 316, 3.4, 0, 7); x.fill();
  // dresser, right + fishbowl spot
  x.fillStyle = '#241c34'; x.fillRect(760, 352, 130, 96);
  x.fillStyle = '#322444'; x.fillRect(754, 344, 142, 10);
  x.fillStyle = '#3a2a4c';
  x.fillRect(772, 372, 46, 6); x.fillRect(838, 372, 46, 6);
  // wall shelf + toy rocket + trophy (E.T. room dressing)
  x.fillStyle = '#3a2c4c'; x.fillRect(660, 220, 120, 8);
  x.fillStyle = '#b8c4d8'; x.fillRect(676, 196, 12, 24); x.beginPath(); x.moveTo(676, 196); x.lineTo(682, 184); x.lineTo(688, 196); x.closePath(); x.fill();
  x.fillStyle = '#c05a3a'; x.beginPath(); x.moveTo(674, 220); x.lineTo(682, 228); x.lineTo(690, 220); x.closePath(); x.fill();
  x.fillStyle = '#d8b24c'; x.fillRect(720, 204, 18, 16); x.fillRect(724, 196, 10, 8); x.fillRect(716, 204, 4, 10); x.fillRect(738, 204, 4, 10);
  // planet mobile, hanging over the bed
  x.strokeStyle = 'rgba(160,170,200,0.5)'; x.lineWidth = 1.4;
  x.beginPath(); x.moveTo(200, -OVER); x.lineTo(200, 78); x.moveTo(152, 78); x.lineTo(248, 78); x.moveTo(160, 78); x.lineTo(160, 104); x.moveTo(240, 78); x.lineTo(240, 98); x.stroke();
  const planet = (px, py, r, col, ring) => {
    x.fillStyle = col; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    if (ring) { x.strokeStyle = 'rgba(200,180,150,0.65)'; x.lineWidth = 1.6; x.beginPath(); x.ellipse(px, py, r * 1.8, r * 0.5, -0.4, 0, 7); x.stroke(); }
  };
  planet(200, 92, 9, '#c8823a', true);
  planet(160, 112, 6, '#5c7ab8');
  planet(240, 106, 7, '#b85c5c');
  return c;
}

// ---- forest / ravine ------------------------------------------------------------

export function bakeForestLayer(w, h, seed, col, density = 30, maxH = 260) {
  const c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = col;
  for (let i = 0; i < density; i++) {
    const tx = h2(i, seed, 1) * w, th = maxH * (0.45 + h2(i, seed, 2) * 0.55), tw = th * 0.34;
    const groundY = h;
    x.fillRect(tx - 2, groundY - th * 0.42, 4, th * 0.42); // trunk
    for (let seg = 0; seg < 5; seg++) {
      const sw2 = tw * (1 - seg * 0.16), sy = groundY - th * (0.34 + seg * 0.15);
      x.beginPath(); x.moveTo(tx - sw2 / 2, sy); x.lineTo(tx, sy - th * 0.16); x.lineTo(tx + sw2 / 2, sy); x.closePath(); x.fill();
    }
  }
  return c;
}

export function bakeRavine() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(OVER, OVER);
  const G = 380;
  x.fillStyle = '#080c1a'; x.fillRect(-OVER, -OVER, w, G);
  // far cliff, RIGHT side (the far bank)
  x.fillStyle = '#101830';
  x.beginPath(); x.moveTo(LW + OVER, G - 40); x.lineTo(880, G - 58); x.lineTo(730, G - 52); x.lineTo(730, G + 60); x.lineTo(LW + OVER, G + 60); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,214,150,0.07)'; // moon rim on the far lip
  x.fillRect(730, G - 60, LW - 730 + OVER, 3);
  // the gap (middle-right): darker with depth, haze bands, brighter river
  const gg = x.createLinearGradient(0, G - 20, 0, LH);
  gg.addColorStop(0, '#05070f'); gg.addColorStop(0.5, '#030409'); gg.addColorStop(1, '#010204');
  x.fillStyle = gg; x.fillRect(620, G - 62, 112, LH - G + 62 + OVER);
  x.fillStyle = 'rgba(20,30,52,0.5)'; x.fillRect(622, G - 20, 108, 14);   // near-edge haze
  x.fillStyle = 'rgba(14,20,38,0.6)'; x.fillRect(624, G + 40, 104, 20);   // mid haze
  x.fillStyle = 'rgba(10,14,28,0.7)'; x.fillRect(626, G + 110, 100, 30);  // deep haze
  x.fillStyle = 'rgba(150,180,220,0.22)'; x.fillRect(628, LH - 48, 96, 6);
  x.fillStyle = 'rgba(200,222,246,0.34)'; x.fillRect(644, LH - 47, 40, 3); x.fillRect(696, LH - 48, 22, 3);
  x.fillStyle = 'rgba(255,222,170,0.12)'; x.fillRect(634, LH - 50, 12, 2); // moonlit ripple
  // near ground (our side), LEFT of the edge
  x.fillStyle = '#141c34';
  x.beginPath(); x.moveTo(-OVER, G - 58); x.lineTo(620, G - 66); x.lineTo(620, LH + OVER); x.lineTo(-OVER, LH + OVER); x.closePath(); x.fill();
  x.fillStyle = '#101828'; x.fillRect(-OVER, G - 66, 620 + OVER, 8);
  x.fillStyle = '#0c1224';
  x.fillRect(612, G - 70, 10, 12); // lip shadow at the edge
  // grass tufts along our lip
  for (let i = 0; i < 26; i++) {
    const gx2 = -OVER + h2(i, 81) * (620 + OVER - 8), gy = G - 72 + h2(i, 82) * 8;
    x.fillStyle = `rgba(40,58,84,${0.5 + h2(i, 83) * 0.4})`;
    x.fillRect(gx2, gy, 2, 4 + h2(i, 84) * 3);
  }
  return c;
}

// ---- the ship -------------------------------------------------------------------

export function bakeShip() {
  const c = canvas(360, 190), x = c.getContext('2d');
  // dome
  x.fillStyle = '#223048';
  x.beginPath(); x.arc(180, 92, 74, Math.PI, 0); x.fill();
  x.fillStyle = '#31425e';
  x.beginPath(); x.arc(180, 92, 74, Math.PI, -0.5); x.fill();
  x.fillStyle = 'rgba(150,190,230,0.28)';
  x.beginPath(); x.ellipse(150, 52, 24, 13, -0.5, 0, 7); x.fill(); // dome sheen
  // hull
  x.fillStyle = '#2c3a52';
  x.beginPath(); x.ellipse(180, 96, 168, 34, 0, 0, 7); x.fill();
  x.fillStyle = '#3c4c68';
  x.beginPath(); x.ellipse(180, 92, 168, 30, 0, Math.PI, 0); x.fill();
  x.fillStyle = '#1c2738';
  x.beginPath(); x.ellipse(180, 104, 168, 22, 0, 0, Math.PI); x.fill();
  // rim window band (amber), arced along the hull ellipse
  for (let i = 0; i < 13; i++) {
    const u = i / 12;
    x.fillStyle = 'rgba(255,196,110,0.9)';
    x.beginPath(); x.arc(34 + u * 292, 92 - Math.sin(u * Math.PI) * 14, 5, 0, 7); x.fill();
  }
  x.fillStyle = 'rgba(255,214,150,0.16)';
  x.beginPath(); x.ellipse(180, 92, 160, 20, 0, Math.PI, 0); x.fill();
  // underbelly
  x.fillStyle = '#141d2c';
  x.beginPath(); x.ellipse(180, 116, 64, 14, 0, 0, 7); x.fill();
  return c;
}

// The Cabald van: grey panel, dark glass, roof light bar, shaved-head roundel. 170×74.
export function bakeVan() {
  const c = canvas(170, 74), x = c.getContext('2d');
  x.fillStyle = '#2a3040';
  x.beginPath();
  x.moveTo(6, 62); x.lineTo(6, 30); x.quadraticCurveTo(8, 16, 30, 14); x.lineTo(58, 14);
  x.quadraticCurveTo(70, 4, 88, 4); x.lineTo(150, 6); x.quadraticCurveTo(164, 8, 164, 24);
  x.lineTo(164, 62); x.closePath(); x.fill();
  x.fillStyle = '#38404f'; x.fillRect(6, 24, 158, 6); // belt line
  // windshield + cab glass
  x.fillStyle = '#0c101a';
  x.beginPath(); x.moveTo(62, 12); x.quadraticCurveTo(72, 6, 86, 6); x.lineTo(92, 26); x.lineTo(62, 26); x.closePath(); x.fill();
  x.fillRect(98, 10, 26, 16); // sliding door window
  x.fillRect(132, 10, 26, 16); // rear window
  // sliding door seam
  x.strokeStyle = '#1c212d'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(96, 8); x.lineTo(96, 62); x.stroke();
  // roof light bar
  x.fillStyle = '#1a1f2b'; x.fillRect(52, 0, 34, 7);
  x.fillStyle = '#9fb4d8'; x.fillRect(56, 1, 10, 4); x.fillRect(72, 1, 10, 4);
  // roundel: bald head in a circle
  x.fillStyle = '#c9d2e2';
  x.beginPath(); x.arc(116, 38, 15, 0, 7); x.fill();
  x.fillStyle = '#a07e63';
  x.beginPath(); x.arc(116, 38, 9, Math.PI, 0); x.fill();
  x.fillRect(107, 38, 18, 3);
  x.fillStyle = '#2a3040'; x.fillRect(107, 42, 18, 4);
  // wheels
  x.fillStyle = '#0a0d14';
  x.beginPath(); x.arc(46, 62, 11, 0, 7); x.arc(136, 62, 11, 0, 7); x.fill();
  x.fillStyle = '#3c4454';
  x.beginPath(); x.arc(46, 62, 4, 0, 7); x.arc(136, 62, 4, 0, 7); x.fill();
  return c;
}

// ---- props ----------------------------------------------------------------------

// Orange shag mop wig (the HAIR HAT). 44×24, anchored at the cap's underside centre.
export function bakeWigMop() {
  const c = canvas(44, 24), x = c.getContext('2d');
  x.fillStyle = '#c46a1c';
  x.beginPath(); x.arc(22, 12, 14, Math.PI, 0); x.fill();
  x.fillRect(8, 12, 28, 4);
  for (let i = 0; i < 7; i++) {
    const lx = 9 + i * 4.4, len = 7 + h2(i, 91) * 4;
    x.fillStyle = i % 2 ? '#d8832a' : '#b85e14';
    x.fillRect(lx, 13, 3, len);
  }
  x.fillStyle = '#e89a42'; x.fillRect(14, 4, 8, 2); x.fillRect(26, 5, 6, 2); // shine
  x.fillStyle = '#8c4410'; x.fillRect(33, 2, 2, 12); // the crooked strand
  x.fillRect(9, 15, 28, 1);
  return c;
}

// Wrapped fun-size candy bar. 16×9, colours per brand.
export function bakeCandy(wrapper = '#d84c4c', foil = '#e8c04c') {
  const c = canvas(16, 9), x = c.getContext('2d');
  x.fillStyle = wrapper; x.fillRect(3, 1, 10, 7);
  x.fillStyle = foil; x.fillRect(0, 2, 3, 5); x.fillRect(13, 2, 3, 5);
  x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(5, 2, 3, 1);
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(3, 7, 10, 1);
  return c;
}

// Sheet ghost costume for B.T. 44×96 — dome + drape down to the pegs, anchored top-centre of the head.
export function bakeSheet() {
  const c = canvas(44, 96), x = c.getContext('2d');
  x.fillStyle = '#e8ecf4';
  x.beginPath(); x.arc(22, 14, 15, Math.PI, 0); x.fill();
  x.fillRect(7, 14, 30, 64);
  // body swell + hem fringe
  x.beginPath(); x.moveTo(7, 30); x.quadraticCurveTo(2, 62, 6, 78); x.lineTo(38, 78); x.quadraticCurveTo(42, 62, 37, 30); x.closePath(); x.fill();
  for (let i = 0; i < 7; i++) x.fillRect(7 + i * 4.4, 78, 3, 8 + (i % 2) * 5);
  // eye holes
  x.fillStyle = '#0c0f18';
  x.beginPath(); x.arc(16, 14, 2.8, 0, 7); x.arc(28, 14, 2.8, 0, 7); x.fill();
  // shading
  x.fillStyle = 'rgba(160,175,205,0.5)'; x.fillRect(10, 4, 10, 2);
  x.fillStyle = 'rgba(120,135,165,0.3)'; x.fillRect(7, 40, 30, 2); x.fillRect(8, 60, 28, 2);
  x.fillStyle = 'rgba(90,105,135,0.25)'; x.fillRect(33, 18, 4, 58); // side shade
  return c;
}

// A simple pointing arm: shoulder at (x, y), reaching toward ang. Rounded, skin tip.
export function pointArm(ctx, x, y, ang, len, sleeve, skin, w = 9) {
  ctx.save();
  ctx.strokeStyle = sleeve; ctx.lineWidth = w + 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len * 0.7, y + Math.sin(ang) * len * 0.7); ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = w - 1;
  ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * len * 0.6, y + Math.sin(ang) * len * 0.6); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
  ctx.restore();
}

// Goldfish bowl — the deadpan punchline prop. 30×26.
export function bakeFishBowl() {
  const c = canvas(30, 28), x = c.getContext('2d');
  x.fillStyle = 'rgba(150,190,220,0.22)';
  x.beginPath(); x.arc(15, 15, 13, 0, 7); x.fill();
  x.strokeStyle = 'rgba(190,214,240,0.6)'; x.lineWidth = 1.6;
  x.beginPath(); x.arc(15, 15, 13, 0, 7); x.stroke();
  x.fillStyle = 'rgba(120,170,210,0.4)'; x.fillRect(4, 8, 22, 2); // water line
  x.fillStyle = '#e8821e'; x.beginPath(); x.ellipse(11, 16, 4, 2.6, 0, 0, 7); x.fill();
  x.fillStyle = '#e8821e'; x.beginPath(); x.moveTo(15, 16); x.lineTo(19, 13.6); x.lineTo(19, 18.4); x.closePath(); x.fill();
  x.fillStyle = '#3a4a66'; x.fillRect(6, 24, 4, 2); x.fillRect(11, 25, 3, 2); x.fillRect(19, 24, 4, 2);
  return c;
}

// ---- live painters (all pure in t) ----------------------------------------------

export const flick = (t, seed, hz = 24) => 0.72 + 0.28 * hash(seed * 91 + Math.floor(t * hz));

// UFO streak: analytic position t0→t1, L→R slight descent, teal core + fading trail.
export function ufoStreak(ctx, t, t0, t1) {
  if (t < t0 - 0.4 || t > t1 + 1.2) return;
  const u = Math.min(1.1, Math.max(-0.1, (t - t0) / (t1 - t0)));
  const x = -70 + u * 1100, y = 96 + u * u * 34 + Math.sin(u * 9) * 4;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i <= 7; i++) { // trail
    const tu = u - i * 0.022;
    if (tu < 0) continue;
    const tx = -70 + tu * 1100, ty = 96 + tu * tu * 34 + Math.sin(tu * 9) * 4;
    ctx.fillStyle = `rgba(90,220,214,${0.4 * (1 - i / 8)})`;
    ctx.fillRect(tx - i * 3, ty - 1 + i * 0.6, 6 + i * 2, 2);
  }
  ctx.fillStyle = 'rgba(140,255,246,0.95)';
  ctx.beginPath(); ctx.ellipse(x, y, 9, 3, 0.12, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 3, y - 1, 6, 2);
  ctx.fillStyle = 'rgba(120,250,240,0.35)';
  ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill();
  ctx.restore();
}

// Hard-edged flashlight cone from (cx, cy) aimed at angle ang, length len.  motes optional.
export function cone(ctx, cx, cy, ang, len, spread, t, col = '206,220,240', a = 0.16, motes = true) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len;
  const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
  const g = ctx.createLinearGradient(cx, cy, ex, ey);
  g.addColorStop(0, `rgba(${col},${a * 1.5})`);
  g.addColorStop(0.8, `rgba(${col},${a * 0.6})`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - px * 3, cy - py * 3);
  ctx.lineTo(cx + px * 3, cy + py * 3);
  ctx.lineTo(ex + px * spread, ey + py * spread);
  ctx.lineTo(ex - px * spread, ey - py * spread);
  ctx.closePath(); ctx.fill();
  if (motes) {
    for (let i = 0; i < 10; i++) {
      const ph = t * (0.2 + hash(i * 7 + 3) * 0.3) + hash(i * 5) * 9;
      const d = ((ph * 70) % len);
      const mx = cx + Math.cos(ang) * d + (hash(i * 3) - 0.5) * 2 * (3 + (d / len) * spread * 0.8) + Math.sin(ph * 2 + i) * 4;
      const my = cy + Math.sin(ang) * d + (hash(i * 9) - 0.5) * 2 * (3 + (d / len) * spread * 0.8);
      ctx.fillStyle = `rgba(224,232,248,${0.08 + 0.08 * Math.sin(ph * 3 + i)})`;
      ctx.fillRect(mx, my, 1.4, 1.4);
    }
  }
  ctx.restore();
}

// Cyan fingertip glow: radial core + spark fountain.
export function fingerGlow(ctx, x, y, t, k = 1, col = '127,247,255') {
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 13 * k);
  g.addColorStop(0, `rgba(${col},${0.9 * k})`);
  g.addColorStop(0.4, `rgba(${col},${0.35 * k})`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 13 * k, 0, 7); ctx.fill();
  ctx.fillStyle = `rgba(230,255,255,${0.95 * k})`;
  ctx.fillRect(x - 1, y - 1, 2, 2);
  for (let i = 0; i < 6; i++) {
    const a = t * 2.2 + i * Math.PI / 3;
    const r = 4 + (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7)) * 7;
    ctx.fillStyle = `rgba(${col},${0.7 * k * (1 - r / 12)})`;
    ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r - t % 1 * 2, 1.4, 1.4);
  }
  ctx.restore();
}

// Four-point sparkle cross, phase-phased.
export function sparkle(ctx, x, y, t, seed = 0, col = '255,236,170', s = 1) {
  const k = Math.max(0, Math.sin(t * 3.1 + seed * 7.7));
  if (k < 0.05) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(${col},${0.9 * k})`;
  const r = 5 * s * k;
  ctx.fillRect(x - r, y - 1 * s, r * 2, 2 * s);
  ctx.fillRect(x - 1 * s, y - r * 2 * s * 0.5, 2 * s, r * s);
  ctx.restore();
}

// The single golden hair: grows from (x, y) upward with a gentle curl.
export function sproutHair(ctx, x, y, grow, t, doneT) {
  if (grow <= 0) return;
  const len = 24 * Math.min(1, grow);
  const wave = doneT > 0 ? Math.sin(doneT * 2.4) * 1.6 : Math.sin(t * 2.4) * 0.6;
  ctx.save();
  ctx.strokeStyle = '#caa54c';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 2 + wave, y - len * 0.55, x + wave * 1.4 - 1.5, y - len);
  ctx.stroke();
  ctx.strokeStyle = '#eed188';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 2 + wave, y - len * 0.55, x + wave * 1.4 - 1.5, y - len);
  ctx.stroke();
  ctx.restore();
}

// The ship's goodbye: a single golden strand with a sparkle head arcing across the sky.
export function hairComet(ctx, t, t0, t1, x0, y0, x1, y1) {
  const u = (t - t0) / (t1 - t0);
  if (u < 0 || u > 1) return;
  const cx = (x0 + x1) / 2, cy = Math.max(70, Math.min(y0, y1) - 90);
  const P = (uu) => [
    (1 - uu) * (1 - uu) * x0 + 2 * (1 - uu) * uu * cx + uu * uu * x1,
    (1 - uu) * (1 - uu) * y0 + 2 * (1 - uu) * uu * cy + uu * uu * y1,
  ];
  const [bx, by] = P(u);
  ctx.save();
  ctx.strokeStyle = 'rgba(238,206,120,0.95)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let i = 0; i <= 26; i++) {
    const [px, py] = P(Math.max(0, u - i * 0.016));
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,190,0.6)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
  sparkle(ctx, bx, by, t, 3, '255,236,170', 2);
  sparkle(ctx, bx + 6, by + 8, t * 1.3, 7, '255,236,170', 1.2);
}

// BMX side view facing right. (x, y) = rear axle. spin = wheel rotation in radians.
export function bike(ctx, x, y, spin, o = {}) {
  const dark = o.dark ?? '#10141f', lite = o.lite ?? '#3c465c', s = o.s ?? 1, glow = o.glow ?? 0;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(o.flip ? -s : s, s);
  if (o.lean) ctx.rotate(o.lean);
  ctx.lineWidth = 2;
  const wheel = (wx) => {
    ctx.strokeStyle = dark; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(wx, 0, 12, 0, 7); ctx.stroke();
    ctx.strokeStyle = lite; ctx.lineWidth = 1;
    for (let k2 = 0; k2 < 3; k2++) {
      const a = spin + (k2 * Math.PI * 2) / 3;
      ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * 10, -Math.sin(a) * 10); ctx.lineTo(wx + Math.cos(a) * 10, Math.sin(a) * 10); ctx.stroke();
    }
    ctx.fillStyle = lite; ctx.fillRect(wx - 1.6, -1.6, 3.2, 3.2);
  };
  wheel(-22); wheel(26);
  // frame
  ctx.strokeStyle = o.frame ?? '#b8482e'; ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-22, 0); ctx.lineTo(-6, -22);            // seat stay → seat tube top
  ctx.moveTo(-22, 0); ctx.lineTo(8, -2);              // chain stay → bb
  ctx.moveTo(8, -2); ctx.lineTo(-6, -22);             // seat tube
  ctx.moveTo(-6, -22); ctx.lineTo(20, -20);           // top tube → head tube
  ctx.moveTo(8, -2); ctx.lineTo(20, -20);             // down tube
  ctx.moveTo(20, -20); ctx.lineTo(26, 0);             // fork
  ctx.stroke();
  // seat post + banana seat
  ctx.strokeStyle = dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(-8, -28); ctx.stroke();
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(-18, -27); ctx.lineTo(-1, -30); ctx.lineTo(2, -25); ctx.lineTo(-15, -23); ctx.closePath(); ctx.fill();
  // handlebars
  ctx.strokeStyle = dark; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(20, -20); ctx.lineTo(22, -32); ctx.lineTo(28, -33); ctx.stroke();
  ctx.fillStyle = lite; ctx.fillRect(27, -35, 4, 3);
  // rear peg (B.T.'s perch)
  ctx.fillStyle = lite; ctx.fillRect(-32, -2, 10, 3.4);
  if (glow > 0.02) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(127,247,255,${0.5 * glow})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(20, -20); ctx.lineTo(22, -32); ctx.stroke();
  }
  ctx.restore();
}

// Iris wipe: evenodd circle; p in [0,1] (1 = fully open).
export function iris(ctx, p, cx, cy, maxR, fill = '#020308') {
  if (p >= 1) return;
  const r = Math.max(0.1, maxR * Math.pow(1 - p, 1.9));
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.rect(-80, -60, LW + 160, LH + 120);
  ctx.moveTo(cx + r, cy);
  ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.restore();
}

// Warm radial pool.
export function warmGlow(ctx, x, y, r, a, col = '255,190,110') {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.5, `rgba(${col},${a * 0.35})`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.restore();
}

// Amber eye glints (B.T. caught in the beam).
export function eyeGlints(ctx, x, y, k, t) {
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const fl = 0.8 + 0.2 * Math.sin(t * 31);
  for (const dx of [-4.5, 4.5]) {
    ctx.fillStyle = `rgba(255,196,84,${0.95 * k * fl})`;
    ctx.fillRect(x + dx - 1.5, y - 1, 3, 2.2);
  }
  ctx.fillStyle = `rgba(255,170,60,${0.16 * k})`;
  ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
  ctx.restore();
}

// Impact ring set from immutable events {g, x, y}.
export function burstRing(ctx, events, worldT, col = '190,220,250') {
  for (const ev of events) {
    const age = worldT - ev.g;
    if (age < 0 || age > 0.35) continue;
    const k = 1 - age / 0.35;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${col},${0.5 * k})`;
    ctx.lineWidth = 2 * k + 0.5;
    ctx.beginPath(); ctx.arc(ev.x, ev.y, 5 + age * 110, 0, 7); ctx.stroke();
    ctx.restore();
  }
}

// Analytic particles from immutable events {g, x, y, seed}.
export function chips(ctx, events, worldT, color = '170,230,220', n = 10) {
  for (const ev of events) {
    const age = worldT - ev.g;
    if (age < 0 || age > 0.9) continue;
    for (let i = 0; i < n; i++) {
      const vx = (hash(ev.seed + i * 3) - 0.5) * 150, vy = -60 - hash(ev.seed + i * 5) * 120;
      const px = ev.x + vx * age, py = ev.y + vy * age + 0.5 * 300 * age * age;
      const a = 1 - age / 0.9;
      ctx.fillStyle = `rgba(${color},${a})`;
      ctx.fillRect(px, py, 2.4, 2.4);
    }
  }
}

export function shadow(ctx, x, foot, w, a = 0.4) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath(); ctx.ellipse(x, foot + 2, w, w * 0.2, 0, 0, 7); ctx.fill();
  ctx.restore();
}

// Ground fog band for the forest.
export function fog(ctx, t, y, k = 1) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = `rgba(120,140,180,${0.05 * k})`;
    const off = Math.sin(t * 0.24 + i * 2.1) * 26;
    ctx.beginPath();
    ctx.ellipse(LW / 2 + off, y + i * 9, LW * 0.62, 15 + i * 5, 0, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

// Darkness with soft light holes (scratch-isolated so punch-outs never erase the scene).
let _dk = null;
export function darknessLite(ctx, a, holes) {
  if (a <= 0) return;
  if (!_dk) _dk = canvas(LW + 96, LH + 96);
  const x = _dk.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, _dk.width, _dk.height);
  x.fillStyle = `rgba(3,4,8,${a})`;
  x.fillRect(0, 0, _dk.width, _dk.height);
  x.globalCompositeOperation = 'destination-out';
  for (const h of holes) {
    const gx = h.x + 48, gy = h.y + 48, soft = h.soft ?? 0.5;
    const g = x.createRadialGradient(gx, gy, h.r * (1 - soft) * 0.5, gx, gy, h.r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(gx, gy, h.r, 0, 7); x.fill();
  }
  ctx.drawImage(_dk, -48, -48);
}
