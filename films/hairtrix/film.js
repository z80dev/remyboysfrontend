// THE HAIRTRIX — Remy Boys film #36 (Matrix parody). 92 s, 1080p via a 960×540 pixel stage
// (2× nearest). Green-phosphor Simulation, harsh-white Construct, cold-blue real world.
// Every animated quantity traces to ./timeline.js: SHOTS for the map, *_EV world-g tables for
// the choreography, warp()/filmT() for the hit-stop clock (world freezes, FX run on film t),
// WAVE/VOLLEY for the analytic bullet waves, ORBIT + cam3d for the bullet-time camera.
// score.js is the composer's file (imported exactly like extra-baldestral).
import { W, H, seg, lerp, E, hash, smooth } from 'filmkit/lib.js';
import { lookAt } from 'filmkit/cam3d.js';
import * as A from '../remy-bros/art.js';
import * as ART from './art.js';
import { score } from './score.js';
import {
  DURATION, LW, LH, GROUND, GRID, GRADE, PHOS, ROLES,
  SHOTS, STOP_FILM, FREEZES, warp, filmT, G_TRAIN,
  TERMINAL_EV, CONTACT_EV, CONSTRUCT_EV, TRAINING_EV, JUMPPROG_EV, ROOFTOP_EV,
  BULLETTIME_EV, LOBBY_EV, SUBWAY_EV, PAYOFF_EV,
  WAVE, VOLLEY, ORBIT, HIT, CAM, FLASHES, CAPS, CAP_STYLES,
} from './timeline.js';

// ---- cast (ids bound by CASTING.md, looked up through the timeline ROLES tokens) ------------
const IDS = {
  [ROLES.FLOW]: 2186,
  [ROLES.MOUSSE_PHEUS]: 2719,
  [ROLES.TRIMNITY]: 3972,
  [ROLES.AGENT_SMIRK]: 1989,
  [ROLES.SWARM]: [2653, 2487, 2619, 704, 389],
};
const FLOW_SKIN = '#8a6a52', FLOW_SLEEVE = '#231c1c';
const MP_SLEEVE = '#8c8a95', TRIM_SLEEVE = '#231c1a', TRIM_SKIN = '#c8a888';

const S = {}; // prepared art (read-only in draw)
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
// fillRect with a negative width draws a REVERSED rect — guard every dynamic rect.
const fr = (x, px, py, w2, h2d) => { if (w2 > 0 && h2d > 0) x.fillRect(px, py, w2, h2d); };

// ---------- stock poses ----------
const idle = (t, k = 1) => ({ lean: Math.sin(t * 2.1) * 0.014 * k, lift: [0, 0], stride: [0, 0] });
const walkCycle = (ph) => {
  const s2 = Math.sin(ph) * 0.8;
  return {
    lift: [Math.round(Math.max(0, s2) * 5), Math.round(Math.max(0, -s2) * 5)],
    stride: [Math.round(s2 * 2), Math.round(-s2 * 2)],
    lean: 0.05,
  };
};
const runCycle = (ph) => {
  const s2 = Math.sin(ph);
  return {
    lift: [Math.round(Math.max(0, s2) * 9), Math.round(Math.max(0, -s2) * 9)],
    stride: [Math.round(s2 * 3.4), Math.round(-s2 * 3.4)],
    lean: 0.17,
  };
};

// ---------- camera / shake ----------
function camAt(name, t) {
  const ks = CAM[name];
  if (t <= ks[0].t) return ks[0];
  const last = ks[ks.length - 1];
  if (t >= last.t) return last;
  let i = 0;
  while (t > ks[i + 1].t) i++;
  const a = ks[i], b = ks[i + 1];
  const u = seg(t, a.t, b.t), s2 = u * u * (3 - 2 * u);
  return { x: lerp(a.x, b.x, s2), y: lerp(a.y, b.y, s2), k: lerp(a.k, b.k, s2) };
}
const applyCam = (x, cam) => {
  x.translate(LW / 2, LH / 2);
  x.scale(cam.k, cam.k);
  x.translate(-cam.x, -cam.y);
};
// impact shake on REAL film time (runs through freezes), exponential decay
function shakeAt(t) {
  let s2 = 0;
  for (const sf of STOP_FILM) {
    const d = t - sf.film;
    if (d >= 0 && d < 0.55) s2 = Math.max(s2, (sf.g === 71.48 ? 3.6 : 2.6) * Math.exp(-d / 0.16));
  }
  return s2;
}
const hitFrame = (w) => (w && w.stop && w.stop.d < 0.5 && w.sl < 0.05);

// ---------- the pixel stage ----------
const low = () => S.low.getContext('2d');
const beginLow = () => {
  const x = low();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#020604';
  x.fillRect(-ART.OVER - 24, -ART.OVER - 24, LW + 2 * (ART.OVER + 24), LH + 2 * (ART.OVER + 24));
  return x;
};
const blit = (ctx) => {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.low, 0, 0, LW, LH, 0, 0, W, H);
};

// ---------- analytic bullet waves -------------------------------------------------------------
// Per-round speed = muzzle→hang distance over the world crawl time, so every round reaches
// the hang plane exactly at its freeze g (timeline law). After a freeze's resume the same
// direction carries the round on (roof: into the parapet at per-round arrivals ≈ parapetChew).
const WB = WAVE.muzzleX.map((mx, i) => {
  const my = WAVE.muzzleY[i], hx = WAVE.hangX[i], hy = WAVE.hangY[i];
  const dx = hx - mx, dy = hy - my, dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist, ny = dy / dist;
  const chewX = WAVE.chewTarget.x + (h2(i, 1, 15) - 0.5) * 30;
  const chewY = WAVE.chewTarget.y + (h2(i, 2, 15) - 0.5) * 14;
  const arrive = filmT(BULLETTIME_EV.parapetChew) + h2(i, 3, 15) * 0.12; // parapetChew is world g — map to film s
  const pd = Math.hypot(chewX - hx, chewY - hy) || 1;
  return {
    i, mx, my, hx, hy, nx, ny, v: dist / (WAVE.freezeG - WAVE.fireG),
    px: (chewX - hx) / pd, py: (chewY - hy) / pd, vPost: pd / (arrive - FREEZES.bullet.film1),
    arrive, chewX, chewY, seed: 7 + i * 13, trailLen: 60 + h2(i, 4, 15) * 30,
  };
});
// Roof wave bullet screen pos for (world g, film t). frozen: hanging (flutter rides film t).
function roofBullet(b, g, t) {
  const F = FREEZES.bullet;
  if (t >= F.film1) { // resume: scream past FLOW into the parapet
    const dt = t - F.film1;
    return { x: b.hx + b.px * b.vPost * dt, y: b.hy + b.py * b.vPost * dt, done: t >= b.arrive };
  }
  if (g >= WAVE.freezeG - 1e-9) return { x: b.hx, y: b.hy, frozen: true };
  if (g < WAVE.fireG) return null;
  const d = (g - WAVE.fireG) * b.v;
  return { x: b.mx + b.nx * d, y: b.my + b.ny * d };
}
// Payoff volley: same law; after resume every round obeys pure gravity onto the roof.
const PLUCKED = 2; // VOLLEY round FLOW snatches at HIT.pluck
const VB = VOLLEY.muzzleX.map((mx, i) => {
  const my = VOLLEY.muzzleY[i], hx = VOLLEY.hangX[i], hy = VOLLEY.hangY[i];
  const dx = hx - mx, dy = hy - my, dist = Math.hypot(dx, dy) || 1;
  return {
    i, mx, my, hx, hy, nx: dx / dist, ny: dy / dist,
    v: dist / (VOLLEY.freezeG - VOLLEY.fireG), seed: 21 + i * 13,
    trailLen: 54 + h2(i, 5, 16) * 26,
  };
});
function volleyBullet(b, t, g) {
  const F = FREEZES.volley;
  if (b.i === PLUCKED) return null; // handled by the pluck animator
  const fall0 = F.film1;
  if (t >= fall0) {
    const dt = t - fall0;
    const y = b.hy + 0.5 * VOLLEY.dropG * dt * dt;
    return { x: b.hx, y: Math.min(y, VOLLEY.floorY - 2), landed: y >= VOLLEY.floorY - 2 };
  }
  if (g >= VOLLEY.freezeG - 1e-9) return { x: b.hx, y: b.hy, frozen: true };
  if (g < VOLLEY.fireG) return null;
  const d = (g - VOLLEY.fireG) * b.v;
  return { x: b.mx + b.nx * d, y: b.my + b.ny * d };
}
// The plucked round: rides FLOW's fingers, then flicks away spinning, dies on the roof deck
// and settles there as a few-px brass round with a contact shadow (QA P2: nothing arm-sized
// may linger in frame after the pluck). Rest pose = the flick's roof crossing (dt ≈ 0.78).
function pluckBulletPos(t) {
  if (t < 85.8) return null;
  if (t < 85.95) return { x: lerp(VB[PLUCKED].hx, HIT.pluck.x, seg(t, 85.8, 85.9)), y: lerp(VB[PLUCKED].hy, HIT.pluck.y, seg(t, 85.8, 85.9)) };
  const dt = t - 85.95;
  const y = HIT.pluck.y - 240 * dt + 500 * dt * dt;
  if (y >= VOLLEY.floorY - 2) return { x: HIT.pluck.x - 117, y: VOLLEY.floorY - 2, rest: true };
  return { x: HIT.pluck.x - 150 * dt, y, spin: dt * 21 };
}

// immutable event tables (module scope — never appended in draw). FX events live in FILM
// seconds (they run on real film time through freezes); SUBWAY/PAYOFF choreography keys are
// world g, so their film anchors are derived here through filmT — never hand-added.
const ROOF_FIRE_EV = WB.map((b) => ({ g: filmT(WAVE.fireG), x: b.mx, y: b.my, seed: 40 + b.i }));
const PAYOFF_FIRE_EV = VB.map((b) => ({ g: filmT(VOLLEY.fireG), x: b.mx, y: b.my, seed: 50 + b.i }));
const PARAPET_SPARK_EV = WB.map((b) => ({ g: b.arrive, x: b.chewX, y: b.chewY, seed: 60 + b.i }));
const BRASS_EV = Array.from({ length: 26 }, (_, i) => ({
  g: 86.12 + h2(i, 1, 17) * 0.55, x: 330 + h2(i, 2, 17) * 570, y: 430 + h2(i, 3, 17) * 14, seed: 70 + i,
})); // QA I: granular carpet across the roof width, not a clump at his feet
const LOBBY_FIRE_EV = [
  { g: 66.0, x: 660, y: 296, seed: 81 },   // pillarHit1 clone volley
  { g: 67.0, x: 252, y: 330, seed: 82 },   // crossFire: FLOW
  { g: 67.0, x: 792, y: 330, seed: 83 },   // crossFire: clones
  { g: 67.4, x: 190, y: 330, seed: 84 },   // TRIM
  { g: 67.4, x: 836, y: 330, seed: 85 },
  { g: 70.0, x: 500, y: 268, seed: 86 },   // pillarHit2
  { g: 70.4, x: 190, y: 330, seed: 87 },   // TRIM returns fire
  { g: 71.5, x: 300, y: 300, seed: 88 },   // pillarHit3
  { g: 72.2, x: 862, y: 330, seed: 89 },
  { g: 67.6, x: 252, y: 330, seed: 90 },   // exchange fill (QA J: >= 12 shells)
  { g: 68.0, x: 208, y: 330, seed: 92 },
  { g: 70.9, x: 862, y: 330, seed: 94 },
  { g: 71.75, x: 208, y: 330, seed: 96 },
];
const GLASS_EV = [{ g: filmT(LOBBY_EV.lobbyEntry), x: 96, y: 300, seed: 91 }]; // doors burst
// subway film anchors (world g → film through the warp clock)
const SB = {
  arrival: filmT(SUBWAY_EV.subwayArrival),     // 74.6
  standoff: filmT(SUBWAY_EV.platformStandoff), // 75.6
  shadesOff: filmT(SUBWAY_EV.shadesOff),       // 76.6
  dash: filmT(SUBWAY_EV.duelDash),             // 79.12
  grapple: filmT(SUBWAY_EV.grapple),           // 79.5
  trainClip: filmT(G_TRAIN),                   // 80.0
  expressClear: filmT(SUBWAY_EV.expressClear), // 81.0
  local: filmT(SUBWAY_EV.localStops),          // 81.6
  doors: filmT(SUBWAY_EV.doorsOpen),           // 82.1
  reskin: filmT(SUBWAY_EV.reskinReveal),       // 82.5
  gone: 83.2,
  narrow: filmT(SUBWAY_EV.narrowEyes),         // 83.4
};
// payoff film anchors
const PF = {
  swarmIn: filmT(PAYOFF_EV.swarmIn),       // 84.2
  swarmFire: filmT(PAYOFF_EV.swarmFire),   // 84.4
  handRaise: filmT(PAYOFF_EV.handRaise),   // 84.7
  crouch: filmT(PAYOFF_EV.crouch),         // 86.9
  liftoff: filmT(PAYOFF_EV.liftoff),       // 87.4
  skyStreak: filmT(PAYOFF_EV.skyStreak),   // 88.6
};

