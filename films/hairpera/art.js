// THE PHANTOM OF THE HAIRPERA — baked sets, costume/prop bakes, live painters.
// Everything deterministic: hash-seeded, no Math.random, every painter pure in t.
// Palette: crimson velvet #5a1220 · tarnished gold #c9a227 · candle amber #ffb347 ·
// moon steel #7d90b5 · ivory #f2ecdc (creative-brief.md).
import { hash, vnoise } from 'filmkit/lib.js';
import { canvas } from '../remy-bros/art.js';
import { LW, LH, GROUND } from './timeline.js';

export const OVER = 56;
const W2 = LW + OVER * 2, H2 = LH + OVER * 2;

const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const c255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);

// shared palette
export const PAL = {
  velvet: '#5a1220', velvetHi: '#7a1a2c', velvetLo: '#3a0a14',
  gold: '#c9a227', goldHi: '#e8c96a', goldLo: '#6e5216',
  amber: '#ffb347', amberHi: '#ffe6a8', steel: '#7d90b5', ivory: '#f2ecdc',
  ink: '#140a0e', wood: '#3a2417', woodLo: '#241207', woodHi: '#6a4526',
};

// named set geometry (stage coords) — film.js places actors/props from these
export const GEO = {
  chan: { x: 480, restY: 158, mountY: 36, crashY: 420 },
  heads: { y: 496 },
  mirror: { cx: 430, cy: 250, rx: 92, ry: 130 },
  vanity: { x: 664, top: 348, candles: [[616, 342], [652, 334], [704, 344]] },
  sconces: [[318, 208], [544, 208]],
  portrait: { x: 668, y: 210 },
  lair: {
    waterY: 442, organ: { x: 560, y: 84 }, console: { x: 612, keyY: 352 },
    candelabraX: [130, 335, 525, 945], gondolaX: 240, gondolaFeet: 398,
  },
  masq: { stairTop: { x: 742, y: 300 }, stairBase: { x: 618, y: 442 },
          rowA: { y: 414, xs: [250, 340, 430, 520] }, rowB: { y: 452, xs: [210, 310, 410, 510] } },
  roof: { feet: GROUND, moon: { x: 176, y: 108 } },
  coda: { throne: { x: 500, y: 330 }, candle: { x: 566, y: 424 } },
};

// organ pipe table for the glint painter (built once by bakeOrgan)
export const ORGAN_PIPES = [];

// ---------- small shared painters ----------

export function warmGlow(ctx, x, y, r, a, col = '255,190,110') {
  if (a <= 0.005) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.5, `rgba(${col},${a * 0.35})`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.restore();
}

export function shadow(ctx, cx, foot, w, a = 0.35) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath(); ctx.ellipse(cx, foot + 3, w, w * 0.22, 0, 0, 7); ctx.fill();
  ctx.restore();
}

// darkness with light holes: scratch-isolated so punch-outs never erase the scene
let _dk = null;
export function darkness(ctx, a, holes) {
  if (a <= 0) return;
  if (!_dk) _dk = canvas(LW + 96, LH + 96);
  const x = _dk.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, _dk.width, _dk.height);
  x.fillStyle = `rgba(3,4,8,${a})`;
  x.fillRect(0, 0, _dk.width, _dk.height);
  x.globalCompositeOperation = 'destination-out';
  for (const h of holes) {
    const gx = h.x + 48, gy = h.y + 48, soft = h.soft ?? 0.5;
    const g = x.createRadialGradient(gx, gy, h.r * (1 - soft) * 0.5, gx, gy, h.r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(gx, gy, h.r, 0, 7); x.fill();
  }
  ctx.drawImage(_dk, -48, -48);
}

// candle flame — seeded flicker, lean under "wind"; s = flame height px
export function flame(ctx, px, py, s, t, seed, lean = 0, k = 1) {
  if (k <= 0.02 || s <= 0.2) return;
  const fl = 0.82 + 0.3 * hash(seed * 91 + Math.floor(t * 22)) + 0.08 * Math.sin(t * 13 + seed);
  const h = s * fl * k, w = s * 0.42;
  const dx = lean * s * 1.9 + Math.sin(t * 7.3 + seed * 2.1) * s * 0.09;
  ctx.save();
  ctx.translate(px, py);
  // outer amber teardrop
  ctx.fillStyle = 'rgba(255,166,60,0.92)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-w, -h * 0.42, dx, -h);
  ctx.quadraticCurveTo(w, -h * 0.42, 0, 0);
  ctx.fill();
  // hot core
  ctx.fillStyle = 'rgba(255,236,170,0.95)';
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.quadraticCurveTo(-w * 0.5, -h * 0.26, dx * 0.7, -h * 0.62);
  ctx.quadraticCurveTo(w * 0.5, -h * 0.26, 0, -1);
  ctx.fill();
  // blue base
  ctx.fillStyle = 'rgba(120,150,255,0.5)';
  ctx.fillRect(-1.2, -2.4, 2.4, 2.4);
  ctx.restore();
}

// full candle: wax stick + flame (flame at top, lit = intensity 0..1)
export function candle(ctx, px, py, hgt, t, seed, lean = 0, lit = 1) {
  if (hgt > 0) {
    ctx.fillStyle = '#e8dfc8';
    ctx.fillRect(px - 2.5, py - hgt, 5, hgt);
    ctx.fillStyle = '#c8bda0';
    ctx.fillRect(px - 2.5, py - hgt, 1.4, hgt);
    ctx.fillStyle = '#f6efdc';
    ctx.fillRect(px - 0.6, py - hgt + 1, 1, hgt - 2);
  }
  if (lit > 0.02) {
    flame(ctx, px, py - hgt, 7.5, t, seed, lean, lit);
    warmGlow(ctx, px, py - hgt - 4, 26 * lit, 0.16 * lit);
  }
}

// drifting fog band (lair / coda smoke) — vnoise driven, pure in t
export function fog(ctx, t, y0, y1, a, col = '148,158,186', seed = 3) {
  const n = 7;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const sp = 10 + hash(i * 37 + seed) * 26;
    const px = ((hash(i * 13 + seed) * (LW + 260) + t * sp * (i % 2 ? 1 : -1)) % (LW + 260) + LW + 260) % (LW + 260) - 130;
    const py = y0 + (i / (n - 1)) * (y1 - y0) + Math.sin(t * 0.4 + i * 1.7) * 5;
    const rw = 90 + hash(i * 7 + seed) * 150, rh = 12 + hash(i * 11 + seed) * 18;
    const al = a * (0.35 + 0.3 * vnoise(px * 0.01 + i, t * 0.15 + i));
    if (al <= 0.008) continue;
    const g = ctx.createRadialGradient(px, py, 0, px, py, rw);
    g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.save(); ctx.translate(px, py); ctx.scale(1, rh / rw); ctx.translate(-px, -py);
    ctx.beginPath(); ctx.arc(px, py, rw, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// footlight glow row along the apron
export function footlights(ctx, t, k = 1) {
  for (let i = 0; i < 13; i++) {
    const px = 128 + i * 58.6;
    const fl = 0.8 + 0.2 * hash(i * 17 + Math.floor(t * 17));
    warmGlow(ctx, px, 482, 30, 0.12 * k * fl, '255,196,110');
  }
}

// moonlight grade — steel diagonal wash from upper left
export function moonlight(ctx, k = 1) {
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, 0, LW * 0.7, LH);
  g.addColorStop(0, `rgba(125,144,181,${0.10 * k})`);
  g.addColorStop(0.5, `rgba(125,144,181,${0.035 * k})`);
  g.addColorStop(1, 'rgba(125,144,181,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LW, LH);
  ctx.restore();
}

// rising music-note flourish (Carlotta's scale / Christine's soft song)
export function notes(ctx, x0, y0, t, t0, col = '232,201,106', climb = 46, seed = 5) {
  const age = t - t0;
  if (age < 0) return;
  for (let i = 0; i < 6; i++) {
    const a = age - i * 0.32;
    if (a < 0 || a > 1.15) continue;
    const nx = x0 + (hash(i * 9 + seed) - 0.5) * 44 + Math.sin(a * 4 + i) * 8;
    const ny = y0 - a * climb - i * 4;
    const al = 0.75 * (1 - a / 1.15);
    ctx.fillStyle = `rgba(${col},${al})`;
    ctx.beginPath(); ctx.ellipse(nx, ny, 3, 2.2, -0.4, 0, 7); ctx.fill();
    ctx.fillRect(nx + 2, ny - 11, 1.4, 11);
    ctx.fillRect(nx + 2, ny - 11, 5, 1.4);
  }
}

// evenodd circle iris (moveTo before arc or you get a wedge)
export function iris(ctx, p, cx, cy, maxR, fill = '#050307') {
  if (p <= 0) return;
  const r = Math.max(0.1, maxR * (1 - p) ** 1.9);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.rect(-OVER, -OVER, W2, H2);
  ctx.moveTo(cx + r, cy);
  ctx.arc(cx, cy, r, 0, 2 * Math.PI, true);
  ctx.fill('evenodd');
}

// ---------- THE PHANTOM'S COSTUME ----------

const IVORY = '#f2ecdc', IVORY_SH = '#d6cbb2', GOLD = PAL.gold, MASK_INK = '#2a2320';

// White half-mask over the RIGHT half of his face (viewer-left), ivory + gold edge + eye slit.
// variant 'full' = skull-white full mask (Red Death); plume adds the crimson feather.
export function halfMask(R, variant = 'half', plume = false) {
  const pad = plume ? 18 : 0;
  const c = canvas(R.w, R.h + pad), x = c.getContext('2d');
  x.drawImage(R.c, 0, pad);
  const cx = R.cx, ty = R.top + pad;
  // mask covers head rows; slight jaw taper so it never floats past the silhouette
  const path = () => {
    x.beginPath();
    if (variant === 'half') {
      x.moveTo(cx + 3, ty + 13);
      x.quadraticCurveTo(cx - 15, ty + 12, cx - 15, ty + 27);
      x.quadraticCurveTo(cx - 15, ty + 40, cx - 7, ty + 46);
      x.quadraticCurveTo(cx - 1, ty + 47, cx + 3, ty + 45);
      x.closePath();
    } else {
      x.ellipse(cx, ty + 29, 13.5, 17, 0, 0, 7);
    }
  };
  path();
  const g = x.createLinearGradient(cx - 15, ty, cx + 4, ty + 46);
  g.addColorStop(0, IVORY); g.addColorStop(0.7, IVORY); g.addColorStop(1, IVORY_SH);
  x.fillStyle = g;
  x.fill();
  x.strokeStyle = MASK_INK; x.lineWidth = 1; x.stroke();
  // gold edge along the centre seam
  x.strokeStyle = GOLD; x.lineWidth = 1.4;
  x.beginPath();
  if (variant === 'half') { x.moveTo(cx + 3, ty + 13); x.quadraticCurveTo(cx + 5.5, ty + 29, cx + 3, ty + 45); }
  else { x.moveTo(cx - 13, ty + 29); x.quadraticCurveTo(cx, ty + 20, cx + 13, ty + 29); }
  x.stroke();
  // eye slit(s): dark, with a lash line
  x.fillStyle = MASK_INK;
  if (variant === 'half') {
    x.fillRect(cx - 12, ty + 25, 8, 2.6);
  } else {
    x.fillRect(cx - 11, ty + 25, 8, 2.6);
    x.fillRect(cx + 3, ty + 25, 8, 2.6);
  }
  x.fillStyle = 'rgba(255,255,255,0.35)'; // porcelain catchlight
  x.fillRect(cx - 9, ty + 17, 4, 1.2);
  if (plume) {
    // crimson plume sweeping up-left over the extra headroom
    x.strokeStyle = '#8e1626'; x.lineWidth = 1; x.stroke();
    for (let i = 0; i < 5; i++) {
      const u = i / 4;
      x.strokeStyle = i % 2 ? '#a81e30' : '#7a1424';
      x.lineWidth = 3.4 - u * 1.6;
      x.beginPath();
      x.moveTo(cx + 2 - u * 3, ty + 12);
      x.quadraticCurveTo(cx - 6 - u * 7, ty - 2 - u * 6, cx - 12 - u * 9, ty - 12 + u * 4 - pad * 0.2);
      x.stroke();
    }
    x.strokeStyle = '#d24054'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(cx + 1, ty + 11); x.quadraticCurveTo(cx - 10, ty - 6, cx - 19, ty - 12); x.stroke();
  }
  const rig = { ...R, c, h: R.h + pad, top: R.top + pad, bottom: R.bottom + pad, legTop: R.legTop + pad };
  return rig;
}

// high collar wedges beside the neck (bake into a rig)
export function collar(R, col = '#0a0a10') {
  const c = canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  const cx = R.cx, sy = R.top + 58;
  x.fillStyle = col;
  x.beginPath(); x.moveTo(cx - 20, sy + 16); x.lineTo(cx - 15, sy - 9); x.lineTo(cx - 8, sy + 13); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(cx + 20, sy + 16); x.lineTo(cx + 15, sy - 9); x.lineTo(cx + 8, sy + 13); x.closePath(); x.fill();
  x.strokeStyle = '#1c1c24'; x.lineWidth = 1;
  x.beginPath(); x.moveTo(cx - 15, sy - 9); x.lineTo(cx - 8, sy + 13); x.moveTo(cx + 15, sy - 9); x.lineTo(cx + 8, sy + 13); x.stroke();
  return { ...R, c };
}

// CAPE — layered sine-shear strips from the shoulders, ANIMATED AT DRAW TIME (never baked).
// o: { col, hi, len, amp, sway, spread, alpha, lift }
export function drawCape(x, cx, shoulderY, t, o = {}) {
  const col = o.col ?? '#0b0b10', hi = o.hi ?? '#191922';
  const len = o.len ?? 150, amp = o.amp ?? 7, sway = o.sway ?? 0;
  const spread = o.spread ?? 1, alpha = o.alpha ?? 1, lift = o.lift ?? 0;
  if (alpha <= 0.02) return;
  x.save();
  x.globalAlpha = alpha;
  const N = 7, topY = shoulderY + lift;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);                       // 0 left … 1 right
    const bx = cx + (u - 0.5) * 34 * spread;     // shoulder anchor
    const ph = t * 2.3 + i * 0.85;
    const sw = Math.sin(ph) * amp * (0.4 + 0.6 * Math.abs(u - 0.5) * 2) + sway * (u - 0.5) * 2.2;
    const bl = len * (0.82 + 0.24 * Math.sin(i * 2.1));   // hem not straight = cloth
    const by = topY + bl;
    const wTop = 5.4;
    x.fillStyle = i % 2 ? col : hi;
    x.beginPath();
    x.moveTo(bx - wTop, topY);
    x.quadraticCurveTo(bx - wTop - 3 + sw * 0.4, topY + bl * 0.5, bx - 6 + sw, by);
    x.quadraticCurveTo(bx + sw, by + 4, bx + 7 + sw, by - 2);
    x.quadraticCurveTo(bx + wTop + 3 + sw * 0.4, topY + bl * 0.5, bx + wTop, topY);
    x.closePath();
    x.fill();
  }
  // rim light on the swing side
  x.strokeStyle = o.rim ?? 'rgba(190,200,225,0.16)';
  x.lineWidth = 1.2;
  x.beginPath();
  x.moveTo(cx - 17 * spread, topY + 4);
  x.quadraticCurveTo(cx - 22 * spread + sway, topY + len * 0.55, cx - 12 + sway * 1.6, topY + len * 0.9);
  x.stroke();
  x.restore();
}

