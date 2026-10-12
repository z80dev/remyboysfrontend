// HAIRLINE HILL ZONE ACT 1, drawn at a native 960×540 into a low-res canvas (upscaled 2× nearest by film.js).
import { hash } from 'filmkit/lib.js';
import * as A from './art.js';
import {
  LW, LH, GY, BALL_R, INTRO, warp, filmT, G_END, CARD, REV, BOOST_G, LOOP, LOOP_G, loopEnd, SPRING_G, LOCK_G, SIGN_G, STOP_G,
  TALLY, FADE, hero, heroX, heroSpeed, heroCenter, invincible, LANDINGS, TAKEOFFS, BOOST_X, SPRING_X, SPIKES, BADNIKS, badnikAt,
  CAM_LOCK, CHAIN, BOSS_BALL_R, pod, wreck, WRECK_LAND, BOSS_HITS, BOSS_DIE, BOSS_FLEE, HURT_G, SIGN_X, SIGN, RINGS, SCATTER,
  scatterAt, SCATTER_LIFE, hudRings, hudScore, hudTime, tallyBonus, TIME_BONUS, ringBonus, camX, camY, STOPS, BOOMS, signAngle,
} from './choreo.js';

export const FONT = '"Press Start 2P"';
export const ART = {};
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const easeOut = (u) => 1 - (1 - clamp01(u)) ** 3;
const easeIn = (u) => clamp01(u) ** 3;
const WATER_TOP = 300, ISLAND_BASE = 404;

export async function prepareGame() {
  ART.hero = await A.loadRemy(42, true);
  ART.heroNear = await A.loadRemy(42, false);
  ART.boss = await A.loadRemy(952, false);
  const sides = await A.loadAtlas('sides.webp'), heads = await A.loadAtlas('heads.webp');
  ART.quills = A.quills();
  {
    const q = ART.quills, c = A.canvas(Math.round(q.width * 1.46), Math.round(q.height * 1.46));
    c.getContext('2d').drawImage(q, 0, 0, c.width, c.height);
    ART.quillsNear = c;
  }
  ART.heroSide = A.icon(sides, 42, 2);
  ART.ball = A.ballFrames(ART.heroSide);
  ART.heroHead2 = A.icon(heads, 42, 2);
  ART.heroHead3 = A.icon(heads, 42, 3);
  ART.ringIcon = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => A.ring(Math.cos((i / 8) * Math.PI)));
  ART.ring = ART.ringIcon;
  ART.moto = [0, 1].map((f) => A.motobug(A.icon(sides, 0, 2, true), f));
  ART.buzz = [0, 1].map((f) => A.buzzer(A.icon(sides, 23, 2, true), f));
  ART.crab = [0, 1].map((f) => A.crabmeat(A.icon(heads, 183, 2), f));
  ART.animals = Object.fromEntries(['rabbit', 'bird', 'squirrel'].map((k) => [k, [0, 1].map((f) => A.animal(k, f))]));
  // boss: Dr. Baldnik (bald #952) gets the moustache
  ART.stache = A.moustache();
  ART.boss.c.getContext('2d').drawImage(ART.stache, 44 - 28, 57 - 6);
  ART.hull = A.podHull();
  ART.hullWhite = A.tinted(ART.hull, '#ffffff', 0.85);
  ART.hullDark = A.tinted(ART.hull, '#1a1018', 0.4);
  ART.wreck = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => A.wreckBall((i / 8) * Math.PI * 0.5));
  {
    const b = A.icon(heads, 952, 3), x = b.getContext('2d');
    x.drawImage(ART.stache, 0, 0, 56, 20, 24 - 14, 35 - 4, 28, 10);
    ART.signBald = A.signFace(b);
    ART.signRemy = A.signFace(ART.heroHead3);
    ART.bossHead = A.icon(heads, 952, 1);
  }
  ART.sky = A.sky(LW, LH);
  ART.clouds = [0, 1, 2, 3, 4, 5].map((i) => A.cloud(i * 17 + 3, 110 + i * 26));
  ART.mountains = A.mountains(1680, 150);
  ART.water = A.water(1024, 64);
  const isl = A.islands(2200, 170);
  ART.islands = isl.c; ART.falls = isl.falls;
  ART.ground = A.groundTile(LH - GY + 90);
  ART.loop = A.loopArt(LOOP.r + 4);
  ART.palms = [0, 1, 2].map((i) => A.palm(i * 13 + 5, 1));
  ART.sunflower = [0, 1].map((f) => A.sunflower(f));
  ART.purple = [0, 1].map((i) => A.purpleFlower(i + 3));
  ART.totem = A.totem([A.icon(heads, 5, 2), A.icon(heads, 0, 2), A.icon(heads, 233, 2)]);
  ART.spikes = A.spikes(Math.max(2, Math.floor((SPIKES.r - SPIKES.l) / 16)));
  ART.spring = [0, 0.5, 1, 1.25].map((k) => A.spring(k));
  ART.booster = [0, 1, 2, 3].map((f) => A.booster(f));
  ART.emblem = A.emblem();
  ART.low = A.canvas(LW, LH);
  ART.ui = A.canvas(LW, LH);
}

