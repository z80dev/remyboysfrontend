// THE LORD OF THE FLOW — a Remy Boys epic. 90 s, 1080p60 via a 960×540 pixel stage blitted 2× nearest.
// letterbox 1 (2.39:1) → only low-canvas rows ~69..471 carry the frame; every composition keeps its
// subject inside that band. World time runs on timeline clocks; hit-stops freeze g while REAL t keeps
// driving shake/flash (slam/lunge discipline). Every frame pure in t — hash/rng only, no wall clock.
import { W, H, hash, vnoise, seg, lerp, E, clamp, txt, F } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js';
import * as ART from './art.js';
import { score } from './score.js';
import * as TL from './timeline.js';

const {
  T, SHOTS, CAST, COPY, CAPTIONS, CAPTION_STYLES, FLASHES, SHAKES,
  BRIDGE_CLOCK, CRATER_CLOCK, DURATION, LW, LH,
  TITLE_EV, FORGE_EV, HORDE_EV, BANNERS_EV, SHEAR_DAY_EV, SHEAR_NIGHT_EV, ASSEMBLY_EV,
  RIDGE_EV, WRAITH_EV, MINES_ENTER_EV, MINES_HALL_EV, BALROG_EV, BRIDGE_EV, ESCAPE_EV,
  GOLBALD_EV, EYE_EV, CLIMB_EV, CRATER_EV, LUNGE_EV, MELT_EV, TOWERS_EV,
  HAIRIFY_EV, RESCUE_EV, RETURN_EV, EMBRACE_EV, END_EV,
} = TL;

const S = {}; // prepared art (read-only in draw)
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const qp = (a, b, c, u) => lerp(lerp(a, b, u), lerp(b, c, u), u); // quadratic bezier component

// real-time camera shake from the abs SHAKES table — runs while world time is frozen (hit-stop)
function shakeOf(t) {
  let a = 0;
  for (const [t0, amp, dec] of SHAKES) {
    const dt = t - t0;
    if (dt >= 0 && dt < 1.2) a = Math.max(a, amp * Math.exp(-dt * dec));
  }
  if (a <= 0.05) return [0, 0];
  return [(hash(Math.floor(t * 240)) - 0.5) * 2 * a, (hash(Math.floor(t * 240) + 7) - 0.5) * 2 * a * 0.7];
}

// walk cycle: dist-driven so planted feet phase-lock to position (remember-the-flow pattern)
const walkPose = (dist, rate = 44, amp = 3.2, lean = 0.06) => {
  const s = Math.sin((dist / rate) * Math.PI * 2);
  return { lift: [Math.max(0, s) * amp, Math.max(0, -s) * amp], stride: [s * 2, -s * 2], lean };
};
const idlePose = (t, k = 1) => ({ lean: Math.sin(t * 2.1) * 0.014 * k, lift: [0, 0], stride: [0, 0] });

// hit-stop shock ring: sl = seconds since the freeze began
function shockRing(x, px, py, sl, col = '255,220,150') {
  if (sl == null) return;
  const a = Math.max(0, 0.55 - sl * 2.2);
  if (a <= 0.01) return;
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = `rgba(${col},${a})`;
  x.lineWidth = 3;
  x.beginPath(); x.ellipse(px, py, 14 + sl * 320, (14 + sl * 320) * 0.36, 0, 0, 7); x.stroke();
  x.lineWidth = 1.4;
  x.strokeStyle = `rgba(255,244,214,${a * 0.8})`;
  x.beginPath(); x.ellipse(px, py, 8 + sl * 210, (8 + sl * 210) * 0.36, 0, 0, 7); x.stroke();
  x.restore();
}

// staff pose for Grandflo across the bridge scene: plant → raise overhead → whip down → recoil
function staffAng(g, released) {
  if (g < BRIDGE_EV.plant) return lerp(2.55, 2.85, seg(g, 0.2, BRIDGE_EV.plant));
  if (g < BRIDGE_EV.shout) return 2.85;
  if (g < BRIDGE_EV.slam - 0.05) return lerp(2.85, -0.5, E.outCubic(seg(g, BRIDGE_EV.shout, BRIDGE_EV.slam - 0.05)));
  if (g < BRIDGE_EV.slam || released == null) return lerp(-0.5, 2.4, E.inCubic(seg(g, BRIDGE_EV.slam - 0.05, BRIDGE_EV.slam)));
  return lerp(2.4, 2.9, E.outCubic(seg(g, BRIDGE_EV.slam, BRIDGE_EV.slam + 0.5))); // post-release recoil
}

// real lt in bridgeStand when the slam freeze releases (never re-typed)
const CRACK_LT = BRIDGE_CLOCK.filmT(BRIDGE_EV.slam) + BRIDGE_CLOCK.stops[0].d;

// ---------- stage plumbing (the-shine lineage) ---------------------------------------------------
const low = () => S.low.getContext('2d');
function beginLow() {
  const x = low();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.filter = 'none';
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#020204';
  x.fillRect(0, 0, LW, LH);
  return x;
}
function blit(ctx) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
}
function drawPlate(x, c) {
  x.drawImage(c, -ART.OVER, -ART.OVER);
}
// Ken Burns helper: gentle push-in about (cx, cy)
function kb(x, z, cx, cy) {
  x.save();
  x.translate(LW / 2, LH / 2);
  x.scale(z, z);
  x.translate(-cx, -cy);
}
function actor(x, R, px, feet, s, o = {}) {
  ART.shadow(x, px, feet, 15 * s, 0.32);
  A.drawRemy(x, R, Math.round(px), Math.round(feet), { sx: s, sy: s, ...o });
}

