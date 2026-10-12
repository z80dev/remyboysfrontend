// A CUT ABOVE — the Remy Boys anime opening. 46 s, 172 BPM, every cut on the bar grid.
// Smooth cinematic shots (cold, gleam) paint the 1920×1080 canvas directly; the world
// shots paint a 960×540 pixel stage (2× nearest upscale) with the shared remy-bros rig.
// Reading text, name cards, cut-ins and the logo live on the post-composited overlay.
import { W, H, hash, seg, lerp, E, txt, measure } from 'filmkit/lib.js';
import * as chipM from 'filmkit/motion.js';
import * as A from '../remy-bros/art.js';
import * as ART from './art.js';
import { score } from './score.js';
import {
  T, B, SHOTS, CAST, HORDE, RUN, STORM, SLASH, SLASH_CLOCK, COMBO, COMBO_CLOCK,
  LEAP, TITLE, DURATION, LW, LH,
} from './timeline.js';

const S = {}; // prepared art store (baked once in prepare, read-only in draw)
const img = async (u) => { const i = new Image(); i.src = u; await i.decode(); return i; };
const portrait = (id) => img(new URL(`../../media/remy/Character${id}.webp`, import.meta.url).href);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const inOutQ = (u) => { const c = clamp01(u); return c < 0.5 ? 2 * c * c : 1 - (-2 * c + 2) ** 2 / 2; };

// ---- shared pixel-stage geometry ----
const ROOF_Y = 380; // top edge of the near rooftop strip
const GY = 382;     // feet line on the roof coping
const SPEED = 220;  // rooftop run speed, px/s (world scrolls, runners hold screen x)
const AIR = 0.55;   // roof-gap jump airtime
const JUMP_H = 64;

// Running pose from world-phase (pure in world distance travelled).
const runCycle = (ph) => {
  const s = Math.sin(ph);
  return {
    lift: [Math.round(Math.max(0, s) * 9), Math.round(Math.max(0, -s) * 9)],
    stride: [Math.round(s * 3), Math.round(-s * 3)],
    lean: 0.09,
  };
};
const idle = (t, k = 1) => ({ lean: Math.sin(t * 2.2) * 0.012 * k, lift: [0, 0], stride: [0, 0] });

async function prepare() {
  // Rig cast (near for action, far for scale/distance).
  S.hero = await A.loadRemy(CAST.HERO, false);
  S.gwei = await A.loadRemy(CAST.GWEI, false);
  S.ray = await A.loadRemy(CAST.RAY, false);
  S.maxi = await A.loadRemy(CAST.MAXI, false);
  S.goonA = await A.loadRemy(CAST.GOON_A, false);
  S.goonB = await A.loadRemy(CAST.GOON_B, false);
  S.heroFar = await A.loadRemy(CAST.HERO, true);
  S.bossFar = await A.loadRemy(CAST.BOSS, true);
  S.horde = [];
  for (const id of HORDE) S.horde.push(await A.loadRemy(id, true));
  const heads = await A.loadHeads();
  S.heroHead6 = A.headIcon(heads, CAST.HERO, 6);
  S.bossHead10 = A.headIcon(heads, CAST.BOSS, 10);
  S.heroHead2 = A.headIcon(heads, CAST.HERO, 2);

  // Original 600×600 portraits (framed panels only — they are opaque).
  S.pHero = await portrait(CAST.HERO);
  S.pGwei = await portrait(CAST.GWEI);
  S.pRay = await portrait(CAST.RAY);
  S.pMaxi = await portrait(CAST.MAXI);
  S.pBoss = await portrait(CAST.BOSS);

  // Baked backdrops and graphics (all deterministic, integer sizes).
  S.dawnSky = ART.dawnSky(LW, LH);
  S.duskSky = ART.duskSky(LW, LH);
  S.stormSky = ART.stormSky(LW, LH);
  S.cityFar = ART.cityFar(1920, 200);
  S.cityMid = ART.cityMid(1920, 300);
  S.roofs = ART.roofsNear(1920, 160);
  S.bolts = [ART.bolt(LW, LH, 11), ART.bolt(LW, LH, 29), ART.bolt(LW, LH, 47)];
  S.speedWarm = ART.speedLines(LW, LH, '#ff9a55', 3);
  S.speedCrimson = ART.speedLines(LW, LH, '#ff7a5c', 5);
  S.speedDark = ART.speedLines(W, H, '#3a2a5e', 7);
  S.sunburst = ART.sunburst(LW, LH);
  S.cloudBank = ART.cloudBank(1920, 420);
  S.blade = ART.blade(1600, 900);
  S.eye = ART.eye(900, 600);
  S.logo = ART.logo(1700, 420);
  S.shine = ART.shine(260, 900);
  S.petals = [ART.petal(16, 2), ART.petal(16, 17), ART.petal(16, 33)];

  S.low = A.canvas(LW, LH);       // persistent pixel stage
  S.logoScratch = A.canvas(S.logo.width, S.logo.height); // logo + shine isolation
  S.bossScratch = A.canvas(S.bossHead10.width, S.bossHead10.height);
}

// ---------- analytic effect helpers (no particle state, pure in time) ----------

function rain(x, g, alpha) {
  if (alpha <= 0) return;
  x.strokeStyle = '#aebdd6';
  x.lineWidth = 2;
  for (let i = 0; i < 84; i++) {
    const sp = 0.6 + hash(i * 7 + 1) * 0.5;
    const px = ((hash(i) * LW + g * 200 * sp) % (LW + 60)) - 30;
    const py = ((hash(i + 91) * LH + g * 820 * sp) % (LH + 60)) - 30;
    x.globalAlpha = alpha * (0.22 + hash(i + 5) * 0.2);
    x.beginPath(); x.moveTo(px, py); x.lineTo(px - 7, py + 22); x.stroke();
  }
  x.globalAlpha = 1;
}

function sparks(x, t0, g, cx, cy, hue, n = 9) {
  const age = g - t0;
  if (age < 0 || age > 0.55) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(i * 31 + t0 * 97) * 1.2;
    const d = 26 + 190 * age * (0.5 + hash(i + 40) * 0.7);
    const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d - 20 * age;
    x.fillStyle = i % 3 === 0 ? '#ffffff' : hue;
    x.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
  }
  x.globalAlpha = clamp01(1 - age / 0.5);
  x.strokeStyle = '#fff'; x.lineWidth = 3;
  x.beginPath(); x.arc(cx, cy, 12 + 170 * age, 0, 7); x.stroke();
  x.globalAlpha = 1;
}

