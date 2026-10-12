// GALAREMY, drawn at a native 960×540 into a low-res canvas (upscaled 2× nearest by film.js).
// A vertical 520 px playfield sits between two cabinet side panels (scores, stage badges, pilot cam).
import { hash } from 'filmkit/lib.js';
import * as A from './art.js';
import {
  LW, LH, PX0, PX1, PCX, SHIP_Y, MUZZLE, BV, DUAL_DX, INTRO, STOPS, warp, filmT, G_END, B, HOVER,
  ENEMIES, CHAL, enemyPos, enemyAngle, byName, SHOTS, HITS, PELLETS, pelletPos, heroX, heroY, heroVisible, isDual,
  captive, bossPos, jawOpen, coreAt, BOSS_HITS, BOSS_HP, bossHp, SAUCER_DY, CORE_DY, POD_DX, POD_DY,
  POPS, hudScore, shotsFired, hitsMade, kills, lives, HISCORE, TALLY_BONUS,
} from './choreo.js';

export const FONT = '"Press Start 2P"';
export const ART = {};
const PW = PX1 - PX0;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (u) => u * u * (3 - 2 * u);
const fill = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), w, h); };

export async function prepareGame() {
  const atlas = await A.loadHeads();
  ART.heroHead = A.headIcon(atlas, 42, 1);
  ART.heroHead2 = A.headIcon(atlas, 42, 2);
  ART.ship = A.shipSprite(ART.heroHead);
  ART.shipWhite = A.silhouette(ART.ship);
  ART.shipRed = A.tinted(ART.ship, '#ff1a4a', 0.5);
  ART.shipGlow = A.silhouette(ART.ship, '#ffd27a');
  ART.shipMini = A.scaled(ART.ship, 0.5);
  ART.en = {};
  ART.head2 = {};
  for (const e of ENEMIES) {
    const head = A.headIcon(atlas, e.head, 1);
    ART.head2[e.id] = A.headIcon(atlas, e.head, 2);
    const fr = [0, 1].map((f) => A.enemySprite(e.type, head, f));
    const hurt = e.type === 'boss' ? [0, 1].map((f) => A.enemySprite(e.type, head, f, true)) : null;
    ART.en[e.id] = { fr, hurt, white: fr.map((c) => A.silhouette(c)) };
  }
  const leg = (t, h) => [0, 1].map((f) => A.enemySprite(t, A.headIcon(atlas, h, 1), f));
  ART.legend = { zako: leg('zako', 419), goei: leg('goei', 233), boss: leg('boss', 98) };
  ART.giant = A.giantHead(await A.loadSprite(5));
  ART.giant.red = A.tinted(ART.giant.head, '#ff2a2a', 1);
  ART.saucer = A.saucer();
  ART.door = A.hatchDoor();
  ART.nebula = A.nebula(LW, 1080);
  ART.planet = A.baldPlanet(46);
  ART.badges = ['#3ad8ff', '#ff4a6a', '#ffd23a'].map((c) => A.badge(c));
  ART.pilot = await A.loadSprite(42);
  ART.low = A.canvas(LW, LH);
}

