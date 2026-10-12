// The race: a scanline pseudo-3D road (segment projection, curves, hills, a fork) rendered at 640×360 into an
// ImageData buffer, sprites scaled back-to-front, the hero's convertible drawn live from behind, HUD on top.
import { hash } from 'filmkit/lib.js';
import * as A from './art.js';
import {
  LW, LH, HZ, FP, DEPTH, CAM_H, SEG, ROADW, RUMBLE, PZ, DRAW, PXW, NSEG, CURVE, Y, roadY, bgX, curveAt, camZ, heroZ, heroX, heroVX,
  speedAt, kmh, rpm as engineRpm, G, STOPS, warp, filmT, T_RACE, CARS, carAt, BOSS_LAND, hudTime, hudScore, lapTime, SHAKES, TIME_BONUS,
  START_SEG, FORK_SEG, FORK_LEN, CHECK_SEG, GOAL_SEG, STAGE2_SEG, forkSep, BEAT,
} from './choreo.js';

export const ART = {};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const text = A.text;

// ---------- palettes (ABGR uint32 per fog level) ----------
const FOG_LEVELS = 6;
function pal(cols, fog) {
  const out = {};
  for (const k in cols) {
    out[k] = [];
    for (let l = 0; l < FOG_LEVELS; l++) {
      const [r, g, b] = A.rgb(A.mix(cols[k], fog, (l / (FOG_LEVELS - 1)) * 0.9));
      out[k].push((255 << 24) | (b << 16) | (g << 8) | r);
    }
  }
  return out;
}
const STAGES = [
  pal({
    g0: '#eaa46c', g1: '#dc8e5c', w0: '#4a50c0', w1: '#4048b0', foam: '#ffe6f2', foam2: '#b8b8f0',
    r0: '#7c6c8c', r1: '#746484', lane: '#f4ecfa', edge: '#f4ecfa', k0: '#e8203a', k1: '#f4ecfa',
  }, '#f6a88a'),
  pal({
    g0: '#c8643c', g1: '#b65430', w0: '#000000', w1: '#000000', foam: '#000000', foam2: '#000000',
    r0: '#5e4e72', r1: '#56466a', lane: '#ffe6a0', edge: '#ffd31a', k0: '#ffd31a', k1: '#2a1a3a',
  }, '#d8607a'),
];

export async function prepareGame() {
  const heads = await A.loadHeads();
  const sidesImg = new Image();
  sidesImg.src = new URL('../../media/quest/sides.webp', import.meta.url).href;
  await sidesImg.decode();
  const atlasData = (img) => { const c = A.canvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height).data; };
  const HD = atlasData(heads), SD = atlasData(sidesImg);
  const head = (i) => A.atlasHead(HD, heads.width, i), side = (i) => A.atlasHead(SD, sidesImg.width, i);
  ART.heads = heads;
  const BOSS_CREW = [952, 1217, 1034];
  await A.loadSkins([42, 1, ...CARS.map((c) => c.driver), ...BOSS_CREW, 0, 5, 744]);
  ART.cars = {};
  for (const c of CARS) {
    const sk = A.SKIN[c.driver].skin;
    if (c.kind === 'bug') ART.cars[c.id] = A.bugFaces(c.col, sk, side(c.driver), head(c.driver));
    else if (c.kind === 'pickup') ART.cars[c.id] = A.pickupFaces(c.col, sk, side(c.driver), head(c.driver));
    else if (c.kind === 'truck') ART.cars[c.id] = A.truckFace(sk);
    else ART.cars[c.id] = A.limoFaces(BOSS_CREW.map((i) => A.SKIN[i].skin), BOSS_CREW.map(side), head(1217));
  }
  ART.heroIcon = A.headIcon(heads, 42, 1);
  ART.heroIcon2 = A.headIcon(heads, 42, 2);
  ART.paxIcon = A.headIcon(heads, 1, 1);
  ART.baldIcon = A.headIcon(heads, 0, 1);
  ART.baldIcon2 = A.headIcon(heads, 5, 2);
  ART.bossIcon = A.headIcon(heads, 1217, 1);
  ART.palms = [0, 1, 2].map((i) => A.palm(i * 7 + 3, 210 + i * 18));
  ART.cacti = [0, 1].map((i) => A.cactus(i * 5 + 2));
  ART.rocks = [0, 1, 2].map((i) => A.rock(i * 11 + 1, 110 + i * 20, 170 + i * 30));
  ART.barber = A.barber(ART.baldIcon);
  ART.tonic = A.tonic(ART.heroIcon);
  ART.remyBoard = A.remyBoard(ART.heroIcon2);
  ART.shiny = A.shinyBoard(ART.baldIcon2);
  ART.crossing = A.crossing(ART.baldIcon);
  ART.fork = A.forkSign(ART.baldIcon, ART.heroIcon);
  ART.chevL = A.chevron(-1);
  ART.chevR = A.chevron(1);
  ART.bStart = A.banner('START', { bg: '#e8203a', checker: true });
  ART.bCheck = A.banner('CHECKPOINT', { bg: '#2a5ae8' });
  ART.bGoal = A.banner('GOAL', { bg: '#e8203a', checker: true });
  ART.pillar = A.pillar(220, '#d8d0e4');
  ART.pillarC = A.pillar(220, '#7ab0ff');
  ART.puff = A.puff();
  ART.puffDark = A.puff('#6a5a7a', '#3a2e4a');
  ART.skies = [
    A.skyGrad(LW, HZ + 12, [[0, '#24104e'], [0.3, '#5a1a7a'], [0.55, '#b02a7e'], [0.75, '#f0566a'], [0.9, '#ff9a5a'], [1, '#ffd27a']], 22, 30),
    A.skyGrad(LW, HZ + 12, [[0, '#0c0628'], [0.35, '#2e0f5a'], [0.6, '#7a1a6e'], [0.82, '#e0405e'], [1, '#ff8a4a']], 22, 90),
  ];
  ART.sun = A.sun(58);
  ART.clouds = [A.cloudLayer(1024, 90, 11, ['#ffd0a0', '#ff8a8a', '#b04a8a']), A.cloudLayer(1024, 70, 47, ['#ff9ab0', '#d05a9a', '#6a2a7a'])];
  ART.islands = A.islands(1024, 46);
  ART.mesas = A.mesas(1024, 70);
  ART.crowdIds = [7, 9, 17, 26, 41, 54, 65, 1, 227, 320];
  ART.crowd = {};
  for (const i of [...ART.crowdIds, 744, 0]) ART.crowd[i] = await A.loadRemy(i, true);
  ART.low = A.canvas(LW, LH);
  ART.road = A.canvas(LW, LH);
  ART.roadImg = ART.road.getContext('2d').createImageData(LW, LH);
  ART.buf = new Uint32Array(ART.roadImg.data.buffer);
  ART.scratch = A.canvas(700, 220);
  ART.hud = A.canvas(LW, LH);
}

