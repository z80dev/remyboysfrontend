// Title/attract card, the radio-select card, and the ending cutscene. All drawn at 640×360.
import { hash } from 'filmkit/lib.js';
import * as A from './art.js';
import { LW, LH, T_TITLE, T_RACE, T_END, DURATION, RADIO, RADIO_OK, G, hudScore, lapTime } from './choreo.js';
import { ART, drawHeroCar, HERO } from './game.js';

const text = A.text;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const R = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
const S = {};

export async function prepareScenes() {
  S.low = A.canvas(LW, LH);
  S.logo = A.canvas(LW, 140);
  S.titleSky = A.skyGrad(LW, 210, [[0, '#0c0628'], [0.4, '#3a1270'], [0.7, '#b02a7e'], [0.9, '#ff6a5a'], [1, '#ffb070']], 24, 120);
  S.endSky = A.skyGrad(LW, 200, [[0, '#1a0a48'], [0.35, '#5a1a7a'], [0.65, '#d03a7a'], [0.85, '#ff7a5a'], [1, '#ffc27a']], 24, 60);
  S.bigSun = A.sun(92);
  S.hero = await A.loadRemy(42, false);
  S.pax = await A.loadRemy(1, false);
  S.crowd = {};
  for (const i of [7, 9, 17, 26, 41, 54, 65, 227, 320, 1]) S.crowd[i] = await A.loadRemy(i, true);
  S.cabald = {};
  for (const i of [952, 1217, 1034, 0, 5]) S.cabald[i] = await A.loadRemy(i, true);
  S.trophy = A.trophy();
  S.palmSil = silhouette(ART.palms[1], '#160828');
  S.palmSil2 = silhouette(ART.palms[2], '#1e0c34');
}

function silhouette(img, col) {
  const c = A.canvas(img.width, img.height), x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return c;
}

function begin() {
  const x = S.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  return x;
}

// Synthwave floor: magenta grid scrolling toward the camera
function grid(x, top, speed, t, col = '#ff3aa8') {
  const g = x.createLinearGradient(0, top, 0, LH);
  g.addColorStop(0, '#2a0a4a'); g.addColorStop(1, '#0a0418');
  x.fillStyle = g; x.fillRect(0, top, LW, LH - top);
  x.fillStyle = col;
  for (let k = 0; k < 24; k++) {
    const z = ((k - (t * speed) % 1) + 24) % 24 + 0.6, y = top + 320 / z;
    if (y > LH) continue;
    x.globalAlpha = clamp01(1.2 - z / 20);
    x.fillRect(0, Math.round(y), LW, z < 3 ? 2 : 1);
  }
  x.globalAlpha = 1;
  for (let k = -16; k <= 16; k++) {
    x.strokeStyle = col; x.lineWidth = 1; x.globalAlpha = 0.8;
    x.beginPath(); x.moveTo(LW / 2 + k * 6, top); x.lineTo(LW / 2 + k * 90, LH); x.stroke();
  }
  x.globalAlpha = 1;
}