// ---------- shared character painters ----------------------------------------------------------
function agent(x, R, px, feet, o = {}) {
  if ((o.alpha ?? 1) > 0.02) ART.shadow(x, px, feet, 20, 0.3 * (o.alpha ?? 1));
  A.drawRemy(x, R, px, feet, o);
}
// suit arm + pistol leveled toward a target point; the arm stays short so it never
// rakes across the face (muzzle FX/bullets keep their WAVE/VOLLEY coordinates)
function aimArm(x, R, px, feet, o, tx, ty) {
  const sh = ART.rigPoint(R, R.cx + 12, R.eyes.y + 18, px, feet, o); // +12 mirrors with flip
  const dx = tx - sh[0], dy = ty - sh[1], dl = Math.hypot(dx, dy) || 1;
  const ext = Math.min(1, 24 / dl);
  const gx = sh[0] + dx * ext, gy = sh[1] + dy * ext;
  ART.reachArm(x, sh[0], sh[1], gx, gy, { sleeve: '#101218', skin: '#0c0d12', w: 5 });
  ART.pistol(x, gx, gy, Math.atan2(dy, dx), 1);
  return sh;
}
function coatFlare(x, px, py, k, dir = 1) { // trench coat flare behind a striding hero
  if (k <= 0.02) return;
  x.save();
  x.globalAlpha = 0.9 * clamp01(k);
  x.fillStyle = '#12100f';
  x.beginPath();
  x.moveTo(px - dir * 8, py);
  x.quadraticCurveTo(px - dir * 34, py - 12, px - dir * (26 + 16 * k), py + 26 + 14 * k);
  x.quadraticCurveTo(px - dir * 16, py + 30, px - dir * 4, py + 22);
  x.closePath(); x.fill();
  x.restore();
}
function tracerLine(x, ev, rt, tx, ty) {
  const age = rt - ev.g;
  if (age < 0 || age > 0.14) return;
  const k = 1 - age / 0.14;
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = `rgba(160,255,190,${0.7 * k})`;
  x.lineWidth = 1.6;
  x.beginPath(); x.moveTo(ev.x, ev.y); x.lineTo(lerp(ev.x, tx, 0.9), lerp(ev.y, ty, 0.9)); x.stroke();
  x.restore();
}
// muzzle flash + smoke + shells for an immutable fire event table (rt = film time)
function fireFx(x, events, rt, flashLife = 0.12) {
  for (const ev of events) {
    const age = rt - ev.g;
    if (age < 0 || age > 1.4) continue;
    ART.muzzleFlash(x, ev.x, ev.y, 1, Math.max(0, 1 - age / flashLife));
    ART.smokePuff(x, ev.x - 6 - age * 12, ev.y - 8 - age * 16, 7 + age * 26, Math.max(0, 0.16 - age * 0.1));
  }
  ART.shells(x, events, rt, GROUND);
}

// flat 2D rain over the roof (pinned while the world is frozen)
function rain2d(x, g, frozen) {
  const gg = frozen ? WAVE.freezeG : g;
  x.save();
  x.strokeStyle = 'rgba(140,220,170,0.22)';
  x.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const rx = -40 + h2(i, 1, 19) * 1040;
    const ry = ((h2(i, 2, 19) * 900 + gg * 420) % 620) - 40;
    x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx - 2, ry + 9); x.stroke();
  }
  x.restore();
}

// ================================ THE ORBIT (signature shot) ===================================
const LK = { x: HIT.freezeCentroid.x, y: HIT.freezeCentroid.y }; // camera look-at (stage coords)
// cam3d world: origin at the look-at, +y up, 1 world unit = 1 stage px on the tableau plane.
const toWorld = (sx, sy, z = 0) => [sx - LK.x, LK.y - sy, z];
const REF_S = 2.36; // 1080p px per world unit at the look-at — matches the flat CAM 1.18 view

function orbitCamera(t) {
  const whip = E.inOutCubic(seg(t, FREEZES.bullet.film0, BULLETTIME_EV.orbitStart));
  const u = seg(t, ORBIT.cam0, ORBIT.cam1), s2 = smooth(u);
  const th = (ORBIT.theta0Deg + ORBIT.sweepDeg * s2) * Math.PI / 180;
  const fov = lerp(6, 88.5, whip);
  // The whip-in must be a dolly ZOOM, not two independent lerps: lookAt projects with focal =
  // (H/2)/tan(fov/2), so coupling r ∝ 1/tan(fov/2) holds the look-at framing at REF_S for the
  // whole whip. Lerping fov and radius separately let r·tan(fov/2) balloon ~4× mid-whip and
  // shrank the whole set to a ~30% diorama inside black (QA P0, film 55.1–55.55). Endpoints
  // unchanged: fov 6° → r ≈ 4364 (telephoto hold), fov 88.5° → r = ORBIT radius (dip kept).
  const rOrbit = ORBIT.radius0 - ORBIT.radiusDip * Math.sin(Math.PI * u);
  const r = (rOrbit * Math.tan((88.5 * Math.PI) / 360)) / Math.tan((fov * Math.PI) / 360);
  const hStage = ORBIT.height + ORBIT.heightArc * Math.sin(Math.PI * u);
  const roll = (ORBIT.rollDeg * Math.PI / 180) * (1 - s2);
  return lookAt([r * Math.cos(th), LK.y - hStage, r * Math.sin(th)], [0, 0, 0], fov, roll);
}
// project world → stage; returns null behind the camera
function prj(cam, wx, wy, wz) {
  const p = cam.project([wx, wy, wz]);
  return p ? { x: p.x / 2, y: p.y / 2, s: p.s } : null;
}
// sprite draw scale for a rig at projection p: drawRemy sy so the rig's world height holds.
// Clamped — true perspective would balloon FLOW to a face macro as the orbit passes his
// shoulder (r 210 vs his 150 px camera distance) and shrink the far agents into the deck.
const rigScale = (p, base = 2) => Math.min(2.25, Math.max(1.35, base * p.s / REF_S));

// the frozen tableau, seen through the orbit camera (film 55.0–63.0)
function drawOrbit(x, t) {
  const cam = orbitCamera(t);
  x.fillStyle = '#020704'; x.fillRect(0, 0, LW, LH);

  // --- skyline cylinder (10 facing-inward panels at radius 350; true camera arc)
  for (let i = 0; i < 10; i++) {
    const phi = (i * 36 + 18) * Math.PI / 180;
    const nx = Math.sin(phi), nz = Math.cos(phi);
    const tx = Math.cos(phi), tz = -Math.sin(phi);
    const vx = cam.pos[0] - RS_SKY * nx, vz = cam.pos[2] - RS_SKY * nz;
    if (nx * vx + nz * vz > 0) continue; // backface (inward normal; camera rides inside r 350)
    const tl = prj(cam, RS_SKY * nx - tx * 110, 194, RS_SKY * nz - tz * 110);
    const tr = prj(cam, RS_SKY * nx + tx * 110, 194, RS_SKY * nz + tz * 110);
    const bl = prj(cam, RS_SKY * nx - tx * 110, -140, RS_SKY * nz - tz * 110);
    if (!tl || !tr || !bl) continue;
    x.save();
    x.setTransform((tr.x - tl.x) / 220, (tr.y - tl.y) / 220, (bl.x - tl.x) / 334, (bl.y - tl.y) / 334, tl.x, tl.y);
    x.imageSmoothingEnabled = false;
    x.drawImage(S.strip, i * 220, 0, 220, 334, 0, 0, 220, 334);
    x.restore();
    if (h2(i, 1, 23) > 0.55) { // live aircraft-warning blink gives the sweep a depth cue
      const bl2 = prj(cam, RS_SKY * nx, 194 + 16 + h2(i, 2, 23) * 30, RS_SKY * nz);
      if (bl2 && Math.sin(t * 2.4 + i * 2) > 0.4) {
        x.fillStyle = 'rgba(255,90,90,0.8)';
        x.fillRect(bl2.x - 1.5, bl2.y - 1.5, 3, 3);
      }
    }
  }
  // --- the deck (roof plane) as a projected quad with baked texture
  {
    const tl = prj(cam, -430, -146, -170), tr = prj(cam, 430, -146, -170), bl = prj(cam, -430, -146, 170);
    if (tl && tr && bl) {
      x.save();
      x.setTransform((tr.x - tl.x) / 860, (tr.y - tl.y) / 860, (bl.x - tl.x) / 340, (bl.y - tl.y) / 340, tl.x, tl.y);
      x.imageSmoothingEnabled = false;
      x.drawImage(S.deck, 0, 0);
      x.restore();
    }
  }
  // --- roof-edge rim (front lip of the deck)
  for (const [ex, ez] of [[-430, 170], [430, 170]]) {
    const a = prj(cam, ex, -146, ez), b = prj(cam, ex, -158, ez);
    if (a && b) { x.strokeStyle = '#0a120c'; x.lineWidth = 3; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }
  }
  // --- foreground roof hint (QA A): at high orbit altitudes the deck quad thins out — a
  // screen-space roof-tone band + parapet lip keep FLOW planted on a roof at every angle
  x.save();
  const rb = x.createLinearGradient(0, LH * 0.78, 0, LH);
  rb.addColorStop(0, 'rgba(12,22,15,0)');
  rb.addColorStop(0.45, 'rgba(13,24,16,0.72)');
  rb.addColorStop(1, 'rgba(9,17,12,0.95)');
  x.fillStyle = rb; x.fillRect(0, LH * 0.78, LW, LH * 0.22);
  x.fillStyle = '#1e3022'; x.fillRect(0, LH * 0.795, LW, 3); // parapet lip
  x.fillStyle = 'rgba(46,70,50,0.5)'; x.fillRect(0, LH * 0.795, LW, 1);
  x.restore();
  // --- city bounce so the deck never reads as a void: horizon band + sheen under the volley
  x.save();
  x.globalCompositeOperation = 'lighter';
  const hz = x.createLinearGradient(0, LH * 0.3, 0, LH * 0.62);
  hz.addColorStop(0, 'rgba(24,80,46,0)');
  hz.addColorStop(0.55, 'rgba(24,80,46,0.13)');
  hz.addColorStop(1, 'rgba(10,34,20,0)');
  x.fillStyle = hz; x.fillRect(0, LH * 0.3, LW, LH * 0.32);
  const c0 = prj(cam, 0, -146, 0);
  if (c0) {
    const sg = x.createRadialGradient(c0.x, c0.y, 0, c0.x, c0.y, 240);
    sg.addColorStop(0, 'rgba(40,110,64,0.11)');
    sg.addColorStop(1, 'rgba(40,110,64,0)');
    x.fillStyle = sg;
    x.beginPath(); x.ellipse(c0.x, c0.y, 240, 64, 0, 0, 7); x.fill();
  }
  x.restore();
  // --- props as projected primitives (billboard boxes at true world anchors)
  const box = (sx, zTop, zBot, w, col, hi) => { // vertical box at stage x, world z=0
    const tl = prj(cam, sx - LK.x - w / 2, LK.y - zTop, 0), tr = prj(cam, sx - LK.x + w / 2, LK.y - zTop, 0);
    const bl = prj(cam, sx - LK.x - w / 2, LK.y - zBot, 0);
    if (!tl || !tr || !bl) return;
    x.fillStyle = col;
    fr(x, tl.x, tl.y, tr.x - tl.x, bl.y - tl.y);
    if (hi) fr(x, tl.x, tl.y, tr.x - tl.x, Math.max(1.5, (bl.y - tl.y) * 0.05));
  };
  // water tank x 880 · antenna x 120 · bulkhead x 940 · parapet x 240–320 (z-spread for depth)
  {
    const tk = prj(cam, ...toWorld(880, 300, -70));
    if (tk) {
      const k = tk.s / REF_S;
      x.fillStyle = '#101c14'; fr(x, tk.x - 26 * k, tk.y, 52 * k, 130 * k);
      x.fillStyle = '#182818'; fr(x, tk.x - 26 * k, tk.y, 52 * k, 8 * k);
      x.fillStyle = '#0a120c';
      fr(x, tk.x - 20 * k, tk.y + 8 * k, 3 * k, 122 * k); fr(x, tk.x + 16 * k, tk.y + 8 * k, 3 * k, 122 * k);
    }
    const an = prj(cam, ...toWorld(120, 190, -90));
    if (an) {
      const k = an.s / REF_S;
      x.strokeStyle = '#0c150e'; x.lineWidth = 3 * k;
      x.beginPath(); x.moveTo(an.x, an.y + 240 * k); x.lineTo(an.x, an.y); x.stroke();
      if (Math.sin(t * 2.2) > 0) { x.fillStyle = 'rgba(255,80,80,0.9)'; x.fillRect(an.x - 2 * k, an.y - 6 * k, 4 * k, 4 * k); }
    }
    const bk = prj(cam, ...toWorld(950, 324, -50));
    if (bk) {
      const k = bk.s / REF_S;
      x.fillStyle = '#0e1811'; fr(x, bk.x - 44 * k, bk.y, 88 * k, 106 * k);
      x.fillStyle = '#18281a'; fr(x, bk.x - 44 * k, bk.y, 88 * k, 8 * k);
      x.fillStyle = '#060b07'; fr(x, bk.x - 20 * k, bk.y + 28 * k, 40 * k, 78 * k);
      x.fillStyle = 'rgba(84,255,142,0.13)'; fr(x, bk.x - 20 * k, bk.y + 28 * k, 40 * k, 78 * k);
    }
    const pp = prj(cam, ...toWorld(280, 380, -12));
    if (pp) {
      const k = pp.s / REF_S;
      x.fillStyle = '#131f16'; fr(x, pp.x - 44 * k, pp.y, 88 * k, 52 * k);
      x.fillStyle = '#1e3022'; fr(x, pp.x - 44 * k, pp.y, 88 * k, 6 * k);
    }
  }

  // --- suspended rain (nearest drops swing the most — the ×1.15 layer)
  for (let i = 0; i < 90; i++) {
    const rz = -20 + h2(i, 3, 9) * 65;
    const p = prj(cam, (h2(i, 1, 9) - 0.5) * 1040, (h2(i, 2, 9) - 0.5) * 680, rz);
    if (!p) continue;
    const ln = (5 + h2(i, 4, 9) * 5) * (p.s / REF_S);
    x.strokeStyle = `rgba(160,240,190,${0.16 + h2(i, 5, 9) * 0.3})`;
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - ln * 0.16, p.y + ln); x.stroke();
  }

  // --- the five frozen agents (z −60…−96 → the ×0.75 parallax layer)
  const AGENT_X = [712, 760, 805, 850, 895];
  const uOr = seg(t, ORBIT.cam0, ORBIT.cam1);
  for (let i = 0; i < 5; i++) {
    const R = i === 0 ? S.smirk : S.swarm[i - 1];
    const z = -60 - i * 9;
    const p = prj(cam, ...toWorld(AGENT_X[i], GROUND, z));
    if (!p) continue;
    const sc = rigScale(p);
    // backness: how far the camera has swung behind their facing (they watch FLOW, −x)
    const camdx = cam.pos[0] - (AGENT_X[i] - LK.x);
    const back = smooth(clamp01((camdx - 40) / 240));
    const o = { flip: true, sx: sc, sy: sc, alpha: 1 };
    if (back > 0.02) agent(x, i === 0 ? S.smirkDark : S.swarmDark[i - 1], p.x, p.y, { ...o, alpha: back });
    if (back < 0.98) agent(x, R, p.x, p.y, { ...o, alpha: 1 - back });
    // heads slowly track the camera (rt-driven): shade glints slide as the head turns
    if (back < 0.6) {
      const off = Math.max(-3, Math.min(3, 3.4 * Math.sin((ORBIT.theta0Deg + ORBIT.sweepDeg * uOr) * 0.017 + i)));
      for (const exn of [R.eyes.l, R.eyes.r]) {
        const gp = ART.rigPoint(R, exn + off, R.eyes.y - 1, p.x, p.y, { flip: true, sx: sc, sy: sc });
        x.fillStyle = 'rgba(190,235,205,0.6)';
        x.fillRect(gp[0] - 1, gp[1] - 1, 2.4, 1.6);
      }
    }
    // level pistols toward the volley while frozen
    const mp = prj(cam, ...toWorld(WB[i].mx, WB[i].my, 4));
    if (mp) {
      const sp = ART.rigPoint(R, R.cx + 12, R.eyes.y + 18, p.x, p.y, { flip: true, sx: sc, sy: sc });
      const adx = mp.x - sp[0], ady = mp.y - sp[1], adl = Math.hypot(adx, ady) || 1;
      const aext = Math.min(1, 24 * (p.s / REF_S) / adl);
      const gx = sp[0] + adx * aext, gy = sp[1] + ady * aext;
      ART.reachArm(x, sp[0], sp[1], gx, gy, { sleeve: '#101218', skin: '#0c0d12', w: 5 * (p.s / REF_S) });
      ART.pistol(x, gx, gy, Math.atan2(ady, adx), p.s / REF_S);
    }
  }

  // --- muzzle smoke, almost still (creeping on film time inside the freeze)
  for (let i = 0; i < 5; i++) {
    const p = prj(cam, ...toWorld(WB[i].mx, WB[i].my, 2));
    if (p) ART.smokePuff(x, p.x, p.y - 8, (9 + (t - FREEZES.bullet.film0) * 1.6) * (p.s / REF_S), 0.14);
  }

  // --- FLOW, mid-back-bend at x 330 (z 0). The bend must READ at every orbit angle (QA A):
  // rot about the FEET anchor plus a hunch lean, coat hem kicked up behind the arc, and the
  // hair swung back toward the agents as 3 parted strands.
  {
    const p = prj(cam, ...toWorld(330, GROUND, 0));
    if (p) {
      const sc = rigScale(p);
      // lifted coat: a leather wedge sweeping up-behind his back (drawn first, behind him)
      const ck = p.s / REF_S;
      x.save();
      x.globalAlpha = 0.92;
      x.fillStyle = '#0d0b0a';
      x.beginPath();
      x.moveTo(p.x - 6 * ck, p.y - 96 * ck);
      x.quadraticCurveTo(p.x - 54 * ck, p.y - 150 * ck, p.x - 78 * ck, p.y - 196 * ck);
      x.quadraticCurveTo(p.x - 40 * ck, p.y - 150 * ck, p.x - 20 * ck, p.y - 88 * ck);
      x.closePath(); x.fill();
      x.strokeStyle = 'rgba(150,158,168,0.25)';
      x.lineWidth = 1.2 * ck;
      x.beginPath(); x.moveTo(p.x - 30 * ck, p.y - 110 * ck);
      x.quadraticCurveTo(p.x - 58 * ck, p.y - 150 * ck, p.x - 74 * ck, p.y - 188 * ck);
      x.stroke();
      x.restore();
      A.drawRemy(x, S.flow, p.x, p.y, {
        rot: -0.42, lean: 0.12, sx: sc, sy: sc, glow: '#cfd6da', glowA: 0.14,
      });
      // his flow streams toward the agents in one frozen arc with parted strands
      const hp = ART.rigPoint(S.flow, S.flow.cx + 6, S.flow.top + 22, p.x, p.y, { rot: -0.42, sx: sc, sy: sc });
      const dirp = prj(cam, toWorld(330, GROUND)[0] + 60, toWorld(330, GROUND)[1], 0);
      if (dirp) {
        const dxn = dirp.x - hp[0], dyn = dirp.y - hp[1], dl = Math.hypot(dxn, dyn) || 1;
        x.save();
        x.lineCap = 'round';
        for (let s3 = 0; s3 < 3; s3++) {
          const len = (52 + s3 * 16) * (p.s / REF_S);
          const flut = Math.sin(t * 1.9 + s3 * 2.1) * 2.4 * (p.s / REF_S);
          x.strokeStyle = `rgba(178,186,196,${0.55 - s3 * 0.12})`;
          x.lineWidth = 2 - s3 * 0.4;
          x.beginPath();
          x.moveTo(hp[0], hp[1]);
          x.quadraticCurveTo(hp[0] + dxn / dl * len * 0.6 + flut, hp[1] + dyn / dl * len * 0.6 - 6 * (p.s / REF_S),
            hp[0] + dxn / dl * len + flut * 1.6, hp[1] + dyn / dl * len + (s3 - 1) * 7 * (p.s / REF_S));
          x.stroke();
        }
        x.restore();
      }
    }
  }

  // --- the hanging volley with hair-part trails (each on its own shallow z)
  for (const b of WB) {
    const z = 8 + b.i * 5;
    const p = prj(cam, ...toWorld(b.hx, b.hy, z));
    if (!p) continue;
    const k = p.s / REF_S;
    const p2 = prj(cam, b.hx - LK.x + b.nx * 24, LK.y - b.hy + b.ny * 24, z);
    let dx = b.nx, dy = b.ny;
    if (p2) { dx = p2.x - p.x; dy = p2.y - p.y; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl; }
    ART.hairTrail(x, p.x, p.y, dx, dy, b.trailLen * k, k, t, b.seed); // trail streams back along the path
    ART.bulletCore(x, p.x, p.y, k, 1);
  }
  // glassy freeze tint
  x.fillStyle = 'rgba(140,220,170,0.03)';
  x.fillRect(0, 0, LW, LH);
}
const RS_SKY = 350;

