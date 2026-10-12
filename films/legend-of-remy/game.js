// The adventure, drawn at the game's native 960×540 into a low-res canvas (upscaled 2× nearest by film.js).
import { hash } from 'filmkit/lib.js';
import * as A from './art.js';
import {
  LW, LH, HUD, PH, INTRO, STOPS, warp, filmT, area, cam, heroXY, heroFace, SLASHES, SLASH_D, SPIN, HURT, PUSH, LEAP, HOLD, DASH,
  GRASS, ENEMIES, enemyAt, enemyEnd, KB_D, DIE_G, rock, PICKUPS, hudGems, hudLife, REFILL, BLOCK, CHIME, SHUTTER_OPEN, SHUTTER_CLOSE,
  BOSS, ROAR, SPEAR, CHARGE, BOSS_HITS, BOSS_DIE, bossAt, TONIC, TEXT, IRIS_OUT, FADE_DUN, SCROLL_AB, SCROLL_UP,
} from './choreo.js';

export const FONT = '"Press Start 2P"';
const ART = {};
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const DEG = Math.PI / 180;

// ---------- sprite surgery ----------
const getData = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height);
function silOf(c) {
  const s = A.canvas(c.width, c.height), x = s.getContext('2d');
  x.drawImage(c, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#fff';
  x.fillRect(0, 0, c.width, c.height);
  return s;
}
// #42 carries a sword in its left fist: cut it out so the rig can swing our own blade.
function removeSword(R) {
  const c = A.canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  const img = getData(c), d = img.data;
  for (let y = 18; y < Math.min(R.h, 68); y++)
    for (let xx = 0; xx < 20; xx++) {
      const i = (y * R.w + xx) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
      if (!d[i + 3]) continue;
      const slate = Math.abs(r - g) < 28 && Math.abs(g - b) < 34 && b >= r - 8 && r < 130;
      let kill = false;
      if (y < 58) kill = slate && xx <= (y < 47 ? 14 : 15);
      else if (y < 61) kill = xx <= 19;
      else if (y < 67) kill = xx <= 18;
      else kill = xx <= 17;
      if (kill) d[i + 3] = 0;
    }
  x.putImageData(img, 0, 0);
  return { ...R, c, sil: silOf(c) };
}
// Back view: the face becomes hair, the shirt print goes plain.
function backView(R, hair, shirt, skin) {
  const c = A.canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  const img = getData(c), d = img.data, [hr, hg, hb] = A.rgb(hair), [sr, sg, sb] = A.rgb(shirt), [kr, kg, kb] = A.rgb(skin);
  const op = (xx, y) => xx >= 0 && y >= 0 && xx < R.w && y < R.h && d[(y * R.w + xx) * 4 + 3] > 40;
  const out = new Uint8ClampedArray(d);
  for (let y = 0; y < R.legTop; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4;
      if (d[i + 3] < 40) continue;
      const edge = !op(xx - 1, y) || !op(xx + 1, y) || !op(xx, y - 1) || !op(xx, y + 1);
      let col;
      if (y <= 43) {
        if (edge) col = [hr * 0.35, hg * 0.35, hb * 0.35];
        else {
          const strand = (xx * 3 + Math.floor(y / 5) * 2) % 9 < 1.5;
          const shine = y > R.top + 5 && y < R.top + 10 && xx > 14 && xx < 34 && (xx + y) % 3 !== 0;
          const k = shine ? 1.35 : strand ? 0.7 : y > 36 ? 0.85 : 1;
          col = [hr * k, hg * k, hb * k];
        }
      } else if (y <= 46 && xx > 18 && xx < 34) col = [kr * 0.82, kg * 0.82, kb * 0.82];
      else {
        const diff = Math.abs(d[i] - sr) + Math.abs(d[i + 1] - sg) + Math.abs(d[i + 2] - sb);
        if (edge || diff < 70) continue;
        col = [sr, sg, sb];
      }
      out[i] = col[0]; out[i + 1] = col[1]; out[i + 2] = col[2];
    }
  img.data.set(out);
  x.putImageData(img, 0, 0);
  return { ...R, c, sil: silOf(c) };
}
function scaleRemy(R, k) {
  const c = A.canvas(R.w * k, R.h * k), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(R.c, 0, 0, R.w * k, R.h * k);
  return { ...R, c, sil: silOf(c), w: R.w * k, h: R.h * k, legTop: R.legTop * k, cx: R.cx * k, top: R.top * k, bottom: R.bottom * k + k - 1 };
}

// ---------- scenery ----------
const SCREEN_A = {
  seed: 3, cliff: [52, 104],
  water: [[110, 420, 190, 74]],
  path: [{ x0: -40, x1: 1000, y: 252, w: 26 }],
  trees: [[30, 48], [130, 40], [236, 50], [338, 38], [452, 46], [560, 36], [668, 48], [880, 42], [-10, 400]],
  rocks: [[300, 352], [342, 372], [880, 360], [912, 380], [420, 150]],
  bushes: [[540, 150], [580, 160], [860, 160], [380, 395], [600, 400], [640, 410], [940, 300]],
  flowers: [[250, 160], [266, 172], [480, 340], [495, 352], [820, 330], [836, 344], [40, 170], [770, 160], [900, 230]],
};
const SCREEN_B = {
  seed: 7, cliff: [44, 122],
  water: [[760, 420, 230, 92]],
  path: [{ x0: -40, x1: 320, y: 252, w: 26 }, { x: 300, y0: 120, y1: 252, w: 22 }],
  trees: [[20, 36], [110, 30], [440, 32], [552, 40], [660, 30], [770, 38], [880, 32], [930, 200], [-14, 380]],
  rocks: [[440, 380], [476, 404], [520, 160], [560, 180]],
  bushes: [[30, 160], [430, 170], [700, 170], [740, 176], [900, 300], [120, 410], [160, 420]],
  flowers: [[200, 330], [214, 342], [380, 300], [620, 250], [636, 262], [840, 240], [60, 300]],
  lilies: [[700, 380], [780, 410], [860, 372]],
  facade: [300, 122],
};
function bakeOverworld(def) {
  const c = A.overworld(def), x = c.getContext('2d');
  const shadow = (cx, cy, rx, ry) => { x.fillStyle = 'rgba(16,40,20,0.35)'; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill(); };
  for (const [bx, by] of def.bushes) { const b = ART.bush[(bx + by) % 3]; shadow(bx, by - 2, b.width * 0.5, 5); x.drawImage(b, Math.round(bx - b.width / 2), by - b.height); }
  for (const [rx, ry] of def.rocks) { const r = ART.rock[(rx + ry) % 2]; shadow(rx + 2, ry - 2, r.width * 0.5, 5); x.drawImage(r, Math.round(rx - r.width / 2), ry - r.height); }
  for (const [lx, ly] of def.lilies ?? []) x.drawImage(ART.lily, lx, ly);
  if (def.facade) { const [fx, fy] = def.facade, f = ART.facade; x.drawImage(f, Math.round(fx - f.width / 2), fy - f.height); }
  // trees last (canopies overlap the cliff lip)
  for (const [tx, ty] of def.trees) { const t = ART.trees[(tx + ty) % 3]; shadow(tx + t.width / 2 + 6, ty + t.height - 6, t.width * 0.42, 9); x.drawImage(t, Math.round(tx), Math.round(ty)); }
  // water sparkle candidates
  def.sparkles = [];
  for (let i = 0; i < 400 && def.sparkles.length < 70; i++) {
    const sx = Math.floor(hash(i * 3 + def.seed) * 960), sy = Math.floor(hash(i * 5 + def.seed + 1) * 440);
    for (const [cx, cy, rx, ry] of def.water) if (Math.hypot((sx - cx) / rx, (sy - cy) / ry) < 0.85) { def.sparkles.push([sx, sy, hash(i + 77)]); break; }
  }
  return c;
}

export async function prepareGame() {
  const h42 = await A.loadRemy(42, true);
  ART.hero = removeSword(h42);
  ART.heroBack = backView(ART.hero, '#893c3b', '#2d3d49', '#d0bdb1');
  ART.hand = { x: 17 - ART.hero.w / 2, y: 62 - ART.hero.bottom - 1 };
  ART.enemies = {};
  for (const e of ENEMIES) ART.enemies[e.spr] = await A.loadRemy(e.spr, true);
  ART.boss = scaleRemy(await A.loadRemy(BOSS.spr, true), 2);
  const heads = await A.loadHeads();
  ART.heroHead = A.headIcon(heads, 42, 2);
  ART.baldHead = A.headIcon(heads, 1217, 2);
  ART.trees = [0, 1, 2].map((i) => A.tree(i * 11 + 2, 80 + i * 6));
  ART.rock = [0, 1].map((i) => A.boulder(i * 5 + 1, 38 + i * 6));
  ART.bush = [0, 1, 2].map((i) => A.bush(i * 7 + 3, 38 + i * 4));
  ART.tuft = [A.tuft(0), A.tuft(1)];
  ART.stub = A.tuft(0, true);
  ART.flowers = [0, 1].map((k) => ['#ff4a5a', '#ffffff', '#ffb0e0'].map((c) => A.flower(k, c)));
  ART.lily = A.lily();
  ART.facade = A.facade();
  ART.bgA = bakeOverworld(SCREEN_A);
  ART.bgB = bakeOverworld(SCREEN_B);
  ART.room1 = A.room(A.DUN.blue, { seed: 1 });
  ART.room2 = A.room(A.DUN.boss, { seed: 2, carpet: [440, 520] });
  const statue = A.statue(), statueR = A.statue(['#140810', '#4a2238', '#6e3a58', '#a46a8a', '#e0b8d0']), pot = A.pot();
  const deco = (c, list) => {
    const x = c.getContext('2d');
    for (const [art, px, py] of list) {
      x.fillStyle = 'rgba(0,0,10,0.4)'; x.beginPath(); x.ellipse(px, py - 2, art.width * 0.45, 5, 0, 0, 7); x.fill();
      x.drawImage(art, Math.round(px - art.width / 2), py - art.height);
    }
  };
  deco(ART.room1, [[statue, 384, 126], [statue, 576, 126], [pot, 74, 132], [pot, 106, 126], [pot, 886, 132], [pot, 74, 396], [pot, 886, 396], [pot, 854, 396]]);
  deco(ART.room2, [[statueR, 250, 126], [statueR, 710, 126], [statueR, 120, 126], [statueR, 840, 126], [pot, 74, 396], [pot, 886, 396]]);
  ART.block = A.block();
  ART.bowl = A.torchBowl();
  ART.gem = [0, 1, 2, 3].map((k) => A.gem('green', k));
  ART.gem5 = [0, 1, 2, 3].map((k) => A.gem('blue', k));
  ART.hearts = [0, 0.5, 1].map((f) => A.heart(f, 3));
  ART.heartWhite = A.heart(1, 3, '#ffffff');
  ART.heartS = A.heart(1, 2);
  ART.sword = A.sword();
  ART.swordSil = silOf(ART.sword);
  ART.tonic = A.tonic();
  ART.key = A.key();
  ART.bomb = A.bomb();
  ART.spear = A.spear();
  ART.low = A.canvas(LW, LH);
}

// ---------- helpers ----------
const fill = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), w, h); };
export function text(x, s, a, b, { size = 16, color = '#fff', shadow = '#141020', align = 'left', alpha = 1 } = {}) {
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
const shadow = (x, cx, cy, rx, ry, a = 0.35) => { x.fillStyle = `rgba(10,16,24,${a})`; x.beginPath(); x.ellipse(Math.round(cx), Math.round(cy), rx, ry, 0, 0, 7); x.fill(); };

// ---------- events: particles + shakes ----------
const P = [];
const ev = (g, kind, x, y, extra = {}) => P.push({ g, kind, x, y, seed: P.length * 13 + 7, ...extra });
const SHOOK = [];
for (const e of ENEMIES) {
  const p = enemyAt(e, e.hit), end = enemyEnd(e);
  ev(e.hit, 'stars', p.x, p.y - 40); ev(e.hit, 'ring', p.x, p.y - 36);
  ev(e.hit + DIE_G, 'poof', end.x, end.y - 30);
  if (e.spawn > 0) ev(e.spawn, 'spawn', e.path[0][1], e.path[0][2] - 30);
  if (e.hit !== 4.6) SHOOK.push([e.hit, 3]);
}
for (const t of GRASS) if (t.cut) { ev(t.cut, 'clip', t.x, t.y - 14); ev(t.cut, 'clip', t.x + 4, t.y - 8); }
for (const p of PICKUPS) if (p.g < 50) ev(p.g, 'sparkle', p.x, p.y - 12, { pink: p.kind === 'heart' });
ev(HURT.g, 'boom', 1100, 222); ev(HURT.g, 'shards', 1110, 222); SHOOK.push([HURT.g, 6]);
ev(SPIN.hit, 'ring', 1055, 230, { big: true }); SHOOK.push([SPIN.hit, 6]);
ev(SPIN.full, 'sparkle', 1055 + 60, 228);
for (let i = 0; i < 6; i++) ev(PUSH.b0 + i * 0.05, 'dust', BLOCK.x0 + (BLOCK.x1 - BLOCK.x0) * (i / 6) + 22, BLOCK.y, { n: 3, s: 0.8 });
ev(CHIME, 'sparkle', 480, 470); ev(CHIME + 0.08, 'sparkle', 460, 490); ev(CHIME + 0.16, 'sparkle', 500, 480);
ev(SHUTTER_CLOSE.t1, 'dust', 480, 432, { n: 6, s: 1 }); SHOOK.push([SHUTTER_CLOSE.t1, 3]);
ev(SPEAR.g1, 'sparks', 480, 404); ev(SPEAR.g1, 'dust', 480, 410, { n: 5, s: 1 }); SHOOK.push([SPEAR.g1, 3]);
ev(DASH.g0, 'dust', 480, 335, { n: 4, s: 0.8 });
ev(LEAP.g0, 'dust', 555, 335, { n: 6, s: 1 }); ev(LEAP.g1, 'dust', 530, 300, { n: 6, s: 1 });
for (let t = ROAR.t0; t < ROAR.t1; t += 0.12) ev(t, 'roar', BOSS.x, BOSS.y - 120);
SHOOK.push([ROAR.t0, 4], [ROAR.t0 + 0.12, 3], [ROAR.t0 + 0.24, 3]);
SHOOK.push([CHARGE.t0 + 0.06, 3], [CHARGE.t1, 4]);
ev(CHARGE.t1, 'dust', 530, 252, { n: 6, s: 1.3 });
BOSS_HITS.forEach((h, i) => { const b = bossAt(h); ev(h, 'stars', b.x, b.y - 30, { big: true }); ev(h, 'ring', b.x, b.y - 40, { big: i === 2 }); SHOOK.push([h, i === 2 ? 8 : 5]); });
for (let i = 0; i < 9; i++) {
  const t = BOSS_DIE.t0 + 0.08 + i * 0.064, b = bossAt(t);
  ev(t, 'boom', b.x + (hash(i * 3 + 1) - 0.5) * 90, b.y - 20 - hash(i * 3 + 2) * 130, { big: i % 3 === 2 });
  SHOOK.push([t, 2]);
}
ev(BOSS_DIE.t1, 'boom', 530, 150, { big: true, huge: true }); ev(BOSS_DIE.t1, 'burst', 530, 140); SHOOK.push([BOSS_DIE.t1, 10]);
ev(TONIC.g0, 'sparkle', TONIC.x, TONIC.y - 14);
ev(HOLD, 'burst', 530, 268 - 100, { gold: true });

function drawParticles(x, g, ox, oy) {
  for (const p of P) {
    const age = g - p.g;
    if (age < 0 || age > 1.2) continue;
    const r = (k) => hash(p.seed * 31 + k);
    const sx = p.x - ox, sy = p.y - oy;
    if (sx < -200 || sx > LW + 200 || sy < -200 || sy > LH + 200) continue;
    switch (p.kind) {
      case 'dust': {
        if (age > 0.4) break;
        for (let i = 0; i < p.n; i++) {
          const a = (i / p.n) * Math.PI * 2 + r(i), sp = (30 + 40 * r(i + 3)) * p.s, u = age / 0.4;
          const px = sx + Math.cos(a) * sp * age * 1.6, py = sy - 2 + Math.sin(a) * sp * age * 0.6 - 12 * age;
          x.globalAlpha = 1 - u;
          x.fillStyle = u < 0.5 ? '#f4f0e8' : '#c8c0b0';
          x.beginPath(); x.arc(Math.round(px), Math.round(py), Math.round((2 + 4 * u) * p.s), 0, 7); x.fill();
        }
        x.globalAlpha = 1;
        break;
      }
      case 'stars': {
        if (age > 0.32) break;
        const u = age / 0.32, n = p.big ? 8 : 6;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + r(1), d = (p.big ? 50 : 32) * Math.sqrt(u);
          star4(x, Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d * 0.8), Math.round(3 * (1 - u)) + 1, i % 2 ? '#fff6a0' : '#ffffff');
        }
        if (age < 0.05) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(sx, sy, p.big ? 20 : 12, 0, 7); x.fill(); }
        break;
      }
      case 'ring': {
        const D = p.big ? 0.32 : 0.22;
        if (age > D) break;
        const u = age / D;
        x.strokeStyle = '#ffffff'; x.globalAlpha = 1 - u; x.lineWidth = p.big ? 4 : 2;
        x.beginPath(); x.ellipse(sx, sy, (p.big ? 20 : 8) + (p.big ? 110 : 40) * u, (p.big ? 10 : 4) + (p.big ? 50 : 16) * u, 0, 0, 7); x.stroke();
        x.globalAlpha = 1;
        break;
      }
      case 'poof': {
        // Zelda-style death: flash, four puffs fly out, sparkle core
        if (age > 0.42) break;
        const u = age / 0.42;
        if (age < 0.05) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(sx, sy, 22, 0, 7); x.fill(); }
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.3, d = 6 + 30 * Math.sqrt(u);
          const px = Math.round(sx + Math.cos(a) * d), py = Math.round(sy + Math.sin(a) * d * 0.8 - 10 * u), rad = Math.round(9 * (1 - u * 0.7));
          x.globalAlpha = 1 - u * u;
          x.fillStyle = '#7a6a8a'; x.beginPath(); x.arc(px + 1, py + 2, rad, 0, 7); x.fill();
          x.fillStyle = i % 2 ? '#ffffff' : '#e8e0f0'; x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
        }
        x.globalAlpha = 1;
        if (u < 0.6) star4(x, Math.round(sx), Math.round(sy), Math.round(6 * (1 - u)), '#fff6a0');
        break;
      }
      case 'spawn': {
        if (age > 0.3) break;
        const u = age / 0.3;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2, d = 10 + 14 * u;
          x.globalAlpha = 1 - u;
          x.fillStyle = i % 2 ? '#ffffff' : '#d8d0e8';
          x.beginPath(); x.arc(Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d * 0.7), Math.round(12 * (1 - u * 0.5)), 0, 7); x.fill();
        }
        x.globalAlpha = 1;
        break;
      }
      case 'boom': {
        const D = p.huge ? 0.6 : 0.36;
        if (age > D) break;
        const u = age / D, R = (p.huge ? 90 : p.big ? 34 : 22) * Math.sqrt(u);
        const cols = ['#ffffff', '#fff1a0', '#ffb43a', '#ff5a2a', '#7a2a2a'];
        x.fillStyle = cols[Math.min(4, Math.floor(u * 5))];
        x.beginPath(); x.arc(sx, sy, R, 0, Math.PI * 2);
        if (u > 0.25) { const inner = R * (u - 0.2) * 1.2; x.moveTo(sx + inner, sy); x.arc(sx, sy, inner, 0, Math.PI * 2, true); }
        x.fill('evenodd');
        for (let i = 0; i < (p.huge ? 16 : 8); i++) {
          const a = (i / (p.huge ? 16 : 8)) * 6.283 + r(i), d = R * 1.5;
          fill(x, '#ffd34a', sx + Math.cos(a) * d, sy + Math.sin(a) * d, p.huge ? 4 : 2, p.huge ? 4 : 2);
        }
        break;
      }
      case 'shards': {
        if (age > 0.5) break;
        for (let i = 0; i < 6; i++) {
          const a = Math.PI + (r(i) - 0.5) * 2.4, sp = 120 + 80 * r(i + 5);
          const fx = sx + Math.cos(a) * sp * age, fy = sy + Math.sin(a) * sp * age * 0.6 - 120 * age + 500 * age * age;
          x.globalAlpha = 1 - age / 0.5;
          fill(x, '#2a2a38', fx - 3, fy - 3, 6, 6); fill(x, '#a8a8bc', fx - 2, fy - 2, 4, 3);
        }
        x.globalAlpha = 1;
        break;
      }
      case 'clip': {
        if (age > 0.7) break;
        for (let i = 0; i < 9; i++) {
          const a = (r(i) - 0.5) * Math.PI * 1.6 - Math.PI / 2 + 0.6, sp = 80 + 120 * r(i + 9);
          const z = 160 * age * (0.6 + r(i + 2) * 0.6) - 420 * age * age;
          const fx = sx + Math.cos(a) * sp * age + 30 * age, fy = sy + Math.sin(a) * sp * age * 0.4 - Math.max(0, z);
          x.globalAlpha = clamp01(1.4 - age * 2);
          x.save(); x.translate(Math.round(fx), Math.round(fy)); x.rotate(Math.floor(age * 18 + i) * 0.8);
          fill(x, '#1e5a22', -3, -1, 7, 3); fill(x, i % 2 ? '#7cd85a' : '#4aa83a', -2, -1, 5, 2);
          x.restore();
        }
        x.globalAlpha = 1;
        break;
      }
      case 'sparkle': {
        if (age > 0.4) break;
        const u = age / 0.4;
        for (let i = 0; i < 4; i++) {
          const a = i * 1.57 + 0.6 + u, d = 6 + 20 * u;
          star4(x, Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d), Math.round(4 * (1 - u)) + 1, p.pink ? '#ffc0d0' : '#fffbe0');
        }
        if (age < 0.08) star4(x, Math.round(sx), Math.round(sy), 7, '#ffffff');
        break;
      }
      case 'sparks': {
        if (age > 0.3) break;
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (r(i) - 0.5) * 2.6, sp = 150 + 120 * r(i + 4);
          const fx = sx + Math.cos(a) * sp * age, fy = sy + Math.sin(a) * sp * age + 600 * age * age;
          x.globalAlpha = 1 - age / 0.3;
          fill(x, i % 2 ? '#fff6a0' : '#ffb43a', fx - 1, fy - 1, 3, 3);
        }
        x.globalAlpha = 1;
        break;
      }
      case 'roar': {
        if (age > 0.3) break;
        const u = age / 0.3;
        x.strokeStyle = '#ffd0d8'; x.globalAlpha = 0.8 * (1 - u); x.lineWidth = 3;
        x.beginPath(); x.arc(sx, sy, 30 + 120 * u, Math.PI * 0.15, Math.PI * 0.85); x.stroke();
        x.beginPath(); x.arc(sx, sy, 30 + 120 * u, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
        x.globalAlpha = 1;
        break;
      }
      case 'burst': {
        if (age > 0.6) break;
        const u = age / 0.6;
        x.save();
        x.globalAlpha = 1 - u;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * 6.283 + u * 0.6, d0 = 24 + 220 * u, d1 = d0 + 30 + 40 * (1 - u);
          x.strokeStyle = i % 2 ? (p.gold ? '#ffe27a' : '#ffb0c0') : '#ffffff'; x.lineWidth = 3;
          x.beginPath(); x.moveTo(sx + Math.cos(a) * d0, sy + Math.sin(a) * d0); x.lineTo(sx + Math.cos(a) * d1, sy + Math.sin(a) * d1); x.stroke();
        }
        x.restore();
        break;
      }
    }
  }
}

