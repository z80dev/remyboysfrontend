// THE HAIRTRIX — baked pixel sets, cast repaints, props and analytic painters.
// Everything deterministic: hash-seeded, no Math.random; every painter is a pure function of t.
// Sets are baked once in prepare() with OVER px of overscan so shake never exposes stale pixels.
import { hash } from 'filmkit/lib.js';
import { canvas } from '../remy-bros/art.js';
import { LW, LH, GROUND, PHOS } from './timeline.js';

export const OVER = 56;

const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const c255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Direct pixel buffer (same pattern as remy-bros) for a few ImageData bakes.
function pixels(w, h) {
  w = Math.round(w); h = Math.round(h);
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const set = (x, y, col, a = 255) => {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const [r, g, b] = typeof col === 'string' ? rgbOf(col) : col;
    const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
  };
  const done = () => (ctx.putImageData(img, 0, 0), c);
  return { c, set, done, w, h };
}
const rigCtx = (R) => R.c.getContext('2d');

// ---------- cast repaints ------------------------------------------------------

// FLOW / TRIMNITY trench coat: paint the orange fur collar black leather — both the saturated
// oranges and the pale fur tips (#c9bc88 family) in the shoulder band. FLOW's hip "card" is a
// #606060 patch under his hair drape (invisible at stage scale) and is left alone.
export function repaintTrench(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  const id = x.getImageData(0, 0, R.w, R.h), d = id.data;
  const faceBottom = R.top + 48, furBottom = R.top + 84;
  for (let y = 0; y < R.h; y++) {
    if (y < faceBottom) continue;
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4;
      if (d[i + 3] < 8) continue;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = (r + g + b) / 3;
      const isOrange = r > 95 && r > g * 1.5 + 12 && r > b * 2.2 + 20;
      const isPaleFur = y < furBottom && r >= 150 && r - b >= 50 && g - b >= 38; // #c9bc88 tips
      if (isOrange || isPaleFur) {
        const nl = 16 + lum * 0.14; // keep the original shading as faint leather sheen
        d[i] = c255(nl); d[i + 1] = c255(nl * 0.94); d[i + 2] = c255(nl * 1.06);
      }
    }
  }
  x.putImageData(id, 0, 0);
  return { ...R, c };
}

// Eye anchor: the chibi near-sprites share a face template — iris centres at
// (cx−11, bottom−UP[id]) with UP measured per lead on labelled row bands
// (output/_contact/hairtrix-eyerow.png; brows ≈38–44, eyes ≈44–58, alpha bottom = 114 on
// every cast sprite while `top` varies with hair padding — 2186 starts at row 12, the rest
// at 13 — so the anchor is the BOTTOM). The bald swarm shares SMIRK's 65. Luminance-based
// detection failed on the darker-skinned agents (whole face under threshold).
const EYE_UP = { 2186: 63, 2719: 67, 3972: 66, 1989: 65 };
export const measureEyes = (R, id = 1989) => ({ y: R.bottom - (EYE_UP[id] ?? 65), eyes: [R.cx - 11, R.cx + 8] });

const skinLike = (r, g, b) => r > b && r - b >= 16 && r - b <= 95 && r - g >= 6 && r - g <= 62 && g >= b;

// AGENT repaint: everything below the face becomes the identical black suit (tee prints,
// labels, patches, white sleeves all vanish), trousers + shoes go suit-dark, then a tie,
// collar V, and optionally wrap-around shades + earpiece are drawn on.
// o.skin (QA B, swarm uniformity): ALSO re-hue the head band to one shared skin tone —
// skin-hued pixels re-hue around their own luminance, saturated strays (389's blue
// back-fringe, 2619's earring, print flecks) take the tone too, and dark features (brows,
// mouth line) survive so faces stay faces. Below the face everything suits, hands included.
export function repaintAgent(R, o = {}) {
  const c = canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  const img = x.getImageData(0, 0, R.w, R.h), d = img.data;
  const faceBottom = R.top + 46;
  const suit = (lum) => (lum < 60 ? [8, 9, 13] : lum < 120 ? [15, 16, 22] : lum < 190 ? [22, 24, 32] : [30, 33, 42]);
  for (let y = 0; y < R.h; y++) {
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4;
      if (d[i + 3] < 8) continue;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = (r + g + b) / 3;
      if (o.skin && y < faceBottom) { // head band: one skin, dark features kept
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (skinLike(r, g, b) || sat > 40) {
          d[i] = c255(lum * 1.25); d[i + 1] = c255(lum * 0.99); d[i + 2] = c255(lum * 0.77); // #685240 hue
        }
        continue;
      }
      if (y < faceBottom) continue;
      if (!o.skin && skinLike(r, g, b)) continue; // SMIRK default: hands stay hands
      const [nr, ng, nb] = suit(lum);
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
    }
  }
  x.putImageData(img, 0, 0);
  const { y: ey, eyes } = measureEyes(R, o.id);
  const [el, er] = eyes;
  // collar V + tie (drawn over the suit)
  const colY = ey + 13;
  x.fillStyle = '#30343f';
  x.fillRect(R.cx - 4, colY - 2, 2, 4); x.fillRect(R.cx + 2, colY - 2, 2, 4);
  x.fillStyle = '#23262f'; x.fillRect(R.cx - 1, colY, 3, 3);            // knot
  x.fillStyle = '#1b1e26'; x.fillRect(R.cx - 1, colY + 3, 2, 24);       // blade
  x.fillStyle = '#2c303c'; x.fillRect(R.cx - 1, colY + 3, 1, 24);
  if (o.shades !== false) {
    x.fillStyle = '#0a0b0f';
    x.fillRect(el - 7, ey - 3, (er + 7) - (el - 7), 9);                 // wraparound shade bar
    x.fillStyle = '#3c4452'; x.fillRect(el - 7, ey - 3, er + 7 - (el - 7), 1); // top gloss
    x.fillStyle = '#0a0b0f';
    x.fillRect(el - 9, ey - 2, 2, 3); x.fillRect(er + 7, ey - 2, 2, 3); // temple arms
  }
  if (o.earpiece !== false) {
    x.fillStyle = '#0a0b0f';
    x.fillRect(er + 10, ey, 2, 4);
    x.fillRect(er + 11, ey + 4, 1, 5);                                  // wire
  }
  return { ...R, c, eyes: { y: ey, l: el, r: er } };
}

// MOUSSE-PHEUS: mute the little chest emblem, draw tiny ROUND shades on the eyes.
export function repaintMousse(R, sid = 2719) {
  const c = canvas(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  const img = x.getImageData(0, 0, R.w, R.h), d = img.data;
  const { y: ey, eyes } = measureEyes(R, sid);
  for (let y = ey + 12; y < Math.min(R.h, ey + 32); y++)
    for (let xx = R.cx - 2; xx < Math.min(R.w, R.cx + 20); xx++) {
      const i = (y * R.w + xx) * 4;
      if (d[i + 3] < 8) continue;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) > 46) { d[i] = 138; d[i + 1] = 138; d[i + 2] = 150; }
    }
  x.putImageData(img, 0, 0);
  const [el, er] = eyes;
  for (const ex of [el, er]) { // tiny ROUND shades, worn low on the eyes
    x.fillStyle = '#101216';
    x.beginPath(); x.arc(ex, ey + 2, 4.2, 0, 7); x.fill();
    x.strokeStyle = '#585e6c'; x.lineWidth = 1;
    x.beginPath(); x.arc(ex, ey + 2, 4.2, 0, 7); x.stroke();
    x.fillStyle = '#aeb6c4'; x.fillRect(ex - 2, ey, 1, 1);              // gloss
  }
  x.fillStyle = '#101216'; x.fillRect(el + 5, ey + 1, er - el - 10, 1); // thin bridge
  return { ...R, c, eyes: { y: ey, l: el, r: er } };
}