// ---------- TITLE (attract) ----------
export function drawTitle(lt) {
  const x = begin();
  x.drawImage(S.titleSky, 0, 0);
  const gl = x.createRadialGradient(LW / 2, 196, 20, LW / 2, 196, 260);
  gl.addColorStop(0, 'rgba(255,170,110,0.6)'); gl.addColorStop(1, 'rgba(255,60,140,0)');
  x.fillStyle = gl; x.fillRect(0, 0, LW, 210);
  x.drawImage(S.bigSun, LW / 2 - S.bigSun.width / 2, 196 - S.bigSun.height / 2 - 6);
  // horizon silhouettes
  x.fillStyle = '#1a0838';
  for (let xx = 0; xx < LW; xx += 2) { const h = 6 + 10 * Math.abs(Math.sin(xx * 0.013)) + 6 * Math.abs(Math.sin(xx * 0.041)); x.fillRect(xx, 202 - h, 2, h + 8); }
  grid(x, 206, 2.4, lt);
  // the road down the middle
  x.fillStyle = '#16082a';
  x.beginPath(); x.moveTo(LW / 2 - 8, 206); x.lineTo(LW / 2 + 8, 206); x.lineTo(LW / 2 + 260, LH); x.lineTo(LW / 2 - 260, LH); x.fill();
  for (let k = 0; k < 10; k++) {
    const z = ((k - (lt * 3) % 1) + 10) % 10 + 0.7, y0 = 206 + 150 / z, y1 = 206 + 150 / (z + 0.45);
    if (y0 > LH + 40) continue;
    const w0 = 4 * (y0 - 206) / 150, w1 = 4 * (y1 - 206) / 150;
    x.fillStyle = '#ffd34a';
    x.beginPath(); x.moveTo(LW / 2 - w1, y1); x.lineTo(LW / 2 + w1, y1); x.lineTo(LW / 2 + w0, y0); x.lineTo(LW / 2 - w0, y0); x.fill();
  }
  x.strokeStyle = '#5ad8ff'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(LW / 2 - 8, 206); x.lineTo(LW / 2 - 260, LH); x.moveTo(LW / 2 + 8, 206); x.lineTo(LW / 2 + 260, LH); x.stroke();
  // palm silhouettes framing
  x.drawImage(S.palmSil, -40, 40, 160, 300);
  x.save(); x.translate(LW + 40, 0); x.scale(-1, 1); x.drawImage(S.palmSil2, 0, 30, 170, 330); x.restore();
  // logo: slides in from the left with streaks, italic chrome
  const inU = clamp01(lt / 0.32), settle = lt < 0.32 ? 0 : Math.exp(-(lt - 0.32) * 10) * Math.sin((lt - 0.32) * 34) * 10;
  const lx = LW / 2 - (1 - inU) ** 3 * 700 + settle;
  if (lt < 0.45) {
    for (let k = 0; k < 9; k++) { x.globalAlpha = 0.6 * (1 - inU * 0.6); R(x, k % 2 ? '#ff3aa8' : '#ffd34a', lx - 340 - k * 30, 70 + k * 10, 260 - k * 20, 3); }
    x.globalAlpha = 1;
  }
  logo(x, lx, 64, lt);
  if (lt > 0.45) {
    const a = clamp01((lt - 0.45) / 0.1);
    text(x, 'THE CABALD CHASE', LW / 2, 158, { size: 16, color: '#5ad8ff', outline: '#120a1e', shadow: null, align: 'center', alpha: a });
  }
  // the hero's convertible cruising into the sunset
  x.save();
  x.translate(LW / 2, 0); x.scale(0.82, 0.82); x.translate(-LW / 2, 0);
  drawHeroCar(x, 2.4 + lt, LW / 2, LH / 0.82 - 10, Math.sin(lt * 3) * 0.2, false, 0);
  x.restore();
  if (lt > 0.7 && Math.floor(lt / 0.14) % 2 === 0) text(x, 'PRESS START', LW / 2, 200, { size: 16, color: '#ffffff', outline: '#120a1e', shadow: null, align: 'center' });
  text(x, '©2026 REMY BOYS', 12, LH - 16, { size: 8, color: '#ff8ab8', shadow: '#120a1e' });
  text(x, 'CREDIT 1', LW - 12, LH - 16, { size: 8, color: '#ffffff', shadow: '#120a1e', align: 'right' });
  if (lt < 0.08) { x.fillStyle = `rgba(0,0,0,${1 - lt / 0.08})`; x.fillRect(0, 0, LW, LH); }
  return S.low;
}