// ---------- helpers ----------
const fill = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
export function text(x, s, a, b, { size = 16, color = '#fff', shadow = '#10142a', align = 'left', alpha = 1, outline = false } = {}) {
  x.save();
  x.globalAlpha *= alpha;
  x.font = `${size}px ${FONT}`;
  x.textAlign = align;
  x.textBaseline = 'top';
  const k = Math.max(1, Math.round(size / 8));
  if (outline) {
    x.fillStyle = shadow;
    for (const [dx, dy] of [[-k, 0], [k, 0], [0, -k], [0, k], [k, k], [-k, k], [k, -k], [-k, -k], [k * 2, k * 2]]) x.fillText(s, Math.round(a + dx), Math.round(b + dy));
  } else if (shadow) { x.fillStyle = shadow; x.fillText(s, Math.round(a + k), Math.round(b + k)); }
  x.fillStyle = color;
  x.fillText(s, Math.round(a), Math.round(b));
  x.restore();
}
function star4(x, cx, cy, r, col) {
  fill(x, col, cx - r, cy, r * 2 + 1, 1);
  fill(x, col, cx, cy - r, 1, r * 2 + 1);
  if (r > 2) fill(x, col, cx - 1, cy - 1, 3, 3);
}
const disc = (x, cx, cy, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(Math.round(cx), Math.round(cy), Math.max(0.5, r), 0, 7); x.fill(); };

// ---------- backdrop (also used by the title screen) ----------
export function drawBackdrop(x, cam, oy, g) {
  x.drawImage(ART.sky, 0, Math.round(oy * 0.04) - 4);
  const cl = [[40, 46, 0], [300, 22, 3], [560, 70, 1], [820, 34, 4], [1100, 60, 2], [1380, 26, 5], [1660, 80, 0], [1940, 40, 3]];
  for (const [cx, cy, i] of cl) {
    const span = 2200, px = ((cx - cam * 0.05 - g * 10) % span + span) % span - 220;
    x.drawImage(ART.clouds[i], Math.round(px), Math.round(cy + oy * 0.08));
  }
  // second, lower cloud bank, faster
  for (let i = 0; i < 6; i++) {
    const span = 1900, px = ((i * 330 - cam * 0.09 - g * 18) % span + span) % span - 240, c = ART.clouds[(i + 2) % 6];
    x.drawImage(c, Math.round(px), Math.round(118 + (i % 2) * 14 + oy * 0.1));
  }
  const my = Math.round(WATER_TOP - ART.mountains.height + 2 + oy * 0.14), mw = ART.mountains.width;
  const mx = -(((cam * 0.11) % mw) + mw) % mw;
  x.drawImage(ART.mountains, Math.round(mx), my);
  x.drawImage(ART.mountains, Math.round(mx + mw), my);
  // lake with line-scroll parallax (each row slides at its own speed)
  const wt = Math.round(WATER_TOP + oy * 0.16), ww = ART.water.width;
  for (let r = 0; r < LH - wt; r++) {
    const v = r / 150, sr = Math.min(ART.water.height - 1, Math.floor(r * 0.42));
    const off = (((cam * (0.14 + 0.5 * v) + g * (6 + 14 * Math.sin(r * 0.7))) % ww) + ww) % ww;
    x.drawImage(ART.water, 0, sr, ww, 1, -Math.round(off), wt + r, ww, 1);
    x.drawImage(ART.water, 0, sr, ww, 1, ww - Math.round(off), wt + r, ww, 1);
  }
  // islands + waterfalls
  const iw = ART.islands.width, ix = -(((cam * 0.34) % iw) + iw) % iw, iy = Math.round(ISLAND_BASE - ART.islands.height + oy * 0.3);
  for (const k of [0, 1]) {
    const bx = Math.round(ix + k * iw);
    if (bx > LW || bx + iw < 0) continue;
    x.drawImage(ART.islands, bx, iy);
    for (const f of ART.falls) {
      const fx = bx + f.x;
      if (fx < -20 || fx > LW + 20) continue;
      const top = iy + f.top, bot = iy + ART.islands.height + 14;
      for (let y = top; y < bot; y += 2) {
        const ph = Math.floor((y - top - g * 160) / 6) % 3;
        for (let c = 0; c < f.w; c += 2) {
          const col = (c + (ph + 3) % 3 * 2) % 6 < 2 ? '#ffffff' : (c % 4 === 0 ? '#9cd8ff' : '#d4f0ff');
          fill(x, col, fx + c, y, 2, 2);
        }
      }
      // splash foam
      for (let i = 0; i < 6; i++) {
        const a = ((g * 3 + i / 6) % 1);
        x.globalAlpha = 1 - a;
        disc(x, fx + f.w / 2 + (i - 2.5) * 5, bot - a * 8, 2 + a * 3, '#ffffff');
      }
      x.globalAlpha = 1;
    }
  }
}

// ---------- decor ----------
const DECOR = [];
{
  const avoid = (wx) => Math.abs(wx - LOOP.x) < 190 || Math.abs(wx - SPRING_X) < 80 || (wx > SPIKES.l - 40 && wx < SPIKES.r + 40) || Math.abs(wx - SIGN_X) < 60;
  for (let i = 0; i < 40; i++) {
    const wx = 60 + i * 190 + hash(i + 70) * 110;
    if (avoid(wx)) continue;
    const r = hash(i + 90);
    DECOR.push({ x: wx, kind: r < 0.34 ? 'palm' : r < 0.7 ? 'sun' : 'purple', v: i % 3 });
  }
  DECOR.push({ x: SIGN_X + 260, kind: 'palm', v: 1 }, { x: SIGN_X - 230, kind: 'totem', v: 0 }, { x: 70, kind: 'totem', v: 0 }, { x: CAM_LOCK + 60, kind: 'totem', v: 0 });
}
function drawDecor(x, g, cam, oy) {
  for (const d of DECOR) {
    const sx = d.x - cam;
    if (sx < -200 || sx > LW + 200) continue;
    if (d.kind === 'palm') { const p = ART.palms[d.v]; x.drawImage(p, Math.round(sx - p.width / 2), GY + oy - p.height + 4); }
    else if (d.kind === 'sun') { const s = ART.sunflower[Math.floor(g * 4 + d.v) % 2]; for (let k = 0; k < 2; k++) x.drawImage(s, Math.round(sx + k * 26 - 13), GY + oy - s.height + 2 + k * 6); }
    else if (d.kind === 'purple') { const p = ART.purple[d.v % 2]; x.drawImage(p, Math.round(sx - 14), GY + oy - p.height + 2); x.drawImage(p, Math.round(sx + 10), GY + oy - p.height + 3); }
    else x.drawImage(ART.totem, Math.round(sx - ART.totem.width / 2), GY + oy - ART.totem.height + 2);
  }
}

