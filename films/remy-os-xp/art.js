// Baked XP chrome + scene painters for the Remy OS xp launch film.
// Every painter is a pure function of time: no random, no carried state.
import { W, H, lerp, clamp, seg, E, spring, hash, txt, rrect, F } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js';
import { S, EV, DLG, clock } from './timeline.js';

export const P = {
  frame: '#0055e5', frameHi: '#3c8dff', frameLo: '#0030a8', face: '#ece9d8', edge: '#d0d0bf',
  sel: '#316ac5', taskA: '#1f3a9e', taskB: '#4b93ef', taskC: '#2359d5', taskD: '#183f9f',
  trayA: '#0c5ab9', trayB: '#1aafef', trayC: '#0a5fc8', startA: '#3c8f3c', startB: '#6fc36f', startC: '#247224',
  close: '#c23b00', inactA: '#9db2ea', inactB: '#7b95da', w9x: '#c0c0c0',
  flag: ['#f0532d', '#7cc220', '#1f9bf0', '#ffbe1a'], lcd: '#00e200', xpOrange: '#ff9c1e',
  desktopBg: '#004e98',
};

const g2 = (ctx, x0, y0, x1, y1, stops) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
};

// waypoint cursor path: pts = [[t,x,y],…], eased between stops
export function path(t, pts) {
  if (t <= pts[0][0]) return [pts[0][1], pts[0][2]];
  for (let i = 1; i < pts.length; i++) {
    if (t < pts[i][0]) {
      const u = E.inOutCubic(seg(t, pts[i - 1][0], pts[i][0]));
      return [lerp(pts[i - 1][1], pts[i][1], u), lerp(pts[i - 1][2], pts[i][2], u)];
    }
  }
  const l = pts[pts.length - 1]; return [l[1], l[2]];
}

const pop = (t, t0) => spring(clamp((t - t0) / 0.45), 13, 0.55); // 0→1 settle
const fadeIn = (t, t0, d = 0.3) => clamp((t - t0) / d);

// ---------------------------------------------------------------- flag + wordmark
function flagPanePath(ctx, col, row, phase) {
  const x0 = col === 0 ? 4 : 52, x1 = col === 0 ? 48 : 96;
  const y0 = row === 0 ? 8 : 46, y1 = row === 0 ? 42 : 80;
  const wave = (x) => 7 * Math.sin((x / 100) * Math.PI * 1.7 + 0.2 + phase) - x * 0.05;
  const lean = (y) => (y - 44) * -0.12;
  const pts = (y, from, to) => {
    const out = [];
    for (let i = 0; i <= 8; i++) {
      const x = from + ((to - from) * i) / 8;
      out.push([x + lean(y), y + wave(x)]);
    }
    return out;
  };
  const top = pts(y0, x0, x1), bot = pts(y1, x1, x0);
  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1]);
  for (const [x, y] of top.slice(1)) ctx.lineTo(x, y);
  for (const [x, y] of bot) ctx.lineTo(x, y);
  ctx.closePath();
}

export function drawFlag(ctx, x, y, s, t = 0, a = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y); ctx.scale(s, s);
  for (let i = 0; i < 4; i++) {
    flagPanePath(ctx, i % 2, i < 2 ? 0 : 1, t * 0.9);
    ctx.fillStyle = P.flag[i]; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2; ctx.stroke();
    // gloss sweep clipped to this pane, never compositing over the scene behind
    ctx.save();
    ctx.clip();
    const g = g2(ctx, 0, 0, 100, 86, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,.28)'], [0.6, 'rgba(255,255,255,0)']]);
    ctx.fillStyle = g; ctx.fillRect(-4, 0, 110, 90);
    ctx.restore();
  }
  ctx.restore();
}

