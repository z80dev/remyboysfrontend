// POKéREMY scenes, drawn at native resolution into low-res canvases that film.js upscales (nearest).
import { hash } from 'filmkit/lib.js';
import { loadRemy, drawRemy } from '../remy-bros/art.js';
import * as A from './art.js';
import {
  LW, LH, OW, OH, STEP, STEPS, WALK_END, FLASH, SWIRL, B, STOPS, warp, filmT, BATTLE0, CPS, MSGS, MENUS, MOVES,
  msgEnd, foeHp, heroHp, heroExp, heroLv, HERO_HP, EV, EVO_MSGS, evoForm,
} from './choreo.js';

export const FONT = '"Press Start 2P"';
const GB = A.GB;
export const ART = {};
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (g, a, b) => clamp01((g - a) / (b - a));
const easeOut = (u) => 1 - (1 - u) * (1 - u);
const fill = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };

// sprite ids
export const HERO = 42, TRAINER = 17, FOE = 1217, EVOLVED = 9;
export const TITLE_FOES = [1217, 0, 744, 23, 5, 482];

export async function prepareGame() {
  ART.low = A.canvas(LW, LH);
  ART.ow = A.canvas(OW, OH);
  ART.heroNear = await loadRemy(HERO, false);
  ART.evoNear = await loadRemy(EVOLVED, false);
  ART.foe = await loadRemy(FOE, false);
  ART.titleFoes = [];
  for (const i of TITLE_FOES) ART.titleFoes.push(await loadRemy(i, false));
  const heroFar = await loadRemy(HERO, true), trainerFar = await loadRemy(TRAINER, true);
  ART.heroBack = A.upscale(A.backSprite(heroFar, { chin: 44, xMin: 7, keep: 0, hair: '#893c3b', shirt: '#2d3d49', skin: '#d0bdb1', crop: 66 }), 2);
  ART.trainerBack = A.upscale(A.backSprite(trainerFar, { chin: 40, xMin: 8, keep: 19, hair: '#292929', shirt: '#b5b4ea', skin: '#a07e63', crop: 66 }), 2);
  ART.heroBackW = A.tint(ART.heroBack, '#ffffff');
  ART.foeW = A.tint(ART.foe.c, '#ffffff');
  ART.foeDark = A.tint(ART.foe.c, '#283058');
  ART.heroNear2 = A.upscale(ART.heroNear.c, 2);
  ART.evoNear2 = A.upscale(ART.evoNear.c, 2);
  ART.heroNear2W = A.tint(ART.heroNear2, '#ffffff');
  ART.evoNear2W = A.tint(ART.evoNear2, '#ffffff');
  ART.heroNear2G = A.tint(ART.heroNear2, '#88b0ff');
  ART.evoNear2G = A.tint(ART.evoNear2, '#88b0ff');
  const heads = await A.loadAtlas('heads.webp'), sides = await A.loadAtlas('sides.webp');
  ART.heroSide = A.atlasCell(sides, HERO);
  ART.foeHead = A.atlasCell(heads, FOE);
  ART.heroHead = A.atlasCell(heads, HERO, 2);
  ART.evoHead = A.atlasCell(heads, EVOLVED, 2);
  ART.bg = A.battleBg(LW, 264);
  ART.foePlat = A.platform(100, 20);
  ART.heroPlat = A.platform(128, 24);
  ART.balls = [0, 1, 2, 3].map((i) => A.ball(i));
  ART.bottle = A.bottle();
  ART.bubbles = [2, 3, 4, 5, 7].map((r) => A.bubble(r));
  ART.ground = [0, 1, 2, 3].map((i) => A.groundTile(i));
  ART.path = [0, 1].map((i) => A.pathTile(i));
  ART.tall = [A.tallGrass(0), A.tallGrass(1)];
  ART.tree = A.tree();
  ART.flower = [A.flower(0), A.flower(1)];
  ART.sign = A.sign();
  ART.ledge = A.ledge();
}

// ---------- text / UI ----------
export function text(x, s, a, b, { size = 16, color = GB.ink, shadow = null, align = 'left', alpha = 1 } = {}) {
  x.save();
  x.globalAlpha *= alpha;
  x.font = `${size}px ${FONT}`;
  x.textAlign = align;
  x.textBaseline = 'top';
  const k = Math.max(1, Math.round(size / 16));
  if (shadow) { x.fillStyle = shadow; x.fillText(s, Math.round(a + k), Math.round(b + k)); }
  x.fillStyle = color;
  x.fillText(s, Math.round(a), Math.round(b));
  x.restore();
}
// GSC-style double frame
export function box(x, a, b, w, h) {
  fill(x, GB.ink, a, b, w, h);
  fill(x, GB.paper, a + 2, b + 2, w - 4, h - 4);
  fill(x, GB.uiHi, a + 4, b + 4, w - 8, h - 8);
  fill(x, GB.ui, a + 5, b + 5, w - 10, h - 10);
  fill(x, GB.paper, a + 7, b + 7, w - 14, h - 14);
  x.clearRect(a, b, 2, 2); x.clearRect(a + w - 2, b, 2, 2); x.clearRect(a, b + h - 2, 2, 2); x.clearRect(a + w - 2, b + h - 2, 2, 2);
  // corner rivets
  for (const [cx, cy] of [[a + 5, b + 5], [a + w - 7, b + 5], [a + 5, b + h - 7], [a + w - 7, b + h - 7]]) fill(x, GB.ink, cx, cy, 2, 2);
}
const arrowR = (x, a, b, col = GB.ink) => { for (let i = 0; i < 6; i++) fill(x, col, a + i * 2, b + i, 2, 12 - i * 2); };
const arrowD = (x, a, b, col = GB.ink) => { for (let i = 0; i < 6; i++) fill(x, col, a + i, b + i * 2, 12 - i * 2, 2); };

function typed(m, g) {
  const flat = m.s.replace('\n', '');
  const n = Math.max(0, Math.min(flat.length, Math.floor((g - m.g) * CPS)));
  const [l1, l2 = ''] = m.s.split('\n');
  return [l1.slice(0, n), l2.slice(0, Math.max(0, n - l1.length))];
}
function textBox(x, lines, waiting) {
  box(x, 0, 264, LW, 96);
  if (lines[0]) text(x, lines[0], 32, 288, { shadow: '#c8c8d8' });
  if (lines[1]) text(x, lines[1], 32, 320, { shadow: '#c8c8d8' });
  if (waiting) arrowD(x, 596, 334);
}

// HP bar: frac 0..1, pixel-quantized like the original
function hpBar(x, a, b, frac, w = 176) {
  text(x, 'HP', a - 28, b, { size: 8, color: GB.ink });
  fill(x, GB.ink, a - 4, b - 2, w + 8, 12);
  fill(x, '#f8f8f0', a - 2, b, w + 4, 8);
  fill(x, '#405048', a, b + 1, w, 6);
  const px = Math.ceil(frac * w - 1e-6);
  const [c, hi] = frac > 0.5 ? [GB.hpG, GB.hpGHi] : frac > 0.2 ? [GB.hpY, GB.hpYHi] : [GB.hpR, GB.hpRHi];
  if (px > 0) { fill(x, c, a, b + 1, px, 6); fill(x, hi, a, b + 1, px, 2); }
}

