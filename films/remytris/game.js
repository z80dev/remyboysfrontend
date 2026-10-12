// REMYTRIS gameplay, drawn at a native 960×540 into a low-res canvas (film.js upscales it 2× nearest).
import { hash } from 'filmkit/lib.js';
import * as A from './art.js';
import {
  LW, LH, CELL, COLS, ROWS, FX, FY, INTRO, END_T, bt, beatAt, SHAPES, BOX, cellsOf, STEPS, boardAt, activeAt, queueAt,
  queueShiftT, holdAt, hud, EVENTS, CLEARS, LOCKS, bossHP, LEVELUP_B, GARBAGE, TETRIS_T, TETRIS_D, CLEAR_D, LAST, HOLDS, SCORE_FINAL,
} from './choreo.js';

export const FONT = '"Press Start 2P"';
export const ART = {};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const cellX = (c) => FX + c * CELL;
const cellY = (h) => FY + (ROWS - 1 - h) * CELL;
export const HERO = { x: 120, feet: 507, id: 42 };
export const BOSS = { x: 846, feet: 507, id: 1217 };
const ORDER = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export async function prepareGame() {
  ART.hero = await A.loadRemy(HERO.id, false);
  ART.boss = await A.loadRemy(BOSS.id, false);
  ART.dancers = [];
  for (const id of [5, 0, 233, 98, 419, 183]) ART.dancers.push(await A.loadRemy(id, true));
  const heads = await A.loadHeads();
  ART.heads = heads;
  Object.assign(ART, A.atlasVariants(heads));
  ART.heroHead2 = A.headIcon(heads, HERO.id, 2);
  ART.bossHead = A.headIcon(heads, BOSS.id, 1);
  ART.tiles = {};
  ART.mini = {};
  ART.small = {};
  ART.logo = {};
  for (const t of [...ORDER, 'G']) {
    ART.tiles[t] = A.tile(t, 24);
    ART.mini[t] = A.miniTile(t, 16);
    ART.small[t] = A.miniTile(t, 12);
    ART.logo[t] = A.miniTile(t, 14);
  }
  ART.sky = A.sky(LW, LH);
  ART.skyline = A.skyline(LW, 230);
  ART.ground = A.snowGround(LW, 40);
  ART.frame = A.frame(COLS * CELL + 16, ROWS * CELL + 16, 8);
  ART.holdBox = A.panel(116, 92);
  ART.statBox = A.panel(116, 150);
  ART.nextBox = A.panel(116, 268);
  ART.hpBox = A.panel(184, 46);
  ART.finials = [A.finial(A.DOMES[0]), A.finial(A.DOMES[1])];
  ART.low = A.canvas(LW, LH);
}

