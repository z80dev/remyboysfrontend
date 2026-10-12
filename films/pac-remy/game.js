// The round, drawn at the game's native 960×540 into a low-res canvas (upscaled 2× nearest by film.js).
import { hash } from 'filmkit/lib.js';
import * as A from './art.js';
import {
  LW, LH, TILE, MX, MY, COLS, ROWS, px, py, GO, HERO, TONIC_G, TONIC, GHOSTS, ghostAt, EATS, STOPS, warp, filmT, INTRO,
  FRUIT, VORTEX, VORTEX_HERO, CLEAR, FADE, G_END, PELLETS, hudScore, HI0, LAST_EAT, HERO_STOP,
} from './choreo.js';

export const FONT = '"Press Start 2P"';
export const ART = {};
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const RED = 0; // CHROMEY: the last one eaten, and the one who flashes

export async function prepareGame() {
  const heads = await A.loadAtlas('heads.webp'), sides = await A.loadAtlas('sides.webp');
  ART.hero = A.sideHead(sides, 42, 2);
  ART.hero3 = A.sideHead(sides, 42, 3);
  ART.heroFront = A.cell16(heads, 42, 2);
  ART.heroFront1 = A.cell16(heads, 42, 1);
  ART.wig = A.wigFrom(A.cell16(heads, 42, 1));
  ART.ghosts = GHOSTS.map((G) => {
    const head = A.cell16(heads, G.spr, 2);
    const mk = (col, mode, opt) => [0, 1].map((f) => A.ghostSprite(head, A.ghostBody(col, f, opt), { mode }));
    const normal = mk(G.col, 'normal'), fright = mk('#2430ff', 'fright', { hi: '#6a7cff' }), flash = mk('#f0f0ff', 'flash', { shade: '#b8b8d8' });
    return {
      head, head1: A.cell16(heads, G.spr, 1), head3: A.cell16(heads, G.spr, 3), normal, fright, flash,
      glow: A.glowOf(normal[0], G.glow, 5, 12), glowF: A.glowOf(fright[0], '#3a50ff', 5, 12),
      white: A.silhouette(normal[0], '#ffffff'),
    };
  });
  ART.maze = A.mazeArt();
  ART.tonic = A.tonic();
  ART.tonicGlow = A.glowOf(ART.tonic, '#5aff8a', 4, 10);
  ART.comb = A.comb();
  ART.combGlow = A.glowOf(ART.comb, '#ffd34a', 4, 10);
  ART.heroGlow = A.glowOf(ART.hero.c, '#9dff6a', 5, 12);
  ART.low = A.canvas(LW, LH);
}