// =================================================================================================
// SHOT DRAWS (x = low ctx, lt = shot-local real seconds, t = film time; warped shots re-derive g)
// =================================================================================================
const DRAWS = {
  // ---- 1 · mist + main title (type on the overlay, never in the pixel stage) --------------------
  mistTitle(x, lt, t, ov) {
    if (lt >= 0.35) {
      x.save();
      x.globalAlpha = seg(lt, 0.35, 1.4);
      drawPlate(x, S.mist);
      x.restore();
    }
    ART.fog(x, t, 270, 210, 1, 0.16 + 0.1 * seg(lt, TITLE_EV.mistThicken, 6));
    ART.fog(x, t, 360, 150, 7, 0.13 + 0.12 * seg(lt, TITLE_EV.mistThicken, 6));
    ART.fog(x, t, 430, 90, 12, 0.1 + 0.08 * seg(lt, TITLE_EV.mistThicken, 6));
    if (lt < 1.1) { x.fillStyle = `rgba(1,2,5,${1 - seg(lt, 0, 1.1)})`; x.fillRect(0, 0, LW, LH); }
    // main title: slow gold settle (overlay)
    const settle = E.outCubic(seg(t, TITLE_EV.titleSettle, TITLE_EV.titleSettle + 1.7));
    const out = 1 - seg(t, 5.0, 5.8);
    if (settle > 0 && out > 0) {
      ov.save();
      ov.translate(960, 428 + (1 - settle) * 26);
      ov.scale(lerp(1.06, 1, settle), lerp(1.06, 1, settle));
      txt(ov, COPY.title.main, 0, 0, {
        size: 92, font: F.serif, weight: 700, color: '#f0dfae', align: 'center',
        track: lerp(24, 10, settle), glow: '#3a2606', glowBlur: 26, alpha: settle * out,
      });
      ov.restore();
    }
    const sub = seg(t, TITLE_EV.subIn, TITLE_EV.subIn + 0.9);
    if (sub > 0 && out > 0) {
      txt(ov, COPY.title.sub, 960, 524, {
        size: 30, font: F.serif, weight: 500, color: '#c9b98f', align: 'center', track: 8, alpha: sub * out,
      });
    }
  },

  // ---- 2 · plate I: the forging -----------------------------------------------------------------
  forgePlate(x, lt, t) {
    const g = lt; // 1×
    kb(x, 1 + 0.07 * seg(lt, 0, 1.5), 560, 380);
    drawPlate(x, S.forge);
    // hammer: raised → strikes ON the anvil at FORGE_EV.hammer → rebounds
    const ang = g < FORGE_EV.hammer
      ? lerp(-0.2, 0.58, E.inCubic(seg(g, 0.12, FORGE_EV.hammer)))
      : lerp(0.58, -0.05, E.outCubic(seg(g, FORGE_EV.hammer, FORGE_EV.hammer + 0.55)));
    x.save();
    x.translate(450, 250);
    x.rotate(ang);
    x.fillStyle = '#5a4326'; x.fillRect(-6, -5, 182, 10);
    x.fillStyle = '#6d5430'; x.fillRect(-6, -5, 182, 3);
    x.fillStyle = '#26222a'; x.fillRect(162, -17, 36, 36);
    x.fillStyle = '#38333e'; x.fillRect(162, -17, 36, 6);
    x.restore();
    // sparks on the strikes
    ART.chips(x, FORGE_EV.sparks.map((sg2, i) => ({ g: sg2, x: 602, y: 344, seed: 21 + i })), g, '255,180,70', 12);
    // forge breath + coal light
    ART.warmGlow(x, 160, 400, 190, 0.26 * (0.75 + 0.25 * ART.flick(t, 5)));
    ART.warmGlow(x, 600, 350, 130, 0.2 * (0.7 + 0.3 * ART.flick(t, 6, 18)));
    ART.darkness(x, 0.3, [
      { x: 160, y: 380, r: 240, soft: 0.7 },
      { x: 600, y: 350, r: 190, soft: 0.7 },
    ]);
    ART.fog(x, t, 380, 90, 4, 0.04);
    x.restore();
  },

  // ---- 3 · plate II: the horde marches ----------------------------------------------------------
  hordePlate(x, lt, t) {
    const g = lt; // 1×
    drawPlate(x, S.plain);
    ART.dust(x, t, 0, 380, LW, 110, 20, 13);
    const ranks = [];
    CAST.HORDE.forEach((id, i) => {
      const back = i % 2 === 1;
      const px = 250 + g * 110 - (i >> 1) * 100 - (back ? 52 : 0);
      ranks.push({ R: S.horde[i], px, feet: back ? 440 : 470, s: back ? 1.42 : 1.68, ph: px * 0.85 + i });
    });
    ranks.sort((a, b) => a.feet - b.feet);
    for (const r of ranks) {
      actor(x, r.R, r.px, r.feet, r.s, { ...walkPose(r.ph, 40, 3.4, 0.07), flip: false, glow: '#4a3648', glowA: 0.12 });
    }
    // dust kicks under the front rank
    ART.puffs(x, { g: HORDE_EV.dustKick, x: 150 + g * 96, y: 470, seed: 31 }, g, 0.9, '90,74,88', 5);
    ART.puffs(x, { g: HORDE_EV.dustKick + 0.5, x: 210 + g * 96, y: 472, seed: 32 }, g, 0.9, '90,74,88', 4);
    ART.fog(x, t, 250, 90, 8, 0.07);
  },

  // ---- 4 · plate III: the banners fall ----------------------------------------------------------
  fallPlate(x, lt, t) {
    const g = lt; // 1×
    kb(x, 1 + 0.1 * seg(t, BANNERS_EV.kb[0], BANNERS_EV.kb[1]), 430, 350);
    drawPlate(x, S.kingdom);
    // two great banners sag and fall in waves
    const hang1 = 1 - seg(g, BANNERS_EV.bannerDrop, BANNERS_EV.bannerDrop + 1.0);
    const hang2 = 1 - seg(g, BANNERS_EV.bannerDrop + 1.5, BANNERS_EV.bannerDrop + 2.5);
    ART.banner(x, 170, 240, 92, 168, hang1, t * 1.7, '#a8842e', '#d8b458');
    ART.banner(x, 690, 240, 92, 168, hang2, t * 1.7 + 2.1, '#7a8a3c', '#a8b85c');
    // parapet pennants droop late
    const droop = seg(g, BANNERS_EV.bannerFall[0] + 1.4, BANNERS_EV.bannerFall[1]);
    if (droop > 0) {
      x.fillStyle = `rgba(168,132,46,${0.85 * (1 - droop * 0.5)})`;
      for (let px = 6; px < LW; px += 34) {
        const hh = 12 * (1 - droop * 0.7);
        x.beginPath(); x.moveTo(px, 224); x.lineTo(px + 14, 224 + hh * 0.4); x.lineTo(px + 2, 224 + hh); x.closePath(); x.fill();
      }
    }
    if (g > BANNERS_EV.ashTint) ART.dust(x, t, 0, 60, LW, 300, 12, 45); // first grey motes
    ART.fog(x, t, 300, 160, 6, 0.05 + 0.05 * seg(g, 2.5, 4.5));
    x.restore();
  },

  // ---- 5 · the Shear, golden day ----------------------------------------------------------------
  shearDay(x, lt, t) {
    kb(x, 1.03 + 0.05 * seg(lt, 0, 3), 480, 300);
    drawPlate(x, S.shearDay);
    // laundry lines with swaying combs
    const swayAmp = 3 * seg(lt, SHEAR_DAY_EV.windIn, SHEAR_DAY_EV.laundrySway + 0.4);
    for (const [lx, top] of [[300, 372], [700, 358]]) {
      x.strokeStyle = 'rgba(90,67,38,0.9)';
      x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(lx + 4, top + 4); x.quadraticCurveTo(lx + 88, top + 16 + swayAmp, lx + 172, top + 12); x.stroke();
      for (let c = 0; c < 3; c++) {
        const u = 0.22 + c * 0.28;
        const cx2 = lerp(lx + 4, lx + 172, u);
        const cy2 = top + 6 + Math.sin(Math.PI * u) * 9 + Math.sin(t * 1.6 + u * 5) * swayAmp;
        ART.comb(x, cx2, cy2, 15, '#5a4326', '#8a744c');
      }
    }
    // wind in the meadow
    ART.windStreaks(x, t, 0.8 * seg(lt, SHEAR_DAY_EV.grassWave, 1.4), 380, 470, 10);
    x.restore();
    ART.goldMotes(x, t, 24, 11);
  },

  // ---- 6 · the Shear at night: the Razor is raised ----------------------------------------------
  shearNight(x, lt, t) {
    drawPlate(x, S.shearNight);
    const gf = S.six.GRANDFLO;
    const px = 470, feet = 464;
    actor(x, gf, px, feet, 1.9, { ...idlePose(t, 1.2), flip: false });
    // the dug-up Razor: out of the earth → held low (clear of his face) → raised to the sky.
    // The prop sits up-left of his eye line so the glint beats AND the face reads.
    const dig = E.outCubic(seg(lt, SHEAR_NIGHT_EV.digReveal, SHEAR_NIGHT_EV.digReveal + 0.5));
    const raise = E.outCubic(seg(lt, SHEAR_NIGHT_EV.raiseRazor, SHEAR_NIGHT_EV.raiseRazor + 0.6));
    const rx = px - 38 + raise * 14;
    const ry = lerp(feet - 34, feet - 128, dig) - raise * 30;
    const rang = -0.35 - raise * 0.5 + Math.sin(lt * 1.4) * 0.03;
    ART.chips(x, [{ g: SHEAR_NIGHT_EV.digReveal, x: px + 10, y: feet - 6, seed: 51 }], lt, '150,110,60', 8, 260);
    ART.razorGold(x, rx, ry, rang, 1.5, 0);
    // the glint lands with the score's solo note
    const glintK = Math.max(0, 1 - Math.abs(lt - SHEAR_NIGHT_EV.glint) / 0.5);
    ART.sparkle(x, rx + 20, ry - 4, 11, 0.9 * glintK, t);
    ART.warmGlow(x, rx, ry, 60, 0.3 * glintK, '255,240,200');
    // night lighting: moon, warm door, the raised blade
    ART.warmGlow(x, 128, 442, 56, 0.3 * (0.85 + 0.15 * ART.flick(t, 9)), '255,190,110');
    ART.darkness(x, 0.52, [
      { x: 760, y: 96, r: 190, soft: 0.85 },
      { x: 128, y: 440, r: 90 },
      { x: rx, y: ry, r: 96 + 60 * glintK },
      { x: px, y: feet - 80, r: 80 },
    ]);
    ART.fog(x, t, 400, 110, 3, 0.06);
  },

  // ---- 7 · the fellowship assembles -------------------------------------------------------------
  assembly(x, lt, t) {
    drawPlate(x, S.assembly);
    const order = ['GRANDFLO', 'FLOWDO', 'SAMFLO', 'ARCHER', 'AXE', 'WARRIOR'];
    const gust = lt >= ASSEMBLY_EV.gust ? Math.exp(-(lt - ASSEMBLY_EV.gust) * 0.9) : 0;
    // smaller figures, spread across the frame, staggered eased entries (no pop-ins)
    const roster = order.map((role, i) => {
      const t0 = 0.15 + i * 0.25;
      const a = seg(lt, t0, t0 + 0.45);
      return {
        R: S.six[role],
        px: 128 + i * 124 + E.outCubic(a) * 14,
        feet: i % 2 ? 446 : 460,
        s: (i % 2 ? 1.04 : 1.12) * (0.88 + 0.12 * E.outCubic(a)),
        alpha: a,
        lean: 0.02 + gust * 0.05 * (i % 2 ? 1 : -0.6),
      };
    });
    for (const r of roster) {
      if (r.alpha <= 0) continue;
      actor(x, r.R, r.px, r.feet, r.s, { ...idlePose(t, 1 + gust), lean: r.lean, alpha: r.alpha });
    }
    ART.windStreaks(x, t, 0.5 + gust * 1.6, 140, 440, 16);
    ART.goldMotes(x, t, 18, 23);
  },

  // ---- 8/9 · the ridge: shared painter (walk + parallax valley) ---------------------------------
  ridgeBase(x, g, opts = {}) {
    const speed = opts.speed ?? 40;
    const drift = clamp((g / 4.5) * 44 - 22, -22, 22); // slow parallax pans, inside OVER
    drawPlate(x, S.ridgeSky);
    x.drawImage(S.ridgeFar, -ART.OVER - drift * 0.3, 132);
    if (opts.wraiths) {
      // Razorwraiths rise on the dark ridge behind (between far and near layers)
      const rise = E.outCubic(seg(g, WRAITH_EV.shapesIn, WRAITH_EV.shapesIn + 1.2));
      if (rise > 0) {
        for (let i = 0; i < 3; i++) {
          const wx = 150 + i * 250 - drift * 0.3;
          const wy = lerp(354, 318, rise);
          ART.wraith(x, wx, wy, 1.25 + i * 0.15, g + i * 3, i + 1);
        }
      }
    }
    x.drawImage(S.ridgeNear, -ART.OVER - drift * 0.6, 196);
    x.drawImage(S.ridgeCrest, -ART.OVER - drift, 306);
    // the six on the crest, painter's order by feet
    const crestTop = (px) => 306 + 36 - 12 * vnoise(px * 0.011, 105) - 4 * vnoise(px * 0.033, 106);
    const order = ['GRANDFLO', 'FLOWDO', 'SAMFLO', 'ARCHER', 'AXE', 'WARRIOR'];
    const list = order.map((role, i) => {
      const start = RIDGE_EV.stepOff + i * 0.14;
      const dist = Math.max(0, g - start) * speed;
      const px = 44 + i * 78 + dist;
      return { role, px, feet: crestTop(px) + 16 + (i % 2) * 4, s: i % 2 ? 1.2 : 1.3 };
    });
    list.sort((a, b) => a.feet - b.feet);
    for (const m of list) {
      const marching = g >= RIDGE_EV.stepOff + 0.14 * list.indexOf(m) && opts.march;
      const pose = marching
        ? walkPose((m.px - 64) * 1.4, 40, 3.2, opts.lean ?? 0.06)
        : idlePose(g, 0.7);
      actor(x, S.sil[m.role], m.px, m.feet, m.s, { ...pose, flip: false });
    }
    // the low sun still burns on the valley
    ART.warmGlow(x, 600 - drift * 0.1, 318, 200, opts.sunGlow ?? 0.22, '255,170,90');
  },
  ridgeWalk(x, lt, t) {
    this.ridgeBase(x, lt, { march: true, speed: 40, sunGlow: 0.24 });
    ART.fog(x, t, 340, 120, 5, 0.05);
  },
  wraithRidge(x, lt, t) {
    const quick = lt >= WRAITH_EV.purpose ? 1 : 0;
    this.ridgeBase(x, lt, { march: true, speed: 46 + quick * 16, lean: 0.06 + quick * 0.05, wraiths: true, sunGlow: 0.1 });
    // the light dies as the shapes hold the ridge
    x.fillStyle = `rgba(6,6,14,${0.3 * seg(lt, WRAITH_EV.shapesIn, WRAITH_EV.shapesHold + 1)})`;
    x.fillRect(0, 0, LW, LH);
    ART.fog(x, t, 330, 130, 12, 0.08);
  },

  // ---- 10 · the gate of the Mines ---------------------------------------------------------------
  minesEnter(x, lt, t) {
    drawPlate(x, S.gate);
    const order = ['GRANDFLO', 'FLOWDO', 'SAMFLO', 'ARCHER', 'AXE', 'WARRIOR'];
    for (let i = order.length - 1; i >= 0; i--) {
      const role = order[i];
      const u = E.inOutCubic(seg(lt, MINES_ENTER_EV.gateDark + 0.2 + i * 0.18, MINES_ENTER_EV.gateDark + 2.1 + i * 0.18));
      const halt = i >= 4; // the trailing two hold the threshold — staged in the wide
      let px = lerp(130 + i * 44, 424 + (i % 3) * 14, u); // all six, spread, inside the frame
      if (halt) px = Math.min(px, i === 4 ? 336 : 382);
      const feet = lerp(448, 462, u) - Math.sin(u * Math.PI) * 8; // down the steps
      const alpha = halt ? 1 : 1 - seg(px, 418, 462); // the four fold into the door, still visible at the cut
      if (alpha <= 0) continue;
      actor(x, S.six[role], px, feet, 0.92, { ...walkPose(px * 1.6, 40, 3, 0.05), alpha });
    }
    // gate torches
    for (const [tx, seed] of [[268, 41], [592, 42]]) {
      ART.flame(x, tx, 328, 1.15, t, seed);
      ART.warmGlow(x, tx, 330, 84, 0.22 * ART.flick(t, seed));
    }
    ART.darkness(x, lerp(0.34, 0.74, seg(lt, 0.6, 2.8)), [
      { x: 268, y: 330, r: 110 },
      { x: 592, y: 330, r: 110 },
      { x: 430, y: 330, r: 120 },
    ]);
    ART.fog(x, t, 420, 80, 9, 0.05);
  },

  // ---- 11 · the dark halls ----------------------------------------------------------------------
  minesHall(x, lt, t) {
    const rumble = Math.max(0, 1 - Math.abs(lt - MINES_HALL_EV.distantRumble) / 0.5);
    x.save();
    x.translate(rumble > 0 ? (hash(Math.floor(t * 90)) - 0.5) * 3 * rumble : 0, 0);
    drawPlate(x, S.hall);
    // the party threads the colonnade
    const order = ['FLOWDO', 'SAMFLO', 'ARCHER', 'AXE', 'WARRIOR'];
    for (let i = 0; i < order.length; i++) {
      const px = 40 + lt * 66 - i * 44;
      if (px < -40 || px > LW + 40) continue;
      actor(x, S.six[order[i]], px, 462 + (i % 2) * 5, 1.06, { ...walkPose(px * 1.5, 40, 3, 0.05), flip: false });
    }
    // relic combs catch the light
    const glintK = seg(lt, MINES_HALL_EV.relicCombs, MINES_HALL_EV.relicCombs + 0.7);
    if (glintK > 0) for (const nx of [130, 400, 670, 900]) ART.sparkle(x, nx + 10, 250, 7, 0.5 * glintK, t + nx);
    // torch flicker: darkness holes breathe, and blink on the flicker seeds
    const seedHit = MINES_HALL_EV.torchFlicker.some((f) => Math.abs(lt - f) < 0.09);
    const holes = [];
    for (const [tx, seed] of [[70, 61], [890, 62]]) {
      const dead = seedHit && hash(Math.floor(t * 13) + seed) > 0.45;
      if (!dead) {
        ART.flame(x, tx, 208, 1.2, t, seed);
        holes.push({ x: tx, y: 212, r: 130 * (0.8 + 0.3 * ART.flick(t, seed)) });
      }
    }
    if (lt >= MINES_HALL_EV.dustMotes) ART.dust(x, t, 120, 180, 720, 220, 22, 71);
    ART.darkness(x, 0.78, holes);
    for (const [tx, seed] of [[70, 61], [890, 62]]) ART.warmGlow(x, tx, 214, 110, 0.2 * ART.flick(t, seed));
    x.restore();
  },

  // ---- 12 · BALDROG rises -----------------------------------------------------------------------
  balrogRise(x, lt, t) {
    const g = lt; // 1×
    drawPlate(x, S.chasm);
    const eclipse = seg(g, BALROG_EV.rise, BALROG_EV.eclipse);
    const roarK = seg(g, BALROG_EV.roar, BALROG_EV.roar + 0.6);
    // firelight climbs out of the gap — fast attack so the open registers immediately
    const glowK = seg(g, 0.0, 0.65);
    ART.warmGlow(x, 480, 440, 340 * glowK + 40, 0.5 * glowK, '255,120,40');
    if (g >= 0.25) ART.emberColumn(x, g, 480, 445, 30, 520, 3, 240);
    // the head ascends and swallows the torchlight
    if (eclipse > 0) {
      const headY = lerp(600, 336, E.outCubic(eclipse));
      const headK = lerp(1.5, 2.1, eclipse);
      ART.baldrogHead(x, 480, headY, headK, g, { eclipse: 0.4 + 0.6 * eclipse, roar: roarK });
    }
    ART.darkness(x, lerp(0.5, 0.72, seg(g, 0.4, 1.3)), [
      { x: 180, y: 210, r: lerp(120, 12, eclipse) },
      { x: 780, y: 210, r: lerp(120, 12, eclipse) },
      { x: 480, y: 400, r: 220 * glowK + 60 },
      ...(eclipse > 0 ? [{ x: 480, y: 330, r: 190 * eclipse }] : []),
    ]);
    ART.warmGlow(x, 480, 436, 170 * glowK, 0.3 * glowK * (1 + roarK * 0.5), '255,120,40');
    ART.fog(x, t, 150, 90, 14, 0.05);
  },

  // ---- 13 · "YOU SHALL NOT BALD!" — the slam, the hit-stop --------------------------------------
  bridgeStand(x, lt, t) {
    const w = BRIDGE_CLOCK.warp(lt);
    const g = w.g;
    const [shx, shy] = shakeOf(t); // REAL time: shakes run over the frozen frame
    x.save();
    x.translate(shx, shy);
    drawPlate(x, S.bridge);
    // Grandflo mid-span
    const px = 330, feet = 368, s = 1.7;
    const released = w.stop ? null : seg(lt, CRACK_LT, CRACK_LT + 0.4); // 0..1 after the freeze lets go
    const lean = g < BRIDGE_EV.shout ? 0.04 : -0.02;
    actor(x, S.six.GRANDFLO, px, feet, s, { ...idlePose(t, 0.6), flip: false, lean: lean - (released || 0) * 0.05 });
    // the staff: plant → raise → SLAM (frozen at contact) → recoil
    const ang = staffAng(g, w.stop ? null : released);
    const handX = px + 12, handY = feet - 62;
    const glowK = 0.25 + 0.75 * seg(g, BRIDGE_EV.shout, BRIDGE_EV.slam);
    const st = ART.staff(x, handX, handY, ang, 46, glowK, t);
    // contact fx live exactly while the world is frozen
    if (g >= BRIDGE_EV.slam) {
      const sl = w.stop ? w.sl : Math.max(0, lt - CRACK_LT) + 0.18;
      shockRing(x, st.tipX, st.tipY + 14, sl);
      ART.chips(x, [{ g: BRIDGE_EV.slam, x: st.tipX, y: st.tipY + 14, seed: 81 }], g, '255,210,140', 14, 260);
      ART.warmGlow(x, st.tipX, st.tipY, 90, 0.5 * Math.max(0.2, glowK - sl), '230,238,255');
    }
    // the bridge crack opens as the freeze releases
    if (released > 0) {
      x.save();
      x.strokeStyle = `rgba(255,170,90,${0.7 * (1 - released)})`;
      x.lineWidth = 2;
      x.beginPath();
      let cx2 = st.tipX, cy2 = 372;
      x.moveTo(cx2, cy2);
      for (let i2 = 0; i2 < 5; i2++) {
        cx2 += (hash(i2 * 7 + 3) - 0.3) * 30; cy2 += 6 + hash(i2 * 5) * 8;
        x.lineTo(cx2, cy2);
      }
      x.stroke();
      x.restore();
    }
    // the Baldrog haunts the far end, whip cracking
    const bx = g < BRIDGE_EV.slam ? lerp(1010, 640, seg(g, 0, 3.02)) : lerp(640, 720, seg(g, BRIDGE_EV.slam, 3.02));
    if (bx < 1000) {
      x.save();
      x.translate(bx, 296);
      x.rotate(Math.sin(g * 1.2) * 0.03);
      ART.baldrogHead(x, 0, 0, 1.15, g, { eclipse: 1, roar: 0.15 + 0.25 * hash(Math.floor(g * 2)) });
      x.restore();
      ART.fireWhip(x, bx + 20, 320, bx - 90, 356, t, 4, 0.7);
      ART.warmGlow(x, bx, 310, 110, 0.3, '255,120,40');
    }
    // the boys watch from the near end
    actor(x, S.six.FLOWDO, 84, 356, 0.95, { ...idlePose(t, 0.8), flip: false });
    actor(x, S.six.SAMFLO, 132, 362, 0.9, { ...idlePose(t, 0.9), flip: false });
    ART.darkness(x, 0.58, [
      { x: st.tipX, y: st.tipY, r: 130 * glowK + 30 },
      { x: px, y: feet - 80, r: 110 },
      { x: 108, y: 280, r: 140 },
      ...(bx < 1000 ? [{ x: bx, y: 310, r: 150 }] : []),
    ]);
    x.restore();
  },

  // ---- 14 · the fall (clock lt+3: slow-mo window lives in g) ------------------------------------
  theFall(x, lt, t) {
    const w = BRIDGE_CLOCK.warp(lt + 3);
    const g = w.g;
    const [shx, shy] = shakeOf(t);
    x.save();
    x.translate(shx, shy);
    drawPlate(x, S.bridge);
    const broke = g >= BRIDGE_EV.collapse;
    if (broke) {
      // the span under the Baldrog gives way: overpaint the mid-deck with void + falling slabs
      const u = seg(g, BRIDGE_EV.collapse, BRIDGE_EV.collapse + 0.9);
      x.fillStyle = '#040306';
      x.beginPath();
      x.moveTo(430, 356);
      x.lineTo(700, 348);
      x.lineTo(700 + u * 20, 470);
      x.lineTo(430 - u * 20, 470);
      x.closePath(); x.fill();
      for (let i = 0; i < 4; i++) {
        const su = seg(g, BRIDGE_EV.collapse + i * 0.08, BRIDGE_EV.collapse + i * 0.08 + 1.2);
        if (su <= 0 || su >= 1) continue;
        const sx2 = 470 + i * 55 + su * 30, sy2 = 366 + su * su * 220;
        x.save();
        x.translate(sx2, sy2);
        x.rotate(su * (hash(i) > 0.5 ? 2.4 : -1.8));
        x.fillStyle = '#191420';
        x.fillRect(-20, -6, 40, 12);
        x.restore();
      }
      ART.puffs(x, { g: BRIDGE_EV.collapse, x: 560, y: 370, seed: 91 }, g, 1.4, '70,60,80', 7);
      ART.chips(x, [{ g: BRIDGE_EV.collapse, x: 560, y: 366, seed: 92 }], g, '190,170,150', 10, 320);
    }
    // the Baldrog falls, dragging Grandflo by a whip of fire
    if (broke) {
      const fu = seg(g, BRIDGE_EV.collapse, BRIDGE_EV.swallowed);
      const fy = lerp(296, 610, E.inQuad(fu));
      const frot = fu * 0.9;
      x.save();
      x.translate(600, fy);
      x.rotate(frot);
      ART.baldrogHead(x, 0, 0, 1.2, g, { eclipse: 1, roar: 0.5 });
      x.restore();
      const gAlph = 1 - seg(g, BRIDGE_EV.swallowed - 0.25, BRIDGE_EV.swallowed);
      if (gAlph > 0) {
        const grip = seg(g, BRIDGE_EV.dragGrip, BRIDGE_EV.dragGrip + 0.2);
        const gx2 = lerp(560, 590, fu), gy2 = lerp(368, 560, E.inQuad(fu));
        if (grip > 0) ART.fireWhip(x, 600, fy, gx2, gy2 - 20, t, 6, 0.85);
        // the staff stays in his grip (drawn under the hand, turning with him)
        if (gAlph > 0.3) ART.staff(x, gx2 + 8, gy2 - 56, 2.35 + fu * 2.2, 40, 0.25, t);
        actor(x, S.six.GRANDFLO, gx2, gy2, 1.55, {
          ...idlePose(g, 0.5), flip: false, rot: frot * 1.5, alpha: gAlph,
        });
      }
      // the chasm keeps breathing after the swallow — no dead-air hold
      if (fu > 0.8) {
        ART.emberColumn(x, g, 560, 462, 12, 150, 7, 190);
        ART.warmGlow(x, 560, 442, 120, 0.2 * (0.7 + 0.3 * ART.flick(t, 77)), '255,110,40');
      }
      if (fu > 0.92) ART.puffs(x, { g: BRIDGE_EV.swallowed, x: 600, y: 430, seed: 93 }, g, 1.2, '60,40,50', 6);
    } else {
      // pre-collapse: the Baldrog looms at the far end
      x.save();
      x.translate(700, 300);
      ART.baldrogHead(x, 0, 0, 1.15, g, { eclipse: 1, roar: 0.3 });
      x.restore();
      ART.fireWhip(x, 720, 324, 640, 356, t, 5, 0.6);
    }
    // FLOWDO + SAMFLO at the near edge — they recoil when the span gives way
    const recoil = broke ? Math.sin(Math.PI * seg(g, BRIDGE_EV.collapse, BRIDGE_EV.collapse + 0.6)) : 0;
    actor(x, S.six.FLOWDO, 96 - recoil * 9, 356 - recoil * 6, 1.0, {
      ...idlePose(t, 1.6), flip: false, lean: 0.03 + (broke ? 0.1 : 0) + recoil * 0.16,
    });
    actor(x, S.six.SAMFLO, 146 - recoil * 7, 362 - recoil * 5, 0.95, {
      ...idlePose(t, 1.8), flip: false, lean: 0.04 + (broke ? 0.12 : 0) + recoil * 0.14,
    });
    ART.darkness(x, 0.6, [
      { x: 96, y: 280, r: 110 },
      ...(broke ? [{ x: 560, y: 340, r: 220, soft: 0.8 }] : [{ x: 700, y: 300, r: 160 }]),
    ]);
    x.restore();
  },

  // ---- 15 · grief at the far end ----------------------------------------------------------------
  escapeGrief(x, lt, t) {
    kb(x, 1.45, 250, 420);
    drawPlate(x, S.gate);
    x.restore();
    const knee = E.outCubic(seg(lt, ESCAPE_EV.dropToKnees, ESCAPE_EV.dropToKnees + 0.4));
    actor(x, S.six.FLOWDO, 214, 452, 1.5, {
      ...idlePose(t, 1.6), flip: false, rot: knee * 0.16, sy: 1.5 * (1 - knee * 0.09), lean: -0.04 - knee * 0.06,
    });
    actor(x, S.six.SAMFLO, 288, 448, 1.42, { ...idlePose(t, 1.2), flip: true, lean: 0.06 });
    ART.darkness(x, 0.55, [
      { x: 214, y: 380, r: 130 },
      { x: 288, y: 380, r: 110 },
    ]);
    ART.fog(x, t, 300, 160, 17, 0.05);
  },

  // ---- 16 · the ashlands ------------------------------------------------------------------------
  ashlands(x, lt, t) {
    drawPlate(x, S.ash);
    ART.ashDrift(x, t, 80);
    ART.emberColumn(x, t, 770, 310, 16, 170, 9);
    const duo = [
      { R: S.six.FLOWDO, px: 420 + lt * 26, feet: 452, s: 1.0 },
      { R: S.six.SAMFLO, px: 486 + lt * 26, feet: 458, s: 0.94 },
    ];
    for (const d of duo) actor(x, d.R, d.px, d.feet, d.s, { ...walkPose(d.px * 1.2, 52, 2.6, 0.1), flip: false });
    ART.fog(x, t, 330, 140, 19, 0.07);
  },

  // ---- 17 · GOLBALD and the precious ------------------------------------------------------------
  golbaldRock(x, lt, t) {
    drawPlate(x, S.spur);
    // the pair far below on the path
    actor(x, S.six.FLOWDO, 560 + lt * 14, 464, 0.78, { ...walkPose(lt * 26, 48, 2.4, 0.09), flip: false });
    actor(x, S.six.SAMFLO, 626 + lt * 14, 468, 0.74, { ...walkPose(lt * 26 + 20, 48, 2.4, 0.09), flip: false });
    // GOLBALD on the spur: skulk → peek → clutch → skulk off
    const peek = E.outCubic(seg(lt, GOLBALD_EV.peek, GOLBALD_EV.peek + 0.6));
    const off = seg(lt, GOLBALD_EV.skulkOff, GOLBALD_EV.skulkOff + 0.4);
    const gx = lerp(lerp(300, 352, peek), 430, off);
    const gy = 260 - peek * 6 + off * 6;
    const clutch = E.outBack(seg(lt, GOLBALD_EV.clutch, GOLBALD_EV.clutch + 0.5));
    actor(x, S.golbald, gx, gy, 1.42, {
      ...idlePose(t, 1.6), flip: false, lean: 0.1 + peek * 0.1, sy: 1.42 * 0.95, alpha: 1 - off * 0.4,
    });
    // the tiny toupee: clutched in his hands, then pressed to the scalp
    const tpx = gx + lerp(14, 3, clutch), tpy = gy - lerp(52, 92, clutch);
    if (off < 0.9) ART.toupee(x, tpx, tpy, 1.5 + clutch * 0.2, t);
    // the precious glints; a cold moon is his only light
    ART.sparkle(x, tpx, tpy - 4, 5, 0.4 + 0.2 * Math.sin(t * 2), t);
    ART.darkness(x, 0.5, [
      { x: gx, y: gy - 60, r: 110 },
      { x: 700, y: 120, r: 180, soft: 0.9 },
    ]);
    ART.fog(x, t, 380, 110, 21, 0.06);
  },

  // ---- 18 · the Eye swivels its beam ------------------------------------------------------------
  eyeTower(x, lt, t) {
    drawPlate(x, S.tower);
    // the EYE
    const swivel = seg(lt, EYE_EV.swivel, EYE_EV.swivel + 0.5);
    const ang = Math.sin(t * 0.9) * 0.1 * swivel;
    x.save();
    x.translate(662, 186);
    x.rotate(ang);
    x.drawImage(S.eyeIcon, -52, -52, 104, 104);
    x.restore();
    ART.warmGlow(x, 662, 186, 100, 0.32, '255,120,60');
    // the search-beam sweeps the world
    const beamK = seg(lt, EYE_EV.beam, EYE_EV.beam + 0.3) * (1 - seg(lt, EYE_EV.sweepEnd, EYE_EV.sweepEnd + 0.25));
    if (beamK > 0.02) {
      const dir = lerp(2.35, 0.75, seg(lt, EYE_EV.beam, EYE_EV.sweepEnd));
      const L = 690;
      x.save();
      x.globalCompositeOperation = 'lighter';
      const ex = 662, ey = 190;
      const x1 = ex + Math.cos(dir - 0.055) * L, y1 = ey + Math.sin(dir - 0.055) * L;
      const x2 = ex + Math.cos(dir + 0.055) * L, y2 = ey + Math.sin(dir + 0.055) * L;
      const g = x.createLinearGradient(ex, ey, ex + Math.cos(dir) * L, ey + Math.sin(dir) * L);
      const fl = 0.8 + 0.2 * hash(Math.floor(t * 24));
      g.addColorStop(0, `rgba(255,160,80,${0.55 * beamK * fl})`);
      g.addColorStop(0.75, `rgba(255,120,55,${0.2 * beamK * fl})`);
      g.addColorStop(1, 'rgba(255,110,50,0)');
      x.fillStyle = g;
      x.beginPath(); x.moveTo(ex, ey); x.lineTo(x1, y1); x.lineTo(x2, y2); x.closePath(); x.fill();
      // hot core
      x.strokeStyle = `rgba(255,220,160,${0.5 * beamK * fl})`;
      x.lineWidth = 2.4;
      x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex + Math.cos(dir) * L, ey + Math.sin(dir) * L); x.stroke();
      x.restore();
    }
    // fire pits at the tower's feet
    for (const [fx2, seed] of [[300, 43], [560, 44], [820, 45]]) {
      ART.warmGlow(x, fx2, 442, 60, 0.16 * ART.flick(t, seed), '255,110,40');
    }
    ART.fog(x, t, 350, 120, 23, 0.06);
  },

  // ---- 19 · the climb ---------------------------------------------------------------------------
  domeClimb(x, lt, t) {
    drawPlate(x, S.dome);
    ART.emberColumn(x, t, 740, 190, 20, 380, 13, 170);
    const gusts = CLIMB_EV.emberSeeds.reduce((m, s0) => Math.max(m, lt >= s0 ? Math.exp(-(lt - s0) * 1.4) : 0), 0);
    ART.windStreaks(x, t, 0.6 + 0.9 * gusts + 0.5 * Math.max(0, 1 - Math.abs(lt - CLIMB_EV.windPeak) / 0.8), 100, 420, 18);
    // the pair on the switchback
    const u = seg(lt, 0.2, 3.0);
    const duo = [
      { R: S.six.FLOWDO, k: 0 },
      { R: S.six.SAMFLO, k: 0.12 },
    ];
    for (const d of duo) {
      const uu = clamp01(u - d.k);
      const px = qp(60, 250, 470, uu);
      const feet = qp(492, 430, 356, uu) - 4;
      actor(x, d.R, px, feet, 1.0 - uu * 0.12, { ...walkPose(px * 1.3, 50, 3, 0.12), flip: false });
    }
    // the dome's inner fire
    ART.warmGlow(x, 760, 170, 160, 0.2 * (0.8 + 0.2 * ART.flick(t, 15)), '255,110,40');
    ART.fog(x, t, 300, 140, 25, 0.06);
  },

  // ---- 20 · the crater rim: the temptation ------------------------------------------------------
  craterEdge(x, lt, t) {
    drawPlate(x, S.crater);
    ART.lavaBlobs(x, t, 320, 77, 16);
    ART.warmGlow(x, 480, 380, 260, 0.2, '255,130,40');
    const arrive = E.outCubic(seg(lt, 0.2, CRATER_EV.rimArrive));
    const px = lerp(300, 430, arrive);
    const feet = 430 - arrive * 4;
    // FLOWDO hesitates, razor wavering
    const wob = seg(lt, CRATER_EV.hesitation, CRATER_EV.hesitation + 0.4);
    actor(x, S.six.FLOWDO, px, feet, 1.35, {
      ...(wob > 0 ? idlePose(t, 1.8) : walkPose(px * 1.4, 44, 3, 0.06)), flip: false,
    });
    const rAng = -0.45 + Math.sin(t * 3.1) * 0.1 * wob;
    ART.razorGold(x, px + 20, feet - 74, rAng, 1.7, 0);
    actor(x, S.six.SAMFLO, px - 66, feet + 4, 1.26, {
      ...idlePose(t, 1.2), flip: false, lean: 0.03,
    });
    // the reflection: impossible majestic hair blooms above the blade
    const [r0, r1] = CRATER_EV.reflection;
    const vision = seg(lt, r0, r0 + 0.35) * (1 - seg(lt, r1 - 0.2, r1 + 0.2));
    if (vision > 0.02) {
      const vx = px + 24, vy = feet - 100;
      x.save();
      x.globalCompositeOperation = 'lighter';
      ART.warmGlow(x, vx, vy + 10, 110, 0.5 * vision, '255,214,140');
      ART.warmGlow(x, vx, vy + 10, 46, 0.5 * vision, '255,244,214');
      x.restore();
      x.lineCap = 'round';
      for (let i = 0; i < 13; i++) {
        const a = -Math.PI / 2 + (i - 6) * 0.17 + Math.sin(t * 2.2 + i) * 0.09;
        const len = (44 + hash(i * 7) * 46) * vision;
        x.strokeStyle = i % 3 === 0 ? 'rgba(233,212,154,0.95)' : i % 3 === 1 ? 'rgba(217,142,60,0.9)' : 'rgba(137,60,59,0.85)';
        x.lineWidth = 2.8;
        x.beginPath();
        x.moveTo(vx, vy);
        x.quadraticCurveTo(vx + Math.cos(a) * len * 0.6 + Math.sin(t * 3 + i) * 6, vy + Math.sin(a) * len * 0.6, vx + Math.cos(a) * len, vy + Math.sin(a) * len * 1.15);
        x.stroke();
      }
      ART.sparkle(x, vx, vy - 16, 14, 0.9 * vision, t);
    }
    ART.darkness(x, 0.3, [
      { x: px, y: feet - 70, r: 130 },
      { x: 480, y: 400, r: 240, soft: 0.8 },
    ]);
    ART.fog(x, t, 150, 100, 27, 0.05);
  },

  // ---- 21 · the lunge (clock: hit-stop + tumble slow-mo) ----------------------------------------
  theLunge(x, lt, t) {
    const w = CRATER_CLOCK.warp(lt);
    const g = w.g;
    const [shx, shy] = shakeOf(t);
    x.save();
    x.translate(shx, shy);
    drawPlate(x, S.crater);
    ART.lavaBlobs(x, t, 320, 78, 14);
    ART.warmGlow(x, 480, 390, 240, 0.22, '255,130,40');
    // FLOWDO: braced at the rim; the snatch hurls him back, clearing the tumble arc
    const recoil = E.outCubic(seg(g, LUNGE_EV.grab, LUNGE_EV.grab + 0.45));
    const fpx = lerp(448, 358, recoil);
    const frot = -recoil * 0.3;
    const struggleK = seg(g, LUNGE_EV.struggle, LUNGE_EV.grab);
    // GOLBALD: anticipation crouch → leap → CONTACT (frozen) → grapple → snatch → over the edge
    const anticip = seg(g, 0, LUNGE_EV.lunge - 0.25);
    let gpx, gpy, gsx = 1.35, gsy = 1.35, grot = 0, gl = 0, galph = 1;
    if (g < LUNGE_EV.lunge) {
      gpx = lerp(296, 320, anticip);
      gpy = 430 + anticip * 6;
      gsy = 1.35 * (1 - anticip * 0.12); // the crouch
    } else if (w.stop) {
      // the frozen frame: mid-lunge, clawing for the razor arm; FLOWDO torn back, blade between
      gpx = 412; gpy = 418;
      gsy = 1.35 * 1.07; // stretch
      gl = 0.26;
      shockRing(x, 436, 398, w.sl, '255,190,120');
      ART.chips(x, [{ g: LUNGE_EV.lunge, x: 436, y: 402, seed: 87 }], g, '255,200,130', 10, 260);
    } else if (g < LUNGE_EV.grab) {
      gpx = 424 + Math.sin(g * 21) * 3;
      gpy = 420;
      grot = Math.sin(g * 19) * 0.07; // the grapple
    } else {
      // snatch: FLOWDO shoves him off → stagger right → arc over the melt (slow-mo) → splash.
      // The arc launches right of FLOWDO and stays there: ≥60px clearance, sword side.
      const shove = seg(g, LUNGE_EV.grab, LUNGE_EV.grab + 0.15);
      const tu = seg(g, LUNGE_EV.grab + 0.15, LUNGE_EV.splash + 0.3);
      if (tu <= 0) {
        gpx = lerp(424, 570, E.outCubic(shove));
        gpy = 426 - Math.sin(Math.PI * shove) * 9;
        grot = shove * 0.4;
      } else {
        const uu = Math.min(1, tu);
        gpx = qp(570, 616, 622, uu);
        gpy = qp(424, 236, 444, uu);
        grot = 1.1 + uu * 6.5;
      }
      galph = 1 - seg(g, LUNGE_EV.splash, LUNGE_EV.splash + 0.2);
      gsy = 1.3;
    }
    if (galph > 0) {
      actor(x, S.golbald, gpx, gpy, gsx, {
        ...idlePose(g, 2), flip: false, sy: gsy, rot: grot, alpha: galph,
        lean: gl + struggleK * 0.06,
        glow: '255,140,60', glowA: 0.1 + struggleK * 0.08,
      });
    }
    // FLOWDO: leaning back in the freeze (the blade torn between them), then hurled back
    const fpose = w.stop
      ? { ...idlePose(t, 2.4), flip: false, rot: -0.16, lean: -0.22, sy: 1.35 }
      : { ...idlePose(t, 1.5), flip: false, rot: frot, sy: 1.35 * (1 - recoil * 0.08), lean: recoil * 0.12 };
    actor(x, S.six.FLOWDO, w.stop ? 460 : fpx, 424, 1.35, fpose);
    // the razor: FLOWDO's → clawed at in the freeze → in GOLBALD's clutch → tumbling into the melt
    if (g < LUNGE_EV.grab) {
      if (w.stop) {
        ART.razorGold(x, 438, 388, -1.05, 1.7, 0); // torn loose between them
        ART.sparkle(x, 444, 380, 7, 0.8, t);
      } else {
        const rAng = -0.5 + struggleK * Math.sin(g * 17) * 0.3;
        ART.razorGold(x, lerp(fpx + 18, gpx + 14, struggleK), lerp(352, gpy - 66, struggleK), rAng, 1.7, 0);
      }
    } else if (g < LUNGE_EV.splash + 0.1) {
      const uu = Math.min(1, seg(g, LUNGE_EV.grab + 0.15, LUNGE_EV.splash));
      ART.razorGold(x, qp(570, 616, 620, uu) - 8, qp(424, 236, 444, uu) - 58, 2.2 + uu * 8, 1.7, 0);
    }
    // the splash: rings + a gold column, on the clock (flash rides the abs FLASHES table)
    if (g >= LUNGE_EV.splash) {
      const su = seg(g, LUNGE_EV.splash, LUNGE_EV.splash + 0.8);
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = `rgba(255,190,90,${(1 - su) * 0.8})`;
      x.lineWidth = 3;
      x.beginPath(); x.ellipse(612, 436, 12 + su * 90, (12 + su * 90) * 0.3, 0, 0, 7); x.stroke();
      x.fillStyle = `rgba(255,170,70,${(1 - su) * 0.7})`;
      for (let i = 0; i < 8; i++) {
        const bx2 = 600 + (hash(i * 3) - 0.5) * 60 * su;
        const by2 = 430 - (hash(i * 5) * 60 + 20) * su + 60 * su * su;
        x.beginPath(); x.arc(bx2, by2, 2.4 + hash(i) * 2, 0, 7); x.fill();
      }
      x.restore();
    }
    ART.darkness(x, 0.32, [
      { x: 430, y: 370, r: 160 },
      { x: 560, y: 410, r: 220, soft: 0.8 },
    ]);
    x.restore();
  },

  // ---- 22 · the Razor melts; ERUPTION -----------------------------------------------------------
  meltErupt(x, lt, t) {
    const g = lt; // 1×
    const [shx, shy] = shakeOf(t); // the erupt hit must visibly displace the frame
    x.save();
    x.translate(shx, shy);
    kb(x, 1.22, 520, 380);
    drawPlate(x, S.crater);
    x.restore();
    x.save();
    x.translate(shx, shy);
    ART.lavaBlobs(x, t, 330, 79, 20);
    // the One Razor goes back to the fire
    const meltK = seg(g, MELT_EV.melt, MELT_EV.melt + 1.2);
    if (meltK < 1) {
      const ry = lerp(402, 434, meltK);
      ART.razorGold(x, 560, ry, 0.5 + meltK * 0.6, 2.1, 0);
      x.save();
      x.globalCompositeOperation = 'lighter';
      ART.warmGlow(x, 560, ry, 60, 0.5 * (1 - meltK * 0.7), '255,220,140');
      x.restore();
      ART.chips(x, [{ g: MELT_EV.melt, x: 560, y: 410, seed: 55 }], g, '255,214,120', 8, 200);
    }
    // secondary bursts, then THE eruption
    for (const b of MELT_EV.bursts) ART.eruption(x, { g: b, x: 470 + (b - MELT_EV.bursts[0]) * 60, y: 424, seed: 61 + b * 10 }, g, 1.1);
    const eruptK = ART.eruption(x, { g: MELT_EV.erupt, x: 520, y: 424, seed: 77 }, g, 2.2);
    ART.warmGlow(x, 520, 420, 220 + 220 * (1 - eruptK), 0.3 + 0.25 * (1 - eruptK), '255,140,50');
    ART.lavaBlobs(x, t + 0.5, 330, 80, 14);
    ART.fog(x, t, 120, 120, 29, 0.05 + 0.06 * (1 - eruptK));
    // FLOWDO beat: recoiling at the frame edge, silhouetted against the melt, until the wash takes him
    if (g < 2.1) {
      const back = seg(g, 0.1, 1.3);
      const blast = seg(g, MELT_EV.erupt - 0.05, MELT_EV.erupt + 0.4);
      const alpha = 1 - seg(g, MELT_EV.erupt + 0.15, MELT_EV.erupt + 0.55);
      if (alpha > 0) {
        const px = lerp(198, 106, back) - blast * 30;
        const feet = 434;
        A.drawRemy(x, S.sil.FLOWDO, px, feet, { sx: 1.26, sy: 1.26, rot: -blast * 0.2, lean: -0.08 - blast * 0.14, alpha });
        ART.warmGlow(x, px + 36, feet - 92, 100, 0.32 * (0.8 + 0.2 * ART.flick(t, 3)), '255,160,70');
      }
    }
    // flung by the blast, tumbling toward the spire — cuts straight into the rescue strand
    if (g >= 2.3) {
      const fu = seg(g, 2.3, 2.98);
      A.drawRemy(x, S.sil.FLOWDO, qp(150, 400, 660, fu), qp(392, 208, 238, fu), { sx: 0.72, sy: 0.72, rot: fu * 9 });
    }
    x.restore();
  },

  // ---- 23 · the tower cracks; the Eye bursts ----------------------------------------------------
  towersFall(x, lt, t) {
    const [shx, shy] = shakeOf(t); // crumble + eyeBurst hits must displace the frame
    x.save();
    x.translate(shx, shy);
    drawPlate(x, S.tower);
    // the spire cracks
    const crumble = seg(lt, TOWERS_EV.crumble, TOWERS_EV.crumble + 0.5);
    if (crumble > 0) {
      x.save();
      x.strokeStyle = `rgba(255,140,70,${0.85 * crumble})`;
      x.lineWidth = 2.6;
      x.beginPath();
      let cx2 = 640, cy2 = 220;
      x.moveTo(cx2, cy2);
      for (let i = 0; i < 7; i++) {
        cx2 += (hash(i * 9 + 2) - 0.5) * 26; cy2 += 30 + hash(i * 7) * 12;
        x.lineTo(cx2, cy2);
      }
      x.stroke();
      x.fillStyle = '#050307';
      x.beginPath(); // the crown slab shears off
      x.moveTo(606, 236 - crumble * 26); x.lineTo(724, 230 - crumble * 30);
      x.lineTo(716, 250 - crumble * 20); x.lineTo(612, 252); x.closePath(); x.fill();
      x.restore();
      ART.chips(x, [{ g: TOWERS_EV.crumble, x: 662, y: 236, seed: 95 }], lt, '150,110,90', 12, 300);
      ART.puffs(x, { g: TOWERS_EV.crumble, x: 662, y: 250, seed: 96 }, lt, 1.2, '60,30,30', 6);
    }
    // THE EYE bursts into drifting hair
    const burst = seg(lt, TOWERS_EV.eyeBurst, TOWERS_EV.eyeBurst + 0.2);
    const eyeLeft = 1 - burst;
    if (eyeLeft > 0) {
      x.save();
      x.globalAlpha = eyeLeft;
      x.translate(662, 186);
      x.rotate(Math.sin(t * 1.1) * 0.08);
      const k = 104 * (1 + burst * 0.4);
      x.drawImage(S.eyeIcon, -k / 2, -k / 2, k, k);
      x.restore();
    }
    const flare = burst > 0 && burst < 1 ? 1 - burst : 0;
    ART.warmGlow(x, 662, 186, 90 + burst * 130, 0.4 * flare + 0.25, '255,220,150');
    if (lt >= TOWERS_EV.eyeBurst) {
      ART.hairConfetti(x, { g: TOWERS_EV.eyeBurst, x: 662, y: 190, seed: 21 }, lt, 40, 300, 220);
      ART.hairConfetti(x, { g: TOWERS_EV.confetti, x: 662, y: 170, seed: 22 }, lt, 24, 200, 180);
    }
    ART.fog(x, t, 340, 130, 31, 0.06);
    x.restore();
  },

  // ---- 24 · the reverse-baldify wave ------------------------------------------------------------
  hairify(x, lt, t) {
    const g = lt; // 1×
    drawPlate(x, S.hairLand);
    const front = lerp(-80, 1080, seg(g, HAIRIFY_EV.wavefront[0], HAIRIFY_EV.wavefront[1]));
    // the golden wavefront band
    if (front > -80 && front < 1080) {
      x.save();
      x.globalCompositeOperation = 'lighter';
      const g2 = x.createLinearGradient(front - 70, 0, front + 70, 0);
      g2.addColorStop(0, 'rgba(255,220,140,0)');
      g2.addColorStop(0.5, `rgba(255,226,150,${0.26 * Math.sin(Math.PI * clamp01((front + 80) / 1160))})`);
      g2.addColorStop(1, 'rgba(255,220,140,0)');
      x.fillStyle = g2;
      x.fillRect(front - 70, 0, 140, LH);
      x.restore();
    }
    // the line of Cabald, sprouting as the front passes
    for (let i = 0; i < 8; i++) {
      const px = 150 + i * 88;
      const feet = i % 2 ? 442 : 468;
      const s = i % 2 ? 1.5 : 1.72;
      const grow = seg(front, px - 6, px + 14);
      actor(x, S.horde[i], px, feet, s, { ...idlePose(t, 0.8), flip: false });
      if (grow > 0) {
        const h = (S.horde[i].bottom + 1 - S.horde[i].top) * s;
        ART.sprout(x, px, feet - h + 10, 6.4, grow, t, i * 3 + 1);
      }
    }
    for (const [b, i] of HAIRIFY_EV.bursts.map((b, j) => [b, j])) {
      const px = 150 + (i * 2) * 88 + 40;
      ART.hairConfetti(x, { g: b, x: px, y: 340 - (i % 2) * 20, seed: 30 + i }, g, 14, 130, 120);
    }
    ART.goldMotes(x, t, 30, 33);
  },

  // ---- 25 · the Great Eagle of the Flow ---------------------------------------------------------
  rescue(x, lt, t) {
    const [shx, shy] = shakeOf(t); // the grab hit
    x.save();
    x.translate(shx, shy);
    drawPlate(x, S.caldera);
    ART.lavaBlobs(x, t, 340, 81, 16);
    ART.warmGlow(x, 480, 400, 260, 0.2, '255,130,40');
    // FLOWDO lands on the spire — continuous with the eruption fling — then stands stranded.
    // Spire+hero sit left, inside the caption's word gap after "IS": title tail stays clear.
    const spire = { x: 508, y: 254 };
    const land = E.outCubic(seg(lt, 0.05, 0.45));
    let fdx = spire.x, fdy = spire.y - (1 - land) * 30, frot = 0.04, fdAlpha = 1;
    if (lt < 0.6) ART.puffs(x, { g: 0.4, x: spire.x, y: spire.y + 4, seed: 61 }, lt, 0.6, '120,70,50', 5);
    // the eagle's path: dive → grab → lift → exit; bird + cargo stay above the title band
    const diveU = seg(lt, RESCUE_EV.swoop, RESCUE_EV.grab);
    const liftU = seg(lt, RESCUE_EV.lift, RESCUE_EV.exit);
    let ex, ey, eflap;
    if (diveU <= 0) {
      ex = -140; ey = 60 + Math.sin(t) * 8; eflap = t * 3;
    } else if (liftU <= 0) {
      ex = qp(-140, 320, spire.x - 16, diveU);
      ey = qp(60, 104, 122, diveU);
      eflap = 3 + diveU * 9;
    } else {
      const u2 = clamp01(liftU);
      ex = qp(spire.x - 16, 800, 1180, u2);
      ey = qp(122, 64, 20, u2) - Math.sin(t * 2) * 4;
      eflap = 12 + u2 * 5;
      if (u2 >= 1) fdAlpha = 0; // both gone toward the Shear
    }
    const grabbed = lt >= RESCUE_EV.grab;
    // from the grab on, FLOWDO hangs in the talons
    if (grabbed && fdAlpha > 0) { fdx = ex + 2; fdy = ey + 56; frot = 0.12; }
    if (!grabbed) {
      actor(x, S.six.FLOWDO, fdx, fdy, 0.92, {
        ...idlePose(t, 1.8), flip: false, lean: 0.08 - (1 - land) * 0.1, rot: (1 - land) * 0.2,
      });
    }
    if (grabbed && fdAlpha > 0) {
      actor(x, S.six.FLOWDO, fdx, fdy, 0.92, { ...idlePose(t, 0.6), flip: false, rot: frot });
    }
    if (ex > -160 && ex < 1200) {
      ART.eagle(x, ex, ey, 2.2, eflap, t, S.eagleHead);
      if (grabbed) ART.sparkle(x, ex, ey + 30, 7, 0.5 * Math.exp(-(lt - RESCUE_EV.grab) * 2.5), t);
    }
    ART.darkness(x, 0.26, [
      { x: spire.x, y: spire.y - 40, r: 120 },
      { x: 480, y: 400, r: 260, soft: 0.85 },
      ...(ex > 0 && ex < 960 ? [{ x: ex, y: ey, r: 90 }] : []),
    ]);
    ART.fog(x, t, 140, 120, 35, 0.05);
    x.restore();
  },

  // ---- 26 · the Shear at golden hour; GRANDFLO returns ------------------------------------------
  shearReturn(x, lt, t) {
    drawPlate(x, S.shearDay);
    // laundry lines sway again
    for (const [lx, top] of [[300, 372], [700, 358]]) {
      x.strokeStyle = 'rgba(90,67,38,0.9)';
      x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(lx + 4, top + 4); x.quadraticCurveTo(lx + 88, top + 15, lx + 172, top + 12); x.stroke();
      for (let c = 0; c < 3; c++) {
        const u = 0.22 + c * 0.28;
        const cx2 = lerp(lx + 4, lx + 172, u);
        const cy2 = top + 6 + Math.sin(Math.PI * u) * 9 + Math.sin(t * 1.8 + u * 5) * 3;
        ART.comb(x, cx2, cy2, 15, '#5a4326', '#8a744c');
      }
    }
    ART.windStreaks(x, t, 1.1, 160, 440, 16);
    ART.goldMotes(x, t, 40, 37);
    // the fellowship, hair in the wind
    const roster = [
      { role: 'GRANDFLO', px: 480, feet: 456, s: 1.5 },
      { role: 'FLOWDO', px: 388, feet: 462, s: 1.44 },
      { role: 'SAMFLO', px: 574, feet: 464, s: 1.4 },
      { role: 'ARCHER', px: 312, feet: 452, s: 1.4 },
      { role: 'AXE', px: 650, feet: 452, s: 1.38 },
      { role: 'WARRIOR', px: 722, feet: 460, s: 1.42 },
    ];
    roster.sort((a, b) => a.feet - b.feet);
    for (const r of roster) {
      if (r.role !== 'GRANDFLO') {
        actor(x, S.six[r.role], r.px, r.feet, r.s, { ...idlePose(t, 1.4), flip: false, lean: -0.02 });
        continue;
      }
      // THE RETURN: hop-and-turn, the staff sweeps overhead, and the white light bursts
      const ret = lt >= RETURN_EV.grandfloReturn;
      const glowK = ret ? seg(lt, RETURN_EV.grandfloReturn, RETURN_EV.grandfloReturn + 0.6) : 0;
      const burst = ret ? Math.exp(-(lt - RETURN_EV.grandfloReturn) * 2.1) : 0;
      const hop = ret ? Math.sin(Math.PI * seg(lt, RETURN_EV.grandfloReturn, RETURN_EV.grandfloReturn + 0.55)) : 0;
      const raise = E.outBack(seg(lt, RETURN_EV.grandfloReturn, RETURN_EV.grandfloReturn + 0.65));
      const feet = r.feet - hop * 9;
      if (burst > 0.03) {
        // radial white light + an expanding ring + a breath of in-scene flash
        ART.warmGlow(x, r.px, feet - 110, 70 + 150 * (1 - burst), 0.5 * burst, '255,250,235');
        x.save();
        x.strokeStyle = `rgba(255,250,235,${0.5 * burst})`;
        x.lineWidth = 2.4;
        x.beginPath();
        x.ellipse(r.px, feet - 80, 24 + (1 - burst) * 210, (24 + (1 - burst) * 210) * 0.55, 0, 0, 7);
        x.stroke();
        x.restore();
        x.fillStyle = `rgba(255,250,238,${0.2 * burst})`;
        x.fillRect(0, 0, LW, LH);
      }
      if (glowK > 0) {
        A.drawRemy(x, S.six.GRANDFLO, r.px, feet, { sx: r.s, sy: r.s * (1 - hop * 0.05), white: true, alpha: 0.35 * glowK });
      }
      actor(x, S.six.GRANDFLO, r.px, feet, r.s, {
        ...idlePose(t, 1.4), flip: hop > 0.35, lean: -0.02,
        sy: r.s * (1 - hop * 0.05),
        glow: '#fff8e0', glowA: 0.45 * glowK,
      });
      // the staff sweeps up overhead and holds, blazing
      ART.staff(x, r.px + 14, feet - 62, lerp(2.85, -0.5, raise), 46,
        (0.45 + 0.55 * raise) * (0.85 + 0.15 * Math.sin(t * 7)), t);
    }
    // golden hour sun, right side
    ART.warmGlow(x, 820, 200, 260, 0.26, '255,190,110');
    ART.fog(x, t, 300, 150, 39, 0.05);
  },

  // ---- 27 · the embrace -------------------------------------------------------------------------
  embrace(x, lt, t) {
    kb(x, 1.42, 300, 420);
    drawPlate(x, S.shearDay);
    x.restore();
    const app = E.inOutCubic(seg(lt, EMBRACE_EV.approach, EMBRACE_EV.embrace));
    const hold = seg(lt, EMBRACE_EV.embrace, EMBRACE_EV.embrace + 0.4);
    const fdx = lerp(226, 278, app), sdx = lerp(376, 326, app);
    const feet = 464;
    actor(x, S.six.FLOWDO, fdx, feet, 1.6, {
      ...idlePose(t, 1.2), flip: true, rot: hold * 0.06, sy: 1.6 * (1 - hold * 0.05), lean: hold * 0.08,
    });
    actor(x, S.six.SAMFLO, sdx, feet - 2, 1.52, {
      ...idlePose(t, 1.2), flip: false, rot: -hold * 0.06, sy: 1.52 * (1 - hold * 0.05), lean: -hold * 0.08,
    });
    ART.goldMotes(x, t, 36, 41);
    ART.warmGlow(x, 300, 400, 160, 0.16 + hold * 0.1, '255,200,120');
    ART.fog(x, t, 330, 120, 43, 0.04);
  },

  // ---- 28 · end cards ---------------------------------------------------------------------------
  endCards(x, lt, t, ov) {
    const z = 1.02 + 0.015 * Math.sin(lt * 0.3);
    kb(x, z, 480, 280);
    drawPlate(x, S.endPlate);
    x.restore();
    ART.goldMotes(x, t, 30, 47);
    ART.fog(x, t, 330, 140, 47, 0.04);
    // the tiny sequel type under the gag caption (overlay, inside the 2.39 band)
    const seq = seg(t, T.endCards + END_EV.sequel, T.endCards + END_EV.sequel + 0.8);
    if (seq > 0) {
      txt(ov, COPY.endCards.sequel, 960, 882, {
        size: 24, font: F.serif, weight: 500, color: '#b9a97f', align: 'center', track: 3,
        alpha: seq * (1 - seg(t, 88.4, 89.2)),
      });
    }
  },
};

