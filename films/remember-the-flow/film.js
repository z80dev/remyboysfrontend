// REMEMBER THE FLOW — a Remy Boys documentary (78 s, 1920×1080, no letterbox).
// Two registers: PRESENT (smooth native 1080p) and ARCHIVAL (960×540 low canvas, nearest 2× blit,
// 12 fps time-stepping, film damage incl. the gate hair). Every event time comes from timeline.js.
import { W, H, seg, lerp, E, hash, rng, txt, F } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js'; // shared rig: canvas, loadRemy, drawRemy, loadHeads, headIcon
import {
  T, EV, CLASH_CLOCK, step12, COPY, CAPTIONS, CAPTION_STYLES, CAST, REFUGEES, DURATION,
} from './timeline.js';
import { build, stripLeftBlade, HAIRY, MAPGEO } from './art.js';
import { score } from './score.js';

const LW = 960, LH = 540; // archival native stage, upscaled 2× nearest
const ART = {};
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const AMBER = '#d9a860';
const PAPER_INK = '#e6d7b2';

// the freeze is the single stop {g:2.6,d:0.22}; world time for any post-freeze film event:
const G = (filmT) => filmT - T.ch3b - 0.22;
const TOP_G = EV.topple.map(G);            // squad topples in g-domain
const PLANT_G = G(EV.swordPlant);          // 3.8
const DROP_G = G(EV.bannerDrop);           // 3.95
const P1_G = EV.parry1 - T.ch3b;           // 1.2 (before the freeze, g == lt)
const P2_G = EV.parry2 - T.ch3b;           // 2.0
const FC_G = 2.6;                          // final clash, freeze begins

// deterministic refugee folk (checked against the bald roster offline: none are bald)
const REF_FOLK = [777, 1553, 2842];

// ---------------- generic helpers ----------------
async function img(url) { const i = new Image(); i.src = url; await i.decode(); return i; }
const bump = (t, a, b, c, d) => seg(t, a, b) * (1 - seg(t, c, d));

// baked-canvas camera: 16:9 window at zoom z centred on (cxn, cyn), clamped inside the canvas
function camRect(c, z, cxn, cyn) {
  let sw = c.width / z, sh = sw * (LH / LW);
  if (sh > c.height) { sh = c.height; sw = sh * (LW / LH); }
  let sx = cxn * c.width - sw / 2, sy = cyn * c.height - sh / 2;
  sx = Math.max(0, Math.min(c.width - sw, sx));
  sy = Math.max(0, Math.min(c.height - sh, sy));
  return [sx, sy, sw, sh];
}
function drawCam(x, c, z, cxn, cyn) {
  const r = camRect(c, z, cxn, cyn);
  x.drawImage(c, r[0], r[1], r[2], r[3], 0, 0, LW, LH);
  return { sx: r[0], sy: r[1], sw: r[2], sh: r[3], f: W / r[2] }; // f: map px → native px
}
// low-space camera for actor scenes: bg painted 0,0,960,540 inside the transform
function sceneBegin(x, bg, z, cx, cy) {
  x.fillStyle = '#0d0a07';
  x.fillRect(-24, -24, LW + 48, LH + 48); // full repaint incl. overscan exposed by camera/weave
  x.save();
  x.translate(LW / 2, LH / 2); x.scale(z, z); x.translate(-cx, -cy);
  x.drawImage(bg, 0, 0); // bg is already 960×540
}
function sceneEnd(x) { x.restore(); }

function lowCtx(smooth) {
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.imageSmoothingEnabled = smooth;
  return x;
}
function blit(ctx, ox = 0, oy = 0) { // nearest 2× (+ weave/shake), overscanned so edges never gap
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ART.low, ox - 4, oy - 4, W + 8, H + 8);
}

// rig draw with grounded shadow
function remy(x, R, px, feet, s, o = {}) {
  x.fillStyle = 'rgba(30,20,10,0.35)';
  x.beginPath(); x.ellipse(px, feet + 2, 26 * s, 4.5 * s, 0, 0, 7); x.fill();
  A.drawRemy(x, R, Math.round(px), Math.round(feet), { sx: s, sy: s, ...o });
}
function prop(x, c, px, py, s, rot = 0) {
  x.save(); x.translate(Math.round(px), Math.round(py)); x.rotate(rot); x.scale(s, s);
  x.drawImage(c, -c.width / 2, -c.height / 2); x.restore();
}
const walkPose = (dist, rate = 44, amp = 3.2, lean = 0.06) => {
  const s = Math.sin((dist / rate) * Math.PI * 2);
  return { lift: [Math.max(0, s) * amp, Math.max(0, -s) * amp], stride: [s * 2, -s * 2], lean };
};
// drawn hat-brim shadow: a dark band across the eyes + a brim edge above it (villagers, brims low)
function hatBrim(x, R, px, feet, s) {
  const h = (R.bottom - R.top) * s;
  const y = feet - h + h * 0.30;
  x.fillStyle = 'rgba(22,14,8,0.88)';
  x.beginPath(); x.ellipse(px, y, 21 * s, 6.5 * s, 0, 0, 7); x.fill();
  x.beginPath(); x.ellipse(px, y - 6 * s, 23 * s, 3.2 * s, 0, 0, 7); x.fill();
}
// the muster greatsword (prop canvas, grip anchor at (14, 84), blade points up at ang 0):
// drawn low with the tip at the ground → swept up past vertical (knee-height pass, clear of
// faces) → grip raised so the guard stays below eye line → held high beside the head through
// EV.swordHold (tremble + glint) → carried at the shoulder on the march.
function drawGreatsword(x, px, feet, s, lt2, t) {
  let ang, gx, gy;
  if (lt2 < 1.0) { // draw low, tip resting at the ground
    const u = E.outCubic(seg(lt2, 0.3, 1.0));
    ang = lerp(2.35, 1.85, u);
    gx = px + 2 * s; gy = feet - 30 * s;
  } else if (lt2 < 1.55) { // the lift: sweep up on his right, horizontal pass at knee height
    const u = E.outBack(seg(lt2, 1.0, 1.55));
    ang = lerp(1.85, 0.08, u);
    gx = px + 14 * s; gy = feet - 36 * s;
  } else if (lt2 < 1.95) { // raise the grip: guard stays below the eye line, blade right of the head
    const u = seg(lt2, 1.55, 1.95);
    ang = lerp(0.08, 0.08, u);
    gx = lerp(px + 14 * s, px + 34 * s, u); gy = lerp(feet - 36 * s, feet - 46 * s, u);
  } else if (lt2 < 2.5) { // held high at his right side — the hero beat
    ang = 0.08 + 0.012 * Math.sin(t * 9);
    gx = px + 34 * s; gy = feet - 46 * s;
  } else { // carry: blade swept up over his own head — clears his face line and the rank
    // behind (passes below the elder's chin, never across his eyes)
    const u = E.outCubic(seg(lt2, 2.5, 3.2));
    ang = lerp(0.08, -0.55, u);
    gx = lerp(px + 34 * s, px + 28 * s, u); gy = lerp(feet - 46 * s, feet - 48 * s, u);
  }
  x.save();
  x.translate(gx, gy); x.rotate(ang); x.scale(s, s);
  x.drawImage(ART.greatsword, -14, -84);
  x.restore();
  if (lt2 >= 2.0 && lt2 < 2.5) { // glint runs down the blade during the hold
    const u = (lt2 - 2.0) / 0.5;
    x.save();
    x.translate(gx, gy); x.rotate(ang); x.scale(s, s);
    x.strokeStyle = `rgba(255,255,246,${0.85 * Math.sin(Math.PI * clamp01(u))})`;
    x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(0, -68 + 46 * u); x.lineTo(2, -50 + 46 * u); x.stroke();
    x.restore();
  }
}

