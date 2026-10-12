// A CUT ABOVE — art for the Remy Boys anime opening. Every baker here is deterministic
// (hash-based; no Math.random, no Date, no per-call state) and bakes ONE fresh canvas per
// call with integer dimensions. Two asset classes:
//   · Pixel-stage assets — drawn behind the 960×540 (LW×LH) pixel rig scenes, dithered
//     ramps (Bayer 4×4 via hash thresholds), crisp pixels.
//   · Full-res smooth assets — crisp cinematic cut-ins/logo for the 1920×1080 overlay,
//     smooth gradients, no dither.
//
// EXPORTS (16):
//   Pixel stage, 960×540 space (caller passes w=960,h=540 unless noted):
//     dawnSky(w, h)            full dawn gradient sky + low sun + underlit puffs + haze bands
//     cityFar(w, h)            1920×~200 silhouette skyline strip, TILEABLE, no windows
//     cityMid(w, h)            1920×~300 warm dark buildings, lit windows, rooftop props, TILEABLE
//     roofsNear(w, h)          1920×~160 rooftop running-surface strip, TILEABLE, flat run line at y 0–1
//     stormSky(w, h)           full storm ceiling: 3 value-noise cloud layers, green-grey underlight
//     bolt(w, h, seed)         transparent; ONE seeded jagged bolt, white 3px core, violet glow, forks
//     speedLines(w, h, tint, seed)  transparent; radial anime speed lines, centre ~45% radius clear
//     sunburst(w, h)           warm god-ray fan from top-centre for the sunrise leap
//     duskSky(w, h)            end-card sky: deep orange→rose→indigo, low sun, dark bars, early stars
//   Full-res smooth:
//     cloudBank(w, h)          1920×~420 sea of sunrise clouds seen from above (heroes leap OVER it)
//     blade(w, h)              1600×900 katana blade macro, hamon + edge gleam, dark transparent halo
//     eye(w, h)                900×600 determined anime eye, crimson iris from the Crimson Flow hair hexes
//     logo(w, h)               1700×420 "REMY BOYS" chrome logo + crimson slash underline + speed ticks
//     shine(w, h)              260×900 soft white diagonal specular band for the logo sweep
//     petal(size, seed)        one small sakura petal sprite (film.js stamps it analytically)
//   Stateless draw helper (no baking, called every frame with the overlay ctx):
//     cutPanel(ctx, img, x, y, w, h, o)   anime cut-in panel: skew clip, cover-fit, shade, halftone, border
//
// LIGHT DIRECTION per scene (one coherent sun per scene):
//   dawn (skyline shot):  sun LOW near the horizon — warm light from BELOW; cloud bellies and
//                         roofline tops catch amber rim light, faces stay cool violet shadow.
//   run:                  same dawn backlight — coping rims warm, near walls in cool dark shade.
//   storm:                no sun — dead grey-violet ceiling, sickly green-grey ambient glow from
//                         below, lightning as the only hard light (from above).
//   resolve / leap:       sun cracks through top-centre — gold god-rays fan downward, cloud tops
//                         warm white, undersides peach.
//   dusk (end card):      sun low again — dark cloud bars get a warm UNDER-rim, sky orange→indigo.
//   blade / eye / logo:   cinematic single specular, key light upper-left (eye glint upper-left).
import { hash } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js';

export const canvas = A.canvas;

// ---------- shared deterministic helpers ----------
const rgb = (hx) => [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)];
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);
const clamp01 = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerpN = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
const TAU = Math.PI * 2;
// Ramps: [[pos, [r,g,b]], ...] → interpolated colour (smooth class uses this without dither).
function rampAt(stops, t) {
  let k = 0;
  while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
  const [pa, ca] = stops[k], [pb, cb] = stops[k + 1];
  const u = clamp01((t - pa) / (pb - pa));
  return [Math.round(lerpN(ca[0], cb[0], u)), Math.round(lerpN(ca[1], cb[1], u)), Math.round(lerpN(ca[2], cb[2], u))];
}
const hexRamp = (stops) => stops.map(([p, c]) => [p, rgb(c)]);

// Direct pixel buffer (remy-bros pattern) for the dithered pixel-stage art.
function pixels(w, h) {
  w = Math.round(w); h = Math.round(h);
  const c = canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const set = (x, y, col, a = 255) => {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const [r, g, b] = typeof col === 'string' ? rgb(col) : col;
    const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
  };
  const done = () => (ctx.putImageData(img, 0, 0), c);
  return { c, set, done, w, h };
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Non-periodic value noise + fbm (galaremy technique) for the storm ceiling.
function n2(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const h = (a, b) => hash(a * 7349 + b * 92821 + s * 1013);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, s, oct = 3) {
  let v = 0, amp = 0.5, k = 1, norm = 0;
  for (let o = 0; o < oct; o++) { v += amp * n2(x * k, y * k, s + o * 17); norm += amp; amp *= 0.5; k *= 2; }
  return v / norm;
}

// Blob shading (remy-bros technique) with a steerable light vector (lx, ly) — the unit
// direction TOWARD the light in blob-normal space. shades = [outline, shadow, base, light, highlight].
function blobShape(w, h, circles, shades, o = {}) {
  w = Math.round(w); h = Math.round(h);
  const P = pixels(w, h);
  const inside = (x, y) => {
    let best = -1, bi = -1;
    for (let i = 0; i < circles.length; i++) {
      const [cx, cy, r] = circles[i], d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < r && 1 - d / r > best) { best = 1 - d / r; bi = i; }
    }
    return bi;
  };
  const m = new Int16Array(w * h).fill(-1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = (o.flatBottom && y >= h - 1) ? inside(x, h - 2) : inside(x, y);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : m[y * w + x]);
  const lx = o.lx ?? -0.55, ly = o.ly ?? -0.8, jit = o.jitter ?? 0.1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = m[y * w + x];
      if (i < 0) continue;
      const [cx, cy, r] = circles[i];
      const nx = (x + 0.5 - cx) / r, ny = (y + 0.5 - cy) / r;
      const l = lx * nx + ly * ny + (h2(x, y, 3) - 0.5) * jit;
      const edge = (o.outline ?? true) && (at(x - 1, y) < 0 || at(x + 1, y) < 0 || at(x, y - 1) < 0 || (!o.flatBottom && at(x, y + 1) < 0));
      let col = l > 0.62 ? shades[4] : l > 0.2 ? shades[3] : l > -0.35 ? shades[2] : shades[1];
      if (o.belly && y > h * (1 - o.belly)) col = shades[1];
      if (o.seams) { const up = at(x, y - 1); if (up >= 0 && up !== i && circles[up][1] < cy) col = o.seams; }
      P.set(x, y, edge ? shades[0] : col);
    }
  return P.done();
}

