// The 25 m stage, drawn at the game's native 960×540 into a low-res canvas (upscaled 2× nearest by film.js).
import { hash } from 'filmkit/lib.js';
import * as A from './art.js';
import {
  LW, LH, KL, HERO_END_X, STOPS, warp, filmT, INTRO, GIRDERS, TOP, SEGW, surf, LADDERS, DRUM, KONG, STACK_X, REL_X, FRIEND_X,
  JUMPS, JUMP_D, HAMMER, SMASH, MINION, BARRELS, THROWS, barrelAt, burnTimes, minionAt, heroAt, RIVETS, COLLAPSE,
  KONG_FALL, HEART_G, CLEAR_G, TALLY, IRIS, POUNDS, TOP_G, ARRIVE, hudScore, hudBonus, HISCORE0, G_END, VB,
} from './choreo.js';

export const FONT = '"Press Start 2P"';
export const ART = {};
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const P = A.PAL;

export async function prepareGame() {
  ART.hero = await A.loadSprite(42, { k: 0.45 });
  ART.friend = await A.loadSprite(26, { k: 0.45 });
  ART.kong = await A.loadSprite(1217, { far: true, k: 2 });
  ART.minion = await A.loadSprite(MINION.spr, { k: 0.36 });
  ART.balls = { 0: A.headBall(await A.loadSprite(0, { k: 0.48 })), 5: A.headBall(await A.loadSprite(5, { k: 0.48 })) };
  const heads = await A.loadHeads();
  ART.heroHead = A.headIcon(heads, 42, 1);
  ART.heroHead2 = A.headIcon(heads, 42, 2);
  ART.friendHead2 = A.headIcon(heads, 26, 2);
  ART.kongHead2 = A.headIcon(heads, 1217, 2);
  ART.seg = A.girderSeg();
  ART.rivet = A.rivet();
  ART.barrelEnd = Array.from({ length: 8 }, (_, i) => A.barrelEnd(i));
  ART.barrelSide = [0, 1].map((i) => A.barrelSide(i));
  ART.upright = A.barrelUpright();
  ART.drum = A.drum(DRUM.w, DRUM.h);
  ART.hammer = A.hammer();
  ART.heart = A.heart(3);
  ART.heartBig = A.heart(5);
  ART.sky = A.skyline(LW, LH);
  ART.block = A.block(14);
  ART.low = A.canvas(LW, LH);
}

// ---------- helpers ----------
export const fill = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), w, h); };
export function text(x, s, a, b, { size = 16, color = '#fff', shadow = '#07050f', align = 'left', alpha = 1 } = {}) {
  x.save();
  x.globalAlpha *= alpha;
  x.font = `${size}px ${FONT}`;
  x.textAlign = align;
  x.textBaseline = 'top';
  const k = Math.max(1, size / 8);
  if (shadow) { x.fillStyle = shadow; x.fillText(s, Math.round(a + k), Math.round(b + k)); }
  x.fillStyle = color;
  x.fillText(s, Math.round(a), Math.round(b));
  x.restore();
}
export function star4(x, cx, cy, r, col) {
  fill(x, col, cx - r, cy, r * 2 + 1, 1);
  fill(x, col, cx, cy - r, 1, r * 2 + 1);
  if (r > 2) fill(x, col, cx - 1, cy - 1, 3, 3);
}
const blit = (x, img, cx, cy) => x.drawImage(img, Math.round(cx - img.width / 2), Math.round(cy - img.height / 2));

