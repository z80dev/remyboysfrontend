// Actors: posed bald-Remy guards (cut from the quest sprites via the remy-bros rig), HANS GLATZE in his
// mech, the hero's weapons (screen-space pixel art) and the status-bar face. Frames are posed into scratch
// canvases each frame and handed to the raycaster as {w, h, d, e} pixel buffers.
import { canvas, drawRemy } from '../remy-bros/art.js';
import { Px } from './tex.js';

const scratch = {};
function sc(name, w, h) {
  const c = (scratch[name] ??= canvas(w, h)), x = c.getContext('2d', { willReadFrequently: true });
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.imageSmoothingEnabled = false;
  x.clearRect(0, 0, w, h);
  return [c, x];
}
function grab(c, x, em) {
  const d = new Uint32Array(x.getImageData(0, 0, c.width, c.height).data.buffer);
  for (let i = 0; i < d.length; i++) if ((d[i] >>> 24) < 120) d[i] = 0; else d[i] = (d[i] | 0xff000000) >>> 0;
  let e = null;
  if (em) {
    const ed = em.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    e = new Uint8Array(c.width * c.height);
    for (let i = 0; i < e.length; i++) e[i] = ed[i * 4 + 3] > 120 ? 1 : 0;
  }
  return { w: c.width, h: c.height, d, e };
}
const R_ = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };

export function skinOf(R) {
  const d = R.c.getContext('2d').getImageData(Math.round(R.w / 2) - 2, 58, 4, 3).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  return [r / n, g / n, b / n];
}
const css = ([r, g, b], k = 1) => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;

// ---------- guards ----------
// o: { lean, sx, sy, rot, lift:[l,r], stride:[l,r], gun: 'low'|'aim'|null, recoil, skin }
export const GUARD_FRAME = { w: 260, h: 150, ax: 130, ay: 146 };
export function guardFrame(R, o) {
  const [c, x] = sc('guard', GUARD_FRAME.w, GUARD_FRAME.h);
  const fx = GUARD_FRAME.ax, fy = GUARD_FRAME.ay;
  const rot = o.rot ?? 0, sy = o.sy ?? 1;
  const feet = fy - Math.abs(Math.sin(rot)) * 24;
  drawRemy(x, R, fx, feet, { lean: o.lean ?? 0, sx: o.sx ?? 1, sy, rot, lift: o.lift, stride: o.stride });
  const sk = o.skin;
  if (o.gun === 'aim') {
    const gx = fx + 3 + (o.lean ?? 0) * -20, gy = fy - 33 * sy - (o.recoil ?? 0) * 3;
    R_(x, '#1a1418', gx - 11, gy - 1, 22, 11);
    R_(x, css(sk, 0.8), gx - 10, gy, 20, 9);
    R_(x, css(sk), gx - 9, gy, 18, 6);
    R_(x, css(sk, 0.62), gx - 4, gy + 3, 1, 4); R_(x, css(sk, 0.62), gx + 1, gy + 3, 1, 4);
    R_(x, '#0c0c10', gx - 7, gy - 11, 14, 12);
    R_(x, '#3a3e48', gx - 6, gy - 10, 12, 10);
    R_(x, '#7a8090', gx - 6, gy - 10, 12, 2);
    R_(x, '#000000', gx - 3, gy - 7, 6, 6);
    R_(x, '#22252c', gx - 4, gy - 8, 8, 1);
  } else if (o.gun === 'low') {
    const gx = fx + 22, gy = fy - 34 * sy;
    R_(x, '#0c0c10', gx - 1, gy - 1, 8, 20);
    R_(x, '#3a3e48', gx, gy, 6, 18);
    R_(x, '#7a8090', gx, gy, 2, 18);
    R_(x, css(sk), gx - 2, gy - 4, 9, 8);
    R_(x, css(sk, 0.7), gx - 2, gy + 2, 9, 2);
  }
  return grab(c, x, null);
}

