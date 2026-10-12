// B.T. THE EXTRA-BALDESTRAL — a Remy Boys picture (E.T. parody).
// 92 s, 1080p via a 960×540 pixel stage (2× nearest). Night-indigo suburbs, one harvest moon,
// one stranded bald alien, two Cabald goons and a bicycle that learns to fly.
import { W, H, seg, E, hash } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js';
import * as ART from './art.js';
import {
  DURATION, LW, LH, T, CAST, PAL, BT_SKIN, BT_SHIRT, FLASHES,
  SHED_EV, SHED_CLOCK, BOND_EV, BOND_CLOCK, TITLE_EV, STREET_EV, PURSUIT_EV, PURSUIT_CLOCK,
  FLIGHT_EV, SHIP_EV, SHIP_CLOCK,
} from './timeline.js';
import { score } from './score.js';

const S = {};
const low = () => S.low.getContext('2d');
const beginLow = () => {
  const x = low();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#04060e';
  x.fillRect(-80, -60, LW + 160, LH + 120);
  return x;
};
const blit = (ctx) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
};
const clampX = (v, a, b) => Math.max(a, Math.min(b, v));

// Bike + riders. (bx, by) rear axle. o: { flip, scale, dark, boyStride, btSheet, sheetT, flap, glow, lean, spin }
function riders(x, bx, by, o = {}) {
  const s = o.scale ?? 1, dir = o.flip ? -1 : 1, dark = o.dark;
  const boy = dark ? S.boyDark : S.boy, bt = dark ? S.btDark : S.bt;
  ART.bike(x, bx, by, o.spin ?? 0, { s, flip: o.flip, lean: o.lean ?? 0, dark: dark ? '#0a0e18' : '#10141f', lite: dark ? '#232c40' : '#3c465c', frame: dark ? '#0a0e18' : '#b8482e', glow: o.glow ?? 0 });
  if (!dark && !o.noShadow) ART.shadow(x, bx + dir * 2, by + 12, 34 * s, 0.3);
  const st = o.boyStride ?? 0;
  A.drawRemy(x, boy, bx + dir * 10, by - 5, {
    flip: o.flip, sx: 1.26 * s, sy: 1.26 * s, lean: dir * 0.05,
    stride: [st, -st], lift: [Math.max(0, st) * 0.4, Math.max(0, -st) * 0.4],
  });
  A.drawRemy(x, bt, bx - dir * 27, by - 3, { flip: o.flip, sx: 1.02 * s, sy: 1.02 * s, lean: -dir * 0.04 });
  if (o.btSheet) {
    const hx = bx - dir * 27, hy = by - 3 - 110 * s; // measured head top: 108 sprite-px above feet
    x.save();
    x.translate(hx, hy);
    x.rotate(Math.sin((o.sheetT ?? 0) * 9) * 0.07 * (o.flap ?? 1));
    x.drawImage(S.sheet, -22 * s, -6 * s, 44 * s, 96 * s); // costume: dome + drape to the pegs
    x.restore();
    if (o.glow > 0.02) ART.fingerGlow(x, hx, hy + 22 * s, o.sheetT ?? 0, 0.55 * o.glow);
  }
}

// Speed streaks behind a racing bike (drawn on the low stage).
function speedStreaks(x, cx, cy, n, seed) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const l = 30 + hash(seed + i * 7) * 90;
    const yy = cy - 60 + hash(seed + i * 5) * 130;
    x.strokeStyle = `rgba(150,180,230,${0.1 + hash(seed + i) * 0.12})`;
    x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(cx - hash(seed + i * 3) * 260, yy); x.lineTo(cx - hash(seed + i * 3) * 260 + l, yy); x.stroke();
  }
  x.restore();
}

async function prepare() {
  const alienMap = [[PAL.BT.skin, BT_SKIN], [PAL.BT.shirt, BT_SHIRT]];
  S.boy = await A.loadRemy(CAST.BOY, false);
  S.bt = ART.alienify(await A.loadRemy(CAST.BT, false), alienMap);
  S.agA = await A.loadRemy(CAST.AG_A, false);
  S.agB = await A.loadRemy(CAST.AG_B, false);
  S.mum = await A.loadRemy(CAST.MUM, false);
  S.boyDark = ART.darkRig(S.boy, '#080b14');
  S.btDark = ART.darkRig(S.bt, '#080b14');
  S.agADark = ART.darkRig(S.agA, '#0a0d16');
  S.agBDark = ART.darkRig(S.agB, '#0a0d16');
  S.mumDark = ART.darkRig(S.mum, '#05070d');
  S.t1 = await A.loadRemy(CAST.T1, true);
  S.btFar = ART.alienify(await A.loadRemy(CAST.BT, true), alienMap);
  const heads = await A.loadHeads();
  // B.T.'s face for close-ups: cropped from the alienified near-sprite so style + palette match the rig
  const fc = A.canvas(S.bt.w, 46);
  fc.getContext('2d').drawImage(S.bt.c, 0, S.bt.top, S.bt.w, 46, 0, 0, S.bt.w, 46);
  S.btFace = fc;
  S.boyHead = A.headIcon(heads, CAST.BOY, 4);
  S.sky = ART.bakeNightSky(LW + 160, 470);
  S.moon = ART.bakeMoon(230);
  S.moonSmall = ART.bakeMoon(64);
  S.houses = ART.bakeHouses(1700);
  S.shedExt = ART.bakeShedExt();
  S.shedInt = ART.bakeShedInt();
  S.bedroom = ART.bakeBedroom();
  S.forest1 = ART.bakeForestLayer(1400, 300, 5, '#0e1526', 26, 300);
  S.forest2 = ART.bakeForestLayer(1400, 240, 6, '#0a0f1e', 22, 240);
  S.forest3 = ART.bakeForestLayer(1400, 180, 7, '#060a14', 18, 170);
  S.ravine = ART.bakeRavine();
  S.ship = ART.bakeShip();
  S.van = ART.bakeVan();
  S.wig = ART.bakeWigMop();
  S.candy = ART.bakeCandy();
  S.candy2 = ART.bakeCandy('#4c86d8', '#8c6cd8');
  S.sheet = ART.bakeSheet();
  S.bowl = ART.bakeFishBowl();
  S.low = A.canvas(LW, LH);
}

const fxNight = (extra = {}) => () => ({
  letterbox: 0.8, vignette: 0.85, grain: 0.045, bloom: 0.075, bloomThresh: 0.85,
  sat: 0.9, tint: [0.92, 0.99, 1.09], contrast: 1.04, ...extra,
});

