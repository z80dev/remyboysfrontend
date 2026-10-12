// THE SHINE — a Remy Boys horror story. 77 s, 1080p via a 960×540 pixel stage (2× nearest).
// Full pixel-horror look: candle-pool lighting, lightning strobes, hit-stop scares, a mirror twist.
import { W, H, hash, seg, lerp, E, txt, F } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js';
import * as ART from './art.js';
import { score } from './score.js';
import {
  T, CAST, HERO_PAL, PORTRAITS, FLASHES, HALL, BARBER, STALK, MATCH, MATCH_CLOCK,
  CHASE_EV, CHASE_CLOCK, MIRROR_EV, TITLE_EV, DURATION, LW, LH,
} from './timeline.js';

const S = {}; // prepared art (read-only in draw)
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// poses
const runCycle = (ph) => {
  const s = Math.sin(ph);
  return {
    lift: [Math.round(Math.max(0, s) * 9), Math.round(Math.max(0, -s) * 9)],
    stride: [Math.round(s * 3), Math.round(-s * 3)],
    lean: 0.1,
  };
};
const walkCycle = (ph) => {
  const s = Math.sin(ph) * 0.8;
  return {
    lift: [Math.round(Math.max(0, s) * 6), Math.round(Math.max(0, -s) * 6)],
    stride: [Math.round(s * 2), Math.round(-s * 2)],
    lean: 0.05,
  };
};
const idle = (t, k = 1) => ({ lean: Math.sin(t * 2.1) * 0.014 * k, lift: [0, 0], stride: [0, 0] });

// lightning strength at absolute t (global, drives in-scene light + silhouette gates)
function flashK(t) {
  let k = 0;
  for (const [ft, peak, decay] of FLASHES) if (t >= ft) k = Math.max(k, peak * Math.exp(-(t - ft) / decay));
  return k;
}
const strobeK = (t, ft, peak, decay) => (t >= ft ? peak * Math.exp(-(t - ft) / decay) : 0);

function blit(ctx) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
}
const low = () => S.low.getContext('2d');
const beginLow = () => {
  const x = low();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = '#04030a';
  x.fillRect(0, 0, LW, LH);
  return x;
};

// candle in the hero's front hand (flip-aware)
function handCandle(x, heroX, feet, flip, t, seed, scale = 1) {
  const hx = heroX + (flip ? -18 : 18), hy = feet - 86 * scale * 0.86;
  x.fillStyle = '#e4d8c0'; x.fillRect(hx - 2, hy, 4, 11);
  x.fillStyle = '#c8b89a'; x.fillRect(hx - 2, hy + 8, 4, 3);
  const k = ART.flame(x, hx, hy, 0.9 * scale, t, seed);
  return { k, hx, hy };
}

// corridor scene painter shared by hall/stalk/match/chase-A.
// opts: {cam, sconceAlive(i)->bool, doorOpen(x)->[open, side], portraits:true, dark:{a, holes[]}}
function corridorScene(x, t, opts) {
  const cam = opts.cam;
  x.save();
  x.translate(-cam, 0);
  x.drawImage(S.cor, -ART.OVER, -ART.OVER);
  for (let i = 0; i < ART.PORTRAIT_X.length; i++) {
    const id = PORTRAITS[i];
    ART.portraitFrame(x, S.origs[id], ART.PORTRAIT_X[i], 190, 96, 116, 0.2);
    if (opts.glints) ART.eyeGlints(x, ART.PORTRAIT_X[i], 190, flashK(t) * opts.glints);
  }
  for (const dx of ART.DOORS) {
    const [open, side] = opts.doorOpen(dx);
    ART.door(x, dx, open, side);
  }
  // windows: rain behind glass, lightning glow
  for (const cx of ART.WINDOWS) {
    const rect = { x: cx - 38, y: 206, w: 76, h: 184 };
    ART.rainWin(x, rect, t, 0.9);
    const k = flashK(t) + (opts.winStrobe ? opts.winStrobe(cx) : 0);
    if (k > 0.03) {
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.fillStyle = `rgba(150,180,250,${0.3 * Math.min(1, k)})`;
      x.fillRect(rect.x - 6, rect.y - 40, rect.w + 12, rect.h + 40);
      x.restore();
    }
  }
  // sconces
  const holes = [];
  for (let i = 0; i < ART.SCONCES.length; i++) {
    const sx = ART.SCONCES[i];
    ART.sconceArm(x, sx);
    if (opts.sconceAlive(i)) {
      x.fillStyle = '#e4d8c0'; x.fillRect(sx - 2, 184, 4, 12);
      ART.flame(x, sx, 184, 1.25, t, 40 + i);
      holes.push({ x: sx - cam, y: 196, r: 66 }); // screen space — darkness applies post-restore
    }
  }
  x.restore();
  return holes;
}

// darkness + warm light pass over the whole low stage
function lightPass(x, t, a, holes, glows) {
  ART.darkness(x, a, holes);
  for (const g of glows) ART.warmGlow(x, g.x, g.y, g.r, g.a, g.col);
}

