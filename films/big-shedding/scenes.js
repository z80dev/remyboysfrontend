// THE BIG SHEDDING — scenes. One draw function per act, all pure in (lt, t).
// City assembly is shared by street/trail; office and club are split into a
// baked bg + a desk/counter layer so actors can sit behind furniture.
import { E, hash, lerp, seg, txt } from "filmkit/lib.js";
import { drawRemy } from "../remy-bros/art.js";
import {
  ART,
  F,
  NEAR,
  PAL,
  blindsShadow,
  cone,
  dossier,
  drawHat,
  mist,
  neon,
  rain,
  razor,
  setClock,
  shadow,
  splashes,
  steam,
  wantedPoster,
} from "./art.js";
import { FIGHT, T, fightFilmT, heroX, warp } from "./timeline.js";

// small custom bounce for the poster drop (lib has no outBounce)
function outBounce(u) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (u < 1 / d1) return n1 * u * u;
  if (u < 2 / d1) {
    const a = u - 1.5 / d1;
    return n1 * a * a + 0.75;
  }
  if (u < 2.5 / d1) {
    const a = u - 2.25 / d1;
    return n1 * a * a + 0.9375;
  }
  const a = u - 2.625 / d1;
  return n1 * a * a + 0.984375;
}

// ── shared city painter ──────────────────────────────────────────────────────
// o: { pan, zoom, zcx, zcy, rainA, flash, tilt, decorate }
export function drawCity(x, t, o = {}) {
  const pan = o.pan || 0;
  const zoom = o.zoom || 1;
  const zcx = o.zcx ?? 960;
  const zcy = o.zcy ?? 620;
  x.save();
  if (o.tilt) {
    x.translate(960, 540);
    x.rotate(o.tilt);
    x.translate(-960, -540);
  }
  x.translate(zcx, zcy);
  x.scale(zoom, zoom);
  x.translate(-zcx, -zcy);
  // tile helper: two copies cover any pan we use (repeat starts past the frame)
  const tile = (img, off, y, w, h) => {
    x.drawImage(img, off, y, w, h);
    x.drawImage(img, off + w, y, w, h);
  };
  // sky + moon
  tile(ART.sky, -pan * 0.06 - 200, -40, 1920, 1080);
  // far skyline (parallax .22)
  tile(ART.far, -pan * 0.22 - 60, 330, 2300, 560);
  // mid row (parallax .5)
  tile(ART.mid, -pan * 0.5 - 80, 250, 2400, 720);
  // near street level (parallax 1) — blit so its road base meets 1080
  tile(ART.near, -pan, 300, 2400, 780);
  const gy = 300 + NEAR.groundY; // sidewalk line in screen space (860)
  // lamp cones + halos over the near layer
  for (const lx of NEAR.lamps) {
    const sx = lx - pan + 13;
    if (sx < -80 || sx > 2000) continue;
    cone(x, sx, 300 + 196, sx, gy + 40, 120, { a: 0.16, halo: 15 });
    // pool on the sidewalk
    x.save();
    x.globalCompositeOperation = "lighter";
    const g = x.createRadialGradient(sx, gy + 30, 4, sx, gy + 30, 120);
    g.addColorStop(0, "rgba(255,217,160,0.20)");
    g.addColorStop(1, "rgba(255,217,160,0)");
    x.fillStyle = g;
    x.beginPath();
    x.ellipse(sx, gy + 34, 120, 34, 0, 0, 7);
    x.fill();
    x.restore();
  }
  // neon signs on the near layer
  const barberSx = NEAR.barberX + 110 - pan;
  neon(x, "BARBER", barberSx, 300 + 250, {
    size: 54,
    seed: 9,
    glow: PAL.neonPink,
    color: "#ffe9ee",
    deadLetters: true,
  });
  const clubSx = NEAR.clubX + 150 - pan;
  const flick = Math.max(neonFlick(t, 21), 0.55);
  // vertical COMB CLUB sign beside the club door (letters stay on the facade)
  const letters = "COMB CLUB";
  for (let i = 0; i < letters.length; i++) {
    if (letters[i] === " ") continue;
    neon(x, letters[i], clubSx, 300 + 128 + i * 46, {
      size: 34,
      seed: 21 + i,
      glow: PAL.neonCyan,
      color: "#eafcff",
      alpha: flick,
    });
  }
  // sign frame
  x.save();
  x.globalAlpha = flick * 0.8;
  x.strokeStyle = "rgba(90,232,255,0.5)";
  x.lineWidth = 3;
  x.strokeRect(clubSx - 30, 300 + 110, 60, letters.length * 46);
  x.restore();
  // awning downlight over the club door
  cone(x, clubSx - 110, 300 + 250, clubSx - 110, gy, 70, { color: PAL.neonCyan, a: 0.08, halo: 10 });
  // steam grate
  steam(x, t, NEAR.grateX - pan, gy + 16, { n: 5, rise: 200, r0: 14, grow: 60 });
  // wet reflections: vertical smears under neon + lamps
  x.save();
  x.globalCompositeOperation = "lighter";
  for (const [rx, col, w2] of [
    [barberSx, "rgba(255,90,122,0.5)", 26],
    [clubSx, "rgba(89,232,255,0.5)", 30],
    ...NEAR.lamps.map((lx) => [lx - pan + 13, "rgba(255,217,160,0.4)", 22]),
  ]) {
    if (rx < -60 || rx > 1980) continue;
    const g = x.createLinearGradient(0, gy, 0, 1080);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    for (let k = 0; k < 3; k++) {
      const wob = Math.sin(t * 1.3 + k * 2 + rx) * 5;
      x.fillRect(rx - w2 / 2 + k * 8 - 8 + wob, gy + 10, w2, 200);
    }
  }
  x.restore();
  // ground splash rings
  splashes(x, t, gy + 40, { w: 1920 * zoom });
  splashes(x, t, gy + 150, { w: 1920 * zoom, n: 18 });
  // scene-specific world-anchored dressing (still inside the transform)
  if (o.decorate) o.decorate(x, pan);
  x.restore(); // end world transform
  // rain is camera-space
  rain(x, t, { alpha: o.rainA ?? 1, drift: pan * 0.4 });
  // mist drifting at street level
  mist(x, t, 950, 31);
  // lightning: brief cold wash + window pop
  if (o.flash > 0) {
    x.save();
    x.globalCompositeOperation = "lighter";
    x.fillStyle = `rgba(150,180,235,${0.35 * o.flash})`;
    x.fillRect(0, 0, 1920, 1080);
    x.restore();
  }
}
function neonFlick(t, seed) {
  const b = hash(seed + Math.floor(t * 22));
  return b < 0.05 ? 0.2 : 0.85 + 0.15 * Math.sin(t * 30 + seed);
}

// neon comb glyph: glowing spine + teeth (pink)
function drawNeonComb(x, cx, cy, alpha) {
  x.save();
  x.globalCompositeOperation = "lighter";
  x.globalAlpha = Math.max(0, Math.min(1, alpha));
  x.strokeStyle = PAL.neonPink;
  x.shadowColor = PAL.neonPink;
  x.lineCap = "round";
  // spine
  x.shadowBlur = 34;
  x.lineWidth = 9;
  x.beginPath();
  x.moveTo(cx - 60, cy + 44);
  x.lineTo(cx + 60, cy + 44);
  x.stroke();
  // teeth
  x.lineWidth = 7;
  for (let i = 0; i < 7; i++) {
    const tx = cx - 52 + i * 17.4;
    x.beginPath();
    x.moveTo(tx, cy + 40);
    x.lineTo(tx, cy - 44);
    x.stroke();
  }
  x.restore();
}