// ---------- hero ----------
const FACE_ANG = { right: 0, down: 90, left: 180, up: -90 };
const angFace = (deg) => { const a = ((deg % 360) + 540) % 360 - 180; return a > -45 && a <= 45 ? 'right' : a > 45 && a <= 135 ? 'down' : a < -45 && a >= -135 ? 'up' : 'left'; };
function slashAt(g) { return SLASHES.find((s) => g >= s.g && g < s.g + SLASH_D + 0.06) ?? null; }
const SLASH_ARC = { right: [-125, 62], left: [-55, -242], up: [-205, 25], down: [10, 170] };

function heroPose(g) {
  const p = heroXY(g);
  let face = heroFace(g), x = p.x, y = p.y, z = 0;
  const sp = Math.hypot(p.vx, p.vy);
  const o = { lift: [0, 0], stride: [0, 0], lean: 0, sx: 1, sy: 1 };
  let sword = { show: true, ang: null, trail: null, pivot: null, glow: 0 };
  if (sp > 20) {
    const ph = g * 2 * Math.PI * 4.2, s = Math.sin(ph);
    o.lift = [Math.round(Math.max(0, s) * 5), Math.round(Math.max(0, -s) * 5)];
    o.stride = [Math.round(s * 1.5), Math.round(-s * 1.5)];
    z += Math.abs(Math.cos(ph)) * 2;
    o.lean = (face === 'left' ? -1 : face === 'right' ? 1 : 0) * 0.04;
  }
  const sl = slashAt(g);
  if (sl) {
    const u = clamp01((g - sl.g) / SLASH_D), e = 1 - (1 - u) * (1 - u) * (1 - u);
    const [a0, a1] = SLASH_ARC[sl.dir], a = a0 + (a1 - a0) * e;
    const dv = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[sl.dir];
    sword = { show: true, ang: a, pivot: [dv[0] * 10, -30 + dv[1] * 14], trail: u < 1 ? [a0 + (a1 - a0) * Math.max(0, e - 0.55), a] : null, trailA: 1 - clamp01((g - sl.g - SLASH_D) / 0.06) };
    if (u >= 1) sword.trail = null;
    o.lean = (dv[0]) * 0.08; o.sx = 1 + 0.06 * Math.sin(u * Math.PI); o.sy = 1 - 0.05 * Math.sin(u * Math.PI);
  }
  if (g >= HURT.g && g < HURT.g + 0.16) { o.lean = -0.12; o.sy = 0.92; o.sx = 1.06; }
  if (g >= SPIN.c0 && g < SPIN.g0) {
    sword = { show: true, ang: -8 + Math.sin(g * 60) * (g > SPIN.full ? 2 : 0), pivot: [12, -30], glow: clamp01((g - SPIN.c0) / (SPIN.full - SPIN.c0)) };
    o.lean = -0.04; o.lift = [0, 2];
  }
  if (g >= SPIN.g0 && g < SPIN.g1 + 0.08) {
    const u = clamp01((g - SPIN.g0) / (SPIN.g1 - SPIN.g0)), e = 1 - (1 - u) ** 2;
    const a = -8 - 380 * e;
    face = angFace(a);
    sword = { show: true, ang: a, pivot: [0, -30], trail: u < 1 ? [Math.max(-388, a + 0) + 0, a, 'spin'] : null, spin: true, trailA: 1 - clamp01((g - SPIN.g1) / 0.08) };
    sword.trail = [a + Math.min(300, 380 * e), a, 'spin'];
  }
  if (g >= PUSH.t0 && g < PUSH.t1) {
    sword.show = false;
    o.lean = -0.16; o.stride = [-2, 2];
    const st = Math.floor(g * 14) % 2;
    o.lift = st ? [3, 0] : [0, 3];
    x += Math.sin(g * 90) * 0.8;
  }
  if (g >= DASH.g0 && g < DASH.g1 + 0.04) { o.lean = 0.14; o.lift = [4, 4]; }
  if (g >= LEAP.g0 && g < LEAP.g1) {
    const u = (g - LEAP.g0) / (LEAP.g1 - LEAP.g0);
    z += 52 * Math.sin(u * Math.PI);
    const su = clamp01((g - (LEAP.g0 + 0.02)) / (LEAP.hit + 0.04 - LEAP.g0 - 0.02)), e = 1 - (1 - su) ** 2;
    const a = -90 - 400 * e;
    face = angFace(a);
    sword = { show: true, ang: a, pivot: [0, -32], trail: su > 0 && su < 1 ? [a + Math.min(300, 400 * e), a, 'spin'] : null, spin: true, trailA: 1 };
    o.lift = [5, 5];
  }
  if (g >= LEAP.g1 && g < LEAP.g1 + 0.1) { const s = Math.sin(((g - LEAP.g1) / 0.1) * Math.PI); o.sy = 1 - 0.14 * s; o.sx = 1 + 0.12 * s; }
  if (g >= HOLD) sword.show = false;
  return { x, y, z, face, o, sword, moving: sp > 20 };
}