// flat rooftop tableau (rooftense, the whip-in/out shoulders of the freeze)
function drawRoofFlat(x, t, g, frozen, flowRot, settle) {
  x.drawImage(S.roof, -ART.OVER, -ART.OVER);
  rain2d(x, g, frozen);
  // stairwell glow
  x.fillStyle = 'rgba(84,255,142,0.10)';
  fr(x, 900, 320, 80, 120);
  const AGENT_X = [712, 760, 805, 850, 895];
  const aiming = g >= ROOFTOP_EV.waveAim - 0.001;
  for (let i = 0; i < 5; i++) {
    const R = i === 0 ? S.smirk : S.swarm[i - 1];
    const ax = AGENT_X[i];
    agent(x, R, ax, GROUND, { sx: 2, sy: 2, flip: true });
    if (aiming) aimArm(x, R, ax, GROUND, { flip: true, sx: 2, sy: 2 }, WAVE.muzzleX[i], WAVE.muzzleY[i]);
  }
  // FLOW first — the resume tracers scream PAST him and the chew sparks land on the parapet
  // lip under his silhouette, so both must draw in front of the body to read at all
  const rot = flowRot + (settle ?? 0);
  ART.shadow(x, 330, GROUND, 22, 0.34);
  A.drawRemy(x, S.flow, 330, GROUND, { rot, sx: 2, sy: 2, glow: '#cfd6da', glowA: 0.1 });
  // tracer wave
  for (const b of WB) {
    const st = roofBullet(b, g, t);
    if (!st || st.done) continue;
    if (st.frozen) {
      ART.hairTrail(x, st.x, st.y, b.nx, b.ny, b.trailLen, 1, t, b.seed);
      ART.bulletCore(x, st.x, st.y, 1, 1);
    } else {
      ART.bulletCore(x, st.x, st.y, 1, 1);
      x.strokeStyle = 'rgba(160,255,190,0.5)';
      x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(st.x, st.y); x.lineTo(st.x + b.nx * 38, st.y + b.ny * 38); x.stroke();
    }
  }
  fireFx(x, ROOF_FIRE_EV, t);
  if (t >= FREEZES.bullet.film1) ART.chips(x, PARAPET_SPARK_EV, t, '190,255,210', 9, 380, 0.7);
}

// ================================ SHOT DRAWS ===================================================

// ---- S1 terminal · film 0–12 · GRADE.phosphor -------------------------------------------------
function drawTerminal(ctx, lt, dur, t) {
  const x = beginLow();
  x.drawImage(S.terminal, -ART.OVER, -ART.OVER);
  const on = seg(t, TERMINAL_EV.crtOn, TERMINAL_EV.crtOn + 1.0);
  const smear = seg(t, TERMINAL_EV.glitchOut, TERMINAL_EV.cutOut);
  ART.drawRain(x, t, { on, storm: t >= TERMINAL_EV.rainStorm, smear: smear * (t < TERMINAL_EV.cutOut ? 1 : 0) });
  // scanlines + rolling bright band
  x.fillStyle = 'rgba(0,0,0,0.16)';
  for (let sy = 0; sy < LH; sy += 4) x.fillRect(0, sy, LW, 1);
  const band = ((t * 46) % (LH + 120)) - 60;
  const bg = x.createLinearGradient(0, band - 30, 0, band + 30);
  bg.addColorStop(0, 'rgba(84,255,142,0)'); bg.addColorStop(0.5, 'rgba(84,255,142,0.05)'); bg.addColorStop(1, 'rgba(84,255,142,0)');
  x.fillStyle = bg; x.fillRect(0, band - 30, LW, 60);
  // blinking block cursor + dim underline sweep (the words themselves are captions)
  if (t > TERMINAL_EV.wakeUp && t < TERMINAL_EV.titleSlam) {
    if ((t * 2.6) % 1 < 0.6) { x.fillStyle = 'rgba(84,255,142,0.75)'; x.fillRect(256, 244, 11, 15); }
    const sw = seg(t, TERMINAL_EV.wakeUp, TERMINAL_EV.hareLine + 2);
    x.fillStyle = 'rgba(29,122,66,0.4)';
    fr(x, 200, 282, sw * 560, 2);
  }
  if (smear > 0.01 && t < TERMINAL_EV.cutOut) { // horizontal tear bands
    for (const [by, sd] of [[110, 1], [250, 2], [390, 3]]) {
      const dx = (h2(sd, 1, 27) - 0.5) * 60 * smear;
      x.drawImage(S.low, 0, by, LW, 13, dx, by + Math.sin(t * 40 + sd) * 2, LW, 13);
    }
  }
  if (t >= TERMINAL_EV.cutOut) { // one white scanline collapses the screen
    x.fillStyle = '#010302'; x.fillRect(0, 0, LW, LH);
    const cu = E.inCubic(seg(t, TERMINAL_EV.cutOut, 12.0));
    x.fillStyle = 'rgba(230,255,240,0.9)';
    x.fillRect(0, LH * (1 - cu) - 1.5, LW, 3);
  }
  blit(ctx);
}

