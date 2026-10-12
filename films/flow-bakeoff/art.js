// THE GREAT FLOW BAKE-OFF · art direction: warm daytime bake-off TV tent.
// Low canvas 1056×600 with a 960×540 view window at (48,30) — the margin absorbs
// camera pan/zoom/shake overscan. Everything is painted in low-canvas coords.
//
// Static art (sign lettering, banner letters, shelves, jars, stations, terrain)
// is baked once into canvases inside load(). Every animated painter below is a
// PURE function of its args + t: integer coords, no Math.random/Date.now, no
// accumulated state — seeded determinism via filmkit hash().
import { hash, lerp, seg, clamp } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js';
import { CAST, EV } from './timeline.js';

// ---------- palette (single coherent ramp set; light from upper right) ------
export const PAL = {
  ink: '#3a2e26',
  cream: '#f3ead8', creamHi: '#faf4e6', creamLo: '#e3d5ba', creamInk: '#c9b795',
  sage: '#9db89a', sageHi: '#bccfba', sageLo: '#7c9a79', sageInk: '#5d7a5b',
  blush: '#e8b7b0', blushHi: '#f5d2cc', blushLo: '#cf948c',
  butter: '#f2c744', butterHi: '#fae08a', butterLo: '#d19d18', butterInk: '#8a6410',
  wood: '#a8764f', woodHi: '#c79a6e', woodLo: '#8a5a3a', woodInk: '#5d3a24',
  steel: '#b9c0c7', steelHi: '#dde2e7', steelLo: '#8e979f', steelInk: '#5a636c',
};

// ---------- layout truth (low-canvas coords) --------------------------------
export const LW = 1056, LH = 600, VX = 48, VY = 30, VW = 960, VH = 540;
export const LAY = {
  stations: { moss: 180, hero: 460, gold: 700, tableTop: 470 },
  judgeTable: { x: 900, y: 470 },
  podium: { x: 640, y: 522 },
  ovenBank: { xs: [150, 240, 330], baseY: 405 },
  clock: { x: 528, y: 88, r: 30 },
  tentDoor: { x: 620, y: 380 },
  floorLine: 400,
};

// Face circles in the 600×600 originals (QA'd: these chibis are 3/4-turned
// right, so feature centres sit ~65px right of the skull silhouette centre).
export const PCROP = {
  452: { cx: 330, cy: 315, r: 150 },
  109: { cx: 320, cy: 330, r: 150 },
  30: { cx: 315, cy: 325, r: 150 },
  4: { cx: 320, cy: 325, r: 150 },
  24: { cx: 330, cy: 330, r: 150 },
};

// ---------- module cache: load() fills this once and re-returns it ----------
const ART = { ready: false };

// ---------- tiny deterministic helpers --------------------------------------
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);
const BAYER2 = [0, 2, 3, 1]; // sparse 2×2 dither for large surfaces
const rgb = (hx) => [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)];
const mix = (a, b, u) => `rgb(${Math.round(lerp(a[0], b[0], u))},${Math.round(lerp(a[1], b[1], u))},${Math.round(lerp(a[2], b[2], u))})`;
const smooth = (p) => p * p * (3 - 2 * p);

// Pixel buffer for baked art (local port of the remy-bros technique).
function pix(w, h) {
  w = Math.round(w); h = Math.round(h);
  const c = A.canvas(w, h), ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
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

// Blobby shaded shape (tree canopies, bushes) — nearest-circle membership,
// upper-right key light, ink outline. shades = [outline, shadow, base, light, highlight].
function blob(w, h, circles, shades, flatBottom = true) {
  w = Math.round(w); h = Math.round(h);
  const P = pix(w, h);
  const inside = (x, y) => {
    let best = -1;
    for (const [cx, cy, r] of circles) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < r && 1 - d / r > best) best = 1 - d / r;
    }
    return best;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const b = inside(x, y);
      if (b < 0) continue;
      let bestD = 2, bc = null;
      for (const c of circles) {
        const d = Math.hypot(x + 0.5 - c[0], y + 0.5 - c[1]) / c[2];
        if (d < bestD) { bestD = d; bc = c; }
      }
      const nx = (x + 0.5 - bc[0]) / bc[2], ny = (y + 0.5 - bc[1]) / bc[2];
      const l = -0.55 * nx - 0.8 * ny + (h2(x, y, 3) - 0.5) * 0.1;
      let col = l > 0.62 ? shades[4] : l > 0.2 ? shades[3] : l > -0.35 ? shades[2] : shades[1];
      const edge = inside(x - 1, y) < 0 || inside(x + 1, y) < 0 || inside(x, y - 1) < 0 || (!flatBottom && inside(x, y + 1) < 0);
      P.set(x, y, edge ? shades[0] : col);
    }
  return P.done();
}

function tree(seed, size) {
  const w = size * 2, h = Math.round(size * 2.4);
  const c = A.canvas(w, h), x = c.getContext('2d');
  const tw = Math.max(4, Math.round(size * 0.16));
  x.fillStyle = PAL.woodLo;
  x.fillRect(w / 2 - tw / 2 - 1, h - size * 1.1, tw + 2, size * 1.1);
  x.fillStyle = PAL.woodInk;
  x.fillRect(w / 2 - tw / 2 - 1, h - size * 1.1, 1, size * 1.1);
  x.fillRect(w / 2 + tw / 2, h - size * 1.1, 1, size * 1.1);
  const r = size * 0.62;
  const can = blob(w, Math.round(size * 1.6), [
    [w / 2 - r * 0.72, size * 0.95, r * 0.82],
    [w / 2 + r * 0.72, size * 0.95, r * 0.82],
    [w / 2, size * 0.6, r],
    [w / 2, size * 1.15, r * 0.9],
  ], [PAL.sageInk, '#5d8a52', '#79a566', '#94bd7d', '#b5d69a']);
  x.drawImage(can, 0, 0);
  return c;
}

// ---------- bake: tent-exterior base (static parts) -------------------------
// Two layers so drifting clouds/birds pass BEHIND the tent:
//   extBack — sky, sun, hills, green, path, trees
//   extTent — tent, doorway, sign, bunting, bushes (transparent elsewhere)
function bakeExteriorBack() {
  const c = A.canvas(LW, LH), x = c.getContext('2d');
  // sky — warm pale gradient, ordered Bayer 2×2 dither between bands
  const sky = [[0, rgb('#b9dde9')], [0.5, rgb('#d5e9e2')], [1, rgb('#f2e9cf')]];
  const bands = 12;
  for (let y = 0; y < 400; y += 1) {
    const v = y / 399;
    let k = 0;
    while (k < sky.length - 2 && v > sky[k + 1][0]) k++;
    const [pa, ca] = sky[k], [pb, cb] = sky[k + 1];
    const q = v * bands, b0 = Math.floor(q), f = q - b0;
    const pick = f * 4 > BAYER2[(y & 1) * 2 + (b0 & 1)] ? b0 + 1 : b0;
    const p = Math.min(1, pick / bands);
    const col = mix(ca, cb, clamp((p - pa) / (pb - pa), 0, 1));
    x.fillStyle = col;
    x.fillRect(0, y, LW, 1);
  }
  // sun, upper right — concentric flat rings + dithered halo
  const SX = 884, SY = 72;
  x.fillStyle = '#ffeeb0';
  x.beginPath(); x.arc(SX, SY, 40, 0, 7); x.fill();
  x.fillStyle = '#ffe9a0';
  for (let i = 0; i < 90; i++) {
    const a = h2(i, 1) * 6.283, r = 30 + h2(i, 2) * 12;
    x.fillRect(SX + Math.cos(a) * r, SY + Math.sin(a) * r, 2, 2);
  }
  x.fillStyle = '#fff6d8';
  x.beginPath(); x.arc(SX, SY, 24, 0, 7); x.fill();
  x.fillStyle = '#fffdf0';
  x.beginPath(); x.arc(SX - 6, SY - 6, 12, 0, 7); x.fill();
  // rolling hills — two ranges, per-column sine silhouettes + haze
  const hill = (base, a1, f1, p1, a2, f2, p2, col, colHi) => {
    for (let px = 0; px < LW; px++) {
      const top = Math.round(base - Math.sin(px * f1 + p1) * a1 - Math.sin(px * f2 + p2) * a2);
      x.fillStyle = col;
      x.fillRect(px, top, 1, 600 - top);
      x.fillStyle = colHi;
      x.fillRect(px, top, 1, 2);
    }
  };
  hill(272, 14, 0.008, 1.7, 8, 0.021, 0.4, '#aec89c', '#c2d8ae');
  hill(316, 16, 0.011, 4.2, 7, 0.027, 2.1, '#8fb583', '#a5c795');
  // village green — mow stripes + grass speckle
  for (let gy = 384; gy < LH; gy++) {
    const stripe = Math.floor((gy - 384) / 26) & 1;
    x.fillStyle = stripe ? '#96b984' : '#9cbf8a';
    x.fillRect(0, gy, LW, 1);
  }
  for (let i = 0; i < 340; i++) {
    const gx = Math.floor(h2(i, 5, 1) * LW), gy = 386 + Math.floor(h2(i, 6, 1) * (LH - 390));
    x.fillStyle = h2(i, 7, 1) > 0.5 ? '#87ab74' : '#b9d7a4';
    x.fillRect(gx, gy, 2, 1);
  }
  // dirt path — bottom-left curving to the tent door
  const pathPt = (u) => {
    const x0 = 40, y0 = LH + 10, cx1 = 260, cy1 = 520, cx2 = 470, cy2 = 486, x1 = LAY.tentDoor.x, y1 = 462;
    const t = u, mt = 1 - t;
    return [
      mt * mt * mt * x0 + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * x1,
      mt * mt * mt * y0 + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * y1,
    ];
  };
  for (let u = 0; u <= 1; u += 0.008) {
    const [px, py] = pathPt(u);
    const wdt = lerp(58, 36, u);
    x.fillStyle = '#d8b078';
    x.fillRect(Math.round(px - wdt / 2), Math.round(py - 2), Math.round(wdt), 5);
    x.fillStyle = '#b98f5c';
    x.fillRect(Math.round(px - wdt / 2), Math.round(py + 2), Math.round(wdt), 2);
    if (h2(Math.floor(u * 130), 9) > 0.82) {
      x.fillStyle = '#c49f66';
      x.fillRect(Math.round(px - wdt / 2 + 4 + h2(Math.floor(u * 130), 10) * (wdt - 10)), Math.round(py - 1), 3, 2);
    }
  }
  // small distant tree right of the tent, two big trees at the flanks
  x.drawImage(tree(11, 52), 806, 330 - 52 * 2.4 + 44);
  x.drawImage(tree(3, 62), 108 - 62, 470 - Math.round(62 * 2.4));
  x.drawImage(tree(7, 52), 952 - 52, 466 - Math.round(52 * 2.4));
  // bunting poles flanking the tent
  x.fillStyle = PAL.woodLo;
  x.fillRect(148, 322, 6, 178);
  x.fillRect(918, 316, 6, 184);
  x.fillStyle = PAL.woodInk;
  x.fillRect(148, 322, 1, 178);
  x.fillRect(918, 316, 1, 184);
  x.fillStyle = PAL.woodHi;
  x.fillRect(152, 322, 1, 178);
  x.fillRect(922, 316, 1, 184);
  x.fillStyle = PAL.butter;
  x.fillRect(146, 316, 10, 7);
  x.fillRect(916, 310, 10, 7);
  x.fillStyle = PAL.butterInk;
  x.fillRect(146, 322, 10, 1);
  x.fillRect(916, 316, 10, 1);
  return c;
}