// ---------- SHOT 1: storm exterior ----------
function drawStorm(ctx, lt, dur, t) {
  const x = beginLow();
  const sh = 3 * flashK(t);
  x.save();
  x.translate(Math.sin(t * 61) * sh, Math.cos(t * 53) * sh * 0.6);
  x.drawImage(S.manor, -ART.OVER, -ART.OVER);
  // one gatehouse window wakes at t=5
  if (t >= 5) {
    const u = clamp01((t - 5) / 0.7);
    x.fillStyle = `rgba(255,196,104,${0.85 * u})`;
    x.fillRect(478, 286, 14, 20);
    ART.warmGlow(x, 485, 296, 30, 0.2 * u);
  }
  // hero climbs the path with a storm lantern
  const u = seg(lt, 2, 9.2);
  const px = 520 + (1 - u) * 130 + Math.sin(u * 3.1) * 150 * (1 - u);
  const py = 350 + u * 215;
  const sy = lerp(1.5, 0.9, u);
  ART.shadow(x, px, py, 8 * sy, 0.35);
  A.drawRemy(x, S.r42f, px, py, { ...walkCycle(lt * 5.2), flip: true, sy });
  ART.warmGlow(x, px + 8, py - 60 * sy, 26, 0.3);
  x.fillStyle = '#ffd9a0'; x.fillRect(px + 5, py - 64 * sy, 2, 3);
  ART.fog(x, t, 430, 110, 4, 0.2);
  ART.fog(x, t, 468, 70, 9, 0.15);
  ART.rain(x, t, 1.15, -170);
  // lightning: sky fill, bolt to the tower, rim on roofs
  const k = flashK(t);
    if (k > 0.02) {
      x.fillStyle = `rgba(168,188,238,${0.42 * k})`;
      x.fillRect(-30, -30, LW + 60, LH + 60);
      // bolts stay inside the letterbox-safe band (y > 70)
      ART.bolt(x, 860, 72, 592, 168, 3, strobeK(t, 2.2, 0.26, 0.16) * 1.7);
      ART.bolt(x, 150, 70, 414, 172, 8, strobeK(t, 6.9, 0.28, 0.17) * 1.5);
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = `rgba(205,220,255,${0.4 * k})`; x.lineWidth = 2;
      x.beginPath(); x.moveTo(408, 190); x.lineTo(430, 132); x.lineTo(452, 190); x.stroke();
      x.restore();
    }
  if (lt < 0.8) { x.fillStyle = `rgba(0,0,0,${1 - lt / 0.8})`; x.fillRect(-30, -30, LW + 60, LH + 60); }
  x.restore();
  blit(ctx);
}

// ---------- SHOT 2: hall ----------
function drawHall(ctx, lt, dur, t) {
  const x = beginLow();
  let heroX;
  if (lt < HALL.pause) heroX = 130 + 90 * lt;
  else if (lt < HALL.resume) heroX = 130 + 90 * HALL.pause;
  else heroX = 130 + 90 * HALL.pause + 90 * (lt - HALL.resume);
  const flip = lt > HALL.pause + 0.25 && lt < HALL.resume - 0.2; // glances back mid-pause
  const cam = clamp(heroX - 380 - 36 * Math.sin(lt * 0.55), 0, ART.CORW - LW); // drift: the frame slides a little
  const holes = corridorScene(x, t, {
    cam,
    glints: 0.9,
    sconceAlive: () => true,
    doorOpen: () => [0, 'right'],
  });
  x.save();
  x.translate(-cam, 0);
  // pale figure at the corridor end with a dark rim — reads in flash AND in dark
  const figGate = lt >= HALL.figure && lt < HALL.figureGone ? flashK(t) : 0;
  if (figGate > 0.05) {
    const fx = heroX + 500;
    A.drawRemy(x, S.r468, fx, ART.GROUND, {
      ...idle(t), flip: true, sy: 2, white: true, alpha: 0.92, glow: '#0b0e1a', glowA: 0.85,
    });
  }
  ART.shadow(x, heroX, ART.GROUND, 26);
  A.drawRemy(x, S.r42, heroX, ART.GROUND, { ...walkCycle(lt * 6.2), flip, sy: 2 * (1 + 0.012 * Math.sin(lt * 12.4)) });
  const cnd = handCandle(x, heroX, ART.GROUND, flip, t, 12);
  x.restore();
  // lighting
  const k = flashK(t);
  holes.push({ x: heroX - cam + (flip ? -18 : 18), y: ART.GROUND - 74, r: 135 * (0.9 + 0.2 * cnd.k) });
  if (k > 0.1) for (const wx of ART.WINDOWS) holes.push({ x: wx - cam, y: 300, r: 250, soft: 0.8 });
  lightPass(x, t, 0.52 * (1 - 0.5 * k), holes, [
    { x: heroX - cam + (flip ? -18 : 18), y: ART.GROUND - 76, r: 120, a: 0.26 * cnd.k },
    ...ART.SCONCES.map((sx, i) => ({ x: sx - cam, y: 196, r: 60, a: 0.13 * ART.flick(t, 40 + i) })),
  ]);
  if (lt < 0.7) { x.fillStyle = `rgba(0,0,0,${1 - lt / 0.7})`; x.fillRect(0, 0, LW, LH); }
  blit(ctx);
}