// ---------- text ----------
export function text(x, s, a, b, { size = 16, color = '#fff', shadow = '#0c0a1a', align = 'left', alpha = 1 } = {}) {
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
const RAINBOW = ['#ff4a6a', '#ffd23a', '#6aff8a', '#3ad8ff', '#c87aff', '#ffffff'];
// letters drop in one by one and shimmer through the rainbow
function bounceText(x, s, cx, y, size, age, { cols = RAINBOW, step = 0.03, drop = 40 } = {}) {
  const cw = size, x0 = cx - (s.length * cw) / 2;
  for (let i = 0; i < s.length; i++) {
    const a = age - i * step;
    if (a < 0 || s[i] === ' ') continue;
    const dy = a < 0.2 ? -drop * (1 - a / 0.2) ** 2 + 6 * Math.sin((a / 0.2) * Math.PI) : 0;
    const col = a < 0.12 ? '#ffffff' : cols[Math.floor(age * 14 + i) % cols.length];
    text(x, s[i], x0 + i * cw, y + dy, { size, color: col });
  }
}

// ---------- stars + nebula (scroll distance integrated from a speed profile) ----------
function starSpeed(g) {
  let f = 1 + 11 * (1 - sm(clamp01(g / 0.7)));
  if (g > B.shipOut[0] + 0.15) f += 14 * sm(clamp01((g - B.shipOut[0] - 0.15) / 0.5));
  return f;
}
const DT = 1 / 240, NT = Math.ceil((G_END + 1) / DT) + 2, DIST = new Float64Array(NT);
for (let i = 1; i < NT; i++) DIST[i] = DIST[i - 1] + 0.5 * (starSpeed((i - 1) * DT) + starSpeed(i * DT)) * DT;
const dist = (g) => { const f = Math.max(0, g) / DT, i = Math.min(NT - 2, Math.floor(f)); return DIST[i] + (DIST[i + 1] - DIST[i]) * (f - i); };
const STAR_COLS = ['#ffffff', '#ff5a6a', '#ffd23a', '#5ae0ff', '#7aff8a', '#c87aff'];
const LAYERS = [
  { n: 150, v: 22, size: 1, a: 0.55, par: 0.02 },
  { n: 80, v: 60, size: 1, a: 0.85, par: 0.05 },
  { n: 34, v: 150, size: 2, a: 1, par: 0.1 },
].map((L, li) => ({ ...L, s: Array.from({ length: L.n }, (_, i) => ({ x: hash(li * 1000 + i) * LW, y: hash(li * 1000 + i + 500) * LH, c: STAR_COLS[Math.floor(hash(li * 77 + i * 3) * 6)], ph: hash(i * 9 + li) * 6.28 })) }));

export function drawSpace(x, g, ts, { title = false } = {}) {
  x.fillStyle = '#04030d';
  x.fillRect(0, 0, LW, LH);
  const D = title ? ts * 1.2 : dist(g), sp = title ? 1 : starSpeed(g);
  const camx = title ? 0 : (heroX(g) - PCX);
  // nebula: slow, tiles vertically
  const ny = ((D * 9) % 1080 + 1080) % 1080, nx = -camx * 0.015;
  x.globalAlpha = 0.85;
  x.drawImage(ART.nebula, Math.round(nx), Math.round(ny - 1080));
  x.drawImage(ART.nebula, Math.round(nx), Math.round(ny));
  x.globalAlpha = 1;
  // the bald planet drifts past
  const py = title ? 420 : 70 + D * 9, px = title ? 120 : 330 - camx * 0.03;
  x.globalAlpha = title ? 0.9 : 0.75;
  if (py < LH + 80) x.drawImage(ART.planet, Math.round(px - ART.planet.width / 2), Math.round(py - ART.planet.height / 2));
  x.globalAlpha = 1;
  for (const L of LAYERS) {
    for (const s of L.s) {
      const yy = ((s.y + D * L.v) % LH + LH) % LH, xx = ((s.x - camx * L.par) % LW + LW) % LW;
      const tw = 0.55 + 0.45 * Math.sin(ts * 9 + s.ph);
      x.globalAlpha = L.a * tw;
      x.fillStyle = s.c;
      const streak = Math.min(60, Math.round(L.size * (sp - 1) * L.v / 40));
      x.fillRect(Math.round(xx), Math.round(yy - streak), L.size, L.size + streak);
    }
  }
  x.globalAlpha = 1;
}

// ---------- events → particles ----------
const P = [];
const ev = (g, kind, px, py, extra = {}) => P.push({ g, kind, x: px, y: py, seed: P.length * 13 + 7, ...extra });
const SHOOK = [];
for (const h of HITS) {
  if (h.type === 'giant') {
    ev(h.gk, 'spark', h.x, h.y, { big: true });
    ev(h.gk, 'smoke', h.x + (hash(h.gk * 100) - 0.5) * 120, h.y - 150 - hash(h.gk * 77) * 40);
    SHOOK.push([h.gk, h.kill ? 9 : 4]);
    continue;
  }
  if (!h.kill) { ev(h.gk, 'spark', h.x, h.y); SHOOK.push([h.gk, 2]); continue; }
  const big = h.type === 'boss';
  ev(h.gk, 'pop', h.x, h.y, { big, hue: h.type === 'chal' ? 1 : 0 });
  ev(h.gk, 'debris', h.x, h.y, { id: h.e.id });
  if (big) ev(h.gk, 'ring', h.x, h.y, { r: 70 });
  SHOOK.push([h.gk, big ? 6 : 2.5]);
}
// release, dock, capture
{
  const p = enemyPos(byName('b1'), B.release - 1e-6);
  ev(B.release, 'sparkle', p.x, p.y - 40);
  ev(B.capture, 'ring', HOVER[0], SHIP_Y, { r: 50, col: '#7ae8ff' });
  SHOOK.push([B.capture, 3]);
  SHOOK.push([B.dock, 4]);
}
// final chain of explosions across the head, then the mega blast
const CHAIN = [];
for (let k = 0; k < 14; k++) {
  const t = B.final + 0.03 + k * (B.mega - B.final - 0.05) / 14;
  const p = bossPos(t), ox = (hash(k * 31 + 5) - 0.5) * 200, oy = (hash(k * 17 + 9) - 0.5) * 190 + 10;
  CHAIN.push([t, ox, oy]);
  ev(t, 'pop', p.x + ox, p.y + oy, { big: true, hue: k % 2 });
  SHOOK.push([t, 3]);
}
SHOOK.push([B.mega, 14]);
const MEGA = (() => { const p = bossPos(B.mega - 1e-4); return { x: p.x, y: p.y }; })();
ev(B.mega, 'mega', MEGA.x, MEGA.y);
for (let k = 0; k < 8; k++) ev(B.mega + 0.04 + k * 0.05, 'pop', MEGA.x + (hash(k * 3 + 400) - 0.5) * 300, MEGA.y + (hash(k * 5 + 401) - 0.5) * 260, { big: true, hue: k % 2 });
// dual-ship arrival
ev(B.dock, 'burst', 0, SHIP_Y, { dock: true });

function star4(x, cx, cy, r, col) {
  fill(x, col, cx - r, cy, r * 2 + 1, 1);
  fill(x, col, cx, cy - r, 1, r * 2 + 1);
  if (r > 2) fill(x, col, cx - 1, cy - 1, 3, 3);
}
function spiky(x, cx, cy, R, n, rot, col) {
  x.fillStyle = col;
  x.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? R * 0.42 : R;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    if (i) x.lineTo(px, py); else x.moveTo(px, py);
  }
  x.closePath();
  x.fill();
}