// ---------- collapse: girders break into chunks and drop ----------
const CHUNK = 4; // segments per chunk
function chunkFall(L, c, g) {
  const t0 = COLLAPSE + 0.05 * (KL - L) + hash(L * 31 + c * 7) * 0.08;
  const dt = g - t0;
  if (dt <= 0) return { dy: 0, rot: 0, dx: 0 };
  return { dy: 0.5 * 1900 * dt * dt + 20 * dt, rot: (hash(L * 17 + c) - 0.5) * 2.4 * dt, dx: (hash(L * 13 + c * 3) - 0.5) * 60 * dt };
}
function drawGirders(x, g) {
  for (let L = 0; L < GIRDERS.length; L++) {
    const G = GIRDERS[L], n = Math.ceil((G.xb - G.xa) / SEGW);
    for (let c = 0; c * CHUNK < n; c++) {
      const f = L > 0 ? chunkFall(L, c, g) : { dy: 0, rot: 0, dx: 0 };
      if (f.dy > LH) continue;
      const s0 = c * CHUNK, s1 = Math.min(n, s0 + CHUNK);
      const cx = G.xa + ((s0 + s1) / 2) * SEGW, cy = surf(L, cx) + 6;
      x.save();
      x.translate(Math.round(cx + f.dx), Math.round(cy + f.dy));
      if (f.rot) x.rotate(f.rot);
      for (let s = s0; s < s1; s++) {
        const sx = G.xa + s * SEGW, w = Math.min(SEGW, G.xb - sx);
        x.drawImage(ART.seg, 0, 0, w, 12, Math.round(sx - cx), Math.round(surf(L, sx + 1) - cy), w, 12);
      }
      x.restore();
    }
  }
  // the rescue perch
  for (let sx = TOP.xa; sx < TOP.xb; sx += SEGW) x.drawImage(ART.seg, sx, TOP.y);
}
function drawRivets(x, g) {
  for (const r of RIVETS) {
    const y = surf(r.L, r.x) + 1, dt = g - r.pop;
    if (dt < 0) { x.drawImage(ART.rivet, r.x - 4, y); continue; }
    if (dt > 1.2) continue;
    const dir = r.x < 480 ? -1 : 1;
    const px = r.x + dir * 140 * dt, py = y - 300 * dt + 0.5 * 1600 * dt * dt;
    x.save(); x.translate(Math.round(px), Math.round(py)); x.rotate(Math.floor(dt * 20) * (Math.PI / 2));
    x.drawImage(ART.rivet, -4, -5);
    x.restore();
  }
}
function drawLadders(x, g) {
  for (const l of LADDERS) {
    const yb = surf(l.L, l.x), yt = surf(l.L + 1, l.x);
    const t0 = COLLAPSE + 0.05 * (KL - 1 - l.L) + hash(l.x) * 0.05, dt = g - t0;
    const dy = dt > 0 ? 0.5 * 1900 * dt * dt : 0;
    if (dy > LH) continue;
    const top = yt + 2, bot = yb, lx = l.x - 10;
    const gap = l.broken ? [top + (bot - top) * 0.3, top + (bot - top) * 0.62] : null;
    const rail = (rx) => {
      for (let y = top; y < bot; y += 2) {
        if (gap && y > gap[0] && y < gap[1]) continue;
        fill(x, P.lad, rx, y + dy, 2, 2);
      }
    };
    rail(lx); rail(lx + 18);
    for (let y = bot - 6; y > top; y -= 8) {
      if (gap && y > gap[0] - 2 && y < gap[1]) continue;
      fill(x, P.lad, lx + 2, y + dy, 16, 2);
      fill(x, P.ladLo, lx + 2, y + 2 + dy, 16, 1);
    }
  }
}

// ---------- oil drum + flames ----------
const FLARES = () => burnTimes();
function flames(x, cx, base, w, hgt, g, seed) {
  const cols = 2, n = Math.floor(w / cols);
  const fr = Math.floor(g * 16);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, env = Math.sin(Math.PI * u) ** 0.7;
    const h = hgt * env * (0.55 + 0.45 * hash(i * 7 + fr * 13 + seed));
    const fx = cx - w / 2 + i * cols;
    fill(x, '#ff3a1a', fx, base - h, cols, h);
    fill(x, '#ff9a1a', fx, base - h * 0.7, cols, h * 0.7);
    fill(x, '#fff27a', fx, base - h * 0.35, cols, h * 0.35);
  }
}
function drawDrum(x, g) {
  const base = surf(0, DRUM.x), top = base - DRUM.h;
  let flare = 0;
  for (const t of FLARES()) { const d = g - t; if (d >= 0 && d < 0.5) flare = Math.max(flare, 1 - d / 0.5); }
  // glow
  const gl = x.createRadialGradient(DRUM.x, top, 0, DRUM.x, top, 70 + 60 * flare);
  gl.addColorStop(0, `rgba(255,140,40,${0.25 + 0.35 * flare})`); gl.addColorStop(1, 'rgba(255,80,20,0)');
  x.fillStyle = gl; x.fillRect(DRUM.x - 140, top - 140, 280, 240);
  flames(x, DRUM.x, top + 1, DRUM.w - 4, 12 + 46 * flare + 3 * Math.sin(g * 21), g, 0);
  x.drawImage(ART.drum, DRUM.x - DRUM.w / 2, top);
  // sparks
  for (let i = 0; i < 10; i++) {
    const ph = (g * 0.9 + hash(i + 3)) % 1, sx = DRUM.x + (hash(i + 9) - 0.5) * 30 + Math.sin(g * 5 + i) * 6, sy = top - 6 - ph * (40 + 70 * flare);
    x.globalAlpha = 1 - ph;
    fill(x, ph < 0.4 ? '#fff27a' : '#ff8a2a', sx, sy, 2, 2);
  }
  x.globalAlpha = 1;
}

// ---------- particles (analytic events) ----------
const PT = [];
const ev = (g, kind, px, py, extra = {}) => PT.push({ g, kind, x: px, y: py, seed: PT.length * 13 + 7, ...extra });
for (const j of JUMPS) { const tl = j.apex + JUMP_D / 2, h = heroAt(tl); ev(tl, 'dust', h.x, h.feet, { n: 4, s: 0.8 }); }
SMASH.forEach((s, i) => {
  const h = heroAt(s), cx = h.x + h.face * 44, cy = h.feet - 12;
  ev(s, 'boom', cx, cy, { big: i === 3 });
  ev(s, 'stars', cx, cy, { big: i >= 2 });
  if (i < 2) ev(s, 'planks', cx, cy);
  if (i === 2) ev(s, 'ring', cx, cy);
});
ev(HAMMER.grab, 'burst', HAMMER.x, HAMMER.y);
for (const t of burnTimes()) ev(t, 'embers', DRUM.x, surf(0, DRUM.x) - DRUM.h);
for (const r of RIVETS) ev(r.pop, 'sparkle', r.x, surf(r.L, r.x) + 4);
for (let L = 1; L <= KL; L++) for (let i = 0; i < 6; i++) { const px = GIRDERS[L].xa + (i + 0.5) * (GIRDERS[L].xb - GIRDERS[L].xa) / 6; ev(COLLAPSE + 0.05 * (KL - L) + 0.02 * i, 'puff', px, surf(L, px) + 6); }
ev(KONG_FALL.t1, 'quake', KONG.x, KONG_FALL.y1);
ev(KONG_FALL.t1, 'stars', KONG.x, KONG_FALL.y1 - 20, { big: true });
ev(HEART_G, 'burst', (HERO_END_X + FRIEND_X) / 2, TOP.y - 72, { pink: true });
ev(HEART_G, 'sparkle', (HERO_END_X + FRIEND_X) / 2, TOP.y - 72);