// ---------- particles helpers ----------
function star4(x, cx, cy, r, col) {
  fill(x, col, cx - r, cy, r * 2 + 1, 1);
  fill(x, col, cx, cy - r, 1, r * 2 + 1);
  if (r > 2) fill(x, col, cx - 1, cy - 1, 3, 3);
}
function bigStar(x, cx, cy, r, col, rot = 0) {
  x.save(); x.translate(Math.round(cx), Math.round(cy)); x.rotate(rot);
  x.fillStyle = col;
  x.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.22 : r;
    x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  x.fill();
  x.restore();
}
function ring(x, cx, cy, r, col, w = 2, a = 1) {
  x.save(); x.globalAlpha *= a; x.strokeStyle = col; x.lineWidth = w;
  x.beginPath(); x.arc(Math.round(cx), Math.round(cy), Math.max(0.5, r), 0, 7); x.stroke(); x.restore();
}

// ====================================================================================================
// TITLE
// ====================================================================================================
function logo(dst, dcx, dcy, k = 1, shine = -1) {
  // drawn on its own layer so the shine can be masked to the lettering
  const L = ART.logoC ?? (ART.logoC = A.canvas(LW, 240)), x = L.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1;
  x.clearRect(0, 0, L.width, L.height);
  const cx = LW / 2, cy = 120;
  const word = 'POKéREMY', n = word.length;
  const sizes = word.split('').map((ch, i) => (i === 0 || i === n - 1 ? 56 : ch === 'é' ? 40 : 48) * k);
  const widths = sizes.map((s, i) => (word[i] === 'é' ? s * 0.92 : s * 0.94));
  const total = widths.reduce((a, b) => a + b, 0);
  const pos = [];
  let px = cx - total / 2;
  for (let i = 0; i < n; i++) {
    const arch = -Math.sin(Math.PI * (i + 0.5) / n) * 14 * k;
    pos.push([px, cy + arch - sizes[i] / 2 + (word[i] === 'é' ? 4 * k : 0)]);
    px += widths[i];
  }
  x.save();
  x.textBaseline = 'top';
  const stamp = (col, rad, dy) => {
    x.fillStyle = col;
    for (let i = 0; i < n; i++) {
      x.font = `${Math.round(sizes[i])}px ${FONT}`;
      for (let a = 0; a < 12; a++) {
        const ox = Math.round(Math.cos((a / 12) * 6.283) * rad), oy = Math.round(Math.sin((a / 12) * 6.283) * rad);
        x.fillText(word[i], Math.round(pos[i][0] + ox), Math.round(pos[i][1] + oy + dy));
      }
    }
  };
  stamp('#101848', 7 * k, 5 * k);
  stamp('#2850b8', 6 * k, 0);
  stamp('#4878e0', 3 * k, -1);
  for (let i = 0; i < n; i++) {
    x.font = `${Math.round(sizes[i])}px ${FONT}`;
    const top = pos[i][1], gr = x.createLinearGradient(0, top, 0, top + sizes[i]);
    gr.addColorStop(0, '#fff8a0'); gr.addColorStop(0.45, '#ffd820'); gr.addColorStop(0.5, '#f8c000'); gr.addColorStop(1, '#e09000');
    x.fillStyle = '#a05800';
    x.fillText(word[i], Math.round(pos[i][0] + 2 * k), Math.round(top + 2 * k));
    x.fillStyle = gr;
    x.fillText(word[i], Math.round(pos[i][0]), Math.round(top));
  }
  if (shine >= 0 && shine <= 1) {
    // glint sweeping across the letters (masked to the fill)
    const sx = cx - total / 2 - 40 + (total + 80) * shine;
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = 0.85;
    x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(sx, cy - 60 * k); x.lineTo(sx + 18 * k, cy - 60 * k); x.lineTo(sx - 12 * k, cy + 60 * k); x.lineTo(sx - 30 * k, cy + 60 * k); x.fill();
  }
  x.restore();
  dst.drawImage(L, Math.round(dcx - cx), Math.round(dcy - cy));
  return { w: total };
}
function titleBg(x, lt) {
  // dithered sky
  const cols = ['#183078', '#2048a0', '#3068c8', '#4890e0', '#70b8f0', '#a8e0f8'];
  for (let y = 0; y < LH; y += 2) {
    const v = (y / LH) * (cols.length - 1), b0 = Math.floor(v), f = v - b0;
    for (let xx = 0; xx < LW; xx += 2) {
      const c = f > A.BAYER[((y >> 1) & 3) * 4 + ((xx >> 1) & 3)] / 16 ? cols[Math.min(cols.length - 1, b0 + 1)] : cols[b0];
      x.fillStyle = c; x.fillRect(xx, y, 2, 2);
    }
  }
  // sun rays from behind the logo
  x.save();
  x.globalAlpha = 0.12;
  x.fillStyle = '#ffffff';
  for (let i = 0; i < 14; i++) {
    const a0 = (i / 14) * 6.283 + lt * 0.5, a1 = a0 + 0.18;
    x.beginPath(); x.moveTo(320, 110); x.lineTo(320 + Math.cos(a0) * 700, 110 + Math.sin(a0) * 700); x.lineTo(320 + Math.cos(a1) * 700, 110 + Math.sin(a1) * 700); x.fill();
  }
  x.restore();
  // twinkles
  for (let i = 0; i < 40; i++) {
    const sx = Math.floor(hash(i) * LW), sy = Math.floor(hash(i + 50) * 200);
    if (Math.sin(lt * 9 + i * 1.7) > 0.4) star4(x, sx, sy, i % 6 === 0 ? 2 : 1, '#ffffff');
  }
  // rolling meadow with tall grass band
  for (let xx = 0; xx < LW; xx += 16) {
    for (let yy = 300; yy < LH; yy += 16) x.drawImage(ART.tall[Math.floor(lt * 4 + xx / 48) % 2], xx, yy);
  }
  fill(x, '#184818', 0, 298, LW, 2);
  fill(x, '#88d060', 0, 296, LW, 2);
}
export function drawTitle(lt) {
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  titleBg(x, lt);
  // hero (right) and the cycling Cabald (left) slide in
  const sin = easeOut(seg(lt, 0.12, 0.4));
  const hx = 540 + (1 - sin) * 200;
  drawRemy(x, ART.heroNear, hx, 318, { flip: true, lift: [0, 0] });
  const ci = Math.floor(Math.max(0, lt - 0.2) / 0.16) % ART.titleFoes.length;
  const cu = ((Math.max(0, lt - 0.2)) % 0.16) / 0.16;
  const fx = 100 - (1 - sin) * 200;
  const R = ART.titleFoes[ci];
  drawRemy(x, R, fx, 318, { sy: 1 + 0.06 * Math.max(0, 1 - cu * 4), sx: 1 - 0.04 * Math.max(0, 1 - cu * 4) });
  if (cu < 0.2 && lt > 0.2) drawRemy(x, R, fx, 318, { white: true, alpha: 1 - cu / 0.2 });
  text(x, 'VS', 100, 190, { size: 16, color: '#ff6a8a', shadow: '#181828', align: 'center', alpha: clamp01((lt - 0.4) / 0.05) });
  // logo drop with bounce
  const d = lt < 0.24 ? -200 * (1 - (lt / 0.24) ** 2) : 8 * Math.exp(-(lt - 0.24) * 14) * Math.sin((lt - 0.24) * 40);
  logo(x, 320, 96 + d, 1, (lt - 0.4) / 0.3);
  // version ribbon
  if (lt > 0.3) {
    const u = easeOut(seg(lt, 0.3, 0.42)), w = 260 * u;
    fill(x, '#181828', 320 - w / 2 - 2, 156, w + 4, 28);
    fill(x, '#d83838', 320 - w / 2, 158, w, 24);
    fill(x, '#ff8a78', 320 - w / 2, 158, w, 3);
    fill(x, '#902020', 320 - w / 2, 179, w, 3);
    if (u > 0.9) text(x, 'HAIR VERSION', 320, 163, { size: 16, color: '#fff8e0', shadow: '#601818', align: 'center' });
  }
  if (lt > 0.5 && Math.floor((lt - 0.5) / 0.12) % 2 === 0) text(x, 'PRESS START', 320, 220, { size: 16, color: '#fff8a0', shadow: '#181828', align: 'center' });
  text(x, '©2026 REMY BOYS / CABALD FREAK', 320, 340, { size: 8, color: '#f8f8f0', shadow: '#183018', align: 'center' });
  // start press → white
  const wf = seg(lt, 0.88, 1.0);
  if (wf > 0) { x.fillStyle = `rgba(248,248,240,${wf})`; x.fillRect(0, 0, LW, LH); }
  return ART.low;
}