function drawSword(x, hx, hy, deg, { glow = 0, white = false } = {}) {
  x.save();
  x.translate(Math.round(hx), Math.round(hy));
  x.rotate(deg * DEG + Math.PI / 2);
  if (glow > 0) {
    x.globalAlpha = glow * 0.8;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0]]) x.drawImage(ART.swordSil, -6 + dx, -50 + dy);
    x.globalAlpha = 1;
  }
  x.drawImage(white ? ART.swordSil : ART.sword, -6, -50);
  x.restore();
}
// crescent between radius r0..r1 from angle a0 to a1 (deg); alpha fades toward a0
function drawTrail(x, cx, cy, a0, a1, r0, r1, alpha, spin = false) {
  const n = 10, dir = a1 > a0 ? 1 : -1, span = Math.abs(a1 - a0);
  if (span < 1) return;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const b0 = (a0 + dir * span * t0) * DEG, b1 = (a0 + dir * span * t1) * DEG;
    const k = t1, ri = r1 - (r1 - r0) * (0.12 + 0.5 * k);
    x.globalAlpha = alpha * (0.25 + 0.75 * k);
    x.fillStyle = k > 0.7 ? '#ffffff' : spin ? '#8ae8ff' : '#bfefff';
    x.beginPath();
    x.arc(cx, cy, r1, Math.min(b0, b1), Math.max(b0, b1));
    x.arc(cx, cy, ri, Math.max(b0, b1), Math.min(b0, b1), true);
    x.closePath(); x.fill();
  }
  x.globalAlpha = 1;
}
function drawFist(x, hx, hy) {
  fill(x, '#3a1e1a', hx - 3, hy - 3, 7, 7);
  fill(x, '#e0c8b8', hx - 2, hy - 2, 5, 5);
  fill(x, '#b89888', hx - 2, hy + 1, 5, 1);
}