// ---------- helpers ----------
export const fill = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
export function text(x, s, a, b, { size = 16, color = '#fff', shadow = A.INK, align = 'left', alpha = 1, outline = null } = {}) {
  x.save();
  x.globalAlpha *= alpha;
  x.font = `${size}px ${FONT}`;
  x.textAlign = align;
  x.textBaseline = 'top';
  const k = Math.max(1, Math.round(size / 8));
  if (outline) {
    x.fillStyle = outline;
    for (const [dx, dy] of [[-k, 0], [k, 0], [0, -k], [0, k], [-k, -k], [k, k], [-k, k], [k, -k]]) x.fillText(s, Math.round(a + dx), Math.round(b + dy));
  }
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
const headSrc = (i) => [(i % 67) * 16, Math.floor(i / 67) * 16];
export function drawHead(x, id, X, Y, { k = 1, atlas = ART.heads, rot = 0, alpha = 1 } = {}) {
  const [sx, sy] = headSrc(id);
  x.save();
  x.globalAlpha *= alpha;
  if (rot) {
    x.translate(Math.round(X + 8 * k), Math.round(Y + 8 * k));
    x.rotate(Math.round(rot / (Math.PI / 8)) * (Math.PI / 8));
    x.drawImage(atlas, sx, sy, 16, 16, -8 * k, -8 * k, 16 * k, 16 * k);
  } else x.drawImage(atlas, sx, sy, 16, 16, Math.round(X), Math.round(Y), 16 * k, 16 * k);
  x.restore();
}
function drawCell(x, X, Y, cell, o = {}) {
  X = Math.round(X); Y = Math.round(Y);
  if (o.ghost) {
    const [base, hi] = A.TCOL[cell.t];
    x.globalAlpha = 0.55;
    fill(x, hi, X + 1, Y + 1, 22, 2); fill(x, hi, X + 1, Y + 21, 22, 2); fill(x, hi, X + 1, Y + 1, 2, 22); fill(x, hi, X + 21, Y + 1, 2, 22);
    x.globalAlpha = 0.16; fill(x, base, X + 3, Y + 3, 18, 18);
    x.globalAlpha = 1;
    return;
  }
  x.drawImage(ART.tiles[cell.t], X, Y);
  drawHead(x, cell.head, X + 4, Y + 4 + (o.bob ?? 0), { atlas: cell.t === 'G' ? ART.grey : ART.heads });
  if (o.white) { x.globalAlpha = o.white; fill(x, '#ffffff', X, Y, 24, 24); x.globalAlpha = 1; }
}
function drawPieceMini(x, p, cx, cy, tiles, s, alpha = 1) {
  const cells = SHAPES[p][0];
  const minC = Math.min(...cells.map((q) => q[1])), maxC = Math.max(...cells.map((q) => q[1]));
  const minR = Math.min(...cells.map((q) => q[0])), maxR = Math.max(...cells.map((q) => q[0]));
  const w = (maxC - minC + 1) * s, h = (maxR - minR + 1) * s;
  x.globalAlpha = alpha;
  for (const [r, c] of cells) x.drawImage(tiles[p], Math.round(cx - w / 2 + (c - minC) * s), Math.round(cy - h / 2 + (r - minR) * s));
  x.globalAlpha = 1;
}

// ---------- shakes / bounces ----------
const SHAKES = [];
for (const e of EVENTS) {
  if (e.kind === 'lock') SHAKES.push([e.t, 1.6]);
  if (e.kind === 'clear') SHAKES.push([e.t + 0.07, [0, 3, 4, 6, 12][e.n]]);
  if (e.kind === 'garbage') SHAKES.push([e.t, 6]);
  if (e.kind === 'levelup') SHAKES.push([e.t, 3]);
}
export function shakeAt(t) {
  let sx = 0, sy = 0;
  for (const [te, amp] of SHAKES) {
    const d = t - te;
    if (d < 0 || d > 0.45) continue;
    const k = amp * Math.exp(-d * 14);
    sx += k * Math.sin(d * 97 + te * 10);
    sy += k * Math.cos(d * 83 + te * 7);
  }
  return [Math.round(sx), Math.round(sy)];
}
// Field bounce: the well dips when a piece slams in.
function bounceAt(t) {
  let y = 0;
  for (const e of LOCKS) {
    const d = t - e.t;
    if (d < 0 || d > 0.25) continue;
    y += (e.kind === 'lock' ? 4 : 2) * Math.exp(-d * 20) * Math.cos(d * 40);
  }
  return Math.round(y);
}

// ---------- background ----------
function drawAurora(x, t, lvl5, boost) {
  const sets = lvl5
    ? [['#ff5ad8', '#8a6aff'], ['#5ad8ff', '#ff8ad8']]
    : [['#3affb0', '#3ac8ff'], ['#b4ff6a', '#3affb0']];
  for (let k = 0; k < 2; k++) {
    const [c0, c1] = sets[k];
    for (let xx = 0; xx < LW; xx += 4) {
      const yc = 96 + k * 40 + 24 * Math.sin(xx * 0.007 + t * 0.32 + k * 2) + 12 * Math.sin(xx * 0.019 - t * 0.55 + k);
      const hgt = 56 + 24 * Math.sin(xx * 0.011 + t * 0.4 + k * 3);
      const ray = 0.55 + 0.45 * Math.sin(xx * 0.21 + t * 1.6 + k * 4) * Math.sin(xx * 0.05 - t * 0.7);
      const a0 = (0.13 + 0.12 * boost) * ray * (0.7 + 0.3 * Math.sin(xx * 0.004 + t * 0.2 + k));
      if (a0 <= 0.01) continue;
      for (let s = 0; s < 4; s++) {
        x.globalAlpha = a0 * (1 - s * 0.24);
        x.fillStyle = s < 2 ? c0 : c1;
        x.fillRect(xx, Math.round(yc - (s + 1) * hgt / 4), 4, Math.round(hgt / 4));
      }
    }
  }
  x.globalAlpha = 1;
}
export function drawBackdrop(x, t, { lvl5 = false, boost = 0, skylineY = 276 } = {}) {
  x.drawImage(ART.sky, 0, 0);
  for (let i = 0; i < 120; i++) {
    const sx = Math.floor(hash(i) * LW), sy = Math.floor(hash(i + 500) * 300);
    const tw = Math.sin(t * (3 + hash(i + 9) * 4) + i) > 0.5;
    fill(x, tw ? '#ffffff' : '#8a7ac8', sx, sy, 1, 1);
    if (tw && i % 7 === 0) { fill(x, '#ffffff', sx - 1, sy, 3, 1); fill(x, '#ffffff', sx, sy - 1, 1, 3); }
  }
  // moon
  x.fillStyle = '#fff6d8'; x.beginPath(); x.arc(196, 70, 18, 0, 7); x.fill();
  x.fillStyle = '#e8dcb0'; x.beginPath(); x.arc(190, 66, 4, 0, 7); x.fill(); x.beginPath(); x.arc(202, 78, 3, 0, 7); x.fill();
  drawAurora(x, t, lvl5, boost);
  x.drawImage(ART.skyline, 0, skylineY);
  x.drawImage(ART.ground, 0, LH - 40);
}
export function drawSnow(x, t, n = 90, front = false) {
  for (let i = 0; i < n; i++) {
    const sp = 30 + hash(i + 70) * 40 + (front ? 30 : 0);
    const y = ((hash(i + 71) * (LH + 20) + t * sp) % (LH + 20)) - 10;
    const xx = ((hash(i + 72) * LW + t * 14 + Math.sin(t * 1.3 + i) * 8) % LW + LW) % LW;
    x.globalAlpha = front ? 0.9 : 0.6;
    fill(x, '#ffffff', xx, y, front && i % 3 === 0 ? 2 : 1, front && i % 3 === 0 ? 2 : 1);
  }
  x.globalAlpha = 1;
}

// ---------- particles (analytic, pure in t) ----------
const PARTS = [];
const ev = (t, kind, xx, y, extra = {}) => PARTS.push({ t, kind, x: xx, y, seed: PARTS.length * 13 + 7, ...extra });
const POPS = []; // heads popping out of cleared rows: { t, x, y, head, tile, big, dir }
for (const s of STEPS) {
  const low = Math.min(...s.cells.map(([h]) => h));
  const bottoms = s.cells.filter(([h]) => h === low);
  const xs = bottoms.map(([, c]) => c);
  const l = cellX(Math.min(...xs)), r = cellX(Math.max(...xs)) + CELL, y = cellY(low) + CELL;
  if (!s.soft) {
    ev(s.tl, 'dust', l, y, { dir: -1 }); ev(s.tl, 'dust', r, y, { dir: 1 });
    ev(s.tl, 'trail', 0, 0, { step: s });
  } else ev(s.tl, 'dust', (l + r) / 2, y, { dir: 0, small: true });
  if (!s.full.length) continue;
  const n = s.full.length, big = n === 4;
  for (const h of s.full) {
    for (let c = 0; c < COLS; c++) {
      const cell = s.placed[h][c];
      const delay = big ? 0.15 + (9 - c) * 0.05 + s.full.indexOf(h) * 0.03 : 0.07 + Math.abs(c - 4.5) * 0.028;
      POPS.push({ t: s.tl + delay, step: s, x: cellX(c), y: cellY(h), cell, big, dir: c < 4.5 ? -1 : 1, k: POPS.length });
    }
    ev(s.tl, 'rowflash', FX, cellY(h), { n, big });
  }
  ev(s.tl, 'label', FX + COLS * CELL / 2, cellY(Math.max(...s.full)) - 10, { n, pts: CLEARS.find((e) => e.step === s).pts });
}
for (const p of POPS) { ev(p.t, 'pop', p.x + 12, p.y + 12, { big: p.big }); }
ev(TETRIS_T, 'burst', FX + 120, cellY(1), {});
ev(TETRIS_T + 0.12, 'rings', FX + 120, cellY(1), {});

function drawParticles(x, t) {
  for (const p of PARTS) {
    const age = t - p.t;
    if (age < 0 || age > 2) continue;
    const r = (k) => hash(p.seed * 31 + k);
    switch (p.kind) {
      case 'dust': {
        if (age > 0.38) break;
        const u = age / 0.38, n = p.small ? 3 : 5;
        for (let i = 0; i < n; i++) {
          const dir = p.dir || (i % 2 ? 1 : -1);
          const px = p.x + dir * (6 + 46 * u * (0.5 + r(i))), py = p.y - 2 - 14 * u * r(i + 5);
          x.globalAlpha = 0.9 * (1 - u);
          x.fillStyle = u < 0.4 ? '#ffffff' : '#c8d4f4';
          x.beginPath(); x.arc(Math.round(px), Math.round(py), Math.round((2 + 4 * u) * (p.small ? 0.7 : 1)), 0, 7); x.fill();
        }
        x.globalAlpha = 1;
        break;
      }
      case 'trail': {
        if (age > 0.16) break;
        const s = p.step, u = age / 0.16;
        const cols = new Map();
        for (const [h, c] of s.cells) cols.set(c, Math.max(cols.get(c) ?? -1, h));
        for (const [c, h] of cols) {
          const top = cellY(19) - 4, bot = cellY(h);
          const g = x.createLinearGradient(0, top, 0, bot);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(1, A.TCOL[s.p][1]);
          x.globalAlpha = 0.75 * (1 - u);
          x.fillStyle = g;
          x.fillRect(cellX(c) + 3 + Math.round(u * 4), top, CELL - 6 - Math.round(u * 8), bot - top);
        }
        x.globalAlpha = 1;
        break;
      }
      case 'rowflash': {
        if (age > (p.big ? 0.5 : 0.2)) break;
        const u = age / (p.big ? 0.5 : 0.2);
        x.globalAlpha = 0.6 * (1 - u);
        fill(x, '#ffffff', FX - 30 * u, p.y + 12 - 14 * (1 - u * 0.7), COLS * CELL + 60 * u, 28 * (1 - u * 0.7));
        x.globalAlpha = 1;
        break;
      }
      case 'pop': {
        if (age > 0.3) break;
        const u = age / 0.3, n = p.big ? 8 : 6;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.283 + r(1), d = (p.big ? 30 : 20) * Math.sqrt(u);
          star4(x, Math.round(p.x + Math.cos(a) * d), Math.round(p.y + Math.sin(a) * d), Math.round(3 * (1 - u)) + 1, i % 2 ? '#fff6a0' : '#ffffff');
        }
        if (age < 0.05) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(p.x, p.y, p.big ? 15 : 11, 0, 7); x.fill(); }
        break;
      }
      case 'burst': {
        if (age > 0.7) break;
        const u = age / 0.7;
        x.save(); x.globalAlpha = 1 - u;
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * 6.283 + u * 0.4, d0 = 30 + 420 * u, d1 = d0 + 40 + 60 * (1 - u);
          x.strokeStyle = ['#ffe27a', '#ffffff', '#ff8ad8', '#8ae8ff'][i % 4]; x.lineWidth = 3;
          x.beginPath(); x.moveTo(p.x + Math.cos(a) * d0, p.y + Math.sin(a) * d0); x.lineTo(p.x + Math.cos(a) * d1, p.y + Math.sin(a) * d1); x.stroke();
        }
        x.restore();
        break;
      }
      case 'rings': {
        for (let k = 0; k < 3; k++) {
          const a2 = age - k * 0.12;
          if (a2 < 0 || a2 > 0.5) continue;
          const u = a2 / 0.5;
          x.globalAlpha = 1 - u; x.strokeStyle = ['#ffffff', '#ffe27a', '#ff8ad8'][k]; x.lineWidth = 3;
          x.beginPath(); x.ellipse(p.x, p.y, 20 + 300 * u, 8 + 120 * u, 0, 0, 7); x.stroke();
        }
        x.globalAlpha = 1;
        break;
      }
      case 'label': {
        if (p.n === 4 || age > 0.9) break;
        const u = age / 0.9;
        const s = ['', 'SINGLE', 'DOUBLE', 'TRIPLE'][p.n];
        const sc = age < 0.08 ? 1.6 - 0.6 * (age / 0.08) : 1;
        x.save();
        x.translate(Math.round(p.x), Math.round(p.y - 24 * Math.sqrt(u)));
        x.scale(sc, sc);
        const col = ['#fff', '#8ae8ff', '#ffe27a', '#ff8ad8'][p.n];
        text(x, s, 0, -8, { size: 16, align: 'center', color: Math.floor(age * 20) % 2 && age < 0.3 ? '#ffffff' : col, alpha: clamp01((0.9 - age) / 0.2), outline: A.INK });
        text(x, '+' + p.pts, 0, 14, { size: 8, align: 'center', color: '#ffffff', alpha: clamp01((0.9 - age) / 0.2), outline: A.INK });
        x.restore();
        break;
      }
    }
  }
}
// Heads launched out of cleared rows (drawn above the frame so they fly over everything).
function drawPops(x, t) {
  for (const p of POPS) {
    const a = t - p.t;
    if (a < 0 || a > 1.6) continue;
    const r = (k) => hash(p.k * 17 + k);
    const vx = p.dir * (40 + 90 * r(1)) * (p.big ? 1.8 : 1), vy = -(220 + 160 * r(2)) * (p.big ? 1.35 : 1);
    const px = p.x + 12 + vx * a, py = p.y + 12 + vy * a + 0.5 * 1100 * a * a;
    if (py > LH + 40) continue;
    const k = p.big ? 2 : 1;
    // tile shards
    if (a < 0.5) {
      const col = A.TCOL[p.cell.t];
      for (let i = 0; i < 4; i++) {
        const sx = p.x + 12 + (i % 2 ? 1 : -1) * (30 + 50 * r(i + 4)) * a, sy = p.y + 12 + (-120 - 80 * r(i + 8)) * a + 0.5 * 1400 * a * a;
        x.globalAlpha = 1 - a / 0.5;
        fill(x, A.INK, sx - 3, sy - 3, 6, 6); fill(x, col[i % 2 ? 0 : 1], sx - 2, sy - 2, 4, 4);
      }
      x.globalAlpha = 1;
    }
    drawHead(x, p.cell.head, px - 8 * k, py - 8 * k, { k, rot: a * (p.dir * (8 + 6 * r(3))), atlas: a < 0.06 ? ART.white : p.cell.t === 'G' ? ART.grey : ART.heads });
  }
}