// ====================================================================================================
// OVERWORLD (ROUTE 42)
// ====================================================================================================
const T = 16;
const HERO_C0 = 6, HERO_ROW = 5;
const isTall = (c, r) => c >= 8 && c <= 21 && r >= 3 && r <= 8 && !(c === 8 && (r === 3 || r === 8)) && !(c === 21 && r === 8);
const isPath = (c, r) => (r === 5 && c <= 7) || (c === 4 && r >= 5);
const owHeroX = (lt) => {
  const s = Math.min(STEPS, lt / STEP);
  return HERO_C0 * T + s * T;
};
function owHero(x, sx, feet, lt) {
  const walking = lt < WALK_END;
  const ph = walking ? Math.floor((lt / STEP) * 2) % 4 : 0; // 4 frames per two steps
  const bob = walking && ph % 2 === 1 ? -1 : 0;
  const y = feet + bob;
  // legs
  const legA = ph === 1 ? 1 : ph === 3 ? -1 : 0;
  fill(x, '#181828', sx + 4, y - 5, 3, 4); fill(x, '#181828', sx + 9, y - 5, 3, 4);
  fill(x, '#303860', sx + 5 + legA, y - 5, 2, 4); fill(x, '#303860', sx + 9 - legA, y - 5, 2, 4);
  fill(x, '#f8f8f0', sx + 4 + legA, y - 2, 3, 2); fill(x, '#f8f8f0', sx + 9 - legA, y - 2, 3, 2);
  // torso
  fill(x, '#181828', sx + 3, y - 10, 10, 6);
  fill(x, '#2d3d49', sx + 4, y - 10, 8, 5);
  fill(x, '#4a6070', sx + 4, y - 10, 8, 1);
  fill(x, '#d0bdb1', sx + 7 + (ph % 2 ? 2 : -1), y - 7, 2, 2); // swinging hand
  // sword hilt poking over the shoulder
  fill(x, '#181828', sx + 1, y - 17, 2, 8); fill(x, '#607080', sx + 1, y - 17, 1, 7);
  x.drawImage(ART.heroSide, sx, y - 25);
}
export function drawRoute(lt) {
  const x = ART.ow.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  const hx = owHeroX(lt);
  const cam = Math.round(hx + 8 - OW / 2), camY = 4;
  // ground layer
  for (let r = 0; r < 12; r++) {
    for (let c = Math.floor(cam / T) - 1; c <= Math.floor((cam + OW) / T) + 1; c++) {
      const sx = c * T - cam, sy = r * T - camY;
      if (isPath(c, r)) x.drawImage(ART.path[(c + r) & 1], sx, sy);
      else x.drawImage(ART.ground[Math.floor(hash(c * 13 + r * 7) * 4)], sx, sy);
      if (isTall(c, r)) {
        // wind wave through the patch, and the step rustle under the hero
        const wave = Math.sin(c * 0.7 + r * 0.4 - lt * 7) > 0.6 ? 1 : 0;
        const step = Math.floor(lt / STEP), hc = HERO_C0 + Math.min(STEPS, step + 1);
        const rustle = r === HERO_ROW && c === hc && lt < WALK_END + 0.2 && Math.floor(lt / 0.06) % 2 === 0;
        x.drawImage(ART.tall[rustle ? 1 - wave : wave], sx, sy);
      }
      if (!isTall(c, r) && !isPath(c, r) && r >= 2 && r <= 8 && hash(c * 31 + r * 17) > 0.86) x.drawImage(ART.flower[(Math.floor(lt * 3) + c + 64) % 2], sx + 4, sy + 4);
      if (r === 9) x.drawImage(ART.ledge, sx, sy + 4);
    }
  }
  // sign
  x.drawImage(ART.sign, 5 * T - cam, 3 * T - camY + 4);
  // bald head peeking from the grass ahead (foreshadow)
  const peek = seg(lt, 0.52, 0.62) - seg(lt, 0.86, 0.9);
  if (peek > 0) {
    const pc = 12, pr = HERO_ROW;
    const px = pc * T - cam, py = pr * T - camY + 10 - Math.round(13 * peek);
    x.save(); x.beginPath(); x.rect(px - 2, pr * T - camY - 16, T + 4, 26); x.clip();
    x.drawImage(ART.foeHead, px, py);
    x.restore();
    if (lt > 0.6 && lt < 0.7) star4(x, px + 5, py + 3, Math.round(3 * Math.sin(((lt - 0.6) / 0.1) * Math.PI)), '#ffffff');
    // re-cover with the grass blades in front
    x.drawImage(ART.tall[1], 0, 8, 16, 8, px, pr * T - camY + 8, 16, 8);
  }
  // trees: top rows and bottom rows, plus a few in the meadow edge
  for (let c = Math.floor(cam / 32) - 1; c <= Math.floor((cam + OW) / 32) + 1; c++) {
    const sx = c * 32 - cam;
    x.drawImage(ART.tree, sx, -camY - 4);
    x.drawImage(ART.tree, sx + 16, 12 - camY);
    x.drawImage(ART.tree, sx, 10 * T - camY);
    x.drawImage(ART.tree, sx + 16, 10 * T - camY + 12);
  }
  // hero (grass hides the lower half of the sprite)
  const sx = Math.round(hx - cam), feet = HERO_ROW * T - camY + 15;
  owHero(x, sx, feet, lt);
  for (const c of [Math.floor(hx / T), Math.ceil(hx / T)]) {
    if (!isTall(c, HERO_ROW)) continue;
    x.drawImage(ART.tall[0], 0, 8, 16, 8, c * T - cam, HERO_ROW * T - camY + 8, 16, 8);
  }
  // leaf flecks kicked up on each grass step
  for (let k = 1; k <= STEPS; k++) {
    const t0 = (k - 1) * STEP + 0.05, age = lt - t0;
    const c = HERO_C0 + k;
    if (!isTall(c, HERO_ROW) || age < 0 || age > 0.3) continue;
    for (let i = 0; i < 4; i++) {
      const vx = (hash(k * 9 + i) - 0.5) * 50, vy = -50 - 30 * hash(k * 5 + i);
      const lx = c * T - cam + 8 + vx * age, ly = HERO_ROW * T - camY + 10 + vy * age + 200 * age * age;
      fill(x, i % 2 ? '#c0f080' : '#388c30', lx, ly, 2, 1);
    }
  }
  // "!" over the hero
  if (lt > 0.66 && lt < FLASH.t0 + 0.12) {
    const u = seg(lt, 0.66, 0.72), bx = sx + 2, by = feet - 42 + Math.round(4 * (1 - u));
    fill(x, GB.ink, bx, by, 12, 14); fill(x, '#f8f8f0', bx + 1, by + 1, 10, 12);
    fill(x, '#d83838', bx + 5, by + 3, 2, 5); fill(x, '#d83838', bx + 5, by + 10, 2, 2);
    fill(x, GB.ink, bx + 4, by + 14, 3, 2);
  }
  // location banner
  const bu = easeOut(seg(lt, 0.02, 0.16));
  const by = Math.round(-30 + 34 * bu);
  fill(x, GB.ink, 4, by, 104, 24); fill(x, GB.paper, 5, by + 1, 102, 22); fill(x, GB.ui, 7, by + 3, 98, 18); fill(x, GB.paper, 8, by + 4, 96, 16);
  text(x, 'ROUTE 42', 56, by + 8, { size: 8, color: GB.ink, align: 'center' });
  // encounter: palette flashes, then the swirl wipe
  if (lt >= FLASH.t0 && lt < FLASH.t1) {
    const k = Math.floor((lt - FLASH.t0) / 0.033);
    x.save();
    if (k % 2 === 0) { x.globalCompositeOperation = 'difference'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, OW, OH); }
    else { x.fillStyle = 'rgba(248,248,240,0.75)'; x.fillRect(0, 0, OW, OH); }
    x.restore();
  }
  if (lt >= SWIRL.t0) {
    const p = seg(lt, SWIRL.t0, SWIRL.t1 - 0.03);
    const bs = 10, cx = OW / 2, cy = OH / 2, Rm = Math.hypot(cx, cy);
    x.fillStyle = '#080810';
    for (let yy = 0; yy < OH; yy += bs)
      for (let xx = 0; xx < OW; xx += bs) {
        const dx = xx + bs / 2 - cx, dy = yy + bs / 2 - cy;
        const ang = (Math.atan2(dy, dx) / 6.283 + 1) % 1, r = Math.hypot(dx, dy) / Rm;
        // two spiral arms sweep inward
        const order = (((ang * 2 + (1 - r) * 1.6) % 1) * 0.55 + (1 - r) * 0.45);
        if (p * 1.02 > order) x.fillRect(xx, yy, bs, bs);
      }
  }
  return ART.ow;
}