// ---------- HANS GLATZE ----------
export const BOSS_FRAME = { w: 240, h: 160, ax: 120, ay: 158 };
function steel(x, a, b, w, h, base = 112, hl = true) {
  for (let i = 0; i < w; i++) {
    const k = Math.cos(((i + 0.5) / w - 0.4) * Math.PI) * 0.45 + 0.75;
    x.fillStyle = `rgb(${Math.round(base * k * 0.92)},${Math.round(base * k * 0.98)},${Math.round(base * k * 1.08)})`;
    x.fillRect(Math.round(a + i), Math.round(b), 1, Math.round(h));
  }
  if (hl) R_(x, 'rgba(255,255,255,0.35)', a + 1, b, w - 2, 1);
  R_(x, 'rgba(0,0,0,0.45)', a, b + h - 1, w, 1);
}
function rivets(x, a, b, w, h) {
  for (let i = a + 3; i < a + w - 2; i += 8) { R_(x, '#d8dce8', i, b + 2, 2, 2); R_(x, '#d8dce8', i, b + h - 4, 2, 2); }
}
function pod(x, e, cx, cy, spin, heat) {
  R_(x, '#0a0a0e', cx - 18, cy - 18, 36, 36);
  for (let j = -17; j <= 17; j++)
    for (let i = -17; i <= 17; i++) {
      const d = Math.hypot(i, j);
      if (d > 17) continue;
      const v = d > 14 ? 70 + (i + j < 0 ? 60 : -10) : 46 + (i + j < 0 ? 18 : 0);
      x.fillStyle = `rgb(${v},${v + 4},${v + 12})`;
      x.fillRect(cx + i, cy + j, 1, 1);
    }
  for (let k = 0; k < 6; k++) {
    const a = spin + (k / 6) * Math.PI * 2, bx = cx + Math.cos(a) * 8.5, by = cy + Math.sin(a) * 8.5;
    R_(x, '#8a909e', bx - 3, by - 3, 6, 6);
    R_(x, '#000000', bx - 2, by - 2, 4, 4);
    if (heat > 0) { R_(x, `rgba(255,${120 + heat * 100},40,${heat})`, bx - 1, by - 1, 2, 2); R_(e, '#fff', bx - 1, by - 1, 2, 2); }
  }
  R_(x, '#c8ccd8', cx - 2, cy - 2, 4, 4);
}
// o: { bob, liftL, liftR, spinL, spinR, heatL, heatR, core (0..1 pulse), dmg (0..1), glint }
export function bossFrame(R, o) {
  const [c, x] = sc('boss', BOSS_FRAME.w, BOSS_FRAME.h);
  const [ec, e] = sc('bossE', BOSS_FRAME.w, BOSS_FRAME.h);
  const b = Math.round(o.bob ?? 0);
  // legs
  for (const [lx, lift] of [[80, o.liftL ?? 0], [136, o.liftR ?? 0]]) {
    const L = Math.round(lift);
    steel(x, lx, 108 + b - L * 0.5, 24, 22, 96);
    R_(x, '#202228', lx + 4, 126 + b - L * 0.6, 16, 6);
    R_(x, '#e8b020', lx + 6, 128 + b - L * 0.6, 12, 2);
    steel(x, lx + 3, 130 - L, 18, 18, 104);
    R_(x, '#1a1c22', lx - 5, 146 - L, 34, 10);
    for (let i = 0; i < 34; i += 6) R_(x, '#e8b020', lx - 5 + i, 148 - L, 3, 6);
    R_(x, '#5a5e6a', lx - 5, 146 - L, 34, 1);
  }
  // the pilot
  drawRemy(x, R, 120, 108 + b, {});
  const fy = 108 + b;
  // shades glint (red HUD eye)
  if (o.glint) { R_(x, '#ff2030', 134, fy - 69, 3, 2); R_(e, '#fff', 134, fy - 69, 3, 2); }
  // chassis
  const cy0 = 64 + b;
  steel(x, 72, cy0, 96, 50, 118);
  R_(x, '#16181e', 72, cy0, 96, 3);
  R_(x, '#9aa2b4', 74, cy0 + 3, 92, 1);
  rivets(x, 72, cy0 + 3, 96, 47);
  // vents
  for (let i = 0; i < 4; i++) { R_(x, '#16181e', 78, cy0 + 12 + i * 6, 16, 3); R_(x, '#16181e', 146, cy0 + 12 + i * 6, 16, 3); }
  // hazard stripe
  for (let i = 0; i < 96; i += 8) { R_(x, '#e8b020', 72 + i, cy0 + 42, 4, 6); R_(x, '#141414', 76 + i, cy0 + 42, 4, 6); }
  // reactor core
  const core = o.core ?? 0.5;
  R_(x, '#0a0a0c', 107, cy0 + 13, 26, 26);
  for (let j = -11; j <= 11; j++) for (let i = -11; i <= 11; i++) {
    const d = Math.hypot(i, j);
    if (d > 11) continue;
    const k = 1 - d / 11;
    x.fillStyle = `rgb(255,${Math.round(40 + k * 180 * (0.6 + core * 0.4))},${Math.round(30 + k * 120 * core)})`;
    x.fillRect(120 + i, cy0 + 26 + j, 1, 1);
    if (d < 9) { e.fillStyle = '#fff'; e.fillRect(120 + i, cy0 + 26 + j, 1, 1); }
  }
  // Cabald plate
  R_(x, '#d8a838', 106, cy0 + 4, 28, 6); R_(x, '#7a1020', 108, cy0 + 5, 24, 4);
  // damage: scorch + cracks
  const dmg = o.dmg ?? 0;
  if (dmg > 0) {
    const n = Math.floor(dmg * 14);
    for (let k = 0; k < n; k++) {
      const px = 76 + ((k * 37) % 88), py = cy0 + 6 + ((k * 23) % 36);
      R_(x, 'rgba(10,8,8,0.8)', px, py, 4, 3);
      R_(x, '#ff8030', px + 1, py + 1, 1, 1);
    }
  }
  // arms + pauldrons + gun pods
  for (const [side, px, spin, heat] of [[-1, 56, o.spinL ?? 0, o.heatL ?? 0], [1, 184, o.spinR ?? 0, o.heatR ?? 0]]) {
    steel(x, px - 10, 70 + b, 20, 34, 96);
    R_(x, '#202228', px - 3, 74 + b, 6, 28);
    R_(x, '#c8ccd8', px - 1, 74 + b, 2, 28);
    pod(x, e, px, 114 + b, spin * side, heat);
    // pauldron
    const sx = px + side * -10;
    for (let j = -16; j <= 10; j++) for (let i = -22; i <= 22; i++) {
      const d = Math.hypot(i / 22, j / 16);
      if (d > 1 || j > 10) continue;
      const v = Math.round(100 + (1 - d) * 70 - j * 2 + (i * side < 0 ? 20 : -10));
      x.fillStyle = `rgb(${v - 6},${v},${v + 14})`;
      x.fillRect(sx + i, 66 + b + j, 1, 1);
    }
    R_(x, '#16181e', sx - 22, 76 + b, 45, 2);
    R_(x, '#e8b020', sx - 4, 58 + b, 8, 3);
  }
  return grab(c, x, ec);
}
// Death: tip the whole mech over, char it.
export function bossWreck(src, o) {
  const [c, x] = sc('wreckSrc', src.w, src.h);
  const im = x.createImageData(src.w, src.h);
  new Uint32Array(im.data.buffer).set(src.d);
  x.putImageData(im, 0, 0);
  const [d, dx] = sc('wreck', BOSS_FRAME.w + 60, BOSS_FRAME.h);
  dx.translate(BOSS_FRAME.ax + 30, BOSS_FRAME.ay);
  dx.rotate(o.rot ?? 0);
  dx.scale(1, o.sy ?? 1);
  dx.drawImage(c, -BOSS_FRAME.ax, -BOSS_FRAME.ay);
  dx.setTransform(1, 0, 0, 1, 0, 0);
  if (o.char) { dx.globalCompositeOperation = 'source-atop'; dx.fillStyle = `rgba(20,10,8,${o.char})`; dx.fillRect(0, 0, d.width, d.height); }
  const r = grab(d, dx, null);
  return r;
}