function drawParticles(x, g) {
  for (const p of P) {
    const age = g - p.g;
    if (age < 0 || age > 2) continue;
    const r = (k) => hash(p.seed * 31 + k);
    switch (p.kind) {
      case 'pop': {
        const T = p.big ? 0.5 : 0.38;
        if (age > T) break;
        const u = age / T, R = (p.big ? 34 : 22) * Math.sqrt(Math.min(1, u * 1.6));
        const cols = p.hue ? ['#ffffff', '#c8f8ff', '#5ae0ff', '#3a6aff', '#5a2aa8'] : ['#ffffff', '#fff1a0', '#ffb43a', '#ff5a2a', '#a8306a'];
        if (age < 0.05) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(p.x, p.y, p.big ? 26 : 16, 0, 7); x.fill(); }
        x.globalAlpha = 1 - u * u;
        spiky(x, p.x, p.y, R * 1.15, 6, r(1) * 3 + u * 1.5, cols[Math.min(4, Math.floor(u * 4) + 1)]);
        spiky(x, p.x, p.y, R * 0.7, 5, r(2) * 3 - u * 2, cols[Math.min(4, Math.floor(u * 4))]);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * 6.283 + r(i + 3), d = R * (1.3 + 0.5 * r(i + 20));
          fill(x, cols[i % 3], p.x + Math.cos(a) * d - 2, p.y + Math.sin(a) * d - 2, 4, 4);
        }
        x.globalAlpha = 1;
        break;
      }
      case 'debris': {
        if (age > 0.7) break;
        const src = ART.head2[p.id];
        for (let q = 0; q < 4; q++) {
          const qx = q % 2, qy = q >> 1, dir = [qx ? 1 : -1, qy ? 1 : -1];
          const sp = 110 + 70 * r(q), d = sp * (1 - Math.exp(-age * 4)) / 4 * 4;
          const fx = p.x + dir[0] * (6 + d * 0.9), fy = p.y + dir[1] * (6 + d * 0.7);
          x.save();
          x.globalAlpha = clamp01((0.7 - age) / 0.25);
          x.translate(Math.round(fx), Math.round(fy));
          x.rotate(Math.round(age * 14 * dir[0] * (1 + r(q + 5)) / (Math.PI / 4)) * (Math.PI / 4));
          x.drawImage(src, qx * 16, qy * 16, 16, 16, -8, -8, 16, 16);
          x.restore();
        }
        break;
      }
      case 'spark': {
        if (age > 0.2) break;
        const u = age / 0.2;
        if (age < 0.04) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(p.x, p.y, p.big ? 14 : 9, 0, 7); x.fill(); }
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (r(i) - 0.5) * 2.6, d = (p.big ? 40 : 26) * Math.sqrt(u);
          star4(x, Math.round(p.x + Math.cos(a) * d), Math.round(p.y + Math.sin(a) * d), Math.round(3 * (1 - u)) + 1, i % 2 ? '#ffe27a' : '#ffffff');
        }
        break;
      }
      case 'ring': {
        if (age > 0.3) break;
        const u = age / 0.3;
        x.strokeStyle = p.col ?? '#ffffff'; x.globalAlpha = 1 - u; x.lineWidth = 3;
        x.beginPath(); x.ellipse(p.x, p.y, 10 + (p.r ?? 60) * u, 6 + (p.r ?? 60) * 0.55 * u, 0, 0, 7); x.stroke();
        x.globalAlpha = 1;
        break;
      }
      case 'smoke': {
        if (age > 1.2) break;
        const u = age / 1.2;
        for (let i = 0; i < 3; i++) {
          x.globalAlpha = 0.5 * (1 - u);
          x.fillStyle = i % 2 ? '#5a4a6a' : '#3a2e48';
          x.beginPath(); x.arc(Math.round(p.x + (i - 1) * 8 + Math.sin(age * 4 + i) * 4), Math.round(p.y - age * 40 - i * 6), Math.round(5 + 9 * u), 0, 7); x.fill();
        }
        x.globalAlpha = 1;
        break;
      }
      case 'sparkle': {
        if (age > 0.45) break;
        const u = age / 0.45;
        for (let i = 0; i < 8; i++) {
          const a = i * 0.785 + 0.3, d = 8 + 34 * u;
          star4(x, Math.round(p.x + Math.cos(a) * d), Math.round(p.y + Math.sin(a) * d), Math.round(4 * (1 - u)), i % 2 ? '#7ae8ff' : '#ffffff');
        }
        break;
      }
      case 'burst': {
        if (age > 0.55) break;
        const u = age / 0.55, cx = heroX(B.dock) + DUAL_DX / 2, cy = p.y;
        x.save();
        x.globalAlpha = 1 - u;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * 6.283 + u * 0.5, d0 = 26 + 150 * u, d1 = d0 + 20 + 30 * (1 - u);
          x.strokeStyle = i % 2 ? '#ffe27a' : '#7ae8ff'; x.lineWidth = 3;
          x.beginPath(); x.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0); x.lineTo(cx + Math.cos(a) * d1, cy + Math.sin(a) * d1); x.stroke();
        }
        x.restore();
        break;
      }
      case 'mega': {
        if (age > 2) break;
        // flash core
        if (age < 0.22) {
          const u = age / 0.22;
          x.fillStyle = u < 0.4 ? '#ffffff' : '#fff1a0';
          x.globalAlpha = 1 - u * 0.6;
          x.beginPath(); x.arc(p.x, p.y, 40 + 150 * Math.sqrt(u), 0, 7); x.fill();
          x.globalAlpha = 1;
        }
        // shock rings
        for (let k = 0; k < 3; k++) {
          const a = age - k * 0.08;
          if (a < 0 || a > 0.7) continue;
          const u = a / 0.7;
          x.globalAlpha = 1 - u;
          x.strokeStyle = ['#ffffff', '#ffd23a', '#ff5ad8'][k]; x.lineWidth = 5 - k;
          x.beginPath(); x.ellipse(p.x, p.y, 30 + 420 * u, 20 + 300 * u, 0, 0, 7); x.stroke();
        }
        x.globalAlpha = 1;
        // the head shatters into its own pixels
        const src = ART.giant.small;
        for (let ty = 0; ty < 6; ty++) for (let tx = 0; tx < 7; tx++) {
          const k = ty * 7 + tx, ox = (tx - 3) * 32 + 16 - 16, oy = (ty - 2.5) * 36;
          const ang = Math.atan2(oy, ox + 1e-3) + (r(k) - 0.5) * 0.6, sp = 160 + 260 * r(k + 50);
          const d = sp * (1 - Math.exp(-age * 2.2)) / 2.2;
          const fx = p.x + ox + Math.cos(ang) * d, fy = p.y + oy + Math.sin(ang) * d + 30 * age * age;
          x.save();
          x.globalAlpha = clamp01((1.9 - age) / 0.5);
          x.translate(Math.round(fx), Math.round(fy));
          x.rotate(Math.round((age * (r(k + 9) - 0.5) * 16) / (Math.PI / 4)) * (Math.PI / 4));
          x.drawImage(src, tx * 8, ty * 9, 8, 9, -16, -18, 32, 36);
          x.restore();
        }
        // ember rain
        for (let i = 0; i < 70; i++) {
          const a = r(i + 200) * 6.283, sp = 120 + 380 * r(i + 300), d = sp * (1 - Math.exp(-age * 2.5)) / 2.5;
          const fx = p.x + Math.cos(a) * d, fy = p.y + Math.sin(a) * d + 40 * age * age;
          const tw = hash(i * 7 + Math.floor(age * 24)) > 0.3 ? 1 : 0;
          x.globalAlpha = clamp01((1.8 - age) / 0.6) * tw;
          fill(x, i % 3 ? '#ffd23a' : '#ffffff', fx - 1, fy - 1, 3, 3);
        }
        x.globalAlpha = 1;
        break;
      }
    }
  }
}