// ---------- roadside sprite layout (static) ----------
const SPR = [];
const put = (seg, off, art, k, o = {}) => SPR.push({ seg, off, art, k, ...o });
function layout() {
  for (let i = START_SEG + 10; i < CHECK_SEG - 2; i += 4) {
    const side = (i / 4) % 2 ? 1 : -1, j = hash(i * 3.1);
    if (Math.abs(i - FORK_SEG) < 22) continue;
    put(i, side * (1.45 + j * 0.7), `palm${Math.floor(hash(i) * 3)}`, 11 + j * 3, { flip: hash(i + 9) > 0.5 });
    if (hash(i + 17) > 0.55) put(i + 2, -side * (2.4 + j), `palm${Math.floor(hash(i + 1) * 3)}`, 10 + j * 2, { flip: hash(i + 2) > 0.5 });
  }
  put(START_SEG + 26, 2.1, 'barber', 9);
  put(START_SEG + 46, -2.2, 'tonic', 9);
  put(START_SEG + 66, 2.2, 'remyBoard', 9);
  put(FORK_SEG - 16, 1.9, 'fork', 10);
  put(FORK_SEG - 16, -1.9, 'fork', 10);
  put(FORK_SEG + 16, 'median', 'chevR', 6);
  put(FORK_SEG + 10, 'median', 'chevR', 9);
  put(FORK_SEG + 22, 'median', 'chevL', 9);
  // curve chevrons on the outside of each bend
  for (let i = 0; i < NSEG; i += 3) {
    const c = CURVE[i];
    if (Math.abs(c) > 1.8 && !(i > FORK_SEG - 4 && i < FORK_SEG + 30)) put(i, c > 0 ? -1.3 : 1.3, c > 0 ? 'chevR' : 'chevL', 8);
  }
  // stage 2: canyon
  for (let i = CHECK_SEG + 6; i < NSEG - 2; i += 3) {
    const j = hash(i * 1.7), side = (i / 3) % 2 ? 1 : -1;
    if (Math.abs(i - GOAL_SEG) < 10) continue;
    if (j > 0.45) put(i, side * (2.0 + j * 1.6), `rock${Math.floor(hash(i + 5) * 3)}`, 16 + j * 8, { flip: hash(i + 3) > 0.5 });
    else put(i, side * (1.4 + j), `cactus${Math.floor(hash(i + 7) * 2)}`, 7);
  }
  put(CHECK_SEG + 14, 2.1, 'shiny', 9);
  put(CHECK_SEG + 30, -1.6, 'crossing', 6);
  put(CHECK_SEG + 52, 2.0, 'barber', 9);
  put(CHECK_SEG + 86, -2.1, 'shiny', 9);
  put(CHECK_SEG + 120, 1.6, 'crossing', 6);
  put(CHECK_SEG + 150, -2.0, 'tonic', 9);
  // crowds at the start and the goal
  for (const [s0, n] of [[START_SEG - 3, 10], [GOAL_SEG - 6, 14]]) {
    for (let k = 0; k < n; k++) {
      const side = k % 2 ? 1 : -1;
      put(s0 + Math.floor(k / 2) * 2, side * (1.32 + hash(k + s0) * 0.25), 'remy', 4.6, { remy: ART_CROWD_ID(k + s0), cheer: s0 > START_SEG + 20 ? G.goal - 0.6 : -1, seed: k });
    }
  }
  put(START_SEG + 1, 1.22, 'remy', 4.6, { remy: 744, flagger: true, seed: 99 });
}
const ART_CROWD_ID = (k) => [7, 9, 17, 26, 41, 54, 65, 1, 227, 320][k % 10];
layout();
SPR.sort((a, b) => a.seg - b.seg);
const GATES = [
  { seg: START_SEG, art: 'bStart', pil: 'pillar', start: true },
  { seg: CHECK_SEG, art: 'bCheck', pil: 'pillarC' },
  { seg: GOAL_SEG, art: 'bGoal', pil: 'pillar' },
];

// ---------- projection ----------
// Returns per-segment screen records (near boundary 1, far boundary 2) and the camera.
export function project(g) {
  const cz = camZ(g), hz = heroZ(g), camX = heroX(g) * ROADW;
  const camY = roadY(hz) + CAM_H;
  const base = Math.floor(cz / SEG), frac = (cz - base * SEG) / SEG;
  let x = 0, dx = -CURVE[base] * frac, maxy = LH;
  let fx = 0, fdx = 0; // curve displacement since the fork (for the mirrored left branch)
  const recs = [];
  for (let n = 0; n < DRAW && base + n < NSEG; n++) {
    const i = base + n;
    const z1 = Math.max(60, i * SEG - cz), z2 = Math.max(60, (i + 1) * SEG - cz);
    const s1 = DEPTH / z1, s2 = DEPTH / z2;
    const r = {
      i, z1, z2, s1, s2,
      x1: LW / 2 + s1 * (x - camX) * FP, x2: LW / 2 + s2 * (x + dx - camX) * FP,
      y1: HZ - s1 * (Y[i] - camY) * FP, y2: HZ - s2 * (Y[i + 1] - camY) * FP,
      w1: s1 * ROADW * FP, w2: s2 * ROADW * FP,
      clip: maxy,
    };
    if (i >= FORK_SEG && i < FORK_SEG + FORK_LEN) {
      // left branch: mirror the hero road's curve displacement since the fork, minus a growing separation
      const off1 = -2 * fx - forkSep(i), off2 = -2 * (fx + fdx) - forkSep(i + 1);
      r.lx1 = r.x1 + s1 * off1 * FP; r.lx2 = r.x2 + s2 * off2 * FP;
      r.mx1 = r.x1 + s1 * (off1 / 2) * FP; r.mx2 = r.x2 + s2 * (off2 / 2) * FP;
    }
    r.vis = r.y2 < r.y1 && r.y2 < maxy;
    if (r.vis) maxy = Math.min(maxy, r.y2);
    recs.push(r);
    if (i >= FORK_SEG) { fx += fdx; fdx += CURVE[i]; }
    x += dx; dx += CURVE[i];
  }
  return { recs, cz, hz, camX, camY, base };
}

// ---------- road raster ----------
function rasterRoad(P, g) {
  const buf = ART.buf;
  buf.fill(0);
  const far = DRAW * SEG;
  for (const r of P.recs) {
    if (!r.vis) continue;
    const top = Math.max(0, Math.ceil(r.y2)), bot = Math.min(LH, Math.ceil(Math.min(r.y1, r.clip)));
    if (bot <= top) continue;
    const st = r.i >= STAGE2_SEG ? STAGES[1] : STAGES[0];
    const light = Math.floor(r.i / RUMBLE) % 2 === 0;
    const fork = r.lx1 != null;
    const coast = r.i < STAGE2_SEG ? (r.i < FORK_SEG - 34 ? 3.3 + 0.5 * Math.sin(r.i * 0.07) : 3.3 + (r.i - (FORK_SEG - 34)) * 0.6) : 1e9;
    for (let y = top; y < bot; y++) {
      const t = (r.y1 - y) / (r.y1 - r.y2 || 1);
      const iz = 1 / r.z1 + (1 / r.z2 - 1 / r.z1) * t, z = 1 / iz;
      const f = clamp01((z - 3500) / (far - 3500)) ** 0.75 * (FOG_LEVELS - 1);
      const l0 = Math.floor(f), fr = f - l0;
      const cx = r.x1 + (r.x2 - r.x1) * t, w = r.w1 + (r.w2 - r.w1) * t;
      const row = y * LW, by = (y & 3) * 4;
      const lv = (x) => (fr * 16 > A.BAYER[by + (x & 3)] ? Math.min(FOG_LEVELS - 1, l0 + 1) : l0);
      const span = (a, b, col) => {
        a = Math.max(0, Math.round(a)); b = Math.min(LW, Math.round(b));
        for (let x = a; x < b; x++) buf[row + x] = col[lv(x)];
      };
      span(0, LW, light ? st.g0 : st.g1);
      if (coast < 1e8) {
        const cl = cx - w * coast;
        if (cl > 0) {
          span(0, cl, light ? st.w0 : st.w1);
          const fw = Math.max(1, w * 0.12);
          span(cl - fw, cl, (Math.floor(g * 6 + r.i * 0.5) % 2) ? st.foam : st.foam2);
        }
      }
      const road = (c) => {
        span(c - w * 1.14, c - w, light ? st.k0 : st.k1);
        span(c + w, c + w * 1.14, light ? st.k0 : st.k1);
        span(c - w, c + w, light ? st.r0 : st.r1);
        const ew = Math.max(1, w * 0.03);
        span(c - w * 0.93 - ew, c - w * 0.93, st.edge);
        span(c + w * 0.93, c + w * 0.93 + ew, st.edge);
        if (light) { const lw = Math.max(1, w * 0.028); span(c - w / 3 - lw / 2, c - w / 3 + lw / 2, st.lane); span(c + w / 3 - lw / 2, c + w / 3 + lw / 2, st.lane); }
      };
      if (fork) road(r.lx1 + (r.lx2 - r.lx1) * t);
      road(cx);
    }
  }
  const ctx = ART.road.getContext('2d');
  ctx.putImageData(ART.roadImg, 0, 0);
  return ART.road;
}

