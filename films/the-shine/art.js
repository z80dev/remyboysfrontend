// THE SHINE — baked pixel sets + light painters. Everything deterministic: hash-seeded, no Math.random.
// All bakes carry OVER px of overscan so real-time camera shake never exposes stale pixels.
import { hash, vnoise } from 'filmkit/lib.js';
import { canvas } from '../remy-bros/art.js';

export const OVER = 24;
export const LW = 960, LH = 540;
export const GROUND = 470; // actor feet line in stage coords
export const CORW = 2240;  // corridor world width

// Corridor furniture (stage x coords). Doors open by swing painter; sconces die in STALK.
export const DOORS = [60, 620, 1180, 1740, 2100]; // 60 = escape, 2100 = barber entry
export const SCONCES = [260, 820, 1380, 1880];
export const WINDOWS = [380, 940, 1500, 2010]; // cx
export const PORTRAIT_X = [560, 1120, 1680]; // cx
export const MIRRORS = [400, 520, 640]; // cx of glass; center (520) is THE mirror
export const MIRROR_GLASS = { y0: 134, y1: 372, half: 40 };

const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const c255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);

// ---- character variants -------------------------------------------------------
// Repaint the hair band of a near sprite to skin → the bald doppelgänger (mirror twist, title sting).
// The hero's flow hair is blonde-with-red-tips and runs a wide luminance ramp, so: classify hair
// first (crown band fully; below it only hair-coloured pixels OUTSIDE the face column, keeping the
// mouth), then remap the whole ramp onto a narrow skin-shade band like a real scalp.
export function baldify(R, skinHex, hairHex) {
  void hairHex;
  const c = canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  const id = x.getImageData(0, 0, R.w, R.h), d = id.data;
  const lum = (i) => (d[i] + d[i + 1] + d[i + 2]) / 3;
  // fixed scalp base: the character's face tone (palette skin, nudged to the sprite's own warmth)
  const fr = 215, fg2 = 190, fb = 176;
  const yEnd = Math.min(R.h, R.top + 64); // flow locks drape to the jaw
  const A = (xx, yy) => (xx < 0 || yy < 0 || xx >= R.w || yy >= R.h ? 0 : d[(yy * R.w + xx) * 4 + 3]);
  const hairPx = [];
  let Lmin = 1e9, Lmax = -1e9;
  for (let y = R.top; y < yEnd; y++) {
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4;
      if (d[i + 3] < 8) continue;
      const L = lum(i);
      const faceCol = y >= R.top + 24 && Math.abs(xx - R.cx) <= 9; // eyes/mouth/cheek column
      if (faceCol || L < 40) continue; // keep the face and true outlines
      hairPx.push({ i, L, edge: A(xx - 1, y) < 8 || A(xx + 1, y) < 8 || A(xx, y - 1) < 8 || A(xx, y + 1) < 8 });
      Lmin = Math.min(Lmin, L); Lmax = Math.max(Lmax, L);
    }
  }
  if (!hairPx.length) return { ...R, c };
  for (const p of hairPx) {
    const u = Lmax > Lmin ? (p.L - Lmin) / (Lmax - Lmin) : 0.5;
    const m = p.edge ? 0.6 : 0.9 + 0.12 * u; // scalp shades gently; outline locks stay dark
    d[p.i] = c255(Math.min(235, fr * m) + (p.edge ? 0 : 4));
    d[p.i + 1] = c255(Math.min(232, fg2 * m) + (p.edge ? 0 : 3));
    d[p.i + 2] = c255(Math.min(229, fb * m * 0.99));
  }
  x.putImageData(id, 0, 0);
  return { ...R, c };
}

export function silhouette(R, color) {
  const c = canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, R.w, R.h);
  return c;
}