// =================================================================================================
// PER-SHOT POST (letterbox 1 applied by the wrapper)
// =================================================================================================
const FX = {
  mistTitle: () => ({ vignette: 1.1, grain: 0.035, sat: 0.7, tint: [0.94, 0.98, 1.06], bloom: 0.1, bloomThresh: 0.85 }),
  forgePlate: () => ({ vignette: 1.25, grain: 0.045, sat: 0.7, warm: 0.1, exposure: -0.05, bloom: 0.12, bloomThresh: 0.8 }),
  hordePlate: (lt) => ({ vignette: 1.15, grain: 0.04, sat: lerp(0.75, 0.55, seg(lt, 0.5, 1.5)), tint: [0.94, 0.94, 1.04], haze: 0.05, hazeColor: [0.3, 0.24, 0.3] }),
  fallPlate: (lt) => ({
    vignette: 1.12, grain: 0.04,
    sat: lerp(1.02, 0.42, seg(lt, BANNERS_EV.ashTint - 0.5, BANNERS_EV.ashTint + 1.2)),
    exposure: lerp(0, -0.07, seg(lt, BANNERS_EV.ashTint, 4.2)),
    tint: [0.95, 0.97, 1.05],
    bloom: 0.1, bloomThresh: 0.85,
  }),
  shearDay: () => ({ vignette: 0.85, grain: 0.03, sat: 1.12, warm: 0.08, bloom: 0.12, bloomThresh: 0.9, rays: 0.05, lightX: 0.13, lightY: 0.24 }),
  shearNight: () => ({ vignette: 1.18, grain: 0.04, sat: 0.62, tint: [0.9, 0.95, 1.1], bloom: 0.1, bloomThresh: 0.82, exposure: -0.03 }),
  assembly: () => ({ vignette: 0.85, grain: 0.03, sat: 1.06, warm: 0.04, bloom: 0.12, bloomThresh: 0.9 }),
  ridgeWalk: () => ({ vignette: 1.0, grain: 0.035, sat: 1.02, warm: 0.1, bloom: 0.14, bloomThresh: 0.85, rays: 0.06, lightX: 0.62, lightY: 0.6, haze: 0.05, hazeColor: [0.9, 0.5, 0.3] }),
  wraithRidge: (lt) => ({
    vignette: 1.18, grain: 0.045,
    sat: lerp(0.9, 0.5, seg(lt, 0.5, 3)),
    exposure: lerp(0, -0.1, seg(lt, 1, 4)),
    tint: [0.92, 0.92, 1.04], bloom: 0.1, bloomThresh: 0.8,
  }),
  minesEnter: () => ({ vignette: 1.28, grain: 0.045, sat: 0.6, tint: [1.04, 0.98, 0.92], exposure: -0.05, bloom: 0.1, bloomThresh: 0.8 }),
  minesHall: () => ({ vignette: 1.3, grain: 0.05, sat: 0.55, tint: [1.08, 0.98, 0.9], exposure: -0.06, bloom: 0.1, bloomThresh: 0.78 }),
  balrogRise: (lt) => ({
    vignette: 1.25, grain: 0.05, sat: 0.85, warm: 0.12,
    exposure: lerp(-0.04, -0.1, seg(lt, BALROG_EV.rise, BALROG_EV.eclipse)),
    bloom: 0.14, bloomThresh: 0.75, streak: 0.06,
  }),
  bridgeStand: (lt) => {
    const w = BRIDGE_CLOCK.warp(lt);
    return { vignette: 1.25, grain: 0.045, sat: 0.7, warm: 0.06, bloom: 0.12, bloomThresh: 0.78, aber: w.stop ? 0.0012 : 0 };
  },
  theFall: () => ({ vignette: 1.28, grain: 0.045, sat: 0.65, warm: 0.05, bloom: 0.12, bloomThresh: 0.75, streak: 0.06 }),
  escapeGrief: () => ({ vignette: 1.3, grain: 0.05, sat: 0.4, tint: [0.9, 0.94, 1.08], exposure: -0.08, bloom: 0.08, bloomThresh: 0.82 }),
  ashlands: () => ({ vignette: 1.2, grain: 0.05, sat: 0.35, tint: [0.96, 0.96, 1.0], exposure: -0.04, haze: 0.06, hazeColor: [0.4, 0.38, 0.36] }),
  golbaldRock: () => ({ vignette: 1.22, grain: 0.045, sat: 0.42, tint: [0.95, 0.95, 1.0], exposure: -0.04 }),
  eyeTower: () => ({ vignette: 1.25, grain: 0.045, sat: 0.75, tint: [1.12, 0.9, 0.88], bloom: 0.12, bloomThresh: 0.75, exposure: -0.04 }),
  domeClimb: () => ({ vignette: 1.25, grain: 0.05, sat: 0.62, warm: 0.06, exposure: -0.04, bloom: 0.12, bloomThresh: 0.78 }),
  craterEdge: () => ({ vignette: 1.15, grain: 0.045, sat: 0.92, warm: 0.1, bloom: 0.14, bloomThresh: 0.8 }),
  theLunge: (lt) => {
    const w = CRATER_CLOCK.warp(lt);
    return { vignette: 1.18, grain: 0.045, sat: 0.95, warm: 0.12, bloom: 0.14, bloomThresh: 0.75, aber: w.stop ? 0.0014 : 0 };
  },
  meltErupt: (lt) => ({
    vignette: 1.1, grain: 0.05, sat: 1.0, warm: 0.14,
    exposure: lerp(0, 0.12, seg(lt, MELT_EV.erupt - 0.2, MELT_EV.erupt + 0.5)),
    bloom: 0.14, bloomThresh: 0.7, streak: 0.08,
  }),
  towersFall: (lt) => ({
    vignette: 1.15, grain: 0.045, sat: lerp(0.8, 1.0, seg(lt, TOWERS_EV.eyeBurst, 1.0)),
    warm: lerp(0.08, 0.14, seg(lt, TOWERS_EV.eyeBurst, 1.0)), bloom: 0.14, bloomThresh: 0.72,
  }),
  hairify: (lt) => ({
    vignette: 0.9, grain: 0.035,
    sat: lerp(0.7, 1.12, seg(lt, HAIRIFY_EV.wavefront[0], HAIRIFY_EV.wavefront[1])),
    warm: lerp(0.04, 0.14, seg(lt, 0, 1.4)), bloom: 0.12, bloomThresh: 0.85,
  }),
  rescue: (lt) => ({ vignette: 1.0, grain: 0.04, sat: lerp(0.9, 1.05, seg(lt, RESCUE_EV.lift, 4)), warm: 0.1, bloom: 0.13, bloomThresh: 0.78, streak: 0.06 }),
  shearReturn: () => ({ vignette: 0.85, grain: 0.03, sat: 1.12, warm: 0.16, bloom: 0.13, bloomThresh: 0.88, rays: 0.06, lightX: 0.85, lightY: 0.35, haze: 0.06, hazeColor: [0.9, 0.7, 0.4] }),
  embrace: () => ({ vignette: 0.9, grain: 0.03, sat: 1.1, warm: 0.14, bloom: 0.12, bloomThresh: 0.88, haze: 0.05, hazeColor: [0.9, 0.7, 0.4] }),
  endCards: (lt, t) => ({
    vignette: 0.8, grain: 0.03, sat: 1.08, warm: 0.12, bloom: 0.12, bloomThresh: 0.9,
    rays: 0.05, lightX: 0.5, lightY: 0.14,
    fade: seg(t, T.endCards + END_EV.fade[0], T.endCards + END_EV.fade[1]),
  }),
};