// ---------- ship ----------
function lastFire(g, side) {
  let t = -9;
  for (const s of SHOTS) if (s.side === side && s.g <= g) t = s.g;
  return t;
}
function drawShip(x, sx, sy, g, { rot = 0, red = false, white = false, bank = 0, flame = true, recoil = 0, glow = 0 } = {}) {
  x.save();
  x.translate(Math.round(sx), Math.round(sy + recoil));
  if (rot) x.rotate(Math.round(rot / (Math.PI / 8)) * (Math.PI / 8));
  x.scale(1 - Math.min(0.2, Math.abs(bank)), 1);
  if (flame) {
    for (const s of [-1, 1]) {
      const len = 5 + Math.round(4 * hash(Math.floor(g * 40) * 3 + s + 7)) + (recoil ? 2 : 0);
      fill(x, '#ff6a2a', s * 4 - 2, 21, 4, len + 3);
      fill(x, '#ffd23a', s * 4 - 1, 21, 2, len);
      fill(x, '#ffffff', s * 4 - 1, 21, 2, Math.max(1, len - 4));
    }
  }
  if (glow) {
    x.globalAlpha = glow;
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) x.drawImage(ART.shipGlow, -19 + dx, -23 + dy);
    x.globalAlpha = 1;
  }
  x.drawImage(white ? ART.shipWhite : red ? ART.shipRed : ART.ship, -19, -23);
  x.restore();
}
function drawHero(x, g) {
  if (!heroVisible(g)) return;
  const hx = heroX(g), hy = heroY(g);
  const vx = (heroX(g + 0.01) - heroX(g - 0.01)) / 0.02, bank = vx / 2600;
  const sides = isDual(g) ? [0, 1] : [0];
  const dockFlash = g >= B.dock && g < B.dock + 0.18 && Math.floor((g - B.dock) * 30) % 2 === 0;
  for (const side of sides) {
    const lf = lastFire(g, side), ra = g - lf;
    const recoil = ra < 0.06 ? Math.round(3 * (1 - ra / 0.06)) : 0;
    const sx = hx + side * DUAL_DX;
    drawShip(x, sx, hy, g, { bank, recoil, white: dockFlash && side === 1, glow: g > B.dock && g < B.dock + 0.6 ? 0.6 * (1 - (g - B.dock) / 0.6) : 0 });
    if (ra < 0.05) { // muzzle flash
      star4(x, Math.round(sx), Math.round(hy - 26), 4, '#ffffff');
      fill(x, '#ffd23a', sx - 2, hy - 28, 4, 4);
    }
  }
}

// ---------- bullets ----------
function drawBullets(x, g) {
  for (const s of SHOTS) {
    if (g < s.g || g >= s.gk) continue;
    const by = SHIP_Y - MUZZLE - BV * (g - s.g), bx = Math.round(s.bx);
    for (let k = 1; k <= 4; k++) { x.globalAlpha = 0.5 - k * 0.1; fill(x, '#ff7a4a', bx - 1, by + 6 + k * 6, 3, 6); }
    x.globalAlpha = 1;
    fill(x, '#ff5a3a', bx - 2, by - 6, 5, 13);
    fill(x, '#ffd8a0', bx - 1, by - 7, 3, 14);
    fill(x, '#ffffff', bx, by - 8, 1, 14);
  }
  for (const p of PELLETS) {
    if (g < p.t0) continue;
    if (g > B.mega && p.t0 < B.mega) continue;
    const [px, py] = pelletPos(p, g);
    if (py > LH + 10 || px < PX0 - 10 || px > PX1 + 10) continue;
    const pulse = Math.floor(g * 20) % 2;
    fill(x, '#ff2a8a', px - 3, py - 4, 6, 8);
    fill(x, pulse ? '#ffffff' : '#ffb0d8', px - 2, py - 3, 4, 6);
    fill(x, '#ffffff', px - 1, py - 2, 2, 3);
  }
}