function drawHero(x, g, ox, oy, stop, sl) {
  const H = heroPose(g);
  const sx = H.x - ox, sy = H.y - oy, fy = sy - H.z;
  const flip = H.face === 'right' || H.face === 'up';
  const R = H.face === 'up' ? ART.heroBack : ART.hero;
  let alpha = 1;
  if (g >= HURT.g + 0.16 && g < HURT.t1 && Math.floor(g * 30) % 2) alpha = 0.25;
  if (area(g) === 'over' && g > FADE_DUN.t0) alpha *= clamp01(1 - (g - FADE_DUN.t0) / 0.15);
  if (alpha <= 0.01) return;
  const white = (stop?.kind === 'hurt') || (g >= HURT.g && g < HURT.g + 0.05);
  const red = g >= HURT.g && g < HURT.g + 0.3 && Math.floor(g * 40) % 2 === 0;
  shadow(x, sx, sy - 1, 17, 5, 0.32 * (1 - H.z / 120));
  // dash after-images
  if (g >= DASH.g0 && g < DASH.g1 + 0.06) {
    for (let i = 3; i >= 1; i--) { const q = heroXY(g - i * 0.025); A.drawRemy(x, R, q.x - ox, q.y - oy, { ...H.o, flip, white: true, alpha: 0.16 * (4 - i) }); }
  }
  const handX = sx + (flip ? -ART.hand.x : ART.hand.x), handY = fy + ART.hand.y;
  const sw = H.sword;
  let swX = handX, swY = handY, ang = sw.ang;
  if (sw.pivot) { swX = sx + sw.pivot[0]; swY = fy + sw.pivot[1]; }
  if (ang == null) ang = flip ? -69 : -111;
  const behind = sw.show && (H.face === 'up' && !sw.trail && !sw.spin);
  const swordOpts = { glow: sw.glow > 0 ? (g > SPIN.full ? 0.6 + 0.4 * Math.sin(g * 50) : sw.glow * 0.5) : 0, white: g > SPIN.full && g < SPIN.g0 && Math.floor(g * 20) % 2 === 0 };
  // spin trail behind everything
  if (sw.trail) drawTrail(x, swX, swY, sw.trail[0], sw.trail[1], 14, 64, (sw.trailA ?? 1) * 0.9, sw.trail[2] === 'spin');
  if (behind) { drawSword(x, swX, swY, ang, swordOpts); }
  A.drawRemy(x, R, sx, fy, { ...H.o, flip, alpha, white: white || (red && false), glow: red ? '#ff2a3a' : g >= SPIN.full && g < SPIN.g1 ? '#8ae8ff' : null, glowA: red ? 1 : 0.5 + 0.4 * Math.sin(g * 40) });
  if (sw.show && !behind) {
    x.save(); x.globalAlpha = alpha;
    drawSword(x, swX, swY, ang, swordOpts);
    if (!sw.pivot) drawFist(x, handX, handY);
    x.restore();
  }
  // charge sparkles streaming into the blade
  if (g >= SPIN.c0 && g < SPIN.g0) {
    for (let i = 0; i < 8; i++) {
      const ph = ((g * 3 + i / 8) % 1), a = i * 2.4 + Math.floor(g * 3 + i / 8) * 1.3, d = 70 * (1 - ph);
      const tx = swX + Math.cos(-8 * DEG) * 40, ty = swY + Math.sin(-8 * DEG) * 40;
      star4(x, Math.round(tx + Math.cos(a) * d), Math.round(ty + Math.sin(a) * d * 0.7), Math.round(1 + 2 * ph), i % 2 ? '#8ae8ff' : '#ffffff');
    }
    if (g >= SPIN.full && g < SPIN.full + 0.1) star4(x, Math.round(swX + 50), Math.round(swY - 7), Math.round(10 * (1 - (g - SPIN.full) / 0.1)), '#ffffff');
  }
  // push: sweat + hands on the block
  if (g >= PUSH.t0 && g < PUSH.t1) {
    drawFist(x, sx - 26, fy - 30);
    for (let i = 0; i < 2; i++) {
      const ph = (g * 2.5 + i * 0.5) % 1;
      x.globalAlpha = 1 - ph;
      fill(x, '#141020', sx + 12 + i * 8 + ph * 10, fy - 74 - ph * 6 + ph * ph * 20, 4, 5);
      fill(x, '#a8e0ff', sx + 13 + i * 8 + ph * 10, fy - 73 - ph * 6 + ph * ph * 20, 2, 3);
      x.globalAlpha = 1;
    }
  }
  // hold the tonic overhead
  if (g >= HOLD) {
    const lift = clamp01((g - HOLD) / 0.1);
    const top = fy - 78 - 10 * lift;
    for (const s of [-1, 1]) {
      x.strokeStyle = '#141020'; x.lineWidth = 7; x.beginPath(); x.moveTo(sx + s * 13, fy - 34); x.lineTo(sx + s * 28, fy - 60); x.lineTo(sx + s * 9, top + 8); x.stroke();
      x.strokeStyle = '#2d3d49'; x.lineWidth = 5; x.beginPath(); x.moveTo(sx + s * 13, fy - 34); x.lineTo(sx + s * 28, fy - 60); x.lineTo(sx + s * 9, top + 10); x.stroke();
      drawFist(x, sx + s * 9, top + 6);
    }
    // radiance
    x.save(); x.translate(Math.round(sx), Math.round(top - 10));
    x.globalAlpha = 0.35 * lift;
    for (let i = 0; i < 12; i++) {
      x.rotate(Math.PI / 6 + (i === 0 ? g * 0.8 : 0));
      x.fillStyle = i % 2 ? '#fff6c0' : '#ffe27a';
      x.beginPath(); x.moveTo(0, 0); x.lineTo(-7, -70); x.lineTo(7, -70); x.closePath(); x.fill();
    }
    x.restore();
    x.drawImage(ART.tonic, Math.round(sx - 9), Math.round(top - 22));
    if (Math.floor(g * 8) % 2) star4(x, Math.round(sx + 8), Math.round(top - 18), 4, '#ffffff');
  }
}

