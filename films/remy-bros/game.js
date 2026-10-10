// The level, drawn at the game's native 960×540 into a low-res canvas (upscaled 2× nearest by film.js).
import { hash } from 'filmkit/lib.js';
import * as A from './art.js';
import {
  LW, LH, TILE, GY, BIG_H, SMALL_H, EH, INTRO, STOPS, warp, filmT, heroX, heroY, heroSpeed, jumpAt, JUMPS, isBig, POWER_G,
  POLE_FLIP_G, PIPE, Q1, Q2, BRICKS, BRICK_G, PIT, STAIR_X, STAIR_COLS, POLE, DOOR_X, CASTLE, CAM_MAX, FIRE_T, fireball,
  KICK_G, SHELL_REST, SHELL_HITS, SHELL_CRASH, shell, ENEMIES, enemyAt, PIT_COINS, hudScore, hudCoins, hudKills, hudTime,
  camX, FLAG_RISE, FIREWORKS, IRIS_OUT, SLIDE, G_END,
} from './choreo.js';

export const FONT = '"Press Start 2P"';
const ART = {};
const LEVEL_W = Math.ceil(CAM_MAX + LW + 40);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export async function prepareGame() {
  ART.heroS = await A.loadRemy(42, true);
  ART.heroB = await A.loadRemy(42, false);
  ART.enemies = {};
  for (const e of ENEMIES) ART.enemies[e.spr] = await A.loadRemy(e.spr, true);
  ART.shellHead = A.headCrop(ART.enemies[482]);
  const heads = await A.loadHeads();
  ART.heroHead = A.headIcon(heads, 42, 1);
  ART.heroHead2 = A.headIcon(heads, 42, 2);
  ART.baldHead = A.headIcon(heads, 5, 1);
  ART.sky = A.sky(LW, LH);
  ART.mountains = A.mountains(1500, 230);
  ART.hills = A.hills(2500, 170);
  ART.ground = A.ground(LEVEL_W, LH - GY, [[PIT.l, PIT.r]]);
  ART.q = [0, 1, 2, 3].map((i) => A.qBlock(i / 3));
  ART.used = A.usedBlock();
  ART.brick = A.brick();
  ART.hard = A.hardBlock();
  ART.pipe = A.pipe(48, GY - PIPE.top);
  ART.coins = Array.from({ length: 8 }, (_, i) => A.coin(Math.cos((i / 8) * Math.PI)));
  ART.castle = A.castle(CASTLE.w);
  ART.cabaldFlag = A.flag('#3b1d5e', ART.baldHead);
  ART.remyFlag = A.flag('#d8322c', ART.heroHead);
  ART.clouds = [0, 1, 2, 3, 4].map((i) => A.cloud(i * 17 + 3, 90 + i * 22));
  ART.bushes = [0, 1, 2].map((i) => A.bush(i * 5 + 1, 56 + i * 20));
  ART.tonic = tonicSprite();
  ART.low = A.canvas(LW, LH);
}

function tonicSprite() {
  const c = A.canvas(16, 22), x = c.getContext('2d');
  const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  R(5, 0, 6, 4, '#8a5a2c'); R(6, 1, 4, 2, '#c08850');
  R(4, 4, 8, 3, '#1a1228'); R(5, 4, 6, 3, '#d8f4ff');
  R(1, 7, 14, 15, '#1a1228'); R(2, 8, 12, 13, '#d8f4ff');
  R(3, 11, 10, 9, '#42e86a'); R(3, 11, 10, 2, '#a6ffb4'); R(4, 14, 3, 4, '#c8ffd2');
  R(5, 15, 6, 3, '#ffd34a'); R(6, 16, 4, 1, '#c87810');
  return c;
}