// ---------- helpers ----------
const fill = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), w, h); };
export function text(x, s, a, b, { size = 16, color = '#fff', shadow = '#000', align = 'left', alpha = 1, scale = 1 } = {}) {
  x.save();
  x.globalAlpha *= alpha;
  // pops snap to the font's 8 px grid (8/16/24/32…) so glyphs stay pixel-crisp
  if (scale !== 1) { const s2 = Math.max(8, Math.round((size * scale) / 8) * 8); b -= (s2 - size) / 2; size = s2; }
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
const eatOf = (i) => EATS.find((e) => e.i === i);

// ---------- analytic particles ----------
const P = [];
const ev = (g, kind, c, r, extra = {}) => P.push({ g, kind, x: px(c), y: py(r), seed: P.length * 13 + 7, ...extra });
for (const p of PELLETS) if (!p.vortex && !p.power) ev(p.g, 'crumb', p.c, p.r);
ev(TONIC_G, 'burst', TONIC[0], TONIC[1], { col: '#9dff6a' });
ev(TONIC_G, 'shock', TONIC[0], TONIC[1]);
for (const e of EATS) {
  ev(e.g, 'flashdisc', e.c, e.r, { big: e.n === 3 });
  ev(e.g, 'stars', e.c, e.r, { big: e.n === 3 });
  ev(e.g, 'shine', e.c, e.r - 0.4);
  if (e.n === 3) ev(e.g, 'shock', e.c, e.r, { col: '#ffffff' });
}
ev(FRUIT.g, 'sparkle', FRUIT.c, FRUIT.r);
ev(VORTEX.g1, 'burst', VORTEX_HERO.c, VORTEX_HERO.r, { col: '#ffe27a' });

const SHOOK = [[TONIC_G, 3], ...EATS.map((e) => [e.g, e.n === 3 ? 7 : 3 + e.n]), [VORTEX.g1, 4], [CLEAR.g0, 2]];

function drawParticles(x, g) {
  for (const p of P) {
    const age = g - p.g;
    if (age < 0 || age > 1.2) continue;
    const r = (k) => hash(p.seed * 31 + k);
    const sx = p.x, sy = p.y;
    switch (p.kind) {
      case 'crumb': {
        if (age > 0.22) break;
        const u = age / 0.22;
        for (let i = 0; i < 3; i++) {
          const a = r(i) * 6.283, d = 4 + 9 * u;
          x.globalAlpha = 1 - u;
          fill(x, i ? '#ffd8c0' : '#ffffff', sx + Math.cos(a) * d - 1, sy + Math.sin(a) * d - 1, 2, 2);
        }
        x.globalAlpha = 1;
        break;
      }
      case 'stars': {
        if (age > 0.4) break;
        const u = age / 0.4, n = p.big ? 10 : 7;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + r(1), d = (p.big ? 60 : 36) * Math.sqrt(u);
          star4(x, Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d), Math.round(3 * (1 - u)) + 1, i % 2 ? '#8ae8ff' : '#ffffff');
        }
        break;
      }
      case 'flashdisc': {
        if (age > 0.08) break;
        x.fillStyle = '#ffffff';
        x.beginPath(); x.arc(sx, sy, (p.big ? 26 : 18) * (1 - age / 0.08) + 6, 0, 7); x.fill();
        break;
      }
      case 'shine': {
        if (age > 0.5) break;
        const u = age / 0.5, s = Math.sin(u * Math.PI);
        x.save(); x.globalAlpha = s;
        x.translate(sx + 6, sy - 12);
        x.rotate(u * 1.2);
        fill(x, '#ffffff', -Math.round(16 * s), 0, Math.round(32 * s) + 1, 1);
        fill(x, '#ffffff', 0, -Math.round(16 * s), 1, Math.round(32 * s) + 1);
        fill(x, '#ffffff', -2, -2, 5, 5);
        x.restore();
        break;
      }
      case 'shock': {
        if (age > 0.45) break;
        const u = age / 0.45;
        x.strokeStyle = p.col ?? '#9dff6a'; x.globalAlpha = (1 - u) * 0.9; x.lineWidth = 3;
        x.beginPath(); x.arc(sx, sy, 10 + 300 * (1 - (1 - u) ** 2), 0, 7); x.stroke();
        x.lineWidth = 1; x.beginPath(); x.arc(sx, sy, 6 + 220 * (1 - (1 - u) ** 2), 0, 7); x.stroke();
        x.globalAlpha = 1;
        break;
      }
      case 'burst': {
        if (age > 0.5) break;
        const u = age / 0.5;
        x.save(); x.globalAlpha = 1 - u;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * 6.283 + u * 0.5, d0 = 14 + 120 * u, d1 = d0 + 18 + 26 * (1 - u);
          x.strokeStyle = i % 2 ? p.col : '#ffffff'; x.lineWidth = 2;
          x.beginPath(); x.moveTo(sx + Math.cos(a) * d0, sy + Math.sin(a) * d0); x.lineTo(sx + Math.cos(a) * d1, sy + Math.sin(a) * d1); x.stroke();
        }
        x.restore();
        break;
      }
      case 'sparkle': {
        if (age > 0.45) break;
        const u = age / 0.45;
        for (let i = 0; i < 5; i++) {
          const a = i * 1.257 + 0.6, d = 6 + 22 * u;
          star4(x, Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d), Math.round(4 * (1 - u)), '#fff4c0');
        }
        break;
      }
    }
  }
}

// ---------- maze + pellets ----------
function drawMaze(x, g) {
  const M = ART.maze, ox = MX - M.pad, oy = MY - M.pad;
  // boot: the maze powers on top-down with a scan line
  const boot = clamp01(g / 0.28);
  let white = 0;
  if (g >= CLEAR.g0 && g < CLEAR.g1) white = Math.floor((g - CLEAR.g0) / 0.12) % 2 === 0 ? 1 : 0;
  x.save();
  if (boot < 1) { x.beginPath(); x.rect(0, 0, LW, MY + boot * (ROWS * TILE + 40)); x.clip(); }
  x.drawImage(white ? M.white : M.blue, ox, oy);
  x.restore();
  if (boot < 1) fill(x, '#a8b8ff', MX - 10, MY + boot * (ROWS * TILE + 40) - 2, COLS * TILE + 20, 2);
  // ghost door
  if (!white) fill(x, '#ffb8de', px(13) - 4, py(9) - 2, TILE * 2 + 8, 3);
  return boot;
}