// ====================================================================================================
// BATTLE
// ====================================================================================================
const FOE_X = 476, FOE_FEET = 148, HERO_X = 168, HERO_BOTTOM = 270;
const FOE_TOP = FOE_FEET - 116;

const SHOOK = [
  ...B.slashes.map((g) => [filmT(g), 5, 1, 0.3]),
  [filmT(B.heroBlink[0]), 5, 0.2, 1],
  [filmT(B.impact), 10, 1, 0.8],
  [filmT(B.pop), 2, 0.5, 1],
  [filmT(B.faintSlide[1]), 3, 0.3, 1],
];
function shake(ft) {
  let sx = 0, sy = 0;
  for (const [t0, amp, kx, ky] of SHOOK) {
    const d = ft - t0;
    if (d < 0 || d > 0.35) continue;
    const k = amp * Math.exp(-d * 13);
    sx += k * kx * Math.sin(d * 90 + t0 * 10);
    sy += k * ky * Math.cos(d * 70 + t0 * 7);
  }
  return [Math.round(sx), Math.round(sy)];
}

function slashPath(i) {
  const dir = i % 2 ? -1 : 1;
  const y0 = FOE_TOP + 18 + i * 22, y1 = FOE_TOP + 70 + i * 10;
  return { x0: FOE_X - 86 * dir, y0, x1: FOE_X + 86 * dir, y1, cx: FOE_X, cy: FOE_TOP - 10 + i * 18 };
}
const bez = (p, u) => {
  const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
  return [a * p.x0 + b * p.cx + c * p.x1, a * p.y0 + b * p.cy + c * p.y1];
};
function drawSlash(x, i, g) {
  const s = B.slashes[i], p = slashPath(i);
  const a = g - (s - 0.06);
  if (a < 0 || a > 0.22) return;
  const head = clamp01(a / 0.06), tail = clamp01((a - 0.07) / 0.15);
  for (const [w, col] of [[9, GB.hairLo], [6, GB.hair], [2, GB.hairHi]]) {
    x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round';
    x.beginPath();
    for (let k = 0; k <= 16; k++) {
      const u = tail + (head - tail) * (k / 16);
      const [px, py] = bez(p, u);
      // the whip tapers toward its tail end
      k ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
  }
  // strand fringe trailing behind the lash
  for (let k = 0; k < 6; k++) {
    const u = tail + (head - tail) * (k / 6);
    const [px, py] = bez(p, u);
    fill(x, GB.hairHi, px + (hash(i * 9 + k) - 0.5) * 10, py + 5 + hash(k + i) * 4, 2, 4);
  }
}
function impactFx(x, cx, cy, age, big = false) {
  if (age < 0 || age > 0.3) return;
  const u = age / 0.3;
  if (age < 0.05) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx, cy, big ? 30 : 18, 0, 7); x.fill(); }
  bigStar(x, cx, cy, (big ? 44 : 26) * (1 - u * 0.6), u < 0.4 ? '#ffffff' : '#fff070', u * 1.5);
  const n = big ? 10 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + 0.3, d = (big ? 70 : 40) * Math.sqrt(u);
    star4(x, Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.8), Math.round(3 * (1 - u)) + 1, i % 2 ? '#fff070' : '#ffffff');
  }
  ring(x, cx, cy, 8 + (big ? 70 : 40) * u, '#ffffff', 2, 1 - u);
}