function bakeExteriorTent() {
  const c = A.canvas(LW, LH), x = c.getContext('2d');
  // bushes at the tent base corners
  x.drawImage(blob(70, 36, [[18, 24, 14], [38, 22, 16], [56, 25, 13]], [PAL.sageInk, '#5d8a52', '#79a566', '#94bd7d', '#b5d69a']), 340, 436);
  x.drawImage(blob(64, 34, [[16, 23, 13], [34, 21, 15], [50, 24, 12]], [PAL.sageInk, '#5d8a52', '#79a566', '#94bd7d', '#b5d69a']), 672, 438);
  // --- the big striped tent, centred on 528 ---
  // roof overhangs the wall: apex 138 → roof eave 264 (hw 152) → wall 264..462
  const apex = [528, 138], eaveY = 264, eaveHW = 152, wallHW = 112, baseY = 462, baseHW = 130;
  // ground shadow
  x.fillStyle = '#5d7a4e';
  x.fillRect(528 - baseHW - 6, baseY - 4, 2 * baseHW + 12, 8);
  x.fillStyle = '#4c6640';
  x.fillRect(528 - baseHW - 6, baseY + 2, 2 * baseHW + 12, 4);
  // wall stripes (8 segments, alternate cream / blush, slight outward flare)
  for (let i = 0; i < 8; i++) {
    const e0 = 528 - wallHW + (2 * wallHW) * (i / 8), e1 = 528 - wallHW + (2 * wallHW) * ((i + 1) / 8);
    const b0 = 528 - baseHW + (2 * baseHW) * (i / 8), b1 = 528 - baseHW + (2 * baseHW) * ((i + 1) / 8);
    x.fillStyle = i & 1 ? PAL.blush : '#f6efe0';
    x.beginPath();
    x.moveTo(Math.round(e0), eaveY); x.lineTo(Math.round(e1), eaveY);
    x.lineTo(Math.round(b1), baseY); x.lineTo(Math.round(b0), baseY);
    x.closePath(); x.fill();
    x.fillStyle = i & 1 ? PAL.blushLo : PAL.creamLo;
    x.fillRect(Math.round(b1) - 2, eaveY, 2, baseY - eaveY);
    x.fillStyle = PAL.ink;
    x.fillRect(Math.round(e0), eaveY, 1, baseY - eaveY);
  }
  x.fillStyle = PAL.ink;
  x.fillRect(528 - baseHW - 1, eaveY, 1, baseY - eaveY);
  x.fillRect(528 + baseHW, eaveY, 1, baseY - eaveY);
  // roof cone (overhanging eave, slanted ink seams from the apex)
  for (let i = 0; i < 8; i++) {
    const e0 = 528 - eaveHW + (2 * eaveHW) * (i / 8), e1 = 528 - eaveHW + (2 * eaveHW) * ((i + 1) / 8);
    x.fillStyle = i & 1 ? PAL.blush : '#f6efe0';
    x.beginPath();
    x.moveTo(apex[0], apex[1]); x.lineTo(Math.round(e0), eaveY); x.lineTo(Math.round(e1), eaveY);
    x.closePath(); x.fill();
  }
  x.strokeStyle = PAL.ink; x.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const e0 = 528 - eaveHW + (2 * eaveHW) * (i / 8);
    x.beginPath(); x.moveTo(apex[0], apex[1] + 3); x.lineTo(Math.round(e0), eaveY - 1); x.stroke();
  }
  x.fillStyle = PAL.ink;
  x.beginPath();
  x.moveTo(apex[0], apex[1]); x.lineTo(528 - eaveHW - 1, eaveY); x.lineTo(528 - eaveHW - 1, eaveY + 2);
  x.lineTo(apex[0], apex[1] + 3); x.closePath(); x.fill();
  x.beginPath();
  x.moveTo(apex[0], apex[1]); x.lineTo(528 + eaveHW + 1, eaveY); x.lineTo(528 + eaveHW + 1, eaveY + 2);
  x.lineTo(apex[0], apex[1] + 3); x.closePath(); x.fill();
  // roof shadow cast on the wall top
  x.fillStyle = 'rgba(58,46,38,0.16)';
  x.fillRect(528 - wallHW, eaveY, 2 * wallHW, 10);
  // scalloped valance hanging from the roof edge
  for (let i = 0; i < 12; i++) {
    const sx = Math.round(528 - eaveHW + 13 + i * ((2 * eaveHW - 26) / 11));
    x.fillStyle = i & 1 ? PAL.sage : PAL.blush;
    x.beginPath(); x.arc(sx, eaveY + 1, 12, 0, Math.PI); x.fill();
    x.strokeStyle = PAL.ink; x.lineWidth = 1.6;
    x.beginPath(); x.arc(sx, eaveY + 1, 12, 0.12, Math.PI - 0.12); x.stroke();
  }
  // peak flag
  x.fillStyle = PAL.ink;
  x.fillRect(527, 106, 2, 34);
  x.fillStyle = PAL.butter;
  x.beginPath(); x.moveTo(529, 108); x.lineTo(557, 114); x.lineTo(529, 122); x.closePath(); x.fill();
  x.strokeStyle = PAL.butterInk; x.lineWidth = 1; x.stroke();
  // guy ropes to ground stakes
  x.strokeStyle = 'rgba(58,46,38,0.7)'; x.lineWidth = 1;
  x.beginPath(); x.moveTo(528 - eaveHW, eaveY); x.lineTo(318, 470); x.stroke();
  x.beginPath(); x.moveTo(528 + eaveHW, eaveY); x.lineTo(738, 470); x.stroke();
  x.fillStyle = PAL.woodInk;
  x.fillRect(316, 468, 3, 6); x.fillRect(737, 468, 3, 6);
  // dark open doorway at LAY.tentDoor
  const dx = LAY.tentDoor.x;
  x.fillStyle = '#241812';
  x.beginPath();
  x.moveTo(dx - 26, baseY); x.lineTo(dx - 26, LAY.tentDoor.y + 12);
  x.quadraticCurveTo(dx, LAY.tentDoor.y - 4, dx + 26, LAY.tentDoor.y + 12);
  x.lineTo(dx + 26, baseY); x.closePath(); x.fill();
  x.strokeStyle = PAL.ink; x.lineWidth = 2; x.stroke();
  x.fillStyle = '#4a2c18';
  x.fillRect(dx - 5, baseY - 10, 10, 10); // warm interior sliver at the threshold
  // rolled flap edges
  x.fillStyle = PAL.blushLo;
  x.fillRect(dx - 29, LAY.tentDoor.y + 14, 4, baseY - LAY.tentDoor.y - 14);
  x.fillRect(dx + 25, LAY.tentDoor.y + 14, 4, baseY - LAY.tentDoor.y - 14);
  // hand-painted sign on an easel, left of the door
  x.strokeStyle = PAL.woodLo; x.lineWidth = 5;
  x.beginPath(); x.moveTo(444, 470); x.lineTo(470, 396); x.stroke();
  x.beginPath(); x.moveTo(496, 470); x.lineTo(470, 396); x.stroke();
  x.beginPath(); x.moveTo(470, 412); x.lineTo(470, 470); x.stroke();
  x.drawImage(ART.sign, 470 - ART.sign.width / 2, 384 - ART.sign.height / 2 + 8);
  // bunting from the trees to the tent eave
  const swag = (x0, y0, x1, y1, sag, seed) => {
    const steps = Math.floor((x1 - x0) / 30);
    x.strokeStyle = 'rgba(58,46,38,0.85)'; x.lineWidth = 1.5;
    x.beginPath();
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, sx = lerp(x0, x1, u), sy = lerp(y0, y1, u) + Math.sin(u * Math.PI) * sag;
      i ? x.lineTo(sx, sy) : x.moveTo(sx, sy);
    }
    x.stroke();
    const cols = [PAL.blush, PAL.butter, PAL.sage];
    for (let i = 0; i < steps; i++) {
      const u = (i + 0.5) / steps, fx = lerp(x0, x1, u), fy = lerp(y0, y1, u) + Math.sin(u * Math.PI) * sag;
      const col = cols[Math.floor(h2(i, seed) * 3)];
      x.fillStyle = col;
      x.beginPath(); x.moveTo(fx - 7, fy); x.lineTo(fx + 7, fy); x.lineTo(fx, fy + 16); x.closePath(); x.fill();
      x.strokeStyle = PAL.ink; x.lineWidth = 1; x.stroke();
    }
  };
  swag(151, 326, 384, 272, 24, 1);
  swag(672, 272, 921, 318, 24, 2);
  return c;
}

// ---------- bake: the painted sign board ------------------------------------
function bakeSign() {
  const w = 168, hh = 74, c = A.canvas(w, hh), x = c.getContext('2d');
  x.fillStyle = '#f8f0dd';
  x.fillRect(2, 2, w - 4, hh - 4);
  x.strokeStyle = PAL.ink; x.lineWidth = 2; x.strokeRect(2, 2, w - 4, hh - 4);
  x.strokeStyle = PAL.sageLo; x.lineWidth = 3; x.strokeRect(6, 6, w - 12, hh - 12);
  x.fillStyle = PAL.ink;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '700 19px "Pixelify Sans", monospace';
  x.fillText('THE GREAT FLOW', w / 2, 27);
  x.font = '700 27px "Pixelify Sans", monospace';
  x.fillStyle = PAL.butter;
  x.fillText('BAKE-OFF', w / 2 + 2, 55);
  x.fillStyle = PAL.ink;
  x.fillText('BAKE-OFF', w / 2, 53);
  // little butter star, corner flourish
  x.fillStyle = PAL.butter;
  const cx0 = 18, cy0 = 18;
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4;
    x.fillRect(Math.round(cx0 + Math.cos(a) * 6) - 1, Math.round(cy0 + Math.sin(a) * 6) - 1, 3, 3);
  }
  x.fillRect(cx0 - 1, cy0 - 1, 3, 3);
  return c;
}

// ---------- bake: tent-interior base (static parts, dusk-neutral) -----------
function bakeInterior() {
  const c = A.canvas(LW, LH), x = c.getContext('2d');
  // cream canvas walls + subtle vertical seam stripes
  x.fillStyle = PAL.cream;
  x.fillRect(0, 0, LW, LAY.floorLine);
  for (let sx = 0; sx <= LW; sx += 72) {
    x.fillStyle = '#e9dcc0';
    x.fillRect(sx, 0, 2, LAY.floorLine);
    x.fillStyle = '#f9f2e2';
    x.fillRect(sx + 2, 0, 1, LAY.floorLine);
  }
  x.fillStyle = '#e4d6b8';
  x.fillRect(0, 0, LW, 12); // top shadow band
  // sparse fabric speckle
  for (let i = 0; i < 260; i++) {
    const px = Math.floor(h2(i, 21) * LW), py = Math.floor(h2(i, 22) * (LAY.floorLine - 20));
    x.fillStyle = h2(i, 23) > 0.5 ? 'rgba(201,183,149,0.35)' : 'rgba(255,255,255,0.3)';
    x.fillRect(px, py, 1, 1);
  }
  // tie-back drapes at both edges (gathered at mid height)
  for (const side of [0, 1]) {
    const edge = side ? LW : 0, dir = side ? -1 : 1;
    for (let i = 0; i < 5; i++) {
      const fx = edge + dir * (6 + i * 9);
      x.fillStyle = i & 1 ? '#dccfb2' : '#e9ddc2';
      const bulge = 14 * Math.exp(-Math.abs(i - 2) * 0.55);
      x.fillRect(Math.round(fx - bulge / 2), 12, Math.round(6 + bulge), 356);
    }
    x.strokeStyle = '#b58a4e'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(edge + dir * 4, 246); x.lineTo(edge + dir * 48, 252); x.stroke();
    x.fillStyle = PAL.ink;
    x.fillRect(edge + dir * 46, 249, dir * 4, 6);
  }
  // two rows of bunting, flags baked straight (no per-frame sway)
  const row = (y0, swags, seed) => {
    const seg2 = VW / swags;
    x.strokeStyle = 'rgba(58,46,38,0.8)'; x.lineWidth = 1.5;
    for (let sgm = 0; sgm < swags; sgm++) {
      const x0 = VX + sgm * seg2, x1 = x0 + seg2;
      x.beginPath();
      for (let i = 0; i <= 16; i++) {
        const u = i / 16, sx = lerp(x0, x1, u), sy = y0 + Math.sin(u * Math.PI) * 16;
        i ? x.lineTo(sx, sy) : x.moveTo(sx, sy);
      }
      x.stroke();
      const cols = [PAL.blush, PAL.butter, PAL.sage];
      const n = Math.floor(seg2 / 34);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, fx = lerp(x0, x1, u), fy = y0 + Math.sin(u * Math.PI) * 16;
        x.fillStyle = cols[Math.floor(h2(i + sgm * 7, seed) * 3)];
        x.beginPath(); x.moveTo(fx - 8, fy); x.lineTo(fx + 8, fy); x.lineTo(fx, fy + 18); x.closePath(); x.fill();
        x.strokeStyle = PAL.ink; x.lineWidth = 1; x.stroke();
      }
    }
  };
  row(38, 3, 4);
  row(70, 4, 5);
  // round windows at x 380 and 700 — wood rim + mullions (glass filled per frame)
  for (const wx of [380, 700]) {
    x.fillStyle = PAL.woodInk;
    x.beginPath(); x.arc(wx, 170, 51, 0, 7); x.fill();
    x.fillStyle = PAL.woodLo;
    x.beginPath(); x.arc(wx, 170, 47, 0, 7); x.fill();
    x.fillStyle = PAL.woodHi;
    x.beginPath(); x.arc(wx - 2, 168, 45, Math.PI * 0.9, Math.PI * 1.65); x.lineWidth = 3; x.strokeStyle = PAL.woodHi; x.stroke();
    x.fillStyle = '#2f2820';
    x.beginPath(); x.arc(wx, 170, 41, 0, 7); x.fill();
    x.fillStyle = PAL.woodLo;
    x.fillRect(wx - 3, 126, 6, 88);
    x.fillRect(wx - 44, 167, 88, 6);
    x.fillStyle = PAL.ink;
    x.fillRect(wx - 3, 126, 1, 88); x.fillRect(wx - 44, 167, 88, 1);
    // sill + light catch on the rim
    x.fillStyle = PAL.woodHi;
    x.fillRect(wx - 22, 216, 44, 4);
  }
  // shelves with labelled jars between the windows
  x.drawImage(bakeShelves(), 452, 196);
  // --- floor: perspective planks ---
  x.fillStyle = PAL.wood;
  x.fillRect(0, LAY.floorLine, LW, LH - LAY.floorLine);
  const vpX = 528;
  for (let k = -9; k <= 9; k++) {
    const x0 = vpX + k * 38, x1 = vpX + k * 132;
    x.strokeStyle = '#6b4527'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(x0, LAY.floorLine); x.lineTo(x1, LH); x.stroke();
    x.strokeStyle = 'rgba(199,154,110,0.5)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(x0 + 2, LAY.floorLine); x.lineTo(x1 + 2, LH); x.stroke();
  }
  let fy = LAY.floorLine, rowN = 0;
  const rows = [434, 474, 522, 574];
  for (const ry of rows) {
    x.fillStyle = rowN & 1 ? 'rgba(138,90,58,0.35)' : 'rgba(199,154,110,0.25)';
    x.fillRect(0, fy, LW, ry - fy);
    x.fillStyle = '#5d3a24';
    x.fillRect(0, ry, LW, 2);
    x.fillStyle = '#c29468';
    x.fillRect(0, ry + 2, LW, 1);
    fy = ry + 3; rowN++;
  }
  // baseboard where wall meets floor
  x.fillStyle = PAL.woodLo;
  x.fillRect(0, LAY.floorLine - 8, LW, 8);
  x.fillStyle = PAL.ink;
  x.fillRect(0, LAY.floorLine - 9, LW, 2);
  x.fillStyle = PAL.woodHi;
  x.fillRect(0, LAY.floorLine - 2, LW, 1);
  // wood speckle
  for (let i = 0; i < 200; i++) {
    const px = Math.floor(h2(i, 31) * LW), py = LAY.floorLine + 6 + Math.floor(h2(i, 32) * (LH - LAY.floorLine - 10));
    x.fillStyle = h2(i, 33) > 0.5 ? 'rgba(93,58,36,0.4)' : 'rgba(199,154,110,0.4)';
    x.fillRect(px, py, 2, 1);
  }
  // scattered flour dust motes near the work area (static bake, subtle)
  for (let i = 0; i < 15; i++) {
    const px = 130 + Math.floor(h2(i, 41) * 660), py = 436 + Math.floor(h2(i, 42) * 128);
    const r = 1.5 + h2(i, 43) * 2.4;
    x.fillStyle = 'rgba(250,244,230,0.20)';
    x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    x.fillStyle = 'rgba(250,244,230,0.38)';
    x.fillRect(px - 1, py - 1, 2, 1);
  }
  return c;
}