// Flat silhouette rig (orbit back-view agents, pod silhouettes).
export function darkRig(R, hex) {
  const one = () => {
    const c = canvas(R.w, R.h), x = c.getContext('2d');
    x.drawImage(R.sil, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = hex;
    x.fillRect(0, 0, R.w, R.h);
    return c;
  };
  return { ...R, c: one(), sil: one() };
}

// Face close-up crop FROM THE RIG (never the heads atlas) — includes baked shades.
export function faceCrop(R, h = 50) {
  const hh = Math.min(h, R.h - R.top);
  const c = canvas(R.w, hh);
  c.getContext('2d').drawImage(R.c, 0, R.top, R.w, hh, 0, 0, R.w, hh);
  return c;
}

// Native-rig point (ex, ey) → stage coords for a drawRemy call at (x, feet) with options o.
// Accounts for lean shear, flip, scale and rot about the feet — anchors overlays to the rig.
export function rigPoint(R, ex, ey, x, feet, o = {}) {
  const lean = o.lean ?? 0;
  let lx = ((ex - R.w / 2) + (R.legTop - ey) * lean) * (o.flip ? -1 : 1) * (o.sx ?? 1); // ex is sprite-px (left-edge origin); anchor sits at rig center
  let ly = (ey - (R.bottom + 1)) * (o.sy ?? 1) * (o.upside ? -1 : 1);
  if (o.rot) {
    const c0 = Math.cos(o.rot), s0 = Math.sin(o.rot);
    const nx = lx * c0 - ly * s0, ny = lx * s0 + ly * c0;
    lx = nx; ly = ny;
  }
  return [x + lx, feet + ly];
}

// ---------- the digital glyph rain (hair-strand glyphs) ------------------------

// 5×7 bitmap font for the rain set + the SHORN ST sign. Cell 6×8.
const GLYPHS = {
  s: ['.####.', '#.....', '#.....', '..##..', '...##.', '....#.', '####..'],
  h: ['#...#.', '#...#.', '#...#.', '#####.', '#...#.', '#...#.', '#...#.'],
  a: ['.##...', '...#..', '.####.', '#...#.', '#...#.', '#...#.', '.###..'],
  i: ['..#...', '......', '..#...', '..#...', '..#...', '..#...', '..#...'],
  r: ['#.....', '#.....', '#..#..', '#.#...', '##....', '#..#..', '#...#.'],
  0: ['.###..', '#...#.', '#..##.', '#.#.#.', '##..#.', '#...#.', '.###..'],
  1: ['..#...', '.##...', '..#...', '..#...', '..#...', '..#...', '.###..'],
  '/': ['....#.', '...#..', '...#..', '..#...', '.#....', '.#....', '#.....'],
  '|': ['..#...', '..#...', '..#...', '..#...', '..#...', '..#...', '..#...'],
  '\\': ['#.....', '.#....', '.#....', '..#...', '...#..', '...#..', '....#.'],
  '~': ['.###..', '#...#.', '....#.', '..##..', '.#....', '#...#.', '.###..'],
  S: ['.####.', '#.....', '#.....', '.###..', '....#.', '....#.', '####..'],
  H: ['#...#.', '#...#.', '#...#.', '#####.', '#...#.', '#...#.', '#...#.'],
  O: ['.###..', '#...#.', '#...#.', '#...#.', '#...#.', '#...#.', '.###..'],
  R: ['.####.', '#...#.', '#...#.', '.####.', '.#.#..', '..#..#', '.#...#'],
  N: ['#...#.', '##..#.', '#.#.#.', '#..##.', '#...#.', '#...#.', '#...#.'],
  T: ['#####.', '..#...', '..#...', '..#...', '..#...', '..#...', '..#...'],
  ' ': ['......', '......', '......', '......', '......', '......', '......'],
};
const RAIN_CHARS = ['s', 'h', 'a', 'i', 'r', '~', '/', '\\', '|', '0', '1'];

function glyphAtlas(tints) {
  const names = Object.keys(GLYPHS);
  const c = canvas(6 * names.length, 8 * tints.length), x = c.getContext('2d');
  names.forEach((ch, ci) => {
    GLYPHS[ch].forEach((row, ry) => [...row].forEach((px, rx) => {
      if (px !== '#') return;
      tints.forEach((t, ti) => { x.fillStyle = t; x.fillRect(ci * 6 + rx, ti * 8 + ry, 1, 1); });
    }));
  });
  return { img: c, names, tints: tints.length };
}
let G_ATLAS = null;
export function bakeGlyphs() {
  G_ATLAS = glyphAtlas(['#a4ffc6', '#54ff8e', '#1d7a42', '#0b2c17']);
  return G_ATLAS;
}
export function drawGlyph(x, ch, px, py, sc, tint, alpha) {
  if (!G_ATLAS) return;
  const ci = G_ATLAS.names.indexOf(ch);
  if (ci < 0) return;
  x.save();
  x.globalAlpha = alpha;
  x.imageSmoothingEnabled = false;
  x.drawImage(G_ATLAS.img, ci * 6, tint * 8, 6, 8, Math.round(px), Math.round(py), 6 * sc, 8 * sc);
  x.restore();
}
export function glyphSign(x, text, px, py, sc, tint = 1, alpha = 1) {
  [...text].forEach((ch, i) => drawGlyph(x, ch, px + i * 6 * sc, py, sc, tint, alpha));
}

// Falling hair-strand glyph columns, pure in film t. storm: rainStorm doubles + speeds.
export function drawRain(x, t, o = {}) {
  const on = o.on ?? 1;           // crtOn clip (0..1 of screen height)
  const storm = o.storm ?? false;
  const smear = o.smear ?? 0;     // glitchOut: columns drag upward
  const sets = storm ? [[12, 1.9, 0.9], [0, 1.25, 1]] : [[0, 1, 1]];
  for (const [off, spd, al] of sets) {
    for (let c = 0; c < 40; c++) {
      const colX = c * 24 + 6 + off;
      let speed = (60 + h2(c, 1, 5) * 80) * spd;
      const span = LH + 360;
      const phase = h2(c, 2, 5) * span;
      let headY = ((phase + speed * (t - 0.6)) % span) - 180;
      headY -= smear * (40 + h2(c, 3, 5) * 130);
      const clipH = on * (LH + 40) - 20;
      for (let j = 0; j < 10; j++) {
        const gy = headY - j * 18;
        if (gy < -18 || gy > clipH) continue;
        const f = 1 - j / 10;
        const tint = j === 0 ? 1 : f > 0.55 ? 2 : 3;
        const ch = RAIN_CHARS[Math.floor(h2(c, j, Math.floor((headY + speed * t) / 18)) * 61) % RAIN_CHARS.length];
        drawGlyph(x, ch, colX, gy, 2, tint, (j === 0 ? 0.95 : 0.28 + 0.55 * f) * al);
      }
    }
  }
}

// ---------- shared painters ----------------------------------------------------

export function warmGlow(x, px, py, r, a, col = '120,255,170') {
  if (a <= 0.005) return;
  x.save();
  x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(px, py, 0, px, py, r);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.5, `rgba(${col},${a * 0.35})`); g.addColorStop(1, `rgba(${col},0)`);
  x.fillStyle = g;
  x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  x.restore();
}

export function shadow(x, cx, foot, w, a = 0.35) {
  x.save();
  x.fillStyle = `rgba(0,0,0,${a})`;
  x.beginPath(); x.ellipse(cx, foot + 3, w, w * 0.22, 0, 0, 7); x.fill();
  x.restore();
}

// Trapezoid light shaft from (x0,y0) to (x1,y1).
export function shaft(x, x0, y0, x1, y1, w0, w1, col = '120,255,170', a = 0.14) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const g = x.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
  x.fillStyle = g;
  const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
  x.beginPath();
  x.moveTo(x0 - nx / nl * w0, y0 - ny / nl * w0);
  x.lineTo(x0 + nx / nl * w0, y0 + ny / nl * w0);
  x.lineTo(x1 + nx / nl * w1, y1 + ny / nl * w1);
  x.lineTo(x1 - nx / nl * w1, y1 - ny / nl * w1);
  x.closePath(); x.fill();
  x.restore();
}