function foeState(g, stop, sl) {
  let dx = 0, dy = 0, sx = 1, sy = 1, white = false, vis = true, dark = 0, clipSlide = 0;
  // slide in from the left with the platform
  const su = seg(g, B.slide[0], B.slide[1]);
  const slideX = -(1 - su) * 620;
  if (g < B.slide[1] + 0.02) dark = 1;
  else dark = 1 - seg(g, B.slide[1] + 0.02, B.foeCry + 0.08);
  // cry: two squash hops
  const cu = g - B.foeCry;
  if (cu >= 0 && cu < 0.3) { const h = Math.abs(Math.sin((cu / 0.3) * Math.PI * 2)); dy -= 8 * h; sy = 1 + 0.08 * h; sx = 1 - 0.05 * h; }
  // idle breathing
  sy *= 1 + 0.012 * Math.sin(g * 5.5);
  // slash knockbacks + white during stops
  for (const s of B.slashes) { const a = g - s; if (a >= 0 && a < 0.2) dx += 6 * Math.exp(-a * 18) * (B.slashes.indexOf(s) % 2 ? -1 : 1); }
  if (stop && stop.kind !== 'impact' && B.slashes.includes(stop.g)) white = true;
  if (g >= B.foeBlink1[0] && g < B.foeBlink1[1]) vis = Math.floor((g - B.foeBlink1[0]) / 0.05) % 2 === 1;
  // head shine hop
  const hu = seg(g, B.shineHop[0], B.shineHop[1]);
  if (hu > 0 && hu < 1) { dy -= 14 * Math.sin(hu * Math.PI); sy = 1 + 0.1 * Math.sin(hu * Math.PI); sx = 1 - 0.06 * Math.sin(hu * Math.PI); }
  const land = g - B.shineHop[1];
  if (land >= 0 && land < 0.1) { const s = Math.sin((land / 0.1) * Math.PI); sy = 1 - 0.1 * s; sx = 1 + 0.08 * s; }
  // impact
  if (stop?.kind === 'impact') { white = Math.floor(sl / 0.04) % 2 === 0; sy = 0.86; sx = 1.1; }
  const ia = g - B.impact;
  if (ia >= 0 && ia < 0.25) { dx += 10 * Math.exp(-ia * 14) * Math.sin(ia * 60); const s = Math.exp(-ia * 12); sy = 1 - 0.12 * s; sx = 1 + 0.1 * s; }
  if (g >= B.foeBlink2[0] && g < B.foeBlink2[1]) vis = Math.floor((g - B.foeBlink2[0]) / 0.05) % 2 === 1;
  // faint: slides down into the platform
  clipSlide = easeIn(seg(g, B.faintSlide[0], B.faintSlide[1])) * 120;
  const fcu = g - B.faintCry;
  if (fcu >= 0 && fcu < 0.06) { sy = 1.05; }
  return { dx, dy, sx, sy, white, vis, dark, slideX, clipSlide };
}
const easeIn = (u) => u * u;

function drawFoe(x, g, stop, sl) {
  const f = foeState(g, stop, sl);
  const px = FOE_X + f.slideX;
  x.drawImage(ART.foePlat, Math.round(px - 101), FOE_FEET - 22);
  if (!f.vis || f.clipSlide >= 118) return f;
  x.save();
  if (f.clipSlide > 0) { x.beginPath(); x.rect(0, 0, LW, FOE_FEET + 2); x.clip(); }
  const o = { sx: f.sx, sy: f.sy, white: f.white };
  drawRemy(x, ART.foe, px + f.dx, FOE_FEET + f.dy + f.clipSlide, o);
  if (f.dark > 0) drawRemy(x, { ...ART.foe, c: ART.foeDark, sil: ART.foeDark }, px + f.dx, FOE_FEET + f.dy, { sx: f.sx, sy: f.sy, alpha: f.dark });
  x.restore();
  return f;
}

function drawBack(x, img, cx, bottom, { sx = 1, sy = 1, alpha = 1 } = {}) {
  const w = Math.round(img.width * sx), h = Math.round(img.height * sy);
  if (w < 1 || h < 1) return;
  x.save(); x.globalAlpha *= alpha;
  x.drawImage(img, Math.round(cx - w / 2), Math.round(bottom - h), w, h);
  x.restore();
}

function drawHeroSide(x, g, stop, sl, ft) {
  // platform slides in from the right with the trainer
  const su = seg(g, B.slide[0], B.slide[1]);
  const slideX = (1 - su) * 620;
  x.drawImage(ART.heroPlat, Math.round(HERO_X + slideX - 129), 262 - 25);
  // trainer: slides in, then exits left
  const tout = easeIn(seg(g, B.trainerOut[0], B.trainerOut[1]));
  if (tout < 1) drawBack(x, ART.trainerBack, HERO_X + slideX - tout * 300, HERO_BOTTOM + 2);
  // ball arc
  if (g >= B.ball[0] && g < B.pop) {
    const u = seg(g, B.ball[0], B.pop);
    const bx = 70 + (HERO_X - 70) * u, by = 200 + (238 - 200) * u - 80 * Math.sin(Math.PI * u);
    x.drawImage(ART.balls[Math.floor(g * 30) % 4], Math.round(bx - 7), Math.round(by - 11));
  }
  // pop: open ball, burst, smoke
  const pa = g - B.pop;
  if (pa >= 0 && pa < 0.45) {
    const cx = HERO_X, cy = 226;
    if (pa < 0.06) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx, cy, 10 + pa * 300, 0, 7); x.fill(); }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283 + 0.4, d = 14 + 120 * Math.sqrt(pa / 0.45);
      if (pa < 0.35) star4(x, Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.7 - pa * 40), Math.round(4 * (1 - pa / 0.35)) + 1, i % 2 ? '#fff070' : '#ffffff');
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283, d = 10 + 40 * (pa / 0.45);
      x.globalAlpha = clamp01(1 - pa / 0.45) * 0.9;
      x.fillStyle = i % 2 ? '#f8f8f0' : '#d8e0f0';
      x.beginPath(); x.arc(Math.round(cx + Math.cos(a) * d), Math.round(cy + 20 + Math.sin(a) * d * 0.4 - pa * 30), Math.round(9 * (1 - pa)), 0, 7); x.fill();
    }
    x.globalAlpha = 1;
  }
  // hero grows out of the burst
  if (g < B.grow[0]) return;
  const gu = seg(g, B.grow[0], B.grow[1]);
  let sx = gu < 1 ? 0.15 + 0.95 * easeOut(gu) : 1, sy = sx;
  if (gu >= 1) { const s = Math.exp(-(g - B.grow[1]) * 10) * Math.sin((g - B.grow[1]) * 30); sy = 1 + 0.06 * s; sx = 1 - 0.04 * s; }
  let dx = 0, dy = 0, vis = true, white = gu < 0.75;
  // idle bob
  dy += Math.floor(g / 0.45) % 2 ? 2 : 0;
  // lunge for HAIR WHIP
  const lu = seg(g, B.lunge[0], B.lunge[1]);
  if (lu > 0 && lu < 1) { dx += 26 * Math.sin(lu * Math.PI); dy -= 14 * Math.sin(lu * Math.PI); }
  // shampoo wind-up recoil
  const su2 = seg(g, B.stream[0], B.stream[0] + 0.12);
  if (su2 > 0 && su2 < 1) { dy += 4 * Math.sin(su2 * Math.PI); sy *= 1 - 0.05 * Math.sin(su2 * Math.PI); }
  // hit by HEAD SHINE
  if (g >= B.heroBlink[0] && g < B.heroBlink[1]) vis = Math.floor((g - B.heroBlink[0]) / 0.04) % 2 === 1;
  // level up glow
  const la = g - B.lvUp;
  if (la >= 0 && la < 0.5) white = Math.floor(la / 0.06) % 2 === 0 && la < 0.3;
  if (!vis) return;
  drawBack(x, ART.heroBack, HERO_X + dx, HERO_BOTTOM + dy, { sx, sy });
  if (white) drawBack(x, ART.heroBackW, HERO_X + dx, HERO_BOTTOM + dy, { sx, sy, alpha: gu < 0.75 ? 1 : 0.85 });
}

