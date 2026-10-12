// OCEAN'S FORTY-TWO — a Remy Boys heist. 76 s, 120 BPM, cuts on the bar grid.
// Smooth 1080p media shots (strip, dossier, plan, title); pixel world shots paint a
// 960×540 stage (2× nearest) with the shared remy-bros rig. Type lives on the overlay.
import { W, H, hash, seg, lerp, E, txt } from 'filmkit/lib.js';
import * as M from 'filmkit/motion.js';
import * as A from '../remy-bros/art.js';
import * as ART from './art.js';
import { MARQUEE } from './art.js';
import { score } from './score.js';
import {
  T, EV, CAST, CREW, DURATION, LW, LH, VAULT_CLOCK, ALARM_CLOCK, FLASHES, CAPTIONS,
} from './timeline.js';

const S = {}; // prepared, read-only in draw
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const PS2P = '"Press Start 2P"';

const img = async (u) => { const i = new Image(); i.src = u; await i.decode(); return i; };
const portrait = (id) => img(new URL(`../../media/remy/Character${id}.webp`, import.meta.url).href);

// poses (pure in phase/time). Sprites face right natively; flip to face left.
const runCycle = (ph) => {
  const s = Math.sin(ph);
  return {
    lift: [Math.round(Math.max(0, s) * 9), Math.round(Math.max(0, -s) * 9)],
    stride: [Math.round(s * 3), Math.round(-s * 3)],
    lean: 0.09,
  };
};
const idle = (t, k = 1) => ({ lean: Math.sin(t * 2.2) * 0.012 * k, lift: [0, 0], stride: [0, 0] });

const ptext = (x, s, px, py, o = {}) => {
  txt(x, s, px, py, {
    size: o.size ?? 16, font: PS2P, color: o.color ?? '#f2ecff', align: o.align ?? 'left',
    shadow: o.shadow === null ? undefined : (o.shadow ?? '#120a1c'), alpha: o.alpha,
  });
};

function blit(ctx) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
}

async function prepare() {
  // rigs
  S.r42 = await A.loadRemy(CAST.LEADER, false);
  S.r32 = await A.loadRemy(CAST.GHOST, false);
  S.r66 = await A.loadRemy(CAST.WHEEL, false);
  S.r26 = await A.loadRemy(CAST.FACE, false);
  S.r9 = await A.loadRemy(CAST.SPARK, false);
  S.g585 = await A.loadRemy(CAST.GUARD_A, false);
  S.g458 = await A.loadRemy(CAST.GUARD_B, false);
  S.g744 = await A.loadRemy(CAST.PITBOSS, false);
  S.g468 = await A.loadRemy(CAST.SHADES, false);
  S.pA = await A.loadRemy(24, false); // floor patrons
  S.pB = await A.loadRemy(28, false);
  S.pC = await A.loadRemy(39, false);
  const heads = await A.loadHeads();
  S.head = {};
  for (const id of [CAST.LEADER, CAST.GHOST, CAST.WHEEL, CAST.FACE, CAST.SPARK, CAST.SHADES]) {
    S.head[id] = A.headIcon(heads, id, 2);
  }
  S.headBig452 = A.headIcon(heads, CAST.HOUSE, 5);

  // originals + ID cards
  S.port = {};
  for (const m of [...CREW, { id: CAST.HOUSE }]) S.port[m.id] = await portrait(m.id);
  S.cards = CREW.map((m) => ART.cardPanel(S.port[m.id], 540));

  // smooth bakes
  S.sky = ART.nightSky();
  S.cityFar = ART.cityFar();
  S.cityMid = ART.cityMid();
  S.facade = ART.facade();
  S.limo = ART.limo();
  S.blueprint = ART.blueprint();

  // pixel bakes
  S.floor = ART.floorBg(S.port[CAST.HOUSE]);
  S.slots = [ART.slot(1), ART.slot(2), ART.slot(3)];
  S.vent = ART.ventPanel();
  S.vault = ART.vaultRoom();
  S.door = ART.vaultDoor();
  S.mullet = ART.mullet(1);
  S.mulletS = ART.mullet(0.5);
  S.dome = ART.dome(1);
  S.car = ART.car();
  S.stanchion = ART.stanchion();
  S.dawn = ART.dawnSky();
  S.citySil = ART.citySil();

  S.low = A.canvas(LW, LH);
  S.inset = A.canvas(244, 134);      // security-cam inset scratch
  S.insetCore = A.canvas(122, 67);
}

// ---------- analytic particles ----------

function confetti(x, t0, g, cx, cy, n = 26) {
  const age = g - t0;
  if (age < 0 || age > 1.5) return;
  const cols = ['#ffd98a', '#ff5f9e', '#59d6d0', '#fff8e0'];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (hash(i * 7 + 3) - 0.5) * 1.9;
    const sp = 90 + hash(i * 11 + 1) * 150;
    const px = cx + Math.cos(a) * sp * age;
    const py = cy + Math.sin(a) * sp * age + 260 * age * age;
    if (py > LH + 10) continue;
    x.fillStyle = cols[i & 3];
    x.globalAlpha = clamp01(1.6 - age * 1.2);
    x.fillRect(Math.round(px), Math.round(py), 3, 5);
  }
  x.globalAlpha = 1;
}

function coinFountain(x, t0, g, cx, cy) {
  const age = g - t0;
  if (age < 0 || age > 1.2) return;
  for (let i = 0; i < 10; i++) {
    const sp = 130 + hash(i * 13 + 7) * 120;
    const a = -Math.PI / 2 + (hash(i * 17) - 0.5) * 0.7;
    const px = cx + Math.cos(a) * sp * age;
    const py = cy + Math.sin(a) * sp * age + 300 * age * age;
    if (py > LH + 8) continue;
    x.fillStyle = '#e9a83c';
    x.fillRect(Math.round(px) - 3, Math.round(py) - 3, 7, 7);
    x.fillStyle = '#ffe27a';
    x.fillRect(Math.round(px) - 2, Math.round(py) - 2, 5, 5);
    x.fillStyle = '#fff8e0';
    x.fillRect(Math.round(px) - 2, Math.round(py) - 2, 2, 2);
  }
}

function burst(x, t0, g, cx, cy, col, n = 12, sp = 160, up = 40, life = 0.6) {
  const age = g - t0;
  if (age < 0 || age > life) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(i * 31 + Math.round(t0 * 97)) * 1.2;
    const d = sp * age * (0.5 + hash(i + 40) * 0.7);
    const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d - up * age;
    x.fillStyle = i % 3 === 0 ? '#ffffff' : col;
    x.globalAlpha = clamp01(1 - age / 0.55);
    x.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
  }
  x.globalAlpha = 1;
}

// ---------- 1 · strip — neon Remypolis, the BALD PALACE ----------

