// THE LORD OF THE FLOW — baked pixel sets + procedural actors/light. Everything deterministic:
// hash-seeded, no Math.random, every painter a pure function of its arguments.
// Stage is a 960×540 low canvas blitted 2× nearest (the-shine/baldzilla lineage); every bake
// carries OVER px of overscan so camera moves and shake never expose stale pixels.
import { hash, vnoise } from 'filmkit/lib.js';
import { canvas } from '../remy-bros/art.js';
import { LW, LH, BALDROG_PAL, GOLD } from './timeline.js';

export const OVER = 28;
export const GROUND = 470; // default actor feet line in stage coords
export const PLATE_W = LW + OVER * 2;
export const PLATE_H = LH + OVER * 2;

const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const c255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);

// ---- pixel buffer + dithered ramps (the-shine lineage) -----------------------------------------
function pixels(w, h) {
  w = Math.round(w); h = Math.round(h);
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
// dithered vertical ramp between hex stops; vf(x,y) → ramp coordinate 0..1
function ramp(P, stops, vf) {
  for (let y = 0; y < P.h; y++)
    for (let x = 0; x < P.w; x++) {
      const q = vf(x, y) * 64, b0 = Math.floor(q), f = q - b0;
      const pick = f * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? b0 + 1 : b0;
      const p = Math.min(1, pick / 64);
      let k = 0;
      while (k < stops.length - 2 && p > stops[k + 1][0]) k++;
      const [pa, ca] = [stops[k][0], rgbOf(stops[k][1])], [pb, cb] = [stops[k + 1][0], rgbOf(stops[k + 1][1])];
      const u = Math.min(1, Math.max(0, (p - pa) / (pb - pa || 1)));
      P.set(x, y, [c255(ca[0] + (cb[0] - ca[0]) * u), c255(ca[1] + (cb[1] - ca[1]) * u), c255(ca[2] + (cb[2] - ca[2]) * u)]);
    }
}
// bake canvas whose pixel stage coords are 0..LW / 0..LH (OVER overscan around)
function plate(skyStops, vf) {
  const P = pixels(PLATE_W, PLATE_H);
  if (skyStops) ramp(P, skyStops, vf ?? ((x, y) => y / (PLATE_H - 1)));
  const c = P.done(), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.translate(OVER, OVER); // from here on, paint in stage coords
  return { c, x };
}
// a transparent bake canvas, stage coords
function layer(w, h) {
  const c = canvas(Math.round(w), Math.round(h)), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return { c, x };
}

// silhouetted ridgeline across a layer: fn(x) → top y in the layer's own coords
function ridgeFill(x, w, h, fn, col, fleck, seed) {
  x.fillStyle = col;
  x.beginPath();
  x.moveTo(-4, h + 4);
  for (let px = -4; px <= w + 4; px += 2) x.lineTo(px, fn(px));
  x.lineTo(w + 4, h + 4);
  x.closePath();
  x.fill();
  if (fleck) for (let i = 0; i < w * 0.4; i++) {
    const fx = h2(i, seed, 1) * w, fy = fn(fx) + 6 + h2(i, seed, 2) * (h - fn(fx) - 8);
    if (fy < h && h2(fx, fy, seed) > 0.72) { x.fillStyle = fleck; x.fillRect(fx, fy, 2, 1); }
  }
}

// =================================================================================================
// SETS
// =================================================================================================

// ---- 1 · misty title backdrop ------------------------------------------------------------------
export function bakeMist() {
  const { c } = plate([
    [0, '#020308'], [0.45, '#04060d'], [0.72, '#080b12'], [0.92, '#0e120f'], [1, '#12150e'],
  ]);
  const x = c.getContext('2d');
  x.save(); x.translate(OVER, OVER);
  // far hills barely out of the dark, a hair of gold on their crest
  ridgeFill(x, LW, 130, (px) => 118 - 26 * vnoise(px * 0.006, 3) - 9 * vnoise(px * 0.02, 5), '#070a10', '#0d1116', 8);
  x.fillStyle = 'rgba(233,212,154,0.1)';
  x.fillRect(0, 92, LW, 1);
  x.fillStyle = 'rgba(233,212,154,0.045)';
  x.fillRect(0, 96, LW, 3);
  // faint cold stars
  for (let i = 0; i < 60; i++) {
    const sx = h2(i, 11) * LW, sy = h2(i, 12) * 240, b = h2(i, 13);
    if (b > 0.55) { x.fillStyle = `rgba(210,220,240,${0.14 + b * 0.3})`; x.fillRect(sx, sy, 1, 1); }
  }
  x.restore();
  return c;
}

// ---- 2 · forge interior (sparks live) ----------------------------------------------------------
export function bakeForge() {
  const { c, x } = plate([[0, '#0a0705'], [0.5, '#120c08'], [1, '#060403']]);
  // rough stone walls
  for (let ry = 0; ry < 13; ry++)
    for (let rx = 0; rx < 30; rx++) {
      const bx = rx * 34 + (ry & 1 ? 17 : 0), by = 30 + ry * 26;
      const v = h2(rx, ry, 21);
      x.fillStyle = v > 0.72 ? '#1c1410' : v > 0.4 ? '#150e0a' : '#100a07';
      x.fillRect(bx - 17, by, 33, 25);
      x.fillStyle = '#0a0605';
      x.fillRect(bx - 17, by + 24, 34, 1);
    }
  // the forge mouth, left: glowing coals baked (pulse live)
  x.fillStyle = '#050303';
  x.beginPath(); x.moveTo(60, 210); x.lineTo(60, 420); x.lineTo(250, 420); x.lineTo(250, 240);
  x.quadraticCurveTo(155, 196, 60, 210); x.closePath(); x.fill();
  const g = x.createRadialGradient(160, 400, 8, 160, 400, 150);
  g.addColorStop(0, '#ff9a3a'); g.addColorStop(0.4, '#7a2e0c'); g.addColorStop(1, 'rgba(20,6,2,0)');
  x.fillStyle = g; x.fillRect(20, 260, 260, 160);
  x.fillStyle = '#2a1006';
  for (let i = 0; i < 9; i++) x.fillRect(70 + i * 20, 404 + (i % 2) * 4, 16, 12); // coal pile
  // chimney hood
  x.fillStyle = '#0c0806';
  x.beginPath(); x.moveTo(70, 206); x.lineTo(240, 206); x.lineTo(210, 96); x.lineTo(100, 96); x.closePath(); x.fill();
  x.fillStyle = '#070403'; x.fillRect(120, 0, 110, 100);
  // chains from the ceiling
  x.strokeStyle = '#241a12'; x.lineWidth = 2;
  for (const [cx, len] of [[340, 120], [860, 90], [640, 60]]) {
    for (let yy = 0; yy < len; yy += 7) { x.strokeRect(cx - 2, yy, 4, 6); }
    x.fillStyle = '#2c2016'; x.fillRect(cx - 6, len, 12, 8);
  }
  // anvil silhouette on a stump, centre-right
  anvil(x, 600, 396, 1.4);
  // tools on the wall
  x.strokeStyle = '#241a12'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(420, 180); x.lineTo(420, 260); x.stroke();
  x.fillStyle = '#1a120c'; x.fillRect(413, 168, 14, 16);
  x.beginPath(); x.moveTo(470, 190); x.lineTo(470, 260); x.stroke();
  // floor
  x.fillStyle = '#0b0705'; x.fillRect(-OVER, 420, LW + OVER * 2, LH - 420 + OVER);
  for (let i = 0; i < 260; i++) {
    const fx = h2(i, 31) * LW, fy = 424 + h2(i, 32) * (LH - 424), v = h2(fx, fy, 33);
    x.fillStyle = v > 0.8 ? '#171009' : '#0d0906';
    x.fillRect(fx, fy, 2, 1);
  }
  return c;
}
export function anvil(x, cx, footY, s) {
  x.save(); x.translate(cx, footY); x.scale(s, s);
  x.fillStyle = '#0a0808'; // stump
  x.fillRect(-24, 0, 48, 34);
  x.fillStyle = '#141110';
  x.fillRect(-20, 0, 40, 5);
  x.fillStyle = '#181514'; // body
  x.beginPath();
  x.moveTo(-52, -34); x.lineTo(58, -34); x.lineTo(58, -20); x.lineTo(20, -16);
  x.lineTo(14, 0); x.lineTo(-14, 0); x.lineTo(-20, -16); x.lineTo(-52, -18);
  x.closePath(); x.fill();
  x.fillStyle = '#221e1c'; x.fillRect(-52, -34, 110, 4); // top face
  x.fillStyle = '#0e0c0b';
  x.beginPath(); x.moveTo(-52, -34); x.quadraticCurveTo(-78, -32, -84, -24); x.quadraticCurveTo(-66, -22, -52, -24); x.closePath(); x.fill(); // horn
  x.restore();
}

// ---- 3 · horde march plain ---------------------------------------------------------------------
export function bakeHordePlain() {
  const { c, x } = plate([[0, '#141221'], [0.42, '#1c1830'], [0.62, '#241d31'], [0.78, '#201a26'], [1, '#171217']]);
  // bruised clouds
  for (let i = 0; i < 7; i++) {
    x.fillStyle = `rgba(10,9,20,${0.5 - (i % 3) * 0.1})`;
    x.beginPath(); x.ellipse(90 + i * 150 + h2(i, 41) * 40, 60 + (i % 3) * 26, 110 + h2(i, 42) * 60, 10 + h2(i, 43) * 7, 0, 0, 7); x.fill();
  }
  // distant Dark Tower, a thorn on the horizon
  x.fillStyle = '#0b0912';
  x.beginPath(); x.moveTo(818, 258); x.lineTo(828, 150); x.lineTo(840, 168); x.lineTo(852, 142); x.lineTo(862, 258); x.closePath(); x.fill();
  // broken ground, three depth bands
  ridgeFill(x, LW, 140, (px) => 268 - 14 * vnoise(px * 0.008, 6) - 5 * vnoise(px * 0.03, 7), '#151019', '#1b1420', 9);
  x.fillStyle = '#191219'; x.fillRect(-OVER, 320, LW + OVER * 2, LH - 320 + OVER);
  for (let i = 0; i < 400; i++) {
    const fx = h2(i, 44) * LW, fy = 322 + h2(i, 45) * (LH - 322), v = h2(fx, fy, 46);
    x.fillStyle = v > 0.86 ? '#241a26' : v > 0.5 ? '#170f18' : '#130c14';
    x.fillRect(fx, fy, 2, 1);
  }
  // the trampled road the column uses
  x.fillStyle = '#1d1520';
  x.beginPath(); x.moveTo(-OVER, 452); x.quadraticCurveTo(480, 420, LW + OVER, 448); x.lineTo(LW + OVER, LH + OVER); x.lineTo(-OVER, LH + OVER); x.closePath(); x.fill();
  for (let i = 0; i < 90; i++) { // hoof scuffs
    const sx = h2(i, 47) * LW, sy = 432 + h2(i, 48) * 90;
    x.fillStyle = h2(i, 49) > 0.5 ? '#241a28' : '#150e17';
    x.fillRect(sx, sy, 4, 2);
  }
  return c;
}

// ---- 4 · fallen kingdom gate (banners live) ----------------------------------------------------
export function bakeKingdom() {
  const { c, x } = plate([[0, '#273142'], [0.4, '#3b4a60'], [0.62, '#54657c'], [0.78, '#64778c'], [1, '#4c5a6e']]);
  // soft clouds
  for (let i = 0; i < 6; i++) {
    x.fillStyle = `rgba(226,233,244,${0.2 - (i % 3) * 0.04})`;
    x.beginPath(); x.ellipse(120 + i * 170, 70 + (i % 3) * 24, 95, 10, 0, 0, 7); x.fill();
  }
  // gate wall
  x.fillStyle = '#4a4438';
  x.fillRect(-OVER, 250, LW + OVER * 2, LH - 250 + OVER);
  for (let ry = 0; ry < 9; ry++)
    for (let rx = 0; rx < 26; rx++) {
      const bx = rx * 40 + (ry & 1 ? 20 : 0), by = 252 + ry * 24;
      const v = h2(rx, ry, 51);
      x.fillStyle = v > 0.7 ? '#564f40' : v > 0.35 ? '#4a4437' : '#3e382d';
      x.fillRect(bx - 20, by, 39, 23);
      x.fillStyle = '#332e25'; x.fillRect(bx - 20, by + 22, 40, 1);
    }
  // crenellated parapet
  x.fillStyle = '#5a5243';
  x.fillRect(-OVER, 236, LW + OVER * 2, 16);
  for (let px = -OVER; px < LW + OVER; px += 34) x.fillRect(px, 222, 20, 16);
  // arched gate, centre
  x.fillStyle = '#241f18';
  x.beginPath(); x.moveTo(360, 470); x.lineTo(360, 330); x.arc(432, 330, 72, Math.PI, 0); x.lineTo(504, 470); x.closePath(); x.fill();
  x.strokeStyle = '#5f5748'; x.lineWidth = 5;
  x.beginPath(); x.moveTo(358, 470); x.lineTo(358, 330); x.arc(432, 330, 74, Math.PI, 0); x.lineTo(506, 470); x.stroke();
  // door studs
  x.fillStyle = '#3a332a';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { x.beginPath(); x.arc(396 + i * 24, 356 + j * 30, 2.4, 0, 7); x.fill(); }
  // banner poles (cloth drawn live so it can sag and fall)
  for (const px of [170, 690]) {
    x.fillStyle = '#332d24'; x.fillRect(px - 4, 240, 8, 150); // bracket arm
    x.fillStyle = '#57503f'; x.fillRect(px - 4, 240, 8, 4);
    x.fillStyle = '#2b261f'; x.fillRect(px - 12, 232, 24, 10); // wall plate
    x.fillStyle = '#6a6250'; x.beginPath(); x.arc(px, 238, 6, 0, 7); x.fill(); // finial
  }
  // wet-flagstone street
  x.fillStyle = '#3c362c'; x.fillRect(-OVER, 470, LW + OVER * 2, LH - 470 + OVER);
  for (let i = 0; i < 5; i++) {
    x.fillStyle = '#332d24';
    x.fillRect(-OVER, 482 + i * 16, LW + OVER * 2, 1);
  }
  return c;
}
// a hanging banner; hang 1 = full cloth, 0 = slipped its pole and pooled at the bracket foot.
// The cloth slides DOWN and crumples — never a shrinking ribbon.
export function banner(x, px, poleTop, w, hgt, hang, sway, col, colHi) {
  x.save();
  x.translate(px, poleTop + 6);
  x.rotate(Math.sin(sway) * 0.02 * hang);
  const slide = (1 - hang) * hgt * 0.62; // how far down the pole it has slipped
  const cloth = hgt * Math.max(0.12, hang); // visible cloth length (pools into a bunch)
  if (hang >= 0.02) {
    // gathered folds: vertical shade stripes
    x.fillStyle = col;
    x.fillRect(-w / 2, slide, w, cloth);
    x.fillStyle = 'rgba(0,0,0,0.22)';
    for (let i = 0; i < 4; i++) x.fillRect(-w / 2 + w * (0.14 + i * 0.24), slide, w * 0.09, cloth);
    // weighted hem, swinging
    const hem = slide + cloth;
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(-w / 2, hem - 3);
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      x.lineTo(-w / 2 + u * w, hem + Math.sin(u * 7 + sway) * (2 + 4 * (1 - hang)) * hang);
    }
    x.lineTo(w / 2, hem - 3);
    x.closePath(); x.fill();
    // gold band at the cloth head
    x.fillStyle = colHi;
    x.fillRect(-w / 2, slide, w, Math.max(2, 5 * hang));
    // pooling bunch at the bottom while it falls
    if (hang < 0.97) {
      x.fillStyle = col;
      x.beginPath(); x.ellipse(0, hem + 4, w * 0.34, 6 + (1 - hang) * 8, 0, 0, 7); x.fill();
    }
  }
  x.restore();
}