// jars: butter / sugar / flour silhouettes with little labels
function bakeShelves() {
  const c = A.canvas(180, 130), x = c.getContext('2d');
  const shelf = (sy) => {
    x.fillStyle = PAL.woodInk; x.fillRect(0, sy + 10, 180, 3);
    x.fillStyle = PAL.wood; x.fillRect(0, sy, 180, 10);
    x.fillStyle = PAL.woodHi; x.fillRect(0, sy, 180, 2);
    x.fillStyle = PAL.woodLo; x.fillRect(0, sy + 7, 180, 2);
    x.fillStyle = PAL.woodInk;
    x.fillRect(22, sy + 13, 4, 7); x.fillRect(154, sy + 13, 4, 7);
  };
  shelf(56); shelf(124);
  // butter crock (round, butter colour, cloth top)
  x.fillStyle = PAL.butterInk; x.beginPath(); x.arc(30, 44, 14, 0, 7); x.fill();
  x.fillStyle = PAL.butter; x.beginPath(); x.arc(30, 44, 12, 0, 7); x.fill();
  x.fillStyle = PAL.butterHi; x.beginPath(); x.arc(34, 40, 5, 0, 7); x.fill();
  x.fillStyle = PAL.creamHi; x.fillRect(21, 32, 18, 6);
  x.fillStyle = PAL.blushLo; x.fillRect(21, 36, 18, 2);
  // sugar jar (tall glass, white fill, label)
  x.fillStyle = PAL.steelInk; x.fillRect(58, 20, 22, 36);
  x.fillStyle = '#dfe4e8'; x.fillRect(60, 22, 18, 32);
  x.fillStyle = '#f7f8fa'; x.fillRect(61, 30, 16, 22);
  x.fillStyle = PAL.cream; x.fillRect(64, 34, 10, 8);
  x.fillStyle = PAL.woodInk; x.fillRect(64, 37, 10, 1); x.fillRect(64, 40, 7, 1);
  x.fillStyle = PAL.steelHi; x.fillRect(60, 22, 3, 32);
  // honey pot between
  x.fillStyle = PAL.butterInk; x.beginPath(); x.arc(106, 46, 10, 0, 7); x.fill();
  x.fillStyle = PAL.butterLo; x.beginPath(); x.arc(106, 46, 8, 0, 7); x.fill();
  x.fillStyle = PAL.butter; x.fillRect(99, 38, 14, 4);
  // flour sack on the lower shelf
  x.fillStyle = PAL.creamInk;
  x.beginPath();
  x.moveTo(52, 124); x.lineTo(48, 96); x.quadraticCurveTo(60, 88, 72, 90);
  x.lineTo(88, 92); x.quadraticCurveTo(98, 96, 96, 124);
  x.closePath(); x.fill();
  x.fillStyle = PAL.cream;
  x.beginPath();
  x.moveTo(54, 124); x.lineTo(50, 97); x.quadraticCurveTo(61, 90, 72, 92);
  x.lineTo(86, 94); x.quadraticCurveTo(95, 97, 93, 124);
  x.closePath(); x.fill();
  x.fillStyle = PAL.creamHi; x.fillRect(56, 90, 20, 5);
  x.fillStyle = PAL.sageLo; x.fillRect(60, 104, 26, 10);
  x.fillStyle = PAL.creamHi; x.fillRect(63, 107, 20, 1); x.fillRect(63, 110, 14, 1);
  // spare small jar, lower shelf right
  x.fillStyle = PAL.steelInk; x.fillRect(122, 102, 18, 22);
  x.fillStyle = '#dfe4e8'; x.fillRect(124, 104, 14, 18);
  x.fillStyle = PAL.blush; x.fillRect(125, 110, 12, 8);
  x.fillStyle = PAL.cream; x.fillRect(127, 112, 8, 1);
  return c;
}

// ---------- bake: "STAR BAKER" banner (letters crisp, 46px at 1x) -----------
function bakeBanner() {
  const w = VW, hh = 96, c = A.canvas(w, hh), x = c.getContext('2d');
  // ropes + top hem
  x.fillStyle = PAL.woodLo;
  x.fillRect(46, 0, 5, 14); x.fillRect(w - 51, 0, 5, 14);
  x.fillStyle = PAL.cream;
  x.fillRect(0, 8, w, hh - 8);
  // scalloped bottom edge
  for (let i = 0; i < 16; i++) {
    x.beginPath(); x.arc(30 + i * 60, hh - 2, 30, 0, Math.PI); x.fill();
  }
  x.strokeStyle = PAL.ink; x.lineWidth = 2;
  x.strokeRect(1, 9, w - 2, hh - 12);
  for (let i = 0; i < 16; i++) {
    x.beginPath(); x.arc(30 + i * 60, hh - 2, 30, 0.15, Math.PI - 0.15); x.stroke();
  }
  x.strokeStyle = PAL.sageLo; x.lineWidth = 5;
  x.strokeRect(6, 14, w - 12, hh - 22);
  // corner butter triangles
  x.fillStyle = PAL.butter;
  for (const [tx, ty, s] of [[1, 9, 1], [w - 1, 9, -1]]) {
    x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx + 26 * s, ty); x.lineTo(tx, ty + 26); x.closePath(); x.fill();
    x.strokeStyle = PAL.ink; x.lineWidth = 1; x.stroke();
  }
  // letters — Pixelify Sans bold, ink with a butter drop shadow
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '700 46px "Pixelify Sans", monospace';
  x.fillStyle = PAL.butter;
  x.fillText('STAR BAKER', w / 2 + 3, hh / 2 + 7);
  x.fillStyle = PAL.ink;
  x.fillText('STAR BAKER', w / 2, hh / 2 + 4);
  return c;
}

// ---------- bake: static work stations (one canvas per baker) ---------------
function bakeStation(who) {
  const cast = CAST[who] || { hair: '#c9b795' };
  const c = A.canvas(150, 100), x = c.getContext('2d');
  x.translate(75, 64); // origin = table-top surface centre (low-canvas y 470)
  // floor shadow
  x.fillStyle = 'rgba(58,46,38,0.22)';
  x.beginPath(); x.ellipse(0, 88, 74, 6, 0, 0, 7); x.fill();
  // steel legs + cross brace
  x.fillStyle = PAL.steelInk;
  x.fillRect(-58, 8, 6, 82); x.fillRect(52, 8, 6, 82);
  x.fillStyle = PAL.steel;
  x.fillRect(-58, 8, 3, 82); x.fillRect(52, 8, 3, 82);
  x.fillStyle = PAL.steelLo;
  x.fillRect(-46, 52, 92, 4);
  x.fillStyle = PAL.steelInk;
  x.fillRect(-46, 55, 92, 1);
  // apron hanging on the front (trim = baker's hair colour)
  x.fillStyle = PAL.ink;
  x.fillRect(-21, 8, 42, 62);
  x.fillStyle = '#f6efe0';
  x.fillRect(-19, 10, 38, 58);
  x.fillStyle = '#e6dac0';
  x.fillRect(-19, 10, 4, 58);
  x.fillStyle = cast.hair;
  x.fillRect(-19, 62, 38, 4);
  x.fillRect(-9, 10, 18, 3);
  x.fillStyle = '#e6dac0';
  x.fillRect(-12, 34, 24, 14);
  x.strokeStyle = cast.hair; x.lineWidth = 1.5;
  x.strokeRect(-12, 34, 24, 14);
  // table top: wooden slab, top face y 0..4 in local coords
  x.fillStyle = PAL.ink;
  x.fillRect(-72, -7, 144, 16);
  x.fillStyle = PAL.woodHi;
  x.fillRect(-70, -6, 140, 4);
  x.fillStyle = PAL.wood;
  x.fillRect(-70, -2, 140, 9);
  x.fillStyle = PAL.woodLo;
  x.fillRect(-70, 5, 140, 2);
  x.fillStyle = 'rgba(93,58,36,0.5)';
  x.fillRect(-58, 0, 34, 1); x.fillRect(12, 2, 40, 1);
  // mixing bowl (steel) on the left
  x.fillStyle = PAL.steelInk;
  x.beginPath(); x.ellipse(-44, -4, 19, 8, 0, 0, Math.PI); x.fill();
  x.fillStyle = PAL.steel;
  x.beginPath(); x.moveTo(-63, -4); x.quadraticCurveTo(-60, 10, -44, 10);
  x.quadraticCurveTo(-28, 10, -25, -4); x.closePath(); x.fill();
  x.fillStyle = PAL.steelHi;
  x.beginPath(); x.ellipse(-44, -4, 16, 5, 0, Math.PI, 0); x.fill();
  x.fillStyle = PAL.creamHi;
  x.beginPath(); x.ellipse(-44, -4, 12, 3.4, 0, Math.PI, 0); x.fill();
  x.fillStyle = PAL.steelInk;
  x.save(); x.translate(-38, -12); x.rotate(0.5); x.fillRect(-1.5, 0, 3, 16); x.restore();
  // ingredient jars on the right
  x.fillStyle = PAL.steelInk; x.fillRect(26, -16, 13, 16);
  x.fillStyle = PAL.butter; x.fillRect(27, -11, 11, 10);
  x.fillStyle = PAL.butterHi; x.fillRect(28, -15, 6, 4);
  x.fillStyle = PAL.steelInk; x.fillRect(45, -13, 11, 13);
  x.fillStyle = '#f7f8fa'; x.fillRect(46, -9, 9, 8);
  x.fillStyle = PAL.creamInk; x.fillRect(47, -6, 7, 2);
  // small resting pin, front-centre
  x.fillStyle = PAL.woodHi; x.fillRect(-12, -1, 22, 4);
  x.fillStyle = PAL.woodLo; x.fillRect(-12, 2, 22, 1);
  x.fillStyle = PAL.woodInk; x.fillRect(-15, -1, 3, 4); x.fillRect(10, -1, 3, 4);
  return c;
}

// ---------- prepare-time portraits + the judge's subtle smile ---------------
async function portrait(id) {
  const img = new Image();
  img.src = new URL(`../../media/remy/Character${id}.webp`, import.meta.url).href;
  await img.decode();
  return img;
}