// ---------- helpers ----------
const fill = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), w, h); };
function text(x, s, a, b, { size = 16, color = '#fff', shadow = '#1a1228', align = 'left', alpha = 1 } = {}) {
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
function star4(x, cx, cy, r, col) {
  fill(x, col, cx - r, cy, r * 2 + 1, 1);
  fill(x, col, cx, cy - r, 1, r * 2 + 1);
  if (r > 2) fill(x, col, cx - 1, cy - 1, 3, 3);
}

// ---------- event-driven particles (analytic, pure in g) ----------
const P = [];
const ev = (g, kind, x, y, extra = {}) => P.push({ g, kind, x, y, seed: P.length * 13 + 7, ...extra });
// landings / takeoffs
for (const j of JUMPS) {
  if (j.t0 > 0.5 && j.y0 >= GY - 150) ev(j.t0, 'dust', heroX(j.t0), j.y0, { n: 3, s: 0.7 });
  const onEnemy = ENEMIES.some((e) => Math.abs(e.gh - j.t1) < 1e-6);
  if (!onEnemy && j.t1 !== 10.2) ev(j.t1, 'dust', heroX(j.t1), j.y1, { n: 6, s: 1 });
}
for (const e of ENEMIES) {
  const p = enemyAt(e, e.gh), head = p.feet - EH;
  if (e.death === 'stomp') { ev(e.gh, 'stars', p.x, head + 4); ev(e.gh, 'ring', p.x, head + 8); if (e.kind !== 'para') ev(e.gh + 0.42, 'puff', p.x, p.feet - 8); }
  else if (e.death === 'fire') { ev(e.gh, 'boom', p.x - 14, p.feet - 30); ev(e.gh, 'stars', p.x, p.feet - 40); }
  else { ev(e.gh, 'stars', p.x - 10, p.feet - 30, { big: true }); ev(e.gh, 'ring', p.x - 16, p.feet - 20); }
  if (e.kind === 'para') ev(e.gh, 'feathers', p.x, p.feet - 50);
}
for (const b of BRICKS) if (b.smash) { ev(BRICK_G, 'shards', b.x, b.bottom - 12); ev(BRICK_G, 'puff', b.x, b.bottom - 12); }
ev(Q1.hit + 0.5, 'sparkle', Q1.x, Q1.bottom - 80);
for (const c of PIT_COINS) ev(c.g, 'sparkle', c.x, c.y);
ev(POWER_G, 'burst', heroX(POWER_G), heroY(POWER_G) - 50);
ev(KICK_G, 'stars', SHELL_REST - 14, GY - 22);
ev(SHELL_CRASH, 'boom', STAIR_X - 14, GY - 20, { big: true });
ev(SHELL_CRASH, 'stars', STAIR_X - 14, GY - 24, { big: true });
ev(10.2, 'sparkle', POLE.x, SLIDE.y0 - 90);
ev(10.2, 'ring', POLE.x, SLIDE.y0 - 60);
FIREWORKS.forEach((g, i) => ev(g, 'firework', CASTLE.x + CASTLE.w / 2 + [-150, 140, -20][i], [190, 160, 130][i], { hue: i }));

const SHOOK = [];
for (const e of ENEMIES) SHOOK.push([e.gh, e.death === 'shell' ? 3 : 4]);
SHOOK.push([BRICK_G, 5], [KICK_G, 3], [SHELL_CRASH, 7], [10.2, 4], [POWER_G, 2], ...FIREWORKS.map((g) => [g, 2]));

function drawParticles(x, g, cam) {
  for (const p of P) {
    const age = g - p.g;
    if (age < 0 || age > 1.6) continue;
    const r = (k) => hash(p.seed * 31 + k);
    const sx = p.x - cam, sy = p.y;
    if (sx < -200 || sx > LW + 200) continue;
    switch (p.kind) {
      case 'dust': {
        if (age > 0.4) break;
        for (let i = 0; i < p.n; i++) {
          const dir = i % 2 ? 1 : -1, sp = (30 + 50 * r(i)) * p.s, u = age / 0.4;
          const px = sx + dir * sp * age * 1.6 * (1 - u * 0.5), py = sy - 3 - 18 * age * r(i + 9);
          const rad = Math.round((2 + 4 * u) * p.s);
          x.globalAlpha = 1 - u;
          x.fillStyle = u < 0.5 ? '#ffffff' : '#e6eef8';
          x.beginPath(); x.arc(Math.round(px), Math.round(py), rad, 0, 7); x.fill();
        }
        x.globalAlpha = 1;
        break;
      }
      case 'stars': {
        if (age > 0.35) break;
        const u = age / 0.35, n = p.big ? 8 : 6;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + r(1), d = (p.big ? 46 : 30) * Math.sqrt(u);
          star4(x, Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d * 0.7), Math.round(3 * (1 - u)) + 1, i % 2 ? '#fff6a0' : '#ffffff');
        }
        if (age < 0.06) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(sx, sy, p.big ? 16 : 11, 0, 7); x.fill(); }
        break;
      }
      case 'ring': {
        if (age > 0.25) break;
        const u = age / 0.25;
        x.strokeStyle = '#ffffff'; x.globalAlpha = 1 - u; x.lineWidth = 2;
        x.beginPath(); x.ellipse(sx, sy, 8 + 40 * u, 3 + 12 * u, 0, 0, 7); x.stroke();
        x.globalAlpha = 1;
        break;
      }
      case 'puff': {
        if (age > 0.45) break;
        const u = age / 0.45;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2, d = 6 + 22 * u;
          x.globalAlpha = 1 - u;
          x.fillStyle = i % 2 ? '#ffffff' : '#dfe8f5';
          x.beginPath(); x.arc(Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d * 0.7 - 10 * u), Math.round(7 * (1 - u * 0.6)), 0, 7); x.fill();
        }
        x.globalAlpha = 1;
        break;
      }
      case 'boom': {
        if (age > 0.4) break;
        const u = age / 0.4, R = (p.big ? 34 : 22) * Math.sqrt(u);
        const cols = ['#ffffff', '#fff1a0', '#ffb43a', '#ff5a2a', '#7a2a2a'];
        x.fillStyle = cols[Math.min(4, Math.floor(u * 5))];
        x.beginPath(); x.arc(sx, sy, R, 0, 7); x.fill();
        if (u > 0.25) { x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(sx, sy, R * (u - 0.2) * 1.2, 0, 7); x.fill(); x.globalCompositeOperation = 'source-over'; }
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * 6.283 + r(i), d = R * 1.6;
          fill(x, '#ffd34a', sx + Math.cos(a) * d, sy + Math.sin(a) * d, 2, 2);
        }
        break;
      }
      case 'feathers': {
        for (let i = 0; i < 6; i++) {
          const vx = (r(i) - 0.5) * 80, fx = sx + vx * age + Math.sin(age * 9 + i) * 6, fy = sy + age * 70 - 30 * Math.exp(-age * 6) * r(i + 4);
          x.globalAlpha = clamp01(1.4 - age);
          fill(x, '#ffffff', fx, fy, 4, 2); fill(x, '#b8c8e0', fx, fy + 2, 4, 1);
        }
        x.globalAlpha = 1;
        break;
      }
      case 'shards': {
        for (let i = 0; i < 4; i++) {
          const dir = i % 2 ? 1 : -1, up = i < 2 ? 1 : 0.6;
          const vx = dir * (70 + 30 * r(i)), vy = -380 * up;
          const fx = sx + dir * 6 + vx * age, fy = sy + (i < 2 ? -6 : 6) + vy * age + 0.5 * 1500 * age * age;
          if (fy > LH + 20) continue;
          x.save(); x.translate(Math.round(fx), Math.round(fy)); x.rotate(Math.floor(age * 14 * dir) * (Math.PI / 2));
          fill(x, '#4a1c0c', -6, -6, 12, 12); fill(x, '#c8622c', -5, -5, 10, 10); fill(x, '#f09456', -5, -5, 10, 3);
          x.restore();
        }
        break;
      }
      case 'sparkle': {
        if (age > 0.4) break;
        const u = age / 0.4;
        for (let i = 0; i < 4; i++) {
          const a = i * 1.57 + 0.6, d = 6 + 18 * u;
          star4(x, Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d), Math.round(4 * (1 - u)), '#fffbe0');
        }
        break;
      }
      case 'burst': {
        if (age > 0.6) break;
        const u = age / 0.6;
        x.save();
        x.globalAlpha = 1 - u;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * 6.283 + u * 0.6, d0 = 30 + 200 * u, d1 = d0 + 30 + 40 * (1 - u);
          x.strokeStyle = i % 2 ? '#ffe27a' : '#ffffff'; x.lineWidth = 3;
          x.beginPath(); x.moveTo(sx + Math.cos(a) * d0, sy + Math.sin(a) * d0); x.lineTo(sx + Math.cos(a) * d1, sy + Math.sin(a) * d1); x.stroke();
        }
        x.restore();
        break;
      }
      case 'firework': {
        const rise = 0.28;
        const cols = [['#ff5a8a', '#ffd0e0'], ['#5ad8ff', '#d8f6ff'], ['#ffd34a', '#fff6c8']][p.hue];
        if (age < rise) {
          const fy = LH - 80 - (LH - 80 - sy) * (1 - (1 - age / rise) ** 2);
          fill(x, '#fff6c8', sx - 1, fy, 3, 5);
          for (let k = 1; k < 5; k++) fill(x, '#ffb43a', sx, fy + k * 5, 1, 2);
          break;
        }
        const a2 = age - rise;
        if (a2 > 1.1) break;
        const u = a2 / 1.1;
        if (a2 < 0.07) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(sx, sy, 26 * (1 - a2 / 0.07) + 6, 0, 7); x.fill(); }
        if (a2 < 0.25) { const gl = x.createRadialGradient(sx, sy, 0, sx, sy, 90); gl.addColorStop(0, cols[1]); gl.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = 0.5 * (1 - a2 / 0.25); x.fillStyle = gl; x.fillRect(sx - 90, sy - 90, 180, 180); x.globalAlpha = 1; }
        for (const [ring, n, spd] of [[0, 56, 210], [1, 34, 120], [2, 18, 55]]) {
          for (let i = 0; i < n; i++) {
            const a = (i / n) * 6.283 + ring * 0.14, sp = spd * (0.85 + 0.15 * r(i + ring * 50));
            const d = sp * (1 - Math.exp(-a2 * 4)) / 1.6;
            const fx = sx + Math.cos(a) * d, fy = sy + Math.sin(a) * d + 40 * a2 * a2;
            const tw = u > 0.55 && hash(i * 7 + Math.floor(a2 * 30)) > 0.6 ? 0 : 1;
            x.globalAlpha = (1 - u * u) * tw;
            const c = ring ? cols[1] : cols[0];
            fill(x, c, fx - 2, fy - 2, 4, 4);
            for (let k = 1; k <= 3; k++) {
              x.globalAlpha = (1 - u * u) * tw * (0.6 - k * 0.15);
              const dk = sp * (1 - Math.exp(-(a2 - k * 0.025) * 4)) / 1.6;
              fill(x, c, sx + Math.cos(a) * dk - 1, sy + Math.sin(a) * dk + 40 * a2 * a2 - 1, 2, 2);
            }
          }
        }
        x.globalAlpha = 1;
        break;
      }
    }
  }
}

