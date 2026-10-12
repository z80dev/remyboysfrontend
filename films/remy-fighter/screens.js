// Attract / menu screens at the arcade's native 960×540: title, player select, VS, and the win quote.
import { hash } from 'filmkit/lib.js';
import { canvas, loadFighter, headCrop, drawFighter, INK } from './rig.js';
import { dither } from './stage.js';
import { ART, text, bigText } from './fight.js';
import { LW, LH } from './choreo.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const R = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };

export const HEROES = [1, 7, 42, 26, 54, 65];
export const CABALD = [5, 98, 1217, 744, 0, 482];
export const P1_STEPS = [[0, 0], [0.18, 1], [0.34, 2]]; // [lt, index]
export const P1_PICK = 0.5, CPU_PICK = 0.74;
const SC = {};

export async function prepareScreens() {
  SC.low = canvas(LW, LH);
  SC.heads = {};
  for (const id of [...HEROES, ...CABALD]) {
    const F = id === 42 ? ART.hero : id === 1217 ? ART.boss : await loadFighter(id);
    SC.heads[id] = { s1: headCrop(F, 1), s3: headCrop(F, 3), F };
  }
  SC.heroBig = headCrop(ART.hero, 4);
  SC.bossBig = headCrop(ART.boss, 4);
  SC.titleBg = dither(LW, LH, [[0, '#04020c'], [0.55, '#1a0828'], [0.8, '#4a0e2a'], [1, '#8a1a1a']]);
  SC.selBg = dither(LW, LH, [[0, '#06103a'], [0.6, '#0e2a6a'], [1, '#1a4a9a']]);
  // beaten boss portrait for the win quote: greyed, bruised, bandaged
  const b = headCrop(ART.boss, 3), bx = b.getContext('2d');
  bx.globalCompositeOperation = 'source-atop';
  bx.fillStyle = 'rgba(70,60,110,0.45)'; bx.fillRect(0, 0, b.width, b.height);
  bx.globalCompositeOperation = 'source-over';
  const cx = b.width / 2;
  R(bx, INK, cx - 40, 30, 54, 18); R(bx, '#f4ecd8', cx - 38, 32, 50, 14); R(bx, '#d8cbb0', cx - 38, 42, 50, 4);
  R(bx, INK, cx - 21, 18, 18, 42); R(bx, '#f4ecd8', cx - 19, 20, 14, 38);
  bx.fillStyle = '#7a3a9a'; bx.beginPath(); bx.ellipse(cx + 50, 100, 22, 16, 0, 0, 7); bx.fill();
  R(bx, '#8ad8ff', cx + 72, 60, 6, 14); R(bx, '#8ad8ff', cx + 74, 74, 4, 4);
  SC.bossBeat = b;
}