// Lift the judge's mouth corners by ~2px on a COPY: find the mouth stroke
// (darkest short run in the low-centre face band), erase it with sampled skin,
// repaint the same polyline with a parabolic corner lift. Subtle, not a grin.
function buildPortraitSmile(img) {
  const c = A.canvas(600, 600), g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const im = g.getImageData(0, 0, 600, 600), d = im.data;
  const lum = (i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const idx = (x, y) => (y * 600 + x) * 4;
  // mouth band (verified against the original: stroke ≈ x 328..354, y 368..377)
  const X0 = 314, X1 = 372, Y0 = 358, Y1 = 386;
  const cols = [];
  for (let x = X0; x <= X1; x++) {
    let by = -1, bv = 1e9;
    for (let y = Y0; y <= Y1; y++) {
      const v = lum(idx(x, y));
      if (v < bv) { bv = v; by = y; }
    }
    cols.push([x, by, bv]);
  }
  // longest contiguous dark run = the mouth
  let bestA = 0, bestB = -1, runA = -1;
  for (let i = 0; i <= cols.length; i++) {
    const dark = i < cols.length && cols[i][2] < 108;
    if (dark && runA < 0) runA = i;
    if ((!dark || i === cols.length) && runA >= 0) {
      if (i - runA > bestB - bestA) { bestA = runA; bestB = i; }
      runA = -1;
    }
  }
  if (bestB - bestA < 8) return c; // mouth not found — return untouched copy
  const pts = cols.slice(bestA, bestB);
  // smooth the polyline (3-tap)
  const ys = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    return (a[1] + p[1] + b[1]) / 3;
  });
  // extend the working span by 3 columns each side (catch stroke fringes)
  for (let k = 1; k <= 3; k++) {
    pts.unshift([pts[0][0] - 1, ys[0] ?? pts[0][1], 255]);
    ys.unshift(ys[0]);
    pts.push([pts[pts.length - 1][0] + 1, ys[ys.length - 1] ?? pts[pts.length - 1][1], 255]);
    ys.push(ys[ys.length - 1]);
  }
  const cxm = (pts[0][0] + pts[pts.length - 1][0]) / 2;
  const half = (pts[pts.length - 1][0] - pts[0][0]) / 2;
  const darkest = pts.reduce((m, p) => (p[2] < m[2] ? p : m), pts[0]);
  const ink = [d[idx(darkest[0], darkest[1])], d[idx(darkest[0], darkest[1]) + 1], d[idx(darkest[0], darkest[1]) + 2]];
  // erase the old mouth (±2px around the stroke) with skin sampled just above
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0], y = Math.round(ys[i]);
    const sk = idx(x, Math.max(0, y - 5));
    for (let dy = -3; dy <= 3; dy++) {
      const j = idx(x, y + dy);
      if (Math.abs(dy) <= 2) {
        d[j] = d[sk]; d[j + 1] = d[sk + 1]; d[j + 2] = d[sk + 2];
      }
    }
  }
  // repaint with corners lifted ~2.5px (parabola: 0 at centre, max at corners)
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0];
    const u = Math.abs(x - cxm) / half;
    const y = Math.round(ys[i] - 2.5 * u * u - 0.4 * u); // corners up, slight overall ease
    for (let dy = 0; dy <= 1; dy++) {
      const j = idx(x, y + dy);
      d[j] = ink[0]; d[j + 1] = ink[1]; d[j + 2] = ink[2];
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}

// ---------- load(): decode + bake everything once ----------------------------
export async function load() {
  if (ART.ready) return ART;
  try {
    await Promise.all([
      document.fonts.load('700 27px "Pixelify Sans"'),
      document.fonts.load('700 46px "Pixelify Sans"'),
      document.fonts.load('700 19px "Pixelify Sans"'),
    ]);
  } catch { /* fall back to monospace */ }
  ART.sign = bakeSign();
  ART.extBack = bakeExteriorBack();
  ART.extTent = bakeExteriorTent();
  ART.intBase = bakeInterior();
  ART.banner = bakeBanner();
  ART.stations = { moss: bakeStation('moss'), hero: bakeStation('hero'), gold: bakeStation('gold') };
  ART.cloudA = A.cloud(4, 130);
  ART.cloudB = A.cloud(9, 96);
  ART.rig = {};
  for (const key of Object.keys(CAST)) ART.rig[key] = await A.loadRemy(CAST[key].id, false);
  ART.heads = await A.loadHeads();
  ART.portrait = {};
  for (const id of [109, 4, 24, 452, 30]) ART.portrait[id] = await portrait(id);
  ART.portraitSmile = buildPortraitSmile(ART.portrait[452]);
  ART.ready = true;
  return ART;
}

// shared state reset (painters are pure; defensive against caller leakage)
function fresh(x) {
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  return x;
}

// ===========================================================================
// PER-FRAME PAINTERS — pure functions of args + t, integer coords
// ===========================================================================

// ---- exterior: FULL low-canvas repaint, no actors --------------------------
export function drawExterior(x, t) {
  fresh(x);
  x.drawImage(ART.extBack, 0, 0);
  // two drifting clouds, behind the tent
  const ax = Math.round((((t * 11 + 200) % (LW + 260))) - 260);
  const bx = Math.round((((t * 7 + 700) % (LW + 220))) - 220);
  x.globalAlpha = 0.92;
  x.drawImage(ART.cloudA, ax, 44 + Math.round(Math.sin(t * 0.4) * 4));
  x.drawImage(ART.cloudB, bx, 92 + Math.round(Math.sin(t * 0.53 + 2) * 3));
  x.globalAlpha = 1;
  // analytic birds — 3, seeded, sin flaps
  for (let i = 0; i < 3; i++) {
    const speed = 9 + h2(i, 51) * 9;
    const bx2 = 60 + ((h2(i, 52) * 940 + t * speed) % 940);
    const by = 74 + h2(i, 53) * 80 + Math.sin(t * 0.9 + i * 2.2) * 7;
    const flap = Math.sin(t * 7.3 + i * 2.4);
    const s = 3 + Math.round(h2(i, 54) * 2);
    x.strokeStyle = '#3e382f';
    x.lineWidth = 2;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(Math.round(bx2) - s * 2, Math.round(by) - flap * s);
    x.quadraticCurveTo(Math.round(bx2), Math.round(by) + 1, Math.round(bx2), Math.round(by));
    x.quadraticCurveTo(Math.round(bx2), Math.round(by) + 1, Math.round(bx2) + s * 2, Math.round(by) - flap * s);
    x.stroke();
  }
  x.lineCap = 'butt';
  x.drawImage(ART.extTent, 0, 0);
}

// ---- interior base: FULL low-canvas repaint (no actors/props/ovens/clock) --
export function drawInterior(x, t, dusk) {
  fresh(x);
  x.drawImage(ART.intBase, 0, 0);
  const dk = clamp(dusk ?? 0, 0, 1);
  // window light — dusk 0 bright daylight cream → dusk 1 orange-violet sunset
  const dayCore = rgb('#fff6d8'), duskCore = rgb('#ff9440');
  const dayEdge = rgb('#ffe9b8'), duskEdge = rgb('#8a55b0');
  for (const wx of [380, 700]) {
    x.save();
    x.beginPath(); x.arc(wx, 170, 40, 0, 7); x.clip();
    x.fillStyle = mix(dayEdge, duskEdge, dk);
    x.fillRect(wx - 42, 128, 84, 84);
    x.fillStyle = mix(dayCore, duskCore, dk);
    x.beginPath(); x.arc(wx + 8 * (1 - dk), 170 - 6 * (1 - dk), 30, 0, 7); x.fill();
    if (dk > 0.02) {
      x.globalAlpha = 0.35 * dk;
      x.fillStyle = '#5a2e6e';
      x.beginPath(); x.arc(wx - 12, 160, 26, 0, 7); x.fill();
      x.globalAlpha = 1;
    }
    x.restore();
    // mullions over the glass
    x.fillStyle = PAL.woodLo;
    x.fillRect(wx - 3, 130, 6, 80);
    x.fillRect(wx - 40, 167, 80, 6);
    x.fillStyle = PAL.ink;
    x.fillRect(wx - 3, 130, 1, 80); x.fillRect(wx - 40, 167, 80, 1);
  }
  // flour dust drifting in the window light
  for (let i = 0; i < 10; i++) {
    const wx = i < 5 ? 380 : 700;
    const px = wx + (h2(i, 61) - 0.5) * 90 + Math.sin(t * 0.3 + i * 1.7) * 5;
    const py = 120 + h2(i, 62) * 160 + Math.sin(t * 0.5 + i * 2.3) * 7;
    x.globalAlpha = 0.14 + 0.14 * (0.5 + 0.5 * Math.sin(t * 1.1 + i * 2.1));
    x.fillStyle = '#fff8e0';
    x.fillRect(Math.round(px), Math.round(py), 2, 2);
  }
  x.globalAlpha = 1;
  // dusk wash — warm interior, violet sky-light stepping down from the top
  if (dk > 0.01) {
    x.fillStyle = `rgba(255,140,60,${0.09 * dk})`;
    x.fillRect(0, 0, LW, LH);
    const steps = [[0, 130, 0.12], [130, 210, 0.065], [210, 272, 0.03]];
    for (const [y0, y1, a] of steps) {
      x.fillStyle = `rgba(110,60,150,${a * dk})`;
      x.fillRect(0, y0, LW, y1 - y0);
    }
  }
}

// ---- work table for a baker -------------------------------------------------
export function station(x, cx, who) {
  fresh(x);
  const c = ART.stations[who] || ART.stations.hero;
  x.drawImage(c, Math.round(cx) - 75, 406);
}

// ---- oven unit (hinged-bottom door, warm glow) ------------------------------
export function oven(x, cx, door, glow) {
  fresh(x);
  cx = Math.round(cx);
  const d = clamp(door ?? 0, 0, 1), gl = clamp(glow ?? 0, 0, 1);
  const topY = 297, botY = 405;
  // floor under-glow
  if (gl > 0.02) {
    x.fillStyle = `rgba(255,150,60,${0.30 * gl})`;
    x.beginPath(); x.ellipse(cx, 412, 42 + 8 * gl, 8, 0, 0, 7); x.fill();
    x.fillStyle = `rgba(255,190,90,${0.22 * gl})`;
    x.beginPath(); x.ellipse(cx, 410, 26, 5, 0, 0, 7); x.fill();
  }
  // shell
  x.fillStyle = PAL.steelInk;
  x.fillRect(cx - 34, topY, 68, botY - topY);
  x.fillStyle = PAL.steel;
  x.fillRect(cx - 32, topY + 2, 62, botY - topY - 4);
  x.fillStyle = PAL.steelHi;
  x.fillRect(cx + 24, topY + 2, 6, botY - topY - 4);
  x.fillStyle = '#6f7880';
  x.fillRect(cx - 32, topY + 2, 62, 3);
  // control panel
  x.fillStyle = '#4a4438';
  x.fillRect(cx - 30, topY + 7, 60, 16);
  x.fillStyle = '#c9c0a8';
  x.beginPath(); x.arc(cx - 16, topY + 15, 4, 0, 7); x.fill();
  x.beginPath(); x.arc(cx + 16, topY + 15, 4, 0, 7); x.fill();
  x.fillStyle = '#2e2a22';
  x.fillRect(cx - 18, topY + 14, 4, 2); x.fillRect(cx + 14, topY + 14, 4, 2);
  if (gl > 0.3) {
    x.fillStyle = '#ff5030';
    x.fillRect(cx + 2, topY + 13, 3, 3);
  }
  // cavity behind the door
  x.fillStyle = PAL.ink;
  x.fillRect(cx - 28, 325, 56, 74);
  const cav = mix(rgb('#191009'), rgb('#d4691e'), gl * 0.85);
  x.fillStyle = cav;
  x.fillRect(cx - 26, 327, 52, 70);
  if (gl > 0.05) {
    x.fillStyle = `rgba(255,176,96,${0.5 * gl})`;
    x.fillRect(cx - 18, 340, 36, 44);
    x.fillStyle = `rgba(255,220,150,${0.35 * gl})`;
    x.fillRect(cx - 10, 352, 20, 26);
  }
  // rack + tray silhouette
  x.fillStyle = 'rgba(20,12,8,0.8)';
  x.fillRect(cx - 24, 352, 48, 3);
  // glass window on the door face (visible when the door is closed)
  const doorH = Math.round(70 * (1 - d));
  if (doorH > 8) {
    x.fillStyle = PAL.steelInk;
    x.fillRect(cx - 28, 397 - doorH, 56, doorH);
    x.fillStyle = PAL.steel;
    x.fillRect(cx - 26, 397 - doorH, 52, doorH - 2);
    x.fillStyle = PAL.steelHi;
    x.fillRect(cx + 18, 397 - doorH, 8, doorH - 2);
    // window glass
    if (doorH > 26) {
      const gh = Math.min(32, doorH - 12);
      x.fillStyle = PAL.ink;
      x.fillRect(cx - 20, 397 - doorH + 8, 40, gh);
      x.fillStyle = gl > 0.05 ? mix(rgb('#5a2c10'), rgb('#ff9440'), gl) : '#241a14';
      x.fillRect(cx - 17, 397 - doorH + 11, 34, gh - 6);
      x.fillStyle = 'rgba(255,255,255,0.18)';
      x.fillRect(cx - 14, 397 - doorH + 12, 8, gh - 8);
    }
    // handle
    x.fillStyle = PAL.steelInk;
    x.fillRect(cx - 22, 397 - doorH + 4, 44, 4);
    x.fillStyle = PAL.steelHi;
    x.fillRect(cx - 22, 397 - doorH + 4, 44, 1);
  }
  // open door: inner face swings down toward the viewer (hinged at y 397)
  if (d > 0.02) {
    const depth = Math.round(30 * d);
    x.fillStyle = PAL.steelInk;
    x.beginPath();
    x.moveTo(cx - 28, 397); x.lineTo(cx + 28, 397);
    x.lineTo(cx + 23, 397 + depth); x.lineTo(cx - 23, 397 + depth);
    x.closePath(); x.fill();
    x.fillStyle = '#a4abb2';
    x.beginPath();
    x.moveTo(cx - 25, 397); x.lineTo(cx + 25, 397);
    x.lineTo(cx + 20, 397 + depth - 2); x.lineTo(cx - 20, 397 + depth - 2);
    x.closePath(); x.fill();
    x.fillStyle = PAL.steelHi;
    x.fillRect(cx - 20, 397 + depth - 6, 40, 3);
    // handle on the dropped front edge
    x.fillStyle = PAL.steelInk;
    x.fillRect(cx - 14, 397 + depth - 2, 28, 4);
    // light spilling out under the open door
    if (gl > 0.05) {
      x.fillStyle = `rgba(255,160,70,${0.30 * gl})`;
      x.beginPath();
      x.moveTo(cx - 23, 397 + depth); x.lineTo(cx + 23, 397 + depth);
      x.lineTo(cx + 30, 397 + depth + 16); x.lineTo(cx - 30, 397 + depth + 16);
      x.closePath(); x.fill();
    }
  }
}

