// FADE TO BALD — baked pixel sets + character repaints + atmosphere painters.
// Everything deterministic: hash-seeded, no Math.random, every painter pure in t.
// Palette is authored as cool monochrome values — hair-coloured characters carry the only hue.
import { hash, vnoise } from 'filmkit/lib.js';
import { canvas } from '../remy-bros/art.js';

export const OVER = 40;
export const LW = 960, LH = 540;

const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const c255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);

// ---- character repaints -------------------------------------------------------

// Noir duotone: grayscale the rig, then tint it with the character's hair hue (k = strength),
// then a light multiply gradient so figures keep volume. Hand-tinted-postcard look.
export function duo(R, hue, k = 0.55) {
  const c = canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  x.globalCompositeOperation = 'saturation';
  x.fillStyle = '#808080';
  x.fillRect(0, 0, R.w, R.h);
  x.globalCompositeOperation = 'color';
  x.globalAlpha = k;
  x.fillStyle = hue;
  x.fillRect(0, 0, R.w, R.h);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'multiply';
  const g = x.createLinearGradient(0, R.top, 0, R.bottom);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#c8c8c8');
  x.fillStyle = g;
  x.fillRect(0, 0, R.w, R.h);
  x.globalCompositeOperation = 'source-over';
  return { ...R, c };
}

// Peel the hair band off a near sprite → bare scalp underneath (the wig twist).
// Scalp base is parametrised: pass the character's own skin tone (shrine-style ramp).
export function baldify(R, skinHex) {
  const [sr, sg, sb] = rgbOf(skinHex);
  const fr = Math.min(235, sr * 1.08), fg2 = Math.min(232, sg * 1.08), fb = Math.min(229, sb * 1.08);
  const c = canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  const id = x.getImageData(0, 0, R.w, R.h), d = id.data;
  const lum = (i) => (d[i] + d[i + 1] + d[i + 2]) / 3;
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

// The wig itself: crimson cap + flowing locks, peeled off at the reveal.
// 48×46 px, anchored at the cap's underside centre.
export function bakeWig(hue) {
  const c = canvas(48, 46), x = c.getContext('2d');
  const [r, g, b] = rgbOf(hue);
  const col = (m, a = 1) => `rgba(${c255(r * m)},${c255(g * m)},${c255(b * m)},${a})`;
  // cap dome
  x.fillStyle = col(0.92);
  x.beginPath(); x.arc(24, 18, 15, Math.PI, 0); x.fill();
  x.fillRect(9, 18, 30, 4);
  // flowing locks
  for (let i = 0; i < 5; i++) {
    const lx = 10 + i * 7, len = 20 + h2(i, 3) * 10;
    x.fillStyle = col(0.86 + h2(i, 9) * 0.18);
    x.beginPath();
    x.moveTo(lx, 20);
    x.quadraticCurveTo(lx - 3, 20 + len * 0.6, lx + (i % 2 ? 3 : -3), 22 + len);
    x.quadraticCurveTo(lx + 5, 20 + len * 0.55, lx + 6, 20);
    x.closePath(); x.fill();
  }
  // shine band + outline hint
  x.fillStyle = col(1.6);
  x.fillRect(13, 8, 12, 2);
  x.fillRect(28, 9, 8, 2);
  x.fillStyle = col(0.45);
  x.fillRect(9, 21, 30, 1);
  return c;
}

// ---- baked sets ---------------------------------------------------------------

// Sky + skyline strip (used behind skyline/streets/rooftop/coda, tiled or cropped).
export function bakeSky(tint = 1) {
  const w = LW + 200, h = 460, c = canvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, tint ? '#04050b' : '#05060c');
  g.addColorStop(0.55, '#0a0f1a');
  g.addColorStop(1, '#131a28');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // haze moon behind cloud ribs
  x.fillStyle = 'rgba(214,222,236,0.13)';
  x.beginPath(); x.arc(196, 118, 52, 0, 7); x.fill();
  x.fillStyle = 'rgba(232,238,248,0.32)';
  x.beginPath(); x.arc(196, 118, 34, 0, 7); x.fill();
  for (let i = 0; i < 5; i++) {
    const cy = 96 + i * 16, cw = 150 + h2(i, 21) * 220;
    const cx = 90 + h2(i, 33) * (w - 200);
    x.fillStyle = `rgba(10,13,22,${0.5 + h2(i, 5) * 0.2})`;
    x.beginPath(); x.ellipse(cx, cy, cw * 0.5, 13 + h2(i, 7) * 8, 0, 0, 7); x.fill();
  }
  // far row: dim blocks
  let bx = 0;
  while (bx < w) {
    const bw = 40 + h2(bx, 1) * 58, bh = 90 + h2(bx, 2) * 130;
    x.fillStyle = '#0b0f18';
    x.fillRect(bx, h - 150 - bh, bw, bh + 150);
    bx += bw + 3 + h2(bx, 3) * 9;
  }
  // near row: darker towers + sparse lit windows + beacons
  const beacons = [];
  bx = 6;
  while (bx < w) {
    const bw = 44 + h2(bx, 11) * 62, bh = 130 + h2(bx, 12) * 180;
    const shade = 15 + h2(bx, 13) * 10;
    x.fillStyle = `rgb(${shade},${shade + 4},${shade + 16})`;
    x.fillRect(bx, h - 120 - bh, bw, bh + 120);
    x.fillStyle = `rgba(${shade + 6},${shade + 10},${shade + 20},0.9)`;
    x.fillRect(bx, h - 120 - bh, bw, 3); // roof line catch
    for (let cy = h - 118 - bh + 10; cy < h - 140; cy += 14) {
      for (let cx = bx + 5; cx < bx + bw - 6; cx += 10) {
        const k = h2(cx, cy);
        if (k > 0.84) x.fillStyle = k > 0.955 ? 'rgba(214,226,244,0.8)' : 'rgba(178,196,222,0.5)';
        else continue;
        x.fillRect(cx, cy, 4, 6);
      }
    }
    if (bh > 250) { beacons.push([bx + bw / 2, h - 120 - bh - 6]); }
    bx += bw + 4 + h2(bx, 14) * 12;
  }
  return { c, beacons };
}