function vortexPos(p, g) {
  const u = clamp01((g - p.lift) / (p.g - p.lift)), e = u * u;
  const hx = px(VORTEX_HERO.c), hy = py(VORTEX_HERO.r) - 2;
  const dx = px(p.c) - hx, dy = py(p.r) - hy, th = 2.4 * e;
  const k = 1 - e;
  return [hx + (dx * Math.cos(th) - dy * Math.sin(th)) * k, hy + (dx * Math.sin(th) + dy * Math.cos(th)) * k, u];
}

function drawPellets(x, g, boot) {
  const blinkOn = g < GO || Math.floor(g * 5) % 2 === 0;
  for (const p of PELLETS) {
    if (g >= p.g) continue;
    const sx = px(p.c), sy = py(p.r);
    if (sy > MY + boot * (ROWS * TILE + 40)) continue;
    if (p.vortex && g >= p.lift) {
      // flying into the hero
      const [fx, fy, u] = vortexPos(p, g);
      for (let k = 3; k >= 1; k--) {
        const [tx, ty] = vortexPos(p, g - k * 0.018);
        x.globalAlpha = 0.25 * (4 - k) / 3;
        fill(x, '#ffd34a', tx - 1, ty - 1, 3, 3);
      }
      x.globalAlpha = 1;
      const s = p.power ? 6 : 4;
      fill(x, u > 0.5 ? '#fff6c8' : '#ffd8c0', fx - s / 2, fy - s / 2, s, s);
      continue;
    }
    if (p.power) {
      if (!blinkOn && !(p.c === TONIC[0] && p.r === TONIC[1])) continue;
      const bob = Math.round(Math.sin(g * 6 + p.c) * 1.5);
      x.globalAlpha = 0.55 + 0.35 * Math.sin(g * 9);
      x.drawImage(ART.tonicGlow, Math.round(sx - ART.tonicGlow.width / 2), Math.round(sy - ART.tonicGlow.height / 2) + bob);
      x.globalAlpha = 1;
      x.drawImage(ART.tonic, Math.round(sx - 6), Math.round(sy - 9) + bob);
      continue;
    }
    fill(x, '#7a4a3a', sx - 2, sy - 1, 4, 4);
    fill(x, '#ffc8a8', sx - 2, sy - 2, 4, 4);
    fill(x, '#ffffff', sx - 2, sy - 2, 1, 1);
  }
}

function drawFruit(x, g) {
  if (g < FRUIT.show || g >= FRUIT.g) return;
  const a = g - FRUIT.show;
  if (a < 0.2 && Math.floor(a / 0.05) % 2) return; // pop-in flicker
  const sx = px(FRUIT.c), sy = py(FRUIT.r) + Math.round(Math.sin(g * 5) * 1.5);
  x.globalAlpha = 0.6 + 0.3 * Math.sin(g * 8);
  x.drawImage(ART.combGlow, Math.round(sx - ART.combGlow.width / 2), Math.round(sy - ART.combGlow.height / 2));
  x.globalAlpha = 1;
  x.drawImage(ART.comb, Math.round(sx - 10), Math.round(sy - 6));
  if (Math.floor(g * 3) % 3 === 0) star4(x, Math.round(sx + 9), Math.round(sy - 6), 2, '#ffffff');
}