// ---- wall clock: run / spin / stop ------------------------------------------
export function wallClock(x, t, mode) {
  fresh(x);
  const { x: cx, y: cy, r } = LAY.clock;
  let mm; // minutes on the dial (0 = 12:00)
  if (mode === 'spin') {
    const p = smooth(clamp(seg(t, EV.timelapse, EV.judge), 0, 1));
    mm = 718 + 480 * p; // 11:58 + 8 accelerating-then-settling turns
  } else if (mode === 'stop') {
    mm = 718; // frozen at 11:58-ish
  } else {
    // 'run': the challenge covers 45 minutes over ~21 s ≈ 2.1 min/s
    const te = Math.max(0, t - EV.clockOn);
    mm = 13 + te * 2.1; // 11:13 → ~11:57 over the montage+oven window
  }
  const minA = (mm % 60) * (Math.PI / 30) - Math.PI / 2;
  const hrA = ((mm / 60) % 12) * (Math.PI / 6) - Math.PI / 2;
  // mount + rim
  x.fillStyle = 'rgba(58,46,38,0.25)';
  x.beginPath(); x.ellipse(cx + 2, cy + 3, r + 1, r, 0, 0, 7); x.fill();
  x.fillStyle = PAL.ink;
  x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  x.fillStyle = PAL.woodLo;
  x.beginPath(); x.arc(cx, cy, r - 2, 0, 7); x.fill();
  x.fillStyle = '#f8f4e6';
  x.beginPath(); x.arc(cx, cy, r - 5, 0, 7); x.fill();
  // ticks
  for (let i = 0; i < 12; i++) {
    const a = i * (Math.PI / 6) - Math.PI / 2;
    const major = i % 3 === 0;
    const r0 = r - 7, r1 = r - (major ? 12 : 10);
    x.strokeStyle = major ? PAL.ink : '#7a6a58';
    x.lineWidth = major ? 2 : 1;
    x.beginPath();
    x.moveTo(Math.round(cx + Math.cos(a) * r0), Math.round(cy + Math.sin(a) * r0));
    x.lineTo(Math.round(cx + Math.cos(a) * r1), Math.round(cy + Math.sin(a) * r1));
    x.stroke();
  }
  // red final-minute tick under the rim (stop mode only)
  if (mode === 'stop') {
    x.fillStyle = '#d03a2a';
    x.fillRect(cx - 1, cy - r + 2, 3, 5);
  }
  // hour + minute hands
  const hand = (a, len, w, col) => {
    x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round';
    x.beginPath();
    x.moveTo(cx, cy);
    x.lineTo(Math.round(cx + Math.cos(a) * len), Math.round(cy + Math.sin(a) * len));
    x.stroke();
  };
  hand(hrA, 12, 3, PAL.ink);
  hand(minA, 21, 2, PAL.ink);
  // red second hand (smooth sweep, tail)
  const secA = (t * (Math.PI / 5)) - Math.PI / 2; // one turn / 10 s
  x.strokeStyle = '#d03a2a'; x.lineWidth = 1.4;
  x.beginPath();
  x.moveTo(Math.round(cx - Math.cos(secA) * 6), Math.round(cy - Math.sin(secA) * 6));
  x.lineTo(Math.round(cx + Math.cos(secA) * (r - 8)), Math.round(cy + Math.sin(secA) * (r - 8)));
  x.stroke();
  x.fillStyle = PAL.ink;
  x.beginPath(); x.arc(cx, cy, 2.4, 0, 7); x.fill();
  x.lineCap = 'butt';
}

// ---- dough blob --------------------------------------------------------------
export function dough(x, cx, cy, sq, flour) {
  fresh(x);
  cx = Math.round(cx); cy = Math.round(cy);
  const s = clamp(sq ?? 0.5, 0, 1);
  const f = clamp(flour ?? 0, 0, 1);
  const w = Math.round(s >= 0.5 ? 44 + 22 * (s - 0.5) * 2 : 44 - 22 * (0.5 - s) * 2 * 0.5);
  const hgt = Math.round(s >= 0.5 ? 28 * (1 - 0.55 * (s * 2 - 1)) : 28 * (1 + (0.5 - s)));
  const hw = w / 2;
  // shadow
  x.fillStyle = 'rgba(58,46,38,0.18)';
  x.beginPath(); x.ellipse(cx, cy + hgt / 2 - 1, hw + 3, 3.5, 0, 0, 7); x.fill();
  // body: domed mound with two soft bumps
  x.fillStyle = PAL.ink;
  x.beginPath();
  x.moveTo(cx - hw, cy + hgt / 2);
  x.quadraticCurveTo(cx - hw - 2, cy - hgt * 0.1, cx - hw * 0.45, cy - hgt / 2);
  x.quadraticCurveTo(cx, cy - hgt * 0.78, cx + hw * 0.45, cy - hgt / 2);
  x.quadraticCurveTo(cx + hw + 2, cy - hgt * 0.1, cx + hw, cy + hgt / 2);
  x.closePath(); x.fill();
  const body = (inset, col) => {
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(cx - hw + inset, cy + hgt / 2 - 1);
    x.quadraticCurveTo(cx - hw + inset - 1, cy - hgt * 0.1, cx - hw * 0.45 + inset * 0.6, cy - hgt / 2 + inset);
    x.quadraticCurveTo(cx, cy - hgt * 0.72, cx + hw * 0.45 - inset * 0.6, cy - hgt / 2 + inset);
    x.quadraticCurveTo(cx + hw - inset + 1, cy - hgt * 0.1, cx + hw - inset, cy + hgt / 2 - 1);
    x.closePath(); x.fill();
  };
  body(2, '#e8c98e');
  // light from upper right
  x.fillStyle = '#f4ddb0';
  x.beginPath(); x.ellipse(cx + hw * 0.34, cy - hgt * 0.28, hw * 0.4, hgt * 0.3, -0.3, 0, 7); x.fill();
  // shaded fold, lower left
  x.fillStyle = '#c9a468';
  x.beginPath(); x.ellipse(cx - hw * 0.42, cy + hgt * 0.16, hw * 0.3, hgt * 0.2, 0.3, 0, 7); x.fill();
  // flour dusting: white patches + dusted outline
  if (f > 0.03) {
    for (let i = 0; i < 5; i++) {
      const px = cx + (h2(i, 71) - 0.5) * w * 0.7, py = cy - hgt * (0.15 + h2(i, 72) * 0.35);
      x.globalAlpha = f * (0.5 + h2(i, 73) * 0.4);
      x.fillStyle = '#faf4e6';
      x.beginPath(); x.ellipse(px, py, 3 + h2(i, 74) * 5, 2 + h2(i, 75) * 3, 0, 0, 7); x.fill();
    }
    x.globalAlpha = f * 0.75;
    x.strokeStyle = '#faf4e6';
    x.setLineDash([2, 3]);
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(cx - hw + 3, cy + hgt / 2 - 2);
    x.quadraticCurveTo(cx - hw, cy - hgt * 0.1, cx - hw * 0.45, cy - hgt / 2 + 3);
    x.quadraticCurveTo(cx, cy - hgt * 0.75, cx + hw * 0.45, cy - hgt / 2 + 3);
    x.quadraticCurveTo(cx + hw, cy - hgt * 0.1, cx + hw - 3, cy + hgt / 2 - 2);
    x.stroke();
    x.setLineDash([]);
    x.globalAlpha = 1;
  }
}

// ---- butter block / fanned slices + knife ------------------------------------
export function butterBlock(x, cx, cy, cuts) {
  fresh(x);
  cx = Math.round(cx); cy = Math.round(cy);
  const slab = (sx, sy, wdt, hgt, rot) => {
    x.save();
    x.translate(sx, sy); x.rotate(rot);
    x.fillStyle = PAL.butterInk;
    x.fillRect(-wdt / 2 - 1, -hgt / 2 - 1, wdt + 2, hgt + 2);
    x.fillStyle = PAL.butter;
    x.fillRect(-wdt / 2, -hgt / 2, wdt, hgt);
    x.fillStyle = PAL.butterHi;
    x.fillRect(-wdt / 2, -hgt / 2, wdt, 3);
    x.fillRect(wdt / 2 - 3, -hgt / 2, 3, hgt);
    x.fillStyle = PAL.butterLo;
    x.fillRect(-wdt / 2, hgt / 2 - 2, wdt, 2);
    x.restore();
  };
  x.fillStyle = 'rgba(58,46,38,0.16)';
  x.beginPath(); x.ellipse(cx, cy + 9, 26, 3.5, 0, 0, 7); x.fill();
  if ((cuts ?? 0) <= 0.05) {
    slab(cx, cy, 24, 16, 0);
  } else {
    slab(cx - 11, cy + 1, 7, 14, -0.16);
    slab(cx, cy - 1, 7, 15, 0);
    slab(cx + 11, cy + 1, 7, 14, 0.16);
    // knife resting beside
    x.fillStyle = PAL.woodInk;
    x.fillRect(cx + 18, cy + 7, 14, 4);
    x.fillStyle = PAL.wood;
    x.fillRect(cx + 18, cy + 7, 14, 2);
    x.fillStyle = PAL.steelInk;
    x.beginPath();
    x.moveTo(cx + 30, cy + 7); x.lineTo(cx + 48, cy + 7);
    x.lineTo(cx + 48, cy + 11); x.lineTo(cx + 32, cy + 11);
    x.closePath(); x.fill();
    x.fillStyle = PAL.steelHi;
    x.fillRect(cx + 31, cy + 7, 17, 1);
  }
}

