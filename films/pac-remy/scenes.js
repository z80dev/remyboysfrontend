// Title / attract card, the "HAIR BREAK" intermission and the high-score card.
import { hash } from 'filmkit/lib.js';
import * as A from './art.js';
import { LW, LH, MX, MY, GHOSTS, FINAL_SCORE, HI0 } from './choreo.js';
import { ART, text, star4 } from './game.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const fill = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), w, h); };
let low, stage;
export function prepareScenes() {
  low = A.canvas(LW, LH);
  stage = A.canvas(640, 360);
}
const reset = (c) => {
  const x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = '#000';
  x.fillRect(0, 0, c.width, c.height);
  return x;
};
const ghostSpr = (i, t) => ART.ghosts[i].normal[Math.floor(t * 8 + i) % 2];

// Big extruded logo; letters drop in one by one.
function logo(x, cx, y, lt, size = 64, t0 = 0) {
  const s = 'PAC-REMY', cw = size, x0 = cx - (s.length * cw) / 2;
  for (let i = 0; i < s.length; i++) {
    const a = lt - t0 - i * 0.03;
    if (a < 0) continue;
    const drop = a < 0.16 ? -120 * (1 - a / 0.16) ** 2 : 5 * Math.exp(-(a - 0.16) * 18) * Math.sin((a - 0.16) * 50);
    const lx = x0 + i * cw, ly = y + drop;
    const k = size / 16;
    x.font = `${size}px "Press Start 2P"`;
    x.textBaseline = 'top';
    for (let d = Math.round(k * 2); d >= 1; d--) { x.fillStyle = d > k ? '#5a1400' : '#b83a00'; x.fillText(s[i], Math.round(lx + d), Math.round(ly + d)); }
    for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) { x.fillStyle = '#2a0800'; x.fillText(s[i], Math.round(lx + ox), Math.round(ly + oy)); }
    const g = x.createLinearGradient(0, ly, 0, ly + size);
    g.addColorStop(0, '#fff6a0'); g.addColorStop(0.45, '#ffd21a'); g.addColorStop(0.55, '#ffb000'); g.addColorStop(1, '#ff7a00');
    x.fillStyle = g;
    x.fillText(s[i], Math.round(lx), Math.round(ly));
  }
  return { x0, w: s.length * cw };
}

// ---------- title / attract ----------
export function drawTitle(lt) {
  const x = reset(low);
  x.globalAlpha = 0.13; x.drawImage(ART.maze.blue, MX - ART.maze.pad, MY - ART.maze.pad); x.globalAlpha = 1;
  const L = logo(x, LW / 2, 36, lt, 64, 0.02);
  // shine sweep across the logo
  if (lt > 0.42 && lt < 0.78) {
    const sx = L.x0 + (L.w + 120) * ((lt - 0.42) / 0.36) - 60;
    x.save(); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.7; x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(sx, 30); x.lineTo(sx + 26, 30); x.lineTo(sx - 4, 110); x.lineTo(sx - 30, 110); x.fill();
    x.restore();
  }
  if (lt > 0.32) text(x, 'VS. THE CABALD', LW / 2, 124, { size: 16, align: 'center', color: '#ff4a8a', alpha: clamp01((lt - 0.32) / 0.06) });
  if (lt > 0.42) text(x, 'CHARACTER / NICKNAME', LW / 2 + 30, 168, { size: 16, align: 'center' });
  GHOSTS.forEach((G, i) => {
    const t0 = 0.5 + i * 0.12, a = lt - t0;
    if (a < 0) return;
    const y = 214 + i * 44;
    const spr = ghostSpr(i, lt), gw = ART.ghosts[i].glow;
    x.globalAlpha = 0.6; x.drawImage(gw, 236 - gw.width / 2, y - gw.height / 2); x.globalAlpha = 1;
    x.drawImage(spr, 236 - A.GW / 2, y - A.GH / 2 - (a < 0.08 ? 6 * (1 - a / 0.08) : 0));
    if (a > 0.05) text(x, '-' + G.char, 290, y - 8, { size: 16, color: G.col });
    if (a > 0.1) text(x, `"${G.name}"`, 520, y - 8, { size: 16, color: G.col });
  });
  if (lt > 1.0) {
    fill(x, '#ffc8a8', 352, 404, 4, 4);
    text(x, '10 PTS', 372, 398, { size: 16 });
    x.drawImage(ART.tonic, 532, 397);
    text(x, '50 PTS', 556, 398, { size: 16 });
  }
  // the hero chomps a dotted line along the bottom
  const hx = -30 + 760 * clamp01((lt - 0.55) / 1.05);
  for (let d = 0; d < 26; d++) { const dx = 70 + d * 32; if (dx > hx + 6) fill(x, '#ffc8a8', dx - 2, 452, 4, 4); }
  if (lt > 0.55) A.drawChomp(x, ART.hero, hx, 454, Math.abs(Math.sin(lt * 22)), 1, 0, 2);
  if (lt > 0.9 && Math.floor(lt / 0.14) % 2 === 0) text(x, 'PUSH START BUTTON', LW / 2, 488, { size: 16, align: 'center', color: '#ffe23a' });
  text(x, 'CREDIT 1', 24, 518, { size: 8, color: '#8a8aa8', shadow: null });
  text(x, '©2026 REMY BOYS', LW - 24, 518, { size: 8, align: 'right', color: '#8a8aa8', shadow: null });
  return low;
}

