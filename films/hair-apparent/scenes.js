// Per-shot painters. Each is a pure function of local shot time lt and absolute film time t,
// drawing in stage coordinates (0..SW × 0..SH). The hand crank quantizes world time to 16 fps.
import { E, hash, lerp, seg } from "filmkit/lib.js";
import * as A from "../remy-bros/art.js";
import * as ART from "./art.js";
import { FINALE, FINIS, PARLOUR, RESCUE, SH, SNATCH, SW, TRACKS, crank, trainX, warp } from "./timeline.js";

const S1 = 1.6; // hero world scale
const PI = Math.PI;
const ez = E.outCubic;

// ---- poses ----
const idle = (t, k = 1) => ({ lean: Math.sin(t * 2.1) * 0.012 * k, lift: [0, 0], stride: [0, 0] });
const walkPose = (ph) => {
  const s = Math.sin(ph);
  return {
    lift: [Math.round(Math.max(0, s) * 6), Math.round(Math.max(0, -s) * 6)],
    stride: [Math.round(s * 3), Math.round(-s * 3)],
    lean: 0.05,
  };
};
const runPose = (ph) => {
  const s = Math.sin(ph);
  return {
    lift: [Math.round(Math.max(0, s) * 10), Math.round(Math.max(0, -s) * 10)],
    stride: [Math.round(s * 4), Math.round(-s * 4)],
    lean: 0.1,
  };
};
const sneakPose = (ph) => {
  const s = Math.sin(ph);
  return {
    lift: [Math.round(Math.max(0, s) * 13), Math.round(Math.max(0, -s) * 13)],
    stride: [Math.round(s * 4), Math.round(-s * 4)],
    lean: 0.14,
  };
};
const shadow = (x, cx, cy, w, h) => {
  x.fillStyle = "rgba(24,16,8,0.30)";
  x.beginPath();
  x.ellipse(cx, cy, w, h, 0, 0, 7);
  x.fill();
};
// head-top anchor for hats/caps: (x, feet) + near-sprite metrics. Hats sit AT this point.
const headTop = (R, x, feet, s, lean = 0) => ({
  x: x + lean * 120 * s,
  y: feet - (R.bottom + 1 - R.top) * s + 6 * s,
});

// swinging shingle + barber pole over the street set
function streetDressing(x, q) {
  const ang = 0.05 * Math.sin(q * 0.9 + 1);
  x.save();
  x.translate(965, 340);
  x.rotate(ang);
  x.strokeStyle = "#2c2014";
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(-120, 0);
  x.lineTo(-110, 30);
  x.moveTo(120, 0);
  x.lineTo(110, 30);
  x.stroke();
  x.fillStyle = "#241a10";
  x.fillRect(-124, 30, 248, 60);
  x.strokeStyle = "#463019";
  x.lineWidth = 3;
  x.strokeRect(-124, 30, 248, 60);
  x.fillStyle = "#e9d8b4";
  x.font = '600 30px "Cormorant Garamond"';
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("MME. TRESSES", 0, 60);
  x.restore();
  // barber pole stripes (scrolling)
  x.save();
  x.beginPath();
  x.rect(466, 604, 30, 144);
  x.clip();
  x.fillStyle = "#e6d5ae";
  x.fillRect(466, 604, 30, 144);
  x.strokeStyle = "#a84c42";
  x.lineWidth = 9;
  const off = (q * 46) % 24;
  for (let yy = -40; yy < 190; yy += 24) {
    x.beginPath();
    x.moveTo(458, yy + off);
    x.lineTo(504, yy - 18 + off);
    x.stroke();
  }
  x.fillStyle = "rgba(60,40,22,0.30)";
  x.fillRect(490, 604, 6, 144);
  x.restore();
}

// Miss Tresses at her vanity, combing her silver hair (facing the street)
function atVanity(x, S, q, wiggle = 0) {
  shadow(x, 1102, 874, 62, 14);
  A.drawRemy(x, S.dressed, 1100, 872, {
    flip: true,
    sx: 1.45,
    sy: 1.45,
    lean: -0.02 + wiggle,
    lift: [0, 0],
    stride: [0, 0],
  });
  const cy = 742 + 24 * Math.sin((q * 2 * PI) / PARLOUR.combStroke);
  ART.comb(x, 1044, cy, 1.1, 0.2);
  if (Math.sin((q * 2 * PI) / PARLOUR.combStroke) > 0.86) ART.sparkle(x, 1058, cy - 4, 14, 0.9, q * 3);
}

// goon heads peeking around the left frame edge
function goonPeek(x, S, q, lt) {
  const u = seg(lt, PARLOUR.goons, PARLOUR.goons + 0.7);
  if (u <= 0) return;
  const px = 30 - 140 * (1 - ez(u)),
    bob = Math.sin(q * 3.1) * 3;
  const pair = [
    [S.goon1, 0, 0, "#6a5236"],
    [S.goon2, -62, 1, "#54584a"],
  ];
  for (const [R, dx, i, col] of pair) {
    const gy = 952 + bob * (i ? -1 : 1) + i * 14;
    A.drawRemy(x, R, px + dx, gy, { flip: false, sx: 1.25, sy: 1.25, lean: 0.1, lift: [0, 0], stride: [0, 0] });
    const h = headTop(R, px + dx, gy, 1.25, 0.1);
    ART.flatCap(x, h.x, h.y, 1.25, 1, col);
  }
}

// ---------- S1 · studio + title card ----------
export function drawTitle(x, S, lt) {
  x.drawImage(S.setCard, 0, 0);
  const q = crank(lt);
  for (const d of [-1, 1]) {
    ART.comb(x, SW / 2 + d * 330, 672, 1.9, d * 0.12);
    const a = 0.5 + 0.5 * Math.sin(q * 2.4 + (d + 1) * 1.5);
    ART.sparkle(x, SW / 2 + d * 330 + 8, 660, 15, 0.7 * a, q * 1.6 * d);
  }
  ART.circleIris(x, 0, 1 - seg(lt, 0.15, 1.0), SW / 2, SH / 2, 1150);
}