// ---------- 1. dawn sky (pixel stage, 960×540) ----------
// Light: sun LOW at (0.44w, 0.80h) — everything warm-lit from below/horizon side.
export function dawnSky(w, h) {
  const P = pixels(w, h);
  const stops = hexRamp([[0, '#221848'], [0.28, '#523073'], [0.52, '#8f4d80'], [0.72, '#c46454'], [0.87, '#f29454'], [1, '#ffce88']]);
  const bands = 18;
  const sunX = w * 0.44, sunY = h * 0.8, sunR = Math.max(12, Math.round(h * 0.045));
  const hazeYs = [0.58 + 0.1 * hash(3), 0.66 + 0.08 * hash(7), 0.73 + 0.05 * hash(11)];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      // banded gradient with Bayer dither between bands
      const q = (y / (h - 1)) * bands, b0 = Math.floor(q), f = q - b0;
      const pick = f * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? b0 + 1 : b0;
      let c = rampAt(stops, Math.min(1, pick / bands));
      // low sun: warm core kept just under pure white + dithered bloom ring
      const d = Math.hypot(x + 0.5 - sunX, y + 0.5 - sunY);
      if (d < sunR * 3) {
        const g2 = Math.max(0, 1 - d / (sunR * 3));
        if (d < sunR) c = mixc(rgb('#fff6d8'), rgb('#ffcf84'), Math.max(0, (d / sunR - 0.5) / 0.5));
        else if (g2 * 16 > BAYER[(y & 3) * 4 + (x & 3)]) c = mixc(c, rgb('#ffc070'), g2 * 0.45);
      }
      // thin horizontal haze bands with dithered edges
      for (const hy of hazeYs) {
        const dy = y - hy * h;
        if (Math.abs(dy) < 3) {
          const a2 = (1 - Math.abs(dy) / 3) * 0.3;
          if (a2 * 16 > BAYER[(y & 3) * 4 + (x & 3)]) c = mixc(c, rgb('#ffd8a0'), a2);
        }
      }
      P.set(x, y, c);
    }
  // underlit cloud puffs — light from the low sun below, so bellies glow amber, tops stay violet
  const shades = ['#4e3064', '#7c5a88', '#c08898', '#ffb478', '#ffe2ac'];
  const puffs = [[0.16, 0.17, 0.16], [0.4, 0.26, 0.13], [0.62, 0.15, 0.15], [0.84, 0.3, 0.12], [0.3, 0.44, 0.1], [0.7, 0.47, 0.09]];
  const x2 = P.c.getContext('2d');
  for (let k = 0; k < puffs.length; k++) {
    const [fx, fy, fs] = puffs[k];
    const cw = Math.round(w * fs), ch = Math.round(cw * 0.52);
    const circles = [];
    const n = 4 + Math.floor(h2(k, 1, 6) * 2);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, r = (0.16 + 0.1 * Math.sin(Math.PI * u) + 0.05 * h2(k * 31 + i, 2, 6)) * cw;
      circles.push([cw * (0.14 + 0.72 * u), ch * 0.6 - r * 0.5 * Math.sin(Math.PI * u), r]);
    }
    for (let i = 0; i < 3; i++) circles.push([cw * (0.24 + 0.26 * i), ch - cw * 0.09, cw * 0.12]);
    const cn = blobShape(cw, ch, circles, shades, { lx: 0.15, ly: 0.9, flatBottom: true, seams: '#a87890', belly: 0.18 });
    x2.drawImage(cn, Math.round(w * fx - cw / 2 + (h2(k, 3, 6) - 0.5) * w * 0.06), Math.round(h * fy));
  }
  // two long low warm strata near the horizon
  for (let k = 0; k < 2; k++) {
    const cw = Math.round(w * 0.4), ch = 14 + k * 6;
    const circles = [];
    for (let i = 0; i < 8; i++) circles.push([cw * (i + 0.5) / 8, ch - 3, (5 + 4 * h2(i, k, 8)) * (0.7 + 0.6 * Math.sin(Math.PI * (i + 0.5) / 8))]);
    const cn = blobShape(cw, ch, circles, shades, { lx: 0.1, ly: 0.95, flatBottom: true, outline: false });
    x2.drawImage(cn, Math.round(w * (0.16 + 0.4 * k)), Math.round(h * (0.62 + 0.06 * k)));
  }
  return P.c;
}

// ---------- 2. far skyline (1920×~200 strip, tileable, no windows) ----------
// Hazy cool-violet monochrome; per-slot value variation; a few radio masts. Slot widths
// divide 1920 so the strip tiles seamlessly.
export function cityFar(w, h) {
  const P = pixels(w, h);
  const rows = [
    { sw: 24, colA: '#6a5494', colB: '#74599c', hMin: 0.34, hMax: 0.78, sd: 61 }, // back row, haze-light against the sky
    { sw: 32, colA: '#33265a', colB: '#3b2c64', hMin: 0.22, hMax: 0.6, sd: 87 },  // front row, dark against the sky
  ];
  const haze = rgb('#8a5f88');
  for (const R of rows) {
    const n = Math.ceil(w / R.sw);
    for (let i = 0; i < n; i++) {
      const x0 = i * R.sw, bw = R.sw - (h2(i, 1, R.sd) > 0.75 ? 2 : 0);
      const top = Math.round(h * (1 - (R.hMin + (R.hMax - R.hMin) * h2(i, 2, R.sd))));
      const base = rgb(h2(i, 3, R.sd) > 0.5 ? R.colA : R.colB);
      for (let x = x0; x < x0 + bw && x < w; x++)
        for (let y = top; y < h; y++) {
          let c = h2(x, y, R.sd + 5) > 0.965 ? base.map((v) => Math.min(255, v + 10)) : base;
          const f = Math.max(0, (y - h * 0.45) / (h * 0.55)); // haze lift toward the glowing horizon
          if (f > 0 && f * 16 > BAYER[(y & 3) * 4 + (x & 3)] * 0.9) c = mixc(c, haze, Math.min(1, f * 0.5 + 0.15));
          P.set(x, y, c);
        }
      if (h2(i, 4, R.sd) > 0.965) {
        // radio mast with crossbars and a dim tip light
        const mx = x0 + (R.sw >> 1), mt = top - Math.round(h * (0.16 + 0.22 * h2(i, 6, R.sd)));
        const mc = R === rows[0] ? '#5a4a8a' : '#463a6e';
        for (let y = mt; y < top; y++) { P.set(mx, y, mc); if (h2(0, y, R.sd) > 0.6) P.set(mx + 1, y, mc); }
        for (const cb of [0.35, 0.68]) {
          const cy = Math.round(mt + (top - mt) * cb);
          for (let dx = -3; dx <= 3; dx++) P.set(mx + dx, cy, mc);
        }
        P.set(mx, mt - 1, '#6a5a9a');
      } else if (h2(i, 7, R.sd) > 0.72) {
        // rooftop bump
        for (let x = x0 + 6; x < x0 + 16; x++) for (let y = top - 4; y < top; y++) P.set(x, y, rgb(R.colB));
      }
    }
  }
  return P.c;
}