// ---------- background ----------
function drawBackground(x, g, P) {
  const s2 = clamp01((P.hz / SEG - STAGE2_SEG + 6) / 22);
  x.drawImage(ART.skies[0], 0, 0);
  if (s2 > 0) { x.globalAlpha = s2; x.drawImage(ART.skies[1], 0, 0); x.globalAlpha = 1; }
  const b = bgX(P.hz);
  // sun + glow
  const sx = Math.round(LW / 2 + 70 - b * 0.12), sy = HZ - 44 + Math.round(s2 * 16);
  const gl = x.createRadialGradient(sx, sy, 10, sx, sy, 170);
  gl.addColorStop(0, 'rgba(255,200,120,0.55)'); gl.addColorStop(1, 'rgba(255,90,120,0)');
  x.fillStyle = gl; x.fillRect(0, 0, LW, HZ + 10);
  x.drawImage(ART.sun, sx - ART.sun.width / 2, sy - ART.sun.height / 2);
  const wrap = (img, off, y, alpha = 1) => {
    const w = img.width, o = ((Math.round(off) % w) + w) % w;
    x.globalAlpha = alpha;
    for (let k = -1; k <= Math.ceil(LW / w); k++) x.drawImage(img, k * w - o, y);
    x.globalAlpha = 1;
  };
  wrap(ART.clouds[1], b * 0.25 + g * 6, 8, 0.9);
  wrap(ART.clouds[0], b * 0.4 + g * 10, 34);
  // far layer: islands over the sea strip (stage 1), mesas (stage 2)
  if (s2 < 1) {
    x.globalAlpha = 1 - s2;
    const sea = x.createLinearGradient(0, HZ - 6, 0, HZ + 12);
    sea.addColorStop(0, '#ff8a7a'); sea.addColorStop(0.3, '#7a4ab0'); sea.addColorStop(1, '#3a3aa0');
    x.fillStyle = sea; x.fillRect(0, HZ - 6, LW, 18);
    for (let k = 0; k < 14; k++) { // sun glitter
      const gx = sx - 30 + (hash(k + Math.floor(g * 8) * 31) * 60), gy = HZ - 4 + Math.floor(hash(k * 3) * 14);
      x.fillStyle = '#ffe6a0'; x.fillRect(Math.round(gx), gy, 2 + Math.floor(hash(k + 5) * 6), 1);
    }
    wrap(ART.islands, b * 0.7, HZ - ART.islands.height);
    x.globalAlpha = 1;
  }
  if (s2 > 0) { x.globalAlpha = s2; wrap(ART.mesas, b * 0.7, HZ - ART.mesas.height + 6); x.globalAlpha = 1; }
}

// ---------- sprites ----------
function recAt(P, z) {
  const i = Math.floor(z / SEG) - P.base;
  return i >= 0 && i < P.recs.length ? P.recs[i] : null;
}
// screen position of a world point on the hero road (x in road half-widths, y world height above road)
function toScreen(P, z, xh, yw = 0) {
  const r = recAt(P, z);
  if (!r) return null;
  const dz = z - P.cz;
  if (dz < 80) return null;
  const f = (z - r.i * SEG) / SEG, s = DEPTH / dz;
  const cx = r.x1 + (r.x2 - r.x1) * f, cy = r.y1 + (r.y2 - r.y1) * f;
  return { x: cx + s * xh * ROADW * FP, y: cy - s * yw * FP, s, clip: r.clip, r };
}

function withClip(x, clip, fn) {
  if (clip >= LH) return fn();
  x.save(); x.beginPath(); x.rect(-50, -50, LW + 100, clip + 50); x.clip(); fn(); x.restore();
}

function drawRoadside(x, it, P, g) {
  const r = recAt(P, it.seg * SEG);
  if (!r) return;
  const s = r.s1;
  if (r.z1 < 100) return;
  let sx;
  if (it.off === 'median') { if (r.mx1 == null) return; sx = r.mx1; } else sx = r.x1 + s * it.off * ROADW * FP;
  const sy = r.y1;
  if (it.art === 'remy') return drawCrowd(x, it, sx, sy, s, r.clip, g);
  const img = ART[it.art.replace(/\d$/, (d) => '')] ?? null;
  const art = it.art.startsWith('palm') ? ART.palms[+it.art.slice(4)] : it.art.startsWith('rock') ? ART.rocks[+it.art.slice(4)] : it.art.startsWith('cactus') ? ART.cacti[+it.art.slice(6)] : img;
  if (!art) return;
  const k = it.k * s * FP, w = art.width * k, h = art.height * k;
  if (w < 1 || sx + w / 2 < -20 || sx - w / 2 > LW + 20) return;
  withClip(x, r.clip, () => {
    if (it.flip) { x.save(); x.translate(Math.round(sx), 0); x.scale(-1, 1); x.drawImage(art, Math.round(-w / 2), Math.round(sy - h), Math.round(w), Math.round(h)); x.restore(); }
    else x.drawImage(art, Math.round(sx - w / 2), Math.round(sy - h), Math.round(w), Math.round(h));
  });
}

function drawCrowd(x, it, sx, sy, s, clip, g) {
  const R = ART.crowd[it.remy];
  const k = it.k * s * FP;
  if (k < 0.08) return;
  let hop = 0, o = { sx: k, sy: k, flip: it.seed % 2 === 1 };
  const cheer = it.cheer >= 0 && g > it.cheer;
  if (cheer || (it.cheer < 0 && !it.flagger)) {
    const ph = g * 9 + it.seed * 1.7, b = Math.abs(Math.sin(ph));
    hop = b * (cheer ? 30 : 12) * k;
    o.lift = [Math.round(b * 4), Math.round(b * 4)];
    o.sy = k * (1 + 0.06 * Math.sin(ph * 2));
  }
  withClip(x, clip, () => {
    if (it.flagger) {
      // checkered flag on a pole, waving until the launch, then dropped
      const down = g >= G.launch;
      const px = sx - 20 * k, top = sy - 120 * k;
      x.fillStyle = '#e8e2f0';
      x.save(); x.translate(px, sy - 60 * k); x.rotate(down ? 1.1 : -0.35 + 0.35 * Math.sin(g * 18)); x.fillRect(-1.5 * k, -70 * k, 3 * k, 70 * k);
      for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) { x.fillStyle = (a + b) % 2 ? '#120a1e' : '#ffffff'; x.fillRect(-1.5 * k - (a + 1) * 9 * k, -70 * k + b * 9 * k + Math.sin(g * 20 + a) * 3 * k, 9 * k + 1, 9 * k + 1); }
      x.restore();
      void top;
    }
    A.drawRemy(x, R, sx, sy - hop, o);
  });
}