// ---------- ghosts ----------
function drawGhost(x, i, g, stop) {
  const G = ART.ghosts[i], s = ghostAt(i, g), e = eatOf(i);
  if (g < 0.5 || g >= CLEAR.g0) return;
  if (stop?.kind === 'eat' && stop.e.i === i) return; // replaced by the score number
  let cx = px(s.c), cy = py(s.r);
  if (s.mode === 'eyes') {
    // faint colour trail + eyes
    for (let k = 1; k <= 3; k++) {
      const q = ghostAt(i, g - k * 0.025);
      if (q.mode !== 'eyes') continue;
      x.globalAlpha = 0.18 * (4 - k) / 3;
      x.drawImage(G.glow, Math.round(px(q.c) - G.glow.width / 2), Math.round(py(q.r) - G.glow.height / 2));
    }
    x.globalAlpha = 1;
    A.eyes(x, cx, cy - 4, s.dc, s.dr);
    return;
  }
  const still = !s.moving;
  if ((s.mode === 'house' || s.mode === 'revived') && still) cy += Math.sin(g * 9 + i * 1.7) * 0.28 * TILE;
  const f = Math.floor(g * 8 + i) % 2;
  let spr = G.normal[f], glow = G.glow;
  if (s.mode === 'fright') {
    const flashing = i === RED && g > e.g - 0.62;
    spr = flashing && Math.floor((g - e.g) / 0.1) % 2 === 0 ? G.flash[f] : G.fright[f];
    glow = G.glowF;
  }
  // appear flicker at 0.5
  if (g < 0.62 && Math.floor(g / 0.04) % 2) return;
  const lean = s.moving ? s.dc : 0;
  x.globalAlpha = 0.5 + 0.25 * Math.sin(g * 7 + i * 2);
  x.drawImage(glow, Math.round(cx - glow.width / 2), Math.round(cy - glow.height / 2) - 4);
  x.globalAlpha = 1;
  x.save();
  x.translate(Math.round(cx), Math.round(cy) - 4);
  if (lean < 0) x.scale(-1, 1);
  x.drawImage(spr, -A.GW / 2, -A.GH / 2);
  x.restore();
}

// ---------- hero ----------
const powered = (g) => g >= TONIC_G && g < LAST_EAT + 0.35;
function heroOpen(g) {
  if (g < GO) return 0;
  if (g >= CLEAR.g0) return 0;
  if (g >= HERO_STOP) return 0.5 + 0.5 * Math.abs(Math.sin((g - HERO_STOP) * 26)); // gulping the vortex
  const h = HERO.at(g);
  if (!h.moving) return 0.6;
  return Math.abs(Math.sin((h.c + h.r) * Math.PI * 0.75));
}
function drawHero(x, g, stop, sl) {
  if (stop?.kind === 'eat') return; // the score number takes his place
  const h = HERO.at(g), hd = h.moving ? h : HERO.heading(g);
  const cx = px(h.c), cy = py(h.r);
  let dc = hd.dc, dr = hd.dr;
  if (g < GO) { dc = -1; dr = 0; }
  if (g >= HERO_STOP) { dc = -1; dr = 0; }
  const o = {};
  // tonic gulp: squash & stretch pop
  if (stop?.kind === 'power') { const s = Math.sin(clamp01(sl / 0.3) * Math.PI); o.sx = 1 + 0.35 * s; o.sy = 1 + 0.35 * s; o.white = Math.floor(sl / 0.05) % 2 === 0; }
  if (g >= TONIC_G && g < TONIC_G + 0.12) { const s = Math.sin(((g - TONIC_G) / 0.12) * Math.PI); o.sx = 1 - 0.15 * s; o.sy = 1 + 0.15 * s; }
  if (powered(g) || (g >= HERO_STOP && g < VORTEX.g1 + 0.2)) {
    // speed after-images
    if (h.moving) for (let k = 3; k >= 1; k--) {
      const q = HERO.at(g - k * 0.03), qd = HERO.heading(g - k * 0.03);
      x.globalAlpha = 0.16 * (4 - k);
      A.drawChomp(x, ART.hero, px(q.c), py(q.r), heroOpen(g - k * 0.03), qd.dc, qd.dr, 2, { white: true });
    }
    x.globalAlpha = 0.55 + 0.3 * Math.sin(g * 20);
    x.drawImage(ART.heroGlow, Math.round(cx - ART.heroGlow.width / 2), Math.round(cy - ART.heroGlow.height / 2) - 2);
    x.globalAlpha = 1;
  }
  A.drawChomp(x, ART.hero, cx, cy, heroOpen(g), dc, dr, 2, o);
}