// Wet street under the skyline: sidewalk, curb, asphalt, static puddle stains.
export function bakeStreetBase() {
  const w = LW + 200, h = 120, c = canvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a2029');
  g.addColorStop(0.3, '#12171f');
  g.addColorStop(1, '#0b0e14');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = '#232b37'; x.fillRect(0, 0, w, 4); // sidewalk edge catch
  x.fillStyle = '#0e1219'; x.fillRect(0, 26, w, 3); // curb shadow
  for (let i = 0; i < 90; i++) { // seams + stains
    const sx = h2(i, 41) * w, sy = 8 + h2(i, 42) * 108;
    x.fillStyle = `rgba(6,8,12,${0.25 + h2(i, 43) * 0.3})`;
    x.fillRect(sx, sy, 1 + h2(i, 44) * 26, 1 + h2(i, 45) * 2);
  }
  return c;
}

// Street facade strip behind the sidewalk: shopfronts, awnings, doors (signs are drawn live).
export function bakeFacades() {
  const w = 1920 + 240, h = 300, c = canvas(w, h), x = c.getContext('2d');
  const G = 290; // ground line within the strip
  let bx = 0;
  while (bx < w) {
    const bw = 150 + h2(bx, 51) * 120, bh = 150 + h2(bx, 52) * 90;
    const shade = 20 + h2(bx, 53) * 12;
    x.fillStyle = `rgb(${shade},${shade + 3},${shade + 12})`;
    x.fillRect(bx, G - bh, bw, bh);
    // brick courses
    x.fillStyle = `rgba(${shade + 8},${shade + 11},${shade + 20},0.55)`;
    for (let by = G - bh + 6; by < G - 70; by += 7) x.fillRect(bx + 2, by, bw - 4, 1);
    // storefront: dark glass + frame + awning
    const sw = bw - 26;
    x.fillStyle = '#0a0d13'; x.fillRect(bx + 13, G - 74, sw, 58);
    x.fillStyle = 'rgba(150,168,196,0.10)'; x.fillRect(bx + 15, G - 72, sw - 4, 26);
    x.strokeStyle = `rgb(${shade + 14},${shade + 17},${shade + 26})`; x.lineWidth = 2;
    x.strokeRect(bx + 13, G - 74, sw, 58);
    const aw = h2(bx, 54) > 0.45;
    if (aw) {
      x.fillStyle = `rgb(${shade + 13},${shade + 16},${shade + 24})`;
      x.beginPath();
      x.moveTo(bx + 8, G - 82); x.lineTo(bx + bw - 8, G - 82);
      x.lineTo(bx + bw - 14, G - 64); x.lineTo(bx + 14, G - 64);
      x.closePath(); x.fill();
      x.fillStyle = `rgba(0,0,0,0.35)`;
      for (let s = bx + 16; s < bx + bw - 16; s += 13) x.fillRect(s, G - 82 + (s % 2) * 2, 2, 18);
    }
    // upper windows, mostly dark
    for (let wy = G - bh + 12; wy < G - 100; wy += 24) {
      for (let wx = bx + 12; wx < bx + bw - 18; wx += 26) {
        x.fillStyle = h2(wx, wy) > 0.82 ? 'rgba(190,204,226,0.34)' : 'rgba(10,13,20,0.9)';
        x.fillRect(wx, wy, 12, 14);
      }
    }
    bx += bw + 3;
  }
  return c;
}