// ---- low-res pixel buffer helper (for bakes) ----------------------------------
function pixels(w, h) {
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const set = (x, y, col, a = 255) => {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const [r, g, b] = typeof col === 'string' ? rgbOf(col) : col;
    const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
  };
  return { c, set, done: () => (ctx.putImageData(img, 0, 0), c), w, h };
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// vertical dithered ramp between hex stops; stops = [[t, '#hex'], ...]
function ditherRamp(P, x, y, v, stops) {
  const q = v * 64, b0 = Math.floor(q), f = q - b0;
  const pick = f * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? b0 + 1 : b0;
  const p = Math.min(1, pick / 64);
  let k = 0;
  while (k < stops.length - 2 && p > stops[k + 1][0]) k++;
  const [pa, ca] = [stops[k][0], rgbOf(stops[k][1])], [pb, cb] = [stops[k + 1][0], rgbOf(stops[k + 1][1])];
  const u = Math.min(1, Math.max(0, (p - pa) / (pb - pa || 1)));
  P.set(x, y, [c255(ca[0] + (cb[0] - ca[0]) * u), c255(ca[1] + (cb[1] - ca[1]) * u), c255(ca[2] + (cb[2] - ca[2]) * u)]);
}

// ---- manor exterior (storm) ---------------------------------------------------
export function bakeManor() {
  const w = LW + OVER * 2, h = LH + OVER * 2, P = pixels(w, h);
  const sky = [[0, '#03040c'], [0.42, '#070a18'], [0.7, '#0c1126'], [1, '#141a33']];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) ditherRamp(P, x, y, y / (h - 1), sky);
  // stars
  for (let i = 0; i < 130; i++) {
    const sx = h2(i, 7) * w, sy = h2(i, 8) * h * 0.55, b = h2(i, 9);
    if (b > 0.45) P.set(sx, sy, [200 - b * 40, 208 - b * 40, 235], 90 + b * 140);
  }
  // hill + manor silhouette (drawn dark; lightning re-lights it live)
  const hillTop = 330;
  for (let X = 0; X < w; X++) {
    const rise = Math.max(0, 1 - Math.abs(X - 520) / 700);
    const top = c255(hillTop - 130 * rise * rise - 18 * vnoise(X * 0.01, 3) - 10 * vnoise(X * 0.04, 5));
    for (let Y = top; Y < h; Y++) {
      const shade = h2(X, Y, 11);
      P.set(X, Y, Y < top + 3 ? '#0a0e1d' : shade > 0.5 ? '#0d1224' : '#0b101f');
    }
  }
  // path winding down the hill
  for (let s = 0; s < 200; s++) {
    const u = s / 200;
    const px = 520 + (1 - u) * 130 + Math.sin(u * 3.1) * 150 * (1 - u);
    const py = hillTop + 20 + u * (h - hillTop - 20);
    for (let o = -5; o <= 5; o++) P.set(px + o, py, h2(px + o, py, 13) > 0.7 ? '#242c52' : '#1c2340', 255);
  }
  const c = P.done(), x = c.getContext('2d');
  // moon + halo behind ragged clouds
  const mx = 236, my = 104;
  for (let r = 46; r > 30; r -= 4) { x.fillStyle = `rgba(150,168,208,${0.028 * (46 - r)})`; x.beginPath(); x.arc(mx, my, r, 0, 7); x.fill(); }
  x.fillStyle = '#dfe6f6'; x.beginPath(); x.arc(mx, my, 21, 0, 7); x.fill();
  x.fillStyle = '#b9c4de'; x.beginPath(); x.arc(mx - 6, my + 4, 4, 0, 7); x.arc(mx + 7, my - 5, 3, 0, 7); x.fill();
  x.fillStyle = 'rgba(26,32,58,0.85)'; // cloud slivers crossing the moon
  for (let i = 0; i < 3; i++) { const cy = my - 14 + i * 13; x.beginPath(); x.ellipse(mx - 30 + i * 22, cy, 58 - i * 12, 5, 0, 0, 7); x.fill(); }
  // manor: towers + gabled block + gate, stone tones barely above silhouette
  const stone = '#161c30', stoneHi = '#1d2440', ink = '#070a14';
  const manor = (mx0, top) => {
    x.fillStyle = stone; x.fillRect(mx0, top, 200, hillTop + 26 - top);
    x.fillStyle = stoneHi; x.fillRect(mx0, top, 200, 3);
    // gabled roofs
    x.fillStyle = ink;
    x.beginPath(); x.moveTo(mx0 - 12, top + 46); x.lineTo(mx0 + 100, top - 6); x.lineTo(mx0 + 212, top + 46); x.closePath(); x.fill();
    x.fillRect(mx0 - 10, top + 44, 220, 8);
  };
  manor(420, 208);
  // side towers (pointed caps)
  for (const [tx, ty] of [[388, 158], [566, 172]]) {
    x.fillStyle = stone; x.fillRect(tx, ty, 44, hillTop + 26 - ty);
    x.fillStyle = stoneHi; x.fillRect(tx, ty, 44, 3);
    x.fillStyle = ink;
    x.beginPath(); x.moveTo(tx - 8, ty + 4); x.lineTo(tx + 22, ty - 30); x.lineTo(tx + 52, ty + 4); x.closePath(); x.fill();
    x.fillRect(tx - 7, ty + 2, 58, 7);
  }
  // windows (dead; one lights up live at t≥5)
  const win = (wx, wy, ww, wh) => {
    x.fillStyle = '#0a1122'; x.fillRect(wx, wy, ww, wh);
    x.fillStyle = ink; x.fillRect(wx - 1, wy - 1, ww + 2, 1); x.fillRect(wx - 1, wy + wh, ww + 2, 1);
    x.fillRect(wx + ((ww / 2) | 0), wy, 1, wh); x.fillRect(wx, wy + ((wh / 2) | 0), ww, 1);
  };
  win(452, 240, 14, 20); win(478, 240, 14, 20); win(504, 240, 14, 20); win(530, 240, 14, 20);
  win(452, 286, 14, 20); win(478, 286, 14, 20); win(504, 286, 14, 20); win(530, 286, 14, 20);
  win(398, 196, 10, 16); win(412, 226, 10, 16); win(590, 210, 10, 16); win(604, 240, 10, 16);
  // gate arch
  x.fillStyle = '#05070f';
  x.beginPath(); x.moveTo(496, hillTop + 26); x.lineTo(496, hillTop - 4); x.arc(520, hillTop - 4, 24, Math.PI, 0); x.lineTo(544, hillTop + 26); x.closePath(); x.fill();
  x.strokeStyle = '#1a2138'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(506, hillTop + 26); x.lineTo(506, hillTop + 2); x.moveTo(534, hillTop + 26); x.lineTo(534, hillTop + 2); x.moveTo(520, hillTop - 20); x.lineTo(520, hillTop + 26); x.stroke();
  // dead trees (seeded recursive branches, baked once)
  const tree = (bx, scale, seed) => {
    const x0 = bx, y0 = hillTop + 8;
    x.strokeStyle = '#0a0e1c'; x.lineCap = 'round';
    const branch = (px, py, ang, len, depth) => {
      if (depth === 0 || len < 3) return;
      const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
      x.lineWidth = Math.max(1, depth * 1.1 * scale);
      x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
      const n = 2 + (h2(px | 0, depth, seed) > 0.6 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const sp = (h2(ex | 0, i + depth * 3, seed) - 0.5) * 1.5;
        branch(ex, ey, ang - 0.45 + sp * 0.8, len * (0.62 + h2(ex | 0, i, seed + 1) * 0.16), depth - 1);
      }
    };
    branch(x0, y0, -Math.PI / 2, 34 * scale, 5);
  };
  tree(300, 1.15, 21); tree(760, 0.95, 22);
  return c;
}