function logo(dest, cx, top, lt) {
  const x = S.logo.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1;
  x.clearRect(0, 0, S.logo.width, S.logo.height);
  const size = 64, s = 'REMY RUN';
  x.save();
  x.font = `${size}px ${A.FONT}`;
  x.textBaseline = 'top'; x.textAlign = 'center';
  x.translate(LW / 2, 24);
  x.transform(1, 0, -0.22, 1, 0, 0);
  // extruded shadow
  for (let k = 8; k >= 1; k--) { x.fillStyle = k > 6 ? '#120a1e' : '#3a0a5a'; x.fillText(s, k, k); }
  x.fillStyle = '#120a1e';
  for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) x.fillText(s, dx, dy);
  const g = x.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#fff8c0'); g.addColorStop(0.38, '#ffd34a'); g.addColorStop(0.5, '#ff7a2a'); g.addColorStop(0.52, '#e8203a'); g.addColorStop(1, '#8a0c3a');
  x.fillStyle = g; x.fillText(s, 0, 0);
  // chrome highlight line + sweep
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(-300, size * 0.47, 600, 2);
  if (lt > 0.5 && lt < 1.0) {
    const sx = -320 + 700 * ((lt - 0.5) / 0.5);
    x.fillStyle = 'rgba(255,255,255,0.75)';
    x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx + 24, 0); x.lineTo(sx + 4, size); x.lineTo(sx - 20, size); x.fill();
  }
  x.restore();
  dest.drawImage(S.logo, Math.round(cx - LW / 2), top - 24);
  // hero head peeking from the 'Y'... sits on the logo as a badge
  dest.drawImage(ART.heroIcon2, Math.round(cx + 238), top - 22);
}