// ---------- board ----------
function drawBoard(x, t) {
  const { board, clearing, rise } = boardAt(t);
  const beat = beatAt(t);
  const bob = (h, c) => {
    const f = beat - Math.floor(beat);
    return f < 0.18 && (c + h + Math.floor(beat)) % 2 === 0 ? -1 : 0;
  };
  const riseOff = rise > 0 && rise < 1 ? Math.round((1 - (1 - (1 - rise) ** 2)) * GARBAGE.rows * CELL) : 0;
  let fullSet = null, lt = 0, shiftOf = null, collapse = 0;
  if (clearing) {
    fullSet = new Set(clearing.full);
    lt = t - clearing.tl;
    const big = clearing.full.length === 4;
    const c0 = big ? 9 : CLEAR_D - 0.1;
    collapse = clamp01((lt - c0) / 0.1);
    shiftOf = (h) => clearing.full.filter((f) => f < h).length;
  }
  for (let h = 0; h < 22; h++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[h][c];
      if (!cell) continue;
      let X = cellX(c), Y = cellY(h) + riseOff;
      let white = 0;
      if (cell.born > -1 && t - cell.born < 0.12) white = 0.85 * (1 - (t - cell.born) / 0.12);
      if (clearing) {
        if (fullSet.has(h)) {
          const pop = POPS.find((p) => p.step === clearing && p.y === cellY(h) && p.x === cellX(c));
          if (pop && t >= pop.t) continue;
          const big = clearing.full.length === 4;
          const fl = big ? 0.15 : 0.07;
          white = lt < fl ? 1 : big ? 0.35 + 0.35 * Math.sin(lt * 40 + c) : 0.6;
          if (big && lt >= fl) {
            // rainbow strobe across the TETRIS rows
            drawCell(x, X, Y, cell);
            x.globalAlpha = 0.45; fill(x, ['#ff5a8a', '#ffe27a', '#5ad8ff', '#b4ff6a'][(Math.floor(lt * 20) + c + h) % 4], X + 1, Y + 1, 22, 22); x.globalAlpha = 1;
            continue;
          }
        } else if (collapse > 0) {
          const n = shiftOf(h);
          const u = collapse;
          Y += n * CELL * (u * u) - (u >= 1 ? 0 : 0);
        }
      }
      drawCell(x, X, Y, cell, { white, bob: clearing ? 0 : bob(h, c) });
    }
  }
  // garbage rise: warning glow from the floor
  if (rise > 0 && rise < 1) {
    x.globalAlpha = 0.5 * (1 - rise);
    fill(x, '#ff2a4a', FX, FY + ROWS * CELL - 2 * CELL, COLS * CELL, 2 * CELL);
    x.globalAlpha = 1;
  }
}