// ---- 5/6 · the Shear — golden day + night cuts -------------------------------------------------
function shearBase(x, night) {
  // three golden hill bands + one hillock village of round doors + laundry poles + meadow
  const hill = (fn, col, seed) => ridgeFill(x, LW, 200, fn, col, night ? null : '#c9a84e', seed);
  hill((px) => 250 - 30 * vnoise(px * 0.005, 61) - 8 * vnoise(px * 0.017, 62), night ? '#17231c' : '#b09438', 61);
  hill((px) => 292 - 24 * vnoise(px * 0.007, 63) - 7 * vnoise(px * 0.021, 64), night ? '#101a14' : '#c2a23c', 63);
  hill((px) => 330 - 18 * vnoise(px * 0.009, 65) - 6 * vnoise(px * 0.025, 66), night ? '#0c130e' : '#d0ac3e', 65);
  // the door-hillocks (round hobbit doors), foreground band
  const hillock = (cx, r) => {
    x.fillStyle = night ? '#0d150f' : '#7da049';
    x.beginPath(); x.arc(cx, 452, r, Math.PI, 0); x.fill();
    x.fillStyle = night ? '#0a110b' : '#6d8f3e';
    x.beginPath(); x.arc(cx, 452, r, Math.PI, 0); x.fill();
    x.fillStyle = night ? '#0b120c' : '#86aa50';
    x.beginPath(); x.arc(cx - r * 0.3, 450, r * 0.8, Math.PI, 0); x.fill();
    // round door + knob + window
    x.fillStyle = '#2a1c10';
    x.beginPath(); x.arc(cx + 2, 452, r * 0.42, Math.PI, 0); x.lineTo(cx + 2 + r * 0.42, 452); x.closePath();
    x.fill();
    x.fillStyle = night ? '#151009' : '#4a3018';
    x.beginPath(); x.arc(cx + 2, 452, r * 0.42, Math.PI, 0); x.fill();
    x.strokeStyle = night ? '#241a10' : '#38240f'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(cx + 2, 452 - r * 0.42); x.lineTo(cx + 2, 452); x.stroke();
    x.fillStyle = '#c9a84e'; x.beginPath(); x.arc(cx + 2 + (night ? 0 : r * 0.12), 452 - r * 0.18, 2.2, 0, 7); x.fill();
    if (!night) { x.fillStyle = '#f2d98c'; x.beginPath(); x.arc(cx - r * 0.22, 452 - r * 0.2, 3.4, 0, 7); x.fill(); } // round window
  };
  hillock(150, 54); hillock(560, 66); hillock(880, 48);
  // laundry poles between the hillocks (lines + combs live, so they can sway)
  for (const [px, top] of [[300, 372], [700, 358]]) {
    x.fillStyle = '#5a4326';
    x.fillRect(px, top, 5, 452 - top);
    x.fillRect(px + 170, top + 8, 5, 452 - top - 8);
  }
  // meadow foreground
  x.fillStyle = night ? '#0a100b' : '#5d7f35';
  x.fillRect(-OVER, 452, LW + OVER * 2, LH - 452 + OVER);
  for (let i = 0; i < 900; i++) {
    const gx = h2(i, 71) * (LW + OVER * 2) - OVER, gy = 452 + h2(i, 72) * (LH - 452 + OVER), v = h2(i, 73);
    x.strokeStyle = v > 0.6 ? (night ? '#101a10' : '#6d9440') : (night ? '#070c08' : '#4c6b2a');
    x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx + (v - 0.5) * 4, gy - 4 - v * 7); x.stroke();
  }
}
export function bakeShearDay() {
  const { c, x } = plate([[0, '#7db4e0'], [0.4, '#a8d0ea'], [0.62, '#e8ddc0'], [0.8, '#f4e3ae'], [1, '#e8c878']]);
  // sun glow + soft clouds
  const g = x.createRadialGradient(240, 130, 10, 240, 130, 190);
  g.addColorStop(0, 'rgba(255,246,210,0.85)'); g.addColorStop(0.4, 'rgba(255,238,180,0.3)'); g.addColorStop(1, 'rgba(255,238,180,0)');
  x.fillStyle = g; x.fillRect(40, -60, 420, 420);
  for (let i = 0; i < 6; i++) {
    x.fillStyle = `rgba(255,252,244,${0.75 - (i % 3) * 0.12})`;
    x.beginPath(); x.ellipse(140 + i * 165, 62 + (i % 3) * 22, 64 + h2(i, 74) * 40, 9 + h2(i, 75) * 5, 0, 0, 7); x.fill();
  }
  shearBase(x, false);
  // a dirt path wandering to the doors
  x.fillStyle = '#c9a869';
  x.beginPath(); x.moveTo(430, 452); x.quadraticCurveTo(470, 490, 420, LH + OVER); x.lineTo(500, LH + OVER); x.quadraticCurveTo(540, 490, 560, 452); x.closePath(); x.fill();
  return c;
}
export function bakeShearNight() {
  const { c, x } = plate([[0, '#060a18'], [0.4, '#0a1022'], [0.62, '#0d1326'], [0.82, '#101628'], [1, '#0c120e']]);
  // stars + moon
  for (let i = 0; i < 110; i++) {
    const sx = h2(i, 81) * LW, sy = h2(i, 82) * 300, b = h2(i, 83);
    if (b > 0.4) { x.fillStyle = `rgba(214,224,248,${0.2 + b * 0.55})`; x.fillRect(sx, sy, 1, 1); }
  }
  const mx = 760, my = 96;
  const mg = x.createRadialGradient(mx, my, 8, mx, my, 120);
  mg.addColorStop(0, 'rgba(222,232,250,0.5)'); mg.addColorStop(1, 'rgba(222,232,250,0)');
  x.fillStyle = mg; x.fillRect(mx - 120, my - 120, 240, 240);
  x.fillStyle = '#e6ecf8'; x.beginPath(); x.arc(mx, my, 22, 0, 7); x.fill();
  x.fillStyle = '#c3cde4'; x.beginPath(); x.arc(mx - 7, my + 4, 4, 0, 7); x.arc(mx + 8, my - 6, 3, 0, 7); x.fill();
  shearBase(x, true);
  // the fresh dig: turned earth where the Razor came out of the ground
  x.fillStyle = '#241a10';
  x.beginPath(); x.ellipse(470, 462, 46, 12, 0, 0, 7); x.fill();
  x.fillStyle = '#31241a';
  x.beginPath(); x.ellipse(470, 458, 32, 8, 0, 0, 7); x.fill();
  x.fillStyle = '#1c130c';
  x.beginPath(); x.ellipse(470, 460, 14, 4, 0, 0, 7); x.fill();
  // the warm window in the left door (baked bright; glow live)
  x.fillStyle = '#ffca6e';
  x.beginPath(); x.arc(128, 442, 4.4, 0, 7); x.fill();
  return c;
}