// ---- corridor -----------------------------------------------------------------
export function bakeCorridor() {
  const w = CORW + OVER * 2, h = LH + OVER * 2, P = pixels(w, h);
  // ceiling + crown
  for (let y = 0; y < 52; y++) for (let x = 0; x < w; x++) P.set(x, y, y < 40 ? '#0c0910' : '#171019');
  for (let x = 0; x < w; x++) { P.set(x, 52, '#241a22'); P.set(x, 53, '#1d141b'); }
  // wood-panelled wall
  for (let y = 54; y < 330; y++) {
    for (let x = 0; x < w; x++) {
      const plank = Math.floor(x / 32), edge = x % 32;
      let col = '#221812';
      if (edge === 0) col = '#120c09';
      else if (edge === 1) col = '#2c2018';
      else if (edge === 31) col = '#170f0b';
      if (y === 54) col = '#170f0b';
      if (h2(x, y, 17) > 0.94) col = '#1d1410'; // grain flecks
      if (h2(x, y, 18) > 0.965) col = '#281d15';
      P.set(x, y, col);
    }
  }
  // picture rail + wainscot
  for (let x = 0; x < w; x++) { P.set(x, 328, '#100b08'); P.set(x, 329, '#2a1e16'); }
  for (let y = 330; y < 400; y++) {
    for (let x = 0; x < w; x++) {
      const panel = Math.floor(x / 64), p = x % 64, py = y - 330;
      let col = '#191009';
      if (p > 5 && p < 59 && py > 5 && py < 62) {
        col = py === 6 || p === 6 ? '#231610' : py === 61 || p === 58 ? '#0f0a06' : '#1c120b';
        if (h2(x, y, 19) > 0.93) col = '#160e08';
      }
      P.set(x, y, col);
    }
  }
  for (let x = 0; x < w; x++) { P.set(x, 400, '#0c0806'); P.set(x, 401, '#0e0907'); }
  // floorboards
  for (let y = 402; y < h; y++) {
    const depth = (y - 402) / (h - 402);
    for (let x = 0; x < w; x++) {
      const board = Math.floor((x + (y % 12) * 26) / 78);
      let col = depth > 0.62 ? '#1b1410' : '#241a14';
      if (h2(board, Math.floor(y / 3), 23) > 0.7) col = depth > 0.62 ? '#171009' : '#201711';
      if (h2(x, y, 24) > 0.95) col = '#2b2018';
      if (y === 402) col = '#0a0705';
      P.set(x, y, col);
    }
  }
  // worn carpet runner down the middle
  for (let y = 428; y < h - 2; y++) {
    for (let x = 260; x < w - 260; x++) {
      const edge = x - 260 < 6 || w - 260 - x < 6;
      let col = edge ? '#4a1c1c' : '#33131a';
      if (edge && ((x + y) % 14 < 7)) col = '#57201f'; // woven border pattern
      if (!edge) {
        if ((x + y * 2) % 40 < 2) col = '#3d1820'; // subtle stripe
        if (h2(x, y, 25) > 0.9) col = '#291016'; // wear
        if (h2(x, y, 26) > 0.975) col = '#452028';
      }
      if (y === 428 || y === h - 3) col = '#1f0c10';
      P.set(x, y, col);
    }
  }
  const c = P.done(), x = c.getContext('2d');
  // claw scratches near the escape door
  x.strokeStyle = '#0d0906'; x.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    x.beginPath(); x.moveTo(196 + i * 7, 232); x.lineTo(184 + i * 9, 296); x.stroke();
  }
  // cobweb corners
  x.strokeStyle = 'rgba(190,200,220,0.10)'; x.lineWidth = 1;
  for (const cx of [60, 1180]) {
    for (let r = 8; r < 30; r += 7) { x.beginPath(); x.arc(cx, 56, r, 0, Math.PI / 2); x.stroke(); }
    x.beginPath(); x.moveTo(cx, 56); x.lineTo(cx + 30, 84); x.stroke();
  }
  return c;
}