// ---------- 3. mid skyline (1920×~300 strip, tileable) ----------
// Warmer dark buildings with a dawn backlit parapet rim, sparse warm lit windows,
// water tanks / AC boxes / antennas on the roofs.
export function cityMid(w, h) {
  const P = pixels(w, h);
  const sw = 64, n = Math.round(w / sw);
  const haze = rgb('#6a4468');
  for (let i = 0; i < n; i++) {
    const gapL = Math.floor(h2(i, 1, 5) * 5), gapR = Math.floor(h2(i, 2, 5) * 5);
    const x0 = i * sw + gapL, x1 = (i + 1) * sw - gapR;
    const top = Math.round(h * (1 - (0.34 + 0.46 * h2(i, 3, 5))));
    const base = rgb(h2(i, 4, 5) > 0.5 ? '#221634' : '#1b1229');
    const warm = rgb(h2(i, 5, 5) > 0.6 ? '#2a1a30' : '#241530');
    for (let x = x0; x < x1; x++)
      for (let y = top; y < h; y++) {
        let c = (x < x0 + 2 || x >= x1 - 2) ? base.map((v) => Math.max(0, v - 8)) : (h2(i, 6, 5) > 0.5 ? warm : base);
        if (h2(x, y, 9) > 0.955) c = c.map((v) => Math.min(255, v + 8));
        const f = Math.max(0, (y - h * 0.55) / (h * 0.45));
        if (f > 0 && f * 16 > BAYER[(y & 3) * 4 + (x & 3)] * 0.8) c = mixc(c, haze, Math.min(1, f * 0.35));
        P.set(x, y, c);
      }
    // parapet rim catches the dawn backlight on the horizon
    for (let x = x0; x < x1; x++) { P.set(x, top, '#c87850'); P.set(x, top + 1, '#7a4648'); }
    // seeded sparse lit windows (warm amber, 3×4, a few dimmer)
    for (let wy = top + 8; wy + 5 < h - 4; wy += 13)
      for (let wx = x0 + 6; wx + 3 < x1 - 4; wx += 11) {
        const r = h2(wx, wy, 33);
        if (r > 0.16) continue; // most windows unlit — wall stays dark
        const lit = r < 0.06 ? '#ffb850' : r < 0.11 ? '#d88f42' : '#8a5a40';
        for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 3; dx++) P.set(wx + dx, wy + dy, dy === 3 ? '#5a3428' : lit);
      }
    // rooftop props
    const props = h2(i, 8, 5);
    if (props > 0.62) {
      // water tank: legs + planked cylinder + cone + bands
      const tw = 18, tx = x0 + 8 + Math.floor(h2(i, 9, 5) * (sw - 36)), ty = top - 22;
      for (const lx of [tx + 2, tx + tw - 4]) for (let y = ty + 16; y < top; y++) P.set(lx, y, '#241a26');
      for (let y = ty + 2; y < ty + 18; y++) for (let x = tx; x < tx + tw; x++) P.set(x, y, (x & 3) < 2 ? '#4e3640' : '#5c404a');
      for (let y = 0; y < 6; y++) {
        const half = Math.round(((y + 1) * tw) / 12);
        for (let x = tx + tw / 2 - half; x <= tx + tw / 2 + half; x++) P.set(x, ty - 2 + y, y < 1 ? '#c87850' : '#6a3c42');
      }
      P.set(tx + tw / 2, ty - 3, '#e8a070');
      for (let x = tx; x < tx + tw; x++) { P.set(x, ty + 4, '#38242e'); P.set(x, ty + 16, '#38242e'); }
    } else if (props > 0.3) {
      // AC boxes
      const cnt = 1 + Math.floor(h2(i, 10, 5) * 3);
      for (let k = 0; k < cnt; k++) {
        const bw = 10 + Math.floor(h2(k, i, 51) * 8), bx = x0 + 4 + Math.floor(h2(k, i, 52) * (sw - bw - 8)), bt = top - 6;
        for (let y = bt; y < top; y++) for (let x = bx; x < bx + bw; x++) P.set(x, y, y === bt ? '#8a8296' : y === top - 1 ? '#2e2434' : '#5a5266');
        for (let x = bx + 2; x < bx + bw - 2; x += 3) P.set(x, bt + 2, '#463e52');
      }
    }
    if (h2(i, 11, 5) > 0.8) {
      // antenna with beacon
      const ax = x0 + Math.floor(sw / 2), at = top - (14 + Math.floor(h2(i, 12, 5) * 18));
      for (let y = at; y < top; y++) P.set(ax, y, '#3a2e44');
      for (let dx = -2; dx <= 2; dx++) P.set(ax + dx, at + 4, '#3a2e44');
      P.set(ax, at - 1, '#ffb060');
    }
  }
  return P.c;
}

// ---------- 4. near rooftop strip (1920×~160, tileable) ----------
// The running surface. y 0–1 = flat sun-kissed coping (the runnable roofline); y 2–112 the
// tar/tile deck the heroes run on; below that a near-side pipe railing band and parapet face.
// One water tower with legs, vents and a drainpipe sit on the deck. Slot widths divide 1920.
export function roofsNear(w, h) {
  const P = pixels(w, h);
  const DECK_END = Math.min(h - 20, 112);
  const slotW = 240, nS = Math.floor(w / slotW);
  // seeded railing gap (interior of a slot, so the seams stay intact)
  const gapSlot = Math.floor(h2(1, 1, 76) * nS), gx0 = gapSlot * slotW + 70, gx1 = gx0 + 110;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let c;
      const inGap = x >= gx0 && x < gx1;
      if (y === 0) c = '#f0a468'; // sun-kissed coping — flat runnable roofline
      else if (y === 1) c = '#a05a48';
      else if (y <= DECK_END) {
        // tar + tile deck
        const tx = Math.floor(x / 16), ty = Math.floor((y - 2) / 10);
        c = (x % 16) === 0 || ((y - 2) % 10) === 0 ? '#3a2e36' : '#463840';
        if (h2(tx, ty, 71) > 0.82) c = '#4e4048';
        if (h2(x, y, 72) > 0.96) c = '#54444c';
        if (y < 6) c = h2(x, y, 73) > 0.4 ? '#665258' : '#5a4850'; // far-edge sheen from the low sun
      } else if (y <= DECK_END + 2) c = '#2c222c'; // shadow seam
      else if (y <= DECK_END + 26) {
        const ry = y - (DECK_END + 3);
        if (ry < 2) c = !inGap && (x % 24) < 2 ? '#6a7284' : '#c8d0dc'; // pipe + highlight
        else if (ry < 24 && !inGap && (x % 24) < 2) c = '#565e70'; // posts
        else {
          // brick parapet face
          const row = Math.floor(ry / 6), bx = (x + (row & 1 ? 12 : 0)) % 24, by = ry % 6;
          c = (by === 5 || bx === 23) ? '#2e1c26' : (by === 0 || bx === 0) ? '#5c363c' : '#462a32';
          if (h2(x, y, 74) > 0.94) c = '#52323a';
        }
      } else { c = '#241a22'; if (h2(x, y, 75) > 0.9) c = '#2e222c'; } // base shadow
      P.set(x, y, c);
    }
  // one water tower with legs, standing on the deck in a seeded slot
  const twSlot = Math.floor(h2(2, 2, 77) * nS);
  {
    const cx = twSlot * slotW + slotW / 2, bw = 64, bodyB = 74, legB = 96;
    for (let y = 6; y <= 26; y++) { // cone
      const half = Math.round(((y - 6) / 20) * (bw / 2));
      for (let x = cx - half; x <= cx + half; x++)
        P.set(x, y, y === 6 ? '#c87850' : y > 23 ? '#4a3038' : (x + y) % 5 < 2 ? '#7a4642' : '#6a3c3c');
    }
    P.set(cx, 5, '#f0b070');
    for (let y = 27; y < bodyB; y++) // planked body
      for (let x = cx - bw / 2; x < cx + bw / 2; x++) P.set(x, y, (x & 3) < 2 ? '#5c4044' : '#6e4c4e');
    for (const by of [32, 52, 70]) for (let x = cx - bw / 2; x < cx + bw / 2; x++) P.set(x, by, '#463036');
    for (const lx of [cx - 24, cx - 10, cx + 9, cx + 23]) // legs
      for (let y = bodyB; y < legB; y++) { P.set(lx, y, '#3a2c34'); P.set(lx + 1, y, '#2e222a'); }
    for (let k = 0; k < 2; k++) { // cross braces
      const y0 = bodyB + 6 + k * 12;
      for (let d = 0; d < 14; d++) { P.set(cx - 24 + d, y0 + d, '#33262e'); P.set(cx + 23 - d, y0 + d, '#33262e'); }
    }
    for (const lx of [cx - 25, cx + 9]) for (let x = lx - 2; x < lx + 6; x++) P.set(x, legB, '#241a20'); // feet pads
  }
  // vents at two other slots
  for (let k = 0; k < 2; k++) {
    const vs = (twSlot + 2 + k * 3) % nS, vx = vs * slotW + 90 + k * 30, vt = 34;
    for (let y = vt; y < vt + 14; y++) for (let x = vx; x < vx + 22; x++) P.set(x, y, y === vt ? '#7a8294' : y > vt + 11 ? '#262230' : '#565064');
    for (let x = vx + 3; x < vx + 20; x += 4) for (let y = vt + 3; y < vt + 10; y++) P.set(x, y, '#3a3646');
  }
  // drainpipe down the parapet at one slot
  {
    const ds = (twSlot + 5) % nS, dx0 = ds * slotW + 200;
    for (let y = DECK_END + 3; y < h; y++) for (let x = dx0; x < dx0 + 5; x++) P.set(x, y, x === dx0 + 4 ? '#1c1420' : '#322636');
    for (const by of [DECK_END + 12, DECK_END + 30]) if (by < h - 2) for (let x = dx0 - 2; x < dx0 + 7; x++) P.set(x, by, '#241c28');
  }
  return P.c;
}