// ---------- SHOT 3: barber room ----------
function drawBarber(ctx, lt, dur, t) {
  const x = beginLow();
  x.drawImage(S.barber, -ART.OVER, -ART.OVER);
  // entry door swings shut behind him
  ART.door(x, 60, 1 - E.outCubic(seg(lt, 0, BARBER.doorShut)), 'right');
  // hero path: in → stand → approach the chair
  let heroX, moving = true;
  if (lt < 2.2) heroX = lerp(900, 620, E.outCubic(seg(lt, 0.2, 2.2)));
  else if (lt < 5.2) { heroX = 620; moving = false; }
  else heroX = lerp(620, 330, E.inOutCubic(seg(lt, 5.2, 7.2)));
  const flip = lt < 7.4; // walking/facing left until he reaches the chair
  const gramOn = t >= T.barber + BARBER.gram;
  const pulse = gramOn ? 0.5 + 0.5 * Math.sin((t - (T.barber + BARBER.gram)) * 8.72) : 0;
  ART.gramophone(x, 790, ART.GROUND, pulse);
  ART.chair(x, 260, ART.GROUND, 1);
  ART.portraitFrame(x, S.origs[468], 850, 220, 150, 180, 0.35);
  ART.dust(x, t, 280, 190, 460, 200, 26, 77);
  // etched warning across the mirror wall: one word per mirror
  const [e0] = BARBER.etch;
  if (lt >= e0) {
    const { y0, y1, half } = ART.MIRROR_GLASS;
    const words = ['THE FLOW', 'MUST BE', 'MAINTAINED'];
    for (let i = 0; i < 3; i++) {
      const mxw = ART.MIRRORS[i];
      x.save();
      x.beginPath(); x.rect(mxw - half, y0 + 40, half * 2, y1 - y0 - 60); x.clip();
      txt(x, words[i], mxw, y0 + 140, {
        size: 13, font: F.serif, weight: 600, color: '#c7dbe2',
        alpha: 0.7 * seg(lt, e0 + i * 0.45, e0 + i * 0.45 + 0.4), align: 'center', track: 1,
      });
      x.restore();
    }
  }
  // ghost in the left mirror during the lightning: a pale shape the room doesn't hold
  const k = flashK(t);
  const [g0, g1] = BARBER.ghost;
  if (lt >= g0 && lt < g1 && k > 0.1) {
    const mgx = ART.MIRRORS[0];
    x.save();
    x.beginPath();
    const { y0, y1, half } = ART.MIRROR_GLASS;
    x.rect(mgx - half, y0 + 24, half * 2, y1 - y0 - 24); x.clip();
    const rxg = 2 * mgx - heroX; // a ghost, not a lawful reflection: keep it standing in the glass
    const gx = mgx; void rxg; // stand centered in the glass — it's a ghost, not a lawful reflection
    A.drawRemy(x, S.r468, gx, ART.GROUND - 12, {
      ...idle(t, 1.4), flip: false, sy: 1.7, white: true, alpha: 0.85, glow: '#0b0e1a', glowA: 0.8,
    });
    x.restore();
  }
  ART.shadow(x, heroX, ART.GROUND, 26);
  const pose = moving ? walkCycle(lt * 5) : idle(t, 1.2);
  A.drawRemy(x, S.r42, heroX, ART.GROUND, { ...pose, flip, sy: 2 });
  const cnd = handCandle(x, heroX, ART.GROUND, flip, t, 13);
  const holes = [{ x: heroX + (flip ? -18 : 18), y: ART.GROUND - 74, r: 140 * (0.9 + 0.2 * cnd.k) }];
  lightPass(x, t, lerp(0.64, 0.55, seg(lt, 0, 1.6)) * (1 - 0.55 * k), holes, [
    { x: heroX + (flip ? -18 : 18), y: ART.GROUND - 76, r: 130, a: 0.26 * cnd.k },
  ]);
  if (k > 0.1) { // lightning through the skylight: whole room lifts
    x.fillStyle = `rgba(150,175,235,${0.2 * k})`;
    x.fillRect(0, 0, LW, LH);
  }
  blit(ctx);
}

// ---------- SHOT 4: stalk ----------
function drawStalk(ctx, lt, dur, t) {
  const x = beginLow();
  const heroX = 2100 - 105 * lt;
  const cam = clamp(heroX - 420, 0, ART.CORW - LW);
  const dead = STALK.snuff.map((st) => lt >= st); // 4 sconces + candle gutter
  const holes = corridorScene(x, t, {
    cam,
    glints: 0.8,
    sconceAlive: (i) => !dead[i],
    doorOpen: () => [0, 'right'],
  });
  x.save();
  x.translate(-cam, 0);
  // twins ahead at their fixed spots, then a blink and they're gone
  if (lt >= STALK.twins[0] && lt < STALK.twins[1]) {
    for (const tx of STALK.twinX) {
      ART.shadow(x, tx, ART.GROUND, 24);
      A.drawRemy(x, tx === STALK.twinX[0] ? S.r690 : S.r704, tx, ART.GROUND, { ...idle(t, 0.7), flip: false, sy: 2 });
    }
  }
  const gutter = dead[4] ? 0.55 + 0.2 * hash(Math.floor(t * 30)) : 1;
  ART.shadow(x, heroX, ART.GROUND, 26);
  A.drawRemy(x, S.r42, heroX, ART.GROUND, { ...walkCycle(lt * 5), flip: true, sy: 2 });
  const lean = lt > STALK.whisper ? -3 : 0; // flame bends when the whisper comes
  x.fillStyle = '#e4d8c0'; x.fillRect(heroX - 20, ART.GROUND - 90, 4, 11);
  const fk = ART.flame(x, heroX - 18 + lean, ART.GROUND - 90, 0.9 * gutter, t, 14);
  x.restore();
  // one dark blink as the twins vanish
  if (lt >= STALK.twins[1] && lt < STALK.twins[1] + 0.14 && hash(Math.floor(t * 48)) > 0.3) {
    x.fillStyle = 'rgba(2,3,8,0.85)'; x.fillRect(0, 0, LW, LH);
  }
  const nDead = dead.filter(Boolean).length;
  const a = Math.min(0.93, 0.6 + nDead * 0.075 + seg(lt, 10.4, 11) * 0.1);
  holes.push({ x: heroX - cam - 18, y: ART.GROUND - 82, r: 130 * gutter * (0.85 + 0.2 * fk) });
  lightPass(x, t, a, holes, [
    { x: heroX - cam - 18, y: ART.GROUND - 84, r: 115, a: 0.2 * fk * gutter, col: '255,186,104' },
  ]);
  ART.fog(x, t, 442, 58, 12, 0.1);
  blit(ctx);
}