// Analytic chips/sparks from immutable events {g,x,y,seed}. rt = real (film) clock.
export function chips(x, events, rt, color = '170,255,200', n = 10, grav = 420, life = 0.9) {
  for (const ev of events) {
    const age = rt - ev.g;
    if (age < 0 || age > life) continue;
    for (let i = 0; i < n; i++) {
      const vx = (hash(ev.seed + i * 3) - 0.5) * 190, vy = -50 - hash(ev.seed + i * 5) * 150;
      const px = ev.x + vx * age, py = ev.y + vy * age + 0.5 * grav * age * age;
      const a = 1 - age / life;
      x.fillStyle = `rgba(${color},${a})`;
      x.fillRect(px, py, 2.2, 2.2);
    }
  }
}

// Growing dust billow (pillar hits, landings).
export function dustPlume(x, ev, rt, scale = 1, col = '148,168,150') {
  const age = rt - ev.g;
  if (age < 0 || age > 1.6) return;
  const u = age / 1.6;
  for (let i = 0; i < 6; i++) {
    const a = (1 - u) * 0.34 * scale;
    const px = ev.x + (hash(ev.seed + i * 7) - 0.5) * 60 * u * scale + (hash(ev.seed + i) - 0.5) * 10;
    const py = ev.y - u * (26 + hash(ev.seed + i * 3) * 30) * scale;
    const r = (6 + u * 34) * scale * (0.6 + hash(ev.seed + i * 11) * 0.7);
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
}

// Hanging/spinning bullet with green-white core. ang = travel direction.
export function bulletCore(x, px, py, sc, k = 1) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  warmGlow(x, px, py, 7 * sc, 0.35 * k, '160,255,190');
  x.fillStyle = `rgba(234,255,242,${0.95 * k})`;
  x.fillRect(px - 2.4 * sc, py - 1.2 * sc, 4.8 * sc, 2.4 * sc);
  x.fillStyle = `rgba(84,255,142,${0.8 * k})`;
  x.fillRect(px - 1 * sc, py - 2 * sc, 2 * sc, 4 * sc);
  x.restore();
}

// Hair-part trail behind a hanging round: a tapering ribbon along -dir with a slow flutter.
export function hairTrail(x, px, py, dirx, diry, len, sc, tt, seed) {
  const nl = Math.hypot(dirx, diry) || 1;
  const dx = dirx / nl, dy = diry / nl;
  const pxp = -dy, pyp = dx;
  x.save();
  x.lineCap = 'round';
  for (const [wd, col, al] of [[2.6, '84,255,150', 0.3], [1.3, '210,255,228', 0.75]]) {
    x.strokeStyle = `rgba(${col},${al})`;
    x.lineWidth = wd * sc;
    x.beginPath();
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const flut = Math.sin(tt * 1.9 + seed * 5 + u * 4) * 2 * sc * u; // parted-strand flutter
      const cxp = px - dx * len * u + pxp * flut;
      const cyp = py - dy * len * u + pyp * flut;
      if (i === 0) x.moveTo(cxp, cyp); else x.lineTo(cxp, cyp);
    }
    x.stroke();
  }
  x.restore();
}

export function muzzleFlash(x, px, py, sc, k) {
  if (k <= 0.01) return;
  x.save();
  x.globalCompositeOperation = 'lighter';
  warmGlow(x, px, py, 22 * sc, 0.5 * k, '190,255,200');
  x.fillStyle = `rgba(240,255,240,${0.9 * k})`;
  for (let i = 0; i < 5; i++) {
    const a = i * 1.257 + 0.3;
    const l = (i % 2 ? 4 : 8) * sc * k;
    x.fillRect(px + Math.cos(a) * l * 0.4 - 1, py + Math.sin(a) * l * 0.4 - 1, Math.cos(a) * l + 2, Math.sin(a) * l + 2);
  }
  x.restore();
}

export function smokePuff(x, px, py, r, a, col = '150,175,158') {
  if (a <= 0.01) return;
  const g = x.createRadialGradient(px, py, 0, px, py, r);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
  x.fillStyle = g;
  x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
}

// Ballistic shell casings from immutable fire events; one floor bounce, seeded rest.
export function shells(x, events, rt, floorY = GROUND) {
  for (const ev of events) {
    const age = rt - ev.g;
    if (age < 0 || age > 2.6) continue; // rested casings persist on the floor (QA J)
    for (let s = 0; s < 2; s++) {
      const vx = (hash(ev.seed + s * 13) - 0.5) * 150;
      let py = ev.y - 8 - hash(ev.seed + s) * 6;
      let px = ev.x + (ev.dir || 1) * (6 + s * 4);
      let vy = -140 - hash(ev.seed + s * 7) * 70;
      const dt = Math.min(age, 0.42);
      py += vy * dt + 450 * dt * dt;
      px += vx * dt;
      const rest = age >= 0.42;
      if (!rest) { /* in flight */ }
      const rot = age * (5 + hash(ev.seed + s) * 4);
      x.save();
      x.translate(px, py);
      x.rotate(rest ? 1.2 + hash(ev.seed + s * 3) * 1.2 : rot);
      // QA J: rested brass was sub-3px dark gold on dark marble — invisible in every still.
      // Rested casings now read (bigger, brighter, warm glint); flight casings unchanged.
      x.fillStyle = rest ? '#c9ad46' : '#d8bc5a';
      x.fillRect(rest ? -3.2 : -2.4, rest ? -1.3 : -1, rest ? 6.4 : 4.8, rest ? 2.6 : 2);
      if (rest) { x.fillStyle = '#e8d27a'; x.fillRect(-3.2, -1.3, 6.4, 1); }
      x.restore();
      if (rest) warmGlow(x, px, py, 6, 0.18, '216,188,90');
    }
  }
}

// A reaching arm: sleeve + skin, rounded, from (x0,y0) toward (x1,y1).
export function reachArm(x, x0, y0, x1, y1, o = {}) {
  const sleeve = o.sleeve ?? '#14151c', skin = o.skin ?? '#a0785a';
  const w = o.w ?? 9;
  x.save();
  x.lineCap = 'round';
  x.strokeStyle = sleeve; x.lineWidth = w + 3;
  x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + (x1 - x0) * 0.62, y0 + (y1 - y0) * 0.62); x.stroke();
  x.strokeStyle = skin; x.lineWidth = w - 1.5;
  x.beginPath(); x.moveTo(x0 + (x1 - x0) * 0.55, y0 + (y1 - y0) * 0.55); x.lineTo(x1, y1); x.stroke();
  x.restore();
}

// Pistol: short dark L at (px,py) aimed along ang.
export function pistol(x, px, py, ang, sc = 1) {
  x.save();
  x.translate(px, py); x.rotate(ang);
  x.fillStyle = '#07080c';
  x.fillRect(-3 * sc, -2 * sc, 12 * sc, 3.4 * sc);
  x.fillRect(0, 0, 3 * sc, 6 * sc);
  x.fillStyle = '#1e232c'; x.fillRect(-3 * sc, -2 * sc, 12 * sc, 1 * sc);
  x.restore();
}

// The mentor's comb: spine + tines that curl like soft plastic (curl 0..1 → up to 60°).
export function combProp(x, px, py, ang, curl) {
  x.save();
  x.translate(px, py); x.rotate(ang);
  x.fillStyle = '#0b0c10';
  x.fillRect(-24, -5, 48, 7);
  x.fillStyle = '#22242e'; x.fillRect(-24, -5, 48, 2);
  for (let i = 0; i < 8; i++) {
    const tx = -20 + i * 5.6;
    const bend = curl * 1.05;
    x.strokeStyle = '#0b0c10'; x.lineWidth = 2.4; x.lineCap = 'round';
    x.beginPath();
    x.moveTo(tx, 2);
    x.quadraticCurveTo(tx + Math.sin(bend) * 7, 2 + Math.cos(bend) * 6, tx + Math.sin(bend) * 13, 2 + Math.cos(bend * 1.2) * 10);
    x.stroke();
  }
  x.restore();
}

// Paper sheet (subway litter) with a tumble angle.
export function paper(x, px, py, rot, a = 1) {
  x.save();
  x.globalAlpha = a;
  x.translate(px, py); x.rotate(rot);
  x.fillStyle = '#b8c4b4'; x.fillRect(-5, -3.5, 10, 7);
  x.fillStyle = '#8a968a'; x.fillRect(-5, 1.5, 10, 2);
  x.restore();
}