function drawStrip(ctx, lt, t) {
  ctx.fillStyle = '#05060d';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  const pan = lerp(70, -30, E.outCubic(clamp01(lt / 9)));
  ctx.translate(pan, 0);
  ctx.drawImage(S.sky, -80, 0);
  const s1 = (lt * 5) % 2400, s2 = (lt * 11) % 2400;
  ctx.globalAlpha = 0.95;
  ctx.drawImage(S.cityFar, -s1, 520); ctx.drawImage(S.cityFar, -s1 + 2400, 520);
  ctx.globalAlpha = 1;
  ctx.drawImage(S.cityMid, -s2, 610); ctx.drawImage(S.cityMid, -s2 + 2400, 610);
  // street + wet neon reflections
  ctx.fillStyle = '#0b0c16';
  ctx.fillRect(-80, 900, W + 160, 200);
  for (const [rx, rw, col] of [[180, 130, 'rgba(255,95,158,0.10)'], [620, 200, 'rgba(255,207,110,0.10)'], [1180, 240, 'rgba(89,214,208,0.09)'], [1660, 180, 'rgba(255,95,158,0.08)']]) {
    ctx.fillStyle = col;
    ctx.fillRect(rx, 900, rw, 180);
  }
  ctx.fillStyle = 'rgba(255,240,200,0.5)';
  for (let k = 0; k < 16; k++) {
    const sx = ((k * 140 - lt * 90) % 2120 + 2120) % 2120 - 100;
    if (sx > -80 && sx < W + 80) ctx.fillRect(sx, 985, 60, 6);
  }
  // the facade
  const fx = 1000, fy = 0;
  ctx.drawImage(S.facade, fx, fy);
  // marquee text — letters flicker individually (the C and the P are dying)
  const word = 'THE BALD PALACE';
  const size = 92, track = 6;
  ctx.font = `${size}px Anton`;
  let tw = 0;
  const ws = [];
  for (const ch of word) { const wch = ctx.measureText(ch).width + track; ws.push(wch); tw += wch; }
  tw -= track;
  let cx = fx + MARQUEE.x + (MARQUEE.w - tw) / 2;
  const my = fy + MARQUEE.y + MARQUEE.h / 2 + 32;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (ch !== ' ') {
      let a = 1;
      for (const bz of EV.signBuzz) {
        const dt = t - bz;
        if (dt > 0 && dt < 0.22 && (i === 13 || (i === 9 && bz === EV.signBuzz[1]))) a = 0.12;
      }
      ctx.save();
      ctx.shadowColor = 'rgba(255,180,90,0.9)'; ctx.shadowBlur = 34;
      ctx.fillStyle = `rgba(255,223,150,${a})`;
      ctx.font = `${size}px Anton`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(ch, cx, my);
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,246,220,${a})`;
      ctx.fillText(ch, cx, my);
      ctx.restore();
    }
    cx += ws[i];
  }
  // marquee bulbs — chase pattern
  for (let i = 0; i < MARQUEE.bulbs.length; i++) {
    const [bx, by] = MARQUEE.bulbs[i];
    const chase = (i + Math.floor(t * 9)) % 4 === 0;
    ctx.fillStyle = chase ? '#fff3d0' : 'rgba(255,207,110,0.35)';
    ctx.beginPath(); ctx.arc(fx + bx, fy + by, chase ? 5 : 3.4, 0, 7); ctx.fill();
  }
  // subline
  const subA = t > EV.signBuzz[0] ? 0.9 : 1;
  txt(ctx, 'SLOTS · TABLES · WAXING', fx + MARQUEE.x + MARQUEE.w / 2, fy + MARQUEE.y + MARQUEE.h + 42, {
    size: 30, font: '"JetBrains Mono"', weight: 700, color: `rgba(255,207,110,${subA})`, align: 'center', track: 6,
  });
  // valet sign
  txt(ctx, 'VALET', fx + 300, fy + 870, { size: 26, font: 'Anton', color: '#59d6d0', align: 'center', glow: '#59d6d0', glowBlur: 16 });
  ctx.restore();
  // limo glides past (screen space, foreground below the doors)
  const lu = seg(t, EV.limoPass, 5.0);
  if (lu > 0 && lu < 1) {
    const lx = lerp(-520, W + 60, lu);
    ctx.drawImage(S.limo, lx, 1004);
  }
}

// ---------- 2 · dossier — five ID cards slam in ----------

function drawDossier(ctx, lt, t) {
  ctx.fillStyle = '#0b0a14';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(120,130,200,0.06)'; ctx.lineWidth = 1;
  for (let gx = 0; gx <= W; gx += 96) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = 0; gy <= H; gy += 96) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
  M.lineIn(ctx, 'THE CREW', 90, 108, clamp01((lt - 0.1) / 0.5), { size: 54, font: 'Anton', color: '#f2ecff', track: 10 }, clamp01((lt - 7.6) / 0.4));
  ctx.fillStyle = '#c85a5a';
  ctx.fillRect(90, 128, Math.min(300, 300 * clamp01((lt - 0.2) / 0.6)), 5);
  const slotPos = [
    [70, 210], [690, 210], [1310, 210],
    [400, 570], [1030, 570],
  ];
  for (let i = 0; i < CREW.length; i++) {
    const m = CREW[i];
    const tIn = EV.cards[i] - T.dossier;
    const p = lt - tIn;
    if (p < 0) continue;
    const pin = E.outBack(clamp01(p / 0.32));
    const landSh = p > 0.32 && p < 0.55 ? Math.exp(-(p - 0.32) * 18) * Math.sin((p - 0.32) * 60) * 6 : 0;
    const [x, y] = slotPos[i];
    const cy = y + (1 - pin) * -46 + landSh;
    ctx.save();
    ctx.globalAlpha = clamp01(pin) * clamp01((7.7 - p) / 0.3);
    ctx.drawImage(S.cards[i], x, cy);
    const tx0 = x + 286, ty0 = cy + 74;
    txt(ctx, `#${String(m.id).padStart(4, '0')}`, tx0, ty0, { size: 22, font: '"JetBrains Mono"', weight: 700, color: m.hex, track: 3 });
    txt(ctx, m.name, tx0, ty0 + 58, { size: 46, font: 'Anton', color: '#ffffff', track: 1 });
    ctx.fillStyle = m.hex;
    ctx.fillRect(tx0, ty0 + 76, Math.min(118, 118 * clamp01((p - 0.25) / 0.4)), 4);
    txt(ctx, m.epithet, tx0, ty0 + 114, { size: 18, font: '"JetBrains Mono"', weight: 700, color: m.hex, track: 3 });
    // role (wrapped)
    ctx.font = '500 16px "JetBrains Mono"';
    const words = m.role.split(' ');
    let line = '', ly = ty0 + 148;
    for (const wd of words) {
      if (ctx.measureText(line + wd).width > 210) {
        txt(ctx, line, tx0, ly, { size: 16, font: '"JetBrains Mono"', weight: 500, color: '#b9b4c8' });
        line = wd + ' '; ly += 22;
      } else line += wd + ' ';
    }
    if (line) txt(ctx, line, tx0, ly, { size: 16, font: '"JetBrains Mono"', weight: 500, color: '#b9b4c8' });
    ctx.restore();
  }
  // scanner sweep
  const sw = ((t * 220) % (W + 400)) - 200;
  const g = ctx.createLinearGradient(sw - 120, 0, sw + 120, 0);
  g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(0.5, 'rgba(120,200,255,0.045)'); g.addColorStop(1, 'rgba(120,200,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(sw - 130, 0, 260, H);
}

// ---------- 3 · plan — blueprint, arrows, T-minus ----------