// ---------- title ----------
export function drawTitle(lt) {
  const x = SC.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.drawImage(SC.titleBg, 0, 0);
  // rotating light burst
  const k = smooth(lt / 0.2);
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * 6.283 + lt * 0.5;
    x.globalAlpha = 0.11 * k;
    x.fillStyle = i % 2 ? '#ff5a1a' : '#ffd24a';
    x.beginPath(); x.moveTo(480, 200); x.lineTo(480 + Math.cos(a) * 900, 200 + Math.sin(a) * 900); x.lineTo(480 + Math.cos(a + 0.14) * 900, 200 + Math.sin(a + 0.14) * 900); x.fill();
  }
  x.restore();
  // face-off silhouettes with rim light
  const sil = (F, px, S, flip, rim) => {
    drawFighter(x, F, px, 560, S, { flip, arm: 'guard', stride: [-3, 3], white: rim, glow: null });
    drawFighter(x, F, px + (flip ? -3 : 3), 563, S, { flip, arm: 'guard', stride: [-3, 3], white: '#0a0412' });
  };
  const slide = 1 - smooth(lt / 0.5);
  sil(ART.hero, 150 - slide * 200, 3, false, '#ff7a3a');
  sil(ART.boss, 820 + slide * 200, 4, true, '#b87aff');
  // logo
  const s1 = lt < 0.12 ? 3 - 2 * (lt / 0.12) : 1 + 0.04 * Math.exp(-(lt - 0.12) * 18) * Math.sin((lt - 0.12) * 50);
  const shake = lt > 0.42 && lt < 0.6 ? Math.round(Math.sin(lt * 140) * 6 * (1 - (lt - 0.42) / 0.18)) : 0;
  x.save();
  x.translate(shake, 0);
  bigText(x, 'REMY', 404, 120, 80, { scale: s1, stops: ['#fffbe0', '#ffe14a', '#ff9a1a', '#e0321a'], tracking: 4 });
  bigText(x, 'FIGHTER', 404, 210, 64, { scale: s1, stops: ['#fffbe0', '#ffe14a', '#ff9a1a', '#e0321a'], tracking: 2 });
  if (lt > 0.4) {
    const a = lt - 0.4, s2 = a < 0.08 ? 4 - 3 * (a / 0.08) : 1;
    bigText(x, 'II', 760, 168, 136, { scale: s2, stops: ['#ffffff', '#ff6a6a', '#d8102a', '#5a0a3a'], tracking: -24 });
  }
  x.restore();
  // shine sweep across the logo
  if (lt > 0.7 && lt < 1.05) {
    const sx = 130 + ((lt - 0.7) / 0.35) * 760;
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = 0.45;
    x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(sx, 60); x.lineTo(sx + 26, 60); x.lineTo(sx - 30, 260); x.lineTo(sx - 56, 260); x.fill();
    x.restore();
  }
  if (lt > 0.62) {
    const a = clamp01((lt - 0.62) / 0.08);
    text(x, 'THE WORLD HAIRIOR', 480, 278, { size: 24, align: 'center', color: '#7ad8ff', outline: INK, shadow: null, alpha: a });
  }
  if (lt > 0.85 && Math.floor((lt - 0.85) / 0.1) % 2 === 0) text(x, 'PRESS START', 480, 340, { size: 24, align: 'center', color: '#ffffff', outline: INK, shadow: null });
  text(x, '©2026 REMY BOYS  ·  NOT ENDORSED BY THE CABALD', 480, 512, { size: 8, align: 'center', color: '#b8a8d8', shadow: null });
  return SC.low;
}

