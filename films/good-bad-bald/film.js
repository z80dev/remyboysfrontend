// THE GOOD, THE BAD & THE BALD — a Remy Boys western.
// 72 s · 120 BPM · smooth painted 1080p with a 960×540 pixel stage for the actor shots,
// 2.39:1 letterbox. Cast: GOOD 109 (Crimson Flow) vs the Cabald — BAD 5, BALD 1217,
// gang 233/419/142. Hair is justice. One hit-stop clock on the quick-draw.
import { W, H, seg, lerp, E, hash, txt, F } from 'filmkit/lib.js';
import { slam } from 'filmkit/motion.js';
import * as A from '../remy-bros/art.js'; // shared rig: canvas, loadRemy, drawRemy, loadHeads, headIcon
import { T, EV, HEARTBEATS, DRAW_CLOCK, CAST, TRIO, DURATION, CAPTIONS, FLASHES } from './timeline.js';
import { build, TOWN_LAYOUT, SALOON_LAYOUT } from './art.js';
import { score } from './score.js';

const LW = 960, LH = 540; // native pixel-stage size, upscaled 2× nearest
const ART = {};
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const L2 = (v) => v / 2; // baked layouts are 1920×1080; the stage is 960×540

// street geometry, derived from the baked town layout.
// stand lines are clamped above the 2.39:1 letterbox crop (visible band ends at low-canvas y≈471)
const DOOR = { x: L2(TOWN_LAYOUT.doorX), y: L2(TOWN_LAYOUT.doorY), w: L2(TOWN_LAYOUT.doorW), h: L2(TOWN_LAYOUT.doorH) };
const ST_Y = Math.min(L2(TOWN_LAYOUT.streetFeetY), 462);
const PORCH_Y = Math.min(L2(TOWN_LAYOUT.porchFeetY), 466);
const TUMBLE_Y = 469;
const POST_X = L2(TOWN_LAYOUT.postX);
const MARKS = { hero: DOOR.x - 330, bad: DOOR.x - 160, bald: DOOR.x - 84, g1: DOOR.x - 20, g2: DOOR.x - 240 };
const BAR_X = L2(SALOON_LAYOUT.barX), BAR_Y = L2(SALOON_LAYOUT.barFeetY);
const TABLE_X = L2(SALOON_LAYOUT.tableX), TABLE_Y = Math.min(L2(SALOON_LAYOUT.tableFeetY), 462);
const SALOON_FRONT = 460, COUNTER_TOP = 338; // hero's floor line; bar counter top (occludes the keeper's legs)
const POSTER_X = L2(SALOON_LAYOUT.posterX), POSTER_Y = L2(SALOON_LAYOUT.posterY);

const ECU_CROP = {
  [CAST.GOOD]: [130, 110, 350, 270],
  [CAST.BAD]: [120, 90, 370, 290],
  [CAST.BALD]: [130, 80, 350, 300],
};
const HAT_K = 0.62;  // hat scale per rig scale
const TUP_K = 0.5;   // toupee scale per rig scale

async function img(url) { const i = new Image(); i.src = url; await i.decode(); return i; }

// ---- pure path helpers (positions from absolute time only) ----
const walk = (dist) => {
  const s = Math.sin(dist / 26 * Math.PI * 2);
  return { lift: [Math.max(0, s) * 3, Math.max(0, -s) * 3], stride: [s * 2, -s * 2], lean: 0.05 };
};
const easeWalk = (t, t0, t1, x0, x1) => {
  const u = clamp01((t - t0) / (t1 - t0));
  return { x: lerp(x0, x1, u), phase: u * (x1 - x0), moving: t >= t0 && t < t1 };
};
function ballPos(t, t0, x0, y0, vx, vy, g) {
  const a = t - t0;
  if (a < 0) return null;
  return { x: x0 + vx * a, y: y0 + vy * a + 0.5 * g * a * a, a };
}
const hbPulse = (t) => {
  let p = 0;
  for (const h of HEARTBEATS) { const d = t - h; if (d >= 0 && d < 0.5) p = Math.max(p, Math.exp(-d * 14)); }
  return p;
};

// ---- analytic particles (immutable event lists; closed-form positions per frame) ----
const DUST = [];
for (let i = 0; i < 16; i++) DUST.push({ t: EV.enter + i * 0.38, r: 2 + hash(i * 7) * 2 });
const SHING = EV.shing.map((t, i) => ({ t, dx: 26 + i * 14 }));
const SMOKE = []; // g-domain (draw shot): launch at g 1.0, drift through the freeze
for (let i = 0; i < 6; i++) SMOKE.push({ t: 1.0 + i * 0.12, vx: 26 + hash(i * 31) * 26, vy: -14 - hash(i * 17) * 16, r: 4 + hash(i * 3) * 3 });
const SCATTER = [];
for (let i = 0; i < 10; i++) SCATTER.push({ t: 3.55 + i * 0.14, vx: 130 + hash(i * 11) * 120, vy: -70 - hash(i * 5) * 90, r: 2 + hash(i * 13) * 3 });
const GOLD = [];
for (let i = 0; i < 16; i++) {
  const an = -Math.PI / 2 + (hash(i * 19) - 0.5) * 2.4;
  GOLD.push({ t: EV.hairToss, vx: Math.cos(an) * (60 + hash(i * 23) * 130), vy: Math.sin(an) * (90 + hash(i * 29) * 120), r: 1.5 + hash(i * 31) * 2.5, c: hash(i * 37) > 0.5 ? '#ffd984' : '#ffedbe' });
}