// ---------- hero ----------
function heroPose(g, stop, sl) {
  const big = isBig(g);
  const R = big ? ART.heroB : ART.heroS, H = big ? BIG_H : SMALL_H;
  const v = heroSpeed(g), j = jumpAt(g), x = heroX(g);
  let y = heroY(g);
  const o = { lift: [0, 0], stride: [0, 0], lean: 0, sx: 1, sy: 1 };
  const k = big ? 1.4 : 1;
  if (j && g >= 0.45) {
    const up = g < j.ta;
    o.lift = up ? [Math.round(7 * k), Math.round(2 * k)] : [Math.round(3 * k), Math.round(6 * k)];
    o.stride = [-1, 1];
    o.lean = 0.05;
    const st = clamp01(1 - (g - j.t0) / 0.12);
    o.sy = 1 + 0.1 * st; o.sx = 1 - 0.08 * st;
  } else if (g >= SLIDE.t0 && g < 10.85) {
    o.lift = [4, 4];
    o.flip = g >= POLE_FLIP_G;
  } else if (v > 20) {
    const ph = (x / (big ? 46 : 36)) * Math.PI * 2, s = Math.sin(ph);
    o.lift = [Math.round(Math.max(0, s) * 6 * k), Math.round(Math.max(0, -s) * 6 * k)];
    o.stride = [Math.round(s * 2), Math.round(-s * 2)];
    y -= Math.round(Math.abs(Math.cos(ph)) * 2 * k);
    o.lean = Math.min(1, v / 380) * 0.07;
  }
  // landing squash
  for (const jj of JUMPS) {
    const d = g - jj.t1;
    if (d >= 0 && d < 0.12) { const s = Math.sin((d / 0.12) * Math.PI); o.sy = 1 - 0.14 * s; o.sx = 1 + 0.12 * s; }
  }
  return { R, H, x, y, o, big };
}