// ---------- particles (analytic, pure in g) ----------
const P = [];
const ev = (g, kind, wx, wy, extra = {}) => P.push({ g, kind, x: wx, y: wy, seed: P.length * 13 + 7, ...extra });
for (const r of RINGS) ev(r.g, 'sparkle', r.x, r.y);
for (const r of SCATTER) if (r.got) { const p = scatterAt(r, r.got); ev(r.got, 'sparkle', p.x, p.y); }
for (const b of BADNIKS) { const p = badnikAt(b, b.g); const cy = b.kind === 'buzz' ? p.y : GY - 26; ev(b.g, 'pop', p.x, cy); ev(b.g, 'shock', p.x, cy); }
for (const gl of LANDINGS) ev(gl, 'dust', heroX(gl), GY, { n: 6 });
for (const gt of TAKEOFFS) ev(gt, 'dust', heroX(gt), GY, { n: 3 });
ev(REV.t1, 'launch', heroX(REV.t1), GY);
ev(BOOST_G, 'boost', BOOST_X, GY - 30);
ev(SPRING_G, 'shock', SPRING_X + 10, GY - 30);
ev(HURT_G, 'spark', heroCenter(HURT_G).x + 20, heroCenter(HURT_G).y, { big: true });
for (const h of BOSS_HITS) { const c = heroCenter(h); ev(h, 'spark', c.x + 26, c.y, { big: h === BOSS_DIE }); ev(h, 'shock', c.x + 26, c.y); }
ev(WRECK_LAND, 'dust', wreck(WRECK_LAND + 0.001).x, GY, { n: 8, big: true });
ev(SIGN.t1, 'sparkle', SIGN_X, GY - 96, { big: true });

const SHOOK = [...BADNIKS.map((b) => [b.g, 3]), [HURT_G, 6], [BOSS_HITS[0], 5], [BOSS_HITS[1], 5], [BOSS_DIE, 9], [WRECK_LAND, 7], [SPRING_G, 2], [REV.t1, 3], ...BOOMS.map((b) => [b.g, 2.5])];

function drawParticles(x, g, cam, oy) {
  for (const p of P) {
    const age = g - p.g;
    if (age < 0 || age > 1.2) continue;
    const r = (k) => hash(p.seed * 31 + k);
    const sx = p.x - cam, sy = p.y + oy;
    if (sx < -200 || sx > LW + 200) continue;
    switch (p.kind) {
      case 'sparkle': {
        const T = p.big ? 0.6 : 0.3;
        if (age > T) break;
        const u = age / T, f = Math.floor(u * 4);
        const rr = [5, 7, 5, 3][f] * (p.big ? 2 : 1);
        star4(x, Math.round(sx), Math.round(sy), rr, f % 2 ? '#fff6b4' : '#ffffff');
        for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.785, d = 6 + 14 * u * (p.big ? 2.5 : 1); star4(x, Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d), Math.max(1, Math.round(3 * (1 - u))), '#ffffff'); }
        break;
      }
      case 'pop': {
        if (age > 0.42) break;
        const u = age / 0.42;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * 6.283 + r(i), d = 8 + 30 * Math.sqrt(u);
          x.globalAlpha = 1 - u * u;
          disc(x, sx + Math.cos(a) * d, sy + Math.sin(a) * d * 0.8 - 14 * u, 10 * (1 - u * 0.6), u < 0.3 ? '#ffffff' : i % 2 ? '#e8ecf8' : '#b8c0d8');
        }
        if (age < 0.08) disc(x, sx, sy, 22, '#ffffff');
        else if (age < 0.16) disc(x, sx, sy, 16, '#fff6b4');
        x.globalAlpha = 1;
        // shrapnel bolts
        for (let i = 0; i < 4; i++) {
          const vx = (r(i + 20) - 0.5) * 300, vy = -220 - r(i + 30) * 200;
          fill(x, i % 2 ? '#8a90a8' : '#e8ecf8', sx + vx * age, sy + vy * age + 900 * age * age, 4, 4);
        }
        break;
      }
      case 'shock': {
        if (age > 0.22) break;
        const u = age / 0.22;
        x.strokeStyle = '#ffffff'; x.globalAlpha = 1 - u; x.lineWidth = 3;
        x.beginPath(); x.arc(sx, sy, 10 + 50 * u, 0, 7); x.stroke();
        x.globalAlpha = 1;
        break;
      }
      case 'dust': {
        if (age > 0.4) break;
        const u = age / 0.4;
        for (let i = 0; i < p.n; i++) {
          const dir = i % 2 ? 1 : -1, sp = (40 + 60 * r(i)) * (p.big ? 1.8 : 1);
          x.globalAlpha = 1 - u;
          disc(x, sx + dir * sp * age * 1.5, sy - 3 - 20 * age * r(i + 9), (2 + 5 * u) * (p.big ? 1.6 : 1), u < 0.5 ? '#ffffff' : '#e6eef8');
        }
        x.globalAlpha = 1;
        break;
      }
      case 'launch': {
        if (age > 0.5) break;
        const u = age / 0.5;
        for (let i = 0; i < 9; i++) {
          x.globalAlpha = (1 - u) * 0.9;
          disc(x, sx - 20 - i * 14 * (0.4 + u) - r(i) * 10, sy - 4 - r(i + 3) * 14 * u, 4 + 8 * u * r(i + 5), '#ffffff');
        }
        x.globalAlpha = 1;
        break;
      }
      case 'boost': {
        if (age > 0.35) break;
        const u = age / 0.35;
        for (let i = 0; i < 4; i++) {
          x.globalAlpha = (1 - u);
          const cx = sx + 40 + i * 30 + u * 160;
          x.strokeStyle = i % 2 ? '#ffd34a' : '#ffffff'; x.lineWidth = 4;
          x.beginPath(); x.moveTo(cx - 12, sy - 16); x.lineTo(cx, sy); x.lineTo(cx - 12, sy + 16); x.stroke();
        }
        x.globalAlpha = 1;
        break;
      }
      case 'spark': {
        const T = p.big ? 0.5 : 0.3;
        if (age > T) break;
        const u = age / T, n = p.big ? 12 : 8;
        if (age < 0.05) disc(x, sx, sy, p.big ? 30 : 18, '#ffffff');
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.283 + r(1), d = (p.big ? 80 : 46) * Math.sqrt(u);
          star4(x, Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d), Math.round(4 * (1 - u)) + 1, i % 2 ? '#fff6a0' : '#ffffff');
        }
        break;
      }
    }
  }
  // boss explosion chain
  const pp = pod(BOSS_DIE);
  for (const b of BOOMS) {
    const age = g - b.g;
    if (age < 0 || age > 0.45) continue;
    const u = age / 0.45, sx = pp.x + b.dx - cam, sy = pp.y + b.dy + oy, R = 36 * Math.sqrt(u) + 8;
    const cols = ['#ffffff', '#fff1a0', '#ffb43a', '#ff5a2a', '#5a4a58'];
    disc(x, sx, sy, R, cols[Math.min(4, Math.floor(u * 5))]);
    if (u < 0.6) disc(x, sx - R * 0.25, sy - R * 0.25, R * 0.5, u < 0.3 ? '#ffffff' : '#fff1a0');
    if (u > 0.5) { x.globalAlpha = 1 - u; disc(x, sx, sy - 16 * u, R * 0.8, '#3a3440'); x.globalAlpha = 1; }
  }
}