// ---- 7 · assembly hilltop ----------------------------------------------------------------------
export function bakeAssembly() {
  const { c, x } = plate([[0, '#6aa8dc'], [0.35, '#9cc8ea'], [0.6, '#dcecdc'], [0.78, '#e8e0a8'], [1, '#cfc27a']]);
  for (let i = 0; i < 7; i++) {
    x.fillStyle = `rgba(255,253,246,${0.8 - (i % 3) * 0.15})`;
    x.beginPath(); x.ellipse(110 + i * 150, 58 + (i % 3) * 20, 60 + h2(i, 84) * 46, 8 + h2(i, 85) * 5, 0, 0, 7); x.fill();
  }
  // blue-gold distance
  ridgeFill(x, LW, 150, (px) => 232 - 26 * vnoise(px * 0.006, 86) - 8 * vnoise(px * 0.02, 87), '#8ea7b8', '#a8bcc8', 86);
  ridgeFill(x, LW, 150, (px) => 272 - 20 * vnoise(px * 0.008, 88) - 6 * vnoise(px * 0.024, 89), '#7f9a6c', '#93ad7c', 88);
  // the wind-swept crown
  ridgeFill(x, LW, 210, (px) => 340 - 16 * vnoise(px * 0.01, 90) - 5 * vnoise(px * 0.03, 91), '#5d7f35', '#6d9440', 90);
  x.fillStyle = '#55762f'; x.fillRect(-OVER, 400, LW + OVER * 2, LH - 400 + OVER);
  for (let i = 0; i < 700; i++) {
    const gx = h2(i, 92) * (LW + OVER * 2) - OVER, gy = 402 + h2(i, 93) * (LH - 402 + OVER), v = h2(i, 94);
    x.strokeStyle = v > 0.55 ? '#6d9440' : '#46632a';
    x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx + (v - 0.5) * 5, gy - 5 - v * 8); x.stroke();
  }
  // a lone standing stone to seal the lineup's left edge
  x.fillStyle = '#6a6a62';
  x.beginPath(); x.moveTo(84, 402); x.lineTo(90, 330); x.lineTo(104, 326); x.lineTo(112, 402); x.closePath(); x.fill();
  x.fillStyle = '#7c7c72'; x.fillRect(90, 330, 6, 60);
  return c;
}

// ---- 8/9 · sunset ridge walk (parallax: sky / far / near / crest) -------------------------------
export function bakeRidgeSky() {
  const { c, x } = plate([[0, '#2a1c46'], [0.3, '#5c2e56'], [0.52, '#a4444e'], [0.7, '#e07840'], [0.84, '#f4b45c'], [1, '#f8d888']]);
  // the low sun, huge and gold
  const sg = x.createRadialGradient(600, 318, 10, 600, 318, 210);
  sg.addColorStop(0, 'rgba(255,226,150,0.9)'); sg.addColorStop(0.35, 'rgba(255,190,110,0.35)'); sg.addColorStop(1, 'rgba(255,190,110,0)');
  x.fillStyle = sg; x.fillRect(390, 108, 420, 420);
  x.fillStyle = '#ffe2a0'; x.beginPath(); x.arc(600, 318, 44, 0, 7); x.fill();
  // streaked sunset clouds
  for (let i = 0; i < 9; i++) {
    const cy = 90 + i * 26 + h2(i, 96) * 10;
    x.fillStyle = i < 4 ? `rgba(70,36,80,${0.5 - i * 0.06})` : `rgba(240,160,90,${0.24 - (i - 4) * 0.04})`;
    x.beginPath(); x.ellipse(120 + h2(i, 97) * 720, cy, 90 + h2(i, 98) * 80, 6 + h2(i, 99) * 4, 0, 0, 7); x.fill();
  }
  // a few birds
  x.strokeStyle = '#241430'; x.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    const bx = 200 + i * 90, by = 150 + (i % 2) * 30;
    x.beginPath(); x.moveTo(bx - 5, by); x.quadraticCurveTo(bx, by - 4, bx + 5, by); x.stroke();
  }
  return c;
}
export function bakeRidgeFar() {
  const { c, x } = layer(PLATE_W, 250);
  ridgeFill(x, PLATE_W, 250, (px) => 150 - 30 * vnoise(px * 0.005, 101) - 10 * vnoise(px * 0.014, 102), '#6e3452', '#84446062', 101);
  return c;
}
export function bakeRidgeNear() {
  const { c, x } = layer(PLATE_W, 240);
  ridgeFill(x, PLATE_W, 240, (px) => 120 - 26 * vnoise(px * 0.007, 103) - 9 * vnoise(px * 0.02, 104), '#472244', '#5c305468', 103);
  return c;
}
export function bakeRidgeCrest() {
  const { c, x } = layer(PLATE_W, 190);
  ridgeFill(x, PLATE_W, 190, (px) => 36 - 12 * vnoise(px * 0.011, 105) - 4 * vnoise(px * 0.033, 106), '#171020', '#241832', 105);
  // the walking path etched along the crest
  x.strokeStyle = '#241832'; x.lineWidth = 2;
  x.beginPath();
  for (let px = 0; px <= PLATE_W; px += 8) {
    const py = 40 - 12 * vnoise(px * 0.011, 105) - 4 * vnoise(px * 0.033, 106) + 8;
    px === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
  }
  x.stroke();
  return c;
}

// ---- 10/11 · the Mines of Mo-Hair-A ------------------------------------------------------------
export function bakeMinesGate() {
  const { c, x } = plate([[0, '#0a0e1c'], [0.45, '#0d1220'], [0.7, '#10141f'], [1, '#0a0c10']]);
  for (let i = 0; i < 90; i++) {
    const sx = h2(i, 108) * LW, sy = h2(i, 109) * 220, b = h2(i, 110);
    if (b > 0.6) { x.fillStyle = `rgba(200,212,240,${0.2 + b * 0.3})`; x.fillRect(sx, sy, 1, 1); }
  }
  // the mountain face: huge dark rock slabs
  ridgeFill(x, LW, 340, (px) => 128 - 40 * vnoise(px * 0.006, 111) - 14 * vnoise(px * 0.018, 112), '#12151d', '#1b2029', 111);
  x.fillStyle = '#0e1118'; x.fillRect(-OVER, 300, LW + OVER * 2, LH - 300 + OVER);
  // masonry courses around the gate
  for (let ry = 0; ry < 12; ry++)
    for (let rx = 0; rx < 22; rx++) {
      const bx = rx * 46 + (ry & 1 ? 23 : 0), by = 160 + ry * 26;
      if (by < 130) continue;
      const v = h2(rx, ry, 113);
      x.fillStyle = v > 0.7 ? '#1d222c' : v > 0.35 ? '#171b24' : '#12151d';
      x.fillRect(bx - 23, by, 45, 25);
      x.fillStyle = '#0c0f15'; x.fillRect(bx - 23, by + 24, 46, 1);
    }
  // the great door, shut, with two giant combs carved in relief
  x.fillStyle = '#080a10';
  x.beginPath(); x.moveTo(330, 470); x.lineTo(330, 260); x.arc(430, 260, 100, Math.PI, 0); x.lineTo(530, 470); x.closePath(); x.fill();
  x.strokeStyle = '#232a38'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(332, 470); x.lineTo(332, 260); x.arc(430, 260, 98, Math.PI, 0); x.lineTo(528, 470); x.stroke();
  for (const dx of [386, 474]) comb(x, dx, 268, 132, '#161c28', '#2c3548');
  // steps down to the door
  for (let i = 0; i < 5; i++) {
    x.fillStyle = i % 2 ? '#141821' : '#10131b';
    x.fillRect(240 - i * 26, 470 - (i + 1) * 9, LW - 480 + i * 52, 9);
  }
  // flanking torch brackets (flames live)
  for (const tx of [268, 592]) {
    x.fillStyle = '#242028'; x.fillRect(tx - 4, 330, 8, 22);
    x.fillStyle = '#2e2a34'; x.fillRect(tx - 10, 324, 20, 8);
  }
  return c;
}
export function bakeMinesHall() {
  const { c, x } = plate([[0, '#07060a'], [0.55, '#0a0810'], [1, '#050407']]);
  // back wall with relic-comb niches
  x.fillStyle = '#0d0a12'; x.fillRect(-OVER, 150, LW + OVER * 2, 330);
  for (const nx of [130, 400, 670, 900]) {
    x.fillStyle = '#050408';
    x.beginPath(); x.moveTo(nx - 42, 380); x.lineTo(nx - 42, 210); x.arc(nx, 210, 42, Math.PI, 0); x.lineTo(nx + 42, 380); x.closePath(); x.fill();
    comb(x, nx, 234, 118, '#3a3226', '#5c5138'); // the giant relic combs
  }
  // colonnade: near pillars left/right + receding row
  const pillar = (px, w, top, foot, tone) => {
    x.fillStyle = tone;
    x.fillRect(px - w / 2, top, w, foot - top);
    x.fillStyle = '#08060c';
    x.fillRect(px - w / 2 - 5, top - 8, w + 10, 8);
    x.fillRect(px - w / 2 - 5, foot, w + 10, 8);
    x.fillStyle = 'rgba(255,255,255,0.03)';
    x.fillRect(px - w / 2 + 2, top, 3, foot - top);
  };
  pillar(70, 40, 90, 452, '#151020');
  pillar(890, 40, 90, 452, '#151020');
  pillar(290, 26, 140, 428, '#100c18');
  pillar(670, 26, 140, 428, '#100c18');
  // ceiling vaults
  x.fillStyle = '#040308'; x.fillRect(-OVER, 0, LW + OVER * 2, 96);
  for (let px = 60; px < LW; px += 150) {
    x.strokeStyle = '#0d0a12'; x.lineWidth = 6;
    x.beginPath(); x.arc(px + 75, 96, 75, Math.PI, 0); x.stroke();
  }
  // torch brackets on the near pillars
  for (const tx of [70, 890]) {
    x.fillStyle = '#2c2620'; x.fillRect(tx - 4, 210, 8, 20);
    x.fillStyle = '#3a332a'; x.fillRect(tx - 9, 204, 18, 8);
  }
  // rubble floor
  x.fillStyle = '#0b0810'; x.fillRect(-OVER, 440, LW + OVER * 2, LH - 440 + OVER);
  for (let i = 0; i < 200; i++) {
    const fx = h2(i, 114) * LW, fy = 444 + h2(i, 115) * (LH - 444), v = h2(fx, fy, 116);
    x.fillStyle = v > 0.8 ? '#161020' : '#0a0710';
    x.fillRect(fx, fy, 2, 1);
  }
  for (let i = 0; i < 8; i++) { // broken stones
    const fx = 60 + h2(i, 117) * 840, fy = 448 + h2(i, 118) * 46, r = 4 + h2(i, 119) * 7;
    x.fillStyle = '#120e1a';
    x.beginPath(); x.moveTo(fx - r, fy); x.lineTo(fx - r * 0.4, fy - r * 0.8); x.lineTo(fx + r * 0.5, fy - r * 0.6); x.lineTo(fx + r, fy); x.closePath(); x.fill();
  }
  return c;
}
// a comb: spine + teeth. (h is the total height)
export function comb(x, cx, topY, h, spine, tooth) {
  const w = h * 0.34;
  x.fillStyle = spine;
  x.fillRect(cx - w / 2, topY, w, h * 0.42); // spine block
  x.fillStyle = tooth;
  const teeth = 9;
  for (let i = 0; i < teeth; i++) {
    const tw = (w * 0.72) / teeth;
    x.fillRect(cx - w * 0.36 + i * (w * 0.72) / teeth + tw * 0.18, topY + h * 0.4, tw * 0.64, h * 0.58 - (i % 3) * 2);
  }
  x.fillStyle = 'rgba(255,255,255,0.06)';
  x.fillRect(cx - w / 2 + 2, topY, 2, h * 0.4);
}