function drawPlan(ctx, lt, t) {
  ctx.drawImage(S.blueprint, 0, 0);
  // vault pulse rings
  const vpx = 500, vpy = 250;
  if (t > 22.4) {
    for (let k = 0; k < 3; k++) {
      const ph = ((t - 22.4) * 0.9 + k / 3) % 1;
      ctx.strokeStyle = `rgba(255,217,138,${0.5 * (1 - ph)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(vpx, vpy, 30 + ph * 60, 0, 7); ctx.stroke();
    }
  }
  const arr = [
    [560, 880, 470, 500, { color: '#78ffbe', head: 26, width: 6 }],
    [400, 420, 350, 300, { color: '#ffd98a', head: 26, width: 6, dashed: true }],
    [505, 250, 900, 440, { color: '#78ffbe', head: 26, width: 5, bend: 0.3, packet: true, phase: t * 1.4 }],
  ];
  for (let i = 0; i < arr.length; i++) {
    const [x0, y0, x1, y1, oo] = arr[i];
    const p = seg(t, EV.arrows[i], EV.arrows[i] + 0.8);
    if (p > 0) M.flowArrow(ctx, x0, y0, x1, y1, E.outCubic(p), oo);
  }
  // crew tokens sliding along the route
  const tok = (id, x, y, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = '#0d2347';
    ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(215,235,255,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.stroke();
    ctx.drawImage(S.head[id], x - 16, y - 16);
    ctx.globalAlpha = 1;
  };
  const u1 = seg(t, EV.arrows[0], EV.arrows[0] + 1.6);
  if (u1 > 0) tok(CAST.SPARK, lerp(560, 470, E.outCubic(u1)), lerp(880, 500, E.outCubic(u1)) - 60);
  const u2 = seg(t, EV.arrows[1], EV.arrows[1] + 1.6);
  if (u2 > 0) tok(CAST.LEADER, lerp(400, 350, E.outCubic(u2)), lerp(420, 300, E.outCubic(u2)) - 60);
  const u3 = seg(t, EV.arrows[2], EV.arrows[2] + 1.6);
  if (u3 > 0) tok(CAST.GHOST, lerp(505, 900, E.outCubic(u3)), lerp(250, 440, E.outCubic(u3)) - 60);
  tok(CAST.FACE, 1000, 390);   // FACE holds the tables
  tok(CAST.WHEEL, 620, 810);   // WHEEL waits at the valet lane
  // patrol token on a loop in SLOTS
  const pa = t * 0.8;
  tok(CAST.SHADES, 400 + Math.cos(pa) * 90, 390 + Math.sin(pa) * 46, 0.9);
  // corner intel
  ctx.fillStyle = 'rgba(10,28,54,0.85)';
  ctx.fillRect(70, 84, 380, 96);
  ctx.strokeStyle = 'rgba(160,200,240,0.5)'; ctx.lineWidth = 2;
  ctx.strokeRect(70, 84, 380, 96);
  ctx.drawImage(S.headBig452, 88, 100);
  txt(ctx, 'THE HOUSE', 160, 132, { size: 30, font: 'Anton', color: '#ffd98a', track: 2 });
  txt(ctx, '12 GUARDS · 1 MULLET', 160, 164, { size: 19, font: '"JetBrains Mono"', weight: 700, color: 'rgba(215,235,255,0.85)', track: 3 });
  // T-minus counter
  const cu = seg(t, EV.counter[0], EV.counter[1]);
  txt(ctx, 'PATROL SWEEP IN', 1830, 130, { size: 24, font: '"JetBrains Mono"', weight: 700, color: 'rgba(215,235,255,0.8)', align: 'right', track: 5 });
  M.counter(ctx, 120, 0, cu, 1830, 200, {
    size: 78, font: 'Anton', color: cu > 0.96 ? '#ff5f5f' : '#ffffff', align: 'right', prefix: 'T−', suffix: ' s',
  });
  // mission chips (chip x/y are the pill centre)
  const chips = [
    ['CUT POWER · 03:58', '#59d6d0'],
    ['JACKPOT · WEST WALL', '#e08a4f'],
    ['EXFIL · VALET LANE', '#78ffbe'],
  ];
  for (let i = 0; i < chips.length; i++) {
    const p = clamp01((t - EV.chips[i]) / 0.45);
    if (p > 0) M.chip(ctx, 331, 885 + i * 70, 470, 58, chips[i][0], p, { color: chips[i][1], fill: 'rgba(10,28,54,0.85)', textColor: '#eaf2ff', size: 25, track: 3 });
  }
}

// ---------- 4 · floor — infiltration + jackpot distraction ----------

function drawFloor(ctx, lt, t) {
  const x = S.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = '#0d0616'; x.fillRect(-20, -20, LW + 40, LH + 40);
  x.drawImage(S.floor, 0, 0);
  const slotX = [88, 148, 208, 268];
  const jAge0 = t - EV.jackpot;
  for (let i = 0; i < 4; i++) {
    // the jackpot machine rocks on its legs when it pays out
    const jx3 = i === 2 && jAge0 > 0 && jAge0 < 0.5 ? Math.round(Math.sin(jAge0 * 46) * 2) : 0;
    x.drawImage(S.slots[i % 3], slotX[i] + jx3, 386);
  }
  // jackpot marquee flash
  const jAge = t - EV.jackpot;
  if (jAge > 0 && jAge < 1.4 && (jAge < 0.8 || Math.floor(jAge * 9) % 2 === 0)) {
    x.fillStyle = '#fff3d0';
    x.fillRect(slotX[2], 386, 44, 5);
    x.fillStyle = 'rgba(255,207,110,0.35)';
    x.fillRect(slotX[2] - 6, 380, 56, 26);
  }

  // pit boss beside the tables (right), watching the floor
  A.drawRemy(x, S.g744, 812, 360, { flip: true, ...idle(t, 1.2) });
  // MR. SHADES paces in from the right, scanning
  const pan = seg(t, EV.shadesPan[0], EV.shadesPan[1]);
  const s468x = pan > 0 ? lerp(1010, 640, E.inOutCubic(pan)) : 1010;
  A.drawRemy(x, S.g468, s468x, 352, { flip: pan <= 0.55, ...idle(t, 0.8) });

  // FACE crosses to the tables
  const faceU = seg(t, 27.2, 28.4);
  const faceX = lerp(480, 742, E.outCubic(faceU));
  const faceY = lerp(470, 398, E.outCubic(faceU));
  const faceWalk = faceU > 0 && faceU < 1;
  A.drawRemy(x, S.r26, faceX, faceY, { flip: false, ...(faceWalk ? runCycle(t * 10) : idle(t, 1.1)) });
  // WHEEL holds near the doors
  A.drawRemy(x, S.r66, 540, 340, { flip: true, ...idle(t + 1, 1.1) });

  // SPARK works the jackpot machine (posted on its LEFT so the slot row stays clear)
  const sparkU = seg(t, 26.8, 27.6);
  const jx = 186;
  const jumping = jAge > 0 && jAge < 1.1;
  const jump = jumping ? -Math.abs(Math.sin(jAge * 9)) * 34 : 0;
  const sparkWalk = sparkU > 0 && sparkU < 1;
  A.drawRemy(x, S.r9, lerp(430, jx, E.outCubic(sparkU)), 500 + jump, {
    flip: true,
    lean: jumping ? -0.08 : Math.sin(t * 2.4) * 0.02,
    lift: jumping ? [8, 8] : [0, 0],
    ...(sparkWalk ? runCycle(t * 9) : {}),
    glow: jumping ? '#ffd98a' : null, glowA: 0.5,
  });
  if (jAge > 0) {
    confetti(x, EV.jackpot + 0.18, t, slotX[2] + 22, 396, 26);
    coinFountain(x, EV.jackpot, t, slotX[2] + 22, 392);
    if (jAge < 0.8 || Math.floor(jAge * 8) % 2 === 0) {
      ptext(x, 'WINNER', slotX[2] + 22, 356, { size: 16, align: 'center', color: '#ffd98a' });
    }
  }
  // patrons drift toward the noise
  for (let i = 0; i < 3; i++) {
    const R = [S.pA, S.pB, S.pC][i];
    const moving = t > 29.2 + i * 0.2 && t < 30.4 + i * 0.2;
    const gx = 380 + i * 60 - (moving ? E.inOutCubic(seg(t, 29.2 + i * 0.2, 30.4 + i * 0.2)) * (120 - i * 40) : 0);
    A.drawRemy(x, R, gx, 430 + i * 18, { flip: true, sx: 0.85, sy: 0.85, ...(moving ? runCycle(t * 9 + i * 2) : idle(t + i, 1)) });
  }

  // BLADE + GHOST: cross from the doors to the slot row, loiter, then slip to the grate
  const crossU = seg(t, 26.6, 28.2);
  const slip = seg(t, EV.slip, 34.8);
  const hx = slip > 0 ? lerp(140, 302, E.inOutCubic(slip)) : lerp(480, 140, E.inOutCubic(crossU));
  const slipping = slip > 0 && slip < 1;
  const crouch = slip > 0 ? { lean: 0.16, lift: [12, 12], sy: 0.82 } : { lean: 0.05, lift: [0, 0] };
  const walking = crossU > 0 && crossU < 1;
  const bob = slip > 0 ? Math.sin(t * 11) * 0.02 : 0;
  const basePose = walking ? runCycle(t * 9 + 2) : crouch;
  const wiggle = slipping ? { stride: [Math.round(Math.sin(t * 13) * 2), Math.round(-Math.sin(t * 13) * 2)] } : {};
  // mutual exclusion: standing pair vanishes the moment each hero's drop copy starts
  if (t < EV.hatch[0] + 0.4) A.drawRemy(x, S.r42, hx, 492, { flip: false, ...basePose, ...wiggle, lean: (basePose.lean ?? 0) + bob });
  if (t < EV.hatch[0] + 0.7) A.drawRemy(x, S.r32, hx - 64, 488, { flip: false, ...basePose, ...wiggle, lean: (basePose.lean ?? 0) + bob });
  // the grate: swings flat aside at hatch[0]
  const openU = seg(t, EV.hatch[0], EV.hatch[0] + 0.35);
  if (openU <= 0) {
    ART.grate(x, 300, 500, 46, 26);
  } else {
    const pit = x.createLinearGradient(0, 498, 0, 540);
    pit.addColorStop(0, '#0a0612'); pit.addColorStop(1, '#020104');
    x.fillStyle = pit; x.fillRect(292, 496, 62, 44);
    x.fillStyle = '#14091c'; x.fillRect(292, 496, 62, 4);
    x.save();
    x.translate(282, 474); x.rotate(-openU * 1.35);
    ART.grate(x, 0, 0, 46, 26);
    x.restore();
  }
  // dropping through (visible well below the floor line before fading)
  for (const [dt, R] of [[EV.hatch[0] + 0.4, S.r42], [EV.hatch[0] + 0.7, S.r32]]) {
    const du = seg(t, dt, dt + 0.65);
    if (du > 0 && du < 1.08) {
      A.drawRemy(x, R, 322 - du * 14, 500 + du * 130, { alpha: 1 - du * du * 0.9, sx: 0.9, sy: 0.9 });
    }
  }

  // security-cam inset (CAM 04), top-right — flickers on like a monitor warming up
  if (t > EV.insetOn) {
    const insetA = clamp01((t - EV.insetOn) / 0.3);
    const ic = S.insetCore.getContext('2d');
    ic.setTransform(1, 0, 0, 1, 0, 0);
    ic.clearRect(0, 0, 122, 67);
    const jit = Math.floor(hash(Math.floor(t * 11)) * 3) - 1;
    ic.drawImage(S.low, 60 + jit, 330, 366, 200, 0, 0, 122, 67);
    ic.fillStyle = 'rgba(40,255,120,0.10)'; ic.fillRect(0, 0, 122, 67);
    ic.fillStyle = 'rgba(0,20,0,0.30)'; ic.fillRect(0, 0, 122, 67);
    ic.fillStyle = 'rgba(0,0,0,0.28)';
    for (let sy = 0; sy < 67; sy += 2) ic.fillRect(0, sy, 122, 1);
    for (let i = 0; i < 12; i++) {
      ic.fillStyle = `rgba(255,255,255,${0.05 + hash(i * 7 + Math.floor(t * 24)) * 0.1})`;
      ic.fillRect(hash(i * 3 + Math.floor(t * 24)) * 122, hash(i * 5) * 67, 1, 1);
    }
    const ix = S.inset.getContext('2d');
    ix.setTransform(1, 0, 0, 1, 0, 0);
    ix.clearRect(0, 0, 244, 134);
    ix.imageSmoothingEnabled = false;
    ix.drawImage(S.insetCore, 0, 0, 244, 134);
    x.globalAlpha = insetA;
    x.drawImage(S.inset, 700, 16);
    x.strokeStyle = 'rgba(240,255,240,0.85)'; x.lineWidth = 2;
    x.strokeRect(700, 16, 244, 134);
    ptext(x, 'CAM 04', 708, 34, { size: 8, color: '#c8ffd0', alpha: insetA });
    if (Math.floor(t * 2) % 2 === 0) {
      x.fillStyle = '#ff4050'; x.fillRect(928, 26, 8, 8);
      ptext(x, 'REC', 906, 34, { size: 8, color: '#ffb0b8', alpha: insetA });
    }
    const secs = 3420 + 57 * 60 + Math.floor(t); // 03:57:00 + elapsed
    const mm = String(Math.floor(secs / 60) % 60).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    ptext(x, `03:${mm}:${ss} AM`, 936, 142, { size: 8, align: 'right', color: '#c8ffd0', alpha: insetA });
    x.globalAlpha = 1;
  }
  blit(ctx);
}

// ---------- 5 · vent — tea-tray slide ----------

function drawVent(ctx, lt, t) {
  const x = S.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = '#07090f'; x.fillRect(-20, -20, LW + 40, LH + 40);
  const u = seg(t, EV.slide[0], EV.slide[1]);
  const dist = 620 * E.inOutCubic(u); // eased travel: fast middle, easy ends
  const off = ((dist % 480) + 480) % 480;
  for (let k = -1; k <= 2; k++) x.drawImage(S.vent, -off + k * 480, 0);
  // fixed duct features at world positions → screen x
  const feature = (wx, drawFn) => {
    const sx2 = wx - dist;
    if (sx2 > -80 && sx2 < LW + 80) drawFn(sx2);
  };
  feature(760, (fx2) => {
    const g = x.createLinearGradient(fx2, 0, fx2 + 40, 0);
    g.addColorStop(0, 'rgba(255,214,140,0)'); g.addColorStop(0.5, 'rgba(255,214,140,0.16)'); g.addColorStop(1, 'rgba(255,214,140,0)');
    x.fillStyle = g; x.fillRect(fx2, 120, 40, LH - 240);
    x.fillStyle = 'rgba(0,0,0,0.35)';
    for (let sy = 128; sy < LH - 128; sy += 12) x.fillRect(fx2, sy, 40, 5);
  });
  feature(1120, (fx2) => {
    x.fillStyle = 'rgba(120,150,220,0.05)';
    x.fillRect(fx2, 128, 70, LH - 256);
  });
  // flashlight cone ahead of the leader (fades as they drop away)
  const dropU0 = seg(t, EV.grateDrop, EV.grateDrop + 0.45);
  const flA = 1 - dropU0;
  if (flA > 0.02) {
    const fl = x.createLinearGradient(620, 0, 900, 0);
    fl.addColorStop(0, `rgba(255,240,200,${0.14 * flA})`); fl.addColorStop(1, 'rgba(255,240,200,0)');
    x.fillStyle = fl;
    x.beginPath(); x.moveTo(624, 388); x.lineTo(920, 240); x.lineTo(920, 480); x.closePath(); x.fill();
  }

  const dropY = dropU0 > 0 ? E.inQuad(dropU0) * 300 : 0;
  // open grates below the sliders when the drop starts
  if (dropU0 > 0) {
    x.fillStyle = '#03040a'; x.fillRect(420, 420, 220, 100);
  }
  const tray = (R, tx, wobble) => {
    if (dropU0 <= 0) {
      x.fillStyle = '#3d4458'; x.fillRect(tx - 26, 408, 52, 8);
      x.fillStyle = '#5a6478'; x.fillRect(tx - 26, 408, 52, 3);
    }
    if (dropU0 <= 0 || dropY < 250) {
      A.drawRemy(x, R, tx - 20, 404 + dropY + Math.sin(t * 6 + wobble) * 2, {
        rot: (Math.PI / 2) * (1 - Math.min(dropU0 * 1.5, 1)), alpha: dropU0 > 0 ? 1 - dropU0 * dropU0 : 1,
        lift: [3, 0], stride: [Math.round(Math.sin(t * 9 + wobble) * 2), 0],
      });
    }
  };
  tray(S.r32, 436, 0);
  tray(S.r42, 556, 2.1);
  burst(x, EV.land, t, 480, 500, '#8a94b0', 12, 100, 20, 0.95);
  // heartbeat vignette
  for (const hb of EV.heart) {
    const age = t - hb;
    if (age > 0 && age < 0.7) {
      const v = x.createRadialGradient(LW / 2, LH / 2, LH * 0.35, LW / 2, LH / 2, LH * 0.75);
      v.addColorStop(0, 'rgba(255,40,60,0)'); v.addColorStop(1, `rgba(255,40,60,${0.18 * (1 - age / 0.7)})`);
      x.fillStyle = v; x.fillRect(0, 0, LW, LH);
    }
  }
  blit(ctx);
}

// ---------- 6 · vault — laser, breach, the GOLDEN MULLET ----------

function drawVault(ctx, lt, t) {
  const { g, stop } = VAULT_CLOCK.warp(lt);
  const x = S.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = '#0a0d14'; x.fillRect(-20, -20, LW + 40, LH + 40);
  const zoom = 1 + 0.1 * E.outCubic(seg(g, 0, 2)) + 0.14 * E.outCubic(seg(g, 12.4, 14));
  const shk = stop != null ? 6 * Math.exp(-stop.sl * 9) : 0;
  x.save();
  x.translate(
    LW / 2 + Math.round((stop != null ? Math.sin(stop.sl * 91) : 0) * shk),
    300 + Math.round((stop != null ? Math.cos(stop.sl * 77) : 0) * shk * 0.7),
  );
  x.scale(zoom, zoom);
  x.translate(-LW / 2, -300);
  x.fillStyle = '#0a0d14'; x.fillRect(-30, -30, LW + 60, LH + 60);
  x.drawImage(S.vault, 0, 0);

  // door: intact → tips and falls (5.5–5.98) → contact freeze at 6.0 holds the THUD → slab
  const fall = seg(g, 5.5, 5.98);
  const doorCx = 480, doorCy = 240;
  if (fall <= 0) {
    x.drawImage(S.door, doorCx - 200, doorCy - 200, 400, 400);
  } else if (fall < 1) {
    const k = lerp(1.33, 2.3, E.inQuad(fall));
    const fy = lerp(doorCy, 610, E.inQuad(fall));
    x.save();
    x.translate(doorCx, fy); x.rotate(fall * 0.12);
    x.drawImage(S.door, -150 * k, -150 * k, 300 * k, 300 * k);
    x.restore();
  } else {
    // fallen slab — lit top edge + rim so it reads against the dark floor
    x.fillStyle = '#232836';
    x.fillRect(doorCx - 140, 500, 280, 20);
    x.fillStyle = '#525c72';
    x.fillRect(doorCx - 140, 500, 280, 4);
    x.fillStyle = '#39404f';
    for (let b2 = 0; b2 < 7; b2++) x.fillRect(doorCx - 126 + b2 * 40, 506, 5, 5);
    x.fillStyle = 'rgba(0,0,0,0.5)';
    x.fillRect(doorCx - 150, 518, 300, 10);
  }
  // laser cut: arc trail + live beam + sparks (trail only while the door hangs)
  const arcU = seg(g, 2.2, 4.8);
  if (arcU > 0 && g < 5.85) {
    const a0 = 2.5, a1 = 7.2;
    const aNow = lerp(a0, a1, arcU);
    const R = 124;
    x.strokeStyle = '#ff9a4a'; x.lineWidth = 5;
    x.beginPath(); x.arc(doorCx, doorCy, R, a0, aNow); x.stroke();
    x.strokeStyle = '#fff3d0'; x.lineWidth = 2;
    x.beginPath(); x.arc(doorCx, doorCy, R, a0, aNow); x.stroke();
    if (arcU < 1 && g < 5.8) {
      const px = doorCx + Math.cos(aNow) * R, py = doorCy + Math.sin(aNow) * R;
      x.strokeStyle = '#ff3040'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(350, 442); x.lineTo(px, py); x.stroke();
      x.strokeStyle = '#ffd0d4'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(350, 442); x.lineTo(px, py); x.stroke();
      // the cutter in the GHOST's grip
      x.fillStyle = '#ff3040'; x.fillRect(346, 438, 8, 8);
      x.fillStyle = '#ffd0d4'; x.fillRect(348, 440, 4, 4);
      x.fillStyle = '#fff'; x.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
      burst(x, t - (0.12 - 0.12 * (1 - (t % 0.12) / 0.12)), t, px, py, '#ff9a4a', 3, 60, 10);
    }
  }
  // bolts pop
  for (let i = 0; i < EV.bolts.length; i++) {
    const age = g - (EV.bolts[i] - T.vault);
    if (age > 0 && age < 0.5) {
      for (let k2 = 0; k2 < 3; k2++) {
        const ba = 1.8 + i * 0.55 + k2 * 0.16;
        const bx = doorCx + Math.cos(ba) * 150 + age * (60 + k2 * 30);
        const by = doorCy + Math.sin(ba) * 150 + age * (40 + k2 * 20);
        x.fillStyle = k2 === 0 ? '#e8eef8' : '#a8b2c4';
        x.fillRect(Math.round(bx), Math.round(by), 6, 6);
      }
      // rim ping ring
      x.strokeStyle = `rgba(255,240,200,${0.6 * (1 - age * 2)})`;
      x.lineWidth = 2;
      x.beginPath(); x.arc(doorCx, doorCy, 130 + age * 50, 1.6 + i * 0.5, 2.2 + i * 0.5); x.stroke();
    }
  }
  burst(x, EV.dust, t, doorCx, 505, '#8a94b0', 16, 200, 24, 0.9);
  burst(x, EV.contact, t, doorCx, 500, '#c8d2e0', 8, 240, 10, 0.5);
  // in-scene impact glow at the thud — the flash itself stays a sharp crack
  const impAge = t - EV.contact;
  if (impAge > 0 && impAge < 0.45) {
    const ig = x.createRadialGradient(doorCx, 505, 10, doorCx, 505, 230);
    ig.addColorStop(0, `rgba(255,240,210,${0.5 * (1 - impAge / 0.45)})`);
    ig.addColorStop(0.4, `rgba(255,214,150,${0.22 * (1 - impAge / 0.45)})`);
    ig.addColorStop(1, 'rgba(255,214,150,0)');
    x.fillStyle = ig;
    x.fillRect(doorCx - 240, 280, 480, 260);
  }
  // settling dust motes drifting in the vault light
  if (g > 6.4) {
    for (let i = 0; i < 8; i++) {
      const mage = (t * (6 + hash(i) * 8) + hash(i * 3) * 100) % 100;
      x.fillStyle = `rgba(190,200,220,${0.1 + hash(i * 7) * 0.12})`;
      x.fillRect(360 + hash(i * 13) * 260 + Math.sin(t + i) * 8, 300 + mage * 1.8, 2, 2);
    }
  }

  // reveal: light + rays on the pedestal
  const rev = seg(g, 7.4, 9.4);
  if (rev > 0) {
    const cone = x.createLinearGradient(0, 0, 0, 470);
    cone.addColorStop(0, `rgba(255,224,150,${0.05 * rev})`); cone.addColorStop(1, `rgba(255,224,150,${0.16 * rev})`);
    x.fillStyle = cone;
    x.beginPath(); x.moveTo(452, 0); x.lineTo(508, 0); x.lineTo(560, 470); x.lineTo(400, 470); x.closePath(); x.fill();
    for (let i = 0; i < 6; i++) {
      const ra = t * 0.12 + (i / 6) * Math.PI * 2;
      x.strokeStyle = `rgba(255,230,160,${0.1 * rev})`; x.lineWidth = 3;
      x.beginPath(); x.moveTo(480, 380); x.lineTo(480 + Math.cos(ra) * 300, 380 + Math.sin(ra) * 300); x.stroke();
    }
    const halo = x.createRadialGradient(480, 380, 6, 480, 380, 120);
    halo.addColorStop(0, `rgba(255,230,150,${0.4 * rev})`);
    halo.addColorStop(1, 'rgba(255,230,150,0)');
    x.fillStyle = halo;
    x.fillRect(360, 260, 240, 240);
  }

  // dome + mullet on the pedestal — only once the reveal light is up
  const domeUp = seg(g, 12.0, 12.5);
  const lifted = g > 12.6;
  const domeY = lerp(334, 296, E.outCubic(domeUp));
  if (domeUp > 0 && domeUp < 1) {
    x.fillStyle = 'rgba(255,255,255,0.25)';
    x.fillRect(440 - domeUp * 30, domeY, 100, 4);
  }
  if (!lifted && g > 7.2) {
    x.drawImage(S.mullet, 430, 366, 88, 58);
    x.drawImage(S.dome, 432, domeY);
  }

  // SHADES' silhouette crossing the door glass
  const sh = seg(t, EV.shadow[0], EV.shadow[1]);
  if (sh > 0 && sh < 1) {
    const shx = lerp(388, 572, sh);
    x.fillStyle = 'rgba(6,8,16,0.92)';
    x.beginPath(); x.arc(shx, 172, 24, 0, 7); x.fill();
    x.fillRect(shx - 40, 188, 80, 20);
    x.fillStyle = 'rgba(6,8,16,0.4)';
    x.fillRect(shx - 58, 360, 116, 110);
  }

  // the crew
  const freeze = t > EV.freezeCrew[0] && t < EV.freezeCrew[1];
  const appr = seg(g, 11.6, 12.1);
  const g42x = g < 6.0 ? 620 : lerp(620, 548, E.outCubic(appr));
  const bob42 = freeze ? 0 : Math.sin(t * 2.1) * 2;
  A.drawRemy(x, S.r42, g42x, 472 + bob42, {
    ...idle(freeze ? EV.freezeCrew[0] : t, 1.3),
    flip: true,
    glow: '#ffd9a0', glowA: 0.2,
    white: freeze && t < EV.freezeCrew[0] + 0.1,
  });
  const g32x = g < 6.0 ? 340 : lerp(340, 414, E.outCubic(appr));
  A.drawRemy(x, S.r32, g32x, 470 + (freeze ? 0 : Math.sin(t * 2.4 + 1) * 2), {
    lean: g < 6.0 ? 0.14 : Math.sin(freeze ? 0 : t * 2) * 0.015,
    lift: g < 6.0 ? [12, 12] : [0, 0],
    sy: g < 6.0 ? 0.82 : 1,
  });
  if (freeze && t > EV.freezeCrew[0] + 0.2) {
    ptext(x, '!', g42x, 360, { size: 16, align: 'center', color: '#ffdf8a' });
  }
  // the lift — mullet held aloft, well clear of both heads
  if (lifted) {
    const lu = seg(g, 12.6, 13.0);
    const mx = lerp(470, g32x + 34, E.outCubic(lu));
    const my = lerp(370, 242, E.outCubic(lu)) + Math.sin(t * 1.4) * 2;
    const halo2 = x.createRadialGradient(mx + 44, my + 29, 8, mx + 44, my + 29, 80);
    halo2.addColorStop(0, 'rgba(255,230,150,0.45)'); halo2.addColorStop(1, 'rgba(255,230,150,0)');
    x.fillStyle = halo2; x.fillRect(mx - 60, my - 60, 190, 190);
    x.drawImage(S.mullet, mx, my, 88, 58);
    for (let i = 0; i < 4; i++) {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7));
      x.globalAlpha = tw;
      x.fillStyle = i % 2 ? '#fff8e0' : '#ffe27a';
      x.fillRect(mx + 10 + i * 24, my - 14 + (i % 2) * 26, 5, 5);
    }
    x.globalAlpha = 1;
  }
  // heartbeat vignette during the shadow pass
  for (const hb of [52.4, 53.0]) {
    const age = t - hb;
    if (age > 0 && age < 0.65) {
      const v = x.createRadialGradient(LW / 2, LH / 2, LH * 0.32, LW / 2, LH / 2, LH * 0.78);
      v.addColorStop(0, 'rgba(255,40,60,0)'); v.addColorStop(1, `rgba(255,40,60,${0.24 * (1 - age / 0.65)})`);
      x.fillStyle = v; x.fillRect(-30, -30, LW + 60, LH + 60);
    }
  }
  x.restore();
  blit(ctx);
}

// ---------- 7 · alarm — red flood, rope trip, pileup ----------

function drawAlarm(ctx, lt, t) {
  const x = S.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = '#0d0616'; x.fillRect(-20, -20, LW + 40, LH + 40);
  x.drawImage(S.floor, 0, 0);
  for (let i = 0; i < 4; i++) x.drawImage(S.slots[i % 3], [88, 148, 208, 268][i], 386);
  // klaxon wash + rotating beacons
  const strobe = 0.10 + 0.10 * Math.abs(Math.sin(t * Math.PI * 2));
  x.fillStyle = `rgba(255,30,40,${strobe})`;
  x.fillRect(0, 0, LW, LH);
  for (const bxc of [240, 720]) {
    const ba = t * 3.2 + (bxc === 240 ? 0 : Math.PI);
    const bx = bxc, by = 60;
    const gx = x.createLinearGradient(bx, by, bx + Math.cos(ba) * 900, by + Math.sin(ba) * 900);
    gx.addColorStop(0, 'rgba(255,60,60,0.14)'); gx.addColorStop(1, 'rgba(255,60,60,0)');
    x.fillStyle = gx;
    x.beginPath(); x.moveTo(bx, by);
    x.lineTo(bx + Math.cos(ba - 0.16) * 1100, by + Math.sin(ba - 0.16) * 1100);
    x.lineTo(bx + Math.cos(ba + 0.16) * 1100, by + Math.sin(ba + 0.16) * 1100);
    x.closePath(); x.fill();
    x.fillStyle = '#ff8090'; x.fillRect(bx - 5, by - 5, 10, 10);
  }
  // velvet rope between stanchions
  x.drawImage(S.stanchion, 500, 414);
  x.drawImage(S.stanchion, 640, 414);
  x.strokeStyle = '#c02040'; x.lineWidth = 5;
  x.beginPath(); x.moveTo(507, 420); x.quadraticCurveTo(570, 466, 647, 420); x.stroke();

  // crew sprints left (the GHOST carries the mullet)
  const run = (R, rx, ph, extra) => A.drawRemy(x, R, rx, 486, { ...runCycle(ph), flip: true, ...extra });
  const ph0 = t * 16;
  const exit = (startX, speed) => Math.max(-80, startX - (t - 56.1) * speed);
  run(S.r9, exit(760, 300), ph0, {});
  run(S.r26, exit(700, 292), ph0 + 1.1, {});
  run(S.r66, exit(640, 296), ph0 + 2.2, {});
  const gx2 = exit(560, 290);
  run(S.r32, gx2, ph0 + 3.3, {});
  if (gx2 > -40) {
    x.drawImage(S.mulletS, gx2 - 27, 356, 55, 36);
  }
  run(S.r42, exit(500, 288), ph0 + 4.4, { glow: '#ffd9a0', glowA: 0.3 });

  // guards chase left, trip on the rope, then the bosses pile on
  const chaser = (R, baseX, speed, delay) => {
    const ft = seg(t, EV.ropeTrip + delay, EV.ropeTrip + delay + 0.5);
    if (ft <= 0) {
      A.drawRemy(x, R, baseX - (t - 56.1) * speed, 470, { ...runCycle(t * 17 + delay * 8), flip: true });
    } else {
      const fx3 = baseX - (EV.ropeTrip + delay - 56.1) * speed + ft * 70;
      A.drawRemy(x, R, fx3, 470 - Math.sin(ft * Math.PI) * 30, { rot: ft * 1.55, flip: true });
    }
  };
  chaser(S.g585, 900, 132, 0);      // hits the rope dead on
  chaser(S.g458, 1010, 160, 0.12);
  // the bosses leap in and crash on top — staged apart so the pile reads
  const pu = seg(t, EV.pileup, EV.pileup + 0.55);
  for (const [R, px0, sp, land, dir] of [[S.g744, 960, 110, 537, -60], [S.g468, 1080, 130, 701, 50]]) {
    if (pu <= 0) {
      A.drawRemy(x, R, px0 - (t - 56.1) * sp, 470, { ...runCycle(t * 18), flip: true });
    } else {
      const startX = px0 - (EV.pileup - 56.1) * sp;
      const jx = lerp(startX, land, E.outQuad(pu));
      const jy = 470 - Math.sin(pu * Math.PI) * 64;
      A.drawRemy(x, R, jx, jy, { rot: pu * 3.4 * (dir < 0 ? 1 : -1), flip: true });
    }
  }
  if (t > EV.ropeTrip + 0.4 && t < EV.ropeTrip + 1.2) {
    ptext(x, '!!', 560, 380, { size: 16, align: 'center', color: '#ffdf8a' });
  }
  burst(x, EV.pileup, t, 1030, 470, '#8a94b0', 10, 120, 30);
  blit(ctx);
}

// ---------- 8 · getaway — skid, pile in, launch, gate burst ----------

function drawGetaway(ctx, lt, t) {
  // this shot starts 4 s into the alarm clock's world time
  const { g, stop } = ALARM_CLOCK.warp(lt + 4);
  const x = S.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = '#07090f'; x.fillRect(-20, -20, LW + 40, LH + 40);
  // world distance travelled by the car from launch (g=5)
  const launchU = seg(g, 5.0, 6.8);
  const Wd = 720 * E.inQuad(launchU) + (g > 6.8 ? (g - 6.8) * 560 : 0);

  // sky strip + far city scrolling by half speed
  x.fillStyle = '#0a0d20'; x.fillRect(-20, -20, LW + 40, 190);
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(226,232,255,${0.2 + hash(i) * 0.4})`;
    x.fillRect(hash(i * 3 + 1) * LW, hash(i * 5) * 150, 1, 1);
  }
  const cityOff = (Wd * 0.5) % 1920;
  x.drawImage(S.citySil, -cityOff, 128, 960, 95);
  x.drawImage(S.citySil, -cityOff + 1920, 128, 960, 95);
  // casino wall + valet canopy (right, static — the camera only picks up after launch)
  const wallX = 760 + Math.min(0, 50 - Wd) * 0.4;
  x.fillStyle = '#241030'; x.fillRect(wallX, 120, 220, 300);
  x.fillStyle = '#38194a'; x.fillRect(wallX + 20, 150, 180, 240);
  x.fillStyle = '#8a1e3a'; x.fillRect(wallX - 4, 250, 228, 26);
  x.fillStyle = '#ffcf6e'; x.fillRect(wallX - 4, 276, 228, 5);
  ptext(x, 'VALET', wallX + 106, 272, { size: 16, align: 'center', color: '#ffd0d8' });
  // street
  const sg = x.createLinearGradient(0, 420, 0, LH);
  sg.addColorStop(0, '#151322'); sg.addColorStop(1, '#0b0a14');
  x.fillStyle = sg; x.fillRect(-20, 420, LW + 40, LH - 420 + 40);
  x.fillStyle = '#3a3648'; x.fillRect(-20, 424, LW + 40, 6);
  const dOff = Wd % 96;
  x.fillStyle = 'rgba(255,220,150,0.55)';
  for (let dx = -96 - dOff; dx < LW + 96; dx += 96) x.fillRect(dx, 508, 44, 7);
  // lamp posts at fixed world positions (offset off the valet wall)
  for (let i = 0; i < 12; i++) {
    const sx2 = 430 + (600 + i * 620 - Wd);
    if (sx2 > -40 && sx2 < LW + 40) {
      x.fillStyle = '#1a2030'; x.fillRect(sx2, 210, 6, 214);
      x.fillStyle = '#ffe9b0'; x.fillRect(sx2 - 7, 208, 20, 6);
      const lg = x.createRadialGradient(sx2 + 3, 214, 4, sx2 + 3, 214, 80);
      lg.addColorStop(0, 'rgba(255,233,176,0.25)'); lg.addColorStop(1, 'rgba(255,233,176,0)');
      x.fillStyle = lg; x.fillRect(sx2 - 80, 140, 166, 150);
    }
  }

  x.save();
  if (stop != null) {
    const k = 5 * Math.exp(-stop.sl * 10);
    x.translate(Math.round(k * Math.sin(stop.sl * 90)), Math.round(k * Math.cos(stop.sl * 70) * 0.6));
  }
  // SECURITY GATE: world object 1728 ahead of launch start → screen 430 + (1728 − Wd)
  const gateScreen = 430 + (1728 - Wd);
  if (gateScreen > -140 && gateScreen < LW + 140) {
    x.fillStyle = '#2a3040'; x.fillRect(gateScreen - 6, 240, 12, 280);
    x.fillStyle = '#ffcf6e'; x.fillRect(gateScreen - 16, 236, 32, 10);
    ptext(x, 'EXIT', gateScreen, 262, { size: 8, align: 'center', color: '#ffd0d8' });
    const hit = t >= EV.gate - 0.02;
    x.save();
    x.translate(gateScreen - 6, 300);
    x.rotate(hit ? -1.2 - (t - EV.gate) * 2 : 0);
    for (let s2 = 0; s2 < 5; s2++) {
      x.fillStyle = s2 % 2 ? '#ff4050' : '#f2ecff';
      x.fillRect(s2 * 16, -4, 16, 8);
    }
    x.restore();
    if (hit) burst(x, EV.gate, t, gateScreen, 300, '#ffd98a', 16, 260, 20);
  }

  // the car: rushes in from the right, skids to the curb, loads, launches
  const skidU = seg(g, 4.0, 4.6);
  let carX, carRot = 0;
  if (g < 4.0) carX = lerp(1100, 660, E.inOutCubic(seg(g, 3.4, 4.0)));
  else if (launchU <= 0) {
    carX = lerp(660, 430, E.outCubic(skidU));
    carRot = Math.sin((1 - skidU) * 6) * 0.05 * (1 - skidU);
  } else carX = 430;
  // suspension rock while piling in
  const rockT = t - EV.pileIn[0];
  if (rockT > 0 && rockT < 0.9) carRot += Math.sin(rockT * 26) * 0.05 * Math.exp(-rockT * 2);
  x.translate(carX + 75, 496);
  x.rotate(carRot);
  // headlight cone when moving
  if (g > 3.5) {
    const hg = x.createLinearGradient(-75, 0, -300, 0);
    hg.addColorStop(0, 'rgba(255,233,176,0.30)'); hg.addColorStop(1, 'rgba(255,233,176,0)');
    x.fillStyle = hg;
    x.beginPath(); x.moveTo(-73, -42); x.lineTo(-290, -78); x.lineTo(-290, 10); x.closePath(); x.fill();
  }
  x.drawImage(S.car, -75, -66);
  // boost flare during launch
  if (launchU > 0 && launchU < 0.5 && Math.floor(t * 20) % 2 === 0) {
    x.fillStyle = '#ffd98a';
    x.beginPath(); x.moveTo(72, -40); x.lineTo(110, -34); x.lineTo(72, -26); x.closePath(); x.fill();
    x.fillStyle = '#fff8e0';
    x.beginPath(); x.moveTo(72, -37); x.lineTo(92, -34); x.lineTo(72, -30); x.closePath(); x.fill();
  }
  // crew heads in the cockpit (bobbing) once aboard + the mullet on the antenna
  if (t > EV.pileIn[1]) {
    const headsIn = [CAST.LEADER, CAST.WHEEL, CAST.FACE, CAST.SPARK];
    for (let i = 0; i < 4; i++) {
      x.drawImage(S.head[headsIn[i]], -34 + i * 18, -34 + Math.round(Math.sin(t * 7 + i * 1.6) * 2), 32, 32);
    }
    x.strokeStyle = '#3d4458'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(62, -46); x.lineTo(62, -76); x.stroke();
    x.save();
    x.translate(64, -78); x.rotate(Math.sin(t * 4) * 0.1);
    x.drawImage(S.mulletS, -2, -4, 55, 36);
    x.restore();
  }
  x.restore();

  // the crew sprints in from the doors and piles aboard
  for (let i = 0; i < 5; i++) {
    const R = [S.r42, S.r32, S.r66, S.r26, S.r9][i];
    const t0 = EV.pileIn[0] - 0.5 + i * 0.08;
    const startX = 1010 + i * 40;
    const u = seg(t, t0, t0 + 0.62);
    if (u <= 0) continue;
    const runX = lerp(startX, 440, E.inQuad(u));
    if (u < 0.72) {
      A.drawRemy(x, R, runX, 500, { ...runCycle(t * 15 + i * 2), flip: true });
    } else if (u < 1) {
      A.drawRemy(x, R, runX, 500, { ...runCycle(t * 15 + i * 2), flip: true, alpha: 1 - (u - 0.72) / 0.28 });
    }
  }
  // tire smoke at the skid + launch
  burst(x, T.alarm + 4.45, t, 520, 508, '#9aa2b8', 10, 110, 16);
  burst(x, EV.launch + 0.05, t, 500, 508, '#9aa2b8', 14, 150, 20);
  // speed lines once flat out
  if (g > 5.1) {
    const sl = Math.min(1, (g - 5.1) / 0.8);
    x.strokeStyle = `rgba(200,210,255,${0.18 * sl})`; x.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const ly = 240 + hash(i * 9) * 220;
      const lx = ((t * (700 + hash(i) * 500)) % (LW + 300)) - 150;
      x.beginPath(); x.moveTo(lx, ly); x.lineTo(lx + 130 + hash(i * 3) * 90, ly); x.stroke();
    }
  }
  blit(ctx);
}