// settled cape puddle (after the vanish) — slumped cloth mound, faint breathing
export function capePile(x, cx, groundY, t, col = '#0b0b10', alpha = 1) {
  if (alpha <= 0.02) return;
  x.save();
  x.globalAlpha = alpha;
  x.fillStyle = col;
  x.beginPath();
  x.moveTo(cx - 30, groundY);
  x.quadraticCurveTo(cx - 26, groundY - 13 - Math.sin(t * 1.4) * 0.8, cx - 8, groundY - 16);
  x.quadraticCurveTo(cx + 4, groundY - 20, cx + 16, groundY - 11);
  x.quadraticCurveTo(cx + 30, groundY - 6, cx + 31, groundY);
  x.closePath(); x.fill();
  x.fillStyle = '#17171f';
  x.beginPath(); x.ellipse(cx - 4, groundY - 9, 12, 5, 0.2, 0, 7); x.fill();
  x.restore();
}

// A real forearm + hand reaching from (x0,y0) to fingertip (x1,y1): tapered sleeve, cuff band,
// palm + fanned fingers. o: { sleeve, skin, w, cuff, alpha } — used for the mirror-touch beat.
export function reachArm(x, x0, y0, x1, y1, o = {}) {
  const sleeve = o.sleeve ?? '#14141c', skin = o.skin ?? '#e4cdae', w = o.w ?? 6.4;
  const cuff = o.cuff ?? '#e8e2d2', alpha = o.alpha ?? 1;
  if (alpha <= 0.02) return;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const L = Math.hypot(x1 - x0, y1 - y0);
  const sl = Math.min(L * 0.52, 26);                 // sleeve length
  x.save();
  x.globalAlpha = alpha;
  x.translate(x0, y0);
  x.rotate(ang);
  // sleeve: tapered quad
  x.fillStyle = sleeve;
  x.beginPath();
  x.moveTo(0, -w); x.lineTo(sl, -w * 0.72); x.lineTo(sl, w * 0.72); x.lineTo(0, w);
  x.closePath(); x.fill();
  x.fillStyle = 'rgba(0,0,0,0.25)';                  // sleeve underside shade
  x.beginPath();
  x.moveTo(0, w * 0.45); x.lineTo(sl, w * 0.36); x.lineTo(sl, w * 0.72); x.lineTo(0, w);
  x.closePath(); x.fill();
  // cuff band
  x.fillStyle = cuff;
  x.fillRect(sl - 1.6, -w * 0.8, 3.2, w * 1.6);
  // forearm + palm
  x.fillStyle = skin;
  x.beginPath(); x.moveTo(sl, -w * 0.62); x.lineTo(L * 0.8, -w * 0.5); x.lineTo(L * 0.8, w * 0.5); x.lineTo(sl, w * 0.62);
  x.closePath(); x.fill();
  x.beginPath(); x.ellipse(L * 0.84, 0, w * 0.72, w * 0.58, 0, 0, 7); x.fill();
  // four fingers fanning to the fingertip + thumb
  x.strokeStyle = skin; x.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const fy = -w * 0.42 + i * w * 0.28;
    x.lineWidth = w * 0.26;
    x.beginPath();
    x.moveTo(L * 0.86, fy);
    x.quadraticCurveTo(L * 0.94, fy * 0.7, x1 - x0, fy * 0.42 + (i - 1.5) * w * 0.1);
    x.stroke();
  }
  x.lineWidth = w * 0.3;
  x.beginPath();
  x.moveTo(L * 0.82, -w * 0.5);
  x.quadraticCurveTo(L * 0.9, -w * 1.05, L * 0.99, -w * 0.72);
  x.stroke();
  // knuckle catchlight
  x.fillStyle = 'rgba(255,255,255,0.22)';
  x.beginPath(); x.ellipse(L * 0.8, -w * 0.3, w * 0.3, w * 0.16, 0, 0, 7); x.fill();
  x.restore();
}

// ---------- RAOUL: blade strip + rapier/cane props ----------

// Strip the greatsword baked into 42's near sprite (same id as remember-the-flow): per scanline,
// clear the detached left-edge run when a ≥3px transparent gap separates it from the body, then a
// colour pass for where the blade tucks behind the hair. Deterministic, runs once in prepare().
export function stripBlade(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data;
  const a = (xx, y) => p[(y * R.w + xx) * 4 + 3];
  for (let y = 0; y < R.h; y++) {
    let x0 = 0;
    while (x0 < R.w && a(x0, y) === 0) x0++;
    if (x0 > 8) continue;
    let x1 = x0;
    while (x1 < R.w && a(x1, y) > 0) x1++;
    if (x1 - x0 > 15) continue;
    let gap = 0, xx = x1;
    while (xx < R.w && a(xx, y) === 0) { gap++; xx++; }
    if (gap < 3) continue;
    for (let xb = x0; xb < x1; xb++) p[(y * R.w + xb) * 4 + 3] = 0;
  }
  // colour pass for where the blade tucks behind the hair: blue-grey steel and gold guard are
  // never skin/hair, and the warm-white blade highlights (r > b, very bright) are blade too —
  // hair (r 137) and skin (lum ≈ 190) stay below the silver threshold. Deterministic, prepare().
  for (let y = 0; y < R.h; y++) {
    for (let xx = 0; xx < 23; xx++) {
      const i = (y * R.w + xx) * 4;
      if (p[i + 3] === 0) continue;
      const r = p[i], g = p[i + 1], b = p[i + 2];
      const lum = (r + g + b) / 3;
      if (b >= r || (g > 150 && b < 90 && r > 140) || (lum > 205 && b > 140 && r > 170)) p[i + 3] = 0;
    }
  }
  x.putImageData(d, 0, 0);
  const sil = canvas(R.w, R.h), sx = sil.getContext('2d');
  sx.drawImage(c, 0, 0);
  sx.globalCompositeOperation = 'source-in';
  sx.fillStyle = '#fff';
  sx.fillRect(0, 0, R.w, R.h);
  return { ...R, c, sil };
}

// rapier prop — grip anchor at (8, 78), tip up-right when rot ≈ -1.2
export function bakeRapier() {
  const c = canvas(24, 88), x = c.getContext('2d');
  x.fillStyle = '#2a1c12'; x.fillRect(5, 70, 6, 14);          // grip
  x.fillStyle = PAL.gold; x.beginPath(); x.arc(8, 70, 4.6, 0, 7); x.fill();  // guard
  x.fillStyle = PAL.goldLo; x.fillRect(2, 68, 12, 2);
  const g = x.createLinearGradient(6, 0, 11, 0);
  g.addColorStop(0, '#e6ecf6'); g.addColorStop(0.5, '#cdd6e4'); g.addColorStop(1, '#8f9cb2');
  x.fillStyle = g;
  x.beginPath(); x.moveTo(6, 68); x.lineTo(8.4, 4); x.lineTo(10, 4); x.lineTo(10.6, 68); x.closePath(); x.fill();
  x.fillStyle = '#f4f8ff'; x.fillRect(8.6, 8, 1, 56);          // fuller catchlight
  return c;
}