function paintPuffs(x, t, list, baseX, baseY, col) {
  for (const p of list) {
    const age = t - p.t;
    if (age < 0 || age > 1.1) continue;
    const u = age / 1.1;
    x.globalAlpha = 0.4 * (1 - u) * (1 - u);
    x.fillStyle = col;
    x.beginPath();
    x.arc(baseX + (p.vx || 0) * age + u * 20, baseY - (p.vy ? -p.vy * age - 90 * age * age : u * 14), p.r + u * 10, 0, 7);
    x.fill();
  }
  x.globalAlpha = 1;
}

// ---- pixel-stage helpers ----
function lowCtx() { const x = ART.low.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false; x.globalAlpha = 1; return x; }
function blit(ctx) { ctx.imageSmoothingEnabled = false; ctx.drawImage(ART.low, 0, 0, LW, LH, 0, 0, W, H); }
function remy(x, R, px, feet, s, o = {}) {
  x.fillStyle = 'rgba(38,20,9,0.34)';
  x.beginPath(); x.ellipse(px, feet + 2, 27 * s, 4.5 * s, 0, 0, 7); x.fill();
  A.drawRemy(x, R, Math.round(px), Math.round(feet), { sx: s, sy: s, ...o });
}
function prop(x, c, px, py, s, rot = 0) {
  x.save(); x.translate(Math.round(px), Math.round(py)); x.rotate(rot); x.scale(s, s);
  x.drawImage(c, -c.width / 2, -c.height / 2); x.restore();
}
function propBottom(x, c, px, bottomY, s, rot = 0) {
  prop(x, c, px, bottomY - (c.height * s) / 2, s, rot);
}
const headTop = (R, feet, s) => feet - (R.bottom - R.top) * s - 4 * s;
function doors(x, ang) {
  const d = ART.doors;
  const wy = DOOR.y + 31, wh = DOOR.h - 54; // wings hang mid-opening, like real batwings
  x.save();
  x.translate(DOOR.x, wy);
  x.save(); x.rotate(-ang); x.drawImage(d.L, 0, -wh, DOOR.w / 2, wh); x.restore();
  x.save(); x.translate(DOOR.w, 0); x.rotate(ang); x.scale(-1, 1); x.drawImage(d.R, 0, -wh, DOOR.w / 2, wh); x.restore();
  x.restore();
}
function windmill(x, t) {
  const w = ART.windmill, s = 0.45, bx = 200, by = 262;
  x.save(); x.imageSmoothingEnabled = true;
  x.drawImage(w.tower, bx - w.tower.width * s / 2, by - w.tower.height * s, w.tower.width * s, w.tower.height * s);
  x.translate(bx, by - w.tower.height * s); x.rotate(t * 0.85);
  x.drawImage(w.blades, -w.blades.width * s / 2, -w.blades.height * s / 2, w.blades.width * s, w.blades.height * s);
  x.restore();
}
function tumble(x, t0, t, x0, x1, y, s, scoopedAt = -1) {
  const u = (t - t0) / 3.6;
  if (u < 0 || u > 1.15) return null;
  const px = lerp(x0, x1, u);
  const py = y - Math.abs(Math.sin(u * 26)) * 26 * s;
  prop(x, ART.tumbleweed, px, py, s, -u * 14);
  if (scoopedAt > 0 && t >= scoopedAt) {
    const v = clamp01((t - scoopedAt) / 0.3);
    prop(x, ART.toupee, px, py - 34 * s + (1 - v) * 26, 0.9, Math.sin(t * 7) * 0.12 * v);
  }
  return { x: px, y: py };
}

// ---- full-frame ECU insert cut from a 600×600 original (smooth, over the pixel stage) ----
function insertCut(ctx, art, crop, t, t0, t1, drift = 1.09, decor = null) {
  const [sx, sy, sw, sh] = crop;
  const z = lerp(1, drift, clamp01((t - t0) / (t1 - t0)));
  const k = Math.max(W / sw, H / sh) * z;
  const ox = (W - sw * k) / 2, oy = (H - sh * k) / 2;
  ctx.save(); ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = Math.min(1, (t - t0) / 0.15);
  ctx.drawImage(art, sx, sy, sw, sh, ox, oy, sw * k, sh * k);
  ctx.restore(); ctx.globalAlpha = 1;
  if (decor) decor(k, ox, oy);
}
// the Bald's toupee, fluttering over his portrait crown during ECU inserts
function ecuToupee(ctx, t, t0) {
  return (s, ox, oy) => {
    const age = t - t0;
    const fl = Math.sin(t * 9) * 0.05 - Math.min(0.12, age * 0.05);
    ctx.save(); ctx.translate(ox + 185 * s, oy + 24 * s); ctx.rotate(fl);
    ctx.scale(s * 0.52, s * 0.52); ctx.drawImage(ART.toupee, -55, -20); ctx.restore();
  };
}