// Traffic car with a yaw "box" billboard + roll; shadow on the road.
function drawCar(x, c, st, P, g) {
  const p = toScreen(P, st.z, st.x, st.y);
  if (!p) return;
  const F = ART.cars[c.id], k = PXW * p.s * FP;
  const ground = toScreen(P, st.z, st.x, 0);
  // shadow
  if (ground) {
    const shw = (F.w * 0.55 + (F.l ?? 0) * 0.1 * Math.abs(Math.sin(st.yaw))) * k * (1 - Math.min(0.5, st.y / 3000));
    withClip(x, p.clip, () => {
      x.fillStyle = 'rgba(30,10,40,0.45)';
      x.beginPath(); x.ellipse(Math.round(ground.x), Math.round(ground.y - 2 * k), Math.max(1, shw), Math.max(1, 7 * k), 0, 0, 7); x.fill();
    });
  }
  const cs = Math.cos(st.yaw), sn = Math.sin(st.yaw);
  const hasSide = !!F.side;
  const aw = Math.abs(cs) * F.w, sw = hasSide ? Math.abs(sn) * F.l : 0;
  const tw = Math.max(2, Math.round(aw + sw));
  const S = ART.scratch, sc = S.getContext('2d');
  sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, S.width, S.height); sc.imageSmoothingEnabled = false;
  const face = cs >= 0 || !hasSide ? F.rear : F.front;
  const sideFirst = hasSide && (sn > 0) !== (cs >= 0);
  let ox = 0;
  const putFace = () => { if (aw >= 1) sc.drawImage(face, 0, 0, face.width, F.h, Math.round(ox), 0, Math.max(1, Math.round(aw)), F.h); ox += aw; };
  const putSide = () => {
    if (sw < 1) return;
    sc.save();
    if (sn < 0) { sc.translate(Math.round(ox + sw), 0); sc.scale(-1, 1); sc.drawImage(F.side, 0, 0, F.side.width, F.h, 0, 0, Math.round(sw), F.h); }
    else sc.drawImage(F.side, 0, 0, F.side.width, F.h, Math.round(ox), 0, Math.round(sw), F.h);
    sc.restore();
    // darken the side a touch
    sc.globalCompositeOperation = 'source-atop'; sc.fillStyle = 'rgba(40,10,60,0.22)'; sc.fillRect(Math.round(ox), 0, Math.round(sw), F.h); sc.globalCompositeOperation = 'source-over';
    ox += sw;
  };
  if (sideFirst) { putSide(); putFace(); } else { putFace(); putSide(); }
  const flash = st.hitAge >= 0 && st.hitAge < 0.06;
  if (flash) { sc.globalCompositeOperation = 'source-atop'; sc.fillStyle = '#ffffff'; sc.fillRect(0, 0, tw, F.h); sc.globalCompositeOperation = 'source-over'; }
  const dw = tw * k, dh = F.h * k;
  if (dw < 1) return;
  withClip(x, p.clip, () => {
    x.save();
    x.translate(Math.round(p.x), Math.round(p.y - dh / 2));
    if (st.roll) x.rotate(st.roll);
    // bounce wobble while cruising
    const bob = st.hitAge < 0 ? Math.round(Math.abs(Math.sin(g * 14 + c.v)) * 1.2 * k) : 0;
    x.drawImage(S, 0, 0, tw, F.h, Math.round(-dw / 2), Math.round(-dh / 2 - bob), Math.round(dw), Math.round(dh));
    x.restore();
  });
  // a glint on the bald dome seen through the rear window
  if (st.hitAge < 0 && cs > 0.9 && c.kind !== 'truck' && Math.sin(g * 3 + c.v) > 0.85) {
    const gx = p.x - 4 * k, gy = p.y - dh * (c.kind === 'limo' ? 0.7 : 0.62);
    star(x, gx, gy, Math.max(1, Math.round(5 * k * (Math.sin(g * 3 + c.v) - 0.85) / 0.15)), '#ffffff');
  }
}

function star(x, cx, cy, r, col) {
  x.fillStyle = col;
  x.fillRect(Math.round(cx - r), Math.round(cy), r * 2 + 1, 1);
  x.fillRect(Math.round(cx), Math.round(cy - r), 1, r * 2 + 1);
  if (r > 2) x.fillRect(Math.round(cx - 1), Math.round(cy - 1), 3, 3);
}

function drawGate(x, gt, P, g) {
  const r = recAt(P, gt.seg * SEG);
  if (!r || r.z1 < 120) return;
  const s = r.s1, cx = r.x1, cy = r.y1;
  const half = ROADW * 1.22 * s * FP, ph = 1500 * s * FP, pw = Math.max(1, 70 * s * FP), bh = 260 * s * FP;
  if (cx + half < -40 || cx - half > LW + 40) return;
  const pil = ART[gt.pil];
  withClip(x, r.clip, () => {
    x.drawImage(pil, Math.round(cx - half - pw / 2), Math.round(cy - ph), Math.round(pw), Math.round(ph));
    x.drawImage(pil, Math.round(cx + half - pw / 2), Math.round(cy - ph), Math.round(pw), Math.round(ph));
    x.drawImage(ART[gt.art], Math.round(cx - half - pw / 2), Math.round(cy - ph), Math.round(half * 2 + pw), Math.round(bh));
    if (gt.start) {
      const lw = 180 * s * FP, lh = 60 * s * FP, lx = cx - lw / 2, ly = cy - ph + bh;
      x.fillStyle = '#120a1e'; x.fillRect(Math.round(lx), Math.round(ly), Math.round(lw), Math.round(lh));
      const go = g >= G.launch;
      for (let k = 0; k < 3; k++) {
        const on = go ? k === 2 : k < 2;
        x.fillStyle = on ? (go ? '#5aff6a' : '#ff2a3a') : '#3a2a3a';
        x.beginPath(); x.arc(lx + lw * (0.2 + k * 0.3), ly + lh / 2, lh * 0.32, 0, 7); x.fill();
      }
    }
  });
}

// ---------- world particles (smoke from spinning cars) ----------
const PUFFS = [];
for (const c of CARS) {
  if (!c.hit) continue;
  const dur = c.hit === 'boss' ? 1.2 : 0.9;
  for (let t = 0; t < dur; t += 0.04) {
    const st = carAt(c, c.g + t);
    PUFFS.push({ g: c.g + t, z: st.z, x: st.x + (hash(PUFFS.length) - 0.5) * 0.2, y: st.y * 0.6, dark: c.hit === 'boss' && t > 0.6, seed: PUFFS.length });
  }
}
{ // boss crash dust
  const c = CARS.find((cc) => cc.hit === 'boss'), st = carAt(c, BOSS_LAND);
  for (let k = 0; k < 14; k++) PUFFS.push({ g: BOSS_LAND + k * 0.01, z: st.z + (hash(k) - 0.5) * 600, x: st.x + (hash(k + 4) - 0.5) * 0.6, y: 0, dark: k % 2 === 0, big: true, seed: k + 500 });
}

function drawPuff(x, p, P, g) {
  const age = g - p.g, life = p.big ? 1.1 : 0.6;
  if (age < 0 || age > life) return;
  const sp = toScreen(P, p.z, p.x, p.y + age * 420);
  if (!sp) return;
  const size = (p.big ? 520 : 220) * (0.5 + age * 2.2) * sp.s * FP;
  if (size < 1) return;
  withClip(x, sp.clip, () => {
    x.globalAlpha = 0.85 * (1 - age / life);
    x.drawImage(p.dark ? ART.puffDark : ART.puff, Math.round(sp.x - size / 2), Math.round(sp.y - size / 2), Math.round(size), Math.round(size));
    x.globalAlpha = 1;
  });
}