// sepia toning of a live-drawn archival scene ('color' blend keeps luminosity, forces hue)
function tone(x, strength, brown = 0.1) {
  if (strength <= 0.01) return;
  x.globalCompositeOperation = 'color';
  x.globalAlpha = strength;
  x.fillStyle = 'rgb(178,134,88)';
  x.fillRect(0, 0, LW, LH);
  x.globalCompositeOperation = 'multiply';
  x.globalAlpha = brown * strength;
  x.fillStyle = 'rgb(226,201,164)';
  x.fillRect(0, 0, LW, LH);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
}

// ---------------- film damage (pure functions of t) ----------------
function sprocketPulse(t) {
  for (const s of EV.sprocket) {
    const a = t - s;
    if (a >= 0 && a < 0.32) return 1 - a / 0.32;
  }
  return 0;
}
function gateHair(x, t) {
  if (t < EV.gateHairIn) return;
  const outU = seg(t, EV.gateHairOut[0], EV.gateHairOut[1]);
  const ox = outU * 200, oy = -outU * 110, rot = outU * 0.9;
  const al = 0.8 * (1 - outU * outU);
  if (al <= 0.01) return;
  const sway = Math.sin(t * 2.3) * 10 + Math.sin(t * 5.1) * 3;
  x.save();
  x.translate(LW - 6 + ox, -4 + oy);
  x.rotate(rot + 0.15 * Math.sin(t * 1.7));
  x.strokeStyle = `rgba(26,17,9,${al})`;
  x.lineCap = 'round';
  for (const [len, ph, dx0] of [[216, 0, 0], [172, 1.3, -5], [122, 2.1, -9]]) {
    x.lineWidth = 1.6 + hash(ph * 7) * 1.2;
    x.beginPath();
    x.moveTo(dx0, 2);
    x.bezierCurveTo(dx0 - 14 + sway * 0.4, len * 0.35, dx0 - 42 - sway, len * 0.7,
      dx0 - 68 - sway * 1.4 + Math.sin(t * 3 + ph) * 6, len);
    x.stroke();
  }
  x.restore();
}
function damage(x, t, clean = 0) {
  const dm = 1 - clean;
  const fi = Math.floor(t * 12); // stepped "film frame" index
  if (dm > 0.01) {
    const fl = (hash(fi * 13 + 7) - 0.5) * 0.09 * dm; // ±4% brightness flicker
    if (fl > 0) { x.fillStyle = `rgba(255,244,224,${fl})`; x.fillRect(0, 0, LW, LH); }
    else { x.fillStyle = `rgba(12,7,4,${-fl})`; x.fillRect(0, 0, LW, LH); }
    for (const s of [0, 1]) { // two wandering scratches
      const sx = LW * (0.24 + 0.32 * s) + Math.sin(t * (0.16 + s * 0.11) + s * 2.4) * 60 + (hash(fi * 31 + s * 9) - 0.5) * 5;
      const a = (0.07 + 0.11 * hash(fi * 17 + s * 5)) * dm;
      x.fillStyle = hash(fi + s * 3) > 0.5 ? `rgba(20,12,6,${a})` : `rgba(240,228,200,${a * 0.8})`;
      x.fillRect(sx, 0, 1.5, LH);
    }
    for (let i = 0; i < 8; i++) { // dust
      const h1 = hash(fi * 131 + i * 17), h2 = hash(fi * 79 + i * 29);
      x.fillStyle = h1 > 0.5 ? `rgba(20,12,6,${(0.1 + h2 * 0.22) * dm})` : `rgba(244,232,204,${(0.08 + h2 * 0.18) * dm})`;
      x.fillRect(h1 * LW, h2 * LH, 1 + (h2 > 0.82 ? 1.5 : 0), 1 + (h1 > 0.82 ? 1.5 : 0));
    }
  }
  const sp = sprocketPulse(t);
  if (sp > 0) { // sprocket flutter after archival cuts: strip of holes both edges
    for (const ex of [8, LW - 22]) {
      for (let i = 0; i < 9; i++) {
        const a = sp * (0.14 + 0.12 * hash(fi * 5 + i * 3 + ex));
        x.fillStyle = `rgba(244,232,204,${a})`;
        x.beginPath();
        x.roundRect(ex, 12 + i * 60 + ((fi * 7) % 12), 14, 30, 5);
        x.fill();
      }
    }
  }
  x.drawImage(ART.vig, 0, 0);
  gateHair(x, t);
}
const weaveOf = (t) => Math.sin(t * 0.9) * 1.5 + sprocketPulse(t) * (hash(Math.floor(t * 60)) - 0.5) * 6;