// ---- 12 · the chasm under the hall (Baldrog rises) ----------------------------------------------
export function bakeChasm() {
  const { c, x } = plate([[0, '#050408'], [0.55, '#08060c'], [1, '#040305']]);
  // far wall, faint pillars
  x.fillStyle = '#0a0810'; x.fillRect(-OVER, 120, LW + OVER * 2, 340);
  for (const px of [180, 480, 780]) { x.fillStyle = '#0d0a14'; x.fillRect(px - 16, 130, 32, 330); }
  x.fillStyle = '#030204'; x.fillRect(-OVER, 0, LW + OVER * 2, 120);
  // the floor with a huge torn gap across the middle
  x.fillStyle = '#0d0a12'; x.fillRect(-OVER, 340, LW + OVER * 2, 130);
  const gapEdge = (px) => 352 + 10 * vnoise(px * 0.02, 121);
  x.fillStyle = '#020103';
  x.beginPath(); x.moveTo(-OVER, 470);
  for (let px = -OVER; px <= LW + OVER; px += 10) x.lineTo(px, gapEdge(px) + 22 * Math.sin(px * 0.011 + 1) ** 2);
  x.lineTo(LW + OVER, 470); x.closePath(); x.fill();
  // fire glow rising inside the gap (pulsed live)
  const g = x.createLinearGradient(0, 470, 0, 350);
  g.addColorStop(0, '#c33d0e'); g.addColorStop(0.5, '#5e1c06'); g.addColorStop(1, 'rgba(20,6,2,0)');
  x.save();
  x.beginPath(); x.moveTo(-OVER, 470);
  for (let px = -OVER; px <= LW + OVER; px += 10) x.lineTo(px, gapEdge(px) + 22 * Math.sin(px * 0.011 + 1) ** 2);
  x.lineTo(LW + OVER, 470); x.closePath(); x.clip();
  x.fillStyle = g; x.fillRect(-OVER, 330, LW + OVER * 2, 140);
  x.restore();
  // cracked floor slabs leaning into the gap
  x.fillStyle = '#100c16';
  for (const [sx, sw] of [[80, 70], [300, 60], [640, 80], [840, 60]]) {
    x.beginPath(); x.moveTo(sx, 344); x.lineTo(sx + sw, 348); x.lineTo(sx + sw - 8, 368); x.lineTo(sx + 6, 362); x.closePath(); x.fill();
  }
  return c;
}

// ---- 13/14 · the stone bridge over the dark ----------------------------------------------------
export function bakeBridge() {
  const { c, x } = plate([[0, '#070509'], [0.6, '#0a070d'], [1, '#030204']]);
  // far pillars dwindling into the dark
  for (let i = 0; i < 4; i++) {
    const px = 150 + i * 220, w = 34 - i * 6;
    x.fillStyle = i % 2 ? '#0e0a12' : '#0b080f';
    x.fillRect(px - w / 2, 150, w, 250);
  }
  x.fillStyle = '#040305'; x.fillRect(-OVER, 0, LW + OVER * 2, 140);
  // chasm void below with a faint fire tint at its throat
  const g = x.createLinearGradient(0, 476, 0, 392);
  g.addColorStop(0, '#571b07'); g.addColorStop(0.6, '#2a0e05'); g.addColorStop(1, 'rgba(6,3,2,0)');
  x.fillStyle = g; x.fillRect(-OVER, 392, LW + OVER * 2, 90);
  // the span: deck + balustrade, seen in three-quarter
  const deckY = 366;
  x.fillStyle = '#191420';
  x.beginPath(); x.moveTo(-OVER, deckY + 8); x.lineTo(LW + OVER, deckY - 4); x.lineTo(LW + OVER, deckY + 34); x.lineTo(-OVER, deckY + 52); x.closePath(); x.fill();
  x.fillStyle = '#221a2c'; // deck top face
  x.beginPath(); x.moveTo(-OVER, deckY + 8); x.lineTo(LW + OVER, deckY - 4); x.lineTo(LW + OVER, deckY + 2); x.lineTo(-OVER, deckY + 14); x.closePath(); x.fill();
  // balustrade posts, receding to the right
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, px = 20 + u * 950, ph = 26 - u * 8;
    x.fillStyle = '#141020';
    x.fillRect(px, deckY + 2 - u * 10 - ph, 7 - u * 2.5, ph + 4);
  }
  x.fillStyle = '#171128'; // rail
  x.beginPath(); x.moveTo(16, deckY - 32); x.lineTo(974, deckY - 42); x.lineTo(974, deckY - 36); x.lineTo(16, deckY - 26); x.closePath(); x.fill();
  // stone seams across the deck
  x.strokeStyle = '#0d0a14'; x.lineWidth = 1.4;
  for (let i = 0; i <= 13; i++) {
    const u = i / 13, px = 10 + u * 950;
    x.beginPath(); x.moveTo(px, deckY + 8 - u * 9); x.lineTo(px, deckY + 46 - u * 12); x.stroke();
  }
  // a broken arch far right where the span will give way
  x.fillStyle = '#0b0810';
  x.beginPath(); x.moveTo(905, 150); x.lineTo(960, 158); x.lineTo(950, 368); x.lineTo(900, 368); x.closePath(); x.fill();
  return c;
}

// ---- 16 · the ashlands -------------------------------------------------------------------------
export function bakeAshlands() {
  const { c, x } = plate([[0, '#1c1d22'], [0.4, '#2a2b31'], [0.62, '#3a3a40'], [0.8, '#333236'], [1, '#232226']]);
  // sulphur haze band
  x.fillStyle = 'rgba(120,100,70,0.08)';
  x.fillRect(-OVER, 240, LW + OVER * 2, 60);
  // Mount Dome far off, smooth dome + smoke column
  domeSil(x, 770, 300, 0.85, '#1e1f25');
  x.fillStyle = 'rgba(64,62,70,0.85)';
  x.beginPath(); x.moveTo(758, 196);
  for (let i = 0; i < 8; i++) x.lineTo(752 + Math.sin(i * 1.7) * 10, 196 - i * 26);
  x.lineTo(776, 196 - 26 * 7);
  for (let i = 7; i >= 0; i--) x.lineTo(770 + Math.sin(i * 1.3) * 10, 196 - i * 26);
  x.closePath(); x.fill();
  // its crown smoulders
  x.fillStyle = 'rgba(255,110,40,0.12)';
  x.beginPath(); x.arc(770, 178, 26, 0, 7); x.fill();
  ridgeFill(x, LW, 130, (px) => 306 - 16 * vnoise(px * 0.008, 126) - 6 * vnoise(px * 0.026, 127), '#232428', '#2c2d32', 126);
  x.fillStyle = '#1f2024'; x.fillRect(-OVER, 356, LW + OVER * 2, LH - 356 + OVER);
  for (let i = 0; i < 420; i++) {
    const fx = h2(i, 128) * LW, fy = 358 + h2(i, 129) * (LH - 358), v = h2(fx, fy, 130);
    x.fillStyle = v > 0.85 ? '#2b2c31' : v > 0.5 ? '#1e1f23' : '#191a1e';
    x.fillRect(fx, fy, 2, 1);
  }
  // dead trees
  for (const [tx, s] of [[130, 1], [420, 0.75], [660, 0.9]]) {
    x.strokeStyle = '#15161a'; x.lineCap = 'round';
    x.lineWidth = 3 * s;
    x.beginPath(); x.moveTo(tx, 372); x.lineTo(tx - 4 * s, 372 - 44 * s); x.stroke();
    x.lineWidth = 1.6 * s;
    x.beginPath();
    x.moveTo(tx - 2.6 * s, 344); x.lineTo(tx - 15 * s, 332);
    x.moveTo(tx - 3.4 * s, 336); x.lineTo(tx + 11 * s, 326);
    x.stroke();
  }
  // the trudge path
  x.fillStyle = '#26272b';
  x.beginPath(); x.moveTo(-OVER, 466); x.quadraticCurveTo(480, 442, LW + OVER, 468); x.lineTo(LW + OVER, LH + OVER); x.lineTo(-OVER, LH + OVER); x.closePath(); x.fill();
  return c;
}
// smooth bald volcano silhouette; base centre (bx, groundY), k = scale
export function domeSil(x, bx, groundY, k, col) {
  x.fillStyle = col;
  x.beginPath();
  x.moveTo(bx - 260 * k, groundY);
  x.quadraticCurveTo(bx - 150 * k, groundY - 120 * k, bx - 60 * k, groundY - 150 * k);
  x.arc(bx, groundY - 150 * k, 60 * k, Math.PI, 0); // the smooth bald crown
  x.quadraticCurveTo(bx + 150 * k, groundY - 120 * k, bx + 260 * k, groundY);
  x.closePath(); x.fill();
}

// ---- 17 · golbald's rock spur ------------------------------------------------------------------
export function bakeGolbaldRock() {
  const { c, x } = plate([[0, '#232028'], [0.45, '#2e2b33'], [0.7, '#3a373f'], [1, '#262329']]);
  for (let i = 0; i < 5; i++) {
    x.fillStyle = `rgba(60,58,66,${0.4 - (i % 3) * 0.08})`;
    x.beginPath(); x.ellipse(120 + i * 190, 80 + (i % 3) * 24, 90, 9, 0, 0, 7); x.fill();
  }
  // a thin cold moon over the spur
  const mg = x.createRadialGradient(700, 104, 6, 700, 104, 90);
  mg.addColorStop(0, 'rgba(214,224,244,0.4)'); mg.addColorStop(1, 'rgba(214,224,244,0)');
  x.fillStyle = mg; x.fillRect(610, 14, 180, 180);
  x.fillStyle = '#d6e0f4'; x.beginPath(); x.arc(700, 104, 17, 0, 7); x.fill();
  x.fillStyle = '#b4c0dc'; x.beginPath(); x.arc(694, 108, 4, 0, 7); x.arc(707, 98, 3, 0, 7); x.fill();
  ridgeFill(x, LW, 140, (px) => 250 - 22 * vnoise(px * 0.007, 131) - 8 * vnoise(px * 0.022, 132), '#2b2830', '#34313a', 131);
  // the great rock spur jutting over the path, upper-left
  x.fillStyle = '#38343e';
  x.beginPath();
  x.moveTo(-OVER, 150);
  x.lineTo(360, 168); x.lineTo(430, 196); x.lineTo(380, 252); x.lineTo(240, 268); x.lineTo(60, 286); x.lineTo(-OVER, 292);
  x.closePath(); x.fill();
  x.fillStyle = '#413c48'; // top light
  x.beginPath(); x.moveTo(-OVER, 150); x.lineTo(360, 168); x.lineTo(430, 196); x.lineTo(-OVER, 210); x.closePath(); x.fill();
  // its cracked face
  x.strokeStyle = '#241f2b'; x.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const cx0 = 30 + i * 66;
    x.beginPath(); x.moveTo(cx0, 176 + h2(i, 133) * 20);
    x.lineTo(cx0 + 14, 214 + h2(i, 134) * 20); x.lineTo(cx0 - 6, 250 + h2(i, 135) * 18);
    x.stroke();
  }
  // scree slope down to the path
  x.fillStyle = '#2e2b33'; x.fillRect(-OVER, 286, LW + OVER * 2, LH - 286 + OVER);
  for (let i = 0; i < 380; i++) {
    const fx = h2(i, 136) * LW, fy = 290 + h2(i, 137) * (LH - 290), v = h2(fx, fy, 138);
    x.fillStyle = v > 0.85 ? '#3c3844' : v > 0.5 ? '#292630' : '#232028';
    x.fillRect(fx, fy, 2, 1);
  }
  // the lower path the pair trudges along
  x.fillStyle = '#35323a';
  x.beginPath(); x.moveTo(-OVER, 462); x.quadraticCurveTo(480, 440, LW + OVER, 464); x.lineTo(LW + OVER, LH + OVER); x.lineTo(-OVER, LH + OVER); x.closePath(); x.fill();
  return c;
}