function slashArc(x, t0, g, cx, cy, dir) {
  const age = g - t0;
  if (age < 0 || age > 0.3) return;
  const u = age / 0.3;
  x.save();
  x.translate(cx, cy);
  x.rotate(dir * (0.9 - u * 0.55));
  x.globalAlpha = 1 - u * 0.85;
  x.strokeStyle = '#fff'; x.lineWidth = 7 * (1 - u) + 1;
  x.beginPath(); x.arc(0, 0, 60 + 110 * u, -1.15, 1.0); x.stroke();
  x.strokeStyle = '#ffd9a0'; x.lineWidth = 2;
  x.beginPath(); x.arc(0, 0, 40 + 120 * u, -1.0, 0.85); x.stroke();
  x.restore();
}

// ---------- overlay typography ----------

function nameCard(o, tAbs, spec) {
  // spec: { portrait, id, name, epithet, hex, x, y, w, h, big }
  const tIn = tAbs, dur = spec.big ? 2.3 : 2.0;
  const p = tAbs - tIn;
  if (p < 0 || p > dur) return;
  const pin = E.outBack(clamp01(p / 0.3));
  const pout = clamp01((p - (dur - 0.28)) / 0.28);
  const slide = pout * pout * 160;
  const x = spec.x - (1 - pin) * 90, y = spec.y + slide;
  o.save();
  o.globalAlpha = clamp01(pin) * (1 - pout);
  ART.cutPanel(o, spec.portrait, x, y, spec.w, spec.h, {
    seed: spec.id, skew: spec.skew ?? 26, shade: 0.62,
    dots: spec.hex, glow: spec.big ? spec.hex : null,
  });
  const nx = x + spec.w * 0.14, ny = y + spec.h - (spec.big ? 118 : 96);
  o.fillStyle = spec.hex;
  o.fillRect(nx, ny + (spec.big ? 74 : 62), Math.min(spec.w * 0.7, measure(o, spec.name, spec.big ? 66 : 52, 'Anton') * 0.96), 5);
  txt(o, `#${spec.id}`, nx, ny - 34, { size: 24, font: '"JetBrains Mono"', weight: 700, color: '#e8e2f2', track: 2 });
  txt(o, spec.name, nx, ny, { size: spec.big ? 66 : 52, font: 'Anton', color: '#ffffff', track: 1 });
  txt(o, spec.epithet, nx, ny + (spec.big ? 86 : 72), { size: 26, font: '"JetBrains Mono"', weight: 500, color: spec.hex, track: 6 });
  o.restore();
}

// ---------- shots ----------

// 1 · cold open — the hero portrait half-lit in the dark, dust motes, wind.
function drawCold(ctx, lt) {
  ctx.fillStyle = '#0a0812';
  ctx.fillRect(0, 0, W, H);
  const z = lerp(1.05, 1.0, E.outCubic(clamp01(lt / 2.4)));
  const cx = W * 0.5, cy = H * 0.5;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy);
  ctx.globalAlpha = clamp01(seg(lt, 0.05, 0.75));
  ART.cutPanel(ctx, S.pHero, W * 0.5 - 330, 190, 660, 660, { seed: 42, skew: 26, shade: 0.5, dots: '#8d3b3b', glow: '#8d3b3b' });
  // half-light: the left of the panel sinks into darkness
  const g = ctx.createLinearGradient(W * 0.5 - 360, 0, W * 0.5 + 210, 0);
  g.addColorStop(0, 'rgba(5,3,10,0.96)'); g.addColorStop(0.55, 'rgba(5,3,10,0.82)'); g.addColorStop(1, 'rgba(5,3,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(W * 0.5 - 370, 180, 760, 690);
  ctx.restore();
  // dust motes
  for (let i = 0; i < 46; i++) {
    const mx = hash(i * 3 + 1) * W + Math.sin(lt * 0.35 + i) * 26;
    const my = (hash(i * 5 + 2) * H + lt * (6 + hash(i) * 10)) % H;
    ctx.fillStyle = i % 4 ? 'rgba(214,196,255,0.20)' : 'rgba(255,214,170,0.30)';
    ctx.fillRect(mx, my, 2, 2);
  }
  // wind streaks
  ctx.strokeStyle = 'rgba(230,220,255,0.07)'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const wy = 200 + i * 170 + Math.sin(lt * 0.8 + i * 2) * 30;
    const wx = ((lt * (120 + i * 30) + i * 500) % (W + 500)) - 250;
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 190 + i * 40, wy - 8); ctx.stroke();
  }
}