// ---------- S2 · the Tonsorial Parlour ----------
export function drawParlour(x, S, lt) {
  const q = crank(lt);
  x.drawImage(S.setStreet, 0, 0);
  streetDressing(x, q);
  atVanity(x, S, q);
  const [i0, i1] = PARLOUR.heroIn;
  const hx = lerp(-90, 700, ez(seg(q, i0, i1)));
  shadow(x, hx, 906, 52, 12);
  const walking = q < i1;
  A.drawRemy(x, S.hero, hx, 900, {
    flip: false,
    sx: S1,
    sy: S1,
    ...(walking ? walkPose(hx * 0.085) : bowPose(q, PARLOUR.bow)),
    glow: "#f8e8c0",
    glowA: 0.22,
  });
  // heart iris: opens on the pair, holds, closes
  const sizeK = seg(q, PARLOUR.heart[0], PARLOUR.heart[1]) - seg(q, PARLOUR.heart[2], PARLOUR.heart[3]);
  if (sizeK > 0.001) ART.heartIris(x, 0, 1, 900, 690, 380 * ez(sizeK), 0.8);
  goonPeek(x, S, q, lt);
  // button: iris in on the eavesdroppers before the cut
  ART.circleIris(x, 0, seg(lt, 11.25, 11.85), 150, 830, 660);
}
function bowPose(q, [b0, b1]) {
  const u = Math.sin(seg(q, b0, b1) * PI);
  return { lean: 0.16 * u, sy: S1 - 0.06 * u, lift: [0, 0], stride: [0, 0] };
}

// ---------- S3 · the snatch ----------
export function drawSnatch(x, S, lt) {
  const q = crank(lt);
  x.drawImage(S.setStreet, 0, 0);
  streetDressing(x, q);
  const carIn = ez(seg(q, SNATCH.carIn[0], SNATCH.carIn[1]));
  const carOut = seg(q, SNATCH.carOut[0], SNATCH.carOut[1]) ** 2.2;
  const carX = carOut > 0 ? lerp(330, 2150, carOut) : lerp(-420, 330, carIn);
  const carY = 944,
    carS = 1.12,
    roll = 0.018 * Math.sin(carX * 0.09);
  const [g0, g1] = SNATCH.grab;
  // heroine: at vanity → seized → bundled into the car
  if (q < SNATCH.load[0]) {
    atVanity(x, S, q, q > g1 ? 0.09 * Math.sin(q * 11) : 0);
  } else if (q < SNATCH.load[1]) {
    const wx = lerp(1100, 275, ez(seg(q, SNATCH.load[0], SNATCH.load[1])));
    shadow(x, wx, 906, 52, 12);
    A.drawRemy(x, S.dressed, wx, 900, {
      flip: false,
      sx: 1.45,
      sy: 1.45,
      lean: 0.08 * Math.sin(q * 12),
      lift: [0, 0],
      stride: [0, 0],
    });
  }
  // motorcar
  shadow(x, carX - 10, carY + 5, 160 * carS, 13 * carS);
  ART.motorcar(x, carX, carY, carS, carX * 0.028, 1, roll);
  if (q >= SNATCH.load[1] && carOut < 0.92) {
    x.save();
    x.beginPath();
    x.rect(carX - 132 * carS, carY - 68 * carS, 106 * carS, 60 * carS);
    x.clip();
    A.drawRemy(x, S.dressed, carX - 70 * carS, carY + 2, {
      flip: true,
      sx: 0.92,
      sy: 0.92,
      lift: [0, 0],
      stride: [0, 0],
    });
    A.drawRemy(x, S.goon1, carX - 108 * carS, carY + 2, {
      flip: true,
      sx: 0.86,
      sy: 0.86,
      lift: [0, 0],
      stride: [0, 0],
    });
    x.restore();
    if (carOut > 0.05) {
      const wy = carY - 92 * carS + 5 * Math.sin(q * 9);
      ART.comb(x, carX - 150 * carS, wy, 1.15, 0.3 + 0.2 * Math.sin(q * 9));
      ART.sparkle(x, carX - 150 * carS + 10, wy - 6, 12, 0.5 + 0.4 * Math.sin(q * 7), q);
    }
  }
  // Lord Baldwin steps out, supervises, then struts off right after his hirelings
  if (q >= SNATCH.boss[0]) {
    const bx =
      q < SNATCH.carOut[0]
        ? lerp(420, 452, ez(seg(q, SNATCH.boss[0], SNATCH.boss[1])))
        : lerp(452, 1760, seg(q, SNATCH.carOut[0], SNATCH.carOut[0] + 1.1) ** 1.4);
    if (bx < 1700) {
      const walking = q >= SNATCH.carOut[0];
      shadow(x, bx, 946, 54, 13);
      A.drawRemy(x, S.villain, bx, 940, {
        flip: false,
        sx: 1.5,
        sy: 1.5,
        ...(walking ? walkPose(q * 7) : idle(q, 1.6)),
      });
      const h = headTop(S.villain, bx, 940, 1.5, walking ? 0.05 : idle(q).lean);
      ART.topHat(x, h.x - 4, h.y + 2, 1.5, walking ? 0.04 : -0.03);
      ART.cane(x, bx + 62, 844, walking ? 0.45 + 0.1 * Math.sin(q * 4) : 0.25 + 0.04 * Math.sin(q * 2), 1.5);
    }
  }
  // goons: sneak in, snatch the comb, seize her, board
  for (const [R, d, tx, col] of [
    [S.goon1, 0, 1075, "#6a5236"],
    [S.goon2, 0.35, 975, "#54584a"],
  ]) {
    if (q >= SNATCH.load[1]) continue; // aboard
    let gx, pose;
    if (q < SNATCH.sneak[1] + d) {
      gx = lerp(-120, tx, ez(seg(q, SNATCH.sneak[0] + d, SNATCH.sneak[1] + d)));
      pose = sneakPose(gx * 0.06);
    } else if (q <= SNATCH.load[0]) {
      gx = tx;
      pose = idle(q, 2);
    } else {
      gx = lerp(tx, tx - 90, ez(seg(q, SNATCH.load[0], SNATCH.load[1])));
      pose = walkPose(q * 7);
    }
    shadow(x, gx, 937, 46, 11);
    A.drawRemy(x, R, gx, 932, { flip: false, sx: 1.35, sy: 1.35, ...pose });
    const h = headTop(R, gx, 932, 1.35, pose.lean ?? 0);
    ART.flatCap(x, h.x, h.y, 1.35, 1, col);
  }
  // the comb arcs from the vanity into goon1's fist
  const cu = seg(q, g0, g0 + 0.55);
  if (cu > 0 && cu < 1) {
    const cx = lerp(1100, 1075, cu),
      cy = 700 - 130 * Math.sin(cu * PI);
    ART.comb(x, cx, cy, 1.2, cu * 12);
    ART.sparkle(x, cx, cy - 8, 13, 0.9, cu * 9);
  } else if (q >= g0 + 0.55 && q < SNATCH.load[1]) {
    ART.comb(x, 1075, 812, 1.15, 0.2);
  }
  // hero arrives too late
  const hu = ez(seg(q, SNATCH.heroIn[0], SNATCH.heroIn[1]));
  if (hu > 0) {
    const hx = lerp(-90, 760, hu);
    const mad = q > SNATCH.heroIn[1] - 0.5;
    shadow(x, hx, 906, 52, 12);
    A.drawRemy(x, S.hero, hx, 900, {
      flip: false,
      sx: S1,
      sy: S1,
      ...(mad ? { lean: -0.05 + 0.045 * Math.sin(q * 10), lift: [0, 0], stride: [0, 0] } : runPose(hx * 0.1)),
    });
  }
  twirlInsert(x, S, q, SNATCH.twirl);
  // exhaust puffs on the getaway
  if (carOut > 0 && carOut < 1) {
    const list = [];
    for (let i = 0; i < 14; i++) {
      const g = SNATCH.carOut[0] + i * 0.12;
      if (g > q) break;
      list.push({
        g,
        x: lerp(330, 2150, seg(g, SNATCH.carOut[0], SNATCH.carOut[1]) ** 2.2) - 160,
        y: carY - 30,
        r0: 6,
      });
    }
    ART.puffs(x, q, list, 1.2);
  }
}