// =================================================================================================
// PREPARE + FILM
// =================================================================================================
async function prepare() {
  S.low = A.canvas(LW, LH);
  // rigs
  S.six = {};
  for (const [role, id] of Object.entries({ FLOWDO: CAST.FLOWDO, GRANDFLO: CAST.GRANDFLO, SAMFLO: CAST.SAMFLO, ARCHER: CAST.ARCHER, AXE: CAST.AXE, WARRIOR: CAST.WARRIOR })) {
    S.six[role] = await A.loadRemy(id, false);
  }
  S.golbald = await A.loadRemy(CAST.GOLBALD, false);
  S.horde = [];
  for (const id of CAST.HORDE) S.horde.push(await A.loadRemy(id, true));
  // ridge silhouettes: dark warm figures against the sunset
  S.sil = {};
  for (const role of Object.keys(S.six)) S.sil[role] = { ...S.six[role], c: ART.silhouette(S.six[role], '#171019') };
  // heads
  S.heads = await A.loadHeads();
  S.eyeIcon = A.headIcon(S.heads, CAST.EYE, 12);
  S.eagleHead = A.headIcon(S.heads, CAST.EAGLE_HEAD, 9);
  // sets
  S.mist = ART.bakeMist();
  S.forge = ART.bakeForge();
  S.plain = ART.bakeHordePlain();
  S.kingdom = ART.bakeKingdom();
  S.shearDay = ART.bakeShearDay();
  S.shearNight = ART.bakeShearNight();
  S.assembly = ART.bakeAssembly();
  S.ridgeSky = ART.bakeRidgeSky();
  S.ridgeFar = ART.bakeRidgeFar();
  S.ridgeNear = ART.bakeRidgeNear();
  S.ridgeCrest = ART.bakeRidgeCrest();
  S.gate = ART.bakeMinesGate();
  S.hall = ART.bakeMinesHall();
  S.chasm = ART.bakeChasm();
  S.bridge = ART.bakeBridge();
  S.ash = ART.bakeAshlands();
  S.spur = ART.bakeGolbaldRock();
  S.tower = ART.bakeEyeTower();
  S.dome = ART.bakeDome();
  S.crater = ART.bakeCrater();
  S.caldera = ART.bakeRescue();
  S.hairLand = ART.bakeHairify();
  S.endPlate = ART.bakeEndPlate();
}

export default {
  title: 'THE LORD OF THE FLOW — a Remy Boys epic',
  output: 'lord-of-the-flow.mp4',
  duration: DURATION,
  prepare,
  shots: SHOTS.map((s) => ({
    name: s.name,
    t0: s.t0,
    t1: s.t1,
    draw: (ctx, lt, dur, t, ov) => {
      const x = beginLow();
      DRAWS[s.name](x, lt, t, ov);
      blit(ctx);
    },
    fx: (lt, t) => ({ letterbox: 1, ...(FX[s.name] ? FX[s.name](lt, t) : {}) }),
  })),
  captions: CAPTIONS,
  captionStyles: CAPTION_STYLES,
  flashes: FLASHES,
  score,
  audio: { seed: 424242, reverb: 1.15, reverbGain: 0.22 },
  grid: { bar: 1.5 },
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
};