// 2 · skyline — dawn breaks over the city; a tiny figure on an antenna.
function drawSkyline(ctx, lt) {
  const x = S.low.getContext('2d');
  x.fillStyle = '#0a0812'; x.fillRect(-20, -20, LW + 40, LH + 40);
  const up = E.outCubic(clamp01(lt / 2.6)) * 8;
  x.drawImage(S.dawnSky, 0, -up);
  // strips sit LOW so the warm dawn horizon stays visible between the towers
  const s1 = (lt * 12) % 1920, s2 = (lt * 26) % 1920;
  x.globalAlpha = 0.92;
  x.drawImage(S.cityFar, -s1, 320 - up); x.drawImage(S.cityFar, -s1 + 1920, 320 - up);
  // sun core glowing through the far skyline gaps
  const sg2 = x.createRadialGradient(560, 388, 8, 560, 388, 110);
  sg2.addColorStop(0, 'rgba(255,214,140,0.75)'); sg2.addColorStop(0.4, 'rgba(255,180,110,0.35)'); sg2.addColorStop(1, 'rgba(255,170,110,0)');
  x.fillStyle = sg2;
  x.beginPath(); x.arc(560, 388, 110, 0, 7); x.fill();
  x.drawImage(S.cityMid, -s2, 380 - up); x.drawImage(S.cityMid, -s2 + 1920, 380 - up);
  x.globalAlpha = 1;
  // our antenna, hero standing on top, rooted in a mid-rise rooftop
  const ax = 700, abase = 458 - up;
  x.strokeStyle = '#241d38'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(ax, abase); x.lineTo(ax, abase - 74); x.stroke();
  x.lineWidth = 2;
  for (const [dy, ww] of [[22, 14], [38, 10], [54, 7]]) {
    x.beginPath(); x.moveTo(ax - ww, abase - dy); x.lineTo(ax + ww, abase - dy); x.stroke();
  }
  A.drawRemy(x, S.heroFar, ax, abase - 74, {
    ...idle(lt), sx: 0.62, sy: 0.62, glow: '#ffb36b', glowA: 0.3 + 0.1 * Math.sin(lt * 1.4),
  });
  // birds waking
  for (let i = 0; i < 3; i++) {
    const bx = ((lt * (26 + i * 9) + i * 380) % (LW + 160)) - 80;
    const by = 130 + i * 44 + Math.sin(lt * 2 + i * 2.4) * 9;
    const fl = Math.sin(lt * 9 + i * 3) * 3;
    x.strokeStyle = '#1c1430'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(bx - 5, by + fl); x.lineTo(bx, by); x.lineTo(bx + 5, by + fl); x.stroke();
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
}

// 3 · gleam — the blade crosses the frame; the eye opens. Full-res smooth.
function drawGleam(ctx, lt) {
  ctx.fillStyle = '#0c0a18';
  ctx.fillRect(0, 0, W, H);
  const pulse = 1 + 0.05 * Math.sin(lt * Math.PI * 2 * (BPMz / 60));
  ctx.save();
  ctx.translate(W * 0.5, H * 0.5); ctx.scale(pulse, pulse);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(S.speedDark, -W * 0.5, -H * 0.5);
  ctx.restore();
  const u = clamp01(lt / 2.79);
  ctx.save();
  ctx.translate(W * 0.5 + lerp(90, -70, u), H * 0.52);
  ctx.rotate(-0.1);
  ctx.drawImage(S.blade, -800, -450);
  // travelling gleam band across the blade
  const bandX = lerp(-560, 620, (lt * 0.75) % 1);
  ctx.globalAlpha = 0.55;
  ctx.drawImage(S.shine, bandX, -450, 260, 900);
  ctx.globalAlpha = 1;
  ctx.restore();
  // the eye — second half of the shot
  const ep = seg(lt, 1.15, 1.5);
  if (ep > 0) {
    const k = E.outBack(ep);
    const jit = lt > 1.15 && lt < 1.28 ? Math.round(Math.sin(lt * 200) * 2) : 0;
    ctx.save();
    ctx.translate(1230 + jit, 470);
    ctx.scale(lerp(0.86, 1, k), lerp(0.86, 1, k));
    ctx.drawImage(S.eye, -280, -300);
    ctx.restore();
  }
}
const BPMz = 172; // pulse scale for gleam lines (visual only)

// 4 · run — rooftop chase. World scrolls; three runners hold formation; two roof gaps.
function drawRun(ctx, lt, t, o) {
  const x = S.low.getContext('2d');
  x.fillStyle = '#0a0812'; x.fillRect(-20, -20, LW + 40, LH + 40);
  x.drawImage(S.dawnSky, 0, 0);
  const w = SPEED * lt; // world scroll distance
  const s1 = (w * 0.25) % 1920, s2 = (w * 0.5) % 1920, s3 = w % 1920;
  x.drawImage(S.cityFar, -s1, 150); x.drawImage(S.cityFar, -s1 + 1920, 150);
  x.drawImage(S.cityMid, -s2, 190); x.drawImage(S.cityMid, -s2 + 1920, 190);
  // near rooftops, with the two gap pits cut in
  const drawRoofs = () => {
    x.drawImage(S.roofs, -s3, ROOF_Y); x.drawImage(S.roofs, -s3 + 1920, ROOF_Y);
  };
  drawRoofs();
  for (const j of RUN.jumps) {
    const gc = SPEED * gapT(j) - w + 330; // gap centre screen x at this frame
    if (gc > -80 && gc < LW + 80) {
      // pit: depth, broken coping edges
      const gx = gc - 34;
      const grd = x.createLinearGradient(0, ROOF_Y, 0, LH);
      grd.addColorStop(0, '#241a30'); grd.addColorStop(1, '#0b0714');
      x.fillStyle = grd;
      x.fillRect(gx, ROOF_Y, 68, LH - ROOF_Y);
      x.fillStyle = '#3a2c48';
      x.fillRect(gx - 2, ROOF_Y, 3, 10); x.fillRect(gx + 67, ROOF_Y, 3, 10);
      x.fillStyle = '#161022';
      x.fillRect(gx + 8, ROOF_Y + 26, 22, 8); x.fillRect(gx + 40, ROOF_Y + 52, 18, 7);
    }
    // pigeons burst from the gap edge as the hero lifts off
    const age = lt - j;
    if (age > 0 && age < 1.1) {
      for (let i = 0; i < 3; i++) {
        const px2 = gc - 30 - i * 14 + (10 + i * 26) * age;
        const py2 = GY - 12 - (46 + i * 22) * age + 30 * age * age;
        const fl = Math.sin(age * 26 + i * 2) * 4;
        x.strokeStyle = '#d9d2ea'; x.lineWidth = 2; x.globalAlpha = clamp01(1.4 - age);
        x.beginPath(); x.moveTo(px2 - 5, py2 - fl); x.lineTo(px2, py2); x.lineTo(px2 + 5, py2 - fl); x.stroke();
        x.globalAlpha = 1;
      }
    }
  }
  // runners: hero front, GWEI and RAY behind (jump 0.22 s after the hero)
  const jumpY = (delay) => {
    for (const j of RUN.jumps) {
      const u = (lt - j - delay) / AIR;
      if (u >= 0 && u <= 1) return { dy: -JUMP_H * 4 * u * (1 - u), tuck: true };
    }
    return { dy: 0, tuck: false };
  };
  const runner = (R, screenX, delay, glow) => {
    const jp = jumpY(delay);
    const ph = (w + screenX * 3.1 + delay * 220) / 64 * Math.PI * 2;
    const pose = jp.tuck ? { lift: [7, 7], stride: [3, -3], lean: 0.1 } : runCycle(ph);
    A.drawRemy(x, R, screenX, GY + jp.dy, { ...pose, glow, glowA: 0.16 });
  };
  runner(S.ray, 52, 0.44, null);
  runner(S.gwei, 182, 0.22, null);
  runner(S.hero, 330, 0, '#ffd9a0');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
  // name cards on the overlay
  nameCard(o, T.card1, { portrait: S.pGwei, id: CAST.GWEI, name: 'GWEI', epithet: 'SILVER FLOW', hex: '#aab8b4', x: 84, y: 700, w: 460, h: 300, skew: 24 });
  nameCard(o, T.card2, { portrait: S.pRay, id: CAST.RAY, name: 'RAY', epithet: 'COBALT FLOW', hex: '#4f7bd9', x: 1290, y: 110, w: 460, h: 300, skew: -24 });
  nameCard(o, T.card3, { portrait: S.pHero, id: CAST.HERO, name: 'RIVAL', epithet: 'CRIMSON FLOW', hex: '#d95c5c', x: 84, y: 640, w: 560, h: 360, big: true });
}
const gapT = (j) => j + AIR / 2; // world time the gap centre sits under mid-air

// 5 · storm — the Cabald multiply in the rain; DAN looms.
function drawStorm(ctx, lt) {
  const x = S.low.getContext('2d');
  x.fillStyle = '#0a0812'; x.fillRect(-20, -20, LW + 40, LH + 40);
  x.drawImage(S.stormSky, 0, 0);
  // darker ceiling pressing down
  const dk = x.createLinearGradient(0, 0, 0, 190);
  dk.addColorStop(0, 'rgba(13,11,26,0.75)'); dk.addColorStop(1, 'rgba(13,11,26,0)');
  x.fillStyle = dk; x.fillRect(0, 0, LW, 190);
  for (let i = 0; i < STORM.bolts.length; i++) {
    const age = lt - STORM.bolts[i];
    if (age >= 0 && age < 0.3) {
      x.globalAlpha = clamp01(1 - age / 0.3) * (0.7 + 0.3 * Math.sin(age * 90));
      x.drawImage(S.bolts[i], 0, 0);
      x.globalAlpha = 1;
    }
  }
  // horde ranks: rows march in, one rank at a time
  const bossOn = lt >= STORM.boss;
  // the roofline the horde stands on
  const hg = x.createLinearGradient(0, 500, 0, 540);
  hg.addColorStop(0, '#1c1730'); hg.addColorStop(1, '#0e0b1c');
  x.fillStyle = hg; x.fillRect(-20, 502, LW + 40, 38);
  x.fillStyle = 'rgba(150,140,190,0.18)'; x.fillRect(-20, 501, LW + 40, 1);
  let idx = 0;
  for (let r = 0; r < 4; r++) {
    const appear = 0.25 + r * 0.5;
    const ra = clamp01((lt - appear) / 0.35);
    if (ra <= 0) continue;
    for (let c = 0; c < 5; c++, idx++) {
      const R = S.horde[idx % S.horde.length];
      const bx = 520 + c * 92 - lt * 7 + (r % 2) * 26;
      const by = 306 + r * 62 - (1 - ra) * 26;
      A.drawRemy(x, R, bx, by, { alpha: 0.55 + 0.35 * ra, flip: true, sx: 1.5, sy: 1.5, lean: -0.02 });
      if (bossOn) {
        // crimson glint where eyes would be, under the boss's watch
        x.fillStyle = '#ff3040';
        x.globalAlpha = 0.5 + 0.5 * Math.sin(lt * 7 + idx);
        x.fillRect(bx - 9, by - 96, 3, 3); x.fillRect(bx + 6, by - 96, 3, 3);
        x.globalAlpha = 1;
      }
    }
  }
  // DAN — the bald head rises out of the cloud deck, backlit
  if (bossOn) {
    const u = E.outCubic(clamp01((lt - STORM.boss) / 0.9));
    const by = lerp(620, 316, u);
    const bx = 470, bw = 235;
    const glow = x.createRadialGradient(bx, by - 60, 20, bx, by - 60, 260);
    glow.addColorStop(0, 'rgba(186,158,255,0.55)'); glow.addColorStop(0.5, 'rgba(160,130,240,0.28)'); glow.addColorStop(1, 'rgba(160,130,240,0)');
    x.fillStyle = glow;
    x.fillRect(bx - 270, by - 326, 540, 540);
    const sc = S.bossScratch.getContext('2d');
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.clearRect(0, 0, S.bossScratch.width, S.bossScratch.height);
    sc.drawImage(S.bossHead10, 0, 0);
    sc.globalCompositeOperation = 'source-atop';
    const dk = sc.createLinearGradient(0, 0, 0, S.bossScratch.height);
    dk.addColorStop(0, 'rgba(30,22,52,0.1)'); dk.addColorStop(1, 'rgba(14,10,28,0.85)');
    sc.fillStyle = dk;
    sc.fillRect(0, 0, S.bossScratch.width, S.bossScratch.height);
    sc.globalCompositeOperation = 'source-over';
    x.imageSmoothingEnabled = false;
    x.drawImage(S.bossScratch, bx - bw / 2, by - 40, bw, bw);
    // burning eyes under the brow
    const ep2 = 0.65 + 0.35 * Math.sin(lt * 5);
    for (const ex2 of [bx - 34, bx + 28]) {
      const eg = x.createRadialGradient(ex2 + 3, by + 37, 1, ex2 + 3, by + 37, 16);
      eg.addColorStop(0, `rgba(255,60,70,${0.5 * ep2})`); eg.addColorStop(1, 'rgba(255,60,70,0)');
      x.fillStyle = eg;
      x.fillRect(ex2 - 14, by + 21, 34, 34);
    }
    x.fillStyle = '#ff3040'; x.globalAlpha = ep2;
    x.fillRect(bx - 36, by + 32, 9, 9); x.fillRect(bx + 26, by + 32, 9, 9);
    x.globalAlpha = 1;
  }
  rain(x, lt, clamp01(lt * 2));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
}

// 6 · resolve — the rain stops, light cracks through, the trio stands its ground.
function drawResolve(ctx, lt, t, o) {
  const x = S.low.getContext('2d');
  x.fillStyle = '#0a0812'; x.fillRect(-20, -20, LW + 40, LH + 40);
  x.drawImage(S.stormSky, 0, 0);
  // the crack of dawn tears open along the horizon
  const cu = E.outCubic(seg(lt, 0.4, 2.4));
  if (cu > 0) {
    x.save();
    x.translate(690, 330);
    x.rotate(-0.1);
    const grd = x.createLinearGradient(0, -80, 0, 120);
    grd.addColorStop(0, 'rgba(255,196,120,0)'); grd.addColorStop(0.4, `rgba(255,206,140,${0.95 * cu})`); grd.addColorStop(1, 'rgba(255,224,170,0)');
    x.fillStyle = grd;
    x.fillRect(-40 - 220 * cu, -80, 80 + 440 * cu, 200);
    // the sun itself, blazing in the crack
    x.globalAlpha = 0.95 * cu;
    const sglow = x.createRadialGradient(0, 10, 2, 0, 10, 46 + 20 * cu);
    sglow.addColorStop(0, '#fff6dc'); sglow.addColorStop(0.35, 'rgba(255,214,140,0.85)'); sglow.addColorStop(1, 'rgba(255,190,120,0)');
    x.fillStyle = sglow;
    x.beginPath(); x.arc(0, 10, 46 + 20 * cu, 0, 7); x.fill();
    x.fillStyle = '#fff2cc';
    x.beginPath(); x.arc(0, 10, 17 + 8 * cu, 0, 7); x.fill();
    x.globalAlpha = 1;
    x.restore();
    x.globalAlpha = 0.6 * cu;
    x.drawImage(S.sunburst, 0, 0);
    x.globalAlpha = 1;
  }
  // the ground the trio stands on — a dark rooftop with a lit coping edge
  const gb2 = x.createLinearGradient(0, 460, 0, 540);
  gb2.addColorStop(0, '#2a1c30'); gb2.addColorStop(1, '#120c1c');
  x.fillStyle = gb2; x.fillRect(-20, 462, LW + 40, 78);
  x.fillStyle = `rgba(255,180,120,${0.25 + 0.55 * cu})`; x.fillRect(-20, 460, LW + 40, 2);
  // horde dissolves back into the dark, rank by rank
  let idx = 0;
  for (let r = 0; r < 4; r++) {
    const fa = clamp01((lt - 0.3 - r * 0.35) / 0.7);
    if (fa >= 1) continue;
    for (let c = 0; c < 5; c++, idx++) {
      A.drawRemy(x, S.horde[idx % S.horde.length], 700 + c * 56 + fa * 130, 420 + (r % 2) * 16,
        { alpha: (0.5 - fa * 0.5) * (r >= 2 ? 0.6 : 1), flip: true, sx: 1.1, sy: 1.1 });
    }
  }
  rain(x, lt, clamp01(1 - lt / 1.4) * 0.8);
  // the trio walks in and plants
  const stance = (R, tx, i, glow) => {
    const walkU = clamp01(lt / 1.5);
    const px2 = lerp(-60 + i * 30, tx, E.outCubic(walkU));
    const pose = walkU < 1 ? runCycle(px2 * 0.35) : idle(lt, 1.4);
    A.drawRemy(x, R, px2, 486, { ...pose, glow, glowA: walkU < 1 ? 0.1 : 0.16 + 0.06 * Math.sin(lt * 1.3) });
  };
  stance(S.gwei, 220, 0, null);
  stance(S.ray, 292, 1, null);
  stance(S.hero, 372, 2, '#ffd9a0');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
  // hero cut-in on the overlay
  const cp = lt - 1.8;
  if (cp > 0 && cp < 1.7) {
    const k = E.outBack(clamp01(cp / 0.3));
    const out = clamp01((cp - 1.42) / 0.28);
    o.save();
    o.globalAlpha = clamp01(k) * (1 - out);
    const ox = 1100 + (1 - k) * 60 + out * out * 120;
    ART.cutPanel(o, S.pHero, ox, 290, 560, 430, { seed: 7, skew: 22, shade: 0.62, dots: '#8d3b3b', glow: '#8d3b3b' });
    txt(o, 'RIVAL', ox + 74, 290 + 430 - 96, { size: 84, font: 'Anton', color: '#fff', track: 1, stroke: '#14060e', strokeW: 3 });
    o.fillStyle = 'rgba(12,6,16,0.78)';
    o.fillRect(ox + 70, 290 + 430 - 40, 346, 42);
    txt(o, `#${CAST.HERO} · CRIMSON FLOW`, ox + 76, 290 + 430 - 28, { size: 27, font: '"JetBrains Mono"', weight: 700, color: '#f0b8b0', track: 4 });
    o.restore();
  }
}

// 7 · slash — ACTION I. The first cut, with hit-stop.
function drawSlash(ctx, lt) {
  const { g, stop } = SLASH_CLOCK.warp(lt);
  const x = S.low.getContext('2d');
  x.fillStyle = '#0a0812'; x.fillRect(-20, -20, LW + 40, LH + 40);
  // camera: push in through the dash, hold through the freeze, ease back after
  const zoom = 1 + 0.12 * seg(g, SLASH.dash, SLASH.contact) * (1 - seg(g, SLASH.contact + 0.35, SLASH.land));
  const shakeT = lt - (SLASH_CLOCK.filmT(SLASH.contact) - T.slash);
  const k = shakeT > 0 && shakeT < 0.35 ? 7 * Math.exp(-shakeT * 13) : 0;
  x.save();
  x.translate(LW / 2 + Math.round(k * Math.sin(shakeT * 93)), 300 + Math.round(k * Math.cos(shakeT * 71)));
  x.scale(zoom, zoom);
  x.translate(-LW / 2, -300);
  x.translate(-Math.round(k * Math.sin(shakeT * 93)), -Math.round(k * Math.cos(shakeT * 71)));
  x.fillStyle = '#140b1c'; x.fillRect(-40, -40, LW + 80, LH + 80);
  // pulsing radial speed lines + horizon band
  const sp = 1 + 0.045 * Math.sin(g * Math.PI * 2 * 172 / 60 / 2);
  x.save(); x.translate(LW / 2, 300); x.scale(sp, sp);
  x.globalAlpha = 0.75; x.drawImage(S.speedWarm, -LW / 2, -300); x.globalAlpha = 1;
  x.restore();
  const hb = x.createLinearGradient(0, 452, 0, 540);
  hb.addColorStop(0, '#3a2040'); hb.addColorStop(1, '#120a1c');
  x.fillStyle = hb; x.fillRect(-40, 460, LW + 80, LH);
  x.fillStyle = 'rgba(255,170,110,0.7)'; x.fillRect(-40, 458, LW + 80, 2);
  // the goon: idle bob, then cut down at contact
  const gX = 640;
  if (g < SLASH.contact) {
    A.drawRemy(x, S.goonA, gX, 466 + Math.sin(g * 3) * 2, { flip: true, lean: -0.03 });
  } else {
    const a = g - SLASH.contact;
    const tx = gX + Math.min(a * 150, 120);
    const ty = 466 - Math.max(0, 70 * a - 190 * a * a);
    A.drawRemy(x, S.goonA, tx, ty, { flip: true, rot: Math.min(a * 8, 1.9), alpha: 1, white: stop != null && stop.sl < 0.08 });
  }
  // the hero dashes in with afterimages, slides to a planted stop
  const dashU = seg(g, SLASH.dash, SLASH.contact);
  const hx = g < SLASH.contact
    ? lerp(-70, gX - 42, E.inQuad(dashU))
    : lerp(gX - 42, gX + 60, E.outCubic(seg(g, SLASH.contact, SLASH.land)));
  if (g >= SLASH.dash && g < SLASH.contact) {
    for (let i = 1; i <= 2; i++) A.drawRemy(x, S.hero, hx - i * 34, 466, { lean: 0.16, lift: [4, 4], stride: [4, -4], alpha: 0.22 / i, glow: '#ffd9a0', glowA: 0.1 });
  }
  const heroPose = g < SLASH.contact
    ? { lean: 0.16, lift: [4, 4], stride: [5, -5] }
    : { lean: -0.04, lift: [0, 0], stride: [3, 0] };
  A.drawRemy(x, S.hero, hx, 466, { ...heroPose, glow: '#ffd9a0', glowA: stop != null ? 0.9 : 0.3, white: stop != null && stop.sl < 0.08 });
  slashArc(x, SLASH.contact, g, gX - 10, 400, 1);
  sparks(x, SLASH.contact, g, gX - 6, 402, '#ffd9a0');
  x.restore();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
}

// 8 · combo — ACTION II. Whip, spin-kick, and the goon cannonballs into the horde.
function drawCombo(ctx, lt) {
  const { g, stop } = COMBO_CLOCK.warp(lt);
  const x = S.low.getContext('2d');
  x.fillStyle = '#0a0812'; x.fillRect(-20, -20, LW + 40, LH + 40);
  const kickT = lt - (COMBO_CLOCK.filmT(COMBO.kick) - T.combo);
  const k = kickT > 0 && kickT < 0.4 ? 8 * Math.exp(-kickT * 11) : 0;
  const whipT = lt - (COMBO_CLOCK.filmT(COMBO.whip) - T.combo);
  const kw = whipT > 0 && whipT < 0.3 ? 4 * Math.exp(-whipT * 14) : 0;
  x.save();
  x.translate(Math.round(k * Math.sin(kickT * 89) + kw * Math.sin(whipT * 101) / 2), Math.round(k * Math.cos(kickT * 67)));
  x.fillStyle = '#140b1c'; x.fillRect(-40, -40, LW + 80, LH + 80);
  const sp = 1 + 0.05 * Math.sin(g * Math.PI * 2 * 172 / 60 / 2);
  x.save(); x.translate(LW / 2, 300); x.scale(sp, sp);
  x.globalAlpha = 0.8; x.drawImage(S.speedCrimson, -LW / 2, -300); x.globalAlpha = 1;
  x.restore();
  const hb = x.createLinearGradient(0, 452, 0, 540);
  hb.addColorStop(0, '#3a2040'); hb.addColorStop(1, '#120a1c');
  x.fillStyle = hb; x.fillRect(-40, 460, LW + 80, LH);
  x.fillStyle = 'rgba(255,170,110,0.55)'; x.fillRect(-40, 458, LW + 80, 2);
  // distant horde at the right edge — they get scattered by the flying goon
  const flyX = COMBO.fly < g ? 560 + 620 * (g - COMBO.fly) ** 1.15 : -1;
  for (let i = 0; i < 4; i++) {
    const hx2 = 872 + i * 22;
    const scare = flyX > 760 ? clamp01((flyX - 760) / 90) : 0;
    A.drawRemy(x, S.horde[(i * 3 + 2) % S.horde.length], hx2 + scare * (30 + i * 26), 472 - Math.sin(scare * Math.PI) * (24 + i * 7),
      { flip: true, sx: 0.85, sy: 0.85, alpha: 0.85 - scare * 0.85, rot: scare * 0.8 });
  }
  // GOON B: staggers from the whip, then leaves the county
  const gX = 600;
  if (g < COMBO.kick) {
    const stag = g > COMBO.whip ? (g - COMBO.whip) * 60 : 0;
    A.drawRemy(x, S.goonB, gX + stag, 466, { flip: true, lean: -0.06 - (g > COMBO.whip ? 0.1 : 0), white: stop != null && stop.sl < 0.08 });
  } else {
    const a = g - COMBO.kick;
    const tx = gX + 620 * a ** 1.12;
    const ty = 466 - 320 * a + 430 * a * a;
    A.drawRemy(x, S.goonB, tx, ty, { flip: true, rot: a * 11, white: stop != null && a < 0.15, alpha: clamp01(2.4 - a * 0.55) });
    if (a > 0.1) { // motion streak behind the flying goon
      x.globalAlpha = 0.3; x.strokeStyle = '#ffd9c0'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(tx - 70, ty + 20); x.lineTo(tx - 150, ty + 44); x.stroke();
      x.globalAlpha = 1;
    }
  }
  // HERO: dash to whip range, then the spin approach and kick (an airborne flip, so the
  // feet-pivot rotation never swings the body through the ground)
  const hx = g < COMBO.whip
    ? lerp(200, 430, E.outCubic(seg(g, 0.3, COMBO.whip)))
    : lerp(430, 512, inOutQ(seg(g, COMBO.whip + 0.16, COMBO.kick)));
  const spinU = seg(g, COMBO.whip + 0.16, COMBO.kick);
  const rot = spinU > 0 && spinU < 1 ? spinU * Math.PI * 2 : 0;
  const flipY = 466 - Math.sin(Math.min(1, Math.max(0, spinU)) * Math.PI) * 88;
  if (g >= COMBO.whip + 0.16 && g < COMBO.kick) {
    for (let i = 1; i <= 2; i++) A.drawRemy(x, S.hero, hx - i * 26, flipY - i * 8, { rot: rot - i * 0.35, alpha: 0.2 / i, glow: '#ffd9a0', glowA: 0.1 });
  }
  A.drawRemy(x, S.hero, hx, flipY, {
    rot, lean: g < 0.3 ? 0 : -0.02,
    lift: g >= COMBO.kick && g < COMBO.kick + 0.3 ? [0, 8] : [0, 0],
    glow: '#ffd9a0', glowA: stop != null ? 0.9 : 0.3,
    white: stop != null && stop.sl < 0.1,
  });
  // the whip: a crimson hair arc snapping from hero to goon
  const wAge = g - COMBO.whip;
  if (wAge > 0 && wAge < 0.45) {
    x.globalAlpha = clamp01(1.2 - wAge * 2.8);
    x.strokeStyle = '#c94444'; x.lineWidth = 5;
    x.beginPath(); x.moveTo(hx - 26, 388);
    x.quadraticCurveTo(gX - 60, 320 - wAge * 90, gX + 8, 380 - wAge * 40);
    x.stroke();
    x.strokeStyle = '#ffb9a0'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(hx - 24, 390);
    x.quadraticCurveTo(gX - 60, 316 - wAge * 90, gX + 6, 378 - wAge * 40);
    x.stroke();
    x.globalAlpha = 1;
  }
  slashArc(x, COMBO.kick, g, gX - 20, 400, -1);
  sparks(x, COMBO.kick, g, gX, 402, '#ff9a7a', 12);
  sparks(x, COMBO.whip, g, gX - 4, 380, '#c94444', 6);
  x.restore();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
}

// 9 · leap — the quartet jumps the camera, over a sea of sunrise clouds.
function drawLeap(ctx, lt) {
  const x = S.low.getContext('2d');
  x.fillStyle = '#0a0812'; x.fillRect(-20, -20, LW + 40, LH + 40);
  x.drawImage(S.dawnSky, 0, 0);
  const bright = seg(lt, 0, LEAP.apex);
  x.fillStyle = `rgba(255,214,150,${0.22 * bright})`;
  x.fillRect(0, 0, LW, LH);
  x.globalAlpha = 0.25 + 0.55 * bright;
  x.drawImage(S.sunburst, 0, 0);
  x.globalAlpha = 1;
  // the cloud sea sinks as the boys rise
  const cy = lerp(90, 330, E.outCubic(clamp01(lt / 3.8)));
  x.drawImage(S.cloudBank, 0, cy, 960, 210);
  // the Cabald watches from far below, rimmed dark against the bright cloud sea
  const watchO = { alpha: 0.95, glow: '#1c1428', glowA: 0.9 };
  A.drawRemy(x, S.bossFar, 460, 542, { ...watchO, sx: 1.35, sy: 1.35 });
  for (let i = 0; i < 3; i++) A.drawRemy(x, S.horde[i * 4], 372 + i * 84, 546, watchO);
  // rising wind streaks
  x.strokeStyle = 'rgba(255,240,220,0.14)'; x.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const sxp = 60 + i * 140;
    const syp = LH - ((lt * (240 + i * 40) + i * 200) % (LH + 200)) + 100;
    x.beginPath(); x.moveTo(sxp, syp); x.lineTo(sxp + 4, syp - 70); x.stroke();
  }
  // the quartet — diamond formation growing into the lens
  const gy = lerp(650, 340, E.outCubic(clamp01(lt / LEAP.apex))) + Math.sin(lt * 1.1) * 4;
  const gs = lerp(1.15, 2.6, E.outCubic(clamp01(lt / LEAP.pass)));
  const flutter = Math.sin(lt * 6) * 0.03;
  const member = (R, dx, dy, mul, glow) => {
    A.drawRemy(x, R, 480 + dx * (gs / 2.6), gy + dy + 34 * (1 - Math.min(gs, 2.6) / 2.6), {
      sx: gs * mul, sy: gs * mul, lean: -0.07 + flutter, lift: [3, 3], stride: [2, -2],
      glow, glowA: 0.2 * bright,
    });
  };
  member(S.gwei, -142, 48, 0.62, null);
  member(S.ray, 142, 48, 0.62, null);
  member(S.hero, 0, 0, 1, '#ffd9a0');
  // MAXI springs up from below into the top-left of the diamond, drawn over the hero
  const mU = E.outBack(clamp01((lt - 1.2) / 0.7));
  if (mU > 0) member(S.maxi, -108, lerp(260, -128, mU), 0.52, '#a8f0e0');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
}