// sword/cane painter: blade from hand (hx,hy) toward a tip target, drawn as tapering steel
export function bladeTo(x, hx, hy, tx, ty, kind = 'rapier', alpha = 1) {
  if (alpha <= 0.02) return;
  const ang = Math.atan2(ty - hy, tx - hx);
  const L = Math.hypot(tx - hx, ty - hy);
  x.save();
  x.globalAlpha = alpha;
  x.translate(hx, hy); x.rotate(ang);
  if (kind === 'rapier') {
    const g = x.createLinearGradient(0, -1.6, 0, 1.6);
    g.addColorStop(0, '#eef3fb'); g.addColorStop(0.5, '#cdd6e4'); g.addColorStop(1, '#87919f');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(0, -1.8); x.lineTo(L - 3, -0.8); x.lineTo(L, 0); x.lineTo(L - 3, 0.8); x.lineTo(0, 1.8); x.closePath(); x.fill();
    x.fillStyle = PAL.gold; x.fillRect(-2, -3.4, 3, 6.8);       // guard
    x.fillStyle = '#2a1c12'; x.fillRect(-9, -1.4, 7, 2.8);      // grip
  } else if (kind === 'greatsword') {
    x.fillStyle = '#c3cdda';
    x.beginPath(); x.moveTo(2, -3.4); x.lineTo(L, -1.4); x.lineTo(L, 1.4); x.lineTo(2, 3.4); x.closePath(); x.fill();
    x.fillStyle = '#eef3fb'; x.fillRect(2, -0.8, L - 4, 1);
    x.fillStyle = PAL.gold; x.fillRect(-3, -6, 4, 12);
    x.fillStyle = '#2a1c12'; x.fillRect(-12, -1.8, 9, 3.6);
  } else { // cane — black lacquer, warm rim so it survives dark coats + freezes (QA D5)
    x.fillStyle = '#14100e';
    x.beginPath(); x.moveTo(0, -1.5); x.lineTo(L, -0.7); x.lineTo(L, 0.7); x.lineTo(0, 1.5); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,208,130,0.55)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(2, -1.1); x.lineTo(L - 4, -0.6); x.stroke();
    x.fillStyle = '#efe6f2'; x.fillRect(-3, -2, 4, 4);
    x.fillStyle = PAL.gold; x.fillRect(L - 3, -2, 3, 4);
  }
  x.restore();
}

// ---------- head atlas / originals ----------

export async function loadOrig(id) {
  const i = new Image();
  i.src = new URL(`../../media/remy/Character${id}.webp`, import.meta.url).href;
  await i.decode();
  return i;
}

// Christine's framed portrait: BUST CROP of her 600×600 original (full frame has a meme HUD bg —
// casting.md: never ship the full frame). Small oval gilt frame hung over the vanity — sized to
// dressing-room scale so it never upstages the mirror (QA D2).
export function bakeChristinePortrait(img, w = 132, h = 160) {
  const c = canvas(w + 22, h + 22), x = c.getContext('2d');
  // gilt oval frame
  x.fillStyle = PAL.goldLo;
  x.beginPath(); x.ellipse(w / 2 + 11, h / 2 + 11, w / 2 + 11, h / 2 + 11, 0, 0, 7); x.fill();
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, PAL.goldHi); g.addColorStop(0.5, PAL.gold); g.addColorStop(1, PAL.goldLo);
  x.fillStyle = g;
  x.beginPath(); x.ellipse(w / 2 + 11, h / 2 + 11, w / 2 + 6, h / 2 + 6, 0, 0, 7); x.fill();
  for (let i = 0; i < 22; i++) { // bead detail on the frame
    const a = (i / 22) * Math.PI * 2;
    x.fillStyle = i % 2 ? PAL.goldHi : PAL.goldLo;
    x.beginPath();
    x.arc(w / 2 + 11 + Math.cos(a) * (w / 2 + 8.5), h / 2 + 11 + Math.sin(a) * (h / 2 + 8.5), 1.6, 0, 7);
    x.fill();
  }
  // bust crop: tight on face/bust of the 600×600 — meme HUD bg excluded (casting.md)
  x.save();
  x.beginPath(); x.ellipse(w / 2 + 11, h / 2 + 11, w / 2 - 1, h / 2 - 1, 0, 0, 7); x.clip();
  x.fillStyle = '#181009'; x.fillRect(0, 0, w + 22, h + 22);
  const sw = 310, sx0 = 150, sy0 = 96;            // face fills the oval, corners stay dark
  x.drawImage(img, sx0, sy0, sw, sw, 11, 11, w, h);
  // candlelit duotone: warm colour pass + corner vignette
  x.globalCompositeOperation = 'soft-light';
  x.fillStyle = '#c98228'; x.fillRect(0, 0, w + 22, h + 22);
  x.globalCompositeOperation = 'source-over';
  const v = x.createRadialGradient(w / 2 + 11, h / 2 + 2, w * 0.2, w / 2 + 11, h / 2 + 11, w * 0.58);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.6, 'rgba(10,4,2,0.4)'); v.addColorStop(1, 'rgba(8,3,2,0.92)');
  x.fillStyle = v; x.fillRect(0, 0, w + 22, h + 22);
  x.restore();
  // glass sheen
  const s = x.createLinearGradient(11, 11, w, h);
  s.addColorStop(0, 'rgba(240,230,210,0.16)'); s.addColorStop(0.3, 'rgba(240,230,210,0.02)'); s.addColorStop(1, 'rgba(240,230,210,0)');
  x.fillStyle = s;
  x.beginPath(); x.ellipse(w / 2 + 11, h / 2 + 11, w / 2 - 1, h / 2 - 1, 0, 0, 7); x.fill();
  return c;
}

// ---------- BAKED SETS (all (LW+2·OVER)×(LH+2·OVER), drawn at -OVER,-OVER) ----------

// proscenium shell: ceiling + chandelier mount, boxed side walls, arch, valance, apron, footlight
// shells, pit. Audience head band is a separate live canvas (it ducks in shot 7).
function paintHouseShell(x) {
  // house darkness
  const bg = x.createLinearGradient(0, 0, 0, LH);
  bg.addColorStop(0, '#160609'); bg.addColorStop(0.6, '#1c0a0e'); bg.addColorStop(1, '#12050a');
  x.fillStyle = bg; x.fillRect(-OVER, -OVER, W2, H2);
  // ceiling cove with converging gold rings + mount boss
  x.fillStyle = '#190a0d'; x.fillRect(-OVER, -OVER, W2, 66 + OVER);
  x.strokeStyle = 'rgba(201,162,39,0.4)'; x.lineWidth = 3;
  for (const r of [200, 268, 336]) {
    x.beginPath(); x.ellipse(480, -150, r, r * 0.62, 0, 0, 7); x.stroke();
  }
  x.fillStyle = PAL.goldLo; x.fillRect(468, 28, 24, 10);
  x.fillStyle = PAL.gold; x.beginPath(); x.arc(480, 36, 7, 0, 7); x.fill();
  x.fillStyle = PAL.goldHi; x.beginPath(); x.arc(480, 36, 3, 0, 7); x.fill();
  // side walls: crimson drape panels
  for (const side of [-1, 1]) {
    const wx = side < 0 ? -OVER : 860;
    for (let i = 0; i < 8; i++) {
      x.fillStyle = i % 2 ? '#4a0f1c' : '#5a1220';
      x.fillRect(wx + i * 12.5, -OVER, 12.5, H2);
    }
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(side < 0 ? 88 : 860, -OVER, 12, H2);
    // three tiers of boxes
    for (let tier = 0; tier < 3; tier++) {
      const by = 104 + tier * 96;
      x.fillStyle = '#6e1626'; x.fillRect(side < 0 ? 8 : 872, by, 84, 62);
      x.fillStyle = '#170709'; x.fillRect(side < 0 ? 14 : 878, by + 8, 72, 40);
      x.fillStyle = PAL.gold; x.fillRect(side < 0 ? 8 : 872, by + 48, 84, 5);
      x.fillStyle = PAL.goldHi; x.fillRect(side < 0 ? 8 : 872, by + 48, 84, 1.6);
      // swag curtain over the box opening
      x.fillStyle = PAL.velvetLo;
      x.beginPath();
      x.moveTo(side < 0 ? 14 : 950, by + 6);
      x.quadraticCurveTo(side < 0 ? 50 : 914, by + 26, side < 0 ? 86 : 878, by + 6);
      x.quadraticCurveTo(side < 0 ? 50 : 914, by + 14, side < 0 ? 14 : 950, by + 6);
      x.fill();
    }
  }
  // ARCH: gold band + velvet inner border + rosettes
  x.lineWidth = 12;
  x.strokeStyle = PAL.gold;
  x.strokeRect(96, 64, 768, 412);
  x.lineWidth = 2.4; x.strokeStyle = PAL.goldHi;
  x.strokeRect(90, 58, 780, 424);
  x.lineWidth = 16;
  x.strokeStyle = PAL.velvet;
  x.strokeRect(110, 76, 740, 388);
  x.fillStyle = 'rgba(0,0,0,0.28)';
  for (let i = 0; i < 60; i++) {
    const u = i / 60, per = 2 * (768 + 412) / 16;
    // velvet fold shading: dashes around the border
    const edge = Math.floor(u * 4), f = (u * 4) % 1;
    const px = edge === 0 ? 110 + f * 740 : edge === 1 ? 850 : edge === 2 ? 850 - f * 740 : 110;
    const py = edge === 0 ? 76 : edge === 1 ? 76 + f * 388 : edge === 2 ? 464 : 464 - f * 388;
    x.fillRect(px - 2, py - 8, 4, 16);
  }
  for (const [rx, ry] of [[96, 64], [864, 64], [96, 476], [864, 476]]) {
    x.fillStyle = PAL.gold; x.beginPath(); x.arc(rx, ry, 10, 0, 7); x.fill();
    x.fillStyle = PAL.goldHi; x.beginPath(); x.arc(rx, ry, 4.4, 0, 7); x.fill();
  }
  // valance: crimson scallops + gold fringe across the top of the opening
  for (let i = 0; i < 16; i++) {
    const sx = 96 + i * 48;
    x.fillStyle = i % 2 ? PAL.velvet : PAL.velvetHi;
    x.beginPath(); x.moveTo(sx, 40); x.quadraticCurveTo(sx + 24, 92, sx + 48, 40); x.closePath(); x.fill();
    x.fillStyle = PAL.gold;
    for (let f = 0; f < 4; f++) x.fillRect(sx + 8 + f * 9, 82 + (f % 2) * 3, 2, 6);
  }
  x.fillStyle = PAL.velvetLo; x.fillRect(96, 30, 768, 12);
  x.fillStyle = PAL.gold; x.fillRect(96, 30, 768, 2.4);
  // apron + footlight shells + pit (apron starts BELOW the arch lip at 476)
  x.fillStyle = '#2a1812'; x.fillRect(-OVER, 476, W2, 14);
  x.fillStyle = PAL.woodHi; x.fillRect(-OVER, 476, W2, 2.4);
  x.fillStyle = PAL.goldLo; x.fillRect(-OVER, 486, W2, 2);
  for (let i = 0; i < 13; i++) {
    const px = 128 + i * 58.6;
    x.fillStyle = '#3a2a1a';
    x.beginPath(); x.ellipse(px, 482, 7, 4, 0, Math.PI, 0); x.closePath(); x.fill();
    x.fillStyle = '#f6c878';
    x.beginPath(); x.ellipse(px, 481.4, 3.4, 2, 0, Math.PI, 0); x.closePath(); x.fill();
  }
  x.fillStyle = '#0a0507'; x.fillRect(-OVER, 490, W2, H2 - 490);
}