// tinted/rim-lit silhouette draw (doorway figures) — halo outline keeps the
// figure readable against near-black backgrounds
function silhou(x, R, px, feet, o = {}) {
  const sy = o.sy ?? 2.2;
  // glow halo behind the figure (the only thing that survives the tint overlay)
  if (o.glow !== false)
    drawRemy(x, R, px, feet, { sy, flip: o.flip, white: true, glow: o.glow ?? "#4665b4", glowA: o.glowA ?? 0.5 });
  const c = scratch();
  const sc = c.getContext("2d");
  sc.clearRect(0, 0, c.width, c.height);
  drawRemy(sc, R, c.width / 2, c.height - 10, { sy, flip: o.flip });
  // tint
  sc.globalCompositeOperation = "source-atop";
  sc.fillStyle = o.tint || "#0b1120";
  sc.fillRect(0, 0, c.width, c.height);
  x.save();
  x.globalAlpha = o.a ?? 1;
  x.drawImage(c, px - c.width / 2, feet - c.height + 10);
  x.restore();
  // rim light on the left edge (doorway light side)
  if (o.rim) {
    const rc = scratch2();
    const r2 = rc.getContext("2d");
    r2.clearRect(0, 0, rc.width, rc.height);
    drawRemy(r2, R, rc.width / 2, rc.height - 10, { sy, flip: o.flip, white: true });
    r2.globalCompositeOperation = "source-in";
    const g = r2.createLinearGradient(rc.width / 2 - 60, 0, rc.width / 2 + 30, 0);
    g.addColorStop(0, o.rim);
    g.addColorStop(1, "rgba(0,0,0,0)");
    r2.fillStyle = g;
    r2.fillRect(0, 0, rc.width, rc.height);
    x.save();
    x.globalAlpha = (o.a ?? 1) * (o.rimA ?? 0.5);
    x.drawImage(rc, px - rc.width / 2 - 4, feet - rc.height + 10);
    x.restore();
  }
}
const _sc = [null, null];
function scratch() {
  if (!_sc[0]) {
    _sc[0] = document.createElement("canvas");
    _sc[0].width = 460;
    _sc[0].height = 560;
  }
  return _sc[0];
}
function scratch2() {
  if (!_sc[1]) {
    _sc[1] = document.createElement("canvas");
    _sc[1].width = 460;
    _sc[1].height = 560;
  }
  return _sc[1];
}

// actor with contact shadow + optional hat. o extends drawRemy opts + { hat, hatS }
export function actor(x, R, px, feet, o = {}) {
  const sy = o.sy ?? 2.2;
  if (o.shadow !== false) shadow(x, px, feet + 2, (o.sw ?? 52) * (sy / 2.2), o.shA ?? 0.42);
  drawRemy(x, R, px, feet, o);
  if (o.hat) {
    const h = (R.bottom - R.top + 1) * sy;
    const hx = px + (o.flip ? 8 : -8);
    drawHat(x, hx, feet - h * 0.845, (o.hatS ?? 1) * (sy / 2.2), { rot: o.hatRot ?? 0, band: PAL.red });
  }
}

// ceiling fan with a faint window backlight so the blades read
function fan(x, t, cx, cy, o = {}) {
  x.save();
  x.globalCompositeOperation = "lighter";
  const bl = x.createRadialGradient(cx, cy - 30, 4, cx, cy - 30, 150);
  bl.addColorStop(0, "rgba(110,130,180,0.10)");
  bl.addColorStop(1, "rgba(110,130,180,0)");
  x.fillStyle = bl;
  x.fillRect(cx - 150, cy - 180, 300, 300);
  x.restore();
  x.save();
  x.translate(cx, cy);
  x.fillStyle = "rgba(8,12,22,0.95)";
  x.fillRect(-3, -90, 6, 84);
  const blur = o.blur ?? 0.55;
  x.globalAlpha = 0.9;
  for (let b = 0; b < 4; b++) {
    const a = t * (o.speed ?? 9) + (b * Math.PI) / 2;
    x.save();
    x.rotate(a);
    const g = x.createLinearGradient(0, 0, 96, 0);
    g.addColorStop(0, "rgba(24,30,50,0.95)");
    g.addColorStop(0.75, "rgba(30,38,60,0.55)");
    g.addColorStop(1, "rgba(120,140,190,0.35)");
    x.fillStyle = g;
    x.beginPath();
    x.ellipse(48, 0, 48, 11, 0, 0, 7);
    x.fill();
    x.restore();
  }
  x.fillStyle = "#1a2136";
  x.beginPath();
  x.arc(0, 0, 9, 0, 7);
  x.fill();
  x.restore();
}

// ── ACT I — street cold open ─────────────────────────────────────────────────
export function drawStreet(x, lt, t) {
  setClock(t);
  const zoom = lerp(1.0, 1.09, E.outCubic(seg(lt, 0.5, 9.5)));
  const pan = 180 + lt * 14;
  // triple-strobe lightning so a random frame near 8 s still catches it
  const flash = Math.max(flashPulse(t, 7.55, 0.4), flashPulse(t, 7.75, 0.4), flashPulse(t, 7.95, 0.5));
  // the wanted poster under the second lamp — world-anchored so the push-in
  // keeps it glued to the lamp
  drawCity(x, t, {
    pan,
    zoom,
    zcx: 760,
    zcy: 700,
    flash,
    decorate: (xc, panD) => {
      const lampX = NEAR.lamps[1] - panD + 13;
      if (lampX < -140 || lampX > 2060) return;
      const drop = outBounce(seg(lt, T.poster - T.street, T.poster - T.street + 0.9));
      const sway = Math.sin((lt - 0.6) * 2.1) * 0.05 * seg(lt, T.poster - T.street + 0.9, T.poster - T.street + 4);
      const py = lerp(-820, 0, drop);
      xc.save();
      xc.translate(lampX + 86, 560 + py);
      xc.rotate(sway + 0.03);
      xc.drawImage(wantedPoster(), -62, -165);
      // tape strip
      xc.fillStyle = "rgba(240,235,210,0.75)";
      xc.fillRect(-30, -170, 60, 16);
      xc.restore();
      // a cone catches the poster
      cone(xc, lampX, 496, lampX + 70, 640, 90, { a: 0.12, halo: 12 });
    },
  });
}

