// REMYTRIS — a 15 s falling-block "gameplay capture": a Remy with hair clears the Cabald (bald Remys) one
// line at a time, saving the I for a TETRIS that leaves the well empty. Native 960×540, upscaled 2× nearest;
// post adds a light CRT, bloom and grain. All art is procedural or from the quest sprites; the score is synthesized.
import { W, H, hash } from 'filmkit/lib.js';
import { INTRO, END_T, DURATION, LW, LH, TETRIS_T, bt, beatAt, garbageT, CLEARS, LEVELUP_B, SCORE_FINAL } from './choreo.js';
import { prepareGame, drawGame, drawBackdrop, drawSnow, curtain, drawHead, text, fill, star4, ART, HERO, BOSS } from './game.js';
import * as A from './art.js';
import { score } from './score.js';

let titleC, endC;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const blit = (ctx, low) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, LW, LH, 0, 0, W, H);
};

// ---------- block-letter logo: REMYTЯIS (the second R mirrored, folk-style) ----------
const GLYPH = {
  R: ['###.', '#..#', '###.', '#.#.', '#..#'],
  E: ['####', '#...', '###.', '#...', '####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  S: ['.###', '#...', '.##.', '...#', '###.'],
};
const LOGO = [['R', 'Z', false], ['E', 'L', false], ['M', 'O', false], ['Y', 'S', false], ['T', 'I', false], ['R', 'J', true], ['I', 'T', false], ['S', 'Z', false]];
const LS = 18;
const LOGO_W = LOGO.reduce((a, [g]) => a + GLYPH[g][0].length + 1, -1) * LS;
const letterT = (i) => 0.1 + i * 0.075;
function drawLogo(x, lt, x0, y0) {
  let cx = x0;
  LOGO.forEach(([g, tp, mirror], i) => {
    const rows = GLYPH[g], w = rows[0].length;
    const a = lt - letterT(i), fall = 0.2;
    if (a >= 0) {
      let dy = 0;
      if (a < fall) dy = -260 * (1 - (a / fall) ** 2);
      else { const b = a - fall; dy = b < 0.16 ? -10 * Math.sin((b / 0.16) * Math.PI) * Math.exp(-b * 8) : 0; }
      const squash = a >= fall && a < fall + 0.08 ? Math.sin(((a - fall) / 0.08) * Math.PI) : 0;
      rows.forEach((row, r) => [...row].forEach((ch, c) => {
        if (ch !== '#') return;
        const cc = mirror ? w - 1 - c : c;
        const px = cx + cc * LS, py = y0 + r * LS + dy + squash * (r - 2) * -1.5;
        x.drawImage(ART.logo2[tp], Math.round(px), Math.round(py));
        if (a < fall + 0.05 && a >= fall) { x.globalAlpha = 0.7; fill(x, '#ffffff', px, py, LS, LS); x.globalAlpha = 1; }
      }));
      // landing dust
      const d = a - fall;
      if (d >= 0 && d < 0.35) {
        const u = d / 0.35;
        for (let k = 0; k < 4; k++) {
          const dir = k % 2 ? 1 : -1;
          x.globalAlpha = 1 - u; x.fillStyle = '#ffffff';
          x.beginPath(); x.arc(Math.round(cx + (dir > 0 ? w * LS : 0) + dir * 24 * u * (1 + k * 0.3)), Math.round(y0 + 5 * LS - 2 - 8 * u * (k % 3)), Math.round(2 + 4 * u), 0, 7); x.fill();
        }
        x.globalAlpha = 1;
      }
    }
    cx += (w + 1) * LS;
  });
}

// Cossack-dancing Cabald: squat + alternating kicks on the beat.
function drawDancer(x, R, px, feet, ph, k = 1) {
  const kick = Math.floor(ph) % 2, f = ph - Math.floor(ph);
  const up = f < 0.5;
  A.drawRemy(x, R, px, feet - (up ? 0 : 6) * k, {
    sx: k, sy: k * (up ? 0.78 : 1),
    lift: up ? (kick ? [10, 0] : [0, 10]) : [0, 0],
    stride: up ? (kick ? [-8, 0] : [0, 8]) : [0, 0],
    flip: kick === 1,
  });
}

function drawTitle(lt) {
  const x = titleC.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  // shake as letters land
  let shx = 0, shy = 0;
  for (let i = 0; i < LOGO.length; i++) { const d = lt - letterT(i) - 0.2; if (d >= 0 && d < 0.2) { shy += 3 * Math.exp(-d * 18) * Math.cos(d * 70); } }
  x.save(); x.translate(Math.round(shx), Math.round(shy));
  drawBackdrop(x, lt + 20, { lvl5: false, boost: 0.6 });
  drawSnow(x, lt + 20, 70);
  // logo plate
  const x0 = Math.round((LW - LOGO_W) / 2), y0 = 66;
  x.globalAlpha = 0.55; fill(x, '#0a0618', x0 - 24, y0 - 20, LOGO_W + 48, 5 * LS + 40); x.globalAlpha = 1;
  fill(x, '#ffd34a', x0 - 24, y0 - 20, LOGO_W + 48, 2); fill(x, '#ffd34a', x0 - 24, y0 + 5 * LS + 18, LOGO_W + 48, 2);
  for (let i = 0; i < (LOGO_W + 48) / 12; i++) { fill(x, '#a8182a', x0 - 24 + i * 12 + 4, y0 - 16, 4, 4); fill(x, '#a8182a', x0 - 24 + i * 12 + 4, y0 + 5 * LS + 12, 4, 4); }
  drawLogo(x, lt, x0, y0);
  // shine sweep after the logo settles
  if (lt > 0.85 && lt < 1.15) {
    const sx = x0 + (LOGO_W + 120) * ((lt - 0.85) / 0.3) - 60;
    x.save(); x.beginPath(); x.rect(x0, y0, LOGO_W, 5 * LS); x.clip();
    x.globalAlpha = 0.55; x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(sx, y0); x.lineTo(sx + 26, y0); x.lineTo(sx - 10, y0 + 5 * LS); x.lineTo(sx - 36, y0 + 5 * LS); x.fill();
    x.restore();
  }
  if (lt > 0.8) {
    const a = lt - 0.8, sc = a < 0.08 ? 2 - a / 0.08 : 1;
    x.save(); x.translate(LW / 2, y0 + 5 * LS + 46); x.scale(sc, sc);
    text(x, 'VS. THE CABALD', 0, -8, { size: 16, align: 'center', color: '#ff6a8a', outline: A.INK });
    x.restore();
  }
  // hero and boss face off; the bald horde dances between them
  const beat = beatAt(lt) ;
  A.drawRemy(x, ART.hero, 150, 507 - Math.abs(Math.sin(lt * 6)) * 4, { sx: 2, sy: 2, glow: '#ffe27a', glowA: 0.4 + 0.2 * Math.sin(lt * 12) });
  A.drawRemy(x, ART.boss, 810, 507, { sx: 2, sy: 2, flip: true });
  for (let i = 0; i < 6; i++) drawDancer(x, ART.dancers[i], 318 + i * 65, 507, lt / 0.2 + (i % 2) * 0.5);
  x.drawImage(ART.heroHead2, LW / 2 - 70, 236);
  text(x, '1 PLAYER   A-TYPE', LW / 2 - 34, 244, { size: 8, color: '#ffffff' });
  text(x, 'LEVEL 04   MUSIC-Я', LW / 2 - 34, 258, { size: 8, color: '#b4b0d8' });
  // PRESS START: blinks, then flashes fast once "pressed"
  const pressed = lt > 1.12;
  if (lt > 0.95 && (pressed ? Math.floor(lt / 0.04) % 2 === 0 : Math.floor(lt / 0.16) % 2 === 0)) text(x, 'PRESS START', LW / 2, 300, { size: 16, align: 'center', color: '#ffe27a', outline: A.INK });
  text(x, '©2026 REMY BOYS', LW / 2, 330, { size: 8, align: 'center', color: '#b48aff', shadow: A.INK });
  x.restore();
  if (lt > 1.2) curtain(x, (lt - 1.2) / 0.3, 'fill');
  return titleC;
}

// ---------- ending: REMY WINS, the Cabald is sent into orbit ----------
function rocketSprite() {
  const w = 40, h = 112, c = A.canvas(w, h), x = c.getContext('2d');
  const R = (a, b, ww, hh, col) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); };
  // body
  for (let y = 0; y < h - 18; y++) {
    const v = y / (h - 18);
    const half = v < 0.3 ? Math.round(12 * Math.sin((v / 0.3) * Math.PI / 2)) : 12;
    R(20 - half - 1, y, half * 2 + 2, 1, A.INK);
    if (half > 0) {
      R(20 - half, y, half * 2, 1, v < 0.24 ? '#ea423e' : '#f0ecf8');
      R(20 - half, y, Math.max(1, Math.round(half * 0.5)), 1, v < 0.24 ? '#ffa898' : '#ffffff');
      R(20 + half - Math.max(1, Math.round(half * 0.45)), y, Math.max(1, Math.round(half * 0.45)), 1, v < 0.24 ? '#8e1a20' : '#a8a4c0');
    }
  }
  R(8, 66, 24, 4, '#ea423e'); R(8, 76, 24, 2, '#3c64e8');
  // porthole
  x.fillStyle = A.INK; x.beginPath(); x.arc(20, 46, 11, 0, 7); x.fill();
  x.fillStyle = '#ffd34a'; x.beginPath(); x.arc(20, 46, 10, 0, 7); x.fill();
  x.fillStyle = '#1a2c5a'; x.beginPath(); x.arc(20, 46, 8, 0, 7); x.fill();
  // fins
  for (const s of [-1, 1]) for (let y = 0; y < 26; y++) { const ww = Math.round(10 * (y / 26)); R(s < 0 ? 8 - ww : 32, h - 44 + y, ww, 1, '#ea423e'); }
  R(14, h - 18, 12, 6, '#5a5870'); R(16, h - 12, 8, 4, '#3a3848');
  return c;
}
const LIFT = 0.75;
function drawEnd(lt) {
  const x = endC.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  const t = END_T + lt;
  const shake = lt > 0.35 && lt < 1.1 ? Math.round(Math.sin(lt * 90) * 2 * (lt < LIFT ? (lt - 0.35) / 0.4 : Math.exp(-(lt - LIFT) * 4))) : 0;
  x.save(); x.translate(shake, 0);
  drawBackdrop(x, t, { lvl5: true, boost: 1.4 });
  drawSnow(x, t, 70);
  // launch tower + rocket
  const rx = 600, base = 500;
  const a = Math.max(0, lt - LIFT);
  const ry = base - ART.rocket.height - 0.5 * 700 * a * a - 40 * a;
  fill(x, A.INK, rx + 28, 330, 10, 172);
  for (let y = 334; y < 500; y += 12) { fill(x, '#c8902a', rx + 30, y, 6, 2); fill(x, '#7a5418', rx + 29, y + 2, 8, 1); }
  fill(x, '#c8902a', rx + 22, 330, 22, 4);
  // exhaust
  if (lt > 0.3) {
    const ig = clamp01((lt - 0.3) / 0.3);
    for (let i = 0; i < 26; i++) {
      const age = ((lt * 2.2 + i / 26) % 1);
      const side = (hash(i + 40) - 0.5) * 2;
      const gx = rx + side * (20 + 140 * age) * ig, gy = base - 4 - age * 20 * (1 + hash(i + 41));
      const rr = (6 + 20 * age) * ig;
      x.globalAlpha = (1 - age) * 0.85;
      x.fillStyle = age < 0.15 ? '#fff2b0' : i % 2 ? '#e8e4f4' : '#b8b4d4';
      x.beginPath(); x.arc(Math.round(gx), Math.round(gy), Math.round(rr), 0, 7); x.fill();
    }
    x.globalAlpha = 1;
  }
  const fy = ry + ART.rocket.height;
  if (lt > 0.3) {
    const fl = 18 + 10 * Math.sin(lt * 70) + (lt > LIFT ? 30 : 0);
    x.fillStyle = '#ff6a2a'; x.beginPath(); x.moveTo(rx - 8, fy - 6); x.lineTo(rx + 8, fy - 6); x.lineTo(rx, fy + fl); x.fill();
    x.fillStyle = '#ffe27a'; x.beginPath(); x.moveTo(rx - 5, fy - 6); x.lineTo(rx + 5, fy - 6); x.lineTo(rx, fy + fl * 0.6); x.fill();
    if (lt > LIFT) {
      // smoke column left behind
      for (let i = 0; i < 18; i++) {
        const yy = fy + 30 + i * 22;
        if (yy > base) break;
        x.globalAlpha = 0.5 * (1 - i / 18); x.fillStyle = '#d8d4ec';
        x.beginPath(); x.arc(rx + Math.sin(i * 1.7 + lt * 3) * 4, yy, 8 + i * 1.2, 0, 7); x.fill();
      }
      x.globalAlpha = 1;
    }
  }
  const rs = lt > 0.35 && lt < LIFT ? Math.round(Math.sin(lt * 120)) : 0;
  x.drawImage(ART.rocket, Math.round(rx - 20 + rs), Math.round(ry));
  drawHead(x, BOSS.id, rx - 8 + rs, ry + 38, { atlas: ART.heads });
  // fireworks
  for (const [ft, fx, fy2, hue] of [[1.25, 250, 120, 0], [1.5, 720, 90, 1], [1.8, 470, 150, 2]]) {
    const b = lt - ft;
    if (b < 0 || b > 1.2) continue;
    const u = b / 1.2;
    const cols = [['#ff5a8a', '#ffd0e0'], ['#5ad8ff', '#d8f6ff'], ['#ffd34a', '#fff6c8']][hue];
    if (b < 0.07) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(fx, fy2, 24 * (1 - b / 0.07) + 6, 0, 7); x.fill(); }
    for (const [ring, n, spd] of [[0, 40, 190], [1, 24, 110]]) for (let i = 0; i < n; i++) {
      const ang = (i / n) * 6.283 + ring * 0.13, d = spd * (1 - Math.exp(-b * 4)) / 1.5;
      x.globalAlpha = (1 - u * u) * (u > 0.6 && hash(i * 7 + Math.floor(b * 30)) > 0.6 ? 0 : 1);
      fill(x, cols[ring], fx + Math.cos(ang) * d - 2, fy2 + Math.sin(ang) * d + 30 * b * b - 2, 4, 4);
    }
    x.globalAlpha = 1;
  }
  // the hero celebrates on the rooftop
  const hb = Math.abs(Math.sin(lt * 7.5)) * 26;
  A.drawRemy(x, ART.hero, 220, 507 - hb, { sx: 2, sy: 2 * (hb < 3 ? 0.94 : 1.02), lift: hb > 6 ? [6, 6] : [0, 0], glow: '#ffe27a', glowA: 0.5 + 0.3 * Math.sin(lt * 14) });
  for (let i = 0; i < 8; i++) {
    const ph = (lt * 1.4 + i / 8) % 1;
    star4(x, Math.round(160 + hash(i * 5 + Math.floor(lt * 1.4 + i / 8)) * 120), Math.round(507 - hb - 240 - ph * 40), Math.round(2 * (1 - ph)) + 1, '#fff6c8');
  }
  // titles
  if (lt > 0.3) {
    const s = 'REMY WINS!', size = 40, x0 = LW / 2 - (s.length * size) / 2;
    const cols = ['#ff4a4a', '#ffa03a', '#ffe23a', '#5ad84a', '#3ac8ff', '#5a6aff', '#c85aff'];
    for (let i = 0; i < s.length; i++) {
      const ai = lt - 0.3 - i * 0.04;
      if (ai < 0 || s[i] === ' ') continue;
      const dy = ai < 0.22 ? -80 * (1 - ai / 0.22) ** 2 + 10 * Math.sin((ai / 0.22) * Math.PI) : Math.sin(lt * 6 + i * 0.7) * 3;
      text(x, s[i], x0 + i * size, 40 + dy, { size, color: ai < 0.3 ? '#ffffff' : cols[(i + Math.floor(lt * 8)) % 7], outline: A.INK });
    }
  }
  if (lt > 0.8) {
    const b = lt - 0.8, sc = b < 0.1 ? 2 - b / 0.1 : 1;
    x.save(); x.translate(LW / 2, 108); x.scale(sc, sc);
    text(x, 'THE CABALD IS CLEARED', 0, -8, { size: 16, align: 'center', color: '#ff8ab0', outline: A.INK });
    x.restore();
  }
  if (lt > 1.15) {
    text(x, 'SCORE ' + String(SCORE_FINAL).padStart(7, '0'), LW / 2, 140, { size: 16, align: 'center', color: '#ffffff', outline: A.INK });
    text(x, 'LINES 047   LEVEL 05   TETRIS x1', LW / 2, 164, { size: 8, align: 'center', color: '#8ae8ff', outline: A.INK });
  }
  if (lt > 1.6 && Math.floor(lt / 0.25) % 2 === 0) text(x, 'THANK YOU FOR PLAYING', LW / 2, 196, { size: 8, align: 'center', color: '#ffe27a', outline: A.INK });
  drawSnow(x, t + 3, 30, true);
  x.restore();
  if (lt < 0.3) curtain(x, lt / 0.3, 'clear');
  return endC;
}