// ---- rolling pin + widening dough sheet ---------------------------------------
export function rolling(x, cx, cy, u, t) {
  fresh(x);
  cx = Math.round(cx); cy = Math.round(cy);
  const uu = clamp(u ?? 0, 0, 1);
  const sw = Math.round(38 + 48 * uu), sh = Math.max(4, Math.round(13 - 6 * uu));
  // sheet
  x.fillStyle = 'rgba(58,46,38,0.16)';
  x.beginPath(); x.ellipse(cx, cy + 3, sw / 2 + 3, 3.5, 0, 0, 7); x.fill();
  x.fillStyle = PAL.ink;
  x.beginPath(); x.ellipse(cx, cy, sw / 2 + 1, sh / 2 + 1, 0, 0, 7); x.fill();
  x.fillStyle = '#e8c98e';
  x.beginPath(); x.ellipse(cx, cy, sw / 2, sh / 2, 0, 0, 7); x.fill();
  x.fillStyle = '#f4ddb0';
  x.beginPath(); x.ellipse(cx + sw * 0.16, cy - sh * 0.14, sw * 0.28, sh * 0.22, 0, 0, 7); x.fill();
  // flour speckles on the sheet
  for (let i = 0; i < 6; i++) {
    const px = cx + (h2(i, 81) - 0.5) * sw * 0.8, py = cy + (h2(i, 82) - 0.5) * sh * 0.5;
    x.fillStyle = 'rgba(250,244,230,0.8)';
    x.fillRect(Math.round(px), Math.round(py), 2, 1);
  }
  // rocking pin
  const rock = Math.sin(t * 9);
  const px2 = cx + Math.sin(t * 4.5) * 3, py2 = cy - sh / 2 - 5 + rock;
  x.save();
  x.translate(Math.round(px2), Math.round(py2));
  x.rotate(rock * 0.14);
  x.fillStyle = PAL.woodInk;
  x.fillRect(-26, -5, 52, 10);
  x.fillStyle = PAL.woodHi;
  x.fillRect(-24, -4, 48, 5);
  x.fillStyle = PAL.wood;
  x.fillRect(-24, 1, 48, 3);
  x.fillStyle = PAL.woodLo;
  x.fillRect(-31, -4, 6, 8); x.fillRect(25, -4, 6, 8);
  x.fillStyle = PAL.woodInk;
  x.fillRect(-31, -4, 1, 8); x.fillRect(30, -4, 1, 8);
  x.restore();
}

// ---- piping bag + growing frosting swirl ---------------------------------------
export function piping(x, cx, cy, u) {
  fresh(x);
  cx = Math.round(cx); cy = Math.round(cy);
  const uu = clamp(u ?? 0, 0, 1);
  // cakelet
  x.fillStyle = 'rgba(58,46,38,0.16)';
  x.beginPath(); x.ellipse(cx, cy + 7, 15, 3, 0, 0, 7); x.fill();
  x.fillStyle = PAL.ink;
  x.fillRect(cx - 13, cy - 8, 26, 15);
  x.fillStyle = '#e8c98e';
  x.fillRect(cx - 12, cy - 7, 24, 13);
  x.fillStyle = '#f4ddb0';
  x.fillRect(cx - 12, cy - 7, 24, 3);
  x.fillStyle = PAL.blushLo;
  x.fillRect(cx - 12, cy + 2, 24, 3);
  // swirl of 3 rounds, butter cream + blush tip
  const rounds = [[10, 0], [7.4, 4.6], [5, 9]];
  for (let k = 0; k < 3; k++) {
    const need = (k + 1) / 3;
    if (uu < need - 1 / 3 + 0.02) break;
    const [rw, ry] = rounds[k];
    x.fillStyle = PAL.ink;
    x.beginPath(); x.ellipse(cx, cy - 8 - ry, rw + 1, ry * 0.52 + 1, 0, 0, 7); x.fill();
    x.fillStyle = '#f7f0e0';
    x.beginPath(); x.ellipse(cx, cy - 8 - ry, rw, ry * 0.52, 0, 0, 7); x.fill();
    x.fillStyle = '#fffdf4';
    x.beginPath(); x.ellipse(cx + rw * 0.3, cy - 9 - ry, rw * 0.4, ry * 0.2, 0, 0, 7); x.fill();
  }
  if (uu > 0.92) {
    x.fillStyle = PAL.blush;
    x.beginPath(); x.arc(cx, cy - 18.5, 3, 0, 7); x.fill();
    x.fillStyle = PAL.blushHi;
    x.beginPath(); x.arc(cx + 1, cy - 19.5, 1.2, 0, 7); x.fill();
  }
  // the bag, tilted over the swirl, squeezes flatter as u rises
  x.save();
  x.translate(cx + 20, cy - 34);
  x.rotate(0.62);
  x.scale(1 - 0.12 * uu, 1 - 0.2 * uu);
  x.fillStyle = PAL.ink;
  x.beginPath();
  x.moveTo(-11, -18); x.quadraticCurveTo(0, -24, 11, -18);
  x.lineTo(4, 12); x.lineTo(-4, 12);
  x.closePath(); x.fill();
  x.fillStyle = '#f0e6d0';
  x.beginPath();
  x.moveTo(-9, -16); x.quadraticCurveTo(0, -21, 9, -16);
  x.lineTo(3, 10); x.lineTo(-3, 10);
  x.closePath(); x.fill();
  x.fillStyle = '#fff8ea';
  x.fillRect(-6, -14, 5, 14);
  x.fillStyle = PAL.blushLo;
  x.fillRect(-5, 2, 10, 4);
  // nozzle
  x.fillStyle = PAL.steelInk;
  x.fillRect(-3, 10, 6, 6);
  x.restore();
}

// ---- bowl + whisk (frenzy = blur arcs + leaping flecks) --------------------------
export function whiskScene(x, cx, cy, t, on) {
  fresh(x);
  cx = Math.round(cx); cy = Math.round(cy);
  // bowl
  x.fillStyle = 'rgba(58,46,38,0.18)';
  x.beginPath(); x.ellipse(cx, cy + 18, 26, 4, 0, 0, 7); x.fill();
  x.fillStyle = PAL.steelInk;
  x.beginPath();
  x.moveTo(cx - 24, cy - 4);
  x.quadraticCurveTo(cx - 20, cy + 16, cx, cy + 17);
  x.quadraticCurveTo(cx + 20, cy + 16, cx + 24, cy - 4);
  x.closePath(); x.fill();
  x.fillStyle = PAL.steel;
  x.beginPath();
  x.moveTo(cx - 21, cy - 3);
  x.quadraticCurveTo(cx - 17, cy + 13, cx, cy + 14);
  x.quadraticCurveTo(cx + 17, cy + 13, cx + 21, cy - 3);
  x.closePath(); x.fill();
  x.fillStyle = PAL.steelHi;
  x.beginPath(); x.ellipse(cx + 6, cy + 2, 12, 6, 0, Math.PI * 0.8, Math.PI * 1.7); x.fill();
  // batter at the rim
  x.fillStyle = PAL.creamLo;
  x.beginPath(); x.ellipse(cx, cy - 3, 19, 5, 0, 0, 7); x.fill();
  x.fillStyle = '#faf0da';
  x.beginPath(); x.ellipse(cx + 2, cy - 3.6, 14, 3.2, 0, 0, 7); x.fill();
  if ((on ?? 0) > 0.5) {
    // rotation blur: two ghost arcs orbiting the balloon
    const ph = t * 13;
    for (let k = 0; k < 2; k++) {
      x.strokeStyle = `rgba(200,205,212,${0.55 - k * 0.2})`;
      x.lineWidth = 3 - k;
      x.beginPath();
      x.ellipse(cx + Math.sin(ph + k * 2.4) * 2, cy - 15, 8 - k * 2, 11 - k * 2, Math.sin(ph * 0.7 + k) * 0.9, 0, 7);
      x.stroke();
    }
    // handle wiggling above
    x.strokeStyle = PAL.woodInk; x.lineWidth = 4; x.lineCap = 'round';
    x.beginPath();
    x.moveTo(cx + Math.sin(ph) * 2, cy - 2);
    x.lineTo(cx + 6 + Math.sin(ph) * 3, cy - 30);
    x.stroke();
    x.lineCap = 'butt';
    // flecks leaping out (analytic, seeded)
    for (let i = 0; i < 10; i++) {
      const u = ((t * 1.15 + h2(i, 91)) % 1);
      const a = h2(i, 92) * 6.283;
      const px = cx + Math.cos(a) * (3 + u * 17);
      const py = cy - 8 - Math.sin(u * Math.PI) * 16 - u * 7;
      x.globalAlpha = (1 - u) * 0.85;
      x.fillStyle = '#fff8ea';
      x.fillRect(Math.round(px), Math.round(py), 2, 2);
    }
    x.globalAlpha = 1;
  } else {
    // idle whisk resting against the rim
    x.save();
    x.translate(cx + 10, cy + 2);
    x.rotate(0.5);
    x.strokeStyle = PAL.woodInk; x.lineWidth = 4; x.lineCap = 'round';
    x.beginPath(); x.moveTo(0, 4); x.lineTo(0, -22); x.stroke();
    x.lineCap = 'butt';
    x.strokeStyle = PAL.steelLo; x.lineWidth = 1.4;
    x.beginPath(); x.ellipse(0, -30, 6, 9, 0, 0, 7); x.stroke();
    x.beginPath(); x.ellipse(0, -30, 2.6, 9, 0, 0, 7); x.stroke();
    x.restore();
  }
}

// ---- golden crusty loaf + steam wisps -------------------------------------------
export function loaf(x, cx, cy, steamT) {
  fresh(x);
  cx = Math.round(cx); cy = Math.round(cy);
  x.fillStyle = 'rgba(58,46,38,0.18)';
  x.beginPath(); x.ellipse(cx, cy + 8, 20, 3.5, 0, 0, 7); x.fill();
  // body
  x.fillStyle = '#6e4a1a';
  x.beginPath();
  x.moveTo(cx - 17, cy + 7);
  x.quadraticCurveTo(cx - 19, cy - 8, cx - 8, cy - 10);
  x.quadraticCurveTo(cx, cy - 12, cx + 8, cy - 10);
  x.quadraticCurveTo(cx + 19, cy - 8, cx + 17, cy + 7);
  x.closePath(); x.fill();
  x.fillStyle = '#d19a3a';
  x.beginPath();
  x.moveTo(cx - 15, cy + 6);
  x.quadraticCurveTo(cx - 17, cy - 6, cx - 8, cy - 8);
  x.quadraticCurveTo(cx, cy - 10, cx + 8, cy - 8);
  x.quadraticCurveTo(cx + 17, cy - 6, cx + 15, cy + 6);
  x.closePath(); x.fill();
  x.fillStyle = '#eab654';
  x.beginPath(); x.ellipse(cx + 6, cy - 4, 9, 4.4, -0.2, 0, 7); x.fill();
  x.fillStyle = '#a87224';
  x.beginPath(); x.ellipse(cx - 8, cy + 3, 8, 3.4, 0.2, 0, 7); x.fill();
  // scored top slashes
  x.strokeStyle = '#f4d98a'; x.lineWidth = 2; x.lineCap = 'round';
  for (const [ox, oy] of [[-7, -2], [0, -4], [7, -2]]) {
    x.beginPath();
    x.moveTo(cx + ox - 3, cy + oy + 2);
    x.lineTo(cx + ox + 3, cy + oy - 2);
    x.stroke();
  }
  x.lineCap = 'butt';
  // shine
  x.fillStyle = '#ffe9ae';
  x.fillRect(cx + 8, cy - 8, 5, 2);
  // steam wisps — analytic from steamT (seconds since the oven)
  if ((steamT ?? -1) >= 0) {
    for (let k = 0; k < 3; k++) {
      const u = ((steamT * 0.55 + k * 0.37) % 1);
      const px = cx - 7 + k * 7 + Math.sin(u * 5 + k * 2.1) * 4;
      const py = cy - 14 - u * 24;
      x.globalAlpha = Math.sin(u * Math.PI) * 0.5;
      x.fillStyle = '#faf4e6';
      const r = 2.6 - u * 1.2;
      for (let s = 0; s < 3; s++) {
        x.beginPath(); x.arc(px + Math.sin(u * 5 + s) * 2, py + s * 3, Math.max(0.8, r - s * 0.5), 0, 7); x.fill();
      }
    }
    x.globalAlpha = 1;
  }
}

