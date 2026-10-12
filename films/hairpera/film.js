// THE PHANTOM OF THE HAIRPERA — Remy Boys film #34. 96 s, 1080p via a 960×540 pixel stage (2× nearest).
// Picture side: every animated quantity traces to films/hairpera/timeline.js — SHOTS for the map,
// *_EV world-g tables for the choreography, warp()/filmT() for the hit-stop clock (actors freeze
// at g, impact FX run on rt = g + stop.sl, shake runs on real film time), CAM for the camera,
// CAPS/CAP_STYLES/FLASHES handed straight to the runtime. score.js (the composer's file) is
// imported lazily so stills still render before their stub lands.
import { W, H, hash, seg, lerp, E } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js';
import * as ART from './art.js';
import {
  DUR, SHOTS, CAST, CAPS, CAP_STYLES, FLASHES, CAM, HIT, STOPS,
  warp, filmT, BACKDROP_CRASH, CLASH_1, CLASH_2, CABLE_SNAP, CHANDELIER_CRASH, MASQ_FREEZE, MASK_OFF,
  GRID,
  OVERTURE_EV, REHEARSAL_EV, MIRROR_EV, LAIR_BEATS, MASQ_EV, DUEL_EV, CHANDELIER_EV, CODA_EV,
  LW, LH, GROUND, BEAT,
} from './timeline.js';

const S = {}; // prepared art (read-only in draw)
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// film-time anchors of the hit-stops (shake + aber key on these, never on raw g)
const STOP_FILM_T = STOPS.map((s) => filmT(s.g)); // [18, 72.5, 75.5, 82, 86]
const CRASH_F = filmT(CHANDELIER_CRASH);          // 86.0
const CRASH_G = CHANDELIER_CRASH;                 // 85.25

let scoreFn = null; // the composer owns ./score.js — guard the import, stills run silent without it

// ---------- stock poses (planted feet: lift/stride stay small, lean carries the move) ----------
const idle = (t, k = 1) => ({ lean: Math.sin(t * 2.1) * 0.014 * k, lift: [0, 0], stride: [0, 0] });
const walkCycle = (ph) => {
  const s = Math.sin(ph) * 0.8;
  return {
    lift: [Math.round(Math.max(0, s) * 5), Math.round(Math.max(0, -s) * 5)],
    stride: [Math.round(s * 2), Math.round(-s * 2)],
    lean: 0.05,
  };
};

function flashK(t) {
  let k = 0;
  for (const [ft, peak, decay] of FLASHES) if (t >= ft) k = Math.max(k, peak * Math.exp(-(t - ft) / decay));
  return k;
}

// ---------- camera (CAM keys, clamped smoothstep on FILM time) ----------
function camAt(name, t) {
  const ks = CAM[name];
  if (t <= ks[0].t) return ks[0];
  const last = ks[ks.length - 1];
  if (t >= last.t) return last;
  let i = 0;
  while (t > ks[i + 1].t) i++;
  const a = ks[i], b = ks[i + 1];
  const u = seg(t, a.t, b.t), s = u * u * (3 - 2 * u);
  return { x: lerp(a.x, b.x, s), y: lerp(a.y, b.y, s), k: lerp(a.k, b.k, s) };
}
function applyCam(x, cam) {
  x.translate(LW / 2, LH / 2);
  x.scale(cam.k, cam.k);
  x.translate(-cam.x, -cam.y);
}
// impact shake on REAL film time (runs through freezes), exponential decay
function shakeAt(t) {
  let s = 0;
  for (const ft of STOP_FILM_T) {
    const d = t - ft;
    if (d >= 0 && d < 0.5) s = Math.max(s, 2.6 * Math.exp(-d / 0.16));
  }
  return s;
}

// ---------- the pixel stage ----------
function blit(ctx) {
  ctx.imageSmoothingEnabled = false; // re-assert every frame
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
}
const low = () => S.low.getContext('2d');
const beginLow = () => {
  const x = low();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#060309';
  x.fillRect(0, 0, LW, LH);
  return x;
};

// gold star glint on the overlay (post-grade, full-res coords)
function star(ctx, x, y, r, rot, a, col = '255,222,140') {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  ctx.rotate(rot);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const len = r * (i % 2 ? 0.45 : 1);
    const g = ctx.createLinearGradient(0, 0, Math.cos(ang) * len, Math.sin(ang) * len);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.strokeStyle = g;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len); ctx.stroke();
  }
  const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.4);
  rg.addColorStop(0, `rgba(${col},${a * 0.9})`); rg.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, 7); ctx.fill();
  ctx.restore();
}

// the Phantom, cape behind + sprite; the cape anchors at the TRUE shoulder line — these chibi
// rigs carry a 46px-native head (feet−202..feet−112), so shoulders sit at ≈ feet−104, not −192.
function phantom(x, rig, cx, feet, t, o = {}) {
  const cape = o.cape ?? {};
  ART.drawCape(x, cx, feet - 104, t, {
    len: cape.len ?? 100, amp: cape.amp ?? 6, sway: cape.sway ?? 0, alpha: o.alpha ?? 1,
    col: cape.col ?? '#0b0b10', hi: cape.hi ?? '#191922', spread: cape.spread ?? 1,
  });
  ART.shadow(x, cx, feet, 18, 0.35 * (o.alpha ?? 1));
  A.drawRemy(x, rig, cx, feet, {
    ...(o.pose ?? idle(t)), sy: o.sy ?? 2, alpha: o.alpha ?? 1,
    flip: o.flip ?? false, lean: (o.pose?.lean ?? 0) + (o.lean ?? 0),
  });
}

// ================================================================ OVERTURE ===
function drawOverture(ctx, lt, dur, t, ov) {
  const x = beginLow();
  const g = warp(t).g;
  const cam = camAt('overture', t);
  const reveal = seg(g, OVERTURE_EV.bloom - 0.5, OVERTURE_EV.bloom + 1.8);
  x.save();
  applyCam(x, cam);
  x.drawImage(S.house, -ART.OVER, -ART.OVER);
  // the candle on its stand, centre stage
  const grow = seg(g, OVERTURE_EV.matchStrike, OVERTURE_EV.matchStrike + 1.2);
  x.fillStyle = '#241a10'; x.fillRect(470, 380, 20, 62);
  x.fillStyle = ART.PAL.gold; x.fillRect(468, 378, 24, 5);
  x.fillStyle = ART.PAL.goldLo; x.beginPath(); x.ellipse(480, 442, 22, 6, 0, 0, 7); x.fill();
  ART.candle(x, 480, 380, 34, t, 5, 0, grow);
  // match strike flare at the wick
  const mage = g - OVERTURE_EV.matchStrike;
  if (mage >= 0 && mage < 0.6) {
    const a = 1 - mage / 0.6;
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = `rgba(255,214,140,${0.8 * a})`;
    x.lineWidth = 2;
    x.beginPath(); x.moveTo(462, 392); x.lineTo(474, 378 - mage * 20); x.stroke();
    x.restore();
    ART.warmGlow(x, 476, 376, 26, 0.4 * a);
  }
  if (grow > 0.05) ART.warmGlow(x, 480, 356, 90 + 130 * grow, 0.16 * grow, '255,190,110');
  ART.footlights(x, t, reveal);
  // chandelier at rest, catching up as the house lights
  ART.drawCables(x, GEO_CH.x, GEO_CH.mountY, GEO_CH.x, GEO_CH.restY, 2);
  ART.drawChandelier(x, { x: GEO_CH.x, y: GEO_CH.restY, scale: 0.62, ang: 0.006 * Math.sin(t * 0.8), lit: 0.25 + 0.5 * reveal, broken: 0, t });
  // the house reveals on the bloom — darkness with a growing hole at the candle (world coords)
  if (reveal < 1) {
    ART.darkness(x, 0.965 * (1 - reveal) + 0.02, [
      { x: 480, y: 356, r: 110 + 460 * reveal, soft: 0.72 },
      { x: 480, y: 300, r: 80, soft: 0.9 },
    ]);
  }
  x.restore();
  blit(ctx);
}