function drawAttackFx(x, g, stop, sl) {
  // HAIR WHIP slashes + impacts
  B.slashes.forEach((s, i) => {
    drawSlash(x, i, g);
    const p = slashPath(i), [ix, iy] = bez(p, 0.5);
    let age = g - s;
    if (stop && stop.g === s) age = sl * 0.3;
    impactFx(x, ix, iy + 10, age);
  });
  // flying hair strands after the whip
  for (let i = 0; i < 14; i++) {
    const t0 = B.slashes[i % 3], age = g - t0;
    if (age < 0 || age > 0.45) continue;
    const vx = (hash(i * 7) - 0.5) * 260, vy = -120 - 140 * hash(i * 3);
    const px = FOE_X + vx * age, py = FOE_TOP + 50 + vy * age + 700 * age * age;
    x.save(); x.translate(Math.round(px), Math.round(py)); x.rotate(age * 12 + i);
    fill(x, i % 2 ? GB.hair : GB.hairHi, -3, -1, 7, 2);
    x.restore();
  }
  // HEAD SHINE glint on the dome
  const gu = seg(g, B.glint[0], B.glint[1]);
  if (gu > 0 && g < B.shineFlash[1] + 0.05) {
    const hu = seg(g, B.shineHop[0], B.shineHop[1]);
    const gx = FOE_X - 8, gy = FOE_TOP + 16 - 14 * Math.sin(hu * Math.PI);
    const r = 6 + 26 * Math.sin(gu * Math.PI * 0.5);
    x.save(); x.globalAlpha = 0.5; x.fillStyle = '#fff8c0'; x.beginPath(); x.arc(gx, gy, r * 0.9, 0, 7); x.fill(); x.restore();
    bigStar(x, gx, gy, r * 1.4, '#ffffff', g * 6);
    bigStar(x, gx, gy, r * 0.8, '#fff070', -g * 4 + 0.4);
    // beams toward REMY
    if (g > B.shineFlash[0] - 0.04) {
      x.save(); x.globalAlpha = 0.55; x.fillStyle = '#fffbe0';
      x.beginPath(); x.moveTo(gx, gy - 4); x.lineTo(HERO_X + 60, 170); x.lineTo(HERO_X - 40, 230); x.lineTo(gx, gy + 4); x.fill(); x.restore();
    }
  }
  // SUPER SHAMPOO: bottle, squirt stream, foam, burst
  const bu = seg(g, B.bottle[0], B.bottle[0] + 0.1);
  if (g >= B.bottle[0] && g < B.bottle[1]) {
    const out = seg(g, B.bottle[1] - 0.08, B.bottle[1]);
    const s = (0.3 + 0.7 * easeOut(bu)) * (1 + 0.15 * Math.sin(bu * Math.PI)) * (1 - out);
    const tilt = -1.1 * easeOut(seg(g, B.bottle[0] + 0.04, B.stream[0] + 0.02));
    const squeeze = g > B.stream[0] && g < B.stream[1] ? 1 - 0.12 * Math.abs(Math.sin(g * 50)) : 1;
    x.save(); x.translate(HERO_X + 70, 150); x.rotate(-tilt);
    x.scale(s * 2 * squeeze, s * 2 / squeeze);
    x.drawImage(ART.bottle, -8, -14);
    x.restore();
  }
  const nozzle = [HERO_X + 100, 128];
  const tgt = [FOE_X - 6, FOE_TOP + 34];
  for (let i = 0; i < 34; i++) {
    const t0 = B.stream[0] + i * ((B.stream[1] - B.stream[0]) / 34), age = g - t0, fl = 0.2;
    if (age < 0 || age > fl) continue;
    const u = age / fl, spread = (hash(i * 5) - 0.5) * 40, lift = 60 + 20 * hash(i * 9);
    const px = nozzle[0] + (tgt[0] - nozzle[0]) * u + spread * u, py = nozzle[1] + (tgt[1] - nozzle[1]) * u - lift * Math.sin(Math.PI * u) + spread * 0.5 * u;
    const b = ART.bubbles[i % 4];
    x.drawImage(b, Math.round(px - b.width / 2), Math.round(py - b.height / 2));
  }
  if (g >= B.foam[0] && g < B.burst[1]) {
    const grow = seg(g, B.foam[0], B.impact), ba = g - B.impact;
    const n = Math.floor(6 + 30 * grow);
    for (let i = 0; i < 36; i++) {
      if (i >= n && ba < 0) continue;
      const a = hash(i * 11) * 6.283, rr = 12 + 48 * Math.sqrt(hash(i * 13));
      let px = FOE_X + Math.cos(a) * rr, py = FOE_TOP + 44 + Math.sin(a) * rr * 0.9;
      px += Math.sin(g * 9 + i) * 2;
      let b = ART.bubbles[i % 5];
      if (ba > 0) {
        // burst outward and pop
        const life = 0.12 + 0.2 * hash(i * 3);
        if (ba > life) { if (ba < life + 0.08) ring(x, px + Math.cos(a) * 60 * life, py + Math.sin(a) * 50 * life, 3 + 30 * (ba - life), '#ffffff', 1, 1 - (ba - life) / 0.08); continue; }
        px += Math.cos(a) * 200 * ba; py += Math.sin(a) * 160 * ba - 40 * ba;
      }
      x.drawImage(b, Math.round(px - b.width / 2), Math.round(py - b.height / 2));
    }
  }
  let ia = g - B.impact;
  if (stop?.kind === 'impact') ia = sl * 0.25;
  impactFx(x, FOE_X, FOE_TOP + 44, ia, true);
  // squeaky-clean sparkles on the dome after the burst
  const sa = g - B.impact - 0.1;
  if (sa > 0 && sa < 0.6) for (let i = 0; i < 5; i++) {
    const tw = Math.sin(sa * 20 + i * 2);
    if (tw > 0) star4(x, Math.round(FOE_X - 30 + hash(i * 3) * 50), Math.round(FOE_TOP + 6 + hash(i * 7) * 30), Math.round(tw * 4), '#ffffff');
  }
}