// ---------- 5. storm sky (960×540, opaque) ----------
// Three value-noise cloud depth layers (far light → near dark), dead grey-violet, with a
// sickly green-grey underlight rising from the bottom and a darker ceiling at the top.
// NO rain — rain is analytic at runtime. Light: none (overcast), lightning comes from above.
export function stormSky(w, h) {
  const P = pixels(w, h);
  const layers = [
    { cell: 230, sd: 3, th: 0.34, amp: 2.6, ramp: ['#565170', '#75708e', '#948fa8', '#b6b2c4', '#d6d4de'] },
    { cell: 118, sd: 17, th: 0.3, amp: 2.9, ramp: ['#403c58', '#585474', '#726e8c', '#8e8aa4', '#aca8c0'] },
    { cell: 62, sd: 41, th: 0.3, amp: 3.1, ramp: ['#221f36', '#332f4c', '#454060', '#5a5578', '#716c90'] },
  ];
  const base = rgb('#191630'), green = rgb('#5e6e58'), ceil = rgb('#141226');
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      let col = base;
      for (const L of layers) {
        const dens = (fbm(x / L.cell, y / L.cell + L.sd * 0.37, L.sd, 3) - L.th) * L.amp;
        if (dens > 0) {
          const lv = Math.max(0, Math.min(4, Math.floor(dens * 5 + BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5)));
          col = rgb(L.ramp[lv]);
        }
      }
      const gt = clamp01((v - 0.5) / 0.5) * (0.22 + 0.3 * fbm(x / 210, y / 210 + 9, 77, 2));
      col = mixc(col, green, Math.min(0.5, gt));
      const ct = clamp01((0.16 - v) / 0.16) * 0.55;
      if (ct > 0) col = mixc(col, ceil, ct);
      P.set(x, y, col);
    }
  }
  return P.done();
}

// ---------- 6. lightning bolt (960×540 transparent) ----------
// ONE jagged bolt from the top edge down to ~60% height: white 3px core inside a pale violet
// 9px glow (plus a faint wide halo), 2–3 forking branches. Path fully seeded via `seed`.
export function bolt(w, h, seed) {
  const c = canvas(w, h), x = c.getContext('2d');
  x.lineCap = 'round'; x.lineJoin = 'round';
  const n = 16, yEnd = h * 0.62;
  const pts = [];
  let px = w * (0.38 + 0.24 * hash(seed * 13 + 1)), py = 0;
  for (let i = 0; i <= n; i++) {
    pts.push([px, py]);
    py += (yEnd / n) * (0.75 + 0.5 * h2(i, 1, seed));
    px = Math.max(w * 0.12, Math.min(w * 0.88, px + (h2(i, 2, seed) - 0.5) * w * 0.075));
  }
  const stroke = (path, wd, col) => {
    x.strokeStyle = col; x.lineWidth = wd;
    x.beginPath(); x.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < path.length; i++) x.lineTo(path[i][0], path[i][1]);
    x.stroke();
  };
  stroke(pts, 15, 'rgba(186,158,255,0.18)');
  stroke(pts, 9, 'rgba(198,172,255,0.5)');
  stroke(pts, 3, '#ffffff');
  const branches = 2 + (h2(3, 7, seed) > 0.45 ? 1 : 0);
  for (let b = 0; b < branches; b++) {
    const bi = 3 + Math.floor(h2(b, 8, seed) * (pts.length - 6));
    const [bx, by] = pts[bi];
    const dir = h2(b, 9, seed) > 0.5 ? 1 : -1;
    let bx2 = bx, by2 = by;
    const a0 = (0.35 + h2(b, 10, seed) * 0.5) * dir;
    const segs = 3 + Math.floor(h2(b, 11, seed) * 3);
    const bp = [[bx2, by2]];
    for (let i = 0; i < segs; i++) {
      bx2 += Math.sin(a0) * 26 + (h2(b, 12 + i, seed) - 0.5) * 14;
      by2 += Math.cos(a0) * 20;
      bp.push([bx2, by2]);
    }
    stroke(bp, 6, 'rgba(196,168,255,0.28)');
    stroke(bp, 4, 'rgba(206,180,255,0.5)');
    stroke(bp, 1.6, 'rgba(250,246,255,0.9)');
  }
  return c;
}

// ---------- 7. radial speed lines (960×540 transparent) ----------
// Thin triangular rays point at the frame centre from every edge; the centre ~45% radius
// stays fully transparent. Ray lengths/widths/alphas seeded; tint e.g. '#ffd9a0'.
export function speedLines(w, h, tint, seed) {
  const c = canvas(w, h), x = c.getContext('2d');
  const cx = w / 2, cy = h / 2, R = Math.hypot(cx, cy) * 1.12;
  const n = 96 + Math.floor(hash(seed * 7 + 2) * 56);
  x.fillStyle = tint;
  for (let i = 0; i < n; i++) {
    const a = ((i + h2(i, 1, seed)) / n) * TAU;
    const len = Math.pow(h2(i, 2, seed), 1.7);
    const tip = Math.max(R * 0.46, R * (1 - 0.62 * len));
    const wd = 1.2 + 7.5 * Math.pow(h2(i, 3, seed), 1.4);
    x.globalAlpha = 0.22 + 0.55 * h2(i, 4, seed);
    x.save(); x.translate(cx, cy); x.rotate(a);
    x.beginPath(); x.moveTo(R, -wd); x.lineTo(R, wd); x.lineTo(tip, 0); x.closePath(); x.fill();
    x.restore();
  }
  x.globalAlpha = 1;
  return c;
}