function twirlInsert(x, S, q, [a, b]) {
  const u = seg(q, a, b);
  if (u <= 0 || u >= 1) return;
  const fade = Math.min(1, Math.min(u, 1 - u) * 6);
  x.save();
  x.globalAlpha = fade;
  x.fillStyle = "rgba(14,9,4,0.62)";
  x.fillRect(0, 0, SW, SH);
  const w = 520,
    h = 668,
    cx = SW / 2,
    cy = 500;
  const pop = E.outBack(Math.min(1, u * 5));
  x.save();
  x.translate(cx, cy);
  x.scale(pop, pop);
  x.drawImage(S.bossCard, -w / 2, -h / 2, w, h);
  ART.topHat(x, -6, -196, 1.9, -0.05);
  // monocle over the eye, chain down to the lapel
  x.strokeStyle = "#e8d8b0";
  x.lineWidth = 3;
  x.beginPath();
  x.arc(90, -58, 20, 0, 7);
  x.stroke();
  x.beginPath();
  x.moveTo(90, -38);
  x.quadraticCurveTo(104, -14, 92, 10);
  x.stroke();
  x.fillStyle = "rgba(240,230,200,0.85)";
  x.beginPath();
  x.arc(90, -58, 5, 0, 7);
  x.fill();
  const tw = 0.55 * Math.sin(q * 8.5);
  x.strokeStyle = "#1c1208";
  x.lineWidth = 9;
  x.lineCap = "round";
  x.beginPath();
  x.moveTo(-6, -34);
  x.quadraticCurveTo(-52, -42 - tw * 26, -78, -26 - tw * 40);
  x.moveTo(6, -34);
  x.quadraticCurveTo(52, -42 + tw * 26, 78, -26 + tw * 40);
  x.stroke();
  x.lineWidth = 4;
  x.beginPath();
  x.arc(-80, -24 - tw * 44, 11, -2.6, 0.6);
  x.stroke();
  x.beginPath();
  x.arc(80, -24 + tw * 44, 11, PI - 0.6, PI + 2.6);
  x.stroke();
  x.restore();
  x.fillStyle = "rgba(20,12,6,0.5)";
  x.fillRect(cx - 260, cy + h / 2 - 26, 520, 78);
  x.strokeStyle = "#e8d8b0";
  x.lineWidth = 2;
  x.strokeRect(cx - 260, cy + h / 2 - 26, 520, 78);
  x.fillStyle = "#efe2c0";
  x.font = 'italic 34px "Cormorant Garamond"';
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("“THE HAIRLOOM IS MINE!”", cx, cy + h / 2 + 13);
  x.restore();
}

// ---------- S4 / S6 · intertitle cards ----------
export function drawCardPeril(x, S, lt) {
  x.drawImage(S.setCardPlain, 0, 0);
  const q = crank(lt);
  x.fillStyle = "#4c3a24";
  for (let i = 0; i < 5; i++) x.fillRect(SW / 2 - 150 + i * 76, 848, 54, 14);
  x.fillStyle = "#3a2c1a";
  x.fillRect(SW / 2 - 170, 840, 340, 5);
  x.fillRect(SW / 2 - 170, 866, 340, 5);
  ART.comb(x, SW / 2, 918, 1.6, 0);
  ART.sparkle(x, SW / 2 + 12, 908, 13, 0.5 + 0.45 * Math.sin(q * 3), q * 2);
  ART.circleIris(x, 0, 1 - seg(lt, 0.1, 0.7), SW / 2, SH / 2, 1150);
}
export function drawCardHero(x, S, lt) {
  x.drawImage(S.setCardPlain, 0, 0);
  const q = crank(lt);
  // Fairhair's sabre: grip, guard, curved blade
  x.strokeStyle = "#3a2c1a";
  x.lineWidth = 11;
  x.lineCap = "round";
  x.beginPath();
  x.moveTo(SW / 2 - 14, 774);
  x.lineTo(SW / 2 - 6, 752);
  x.stroke();
  x.strokeStyle = "#8a7454";
  x.lineWidth = 10;
  x.beginPath();
  x.moveTo(SW / 2 - 6, 752);
  x.quadraticCurveTo(SW / 2 + 28, 856, SW / 2 + 6, 946);
  x.stroke();
  x.strokeStyle = "#d9c9a2";
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(SW / 2 - 6, 752);
  x.quadraticCurveTo(SW / 2 + 28, 856, SW / 2 + 6, 946);
  x.stroke();
  x.strokeStyle = "#463019";
  x.lineWidth = 8;
  x.beginPath();
  x.moveTo(SW / 2 - 36, 762);
  x.quadraticCurveTo(SW / 2 - 6, 744, SW / 2 + 22, 760);
  x.stroke();
  ART.sparkle(x, SW / 2 + 14, 780, 15, 0.4 + 0.4 * Math.sin(q * 4), 0);
  ART.circleIris(x, 0, 1 - seg(lt, 0.1, 0.7), SW / 2, SH / 2, 1150);
}