// ---------- RADIO SELECT ----------
export function drawRadio(lt, t) {
  const x = begin();
  // windscreen view: sunset beyond the start line
  x.drawImage(ART.skies[0], 0, -20);
  x.drawImage(ART.sun, LW / 2 + 60 - ART.sun.width / 2, 60);
  x.fillStyle = '#eaa46c'; x.fillRect(0, 140, LW, 60);
  x.fillStyle = '#7c6c8c'; x.beginPath(); x.moveTo(LW / 2 - 20, 140); x.lineTo(LW / 2 + 20, 140); x.lineTo(LW / 2 + 380, 200); x.lineTo(LW / 2 - 380, 200); x.fill();
  // START banner far away
  R(x, '#120a1e', LW / 2 - 70, 92, 4, 48); R(x, '#120a1e', LW / 2 + 66, 92, 4, 48);
  x.drawImage(ART.bStart, LW / 2 - 72, 88, 144, 18);
  // dashboard
  const dg = x.createLinearGradient(0, 150, 0, LH);
  dg.addColorStop(0, '#5a0c18'); dg.addColorStop(0.15, '#2a0610'); dg.addColorStop(1, '#14040a');
  x.fillStyle = dg;
  x.beginPath(); x.moveTo(0, 170); x.quadraticCurveTo(LW / 2, 130, LW, 170); x.lineTo(LW, LH); x.lineTo(0, LH); x.fill();
  x.fillStyle = '#8a1a2a'; x.beginPath(); x.moveTo(0, 170); x.quadraticCurveTo(LW / 2, 130, LW, 170); x.lineTo(LW, 173); x.quadraticCurveTo(LW / 2, 133, 0, 173); x.fill();
  // steering wheel edge (left)
  x.strokeStyle = '#120a1e'; x.lineWidth = 16; x.beginPath(); x.arc(60, 330, 130, -1.6, 0.2); x.stroke();
  x.strokeStyle = '#3a2a32'; x.lineWidth = 10; x.beginPath(); x.arc(60, 330, 130, -1.6, 0.2); x.stroke();
  // radio unit
  const rx = 150, ry = 190, rw = 340, rh = 130;
  R(x, '#120a1e', rx - 4, ry - 4, rw + 8, rh + 8);
  R(x, '#b8b4c8', rx - 2, ry - 2, rw + 4, rh + 4); R(x, '#ffffff', rx - 2, ry - 2, rw + 4, 1);
  R(x, '#1a1622', rx, ry, rw, rh);
  // LCD
  const lx = rx + 12, ly = ry + 10, lw = 230, lh = 110;
  R(x, '#0c2a26', lx, ly, lw, lh);
  const cur = RADIO.findIndex((s) => t >= s.t0 && t < s.t1);
  const lcd = '#7affd8', dim = '#1f5a50';
  const freq = cur >= 0 ? RADIO[cur].fm : (88 + ((t * 47) % 20)).toFixed(1);
  text(x, 'FM', lx + 8, ly + 8, { size: 8, color: lcd, shadow: null });
  text(x, freq.padStart(5, ' '), lx + 40, ly + 6, { size: 16, color: lcd, shadow: null });
  text(x, 'MHz', lx + 128, ly + 12, { size: 8, color: dim, shadow: null });
  // EQ bars, bouncing with whatever is on air
  for (let b = 0; b < 8; b++) {
    const on = cur >= 0;
    const amp = on ? 0.3 + 0.7 * Math.abs(Math.sin(t * (9 + b * 2.3) + b * 1.7)) * (cur === 2 ? 1 : 0.7) : 0.15 * hash(b + Math.floor(t * 40));
    const h = Math.round(amp * 22);
    for (let k = 0; k < h; k += 3) R(x, k > 15 ? '#ff8a8a' : lcd, lx + 168 + b * 7, ly + 28 - k, 5, 2);
  }
  // station list with cursor
  RADIO.forEach((s, i) => {
    const sel = i === cur, y = ly + 40 + i * 20;
    const picked = i === 2 && t >= RADIO_OK;
    const col = sel ? (picked && Math.floor(t * 12) % 2 ? '#ffffff' : lcd) : dim;
    if (sel) text(x, '>', lx + 6, y, { size: 8, color: col, shadow: null });
    text(x, s.name, lx + 20, y, { size: 8, color: col, shadow: null });
  });
  // dial scale + needle
  const sx = rx + 254, sw = 72;
  R(x, '#2a2436', sx, ry + 12, sw, 50);
  for (let k = 0; k <= 12; k++) R(x, '#8a8298', sx + 4 + k * 5.3, ry + 18, 1, k % 4 === 0 ? 8 : 4);
  let pos;
  const stops = [[T_TITLE, 0.02], ...RADIO.flatMap((s) => [[s.t0, s.pos], [s.t1 - 0.02, s.pos]])];
  pos = stops[stops.length - 1][1];
  for (let k = 0; k < stops.length - 1; k++) {
    const [a, pa] = stops[k], [b, pb] = stops[k + 1];
    if (t >= a && t < b) { const u = (t - a) / (b - a); pos = pa + (pb - pa) * u * u * (3 - 2 * u); break; }
  }
  R(x, '#ff2a3a', sx + 4 + pos * 64, ry + 14, 2, 44);
  // tuning knob turned by Remy's hand
  const kx = sx + sw / 2, ky = ry + 96, kr = 20;
  x.fillStyle = '#120a1e'; x.beginPath(); x.arc(kx, ky, kr + 2, 0, 7); x.fill();
  x.fillStyle = '#d8d4e4'; x.beginPath(); x.arc(kx, ky, kr, 0, 7); x.fill();
  x.fillStyle = '#9a96a8'; x.beginPath(); x.arc(kx + 3, ky + 3, kr - 5, 0, 7); x.fill();
  const ang = -2.2 + pos * 4.4;
  x.strokeStyle = '#e8203a'; x.lineWidth = 3; x.beginPath(); x.moveTo(kx, ky); x.lineTo(kx + Math.cos(ang) * (kr - 3), ky + Math.sin(ang) * (kr - 3)); x.stroke();
  hand(x, kx, ky, ang, t);
  // header
  text(x, 'SELECT MUSIC', LW / 2, 14, { size: 16, color: '#ffffff', outline: '#120a1e', shadow: null, align: 'center' });
  const left = Math.max(0, 9 - Math.floor((t - T_TITLE) * 6));
  text(x, `TIME ${left}`, LW - 16, 14, { size: 8, color: '#ffd34a', shadow: '#120a1e', align: 'right' });
  if (cur >= 0) {
    const s = RADIO[cur];
    text(x, `ON AIR: ${s.name}`, LW / 2, 40, { size: 8, color: cur === 2 ? '#ffd34a' : '#c8b8ff', shadow: '#120a1e', align: 'center' });
  }
  if (t >= RADIO_OK) {
    const a = t - RADIO_OK, sc = 1 + 1.2 * (1 - clamp01(a / 0.1)) ** 2;
    x.save(); x.translate(LW / 2, 70); x.scale(sc, sc);
    text(x, 'GET READY!', 0, -12, { size: 24, color: '#7aff7a', outline: '#120a1e', shadow: null, align: 'center', alpha: clamp01(a / 0.08) });
    x.restore();
  }
  // static snow while between stations
  if (cur < 0) {
    x.globalAlpha = 0.18;
    for (let i = 0; i < 400; i++) { const px = hash(i + Math.floor(t * 60) * 997) * LW, py = hash(i * 3 + Math.floor(t * 60) * 131) * LH; R(x, '#ffffff', px, py, 2, 1); }
    x.globalAlpha = 1;
  }
  // wipe in from the title (horizontal blinds open)
  const op = clamp01(lt / 0.16);
  if (op < 1) { x.fillStyle = '#000'; for (let yy = 0; yy < LH; yy += 24) x.fillRect(0, yy + Math.round(24 * op), LW, Math.ceil(24 * (1 - op))); }
  // out: flash to the race
  if (t > T_RACE - 0.08) { x.fillStyle = `rgba(0,0,0,${clamp01((t - (T_RACE - 0.08)) / 0.08)})`; x.fillRect(0, 0, LW, LH); }
  return S.low;
}