// ---------- hero car (from behind) ----------
export const HERO = { skin: '#d8c4b6', hair: '#a8443e', hairHi: '#e0786a', hairLo: '#6a2226', shirt: '#2a2a3a' };
export const PAX = { skin: '#c8b2a0', hair: '#7ec0b6', hairHi: '#c8fff4', hairLo: '#3a7a74', shirt: '#2e7a3a' };
function R(x, c, a, b, w, h) { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); }

function drawHead(x, P, cx, cy, g, wind, nitro, seed) {
  // ears, nape
  R(x, P.skin, cx - 15, cy - 1, 4, 7); R(x, P.skin, cx + 11, cy - 1, 4, 7);
  R(x, A.shade(P.skin, -0.25), cx - 14, cy + 3, 2, 3); R(x, A.shade(P.skin, -0.25), cx + 12, cy + 3, 2, 3);
  R(x, P.skin, cx - 6, cy + 8, 12, 6);
  // hair mass
  x.fillStyle = P.hairLo; x.beginPath(); x.ellipse(cx, cy - 2, 14, 13, 0, 0, 7); x.fill();
  x.fillStyle = P.hair; x.beginPath(); x.ellipse(cx - 1, cy - 4, 12.5, 11, 0, 0, 7); x.fill();
  x.fillStyle = P.hairHi; x.beginPath(); x.ellipse(cx - 5, cy - 9, 5, 3, -0.4, 0, 7); x.fill();
  // wind-blown tufts flicking up and out
  const n = 9;
  for (let k = 0; k < n; k++) {
    const a0 = -Math.PI * (0.08 + (0.84 * k) / (n - 1));
    const wob = Math.sin(g * (24 + k * 3) + k * 1.9 + seed) * 0.28 + Math.sin(g * 41 + k) * 0.1;
    const a = a0 + wob * wind - 0.15 * wind * Math.cos(a0);
    const len = (7 + 6 * hash(k + seed * 13) + 3 * Math.sin(g * 30 + k * 2)) * (0.6 + 0.6 * wind) * (nitro ? 1.5 : 1);
    const bx = cx + Math.cos(a0) * 11, by = cy - 3 + Math.sin(a0) * 10;
    const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len - wind * 3;
    const px = -Math.sin(a) * 3.2, py = Math.cos(a) * 3.2;
    x.fillStyle = k % 3 === 0 ? P.hairHi : k % 2 ? P.hair : P.hairLo;
    if (nitro && k % 2 === 0) x.fillStyle = Math.sin(g * 50 + k) > 0 ? '#ffd34a' : '#ff7a2a';
    x.beginPath(); x.moveTo(bx + px, by + py); x.lineTo(tx, ty); x.lineTo(bx - px, by - py); x.fill();
  }
}

function drawFist(x, cx, cy, P, up) {
  // raised arm with a fist, pumping
  const top = cy - 20 - up * 14;
  R(x, P.shirt, cx - 3, top + 8, 7, cy - top);
  R(x, P.skin, cx - 4, top, 9, 9); R(x, A.shade(P.skin, -0.3), cx - 4, top + 7, 9, 2); R(x, '#ffffff', cx - 2, top + 1, 2, 2);
}

export function drawHeroCar(x, g, sx, by, steer, nitro, cheer) {
  const tilt = steer * 3;
  // shadow
  x.fillStyle = 'rgba(30,8,30,0.5)'; x.beginPath(); x.ellipse(sx, by - 2, 92, 9, 0, 0, 7); x.fill();
  // tires with moving tread
  const ph = Math.floor((camZ(g) / 40) % 4);
  for (const tx of [-76, 50]) {
    R(x, '#120a16', sx + tx, by - 26, 26, 26);
    for (let k = 0; k < 7; k++) R(x, '#3a3040', sx + tx + 2, by - 24 + ((k * 4 + ph) % 24), 22, 1);
    R(x, '#4a4054', sx + tx + 2, by - 26, 22, 2);
  }
  const ox = Math.round(-steer * 4); // side panel reveal
  // side panel visible when steering
  if (Math.abs(steer) > 0.15) {
    const sw = Math.round(Math.abs(steer) * 9), side = steer > 0 ? -1 : 1;
    const ex = side < 0 ? sx - 80 - sw + ox : sx + 80 + ox;
    R(x, '#8a0c1a', ex, by - 66, sw, 40); R(x, '#5a0612', ex, by - 30, sw, 6);
  }
  const bx = sx + ox;
  // lower diffuser
  R(x, '#1a1424', bx - 78, by - 32, 156, 14); R(x, '#2a2436', bx - 78, by - 32, 156, 2);
  // exhausts
  for (const ex of [-16, 9]) {
    R(x, '#120a16', bx + ex, by - 26, 8, 7); R(x, '#d8dcec', bx + ex + 1, by - 25, 6, 5); R(x, '#2a2436', bx + ex + 2, by - 24, 4, 3);
  }
  // grille with taillights glowing between slats
  R(x, '#120a16', bx - 80, by - 52, 160, 22);
  for (let k = 0; k < 5; k++) {
    const yy = by - 50 + k * 4;
    R(x, '#ff2a3a', bx - 76, yy, 40, 2); R(x, '#ff2a3a', bx + 36, yy, 40, 2);
    R(x, '#3a3448', bx - 36, yy, 72, 2);
  }
  R(x, '#ffb0a0', bx - 74, by - 50, 10, 1); R(x, '#ffb0a0', bx + 64, by - 50, 10, 1);
  // plate
  R(x, '#120a16', bx - 19, by - 47, 38, 13); R(x, '#f4ecfa', bx - 18, by - 46, 36, 11);
  x.save(); x.font = `8px ${A.FONT}`; x.fillStyle = '#2a1a5e'; x.textBaseline = 'top'; x.textAlign = 'center'; x.fillText('REMY', bx, by - 45); x.restore();
  // body: bumper band, rear deck, fender shoulders
  R(x, '#120a16', bx - 82, by - 62, 164, 10);
  R(x, '#d8202a', bx - 81, by - 61, 162, 9); R(x, '#ff6a5a', bx - 81, by - 61, 162, 2); R(x, '#8a0c1a', bx - 81, by - 54, 162, 2);
  // deck + shoulders
  x.fillStyle = '#120a16';
  x.beginPath(); x.moveTo(bx - 82, by - 61); x.lineTo(bx - 80, by - 74); x.quadraticCurveTo(bx - 70, by - 84, bx - 56, by - 76); x.lineTo(bx + 56, by - 76); x.quadraticCurveTo(bx + 70, by - 84, bx + 80, by - 74); x.lineTo(bx + 82, by - 61); x.fill();
  x.fillStyle = '#e8262e';
  x.beginPath(); x.moveTo(bx - 80, by - 61); x.lineTo(bx - 78, by - 73); x.quadraticCurveTo(bx - 70, by - 82, bx - 57, by - 75); x.lineTo(bx + 57, by - 75); x.quadraticCurveTo(bx + 70, by - 82, bx + 78, by - 73); x.lineTo(bx + 80, by - 61); x.fill();
  R(x, '#ff8a78', bx - 72, by - 79, 10, 2); R(x, '#ff8a78', bx + 62, by - 79, 10, 2);
  R(x, '#b0141e', bx - 50, by - 70, 100, 1);
  for (let k = 0; k < 4; k++) R(x, '#8a0c1a', bx - 30 + k * 16, by - 68, 10, 5);
  // windscreen frame (far end of the cabin)
  const cx = bx + Math.round(tilt);
  x.strokeStyle = '#2a2436'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(cx - 62, by - 76); x.lineTo(cx - 52, by - 118); x.lineTo(cx + 52, by - 118); x.lineTo(cx + 62, by - 76); x.stroke();
  x.fillStyle = 'rgba(200,230,255,0.12)'; x.beginPath(); x.moveTo(cx - 60, by - 77); x.lineTo(cx - 51, by - 117); x.lineTo(cx + 51, by - 117); x.lineTo(cx + 60, by - 77); x.fill();
  // mirrors
  R(x, '#120a16', cx - 76, by - 92, 12, 9); R(x, '#d8202a', cx - 75, by - 91, 10, 7); R(x, '#120a16', cx + 64, by - 92, 12, 9); R(x, '#d8202a', cx + 65, by - 91, 10, 7);
  // occupants: shoulders, heads, then seat backs in front
  const wind = clamp01(speedAt(g) / 8000);
  const bobH = Math.round(Math.sin(g * 17) * 0.8 * wind);
  const hx = cx - 33, px = cx + 31, hy = by - 98 + bobH, py = by - 96 - bobH;
  R(x, HERO.shirt, hx - 16, hy + 12, 32, 12); R(x, PAX.shirt, px - 15, py + 12, 30, 12);
  if (cheer > 0) { drawFist(x, hx - 18, hy + 12, HERO, Math.abs(Math.sin(cheer * 14))); }
  if (cheer > 0.5) drawFist(x, px + 18, py + 12, PAX, Math.abs(Math.sin(cheer * 14 + 1)));
  drawHead(x, PAX, px, py, g, wind, false, 3);
  drawHead(x, HERO, hx, hy, g, wind, nitro, 0);
  for (const [sx2, w2] of [[hx, 30], [px, 28]]) {
    R(x, '#120a16', sx2 - w2 / 2 - 1, by - 82, w2 + 2, 9);
    R(x, '#e8d0a8', sx2 - w2 / 2, by - 81, w2, 7); R(x, '#fff0d0', sx2 - w2 / 2, by - 81, w2, 1); R(x, '#b89a78', sx2 - w2 / 2, by - 76, w2, 2);
  }
  // roll hoops
  R(x, '#120a16', cx - 52, by - 76, 104, 2);
  // nitro flames
  if (nitro) {
    for (const ex of [-12, 13]) {
      const L = 10 + 8 * Math.abs(Math.sin(g * 60 + ex));
      x.fillStyle = '#ff7a2a'; x.beginPath(); x.moveTo(bx + ex - 5, by - 22); x.lineTo(bx + ex, by - 22 + L); x.lineTo(bx + ex + 5, by - 22); x.fill();
      x.fillStyle = '#7ad8ff'; x.beginPath(); x.moveTo(bx + ex - 3, by - 22); x.lineTo(bx + ex, by - 22 + L * 0.6); x.lineTo(bx + ex + 3, by - 22); x.fill();
    }
  }
}