// ---- collapsing sponge → splat ----------------------------------------------------
export function cakeSplat(x, cx, cy, u) {
  fresh(x);
  cx = Math.round(cx); cy = Math.round(cy);
  const uu = clamp(u ?? 0, 0, 1);
  const layers = [
    { w0: 40, w1: 56, y: 0 },
    { w0: 34, w1: 52, y: 10 },
    { w0: 28, w1: 47, y: 20 },
  ];
  const slabH = 9 * (1 - uu) + 2.5;
  // spread shadow
  x.fillStyle = 'rgba(58,46,38,0.18)';
  x.beginPath(); x.ellipse(cx, cy + 2, lerp(24, 32, uu), 4, 0, 0, 7); x.fill();
  for (let k = 0; k < 3; k++) {
    const L = layers[k];
    const wdt = lerp(L.w0, L.w1, uu);
    const ly = cy - lerp(L.y, k * 3 + 2, uu);
    const present = lerp(30, 8, uu) > L.y - 1;
    if (!present) continue;
    x.fillStyle = PAL.ink;
    x.fillRect(Math.round(cx - wdt / 2) - 1, Math.round(ly - slabH) - 1, Math.round(wdt) + 2, Math.round(slabH) + 2);
    x.fillStyle = '#e0b678';
    x.fillRect(Math.round(cx - wdt / 2), Math.round(ly - slabH), Math.round(wdt), Math.round(slabH));
    x.fillStyle = '#f0d6a2';
    x.fillRect(Math.round(cx - wdt / 2), Math.round(ly - slabH), Math.round(wdt), 2);
    x.fillStyle = '#c9a468';
    x.fillRect(Math.round(cx - wdt / 2), Math.round(ly - 2), Math.round(wdt), 2);
    // cream line
    if (k < 2) {
      x.fillStyle = '#f7f0e0';
      x.fillRect(Math.round(cx - wdt / 2) + 1, Math.round(ly + 0.5), Math.round(wdt) - 2, 2);
    }
  }
  // frosting: proud cap → drooping drips
  const capW = lerp(30, 50, uu), capY = cy - lerp(30, 8, uu);
  x.fillStyle = PAL.ink;
  x.fillRect(Math.round(cx - capW / 2) - 1, Math.round(capY - 5) - 1, Math.round(capW) + 2, 7);
  x.fillStyle = '#f7f0e0';
  x.fillRect(Math.round(cx - capW / 2), Math.round(capY - 5), Math.round(capW), 6);
  x.fillStyle = '#fffdf4';
  x.fillRect(Math.round(cx - capW / 2) + 3, Math.round(capY - 4), Math.round(capW) - 10, 2);
  if (uu > 0.4) {
    const dr = (uu - 0.4) / 0.6;
    for (let i = 0; i < 3; i++) {
      const dx = cx - capW / 2 + 6 + i * (capW - 12) / 2;
      const dl = 3 + dr * (5 + h2(i, 95) * 5);
      x.fillStyle = '#f7f0e0';
      x.fillRect(Math.round(dx) - 2, Math.round(capY + 1), 4, Math.round(dl));
    }
  }
  // sad cherry sliding off
  const chx = cx + lerp(2, 34, uu), chy = cy - lerp(24, 2, smooth(uu));
  x.fillStyle = '#7a1e1e';
  x.beginPath(); x.arc(chx, chy, 4, 0, 7); x.fill();
  x.fillStyle = '#c03434';
  x.beginPath(); x.arc(chx - 1, chy - 1, 3, 0, 7); x.fill();
  x.fillStyle = '#f08080';
  x.fillRect(Math.round(chx) - 2, Math.round(chy) - 2, 1.6, 1.6);
  x.strokeStyle = '#4a6e2a'; x.lineWidth = 1.2;
  x.beginPath(); x.moveTo(chx + 1, chy - 3); x.quadraticCurveTo(chx + 4, chy - 8, chx + 2, chy - 9); x.stroke();
}

// ---- blackened cake + smoke + puff ring --------------------------------------------
export function charCake(x, cx, cy, t, puffU) {
  fresh(x);
  cx = Math.round(cx); cy = Math.round(cy);
  // smoke plume (seeded puffs rising)
  for (let k = 0; k < 5; k++) {
    const u = ((t * 0.5 + h2(k, 97)) % 1);
    const px = cx + (h2(k, 98) - 0.5) * 12 + u * 8 * (h2(k, 99) > 0.5 ? 1 : -1);
    const py = cy - 12 - u * 44;
    const r = 3 + u * 9;
    x.fillStyle = `rgba(74,68,62,${(1 - u) * 0.32})`;
    x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    x.fillStyle = `rgba(120,110,100,${(1 - u) * 0.18})`;
    x.beginPath(); x.arc(px - r * 0.3, py - r * 0.3, r * 0.6, 0, 7); x.fill();
  }
  // charred mound
  x.fillStyle = '#0d0a08';
  x.beginPath();
  x.moveTo(cx - 18, cy + 8);
  x.quadraticCurveTo(cx - 20, cy - 8, cx - 6, cy - 11);
  x.quadraticCurveTo(cx, cy - 13, cx + 6, cy - 11);
  x.quadraticCurveTo(cx + 20, cy - 8, cx + 18, cy + 8);
  x.closePath(); x.fill();
  x.fillStyle = '#241c16';
  x.beginPath();
  x.moveTo(cx - 16, cy + 7);
  x.quadraticCurveTo(cx - 18, cy - 6, cx - 6, cy - 9);
  x.quadraticCurveTo(cx, cy - 11, cx + 6, cy - 9);
  x.quadraticCurveTo(cx + 18, cy - 6, cx + 16, cy + 7);
  x.closePath(); x.fill();
  x.fillStyle = '#17110d';
  x.beginPath(); x.ellipse(cx - 5, cy + 2, 10, 4.4, 0.2, 0, 7); x.fill();
  // ember cracks — flicker with t
  const cracks = [
    [[-10, -2], [-4, -6], [2, -3]],
    [[4, -7], [9, -3], [12, 2]],
    [[-12, 4], [-5, 3], [-1, 6]],
    [[3, 5], [9, 5], [13, 6]],
  ];
  for (let k = 0; k < cracks.length; k++) {
    const flick = 0.55 + 0.45 * Math.sin(t * 6.3 + k * 1.7);
    x.strokeStyle = mix(rgb('#7a2810'), rgb('#ff8438'), flick);
    x.lineWidth = 1.8;
    x.beginPath();
    cracks[k].forEach(([px, py], i) => (i ? x.lineTo(cx + px, cy + py) : x.moveTo(cx + px, cy + py)));
    x.stroke();
  }
  x.fillStyle = `rgba(255,120,40,${0.10 + 0.06 * Math.sin(t * 5.1)})`;
  x.beginPath(); x.arc(cx, cy - 2, 22, 0, 7); x.fill();
  // burst ring for EV.smokePuff
  const pu = clamp(puffU ?? 0, 0, 1);
  if (pu > 0.01 && pu < 0.99) {
    x.strokeStyle = `rgba(216,207,196,${(1 - pu) * 0.7})`;
    x.lineWidth = 3;
    x.beginPath(); x.arc(cx, cy - 6, 6 + pu * 28, 0, 7); x.stroke();
    x.strokeStyle = `rgba(250,244,230,${(1 - pu) * 0.5})`;
    x.lineWidth = 1.5;
    x.beginPath(); x.arc(cx, cy - 6, 4 + pu * 20, 0, 7); x.stroke();
  }
}

// ---- silver cloche -------------------------------------------------------------------
export function cloche(x, cx, cy, lift, t = 0) {
  fresh(x);
  cx = Math.round(cx); cy = Math.round(cy);
  const lf = clamp(lift ?? 0, 0, 1);
  // base plate always
  x.fillStyle = PAL.ink;
  x.beginPath(); x.ellipse(cx, cy + 3, 25, 6, 0, 0, 7); x.fill();
  x.fillStyle = '#eef0f2';
  x.beginPath(); x.ellipse(cx, cy + 2, 24, 5, 0, 0, 7); x.fill();
  x.fillStyle = '#ffffff';
  x.fillRect(cx - 18, cy, 20, 1.6);
  x.fillStyle = PAL.steelLo;
  x.fillRect(cx - 24, cy + 4, 48, 1.6);
  // dome: risen 20 px tilted at lift .5, held high at 1
  const dy = -40 * lf;
  const tilt = -0.55 * lf;
  x.save();
  x.translate(cx, cy + dy);
  x.rotate(tilt);
  x.fillStyle = PAL.steelInk;
  x.beginPath(); x.ellipse(0, 0, 21, 24, 0, Math.PI, 0); x.closePath(); x.fill();
  x.fillStyle = PAL.steel;
  x.beginPath(); x.ellipse(0, 0, 19, 22, 0, Math.PI, 0); x.closePath(); x.fill();
  x.fillStyle = PAL.steelHi;
  x.beginPath(); x.ellipse(7, -8, 8, 11, -0.4, Math.PI * 0.9, Math.PI * 1.6); x.fill();
  x.fillStyle = PAL.steelLo;
  x.beginPath(); x.ellipse(-8, -4, 7, 9, 0.5, Math.PI * 0.2, Math.PI * 0.75); x.fill();
  // knob
  x.fillStyle = PAL.steelInk;
  x.beginPath(); x.arc(0, -24, 4, 0, 7); x.fill();
  x.fillStyle = PAL.steelHi;
  x.beginPath(); x.arc(-1, -25, 2, 0, 7); x.fill();
  // shine sweep once held high
  if (lf > 0.7) {
    x.save();
    x.beginPath(); x.ellipse(0, 0, 19, 22, 0, Math.PI, 0); x.clip();
    const sx = (((t * 46) % 60) - 30);
    x.fillStyle = 'rgba(255,255,255,0.4)';
    x.save();
    x.translate(sx, 0); x.rotate(0.5);
    x.fillRect(-3, -26, 6, 30);
    x.restore();
    x.restore();
  }
  x.restore();
}

// ---- THE HERO PROP: bread bust of the judge with the golden braided-loaf wig -----
export function sculpture(x, cx, cy, t, spark) {
  fresh(x);
  cx = Math.round(cx); cy = Math.round(cy); // cy = base line the bust stands on
  // plinth (bread slab)
  x.fillStyle = 'rgba(58,46,38,0.2)';
  x.beginPath(); x.ellipse(cx, cy + 2, 30, 4.5, 0, 0, 7); x.fill();
  x.fillStyle = '#6e4a20';
  x.fillRect(cx - 22, cy - 6, 44, 7);
  x.fillStyle = '#c99a52';
  x.fillRect(cx - 22, cy - 6, 44, 3);
  x.fillStyle = '#e0b872';
  x.fillRect(cx - 22, cy - 6, 44, 1);
  // shoulders / tux in dark bread
  x.fillStyle = '#241610';
  x.beginPath();
  x.moveTo(cx - 22, cy - 6);
  x.quadraticCurveTo(cx - 23, cy - 24, cx - 13, cy - 30);
  x.lineTo(cx + 13, cy - 30);
  x.quadraticCurveTo(cx + 23, cy - 24, cx + 22, cy - 6);
  x.closePath(); x.fill();
  x.fillStyle = '#4a3020';
  x.beginPath();
  x.moveTo(cx - 19, cy - 7);
  x.quadraticCurveTo(cx - 20, cy - 22, cx - 12, cy - 27);
  x.lineTo(cx + 12, cy - 27);
  x.quadraticCurveTo(cx + 20, cy - 22, cx + 19, cy - 7);
  x.closePath(); x.fill();
  // shirt V + bow tie
  x.fillStyle = '#f2ead8';
  x.beginPath();
  x.moveTo(cx - 4, cy - 27); x.lineTo(cx + 4, cy - 27);
  x.lineTo(cx + 3, cy - 16); x.lineTo(cx - 3, cy - 16);
  x.closePath(); x.fill();
  x.fillStyle = '#17100c';
  x.fillRect(cx - 5, cy - 27, 10, 3);
  x.fillRect(cx - 1, cy - 21, 2, 5); // button
  // bald head — golden crust
  x.fillStyle = '#6e4a20';
  x.beginPath(); x.arc(cx, cy - 41, 12, 0, 7); x.fill();
  x.fillStyle = '#dcaa5e';
  x.beginPath(); x.arc(cx, cy - 41, 10.5, 0, 7); x.fill();
  x.fillStyle = '#f0c680';
  x.beginPath(); x.arc(cx + 4, cy - 45, 5, 0, 7); x.fill();
  x.fillStyle = '#b07f3e';
  x.beginPath(); x.arc(cx - 4, cy - 36, 5.5, 0, 7); x.fill();
  // grey sideburn patches (the 452 likeness)
  x.fillStyle = '#e8e0d0';
  x.fillRect(cx - 11, cy - 42, 3, 6);
  x.fillRect(cx + 8, cy - 42, 3, 6);
  // face: brows, eyes, mouth
  x.fillStyle = '#3a2412';
  x.fillRect(cx - 6, cy - 45, 4, 1.6);
  x.fillRect(cx + 2, cy - 45, 4, 1.6);
  x.fillRect(cx - 5, cy - 42, 3, 2.4);
  x.fillRect(cx + 2, cy - 42, 3, 2.4);
  x.fillRect(cx - 2, cy - 36, 5, 1.2);
  // THE WIG: three fat braids + top knot, butter-gloss
  const braidSeg = (bx, by, rx, ry) => {
    x.fillStyle = '#8a6410';
    x.beginPath(); x.ellipse(bx, by, rx + 1, ry + 1, 0, 0, 7); x.fill();
    x.fillStyle = PAL.butter;
    x.beginPath(); x.ellipse(bx, by, rx, ry, 0, 0, 7); x.fill();
    x.fillStyle = PAL.butterHi;
    x.beginPath(); x.ellipse(bx + rx * 0.3, by - ry * 0.35, rx * 0.45, ry * 0.35, 0, 0, 7); x.fill();
  };
  // side braids: stacked bulges falling beside the head
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      braidSeg(cx + side * (13 + (k % 2) * 1.5), cy - 32 + k * 8, 6 - k * 0.7, 4.6);
    }
    // braid tip
    x.fillStyle = '#8a6410';
    x.beginPath();
    x.moveTo(cx + side * 11, cy - 13);
    x.lineTo(cx + side * 15, cy - 13);
    x.lineTo(cx + side * 13, cy - 7);
    x.closePath(); x.fill();
  }
  // centre braid arching over the crown
  for (let k = 0; k < 4; k++) {
    const u = k / 3;
    braidSeg(cx - 9 + u * 18, cy - 52 - Math.sin(u * Math.PI) * 5 + (k % 2) * 1.5, 5.4, 4.2);
  }
  // top knot + band
  x.fillStyle = '#8a6410';
  x.fillRect(cx - 4, cy - 59, 8, 3);
  x.fillStyle = '#8a5a3a';
  x.fillRect(cx - 4, cy - 58, 8, 1.6);
  x.fillStyle = '#8a6410';
  x.beginPath(); x.arc(cx, cy - 63, 6, 0, 7); x.fill();
  x.fillStyle = PAL.butter;
  x.beginPath(); x.arc(cx, cy - 63, 5, 0, 7); x.fill();
  x.fillStyle = PAL.butterHi;
  x.beginPath(); x.arc(cx + 1.6, cy - 64.6, 2.4, 0, 7); x.fill();
  // gloss speculars
  x.fillStyle = '#fff0b8';
  x.fillRect(cx + 9, cy - 48, 2, 2);
  x.fillRect(cx - 14, cy - 36, 1.6, 1.6);
  // sparkle particles
  const sp = clamp(spark ?? 0, 0, 1);
  if (sp > 0.02) {
    for (let i = 0; i < 5; i++) {
      const u = ((t * 0.7 + h2(i, 111)) % 1);
      const a = Math.sin(u * Math.PI) * sp;
      if (a < 0.05) continue;
      const px = cx + (h2(i, 112) - 0.5) * 52;
      const py = cy - 8 - h2(i, 113) * 58;
      const s = 1 + a * 2.4;
      x.globalAlpha = a;
      x.fillStyle = i % 2 ? '#fff8e0' : '#ffe27a';
      x.fillRect(Math.round(px) - s, Math.round(py) - 0.8, s * 2, 1.6);
      x.fillRect(Math.round(px) - 0.8, Math.round(py) - s, 1.6, s * 2);
    }
    x.globalAlpha = 1;
  }
}