function hand(x, kx, ky, ang, t) {
  const sk = HERO.skin, lo = A.shade(sk, -0.25), hi = A.shade(sk, 0.2);
  // forearm from the bottom-right with a sleeve
  x.save();
  x.translate(kx, ky);
  x.rotate(ang * 0.15);
  x.fillStyle = '#120a1e'; x.fillRect(14, 10, 52, 90);
  x.fillStyle = HERO.shirt; x.fillRect(16, 40, 48, 60);
  x.fillStyle = '#4a4a5e'; x.fillRect(16, 40, 48, 4);
  x.fillStyle = sk; x.fillRect(18, 12, 40, 30);
  x.fillStyle = lo; x.fillRect(18, 34, 40, 8);
  // fingers gripping the knob
  for (let k = 0; k < 4; k++) {
    const fy = -18 + k * 9;
    x.fillStyle = '#120a1e'; x.fillRect(-4 + k * 2, fy - 1, 26, 9);
    x.fillStyle = sk; x.fillRect(-3 + k * 2, fy, 24, 7);
    x.fillStyle = hi; x.fillRect(-3 + k * 2, fy, 24, 2);
    x.fillStyle = lo; x.fillRect(-3 + k * 2, fy + 5, 24, 2);
  }
  x.fillStyle = '#120a1e'; x.fillRect(-22, 8, 26, 10); x.fillStyle = sk; x.fillRect(-21, 9, 25, 8); x.fillStyle = hi; x.fillRect(-21, 9, 25, 2);
  x.restore();
  void t;
}

// ---------- ENDING ----------
const FW = [0.35, 0.8, 1.25, 1.7].map((t, i) => ({ t, x: [170, 470, 300, 540][i], y: [60, 50, 40, 70][i], hue: i % 3 }));
export const ENDING_FW = FW;