// ---------- 9 · dawn — the mullet rides the antenna home ----------

function drawDawn(ctx, lt, t) {
  const x = S.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = '#1a0f24'; x.fillRect(-20, -20, LW + 40, LH + 40);
  x.drawImage(S.dawn, 0, 0);
  const s1 = (t * 3) % 1920;
  x.globalAlpha = 0.9;
  x.drawImage(S.citySil, -s1, 262, 960, 95);
  x.drawImage(S.citySil, -s1 + 1920, 262, 960, 95);
  x.globalAlpha = 1;
  const hz = x.createLinearGradient(0, 300, 0, 400);
  hz.addColorStop(0, 'rgba(255,170,110,0)'); hz.addColorStop(1, 'rgba(255,170,110,0.25)');
  x.fillStyle = hz; x.fillRect(0, 300, LW, 100);
  // road
  const sg = x.createLinearGradient(0, 400, 0, LH);
  sg.addColorStop(0, '#241a2a'); sg.addColorStop(1, '#171020');
  x.fillStyle = sg; x.fillRect(-20, 400, LW + 40, LH - 400 + 40);
  x.fillStyle = '#38283e'; x.fillRect(-20, 400, LW + 40, 4);
  const dOff = (t * 85) % 96;
  x.fillStyle = 'rgba(255,220,150,0.5)';
  for (let dx = -96 - dOff; dx < LW + 96; dx += 96) x.fillRect(dx, 480, 44, 7);
  // birds
  for (let i = 0; i < 2; i++) {
    const bt = t - EV.birds[i];
    if (bt > 0 && bt < 2.4) {
      const bx = 900 - bt * 180 + i * 60;
      const by = 120 + Math.sin(bt * 3 + i) * 14 + i * 40;
      const fl = Math.sin(bt * 14) * 3;
      x.strokeStyle = '#2c1a30'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(bx - 5, by + fl); x.lineTo(bx, by); x.lineTo(bx + 5, by + fl); x.stroke();
    }
  }
  // the car cruising into the sun
  const carX = 640, carY = 488 + Math.round(Math.sin(t * 2.2) * 1);
  x.save();
  x.translate(carX, carY);
  x.drawImage(S.car, -75, -66);
  const headsIn = [CAST.LEADER, CAST.WHEEL, CAST.FACE, CAST.SPARK];
  for (let i = 0; i < 4; i++) {
    x.drawImage(S.head[headsIn[i]], -34 + i * 18, -34 + Math.round(Math.sin(t * 5 + i * 1.7) * 2), 32, 32);
  }
  x.strokeStyle = '#3d4458'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(62, -46); x.lineTo(62, -80); x.stroke();
  x.save();
  x.translate(64, -82); x.rotate(-0.25 + Math.sin(t * 3.4) * 0.12);
  x.drawImage(S.mulletS, 0, -6, 60, 39);
  x.restore();
  x.restore();
  blit(ctx);
}