export default {
  title: 'B.T. THE EXTRA-BALDESTRAL',
  output: 'extra-baldestral.mp4',
  duration: DURATION,
  prepare,
  flashes: FLASHES,
  shots: [
    // ---- S1 STREAK — the night the sky coughed -------------------------------
    {
      name: 'streak', t0: T.streak, t1: T.shed,
      draw(ctx, lt) {
        const x = beginLow();
        const push = 1 + 0.03 * E.inQuad(lt / 8);
        const cam = 26 * lt + 110 * E.inOutCubic(seg(lt, 0.8, 3.2)) - 70 * E.outCubic(seg(lt, 3.2, 4.0));
        x.save();
        x.translate(LW / 2, LH / 2); x.scale(push, push); x.translate(-LW / 2, -LH / 2);
        x.drawImage(S.sky, -40 - cam * 0.12, -30);
        ART.starTwinkle(x, lt, LW + 160, 470, 7, 1);
        x.drawImage(S.houses, -60 - cam, 96);
        for (const [px, sd] of [[120, 1], [560, 2], [1090, 3]]) ART.pumpkin(x, px - cam, 452, lt, sd, 1.1);
        // the dying porch light (gag paid at the thud)
        const thud = 6.5, dead = lt >= thud;
        const flickK = dead ? 0 : ART.flick(lt, 5, 21) * (1 - seg(lt, thud - 0.5, thud) * 0.6);
        if (flickK > 0.02) {
          ART.warmGlow(x, 806 - cam, 436, 46, 0.34 * flickK, '255,196,110');
          x.fillStyle = `rgba(255,214,140,${0.8 * flickK})`; x.fillRect(803 - cam, 428, 6, 7);
        }
        if (lt >= thud) { // thud behind the treeline
          const k = Math.exp(-(lt - thud) / 0.16);
          if (k > 0.02) ART.warmGlow(x, 200 - cam * 0.3, 200, 130, 0.34 * k, '255,190,110');
        }
        ART.ufoStreak(x, lt, 0.8, 3.2);
        x.restore();
        blit(ctx);
      },
      fx: fxNight(),
    },

    // ---- S2 THE SHED — flashlight, clutter, eyes --------------------------------
    {
      name: 'shed', t0: T.shed, t1: T.bond,
      draw(ctx, lt) {
        const { g, stop, sl } = SHED_CLOCK.warp(lt);
        const x = beginLow();
        if (g < SHED_EV.pov) {
          // exterior: the boy crosses the yard to the shed
          const k = 1 + 0.22 * E.inOutCubic(seg(g, SHED_EV.walk, SHED_EV.walkEnd));
          x.save();
          x.translate(LW / 2, LH / 2); x.scale(k, k); x.translate(-LW / 2, -LH / 2);
          x.drawImage(S.shedExt, -ART.OVER, -ART.OVER);
          const bx = 60 + E.outCubic(seg(g, SHED_EV.walk, SHED_EV.walkEnd)) * 200;
          ART.cone(x, bx + 16, 380, -0.45 + Math.sin(g * 1.9) * 0.1, 240, 26, lt, '255,226,150', 0.14);
          ART.shadow(x, bx, 440, 26, 0.34);
          A.drawRemy(x, S.boy, bx, 438, { sx: 1.5, sy: 1.5, lean: 0.05, stride: [Math.sin(g * 7) * 2, -Math.sin(g * 7) * 2] });
          x.restore();
        } else if (g < SHED_EV.raise - 0.2) {
          // interior POV: the cone rakes the clutter, locks on the huddled shape
          x.drawImage(S.shedInt, -ART.OVER, -ART.OVER);
          const sw = E.inOutCubic(seg(g, SHED_EV.pov, SHED_EV.coneLock));
          const ang = -1.3 + sw * 0.555 + (hash(Math.floor(lt * 7)) - 0.5) * 0.03; // sweeps onto the shape at (600,436)
          ART.cone(x, 470, 520, ang, 300, 34, lt, '232,238,248', 0.16);
          if (g > SHED_EV.coneLock - 0.25) { // the shape, rim-lit
            const k = seg(g, SHED_EV.coneLock - 0.25, SHED_EV.coneLock);
            A.drawRemy(x, S.bt, 600, 436, { flip: true, sx: 0.88, sy: 0.88, lean: 0.3, glow: '#9fe8d8', glowA: 0.22 * k });
            ART.darknessLite(x, 0.42, [{ x: 600, y: 380, r: 130 }]);
          }
        } else {
          // reverse: B.T. foreground silhouette, boy by the torch
          x.drawImage(S.shedInt, -ART.OVER, -ART.OVER);
          const drop = seg(g, SHED_EV.drop, SHED_EV.drop + 0.5);
          const back = E.outCubic(seg(g, SHED_EV.drop, SHED_EV.drop + 0.6));
          if (drop <= 0) {
            ART.cone(x, 338, 382, 0.3 + Math.sin(lt * 1.4) * 0.06, 230, 30, lt, '255,226,150', 0.15);
          } else {
            // the torch hits the floor and its beam spins down
            const fall = E.outQuad(Math.min(1, drop * 1.8));
            const tx = 338 + E.outCubic(Math.min(1, drop)) * 66, ty = 382 + fall * 58;
            const wob = Math.max(0, 1 - drop) * 1.4 + 0.12;
            ART.cone(x, tx, ty, -1.9 + Math.sin(lt * 9) * wob, 170, 22, lt, '255,226,150', 0.16 * (1 - drop * 0.35));
            x.fillStyle = '#c9b48a'; x.fillRect(tx - 3, ty - 3, 8, 6);
            ART.warmGlow(x, tx, ty, 110, 0.18);
          }
          ART.shadow(x, 300 - back * 28, 442, 26, 0.42);
          A.drawRemy(x, S.boy, 300 - back * 28, 440, { flip: true, sx: 1.55, sy: 1.55, lean: -0.08 });
          const rk = E.outCubic(seg(g, SHED_EV.raise, SHED_EV.reveal));
          const syNow = 2.5 * (0.86 + 0.14 * rk), lean = 0.24 - 0.19 * rk;
          A.drawRemy(x, S.bt, 705, 486, { sx: syNow, sy: syNow, lean, flip: true, alpha: 0.97, white: !!(stop && sl < 0.06) });
          ART.eyeGlints(x, 698, 486 - syNow * 95, seg(g, SHED_EV.reveal - 0.05, SHED_EV.reveal + 0.4), lt);
          ART.darknessLite(x, 0.24, [{ x: 705, y: 360, r: 170, soft: 0.95 }]);
        }
        ART.iris(x, 1 - seg(lt, SHED_EV.iris, SHED_EV.iris + 0.4), 600, 420, 660);
        blit(ctx);
      },
      fx: fxNight({ vignette: 0.95 }),
    },

    // ---- S3 BONDING — wig, candy, healing, the near-miss ------------------------
    {
      name: 'bond', t0: T.bond, t1: T.title,
      draw(ctx, lt) {
        const { g, stop, sl } = BOND_CLOCK.warp(lt);
        const x = beginLow();
        const white = stop && sl < 0.05;
        if (g < BOND_EV.wigCU || g >= BOND_EV.wide2) {
          // ---- bedroom wide
          x.drawImage(S.bedroom, -ART.OVER, -ART.OVER);
          x.drawImage(S.sky, 0, 0, 172, 150, 388, 96, 172, 150); // night sky in the window
          x.save(); x.translate(388, 96); ART.starTwinkle(x, lt, 172, 150, 11, 0.8); x.restore();
          // fishbowl on the dresser (from scene start) + bubble
          x.drawImage(S.bowl, 806, 322);
          const by = 346 - ((lt * 9) % 26);
          x.fillStyle = `rgba(200,226,248,${Math.max(0, 0.55 - by * 0.014)})`;
          x.beginPath(); x.arc(816, by, 1.6, 0, 7); x.fill();
          const doorA = seg(g, BOND_EV.doorCrack, BOND_EV.doorCrack + 0.5) * (1 - seg(g, BOND_EV.doorClose, BOND_EV.doorClose + 0.3));
          if (doorA > 0.01) {
            x.fillStyle = `rgba(255,220,160,${0.5 * doorA})`; x.fillRect(-14, 168, 78, 282);
            ART.warmGlow(x, 30, 300, 150, 0.2 * doorA);
            x.save(); x.globalAlpha = doorA;
            A.drawRemy(x, S.mumDark, 26, 448, { sx: 1.62, sy: 1.62 });
            x.fillStyle = '#b478a4'; // curlers
            for (const [cx2, cy2] of [[14, 268], [26, 264], [38, 268]]) x.fillRect(cx2, cy2, 7, 5);
            x.restore();
          }
          // lamp on the nightstand — B.T.'s new religion
          x.fillStyle = '#2a2038'; x.fillRect(344, 330, 6, 16);
          x.fillStyle = '#e8c476';
          x.beginPath(); x.moveTo(336, 316); x.lineTo(358, 316); x.lineTo(354, 330); x.lineTo(340, 330); x.closePath(); x.fill();
          ART.warmGlow(x, 348, 322, 92, 0.3);
          if (g < BOND_EV.wigCU) {
            const pat = (t0) => Math.exp(-((g - t0) ** 2) / 0.02);
            const pk = Math.max(pat(BOND_EV.pat1), pat(BOND_EV.pat2));
            ART.shadow(x, 402, 446, 24, 0.3);
            A.drawRemy(x, S.bt, 402, 444, { flip: true, sx: 1.28, sy: 1.28, lean: 0.16 + 0.22 * pk });
            ART.shadow(x, 560, 446, 26, 0.3);
            A.drawRemy(x, S.boy, 560, 444, { sx: 1.42, sy: 1.42, lean: -0.04 });
          } else {
            const pointK = seg(g, BOND_EV.pointFish, BOND_EV.pointFish + 0.6);
            ART.shadow(x, 470, 446, 26, 0.3);
            A.drawRemy(x, S.boy, 470, 444, { sx: 1.42, sy: 1.42, lean: -0.18 * pointK });
            if (doorA > 0.2) ART.pointArm(x, 462, 360, Math.PI + 0.42, 84, PAL.BOY.shirt, PAL.BOY.skin); // points at mum
            else if (pointK > 0.05) ART.pointArm(x, 462, 360, -0.5, 96 * pointK, PAL.BOY.shirt, PAL.BOY.skin); // points at the fishbowl
            // B.T. dives under the blanket at hideHop
            const hk = E.outCubic(seg(g, BOND_EV.hideHop, BOND_EV.hideHop + 0.36));
            if (hk <= 0) {
              ART.shadow(x, 360, 446, 22, 0.28);
              A.drawRemy(x, S.bt, 360, 444, { flip: true, sx: 1.28, sy: 1.28 });
            } else {
              const btx = 360 - hk * 110, bty = 444 - Math.sin(hk * Math.PI) * 26;
              A.drawRemy(x, S.bt, btx, bty, { flip: true, sx: 1.28, sy: 1.28 - 0.5 * hk, alpha: 1 - 0.25 * hk });
              if (hk >= 0.99) { // blanket lump + two feet sticking out
                x.fillStyle = '#5c3e5e';
                x.beginPath(); x.ellipse(250, 396, 64, 26, 0, Math.PI, 0); x.fill();
                x.fillRect(186, 396, 128, 16);
                x.fillStyle = '#6e4c6e'; x.fillRect(186, 396, 128, 5);
                x.fillStyle = PAL.BT.skin; x.fillRect(226, 408, 8, 4); x.fillRect(262, 408, 8, 4);
              }
            }
          }
          if (white) { x.fillStyle = 'rgba(240,248,255,0.14)'; x.fillRect(0, 0, LW, LH); }
        } else if (g < BOND_EV.candyCU) {
          // ---- WIG close-up: THE HAIR HAT (face cropped from the rig itself)
          x.drawImage(S.bedroom, 340, 190, 360, 300, -60, -40, 1080, 900);
          x.fillStyle = 'rgba(4,6,14,0.42)'; x.fillRect(-60, -40, 1080, 900);
          const bob = Math.sin(seg(g, BOND_EV.wigBob, BOND_EV.wigBob + 0.8) * Math.PI) * 0.14;
          x.save();
          x.translate(480, 330); x.rotate(bob);
          x.drawImage(S.btFace, -250, -110, 500, 302); // 76×46 crop scaled ~6.6×
          x.drawImage(S.wig, -116, -128, 232, 127);
          x.restore();
          ART.warmGlow(x, 580, 260, 210, 0.12);
        } else if (g < BOND_EV.kneeCU) {
          // ---- CANDY: toss, eat, glitter burp, two-moon eyes
          x.drawImage(S.bedroom, 200, 230, 640, 360, -80, -60, 1120, 900);
          x.fillStyle = 'rgba(4,6,14,0.3)'; x.fillRect(-80, -60, 1120, 900);
          ART.shadow(x, 330, 448, 26, 0.3);
          A.drawRemy(x, S.boy, 330, 446, { sx: 1.5, sy: 1.5, lean: 0.1 * Math.min(1, (g - BOND_EV.candyCU) * 3) });
          const chew = g > BOND_EV.eat && g < BOND_EV.eat + 0.6 ? 1 + Math.sin(g * 40) * 0.03 : 1;
          ART.shadow(x, 620, 448, 24, 0.3);
          A.drawRemy(x, S.bt, 620, 446, { flip: true, sx: 1.34 * chew, sy: 1.34, lean: -0.08 });
          const tk = seg(g, BOND_EV.toss, BOND_EV.catch);
          if (tk > 0 && tk < 1) {
            const cx2 = 380 + tk * 200, cy2 = 340 - Math.sin(tk * Math.PI) * 60 + tk * 30;
            x.drawImage(S.candy, cx2, cy2);
          } else if (tk <= 0) x.drawImage(S.candy2, 372, 340);
          else if (g < BOND_EV.eat + 1.2) { // crumpled wrapper on the floor
            x.save(); x.translate(560, 448); x.rotate(0.4);
            x.fillStyle = '#b83a3a'; x.fillRect(-9, -4, 18, 8);
            x.fillStyle = '#8c2a2a'; x.fillRect(-9, 2, 18, 3);
            x.restore();
          }
          if (g > BOND_EV.burp && g < BOND_EV.burp + 0.8) {
            ART.chips(x, [{ g: BOND_EV.burp, x: 606, y: 310, seed: 8 }], g, '150,230,190', 8);
            ART.burstRing(x, [{ g: BOND_EV.burp, x: 606, y: 310 }], g, '150,230,190');
          }
          if (g > BOND_EV.eyes) { // two tiny moons for pupils
            for (const dx of [-9, 9]) {
              ART.warmGlow(x, 604 + dx, 312, 16, 0.5, '255,214,150');
              x.fillStyle = '#ffd9a0'; x.beginPath(); x.arc(604 + dx, 312, 3.4, 0, 7); x.fill();
              x.fillStyle = 'rgba(160,110,50,0.55)'; x.beginPath(); x.arc(603 + dx, 311, 1.1, 0, 7); x.fill();
            }
          }
        } else {
          // ---- KNEE close-up: the glowing finger (one continuous leg, fingertip ON the knee)
          x.fillStyle = '#0c0f1c'; x.fillRect(-80, -60, LW + 160, LH + 120);
          x.fillStyle = 'rgba(30,36,58,0.5)'; x.fillRect(-80, 400, LW + 160, 180);
          x.lineCap = 'round';
          x.strokeStyle = PAL.BOY.shirt; x.lineWidth = 58; // thigh: hip → knee
          x.beginPath(); x.moveTo(90, 452); x.lineTo(452, 348); x.stroke();
          x.strokeStyle = '#04174a'; x.lineWidth = 60;
          x.beginPath(); x.moveTo(104, 452); x.lineTo(250, 408); x.stroke(); // seam shading
          x.strokeStyle = '#d4b8a0'; x.lineWidth = 46; // shin: knee → foot (warm skin survives the cool grade)
          x.beginPath(); x.moveTo(452, 348); x.lineTo(660, 392); x.stroke();
          x.fillStyle = '#d4b8a0';
          x.beginPath(); x.arc(452, 348, 27, 0, 7); x.fill(); // knee cap
          x.fillStyle = 'rgba(255,255,255,0.14)';
          x.beginPath(); x.arc(444, 338, 12, 0, 7); x.fill(); // knee sheen
          const scrapK = 1 - seg(g, BOND_EV.touch + 0.3, BOND_EV.pop);
          if (scrapK > 0.02) {
            x.fillStyle = `rgba(196,70,60,${0.9 * scrapK})`;
            x.fillRect(464, 332, 14, 9); x.fillRect(472, 326, 8, 7);
          }
          const pk = seg(g, BOND_EV.pop, BOND_EV.pop + 0.12);
          if (pk <= 0) {
            x.fillStyle = '#d8b88a'; x.fillRect(436, 322, 30, 13);
            x.fillStyle = '#c0a070'; x.fillRect(436, 322, 6, 13); x.fillRect(460, 322, 6, 13);
          } else if (pk < 1) {
            const bx2 = 436 - pk * 130, by2 = 322 - Math.sin(pk * Math.PI) * 80;
            x.save(); x.translate(bx2, by2); x.rotate(-pk * 2.2);
            x.fillStyle = '#d8b88a'; x.fillRect(-15, -6, 30, 13);
            x.restore();
            ART.chips(x, [{ g: BOND_EV.pop, x: 452, y: 336, seed: 12 }], g, '140,240,240', 9);
          }
          // B.T.'s arm from the right — fingertip lands ON the knee cap; his face edges into frame
          x.globalAlpha = 0.9;
          x.drawImage(S.btFace, 760, -46, 400, 242);
          x.globalAlpha = 1;
          x.strokeStyle = BT_SHIRT; x.lineWidth = 30;
          x.beginPath(); x.moveTo(930, 268); x.lineTo(560, 330); x.stroke();
          x.strokeStyle = BT_SKIN; x.lineWidth = 16;
          x.beginPath(); x.moveTo(580, 326); x.lineTo(478, 342); x.stroke();
          const gk = g < BOND_EV.touch ? seg(g, BOND_EV.touch - 0.5, BOND_EV.touch) * 0.5 : 1 - seg(g, BOND_EV.pop + 0.4, BOND_EV.pop + 0.9) * 0.7;
          ART.fingerGlow(x, 468, 346, lt, Math.max(0.08, gk));
        }
        ART.iris(x, 1 - seg(lt, BOND_EV.iris, BOND_EV.iris + 0.4), 480, 300, 660);
        blit(ctx);
      },
      fx: (lt) => ({
        ...fxNight()(),
        tint: lt < 18 ? [0.92, 0.99, 1.09] : [1.02, 0.99, 1.0],
        bloom: lt < 18 ? 0.075 : 0.09,
      }),
    },

    // ---- S4 TITLE — miniature wheelie across the moon ---------------------------
    {
      name: 'title', t0: T.title, t1: T.street,
      draw(ctx, lt) {
        const x = beginLow();
        const open = seg(lt, 0, TITLE_EV.irisIn);
        if (open > 0.01) {
          x.save();
          const push = 1 + 0.025 * E.inQuad(lt / 6);
          x.translate(LW / 2, LH / 2); x.scale(push, push); x.translate(-LW / 2, -LH / 2);
          x.drawImage(S.sky, -40, -20);
          ART.starTwinkle(x, lt, LW + 160, 470, 7, 1);
          x.drawImage(S.moon, 600 - 208, 250 - 208);
          ART.warmGlow(x, 600, 250, 300, 0.1, '255,214,150');
          const u = seg(lt, TITLE_EV.miniCross, TITLE_EV.miniCross + 1.0);
          if (u > 0 && u < 1.02 && lt < TITLE_EV.flicker) {
            const bx = 330 + u * 560, by = 352 + Math.sin(u * 3.1) * 5;
            riders(x, bx, by, { scale: 0.62, dark: true, lean: -0.16, spin: u * 14 });
          }
          x.restore();
        }
        if (lt > TITLE_EV.flicker) { // film-cell flicker out
          const fk = hash(Math.floor(lt * 24));
          x.fillStyle = `rgba(2,3,8,${0.25 + fk * 0.55})`;
          x.fillRect(-80, -60, LW + 160, LH + 120);
          if (fk > 0.6) { x.fillStyle = 'rgba(220,230,246,0.05)'; x.fillRect(0, fk * 400, LW, 3); }
        }
        ART.iris(x, open, 600, 280, 700);
        ART.iris(x, 1 - seg(lt, TITLE_EV.irisOut, TITLE_EV.irisOut + 0.4), 600, 280, 700);
        blit(ctx);
      },
      fx: fxNight({ bloom: 0.11, vignette: 0.7 }),
    },

    // ---- S5 THE STREET — costume rounds, and a van -------------------------------
    {
      name: 'street', t0: T.street, t1: T.pursuit,
      draw(ctx, lt) {
        const x = beginLow();
        if (lt < STREET_EV.vanCut) {
          const g = lt;
          const bikeX = -110 + g * 132;
          const cam = clampX(bikeX - 400, 0, 620);
          x.drawImage(S.sky, -30, -20);
          ART.starTwinkle(x, lt, LW + 160, 470, 7, 0.7);
          x.drawImage(S.houses, -60 - cam, 96);
          const tt = [
            { rig: S.t1, wx: 260, ph: 0, flip: false },
            { rig: S.btFar, wx: 640, ph: 2, flip: true, sheet: true },
            { rig: S.t1, wx: 1080, ph: 4, flip: true },
          ];
          for (const p of tt) {
            const sx = p.wx - cam + Math.sin(lt * 0.9 + p.ph) * 14;
            ART.shadow(x, sx, 472, 18, 0.28);
            A.drawRemy(x, p.rig, sx, 470, { flip: p.flip, sx: 1.35, sy: 1.35, stride: [Math.sin(lt * 6 + p.ph) * 2, -Math.sin(lt * 6 + p.ph) * 2] });
            if (p.sheet) x.drawImage(S.sheet, sx - 16, 470 - 100, 32, 70);
          }
          for (const [px, sd] of [[140, 1], [610, 2], [1120, 3]]) ART.pumpkin(x, px - cam, 452, lt, sd, 1.1);
          A.drawRemy(x, S.mum, 880 - cam, 450, { flip: true, sx: 1.3, sy: 1.3, lean: 0.1 * Math.sin(lt * 3.4) });
          const spin = (bikeX + 110) / 12;
          riders(x, 400, 450, { scale: 1.05, spin, boyStride: Math.sin(g * 13) * 3.2, btSheet: true, sheetT: lt, flap: 1 + seg(g, 3.0, 3.6) * 1.6, glow: seg(g, 3.0, 3.8) });
        } else {
          const vlt = lt - STREET_EV.vanCut;
          const dutch = 0.02 + 0.07 * E.inOutCubic(seg(vlt, 0.6, 3.4));
          x.save();
          x.translate(500, 370); x.rotate(dutch);
          const zk = 1 + 0.16 * E.inOutCubic(seg(vlt, 0.6, 3.4));
          x.scale(zk, zk); x.translate(-500, -370);
          x.drawImage(S.sky, -30, -20);
          x.drawImage(S.houses, -260, 96);
          x.fillStyle = 'rgba(3,4,10,0.35)'; x.fillRect(-80, -60, LW + 160, LH + 120);
          x.drawImage(S.van, 600, 416);
          const snap = seg(vlt, 0.8, 0.9); // roof light snaps on
          if (snap > 0) {
            ART.cone(x, 682, 410, -0.55 + Math.sin(lt * 1.3) * 0.18, 300 * snap, 42, lt, '207,228,252', 0.2);
            ART.warmGlow(x, 682, 406, 90, 0.3 * snap, '190,214,246');
          }
          const dk = seg(vlt, 1.6, 2.3); // door slides open
          if (dk > 0.01) {
            x.fillStyle = '#10141d'; x.fillRect(698 - 30 * dk, 428, 30 * dk, 46);
            x.fillStyle = 'rgba(127,167,207,0.08)'; x.fillRect(700 - 26 * dk, 432, 24 * dk, 38);
            const walk = E.outCubic(seg(vlt, 1.7, 3.0));
            const agx = 680 - walk * 150;
            for (const [rig, ox, ph] of [[S.agA, 0, 0], [S.agB, -46, 2]]) {
              ART.shadow(x, agx + ox, 480, 26, 0.3);
              A.drawRemy(x, rig, agx + ox, 478, { flip: true, sx: 1.42, sy: 1.42, stride: [Math.sin(lt * 7 + ph) * 2.2, -Math.sin(lt * 7 + ph) * 2.2], glow: '#9fb8e8', glowA: 0.08 });
              ART.cone(x, agx + ox - 18, 450, -0.06 + Math.sin(lt * 1.6 + ph) * 0.14, 330, 30, lt, '207,228,252', 0.15);
            }
          }
          x.restore();
        }
        blit(ctx);
      },
      fx: fxNight(),
    },

    // ---- S6 PURSUIT — cones in the pines -----------------------------------------
    {
      name: 'pursuit', t0: T.pursuit, t1: T.flight,
      draw(ctx, lt) {
        const { g } = PURSUIT_CLOCK.warp(lt);
        const x = beginLow();
        if (g < PURSUIT_EV.cuts[0]) {
          // van-POV: cones slice the street
          x.drawImage(S.sky, -30, -20);
          x.drawImage(S.houses, -300 - lt * 18, 130);
          x.fillStyle = 'rgba(3,4,10,0.4)'; x.fillRect(-80, -60, LW + 160, LH + 120);
          x.drawImage(S.van, 740, 422);
          for (const [ox, ph] of [[752, 0], [806, 2]]) {
            ART.cone(x, ox, 468, -0.12 + Math.sin(lt * 2.2 + ph) * 0.16, 460, 46, lt, '207,228,252', 0.17);
          }
          A.drawRemy(x, S.agADark, 690, 500, { flip: true, sx: 1.5, sy: 1.5 });
        } else if (g < PURSUIT_EV.forest) {
          // four cross-cuts
          const ci = PURSUIT_EV.cuts.findIndex((c, i) => g >= c && g < (PURSUIT_EV.cuts[i + 1] ?? PURSUIT_EV.forest));
          if (ci % 2 === 0) { // bike close, hard rightward
            x.fillStyle = '#0a0f1e'; x.fillRect(-80, -60, LW + 160, LH + 120);
            x.drawImage(S.forest3, -(((g * 240) % 1400)) - 80, 220);
            x.fillStyle = '#0c1224'; x.fillRect(-80, 400, LW + 160, 200);
            speedStreaks(x, 380, 430, 16, 31 + ci);
            riders(x, 520, 436, { scale: 1.7, spin: g * 30, boyStride: Math.sin(g * 16) * 3, btSheet: true, sheetT: lt, flap: 2 });
          } else { // cones through the pines
            x.fillStyle = '#080c18'; x.fillRect(-80, -60, LW + 160, LH + 120);
            x.drawImage(S.forest3, -((g * 60) % 1400) - 40, 200);
            x.drawImage(S.forest2, -((g * 100) % 1400) - 40, 260);
            for (const [ox, ph] of [[240, 0], [720, 2]]) {
              ART.cone(x, ox, 480, -1.5 + Math.sin(lt * 2.6 + ph) * 0.34, 340, 40, lt, '207,228,252', 0.18);
            }
          }
        } else if (g < PURSUIT_EV.skid - 0.4) {
          // racing pan along the forest floor
          const wx = (g - PURSUIT_EV.forest) * 320;
          x.drawImage(S.sky, -30, -20);
          x.drawImage(S.forest3, -((wx * 0.35) % 1400) - 60, 190);
          x.drawImage(S.forest2, -((wx * 0.6) % 1400) - 60, 240);
          x.drawImage(S.forest1, -(wx % 1400) - 60, 270);
          x.fillStyle = '#0c1224'; x.fillRect(-80, 420, LW + 160, 200);
          x.fillStyle = 'rgba(30,42,66,0.5)'; x.fillRect(-80, 420, LW + 160, 2);
          ART.fog(x, lt, 430, 1);
          speedStreaks(x, 300, 470, 14, 55);
          riders(x, 340, 452, { scale: 1.35, spin: wx / 12, boyStride: Math.sin(g * 15) * 3, btSheet: true, sheetT: lt, flap: 2.2 });
          if (Math.floor(g * 2) % 2 === 0) ART.cone(x, 900, 470, -2.5 + Math.sin(lt * 3) * 0.2, 300, 36, lt, '207,228,252', 0.14);
        } else {
          // BRAKES. RAVINE. — front wheel hanging over the void
          const enter = E.outCubic(seg(g, PURSUIT_EV.skid - 0.4, PURSUIT_EV.skid));
          const bx = 1080 - 480 * enter;
          x.drawImage(S.sky, -30, -20);
          ART.starTwinkle(x, lt, LW + 160, 470, 7, 0.6);
          x.drawImage(S.ravine, -ART.OVER, -ART.OVER);
          x.drawImage(S.moonSmall, 118, 96);
          // wheels keep spinning after the world stops — the gag runs on real time
          const spin = (1080 - bx) / 12 + 9 * Math.min(Math.max(0, lt - 10.92), 0.6);
          const skidK = seg(g, PURSUIT_EV.skid - 0.28, PURSUIT_EV.skid);
          ART.shadow(x, bx + 4, 398, 40, 0.3 * (1 - skidK * 0.7));
          riders(x, bx, 390, { spin, lean: -0.05 * skidK, btSheet: true, sheetT: lt, flap: 0.4 });
          if (skidK > 0.05 && skidK < 1) {
            ART.chips(x, [{ g: PURSUIT_EV.skid - 0.25, x: bx + 30, y: 398, seed: 21 }], g, '120,140,180', 12);
          }
          // goons' glow closing from behind (left, our side)
          const gk = seg(lt, 11.2, 12);
          if (gk > 0.01) {
            ART.cone(x, -60 + gk * 120, 330, -0.35, 320, 38, lt, '207,228,252', 0.13);
            A.drawRemy(x, S.agADark, -80 + gk * 120, 420, { sx: 1.45, sy: 1.45, stride: [Math.sin(lt * 8) * 2.4, -Math.sin(lt * 8) * 2.4] });
          }
          // wind streaks over the gap — one second of prayer
          const wk = seg(lt, 10.9, 11.4);
          x.save();
          x.globalAlpha = wk * 0.5;
          for (let i = 0; i < 5; i++) {
            x.strokeStyle = 'rgba(150,180,220,0.24)'; x.lineWidth = 1.2;
            const wy = 300 + i * 26, wob = Math.sin(lt * 2 + i) * 8;
            x.beginPath(); x.moveTo(600 + wob, wy); x.lineTo(680 + wob, wy - 6); x.stroke();
          }
          x.restore();
        }
        blit(ctx);
      },
      fx: fxNight({ grain: 0.055, vignette: 0.95 }),
    },

    // ---- S7 THE FLIGHT — eight seconds across the moon ---------------------------
    {
      name: 'flight', t0: T.flight, t1: T.ship,
      draw(ctx, lt) {
        const x = beginLow();
        if (lt < FLIGHT_EV.moonShot) {
          // launch off the ravine edge
          x.drawImage(S.sky, -30, -20 + 30 * seg(lt, 0.5, 2));
          x.drawImage(S.ravine, -ART.OVER, -ART.OVER + 30 * seg(lt, 0.5, 2));
          const liftK = seg(lt, FLIGHT_EV.rise, 2);
          const by = 390 - E.outCubic(liftK) * 150;
          const bx = 600 - liftK * 14;
          const lean = -0.04 - 0.26 * seg(lt, FLIGHT_EV.noseUp, FLIGHT_EV.noseUp + 0.5);
          riders(x, bx, by, { spin: 10 + lt * 6, lean, btSheet: true, sheetT: lt, flap: 1.6, glow: seg(lt, FLIGHT_EV.fingerLift, 0.9), noShadow: true });
          ART.fingerGlow(x, bx + 36, by - 38, lt, seg(lt, FLIGHT_EV.fingerLift, FLIGHT_EV.fingerLift + 0.4)); // drawn over the riders
          ART.chips(x, [{ g: FLIGHT_EV.rise, x: 620, y: 396, seed: 31 }], lt, '150,180,220', 10);
          ART.warmGlow(x, 660, 250, 240, 0.12, '255,214,150');
          A.drawRemy(x, S.agADark, 380, 398, { sx: 1.4, sy: 1.4, lean: -0.06 });
          A.drawRemy(x, S.agBDark, 320, 402, { sx: 1.4, sy: 1.4, lean: -0.04 });
          ART.cone(x, 370, 330, -0.9, 260, 30, lt, '207,228,252', 0.1);
        } else {
          // the held shot: a bicycle crosses the face of the moon
          x.drawImage(S.sky, -40, -20);
          ART.starTwinkle(x, lt, LW + 160, 470, 7, 1);
          x.drawImage(S.moon, 620 - 233, 255 - 233);
          for (let i = 0; i < 2; i++) { // slow cloud wisps crossing the moonlight
            const cx2 = ((lt * (9 + i * 5) + i * 400) % (LW + 500)) - 250;
            x.fillStyle = 'rgba(24,32,58,0.5)';
            x.beginPath(); x.ellipse(cx2, 180 + i * 130, 130, 11, 0, 0, 7); x.fill();
          }
          // approach fast, LINGER on the face, exit fast (piecewise, pure in t)
          const u = seg(lt, FLIGHT_EV.crossIn, FLIGHT_EV.crossOut);
          const uFaceIn = (FLIGHT_EV.faceIn - FLIGHT_EV.crossIn) / (FLIGHT_EV.crossOut - FLIGHT_EV.crossIn);
          const uFaceOut = (FLIGHT_EV.faceOut - FLIGHT_EV.crossIn) / (FLIGHT_EV.crossOut - FLIGHT_EV.crossIn);
          const exOf = (uu) =>
            uu < uFaceIn ? -160 + (uu / uFaceIn) * 480 :
            uu < uFaceOut ? 320 + ((uu - uFaceIn) / (uFaceOut - uFaceIn)) * 540 :
            860 + ((uu - uFaceOut) / (1 - uFaceOut)) * 260;
          const ex = u >= 1 ? 1120 + (lt - FLIGHT_EV.crossOut) * 620 : exOf(u);
          const by = 310 + Math.sin(u * 2.2) * 9;
          const trailK = seg(lt, FLIGHT_EV.trail, FLIGHT_EV.trail + 0.8) * (1 - seg(lt, FLIGHT_EV.trailEnd, FLIGHT_EV.trailEnd + 1));
          if (trailK > 0.01) { // the finger-trail draws an S-curve (reads on sky AND moon)
            const trailY = (tu) => 306 + Math.sin(tu * 5.2) * 14 - 44;
            x.save();
            x.strokeStyle = `rgba(26,128,158,${0.55 * trailK})`;
            x.lineWidth = 3.4;
            x.beginPath();
            for (let i = 0; i <= 18; i++) {
              const tu = Math.max(0, u - i * 0.02);
              const px = exOf(tu), py = trailY(tu);
              if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
            }
            x.stroke();
            x.strokeStyle = `rgba(150,250,255,${0.34 * trailK})`;
            x.lineWidth = 1.3;
            x.stroke();
            x.restore();
          }
          riders(x, ex, by, { scale: 1.42, dark: true, spin: u * 22, lean: -0.06, btSheet: true, sheetT: lt, flap: 1.1, glow: 0.6 * trailK });
          ART.warmGlow(x, 620, 255, 350, 0.09, '255,214,150');
        }
        blit(ctx);
      },
      fx: fxNight({ bloom: 0.1, vignette: 0.62, grain: 0.035 }),
    },

    // ---- S8 THE SHIP — the touch, the sprout, the hair-comet ---------------------
    {
      name: 'ship', t0: T.ship, t1: T.slate,
      draw(ctx, lt, dur, t) {
        const { g, stop, sl } = SHIP_CLOCK.warp(lt);
        const x = beginLow();
        const touchCU = seg(lt, SHIP_EV.touchCU, SHIP_EV.touchCU + 0.4) * (1 - seg(lt, SHIP_EV.pushHead - 0.3, SHIP_EV.pushHead));
        const pushHead = seg(lt, SHIP_EV.pushHead, SHIP_EV.pushHead + 0.7) * (1 - seg(lt, SHIP_EV.wide2, SHIP_EV.wide2 + 0.6));
        // clearing: ring of pines + sky + ground
        x.drawImage(S.sky, -30, -20);
        ART.starTwinkle(x, lt, LW + 160, 470, 7, 0.8);
        x.drawImage(S.forest3, -60, 210);
        x.drawImage(S.forest2, -140, 250);
        x.fillStyle = '#0e1526'; x.fillRect(-80, 300, LW + 160, 60);
        x.drawImage(S.forest1, -80, 268);
        x.fillStyle = '#101a2c'; x.fillRect(-80, 428, LW + 160, 160);
        x.fillStyle = 'rgba(30,44,70,0.5)'; x.fillRect(-80, 428, LW + 160, 2);
        ART.fog(x, lt, 436, 0.7);
        // the ship: descends, lands, leaves
        const landK = E.outCubic(seg(g, 0, SHIP_EV.descendEnd));
        const liftK = E.inOutCubic(seg(g, SHIP_EV.liftoff, SHIP_EV.riseEnd));
        const shipY = -140 + landK * 260 - liftK * 320;
        const shipGlow = 0.5 + 0.5 * Math.sin(lt * 1.1);
        x.drawImage(S.ship, 480 - 180, shipY);
        ART.warmGlow(x, 480, shipY + 110, 240, 0.22 * shipGlow, '255,196,110');
        ART.fingerGlow(x, 480, shipY + 118, lt, 0.5 + 0.3 * shipGlow);
        // landing shaft while descending; ramp after landing; both gone with liftoff
        const beamFade = 1 - seg(g, SHIP_EV.liftoff, SHIP_EV.liftoff + 0.35);
        const shaft = (1 - seg(g, SHIP_EV.descendEnd - 0.6, SHIP_EV.descendEnd)) * beamFade;
        if (shaft > 0.01) {
          const sg2 = x.createLinearGradient(480, shipY + 100, 480, 430);
          sg2.addColorStop(0, `rgba(127,247,255,${0.14 * shaft})`);
          sg2.addColorStop(1, 'rgba(127,247,255,0)');
          x.fillStyle = sg2;
          x.beginPath(); x.moveTo(452, shipY + 100); x.lineTo(508, shipY + 100); x.lineTo(560, 430); x.lineTo(420, 430); x.closePath(); x.fill();
        }
        const rk = seg(g, SHIP_EV.descendEnd, SHIP_EV.ramp) * beamFade;
        if (rk > 0.01) { // the ramp spills cyan across the needles
          x.fillStyle = 'rgba(127,247,255,0.16)';
          x.beginPath(); x.moveTo(500, shipY + 106); x.lineTo(560, 430); x.lineTo(560 - 26 * Math.min(1, rk), 430); x.closePath(); x.fill();
          x.strokeStyle = `rgba(127,247,255,${0.4 * Math.min(1, rk)})`; x.lineWidth = 1.6;
          x.beginPath(); x.moveTo(500, shipY + 106); x.lineTo(560, 430); x.stroke();
        }
        // the boy, watching (hidden during the close-ups)
        if (touchCU < 0.98 && pushHead < 0.98) A.drawRemy(x, S.boy, 320, 430, { sx: 1.5, sy: 1.5, lean: 0.05 - liftK * 0.06 });
        // B.T.: two-shot → walks to the ramp base → climbs the ramp line
        const step = E.outCubic(seg(g, SHIP_EV.touchCU - 0.6, SHIP_EV.touchCU));
        const walkK = E.inOutCubic(seg(g, SHIP_EV.boards, SHIP_EV.rampStep)); // → ramp base (560, 430)
        const climbK = E.inOutCubic(seg(g, SHIP_EV.rampStep, SHIP_EV.boardsEnd)); // ramp base → ship door
        const btx = 430 - step * 40 + walkK * 170 - climbK * 55;
        const bty = 430 - climbK * 190;
        const boardsK = Math.max(walkK, climbK);
        if (touchCU < 0.98 && pushHead < 0.98 && climbK < 0.999) {
          A.drawRemy(x, S.bt, btx, bty, {
            flip: true, sx: 1.28, sy: 1.28, lean: -0.06 - climbK * 0.18,
            stride: boardsK > 0.01 ? [Math.sin(g * 8) * 2, -Math.sin(g * 8) * 2] : [0, 0],
            glow: '#9fe8d8', glowA: 0.1 + 0.12 * shipGlow,
          });
          const grow = seg(g, SHIP_EV.sprout, SHIP_EV.sprout + 0.5);
          if (grow > 0 && pushHead < 0.2 && touchCU < 0.2) ART.sproutHair(x, btx + 2, 430 - 130, grow, lt, 0);
        }
        // the fingertip touch: an opaque close-up, hands meeting at a cyan point
        if (touchCU > 0.01) {
          const k = 1 + 1.1 * touchCU;
          x.save();
          x.translate(480, 330); x.scale(k, k); x.translate(-480, -330);
          x.fillStyle = `rgba(5,7,14,${0.97 * touchCU})`; x.fillRect(-80, -60, LW + 160, LH + 120);
          A.drawRemy(x, S.boy, 286, 640, { sx: 3.1, sy: 3.1, lean: 0.1 });
          A.drawRemy(x, S.bt, 662, 640, { flip: true, sx: 2.8, sy: 2.8, lean: -0.1, glow: '#9fe8d8', glowA: 0.12 });
          // fingertips reach to the meeting point, hands (knuckle blobs) at the ends
          const tk = seg(g, SHIP_EV.touch - 0.5, SHIP_EV.touch) * (1 - seg(g, SHIP_EV.touch + 1.0, SHIP_EV.touch + 1.6));
          const reach = E.outCubic(seg(g, SHIP_EV.touch - 0.5, SHIP_EV.touch));
          const mxx = 480;
          x.lineCap = 'round';
          x.strokeStyle = PAL.BOY.shirt; x.lineWidth = 13;
          x.beginPath(); x.moveTo(mxx - 150 + reach * 60, 348); x.lineTo(mxx - 58 + reach * 28, 346); x.stroke();
          x.strokeStyle = PAL.BOY.skin; x.lineWidth = 9;
          x.beginPath(); x.moveTo(mxx - 96 + reach * 44, 347); x.lineTo(mxx - 34 + reach * 20, 345); x.stroke();
          x.strokeStyle = BT_SHIRT; x.lineWidth = 12;
          x.beginPath(); x.moveTo(mxx + 150 - reach * 60, 352); x.lineTo(mxx + 58 - reach * 28, 348); x.stroke();
          x.strokeStyle = BT_SKIN; x.lineWidth = 8;
          x.beginPath(); x.moveTo(mxx + 96 - reach * 44, 350); x.lineTo(mxx + 34 - reach * 20, 347); x.stroke();
          x.fillStyle = PAL.BOY.skin;
          x.beginPath(); x.arc(mxx - 26 + reach * 16, 345, 7, 0, 7); x.fill();
          x.fillStyle = BT_SKIN;
          x.beginPath(); x.arc(mxx + 26 - reach * 16, 347, 6.4, 0, 7); x.fill();
          ART.fingerGlow(x, mxx, 346, lt, Math.max(0.15, tk));
          for (let i = 0; i < 4; i++) { // the glow shivers up B.T.'s arm
            const kk = seg(g, SHIP_EV.touch + i * 0.14, SHIP_EV.touch + 0.3 + i * 0.14) * (1 - seg(g, SHIP_EV.touch + 0.8, SHIP_EV.touch + 1.4)) * tk;
            if (kk > 0.02) {
              x.fillStyle = `rgba(127,247,255,${0.4 * kk})`;
              x.fillRect(mxx + 40 + i * 14, 342 - i * 19, 6, 15);
            }
          }
          x.restore();
        }
        if (pushHead > 0.01) { // push-in: THE SPROUT (zoom kept low so the scalp stays in frame)
          const k = 1 + 0.55 * pushHead;
          x.save();
          x.translate(480, 330); x.scale(k, k); x.translate(-480, -330);
          x.fillStyle = 'rgba(3,4,10,0.6)'; x.fillRect(-80, -60, LW + 160, LH + 120);
          x.drawImage(S.btFace, 480 - 266, 250, 532, 322); // 76×46 crop ≈ 7×; scalp top lands at y≈250
          const grow = seg(g, SHIP_EV.sprout, SHIP_EV.sprout + 0.5);
          ART.sproutHair(x, 492, 254, grow, lt, g > SHIP_EV.sprout + 0.5 ? lt : 0);
          if (grow >= 1) {
            ART.sparkle(x, 488, 226, lt, 4, '255,236,170', 2.6);
            ART.sparkle(x, 498, 234, lt * 1.27, 9, '255,244,196', 1.5);
          }
          x.restore();
        }
        if (stop && sl < 0.05) { x.fillStyle = 'rgba(240,248,255,0.15)'; x.fillRect(0, 0, LW, LH); }
        // liftoff flare + a small camera rumble
        if (liftK > 0.01 && liftK < 1) {
          ART.warmGlow(x, 480, shipY + 130, 320, 0.34 * (1 - liftK), '255,214,150');
          ART.chips(x, [{ g: SHIP_EV.liftoff, x: 480, y: 430, seed: 41 }], g, '160,180,210', 12);
        }
        ART.hairComet(x, t, T.ship + SHIP_EV.comet, T.ship + SHIP_EV.cometEnd, 520, 140, 150, 110);
        const aloneK = seg(g, SHIP_EV.cometEnd, SHIP_EV.iris);
        ART.warmGlow(x, 320, 380, 160, 0.14 * (1 - aloneK), '150,200,190');
        ART.iris(x, 1 - seg(lt, SHIP_EV.iris, SHIP_EV.iris + 0.4), 480, 300, 660);
        blit(ctx);
      },
      fx: fxNight({ tint: [1.04, 1.0, 0.96], bloom: 0.1, vignette: 0.78 }),
    },

    // ---- S9 END SLATE --------------------------------------------------------------
    {
      name: 'slate', t0: T.slate, t1: DURATION,
      draw(ctx, lt, dur, t) {
        const x = beginLow();
        x.fillStyle = '#020308'; x.fillRect(-80, -60, LW + 160, LH + 120);
        x.drawImage(S.moonSmall, 760 - 64, 130 - 64);
        ART.starTwinkle(x, lt, LW + 160, 300, 7, 0.7);
        ART.hairComet(x, t, 88, 89.2, 140, 70, 60, 46);
        blit(ctx);
      },
      fx: (lt) => ({ letterbox: 0.8, vignette: 0.6, grain: 0.04, bloom: 0.06, bloomThresh: 0.88, fade: lt > 3.7 ? (lt - 3.7) / 0.3 : 0 }),
    },
  ],

  captions: [
    { text: 'REMY SUBURBS — HALLOWEEN, 1982-ISH', t0: 1.4, t1: 5.2, style: 'date' },
    // (date slate sits high, clear of the UFO streak path)
    { text: 'B.T. COLD. B.T. WANT LAMP.', t0: 13.55, t1: 15.95, style: 'dlg', minHold: 1.85 }, // lands on the reveal freeze
    { text: 'THE HAIR HAT. B.T. FEEL MAGNIFICENT.', t0: 18.4, t1: 21.2, style: 'quip' },
    { text: 'B.T. EAT COLOUR ROCKS. B.T. SEE TWO MOONS.', t0: 21.4, t1: 24.1, style: 'quip' },
    { text: 'SCRAPED KNEE GONE. B.T. SORRY FOR FIZZ.', t0: 24.6, t1: 28.0, style: 'dlg' },
    { text: 'MUM, DOOR OPEN: WHO ARE YOU TALKING TO?', t0: 28.0, t1: 31.0, style: 'tauntTop' },
    { text: '…MY GOLDFISH.', t0: 30.4, t1: 31.9, style: 'quip', minHold: 1.0 }, // deadpan punchline: quick is the joke
    { text: 'B.T. THE EXTRA-BALDESTRAL', t0: 34.0, t1: 37.9, style: 'title' },
    { text: 'A REMY BOYS FAIRY TALE', t0: 34.8, t1: 37.9, style: 'sub' },
    { text: 'B.T. WEAR SHEET. B.T. NOW LOCAL.', t0: 40.6, t1: 43.5, style: 'quipTop' },
    { text: 'MEANWHILE: A CABALD VAN COUNTED SHEETS. ONE TOO MANY.', t0: 44.6, t1: 48.0, style: 'date' },
    { text: 'CABALD UNIT 6. NO HAIR. NO HEART. NO MERCY.', t0: 50.0, t1: 53.1, style: 'tauntLow' },
    { text: 'BRAKES. RAVINE. BAD MATH.', t0: 56.6, t1: 59.7, style: 'tauntLow' },
    { text: 'HE CAME 300 MILES. MOSTLY UPHILL.', t0: 63.2, t1: 66.4, style: 'dlg' },
    { text: 'B.T. GO HOME NOW. B.T. KEEP LAMP.', t0: 74.8, t1: 78.1, style: 'dlg' },
    { text: 'B.T. GROW HAIR. B.T. ONE OF US.', t0: 80.2, t1: 83.1, style: 'quip' },
    { text: 'REMY BOYS WILL RETURN IN\nCLOSE ENCOUNTERS OF THE BALD KIND', t0: 88.6, t1: 91.9, style: 'endT' },
    { text: 'NO ALIENS WERE HARMED. ONE GREW A HAIR. WE’RE ALL VERY PROUD.', t0: 89.8, t1: 91.95, style: 'slate', minHold: 1.0 },
  ],
  captionStyles: {
    date: { font: '"Cormorant Garamond"', weight: '500', size: 30, color: '#9aa8c0', align: 'center', x: 960, y: 162, track: 5, anim: 'fade', in: 0.5, out: 0.5 },
    dlg: { font: '"Cormorant Garamond"', weight: 'italic 600', size: 40, color: '#f0e9d4', align: 'center', x: 960, y: 878, lineHeight: 1.2, anim: 'rise', in: 0.25, out: 0.25, shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 12 },
    quip: { font: '"Cormorant Garamond"', weight: 'italic 600', size: 40, color: '#ffe9ad', align: 'center', x: 960, y: 878, lineHeight: 1.2, anim: 'rise', in: 0.25, out: 0.25, shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 12 },
    taunt: { font: '"Cormorant Garamond"', weight: 'italic 600', size: 40, color: '#f0e9d4', align: 'center', x: 960, y: 700, anim: 'rise', in: 0.25, out: 0.25, shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 12 },
    tauntTop: { font: '"Cormorant Garamond"', weight: 'italic 600', size: 40, color: '#f0e9d4', align: 'center', x: 960, y: 560, anim: 'rise', in: 0.25, out: 0.25, shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 14 },
    tauntLow: { font: '"Cormorant Garamond"', weight: 'italic 600', size: 40, color: '#f0e9d4', align: 'center', x: 960, y: 902, anim: 'rise', in: 0.25, out: 0.25, shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 14 },
    quipTop: { font: '"Cormorant Garamond"', weight: 'italic 600', size: 40, color: '#ffe9ad', align: 'center', x: 960, y: 560, anim: 'rise', in: 0.25, out: 0.25, shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 14 },
    title: { font: '"Cormorant Garamond"', weight: '600', size: 102, color: '#e9e3d2', align: 'center', x: 960, y: 502, track: 8, anim: 'rise', rise: 22, in: 0.18, out: 0.5, glow: '#000000', glowBlur: 34 },
    sub: { font: '"Cormorant Garamond"', weight: '500', size: 36, color: '#c9b98a', align: 'center', x: 960, y: 604, track: 8, anim: 'fade', in: 0.5, out: 0.4 },
    endT: { font: '"Cormorant Garamond"', weight: '600', size: 48, color: '#e9d9a6', align: 'center', x: 960, y: 540, lineHeight: 1.35, track: 6, anim: 'fade', in: 0.5, out: 0.4, glow: '#6e5a30', glowBlur: 12 },
    slate: { font: '"JetBrains Mono"', weight: '400', size: 22, color: '#8f8672', align: 'center', x: 960, y: 906, track: 2, anim: 'fade', in: 0.25, out: 0.25 },
  },

  score,
  audio: { seed: 1982, reverb: 2.8, reverbGain: 0.3 },
  lint: { captionHold: 2.2, safe: { margin: 0.05, letterbox: true } },
};