// ---- S2 contact · film 12–20 · GRADE.matrix ---------------------------------------------------
function drawContact(ctx, lt, dur, t) {
  const x = beginLow();
  const w = warp(t);
  let cam = camAt('contact', t);
  // QA E: keep FLOW's arrival legible — the pan must not outrun his walk (he hits world
  // x 300 at 17.8; unclamped, the drift made him read ~200 on screen). Releases at carDoor.
  if (t >= CONTACT_EV.underpassIn && t < CONTACT_EV.carDoor) {
    const walkX = lerp(200, 300, E.inOutCubic(seg(t, CONTACT_EV.underpassIn, CONTACT_EV.underpassIn + 1.0)));
    cam = { ...cam, x: Math.min(cam.x, walkX + 224) };
  }
  x.save();
  x.translate(Math.sin(t * 61) * shakeAt(t), Math.cos(t * 53) * shakeAt(t) * 0.6);
  applyCam(x, cam);
  if (t < CONTACT_EV.underpassIn) {
    // ---- cubicle farm
    x.drawImage(S.cubicle, -ART.OVER, -ART.OVER);
    const dead = t >= CONTACT_EV.boothBlack;
    x.save();
    if (dead) x.globalAlpha = 0.14; // power-down afterimage
    ART.shadow(x, 300, 448, 24, 0.3);
    A.drawRemy(x, S.flowClean, 300, 448, { ...idle(t), lean: 0.12, sx: 2, sy: 2 });
    x.drawImage(S.deskFront, 254, 352); // his lap disappears behind the desk
    // CRT chassis in front of him (QA K): bezel + shell so the green hiccup is a screen,
    // not a bare patch floating over his eye
    x.fillStyle = '#7d837a'; x.fillRect(316, 282, 62, 50);
    x.fillStyle = '#8d938a'; x.fillRect(316, 282, 62, 5);
    x.fillStyle = '#565b54'; x.fillRect(334, 334, 26, 4);
    x.fillStyle = '#0a0f0b'; x.fillRect(322, 290, 50, 36);
    // CRT face: hiccups green at deskGlitch, dies at boothBlack
    const gl = Math.max(0, 1 - Math.abs(t - CONTACT_EV.deskGlitch) / 0.16);
    x.fillStyle = dead ? '#050705' : gl > 0 ? `rgba(${60 + gl * 160},${160 + gl * 95},${90 + gl * 60},1)` : '#0a1f10';
    x.fillRect(322, 290, 50, 36);
    if (!dead) {
      x.fillStyle = 'rgba(84,255,142,0.7)';
      x.fillRect(326 + Math.sin(t * 30) * gl * 3, 294, 4, 6);
      for (let i = 0; i < 3; i++) x.fillRect(334 + i * 12, 302 + (i % 2) * 8, 8, 2);
      // TRIMNITY's whisper crawling off the glass (the caption is the readable truth)
      const wk = seg(t, CONTACT_EV.screenWhisper, CONTACT_EV.boothBlack);
      if (wk > 0) {
        for (let i = 0; i < 7; i++) {
          const a = (wk * 1.4 + i * 0.19) % 1;
          ART.drawGlyph(x, 'shair~'[i], 328 + h2(i, 1, 29) * 40, 318 - a * 34, 1, 1, (1 - a) * 0.8);
        }
      }
    }
    x.restore();
    if (dead) ART.warmGlow(x, 340, 310, 60, 0.05, '90,160,110');
    // CRT static flecks
    for (let i = 0; i < 14; i++) {
      const a = ((t * 5 + h2(i, 2, 29)) % 1);
      x.fillStyle = `rgba(120,200,150,${0.12 * (1 - a)})`;
      x.fillRect(316 + h2(i, 3, 29) * 62, 282 + a * 46, 1.4, 1.4);
    }
  } else {
    // ---- sodium underpass
    x.drawImage(S.underpass, -ART.OVER, -ART.OVER);
    // headlight lamp glow + wet-ground pool (car replanted at near-field scale, QA E)
    ART.warmGlow(x, 692, 400, 34, 0.3, '255,240,210');
    ART.warmGlow(x, 726, 432, 62, 0.16, '255,230,180');
    // dust motes in the lamp cones
    for (const lx of [200, 700]) {
      ART.shaft(x, lx, 156, lx, 430, 10, 52, '255,186,100', 0.16);
      ART.warmGlow(x, lx, 152, 60, 0.35, '255,190,110');
      ART.warmGlow(x, lx, 434, 90, 0.22, '255,186,100');
      for (let i = 0; i < 8; i++) {
        const a = ((t * 0.5 + h2(i, 1, 31)) % 1);
        x.fillStyle = `rgba(255,214,150,${0.2 * (1 - a)})`;
        x.fillRect(lx - 30 + h2(i, 2, 31) * 60, 170 + a * 250, 1.4, 1.4);
      }
    }
    // FLOW walks in 200→300 (16.8–17.8)
    const inU = E.inOutCubic(seg(t, CONTACT_EV.underpassIn, CONTACT_EV.underpassIn + 1.0));
    const fx2 = lerp(200, 300, inU);
    ART.shadow(x, fx2, GROUND, 20, 0.34);
    A.drawRemy(x, S.flowClean, fx2, GROUND, { ...(inU < 0.98 ? walkCycle(t * 7.2) : idle(t)), sx: 2, sy: 2, glow: '#cfd6da', glowA: 0.08 });
    // MOUSSE-PHEUS steps out beside the car (x 620, facing left)
    if (t >= CONTACT_EV.mousseIn) {
      const mU = E.outCubic(seg(t, CONTACT_EV.mousseIn, CONTACT_EV.mousseIn + 0.7));
      const mx = lerp(648, 620, mU);
      ART.shadow(x, mx, GROUND, 21, 0.34);
      A.drawRemy(x, S.mousse, mx, GROUND, { ...(mU < 0.95 ? walkCycle(t * 6 + 2) : idle(t)), flip: true, sx: 2.05, sy: 2.05 });
    }
    // rear door swings with a white interior glow (carDoor)
    if (t >= CONTACT_EV.carDoor) {
      const dU = E.outCubic(seg(t, CONTACT_EV.carDoor, CONTACT_EV.carDoor + 0.5));
      x.save();
      x.translate(828, 392);
      x.scale(Math.max(0.08, Math.cos(dU * 1.2)), 1);
      x.fillStyle = '#10161c'; x.fillRect(-20, -38, 40, 46);
      x.fillStyle = `rgba(240,250,244,${0.85 * dU})`; x.fillRect(-16, -34, 32, 40);
      x.restore();
      ART.warmGlow(x, 828, 392, 70 * dU, 0.3 * dU, '240,250,240');
    }
  }
  if (t >= CONTACT_EV.cutWhite - 0.05) { // screen flood into the Construct
    x.fillStyle = `rgba(244,247,242,${seg(t, CONTACT_EV.cutWhite - 0.05, CONTACT_EV.cutWhite + 0.1)})`;
    x.fillRect(-ART.OVER, -ART.OVER, LW + 2 * ART.OVER, LH + 2 * ART.OVER);
  }
  x.restore();
  blit(ctx);
}

// ---- S3 construct · film 20–34 · construct → real ----------------------------------------------
function drawConstruct(ctx, lt, dur, t) {
  const x = beginLow();
  const g = warp(t).g;
  let cam = camAt('construct', t);
  // QA G: the 1.45 punch must LAND on the burst (27.4-27.8), not sit on an earlier key —
  // a film-side decaying push toward HIT.mirrorBreak rides the locked CAM keys.
  const punch = t >= CONSTRUCT_EV.mirrorBreak && t < 28.0 ? Math.exp(-(t - CONSTRUCT_EV.mirrorBreak) / 0.16) : 0;
  if (punch > 0.01) {
    cam = { ...cam, k: cam.k + 0.22 * punch,
      x: lerp(cam.x, HIT.mirrorBreak.x, 0.45 * punch), y: lerp(cam.y, HIT.mirrorBreak.y, 0.4 * punch) };
  }
  x.save();
  applyCam(x, cam);
  if (t < CONSTRUCT_EV.podFall) {
    // ---- white void
    x.drawImage(S.construct, -ART.OVER, -ART.OVER);
    const reveal = 1 - seg(t, 20.0, 20.6) * 0.9;
    if (reveal > 0.01) { x.fillStyle = `rgba(244,247,242,${reveal})`; x.fillRect(-ART.OVER, -ART.OVER, LW + 2 * ART.OVER, LH + 2 * ART.OVER); }
    // MOUSSE-PHEUS x 570 facing left, FLOW x 380
    ART.shadow(x, 570, GROUND, 22, 0.2);
    A.drawRemy(x, S.mousse, 570, GROUND, { ...idle(t, 0.6), flip: true, sx: 2.05, sy: 2.05 });
    ART.shadow(x, 380, GROUND, 21, 0.2);
    A.drawRemy(x, S.flowClean, 380, GROUND, { ...idle(t, 0.6), sx: 2, sy: 2 });
    // the pills in the open palm
    if (t >= CONSTRUCT_EV.pillsOffered) {
      ART.reachArm(x, 556, 330, 478, 340, { sleeve: MP_SLEEVE, skin: FLOW_SKIN, w: 8 });
      x.fillStyle = FLOW_SKIN; // palm
      x.beginPath(); x.ellipse(474, 341, 9, 6, 0.3, 0, 7); x.fill();
      const redGone = t >= CONSTRUCT_EV.redTaken;
      const rx = redGone ? lerp(464, 402, E.outCubic(seg(t, CONSTRUCT_EV.redTaken, CONSTRUCT_EV.redTaken + 0.5))) : 464;
      const ry = redGone ? lerp(338, 348, E.outCubic(seg(t, CONSTRUCT_EV.redTaken, CONSTRUCT_EV.redTaken + 0.5))) : 338;
      if (redGone) ART.reachArm(x, 402, 352, rx + 2, ry + 2, { sleeve: FLOW_SLEEVE, skin: FLOW_SKIN, w: 7 });
      for (const [px2, py2, col, k] of [[rx, ry, '#c23a2e', 1 - seg(t, CONSTRUCT_EV.redTaken, CONSTRUCT_EV.redTaken + 0.4)],
                                       [484, 342, '#2e5fc3', 1 - seg(t, CONSTRUCT_EV.blueFade, CONSTRUCT_EV.blueFade + 0.5)]]) {
        if (k <= 0.01) continue;
        x.save(); x.globalAlpha = k;
        x.fillStyle = col;
        x.beginPath(); x.arc(px2, py2, 5, 0, 7); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.75)';
        x.fillRect(px2 - 2, py2 - 3, 2, 2);
        x.restore();
      }
      // the blue dissolves into motes that fall UP — the wrongness cue
      if (t >= CONSTRUCT_EV.blueFade) ART.riseMotes(x, { g: CONSTRUCT_EV.blueFade, x: 484, y: 336, seed: 5 }, g, 14, '110,150,235');
    }
    // the mirror goes liquid, then bursts through the frame
    if (t >= CONSTRUCT_EV.mirrorLiquid && t < CONSTRUCT_EV.mirrorBreak) {
      const lk = seg(t, CONSTRUCT_EV.mirrorLiquid, CONSTRUCT_EV.mirrorBreak);
      x.save();
      x.beginPath(); x.rect(224, 226, 52, 196); x.clip();
      for (let i = 0; i < 3; i++) {
        const rr = ((lk * 0.9 + i / 3) % 1);
        x.strokeStyle = `rgba(255,255,255,${0.5 * (1 - rr)})`;
        x.lineWidth = 2;
        x.beginPath(); x.ellipse(250, 320, 10 + rr * 46, 16 + rr * 110, 0, 0, 7); x.stroke();
      }
      x.restore();
    }
    if (t >= CONSTRUCT_EV.mirrorBreak) {
      ART.droplets(x, { g: CONSTRUCT_EV.mirrorBreak, x: HIT.mirrorBreak.x, y: HIT.mirrorBreak.y, seed: 9 }, g, 34, '102,116,128'); // QA G: dark silver — visible on #f4f7f2
      // radial shatter cracks in the frame's own dark wood — no white polygon (read as
      // crumpled paper on the void), the FLASH wash + droplets carry the burst
      x.strokeStyle = '#3a3228'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(224, 226); x.lineTo(276, 422); x.moveTo(276, 226); x.lineTo(224, 422); x.stroke();
      x.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.35;
        x.beginPath(); x.moveTo(250, 300);
        x.lineTo(250 + Math.cos(a) * 34, 300 + Math.sin(a) * 62);
        x.stroke();
      }
    }
  } else if (t < CONSTRUCT_EV.podWake) {
    // ---- falling through dark water
    const fu = seg(t, CONSTRUCT_EV.podFall, CONSTRUCT_EV.podWake);
    x.fillStyle = '#030a14'; x.fillRect(-ART.OVER, -ART.OVER, LW + 2 * ART.OVER, LH + 2 * ART.OVER);
    const recede = 1 - fu; // the light shaft shrinks away above
    ART.shaft(x, 480, -40, 480, 300 * recede + 60, 130 * recede + 20, 60 * recede + 8, '140,200,230', 0.22 * recede + 0.04);
    for (let i = 0; i < 26; i++) { // bubble streaks rush upward
      const sp = 260 + h2(i, 1, 33) * 300;
      const by = ((h2(i, 2, 33) * 900 - (t - CONSTRUCT_EV.podFall) * sp) % 640 + 640) % 640 - 50;
      const bx = 20 + h2(i, 3, 33) * 920;
      x.fillStyle = `rgba(150,200,230,${0.14 + h2(i, 4, 33) * 0.25})`;
      fr(x, bx, by, 2, 7 + h2(i, 5, 33) * 8);
    }
    // the falling body rides the shaft down, hair streaming up — without it the beat is ~2 s
    // of empty water and the transition loses its subject (motion-QA defect)
    const fy = lerp(-70, 560, fu * fu);
    A.drawRemy(x, S.flowClean, 480, fy, { lean: 0.26, lift: [2, -2], stride: [3, -3], rot: 0.1, sx: 1.45, sy: 1.45 });
    for (let i = 0; i < 3; i++) {
      x.strokeStyle = `rgba(150,180,200,${0.5 - i * 0.12})`;
      x.lineWidth = 2 - i * 0.4;
      x.beginPath();
      x.moveTo(474 + i * 6, fy - 78);
      x.quadraticCurveTo(468 + i * 8, fy - 114, 474 + i * 10, fy - 146 - i * 6);
      x.stroke();
    }
  } else {
    // ---- the pod farm
    x.drawImage(S.podfarm, -ART.OVER, -ART.OVER);
    const drained = seg(t, CONSTRUCT_EV.podWake, CONSTRUCT_EV.podWake + 1.0);
    const fluidTop = lerp(260, 402, drained);
    // FLOW slumped inside the central pod, clipped to the glass
    x.save();
    x.beginPath(); x.ellipse(480, 315, 58, 112, 0, 0, 7); x.clip();
    x.fillStyle = '#0c2030'; x.fillRect(420, fluidTop, 120, 430 - fluidTop);
    A.drawRemy(x, S.flowClean, 480, 418, { lean: 0.22, sx: 1.75, sy: 1.75 });
    if (drained < 1) { // hair floats while submerged, then settles wet
      for (let i = 0; i < 3; i++) {
        x.strokeStyle = `rgba(120,150,160,${0.5 * (1 - drained)})`;
        x.lineWidth = 2;
        const wy = 250 + i * 8;
        x.beginPath();
        x.moveTo(466 + i * 12, wy);
        x.quadraticCurveTo(460 + i * 14 + Math.sin(t * 2 + i) * 5, wy - 10, 470 + i * 12, wy - 18 - i * 4);
        x.stroke();
      }
    }
    x.fillStyle = 'rgba(90,160,190,0.16)'; x.fillRect(420, 210, 120, 220); // glass tint
    x.restore();
    for (let i = 0; i < 6; i++) { // draining beads ride the fluid line
      const a = ((t * 0.8 + h2(i, 1, 35)) % 1);
      x.fillStyle = `rgba(160,220,240,${0.5 * (1 - drained * 0.6)})`;
      x.fillRect(432 + h2(i, 2, 35) * 96, fluidTop + a * 8, 2, 3);
    }
    // hovercraft floodlight
    if (t >= CONSTRUCT_EV.hoverIn) {
      const hk = seg(t, CONSTRUCT_EV.hoverIn, CONSTRUCT_EV.hoverIn + 0.8);
      ART.shaft(x, 480, -30, 480, 432, 30, 150, '170,220,250', 0.2 * hk);
      for (let i = 0; i < 10; i++) {
        const a = ((t * 0.4 + h2(i, 3, 35)) % 1);
        x.fillStyle = `rgba(200,230,250,${0.25 * hk * (1 - a)})`;
        x.fillRect(430 + h2(i, 4, 35) * 100, 60 + a * 350, 1.6, 1.6);
      }
    }
    if (t >= CONSTRUCT_EV.whiteOutEv - 0.05) {
      x.fillStyle = `rgba(238,244,240,${seg(t, CONSTRUCT_EV.whiteOutEv - 0.05, CONSTRUCT_EV.whiteOutEv + 0.15)})`;
      x.fillRect(-ART.OVER, -ART.OVER, LW + 2 * ART.OVER, LH + 2 * ART.OVER);
    }
  }
  x.restore();
  blit(ctx);
}