// ---------- muzzle flash billboard ----------
export function flashSprite(size, seed) {
  const p = new Px(size, size), c = size / 2;
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const dx = i + 0.5 - c, dy = j + 0.5 - c, a = Math.atan2(dy, dx), d = Math.hypot(dx, dy) / c;
      const spikes = 0.55 + 0.45 * Math.abs(Math.cos(a * 4 + seed));
      if (d > spikes) continue;
      const col = d < 0.3 ? '#ffffff' : d < 0.6 ? '#fff060' : '#ff9020';
      p.set(i, j, col, 0, true);
    }
  return p;
}

// ---------- hero weapons (screen space, art px; drawn 2×) ----------
const SKIN = [212, 160, 132], SLEEVE = [38, 50, 84];
const shadeC = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
// Filled trapezoid between two scanlines, with a per-pixel colour function f(u across 0..1, v down 0..1).
function trap(p, y0, y1, cx0, w0, cx1, w1, f) {
  for (let y = y0; y < y1; y++) {
    const v = (y - y0) / Math.max(1, y1 - y0 - 1), cx = cx0 + (cx1 - cx0) * v, w = w0 + (w1 - w0) * v;
    const xa = Math.round(cx - w / 2), xb = Math.round(cx + w / 2);
    for (let x = xa; x < xb; x++) { const c = f((x + 0.5 - xa) / (xb - xa), v, x, y); if (c) p.set(x, y, c); }
  }
}
const cyl = (base, u, lo = 0.45, hi = 1.25) => shadeC(base, lo + (hi - lo) * Math.max(0, Math.cos((u - 0.38) * Math.PI)));
function fist(p, x, y, w, h, flip = false) {
  trap(p, y, y + h, x + w / 2, w, x + w / 2, w - 4, (u, v, px, py) => {
    const uu = flip ? 1 - u : u;
    let k = 0.75 + 0.35 * Math.cos((uu - 0.35) * Math.PI);
    const fy = py - y;
    if (fy < 6) { const kn = Math.cos(((uu * 4) % 1) * Math.PI * 2); k += 0.12 * kn + (fy < 2 ? 0.08 : 0); if (((uu * 4) % 1) < 0.1) k -= 0.25; }
    else if (fy % 5 === 0 && fy < h - 4) k -= 0.18;
    return shadeC(SKIN, k);
  });
}
function sleeve(p, x0, x1, y0, y1, grow) {
  trap(p, y0, y1, (x0 + x1) / 2, x1 - x0, (x0 + x1) / 2, x1 - x0 + grow, (u, v, px, py) => {
    const k = py - y0 < 3 ? 1.35 : 0.7 + 0.4 * Math.cos((u - 0.35) * Math.PI) - ((py - y0) % 4 === 3 ? 0.12 : 0);
    return shadeC(SLEEVE, k);
  });
}
export function pistolArt(frame) {
  // frame 0 idle, 1 fire (slide back, kick up), 2 recoil settle
  const p = new Px(64, 64), up = frame === 1 ? -6 : frame === 2 ? -2 : 0, back = frame === 1 ? 3 : 0;
  sleeve(p, 18, 46, 52, 64, 8);
  // slide + frame
  const top = 6 + up + back, rear = 36 + up;
  trap(p, top, rear, 32, 11, 32, 21, (u, v, x, y) => {
    let c = cyl([92, 98, 114], u, 0.35, 1.5);
    if (u > 0.4 && u < 0.6) c = [150, 158, 176];
    if (y > rear - 8 && (y - rear) % 2 === 0 && (u < 0.3 || u > 0.7)) c = shadeC(c, 0.6);
    return c;
  });
  p.rect(31, top - 3, 3, 3, '#1e2026'); p.rect(32, top - 3, 1, 1, '#ffffff');
  p.rect(29, top, 7, 2, '#08080a');
  p.rect(23, rear - 3, 5, 4, '#181a20'); p.rect(37, rear - 3, 5, 4, '#181a20');
  trap(p, rear, rear + 6, 32, 22, 32, 20, (u) => cyl([60, 64, 74], u));
  // grip hand
  fist(p, 17, 33 + up, 30, 21);
  // thumb along the left of the slide
  trap(p, 20 + up, 36 + up, 20, 6, 21, 8, (u, v) => shadeC(SKIN, 0.85 + 0.35 * Math.cos((u - 0.3) * Math.PI) + (v < 0.15 ? 0.15 : 0)));
  return p.outline('#060608');
}
export function chaingunArt(spin) {
  const p = new Px(96, 64);
  sleeve(p, 4, 26, 54, 64, 6);
  sleeve(p, 70, 92, 54, 64, 6);
  // perforated barrel shroud, narrowing into the screen
  trap(p, 4, 34, 48, 17, 48, 31, (u, v, x, y) => {
    let c = cyl([96, 102, 118], u, 0.35, 1.45);
    // slots show the spinning barrels
    if (y % 6 >= 2 && y % 6 <= 3 && u > 0.18 && u < 0.82) {
      const b = Math.sin((u * 3 + spin) * Math.PI * 2);
      c = b > 0.2 ? [160, 166, 180] : [24, 26, 30];
    }
    return c;
  });
  // muzzle ring + six barrels
  p.disc(48, 6, 9, [44, 46, 54]);
  p.ring(48, 6, 7.5, 9, [130, 136, 150]);
  for (let k = 0; k < 6; k++) {
    const a = spin * Math.PI * 2 + (k / 6) * Math.PI * 2;
    p.disc(48 + Math.cos(a) * 4.5, 6 + Math.sin(a) * 3.2, 1.6, [6, 6, 8]);
  }
  // receiver housing
  trap(p, 32, 64, 48, 44, 48, 52, (u, v, x, y) => {
    let c = cyl([74, 78, 90], u, 0.5, 1.35);
    if (y < 35) c = [170, 178, 196];
    if (y === 44 || y === 54) c = [22, 24, 28];
    return c;
  });
  for (const bx of [32, 62]) { p.disc(bx, 40, 2, [190, 196, 210]); p.set(bx, 40, [60, 60, 70]); }
  p.rect(42, 46, 12, 6, '#1a1c22'); p.rect(43, 47, 10, 1, '#e0b040'); p.rect(43, 49, 10, 1, '#e0b040');
  // ammo belt feeding in from the left
  for (let k = 0; k < 7; k++) { const bx = 22 - k * 2 + Math.round(Math.sin(k) * 1), by = 40 + k * 3; p.rect(bx, by, 5, 2, '#e0b040'); p.rect(bx, by, 5, 1, '#fff0b0'); p.rect(bx + 4, by, 2, 2, '#a07020'); }
  // hands on the side grips
  p.rect(22, 38, 4, 16, '#2a2c32'); p.rect(70, 38, 4, 16, '#2a2c32');
  fist(p, 6, 36, 20, 19);
  fist(p, 70, 36, 20, 19, true);
  return p.outline('#060608');
}
export function muzzleArt(size, seed) {
  return flashSprite(size, seed).canvas();
}
export function casingArt() {
  const p = new Px(4, 2);
  p.rect(0, 0, 4, 2, '#e0b040'); p.rect(0, 0, 4, 1, '#fff0b0');
  return p.canvas();
}