// ---------- screen-space FX ----------
function drawTireSmoke(x, g, sx, by) {
  if (g < G.launch - 0.1 || g > G.launch + 0.9) return;
  for (let i = 0; i < 26; i++) {
    const t0 = G.launch - 0.1 + i * 0.03, age = g - t0;
    if (age < 0 || age > 0.55) continue;
    const side = i % 2 ? 1 : -1, u = age / 0.55;
    const px = sx + side * (64 + 70 * u + hash(i) * 20), py = by - 8 - 30 * u * hash(i + 3);
    const r = 6 + 22 * u;
    x.globalAlpha = 0.8 * (1 - u);
    x.drawImage(ART.puff, Math.round(px - r), Math.round(py - r), Math.round(r * 2), Math.round(r * 2));
  }
  x.globalAlpha = 1;
}

function speedLines(x, g, k) {
  if (k <= 0) return;
  const fr = Math.floor(g * 60);
  x.save();
  for (let i = 0; i < 40; i++) {
    const a = hash(i * 7 + fr * 131) * Math.PI * 2, r0 = 120 + hash(i + fr * 17) * 120, len = 40 + hash(i * 3 + fr) * 140;
    const cx = LW / 2, cy = HZ + 20;
    x.globalAlpha = k * (0.35 + 0.4 * hash(i + fr * 3));
    x.strokeStyle = i % 3 ? '#ffffff' : '#8ae8ff'; x.lineWidth = 1 + (i % 4 === 0 ? 1 : 0);
    x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.7); x.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len) * 0.7); x.stroke();
  }
  x.restore();
}

function sparks(x, cx, cy, age, big = false) {
  if (age < 0 || age > 0.45) return;
  const u = age / 0.45, n = big ? 22 : 12;
  if (age < 0.06) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx, cy, (big ? 28 : 16) * (1 - age / 0.06) + 4, 0, 7); x.fill(); }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(i) * 0.5, sp = (big ? 260 : 150) * (0.6 + 0.6 * hash(i + 9));
    const px = cx + Math.cos(a) * sp * age, py = cy + Math.sin(a) * sp * age * 0.7 + 300 * age * age;
    x.globalAlpha = 1 - u;
    x.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#ffe27a' : '#ff8a2a';
    x.fillRect(Math.round(px), Math.round(py), 2, 2);
    x.fillRect(Math.round(px - Math.cos(a) * 4), Math.round(py - Math.sin(a) * 3), 1, 1);
  }
  x.globalAlpha = 1;
  // impact ring
  if (age < 0.25) { x.strokeStyle = '#ffffff'; x.globalAlpha = 1 - age / 0.25; x.lineWidth = 2; x.beginPath(); x.ellipse(cx, cy, 10 + 70 * age / 0.25 * (big ? 1.6 : 1), 4 + 24 * age / 0.25, 0, 0, 7); x.stroke(); x.globalAlpha = 1; }
}

function boom(x, cx, cy, age, R0 = 40) {
  if (age < 0 || age > 0.5) return;
  const u = age / 0.5, Rr = R0 * Math.sqrt(u) + 6;
  const cols = ['#ffffff', '#fff1a0', '#ffb43a', '#ff5a2a', '#7a2a4a'];
  x.fillStyle = cols[Math.min(4, Math.floor(u * 5))];
  x.beginPath(); x.arc(cx, cy, Rr, 0, 7); x.fill();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283 + hash(i) * 0.4, d = Rr * 1.5; x.fillStyle = '#ffd34a'; x.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), 3, 3); }
}

function confetti(x, g) {
  const a0 = G.goal;
  if (g < a0) return;
  const cols = ['#ff3a7a', '#ffd34a', '#5ad8ff', '#7aff7a', '#ffffff', '#c08cff'];
  for (let i = 0; i < 120; i++) {
    const t0 = a0 + hash(i) * 0.5, age = g - t0;
    if (age < 0) continue;
    const side = i % 2 ? 1 : -1;
    const vx = side * (-120 - 200 * hash(i + 3)), vy = -260 - 180 * hash(i + 4);
    const px = LW / 2 + side * 330 + vx * age + Math.sin(age * 6 + i) * 10, py = 300 + vy * age + 260 * age * age;
    if (py > LH + 10) continue;
    x.fillStyle = cols[i % cols.length];
    const flip = Math.abs(Math.sin(age * 10 + i)) * 4 + 1;
    x.fillRect(Math.round(px), Math.round(py), 3, Math.round(flip));
  }
}