// ---------- enemies ----------
function drawEnemies(x, g) {
  for (const e of ENEMIES) {
    const p = enemyPos(e, g);
    if (!p) continue;
    const a = enemyAngle(e, g), fast = p.mode !== 'slot';
    const f = Math.floor(g * (fast ? 12 : 7) + e.id * 0.5) % 2;
    const S = ART.en[e.id];
    const hurt = e.hits.some((t) => g >= t);
    const flash = e.hits.some((t) => g >= t && g < t + 0.06);
    const img = flash ? S.white[f] : hurt ? S.hurt[f] : S.fr[f];
    x.save();
    x.translate(Math.round(p.x), Math.round(p.y));
    if (a) x.rotate(a);
    x.drawImage(img, -28, -24);
    x.restore();
  }
  const c = captive(g);
  if (c) drawShip(x, c.x, c.y, g, { rot: c.red && c.rot === 0 ? Math.PI : c.rot, red: c.red, flame: false, white: g >= B.release && Math.floor(g * 24) % 2 === 0 });
}

// ---------- tractor beam ----------
function drawBeam(x, g) {
  if (g < B.beam0 || g > B.beam1) return;
  const top = HOVER[1] + 22, full = SHIP_Y + 30 - top;
  const ext = g < B.capture ? sm(clamp01((g - B.beam0) / 0.2)) : g > B.rise1 ? 1 - sm(clamp01((g - B.rise1) / (B.beam1 - B.rise1))) : 1;
  const len = full * ext, cx = enemyPos(byName('b1'), g)?.x ?? HOVER[0];
  const fl = 0.75 + 0.25 * Math.sin(g * 70);
  const BANDS = ['#3ad8ff', '#c8f8ff', '#2a6aff', '#7ae8ff'];
  for (let yy = 0; yy < len; yy += 3) {
    const u = yy / full, hw = 12 + 50 * u;
    const band = Math.floor((yy - g * 160) / 9);
    x.globalAlpha = (0.42 + 0.2 * ((band & 1) ? 1 : 0)) * fl;
    x.fillStyle = BANDS[((band % 4) + 4) % 4];
    x.fillRect(Math.round(cx - hw), Math.round(top + yy), Math.round(hw * 2), 3);
    // bright edges
    x.globalAlpha = 0.9 * fl;
    x.fillStyle = '#e8ffff';
    x.fillRect(Math.round(cx - hw), Math.round(top + yy), 2, 3);
    x.fillRect(Math.round(cx + hw - 2), Math.round(top + yy), 2, 3);
  }
  // sparkles rising in the beam
  for (let i = 0; i < 10; i++) {
    const yy = ((hash(i * 5) * full - (g - B.beam0) * 220) % full + full) % full;
    if (yy > len) continue;
    const u = yy / full, hw = 12 + 50 * u;
    x.globalAlpha = fl;
    star4(x, Math.round(cx + (hash(i * 9) - 0.5) * hw * 1.6), Math.round(top + yy), 2, '#ffffff');
  }
  x.globalAlpha = 1;
}

// ---------- giant boss: THE GREAT CABALD ----------
const CRACKS = Array.from({ length: 5 }, (_, k) => {
  let px = (hash(k * 11 + 3) - 0.5) * 140, py = -96 + hash(k * 13 + 1) * 40;
  const pts = [[px, py]];
  for (let i = 0; i < 7; i++) { px += (hash(k * 50 + i) - 0.5) * 26; py += 6 + hash(k * 70 + i) * 10; pts.push([px, py]); }
  return pts;
});
function drawGiant(x, g) {
  const p = bossPos(g);
  if (!p || g >= B.mega) return;
  const bx = Math.round(p.x), by = Math.round(p.y);
  const o = jawOpen(g), hitFlash = BOSS_HITS.some((t) => g >= t && g < t + 0.06) || (g >= B.final && Math.floor(g * 26) % 2 === 0);
  const angry = o > 0.3 && Math.floor(g * 10) % 3 !== 0;
  // head
  const G = ART.giant;
  x.drawImage(hitFlash ? G.sil : angry ? G.angry : G.head, bx - 112, by - 108);
  if (g >= B.final) { x.globalAlpha = 0.35 + 0.3 * Math.sin(g * 60); x.drawImage(G.red, bx - 112, by - 108); x.globalAlpha = 1; }
  // cracks spread with damage
  const dmg = BOSS_HITS.filter((t) => g >= t).length;
  for (let k = 0; k < Math.min(CRACKS.length, dmg); k++) {
    const pts = CRACKS[k];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [cx, cy] = pts[i], n = 6;
      for (let j = 0; j <= n; j++) fill(x, '#1a0a14', bx + ax + (cx - ax) * (j / n) - 1, by + ay + (cy - ay) * (j / n) - 1, 3, 3);
    }
  }
  // saucer collar, core, hatch doors
  const sy = by + SAUCER_DY;
  const core = coreAt(g), pulse = Math.sin(g * 24);
  x.fillStyle = '#12081e'; x.fillRect(bx - 30, sy + 24, 60, 30);
  if (o > 0.05) {
    const gl = x.createRadialGradient(core[0], core[1], 0, core[0], core[1], 40);
    gl.addColorStop(0, 'rgba(255,90,170,0.9)'); gl.addColorStop(1, 'rgba(255,40,120,0)');
    x.fillStyle = gl; x.fillRect(core[0] - 40, core[1] - 40, 80, 80);
  }
  x.fillStyle = '#ff2a6a'; x.beginPath(); x.ellipse(core[0], core[1], 27 + pulse, 13 + pulse, 0, 0, 7); x.fill();
  x.fillStyle = '#ff9ac8'; x.beginPath(); x.ellipse(core[0], core[1], 23 + pulse, 8 + pulse, 0, 0, 7); x.fill();
  x.fillStyle = hitFlash ? '#ffffff' : '#ffe8f4'; x.fillRect(core[0] - 24, core[1] - 3, 48, 5);
  x.drawImage(ART.saucer, bx - 150, sy);
  const dx = Math.round(28 * o);
  x.drawImage(ART.door, bx - 30 - dx, sy + 26);
  x.save(); x.translate(bx + 30 + dx, sy + 26); x.scale(-1, 1); x.drawImage(ART.door, 0, 0); x.restore();
  // rim chase lights
  for (let i = 0; i < 18; i++) {
    const lx = bx - 136 + i * 16, on = (Math.floor(g * 14) + i) % 3 === 0;
    fill(x, on ? (o > 0.3 ? '#ff4a6a' : '#7ae8ff') : '#3a2a5a', lx, sy + 23, 4, 3);
  }
  // pod muzzle flashes
  for (const pl of PELLETS) {
    const a = g - pl.t0;
    if (a < 0 || a > 0.06) continue;
    star4(x, Math.round(pl.x0), Math.round(pl.y0), 6, '#ffffff');
  }
}
function drawBossBar(x, g) {
  if (g < B.bossIn[1] - 0.2 || g > B.final + 0.4) return;
  const a = clamp01((g - B.bossIn[1] + 0.2) / 0.15);
  text(x, 'THE GREAT CABALD', PX0 + 14, 12, { size: 8, color: '#ff8ab0', alpha: a });
  const hp = bossHp(g), w = 230, x0 = PX0 + 14, y0 = 24;
  x.globalAlpha = a;
  fill(x, '#0c0a1a', x0 - 2, y0 - 2, w + 4, 10);
  for (let i = 0; i < BOSS_HP; i++) {
    const sw = w / BOSS_HP;
    fill(x, i < hp ? (i < 3 ? '#ff4a4a' : '#ffd23a') : '#2a2040', x0 + i * sw, y0, sw - 2, 6);
  }
  x.globalAlpha = 1;
}