// ---------- enemies ----------
function drawEnemy(x, e, g, ox, oy) {
  if (e.spawn > 0 && g < e.spawn + 0.16) return null;
  const p = enemyAt(e, g);
  if (p.state === 'dead') return null;
  const R = ART.enemies[e.spr], sx = p.x - ox, sy = p.y - oy;
  return {
    y: p.y,
    draw: () => {
      shadow(x, sx, sy - 1, 17, 5);
      if (p.state === 'walk') {
        const step = Math.floor(g / 0.15 + e.spr) % 2, moving = Math.hypot(p.vx, p.vy) > 5;
        const o = { flip: p.vx > 5, lift: moving ? (step ? [4, 0] : [0, 4]) : [0, 0], lean: Math.max(-0.06, Math.min(0.06, p.vx / 3000)) };
        let yy = sy - (moving && step ? 1 : 0);
        if (e.spit && g >= e.spit - 0.12 && g < e.spit + 0.12) { const u = (g - e.spit + 0.12) / 0.24; o.sy = u < 0.5 ? 1 - 0.12 * Math.sin(u * 2 * Math.PI) : 1 + 0.1 * Math.sin((u - 0.5) * 2 * Math.PI); o.sx = 2 - o.sy; }
        A.drawRemy(x, R, sx, yy, o);
        if (e.spit && g >= e.spit && g < e.spit + 0.1) star4(x, Math.round(sx - 30), Math.round(sy - 38), 5, '#ffffff');
      } else {
        const dt = g - e.hit;
        const flash = dt < 0.04 ? 'white' : Math.floor(dt * 40) % 2 ? 'red' : 'white';
        A.drawRemy(x, R, sx, sy, { white: flash === 'white', glow: flash === 'red' ? '#ff2040' : null, glowA: 1, lift: [3, 3], lean: e.kb[0] * -0.1, sx: 1 + 0.1 * Math.sin(dt * 40), sy: 1 - 0.08 * Math.sin(dt * 40) });
      }
    },
  };
}