// doors live (they swing). open: 0 closed → 1 swung ~110°. side 'right' hinges left (opens rightward),
// side 'left' hinges right (opens leftward — the escape door bursts outward toward camera-left).
export function door(ctx, x, open, side = 'right') {
  const w = 108, top = 220, foot = GROUND + 2, dh = foot - top;
  ctx.fillStyle = '#060409'; ctx.fillRect(x, top, w, foot - top); // doorway void
  ctx.fillStyle = '#171310'; ctx.fillRect(x - 4, top - 6, w + 8, 6); // lintel
  ctx.save();
  ctx.translate(side === 'left' ? x + w : x, foot); // hinge foot
  ctx.rotate(side === 'left' ? open * -1.9 : open * 1.9);
  const ox = side === 'left' ? -w : 0; // leaf extends away from the hinge
  for (let py = 0; py < dh; py += 4) {
    for (let px = 0; px < w; px += 4) {
      const plank = Math.floor(px / 22);
      ctx.fillStyle = px % 22 === 0 ? '#140d08' : h2(plank, py, 27) > 0.9 ? '#1c130c' : '#231710';
      ctx.fillRect(ox + px, py - dh, 4, 4);
    }
  }
  ctx.fillStyle = '#2c2418'; // iron hinges
  ctx.fillRect(ox + 6, -dh + 26, 16, 5); ctx.fillRect(ox + 6, -46, 16, 5);
  ctx.fillStyle = '#6a5a3a'; ctx.fillRect(ox + (side === 'left' ? w - 16 : 12), -dh / 2 - 3, 5, 8);
  ctx.restore();
}

// window (fixed) baked into corridor; rain + lightning glow live inside.
export function bakeWindows(c) {
  const x = c.getContext('2d');
  for (const cx of WINDOWS) {
    const w = 88, x0 = cx - w / 2, top = 178, foot = 400;
    x.fillStyle = '#0c0a12'; x.fillRect(x0 - 5, top - 5, w + 10, foot - top + 10); // stone reveal
    x.fillStyle = '#0e1526'; x.fillRect(x0, top, w, foot - top); // night glass base
    // pointed arch top
    x.fillStyle = '#0c0a12';
    x.beginPath(); x.moveTo(x0 - 5, top + 20); x.lineTo(cx, top - 26); x.lineTo(x0 + w + 5, top + 20); x.lineTo(x0 + w + 5, top - 5); x.lineTo(x0 - 5, top - 5); x.closePath(); x.fill();
    x.save();
    x.beginPath(); x.moveTo(x0, top + 22); x.lineTo(cx, top - 22); x.lineTo(x0 + w, top + 22); x.lineTo(x0 + w, foot); x.lineTo(x0, foot); x.closePath(); x.clip();
    x.fillStyle = '#101a30'; x.fillRect(x0, top - 30, w, 60);
    x.restore();
    // leaded diamond mullions
    x.strokeStyle = '#05040a'; x.lineWidth = 2;
    x.save();
    x.beginPath(); x.moveTo(x0, top + 22); x.lineTo(cx, top - 22); x.lineTo(x0 + w, top + 22); x.lineTo(x0 + w, foot); x.lineTo(x0, foot); x.closePath(); x.clip();
    for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(x0 + (w / 4) * i, top - 24); x.lineTo(x0 + (w / 4) * i, foot); x.stroke(); }
    for (let j = 0; j < 7; j++) { const yy = top + 8 + j * 30; x.beginPath(); x.moveTo(x0, yy); x.lineTo(x0 + w, yy - 8); x.stroke(); }
    x.restore();
    x.strokeStyle = '#1c1620'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(x0 - 2, top + 22); x.lineTo(cx, top - 24); x.lineTo(x0 + w + 2, top + 22); x.stroke();
  }
  return c;
}