// ---------- intermission: HAIR BREAK (640×360 stage, upscaled 3×) ----------
export const INTER = { snag: 1.12, pop: 1.24, stop: 1.42, flee: 1.86 };
const HOOK = { x: 330, y: 168 };
const GY0 = 200; // stage centre line
function ghostX(lt) {
  if (lt < INTER.snag) return 790 - 400 * lt;
  const xs = 790 - 400 * INTER.snag;
  if (lt < INTER.pop) return xs - 330 * (lt - INTER.snag); // dragging the wig
  const xp = xs - 330 * (INTER.pop - INTER.snag);
  if (lt < INTER.stop) { const u = (lt - INTER.pop) / (INTER.stop - INTER.pop); return xp - 90 * (1 - (1 - u) ** 2); } // lurch & skid
  const xk = xp - 90;
  if (lt < INTER.flee) return xk;
  return xk - 1300 * (lt - INTER.flee) ** 1.2;
}
export function drawIntermission(lt) {
  const x = reset(stage);
  const W = 640;
  // the hook on a wire
  fill(x, '#3a4060', HOOK.x - 1, 0, 2, HOOK.y - 6);
  fill(x, '#c8d0e0', HOOK.x - 2, HOOK.y - 8, 4, 4);
  fill(x, '#c8d0e0', HOOK.x - 1, HOOK.y - 6, 2, 8);
  fill(x, '#c8d0e0', HOOK.x + 1, HOOK.y, 4, 2);
  fill(x, '#c8d0e0', HOOK.x + 4, HOOK.y - 3, 2, 3);
  // floor dots
  for (let i = 0; i < 20; i++) fill(x, '#202848', 16 + i * 32, GY0 + 40, 16, 2);
  // hero
  const hx = 680 - 400 * lt;
  if (hx > -40) A.drawChomp(x, ART.hero, hx, GY0 + 4, Math.abs(Math.sin(lt * 20)), -1, 0, 2);
  // CHROMEY
  const gx = ghostX(lt), G = ART.ghosts[0];
  const f = Math.floor(lt * 10) % 2;
  let sx = 1, sy = 1;
  if (lt >= INTER.pop && lt < INTER.pop + 0.12) { const s = Math.sin(((lt - INTER.pop) / 0.12) * Math.PI); sx = 1 + 0.2 * s; sy = 1 - 0.18 * s; }
  if (lt >= INTER.flee && lt < INTER.flee + 0.08) { sx = 1.25; sy = 0.85; }
  if (gx > -60) {
    x.globalAlpha = 0.5; x.drawImage(G.glow, Math.round(gx - G.glow.width / 2), Math.round(GY0 - G.glow.height / 2)); x.globalAlpha = 1;
    x.save(); x.translate(Math.round(gx), GY0 + 23); x.scale(sx, sy);
    x.drawImage(G.normal[f], -A.GW / 2, -A.GH);
    x.restore();
    // blush + sweat once exposed
    if (lt > INTER.stop - 0.05 && lt < INTER.flee + 0.3) {
      const b = clamp01((lt - INTER.stop + 0.05) / 0.12);
      x.globalAlpha = 0.85 * b;
      fill(x, '#ff5a8a', gx - 12, GY0 - 1, 6, 3); fill(x, '#ff5a8a', gx + 7, GY0 - 1, 6, 3);
      x.globalAlpha = 1;
      if (lt < INTER.flee) {
        const dy = ((lt - INTER.stop) * 40) % 14;
        fill(x, '#8ae8ff', gx + 16, GY0 - 22 + dy, 3, 5); fill(x, '#ffffff', gx + 16, GY0 - 22 + dy, 1, 2);
      }
    }
    if (lt >= INTER.flee) for (let k = 1; k <= 4; k++) fill(x, '#ffffff', gx + 22 + k * 10, GY0 - 14 + k * 7 - 14, 14, 1); // speed lines
  }
  // the wig: on the head → snagged & stretched → dangling from the hook
  const wig = ART.wig, ww = 32, wh = 32;
  if (lt < INTER.snag) x.drawImage(wig, Math.round(gx - 16), GY0 - 23 - 2, ww, wh);
  else if (lt < INTER.pop) {
    const headX = gx - 16, stretch = Math.max(0, HOOK.x - 16 - headX);
    x.drawImage(wig, Math.round(headX), GY0 - 25, ww + Math.round(stretch), wh);
  } else {
    const a = lt - INTER.pop, swing = 0.5 * Math.exp(-a * 3) * Math.sin(a * 13);
    const fall = Math.min(1, a / 0.1);
    x.save(); x.translate(HOOK.x + 2, HOOK.y + 1 + 4 * fall); x.rotate(swing);
    x.drawImage(wig, -16, -4, ww, wh);
    x.restore();
    // the dome is revealed: a big shine
    if (a < 0.5) {
      const u = a / 0.5, s = Math.sin(u * Math.PI);
      x.save(); x.translate(gx - 4, GY0 - 18); x.rotate(u * 0.8); x.globalAlpha = s;
      fill(x, '#ffffff', -Math.round(26 * s), 0, Math.round(52 * s) + 1, 2);
      fill(x, '#ffffff', 0, -Math.round(26 * s), 2, Math.round(52 * s) + 1);
      fill(x, '#ffffff', -3, -3, 8, 8);
      x.restore();
      if (a > 0.04) text(x, 'TING!', gx - 6, GY0 - 66 - 10 * u, { size: 16, align: 'center', color: '#ffe23a', alpha: 1 - u * u });
    }
  }
  text(x, '- HAIR BREAK -', W / 2, 40, { size: 8, align: 'center', color: '#ff8ad8', alpha: clamp01(lt / 0.15) * clamp01((2.0 - lt) / 0.15) });
  return stage;
}