// Overlay glint star (post-grade, full-res coords).
export function glintStar(ov, px, py, r, a, col = '214,255,228') {
  if (a <= 0.02) return;
  ov.save();
  ov.globalCompositeOperation = 'lighter';
  ov.translate(px, py);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const l = r * (i % 2 ? 0.4 : 1);
    ov.strokeStyle = `rgba(${col},${a})`;
    ov.lineWidth = 3;
    ov.beginPath(); ov.moveTo(0, 0); ov.lineTo(Math.cos(ang) * l, Math.sin(ang) * l); ov.stroke();
  }
  ov.restore();
}

// ---------- baked sets ----------------------------------------------------------

// Night city skyline strip (also sliced onto the flat roof sets). 2200×334, buildings rise
// from the bottom edge; world-units 1:1 so the orbit cylinder maps it directly.
export function bakeSkylineStrip(w = 2200, h = 334) {
  const c = canvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#030a06'); g.addColorStop(0.55, '#071a0e'); g.addColorStop(1, '#0f3020');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // far row — dim towers
  for (let bx = -20; bx < w + 20;) {
    const bw = 46 + h2(bx, 1, 21) * 70, bh = 90 + h2(bx, 2, 21) * 150;
    x.fillStyle = '#081710';
    x.fillRect(bx, h - bh, bw, bh);
    x.fillStyle = '#102517';
    x.fillRect(bx, h - bh, bw, 2);
    bx += bw + 8 + h2(bx, 3, 21) * 26;
  }
  // near row — window grids, some phosphor-lit
  for (let bx = -20; bx < w + 20;) {
    const bw = 40 + h2(bx, 4, 22) * 62, bh = 120 + h2(bx, 5, 22) * 200;
    x.fillStyle = '#0b2013';
    x.fillRect(bx, h - bh, bw, bh);
    x.fillStyle = '#163020';
    x.fillRect(bx, h - bh, bw, 3);                       // roof edge light
    if (h2(bx, 6, 22) > 0.6) x.fillRect(bx + bw / 2 - 1, h - bh - 12, 2, 12); // antenna
    for (let wy = h - bh + 8; wy < h - 10; wy += 13)
      for (let wx = bx + 5; wx < bx + bw - 6; wx += 10) {
        const m = h2(wx, wy, 23);
        if (m > 0.82) x.fillStyle = `rgba(84,255,142,${0.35 + m * 0.4})`;
        else if (m > 0.62) x.fillStyle = 'rgba(30,88,52,0.8)';
        else continue;
        x.fillRect(wx, wy, 4, 6);
      }
    bx += bw + 6 + h2(bx, 7, 22) * 30;
  }
  // haze + ground fade
  const hz = x.createLinearGradient(0, h - 60, 0, h);
  hz.addColorStop(0, 'rgba(10,42,24,0)'); hz.addColorStop(1, 'rgba(6,20,12,0.9)');
  x.fillStyle = hz; x.fillRect(0, h - 60, w, 60);
  return c;
}

// Rooftop deck texture for the orbit cylinder world (860×340).
export function bakeDeck() {
  const w = 860, h = 340, c = canvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#13221a'); g.addColorStop(1, '#0c1610');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let sy = 0; sy < h; sy += 110)
    for (let sx = (sy / 110) % 2 ? 55 : 0; sx < w; sx += 110) {
      x.fillStyle = '#0b140e'; x.fillRect(sx, sy, 110, 2); x.fillRect(sx, sy, 2, 110);
    }
  for (let i = 0; i < 900; i++) {
    const px = h2(i, 1, 31) * w, py = h2(i, 2, 31) * h;
    x.fillStyle = h2(i, 3, 31) > 0.5 ? 'rgba(40,62,46,0.6)' : 'rgba(6,12,9,0.55)';
    x.fillRect(px, py, 2, 2);
  }
  x.fillStyle = '#16241a'; x.fillRect(120, 40, 70, 46); x.fillStyle = '#1f3122'; x.fillRect(120, 40, 70, 5);
  x.fillStyle = '#0a120c'; x.beginPath(); x.ellipse(560, 240, 90, 26, 0, 0, 7); x.fill(); // stain
  return c;
}

// Flat night rooftop (rooftense / resume tail; late = payoff's later night).
export function bakeRoof(strip, late = false) {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(-OVER, -OVER);
  const skyG = x.createLinearGradient(0, -OVER, 0, 260);
  if (late) { skyG.addColorStop(0, '#010502'); skyG.addColorStop(1, '#051510'); }
  else { skyG.addColorStop(0, '#020804'); skyG.addColorStop(1, '#07190f'); }
  x.fillStyle = skyG; x.fillRect(-OVER, -OVER, w, 340);
  for (let i = 0; i < 130; i++) { // stars
    const sx = -OVER + h2(i, 1, 41) * w, sy = -OVER + h2(i, 2, 41) * 220;
    x.fillStyle = `rgba(190,235,205,${0.14 + h2(i, 3, 41) * 0.5})`;
    x.fillRect(sx, sy, 1, 1);
  }
  // skyline slice of the shared strip (its bottom row = horizon y 254)
  x.drawImage(strip, 40, 0, LW + 2 * OVER, 334, -OVER, 254 - 334, LW + 2 * OVER, 334);
  // city glow haze into the deck
  const hz = x.createLinearGradient(0, 240, 0, 432);
  hz.addColorStop(0, 'rgba(20,80,44,0.32)'); hz.addColorStop(1, 'rgba(4,14,8,0)');
  x.fillStyle = hz; x.fillRect(-OVER, 240, w, 192);
  // deck
  const dg = x.createLinearGradient(0, 424, 0, LH + OVER);
  dg.addColorStop(0, '#0e1a12'); dg.addColorStop(1, '#070d09');
  x.fillStyle = dg; x.fillRect(-OVER, 426, w, LH + OVER - 426 + OVER);
  x.fillStyle = '#152419'; x.fillRect(-OVER, 426, w, 3);
  for (let i = 0; i < 320; i++) {
    const px = -OVER + h2(i, 4, 42) * w, py = 430 + h2(i, 5, 42) * (LH - 424 + OVER);
    x.fillStyle = h2(i, 6, 42) > 0.5 ? 'rgba(26,44,32,0.5)' : 'rgba(4,8,6,0.5)';
    x.fillRect(px, py, 2, 2);
  }
  // parapet lip x 240–320 (low wall FLOW stands in front of)
  x.fillStyle = '#131f16'; x.fillRect(236, 380, 88, 52);
  x.fillStyle = '#1e3022'; x.fillRect(236, 380, 88, 6);
  x.fillStyle = '#0a120c'; x.fillRect(236, 386, 4, 46); x.fillRect(320, 386, 4, 46);
  // antenna mast x 120
  x.strokeStyle = '#0c150e'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(120, 430); x.lineTo(120, 190); x.stroke();
  x.lineWidth = 1.6;
  for (let yy = 210; yy < 420; yy += 26) { x.beginPath(); x.moveTo(108, yy); x.lineTo(132, yy - 12); x.stroke(); }
  x.fillStyle = 'rgba(255,80,80,0.9)'; x.fillRect(118, 184, 4, 4); // warning light (blinks live)
  // water tank x 880
  x.fillStyle = '#101c14'; x.fillRect(856, 300, 52, 130);
  x.fillStyle = '#182818'; x.fillRect(856, 300, 52, 8);
  for (let i = 0; i < 5; i++) { x.fillStyle = '#0a120c'; x.fillRect(858 + i * 11, 308, 2, 120); }
  x.fillStyle = '#0c150e'; x.fillRect(862, 426, 6, 6); x.fillRect(896, 426, 6, 6);
  // stairwell bulkhead (the wallIn glow source, right edge)
  x.fillStyle = '#0e1811'; x.fillRect(918, 330, 88, 100);
  x.fillStyle = '#060b07'; x.fillRect(934, 352, 40, 78);
  x.fillStyle = `rgba(84,255,142,0.14)`; x.fillRect(934, 352, 40, 78);
  x.fillStyle = '#18281a'; x.fillRect(918, 324, 88, 8);
  return c;
}