// sconce bracket (flame live)
export function sconceArm(ctx, sx) {
  ctx.fillStyle = '#171310'; ctx.fillRect(sx - 3, 208, 6, 26);
  ctx.fillStyle = '#221d18'; ctx.fillRect(sx - 9, 200, 18, 8);
  ctx.fillStyle = '#6a5a3a'; ctx.fillRect(sx - 4, 196, 8, 4);
}

// portrait frame with an original render inside (wall ancestors). img may be null (caller fills it).
export function portraitFrame(ctx, img, cx, cy, fw, fh, dim = 0) {
  const x0 = cx - fw / 2, y0 = cy - fh / 2;
  // gilt back first — the image sits ON it, never under it
  ctx.fillStyle = '#4a3a18'; ctx.fillRect(x0 - 7, y0 - 7, fw + 14, fh + 14);
  ctx.fillStyle = '#0a0709'; ctx.fillRect(x0 - 2, y0 - 2, fw + 4, fh + 4); // inner void
  if (img) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, fw, fh); ctx.clip();
    const s = Math.max(fw / img.width, fh / img.height);
    ctx.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
    if (dim) { ctx.fillStyle = `rgba(6,6,14,${dim})`; ctx.fillRect(x0, y0, fw, fh); }
    ctx.restore();
  }
  // frame bevels + corner rosettes
  ctx.fillStyle = '#6b5626'; ctx.fillRect(x0 - 7, y0 - 7, fw + 14, 2); ctx.fillRect(x0 - 7, y0 - 7, 2, fh + 14);
  ctx.fillStyle = '#31250e'; ctx.fillRect(x0 - 7, y0 + fh + 5, fw + 14, 2); ctx.fillRect(x0 + fw + 5, y0 - 7, 2, fh + 14);
  ctx.fillStyle = '#8a7434';
  for (const [rx, ry] of [[x0 - 7, y0 - 7], [x0 + fw + 5, y0 - 7], [x0 - 7, y0 + fh + 5], [x0 + fw + 5, y0 + fh + 5]]) ctx.fillRect(rx, ry, 4, 4);
  // name plate
  ctx.fillStyle = '#3d3116'; ctx.fillRect(cx - 22, y0 + fh + 9, 44, 7);
  ctx.fillStyle = '#191307'; ctx.fillRect(cx - 16, y0 + fh + 11, 32, 2);
}

// eye glint during lightning (two pale pixels per portrait)
export function eyeGlints(ctx, cx, cy, k) {
  if (k <= 0) return;
  ctx.fillStyle = `rgba(226,236,255,${0.75 * k})`;
  ctx.fillRect(cx - 8, cy - fh2(cy), 2, 2); ctx.fillRect(cx + 6, cy - fh2(cy), 2, 2);
}
const fh2 = (cy) => 18;

// ---- barber room ---------------------------------------------------------------
export function bakeBarber() {
  const w = LW + OVER * 2, h = LH + OVER * 2, P = pixels(w, h);
  // ceiling
  for (let y = 0; y < 52; y++) for (let x = 0; x < w; x++) P.set(x, y, y < 38 ? '#0b070d' : '#140d12');
  for (let x = 0; x < w; x++) P.set(x, 52, '#231722');
  // wallpaper: dark green damask dots
  for (let y = 54; y < 340; y++) {
    for (let x = 0; x < w; x++) {
      const dot = ((Math.floor(x / 24) * 24 + Math.floor(y / 26) * 13) | 0);
      const on = ((x % 24) - 12) ** 2 + ((y % 26) - 13) ** 2 < 14 && h2(dot, y, 31) > 0.2;
      P.set(x, y, on ? '#20302a' : '#16221d');
      if (h2(x, y, 32) > 0.96) P.set(x, y, '#121c17'); // damp stains
    }
  }
  // picture rail + lower wood panel
  for (let x = 0; x < w; x++) P.set(x, 338, '#0f0a06');
  for (let y = 340; y < 428; y++) {
    for (let x = 0; x < w; x++) {
      const p = x % 80, py = y - 340;
      let col = '#1c120b';
      if (p > 6 && p < 74 && py > 6 && py < 76) col = py === 7 || p === 7 ? '#251810' : py === 75 || p === 73 ? '#100a06' : '#1e140c';
      P.set(x, y, col);
    }
  }
  for (let x = 0; x < w; x++) { P.set(x, 428, '#0b0705'); P.set(x, 429, '#0d0906'); }
  // checker floor with mild perspective (5 rows, tiles widen downward)
  const rows = [[430, 12], [442, 14], [456, 17], [473, 21], [494, 26], [520, 32]];
  for (let r = 0; r < rows.length; r++) {
    const [y0, th] = rows[r];
    const y1 = r + 1 < rows.length ? rows[r + 1][0] : h;
    const tw = 30 + r * 9;
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < w; x++) {
        const row = Math.floor(x / tw) + r; // diagonal skew via r
        const dark = (row % 2) === 0;
        let col = dark ? '#17131d' : '#332d31';
        if (h2(x, y, 33) > 0.93) col = dark ? '#121019' : '#2c262a'; // wear
        if (h2(x, y, 34) > 0.976) col = dark ? '#221c28' : '#3c363a';
        P.set(x, y, col);
      }
      if (y === y0) for (let x = 0; x < w; x++) P.set(x, y, '#0b080c');
    }
  }
  const c = P.done(), x = c.getContext('2d');
  // hanging lamp (cold, off) center
  x.fillStyle = '#100c14'; x.fillRect(492, 0, 4, 44);
  x.fillStyle = '#1d1a24'; x.beginPath(); x.moveTo(478, 44); x.lineTo(510, 44); x.lineTo(502, 60); x.lineTo(486, 60); x.closePath(); x.fill();
  x.fillStyle = '#0d0b12'; x.fillRect(486, 60, 16, 8);
  return c;
}