// ---------- banners ----------
function drawBanners(x, g, ts) {
  const C = PCX;
  const [s0, s1] = B.stageText;
  if (g >= s0 && g < s1) {
    text(x, 'STAGE 1', C, 236, { size: 16, align: 'center', color: '#5ae0ff' });
    if (g > 0.25 && Math.floor(ts * 8) % 2 === 0) text(x, 'READY', C, 268, { size: 16, align: 'center', color: '#ffffff' });
  }
  if (g >= B.capText[0] && g < B.capText[1] && Math.floor(ts * 7) % 4 !== 0) text(x, 'FIGHTER CAPTURED', C, 404, { size: 16, align: 'center', color: '#ff3a4a' });
  if (g >= B.dualText[0] && g < B.dualText[1] - 0.12) bounceText(x, 'DUAL FIGHTER!', C, 380, 16, g - B.dualText[0], { step: 0.008, drop: 24 });
  if (g >= B.chalText[0] && g < B.chalText[1]) {
    const blink = Math.floor(ts * 6) % 2;
    text(x, 'CHALLENGING', C, 226, { size: 16, align: 'center', color: blink ? '#ffd23a' : '#5ae0ff' });
    text(x, 'STAGE', C, 252, { size: 16, align: 'center', color: blink ? '#5ae0ff' : '#ffd23a' });
  }
  // challenging-stage results
  const [p0, p1] = B.perfect;
  if (g >= p0 && g < p1) {
    text(x, 'NUMBER OF HITS', C - 40, 186, { size: 16, align: 'center', color: '#5ae0ff' });
    text(x, '16', C + 148, 186, { size: 16, align: 'center', color: '#ffffff' });
    if (g > p0 + 0.06) bounceText(x, 'PERFECT !!', C, 222, 32, g - p0 - 0.06, { drop: 24, step: 0.008 });
    if (g > p0 + 0.3) {
      text(x, 'SPECIAL BONUS', C, 278, { size: 16, align: 'center', color: '#ffd23a' });
      text(x, '10000 PTS', C, 302, { size: 16, align: 'center', color: Math.floor(ts * 10) % 2 ? '#ffffff' : '#ffd23a' });
    }
  }
  // warning
  const [w0, w1] = B.warn;
  if (g >= w0 && g < w1) {
    const u = (g - w0) / (w1 - w0), on = Math.floor(ts * 8) % 2 === 0;
    x.globalAlpha = 0.18 + 0.12 * Math.sin(ts * 25);
    x.fillStyle = '#ff1a2a'; x.fillRect(PX0, 0, PW, LH);
    x.globalAlpha = 1;
    for (const yb of [214, 290]) {
      x.save(); x.beginPath(); x.rect(PX0, yb, PW, 14); x.clip();
      fill(x, '#ffd23a', PX0, yb, PW, 14);
      x.fillStyle = '#0c0a1a';
      for (let k = -2; k < 24; k++) {
        const sx = PX0 + k * 28 + ((ts * 120) % 28) * (yb > 250 ? -1 : 1);
        x.beginPath(); x.moveTo(sx, yb + 14); x.lineTo(sx + 14, yb); x.lineTo(sx + 24, yb); x.lineTo(sx + 10, yb + 14); x.fill();
      }
      x.restore();
    }
    if (on || u > 0.7) text(x, 'WARNING!!', C, 240, { size: 32, align: 'center', color: '#ff3a4a' });
    text(x, 'HUGE CABALD APPROACHING', C, 334, { size: 8, align: 'center', color: '#ffd23a', alpha: clamp01(u * 4) });
  }
  // stage clear + results
  if (g >= B.clear) {
    bounceText(x, 'STAGE CLEAR!', C, 112, 32, g - B.clear, { drop: 60, step: 0.035 });
    const rows = [
      ['SHOTS FIRED', String(shotsFired(G_END)), '#ffd23a'],
      ['NUMBER OF HITS', String(hitsMade(G_END)), '#ffd23a'],
      ['HIT-MISS RATIO', '100.0 %', '#ff8ab0'],
      ['NO-MISS BONUS', String(Math.round(TALLY_BONUS * clamp01((g - B.tally[3]) / 0.35) / 10) * 10), '#6aff8a'],
    ];
    rows.forEach(([l, v, col], i) => {
      const t0 = B.tally[i];
      if (g < t0) return;
      const yy = 172 + i * 30, a = clamp01((g - t0) / 0.06);
      text(x, l, PX0 + 28, yy, { size: 16, color: col, alpha: a });
      const shown = i < 2 ? String(Math.round(Number(v) * clamp01((g - t0) / 0.18))) : v;
      text(x, shown, PX1 - 28, yy, { size: 16, align: 'right', color: '#ffffff', alpha: a });
    });
  }
  if (g >= B.end) {
    const a = g - B.end;
    bounceText(x, 'THE CABALD', C, 330, 16, a, { cols: ['#ff8ab0', '#ffffff'], step: 0.02 });
    bounceText(x, 'HAS FALLEN', C, 354, 16, a - 0.12, { cols: ['#ff8ab0', '#ffffff'], step: 0.02 });
    if (a > 0.3) text(x, 'THANK YOU, REMY!', C, 404, { size: 16, align: 'center', color: Math.floor(ts * 8) % 2 ? '#5ae0ff' : '#ffffff' });
  }
}