// Phosphor CRT room (terminal shot): black screen + tube vignette; rain painted live.
export function bakeTerminal() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(-OVER, -OVER);
  x.fillStyle = '#010302'; x.fillRect(-OVER, -OVER, w, h);
  const v = x.createRadialGradient(480, 270, 180, 480, 270, 620);
  v.addColorStop(0, 'rgba(8,32,16,0.12)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  x.fillStyle = v; x.fillRect(-OVER, -OVER, w, h);
  x.strokeStyle = 'rgba(30,80,48,0.25)'; x.lineWidth = 3;
  x.strokeRect(8, 6, LW - 16, LH - 12); // faint tube edge
  return c;
}

// Fluorescent cubicle farm.
export function bakeCubicle() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(-OVER, -OVER);
  x.fillStyle = '#0d1512'; x.fillRect(-OVER, -OVER, w, h);           // dim office dark
  // ceiling strips
  x.fillStyle = '#0a100d'; x.fillRect(-OVER, -OVER, w, 92);
  for (const lx of [120, 480, 840]) {
    x.fillStyle = '#cfe8d4'; x.fillRect(lx - 80, 40, 160, 8);
    x.fillStyle = 'rgba(210,235,215,0.1)'; x.fillRect(lx - 110, 34, 220, 20);
  }
  // back cubicle rows (partitions receding)
  for (const [py, ph, col] of [[150, 130, '#16241c'], [240, 140, '#1b2c22']]) {
    x.fillStyle = col;
    for (let px = -30; px < LW + 30; px += 210) x.fillRect(px, py, 190, ph);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(-OVER, py + ph - 8, w, 8);
  }
  // dead neighbour desks
  for (const [dx, dw] of [[40, 190], [470, 220], [760, 210]]) {
    x.fillStyle = '#232d26'; x.fillRect(dx, 386, dw, 14);
    x.fillStyle = '#121a14'; x.fillRect(dx + 8, 400, 10, 48); x.fillRect(dx + dw - 18, 400, 10, 48);
    x.fillStyle = '#1a241d'; x.fillRect(dx + 24, 358, 44, 30); // sleeping monitor
  }
  // the lit desk x 260–400 top 350
  x.fillStyle = '#3c3022'; x.fillRect(258, 350, 144, 10);
  x.fillStyle = '#2a2118'; x.fillRect(258, 360, 144, 6);
  x.fillStyle = '#101512'; x.fillRect(266, 366, 10, 82); x.fillRect(384, 366, 10, 82);
  // chair (back, behind FLOW)
  x.fillStyle = '#181f1a'; x.fillRect(282, 372, 46, 60);
  x.fillStyle = '#0e120f'; x.fillRect(286, 368, 38, 8);
  // CRT shell on the desk (screen face painted live)
  x.fillStyle = '#7d837a'; x.fillRect(316, 282, 62, 50);
  x.fillStyle = '#8d938a'; x.fillRect(316, 282, 62, 5);
  x.fillStyle = '#0a0f0b'; x.fillRect(322, 290, 50, 36);
  x.fillStyle = '#565b54'; x.fillRect(334, 334, 26, 4);
  // floor carpet 448
  x.fillStyle = '#141b16'; x.fillRect(-OVER, 448, w, LH - 448 + OVER);
  for (let i = 0; i < 240; i++) {
    const px = -OVER + h2(i, 1, 51) * w, py = 450 + h2(i, 2, 51) * (LH - 446);
    x.fillStyle = h2(i, 3, 51) > 0.5 ? 'rgba(30,42,32,0.5)' : 'rgba(8,12,9,0.5)';
    x.fillRect(px, py, 2, 2);
  }
  return c;
}

// Desk front panel — drawn OVER the seated FLOW so he reads as tucked at the desk.
export function bakeDeskFront() {
  const c = canvas(150, 100), x = c.getContext('2d');
  x.fillStyle = '#2a2118'; x.fillRect(0, 0, 150, 100);
  x.fillStyle = '#332a1e'; x.fillRect(0, 0, 150, 6);
  x.fillStyle = '#1c1610'; x.fillRect(6, 12, 62, 80); x.fillRect(82, 12, 62, 80); // drawers
  x.fillStyle = '#4a3d2c'; x.fillRect(30, 48, 14, 4); x.fillRect(106, 48, 14, 4);
  return c;
}

// Sodium underpass.
export function bakeUnderpass() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(-OVER, -OVER);
  x.fillStyle = '#0a0d0a'; x.fillRect(-OVER, -OVER, w, h);
  // bridge deck + beams
  x.fillStyle = '#1a211b'; x.fillRect(-OVER, 40, w, 70);
  x.fillStyle = '#10140f';
  for (let bx = -40; bx < LW + 40; bx += 160) x.fillRect(bx, 96, 26, 34);
  x.fillStyle = '#242c24'; x.fillRect(-OVER, 96, w, 6);
  // tag wall left
  x.fillStyle = '#242b24'; x.fillRect(-OVER, 130, 180, 300);
  x.fillStyle = '#2c342c'; x.fillRect(-OVER, 130, 180, 10);
  const tagCols = ['#8a3054', '#2f7a64', '#9a8430', '#41549a'];
  for (let i = 0; i < 7; i++) {
    const tx = 6 + h2(i, 1, 61) * 130, ty = 170 + h2(i, 2, 61) * 200;
    x.strokeStyle = tagCols[i % 4]; x.globalAlpha = 0.6; x.lineWidth = 3 + h2(i, 3, 61) * 3;
    x.beginPath();
    x.moveTo(tx, ty);
    x.bezierCurveTo(tx + 24, ty - 18 - h2(i, 4, 61) * 16, tx + 40, ty + 14, tx + 62, ty - 6);
    x.stroke();
    x.globalAlpha = 1;
  }
  // sodium lamps x 200 / 700 with baked cones + pools
  for (const lx of [200, 700]) {
    x.fillStyle = '#2c332a'; x.fillRect(lx - 3, 150, 6, 280);
    x.fillStyle = '#3a4236'; x.fillRect(lx - 16, 144, 32, 8);
    x.fillStyle = '#ffc46a'; x.fillRect(lx - 9, 150, 18, 5);
    const cg = x.createLinearGradient(0, 155, 0, 430);
    cg.addColorStop(0, 'rgba(255,190,110,0.30)');
    cg.addColorStop(0.7, 'rgba(255,180,92,0.10)');
    cg.addColorStop(1, 'rgba(255,180,92,0)');
    x.fillStyle = cg;
    x.beginPath();
    x.moveTo(lx - 12, 155); x.lineTo(lx + 12, 155);
    x.lineTo(lx + 62, 432); x.lineTo(lx - 62, 432);
    x.closePath(); x.fill();
  }
  // parked car x 680–924 — near-field sedan planted on the 430 ground (QA E: the old body
  // was toy-scale, 64 px tall against 204 px rigs). Headlight + wet-ground pool baked in.
  x.fillStyle = '#262f38';
  x.beginPath();
  x.moveTo(682, 428); x.lineTo(686, 388); x.quadraticCurveTo(696, 348, 742, 342);
  x.lineTo(830, 338); x.quadraticCurveTo(886, 342, 906, 372); x.lineTo(918, 390); x.lineTo(924, 428);
  x.closePath(); x.fill();
  x.fillStyle = '#11161c'; // greenhouse
  x.beginPath(); x.moveTo(716, 388); x.quadraticCurveTo(748, 356, 792, 352); x.lineTo(792, 388); x.closePath(); x.fill();
  x.fillRect(800, 352, 74, 36);
  x.fillStyle = '#39444e'; x.fillRect(684, 390, 240, 7); // beltline
  x.fillStyle = 'rgba(255,196,116,0.5)'; x.fillRect(688, 372, 3, 56); // sodium rim on the hood
  x.fillStyle = '#ffe9bd'; x.fillRect(684, 398, 10, 7); // headlight lamp
  x.fillStyle = '#b84040'; x.fillRect(914, 398, 8, 6); // tail light
  const hpg = x.createRadialGradient(700, 432, 2, 700, 432, 74);
  hpg.addColorStop(0, 'rgba(255,236,190,0.4)'); hpg.addColorStop(1, 'rgba(255,236,190,0)');
  x.fillStyle = hpg;
  x.beginPath(); x.ellipse(720, 434, 88, 15, 0, 0, 7); x.fill();
  x.fillStyle = '#0a0d11';
  x.beginPath(); x.arc(728, 428, 15, 0, 7); x.arc(886, 428, 15, 0, 7); x.fill();
  x.fillStyle = '#39424c'; x.beginPath(); x.arc(728, 428, 6, 0, 7); x.arc(886, 428, 6, 0, 7); x.fill();
  // wet road with sodium reflections
  const rd = x.createLinearGradient(0, 430, 0, LH + OVER);
  rd.addColorStop(0, '#232820'); rd.addColorStop(1, '#101310');
  x.fillStyle = rd; x.fillRect(-OVER, 430, w, LH - 430 + OVER);
  for (const lx of [200, 700]) {
    const rg = x.createLinearGradient(0, 432, 0, 540);
    rg.addColorStop(0, 'rgba(255,190,105,0.5)'); rg.addColorStop(1, 'rgba(255,190,105,0)');
    x.fillStyle = rg; x.fillRect(lx - 34, 432, 68, 108);
  }
  x.fillStyle = 'rgba(255,200,120,0.12)'; x.fillRect(-OVER, 432, w, 3);
  return c;
}