// The office: back wall, wainscot, big window (right) with mullions, door (left), floor.
export function bakeOffice() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(OVER, OVER);
  // wall + wainscot
  const g = x.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0, '#171c26'); g.addColorStop(0.62, '#1d232f'); g.addColorStop(1, '#141922');
  x.fillStyle = g; x.fillRect(-OVER, -OVER, w, h);
  x.fillStyle = '#12161f'; x.fillRect(-OVER, 372, w, 92);
  x.fillStyle = 'rgba(58,70,92,0.5)'; x.fillRect(-OVER, 368, w, 3);
  // floorboards
  for (let i = 0; i < 26; i++) {
    const fy = 380 + i * 7;
    x.fillStyle = `rgba(9,11,17,${0.34 - i * 0.008})`;
    x.fillRect(-OVER, fy, w, 3);
  }
  // window: frame + glass + mullions (rain + glow drawn live)
  x.fillStyle = '#0c1017'; x.fillRect(548, 96, 322, 252);
  x.strokeStyle = '#2a3140'; x.lineWidth = 10;
  x.strokeRect(552, 100, 314, 244);
  x.strokeStyle = '#232a38'; x.lineWidth = 5;
  x.beginPath();
  x.moveTo(709, 100); x.lineTo(709, 344);
  x.moveTo(552, 222); x.lineTo(866, 222);
  x.stroke();
  // door, left
  x.fillStyle = '#0d1118'; x.fillRect(24, 130, 74, 250);
  x.strokeStyle = '#242b39'; x.lineWidth = 4; x.strokeRect(24, 130, 74, 250);
  x.fillStyle = '#1a2130'; x.fillRect(34, 148, 54, 74);
  x.fillStyle = '#1a2130'; x.fillRect(34, 240, 54, 74);
  // coat rack silhouette
  x.fillStyle = '#0a0d13';
  x.fillRect(922, 120, 4, 260);
  x.fillRect(908, 128, 32, 5);
  // file cabinet, right of door
  x.fillStyle = '#161c27'; x.fillRect(120, 300, 64, 110);
  x.strokeStyle = '#242c3a'; x.lineWidth = 3; x.strokeRect(120, 300, 64, 110);
  for (let i = 0; i < 3; i++) { x.fillStyle = '#2a3342'; x.fillRect(130, 314 + i * 32, 44, 3); }
  return c;
}