// ── ACT II — the office ──────────────────────────────────────────────────────
export function drawOffice(x, lt, t) {
  setClock(t);
  const { bg, desk } = ART.office;
  // lightning through the window when the client arrives (double strike)
  const fl =
    flashPulse(t, T.client, 0.8) + flashPulse(t, T.client + 0.28, 0.4) + 0.8 * flashPulse(t, T.client + 0.9, 0.5);
  x.drawImage(bg, 0, 0);
  if (fl > 0) {
    x.save();
    x.globalCompositeOperation = "lighter";
    x.fillStyle = `rgba(150,180,235,${0.22 * Math.min(1.2, fl)})`;
    x.fillRect(1150, 150, 560, 470);
    x.fillStyle = `rgba(120,150,210,${0.1 * Math.min(1.2, fl)})`;
    x.fillRect(0, 0, 1920, 1080);
    x.restore();
  }
  fan(x, t, 640, 148, { speed: 8 });
  // rain on the window glass (clipped)
  x.save();
  x.beginPath();
  x.rect(1150, 150, 560, 470);
  x.clip();
  rain(x, t, { layers: [{ n: 34, sp: 160, len: 20, a: 0.12, w: 1.4 }], slant: -0.05 });
  x.restore();
  // hero seated behind the desk; two-phase exit: rises IN PLACE (still behind
  // the desk, head climbing into view), then steps left out from behind it
  const rise = E.outCubic(seg(lt, T.standUp - T.office, T.standUp - T.office + 0.7));
  const step = E.outCubic(seg(lt, T.standUp - T.office + 0.6, T.standUp - T.office + 1.9));
  const feetY = lerp(930, 950, rise);
  const sy = lerp(2.05, 2.35, rise);
  const heroX2 = lerp(870, 540, step);
  const walkC = step * 7.5;
  actor(x, ART.hero, heroX2, feetY, {
    sy,
    lean: 0.02 + step * 0.04,
    lift: [Math.max(0, Math.sin(walkC)) * 4 * step, Math.max(0, Math.sin(walkC + Math.PI)) * 4 * step],
    stride: [Math.sin(walkC) * 6 * step, Math.sin(walkC + Math.PI) * 6 * step],
    sw: 46,
    glow: "#8fa6d8",
    glowA: 0.2,
    hat: lt > T.standUp - T.office + 0.9,
    hatS: 1,
    hatRot: -0.06,
  });
  x.drawImage(desk, 0, 0);
  // desk lamp pool (over desk + hero's chest)
  const lampFl = 0.9 + 0.1 * Math.sin(t * 31) * (hash(Math.floor(t * 24)) > 0.93 ? 1 : 0);
  cone(x, 1200, 714, 1080, 830, 170, { a: 0.36 * lampFl, halo: 22 });
  // bulb through the green shade
  x.save();
  x.globalCompositeOperation = "lighter";
  const bulb = x.createRadialGradient(1200, 716, 2, 1200, 716, 46);
  bulb.addColorStop(0, `rgba(255,246,214,${0.75 * lampFl})`);
  bulb.addColorStop(1, "rgba(255,246,214,0)");
  x.fillStyle = bulb;
  x.beginPath();
  x.arc(1200, 716, 46, 0, 7);
  x.fill();
  const pool = x.createRadialGradient(1080, 812, 10, 1080, 812, 260);
  pool.addColorStop(0, `rgba(255,217,160,${0.22 * lampFl})`);
  pool.addColorStop(1, "rgba(255,217,160,0)");
  x.fillStyle = pool;
  x.beginPath();
  x.ellipse(1080, 814, 270, 88, 0, 0, 7);
  x.fill();
  x.restore();
  steam(x, t, 1013, 788, { n: 3, rise: 90, r0: 6, grow: 16 });
  // mug glow
  x.fillStyle = "rgba(255,220,170,0.5)";
  x.fillRect(1002, 789, 22, 4);
  // venetian blind bands fall from the window across the room
  blindsShadow(x, t, { cx: 1430, cy: 380, tilt: 0.34, a: 0.34 });
  // the client: doorway glow → silhouette → portrait card
  const since = lt - (T.client - T.office);
  if (since >= 0) {
    const enter = seg(since, 0, 1.0);
    const glowA = 0.6 + 0.4 * Math.sin(t * 2) * 0.2;
    x.save();
    x.globalCompositeOperation = "lighter";
    const dg = x.createLinearGradient(0, 160, 0, 900);
    const dc = `rgba(214,226,255,${0.7 * glowA * E.outCubic(enter)})`;
    dg.addColorStop(0, dc);
    dg.addColorStop(1, "rgba(214,226,255,0)");
    x.fillStyle = dg;
    x.fillRect(0, 150, 190, 760);
    x.restore();
    if (enter > 0.02)
      silhou(x, ART.midnight, 118, 906, {
        sy: 2.9,
        tint: "#131e36",
        rim: "rgba(200,215,255,0.95)",
        rimA: 0.95 * enter,
      });
  }
  const sinceReveal = lt - (T.reveal - T.office);
  if (sinceReveal >= 0) {
    // her portrait card slides across the desk and settles upright on it
    const slide = E.outCubic(seg(sinceReveal, 0, 0.8));
    const settle = springSettle(sinceReveal);
    x.save();
    x.translate(lerp(1750, 1210, slide), lerp(420, 708, slide) + settle * 6);
    x.rotate(lerp(0.5, -0.02, slide));
    x.globalAlpha = Math.min(1, sinceReveal * 3);
    x.shadowColor = "rgba(0,0,0,0.55)";
    x.shadowBlur = 26;
    x.shadowOffsetY = 12;
    x.drawImage(ART.cardMid, -105, -124, 210, 210);
    x.restore();
  }
  // dossier slides onto the left of the desk (clear of the hero's face)
  const sinceFile = lt - (T.caseFile - T.office);
  if (sinceFile >= 0) {
    const slide = E.outCubic(seg(sinceFile, 0, 0.7));
    x.save();
    x.translate(lerp(1560, 800, slide), lerp(430, 768, slide) + Math.sin(t * 1.1) * 1.5);
    x.rotate(lerp(0.22, -0.06, slide) + 0.012 * Math.sin(t * 0.9));
    x.drawImage(dossier(), -140, -105, 280, 210);
    x.restore();
  }
}