// ---------- SHOT 5: the match ----------
function drawMatch(ctx, lt, dur, t) {
  const x = beginLow();
  const { g, stop, sl } = MATCH_CLOCK.warp(lt);
  const shake = stop ? 5 * Math.exp(-sl * 8) : 0;
  x.save();
  x.translate(Math.sin(t * 95) * shake, Math.cos(t * 88) * shake * 0.7);
  const heroX = 1240;
  const cam = heroX - 430;
  const holes = corridorScene(x, t, {
    cam,
    glints: 0,
    sconceAlive: () => false,
    doorOpen: () => [0, 'right'],
  });
  x.save();
  x.translate(-cam, 0);
  const out = g >= MATCH.bolt;
  const hx = out ? heroX - 620 * E.outCubic(seg(g, MATCH.bolt, MATCH.bolt + 0.7)) : heroX;
  const trem = g >= MATCH.strike && !out ? (hash(Math.floor(t * 30)) - 0.5) * 2.4 : 0;
  const outU = seg(g, MATCH.bolt, MATCH.bolt + 0.7);
  if (out && outU < 1) { // faint motion trail so the sprint reads in the dark
    for (const [dx, a] of [[26, 0.2], [48, 0.12]]) {
      A.drawRemy(x, S.r42, heroX - 620 * E.outCubic(outU) + dx, ART.GROUND, { ...runCycle(g * 14), flip: true, sy: 2, alpha: a, white: true });
    }
  }
  if (!out || outU < 1) {
    const darkWait = g >= MATCH.gust && g < MATCH.strike ? 0.18 : 1; // nearly invisible while fumbling
    const hx = out ? heroX - 620 * E.outCubic(outU) : heroX + trem;
    ART.shadow(x, hx, ART.GROUND, 26 * darkWait);
    A.drawRemy(x, S.r42, hx, ART.GROUND, {
      ...(out ? runCycle(g * 14) : idle(t, 2)),
      flip: true, sy: 2, alpha: darkWait,
    });
  }
  // the face in the dark — revealed by the match, motionless, rim-lit by the flare
  if (g >= MATCH.strike) {
    ART.shadow(x, heroX + 92, ART.GROUND, 28);
    A.drawRemy(x, S.r468, heroX + 92, ART.GROUND, {
      ...idle(t, 0.4), flip: true, sy: 2.35, glow: '#c8b070', glowA: 0.3,
    });
  }
  // candle life → smoke
  if (g < MATCH.gust) {
    x.fillStyle = '#e4d8c0'; x.fillRect(heroX - 20, ART.GROUND - 90, 4, 11);
    ART.flame(x, heroX - 18, ART.GROUND - 90, 0.85, t, 15);
  } else {
    ART.smokeWisp(x, T.match + MATCH.gust, t, heroX - 18, ART.GROUND - 88);
  }
  // matchbox sparks in the dark — always alight inside the window, brightness flickers
  let spark = 0;
  for (const rt of MATCH.rattle) {
    const at = T.match + rt;
    if (t >= at && t < at + 0.16) spark = Math.max(spark, 0.45 + 0.55 * hash(Math.floor(t * 48)));
  }
  if (spark > 0) {
    x.fillStyle = `rgba(255,225,170,${Math.min(1, spark + 0.3)})`;
    x.fillRect(heroX - 26 + hash(Math.floor(t * 48)) * 8, ART.GROUND - 85, 3, 3);
  }
  // the strike: match in the hero's hand
  let flare = 0;
  if (g >= MATCH.strike) {
    flare = seg(g, MATCH.strike, MATCH.strike + 0.35);
    if (out) { // dropped match arcs to the floor as he bolts, then keeps burning where it lands
      const u = seg(g, MATCH.bolt, MATCH.bolt + 0.5);
      const my = ART.GROUND - 76 + 70 * u * u;
      if (u < 1) { ART.flame(x, heroX - 14 - 120 * u, my, 0.7, t, 16); }
      else { const f = Math.max(0, 1 - (g - MATCH.bolt - 0.5) / 1.4); ART.flame(x, heroX - 134, ART.GROUND - 4, 0.55 * f, t, 16); }
    } else {
      x.fillStyle = '#d8c8a8'; x.fillRect(heroX - 20, ART.GROUND - 88, 3, 9);
      ART.flame(x, heroX - 18, ART.GROUND - 88, 0.85 + 0.35 * flare, t, 16);
    }
  }
  x.restore();
  // lighting: near total, hole at the match (or the dropped glow)
  const k = flashK(t);
  if (g >= MATCH.strike && !out) {
    holes.push({ x: heroX - cam - 18, y: ART.GROUND - 82, r: 150 + 60 * flare });
  } else if (g >= MATCH.gust) {
    holes.length = 0; // pitch dark; sparks punch their own hole
    if (spark) holes.push({ x: heroX - cam - 22, y: ART.GROUND - 84, r: 55 });
    if (g >= MATCH.strike && out) holes.push({ x: heroX - cam - 130, y: ART.GROUND - 40, r: 155 }); // lights the first stretch of the sprint
  } else {
    holes.push({ x: heroX - cam - 18, y: ART.GROUND - 82, r: 118 });
  }
  const a = g < MATCH.gust ? 0.78 : 0.95;
  lightPass(x, t, a * (1 - 0.3 * k), holes, [
    ...(g >= MATCH.strike && !out ? [{ x: heroX - cam - 18, y: ART.GROUND - 84, r: 150 + 60 * flare, a: 0.3 }] : []),
  ]);
  if (spark) ART.warmGlow(x, heroX - cam - 22, ART.GROUND - 84, 58, 0.7 * spark);
  if (spark) {
    x.fillStyle = '#ffd9a0';
    x.fillRect(heroX - cam - 27 + hash(Math.floor(t * 48)) * 9, ART.GROUND - 86, 3, 3);
  }
  x.restore();
  blit(ctx);
}