function drawActive(x, t) {
  const a = activeAt(t);
  if (!a) return null;
  const tu = a.turn;
  const spawnPop = clamp01(a.lt / 0.07);
  // ghost
  if (!a.held && (!a.drop || a.drop.kind !== 'hard')) {
    for (const [h, c] of cellsOf(a.p, a.rot, a.bx, a.ghost)) if (h < ROWS) drawCell(x, cellX(c), cellY(h), { t: a.p }, { ghost: true });
  }
  const cells = cellsOf(a.p, a.rot, a.bx, 0);
  const box = BOX[a.p];
  const step = STEPS.find((s) => s.turn === a.i);
  const heads = step ? step.placed : null;
  const yTopPx = cellY(a.y);
  // rotation and shift tweens around the box centre
  const ru = clamp01(a.rotAge / 0.06), su = clamp01(a.shiftAge / 0.035);
  const ox = -a.shiftDir * CELL * (1 - su) * 0.6;
  const bcx = cellX(a.bx) + box * CELL / 2 + ox, bcy = yTopPx + box * CELL / 2;
  x.save();
  x.translate(bcx, bcy);
  if (ru < 1) x.rotate(-a.rotDir * (Math.PI / 2) * (1 - ru) * (1 - ru));
  const sc = 0.7 + 0.3 * spawnPop;
  x.scale(sc, sc);
  // hard-drop motion stretch
  if (a.drop?.kind === 'hard') x.scale(0.92, 1.12);
  cells.forEach(([dh, c], k) => {
    const X = cellX(c) - (cellX(a.bx) + box * CELL / 2), Y = cellY(dh) - cellY(0) + yTopPx - (yTopPx + box * CELL / 2);
    let head = 0;
    if (heads) {
      const [hh, cc] = step.cells[k];
      head = heads[hh][cc].head;
    } else head = [5, 23, 48, 73][k];
    const glow = tu.fromHold ? 0.25 + 0.25 * Math.sin(t * 30) : 0;
    drawCell(x, X, Y + (yTopPx - cellY(0)) * 0, { t: a.p, head }, { white: glow });
  });
  x.restore();
  return a;
}