// ---- S4 dojo · film 34–44 · GRADE.matrix ------------------------------------------------------
function drawDojo(ctx, lt, dur, t) {
  const x = beginLow();
  const { g, stop, sl } = warp(t);
  const rt = g + sl;
  const cam = camAt('dojo', t);
  x.save();
  x.translate(Math.sin(t * 61) * shakeAt(t), Math.cos(t * 53) * shakeAt(t) * 0.6);
  applyCam(x, cam);
  x.drawImage(S.dojo, -ART.OVER, -ART.OVER);
  // mirror wall doubles the fighters
  const bow = Math.exp(-Math.pow((g - TRAINING_EV.dojoIn - 0.45) / 0.42, 2));
  // ---- FLOW position through the spar
  let fxx = 360;
  if (g >= TRAINING_EV.sparStart) fxx = 360 + 60 * (0.5 + 0.5 * Math.sin((g - TRAINING_EV.sparStart) * 1.4));
  if (g >= TRAINING_EV.combo1) fxx = 420 + 40 * E.inOutCubic(seg(g, TRAINING_EV.combo1, TRAINING_EV.combo1 + 1.1));
  if (g >= TRAINING_EV.dojoHit) fxx = 402; // pinned at the palm
  if (g >= TRAINING_EV.dojoHit + 0.18) { // resume: ballistic skid across the mats
    const ku = seg(g, TRAINING_EV.dojoHit + 0.18, TRAINING_EV.recoil);
    fxx = 402 - 172 * E.outCubic(ku);
  }
  const mpFlip = true;
  let mpx = 600;
  if (g >= TRAINING_EV.sparStart && g < TRAINING_EV.dojoHit) mpx = 600 - 40 * (0.5 + 0.5 * Math.sin((g - TRAINING_EV.sparStart) * 1.4 + Math.PI));
  if (g >= 39.55) mpx = lerp(600, 505, E.inCubic(seg(g, 39.55, TRAINING_EV.dojoHit))); // the lunge rides the silence (stops clear of FLOW's sprite so both bodies read at the freeze)
  // mirrored FLOW in the wall glass (clipped to the mirror so the ghost never bleeds
  // past the frame at the far end of his skid)
  x.save();
  x.beginPath(); x.rect(82, 130, 76, 290); x.clip();
  x.globalAlpha = 0.2;
  A.drawRemy(x, S.flowClean, 240 - (fxx - 160), GROUND, { ...idle(t, 0.7), lean: -0.05, sx: 2, sy: 2, flip: true });
  x.restore();
  // MOUSSE-PHEUS (feet never move until the lunge)
  ART.shadow(x, mpx, GROUND, 22, 0.36);
  A.drawRemy(x, S.mousse, mpx, GROUND, {
    ...idle(t, 0.7), flip: mpFlip, sx: 2.05, sy: 2.05,
    lean: 0.2 * bow + (g >= 39.55 ? 0.14 : 0),
  });
  // FLOW
  ART.shadow(x, fxx, GROUND, 21, 0.34);
  const flowRot = 0;
  A.drawRemy(x, S.flowClean, fxx, GROUND, {
    ...(g > TRAINING_EV.sparStart && g < TRAINING_EV.dojoHit ? runCycle(g * 9) : idle(t)),
    lean: (bow > 0.05 ? -0.2 * bow : 0.1) + (g >= TRAINING_EV.combo1 ? 0.08 : 0),
    sx: 2, sy: 2, glow: '#cfd6da', glowA: 0.09, rot: flowRot,
  });
  // THE HIT — palm meets chest inside the 0.18 s stop
  if (g >= TRAINING_EV.dojoHit - 0.05) {
    ART.reachArm(x, mpx - 24, 322, HIT.dojo.x + 4, HIT.dojo.y, { sleeve: MP_SLEEVE, skin: FLOW_SKIN, w: 8 });
    if (hitFrame({ stop, sl })) { x.fillStyle = 'rgba(240,250,244,0.14)'; x.fillRect(0, 0, LW, LH); }
  }
  // mat dust at the skid rest
  ART.dustPlume(x, { g: TRAINING_EV.dojoHit + 0.3, x: 300, y: 428, seed: 11 }, rt, 1.1, '150,140,110');
  // hanging bulb sways on rt after the strike
  {
    const dt2 = rt - TRAINING_EV.dojoHit;
    const ang = dt2 > 0 ? 0.22 * Math.exp(-dt2 / 0.9) * Math.sin(dt2 * 5.2) : 0;
    const bx = 480 + Math.sin(ang) * 66, by = 92 + Math.cos(ang) * 66;
    x.strokeStyle = '#0a0f0a'; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(480, 24); x.lineTo(bx, by); x.stroke();
    x.fillStyle = '#1c2418'; x.fillRect(bx - 6, by, 12, 5);
    ART.warmGlow(x, bx, by + 6, 30, 0.35, '255,232,160');
    x.fillStyle = '#ffe9b0'; x.fillRect(bx - 3, by + 5, 6, 6);
  }
  // the comb bends — THERE IS NO FOLLICLE
  if (g >= TRAINING_EV.combRaise) {
    const raise = E.outCubic(seg(g, TRAINING_EV.combRaise, TRAINING_EV.combRaise + 0.4));
    const curl = E.inOutCubic(seg(g, TRAINING_EV.combBend + 0.18, 43.4));
    ART.reachArm(x, mpx - 20, 326, lerp(520, 500, raise), lerp(380, 330, raise), { sleeve: MP_SLEEVE, skin: FLOW_SKIN, w: 7 });
    ART.combProp(x, lerp(520, 500, raise), lerp(378, 328, raise), -0.4 - raise * 0.5, curl);
  }
  x.restore();
  blit(ctx);
  // shades glint at 43.0 (overlay, post-grade: stage → 1080p through the camera transform)
  const glk = Math.exp(-Math.abs(t - 43.0) * 5);
  if (glk > 0.05) {
    const gp = ART.rigPoint(S.mousse, (S.mousse.eyes.l + S.mousse.eyes.r) / 2, S.mousse.eyes.y,
      mpx, GROUND, { flip: true, sx: 2.05, sy: 2.05 });
    const ox = ((gp[0] - cam.x) * cam.k + LW / 2) * 2, oy = ((gp[1] - cam.y) * cam.k + LH / 2) * 2;
    ART.glintStar(ctx, ox, oy, 26 * glk, 0.6 * glk);
  }
}

// ---- S5 jumpprog · film 44–48 · GRADE.matrix --------------------------------------------------
function drawJump(ctx, lt, dur, t) {
  const x = beginLow();
  const g = warp(t).g;
  const cam = camAt('jumpprog', t);
  x.save();
  applyCam(x, cam);
  x.drawImage(S.jump, -ART.OVER, -ART.OVER);
  // city wind lines across the gap
  for (let i = 0; i < 4; i++) {
    const wy = 300 + i * 34;
    const wx = ((h2(i, 1, 37) * 1200 + t * (160 + i * 40)) % 1300) - 170;
    x.strokeStyle = `rgba(120,180,140,${0.1 + h2(i, 2, 37) * 0.12})`;
    x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(wx, wy); x.lineTo(wx + 90 + i * 18, wy - 3); x.stroke();
  }
  // FLOW path: run → ballistic arc with apex hang → land and skid
  let fxx = 150, feet = 400, pose = idle(t), rot = 0, air = false, jumpSy = 2;
  if (g < JUMPPROG_EV.runUp + 1.12) {
    const ru = seg(g, JUMPPROG_EV.runUp, JUMPPROG_EV.runUp + 1.12);
    fxx = lerp(150, 400, ru);
    pose = runCycle(g * 11);
  } else if (g < JUMPPROG_EV.jumpLand) {
    air = true;
    const xu = seg(g, JUMPPROG_EV.runUp + 1.12, JUMPPROG_EV.jumpLand);
    fxx = lerp(400, 585, xu);
    const au = seg(g, JUMPPROG_EV.runUp + 1.12, JUMPPROG_EV.jumpApex);
    const du = seg(g, JUMPPROG_EV.jumpApex + 0.35, JUMPPROG_EV.jumpLand);
    feet = 400 - 78 * E.outQuad(au) + 126 * E.inQuad(du);
    if (g > JUMPPROG_EV.jumpApex && g < JUMPPROG_EV.jumpApex + 0.35) feet = 322 + Math.sin((g - JUMPPROG_EV.jumpApex) * 9) * 2;
    rot = -0.06;
    pose = { lean: 0.14, lift: [3, 6], stride: [2, -2] };
  } else {
    const lu = seg(g, JUMPPROG_EV.jumpLand, JUMPPROG_EV.jumpLand + 0.4);
    fxx = lerp(585, 660, E.outCubic(lu));
    feet = 448;
    pose = { lean: 0.16 * (1 - lu), lift: [0, 0], stride: [0, 0] };
    // QA F: hard landing reads — deep crouch (head drop ~30%) unloading as he skids
    jumpSy = 2 - 0.58 * (1 - E.outCubic(lu));
  }
  ART.shadow(x, fxx, feet, air ? 14 : 20, air ? 0.16 : 0.32);
  A.drawRemy(x, S.flow, fxx, feet, { ...pose, rot, sx: 2, sy: jumpSy ?? 2, glow: '#cfd6da', glowA: 0.09 }); // QA F: trench from the roof scenes on
  if (!air && g >= JUMPPROG_EV.jumpLand) coatFlare(x, fxx, feet - 60, 1 - seg(g, JUMPPROG_EV.jumpLand, JUMPPROG_EV.jumpLand + 0.45), 1);
  if (air) { // coat flare + streaming hair at the apex
    const ap = 1 - Math.abs(g - (JUMPPROG_EV.jumpApex + 0.1)) / 0.6;
    if (ap > 0) {
      coatFlare(x, fxx, feet - 60, ap, 1);
      for (let i = 0; i < 3; i++) {
        x.strokeStyle = `rgba(178,186,196,${0.5 * ap})`;
        x.lineWidth = 1.6;
        x.beginPath();
        x.moveTo(fxx - 4 + i * 5, feet - 196 + i * 3);
        x.quadraticCurveTo(fxx - 12 + i * 6, feet - 216, fxx - 2 + i * 8, feet - 228 - i * 6);
        x.stroke();
      }
    }
  }
  ART.dustPlume(x, { g: JUMPPROG_EV.runUp + 1.12, x: 400, y: 398, seed: 13 }, g, 0.9, '140,150,120');
  ART.dustPlume(x, { g: JUMPPROG_EV.jumpLand, x: 585, y: 446, seed: 17 }, g, 1.3, '140,150,120');
  x.restore();
  blit(ctx);
}

// ---- S6 rooftense · film 48–54 · GRADE.matrix --------------------------------------------------
function drawRoofTense(ctx, lt, dur, t) {
  const x = beginLow();
  const g = warp(t).g;
  const cam = camAt('rooftense', t);
  x.save();
  x.translate(Math.sin(t * 61) * shakeAt(t), Math.cos(t * 53) * shakeAt(t) * 0.6);
  applyCam(x, cam);
  // sprinkler mist drifting
  for (let i = 0; i < 8; i++) {
    ART.smokePuff(x, ((h2(i, 1, 39) * 1100 + t * 14) % 1100) - 70, 300 + h2(i, 2, 39) * 150, 40 + h2(i, 3, 39) * 30, 0.05, '130,170,145');
  }
  drawRoofFlat(x, t, g, false, -0.42 * seg(g, 54.3, WAVE.freezeG));
  x.restore();
  blit(ctx);
}

// ---- S7 bullettime · film 54–64 · THE SIGNATURE ------------------------------------------------
function drawBullettime(ctx, lt, dur, t) {
  const x = beginLow();
  const { g, stop } = warp(t);
  const cam = camAt('bullettime', t);
  const sh = shakeAt(t);
  x.save();
  x.translate(Math.sin(t * 61) * sh, Math.cos(t * 53) * sh * 0.6);
  if (t < FREEZES.bullet.film0) {
    // whip-in window: world still running, FLOW bending back
    applyCam(x, cam);
    drawRoofFlat(x, t, g, false, -0.42 * seg(g, 54.3, WAVE.freezeG));
  } else if (t < FREEZES.bullet.film1) {
    applyCam(x, cam);
    drawOrbit(x, t); // frozen world, orbiting camera (timeline ORBIT spec)
  } else {
    // resume: world snaps 1:1, tracers scream past, rounds chew the parapet
    applyCam(x, cam);
    const snap = 1 - E.outCubic(seg(g, BULLETTIME_EV.snapUp, BULLETTIME_EV.snapUp + 0.4));
    drawRoofFlat(x, t, g, false, -0.42 * snap, 0);
    if (g >= BULLETTIME_EV.dodgeSettle) {
      const ck = seg(g, BULLETTIME_EV.dodgeSettle, BULLETTIME_EV.dodgeSettle + 0.5);
      coatFlare(x, 322, GROUND - 40, 1 - ck, -1); // coat cracks as he settles
    }
  }
  x.restore();
  blit(ctx);
}