// ---------- rings ----------
function drawRings(x, g, cam, oy) {
  const f = Math.floor(g * 14);
  for (const r of RINGS) {
    if (g >= r.g) continue;
    const sx = r.x - cam;
    if (sx < -30 || sx > LW + 30) continue;
    x.drawImage(ART.ring[(f + Math.floor(r.x / 40)) % 8], Math.round(sx - 12), Math.round(r.y - 12 + oy));
  }
  for (const r of SCATTER) {
    if (r.got && g >= r.got) continue;
    const p = scatterAt(r, g);
    if (!p || p.age > SCATTER_LIFE) continue;
    if (p.age > SCATTER_LIFE - 0.7 && Math.floor(g * 30) % 2) continue;
    x.drawImage(ART.ring[(Math.floor(g * 28) + r.i) % 8], Math.round(p.x - cam - 12), Math.round(p.y - 12 + oy));
  }
}

// ---------- hero ----------
const HQ = () => ({ c: ART.quills, x: -26, y: -2 });
function heroOpts(h, g) {
  const v = Math.abs(h.v), o = { quills: HQ(), lean: 0 };
  if (h.mode === 'idle') {
    const tap = Math.floor(g / 0.16) % 2;
    o.lift = [0, tap * 3];
    o.sy = 1 + 0.015 * Math.sin(g * 6);
  } else if (h.mode === 'rev') {
    const u = (g - REV.t0) / (REV.t1 - REV.t0);
    o.wheel = (g * (6 + 18 * u)) % 1;
    o.lean = 0.06 + 0.08 * u;
  } else if (h.mode === 'stand' || (h.mode === 'run' && v < 30)) {
    o.lift = [0, 0];
  } else if (h.mode === 'run') {
    if (v > 600) { o.wheel = (heroX(g) / 90) % 1; o.lean = 0.12; }
    else {
      const ph = (heroX(g) / 40) * Math.PI * 2, s = Math.sin(ph);
      o.lift = [Math.round(Math.max(0, s) * 6), Math.round(Math.max(0, -s) * 6)];
      o.stride = [Math.round(s * 3), Math.round(-s * 3)];
      o.lean = 0.07;
    }
    o.flip = h.v < 0;
  } else if (h.mode === 'spring') {
    o.sy = 1.14; o.sx = 0.9; o.lift = [4, 2]; o.lean = -0.02;
  } else if (h.mode === 'hurt') {
    o.lean = -0.16; o.rot = -0.35; o.lift = [5, 2];
  } else if (h.mode === 'hop') {
    o.lift = [5, 5]; o.sy = 1.06;
  }
  // landing squash
  for (const gl of LANDINGS) { const d = g - gl; if (d >= 0 && d < 0.1) { const s = Math.sin((d / 0.1) * Math.PI); o.sy = (o.sy ?? 1) * (1 - 0.14 * s); o.sx = (o.sx ?? 1) * (1 + 0.12 * s); } }
  if (h.loop || h.rot) o.rot = h.rot;
  return o;
}
function drawBall(x, sx, sy, g, dir, k = 1, alpha = 1) {
  const f = ((Math.floor(g * 34) * dir) % 8 + 8) % 8, b = ART.ball[f];
  x.save();
  x.globalAlpha *= alpha;
  x.translate(Math.round(sx), Math.round(sy));
  if (k !== 1) x.scale(1 / k, k);
  x.drawImage(b, -b.width / 2, -b.height / 2);
  x.restore();
}
function drawHero(x, g, stop, sl, cam, oy) {
  const h = hero(g);
  const sx = h.x - cam, sy = h.y + oy;
  if (invincible(g) && Math.floor(g * 30) % 2 === 1) return;
  const fast = Math.abs(h.v) >= 1000;
  if (h.mode === 'ball') {
    // blur trail
    for (let i = 3; i >= 1; i--) {
      const gg = g - i * 0.018, hh = hero(gg);
      if (hh.mode !== 'ball') continue;
      drawBall(x, hh.x - cam, hh.y + oy - BALL_R, gg, h.v < 0 ? -1 : 1, 1, 0.16 * (4 - i));
    }
    let k = 1;
    for (const t of [...BADNIKS.map((b) => b.g), ...BOSS_HITS]) { const d = g - t; if (d >= 0 && d < 0.1) k = 1 + 0.18 * Math.sin((d / 0.1) * Math.PI); }
    drawBall(x, sx, sy - BALL_R, g, h.v < 0 ? -1 : 1, k);
    return;
  }
  const o = heroOpts(h, g);
  if (fast || h.mode === 'rev') {
    // after-images
    for (let i = 4; i >= 1; i--) {
      const gg = g - i * (h.mode === 'rev' ? 0.012 : 0.022), hh = hero(gg);
      const oo = heroOpts(hh, gg);
      A.drawRemy(x, ART.hero, hh.x - cam + (h.mode === 'rev' ? -i * 3 : 0), hh.y + oy, { ...oo, tint: '#ff704a', tintA: 0.7, alpha: 0.14 * (5 - i) });
    }
  }
  if (stop?.kind === 'hurt') { o.tint = Math.floor(sl / 0.03) % 2 ? '#ffffff' : '#ff5a5a'; o.tintA = 0.75; }
  A.drawRemy(x, ART.hero, sx, sy, o);
}