// ---------- S5 · the rail cut ----------
const distTrain = (q) => {
  const u = seg(q, TRACKS.trainAppear + 0.8, 11.6);
  return { x: 60 + u * 330, y: 770, s: 0.26 + 0.29 * u, a: 60 / 24 + u * 14 };
};
export function drawTracks(x, S, lt) {
  const q = crank(lt);
  x.drawImage(S.setRail, 0, 0);
  const D = distTrain(q);
  if (q > TRACKS.trainAppear) {
    const list = [];
    let i = 0;
    for (let g = TRACKS.trainAppear; g <= 11.6; g += 0.55, i++) {
      if (g > q) break;
      const dd = distTrain(g);
      list.push({ g, x: dd.x + 130 * dd.s, y: dd.y - 200 * dd.s, r0: 7 + i * 0.4 });
    }
    ART.puffs(x, q, list, 0.8);
    ART.loco(x, D.x, D.y, D.s, D.a, { cars: 2 });
  }
  tiedHeroine(x, S, q);
  // the Cabald, right: villain swings his watch; goon1 holds the comb aloft
  A.drawRemy(x, S.villain, 1160, 838, { flip: true, sx: 1.5, sy: 1.5, ...idle(q, 1.4) });
  const hv = headTop(S.villain, 1160, 838, 1.5, 0);
  ART.topHat(x, hv.x - 4, hv.y + 2, 1.5, 0.03);
  if (q >= TRACKS.watch[0] && q < TRACKS.watch[1]) ART.pocketWatch(x, 1112, 742, 0.34 * Math.sin(q * 3.2), 1.25);
  else ART.cane(x, 1108, 742, 0.2, 1.5);
  A.drawRemy(x, S.goon1, 1272, 842, { flip: true, sx: 1.4, sy: 1.4, ...idle(q, 2) });
  const h1 = headTop(S.goon1, 1272, 842, 1.4, 0);
  ART.flatCap(x, h1.x - 3, h1.y, 1.4, -1, "#6a5236");
  // the trophy: the Golden Comb held high
  ART.comb(x, 1272, h1.y - 30, 1.35, 0.1);
  ART.sparkle(x, 1286, h1.y - 40, 20, 0.55 + 0.45 * Math.sin(q * 2.6), q);
  A.drawRemy(x, S.goon2, 1352, 844, { flip: true, sx: 1.35, sy: 1.35, ...idle(q, 1.8) });
  const h2 = headTop(S.goon2, 1352, 844, 1.35, 0);
  ART.flatCap(x, h2.x - 3, h2.y, 1.35, -1, "#54584a");
  // Fairhair runs in from the foreground, shrinking into the shot
  const [r0, r1] = TRACKS.heroIn;
  let hx, hy, hs;
  if (q < r0 + 4.4) {
    const e = ez(seg(q, r0, r0 + 4.4));
    hx = lerp(-170, 640, e);
    hy = lerp(1018, 860, e);
    hs = lerp(2.5, 1.75, e);
  } else {
    const e = ez(seg(q, r0 + 4.4, r1));
    hx = lerp(640, 760, e);
    hy = lerp(860, 822, e);
    hs = lerp(1.75, 1.55, e);
  }
  shadow(x, hx, hy + 5, (52 * hs) / 1.6, (12 * hs) / 1.6);
  A.drawRemy(x, S.hero, hx, hy, { flip: false, sx: hs, sy: hs, ...runPose(hx * 0.15), glow: "#f8e8c0", glowA: 0.22 });
}

// heroine tied across the rails; returns head-end x (ropes anchor off it)
function tiedHeroine(x, S, q) {
  const R = S.dressed,
    anchor = 1030,
    y = 812,
    s = 1.4;
  shadow(x, anchor - 75, y + 16, 96, 15);
  const wig = 0.03 * Math.sin(q * 2.6);
  A.drawRemy(x, R, anchor, y, { flip: false, sx: s, sy: s, rot: -PI / 2 + wig, lift: [0, 0], stride: [0, 0] });
  // silver hair fanned on the ballast at her head end
  const headX = anchor - (R.bottom - R.top) * s;
  x.strokeStyle = "rgba(224,214,190,0.65)";
  x.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    x.beginPath();
    x.moveTo(headX + 6, y - 4 + i * 7);
    x.quadraticCurveTo(headX - 14, y - 8 + i * 8, headX - 24 - i * 5, y + 2 + i * 9);
    x.stroke();
  }
  return headX;
}
function ropeBands(x, q, headX) {
  for (let i = 0; i < 3; i++) {
    const rx = lerp(headX + 8, 1024, [0.3, 0.55, 0.8][i]);
    const snapG = RESCUE.snap[i < 2 ? i : 1];
    ART.ropeBand(x, rx, 812, 12, 62, q < snapG ? -1 : q - snapG);
  }
}