// The Construct: white void, two chairs, glass table, standing mirror.
export function bakeConstruct() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(-OVER, -OVER);
  x.fillStyle = '#f4f7f2'; x.fillRect(-OVER, -OVER, w, h);
  const fg = x.createLinearGradient(0, 380, 0, LH + OVER);
  fg.addColorStop(0, 'rgba(210,218,208,0)'); fg.addColorStop(1, 'rgba(196,206,194,0.55)');
  x.fillStyle = fg; x.fillRect(-OVER, 380, w, LH - 380 + OVER);
  x.fillStyle = 'rgba(178,188,176,0.5)'; x.fillRect(-OVER, 430, w, 2); // floor seam
  // soft contact shadows
  for (const [sx, sw] of [[380, 66], [570, 66], [470, 60], [250, 52]]) {
    x.fillStyle = 'rgba(150,160,148,0.35)';
    x.beginPath(); x.ellipse(sx, 436, sw, 9, 0, 0, 7); x.fill();
  }
  // black leather chairs x 380 / 570
  for (const cx of [380, 570]) {
    x.fillStyle = '#14161a';
    x.fillRect(cx - 30, 306, 60, 84);                     // back
    x.fillRect(cx - 34, 372, 68, 26);                     // seat
    x.fillRect(cx - 30, 396, 8, 34); x.fillRect(cx + 22, 396, 8, 34); // legs
    x.fillStyle = '#26292f'; x.fillRect(cx - 30, 306, 60, 6);
    x.fillStyle = '#0c0d10'; x.fillRect(cx - 34, 396, 68, 4);
  }
  // glass table x 470 top 372
  x.fillStyle = 'rgba(210,226,222,0.65)'; x.fillRect(428, 372, 88, 8);
  x.fillStyle = 'rgba(240,248,244,0.9)'; x.fillRect(428, 372, 88, 2);
  x.fillStyle = 'rgba(190,205,200,0.7)'; x.fillRect(436, 380, 5, 52); x.fillRect(504, 380, 5, 52);
  // standing mirror x 250 (glass 220–430)
  x.fillStyle = '#3a3228';
  x.fillRect(214, 216, 72, 8); x.fillRect(214, 424, 72, 8);
  x.fillRect(214, 216, 8, 216); x.fillRect(278, 216, 8, 216);
  x.fillStyle = '#d8dee0'; x.fillRect(224, 226, 52, 196);  // glass (light)
  x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillRect(230, 232, 10, 180);
  x.fillStyle = 'rgba(200,210,206,0.5)'; x.fillRect(248, 232, 6, 180);
  x.fillStyle = '#2c261e'; x.fillRect(240, 430, 20, 10);   // foot
  return c;
}

// Cold-blue pod farm.
export function bakePodfarm() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(-OVER, -OVER);
  const g = x.createLinearGradient(0, -OVER, 0, 260);
  g.addColorStop(0, '#03080f'); g.addColorStop(1, '#081522');
  x.fillStyle = g; x.fillRect(-OVER, -OVER, w, 300);
  x.fillStyle = '#04090f'; x.fillRect(-OVER, 240, w, LH + OVER - 240);
  // pod rows receding to horizon 240
  const pod = (px, py, pw, ph, a) => {
    x.save(); x.globalAlpha = a;
    x.fillStyle = '#123048';
    x.beginPath(); x.ellipse(px, py - ph / 2, pw / 2, ph / 2, 0, 0, 7); x.fill();
    x.fillStyle = '#1c4a66';
    x.beginPath(); x.ellipse(px - pw * 0.12, py - ph / 2, pw * 0.16, ph * 0.4, 0, 0, 7); x.fill();
    x.fillStyle = '#0a1a28'; // the bald occupant silhouette
    x.beginPath(); x.arc(px, py - ph * 0.42, ph * 0.11, 0, 7); x.fill();
    x.fillRect(px - ph * 0.14, py - ph * 0.36, ph * 0.28, ph * 0.24);
    x.fillStyle = '#0c2030'; x.fillRect(px - pw / 2 - 3, py - 6, pw + 6, 8);
    x.restore();
  };
  for (let i = 0; i < 12; i++) pod(-40 + i * 92 + h2(i, 1, 71) * 30, 262, 34, 96, 0.5);
  for (let i = 0; i < 8; i++) { if (Math.abs(i * 130 - 460) < 90) continue; pod(-60 + i * 130 + h2(i, 2, 71) * 40, 336, 52, 150, 0.8); }
  for (let i = 0; i < 5; i++) { if (i === 2) continue; pod(-120 + i * 260, 430, 78, 220, 1); }
  // central pod x480 y200–430 (occupant drawn live inside)
  x.fillStyle = '#0e2436';
  x.beginPath(); x.ellipse(480, 315, 62, 118, 0, 0, 7); x.fill();
  x.fillStyle = '#163852';
  x.beginPath(); x.ellipse(480 - 14, 315, 16, 104, 0, 0, 7); x.fill();
  x.fillStyle = '#0a1826'; x.fillRect(404, 190, 152, 18);
  x.fillStyle = '#1c4058'; x.fillRect(404, 190, 152, 5);
  x.fillStyle = '#0a1826'; x.fillRect(398, 424, 164, 14);
  x.strokeStyle = '#0c2233'; x.lineWidth = 5;
  x.beginPath(); x.moveTo(430, 190); x.lineTo(430, 120); x.moveTo(530, 190); x.lineTo(530, 120); x.stroke();
  // catwalk 430
  x.fillStyle = '#0c1826'; x.fillRect(-OVER, 430, w, LH - 430 + OVER);
  x.fillStyle = '#14283c'; x.fillRect(-OVER, 430, w, 4);
  x.strokeStyle = '#081220'; x.lineWidth = 1.4;
  for (let gx = -OVER; gx < LW + OVER; gx += 16) { x.beginPath(); x.moveTo(gx, 434); x.lineTo(gx + 8, LH + OVER); x.stroke(); }
  x.fillStyle = '#0a1622'; x.fillRect(-OVER, 486, w, 10); // rail shadow
  return c;
}

