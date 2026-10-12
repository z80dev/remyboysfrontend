// Shot painters. Every scene is a pure function of (ctx, lt, t): full repaint each frame.
import { W, H, lerp, clamp, seg, E, spring, hash, txt, rrect, F } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js';
import { S, EV, DLG } from './timeline.js';
import { P, ART, drawWall, drawKite, drawFlag, drawCursor, taskbar, desktopIcons, watermark, xpWindow, w9xPanel, wordmark, path } from './art.js';

const g2 = (ctx, x0, y0, x1, y1, stops) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
};
const pop = (t, t0) => spring(clamp((t - t0) / 0.45), 13, 0.55);
const fade = (t, t0, d = 0.3) => clamp((t - t0) / d);
const run = (px) => {
  const s = Math.sin(px / 26 * Math.PI * 2);
  return { lift: [Math.round(Math.max(0, s) * 5), Math.round(Math.max(0, -s) * 5)], stride: [Math.round(s * 2), Math.round(-s * 2)], lean: 0.06 };
};

// ================================================================ boot
export function sceneBoot(ctx, lt, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const fu = fade(t, EV.flagIn, 0.5);
  ctx.save();
  ctx.translate(0, (1 - fu) * 30);
  drawFlag(ctx, W / 2 - 220, 190, 4.4, t * 0.35, fu);
  ctx.restore();
  wordmark(ctx, W / 2, 760, 96, fade(t, EV.mark, 0.5));
  const bu = fade(t, 2.2, 0.4);
  if (bu > 0) {
    const bw = 500, bh = 40, bx = W / 2 - bw / 2, by = 830;
    ctx.globalAlpha = bu;
    rrect(ctx, bx, by, bw, bh, 10);
    ctx.strokeStyle = '#b2b2b2'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(bx + 3, by + 3, bw - 6, bh - 6);
    for (let i = 0; i < 3; i++) {
      const rw = 96;
      const rx = bx + (((lt * 300 + i * 190) % (bw + rw)) - rw); // screen coords: offset + track-local loop
      const x1 = Math.max(bx + 4, rx), x2 = Math.min(rx + rw, bx + bw - 4);
      if (x2 - x1 <= 0) continue; // fully outside the track this frame
      ctx.fillStyle = g2(ctx, rx, 0, rx + rw, 0, [[0, '#2b4ee0'], [0.5, '#87a6ff'], [1, '#1c3cbf']]);
      ctx.fillRect(x1, by + 6, x2 - x1, bh - 12);
    }
    ctx.globalAlpha = 1;
  }
  txt(ctx, 'Copyright © 2023–2026 Based Remy Boys', 60, H - 50, { size: 24, font: F.grot, color: '#9aa3b8', alpha: fade(t, 2.6, 0.6) });
}

