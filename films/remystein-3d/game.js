// The game: raycast view + actors + weapon + status bar, drawn at a native 640×360 (upscaled 3× by film.js).
import { hash } from 'filmkit/lib.js';
import { canvas, loadRemy, loadHeads, headIcon } from '../remy-bros/art.js';
import {
  LW, LH, VW, VH, TITLE, warp, filmT, DOORS, SWITCH_G, heroPos, heroSpeed, heroDist, GUARDS, guardDeath, BOSS, bossX,
  BOSS_STOMPS, BOSS_BURSTS, BOSS_SHOTS, BOSS_HITS, CHAINGUN_G, PISTOL_SHOTS, CG_SHOTS, lastShot, weaponAt, PICKUPS, DECOR,
  DAMAGE, health, ammo, score, KILLS, SHAKES, BOOMS, G_END,
} from './choreo.js';
import { initEngine, render, sprites, particles, project } from './engine.js';
import { buildTextures, buildSprites } from './tex.js';
import * as AC from './actors.js';

export const FONT = '"Press Start 2P"';
export const ART = {};
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeIn = (t) => t * t;
const smooth = (t) => t * t * (3 - 2 * t);

export async function prepareGame() {
  ART.hero = await loadRemy(42, false);
  ART.guards = {};
  for (const e of GUARDS) {
    ART.guards[e.spr] = await loadRemy(e.spr, false);
    e.skin = AC.skinOf(ART.guards[e.spr]);
  }
  ART.boss = await loadRemy(468, false);
  const heads = await loadHeads();
  ART.heads = heads;
  const head0 = headIcon(heads, 0, 1);
  const portraits = [];
  for (const i of [0, 98, 183, 287, 744, 952]) portraits.push(await loadRemy(i, false));
  initEngine(await buildTextures(head0, portraits));
  ART.spr = buildSprites(head0);
  ART.flashG = [0, 1, 2].map((i) => AC.flashSprite(28, i));
  ART.flashB = [0, 1].map((i) => AC.flashSprite(40, i * 2 + 1));
  ART.pistol = [0, 1, 2].map((f) => AC.pistolArt(f).canvas());
  ART.chaingun = [0, 1, 2, 3, 4, 5].map((s) => AC.chaingunArt(s / 6).canvas());
  ART.muzzle = [0, 1, 2].map((i) => AC.muzzleArt(36, i));
  ART.muzzleBig = [0, 1, 2].map((i) => AC.muzzleArt(52, i + 3));
  ART.casing = AC.casingArt();
  ART.faces = AC.buildFaces(ART.hero);
  ART.heroHead2 = headIcon(heads, 42, 2);
  ART.baldHead2 = headIcon(heads, 0, 2);
  ART.weaponIcons = { pistol: AC.pistolArt(0).canvas(), chaingun: AC.chaingunArt(0).canvas() };
  ART.keyIcon = ART.spr.key;
  ART.low = canvas(LW, LH);
  ART.view = ART.low.getContext('2d').createImageData(VW, VH);
  ART.buf = new Uint32Array(ART.view.data.buffer);
}