// dark silhouette through the scratch canvas (finale walk)
function silhouetteRig(ctx, R, px, py, s, dist, flip) {
  const sc = ART.scratch, x = sc.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, sc.width, sc.height);
  x.imageSmoothingEnabled = false;
  A.drawRemy(x, R, 70, 210, { ...walk(dist), sx: s, sy: s, flip });
  x.globalCompositeOperation = 'source-in'; x.fillStyle = '#170b10'; x.fillRect(0, 0, sc.width, sc.height);
  x.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.translate(Math.round(px), Math.round(py)); ctx.scale(s, s); ctx.drawImage(sc, -70, -210); ctx.restore();
}
function silhouetteImg(ctx, c, px, py, s, flip) {
  const sc = ART.scratch, x = sc.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, sc.width, sc.height);
  x.imageSmoothingEnabled = true;
  const k = Math.min(sc.width / c.width, sc.height / c.height);
  const dw = c.width * k, dh = c.height * k;
  x.save(); if (flip) { x.translate(dw, 0); x.scale(-1, 1); } x.drawImage(c, 0, 0, dw, dh); x.restore();
  x.globalCompositeOperation = 'source-in'; x.fillStyle = '#170b10'; x.fillRect(0, 0, sc.width, sc.height);
  x.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(px), Math.round(py)); ctx.scale(s / k, s / k); ctx.drawImage(sc, -dw / 2, -dh); ctx.restore();
}