// stage boards (overture / rehearsal / chandelier interiors)
function paintBoards(x) {
  x.fillStyle = '#150c08'; x.fillRect(112, 356, 736, 122); // upstage shadow under the boards
  const g = x.createLinearGradient(0, 376, 0, 478);
  g.addColorStop(0, '#2a1a10'); g.addColorStop(1, PAL.wood);
  x.fillStyle = g; x.fillRect(112, 376, 736, 100);
  for (let i = 0; i < 9; i++) { // plank seams, wider downstage
    const py = 378 + i * (100 / 9) ** 1.08 * 1.04;
    x.fillStyle = PAL.woodLo;
    x.fillRect(112, py, 736, 1.6);
    for (let s = 0; s < 5; s++) { // butt joints
      const jx = 150 + h2(i, s, 7) * 660;
      x.fillRect(jx, py, 1.4, 8 + h2(s, i) * 4);
    }
  }
  for (let i = 0; i < 26; i++) { // scuffs
    x.fillStyle = `rgba(106,69,38,${0.14 + h2(i, 3) * 0.16})`;
    x.fillRect(120 + h2(i, 5) * 700, 382 + h2(i, 9) * 88, 8 + h2(i, 11) * 22, 1.6);
  }
  x.fillStyle = PAL.woodHi; x.fillRect(112, 474, 736, 3);   // front edge catch
}

export function bakeHouse() {
  const c = canvas(W2, H2), x = c.getContext('2d');
  x.translate(OVER, OVER);
  paintHouseShell(x);
  paintBoards(x);
  // upstage wall: faint dark arches (opera-house back wall)
  x.fillStyle = '#100609'; x.fillRect(112, 96, 736, 262);
  x.fillStyle = 'rgba(58,16,22,0.5)';
  for (let i = 0; i < 5; i++) {
    const ax = 150 + i * 148;
    x.beginPath(); x.moveTo(ax, 340); x.lineTo(ax, 190); x.quadraticCurveTo(ax + 40, 150, ax + 80, 190); x.lineTo(ax + 80, 340); x.closePath(); x.fill();
  }
  return c;
}

// rehearsal: boards + fly ropes + stagehand props (the backdrop itself is the movable painter)
export function bakeRehearsal() {
  const c = canvas(W2, H2), x = c.getContext('2d');
  x.translate(OVER, OVER);
  paintHouseShell(x);
  paintBoards(x);
  // fly loft: pulley blocks + rope pairs the backdrop hangs from
  for (const rx of [320, 800]) {
    x.strokeStyle = '#4a3620'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(rx, -OVER); x.lineTo(rx, 128); x.stroke();
    x.fillStyle = '#241a10'; x.beginPath(); x.arc(rx, 130, 5, 0, 7); x.fill();
    x.fillStyle = PAL.goldLo; x.fillRect(rx - 8, 122, 16, 4);
  }
  // props: crate stack left, ladder right
  for (const [cx, cy, s] of [[160, 402, 1], [206, 420, 0.72]]) {
    x.fillStyle = '#3a2a1c'; x.fillRect(cx - 26 * s, cy - 34 * s, 52 * s, 34 * s);
    x.strokeStyle = '#584028'; x.lineWidth = 2; x.strokeRect(cx - 26 * s, cy - 34 * s, 52 * s, 34 * s);
    x.beginPath(); x.moveTo(cx - 26 * s, cy - 34 * s); x.lineTo(cx + 26 * s, cy); x.stroke();
  }
  x.strokeStyle = '#584028'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(828, 462); x.lineTo(852, 330); x.lineTo(862, 330); x.lineTo(844, 462); x.stroke();
  for (let i = 0; i < 6; i++) x.fillRect(832 + i * 4, 444 - i * 19, 22 - i * 2, 2);
  return c;
}

// THE BACKDROP — separate movable painter (it crashes at g=18).
// sway: pre-crash sway rad; fallP 0..1 drop; rt for the crumple settle.
export function paintBackdrop(x, sway, fallP, t) {
  const landed = fallP >= 1;
  x.save();
  if (landed) {
    // crumpled heap on the deck — canvas back, dark folds
    x.fillStyle = '#33261a';
    x.beginPath();
    x.moveTo(372, 442);
    for (let i = 0; i <= 8; i++) {
      const px = 372 + i * 47, py = 418 - Math.abs(Math.sin(i * 1.7)) * 16 - (i % 2) * 6;
      x.quadraticCurveTo(px - 18, py + 7, px, py + 3);
    }
    x.lineTo(748, 442); x.closePath(); x.fill();
    x.fillStyle = '#241a12';
    for (let i = 0; i < 7; i++) {
      x.beginPath(); x.ellipse(396 + i * 50, 432 - (i % 3) * 5, 26, 6, (i % 2 ? 1 : -1) * 0.2, 0, 7); x.fill();
    }
    x.fillStyle = 'rgba(216,178,122,0.25)'; // faint painted-scene ghosting on the top folds
    for (let i = 0; i < 5; i++) {
      x.beginPath(); x.ellipse(410 + i * 76, 420 - (i % 2) * 7, 22, 4, (i % 2 ? 1 : -1) * 0.15, 0, 7); x.fill();
    }
    x.fillStyle = PAL.wood; x.fillRect(368, 414, 408, 7); // fallen batten
    x.strokeStyle = '#4a3620'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(320, 130); x.quadraticCurveTo(330, 300, 356, 418); x.stroke(); // slack rope
    x.beginPath(); x.moveTo(800, 130); x.quadraticCurveTo(812, 290, 776, 414); x.stroke();
    x.restore();
    return;
  }
  const drop = 268 * fallP ** 1.6;
  x.translate(560, 152);
  x.rotate(sway * (1 - fallP) + 0.06 * fallP);
  x.translate(-560, -152);
  x.translate(0, drop);
  // ropes taut to the fly loft while it hangs
  x.strokeStyle = '#4a3620'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(320, 130); x.lineTo(372, 152); x.moveTo(800, 130); x.lineTo(748, 152); x.stroke();
  // batten
  x.fillStyle = PAL.wood; x.fillRect(356, 146, 408, 8);
  x.fillStyle = PAL.woodHi; x.fillRect(356, 146, 408, 2);
  // painted canvas: theatrical dusk — towers, moon, trees (flat, deliberately stagey)
  x.fillStyle = '#d8b27a'; x.fillRect(368, 154, 384, 262);
  x.fillStyle = '#e8c896'; x.beginPath(); x.arc(640, 226, 26, 0, 7); x.fill();
  x.fillStyle = '#b8875c';
  for (let i = 0; i < 4; i++) {
    const tx = 396 + i * 92;
    x.fillRect(tx, 250 - (i % 2) * 22, 34, 120 + (i % 2) * 22);
    x.beginPath(); x.moveTo(tx - 8, 252 - (i % 2) * 22); x.lineTo(tx + 17, 216 - (i % 2) * 26); x.lineTo(tx + 42, 252 - (i % 2) * 22); x.closePath(); x.fill();
  }
  x.fillStyle = '#6a4a68';
  x.beginPath(); x.moveTo(368, 330); x.quadraticCurveTo(470, 268, 560, 322); x.quadraticCurveTo(660, 262, 752, 326); x.lineTo(752, 416); x.lineTo(368, 416); x.closePath(); x.fill();
  x.fillStyle = '#2f4a38';
  for (let i = 0; i < 6; i++) {
    const tx = 384 + i * 64;
    x.beginPath(); x.arc(tx, 386, 20 + (i % 2) * 7, 0, 7); x.fill();
    x.fillRect(tx - 2.4, 386, 4.8, 30);
  }
  x.fillStyle = '#233226'; x.fillRect(368, 408, 384, 8);
  // canvas edge + painted frame
  x.strokeStyle = '#8a6a44'; x.lineWidth = 3; x.strokeRect(368, 154, 384, 262);
  x.strokeStyle = 'rgba(20,10,6,0.5)'; x.lineWidth = 1; x.strokeRect(372, 158, 376, 254);
  x.restore();
}

