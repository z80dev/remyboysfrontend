// The round: drawn at the arcade's native 960×540 into a low-res canvas (upscaled 2× nearest by film.js).
import { hash } from 'filmkit/lib.js';
import { canvas, loadFighter, drawFighter, headCrop, INK } from './rig.js';
import { prepareStage, drawStage, drawSteam, FONT } from './stage.js';
import {
  LW, LH, GY, warp, shotT, heroX, bossX, camX, HITS, STOPS, WALK, KICK_G, BPUNCH, JUMP, JK_G, PUNCH_G, SLASH_G, DK, DK_HIT, DK_X0,
  BALL, ballX, SUPER_G, SUPER_D, BEAM, BEAM_X0, BEAM_CLASH, BEAM_HITS, KO_G, LAND, WIN_G, YOUWIN_G, PERFECT_G, ROUND_G, FIGHT_G,
  bossLife, bossLag, hudTimer, hudScore, superGauge, combo, koDX, koY, BOSS_FRONT, G_END,
} from './choreo.js';

export const ART = {};
export const S_HERO = 2, S_BOSS = 3;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const R = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
const env = (g, a, peak, b) => (g < a || g > b ? 0 : g < peak ? (g - a) / (peak - a) : 1 - (g - peak) / (b - peak));

export async function prepareFight() {
  ART.hero = await loadFighter(42);
  ART.boss = await loadFighter(1217);
  ART.heroFace = headCrop(ART.hero, 3);
  ART.bossDome = headCrop(ART.boss, 1);
  await prepareStage();
  ART.low = canvas(LW, LH);
  // purple-tinted dome for the boss's projectile
  const d = ART.bossDome, t = canvas(d.width, d.height), tx = t.getContext('2d');
  tx.drawImage(d, 0, 0);
  tx.globalCompositeOperation = 'source-atop';
  tx.fillStyle = 'rgba(190,120,255,0.55)';
  tx.fillRect(0, 0, t.width, t.height);
  ART.domeBall = t;
}

// ---------- text ----------
export function text(x, s, a, b, { size = 16, color = '#fff', shadow = INK, align = 'left', alpha = 1, outline = null } = {}) {
  x.save();
  x.globalAlpha *= alpha;
  x.font = `${size}px ${FONT}`;
  x.textAlign = align;
  x.textBaseline = 'top';
  const k = Math.max(1, Math.round(size / 8));
  if (outline) for (const [dx, dy] of [[-k, 0], [k, 0], [0, -k], [0, k], [-k, -k], [k, k], [-k, k], [k, -k]]) { x.fillStyle = outline; x.fillText(s, Math.round(a + dx), Math.round(b + dy)); }
  if (shadow) { x.fillStyle = shadow; x.fillText(s, Math.round(a + k), Math.round(b + k)); }
  x.fillStyle = color;
  x.fillText(s, Math.round(a), Math.round(b));
  x.restore();
}
// Arcade title text: vertical gradient fill, thick ink outline, drop shadow; scaled about its centre.
export function bigText(x, s, cx, cy, size, { stops = ['#ffffff', '#ffe14a', '#ff7a1a'], outline = INK, scale = 1, alpha = 1, shadow = '#000000', tracking = 0 } = {}) {
  x.save();
  x.globalAlpha *= alpha;
  x.translate(Math.round(cx), Math.round(cy));
  x.scale(scale, scale);
  x.font = `${size}px ${FONT}`;
  x.textBaseline = 'middle';
  x.textAlign = 'left';
  const w = s.length * (size + tracking) - tracking;
  const k = Math.max(2, Math.round(size / 10));
  const put = (dx, dy) => { for (let i = 0; i < s.length; i++) x.fillText(s[i], -w / 2 + i * (size + tracking) + dx, dy); };
  if (shadow) { x.fillStyle = shadow; put(k * 1.5, k * 1.5 + 2); }
  x.fillStyle = outline;
  for (const [dx, dy] of [[-k, 0], [k, 0], [0, -k], [0, k], [-k, -k], [k, k], [-k, k], [k, -k]]) put(dx, dy);
  const g = x.createLinearGradient(0, -size / 2, 0, size / 2);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  x.fillStyle = g;
  put(0, 0);
  x.restore();
}

// ---------- event FX (shot-time based, so sparks keep animating through hit-stops) ----------
const FX = [];
const fx = (g, kind, wx, wy, extra = {}) => FX.push({ ts: shotT(g), g, kind, x: wx, y: wy, seed: FX.length * 17 + 3, ...extra });
for (const h of HITS) {
  if (h.kind === 'block') fx(h.g, 'block', h.x, h.y, { dir: h.on === 'boss' ? 1 : -1 });
  else fx(h.g, 'hit', h.x, h.y, { big: !!h.big, ko: !!h.ko });
}
fx(JUMP.t1, 'dust', heroX(JUMP.t1), GY, { n: 6 });
fx(JUMP.t0, 'dust', heroX(JUMP.t0), GY, { n: 3 });
fx(BEAM_CLASH, 'clash', 0, BALL.y, { atBall: true });
fx(LAND[0], 'land', 0, GY, { atBoss: true });
fx(LAND[1], 'land', 0, GY, { atBoss: true, small: true });
fx(SUPER_G, 'superflash', 0, 0);
// slide dust trails under the boss
for (const [a, b] of [[SLASH_G, SLASH_G + 0.34], [DK_HIT, DK_HIT + 0.35], [BEAM_HITS[0], KO_G]]) for (let g = a; g < b; g += 0.05) fx(g, 'puff', 0, GY - 4, { atBossG: g });

const SHAKES = [];
for (const h of HITS) SHAKES.push([shotT(h.g), h.ko ? 12 : h.big ? 6 : h.kind === 'block' ? 2 : 3.5]);
SHAKES.push([shotT(LAND[0]), 8], [shotT(LAND[1]), 3], [shotT(SUPER_G) + SUPER_D - 0.02, 5], [shotT(BEAM_CLASH), 6]);