// ================================================================ logon
export function sceneLogon(ctx, lt, t) {
  ctx.fillStyle = g2(ctx, 0, 0, 0, H, [[0, '#6d92e6'], [0.6, '#5a7edc'], [1, '#4a6ac8']]);
  ctx.fillRect(0, 0, W, H);
  const rg = ctx.createRadialGradient(W / 2, 620, 60, W / 2, 620, 900);
  rg.addColorStop(0, 'rgba(161,189,244,.55)'); rg.addColorStop(1, 'rgba(161,189,244,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  // top band + divider
  ctx.fillStyle = '#00309c'; ctx.fillRect(0, 0, W, 170);
  drawFlag(ctx, 100, 40, 1.7, t * 0.3, fade(t, 8.2, 0.4));
  ctx.fillStyle = g2(ctx, 0, 0, W, 0, [[0, '#003399'], [0.5, '#d6e4ff'], [1, '#003399']]);
  ctx.fillRect(0, 170, W, 26);
  txt(ctx, 'To begin, click your Remy.', W / 2, 330, { size: 46, font: F.grot, weight: '700', color: '#fff', align: 'center', alpha: fade(t, 8.4, 0.5) });
  // tiles
  const tiles = [
    { x: 700, label: 'Crimson Flow', sub: 'Connected wallet', kind: 'hero' },
    { x: 960, label: 'Connect wallet', sub: 'wagmiOS', kind: 'wallet' },
    { x: 1220, label: 'Guest', sub: 'no hair attached', kind: 'guest' },
  ];
  const [cx, cy] = path(t, [[8.4, 1560, 980], [9.6, 1340, 880], [10.9, 700, 735]]);
  const clicked = t >= EV.curClick1;
  tiles.forEach((tl, i) => {
    const u = pop(t, EV.tiles + i * 0.12);
    if (u <= 0) return;
    const tw = 240, th = 330, x = tl.x - tw / 2, y = 560;
    const hov = Math.abs(cx - tl.x) < tw / 2 && cy > y && cy < y + th;
    ctx.save();
    ctx.globalAlpha = clamp(u * 1.5);
    const press = clicked && i === 0 ? clamp((t - EV.curClick1) * 3) : 0;
    ctx.translate(tl.x, y + th / 2); ctx.scale((0.8 + 0.2 * u) * (1 - press * 0.05), (0.8 + 0.2 * u) * (1 - press * 0.05)); ctx.translate(-tl.x, -(y + th / 2));
    ctx.shadowColor = 'rgba(0,20,70,.5)'; ctx.shadowBlur = hov || (clicked && i === 0) ? 44 : 24; ctx.shadowOffsetY = 10;
    rrect(ctx, x, y, tw, th, 10);
    ctx.fillStyle = hov || (clicked && i === 0)
      ? g2(ctx, x, y, x, y + th, [[0, '#a8c6ff'], [1, '#6f96e8']])
      : g2(ctx, x, y, x, y + th, [[0, '#7ea1ea'], [1, '#5373d2']]);
    ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = hov || (clicked && i === 0) ? '#ffffff' : 'rgba(255,255,255,.9)'; ctx.lineWidth = hov ? 6 : 3.5; ctx.stroke();
    if (tl.kind === 'hero') {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(ART.h42L, tl.x - 80, y + 34, 160, 160);
      ctx.imageSmoothingEnabled = true;
    } else {
      const gy = y + 60;
      ctx.strokeStyle = '#e6efff'; ctx.lineWidth = 6; ctx.fillStyle = 'rgba(230,239,255,.25)';
      if (tl.kind === 'wallet') {
        rrect(ctx, tl.x - 55, gy + 20, 110, 80, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd968'; rrect(ctx, tl.x - 55, gy + 20, 44, 30, 8); ctx.fill();
        ctx.strokeRect(tl.x - 6, gy + 20, 12, 80);
      } else {
        ctx.beginPath(); ctx.arc(tl.x, gy + 42, 38, 0, 7); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(tl.x, gy + 130, 58, Math.PI, 0); ctx.fill(); ctx.stroke();
        txt(ctx, '?', tl.x, gy + 52, { size: 44, font: F.grot, weight: '700', color: '#e6efff', align: 'center', base: 'middle' });
      }
    }
    txt(ctx, tl.label, tl.x, y + 240, { size: 27, font: F.grot, weight: '700', color: '#fff', align: 'center' });
    txt(ctx, tl.sub, tl.x, y + 278, { size: 19, font: F.grot, color: 'rgba(255,255,255,.75)', align: 'center' });
    ctx.restore();
  });
  // welcome splash
  const wu = fade(t, EV.welcome, 0.4);
  if (wu > 0) {
    ctx.fillStyle = `rgba(90,126,220,${wu * 0.96})`; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = wu;
    ctx.translate(W / 2, H / 2 + 40); ctx.scale(0.8 + 0.2 * E.outCubic(wu), 0.8 + 0.2 * E.outCubic(wu));
    ctx.font = `italic 700 150px ${F.grot}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,30,110,.5)'; ctx.shadowBlur = 30;
    ctx.fillText('welcome', 0, 0);
    ctx.restore();
  }
  if (!clicked) drawCursor(ctx, cx, cy, 0);
}

// ================================================================ desktop + welcome window
function welcomeContent(ctx, x, y, w, h, t) {
  drawFlag(ctx, x + 46, y + 60, 1.9, t * 0.4, 1);
  txt(ctx, 'Welcome, Crimson Flow.', x + 260, y + 78, { size: 34, font: F.grot, weight: '700', color: '#1a2a5e' });
  const lines = [
    'Your Remy is your user account.',
    'Every window remembers where you left it.',
    'The Cabald cannot delete your hair.',
  ];
  lines.forEach((s, i) => {
    ctx.fillStyle = P.sel; ctx.beginPath(); ctx.arc(x + 274, y + 132 + i * 52, 5, 0, 7); ctx.fill();
    txt(ctx, s, x + 294, y + 141 + i * 52, { size: 25, font: F.grot, color: '#22304e' });
  });
  // OK button
  const bx = x + w - 150, by = y + h - 78;
  ctx.fillStyle = P.face; rrect(ctx, bx, by, 110, 46, 6); ctx.fill();
  ctx.strokeStyle = '#7f9db9'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(bx + 110, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + 46); ctx.stroke();
  txt(ctx, 'OK', bx + 55, by + 24, { size: 22, font: F.grot, weight: '600', color: '#22304e', align: 'center', base: 'middle' });
}

export function sceneDesktop(ctx, lt, t) {
  const z = lerp(1.03, 1.1, E.inOutCubic(seg(t, S.desktop, S.desktop + 9)));
  drawWall(ctx, { zoom: z, panY: 26 });
  drawKite(ctx, 1450, 470, 0.85, t);
  watermark(ctx, fade(t, 14.6, 0.6));
  const tbU = fade(t, EV.taskbarUp, 0.5);
  ctx.save();
  ctx.translate(0, (1 - tbU) * 60);
  taskbar(ctx, t, [{ icon: ART.h42, label: 'Welcome', active: true }]);
  ctx.restore();
  desktopIcons(ctx, t);
  // welcome window
  const openU = pop(t, EV.winOpen);
  const closeU = 1 - clamp((t - EV.winClose) / 0.25);
  const u = Math.min(openU, closeU);
  if (u > 0.01) {
    const r = xpWindow(ctx, { x: 560, y: 250, w: 800, h: 500, u, title: 'Welcome to Remy OS xp', icon: ART.h42 });
    if (r && u > 0.35) welcomeContent(ctx, r.x, r.y, r.w, r.h, t);
  }
  const [cx, cy] = path(t, [[14.2, 1580, 950], [17.8, 1240, 690], [21.3, 1298, 282], [21.6, 1298, 282]]);
  drawCursor(ctx, cx, cy, t >= EV.winClose && t < EV.winClose + 0.15 ? 1 : 0, EV.winClose, t);
}

// ================================================================ montage helpers
function appTag(overlay, t, t0, t1, text) {
  const uIn = fade(t, t0 + 0.25, 0.3), uOut = 1 - fade(t, t1 - 0.35, 0.3);
  const a = Math.min(uIn, uOut);
  if (a <= 0) return;
  overlay.save();
  overlay.globalAlpha = a;
  overlay.font = `600 30px ${F.grot}`;
  const tw = overlay.measureText(text).width;
  const x = 120, y = 910, h = 62;
  rrect(overlay, x, y, tw + 66, h, 14);
  overlay.fillStyle = 'rgba(8,14,34,.72)'; overlay.fill();
  overlay.strokeStyle = 'rgba(255,255,255,.25)'; overlay.lineWidth = 2; overlay.stroke();
  drawFlag(overlay, x + 14, y + 13, 0.42, t);
  overlay.fillStyle = '#fff'; overlay.textBaseline = 'middle'; overlay.textAlign = 'left';
  overlay.fillText(text, x + 62, y + h / 2 + 1);
  overlay.restore();
}

// ---- REMYAMP
function vuEnv(t, i) {
  const beat = (t * 2) % 1;
  const kick = Math.exp(-beat * 5), off = Math.exp(-Math.abs(beat - 0.5) * 7);
  const wK = 0.4 + 0.6 * hash(i * 13 + 1), wO = 0.4 + 0.6 * hash(i * 29 + 7);
  return clamp(0.16 + 0.5 * (kick * wK + off * wO) + 0.34 * hash(i * 7 + Math.floor(t * 2)));
}
const vuColor = (v) => (v < 0.55 ? '#29ce10' : v < 0.8 ? '#d6b521' : '#ef310f');

function winampContent(ctx, x, y, w, h, t) {
  const lt = t - S.winamp;
  // body
  ctx.fillStyle = g2(ctx, x, y, x, y + h, [[0, '#2a3345'], [0.5, '#1c2432'], [1, '#141a26']]);
  ctx.fillRect(x, y, w, h);
  // diagonal sheen
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  ctx.beginPath(); ctx.moveTo(x + w * 0.55, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w * 0.2, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  ctx.restore();
  // engraved grooves
  for (const gy of [y + 96, y + 292]) {
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 14, gy); ctx.lineTo(x + w - 14, gy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(x + 14, gy + 2); ctx.lineTo(x + w - 14, gy + 2); ctx.stroke();
  }
  // gold title strip
  ctx.fillStyle = g2(ctx, x, y + 12, x, y + 60, [[0, '#b87828'], [0.5, '#f0c068'], [1, '#b87828']]);
  rrect(ctx, x + 16, y + 12, w - 260, 48, 8); ctx.fill();
  txt(ctx, 'R E M Y A M P', x + 40, y + 37, { size: 26, font: F.grot, weight: '700', color: '#5a3c10', base: 'middle', track: 4 });
  // gold mini buttons
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#e0a040';
    rrect(ctx, x + w - 226 + i * 40, y + 20, 28, 28, 5); ctx.fill();
    ctx.strokeStyle = '#7a5a20'; ctx.lineWidth = 2; ctx.stroke();
  }
  // LCD time
  const lcdX = x + 24, lcdY = y + 80, lcdW = 250, lcdH = 100;
  ctx.fillStyle = '#0c1016'; rrect(ctx, lcdX, lcdY, lcdW, lcdH, 8); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = 'rgba(60,80,90,.35)';
  for (let gx = lcdX + 8; gx < lcdX + lcdW - 4; gx += 8) for (let gy = lcdY + 8; gy < lcdY + lcdH - 4; gy += 8) ctx.fillRect(gx, gy, 3, 3);
  const secs = Math.max(0, lt);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(Math.floor(secs % 60)).padStart(2, '0');
  txt(ctx, `${mm}:${ss}`, lcdX + lcdW / 2, lcdY + lcdH / 2 + 6, { size: 58, font: F.vt, color: P.lcd, align: 'center', base: 'middle' });
  txt(ctx, '16-BIT', lcdX + lcdW - 14, lcdY + 14, { size: 20, font: F.vt, color: '#2e5e2e', align: 'right' });
  // scrolling title
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 296, y + 80, w - 560, 100); ctx.clip();
  ctx.fillStyle = '#0c1016'; ctx.fillRect(x + 296, y + 80, w - 560, 100);
  const title = 'Remy Boys — A CUT ABOVE (16-Bit Remake) · from the LP “HOT 100, WEEK OF 10/10”';
  ctx.font = `44px ${F.vt}`;
  const tw2 = ctx.measureText(title).width;
  const off = ((lt * 90) % (tw2 + 200)) - 100;
  ctx.fillStyle = P.lcd; ctx.textBaseline = 'middle';
  ctx.fillText(title, x + 316 - off, y + 130);
  ctx.restore();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(x + 296, y + 80, w - 560, 100);
  // VU
  const vx = x + w - 244;
  ctx.fillStyle = '#0c1016'; rrect(ctx, vx, y + 80, 220, 100, 8); ctx.fill();
  for (let ch = 0; ch < 2; ch++) {
    for (let i = 0; i < 14; i++) {
      const v = vuEnv(t - ch * 0.013, ch * 14 + i);
      const bh = 8 + v * 78;
      ctx.fillStyle = vuColor(v);
      ctx.fillRect(vx + 14 + ch * 104 + i * 7, y + 172 - bh, 5, bh);
    }
  }
  // transport
  const trY = y + 200;
  const glyphs = ['|◀◀', '▶', '❚❚', '■', '▶▶|'];
  glyphs.forEach((gl, i) => {
    const bx = x + 24 + i * 86, by = trY;
    ctx.fillStyle = g2(ctx, bx, by, bx, by + 52, [[0, '#4a5262'], [0.5, '#39404e'], [1, '#232833']]);
    rrect(ctx, bx, by, 72, 52, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 2; ctx.stroke();
    const active = i === 1;
    if (active) { ctx.fillStyle = P.lcd; ctx.shadowColor = P.lcd; ctx.shadowBlur = 14; }
    else ctx.fillStyle = '#c9d2dd';
    txt(ctx, gl, bx + 36, by + 27, { size: 24, font: F.grot, weight: '700', align: 'center', base: 'middle' });
    ctx.shadowBlur = 0;
  });
  // position slider
  const psY = y + 278, psX = x + 24, psW = w - 48 - 150;
  ctx.strokeStyle = '#0a0e14'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(psX, psY); ctx.lineTo(psX + psW, psY); ctx.stroke();
  ctx.strokeStyle = '#3c4a5e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(psX, psY); ctx.lineTo(psX + psW * clamp(lt / 3.9), psY); ctx.stroke();
  ctx.fillStyle = '#c9d2dd';
  ctx.beginPath(); ctx.arc(psX + psW * clamp(lt / 3.9), psY, 11, 0, 7); ctx.fill();
  ctx.strokeStyle = '#0a0e14'; ctx.lineWidth = 2; ctx.stroke();
  // EQ sliders (kept inside the client area)
  for (let i = 0; i < 10; i++) {
    const ex = x + 24 + i * 58, ey = y + 304;
    ctx.fillStyle = '#0e131b'; ctx.fillRect(ex, ey, 14, 112);
    const pos = 0.5 + 0.38 * Math.sin(t * 2.6 + i * 1.7);
    ctx.fillStyle = '#39404e'; ctx.fillRect(ex + 5, ey + 6, 4, 100);
    ctx.fillStyle = i === 4 ? P.lcd : '#8a94a4';
    rrect(ctx, ex - 4, ey + 8 + (1 - pos) * 86, 22, 16, 4); ctx.fill();
  }
  // toggles + bolt badge
  ['SHA', 'REP'].forEach((lb, i) => {
    const tx = x + w - 214 + i * 74;
    txt(ctx, lb, tx + 18, y + 306, { size: 18, font: F.grot, weight: '700', color: P.lcd, align: 'center', base: 'middle' });
    ctx.fillStyle = P.lcd; ctx.shadowColor = P.lcd; ctx.shadowBlur = 10;
    ctx.fillRect(tx + 2, y + 320, 32, 6); ctx.fillRect(tx + 24, y + 320, 16, 6);
    ctx.shadowBlur = 0;
  });
  const bx3 = x + w - 134, by3 = y + 340;
  ctx.save();
  ctx.translate(bx3 + 40, by3 + 40); ctx.rotate(0.12);
  ctx.fillStyle = '#d9dde6'; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(40, 0); ctx.lineTo(0, 40); ctx.lineTo(-40, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = g2(ctx, -33, -33, 33, 33, [[0, '#f0c068'], [0.5, '#e0a040'], [1, '#b87828']]);
  ctx.beginPath(); ctx.arc(0, 0, 33, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a3c10';
  ctx.beginPath(); ctx.moveTo(6, -24); ctx.lineTo(-13, 6); ctx.lineTo(0, 6); ctx.lineTo(-6, 24); ctx.lineTo(15, -4); ctx.lineTo(2, -4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function sceneWinamp(ctx, lt, t, overlay) {
  const z = lerp(1.14, 1.2, E.inOutCubic(seg(t, S.winamp, S.winamp + 4)));
  drawWall(ctx, { zoom: z });
  watermark(ctx, 0.7);
  taskbar(ctx, t, [{ icon: ART.h42, label: 'RemyAmp' }, { icon: null, label: 'RemyAmp — 16-Bit Remakes', active: true }]);
  const u = pop(t, EV.slamA);
  const r = xpWindow(ctx, { x: 330, y: 160, w: 1260, h: 500, u, title: 'RemyAmp 2.91 — based skin', icon: ART.h42 });
  if (r && u > 0.4) winampContent(ctx, r.x, r.y, r.w, r.h, t);
  appTag(overlay, t, S.winamp, S.mines, 'REMYAMP · every chart hit, remade 16-bit');
}

// ---- Minesweeper
export function sceneMines(ctx, lt, t, overlay) {
  const z = lerp(1.12, 1.18, E.inOutCubic(seg(t, S.mines, S.mines + 4)));
  drawWall(ctx, { zoom: z });
  watermark(ctx, 0.7);
  taskbar(ctx, t, [{ icon: null, label: 'Games' }, { icon: null, label: 'Minesweeper', active: true }]);
  const u = pop(t, EV.slamB);
  const r = xpWindow(ctx, { x: 470, y: 130, w: 980, h: 760, u, title: 'Minesweeper', icon: ART.h42 });
  if (!r || u <= 0.4) { appTag(overlay, t, S.mines, S.jezzbald, 'MINESWEEPER · find the sleeping Cabald'); return; }
  const { x, y, w, h } = r;
  w9xPanel(ctx, x + 16, y + 16, w - 32, h - 32);
  const CW = 14, CH = 9, CS = 60, gx = x + (w - CW * CS) / 2, gy = y + 128;
  // header: LED counter, smiley, timer
  const led = (lx, str) => {
    ctx.fillStyle = '#000'; ctx.fillRect(lx, y + 34, 130, 62);
    ctx.strokeStyle = '#808080'; ctx.lineWidth = 3; ctx.strokeRect(lx, y + 34, 130, 62);
    txt(ctx, str, lx + 65, y + 66, { size: 54, font: F.vt, color: '#ff2020', align: 'center', base: 'middle' });
  };
  const flagged = t >= EV.flagPlant;
  led(x + 40, flagged ? '009' : '010');
  led(x + w - 170, '0' + String(38 + Math.floor((t - S.mines) * 1.4)).padStart(2, '0'));
  // smiley
  const smx = x + w / 2, smy = y + 65;
  ctx.fillStyle = '#c0c0c0'; rrect(ctx, smx - 32, smy - 32, 64, 64, 6); ctx.fill();
  ctx.beginPath(); ctx.arc(smx, smy, 24, 0, 7);
  ctx.fillStyle = '#f6d31f'; ctx.fill(); ctx.strokeStyle = '#8a6a10'; ctx.lineWidth = 2.5; ctx.stroke();
  if (flagged) {
    ctx.fillStyle = '#111';
    rrect(ctx, smx - 17, smy - 10, 14, 8, 2); ctx.fill();
    rrect(ctx, smx + 3, smy - 10, 14, 8, 2); ctx.fill();
    ctx.fillRect(smx - 3, smy - 12, 6, 10);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(smx, smy + 8, 10, 0.15, Math.PI - 0.15); ctx.stroke();
  } else {
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(smx - 9, smy - 7, 3.4, 0, 7); ctx.arc(smx + 9, smy - 7, 3.4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(smx, smy + 6, 9, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  // grid
  const nums = ['#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#666'];
  for (let rI = 0; rI < CH; rI++) {
    for (let cI = 0; cI < CW; cI++) {
      const i = rI * CW + cI;
      const cx2 = gx + cI * CS, cy2 = gy + rI * CS;
      const revT = EV.sweep0 + (0.18 * rI + 0.82 * cI / CW) * (EV.sweep1 - EV.sweep0);
      const isFlagCell = rI === 5 && cI === 10;
      const revealed = !ART.mines.mine[i] && t > revT;
      if (revealed) {
        ctx.fillStyle = '#d9d9d0'; ctx.fillRect(cx2, cy2, CS, CS);
        ctx.strokeStyle = '#b0b0a8'; ctx.lineWidth = 1; ctx.strokeRect(cx2 + 0.5, cy2 + 0.5, CS, CS);
        let n = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const rr = rI + dr, cc = cI + dc;
          if (rr >= 0 && rr < CH && cc >= 0 && cc < CW && ART.mines.mine[rr * CW + cc]) n++;
        }
        if (n) txt(ctx, String(n), cx2 + CS / 2, cy2 + CS / 2 + 2, { size: 34, font: F.grot, weight: '700', color: nums[n - 1], align: 'center', base: 'middle' });
      } else {
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(cx2, cy2, CS, CS);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(cx2 + CS, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + CS); ctx.stroke();
        ctx.strokeStyle = '#808080';
        ctx.beginPath(); ctx.moveTo(cx2, cy2 + CS); ctx.lineTo(cx2 + CS, cy2 + CS); ctx.lineTo(cx2 + CS, cy2); ctx.stroke();
        if (isFlagCell && t > EV.flagPlant - 0.02) {
          const fu = pop(t, EV.flagPlant);
          ctx.save();
          ctx.translate(cx2 + CS / 2, cy2 + CS / 2 - 4); ctx.scale(0.5 + 0.5 * fu, 0.5 + 0.5 * fu);
          ctx.globalAlpha = clamp(fu * 2);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(ART.h1217, -22, -18, 44, 44);
          ctx.imageSmoothingEnabled = true;
          ctx.strokeStyle = '#222'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-12, 24); ctx.lineTo(14, 24); ctx.stroke();
          ctx.fillStyle = '#e01010';
          ctx.beginPath(); ctx.moveTo(-10, -22); ctx.lineTo(12, -14); ctx.lineTo(-10, -6); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, -24); ctx.lineTo(-10, 24); ctx.stroke();
          ctx.restore();
        }
      }
    }
  }
  // sweep cursor
  const [cx, cy] = path(t, [
    [EV.sweep0 - 0.3, gx + 20, gy + 240], [EV.sweep0 + 0.4, gx + CW * CS - 60, gy + 100],
    [EV.sweep0 + 0.9, gx + 60, gy + 380], [EV.sweep0 + 1.4, gx + CW * CS - 80, gy + 300],
    [EV.flagPlant - 0.35, gx + 10 * CS + 30, gy + 5 * CS + 30],
    [EV.flagPlant + 0.5, gx + CW * CS - 130, gy - 40],
  ]);
  drawCursor(ctx, cx, cy, 0, EV.flagPlant, t);
  if (flagged && t < EV.flagPlant + 1.6) {
    const bu = fade(t, EV.flagPlant + 0.12, 0.2);
    txt(ctx, 'CABALD FOUND', gx + CW * CS / 2, gy - 26, { size: 34, font: F.grot, weight: '800', color: '#c40e0e', align: 'center', alpha: bu, base: 'middle', shadow: 'rgba(255,255,255,.75)', off: 2 });
  }
  appTag(overlay, t, S.mines, S.jezzbald, 'MINESWEEPER · find the sleeping Cabald');
}

// ---- JezzBald
const tri = (v) => { const m = ((v % 2) + 2) % 2; return m < 1 ? m : 2 - m; };

export function sceneJezz(ctx, lt, t, overlay) {
  const z = lerp(1.12, 1.18, E.inOutCubic(seg(t, S.jezzbald, S.jezzbald + 4)));
  drawWall(ctx, { zoom: z });
  watermark(ctx, 0.7);
  taskbar(ctx, t, [{ icon: null, label: 'Games' }, { icon: null, label: 'JezzBald', active: true }]);
  const u = pop(t, EV.slamC);
  const r = xpWindow(ctx, { x: 480, y: 140, w: 960, h: 680, u, title: 'JezzBald', icon: ART.h42 });
  if (!r || u <= 0.4) { appTag(overlay, t, S.jezzbald, S.pinball, 'JEZZBALD · box in the Cabald'); return; }
  const { x, y, w, h } = r;
  const fx0 = x + 18, fy0 = y + 18, fw = w - 36, fh = h - 92;
  w9xPanel(ctx, fx0, fy0, fw, fh);
  const field = { x: fx0 + 8, y: fy0 + 8, w: fw - 16, h: fh - 16 };
  ctx.fillStyle = '#05070c'; ctx.fillRect(field.x, field.y, field.w, field.h);
  // % counter
  const pct = t < 33.2 ? 4 : t < 34.2 ? lerp(4, 32, E.outCubic(seg(t, 33.2, 34.0))) : t < EV.boxed ? lerp(32, 60, E.outCubic(seg(t, 34.2, 35.0))) : 75;
  ctx.fillStyle = '#000'; ctx.fillRect(fx0 + fw - 130, y + h - 66, 114, 46);
  txt(ctx, `${String(Math.round(pct)).padStart(2, '0')}%`, fx0 + fw - 73, y + h - 43, { size: 40, font: F.vt, color: pct >= 75 ? P.lcd : '#ff2020', align: 'center', base: 'middle' });
  txt(ctx, 'AREA', fx0 + 16, y + h - 43, { size: 24, font: F.grot, weight: '700', color: '#333', base: 'middle' });
  // filled region (hair-blue)
  const frac = Math.min(0.78, pct / 96);
  const fW = field.w * frac;
  ctx.fillStyle = 'rgba(31,155,240,.34)';
  ctx.fillRect(field.x, field.y, fW, field.h);
  ctx.strokeStyle = 'rgba(120,210,255,.8)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(field.x + fW, field.y); ctx.lineTo(field.x + fW, field.y + field.h); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  for (let sy = field.y; sy < field.y + field.h; sy += 8) ctx.fillRect(field.x, sy, fW, 3);
  // dots grid on empty area
  ctx.fillStyle = 'rgba(90,120,170,.25)';
  for (let gy = field.y + 14; gy < field.y + field.h; gy += 28) for (let gx2 = Math.max(field.x + fW + 20, field.x + 14); gx2 < field.x + field.w; gx2 += 28) ctx.fillRect(gx2, gy, 3, 3);
  // two bouncing balls in the remaining region (kept left of the trap once it closes)
  const ballMaxX = () => (t >= EV.boxed ? field.x + field.w - 210 - 49 : field.x + field.w - 34);
  const ball = (ph, sx, sy2) => {
    const bx = lerp(field.x + fW + 34, ballMaxX(), tri(t * sx + ph));
    const by = lerp(field.y + 34, field.y + field.h - 34, tri(t * sy2 + ph * 1.7));
    for (let k = 3; k >= 0; k--) {
      const tb = t - k * 0.035;
      const tx = lerp(field.x + fW + 34, ballMaxX(), tri(tb * sx + ph));
      const ty = lerp(field.y + 34, field.y + field.h - 34, tri(tb * sy2 + ph * 1.7));
      ctx.globalAlpha = k === 0 ? 1 : 0.22 * (1 - k / 4);
      ctx.fillStyle = '#dfe9f5';
      ctx.beginPath(); ctx.arc(tx, ty, 15, 0, 7); ctx.fill();
      if (k === 0) { ctx.fillStyle = '#8fa6c4'; ctx.beginPath(); ctx.arc(tx - 4, ty + 4, 15, 2.4, 5.6); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    return [bx, by];
  };
  ball(0.1, 0.42, 0.31);
  ball(0.55, 0.36, 0.47);
  // boxed Cabald at the end
  if (t >= EV.boxed) {
    const bu = pop(t, EV.boxed);
    const bxc = field.x + field.w - 210, byc = field.y + field.h / 2 - 90;
    ctx.save();
    ctx.globalAlpha = clamp(bu * 1.4);
    ctx.strokeStyle = `rgba(137,60,59,${0.9})`; ctx.lineWidth = 6;
    ctx.strokeRect(bxc, byc, 180, 180);
    ctx.fillStyle = 'rgba(137,60,59,.18)'; ctx.fillRect(bxc, byc, 180, 180);
    ctx.translate(bxc + 90, byc + 96 + Math.sin(t * 9) * 5 * (1 - fade(t, EV.boxed + 1.2, 1)));
    ctx.rotate(Math.sin(t * 7) * 0.06 * (1 - fade(t, EV.boxed + 1.4, 1)));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ART.h5L, -56, -56, 112, 112);
    ctx.imageSmoothingEnabled = true;
    ctx.restore();
    if (fade(t, EV.boxed + 0.12, 0.25) > 0) {
      txt(ctx, 'AREA SECURED', field.x + fW / 2, field.y + 60, { size: 44, font: F.grot, weight: '700', color: '#dff2ff', align: 'center', base: 'middle', alpha: fade(t, EV.boxed + 0.12, 0.25) });
    }
  }
  appTag(overlay, t, S.jezzbald, S.pinball, 'JEZZBALD · box in the Cabald');
}

// ---- Pinball — the ball's keyframed path is absolute and always inside the window client area
const PIN = [
  [36.6, 1370, 800], [36.9, 1395, 330], [37.15, 1200, 230], [37.4, 1111, 454], [37.65, 1255, 554],
  [37.9, 1091, 664], [38.15, 900, 700], [38.4, 895, 795], [38.65, 640, 330], [38.9, 700, 250],
  [39.15, 760, 620], [39.5, 870, 795], [39.9, 1340, 760],
];
function pinPos(t) {
  if (t <= PIN[0][0]) return [PIN[0][1], PIN[0][2]];
  for (let i = 1; i < PIN.length; i++) {
    if (t < PIN[i][0]) {
      const u = E.inOutCubic(seg(t, PIN[i - 1][0], PIN[i][0]));
      return [lerp(PIN[i - 1][1], PIN[i][1], u), lerp(PIN[i - 1][2], PIN[i][2], u)];
    }
  }
  const l = PIN[PIN.length - 1]; return [l[1], l[2]];
}

export function scenePinball(ctx, lt, t, overlay) {
  const z = lerp(1.12, 1.18, E.inOutCubic(seg(t, S.pinball, S.pinball + 4)));
  drawWall(ctx, { zoom: z });
  watermark(ctx, 0.7);
  taskbar(ctx, t, [{ icon: null, label: 'Games' }, { icon: null, label: '3D Pinball — Base Cadet', active: true }]);
  const u = pop(t, EV.slamD);
  const r = xpWindow(ctx, { x: 470, y: 120, w: 980, h: 780, u, title: '3D Pinball for Remy OS — Base Cadet', icon: ART.h42 });
  if (!r || u <= 0.4) { appTag(overlay, t, S.pinball, S.switchA, '3D PINBALL · Base Cadet'); return; }
  const { x, y, w, h } = r;
  const tx = x + 18, ty = y + 18, tw = w - 36, th = h - 36;
  ctx.fillStyle = g2(ctx, tx, ty, tx, ty + th, [[0, '#16225a'], [0.6, '#0e1740'], [1, '#0a1130']]);
  ctx.fillRect(tx, ty, tw, th);
  ctx.strokeStyle = '#2e4a9e'; ctx.lineWidth = 2;
  ctx.strokeRect(tx + 1, ty + 1, tw - 2, th - 2);
  // curved lanes
  ctx.strokeStyle = 'rgba(110,150,240,.4)';
  ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(tx + tw / 2, ty + th / 2, 300, Math.PI, 2 * Math.PI); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(tx + tw - 70, ty + th - 40); ctx.lineTo(tx + tw - 70, ty + 210); ctx.stroke(); // plunger lane
  // arc title, kept clear of the score panel on the right
  txt(ctx, 'B A S E   C A D E T', tx + 300, ty + 64, { size: 38, font: F.grot, weight: '700', color: '#e8b23a', align: 'center', glow: 'rgba(232,178,58,.5)' });
  // score
  const score = 250000 + Math.floor(clamp((t - 36.6) / 3.3) * 2400000);
  ctx.fillStyle = '#05070c'; rrect(ctx, tx + tw - 330, ty + 14, 300, 64, 8); ctx.fill();
  txt(ctx, score.toLocaleString('en-US'), tx + tw - 180, ty + 46, { size: 40, font: F.vt, color: '#e02020', align: 'center', base: 'middle' });
  // bumpers
  const bumps = [[tx + 620, ty + 260], [tx + 764, ty + 360], [tx + 600, ty + 470]];
  const hits = [37.4, 37.65, 37.9];
  bumps.forEach(([bx, by], i) => {
    const lit = Math.max(0, 1 - Math.abs(t - hits[i]) / 0.22);
    ctx.beginPath(); ctx.arc(bx, by, 42, 0, 7);
    ctx.fillStyle = lit > 0.1 ? `rgba(255,${Math.round(140 + 80 * (1 - lit))},60,${0.55 + 0.4 * lit})` : 'rgba(70,100,210,.75)';
    ctx.fill();
    ctx.strokeStyle = '#9fb4ff'; ctx.lineWidth = 4; ctx.stroke();
    if (lit > 0.1) {
      ctx.strokeStyle = `rgba(255,220,140,${lit})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(bx, by, 46 + (1 - lit) * 30, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = '#dfe9ff';
    ctx.beginPath(); ctx.arc(bx - 12, by - 14, 9, 0, 7); ctx.fill();
  });
  // chasing lights along the top arc
  for (let i = 0; i < 22; i++) {
    const a = Math.PI + (i / 21) * Math.PI;
    const lx = tx + tw / 2 + Math.cos(a) * 322, ly = ty + th / 2 + Math.sin(a) * 322;
    const on = (i + Math.floor(t * 8)) % 6 === 0;
    ctx.fillStyle = on ? '#ffd25e' : 'rgba(90,110,190,.4)';
    ctx.beginPath(); ctx.arc(lx, ly, on ? 7 : 4.5, 0, 7); ctx.fill();
  }
  // flippers
  const flipU = clamp(seg(t, 38.28, 38.5)) * clamp(1 - seg(t, 38.62, 38.85));
  const ang = -0.95 * E.outCubic(flipU);
  const flip = (fx, fy, dir) => {
    ctx.save();
    ctx.translate(fx, fy); ctx.rotate(dir * (0.28 + ang));
    ctx.fillStyle = '#d9e2ff';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(96, -18); ctx.lineTo(104, 2); ctx.lineTo(-6, 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5f74c8'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  };
  flip(tx + 340, ty + th - 70, 1);
  flip(tx + 480, ty + th - 70, -1);
  // ball + trail
  const [bx, by] = pinPos(t);
  for (let k = 5; k >= 0; k--) {
    const [tx2, ty2] = pinPos(t - k * 0.03);
    ctx.globalAlpha = k === 0 ? 1 : 0.4 * (1 - k / 6);
    const gr = ctx.createRadialGradient(tx2 - 4, ty2 - 4, 1, tx2, ty2, 11);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#c9d4e6'); gr.addColorStop(1, '#5c6c8c');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(tx2, ty2, 11, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // multiplier flash
  if (t >= EV.mult && t < EV.mult + 1.4) {
    const mu = fade(t, EV.mult, 0.15) * (1 - fade(t, EV.mult + 1.0, 0.4));
    txt(ctx, '3× MULTIPLIER', tx + tw / 2, ty + 150, { size: 46, font: F.grot, weight: '700', color: '#ffd25e', align: 'center', base: 'middle', alpha: mu, glow: 'rgba(255,180,60,.6)' });
  }
  appTag(overlay, t, S.pinball, S.switchA, '3D PINBALL · Base Cadet');
}

// ================================================================ testimonials
export function sceneSwitch(ctx, lt, t, which) {
  const portrait = which === 'a' ? ART.p909 : ART.p908;
  const t0 = which === 'a' ? EV.portA : EV.portB;
  ctx.fillStyle = g2(ctx, 0, 0, 0, H, [[0, '#191c26'], [1, '#0d0f16']]);
  ctx.fillRect(0, 0, W, H);
  const rg = ctx.createRadialGradient(660, 480, 80, 660, 480, 900);
  rg.addColorStop(0, 'rgba(120,150,230,.16)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  txt(ctx, 'R E M Y   O S   ·   R E A L   U S E R S', W / 2, 120, { size: 26, font: F.grot, weight: '600', color: '#ffd9a0', align: 'center', track: 2, alpha: fade(t, t0, 0.5) });
  const u = pop(t, t0);
  if (u > 0) {
    ctx.save();
    const px = 350, py = 190, ps = 620;
    ctx.translate(px + ps / 2, py + ps / 2);
    const s = 0.86 + 0.14 * u;
    ctx.scale(s, s); ctx.rotate((1 - u) * 0.03);
    ctx.translate(-(px + ps / 2), -(py + ps / 2));
    ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
    ctx.fillStyle = '#2a2620'; ctx.fillRect(px - 30, py - 30, ps + 60, ps + 60);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#b8963e'; ctx.lineWidth = 4; ctx.strokeRect(px - 10, py - 10, ps + 20, ps + 20);
    ctx.drawImage(portrait, px, py, ps, ps);
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + ps * 0.55, py); ctx.lineTo(px + ps * 0.2, py + ps); ctx.lineTo(px, py + ps); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // big quote mark
  txt(ctx, '“', 1120, 560, { size: 300, font: F.serif, color: '#ffd9a0', alpha: fade(t, t0 + 0.2, 0.5) * 0.9 });
}

// ================================================================ the Cabald turn
function errDialog(ctx, x, y, u, i, t, head) {
  if (u <= 0.01) return;
  ctx.save();
  const s = 0.7 + 0.3 * clamp(u, 0, 1);
  ctx.translate(x + 230, y + 115); ctx.scale(s, s); ctx.rotate((hash(i * 17 + 3) - 0.5) * 0.07);
  ctx.translate(-230, -115);
  ctx.globalAlpha = clamp(u * 2);
  ctx.shadowColor = 'rgba(10,10,40,.55)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
  ctx.fillStyle = P.face; rrect(ctx, 0, 0, 460, 230, 4); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = g2(ctx, 0, 0, 0, 56, [[0, '#0a5ef0'], [0.6, '#0055e3'], [1, '#003494']]);
  ctx.beginPath(); ctx.roundRect(3, 3, 454, 54, [4, 4, 0, 0]); ctx.fill();
  txt(ctx, 'baldestd.exe', 66, 31, { size: 24, font: F.grot, weight: '700', color: '#fff', base: 'middle' });
  ctx.fillStyle = '#c23b00';
  ctx.beginPath(); ctx.roundRect(408, 12, 40, 36, 6); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(420, 22); ctx.lineTo(436, 38); ctx.moveTo(436, 22); ctx.lineTo(420, 38); ctx.stroke();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(head, 34, 84, 60, 60);
  ctx.imageSmoothingEnabled = true;
  txt(ctx, 'Rug detected.', 116, 108, { size: 26, font: F.grot, weight: '700', color: '#1a2a5e' });
  txt(ctx, 'Hair could not be verified.', 116, 146, { size: 24, font: F.grot, color: '#333' });
  for (let b = 0; b < 2; b++) {
    const bx = 190 + b * 130, by = 176;
    ctx.fillStyle = P.face; rrect(ctx, bx, by, 112, 40, 5); ctx.fill();
    ctx.strokeStyle = '#7f9db9'; ctx.lineWidth = 2; ctx.stroke();
    txt(ctx, b ? 'Report' : 'OK', bx + 56, by + 21, { size: 21, font: F.grot, weight: '600', color: '#22304e', align: 'center', base: 'middle' });
  }
  ctx.restore();
}

export function sceneCabald(ctx, lt, t) {
  const shake = t >= EV.bigDlg && t < EV.bigDlg + 0.5 ? 10 * Math.exp(-(t - EV.bigDlg) * 9) : 0;
  ctx.save();
  ctx.translate(Math.sin(t * 91) * shake, Math.cos(t * 83) * shake * 0.7);
  const z = lerp(1.1, 1.14, E.inOutCubic(seg(t, S.cabald, S.cabald + 6)));
  drawWall(ctx, { zoom: z });
  ctx.fillStyle = 'rgba(24,34,84,.28)'; ctx.fillRect(0, 0, W, H);
  watermark(ctx, 0.5);
  const tasks = [];
  for (let i = 0; i < 6; i++) tasks.push({ icon: ART.h5, label: 'baldestd.exe', red: true });
  taskbar(ctx, t, tasks);
  // dialogs: seeded cascade
  DLG.forEach((t0, i) => {
    const u = pop(t, t0);
    const dx = 210 + (i % 3) * 470 + hash(i * 13) * 70;
    const dy = 190 + Math.floor(i / 3) * 280 + hash(i * 29) * 50;
    errDialog(ctx, dx, dy, u, i, t, i % 2 ? ART.h5 : ART.h1217);
  });
  // big central dialog
  if (t >= EV.bigDlg) {
    const u = pop(t, EV.bigDlg);
    ctx.save();
    ctx.globalAlpha = clamp(u * 2);
    const x = W / 2 - 400, y = 300;
    ctx.shadowColor = 'rgba(0,0,20,.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
    ctx.fillStyle = P.face; rrect(ctx, x, y, 800, 380, 6); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = g2(ctx, x, y, x, y + 60, [[0, '#7d1a1a'], [0.6, '#a12020'], [1, '#5a0e0e']]);
    ctx.beginPath(); ctx.roundRect(x + 3, y + 3, 794, 56, [6, 6, 0, 0]); ctx.fill();
    txt(ctx, 'CABALD.EXE', x + 24, y + 32, { size: 26, font: F.grot, weight: '700', color: '#fff', base: 'middle' });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ART.h1217, x + 56, y + 110, 140, 140);
    ctx.imageSmoothingEnabled = true;
    txt(ctx, 'The Cabald has performed', x + 240, y + 140, { size: 40, font: F.grot, weight: '700', color: '#7d1a1a' });
    txt(ctx, 'an illegal haircut.', x + 240, y + 190, { size: 40, font: F.grot, weight: '700', color: '#7d1a1a' });
    txt(ctx, 'All hair checks will fail until this is resolved.', x + 240, y + 238, { size: 24, font: F.grot, color: '#444' });
    ['OK', 'Ignore', 'Panic'].forEach((lb, b) => {
      const bx = x + 210 + b * 180, by = y + 296;
      ctx.fillStyle = P.face; rrect(ctx, bx, by, 150, 46, 5); ctx.fill();
      ctx.strokeStyle = '#7f9db9'; ctx.lineWidth = 2; ctx.stroke();
      txt(ctx, lb, bx + 75, by + 24, { size: 22, font: F.grot, weight: '600', color: '#22304e', align: 'center', base: 'middle' });
    });
    ctx.restore();
  }
  // frantic cursor: ping-pongs between dialog OK buttons, always losing
  const ci = Math.min(DLG.length - 1, Math.floor((t - EV.d0) / EV.dStep));
  const dx = 210 + (ci % 3) * 470 + hash(ci * 13) * 70 + 246, dy = 190 + Math.floor(ci / 3) * 280 + hash(ci * 29) * 50 + 196;
  const [cx, cy] = path(t, [[S.cabald, 900, 500], [EV.d0 + 0.1, dx, dy], [EV.d0 + EV.dStep * 0.9, dx, dy]]);
  if (t < EV.bigDlg) drawCursor(ctx, cx, cy, (t - EV.d0) % EV.dStep < 0.12 ? 1 : 0, DLG[Math.max(0, ci)], t);
  else drawCursor(ctx, cx, cy, 0);
  ctx.restore();
}

// ================================================================ system restore
function startMenu(ctx, t, u, hover) {
  if (u <= 0.01) return;
  const x = 10, y = H - 60 - 660, w = 520, h = 660;
  ctx.save();
  ctx.globalAlpha = clamp(u * 2);
  ctx.translate(30, (1 - clamp(u)) * -30);
  ctx.shadowColor = 'rgba(0,10,50,.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fff'; rrect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  // header
  ctx.fillStyle = g2(ctx, x, y, x, y + 130, [[0, '#1a55c8'], [0.6, '#0a3a9e'], [1, '#062a80']]);
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w - 6, 127, [8, 8, 0, 0]); ctx.fill();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ART.h42L, x + 26, y + 26, 80, 80);
  ctx.imageSmoothingEnabled = true;
  txt(ctx, 'Crimson Flow', x + 126, y + 62, { size: 32, font: F.grot, weight: '700', color: '#fff' });
  txt(ctx, 'crimson@basedremyboys.club', x + 126, y + 100, { size: 20, font: F.grot, color: '#bcd4ff' });
  // orange divider
  ctx.fillStyle = g2(ctx, x, y + 130, x + w, y + 130, [[0, '#f7b261'], [0.5, '#e2822a'], [1, '#c86418']]);
  ctx.fillRect(x + 6, y + 130, w - 12, 8);
  // items
  const items = [
    ['Remy Vault', 0], ['Recovery Center', 1], ['Approvals Manager', 2], ['—', -1], ['All Programs', -1], ['Games', 3], ['RemyAmp', 4], ['Films', 5],
  ];
  items.forEach(([label, gi], i) => {
    const iy = y + 152 + i * 56;
    const hv = i === hover;
    if (hv) { ctx.fillStyle = P.sel; rrect(ctx, x + 14, iy - 6, w - 28, 50, 6); ctx.fill(); }
    if (label === '—') { ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 20, iy + 18); ctx.lineTo(x + w - 20, iy + 18); ctx.stroke(); return; }
    ctx.fillStyle = gi >= 0 ? '#e8a33d' : (i === 4 ? '#1a5a20' : '#4a6a9e');
    rrect(ctx, x + 26, iy, 34, 34, 6); ctx.fill();
    ctx.fillStyle = '#fff';
    if (i === 4) { txt(ctx, '▸', x + 43, iy + 18, { size: 24, font: F.grot, weight: '700', align: 'center', base: 'middle' }); }
    else { ctx.beginPath(); ctx.arc(x + 43, iy + 17, 9, 0, 7); ctx.fill(); }
    txt(ctx, label, x + 76, iy + 18, { size: 25, font: F.grot, weight: i === 4 ? '700' : '500', color: i === 4 ? '#1a5a20' : '#22304e', base: 'middle' });
  });
  // footer
  ctx.fillStyle = g2(ctx, x, y + h - 62, x, y + h, [[0, '#1a55c8'], [1, '#062a80']]);
  ctx.beginPath(); ctx.roundRect(x + 3, y + h - 60, w - 6, 57, [0, 0, 8, 8]); ctx.fill();
  txt(ctx, 'Log Off', x + 120, y + h - 31, { size: 24, font: F.grot, color: '#fff', align: 'center', base: 'middle' });
  txt(ctx, 'Turn Off Computer', x + 360, y + h - 31, { size: 24, font: F.grot, color: '#fff', align: 'center', base: 'middle' });
  ctx.restore();
}

export function sceneRestore(ctx, lt, t) {
  const z = lerp(1.1, 1.06, E.inOutCubic(seg(t, S.restore, S.restore + 8)));
  drawWall(ctx, { zoom: z });
  watermark(ctx, 0.75);
  taskbar(ctx, t, [{ icon: null, label: 'baldestd.exe', red: t < 57 }, { icon: null, label: 'System Restore', active: true }]);
  // leftover dialogs vacuum away as the bar progresses (linear march, like the real thing)
  const prog = seg(t, EV.bar0, EV.bar1);
  DLG.forEach((t0, i) => {
    const alive = 1 - seg(prog, (i + 0.2) / (DLG.length + 2), (i + 1.2) / (DLG.length + 2));
    if (alive <= 0 || t < t0) return;
    const dx = 210 + (i % 3) * 470 + hash(i * 13) * 70, dy = 190 + Math.floor(i / 3) * 280 + hash(i * 29) * 50;
    const su = lerp(1, 0.12, 1 - alive), sa = alive;
    ctx.save();
    ctx.globalAlpha = sa;
    ctx.translate(lerp(dx, 120, 1 - alive), lerp(dy, H - 180, 1 - alive));
    ctx.scale(su, su);
    errDialog(ctx, 0, 0, 1, i, t, i % 2 ? ART.h5 : ART.h1217);
    ctx.restore();
  });
  startMenu(ctx, t, t >= EV.menu ? (t < EV.pick + 0.5 ? pop(t, EV.menu) : 1 - clamp((t - EV.pick - 0.35) / 0.3)) : 0, t >= EV.pick - 0.5 ? 4 : (t > EV.menu + 0.7 ? 1 : 0));
  // restore window
  const u = pop(t, EV.pick + 0.25);
  if (u > 0.01) {
    const r = xpWindow(ctx, { x: 460, y: 150, w: 1000, h: 660, u, title: 'System Restore', icon: ART.h42 });
    if (r && u > 0.4) {
      const { x, y, w, h } = r;
      ctx.fillStyle = P.face; ctx.fillRect(x, y, w, h);
      // left: calendar
      ctx.fillStyle = '#f6f4ea'; ctx.fillRect(x, y, 360, h);
      txt(ctx, 'October 2026', x + 180, y + 40, { size: 28, font: F.grot, weight: '700', color: '#22304e', align: 'center' });
      for (let d = 0; d < 31; d++) {
        const col = d % 7, row = Math.floor(d / 7);
        const dx = x + 34 + col * 44, dy = y + 74 + row * 46;
        const isRP = d === 8;
        if (isRP) { ctx.fillStyle = P.sel; ctx.beginPath(); ctx.arc(dx + 14, dy + 14, 18, 0, 7); ctx.fill(); }
        txt(ctx, String(d + 1), dx + 14, dy + 15, { size: 20, font: F.grot, weight: isRP ? '700' : '400', color: isRP ? '#fff' : '#556', align: 'center', base: 'middle' });
      }
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#7f9db9'; ctx.lineWidth = 2;
      rrect(ctx, x + 24, y + h - 150, 312, 110, 6); ctx.fill(); ctx.stroke();
      txt(ctx, 'Restore point', x + 40, y + h - 122, { size: 20, font: F.grot, weight: '700', color: '#1a5a20' });
      txt(ctx, 'Oct 9 — “Before the Cabald update”', x + 40, y + h - 92, { size: 19, font: F.grot, color: '#333' });
      // right: status + progress
      const px = x + 400, pw = w - 440;
      const done = t >= EV.bar1;
      txt(ctx, done ? 'Restore complete.' : 'Restoring hair…', px + 10, y + 56, { size: 34, font: F.grot, weight: '700', color: done ? '#1a7a20' : '#22304e' });
      const steps = [['Deleting baldestd.exe', 57.0], ['Unshearing temples', 58.2], ['Re-combing the desktop', 59.4]];
      steps.forEach(([s, at], i) => {
        const on = t >= at;
        ctx.globalAlpha = on ? 1 : 0.25;
        ctx.fillStyle = on ? '#1a7a20' : '#889';
        ctx.font = `600 25px ${F.grot}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText((on ? '✓ ' : '· ') + s, px + 10, y + 130 + i * 52);
        ctx.globalAlpha = 1;
      });
      // progress track + marching blocks + the runner
      const bx = px + 10, bw2 = pw - 20, by = y + h - 190;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#7f9db9'; ctx.lineWidth = 2.5;
      rrect(ctx, bx, by, bw2, 48, 8); ctx.fill(); ctx.stroke();
      const fill = done ? 1 : prog;
      for (let bxi = bx + 6; bxi < bx + 6 + (bw2 - 12) * fill; bxi += 26) {
        ctx.fillStyle = (Math.floor((bxi - bx) / 26) % 2) ? '#3fa53f' : '#2f8f2f';
        ctx.fillRect(bxi, by + 7, 20, 34);
      }
      if (done) {
        txt(ctx, 'hair verified', bx + bw2 - 10, by + 64, { size: 22, font: F.grot, weight: '700', color: '#1a7a20', align: 'right' });
      }
      // confetti at done
      if (t >= EV.bar1) {
        for (let i = 0; i < 14; i++) {
          const age = t - EV.bar1;
          if (age > 1.6) break;
          const a = hash(i * 31) * Math.PI * 2, sp = 300 + hash(i * 7) * 380;
          ctx.fillStyle = P.flag[i % 4];
          ctx.globalAlpha = 1 - age / 1.6;
          ctx.fillRect(bx + bw2 + Math.cos(a) * sp * age * 0.5, by + 24 + Math.sin(a) * sp * age - 260 * age * age, 10, 14);
          ctx.globalAlpha = 1;
        }
      }
      // #42 scrubbing the bar (planted, with a contact shadow)
      if (!done || t < EV.bar1 + 0.8) {
        const rx = bx + 20 + (bw2 - 40) * fill;
        ctx.fillStyle = 'rgba(60,70,90,.28)';
        ctx.beginPath(); ctx.ellipse(rx, by + 53, 44, 9, 0, 0, 7); ctx.fill();
        A.drawRemy(ctx, ART.hero, rx, by + 52, { ...run(rx), flip: false, sx: 1.25, sy: 1.25, glow: '#ffe27a', glowA: 0.25 });
      }
    }
  }
  // cursor
  const [cx, cy] = path(t, [
    [S.restore, 120, H - 100], [EV.menu + 0.3, 250, H - 420], [EV.pick - 0.2, 300, H - 468],
    [EV.pick + 0.6, 960, 470], [EV.pick + 1.0, 960, 470],
  ]);
  drawCursor(ctx, cx, cy, 0, EV.pick, t);
}

// ================================================================ title + outro
export function sceneTitle(ctx, lt, t) {
  drawWall(ctx, { zoom: 1.02 });
  const ky = lerp(800, 320, E.outCubic(seg(t, 62.0, 66.0)));
  drawKite(ctx, 1420, ky, 1.2, t);
  watermark(ctx, 0.9);
  // big flag
  const fu = pop(t, 62.15);
  if (fu > 0) drawFlag(ctx, W / 2 - 250, 210, 5, t * 1.2, clamp(fu * 1.3));
  // wordmark slam
  const wu = pop(t, EV.slamTitle);
  if (wu > 0) {
    ctx.save();
    const s = lerp(1.9, 1, clamp(wu, 0, 1));
    ctx.translate(W / 2, 700); ctx.scale(s, s); ctx.rotate((1 - clamp(wu)) * 0.04); ctx.translate(-W / 2, -700);
    wordmark(ctx, W / 2, 700, 148, clamp(wu * 1.6));
    ctx.restore();
  }
  const su = fade(t, EV.subTitle, 0.5);
  if (su > 0) txt(ctx, 'Based Edition · Build 4490', W / 2, 770, { size: 40, font: F.grot, weight: '600', color: '#f2f6ff', align: 'center', alpha: su, track: 2 });
  const uu = fade(t, EV.url, 0.5);
  if (uu > 0) {
    txt(ctx, 'basedremyboys.club', W / 2, 954, { size: 38, font: F.grot, weight: '700', color: '#ffffff', align: 'center', alpha: uu, track: 1, glow: 'rgba(0,40,120,.55)' });
    ctx.strokeStyle = `rgba(255,217,160,${uu * 0.8})`; ctx.lineWidth = 2;
    const wRule = 300;
    ctx.beginPath(); ctx.moveTo(W / 2 - wRule, 940); ctx.lineTo(W / 2 - 190, 940); ctx.moveTo(W / 2 + 190, 940); ctx.lineTo(W / 2 + wRule, 940); ctx.stroke();
    txt(ctx, '© 2026 Based Remy Boys · hair not included', W / 2, 1014, { size: 22, font: F.grot, color: 'rgba(255,255,255,.75)', align: 'center', alpha: uu });
  }
}

export function sceneOutro(ctx, lt, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const u = pop(t, EV.startIn);
  if (u > 0) {
    const press = t >= EV.curClick2 && t < EV.curClick2 + 0.25 ? 1 : 0;
    ctx.save();
    ctx.globalAlpha = clamp(u * 1.5);
    const bx = 120, by = H - 280, bw = 250, bh = 78;
    // soft green aura so the button doesn't float in the void
    const aura = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 20, bx + bw / 2, by + bh / 2, 320);
    aura.addColorStop(0, 'rgba(64,170,64,.22)'); aura.addColorStop(1, 'rgba(64,170,64,0)');
    ctx.fillStyle = aura; ctx.fillRect(0, by - 300, bx + bw + 320, bh + 640);
    ctx.translate(0, press * 3);
    ctx.fillStyle = press
      ? g2(ctx, bx, by, bx, by + bh, [[0, '#2a6f2a'], [0.5, '#3c8f3c'], [1, '#1d5a1d']])
      : g2(ctx, bx, by, bx, by + bh, [[0, P.startA], [0.4, P.startB], [1, P.startC]]);
    ctx.beginPath(); ctx.roundRect(bx, by, bw - press * 4, bh, [10, 10, 16, 16]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2.5; ctx.stroke();
    drawFlag(ctx, bx + 26, by + 16, 0.55, t);
    ctx.font = `italic 700 40px ${F.grot}`;
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,40,0,.6)'; ctx.shadowOffsetY = 2;
    ctx.fillText('start', bx + 108, by + bh / 2 + 1);
    ctx.restore();
  }
  if (t < EV.blackout) {
    const [cx, cy] = path(t, [[S.outro, 1500, H - 60], [EV.curClick2 - 0.1, 260, H - 241]]);
    drawCursor(ctx, cx, cy, t >= EV.curClick2 && t < EV.curClick2 + 0.15 ? 1 : 0, EV.curClick2, t);
  }
}