// ---------------- war map helpers ----------------
function mkPath(pts) {
  const segs = []; let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const dl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push([L, L + dl, pts[i - 1], pts[i]]);
    L += dl;
  }
  return {
    len: L,
    at(d) {
      d = Math.max(0, Math.min(L, d));
      for (const [a, b, p, q] of segs) {
        if (d <= b) { const u = (d - a) / (b - a); return [lerp(p[0], q[0], u), lerp(p[1], q[1], u), Math.atan2(q[1] - p[1], q[0] - p[0])]; }
      }
      const e = segs[segs.length - 1];
      return [e[3][0], e[3][1], Math.atan2(e[3][1] - e[2][1], e[3][0] - e[2][0])];
    },
  };
}
const ROADS = { coast: mkPath(MAPGEO.roads.coast), gap: mkPath(MAPGEO.roads.gap), parting: mkPath(MAPGEO.roads.parting) };
const ARROW_PATHS = { coast: mkPath(MAPGEO.arrows.coast), gap: mkPath(MAPGEO.arrows.gap), parting: mkPath(MAPGEO.arrows.parting) };
const MAP_X = (cam) => (p) => [ // baked map px → low canvas px
  (p[0] - cam.sx) * (LW / cam.sw), (p[1] - cam.sy) * (LH / cam.sh),
];
function drawWash(x, w, u, X) {
  if (u <= 0) return;
  const d = w.depth * u, dir = w.dir, perp = [-dir[1], dir[0]];
  const o = w.origin;
  const p1 = [o[0] + dir[0] * d + perp[0] * 1700, o[1] + dir[1] * d + perp[1] * 1700];
  const p2 = [o[0] + dir[0] * d - perp[0] * 1700, o[1] + dir[1] * d - perp[1] * 1700];
  const b1 = [p1[0] - dir[0] * 3400, p1[1] - dir[1] * 3400];
  const b2 = [p2[0] - dir[0] * 3400, p2[1] - dir[1] * 3400];
  x.save();
  x.beginPath();
  w.poly.forEach((p, i) => { const q = X(p); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); });
  x.closePath(); x.clip();
  x.beginPath();
  const quad = [p1, p2, b2, b1].map(X);
  quad.forEach((q, i) => (i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])));
  x.closePath(); x.clip();
  x.fillStyle = 'rgba(44,28,16,0.4)'; x.fillRect(0, 0, LW, LH);
  x.fillStyle = ART.hatch ? x.createPattern(ART.hatch, 'repeat') : '#2c1c10';
  x.fillRect(0, 0, LW, LH);
  // the razor: toothed front edge
  x.strokeStyle = 'rgba(20,10,4,0.9)'; x.lineWidth = 2.5;
  x.beginPath();
  for (let i = 0; i <= 48; i++) {
    const u2 = i / 48, k = i % 2 ? 7 : -5;
    const px = lerp(p1[0], p2[0], u2) + perp[0] * k, py = lerp(p1[1], p2[1], u2) + perp[1] * k;
    const q = X([px, py]);
    i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]);
  }
  x.stroke();
  x.restore();
}
function drawArrow(x, path, u, X) {
  if (u <= 0) return;
  const d = u * path.len;
  x.strokeStyle = '#5e2014';
  x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath();
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const p = X(path.at((d * i) / N));
    i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]);
  }
  x.stroke();
  const tip = X(path.at(d));
  const back = X(path.at(Math.max(0, d - 8)));
  const an = Math.atan2(tip[1] - back[1], tip[0] - back[0]);
  x.fillStyle = '#4a180e';
  x.beginPath();
  x.moveTo(tip[0] + Math.cos(an) * 16, tip[1] + Math.sin(an) * 16);
  x.lineTo(tip[0] + Math.cos(an + 2.5) * 17, tip[1] + Math.sin(an + 2.5) * 17);
  x.lineTo(tip[0], tip[1]);
  x.lineTo(tip[0] + Math.cos(an - 2.5) * 17, tip[1] + Math.sin(an - 2.5) * 17);
  x.closePath(); x.fill();
}
function drawRefugees(x, row, u, X, icons) {
  if (u <= 0) return;
  const path = ROADS[row.from];
  for (let k = 0; k < 3; k++) {
    const uu = Math.max(0, u - k * 0.05);
    const [px, py] = X(path.at(uu * path.len));
    const off = (k - 1) * 7;
    x.fillStyle = 'rgba(40,26,14,0.4)';
    x.beginPath(); x.ellipse(px + off + 1, py + 6, 7, 2.5, 0, 0, 7); x.fill();
    x.drawImage(icons[k], px + off - 7, py - 8, 14, 14);
  }
}
function drawFrontLine(x, t12, X) {
  if (t12 < EV.frontThrob[0]) return;
  const a = 0.45 + 0.3 * Math.sin(t12 * Math.PI * 4); // 2 Hz throb
  x.strokeStyle = `rgba(96,26,14,${a})`;
  x.lineWidth = 8; x.lineJoin = 'round';
  x.beginPath();
  MAPGEO.front.forEach((p, i) => { const q = X(p); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); });
  x.stroke();
  x.strokeStyle = `rgba(36,10,4,${a})`;
  x.lineWidth = 2.5;
  x.stroke();
}
function drawMapLabels(ctx, t, cam) {
  const times = { hairline: EV.labelHairline, follicle: EV.labelFollicle, parting: EV.labelParting, gap: EV.labelGap, coast: EV.labelCoast };
  ctx.imageSmoothingEnabled = true;
  for (const L of ART.mapLabels) {
    const lt = times[L.key];
    const a = seg(t, lt, lt + 0.35);
    if (a <= 0) continue;
    const px = (L.x - cam.sx) * cam.f, py = (L.y - cam.sy) * (W / cam.sw) + (1 - a) * 9;
    ctx.globalAlpha = a * 0.95;
    ctx.drawImage(L.c, px - L.c.width / 2, py - L.c.height / 2);
  }
  ctx.globalAlpha = 1;
}

// ---------------- interview set (native 1080p camera) ----------------
function drawSet(ctx, z, cxn, cyn, t, breathe) {
  ctx.imageSmoothingEnabled = true;
  const [sx, sy, sw, sh] = camRect(ART.set, z, cxn, cyn);
  ctx.drawImage(ART.set, sx, sy, sw, sh, 0, 0, W, H);
  const fx = W / sw, fy = H / sh;
  const px = (1140 - sx) * fx, py = (470 - sy) * fy;
  const f = fx * 0.74;
  const br = breathe ? 1 + 0.006 * Math.sin(t * 1.4) : 1;
  const pw = ART.vetPortrait.width * f * br, ph = ART.vetPortrait.height * f * br;
  if (breathe) { // the almost-smile: a soft warm swell on the print
    const g = ctx.createRadialGradient(px, py, 20, px, py, pw * 0.7);
    const k = 0.05 + 0.03 * Math.sin(t * 1.1);
    g.addColorStop(0, `rgba(255,206,140,${k})`); g.addColorStop(1, 'rgba(255,206,140,0)');
    ctx.fillStyle = g; ctx.fillRect(px - pw, py - ph, pw * 2, ph * 2);
  }
  ctx.drawImage(ART.vetPortrait, px - pw / 2, py - ph / 2, pw, ph);
}
function lowerThird(o, t, win) {
  const a = Math.min(seg(t, win[0], win[0] + 0.45), 1 - seg(t, win[1] - 0.45, win[1]));
  if (a <= 0) return;
  o.fillStyle = `rgba(217,168,96,${a})`;
  o.fillRect(150, 936, 620 * E.outCubic(seg(t, win[0], win[0] + 0.7)), 3);
  txt(o, COPY.lowerThird, 150, 984, { size: 24, font: F.mono, weight: 600, track: 4, color: '#d9c9a6', alpha: a });
}