function star(x, cx, cy, n, r0, r1, rot, col) {
  x.fillStyle = col;
  x.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r0 : r1 * (i % 4 === 0 ? 1 : 0.62);
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    i ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.closePath();
  x.fill();
}

function drawFX(x, ts, g, cam) {
  for (const p of FX) {
    const age = ts - p.ts;
    if (age < 0 || age > 1.2) continue;
    const r = (k) => hash(p.seed * 31 + k);
    let sx = p.x - cam, sy = p.y;
    if (p.atBall) sx = ballX(BEAM_CLASH) - cam;
    if (p.atBoss) sx = bossX(p.g) + koDX(p.g) - cam;
    if (p.atBossG != null) sx = bossX(p.atBossG) - cam + 30;
    switch (p.kind) {
      case 'hit': {
        const life = p.ko ? 0.5 : p.big ? 0.26 : 0.18;
        if (age > life) break;
        const u = age / life, k = p.ko ? 2.4 : p.big ? 1.5 : 1;
        x.save();
        x.globalCompositeOperation = 'lighter';
        const gl = x.createRadialGradient(sx, sy, 0, sx, sy, 70 * k);
        gl.addColorStop(0, `rgba(255,220,140,${0.7 * (1 - u)})`); gl.addColorStop(1, 'rgba(255,80,20,0)');
        x.fillStyle = gl; x.fillRect(sx - 70 * k, sy - 70 * k, 140 * k, 140 * k);
        x.restore();
        const cols = ['#ffffff', '#fff6a0', '#ffd24a', '#ff8a2a', '#ff3a2a'];
        const c = cols[Math.min(4, Math.floor(u * 5))];
        if (age < 0.035) star(x, sx, sy, 4, 6 * k, 34 * k, Math.PI / 4, '#ffffff');
        else {
          star(x, sx, sy, 6, 8 * k * (1 - u), (22 + 34 * Math.sqrt(u)) * k, r(1) + u * 0.4, c);
          star(x, sx, sy, 6, 4 * k * (1 - u), (12 + 18 * Math.sqrt(u)) * k, r(1) + 0.5 + u * 0.4, u < 0.5 ? '#ffffff' : '#fff6a0');
        }
        x.strokeStyle = '#ffffff'; x.lineWidth = 2; x.globalAlpha = 1 - u;
        x.beginPath(); x.moveTo(sx + (14 + 60 * u) * k, sy); x.arc(sx, sy, (14 + 60 * u) * k, 0, 7); x.stroke();
        x.globalAlpha = 1;
        for (let i = 0; i < 10; i++) {
          const a = r(i + 3) * 6.283, d = (20 + 90 * r(i + 20)) * Math.sqrt(u) * k;
          R(x, i % 2 ? '#ffffff' : '#ffd24a', sx + Math.cos(a) * d, sy + Math.sin(a) * d + 30 * u * u, 3, 3);
        }
        break;
      }
      case 'block': {
        if (age > 0.16) break;
        const u = age / 0.16, d = p.dir;
        x.save();
        x.globalCompositeOperation = 'lighter';
        x.strokeStyle = u < 0.3 ? '#ffffff' : '#7ad8ff'; x.lineWidth = 4;
        x.beginPath(); x.arc(sx + d * 8, sy, 18 + 22 * u, Math.PI - 1.2 + (d > 0 ? Math.PI : 0), Math.PI + 1.2 + (d > 0 ? Math.PI : 0)); x.stroke();
        x.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = (d > 0 ? Math.PI : 0) + (i - 2.5) * 0.35, d0 = 10 + 40 * u, d1 = d0 + 14 * (1 - u);
          x.strokeStyle = i % 2 ? '#ffffff' : '#9ae6ff';
          x.beginPath(); x.moveTo(sx + Math.cos(a) * d0, sy + Math.sin(a) * d0); x.lineTo(sx + Math.cos(a) * d1, sy + Math.sin(a) * d1); x.stroke();
        }
        if (age < 0.04) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(sx, sy, 12, 0, 7); x.fill(); }
        x.restore();
        break;
      }
      case 'dust': case 'puff': case 'land': {
        const life = p.kind === 'puff' ? 0.4 : 0.45;
        if (age > life) break;
        const u = age / life, n = p.kind === 'land' ? (p.small ? 6 : 12) : p.kind === 'puff' ? 2 : p.n;
        for (let i = 0; i < n; i++) {
          const dir = i % 2 ? 1 : -1, sp = (p.kind === 'land' ? 90 : 40) * (0.6 + r(i));
          const px = sx + dir * sp * age * 1.8 * (1 - u * 0.4) + (p.kind === 'land' ? (r(i + 40) - 0.5) * 120 : 0), py = sy - 4 - 30 * age * r(i + 9);
          x.globalAlpha = 0.85 * (1 - u);
          x.fillStyle = u < 0.4 ? '#e8e0f8' : '#a89ac0';
          x.beginPath(); x.arc(Math.round(px), Math.round(py), Math.round((3 + 8 * u) * (p.kind === 'land' && !p.small ? 1.6 : 1)), 0, 7); x.fill();
        }
        x.globalAlpha = 1;
        break;
      }
      case 'clash': {
        if (age > 0.5) break;
        const u = age / 0.5;
        x.save();
        x.globalCompositeOperation = 'lighter';
        x.globalAlpha = 1 - u;
        star(x, sx, sy, 8, 10, 40 + 80 * Math.sqrt(u), u, '#d8a0ff');
        star(x, sx, sy, 8, 6, 24 + 40 * Math.sqrt(u), u + 0.4, '#ffffff');
        for (let i = 0; i < 16; i++) {
          const a = r(i) * 6.283, d = 140 * Math.sqrt(u) * (0.5 + r(i + 30));
          R(x, i % 2 ? '#c890ff' : '#ffffff', sx + Math.cos(a) * d, sy + Math.sin(a) * d + 80 * u * u, 4, 4);
        }
        x.restore();
        break;
      }
      default: break;
    }
  }
}