// ---------- 10 · title — neon on black ----------

function drawTitle(ctx, lt, t) {
  ctx.fillStyle = '#050308';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 24; i++) {
    const on = (i + Math.floor(t * 7)) % 5 === 0;
    ctx.fillStyle = on ? 'rgba(255,223,150,0.5)' : 'rgba(255,207,110,0.12)';
    ctx.beginPath(); ctx.arc(120 + i * 76, 74, on ? 4 : 2.6, 0, 7); ctx.fill();
  }
  const buzz = t > EV.buzz && t < EV.word2 ? (hash(Math.floor(t * 30)) - 0.5) * 2.4 : 0;
  // OCEAN'S — letters flicker on
  const word1 = "OCEAN'S";
  const size1 = 150;
  ctx.font = `${size1}px Anton`;
  let tw1 = 0;
  const ws1 = [];
  for (const ch of word1) { const wch = ctx.measureText(ch).width + 10; ws1.push(wch); tw1 += wch; }
  tw1 -= 10;
  let cx = W / 2 - tw1 / 2 + buzz;
  const y1 = 450;
  for (let i = 0; i < word1.length; i++) {
    const onT = EV.word1 + i * 0.06;
    if (t > onT) {
      const a = hash(i * 13 + Math.floor(t * 24)) > 0.94 ? 0.15 : 1;
      ctx.save();
      ctx.shadowColor = 'rgba(255,150,190,0.9)'; ctx.shadowBlur = 30;
      ctx.fillStyle = `rgba(255,240,228,${a})`;
      ctx.font = `${size1}px Anton`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(word1[i], cx, y1);
      ctx.restore();
    }
    cx += ws1[i];
  }
  // FORTY-TWO slams in gold
  const p2 = clamp01((t - EV.word2) / 0.42);
  if (p2 > 0) {
    M.slam(ctx, 'FORTY-TWO', W / 2 + buzz, 640, p2, {
      size: 190, font: 'Anton', color: '#ffcf6e', from: 2.2, shake: 7, track: 4,
      glow: '#ff9a4a', glowBlur: 40, alpha: 1,
    });
    M.underline(ctx, W / 2 - 430, 690, 860, clamp01((t - EV.word2 - 0.15) / 0.5), { color: '#ffcf6e', width: 6 });
  }
  if (t > EV.subline) {
    txt(ctx, 'A REMY BOYS HEIST', W / 2, 760, {
      size: 34, font: '"JetBrains Mono"', weight: 700, color: '#e8dcc8', align: 'center', track: 14,
      alpha: clamp01((t - EV.subline) / 0.4),
    });
  }
  if (t > EV.chipsTitle) {
    const p = clamp01((t - EV.chipsTitle) / 0.5);
    let hx = W / 2 - 320;
    for (let i = 0; i < CREW.length; i++) {
      const m = CREW[i];
      M.chip(ctx, hx + 60, 858, 124, 56, `#${m.id}`, p, { color: m.hex, fill: 'rgba(18,14,26,0.9)', textColor: '#f2ecff', size: 22, track: 2 });
      ctx.drawImage(S.head[m.id], hx + 12, 842);
      hx += 136;
    }
    txt(ctx, 'SHOT ON LOCATION IN REMYPOLIS · NO HAIR WAS HARMED', W / 2, 1006, {
      size: 20, font: '"JetBrains Mono"', weight: 500, color: 'rgba(210,200,220,0.55)', align: 'center', track: 6,
      alpha: clamp01((t - EV.chipsTitle) / 0.6),
    });
  }
}