function drawBoss(x, g, ox, oy) {
  if (g >= BOSS_DIE.t1) return null;
  const b = bossAt(g), R = ART.boss, sx = b.x - ox, sy = b.y - oy;
  return {
    y: b.y,
    draw: () => {
      shadow(x, sx, sy - 2, 46, 11, 0.4);
      const o = { lift: [0, 0], sx: 1, sy: 1 };
      const breathe = Math.sin(g * 5) * 0.015;
      o.sy = 1 + breathe; o.sx = 1 - breathe;
      if (g >= ROAR.t0 && g < ROAR.t1) { const u = (g - ROAR.t0) / (ROAR.t1 - ROAR.t0); o.sy = 1 + 0.08 * Math.sin(u * Math.PI); o.sx = 1 + 0.03 * Math.sin(g * 70); }
      if (g >= CHARGE.t0 && g < CHARGE.t1) { const st = Math.floor(g * 16) % 2; o.lift = st ? [10, 0] : [0, 10]; o.lean = 0.06; }
      let white = false, glow = null, alpha = 1;
      for (const h of BOSS_HITS) { const dt = g - h; if (dt >= 0 && dt < 0.28) { white = dt < 0.05 || Math.floor(dt * 36) % 2 === 0; glow = white ? null : '#ff2040'; o.sx *= 1 + 0.08 * Math.exp(-dt * 20); o.sy *= 1 - 0.08 * Math.exp(-dt * 20); } }
      if (g >= BOSS_DIE.t0 + 0.28) { const f = Math.floor(g * 30) % 3; white = f === 0; glow = f === 1 ? '#ff6a2a' : null; alpha = f === 2 ? 0.55 : 1; x.save(); x.translate(Math.sin(g * 97) * 3, 0); }
      // spear held upright in his fist until the throw
      const handX = sx - 34, handY = sy - 38;
      const raise = g >= SPEAR.wind ? clamp01((g - SPEAR.wind) / 0.06) : 0;
      if (g < SPEAR.g0) { x.save(); x.translate(Math.round(handX), Math.round(handY - 30 * raise)); x.rotate(Math.PI - raise * 0.4); x.drawImage(ART.spear, -7, -16); x.restore(); }
      const aura = !white && !glow && g < BOSS_DIE.t0 ? '#8a1040' : glow;
      A.drawRemy(x, R, sx, sy, { ...o, white, glow: aura, glowA: glow ? 1 : 0.55 + 0.25 * Math.sin(g * 9), alpha });
      if (g < SPEAR.g0) drawFist(x, handX, handY - 30 * raise);
      if (alpha === 1) {
        // Moblin tusks
        for (const tx of [sx + 1, sx + 15]) { x.fillStyle = '#141020'; x.beginPath(); x.moveTo(tx - 3, sy - 71); x.lineTo(tx + 3, sy - 71); x.lineTo(tx, sy - 84); x.closePath(); x.fill(); x.fillStyle = white ? '#ffffff' : '#fff4d8'; x.beginPath(); x.moveTo(tx - 2, sy - 72); x.lineTo(tx + 2, sy - 72); x.lineTo(tx, sy - 82); x.closePath(); x.fill(); }
        // angry glowing eyes during the roar / charge
        if ((g >= ROAR.t0 && g < ROAR.t1) || (g >= CHARGE.t0 && g < 9.6)) for (const [ex, ey] of [[-9, -92], [19, -96]]) { fill(x, '#ff2a3a', sx + ex, sy + ey, 7, 5); fill(x, '#fff0a0', sx + ex + 2, sy + ey + 1, 3, 2); }
      }
      if (g >= BOSS_DIE.t0 + 0.28) x.restore();
    },
  };
}
function drawSpear(x, g, ox, oy) {
  if (g < SPEAR.g0) return;
  let px = 446, py;
  if (g < SPEAR.g1) { const u = (g - SPEAR.g0) / (SPEAR.g1 - SPEAR.g0); py = 120 + (404 - 120) * u; }
  else py = 404;
  const wob = g >= SPEAR.g1 ? Math.sin((g - SPEAR.g1) * 60) * Math.exp(-(g - SPEAR.g1) * 8) * 0.12 : 0;
  if (g < SPEAR.g1) for (let k = 1; k < 4; k++) { x.globalAlpha = 0.25 - k * 0.06; x.drawImage(ART.spear, Math.round(px - 7 - ox), Math.round(py - 90 - k * 22 - oy)); }
  x.globalAlpha = 1;
  x.save(); x.translate(Math.round(px - ox), Math.round(py - oy)); x.rotate(wob); x.drawImage(ART.spear, -7, -90); x.restore();
}