const SHAKES = [];
SMASH.forEach((s, i) => SHAKES.push([s, i === 3 ? 5 : 3]));
SHAKES.push([HAMMER.grab, 2], [COLLAPSE, 5], [KONG_FALL.t1, 13]);
for (const t of burnTimes()) SHAKES.push([t, 1.5]);

function drawParticles(x, g) {
  for (const p of PT) {
    const age = g - p.g;
    if (age < 0 || age > 1.6) continue;
    const r = (k) => hash(p.seed * 31 + k);
    const sx = p.x, sy = p.y;
    switch (p.kind) {
      case 'dust': {
        if (age > 0.35) break;
        const u = age / 0.35;
        for (let i = 0; i < p.n; i++) {
          const dir = i % 2 ? 1 : -1, sp = (30 + 40 * r(i)) * p.s;
          x.globalAlpha = 1 - u;
          x.fillStyle = '#e8e4ff';
          x.beginPath(); x.arc(Math.round(sx + dir * sp * age * 1.6), Math.round(sy - 3 - 14 * age * r(i + 9)), Math.round(2 + 3 * u), 0, 7); x.fill();
        }
        x.globalAlpha = 1;
        break;
      }
      case 'stars': {
        if (age > 0.4) break;
        const u = age / 0.4, n = p.big ? 10 : 6;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + r(1), d = (p.big ? 60 : 32) * Math.sqrt(u);
          star4(x, Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d * 0.7), Math.round(3 * (1 - u)) + 1, i % 2 ? '#fff6a0' : '#ffffff');
        }
        if (age < 0.05) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(sx, sy, p.big ? 20 : 12, 0, 7); x.fill(); }
        break;
      }
      case 'ring': {
        if (age > 0.25) break;
        const u = age / 0.25;
        x.strokeStyle = '#ffffff'; x.globalAlpha = 1 - u; x.lineWidth = 2;
        x.beginPath(); x.ellipse(sx, sy, 8 + 40 * u, 4 + 16 * u, 0, 0, 7); x.stroke();
        x.globalAlpha = 1;
        break;
      }
      case 'boom': {
        if (age > 0.4) break;
        const u = age / 0.4, R = (p.big ? 34 : 22) * Math.sqrt(u);
        const cols = ['#ffffff', '#fff1a0', '#ffb43a', '#ff5a2a', '#7a2a2a'];
        x.fillStyle = cols[Math.min(4, Math.floor(u * 5))];
        // Paint a hollow blast without erasing the stage, sprites, or ladder behind its center.
        x.beginPath(); x.arc(sx, sy, R, 0, Math.PI * 2);
        if (u > 0.25) {
          const inner = R * (u - 0.2) * 1.2;
          x.moveTo(sx + inner, sy); x.arc(sx, sy, inner, 0, Math.PI * 2, true);
        }
        x.fill('evenodd');
        for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283 + r(i), d = R * 1.6; fill(x, '#ffd34a', sx + Math.cos(a) * d, sy + Math.sin(a) * d, 2, 2); }
        break;
      }
      case 'planks': {
        for (let i = 0; i < 5; i++) {
          const dir = i % 2 ? 1 : -1, vx = dir * (60 + 90 * r(i)), vy = -(260 + 160 * r(i + 5));
          const fx = sx + vx * age, fy = sy + vy * age + 0.5 * 1500 * age * age;
          if (fy > LH + 20) continue;
          x.save(); x.translate(Math.round(fx), Math.round(fy)); x.rotate(Math.floor(age * 16 * dir + i) * (Math.PI / 4));
          fill(x, P.woodInk, -6, -2, 12, 5); fill(x, i % 2 ? P.wood : P.woodHi, -5, -1, 10, 3);
          x.restore();
        }
        break;
      }
      case 'sparkle': {
        if (age > 0.4) break;
        const u = age / 0.4;
        for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.6, d = 6 + 18 * u; star4(x, Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d), Math.round(4 * (1 - u)), '#fffbe0'); }
        break;
      }
      case 'burst': {
        if (age > 0.6) break;
        const u = age / 0.6;
        x.save(); x.globalAlpha = 1 - u;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * 6.283 + u * 0.6, d0 = 16 + 140 * u, d1 = d0 + 20 + 30 * (1 - u);
          x.strokeStyle = p.pink ? (i % 2 ? '#ff7aa0' : '#ffffff') : i % 2 ? '#ffe27a' : '#ffffff'; x.lineWidth = 3;
          x.beginPath(); x.moveTo(sx + Math.cos(a) * d0, sy + Math.sin(a) * d0); x.lineTo(sx + Math.cos(a) * d1, sy + Math.sin(a) * d1); x.stroke();
        }
        x.restore();
        break;
      }
      case 'embers': {
        if (age > 0.8) break;
        for (let i = 0; i < 12; i++) {
          const vx = (r(i) - 0.5) * 160, vy = -(160 + 200 * r(i + 20));
          const fx = sx + vx * age, fy = sy + vy * age + 0.5 * 700 * age * age;
          x.globalAlpha = 1 - age / 0.8;
          fill(x, i % 3 ? '#ffb43a' : '#fff27a', fx, fy, 2, 2);
        }
        x.globalAlpha = 1;
        break;
      }
      case 'puff': {
        if (age > 0.6) break;
        const u = age / 0.6;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + r(2), d = 6 + 26 * u;
          x.globalAlpha = 0.85 * (1 - u);
          x.fillStyle = i % 2 ? '#b8b0d8' : '#8a82b0';
          x.beginPath(); x.arc(Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d * 0.6 + 20 * u), Math.round(8 * (1 - u * 0.5)), 0, 7); x.fill();
        }
        x.globalAlpha = 1;
        break;
      }
      case 'quake': {
        if (age > 1.0) break;
        const u = age / 1.0;
        for (let i = 0; i < 16; i++) {
          const dir = i % 2 ? 1 : -1, sp = 60 + 260 * r(i);
          const px = sx + dir * sp * (1 - Math.exp(-age * 5)) / 2.2, py = sy - 6 - 40 * r(i + 4) * Math.sqrt(u) - 10 * u;
          x.globalAlpha = 0.9 * (1 - u);
          x.fillStyle = i % 3 ? '#d8d0f0' : '#9a92c0';
          x.beginPath(); x.arc(Math.round(px), Math.round(py), Math.round(5 + 12 * u * r(i + 7) + 4), 0, 7); x.fill();
        }
        x.globalAlpha = 1;
        if (age < 0.3) { x.strokeStyle = '#ffffff'; x.globalAlpha = 1 - age / 0.3; x.lineWidth = 3; x.beginPath(); x.ellipse(sx, sy - 4, 20 + 260 * age, 6 + 24 * age, 0, 0, 7); x.stroke(); x.globalAlpha = 1; }
        break;
      }
    }
  }
}