// ---------- badniks + freed animals ----------
function drawBadniks(x, g, cam, oy) {
  for (const b of BADNIKS) {
    const p = badnikAt(b, g), sx = p.x - cam;
    if (sx < -140 || sx > LW + 140) continue;
    if (g < b.g) {
      const f = Math.floor(g * 10) % 2;
      if (b.kind === 'moto') {
        const art = ART.moto[f];
        x.drawImage(art, Math.round(sx - 38), Math.round(GY + oy - art.height + 1 - (f ? 1 : 0)));
        for (let i = 0; i < 3; i++) { const a = (g * 3 + i / 3) % 1; x.globalAlpha = 0.7 * (1 - a); disc(x, sx + 34 + a * 24, GY + oy - 22 - a * 10, 3 + a * 5, '#e8ecf8'); }
        x.globalAlpha = 1;
      } else if (b.kind === 'buzz') {
        const art = ART.buzz[Math.floor(g * 24) % 2];
        x.drawImage(art, Math.round(sx - 40), Math.round(p.y + oy - 34));
        const fl = 4 + 3 * Math.sin(g * 70);
        disc(x, sx + 52, p.y + oy + 2, fl, '#ffb43a'); disc(x, sx + 52 + fl, p.y + oy + 2, fl * 0.6, '#ffffff');
      } else {
        const art = ART.crab[Math.floor(g * 6) % 2];
        x.drawImage(art, Math.round(sx - 52), Math.round(GY + oy - art.height + 2));
      }
      continue;
    }
    // freed animal
    const a = g - b.g - 0.06;
    if (a < 0 || a > 2.5) continue;
    const pop = Math.min(1, a / 0.12);
    const cy0 = b.kind === 'buzz' ? p.y : GY - 26;
    if (b.animal === 'bird') {
      const ax = sx - 60 * a - 10, ay = cy0 + oy - 90 * a + 20 * Math.sin(a * 6);
      const art = ART.animals.bird[Math.floor(g * 16) % 2];
      x.save(); x.translate(Math.round(ax), Math.round(ay)); x.scale(-pop, pop); x.drawImage(art, -11, -11); x.restore();
    } else {
      const dir = b.animal === 'rabbit' ? -1 : 1, hopT = 0.32, n = Math.floor(a / hopT), u = (a % hopT) / hopT;
      const pre = a < 0.25;
      const ax = sx + dir * 150 * Math.max(0, a - 0.1);
      const ay = pre ? cy0 + oy - 60 * Math.sin((a / 0.25) * Math.PI * 0.5) + 60 * Math.max(0, (a - 0.12) / 0.13) ** 2 * 1.5 : GY + oy - 11 - 34 * Math.sin(u * Math.PI);
      const art = ART.animals[b.animal][u < 0.5 || pre ? 1 : 0];
      x.save(); x.translate(Math.round(ax), Math.round(Math.min(ay, GY + oy - 11))); x.scale(dir * pop, pop); x.drawImage(art, -11, -11); x.restore();
      void n;
    }
  }
}