function drawPopups(x, g) {
  for (const [t, px, py, s, col] of POPS) {
    const a = g - t;
    if (a < 0 || a > 0.7) continue;
    const big = s.length >= 4;
    text(x, s, px, py - 26 * Math.sqrt(a / 0.7), { size: big ? 16 : 8, align: 'center', color: col, alpha: clamp01((0.7 - a) / 0.15) });
  }
}

// ---------- cabinet side panels ----------
function bevelPanel(x, x0, w) {
  x.globalAlpha = 0.86;
  fill(x, '#0a0718', x0, 0, w, LH);
  x.globalAlpha = 1;
  // metal frame
  fill(x, '#2a2048', x0 + 8, 8, w - 16, 2); fill(x, '#2a2048', x0 + 8, LH - 10, w - 16, 2);
  fill(x, '#2a2048', x0 + 8, 8, 2, LH - 16); fill(x, '#2a2048', x0 + w - 10, 8, 2, LH - 16);
  for (const [cx, cy] of [[x0 + 14, 14], [x0 + w - 18, 14], [x0 + 14, LH - 18], [x0 + w - 18, LH - 18]]) { fill(x, '#4a3a78', cx, cy, 4, 4); fill(x, '#8a7ab8', cx, cy, 2, 2); }
}
function drawPanels(x, g, ts) {
  bevelPanel(x, 0, PX0);
  bevelPanel(x, PX1, LW - PX1);
  // neon trims hugging the playfield
  for (const [px, col] of [[PX0 - 3, '#ff3a8a'], [PX1, '#3ad8ff']]) {
    x.globalAlpha = 0.35; fill(x, col, px - 3, 0, 9, LH);
    x.globalAlpha = 1; fill(x, col, px, 0, 3, LH);
  }
  // left: scores
  const sc = hudScore(g), hi = Math.max(HISCORE, sc);
  text(x, 'HIGH SCORE', 26, 30, { size: 16, color: '#ff3a4a' });
  text(x, String(hi).padStart(7, ' '), 194, 54, { size: 16, align: 'right', color: sc > HISCORE && Math.floor(ts * 8) % 2 ? '#ffd23a' : '#ffffff' });
  if (Math.floor(ts * 3) % 2 === 0) text(x, '1UP', 26, 96, { size: 16, color: '#ff3a4a' });
  text(x, String(sc).padStart(7, ' '), 194, 120, { size: 16, align: 'right' });
  fill(x, '#2a2048', 26, 162, 168, 2);
  text(x, 'CABALD DOWN', 26, 178, { size: 8, color: '#ff8ab0' });
  const k = { zako: 0, goei: 0, boss: 0 };
  for (const h of HITS) if (h.kill && g >= h.gk && k[h.e?.type] != null) k[h.e.type]++;
  const chal = HITS.filter((h) => h.kill && h.type === 'chal' && g >= h.gk).length;
  [['zako', 'ZAKO'], ['goei', 'GOEI'], ['boss', 'BOSS']].forEach(([t, name], i) => {
    const yy = 198 + i * 56;
    x.drawImage(ART.legend[t][Math.floor(ts * 6 + i) % 2], 22, yy);
    text(x, name, 84, yy + 8, { size: 8, color: '#8a7ab8' });
    text(x, '×' + String(k[t]).padStart(2, '0'), 84, yy + 24, { size: 16 });
  });
  text(x, 'BONUS', 26, 372, { size: 8, color: '#8a7ab8' });
  text(x, '×' + String(chal).padStart(2, '0'), 84, 368, { size: 16, color: '#5ae0ff' });
  fill(x, '#2a2048', 26, 400, 168, 2);
  text(x, 'HITS', 26, 414, { size: 8, color: '#8a7ab8' });
  text(x, String(hitsMade(g)).padStart(3, '0'), 26, 430, { size: 16 });
  if (Math.floor(ts * 2) % 2 === 0) text(x, 'CREDIT 1', 26, 500, { size: 8, color: '#8a7ab8' });

  // right: stage, pilot cam, ships
  const stage = g < B.chalText[0] ? 1 : g < B.warn[0] ? 2 : 3;
  text(x, 'STAGE', 762, 30, { size: 16, color: '#5ae0ff' });
  text(x, String(stage), 938, 30, { size: 16, align: 'right' });
  for (let i = 0; i < stage; i++) x.drawImage(ART.badges[i], 764 + i * 14, 56);
  // pilot cam
  const fx0 = 762, fy0 = 92, fw = 176, fh = 150;
  fill(x, '#2a2048', fx0 - 2, fy0 - 2, fw + 4, fh + 4);
  const captured = g >= B.capture && g < B.ship2In[1];
  const grad = x.createLinearGradient(0, fy0, 0, fy0 + fh);
  grad.addColorStop(0, captured ? '#3a0a1a' : '#0a1a3a'); grad.addColorStop(1, captured ? '#1a0410' : '#04081a');
  x.fillStyle = grad; x.fillRect(fx0, fy0, fw, fh);
  x.save(); x.beginPath(); x.rect(fx0, fy0, fw, fh); x.clip();
  const shake = (captured ? 2 : 0) * Math.sin(ts * 70) + (g > B.final && g < B.mega + 0.3 ? 2 * Math.sin(ts * 90) : 0);
  const cheer = g >= B.clear ? Math.abs(Math.sin(ts * 9)) * 6 : 0;
  x.drawImage(ART.pilot, 0, 0, 76, 92, fx0 + fw / 2 - 76 + shake, fy0 + 10 - cheer, 152, 184);
  // scanlines + label
  x.globalAlpha = 0.18; for (let yy = fy0; yy < fy0 + fh; yy += 3) fill(x, '#000000', fx0, yy, fw, 1); x.globalAlpha = 1;
  x.restore();
  text(x, 'PILOT REMY', fx0 + 4, fy0 + fh + 8, { size: 8, color: '#8a7ab8' });
  if (captured && Math.floor(ts * 6) % 2 === 0) text(x, 'HELP!', fx0 + fw - 6, fy0 + 8, { size: 16, align: 'right', color: '#ff3a4a' });
  if (isDual(g) && g < B.dock + 0.9 && Math.floor(ts * 8) % 2 === 0) text(x, 'YEAH!', fx0 + fw - 6, fy0 + 8, { size: 16, align: 'right', color: '#ffd23a' });
  // reserve ships + dual lamp
  text(x, 'SHIPS', 762, 280, { size: 8, color: '#8a7ab8' });
  for (let i = 0; i < lives(g); i++) x.drawImage(ART.shipMini, 764 + i * 26, 296);
  text(x, 'DUAL', 762, 340, { size: 8, color: '#8a7ab8' });
  const on = isDual(g);
  fill(x, '#2a2048', 762, 354, 64, 20);
  fill(x, on ? (Math.floor(ts * 4) % 2 ? '#6aff8a' : '#3ad86a') : '#14301e', 764, 356, 60, 16);
  text(x, on ? 'ON' : 'OFF', 794, 360, { size: 8, align: 'center', color: on ? '#0c0a1a' : '#3a6a4a', shadow: null });
  // tiny radar of the formation
  text(x, 'RADAR', 762, 396, { size: 8, color: '#8a7ab8' });
  fill(x, '#06140c', 762, 410, 176, 96);
  fill(x, '#1a3a24', 762, 410 + 48, 176, 1); fill(x, '#1a3a24', 762 + 88, 410, 1, 96);
  for (const e of ENEMIES) {
    const p = enemyPos(e, g);
    if (!p || p.y < 0 || p.y > LH) continue;
    fill(x, e.type === 'boss' ? '#ffd23a' : '#6aff8a', 762 + ((p.x - PX0) / PW) * 176 - 1, 410 + (p.y / LH) * 96 - 1, 3, 3);
  }
  if (bossPos(g) && g < B.mega) { const b = bossPos(g); fill(x, '#ff4a6a', 762 + ((b.x - PX0) / PW) * 176 - 5, 410 + (Math.max(0, b.y) / LH) * 96 - 3, 10, 7); }
  if (heroVisible(g)) fill(x, '#ffffff', 762 + ((heroX(g) - PX0) / PW) * 176 - 1, 410 + (Math.min(LH, heroY(g)) / LH) * 96 - 1, 3, 3);
  text(x, '©2026 REMY BOYS', 762, 516, { size: 8, color: '#5a4a8a', shadow: null });
}