// ---------- popups & banners ----------
function drawPopups(x, g, stop, sl) {
  if (stop?.kind === 'eat') {
    const e = stop.e, big = e.n === 3;
    const s = 1 + 0.5 * Math.exp(-sl * 14) + (big ? 0.6 : 0);
    text(x, String(e.pts), px(e.c), py(e.r) - 8, { size: 16, align: 'center', color: '#3ae8ff', scale: s });
  }
  for (const e of EATS) {
    const a = g - e.g;
    if (a <= 0 || a > 0.35) continue;
    text(x, String(e.pts), px(e.c), py(e.r) - 8 - 30 * (a / 0.35), { size: 16, align: 'center', color: '#3ae8ff', alpha: 1 - a / 0.35, scale: e.n === 3 ? 1.6 : 1 });
  }
  const fa = g - FRUIT.g;
  if (fa >= 0 && fa < 0.7) text(x, '500', px(FRUIT.c), py(FRUIT.r) - 26 - 14 * fa, { size: 16, align: 'center', color: '#ff8ad8', alpha: clamp01((0.7 - fa) / 0.15) });
}

function banner(x, s, cy, g0, g, col, size = 16) {
  const n = s.length, cw = size, x0 = LW / 2 - (n * cw) / 2;
  for (let i = 0; i < n; i++) {
    const a = g - g0 - i * 0.025;
    if (a < 0) continue;
    const dy = a < 0.18 ? -24 * (1 - a / 0.18) ** 2 : 0;
    const c = a < 0.08 ? '#ffffff' : col(i);
    text(x, s[i], x0 + i * cw, cy + dy, { size, color: c, shadow: '#000' });
  }
}

function drawBanners(x, g, stop, sl) {
  const midY = py(13) - 8;
  if (g < 0.55) text(x, 'PLAYER ONE', px(13.5), py(8) - 8, { size: 16, align: 'center', color: '#3ae8ff' });
  if (g < GO) text(x, 'READY!', px(13.5), midY, { size: 16, align: 'center', color: '#ffe23a' });
  if (stop?.kind === 'power') {
    const s = 1 + 0.4 * Math.exp(-sl * 12);
    text(x, 'HAIR TONIC!', px(TONIC[0]) + 40, py(TONIC[1]) - 48, { size: 16, align: 'left', color: '#9dff6a', scale: s });
  }
  if (g >= VORTEX.g0 - 0.02 && g < VORTEX.g1 + 0.25) {
    const hue = (i) => ['#ffe27a', '#ffffff', '#9dff6a', '#ffb0e8'][Math.floor(g * 14 + i) % 4];
    const fade = clamp01((VORTEX.g1 + 0.25 - g) / 0.12);
    x.save(); x.globalAlpha = fade;
    banner(x, 'MANE MAGNET!', py(8) - 8, VORTEX.g0, g, hue);
    x.restore();
  }
  if (g >= CLEAR.g0) {
    banner(x, 'ROUND CLEAR!', midY - 4, CLEAR.g0 + 0.05, g, (i) => (Math.floor(g * 10 + i) % 2 ? '#ffe23a' : '#ffffff'));
    if (g > CLEAR.g0 + 0.4) text(x, 'PERFECT!  CABALD 0', px(13.5), py(8) - 8, { size: 16, align: 'center', color: '#ff8ad8', alpha: clamp01((g - CLEAR.g0 - 0.4) / 0.08) });
  }
}