export function wordmark(ctx, cx, y, size, a = 1, sub = '') {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(cx, y);
  ctx.transform(1, 0, -0.22, 1, 0, 0);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = `700 ${size}px ${F.grot}`;
  const w1 = ctx.measureText('Remy OS').width;
  const xpS = size * 0.92;
  ctx.font = `${xpS}px ${F.anton}`;
  const w2 = ctx.measureText('xp').width;
  const x0 = -(w1 + w2 + size * 0.12) / 2;
  ctx.font = `700 ${size}px ${F.grot}`;
  ctx.shadowColor = 'rgba(10,16,40,.55)'; ctx.shadowBlur = size * 0.12; ctx.shadowOffsetY = size * 0.03;
  ctx.fillStyle = '#ffffff'; ctx.fillText('Remy OS', x0, 0);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent';
  ctx.font = `${xpS}px ${F.anton}`;
  ctx.fillStyle = P.xpOrange; ctx.fillText('xp', x0 + w1 + size * 0.12, 0);
  if (sub) {
    ctx.font = `500 ${size * 0.3}px ${F.grot}`;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.textAlign = 'center';
    ctx.fillText(sub, -size * 0.06, size * 0.62);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- taskbar + desktop base
function bevel(ctx, x, y, w, h, inset) {
  ctx.strokeStyle = inset ? '#808080' : '#ffffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x, y); ctx.lineTo(x, y + h); ctx.stroke();
  ctx.strokeStyle = inset ? '#ffffff' : '#808080';
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y); ctx.stroke();
}

export function taskbar(ctx, t, tasks, startPress = 0) {
  const h = 60, y = H - h;
  ctx.fillStyle = g2(ctx, 0, y, 0, y + h, [[0, P.taskA], [0.12, P.taskB], [0.55, P.taskC], [1, P.taskD]]);
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, y, W, 3);
  // start button (rounded right)
  const bw = 190, press = startPress;
  ctx.save();
  if (press > 0) { ctx.translate(0, press * 2); }
  ctx.fillStyle = g2(ctx, 0, y, 0, y + h, [[0, P.startA], [0.4, P.startB], [1, P.startC]]);
  ctx.beginPath(); ctx.roundRect(0, y + 3, bw - lerp(0, 4, press), h - 6, [0, 0, 14, 14]); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.stroke();
  drawFlag(ctx, 24, y + 10, 0.44, t);
  ctx.font = `italic 700 30px ${F.grot}`;
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,40,0,.6)'; ctx.shadowOffsetY = 2; ctx.shadowBlur = 3;
  ctx.fillText('start', 84, y + h / 2 + 1);
  ctx.restore();
  // task buttons
  let bx = bw + 18;
  for (const task of tasks) {
    const bw2 = Math.min(250, 40 + task.label.length * 11);
    const flash = task.red ? 0.5 + 0.5 * Math.sin(t * 14) : 0;
    const r = Math.round, f = flash;
    ctx.fillStyle = task.red
      ? g2(ctx, bx, y, bx, y + h, [[0, `rgba(${r(110 + f * 120)},40,40,.95)`], [0.5, `rgba(${r(160 + f * 80)},72,60,.95)`], [1, 'rgba(110,40,40,.95)']])
      : task.active
        ? g2(ctx, bx, y, bx, y + h, [[0, '#2a5ace'], [0.5, '#3f7ae8'], [1, '#2a5ace']])
        : g2(ctx, bx, y, bx, y + h, [[0, `rgba(${r(90 + f * 120)},130,230,.9)`], [0.5, `rgba(${r(140 + f * 100)},180,250,.95)`], [1, 'rgba(80,120,215,.9)']]);
    ctx.beginPath(); ctx.roundRect(bx, y + 8, bw2, h - 16, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (task.icon) { ctx.imageSmoothingEnabled = false; ctx.drawImage(task.icon, bx + 12, y + 14, 32, 32); ctx.imageSmoothingEnabled = true; }
    ctx.font = `600 20px ${F.grot}`;
    let lb = task.label;
    const maxW = bw2 - (task.icon ? 60 : 22);
    while (lb.length > 1 && ctx.measureText(lb).width > maxW) lb = lb.slice(0, -1);
    if (lb !== task.label) lb = `${lb.slice(0, -1)}…`;
    txt(ctx, lb, bx + (task.icon ? 52 : 14), y + h / 2, { size: 20, font: F.grot, weight: '600', color: '#fff', base: 'middle', alpha: 0.95 });
    bx += bw2 + 10;
  }
  // tray
  const tx = W - 250;
  ctx.fillStyle = g2(ctx, tx, y, tx, y + h, [[0, P.trayA], [0.45, P.trayB], [1, P.trayC]]);
  ctx.fillRect(tx, y, 250, h);
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(tx, y, 2, h);
  // network + wallet glyphs
  ctx.fillStyle = '#dff1ff';
  ctx.beginPath(); ctx.arc(tx + 34, y + 24, 5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(tx + 22, y + 34, 5, 0, 7); ctx.arc(tx + 46, y + 34, 5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(tx + 10, y + 44, 5, 0, 7); ctx.arc(tx + 34, y + 44, 5, 0, 7); ctx.arc(tx + 58, y + 44, 5, 0, 7); ctx.fill();
  rrect(ctx, tx + 84, y + 16, 60, 28, 6); ctx.fillStyle = '#0a5fc8'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  txt(ctx, 'fREMY', tx + 114, y + 30, { size: 15, font: F.grot, weight: '700', color: '#dff1ff', align: 'center', base: 'middle' });
  txt(ctx, clock(t), tx + 195, y + h / 2, { size: 24, font: F.grot, weight: '600', color: '#fff', align: 'center', base: 'middle' });
}

// small desktop icon glyphs
function iconGlyph(ctx, kind, x, y, s) {
  ctx.save(); ctx.translate(x, y);
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(20,30,60,.5)';
  if (kind === 'pc') {
    ctx.fillStyle = '#d8d4c8'; rrect(ctx, 0, 4, s, s * 0.72, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = g2(ctx, 0, 8, 0, 4 + s * 0.72, [[0, '#5a9ded'], [1, '#1a5fce']]); ctx.fillRect(6, 10, s - 12, s * 0.72 - 12);
    drawFlag(ctx, s * 0.3, 4, s * 0.0075 * 10, 0, 0.95);
    ctx.fillStyle = '#c8c4b8'; ctx.fillRect(s * 0.3, s * 0.76, s * 0.4, 8); ctx.strokeRect(s * 0.3, s * 0.76, s * 0.4, 8);
    ctx.fillRect(s * 0.15, s * 0.84, s * 0.7, 6); ctx.strokeRect(s * 0.15, s * 0.84, s * 0.7, 6);
  } else if (kind === 'games') {
    ctx.fillStyle = '#f7d774'; ctx.beginPath();
    ctx.moveTo(0, s * 0.2); ctx.lineTo(s * 0.42, s * 0.2); ctx.lineTo(s * 0.52, s * 0.34); ctx.lineTo(s, s * 0.34); ctx.lineTo(s, s * 0.9); ctx.lineTo(0, s * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
    drawFlag(ctx, s * 0.22, s * 0.42, s * 0.0055 * 10, 0, 0.95);
  } else if (kind === 'amp') {
    ctx.fillStyle = '#1a2230'; rrect(ctx, 0, 0, s, s, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0c068';
    ctx.beginPath(); ctx.moveTo(s * 0.56, s * 0.12); ctx.lineTo(s * 0.3, s * 0.54); ctx.lineTo(s * 0.48, s * 0.54); ctx.lineTo(s * 0.4, s * 0.88); ctx.lineTo(s * 0.72, s * 0.42); ctx.lineTo(s * 0.52, s * 0.42); ctx.closePath(); ctx.fill();
  } else if (kind === 'vault') {
    ctx.fillStyle = '#8d99ae'; rrect(ctx, 2, 2, s - 4, s - 4, 8); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#dfe6ef'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.24, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s / 2, s * 0.26); ctx.lineTo(s / 2, s * 0.74); ctx.moveTo(s * 0.26, s / 2); ctx.lineTo(s * 0.74, s / 2); ctx.stroke();
  } else if (kind === 'films') {
    ctx.fillStyle = '#2b2d42'; rrect(ctx, 0, s * 0.18, s, s * 0.66, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0532d';
    ctx.save(); ctx.translate(0, s * 0.18); ctx.rotate(-0.18); ctx.fillRect(0, 0, s, s * 0.2); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = `700 ${s * 0.34}px ${F.grot}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('OS', s / 2, s * 0.6);
  } else if (kind === 'bin') {
    ctx.fillStyle = '#9fb8d8'; ctx.beginPath();
    ctx.moveTo(s * 0.22, s * 0.16); ctx.lineTo(s * 0.78, s * 0.16); ctx.lineTo(s * 0.68, s * 0.96); ctx.lineTo(s * 0.32, s * 0.96); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7d9cc8'; ctx.fillRect(s * 0.14, s * 0.06, s * 0.72, 8); ctx.strokeRect(s * 0.14, s * 0.06, s * 0.72, 8);
    ctx.strokeStyle = 'rgba(40,60,100,.5)'; ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(s * 0.22 + i * s * 0.14, s * 0.24); ctx.lineTo(s * 0.3 + i * s * 0.13, s * 0.92); ctx.stroke(); }
  }
  ctx.restore();
}

const ICONS = [
  ['pc', 'Remy PC'], ['bin', 'Rug Bin'], ['vault', 'Remy Vault'], ['games', 'Games'], ['amp', 'RemyAmp'], ['films', 'Films'],
];

export function desktopIcons(ctx, t, from = EV.iconsAt) {
  ICONS.forEach(([kind, label], i) => {
    const u = pop(t, from + i * 0.14);
    if (u <= 0) return;
    const x = 70, y = 56 + i * 128;
    ctx.save();
    ctx.translate(x + 32, y + 32 + (1 - u) * 26); ctx.scale(0.6 + 0.4 * u, 0.6 + 0.4 * u); ctx.translate(-32, -32);
    iconGlyph(ctx, kind, 0, 0, 64);
    ctx.restore();
    txt(ctx, label, x + 32, y + 94, { size: 21, font: F.grot, weight: '600', color: '#fff', align: 'center', shadow: 'rgba(0,20,50,.85)', alpha: clamp(u * 1.4) });
  });
}

export function watermark(ctx, a = 0.85) {
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `italic 600 27px ${F.grot}`;
  const w1 = ctx.measureText('Remy OS ').width;
  ctx.font = `italic 700 29px ${F.grot}`;
  const w2 = ctx.measureText('xp').width;
  ctx.font = `italic 500 24px ${F.grot}`;
  const w3 = ctx.measureText(' · Based Edition · Build 4490').width;
  const x0 = W - 30 - (w1 + w2 + w3);
  ctx.shadowColor = 'rgba(0,20,50,.6)'; ctx.shadowOffsetY = 2; ctx.shadowBlur = 4;
  ctx.font = `italic 600 27px ${F.grot}`;
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.fillText('Remy OS ', x0, H - 78);
  ctx.font = `italic 700 29px ${F.grot}`; ctx.fillStyle = P.xpOrange;
  ctx.fillText('xp', x0 + w1, H - 78);
  ctx.font = `italic 500 24px ${F.grot}`; ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.fillText(' · Based Edition · Build 4490', x0 + w1 + w2, H - 78);
  ctx.restore();
}

// ---------------------------------------------------------------- window chrome
export function xpWindow(ctx, { x, y, w, h, u = 1, title, icon, inactive = false, zoomCx = null, zoomCy = null }) {
  if (u <= 0) return;
  const s2 = 0.7 + 0.3 * spring(clamp(u, 0, 1), 11, 0.6);
  const cx = zoomCx ?? x + w / 2, cy = zoomCy ?? y + h / 2;
  ctx.save();
  ctx.globalAlpha = clamp(u * 2.5);
  ctx.translate(cx, cy); ctx.scale(s2, s2); ctx.translate(-cx, -cy);
  const cA = inactive ? P.inactA : '#0a5ef0';
  const b = inactive ? P.inactB : '#0055e3';
  const c = inactive ? '#6a84c8' : '#003494';
  ctx.shadowColor = 'rgba(0,20,60,.4)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 12;
  ctx.fillStyle = b;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, [12, 12, 4, 4]); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  // title bar
  const th = 56;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w - 6, th, [10, 10, 0, 0]); ctx.clip();
  ctx.fillStyle = g2(ctx, x, y, x, y + th, [[0, cA], [0.5, b], [1, c]]);
  ctx.fillRect(x, y, w, th + 6);
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x, y + 3, w, th * 0.42);
  ctx.restore();
  if (icon) { ctx.imageSmoothingEnabled = false; ctx.drawImage(icon, x + 20, y + 13, 36, 36); ctx.imageSmoothingEnabled = true; }
  txt(ctx, title, x + 68, y + th / 2 + 2, { size: 26, font: F.grot, weight: '700', color: '#fff', base: 'middle', shadow: 'rgba(15,16,137,.9)', off: 1.5 });
  // caption buttons
  const by = y + 10, bs = 38;
  const btn = (bx, i) => {
    ctx.save();
    ctx.beginPath(); ctx.roundRect(bx, by, bs, bs, 8); ctx.clip();
    ctx.fillStyle = i === 2
      ? g2(ctx, bx, by, bx, by + bs, [[0, '#e2622a'], [0.5, '#f0824a'], [1, '#c23b00']])
      : g2(ctx, bx, by, bx, by + bs, [[0, '#4a8ef0'], [0.5, '#2a6ae0'], [1, '#0a3a9a']]);
    ctx.fillRect(bx, by, bs, bs);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(bx, by + 3, bs, bs * 0.4);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by, bs, bs, 8); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    const cxb = bx + bs / 2, cyb = by + bs / 2;
    ctx.beginPath();
    if (i === 0) { ctx.fillRect(cxb - 8, cyb + 4, 16, 3); }
    else if (i === 1) { ctx.strokeRect(cxb - 7, cyb - 7, 14, 12); ctx.fillRect(cxb - 7, cyb - 7, 14, 4); }
    else { ctx.moveTo(cxb - 7, cyb - 7); ctx.lineTo(cxb + 7, cyb + 7); ctx.moveTo(cxb + 7, cyb - 7); ctx.lineTo(cxb - 7, cyb + 7); ctx.stroke(); }
    ctx.stroke();
  };
  const bx0 = x + w - 3 * (bs + 8) - 12;
  btn(bx0, 0); btn(bx0 + bs + 8, 1); btn(bx0 + 2 * (bs + 8), 2);
  // client area
  ctx.fillStyle = P.face;
  ctx.fillRect(x + 3, y + th, w - 6, h - th - 3);
  return { x: x + 3, y: y + th, w: w - 6, h: h - th - 3 };
}

// Win9x sunken panel used by game windows
export function w9xPanel(ctx, x, y, w, h) {
  ctx.fillStyle = P.w9x; ctx.fillRect(x, y, w, h);
  bevel(ctx, x, y, w, h, false);
  ctx.strokeStyle = '#808080'; ctx.lineWidth = 1;
  ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
}

// ---------------------------------------------------------------- scenes
export const ART = {};

export async function init() {
  const img = (u) => { const i = new Image(); i.src = new URL(u, import.meta.url).href; return i.decode().then(() => i); };
  ART.wall = await img('../../public/wallpaper/remy-bliss.svg');
  ART.minis = await img('../../media/quest/minis.webp');
  ART.p42 = await img('../../media/remy/Character42.webp');
  ART.p909 = await img('../../media/remy/Character909.webp');
  ART.p908 = await img('../../media/remy/Character908.webp');
  ART.hero = await A.loadRemy(42, false);
  const heads = await A.loadHeads();
  ART.h42 = A.headIcon(heads, 42, 3);
  ART.h5 = A.headIcon(heads, 5, 3);
  ART.h1217 = A.headIcon(heads, 1217, 3);
  ART.h42L = A.headIcon(heads, 42, 6);
  ART.h5L = A.headIcon(heads, 5, 5);
  // kite: diamond in flag colours with a Remy in each quadrant, exactly like the real wallpaper
  const kiteIds = [2069, 420, 777, 42];
  const K = A.canvas(240, 640), kx = K.getContext('2d');
  kx.scale(2, 2); kx.translate(10, 6);
  const triSets = [[[50, 4], [12, 44], [50, 44]], [[50, 4], [88, 44], [50, 44]], [[12, 44], [50, 132], [50, 44]], [[88, 44], [50, 132], [50, 44]]];
  const spots = [[10, 2], [46, 2], [12, 42], [46, 42]];
  triSets.forEach((T, idx) => {
    const qi = idx;
    kx.save();
    kx.beginPath();
    kx.moveTo(T[0][0], T[0][1]); kx.lineTo(T[1][0], T[1][1]); kx.lineTo(T[2][0], T[2][1]); kx.closePath();
    kx.clip();
    kx.fillStyle = P.flag[qi]; kx.fillRect(0, 0, 120, 140);
    const id = kiteIds[qi];
    kx.imageSmoothingEnabled = true;
    kx.drawImage(ART.minis, (id % 67) * 32, Math.floor(id / 67) * 32, 32, 32, spots[qi][0], spots[qi][1], 44, 44);
    kx.fillStyle = P.flag[qi]; kx.globalAlpha = 0.45; kx.fillRect(0, 0, 120, 140);
    kx.restore();
  });
  // outline + sticks
  kx.strokeStyle = '#fff'; kx.lineWidth = 1.6;
  kx.beginPath(); kx.moveTo(50, 4); kx.lineTo(88, 44); kx.lineTo(50, 132); kx.lineTo(12, 44); kx.closePath(); kx.stroke();
  kx.strokeStyle = 'rgba(91,59,26,.55)'; kx.lineWidth = 1.3;
  kx.beginPath(); kx.moveTo(50, 4); kx.lineTo(50, 132); kx.moveTo(12, 44); kx.lineTo(88, 44); kx.stroke();
  // tail bows
  [150, 186, 222, 256].forEach((y, i) => {
    kx.fillStyle = P.flag[i];
    kx.beginPath();
    kx.moveTo(44 + (i % 2) * 6, y); kx.lineTo(35 + (i % 2) * 6, y - 6); kx.lineTo(35 + (i % 2) * 6, y + 6); kx.closePath();
    kx.moveTo(44 + (i % 2) * 6, y); kx.lineTo(53 + (i % 2) * 6, y - 6); kx.lineTo(53 + (i % 2) * 6, y + 6); kx.closePath();
    kx.fill();
  });
  kx.strokeStyle = 'rgba(255,255,255,.85)'; kx.lineWidth = 1.4;
  kx.beginPath(); kx.moveTo(50, 132);
  kx.bezierCurveTo(36, 150, 64, 162, 50, 180); kx.bezierCurveTo(36, 198, 64, 210, 50, 228); kx.bezierCurveTo(40, 242, 58, 250, 50, 262);
  kx.stroke();
  ART.kite = K;
  // minesweeper board (immutable)
  const CW = 14, CH = 9;
  const mine = [];
  for (let i = 0; i < CW * CH; i++) mine[i] = hash(i * 7 + 3) < 0.1;
  mine[10 + 5 * CW] = true; // the Cabald cell the flag lands on
  ART.mines = { CW, CH, mine };
  return ART;
}

export function drawWall(ctx, { zoom = 1, panX = 0, panY = 0 } = {}) {
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2 - panX, -H / 2 - panY);
  ctx.drawImage(ART.wall, 0, -60, W, 1200); // 1920×1200 bliss, centre crop
  ctx.restore();
}

export function drawKite(ctx, x, y, s, t, a = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.imageSmoothingEnabled = true;
  const sway = Math.sin(t * 0.9) * 0.06, bob = Math.sin(t * 1.3) * 8;
  // string down to the hill
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + 50 * s, y + 64 * s + bob);
  ctx.bezierCurveTo(x + 130 * s, y + 240 * s + bob, x - 90 * s, y + 330 * s, x - 240 * s, y + 470 * s);
  ctx.stroke();
  ctx.translate(x + 60 * s, y + 150 * s + bob);
  ctx.rotate(sway);
  ctx.drawImage(ART.kite, 0, 0, 240, 640, -60 * s, -150 * s, 120 * s, 320 * s);
  ctx.restore();
}

// click ripple + pointer
export function drawCursor(ctx, x, y, press = 0, clickT = -9, t = 0) {
  const d = t - clickT;
  if (d >= 0 && d < 0.35) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - d / 0.35)})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, 8 + d * 90, 0, 7); ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x, y); ctx.scale(1 - press * 0.12, 1 - press * 0.12);
  // pointer
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#07080a'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 26); ctx.lineTo(6.5, 20); ctx.lineTo(11, 29); ctx.lineTo(15.5, 27); ctx.lineTo(11, 18.5); ctx.lineTo(19, 17.5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