function drawHero(x, g, stop, sl, cam, ts) {
  const pz = heroPose(g, stop, sl);
  let { R, x: hx, y, o } = pz;
  const sx = hx - cam;
  // after-images on the flag leap
  if (g > 9.62 && g < 10.2) {
    for (let i = 3; i >= 1; i--) {
      const gg = g - i * 0.035;
      A.drawRemy(x, R, heroX(gg) - cam, heroY(gg), { ...o, white: true, alpha: 0.18 * (4 - i) / 3 });
    }
  }
  if (stop?.kind === 'power') {
    // SMB-style growth flicker: small / big alternate, white flashes
    const step = Math.floor(sl / 0.055);
    const bigNow = sl > 0.42 || step % 2 === 1;
    const RR = bigNow ? ART.heroB : ART.heroS;
    A.drawRemy(x, RR, sx, y, { white: step % 3 === 0 && sl < 0.42, glow: '#ffd34a', glowA: 0.5 + 0.5 * Math.sin(sl * 40) });
    return;
  }
  if (pz.big) {
    o.glow = '#ffcf3a';
    o.glowA = 0.35 + 0.25 * Math.sin(g * 18);
    // aura embers trail from the hair
    for (let i = Math.floor((g - 0.5) / 0.03); i <= Math.floor(g / 0.03); i++) {
      const gs = i * 0.03;
      if (gs < POWER_G) continue;
      const age = g - gs;
      if (age < 0) continue;
      const ex = heroX(gs) - cam + (hash(i * 7) - 0.5) * 34, ey = heroY(gs) - BIG_H + 8 + (hash(i * 7 + 1) - 0.2) * 20 - age * 70;
      x.globalAlpha = clamp01(1 - age / 0.5);
      fill(x, hash(i * 3) > 0.5 ? '#ffe27a' : '#ffffff', ex, ey, 2, 2);
    }
    x.globalAlpha = 1;
  }
  // footstep dust while sprinting on the ground
  for (let i = Math.floor((g - 0.3) / 0.11); i <= Math.floor(g / 0.11); i++) {
    const gs = i * 0.11, age = g - gs;
    if (gs < 0.9 || age < 0 || jumpAt(gs) || heroSpeed(gs) < 300 || heroY(gs) < GY - 1) continue;
    const u = age / 0.3, fx = heroX(gs) - cam - 14 - age * 30, fy = GY - 3 - age * 14;
    x.globalAlpha = 0.8 * (1 - u);
    x.fillStyle = '#ffffff';
    x.beginPath(); x.arc(Math.round(fx), Math.round(fy), Math.round(2 + 4 * u), 0, 7); x.fill();
  }
  x.globalAlpha = 1;
  if (g >= 11.6) return drawHeroInDoor(x, R, sx, y, o, g, cam);
  A.drawRemy(x, R, sx, y, o);
}
function drawHeroInDoor(x, R, sx, y, o, g, cam) {
  const dx = DOOR_X - cam;
  x.save();
  x.beginPath(); x.rect(dx - 22, GY - 70, 44, 70); x.clip();
  A.drawRemy(x, R, sx, y, { ...o, alpha: clamp01(1 - (g - 11.6) / 0.35) });
  x.restore();
}