// ---- 18/23 · the Dark Tower with the EYE -------------------------------------------------------
export function bakeEyeTower() {
  const { c, x } = plate([[0, '#160a10'], [0.35, '#2a0f14'], [0.6, '#43141a'], [0.8, '#571a1a'], [1, '#38100e']]);
  // brooding clouds
  for (let i = 0; i < 7; i++) {
    x.fillStyle = `rgba(12,6,10,${0.55 - (i % 3) * 0.1})`;
    x.beginPath(); x.ellipse(100 + i * 150, 70 + (i % 3) * 26, 100 + h2(i, 141) * 50, 10 + h2(i, 142) * 6, 0, 0, 7); x.fill();
  }
  // jagged ash mountains
  ridgeFill(x, LW, 160, (px) => 250 - 40 * vnoise(px * 0.005, 143) - 14 * vnoise(px * 0.016, 144), '#150a0e', '#1f1014', 143);
  ridgeFill(x, LW, 160, (px) => 300 - 24 * vnoise(px * 0.008, 145) - 8 * vnoise(px * 0.024, 146), '#0e0609', null, 145);
  // the tower: black spire, twin horns, the EYE between (icon live)
  x.fillStyle = '#080406';
  x.beginPath();
  x.moveTo(560, 456); x.lineTo(586, 200); x.lineTo(620, 168); x.lineTo(700, 160); x.lineTo(736, 196); x.lineTo(756, 456);
  x.closePath(); x.fill();
  // the two horns
  x.fillStyle = '#080406';
  x.beginPath(); x.moveTo(592, 208); x.lineTo(566, 118); x.lineTo(606, 172); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(726, 204); x.lineTo(758, 112); x.lineTo(748, 190); x.closePath(); x.fill();
  // the eye seat between the horns
  x.fillStyle = '#0d070a';
  x.beginPath(); x.ellipse(662, 196, 58, 34, 0, 0, 7); x.fill();
  // faint window slits down the spire
  x.fillStyle = '#571a1a';
  for (let i = 0; i < 6; i++) x.fillRect(650 + (i % 2) * 8, 250 + i * 32, 4, 9);
  // slag ground with fire pits
  x.fillStyle = '#0a0507'; x.fillRect(-OVER, 420, LW + OVER * 2, LH - 420 + OVER);
  for (let i = 0; i < 300; i++) {
    const fx = h2(i, 147) * LW, fy = 424 + h2(i, 148) * (LH - 424), v = h2(fx, fy, 149);
    x.fillStyle = v > 0.8 ? '#160b0d' : '#0b0608';
    x.fillRect(fx, fy, 2, 1);
  }
  return c;
}

// ---- 19 · Mount Dome near (the climb) ----------------------------------------------------------
export function bakeDome() {
  const { c, x } = plate([[0, '#1a1218'], [0.4, '#2a1a1c'], [0.66, '#3c2222'], [0.85, '#4a2820'], [1, '#2c1a16']]);
  for (let i = 0; i < 6; i++) {
    x.fillStyle = `rgba(16,10,12,${0.5 - (i % 3) * 0.08})`;
    x.beginPath(); x.ellipse(120 + i * 160, 64 + (i % 3) * 22, 100 + h2(i, 151) * 50, 9, 0, 0, 7); x.fill();
  }
  // the dome fills the right half, crown out of frame
  x.fillStyle = '#241418';
  x.beginPath();
  x.moveTo(330, LH + OVER);
  x.quadraticCurveTo(420, 330, 560, 240);
  x.quadraticCurveTo(700, 160, 900, 130);
  x.lineTo(LW + OVER, 120); x.lineTo(LW + OVER, LH + OVER);
  x.closePath(); x.fill();
  // its smooth crown catches dull fire from within
  const g = x.createRadialGradient(760, 150, 10, 760, 150, 220);
  g.addColorStop(0, 'rgba(255,120,50,0.32)'); g.addColorStop(1, 'rgba(255,120,50,0)');
  x.fillStyle = g; x.fillRect(540, 0, 440, 380);
  // short lava nicks near the crown — the live embers carry all the motion
  x.strokeStyle = 'rgba(255,110,40,0.28)'; x.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const vx = 620 + i * 62;
    x.beginPath(); x.moveTo(vx, 168 + h2(i, 152) * 22);
    x.lineTo(vx - 5, 196 + h2(i, 153) * 20); x.stroke();
  }
  // slope texture
  x.fillStyle = '#1c1014'; x.fillRect(-OVER, 330, 560, LH - 330 + OVER);
  for (let i = 0; i < 320; i++) {
    const fx = h2(i, 154) * 560, fy = 334 + h2(i, 155) * (LH - 334), v = h2(fx, fy, 156);
    x.fillStyle = v > 0.85 ? '#2c1a1e' : '#180e12';
    x.fillRect(fx, fy, 2, 1);
  }
  // the switchback climb path up-left
  x.strokeStyle = '#332026'; x.lineWidth = 7;
  x.beginPath(); x.moveTo(40, 500); x.quadraticCurveTo(200, 470, 260, 424); x.quadraticCurveTo(330, 380, 470, 352); x.stroke();
  x.strokeStyle = '#2a1a1f'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(40, 503); x.quadraticCurveTo(200, 473, 260, 427); x.quadraticCurveTo(330, 383, 470, 355); x.stroke();
  return c;
}

// ---- 20/21/22 · the crater (rim, lava lake, melt+eruption) --------------------------------------
export function bakeCrater() {
  const { c, x } = plate([[0, '#120a0c'], [0.4, '#1c1012'], [0.7, '#2a1414'], [1, '#160b0a']]);
  for (let i = 0; i < 5; i++) {
    x.fillStyle = `rgba(30,14,12,${0.5 - (i % 3) * 0.08})`;
    x.beginPath(); x.ellipse(140 + i * 180, 60 + (i % 3) * 20, 110, 8, 0, 0, 7); x.fill();
  }
  // far crater wall
  ridgeFill(x, LW, 120, (px) => 180 - 18 * vnoise(px * 0.008, 158) - 6 * vnoise(px * 0.024, 159), '#1a0e10', '#241314', 158);
  // the lava lake (base bake; blobs + heat live)
  x.fillStyle = '#e05a14';
  x.fillRect(-OVER, 300, LW + OVER * 2, LH - 300 + OVER);
  const lg = x.createLinearGradient(0, 300, 0, LH + OVER);
  lg.addColorStop(0, '#ff9a30'); lg.addColorStop(0.5, '#e8641a'); lg.addColorStop(1, '#b03008');
  x.fillStyle = lg; x.fillRect(-OVER, 300, LW + OVER * 2, LH - 300 + OVER);
  // darker cooled crust rafts
  x.fillStyle = '#3a1408';
  for (let i = 0; i < 14; i++) {
    const fx = h2(i, 160) * LW, fy = 316 + h2(i, 161) * 190, r = 8 + h2(i, 162) * 22;
    x.beginPath(); x.ellipse(fx, fy, r, r * 0.4, h2(i, 163) * 3, 0, 7); x.fill();
  }
  // rim rocks, foreground
  x.fillStyle = '#150c0e';
  x.beginPath();
  x.moveTo(-OVER, LH + OVER);
  x.lineTo(-OVER, 420);
  for (let px = 0; px <= LW + OVER; px += 30) {
    x.lineTo(px, 408 + 26 * vnoise(px * 0.012, 164) + 10 * vnoise(px * 0.05, 165) - (px > 640 ? (px - 640) * 0.12 : 0));
  }
  x.lineTo(LW + OVER, LH + OVER);
  x.closePath(); x.fill();
  x.fillStyle = '#1e1214'; // rim top light
  x.beginPath();
  for (let px = 0; px <= LW + OVER; px += 30) {
    const py = 408 + 26 * vnoise(px * 0.012, 164) + 10 * vnoise(px * 0.05, 165) - (px > 640 ? (px - 640) * 0.12 : 0);
    px === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
  }
  x.lineTo(LW + OVER, 428); x.lineTo(-OVER, 434); x.closePath(); x.fill();
  return c;
}

// ---- 25 · rescue spire in the caldera ----------------------------------------------------------
export function bakeRescue() {
  const { c, x } = plate([[0, '#160b0e'], [0.4, '#241012'], [0.7, '#331614'], [1, '#1c0d0b']]);
  for (let i = 0; i < 5; i++) {
    x.fillStyle = `rgba(40,16,14,${0.5 - (i % 3) * 0.08})`;
    x.beginPath(); x.ellipse(150 + i * 170, 66 + (i % 3) * 22, 105, 9, 0, 0, 7); x.fill();
  }
  // caldera wall behind
  ridgeFill(x, LW, 150, (px) => 208 - 26 * vnoise(px * 0.007, 166) - 9 * vnoise(px * 0.02, 167), '#1c0e10', '#261313', 166);
  // lava lake
  const lg = x.createLinearGradient(0, 330, 0, LH + OVER);
  lg.addColorStop(0, '#ff8c28'); lg.addColorStop(0.6, '#e05a16'); lg.addColorStop(1, '#a02c08');
  x.fillStyle = lg; x.fillRect(-OVER, 330, LW + OVER * 2, LH - 330 + OVER);
  x.fillStyle = '#3a1408';
  for (let i = 0; i < 10; i++) {
    const fx = h2(i, 168) * LW, fy = 350 + h2(i, 169) * 160, r = 8 + h2(i, 170) * 18;
    x.beginPath(); x.ellipse(fx, fy, r, r * 0.38, h2(i, 171) * 3, 0, 7); x.fill();
  }
  // the spire, left of the caption's tail: slim crown, top kept BELOW the title band, whole
  // column shifted into the word gap after "IS" so hero + caption never collide
  x.fillStyle = '#1c1014';
  x.beginPath();
  x.moveTo(460, 470); x.lineTo(480, 330); x.lineTo(470, 282); x.lineTo(498, 252); x.lineTo(528, 262); x.lineTo(524, 322); x.lineTo(548, 470);
  x.closePath(); x.fill();
  x.fillStyle = '#2a1a1c'; // lit face
  x.beginPath(); x.moveTo(480, 330); x.lineTo(470, 282); x.lineTo(498, 252); x.lineTo(510, 274); x.lineTo(504, 330); x.closePath(); x.fill();
  x.fillStyle = '#160c0e'; // its flat top
  x.beginPath(); x.ellipse(511, 256, 23, 6, 0, 0, 7); x.fill();
  // heat shimmer hint above the melt
  x.fillStyle = 'rgba(255,140,50,0.06)';
  x.fillRect(-OVER, 330, LW + OVER * 2, 60);
  return c;
}

// ---- 24 · hairify plain -------------------------------------------------------------------------
export function bakeHairify() {
  const { c, x } = plate([[0, '#5c78a8'], [0.35, '#88a8c0'], [0.6, '#d8ce9c'], [0.8, '#c9b478'], [1, '#9a9a58']]);
  for (let i = 0; i < 6; i++) {
    x.fillStyle = `rgba(244,248,252,${0.7 - (i % 3) * 0.12})`;
    x.beginPath(); x.ellipse(120 + i * 165, 56 + (i % 3) * 20, 70 + h2(i, 172) * 44, 8, 0, 0, 7); x.fill();
  }
  ridgeFill(x, LW, 130, (px) => 240 - 24 * vnoise(px * 0.006, 173) - 8 * vnoise(px * 0.018, 174), '#8a9a5c', '#9cab68', 173);
  ridgeFill(x, LW, 130, (px) => 292 - 18 * vnoise(px * 0.008, 175) - 6 * vnoise(px * 0.024, 176), '#7a8c4c', '#8a9c58', 175);
  x.fillStyle = '#6d8440'; x.fillRect(-OVER, 348, LW + OVER * 2, LH - 348 + OVER);
  for (let i = 0; i < 640; i++) {
    const gx = h2(i, 177) * (LW + OVER * 2) - OVER, gy = 350 + h2(i, 178) * (LH - 350 + OVER), v = h2(i, 179);
    x.strokeStyle = v > 0.6 ? '#7d984c' : '#59703a';
    x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx + (v - 0.5) * 4, gy - 4 - v * 7); x.stroke();
  }
  return c;
}