// The club back room: brick, crates, pedestal, hanging lamp housing.
export function bakeClub() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(OVER, OVER);
  const g = x.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0, '#0d1015'); g.addColorStop(1, '#161a22');
  x.fillStyle = g; x.fillRect(-OVER, -OVER, w, h);
  // brick courses
  for (let by = 0; by < 400; by += 11) {
    for (let bx = -OVER + ((by / 11) % 2) * 13 - 13; bx < LW + OVER; bx += 26) {
      const k = h2(bx, by, 3);
      x.fillStyle = `rgb(${26 + k * 9},${28 + k * 9},${36 + k * 9})`;
      x.fillRect(bx, by, 24, 9);
    }
  }
  x.fillStyle = 'rgba(8,10,14,0.9)'; x.fillRect(-OVER, 400, w, 200); // floor
  x.fillStyle = 'rgba(46,56,74,0.5)'; x.fillRect(-OVER, 398, w, 2);
  for (let i = 0; i < 14; i++) { // floorboard shadows
    x.fillStyle = `rgba(5,6,10,${0.3 + h2(i, 61) * 0.2})`;
    x.fillRect(-OVER, 412 + i * 9, w, 4);
  }
  // side curtain, left edge
  for (let i = 0; i < 5; i++) {
    x.fillStyle = `rgb(${16 + i * 2},${14 + i * 2},${20 + i * 2})`;
    x.fillRect(i * 16 - 8, -OVER, 14, h);
  }
  // crates left + right
  for (const [cx, cy, s] of [[120, 330, 1], [170, 356, 0.7], [840, 342, 0.9]]) {
    x.fillStyle = '#1c2029'; x.fillRect(cx, cy, 70 * s, 46 * s);
    x.strokeStyle = '#2b3240'; x.lineWidth = 2;
    x.strokeRect(cx, cy, 70 * s, 46 * s);
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + 70 * s, cy + 46 * s); x.stroke();
  }
  // pedestal (the comb's plinth), center-right
  x.fillStyle = '#20242e'; x.fillRect(612, 356, 64, 60);
  x.fillStyle = '#2a303c'; x.fillRect(606, 348, 76, 10);
  x.fillStyle = '#171b23'; x.fillRect(612, 410, 64, 12);
  // hanging lamp + wire (cone drawn live)
  x.fillStyle = '#11141a'; x.fillRect(641, -OVER, 4, 96);
  x.fillStyle = '#232833';
  x.beginPath(); x.moveTo(624, 96); x.lineTo(662, 96); x.lineTo(655, 112); x.lineTo(631, 112); x.closePath(); x.fill();
  return c;
}

// Rooftop: tar roof, parapet, water tower, vents, antenna.
export function bakeRoof() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(OVER, OVER);
  x.fillStyle = '#0a0d13'; x.fillRect(-OVER, -OVER, w, h);
  // roof field
  const g = x.createLinearGradient(0, 360, 0, LH);
  g.addColorStop(0, '#181d27'); g.addColorStop(1, '#10141c');
  x.fillStyle = g; x.fillRect(-OVER, 358, w, 220);
  // tar patches + seams
  for (let i = 0; i < 60; i++) {
    const px = h2(i, 71) * (LW + 80) - 40, py = 366 + h2(i, 72) * 120;
    x.fillStyle = `rgba(7,9,13,${0.3 + h2(i, 73) * 0.3})`;
    x.beginPath(); x.ellipse(px, py, 9 + h2(i, 74) * 22, 3 + h2(i, 75) * 6, h2(i, 76) * 3, 0, 7); x.fill();
  }
  // parapet
  x.fillStyle = '#20262f'; x.fillRect(-OVER, 446, w, 16);
  x.fillStyle = '#12161d'; x.fillRect(-OVER, 462, w, 90);
  x.fillStyle = 'rgba(60,72,94,0.5)'; x.fillRect(-OVER, 446, w, 2);
  // water tower, right — lit enough to read as a silhouette against the city glow
  x.fillStyle = '#141a26';
  x.fillRect(690, 120, 128, 130);        // tank
  x.fillStyle = '#1a2230';
  for (let i = 0; i < 7; i++) x.fillRect(690, 128 + i * 18, 128, 3); // staves
  // moonlit left rim + top band
  x.fillStyle = '#2e3a4e'; x.fillRect(690, 120, 6, 130);
  x.fillStyle = '#242e3e'; x.fillRect(696, 120, 122, 5);
  x.fillStyle = '#10151f';
  x.beginPath(); x.moveTo(682, 122); x.lineTo(826, 122); x.lineTo(754, 76); x.closePath(); x.fill(); // cone roof
  x.strokeStyle = '#2a3446'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(682, 122); x.lineTo(754, 76); x.stroke(); // lit cone edge
  x.fillRect(752, 62, 3, 16); // finial
  x.fillStyle = '#121826';
  x.fillRect(700, 250, 12, 160); x.fillRect(798, 250, 12, 160); // legs
  x.beginPath(); x.moveTo(698, 260); x.lineTo(810, 260); x.lineTo(800, 284); x.lineTo(708, 284); x.closePath(); x.fill();
  x.strokeStyle = '#1c2434'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(706, 300); x.lineTo(804, 340); x.moveTo(804, 300); x.lineTo(706, 340); x.stroke(); // cross-brace
  // vents + antenna, left
  x.fillStyle = '#131824';
  x.fillRect(96, 330, 34, 36); x.fillRect(150, 344, 26, 26);
  x.fillRect(60, 300, 3, 66);
  x.fillStyle = 'rgba(70,84,110,0.4)'; x.fillRect(96, 330, 34, 2); x.fillRect(150, 344, 26, 2);
  // fallen crate (where the comb drops after the pile-up)
  x.save();
  x.translate(560, 428); x.rotate(0.28);
  x.fillStyle = '#1d222c'; x.fillRect(-30, -22, 60, 22);
  x.strokeStyle = '#2c3341'; x.lineWidth = 2; x.strokeRect(-30, -22, 60, 22);
  x.restore();
  return c;
}