// =============================================================== REHEARSAL ===
function drawRehearsal(ctx, lt, dur, t, ov) {
  const x = beginLow();
  const { g, sl } = warp(t);          // warp() → { g, stop, sl }: sl is the freeze-local time
  const rt = g + sl;
  const cam = camAt('rehearsal', t);
  const sh = shakeAt(t);
  x.save();
  x.translate(Math.sin(t * 61) * sh, Math.cos(t * 53) * sh * 0.6);
  applyCam(x, cam);
  x.drawImage(S.rehearsal, -ART.OVER, -ART.OVER);
  // THE BACKDROP — separate movable painter: sway → fall → crumple (impact g=18 = freeze start)
  const sway = g >= REHEARSAL_EV.preCrash && g < BACKDROP_CRASH
    ? Math.sin((g - REHEARSAL_EV.preCrash) * 16) * 0.045 * seg(g, REHEARSAL_EV.preCrash, BACKDROP_CRASH)
    : 0;
  const fallP = seg(g, BACKDROP_CRASH - 0.32, BACKDROP_CRASH); // lands exactly AT the hit
  ART.paintBackdrop(x, sway, fallP, t);
  // dust trickles in the anticipation, plume blooms through the freeze on rt
  if (g >= REHEARSAL_EV.preCrash && g < BACKDROP_CRASH) {
    for (let i = 0; i < 5; i++) {
      const a = ((g - REHEARSAL_EV.preCrash) * 2 + hash(i * 7)) % 1;
      x.fillStyle = `rgba(148,132,110,${0.4 * (1 - a)})`;
      x.fillRect(400 + i * 80, 400 + a * 26, 2, 2);
    }
  }
  ART.dustPlume(x, { g: BACKDROP_CRASH, x: 560, y: 404, seed: 9 }, rt, 1.7);
  ART.dustPlume(x, { g: BACKDROP_CRASH + 0.12, x: 420, y: 412, seed: 13 }, rt, 1.2);
  // stagehand bustle: two far Remys carry a plank across upstage (clear before the silence)
  if (g >= REHEARSAL_EV.bustle && g < 17.1) {
    const u = E.inOutCubic(seg(g, REHEARSAL_EV.bustle, 17.0));
    const hx = lerp(920, 60, u);
    const pose = walkCycle(g * 7);
    for (const [dx, id] of [[0, 3], [46, 6]]) {
      ART.shadow(x, hx + dx, 416, 12, 0.3);
      A.drawRemy(x, S.chorus[id], hx + dx, 416, { ...pose, sy: 1.55 });
    }
    x.fillStyle = '#4a3620'; x.fillRect(hx - 6, 348, 58, 5); // the plank
  }
  // Giry conducts (bald maestro, baton on the 0.75 s beat)
  const beatPh = ((g - 12) / BEAT.rehearsal) % 1;
  const gX = 330, gF = 442;
  const gasp = seg(g, 18.5, 18.7) * (1 - seg(g, 19.0, 19.5));
  ART.shadow(x, gX, gF, 17, 0.35);
  A.drawRemy(x, S.giry, gX, gF, { ...idle(t, 0.8), lean: Math.sin(beatPh * Math.PI * 2) * 0.035 - 0.1 * gasp, sy: 2, flip: false });
  x.save(); // baton
  x.translate(gX + 13, gF - 96);
  x.rotate(-0.7 + Math.sin(beatPh * Math.PI * 2) * 0.55 - 0.4 * gasp);
  x.fillStyle = '#e8e2d2'; x.fillRect(0, -1.2, 26, 2.4);
  x.restore();
  // Carlotta's scale — rising gold flourish, one per bar
  const cX = 560, cF = 446;
  if (g >= REHEARSAL_EV.carlottaScale && g < 17.25) {
    const nbar = Math.floor((g - REHEARSAL_EV.carlottaScale) / 3);
    ART.notes(x, cX, 316, g, REHEARSAL_EV.carlottaScale + nbar * 3, '232,201,106', 52, 5);
  }
  ART.shadow(x, cX, cF, 18, 0.36);
  A.drawRemy(x, S.carlotta, cX, cF, { ...idle(t), sy: 2.06, lean: Math.sin(beatPh * Math.PI * 2) * 0.03 - 0.12 * gasp, flip: true });
  // chorus watchers gasp as the world resumes
  for (const [wx, wy, id] of [[236, 420, 0], [806, 424, 7]]) {
    ART.shadow(x, wx, wy, 13, 0.28);
    A.drawRemy(x, S.chorus[id], wx, wy, { ...idle(t, 0.6), lean: -0.1 * gasp, lift: [0, 0], sy: 1.6 });
  }
  ART.footlights(x, t, 1);
  ART.drawCables(x, GEO_CH.x, GEO_CH.mountY, GEO_CH.x, GEO_CH.restY, 2);
  ART.drawChandelier(x, { x: GEO_CH.x, y: GEO_CH.restY, scale: 0.62, ang: 0.006 * Math.sin(t * 0.8), lit: 0.55, broken: 0, t });
  x.restore();
  // whisper dim: the house holds its breath after the crash
  const dim = seg(t, 19.5, 20.5);
  if (dim > 0) {
    x.fillStyle = `rgba(4,2,8,${0.16 * dim})`;
    x.fillRect(0, 0, LW, LH);
  }
  blit(ctx);
}