// ---- S8 lobby · film 64–74 · GRADE.matrix ------------------------------------------------------
function drawLobby(ctx, lt, dur, t) {
  const x = beginLow();
  const { g, stop, sl } = warp(t);
  const cam = camAt('lobby', t);
  x.save();
  x.translate(Math.sin(t * 61) * shakeAt(t), Math.cos(t * 53) * shakeAt(t) * 0.6);
  applyCam(x, cam);
  x.drawImage(S.lobby, -ART.OVER, -ART.OVER);
  // clone line: 5 swarm clones rise behind the desk and the left column
  const CLONE_X = [300, 780, 820, 860, 900];
  if (g >= LOBBY_EV.deskLine) {
    for (let i = 0; i < 5; i++) {
      const rise = E.outCubic(seg(g, LOBBY_EV.deskLine + i * 0.09, LOBBY_EV.deskLine + 0.55 + i * 0.09));
      if (rise <= 0) continue;
      agent(x, S.swarm[i], CLONE_X[i], GROUND + 10 - 10 * rise, { sx: 1.9, sy: 1.9 * (0.8 + 0.2 * rise) });
    }
  }
  // the left pillar re-painted over the x300 clone (he stands behind it)
  ART.paintPillar(x, 300, 46);
  // desk front over the desk-line clones' legs + ceiling-strip rim so it reads on dark marble
  x.drawImage(S.lobbyDesk, 738, 338);
  x.fillStyle = 'rgba(150,230,170,0.22)'; fr(x, 738, 338, 184, 2);
  x.fillStyle = 'rgba(110,190,140,0.10)'; fr(x, 738, 340, 2, 90);
  x.fillStyle = 'rgba(150,230,170,0.08)'; fr(x, 740, 420, 180, 2);
  // doors burst inward + glass sprinkle
  if (g >= LOBBY_EV.lobbyEntry) {
    const du = E.outCubic(seg(g, LOBBY_EV.lobbyEntry, LOBBY_EV.lobbyEntry + 0.45));
    x.save();
    x.translate(96, 336);
    x.rotate(du * 0.9);
    x.fillStyle = 'rgba(150,210,170,0.2)';
    fr(x, 0, -96, 30, 192);
    x.strokeStyle = '#1c2a1e'; x.lineWidth = 3;
    x.strokeRect(0, -96, 30, 192);
    x.restore();
    ART.chips(x, GLASS_EV, t, '170,220,190', 12, 500, 1.1); // film-time event
  }
  // heroes in matching trenches: FLOW → 250, TRIM → 190 by 65.4; both sprint at 72.8 (QA D)
  const eU = E.outCubic(seg(g, LOBBY_EV.lobbyEntry, LOBBY_EV.lobbyEntry + 0.9));
  const fxx = lerp(90, 250, eU);
  let txx = lerp(70, 190, E.outCubic(seg(g, LOBBY_EV.lobbyEntry + 0.12, LOBBY_EV.lobbyEntry + 1.0)));
  let trimPose = eU < 0.98 ? walkCycle(g * 8 + 1) : idle(t);
  const striding = eU < 0.98;
  const sprinting = g >= LOBBY_EV.stairSprint;
  if (!sprinting) { // during the sprint she is drawn AFTER her x is updated below — drawing
    // here too would leave a second, pinned copy at her cover position (motion-QA defect)
    ART.shadow(x, txx, GROUND, 19, 0.32);
    A.drawRemy(x, S.trim, txx, GROUND, { ...trimPose, sx: 1.95, sy: 1.95 });
    coatFlare(x, txx, GROUND - 60, 1 - eU, 1);
  }
  // FLOW: entry → cartwheel (67.9–68.6) → cover behind the center pillar → sprint
  let flowDrawn = true;
  let flowX = fxx, flowFeet = GROUND, flowPose = striding ? walkCycle(g * 8) : idle(t), flowRot2 = 0;
  const cwU = seg(g, LOBBY_EV.cartwheel, LOBBY_EV.cartwheel + 0.7);
  if (cwU > 0 && cwU < 1) {
    // cartwheel: body rotates about its center; composed on a cleared scratch then placed
    flowDrawn = false;
    const cxp = lerp(240, 505, smooth(cwU));
    const cyp = GROUND - 116 - Math.sin(cwU * Math.PI) * 44;
    const sc2 = S.cart, sx2 = sc2.getContext('2d');
    sx2.setTransform(1, 0, 0, 1, 0, 0);
    sx2.globalCompositeOperation = 'source-over';
    sx2.imageSmoothingEnabled = false;
    sx2.clearRect(0, 0, sc2.width, sc2.height);
    A.drawRemy(sx2, S.flow, 110, 240, { ...runCycle(g * 12), sx: 1.95, sy: 1.95 });
    ART.shadow(x, cxp, GROUND, 18, 0.18);
    x.save();
    x.translate(cxp, cyp);
    x.rotate(-cwU * Math.PI * 2);
    x.drawImage(sc2, -110, -132);
    x.restore();
  } else if (cwU >= 1) {
    const plant = seg(g, LOBBY_EV.cartwheel + 0.7, LOBBY_EV.cartwheel + 0.9);
    flowX = 505; flowFeet = HIT.cartwheelLand.y;
    flowPose = { lean: 0.12 * (1 - plant), lift: [0, 0], stride: [0, 0] };
  }
  if (sprinting) { // QA D: the sprint must VISIBLY advance by 73.0 — front-loaded ease
    // (outQuad), TRIM runs the same window, and the run carries to 73.7 so the cut lands ON
    // the run instead of ~0.2 s of standing at the destination
    const su = seg(g, LOBBY_EV.stairSprint, LOBBY_EV.stairSprint + 0.92);
    flowX = lerp(505, 760, E.outQuad(su));
    flowFeet = GROUND;
    flowPose = runCycle(g * 13);
    txx = lerp(190, 700, E.outQuad(su));
    trimPose = runCycle(g * 13 + 0.5);
    ART.shadow(x, txx, GROUND, 19, 0.32);
    A.drawRemy(x, S.trim, txx, GROUND, { ...trimPose, sx: 1.95, sy: 1.95 });
    coatFlare(x, txx, GROUND - 60, 0.6, 1);
  }
  if (flowDrawn) {
    ART.shadow(x, flowX, flowFeet, 20, 0.32);
    A.drawRemy(x, S.flow, flowX, flowFeet, { ...flowPose, rot: flowRot2, sx: 2, sy: 2, glow: '#cfd6da', glowA: 0.09 });
    coatFlare(x, flowX, flowFeet - 60, striding || g >= LOBBY_EV.stairSprint ? 0.6 : 0, 1);
  }
  // center pillar OVER the cartwheel path, with accumulating damage
  ART.paintPillar(x, 480, 52);
  ART.pillarDamage(x, 660, 300, 5, seg(g, LOBBY_EV.pillarHit1, LOBBY_EV.pillarHit1 + 0.2));
  ART.pillarDamage(x, 500, 270, 6, seg(g, LOBBY_EV.pillarHit2, LOBBY_EV.pillarHit2 + 0.2));
  ART.pillarDamage(x, 300, 300, 7, 0.6 * seg(g, LOBBY_EV.pillarHit3, LOBBY_EV.pillarHit3 + 0.2));
  // gunfire: flashes, tracers, shells, stone chips + dust — all FILM time (runs through freezes)
  fireFx(x, LOBBY_FIRE_EV, t);
  ART.chips(x, [
    { g: 66.0, x: 660, y: 300, seed: 71 },  // pillarHit1
    { g: 70.0, x: 500, y: 268, seed: 72 },  // pillarHit2: GUTTED (QA J) — 6-10 chunk rain
    { g: 70.04, x: 492, y: 258, seed: 73 },
    { g: 70.08, x: 510, y: 282, seed: 75 },
    { g: 70.13, x: 486, y: 300, seed: 76 },
    { g: 70.18, x: 504, y: 246, seed: 77 },
    { g: 70.25, x: 494, y: 316, seed: 78 },
    { g: 70.32, x: 516, y: 270, seed: 79 },
    { g: 71.5, x: 300, y: 300, seed: 74 },  // pillarHit3
  ], t, '150,180,155', 9, 300, 0.7); // gravity 300: chips fall ~70 px, never sink to the bars
  ART.dustPlume(x, { g: 66.0, x: 660, y: 300, seed: 75 }, t, 1.2, '130,160,135');
  ART.dustPlume(x, { g: 70.0, x: 500, y: 268, seed: 76 }, t, 2.3, '130,160,135'); // growing billow
  ART.dustPlume(x, { g: 70.12, x: 480, y: 320, seed: 85 }, t, 1.5, '130,160,135');
  ART.dustPlume(x, { g: 71.5, x: 300, y: 300, seed: 77 }, t, 0.8, '130,160,135');
  tracerLine(x, { g: 67.0, x: 252, y: 330, seed: 1 }, t, 792, 330);
  tracerLine(x, { g: 67.4, x: 190, y: 330, seed: 2 }, t, 836, 330);
  tracerLine(x, { g: 70.4, x: 190, y: 330, seed: 3 }, t, 862, 330);
  tracerLine(x, { g: 70.0, x: 862, y: 330, seed: 4 }, t, 196, 330);
  if (hitFrame({ stop, sl })) { x.fillStyle = 'rgba(240,250,244,0.13)'; x.fillRect(0, 0, LW, LH); }
  x.restore();
  blit(ctx);
}