// ---------- world layers ----------
function drawOverworld(x, g, c) {
  x.drawImage(ART.bgA, -Math.round(c.x), HUD);
  if (c.x > 0) x.drawImage(ART.bgB, 960 - Math.round(c.x), HUD);
  // water sparkles
  for (const [def, base] of [[SCREEN_A, 0], [SCREEN_B, 960]]) {
    const dx = base - c.x;
    if (dx <= -960 || dx >= 960) continue;
    for (const [px, py, ph] of def.sparkles) {
      const k = (g * 1.6 + ph) % 1;
      if (k > 0.3) continue;
      const r = k < 0.1 ? 1 : k < 0.2 ? 2 : 1;
      x.fillStyle = k < 0.2 ? '#ffffff' : '#c8e8ff';
      x.fillRect(Math.round(px + dx) - r, py + HUD, r * 2 + 1, 1);
      if (r > 1) x.fillRect(Math.round(px + dx), py + HUD - 1, 1, 3);
    }
    for (const [fx, fy] of def.flowers) { const f = ART.flowers[Math.floor(g * 3 + fx * 0.1) % 2][(fx + fy) % 3]; x.drawImage(f, Math.round(fx + dx - 9), fy + HUD - 16, 18, 18); }
    if (def.facade) {
      // torches on the facade
      for (const tx of [def.facade[0] - 64, def.facade[0] + 64]) torch(x, tx + dx, HUD + 70, g + tx * 0.01, 0.8);
    }
  }
}
function torch(x, cx, cy, g, k = 1) {
  const f = Math.floor(g * 14) % 3;
  x.save();
  x.globalCompositeOperation = 'lighter';
  const gl = x.createRadialGradient(cx, cy - 6, 0, cx, cy - 6, 60 * k);
  gl.addColorStop(0, 'rgba(255,170,60,0.32)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
  x.fillStyle = gl; x.fillRect(cx - 60 * k, cy - 66 * k, 120 * k, 120 * k);
  x.restore();
  const h = [14, 17, 12][f] * k, w = 9 * k;
  x.fillStyle = '#d8301a'; x.beginPath(); x.moveTo(cx - w, cy); x.quadraticCurveTo(cx - w * 0.6 + f, cy - h * 0.8, cx + (f - 1) * 2, cy - h - 4); x.quadraticCurveTo(cx + w * 0.6, cy - h * 0.6, cx + w, cy); x.closePath(); x.fill();
  x.fillStyle = '#ffb030'; x.beginPath(); x.moveTo(cx - w * 0.6, cy); x.quadraticCurveTo(cx - w * 0.3, cy - h * 0.6, cx + (f - 1), cy - h * 0.8); x.quadraticCurveTo(cx + w * 0.4, cy - h * 0.4, cx + w * 0.6, cy); x.closePath(); x.fill();
  x.fillStyle = '#fff6c0'; x.fillRect(Math.round(cx - 2), Math.round(cy - h * 0.4), 4, Math.round(h * 0.4));
}
const TORCHES1 = [[150, 60], [810, 60], [26, 220], [934, 220]];
const TORCHES2 = [[160, 60], [320, 60], [640, 60], [800, 60], [26, 160], [934, 160], [26, 320], [934, 320]];
function drawDungeon(x, g, c) {
  const y1 = 440 - c.y + HUD, y2 = 0 - c.y + HUD;
  if (y1 < LH) {
    x.drawImage(ART.room1, 0, Math.round(y1));
    for (const [tx, ty] of TORCHES1) { x.drawImage(ART.bowl, tx - 14, Math.round(y1 + ty - 12)); torch(x, tx, y1 + ty + 2, g + tx * 0.013); }
    // north shutter
    const op = clamp01((g - SHUTTER_OPEN.t0) / (SHUTTER_OPEN.t1 - SHUTTER_OPEN.t0));
    shutter(x, 480, y1, 1 - op, true);
  }
  if (y2 > HUD - 440) {
    x.drawImage(ART.room2, 0, Math.round(y2));
    for (const [tx, ty] of TORCHES2) { x.drawImage(ART.bowl, tx - 14, Math.round(y2 + ty - 12)); torch(x, tx, y2 + ty + 2, g + tx * 0.017, 1.1); }
    const cl = clamp01((g - SHUTTER_CLOSE.t0) / (SHUTTER_CLOSE.t1 - SHUTTER_CLOSE.t0));
    const reopen = clamp01((g - (BOSS_DIE.t1 + 0.2)) / 0.25);
    shutter(x, 480, y2, cl * (1 - reopen), false);
    shutter(x, 480, y2, 1 - reopen, true);
  }
}
function shutter(x, cx, ry, k, north) {
  if (k <= 0) return;
  const top = north ? ry + 18 : ry + 400, h = north ? 66 : 40;
  const hh = Math.round(h * k);
  x.save(); x.beginPath(); x.rect(cx - 26, top, 52, h); x.clip();
  const y0 = north ? top + h - hh - (h - hh) : top;
  for (let i = 0; i < 4; i++) {
    const bx = cx - 22 + i * 12;
    fill(x, '#141020', bx, north ? top : top, 9, hh);
    fill(x, '#9aa0c8', bx + 1, north ? top : top, 6, hh - 1);
    fill(x, '#dfe4ff', bx + 1, north ? top : top, 2, hh - 1);
  }
  fill(x, '#141020', cx - 26, (north ? top + hh - 6 : top + hh - 6), 52, 6);
  fill(x, '#6a70a0', cx - 25, (north ? top + hh - 5 : top + hh - 5), 50, 4);
  x.restore();
}

// ---------- props (sortable) ----------
function propsFor(x, g, c) {
  const items = [];
  const ox = c.x, oy = c.y - HUD;
  if (area(g) === 'over') {
    for (const t of GRASS) {
      const sx = t.x - ox;
      if (sx < -40 || sx > LW + 40) continue;
      const cut = t.cut && g >= t.cut;
      items.push({ y: t.y, draw: () => x.drawImage(cut ? ART.stub : ART.tuft[Math.floor(g * 2.5 + t.x * 0.05) % 2], Math.round(sx - 17), Math.round(t.y - oy - 30)) });
    }
  } else {
    // The left floor switch lights when the block settles on it; the matching shutter opens.
    const lit = g >= PUSH.b1;
    fill(x, '#0c0c1c', BLOCK.x1 - 24 - ox, BLOCK.y - 38 - oy, 48, 42);
    fill(x, lit ? '#ffe27a' : '#7884c4', BLOCK.x1 - 22 - ox, BLOCK.y - 36 - oy, 44, 38);
    fill(x, lit ? '#8aa850' : '#3c4466', BLOCK.x1 - 18 - ox, BLOCK.y - 32 - oy, 36, 30);
    const bx = g < PUSH.b0 ? BLOCK.x0 : g < PUSH.b1 ? BLOCK.x0 + (BLOCK.x1 - BLOCK.x0) * ((g - PUSH.b0) / (PUSH.b1 - PUSH.b0)) : BLOCK.x1;
    items.push({ y: BLOCK.y - 2, draw: () => x.drawImage(ART.block, Math.round(bx - 20 - ox), Math.round(BLOCK.y - 44 - oy)) });
  }
  for (const p of PICKUPS) {
    if (g < p.g0 || g >= p.g) continue;
    if (area(g) !== (p.kind === 'heart' || p.x > 900 ? 'over' : 'over')) continue;
    const age = g - p.g0;
    if (age > 2.2 && Math.floor(g * 16) % 2) continue;
    const hop = age < 0.3 ? 26 * Math.sin((age / 0.3) * Math.PI) : 2 * Math.abs(Math.sin(g * 4 + p.x));
    items.push({ y: p.y, draw: () => {
      shadow(x, p.x - ox, p.y - oy, 7, 3, 0.3);
      const art = p.kind === 'heart' ? ART.heartS : (p.kind === 'gem5' ? ART.gem5 : ART.gem)[Math.floor(g * 6) % 4];
      x.drawImage(art, Math.round(p.x - ox - art.width / 2), Math.round(p.y - oy - art.height - hop));
    } });
  }
  return items;
}

function drawRock(x, g, ox, oy) {
  const r = rock(g);
  if (!r) return;
  const sx = Math.round(r.x - ox), sy = Math.round(r.y - oy - r.z);
  shadow(x, sx, r.y - oy + 30, 6, 2, 0.3);
  for (let k = 1; k < 4; k++) { x.globalAlpha = 0.3 - k * 0.07; fill(x, '#ffffff', sx + k * 9 - 4, sy - 3, 7, 6); }
  x.globalAlpha = 1;
  x.fillStyle = '#141020'; x.beginPath(); x.arc(sx, sy, 7, 0, 7); x.fill();
  x.fillStyle = '#8c8ca2'; x.beginPath(); x.arc(sx, sy, 6, 0, 7); x.fill();
  fill(x, '#e2e2f0', sx - 3, sy - 4, 3, 2);
}

function drawTonic(x, g, ox, oy) {
  if (g < TONIC.g0 || g >= HOLD) return;
  const age = g - TONIC.g0, y = TONIC.y - 40 * Math.max(0, 1 - age / 0.2) - 3 * Math.sin(g * 6);
  shadow(x, TONIC.x - ox, TONIC.y - oy + 18, 9, 3, 0.3);
  x.save(); x.globalAlpha = 0.45; x.fillStyle = '#9dffb0'; x.beginPath(); x.arc(TONIC.x - ox, y - oy, 18 + 3 * Math.sin(g * 30), 0, 7); x.fill(); x.restore();
  x.drawImage(ART.tonic, Math.round(TONIC.x - ox - 9), Math.round(y - oy - 13));
}

// ---------- popups ----------
const POPS = [];
for (const p of PICKUPS) if (p.g < 50) POPS.push([p.g, p.x, p.y - 30, p.kind === 'heart' ? '♥' : '+' + p.v, p.kind === 'heart' ? '#ff8aa0' : p.v === 5 ? '#8ac8ff' : '#8affa0']);
POPS.push([HURT.g, 1095, 160, '-2', '#ff4a5a']);
POPS.push([SPIN.hit, 1055, 120, '×3 COMBO!', '#ffe27a']);
POPS.push([BOSS_HITS[2], 530, 60, 'CRITICAL!', '#ffe27a']);
function drawPopups(x, g, ox, oy) {
  for (const [t, px, py, s, col] of POPS) {
    const a = g - t;
    if (a < 0 || a > 0.75) continue;
    if (area(t) !== area(g)) continue;
    text(x, s, px - ox, py - oy - 34 * Math.sqrt(a / 0.75), { size: s.length > 4 ? 16 : 16, align: 'center', color: col, alpha: clamp01((0.75 - a) / 0.15) });
  }
}

// ---------- HUD (NES-style band) ----------
function drawHud(x, g) {
  fill(x, '#000000', 0, 0, LW, HUD);
  const dun = area(g) === 'dun';
  // map
  text(x, dun ? 'LEVEL-1' : 'HYRAIR', 28, 10, { size: 8, color: '#ffffff', shadow: null });
  fill(x, dun ? '#000000' : '#5c5c5c', 28, 26, 176, 60);
  if (dun) {
    const cells = [[3, 4], [3, 3], [3, 2], [2, 2], [4, 2], [3, 1]];
    for (const [cx, cy] of cells) fill(x, '#2038ec', 28 + cx * 26 + 4, 26 + cy * 14 + 2, 22, 10);
    const here = g < SCROLL_UP.t1 - 0.2 ? [3, 3] : [3, 2];
    if (Math.floor(g * 4) % 2 === 0) fill(x, '#80d010', 28 + here[0] * 26 + 11, 26 + here[1] * 14 + 4, 8, 6);
    fill(x, '#e04030', 28 + 3 * 26 + 12, 26 + 14 + 4, 6, 6);
  } else {
    const col = g < (SCROLL_AB.t0 + SCROLL_AB.t1) / 2 ? 9 : 10;
    if (Math.floor(g * 4) % 2 === 0) fill(x, '#80d010', 28 + col * 11, 26 + 5 * 7.5, 8, 7);
  }
  // counters
  const gems = hudGems(g), pulse = PICKUPS.some((p) => g >= p.g && g < p.g + 0.15);
  x.drawImage(ART.gem[Math.floor(g * 6) % 4], 236, 18);
  text(x, '×' + String(gems).padStart(3, '0'), 254, 22, { size: 16, color: pulse ? '#fff6a0' : '#ffffff', shadow: null });
  x.drawImage(ART.key, 237, 46);
  text(x, '×' + (dun ? '1' : '0'), 254, 48, { size: 16, shadow: null });
  x.drawImage(ART.bomb, 234, 70);
  text(x, '×06', 254, 74, { size: 16, shadow: null });
  // B / A boxes
  for (const [bx, lab] of [[408, 'B'], [476, 'A']]) {
    fill(x, '#2038ec', bx, 28, 44, 62); fill(x, '#000000', bx + 4, 32, 36, 54);
    fill(x, '#000000', bx + 14, 22, 16, 12);
    text(x, lab, bx + 15, 23, { size: 16, shadow: null });
  }
  if (g >= HOLD + 0.3) x.drawImage(ART.tonic, 408 + 13, 46);
  x.save(); x.translate(476 + 22, 58); x.rotate(0); x.drawImage(ART.sword, -6, -26, 13, 56 * 0.95); x.restore();
  // life
  text(x, '-LIFE-', 670, 18, { size: 16, color: '#d82800', shadow: null });
  const hp = hudLife(g), low = hp <= 1;
  const lost = g >= HURT.g && g < HURT.g + 0.6, gained = (g >= 4.98 && g < 5.4) || (g >= REFILL.t0 && g < REFILL.t1 + 0.3);
  for (let i = 0; i < 5; i++) {
    let art = ART.hearts[i < hp ? 2 : 0];
    if (i < hp && low && Math.floor(g * 6) % 2) art = ART.heartWhite;
    if (lost && (i === 1 || i === 2) && Math.floor(g * 16) % 2) art = ART.heartWhite;
    if (gained && i === hp - 1 && Math.floor(g * 16) % 2) art = ART.heartWhite;
    x.drawImage(art, 640 + i * 32, 50);
  }
}

// ---------- boss card / text box / banners ----------
function drawBossCard(x, g) {
  const t0 = 8.6, t1 = 9.35;
  if (g < t0 || g > t1) return;
  const u = g - t0, out = clamp01((t1 - g) / 0.12);
  const slide = u < 0.12 ? (1 - u / 0.12) ** 2 : 0;
  x.save(); x.globalAlpha = out;
  const by = HUD + 340;
  fill(x, 'rgba(10,0,10,0.8)', 0, by, LW, 64);
  fill(x, '#d82838', 0, by, LW, 3); fill(x, '#d82838', 0, by + 61, LW, 3);
  text(x, 'BOSS', 120 - slide * 400, by + 14, { size: 8, color: '#ff8a9a', shadow: null });
  text(x, 'CABALD MOBLIN', 120 - slide * 600, by + 28, { size: 24, color: '#ffffff', shadow: '#6a0a18' });
  text(x, 'KEEPER OF THE SHINE', LW - 120 + slide * 600, by + 34, { size: 8, color: '#ffb0b8', align: 'right', shadow: null });
  x.restore();
}
function drawTextBox(x, g) {
  if (g < TEXT.t0 - 0.06) return;
  const open = clamp01((g - TEXT.t0 + 0.06) / 0.06);
  const bx = 150, by = HUD + 298, bw = 660, bh = 104;
  const hh = Math.round(bh * open);
  fill(x, '#ffffff', bx - 4, by + (bh - hh) / 2 - 4, bw + 8, hh + 8);
  fill(x, '#101038', bx, by + (bh - hh) / 2, bw, hh);
  fill(x, '#2a2a70', bx + 4, by + (bh - hh) / 2 + 4, bw - 8, 2);
  if (open < 1) return;
  // Reward copy lands together, leaving over three seconds to read the two-line message.
  const l1 = TEXT.l1, l2 = TEXT.l2;
  // highlight HAIR TONIC
  const pre = 'You got the ', hi = 'HAIR TONIC';
  text(x, l1.slice(0, pre.length), bx + 30, by + 26, { size: 16 });
  if (l1.length > pre.length) text(x, l1.slice(pre.length, pre.length + hi.length), bx + 30 + pre.length * 16, by + 26, { size: 16, color: '#ff5a4a' });
  if (l1.length > pre.length + hi.length) text(x, l1.slice(pre.length + hi.length), bx + 30 + (pre.length + hi.length) * 16, by + 26, { size: 16 });
  if (l2) text(x, l2, bx + 30, by + 60, { size: 16, color: '#ffe27a' });
  if (l2.length === TEXT.l2.length && Math.floor(g * 4) % 2) { x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(bx + bw - 34, by + bh - 24); x.lineTo(bx + bw - 22, by + bh - 24); x.lineTo(bx + bw - 28, by + bh - 17); x.fill(); }
}

// Shot-local draw: returns the low-res canvas for film.js to upscale.
export function drawPlay(lt) {
  const { g, stop, sl } = warp(lt);
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  fill(x, '#000', 0, 0, LW, LH);
  let shx = 0, shy = 0;
  for (const [ge, amp] of SHOOK) {
    const d = lt - (filmT(ge) - INTRO);
    if (d < 0 || d > 0.35) continue;
    const k = amp * Math.exp(-d * 14);
    shx += k * Math.sin(d * 95 + ge * 10);
    shy += k * Math.cos(d * 77 + ge * 7);
  }
  if (g >= PUSH.b0 && g < PUSH.b1) shy += Math.sin(g * 80) * 1;
  const c = cam(g), dun = area(g) === 'dun';
  const ox = c.x, oy = c.y - HUD;
  x.save();
  x.beginPath(); x.rect(0, HUD, LW, PH); x.clip();
  x.translate(Math.round(shx), Math.round(shy));
  if (dun) drawDungeon(x, g, c); else drawOverworld(x, g, c);
  // sortable actors
  const list = propsFor(x, g, c);
  if (!dun) for (const e of ENEMIES) { const d = drawEnemy(x, e, g, ox, oy); if (d) list.push(d); }
  if (dun) { const b = drawBoss(x, g, ox, oy); if (b) list.push(b); }
  const hp = heroXY(g);
  list.push({ y: hp.y + 0.5, draw: () => drawHero(x, g, ox, oy, stop, sl) });
  list.sort((a, b) => a.y - b.y);
  if (dun) drawSpear(x, g, ox, oy);
  for (const it of list) it.draw();
  if (!dun) drawRock(x, g, ox, oy);
  if (dun) drawTonic(x, g, ox, oy);
  drawParticles(x, g, ox, oy);
  // spin / crit freeze: a flash ring
  if (stop?.kind === 'crit' || stop?.kind === 'boom') {
    x.globalAlpha = 0.35 * (1 - sl / stop.d); fill(x, '#ffffff', -10, HUD - 10, LW + 20, PH + 20); x.globalAlpha = 1;
  }
  // dungeon darkness vignette (torches carry the light)
  if (dun) {
    const gr = x.createRadialGradient(480, HUD + 240, 120, 480, HUD + 240, 560);
    gr.addColorStop(0, 'rgba(0,0,10,0)'); gr.addColorStop(1, 'rgba(0,0,10,0.45)');
    x.fillStyle = gr; x.fillRect(-10, HUD - 10, LW + 20, PH + 20);
  }
  drawPopups(x, g, ox, oy);
  x.restore();
  drawBossCard(x, g);
  drawTextBox(x, g);
  // stepped NES fades: into the cliff door, and the dungeon fade-in
  let dark = 0;
  if (g >= FADE_DUN.t0 && g < FADE_DUN.t1) {
    const mid = (FADE_DUN.t0 + FADE_DUN.t1) / 2;
    dark = g < mid ? Math.ceil(((g - FADE_DUN.t0) / (mid - FADE_DUN.t0 - 0.06)) * 4) / 4 : Math.min(1, Math.ceil(((FADE_DUN.t1 + 0.05 - g) / (FADE_DUN.t1 + 0.05 - mid)) * 4) / 4);
  }
  if (g >= FADE_DUN.t1 && g < FADE_DUN.t1 + 0.05) dark = 0.25;
  if (dark > 0) { x.globalAlpha = Math.min(1, dark); fill(x, '#000', 0, HUD, LW, PH); x.globalAlpha = 1; }
  if (g >= FADE_DUN.t0 + 0.1 && g < FADE_DUN.t1 + 0.35) {
    const a = clamp01(Math.min((g - FADE_DUN.t0 - 0.1) / 0.06, (FADE_DUN.t1 + 0.35 - g) / 0.1));
    text(x, 'LEVEL-1', LW / 2, HUD + 170, { size: 24, align: 'center', alpha: a });
    text(x, 'CABALD KEEP', LW / 2, HUD + 214, { size: 16, align: 'center', color: '#ff8a9a', alpha: a });
  }
  drawHud(x, g);
  // iris in at the start, iris out on the hero at the end
  let rad = null, cx = 0, cy = 0;
  const irisIn = clamp01(lt / 0.4);
  if (irisIn < 1) { rad = 10 + 620 * irisIn * irisIn; cx = 330; cy = HUD + 215; }
  const io = clamp01((g - IRIS_OUT.t0) / (IRIS_OUT.t1 - IRIS_OUT.t0));
  if (io > 0) { rad = 640 * (1 - io) ** 2; cx = 530; cy = HUD + 268 - 60; }
  if (rad != null) {
    x.save(); x.beginPath(); x.rect(0, HUD, LW, PH); x.clip();
    x.fillStyle = '#000';
    x.beginPath(); x.rect(0, HUD, LW, PH); x.moveTo(cx + Math.max(0, rad), cy); x.arc(cx, cy, Math.max(0, rad), 0, 7, true); x.fill('evenodd');
    x.restore();
  }
  if (g >= IRIS_OUT.t1) fill(x, '#000', 0, 0, LW, LH);
  return { low: ART.low, g, stop };
}
export { ART };