// ── ACT III — the trail ──────────────────────────────────────────────────────
export function drawTrail(x, lt, t) {
  setClock(t);
  // sub-beats: walk (0–2.6) → clue macro (2.6–5.6) → witness card (5.6–9.4) → goons (9.4–12.2) → sign (12.2–14)
  // each sub-beat change dips through black (a noir blink between leads)
  const b = lt;
  if (b < 2.6) {
    // wide walk: camera tracks the hero; city pans left
    const pan = 380 + lt * 30;
    drawCity(x, t, { pan, zoom: 1.04, zcx: 980, zcy: 720 });
    const walk = lt * 4.4;
    actor(x, ART.hero, 900, 872, {
      sy: 2.3,
      flip: true,
      lean: 0.05,
      lift: [Math.max(0, Math.sin(walk)) * 5, Math.max(0, Math.sin(walk + Math.PI)) * 5],
      stride: [Math.sin(walk) * 7, Math.sin(walk + Math.PI) * 7],
      hat: true,
      hatRot: 0.05,
    });
    dip(x, b, 2.35, 2.6, true);
  } else if (b < 5.6) {
    // macro: the strand on the wet slab
    const push = E.outCubic(seg(b, 2.6, 3.4));
    const z = lerp(1.0, 2.4, push);
    x.save();
    x.translate(960, 620);
    x.scale(z, z);
    x.translate(-1150, -880);
    // slab + grime + wet sheen
    x.fillStyle = "#141c30";
    x.fillRect(400, 700, 1500, 400);
    x.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 26; i++) x.fillRect(430 + hash(i) * 1400, 720 + hash(i + 40) * 340, 3, 3);
    // diagonal wet sheen streaks
    for (let s = 0; s < 3; s++) {
      const sg = x.createLinearGradient(700 + s * 260, 700, 980 + s * 260, 1100);
      sg.addColorStop(0, "rgba(140,165,215,0)");
      sg.addColorStop(0.5, "rgba(140,165,215,0.06)");
      sg.addColorStop(1, "rgba(140,165,215,0)");
      x.fillStyle = sg;
      x.fillRect(700 + s * 260, 700, 280, 400);
    }
    // dark puddle pools
    x.fillStyle = "rgba(8,12,24,0.7)";
    x.beginPath();
    x.ellipse(1010, 1000, 130, 34, 0, 0, 7);
    x.fill();
    x.beginPath();
    x.ellipse(1290, 940, 90, 22, 0, 0, 7);
    x.fill();
    // THE strand: amber, glowing, pulsing
    const pulse = 0.75 + 0.25 * Math.sin(t * 5);
    x.save();
    x.globalCompositeOperation = "lighter";
    const g = x.createRadialGradient(1120, 880, 6, 1120, 880, 170 * pulse);
    g.addColorStop(0, `rgba(255,170,60,${0.42 * pulse})`);
    g.addColorStop(1, "rgba(255,170,60,0)");
    x.fillStyle = g;
    x.fillRect(950, 700, 400, 400);
    x.restore();
    x.strokeStyle = `rgba(255,180,80,${0.95 * pulse})`;
    x.lineWidth = 4;
    x.lineCap = "round";
    x.beginPath();
    x.moveTo(1090, 950);
    x.bezierCurveTo(1120, 900, 1090, 870, 1130, 830);
    x.bezierCurveTo(1150, 808, 1170, 820, 1188, 800);
    x.stroke();
    x.strokeStyle = `rgba(255,225,160,${0.9 * pulse})`;
    x.lineWidth = 1.6;
    x.beginPath();
    x.moveTo(1090, 950);
    x.bezierCurveTo(1120, 900, 1090, 870, 1130, 830);
    x.bezierCurveTo(1150, 808, 1170, 820, 1188, 800);
    x.stroke();
    x.restore();
    // rain bokeh — big soft drops, camera space
    x.save();
    x.globalCompositeOperation = "screen";
    for (let i = 0; i < 12; i++) {
      const ph = (t * 0.55 + hash(i + 500)) % 1;
      const rr = 10 + hash(i + 510) * 16;
      const gx2 = hash(i + 520) * 1920;
      const gy2 = ((hash(i + 530) * 1400 + ph * 400) % 1400) - 160;
      const g = x.createRadialGradient(gx2, gy2, 1, gx2, gy2, rr);
      g.addColorStop(0, `rgba(190,205,240,${0.1 * (1 - ph)})`);
      g.addColorStop(1, "rgba(190,205,240,0)");
      x.fillStyle = g;
      x.beginPath();
      x.arc(gx2, gy2, rr, 0, 7);
      x.fill();
    }
    x.restore();
    dip(x, b, 2.6, 2.9, false); // blink in from the walk
    dip(x, b, 5.35, 5.6, true); // blink out to the witness
  } else if (b < 9.4) {
    // witness flash-card: dark scrim, portrait, mono nameplate
    drawCity(x, t, { pan: 660, zoom: 1.02, rainA: 0.4 });
    x.fillStyle = "rgba(4,6,14,0.78)";
    x.fillRect(0, 0, 1920, 1080);
    const inS = E.outCubic(seg(b, 5.6, 6.3));
    const outS = seg(b, 9.0, 9.4);
    x.save();
    x.globalAlpha = inS * (1 - outS);
    x.translate(lerp(-500, 640, inS), 512 + Math.sin(t) * 2);
    x.rotate(-0.03);
    x.shadowColor = "rgba(0,0,0,0.6)";
    x.shadowBlur = 30;
    x.shadowOffsetX = 0;
    x.shadowOffsetY = 14;
    x.drawImage(ART.cardWit, -160, -200, 320, 320);
    x.restore();
    x.save();
    x.globalAlpha = inS * (1 - outS);
    const nm = "ST. FOLLICLE\u2019S \u2014 NIGHT ORDERLY";
    txt(x, nm, 640, 748, { size: 22, font: F.mono, weight: 600, color: "#c8d4ee", align: "center", track: 4 });
    x.restore();
    dip(x, b, 5.6, 5.9, false); // blink in
  } else if (b < 12.2) {
    // the goons in the club doorway: cyan spill, ember glow, rim light, slow push
    const push = lerp(1.02, 1.14, E.outCubic(seg(b, 9.4, 12.2)));
    drawCity(x, t, { pan: 910, zoom: push, zcx: 760, zcy: 640, rainA: 0.85 });
    // cool spill from the club door behind them (broad, backs the whole figure)
    x.save();
    x.globalCompositeOperation = "lighter";
    const sp = x.createRadialGradient(672, 700, 6, 672, 700, 270);
    sp.addColorStop(0, "rgba(89,232,255,0.18)");
    sp.addColorStop(1, "rgba(89,232,255,0)");
    x.fillStyle = sp;
    x.fillRect(402, 430, 540, 540);
    x.restore();
    silhou(x, ART.goonA, 640, 856, {
      sy: 2.15,
      tint: "#22314f",
      glow: "#b06a3a",
      glowA: 0.55,
      rim: "rgba(255,150,70,0.85)",
      rimA: 1.0,
    });
    silhou(x, ART.goonB, 712, 856, {
      sy: 2.05,
      tint: "#22314f",
      glow: "#4665b4",
      glowA: 0.55,
      rim: "rgba(120,160,230,0.75)",
      rimA: 0.9,
    });
    // cigarette ember at goon A's head + a thin smoke wisp
    const ember = 0.5 + 0.5 * Math.sin(t * 2.4);
    x.save();
    x.globalCompositeOperation = "lighter";
    const eg = x.createRadialGradient(614, 612, 1, 614, 612, 20);
    eg.addColorStop(0, `rgba(255,140,60,${0.6 + 0.3 * ember})`);
    eg.addColorStop(1, "rgba(255,120,40,0)");
    x.fillStyle = eg;
    x.beginPath();
    x.arc(614, 612, 20, 0, 7);
    x.fill();
    x.restore();
    steam(x, t, 614, 604, { n: 2, rise: 90, r0: 3, grow: 10, drift: 8 });
  } else {
    // glide from the goon doorway to the club marquee, then tilt up to the sign
    const rise = E.outCubic(seg(b, 12.6, 13.6));
    const glide = E.outCubic(seg(b, 12.2, 12.7));
    const zoom = lerp(1.1, 1.35, rise);
    drawCity(x, t, {
      pan: lerp(910, 480, glide),
      zoom: lerp(1.1, 1.1, glide) * zoom,
      zcx: 830,
      zcy: lerp(760, 560, rise),
      rainA: 0.9,
      tilt: -0.04,
      // marquee bulbs chase along the club awning (world 1258–1666)
      decorate: (xc, pan) => {
        xc.save();
        xc.globalCompositeOperation = "lighter";
        for (let i = 0; i < 14; i++) {
          const on = Math.floor(t * 6) % 2 === i % 2;
          const bx = 1266 - pan + 20 + i * 28;
          const by = 300 + 216 + Math.sin(i * 0.9) * 4;
          const g = xc.createRadialGradient(bx, by, 1, bx, by, 13);
          g.addColorStop(0, on ? "rgba(255,220,150,0.95)" : "rgba(120,110,90,0.4)");
          g.addColorStop(1, "rgba(255,220,150,0)");
          xc.fillStyle = g;
          xc.beginPath();
          xc.arc(bx, by, 13, 0, 7);
          xc.fill();
        }
        xc.restore();
      },
    });
  }
}

