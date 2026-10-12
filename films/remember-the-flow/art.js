// REMEMBER THE FLOW — art.js
// Every STATIC canvas of the film is baked here, once, inside build() (called from prepare()).
// All animation lives in film.js as pure functions of time. Text that timeline owns (plate credits,
// narration) is NEVER baked — it arrives as declarative captions. Diegetic print (poster slogan,
// banner, map gazetteer, notice board) is baked because it is part of the photographed object.
import { W, H, F, hash, rng } from 'filmkit/lib.js';

// ---- the 240 Cabald ids (scripts/quest-bald.json, read offline) — the wall honours the other 4,250 ----
export const BALD_IDS = [
  0, 5, 23, 48, 73, 98, 125, 129, 142, 152, 159, 167, 174, 183, 197, 219, 222, 224, 225, 233, 287,
  307, 315, 321, 347, 368, 382, 389, 410, 419, 452, 456, 458, 468, 471, 482, 554, 555, 556, 559,
  564, 582, 585, 645, 651, 685, 690, 704, 744, 763, 804, 808, 834, 839, 840, 845, 882, 892, 908,
  931, 952, 980, 1017, 1033, 1034, 1061, 1065, 1112, 1115, 1120, 1133, 1140, 1161, 1169, 1180,
  1188, 1217, 1242, 1249, 1255, 1260, 1264, 1267, 1271, 1332, 1344, 1350, 1444, 1445, 1454, 1462,
  1469, 1472, 1473, 1479, 1504, 1534, 1558, 1567, 1586, 1601, 1620, 1652, 1657, 1685, 1694, 1703,
  1707, 1712, 1730, 1733, 1738, 1747, 1777, 1793, 1821, 1843, 1856, 1869, 1870, 1880, 1896, 1926,
  1942, 1989, 1991, 2028, 2045, 2061, 2071, 2081, 2132, 2156, 2169, 2202, 2217, 2237, 2238, 2270,
  2275, 2284, 2296, 2310, 2371, 2393, 2433, 2443, 2467, 2487, 2505, 2529, 2537, 2585, 2599, 2602,
  2619, 2636, 2653, 2666, 2673, 2678, 2679, 2698, 2752, 2770, 2829, 2855, 2862, 2864, 2898, 2913,
  2914, 2929, 2937, 2940, 2963, 2964, 2971, 2980, 2985, 3027, 3030, 3100, 3109, 3120, 3140, 3150,
  3174, 3180, 3183, 3190, 3252, 3260, 3281, 3308, 3360, 3363, 3385, 3399, 3454, 3459, 3475, 3508,
  3533, 3537, 3566, 3605, 3640, 3668, 3717, 3720, 3741, 3762, 3766, 3792, 3807, 3830, 3839, 3850,
  3870, 3938, 3973, 3980, 4007, 4031, 4036, 4049, 4067, 4080, 4104, 4154, 4185, 4187, 4260, 4362,
  4378, 4449, 4450, 4461, 4479,
];
export const BALD = new Set(BALD_IDS);
// hairy ids, ascending — index 39 is HERO 42 (bald below 42: 0, 5, 23)
export const HAIRY = (() => { const a = []; for (let i = 0; i < 4490; i++) if (!BALD.has(i)) a.push(i); return a; })();

// ---- small canvas helpers ----
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; };
const cx2 = (c) => { const x = c.getContext('2d'); x.imageSmoothingEnabled = true; return x; };
async function img(url) { const i = new Image(); i.src = url; await i.decode(); return i; }
const orig = (id) => img(new URL(`../../media/remy/Character${id}.webp`, import.meta.url).href);