// Polaroid card for the comb insert (photo area painted live).
export function bakePolaroid() {
  const c = canvas(240, 286), x = c.getContext('2d');
  x.fillStyle = '#c9c6bd';
  x.fillRect(0, 0, 240, 286);
  x.fillStyle = '#b4b1a8'; x.fillRect(0, 278, 240, 8);
  x.fillStyle = '#0d1015'; x.fillRect(16, 16, 208, 208);
  // paper grain
  for (let i = 0; i < 220; i++) {
    x.fillStyle = `rgba(90,88,80,${h2(i, 81) * 0.16})`;
    x.fillRect(h2(i, 82) * 240, h2(i, 83) * 286, 2, 1);
  }
  return c;
}

// Museum frame for the framed originals (600×600), duotoned like the characters.
export function framePortrait(img, hue, k = 0.6, w = 320, h = 320) {
  const c = canvas(w + 36, h + 36), x = c.getContext('2d');
  // frame
  x.fillStyle = '#20242c'; x.fillRect(0, 0, w + 36, h + 36);
  x.fillStyle = '#2e343f'; x.fillRect(4, 4, w + 28, h + 28);
  x.strokeStyle = '#3d4552'; x.lineWidth = 2; x.strokeRect(5, 5, w + 26, h + 26);
  // duotone portrait
  const p = canvas(w, h), px = p.getContext('2d');
  px.drawImage(img, 0, 0, w, h);
  px.globalCompositeOperation = 'saturation';
  px.fillStyle = '#808080'; px.fillRect(0, 0, w, h);
  px.globalCompositeOperation = 'color';
  px.globalAlpha = k; px.fillStyle = hue; px.fillRect(0, 0, w, h);
  px.globalAlpha = 1; px.globalCompositeOperation = 'source-over';
  x.drawImage(p, 18, 18);
  // glass sheen
  const g = x.createLinearGradient(18, 18, w, h);
  g.addColorStop(0, 'rgba(220,230,246,0.12)'); g.addColorStop(0.28, 'rgba(220,230,246,0.02)');
  g.addColorStop(0.29, 'rgba(220,230,246,0)'); g.addColorStop(1, 'rgba(220,230,246,0)');
  x.fillStyle = g; x.fillRect(18, 18, w, h);
  return c;
}

// ---- live painters (all pure in t) -------------------------------------------

export const flick = (t, seed, hz = 24) => 0.72 + 0.28 * hash(seed * 91 + Math.floor(t * hz));