// ── ACT IV — the club ────────────────────────────────────────────────────────
export function drawClub(x, lt, t) {
  setClock(t);
  const dutch = -0.035 * seg(lt, 0, 1.2) + 0.035 * seg(lt, T.stare - T.club, T.stare - T.club + 1.2);
  // during the standoff the room drops away: bulbs + sign dim
  const stare = seg(lt, T.stare - T.club - 1, T.stare - T.club);
  const dim = 1 - 0.55 * stare;
  x.save();
  x.translate(960, 540);
  x.rotate(dutch);
  x.translate(-960, -540);
  x.drawImage(ART.club, 0, 0);
  // back-wall neon: a glowing comb + the name (buzz but never fully dead)
  drawNeonComb(x, 560, 300, Math.max(neonFlick(t, 41), 0.55));
  neon(x, "THE COMB CLUB", 960, 320, {
    size: 92,
    seed: 42,
    glow: PAL.neonPink,
    color: "#ffe9ee",
    alpha: Math.max(neonFlick(t, 42), 0.6) * dim,
  });
  // string bulbs along the ceiling wire
  x.save();
  x.globalCompositeOperation = "lighter";
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const bx = 1920 * u;
    const by = 100 + Math.sin(u * Math.PI * 2) * 18;
    const on = (0.8 + 0.2 * Math.sin(t * 3 + i)) * dim;
    const g = x.createRadialGradient(bx, by, 1, bx, by, 20);
    g.addColorStop(0, `rgba(255,214,150,${0.7 * on})`);
    g.addColorStop(1, "rgba(255,214,150,0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(bx, by, 20, 0, 7);
    x.fill();
  }
  x.restore();
  // haze in the room
  mist(x, t, 700, 77, { a: 0.8, r: 500 });
  // the Baron + goons in the spot (from T.baron)
  const since = lt - (T.baron - T.club);
  // the spot FADES UP over ~0.5s: the Baron stands in the dark before it finds him
  const spotOn = since >= 0 ? E.outCubic(seg(since, 0, 0.5)) : 0;
  {
    // swing the bulb a touch during the stare
    const sway = Math.sin((lt - (T.stare - T.club)) * 1.1) * 34 * seg(lt, T.stare - T.club - 1, T.stare - T.club + 1);
    cone(x, 960 + sway, 150, 960, 902, 210, { color: "#ffd9a0", a: 0.1 + 0.14 * spotOn, halo: 20 });
    if (since < 0) {
      // goons walk in from the wings; the Baron already waits center-stage, unlit
      const walkIn = E.outCubic(seg(lt, 0.2, 2.0));
      actor(x, ART.goonA, lerp(360, 700, walkIn), 884, {
        sy: 1.95,
        flip: false,
        lean: -0.02,
        sw: 44,
        shA: 0.5,
        glow: "#4665b4",
        glowA: 0.3,
      });
      actor(x, ART.goonB, lerp(1560, 1230, walkIn), 884, {
        sy: 1.95,
        flip: true,
        lean: 0.02,
        sw: 44,
        shA: 0.5,
        glow: "#4665b4",
        glowA: 0.3,
      });
    } else {
      // goons flank
      actor(x, ART.goonA, 700, 884, { sy: 1.95, flip: false, lean: -0.02, sw: 44, shA: 0.5 });
      actor(x, ART.goonB, 1230, 884, { sy: 1.95, flip: true, lean: 0.02, sw: 44, shA: 0.5 });
    }
    // the Baron (scalp glint sweeps across his head once lit)
    actor(x, ART.baron, 960, 902, {
      sy: 2.35,
      flip: false,
      lean: 0,
      sw: 56,
      shA: 0.55,
      alpha: lerp(0.42, 1, spotOn),
    });
    if (spotOn > 0.5) {
      const headY = 902 - 116 * 2.35 * 0.86;
      const glint = seg((t * 0.35) % 1, 0.2, 0.5);
      x.save();
      x.globalCompositeOperation = "lighter";
      const gx = lerp(936, 984, glint);
      const gg = x.createRadialGradient(gx, headY, 1, gx, headY, 14);
      gg.addColorStop(0, "rgba(255,250,220,0.55)");
      gg.addColorStop(1, "rgba(255,250,220,0)");
      x.fillStyle = gg;
      x.beginPath();
      x.arc(gx, headY, 14, 0, 7);
      x.fill();
      x.restore();
    }
    // the razor rises behind his shoulder (from T.razorUp)
    const rz = lt - (T.razorUp - T.club);
    if (rz >= 0) {
      const up = E.outCubic(seg(rz, 0, 1.1));
      x.save();
      x.translate(1040, lerp(880, 600, up));
      x.rotate(lerp(-1.05, -1.5, up));
      x.scale(1.3, 1.3);
      x.drawImage(razor(), -30, -75);
      // one bright pulse along the edge as it locks vertical
      x.globalCompositeOperation = "lighter";
      const pulse = 1 - Math.min(1, Math.abs(seg(rz, 1.0, 1.3) - 0.5) * 2);
      x.globalAlpha = 0.7 * pulse;
      x.drawImage(razor(), -30, -75);
      x.restore();
    }
  }
  // hero enters the doorway light (from T.heroEnter)
  const he = lt - (T.heroEnter - T.club);
  if (he >= 0) {
    const step = E.outCubic(seg(he, 0, 1.4));
    // doorway glow at left
    x.save();
    x.globalCompositeOperation = "lighter";
    const dg = x.createLinearGradient(0, 0, 380, 0);
    dg.addColorStop(0, "rgba(214,226,255,0.7)");
    dg.addColorStop(1, "rgba(214,226,255,0)");
    x.fillStyle = dg;
    x.fillRect(0, 200, 380, 700);
    x.restore();
    const px = lerp(150, 360, step);
    const lit = seg(he, 0.7, 1.4);
    if (lit < 1)
      silhou(x, ART.hero, px, 898, { sy: 2.25, flip: false, rim: "rgba(200,215,255,0.9)", rimA: 0.6, tint: "#0a101e" });
    else actor(x, ART.hero, px, 898, { sy: 2.25, flip: false, lean: 0.03, hat: true, hatRot: -0.05, sw: 50 });
  }
  // grade: crush the room a touch
  x.save();
  x.globalCompositeOperation = "multiply";
  const vg = x.createRadialGradient(960, 540, 380, 960, 540, 1150);
  vg.addColorStop(0, "rgba(255,255,255,1)");
  vg.addColorStop(1, "rgba(30,20,40,1)");
  x.fillStyle = vg;
  x.fillRect(-100, -100, 2120, 1280);
  x.restore();
  x.restore(); // end dutch
}