// ---------- frame ----------
export function drawGame(lt) {
  const { g, stop, sl } = warp(lt);
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  drawSpace(x, g, lt);
  // screen shake (real time: keeps rumbling through hit-stops)
  let shx = 0, shy = 0;
  for (const [ge, amp] of SHOOK) {
    const d = lt - (filmT(ge) - INTRO);
    if (d < 0 || d > 0.35) continue;
    const k = amp * Math.exp(-d * 14);
    shx += k * Math.sin(d * 95 + ge * 10);
    shy += k * Math.cos(d * 77 + ge * 7);
  }
  x.save();
  x.beginPath(); x.rect(PX0, 0, PW, LH); x.clip();
  x.translate(Math.round(shx), Math.round(shy));
  drawGiant(x, g);
  drawBeam(x, g);
  drawEnemies(x, g);
  drawBullets(x, g);
  drawHero(x, g);
  drawParticles(x, g);
  drawPopups(x, g);
  // freeze-frame accents during the big stops
  if (stop?.kind === 'final' || stop?.kind === 'mega') {
    x.globalAlpha = (stop.kind === 'mega' ? 0.9 : 0.35) * (1 - sl / stop.d);
    x.fillStyle = '#ffffff'; x.fillRect(PX0 - 20, -20, PW + 40, LH + 40);
    x.globalAlpha = 1;
  }
  x.restore();
  x.save();
  x.beginPath(); x.rect(PX0, 0, PW, LH); x.clip();
  drawBossBar(x, g);
  drawBanners(x, g, lt);
  x.restore();
  drawPanels(x, g, lt);
  return { low: ART.low, g, stop };
}
