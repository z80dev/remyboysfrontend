// Software raycaster: DDA walls with sliding doors and recessed jambs, textured floor/ceiling casting,
// a coloured light map (lamps) plus dynamic point lights (muzzle flash, explosions), Doom-style banded
// distance shading, and billboard sprites / particles depth-tested against the wall z-buffer.
// Writes straight into a Uint32 RGBA buffer; every input is a pure function of game time.
import { MAP, MW, MH, region, LAMPS, AMBIENT, VW, VH } from './choreo.js';

export const PS = VW / 2 / 0.66; // projection scale (square pixels)
const LMR = 4; // light-map samples per tile
const LMW = MW * LMR, LMH = MH * LMR;
const LM = new Float32Array(LMW * LMH * 3);
const ZB = new Float32Array(VW);
let TX = null;

export function initEngine(tex) {
  TX = tex;
  for (let j = 0; j < LMH; j++)
    for (let i = 0; i < LMW; i++) {
      const wx = (i + 0.5) / LMR, wy = (j + 0.5) / LMR, amb = AMBIENT[region(Math.floor(wx))];
      let r = amb[0], g = amb[1], b = amb[2];
      for (const [lx, ly, I, R, c] of LAMPS) {
        const d = Math.hypot(wx - lx, wy - ly);
        if (d >= R) continue;
        const k = I * (1 - d / R) ** 2;
        r += k * c[0]; g += k * c[1]; b += k * c[2];
      }
      const o = (j * LMW + i) * 3;
      LM[o] = r; LM[o + 1] = g; LM[o + 2] = b;
    }
}

const L3 = [0, 0, 0];
function light(wx, wy) {
  let fx = wx * LMR - 0.5, fy = wy * LMR - 0.5;
  if (fx < 0) fx = 0; if (fy < 0) fy = 0;
  if (fx > LMW - 1.001) fx = LMW - 1.001; if (fy > LMH - 1.001) fy = LMH - 1.001;
  const ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy;
  const o00 = (iy * LMW + ix) * 3, o10 = o00 + 3, o01 = o00 + LMW * 3, o11 = o01 + 3;
  for (let c = 0; c < 3; c++) {
    const a = LM[o00 + c] + (LM[o10 + c] - LM[o00 + c]) * ax, b = LM[o01 + c] + (LM[o11 + c] - LM[o01 + c]) * ax;
    L3[c] = a + (b - a) * ay;
  }
  return L3;
}
export const lightAt = (wx, wy) => light(wx, wy).slice();

// Distance falloff, banded like a colormap.
const fall = (d) => {
  const f = 1.18 - d * 0.085;
  return f < 0.12 ? 0.12 : f;
};
const BAND = 20;
const q = (v) => Math.floor(v * BAND) / BAND;

// Dynamic lights: { x, y, i, r, c:[r,g,b] }
function dyn(lights, wx, wy, out) {
  for (const L of lights) {
    const d = Math.hypot(wx - L.x, wy - L.y);
    if (d >= L.r) continue;
    const k = L.i * (1 - d / L.r) ** 2;
    out[0] += k * L.c[0]; out[1] += k * L.c[1]; out[2] += k * L.c[2];
  }
}

const shadePix = (t, r, g, b) => {
  let R = ((t & 255) * r) | 0, G = (((t >> 8) & 255) * g) | 0, B = (((t >> 16) & 255) * b) | 0;
  if (R > 255) R = 255; if (G > 255) G = 255; if (B > 255) B = 255;
  return 0xff000000 | (B << 16) | (G << 8) | R;
};

function wallTex(c, mx, my, px, py, side, cam) {
  if (c === 'L') return cam.switchOn ? TX.switchOn : TX.switchOff;
  if (c === 'O') return TX.pillar;
  if (MAP[py][px] === 'D' && side === 1) return TX.jamb;
  const r = region(px);
  const v = ((mx * 7 + my * 13) % 5);
  if (c === 'X') {
    if (r === 0) return TX.banner;
    if (r === 1) return TX.portraits[(mx * 3 + my * 5) % TX.portraits.length];
    if (r === 2) return TX.seal;
    return TX.elevator;
  }
  if (r === 0) return v === 0 ? TX.stone2 : TX.stone;
  if (r === 1) return v === 0 ? TX.wood2 : TX.wood;
  if (r === 2) return v === 0 ? TX.brick2 : TX.brick;
  return TX.elevator;
}