// ---------- status-bar face (crop of hero #42) ----------
export const FACE = { sx: 9, sy: 10, w: 60, h: 60 };
export function buildFaces(R) {
  const base = canvas(FACE.w, FACE.h);
  base.getContext('2d').drawImage(R.c, FACE.sx, FACE.sy, FACE.w, FACE.h, 0, 0, FACE.w, FACE.h);
  const flip = canvas(FACE.w, FACE.h), fx = flip.getContext('2d');
  fx.translate(FACE.w, 0); fx.scale(-1, 1); fx.drawImage(base, 0, 0);
  return { base, flip };
}
// Expression overlays in crop space (mirrored when the head looks the other way).
export function drawFace(x, F, ox, oy, { look = 0, grin = 0, pain = 0, hurt = 0 }) {
  const flipped = look < 0;
  x.drawImage(flipped ? F.flip : F.base, ox, oy);
  const X = (a, w) => (flipped ? ox + FACE.w - a - w : ox + a);
  const r = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(X(a, w), oy + b, w, h); };
  const skin = '#e8d2c2', ink = '#1a0c10';
  if (hurt > 0) {
    // bruise + blood, more with damage
    r('#b0303a', 44, 8, 3, 6); r('#d04048', 45, 9, 1, 4);
    if (hurt > 1) { r('#a02830', 14, 47, 5, 3); r('#c83a44', 15, 48, 3, 4); r('#7a1a20', 46, 44, 2, 6); }
  }
  if (pain > 0) {
    r(skin, 18, 32, 14, 14); r(skin, 41, 29, 12, 14);
    // squeezed eyes > <
    for (let i = 0; i < 5; i++) { r(ink, 20 + i * 2, 35 + i, 2, 2); r(ink, 20 + i * 2, 43 - i, 2, 2); }
    for (let i = 0; i < 5; i++) { r(ink, 51 - i * 2, 32 + i, 2, 2); r(ink, 51 - i * 2, 40 - i, 2, 2); }
    r(ink, 30, 47, 14, 5); r('#e86a6a', 32, 49, 10, 2);
  } else if (grin > 0) {
    // the evil grin
    r(ink, 25, 45, 23, 1); r(ink, 24, 44, 2, 2); r(ink, 47, 44, 2, 2);
    r('#ffffff', 26, 46, 21, 3);
    for (let i = 28; i < 46; i += 3) r('#b8b0b0', i, 46, 1, 3);
    r(ink, 27, 49, 19, 1); r(ink, 29, 50, 15, 1); r(ink, 32, 51, 9, 1);
    r('#c85a5a', 29, 49, 15, 1);
    // cocky brow
    r(ink, 18, 29, 12, 2); r(ink, 42, 25, 10, 2);
  }
}