// ================================================================== MIRROR ===
function drawMirror(ctx, lt, dur, t, ov) {
  const x = beginLow();
  const g = warp(t).g;
  const cam = camAt('mirror', t);
  x.save();
  applyCam(x, cam);
  x.drawImage(S.dressing, -ART.OVER, -ART.OVER);
  const M = ART.GEO.mirror;
  // Christine enters from the right, steps to the glass
  const inU = E.outCubic(seg(g, MIRROR_EV.christineIn, MIRROR_EV.christineIn + 1.9));
  let cX = lerp(830, 500, inU);
  cX = lerp(cX, 480, E.outCubic(seg(g, MIRROR_EV.sheSteps, MIRROR_EV.sheSteps + 0.65)));
  const walking = g < MIRROR_EV.christineIn + 1.9;
  const sway = Math.sin(g * 1.15) * 0.05 * seg(g, MIRROR_EV.glassGlow, MIRROR_EV.glassGlow + 2); // entranced sway
  ART.shadow(x, cX, GROUND, 17, 0.35);
  A.drawRemy(x, S.christine, cX, GROUND, {
    ...(walking ? walkCycle((g - MIRROR_EV.christineIn) * 6.4) : idle(t, 0.7)),
    lean: (walking ? 0.05 : sway), sy: 2, flip: true,
  });
  // her soft song (silver notes), until the glass starts answering
  if (g >= MIRROR_EV.softSong && g < MIRROR_EV.glassGlow + 1) {
    const nbar = Math.floor((g - MIRROR_EV.softSong) / 3);
    ART.notes(x, cX - 26, 258, g, MIRROR_EV.softSong + nbar * 3, '185,196,214', 34, 9);
  }
  // candles lean toward the glass on flamesLean — he is near
  const leanK = seg(g, MIRROR_EV.flamesLean, MIRROR_EV.flamesLean + 1.2);
  const lean = leanK * 0.55;
  ART.candle(x, ART.GEO.vanity.candles[0][0], ART.GEO.vanity.candles[0][1], 16, t, 21, -lean, 1);
  ART.candle(x, ART.GEO.vanity.candles[1][0], ART.GEO.vanity.candles[1][1], 14, t, 22, -lean, 1);
  ART.candle(x, ART.GEO.vanity.candles[2][0], ART.GEO.vanity.candles[2][1], 12, t, 23, -lean * 0.8, 1);
  ART.candle(x, ART.GEO.sconces[0][0] - 1, ART.GEO.sconces[0][1] - 14, 12, t, 24, lean * 0.8, 1);
  ART.candle(x, ART.GEO.sconces[1][0] + 1, ART.GEO.sconces[1][1] - 14, 12, t, 25, -lean * 0.8, 1);
  // the glass: glow → the face in it → his hand through the frame
  const glowK = seg(g, MIRROR_EV.glassGlow, MIRROR_EV.glassGlow + 2.2);
  const faceK = seg(g, MIRROR_EV.faceFade, MIRROR_EV.faceFade + 1.3);
  x.save();
  x.beginPath(); x.ellipse(M.cx, M.cy, M.rx, M.ry, 0, 0, 7); x.clip();
  if (glowK > 0) {
    const gg = x.createRadialGradient(M.cx, M.cy - 14, 8, M.cx, M.cy - 14, M.rx * 1.2);
    gg.addColorStop(0, `rgba(255,196,110,${0.5 * glowK})`); gg.addColorStop(1, 'rgba(255,196,110,0)');
    x.fillStyle = gg;
    x.fillRect(M.cx - M.rx, M.cy - M.ry, M.rx * 2, M.ry * 2);
  }
  if (faceK > 0) {
    x.save();
    x.globalAlpha = 0.88 * faceK;
    x.drawImage(S.phantom.c, 395 - S.phantom.cx * 1.55, 218 - (S.phantom.top + 26) * 1.55,
      S.phantom.w * 1.55, S.phantom.h * 1.55);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = `rgba(126,148,186,${0.3 * faceK})`; // cold ghost tint
    x.fillRect(M.cx - M.rx, M.cy - M.ry, M.rx * 2, M.ry * 2);
    x.restore();
  }
  x.restore();
  // THE TOUCH — grounded in the real rig metrics (76×116 chibi: Christine's face spans y 262..318
  // at feet 430, chin ≈318, so the meet point sits beside her jaw, never across the bangs).
  // His hand emerges from the ghost inside the glass (tux sleeve, warm-dark skin); hers reaches
  // across from her side (navy knit sleeve, pale skin) and presses over his. QA D1 fix.
  const handK = E.outCubic(seg(g, MIRROR_EV.handExtend, MIRROR_EV.handExtend + 0.8));
  const reach = E.outCubic(seg(g, MIRROR_EV.handExtend + 0.55, MIRROR_EV.mirrorTouch));
  const CX0 = 434, CY0 = 312;                        // palm-meet point (HIT.x, refined y below her face)
  if (handK > 0) {
    // his arm grows out of the ghost's chest toward the glass plane
    const tx = lerp(416, CX0 - 2, handK), ty = lerp(282, CY0 - 2, handK);
    ART.reachArm(x, 402, 268, tx, ty, { sleeve: '#101018', skin: '#a87c5e', w: 6.2, cuff: '#e8e2d2' });
    // glass-plane ripple where his wrist crosses the surface — sells "through the mirror"
    x.save();
    x.strokeStyle = `rgba(220,232,250,${0.34 * handK})`;
    x.lineWidth = 1.6;
    x.beginPath(); x.ellipse(418, 292, 6 + 3 * handK, 12 + 4 * handK, -0.9, 0, 7); x.stroke();
    x.restore();
  }
  if (reach > 0) {
    // her forearm rises from her shoulder, elbow low, and presses over his palm
    const tx = lerp(452, CX0 + 3, reach), ty = lerp(326, CY0 + 1, reach);
    ART.reachArm(x, cX - 18, GROUND - 94, tx, ty, { sleeve: '#1e4a8e', skin: '#ecd2ac', w: 5.8, cuff: '#c9b896' });
  }
  const touch = seg(g, MIRROR_EV.mirrorTouch, MIRROR_EV.mirrorTouch + 0.25);
  if (touch > 0) {
    ART.warmGlow(x, CX0, CY0, 40 + 60 * touch, 0.4 * touch * (1 - seg(g, MIRROR_EV.irisClose, MIRROR_EV.irisClose + 0.8)));
    x.save();
    x.strokeStyle = `rgba(255,240,214,${0.7 * touch})`;
    x.lineWidth = 1.6;
    x.beginPath(); x.ellipse(CX0, CY0, 12 * touch + 3, 8 * touch + 2, 0.4, 0, 7); x.stroke();
    x.restore();
  }
  ART.darkness(x, 0.34, [
    { x: M.cx, y: M.cy, r: 250 + 40 * glowK, soft: 0.8 },
    { x: cX, y: 380, r: 110, soft: 0.7 },
  ]);
  // iris wipe closes on the mirror
  ART.iris(x, seg(g, MIRROR_EV.irisClose, MIRROR_EV.irisClose + 0.85), M.cx, M.cy, 620);
  x.restore();
  blit(ctx);
}