// ---------- boss ----------
function drawBoss(x, g, stop, sl, cam, oy) {
  if (g < LOCK_G) return;
  const p = pod(g), w = wreck(g), sx = p.x - cam, sy = p.y + oy;
  if (sx > LW + 260 || sy < -200) return;
  // chain + ball
  const hx = sx, hy = sy + 30;
  if (w.attached) {
    for (let i = 1; i <= 7; i++) {
      const u = i / 8, lx = hx + (w.x - cam - hx) * u, ly = hy + (w.y + oy - hy) * u;
      disc(x, lx, ly, 4, '#10142a'); disc(x, lx, ly, 3, i % 2 ? '#b8c0d8' : '#e8ecf8');
    }
  } else if (g < BOSS_DIE + 0.3) {
    for (let i = 1; i <= 3; i++) { const u = i / 8; disc(x, hx + 6 * Math.sin(g * 20 + i), hy + CHAIN * u, 3, '#b8c0d8'); }
  }
  const wi = ((Math.floor((w.a * 8) / (Math.PI * 0.5)) % 8) + 8) % 8;
  x.drawImage(ART.wreck[wi], Math.round(w.x - cam - ART.wreck[0].width / 2), Math.round(w.y + oy - ART.wreck[0].height / 2));
  // the pod
  const flash = BOSS_HITS.some((h) => g >= h && g < h + 0.3) || (stop && stop.g !== HURT_G && g >= BOSS_HITS[0]);
  const white = flash && Math.floor((g + sl) * 30) % 2 === 0;
  const dead = g >= BOSS_DIE;
  const fleeing = g >= BOSS_FLEE;
  x.save();
  x.translate(Math.round(sx), Math.round(sy));
  if (p.tilt) x.rotate(p.tilt);
  // jet flame
  const fl = 10 + 6 * Math.sin(g * 60) + (fleeing ? 14 : 0);
  if (!dead || fleeing || Math.floor(g * 20) % 3 === 0) {
    x.fillStyle = '#ffb43a'; x.beginPath(); x.moveTo(-12, 44); x.lineTo(12, 44); x.lineTo(0, 44 + fl * 2); x.fill();
    x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(-6, 44); x.lineTo(6, 44); x.lineTo(0, 44 + fl); x.fill();
  }
  // Dr. Baldnik
  const bob = dead ? 0 : Math.round(Math.sin(g * 5) * 1.5);
  const look = fleeing ? false : true;
  A.drawRemy(x, ART.boss, 6, 6 + bob, { flip: look, tint: white ? '#ffffff' : dead ? '#2a1a24' : null, tintA: white ? 0.85 : 0.35, rot: BOSS_HITS.some((h) => g >= h && g < h + 0.25) ? -0.12 : 0 });
  // hull + glass
  x.drawImage(white ? ART.hullWhite : dead && !fleeing ? ART.hullDark : ART.hull, -78, -46);
  x.globalAlpha = 0.32; x.fillStyle = '#9ce8ff';
  x.beginPath(); x.moveTo(-74, -28); x.quadraticCurveTo(-70, -78, -24, -82); x.lineTo(-24, -28); x.fill();
  x.globalAlpha = 0.8; x.strokeStyle = '#ffffff'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(-64, -34); x.quadraticCurveTo(-60, -68, -34, -72); x.stroke();
  x.globalAlpha = 1;
  x.restore();
  // smoke from the wreck
  if (dead) {
    for (let i = 0; i < 10; i++) {
      const t0 = Math.floor(g / 0.06) * 0.06 - i * 0.06, a = g - t0;
      if (t0 < BOSS_DIE) continue;
      const pp = pod(t0), px = pp.x - cam + (hash(i + Math.floor(t0 * 100)) - 0.5) * 40, py = pp.y + oy - 20 - a * 70;
      x.globalAlpha = Math.max(0, 0.75 - a * 1.1);
      const rr = 5 + a * 14;
      disc(x, px - a * 30, py, rr, '#2a2430'); disc(x, px - a * 30 - rr * 0.25, py - rr * 0.25, rr * 0.7, i % 2 ? '#6a6070' : '#4a4252');
    }
    x.globalAlpha = 1;
  }
  // nameplate on arrival
  const na = g - (LOCK_G + 0.4);
  if (na > 0 && na < 1.1) {
    const slide = easeOut(na / 0.18) * (1 - easeIn((na - 0.9) / 0.2));
    text(x, 'DR. BALDNIK', LW - 30 + 360 * (1 - slide), 120, { size: 16, align: 'right', color: '#ff6a8a', outline: true });
  }
}

// ---------- world props ----------
function drawProps(x, g, cam, oy) {
  // booster panel
  const bsx = BOOST_X - cam;
  if (bsx > -80 && bsx < LW + 80) x.drawImage(ART.booster[Math.floor(g * 16) % 4], Math.round(bsx - 36), GY + oy - 8);
  // spring
  const ssx = SPRING_X - cam;
  if (ssx > -80 && ssx < LW + 80) {
    const d = g - SPRING_G;
    let k = 1;
    if (d >= 0 && d < 0.05) k = 0;
    else if (d >= 0.05 && d < 0.6) k = 3 + Math.round(Math.sin((d - 0.05) * 50) * Math.exp(-(d - 0.05) * 7) * 2);
    const art = ART.spring[k === 0 ? 0 : k >= 4 ? 3 : k <= 1 ? 1 : 2];
    x.drawImage(art, Math.round(ssx - 18), GY + oy - 58);
  }
  // spikes
  const kx = SPIKES.l - cam;
  if (kx > -200 && kx < LW + 20) x.drawImage(ART.spikes, Math.round(kx), GY + oy - ART.spikes.height + 2);
  // signpost
  const px = SIGN_X - cam;
  if (px > -60 && px < LW + 60) {
    fill(x, '#10142a', px - 3, GY + oy - 70, 6, 70);
    fill(x, '#b8c0d8', px - 2, GY + oy - 70, 4, 70);
    fill(x, '#ffffff', px - 2, GY + oy - 70, 1, 70);
    const ang = signAngle(g);
    const cs = Math.cos(ang), face = Math.floor((ang + Math.PI / 2) / Math.PI) % 2 === 0 ? ART.signBald : ART.signRemy;
    const w = Math.max(4, Math.abs(cs) * 60), cy = GY + oy - 100;
    x.drawImage(face, 0, 0, 60, 60, Math.round(px - w / 2), Math.round(cy - 30), Math.round(w), 60);
    if (Math.abs(cs) < 0.35) fill(x, '#10142a', px - 2, cy - 30, 4, 60);
  }
}