// ---------- Kong ----------
// Arm: chunky pixel limb from shoulder (sx, sy) to fist (hx, hy), local to Kong's feet.
function arm(x, sx, sy, hx, hy) {
  const n = Math.max(2, Math.ceil(Math.hypot(hx - sx, hy - sy) / 2));
  for (const pass of [0, 1]) {
    for (let i = 0; i <= n; i++) {
      const u = i / n, px = sx + (hx - sx) * u, py = sy + (hy - sy) * u;
      const sleeve = u < 0.55, r = sleeve ? 7 : 5;
      if (pass === 0) fill(x, '#2a1a24', px - r - 1, py - r - 1, (r + 1) * 2, (r + 1) * 2);
      else fill(x, sleeve ? (u < 0.15 ? '#ffffff' : '#ece6e8') : '#b5855f', px - r, py - r, r * 2, r * 2);
    }
  }
  // fist
  fill(x, '#2a1a24', hx - 9, hy - 9, 18, 18);
  fill(x, '#b5855f', hx - 8, hy - 8, 16, 16);
  fill(x, '#d8a47a', hx - 8, hy - 8, 16, 4);
  fill(x, '#7a4e30', hx - 8, hy + 4, 16, 4);
  fill(x, '#7a4e30', hx - 3, hy - 4, 1, 8); fill(x, '#7a4e30', hx + 2, hy - 4, 1, 8);
}
const SH_L = [-38, -66], SH_R = [38, -66];
function kongState(g) {
  if (g >= KONG_FALL.t0) return { k: g >= KONG_FALL.t1 ? 'down' : 'fall' };
  for (const t of THROWS) { const p = g - (t - 0.5); if (p >= 0 && p < 0.66) return { k: 'throw', p, t }; }
  for (const [a, b] of POUNDS) if (g >= a && g < b) return { k: 'pound', p: g - a };
  return { k: 'idle' };
}
// opt (title cards): { cx, feet, st } overrides the stage placement and mood.
export function drawKong(x, g, lt, opt = null) {
  const st = opt?.st ?? kongState(g), R = ART.kong;
  const fx = opt?.cx ?? KONG.x, base = opt?.feet ?? surf(KL, KONG.x);
  let feet = base, angle = 0, o = {}, hands, held = null, tremble = 0;
  if (st.k === 'idle') {
    const sw = Math.sin(g * 6.5);
    o = { lean: 0.02 * sw, lift: sw > 0.6 ? [4, 0] : sw < -0.6 ? [0, 4] : [0, 0] };
    hands = [[-54, -30 + 3 * sw], [54, -30 - 3 * sw]];
  } else if (st.k === 'pound') {
    const ph = Math.floor(st.p / 0.075) % 2;
    o = { lift: ph ? [6, 0] : [0, 6], sy: 1 + 0.02 * ph, sx: 1 - 0.015 * ph };
    hands = ph ? [[-8, -62], [44, -76]] : [[-44, -76], [8, -62]];
    if (g > TOP_G) tremble = 1;
  } else if (st.k === 'throw') {
    const p = st.p;
    if (p < 0.18) { o = { flip: true, lean: -0.06 }; hands = [[-70, -24], [-48, -20]]; held = [-60, -10, 'side']; }
    else if (p < 0.4) { const u = (p - 0.18) / 0.22, e = 1 - (1 - u) ** 2; o = { sy: 1 + 0.05 * e, sx: 1 - 0.03 * e }; hands = [[-26 - 30 * (1 - e), -40 - 128 * e], [26 - 20 * (1 - e), -40 - 128 * e]]; held = [-20 * (1 - e), -50 - 128 * e, 'side']; }
    else if (p < 0.5) { const u = (p - 0.4) / 0.1; o = { lean: 0.08 * u }; hands = [[-10 + 50 * u, -168 + 140 * u], [26 + 60 * u, -168 + 156 * u]]; held = [10 + (REL_X - KONG.x - 10) * u, -178 + 166 * u, 'side']; }
    else { const u = (p - 0.5) / 0.16; o = { lean: 0.08 * (1 - u), sy: 1 - 0.04 * Math.sin(u * Math.PI) }; hands = [[40 - 50 * u, -28], [86 - 32 * u, -12 - 18 * u]]; }
  } else if (st.k === 'fall') {
    const dt = g - KONG_FALL.t0, u = dt / (KONG_FALL.t1 - KONG_FALL.t0);
    feet = KONG_FALL.y0 + 0.5 * 2200 * dt * dt;
    angle = Math.PI * u * u * (3 - 2 * u);
    const fl = Math.sin(g * 40);
    hands = [[-58, -150 + 10 * fl], [58, -150 - 10 * fl]];
    o = { lift: [6, 2], white: dt < 0.05 };
  } else {
    const dt = g - KONG_FALL.t1;
    feet = KONG_FALL.y1; angle = Math.PI;
    const k = Math.floor(dt / 0.09) % 2;
    const sq = dt < 0.18 ? Math.sin((dt / 0.18) * Math.PI) : 0;
    o = { lift: k ? [10, 0] : [0, 10], sy: 1 - 0.14 * sq, sx: 1 + 0.1 * sq };
    hands = [[-62, -40], [62, -40]];
  }
  if (!opt && (tremble || (g > RIVETS[0].pop && g < KONG_FALL.t0))) tremble = 1;
  const tx = tremble ? Math.round(Math.sin(lt * 90) * 2) : 0;
  x.save();
  x.translate(Math.round(fx + tx), Math.round(feet - 79));
  if (angle) x.rotate(angle);
  x.translate(0, 79);
  const sy = o.sy ?? 1;
  // back arm (the one on the far side when flipped) then body then front arm
  const sh = (s) => [s[0] * (o.flip ? -1 : 1), s[1] * sy];
  const hd = (h) => [h[0], h[1] * sy];
  if (st.k === 'idle' || st.k === 'down') { arm(x, ...sh(SH_L), ...hd(hands[0])); arm(x, ...sh(SH_R), ...hd(hands[1])); }
  A.drawRemy(x, R, 0, 0, o);
  if (held) {
    const projectile = BARRELS.find((b) => b.t0 === st.t);
    const img = projectile?.kind === 'head' ? ART.balls[projectile.spr] : ART.barrelSide[0];
    x.drawImage(img, Math.round(held[0] - img.width / 2), Math.round(held[1] - img.height / 2));
  }
  if (!(st.k === 'idle' || st.k === 'down')) { arm(x, ...sh(SH_L), ...hd(hands[0])); arm(x, ...sh(SH_R), ...hd(hands[1])); }
  if (st.k === 'pound') {
    // chest impact lines
    const ph = Math.floor(st.p / 0.075) % 2, hx = ph ? -12 : 12;
    if ((st.p % 0.075) < 0.04) for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5 + (ph ? -0.6 : 0.6); fill(x, '#fff6a0', hx + Math.cos(a) * 18, -64 + Math.sin(a) * 18, 3, 3); fill(x, '#fff6a0', hx + Math.cos(a) * 26, -64 + Math.sin(a) * 26, 2, 2); }
  }
  x.restore();
  // dizzy stars over the head (now at the floor)
  if (st.k === 'down') {
    const dt = g - KONG_FALL.t1;
    for (let i = 0; i < 4; i++) {
      const a = dt * 7 + (i / 4) * Math.PI * 2;
      star4(x, Math.round(fx + Math.cos(a) * 46), Math.round(feet - 14 + Math.sin(a) * 9), 4, i % 2 ? '#ffe27a' : '#ffffff');
    }
  }
  if (opt) return;
  // shock "!!" as the rivets go
  if (g > RIVETS[2].pop && g < KONG_FALL.t0 + 0.2) text(x, '!!', fx + 30, base - 186 - (Math.floor(lt * 12) % 2) * 2, { size: 16, color: '#ff4a6a' });
  // angry steam during the late pounds
  if (st.k === 'pound' && g > 3) for (let i = 0; i < 3; i++) { const ph = (st.p * 2.2 + i / 3) % 1; x.globalAlpha = 1 - ph; fill(x, '#ffffff', fx - 10 + i * 10 + Math.sin(ph * 9 + i) * 3, base - 160 - ph * 30, 4, 4); x.globalAlpha = 1; }
}
function drawStack(x, g) {
  const y = surf(KL, STACK_X);
  for (const [dx, dy] of [[-48, 0], [-24, 0], [-36, -30], [-12, -30]]) {
    const f = chunkFall(KL, 0, g);
    x.drawImage(ART.upright, Math.round(STACK_X + dx - 11 + f.dx), Math.round(y - 30 + dy + f.dy));
  }
}