// ── ACT V — the fight ────────────────────────────────────────────────────────
export function drawFight(x, lt, t) {
  setClock(t);
  _t = t;
  const g = warp(lt);
  // camera shake on the three hits (real time, absolute)
  const shake =
    shakePulse(t, fightFilmT(FIGHT.hitA), 0.5) * 9 +
    shakePulse(t, fightFilmT(FIGHT.hitB), 0.5) * 11 +
    shakePulse(t, fightFilmT(FIGHT.clash), 0.7) * 13;
  const sx = Math.sin(t * 89) * shake;
  const sy2 = Math.cos(t * 97) * shake * 0.7;
  x.save();
  x.translate(sx, sy2);
  // room (level, brighter for action readability)
  x.drawImage(ART.club, 0, 0);
  neon(x, "THE COMB CLUB", 960, 320, {
    size: 92,
    seed: 42,
    glow: PAL.neonPink,
    color: "#ffe9ee",
    alpha: Math.max(neonFlick(t, 42), 0.6),
  });
  drawNeonComb(x, 560, 300, Math.max(neonFlick(t, 41), 0.55));
  // house lights come up at the end
  const lights = seg(g, FIGHT.lightsOn, FIGHT.lightsOn + 0.5);
  const flick = lights > 0 && lights < 1 ? hash(Math.floor(t * 30)) > 0.4 : true;
  const amb = flick ? lights : lights * 0.3;
  // soft radial pools instead of hard cones (no ghost wedges)
  pool(x, 660, 900, 240, 0.1 + 0.08 * amb);
  pool(x, 1270, 900, 240, 0.1 + 0.08 * amb);
  if (amb > 0) pool(x, 960, 900, 330, 0.13 * amb);
  mist(x, t, 700, 91, { a: 0.8, r: 520 });
  // two bottles on the counter, waiting to burst at hitB
  if (g < FIGHT.hitB) {
    bottle(x, 524, 642, 1);
    bottle(x, 560, 646, 0.85);
  }
  // ── actors (all analytic in g) ──
  // goon A: advances, swings, is parried off right at hitA
  const gA = { x: 0, feet: 884, rot: 0, alpha: 1 };
  if (g < FIGHT.swingA) {
    const adv = E.outCubic(seg(g, FIGHT.goonsAdvance, FIGHT.swingA - 0.3));
    gA.x = lerp(1520, 1280, adv);
  } else if (g < FIGHT.hitA) {
    gA.x = lerp(1280, heroX(g) + 150, E.outCubic(seg(g, FIGHT.swingA, FIGHT.hitA)));
    gA.rot = lerp(0, -0.5, seg(g, FIGHT.swingA, FIGHT.hitA)); // bat back then whips
  } else {
    const kb = (g - FIGHT.hitA) / 0.9;
    if (kb < 1) {
      // smoothstep: he stays AT the contact point through the freeze, then flies
      const u = kb * kb * (3 - 2 * kb);
      gA.x = lerp(heroX(FIGHT.hitA) + 150, 2160, u);
      gA.feet = 884 - Math.sin(u * Math.PI) * 300;
      gA.rot = u * 9;
      gA.alpha = 1 - Math.max(0, u - 0.8) * 5;
    } else gA.alpha = 0;
  }
  if (gA.alpha > 0) {
    const swing = seg(g, FIGHT.swingA, FIGHT.hitA);
    actor(x, ART.goonA, gA.x, gA.feet, {
      sy: 2.0,
      flip: true,
      lean: -0.05 * swing,
      rot: gA.rot,
      alpha: gA.alpha,
      sw: 46,
    });
  }
  // the bat, flying after the parry
  if (g >= FIGHT.hitA) {
    const age = g - FIGHT.hitA;
    if (age < 1.6) {
      x.save();
      x.translate(heroX(FIGHT.hitA) + 190 + age * 480, 660 - age * 60 + age * age * 220);
      x.rotate(age * 11);
      x.fillStyle = "#3a2a1c";
      rrectF(x, -9, -60, 18, 90, 8);
      x.fillStyle = "#c8c0a8";
      x.fillRect(-11, -64, 22, 12);
      x.restore();
    }
  }
  // goon B: charges at hitB, slides past, crashes the bar
  if (g < FIGHT.chargeB) {
    actor(x, ART.goonB, 640, 884, { sy: 1.95, flip: false, lean: -0.02, sw: 44 });
  } else if (g < FIGHT.hitB) {
    const ch = E.inCubic(seg(g, FIGHT.chargeB, FIGHT.hitB));
    actor(x, ART.goonB, lerp(640, heroX(g) - 110, ch), 884, { sy: 1.95, flip: true, lean: 0.09, sw: 44 });
  } else {
    const age = g - FIGHT.hitB;
    if (age < 0.9) {
      const skid = E.outQuad(Math.min(1, age / 0.9));
      actor(x, ART.goonB, lerp(heroX(FIGHT.hitB) - 60, 470, skid), 884 - Math.sin(skid * Math.PI) * 60, {
        sy: 1.95,
        flip: true,
        rot: skid * 3.2,
        lean: 0.3 * skid,
        sw: 44,
      });
    } else if (g > FIGHT.kneel) {
      // fingers peek over the bar edge
      x.fillStyle = "#a08f7f";
      for (const [fx2, fy2] of [
        [552, 636],
        [568, 633],
        [584, 637],
      ]) {
        x.beginPath();
        x.arc(fx2, fy2, 7, Math.PI, 0);
        x.fill();
      }
    }
  }
  // bottle burst where the bottles stood + a secondary puff at his impact
  burst(x, g, FIGHT.hitB, 542, 618, 61);
  burst(x, g, FIGHT.hitB, 520, 800, 71);
  // the Baron: waits stage right (razor held high, matching the club pose),
  // lunges, clashes, kneels, grows the hair
  if (g < FIGHT.lunge) {
    const brx = lerp(1120, 1180, seg(g, 0, FIGHT.lunge));
    actor(x, ART.baron, brx, 902, { sy: 2.35, flip: true, lean: -0.02, sw: 56 });
    drawBaronRazor(x, brx, 902, 1.6, lerp(-1.35, -1.5, seg(g, 0, FIGHT.lunge)));
  } else if (g < FIGHT.kneel) {
    const lg = seg(g, FIGHT.lunge, FIGHT.clash);
    // lunge ends beside-but-past the hero: cross-guard contact
    const bx = lerp(1180, heroX(FIGHT.clash) + 300, E.inOutCubic(lg));
    const by2 = 902 - Math.sin(lg * Math.PI) * 60;
    actor(x, ART.baron, bx, by2, { sy: 2.35, flip: true, lean: 0.08 + lg * 0.06, sw: 56 });
    // razor: sweeps from raised-high down and up-left INTO the hero's sword line
    if (g < FIGHT.split) {
      const arc = lerp(-1.5, -2.55, E.inCubic(seg(g, FIGHT.lunge + 0.5, FIGHT.clash + 0.05)));
      drawBaronRazor(x, bx - 60, by2 - 100, 1.2, arc);
    }
    // contact star + spark fan at the sword/razor crossing during the freeze
    if (g >= FIGHT.clash - 0.06) {
      const cx = heroX(FIGHT.clash) + 125;
      const cy = 690;
      contactStar(x, cx, cy, Math.min(1, (g - (FIGHT.clash - 0.06)) * 6));
      const sl = t - fightFilmT(FIGHT.clash);
      if (sl < 0.7) sparks(x, t, cx, cy, Math.max(0, sl));
    }
  } else {
    // kneel: shorter, tilted forward — unmistakably brought low
    const kn = E.outCubic(seg(g, FIGHT.kneel, FIGHT.kneel + 0.5));
    actor(x, ART.baron, heroX(FIGHT.clash) + 300, 902 + kn * 10, {
      sy: lerp(2.35, 1.62, kn),
      flip: true,
      lean: 0.3 * kn,
      rot: 0.12 * kn,
      sw: 62,
      shA: 0.6,
    });
    // …and the hair: a glowing yellow tuft, three strands fanning out
    const hair = seg(g, FIGHT.hair, FIGHT.hair + 0.7);
    if (hair > 0) {
      const bx = heroX(FIGHT.clash) + 300;
      const hx = bx - 14;
      const hy = 912 - 116 * 1.62 * 0.86;
      const len = (E.outElastic(hair) * 0.9 + 0.1) * 120;
      x.save();
      // glow halo at the sprouting crown
      x.globalCompositeOperation = "lighter";
      const hg = x.createRadialGradient(hx, hy, 2, hx, hy, 90);
      hg.addColorStop(0, "rgba(240,240,140,0.42)");
      hg.addColorStop(1, "rgba(240,240,140,0)");
      x.fillStyle = hg;
      x.fillRect(hx - 90, hy - 90, 180, 180);
      x.globalCompositeOperation = "source-over";
      x.strokeStyle = "#e8e84e";
      x.lineWidth = 5;
      x.lineCap = "round";
      x.shadowColor = "rgba(240,240,140,0.95)";
      x.shadowBlur = 14;
      for (let s = 0; s < 3; s++) {
        const sway2 = 0.35 + s * 0.3;
        x.beginPath();
        x.moveTo(hx + s * 12 - 12, hy);
        x.quadraticCurveTo(
          hx + len * (0.3 + s * 0.12),
          hy - len * (0.85 - s * 0.1),
          hx + len * sway2,
          hy - len * (0.5 - s * 0.12),
        );
        x.stroke();
      }
      x.restore();
    }
  }
  // razor halves spin away after the split (the intact razor is gone for good)
  if (g >= FIGHT.split) {
    const age = g - FIGHT.split;
    const cx = heroX(FIGHT.clash) + 125;
    const cy = 690;
    x.save();
    x.translate(cx + age * 420, cy - age * 130 + age * age * 240);
    x.rotate(age * 7);
    x.globalAlpha = Math.max(0, 1 - age / 1.4);
    x.drawImage(razor(), -260, -70, 300, 150);
    x.restore();
    x.save();
    x.translate(cx - age * 200, cy - age * 260 + age * age * 300);
    x.rotate(-age * 9);
    x.globalAlpha = Math.max(0, 1 - age / 1.4);
    x.drawImage(razor(), -40, -70, 300, 150);
    x.restore();
  }
  // the hero — walking, bracing, dashing, the up-slash arc
  const hx = heroX(g);
  const speed = heroX(Math.min(g + 0.01, FIGHT.end)) - hx;
  const cyc = g * (6 + speed * 0.14);
  const slash = seg(g, FIGHT.clash - 0.15, FIGHT.split);
  actor(x, ART.hero, hx, 898, {
    sy: 2.25,
    flip: true,
    lean: 0.04 + speed * 0.004 + slash * 0.1,
    lift: [Math.max(0, Math.sin(cyc)) * 5, Math.max(0, Math.sin(cyc + Math.PI)) * 5],
    stride: [Math.sin(cyc) * 6, Math.sin(cyc + Math.PI) * 6],
    hat: g < FIGHT.clash, // hat flies off at the clash — drama
    sw: 50,
  });
  // hat flight — pops off his head at the clash, then physics takes it
  if (g >= FIGHT.clash) {
    const age = g - FIGHT.clash;
    if (age < 2) {
      const headY0 = 898 - 116 * 2.25 * 0.845;
      x.save();
      x.translate(hx - 8 + age * 140, headY0 - age * 170 + age * age * 260);
      x.rotate(age * 10);
      drawHat(x, 0, 0, 1.1, { band: PAL.red });
      x.restore();
    }
  }
  // sword arc trail through the clash → split
  if (slash > 0 && slash < 1) {
    x.save();
    x.globalCompositeOperation = "lighter";
    x.strokeStyle = `rgba(220,235,255,${0.5 * (1 - Math.abs(slash * 2 - 1))})`;
    x.lineWidth = 7;
    x.lineCap = "round";
    x.beginPath();
    x.arc(hx + 118, 720, 150, lerp(1.9, -0.5, slash), lerp(2.5, 0.1, slash));
    x.stroke();
    x.restore();
  }
  burst(x, g, FIGHT.hitA, heroX(FIGHT.hitA) + 160, 700, 33);
  // vignette crush
  x.save();
  x.globalCompositeOperation = "multiply";
  const vg = x.createRadialGradient(960, 620, 420, 960, 620, 1200);
  vg.addColorStop(0, "rgba(255,255,255,1)");
  vg.addColorStop(1, "rgba(24,16,34,1)");
  x.fillStyle = vg;
  x.fillRect(-140, -140, 2200, 1360);
  x.restore();
  x.restore(); // shake
}
// soft radial light pool
function pool(x, cx, cy, r, a) {
  x.save();
  x.globalCompositeOperation = "lighter";
  const g = x.createRadialGradient(cx, cy, 8, cx, cy, r);
  g.addColorStop(0, `rgba(255,217,160,${a})`);
  g.addColorStop(1, "rgba(255,217,160,0)");
  x.fillStyle = g;
  x.beginPath();
  x.ellipse(cx, cy, r, r * 0.42, 0, 0, 7);
  x.fill();
  x.restore();
}
// counter bottle (burst source)
function bottle(x, bx, by, s) {
  x.save();
  x.translate(bx, by);
  x.scale(s, s);
  x.fillStyle = "#0d0810";
  x.fillRect(-9, -46, 18, 46);
  x.fillStyle = "rgba(255,190,110,0.5)";
  x.fillRect(-4, -38, 3, 34);
  x.fillStyle = "#1a1020";
  x.fillRect(-3, -58, 6, 13);
  x.restore();
}
// bright contact star at the sword×razor meeting point
function contactStar(x, cx, cy, k) {
  x.save();
  x.globalCompositeOperation = "lighter";
  x.globalAlpha = k;
  const g = x.createRadialGradient(cx, cy, 2, cx, cy, 70);
  g.addColorStop(0, "rgba(255,255,240,0.95)");
  g.addColorStop(0.3, "rgba(255,235,190,0.5)");
  g.addColorStop(1, "rgba(255,235,190,0)");
  x.fillStyle = g;
  x.fillRect(cx - 70, cy - 70, 140, 140);
  x.strokeStyle = "rgba(255,250,230,0.95)";
  x.lineWidth = 5;
  x.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + 0.3;
    const r0 = 18 + 10 * Math.sin(t0() * 40 + i);
    const r1 = 44 + 16 * Math.sin(t0() * 33 + i * 2);
    x.beginPath();
    x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    x.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    x.stroke();
  }
  x.restore();
}
let _t = 0;
function t0() {
  return _t;
}
// razor held by the Baron: (hx, hy) is the grip point, rot swings the blade
function drawBaronRazor(x, hx, hy, scale, rot) {
  x.save();
  x.translate(hx, hy);
  x.rotate(rot);
  x.scale(scale, scale);
  x.drawImage(razor(), -30, -75);
  x.restore();
}
// analytic bottle/spark burst: n seeded shards from an event point
function burst(x, g, at, px, py, seed) {
  const age = g - at;
  if (age < 0 || age > 1.1) return;
  x.save();
  for (let i = 0; i < 16; i++) {
    const a = hash(seed + i * 13) * Math.PI * 2;
    const v = 160 + hash(seed + i * 7) * 340;
    const vx = Math.cos(a) * v;
    const vy = Math.sin(a) * v * 0.7 - 160;
    const sx2 = px + vx * age;
    const sy3 = py + vy * age + 480 * age * age;
    const al = Math.max(0, 1 - age / 1.1);
    x.fillStyle = hash(seed + i * 3) > 0.5 ? `rgba(255,200,130,${al})` : `rgba(180,220,255,${al})`;
    x.fillRect(sx2, sy3, 5, 5);
  }
  x.restore();
}
function sparks(x, t, px, py, sl) {
  x.save();
  x.globalCompositeOperation = "lighter";
  for (let i = 0; i < 26; i++) {
    const a = hash(i * 31 + 3) * Math.PI * 2;
    const v = 200 + hash(i * 17) * 500;
    const age = (sl * 2 + hash(i * 5) * 0.5) % 0.5;
    const sx2 = px + Math.cos(a) * v * age;
    const sy3 = py + Math.sin(a) * v * age + 300 * age * age;
    x.fillStyle = `rgba(255,235,190,${Math.max(0, 1 - age / 0.5)})`;
    x.fillRect(sx2, sy3, 4, 4);
  }
  x.restore();
}
function shakePulse(t, at, dur) {
  if (at == null || t < at) return 0;
  const d = t - at;
  return d > dur ? 0 : Math.exp(-d * 9);
}
function flashPulse(t, at, dur) {
  if (t < at) return 0;
  const d = t - at;
  return d > dur ? 0 : Math.exp(-d * 6);
}
function springSettle(s) {
  return Math.sin(Math.min(s, 2) * 9) * Math.exp(-s * 4) * 0.5;
}
// noir blink between leads: fade to black (out) or back in from black (!out)
function dip(x, b, t0, t1, out) {
  const u = seg(b, t0, t1);
  if (u <= 0) return;
  const a = out ? u : 1 - u;
  if (a <= 0) return;
  x.save();
  x.globalCompositeOperation = "source-over";
  x.fillStyle = `rgba(3,4,9,${a})`;
  x.fillRect(0, 0, 1920, 1080);
  x.restore();
}
function rrectF(x, x0, y0, w, h, r) {
  x.beginPath();
  x.moveTo(x0 + r, y0);
  x.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
  x.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
  x.arcTo(x0, y0 + h, x0, y0, r);
  x.arcTo(x0, y0, x0 + w, y0, r);
  x.closePath();
  x.fill();
}