// cam: { x, y, a, h (eye height), hz (horizon row), lights, doors: Map 'x,y' → open 0..1, switchOn, ox (shake) }
export function render(buf, cam) {
  const dx = Math.cos(cam.a), dy = Math.sin(cam.a), plx = -dy * 0.66, ply = dx * 0.66;
  const { x: px, y: py, h, hz, lights } = cam;
  // ---- floor & ceiling ----
  const rx0 = dx - plx, ry0 = dy - ply, rx1 = dx + plx, ry1 = dy + ply;
  const Ld = [0, 0, 0];
  for (let y = 0; y < VH; y++) {
    const floor = y > hz;
    const p = floor ? y + 0.5 - hz : hz - (y + 0.5);
    if (p <= 0.5) { for (let x = 0; x < VW; x++) buf[y * VW + x] = 0xff000000; continue; }
    const rd = ((floor ? h : 1 - h) * PS) / p;
    let wx = px + rd * rx0, wy = py + rd * ry0;
    const sx = (rd * (rx1 - rx0)) / VW, sy = (rd * (ry1 - ry0)) / VW;
    const f = fall(rd);
    const row = y * VW;
    for (let x = 0; x < VW; x++, wx += sx, wy += sy) {
      const cx = Math.floor(wx), cy = Math.floor(wy);
      const reg = cx < 0 ? 0 : region(cx);
      const T = floor ? TX.floors[reg] : TX.ceils[reg];
      const tu = ((wx - cx) * 64) | 0, tv = ((wy - cy) * 64) | 0;
      const t = T[(tv & 63) * 64 + (tu & 63)];
      const L = light(wx, wy);
      Ld[0] = L[0] * f; Ld[1] = L[1] * f; Ld[2] = L[2] * f;
      if (lights.length) dyn(lights, wx, wy, Ld);
      const k = floor ? 1 : 0.8;
      buf[row + x] = shadePix(t, q(Ld[0]) * k, q(Ld[1]) * k, q(Ld[2]) * k);
    }
  }
  // ---- walls ----
  for (let col = 0; col < VW; col++) {
    const camX = (2 * (col + 0.5)) / VW - 1;
    const rdx = dx + plx * camX, rdy = dy + ply * camX;
    let mx = Math.floor(px), my = Math.floor(py);
    const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
    const stx = rdx < 0 ? -1 : 1, sty = rdy < 0 ? -1 : 1;
    let sdx = rdx < 0 ? (px - mx) * ddx : (mx + 1 - px) * ddx;
    let sdy = rdy < 0 ? (py - my) * ddy : (my + 1 - py) * ddy;
    let side = 0, dist = 30, tex = null, u = 0, hitX = 0, hitY = 0;
    for (let i = 0; i < 80; i++) {
      const pmx = mx, pmy = my;
      if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
      if (mx < 0 || my < 0 || mx >= MW || my >= MH) break;
      const c = MAP[my][mx];
      if (c === '.') continue;
      if (c === 'D') {
        const d = (mx + 0.5 - px) / rdx, hy = py + d * rdy;
        if (Math.floor(hy) !== my) continue;
        const fy = hy - my, o = cam.doors.get(mx * 100 + my) ?? 0;
        if (fy < 1 - o) { dist = d; tex = TX.door; u = fy + o; side = 0; hitX = mx + 0.5; hitY = hy; break; }
        continue;
      }
      dist = side === 0 ? sdx - ddx : sdy - ddy;
      hitX = px + dist * rdx; hitY = py + dist * rdy;
      u = side === 0 ? hitY - Math.floor(hitY) : hitX - Math.floor(hitX);
      if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) u = 1 - u;
      tex = wallTex(c, mx, my, pmx, pmy, side, cam);
      break;
    }
    ZB[col] = dist;
    if (!tex) continue;
    const lineH = PS / dist, top = hz - (1 - h) * lineH, bot = hz + h * lineH;
    const y0 = Math.max(0, Math.ceil(top - 0.5)), y1 = Math.min(VH, Math.ceil(bot - 0.5));
    const tu = Math.min(63, (u * 64) | 0);
    const L = light(hitX - rdx * 0.04, hitY - rdy * 0.04), f = fall(dist) * (side ? 0.78 : 1);
    Ld[0] = L[0] * f; Ld[1] = L[1] * f; Ld[2] = L[2] * f;
    if (lights.length) dyn(lights, hitX - rdx * 0.04, hitY - rdy * 0.04, Ld);
    const lr = q(Ld[0]), lg = q(Ld[1]), lb = q(Ld[2]);
    const vs = 64 / (bot - top);
    for (let y = y0; y < y1; y++) {
      const tv = Math.min(63, Math.max(0, ((y + 0.5 - top) * vs) | 0));
      buf[y * VW + col] = shadePix(tex[tv * 64 + tu], lr, lg, lb);
    }
  }
}