// ==================================================================== LAIR ===
function drawLair(ctx, lt, dur, t, ov) {
  const x = beginLow();
  const g = warp(t).g;
  const cam = camAt('lair', t);
  x.save();
  applyCam(x, cam);
  x.drawImage(S.lair, -ART.OVER, -ART.OVER);
  const L = ART.GEO.lair;
  // rock shelf under the organ
  x.fillStyle = '#0d0f16';
  x.beginPath(); x.moveTo(552, 442); x.quadraticCurveTo(600, 408, 700, 412); x.lineTo(950, 424); x.lineTo(950, 442); x.closePath(); x.fill();
  // the ORGAN
  x.drawImage(S.organ, L.organ.x, L.organ.y);
  const swell = seg(g, LAIR_BEATS.organSwell, LAIR_BEATS.organSwell + 0.8) * (1 - 0.72 * seg(g, LAIR_BEATS.descent, LAIR_BEATS.descent + 2.5));
  const peak = 1 + 0.55 * seg(g, LAIR_BEATS.organPeak, LAIR_BEATS.organPeak + 0.4) * (1 - seg(g, LAIR_BEATS.organPeak + 3, LAIR_BEATS.organPeak + 4));
  const beatPh = ((g - 36) / BEAT.lair) % 1;
  x.save();
  x.translate(L.organ.x, L.organ.y);
  ART.pipeGlints(x, ART.ORGAN_PIPES, beatPh, Math.min(1, swell * peak));
  x.restore();
  // organ keys glow per beat
  const keyPulse = swell * (0.35 + 0.65 * Math.sin(beatPh * Math.PI));
  if (keyPulse > 0.03) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = `rgba(255,214,130,${0.3 * keyPulse})`;
    x.fillRect(L.organ.x + 44, L.organ.y + 262, 146, 26);
    x.restore();
  }
  // the PHANTOM at the console — hands travel over the keys
  const pX = L.console.x - 16, pF = 436;
  phantom(x, S.phantom, pX, pF, t, {
    pose: idle(t, 0.8),
    lean: Math.sin(beatPh * Math.PI * 2) * 0.022 * swell,
    cape: { amp: 4, sway: Math.sin(t * 0.7) * 2, len: 104 },
  });
  if (swell > 0.05) {
    x.save();
    x.strokeStyle = '#cbb494'; x.lineWidth = 4;
    for (const s of [-1, 1]) {
      const hx = L.organ.x + 84 + s * 14 + Math.sin(g * 2.2 + s) * 22;
      const hy = L.organ.y + 268 + Math.abs(Math.sin(g * 1.7 + s)) * 5;
      x.beginPath();
      x.moveTo(pX + s * 12, pF - 104);          // from the true shoulder line, never across the face
      x.quadraticCurveTo(pX + s * 30, pF - 96, hx, hy - 3);
      x.stroke();
      x.fillStyle = '#e4cdae';
      x.beginPath(); x.ellipse(hx, hy, 4.4, 2.8, 0, 0, 7); x.fill();
    }
    x.restore();
  }
  // CANDELABRAS rise out of the water ON their beats, flames ignite on them
  L.candelabraX.forEach((cx2, i) => {
    const beat = LAIR_BEATS.candleRise[i];
    const riseK = seg(g, beat - 0.38, beat);
    if (riseK <= 0) return;
    const lit = seg(g, beat, beat + 0.14);
    const cy2 = L.waterY + 108 * (1 - riseK);
    x.save();
    x.globalAlpha = 0.35 + 0.65 * riseK;
    x.drawImage(S.cand, cx2 - 38, cy2 - 108);
    x.restore();
    // flames on the three arms once lit — wide amber pools (the lair is candle-keyed, QA D8)
    if (lit > 0) {
      for (const s of [-27, 0, 27]) {
        ART.flame(x, cx2 + s, cy2 - 108 + 20 - (s === 0 ? 12 : 0), 6.5, t, i * 7 + s, Math.sin(t * 1.4 + i) * 0.1, lit);
        ART.warmGlow(x, cx2 + s, cy2 - 90, 44, 0.17 * lit);
      }
      ART.warmGlow(x, cx2, cy2 - 70, 90, 0.1 * lit);
    }
    // ignition splash rings
    {
      const age = g - beat;
      if (age >= 0 && age < 0.55) {
        x.strokeStyle = `rgba(150,180,220,${0.5 * (1 - age / 0.55)})`;
        x.lineWidth = 1.6;
        x.beginPath(); x.ellipse(cx2, L.waterY + 2, 8 + age * 90, (8 + age * 90) * 0.2, 0, 0, 7); x.stroke();
      }
    }
  });
  // water veil over the submerged candelabra feet
  x.fillStyle = 'rgba(6,10,18,0.55)';
  x.fillRect(-ART.OVER, L.waterY + 4, LW + 2 * ART.OVER, LH + ART.OVER - L.waterY);
  // GONDOLA glides out of the fog with Christine
  const gIn = seg(g, LAIR_BEATS.gondolaIn, LAIR_BEATS.gondolaIn + 2.2);
  if (gIn > 0) {
    const gx = lerp(-130, L.gondolaX, E.outCubic(gIn));
    const bob = Math.sin(g * 1.25) * 2.6;
    x.save();
    x.globalAlpha = Math.min(1, gIn * 2.5);
    x.drawImage(S.gondola, gx - 95, 404 + bob);
    x.restore();
    if (gIn < 0.98) { // wake while gliding
      x.strokeStyle = 'rgba(125,144,181,0.25)';
      x.lineWidth = 1.4;
      x.beginPath();
      x.moveTo(gx - 90, 436 + bob);
      x.quadraticCurveTo(gx - 140, 440 + Math.sin(g * 3) * 3, gx - 190, 436 + bob);
      x.stroke();
    }
    const entranced = seg(g, LAIR_BEATS.entranced, LAIR_BEATS.entranced + 1.2);
    ART.shadow(x, gx + 4, 416 + bob, 13, 0.3);
    A.drawRemy(x, S.christine, gx + 4, 414 + bob, {
      ...idle(t, 0.9),
      lean: Math.sin(g * 1.02) * 0.055 * entranced,
      sy: 1.9, flip: false,
    });
    if (entranced > 0.2) { // hand to heart
      x.save();
      x.translate(gx + 4, 414 + bob - 116);
      x.rotate(0.5 - entranced * 0.2);
      x.fillStyle = '#e4cdae';
      x.beginPath(); x.ellipse(4, 0, 5, 3.6, 0, 0, 7); x.fill();
      x.restore();
    }
    // her reflection in the black water
    x.save();
    x.globalAlpha = 0.12;
    x.translate(gx + 4, 440 + bob);
    x.scale(1, -0.5);
    A.drawRemy(x, S.christine, 0, 0, { ...idle(t, 0.9), lean: Math.sin(g * 1.02) * 0.055 * entranced, sy: 1.9, flip: false });
    x.restore();
  }
  // candle reflections + shimmer + fog
  L.candelabraX.forEach((cx2, i) => {
    if (g >= LAIR_BEATS.candleRise[i]) ART.waterRefl(x, cx2, L.waterY + 2, t, '255,179,71', 0.12);
  });
  ART.waterRefl(x, L.organ.x + 120, L.waterY + 2, t, '255,190,110', 0.08 * swell);
  ART.waterShimmer(x, t);
  const fogA = 0.15 + 0.1 * seg(g, LAIR_BEATS.descent, LAIR_BEATS.descent + 2.5);
  ART.fog(x, t, 372, 446, fogA, '148,158,186', 3);
  // darkness with candle holes
  ART.darkness(x, 0.4, [
    { x: L.organ.x + 120, y: 240, r: 240, soft: 0.75 },
    ...L.candelabraX.map((cx2, i) => ({ x: cx2, y: L.waterY - 60, r: g >= LAIR_BEATS.candleRise[i] ? 110 : 20, soft: 0.7 })),
    { x: ART.GEO.lair.gondolaX, y: 400, r: 90, soft: 0.7 },
  ]);
  x.restore();
  blit(ctx);
}