// ---------- side panels ----------
function drawHold(x, t) {
  const X = 224, Y = 36;
  x.globalAlpha = 0.82; fill(x, '#0c0820', X + 2, Y + 2, 112, 88); x.globalAlpha = 1;
  x.drawImage(ART.holdBox, X, Y);
  text(x, 'HOLD', X + 58, Y + 8, { size: 8, align: 'center', color: '#ffd34a' });
  const { p, since } = holdAt(t);
  if (!p) return;
  const age = t - since;
  const pop = age < 0.1 ? 1.4 - 0.4 * (age / 0.1) : 1;
  const ready = p === 'I' && t < bt(20.6);
  if (ready) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 9);
    x.globalAlpha = 0.25 + 0.25 * pulse; fill(x, '#8ae8ff', X + 8, Y + 24, 100, 58); x.globalAlpha = 1;
  }
  x.save(); x.translate(X + 58, Y + 52); x.scale(pop, pop);
  drawPieceMini(x, p, 0, 0, ART.mini, 16);
  x.restore();
  if (age < 0.15) { x.globalAlpha = 1 - age / 0.15; fill(x, '#ffffff', X + 4, Y + 4, 108, 84); x.globalAlpha = 1; }
}
function drawNext(x, t) {
  const X = 620, Y = 36;
  x.globalAlpha = 0.82; fill(x, '#0c0820', X + 2, Y + 2, 112, 264); x.globalAlpha = 1;
  x.drawImage(ART.nextBox, X, Y);
  text(x, 'NEXT', X + 58, Y + 8, { size: 8, align: 'center', color: '#ffd34a' });
  const q = queueAt(t);
  let last = -9;
  for (const s of queueShiftT) if (t >= s) last = s;
  const u = clamp01((t - last) / 0.09), slide = (1 - u) * (1 - u);
  const slots = [[Y + 52, 16], [Y + 112, 12], [Y + 158, 12], [Y + 204, 12], [Y + 246, 12]];
  q.forEach((p, i) => {
    const [cy, s] = slots[i];
    const ny = i + 1 < slots.length ? slots[i + 1][0] : cy + 44;
    const yy = cy + (ny - cy) * slide;
    drawPieceMini(x, p, X + 58, yy, s === 16 ? ART.mini : ART.small, s, i === 4 ? 1 - slide : 1);
  });
  fill(x, '#a8182a', X + 12, Y + 84, 92, 1);
}
function drawStats(x, t) {
  const X = 224, Y = 140;
  x.globalAlpha = 0.82; fill(x, '#0c0820', X + 2, Y + 2, 112, 146); x.globalAlpha = 1;
  x.drawImage(ART.statBox, X, Y);
  const H = hud(t);
  const lvAge = t - bt(LEVELUP_B);
  text(x, 'SCORE', X + 10, Y + 12, { size: 8, color: '#ffd34a' });
  text(x, String(H.score).padStart(7, '0'), X + 58, Y + 26, { size: 12, align: 'center', color: H.roll ? '#fff6a0' : '#ffffff' });
  text(x, 'LINES', X + 10, Y + 54, { size: 8, color: '#ffd34a' });
  text(x, String(H.lines).padStart(3, '0'), X + 58, Y + 68, { size: 16, align: 'center' });
  text(x, 'LEVEL', X + 10, Y + 98, { size: 8, color: '#ffd34a' });
  const flash = lvAge > 0 && lvAge < 0.8 && Math.floor(lvAge * 14) % 2 === 0;
  const pop = lvAge > 0 && lvAge < 0.12 ? 1.6 - 0.6 * (lvAge / 0.12) : 1;
  x.save(); x.translate(X + 58, Y + 120); x.scale(pop, pop);
  text(x, String(H.level).padStart(2, '0'), 0, -8, { size: 16, align: 'center', color: flash ? '#ff8ad8' : '#ffffff' });
  x.restore();
}