// ---------- S7 · the rescue ----------
export function drawRescue(x, S, lt) {
  const { g: q, stop } = warp(crank(lt));
  x.drawImage(S.setRail, 0, 0);
  const inPass = q >= RESCUE.trainPass[0] && q <= RESCUE.trainPass[1];
  const wind = seg(q, 8.9, 9.9); // the slipstream catches them as the caboose clears
  // ---- villain state machine ----
  let vx = 1160,
    vrot = 0,
    vlean = idle(q).lean,
    vsy = 1.5,
    gone = false;
  if (q < RESCUE.strut[0]) vx = 1160;
  else if (q < RESCUE.strut[1]) vx = lerp(1160, 1000, ez(seg(q, RESCUE.strut[0], RESCUE.strut[1])));
  else if (q < RESCUE.clash) vx = duelX("villain", q);
  else if (q < RESCUE.fall) {
    vx = 1005;
    vlean = -0.28 * seg(q, RESCUE.clash, RESCUE.fall);
  } // staggered
  else if (q < 5.15) {
    vx = 1005;
    vrot = 1.05 * seg(q, RESCUE.fall, 5.15) ** 1.6;
  } // topples backward, away from the hero
  else if (q < 6.4) {
    vx = lerp(1005, 1150, ez(seg(q, 5.15, 6.4)));
    vrot = 0.35;
    vsy = 1.22;
  } // slumped, dragged
  else if (q < 7.0) {
    vx = 1150;
    vrot = lerp(0.35, 0, ez(seg(q, 6.4, 7.0)));
    vsy = lerp(1.22, 1.5, ez(seg(q, 6.4, 7.0)));
    vlean = 0.09 * Math.sin(q * 8);
  } else if (wind < 1) {
    vx = 1150 + 470 * wind ** 1.7;
    vlean = -0.06 - 0.55 * wind;
    if (wind > 0.5) vrot = 1.25 * ((wind - 0.5) / 0.5) ** 1.4;
    if (vx > 1560) gone = true;
  } else gone = true;
  if (!gone) {
    shadow(x, vx, 843, 54, 12);
    A.drawRemy(x, S.villain, vx, 838, {
      flip: true,
      sx: 1.5,
      sy: vsy,
      rot: vrot,
      lean: vlean,
      lift: [0, 0],
      stride: [0, 0],
      ...(stop ? { white: true } : {}),
    });
    if (q < RESCUE.hatFly) {
      const h = headTop(S.villain, vx, 838, vsy / 1.5, vlean);
      ART.topHat(x, h.x - 4, h.y + 2, 1.5, 0.03 + (q > RESCUE.duel[0] ? 0.04 * Math.sin(q * 6) : 0));
    } else drawFlyingHat(x, q);
    if (q < RESCUE.fall && q > RESCUE.strut[0]) ART.cane(x, vx - 58, 742, caneAng(q), 1.5);
    if (q >= RESCUE.fall && q < 6.5) dizzyStars(x, q, vx + 40, 756);
  }
  // ---- goons ----
  const g1Home = q < RESCUE.combDrop ? 1272 : lerp(1272, 1310, ez(seg(q, RESCUE.combDrop, RESCUE.strut[1])));
  const g1Drag = lerp(1310, 1180, ez(seg(q, RESCUE.drag[0], 5.15)));
  const g2Home = q < RESCUE.strut[1] ? lerp(1352, 1080, ez(seg(q, RESCUE.strut[0], RESCUE.strut[1]))) : 1080;
  const g2Drag = lerp(1080, 1055, ez(seg(q, RESCUE.drag[0], 5.15)));
  for (const [R, col, i, home, dragX] of [
    [S.goon1, "#6a5236", 0, g1Home, g1Drag],
    [S.goon2, "#54584a", 1, g2Home, g2Drag],
  ]) {
    let gx = q >= 5.15 ? dragX : home,
      glean = idle(q, 2 + i).lean,
      grot = 0,
      draw = true;
    const startle = i === 0 && q >= RESCUE.combDrop && q < RESCUE.combDrop + 0.5;
    if (wind > 0) {
      const base = i === 0 ? 1180 : 1055;
      gx = base + 480 * wind ** 1.7 + i * 26 * wind;
      glean = -0.06 - 0.55 * wind + (i === 1 && wind > 0.15 && wind < 0.55 ? 0.09 * Math.sin(q * 11) : 0);
      if (wind > 0.5) grot = 1.25 * ((wind - 0.5) / 0.5) ** 1.4;
      if (gx > 1560 || wind >= 1) draw = false;
    }
    if (!draw) continue;
    shadow(x, gx, 847, 46, 11);
    A.drawRemy(x, R, gx, 842, {
      flip: true,
      sx: 1.35,
      sy: 1.35,
      rot: grot,
      lean: glean,
      ...(startle ? { lift: [10, 10], lean: -0.18 } : { lift: [0, 0], stride: [0, 0] }),
    });
    const h = headTop(R, gx, 842, 1.35, 0);
    ART.flatCap(x, h.x - 3, h.y, 1.35, -1, col);
  }
  // ---- heroine ----
  const [rs0, rs1] = RESCUE.rise;
  const heroineMode = q >= RESCUE.combPick[0] ? "walk" : q >= rs0 ? "rising" : "tied";
  let heroineX = 1030,
    heroineY = 812,
    heroineRot = -PI / 2,
    heroinePose = { lift: [0, 0], stride: [0, 0], lean: 0 };
  if (heroineMode === "tied") heroineRot += 0.03 * Math.sin(q * 2.6);
  else if (heroineMode === "rising") {
    const u = ez(seg(q, rs0, rs1));
    heroineX = lerp(1030, 920, u);
    heroineRot = lerp(-PI / 2, 0, u);
    heroineY = q < 7.2 ? 812 : lerp(812, 848, seg(q, 7.2, 7.6));
    heroinePose = { lean: 0.1 * (1 - u) * Math.sin(q * 9), lift: [0, 0], stride: [0, 0] };
  } else {
    heroineX = lerp(920, 1005, ez(seg(q, RESCUE.combPick[0], RESCUE.combPick[1])));
    heroineY = 848;
    heroineRot = 0;
    if (q < RESCUE.combPick[1]) heroinePose = walkPose(q * 7);
    else if (q < RESCUE.combUp)
      heroinePose = { lean: 0.13, sy: 1.28, lift: [2, 2], stride: [0, 0] }; // scoops it up
    else if (q < RESCUE.bows) heroinePose = idle(q, 1.4);
    else heroinePose = curtsey(q, RESCUE.bows);
  }
  const drawHeroine = () => {
    if (heroineMode === "tied") {
      const headX = tiedHeroine(x, S, q);
      ropeBands(x, q, headX);
    } else {
      shadow(x, heroineX, heroineY + 6, 50, 12);
      A.drawRemy(x, S.dressed, heroineX, heroineY, {
        flip: false,
        sx: 1.4,
        sy: heroinePose.sy ?? 1.4,
        rot: heroineRot,
        ...heroinePose,
        ...(stop ? { white: true } : {}),
      });
    }
  };
  // snapped rope ends left on the rails
  const drawRopeEnds = () => {
    if (q >= rs0 && q < rs0 + 0.3) {
      for (let i = 0; i < 2; i++) ART.ropeBand(x, lerp(900, 1010, i), 812, 12, 62, q - RESCUE.snap[i]);
    }
  };
  // ---- hero ----
  let heroX,
    heroY = 826,
    heroPose;
  if (q < RESCUE.land[1]) {
    const u = seg(q, RESCUE.land[0], RESCUE.land[1]);
    heroX = lerp(760, 900, ez(u));
    heroY = 826 - 66 * Math.sin(u * PI);
    heroPose = u > 0.82 ? { lean: 0.12, lift: [4, 4], stride: [0, 0], sy: S1 - 0.1 } : runPose(u * 18);
  } else if (q < RESCUE.duel[0]) {
    heroX = 900 + (q > RESCUE.strut[0] ? 30 * Math.sin(q * 2.2) : 0);
    heroPose = idle(q, 2);
  } else if (q < RESCUE.clash) {
    heroX = duelX("hero", q);
    heroPose = { lean: 0.1, lift: [0, 2], stride: [-2, 2] };
  } else if (q < RESCUE.ropes[0]) {
    heroX = lerp(950, 968, ez(seg(q, RESCUE.clash + 0.4, RESCUE.ropes[0])));
    heroPose = idle(q, 2);
  } else if (q < rs1) {
    heroX = 968;
    heroPose = sawPose(q, RESCUE.ropes);
  } else if (q < RESCUE.bows) {
    heroX = 968;
    heroPose = idle(q, 1.5);
  } else {
    heroX = 968;
    heroPose = bowCycle(q, RESCUE.bows);
  }
  const drawHero = () => {
    shadow(x, heroX, heroY + 4, 54, 12);
    A.drawRemy(x, S.hero, heroX, heroY, {
      flip: false,
      sx: S1,
      sy: heroPose.sy ?? S1,
      ...heroPose,
      ...(stop ? { white: true } : {}),
      glow: "#f8e8c0",
      glowA: stop ? 0.8 : 0.25,
    });
  };
  // depth order: while she lies on the rails he stands nearer; once she's up she steps in front
  if (heroineMode === "tied" || heroineMode === "rising") {
    drawHeroine();
    drawRopeEnds();
    drawHero();
  } else {
    drawHero();
    drawHeroine();
  }
  swordArcs(x, q);
  sparks(x, q, RESCUE.clashA, 975, 762, 7);
  sparks(x, q, RESCUE.clashB, 968, 770, 7);
  sparks(x, q, RESCUE.clash, 978, 762, 18);
  flungComb(x, q);
  monocleFlight(x, q);
  // ---- the train ----
  if (inPass) {
    const ts = 1.9,
      ty = 838,
      tx = trainX(q);
    const list = [];
    for (let i = 0; i < 40; i++) {
      const pg = RESCUE.trainPass[0] + 0.05 + i * 0.13;
      if (pg > q) break;
      list.push({ g: pg, x: trainX(pg) + 266, y: ty - 399, r0: 22 });
    }
    ART.puffs(x, q, list, 1.15);
    ART.loco(x, tx, ty, ts, tx / 118, { cars: 1 });
    x.strokeStyle = "rgba(240,230,205,0.20)";
    x.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const sx = ((hash(i * 31 + 7) * 1600 + q * 1500) % 1700) - 130;
      const sy = 802 + hash(i * 17) * 130;
      x.beginPath();
      x.moveTo(sx, sy);
      x.lineTo(sx - 90 - hash(i) * 60, sy);
      x.stroke();
    }
    if (q > RESCUE.trainPass[0] + 0.5 && q < RESCUE.trainPass[1] - 0.3) {
      hairBlast(x, heroineMode === "tied" ? 900 : heroineX, heroineMode === "tied" ? 760 : heroineY - 168, 1.4, q);
      hairBlast(x, heroX, heroY - 176, 1.6, q);
    }
  } else if (q > RESCUE.trainPass[1]) {
    const list = [];
    for (let i = 0; i < 40; i++) {
      const pg = RESCUE.trainPass[0] + 0.05 + i * 0.13;
      if (pg > RESCUE.trainPass[1]) break;
      list.push({ g: pg, x: trainX(pg) + 266, y: 838 - 399, r0: 22 });
    }
    ART.puffs(x, q, list, 1.15);
  }
  fibrePuffs(x, q, RESCUE.snap[0], 950);
  fibrePuffs(x, q, RESCUE.snap[1], 990);
  finaleBeats(x, q);
}