// ---------- friend on the perch ----------
const HELPS = [[0.15, 0.95], [2.7, 3.4], [5.1, 5.8], [7.5, 8.2]];
function drawFriend(x, g, lt) {
  const R = ART.friend, fy = TOP.y;
  let o = { flip: true }, y = fy;
  if (g < ARRIVE) {
    const sw = Math.floor(g / 0.25) % 2;
    o.lift = sw ? [3, 0] : [0, 3];
    o.flip = Math.floor(g / 1.1) % 2 === 0;
  } else if (g >= HEART_G) {
    const d = g - HEART_G, hop = d < 0.9 ? Math.abs(Math.sin((d / 0.3) * Math.PI)) * 12 * (1 - d / 0.9) : 0;
    y -= hop; o.flip = true; o.lift = hop > 2 ? [4, 4] : [0, 0];
  }
  A.drawRemy(x, R, FRIEND_X, y, o);
  for (const [a, b] of HELPS) if (g >= a && g < b) {
    const bx = FRIEND_X + 22, by = fy - 70;
    text(x, 'HELP!', bx, by, { size: 16, color: '#7af0ff' });
  }
}

// ---------- hero ----------
function drawHammerAt(x, hx, hy, rot, flip) {
  x.save(); x.translate(Math.round(hx), Math.round(hy)); if (flip) x.scale(-1, 1); x.rotate(rot);
  x.drawImage(ART.hammer, -8, -20);
  x.restore();
}
function hammerDown(g) {
  for (const s of SMASH) if (g >= s - 0.07 && g < s + 0.1) return true;
  return Math.floor(g / 0.1) % 2 === 1;
}
function drawHero(x, g, stop, sl) {
  const h = heroAt(g), R = ART.hero;
  const o = { flip: h.face < 0, lift: [0, 0], stride: [0, 0], lean: 0 };
  let y = h.feet;
  if (h.mode === 'walk' || (h.mode === 'hammer' && h.seg.x1 !== h.seg.x0)) {
    const ph = (h.x / 30) * Math.PI * 2, s = Math.sin(ph);
    o.lift = [Math.round(Math.max(0, s) * 6), Math.round(Math.max(0, -s) * 6)];
    o.stride = [Math.round(s * 2), Math.round(-s * 2)];
    y -= Math.round(Math.abs(Math.cos(ph)) * 2);
    o.lean = 0.06 * h.face;
  } else if (h.mode === 'climb') {
    const k = Math.floor((h.feet) / 9) % 2;
    o.lift = k ? [7, 0] : [0, 7];
    o.flip = k === 1;
  }
  if (h.jump) {
    o.lift = h.jump.up ? [8, 3] : [4, 8];
    o.stride = [-1, 1];
    const st = clamp01(1 - (h.jump.u * JUMP_D) / 0.1);
    o.sy = 1 + 0.12 * st; o.sx = 1 - 0.08 * st;
  }
  for (const j of JUMPS) { const d = g - (j.apex + JUMP_D / 2); if (d >= 0 && d < 0.12) { const s = Math.sin((d / 0.12) * Math.PI); o.sy = 1 - 0.15 * s; o.sx = 1 + 0.12 * s; } }
  if (g >= HEART_G) { const d = g - HEART_G; const hop = d < 0.9 ? Math.abs(Math.sin((d / 0.3) * Math.PI + 0.5)) * 12 * (1 - d / 0.9) : 0; y -= hop; }
  // power-up flicker at the grab
  if (stop?.kind === 'power') { o.white = Math.floor(sl / 0.05) % 2 === 0; o.glow = '#ffd34a'; o.glowA = 0.8; }
  else if (h.hammer) { o.glow = '#ffcf3a'; o.glowA = 0.25 + 0.2 * Math.sin(g * 30); }
  // hammer flicker in its last 0.4 s
  const hamVis = h.hammer && !(g > HAMMER.end - 0.45 && Math.floor(g / 0.06) % 2 === 0);
  const down = hammerDown(g), f = h.face;
  if (hamVis && !down) drawHammerAt(x, h.x - f * 6, y - 40, -0.25 * f, false);
  A.drawRemy(x, R, h.x, y, o);
  if (hamVis && down) {
    drawHammerAt(x, h.x + f * 16, y - 22, f * (Math.PI / 2 + 0.35), false);
    // swoosh arc
    x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 2;
    x.beginPath(); x.arc(h.x + f * 4, y - 26, 34, f > 0 ? -1.5 : Math.PI - 0.6, f > 0 ? 0.6 : Math.PI + 1.5); x.stroke();
  }
  return h;
}
function drawMinion(x, g) {
  const m = minionAt(g);
  if (!m && !(g >= MINION.smash && g < MINION.smash + 0.4)) return;
  if (!m) {
    // smashed: squashed flash then gone
    const d = g - MINION.smash, h = heroAt(MINION.smash);
    if (d < 0.25) A.drawRemy(x, ART.minion, h.x + h.face * 44, surf(1, h.x + h.face * 44), { white: Math.floor(d / 0.04) % 2 === 0, sy: 0.35, sx: 1.4 });
    return;
  }
  const step = Math.floor(g / 0.08) % 2;
  const hop = m.mode === 'run' ? Math.abs(Math.sin(g * 22)) * 5 : 0;
  // fire aura
  flames(x, m.x, m.feet - 28 - hop, 30, 22 + 4 * Math.sin(g * 30), g, 99);
  A.drawRemy(x, ART.minion, m.x, m.feet - hop, { flip: m.mode === 'climb' ? step === 1 : m.face < 0, lift: step ? [4, 0] : [0, 4], glow: '#ff6a1a', glowA: 0.9 });
}