// ---------- 8. sunburst god rays (960×540 transparent) ----------
// Warm gold fan from top-centre: long soft triangular rays fading to transparent, plus a soft
// core glow. Light: sun cracking through top-centre for the sunrise leap.
export function sunburst(w, h) {
  const c = canvas(w, h), x = c.getContext('2d');
  const ox = w * 0.46, oy = -h * 0.08, R = Math.hypot(w, h) * 1.15;
  const n = 12, spread = Math.PI * 0.82;
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 - spread / 2 + ((i + h2(i, 1, 21) * 0.7) / n) * spread;
    const wide = i % 3 === 0;
    const wd = (wide ? 0.1 : 0.035) * w * (0.7 + 0.6 * h2(i, 2, 21));
    const a0 = (wide ? 0.1 : 0.22) * (0.7 + 0.6 * h2(i, 3, 21));
    const ex = ox + Math.cos(a) * R, ey = oy + Math.sin(a) * R;
    const g = x.createLinearGradient(ox, oy, ex, ey);
    g.addColorStop(0, `rgba(255,232,170,${a0})`);
    g.addColorStop(0.55, `rgba(255,210,130,${a0 * 0.45})`);
    g.addColorStop(1, 'rgba(255,200,120,0)');
    x.fillStyle = g;
    const px = -Math.sin(a) * wd, py = Math.cos(a) * wd;
    x.beginPath(); x.moveTo(ox + px, oy + py); x.lineTo(ox - px, oy - py); x.lineTo(ex, ey); x.closePath(); x.fill();
  }
  const g = x.createRadialGradient(ox, oy, 0, ox, oy, w * 0.3);
  g.addColorStop(0, 'rgba(255,240,196,0.6)');
  g.addColorStop(0.5, 'rgba(255,224,150,0.22)');
  g.addColorStop(1, 'rgba(255,224,150,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  return c;
}