// audience head silhouette band (baked once; ducks live in shot 7)
export function bakeHeads() {
  const c = canvas(LW + 2 * OVER, 64), x = c.getContext('2d');
  x.translate(OVER, 0);
  x.fillStyle = '#070309'; x.fillRect(-OVER, 26, W2, 38);
  for (let i = 0; i < 22; i++) {
    const px = -20 + i * 46 + h2(i, 1) * 18;
    const r = 10 + h2(i, 2) * 5;
    const bald = h2(i, 3) > 0.72;               // some of the house is Cabald too
    x.fillStyle = '#0d070b';
    x.beginPath(); x.ellipse(px, 34, r * 1.5, 12, 0, 0, 7); x.fill();  // shoulders
    x.beginPath(); x.arc(px, 22, r, 0, 7); x.fill();                   // head
    if (!bald) { x.fillStyle = '#120a10'; x.beginPath(); x.arc(px, 17, r * 0.94, Math.PI, 0); x.fill(); }
    x.fillStyle = 'rgba(255,196,110,0.06)';            // footlight rim on the crowns
    x.beginPath(); x.arc(px, 21, r, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
  }
  return c;
}

// live heads draw with duck (rt-driven in the chandelier crash); band top at y≈480
export function drawHeads(x, headsC, duck = 0, t = 0) {
  x.save();
  x.translate(0, 540);
  x.scale(1, 1 - 0.34 * duck);
  x.translate(0, -540 - 24 * duck);
  x.drawImage(headsC, -OVER, 0, LW + 2 * OVER, 64, -OVER, 480, LW + 2 * OVER, 64);
  x.restore();
  if (duck > 0.01) { // fill the gap the squash opens at the very bottom
    x.fillStyle = '#070309';
    x.fillRect(-OVER, 537, W2, OVER + 10);
  }
}

// ---------- dressing room ----------
export function bakeDressingRoom(portraitC) {
  const c = canvas(W2, H2), x = c.getContext('2d');
  x.translate(OVER, OVER);
  // paneled wall
  const g = x.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0, '#241a12'); g.addColorStop(1, '#2e2016');
  x.fillStyle = g; x.fillRect(-OVER, -OVER, W2, H2);
  for (let i = 0; i < 10; i++) {
    x.fillStyle = 'rgba(0,0,0,0.22)';
    x.fillRect(40 + i * 96, 40, 3, 360);
    x.strokeStyle = 'rgba(120,90,58,0.24)'; x.lineWidth = 1.6;
    x.strokeRect(52 + i * 96, 52, 72, 200);
  }
  x.fillStyle = '#1c120c'; x.fillRect(-OVER, 296, W2, 8); // picture rail
  x.fillStyle = 'rgba(120,90,58,0.3)'; x.fillRect(-OVER, 296, W2, 2);
  // wainscot + floor + rug
  x.fillStyle = '#1a100a'; x.fillRect(-OVER, 396, W2, 14);
  x.fillStyle = '#241610'; x.fillRect(-OVER, 410, W2, H2 - 410);
  for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(-OVER, 416 + i * 12, W2, 1.6); }
  x.fillStyle = '#4a101c';
  x.beginPath(); x.ellipse(480, 470, 330, 40, 0, 0, 7); x.fill();
  x.strokeStyle = PAL.goldLo; x.lineWidth = 2;
  x.beginPath(); x.ellipse(480, 470, 322, 34, 0, 0, 7); x.stroke();
  // MIRROR: ornate gold oval frame (glass painted live for glow/face)
  const M = GEO.mirror;
  x.fillStyle = PAL.goldLo;
  x.beginPath(); x.ellipse(M.cx, M.cy, M.rx + 16, M.ry + 16, 0, 0, 7); x.fill();
  const fg = x.createLinearGradient(M.cx - M.rx, M.cy - M.ry, M.cx + M.rx, M.cy + M.ry);
  fg.addColorStop(0, PAL.goldHi); fg.addColorStop(0.45, PAL.gold); fg.addColorStop(1, PAL.goldLo);
  x.fillStyle = fg;
  x.beginPath(); x.ellipse(M.cx, M.cy, M.rx + 10, M.ry + 10, 0, 0, 7); x.fill();
  for (let i = 0; i < 30; i++) { // gilt bead ornaments
    const a = (i / 30) * Math.PI * 2;
    x.fillStyle = i % 2 ? PAL.goldHi : PAL.goldLo;
    x.beginPath();
    x.ellipse(M.cx + Math.cos(a) * (M.rx + 13), M.cy + Math.sin(a) * (M.ry + 13), 3.4, 2.4, a, 0, 7);
    x.fill();
  }
  x.fillStyle = '#6e5216';
  x.beginPath(); x.ellipse(M.cx, M.cy, M.rx + 3, M.ry + 3, 0, 0, 7); x.fill();
  // base glass: cold gradient + faint sheen (glow + ghost come live)
  x.save();
  x.beginPath(); x.ellipse(M.cx, M.cy, M.rx, M.ry, 0, 0, 7); x.clip();
  const gg = x.createLinearGradient(0, M.cy - M.ry, 0, M.cy + M.ry);
  gg.addColorStop(0, '#1c2a38'); gg.addColorStop(1, '#0d141d');
  x.fillStyle = gg; x.fillRect(M.cx - M.rx, M.cy - M.ry, M.rx * 2, M.ry * 2);
  x.fillStyle = 'rgba(190,210,235,0.05)';
  x.beginPath(); x.moveTo(M.cx - 60, M.cy - M.ry); x.lineTo(M.cx - 10, M.cy - M.ry); x.lineTo(M.cx - 60, M.cy + M.ry); x.lineTo(M.cx - 100, M.cy + M.ry); x.closePath(); x.fill();
  x.restore();
  // wall sconces flanking the mirror (flames live)
  for (const [sx, sy] of GEO.sconces) {
    x.fillStyle = PAL.gold;
    x.beginPath(); x.moveTo(sx - 5, sy + 18); x.quadraticCurveTo(sx - 10, sy, sx, sy - 4); x.lineTo(sx + 2, sy + 18); x.closePath(); x.fill();
    x.fillStyle = '#e8dfc8'; x.fillRect(sx - 2, sy - 14, 4.4, 12);
    x.fillStyle = PAL.goldLo; x.fillRect(sx - 4, sy - 3, 8.4, 3);
  }
  // vanity right
  x.fillStyle = '#3a2a1c'; x.fillRect(596, 352, 150, 10);
  x.fillStyle = '#241a10'; x.fillRect(604, 362, 10, 68); x.fillRect(726, 362, 10, 68);
  x.fillStyle = PAL.woodHi; x.fillRect(596, 352, 150, 2.4);
  x.fillStyle = '#8a4a5a'; x.fillRect(618, 336, 9, 16); x.fillRect(620, 330, 5, 7); // perfume bottles
  x.fillStyle = '#3a6a5a'; x.fillRect(734, 340, 8, 12); x.fillRect(736, 334, 4, 7);
  // candlesticks on the vanity (flames live)
  for (const [cx2, cy2] of GEO.vanity.candles) {
    x.fillStyle = PAL.gold; x.fillRect(cx2 - 3, cy2 + 2, 6, 4);
    x.fillStyle = '#e8dfc8'; x.fillRect(cx2 - 2.4, cy2 - 14, 4.8, 16);
  }
  // costume rack left
  x.strokeStyle = '#584028'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(96, 292); x.lineTo(240, 292); x.stroke();
  x.fillRect(100, 292, 4, 122); x.fillRect(232, 292, 4, 122);
  const gowns = [['#4a1020', 128], ['#101018', 176], ['#6e5216', 222]];
  for (const [col, gx] of gowns) {
    x.strokeStyle = '#8a7a5a'; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(gx, 292); x.lineTo(gx, 302); x.stroke();
    x.fillStyle = col;
    x.beginPath(); x.moveTo(gx - 14, 306); x.quadraticCurveTo(gx - 20, 360, gx - 12, 402);
    x.lineTo(gx + 12, 402); x.quadraticCurveTo(gx + 20, 360, gx + 14, 306); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.06)';
    x.fillRect(gx - 14, 310, 5, 84);
  }
  // Christine's framed portrait
  if (portraitC) x.drawImage(portraitC, GEO.portrait.x - portraitC.width / 2, GEO.portrait.y - portraitC.height / 2);
  return c;
}

// ---------- lair ----------
export function bakeOrgan() {
  ORGAN_PIPES.length = 0;
  const c = canvas(380, 350), x = c.getContext('2d');
  // pipe ranks: 3 perspective rows, tall gold pipes, rounded tops, mouth slots
  const rows = [
    { y0: 20, w: 12, gap: 4, n: 15, hMin: 190, hVar: 56 },
    { y0: 118, w: 16, gap: 4, n: 12, hMin: 128, hVar: 42 },
    { y0: 196, w: 21, gap: 5, n: 9, hMin: 78, hVar: 30 },
  ];
  for (let r = 0; r < rows.length; r++) {
    const R = rows[r];
    for (let i = 0; i < R.n; i++) {
      const px = 8 + i * (R.w + R.gap) + r * 7;
      const ph = R.hMin + h2(i, r, 12) * R.hVar;
      const py = R.y0 + (350 - 24 - R.y0 - ph);
      const g = x.createLinearGradient(px, 0, px + R.w, 0);
      g.addColorStop(0, PAL.goldLo); g.addColorStop(0.35, PAL.gold);
      g.addColorStop(0.62, PAL.goldHi); g.addColorStop(1, '#8a6a1e');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(px, py + R.w / 2);
      x.quadraticCurveTo(px, py, px + R.w / 2, py);
      x.quadraticCurveTo(px + R.w, py, px + R.w, py + R.w / 2);
      x.lineTo(px + R.w, 326); x.lineTo(px, 326); x.closePath();
      x.fill();
      x.fillStyle = '#241708'; x.fillRect(px + 2, py + R.w / 2 + R.hMin * 0.16, R.w - 4, 2.6); // mouth
      ORGAN_PIPES.push({ x: px, y: py, w: R.w, h: 326 - py, row: r, seed: i * 3 + r * 31 });
    }
  }
  // case sides
  x.fillStyle = '#1c1210'; x.fillRect(0, 210, 10, 116); x.fillRect(370, 210, 10, 116);
  x.fillStyle = PAL.goldLo; x.fillRect(0, 210, 10, 4); x.fillRect(370, 210, 10, 4);
  // console: dark wood, two keybeds, stop knobs
  x.fillStyle = '#241610';
  x.beginPath(); x.moveTo(36, 258); x.lineTo(196, 258); x.lineTo(210, 322); x.lineTo(22, 322); x.closePath(); x.fill();
  x.fillStyle = '#3a2a1c'; x.fillRect(30, 250, 172, 12);
  for (let i = 0; i < 7; i++) { x.fillStyle = PAL.goldLo; x.beginPath(); x.arc(48 + i * 22, 244, 3, 0, 7); x.fill(); }
  // keybeds (glow painted live on the film side at GEO.lair.console)
  for (let k2 = 0; k2 < 2; k2++) {
    const ky = 264 + k2 * 14;
    x.fillStyle = '#e8e2d2'; x.fillRect(44, ky, 146, 8);
    x.fillStyle = '#14100c';
    for (let i = 0; i < 10; i++) x.fillRect(50 + i * 14, ky, 5, 5.4);
  }
  x.fillStyle = '#1a100c'; x.fillRect(52, 296, 130, 26); // key drawer
  return c;
}

export function bakeCandelabra() {
  const c = canvas(76, 118), x = c.getContext('2d');
  const gold = PAL.gold, hi = PAL.goldHi, lo = PAL.goldLo;
  x.fillStyle = lo; x.fillRect(35, 40, 6, 66);
  x.fillStyle = gold; x.fillRect(36, 40, 4, 66);
  // arms
  for (const s of [-1, 0, 1]) {
    x.strokeStyle = s === 0 ? gold : lo; x.lineWidth = 4;
    x.beginPath();
    x.moveTo(38, 46);
    x.quadraticCurveTo(38 + s * 22, 42, 38 + s * 27, 22);
    x.stroke();
    x.fillStyle = gold;
    x.beginPath(); x.ellipse(38 + s * 27, 20, 6, 3, 0, 0, 7); x.fill();
    x.fillStyle = '#e8dfc8'; x.fillRect(38 + s * 27 - 2.4, 6, 4.8, 12); // candle
  }
  // centre spike ornament
  x.fillStyle = hi; x.beginPath(); x.moveTo(38, 8); x.lineTo(41, 18); x.lineTo(35, 18); x.closePath(); x.fill();
  // base
  x.fillStyle = lo; x.beginPath(); x.ellipse(38, 108, 20, 7, 0, 0, 7); x.fill();
  x.fillStyle = gold; x.beginPath(); x.ellipse(38, 105, 16, 5, 0, 0, 7); x.fill();
  return c;
}

export function bakeGondola() {
  const c = canvas(190, 52), x = c.getContext('2d');
  x.fillStyle = '#08080c';
  x.beginPath();
  x.moveTo(8, 14);
  x.quadraticCurveTo(95, 40, 182, 14);
  x.quadraticCurveTo(178, 34, 150, 42);
  x.quadraticCurveTo(95, 52, 40, 42);
  x.quadraticCurveTo(12, 34, 8, 14);
  x.closePath(); x.fill();
  // gold prow + stern curls
  x.strokeStyle = PAL.gold; x.lineWidth = 3;
  x.beginPath(); x.moveTo(10, 16); x.quadraticCurveTo(-2, 4, 10, 2); x.stroke();
  x.beginPath(); x.moveTo(180, 16); x.quadraticCurveTo(192, 4, 180, 2); x.stroke();
  x.strokeStyle = PAL.goldLo; x.lineWidth = 1.6;
  x.beginPath(); x.moveTo(20, 30); x.quadraticCurveTo(95, 42, 170, 30); x.stroke();
  // seat block + stern lantern post
  x.fillStyle = '#1a1410'; x.fillRect(74, 16, 42, 12);
  x.strokeStyle = PAL.goldLo; x.lineWidth = 2;
  x.beginPath(); x.moveTo(178, 14); x.lineTo(178, -6); x.stroke();
  x.fillStyle = PAL.gold; x.fillRect(173, -10, 10, 6);
  return c;
}