// ---------------- fx builders ----------------
const fxPresent = (extra = {}) => () => ({ grain: 0.01, vignette: 0.38, bloom: 0.05, bloomThresh: 0.9, ...extra });
const fxArchival = (lt, t, extra = {}) => ({ grain: 0.02, vignette: 0.5, bloom: 0.03, bloomThresh: 0.9, warm: 0.1, ...extra });

// ==================================================================================
export default {
  title: 'REMEMBER THE FLOW — a Remy Boys documentary',
  output: 'remember-the-flow.mp4',
  duration: DURATION,

  async prepare() {
    await document.fonts?.ready;
    Object.assign(ART, await build());
    // downscale the actor-scene sets once (crunchy nearest camera pushes read like newsreel)
    for (const k of ['village', 'muster', 'clash']) {
      const c = A.canvas(LW, LH), x = c.getContext('2d');
      x.imageSmoothingEnabled = true;
      x.drawImage(ART[k], 0, 0, 1920, 1080, 0, 0, LW, LH);
      ART[k + 'Low'] = c;
    }
    ART.low = A.canvas(LW, LH);
    const heroRig = await A.loadRemy(CAST.HERO, false); // red hair + greatsword (sword is IN the sprite)
    ART.hero = heroRig; // armed rig — ch3b (he arrives at the clash armed)
    ART.heroBare = stripLeftBlade(heroRig); // baked blade stripped — the ch3a prop plays draw/lift/hold
    ART.alt = await A.loadRemy(CAST.HERO_ALT, false); // clean fallback, no sword
    ART.squad = [];
    for (const id of CAST.SQUAD) ART.squad.push(await A.loadRemy(id, false));
    ART.villagers = [];
    for (const id of CAST.VILLAGERS) ART.villagers.push(await A.loadRemy(id, false));
    ART.ga = [];
    for (const id of CAST.GA) ART.ga.push(await A.loadRemy(id, false)); // golden-age trio as near sprites (muster column)
    ART.heads = await A.loadHeads();
    ART.refIcons = REF_FOLK.map((id) => A.headIcon(ART.heads, id, 1));
  },

  captions: CAPTIONS,
  captionStyles: { ...CAPTION_STYLES },

  flashes: [
    [EV.finalClash, 0.5, 0.09],
    [EV.parry1, 0.14, 0.05],
    [EV.parry2, 0.14, 0.05],
    [EV.swordPlant, 0.15, 0.05],
  ],

  score,
  audio: { seed: 1942, reverb: 1.5, reverbGain: 0.27 },
  grid: { bar: 1.5 }, // half-bar grid; every cut incl. brand (73.5) on-grid
  lint: { safe: { margin: 0.04 } },

  shots: [
    // ---------------- 1 · coldopen 0–7.5 (present) ----------------
    {
      name: 'coldopen', t0: T.coldopen, t1: T.title,
      draw(ctx, lt, dur, t, overlay) {
        const u = E.inOutCubic(seg(t, EV.pushIn[0], EV.pushIn[1]));
        drawSet(ctx, 1.02 + 0.13 * u, lerp(0.53, 0.585, u), lerp(0.5, 0.445, u), t, false);
        ctx.fillStyle = `rgba(255,208,140,${0.014 + 0.014 * hash(Math.floor(t * 12) * 7)})`;
        ctx.fillRect(0, 0, W, H); // projector lamp breath
        lowerThird(overlay, t, EV.lowerThird1);
        const a = 1 - seg(t, EV.fadeIn[0], EV.fadeIn[1]);
        if (a > 0) { ctx.fillStyle = `rgba(4,3,2,${a})`; ctx.fillRect(0, 0, W, H); }
      },
      fx: fxPresent(),
    },

    // ---------------- 2 · title 7.5–12 (present) ----------------
    {
      name: 'title', t0: T.title, t1: T.ch1card,
      draw(ctx, lt, dur, t, overlay) {
        const leader = t < EV.leaderFlicker[1];
        if (leader) {
          const fi = Math.floor(t * 24);
          ctx.fillStyle = '#0a0908'; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = `rgba(232,220,196,${0.05 + 0.05 * hash(fi * 3)})`;
          ctx.fillRect(0, 0, W, H);
          // countdown circle + sweep
          ctx.strokeStyle = 'rgba(226,212,184,0.5)'; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(960, 540, 300, 0, 7); ctx.stroke();
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(960, 540, 236, 0, 7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(660, 540); ctx.lineTo(1260, 540); ctx.moveTo(960, 240); ctx.lineTo(960, 840); ctx.stroke();
          const sw = ((t - T.title) * 4.6) % (Math.PI * 2);
          ctx.fillStyle = 'rgba(226,212,184,0.10)';
          ctx.beginPath(); ctx.moveTo(960, 540); ctx.arc(960, 540, 300, -Math.PI / 2, -Math.PI / 2 + sw); ctx.closePath(); ctx.fill();
          const n = t >= EV.count1 ? '1' : t >= EV.count2 ? '2' : null;
          if (n) txt(ctx, n, 960, 540, { size: 400, font: F.mono, weight: 600, align: 'center', base: 'middle', color: `rgba(232,220,196,${0.42 + 0.2 * hash(fi * 9)})` });
          // sprocket-hole strips
          for (const ex of [26, W - 50]) {
            for (let i = 0; i < 15; i++) {
              ctx.fillStyle = `rgba(232,220,196,${0.12 + 0.16 * hash(fi * 5 + i)})`;
              ctx.beginPath(); ctx.roundRect(ex, 10 + i * 72 + (fi % 3) * 4, 24, 34, 7); ctx.fill();
            }
          }
          return;
        }
        ctx.drawImage(ART.charcoal, 0, 0);
        const tu = seg(t, EV.titleLand, EV.titleLand + 0.45);
        if (tu > 0) {
          txt(ctx, COPY.title.main, 960, 500 - (1 - E.outCubic(tu)) * 22, {
            size: 110, font: F.serif, weight: 600, align: 'center', track: 8, color: PAPER_INK, alpha: tu,
            glow: '#3a2408', glowBlur: 26,
          });
        }
        const ru = E.outCubic(seg(t, EV.ruleIn, EV.ruleIn + 0.6));
        if (ru > 0) { ctx.fillStyle = AMBER; ctx.globalAlpha = ru; ctx.fillRect(960 - 320 * ru, 566, 640 * ru, 2); ctx.globalAlpha = 1; }
        const su = seg(t, EV.subIn, EV.subIn + 0.5);
        if (su > 0) txt(ctx, COPY.title.sub, 960, 636, { size: 26, font: F.mono, weight: 600, align: 'center', track: 9, color: '#c9b58e', alpha: su });
      },
      fx: (lt, t) => ({ grain: t < EV.leaderFlicker[1] ? 0.035 : 0.01, vignette: t < EV.leaderFlicker[1] ? 0.55 : 0.38, bloom: 0.04, bloomThresh: 0.9 }),
    },

    // ---------------- 3–6 · chapter cards ----------------
    {
      name: 'ch1card', t0: T.ch1card, t1: T.ch1a,
      draw(ctx, lt, dur, t) {
        chapterCard(ctx, t, COPY.chapters.ch1, EV.ch1Land, EV.ch1Rule, 'I');
      },
      fx: fxPresent(),
    },
    {
      name: 'ch1a', t0: T.ch1a, t1: T.ch1b,
      draw(ctx, lt, dur, t) {
        const x = lowCtx(true);
        const u = E.inOutCubic(seg(t, EV.kb1a[0], EV.kb1a[1]));
        drawCam(x, ART.plate1a.c, 1.06 + 0.12 * u, lerp(0.5, 0.515, u), lerp(0.5, 0.472, u));
        tone(x, 0.22);
        damage(x, t);
        blit(ctx, weaveOf(t), Math.cos(t * 0.7) * 1.2);
      },
      fx: fxArchival,
    },

    // ---------------- 5 · ch1b 19.5–24 (archival) — regiment 3-up, lateral pan ----------------
    {
      name: 'ch1b', t0: T.ch1b, t1: T.ch2card,
      draw(ctx, lt, dur, t) {
        const x = lowCtx(true);
        const u = E.inOutCubic(seg(t, EV.kb1b[0], EV.kb1b[1]));
        drawCam(x, ART.plate1b.c, 1.03 + 0.06 * u, lerp(0.26, 0.5, u), 0.5);
        tone(x, 0.22);
        damage(x, t);
        blit(ctx, weaveOf(t), Math.cos(t * 0.7) * 1.2);
      },
      fx: fxArchival,
    },

    // ---------------- 7 · ch2a 27–31.5 (archival) — propaganda poster, tilt up ----------------
    {
      name: 'ch2card', t0: T.ch2card, t1: T.ch2a,
      draw(ctx, lt, dur, t) {
        chapterCard(ctx, t, COPY.chapters.ch2, EV.ch2Land, EV.ch2Rule, 'II');
      },
      fx: fxPresent({ tint: [0.9, 0.96, 1.08], sat: 0.94 }), // the grade turns colder
    },
    {
      name: 'ch2a', t0: T.ch2a, t1: T.ch2b,
      draw(ctx, lt, dur, t) {
        const x = lowCtx(true);
        // tilt DOWN the print: brow → face → slogan + ministry seal, then HOLD the end framing
        // (no snap-back). End framing keeps the slogan lettering above the credit band (y≈986).
        const u = E.inOutCubic(seg(t, EV.posterTilt[0], 30.7));
        drawCam(x, ART.poster, lerp(1.03, 1.06, u), 0.5, lerp(0.16, 0.77, u));
        tone(x, 0.12, 0.05);
        damage(x, t);
        blit(ctx, weaveOf(t), Math.cos(t * 0.7) * 1.2);
      },
      fx: fxArchival,
    },

    // ---------------- 8 · ch2b 31.5–39 (archival) — THE WAR MAP ----------------
    {
      name: 'ch2b', t0: T.ch2b, t1: T.ch2c,
      draw(ctx, lt, dur, t) {
        const x = lowCtx(true);
        const u = E.inOutCubic(seg(t, EV.kb2b[0], EV.kb2b[1]));
        const cam = drawCam(x, ART.map, 1.03 + 0.1 * u, 0.5, lerp(0.52, 0.46, u));
        const X = MAP_X(cam);
        const t12 = step12(t);
        drawWash(x, MAPGEO.washes.coast, seg(t12, EV.washCoast[0], EV.washCoast[1]), X);
        drawWash(x, MAPGEO.washes.gap, seg(t12, EV.washGap[0], EV.washGap[1]), X);
        drawWash(x, MAPGEO.washes.parting, seg(t12, EV.washParting[0], EV.washParting[1]), X);
        drawFrontLine(x, t12, X);
        drawArrow(x, ARROW_PATHS.coast, seg(t12, EV.arrowCoast[0], EV.arrowCoast[1]), X);
        drawArrow(x, ARROW_PATHS.gap, seg(t12, EV.arrowGap[0], EV.arrowGap[1]), X);
        drawArrow(x, ARROW_PATHS.parting, seg(t12, EV.arrowParting[0], EV.arrowParting[1]), X);
        drawRefugees(x, REFUGEES[0], seg(t12, REFUGEES[0].dispatch, REFUGEES[0].arrive), X, ART.refIcons);
        drawRefugees(x, REFUGEES[1], seg(t12, REFUGEES[1].dispatch, REFUGEES[1].arrive), X, ART.refIcons);
        drawRefugees(x, REFUGEES[2], seg(t12, REFUGEES[2].dispatch, REFUGEES[2].arrive), X, ART.refIcons);
        tone(x, 0.15, 0.05);
        damage(x, t);
        blit(ctx, weaveOf(t), Math.cos(t * 0.7) * 1.2);
        drawMapLabels(ctx, t, cam);
      },
      fx: fxArchival,
    },

    // ---------------- 9 · ch2c 39–43.5 (archival) — occupation march ----------------
    {
      name: 'ch2c', t0: T.ch2c, t1: T.ch3card,
      draw(ctx, lt, dur, t) {
        const x = lowCtx(false);
        const t12 = step12(t);
        const z = 1.05 + 0.09 * seg(lt, 0.2, 4.3);
        const cx = 480 + 26 * seg(lt, 0.3, 4.3) + 24 * bump(t, 42.0, 42.6, 43.0, 43.35);
        sceneBegin(x, ART.villageLow, z, cx, 268);
        const actors = [];
        // the Cabald squad (4) marches left→right, 12 fps stepping; squad[3] leads
        for (let i = 0; i < 4; i++) {
          const xi = -60 + (t12 - EV.marchIn) * 272 - (3 - i) * 92;
          actors.push({ R: ART.squad[i], x: xi, feet: 460, s: 1.5, flip: false, walks: true });
        }
        // two villagers, hat brims low, standing in the foreground
        actors.push({ R: ART.villagers[0], x: 280, feet: 500, s: 1.55, flip: false, brim: true, lean: 0.03 });
        actors.push({ R: ART.villagers[1], x: 640, feet: 504, s: 1.55, flip: true, brim: true, lean: -0.03 });
        actors.sort((a, b) => a.feet - b.feet);
        for (const a of actors) {
          const pose = a.walks ? walkPose(Math.abs(a.x) * 0.8, 40, 3.4, 0.07) : { lean: a.lean ?? 0.02 };
          remy(x, a.R, a.x, a.feet, a.s, { flip: a.flip, ...pose });
          if (a.brim) hatBrim(x, a.R, a.x, a.feet, a.s);
        }
        sceneEnd(x);
        tone(x, 0.85);
        damage(x, t);
        blit(ctx, weaveOf(t), Math.cos(t * 0.7) * 1.2);
      },
      fx: fxArchival,
    },

    // ---------------- 11 · ch3a 46.5–51 (archival) — the muster ----------------
    {
      name: 'ch3card', t0: T.ch3card, t1: T.ch3a,
      draw(ctx, lt, dur, t) {
        chapterCard(ctx, t, COPY.chapters.ch3, EV.ch3Land, EV.ch3Rule, 'III');
      },
      fx: fxPresent(),
    },

    // ---------------- 4 · ch1a 15–19.5 (archival) — GA1 sepia portrait, Ken Burns push ----------------
    {
      name: 'ch3a', t0: T.ch3a, t1: T.ch3b,
      draw(ctx, lt, dur, t) {
        const x = lowCtx(false);
        const t12 = step12(t);
        const lt2 = t - T.ch3a;
        const z = 1.02 + 0.1 * seg(t, EV.kb3a[0], EV.kb3a[1]);
        sceneBegin(x, ART.musterLow, z, 480, 262);
        // banner unfurls behind the column
        const ux = E.outCubic(seg(t, EV.bannerUnfurl, EV.bannerUnfurl + 0.65));
        if (ux > 0) {
          x.save();
          x.translate(480 - 165 * 0.52, 64);
          x.rotate(Math.sin(t * 1.4) * 0.02);
          x.scale(Math.max(0.05, ux), 1);
          x.drawImage(ART.banner, 0, 0, 330, 190);
          x.restore();
        }
        // the column: staggered step-off at EV.stepOff — a real march toward camera
        // (advance down-frame + per-actor walk phase + growth beyond the camera zoom)
        const COL = [
          { R: ART.heroBare, sword: true, bx: 470, bf: 452, s: 1.95, ph: 0, front: true },
          { R: ART.ga[0], bx: 575, bf: 424, s: 1.72, ph: 2.1 },
          { R: ART.ga[1], bx: 375, bf: 418, s: 1.68, ph: 4.2 },
          { R: ART.ga[2], bx: 640, bf: 396, s: 1.5, ph: 1.2 },
          { R: ART.alt, bx: 305, bf: 394, s: 1.47, ph: 3.3 },
        ];
        const list = COL.map((m, i) => {
          const start = EV.stepOff + 0.12 * i;
          const a = clamp01((t12 - start) / 2.3);
          const dist = (m.front ? 34 : 24 - i * 3) * a;
          return {
            ...m, a, dist,
            feet: m.bf + dist,
            s: m.s * (1 + (m.front ? 0.26 : 0.18) * a),
            px: m.bx + (m.front ? 6 : (m.bx > 470 ? 10 : -10)) * a,
          };
        });
        // hero sword beat: anticipation crouch (EV.drawAnticipate) → draw low → LIFT at
        // EV.swordLift → held high through EV.swordHold → carried on the march
        const crouch = Math.sin(Math.PI * clamp01((lt2 - 0.3) / 0.7));
        const lift = E.outBack(seg(lt2, EV.swordLift - T.ch3a, EV.swordHold[0] - T.ch3a - 0.05));
        const carry = E.outCubic(seg(lt2, EV.stepOff - T.ch3a, EV.stepOff - T.ch3a + 0.7));
        for (const m of list.sort((p, q) => p.feet - q.feet)) {
          const marching = m.a > 0.001 && m.a < 0.999;
          let pose, s = m.s;
          if (m.front) {
            const swing = -0.30 * crouch; // anticipation dips the blade low
            const rot = swing + 0.22 * lift - 0.12 * carry;
            pose = marching
              ? { ...walkPose(m.dist * 1.4 + 8, 40, 3), rot }
              : { rot, lean: 0.02 };
            s *= 1 - 0.06 * crouch; // squash toward the feet
          } else {
            pose = marching ? walkPose(m.dist * 1.6 + m.ph * 5, 40, 3) : { lean: 0.02 };
          }
          remy(x, m.R, m.px, m.feet, s, { glow: '#ffdca0', glowA: 0.1, ...pose });
          if (m.sword && lt2 >= EV.drawAnticipate - T.ch3a) drawGreatsword(x, m.px, m.feet, s, lt2, t);
        }
        sceneEnd(x);
        tone(x, 0.85);
        damage(x, t);
        blit(ctx, weaveOf(t), Math.cos(t * 0.7) * 1.2);
      },
      fx: fxArchival,
    },

    // ---------------- 12 · ch3b 51–55.5 (archival) — the clash (hit-stop clock) ----------------
    {
      name: 'ch3b', t0: T.ch3b, t1: T.veteran,
      draw(ctx, lt, dur, t) {
        const { g, stop, sl } = CLASH_CLOCK.warp(lt);
        const x = lowCtx(false);
        const t12 = step12(t);
        const z = 1.02 + 0.1 * seg(g, 0, 4.5);
        sceneBegin(x, ART.clashLow, z, 470 + 24 * seg(g, 0, 4.5), 268);
        const HERO_X = 390, HERO_F = 452;
        const heroX = HERO_X + 40 * E.inOutCubic(seg(g, 2.2, FC_G));
        // squad kinematics (world time g) — the squad starts AT the frame edge at g 0 so the
        // charge reads as one motion with the hero's brace
        const S = [
          { R: ART.squad[0], x0: 985, xt: 630, t0: 0.0, t1: P1_G, k: P1_G, kx: 795 },
          { R: ART.squad[1], x0: 1045, xt: 700, t0: 0.05, t1: P2_G, k: P2_G, kx: 900 },
          { R: ART.squad[2], x0: 1000, xt: 615, t0: 0.03, t1: FC_G, k: null, kx: 0 },
          { R: ART.squad[3], x0: 1065, xt: 760, t0: 0.1, t1: 2.82, k: null, kx: 0 },
        ];
        const squadX = (m, gg) => {
          if (m.k != null && gg >= m.k) return lerp(m.xt, m.kx, E.outCubic(seg(gg, m.k, m.k + 0.55)));
          return lerp(m.x0, m.xt, E.inQuad(seg(gg, m.t0, m.t1)));
        };
        // banner drops behind the hero
        const bd = seg(g, DROP_G, DROP_G + 0.35);
        if (bd > 0) {
          const by = lerp(-190, 128, E.outCubic(bd));
          x.save();
          x.translate(250 - 165 * 0.5, by);
          x.rotate(Math.sin(g * 1.6) * 0.02);
          x.scale(0.5, 0.5);
          x.drawImage(ART.banner, 0, 0);
          x.restore();
        }
        // charging dust (analytic events)
        for (const m of S) {
          for (let gt = m.t0 + 0.12; gt < Math.min(m.t1, FC_G) + 0.05; gt += 0.14) {
            const age = g - gt;
            if (age < 0 || age > 0.5) continue;
            x.fillStyle = `rgba(179,162,116,${(1 - age / 0.5) * 0.2})`;
            x.beginPath(); x.arc(squadX(m, gt) - 24, 456, 3 + age * 16, 0, 7); x.fill();
          }
        }
        // parry sparks
        const spark = (pg, px0) => {
          const age = g - pg;
          if (age < 0 || age > 0.18) return;
          const u = age / 0.18;
          x.strokeStyle = `rgba(255,250,230,${1 - u})`; x.lineWidth = 3;
          for (let i = 0; i < 3; i++) {
            const an = -2.4 + i * 0.5;
            x.beginPath();
            x.moveTo(px0, HERO_F - 200);
            x.lineTo(px0 + Math.cos(an) * (26 + u * 30), HERO_F - 200 + Math.sin(an) * (26 + u * 30));
            x.stroke();
          }
        };
        const actors = S.map((m, i) => ({
          m, R: m.R, x: squadX(m, g), feet: 448, s: 1.85, flip: true,
          topple: TOP_G[i],
        }));
        actors.sort((a, b) => a.feet - b.feet);
        for (let i = 0; i < actors.length; i++) {
          const a = actors[i];
          let rot = 0;
          const f = seg(g, a.topple, a.topple + 0.42);
          if (f > 0) rot = 1.38 * E.inQuad(f);
          const stumble = a.m.k != null ? Math.sin(seg(g, a.m.k, a.m.k + 0.55) * 9) * 0.08 * (1 - seg(g, a.m.k, a.m.k + 0.55)) : 0;
          const white = (a.m.k != null && g >= a.m.k && g < a.m.k + 0.09) || (g >= FC_G && g < FC_G + 0.09);
          const pose = f >= 1
            ? { rot }
            : f > 0
              ? { rot, lean: 0.06 }
              : g >= a.m.t0 && g < (a.m.k ?? a.m.t1) + 0.2
                ? { ...walkPose(Math.abs(a.x) * 0.8, 40, 3.4, 0.09), flip: true, white }
                : { lean: 0.05 * Math.sin(g * 2 + i), flip: true, white };
          remy(x, a.R, a.x + 30 * f, a.feet, a.s, { ...pose, rot: (pose.rot ?? 0) + stumble });
        }
        // hero
        const plant = seg(g, PLANT_G, PLANT_G + 0.3);
        const heroPose = {
          lean: 0.02 + 0.1 * seg(g, 2.2, FC_G) + 0.03 * plant,
          rot: 0.05 * plant,
          white: g >= FC_G && g < FC_G + 0.09,
          glow: '#ffe2a0', glowA: stop != null ? 0.5 : 0.16,
        };
        remy(x, ART.hero, heroX, HERO_F, 2.0 * (1 - 0.05 * E.outCubic(plant)), heroPose);
        spark(P1_G, actors[0].x - 55);
        spark(P2_G, actors[1].x - 55);
        if (g >= FC_G && (stop != null || g < FC_G + 0.2)) { // final clash burst
          const cxp = actors[2].x - 65, cyp = HERO_F - 210;
          x.strokeStyle = 'rgba(255,250,235,0.95)'; x.lineWidth = 4;
          for (let i = 0; i < 6; i++) {
            const an = -2.8 + i * 0.42;
            x.beginPath();
            x.moveTo(cxp, cyp);
            x.lineTo(cxp + Math.cos(an) * 42, cyp + Math.sin(an) * 42);
            x.stroke();
          }
          x.strokeStyle = 'rgba(255,240,200,0.7)';
          x.beginPath(); x.arc(cxp, cyp, 34, 0, 7); x.stroke();
        }
        sceneEnd(x);
        const clean = seg(t, EV.damageClean[0], EV.damageClean[0] + 0.4);
        tone(x, lerp(0.85, 0.28, clean));
        damage(x, t, clean);
        // shake on REAL time during the freeze; weave otherwise
        const shake = stop != null ? 6.5 * (1 - sl / 0.22) : 0;
        blit(ctx, weaveOf(t) + shake * Math.sin(lt * 93), Math.cos(t * 0.7) * 1.2 + shake * Math.cos(lt * 81));
      },
      fx: (lt, t) => {
        const clean = seg(t, EV.damageClean[0], EV.damageClean[0] + 0.4);
        const aber = t >= EV.aberSpike[0] && t < EV.aberSpike[1] ? 0.004 : 0;
        return fxArchival(lt, t, { bloom: 0.03 + 0.06 * clean, bloomThresh: 0.88, grain: 0.02 * (1 - 0.5 * clean), aber });
      },
    },

    // ---------------- 13 · veteran 55.5–63 (present) ----------------
    {
      name: 'veteran', t0: T.veteran, t1: T.memorial,
      draw(ctx, lt, dur, t, overlay) {
        const u = E.inOutCubic(seg(t, EV.interviewPush[0], EV.interviewPush[1]));
        drawSet(ctx, 1.0 + 0.42 * u, lerp(0.53, 0.592, u), lerp(0.5, 0.435, u), t, t >= EV.quietBeat[0]);
        lowerThird(overlay, t, EV.lowerThird2);
      },
      fx: fxPresent(),
    },

    // ---------------- 14 · memorial 63–70.5 (present) ----------------
    {
      name: 'memorial', t0: T.memorial, t1: T.endcard,
      draw(ctx, lt, dur, t) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(ART.dawn, 0, 0);
        // the wall: 4,250 hairy ids, 56 columns, cell 34, hero cell at (col 39, row 0)
        const cols = 56, cell = 34, x0 = 8, y0 = 300, rows = Math.ceil(HAIRY.length / cols);
        const heroIdx = HAIRY.indexOf(42);
        const heroCell = [x0 + (heroIdx % cols) * cell + cell / 2, y0 + Math.floor(heroIdx / cols) * cell + cell / 2];
        const pu = E.inOutCubic(seg(t, EV.memorialPush[0], EV.memorialPush[1]));
        const z = lerp(1.0, 2.15, pu);
        const cx = lerp(960, heroCell[0], pu * 0.92);
        const cy = lerp(660, heroCell[1] + 46, pu * 0.92);
        const toS = (wx, wy) => [(wx - cx) * z + 960, (wy - cy) * z + 540];
        // soft shadow behind the wall block
        const [wx0, wy0] = toS(x0 - 14, y0 - 14);
        const [wx1, wy1] = toS(x0 + cols * cell + 14, y0 + rows * cell + 14);
        ctx.fillStyle = 'rgba(8,5,3,0.4)';
        ctx.fillRect(wx0, wy0, wx1 - wx0, Math.min(wy1, 1080) - wy0);
        const lit = t >= EV.heroLight;
        const pulse = lit ? 1 + 0.045 * Math.sin((t - EV.heroLight) * 4.4) : 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            if (idx >= HAIRY.length) break;
            const [sx, sy] = toS(x0 + c * cell + cell / 2, y0 + r * cell + cell / 2);
            if (sx < -30 || sx > 1950 || sy < -30 || sy > 1110) continue;
            const id = HAIRY[idx];
            const isHero = id === 42;
            const s = cell * 0.647 * z * (isHero ? pulse : 1);
            ctx.drawImage(ART.heads, (id % 67) * 16, Math.floor(id / 67) * 16, 16, 16, sx - s / 2, sy - s / 2, s, s);
          }
        }
        if (lit) { // warm light on ONE head
          const [hx, hy] = toS(heroCell[0], heroCell[1]);
          const g = ctx.createRadialGradient(hx, hy, 4, hx, hy, 130 * z);
          g.addColorStop(0, 'rgba(255,196,110,0.5)'); g.addColorStop(0.4, 'rgba(255,176,90,0.18)'); g.addColorStop(1, 'rgba(255,176,90,0)');
          ctx.fillStyle = g;
          ctx.fillRect(hx - 150 * z, hy - 150 * z, 300 * z, 300 * z);
          const s = cell * 0.647 * z * pulse * 1.12;
          ctx.drawImage(ART.heads, (42 % 67) * 16, Math.floor(42 / 67) * 16, 16, 16, hx - s / 2, hy - s / 2, s, s);
          // the bell: one soft swell of light across the wall
          const bell = Math.exp(-(t - EV.heroLight) * 1.3);
          if (bell > 0.01) {
            const bg2 = ctx.createRadialGradient(hx, hy, 40, hx, hy, 1500);
            bg2.addColorStop(0, `rgba(255,206,130,${0.14 * bell})`); bg2.addColorStop(1, 'rgba(255,206,130,0)');
            ctx.fillStyle = bg2; ctx.fillRect(0, 0, W, H);
          }
        }
        ctx.drawImage(ART.shelf, 0, 900);
        // the wreath settles at EV.wreathSettle — below the hero's place in the wall
        const wu = seg(t, EV.wreathSettle - 0.6, EV.wreathSettle);
        if (wu > 0) {
          const oy = (1 - E.outBack(wu)) * -52;
          ctx.drawImage(ART.wreath, 1130, 636 + oy, 340, 340);
        }
      },
      fx: fxPresent({ vignette: 0.42, bloom: 0.07, bloomThresh: 0.86 }),
    },

    // ---------------- 15 · endcard 70.5–74 (present) ----------------
    {
      name: 'endcard', t0: T.endcard, t1: T.brand,
      draw(ctx, lt, dur, t) {
        ctx.drawImage(ART.charcoal, 0, 0);
        const u = seg(t, EV.endcardLand, EV.endcardLand + 0.5);
        if (u > 0) {
          txt(ctx, COPY.endcard.main, 960, 492 - (1 - E.outCubic(u)) * 18, {
            size: 66, font: F.serif, weight: 600, align: 'center', track: 6, color: PAPER_INK, alpha: u, glow: '#33200a', glowBlur: 22,
          });
        }
        const ru = E.outCubic(seg(t, EV.endcardLand + 0.4, EV.endcardLand + 1.0));
        if (ru > 0) { ctx.fillStyle = AMBER; ctx.globalAlpha = ru; ctx.fillRect(960 - 240 * ru, 546, 480 * ru, 2); ctx.globalAlpha = 1; }
        const su = seg(t, EV.endcardLand + 0.6, EV.endcardLand + 1.1);
        if (su > 0) txt(ctx, COPY.endcard.sub, 960, 612, { size: 21, font: F.mono, weight: 600, align: 'center', track: 6, color: '#c2ad86', alpha: su });
      },
      fx: fxPresent(),
    },

    // ---------------- 16 · brand 74–78 (present) ----------------
    {
      name: 'brand', t0: T.brand, t1: T.end,
      draw(ctx, lt, dur, t) {
        ctx.drawImage(ART.charcoal, 0, 0);
        const u = seg(t, EV.brandLand, EV.brandLand + 0.5);
        if (u > 0) {
          txt(ctx, COPY.brand.line, 960, 478 - (1 - E.outCubic(u)) * 18, {
            size: 88, font: F.serif, weight: 600, align: 'center', track: 6, color: PAPER_INK, alpha: u, glow: '#33200a', glowBlur: 26,
          });
        }
        const su = seg(t, EV.studioMark, EV.studioMark + 0.6);
        if (su > 0) txt(ctx, COPY.brand.studio, 960, 570, { size: 21, font: F.mono, weight: 600, align: 'center', track: 7, color: '#c2ad86', alpha: su });
        const a = seg(t, EV.fade[0], EV.fade[1]);
        if (a > 0) { ctx.fillStyle = `rgba(3,2,2,${a})`; ctx.fillRect(0, 0, W, H); }
      },
      fx: fxPresent(),
    },
  ],
};

// ---------------- chapter card painter ----------------
function chapterCard(ctx, t, line, land, ruleT, numeral) {
  ctx.drawImage(ART.paper, 0, 0);
  const nu = seg(t, land - 0.15, land + 0.5);
  if (nu > 0) {
    ctx.globalAlpha = 0.055 * nu;
    txt(ctx, numeral, 960, 560, { size: 520, font: F.serif, weight: 600, align: 'center', base: 'middle', color: PAPER_INK });
    ctx.globalAlpha = 1;
  }
  const u = seg(t, land, land + 0.45);
  if (u > 0) {
    txt(ctx, line, 960, 512 - (1 - E.outCubic(u)) * 18, {
      size: 60, font: F.serif, weight: 600, align: 'center', track: 5, color: PAPER_INK, alpha: u, glow: '#2c1c08', glowBlur: 18,
    });
  }
  const ru = E.outCubic(seg(t, ruleT, ruleT + 0.6));
  if (ru > 0) { ctx.fillStyle = AMBER; ctx.globalAlpha = ru; ctx.fillRect(960 - 300 * ru, 574, 600 * ru, 2); ctx.globalAlpha = 1; }
}