// 10 · title — dusk lineup, petals, the logo, the end card.
function drawTitle(ctx, lt, t, o) {
  const x = S.low.getContext('2d');
  x.fillStyle = '#0a0812'; x.fillRect(-20, -20, LW + 40, LH + 40);
  const push = 1 + 0.05 * E.outCubic(clamp01(lt / 4.0));
  x.save();
  x.translate(LW / 2, LH / 2); x.scale(push, push); x.translate(-LW / 2, -LH / 2);
  x.drawImage(S.duskSky, 0, 0);
  const s1 = (lt * 6) % 1920;
  x.drawImage(S.cityFar, -s1, 300); x.drawImage(S.cityFar, -s1 + 1920, 300);
  const off = (lt * 10) % 960;
  x.drawImage(S.roofs, 0, 0, 1920, 120, -off, 428, 960, 54);
  x.drawImage(S.roofs, 0, 0, 1920, 120, -off + 960, 428, 960, 54);
  // warm lit coping along the roof edge the crew stands on
  x.fillStyle = 'rgba(255,196,140,0.95)'; x.fillRect(-20, 428, LW + 40, 2);
  x.fillStyle = 'rgba(255,150,100,0.4)'; x.fillRect(-20, 430, LW + 40, 4);
  // warm sheen on the roof deck under their feet
  const dsh = x.createLinearGradient(0, 433, 0, 482);
  dsh.addColorStop(0, 'rgba(255,170,110,0.20)'); dsh.addColorStop(1, 'rgba(20,10,24,0)');
  x.fillStyle = dsh; x.fillRect(-20, 433, LW + 40, 49);
  // the crew at the edge of the roof, watching the sun go down
  A.drawRemy(x, S.gwei, 292, 470, idle(t, 1.2));
  A.drawRemy(x, S.ray, 392, 470, idle(t + 1, 1.2));
  A.drawRemy(x, S.hero, 496, 476, { ...idle(t + 2, 1.6), glow: '#ffd9a0', glowA: 0.22 });
  A.drawRemy(x, S.maxi, 604, 470, idle(t + 3, 1.2));
  // falling petals
  for (let i = 0; i < 26; i++) {
    const sway = Math.sin(t * 1.1 + i * 1.7) * (18 + hash(i) * 26);
    const px2 = (hash(i * 13 + 5) * LW + sway + t * 12) % (LW + 40) - 20;
    const py2 = ((hash(i * 7 + 3) * LH + t * (26 + hash(i) * 34)) % (LH + 60)) - 30;
    x.save();
    x.translate(px2, py2);
    x.rotate(Math.sin(t * 1.6 + i) * 0.7);
    x.globalAlpha = 0.75;
    x.drawImage(S.petals[i % 3], -8, -8);
    x.restore();
  }
  x.globalAlpha = 1;
  x.restore();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);

  // ---- logo on the overlay ----
  const slamT = lt - TITLE.slam;
  if (slamT >= 0) {
    const p = clamp01(slamT / 0.45);
    const k = lerp(2.5, 1, E.outBack(p));
    const shT = slamT - 0.05;
    const shk = shT > 0 && shT < 0.4 ? 9 * Math.exp(-shT * 10) : 0;
    o.save();
    o.translate(W / 2 + Math.round(shk * Math.sin(shT * 81)), 330 + Math.round(shk * Math.cos(shT * 63) / 2));
    o.scale(k, k);
    o.globalAlpha = clamp01(p * 3);
    const su = seg(lt, TITLE.shine, TITLE.shine + 0.8);
    if (su > 0 && su < 1) {
      const sc = S.logoScratch.getContext('2d');
      sc.setTransform(1, 0, 0, 1, 0, 0);
      sc.clearRect(0, 0, S.logoScratch.width, S.logoScratch.height);
      sc.drawImage(S.logo, 0, 0);
      sc.globalCompositeOperation = 'source-atop';
      sc.drawImage(S.shine, lerp(-320, S.logoScratch.width + 80, su), -220, 260, 900);
      sc.globalCompositeOperation = 'source-over';
      o.drawImage(S.logoScratch, -S.logo.width / 2, -S.logo.height / 2);
    } else {
      o.drawImage(S.logo, -S.logo.width / 2, -S.logo.height / 2);
    }
    o.restore();
    // subtitle chip + end kicker
    chipM.chip(o, W / 2 - 330, 596, 660, 74, 'OPENING THEME — "A CUT ABOVE"', clamp01((lt - TITLE.sub) / 0.4), {
      color: '#ff6b5e', textColor: '#fff8f0', fill: 'rgba(26,12,24,0.72)', size: 30, track: 3,
    });
    const ep = clamp01((lt - (TITLE.shine + 0.15)) / 0.35);
    if (ep > 0) {
      txt(o, 'EP.01 — “THE CABALD STRIKES”', W / 2, 988, { size: 28, font: '"JetBrains Mono"', weight: 700, color: '#ffffff', align: 'center', track: 6, alpha: ep, glow: '#0c0614', glowBlur: 10 });
    }
  }
}