export function bakeLair() {
  const c = canvas(W2, H2), x = c.getContext('2d');
  x.translate(OVER, OVER);
  // rock walls
  x.fillStyle = '#0b0d13'; x.fillRect(-OVER, -OVER, W2, H2);
  for (let i = 0; i < 70; i++) {
    const px = h2(i, 1, 21) * (LW + 80) - 40, py = h2(i, 2, 21) * 400 - 20;
    const rw = 24 + h2(i, 3, 21) * 60, rh = 14 + h2(i, 4, 21) * 36;
    x.fillStyle = h2(i, 5, 21) > 0.5 ? '#10131c' : '#0e1118';
    x.beginPath(); x.ellipse(px, py, rw, rh, h2(i, 6, 21) * 3, 0, 7); x.fill();
    x.strokeStyle = 'rgba(40,50,72,0.25)'; x.lineWidth = 1.4;
    x.beginPath(); x.ellipse(px, py - 2, rw * 0.8, rh * 0.6, 0, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
  }
  // stalactites
  x.fillStyle = '#0a0c11';
  for (let i = 0; i < 14; i++) {
    const px = h2(i, 7, 21) * (LW + 60) - 30, ln = 26 + h2(i, 8, 21) * 66;
    x.beginPath(); x.moveTo(px - 9, -OVER); x.lineTo(px, ln); x.lineTo(px + 9, -OVER); x.closePath(); x.fill();
  }
  // water: dark mirror
  const wg = x.createLinearGradient(0, 442, 0, LH + OVER);
  wg.addColorStop(0, '#0a1018'); wg.addColorStop(1, '#05070d');
  x.fillStyle = wg; x.fillRect(-OVER, 442, W2, H2 - 442);
  x.fillStyle = 'rgba(125,144,181,0.14)'; x.fillRect(-OVER, 441, W2, 1.6); // waterline glint
  for (let i = 0; i < 30; i++) { // static ripple scars (live shimmer adds motion)
    x.fillStyle = `rgba(40,52,74,${0.1 + h2(i, 9, 21) * 0.12})`;
    x.fillRect(h2(i, 10, 21) * (LW + 60) - 30, 452 + h2(i, 11, 21) * 78, 20 + h2(i, 12, 21) * 50, 1.4);
  }
  return c;
}

// candle reflection streak in the water (vertical flipped faint sprite streak)
export function waterRefl(x, px, waterY, t, col = '255,179,71', a = 0.1) {
  const wob = Math.sin(t * 2.1 + px) * 2.4;
  const g = x.createLinearGradient(0, waterY, 0, waterY + 66);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.translate(px + wob, waterY);
  x.scale(1, 1);
  x.fillStyle = g;
  x.fillRect(-2.4, 0, 4.8, 66);
  x.fillRect(-5 + Math.sin(t * 3.1) * 2, 4, 10, 2);
  x.restore();
}

export function waterShimmer(x, t, y0 = 444, y1 = LH) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const sp = 8 + hash(i * 41) * 20;
    const px = ((hash(i * 17) * (LW + 80) + t * sp * (i % 2 ? 1 : -1)) % (LW + 80) + LW + 80) % (LW + 80) - 40;
    const py = y0 + 6 + hash(i * 7) * (y1 - y0 - 10);
    const a = 0.05 + 0.05 * Math.sin(t * 1.7 + i * 2.2);
    if (a <= 0.01) continue;
    x.fillStyle = `rgba(125,144,181,${a})`;
    x.fillRect(px, py, 16 + hash(i * 5) * 30, 1.3);
  }
  x.restore();
}

// ---------- masquerade hall (inside the arch) ----------
export function bakeMasquerade() {
  const c = canvas(W2, H2), x = c.getContext('2d');
  x.translate(OVER, OVER);
  // marble back wall + pilasters + moonlit windows
  x.fillStyle = '#8a8274'; x.fillRect(112, 96, 736, 262);
  const wg = x.createLinearGradient(0, 96, 0, 358);
  wg.addColorStop(0, '#a89e8c'); wg.addColorStop(1, '#847b6a');
  x.fillStyle = wg; x.fillRect(112, 96, 736, 262);
  for (let i = 0; i < 6; i++) {
    const px = 122 + i * 124;
    x.fillStyle = i % 2 ? '#26304a' : '#202a40';
    x.beginPath(); x.moveTo(px, 320); x.lineTo(px, 150); x.quadraticCurveTo(px + 34, 118, px + 68, 150); x.lineTo(px + 68, 320); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(232,201,106,0.5)'; x.lineWidth = 2.4; x.stroke();
    x.fillStyle = 'rgba(190,205,235,0.2)';
    x.beginPath(); x.moveTo(px + 8, 316); x.lineTo(px + 8, 156); x.lineTo(px + 26, 138); x.lineTo(px + 26, 316); x.closePath(); x.fill();
  }
  // banners
  for (const bx of [220, 480, 740]) {
    x.fillStyle = PAL.velvet;
    x.beginPath(); x.moveTo(bx - 26, 84); x.lineTo(bx + 26, 84); x.lineTo(bx + 26, 150);
    x.lineTo(bx, 168); x.lineTo(bx - 26, 150); x.closePath(); x.fill();
    x.fillStyle = PAL.velvetHi; x.fillRect(bx - 26, 84, 52, 7);
    x.strokeStyle = PAL.gold; x.lineWidth = 2;
    x.beginPath(); x.moveTo(bx - 22, 96); x.lineTo(bx + 22, 96); x.stroke();
    x.fillStyle = PAL.gold; x.beginPath(); x.arc(bx, 122, 7, 0, 7); x.fill();
  }
  // garland swags
  x.strokeStyle = PAL.goldLo; x.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    x.beginPath(); x.moveTo(112, 100);
    x.quadraticCurveTo(112 + 92 + i * 184, 168 + (i % 2) * 22, 112 + 184 + i * 184, 100);
    x.stroke();
  }
  x.fillStyle = '#4a6a3a';
  for (let i = 0; i < 26; i++) {
    const gx = 130 + h2(i, 4, 31) * 700, gy = 104 + Math.sin((gx - 112) / 184 * Math.PI) * 46 + h2(i, 5, 31) * 14;
    x.beginPath(); x.ellipse(gx, gy, 5, 2.4, h2(i, 6, 31) * 3, 0, 7); x.fill();
  }
  // checker marble floor in perspective (rows converge to a vanishing point)
  const vp = { x: 480, y: 246 };
  let prev = null;
  for (let r2 = 0; r2 <= 7; r2++) {
    const y = 356 + (476 - 356) * (r2 / 7) ** 1.35;
    if (prev) {
      const p0 = (prev - vp.y) / (476 - vp.y), p1 = (y - vp.y) / (476 - vp.y);
      for (let cix = -7; cix < 7; cix++) {
        const xa0 = vp.x + cix * 70 * p0, xb0 = vp.x + (cix + 1) * 70 * p0;
        const xa1 = vp.x + cix * 70 * p1, xb1 = vp.x + (cix + 1) * 70 * p1;
        x.fillStyle = (cix + r2) % 2 ? '#d8d2c2' : '#343a46';
        x.beginPath();
        x.moveTo(xa0 - OVER * 0, prev); x.lineTo(xb0, prev); x.lineTo(xb1, y); x.lineTo(xa1, y);
        x.closePath(); x.fill();
      }
    }
    prev = y;
  }
  x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(112, 352, 736, 5);
  // crimson runner
  x.fillStyle = '#6e1424';
  x.beginPath(); x.moveTo(452, 356); x.lineTo(508, 356); x.lineTo(540, 476); x.lineTo(420, 476); x.closePath(); x.fill();
  x.strokeStyle = PAL.goldLo; x.lineWidth = 1.6;
  x.beginPath(); x.moveTo(452, 356); x.lineTo(420, 476); x.moveTo(508, 356); x.lineTo(540, 476); x.stroke();
  // grand staircase (right): six discrete steps up to a landing, gold balustrade, red carpet
  const steps = 6, x0 = 618, y0 = 442, x1 = 848, y1 = 302, sh2 = (y0 - y1) / steps;
  for (let i = 0; i < steps; i++) {
    const sy = y0 - i * sh2;                 // tread top line
    const sx = x0 + i * 38;                  // this step's nose (each step further right? no—)
    // riser face: from this tread's top down to the next lower tread, spanning to the wall
    const rx = x0 + i * 38;
    x.fillStyle = i % 2 ? '#cfc9b8' : '#dad4c4';
    x.fillRect(rx, sy - sh2, x1 + 42 - rx, sh2);
    x.fillStyle = 'rgba(0,0,0,0.14)';        // riser bottom shadow
    x.fillRect(rx, sy - 3, x1 + 42 - rx, 3);
    x.fillStyle = PAL.goldLo;                // gold nosing
    x.fillRect(rx, sy - sh2, x1 + 42 - rx, 2.4);
    // crimson carpet strip down each riser's left third
    x.fillStyle = '#7a1424';
    x.fillRect(rx + 6, sy - sh2 + 2.4, 26, sh2 - 5);
  }
  x.fillStyle = '#c8c2b2'; x.fillRect(700, 284, 190, 18);   // landing platform
  x.fillStyle = PAL.goldLo; x.fillRect(700, 300, 190, 3);
  x.fillStyle = '#7a1424'; x.fillRect(700, 286, 60, 16);    // carpet on the landing
  // balustrade
  x.strokeStyle = PAL.gold; x.lineWidth = 3;
  x.beginPath(); x.moveTo(622, 402); x.quadraticCurveTo(720, 350, 846, 266); x.stroke();
  x.fillStyle = PAL.goldLo;
  for (let i = 0; i < 5; i++) {
    const u = i / 4;
    const bx = 630 + u * 200, by = 400 - u * 128;
    x.fillRect(bx, by, 3, 44 - u * 20);
    x.fillStyle = PAL.gold; x.beginPath(); x.arc(bx + 1.5, by - 3, 3.4, 0, 7); x.fill();
    x.fillStyle = PAL.goldLo;
  }
  x.fillStyle = PAL.gold; x.beginPath(); x.arc(620, 400, 6, 0, 7); x.fill(); // newel ball
  return c;
}