// ---------- enemies ----------
function drawEnemies(x, g, cam) {
  for (const e of ENEMIES) {
    const R = ART.enemies[e.spr];
    const p = enemyAt(e, g);
    const sx = p.x - cam;
    if (sx < -120 || sx > LW + 120) continue;
    if (g < e.gh) {
      const step = Math.floor(g / 0.18) % 2;
      const o = { flip: step === 1, lift: step ? [3, 0] : [0, 3] };
      if (e.kind === 'para') {
        const flap = Math.sin(g * 30);
        drawWings(x, sx, p.feet - 50, flap);
        o.lift = [4, 4];
      }
      A.drawRemy(x, R, sx, p.feet + (step ? 0 : -1), o);
      continue;
    }
    const dt = g - e.gh;
    if (e.death === 'stomp') {
      if (e.kind === 'para') continue; // becomes the shell
      if (dt < 0.42) A.drawRemy(x, R, sx, p.feet, { sy: 0.3, sx: 1.3, white: dt < 0.04 });
      continue;
    }
    const vx = e.death === 'shell' ? 140 : 90, vy = e.death === 'shell' ? 480 : 380;
    const fy = p.feet - (vy * dt - 0.5 * 2000 * dt * dt);
    if (fy > LH + 140) continue;
    A.drawRemy(x, R, sx + vx * dt, fy, { upside: true, white: dt < 0.05, lift: [3, 3] });
  }
}
function drawWings(x, cx, cy, flap) {
  for (const s of [-1, 1]) {
    const a = flap * 0.7;
    x.save(); x.translate(Math.round(cx + s * 20), Math.round(cy)); x.scale(s, 1); x.rotate(-0.5 + a);
    fill(x, '#1a1228', 0, -8, 22, 12);
    fill(x, '#ffffff', 1, -7, 20, 10);
    fill(x, '#d8e4f4', 1, -1, 20, 4);
    fill(x, '#1a1228', 8, -1, 1, 4); fill(x, '#1a1228', 14, -1, 1, 4);
    x.restore();
  }
}

// ---------- world ----------
function drawBlock(x, b, g, cam, art, hit) {
  const sx = b.x - 12 - cam;
  if (sx < -30 || sx > LW + 30) return;
  let dy = 0;
  if (hit != null && g >= hit && g < hit + 0.14) dy = -Math.round(9 * Math.sin(((g - hit) / 0.14) * Math.PI));
  x.drawImage(art, Math.round(sx), b.bottom - 24 + dy);
}