function foeBox(x, g) {
  const inU = easeOut(seg(g, B.foeBox[0], B.foeBox[1])), outU = easeIn(seg(g, B.foeBoxOut[0], B.foeBoxOut[1]));
  if (inU <= 0 || outU >= 1) return;
  x.save(); x.translate(Math.round(-330 * (1 - inU) - 330 * outU), 0);
  text(x, 'BALD REMY', 40, 22, { shadow: '#c8c8d8' });
  text(x, 'Lv5', 64, 44, { shadow: '#c8c8d8' });
  hpBar(x, 92, 66, foeHp(g), 176);
  fill(x, GB.ink, 30, 46, 2, 36); fill(x, GB.ink, 30, 80, 252, 2);
  for (let i = 0; i < 4; i++) fill(x, GB.ink, 282 + i, 76 + i, 2, 6 - i);
  x.restore();
}
function heroBox(x, g) {
  const inU = easeOut(seg(g, B.heroBox[0], B.heroBox[1]));
  if (inU <= 0) return;
  x.save(); x.translate(Math.round(330 * (1 - inU)), 0);
  const lvFlash = g >= B.lvUp && g < B.lvUp + 0.4 && Math.floor((g - B.lvUp) / 0.06) % 2 === 0;
  text(x, 'REMY', 384, 182, { shadow: '#c8c8d8' });
  text(x, 'Lv' + heroLv(g), 600, 182, { align: 'right', color: lvFlash ? '#d83838' : GB.ink, shadow: '#c8c8d8' });
  hpBar(x, 420, 204, heroHp(g) / HERO_HP, 176);
  const hp = Math.ceil(heroHp(g) - 1e-6);
  text(x, `${String(hp).padStart(3)}/${String(HERO_HP).padStart(3)}`, 600, 218, { align: 'right', shadow: '#c8c8d8' });
  // EXP bar
  text(x, 'EXP', 380, 240, { size: 8 });
  fill(x, GB.ink, 414, 238, 188, 8); fill(x, '#e8e8f0', 416, 240, 184, 4);
  const ew = Math.floor(heroExp(g) * 184);
  if (ew > 0) { fill(x, GB.exp, 416, 240, ew, 4); fill(x, GB.expHi, 416, 240, ew, 1); }
  if (g >= B.expFill[0] && g < B.expFill[1] + 0.1) fill(x, '#ffffff', 416 + ew - 2, 239, 3, 6);
  fill(x, GB.ink, 612, 202, 2, 52); fill(x, GB.ink, 362, 252, 252, 2);
  for (let i = 0; i < 4; i++) fill(x, GB.ink, 358 - i, 248 + i, 2, 6 - i);
  x.restore();
}
function menus(x, g) {
  for (const m of MENUS) {
    if (g < m.g0 || g >= m.g1) continue;
    if (m.kind === 'fight') {
      textBox(x, ['What will', 'REMY do?'], false);
      box(x, 320, 264, 320, 96);
      const opts = [['FIGHT', 360, 288], ['REMYS', 504, 288], ['PACK', 360, 320], ['RUN', 504, 320]];
      for (const [s, a, b] of opts) text(x, s, a, b, { shadow: '#c8c8d8' });
      const press = g >= B.press1 && g < B.press1 + 0.05;
      arrowR(x, 340, 290, press ? '#d83838' : GB.ink);
      return true;
    }
    // moves
    textBox(x, ['', ''], false);
    const cur = m.cursor(g), mv = MOVES[cur];
    box(x, 0, 136, 256, 92);
    text(x, 'TYPE/', 20, 152);
    text(x, mv.type, 52, 176, { color: cur === 3 ? '#d83878' : GB.ink });
    const usedPP = m === MENUS[2] && cur === 0 ? 1 : 0;
    text(x, `${String(mv.pp - usedPP).padStart(2)}/${String(mv.pp).padStart(2)}`, 236, 200, { align: 'right' });
    box(x, 176, 216, 464, 144);
    MOVES.forEach((mm, i) => text(x, mm.name, 224, 238 + i * 28, { shadow: '#c8c8d8' }));
    const press = (g >= B.press2 && g < B.press2 + 0.05 && m === MENUS[1]) || (g >= B.press3 && g < B.press3 + 0.05 && m === MENUS[2]);
    arrowR(x, 200, 240 + cur * 28, press ? '#d83838' : GB.ink);
    return true;
  }
  return false;
}
function messages(x, g) {
  let cur = null;
  for (const m of MSGS) if (g >= m.g) cur = m;
  // a menu after the message hides it
  if (cur && MENUS.some((mm) => mm.g0 > cur.g && g >= mm.g0)) cur = null;
  if (!cur) { textBox(x, ['', ''], false); return; }
  const next = MSGS.find((m) => m.g > cur.g);
  const done = g >= msgEnd(cur) + 0.06, wait = done && (!next || next.g - g > 0.12) && Math.floor(g / 0.15) % 2 === 0;
  textBox(x, typed(cur, g), wait);
}
function popups(x, g) {
  const pops = [
    [B.expFill[0], 480, 160, '+1337 EXP', GB.exp],
    [B.lvUp, HERO_X, 112, 'LEVEL UP!', '#d83838'],
  ];
  for (const [t, px, py, s, col] of pops) {
    const a = g - t;
    if (a < 0 || a > 0.7) continue;
    const pop = a < 0.08 ? 1 + 0.6 * (1 - a / 0.08) : 1;
    const sz = 16, py2 = py - 30 * Math.sqrt(a / 0.7) - 4 * (pop - 1), al = clamp01((0.7 - a) / 0.15);
    for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2]]) text(x, s, px + ox, py2 + oy, { size: sz, color: GB.ink, align: 'center', alpha: al });
    text(x, s, px, py2, { size: sz, color: a < 0.06 ? '#ffffff' : col, align: 'center', alpha: al });
  }
  // level-up sparkles rising around REMY
  const la = g - B.lvUp;
  if (la >= 0 && la < 0.65) for (let i = 0; i < 10; i++) {
    const sx = HERO_X - 60 + hash(i * 3) * 120, sy = 240 - la * (120 + 80 * hash(i)) - hash(i * 5) * 40;
    const r = Math.round(3 * Math.max(0, Math.sin(la * 14 + i)));
    if (r > 0) star4(x, Math.round(sx), Math.round(sy), r, i % 2 ? '#fff070' : '#ffffff');
  }
}

export function drawBattle(lt) {
  const { g, stop, sl } = warp(lt);
  const ft = BATTLE0 + lt;
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.fillStyle = GB.paper; x.fillRect(0, 0, LW, LH);
  const [shx, shy] = shake(ft);
  x.save();
  x.translate(shx, shy);
  x.drawImage(ART.bg, 0, 0);
  if (shx || shy) { x.drawImage(ART.bg, 0, 0, LW, 4, 0, -12, LW, 12); }
  drawFoe(x, g, stop, sl);
  drawHeroSide(x, g, stop, sl, ft);
  drawAttackFx(x, g, stop, sl);
  foeBox(x, g);
  heroBox(x, g);
  popups(x, g);
  x.restore();
  // HEAD SHINE: the screen washes white twice
  if (g >= B.shineFlash[0] && g < B.shineFlash[1]) {
    const k = Math.floor((g - B.shineFlash[0]) / 0.035);
    if (k % 2 === 0) { x.fillStyle = 'rgba(255,252,230,0.92)'; x.fillRect(0, 0, LW, 264); }
  }
  // SUPER SHAMPOO impact: Gen-1 palette inversion during the hit-stop
  if (stop?.kind === 'impact' && Math.floor(sl / 0.04) % 2 === 0) {
    x.save(); x.globalCompositeOperation = 'difference'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, LW, 264); x.restore();
  }
  if (!menus(x, g)) messages(x, g);
  // entry: from the swirl's black, the field lights up
  const e = clamp01(lt / 0.1);
  if (e < 1) { x.fillStyle = `rgba(8,8,16,${1 - e})`; x.fillRect(0, 0, LW, LH); }
  // exit: fade to white for the evolution
  const endLt = filmT(B.end) - BATTLE0;
  const wf = clamp01((lt - (endLt - 0.14)) / 0.14);
  if (wf > 0) { x.fillStyle = `rgba(8,8,24,${wf})`; x.fillRect(0, 0, LW, LH); }
  return { low: ART.low, g, stop };
}