// ============================================================= MASQUERADE ===
// 3/4 kick choreography from the 180 BPM grid (1 s bars from film 54). The freeze at film 61 is
// CHOREOGRAPHY (pose hold) — only the PHANTOM keeps moving; the chandelier sways through the hold.
function waltzPose(phi, alt) {
  const bar = Math.floor(phi), u = phi - bar;
  const air = u < 0.5 ? Math.sin(Math.PI * u * 2) : 0;      // kick on the downbeat
  const sway = Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.33) / 0.67)) * Math.PI);
  return {
    lift: [Math.round(air * 9), Math.round(air * 9)],
    stride: [sway * 5 * alt, -sway * 5 * alt],
    lean: sway * 0.08 * alt,
    air,
  };
}
function drawMasquerade(ctx, lt, dur, t, ov) {
  const x = beginLow();
  const cam = camAt('masquerade', t);
  const freezeF = filmT(MASQ_FREEZE);            // 61.0
  const releaseF = filmT(MASQ_EV.waltzRelease);   // 65.0
  // choreography clock: runs, holds mid-kick just past the freeze anchor, resumes where it left
  const HOLD = 0.14;
  const chp = t < freezeF + HOLD ? t : t < releaseF ? freezeF + HOLD : freezeF + HOLD + (t - releaseF);
  const phi = chp - 54;
  x.save();
  applyCam(x, cam);
  x.drawImage(S.house, -ART.OVER, -ART.OVER);
  x.drawImage(S.masq, -ART.OVER, -ART.OVER);
  // chorus rows — mirrored 3/4 kick
  const rows = [
    { y: ART.GEO.masq.rowA.y, xs: ART.GEO.masq.rowA.xs, sy: 1.62, ids: [0, 1, 2, 3], ph: 0 },
    { y: ART.GEO.masq.rowB.y, xs: ART.GEO.masq.rowB.xs, sy: 1.98, ids: [4, 5, 6, 7], ph: 0.5 },
  ];
  for (const row of rows) {
    row.xs.forEach((px, i) => {
      const alt = i % 2 === 0 ? 1 : -1;
      const p = waltzPose(phi + row.ph, alt);
      const hop = p.air * (row.sy > 1.8 ? 16 : 12);   // big downbeat kick — must survive the encode
      ART.shadow(x, px, row.y, 13, 0.3 * (1 - p.air * 0.4));
      A.drawRemy(x, S.chorus[row.ids[i]], px, row.y - hop, {
        lift: p.lift, stride: p.stride, lean: p.lean, sy: row.sy,
      });
    });
  }
  // RED DEATH descends the stairs — the only mover through the freeze.
  // MASQ_EV is WORLD time: convert through filmT or he enters 0.25 s early (QA D4).
  const descendT = filmT(MASQ_EV.phantomDescend);   // 63.0
  const descend = seg(t, descendT, descendT + 1.6);
  if (descend > 0) {
    const p = E.inOutCubic(descend);
    const rX = lerp(ART.GEO.masq.stairTop.x, ART.GEO.masq.stairBase.x, p);
    const rF = lerp(ART.GEO.masq.stairTop.y, ART.GEO.masq.stairBase.y, p);
    const menace = t > descendT + 1.6;
    ART.drawCape(x, rX, rF - 104, t, {
      col: '#7a1626', hi: '#a82034', len: 112 + 24 * (1 - p), amp: menace ? 5 : 10,
      sway: Math.sin(t * 2.4) * (menace ? 3 : 9), spread: 1.5, rim: 'rgba(232,201,106,0.2)',
    });
    ART.shadow(x, rX, rF, 18, 0.4);
    A.drawRemy(x, S.redDeath, rX, rF, {
      ...(menace ? idle(t, 0.7) : walkCycle(t * 5.2)),
      lean: menace ? Math.sin(t * 0.9) * 0.02 : 0.08 * (1 - p),
      sy: 2.06, rot: 0,
    });
    ART.warmGlow(x, rX, rF - 190, 44, 0.1, '168,30,48');
  }
  // the house chandelier sways through the hold
  const swayK = seg(t, freezeF, freezeF + 0.6) * (1 - seg(t, releaseF, releaseF + 1.5));
  ART.drawCables(x, GEO_CH.x, GEO_CH.mountY, GEO_CH.x + Math.sin((t - freezeF) * 2.2) * 26 * swayK, GEO_CH.restY, 2);
  ART.drawChandelier(x, {
    x: GEO_CH.x + Math.sin((t - freezeF) * 2.2) * 26 * swayK, y: GEO_CH.restY,
    scale: 0.62, ang: Math.sin((t - freezeF) * 2.2 + 0.6) * 0.09 * swayK,
    lit: 0.7, broken: 0, t,
  });
  // confetti — continuous by design (film time), frozen with the tableau
  const confT = filmT(MASQ_EV.confetti);
  ART.drawConfetti(x, S.confetti, chp, seg(t, confT, confT + 0.6));
  ART.footlights(x, t, 1);
  ART.darkness(x, 0.14, [
    { x: 480, y: 300, r: 400, soft: 0.9 },
    { x: 700, y: 360, r: 200, soft: 0.8 },
  ]);
  x.restore();
  blit(ctx);
}