// mirrors (fixed) onto barber bake; reflections drawn live, clipped to glass.
export function bakeMirrors(c) {
  const x = c.getContext('2d');
  for (const cx of MIRRORS) {
    const { y0, y1, half } = MIRROR_GLASS;
    const x0 = cx - half, w = half * 2;
    x.fillStyle = '#3d3012'; x.fillRect(x0 - 8, y0 - 36, w + 16, y1 - y0 + 44); // gilt back
    x.fillStyle = '#5c4a1e'; x.fillRect(x0 - 8, y0 - 36, w + 16, 3);
    // arched glass
    x.save();
    x.beginPath();
    x.moveTo(x0, y1); x.lineTo(x0, y0 + 30); x.quadraticCurveTo(cx, y0 - 42, x0 + w, y0 + 30); x.lineTo(x0 + w, y1); x.closePath();
    x.clip();
    const g = x.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#2b323c'); g.addColorStop(0.6, '#20262e'); g.addColorStop(1, '#161a20');
    x.fillStyle = g; x.fillRect(x0 - 8, y0 - 44, w + 16, y1 - y0 + 48);
    x.strokeStyle = 'rgba(200,220,240,0.05)'; x.lineWidth = 3;
    for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(x0 + 6 + i * 14, y0 - 40); x.lineTo(x0 - 12 + i * 22, y1); x.stroke(); }
    x.restore();
    x.strokeStyle = '#6b5626'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(x0, y1); x.lineTo(x0, y0 + 30); x.quadraticCurveTo(cx, y0 - 42, x0 + w, y0 + 30); x.lineTo(x0 + w, y1); x.stroke();
    // candle shelf sconces between mirrors
    x.fillStyle = '#241a10'; x.fillRect(cx - 14, 348, 28, 5);
  }
  return c;
}