// ---------- player select ----------
const CELL = 84, GX0 = 480 - 3 * CELL, GY0 = 316;
const cellXY = (i, row) => [GX0 + i * CELL, GY0 + row * (CELL - 8)];
export const p1Index = (lt) => { let k = 0; for (const [t, i] of P1_STEPS) if (lt >= t) k = i; return k; };
export const cpuIndex = (lt) => (lt >= CPU_PICK ? 2 : Math.floor(lt / 0.07) % 6);
export function drawSelect(lt) {
  const x = SC.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.drawImage(SC.selBg, 0, 0);
  // scrolling diagonal stripes + dotted world grid
  x.save();
  x.globalAlpha = 0.12;
  x.fillStyle = '#7ad8ff';
  for (let i = -10; i < 30; i++) { const o = i * 60 + ((lt * 80) % 60); x.beginPath(); x.moveTo(o, 0); x.lineTo(o + 24, 0); x.lineTo(o + 24 - 300, LH); x.lineTo(o - 300, LH); x.fill(); }
  x.restore();
  for (let gy = 110; gy < 300; gy += 10) for (let gx = 300; gx < 660; gx += 10) if (Math.sin(gx * 0.03) * Math.cos(gy * 0.05) + Math.sin(gx * 0.011 + gy * 0.02) > 0.5) R(x, 'rgba(160,220,255,0.35)', gx, gy, 2, 2);
  bigText(x, 'PLAYER SELECT', 480, 50, 32, { stops: ['#ffffff', '#ffe14a', '#ff9a1a'] });
  // grid
  const p1 = p1Index(lt), cpu = cpuIndex(lt);
  [HEROES, CABALD].forEach((row, r) => row.forEach((id, i) => {
    const [cx, cy] = cellXY(i, r);
    R(x, INK, cx, cy, CELL - 4, CELL - 12);
    R(x, r ? '#2a1040' : '#10204a', cx + 2, cy + 2, CELL - 8, CELL - 16);
    const h = SC.heads[id].s1;
    x.save(); x.beginPath(); x.rect(cx + 2, cy + 2, CELL - 8, CELL - 16); x.clip();
    x.drawImage(h, Math.round(cx + (CELL - 4) / 2 - h.width / 2), cy + 6);
    x.restore();
  }));
  // cursors
  const blink = Math.floor(lt * 16) % 2;
  const cur = (i, row, col, label, picked, pickT) => {
    const [cx, cy] = cellXY(i, row);
    const flash = picked && lt - pickT < 0.12;
    if (flash) { x.globalAlpha = 0.7; R(x, '#ffffff', cx, cy, CELL - 4, CELL - 12); x.globalAlpha = 1; }
    x.strokeStyle = picked ? (blink ? '#ffffff' : col) : col;
    x.lineWidth = 4;
    x.strokeRect(cx - 2, cy - 2, CELL, CELL - 8);
    R(x, col, cx - 4, row ? cy + CELL - 12 : cy - 18, 36, 16);
    text(x, label, cx, row ? cy + CELL - 10 : cy - 16, { size: 8, color: '#ffffff', shadow: null });
  };
  cur(p1, 0, '#e0321a', '1P', lt >= P1_PICK, P1_PICK);
  cur(cpu, 1, '#3a7aff', 'CPU', lt >= CPU_PICK, CPU_PICK);
  // big portraits
  const pid = HEROES[p1], cid = CABALD[cpu];
  const L = SC.heads[pid].s3, Rr = SC.heads[cid].s3;
  const inL = 1 - smooth(lt / 0.15);
  x.drawImage(L, Math.round(10 - inL * 260), 96);
  x.save(); x.translate(Math.round(950 + inL * 260), 96); x.scale(-1, 1); x.drawImage(Rr, 0, 0); x.restore();
  if (lt >= P1_PICK && lt - P1_PICK < 0.1) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.6; x.drawImage(L, 10, 96); x.restore(); }
  const nm = { 1: 'AQUA', 7: 'COBALT', 42: 'REMY', 26: 'KINGPIN', 54: 'ROSE', 65: 'SHADES', 5: 'GOLD SOUL', 98: 'BALDY', 1217: 'M.BALDSON', 744: 'ALOHA', 0: 'PEARL', 482: 'DOME' };
  text(x, nm[pid], 124, 278, { size: 16, align: 'center', color: '#ffffff', outline: INK, shadow: null });
  text(x, nm[cid], 836, 278, { size: 16, align: 'center', color: '#ffb0c8', outline: INK, shadow: null });
  text(x, 'HAIR', 124, 300, { size: 8, align: 'center', color: '#7ad8ff', shadow: null });
  text(x, 'CABALD', 836, 300, { size: 8, align: 'center', color: '#c890ff', shadow: null });
  if (lt >= P1_PICK) text(x, 'OK!', 124, 72, { size: 16, align: 'center', color: '#ffe14a', outline: INK, shadow: null, alpha: blink ? 1 : 0.6 });
  text(x, String(Math.max(0, 9 - Math.floor(lt * 2))).padStart(2, '0'), 912, 24, { size: 16, align: 'right', color: '#ffe14a', shadow: INK });
  // wipe out to VS
  const w = clamp01((lt - 0.98) / 0.12);
  if (w > 0) R(x, '#000000', 0, 0, LW * smooth(w), LH);
  return SC.low;
}