// ---------- fighters ----------
function hitShake(stop, sl, who) {
  if (!stop || (stop.kind !== 'hit' && stop.kind !== 'block' && stop.kind !== 'ko')) return 0;
  const h = HITS.find((e) => e.g === stop.g);
  if (!h || h.on !== who) return 0;
  return (Math.floor(sl * 60) % 2 ? 3 : -3) * (stop.kind === 'ko' ? 1.6 : 1);
}

function heroPose(g, stop, sl) {
  const x = heroX(g);
  let y = GY;
  const br = Math.sin(g * 7);
  const o = { arm: 'guard', lift: [0, 0], stride: [-2, 2], lean: 0.03 + 0.01 * br, sy: 1 + 0.012 * br, sx: 1 - 0.008 * br };
  if (g >= WALK[0] && g < WALK[1]) {
    const ph = (g - WALK[0]) * 16, s = Math.sin(ph);
    o.lift = [Math.round(Math.max(0, s) * 5), Math.round(Math.max(0, -s) * 5)];
    o.stride = [Math.round(s * 2), Math.round(-s * 2)];
    o.lean = 0.06;
  }
  const kk = env(g, KICK_G - 0.07, KICK_G, KICK_G + 0.16);
  if (kk > 0) { o.kick = smooth(Math.min(1, kk * 1.4)); o.kickAng = 2.1 * o.kick; o.lean = -0.08 * o.kick; o.stride = [-4, 0]; }
  if (g > BPUNCH.act - 0.12 && g < BPUNCH.act + 0.16) { o.arm = 'block'; o.lean = -0.06; o.crouch = 2; }
  if (g >= JUMP.t0 && g < JUMP.t1) {
    const u = (g - JUMP.t0) / (JUMP.t1 - JUMP.t0);
    y = GY - JUMP.h * 4 * u * (1 - u);
    o.lift = [9, 6];
    o.stride = [-2, 2];
    o.lean = 0.06;
    const jk = env(g, JK_G - 0.06, JK_G - 0.01, JK_G + 0.12);
    if (jk > 0) { o.kick = 1; o.kickAng = 0.5 + 0.7 * Math.min(1, jk * 2); o.lean = 0.12; o.lift = [10, 0]; }
    const st = clamp01(1 - (g - JUMP.t0) / 0.1);
    o.sy *= 1 + 0.12 * st; o.sx *= 1 - 0.08 * st;
  }
  const land = g - JUMP.t1;
  if (land >= 0 && land < 0.12) { const s = Math.sin((land / 0.12) * Math.PI); o.sy *= 1 - 0.12 * s; o.sx *= 1 + 0.1 * s; o.crouch = 3 * s; }
  const pp = env(g, PUNCH_G - 0.05, PUNCH_G, PUNCH_G + 0.12);
  if (pp > 0) { o.arm = 'punch'; o.ext = pp; o.lean = 0.04 + 0.08 * pp; o.stride = [-4, 3]; }
  if (g > SLASH_G - 0.1 && g < SLASH_G + 0.18) {
    const wind = g < SLASH_G - 0.02;
    o.arm = wind ? 'raise' : 'punch';
    o.ext = wind ? 0 : 1 - clamp01((g - SLASH_G) / 0.18);
    o.lean = wind ? -0.06 : 0.14;
    o.stride = [-6, 4];
  }
  if (g >= DK.t0 && g < DK.t1 + 0.1) {
    if (g < DK.rel - 0.02) { o.arm = 'guard'; o.lean = -0.07; o.crouch = 3; o.stride = [-6, 2]; }
    else { o.arm = 'palm'; o.ext = Math.min(1, (g - DK.rel + 0.02) / 0.04); o.lean = 0.1; o.stride = [-7, 5]; o.crouch = 2; }
  }
  if (stop?.kind === 'super') {
    o.arm = sl < SUPER_D - 0.12 ? 'guard' : 'palm';
    o.ext = 0.2;
    o.lean = -0.05;
    o.crouch = 4;
    o.stride = [-7, 4];
    o.glow = '#ff7a2a';
    o.glowA = 0.6 + 0.4 * Math.sin(sl * 50);
    if (Math.floor(sl / 0.05) % 6 === 0 && sl < 0.3) o.white = true;
  }
  if (g >= BEAM.rel && g < BEAM.end) {
    o.arm = 'palm'; o.ext = 1; o.lean = 0.08 + 0.02 * Math.sin(g * 80); o.stride = [-8, 5]; o.crouch = 3;
    o.glow = '#ff7a2a'; o.glowA = 0.7;
  }
  if (g >= WIN_G) {
    const a = g - WIN_G, u = clamp01(a / 0.4);
    y = GY - 70 * 4 * u * (1 - u);
    o.arm = 'raise';
    o.lean = -0.02;
    o.stride = [-3, 3];
    o.lift = u > 0 && u < 1 ? [6, 6] : [0, 0];
    if (a > 0.4 && a < 0.52) { const s = Math.sin(((a - 0.4) / 0.12) * Math.PI); o.sy = 1 - 0.12 * s; o.sx = 1 + 0.1 * s; }
    if (a > 0.52) { o.sy = 1 + 0.015 * Math.sin(g * 9); }
    o.glow = '#ffe14a'; o.glowA = 0.35 + 0.2 * Math.sin(g * 12);
  }
  return { x, y, o };
}