// ---------- rooftop ----------
export function bakeRooftop() {
  const c = canvas(W2, H2), x = c.getContext('2d');
  x.translate(OVER, OVER);
  // night sky
  const g = x.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0, '#0a0e1a'); g.addColorStop(0.7, '#101828'); g.addColorStop(1, '#141c30');
  x.fillStyle = g; x.fillRect(-OVER, -OVER, W2, H2);
  for (let i = 0; i < 70; i++) {
    const a = 0.16 + h2(i, 1, 41) * 0.5;
    x.fillStyle = `rgba(220,230,246,${a})`;
    x.fillRect(h2(i, 2, 41) * (LW + 60) - 30, h2(i, 3, 41) * 300 - 20, h2(i, 4, 41) > 0.9 ? 2 : 1.3, 1.3);
  }
  // moon + halo
  const M = GEO.roof.moon;
  for (const [r, a] of [[74, 0.05], [58, 0.08]]) {
    x.fillStyle = `rgba(226,232,244,${a})`;
    x.beginPath(); x.arc(M.x, M.y, r, 0, 7); x.fill();
  }
  x.fillStyle = '#e8edf6'; x.beginPath(); x.arc(M.x, M.y, 44, 0, 7); x.fill();
  x.fillStyle = '#ccd6e4';
  for (const [dx, dy, r] of [[-12, -8, 7], [10, 6, 5], [-2, 16, 4], [18, -14, 3.4]]) {
    x.beginPath(); x.arc(M.x + dx, M.y + dy, r, 0, 7); x.fill();
  }
  // cloud slabs crossing the moon
  for (const [cx2, cy2, cw, a] of [[260, 96, 220, 0.85], [120, 150, 190, 0.7], [420, 60, 260, 0.6]]) {
    x.fillStyle = `rgba(20,28,46,${a})`;
    x.beginPath(); x.ellipse(cx2, cy2, cw / 2, 12, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(125,144,181,0.25)';
    x.beginPath(); x.ellipse(cx2, cy2 + 9, cw / 2.2, 3, 0, 0, 7); x.fill();
  }
  // distant city
  x.fillStyle = '#0d1322';
  let bx = -40;
  while (bx < LW + 40) {
    const bw = 34 + h2(bx, 1, 42) * 50, bh = 40 + h2(bx, 2, 42) * 90;
    x.fillRect(bx, 380 - bh, bw, bh + 60);
    bx += bw + 4;
  }
  // opera rooftops: lead domes + chimney stacks
  const dome = (dx, dy, r, col = '#3a4358') => {
    x.fillStyle = col;
    x.beginPath(); x.arc(dx, dy, r, Math.PI, 0); x.closePath(); x.fill();
    x.strokeStyle = '#4d5872'; x.lineWidth = 1.6;
    for (let i = -2; i <= 2; i++) {
      x.beginPath(); x.moveTo(dx, dy - r); x.quadraticCurveTo(dx + i * r * 0.42, dy - r * 0.5, dx + i * r * 0.55, dy); x.stroke();
    }
    x.strokeStyle = 'rgba(200,214,238,0.5)'; x.lineWidth = 2;   // moonlit rim
    x.beginPath(); x.arc(dx, dy, r, Math.PI * 1.15, Math.PI * 1.6); x.stroke();
    x.fillStyle = PAL.goldLo; x.fillRect(dx - 1.6, dy - r - 8, 3.2, 8);
    x.fillStyle = PAL.gold; x.beginPath(); x.arc(dx, dy - r - 9, 2.6, 0, 7); x.fill();
  };
  dome(300, 218, 58);
  x.fillStyle = '#2c3346'; x.fillRect(238, 218, 124, 60);
  for (let i = 0; i < 3; i++) { // dormer windows, one warm-lit
    x.fillStyle = i === 1 ? 'rgba(255,179,71,0.55)' : '#1a2234';
    x.fillRect(256 + i * 40, 232, 16, 22);
    x.beginPath(); x.moveTo(254 + i * 40, 232); x.lineTo(264 + i * 40, 220); x.lineTo(274 + i * 40, 232); x.closePath();
    x.fillStyle = '#3a4358'; x.fill();
  }
  dome(712, 252, 38);
  x.fillStyle = '#2c3346'; x.fillRect(676, 252, 72, 44);
  // chimney blocks with pots
  for (const [cx2, cw, ch] of [[118, 30, 54], [524, 24, 44], [852, 34, 62]]) {
    x.fillStyle = '#2c2430'; x.fillRect(cx2, 380 - ch, cw, ch + 4);
    x.fillStyle = '#3a3040'; x.fillRect(cx2, 380 - ch, cw, 4);
    x.fillStyle = '#191420';
    x.fillRect(cx2 + 4, 380 - ch - 10, 7, 10); x.fillRect(cx2 + cw - 11, 380 - ch - 10, 7, 10);
  }
  // flagpole + pennant
  x.strokeStyle = '#3a4358'; x.lineWidth = 2.4;
  x.beginPath(); x.moveTo(806, 380); x.lineTo(806, 262); x.stroke();
  x.fillStyle = '#7a1424';
  x.beginPath(); x.moveTo(806, 264); x.quadraticCurveTo(830, 270, 842, 268); x.lineTo(806, 278); x.closePath(); x.fill();
  // ridge beam + parapet + snow patches
  x.fillStyle = '#39424f'; x.fillRect(-OVER, 424, W2, 14);
  x.fillStyle = '#4d5872'; x.fillRect(-OVER, 424, W2, 2.6);
  for (let i = 0; i < 46; i++) { // snow dusting on the ridge + parapet face
    x.fillStyle = `rgba(226,234,246,${0.4 + h2(i, 6, 43) * 0.4})`;
    x.fillRect(h2(i, 7, 43) * (LW + 60) - 30, 425 + h2(i, 8, 43) * 3, 3 + h2(i, 9, 43) * 7, 1.6);
  }
  x.fillStyle = '#2a3140'; x.fillRect(-OVER, 438, W2, 40);
  for (let i = 0; i < 16; i++) {
    x.fillStyle = 'rgba(12,16,26,0.7)';
    x.fillRect(h2(i, 10, 43) * (LW + 40) - 20, 444 + h2(i, 11, 43) * 26, 10 + h2(i, 12, 43) * 26, 8 + h2(i, 13, 43) * 8);
  }
  return c;
}

export function snowMotes(x, t, k = 1) {
  if (k <= 0.02) return;
  x.save();
  for (let i = 0; i < 44; i++) {
    const sp = 14 + hash(i * 23) * 30;
    const px = hash(i * 7) * (LW + 40) - 20 + Math.sin(t * 0.9 + i * 2.4) * (8 + hash(i) * 12);
    const py = ((hash(i * 13) * (LH + 60) + t * sp) % (LH + 60)) - 30;
    const a = (0.16 + 0.2 * hash(i * 5)) * k;
    x.fillStyle = `rgba(226,234,246,${a})`;
    x.fillRect(px, py, 1.6, 1.6);
  }
  x.restore();
}

// ---------- coda: the ruined stage ----------
export function bakeCoda() {
  const c = canvas(W2, H2), x = c.getContext('2d');
  x.translate(OVER, OVER);
  x.fillStyle = '#0a0709'; x.fillRect(-OVER, -OVER, W2, H2);
  // scorched back wall with a broken arch
  x.fillStyle = '#140d10'; x.fillRect(112, 96, 736, 268);
  x.strokeStyle = 'rgba(90,60,40,0.35)'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(200, 340); x.lineTo(200, 170); x.quadraticCurveTo(340, 90, 480, 130); x.stroke(); // surviving arch rib
  x.beginPath(); x.moveTo(700, 340); x.lineTo(700, 180); x.quadraticCurveTo(660, 130, 610, 126); x.stroke();
  for (let i = 0; i < 40; i++) { // soot scorch
    x.fillStyle = `rgba(0,0,0,${0.2 + h2(i, 1, 51) * 0.3})`;
    x.beginPath(); x.ellipse(h2(i, 2, 51) * 800 - 20, 130 + h2(i, 3, 51) * 210, 16 + h2(i, 4, 51) * 40, 8 + h2(i, 5, 51) * 18, h2(i, 6, 51) * 3, 0, 7); x.fill();
  }
  // burned drape scrap on a fallen beam, right
  x.save();
  x.translate(724, 330); x.rotate(0.5);
  x.fillStyle = '#241210'; x.fillRect(-60, -10, 150, 14);   // beam
  x.fillStyle = '#3a0e18';
  x.beginPath(); x.moveTo(-40, 4); x.quadraticCurveTo(-20, 60, 6, 78); x.quadraticCurveTo(20, 50, 40, 4);
  x.quadraticCurveTo(0, 22, -40, 4); x.closePath(); x.fill();
  x.restore();
  // broken column stub, left
  x.fillStyle = '#241c1c'; x.fillRect(150, 240, 44, 140);
  x.fillStyle = '#30262a'; x.fillRect(150, 240, 44, 8);
  x.fillStyle = '#1a1216';
  x.beginPath(); x.moveTo(150, 240); x.lineTo(172, 224); x.lineTo(194, 244); x.closePath(); x.fill();
  // charred boards
  const g = x.createLinearGradient(0, 376, 0, 478);
  g.addColorStop(0, '#1c110c'); g.addColorStop(1, '#2a1a10');
  x.fillStyle = g; x.fillRect(112, 376, 736, 102);
  for (let i = 0; i < 9; i++) {
    x.fillStyle = '#0c0705';
    x.fillRect(112, 380 + i * 11, 736, 1.6);
  }
  // cracked gaps showing the void
  x.fillStyle = '#040203';
  x.beginPath();
  x.moveTo(380, 376);
  for (let i = 0; i <= 6; i++) x.lineTo(372 + i * 14 + (i % 2) * 9, 382 + i * 15);
  x.lineTo(470, 478); x.lineTo(430, 478); x.lineTo(376, 396); x.closePath(); x.fill();
  x.beginPath();
  x.moveTo(560, 478);
  for (let i = 0; i <= 4; i++) x.lineTo(556 + i * 12 + (i % 2) * -8, 470 - i * 20);
  x.lineTo(610, 380); x.lineTo(586, 380); x.lineTo(560, 430); x.closePath(); x.fill();
  // crystal debris glittering in the boards
  for (let i = 0; i < 40; i++) {
    const px = 140 + h2(i, 7, 51) * 680, py = 386 + h2(i, 8, 51) * 84;
    x.fillStyle = h2(i, 9, 51) > 0.7 ? 'rgba(201,162,39,0.7)' : 'rgba(190,214,238,0.6)';
    x.save(); x.translate(px, py); x.rotate(h2(i, 10, 51) * 3);
    x.fillRect(-2.4, -1.4, 4.8, 2.8);
    x.restore();
  }
  // THE THRONE: high-backed gothic chair (mask + candle painted live)
  const T = GEO.coda.throne;
  x.fillStyle = '#191016';
  x.beginPath(); x.moveTo(T.x - 44, T.y + 96);
  x.lineTo(T.x - 40, T.y - 60); x.quadraticCurveTo(T.x, T.y - 108, T.x + 40, T.y - 60);
  x.lineTo(T.x + 44, T.y + 96); x.closePath(); x.fill();
  x.strokeStyle = PAL.goldLo; x.lineWidth = 2;
  x.beginPath(); x.moveTo(T.x - 34, T.y + 88); x.lineTo(T.x - 31, T.y - 54); x.quadraticCurveTo(T.x, T.y - 96, T.x + 31, T.y - 54); x.lineTo(T.x + 34, T.y + 88); x.stroke();
  for (let i = 0; i < 5; i++) { // carved rays in the back panel
    x.strokeStyle = 'rgba(201,162,39,0.3)'; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(T.x, T.y - 84);
    x.lineTo(T.x - 28 + i * 14, T.y - 20 - Math.abs(i - 2) * -8); x.stroke();
  }
  x.fillStyle = '#2a1218'; x.fillRect(T.x - 40, T.y + 34, 80, 14); // seat cushion
  x.fillStyle = '#241014'; x.fillRect(T.x - 40, T.y + 48, 80, 48);
  x.fillStyle = '#100a0e'; x.fillRect(T.x - 52, T.y + 40, 12, 56); x.fillRect(T.x + 40, T.y + 40, 12, 56); // arms
  x.fillStyle = PAL.goldLo; x.fillRect(T.x - 52, T.y + 38, 12, 3); x.fillRect(T.x + 40, T.y + 38, 12, 3);
  return c;
}

// the half-mask prop (resting on the throne / knocked-off projectile)
export function bakeMaskProp(variant = 'half') {
  const c = canvas(34, 30), x = c.getContext('2d');
  x.translate(17, 15);
  x.fillStyle = IVORY;
  x.beginPath();
  if (variant === 'half') {
    x.moveTo(4, -12); x.quadraticCurveTo(-13, -11, -13, 2);
    x.quadraticCurveTo(-13, 12, -5, 14); x.quadraticCurveTo(1, 15, 4, 12);
  } else {
    x.ellipse(0, 1, 13, 15, 0, 0, 7);
  }
  x.closePath(); x.fill();
  x.strokeStyle = MASK_INK; x.lineWidth = 1; x.stroke();
  x.strokeStyle = GOLD; x.lineWidth = 1.4;
  x.beginPath();
  if (variant === 'half') { x.moveTo(4, -12); x.quadraticCurveTo(6.5, 1, 4, 12); } else { x.moveTo(-12, 1); x.quadraticCurveTo(0, -7, 12, 1); }
  x.stroke();
  x.fillStyle = MASK_INK;
  if (variant === 'half') x.fillRect(-11, -3, 8, 2.6);
  else { x.fillRect(-11, -3, 8, 2.6); x.fillRect(3, -3, 8, 2.6); }
  return c;
}