export default {
  title: 'REMYTRIS — vs. the Cabald',
  output: 'remytris.mp4',
  duration: DURATION,
  fonts: [
    { family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href },
    { family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-cyrillic-400-normal.woff2', import.meta.url).href, unicodeRange: 'U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116' },
  ],
  async prepare() {
    await prepareGame();
    ART.logo2 = {};
    for (const t of ['I', 'O', 'T', 'S', 'Z', 'J', 'L']) ART.logo2[t] = A.miniTile(t, LS);
    ART.rocket = rocketSprite();
    titleC = A.canvas(LW, LH);
    endC = A.canvas(LW, LH);
  },
  shots: [
    {
      name: 'title',
      t0: 0,
      t1: INTRO,
      draw(ctx, lt) { blit(ctx, drawTitle(lt)); },
      fx: (lt) => ({ bloom: 0.4, bloomThresh: 0.62, crt: 0.16, vignette: 0.8, grain: 0.015, aber: 0.0008, exposure: lt < 0.06 ? -2 : 0 }),
    },
    {
      name: 'game',
      t0: INTRO,
      t1: END_T,
      draw(ctx, lt) { blit(ctx, drawGame(INTRO + lt)); },
      fx: () => ({ bloom: 0.32, bloomThresh: 0.66, crt: 0.14, vignette: 0.6, grain: 0.012, aber: 0.0006, sat: 1.06, contrast: 1.03 }),
    },
    {
      name: 'ending',
      t0: END_T,
      t1: DURATION,
      draw(ctx, lt) { blit(ctx, drawEnd(lt)); },
      fx: (lt) => ({ bloom: 0.42, bloomThresh: 0.6, crt: 0.14, vignette: 0.7, grain: 0.012, aber: 0.0007, fade: clamp01((lt - 2.2) / 0.3) }),
    },
  ],
  flashes: [
    ...CLEARS.map((e) => [e.t, [0, 0.12, 0.18, 0.26, 0.6][e.n], [0, 0.06, 0.08, 0.1, 0.25][e.n]]),
    [garbageT(), 0.18, 0.08], [bt(LEVELUP_B), 0.2, 0.12], [END_T + 0.3 + 0.75, 0.15, 0.1],
  ],
  score,
  audio: { seed: 23, reverb: 1.3, reverbGain: 0.25 },
  lint: { safe: { margin: 0.03 } },
};