// ================================================================= ROOFTOP ===
function drawRooftop(ctx, lt, dur, t, ov) {
  const x = beginLow();
  const { g, sl } = warp(t);
  const rt = g + sl;
  const cam = camAt('rooftop', t);
  const sh = shakeAt(t);
  x.save();
  x.translate(Math.sin(t * 61) * sh, Math.cos(t * 53) * sh * 0.6);
  applyCam(x, cam);
  x.drawImage(S.roof, -ART.OVER, -ART.OVER);
  ART.moonlight(x, 1);
  const feet = GROUND;
  const drawK = seg(g, DUEL_EV.swordsDraw, DUEL_EV.swordsDraw + 0.4); // blades rise en-garde
  // ---- positions (world g): circle → clash1 → parry → clash2 → cane knock → mask off → vanish
  const circle = Math.sin((g - DUEL_EV.circle) * 2.1);
  let raoulX = 402 + circle * 12, phX = 560 - circle * 12;
  const to1 = seg(g, DUEL_EV.clash1 - 0.5, DUEL_EV.clash1);
  raoulX = lerp(raoulX, HIT.clash1.x - 76, to1);   // tips meet at (500, 268)
  phX = lerp(phX, HIT.clash1.x + 64, to1);
  const par = seg(g, DUEL_EV.parry, DUEL_EV.parry + 0.3) * (1 - seg(g, DUEL_EV.parry + 0.5, DUEL_EV.clash2 - 0.3));
  raoulX -= 10 * par; phX += 10 * par;             // blades scrape, boots slide
  const to2 = seg(g, DUEL_EV.clash2 - 0.4, DUEL_EV.clash2);
  raoulX = lerp(raoulX, HIT.clash2.x - 76, to2);   // tips meet at (520, 262)
  phX = lerp(phX, HIT.clash2.x + 64, to2);
  const back2 = seg(g, DUEL_EV.caneKnock, DUEL_EV.caneKnock + 0.3);
  phX += 14 * back2; raoulX -= 6 * back2;
  const recoils = seg(g, MASK_OFF, MASK_OFF + 0.5);
  raoulX -= 20 * E.outCubic(recoils);
  const rFy = feet, pFy = feet - 26 * seg(g, DUEL_EV.vanishSwirl, DUEL_EV.vanishDone + 0.1);
  const phAlpha = 1 - seg(g, DUEL_EV.vanishSwirl, DUEL_EV.vanishDone);
  // ---- RAOUL (42, blade stripped) — greatsword replaced by the baked rapier line
  ART.shadow(x, raoulX, rFy, 18, 0.38);
  const rPose = g < DUEL_EV.circle + 0.5 ? idle(t, 0.8) : idle(t, 0.5);
  A.drawRemy(x, S.raoul, raoulX, rFy, {
    ...rPose, lean: 0.06 * to1 - 0.1 * recoils + Math.sin(g * 3) * 0.02 * seg(g, DUEL_EV.circle, DUEL_EV.swordsDraw), sy: 2,
  });
  if (drawK > 0) {
    // blade from his lead hand (below the head, beside the body) toward the active clash point
    const hx = raoulX + 22, hy = feet - 138;
    const target = g < DUEL_EV.clash2 - 0.2 ? HIT.clash1 : HIT.clash2;
    let tx, ty;
    if (g > MASK_OFF) { tx = raoulX + 58; ty = feet - 66; }         // lowered after the reveal
    else { tx = lerp(target.x - 40, target.x + 2, Math.max(to1, to2)); ty = target.y; }
    const dl = Math.hypot(tx - hx, ty - hy) || 1;
    const ext = Math.min(1, 58 / dl);                                // cap rapier length
    const ex = hx + (tx - hx) * ext, ey = hy + (ty - hy) * ext;
    ART.bladeTo(x, hx, hy, ex, ey, 'rapier', drawK);
    x.fillStyle = '#1c1712';                                          // sword-hand fist
    x.beginPath(); x.arc(hx, hy, 3.4, 0, 7); x.fill();
  }
  // ---- THE PHANTOM — cape, cane, then the BALD REVEAL, then the vanish
  if (phAlpha > 0.02) {
    const rig = g >= MASK_OFF ? S.phantomBare : S.phantom;
    const swirlK = seg(g, DUEL_EV.vanishSwirl, DUEL_EV.vanishSwirl + 1.2);
    phantom(x, rig, phX, pFy, t, {
      alpha: phAlpha, flip: true,
      lean: -0.05 * to1 + 0.06 * swirlK,
      cape: { amp: 6 + 18 * swirlK, sway: Math.sin(t * 6) * 12 * swirlK, spread: 1 + 0.7 * swirlK, lift: -8 * swirlK },
    });
    ART.batSwirl(x, phX, pFy - 190, t, swirlK * 0.9);
    // cane in hand until it is knocked spinning away
    if (g < DUEL_EV.caneKnock) {
      const target = g < DUEL_EV.clash2 - 0.2 ? HIT.clash1 : HIT.clash2;
      const hx = phX - 22, hy = feet - 138;
      const tx = lerp(target.x + 44, target.x - 2, Math.max(to1, to2));
      const dl = Math.hypot(tx - hx, target.y - hy) || 1;
      const ext = Math.min(1, 46 / dl);                              // cane is shorter
      const ex = hx + (tx - hx) * ext, ey = hy + (target.y - hy) * ext;
      ART.bladeTo(x, hx, hy, ex, ey, 'cane', drawK);
      x.fillStyle = '#1c1712';
      x.beginPath(); x.arc(hx, hy, 3.4, 0, 7); x.fill();
    } else if (g < MASK_OFF) {
      // the cane sails away (pure g analytic; no stop in this window)
      const a = g - DUEL_EV.caneKnock;
      if (a < 1.2) {
        x.save();
        x.translate(HIT.clash2.x + 130 * a, HIT.clash2.y - 140 * a + 260 * a * a);
        x.rotate(a * 9);
        x.fillStyle = '#14100e'; x.fillRect(-24, -1.5, 48, 3);
        x.fillStyle = ART.PAL.gold; x.fillRect(20, -2, 4, 4);
        x.restore();
      } else {
        x.save(); // planted in the roof lead
        x.translate(667, feet + 2); x.rotate(1.35);
        x.fillStyle = '#14100e'; x.fillRect(-24, -1.5, 48, 3);
        x.restore();
      }
    }
    // THE MASK leaves on MASK_OFF — arcs away from his head, bald reveal in moonlight
    if (g >= MASK_OFF) {
      const ma = g - MASK_OFF;
      const mx = phX - 8 + 70 * ma, my = pFy - 200 - 120 * ma + 300 * ma * ma;
      if (ma < 1.05) {
        x.save();
        x.translate(mx, my);
        x.rotate(ma * 7);
        x.drawImage(S.maskProp, -17, -15);
        x.restore();
      } else {
        x.save();
        x.translate(phX + 62, feet - 2); x.rotate(1.1);
        x.drawImage(S.maskProp, -17, -15);
        x.restore();
      }
      // overlay: moon-glint on the departing mask (survives the grade)
      if (ma < 0.7) {
        star(ov, mx * 2, my * 2, 46 * (1 - ma / 0.7), t * 0.4, 0.55 * (1 - ma / 0.7), '214,228,250');
      }
    }
  } else {
    // gone — only the cape settles on the lead
    ART.capePile(x, phX + 6, feet, t, '#0b0b10', seg(g, DUEL_EV.vanishDone - 0.2, DUEL_EV.vanishDone + 0.6));
  }
  // sparks bloom through the clash freezes (rt)
  ART.sparks(x, [
    { g: CLASH_1, x: HIT.clash1.x, y: HIT.clash1.y, seed: 11 },
    { g: CLASH_2, x: HIT.clash2.x, y: HIT.clash2.y, seed: 17 },
    { g: DUEL_EV.parry, x: HIT.clash1.x + 8, y: HIT.clash1.y + 4, seed: 23 },
  ], rt, '255,208,120', 10);
  // boot-slide dust on the parry
  ART.sparks(x, [{ g: DUEL_EV.parry, x: raoulX, y: feet, seed: 31 }], rt, '150,164,196', 5);
  ART.snowMotes(x, t, 1);
  ART.darkness(x, 0.26, [
    { x: 480, y: 300, r: 420, soft: 0.92 },
    { x: 176, y: 120, r: 180, soft: 0.9 },
  ]);
  x.restore();
  blit(ctx);
}