// ---------- SHOT 6: chase ----------
// corridor coords: hero 2100 → 122 running left; door bursts behind (1740) and ahead (1180);
// twins at 700/835; slide under the razor (slow-mo); shoulder the exit door at 60; SLAM + freeze;
// then the room side of the door: razor thunks through the wood beside his head.
function drawChase(ctx, lt, dur, t) {
  const { g, stop, sl } = CHASE_CLOCK.warp(lt);
  const x = beginLow();
  const shake = stop ? 6 * Math.exp(-sl * 7) : 0;
  const jolt = (evG) => (g > evG && g < evG + 0.2 ? 4 * Math.exp(-(g - evG) * 14) : 0);
  const joltSum = jolt(CHASE_EV.thunk[0]) + jolt(CHASE_EV.thunk[1]) + jolt(CHASE_EV.thunk[2]) + jolt(CHASE_EV.stick);
  x.save();
  x.translate(Math.sin(t * 89) * (shake + joltSum), Math.cos(t * 97) * (shake + joltSum) * 0.7);
  if (g < CHASE_EV.slam) {
    const heroG = 2100 - 230 * g;
    const exitU = E.outCubic(seg(g, CHASE_EV.doorHit, CHASE_EV.doorHit + 0.15));
    const hx = g >= CHASE_EV.doorHit ? lerp(heroG, 78, exitU) : heroG;
    const cam = clamp(hx - 640, 0, ART.CORW - LW);
    const strobes = [[50.4, 0.22], [51.2, 0.2], [52.6, 0.22], [54.0, 0.2], [55.5, 0.24], [58.0, 0.22], [59.3, 0.26]];
    const winStrobe = (cx) => strobes.reduce((m, [ft, pk]) => Math.max(m, strobeK(t, ft, pk, 0.14)), 0);
    const holes = corridorScene(x, t, {
      cam,
      glints: 0,
      sconceAlive: (i) => i <= 1, // the two nearest the escape door flicker alive
      doorOpen: (dx) => {
        if (dx === 1800) return [E.outBack(seg(g, CHASE_EV.burstA, CHASE_EV.burstA + 0.35)), 'right'];
        if (dx === 1180) return [E.outBack(seg(g, CHASE_EV.burstB, CHASE_EV.burstB + 0.3)), 'right'];
        if (dx === 60) return [seg(g, CHASE_EV.doorHit, CHASE_EV.doorHit + 0.14), 'left'];
        return [0, 'right'];
      },
      winStrobe,
    });
    x.save();
    x.translate(-cam, 0);
    // burst dust
    ART.chips(x, [{ g: CHASE_EV.burstA, x: 1804, y: 360, seed: 51 }, { g: CHASE_EV.burstB, x: 1234, y: 360, seed: 52 }], g);
    // 347: the fast one, right behind, rim-lit so he reads in the strobes
    const x347 = Math.max(1800 - 238 * (g - CHASE_EV.burstA), 150);
    ART.shadow(x, x347, ART.GROUND, 26);
    A.drawRemy(x, S.r347, x347, ART.GROUND, { ...runCycle(g * 14.5), flip: true, sy: 2, glow: '#7a8ab0', glowA: 0.22 });
    // 159: loping cultist, steps out then hunts at 244 px/s — just catches him at the door
    if (g >= CHASE_EV.burstB) {
      const x159 = 1180 - (g >= CHASE_EV.chaseB ? 244 * (g - CHASE_EV.chaseB) : 0);
      ART.shadow(x, x159, ART.GROUND, 24);
      A.drawRemy(x, S.r159, x159, ART.GROUND, { ...runCycle(g * 12), flip: true, sy: 2, glow: '#b09a6a', glowA: 0.2 });
    }
    // the twins: standing ahead, then simply not there
    if (g >= CHASE_EV.twins && g < 7.5) {
      for (const tx of [700, 835]) {
        ART.shadow(x, tx, ART.GROUND, 24);
        A.drawRemy(x, tx === 700 ? S.r690 : S.r704, tx, ART.GROUND, { ...idle(t, 0.5), flip: false, sy: 2 });
      }
    }
    // hero: run → slide (slow-mo) → run → shoulder the door
    const slideU = seg(g, CHASE_EV.slide0, CHASE_EV.slide1);
    ART.shadow(x, hx, ART.GROUND, 26);
    if (slideU > 0 && slideU < 1) {
      const lay = E.outCubic(seg(g, CHASE_EV.slide0, CHASE_EV.slide0 + 0.3));
      const rise = E.outCubic(seg(g, CHASE_EV.slide1 - 0.25, CHASE_EV.slide1));
      const rot = lerp(0, -1.15, lay) * (1 - rise);
      A.drawRemy(x, S.r42, hx, ART.GROUND + 6, { lift: [0, 0], stride: [2, -2], lean: 0, rot, sy: Math.max(1.1, 2 - lay * 0.9 + rise * 0.9), flip: true });
      ART.chips(x, [
        { g: CHASE_EV.slide0 + 0.1, x: hx + 30, y: ART.GROUND, seed: 61 },
        { g: CHASE_EV.slide0 + 0.35, x: hx + 30, y: ART.GROUND, seed: 62 },
      ], g, '120,100,80', 8);
    } else if (g < CHASE_EV.doorHit) {
      A.drawRemy(x, S.r42, hx, ART.GROUND, { ...runCycle(g * 14), flip: true, sy: 2, lean: 0.13 });
    } else if (g < CHASE_EV.slam) {
      A.drawRemy(x, S.r42, hx, ART.GROUND, { ...runCycle(g * 14), flip: true, sy: 2, rot: -0.18, lean: 0.2 });
    }
    // the razor: over his head during the slide, into the wall AHEAD of him (he passes it close)
    if (g >= CHASE_EV.razor && g < CHASE_EV.stick) {
      const u = seg(g, CHASE_EV.razor, CHASE_EV.stick);
      ART.razor(x, lerp(x347, 380, u), ART.GROUND - 240 + 26 * Math.sin(Math.PI * u), u * 12.5, 1);
    } else if (g >= CHASE_EV.stick) {
      ART.razor(x, 380, ART.GROUND - 150, -0.3, 2);
    }
    x.restore();
    const k = flashK(t) + winStrobe(0);
    holes.push({ x: hx - cam, y: ART.GROUND - 80, r: 190 * (1 - 0.4 * exitU) });
    if (g >= CHASE_EV.doorHit) holes.push({ x: 114 - cam, y: 340, r: 190 }); // room light spilling
    lightPass(x, t, 0.42 * (1 - 0.4 * Math.min(1, k)), holes, []);
  } else {
    // ---- room side of the slammed door ----
    x.drawImage(S.barber, -ART.OVER, -ART.OVER);
    ART.door(x, 60, 0, 'left');
    ART.chair(x, 260, ART.GROUND, 1);
    ART.gramophone(x, 790, ART.GROUND, 0);
    ART.portraitFrame(x, S.origs[468], 850, 220, 150, 180, 0.4);
    // hero, back against the door, chest heaving
    const flinch = CHASE_EV.thunk.reduce((m, tg) => Math.max(m, jolt(tg)), 0) * 3;
    ART.shadow(x, 152, ART.GROUND, 26);
    A.drawRemy(x, S.r42, 152 - flinch, ART.GROUND, {
      ...idle(t, 2.4), flip: false, sy: 2 * (1 + 0.012 * Math.sin(t * 5.5)),
    });
    // razors punch through the wood beside his head
    for (let i = 0; i < CHASE_EV.thunk.length; i++) {
      if (g >= CHASE_EV.thunk[i]) {
        ART.razor(x, 96 + i * 26, 330 + (i % 2) * 22, -1.45, 2);
      }
    }
    ART.chips(x, CHASE_EV.thunk.map((tg, i) => ({ g: tg, x: 100 + i * 26, y: 332 + (i % 2) * 22, seed: 71 + i })), g, '150,110,60', 7);
    ART.darkness(x, 0.45, [
      { x: 520, y: 260, r: 300, soft: 0.8 },
      { x: 152, y: ART.GROUND - 80, r: 170 },
    ]);
    // the mirrors light themselves — pale, cold (after darkness so they actually glow)
    const pale = 0.2 + 0.06 * Math.sin(t * 2.4);
    const { y0: gy0, y1: gy1, half: ghalf } = ART.MIRROR_GLASS;
    for (const mx of ART.MIRRORS) {
      ART.warmGlow(x, mx, 250, 230, pale, '170,190,225');
      x.save();
      x.beginPath();
      x.moveTo(mx - ghalf, gy1); x.lineTo(mx - ghalf, gy0 + 30);
      x.quadraticCurveTo(mx, gy0 - 42, mx + ghalf, gy0 + 30); x.lineTo(mx + ghalf, gy1); x.closePath();
      x.fillStyle = 'rgba(150,178,228,0.12)';
      x.fill();
      x.restore();
    }
  }
  x.restore();
  blit(ctx);
}