// ---- S9 subway · film 74–84 · GRADE.matrix -----------------------------------------------------
// All choreography keys run on FILM time via the SB table (world g → filmT above).
function drawSubway(ctx, lt, dur, t) {
  const x = beginLow();
  const { stop, sl } = warp(t);
  let cam = camAt('subway', t);
  { // QA H: the local train arrives on the track band (x >= 884) — at CAM k1.2 that slice
    // sits almost entirely offscreen right. Pull wide-left through the halt + re-skin so the
    // lit windows, doors and the filing crowd read; the 83.4 eye crop owns the frame after.
    const localK = smooth(seg(t, SB.local + 0.1, SB.doors + 0.3));
    if (localK > 0.01) {
      cam = { ...cam, k: lerp(cam.k, 1.02, localK), x: lerp(cam.x, 716, localK), y: lerp(cam.y, 318, localK) };
    }
  }
  x.save();
  x.translate(Math.sin(t * 61) * shakeAt(t), Math.cos(t * 53) * shakeAt(t) * 0.6);
  applyCam(x, cam);
  x.drawImage(S.subway, -ART.OVER, -ART.OVER);
  // SHORN ST drawn LIVE (QA H: the bake's glyph pass silently no-ops — plate renders, glyphs
  // never do). Dark plate + bright phosphor atlas tint 0, redrawn over the baked plate.
  x.fillStyle = '#10281a'; x.fillRect(418, 126, 152, 38);
  x.strokeStyle = '#3d5c46'; x.lineWidth = 2; x.strokeRect(418, 126, 152, 38);
  ART.glyphSign(x, 'SHORN ST', 428, 136, 2, 0, 1);
  // ---- the express roars through WITHOUT stopping (74.6–75.4)
  if (t >= SB.arrival && t < SB.arrival + 0.9) {
    const eu = seg(t, SB.arrival, SB.arrival + 0.8);
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const sy2 = 434 + h2(i, 1, 43) * 100;
      const sx2 = 830 + ((h2(i, 2, 43) * 900 + (t - SB.arrival) * 1500) % 420) - 210;
      const ln = 50 + h2(i, 3, 43) * 120;
      x.fillStyle = `rgba(190,235,205,${0.25 * (1 - eu * 0.5)})`;
      fr(x, sx2, sy2, ln, 3 + (i % 3) * 3);
    }
    x.restore();
    ART.warmGlow(x, 890, 470, 130, 0.25 * (1 - eu), '200,255,220');
    // wind flips litter across the platform
    for (let i = 0; i < 8; i++) {
      const age = t - SB.arrival;
      if (age - i * 0.05 < 0 || age > 1.6) continue;
      const px2 = 120 + ((h2(i, 4, 43) * 300 + age * (200 + h2(i, 5, 43) * 180)) % 860);
      ART.paper(x, px2, 420 + h2(i, 6, 43) * 40 + Math.sin(age * 9 + i) * 8, age * 6 + i, 0.85);
    }
  }
  // ---- FLOW enters 160→300 by 75.2
  const fU = E.inOutCubic(seg(t, SB.arrival + 0.1, SB.standoff - 0.3));
  let fxx = lerp(160, 300, fU);
  let fPose = fU < 0.98 ? walkCycle(t * 7) : idle(t, 0.8);
  // ---- SMIRK across the tiles
  let sxx = 700, smirkHere = t >= SB.standoff - 0.4 && t < SB.trainClip, smirkBare = false;
  if (t >= SB.shadesOff) smirkBare = true;
  // ---- the dash + grapple
  if (t >= SB.dash) {
    const du = seg(t, SB.dash, SB.grapple);
    fxx = lerp(300, 520, E.inOutCubic(du));
    fPose = runCycle(t * 13);
    sxx = lerp(700, 560, E.inOutCubic(du));
  }
  if (t >= SB.grapple) {
    fxx = 520; sxx = 560;
    // locked chest-to-chest, feet skidding toward the edge (right up to the slam)
    const sku = seg(t, SB.grapple, SB.trainClip - 0.02);
    const drift = sku * 110;
    fxx += drift * 0.45; sxx += drift * 0.55;
    fPose = { lean: -0.1, lift: [0, 0], stride: [3, -3] };
    ART.dustPlume(x, { g: SB.grapple, x: 540, y: 428, seed: 21 }, t, 0.9, '140,150,130');
  }
  // ---- train clip (STOP 0.35): metal wall sweeps L→R, front frozen at x 700
  let trainFront = -999;
  if (t >= SB.trainClip - 0.14 && t < SB.trainClip) trainFront = lerp(-300, 700, E.inQuad(seg(t, SB.trainClip - 0.14, SB.trainClip)));
  else if (t >= SB.trainClip && t < SB.trainClip + 0.35) trainFront = 700;
  else if (t >= SB.trainClip + 0.35 && t < SB.expressClear + 0.05) trainFront = lerp(700, 1500, E.outCubic(seg(t, SB.trainClip + 0.35, SB.expressClear)));
  if (smirkHere && trainFront < sxx - 12) {
    // SMIRK still on his feet (the front has not taken him yet)
    ART.shadow(x, sxx, GROUND, 20, 0.32);
    A.drawRemy(x, smirkBare ? S.smirkBare : S.smirk, sxx, GROUND, {
      ...(t >= SB.grapple ? { lean: 0.12, lift: [0, 0], stride: [2, -2] } : idle(t, 0.7)),
      flip: true, sx: 2, sy: 2,
    });
    if (smirkBare && t < SB.shadesOff + 0.6) { // QA H: off, folded, pocketed by ~77.2
      const so = E.outCubic(seg(t, SB.shadesOff, SB.shadesOff + 0.55));
      const hp = ART.rigPoint(S.smirkBare, S.smirkBare.eyes.r + 4, S.smirkBare.eyes.y + 26, sxx, GROUND, { flip: true, sx: 2, sy: 2 });
      x.save();
      x.translate(hp[0] + so * 6, hp[1] + so * 26); // hand completes down to the coat
      x.rotate(so * 0.8);
      x.globalAlpha = 1 - seg(t, SB.shadesOff + 0.45, SB.shadesOff + 0.6); // into the pocket
      x.fillStyle = '#0a0b0f';
      x.fillRect(-5, -2, 10, 4);
      x.strokeStyle = 'rgba(150,200,160,0.55)'; // folded frames catch one light edge
      x.lineWidth = 1;
      x.strokeRect(-5, -2, 10, 4);
      x.restore();
    }
  }
  // FLOW (head stays above the wall's roofline y 320)
  ART.shadow(x, fxx, GROUND, 20, 0.3);
  A.drawRemy(x, S.flow, fxx, GROUND, { ...fPose, sx: 2, sy: 2, glow: '#cfd6da', glowA: 0.09 });
  // grapple: locked arms between them
  if (t >= SB.grapple && trainFront < -200) {
    ART.reachArm(x, fxx + 14, 330, (fxx + sxx) / 2, 336, { sleeve: FLOW_SLEEVE, skin: FLOW_SKIN, w: 7 });
    ART.reachArm(x, sxx - 14, 330, (fxx + sxx) / 2, 336, { sleeve: '#101218', skin: '#0c0d12', w: 7 });
  }
  // the metal wall (foreground band y 320–540 + light band above)
  if (trainFront > -200) {
    const wallL = -ART.OVER, wallR = Math.min(trainFront, LW + ART.OVER);
    if (wallR > wallL) {
      x.fillStyle = '#151b21'; fr(x, wallL, 320, wallR - wallL, 220);
      x.fillStyle = '#1d242c'; fr(x, wallL, 320, wallR - wallL, 10); // roofline
      x.fillStyle = 'rgba(190,235,205,0.08)';
      for (let px2 = wallL + 20; px2 < wallR - 30; px2 += 64) fr(x, px2, 344, 44, 26); // window band ghosts
      x.fillStyle = '#0b0f13';
      for (let px2 = wallL + 8; px2 < wallR; px2 += 64) fr(x, px2, 372, 3, 168); // panel seams
      x.fillStyle = '#232c34'; fr(x, wallR - 10, 322, 10, 216); // the front face
      ART.warmGlow(x, wallR - 6, 396, 90, 0.65, '240,248,242');
      ART.warmGlow(x, wallR - 40, 430, 220, 0.22, '235,246,238');
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.fillStyle = 'rgba(248,252,248,0.85)';
      x.beginPath(); x.arc(wallR - 8, 396, 9, 0, 7); x.fill(); // the lamp itself, white hot
      x.restore();
      // wheel sparks at the rails through the slam
      if (t >= SB.trainClip - 0.1) ART.chips(x, [{ g: SB.trainClip - 0.1, x: Math.min(wallR - 20, 700), y: 505, seed: 23 }], t, '255,220,150', 12, 900, 0.8);
    }
  }
  // ---- the re-skin: local glides in and halts; one BALD head turns
  if (t >= SB.local) {
    const loff = (1 - E.outCubic(seg(t, SB.local, SB.local + 0.45))) * 420;
    const lbx = 884 + loff;
    // QA H: warm-lit local — body, roofline, 6 lit windows carrying passenger silhouettes
    x.fillStyle = '#242e38'; fr(x, lbx, 396, LW + ART.OVER - lbx + 40, 134);
    x.fillStyle = '#313d4a'; fr(x, lbx, 396, LW + ART.OVER - lbx + 40, 8);
    for (let i = 0; i < 6; i++) {
      const wx = lbx + 18 + i * 56;
      if (wx > LW + ART.OVER - 30) break;
      x.fillStyle = 'rgba(238,204,130,0.85)'; fr(x, wx, 414, 44, 38); // warm lit glass
      x.fillStyle = '#0a0e12'; // 7 passenger silhouettes ride the windows
      x.beginPath(); x.arc(wx + 10 + h2(i, 1, 91) * 24, 436, 8, 0, 7); x.fill();
      x.fillRect(wx + 2 + h2(i, 1, 91) * 24, 442, 20, 12);
      x.beginPath(); x.arc(wx + 34 - h2(i, 2, 91) * 14, 438, 7, 0, 7); x.fill();
    }
    // opening doors: pocket + warm interior spill onto the platform
    const dU = E.outCubic(seg(t, SB.doors, SB.doors + 0.35));
    if (t >= SB.doors) {
      x.fillStyle = 'rgba(238,204,130,0.5)'; fr(x, lbx + 12, 448, 52 * dU + 4, 76);
      x.fillStyle = '#12181e'; fr(x, lbx + 12, 456, 24 * (1 - dU) + 3, 70);
      x.fillStyle = '#12181e'; fr(x, lbx + 40 + 26 * dU, 456, 24 * (1 - dU) + 3, 70);
      x.strokeStyle = `rgba(200,235,205,${0.4 * (1 - seg(t, SB.doors, SB.doors + 0.9))})`;
      x.lineWidth = 1.6;
      x.beginPath(); x.ellipse(lbx + 30, 492, 8 + 34 * dU, 10 + 42 * dU, 0, 0, 7); x.stroke();
    }
    if (t >= SB.reskin) { // passengers file out; ONE BALD HEAD turns — him again
      const ru = seg(t, SB.reskin, SB.gone);
      for (let i = 0; i < 5; i++) { // QA H: the crowd files out 82.5-83.2
        const pu = seg(t, SB.reskin + i * 0.1, SB.reskin + 0.55 + i * 0.1);
        const px2 = lerp(884, 740 - i * 34, E.outCubic(pu));
        if (pu <= 0 || pu >= 1) continue;
        A.drawRemy(x, S.pax[i], px2, 450 + (i % 2) * 5, { ...walkCycle(t * 6 + i), sx: 1.5, sy: 1.5, alpha: 0.9 });
      }
      if (ru > 0 && ru < 1) { // SMIRK — bare-headed, paper cup, blends left and is gone
        const mx = lerp(852, 700, E.inOutCubic(ru));
        ART.shadow(x, mx, 452, 17, 0.3);
        A.drawRemy(x, S.smirkBare, mx, 452, { ...(ru < 0.5 ? idle(t, 0.6) : walkCycle(t * 6 + 3)), sx: 1.5, sy: 1.5 });
        const cp = ART.rigPoint(S.smirkBare, S.smirkBare.eyes.r + 6, S.smirkBare.eyes.y + 30, mx, 452, { sx: 1.5, sy: 1.5 });
        x.fillStyle = '#f2f0e8'; // paper cup: 3 px wide, white, held visibly (QA H)
        x.fillRect(cp[0] - 1.5, cp[1], 4, 7);
        x.fillStyle = '#c9c4b4';
        x.fillRect(cp[0] - 1.5, cp[1] + 1.5, 4, 1.2);
      }
    }
  }
  // falling papers after the express
  if (t >= SB.expressClear && t < 83.4) {
    for (let i = 0; i < 6; i++) {
      const age = t - SB.expressClear - i * 0.12;
      if (age < 0) continue;
      ART.paper(x, 300 + h2(i, 1, 45) * 500 + Math.sin(age * 3 + i) * 24, 200 + age * 90, age * 4 + i, 0.7);
    }
  }
  if (hitFrame({ stop, sl })) { x.fillStyle = 'rgba(240,250,244,0.2)'; x.fillRect(0, 0, LW, LH); }
  x.restore();
  blit(ctx);
  // ---- narrowEyes: push-in on FLOW's eyes (film 83.4 → the 84.0 cut), a FULL-FRAME crop
  // from the rig, drawn AFTER the blit so it owns the frame. Two laws (QA P0 83.4–83.95):
  // the source rect lives in the baked face-crop canvas (rig rows R.top..R.top+64), so the eye
  // row is (S.flowEyes.y − top) — raw rig coords crop chin/neck; and the destination must COVER
  // the frame (zoom ≥ max(W/sw, H/sh)) — a sub-frame zoom letterboxes the crop inside black.
  if (t >= SB.narrow) {
    const nk = seg(t, SB.narrow, 84.0);
    const ecx = (S.flowEyes.eyes[0] + S.flowEyes.eyes[1]) / 2, ecy = S.flowEyes.y - S.flowFaceTop;
    const sw2 = 46, sh3 = 26;
    const cover = Math.max(W / sw2, H / sh3); // ≈ 41.7 — the eye band fills 1920×1080 edge to edge
    const zoom = cover * (1 + 0.12 * E.inOutCubic(nk)); // and pushes in ~12% to the cut
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#020503';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(S.flowFace, ecx - sw2 / 2, ecy - sh3 / 2, sw2, sh3,
      W / 2 - (sw2 * zoom) / 2, H / 2 - (sh3 * zoom) / 2, sw2 * zoom, sh3 * zoom);
    ctx.restore();
  }
}

// ---- S10 payoff · film 84–92 · GRADE.matrix → black --------------------------------------------
function drawPayoff(ctx, lt, dur, t) {
  const x = beginLow();
  const { stop, sl } = warp(t);
  const cam = camAt('payoff', t);
  x.save();
  x.translate(Math.sin(t * 61) * shakeAt(t), Math.cos(t * 53) * shakeAt(t) * 0.6);
  applyCam(x, cam);
  x.drawImage(S.roofLate, -ART.OVER, -ART.OVER);
  // swarm fans in and levels pistols (SMIRK re-suited after the re-skin)
  const SWARM_X = VOLLEY.muzzleX;
  if (t >= PF.swarmIn) {
    for (let i = 0; i < 5; i++) {
      const R = i === 0 ? S.smirk : S.swarm[i - 1];
      const wU = E.outCubic(seg(t, PF.swarmIn + i * 0.04, PF.swarmIn + 0.34 + i * 0.04));
      const ax = lerp(SWARM_X[i] + 90, SWARM_X[i], wU);
      agent(x, R, ax, GROUND, {
        ...(wU < 0.95 ? walkCycle(t * 9 + i) : idle(t, 0.7)), flip: true, sx: 2, sy: 2,
      });
      if (t >= PF.swarmFire - 0.06) aimArm(x, R, ax, GROUND, { flip: true, sx: 2, sy: 2 }, VOLLEY.muzzleX[i], VOLLEY.muzzleY[i]);
    }
  }
  fireFx(x, PAYOFF_FIRE_EV, t, 0.1);
  // the volley: FAST crossing → frozen still life → the drop (world-g law, film resume)
  const gHere = warp(t).g;
  for (const b of VB) {
    const st = volleyBullet(b, t, gHere);
    if (!st) continue;
    if (st.landed) { // dead metallic tick: tiny ring + spent round
      const landT = FREEZES.volley.film1 + Math.sqrt(2 * (VOLLEY.floorY - b.hy) / VOLLEY.dropG);
      const age = t - landT;
      if (age >= 0) {
        if (age < 0.3) {
          x.strokeStyle = `rgba(180,255,205,${0.5 * (1 - age / 0.3)})`;
          x.lineWidth = 1.4;
          x.beginPath(); x.ellipse(st.x, VOLLEY.floorY, 3 + age * 30, 1.4 + age * 8, 0, 0, 7); x.stroke();
        }
        x.fillStyle = '#d8bc5a'; x.fillRect(st.x - 2, VOLLEY.floorY - 2, 4, 2);
      }
      continue;
    }
    if (st.frozen) {
      // QA I: near-still life with SHORT ribbons — full-length trails dragged the perceived
      // volley centroid up-right toward the muzzles, ~50 px off HIT.volleyCentroid
      ART.hairTrail(x, st.x, st.y, b.nx, b.ny, 34, 0.9, t * 0.4, b.seed);
      ART.bulletCore(x, st.x, st.y, 1, 1);
    } else {
      ART.bulletCore(x, st.x, st.y, 1, 1);
      x.strokeStyle = 'rgba(160,255,190,0.5)';
      x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(st.x, st.y); x.lineTo(st.x - b.nx * 30, st.y - b.ny * 30); x.stroke();
    }
  }
  // brass carpet
  for (const ev of BRASS_EV) {
    if (t < ev.g) continue;
    const k = Math.min(1, (t - ev.g) * 6);
    x.save();
    x.translate(ev.x, ev.y);
    x.rotate(1.1 + h2(ev.seed, 1, 47) * 2);
    x.fillStyle = '#8a7434';
    x.globalAlpha = k;
    x.fillRect(-2.4, -1, 4.8, 2);
    x.restore();
  }
  // FLOW: volley cracks → hand raise → walks THROUGH the hanging death → pluck → crouch → liftoff
  let fxx = 330, feet = GROUND, pose = idle(t, 0.7), rot = 0, alpha = 1, hairDown = 0, pluckWin = false, syv = 2;
  const hr = seg(t, PF.handRaise, PF.handRaise + 0.35);
  if (hr > 0) { // the hand rises in the dead air and STAYS up through the freeze
    pose = { lean: -0.06 * Math.min(1, hr), lift: [0, 0], stride: [0, 0] };
  }
  if (t >= FREEZES.volley.film0) { // ON FILM TIME: he walks through his own hanging death
    fxx = lerp(330, 430, seg(t, 85.15, 86.05));
    pose = t < 86.25 ? walkCycle(t * 3.4) : idle(t, 0.7);
    if (t >= 85.75 && t < 86.15) pluckWin = true; // the pluck arm draws after the body below
    const pb = pluckBulletPos(t); // the round: ride → spin away → rest on the roof as brass
    if (pb) {
      if (pb.rest) {
        x.fillStyle = 'rgba(0,0,0,0.4)';
        x.beginPath(); x.ellipse(pb.x + 0.5, pb.y + 1.4, 3.2, 1.1, 0, 0, 7); x.fill();
        x.fillStyle = '#8a7434'; x.fillRect(pb.x - 2.2, pb.y - 1, 4.4, 2);
        x.fillStyle = '#d8bc5a'; x.fillRect(pb.x - 2.2, pb.y - 1, 4.4, 0.9);
      } else if (pb.spin != null) {
        x.save();
        x.translate(pb.x, pb.y);
        x.rotate(pb.spin);
        x.fillStyle = '#eafff2'; x.fillRect(-3, -1.4, 6, 2.8);
        x.restore();
        ART.warmGlow(x, pb.x, pb.y, 8, 0.3, '160,255,190');
      } else ART.bulletCore(x, pb.x, pb.y, 1, 1);
    }
  }
  if (t >= PF.crouch && t < PF.liftoff) { // deep crouch, coat pooling — the body compresses
    pose = { lean: 0.1, lift: [0, 0], stride: [0, 0] };
    fxx = 430;
    syv = 2 - 0.34 * E.outCubic(seg(t, PF.crouch, PF.crouch + 0.35)); // readable anticipation
  }
  if (t >= PF.liftoff) { // he rockets up, hair streaming
    fxx = 430;
    const l1 = seg(t, PF.liftoff, PF.liftoff + 0.3);
    const l2 = seg(t, PF.liftoff + 0.3, 88.8);
    feet = GROUND - 40 * E.outQuad(l1) - 450 * l2 * l2;
    pose = { lean: 0, lift: [4, 4], stride: [0, 0] };
    hairDown = 1;
    if (t < PF.liftoff + 0.5) {
      ART.dustPlume(x, { g: PF.liftoff, x: 430, y: GROUND, seed: 31 }, t, 1.4, '140,160,135');
      x.save();
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const rr = 8 + (t - PF.liftoff) * 210;
        x.fillStyle = `rgba(160,255,190,${Math.max(0, 0.5 - (t - PF.liftoff))})`;
        x.fillRect(430 + Math.cos(a) * rr, GROUND - 8 + Math.sin(a) * rr * 0.4, 2.4, 2.4);
      }
      x.restore();
    }
  }
  // The raised arm draws AFTER the sprite (below) — behind the body it vanished entirely,
  // since the shoulder anchor sits inside his silhouette. Pluck window swaps it for the reach.
  if (feet > -70) {
    ART.shadow(x, fxx, GROUND, Math.max(8, 22 - (GROUND - feet) * 0.1), Math.max(0.05, 0.32 - (GROUND - feet) * 0.002));
    A.drawRemy(x, S.flow, fxx, feet, { ...pose, rot, sx: 2, sy: syv, alpha, glow: '#cfd6da', glowA: 0.12 });
    if (hairDown) { // hair streams straight down, coat lashing
      for (let i = 0; i < 3; i++) {
        x.strokeStyle = `rgba(178,186,196,${0.55 - i * 0.12})`;
        x.lineWidth = 2 - i * 0.4;
        const hy = feet - 200 + i * 4;
        x.beginPath();
        x.moveTo(fxx - 4 + i * 5, hy);
        x.quadraticCurveTo(fxx - 8 + i * 7 + Math.sin(t * 7 + i) * 5, hy + 46, fxx - 2 + i * 9, hy + 88 + i * 8);
        x.stroke();
      }
      coatFlare(x, fxx, feet - 60, 1, -1);
    }
  }
  // raised hand (from 84.84 it stays up through the freeze) and the pluck reach both draw
  // OVER the body — anchored at the shoulder inside his silhouette, behind it they never show
  if (pluckWin) {
    const sp = ART.rigPoint(S.flow, S.flow.cx + 12, S.flow.top + 70, fxx, feet, { ...pose, sx: 2, sy: 2 });
    ART.reachArm(x, sp[0], sp[1], HIT.pluck.x, HIT.pluck.y, { sleeve: FLOW_SLEEVE, skin: FLOW_SKIN, w: 7 });
  } else if (hr > 0.4) {
    const sp = ART.rigPoint(S.flow, S.flow.cx + 13, S.flow.top + 58, fxx, feet, { sx: 2, sy: 2 });
    const rise = 100 * Math.min(1, (hr - 0.4) / 0.6); // clears the hairline: palm reads above the flow
    ART.reachArm(x, sp[0], sp[1] + 14, sp[0] + 12, sp[1] - rise, { sleeve: FLOW_SLEEVE, skin: FLOW_SKIN, w: 9 });
    x.fillStyle = FLOW_SKIN; // palm-out: pad + three finger nubs read as a hand at stage scale
    x.beginPath(); x.arc(sp[0] + 12, sp[1] - rise, 4.2, 0, 7); x.fill();
    x.fillRect(sp[0] + 8.5, sp[1] - rise - 5, 2, 4); x.fillRect(sp[0] + 11.5, sp[1] - rise - 5.5, 2, 4.5);
    x.fillRect(sp[0] + 14.5, sp[1] - rise - 4.5, 2, 3.5);
  }
  // skyStreak: a rising streak with a green contrail
  if (t >= PF.skyStreak) {
    const k = 1 - seg(t, PF.skyStreak, PF.skyStreak + 1.6);
    x.save();
    x.globalCompositeOperation = 'lighter';
    const ggrad = x.createLinearGradient(0, 0, 0, 340);
    ggrad.addColorStop(0, `rgba(160,255,190,${0.5 * k})`);
    ggrad.addColorStop(1, 'rgba(160,255,190,0)');
    x.fillStyle = ggrad;
    fr(x, 428, -20, 5, 340);
    x.fillStyle = `rgba(234,255,242,${0.7 * k})`;
    x.fillRect(428, -10, 5, 40);
    x.restore();
  }
  x.restore();
  blit(ctx);
}