// ---------- film ----------

export default {
  title: "OCEAN'S FORTY-TWO — a Remy Boys heist",
  output: 'oceans-42.mp4',
  duration: DURATION,
  fonts: [{ family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href }],
  async prepare() { await prepare(); },
  shots: [
    {
      name: 'strip', t0: T.strip, t1: T.dossier,
      draw(ctx, lt, dur, t) { drawStrip(ctx, lt, t); },
      fx: () => ({ bloom: 0.14, bloomThresh: 0.86, vignette: 0.35, grain: 0.012 }),
    },
    {
      name: 'dossier', t0: T.dossier, t1: T.plan,
      draw(ctx, lt, dur, t) { drawDossier(ctx, lt, t); },
      fx: () => ({ bloom: 0.05, vignette: 0.3, grain: 0.01 }),
    },
    {
      name: 'plan', t0: T.plan, t1: T.floor,
      draw(ctx, lt, dur, t) { drawPlan(ctx, lt, t); },
      fx: () => ({ bloom: 0.06, vignette: 0.25, grain: 0.012 }),
    },
    {
      name: 'floor', t0: T.floor, t1: T.vent,
      draw(ctx, lt, dur, t) { drawFloor(ctx, lt, t); },
      fx: () => ({ bloom: 0.12, bloomThresh: 0.88, crt: 0.06, vignette: 0.4, grain: 0.01 }),
    },
    {
      name: 'vent', t0: T.vent, t1: T.vault,
      draw(ctx, lt, dur, t) { drawVent(ctx, lt, t); },
      fx: () => ({ bloom: 0.08, vignette: 0.55, grain: 0.013, sat: 0.9 }),
    },
    {
      name: 'vault', t0: T.vault, t1: T.alarm,
      draw(ctx, lt, dur, t) { drawVault(ctx, lt, t); },
      fx: (lt) => {
        const rev = clamp01((lt - 7.0) / 3);
        return {
          bloom: lerp(0.1, 0.2, rev), bloomThresh: 0.86, vignette: 0.42, grain: 0.011,
          exposure: -0.02 + rev * 0.05,
        };
      },
    },
    {
      name: 'alarm', t0: T.alarm, t1: T.alarm + 4,
      draw(ctx, lt, dur, t) { drawAlarm(ctx, lt, t); },
      fx: () => ({ bloom: 0.14, bloomThresh: 0.85, vignette: 0.42, grain: 0.012, aber: 0.0008, tint: [1.12, 0.82, 0.82] }),
    },
    {
      name: 'getaway', t0: T.alarm + 4, t1: T.dawn,
      draw(ctx, lt, dur, t) { drawGetaway(ctx, lt, t); },
      fx: () => ({ bloom: 0.12, bloomThresh: 0.87, streak: 0.18, vignette: 0.4, grain: 0.011 }),
    },
    {
      name: 'dawn', t0: T.dawn, t1: T.title,
      draw(ctx, lt, dur, t) { drawDawn(ctx, lt, t); },
      fx: () => ({
        bloom: 0.13, bloomThresh: 0.88, rays: 0.3, lightX: 0.71, lightY: 0.66,
        warm: 0.1, sat: 1.08, vignette: 0.3, grain: 0.009,
      }),
    },
    {
      name: 'title', t0: T.title, t1: T.end,
      draw(ctx, lt, dur, t) { drawTitle(ctx, lt, t); },
      fx: (lt) => ({
        bloom: 0.18, bloomThresh: 0.82, vignette: 0.4, grain: 0.012,
        fade: clamp01((lt - (EV.fade[0] - T.title)) / (EV.fade[1] - EV.fade[0])),
      }),
    },
  ],
  captions: CAPTIONS.map((c) => ({ ...c, anim: 'fade', in: 0.4, out: 0.4 })),
  captionStyles: {
    loc: { size: 36, font: '"JetBrains Mono"', weight: 700, color: '#dfe6ff', y: 120, align: 'center', track: 10 },
    tag: { size: 68, font: 'Anton', color: '#ffffff', y: 120, align: 'center', track: 3, glow: '#0c0614', glowBlur: 14 },
    gold: { size: 88, font: 'Anton', color: '#ffd98a', y: 210, align: 'center', track: 4, glow: '#8a5a2a', glowBlur: 18 },
  },
  flashes: FLASHES,
  score,
  audio: { seed: 42, reverb: 1.6, reverbGain: 0.25 },
  grid: { bar: 2 },
  lint: { captionHold: 3.4, safe: { margin: 0.045 } },
};