function drawWorld(x, g, cam, ts) {
  // sky + parallax
  x.drawImage(ART.sky, 0, 0);
  x.drawImage(ART.mountains, -Math.round(cam * 0.12), 168);
  const cl = [[60, 70, 0], [330, 40, 3], [610, 96, 1], [880, 52, 4], [1180, 84, 2], [1460, 36, 0], [1760, 76, 3], [2040, 50, 1]];
  for (const [cx, cy, i] of cl) {
    const span = 2200;
    const px = ((cx - cam * 0.25 - g * 8) % span + span) % span - 200;
    x.drawImage(ART.clouds[i], Math.round(px), cy);
  }
  x.drawImage(ART.hills, -Math.round(cam * 0.45), GY - 150);
  // dusk falls for the fireworks
  const dusk = clamp01((g - 10.95) / 0.45);
  if (dusk > 0) {
    x.fillStyle = `rgba(22,14,64,${0.62 * dusk})`;
    x.fillRect(0, 0, LW, GY + 20);
    x.fillStyle = `rgba(255,120,80,${0.18 * dusk})`;
    x.fillRect(0, GY - 90, LW, 110);
    for (let i = 0; i < 60; i++) {
      if (hash(i + 900) > dusk) continue;
      x.globalAlpha = dusk * (Math.sin(g * 6 + i) > 0.3 ? 1 : 0.5);
      fill(x, '#ffffff', Math.floor(hash(i + 700) * LW), Math.floor(hash(i + 800) * 260) + 60, 1, 1);
    }
    x.globalAlpha = 1;
  }
  // bushes on the ground (behind props)
  for (let i = 0; i < 14; i++) {
    const bx = 260 + i * 290 + hash(i + 40) * 120, b = ART.bushes[i % 3];
    if (bx > PIT.l - 80 && bx < PIT.r + 20) continue;
    if (bx > STAIR_X - 80) continue;
    const sx = bx - cam;
    if (sx > -100 && sx < LW + 20) x.drawImage(b, Math.round(sx), GY - b.height + 1);
  }
  // castle
  const csx = CASTLE.x - cam;
  if (csx < LW + 20) {
    x.drawImage(ART.castle, Math.round(csx), GY - ART.castle.height);
    if (dusk > 0) {
      x.fillStyle = `rgba(255,196,96,${dusk})`;
      for (const [wx, wy, ww, wh] of [[CASTLE.w / 2 - 8, 26, 16, 26], [30, 110, 14, 24], [CASTLE.w - 44, 110, 14, 24]]) {
        const ox = Math.round(csx + wx), oy = GY - ART.castle.height + wy;
        x.beginPath(); x.arc(ox + ww / 2, oy + ww / 2, ww / 2 - 1, Math.PI, 0); x.lineTo(ox + ww - 1, oy + wh - 1); x.lineTo(ox + 1, oy + wh - 1); x.fill();
      }
    }
    // castle flag
    const fr = clamp01((g - FLAG_RISE.t0) / (FLAG_RISE.t1 - FLAG_RISE.t0));
    const px = Math.round(csx + CASTLE.w / 2), top = GY - ART.castle.height - 56;
    fill(x, '#1a1228', px - 2, top, 4, 56); fill(x, '#e8e8f0', px - 1, top, 2, 56);
    if (fr > 0) { x.save(); x.translate(px + 2 + ART.remyFlag.width, Math.round(top + 40 - 38 * fr) - 6); x.scale(-1, 1); x.drawImage(ART.remyFlag, 0, 0); x.restore(); }
  }
  // the pit: a dark shaft between the ground edges
  const pl = PIT.l - cam, pr = PIT.r - cam;
  if (pr > 0 && pl < LW) {
    const gr = x.createLinearGradient(0, GY, 0, LH);
    gr.addColorStop(0, '#2a1838'); gr.addColorStop(1, '#07040c');
    x.fillStyle = gr; x.fillRect(Math.round(pl), GY + 6, PIT.r - PIT.l, LH - GY);
  }
  // ground
  x.drawImage(ART.ground, -Math.round(cam), GY);
  // pipe
  const psx = PIPE.x - 27 - cam;
  return psx;
}

function drawProps(x, g, cam) {
  // ? blocks
  for (const [b, item] of [[Q1, 'coin'], [Q2, 'tonic']]) {
    const art = g >= b.hit ? ART.used : ART.q[Math.floor((g * 6) % 4) === 3 ? 3 : Math.floor((g * 6) % 4) === 2 ? 2 : Math.floor(g * 6) % 2];
    drawBlock(x, b, g, cam, art, b.hit);
    if (item === 'coin' && g >= b.hit && g < b.hit + 0.5) {
      const u = (g - b.hit) / 0.5, cy = b.bottom - 24 - 90 * Math.sin(u * Math.PI * 0.85);
      x.drawImage(ART.coins[Math.floor(g * 40) % 8], Math.round(b.x - 8 - cam), Math.round(cy - 18));
    }
    if (item === 'tonic' && g >= b.hit + 0.03 && g < POWER_G) {
      const u = (g - b.hit - 0.03) / (POWER_G - b.hit - 0.03);
      const tx = b.x + (heroX(POWER_G) - b.x) * u, ty = (b.bottom - 34) + (heroY(POWER_G) - SMALL_H - 4 - (b.bottom - 34)) * u - 70 * Math.sin(u * Math.PI);
      x.save(); x.translate(Math.round(tx - cam), Math.round(ty)); x.rotate(Math.sin(g * 20) * 0.2);
      x.globalAlpha = 0.5; x.fillStyle = '#9dffb0'; x.beginPath(); x.arc(0, 0, 16 + 3 * Math.sin(g * 30), 0, 7); x.fill(); x.globalAlpha = 1;
      x.drawImage(ART.tonic, -8, -11);
      x.restore();
    }
  }
  // bricks
  for (const b of BRICKS) if (!(b.smash && g >= BRICK_G)) drawBlock(x, b, g, cam, ART.brick, b.smash ? null : BRICK_G);
  // pit coins
  for (const c of PIT_COINS) if (g < c.g) x.drawImage(ART.coins[Math.floor(g * 14 + c.x) % 8], Math.round(c.x - 8 - cam), Math.round(c.y - 9 + Math.sin(g * 5 + c.x) * 2));
  // stairs
  STAIR_COLS.forEach((n, i) => {
    const sx = STAIR_X + i * TILE - cam;
    if (sx < -30 || sx > LW + 30) return;
    for (let k = 0; k < n; k++) x.drawImage(ART.hard, Math.round(sx), GY - (k + 1) * TILE);
  });
  // flag pole
  const px = Math.round(POLE.x - cam);
  if (px > -40 && px < LW + 60) {
    fill(x, '#1a1228', px - 3, POLE.top, 6, POLE.base - POLE.top);
    fill(x, '#c8d0dc', px - 2, POLE.top, 4, POLE.base - POLE.top);
    fill(x, '#ffffff', px - 1, POLE.top, 1, POLE.base - POLE.top);
    x.fillStyle = '#1a1228'; x.beginPath(); x.arc(px, POLE.top - 4, 7, 0, 7); x.fill();
    x.fillStyle = '#3ad04a'; x.beginPath(); x.arc(px, POLE.top - 4, 6, 0, 7); x.fill();
    fill(x, '#b4ffb0', px - 3, POLE.top - 8, 2, 2);
    x.drawImage(ART.hard, px - 12, POLE.base);
    const fu = g < SLIDE.t0 ? 0 : clamp01((g - SLIDE.t0) / (SLIDE.t1 - SLIDE.t0));
    const fy = POLE.top + 6 + (POLE.base - 40 - POLE.top - 6) * fu * fu * (3 - 2 * fu);
    x.drawImage(ART.cabaldFlag, px - 3 - ART.cabaldFlag.width, Math.round(fy));
  }
}