// ---------- film ----------

export default {
  title: 'A CUT ABOVE — Remy Boys anime OP',
  output: 'remy-anime.mp4',
  duration: DURATION,
  async prepare() { await prepare(); },
  shots: [
    {
      name: 'cold', t0: T.cold, t1: T.skyline,
      draw(ctx, lt) { drawCold(ctx, lt); },
      fx: () => ({ bloom: 0.06, vignette: 0.55, grain: 0.012 }),
    },
    {
      name: 'skyline', t0: T.skyline, t1: T.gleam,
      draw(ctx, lt) { drawSkyline(ctx, lt); },
      fx: (lt) => ({ bloom: 0.1, bloomThresh: 0.88, vignette: 0.4, grain: 0.01, fade: 1 - clamp01(lt / 0.35) }),
    },
    {
      name: 'gleam', t0: T.gleam, t1: T.run,
      draw(ctx, lt) { drawGleam(ctx, lt); },
      fx: () => ({ bloom: 0.1, bloomThresh: 0.88, aber: 0.0006, vignette: 0.45, grain: 0.012 }),
    },
    {
      name: 'run', t0: T.run, t1: T.storm,
      draw(ctx, lt, dur, t, overlay) { drawRun(ctx, lt, t, overlay); },
      fx: () => ({ bloom: 0.12, bloomThresh: 0.9, crt: 0.07, vignette: 0.42, grain: 0.009 }),
    },
    {
      name: 'storm', t0: T.storm, t1: T.resolve,
      draw(ctx, lt) { drawStorm(ctx, lt); },
      fx: (lt) => ({
        bloom: 0.09, vignette: 0.68, grain: 0.014, sat: 0.5,
        tint: [0.82, 0.88, 1.12], contrast: 1.08, fade: 1 - clamp01(lt / 0.2),
      }),
    },
    {
      name: 'resolve', t0: T.resolve, t1: T.slash,
      draw(ctx, lt, dur, t, overlay) { drawResolve(ctx, lt, t, overlay); },
      fx: (lt) => {
        const u = clamp01(lt / 3.6);
        const tw = (a, b) => lerp(a, b, u);
        return {
          bloom: lerp(0.09, 0.16, u), vignette: 0.5, grain: 0.011, sat: lerp(0.5, 1.05, u),
          tint: [tw(0.82, 1.04), tw(0.88, 1.0), tw(1.12, 0.96)],
        };
      },
    },
    {
      name: 'slash', t0: T.slash, t1: T.combo,
      draw(ctx, lt) { drawSlash(ctx, lt); },
      fx: (lt) => {
        const frozen = SLASH_CLOCK.warp(lt).stop != null;
        return { bloom: 0.16, bloomThresh: 0.87, aber: frozen ? 0.0026 : 0.0006, streak: 0.14, vignette: 0.4, grain: 0.01 };
      },
    },
    {
      name: 'combo', t0: T.combo, t1: T.leap,
      draw(ctx, lt) { drawCombo(ctx, lt); },
      fx: (lt) => {
        const frozen = COMBO_CLOCK.warp(lt).stop != null;
        return { bloom: 0.17, bloomThresh: 0.87, aber: frozen ? 0.003 : 0.0007, streak: 0.16, vignette: 0.4, grain: 0.01 };
      },
    },
    {
      name: 'leap', t0: T.leap, t1: T.title,
      draw(ctx, lt) { drawLeap(ctx, lt); },
      fx: (lt) => {
        const u = clamp01(lt / 2.2);
        return { bloom: lerp(0.1, 0.14, u), rays: 0.42 * u, lightX: 0.5, lightY: 0.02, streak: 0.12, vignette: 0.32, grain: 0.008, sat: 1.12, warm: 0.06 };
      },
    },
    {
      name: 'title', t0: T.title, t1: T.end,
      draw(ctx, lt, dur, t, overlay) { drawTitle(ctx, lt, t, overlay); },
      fx: (lt) => ({
        bloom: 0.12, bloomThresh: 0.88, vignette: 0.3, grain: 0.01,
        fade: clamp01((lt - TITLE.fade) / (T.end - T.title - TITLE.fade)),
      }),
    },
  ],
  captions: [
    { id: 'kicker', text: 'REMY BOYS PRESENTS', t0: 0.5, t1: T.skyline - 0.15, style: 'kicker', anim: 'fade', in: 0.3, out: 0.3, y: 108, align: 'center' },
  ],
  flashes: [
    [T.storm + STORM.bolts[0], 0.42, 0.12],
    [T.storm + STORM.bolts[1], 0.5, 0.12],
    [T.storm + STORM.bolts[2], 0.55, 0.14],
    [SLASH_CLOCK.filmT(SLASH.contact), 0.5, 0.12],
    [COMBO_CLOCK.filmT(COMBO.kick), 0.55, 0.14],
    [T.title + TITLE.slam, 0.5, 0.18],
  ],
  score,
  audio: { seed: 11, reverb: 1.5, reverbGain: 0.22 },
  grid: { bar: B },
  lint: { captionHold: 1.4, safe: { margin: 0.04 } },
};