function drawLoop(x, cam, oy) {
  const sx = LOOP.x - cam;
  if (sx < -300 || sx > LW + 300) return;
  const L = ART.loop;
  x.drawImage(L, Math.round(sx - L.width / 2), Math.round(LOOP.cy + oy - L.height / 2));
}

function drawGround(x, cam, oy) {
  const T = ART.ground, tw = T.width, ox = -(((cam % tw) + tw) % tw);
  for (let k = 0; ox + k * tw < LW; k++) x.drawImage(T, Math.round(ox + k * tw), GY + oy);
}

// ---------- speed lines ----------
function drawSpeedLines(x, g) {
  const v = Math.abs(heroSpeed(g)), k = clamp01((v - 900) / 250);
  if (k <= 0) return;
  for (let i = 0; i < 14; i++) {
    const y = 60 + hash(i + 77) * 420, len = 60 + hash(i + 78) * 140, sp = 1800 + hash(i + 79) * 1200;
    const xx = LW - (((g * sp + hash(i + 80) * 2000) % (LW + 400)) - 200);
    x.globalAlpha = 0.5 * k;
    fill(x, '#ffffff', xx, y, len, 2);
  }
  x.globalAlpha = 1;
}

// ---------- popups ----------
function drawPopups(x, g, cam, oy) {
  const pops = BADNIKS.map((b) => { const p = badnikAt(b, b.g); return [b.g, p.x, (b.kind === 'buzz' ? p.y : GY - 40) - 20, b.pts]; });
  pops.push([BOSS_DIE + 0.4, pod(BOSS_DIE).x, pod(BOSS_DIE).y - 110, '1000']);
  for (const [t, px, py, s] of pops) {
    const a = g - t;
    if (a < 0 || a > 0.8) continue;
    text(x, s, px - cam, py + oy - 46 * Math.sqrt(a / 0.8), { size: 16, align: 'center', color: '#ffffff', alpha: clamp01((0.8 - a) / 0.15) });
  }
}

// ---------- HUD (Sonic-style, top-left) ----------
function drawHud(x, g, alpha) {
  if (alpha <= 0) return;
  x.save();
  x.globalAlpha = alpha;
  const sc = hudScore(g), t = hudTime(g), rings = hudRings(g);
  const lab = { size: 16, color: '#ffe23a', shadow: '#10142a', outline: true };
  text(x, 'SCORE', 34, 26, lab);
  text(x, String(sc), 290, 26, { ...lab, color: '#ffffff', align: 'right' });
  text(x, 'TIME', 34, 54, lab);
  text(x, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, 290 - 48, 54, { ...lab, color: '#ffffff', align: 'right' });
  const zero = rings === 0 && g > HURT_G && Math.floor(g * 4) % 2 === 0;
  text(x, 'RINGS', 34, 82, { ...lab, color: zero ? '#ff3a3a' : '#ffe23a' });
  // spinning ring + count bump when a ring comes in
  const ri = ART.ringIcon[Math.floor(g * 16) % 8];
  x.drawImage(ri, 128, 77);
  let bump = 0;
  for (const r of RINGS) { const d = g - r.g; if (d >= 0 && d < 0.12) bump = Math.max(bump, Math.sin((d / 0.12) * Math.PI)); }
  for (const r of SCATTER) if (r.got) { const d = g - r.got; if (d >= 0 && d < 0.12) bump = Math.max(bump, Math.sin((d / 0.12) * Math.PI)); }
  text(x, String(rings), 290 - 48, 82 - Math.round(bump * 4), { ...lab, color: bump > 0.3 ? '#fff6b4' : '#ffffff', align: 'right' });
  // lives
  x.drawImage(ART.heroHead2, 30, LH - 62);
  text(x, 'REMY', 70, LH - 60, { size: 8, color: '#ffe23a', outline: true });
  text(x, '× 3', 70, LH - 46, { size: 16, color: '#ffffff', outline: true });
  x.restore();
}

// ---------- zone title card ----------
function drawCard(x, g) {
  if (g >= CARD.end) return;
  const ein = easeOut(g / CARD.hold), eout = easeIn((g - CARD.out) / (CARD.end - CARD.out));
  const k = ein - eout; // 0 → 1 → 0
  // blue panel (zig-zag edge) drops from the top
  const by = -LH * (1 - ein) - LH * eout;
  x.fillStyle = '#1838c0';
  x.beginPath(); x.moveTo(0, by); x.lineTo(330, by);
  for (let i = 0; i <= 18; i++) x.lineTo(330 + (i % 2 ? 22 : 0), by + (i * LH) / 18);
  x.lineTo(0, by + LH); x.fill();
  fill(x, '#2f56e6', 0, by, 300, LH);
  for (let i = 0; i < 9; i++) fill(x, '#2448d0', 0, by + i * 60 + 30, 300, 6);
  // red bar with vertical title (rises from the bottom)
  const ry = LH * (1 - ein) + LH * eout;
  fill(x, '#10142a', 168, ry, 64, LH);
  fill(x, '#d82828', 172, ry, 56, LH);
  fill(x, '#ff6a5a', 172, ry, 6, LH);
  'REMY RUSH'.split('').forEach((ch, i) => text(x, ch, 200, ry + 70 + i * 34, { size: 24, align: 'center', color: '#ffffff', shadow: '#5a0a10' }));
  // yellow strip from the right
  const yx = LW * (1 - ein) + LW * eout;
  fill(x, '#10142a', yx, 404, LW, 76);
  fill(x, '#ffd02a', yx, 408, LW, 68);
  fill(x, '#fff08a', yx, 408, LW, 8);
  // zone name slides in from the right, ACT from the left
  const tx = LW + 40 - (LW + 40 - 380) * ein + 700 * eout;
  text(x, 'HAIRLINE HILL', tx + 520, 188, { size: 40, align: 'right', color: '#ffffff', outline: true });
  text(x, 'ZONE', tx + 520, 244, { size: 40, align: 'right', color: '#ffffff', outline: true });
  const ax = 940 - 300 * ein - 700 * eout + 300;
  text(x, 'ACT', ax - 210, 330, { size: 24, align: 'right', color: '#ffffff', outline: true });
  disc(x, ax - 160, 344, 34, '#10142a'); disc(x, ax - 160, 344, 31, '#d82828'); disc(x, ax - 164, 340, 26, '#ff4a3a');
  text(x, '1', ax - 160, 322, { size: 40, align: 'center', color: '#ffe23a', shadow: '#5a0a10' });
  void k;
}