// Dojo (green-dark wooden).
export function bakeDojo() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(-OVER, -OVER);
  x.fillStyle = '#101c14'; x.fillRect(-OVER, -OVER, w, h);
  x.fillStyle = '#0b140e'; x.fillRect(-OVER, -OVER, w, 100);   // upper wall
  x.fillStyle = '#16261a'; x.fillRect(-OVER, 88, w, 12);       // beam
  // wall panels
  for (let px = -OVER; px < LW + OVER; px += 120) {
    x.fillStyle = '#132119'; x.fillRect(px, 100, 112, 330);
    x.fillStyle = '#0c150e'; x.fillRect(px + 112, 100, 8, 330);
  }
  // mirror wall left x 80–160
  x.fillStyle = '#2c342c'; x.fillRect(72, 120, 96, 310);
  x.fillStyle = '#1d2a22'; x.fillRect(82, 130, 76, 290);
  x.fillStyle = 'rgba(190,230,200,0.10)'; x.fillRect(88, 136, 12, 278);
  x.fillStyle = '#242e24'; x.fillRect(72, 112, 96, 8);
  // weapon rack x 820
  x.fillStyle = '#241a10'; x.fillRect(800, 250, 120, 10); x.fillRect(800, 330, 120, 8);
  x.fillRect(804, 250, 8, 180); x.fillRect(908, 250, 8, 180);
  x.strokeStyle = '#3a2c18'; x.lineWidth = 5; x.lineCap = 'round';
  x.beginPath(); x.moveTo(820, 336); x.lineTo(880, 256); x.stroke();      // staff
  x.strokeStyle = '#5a5e66'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(844, 336); x.lineTo(830, 258); x.stroke();      // blade
  // mats
  x.fillStyle = '#26301f'; x.fillRect(200, 424, 560, 10);
  x.fillStyle = '#1c2618'; x.fillRect(200, 424, 560, 3);
  // wood floor 430
  const fg = x.createLinearGradient(0, 430, 0, LH + OVER);
  fg.addColorStop(0, '#241a10'); fg.addColorStop(1, '#150e08');
  x.fillStyle = fg; x.fillRect(-OVER, 430, w, LH - 430 + OVER);
  for (let px = -OVER; px < LW + OVER; px += 46) { x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(px, 432, 2, LH - 430); }
  return c;
}