// ---------- barrels ----------
function drawBarrels(x, g) {
  for (const b of BARRELS) {
    const p = barrelAt(b, g);
    if (!p) continue;
    if (p.y > LH + 40) continue;
    if (b.kind === 'head') {
      const img = ART.balls[b.spr], a = Math.round(p.roll / (Math.PI / 4)) * (Math.PI / 4);
      x.save(); x.translate(Math.round(p.x), Math.round(p.y - img.height / 2)); x.rotate(a); x.drawImage(img, -img.width / 2, -img.height / 2); x.restore();
      continue;
    }
    if (p.side) { const img = ART.barrelSide[Math.floor(g * 10) % 2]; x.drawImage(img, Math.round(p.x - img.width / 2), Math.round(p.y - img.height)); continue; }
    const fr = ((Math.floor(p.roll / (Math.PI / 8)) % 8) + 8) % 8, img = ART.barrelEnd[fr];
    x.drawImage(img, Math.round(p.x - img.width / 2), Math.round(p.y - img.height));
  }
}
function drawHammerPickups(x, g) {
  if (g < HAMMER.grab) {
    const by = HAMMER.y + Math.round(Math.sin(g * 5) * 2);
    x.drawImage(ART.hammer, HAMMER.x - 8, by - 11);
    if (Math.floor(g * 6) % 3 === 0) star4(x, HAMMER.x + 9, by - 12, 3, '#ffffff');
  }
  // the second (unused) hammer, upper left
  const f = chunkFall(2, 1, g);
  if (f.dy < LH) x.drawImage(ART.hammer, 160 - 8 + f.dx, surf(2, 160) - 66 + f.dy + Math.round(Math.sin(g * 5 + 1) * 2));
}