// ---------- high-score card ----------
export function drawHiscore(lt, dur) {
  const x = reset(low);
  x.globalAlpha = 0.1; x.drawImage(ART.maze.blue, MX - ART.maze.pad, MY - ART.maze.pad); x.globalAlpha = 1;
  logo(x, LW / 2, 28, lt + 1, 32);
  text(x, 'HIGH SCORES', LW / 2, 90, { size: 16, align: 'center', color: '#3ae8ff' });
  const rows = [
    ['1ST', ART.heroFront, 'REMY', FINAL_SCORE, '#ffe23a'],
    ['2ND', ART.ghosts[0].head, 'CHROMEY', HI0, GHOSTS[0].col],
    ['3RD', ART.ghosts[1].head, 'BUFFY', 3100, GHOSTS[1].col],
    ['4TH', ART.ghosts[2].head, 'DOMEY', 2050, GHOSTS[2].col],
    ['5TH', ART.ghosts[3].head, 'CUEBALL', 990, GHOSTS[3].col],
  ];
  rows.forEach(([rank, head, name, sc, col], i) => {
    const a = lt - 0.08 - i * 0.08;
    if (a < 0) return;
    const y = 134 + i * 46, slide = a < 0.12 ? 60 * (1 - a / 0.12) ** 2 : 0;
    const blink = i === 0 && Math.floor(lt * 8) % 2 === 0;
    text(x, rank, 236 + slide, y + 8, { size: 16, color: i === 0 ? '#ffe23a' : '#ffffff' });
    x.drawImage(head, Math.round(310 + slide), y);
    text(x, name, 360 + slide, y + 8, { size: 16, color: col });
    text(x, String(sc).padStart(6, ' '), 724 + slide, y + 8, { size: 16, align: 'right', color: i === 0 && blink ? '#ffffff' : '#ffe8c8' });
    if (i === 0 && a > 0.2) text(x, 'NEW!', 748, y + 8, { size: 16, color: blink ? '#ff4a8a' : '#ffe23a' });
  });
  if (lt > 0.55) text(x, 'THANKS FOR PLAYING, REMY!', LW / 2, 380, { size: 16, align: 'center', color: '#9dff6a', alpha: clamp01((lt - 0.55) / 0.08) });
  if (lt > 0.7 && Math.floor(lt / 0.16) % 2 === 0) text(x, 'INSERT COIN', LW / 2, 418, { size: 16, align: 'center', color: '#ffe23a' });
  // the hero chomps the last row of dots; a scared bald head runs ahead of him
  const hx = -30 + 860 * clamp01(lt / 1.55);
  for (let d = 0; d < 28; d++) { const dx = 40 + d * 32; if (dx > hx + 6) fill(x, '#ffc8a8', dx - 2, 468, 4, 4); }
  const fx = hx + 70, G = ART.ghosts[3];
  x.drawImage(G.fright[Math.floor(lt * 8) % 2], Math.round(fx - A.GW / 2), 470 - A.GH / 2 - 4);
  A.drawChomp(x, ART.hero, hx, 470, Math.abs(Math.sin(lt * 22)), 1, 0, 2);
  text(x, '©2026 REMY BOYS', LW / 2, 512, { size: 8, align: 'center', color: '#8a8aa8', shadow: null });
  // iris closes on the hero
  const ir = clamp01((lt - (dur - 0.32)) / 0.3);
  if (ir > 0) {
    const r = Math.max(0, 640 * (1 - ir) ** 2), cx = hx, cy = 470;
    x.fillStyle = '#000';
    x.beginPath(); x.rect(0, 0, LW, LH); x.moveTo(cx + r, cy); x.arc(cx, cy, r, 0, 7, true); x.fill('evenodd');
  }
  return low;
}