// duel footwork: advance/retreat around the clash points; final clash leaves a readable gap
function duelX(who, q) {
  const knot = (t0, t1, a, b) => lerp(a, b, ez(seg(q, t0, t1)));
  if (who === "hero") {
    if (q < RESCUE.clashA) return knot(2.8, 3.0, 900, 940);
    if (q < 3.5) return knot(3.0, 3.5, 940, 915);
    return knot(3.9, 4.4, 915, 935);
  }
  if (q < RESCUE.clashA) return knot(2.8, 3.0, 1000, 1002);
  if (q < 3.5) return knot(3.0, 3.5, 1002, 1010);
  return knot(3.9, 4.4, 1010, 1022);
}
const caneAng = (q) => {
  if (q < 3.14) return 0.2;
  if (q < 3.32) return lerp(0.2, -1.9, seg(q, 3.14, 3.32));
  if (q < 3.66) return -1.9;
  if (q < 3.9) return lerp(-1.9, -2.4, seg(q, 3.66, 3.9));
  if (q < RESCUE.clash) return -2.4;
  return 0.2;
};
function swordArcs(x, q) {
  const arcs = [
    [2.86, 3.04, 1],
    [3.5, 3.68, -1],
    [4.24, 4.42, 1],
    [5.4, 5.6, 1],
    [5.9, 6.1, -1],
    [6.3, 6.5, 1],
  ];
  for (const [a, b, dir] of arcs) {
    if (q < a || q > b + 0.12) continue;
    const u = seg(q, a, b);
    const px = q >= RESCUE.ropes[0] ? 968 : duelX("hero", q);
    const fade = 1 - seg(q, b, b + 0.12);
    const r = 96 * 1.6,
      cx = px + 30,
      cy = 826 - 141;
    const a0 = -2.2,
      a1 = -0.5;
    const cur = lerp(dir > 0 ? a0 : a1, dir > 0 ? a1 : a0, u);
    x.save();
    x.strokeStyle = `rgba(255,244,214,${0.55 * fade})`;
    x.lineWidth = 7;
    x.lineCap = "round";
    x.beginPath();
    x.arc(cx, cy, r, Math.min(cur, cur - dir * 0.9), Math.max(cur, cur - dir * 0.9));
    x.stroke();
    x.strokeStyle = `rgba(255,255,255,${0.85 * fade})`;
    x.lineWidth = 3;
    x.beginPath();
    x.arc(cx, cy, r, Math.min(cur, cur - dir * 0.4), Math.max(cur, cur - dir * 0.4));
    x.stroke();
    x.restore();
  }
}
function sawPose(q, strokes) {
  const active = strokes.some((s0) => q >= s0 - 0.1 && q <= s0 + 0.25);
  return active ? { lean: 0.16, lift: [2, 4], stride: [3, -3] } : { lean: 0.06, lift: [0, 0], stride: [0, 0] };
}
function bowCycle(q, b0) {
  const u = q < b0 ? 0 : Math.abs(Math.sin((q - b0) * 3.4));
  return { lean: 0.22 * u, sy: S1 - 0.14 * u, lift: [0, 0], stride: [0, 0] };
}
function curtsey(q, b0) {
  const u = q < b0 ? 0 : Math.abs(Math.sin((q - b0) * 3.4 + 1.2));
  return { lean: 0.03, lift: [0, 0], stride: [0, 0], sy: 1.4 - 0.16 * u };
}
function drawFlyingHat(x, q) {
  const g0 = RESCUE.hatFly;
  const age = q - g0;
  const x0 = 1005,
    y0 = 690,
    vx = 150,
    vy = -520,
    grav = 1700;
  const tl = (520 + Math.sqrt(520 * 520 + 2 * 1700 * (832 - y0))) / 1700;
  let hx, hy, rot;
  if (age < tl) {
    hx = x0 + vx * age;
    hy = y0 + vy * age + 0.5 * grav * age * age;
    rot = 7 * age;
  } else {
    const roll = Math.min(1, (age - tl) / 0.9);
    hx = x0 + vx * tl + 34 * roll;
    hy = 832;
    rot = 7 * tl + 1.35 + 2 * roll;
    const wind = seg(q, 9.0, 9.9);
    if (wind > 0) {
      hx += 460 * wind ** 1.6;
      rot += 9 * wind;
      hy = 832 - 6 * Math.sin(wind * PI);
    }
    if (hx > 1560) return;
  }
  ART.topHat(x, hx, hy, 1.5, rot);
}
function dizzyStars(x, q, cx, cy) {
  for (let i = 0; i < 3; i++) {
    const a = q * 5 + (i / 3) * Math.PI * 2;
    star4(x, cx + Math.cos(a) * 36, cy + Math.sin(a) * 13 - 8, 9, "rgba(250,235,190,0.9)", a);
  }
}
function star4(x, cx, cy, r, col, rot) {
  x.save();
  x.translate(cx, cy);
  x.rotate(rot);
  x.fillStyle = col;
  x.beginPath();
  x.moveTo(0, -r);
  x.lineTo(r * 0.3, -r * 0.3);
  x.lineTo(r, 0);
  x.lineTo(r * 0.3, r * 0.3);
  x.lineTo(0, r);
  x.lineTo(-r * 0.3, r * 0.3);
  x.lineTo(-r, 0);
  x.lineTo(-r * 0.3, -r * 0.3);
  x.closePath();
  x.fill();
  x.restore();
}
function sparks(x, q, g0, cx, cy, n) {
  const age = q - g0;
  if (age < 0 || age > 0.4) return;
  for (let i = 0; i < n; i++) {
    const a = hash(i * 13 + g0 * 7) * Math.PI * 2,
      sp = 120 + hash(i * 7 + g0) * 260;
    const px = cx + Math.cos(a) * sp * age,
      py = cy + Math.sin(a) * sp * age + 300 * age * age;
    x.strokeStyle = `rgba(255,248,222,${1 - age / 0.4})`;
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px - Math.cos(a) * 10, py - Math.sin(a) * 10 - 2);
    x.stroke();
  }
  ART.sparkle(x, cx, cy, 26 * (1 - age / 0.4) + 6, 1 - age / 0.4, age * 6);
}
function flungComb(x, q) {
  const g0 = RESCUE.combDrop;
  const from = { x: 1262, y: 706 },
    to = { x: 1010, y: 838 };
  if (q < g0 || q > RESCUE.combPick[1]) return; // she picks it up from there
  if (q < g0 + 0.7) {
    const u = seg(q, g0, g0 + 0.7);
    const cx = lerp(from.x, to.x, u),
      cy = lerp(from.y, to.y, u) - 150 * Math.sin(u * PI);
    ART.comb(x, cx, cy, 1.15, u * 14);
    ART.sparkle(x, cx, cy - 6, 12, 0.85, u * 10);
  } else {
    ART.comb(x, to.x, to.y, 1.05, 0.1);
    ART.sparkle(x, to.x + 8, to.y - 6, 11, 0.4 + 0.4 * Math.sin(q * 3), q * 2);
  }
}
function monocleFlight(x, q) {
  const g0 = RESCUE.monocle;
  if (q < g0 || q > g0 + 0.8) return;
  const age = q - g0;
  const mx = 1155 + 130 * age,
    my = 770 - 260 * age + 900 * age * age;
  x.strokeStyle = "#e8d8b0";
  x.lineWidth = 2.5;
  x.beginPath();
  x.arc(mx, my, 8, 0, 7);
  x.stroke();
  ART.sparkle(x, mx, my, 8, Math.max(0, 1 - age * 1.6), age * 9);
}
function fibrePuffs(x, q, g0, cx) {
  const age = q - g0;
  if (age < 0 || age > 0.5) return;
  for (let i = 0; i < 5; i++) {
    const a = -PI / 2 + (hash(i * 5 + g0 * 3) - 0.5) * 1.6;
    const px = cx + (hash(i + g0) - 0.5) * 30 + Math.cos(a) * 50 * age;
    const py = 806 + Math.sin(a) * 60 * age + 140 * age * age;
    x.fillStyle = `rgba(214,196,160,${0.8 * (1 - age / 0.5)})`;
    x.fillRect(px, py, 3, 3);
  }
}
function hairBlast(x, hx, hy, s, q) {
  x.strokeStyle = "rgba(250,240,220,0.55)";
  x.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const y0 = hy + i * 14 * s - 14;
    x.beginPath();
    x.moveTo(hx - 8, y0);
    x.quadraticCurveTo(hx - 30 - i * 9, y0 + 4, hx - 52 - i * 14, y0 + 12 + 4 * Math.sin(q * 22 + i));
    x.stroke();
  }
}
// the reclaimed Hairloom: she scoops it up, holds it aloft, one comb stroke — glint and hearts
function finaleBeats(x, q) {
  const pick = RESCUE.combPick[1];
  if (q < pick) return; // still on the ground (flungComb draws it)
  if (q < RESCUE.stroke) {
    if (q < RESCUE.combUp) {
      // scooped up, then held aloft
      const u = ez(seg(q, pick, RESCUE.combUp));
      const cy = lerp(810, 660, u);
      ART.comb(x, 1005, cy, 1.15, 0.1);
      ART.sparkle(x, 1016, cy - 10, 15, 0.5 + 0.5 * Math.sin(q * 6), q * 3);
      if (q > RESCUE.ring && q < RESCUE.ring + 0.4) {
        const age = q - RESCUE.ring;
        x.strokeStyle = `rgba(255,246,214,${0.7 * (1 - age / 0.4)})`;
        x.lineWidth = 4;
        x.beginPath();
        x.arc(1005, 660, 26 + 110 * age, 0, 7);
        x.stroke();
      }
    } else {
      ART.comb(x, 1005, 660, 1.15, 0.1);
    }
  } else if (q < RESCUE.stroke + 0.4) {
    // one stroke through her silver hair
    const u = seg(q, RESCUE.stroke, RESCUE.stroke + 0.4);
    ART.comb(x, 963, 698 + 30 * ez(u), 1.1, 0.15);
    ART.sparkle(x, 952, 700 + 30 * ez(u), 17 * Math.sin(u * PI) + 4, Math.sin(u * PI), u * 5);
  } else {
    ART.comb(x, 1017, 770, 1.05, 0.1);
  }
  const [h0, h1] = RESCUE.hearts;
  if (q >= h0 && q <= h1 + 0.4) {
    for (let i = 0; i < 3; i++) {
      const age = q - (h0 + i * 0.45);
      if (age < 0 || age > 1.6) continue;
      const u = age / 1.6;
      x.save();
      x.globalAlpha = Math.sin(u * PI) * 0.85;
      x.fillStyle = "#e8c9a8";
      ART.heartPath(x, 985 + Math.sin(i * 2.4) * 26, 628 - u * 90, 13);
      x.fill();
      x.restore();
    }
  }
}