// ---------- popups / text ----------
function drawPopups(x, g) {
  const pops = [];
  for (const j of JUMPS) if (j.pts) { const h = heroAt(j.apex); pops.push([j.apex, h.x, h.feet - 80, String(j.pts), '#ffffff']); }
  SMASH.forEach((s, i) => { const h = heroAt(s); pops.push([s, h.x + h.face * 44, h.feet - 60, ['300', '500', '800', '800'][i], i >= 2 ? '#ffe27a' : '#ffffff']); });
  for (const [t, px, py, s, col] of pops) {
    const a = g - t;
    if (a < 0 || a > 0.7) continue;
    text(x, s, px, py - 30 * Math.sqrt(a / 0.7), { size: 16, align: 'center', color: col, alpha: clamp01((0.7 - a) / 0.15) });
  }
}
function drawClear(x, g, lt) {
  if (g < CLEAR_G) return;
  const s = 'KONGRATULATIONS!', size = 32, x0 = LW / 2 - (s.length * size) / 2;
  for (let i = 0; i < s.length; i++) {
    const a = g - CLEAR_G - i * 0.03;
    if (a < 0) continue;
    const dy = a < 0.22 ? -70 * (1 - a / 0.22) ** 2 + 10 * Math.sin((a / 0.22) * Math.PI) : 0;
    const hue = ['#ff3d6e', '#ffffff', '#ffd02a', '#7af0ff'][Math.floor(lt * 12 + i) % 4];
    text(x, s[i], x0 + i * size, 236 + dy, { size, color: a < 0.4 ? '#ffffff' : hue });
  }
  if (g > CLEAR_G + 0.3) text(x, 'THE CABALD HAS FALLEN', LW / 2, 284, { size: 16, align: 'center', color: '#ff8ab0', alpha: clamp01((g - CLEAR_G - 0.3) / 0.08) });
}