// ---------- SHOT 7: the mirror ----------
function drawMirror(ctx, lt, dur, t) {
  const x = beginLow();
  const E_ = MIRROR_EV;
  x.drawImage(S.barber, -ART.OVER, -ART.OVER);
  ART.chair(x, 260, ART.GROUND, 1);
  ART.gramophone(x, 790, ART.GROUND, 0);
  ART.portraitFrame(x, S.origs[468], 850, 220, 150, 180, 0.45);
  ART.dust(x, t, 320, 180, 420, 200, 18, 90);
  // hero blocking — he centers himself on the glass so the reflection fits inside it
  let heroX = 150, flip = true, moving = false;
  if (lt >= E_.approach && lt < E_.touch) { heroX = lerp(150, 524, E.inOutCubic(seg(lt, E_.approach, E_.touch))); flip = false; moving = true; }
  else if (lt >= E_.touch && lt < E_.recoil) { heroX = 524; flip = false; }
  else if (lt >= E_.recoil) { heroX = lerp(524, 420, E.outCubic(seg(lt, E_.recoil, E_.back))); flip = lt < E_.back - 0.1; moving = lt < E_.back; }
  const relief = lt >= E_.relief && lt < E_.flash1;
  // the reflection, clipped to the center mirror glass
  const mx = ART.MIRRORS[1];
  const { y0, y1, half } = ART.MIRROR_GLASS;
  const k = flashK(t);
  x.save();
  x.beginPath();
  x.rect(mx - half, y0 + 24, half * 2, y1 - y0 - 24);
  x.clip();
  let rx = 2 * mx - heroX - 26, rsy = 1.9, rflip = !flip; // offset into the glass, apart from the hero
  let rig = S.r42, grinA = 0, grinW = 30, rim = 0;
  if (lt >= E_.flash1 && lt < E_.recoil && k > 0.08) { rig = S.bald42; rx = 494; grinA = Math.min(1, k * 2.2); rim = 0.3; }
  if (lt >= E_.flash2 && k > 0.08) { rig = S.bald42; rx = 512; rsy = 2.3; grinA = Math.min(1, k * 2.6); grinW = 46; rim = 0.45; }
  if (lt >= E_.grin0 && lt < E_.grin1) { // it steps out of the dark glass
    const u = seg(lt, E_.grin0, E_.grin1);
    rig = S.bald42; rx = 520; rsy = lerp(1.6, 2.1, u);
    grinA = lerp(0.35, 0.95, u); grinW = lerp(34, 50, u);
  }
  if (lt >= E_.look + 0.4) {
    ART.shadow(x, rx, ART.GROUND, 24);
    if (rim > 0) ART.warmGlow(x, rx, ART.GROUND - 110, 80, rim * 0.5, '210,222,250');
    if (lt >= E_.grin0 && lt < E_.grin1) {
      A.drawRemy(x, rig, rx, ART.GROUND, { ...idle(t, 0.6), flip: rflip, sy: rsy, white: true, alpha: 0.6 });
    } else {
      A.drawRemy(x, rig, rx, ART.GROUND, { ...idle(t, 1.1), flip: rflip, sy: rsy });
    }
    if (grinA > 0) ART.grin(x, rx, ART.GROUND - 164 * (rsy / 1.9), grinW, grinA);
    if (relief) { // his hair is fine — a small warm beat
      ART.warmGlow(x, rx, ART.GROUND - 150, 60, 0.08);
    }
  }
  x.restore();
  // hero
  ART.shadow(x, heroX, ART.GROUND, 26);
  const breathe = relief ? 2 * (1 + 0.02 * Math.sin(t * 9)) : 2;
  A.drawRemy(x, S.r42, heroX, ART.GROUND, { ...(moving ? walkCycle(lt * 5.4) : idle(t, 1.6)), flip, sy: breathe });
  // his dying match
  const gutter = lt >= E_.matchDie ? Math.max(0, 1 - (lt - E_.matchDie) / 0.4) : 1;
  x.fillStyle = '#d8c8a8'; x.fillRect(heroX - 20, ART.GROUND - 88, 3, 9);
  ART.flame(x, heroX - 18, ART.GROUND - 88, (0.55 + 0.3 * (relief ? 1 : 0.6)) * gutter, t, 17);
  // fingertip meets glass
  if (lt >= E_.touch && lt < E_.recoil) {
    const u = seg(lt, E_.touch, E_.touch + 0.3);
    x.fillStyle = `rgba(240,244,252,${0.9 * Math.min(1, u * 2)})`;
    x.fillRect(mx + half - 4, ART.GROUND - 158, 3, 3);
  }
  // lighting: candle warm early, mirror-cold late
  const darkA = lerp(0.55, 0.92, seg(lt, E_.matchDie - 0.2, E_.grin0));
  ART.darkness(x, darkA, [
    { x: heroX - 18, y: ART.GROUND - 82, r: 150 * gutter + 30 },
    { x: mx, y: 260, r: lerp(160, 240, seg(lt, E_.grin0, E_.grin1)) },
  ]);
  ART.warmGlow(x, heroX - 18, ART.GROUND - 84, 130, 0.2 * gutter);
  ART.warmGlow(x, mx, 250, lerp(150, 230, seg(lt, E_.grin0, E_.grin1)), 0.1 * (1 + k), '168,188,224');
  if (k > 0.1) { x.fillStyle = `rgba(150,175,235,${0.22 * k})`; x.fillRect(0, 0, LW, LH); }
  // the smash: glass surface flares, cracks, shards fly
  if (lt >= E_.smash && lt < E_.black) {
    const u = seg(lt, E_.smash, E_.black);
    x.save();
    x.beginPath(); // the shattering sheet catches light
    const { y0, y1, half } = ART.MIRROR_GLASS;
    x.moveTo(mx - half, y1); x.lineTo(mx - half, y0 + 30);
    x.quadraticCurveTo(mx, y0 - 42, mx + half, y0 + 30); x.lineTo(mx + half, y1); x.closePath();
    x.fillStyle = `rgba(178,200,232,${0.28 * (1 - u * 0.6)})`; x.fill();
    x.strokeStyle = `rgba(228,238,250,${1 - u})`; x.lineWidth = 1.6;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + hash(i) * 0.5;
      x.beginPath(); x.moveTo(mx, 300);
      for (let s = 1; s <= 4; s++) {
        const r = 18 * s * (0.7 + hash(i * 7 + s) * 0.6);
        x.lineTo(mx + Math.cos(ang) * r + (hash(i + s) - 0.5) * 8, 300 + Math.sin(ang) * r + (hash(i * 3 + s) - 0.5) * 8);
      }
      x.stroke();
    }
    x.restore();
    ART.chips(x, [{ g: E_.smash, x: mx, y: 300, seed: 81 }], lt, '218,230,246', 22);
  }
  if (lt >= E_.black) { x.fillStyle = '#000'; x.fillRect(0, 0, LW, LH); }
  if (lt < 0.5) { x.fillStyle = `rgba(0,0,0,${1 - lt / 0.5})`; x.fillRect(0, 0, LW, LH); }
  blit(ctx);
}