export function drawEnding(lt) {
  const x = begin();
  const zoom = 1 + 0.035 * clamp01(lt / 2.7);
  x.save();
  x.translate(LW / 2, LH * 0.6); x.scale(zoom, zoom); x.translate(-LW / 2, -LH * 0.6);
  x.drawImage(S.endSky, 0, 0);
  const gl = x.createRadialGradient(LW / 2 + 120, 190, 10, LW / 2 + 120, 190, 220);
  gl.addColorStop(0, 'rgba(255,190,120,0.6)'); gl.addColorStop(1, 'rgba(255,80,130,0)');
  x.fillStyle = gl; x.fillRect(0, 0, LW, 210);
  x.drawImage(ART.sun, LW / 2 + 120 - ART.sun.width / 2, 196 - ART.sun.height / 2 - 4);
  fireworks(x, lt);
  // sea with glitter
  const sea = x.createLinearGradient(0, 196, 0, 240);
  sea.addColorStop(0, '#ff8a7a'); sea.addColorStop(0.2, '#8a4ab0'); sea.addColorStop(1, '#2a2a8a');
  x.fillStyle = sea; x.fillRect(0, 196, LW, 50);
  for (let k = 0; k < 40; k++) { const gx = LW / 2 + 120 + (hash(k + Math.floor(lt * 8) * 29) - 0.5) * (40 + k * 3), gy = 198 + Math.floor(hash(k * 7) * 44); R(x, '#ffe6a0', gx, gy, 2 + Math.floor(hash(k + 3) * 8), 1); }
  // beach
  const sand = x.createLinearGradient(0, 238, 0, LH);
  sand.addColorStop(0, '#eaa46c'); sand.addColorStop(1, '#b86a4a');
  x.fillStyle = sand; x.fillRect(0, 238, LW, LH - 238);
  for (let k = 0; k < 4; k++) { R(x, '#ffe6f2', 0, 238 + k * 2 + Math.round(Math.sin(lt * 3 + k) * 1), LW, 1); }
  // palms
  x.drawImage(ART.palms[0], -30, 30, 150, 230);
  x.save(); x.translate(LW + 20, 0); x.scale(-1, 1); x.drawImage(ART.palms[2], 0, 20, 140, 240); x.restore();
  // the Cabald, wrecked: limo upside down, smoking, bald crew dazed with orbiting stars
  const lim = ART.cars.BOSS.side;
  x.save(); x.translate(500, 262); x.scale(0.42, -0.42); x.rotate(0.05); x.drawImage(lim, -lim.width / 2, -lim.height); x.restore();
  for (let k = 0; k < 6; k++) {
    const a = (lt * 0.9 + k * 0.18) % 1.1;
    x.globalAlpha = 0.7 * (1 - a / 1.1);
    const r = 6 + a * 28;
    x.drawImage(ART.puffDark, Math.round(470 + k * 9 + a * 20 - r), Math.round(250 - a * 90 - r), Math.round(r * 2), Math.round(r * 2));
  }
  x.globalAlpha = 1;
  [[952, 448], [1217, 548], [1034, 590]].forEach(([id, px], k) => {
    A.drawRemy(x, S.cabald[id], px, 286, { sy: 0.8, sx: 1.05, flip: k === 1 });
    for (let s = 0; s < 3; s++) { const a = lt * 6 + s * 2.09 + k; star4(x, px + Math.cos(a) * 14, 286 - 70 + Math.sin(a) * 4, 2, '#ffe27a'); }
  });
  // cheering crowd of hair Remys on the left
  [7, 9, 17, 26, 41, 54, 65, 227].forEach((id, k) => {
    const ph = lt * 10 + k * 1.3, b = Math.abs(Math.sin(ph));
    A.drawRemy(x, S.crowd[id], 60 + k * 34, 300 - b * 14 + (k % 2) * 6, { lift: [Math.round(b * 4), Math.round(b * 4)], flip: k % 2 === 1, sx: 0.9, sy: 0.9 * (1 + 0.05 * Math.sin(ph * 2)) });
  });
  // hero + passenger standing in the car, trophy aloft
  const jump = Math.abs(Math.sin(lt * 7));
  const hx = 300, hf = 312 - jump * 16;
  const k1 = 1 + 0.06 * Math.sin(lt * 14);
  A.drawRemy(x, S.pax, hx + 70, 314 - Math.abs(Math.sin(lt * 7 + 1.4)) * 12, { flip: true, lift: [3, 3] });
  A.drawRemy(x, S.hero, hx, hf, { sy: k1, sx: 2 - k1, glow: '#ffd34a', glowA: 0.4 + 0.3 * Math.sin(lt * 12) });
  // arms up holding the trophy
  const ty = hf - 118 - 16 + Math.sin(lt * 7) * 2;
  R(x, '#120a1e', hx - 20, ty + 30, 6, 30); R(x, HERO.skin, hx - 19, ty + 30, 4, 28);
  R(x, '#120a1e', hx + 14, ty + 30, 6, 30); R(x, HERO.skin, hx + 15, ty + 30, 4, 28);
  x.drawImage(S.trophy, Math.round(hx - 20), Math.round(ty - 8));
  for (let s = 0; s < 4; s++) { const a = lt * 3 + s * 1.57; star4(x, hx + Math.cos(a) * 30, ty + 14 + Math.sin(a) * 20, 2 + Math.round(Math.abs(Math.sin(lt * 9 + s)) * 2), '#fffbe0'); }
  carFront(x, hx + 34, 352, lt);
  x.restore();
  // texts
  const msg = 'CONGRATULATIONS!';
  for (let i = 0; i < msg.length; i++) {
    const a = lt - 0.1 - i * 0.03;
    if (a < 0) continue;
    const dy = a < 0.25 ? -50 * (1 - a / 0.25) ** 2 : Math.sin(lt * 6 + i * 0.5) * 2;
    const hue = ['#ffd34a', '#ffffff', '#ff8ab8', '#5ad8ff'][Math.floor(lt * 10 + i) % 4];
    text(x, msg[i], LW / 2 - (msg.length * 24) / 2 + i * 24, 20 + dy, { size: 24, color: a < 0.4 ? '#ffffff' : hue, outline: '#120a1e', shadow: null });
  }
  if (lt > 0.6) text(x, 'YOU OUTRAN THE CABALD', LW / 2, 54, { size: 16, color: '#ffffff', outline: '#120a1e', shadow: null, align: 'center', alpha: clamp01((lt - 0.6) / 0.1) });
  if (lt > 1.0) {
    const lap = lapTime(G.goal), mm = Math.floor(lap / 60), ss = Math.floor(lap % 60), cc = Math.floor((lap * 100) % 100);
    text(x, `SCORE ${String(hudScore(G.goal + 1)).padStart(8, ' ')}`, LW / 2, 78, { size: 8, color: '#ffd34a', shadow: '#120a1e', align: 'center' });
    if (Math.floor(lt * 6) % 2 === 0) text(x, `BEST LAP ${mm}'${String(ss).padStart(2, '0')}"${String(cc).padStart(2, '0')}  NEW RECORD!`, LW / 2, 92, { size: 8, color: '#7aff7a', shadow: '#120a1e', align: 'center' });
  }
  const tEnd = DURATION - T_END;
  if (lt > tEnd - 0.75) {
    const a = clamp01((lt - (tEnd - 0.75)) / 0.1);
    R(x, 'rgba(18,10,30,0.7)', 0, LH - 34, LW, 24);
    text(x, 'THANK YOU FOR PLAYING - REMY RUN', LW / 2, LH - 26, { size: 8, color: '#ffffff', shadow: null, align: 'center', alpha: a });
  }
  // open from the blinds, fade out at the very end
  const op = clamp01(lt / 0.22);
  if (op < 1) { x.fillStyle = '#000'; for (let yy = 0; yy < LH; yy += 24) x.fillRect(0, yy + Math.round(24 * op), LW, Math.ceil(24 * (1 - op))); }
  const fo = clamp01((lt - (tEnd - 0.3)) / 0.28);
  if (fo > 0) { x.fillStyle = `rgba(0,0,0,${fo})`; x.fillRect(0, 0, LW, LH); }
  return S.low;
}