// ---- 28 · end plate — the restored land --------------------------------------------------------
export function bakeEndPlate() {
  const { c, x } = plate([[0, '#7cb0dc'], [0.35, '#a8d0e4'], [0.6, '#f0e4bc'], [0.8, '#f2d890'], [1, '#dcb96a']]);
  const g = x.createRadialGradient(480, 150, 10, 480, 150, 240);
  g.addColorStop(0, 'rgba(255,248,214,0.9)'); g.addColorStop(0.5, 'rgba(255,240,190,0.3)'); g.addColorStop(1, 'rgba(255,240,190,0)');
  x.fillStyle = g; x.fillRect(240, -90, 480, 480);
  for (let i = 0; i < 6; i++) {
    x.fillStyle = `rgba(255,253,246,${0.75 - (i % 3) * 0.12})`;
    x.beginPath(); x.ellipse(120 + i * 170, 58 + (i % 3) * 20, 66 + h2(i, 180) * 40, 8, 0, 0, 7); x.fill();
  }
  ridgeFill(x, LW, 150, (px) => 244 - 26 * vnoise(px * 0.006, 181) - 8 * vnoise(px * 0.02, 182), '#b0a050', '#c4b45e', 181);
  ridgeFill(x, LW, 150, (px) => 296 - 20 * vnoise(px * 0.008, 183) - 7 * vnoise(px * 0.024, 184), '#96913e', '#a8a24a', 183);
  x.fillStyle = '#7d9a3e'; x.fillRect(-OVER, 350, LW + OVER * 2, LH - 350 + OVER);
  // hair-trees: the land itself grows flowing locks
  for (let i = 0; i < 9; i++) {
    const tx = 60 + h2(i, 185) * 860, ty = 352 + h2(i, 186) * 40, s = 0.8 + h2(i, 187) * 0.9;
    x.strokeStyle = ['#8a6a3a', '#6a7674', '#9d8943'][i % 3];
    x.lineCap = 'round';
    for (let l = 0; l < 7; l++) {
      const a = -Math.PI / 2 + (l - 3) * 0.16 + Math.sin(i + l) * 0.06;
      x.lineWidth = 2.2 * s;
      x.beginPath(); x.moveTo(tx, ty);
      x.quadraticCurveTo(tx + Math.cos(a) * 20 * s, ty + Math.sin(a) * 20 * s, tx + Math.cos(a) * 40 * s, ty + Math.sin(a) * 44 * s);
      x.stroke();
    }
  }
  for (let i = 0; i < 600; i++) {
    const gx = h2(i, 188) * (LW + OVER * 2) - OVER, gy = 352 + h2(i, 189) * (LH - 352 + OVER), v = h2(i, 190);
    x.strokeStyle = v > 0.6 ? '#8caa4c' : '#63823a';
    x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx + (v - 0.5) * 4, gy - 4 - v * 7); x.stroke();
  }
  return c;
}

// =================================================================================================
// ACTORS / PROPS (procedural)
// =================================================================================================

export function silhouette(R, color) {
  const c = canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, R.w, R.h);
  return c;
}

// GRANDFLO's staff: wood shaft, iron collar, crystal. glowK lights the crystal (0..1).
export function staff(x, px, py, ang, len, glowK, t) {
  x.save();
  x.translate(px, py);
  x.rotate(ang);
  x.strokeStyle = '#5a4326'; x.lineWidth = 3.4;
  x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -len); x.stroke();
  x.strokeStyle = '#6d5430'; x.lineWidth = 1.4;
  x.beginPath(); x.moveTo(-0.8, -6); x.lineTo(-0.8, -len + 8); x.stroke();
  x.fillStyle = '#3a2c18'; x.fillRect(-2.4, -len + 4, 4.8, 8); // grip wrap
  x.fillStyle = '#4a4a52'; x.fillRect(-3.4, -len - 7, 6.8, 6); // collar
  // the crystal
  const cx2 = 0, cy2 = -len - 15, ck = 0.75 + (glowK > 0 ? 0.25 * flick(t, 91) : 0);
  if (glowK > 0) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(cx2, cy2, 1, cx2, cy2, 16 * ck);
    g.addColorStop(0, `rgba(230,240,255,${0.85 * glowK})`); g.addColorStop(0.5, `rgba(180,210,255,${0.35 * glowK})`); g.addColorStop(1, 'rgba(180,210,255,0)');
    x.fillStyle = g; x.fillRect(cx2 - 16 * ck, cy2 - 16 * ck, 32 * ck, 32 * ck);
    x.restore();
  }
  x.fillStyle = glowK > 0.3 ? '#eaf2ff' : '#9fb2c8';
  x.beginPath(); x.moveTo(cx2, cy2 - 7); x.lineTo(cx2 + 4.4, cy2); x.lineTo(cx2, cy2 + 7); x.lineTo(cx2 - 4.4, cy2); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.85)'; x.fillRect(cx2 - 1, cy2 - 4, 1.6, 3);
  x.restore();
  const L = len + 15; // crystal centre offset
  return { tipX: px + Math.sin(ang) * L, tipY: py - Math.cos(ang) * L };
}

// the One Razor: gold, glinting. glintPh = analytic phase (drive from t). s = scale.
export function razorGold(x, px, py, rot, s, glintPh) {
  x.save();
  x.translate(px, py);
  x.rotate(rot);
  x.scale(s, s);
  x.fillStyle = '#241a10'; x.fillRect(-15, -2.4, 13, 4.8); // handle
  x.fillStyle = '#3d2e1a'; x.fillRect(-15, -2.4, 13, 1.6);
  x.fillStyle = '#8a6a1e'; x.fillRect(-3, -3.4, 3.4, 6.8); // pivot
  // the gold blade
  x.fillStyle = '#c9992e';
  x.beginPath(); x.moveTo(0, -3.2); x.lineTo(17, -2.4); x.lineTo(17, 2.6); x.lineTo(0, 3.2); x.closePath(); x.fill();
  x.fillStyle = '#f2d478'; x.fillRect(0, -3.2, 17, 1.2); // top gleam
  x.fillStyle = '#f8ecc2'; x.fillRect(1, -0.6, 16, 1); // the edge
  x.fillStyle = '#7a5c16'; x.fillRect(0, 2.2, 17, 1); // lower shade
  if (glintPh > 0) { // travelling glint
    const gx = 1 + (glintPh % 1) * 15;
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = `rgba(255,246,214,${0.9 * Math.sin(Math.PI * (glintPh % 1))})`;
    x.fillRect(gx - 1.6, -3.4, 3.2, 6.6);
    x.restore();
  }
  x.restore();
}

// sparkle cross for glints
export function sparkle(x, px, py, r, a, t) {
  if (a <= 0.01) return;
  x.save();
  x.globalCompositeOperation = 'lighter';
  const k = 0.8 + 0.2 * Math.sin(t * 21);
  x.strokeStyle = `rgba(255,244,214,${a})`;
  x.lineWidth = 1.6;
  x.beginPath();
  x.moveTo(px - r * k, py); x.lineTo(px + r * k, py);
  x.moveTo(px, py - r * k); x.lineTo(px, py + r * k);
  x.stroke();
  x.fillStyle = `rgba(255,250,230,${a})`;
  x.beginPath(); x.arc(px, py, 1.8, 0, 7); x.fill();
  x.restore();
}

// GOLBALD's tiny toupee: a ratty copper tuft. clutch 0 = in his hands, 1 = pressed to a scalp.
export function toupee(x, px, py, s, t) {
  x.save();
  x.translate(px, py);
  x.rotate(Math.sin(t * 2.1) * 0.08);
  x.scale(s, s);
  x.fillStyle = '#8a5c28';
  x.beginPath(); x.ellipse(0, 0, 7, 4.6, 0, 0, 7); x.fill();
  x.strokeStyle = '#a5742f'; x.lineWidth = 1.3; x.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.4 + Math.sin(t * 3 + i) * 0.1;
    x.beginPath(); x.moveTo(i - 2.5, -1);
    x.quadraticCurveTo(i - 2 + Math.cos(a) * 4, -5 + Math.sin(a) * 3, i - 2 + Math.cos(a) * 7, -7 + Math.sin(a) * 4);
    x.stroke();
  }
  x.fillStyle = '#6a441c';
  x.beginPath(); x.ellipse(0, 2.4, 6, 2, 0, 0, 7); x.fill();
  x.restore();
}

// a Razorwraith: black caped rider, silhouette only. rise 0..1 lifts it onto the ridge.
export function wraith(x, px, py, s, t, seed) {
  x.save();
  x.translate(px, py);
  x.scale(s, s);
  const sway = Math.sin(t * 1.1 + seed * 7) * 2;
  x.fillStyle = '#0a0810';
  // steed
  x.beginPath();
  x.moveTo(-26, 0); x.quadraticCurveTo(-30, -18 + sway * 0.3, -18, -26);
  x.lineTo(16, -26); x.quadraticCurveTo(30, -24, 32, -8); x.lineTo(30, 0);
  x.closePath(); x.fill();
  x.fillRect(-22, -2, 5, 8 + hash(seed + Math.floor(t * 6)) * 3); // legs
  x.fillRect(10, -2, 5, 9);
  // neck + head
  x.beginPath(); x.moveTo(12, -26); x.quadraticCurveTo(20, -34, 30, -33 + sway * 0.4);
  x.lineTo(36, -28); x.lineTo(26, -22); x.closePath(); x.fill();
  // the hooded rider, leaning into the wind
  x.save();
  x.translate(-2 + sway, 0);
  x.rotate(-0.12 + sway * 0.01);
  x.beginPath();
  x.moveTo(-8, -24);
  x.quadraticCurveTo(-10, -46, 2, -50);
  x.quadraticCurveTo(14, -46, 12, -24);
  x.closePath(); x.fill();
  x.beginPath(); // hood tip
  x.moveTo(2, -50); x.quadraticCurveTo(12, -56, 16, -46); x.lineTo(8, -42); x.closePath(); x.fill();
  // the cape, torn and streaming
  x.beginPath();
  x.moveTo(-8, -44);
  for (let i = 0; i < 4; i++) {
    const u = i / 4;
    x.quadraticCurveTo(-18 - u * 8, -40 + u * 14 + Math.sin(t * 2.2 + i + seed) * 3, -26 - u * 9, -30 + u * 12 + Math.sin(t * 2.6 + i * 2) * 4);
    x.lineTo(-20 - u * 7, -28 + u * 12);
  }
  x.lineTo(-6, -22); x.closePath(); x.fill();
  x.restore();
  x.restore();
}