// ---------- characters ----------
const CLR_T = CLEARS.map((e) => [e.t, e.n]);
function hop(t, t0, hgt, d) { const u = (t - t0) / d; return u >= 0 && u < 1 ? hgt * 4 * u * (1 - u) : 0; }
function drawHero(x, t) {
  const R = ART.hero, beat = beatAt(t);
  const fb = beat - Math.floor(beat);
  let y = HERO.feet, lean = 0, sx = 2, sy = 2, glow = null, glowA = 0, white = false, lift = [0, 0], dx = 0;
  // dance on the beat: alternate little steps
  const step = Math.floor(beat) % 2;
  lift = fb < 0.35 ? (step ? [3, 0] : [0, 3]) : [0, 0];
  sy = 2 * (1 - 0.03 * Math.max(0, Math.cos(fb * Math.PI * 2)));
  // cheer hops on clears
  for (const [tc, n] of CLR_T) {
    const hgt = [0, 14, 22, 30, 64][n], d = n === 4 ? 0.55 : 0.36;
    y -= hop(t, tc + 0.05, hgt, d);
    const land = t - (tc + 0.05 + d);
    if (land >= 0 && land < 0.1) { const s = Math.sin((land / 0.1) * Math.PI); sy *= 1 - 0.12 * s; sx *= 1 + 0.1 * s; }
    if (t > tc && t < tc + d) { lift = [6, 6]; glow = n >= 3 ? '#ffe27a' : null; glowA = 0.8; }
  }
  // garbage: recoil
  const tg = bt(GARBAGE.hit), dg = t - tg;
  if (dg >= 0 && dg < 0.5) { dx = -8 * Math.exp(-dg * 6) * Math.cos(dg * 30); lean = -0.08 * Math.exp(-dg * 5); white = dg < 0.05; }
  // the I is out: lean in, hair aglow
  const tI = bt(20.6);
  if (t >= tI && t < TETRIS_T) { lean = 0.08; sy *= 0.95; glow = '#8ae8ff'; glowA = 0.5 + 0.4 * Math.sin(t * 20); lift = [0, 0]; }
  // TETRIS celebration: big leap then beat-bouncing joy
  if (t >= TETRIS_T + 0.6) {
    y -= Math.abs(Math.sin((beat - beatAt(TETRIS_T + 0.6)) * Math.PI)) * 16;
    glow = '#ffe27a'; glowA = 0.6 + 0.3 * Math.sin(t * 16);
  }
  if (t >= TETRIS_T && t < TETRIS_T + 0.6) { glow = '#ffffff'; glowA = 1; }
  A.drawRemy(x, R, HERO.x + dx, y, { sx, sy, lean, lift, glow, glowA, white });
  // name plate
  fill(x, A.INK, HERO.x - 34, HERO.feet + 8, 68, 16); fill(x, '#a8182a', HERO.x - 33, HERO.feet + 9, 66, 14); fill(x, '#ffd34a', HERO.x - 33, HERO.feet + 9, 66, 1);
  text(x, 'REMY', HERO.x, HERO.feet + 12, { size: 8, align: 'center', color: '#fff6d8', shadow: null });
  // hair sparkles while glowing
  if (glow && t >= tI) for (let i = 0; i < 6; i++) {
    const ph = (t * 1.6 + i / 6) % 1;
    star4(x, Math.round(HERO.x - 40 + hash(i + Math.floor(t * 1.6 + i / 6) * 7) * 80), Math.round(y - 230 - ph * 40), Math.round(2 * (1 - ph)) + 1, '#ffffff');
  }
}
const KO_T = TETRIS_T + 0.2;
function drawBoss(x, t) {
  const R = ART.boss, beat = beatAt(t);
  const fb = beat - Math.floor(beat);
  let y = BOSS.feet, dx = 0, lean = 0, white = false, lift = [0, 0], sy = 2, sx = 2;
  sy = 2 * (1 - 0.03 * Math.max(0, Math.cos(fb * Math.PI * 2)));
  lift = fb < 0.35 ? (Math.floor(beat) % 2 ? [0, 3] : [3, 0]) : [0, 0];
  for (const [tc, n] of CLR_T) {
    const d = t - tc - 0.06;
    if (d >= 0 && d < 0.45 && n < 4) { dx += 12 * Math.exp(-d * 7) * (1 + n * 0.4); white = white || d < 0.06; lean = -0.1 * Math.exp(-d * 6); }
  }
  // throw: hop + lunge
  const tt = bt(GARBAGE.throw), d2 = t - tt;
  if (d2 > -0.25 && d2 < 0.35) { y -= hop(t, tt - 0.25, 20, 0.5); lean = d2 < 0 ? -0.06 : 0.1; }
  // laugh after the garbage lands
  const tg = bt(GARBAGE.hit), d3 = t - tg;
  if (d3 > 0 && d3 < 0.6) { y -= Math.abs(Math.sin(d3 * 28)) * 4; }
  // sweating before the TETRIS
  const tI = bt(20.6);
  if (t > tI && t < TETRIS_T) dx += Math.sin(t * 70) * 1.5;
  if (t >= KO_T) {
    // K.O.: launched off the rooftop, spinning
    const a = t - KO_T;
    const kx = BOSS.x + 160 * a, ky = BOSS.feet - (520 * a - 0.5 * 1500 * a * a);
    if (ky < LH + 300) A.drawRemy(x, R, kx, ky, { sx: 2, sy: 2, upside: a > 0.12, white: a < 0.08 || (a < 0.4 && Math.floor(a * 20) % 2 === 0), rot: a * 6, lift: [6, 6] });
  } else A.drawRemy(x, R, BOSS.x + dx, y, { sx, sy, lean, lift, white, flip: true });
  fill(x, A.INK, BOSS.x - 42, BOSS.feet + 8, 84, 16); fill(x, '#3b1d5e', BOSS.x - 41, BOSS.feet + 9, 82, 14); fill(x, '#b48aff', BOSS.x - 41, BOSS.feet + 9, 82, 1);
  text(x, 'CABALD', BOSS.x, BOSS.feet + 12, { size: 8, align: 'center', color: '#ffd0e0', shadow: null });
  // sweat drops
  if (t > tI && t < KO_T) for (let i = 0; i < 2; i++) {
    const ph = (t * 2.2 + i * 0.5) % 1;
    fill(x, '#8ae8ff', BOSS.x + (i ? 30 : -34), BOSS.feet - 214 + ph * 30, 3, 4);
  }
}
function drawHP(x, t) {
  const X = 754, Y = 160;
  x.globalAlpha = 0.85; fill(x, '#0c0820', X + 2, Y + 2, 180, 42); x.globalAlpha = 1;
  x.drawImage(ART.hpBox, X, Y);
  x.drawImage(ART.bossHead, X + 10, Y + 8);
  text(x, 'CABALD', X + 32, Y + 12, { size: 8, color: '#ffb0c8' });
  const hp = bossHP(t), hpLag = bossHP(t - 0.35);
  const bw = 160;
  fill(x, A.INK, X + 10, Y + 27, bw + 4, 10);
  fill(x, '#2a1030', X + 12, Y + 29, bw, 6);
  fill(x, '#ffffff', X + 12, Y + 29, Math.round((bw * hpLag) / 100), 6);
  const col = hp > 50 ? '#ff4a6a' : hp > 20 ? '#ffa03a' : '#ff2a2a';
  fill(x, col, X + 12, Y + 29, Math.round((bw * hp) / 100), 6);
  fill(x, '#ffd0d8', X + 12, Y + 29, Math.round((bw * hp) / 100), 1);
  if (t >= KO_T + 0.1) {
    const a = t - KO_T - 0.1, sc = a < 0.12 ? 3 - 2 * (a / 0.12) : 1;
    x.save(); x.translate(BOSS.x, 330); x.scale(sc, sc); x.rotate(-0.12);
    text(x, 'K.O.', 0, -16, { size: 32, align: 'center', color: Math.floor(a * 10) % 2 ? '#ffe27a' : '#ff4a6a', outline: A.INK });
    x.restore();
  }
}

