// Title card (attract screen) and the end-of-floor intermission tally, at the game's native 640×360.
import { hash } from 'filmkit/lib.js';
import { canvas, drawRemy } from '../remy-bros/art.js';
import { LW, LH, TALLY, G_END } from './choreo.js';
import { ART, text, FONT, drawGame } from './game.js';
import { Px } from './tex.js';
import * as AC from './actors.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeOut = (t) => 1 - (1 - t) ** 3;
const fill = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
const S = {};

export function prepareScreens() {
  S.title = canvas(LW, LH);
  S.tally = canvas(LW, LH);
  S.mix = canvas(LW, LH);
  // stone backdrop tile (2× texels)
  const p = new Px(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const row = Math.floor(y / 16), off = row % 2 ? 16 : 0, bx = Math.floor((x + off) / 32);
      let v = 70 + hash(row * 9 + bx) * 26 + (hash(x * 31 + y * 7) - 0.5) * 14;
      if (y % 16 === 0 || (x + off) % 32 === 0) v = 24;
      else if (y % 16 === 1 || (x + off) % 32 === 1) v += 16;
      p.set(x, y, [v, v, v + 8]);
    }
  S.stone = p.canvas();
  S.logo = logoCanvas('REMYSTEIN', 46);
  S.logo3d = logo3D();
}

// Extruded pixel logo: dark extrusion, black outline, molten gradient face.
function logoCanvas(s, size) {
  const c = canvas(Math.round(s.length * size + 40), Math.round(size + 30)), x = c.getContext('2d');
  x.font = `${size}px ${FONT}`;
  x.textBaseline = 'top';
  for (let d = 10; d >= 1; d--) { x.fillStyle = d > 8 ? '#000000' : `rgb(${90 - d * 6},${8},${10})`; x.fillText(s, 6 + d * 0.8, 6 + d); }
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [2, -2], [-2, 2]]) { x.fillStyle = '#000'; x.fillText(s, 6 + dx, 6 + dy); }
  const g = x.createLinearGradient(0, 6, 0, 6 + size);
  g.addColorStop(0, '#fff6a0'); g.addColorStop(0.3, '#ffc030'); g.addColorStop(0.62, '#f05010'); g.addColorStop(1, '#a80c0c');
  x.fillStyle = g;
  x.fillText(s, 6, 6);
  // hard pixel highlight line
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(255,255,255,0.55)';
  x.fillRect(0, 6 + Math.round(size * 0.12), c.width, Math.max(2, Math.round(size / 16)));
  return c;
}
function logo3D() {
  const size = 32, c = canvas(140, 70), x = c.getContext('2d');
  x.font = `${size}px ${FONT}`; x.textBaseline = 'top';
  for (let d = 8; d >= 1; d--) { x.fillStyle = `rgb(10,${20 + d * 4},${80 + d * 6})`; x.fillText('3D', 8 + d, 8 + d); }
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) { x.fillStyle = '#000'; x.fillText('3D', 8 + dx, 8 + dy); }
  const g = x.createLinearGradient(0, 8, 0, 8 + size);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#a8c8ff'); g.addColorStop(0.55, '#5a7ad8'); g.addColorStop(1, '#c8e0ff');
  x.fillStyle = g; x.fillText('3D', 8, 8);
  return c;
}