// ---------- HUD ----------
export function drawHud(x, { score = 0, hi = HISCORE0, hiX = LW / 2, bonus = 5000, lives = 2, blink = 0, hiFlash = false }) {
  text(x, '1UP', 40, 10, { size: 16, color: P.hud, alpha: blink ? (Math.floor(blink * 4) % 2 ? 1 : 0) : 1 });
  text(x, String(score).padStart(6, '0'), 24, 30, { size: 16 });
  for (let i = 0; i < lives; i++) x.drawImage(ART.heroHead, 24 + i * 18, 50);
  text(x, 'HIGH SCORE', hiX, 10, { size: 16, align: 'center', color: P.hud });
  text(x, String(hi).padStart(6, '0'), hiX, 30, { size: 16, align: 'center', color: hiFlash ? '#ffe27a' : '#ffffff' });
  if (bonus == null) return;
  // BONUS box
  const bx = 790, by = 8, bw = 140, bh = 52;
  x.fillStyle = P.hudBlue; x.fillRect(bx, by, bw, bh);
  x.fillStyle = '#07050f'; x.fillRect(bx + 3, by + 3, bw - 6, bh - 6);
  x.fillStyle = P.hud; x.fillRect(bx + 5, by + 5, bw - 10, 2); x.fillRect(bx + 5, by + bh - 7, bw - 10, 2);
  text(x, 'BONUS', bx + bw / 2, by + 12, { size: 8, align: 'center', color: P.hudCyan, shadow: null });
  text(x, String(bonus).padStart(4, '0'), bx + bw / 2, by + 26, { size: 16, align: 'center', color: '#ffffff' });
  text(x, 'L=01', bx - 20, by + 20, { size: 16, align: 'right', color: P.hudBlue });
}

// ---------- heart iris ----------
function heartPath(x, cx, cy, r) {
  const k = r / 16;
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const px = cx + 16 * Math.sin(t) ** 3 * k, py = cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k;
    if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
  }
  x.closePath();
}

// Shot-local draw: returns the low-res canvas.
export function drawStage(lt) {
  const { g, stop, sl } = warp(lt);
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.fillStyle = '#000'; x.fillRect(0, 0, LW, LH);
  let shx = 0, shy = 0;
  for (const [ge, amp] of SHAKES) {
    const d = lt - (filmT(ge) - INTRO);
    if (d < 0 || d > 0.4) continue;
    const k = amp * Math.exp(-d * 12);
    shx += k * Math.sin(d * 95 + ge * 10);
    shy += k * Math.cos(d * 77 + ge * 7);
  }
  // Kong's chest pounds rattle the screen a touch
  const ks = kongState(g);
  if (ks.k === 'pound' && (ks.p % 0.075) < 0.03) shy += 1;
  x.save();
  x.translate(Math.round(shx), Math.round(shy));
  x.drawImage(ART.sky, 0, 0);
  drawLadders(x, g);
  drawGirders(x, g);
  drawRivets(x, g);
  drawDrum(x, g);
  drawStack(x, g);
  drawKong(x, g, lt);
  drawFriend(x, g, lt);
  drawHammerPickups(x, g);
  drawBarrels(x, g);
  drawMinion(x, g);
  const h = drawHero(x, g, stop, sl);
  drawParticles(x, g);
  if (stop?.kind === 'power') {
    const hx = h.x, hy = h.feet - 30;
    const a = Math.min(1, sl / 0.06) * Math.min(1, (stop.d - sl) / 0.08) * 0.6;
    x.save(); x.globalAlpha = a; x.fillStyle = '#05030c';
    const hr = 62 + 5 * Math.sin(sl * 50);
    x.beginPath(); x.rect(-20, -20, LW + 40, LH + 40); x.moveTo(hx + hr, hy); x.arc(hx, hy, hr, 0, 7, true); x.fill('evenodd');
    x.restore();
    drawHero(x, g, stop, sl);
    text(x, 'SMASH TIME!', hx, hy - 96, { size: 16, align: 'center', color: '#ffe27a', alpha: Math.min(1, sl / 0.06) });
  }
  // heart over the couple
  if (g >= HEART_G) {
    const d = g - HEART_G, s = d < 0.25 ? 1.6 * Math.sin((d / 0.25) * Math.PI * 0.5) : 1 + 0.08 * Math.sin(d * 9);
    const img = ART.heartBig, cx = (HERO_END_X + FRIEND_X) / 2, cy = TOP.y - 76 - 4 * Math.sin(d * 4);
    x.save(); x.translate(Math.round(cx), Math.round(cy)); x.scale(s, s); x.drawImage(img, -img.width / 2, -img.height / 2); x.restore();
  }
  drawPopups(x, g);
  drawClear(x, g, lt);
  x.restore();
  // iris (heart-shaped) onto the couple
  const iu = clamp01((g - IRIS.t0) / (IRIS.t1 - IRIS.t0));
  if (iu > 0) {
    const r = 900 * (1 - iu) ** 2.2 + 92 * iu;
    const cx = (HERO_END_X + FRIEND_X) / 2, cy = TOP.y - 34;
    x.fillStyle = '#000';
    x.beginPath(); x.rect(0, 0, LW, LH); heartPath(x, cx, cy, r); x.fill('evenodd');
    if (iu >= 1) {
      if (Math.floor(lt * 2.5) % 2 === 0) text(x, 'INSERT COIN', LW / 2, 400, { size: 16, align: 'center', color: '#ffffff' });
      text(x, '©2026 REMY BOYS', LW / 2, 470, { size: 8, align: 'center', color: '#ff8ab0', shadow: null });
    }
  }
  const sc = hudScore(g);
  // Keep the rescue heart's overshoot clear of the score; attract cards retain their centered arcade HUD.
  drawHud(x, { score: sc, hi: Math.max(HISCORE0, sc), hiX: 620, bonus: hudBonus(g), lives: 2, hiFlash: sc > HISCORE0 && Math.floor(lt * 8) % 2 === 0 });
  return { low: ART.low, g, stop };
}