// ---------- act clear tally ----------
function drawTally(x, g) {
  if (g < TALLY.t0) return;
  const a = g - TALLY.t0;
  const l1 = -500 + 500 * easeOut(a / 0.25), l2 = 600 - 600 * easeOut((a - 0.08) / 0.25);
  text(x, 'REMY GOT', LW / 2 - 70 + l1, 120, { size: 32, align: 'center', color: '#ffffff', outline: true });
  text(x, 'THROUGH', LW / 2 - 70 + l2, 164, { size: 32, align: 'center', color: '#ffffff', outline: true });
  // ACT badge
  const bs = easeOut((a - 0.2) / 0.2);
  if (bs > 0) {
    x.save(); x.translate(LW / 2 + 190, 152); x.scale(bs, bs);
    text(x, 'ACT', -36, -46, { size: 16, color: '#ffe23a', outline: true });
    disc(x, 0, 0, 38, '#10142a'); disc(x, 0, 0, 35, '#d82828'); disc(x, -4, -4, 29, '#ff4a3a');
    text(x, '1', 0, -22, { size: 40, align: 'center', color: '#ffe23a', shadow: '#5a0a10' });
    x.restore();
  }
  const b = tallyBonus(g);
  const rows = [['SCORE', hudScore(g)], ['TIME BONUS', b.time], ['RING BONUS', b.ring]];
  rows.forEach(([lab, val], i) => {
    const s = g - TALLY.lines - i * 0.07;
    if (s < 0) return;
    const off = 700 * (1 - easeOut(s / 0.25));
    const y = 248 + i * 40;
    text(x, lab, 270 + off, y, { size: 20, color: '#ffe23a', outline: true });
    text(x, String(val), 700 + off, y, { size: 20, align: 'right', color: '#ffffff', outline: true });
  });
  // total flash once the count lands
  if (g > TALLY.count1) {
    const u = g - TALLY.count1;
    if (u < 0.3 && Math.floor(u * 20) % 2 === 0) { x.globalAlpha = 0.25; fill(x, '#ffffff', 260, 240, 460, 34); x.globalAlpha = 1; }
  }
}

// ---------- frame ----------
export function drawLevel(lt) {
  const { g, stop, sl } = warp(lt);
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  // Shake exposes edge pixels: paint them anew so seeking never inherits a previous frame.
  fill(x, '#10142a', 0, 0, LW, LH);
  let shx = 0, shy = 0;
  for (const [ge, amp] of SHOOK) {
    const d = lt - (filmT(ge) - INTRO);
    if (d < 0 || d > 0.35) continue;
    const k = amp * Math.exp(-d * 14);
    shx += k * Math.sin(d * 95 + ge * 10);
    shy += k * Math.cos(d * 77 + ge * 7);
  }
  const cam = Math.round(camX(g)), oy = -Math.round(camY(g));
  x.save();
  x.translate(Math.round(shx), Math.round(shy));
  drawBackdrop(x, cam, oy, g);
  drawDecor(x, g, cam, oy);
  drawLoop(x, cam, oy);
  drawGround(x, cam, oy);
  drawProps(x, g, cam, oy);
  drawRings(x, g, cam, oy);
  drawBadniks(x, g, cam, oy);
  drawBoss(x, g, stop, sl, cam, oy);
  drawHero(x, g, stop, sl, cam, oy);
  drawParticles(x, g, cam, oy);
  drawPopups(x, g, cam, oy);
  drawSpeedLines(x, g);
  if (stop?.kind === 'final') { x.globalAlpha = 0.5 * (1 - sl / stop.d); fill(x, '#ffffff', -20, -20, LW + 40, LH + 40); x.globalAlpha = 1; }
  x.restore();
  // Gameplay UI is composited after the CRT/grade so the small pixel lettering stays sharp.
  const ui = ART.ui.getContext('2d');
  ui.setTransform(1, 0, 0, 1, 0, 0);
  ui.clearRect(0, 0, LW, LH);
  ui.globalAlpha = 1;
  drawHud(ui, g, g < CARD.out ? 0 : clamp01((g - CARD.out) / 0.15));
  drawCard(ui, g);
  drawTally(ui, g);
  // fade in from black at the start, fade out at the end
  const fin = clamp01(lt / 0.18), fout = clamp01((g - FADE.t0) / (FADE.t1 - FADE.t0));
  const dark = Math.max(1 - fin, fout);
  if (dark > 0) { x.globalAlpha = dark; fill(x, '#000000', 0, 0, LW, LH); x.globalAlpha = 1; }
  ui.globalCompositeOperation = 'destination-in';
  ui.globalAlpha = 1 - dark;
  ui.fillRect(0, 0, LW, LH);
  ui.globalCompositeOperation = 'source-over';
  ui.globalAlpha = 1;
  return { low: ART.low, ui: ART.ui, g, stop };
}
export { STOPS, G_END, TIME_BONUS, ringBonus, LOOP_G, loopEnd, SIGN_G, STOP_G, CAM_LOCK, BOSS_BALL_R, BOSS_FLEE };
