// Attract-mode title and the "how much hair" intermission, both at the native 960×540.
import { hash } from 'filmkit/lib.js';
import * as A from './art.js';
import { LW, LH, HISCORE0 } from './choreo.js';
import { ART, text, drawHud, drawKong, star4, fill } from './game.js';

let low;
export function prepareCards() { low = A.canvas(LW, LH); }
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const begin = () => {
  const x = low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.fillStyle = '#000'; x.fillRect(0, 0, LW, LH);
  return x;
};

// ---------- title ----------
export const KONG_LAND = 0.62; // title-card time Kong lands on the floor girder
const CELL = 15, LETTER = CELL * 6, LOGO_X = Math.round(LW / 2 - (LETTER * 4 - CELL) / 2);
const LINES = [['REMY', LOGO_X, 66], ['KONG', LOGO_X, 66 + 7 * CELL + 18]];
const FLOOR = 470, KONG_X = 770, HERO_X = 190;
// every lit cell, in reveal order (column sweep with a little jitter)
const CELLS = [];
LINES.forEach(([word, x0, y0], li) => [...word].forEach((ch, ci) => A.FONT5[ch].forEach((row, ry) => [...row].forEach((c, rx) => {
  if (c !== '#') return;
  const px = x0 + ci * LETTER + rx * CELL, py = y0 + ry * CELL;
  CELLS.push({ px, py, t: 0.04 + ((px - LOGO_X) / (LETTER * 4)) * 0.42 + li * 0.06 + hash(px * 3 + py) * 0.05 });
}))));

export function drawTitle(lt) {
  const x = begin();
  // shake on Kong's landing
  const d = lt - KONG_LAND, sh = d > 0 && d < 0.3 ? 6 * Math.exp(-d * 14) : 0;
  x.save();
  x.translate(Math.round(sh * Math.sin(d * 90)), Math.round(sh * Math.cos(d * 70)));
  x.globalAlpha = 0.7; x.drawImage(ART.sky, 0, 0); x.globalAlpha = 1;
  for (const c of CELLS) {
    const a = lt - c.t;
    if (a < 0) continue;
    const drop = a < 0.08 ? -24 * (1 - a / 0.08) ** 2 : 0, py = Math.round(c.py + drop);
    x.drawImage(ART.block, c.px, py);
    if (a < 0.05) { x.fillStyle = '#ffffff'; x.fillRect(c.px, py, CELL, CELL); }
    // logo shine: a slanted band sweeps the blocks
    if (lt > 0.72 && lt < 1.1) {
      const band = LOGO_X - 60 + (LETTER * 4 + 120) * ((lt - 0.72) / 0.38) - (c.py - 66) * 0.3;
      if (Math.abs(c.px + CELL / 2 - band) < 14) { x.globalAlpha = 0.65; x.fillStyle = '#ffffff'; x.fillRect(c.px, py, CELL - 1, CELL - 1); x.globalAlpha = 1; }
    }
  }
  // the floor girder: our hero on the left, Kong leaps in on the right
  for (let sx = 64; sx < 896; sx += 32) x.drawImage(ART.seg, sx, FLOOR);
  A.drawRemy(x, ART.hero, HERO_X, FLOOR, { lift: lt > 0.66 && lt < 0.8 ? [6, 6] : [0, 0], sy: lt > 0.62 && lt < 0.7 ? 0.9 : 1 });
  if (lt > 0.3) {
    let feet = FLOOR, st = { k: 'idle' };
    if (lt < KONG_LAND) { const u = (lt - 0.3) / (KONG_LAND - 0.3); feet = LH + 170 + (FLOOR - LH - 170) * (1 - (1 - u) ** 2) - 120 * Math.sin(Math.PI * u); }
    else st = { k: 'pound', p: lt - KONG_LAND };
    drawKong(x, lt, lt, { cx: KONG_X, feet, st });
  }
  if (lt > 0.85) text(x, 'VS. THE CABALD', LW / 2, 330, { size: 16, align: 'center', color: '#ff4a6a', alpha: clamp01((lt - 0.85) / 0.06) });
  if (lt > 0.95) {
    x.drawImage(ART.heroHead2, LW / 2 - 92, 362);
    text(x, '1 PLAYER', LW / 2 - 52, 370, { size: 16 });
  }
  if (lt > 1.05 && Math.floor(lt / 0.12) % 2 === 0) text(x, 'PUSH START', LW / 2, 412, { size: 16, align: 'center', color: '#ffe27a' });
  text(x, '©2026 REMY BOYS', LW / 2, 500, { size: 8, align: 'center', color: '#ff8ab0', shadow: null });
  x.restore();
  drawHud(x, { score: 0, hi: HISCORE0, bonus: null, lives: 0 });
  // coin-in sparkle at the very start
  if (lt < 0.25) star4(x, 120, 30, Math.round(6 * (1 - lt / 0.25)) + 1, '#ffffff');
  return low;
}

// ---------- intermission ----------
export function drawHowHigh(lt) {
  const x = begin();
  const cx = 470, feet = 380;
  for (let sx = cx - 112; sx < cx + 112; sx += 32) x.drawImage(ART.seg, sx, feet);
  const pound = lt > 0.55 && lt < 0.95;
  drawKong(x, lt, lt, { cx, feet, st: pound ? { k: 'pound', p: lt - 0.55 } : { k: 'idle' } });
  text(x, '25 m', cx + 96, feet - 96, { size: 16, color: '#ff4a6a' });
  // the question, typed out fast
  const q = 'HOW MUCH HAIR CAN YOU GROW ?', n = Math.min(q.length, Math.floor(clamp01((lt - 0.06) / 0.32) * q.length));
  text(x, q.slice(0, n), LW / 2 - (q.length * 16) / 2, 416, { size: 16, color: '#ffffff' });
  // a tiny hero on the floor girder, looking up
  for (let sx = 120; sx < 840; sx += 32) x.drawImage(ART.seg, sx, 500);
  A.drawRemy(x, ART.hero, 220 + Math.min(1, lt / 0.8) * 60, 500, { lift: Math.floor(lt / 0.1) % 2 ? [5, 0] : [0, 5] });
  drawHud(x, { score: 0, hi: HISCORE0, bonus: null, lives: 2 });
  return low;
}