// ---- trophy: golden cup, hair-swoosh lid, gleam sweep -------------------------------
export function trophy(x, cx, cy, lift, t) {
  fresh(x);
  cx = Math.round(cx); cy = Math.round(cy); // cy = table surface under the cup
  const lf = clamp(lift ?? 0, 0, 1);
  const dy = Math.round(-14 * lf + Math.sin(t * 3) * 1.6 * lf);
  x.fillStyle = 'rgba(58,46,38,0.18)';
  x.beginPath(); x.ellipse(cx, cy + 1, 15 - lf * 4, 3, 0, 0, 7); x.fill();
  x.save();
  x.translate(0, dy);
  // plinth
  x.fillStyle = PAL.woodInk;
  x.fillRect(cx - 9, cy - 6, 18, 6);
  x.fillStyle = PAL.wood;
  x.fillRect(cx - 8, cy - 6, 16, 4);
  x.fillStyle = PAL.woodHi;
  x.fillRect(cx - 8, cy - 6, 16, 1);
  // stem
  x.fillStyle = PAL.butterInk;
  x.fillRect(cx - 3, cy - 11, 6, 5);
  x.fillStyle = PAL.butter;
  x.fillRect(cx - 2, cy - 11, 3, 5);
  // cup bowl
  x.fillStyle = PAL.butterInk;
  x.beginPath();
  x.moveTo(cx - 12, cy - 26);
  x.quadraticCurveTo(cx - 12, cy - 12, cx, cy - 10);
  x.quadraticCurveTo(cx + 12, cy - 12, cx + 12, cy - 26);
  x.closePath(); x.fill();
  x.fillStyle = PAL.butter;
  x.beginPath();
  x.moveTo(cx - 10, cy - 25);
  x.quadraticCurveTo(cx - 10, cy - 13, cx, cy - 11.5);
  x.quadraticCurveTo(cx + 10, cy - 13, cx + 10, cy - 25);
  x.closePath(); x.fill();
  x.fillStyle = PAL.butterHi;
  x.beginPath(); x.ellipse(cx, cy - 25, 10, 2.6, 0, 0, 7); x.fill();
  x.fillStyle = PAL.butterLo;
  x.beginPath();
  x.moveTo(cx + 4, cy - 13);
  x.quadraticCurveTo(cx + 9, cy - 15, cx + 9.6, cy - 24);
  x.lineTo(cx + 7, cy - 24);
  x.quadraticCurveTo(cx + 6.6, cy - 16, cx + 3, cy - 14);
  x.closePath(); x.fill();
  // handles
  x.strokeStyle = PAL.butterInk; x.lineWidth = 2.6;
  x.beginPath(); x.arc(cx - 13, cy - 22, 4.4, Math.PI * 0.5, Math.PI * 1.5); x.stroke();
  x.beginPath(); x.arc(cx + 13, cy - 22, 4.4, Math.PI * 1.5, Math.PI * 0.5); x.stroke();
  // lid with the tiny hair-swoosh
  x.fillStyle = PAL.butterInk;
  x.beginPath(); x.ellipse(cx, cy - 30, 7.5, 4, 0, Math.PI, 0); x.closePath(); x.fill();
  x.fillStyle = PAL.butter;
  x.beginPath(); x.ellipse(cx, cy - 30, 6.4, 3.2, 0, Math.PI, 0); x.closePath(); x.fill();
  x.strokeStyle = '#8a6410'; x.lineWidth = 1.6; x.lineCap = 'round';
  x.beginPath();
  x.moveTo(cx - 3.6, cy - 30.4);
  x.quadraticCurveTo(cx, cy - 33.4, cx + 3.4, cy - 30.8);
  x.quadraticCurveTo(cx + 1.4, cy - 32.4, cx - 1.4, cy - 31.4);
  x.stroke();
  x.lineCap = 'butt';
  // gleam sweep — rotating highlight bar clipped to the bowl
  x.save();
  x.beginPath();
  x.moveTo(cx - 12, cy - 26);
  x.quadraticCurveTo(cx - 12, cy - 12, cx, cy - 10);
  x.quadraticCurveTo(cx + 12, cy - 12, cx + 12, cy - 26);
  x.closePath(); x.clip();
  const gx = (((t * 36) % 44) - 22);
  x.fillStyle = 'rgba(255,246,192,0.5)';
  x.save();
  x.translate(cx + gx, cy - 18); x.rotate(0.45);
  x.fillRect(-2.4, -10, 4.8, 14);
  x.restore();
  x.restore();
  x.restore();
}

// ---- "STAR BAKER" banner unfurling from the top of the view --------------------------
export function banner(x, u, t) {
  fresh(x);
  const uu = clamp(u ?? 0, 0, 1);
  if (uu <= 0.01) return;
  const sway = Math.round(Math.sin(t * 1.3) * 3 * uu);
  const visH = Math.max(6, Math.round(96 * uu));
  const bx = VX + sway;
  const by = VY + 24;
  x.save();
  x.beginPath(); x.rect(VX - 8, VY + 16, VW + 16, visH + 10); x.clip();
  x.drawImage(ART.banner, 0, 0, VW, visH, bx, by, VW, visH);
  x.restore();
  // rolled roll at the reveal edge
  const ry = by + visH;
  x.fillStyle = PAL.ink;
  x.fillRect(bx + 1, ry - 4, VW - 2, 9);
  x.fillStyle = '#e6dac0';
  x.fillRect(bx + 3, ry - 2, VW - 6, 5);
  x.fillStyle = '#f6efe0';
  x.fillRect(bx + 3, ry - 2, VW - 6, 2);
  for (let i = 0; i < 14; i++) {
    x.fillStyle = PAL.creamInk;
    x.fillRect(bx + 30 + i * 68, ry, 3, 2);
  }
}

// ---- confetti: radial burst ------------------------------------------------------
const CONF_COLS = ['#f2c744', '#e8b7b0', '#9db89a', '#f7f0e0', '#ffffff', '#ffd76e'];
export function confettiBurst(x, t0, t, cx, cy) {
  fresh(x);
  const age = t - t0;
  if (age < 0 || age > 2.5) return;
  for (let i = 0; i < 90; i++) {
    const a = h2(i, 121) * 6.283;
    const sp = 90 + h2(i, 122) * 190;
    const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp - 90;
    const px = cx + vx * age;
    const py = cy + vy * age + 0.5 * 240 * age * age;
    if (py > LH + 10) continue;
    const rot = (h2(i, 123) - 0.5) * 12 * age;
    const s = 2.4 + h2(i, 124) * 2.4;
    const fade = clamp(1 - (age - 1.7) / 0.8, 0, 1);
    x.save();
    x.translate(Math.round(px), Math.round(py));
    x.rotate(rot);
    x.globalAlpha = 0.95 * fade;
    x.fillStyle = CONF_COLS[i % CONF_COLS.length];
    x.fillRect(-s / 2, -s / 4, s, s / 2);
    x.restore();
  }
  x.globalAlpha = 1;
}

// ---- confetti: continuous top-edge rain (no accumulation) ---------------------------
export function confettiRain(x, t, seed) {
  fresh(x);
  const sd = Math.round(seed ?? 1);
  for (let i = 0; i < 120; i++) {
    const colX = VX + h2(i * 3 + sd, 131) * VW;
    const speed = 55 + h2(i * 7 + sd, 132) * 70;
    const off = h2(i * 13 + sd, 133) * (VH + 32);
    const py = VY - 16 + ((t * speed + off) % (VH + 32));
    const px = colX + Math.sin(t * 1.6 + h2(i * 17 + sd, 134) * 6.283) * 10;
    const s = 2 + Math.round(h2(i * 23 + sd, 135) * 2);
    x.save();
    x.translate(Math.round(px), Math.round(py));
    x.rotate(h2(i * 29 + sd, 136) * 6.283 + t * (h2(i, 137) - 0.5) * 8);
    x.globalAlpha = 0.9;
    x.fillStyle = CONF_COLS[i % CONF_COLS.length];
    x.fillRect(-s / 2, -s / 4, s, s / 2);
    x.restore();
  }
  x.globalAlpha = 1;
}

// ---- flour cloud burst ---------------------------------------------------------------
export function flourPuff(x, t0, t, cx, cy, n) {
  fresh(x);
  const age = t - t0;
  if (age < 0 || age > 0.9) return;
  const u = age / 0.9;
  const nn = Math.max(1, Math.round(n ?? 12));
  for (let k = 0; k < nn; k++) {
    const a = h2(k, 141) * 6.283;
    const dist = (6 + h2(k, 142) * 20) * u;
    const px = cx + Math.cos(a) * dist * 1.6;
    const py = cy + Math.sin(a) * dist * 0.6 - u * 9;
    const r = 2.5 + u * (6 + h2(k, 143) * 7);
    x.globalAlpha = (1 - u) * 0.5 * (0.5 + h2(k, 144) * 0.5);
    x.fillStyle = k % 3 ? '#faf4e6' : '#f0e6d0';
    x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
}

// ---- flame jet (3 tongues + embers) ---------------------------------------------------
export function flameJet(x, t, cx, cy, s) {
  fresh(x);
  const sc = clamp(s ?? 0, 0, 1);
  if (sc <= 0.02) return;
  cx = Math.round(cx); cy = Math.round(cy);
  for (let k = 0; k < 3; k++) {
    const ox = (k - 1) * 9;
    const flick = Math.sin(t * 11 + k * 2.1) * 0.5 + Math.sin(t * 23 + k * 5.3) * 0.3;
    const hgt = (30 + flick * 12) * sc * (k === 1 ? 1.25 : 0.9);
    const wdt = (10 - Math.abs(k - 1) * 2.4) * sc;
    const lean = Math.sin(t * 9 + k * 1.4) * 3;
    const tongue = (hh, col) => {
      x.fillStyle = col;
      x.beginPath();
      x.moveTo(cx + ox - wdt, cy);
      x.quadraticCurveTo(cx + ox - wdt * 0.7, cy - hh * 0.45, cx + ox + lean * 0.6, cy - hh);
      x.quadraticCurveTo(cx + ox + wdt * 0.7 + lean, cy - hh * 0.4, cx + ox + wdt, cy);
      x.closePath(); x.fill();
    };
    tongue(hgt, '#ff7a28');
    tongue(hgt * 0.72, '#ffa440');
    tongue(hgt * 0.42, '#ffe27a');
  }
  // embers
  for (let k = 0; k < 3; k++) {
    const u = ((t * 1.4 + h2(k, 151)) % 1);
    const px = cx + Math.sin(k * 2.4) * 7 + Math.sin(u * 9 + k) * 3;
    const py = cy - u * 36 * sc;
    x.globalAlpha = (1 - u) * 0.85;
    x.fillStyle = '#ffb050';
    x.fillRect(Math.round(px), Math.round(py), 2, 2);
  }
  x.globalAlpha = 1;
}