export function drawTitle(lt) {
  const x = S.title.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  for (let ty = 0; ty < LH; ty += 128) for (let tx = 0; tx < LW; tx += 128) x.drawImage(S.stone, tx, ty, 128, 128);
  // red torch glow behind the logo, flickering
  const fl = 0.85 + 0.15 * Math.sin(lt * 31) * Math.sin(lt * 13);
  const gr = x.createRadialGradient(LW / 2, 120, 10, LW / 2, 120, 380);
  gr.addColorStop(0, `rgba(255,90,30,${0.5 * fl})`); gr.addColorStop(0.5, 'rgba(120,20,10,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0.75)');
  x.fillStyle = gr; x.fillRect(0, 0, LW, LH);
  // floor band + bald guards (backlit) on the right, hero on the left
  fill(x, 'rgba(0,0,0,0.55)', 0, 300, LW, 60);
  const enter = easeOut(clamp01((lt - 0.15) / 0.35));
  [[5, 470, 1], [233, 528, 0], [1217, 590, 1]].forEach(([id, gx, f], i) => {
    const R = ART.guards[id];
    const bob = Math.round(Math.sin(lt * 9 + i) * 1);
    x.save();
    x.translate(Math.round(gx + (1 - enter) * 220), 352 + bob);
    x.scale(1.7, 1.7);
    drawRemy(x, R, 0, 0, { flip: f === 1, glow: '#ff3020', glowA: 0.6 });
    x.restore();
  });
  x.save(); x.fillStyle = 'rgba(40,0,0,0.45)'; x.fillRect(420, 150, 220, 210); x.restore();
  x.save();
  x.translate(Math.round(108 - (1 - enter) * 240), 356);
  x.scale(2.2, 2.2);
  drawRemy(x, ART.hero, 0, 0, { glow: '#ffd060', glowA: 0.55 });
  x.restore();
  // logo slam
  const t0 = 0.1, a = lt - t0;
  if (a >= 0) {
    const sc = a < 0.12 ? 2.4 - 1.4 * (a / 0.12) : 1 + 0.06 * Math.exp(-(a - 0.12) * 12) * Math.sin((a - 0.12) * 50);
    x.save();
    x.translate(LW / 2, 70);
    x.scale(sc, sc);
    x.globalAlpha = clamp01(a / 0.05);
    x.drawImage(S.logo, Math.round(-S.logo.width / 2), Math.round(-S.logo.height / 2));
    x.restore();
    // shine sweep
    if (a > 0.35 && a < 0.75) {
      const u = (a - 0.35) / 0.4, sx = LW / 2 - 230 + u * 500;
      x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5;
      x.beginPath(); x.moveTo(sx, 40); x.lineTo(sx + 18, 40); x.lineTo(sx - 8, 104); x.lineTo(sx - 26, 104); x.closePath();
      x.fillStyle = '#ffffff'; x.fill(); x.restore();
    }
  }
  const b = lt - 0.36;
  if (b >= 0) {
    const sc = b < 0.1 ? 0.2 + 0.8 * easeOut(b / 0.1) + 0.2 * Math.sin((b / 0.1) * Math.PI) : 1;
    x.save(); x.translate(LW / 2 + 168, 128); x.rotate(-0.08); x.scale(sc, sc);
    x.drawImage(S.logo3d, -70, -35);
    x.restore();
  }
  if (lt > 0.32) text(x, 'ESCAPE FROM CASTLE BALDENSTEIN', LW / 2, 166, { size: 8, align: 'center', color: '#ffd84a', shadow: '#300000' });
  if (lt > 0.42) text(x, 'VS. THE CABALD', LW / 2, 186, { size: 16, align: 'center', color: '#ff5a6a', shadow: '#200000', alpha: clamp01((lt - 0.42) / 0.06) });
  if (lt > 0.7 && Math.floor(lt / 0.18) % 2 === 0) text(x, 'PRESS ANY KEY', LW / 2, 236, { size: 8, align: 'center', color: '#ffffff', shadow: '#000' });
  text(x, '©2026 REMY BOYS SOFTWARE', LW / 2, 346, { size: 8, align: 'center', color: '#8a7a7a', shadow: '#000' });
  return S.title;
}