// ---------- 9. cloud bank (1920×~420 FULL-RES smooth, transparent top) ----------
// A sea of soft sunrise clouds seen from above: dense peach mass at the bottom, sparse small
// puffs rising to a transparent top — the heroes leap OVER it. Smooth radial gradients, no
// dither. Light: warm sunrise from upper-left — tops warm white, undersides peach. Wraps in x.
export function cloudBank(w, h) {
  const c = canvas(w, h), x = c.getContext('2d');
  const puff = (px, py, r, k) => {
    for (const dx of [-w, 0, w]) {
      let g = x.createRadialGradient(px + dx + r * 0.22, py + r * 0.4, r * 0.08, px + dx, py, r);
      g.addColorStop(0, `rgba(250,196,172,${0.9 * k})`);
      g.addColorStop(1, 'rgba(250,196,172,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px + dx, py, r, 0, TAU); x.fill();
      g = x.createRadialGradient(px + dx - r * 0.3, py - r * 0.32, r * 0.06, px + dx - r * 0.1, py - r * 0.05, r * 0.9);
      g.addColorStop(0, `rgba(255,248,232,${0.98 * k})`);
      g.addColorStop(0.55, `rgba(255,232,206,${0.6 * k})`);
      g.addColorStop(1, 'rgba(255,232,206,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px + dx, py, r, 0, TAU); x.fill();
    }
  };
  const gb = x.createLinearGradient(0, h * 0.55, 0, h);
  gb.addColorStop(0, 'rgba(255,236,214,0)');
  gb.addColorStop(0.55, 'rgba(255,230,204,0.85)');
  gb.addColorStop(1, 'rgba(252,220,194,1)');
  x.fillStyle = gb; x.fillRect(0, h * 0.5, w, h * 0.5);
  const rows = Math.max(3, Math.round(h / 70));
  for (let r = 0; r <= rows; r++) {
    const fr = r / rows, y = h * 0.12 + fr * h * 0.62;
    const cnt = Math.round(10 + fr * 14), sp = w / cnt;
    for (let i = 0; i < cnt; i++) {
      const px = (i + 0.5) * sp + (h2(i, r, 5) - 0.5) * sp * 0.8;
      const rr = (18 + fr * 52) * (0.7 + 0.6 * h2(i, r, 9));
      puff(px, y + (h2(i, r, 13) - 0.5) * 18, rr, 0.5 + fr * 0.5);
    }
  }
  return c;
}

// ---------- 10. dusk sky (960×540 pixel stage) ----------
// End-card sky: deep indigo top → rose → deep orange horizon, low half-set sun, 2–3 dark
// backlit cloud bars, early stars in the dark top. Light: sun LOW — warm under-rims on bars.
export function duskSky(w, h) {
  const P = pixels(w, h);
  const stops = hexRamp([[0, '#241548'], [0.2, '#5e2c72'], [0.38, '#8f3d5c'], [0.54, '#c25648'], [0.7, '#e07a3e'], [0.85, '#f8a850'], [1, '#ffd088']]);
  const bands = 20;
  const sunX = w * 0.5, sunY = h * 0.76, sunR = Math.max(14, Math.round(h * 0.055));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const q = (y / (h - 1)) * bands, b0 = Math.floor(q), f = q - b0;
      const pick = f * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? b0 + 1 : b0;
      let c = rampAt(stops, Math.min(1, pick / bands));
      const d = Math.hypot(x + 0.5 - sunX, y + 0.5 - sunY);
      if (d < sunR * 2.6) {
        const g2 = Math.max(0, 1 - d / (sunR * 2.6));
        if (d < sunR) c = mixc(rgb('#fff2cc'), rgb('#ffcf80'), Math.max(0, (d / sunR - 0.55) / 0.45));
        else if (g2 * 16 > BAYER[(y & 3) * 4 + (x & 3)]) c = mixc(c, rgb('#ffbf70'), g2 * 0.5);
      }
      P.set(x, y, c);
    }
  // early stars in the dark upper sky
  for (let k = 0; k < 46; k++) {
    const sx = Math.floor(h2(k, 1, 91) * w), sy = Math.floor(h2(k, 2, 91) * h * 0.22), sr = h2(k, 3, 91);
    P.set(sx, sy, sr > 0.8 ? '#ffd8a8' : '#eae6ff');
    if (sr > 0.86) { P.set(sx + 1, sy, '#d8d4f4'); P.set(sx, sy + 1, '#d8d4f4'); }
  }
  // 2–3 dark cloud bars with a warm under-rim (light from the low sun below)
  const shades = ['#241634', '#3c2448', '#4e3054', '#6a4056', '#c87048'];
  const x2 = P.c.getContext('2d');
  for (let k = 0; k < 3; k++) {
    const hh = 22 + k * 9, sd = 200 + k * 13;
    const circles = [];
    for (let i = 0; i < 9; i++) {
      const u = (i + 0.5) / 9, r = hh * (0.5 + 0.45 * h2(i, 1, sd)) * (0.6 + 0.8 * Math.sin(Math.PI * u));
      circles.push([w * u + (h2(i, 2, sd) - 0.5) * 30, hh - r * 0.4, r]);
    }
    const cn = blobShape(w, Math.round(hh * 1.7), circles, shades, { lx: 0.1, ly: 0.85, flatBottom: true, seams: '#3c2448' });
    x2.drawImage(cn, 0, Math.round(h * (0.3 + k * 0.16)));
  }
  return P.c;
}

// ---------- 11. katana blade (1600×900 FULL-RES smooth, transparent) ----------
// Dramatic macro: blade crossing the frame from lower-left to upper-right. Dark blue-grey
// steel, wavy bright hamon, seeded specular gleam ramps along the edge, curved kissaki tip.
// A soft dark-navy halo (semi-transparent vignette) is baked around the blade. No dither.
export function blade(w, h) {
  const P = pixels(w, h);
  const a0 = [w * 0.05, h * 0.97], a1 = [w * 0.97, h * 0.06];
  const vx = a1[0] - a0[0], vy = a1[1] - a0[1], L = Math.hypot(vx, vy);
  const dx = vx / L, dy = vy / L, nx = -dy, ny = dx;
  const base = h * 0.045;
  const phase = hash(5) * TAU;
  const gleams = Array.from({ length: 4 }, (_, g) => ({ c: 0.18 + 0.78 * h2(g, 1, 55), wd: 0.05 + 0.09 * h2(g, 2, 55), a: 0.5 + 0.5 * h2(g, 3, 55) }));
  const steel = hexRamp([[0, '#eef4fc'], [0.07, '#c6d2e4'], [0.16, '#93a2c0'], [0.34, '#5a6786'], [0.62, '#39415e'], [1, '#1f2540']]);
  const hamon = hexRamp([[0, '#f4f8ff'], [0.5, '#d8e2f0'], [1, '#9aa8c4']]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const rx = x + 0.5 - a0[0], ry = y + 0.5 - a0[1];
      const t = (rx * dx + ry * dy) / L; // 0..1 along the blade
      const s = rx * nx + ry * ny;       // perpendicular offset in px
      const half = base * (1 - 0.45 * Math.pow(Math.max(0, t), 1.35));
      let spineS = half, edgeS = -half;
      if (t > 0.86) edgeS = -half * Math.cos(((t - 0.86) / 0.14) * Math.PI / 2); // kissaki closes the tip
      if (t >= 0 && t <= 1 && half > 0 && s >= edgeS && s <= spineS) {
        const u = (s - edgeS) / Math.max(1e-3, spineS - edgeS); // 0 at the edge → 1 at the spine
        const uH = 0.17 + 0.045 * Math.sin(t * 34 + phase) + 0.02 * Math.sin(t * 89 + phase * 2);
        let c = u < uH ? rampAt(hamon, u / uH) : rampAt(steel, (u - uH) / (1 - uH));
        // seeded gleam ramp along the edge
        let g2 = 0;
        for (const G of gleams) g2 = Math.max(g2, G.a * Math.exp(-((t - G.c) ** 2) / (2 * G.wd * G.wd)));
        if (g2 > 0 && u < 0.3) c = mixc(c, [250, 252, 255], (1 - u / 0.3) * g2 * 0.85);
        const sh = 1 + 0.05 * Math.sin(t * 7 + phase);
        c = [Math.min(255, Math.round(c[0] * sh)), Math.min(255, Math.round(c[1] * sh)), Math.min(255, Math.round(c[2] * sh))];
        const aa = clamp01(Math.min((s - edgeS) / 1.4, (spineS - s) / 1.4, t / 0.02, (1 - t) / 0.015));
        P.set(x, y, c, Math.round(255 * aa));
      } else {
        // soft dark halo fading to transparent
        const tc = clamp01(t);
        const half2 = base * (1 - 0.45 * Math.pow(tc, 1.35));
        const qx = a0[0] + vx * tc, qy = a0[1] + vy * tc;
        const d = Math.hypot(x + 0.5 - qx, y + 0.5 - qy) - half2;
        if (d > 0 && t > -0.03 && t < 1.05) {
          const a2 = 0.55 * Math.exp(-d / 130);
          if (a2 > 0.02) P.set(x, y, [12, 12, 28], Math.round(255 * a2));
        }
      }
    }
  return P.done();
}

// ---------- 12. the eye (900×600 FULL-RES smooth) ----------
// Stylized DETERMINED anime eye, baked open: strong dark tapered lashes, sharp outer corner
// tilted up, crimson iris built from the Crimson Flow hair hexes (art.json row 42: #893c3b /
// #8d3b3b), dark pupil, white glint upper-left, warm lower-lid light. Key light upper-left.
export function eye(w, h) {
  const c = canvas(w, h), x = c.getContext('2d');
  const cx = w / 2, cy = h * 0.52, hw = w * 0.42;
  const I = [cx - hw, cy + h * 0.055], O = [cx + hw, cy - h * 0.06];
  const u1 = [cx - hw * 0.58, cy - h * 0.36], u2 = [cx + hw * 0.3, cy - h * 0.39];
  const l1 = [cx + hw * 0.5, cy + h * 0.23], l2 = [cx - hw * 0.55, cy + h * 0.235];
  const eyePath = () => {
    x.beginPath();
    x.moveTo(I[0], I[1]);
    x.bezierCurveTo(u1[0], u1[1], u2[0], u2[1], O[0], O[1]);
    x.bezierCurveTo(l1[0], l1[1], l2[0], l2[1], I[0], I[1]);
    x.closePath();
  };
  // sclera with lid shadow at the top
  eyePath();
  const sg = x.createLinearGradient(0, cy - h * 0.32, 0, cy + h * 0.26);
  sg.addColorStop(0, '#d8c4c2'); sg.addColorStop(0.45, '#f7f3ec'); sg.addColorStop(1, '#efe4d8');
  x.fillStyle = sg; x.fill();
  x.save(); eyePath(); x.clip();
  const ir = h * 0.27, icx = cx + w * 0.012, icy = cy + h * 0.02;
  // soft corner shading
  for (const [ex, ey] of [I, O]) {
    const g = x.createRadialGradient(ex, ey, 0, ex, ey, hw * 0.34);
    g.addColorStop(0, 'rgba(90,40,44,0.55)'); g.addColorStop(1, 'rgba(90,40,44,0)');
    x.fillStyle = g; x.fillRect(ex - hw * 0.4, ey - hw * 0.4, hw * 0.8, hw * 0.8);
  }
  // iris — crimson gradient from the Crimson Flow hair family (#893c3b / #8d3b3b)
  let g = x.createLinearGradient(0, icy - ir, 0, icy + ir);
  g.addColorStop(0, '#421718'); g.addColorStop(0.42, '#8d3b3b'); g.addColorStop(0.75, '#b0524a'); g.addColorStop(1, '#d47a62');
  x.fillStyle = g; x.beginPath(); x.arc(icx, icy, ir, 0, TAU); x.fill();
  // seeded striations + warm inner glow ring toward the bottom
  x.save(); x.beginPath(); x.arc(icx, icy, ir, 0, TAU); x.clip();
  x.strokeStyle = 'rgba(70,22,26,0.5)'; x.lineWidth = 3;
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * TAU + h2(k, 1, 9) * 0.2, r0 = ir * (0.42 + 0.12 * h2(k, 2, 9));
    x.beginPath();
    x.moveTo(icx + Math.cos(a) * r0, icy + Math.sin(a) * r0);
    x.lineTo(icx + Math.cos(a) * ir * 0.96, icy + Math.sin(a) * ir * 0.96);
    x.stroke();
  }
  x.strokeStyle = 'rgba(235,140,105,0.55)'; x.lineWidth = ir * 0.16;
  x.beginPath(); x.arc(icx, icy, ir * 0.8, 0.5, 2.64); x.stroke();
  x.restore();
  // limbal ring + pupil
  x.strokeStyle = '#2e1012'; x.lineWidth = ir * 0.1;
  x.beginPath(); x.arc(icx, icy, ir * 0.95, 0, TAU); x.stroke();
  g = x.createRadialGradient(icx, icy + ir * 0.05, ir * 0.08, icx, icy + ir * 0.05, ir * 0.44);
  g.addColorStop(0, '#160b0d'); g.addColorStop(0.8, '#1d0f11'); g.addColorStop(1, 'rgba(29,15,17,0)');
  x.fillStyle = g;
  x.beginPath(); x.ellipse(icx, icy + ir * 0.05, ir * 0.3, ir * 0.42, 0, 0, TAU); x.fill();
  // upper-lid shadow across the globe (determined: the lid bites into the iris)
  g = x.createLinearGradient(0, cy - h * 0.34, 0, cy - h * 0.02);
  g.addColorStop(0, 'rgba(34,12,18,0.55)'); g.addColorStop(1, 'rgba(34,12,18,0)');
  x.fillStyle = g; x.fillRect(cx - hw, cy - h * 0.4, hw * 2, h * 0.4);
  // warm lower-lid light
  g = x.createLinearGradient(0, cy + h * 0.1, 0, cy + h * 0.26);
  g.addColorStop(0, 'rgba(255,246,236,0)'); g.addColorStop(0.7, 'rgba(255,246,236,0.6)'); g.addColorStop(1, 'rgba(255,246,236,0.85)');
  x.fillStyle = g; x.fillRect(cx - hw, cy + h * 0.1, hw * 2, h * 0.2);
  // glints — key light upper-left
  x.fillStyle = 'rgba(255,255,255,0.35)';
  x.beginPath(); x.arc(icx - ir * 0.45, icy - ir * 0.5, ir * 0.3, 0, TAU); x.fill();
  x.fillStyle = '#ffffff';
  x.beginPath(); x.arc(icx - ir * 0.45, icy - ir * 0.52, ir * 0.2, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,224,214,0.9)';
  x.beginPath(); x.arc(icx + ir * 0.38, icy + ir * 0.42, ir * 0.09, 0, TAU); x.fill();
  x.restore();
  // lash mass — filled tapered shape, thick toward the outer corner
  x.fillStyle = '#170a12';
  x.beginPath();
  x.moveTo(I[0], I[1]);
  x.bezierCurveTo(u1[0], u1[1] - h * 0.02, u2[0], u2[1] - h * 0.075, O[0] - w * 0.004, O[1] - h * 0.028);
  x.lineTo(O[0] + w * 0.002, O[1] - h * 0.004);
  x.bezierCurveTo(u2[0], u2[1], u1[0], u1[1], I[0], I[1]);
  x.closePath(); x.fill();
  // outer lash spikes
  x.beginPath(); x.moveTo(O[0] - h * 0.012, O[1]); x.quadraticCurveTo(O[0] + w * 0.04, O[1] - h * 0.005, O[0] + w * 0.075, O[1] + h * 0.015); x.quadraticCurveTo(O[0] + w * 0.03, O[1] + h * 0.02, O[0] + h * 0.004, O[1] + h * 0.012); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(O[0] - w * 0.01, O[1] + h * 0.02); x.quadraticCurveTo(O[0] + w * 0.025, O[1] + h * 0.045, O[0] + w * 0.055, O[1] + h * 0.085); x.quadraticCurveTo(O[0] + w * 0.012, O[1] + h * 0.055, O[0] - w * 0.018, O[1] + h * 0.032); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(O[0] - w * 0.025, O[1] + h * 0.05); x.quadraticCurveTo(O[0] - w * 0.005, O[1] + h * 0.09, O[0] + w * 0.02, O[1] + h * 0.125); x.quadraticCurveTo(O[0] - w * 0.022, O[1] + h * 0.09, O[0] - w * 0.036, O[1] + h * 0.062); x.closePath(); x.fill();
  // sharp inner-corner accent + lower lid line
  x.strokeStyle = '#170a12'; x.lineWidth = Math.max(2, h * 0.006); x.lineCap = 'round';
  x.beginPath(); x.moveTo(I[0], I[1]); x.quadraticCurveTo(cx - hw * 0.8, cy + h * 0.075, cx - hw * 0.5, cy + h * 0.13); x.stroke();
  x.strokeStyle = 'rgba(74,32,40,0.9)'; x.lineWidth = Math.max(2, h * 0.005);
  x.beginPath(); x.moveTo(O[0], O[1] + h * 0.01); x.bezierCurveTo(l1[0], l1[1] + h * 0.012, l2[0], l2[1] + h * 0.012, I[0] + w * 0.02, I[1] + h * 0.012); x.stroke();
  // soft crease above the lash
  x.strokeStyle = 'rgba(190,140,132,0.5)'; x.lineWidth = Math.max(2, h * 0.012);
  x.beginPath(); x.moveTo(I[0] + w * 0.05, I[1] - h * 0.06); x.bezierCurveTo(u1[0], u1[1] - h * 0.075, u2[0], u2[1] - h * 0.12, O[0] - w * 0.03, O[1] - h * 0.07); x.stroke();
  return c;
}