// ====================================================================================================
// EVOLUTION + END CARD
// ====================================================================================================
export function drawEvolution(e) {
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  if (e >= EV.end) return drawEnd(x, e - EV.end);
  const build = seg(e, EV.flick[0], EV.reveal), after = e - EV.reveal;
  // night field with rotating light wedges
  const g = x.createRadialGradient(320, 140, 10, 320, 140, 420);
  g.addColorStop(0, after > 0 ? '#4060c0' : '#283880'); g.addColorStop(0.5, '#182058'); g.addColorStop(1, '#080c28');
  x.fillStyle = g; x.fillRect(0, 0, LW, LH);
  x.save();
  x.globalAlpha = 0.07 + 0.16 * build + (after > 0 ? 0.12 * Math.exp(-after * 3) : 0);
  x.fillStyle = after > 0 ? '#fff8c0' : '#a8c8ff';
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * 6.283 + e * (0.6 + build * 2), a1 = a0 + 0.16;
    x.beginPath(); x.moveTo(320, 140); x.lineTo(320 + Math.cos(a0) * 800, 140 + Math.sin(a0) * 800); x.lineTo(320 + Math.cos(a1) * 800, 140 + Math.sin(a1) * 800); x.fill();
  }
  x.restore();
  // dither the rays into pixels: a coarse checker mask
  // rising light motes
  for (let i = 0; i < 40; i++) {
    const sp = 40 + 80 * hash(i * 3), y0 = hash(i * 7) * 400;
    const yy = 300 - ((y0 + e * sp * (1 + build * 2)) % 320), xx = hash(i * 11) * LW + Math.sin(e * 3 + i) * 10;
    const r = 1 + Math.floor(hash(i * 13) * 2);
    x.globalAlpha = 0.5 + 0.5 * Math.sin(e * 8 + i);
    fill(x, i % 3 ? '#c8e0ff' : '#fff8c0', xx, yy, r * 2, r * 2);
  }
  x.globalAlpha = 1;
  // the sprite: REMY → flicker of silhouettes → SABEREMY
  const feet = 256, cx = 320;
  const form = evoForm(e);
  const bob = Math.floor(e / 0.4) % 2 ? 2 : 0;
  if (e < EV.flick[0]) {
    drawBack(x, ART.heroNear2, cx, feet + bob);
  } else if (after < 0) {
    const img = form ? ART.evoNear2W : ART.heroNear2W;
    // glow halo behind the silhouette
    x.save(); x.globalAlpha = 0.25 + 0.35 * build;
    const glow = form ? ART.evoNear2G : ART.heroNear2G;
    for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) drawBack(x, glow, cx + dx, feet + dy);
    x.restore();
    drawBack(x, img, cx, feet);
    // pinch: colour bleeds back into REMY early in the build
    if (!form && build < 0.3) drawBack(x, ART.heroNear2, cx, feet, { alpha: 1 - build / 0.3 });
  } else {
    const s = Math.exp(-after * 8) * Math.sin(after * 26);
    drawBack(x, ART.evoNear2, cx, feet + bob * (after > 0.4 ? 1 : 0), { sx: 1 - 0.05 * s, sy: 1 + 0.07 * s });
    if (after < 0.2) drawBack(x, ART.evoNear2W, cx, feet, { alpha: 1 - after / 0.2 });
    // sparkle ring + saber glints
    if (after < 0.7) for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.283 + after * 2, d = 40 + 220 * Math.sqrt(after / 0.7);
      star4(x, Math.round(cx + Math.cos(a) * d), Math.round(140 + Math.sin(a) * d * 0.7), Math.round(5 * (1 - after / 0.7)) + 1, i % 2 ? '#fff070' : '#ffffff');
    }
    const tw = Math.sin(after * 12);
    if (tw > 0.2) star4(x, cx - 66, 112, Math.round(tw * 6), '#ffd0d0');
  }
  // text
  let cur = null;
  for (const m of EVO_MSGS) if (e >= m.g) cur = m;
  if (cur) textBox(x, typed(cur, e), e >= msgEnd(cur) + 0.06 && Math.floor(e / 0.15) % 2 === 0);
  else textBox(x, ['', ''], false);
  // fade in from the battle's dark
  const fi = clamp01(e / 0.12);
  if (fi < 1) { x.fillStyle = `rgba(8,8,24,${1 - fi})`; x.fillRect(0, 0, LW, LH); }
  return ART.low;
}

function drawEnd(x, a) {
  titleBg(x, a + 1.2);
  // SABEREMY centre stage with the defeated Cabald around, knocked flat
  const hop = a < 0.3 ? -Math.abs(Math.sin((a / 0.3) * Math.PI)) * 18 : 0;
  for (let i = 0; i < 4; i++) {
    const R = ART.titleFoes[i], px = [90, 190, 450, 550][i];
    drawRemy(x, R, px, 330, { sy: 0.32, sx: 1.25, alpha: 0.95 });
    if (Math.sin(a * 10 + i * 2) > 0) star4(x, px + 10, 300, 2, '#ffffff');
  }
  drawRemy(x, ART.evoNear, 320, 322 + hop, { sy: 1 + (a < 0.3 ? 0.05 * Math.sin((a / 0.3) * Math.PI * 2) : 0) });
  const d = a < 0.2 ? -160 * (1 - (a / 0.2) ** 2) : 6 * Math.exp(-(a - 0.2) * 14) * Math.sin((a - 0.2) * 40);
  logo(x, 320, 70 + d, 0.8, (a - 0.25) / 0.3);
  const s = "GOTTA GROW 'EM ALL!";
  const n = Math.floor(clamp01((a - 0.12) / 0.3) * s.length);
  for (let i = 0; i < n; i++) {
    const ca = a - 0.12 - (i / s.length) * 0.3;
    const dy = ca < 0.12 ? -10 * Math.sin((ca / 0.12) * Math.PI) : 0;
    const col = ['#fff8a0', '#ffffff', '#ffb0c8', '#a8e8ff'][Math.floor(a * 10 + i) % 4];
    text(x, s[i], 320 - (s.length * 16) / 2 + i * 16, 132 + dy, { color: ca < 0.2 ? '#ffffff' : col, shadow: '#181848' });
  }
  if (a > 0.45 && Math.floor(a / 0.14) % 2 === 0) text(x, 'THE END', 320, 168, { size: 8, color: '#f8f8f0', shadow: '#181848', align: 'center' });
  // white flash in, then fade out
  const fi = clamp01(a / 0.1);
  if (fi < 1) { x.fillStyle = `rgba(255,255,255,${1 - fi})`; x.fillRect(0, 0, LW, LH); }
  return ART.low;
}