export function rainLayers(ctx, t, k = 1, wind = -110) {
  const layers = [
    { n: Math.round(90 * k), sp: 560, len: 13, a: 0.10, w: 1 },
    { n: Math.round(58 * k), sp: 820, len: 22, a: 0.15, w: 1 },
    { n: Math.round(30 * k), sp: 1160, len: 38, a: 0.19, w: 1.6 },
  ];
  ctx.save();
  ctx.lineCap = 'butt';
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    ctx.strokeStyle = `rgba(168,186,222,${L.a})`;
    ctx.lineWidth = L.w;
    ctx.beginPath();
    for (let i = 0; i < L.n; i++) {
      const xi = hash(i * 3 + li * 771), yi = hash(i * 7 + li * 913 + 3);
      const span = LH + 120;
      const px = (((xi * (LW + 200) + t * wind * (0.6 + li * 0.35) - 100) % (LW + 200)) + LW + 200) % (LW + 200) - 100;
      const py = ((yi * span + t * L.sp) % span) - 60;
      ctx.moveTo(px, py);
      ctx.lineTo(px + (wind / 900) * L.len * 3, py + L.len);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function splashes(ctx, t, y, k = 1, seed = 5) {
  const n = Math.round(16 * k);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const cyc = 0.5 + hash(i * 13 + seed) * 0.4;
    const ph = ((t / cyc + hash(i * 7 + seed)) % 1);
    const sx = hash(i * 5 + seed) * LW;
    const a = (1 - ph) * 0.22;
    if (a <= 0.01) continue;
    ctx.strokeStyle = `rgba(160,178,214,${a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(sx, y + (hash(i * 3 + seed) - 0.5) * 6, 2 + ph * 7, 1 + ph * 2.4, 0, 0, 7);
    ctx.stroke();
  }
  ctx.restore();
}

// Neon sign with tube letters: flicker quanta + one dead-letter buzz.
export function neon(ctx, text, x, y, size, t, seed, col = '188,214,238', align = 'center') {
  const buzz = hash(seed + Math.floor(t * 0.7)); // which letter is dying (slow cycle)
  const on = (() => {
    const b = hash(seed * 3 + Math.floor(t * 22));
    if (b < 0.05) return 0.25 + 0.3 * hash(seed + Math.floor(t * 60));
    return 0.88 + 0.12 * Math.sin(t * 31 + seed);
  })();
  ctx.save();
  ctx.font = `600 ${size}px "Space Grotesk"`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const chars = [...text];
  let total = 0;
  const widths = chars.map((ch) => {
    const w = ctx.measureText(ch).width;
    total += w;
    return w;
  });
  let cx = align === 'center' ? x - total / 2 : x;
  for (let i = 0; i < chars.length; i++) {
    const dead = buzz > 0.82 && i === Math.floor(buzz * 99) % chars.length;
    const kk = dead ? 0.18 + 0.2 * hash(seed + i + Math.floor(t * 46)) : on;
    ctx.shadowColor = `rgba(${col},${0.8 * kk})`;
    ctx.shadowBlur = 9 * kk;
    ctx.fillStyle = `rgba(${Math.min(255, 200 + 55 * kk)},${Math.min(255, 224 + 30 * kk)},250,${0.35 + 0.62 * kk})`;
    ctx.fillText(chars[i], cx, y);
    ctx.fillText(chars[i], cx, y); // double pass for tube density
    cx += widths[i];
  }
  ctx.restore();
}

// Venetian-blind light: slow diagonal bands sweeping the room.
export function slats(ctx, t, k = 1) {
  const drift = Math.sin(t * 0.21) * 9;
  ctx.save();
  ctx.translate(560, 60);
  ctx.rotate(-0.34);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const bx = -160 + i * 74 + drift;
    ctx.fillStyle = `rgba(158,178,208,${(0.05 + 0.017 * Math.sin(t * 0.8 + i)) * k})`;
    ctx.fillRect(bx, -120, 30, 720);
  }
  ctx.restore();
}

// Spotlight cone from a lamp: trapezoid + floor pool (lighter), with beam motes.
export function spotlight(ctx, cx, topY, floorY, r, t, a = 0.16, motes = true) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(cx, topY, cx, floorY);
  g.addColorStop(0, `rgba(206,216,236,${a * 1.15})`);
  g.addColorStop(1, `rgba(206,216,236,${a * 0.35})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - 7, topY); ctx.lineTo(cx + 7, topY);
  ctx.lineTo(cx + r, floorY); ctx.lineTo(cx - r, floorY);
  ctx.closePath(); ctx.fill();
  const pg = ctx.createRadialGradient(cx, floorY, 0, cx, floorY, r * 1.15);
  pg.addColorStop(0, `rgba(214,224,242,${a * 1.3})`); pg.addColorStop(1, 'rgba(214,224,242,0)');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.ellipse(cx, floorY, r * 1.15, r * 0.24, 0, 0, 7); ctx.fill();
  if (motes) {
    for (let i = 0; i < 12; i++) {
      const ph = t * (0.14 + hash(i * 9 + 2) * 0.2) + hash(i * 3) * 9;
      const my = topY + ((ph * 90) % (floorY - topY));
      const spread = 7 + ((my - topY) / (floorY - topY)) * (r - 8);
      const mx = cx + (hash(i * 5) - 0.5) * 2 * spread + Math.sin(ph * 2.2) * 6;
      const al = 0.1 + 0.1 * Math.sin(ph * 3.1 + i);
      if (al <= 0) continue;
      ctx.fillStyle = `rgba(224,232,248,${al})`;
      ctx.fillRect(mx, my, 1.4, 1.4);
    }
  }
  ctx.restore();
}

// Door light shaft for entrances.
export function doorShaft(ctx, x, t, a) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x, 120, x + 130, 420);
  g.addColorStop(0, `rgba(190,204,228,${0.16 * a})`);
  g.addColorStop(1, 'rgba(190,204,228,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, 132); ctx.lineTo(x + 30, 132);
  ctx.lineTo(x + 158, 418); ctx.lineTo(x + 66, 418);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Wet-asphalt reflection of a posed actor: drawFn paints feet-anchored into a scratch.
let _refl = null;
export function reflect(ctx, cx, feetY, t, drawFn, a = 0.14) {
  if (!_refl) _refl = canvas(160, 170);
  const rc = _refl.getContext('2d');
  rc.setTransform(1, 0, 0, 1, 0, 0);
  rc.globalCompositeOperation = 'source-over';
  rc.clearRect(0, 0, 160, 170);
  rc.save(); rc.translate(80, 166); drawFn(rc); rc.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  const wob = Math.sin(t * 1.7) * 2;
  ctx.translate(Math.round(cx + wob), Math.round(feetY + 2));
  ctx.scale(1, -0.52);
  ctx.drawImage(_refl, -80, -166);
  ctx.restore();
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

// darkness with light holes: scratch-isolated so punch-outs never erase the scene.
let _dk = null;
export function darkness(ctx, a, holes) {
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

// analytic particles from immutable events {g, x, y, seed}
export function chips(ctx, events, worldT, color = '160,120,70', n = 10) {
  for (const ev of events) {
    const age = worldT - ev.g;
    if (age < 0 || age > 0.9) continue;
    for (let i = 0; i < n; i++) {
      const vx = (hash(ev.seed + i * 3) - 0.5) * 160, vy = -60 - hash(ev.seed + i * 5) * 130;
      const px = ev.x + vx * age, py = ev.y + vy * age + 0.5 * 300 * age * age;
      const a = 1 - age / 0.9;
      ctx.fillStyle = `rgba(${color},${a})`;
      ctx.fillRect(px, py, 3, 3);
    }
  }
}

// The Golden Comb: spine + teeth, drawn small in-world; k adds an additive glint core.
export function comb(ctx, cx, cy, s, k = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = '#8d7a3c';
  ctx.beginPath(); ctx.moveTo(-16, 4); ctx.quadraticCurveTo(-14, -6, 0, -6); ctx.quadraticCurveTo(14, -6, 16, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c9ab52';
  ctx.beginPath(); ctx.moveTo(-15, 3); ctx.quadraticCurveTo(-13, -5, 0, -5); ctx.quadraticCurveTo(13, -5, 15, 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8cf7e';
  ctx.fillRect(-12, -3, 24, 2);
  ctx.fillStyle = '#9b8544';
  for (let i = 0; i < 8; i++) ctx.fillRect(-14 + i * 4, 3, 2, 9);
  ctx.fillStyle = '#c9ab52';
  for (let i = 0; i < 8; i++) ctx.fillRect(-14 + i * 4, 3, 1, 8);
  if (k > 0.02) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,226,140,${0.55 * k})`;
    ctx.fillRect(-13, -4, 26, 3);
  }
  ctx.restore();
}

// The loose wig, drawn at an arbitrary rotation/alpha (peel-off arc + floor rest).
export function drawWig(ctx, wig, cx, cy, rot, alpha = 1, flip = false) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(wig, -24, -40);
  ctx.restore();
}

// City glow pulsing behind the skyline (street scenes).
export function cityGlow(ctx, t, a = 0.5) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const k = 0.8 + 0.2 * Math.sin(t * 0.6);
  const g = ctx.createLinearGradient(0, 200, 0, 380);
  g.addColorStop(0, `rgba(120,138,172,${0.10 * a * k})`);
  g.addColorStop(1, 'rgba(120,138,172,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 200, LW, 180);
  ctx.restore();
}

export async function loadOrig(id) {
  const i = new Image();
  i.src = new URL(`../../media/remy/Character${id}.webp`, import.meta.url).href;
  await i.decode();
  return i;
}