// ---------- 13. "REMY BOYS" logo (1700×420 FULL-RES smooth) ----------
// Huge heavy Anton letters, metallic white→silver→steel vertical ramp with a chrome horizon
// band, thick dark-navy outline, 4-layer deep navy extrusion, and a bold crimson diagonal
// slash underline (a sword cut, with speed ticks) crossing behind/below the text.
export function logo(w, h) {
  const c = canvas(w, h), x = c.getContext('2d');
  const text = 'REMY BOYS';
  const pad = Math.round(w * 0.04);
  let size = 300;
  x.font = `900 ${size}px Anton`;
  let tw = x.measureText(text).width;
  if (tw > w - pad * 2) {
    size = Math.max(40, Math.floor((size * (w - pad * 2)) / tw));
    x.font = `900 ${size}px Anton`;
    tw = x.measureText(text).width;
  }
  const ty = Math.round(h / 2 + size * 0.36), tx = (w - tw) / 2;
  // crimson slash underline + speed ticks, drawn BEHIND the letters
  const sy0 = h * 0.88, sy1 = h * 0.6, sx0 = pad * 0.6, sx1 = w - pad * 0.6;
  const ang = Math.atan2(sy1 - sy0, sx1 - sx0), sl = Math.hypot(sx1 - sx0, sy1 - sy0);
  x.save();
  x.translate((sx0 + sx1) / 2, (sy0 + sy1) / 2); x.rotate(ang);
  const sg = x.createLinearGradient(-sl / 2, 0, sl / 2, 0);
  sg.addColorStop(0, '#7e1224'); sg.addColorStop(0.45, '#d42a3e'); sg.addColorStop(0.6, '#f0525e'); sg.addColorStop(1, '#8e1626');
  x.fillStyle = sg; x.fillRect(-sl / 2, -h * 0.045, sl, h * 0.09);
  x.fillStyle = 'rgba(255,150,160,0.85)'; x.fillRect(-sl / 2, -h * 0.045, sl, h * 0.008);
  x.fillStyle = 'rgba(200,32,52,0.8)';
  for (let k = 0; k < 3; k++) x.fillRect(-sl / 2 - 30 - k * 46, -h * 0.045 + k * h * 0.028, 120 - k * 26, h * 0.016);
  x.restore();
  // deep extrusion (4 offset dark-navy layers, deepest first)
  x.font = `900 ${size}px Anton`; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
  const ext = ['#0b0e1e', '#111631', '#171d3b', '#1f2749'];
  for (let k = ext.length; k >= 1; k--) { x.fillStyle = ext[k - 1]; x.fillText(text, tx + k * 5, ty + k * 5); }
  // thick dark-navy outline
  x.strokeStyle = '#141a36'; x.lineWidth = Math.max(8, size * 0.045); x.strokeText(text, tx, ty);
  // metallic face on its own layer so the chrome band stays inside the glyphs
  const tc = canvas(w, h), tcx = tc.getContext('2d');
  tcx.font = x.font; tcx.textAlign = 'left'; tcx.textBaseline = 'alphabetic';
  const tg = tcx.createLinearGradient(0, ty - size * 0.75, 0, ty + size * 0.05);
  tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.34, '#e9edf5'); tg.addColorStop(0.52, '#c2ccdc');
  tg.addColorStop(0.6, '#8a96b2'); tg.addColorStop(0.66, '#dfe6f0'); tg.addColorStop(0.82, '#9aa6c0'); tg.addColorStop(1, '#67718e');
  tcx.fillStyle = tg; tcx.fillText(text, tx, ty);
  tcx.globalCompositeOperation = 'source-atop';
  const band0 = ty - size * 0.52, band1 = ty - size * 0.38;
  const cg = tcx.createLinearGradient(0, band0, 0, band1);
  cg.addColorStop(0, '#3c4664'); cg.addColorStop(0.45, '#7e8ca8'); cg.addColorStop(0.55, '#f2f7ff'); cg.addColorStop(1, '#39435e');
  tcx.fillStyle = cg; tcx.fillRect(0, band0, w, band1 - band0);
  tcx.fillStyle = 'rgba(255,255,255,0.3)'; tcx.fillRect(0, ty - size * 0.75, w, size * 0.16);
  tcx.fillStyle = 'rgba(255,255,255,0.14)'; tcx.fillRect(0, ty - size * 0.16, w, size * 0.1);
  tcx.globalCompositeOperation = 'source-over';
  x.drawImage(tc, 0, 0);
  return c;
}