// ---------- intermission ----------
const PAR = '01:30';
export function drawTally(t) {
  const x = S.tally.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  const g = x.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0, '#004448'); g.addColorStop(1, '#002a30');
  x.fillStyle = g; x.fillRect(0, 0, LW, LH);
  for (let y = 0; y < LH; y += 4) fill(x, 'rgba(0,0,0,0.12)', 0, y, LW, 1);
  // hero portrait with the grin
  const bounce = Math.abs(Math.sin((t - TALLY.lines) * 7)) * 3;
  fill(x, '#001a1e', 40, 70, 176, 236);
  fill(x, '#00686c', 42, 72, 172, 2); fill(x, '#00686c', 42, 72, 2, 232);
  x.save();
  x.beginPath(); x.rect(44, 74, 170, 230); x.clip();
  x.translate(128, 300 - Math.round(bounce));
  x.scale(2, 2);
  drawRemy(x, ART.hero, 0, 0, {});
  const R = ART.hero;
  AC.drawFace(x, ART.faces, -R.w / 2 + AC.FACE.sx, -(R.bottom + 1) + AC.FACE.sy, { look: 1, grin: 1 });
  x.restore();
  // text block
  const X0 = 250;
  text(x, 'FLOOR 1', X0, 40, { size: 16, color: '#ffffff', shadow: '#001014' });
  text(x, 'COMPLETED', X0, 64, { size: 16, color: '#ffffff', shadow: '#001014' });
  const bonus = t < TALLY.lines ? 0 : Math.min(5000, Math.round(((t - TALLY.lines) / 0.35) * 5000 / 100) * 100);
  text(x, 'BONUS', X0, 108, { size: 8, color: '#ffd84a' });
  text(x, String(bonus).padStart(6, ' '), X0 + 140, 104, { size: 16, color: '#ffffff', shadow: '#001014' });
  text(x, 'TIME', X0, 140, { size: 8, color: '#ffd84a' });
  text(x, '00:11', X0 + 60, 136, { size: 16, color: '#ffffff', shadow: '#001014' });
  text(x, 'PAR', X0 + 220, 140, { size: 8, color: '#ffd84a' });
  text(x, PAR, X0 + 256, 136, { size: 16, color: '#ffffff', shadow: '#001014' });
  const ratio = ([a, b]) => (t < a ? 0 : Math.min(100, Math.round(((t - a) / (b - a)) * 100)));
  const rows = [['KILL RATIO', TALLY.kill], ['SECRET RATIO', TALLY.secret], ['TREASURE RATIO', TALLY.treasure]];
  rows.forEach(([lab, win], i) => {
    const y = 184 + i * 28, v = ratio(win), done = t >= win[1];
    if (t < win[0] - 0.12) return;
    text(x, lab, X0, y + 4, { size: 8, color: '#ffd84a' });
    const flash = done && t - win[1] < 0.2 && Math.floor((t - win[1]) * 30) % 2 === 0;
    text(x, `${v}%`, X0 + 300, y, { size: 16, align: 'right', color: flash ? '#ffd84a' : '#ffffff', shadow: '#001014' });
    if (done) text(x, '+10000', X0 + 312, y + 4, { size: 8, color: '#7aff8a', alpha: clamp01((t - win[1]) / 0.08) });
  });
  if (t >= TALLY.perfect) {
    const a = t - TALLY.perfect, sc = a < 0.1 ? 2.5 - 1.5 * (a / 0.1) : 1;
    x.save(); x.translate(X0 + 160, 284); x.scale(sc, sc);
    text(x, 'PERFECT!', 0, -8, { size: 16, align: 'center', color: ['#ffd84a', '#ffffff', '#ff8a5a', '#7affd8'][Math.floor(a * 14) % 4], shadow: '#3a1000' });
    x.restore();
  }
  // victory banner
  if (t >= TALLY.end) {
    const a = t - TALLY.end;
    const w = Math.round(LW * easeOut(clamp01(a / 0.2)));
    fill(x, '#000000', LW / 2 - w / 2, 314, w, 34);
    fill(x, '#c81020', LW / 2 - w / 2, 314, w, 2); fill(x, '#c81020', LW / 2 - w / 2, 346, w, 2);
    if (a > 0.12) text(x, 'THE CABALD HAS FALLEN!', LW / 2, 323, { size: 16, align: 'center', color: '#ffd84a', shadow: '#5a0008' });
  }
  return S.tally;
}

// Wolf3D fizzle fade: pseudo-random 2×2 blocks flip from the last game frame to the tally screen.
export function drawEnd(t) {
  const [f0, f1] = TALLY.fizzle;
  const tally = drawTally(t);
  if (t >= f1) return tally;
  const game = drawGame(0, { g: G_END }).low;
  const u = clamp01((t - f0) / (f1 - f0));
  const gd = game.getContext('2d').getImageData(0, 0, LW, LH);
  const td = tally.getContext('2d').getImageData(0, 0, LW, LH);
  const G = new Uint32Array(gd.data.buffer), T = new Uint32Array(td.data.buffer);
  const BW = LW / 2;
  for (let by = 0; by < LH / 2; by++)
    for (let bx = 0; bx < BW; bx++) {
      if (hash(by * BW + bx + 0.5) >= u) continue;
      const o = by * 2 * LW + bx * 2;
      G[o] = T[o]; G[o + 1] = T[o + 1]; G[o + LW] = T[o + LW]; G[o + LW + 1] = T[o + LW + 1];
    }
  S.mix.getContext('2d').putImageData(gd, 0, 0);
  return S.mix;
}