// ---- BALDROG (fully procedural) ----------------------------------------------------------------
// Massive bald head dome with fire-crack veins + horns; smoke wings; fire whip; embers.
export function baldrogHead(x, px, py, k, t, opts = {}) {
  const { eclipse = 1, roar = 0 } = opts;
  x.save();
  x.translate(px, py);
  x.scale(k, k);
  // fire halo behind the whole head so the silhouette reads against the dark
  x.save();
  x.globalCompositeOperation = 'lighter';
  const halo = x.createRadialGradient(0, -10, 10, 0, -10, 130);
  halo.addColorStop(0, `rgba(255,120,40,${0.34 * eclipse})`);
  halo.addColorStop(0.6, `rgba(200,70,20,${0.16 * eclipse})`);
  halo.addColorStop(1, 'rgba(200,70,20,0)');
  x.fillStyle = halo;
  x.fillRect(-130, -140, 260, 260);
  x.restore();
  // smoke wings behind (two drifting shrouds)
  x.fillStyle = '#2e2216';
  for (const side of [-1, 1]) {
    x.save();
    x.scale(side, 1);
    x.beginPath();
    x.moveTo(20, -60);
    for (let i = 0; i < 5; i++) {
      const u = i / 5;
      x.quadraticCurveTo(60 + u * 50, -80 - u * 40 + Math.sin(t * 1.3 + i) * 6, 96 + u * 46, -30 - u * 26 + Math.sin(t * 1.7 + i * 2) * 8);
    }
    x.quadraticCurveTo(60, -6, 20, -18);
    x.closePath(); x.fill();
    x.restore();
  }
  // horns, catching the fire on their inner edge
  x.fillStyle = BALDROG_PAL.horn;
  x.beginPath(); x.moveTo(-46, -52); x.quadraticCurveTo(-86, -70, -96, -116);
  x.quadraticCurveTo(-70, -84, -38, -72); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(46, -52); x.quadraticCurveTo(86, -70, 96, -116);
  x.quadraticCurveTo(70, -84, 38, -72); x.closePath(); x.fill();
  x.strokeStyle = `rgba(255,140,60,${0.5 * eclipse})`;
  x.lineWidth = 2;
  x.beginPath(); x.moveTo(-44, -56); x.quadraticCurveTo(-78, -72, -90, -110); x.stroke();
  x.beginPath(); x.moveTo(44, -56); x.quadraticCurveTo(78, -72, 90, -110); x.stroke();
  // the dome
  x.fillStyle = BALDROG_PAL.head;
  x.beginPath();
  x.moveTo(-64, 40);
  x.quadraticCurveTo(-70, -30, 0, -66);
  x.quadraticCurveTo(70, -30, 64, 40);
  x.closePath(); x.fill();
  // dome sheen + fire rim up from the chin
  x.fillStyle = 'rgba(255,140,60,0.12)';
  x.beginPath(); x.ellipse(-20, -30, 30, 20, -0.5, 0, 7); x.fill();
  const rim = x.createLinearGradient(0, 40, 0, -14);
  rim.addColorStop(0, `rgba(255,120,40,${0.5 * eclipse})`);
  rim.addColorStop(1, 'rgba(255,120,40,0)');
  x.fillStyle = rim;
  x.beginPath();
  x.moveTo(-64, 40);
  x.quadraticCurveTo(-70, -30, 0, -66);
  x.quadraticCurveTo(70, -30, 64, 40);
  x.quadraticCurveTo(0, 58, -64, 40);
  x.closePath(); x.fill();
  // fire-crack veins (flickering, analytical)
  x.save();
  x.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const fk = 0.5 + 0.5 * hash(i * 13 + Math.floor(t * 14));
    x.strokeStyle = `rgba(255,${130 + (i % 3) * 30},50,${(0.5 + 0.45 * fk) * eclipse})`;
    x.lineWidth = 2.6 + (i % 2) * 1.2;
    x.beginPath();
    let vx = -48 + i * 16, vy = -52 + hash(i * 7) * 16;
    x.moveTo(vx, vy);
    for (let jstep = 0; jstep < 4; jstep++) {
      vx += (hash(i * 31 + jstep * 3) - 0.5) * 26;
      vy += 18 + hash(i * 31 + jstep * 3 + 1) * 14;
      x.lineTo(vx, vy);
    }
    x.stroke();
  }
  x.restore();
  // eyes: fire under a heavy brow
  x.fillStyle = '#0a0605';
  x.fillRect(-48, -20, 38, 11); x.fillRect(10, -20, 38, 11);
  const ek = eclipse * (0.8 + 0.2 * Math.sin(t * 9) + roar * 0.4);
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (const ex of [-29, 29]) {
    const g = x.createRadialGradient(ex, -14, 1, ex, -14, 24);
    g.addColorStop(0, `rgba(255,220,140,${0.95 * Math.min(1, ek)})`);
    g.addColorStop(0.35, `rgba(255,150,60,${0.6 * Math.min(1, ek)})`);
    g.addColorStop(1, 'rgba(255,122,41,0)');
    x.fillStyle = g; x.fillRect(ex - 24, -38, 48, 48);
  }
  x.restore();
  // maw, opens on the roar
  const jaw = roar * 14;
  x.fillStyle = '#0a0504';
  x.beginPath(); x.moveTo(-30, 18); x.quadraticCurveTo(0, 26 - jaw * 0.4, 30, 18);
  x.quadraticCurveTo(0, 26 + jaw, -30, 18); x.closePath(); x.fill();
  if (roar > 0.1) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = `rgba(255,150,60,${0.5 * roar})`;
    x.beginPath(); x.ellipse(0, 22 + jaw * 0.4, 22, 8 + jaw, 0, 0, 7); x.fill();
    x.restore();
  }
  x.restore();
}

// the fire whip: analytic lashing arc from (x0,y0) toward (x1,y1); k = intensity.
export function fireWhip(x, x0, y0, x1, y1, t, seed, k) {
  if (k <= 0.02) return;
  const segs = 12;
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.lineCap = 'round';
  for (const [w, col] of [[5.5, 'rgba(255,110,30,0.4)'], [2.6, 'rgba(255,170,60,0.85)'], [1.1, 'rgba(255,236,190,0.95)']]) {
    x.strokeStyle = col; x.lineWidth = w;
    x.beginPath(); x.moveTo(x0, y0);
    for (let i = 1; i <= segs; i++) {
      const u = i / segs;
      const jx = (hash(seed * 37 + i * 3 + Math.floor(t * 22)) - 0.5) * 34 * Math.sin(u * Math.PI);
      const jy = (hash(seed * 41 + i * 5 + Math.floor(t * 19)) - 0.5) * 18 * Math.sin(u * Math.PI);
      x.lineTo(x0 + (x1 - x0) * u + jx, y0 + (y1 - y0) * u + jy + Math.sin(u * 4 + t * 9) * 4);
    }
    x.stroke();
  }
  // bright tip
  const tx2 = x1 + (hash(seed + Math.floor(t * 22)) - 0.5) * 6;
  const ty2 = y1 + (hash(seed + 5 + Math.floor(t * 20)) - 0.5) * 6;
  const g = x.createRadialGradient(tx2, ty2, 0, tx2, ty2, 12);
  g.addColorStop(0, `rgba(255,220,150,${0.8 * k})`); g.addColorStop(1, 'rgba(255,150,60,0)');
  x.fillStyle = g; x.fillRect(tx2 - 12, ty2 - 12, 24, 24);
  x.restore();
}

// rising ember column: flickering particles with wind shear — never read as static wires
export function emberColumn(x, t, cx2, yBase, n, spread, seedBase, height = 260) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sp = 46 + hash(seedBase + i * 3) * 84;
    const rise = (hash(seedBase + i * 7) * height + t * sp) % height;
    const py = yBase - rise;
    const u = rise / height;
    const px = cx2 + (hash(seedBase + i) - 0.5) * spread * (0.4 + u)
      + Math.sin(t * 1.4 + i * 2.1) * 8 * (1 - u)
      - u * u * 34; // drifts back as it climbs
    const fl = 0.35 + 0.65 * hash(i * 13 + Math.floor(t * (14 + (i % 5) * 3)));
    const a = fl * (1 - u * 0.75);
    if (a <= 0.03) continue;
    const s = 1.4 + hash(i * 5 + seedBase) * 1.8;
    x.fillStyle = `rgba(255,${150 + Math.floor(hash(i) * 60)},60,${a * 0.85})`;
    x.fillRect(px, py, s, s);
  }
  x.restore();
}

// ---- the Great Eagle of the Flow ----------------------------------------------------------------
// headIcon canvas between painted wings; glide = wing phase; s = overall scale.
export function eagle(x, px, py, s, flap, t, headC) {
  x.save();
  x.translate(px, py);
  x.scale(s, s);
  const wf = Math.sin(flap);
  // far wing
  for (const side of [-1, 1]) {
    x.save();
    x.scale(side, 1);
    x.rotate(-0.2 - wf * 0.35 * (side === -1 ? 1 : 1));
    x.fillStyle = side === -1 ? '#6a5222' : '#8a6a2c';
    x.beginPath();
    x.moveTo(4, -2);
    x.quadraticCurveTo(40, -26 - wf * 10, 86, -18 - wf * 16);
    // feather notches
    x.lineTo(74, -8 - wf * 12); x.lineTo(80, -6 - wf * 12); x.lineTo(62, -2 - wf * 9);
    x.lineTo(66, 2 - wf * 8); x.lineTo(46, 2 - wf * 6); x.lineTo(48, 7 - wf * 5);
    x.quadraticCurveTo(20, 8, 4, 6);
    x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,230,170,0.25)';
    x.beginPath(); x.moveTo(8, -4); x.quadraticCurveTo(40, -20 - wf * 8, 74, -12 - wf * 12);
    x.quadraticCurveTo(40, -10, 8, 0); x.closePath(); x.fill();
    x.restore();
  }
  // body + tail
  x.fillStyle = '#7a5e26';
  x.beginPath(); x.ellipse(0, 2, 16, 9, 0, 0, 7); x.fill();
  x.fillStyle = '#62481c';
  x.beginPath(); x.moveTo(-12, 0); x.lineTo(-34, -4 + wf * 3); x.lineTo(-32, 4 + wf * 3); x.lineTo(-12, 7); x.closePath(); x.fill();
  // talons
  x.strokeStyle = '#e8b34a'; x.lineWidth = 1.8; x.lineCap = 'round';
  x.beginPath(); x.moveTo(-3, 10); x.lineTo(-5, 15); x.moveTo(4, 10); x.lineTo(6, 15); x.stroke();
  // the head: the eagle's own mane, normalised to the body
  if (headC) x.drawImage(headC, -13, -27, 26, 26);
  x.restore();
}

// ---- particles ----------------------------------------------------------------------------------
// hair confetti from the Eye burst / hairify: curling strands, GOLD.confetti palette.
export function hairConfetti(x, ev, worldT, n = 26, spread = 260, up = 190) {
  for (let i = 0; i < n; i++) {
    const h1 = hash(ev.seed + i * 7), h2a = hash(ev.seed + i * 7 + 3), h3 = hash(ev.seed + i * 7 + 5);
    const vx = (h1 - 0.5) * spread, vy = -up * (0.35 + h2a);
    const age = worldT - ev.g;
    if (age < 0 || age > 2.6) continue;
    const px = ev.x + vx * age + Math.sin(age * (2 + h3 * 2) + i) * (6 + h3 * 10);
    const py = ev.y + vy * age + 0.5 * 190 * age * age + Math.cos(age * (1.6 + h1) + i * 2) * 5;
    if (py > LH + 20 || px < -20 || px > LW + 20) continue;
    x.save();
    x.translate(px, py);
    x.rotate(age * (h1 - 0.5) * 7 + i);
    x.strokeStyle = GOLD.confetti[i % GOLD.confetti.length];
    x.lineWidth = 2.2;
    x.lineCap = 'round';
    x.beginPath();
    x.arc(0, 0, 3.4 + h3 * 3, 0.4, Math.PI * 1.4);
    x.stroke();
    x.restore();
  }
}