function star4(x, cx, cy, r, col) {
  R(x, col, cx - r, cy, r * 2 + 1, 1);
  R(x, col, cx, cy - r, 1, r * 2 + 1);
}

function carFront(x, cx, by, lt) {
  // red convertible, nose-on: low wide body, pop-up lamps, grille, windscreen frame
  R(x, 'rgba(30,8,30,0.45)', cx - 120, by - 6, 240, 8);
  R(x, '#120a16', cx - 112, by - 22, 30, 22); R(x, '#120a16', cx + 82, by - 22, 30, 22);
  R(x, '#120a16', cx - 124, by - 64, 248, 46);
  R(x, '#e8262e', cx - 122, by - 62, 244, 42);
  R(x, '#ff7a6a', cx - 122, by - 62, 244, 3);
  R(x, '#8a0c1a', cx - 122, by - 26, 244, 6);
  // grille
  R(x, '#120a16', cx - 60, by - 44, 120, 16);
  for (let k = 0; k < 4; k++) R(x, '#3a3448', cx - 58, by - 42 + k * 4, 116, 2);
  // lamps
  for (const s of [-1, 1]) {
    R(x, '#120a16', cx + s * 92 - 18, by - 48, 36, 12);
    R(x, '#fff6c0', cx + s * 92 - 17, by - 47, 34, 10);
    R(x, '#ffffff', cx + s * 92 - 15, by - 46, 12, 3);
  }
  // windscreen frame (the occupants stand behind it)
  x.strokeStyle = '#2a2436'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(cx - 108, by - 62); x.lineTo(cx - 92, by - 104); x.lineTo(cx + 92, by - 104); x.lineTo(cx + 108, by - 62); x.stroke();
  x.fillStyle = 'rgba(190,230,255,0.16)'; x.beginPath(); x.moveTo(cx - 106, by - 63); x.lineTo(cx - 91, by - 103); x.lineTo(cx + 91, by - 103); x.lineTo(cx + 106, by - 63); x.fill();
  // plate
  R(x, '#120a16', cx - 22, by - 24, 44, 14); R(x, '#f4ecfa', cx - 21, by - 23, 42, 12);
  text(x, 'REMY', cx, by - 21, { size: 8, color: '#2a1a5e', shadow: null, align: 'center' });
  void lt;
}

function fireworks(x, lt) {
  const cols = [['#ff5a8a', '#ffd0e0'], ['#5ad8ff', '#d8f6ff'], ['#ffd34a', '#fff6c8']];
  for (const f of FW) {
    const a = lt - f.t;
    if (a < 0 || a > 1.1) continue;
    const u = a / 1.1, c = cols[f.hue];
    if (a < 0.07) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(f.x, f.y, 18 * (1 - a / 0.07) + 4, 0, 7); x.fill(); }
    for (const [ring, n, spd] of [[0, 40, 120], [1, 24, 70]]) {
      for (let i = 0; i < n; i++) {
        const an = (i / n) * 6.283 + ring * 0.14, d = spd * (1 - Math.exp(-a * 4)) / 1.6;
        const px = f.x + Math.cos(an) * d, py = f.y + Math.sin(an) * d + 26 * a * a;
        const tw = u > 0.55 && hash(i * 7 + Math.floor(a * 30)) > 0.6 ? 0 : 1;
        x.globalAlpha = (1 - u * u) * tw;
        R(x, ring ? c[1] : c[0], px - 1, py - 1, 2, 2);
      }
    }
    x.globalAlpha = 1;
  }
}