function drawPipe(x, cam) {
  x.drawImage(ART.pipe, Math.round(PIPE.x - 27 - cam), PIPE.top);
}

function drawShots(x, g, cam) {
  // fireballs
  FIRE_T.forEach((tf, i) => {
    const f = fireball(i, g);
    if (!f.live) return;
    for (let k = 1; k <= 5; k++) {
      const p = fireball(i, g - k * 0.012);
      x.globalAlpha = 0.5 - k * 0.08;
      fill(x, k < 3 ? '#ffd34a' : '#ff6a2a', p.x - cam - 2, p.y - 2, 4, 4);
    }
    x.globalAlpha = 1;
    const fx = Math.round(f.x - cam), fy = Math.round(f.y), rot = Math.floor(g * 24) % 4;
    x.fillStyle = '#7a1a0a'; x.beginPath(); x.arc(fx, fy, 7, 0, 7); x.fill();
    x.fillStyle = '#ff5a1a'; x.beginPath(); x.arc(fx, fy, 6, 0, 7); x.fill();
    x.fillStyle = '#ffc23a'; x.beginPath(); x.arc(fx + (rot % 2 ? 1 : -1), fy - 1, 4, 0, 7); x.fill();
    fill(x, '#fff6c8', fx - 1 + (rot > 1 ? 1 : 0), fy - 2, 2, 2);
  });
  // throw flash at the hand
  for (const tf of FIRE_T) if (g >= tf && g < tf + 0.06) star4(x, Math.round(heroX(tf) + 26 - cam), GY - 54, 5, '#fff6c8');
  // shell
  const s = shell(g);
  if (s) {
    const sx = Math.round(s.x - cam);
    if (s.spin) for (let k = 1; k <= 4; k++) { x.globalAlpha = 0.25 - k * 0.05; x.drawImage(ART.shellHead, sx - 26 - k * 12, Math.round(s.y - 44)); }
    x.globalAlpha = 1;
    x.save(); x.translate(sx, Math.round(s.y - 22));
    x.rotate(Math.round(s.spin * 4 / Math.PI) * (Math.PI / 4));
    x.drawImage(ART.shellHead, -26, -22);
    x.restore();
  }
}

function drawPopups(x, g, cam) {
  const pops = [];
  for (const e of ENEMIES) { const p = enemyAt(e, e.gh); pops.push([e.gh, p.x, p.feet - EH - 14, e.pts, e.pts === '1UP' ? '#6dff6a' : '#ffffff']); }
  pops.push([Q1.hit + 0.5, Q1.x, Q1.bottom - 110, '200', '#ffffff']);
  pops.push([POWER_G + 0.05, heroX(POWER_G), heroY(POWER_G) - BIG_H - 30, '1000', '#ffffff']);
  pops.push([10.2, POLE.x + 34, SLIDE.y0 - 120, '5000', '#ffe27a']);
  for (const [t, px, py, s, col] of pops) {
    const a = g - t;
    if (a < 0 || a > 0.75) continue;
    text(x, s, px - cam, py - 40 * Math.sqrt(a / 0.75), { size: 16, align: 'center', color: col, alpha: clamp01((0.75 - a) / 0.15) });
  }
}

function drawClear(x, g) {
  const t0 = 10.9;
  if (g < t0) return;
  const s = 'COURSE CLEAR!', size = 32, cw = size, x0 = LW / 2 - (s.length * cw) / 2;
  for (let i = 0; i < s.length; i++) {
    const a = g - t0 - i * 0.035;
    if (a < 0) continue;
    const dy = a < 0.25 ? -60 * (1 - a / 0.25) ** 2 + 10 * Math.sin((a / 0.25) * Math.PI) : 0;
    const hue = ['#ffe27a', '#ffffff', '#ff8ab0', '#8ae8ff'][Math.floor(g * 12 + i) % 4];
    text(x, s[i], x0 + i * cw, 84 + dy, { size, color: a < 0.5 ? '#ffffff' : hue, shadow: '#1a1228' });
  }
  if (g > 11.25) text(x, 'THE CABALD HAS FALLEN', LW / 2, 130, { size: 16, align: 'center', color: '#ff8ab0', alpha: clamp01((g - 11.25) / 0.1) });
}