// ---------- VS ----------
function flames(x, cx, cy, lt, w, h) {
  for (let i = 0; i < 26; i++) {
    const ph = (lt * 2.2 + hash(i) ) % 1, fx = cx + (hash(i + 10) - 0.5) * w, fy = cy + h * 0.3 - ph * h;
    const r = (1 - ph) * 18 + 4;
    x.fillStyle = ph < 0.3 ? '#ffe14a' : ph < 0.6 ? '#ff7a1a' : '#c81a1a';
    x.globalAlpha = 1 - ph * 0.8;
    x.beginPath(); x.arc(Math.round(fx + Math.sin(lt * 9 + i) * 6), Math.round(fy), Math.round(r), 0, 7); x.fill();
  }
  x.globalAlpha = 1;
}
export function drawVersus(lt) {
  const x = SC.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  R(x, '#000000', 0, 0, LW, LH);
  const inn = smooth(lt / 0.16);
  // diagonal halves
  x.fillStyle = '#5a0a1a';
  x.beginPath(); x.moveTo(-600 + inn * 600, 0); x.lineTo(520 - 600 * (1 - inn), 0); x.lineTo(440 - 600 * (1 - inn), LH); x.lineTo(-600 + inn * 600, LH); x.fill();
  x.fillStyle = '#24104a';
  x.beginPath(); x.moveTo(1560 - inn * 600, 0); x.lineTo(524 + 600 * (1 - inn), 0); x.lineTo(444 + 600 * (1 - inn), LH); x.lineTo(1560 - inn * 600, LH); x.fill();
  // speed lines
  for (let i = 0; i < 30; i++) {
    const ly = hash(i + 3) * LH, lx = ((hash(i + 4) * 1400 + lt * 1600) % 1400) - 200;
    R(x, i % 2 ? 'rgba(255,120,80,0.25)' : 'rgba(160,120,255,0.25)', i % 2 ? lx : LW - lx, ly, 120, 2);
  }
  // portraits
  const H = SC.heroBig, B = SC.bossBig;
  const drift = lt * 14;
  x.drawImage(H, Math.round(-40 - (1 - inn) * 400 + drift), 110);
  x.save(); x.translate(Math.round(1000 + (1 - inn) * 400 - drift), 110); x.scale(-1, 1); x.drawImage(B, 0, 0); x.restore();
  // names + stat lines
  text(x, 'REMY', 40, 360, { size: 32, color: '#ffffff', outline: INK, shadow: null, alpha: inn });
  text(x, 'HAIR: MAXIMUM', 40, 404, { size: 16, color: '#ffb07a', outline: INK, shadow: null, alpha: inn });
  text(x, 'M.BALDSON', 920, 360, { size: 32, align: 'right', color: '#ffb0c8', outline: INK, shadow: null, alpha: inn });
  text(x, 'HAIR: NONE', 920, 404, { size: 16, align: 'right', color: '#c890ff', outline: INK, shadow: null, alpha: inn });
  // VS slam
  if (lt > 0.2) {
    const a = lt - 0.2, s = a < 0.08 ? 3.5 - 2.5 * (a / 0.08) : 1 + 0.05 * Math.exp(-(a - 0.08) * 16) * Math.sin((a - 0.08) * 60);
    flames(x, 480, 250, lt, 160, 220);
    bigText(x, 'VS', 480, 236, 112, { scale: s, stops: ['#ffffff', '#ffe14a', '#ff5a1a', '#a80a0a'], tracking: -10 });
    if (a < 0.06) { x.fillStyle = `rgba(255,255,255,${0.8 * (1 - a / 0.06)})`; x.fillRect(0, 0, LW, LH); }
  }
  text(x, 'STAGE: NEON ALLEY', 480, 480, { size: 16, align: 'center', color: '#7ad8ff', outline: INK, shadow: null, alpha: clamp01((lt - 0.35) / 0.1) });
  return SC.low;
}