// Jump program: two tower roofs with an impossible gap.
export function bakeJump(strip) {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(-OVER, -OVER);
  x.fillStyle = '#020804'; x.fillRect(-OVER, -OVER, w, h);
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(190,235,205,${0.1 + h2(i, 1, 81) * 0.4})`;
    x.fillRect(-OVER + h2(i, 2, 81) * w, -OVER + h2(i, 3, 81) * 180, 1, 1);
  }
  x.drawImage(strip, 400, 0, LW + 2 * OVER, 334, -OVER, 246 - 334, LW + 2 * OVER, 334);
  // the gap: a genuinely empty void between the towers (QA F: the slabs must not abut —
  // the old haze was translucent, so the skyline strip read straight through it)
  const gp = x.createLinearGradient(0, 380, 0, LH + OVER);
  gp.addColorStop(0, 'rgba(4,12,7,0.92)'); gp.addColorStop(1, '#010302');
  x.fillStyle = gp; x.fillRect(414, 380, 152, LH - 380 + OVER);
  x.fillStyle = '#061009';
  for (let i = 0; i < 6; i++) x.fillRect(424 + h2(i, 1, 82) * 120, 440 + i * 18, 26 + h2(i, 2, 82) * 40, 30);
  // near tower roof (left) surface y400
  x.fillStyle = '#141f16'; x.fillRect(-OVER, 400, 434, LH + OVER - 400);
  x.fillStyle = '#1e2c1f'; x.fillRect(-OVER, 400, 434, 6);
  x.fillStyle = '#0a110b'; x.fillRect(426, 400, 8, LH + OVER - 400); // edge
  x.fillStyle = '#101a12'; x.fillRect(60, 356, 70, 44);              // AC unit
  x.fillStyle = '#182418'; x.fillRect(60, 356, 70, 6);
  // far tower roof (right) surface y448
  x.fillStyle = '#111b13'; x.fillRect(562, 448, LW + OVER - 562, LH + OVER - 448);
  x.fillStyle = '#1a281a'; x.fillRect(562, 448, LW + OVER - 562, 5);
  x.fillStyle = '#0a110b'; x.fillRect(554, 448, 8, LH + OVER - 448);
  x.fillStyle = '#0e1810'; x.fillRect(700, 396, 64, 52);             // bulkhead
  x.fillStyle = '#142014'; x.fillRect(700, 396, 64, 6);
  return c;
}

// Desk front panel for the lobby — re-drawn OVER the desk-line clones so they read as
// rising BEHIND it (the desk itself is baked into the set).
export function bakeLobbyDesk() {
  const c = canvas(184, 92), x = c.getContext('2d');
  x.fillStyle = '#131f14'; x.fillRect(0, 0, 184, 92);
  x.fillStyle = '#1c2c1c'; x.fillRect(0, 0, 184, 8);
  x.fillStyle = '#0a0f0a'; x.fillRect(8, 16, 76, 60); x.fillRect(96, 16, 76, 60);
  x.fillStyle = '#223422'; x.fillRect(0, 86, 184, 6);
  return c;
}

// Marble pillar painter (bake uses it for the outer pair; film.js draws the center one
// OVER the actors so the cartwheel passes behind it). shadeRamp = outline..highlight.
export function paintPillar(x, px, pw) {
  const shades = ['#0c130d', '#142016', '#1b2a1c', '#243624', '#2f4530'];
  for (let i = 0; i < 5; i++) {
    const bx = px - pw / 2 + (pw / 5) * i;
    x.fillStyle = shades[i]; x.fillRect(bx, 130, pw / 5 + 1, 300);
  }
  x.fillStyle = 'rgba(70,110,80,0.14)'; // veins
  for (let i = 0; i < 3; i++) {
    x.fillRect(px - pw / 2 + 6 + h2(px, i, 91) * (pw - 12), 140 + h2(px, i + 3, 91) * 120, 2, 60 + h2(px, i + 6, 91) * 120);
  }
  x.fillStyle = '#223424'; x.fillRect(px - pw / 2 - 4, 130, pw + 8, 10);   // capital
  x.fillStyle = '#0a100a'; x.fillRect(px - pw / 2 - 4, 140, pw + 8, 3);
  x.fillStyle = '#1a2a1a'; x.fillRect(px - pw / 2 - 3, 424, pw + 6, 8);    // base
}

// Bullet damage on a pillar: soft dark craters + a chipped lip (QA J: the old radiating
// crack lines read as spiky inkblots on the dark marble — removed; film.js layers
// dustPlume-family puffs over these for the fresh-hit billow).
export function pillarDamage(x, px, py, seed, k) {
  if (k <= 0.01) return;
  const r = 8 + 14 * k;
  x.save();
  x.fillStyle = 'rgba(8,13,9,0.92)';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + hash(seed + i);
    const rr = r * (0.5 + hash(seed + i * 3) * 0.6);
    x.beginPath();
    x.arc(px + Math.cos(a) * r * 0.4, py + Math.sin(a) * r * 0.35, rr * 0.5, 0, 7);
    x.fill();
  }
  x.fillStyle = 'rgba(52,74,56,0.7)'; // chipped lip highlight
  x.beginPath(); x.arc(px - r * 0.3, py - r * 0.4, r * 0.26, 0, 7); x.fill();
  x.restore();
}

// Green-black marble lobby.
export function bakeLobby() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(-OVER, -OVER);
  x.fillStyle = '#0b120d'; x.fillRect(-OVER, -OVER, w, h);
  // ceiling strip lights
  x.fillStyle = '#070b08'; x.fillRect(-OVER, -OVER, w, 108);
  for (const lx of [180, 480, 780]) {
    x.fillStyle = 'rgba(120,220,150,0.2)'; x.fillRect(lx - 70, 66, 140, 8);
    x.fillStyle = 'rgba(160,240,180,0.5)'; x.fillRect(lx - 60, 68, 120, 4);
  }
  // back wall + wainscot
  x.fillStyle = '#0e1811'; x.fillRect(-OVER, 108, w, 322);
  x.fillStyle = '#121e15'; x.fillRect(-OVER, 340, w, 90);
  x.fillStyle = '#1a2a1e'; x.fillRect(-OVER, 336, w, 4);
  // marble floor 430
  const fg = x.createLinearGradient(0, 430, 0, LH + OVER);
  fg.addColorStop(0, '#16241c'); fg.addColorStop(1, '#0a110c');
  x.fillStyle = fg; x.fillRect(-OVER, 430, w, LH - 430 + OVER);
  x.strokeStyle = 'rgba(40,60,46,0.5)'; x.lineWidth = 1.4;
  for (let tx = -OVER; tx < LW + OVER; tx += 80) {
    x.beginPath(); x.moveTo(tx, 430); x.lineTo(tx - 60, LH + OVER); x.stroke();
  }
  for (const ty of [452, 486]) { x.beginPath(); x.moveTo(-OVER, ty); x.lineTo(LW + OVER, ty); x.stroke(); }
  // glass doors x 60–130 (burst live)
  x.fillStyle = '#0c1410'; x.fillRect(54, 232, 82, 198);
  x.fillStyle = 'rgba(140,200,160,0.10)'; x.fillRect(60, 240, 32, 190); x.fillRect(94, 240, 36, 190);
  x.strokeStyle = '#1c2a1e'; x.lineWidth = 3;
  x.strokeRect(60, 240, 32, 190); x.strokeRect(94, 240, 36, 190);
  x.fillStyle = '#2a3a2c'; x.fillRect(86, 320, 6, 26); x.fillRect(92, 320, 6, 26); // push bars
  // pillars x300/660 baked (w 46, tops y130); the CENTER pillar (x480 w52) is painted
  // over the actors by film.js via paintPillar so the cartwheel can pass behind it.
  paintPillar(x, 300, 46); paintPillar(x, 660, 46);
  // desk x740–920 h90 (top 340)
  x.fillStyle = '#131f14'; x.fillRect(740, 340, 180, 90);
  x.fillStyle = '#1c2c1c'; x.fillRect(740, 340, 180, 8);
  x.fillStyle = '#0a0f0a'; x.fillRect(748, 356, 76, 60); x.fillRect(836, 356, 76, 60);
  // stair door x 902
  x.fillStyle = '#0e1810'; x.fillRect(898, 280, 54, 150);
  x.fillStyle = '#162417'; x.fillRect(902, 286, 46, 138);
  x.fillStyle = 'rgba(120,220,150,0.08)'; x.fillRect(902, 286, 46, 138);
  x.fillStyle = '#2a3c2c'; x.fillRect(940, 348, 4, 14);
  return c;
}

// Subway platform (SHORN ST).
export function bakeSubway() {
  const w = LW + OVER * 2, h = LH + OVER * 2, c = canvas(w, h), x = c.getContext('2d');
  x.translate(-OVER, -OVER);
  x.fillStyle = '#0a120c'; x.fillRect(-OVER, -OVER, w, h);
  // tiled wall
  x.fillStyle = '#12241a'; x.fillRect(-OVER, 96, w, 334);
  x.strokeStyle = 'rgba(6,14,9,0.8)'; x.lineWidth = 1.2;
  for (let ty = 96; ty < 430; ty += 24) { x.beginPath(); x.moveTo(-OVER, ty); x.lineTo(LW + OVER, ty); x.stroke(); }
  for (let tx = -OVER; tx < LW + OVER; tx += 24) { x.beginPath(); x.moveTo(tx, 96); x.lineTo(tx, 430); x.stroke(); }
  x.fillStyle = 'rgba(84,255,142,0.12)'; x.fillRect(-OVER, 196, w, 10); // band stripe
  x.fillStyle = 'rgba(84,255,142,0.22)'; x.fillRect(-OVER, 196, w, 3);
  // ceiling + fluoro
  x.fillStyle = '#060a07'; x.fillRect(-OVER, -OVER, w, 100);
  for (const lx of [140, 480, 820]) {
    x.fillStyle = 'rgba(190,235,205,0.4)'; x.fillRect(lx - 60, 40, 120, 6);
  }
  // station sign (bitmap glyphs, native pixel text is sanctioned set dressing)
  x.fillStyle = '#0c1a12'; x.fillRect(420, 128, 148, 34);
  x.strokeStyle = '#243c2a'; x.lineWidth = 3; x.strokeRect(420, 128, 148, 34);
  glyphSign(x, 'SHORN ST', 448, 141, 2, 1, 0.9);
  // pillars x200/620 w60 (tile-clad)
  for (const px of [200, 620]) {
    x.fillStyle = '#182c1e'; x.fillRect(px - 30, 108, 60, 322);
    x.fillStyle = '#0e1c12'; x.fillRect(px - 30, 108, 8, 322);
    x.fillStyle = '#20362a'; x.fillRect(px + 18, 108, 12, 322);
    for (let ty = 116; ty < 430; ty += 30) { x.fillStyle = 'rgba(6,12,8,0.7)'; x.fillRect(px - 30, ty, 60, 2); }
    x.fillStyle = '#223826'; x.fillRect(px - 34, 104, 68, 8); x.fillRect(px - 34, 424, 68, 8);
  }
  // bench x380–470
  x.fillStyle = '#2c2418';
  for (let i = 0; i < 5; i++) x.fillRect(380, 384 + i * 9, 90, 5);
  x.fillStyle = '#1c1710'; x.fillRect(384, 412, 8, 20); x.fillRect(458, 412, 8, 20);
  // platform floor 430
  x.fillStyle = '#161d17'; x.fillRect(-OVER, 430, w, LH - 430 + OVER);
  for (let i = 0; i < 200; i++) {
    x.fillStyle = h2(i, 1, 95) > 0.5 ? 'rgba(34,44,36,0.5)' : 'rgba(8,12,9,0.5)';
    x.fillRect(-OVER + h2(i, 2, 95) * w, 432 + h2(i, 3, 95) * 100, 2, 2);
  }
  // yellow safety line x850 + platform edge x880
  x.fillStyle = '#8f7414'; x.fillRect(848, 436, 22, 104);
  x.fillStyle = '#c8a018'; x.fillRect(850, 436, 18, 104);
  for (let i = 0; i < 8; i++) { x.fillStyle = '#8f7414'; x.fillRect(852, 444 + i * 12, 14, 4); }
  x.fillStyle = '#2a332c'; x.fillRect(878, 430, 6, 110);
  x.fillStyle = '#05070a'; x.fillRect(884, 434, LW + OVER - 884, 106); // track pit
  // rails + sleepers
  x.fillStyle = '#12160f';
  for (let sx2 = 880; sx2 < LW + OVER; sx2 += 26) x.fillRect(sx2, 500, 16, 8);
  x.fillStyle = '#3a4046'; x.fillRect(884, 494, LW + OVER - 884, 5); x.fillRect(884, 516, LW + OVER - 884, 5);
  return c;
}

// Silver droplets burst (mirror break) — analytic from one event.
export function droplets(x, ev, rt, n = 26, col = '214,226,232') {
  const age = rt - ev.g;
  if (age < 0 || age > 1.1) return;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + hash(ev.seed) * 2;
    const sp = 90 + hash(ev.seed + i * 3) * 260;
    const px = ev.x + Math.cos(a0) * sp * age * (0.7 + hash(ev.seed + i) * 0.6);
    const py = ev.y + Math.sin(a0) * sp * age * (0.7 + hash(ev.seed + i * 7) * 0.6) + 260 * age * age;
    const s = 1.6 + hash(ev.seed + i * 5) * 2.4;
    x.fillStyle = `rgba(${col},${1 - age / 1.1})`;
    x.fillRect(px, py, s, s);
  }
}

// Rising dissolve motes (the blue pill's wrong-way fall).
export function riseMotes(x, ev, rt, n = 14, col = '120,170,255') {
  const age = rt - ev.g;
  if (age < 0 || age > 1.2) return;
  for (let i = 0; i < n; i++) {
    const px = ev.x + (hash(ev.seed + i * 3) - 0.5) * 26 + Math.sin(age * 5 + i) * 4;
    const py = ev.y - age * (60 + hash(ev.seed + i * 7) * 90);
    x.fillStyle = `rgba(${col},${(1 - age / 1.2) * 0.8})`;
    x.fillRect(px, py, 2, 2);
  }
}