// Speech bubbles (Cyrillic shouts, Press Start 2P covers them).
const BUBBLES = [
  { t: INTRO + 0.05, who: 'hero', s: 'ПОЕХАЛИ!' },
  { t: CLEARS[0].t + 0.05, who: 'hero', s: 'ДА!' },
  { t: HOLDS[0].t, who: 'hero', s: 'ПОТОМ...' },
  { t: CLEARS[1].t + 0.05, who: 'hero', s: 'ХОРОШО!' },
  { t: bt(GARBAGE.throw) - 0.2, who: 'boss', s: 'ХА-ХА!' },
  { t: bt(GARBAGE.hit) + 0.05, who: 'hero', s: 'ОЙ!' },
  { t: CLEARS[2].t + 0.05, who: 'hero', s: 'ОТЛИЧНО!' },
  { t: bt(20.6), who: 'boss', s: 'НЕТ...' },
  { t: TETRIS_T + 0.05, who: 'hero', s: 'УРА-А-А!' },
];
function drawBubbles(x, t) {
  for (let i = 0; i < BUBBLES.length; i++) {
    const b = BUBBLES[i];
    const nx = BUBBLES.slice(i + 1).find((o) => o.who === b.who);
    const end = Math.min(b.t + 0.85, nx ? nx.t : 99, b.who === 'boss' && t > KO_T ? KO_T : 99);
    if (t < b.t || t >= end) continue;
    const a = t - b.t;
    const sc = a < 0.08 ? 0.5 + 0.5 * (a / 0.08) : 1;
    const hero = b.who === 'hero';
    const cx = hero ? 118 : 846, by = hero ? 262 : 256;
    x.font = `8px ${FONT}`;
    const w = Math.max(40, b.s.length * 8 + 16), h = 22;
    x.save(); x.translate(cx, by); x.scale(sc, sc);
    fill(x, A.INK, -w / 2 - 1, -h - 1, w + 2, h + 2);
    fill(x, '#ffffff', -w / 2, -h, w, h);
    fill(x, '#d8d0ec', -w / 2, -3, w, 3);
    // tail
    for (let k = 0; k < 6; k++) fill(x, k === 5 ? A.INK : '#ffffff', (hero ? 10 : -10) - (hero ? k : -k) * 0.5, -1 + k, 6 - k, 1);
    text(x, b.s, 0, -h + 7, { size: 8, align: 'center', color: hero ? '#a8182a' : '#3b1d5e', shadow: null });
    x.restore();
  }
}

// Boss's garbage throw: a spinning bald head arcs from the boss into the well floor.
function drawThrow(x, t) {
  const t0 = bt(GARBAGE.throw), t1 = bt(GARBAGE.hit);
  if (t < t0 || t > t1) return;
  const u = (t - t0) / (t1 - t0);
  const sx = BOSS.x - 30, sy = 300, ex = FX + COLS * CELL - 30, ey = FY + ROWS * CELL - 30;
  const px = sx + (ex - sx) * u, py = sy + (ey - sy) * u - 180 * Math.sin(Math.PI * u);
  for (let k = 1; k <= 4; k++) {
    const uu = Math.max(0, u - k * 0.04);
    x.globalAlpha = 0.4 - k * 0.08;
    fill(x, '#ff4a6a', sx + (ex - sx) * uu - 4, sy + (ey - sy) * uu - 180 * Math.sin(Math.PI * uu) - 4, 8, 8);
  }
  x.globalAlpha = 1;
  drawHead(x, BOSS.id, px - 16, py - 16, { k: 2, rot: u * 12, atlas: ART.grey });
}
// Incoming-garbage meter on the left edge of the well.
function drawMeter(x, t) {
  const t0 = bt(GARBAGE.throw), t1 = bt(GARBAGE.hit);
  if (t < t0 - 0.1 || t > t1 + 0.1) return;
  const blink = Math.floor(t * 16) % 2;
  fill(x, blink ? '#ff2a4a' : '#ffd34a', FX - 6, FY + ROWS * CELL - 2 * CELL, 4, 2 * CELL);
}