// paper fibre / film-base grain, deterministic
function grain(x, w, h, seed, amp) {
  const d = x.getImageData(0, 0, w, h), p = d.data;
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const n = (hash(xx * 7 + y * 131 + seed * 7919) - 0.5) * amp;
    const i = (y * w + xx) * 4;
    p[i] += n; p[i + 1] += n; p[i + 2] += n;
  }
  x.putImageData(d, 0, 0);
}
function vign(x, w, h, k, col = [10, 7, 4]) {
  const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},${k})`);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
}

// ---- sepia processor: 600×600 original crop → archival plate (S-curve luminance → warm ramp) ----
const RAMP = [[0, [24, 16, 11]], [0.3, [72, 50, 33]], [0.56, [138, 104, 68]], [0.8, [196, 162, 116]], [1, [236, 218, 180]]];
function sepiaPlate(source, crop, outW, outH, opts = {}) {
  const c = mkc(outW, outH), x = cx2(c);
  x.drawImage(source, crop[0], crop[1], crop[2], crop[3], 0, 0, outW, outH);
  const d = x.getImageData(0, 0, outW, outH), p = d.data;
  const amp = opts.grain ?? 9;
  for (let y = 0; y < outH; y++) for (let xx = 0; xx < outW; xx++) {
    const i = (y * outW + xx) * 4;
    let v = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
    v = Math.min(1, Math.max(0, 0.5 + (v - 0.5) * 1.22));           // print contrast
    v = Math.min(1, Math.max(0, (v - 0.02) / 0.96));
    let k = 0; while (k < RAMP.length - 2 && v > RAMP[k + 1][0]) k++;
    const [pa, ca] = RAMP[k], [pb, cb] = RAMP[k + 1], u = (v - pa) / (pb - pa);
    const vig = 1 - 0.3 * Math.pow(Math.hypot(xx / outW - 0.5, y / outH - 0.5) * 1.35, 2.2);
    const n = (hash(xx * 7 + y * 131) - 0.5) * amp;
    p[i] = Math.max(0, Math.min(255, (ca[0] + (cb[0] - ca[0]) * u) * vig + n));
    p[i + 1] = Math.max(0, Math.min(255, (ca[1] + (cb[1] - ca[1]) * u) * vig + n));
    p[i + 2] = Math.max(0, Math.min(255, (ca[2] + (cb[2] - ca[2]) * u) * vig + n * 0.7));
  }
  x.putImageData(d, 0, 0);
  // faint age mottling
  const r = rng(9042);
  for (let i = 0; i < 14; i++) {
    const gx = r() * outW, gy = r() * outH, gr = 20 + r() * 70;
    const g = x.createRadialGradient(gx, gy, 2, gx, gy, gr);
    g.addColorStop(0, `rgba(120,86,50,${0.05 + r() * 0.06})`); g.addColorStop(1, 'rgba(120,86,50,0)');
    x.fillStyle = g; x.beginPath(); x.arc(gx, gy, gr, 0, 7); x.fill();
  }
  return c;
}

// ---- archival mount furniture (drawn around a photo rect on a board) ----
function deckle(x, px, py, pw, ph) { // irregular white print border
  x.fillStyle = '#e9dfc4';
  const j = (s) => (hash(px * 3 + py * 5 + s) - 0.5) * 7;
  x.save(); x.translate(px, py);
  x.beginPath();
  x.moveTo(j(1), -4);
  for (let i = 0; i <= 24; i++) x.lineTo((pw * i) / 24 + j(i * 2), -4 + j(i * 2 + 40));
  for (let i = 0; i <= 12; i++) x.lineTo(pw + 4 + j(60 + i), (ph * i) / 12 + j(90 + i));
  for (let i = 24; i >= 0; i--) x.lineTo((pw * i) / 24 + j(i + 130), ph + 4 + j(i + 150));
  for (let i = 12; i >= 0; i--) x.lineTo(-4 + j(i + 190), (ph * i) / 12 + j(i + 220));
  x.closePath(); x.fill();
  x.strokeStyle = 'rgba(58,42,24,0.35)'; x.lineWidth = 1.5; x.stroke();
  x.restore();
}
function tabs(x, px, py, pw, ph) { // photo corner tabs
  x.fillStyle = '#2c2118';
  const s = 34;
  const tri = (tx, ty, dx, dy) => { x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx + dx * s, ty); x.lineTo(tx, ty + dy * s); x.closePath(); x.fill(); };
  tri(px - 3, py - 3, 1, 1); tri(px + pw + 3, py - 3, -1, 1);
  tri(px - 3, py + ph + 3, 1, -1); tri(px + pw + 3, py + ph + 3, -1, -1);
}
function mountBoard(w, h, base) {
  const c = mkc(w, h), x = cx2(c);
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  grain(x, w, h, 31, 7);
  vign(x, w, h, 0.4);
  return { c, x };
}

// face crops (measured off the contact sheets; chest text of 42 stays out of frame)
const CROP42 = [160, 95, 340, 365];
const CROPS = { 30: [150, 40, 320, 420], 2531: [140, 40, 330, 400], 2577: [120, 50, 340, 420], 42: CROP42, 1217: [130, 30, 360, 440] };

// ================= war map geometry (1920×1080 map space) =================
export const MAPGEO = (() => {
  const coastY = (x) => 862 + Math.sin(x * 0.004) * 16 + Math.sin(x * 0.0013 + 2) * 24;
  const coastPoly = [];
  for (let x = 0; x <= 1920; x += 96) coastPoly.push([x, coastY(x) + 8]);
  coastPoly.push([1920, 1080], [0, 1080]);
  return {
    coastY,
    places: { hairline: [958, 218], follicle: [1482, 332], parting: [1012, 560], gap: [560, 700], coast: [700, 872] },
    roads: {
      coast: [[700, 858], [640, 760], [700, 640], [860, 500], [930, 340], [956, 244]],
      gap: [[560, 694], [680, 590], [820, 470], [920, 330], [952, 250]],
      parting: [[1012, 552], [1150, 500], [1330, 430], [1466, 350]],
    },
    arrows: {
      coast: [[790, 1014], [740, 880], [700, 720], [800, 560], [900, 400], [948, 268]],
      gap: [[470, 1014], [520, 860], [566, 706], [700, 566], [860, 434], [946, 276]],
      parting: [[984, 1014], [1000, 840], [1010, 664], [1012, 586]],
    },
    washes: {
      coast: { poly: coastPoly, origin: [900, 1170], dir: [0.1, -0.995], depth: 340 },
      gap: { poly: [[300, 596], [560, 556], [780, 586], [872, 700], [700, 836], [420, 804], [300, 700]], origin: [340, 920], dir: [0.5, -0.866], depth: 360 },
      parting: { poly: [[856, 470], [1060, 436], [1262, 446], [1344, 620], [1120, 700], [920, 648], [844, 560]], origin: [1010, 860], dir: [0.06, -0.998], depth: 300 },
    },
    front: [[140, 636], [420, 606], [700, 650], [1010, 612], [1320, 652], [1620, 616], [1820, 646]],
  };
})();
const LABELS = [
  ['hairline', 'HAIRLINE', MAPGEO.places.hairline, 0, -70],
  ['follicle', 'ST. FOLLICLE', MAPGEO.places.follicle, 138, 2],
  ['parting', 'MAIN PARTING', MAPGEO.places.parting, -192, 54],
  ['gap', 'TONSURA GAP', MAPGEO.places.gap, -132, 66],
  // bottom-right sea, on a callout leader — keeps it clear of the vo2b caption band (y≈872±60)
  // and the credit caption (x≤560) for the whole shot
  ['coast', 'THE SOUTH COAST', MAPGEO.places.coast, 770, 68],
];

// ================= painters for the "reenactment" sets =================
function skyBand(x, w, h, stops, sun) {
  const g = x.createLinearGradient(0, 0, 0, h);
  for (const [p, c] of stops) g.addColorStop(p, c);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  if (sun) {
    const s = x.createRadialGradient(sun[0], sun[1], 10, sun[0], sun[1], sun[2]);
    s.addColorStop(0, `rgba(255,232,190,${sun[3]})`); s.addColorStop(1, 'rgba(255,232,190,0)');
    x.fillStyle = s; x.fillRect(0, 0, w, h);
  }
}
function ridgeBand(x, w, baseY, amp, seed, col, colLit) {
  const r = rng(seed);
  x.beginPath(); x.moveTo(0, baseY + 60);
  for (let i = 0; i <= 24; i++) {
    const px = (w * i) / 24, py = baseY - Math.abs(Math.sin(i * 1.7 + r() * 0.9)) * amp - r() * amp * 0.4;
    x.lineTo(px, py);
    x.lineTo(px + w / 48, py + amp * 0.5);
  }
  x.lineTo(w, baseY + 60); x.closePath();
  x.fillStyle = col; x.fill();
  x.fillStyle = colLit; x.globalAlpha = 0.5; x.fill(); x.globalAlpha = 1;
}
function treeGlyph(x, tx, ty, s, col, ink) {
  x.fillStyle = ink; x.fillRect(tx - 1.5 * s, ty - 10 * s, 3 * s, 10 * s);
  x.fillStyle = col; x.beginPath(); x.arc(tx, ty - 13 * s, 6.5 * s, 0, 7); x.arc(tx - 4.5 * s, ty - 9 * s, 5 * s, 0, 7); x.arc(tx + 4.5 * s, ty - 9 * s, 5 * s, 0, 7); x.fill();
}
function house(x, cx0, feet, w, h, wall, beam, roof, win) {
  const x0 = cx0 - w / 2, y0 = feet - h;
  x.fillStyle = wall; x.fillRect(x0, y0, w, h);
  x.strokeStyle = beam; x.lineWidth = 6;
  x.strokeRect(x0 + 3, y0 + 3, w - 6, h - 3);
  x.beginPath(); x.moveTo(x0 + w * 0.32, y0); x.lineTo(x0 + w * 0.32, feet); x.moveTo(x0 + w * 0.68, y0); x.lineTo(x0 + w * 0.68, feet); x.stroke();
  // thatch roof
  x.fillStyle = roof;
  x.beginPath(); x.moveTo(x0 - 22, y0 + 6); x.lineTo(cx0, y0 - h * 0.42); x.lineTo(x0 + w + 22, y0 + 6); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(40,26,14,0.5)'; x.lineWidth = 3;
  for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(x0 - 22 + (w + 44) * (i / 5) * 0.35, y0 - 2 - (h * 0.42 * i) / 5.2); x.lineTo(cx0 + (i - 2.5) * 4, y0 - (h * 0.42 * i) / 5.2); x.stroke(); }
  // door + windows
  x.fillStyle = beam; x.fillRect(cx0 - 24, feet - 84, 48, 84);
  x.fillStyle = win; x.fillRect(x0 + 26, y0 + 30, 44, 40); x.fillRect(x0 + w - 70, y0 + 30, 44, 40);
  x.strokeStyle = beam; x.lineWidth = 4;
  x.strokeRect(x0 + 26, y0 + 30, 44, 40); x.strokeRect(x0 + w - 70, y0 + 30, 44, 40);
  x.beginPath(); x.moveTo(x0 + 48, y0 + 30); x.lineTo(x0 + 48, y0 + 70); x.moveTo(x0 + 26, y0 + 50); x.lineTo(x0 + 70, y0 + 50);
  x.moveTo(x0 + w - 48, y0 + 30); x.lineTo(x0 + w - 48, y0 + 70); x.moveTo(x0 + w - 70, y0 + 50); x.lineTo(x0 + w - 26, y0 + 50); x.stroke();
}
function groundBand(x, w, y0, y1, col, colDark, seed) {
  const r = rng(seed);
  x.fillStyle = col; x.fillRect(0, y0, w, y1 - y0);
  for (let i = 0; i < 260; i++) {
    const px = r() * w, py = y0 + r() * (y1 - y0);
    x.fillStyle = r() > 0.5 ? colDark : 'rgba(255,244,214,0.16)';
    x.fillRect(px, py, 3 + r() * 8, 2 + r() * 3);
  }
}

// ================= build =================
// Strip the greatsword baked into hero 42's near sprite: per scanline, clear the detached
// left-edge run (blade/guard/grip) when a ≥3px transparent gap separates it from the body.
// Hair/head rows merge with the body run and are spared. Deterministic, runs once in prepare().
export function stripLeftBlade(R) {
  const c = mkc(R.w, R.h), x = c.getContext('2d');
  x.drawImage(R.c, 0, 0);
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data;
  const a = (xx, y) => p[(y * R.w + xx) * 4 + 3];
  for (let y = 0; y < R.h; y++) {
    let x0 = 0;
    while (x0 < R.w && a(x0, y) === 0) x0++;
    if (x0 > 8) continue; // the blade hugs the left edge
    let x1 = x0;
    while (x1 < R.w && a(x1, y) > 0) x1++;
    if (x1 - x0 > 15) continue; // too wide to be the blade
    let gap = 0, xx = x1;
    while (xx < R.w && a(xx, y) === 0) { gap++; xx++; }
    if (gap < 3) continue; // merged with the body — spare the row
    for (let xb = x0; xb < x1; xb++) p[(y * R.w + xb) * 4 + 3] = 0;
  }
  // second pass: where the blade tucks behind the hair or merges with the hand, no gap exists,
  // so clear the left strip by COLOUR — the blade family is blue-grey / yellow (guard), while
  // hair and skin are warm (r > b). The sleeve edge starts at x≈24, so the strip ends at 23.
  for (let y = 0; y < R.h; y++) {
    for (let xx = 0; xx < 23; xx++) {
      const i = (y * R.w + xx) * 4;
      if (p[i + 3] === 0) continue;
      const r = p[i], g = p[i + 1], b = p[i + 2];
      if (b >= r || (g > 150 && b < 90 && r > 140)) p[i + 3] = 0;
    }
  }
  x.putImageData(d, 0, 0);
  const sil = mkc(R.w, R.h), sx = sil.getContext('2d');
  sx.drawImage(c, 0, 0);
  sx.globalCompositeOperation = 'source-in';
  sx.fillStyle = '#fff';
  sx.fillRect(0, 0, R.w, R.h);
  return { ...R, c, sil };
}

export async function build() {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.all([
        document.fonts.load(`600 40px "Cormorant Garamond"`),
        document.fonts.load(`700 96px Anton`),
        document.fonts.load(`600 30px "JetBrains Mono"`),
      ]);
      await document.fonts.ready;
    } catch {}
  }

  // ---------- hero's greatsword prop (ch3a draw/lift/hold beat; grip anchor at (14, 84)) ----------
  const greatsword = (() => {
    const c = mkc(28, 100), x = cx2(c);
    // grip + wraps + pommel
    x.fillStyle = '#4a3220'; x.fillRect(11, 78, 6, 12);
    x.fillStyle = '#2e1f12'; x.fillRect(11, 81, 6, 2); x.fillRect(11, 86, 6, 2);
    x.fillStyle = '#8a6a30'; x.beginPath(); x.arc(14, 93, 4.5, 0, 7); x.fill();
    x.fillStyle = '#c9a050'; x.beginPath(); x.arc(13, 92, 2, 0, 7); x.fill();
    // crossguard
    x.fillStyle = '#6a5020'; x.fillRect(3, 72, 22, 6);
    x.fillStyle = '#a8863c'; x.fillRect(3, 72, 22, 2);
    // blade with lit edge and ridge
    x.fillStyle = '#8a929a';
    x.beginPath(); x.moveTo(8, 72); x.lineTo(20, 72); x.lineTo(15, 6); x.lineTo(13, 2); x.closePath(); x.fill();
    x.fillStyle = '#d8dee4';
    x.beginPath(); x.moveTo(8, 72); x.lineTo(13, 72); x.lineTo(13.5, 8); x.closePath(); x.fill();
    x.fillStyle = '#f2f6f8'; x.fillRect(13, 10, 2, 58);
    return c;
  })();

  // ---------- ch1a: GA1 (30) museum mount, 1920×1080 ----------
  const ga1 = sepiaPlate(await orig(30), CROPS[30], 620, 814);
  const m1 = mountBoard(1920, 1080, '#262019');
  {
    const x = m1.x, px = 650, py = 112, pw = 620, ph = 814;
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(px + 10, py + 14, pw, ph); // drop shadow
    deckle(x, px, py, pw, ph);
    x.drawImage(ga1, px, py, pw, ph);
    tabs(x, px, py, pw, ph);
  }

  // ---------- ch1b: regiment 3-up wide mount, 2880×1080 (2531 · 42 · 2577) ----------
  const ids1b = [2531, 42, 2577];
  const m2 = mountBoard(2880, 1080, '#241e17');
  const panels1b = [];
  {
    const x = m2.x, pw = 640, ph = 850, py = 115;
    for (let i = 0; i < 3; i++) {
      const px = 200 + i * 920;
      const plate = sepiaPlate(await orig(ids1b[i]), ids1b[i] === 42 ? CROP42 : CROPS[ids1b[i]], pw, ph);
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(px + 9, py + 13, pw, ph);
      deckle(x, px, py, pw, ph);
      x.drawImage(plate, px, py, pw, ph);
      tabs(x, px, py, pw, ph);
      panels1b.push([px + pw / 2, py + ph / 2]);
    }
  }

  // ---------- ch2a: propaganda poster (1217 → red/black duotone), 1240×1750 ----------
  const bossImg = await orig(1217);
  const poster = (() => {
    const cw = 1240, ch = 1750, c = mkc(cw, ch), x = cx2(c);
    x.fillStyle = '#e2d2ac'; x.fillRect(0, 0, cw, ch);
    grain(x, cw, ch, 77, 8);
    // duotone of the BOSS original, Bayer-quantised to ink / red / paper
    const iw = 1000, ih = 1222, ix = 120, iy = 130;
    const tmp = mkc(iw, ih), tx = cx2(tmp);
    tx.drawImage(bossImg, CROPS[1217][0], CROPS[1217][1], CROPS[1217][2], CROPS[1217][3], 0, 0, iw, ih);
    const d = tx.getImageData(0, 0, iw, ih), p = d.data;
    const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const INK = [22, 17, 13], RED = [162, 44, 34], PAP = [228, 212, 176];
    for (let y = 0; y < ih; y++) for (let xx = 0; xx < iw; xx++) {
      const i = (y * iw + xx) * 4;
      let v = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
      v += (BAY[(y & 3) * 4 + (xx & 3)] / 16 - 0.47) * 0.16;
      const c3 = v < 0.46 ? INK : v < 0.74 ? RED : PAP;
      p[i] = c3[0]; p[i + 1] = c3[1]; p[i + 2] = c3[2];
    }
    tx.putImageData(d, 0, 0);
    x.drawImage(tmp, ix, iy, iw, ih);
    // slogan block: right-half band, two stacked lines — the lettering stays at native x≳1024
    // through the WHOLE camera swing, so it can never cross the lower-left caption zone
    x.fillStyle = '#8e2318'; x.fillRect(660, iy + ih + 24, 460, 210);
    x.fillStyle = '#191310'; x.fillRect(660, iy + ih + 24, 460, 10); x.fillRect(660, iy + ih + 224, 460, 10);
    x.font = `400 92px ${F.anton}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.letterSpacing = '4px';
    x.fillStyle = '#ecdcb2';
    x.fillText('GLOSS IS', 890, iy + ih + 24 + 62);
    x.fillText('DESTINY', 890, iy + ih + 24 + 152);
    x.letterSpacing = '0px';
    // ministry stamp: a solid ink chop on the right, above the slogan block (inside the tilt
    // path, always at native x>1000, clear of every caption band). Filled translucent red with
    // reversed cream type reads on both the dark shoulder and the cream paper.
    x.save(); x.translate(880, 1170); x.rotate(-0.12); x.globalAlpha = 0.9;
    x.fillStyle = 'rgba(126,34,24,0.6)'; x.fillRect(-220, -44, 440, 88);
    x.strokeStyle = '#e8d8b0'; x.lineWidth = 4; x.strokeRect(-212, -36, 424, 72);
    x.lineWidth = 1.5; x.strokeRect(-202, -26, 404, 52);
    x.font = `600 30px ${F.mono}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#ecdcb2';
    x.fillText('CABALD MINISTRY OF SHINE', 0, 2);
    x.restore();
    // border rules
    x.strokeStyle = '#191310'; x.lineWidth = 14; x.strokeRect(7, 7, cw - 14, ch - 14);
    x.lineWidth = 3; x.strokeRect(30, 30, cw - 60, ch - 60);
    vign(x, cw, ch, 0.26);
    return c;
  })();

  // ---------- ch2b: war map, parchment 1920×1080 + separate label canvases ----------
  const mapLabels = [];
  const map = (() => {
    const G = MAPGEO, c = mkc(1920, 1080), x = cx2(c);
    // parchment
    x.fillStyle = '#e0d0a8'; x.fillRect(0, 0, 1920, 1080);
    grain(x, 1920, 1080, 13, 8);
    const r = rng(31337);
    for (let i = 0; i < 10; i++) {
      const gx = r() * 1920, gy = r() * 1080, gr = 60 + r() * 160;
      const g = x.createRadialGradient(gx, gy, 6, gx, gy, gr);
      g.addColorStop(0, `rgba(140,104,60,${0.05 + r() * 0.05})`); g.addColorStop(1, 'rgba(140,104,60,0)');
      x.fillStyle = g; x.beginPath(); x.arc(gx, gy, gr, 0, 7); x.fill();
    }
    // faint survey grid
    x.strokeStyle = 'rgba(90,64,34,0.10)'; x.lineWidth = 1.5;
    for (let gx = 120; gx < 1920; gx += 120) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, 1080); x.stroke(); }
    for (let gy = 120; gy < 1080; gy += 120) { x.beginPath(); x.moveTo(0, gy); x.lineTo(1920, gy); x.stroke(); }
    // the sea (south of the coastline) with hatch
    x.beginPath(); x.moveTo(0, 1080);
    for (let gx = 0; gx <= 1920; gx += 48) x.lineTo(gx, G.coastY(gx));
    x.lineTo(1920, 1080); x.closePath();
    x.fillStyle = '#cdb98e'; x.fill();
    x.save(); x.clip();
    x.strokeStyle = 'rgba(90,64,34,0.10)'; x.lineWidth = 2;
    for (let gy = 872; gy < 1120; gy += 22) { // light wave-hatch: reads as water, not territory
      x.beginPath();
      for (let gx = 0; gx <= 1920; gx += 96) x.lineTo(gx, gy + Math.sin(gx * 0.05 + gy) * 3);
      x.stroke();
    }
    x.restore();
    x.strokeStyle = '#4a3826'; x.lineWidth = 4;
    x.beginPath(); for (let gx = 0; gx <= 1920; gx += 48) { const gy = G.coastY(gx); gx === 0 ? x.moveTo(gx, gy) : x.lineTo(gx, gy); } x.stroke();
    x.strokeStyle = 'rgba(255,246,220,0.5)'; x.lineWidth = 1.5;
    x.beginPath(); for (let gx = 0; gx <= 1920; gx += 48) { const gy = G.coastY(gx) + 5; gx === 0 ? x.moveTo(gx, gy) : x.lineTo(gx, gy); } x.stroke();
    // relief: hill glyphs + woods
    const hill = (hx, hy, s) => {
      x.strokeStyle = '#6a5030'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(hx - 26 * s, hy); x.lineTo(hx, hy - 16 * s); x.lineTo(hx + 26 * s, hy); x.stroke();
      x.beginPath(); x.moveTo(hx - 12 * s, hy); x.lineTo(hx + 2 * s, hy - 8 * s); x.stroke();
    };
    hill(1180, 470, 1); hill(1260, 500, 0.8); hill(760, 420, 0.9); hill(1560, 520, 0.7); hill(480, 480, 0.8);
    for (const [tx0, ty0] of [[860, 300], [900, 330], [830, 330], [1180, 350], [1220, 380], [420, 380], [460, 410], [1620, 430]]) treeGlyph(x, tx0, ty0, 1.1, '#7a6238', '#4a3826');
    // roads (dashed)
    x.strokeStyle = '#5a4226'; x.lineWidth = 5; x.setLineDash([16, 12]);
    for (const key of ['coast', 'gap', 'parting']) {
      x.beginPath();
      G.roads[key].forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
      x.stroke();
    }
    x.setLineDash([]);
    // place markers (double circle + dot)
    for (const key of Object.keys(G.places)) {
      const [px, py] = G.places[key];
      x.fillStyle = '#3a2a18'; x.beginPath(); x.arc(px, py, 7, 0, 7); x.fill();
      x.strokeStyle = '#3a2a18'; x.lineWidth = 3; x.beginPath(); x.arc(px, py, 13, 0, 7); x.stroke();
      x.strokeStyle = 'rgba(255,246,220,0.6)'; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, 15.5, 0, 7); x.stroke();
    }
    // callout leader from the coast town to its sea label (bottom-right)
    x.strokeStyle = '#5a4226'; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(716, 886); x.lineTo(1330, 932); x.stroke();
    x.fillStyle = '#3a2a18'; x.beginPath(); x.arc(716, 886, 4, 0, 7); x.fill();
    // compass rose
    x.save(); x.translate(170, 168);
    x.strokeStyle = '#5a4226'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 62, 0, 7); x.stroke();
    x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, 50, 0, 7); x.stroke();
    x.fillStyle = '#4a3826';
    x.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? 22 : 56; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); x.lineTo(Math.cos(a + Math.PI / 8) * 12, Math.sin(a + Math.PI / 8) * 12); }
    x.closePath(); x.fill();
    x.restore();
    // border
    x.strokeStyle = '#5a4226'; x.lineWidth = 6; x.strokeRect(16, 16, 1888, 1048);
    x.lineWidth = 2; x.strokeRect(30, 30, 1860, 1020);
    vign(x, 1920, 1080, 0.2);
    return c;
  })();
  // labels: separate canvases so film.js can reveal them on EV (drawn at native res)
  for (const [key, name, pos, ox, oy] of LABELS) {
    const lc = mkc(560, 64), lx = cx2(lc);
    lx.font = `600 36px ${F.serif}`; lx.textAlign = 'center'; lx.textBaseline = 'middle';
    lx.letterSpacing = '3px';
    lx.lineWidth = 7; lx.strokeStyle = 'rgba(226,208,168,0.92)'; lx.strokeText(name, 280, 30);
    lx.fillStyle = '#3a2a18'; lx.fillText(name, 280, 30);
    lx.letterSpacing = '0px';
    mapLabels.push({ key, c: lc, x: pos[0] + ox, y: pos[1] + oy });
  }
  // razor-wash hatch pattern
  const hatch = mkc(18, 18);
  {
    const hx = cx2(hatch);
    hx.strokeStyle = 'rgba(30,18,10,0.55)'; hx.lineWidth = 3.5;
    hx.beginPath(); hx.moveTo(-4, 22); hx.lineTo(22, -4); hx.moveTo(-4, 13); hx.lineTo(13, -4); hx.moveTo(5, 22); hx.lineTo(22, 5); hx.stroke();
  }

  // ---------- ch2c: village street 1920×1080 ----------
  const village = (() => {
    const c = mkc(1920, 1080), x = cx2(c);
    skyBand(x, 1920, 1080, [[0, '#cfc4a4'], [0.5, '#d6c9a6'], [0.62, '#cbbd98']], [500, 180, 420, 0.30]);
    ridgeBand(x, 1920, 470, 46, 11, '#a8946c', '#b8a67c');
    ridgeBand(x, 1920, 520, 30, 29, '#94825e', '#a5906a');
    for (let i = 0; i < 12; i++) treeGlyph(x, 60 + i * 170 + hash(i * 7) * 60, 560 + hash(i * 13) * 24, 1.6 + hash(i * 3), '#6e5c3c', '#463a24');
    // house row
    house(x, 250, 880, 300, 240, '#cbbc96', '#57422a', '#a58a58', '#3c3226');
    house(x, 610, 900, 340, 268, '#c2b28c', '#4c3a24', '#9c8252', '#3c3226');
    house(x, 990, 884, 300, 248, '#cbbc96', '#57422a', '#a58a58', '#3c3226');
    // fence
    x.strokeStyle = '#57442a'; x.lineWidth = 8;
    x.beginPath(); x.moveTo(1180, 850); x.lineTo(1740, 862); x.moveTo(1180, 906); x.lineTo(1740, 918); x.stroke();
    x.lineWidth = 10;
    for (let i = 0; i < 8; i++) { const px = 1200 + i * 76; x.beginPath(); x.moveTo(px, 828 + i * 2); x.lineTo(px, 940 + i * 2); x.stroke(); }
    // street
    groundBand(x, 1920, 900, 1080, '#b3a075', '#8f7c52', 61);
    x.strokeStyle = 'rgba(80,60,34,0.5)'; x.lineWidth = 5;
    for (const ry of [952, 1010, 1064]) {
      x.beginPath();
      for (let gx = 0; gx <= 1920; gx += 64) x.lineTo(gx, ry + Math.sin(gx * 0.02 + ry) * 5);
      x.stroke();
    }
    // lamp post
    x.fillStyle = '#3c2f1e'; x.fillRect(1345, 640, 12, 370);
    x.fillRect(1330, 628, 42, 34); x.fillRect(1351, 640, 60, 8);
    x.fillStyle = '#e8d8a8'; x.fillRect(1336, 634, 30, 22);
    // SHINE ZONE notice board
    x.save(); x.translate(1580, 806); x.rotate(0.03);
    x.fillStyle = '#4a3826'; x.fillRect(-16, 130, 26, 220); x.fillRect(150, 130, 26, 220);
    x.fillStyle = '#5c4830'; x.fillRect(-190, -120, 400, 260);
    x.fillStyle = '#e4d4ac'; x.fillRect(-172, -102, 364, 224);
    x.strokeStyle = '#4a3826'; x.lineWidth = 5; x.strokeRect(-160, -90, 340, 200);
    x.fillStyle = '#2c2118';
    x.beginPath(); x.arc(-150, -78, 6, 0, 7); x.fill(); x.beginPath(); x.arc(170, -78, 6, 0, 7); x.fill();
    x.font = `700 56px ${F.anton}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#8e2318'; x.fillText('SHINE ZONE', 10, -18);
    x.font = `600 26px ${F.mono}`; x.fillStyle = '#4a3826';
    x.fillText('BY ORDER OF THE', 10, 34);
    x.fillText('MINISTRY OF SHINE', 10, 70);
    x.restore();
    // foreground tufts
    const r = rng(88);
    x.strokeStyle = '#6e5c38'; x.lineWidth = 4;
    for (let i = 0; i < 46; i++) {
      const px = r() * 1920, py = 980 + r() * 90;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px - 6 - r() * 6, py - 16 - r() * 12); x.moveTo(px, py); x.lineTo(px + 4 + r() * 8, py - 14 - r() * 12); x.stroke();
    }
    vign(x, 1920, 1080, 0.3);
    return c;
  })();

  // ---------- ch3a: muster ridge 1920×1080 ----------
  const muster = (() => {
    const c = mkc(1920, 1080), x = cx2(c);
    skyBand(x, 1920, 1080, [[0, '#b9a67e'], [0.42, '#d8c294'], [0.6, '#e4cfa0']], [560, 250, 520, 0.42]);
    x.fillStyle = 'rgba(240,220,170,0.5)'; x.beginPath(); x.arc(560, 300, 60, 0, 7); x.fill();
    ridgeBand(x, 1920, 380, 60, 5, '#8a744e', '#a08858');
    ridgeBand(x, 1920, 450, 40, 17, '#786440', '#8d7750');
    groundBand(x, 1920, 520, 1080, '#8f7a4e', '#75613c', 41);
    // ridge crest path (the column line) + grass
    x.strokeStyle = 'rgba(96,78,44,0.6)'; x.lineWidth = 26;
    x.beginPath(); x.moveTo(300, 700); x.bezierCurveTo(700, 640, 1100, 660, 1560, 720); x.stroke();
    const r = rng(52);
    x.strokeStyle = '#6a5636'; x.lineWidth = 4;
    for (let i = 0; i < 60; i++) {
      const px = r() * 1920, py = 560 + r() * 480;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px - 5, py - 14 - r() * 10); x.moveTo(px, py); x.lineTo(px + 6, py - 12 - r() * 10); x.stroke();
    }
    for (const [tx0, ty0] of [[120, 560], [1800, 600], [1640, 560]]) treeGlyph(x, tx0, ty0, 2.2, '#5c4c30', '#3a2f1c');
    vign(x, 1920, 1080, 0.28);
    return c;
  })();

  // ---------- ch3b: battlefield near Main Parting 1920×1080 ----------
  const clash = (() => {
    const c = mkc(1920, 1080), x = cx2(c);
    skyBand(x, 1920, 1080, [[0, '#b3a887'], [0.5, '#cfc19c'], [0.64, '#c6b78f']], [900, 220, 460, 0.24]);
    ridgeBand(x, 1920, 400, 34, 23, '#8d7c56', '#a29168');
    groundBand(x, 1920, 460, 1080, '#96835a', '#7a6742', 71);
    // ploughed bands converging toward the viewer
    for (let i = 0; i < 7; i++) {
      x.strokeStyle = `rgba(90,70,40,${0.34 - i * 0.03})`; x.lineWidth = 16 - i;
      x.beginPath(); x.moveTo(960 + (i - 3) * 90, 470); x.lineTo(960 + (i - 3) * 420, 1080); x.stroke();
    }
    // broken fence + wall ruin on the horizon
    x.strokeStyle = '#4c3c24'; x.lineWidth = 9;
    for (let i = 0; i < 7; i++) { const px = 1180 + i * 90, lean = (hash(i * 9) - 0.5) * 30; x.beginPath(); x.moveTo(px, 430 + lean * 0.3); x.lineTo(px + lean, 380 + lean); x.stroke(); }
    x.lineWidth = 6; x.beginPath(); x.moveTo(1180, 404); x.lineTo(1560, 396); x.stroke();
    x.fillStyle = '#7d6c48';
    x.beginPath(); x.moveTo(160, 430); x.lineTo(160, 372); x.lineTo(280, 366); x.lineTo(300, 430); x.closePath(); x.fill();
    x.fillStyle = 'rgba(40,30,16,0.4)'; x.fillRect(214, 380, 22, 50);
    // mud + stones + a bare tree
    const r = rng(1949);
    for (let i = 0; i < 90; i++) {
      const px = r() * 1920, py = 500 + r() * 560;
      x.fillStyle = r() > 0.5 ? '#6e5c3a' : '#b3a274';
      x.beginPath(); x.ellipse(px, py, 4 + r() * 9, 3 + r() * 5, r() * 3, 0, 7); x.fill();
    }
    x.strokeStyle = '#3c3020'; x.lineWidth = 10;
    x.beginPath(); x.moveTo(140, 560); x.lineTo(132, 440); x.moveTo(136, 500); x.lineTo(96, 440); x.moveTo(136, 470); x.lineTo(176, 416); x.stroke();
    vign(x, 1920, 1080, 0.3);
    return c;
  })();

  // ---------- banner: HAIR RETURNS (cloth) ----------
  const banner = (() => {
    const c = mkc(660, 380), x = cx2(c);
    // rope
    x.strokeStyle = '#6a5028'; x.lineWidth = 6;
    x.beginPath(); x.moveTo(20, 24); x.lineTo(640, 24); x.stroke();
    // cloth with weave shading
    x.fillStyle = '#e6d3a2';
    x.beginPath(); x.moveTo(30, 30); x.lineTo(630, 30); x.lineTo(626, 330); x.quadraticCurveTo(330, 352, 34, 330); x.closePath(); x.fill();
    for (let i = 0; i < 10; i++) {
      x.fillStyle = `rgba(120,92,44,${0.05 + (i % 3) * 0.03})`;
      x.beginPath();
      x.moveTo(30, 30 + i * 30);
      x.quadraticCurveTo(330, 44 + i * 30 + Math.sin(i) * 8, 630, 30 + i * 30);
      x.lineTo(630, 40 + i * 30);
      x.quadraticCurveTo(330, 54 + i * 30 + Math.sin(i) * 8, 30, 40 + i * 30);
      x.closePath(); x.fill();
    }
    x.strokeStyle = '#8e2318'; x.lineWidth = 8;
    x.beginPath(); x.moveTo(42, 44); x.lineTo(618, 44); x.lineTo(614, 316); x.quadraticCurveTo(330, 336, 46, 316); x.closePath(); x.stroke();
    // lettering
    x.font = `700 92px ${F.anton}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.letterSpacing = '4px';
    x.fillStyle = '#7c1f14';
    x.save(); x.translate(330, 150); x.rotate(0.012); x.fillText('HAIR', 0, -26); x.fillText('RETURNS', 0, 64); x.restore();
    x.letterSpacing = '0px';
    // rod ends
    x.fillStyle = '#3c2c18'; x.beginPath(); x.arc(20, 24, 12, 0, 7); x.fill(); x.beginPath(); x.arc(640, 24, 12, 0, 7); x.fill();
    return c;
  })();

  // ---------- memorial: dawn backing + shelf (1920×1080) and wreath ----------
  const dawn = (() => {
    const c = mkc(1920, 1080), x = cx2(c);
    skyBand(x, 1920, 1080, [[0, '#191827'], [0.3, '#33283c'], [0.52, '#6e4438'], [0.62, '#a86a3c'], [0.72, '#3a2a22'], [1, '#17120e']], [430, 620, 700, 0.30]);
    // faint cloud streaks
    x.strokeStyle = 'rgba(232,180,120,0.10)'; x.lineWidth = 8;
    for (let i = 0; i < 7; i++) {
      const y0 = 160 + i * 70;
      x.beginPath(); x.moveTo(1400 - hash(i) * 500, y0); x.bezierCurveTo(1500, y0 - 16, 1700, y0 + 12, 1980, y0 - 6); x.stroke();
    }
    vign(x, 1920, 1080, 0.34);
    return c;
  })();
  // shelf: separate transparent canvas drawn OVER the wall (screen-fixed furniture), y 900..1080
  const shelf = (() => {
    const c = mkc(1920, 180), x = cx2(c);
    x.fillStyle = '#241c14'; x.fillRect(0, 42, 1920, 138);
    x.fillStyle = '#33281c'; x.fillRect(0, 42, 1920, 16);
    x.fillStyle = 'rgba(232,190,130,0.16)'; x.fillRect(0, 42, 1920, 4);
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 3;
    for (let i = 0; i < 12; i++) { const px = 40 + i * 164 + hash(i * 5) * 30; x.beginPath(); x.moveTo(px, 58); x.lineTo(px - 14, 180); x.stroke(); }
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(0, 30, 1920, 12);
    return c;
  })();
  const wreath = (() => {
    const c = mkc(400, 400), x = cx2(c);
    const r = rng(4242);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 26; i++) {
        const a = -Math.PI / 2 + side * (0.25 + (i / 26) * 1.32 * Math.PI);
        const px = 200 + Math.cos(a) * 150, py = 200 + Math.sin(a) * 150;
        x.save(); x.translate(px, py); x.rotate(a + side * 1.9);
        x.fillStyle = i % 3 ? '#3c6230' : '#4c7638';
        x.beginPath(); x.ellipse(10, 0, 23, 9, 0, 0, 7); x.fill();
        x.fillStyle = 'rgba(196,226,140,0.55)';
        x.beginPath(); x.ellipse(14, -3.5, 13, 4.5, 0, 0, 7); x.fill();
        x.strokeStyle = 'rgba(16,26,10,0.6)'; x.lineWidth = 1.5;
        x.beginPath(); x.ellipse(10, 0, 23, 9, 0, 0, 7); x.stroke();
        x.restore();
      }
    }
    // ribbon
    x.fillStyle = '#8e2318';
    x.beginPath(); x.moveTo(200, 336); x.lineTo(158, 390); x.lineTo(196, 378); x.lineTo(200, 394); x.lineTo(204, 378); x.lineTo(242, 390); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,220,170,0.25)';
    x.beginPath(); x.moveTo(200, 336); x.lineTo(184, 356); x.lineTo(216, 356); x.closePath(); x.fill();
    return c;
  })();

  // ---------- interview set 1920×1080 + aged veteran portrait ----------
  const heroImgPromise = await orig(42);
  const set = (() => {
    const c = mkc(1920, 1080), x = cx2(c);
    x.fillStyle = '#141210'; x.fillRect(0, 0, 1920, 1080);
    // wall tone + floor line
    const wg = x.createLinearGradient(0, 0, 1920, 200);
    wg.addColorStop(0, '#211d18'); wg.addColorStop(1, '#12100c');
    x.fillStyle = wg; x.fillRect(0, 0, 1920, 880);
    x.fillStyle = '#0d0b09'; x.fillRect(0, 880, 1920, 200);
    x.fillStyle = 'rgba(232,190,130,0.05)'; x.fillRect(0, 878, 1920, 3);
    // out-of-focus bookshelf, frame-left
    x.save(); x.filter = 'blur(9px)';
    x.fillStyle = '#241d15'; x.fillRect(30, 180, 330, 700);
    const r = rng(1234);
    for (let sh = 0; sh < 5; sh++) {
      const sy = 210 + sh * 132;
      x.fillStyle = '#1a140e'; x.fillRect(40, sy + 92, 310, 14);
      let bx = 52;
      while (bx < 320) {
        const bw = 16 + r() * 26, bh = 62 + r() * 26;
        x.fillStyle = `hsl(${18 + r() * 22}, ${18 + r() * 16}%, ${14 + r() * 12}%)`;
        x.fillRect(bx, sy + 92 - bh, bw, bh);
        bx += bw + 3 + r() * 5;
      }
    }
    x.restore();
    // drape, frame-right
    for (let i = 0; i < 10; i++) {
      const px = 1600 + i * 34;
      x.fillStyle = `rgba(30,24,18,${0.5 + (i % 2) * 0.3})`;
      x.beginPath(); x.moveTo(px, 0); x.quadraticCurveTo(px + 30, 540, px - 8, 1080); x.lineTo(px + 40, 1080); x.quadraticCurveTo(px + 60, 540, px + 42, 0); x.closePath(); x.fill();
    }
    // chair silhouette, left-foreground
    x.fillStyle = '#0b0908';
    x.beginPath(); x.moveTo(60, 1080); x.quadraticCurveTo(70, 700, 200, 660); x.quadraticCurveTo(360, 640, 420, 760); x.lineTo(470, 1080); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(150, 690); x.quadraticCurveTo(210, 560, 330, 620); x.quadraticCurveTo(250, 700, 160, 760); x.closePath(); x.fill();
    // warm key from frame-left
    const key = x.createRadialGradient(240, 260, 40, 240, 260, 1150);
    key.addColorStop(0, 'rgba(255,196,110,0.34)'); key.addColorStop(0.4, 'rgba(255,176,96,0.12)'); key.addColorStop(1, 'rgba(255,176,96,0)');
    x.fillStyle = key; x.fillRect(0, 0, 1920, 1080);
    // pool of light where the portrait hangs
    const pool = x.createRadialGradient(1140, 470, 60, 1140, 470, 620);
    pool.addColorStop(0, 'rgba(255,208,140,0.20)'); pool.addColorStop(1, 'rgba(255,208,140,0)');
    x.fillStyle = pool; x.fillRect(520, 0, 1300, 1080);
    vign(x, 1920, 1080, 0.5, [4, 3, 2]);
    return c;
  })();
  const vetPortrait = (() => {
    // framed chest-up portrait of 42, graded old: desaturated, dimmed, warm
    const heroImg = heroImgPromise; // loaded above
    void heroImg;
    const fr = 46, pw = 560, ph = 640;
    const c = mkc(pw + fr * 2, ph + fr * 2), x = cx2(c);
    x.fillStyle = '#0a0806'; x.fillRect(0, 0, c.width, c.height);
    const inner = mkc(pw, ph), ix = cx2(inner);
    ix.drawImage(heroImg, CROP42[0], CROP42[1], CROP42[2], CROP42[3], 0, 0, pw, ph);
    const d = ix.getImageData(0, 0, pw, ph), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      p[i] = Math.min(255, lum * 0.52 + p[i] * 0.30 + 26);
      p[i + 1] = Math.min(255, lum * 0.50 + p[i + 1] * 0.28 + 18);
      p[i + 2] = Math.min(255, lum * 0.46 + p[i + 2] * 0.24 + 12);
    }
    ix.putImageData(d, 0, 0);
    const vg = ix.createRadialGradient(pw / 2, ph / 2, pw * 0.2, pw / 2, ph / 2, pw * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,4,3,0.55)');
    ix.fillStyle = vg; ix.fillRect(0, 0, pw, ph);
    x.drawImage(inner, fr, fr);
    // thin double frame
    x.strokeStyle = '#4a3a24'; x.lineWidth = 8; x.strokeRect(fr - 4, fr - 4, pw + 8, ph + 8);
    x.strokeStyle = '#241a10'; x.lineWidth = 22; x.strokeRect(fr - 15, fr - 15, pw + 30, ph + 30);
    x.strokeStyle = 'rgba(232,190,130,0.25)'; x.lineWidth = 2; x.strokeRect(fr + 3, fr + 3, pw - 6, ph - 6);
    return c;
  })();

  // ---------- shared PRESENT backings + archival vignette ----------
  const charcoal = (() => {
    const c = mkc(1920, 1080), x = cx2(c);
    x.fillStyle = '#15120e'; x.fillRect(0, 0, 1920, 1080);
    grain(x, 1920, 1080, 5, 5);
    const g = x.createRadialGradient(960, 470, 100, 960, 500, 1200);
    g.addColorStop(0, 'rgba(52,40,26,0.30)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 1920, 1080);
    vign(x, 1920, 1080, 0.5, [3, 2, 2]);
    return c;
  })();
  const paper = (() => {
    const c = mkc(1920, 1080), x = cx2(c);
    x.fillStyle = '#1b1712'; x.fillRect(0, 0, 1920, 1080);
    grain(x, 1920, 1080, 9, 7);
    const g = x.createRadialGradient(960, 520, 120, 960, 540, 1150);
    g.addColorStop(0, 'rgba(64,50,32,0.24)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 1920, 1080);
    vign(x, 1920, 1080, 0.42, [3, 2, 2]);
    return c;
  })();
  const vig = (() => {
    const c = mkc(960, 540), x = cx2(c);
    const g = x.createRadialGradient(480, 270, 190, 480, 270, 610);
    g.addColorStop(0, 'rgba(16,10,6,0)'); g.addColorStop(0.75, 'rgba(16,10,6,0.12)'); g.addColorStop(1, 'rgba(16,10,6,0.55)');
    x.fillStyle = g; x.fillRect(0, 0, 960, 540);
    return c;
  })();

  return {
    plate1a: { c: m1.c, rect: [650, 112, 620, 814] },
    plate1b: { c: m2.c, panels: panels1b },
    poster, map, mapLabels, hatch, MAPGEO,
    village, muster, clash, banner, dawn, shelf, wreath, greatsword,
    set, vetPortrait, charcoal, paper, vig,
  };
}