function bossPose(g, stop, sl) {
  let x = bossX(g), y = GY;
  const br = Math.sin(g * 5 + 1);
  const o = { arm: 'guard', lift: [0, 0], stride: [-3, 3], lean: 0.02 + 0.012 * br, sy: 1 + 0.01 * br, flip: true };
  if (g >= WALK[0] && g < WALK[1]) {
    const ph = (g - WALK[0]) * 13, s = Math.sin(ph);
    o.lift = [Math.round(Math.max(0, s) * 4), Math.round(Math.max(0, -s) * 4)];
    o.lean = 0.05;
  }
  if (g > KICK_G - 0.1 && g < KICK_G + 0.12) { o.arm = 'block'; o.lean = -0.05; o.crouch = 2; }
  if (g >= BPUNCH.t0 && g < BPUNCH.t1) {
    if (g < BPUNCH.act - 0.03) { o.arm = 'guard'; o.lean = -0.08; o.stride = [-5, 2]; }
    else { o.arm = 'punch'; o.ext = 1 - clamp01((g - BPUNCH.act - 0.06) / 0.14); o.reach = 0.55; o.lean = 0.12 * o.ext; o.stride = [-5, 4]; }
  }
  if (g >= BALL.t0 && g < BALL.rel + 0.3) {
    if (g < BALL.rel - 0.02) { o.arm = 'raise'; o.lean = -0.08; o.glow = '#b87aff'; o.glowA = 0.5 + 0.5 * Math.sin(g * 60); }
    else { o.arm = 'palm'; o.ext = 1; o.lean = 0.1; o.stride = [-6, 4]; }
  }
  // hurt
  const last = HITS.filter((h) => h.on === 'boss' && h.kind === 'hit' && g >= h.g).pop();
  if (last && g < KO_G) {
    const dur = last.big ? 0.4 : 0.26, a = g - last.g;
    if (a < dur || (g >= BEAM_HITS[0] && g < KO_G)) {
      o.arm = 'hurt';
      o.lean = -0.14 * (1 - clamp01(a / dur) * 0.6);
      o.stride = [-4, 4];
      o.glow = null;
      if (stop && stop.g === last.g && sl < 0.034) { o.white = '#ffffff'; o.whiteA = 0.8; }
    }
  }
  if (g >= BEAM_HITS[0] && g < KO_G && !o.white && Math.floor(g * 40) % 2 === 0) { o.white = '#ffb07a'; o.whiteA = 0.45; }
  // K.O. flight, slam, bounce, lie: the body centre follows the arc while the sprite spins about it
  let shadowX = x;
  if (g >= KO_G) {
    o.arm = g < LAND[0] ? 'hurt' : null;
    o.lean = -0.16;
    o.lift = [6, 2];
    const spin = g < LAND[0] ? smooth((g - KO_G) / (LAND[0] - KO_G)) * 1.3 : 1.3 + 0.27 * smooth((g - LAND[0]) / 0.25);
    const HB = ((ART.boss.bottom - ART.boss.top) / 2) * S_BOSS, s = Math.sin(spin), c = Math.cos(spin);
    const cx = x + koDX(g), cy = GY - (HB + (36 * S_BOSS - HB) * s) - koY(g);
    x = cx - s * HB;
    y = cy + c * HB;
    o.rot = spin;
    shadowX = cx;
    if (stop?.kind === 'ko' && sl < 0.12) { o.white = '#ffffff'; o.whiteA = Math.floor(sl * 30) % 2 ? 0.3 : 0.8; }
  }
  return { x, y, o, shadowX };
}

// ---------- projectiles ----------
function hairBall(x, cx, cy, ts, k = 1) {
  // trailing hair flames: wavy strands behind the ball
  for (let s = 0; s < 7; s++) {
    const col = ['#ff3a2a', '#d8322c', '#ff7a2a', '#ffb43a', '#ff5a3a', '#c82020', '#ffd24a'][s];
    const off = (s - 3) * 4 * k;
    for (let i = 0; i < 18; i++) {
      const tx = cx - i * 4 * k - 10 * k, ty = cy + off * (1 - i / 22) + Math.sin(ts * 30 + i * 0.7 + s) * (1 + i * 0.35) * k;
      x.globalAlpha = 1 - i / 18;
      R(x, col, tx, ty, 4 * k, 3 * k);
    }
  }
  x.globalAlpha = 1;
  x.save();
  x.globalCompositeOperation = 'lighter';
  const gl = x.createRadialGradient(cx, cy, 0, cx, cy, 44 * k);
  gl.addColorStop(0, 'rgba(255,200,120,0.9)'); gl.addColorStop(1, 'rgba(255,60,20,0)');
  x.fillStyle = gl; x.fillRect(cx - 44 * k, cy - 44 * k, 88 * k, 88 * k);
  x.restore();
  const wob = Math.sin(ts * 50) * 1.5;
  x.fillStyle = INK; x.beginPath(); x.arc(cx, cy, 19 * k + wob, 0, 7); x.fill();
  x.fillStyle = '#d8322c'; x.beginPath(); x.arc(cx, cy, 17 * k + wob, 0, 7); x.fill();
  x.fillStyle = '#ff7a2a'; x.beginPath(); x.arc(cx + 2, cy, 13 * k, 0, 7); x.fill();
  x.fillStyle = '#ffd24a'; x.beginPath(); x.arc(cx + 3, cy - 1, 9 * k, 0, 7); x.fill();
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx + 4, cy - 2, 5 * k, 0, 7); x.fill();
  // swirl lines
  for (let i = 0; i < 3; i++) {
    const a = ts * 25 + i * 2.1;
    R(x, '#fff6c8', cx + Math.cos(a) * 12 * k, cy + Math.sin(a) * 12 * k, 3, 3);
  }
}