export default {
  title: 'THE GOOD, THE BAD & THE BALD — a Remy Boys western',
  output: 'good-bad-bald.mp4',
  duration: DURATION,

  async prepare() {
    await document.fonts?.ready;
    Object.assign(ART, await build());
    for (const k of ['town', 'saloon']) {
      const c = A.canvas(LW, LH), x = c.getContext('2d');
      x.imageSmoothingEnabled = true;
      x.drawImage(ART[k], 0, 0, ART[k].width, ART[k].height, 0, 0, LW, LH);
      ART[k + 'Low'] = c;
    }
    ART.low = A.canvas(LW, LH);
    ART.scratch = A.canvas(220, 260);
    ART.good = await A.loadRemy(CAST.GOOD, false);
    ART.bad = await A.loadRemy(CAST.BAD, false);
    ART.bald = await A.loadRemy(CAST.BALD, false);
    ART.g1 = await A.loadRemy(CAST.GANG[0], false);
    ART.g2 = await A.loadRemy(CAST.GANG[1], false);
    ART.keeper = await A.loadRemy(CAST.KEEPER, false);
    ART.pat1 = await A.loadRemy(CAST.PATRONS[0], false);
    ART.pat2 = await A.loadRemy(CAST.PATRONS[1], false);
    for (const m of TRIO) ART['art' + m.id] = await img(new URL(`../../media/remy/Character${m.id}.webp`, import.meta.url).href);
    const heads = await A.loadHeads();
    ART.hIcons = TRIO.map((m) => A.headIcon(heads, m.id, 2));
  },

  captions: CAPTIONS,
  captionStyles: {
    loc: { size: 30, font: F.mono, weight: 600, color: '#f3e6c8', track: 7, align: 'center', x: 960, y: 834, anim: 'fade', in: 0.4, out: 0.4, shadow: '#241108', glow: '#200e06', glowBlur: 16 },
    tag: { size: 46, font: F.anton, color: '#f3e6c8', track: 3, align: 'center', x: 960, y: 834, anim: 'fade', in: 0.35, out: 0.35, shadow: '#241108', glow: '#200e06', glowBlur: 20 },
    stampc: { size: 124, font: F.anton, color: '#c22531', track: 2, align: 'center', x: 960, y: 540, anim: 'cut', in: 0, out: 0.25, shadow: '#1a0508' },
  },

  flashes: FLASHES,

  score,
  audio: { seed: 11, reverb: 1.6, reverbGain: 0.3 },
  grid: { bar: 2 },
  lint: { safe: { margin: 0.03, letterbox: true } },

  shots: [
    // ---------------- dawn 0–8 ----------------
    {
      name: 'dawn', t0: T.dawn, t1: T.title,
      draw(ctx, lt) {
        ctx.drawImage(ART.dawnSky, 0, 0);
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = `rgba(255,220,170,${0.045 + 0.02 * Math.sin(lt * 3 + i * 2.1)})`;
          ctx.fillRect(0, 585 + i * 26 + Math.sin(lt * 2.2 + i) * 3, W, 9);
        }
        const f = ART.horseGallop[Math.floor(lt * 5.5) % 4];
        prop(ctx, f, -180 + lt * 285, 648, 1.4);
        tumble(ctx, EV.tumble1, lt, 2050, -160, 952, 2.1);
        const a = 1 - seg(lt, 0, 1.1);
        if (a > 0) { ctx.fillStyle = `rgba(6,4,10,${a})`; ctx.fillRect(0, 0, W, H); }
      },
      fx: () => ({ letterbox: 1, warm: 0.34, bloom: 0.07, bloomThresh: 0.86, vignette: 0.52, grain: 0.014 }),
    },

    // ---------------- title 8–16 ----------------
    {
      name: 'title', t0: T.title, t1: T.town,
      draw(ctx, lt, dur, t, overlay) {
        ctx.drawImage(ART.titleSky, 0, 0);
        const ins = [[EV.p1, 330], [EV.p2, 960], [EV.p3, 1590]];
        ins.forEach(([te, px], i) => {
          const u = clamp01((t - te) / 0.32);
          if (u <= 0) return;
          const e = E.outBack(u);
          const cx = lerp(px + (i === 0 ? -520 : i === 2 ? 520 : 0), px, e);
          const w = 360, h = 420, top = 214;
          ctx.fillStyle = '#1c0f0c'; ctx.fillRect(cx - w / 2 - 8, top - 8, w + 16, h + 16);
          const art = ART['art' + TRIO[i].id];
          ctx.save(); ctx.beginPath(); ctx.rect(cx - w / 2, top, w, h); ctx.clip();
          ctx.drawImage(art, 10, 20, 580, 580, cx - w / 2, top, w, h * 0.8);
          ctx.fillStyle = '#e9d9b8'; ctx.fillRect(cx - w / 2, top + h * 0.8, w, h * 0.2);
          ctx.restore();
          txt(ctx, TRIO[i].name, cx, top + h * 0.85, { size: 34, font: F.anton, align: 'center', color: '#241207', track: 2 });
          txt(ctx, TRIO[i].epithet, cx, top + h * 0.945, { size: 17, font: F.mono, weight: 600, align: 'center', color: '#7a4a2a', track: 5 });
          if (u < 1) { ctx.fillStyle = `rgba(230,200,150,${0.4 * (1 - u)})`; ctx.fillRect(cx - w / 2, top + h - 24, w, 24); }
        });
        const o = overlay;
        const p = clamp01((t - EV.titleSlam) / 0.38);
        if (p > 0) {
          slam(o, 'THE GOOD, THE BAD', 960, 742, p, { size: 122, font: F.anton, color: '#f6ead0', track: 5, glow: '#6d1c12', glowBlur: 28 });
          slam(o, '& THE BALD', 960, 858, clamp01(p - 0.12), { size: 122, font: F.anton, color: '#e8b23a', track: 8, glow: '#6d3a08', glowBlur: 28 });
        }
        if (t >= EV.subline) {
          txt(o, 'A  REMY  BOYS  WESTERN', 960, 184, { size: 30, font: F.mono, weight: 600, align: 'center', color: '#f3e6c8', track: 12, alpha: clamp01((t - EV.subline) / 0.5) });
        }
      },
      fx: () => ({ letterbox: 1, warm: 0.5, bloom: 0.1, bloomThresh: 0.84, vignette: 0.55, grain: 0.012 }),
    },

    // ---------------- town 16–24 ----------------
    {
      name: 'town', t0: T.town, t1: T.saloon,
      draw(ctx, lt, dur, t) {
        const x = lowCtx();
        x.drawImage(ART.townLow, 0, 0);
        windmill(x, t);
        const sway = Math.sin(t * 1.7) * 0.02;
        remy(x, ART.g1, DOOR.x + 104, PORCH_Y, 1.28, { flip: true, lean: sway });
        remy(x, ART.g2, DOOR.x + 176, PORCH_Y, 1.28, { flip: true, lean: -sway });
        const h = easeWalk(t, EV.enter, EV.walkDoors + 0.9, 40, DOOR.x - 36);
        remy(x, ART.good, h.x, ST_Y, 1.6, { ...(h.moving ? walk(h.phase) : { lean: -0.03 }), glow: '#ffd9a0', glowA: 0.22 });
        paintPuffs(x, t, DUST, h.x, ST_Y - 6, '#d8b98a');
        propBottom(x, ART.horseStand.c, 470, ST_Y + 4, 0.85);
        propBottom(x, Math.sin(t * 2.4) > 0 ? ART.horseStand.tailA : ART.horseStand.tailB, 470, ST_Y + 4, 0.85);
        const ang = 1.25 * E.outCubic(clamp01((t - EV.doorsSwing) / 0.5));
        doors(x, ang);
        blit(ctx);
      },
      fx: () => ({ letterbox: 1, warm: 0.4, bloom: 0.05, bloomThresh: 0.88, vignette: 0.5, grain: 0.013 }),
    },

    // ---------------- saloon 24–34 ----------------
    {
      name: 'saloon', t0: T.saloon, t1: T.standoff,
      draw(ctx, lt, dur, t) {
        const x = lowCtx();
        const push = E.outCubic(seg(t, EV.posterIn, EV.posterIn + 1.8)) * 0.32
          * (1 - E.inOutCubic(seg(t, 30.5, 31.0)));
        x.fillStyle = '#22120d'; x.fillRect(0, 0, LW, LH); // repaint: no stale pixels in the push margin
        const pcx = POSTER_X + 110, pcy = POSTER_Y + 170, pn = push / 0.32;
        x.save();
        x.translate((460 - pcx) * pn, (280 - pcy) * pn);   // pan toward screen center, identity at rest
        x.translate(pcx, pcy); x.scale(1 + push, 1 + push); x.translate(-pcx, -pcy);
        x.drawImage(ART.saloonLow, 0, 0);
        x.save(); x.beginPath(); x.rect(0, 0, LW, COUNTER_TOP); x.clip(); // keeper stands behind the bar
        remy(x, ART.keeper, BAR_X, BAR_Y, 1.5, { lean: Math.sin(t * 1.3) * 0.015 });
        x.restore();
        remy(x, ART.pat1, TABLE_X - 74, TABLE_Y, 1.42, { flip: true, lean: 0.02 });
        remy(x, ART.pat2, TABLE_X + 88, TABLE_Y, 1.42, { flip: true, lean: -0.02 });
        const gr = Math.sin(t * 2.1) * 0.03;
        remy(x, ART.bad, TABLE_X + 246, TABLE_Y + 8, 1.46, { flip: true, lean: gr });
        prop(x, ART.hat, TABLE_X + 246, headTop(ART.bad, TABLE_Y + 8, 1.46) + 8, HAT_K * 1.46);
        remy(x, ART.bald, TABLE_X + 340, TABLE_Y + 8, 1.46, { flip: true, lean: -gr });
        prop(x, ART.toupee, TABLE_X + 340, headTop(ART.bald, TABLE_Y + 8, 1.46) + 10, TUP_K * 1.46, Math.sin(t * 5.2) * 0.03);
        const g = easeWalk(t, 24.2, 26.3, -70, BAR_X - 150);
        remy(x, ART.good, g.x, SALOON_FRONT, 1.55, { ...(g.moving ? walk(g.phase) : { lean: 0.04 }), glow: '#ffd9a0', glowA: 0.12 });
        const pu = clamp01((t - 24.9) / 0.5);
        x.save(); x.globalAlpha = pu; x.translate(POSTER_X, POSTER_Y + 20 - (1 - pu) * 12);
        x.drawImage(ART.poster, 0, 0, 220, 300); x.restore();
        for (const s of SHING) {
          const a = t - s.t;
          if (a < 0 || a > 0.24) continue;
          const u = a / 0.24, gx = TABLE_X + 300 + s.dx * 0.4, gy = TABLE_Y - 58;
          x.strokeStyle = `rgba(255,255,240,${1 - u})`; x.lineWidth = 2;
          x.beginPath(); x.moveTo(gx - 16 * u, gy + 10 * u); x.lineTo(gx + 16 * u, gy - 10 * u); x.stroke();
        }
        if (t >= EV.fly[0] && t <= EV.fly[1] + 0.4) {
          const ft = t * 5.1;
          x.fillStyle = '#181008';
          x.fillRect(TABLE_X + 200 + Math.sin(ft) * 54, TABLE_Y - 120 + Math.sin(ft * 1.7) * 30, 3, 3);
        }
        x.restore();
        blit(ctx);
        if (t >= EV.cuGood[0] && t < EV.cuGood[1]) insertCut(ctx, ART['art' + CAST.GOOD], ECU_CROP[CAST.GOOD], t, EV.cuGood[0], EV.cuGood[1]);
        else if (t >= EV.cuBad[0] && t < EV.cuBad[1]) insertCut(ctx, ART['art' + CAST.BAD], ECU_CROP[CAST.BAD], t, EV.cuBad[0], EV.cuBad[1]);
      },
      fx: () => ({ letterbox: 1, warm: 0.26, sat: 0.94, contrast: 1.03, vignette: 0.62, grain: 0.015 }),
    },

    // ---------------- standoff 34–48 ----------------
    {
      name: 'standoff', t0: T.standoff, t1: T.draw,
      draw(ctx, lt, dur, t) {
        const x = lowCtx();
        const push = 1 + 0.09 * E.inOutCubic(seg(t, EV.riser[0], EV.riser[1]));
        x.save(); x.translate(LW / 2, LH / 2); x.scale(push, push); x.translate(-LW / 2, -LH / 2);
        x.drawImage(ART.townLow, 0, 0);
        windmill(x, t);
        for (let i = 0; i < 22; i++) {
          const sd = hash(i * 41);
          const wx = ((t * (40 + sd * 60) + sd * 1400) % 1200) - 120;
          x.fillStyle = `rgba(216,185,138,${0.1 + 0.12 * sd})`;
          x.fillRect(wx, ST_Y - 130 + sd * 90 + Math.sin(t * 3 + i) * 4, 16 + sd * 18, 2);
        }
        tumble(x, EV.tumble2, t, 1080, -140, ST_Y - 120, 0.55);
        const h = easeWalk(t, 34.15, 35.6, DOOR.x - 30, MARKS.hero);
        remy(x, ART.good, h.x, ST_Y, 1.62, { ...(h.moving ? walk(h.phase) : { lean: -0.05 }), glow: '#ffd9a0', glowA: 0.2 });
        const row = [
          [ART.bad, EV.out[0], MARKS.bad, true],
          [ART.bald, EV.out[1], MARKS.bald, true],
          [ART.g1, EV.out[2], MARKS.g1, true],
          [ART.g2, EV.burst, MARKS.g2, true],
        ];
        for (const [R, te, mx] of row) {
          const v = easeWalk(t, te, te + 3.4, DOOR.x + 10, mx);
          remy(x, R, v.x, ST_Y, 1.5, { ...(v.moving ? walk(v.phase) : { lean: 0.05 * Math.sin(t * 1.9 + mx) }), flip: true });
          const ht = headTop(R, ST_Y, 1.5);
          if (R === ART.bad) prop(x, ART.hat, v.x, ht + 9, HAT_K * 1.5);
          if (R === ART.bald) {
            const lift = t >= EV.twitch ? Math.min(5, (t - EV.twitch) * 26) : 0;
            prop(x, ART.toupee, v.x + Math.sin(t * 7) * 1.6, ht + 10 - lift, TUP_K * 1.5, Math.sin(t * 6.4) * 0.05 + lift * 0.012);
          }
        }
        doors(x, 1.15);
        x.restore();
        blit(ctx);
        if (t >= EV.cuGood2[0] && t < EV.cuGood2[1]) insertCut(ctx, ART['art' + CAST.GOOD], ECU_CROP[CAST.GOOD], t, EV.cuGood2[0], EV.cuGood2[1], 1.12);
        else if (t >= EV.cuBad2[0] && t < EV.cuBad2[1]) insertCut(ctx, ART['art' + CAST.BAD], ECU_CROP[CAST.BAD], t, EV.cuBad2[0], EV.cuBad2[1], 1.12);
        else if (t >= EV.cuBald[0] && t < EV.cuBald[1]) insertCut(ctx, ART['art' + CAST.BALD], ECU_CROP[CAST.BALD], t, EV.cuBald[0], EV.cuBald[1], 1.12, ecuToupee(ctx, t, EV.cuBald[0]));
      },
      fx: (lt, t) => ({
        letterbox: 1, warm: lerp(0.38, 0.64, seg(lt, 0, 14)), contrast: 1.06, sat: 0.96,
        vignette: 0.46 + 0.2 * seg(lt, 0, 14) + 0.1 * hbPulse(t), bloom: 0.06, bloomThresh: 0.88, grain: 0.015,
      }),
    },

    // ---------------- draw 48–56 (hit-stop clock) ----------------
    {
      name: 'draw', t0: T.draw, t1: T.aftermath,
      draw(ctx, lt) {
        const { g, stop, sl } = DRAW_CLOCK.warp(lt);
        const x = lowCtx();
        const d = lt - (EV.shot - T.draw);
        const k = d >= 0 && d < 0.34 ? 5 * Math.exp(-d * 13) : 0;
        x.save();
        x.translate(Math.round(k * Math.sin(d * 93)), Math.round(k * Math.cos(d * 81)));
        x.fillStyle = '#201014'; x.fillRect(-20, -20, LW + 40, LH + 40);
        x.drawImage(ART.townLow, 0, 0, LW, LH, -12, -12, LW + 24, LH + 24);
        windmill(x, g);
        // the Good — leans into the draw, eases down after
        const arm = g < 1.0 ? E.outCubic(seg(g, 0.82, 1.0)) * -0.34 : g < 1.5 ? -0.34 : -0.34 * (1 - E.outCubic(seg(g, 1.5, 2.2)));
        remy(x, ART.good, MARKS.hero, ST_Y, 1.62, { lean: -0.05 + arm, glow: '#ffd9a0', glowA: stop ? 0.55 : 0.2 });
        // the Bad: standing → white flash in the freeze → topples backward, hat sailing off
        const badFold = g >= 1.0 ? E.inQuad(seg(g, 1.0, 1.6)) : 0;
        remy(x, ART.bad, MARKS.bad, ST_Y + badFold * 8, 1.5, { rot: -1.32 * badFold, white: stop != null && sl < 0.12, flip: true });
        const badHead = headTop(ART.bad, ST_Y, 1.5);
        if (g < 1.0) prop(x, ART.hat, MARKS.bad, badHead + 9, HAT_K * 1.5);
        else {
          const hp = ballPos(g, 1.0, MARKS.bad, badHead, 46, -190, 520);
          if (hp && hp.y < ST_Y - 8) prop(x, ART.hat, hp.x, hp.y, HAT_K * 1.5, hp.a * 9);
          else prop(x, ART.hat, MARKS.bad + 41, ST_Y - 8, HAT_K * 1.5, 1.45);
        }
        // the Bald: frozen stiff, then flees with the gang; his toupee leaves the story at g 1.7
        const baldFlee = seg(g, 3.55, 4.75);
        if (baldFlee < 1) {
          const bx = lerp(MARKS.bald, LW + 120, E.inQuad(baldFlee));
          remy(x, ART.bald, bx, ST_Y, 1.5, { ...(baldFlee > 0.02 ? walk(bx * 1.6) : { lean: 0.06 }), flip: baldFlee <= 0.02 });
        }
        const baldHead = headTop(ART.bald, ST_Y, 1.5);
        let tupX = MARKS.bald, tupY = baldHead + 10 - (g >= 1.0 ? Math.min(4, (g - 1) * 20) : 0), tupRot = Math.sin(g * 6.4) * 0.05;
        if (g >= 1.7) {
          const tp = ballPos(g, 1.7, MARKS.bald + 4, baldHead, 118, -238, 640);
          if (tp && tp.y < ST_Y - 12) { tupX = tp.x; tupY = tp.y; tupRot = tp.a * 10; }
          else if (tp) {
            const la = tp.a - 0.72;
            tupX = MARKS.bald + 4 + 118 * 0.72;
            tupY = ST_Y - 12 - Math.abs(Math.sin(la * 9)) * 6 * Math.exp(-la * 3);
            tupRot = 0.2;
          }
        }
        prop(x, ART.toupee, tupX, tupY, TUP_K * 1.5, tupRot);
        for (const [R, mx] of [[ART.g1, MARKS.g1], [ART.g2, MARKS.g2]]) {
          const fu = seg(g, 3.55, 4.85);
          if (fu <= 0) remy(x, R, mx, ST_Y, 1.44, { flip: true, lean: 0.05 });
          else if (fu < 1) remy(x, R, lerp(mx, LW + 140, E.inOutCubic(fu)), ST_Y, 1.44, walk(mx * 1.4 + fu * 400));
        }
        // muzzle flash (holds through the freeze)
        if (stop != null || (g >= 1.0 && g < 1.12)) {
          const u = stop != null ? 1 : (g - 1.0) / 0.12;
          const mx = MARKS.hero + 58, my = ST_Y - 140;
          x.save(); x.translate(mx, my); x.rotate(-0.06);
          x.fillStyle = `rgba(255,246,214,${0.95 * (1 - u * 0.4)})`;
          x.beginPath();
          for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2; const r = i % 2 ? 30 + 26 * (1 - u) : 10; x.lineTo(Math.cos(an) * r * 1.9, Math.sin(an) * r); }
          x.closePath(); x.fill();
          x.strokeStyle = `rgba(255,220,150,${0.8 - u * 0.8})`; x.lineWidth = 3;
          x.beginPath(); x.moveTo(0, 0); x.lineTo(170, -12); x.stroke();
          x.restore();
        }
        for (const r of EV.ric) {
          const a = lt + T.draw - r;
          if (a < 0 || a > 0.2) continue;
          const u = a / 0.2, an = 2.4 + hash(r * 13) * 0.6;
          x.strokeStyle = `rgba(255,244,214,${1 - u})`; x.lineWidth = 2;
          x.beginPath();
          x.moveTo(MARKS.bad + 60 - Math.cos(an) * 60 * u, ST_Y - 120 - Math.sin(an) * 60 * u);
          x.lineTo(MARKS.bad + 60 - Math.cos(an) * (60 * u + 26), ST_Y - 120 - Math.sin(an) * (60 * u + 26));
          x.stroke();
        }
        paintPuffs(x, g, SMOKE, MARKS.hero + 58, ST_Y - 140, '#e8ddc8');
        // hat rests where it landed once the arc is done
        paintPuffs(x, g, SCATTER, MARKS.bald, ST_Y - 8, '#d8b98a');
        doors(x, 1.15);
        x.restore();
        blit(ctx);
      },
      fx: (lt) => {
        const st = DRAW_CLOCK.warp(lt).stop;
        return {
          letterbox: 1, warm: 0.6, contrast: st ? 1.16 : 1.1, sat: 0.95,
          vignette: 0.66, bloom: st ? 0.26 : 0.06, bloomThresh: 0.88, aber: st ? 0.006 : 0, grain: 0.016,
        };
      },
    },

    // ---------------- aftermath 56–68 ----------------
    {
      name: 'aftermath', t0: T.aftermath, t1: T.fin,
      draw(ctx, lt, dur, t) {
        const x = lowCtx();
        x.drawImage(ART.townLow, 0, 0);
        windmill(x, t);
        remy(x, ART.bad, MARKS.bad, 452, 1.5, { rot: -1.32, flip: true });
        prop(x, ART.hat, MARKS.bad + 41, ST_Y - 8, HAT_K * 1.5, 1.45);
        // the Good: watches the street, tips his head back — the crimson flow does the rest
        const toss = t >= EV.hairToss ? Math.sin(Math.min(1, (t - EV.hairToss) / 0.55) * Math.PI) : 0;
        remy(x, ART.good, MARKS.hero, ST_Y, 1.62, { lean: -0.05 - 0.26 * toss, glow: '#ffd9a0', glowA: 0.3 + 0.4 * toss });
        for (const p of GOLD) {
          const a = t - p.t;
          if (a < 0 || a > 1.3) continue;
          x.fillStyle = p.c; x.globalAlpha = 1 - a / 1.3;
          x.fillRect(MARKS.hero + p.vx * a, ST_Y - 168 + p.vy * a + 140 * a * a, p.r, p.r);
        }
        x.globalAlpha = 1;
        const ko = easeWalk(t, EV.keeperOut, EV.keeperOut + 1.0, DOOR.x + 8, DOOR.x - 60);
        const cheerHop = t > EV.cheer && t < 61.4 ? Math.abs(Math.sin((t - EV.cheer) * 7)) * 6 : 0;
        remy(x, ART.keeper, ko.x, PORCH_Y - cheerHop, 1.3, { flip: true, ...(ko.moving ? walk(ko.phase) : {}) });
        const po1 = easeWalk(t, EV.cheer - 0.4, EV.cheer + 0.7, DOOR.x + 10, DOOR.x + 62);
        const po2 = easeWalk(t, EV.cheer - 0.2, EV.cheer + 0.9, DOOR.x + 12, DOOR.x + 128);
        remy(x, ART.pat1, po1.x, PORCH_Y - (t > EV.cheer ? cheerHop * 0.8 : 0), 1.26, { flip: true, ...(po1.moving ? walk(po1.phase) : {}) });
        remy(x, ART.pat2, po2.x, PORCH_Y - (t > EV.cheer ? cheerHop * 1.1 : 0), 1.26, { flip: true, ...(po2.moving ? walk(po2.phase) : {}) });
        // the toupee catches its ride home
        const scoop = EV.tumbleToupee[0] + 1.0;
        const tw = tumble(x, EV.tumbleToupee[0], t, 1060, -180, TUMBLE_Y, 1.7, scoop);
        if (!tw && t < scoop) prop(x, ART.toupee, MARKS.bald + 4 + 85, ST_Y - 12, TUP_K * 1.5, 0.2);
        propBottom(x, ART.horseStand.c, 470, ST_Y + 4, 0.85);
        propBottom(x, Math.sin(t * 2.4) > 0 ? ART.horseStand.tailA : ART.horseStand.tailB, 470, ST_Y + 4, 0.85);
        doors(x, 0.5);
        blit(ctx);
      },
      fx: () => ({ letterbox: 1, warm: 0.68, bloom: 0.12, bloomThresh: 0.85, contrast: 1.04, vignette: 0.5, grain: 0.012 }),
    },

    // ---------------- fin 68–72 ----------------
    {
      name: 'fin', t0: T.fin, t1: DURATION,
      draw(ctx, lt, dur, t, overlay) {
        ctx.drawImage(ART.finSky, 0, 0);
        const u = clamp01(lt / dur);
        const wx = lerp(360, 1120, u);
        silhouetteImg(ctx, ART.horseStand.c, wx + 235, 930 + Math.sin(t * 5.5) * 1.5, 0.9, true);
        silhouetteRig(ctx, ART.good, wx, 936, 1.5, u * 620, false);
        const o = overlay;
        if (t >= EV.finCard) {
          const p = clamp01((t - EV.finCard) / 0.5);
          txt(o, 'F I N', 960, 480, { size: 150, font: F.serif, weight: 600, align: 'center', color: '#f3e6c8', alpha: p, glow: '#3a0d10', glowBlur: 30 });
        }
        if (t >= EV.brand) {
          const p = clamp01((t - EV.brand) / 0.5);
          o.globalAlpha = p;
          ART.hIcons.forEach((ic, i) => o.drawImage(ic, 828 + i * 68, 562, 56, 56));
          o.globalAlpha = 1;
          txt(o, 'REMY BOYS', 960, 664, { size: 30, font: F.mono, weight: 600, align: 'center', color: '#d8c39a', track: 14, alpha: p });
        }
        const a = seg(t, EV.fade[0], EV.fade[1]);
        if (a > 0) { ctx.fillStyle = `rgba(4,2,8,${a})`; ctx.fillRect(0, 0, W, H); }
      },
      fx: () => ({ letterbox: 1, warm: 0.58, bloom: 0.14, bloomThresh: 0.82, vignette: 0.55, grain: 0.012 }),
    },
  ],
};