// ============================================================= CHANDELIER ===
// snap (hit-stop) → swing (pendulum, analytic in g) → plunge toward the audience POV (camera
// climbs + zooms per CAM) → CRASH white-out + shards + dust + ducking silhouettes (rt).
function drawChandelierShot(ctx, lt, dur, t, ov) {
  const x = beginLow();
  const { g, sl, stop } = warp(t);
  const rt = g + sl;
  const cam = camAt('chandelier', t);
  const sh = shakeAt(t);
  x.save();
  x.translate(Math.sin(t * 61) * sh, Math.cos(t * 53) * sh * 0.6);
  applyCam(x, cam);
  x.drawImage(S.house, -ART.OVER, -ART.OVER);
  const C = ART.GEO.chan;
  const footK = 1 - 0.45 * seg(g, CHANDELIER_CRASH, CHANDELIER_CRASH + 0.8);
  ART.footlights(x, t, footK);
  // ---- THE PHANTOM ABOVE: silhouette at the cable, saw glinting (glint runs on rt)
  const above = seg(g, CHANDELIER_EV.phantomAbove, CHANDELIER_EV.phantomAbove + 0.5);
  if (above > 0 && g < CABLE_SNAP + 1.5) {
    ART.shadow(x, 516, 66, 11, 0.3 * above);
    A.drawRemy(x, S.phantomBare, 516, 66, { ...idle(t, 0.6), sy: 1.06, alpha: 0.92 * above * (1 - seg(g, CABLE_SNAP + 0.8, CABLE_SNAP + 1.4)) });
    const glint = Math.max(0, Math.sin(rt * 2.6)) ** 8;
    if (glint > 0.05) {
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = `rgba(230,238,250,${0.85 * glint})`;
      x.lineWidth = 1.6;
      x.beginPath(); x.arc(503, 44, 7, -0.6, 1.2); x.stroke();
      x.restore();
      ART.warmGlow(x, 503, 44, 16, 0.2 * glint, '214,228,250');
    }
  }
  // ---- CHANDELIER state machine (world g)
  let chX = C.x, chY = C.restY, chS = 0.62, chAng = 0.005 * Math.sin(t * 0.8), motion = 0, cables = 2, whipRt = -1;
  if (g >= CABLE_SNAP) {
    cables = 1;
    whipRt = rt - CABLE_SNAP;
    // pendulum swing, growing to the plunge
    const swU = seg(g, CABLE_SNAP + 0.2, CHANDELIER_EV.plunge);
    chAng = lerp(0.08, 0.34, swU) * Math.sin((g - CABLE_SNAP - 0.2) * 4.2);
  }
  if (g >= CHANDELIER_EV.plunge) {
    const p = clamp01((g - CHANDELIER_EV.plunge) / (CHANDELIER_CRASH - CHANDELIER_EV.plunge)); // 2 s of fall
    chX = C.x + 60 * (1 - p) * Math.sin((g - CABLE_SNAP - 0.2) * 4.2);
    chY = lerp(C.restY, 400, p ** 1.5);
    chS = lerp(0.62, 2.6, p ** 1.25);
    chAng *= 1 - p;
    motion = p;
    cables = 0;
    if (rt - CHANDELIER_EV.plunge < 0.9) whipRt = rt - CHANDELIER_EV.plunge;
  }
  const crashed = g >= CHANDELIER_CRASH;
  if (!crashed) {
    if (cables > 0) ART.drawCables(x, C.x, C.mountY, chX, chY, cables, whipRt);
    ART.drawChandelier(x, {
      x: chX, y: chY, scale: chS, ang: chAng, lit: 0.85 - 0.3 * motion, broken: 0, t, motion,
    });
  } else {
    // CRASH: wreckage + shards + dust — all rt-driven through the 0.35 s freeze
    ART.drawShards(x, S.crashShards, rt, CHANDELIER_CRASH, 1.7, '224,214,190');
    ART.dustPlume(x, { g: CHANDELIER_CRASH, x: 480, y: 440, seed: 41 }, rt, 2.4, '216,192,152');
    ART.dustPlume(x, { g: CHANDELIER_CRASH + 0.15, x: 320, y: 452, seed: 47 }, rt, 1.6, '216,192,152');
    ART.dustPlume(x, { g: CHANDELIER_CRASH + 0.25, x: 640, y: 452, seed: 53 }, rt, 1.6, '216,192,152');
    // the impact zone was the house — amber footlight burst through the recovery (QA D7)
    ART.warmGlow(x, 480, 470, 320, 0.22 * (1 - seg(rt, CHANDELIER_CRASH + 0.3, CHANDELIER_CRASH + 2.2)), '255,196,110');
    // wreckage: crystal chunks in the audience zone at the footlights (QA D9 — the POV target)
    for (let i = 0; i < 26; i++) {
      const dx = 210 + hash(i * 3.3) * 560, dy = 486 + hash(i * 5.7) * 24;
      const s2 = 2.6 + hash(i * 7.1) * 4.4;
      x.save();
      x.translate(dx, dy);
      x.rotate(hash(i * 7.1) * 3);
      x.fillStyle = `rgba(238,222,196,${0.6 + hash(i) * 0.3})`;
      x.beginPath(); x.moveTo(0, -s2); x.lineTo(s2 * 0.8, s2 * 0.7); x.lineTo(-s2 * 0.7, s2 * 0.6); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,244,222,0.75)';
      x.fillRect(-0.8, -s2 * 0.5, 1.4, s2);
      x.restore();
    }
    // a few shards on the near boards only — upstage glints read as noise (simplified, QA P2-6)
    for (let i = 0; i < 8; i++) {
      const dx = 380 + hash(i * 9.1) * 220, dy = 456 + hash(i * 11.3) * 14;
      x.save();
      x.translate(dx, dy);
      x.rotate(hash(i * 7.1) * 3);
      x.fillStyle = `rgba(232,220,198,${0.5 + hash(i + 3) * 0.3})`;
      x.beginPath(); x.moveTo(0, -3); x.lineTo(2.4, 2); x.lineTo(-2.2, 1.6); x.closePath(); x.fill();
      x.restore();
    }
  }
  // falling dust settling after the crash
  if (rt > CHANDELIER_CRASH + 0.4) {
    const thin = 1 - seg(g, CHANDELIER_EV.dustSettle, CHANDELIER_EV.dustSettle + 1.5);
    for (let i = 0; i < 44 * thin; i++) {
      const py = 160 + ((hash(i * 13) * 420 + rt * 46) % 380);
      x.fillStyle = `rgba(190,200,220,${0.28 * thin})`;
      x.fillRect(160 + hash(i * 7) * 640, py, 1.6, 1.6);
    }
  }
  // white-out blooms through the crash freeze only — LUMINOUS warm white, never grey
  // (QA D7: candle-amber house light floods in as the crystal comes down)
  if (stop && g >= CHANDELIER_CRASH - 1e-9) {
    const wu = Math.max(0, 1 - sl / 0.35) ** 1.35;
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = `rgba(255,244,224,${0.34 * wu})`;
    x.fillRect(0, 0, LW, LH);
    x.restore();
  }
  // audience silhouettes duck through the crash (rt-driven)
  const duckK = seg(rt, CRASH_G + 0.35, CRASH_G + 1.05);
  ART.drawHeads(x, S.heads, duckK, t);
  x.restore();
  // overlay: crystal blaze riding the plunge (survives grade)
  if (motion > 0.08 && !crashed) {
    star(ov, chX * 2, chY * 2, 70 + 90 * motion, t * 0.35, 0.4 * motion, '232,240,252');
  }
  blit(ctx);
}