// ---------- S8 · sunset stroll ----------
export function drawFinale(x, S, lt, t) {
  const q = crank(lt);
  x.drawImage(S.setRail, 0, 0);
  // the low sun, sinking behind the fields
  const sun = x.createRadialGradient(1150, 545, 40, 1150, 545, 640);
  sun.addColorStop(0, "rgba(255,208,140,0.6)");
  sun.addColorStop(1, "rgba(255,208,140,0)");
  x.fillStyle = sun;
  x.fillRect(0, 0, SW, SH);
  x.fillStyle = "rgba(255,222,158,0.75)";
  x.beginPath();
  x.arc(1150, 552, 54, 0, 7);
  x.fill();
  x.fillStyle = "rgba(255,240,205,0.9)";
  x.beginPath();
  x.arc(1150, 552, 28, 0, 7);
  x.fill();
  // the 5:15's smoke, far down the line
  const list = [];
  for (let i = 0; i < 10; i++) list.push({ g: 63 + i * 0.5, x: 1150 + i * 38, y: 640, r0: 11 + i });
  ART.puffs(x, t, list, 0.5);
  x.strokeStyle = "rgba(70,52,30,0.8)";
  x.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const bx = 240 + (q + i * 0.7) * 95,
      by = 250 + i * 34 + 14 * Math.sin(q * 3 + i * 2);
    const fl = 9 + 5 * Math.sin(q * 7 + i * 2.4);
    x.beginPath();
    x.moveTo(bx - fl, by - fl * 0.5);
    x.quadraticCurveTo(bx, by, bx + fl, by - fl * 0.5);
    x.stroke();
  }
  // the pair: she walks half a step nearer the camera, so she never vanishes behind him
  const [w0, w1] = FINALE.walk;
  const hx = lerp(260, 920, ez(seg(q, w0, w1)));
  const sheX = hx - 58;
  const walking = q < w1;
  x.fillStyle = "rgba(24,16,8,0.38)";
  x.beginPath();
  x.ellipse(hx - 60, 852, 130, 13, 0, 0, 7);
  x.fill();
  A.drawRemy(x, S.hero, hx, 830, {
    flip: false,
    sx: S1,
    sy: S1,
    ...(walking ? walkPose(hx * 0.055) : { lift: [0, 0], stride: [0, 0], lean: -0.02 }),
    glow: "#ffdda0",
    glowA: 0.3,
  });
  A.drawRemy(x, S.dressed, sheX, 848, {
    flip: false,
    sx: 1.4,
    sy: 1.4,
    ...(walking ? walkPose((hx + 20) * 0.055) : { lift: [0, 0], stride: [0, 0], lean: 0.02 }),
  });
  if (q >= FINALE.stroke) {
    const u2 = seg(q, FINALE.stroke, FINALE.stroke + 0.5);
    ART.comb(x, sheX - 34, 664 + 26 * ez(u2), 1.0, 0.2);
    ART.sparkle(x, sheX - 22, 666, 15 * Math.sin(u2 * PI) + 3, Math.sin(u2 * PI), u2 * 5);
  }
  const hk = seg(q, FINALE.heart[0], FINALE.heart[1]) - seg(q, FINALE.heart[2], FINALE.heart[3]);
  if (q >= FINALE.heart[3]) {
    x.fillStyle = "#0a0705";
    x.fillRect(0, 0, SW, SH); // heart finished closing — hold black to the cut
  } else if (hk > 0.001) ART.heartIris(x, 0, 1, hx - 24, 716, 330 * ez(hk), 0.8);
}

// ---------- S9 · FINIS ----------
export function drawFinis(x, S, lt) {
  x.drawImage(S.setCardPlain, 0, 0);
  const q = crank(lt);
  x.fillStyle = "rgba(70,48,20,0.25)";
  x.beginPath();
  x.ellipse(SW / 2, 816, 52, 14, 0, 0, 7);
  x.fill();
  ART.comb(x, SW / 2, 806, 2.2, 0);
  ART.sparkle(x, SW / 2 + 18, 794, 17, 0.4 + 0.45 * Math.sin(q * 2.8), q * 2);
  ART.circleIris(x, 0, seg(lt, FINIS.irisOut[0], FINIS.irisOut[1]), SW / 2, SH / 2, 1150);
}