// ---------- SHOT 8: title ----------
function drawTitle(ctx, lt, dur, t) {
  const x = beginLow();
  x.fillStyle = '#020104'; x.fillRect(0, 0, LW, LH);
  const E_ = TITLE_EV;
  if (lt >= E_.portrait) {
    const a = clamp01((lt - E_.portrait) / 0.8) * (1 - seg(lt, E_.fade[0], E_.fade[1]));
    x.save();
    x.globalAlpha = a * 0.8;
    const swapped = lt >= E_.swap;
    ART.portraitFrame(x, null, 480, 190, 172, 190, 0);
    x.beginPath(); x.rect(480 - 79, 190 - 88, 158, 176); x.clip();
    if (swapped) {
      A.drawRemy(x, S.bald42, 480, 380, { ...idle(t, 0.4), flip: false, sy: 2.2 });
      x.fillStyle = 'rgba(110,88,50,0.24)'; x.fillRect(480 - 79, 102, 158, 176); // sepia wash
    } else {
      const img = S.origs[468];
      const s = Math.max(158 / img.width, 176 / img.height);
      x.drawImage(img, 480 - (img.width * s) / 2, 190 - (img.height * s) / 2, img.width * s, img.height * s);
      x.fillStyle = 'rgba(8,8,18,0.5)'; x.fillRect(480 - 79, 102, 158, 176);
    }
    x.restore();
    if (swapped) ART.grin(x, 480, 168, 34, a * 0.9);
  }
  blit(ctx);
}