// barber chair (procedural, facing slightly right)
export function chair(ctx, cx, foot, k = 1) {
  const s = (v) => Math.round(v * k);
  ctx.fillStyle = '#0e0a0c'; // base disc
  ctx.beginPath(); ctx.ellipse(cx, foot, s(34), s(9), 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a2a30'; ctx.fillRect(cx - s(6), foot - s(60), s(12), s(60)); // column
  ctx.fillStyle = '#3a3a42'; ctx.fillRect(cx - s(6), foot - s(60), s(4), s(60));
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(cx, foot - s(2), s(30), s(7), 0, 0, 7); ctx.fill();
  // leather seat + back (worn oxblood)
  ctx.fillStyle = '#3d1d26'; ctx.fillRect(cx - s(30), foot - s(96), s(60), s(20));
  ctx.fillStyle = '#54262f'; ctx.fillRect(cx - s(30), foot - s(96), s(60), s(4));
  ctx.fillStyle = '#331720'; ctx.fillRect(cx - s(28), foot - s(94), s(8), s(16));
  ctx.save(); // backrest tilted
  ctx.translate(cx + s(24), foot - s(120)); ctx.rotate(-0.16);
  ctx.fillStyle = '#3d1d26'; ctx.fillRect(-s(8), 0, s(18), s(70));
  ctx.fillStyle = '#54262f'; ctx.fillRect(-s(8), 0, s(18), s(5));
  ctx.fillStyle = '#2a141b'; for (let i = 0; i < 3; i++) ctx.fillRect(-s(5) + s(4) * i, s(18), s(2), s(34)); // cracks
  ctx.restore();
  ctx.fillStyle = '#484850'; // chrome arm
  ctx.fillRect(cx - s(36), foot - s(88), s(26), s(5));
  ctx.fillStyle = '#2a2a30'; ctx.fillRect(cx - s(10), foot - s(86), s(5), s(26));
  // footrest
  ctx.fillStyle = '#2e2e34'; ctx.fillRect(cx - s(64), foot - s(18), s(26), s(6));
  ctx.fillStyle = '#1c1c22'; ctx.fillRect(cx - s(62), foot - s(12), s(22), s(4));
}

// gramophone on side table; horn flare k = music pulse 0..1
export function gramophone(ctx, gx, foot, k) {
  ctx.fillStyle = '#1c130c'; ctx.fillRect(gx - 34, foot - 44, 68, 44); // table
  ctx.fillStyle = '#241a10'; ctx.fillRect(gx - 34, foot - 44, 68, 4);
  ctx.fillStyle = '#12100e'; ctx.fillRect(gx - 18, foot - 66, 36, 22); // box
  ctx.fillStyle = '#8a7434'; ctx.fillRect(gx - 12, foot - 63, 24, 3);
  ctx.fillStyle = '#3a3020'; ctx.fillRect(gx + 14, foot - 58, 10, 4); // crank
  // brass horn opening up-left, flares with the music
  ctx.save();
  ctx.translate(gx - 8, foot - 70); ctx.rotate(-0.62 - k * 0.05);
  const fl = 1 + k * 0.1;
  ctx.fillStyle = '#7c6228';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -34 * fl); ctx.lineTo(11, -40 * fl); ctx.lineTo(7, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9c8038';
  ctx.beginPath(); ctx.ellipse(1, -37 * fl, 12 * fl, 8 * fl, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#4e3c16';
  ctx.beginPath(); ctx.ellipse(1, -37 * fl, 7 * fl, 4.6 * fl, 0, 0, 7); ctx.fill();
  ctx.restore();
}

// razor: handle + open blade. k=1 flying (rot spins), k=2 embedded tip. Drawn 2× for camera legibility.
export function razor(ctx, x, y, rot, k = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(2.4, 2.4);
  ctx.fillStyle = '#151318'; ctx.fillRect(-14, -2, 12, 4); // handle
  ctx.fillStyle = '#2c2830'; ctx.fillRect(-14, -2, 12, 1);
  ctx.fillStyle = '#b9c2cc'; ctx.fillRect(-2, -3, 14, 5); // blade
  ctx.fillStyle = '#eef3f8'; ctx.fillRect(-2, -3, 14, 1); // edge
  ctx.fillStyle = '#5c646e'; ctx.fillRect(-2, 1, 14, 1);
  if (k === 2) { ctx.fillStyle = '#0a0806'; ctx.fillRect(10, -4, 3, 7); } // buried in wood
  ctx.restore();
}

// ---- light / atmosphere painters (all pure in t) --------------------------------
export const flick = (t, seed, hz = 24) => 0.72 + 0.28 * hash(seed * 91 + Math.floor(t * hz));

export function flame(ctx, x, y, s, t, seed) {
  const k = flick(t, seed);
  const hgt = 10 * s * k, wd = 3.2 * s * (2 - k);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(255,150,40,${0.5 * k})`;
  ctx.beginPath(); ctx.ellipse(x, y - hgt / 2, wd * 1.9, hgt * 0.75, 0, 0, 7); ctx.fill();
  ctx.fillStyle = `rgba(255,214,120,${0.85 * k})`;
  ctx.beginPath(); ctx.ellipse(x, y - hgt * 0.42, wd, hgt * 0.55, 0, 0, 7); ctx.fill();
  ctx.fillStyle = `rgba(255,246,214,${0.9 * k})`;
  ctx.fillRect(x - 0.8, y - hgt * 0.5, 1.6, hgt * 0.3);
  ctx.restore();
  return k;
}

export function warmGlow(ctx, x, y, r, a, col = '255,190,110') {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.5, `rgba(${col},${a * 0.35})`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.restore();
}

// darkness with light holes: composited on a scratch layer so the punch-outs
// never erase the scene beneath them (destination-out on the main canvas would).
let _dk = null;
export function darkness(ctx, a, holes) {
  if (a <= 0) return;
  if (!_dk) _dk = canvas(LW + 96, LH + 96);
  const x = _dk.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, _dk.width, _dk.height);
  x.fillStyle = `rgba(3,4,10,${a})`;
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

export function bolt(ctx, x0, y0, x1, y1, seed, k) {
  if (k <= 0.02) return;
  const segs = 9;
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 2.8); // strobes must survive grain + sky flash lift
  ctx.strokeStyle = 'rgba(190,210,255,0.5)'; ctx.lineWidth = 5;
  for (const [wd, col] of [[5, 'rgba(160,185,240,0.35)'], [2.4, 'rgba(225,236,255,0.95)'], [1, '#ffffff']]) {
    ctx.strokeStyle = col; ctx.lineWidth = wd;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let i = 1; i < segs; i++) {
      const u = i / segs;
      const jx = (hash(seed * 77 + i) - 0.5) * 46 * Math.sin(u * Math.PI);
      ctx.lineTo(x0 + (x1 - x0) * u + jx, y0 + (y1 - y0) * u);
    }
    ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.restore();
}

export function rain(ctx, t, k, wind = -160) {
  const n = Math.round(90 * k);
  ctx.save();
  ctx.strokeStyle = `rgba(158,178,222,${0.16 + 0.1 * k})`; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = 540 + hash(i * 3 + 1) * 320;
    const px = ((hash(i) * (LW + 200) + t * wind - i * 13) % (LW + 240) + LW + 240) % (LW + 240) - 120;
    const py = ((hash(i + 99) * (LH + 100) + t * sp) % (LH + 140)) - 60;
    ctx.moveTo(px, py); ctx.lineTo(px + wind * 0.02, py + 11);
  }
  ctx.stroke(); ctx.restore();
}

export function rainWin(ctx, rect, t, k) {
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  ctx.strokeStyle = `rgba(150,170,215,${0.3 * k})`; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const sp = 300 + hash(i * 7 + 4) * 160;
    const px = ((hash(i * 5 + 2) * (rect.w + 20) + t * -46 - i * 7) % (rect.w + 20) + rect.w + 20) % (rect.w + 20) + rect.x - 10;
    const py = rect.y + ((hash(i * 11 + 6) * rect.h + t * sp) % (rect.h + 10)) - 5;
    ctx.moveTo(px, py); ctx.lineTo(px - 2, py + 8);
  }
  ctx.stroke(); ctx.restore();
}

export function fog(ctx, t, y0, hgt, seed, alpha) {
  ctx.save();
  for (let b = 0; b < 3; b++) {
    const yb = y0 + (hgt / 3) * b;
    for (let cx = 0; cx < LW + 64; cx += 16) {
      const n = vnoise(cx * 0.008 + t * (0.024 + b * 0.011) + seed * 9 + b * 5, seed + b);
      const a = alpha * Math.max(0, n - 0.42) * (1.5 - b * 0.3);
      if (a <= 0.004) continue;
      ctx.fillStyle = `rgba(58,68,96,${a})`;
      const bh = 10 + b * 6;
      ctx.fillRect(cx - 8, yb + Math.sin(cx * 0.05 + t * 0.5 + b) * 3, 16, bh);
    }
  }
  ctx.restore();
}

export function dust(ctx, t, x0, y0, w, h, n, seed) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const bx = x0 + hash(seed + i * 3) * w, by = y0 + hash(seed + i * 7) * h;
    const ph = t * (0.3 + hash(seed + i) * 0.5) + i;
    const x = bx + Math.sin(ph) * 7, y = by + Math.cos(ph * 0.7) * 5 - ((t * 4 + hash(i) * 40) % 40);
    const a = 0.14 + 0.14 * Math.sin(ph * 1.7);
    if (a <= 0) continue;
    ctx.fillStyle = `rgba(226,220,200,${a})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();
}

export function smokeWisp(ctx, t0, t, x, y) {
  const age = t - t0;
  if (age < 0 || age > 1.6) return;
  const a = 0.3 * (1 - age / 1.6);
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const u = i / 5;
    ctx.fillStyle = `rgba(150,156,170,${a * (1 - u)})`;
    ctx.fillRect(x + Math.sin(age * 3 + i) * (2 + u * 6), y - age * (14 + i * 7), 2, 2);
  }
  ctx.restore();
}

export function shadow(ctx, x, foot, w, a = 0.4) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath(); ctx.ellipse(x, foot + 3, w, w * 0.22, 0, 0, 7); ctx.fill();
  ctx.restore();
}