// the reverse-baldify: fanned hair strands sprouting from a bald crown. grow 0..1.
export function sprout(x, cx2, cy2, r, grow, t, seed) {
  if (grow <= 0) return;
  const N = 12;
  x.save();
  x.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const h1 = hash(seed + i * 3), h2b = hash(seed + i * 3 + 1);
    const gp = Math.min(1, grow * (1.25 + h1 * 0.5) - h1 * 0.25);
    if (gp <= 0) continue;
    const fan = -Math.PI * 0.92 + (i / (N - 1)) * Math.PI * 0.84 + (h2b - 0.5) * 0.2;
    const len = r * (2.2 + h1 * 1.6) * (0.4 + 0.6 * gp);
    const sway = Math.sin(t * (2 + h2b) + i) * 0.12 * gp;
    const a = fan + sway;
    x.strokeStyle = GOLD.confetti[(i + seed) % GOLD.confetti.length];
    x.lineWidth = 2.6 + h1 * 1.8;
    x.beginPath();
    x.moveTo(cx2 + Math.cos(fan) * r * 0.7, cy2 + Math.sin(fan) * r * 0.5);
    x.quadraticCurveTo(
      cx2 + Math.cos(a) * r * (0.7 + len * 0.5), cy2 + Math.sin(a) * r * (0.5 + len * 0.5),
      cx2 + Math.cos(a) * len, cy2 + Math.sin(a) * len + Math.sin(t * 3 + i) * 2,
    );
    x.stroke();
  }
  x.restore();
}

// analytic dust/ash puffs from an event
export function puffs(x, ev, worldT, life, col, n = 6) {
  const age = worldT - ev.g;
  if (age < 0 || age > life) return;
  const u = age / life;
  x.save();
  for (let i = 0; i < n; i++) {
    const a = hash(ev.seed + i) * 7, d = u * (26 + hash(ev.seed + i + 4) * 42);
    x.fillStyle = `rgba(${col},${(1 - u) * 0.32})`;
    x.beginPath(); x.arc(ev.x + Math.cos(a) * d, ev.y - 4 + Math.sin(a) * d * 0.5 - u * 20, 7 + u * 22, 0, 7); x.fill();
  }
  x.restore();
}

// =================================================================================================
// LIGHT / ATMOSPHERE (the-shine lineage)
// =================================================================================================
export const flick = (t, seed, hz = 24) => 0.72 + 0.28 * hash(seed * 91 + Math.floor(t * hz));

export function flame(x, px, py, s, t, seed) {
  const k = flick(t, seed);
  const hgt = 10 * s * k, wd = 3.2 * s * (2 - k);
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.fillStyle = `rgba(255,150,40,${0.5 * k})`;
  x.beginPath(); x.ellipse(px, py - hgt / 2, wd * 1.9, hgt * 0.75, 0, 0, 7); x.fill();
  x.fillStyle = `rgba(255,214,120,${0.85 * k})`;
  x.beginPath(); x.ellipse(px, py - hgt * 0.42, wd, hgt * 0.55, 0, 0, 7); x.fill();
  x.fillStyle = `rgba(255,246,214,${0.9 * k})`;
  x.fillRect(px - 0.8, py - hgt * 0.5, 1.6, hgt * 0.3);
  x.restore();
  return k;
}

export function warmGlow(x, px, py, r, a, col = '255,190,110') {
  if (a <= 0.004 || r <= 0) return;
  x.save();
  x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(px, py, 0, px, py, r);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.5, `rgba(${col},${a * 0.35})`); g.addColorStop(1, `rgba(${col},0)`);
  x.fillStyle = g;
  x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  x.restore();
}

let _dk = null;
// darkness with light holes on a cached scratch layer (destination-out punch-outs)
export function darkness(x, a, holes) {
  if (a <= 0) return;
  if (!_dk) _dk = canvas(LW + 96, LH + 96);
  const d = _dk.getContext('2d');
  d.setTransform(1, 0, 0, 1, 0, 0);
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, _dk.width, _dk.height);
  d.fillStyle = `rgba(3,4,10,${a})`;
  d.fillRect(0, 0, _dk.width, _dk.height);
  d.globalCompositeOperation = 'destination-out';
  for (const h of holes) {
    const gx = h.x + 48, gy = h.y + 48, soft = h.soft ?? 0.5;
    const g = d.createRadialGradient(gx, gy, h.r * (1 - soft) * 0.5, gx, gy, h.r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g;
    d.beginPath(); d.arc(gx, gy, h.r, 0, 7); d.fill();
  }
  x.drawImage(_dk, -48, -48);
}

export function fog(x, t, y0, hgt, seed, alpha) {
  x.save();
  for (let b = 0; b < 3; b++) {
    const yb = y0 + (hgt / 3) * b;
    for (let cx2 = 0; cx2 < LW + 64; cx2 += 16) {
      const n = vnoise(cx2 * 0.008 + t * (0.024 + b * 0.011) + seed * 9 + b * 5, seed + b);
      const a = alpha * Math.max(0, n - 0.42) * (1.5 - b * 0.3);
      if (a <= 0.004) continue;
      x.fillStyle = b === 2 && seed === 1 ? `rgba(233,212,154,${a * 0.8})` : `rgba(58,68,96,${a})`;
      const bh = 10 + b * 6;
      x.fillRect(cx2 - 8, yb + Math.sin(cx2 * 0.05 + t * 0.5 + b) * 3, 16, bh);
    }
  }
  x.restore();
}

export function dust(x, t, x0, y0, w, h, n, seed) {
  x.save();
  for (let i = 0; i < n; i++) {
    const bx = x0 + hash(seed + i * 3) * w, by = y0 + hash(seed + i * 7) * h;
    const ph = t * (0.3 + hash(seed + i) * 0.5) + i;
    const px = bx + Math.sin(ph) * 7, py = by + Math.cos(ph * 0.7) * 5 - ((t * 4 + hash(i) * 40) % 40);
    const a = 0.14 + 0.14 * Math.sin(ph * 1.7);
    if (a <= 0) continue;
    x.fillStyle = `rgba(226,220,200,${a})`;
    x.fillRect(px, py, 1.6, 1.6);
  }
  x.restore();
}

// drifting ash (ashlands) — grey flakes falling with wind shear
export function ashDrift(x, t, n = 60) {
  x.save();
  for (let i = 0; i < n; i++) {
    const sp = 12 + hash(i * 5) * 26, wx = -14 - hash(i * 3) * 18;
    const px = ((hash(i) * (LW + 80) + t * wx * 4) % (LW + 80) + LW + 80) % (LW + 80) - 40;
    const py = ((hash(i + 55) * LH + t * sp) % (LH + 40)) - 20;
    const a = 0.1 + 0.22 * hash(i * 11 + Math.floor(t * 2));
    x.fillStyle = `rgba(200,198,196,${a})`;
    x.fillRect(px, py, hash(i * 13) > 0.8 ? 2 : 1.4, 1.4);
  }
  x.restore();
}

// sparks/chips from immutable events {g,x,y,seed}
export function chips(x, events, worldT, color = '255,170,60', n = 10, grav = 300) {
  for (const ev of events) {
    const age = worldT - ev.g;
    if (age < 0 || age > 0.9) continue;
    for (let i = 0; i < n; i++) {
      const vx = (hash(ev.seed + i * 3) - 0.5) * 190, vy = -60 - hash(ev.seed + i * 5) * 150;
      const px = ev.x + vx * age, py = ev.y + vy * age + 0.5 * grav * age * age;
      const a = 1 - age / 0.9;
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.fillStyle = `rgba(${color},${a})`;
      x.fillRect(px, py, 2, 2);
      x.restore();
    }
  }
}

export function shadow(x, px, foot, w, a = 0.4) {
  x.save();
  x.fillStyle = `rgba(0,0,0,${a})`;
  x.beginPath(); x.ellipse(px, foot + 3, Math.max(1, w), Math.max(1, w) * 0.22, 0, 0, 7); x.fill();
  x.restore();
}

// wind streaks (gusts): short pale dashes streaming left→right
export function windStreaks(x, t, k, y0 = 120, y1 = 400, n = 14) {
  if (k <= 0.02) return;
  x.save();
  x.strokeStyle = `rgba(240,238,226,${0.14 * k})`;
  x.lineWidth = 1.2;
  x.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = 190 + hash(i * 7) * 160;
    const px = ((hash(i * 3) * (LW + 200) + t * sp) % (LW + 200)) - 100;
    const py = y0 + hash(i * 11) * (y1 - y0);
    const len = 20 + hash(i * 13) * 34;
    x.moveTo(px, py); x.lineTo(px + len, py + 1.5);
  }
  x.stroke();
  x.restore();
}

// golden motes for warm endings
export function goldMotes(x, t, n = 40, seed = 5) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const px = (hash(i * 3 + seed) * LW + Math.sin(t * 0.5 + i) * 24 + t * 7) % LW;
    const py = 120 + hash(i * 5 + seed) * 320 + Math.sin(t * 0.8 + i * 1.7) * 10;
    const a = 0.14 + 0.2 * Math.sin(t * 1.4 + i * 2.3) ** 2;
    x.fillStyle = `rgba(255,226,150,${Math.max(0, a)})`;
    x.fillRect(px, py, 1.6, 1.6);
  }
  x.restore();
}

// the eruption column: analytic lava blobs from an event {g,x,y,seed} — a full-frame geyser
export function eruption(x, ev, worldT, life = 2.0) {
  const age = worldT - ev.g;
  if (age < 0 || age > life) return 0;
  const u = age / life;
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 44; i++) {
    const h1 = hash(ev.seed + i * 3), h2c = hash(ev.seed + i * 3 + 1);
    const vx = (h1 - 0.5) * 230, vy = -320 - h2c * 380;
    const px = ev.x + vx * age, py = ev.y + vy * age + 0.5 * 340 * age * age;
    if (py > LH + 20) continue;
    const r = 2 + h1 * 5;
    x.fillStyle = `rgba(255,${140 + Math.floor(h2c * 80)},50,${(1 - u) * 0.9})`;
    x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
  // the column itself
  const colK = (1 - u) * Math.sin(Math.PI * Math.min(1, u * 1.6));
  const g = x.createLinearGradient(ev.x, ev.y, ev.x, ev.y - 430);
  g.addColorStop(0, `rgba(255,170,60,${0.7 * colK})`); g.addColorStop(1, 'rgba(255,90,30,0)');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(ev.x - 44, ev.y);
  x.quadraticCurveTo(ev.x - 74 + Math.sin(t2(age)) * 10, ev.y - 210, ev.x - 26, ev.y - 424);
  x.lineTo(ev.x + 26, ev.y - 424);
  x.quadraticCurveTo(ev.x + 74 + Math.sin(t2(age) * 1.3) * 10, ev.y - 210, ev.x + 44, ev.y);
  x.closePath(); x.fill();
  x.restore();
  return 1 - u;
}
const t2 = (a) => a * 9;

// lava surface: bright analytic blobs crawling on the melt (drawn over the baked lake)
export function lavaBlobs(x, t, yTop, seed = 77, n = 14) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const px = (hash(i * 7 + seed) * LW + Math.sin(t * 0.4 + i * 2.2) * 16) % LW;
    const py = yTop + hash(i * 9 + seed) * (LH - yTop - 40);
    const a = 0.1 + 0.16 * Math.sin(t * 1.1 + i * 1.9) ** 2;
    const r = 7 + hash(i * 11 + seed) * 16;
    const g = x.createRadialGradient(px, py, 1, px, py, r);
    g.addColorStop(0, `rgba(255,190,90,${a})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  x.restore();
}