// ---------- glass shards / dust / sparks (analytic, seeded tables built in prepare) ----------

export function makeShards(cx, cy, n, seed, spread = 1) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const ang = hash(seed + i * 3.1) * Math.PI * 2;
    const sp2 = 60 + hash(seed + i * 5.7) * 240;
    out.push({
      x: cx, y: cy,
      vx: Math.cos(ang) * sp2 * spread,
      vy: Math.sin(ang) * sp2 * 0.55 - 60 - hash(seed + i * 7.3) * 120,
      rot: hash(seed + i * 9.1) * 6.3, vr: (hash(seed + i * 11.3) - 0.5) * 14,
      s: 2 + hash(seed + i * 13.7) * 4,
    });
  }
  return out;
}

export function drawShards(x, table, rt, g0, life = 1.4, col = '205,226,248') {
  for (const s of table) {
    const age = rt - g0;
    if (age < 0 || age > life) continue;
    const px = s.x + s.vx * age, py = s.y + s.vy * age + 0.5 * 340 * age * age;
    const a = 0.85 * (1 - age / life);
    x.save();
    x.translate(px, py); x.rotate(s.rot + s.vr * age);
    x.fillStyle = `rgba(${col},${a})`;
    x.beginPath(); x.moveTo(0, -s.s); x.lineTo(s.s * 0.7, s.s * 0.6); x.lineTo(-s.s * 0.6, s.s * 0.5); x.closePath(); x.fill();
    x.fillStyle = `rgba(255,255,255,${a * 0.7})`;
    x.fillRect(-0.7, -s.s * 0.5, 1.4, s.s);
    x.restore();
  }
}

// dust plume puffs from an impact {g, x, y}
export function dustPlume(x, ev, rt, scale = 1, col = '148,132,110') {
  const age = rt - ev.g;
  if (age < 0 || age > 1.3) return;
  for (let i = 0; i < 12; i++) {
    const u = i / 12;
    const px = ev.x + (hash(i * 13 + ev.seed) - 0.5) * 260 * scale * (0.3 + age);
    const py = ev.y - 8 - hash(i * 7 + ev.seed) * 46 * scale + age * (14 + hash(i) * 20) - u * 12 * age;
    const r = (10 + hash(i * 3 + ev.seed) * 26) * scale * (0.5 + age * 1.3);
    const a = 0.3 * (1 - age / 1.3) * (0.5 + hash(i) * 0.5);
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
}

// impact sparks — hot streaks with gravity (key on rt so they bloom through freezes)
export function sparks(x, events, worldT, col = '255,208,120', n = 12) {
  for (const ev of events) {
    const age = worldT - ev.g;
    if (age < 0 || age > 0.55) continue;
    for (let i = 0; i < n; i++) {
      const a = 1 - age / 0.55;
      const vx = (hash(ev.seed + i * 3) - 0.5) * 420, vy = -90 - hash(ev.seed + i * 5) * 240;
      const px = ev.x + vx * age, py = ev.y + vy * age + 0.5 * 620 * age * age;
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = `rgba(${col},${a})`;
      x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px - vx * 0.02, py - vy * 0.02 - 30 * 0.02); x.stroke();
      x.restore();
    }
    // white core ring
    const a = 0.5 * (1 - age / 0.3);
    if (a > 0) {
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = `rgba(255,244,214,${a})`;
      x.lineWidth = 3 * a + 0.6;
      x.beginPath(); x.arc(ev.x, ev.y, 6 + age * 130, 0, 7); x.stroke();
      x.restore();
    }
  }
}

// confetti table (masquerade) — built once, drawn pure in t
export function makeConfetti(n = 74, seed = 61) {
  const cols = ['#e8c96a', '#a81e30', '#f2ecdc', '#7d90b5', '#c9a227'];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: hash(i * 3.3 + seed) * LW, sp: 34 + hash(i * 5.1 + seed) * 60,
      ph: hash(i * 7.7 + seed) * 9, sw: 10 + hash(i * 9.3 + seed) * 22,
      col: cols[i % cols.length], rot: hash(i * 11.1 + seed) * 6.3,
    });
  }
  return out;
}

export function drawConfetti(x, tbl, t, k = 1) {
  if (k <= 0.02) return;
  for (const p of tbl) {
    const py = ((p.ph * 37 + t * p.sp) % (LH + 40)) - 20;
    const px = p.x + Math.sin(t * 1.6 + p.ph) * p.sw;
    x.save();
    x.translate(px, py);
    x.rotate(p.rot + t * 2.2 + Math.sin(t * 3 + p.ph));
    x.globalAlpha = 0.8 * k;
    x.fillStyle = p.col;
    x.fillRect(-2.6, -1.5, 5.2, 3);
    x.restore();
  }
}

// bat-fog swirl (the vanish) — orbiting dark wisps, pure in t
export function batSwirl(x, cx, cy, t, k = 1) {
  if (k <= 0.02) return;
  for (let i = 0; i < 14; i++) {
    const sp = 3.4 + hash(i * 7) * 3;
    const ang = t * sp + i * 2.24;
    const rr = 12 + hash(i * 3) * 30 * k;
    const px = cx + Math.cos(ang) * rr * 1.3, py = cy + Math.sin(ang * 0.8) * rr * 0.7 - hash(i * 5) * 20 * k;
    const a = 0.34 * k * (0.4 + hash(i) * 0.6);
    x.fillStyle = `rgba(10,8,14,${a})`;
    x.beginPath(); x.ellipse(px, py, 9 + hash(i * 11) * 12, 4 + hash(i * 13) * 5, ang, 0, 7); x.fill();
  }
}

// ---------- THE CHANDELIER (parametric prop) ----------
// st: { x, y, scale, ang (rad about hang point), lit 0..1, broken 0..1, motion 0..1 (speed streaks) }
export function drawChandelier(x, st) {
  const s = st.scale, ang = st.ang;
  x.save();
  x.translate(st.x, st.y);
  x.rotate(ang);
  x.scale(s, s);
  // motion streaks while plunging
  if (st.motion > 0.02) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) {
      const mx = (hash(i * 13) - 0.5) * 150;
      x.fillStyle = `rgba(232,201,106,${0.2 * st.motion * hash(i * 7)})`;
      x.fillRect(mx, -170 - hash(i * 5) * 60, 2.4, 60 + hash(i * 3) * 80);
    }
    x.restore();
  }
  // gold armature: crown stem + two tiers of upward-swept arms
  x.fillStyle = PAL.goldLo; x.fillRect(-3, -78, 6, 106);
  x.fillStyle = PAL.gold; x.fillRect(-2, -78, 4, 106);
  x.fillStyle = PAL.goldHi; x.fillRect(-1, -78, 2, 106);
  for (const [ty, arms, ar] of [[-40, 6, 50], [-8, 8, 66]]) {
    x.fillStyle = PAL.gold;
    x.beginPath(); x.ellipse(0, ty, 11, 4.4, 0, 0, 7); x.fill();
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2 + ty;
      const ax = Math.cos(a) * ar;
      const ay = -(Math.abs(Math.sin(a)) * ar * 0.42 + 7); // arms always sweep UP from the body
      x.strokeStyle = PAL.goldLo; x.lineWidth = 3;
      x.beginPath(); x.moveTo(0, ty); x.quadraticCurveTo(ax * 0.55, ty + ay - 12, ax, ty + ay); x.stroke();
      x.strokeStyle = PAL.goldHi; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(0, ty - 1); x.quadraticCurveTo(ax * 0.55, ty + ay - 13, ax, ty + ay - 1); x.stroke();
      // candle cup + wax at the upturned tip
      x.fillStyle = PAL.gold; x.beginPath(); x.ellipse(ax, ty + ay - 1, 3.4, 2, 0, 0, 7); x.fill();
      x.fillStyle = '#e8dfc8'; x.fillRect(ax - 1.6, ty + ay - 9, 3.2, 8);
      if (st.broken < 0.6) {
        x.globalAlpha = 1 - st.broken;
        flame(x, ax, ty + ay - 9, 6, st.t, i * 7 + ty, 0, st.lit);
        x.globalAlpha = 1;
      }
      // crystal drops hanging below the arm's outer half
      const drops = Math.round(4 * (1 - st.broken));
      for (let d2 = 0; d2 < drops; d2++) {
        const dy = ty + ay + 10 + d2 * 6.4;
        const dx = ax * (0.72 + d2 * 0.07);
        const sway = Math.sin(st.t * 2.4 + i + d2) * (1.2 + d2 * 0.4);
        x.fillStyle = d2 % 2 ? 'rgba(232,226,206,0.88)' : 'rgba(248,242,226,0.96)';
        x.beginPath();
        x.moveTo(dx + sway, dy); x.lineTo(dx + sway + 2, dy + 3); x.lineTo(dx + sway, dy + 6); x.lineTo(dx + sway - 2, dy + 3);
        x.closePath(); x.fill();
      }
    }
  }
  // lower gold finial
  x.fillStyle = PAL.goldHi; x.beginPath(); x.arc(0, 32, 5, 0, 7); x.fill();
  x.restore();
  // warm glow of the whole body
  if (st.lit > 0.05 && st.broken < 0.8) warmGlow(x, st.x, st.y, 90 * s, 0.1 * st.lit * (1 - st.broken));
}

// cables from the ceiling mount to the chandelier (n surviving cables)
export function drawCables(x, mx, my, cx2, cy2, n = 2, whipRt = -1) {
  x.save();
  x.strokeStyle = '#6a5a38'; x.lineWidth = 2;
  if (n >= 2) {
    x.beginPath(); x.moveTo(mx - 8, my); x.lineTo(cx2 - 20, cy2 - 58); x.stroke();
    x.beginPath(); x.moveTo(mx + 8, my); x.lineTo(cx2 + 20, cy2 - 58); x.stroke();
  } else if (n === 1) {
    x.beginPath(); x.moveTo(mx, my); x.lineTo(cx2, cy2 - 58); x.stroke();
  }
  // snapped-cable whip (rt-animated curl)
  if (whipRt >= 0 && whipRt < 0.9) {
    const u = whipRt / 0.9;
    x.strokeStyle = '#8a7a4a'; x.lineWidth = 1.8;
    x.beginPath();
    x.moveTo(mx + 8, my);
    x.quadraticCurveTo(mx + 30 + u * 60, my - 10 + u * 26, mx + 16 + u * 40, my - 26 * (1 - u) + u * 10);
    x.stroke();
  }
  x.restore();
}

// organ pipe glints — pass beatPhase (0..1 within the beat) + intensity
export function pipeGlints(x, pipes, beatPhase, k = 1) {
  if (k <= 0.02) return;
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (const p of pipes) {
    const ph = hash(p.seed) * 6.3;
    const a = Math.max(0, Math.sin((beatPhase + ph * 0.08) * Math.PI)) * k * (0.3 + hash(p.seed * 3) * 0.5);
    if (a <= 0.02) continue;
    const g = x.createLinearGradient(0, p.y, 0, p.y + p.h);
    g.addColorStop(0, `rgba(255,232,160,${a * 0.5})`);
    g.addColorStop(0.5, `rgba(255,232,160,${a * 0.16})`);
    g.addColorStop(1, 'rgba(255,232,160,0)');
    x.fillStyle = g;
    x.fillRect(p.x + p.w * 0.5, p.y + 2, 2.2, p.h - 6);
  }
  x.restore();
}