// Billboards: { x, y, z0, img:{w,h,d,e?}, ax, ay, ppu, white?, bright?, flip?, alpha? }
export function sprites(buf, cam, list) {
  const dx = Math.cos(cam.a), dy = Math.sin(cam.a), plx = -dy * 0.66, ply = dx * 0.66;
  const inv = 1 / (plx * dy - dx * ply);
  const { h, hz, lights } = cam;
  const items = [];
  for (const s of list) {
    const rx = s.x - cam.x, ry = s.y - cam.y;
    const tx = inv * (dy * rx - dx * ry), ty = inv * (-ply * rx + plx * ry);
    if (ty < 0.12) continue;
    items.push([ty, tx, s]);
  }
  items.sort((a, b) => b[0] - a[0]);
  const Ld = [0, 0, 0];
  for (const [ty, tx, s] of items) {
    const sx = (VW / 2) * (1 + tx / ty);
    const sc = PS / ty / (s.ppu ?? 128);
    const img = s.img;
    const left = sx - (s.flip ? img.w - s.ax : s.ax) * sc;
    const top = hz - ((s.z0 ?? 0) - h) * (PS / ty) - s.ay * sc;
    const x0 = Math.max(0, Math.ceil(left - 0.5)), x1 = Math.min(VW, Math.ceil(left + img.w * sc - 0.5));
    const y0 = Math.max(0, Math.ceil(top - 0.5)), y1 = Math.min(VH, Math.ceil(top + img.h * sc - 0.5));
    if (x0 >= x1 || y0 >= y1) continue;
    let lr, lg, lb;
    if (s.bright != null && s.bright >= 1) { lr = lg = lb = 1; }
    else {
      const L = light(s.x, s.y), f = fall(ty);
      Ld[0] = L[0] * f; Ld[1] = L[1] * f; Ld[2] = L[2] * f;
      if (lights.length) dyn(lights, s.x, s.y, Ld);
      lr = q(Ld[0]); lg = q(Ld[1]); lb = q(Ld[2]);
      const b = s.bright ?? 0;
      lr += (1 - lr) * b; lg += (1 - lg) * b; lb += (1 - lb) * b;
    }
    const white = s.white ?? 0, iw = 1 / sc;
    const D = img.d, E = img.e;
    for (let col = x0; col < x1; col++) {
      if (ty >= ZB[col]) continue;
      let u = ((col + 0.5 - left) * iw) | 0;
      if (u < 0 || u >= img.w) continue;
      if (s.flip) u = img.w - 1 - u;
      for (let y = y0; y < y1; y++) {
        const v = ((y + 0.5 - top) * iw) | 0;
        if (v < 0 || v >= img.h) continue;
        const t = D[v * img.w + u];
        if (!(t >>> 24)) continue;
        let p = E && E[v * img.w + u] ? t | 0xff000000 : shadePix(t, lr, lg, lb);
        if (white > 0) {
          const R = p & 255, G = (p >> 8) & 255, B = (p >> 16) & 255;
          p = 0xff000000 | ((B + (255 - B) * white) << 16) | ((G + (255 - G) * white) << 8) | (R + (255 - R) * white);
        }
        buf[y * VW + col] = p >>> 0;
      }
    }
  }
}

// Particles: { x, y, z, s (world size), c: 0xAABBGGRR }
export function particles(buf, cam, list) {
  const dx = Math.cos(cam.a), dy = Math.sin(cam.a), plx = -dy * 0.66, ply = dx * 0.66;
  const inv = 1 / (plx * dy - dx * ply);
  for (const p of list) {
    const rx = p.x - cam.x, ry = p.y - cam.y;
    const tx = inv * (dy * rx - dx * ry), ty = inv * (-ply * rx + plx * ry);
    if (ty < 0.15) continue;
    const sx = (VW / 2) * (1 + tx / ty), sy = cam.hz - (p.z - cam.h) * (PS / ty);
    const r = Math.max(1, Math.round((p.s * PS) / ty / 2));
    const x0 = Math.max(0, Math.round(sx - r)), x1 = Math.min(VW, Math.round(sx + r));
    const y0 = Math.max(0, Math.round(sy - r)), y1 = Math.min(VH, Math.round(sy + r));
    for (let x = x0; x < x1; x++) {
      if (ty >= ZB[x]) continue;
      for (let y = y0; y < y1; y++) buf[y * VW + x] = p.c;
    }
  }
}

// Project a world point to the screen (for popups / bubbles). Returns null behind the camera.
export function project(cam, wx, wy, z) {
  const dx = Math.cos(cam.a), dy = Math.sin(cam.a), plx = -dy * 0.66, ply = dx * 0.66;
  const inv = 1 / (plx * dy - dx * ply);
  const rx = wx - cam.x, ry = wy - cam.y;
  const tx = inv * (dy * rx - dx * ry), ty = inv * (-ply * rx + plx * ry);
  if (ty < 0.15) return null;
  return { x: (VW / 2) * (1 + tx / ty), y: cam.hz - (z - cam.h) * (PS / ty), d: ty, visible: ty < ZB[Math.max(0, Math.min(VW - 1, Math.round((VW / 2) * (1 + tx / ty))))] };
}