// ---------- helpers ----------
const fill = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
export function text(x, s, a, b, { size = 8, color = '#fff', shadow = '#000', align = 'left', alpha = 1 } = {}) {
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
const pxCanvas = (p) => {
  const c = canvas(p.w, p.h), x = c.getContext('2d'), im = x.createImageData(p.w, p.h);
  new Uint32Array(im.data.buffer).set(p.d);
  x.putImageData(im, 0, 0);
  return c;
};
const col = (r, g, b) => (0xff000000 | (Math.max(0, Math.min(255, b)) << 16) | (Math.max(0, Math.min(255, g)) << 8) | Math.max(0, Math.min(255, r))) >>> 0;

// ---------- analytic particle events ----------
const EV = [];
const ev = (g, kind, x, y, z, extra = {}) => EV.push({ g, kind, x, y, z, seed: EV.length * 17 + 3, ...extra });
for (const e of GUARDS) for (const h of e.hits) ev(h, 'blood', e.x, e.y, 0.55, { n: h === guardDeath(e) ? 16 : 9 });
for (const h of BOSS_HITS) ev(h, 'spark', BOSS.y, 0, 0, { boss: true });
BOOMS.forEach((g, i) => ev(g, 'boom', 0, 0, 0, { boss: true, i, big: i === 0 || i === BOOMS.length - 1 }));

function evPos(p) {
  if (!p.boss) return [p.x, p.y, p.z];
  const bx = bossX(p.g), hp = heroPos(p.g);
  const dx = hp.x - bx, dy = hp.y - BOSS.y, L = Math.hypot(dx, dy), px = -dy / L, py = dx / L;
  const s = p.seed;
  if (p.kind === 'spark') {
    const lat = (hash(s) - 0.5) * 0.7, z = 0.35 + hash(s + 1) * 0.5;
    return [bx + px * lat + (dx / L) * 0.3, BOSS.y + py * lat + (dy / L) * 0.3, z];
  }
  const lat = p.big ? 0 : (hash(s) - 0.5) * 0.9, z = p.big ? 0.5 : 0.3 + hash(s + 1) * 0.6;
  return [bx + px * lat + (dx / L) * 0.15, BOSS.y + py * lat + (dy / L) * 0.15, z];
}

function buildParticles(g) {
  const out = [];
  for (const p of EV) {
    const age = g - p.g;
    if (age < 0 || age > 1.4) continue;
    const [x0, y0, z0] = evPos(p);
    const hp = heroPos(p.g), tx = hp.x - x0, ty = hp.y - y0, tl = Math.hypot(tx, ty) || 1;
    if (p.kind === 'blood') {
      if (age > 0.6) continue;
      for (let i = 0; i < p.n; i++) {
        const s = p.seed * 31 + i * 7, sp = 0.6 + hash(s) * 1.4, side = (hash(s + 1) - 0.5) * 2;
        const vx = (tx / tl) * sp * 0.5 + (-ty / tl) * side * 0.8, vy = (ty / tl) * sp * 0.5 + (tx / tl) * side * 0.8;
        const vz = 0.4 + hash(s + 2) * 1.6;
        const z = z0 + vz * age - 3.2 * age * age;
        if (z < 0) continue;
        const k = hash(s + 3);
        out.push({ x: x0 + vx * age, y: y0 + vy * age, z, s: 0.02 + k * 0.02, c: k > 0.8 ? col(255, 240, 210) : k > 0.4 ? col(200, 20, 30) : col(130, 8, 18) });
      }
    } else if (p.kind === 'spark') {
      if (age > 0.25) continue;
      for (let i = 0; i < 7; i++) {
        const s = p.seed * 13 + i * 5, a = hash(s) * Math.PI * 2, sp = 1 + hash(s + 1) * 2.5;
        const vx = Math.cos(a) * sp * 0.6 + (tx / tl) * 0.8, vy = Math.sin(a) * sp * 0.6 + (ty / tl) * 0.8, vz = (hash(s + 2) - 0.2) * 2.5;
        const z = z0 + vz * age - 4 * age * age;
        if (z < 0) continue;
        out.push({ x: x0 + vx * age, y: y0 + vy * age, z, s: 0.018, c: age < 0.08 ? col(255, 255, 230) : col(255, 190 - age * 400, 60) });
      }
    } else if (p.kind === 'boom') {
      const n = p.big ? 34 : 20, L = p.big ? 0.75 : 0.55;
      for (let i = 0; i < n; i++) {
        const s = p.seed * 19 + i * 11, a = hash(s) * Math.PI * 2, el = hash(s + 1) * 1.2 - 0.2, sp = (0.5 + hash(s + 2) * 1.6) * (p.big ? 1.3 : 1);
        const kind = i % 4 === 3 ? 'smoke' : i % 6 === 1 ? 'debris' : 'fire';
        const life = kind === 'smoke' ? 1.3 : kind === 'debris' ? 1 : L * (0.6 + hash(s + 3) * 0.5);
        if (age > life) continue;
        const u = age / life;
        const drag = kind === 'fire' ? (1 - Math.exp(-age * 6)) / 6 : age;
        let x = x0 + Math.cos(a) * Math.cos(el) * sp * drag, y = y0 + Math.sin(a) * Math.cos(el) * sp * drag;
        let z = z0 + Math.sin(el) * sp * drag;
        if (kind === 'debris') z = z0 + (0.8 + hash(s + 4) * 1.6) * age - 3.5 * age * age;
        if (kind === 'smoke') z += age * 0.5;
        if (z < 0) continue;
        let c, sz;
        if (kind === 'fire') { sz = (0.05 + u * 0.09) * (p.big ? 1.4 : 1); c = u < 0.2 ? col(255, 255, 220) : u < 0.5 ? col(255, 200 - u * 120, 60) : col(220 - u * 80, 70, 30); }
        else if (kind === 'smoke') { sz = 0.06 + u * 0.16; const v = 70 - u * 40; c = col(v, v - 4, v - 6); }
        else { sz = 0.03; c = col(60, 62, 70); }
        out.push({ x, y, z, s: sz, c });
      }
    }
  }
  // treasure glints (before pickup)
  for (const it of PICKUPS) {
    if (!['crown', 'comb', 'chaingun', 'key'].includes(it.kind) || g >= it.g || (it.appear != null && g < it.appear + 0.35)) continue;
    const ph = (g * 1.7 + hash(it.x * 7) * 3) % 1;
    if (ph < 0.18) out.push({ x: it.x + (hash(Math.floor(g * 1.7) + it.x) - 0.5) * 0.15, y: it.y, z: 0.08 + hash(Math.floor(g * 1.7) * 3 + it.y) * 0.12, s: 0.025 * (1 - Math.abs(ph - 0.09) / 0.09), c: col(255, 255, 255) });
  }
  // boss smoke when badly damaged
  const hits = BOSS_HITS.filter((t) => t <= g).length;
  if (hits > BOSS.hp * 0.5 && g < BOSS.death + 2) {
    for (let k = 0; k < 6; k++) {
      const t0 = Math.floor(g / 0.12) * 0.12 - k * 0.12, age = g - t0;
      const bx = bossX(t0), s = Math.floor(t0 / 0.12);
      out.push({ x: bx + (hash(s) - 0.5) * 0.4, y: BOSS.y + (hash(s + 9) - 0.5) * 0.4, z: 0.75 + age * 0.6, s: 0.05 + age * 0.08, c: col(50, 48, 50) });
    }
  }
  return out;
}

// ---------- guards ----------
function guardState(e, g) {
  const death = guardDeath(e);
  const o = { gun: 'low', lean: 0, sy: 1, sx: 1, rot: 0, lift: [0, 0], stride: [0, 0], recoil: 0, skin: e.skin };
  let white = 0, x = e.x, y = e.y, flash = -1;
  const a = g - e.alert;
  o.sy = 1 + 0.012 * Math.sin(g * 5 + e.x);
  if (a >= 0) {
    o.gun = 'aim';
    if (a < 0.08) { o.sy = 1 - 0.1 * (a / 0.08); o.sx = 1 + 0.06 * (a / 0.08); }
    else if (a < 0.3) { const u = (a - 0.08) / 0.22; o.sy = 0.9 + 0.18 * Math.sin(u * Math.PI) + 0.1 * u; o.sx = 1.06 - 0.06 * u; o.lift = [10 * Math.sin(u * Math.PI), 10 * Math.sin(u * Math.PI)]; }
  }
  // side-step after the alert
  if (e.id !== 'g1' && a > 0.15) {
    const u = clamp01((a - 0.15) / 0.4), dir = e.id === 'g2' ? 1 : -1;
    x += dir * 0.35 * smooth(u);
    if (u > 0 && u < 1) { const st = Math.sin(u * Math.PI * 3); o.lift = [Math.max(0, st) * 8, Math.max(0, -st) * 8]; o.stride = [st * 2, -st * 2]; }
  }
  for (const t of e.fire) {
    const d = g - t;
    if (d >= 0 && d < 0.08) { flash = Math.floor(d / 0.03) % 3; o.recoil = 1; }
  }
  for (const h of e.hits) {
    if (h === death) continue;
    const d = g - h;
    if (d >= 0 && d < 0.16) { white = d < 0.05 ? 1 : 0; o.lean = -0.28 * (1 - d / 0.16); o.sy *= 0.94 + 0.06 * (d / 0.16); }
  }
  const d = g - death;
  const side = e.id === 'g2' ? -1 : 1;
  if (d >= 0) {
    o.gun = null;
    if (d < 0.07) { white = 1; o.lean = -0.35; o.sy = 0.95; }
    else if (d < 0.18) { const u = (d - 0.07) / 0.11; white = 0; o.sy = 0.95 - 0.15 * u; o.sx = 1 + 0.1 * u; o.rot = side * 0.2 * u; o.lean = -0.35 * (1 - u); }
    else if (d < 0.42) { const u = easeIn((d - 0.18) / 0.24); o.sy = 0.8 + 0.05 * u; o.sx = 1.1 - 0.1 * u; o.rot = side * (0.2 + 1.32 * u); }
    else { const u = d - 0.42; o.rot = side * (1.52 + 0.08 * Math.exp(-u * 10) * Math.sin(u * 40)); o.sy = 0.85; }
  }
  return { x, y, o, white, flash, dead: d >= 0 };
}

// ---------- boss ----------
function bossState(g) {
  const x = bossX(g);
  const [w0, w1] = BOSS.walk;
  let liftL = 0, liftR = 0, bob = 0;
  if (g > w0 && g < w1) {
    const u = ((g - w0) / (w1 - w0)) * 5, k = Math.floor(u), f = u - k;
    const l = f < 0.55 ? 14 * Math.sin((f / 0.55) * Math.PI) : 0;
    if (k % 2) liftR = l; else liftL = l;
    bob = f < 0.55 ? -2 * Math.sin((f / 0.55) * Math.PI) : f < 0.65 ? 2 * Math.sin(((f - 0.55) / 0.1) * Math.PI) : 0;
  }
  let firing = false, spin = g * 1.5, heat = 0;
  for (const [a, b] of BOSS_BURSTS) {
    if (g >= a - 0.15 && g < b + 0.3) spin = g * 1.5 + Math.max(0, Math.min(g, b) - (a - 0.15)) * 28 + Math.max(0, g - b) * 6;
    if (g >= a && g < b) { firing = true; heat = 1; }
    else if (g >= b && g < b + 0.5) heat = Math.max(heat, 1 - (g - b) / 0.5);
  }
  let shot = null;
  for (const t of BOSS_SHOTS) if (g >= t && g - t < 0.04) shot = t;
  const hits = BOSS_HITS.filter((t) => t <= g);
  const lastHit = hits.length ? hits[hits.length - 1] : -9;
  const white = g - lastHit < 0.035 ? 0.75 : 0;
  return { x, y: BOSS.y, liftL, liftR, bob, spin, heat, firing, shot, hits: hits.length, white, dead: g >= BOSS.death };
}

// ---------- weapon (screen space) ----------
function drawWeapon(x, g, stop, sl, sh) {
  const sp = heroSpeed(g), amp = Math.min(1, sp / 3.2), ph = heroDist(g) * 2.6;
  let bx = Math.cos(ph) * 14 * amp, by = Math.abs(Math.sin(ph)) * 10 * amp + 4;
  let kind = weaponAt(g);
  let drop = 0;
  if (stop?.kind === 'grin') {
    if (sl < 0.12) { kind = 'pistol'; drop = easeIn(sl / 0.12) * 150; }
    else { kind = 'chaingun'; drop = (1 - easeOut(clamp01((sl - 0.14) / 0.18))) * 150; }
  }
  const s = lastShot(g), age = s == null ? 9 : g - s + (stop && s === g ? 0 : 0);
  x.save();
  x.imageSmoothingEnabled = false;
  if (kind === 'pistol') {
    const f = age < 0.05 ? 1 : age < 0.12 ? 2 : 0;
    const w = 128, h = 144, px = Math.round(VW / 2 - w / 2 + bx + sh[0] * 0.5), py = Math.round(VH - h + by + drop + (f === 1 ? -6 : 0) + 18);
    x.drawImage(ART.pistol[f], px, py, w, h);
    if (f === 1) {
      x.globalCompositeOperation = 'lighter';
      const m = ART.muzzle[Math.floor(s * 100) % 3];
      x.drawImage(m, px + w / 2 - 36, py - 34, 72, 72);
      x.globalCompositeOperation = 'source-over';
    }
  } else {
    const firing = g >= CHAINGUN_G + 0.6 && g >= CG_SHOTS[0] && g < CG_SHOTS[CG_SHOTS.length - 1] + 0.06;
    const spinF = Math.floor((firing ? g * 60 : g * 6)) % 6;
    const flash = firing && age < 0.045;
    const jit = firing ? Math.round(Math.sin(g * 140) * 2) : 0;
    const w = 224, h = 128, px = Math.round(VW / 2 - w / 2 + bx + jit + sh[0] * 0.5), py = Math.round(VH - h + by + drop + (flash ? 4 : 0) + 6);
    if (flash) {
      x.globalCompositeOperation = 'lighter';
      const m = ART.muzzleBig[Math.floor(s * 100) % 3];
      x.drawImage(m, px + w / 2 - 52, py - 70, 104, 104);
      x.globalCompositeOperation = 'source-over';
    }
    x.drawImage(ART.chaingun[spinF], px, py, w, h);
    // spent casings
    for (const t of CG_SHOTS) {
      const a = g - t;
      if (a < 0 || a > 0.45) continue;
      const k = hash(t * 1000);
      const cx = px + w / 2 + 50 + a * (300 + k * 120), cy = py + 40 - a * (380 + k * 100) + a * a * 1900;
      if (cy > VH) continue;
      x.save(); x.translate(Math.round(cx), Math.round(cy)); x.rotate(Math.floor(a * 30) * 0.8); x.drawImage(ART.casing, -4, -2, 8, 4); x.restore();
    }
  }
  x.restore();
}

// ---------- status bar ----------
function panel(x, a, b, w, h) {
  fill(x, '#04103a', a, b, w, h);
  fill(x, '#000418', a, b, w, 2); fill(x, '#000418', a, b, 2, h);
  fill(x, '#3a5ac8', a, b + h - 2, w, 2); fill(x, '#3a5ac8', a + w - 2, b, 2, h);
}
export function faceState(g) {
  const kill = KILLS.some((t) => g >= t && g - t < 0.7);
  const grin = kill || (g >= CHAINGUN_G - 0.01 && g < CHAINGUN_G + 1.1) || g >= BOSS.death;
  const pain = DAMAGE.some(([t]) => g >= t && g - t < 0.38);
  const hp = health(g);
  const k = Math.floor(g / 0.6);
  const look = hash(k * 3 + 1) > 0.5 ? 1 : -1;
  return { look, grin: grin ? 1 : 0, pain: pain ? 1 : 0, hurt: hp < 70 ? 2 : hp < 90 ? 1 : 0 };
}
function drawBar(x, g) {
  const y0 = VH;
  const grad = x.createLinearGradient(0, y0, 0, LH);
  grad.addColorStop(0, '#1a3a9a'); grad.addColorStop(1, '#0c2470');
  x.fillStyle = grad; x.fillRect(0, y0, LW, LH - y0);
  fill(x, '#6a8aff', 0, y0, LW, 1); fill(x, '#000418', 0, y0 + 1, LW, 1);
  const cols = [['FLOOR', 54], ['SCORE', 128], ['LIVES', 54], ['', 66], ['HEALTH', 92], ['AMMO', 72], ['', 26], ['', 116]];
  let ax = 4;
  const by = y0 + 4, bh = LH - y0 - 8;
  const hp = health(g), am = ammo(g);
  const pos = [];
  for (const [label, w] of cols) { panel(x, ax, by, w, bh); pos.push(ax); ax += w + 3; }
  const lab = (i, s, w) => text(x, s, pos[i] + w / 2, by + 7, { size: 8, align: 'center', color: '#9ab4ff', shadow: '#000418' });
  const val = (i, s, w, c = '#ffffff') => text(x, s, pos[i] + w / 2, by + 26, { size: 16, align: 'center', color: c, shadow: '#000418' });
  cols.forEach(([l, w], i) => l && lab(i, l, w));
  val(0, '1', 54);
  const scr = score(g), sc = String(scr);
  val(1, sc, 128);
  val(2, '3', 54);
  // face
  const fs = faceState(g);
  const fx = pos[3] + 3, fy = by + 2;
  x.save(); x.beginPath(); x.rect(fx, fy, 60, bh - 4); x.clip();
  fill(x, '#0a1850', fx, fy, 60, bh - 4);
  AC.drawFace(x, ART.faces, fx, fy - 2, fs);
  x.restore();
  const lowHp = hp < 60;
  val(4, `${hp}%`, 92, lowHp ? (Math.floor(g * 6) % 2 ? '#ff6060' : '#ffffff') : '#ffffff');
  val(5, String(am), 72);
  // key slot
  if (g >= PICKUPS[5].g) { const kc = pxCanvas(ART.keyIcon); x.drawImage(kc, pos[6] + 2, by + 20, 22, 12); }
  else fill(x, '#020a28', pos[6] + 6, by + 22, 14, 8);
  // weapon icon
  const wk = weaponAt(g), ic = ART.weaponIcons[wk];
  if (wk === 'pistol') x.drawImage(ic, 0, 0, 64, 60, pos[7] + 38, by + 6, 40, 38);
  else x.drawImage(ic, pos[7] + 6, by + 8, 104, 56);
  text(x, wk === 'pistol' ? 'PISTOL' : 'CHAINGUN', pos[7] + 58, by + bh - 12, { size: 8, align: 'center', color: '#ffe27a', shadow: '#000418' });
}

// ---------- overlays ----------
const MESSAGES = [
  [PICKUPS[0].g, 'PICKED UP A CLIP.'],
  [PICKUPS[1].g, 'HAIR TONIC! +14 HEALTH'],
  [CHAINGUN_G, 'YOU GOT THE CHAINGUN!'],
  [PICKUPS[3].g, 'PICKED UP A GOLD CROWN.'],
  [PICKUPS[4].g, 'PICKED UP THE GOLDEN COMB.'],
  [PICKUPS[5].g, 'PICKED UP THE GOLD KEY.'],
];
function drawMessages(x, g) {
  let m = null;
  for (const [t, s] of MESSAGES) if (g >= t && g - t < 1.2) m = [t, s];
  if (!m) return;
  const a = g - m[0];
  text(x, m[1], 8, 8, { size: 8, color: a < 0.1 && Math.floor(a * 40) % 2 ? '#ffffff' : '#ffd84a', alpha: clamp01((1.2 - a) / 0.15) });
}
function bubble(x, cam, wx, wy, z, s, age, dur, colr = '#ffffff') {
  if (age < 0 || age > dur) return;
  const p = project(cam, wx, wy, z);
  if (!p || !p.visible || p.x < 8 || p.x > VW - 8) return;
  const pop = age < 0.08 ? 0.6 + 0.4 * (age / 0.08) + 0.2 * Math.sin((age / 0.08) * Math.PI) : 1;
  const size = 8;
  x.save();
  x.font = `${size}px ${FONT}`;
  const w = Math.round(x.measureText(s).width * pop) + 10, h = Math.round(16 * pop);
  const bx = Math.round(Math.max(8, Math.min(VW - w - 8, p.x - w / 2))), by = Math.round(Math.max(34, p.y - h - 10));
  x.globalAlpha = clamp01((dur - age) / 0.1);
  fill(x, '#000000', bx - 1, by - 1, w + 2, h + 2);
  fill(x, '#ffffff', bx, by, w, h);
  fill(x, '#000000', p.x - 3, by + h, 6, 2); fill(x, '#ffffff', p.x - 2, by + h, 4, 1);
  fill(x, '#000000', p.x - 1, by + h + 2, 2, 3);
  x.restore();
  if (pop >= 0.99) text(x, s, bx + w / 2, by + 4, { size, align: 'center', color: colr === '#ffffff' ? '#c81020' : colr, shadow: null, alpha: clamp01((dur - age) / 0.1) });
}
function popup(x, cam, wx, wy, z, s, age, c = '#ffffff') {
  if (age < 0 || age > 0.8) return;
  const p = project(cam, wx, wy, z);
  if (!p || !p.visible) return;
  text(x, s, p.x, p.y - 30 * Math.sqrt(age / 0.8), { size: 8, align: 'center', color: c, alpha: clamp01((0.8 - age) / 0.2) });
}
function drawBossCard(x, g, stop, sl) {
  const t0 = BOSS.roar;
  if (g < t0 || g > 6.4) return;
  const a = stop?.kind === 'reveal' ? sl : g - t0 + 0.14;
  const out = clamp01((g - 6.05) / 0.3);
  const slide = (1 - easeOut(clamp01(a / 0.18))) * -LW + easeIn(out) * LW;
  const y = VH - 70;
  x.save();
  x.translate(Math.round(slide), 0);
  fill(x, 'rgba(0,0,0,0.72)', 0, y, LW, 44);
  fill(x, '#c81020', 0, y, LW, 2); fill(x, '#c81020', 0, y + 42, LW, 2);
  x.drawImage(ART.baldHead2, 112, y + 6);
  text(x, 'HANS GLATZE', 152, y + 8, { size: 16, color: a < 0.25 && Math.floor(a * 30) % 2 ? '#ffffff' : '#ffd84a', shadow: '#5a0008' });
  text(x, 'COMMANDER OF THE CABALD', 152, y + 28, { size: 8, color: '#ff8090', shadow: '#000' });
  x.restore();
}
function drawBossBar(x, g) {
  if (g < 5.3 || g > BOSS.death + 0.6) return;
  const a = clamp01((g - 5.3) / 0.2) * clamp01((BOSS.death + 0.6 - g) / 0.2);
  const hits = BOSS_HITS.filter((t) => t <= g).length, frac = Math.max(0, 1 - hits / BOSS_HITS.length);
  const w = 260, bx = Math.round(VW / 2 - w / 2), by = 10;
  x.save(); x.globalAlpha = a;
  text(x, 'HANS GLATZE', VW / 2, by, { size: 8, align: 'center', color: '#ffd84a' });
  fill(x, '#000000', bx - 2, by + 12, w + 4, 10);
  fill(x, '#3a0008', bx, by + 14, w, 6);
  const hitRecent = BOSS_HITS.some((t) => g >= t && g - t < 0.04);
  fill(x, hitRecent ? '#ffffff' : '#e81828', bx, by + 14, Math.round(w * frac), 6);
  fill(x, '#ff8a8a', bx, by + 14, Math.round(w * frac), 1);
  x.restore();
}
function drawPsyched(x, lt, g) {
  if (g >= 0.3) return;
  const u = clamp01(g / 0.27);
  const w = 232, h = 50, bx = Math.round(VW / 2 - w / 2), by = Math.round(VH / 2 - h / 2);
  fill(x, '#000000', bx - 2, by - 2, w + 4, h + 4);
  fill(x, '#00585a', bx, by, w, h);
  fill(x, '#00888a', bx, by, w, 2); fill(x, '#003234', bx, by + h - 2, w, 2);
  text(x, 'GET PSYCHED!', VW / 2, by + 10, { size: 16, align: 'center', color: '#ffffff', shadow: '#002022' });
  fill(x, '#002022', bx + 14, by + 34, w - 28, 8);
  fill(x, '#e81828', bx + 15, by + 35, Math.round((w - 30) * u), 6);
}
function drawGrin(x, stop, sl) {
  if (stop?.kind !== 'grin') return;
  const a = sl;
  const s = 'CHAINGUN!';
  const scale = a < 0.08 ? 3 - 2 * (a / 0.08) : 1;
  x.save();
  x.translate(VW / 2, 92);
  x.scale(scale, scale);
  text(x, s, 0, -8, { size: 16, align: 'center', color: Math.floor(a * 24) % 2 ? '#ffffff' : '#ffd84a', shadow: '#5a2a00' });
  x.restore();
}

// ---------- the frame ----------
export function shakeAt(lt) {
  let sx = 0, sy = 0;
  for (const [ge, amp] of SHAKES) {
    const d = lt - (filmT(ge) - TITLE);
    if (d < 0 || d > 0.35) continue;
    const k = amp * Math.exp(-d * 14);
    sx += k * Math.sin(d * 95 + ge * 10);
    sy += k * Math.cos(d * 77 + ge * 7);
  }
  return [Math.round(sx), Math.round(sy)];
}

export function drawGame(lt, opts = {}) {
  const { g, stop, sl } = opts.g != null ? { g: opts.g, stop: null, sl: 0 } : warp(lt);
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.imageSmoothingEnabled = false;
  const sh = opts.g != null ? [0, 0] : shakeAt(lt);
  const hp = heroPos(g), sp = heroSpeed(g), amp = Math.min(1, sp / 3.2);
  // camera
  const s = lastShot(g), sAge = s == null ? 9 : g - s;
  const kick = sAge < 0.08 ? (weaponAt(g) === 'pistol' ? 3 : 1.5) * (1 - sAge / 0.08) : 0;
  const dmgKick = DAMAGE.reduce((a, [t]) => (g >= t && g - t < 0.2 ? a + 6 * (1 - (g - t) / 0.2) : a), 0);
  const cam = {
    x: hp.x, y: hp.y, a: hp.a + (dmgKick ? Math.sin(g * 50) * 0.01 * dmgKick / 6 : 0),
    h: 0.5 + Math.sin(heroDist(g) * 2.6 * 2) * 0.006 * amp,
    hz: VH / 2 - kick + dmgKick * 0.4,
    doors: new Map(DOORS.map((d) => [d.x * 100 + d.y, smooth(clamp01((g - d.open[0]) / (d.open[1] - d.open[0])))])),
    switchOn: g >= SWITCH_G,
    lights: [],
  };
  // dynamic lights
  if (sAge < 0.07) cam.lights.push({ x: hp.x + Math.cos(hp.a) * 0.3, y: hp.y + Math.sin(hp.a) * 0.3, i: 1.1 * (1 - sAge / 0.07), r: 6, c: [1, 0.85, 0.55] });
  const B = bossState(g);
  if (B.shot != null && !B.dead) cam.lights.push({ x: B.x - 0.3, y: B.y, i: 0.9, r: 4, c: [1, 0.7, 0.3] });
  if (g > 4.6 && !B.dead) cam.lights.push({ x: B.x - 0.25, y: B.y, i: 0.25 + 0.1 * Math.sin(g * 9), r: 2.2, c: [1, 0.25, 0.2] });
  for (const t of BOOMS) { const a = g - t; if (a >= 0 && a < 0.4) cam.lights.push({ x: B.x - 0.3, y: B.y, i: 2.2 * (1 - a / 0.4), r: 5, c: [1, 0.65, 0.3] }); }
  for (const e of GUARDS) for (const t of e.fire) { const a = g - t; if (a >= 0 && a < 0.07) cam.lights.push({ x: e.x, y: e.y, i: 0.8, r: 3, c: [1, 0.8, 0.5] }); }

  render(ART.buf, cam);
  // sprites
  const list = [];
  const guardStates = [];
  for (const d of DECOR) {
    const img = ART.spr[d.kind];
    const hang = d.kind.startsWith('lamp');
    list.push({ x: d.x, y: d.y, z0: hang ? 1 : 0, img, ax: img.w / 2, ay: hang ? 0 : img.h, ppu: 64 });
  }
  for (const it of PICKUPS) {
    if (g >= it.g) continue;
    if (it.appear != null && g < it.appear) continue;
    const img = ART.spr[it.kind];
    let x0 = it.x, y0 = it.y, z = 0;
    if (it.appear != null) {
      const a = g - it.appear, T = 0.32;
      if (a < T) {
        const src = it.kind === 'key' ? { x: bossX(g), y: BOSS.y } : { x: GUARDS[0].x, y: GUARDS[0].y };
        const u = a / T;
        x0 = src.x + (it.x - src.x) * u; y0 = src.y + (it.y - src.y) * u; z = 0.35 * Math.sin(u * Math.PI) + 0.25 * (1 - u);
      } else if (a < T + 0.15) z = 0.05 * Math.sin(((a - T) / 0.15) * Math.PI);
    }
    list.push({ x: x0, y: y0, z0: z, img, ax: img.w / 2, ay: img.h, ppu: 64, bright: it.kind === 'chaingun' || it.kind === 'crown' || it.kind === 'comb' || it.kind === 'key' ? 0.25 : 0 });
  }
  for (const e of GUARDS) {
    const st = guardState(e, g);
    const img = AC.guardFrame(ART.guards[e.spr], st.o);
    list.push({ x: st.x, y: st.y, z0: 0, img, ax: AC.GUARD_FRAME.ax, ay: AC.GUARD_FRAME.ay, ppu: 128, white: st.white });
    if (st.flash >= 0) {
      const dx = hp.x - st.x, dy = hp.y - st.y, L = Math.hypot(dx, dy);
      list.push({ x: st.x + (dx / L) * 0.12, y: st.y + (dy / L) * 0.12, z0: 0.3, img: ART.flashG[st.flash], ax: 14, ay: 14, ppu: 128, bright: 1 });
    }
    guardStates.push(st);
  }
  // boss
  {
    const dmg = B.hits / BOSS_HITS.length;
    let img = AC.bossFrame(ART.boss, {
      bob: B.bob, liftL: B.liftL, liftR: B.liftR, spinL: B.spin, spinR: B.spin + 0.5, heatL: B.heat, heatR: B.heat,
      core: 0.5 + 0.5 * Math.sin(g * 9), dmg, glint: Math.floor(g * 3) % 3 !== 0,
    });
    let white = B.white, ox = 0, ax = AC.BOSS_FRAME.ax;
    if (B.dead) {
      const d = g - BOSS.death;
      const u = clamp01((d - 0.25) / 0.45);
      white = d < 0.05 ? 1 : d < 0.3 && Math.floor(d * 30) % 2 ? 0.6 : 0;
      ox = d < 0.3 ? Math.sin(d * 120) * 0.03 : 0;
      img = AC.bossWreck(img, { rot: -0.5 * easeIn(u) + (u >= 1 ? 0.02 * Math.exp(-(d - 0.7) * 8) * Math.sin(d * 40) : 0), sy: 1 - 0.32 * easeIn(u), char: 0.55 * clamp01(d / 0.6) });
      ax = AC.BOSS_FRAME.ax + 30;
    }
    list.push({ x: B.x + ox, y: B.y, z0: 0, img, ax, ay: AC.BOSS_FRAME.ay, ppu: 150, white });
    if (B.shot != null && !B.dead) {
      const dx = hp.x - B.x, dy = hp.y - B.y, L = Math.hypot(dx, dy), px = -dy / L, py = dx / L;
      const side = Math.round(B.shot * 100) % 2 ? 1 : -1, lat = (side * 64) / 150;
      list.push({ x: B.x + px * lat + (dx / L) * 0.2, y: B.y + py * lat + (dy / L) * 0.2, z0: (158 - 114) / 150, img: ART.flashB[Math.round(B.shot * 50) % 2], ax: 20, ay: 20, ppu: 110, bright: 1 });
    }
  }
  sprites(ART.buf, cam, list);
  particles(ART.buf, cam, buildParticles(g));

  fill(x, '#000', 0, 0, LW, VH);
  x.putImageData(ART.view, sh[0], sh[1]);
  // screen-space world overlays
  for (const [i, e] of GUARDS.entries()) {
    if (e.bubble) bubble(x, cam, e.x, e.y, 1.0, e.bubble, g - e.alert, 0.5);
    const d = guardDeath(e);
    popup(x, cam, guardStates[i].x, guardStates[i].y, 0.9, `+${e.pts}`, g - d);
  }
  bubble(x, cam, B.x, B.y, 1.12, 'GUTEN TAG!', g - BOSS.roar, 0.75);
  bubble(x, cam, B.x, B.y, 0.95, 'MEIN HAAR!!', g - BOSS.death - 0.02, 0.85, '#c81020');
  popup(x, cam, B.x, B.y, 1.05, '+5000', g - BOSS.death - 0.3, '#ffd84a');
  drawWeapon(x, g, stop, sl, sh);
  // palette flashes (Wolf3D style)
  let red = 0, gold = 0;
  for (const [t] of DAMAGE) { const a = g - t; if (a >= 0 && a < 0.5) red = Math.max(red, 0.5 * Math.exp(-a * 7)); }
  for (const it of PICKUPS) { const a = g - it.g; if (a >= 0 && a < 0.35) gold = Math.max(gold, (it.kind === 'chaingun' ? 0.5 : 0.32) * Math.exp(-a * 9)); }
  if (stop?.kind === 'grin') gold = Math.max(gold, 0.45 * Math.exp(-sl * 6));
  if (red > 0) { x.fillStyle = `rgba(255,0,0,${red})`; x.fillRect(0, 0, VW, VH); }
  if (gold > 0) { x.fillStyle = `rgba(255,200,40,${gold})`; x.fillRect(0, 0, VW, VH); }
  drawBossBar(x, g);
  drawBossCard(x, g, stop, sl);
  drawGrin(x, stop, sl);
  drawMessages(x, g);
  drawPsyched(x, lt, g);
  drawBar(x, g);
  return { low: ART.low, g, stop, sl };
}
export { G_END };