// the boss's projectile: a glowing ghost of his own dome, 2×, with trailing wisps
function domeBall(x, cx, cy, ts) {
  const D = ART.domeBall, w = D.width * 2, h = D.height * 2;
  x.save();
  x.globalCompositeOperation = 'lighter';
  const gl = x.createRadialGradient(cx, cy, 0, cx, cy, 90);
  gl.addColorStop(0, 'rgba(200,140,255,0.7)'); gl.addColorStop(1, 'rgba(120,40,255,0)');
  x.fillStyle = gl; x.fillRect(cx - 90, cy - 90, 180, 180);
  for (let i = 0; i < 18; i++) {
    const ph = (ts * 3 + i / 18) % 1, wy = cy + (hash(i + 5) - 0.5) * 80;
    x.globalAlpha = 0.6 * (1 - ph);
    R(x, i % 2 ? '#c890ff' : '#ffffff', cx + 50 + ph * 90, wy + Math.sin(ts * 20 + i) * 4, 6, 3);
  }
  x.restore();
  for (let k = 3; k >= 1; k--) { x.globalAlpha = 0.16 * (4 - k) / 3; x.drawImage(D, Math.round(cx - w / 2 + k * 22), Math.round(cy - h / 2), w, h); }
  x.globalAlpha = 1;
  x.save();
  x.translate(Math.round(cx), Math.round(cy));
  x.rotate(Math.sin(ts * 14) * 0.12);
  x.drawImage(D, -Math.round(w / 2), -Math.round(h / 2), w, h);
  x.restore();
  R(x, '#ffffff', cx - 24, cy - 46, 12, 6); R(x, '#ffffff', cx - 30, cy - 40, 6, 6);
}

function beam(x, g, ts, cam, front) {
  const a = g - BEAM.rel, fade = 1 - clamp01((g - (BEAM.end - 0.12)) / 0.12);
  const th = (a < 0.05 ? a / 0.05 : 1) * fade * (44 + 6 * Math.sin(ts * 60));
  if (th <= 0.5) return;
  const x0 = BEAM_X0 - cam, x1 = front - cam, cy = BEAM.y;
  x.save();
  x.globalCompositeOperation = 'lighter';
  const gl = x.createLinearGradient(0, cy - th * 2, 0, cy + th * 2);
  gl.addColorStop(0, 'rgba(255,60,20,0)'); gl.addColorStop(0.5, 'rgba(255,120,40,0.55)'); gl.addColorStop(1, 'rgba(255,60,20,0)');
  x.fillStyle = gl; x.fillRect(x0, cy - th * 2, x1 - x0, th * 4);
  x.restore();
  // hair strands
  const cols = ['#c82020', '#ff3a2a', '#ff7a2a', '#ffb43a'];
  for (let s = 0; s < 12; s++) {
    const off = ((s / 11) * 2 - 1) * th * 0.95;
    x.fillStyle = cols[s % 4];
    for (let xx = x0; xx < x1; xx += 4) {
      const yy = cy + off + Math.sin(xx * 0.06 - ts * 40 + s * 1.3) * th * 0.18;
      x.fillRect(Math.round(xx), Math.round(yy), 4, 3);
    }
  }
  R(x, '#ff7a2a', x0, cy - th * 0.5, x1 - x0, th);
  R(x, '#ffd24a', x0, cy - th * 0.32, x1 - x0, th * 0.64);
  R(x, '#ffffff', x0, cy - th * 0.14, x1 - x0, th * 0.28);
  // energy rings travelling along the beam
  for (let i = 0; i < 6; i++) {
    const rx = x0 + ((ts * 900 + i * 90) % Math.max(1, x1 - x0));
    R(x, '#fff6c8', rx, cy - th * 0.7, 3, th * 1.4);
  }
  // muzzle + tip
  hairBall(x, x0 + 6, cy, ts, 1.4 * Math.min(1, th / 30));
  if (x1 - x0 > 30) {
    x.save(); x.globalCompositeOperation = 'lighter';
    star(x, x1, cy, 7, th * 0.4, th * 1.3 + 6 * Math.sin(ts * 70), ts * 9, '#ffd24a');
    star(x, x1, cy, 7, th * 0.2, th * 0.8, ts * 9 + 0.3, '#ffffff');
    x.restore();
  }
}

// sword smear for the slash
function slashSmear(x, g, cam) {
  const a = g - (SLASH_G - 0.03);
  if (a < 0 || a > 0.14) return;
  const u = a / 0.14, hx = heroX(g) - cam + 36, hy = GY - 96;
  x.save();
  x.globalAlpha = 1 - u * 0.8;
  for (const [r, w, c] of [[70, 16, '#7ad8ff'], [66, 10, '#ffffff']]) {
    x.strokeStyle = c; x.lineWidth = w;
    x.beginPath(); x.arc(hx, hy, r, -1.3 + u * 0.3, -1.3 + u * 0.3 + 2.3 * Math.min(1, u * 3)); x.stroke();
  }
  x.restore();
}