// ---------- big overlays ----------
function drawGo(x, t) {
  const a = t - INTRO;
  if (a < 0.05 || a > 0.75) return;
  const sc = a < 0.17 ? 3 - 2 * ((a - 0.05) / 0.12) : 1;
  x.save(); x.translate(FX + 120, FY + 200); x.scale(sc, sc);
  text(x, 'GO!', 0, -16, { size: 32, align: 'center', color: Math.floor(a * 12) % 2 ? '#ffe27a' : '#ffffff', outline: A.INK, alpha: clamp01((0.75 - a) / 0.15) });
  x.restore();
}
function drawLevelUp(x, t) {
  const t0 = bt(LEVELUP_B), a = t - t0;
  if (a < 0 || a > 1.0) return;
  const sc = a < 0.1 ? 2.2 - 1.2 * (a / 0.1) : 1, al = clamp01((1.0 - a) / 0.2);
  // speed lines
  for (let i = 0; i < 14; i++) {
    const yy = FY + 40 + hash(i + 900) * 400, ln = 40 + hash(i + 901) * 80;
    const xx = FX + ((hash(i + 902) * 240 + a * 900) % 320) - 40;
    x.globalAlpha = 0.5 * al; fill(x, '#ffffff', xx, yy, ln, 1); x.globalAlpha = 1;
  }
  x.save(); x.translate(FX + 120, FY + 150); x.scale(sc, sc);
  text(x, 'LEVEL UP!', 0, -8, { size: 16, align: 'center', color: Math.floor(a * 14) % 2 ? '#ff8ad8' : '#ffffff', outline: A.INK, alpha: al });
  x.restore();
  if (a > 0.15) text(x, 'SPEED x1.5', FX + 120, FY + 176, { size: 8, align: 'center', color: '#8ae8ff', outline: A.INK, alpha: al });
}
function drawTetris(x, t) {
  const a = t - TETRIS_T;
  if (a < 0.1) return;
  const s = 'TETRIS!', cols = ['#ff4a4a', '#ffa03a', '#ffe23a', '#5ad84a', '#3ac8ff', '#5a6aff', '#c85aff'];
  const size = 32;
  const x0 = FX + 120 - (s.length * size) / 2;
  for (let i = 0; i < s.length; i++) {
    const ai = a - 0.1 - i * 0.04;
    if (ai < 0) continue;
    const sc = ai < 0.12 ? 3 - 2 * (ai / 0.12) : 1 + 0.06 * Math.sin(ai * 10 + i);
    const dy = Math.sin(t * 9 + i * 0.8) * 4;
    x.save(); x.translate(x0 + i * size + size / 2, FY + 170 + dy); x.scale(sc, sc);
    text(x, s[i], -size / 2, -size / 2, { size, color: ai < 0.08 ? '#ffffff' : cols[(i + Math.floor(t * 10)) % 7], outline: A.INK });
    x.restore();
  }
  if (a > 0.85) {
    const b = a - 0.85, sc = b < 0.1 ? 2 - (b / 0.1) : 1;
    x.save(); x.translate(FX + 120, FY + 236); x.scale(sc, sc);
    text(x, 'ALL CLEAR', 0, -8, { size: 16, align: 'center', color: Math.floor(t * 12) % 2 ? '#ffe27a' : '#ffffff', outline: A.INK });
    x.restore();
  }
  if (a > 0.35) {
    const pts = CLEARS[3].pts;
    text(x, '+' + pts, FX + 120, FY + 268 - Math.min(14, (a - 0.35) * 30), { size: 16, align: 'center', color: '#8ae8ff', outline: A.INK, alpha: clamp01((2.2 - a) / 0.3) });
  }
  // the emptied well glows
  if (a > 0.7) {
    const g = clamp01((a - 0.7) / 0.4) * (0.6 + 0.2 * Math.sin(t * 8));
    x.globalAlpha = g * 0.3;
    fill(x, '#ffe27a', FX, FY + ROWS * CELL - 120, COLS * CELL, 120);
    x.globalAlpha = 1;
  }
}
// Confetti of mini blocks raining after the TETRIS.
function drawConfetti(x, t) {
  const a = t - TETRIS_T - 0.1;
  if (a < 0) return;
  for (let i = 0; i < 70; i++) {
    const t0 = hash(i + 300) * 0.8;
    const aa = a - t0;
    if (aa < 0) continue;
    const xx = hash(i + 301) * LW + Math.sin(aa * 4 + i) * 20;
    const yy = -20 + aa * (140 + hash(i + 302) * 120);
    if (yy > LH) continue;
    const tp = ORDER[i % 7];
    x.save(); x.translate(Math.round(xx), Math.round(yy)); x.rotate(Math.round((aa * 6 + i) / (Math.PI / 4)) * (Math.PI / 4));
    x.drawImage(ART.small[tp], -6, -6);
    x.restore();
  }
}

// ---------- block curtain (scene transitions) ----------
// dir 'in': rows fill top→bottom over [t0, t0+d]; 'out': rows clear bottom→top.
export function curtain(x, u, mode) {
  const rows = Math.ceil(LH / 24), cols = Math.ceil(LW / 24);
  for (let r = 0; r < rows; r++) {
    const k = mode === 'fill' ? r / rows : (rows - 1 - r) / rows;
    const v = clamp01((u - k * 0.7) / 0.3);
    const on = mode === 'fill' ? v > 0 : v < 1;
    if (!on) continue;
    for (let c = 0; c < cols; c++) {
      const tp = ORDER[(r * 3 + c) % 7];
      x.drawImage(ART.tiles[tp], c * 24, r * 24);
      drawHead(x, [0, 5, 23, 98, 183, 233, 287, 419][(r + c * 5) % 8], c * 24 + 4, r * 24 + 4);
    }
  }
}

// ---------- the frame ----------
export function drawGame(t) {
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  const lvl5 = t >= bt(LEVELUP_B);
  let boost = 0;
  for (const e of CLEARS) { const d = t - e.t; if (d >= 0 && d < 1.5) boost = Math.max(boost, (e.n / 4) * Math.exp(-d * 2.5) * 3); }
  if (t > TETRIS_T) boost = Math.max(boost, 1.2);
  const [shx, shy] = shakeAt(t);
  x.save();
  x.translate(shx, shy);
  drawBackdrop(x, t, { lvl5, boost });
  drawSnow(x, t, 70);
  drawHero(x, t);
  drawBoss(x, t);
  // the well
  const by = bounceAt(t);
  x.save();
  x.translate(0, by);
  x.globalAlpha = 0.9;
  fill(x, '#0a0618', FX, FY, COLS * CELL, ROWS * CELL);
  x.globalAlpha = 1;
  for (let c = 1; c < COLS; c++) fill(x, '#171030', FX + c * CELL, FY, 1, ROWS * CELL);
  for (let r = 1; r < ROWS; r++) fill(x, '#171030', FX, FY + r * CELL, COLS * CELL, 1);
  x.drawImage(ART.frame, FX - 8, FY - 8);
  x.drawImage(ART.finials[0], FX - 22, FY - 46);
  x.drawImage(ART.finials[1], FX + COLS * CELL - 6, FY - 46);
  x.save();
  x.beginPath(); x.rect(FX, FY, COLS * CELL, ROWS * CELL); x.clip();
  drawBoard(x, t);
  drawActive(x, t);
  drawParticles(x, t);
  x.restore();
  drawMeter(x, t);
  x.restore();
  drawHold(x, t);
  drawStats(x, t);
  drawNext(x, t);
  drawHP(x, t);
  drawThrow(x, t);
  drawPops(x, t);
  drawBubbles(x, t);
  drawGo(x, t);
  drawLevelUp(x, t);
  drawTetris(x, t);
  drawConfetti(x, t);
  drawSnow(x, t + 3, 30, true);
  x.restore();
  // transitions
  if (t < INTRO + 0.3) curtain(x, (t - INTRO) / 0.3, 'clear');
  if (t > END_T - 0.3) curtain(x, (t - (END_T - 0.3)) / 0.3, 'fill');
  return ART.low;
}