// ---------- HUD ----------
const COURSE = [[0], [0, 1], [0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3, 4]];
function drawHud(x, g, stop, sl) {
  // TIME
  text(x, 'TIME', 18, 12, { size: 8, color: '#ffd34a' });
  const tm = hudTime(g), bonus = g >= G.check && g < G.check + 1.4;
  const tcol = bonus ? (Math.floor(g * 12) % 2 ? '#ffffff' : '#7aff7a') : '#ff9a3a';
  text(x, String(tm).padStart(2, ' '), 18, 24, { size: 24, color: tcol, outline: '#3a0a0a', shadow: null });
  if (bonus) text(x, `+${TIME_BONUS}`, 78, 30, { size: 8, color: '#7aff7a', alpha: clamp01((G.check + 1.4 - g) / 0.3) });
  // SCORE
  text(x, 'SCORE', LW / 2, 12, { size: 8, color: '#ff8ab8', align: 'center' });
  text(x, String(hudScore(g)).padStart(8, ' '), LW / 2, 24, { size: 16, color: '#ffffff', align: 'center', outline: '#2a0a3a', shadow: null });
  // LAP
  const lt = lapTime(g), mm = Math.floor(lt / 60), ss = Math.floor(lt % 60), cc = Math.floor((lt * 100) % 100);
  text(x, 'LAP', LW - 18, 12, { size: 8, color: '#7aff7a', align: 'right' });
  const lapFlash = g >= G.goal && Math.floor(g * 8) % 2 === 0;
  text(x, `${mm}'${String(ss).padStart(2, '0')}"${String(cc).padStart(2, '0')}`, LW - 18, 24, { size: 16, color: lapFlash ? '#ffd34a' : '#7aff7a', align: 'right', outline: '#0a2a0a', shadow: null });
  // stage tag
  const stage = g >= G.check ? 'STAGE 2  CABALD CANYON' : 'STAGE 1  HAIRLINE BEACH';
  text(x, stage, LW / 2, 44, { size: 8, color: '#ffe6c0', align: 'center', alpha: 0.9 });
  // speedometer + tach
  const sp = kmh(g), nitro = g >= G.nitro && g < G.boss + 0.4;
  const sx = 18, sy = LH - 46;
  text(x, String(sp).padStart(3, ' '), sx, sy, { size: 24, color: nitro ? (Math.floor(g * 16) % 2 ? '#ffffff' : '#5ad8ff') : '#ffffff', outline: '#120a1e', shadow: null });
  text(x, 'km/h', sx + 76, sy + 12, { size: 8, color: '#ffd34a' });
  const rpm = clamp01(engineRpm(g) + (nitro ? 0.03 * Math.sin(g * 60) : 0));
  const segs = 22;
  for (let i = 0; i < segs; i++) {
    const on = i / segs < rpm, col = i < 12 ? '#5aff6a' : i < 18 ? '#ffd34a' : '#ff3a3a';
    const h = 3 + Math.round(i * 0.45);
    R(x, '#120a1e', sx + i * 6 - 1, sy - 6 - h, 6, h + 2);
    R(x, on ? col : '#3a2e4a', sx + i * 6, sy - 5 - h, 4, h);
  }
  text(x, sp > 150 ? 'HI' : 'LO', sx + 140, sy - 16, { size: 8, color: sp > 150 ? '#ff8a3a' : '#7ad8ff' });
  // course map (bottom right): the branching pyramid
  const mx = LW - 108, my = LH - 64;
  x.globalAlpha = 0.85;
  R(x, '#120a1e', mx - 4, my - 4, 98, 58);
  R(x, '#2a1a4a', mx - 3, my - 3, 96, 56);
  x.globalAlpha = 1;
  const node = (c, r) => [mx + 8 + c * 18, my + 24 + (r - c / 2) * 12];
  for (let c = 0; c < 5; c++) for (const rr of COURSE[c]) {
    const [nx, ny] = node(c, rr);
    if (c < 4) { const [ax, ay] = node(c + 1, rr), [bx2, by2] = node(c + 1, rr + 1); x.strokeStyle = '#5a4a7a'; x.lineWidth = 1; x.beginPath(); x.moveTo(nx, ny); x.lineTo(ax, ay); x.moveTo(nx, ny); x.lineTo(bx2, by2); x.stroke(); }
    R(x, '#5a4a7a', nx - 2, ny - 2, 5, 5);
  }
  // progress along stage 1 → (right branch) stage 2
  const prog = clamp01((g - 0) / G.fork), prog2 = clamp01((g - G.fork) / (G.goal - G.fork));
  const [ax, ay] = node(0, 0), [bx2, by2] = node(1, 1), [cx2, cy2] = node(2, 2);
  x.strokeStyle = '#ffd34a'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax + (bx2 - ax) * prog, ay + (by2 - ay) * prog);
  if (prog2 > 0) x.lineTo(bx2 + (cx2 - bx2) * prog2, by2 + (cy2 - by2) * prog2);
  x.stroke();
  const hx = prog2 > 0 ? bx2 + (cx2 - bx2) * prog2 : ax + (bx2 - ax) * prog, hy = prog2 > 0 ? by2 + (cy2 - by2) * prog2 : ay + (by2 - ay) * prog;
  x.drawImage(ART.heroIcon, Math.round(hx - 8), Math.round(hy - 15 + Math.sin(g * 10) * 1));
  text(x, 'COURSE', mx + 2, my - 1, { size: 8, color: '#c8b8ff', shadow: null });
  // boss bar
  const bossIn = clamp01((g - 6.75) / 0.25);
  if (bossIn > 0 && g < G.goal) {
    const drain = g < G.boss ? 1 : stop?.kind === 'boss' ? 1 - clamp01(sl / stop.d) : 0;
    const bw = 180, bxx = LW / 2 - bw / 2, byy = 58;
    x.globalAlpha = bossIn;
    x.drawImage(ART.bossIcon, bxx - 20, byy - 3);
    text(x, 'CABALD ONE', bxx, byy - 2, { size: 8, color: '#ff8ab8' });
    R(x, '#120a1e', bxx, byy + 8, bw, 8);
    R(x, '#3a1a2a', bxx + 1, byy + 9, bw - 2, 6);
    R(x, Math.floor(g * 10) % 2 && g > 7.2 ? '#ff8a3a' : '#ff2a5a', bxx + 1, byy + 9, (bw - 2) * drain, 6);
    x.globalAlpha = 1;
  }
}

// ---------- big texts ----------
function slam(x, s, cy, age, { size = 32, color = '#ffffff', outline = '#120a1e', life = 1.0, sub = null, subCol = '#ffd34a', blink = false } = {}) {
  if (age < 0 || age > life) return;
  const inT = clamp01(age / 0.12), outT = clamp01((life - age) / 0.15);
  const sc = Math.min(1 + 1.6 * (1 - inT) ** 2, (LW - 40) / (s.length * size + 4));
  x.save();
  x.translate(LW / 2, cy);
  x.scale(sc, sc);
  x.globalAlpha = inT * outT;
  text(x, s, 0, -size / 2, { size, color, outline, shadow: '#120a1e', align: 'center' });
  x.restore();
  if (sub && age > 0.18 && (!blink || Math.floor(age * 8) % 2 === 0)) text(x, sub, LW / 2, cy + size / 2 + 8, { size: 16, color: subCol, outline: '#120a1e', shadow: null, align: 'center', alpha: outT });
}

function popup(x, s, px, py, age, col = '#ffffff') {
  if (age < 0 || age > 0.8) return;
  text(x, s, px, py - 30 * Math.sqrt(age / 0.8), { size: 8, color: col, outline: '#120a1e', shadow: null, align: 'center', alpha: clamp01((0.8 - age) / 0.15) });
}