// ==================================================================== CODA ===
function drawCoda(ctx, lt, dur, t, ov) {
  const x = beginLow();
  const g = warp(t).g;
  const cam = camAt('coda', t);
  x.save();
  applyCam(x, cam);
  x.drawImage(S.coda, -ART.OVER, -ART.OVER);
  // smoke parts on the ruined stage
  const clearK = 1 - 0.75 * seg(g, CODA_EV.smokeClear - 0.3, CODA_EV.smokeClear + 1.8);
  ART.fog(x, t, 120, 430, 0.32 * clearK + 0.06, '118,110,116', 8);
  // candle key light + the mask on the throne
  const T = ART.GEO.coda;
  ART.warmGlow(x, T.candle.x, T.candle.y - 16, 200, 0.14);
  ART.warmGlow(x, T.throne.x, T.throne.y - 20, 150, 0.08);
  x.save();
  x.translate(T.throne.x - 12, T.throne.y + 26);
  x.rotate(-0.16 + Math.sin(t * 0.7) * 0.01);
  x.scale(1.3, 1.3);
  x.drawImage(S.maskProp, -17, -15);
  x.restore();
  // the one candle — gutters on cue, then a last wisp of smoke
  const gut = 1 - seg(g, CODA_EV.candleGutter, CODA_EV.candleGutter + 0.65);
  ART.candle(x, T.candle.x, T.candle.y, 16, t, 77, Math.sin(t * 17) * 0.35 * (1 - gut), gut);
  if (gut < 0.4 && gut > 0) {
    const age = (g - CODA_EV.candleGutter) % 1.4;
    for (let i = 0; i < 4; i++) {
      x.fillStyle = `rgba(150,150,160,${0.3 * (1 - age / 1.4) * (1 - gut)})`;
      x.fillRect(T.candle.x + Math.sin(age * 3 + i) * 3, T.candle.y - 18 - age * (16 + i * 8), 2, 2);
    }
  }
  ART.darkness(x, 0.4, [
    { x: T.throne.x, y: T.throne.y, r: 260, soft: 0.72 },
    { x: T.candle.x, y: T.candle.y, r: 90, soft: 0.6 },
  ]);
  // iris to black on the end slate
  ART.iris(x, seg(g, CODA_EV.irisBlack, CODA_EV.irisBlack + 0.8), 480, 300, 640);
  x.restore();
  // overlay: one last glint on the resting mask
  const mk = Math.max(0, Math.sin(t * 0.8)) ** 12;
  star(ov, (T.throne.x - 12) * 2, (T.throne.y + 20) * 2, 40, t * 0.1, 0.3 * mk, '242,236,220');
  blit(ctx);
}

// ------------------------------------------------------------------ wiring ---
const GEO_CH = ART.GEO.chan;

async function prepare() {
  S.low = A.canvas(LW, LH);
  try { scoreFn = (await import('./score.js')).default ?? null; } catch { /* composer's stub not landed yet */ }
  // rigs
  const ph = await A.loadRemy(CAST.PHANTOM, false);
  S.phantom = ART.collar(ART.halfMask(ph, 'half', false));
  S.phantomBare = ph;
  const rd = await A.loadRemy(CAST.PHANTOM, false);
  S.redDeath = ART.collar(ART.halfMask(rd, 'full', true));
  S.christine = await A.loadRemy(CAST.CHRISTINE, false);
  S.carlotta = await A.loadRemy(CAST.CARLOTTA, false);
  S.giry = await A.loadRemy(CAST.GIRY, false);
  S.raoul = ART.stripBlade(await A.loadRemy(CAST.RAOUL, false));
  S.chorus = [];
  for (const id of CAST.CHORUS) S.chorus.push(await A.loadRemy(id, true));
  // sets + props
  S.house = ART.bakeHouse();
  S.rehearsal = ART.bakeRehearsal();
  S.masq = ART.bakeMasquerade();
  let portrait = null;
  try {
    const orig = await ART.loadOrig(CAST.CHRISTINE);
    portrait = ART.bakeChristinePortrait(orig);
  } catch { /* portrait optional */ }
  S.dressing = ART.bakeDressingRoom(portrait);
  S.organ = ART.bakeOrgan();
  S.cand = ART.bakeCandelabra();
  S.gondola = ART.bakeGondola();
  S.lair = ART.bakeLair();
  S.roof = ART.bakeRooftop();
  S.coda = ART.bakeCoda();
  S.heads = ART.bakeHeads();
  S.maskProp = ART.bakeMaskProp('half');
  S.crashShards = ART.makeShards(480, 420, 46, 71);
  S.confetti = ART.makeConfetti(74, 61);
}

// fx: candle amber vs moon steel grades; restrained bloom (≤0.14, threshold ~0.9);
// chromatic aberration only inside a hit-stop; vignette baseline everywhere.
const fxGrade = (o = {}) => (lt2, t) => ({
  vignette: 1.05, grain: 0.03, bloom: 0.1, bloomThresh: 0.9, sat: 1, warm: 0.1,
  ...o,
  ...(warp(t).stop ? { aber: 0.002 } : {}),
});
const FX = {
  overture: () => (lt2, t) => ({
    ...fxGrade({ bloom: 0.12, warm: 0.14, sat: 0.92, grain: 0.03 })(lt2, t),
    exposure: lerp(-1.15, 0, E.outCubic(seg(t, 0.35, 3.4))) + 0.05 * seg(t, 6, 8),
  }),
  rehearsal: () => fxGrade({ bloom: 0.1, warm: 0.12, sat: 0.95 }),
  mirror: () => fxGrade({ bloom: 0.12, warm: 0.18, sat: 0.95, vignette: 1.15, grain: 0.025 }),
  lair: () => fxGrade({ bloom: 0.14, warm: 0.3, haze: 0.06, hazeColor: [0.72, 0.58, 0.4], vignette: 1.18 }),
  masquerade: () => fxGrade({ bloom: 0.1, bloomThresh: 0.85, warm: 0.1, sat: 1.06, vignette: 1.02 }),
  rooftop: () => fxGrade({ bloom: 0.08, warm: 0, sat: 0.85, tint: [0.9, 0.97, 1.15], grain: 0.04 }),
  chandelier: () => fxGrade({ bloom: 0.1, bloomThresh: 0.88, warm: 0.06, grain: 0.035, vignette: 1.15 }),
  coda: () => fxGrade({ bloom: 0.07, warm: 0.12, sat: 0.72, grain: 0.04, vignette: 1.25 }),
};
const DRAW = {
  overture: drawOverture, rehearsal: drawRehearsal, mirror: drawMirror, lair: drawLair,
  masquerade: drawMasquerade, rooftop: drawRooftop, chandelier: drawChandelierShot, coda: drawCoda,
};

export default {
  title: 'THE PHANTOM OF THE HAIRPERA',
  output: 'the-phantom-of-the-hairpera.mp4',
  duration: DUR,
  prepare,
  shots: SHOTS.map((s) => ({ name: s.name, t0: s.t0, t1: s.t1, draw: DRAW[s.name], fx: FX[s.name]() })),
  // freezeCard drops to y 560 (legal per-caption override — y is in CAPTION_DEFAULTS) so the
  // slam clears the Red Death's descent line on the right (QA D3). No timeline change needed.
  captions: CAPS.map((c) => (c.id === 'freezeCard' ? { ...c, y: 560 } : { ...c })),
  captionStyles: CAP_STYLES,
  flashes: FLASHES,
  score(kit) { if (scoreFn) return scoreFn(kit); }, // composer's module, wired when it lands
  grid: GRID, // every cut is an integer second (timeline GRID) — lint checks cuts on bars
  audio: { seed: 1881, reverb: 1.4, reverbShape: 1.4, reverbGain: 0.3, lufs: -14 }, // per score.js AUDIO_SUGGEST
  lint: { safe: { margin: 0.05 } },
};