// ---------- film ----------
async function prepare() {
  S.low = A.canvas(LW, LH);
  S.r42 = await A.loadRemy(CAST.HERO, false);
  S.r42f = await A.loadRemy(CAST.HERO, true);
  S.bald42 = ART.baldify(S.r42, HERO_PAL.skin, HERO_PAL.hair);
  S.r468 = await A.loadRemy(CAST.LEAD, false);
  S.dark468 = ART.silhouette(S.r468, '#05060d');
  S.r468d = { ...S.r468, c: S.dark468 }; // poseable dark silhouette (hall figure, ghost reflection)
  S.r690 = await A.loadRemy(CAST.TWIN_A, false);
  S.r704 = await A.loadRemy(CAST.TWIN_B, false);
  S.r347 = await A.loadRemy(CAST.CHASE_A, false);
  S.r159 = await A.loadRemy(CAST.CHASE_B, false);
  S.origs = {};
  for (const id of [...PORTRAITS, CAST.LEAD]) S.origs[id] = await ART.loadOrig(id);
  S.manor = ART.bakeManor();
  S.cor = ART.bakeWindows(ART.bakeCorridor());
  S.barber = ART.bakeMirrors(ART.bakeBarber());
}

export default {
  title: 'THE SHINE — a Remy Boys horror story',
  output: 'the-shine.mp4',
  duration: DURATION,
  prepare,
  shots: [
    { name: 'storm', t0: T.storm, t1: T.hall, draw: drawStorm,
      fx: () => ({ letterbox: 0.8, vignette: 1.08, grain: 0.016, bloom: 0.12, bloomThresh: 0.82, sat: 0.52, tint: [0.9, 0.96, 1.14], streak: 0.12, contrast: 1.05 }) },
    { name: 'hall', t0: T.hall, t1: T.barber, draw: drawHall,
      fx: () => ({ letterbox: 0.8, vignette: 1.02, grain: 0.014, bloom: 0.1, bloomThresh: 0.8, sat: 0.6, tint: [0.94, 1, 1.08] }) },
    { name: 'barber', t0: T.barber, t1: T.stalk, draw: drawBarber,
      fx: () => ({ letterbox: 0.8, vignette: 0.95, grain: 0.013, bloom: 0.12, bloomThresh: 0.78, sat: 0.66, warm: 0.05, haze: 0.05, hazeColor: [0.28, 0.18, 0.12] }) },
    { name: 'stalk', t0: T.stalk, t1: T.match, draw: drawStalk,
      fx: () => ({ letterbox: 0.8, vignette: 1.12, grain: 0.016, sat: 0.5, tint: [0.92, 0.98, 1.1], bloom: 0.1, bloomThresh: 0.8 }) },
    { name: 'match', t0: T.match, t1: T.chase, draw: drawMatch,
      fx: (lt) => ({ letterbox: 0.8, vignette: lerp(1.28, 1.05, seg(lt, MATCH.strike, MATCH.strike + 0.4)), grain: 0.02, sat: 0.45, tint: [0.93, 0.98, 1.06], exposure: lerp(-0.12, 0, seg(lt, MATCH.strike, MATCH.strike + 0.5)) }) },
    { name: 'chase', t0: T.chase, t1: T.mirror, draw: drawChase,
      fx: () => ({ letterbox: 0.8, vignette: 1.02, grain: 0.014, bloom: 0.14, bloomThresh: 0.8, sat: 0.62, streak: 0.08, aber: 0.0006 }) },
    { name: 'mirror', t0: T.mirror, t1: T.title, draw: drawMirror,
      fx: () => ({ letterbox: 0.8, vignette: 1.08, grain: 0.013, bloom: 0.11, bloomThresh: 0.8, sat: 0.68, tint: [0.97, 1, 1.04] }) },
    { name: 'title', t0: T.title, t1: T.end, draw: drawTitle,
      fx: (lt) => ({ letterbox: 0.8, vignette: 0.7, grain: 0.01, bloom: 0.16, bloomThresh: 0.75, fade: seg(lt, TITLE_EV.fade[0], TITLE_EV.fade[1]) }) },
  ],
  captions: [
    { text: 'The storm brought him back to Remy Manor.', t0: 1.2, t1: 5.4, style: 'gothic' },
    { text: 'The Cabald never left.', t0: 6.0, t1: 9.9, style: 'gothic' },
    { text: 'The portraits knew his name.', t0: 12.6, t1: 16.6, style: 'gothic' },
    { text: 'The last barber never clocked out.', t0: 25.2, t1: 29.2, style: 'gothic' },
    { text: 'The dark takes the room first.', t0: 37.4, t1: 41.4, style: 'gothic' },
    { text: 'THE SHINE', t0: 72.8, t1: 76.9, style: 'title' },
    { text: 'A REMY BOYS HORROR STORY', t0: 73.3, t1: 76.95, style: 'sub', minHold: 2.6 },
    { text: 'HALLOWEEN 2026', t0: 73.3, t1: 76.95, style: 'date', minHold: 2.6 },
  ].map((c) => ({ ...c, anim: 'fade', in: 0.5, out: 0.5 })),
  captionStyles: {
    gothic: { size: 40, font: F.serif, weight: 600, color: '#ddd6c0', y: 856, align: 'center', track: 1.5, glow: '#000000', glowBlur: 10 },
    title: { size: 150, font: F.serif, weight: 600, color: '#e9e3d2', y: 470, align: 'center', track: 10, glow: '#2a2020', glowBlur: 26 },
    sub: { size: 34, font: F.serif, weight: 500, color: '#a89f8a', y: 600, align: 'center', track: 7 },
    date: { size: 26, font: F.serif, weight: 500, color: '#9a9282', y: 662, align: 'center', track: 6 },
  },
  flashes: FLASHES,
  score,
  audio: { seed: 1042, reverb: 3.4, reverbGain: 0.42 },
  lint: { captionHold: 2.9, safe: { margin: 0.05 } },
};