// ---------- win quote ----------
export const QUOTE = ['GO GROW SOME HAIR,', 'THEN COME BACK!'];
export const QUOTE_TYPE = [0.2, 0.95]; // typing window (shot seconds)
export const CHALLENGER = 1.4;
export function drawQuote(lt) {
  const x = SC.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.drawImage(SC.titleBg, 0, 0);
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, 0, LW, LH);
  for (let i = 0; i < 40; i++) R(x, 'rgba(255,255,255,0.5)', Math.floor(hash(i + 900) * LW), Math.floor(hash(i + 950) * 300), 1, 1);
  const open = smooth(lt / 0.16);
  // portrait frames
  const frame = (px, col) => { R(x, col, px - 6, 46, 240, 186); R(x, INK, px - 3, 49, 234, 180); };
  const dx = (1 - open) * 300;
  frame(80 - dx, '#e0321a');
  frame(646 + dx, '#5a4a8a');
  const H = SC.heads[42].s3;
  x.save(); x.beginPath(); x.rect(77 - dx, 49, 234, 180); x.clip();
  const gl = x.createRadialGradient(194 - dx, 140, 10, 194 - dx, 140, 140);
  gl.addColorStop(0, '#ff9a4a'); gl.addColorStop(1, '#3a0a1a');
  x.fillStyle = gl; x.fillRect(77 - dx, 49, 234, 180);
  x.drawImage(H, Math.round(80 - dx), 60);
  x.restore();
  x.save(); x.beginPath(); x.rect(643 + dx, 49, 234, 180); x.clip();
  R(x, '#1a1430', 643 + dx, 49, 234, 180);
  x.translate(Math.round(646 + dx + 228), 60 + Math.round(Math.sin(lt * 20) * 1)); x.scale(-1, 1); x.drawImage(SC.bossBeat, 0, 0);
  x.restore();
  text(x, 'REMY', 194 - dx, 244, { size: 16, align: 'center', color: '#ffffff', shadow: null });
  text(x, 'M.BALDSON', 760 + dx, 244, { size: 16, align: 'center', color: '#9a8ac0', shadow: null });
  text(x, 'WINS', 194 - dx, 268, { size: 16, align: 'center', color: '#ffe14a', shadow: null, alpha: Math.floor(lt * 6) % 2 ? 1 : 0.7 });
  // quote box (typed)
  R(x, '#3a7aff', 70, 312, 820, 116); R(x, INK, 73, 315, 814, 110);
  const chars = Math.floor(clamp01((lt - QUOTE_TYPE[0]) / (QUOTE_TYPE[1] - QUOTE_TYPE[0])) * (QUOTE[0].length + QUOTE[1].length));
  const l1 = QUOTE[0].slice(0, chars), l2 = QUOTE[1].slice(0, Math.max(0, chars - QUOTE[0].length));
  text(x, l1, 100, 336, { size: 24, color: '#ffffff', shadow: '#1a2a6a' });
  text(x, l2, 100, 376, { size: 24, color: '#ffffff', shadow: '#1a2a6a' });
  if (chars < QUOTE[0].length + QUOTE[1].length || Math.floor(lt * 4) % 2) {
    const cl = chars <= QUOTE[0].length ? [100 + l1.length * 24, 336] : [100 + l2.length * 24, 376];
    if (lt > QUOTE_TYPE[0]) R(x, '#ffe14a', cl[0] + 2, cl[1], 16, 24);
  }
  // HERE COMES A NEW CHALLENGER!
  if (lt >= CHALLENGER) {
    const a = lt - CHALLENGER;
    if (a < 0.05) { x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(0, 0, LW, LH); }
    const bh = Math.round(100 * smooth(a / 0.08));
    R(x, '#000000', 0, 480 - bh / 2 - 4, LW, bh + 8);
    R(x, Math.floor(a * 10) % 2 ? '#c81a1a' : '#e0321a', 0, 480 - bh / 2, LW, bh);
    if (bh > 60) {
      text(x, 'HERE COMES A', 480, 444, { size: 24, align: 'center', color: '#ffffff', outline: INK, shadow: null });
      text(x, 'NEW CHALLENGER!', 480, 478, { size: 32, align: 'center', color: Math.floor(a * 12) % 2 ? '#ffe14a' : '#ffffff', outline: INK, shadow: null });
    }
  }
  // fade out
  const f = clamp01((lt - 1.86) / 0.14);
  if (f > 0) { x.fillStyle = `rgba(0,0,0,${f})`; x.fillRect(0, 0, LW, LH); }
  return SC.low;
}