// ---------- HUD side panels ----------
function drawHud(x, g) {
  const L = MX / 2, R = LW - MX / 2, score = hudScore(g), hi = Math.max(HI0, score);
  if (Math.floor(g * 3.2) % 2 === 0 || g < GO) text(x, '1UP', L, 22, { size: 16, align: 'center', color: '#ff4a5a' });
  text(x, String(score).padStart(6, ' '), L + 48, 46, { size: 16, align: 'right' });
  const beat = score > HI0;
  text(x, 'HI-SCORE', L, 92, { size: 16, align: 'center', color: beat && Math.floor(g * 8) % 2 ? '#ffe23a' : '#ffffff' });
  text(x, String(hi).padStart(6, ' '), L + 48, 116, { size: 16, align: 'right', color: beat ? '#ffe23a' : '#ffffff' });
  // the Cabald roster: lights up with the points each head was worth
  text(x, 'CABALD', L, 176, { size: 8, align: 'center', color: '#ff8ad8' });
  GHOSTS.forEach((G, i) => {
    const y = 196 + i * 30, e = eatOf(i), eaten = g >= e.g;
    x.globalAlpha = eaten ? 1 : 0.85;
    x.drawImage(ART.ghosts[i].head1, 22, y);
    x.globalAlpha = 1;
    text(x, G.name, 44, y + 1, { size: 8, color: G.col });
    if (eaten) {
      const a = g - e.g;
      text(x, String(e.pts), 44, y + 11, { size: 8, color: a < 0.15 ? '#ffffff' : '#3ae8ff' });
      if (a < 0.25 && Math.floor(a / 0.05) % 2 === 0) { x.strokeStyle = '#ffffff'; x.lineWidth = 2; x.strokeRect(17, y - 3, 138, 26); }
    }
  });
  const chain = EATS.filter((e) => g >= e.g).length;
  if (chain > 0 && g < VORTEX.g1) {
    text(x, `CHAINx${chain}`, L, 330, { size: 16, align: 'center', color: chain === 4 ? '#ffe23a' : '#3ae8ff' });
  }
  // lives
  for (let k = 0; k < 2; k++) x.drawImage(ART.heroFront, 30 + k * 40, 476);
  // right: round, tonic meter, dots left, bonus row
  text(x, 'ROUND', R, 22, { size: 16, align: 'center' });
  text(x, '1', R, 46, { size: 16, align: 'center', color: '#ffe23a' });
  const t0 = TONIC_G, t1 = LAST_EAT + 0.35;
  text(x, 'TONIC', R, 92, { size: 8, align: 'center', color: '#9dff6a' });
  fill(x, '#1a2a1a', R - 60, 106, 120, 10);
  fill(x, '#3a5a3a', R - 59, 107, 118, 8);
  if (g >= t0 && g < t1) {
    const left = 1 - (g - t0) / (t1 - t0 + 1.2);
    const low = left < 0.5 && Math.floor(g * 10) % 2;
    fill(x, low ? '#ffffff' : '#5aff8a', R - 59, 107, Math.round(118 * left), 8);
    fill(x, '#c8ffd2', R - 59, 107, Math.round(118 * left), 2);
  }
  const dots = PELLETS.filter((p) => g < p.g).length;
  text(x, 'DOTS', R, 150, { size: 8, align: 'center' });
  text(x, String(dots).padStart(3, '0'), R, 164, { size: 16, align: 'center', color: dots === 0 ? '#ffe23a' : '#ffc8a8' });
  text(x, 'BONUS', R, 214, { size: 8, align: 'center', color: '#ffd34a' });
  x.drawImage(ART.comb, R - 10, 230);
  text(x, '500', R, 248, { size: 8, align: 'center', color: g >= FRUIT.g ? '#ff8ad8' : '#806a40' });
  x.drawImage(ART.comb, LW - 64, 486);
  x.drawImage(ART.tonic, LW - 90, 483);
  text(x, 'CREDIT 1', R, 524, { size: 8, align: 'center', color: '#8a8aa8' });
  text(x, '©2026 REMY BOYS', L, 524, { size: 8, align: 'center', color: '#8a8aa8', shadow: null });
}

// Shot-local draw: returns the low-res canvas for film.js to upscale.
export function drawRound(lt) {
  const { g, stop, sl } = warp(lt);
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.fillStyle = '#000';
  x.fillRect(0, 0, LW, LH);
  // shake runs in shot time so it keeps going through hit-stops
  let shx = 0, shy = 0;
  for (const [ge, amp] of SHOOK) {
    const d = lt - (filmT(ge) - INTRO);
    if (d < 0 || d > 0.35) continue;
    const k = amp * Math.exp(-d * 14);
    shx += k * Math.sin(d * 95 + ge * 10);
    shy += k * Math.cos(d * 77 + ge * 7);
  }
  x.save();
  x.translate(Math.round(shx), Math.round(shy));
  const boot = drawMaze(x, g);
  // tonic freeze: the tubes surge white
  if (stop?.kind === 'power') { x.globalAlpha = 0.5 * (1 - sl / stop.d); x.drawImage(ART.maze.white, MX - ART.maze.pad, MY - ART.maze.pad); x.globalAlpha = 1; }
  drawPellets(x, g, boot);
  drawFruit(x, g);
  for (const i of [3, 2, 1, 0]) drawGhost(x, i, g, stop);
  drawHero(x, g, stop, sl);
  drawParticles(x, g);
  drawPopups(x, g, stop, sl);
  drawBanners(x, g, stop, sl);
  x.restore();
  drawHud(x, g);
  // fade out to the intermission
  const f = clamp01((g - FADE.g0) / (FADE.g1 - FADE.g0));
  if (f > 0) { x.globalAlpha = f; fill(x, '#000', 0, 0, LW, LH); x.globalAlpha = 1; }
  return { low: ART.low, g, stop };
}