// ================================================ prepare =======================================
async function prepare() {
  // rigs + repaints
  S.flowClean = await A.loadRemy(IDS[ROLES.FLOW], false);
  S.flow = ART.repaintTrench(await A.loadRemy(IDS[ROLES.FLOW], false));
  S.mousse = ART.repaintMousse(await A.loadRemy(IDS[ROLES.MOUSSE_PHEUS], false), IDS[ROLES.MOUSSE_PHEUS]);
  S.trim = ART.repaintTrench(await A.loadRemy(IDS[ROLES.TRIMNITY], false));
  S.smirk = ART.repaintAgent(await A.loadRemy(IDS[ROLES.AGENT_SMIRK], false), { id: IDS[ROLES.AGENT_SMIRK] });
  S.smirkBare = ART.repaintAgent(await A.loadRemy(IDS[ROLES.AGENT_SMIRK], false), { shades: false, id: IDS[ROLES.AGENT_SMIRK] });
  S.swarm = [];
  // QA B: one uniform squad — same suit, same skin, shades + earpiece, no print/fringe remnants
  for (const id of IDS[ROLES.SWARM]) S.swarm.push(ART.repaintAgent(await A.loadRemy(id, false), { id, skin: '#685240' }));
  S.smirkDark = ART.darkRig(S.smirk, '#0a0c12');
  S.swarmDark = S.swarm.map((R) => ART.darkRig(R, '#0a0c12'));
  S.pax = S.swarm.map((R) => ART.darkRig(R, '#33453b')); // QA H: crowd silhouettes that read, not a black mass
  // head close-ups FROM THE RIG (repaint included), plus measured eyes for the eye push-in
  S.flowFace = ART.faceCrop(S.flow, 64); // head + chin: room for the eye-band source rect
  S.smirkFace = ART.faceCrop(S.smirk, 50);
  S.mousseFace = ART.faceCrop(S.mousse, 56);
  S.flowEyes = ART.measureEyes(S.flowClean, IDS[ROLES.FLOW]);
  S.flowFaceTop = S.flowClean.top; // faceCrop starts at rig row R.top — eye row needs the offset
  // sets
  ART.bakeGlyphs();
  S.strip = ART.bakeSkylineStrip();
  S.deck = ART.bakeDeck();
  S.terminal = ART.bakeTerminal();
  S.cubicle = ART.bakeCubicle();
  S.deskFront = ART.bakeDeskFront();
  S.underpass = ART.bakeUnderpass();
  S.construct = ART.bakeConstruct();
  S.podfarm = ART.bakePodfarm();
  { // QA C: the pod farm bake runs out of backdrop inside the frame (hard vertical seam at
    // the right edge, t 28.5-34 at CAM k>=1). Stamp the last painted column — flat sky /
    // backdrop / catwalk bands — across the full overscan width. Pure, deterministic.
    const pf = S.podfarm;
    if (pf.width < LW + 2 * ART.OVER) {
      const wide = A.canvas(LW + 2 * ART.OVER, pf.height);
      const wx = wide.getContext('2d');
      wx.imageSmoothingEnabled = false;
      wx.drawImage(pf, 0, 0);
      const sx = pf.width - 12;
      for (let cx = sx; cx < wide.width; cx++) wx.drawImage(pf, sx, 0, 1, pf.height, cx, 0, 1, pf.height);
      S.podfarm = wide;
    }
  }
  S.dojo = ART.bakeDojo();
  S.jump = ART.bakeJump(S.strip);
  S.roof = ART.bakeRoof(S.strip, false);
  S.roofLate = ART.bakeRoof(S.strip, true);
  S.lobby = ART.bakeLobby();
  S.lobbyDesk = ART.bakeLobbyDesk();
  S.subway = ART.bakeSubway();
  S.cart = A.canvas(220, 280); // cleared every cartwheel frame
  S.low = A.canvas(LW, LH);
}

// ---------- grades (restrained bloom ≤ ~0.14 on bright scenes, per GRADE bands) -----------------
const MATRIX_TINT = [0.78, 1.09, 0.9];
const baseFx = { letterbox: 0.8, vignette: 1.02, grain: 0.04, bloomThresh: 0.9, sat: 0.92 };
const FX = {
  terminal: () => ({ ...baseFx, tint: [0.6, 1.16, 0.78], bloom: 0.12, contrast: 1.08, vignette: 1.18 }),
  contact: () => ({ ...baseFx, tint: MATRIX_TINT, bloom: GRADE.matrix.bloom }),
  construct: (lt, t) => t < 28
    ? { ...baseFx, tint: [1.01, 1.03, 1.0], bloom: GRADE.construct.bloom, exposure: 0.1, sat: 0.96, vignette: 0.55, grain: 0.02 }
    : { ...baseFx, tint: [0.78, 0.94, 1.22], bloom: GRADE.real.bloom, sat: 0.9 },
  dojo: () => ({ ...baseFx, tint: MATRIX_TINT, bloom: GRADE.matrix.bloom }),
  jumpprog: () => ({ ...baseFx, tint: MATRIX_TINT, bloom: GRADE.matrix.bloom }),
  rooftense: () => ({ ...baseFx, tint: MATRIX_TINT, bloom: GRADE.matrix.bloom, grain: 0.05 }),
  bullettime: (lt, t) => {
    const frozen = t >= FREEZES.bullet.film0 && t < FREEZES.bullet.film1;
    return { ...baseFx, tint: MATRIX_TINT, bloom: frozen ? 0.12 : GRADE.matrix.bloom, sat: frozen ? 0.85 : 0.92 };
  },
  lobby: () => ({ ...baseFx, tint: MATRIX_TINT, bloom: GRADE.matrix.bloom }),
  subway: () => ({ ...baseFx, tint: MATRIX_TINT, bloom: GRADE.matrix.bloom }),
  payoff: (lt, t) => ({ ...baseFx, tint: MATRIX_TINT, bloom: GRADE.matrix.bloom, fade: seg(t, 91.0, 91.8) }),
};
const DRAW = {
  terminal: drawTerminal, contact: drawContact, construct: drawConstruct, dojo: drawDojo,
  jumpprog: drawJump, rooftense: drawRoofTense, bullettime: drawBullettime,
  lobby: drawLobby, subway: drawSubway, payoff: drawPayoff,
};

// Caption windows: the timeline's CAP_STYLES fades eat into the fully-visible window, so the
// four minHold cards get tightened in/out here (times/text/minHold untouched — same approach
// as hairpera's per-caption y override), noFollicle is flagged span (it rides the dojo→jump
// cut on purpose), and the global hold drops to 2.0s — every reading caption still holds
// ≥ 2.0s fully visible (whisper 2.0, noFollicle 2.0, believe 2.2, lobbyNarr 2.5, endCard 2.3).
const CAP_OVERRIDES = {
  titleCard: { in: 0.2, out: 0 },     // slam card: full 9.4→12.0 = 2.6 ≥ minHold 2.6
  hasYou: { out: 0.2 },               // full 17.4→19.6 = 2.2 ≥ minHold 2.2
  pillsLine: { in: 0.1, out: 0.1, style: 'pillsLine' }, // 2.4 ≥ minHold 2.4, retinted (QA: unreadable pale green on the white void)
  slate: { in: 0.1, out: 0.1 },       // full 89.9→91.7 = 1.8 ≥ minHold 1.8
  noFollicle: { span: true },         // comb line rides the cut into the jump program
  clippersLine: { y: 836 },           // 2nd line sat ~45 px over the letterbox — lift both lines clear
};
const CAPS_OUT = CAPS.map((c) => (CAP_OVERRIDES[c.id] ? { ...c, ...CAP_OVERRIDES[c.id] } : { ...c }));

export default {
  title: 'THE HAIRTRIX',
  output: 'hairtrix.mp4',
  duration: DURATION,
  fonts: [
    { family: 'Press Start 2P', url: new URL('../../node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2', import.meta.url).href },
    { family: 'Pixelify Sans', url: new URL('../../node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-400-normal.woff2', import.meta.url).href },
    { family: 'Pixelify Sans', url: new URL('../../node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-600-normal.woff2', import.meta.url).href, weight: '600' },
  ],
  prepare,
  shots: SHOTS.map((s2) => ({ name: s2.name, t0: s2.t0, t1: s2.t1, draw: DRAW[s2.name], fx: FX[s2.name] })),
  captions: CAPS_OUT,
  // captionStyles: CAP_STYLES + one colour-only retint (coordinator-sanctioned): the pills
  // line rode the shared 'dlg' pale green — invisible on the #f4f7f2 construct void. A dark
  // void-green with a pale shadow keeps the type spec (font/size/weight) and reads on white.
  captionStyles: {
    ...CAP_STYLES,
    pillsLine: { ...CAP_STYLES.dlg, color: '#1d3a28', shadow: '#e9eee6' },
  },
  flashes: FLASHES,
  score,
  grid: GRID,
  audio: { seed: 36036, reverb: 1.3, reverbShape: 2.6, reverbGain: 0.3, lufs: -14 }, // per score.js AUDIO_SUGGEST
  lint: { captionHold: 2.0, safe: { margin: 0.05, letterbox: true } },
};