// jagged white grin for the doppelgänger (drawn over the bald head)
export function grin(ctx, x, y, w, alpha) {
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(240,244,250,${alpha})`;
  const teeth = 7;
  for (let i = 0; i < teeth; i++) {
    const u = i / (teeth - 1);
    const gx = x - w / 2 + u * w;
    const gy = y + Math.sin(u * Math.PI) * 3;
    ctx.fillRect(gx, gy, w / teeth - 1, 3);
    ctx.fillRect(gx, gy + 3, Math.max(1, w / teeth - 3), 1.4);
  }
}

// wood chips / sparks: analytic particles from immutable events {g, x, y, seed}
export function chips(ctx, events, worldT, color = '160,120,70', n = 10) {
  for (const ev of events) {
    const age = worldT - ev.g;
    if (age < 0 || age > 0.9) continue;
    for (let i = 0; i < n; i++) {
      const vx = (hash(ev.seed + i * 3) - 0.5) * 160, vy = -60 - hash(ev.seed + i * 5) * 130;
      const px = ev.x + vx * age, py = ev.y + vy * age + 0.5 * 300 * age * age;
      const a = 1 - age / 0.9;
      ctx.fillStyle = `rgba(${color},${a})`;
      ctx.fillRect(px, py, 2, 2);
    }
  }
}

export async function loadOrig(id) {
  const i = new Image();
  i.src = new URL(`../../media/remy/Character${id}.webp`, import.meta.url).href;
  await i.decode();
  return i;
}