function drawHud(x, g) {
  const sc = String(hudScore(g)).padStart(7, '0');
  text(x, 'REMY', 40, 18, { size: 16 });
  text(x, sc, 40, 40, { size: 16 });
  x.drawImage(ART.coins[Math.floor(g * 10) % 8], 232, 39);
  text(x, '×' + String(hudCoins(g)).padStart(2, '0'), 252, 40, { size: 16 });
  x.drawImage(ART.baldHead, 380, 38);
  text(x, 'CABALD', 380, 18, { size: 16, color: '#ffb0c8' });
  const kills = hudKills(g);
  text(x, '×' + String(kills).padStart(2, '0'), 400, 40, { size: 16 });
  text(x, 'WORLD', 590, 18, { size: 16 });
  text(x, ' 1-1', 590, 40, { size: 16 });
  text(x, 'TIME', 800, 18, { size: 16 });
  text(x, String(hudTime(g)).padStart(4, ' '), 800, 40, { size: 16 });
}

// Shot-local draw: returns the low-res canvas for film.js to upscale.
export function drawLevel(lt) {
  const { g, stop, sl } = warp(lt);
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  // screen shake (keeps running through hit-stops: real time)
  let shx = 0, shy = 0;
  for (const [ge, amp] of SHOOK) {
    const d = lt - (filmT(ge) - INTRO);
    if (d < 0 || d > 0.3) continue;
    const k = amp * Math.exp(-d * 16);
    shx += k * Math.sin(d * 95 + ge * 10);
    shy += k * Math.cos(d * 77 + ge * 7);
  }
  const cam = Math.round(camX(g));
  x.save();
  x.translate(Math.round(shx), Math.round(shy));
  drawWorld(x, g, cam, lt);
  if (g < 0.5) { drawHero(x, g, stop, sl, cam, lt); drawPipe(x, cam); }
  else drawPipe(x, cam);
  drawProps(x, g, cam);
  drawEnemies(x, g, cam);
  if (g >= 0.5) drawHero(x, g, stop, sl, cam, lt);
  const dusk = clamp01((g - 10.95) / 0.45);
  if (dusk > 0) { x.fillStyle = `rgba(30,18,70,${0.32 * dusk})`; x.fillRect(-20, -20, LW + 40, LH + 40); }
  drawShots(x, g, cam);
  drawParticles(x, g, cam);
  // power-up freeze: dim the world around the hero
  if (stop?.kind === 'power') {
    const hx = heroX(g) - cam, hy = heroY(g) - 50;
    const a = Math.min(1, sl / 0.08) * Math.min(1, (stop.d - sl) / 0.1) * 0.55;
    x.save();
    x.globalAlpha = a;
    x.fillStyle = '#0b0820';
    const hr = 70 + 6 * Math.sin(sl * 50);
    x.beginPath(); x.rect(-20, -20, LW + 40, LH + 40); x.moveTo(hx + hr, hy); x.arc(hx, hy, hr, 0, 7, true); x.fill('evenodd');
    x.restore();
    drawHero(x, g, stop, sl, cam, lt);
    text(x, 'SUPER HAIR!', hx, hy - 110, { size: 16, align: 'center', color: '#ffe27a', alpha: Math.min(1, sl / 0.1) });
  }
  drawPopups(x, g, cam);
  drawClear(x, g);
  x.restore();
  drawHud(x, g);
  // iris in / out
  const irisIn = clamp01(lt / 0.45), irisOut = clamp01((g - IRIS_OUT.t0) / (IRIS_OUT.t1 - IRIS_OUT.t0));
  let rad = null, cx = 0, cy = 0;
  if (irisIn < 1) { rad = 12 + 640 * irisIn * irisIn; cx = PIPE.x - cam; cy = 400; }
  if (irisOut > 0) { rad = 640 * (1 - irisOut) ** 2; cx = CASTLE.x + CASTLE.w / 2 - cam; cy = GY - 120; }
  if (rad != null) {
    x.fillStyle = '#000';
    x.beginPath(); x.rect(0, 0, LW, LH); x.moveTo(cx + Math.max(0, rad), cy); x.arc(cx, cy, Math.max(0, rad), 0, 7, true); x.fill('evenodd');
  }
  if (g >= IRIS_OUT.t1) { x.fillStyle = '#000'; x.fillRect(0, 0, LW, LH); }
  return { low: ART.low, g, stop };
}
export { ART, text };