// ---------- HUD ----------
function bar(x, x0, y, w, life, lag, right, flash) {
  R(x, INK, x0 - 3, y - 3, w + 6, 22);
  R(x, '#5a0a1a', x0, y, w, 16);
  const lw = Math.round(w * lag), yw = Math.round(w * life);
  const L = (wd) => (right ? x0 : x0 + w - wd);
  R(x, flash ? '#ffffff' : '#e02020', L(lw), y, lw, 16);
  if (yw > 0) {
    const gr = x.createLinearGradient(0, y, 0, y + 16);
    gr.addColorStop(0, '#fffbd0'); gr.addColorStop(0.35, '#ffe14a'); gr.addColorStop(1, '#e08a10');
    x.fillStyle = gr; x.fillRect(L(yw), y, yw, 16);
    R(x, 'rgba(255,255,255,0.6)', L(yw), y + 2, yw, 2);
  }
  R(x, '#b8c4dc', x0 - 3, y - 3, w + 6, 1);
}
function drawHud(x, g, ts) {
  const hg = x.createLinearGradient(0, 0, 0, 104);
  hg.addColorStop(0, 'rgba(4,2,12,0.6)'); hg.addColorStop(1, 'rgba(4,2,12,0)');
  x.fillStyle = hg; x.fillRect(0, 0, LW, 104);
  text(x, '1P', 40, 10, { size: 16, color: '#7ad8ff' });
  text(x, String(hudScore(g)).padStart(8, '0'), 84, 10, { size: 16 });
  if (Math.floor(ts / 0.5) % 2 === 0) text(x, 'INSERT COIN', 920, 10, { size: 16, align: 'right', color: '#ffe14a' });
  bar(x, 40, 36, 384, 1, 1, false, false);
  const ko = g >= KO_G;
  bar(x, 536, 36, 384, bossLife(g), bossLag(g), true, ko && Math.floor(ts * 16) % 2 === 0);
  // KO emblem
  const kf = ko && Math.floor(ts * 10) % 2 === 0;
  R(x, INK, 440, 30, 80, 30);
  R(x, kf ? '#ffffff' : '#d8322c', 443, 33, 74, 24);
  text(x, 'KO', 480, 37, { size: 16, align: 'center', color: kf ? '#d8322c' : '#ffe14a', shadow: '#5a0a1a' });
  // names
  text(x, 'REMY', 40, 62, { size: 16, color: '#ffffff' });
  text(x, 'M.BALDSON', 920, 62, { size: 16, align: 'right', color: '#ffb0c8' });
  if (g >= YOUWIN_G) { const a = clamp01((g - YOUWIN_G) / 0.1); text(x, 'V', 120, 62, { size: 16, color: '#ffe14a', alpha: a }); }
  // timer
  const tm = String(hudTimer(g)).padStart(2, '0');
  text(x, tm, 480, 66, { size: 32, align: 'center', color: '#ffffff', outline: INK, shadow: null });
  // super gauge
  const sg = superGauge(g), max = sg >= 0.999 && g < SUPER_G;
  R(x, INK, 38, 504, 244, 16);
  R(x, '#1a1a3a', 40, 506, 240, 12);
  const gw = Math.round(240 * sg);
  R(x, max ? (Math.floor(ts * 14) % 2 ? '#ffffff' : '#ffe14a') : '#3a7aff', 40, 506, gw, 12);
  R(x, 'rgba(255,255,255,0.45)', 40, 507, gw, 3);
  text(x, max ? 'MAX' : 'SUPER', 290, 504, { size: 16, color: max ? '#ffe14a' : '#7ad8ff' });
  R(x, INK, 678, 504, 244, 16);
  R(x, '#1a1a3a', 680, 506, 240, 12);
  R(x, '#9a5aff', 920 - Math.round(240 * Math.min(0.55, 0.3 + g * 0.04) * (g < KO_G ? 1 : 0)), 506, Math.round(240 * Math.min(0.55, 0.3 + g * 0.04) * (g < KO_G ? 1 : 0)), 12);
}

// ---------- announcements ----------
function drawAnnounce(x, g, ts, stop, sl) {
  // ROUND 1
  if (g >= ROUND_G && g < FIGHT_G) {
    const a = g - ROUND_G, s = 'ROUND 1';
    for (let i = 0; i < s.length; i++) {
      const ai = a - i * 0.04;
      if (ai < 0) continue;
      const dx = ai < 0.12 ? (1 - ai / 0.12) ** 2 * 600 : 0;
      const out = clamp01((g - (FIGHT_G - 0.12)) / 0.12);
      bigText(x, s[i], 480 - (s.length * 48) / 2 + i * 48 + 24 + dx, 210, 48, { alpha: 1 - out, stops: ['#ffffff', '#c8e8ff', '#5a9aff'] });
    }
  }
  // FIGHT!
  if (g >= FIGHT_G && g < FIGHT_G + 0.5) {
    const a = g - FIGHT_G;
    const sc = a < 0.08 ? 2.6 - 1.6 * (a / 0.08) : 1 + 0.06 * Math.exp(-(a - 0.08) * 20) * Math.sin((a - 0.08) * 60);
    const out = clamp01((a - 0.38) / 0.12);
    if (a < 0.05) { x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(0, 0, LW, LH); }
    bigText(x, 'FIGHT!', 480, 220, 80, { scale: sc * (1 + out * 0.6), alpha: 1 - out, stops: ['#fff6c8', '#ffe14a', '#ff5a1a', '#c81a1a'] });
  }
  // combo counter
  const c = combo(g);
  if (c) {
    const a = g - c.t, pop = a < 0.08 ? 1.6 - 0.6 * (a / 0.08) : 1, out = clamp01((g - c.end + 0.15) / 0.15);
    bigText(x, String(c.n), 84, 170, 48, { scale: pop, alpha: 1 - out, stops: ['#ffffff', '#ffe14a', '#ff7a1a'] });
    text(x, 'HITS', 120, 158, { size: 24, color: '#ffe14a', outline: INK, shadow: null, alpha: 1 - out });
    if (c.id === 2 && c.n >= 9) text(x, 'SUPER FINISH!', 40, 202, { size: 16, color: Math.floor(ts * 12) % 2 ? '#ffffff' : '#ff7ab0', outline: INK, shadow: null, alpha: 1 - out });
    else if (c.n >= 4) text(x, 'HAIR COMBO!', 40, 202, { size: 16, color: '#7ad8ff', outline: INK, shadow: null, alpha: 1 - out });
  }
  // K.O.
  if (g >= KO_G && g < LAND[0] + 0.25) {
    const a = stop?.kind === 'ko' ? sl : stop?.kind === 'slow' ? KO_G_STOP_LEN + sl : 9;
    const sc = a < 0.1 ? 3 - 2 * (a / 0.1) : 1 + 0.03 * Math.sin(a * 30);
    const out = clamp01((g - LAND[0] - 0.1) / 0.15);
    bigText(x, 'K.O.', 480, 230, 96, { scale: sc, alpha: 1 - out, stops: ['#ffffff', '#ff9a8a', '#e01a1a', '#7a0a0a'], tracking: -8 });
  }
  // YOU WIN / PERFECT
  if (g >= YOUWIN_G) {
    const a = g - YOUWIN_G;
    const s = 'YOU WIN';
    for (let i = 0; i < s.length; i++) {
      const ai = a - i * 0.03;
      if (ai < 0) continue;
      const dy = ai < 0.16 ? -120 * (1 - ai / 0.16) ** 2 + 12 * Math.sin((ai / 0.16) * Math.PI) : 0;
      bigText(x, s[i], 480 - (s.length * 56) / 2 + i * 56 + 28, 170 + dy, 56, { stops: ['#ffffff', '#c8f0ff', '#3a9aff', '#1a3aa8'] });
    }
  }
  if (g >= PERFECT_G) {
    const a = g - PERFECT_G, sc = a < 0.1 ? 2.2 - 1.2 * (a / 0.1) : 1;
    const shine = ['#ffffff', '#fff6a0', '#ffd24a', '#ff8a1a'];
    bigText(x, 'PERFECT', 480, 262, 48, { scale: sc, stops: Math.floor(ts * 10) % 2 ? shine : ['#fff6a0', '#ffd24a', '#ff8a1a', '#c84a0a'] });
    if (a < 0.06) { x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(0, 0, LW, LH); }
    // sparkles around PERFECT
    for (let i = 0; i < 8; i++) {
      const ph = (ts * 1.5 + i / 8) % 1, sx = 300 + hash(i + Math.floor(ts * 1.5 + i / 8) * 9) * 360, sy = 236 + hash(i * 3 + Math.floor(ts * 1.5 + i / 8) * 5) * 60;
      const r = Math.round(6 * Math.sin(ph * Math.PI));
      R(x, '#ffffff', sx - r, sy, r * 2 + 1, 1); R(x, '#ffffff', sx, sy - r, 1, r * 2 + 1);
    }
    if (a > 0.3) text(x, 'BONUS 50000', 480, 300, { size: 16, align: 'center', color: '#ffe14a', alpha: clamp01((a - 0.3) / 0.1) });
  }
}
const KO_G_STOP_LEN = STOPS.find((s) => s.kind === 'ko').d;