// ── ACT VI — dawn / title ────────────────────────────────────────────────────
export function drawDawn(x, lt, t, ov) {
  setClock(t);
  _t = t;
  const { bg, desk } = ART.officeDawn;
  x.drawImage(bg, 0, 0);
  fan(x, t, 640, 148, { speed: 4 });
  // sun shafts through the raised blinds
  x.save();
  x.globalCompositeOperation = "lighter";
  for (const [ox, w2] of [
    [0, 150],
    [90, 90],
  ]) {
    const g = x.createLinearGradient(1430 + ox, 380, 900 + ox, 1080);
    g.addColorStop(0, "rgba(255,226,170,0.20)");
    g.addColorStop(1, "rgba(255,226,170,0)");
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(1160 + ox, 160);
    x.lineTo(1710 + ox - w2, 160);
    x.lineTo(620 + ox - w2 * 2, 1080);
    x.lineTo(760 + ox, 1080);
    x.closePath();
    x.fill();
  }
  x.restore();
  // hero at ease behind the desk
  actor(x, ART.hero, 870, 930, { sy: 2.1, flip: false, lean: 0.01, sw: 44 });
  x.drawImage(desk, 0, 0);
  // his hat, resting on the desk's far right
  drawHat(x, 1400, 802, 1.15, { rot: 0.02, band: PAL.red });
  // her card leaning by the mug — fades before the kicker text needs the space
  const cardFade = 1 - seg(lt, T.kicker - T.dawn - 1.2, T.kicker - T.dawn - 0.5);
  if (cardFade > 0.01) {
    x.save();
    x.globalAlpha = cardFade;
    x.translate(1010, 742);
    x.rotate(0.1);
    x.drawImage(ART.cardMid, -78, -92, 156, 156);
    x.restore();
  }
  // the bill, stamped PAID (right of the hero, everything inside the borders)
  x.save();
  x.translate(1170, 782);
  x.rotate(-0.04);
  x.fillStyle = "#efe8d2";
  x.fillRect(-105, -66, 210, 132);
  x.fillStyle = "#241d12";
  txt(x, "REMY INVESTIGATIONS", 0, -40, { size: 11, font: F.mono, weight: 700, align: "center", color: "#241d12" });
  txt(x, "ONE RESCUE ...... $1", 0, -8, { size: 11, font: F.mono, align: "center", color: "#241d12" });
  txt(x, "HAIR SURCHARGE .. $0", 0, 20, { size: 11, font: F.mono, align: "center", color: "#241d12" });
  const stamp = seg(lt, T.titleSlam - T.dawn - 2.8, T.titleSlam - T.dawn - 2.2);
  if (stamp > 0) {
    x.save();
    x.translate(6, 26);
    x.rotate(-0.24);
    x.scale(lerp(2.4, 1, E.outCubic(stamp)), lerp(2.4, 1, E.outCubic(stamp)));
    x.strokeStyle = "#2b7a0b";
    x.lineWidth = 3;
    x.globalAlpha = 0.9;
    x.strokeRect(-42, -15, 84, 30);
    txt(x, "PAID", 0, 5, { size: 18, font: F.anton, align: "center", color: "#2b7a0b" });
    x.restore();
  }
  x.restore();
  steam(x, t, 1013, 788, { n: 3, rise: 90, r0: 6, grow: 16 });
  // ── title type on the overlay (crisp, above post) ──
  const ts = lt - (T.titleSlam - T.dawn);
  if (ov) {
    if (ts >= 0) {
      const p = E.outCubic(seg(ts, 0, 0.55));
      const shake = Math.sin(ts * 60) * Math.exp(-ts * 5) * 6;
      // title steps aside before THE END
      const out = 1 - seg(lt, T.theEnd - T.dawn - 1.1, T.theEnd - T.dawn - 0.5);
      // soft dark band so the type holds against the bright window
      const bg = ov.createLinearGradient(0, 300, 0, 700);
      bg.addColorStop(0, "rgba(6,8,16,0)");
      bg.addColorStop(0.18, `rgba(6,8,16,${0.55 * Math.min(1, ts * 3) * out})`);
      bg.addColorStop(0.85, `rgba(6,8,16,${0.55 * Math.min(1, ts * 3) * out})`);
      bg.addColorStop(1, "rgba(6,8,16,0)");
      ov.fillStyle = bg;
      ov.fillRect(0, 300, 1920, 400);
      ov.save();
      ov.globalAlpha = out;
      ov.translate(960 + shake, 470);
      ov.scale(lerp(2.1, 1, p), lerp(2.1, 1, p));
      txt(ov, "THE BIG", 0, -76, { size: 108, font: F.anton, align: "center", color: "#f2ede2", track: 4 });
      txt(ov, "SHEDDING", 0, 44, { size: 108, font: F.anton, align: "center", color: "#f2ede2", track: 4 });
      ov.restore();
    }
    const kk = lt - (T.kicker - T.dawn);
    if (kk >= 0) {
      const a = seg(kk, 0, 0.5) * (1 - seg(lt, T.theEnd - T.dawn - 1.1, T.theEnd - T.dawn - 0.5));
      txt(ov, "A  R E M Y  N O I R", 960, 620, {
        size: 26,
        font: F.mono,
        weight: 600,
        align: "center",
        color: "#c8b8a2",
        alpha: a,
        track: 6,
      });
      txt(ov, "CASE FILE Nº 4490 · CLOSED", 960, 664, {
        size: 17,
        font: F.mono,
        align: "center",
        color: "#8a8272",
        alpha: a * 0.9,
        track: 3,
      });
    }
    const te = lt - (T.theEnd - T.dawn);
    if (te >= 0) {
      const a = seg(te, 0, 1.2);
      ov.fillStyle = `rgba(4,5,10,${0.62 * a})`;
      ov.fillRect(0, 140, 1920, 800); // stay inside the letterbox band
      txt(ov, "THE END", 960, 540, {
        size: 74,
        font: F.serif,
        weight: 500,
        align: "center",
        color: "#e8e2d2",
        alpha: a,
      });
    }
  }
}