// ---------- the frame ----------
// shot-time age of a game event (keeps animating through hit-stops)
const ft = (lt, ge) => lt - (filmT(ge) - T_RACE);
export function drawRace(lt) {
  const { g, stop, sl } = warp(lt);
  const x = ART.low.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = '#24104e';
  x.fillRect(0, 0, LW, LH);
  const ui = ART.hud.getContext('2d');
  ui.setTransform(1, 0, 0, 1, 0, 0);
  ui.globalAlpha = 1;
  ui.globalCompositeOperation = 'source-over';
  ui.clearRect(0, 0, LW, LH);
  // shake (real time, keeps running through freezes)
  let shx = 0, shy = 0;
  for (const [ge, amp] of SHAKES) {
    const d = lt - (filmT(ge) - T_RACE);
    if (d < 0 || d > 0.4) continue;
    const k = amp * Math.exp(-d * 12);
    shx += k * Math.sin(d * 95 + ge * 10); shy += k * Math.cos(d * 77 + ge * 7);
  }
  // road rumble at speed
  const v = speedAt(g);
  shy += Math.sin(lt * 70) * 0.6 * clamp01(v / 9000);
  // nitro / boss zoom punch
  let zoom = 1;
  if (stop?.kind === 'nitro') zoom = 1 + 0.06 * Math.sin((sl / stop.d) * Math.PI);
  if (stop?.kind === 'boss') zoom = 1 + 0.08 * Math.min(1, sl / 0.05);
  const P = project(g);
  x.save();
  x.translate(LW / 2 + Math.round(shx), LH / 2 + Math.round(shy));
  x.scale(zoom, zoom);
  x.translate(-LW / 2, -LH / 2);
  drawBackground(x, g, P);
  x.drawImage(rasterRoad(P, g), 0, 0);
  // gather sprites far → near
  const items = [];
  for (const it of SPR) { if (it.seg >= P.base && it.seg < P.base + P.recs.length) items.push({ z: it.seg * SEG, f: () => drawRoadside(x, it, P, g) }); }
  for (const gt of GATES) if (gt.seg >= P.base && gt.seg < P.base + P.recs.length) items.push({ z: gt.seg * SEG - 1, f: () => drawGate(x, gt, P, g) });
  for (const c of CARS) {
    const st = carAt(c, g);
    if (st.z - P.cz < 80 || st.z - P.cz > DRAW * SEG * 0.8) continue;
    items.push({ z: st.z, f: () => drawCar(x, c, st, P, g) });
  }
  for (const p of PUFFS) if (g >= p.g && g < p.g + 1.2) items.push({ z: p.z + 1, f: () => drawPuff(x, p, P, g) });
  const steer = Math.max(-1, Math.min(1, heroVX(g) * 0.45 + curveAt(P.hz) * 0.12));
  const nitro = g >= G.nitro && g < G.boss + 0.5;
  const cheerT = [[G.bump + 0.05, 0.6], [G.smashF + 0.05, 0.5], [G.boss + 0.1, 0.7], [G.goal, 3]].find(([t0, d]) => g >= t0 && g < t0 + d);
  const cheer = cheerT ? g - cheerT[0] + 0.01 : 0;
  const hopY = (() => { // crest float, landing bounce
    const a = g - G.crest;
    return a > 0 && a < 0.35 ? Math.sin((a / 0.35) * Math.PI) * 6 : 0;
  })();
  const by = LH - 8 - Math.round(hopY) + Math.round(Math.abs(Math.sin(lt * 31)) * clamp01(v / 6000) * 1);
  items.push({ z: P.hz, hero: true, f: () => { drawTireSmoke(x, g, LW / 2, by); drawHeroCar(x, g, LW / 2, by, steer, nitro, cheer); } });
  items.sort((a, b) => b.z - a.z);
  for (const it of items) it.f();
  // hit FX on the struck cars
  for (const c of CARS) {
    if (!c.hit) continue;
    const age = g - c.g, ra = ft(lt, c.g);
    if (age < 0 || age > 1.2) continue;
    const st = carAt(c, g), p = toScreen(P, st.z, st.x, st.y + 150);
    if (!p) continue;
    const big = c.hit !== 'spin';
    sparks(x, p.x, p.y + 30 * p.s * FP, ra, big);
    if (c.hit === 'boss') boom(x, p.x, p.y, ra - 0.02, 50);
    const lbl = c.hit === 'spin' ? ['BONK!', '+1000'] : c.id === 'E' ? ['SMASH!', '+2000'] : ['SMASH x2!', '+4000'];
    if (c.hit !== 'boss') { popup(x, lbl[0], p.x, p.y - 34, ra, '#ffd34a'); popup(x, lbl[1], p.x, p.y - 20, ra - 0.08, '#ffffff'); }
  }
  // boss crash explosion on landing
  {
    const c = CARS.find((cc) => cc.hit === 'boss'), age = g - BOSS_LAND;
    if (age > -0.02 && age < 0.6) { const st = carAt(c, BOSS_LAND), p = toScreen(P, st.z, st.x, 200); if (p) boom(x, p.x, p.y, age, 120 * p.s * FP * 10); }
  }
  // near-miss
  {
    const c = CARS.find((cc) => cc.id === 'D'), age = g - G.miss;
    if (age > 0 && age < 0.8) popup(x, 'CLOSE! +500', LW / 2 + 110, 210, age, '#5ad8ff');
  }
  x.restore();
  // speed lines (nitro)
  speedLines(x, g, nitro ? clamp01((g - G.nitro) / 0.15) * (g > G.boss ? clamp01((G.boss + 0.5 - g) / 0.3) : 1) : 0);
  if (stop?.kind === 'nitro') {
    x.save(); x.globalAlpha = 0.35 * Math.sin((sl / stop.d) * Math.PI); x.fillStyle = '#5ad8ff'; x.fillRect(0, 0, LW, LH); x.restore();
  }
  confetti(x, g);
  // big texts
  slam(ui, 'GO!', 130, ft(lt, G.launch), { size: 48, color: '#7aff7a', life: 0.75 });
  slam(ui, 'CHECKPOINT!', 112, ft(lt, G.check), { size: 32, color: '#ffd34a', life: 1.5, sub: 'EXTENDED PLAY', subCol: '#7aff7a' });
  slam(ui, 'NITRO!!', 112, ft(lt, G.nitro), { size: 40, color: '#5ad8ff', life: 0.65, sub: 'HAIR TURBO ENGAGED', subCol: '#ffffff' });
  slam(ui, 'K.O.!', 100, ft(lt, G.boss), { size: 32, color: '#ff3a5a', life: 0.65, sub: 'CABALD ONE DOWN!', subCol: '#ffd34a' });
  slam(ui, 'GOAL!!', 120, ft(lt, G.goal), { size: 48, color: '#ffd34a', life: 2.5, sub: 'YOU OUTRAN THE CABALD!', subCol: '#ffffff' });
  drawHud(ui, g, stop, sl);
  // end wipe: Sega-style venetian blinds into the ending
  const wip = clamp01((g - (G.end - 0.3)) / 0.3);
  if (wip > 0) {
    x.fillStyle = '#000';
    for (let yy = 0; yy < LH; yy += 24) {
      x.fillRect(0, yy, LW, Math.ceil(24 * wip));
      ui.clearRect(0, yy, LW, Math.ceil(24 * wip));
    }
  }
  // launch iris from black
  if (lt < 0.15) { x.fillStyle = `rgba(0,0,0,${1 - lt / 0.15})`; x.fillRect(0, 0, LW, LH); }
  return { low: ART.low, hud: ART.hud, g, stop, sl };
}
export { text };