// super cut-in: portrait band with the move name, over a darkened, strobing background
function drawCutIn(x, sl, ts) {
  const open = smooth((sl - 0.06) / 0.1), close = smooth((sl - 0.7) / 0.08);
  const hgt = 190 * open * (1 - close);
  if (hgt < 1) return;
  const cy = 250, y0 = Math.round(cy - hgt / 2);
  x.save();
  x.beginPath();
  x.moveTo(0, y0 + 20); x.lineTo(LW, y0); x.lineTo(LW, y0 + hgt - 20); x.lineTo(0, y0 + hgt); x.closePath();
  x.clip();
  const gr = x.createLinearGradient(0, y0, 0, y0 + hgt);
  gr.addColorStop(0, '#5a0a1a'); gr.addColorStop(0.5, '#e0321a'); gr.addColorStop(1, '#5a0a1a');
  x.fillStyle = gr; x.fillRect(0, y0, LW, hgt + 20);
  // speed lines
  for (let i = 0; i < 40; i++) {
    const ly = y0 + hash(i + 70) * hgt, lx = ((hash(i + 80) * LW * 2 - ts * 2400 * (0.6 + hash(i + 90))) % (LW * 2) + LW * 2) % (LW * 2) - LW * 0.5;
    R(x, i % 3 ? 'rgba(255,200,120,0.5)' : 'rgba(255,255,255,0.7)', lx, ly, 80 + hash(i) * 160, i % 4 ? 2 : 3);
  }
  // portrait
  const F = ART.heroFace, px = Math.round(560 - (sl - 0.06) * 60), py = Math.round(cy - F.height / 2 + 6);
  x.globalAlpha = 0.35; x.drawImage(F, px + 14, py); x.globalAlpha = 1;
  x.drawImage(F, px, py);
  if (sl > 0.36 && sl < 0.5) {
    const u = (sl - 0.36) / 0.14, r = Math.round(18 * Math.sin(u * Math.PI));
    const ex = px + 3 * 50, ey = py + 3 * 30;
    R(x, '#ffffff', ex - r, ey, r * 2 + 1, 2); R(x, '#ffffff', ex, ey - r, 2, r * 2 + 1);
  }
  x.restore();
  // edges
  x.fillStyle = '#ffe14a';
  x.fillRect(0, y0 + 20 - 3, LW, 2);
  x.fillRect(0, y0 + hgt - 2, LW, 2);
  // move name
  if (sl > 0.18) {
    const a = sl - 0.18, sc = a < 0.06 ? 2 - a / 0.06 : 1;
    text(x, 'SUPER ART', 70, cy - 62, { size: 16, color: '#ffe14a', outline: INK, shadow: null });
    bigText(x, 'SHIN', 200, cy - 22, 40, { scale: sc, stops: ['#ffffff', '#ffe14a', '#ff7a1a'] });
  }
  if (sl > 0.26) {
    const a = sl - 0.26, sc = a < 0.06 ? 2 - a / 0.06 : 1;
    bigText(x, 'HAIR-DOUKEN', 290, cy + 40, 40, { scale: sc, stops: ['#ffffff', '#ffe14a', '#ff7a1a', '#c81a1a'], tracking: -4 });
  }
}