// ---------- 14. shine band (260×900 transparent, FULL-RES) ----------
// Soft white diagonal specular band, alpha 0 → 0.9 → 0 across, fading at both ends.
export function shine(w, h) {
  const c = canvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.28, 'rgba(255,255,255,0.45)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.72, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'destination-in';
  const v = x.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.25, 'rgba(0,0,0,1)');
  v.addColorStop(0.75, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = v; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'source-over';
  return c;
}

// ---------- 15. cut-in panel (STATELESS, draws into a full-res ctx every frame) ----------
// Anime cut-in: parallelogram clip (skew), cover-fit image, dark bottom gradient, seeded
// halftone dot screen in the lower third, 3px white border + 1px dark outer stroke, optional
// coloured glow. Fully deterministic from o.seed; never bakes.
export function cutPanel(ctx, img, x, y, w, h, o = {}) {
  const skew = o.skew ?? 26;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x + skew, y); ctx.lineTo(x + w + skew, y);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
    ctx.closePath();
  };
  ctx.save();
  if (o.glow) {
    ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur ?? 28;
    ctx.fillStyle = '#0c1020'; path(); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  }
  path(); ctx.clip();
  ctx.imageSmoothingEnabled = true;
  const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2 + skew * 0.5, y + (h - dh) / 2, dw, dh);
  const g = ctx.createLinearGradient(0, y + h * 0.35, 0, y + h);
  g.addColorStop(0, 'rgba(6,8,18,0)'); g.addColorStop(1, `rgba(6,8,18,${o.shade ?? 0.5})`);
  ctx.fillStyle = g; ctx.fillRect(x, y, w + skew + 2, h);
  // seeded halftone screen, lower third, denser toward the bottom
  const seed = o.seed ?? 7, y0 = y + h * 0.66, sp = 7;
  ctx.fillStyle = o.dots ?? 'rgba(255,255,255,0.4)';
  for (let ry = 0; y + ry * sp < y + h; ry++) {
    const yy = y + ry * sp;
    if (yy < y0) continue;
    const v = (yy - y) / h, xL = x + skew * (1 - v) + 2, xR = x + w + skew * (1 - v) - 2;
    const prog = clamp01((yy - y0) / (h * 0.34));
    for (let rx = 0, xx = xL + (ry & 1 ? sp / 2 : 0); xx < xR; rx++, xx += sp) {
      if (hash(rx * 131 + ry * 7 + seed * 1013) < 0.24) continue;
      ctx.globalAlpha = 0.16 + 0.3 * prog * (0.7 + 0.6 * hash(rx * 17 + ry * 31 + seed * 7));
      ctx.beginPath(); ctx.arc(xx, yy, 0.7 + 1.5 * prog, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (o.glow) {
    ctx.save();
    ctx.shadowColor = o.glow; ctx.shadowBlur = 18;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; path(); ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = '#10142a'; ctx.lineWidth = 5; path(); ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; path(); ctx.stroke();
}

// ---------- 16. sakura petal sprite (small, deterministic) ----------
// One petal canvas at the requested size: 2-tone pink with a darker edge, slight curl, and
// the sakura tip notch. film.js stamps it analytically.
export function petal(size, seed) {
  const s = Math.max(6, Math.round(size));
  const P = pixels(s, s);
  const rot = (hash(seed * 7 + 1) - 0.5) * 1.1, cos = Math.cos(rot), sin = Math.sin(rot);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const px = ((x + 0.5) / s) * 2 - 1, py = ((y + 0.5) / s) * 2 - 1;
      const rx = px * cos - py * sin, ry = px * sin + py * cos;
      const t = (ry + 0.78) / 1.62; // 0 base → 1 tip
      if (t < 0 || t > 1) continue;
      const curl = 0.09 * ry;
      const wdt = 0.66 * Math.pow(Math.sin(Math.min(1, t * 1.18) * Math.PI), 0.65) * (1 - t * 0.12) + 0.05;
      const ax = Math.abs(rx - curl);
      if (t > 0.86 && ax < wdt * 0.24) continue; // tip notch
      if (ax > wdt) continue;
      let c;
      if (ax > wdt * 0.8 || (t < 0.1 && ax > wdt * 0.5)) c = '#d8788e';
      else if (rx - curl > 0) c = '#fddce6';
      else c = t < 0.22 ? '#e89cb2' : '#f6b8ca';
      P.set(x, y, c);
    }
  return P.done();
}