// ---------- frame ----------
export function drawFight(lt) {
  const { g, stop, sl } = warp(lt);
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  let shx = 0, shy = 0;
  for (const [t0, amp] of SHAKES) {
    const d = lt - t0;
    if (d < 0 || d > 0.4) continue;
    const k = amp * Math.exp(-d * 12);
    shx += k * Math.sin(d * 95 + t0 * 10);
    shy += k * Math.cos(d * 77 + t0 * 7);
  }
  if (g >= BEAM.rel && g < KO_G && !stop) { shx += 2 * Math.sin(lt * 120); shy += 1.5 * Math.cos(lt * 97); }
  const cam = Math.round(camX(g));
  const hype = clamp01(HITS.reduce((a, h) => a + (g >= h.g && h.kind === 'hit' ? Math.exp(-(g - h.g) * 2.5) : 0), 0) * 0.7 + (g > KO_G ? 1 : 0));
  const superOn = stop?.kind === 'super';
  const superDim = superOn ? 0.72 * smooth(sl / 0.06) * (1 - smooth((sl - (SUPER_D - 0.08)) / 0.08)) : 0;
  x.save();
  x.translate(Math.round(shx), Math.round(shy));
  drawStage(x, cam, lt, { hype, ko: g >= KO_G, dim: superDim });
  // super: strobing radial background flash behind the fighters
  if (superOn) {
    const hx = heroX(g) - cam, hy = GY - 100;
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = 0.18 + 0.12 * (Math.floor(sl * 20) % 2);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 6.283 + sl * 0.8;
      x.fillStyle = i % 2 ? '#ff5a1a' : '#ffd24a';
      x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx + Math.cos(a) * 1200, hy + Math.sin(a) * 1200); x.lineTo(hx + Math.cos(a + 0.12) * 1200, hy + Math.sin(a + 0.12) * 1200); x.fill();
    }
    x.restore();
  }
  // K.O. strobe: the stage flashes red / white behind the fighters
  if (stop?.kind === 'ko' || (stop?.kind === 'slow' && sl < 0.5)) {
    const k = stop.kind === 'ko' ? 1 : 1 - sl / 0.5;
    x.fillStyle = Math.floor(lt * 20) % 2 ? `rgba(255,255,255,${0.25 * k})` : `rgba(200,20,40,${0.4 * k})`;
    x.fillRect(-20, -20, LW + 40, LH + 40);
  }
  drawSteam(x, cam, lt);
  // shadows
  const hp = heroPose(g, stop, sl), bp = bossPose(g, stop, sl);
  for (const [px, lift, w] of [[hp.x, GY - hp.y, 46], [bp.shadowX, koY(g), 70 + 60 * Math.sin(bp.o.rot ?? 0)]]) {
    const k = clamp01(1 - lift / 300);
    x.fillStyle = `rgba(4,2,12,${0.45 * k})`;
    x.beginPath(); x.ellipse(Math.round(px - cam), GY + 2, w * (0.6 + 0.4 * k), 8, 0, 0, 7); x.fill();
  }
  // K.O. afterimages
  if (g > KO_G && g < LAND[0]) {
    for (let i = 3; i >= 1; i--) {
      const gg = Math.max(KO_G, g - i * 0.05), q = bossPose(gg, null, 0);
      drawFighter(x, ART.boss, q.x - cam, q.y, S_BOSS, { ...q.o, white: '#ff9a8a', alpha: 0.16 * (4 - i) / 3, glow: null });
    }
  }
  drawFighter(x, ART.boss, bp.x - cam + hitShake(stop, sl, 'boss'), bp.y, S_BOSS, bp.o);
  drawFighter(x, ART.hero, hp.x - cam + hitShake(stop, sl, 'hero'), hp.y, S_HERO, hp.o);
  slashSmear(x, g, cam);
  // super charge: embers rising from the hero
  if (superOn || (g >= BEAM.rel && g < BEAM.end)) {
    for (let i = 0; i < 24; i++) {
      const ph = (lt * 1.6 + i / 24) % 1, ex = hp.x - cam + (hash(i + Math.floor(lt * 1.6 + i / 24) * 31) - 0.5) * 90, ey = GY - 10 - ph * 220;
      x.globalAlpha = 1 - ph;
      R(x, i % 3 ? '#ff7a2a' : '#ffe14a', ex, ey, 3, 5);
    }
    x.globalAlpha = 1;
  }
  // douken charge orb at the hands
  if (g >= DK.t0 && g < DK.rel) { const u = (g - DK.t0) / (DK.rel - DK.t0); hairBall(x, hp.x - cam + 40, DK.y, lt, 0.3 + 0.5 * u); }
  // projectiles
  if (g >= DK.rel && g < DK_HIT) hairBall(x, DK_X0 + DK.v * (g - DK.rel) - cam, DK.y, lt, 1);
  if (g >= BALL.rel && g < BEAM_CLASH) domeBall(x, ballX(Math.min(g, SUPER_G)) - cam, BALL.y, lt);
  if (g >= BEAM.rel && g < BEAM.end) {
    const reach = BEAM_X0 + BEAM.v * (g - BEAM.rel);
    const stopAt = g < KO_G ? bossX(g) - BOSS_FRONT + 20 : 2000;
    beam(x, g, lt, cam, Math.min(reach, stopAt, cam + LW + 40));
  }
  drawFX(x, lt, g, cam);
  x.restore();
  if (superOn) drawCutIn(x, sl, lt);
  drawHud(x, g, lt);
  drawAnnounce(x, g, lt, stop, sl);
  // super release flash
  if (superOn && sl > SUPER_D - 0.06) { x.fillStyle = `rgba(255,240,200,${(sl - (SUPER_D - 0.06)) / 0.06})`; x.fillRect(0, 0, LW, LH); }
  // closing shutter into the win quote
  const close = clamp01((g - (G_END - 0.18)) / 0.18);
  if (close > 0) { const hh = Math.round((LH / 2) * close * close); R(x, '#000000', 0, 0, LW, hh); R(x, '#000000', 0, LH - hh, LW, hh); }
  return { low: ART.low, g, stop, sl };
}
