// FADE TO BALD — a Remy Boys film noir. 86 s, 1080p via a 960×540 pixel stage (2× nearest).
// Monochrome rain-soaked city where HAIR is the only colour: the detective runs gold,
// the femme fatale runs crimson, the Cabald runs slate — until the wig comes off.
import { W, H, hash, seg, lerp, E, F } from 'filmkit/lib.js';
import * as A from '../remy-bros/art.js';
import * as ART from './art.js';
import { score } from './score.js';
import {
  T, CAST, PAL, DUO, FLASHES, DURATION, LW, LH, GROUND,
  STREETS_EV, STREETS_CLOCK, CLUB_EV, CLUB_CLOCK, ROOF_EV, ROOF_CLOCK, HIT,
} from './timeline.js';

const S = {}; // prepared art (read-only in draw)
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// poses
const walkCycle = (ph) => {
  const s = Math.sin(ph) * 0.8;
  return {
    lift: [Math.round(Math.max(0, s) * 6), Math.round(Math.max(0, -s) * 6)],
    stride: [Math.round(s * 2), Math.round(-s * 2)],
    lean: 0.05,
  };
};
const runCycle = (ph) => {
  const s = Math.sin(ph);
  return {
    lift: [Math.round(Math.max(0, s) * 9), Math.round(Math.max(0, -s) * 9)],
    stride: [Math.round(s * 3), Math.round(-s * 3)],
    lean: 0.1,
  };
};
const idle = (t, k = 1) => ({ lean: Math.sin(t * 2.1) * 0.014 * k, lift: [0, 0], stride: [0, 0] });

function flashK(t) {
  let k = 0;
  for (const [ft, peak, decay] of FLASHES) if (t >= ft) k = Math.max(k, peak * Math.exp(-(t - ft) / decay));
  return k;
}

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
  x.fillStyle = '#04050a';
  x.fillRect(0, 0, LW, LH);
  return x;
};

// gold star glint on the overlay (post-grade, so it stays fully saturated)
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

// circle iris (close: p 0→1). evenodd — moveTo before arc or you get a wedge.
function circleIris(x, p, cx, cy, maxR, fill = '#05070c') {
  if (p <= 0) return;
  const r = Math.max(0.1, maxR * (1 - p) ** 1.9);
  x.fillStyle = fill;
  x.beginPath();
  x.rect(0, 0, LW, LH);
  x.moveTo(cx + r, cy);
  x.arc(cx, cy, r, 0, 2 * Math.PI, true);
  x.fill('evenodd');
}

// impact burst ring at contact events (world/screen coords in g-domain, additive)
function burst(ctx, events, worldT, col = '220,230,252') {
  for (const ev of events) {
    const age = worldT - ev.g;
    if (age < 0 || age > 0.3) continue;
    const r = 6 + age * 90;
    const a = 0.55 * (1 - age / 0.3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${col},${a})`;
    ctx.lineWidth = Math.max(1, 4 * (1 - age / 0.3));
    ctx.beginPath(); ctx.arc(ev.x, ev.y, r, 0, 7); ctx.stroke();
    ctx.fillStyle = `rgba(${col},${a * 0.35})`;
    ctx.beginPath(); ctx.arc(ev.x, ev.y, r * 0.5, 0, 7); ctx.fill();
    ctx.restore();
  }
}

// the goon's umbrella (rooftop weapon)
function umbrella(x, hx, hy, rot, flip, a = 1) {
  if (a <= 0.01) return;
  x.save();
  x.globalAlpha = a;
  x.translate(hx, hy);
  x.rotate(rot);
  if (flip) x.scale(-1, 1);
  x.strokeStyle = '#161a22'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(0, 14); x.lineTo(0, -30); x.stroke();
  x.fillStyle = '#333e50';
  x.beginPath(); x.arc(0, -30, 22, Math.PI, 0); x.closePath(); x.fill();
  x.fillStyle = '#435065';
  x.beginPath(); x.arc(0, -30, 22, Math.PI, -Math.PI * 0.5); x.closePath(); x.fill();
  x.strokeStyle = '#5a6a84'; x.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    x.beginPath(); x.moveTo(0, -30); x.lineTo(i * 9, -22 + Math.abs(i) * 5); x.stroke();
  }
  x.restore();
}

// desk painter (drawn after the detective so he stands behind it)
function desk(x, t) {
  x.fillStyle = '#1c1610'; x.fillRect(250, 362, 220, 12);
  x.fillStyle = '#241d15'; x.fillRect(258, 374, 14, 56); x.fillRect(448, 374, 14, 56);
  x.fillStyle = '#171209'; x.fillRect(262, 380, 6, 44); x.fillRect(452, 380, 6, 44);
  // papers
  x.save();
  x.translate(310, 356); x.rotate(-0.06);
  x.fillStyle = '#b9b4a4'; x.fillRect(-22, -6, 44, 14);
  x.fillStyle = '#8f8b7e'; x.fillRect(-18, -2, 34, 1); x.fillRect(-18, 1, 28, 1);
  x.restore();
  // ashtray + lamp base
  x.fillStyle = '#3a3f4a'; x.fillRect(398, 356, 16, 5);
  x.fillStyle = '#141821'; x.fillRect(430, 350, 22, 12);
  x.fillStyle = '#e8dfc8'; x.fillRect(402, 353, 6, 3); // dog-end
  // banker's lamp
  x.fillStyle = '#141821'; x.fillRect(438, 316, 6, 36);
  x.fillStyle = '#1e6e5e';
  x.beginPath(); x.moveTo(424, 318); x.lineTo(458, 318); x.lineTo(452, 306); x.lineTo(430, 306); x.closePath(); x.fill();
}

// ---------- SHOT 1: skyline, titles ----------
function drawSkyline(ctx, lt, dur, t) {
  const x = beginLow();
  const s = 1 + 0.1 * E.outCubic(seg(lt, 0, 11));
  x.save();
  x.translate(480 + 6 * (1 - seg(lt, 0, 8)), 300);
  x.scale(s, s);
  x.translate(-480, -300);
  x.drawImage(S.sky.c, -80, 8);
  // beacons blink
  for (let i = 0; i < S.sky.beacons.length; i++) {
    const [bx, by] = S.sky.beacons[i];
    if (hash(i + Math.floor(t * 1.4)) > 0.55) {
      x.fillStyle = 'rgba(226,92,80,0.85)';
      x.fillRect(bx - 80, by + 8, 2, 2);
    }
  }
  // street level
  x.drawImage(S.street, -80, 464);
  // lamppost
  x.fillStyle = '#0c0f16'; x.fillRect(318, 336, 5, 132);
  x.fillStyle = '#141a24'; x.fillRect(306, 332, 29, 8);
  ART.warmGlow(x, 320, 340, 34, 0.14, '214,222,240');
  x.fillStyle = 'rgba(228,234,246,0.85)'; x.fillRect(311, 338, 5, 3); x.fillRect(325, 338, 5, 3);
  // neon sign board on the right tower
  x.fillStyle = '#0b0e15'; x.fillRect(648, 214, 148, 62);
  x.strokeStyle = '#1c2230'; x.lineWidth = 3; x.strokeRect(648, 214, 148, 62);
  ART.neon(x, 'REMY CLUB', 722, 252, 21, t, 77);
  // little BARBER sign, left
  x.fillStyle = '#0b0e15'; x.fillRect(120, 300, 86, 30);
  ART.neon(x, 'BARBER', 163, 321, 13, t, 31, '196,208,190');
  // wet reflections under sign + lamp
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (const [rx, w2, a, seed] of [[722, 60, 0.05, 3], [320, 26, 0.045, 9]]) {
    const wob = Math.sin(t * 1.3 + seed * 2) * 4;
    const g = x.createLinearGradient(rx - w2 / 2, 466, rx + w2 / 2, 540);
    g.addColorStop(0, `rgba(170,190,224,${a})`); g.addColorStop(1, 'rgba(170,190,224,0)');
    x.fillStyle = g;
    x.fillRect(rx - w2 / 2 + wob, 466, w2, 74);
  }
  x.restore();
  ART.cityGlow(x, t, 0.5);
  x.restore();
  // lightning wash
  const fk = flashK(t);
  if (fk > 0.03) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = `rgba(150,180,250,${0.3 * Math.min(1, fk)})`;
    x.fillRect(0, 0, LW, LH);
    x.restore();
  }
  ART.rainLayers(x, t, 1.15);
  ART.splashes(x, t, 468, 0.8);
  blit(ctx);
}

// ---------- SHOT 2: the office ----------
function drawOffice(ctx, lt, dur, t) {
  const x = beginLow();
  x.drawImage(S.office, -ART.OVER, -ART.OVER);
  // window glass: rain + city bokeh + cold glow
  const win = { x: 552, y: 100, w: 314, h: 244 };
  x.save();
  x.beginPath(); x.rect(win.x, win.y, win.w, win.h); x.clip();
  x.fillStyle = 'rgba(24,34,54,0.85)'; x.fillRect(win.x, win.y, win.w, win.h);
  for (let i = 0; i < 4; i++) {
    const bx = win.x + 40 + hash(i * 9 + 3) * 220, by = win.y + 60 + hash(i * 5 + 8) * 120;
    const a = 0.1 + 0.1 * Math.sin(t * 1.1 + i * 2.4);
    x.fillStyle = `rgba(168,190,226,${a})`;
    x.fillRect(bx, by, 4, 4);
  }
  x.strokeStyle = 'rgba(150,170,215,0.3)'; x.lineWidth = 1;
  x.beginPath();
  for (let i = 0; i < 16; i++) {
    const sp = 300 + hash(i * 7 + 4) * 160;
    const px = ((hash(i * 5 + 2) * (win.w + 16) + t * -40 - i * 6) % (win.w + 16) + win.w + 16) % (win.w + 16) + win.x - 8;
    const py = win.y + ((hash(i * 11 + 6) * win.h + t * sp) % (win.h + 8)) - 4;
    x.moveTo(px, py); x.lineTo(px - 2, py + 7);
  }
  x.stroke();
  x.restore();
  const fk = flashK(t);
  if (fk > 0.03) {
    x.fillStyle = `rgba(150,180,250,${0.18 * fk})`;
    x.fillRect(win.x - 4, win.y - 30, win.w + 8, win.h + 30);
  }
  // venetian slats spill across the room
  ART.slats(x, t, 1);
  // door shaft when she arrives (abs 15 → lt 4)
  const doorA = seg(lt, 4.0, 4.5) * (1 - seg(lt, 5.4, 6.2));
  ART.doorShaft(x, 26, t, doorA);
  // she walks in: slate ghost until the lamplight blooms her colour (abs 17–18.6)
  const u0 = seg(lt, 6.2, 8.0);
  const u = u0 * u0 * (3 - 2 * u0); // smoothstep: no additive step mid-crossfade
  const herX = lt < 8 ? lerp(70, 620, E.inOutCubic(clamp01((lt - 4) / 4))) : 620;
  if (lt >= 4) {
    const g = lt - 4;
    const fx = herX;
    const pose = g < 4 ? walkCycle(g * 6.4) : idle(t, 0.7);
    ART.shadow(x, fx, GROUND, 16, 0.35);
    if (u < 1) A.drawRemy(x, S.femmeSlate, fx, GROUND, { ...pose, sy: 2, alpha: 1 - u });
    if (u > 0) A.drawRemy(x, S.femme, fx, GROUND, { ...pose, sy: 2, alpha: u });
  }
  // the detective behind his desk, turning to face the door
  A.drawRemy(x, S.det, 330, GROUND, { ...idle(t), flip: true, sy: 2 * (1 + 0.012 * Math.sin(t * 12.4)) });
  desk(x, t);
  // lamp pool + smoke
  ART.warmGlow(x, 441, 342, 52, 0.16, '126,224,188');
  ART.warmGlow(x, 380, 372, 40, 0.05, '214,222,240');
  ART.smokeWisp(x, Math.floor(t / 1.6) * 1.6, t % 1.6 + 0.001, 404, 354);
  ART.darkness(x, 0.4, [
    { x: 441, y: 350, r: 120 },
    { x: 700, y: 220, r: 190, soft: 0.8 },
    { x: lt >= 4 ? herX : 70, y: 380, r: 70 },
  ]);
  ART.rainLayers(x, t, 0.35);
  blit(ctx);
}

// ---------- SHOT 3: the pitch (portrait / polaroid / the deal) ----------
function drawPitch(ctx, lt, dur, t, ov) {
  const x = beginLow();
  const g = lt;
  if (g < 4.6) {
    // A: her framed portrait, slow push-in
    const s = 1.05 + 0.13 * E.outCubic(seg(g, 0.3, 4.6));
    x.fillStyle = '#07080d'; x.fillRect(0, 0, LW, LH);
    x.save();
    x.translate(292, 214); x.scale(s, s);
    x.drawImage(S.pFemme, -S.pFemme.width / 2, -S.pFemme.height / 2);
    x.restore();
    ART.slats(x, t, 0.5);
    ART.darkness(x, 0.42, [{ x: 292, y: 214, r: 250, soft: 0.75 }]);
  } else if (g < 8.6) {
    // B: the polaroid of the comb on the desk
    x.fillStyle = '#0a0806'; x.fillRect(0, 0, LW, LH);
    const gg = x.createRadialGradient(480, 300, 60, 480, 300, 620);
    gg.addColorStop(0, '#191410'); gg.addColorStop(1, '#0a0806');
    x.fillStyle = gg; x.fillRect(0, 0, LW, LH);
    x.save();
    x.translate(486, 268); x.rotate(-0.05 + 0.012 * Math.sin(t * 0.9));
    x.drawImage(S.polaroid, -120, -143);
    // the photo: comb on velvet
    x.fillStyle = '#111620'; x.fillRect(-104, -127, 208, 208);
    const vg = x.createRadialGradient(0, -30, 10, 0, -30, 130);
    vg.addColorStop(0, '#1d2534'); vg.addColorStop(1, '#0e131c');
    x.fillStyle = vg; x.fillRect(-104, -127, 208, 208);
    const glint = Math.max(0, Math.sin((t - 26.6) * 2.4)) ** 6;
    ART.comb(x, 0, -30, 3.4, 0.3 + glint);
    x.restore();
    // overlay: the gold glint that survives the grade
    const pu = seg(t, T.pitch + 5.4, T.pitch + 6.4) * (1 - seg(t, T.pitch + 6.4, T.pitch + 7.2));
    star(ov, 972, 536, 60 + 30 * pu, -0.5 + t * 0.1, 0.5 * pu);
    ART.darkness(x, 0.35, [{ x: 486, y: 268, r: 260, soft: 0.8 }]);
  } else {
    // C: the deal — she slides a gold piece across the desk
    x.drawImage(S.office, -ART.OVER, -ART.OVER);
    ART.slats(x, t, 0.8);
    A.drawRemy(x, S.det, 330, GROUND, { ...idle(t), flip: true, sy: 2 * (1 + 0.012 * Math.sin(t * 12.4)) });
    desk(x, t);
    A.drawRemy(x, S.femme, 620, GROUND, { ...idle(t, 0.7), sy: 2 });
    ART.warmGlow(x, 441, 342, 52, 0.16, '126,224,188');
    // the retainer coin: slides from her hand to the blotter (abs 33.6 → local 9.6)
    const cu = E.outCubic(seg(g, 9.6, 10.3));
    const coinX = lerp(596, 470, cu), coinY = 360 - Math.sin(cu * Math.PI) * 7;
    x.fillStyle = '#c9ab52';
    x.beginPath(); x.ellipse(coinX, coinY, 5, 3.2, 0, 0, 7); x.fill();
    x.fillStyle = '#e8cf7e'; x.fillRect(coinX - 3, coinY - 1, 2, 1.4);
    ART.darkness(x, 0.4, [{ x: 441, y: 350, r: 130 }, { x: 620, y: 380, r: 90 }]);
    ART.rainLayers(x, t, 0.3);
  }
  blit(ctx);
}

// ---------- SHOT 4: the streets + alley scrap ----------
function drawStreets(ctx, lt, dur, t) {
  const x = beginLow();
  const { g, stop } = STREETS_CLOCK.warp(lt);
  // impact visuals run on real time through the freeze (world g is held)
  const rt = g + (stop ? stop.sl : 0);
  // hero path (world coords): walk to the alley mouth, then hold; dash closes the gap at the punch
  const hx = g < STREETS_EV.walkEnd ? lerp(120, 492, g / STREETS_EV.walkEnd) : 492;
  const dash = E.outCubic(seg(g, 10.9, 11.4));
  const heroX = g >= 10.9 ? lerp(492, 706, dash) : hx;
  const cam = clamp(heroX - 260, 0, 2160 - LW);
  x.save();
  x.translate(0, 0);
  // sky (slow parallax)
  x.save();
  x.translate(-cam * 0.18, 0);
  x.drawImage(S.sky.c, -40, 40, 1160, 460);
  x.restore();
  x.save();
  x.translate(-cam * 0.55, 0);
  ART.cityGlow(x, t, 0.6);
  x.restore();
  // facades + storefronts (full parallax)
  x.save();
  x.translate(-cam, 0);
  x.drawImage(S.facades, 0, 132);
  ART.neon(x, 'RINSE 24H', 330, 258, 17, t, 91);
  ART.neon(x, 'WIGS', 600, 240, 22, t, 47);
  ART.neon(x, 'BARBER', 1020, 262, 15, t, 63, '196,208,190');
  ART.neon(x, 'TONIC', 1420, 248, 16, t, 83, '214,200,180');
  x.drawImage(S.street, 0, 460);
  // wet smears under each sign
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (const [rx, w2, a, seed] of [[330, 54, 0.045, 3], [600, 34, 0.05, 9], [1020, 44, 0.04, 5], [1420, 44, 0.04, 7]]) {
    const wob = Math.sin(t * 1.3 + seed * 2) * 4;
    const gg2 = x.createLinearGradient(rx - w2 / 2, 462, rx + w2 / 2, 540);
    gg2.addColorStop(0, `rgba(170,190,224,${a})`); gg2.addColorStop(1, 'rgba(170,190,224,0)');
    x.fillStyle = gg2;
    x.fillRect(rx - w2 / 2 + wob, 462, w2, 78);
  }
  x.restore();
  // actors
  const pose = g < STREETS_EV.walkEnd ? walkCycle(g * 7.5) : g < 10.9 || g > 11.95 ? idle(t) : runCycle(g * 14);
  // follow-through: the punch leaves him leaning back a beat
  const recoil = seg(g, 11.72, 12.1) * (1 - seg(g, 12.6, 13.2));
  ART.shadow(x, heroX, GROUND, 17, 0.35);
  ART.reflect(x, heroX, GROUND, t, (rc) => {
    A.drawRemy(rc, S.det, 0, 0, { ...pose, sy: 2, alpha: 0.9 });
  }, 0.13);
  const ducking = seg(g, 12.8, 13.15) * (1 - seg(g, 13.7, 14.1));
  A.drawRemy(x, S.det, heroX, GROUND, {
    ...pose,
    sy: 2 - 0.42 * ducking,
    lean: pose.lean - 0.18 * ducking - 0.07 * recoil,
    glow: '#9fb2d6', glowA: 0.1,
  });
  // goon 1: blocks, eats the punch at g 11.5, sails into the dark
  const g1X0 = 830 - 46 * seg(g, STREETS_EV.block, STREETS_EV.block + 1);
  const g1Hit = seg(g, STREETS_EV.punch1, STREETS_EV.punch1 + 0.12);
  const g1Fly = E.outCubic(seg(g, 11.72, 12.6));
  const g1X = g < STREETS_EV.punch1 ? g1X0 : lerp(g1X0, g1X0 + 130, g1Hit + g1Fly * 0.999);
  const g1Rot = g < STREETS_EV.punch1 ? 0 : lerp(0, 1.45, g1Fly);
  const g1Y = g < STREETS_EV.punch1 ? GROUND : GROUND - Math.sin(g1Fly * Math.PI) * 26;
  ART.shadow(x, g1X, Math.max(g1Y, GROUND - 4), 16, 0.3 * (1 - g1Fly * 0.5));
  // motion ghost trail sells the launch
  if (g >= STREETS_EV.punch1 + 0.22 && g1Fly < 1) {
    for (const [dt, ga] of [[0.09, 0.14], [0.18, 0.07]]) {
      const gf = E.outCubic(seg(g - dt, 11.72, 12.6));
      A.drawRemy(x, S.g1, lerp(g1X0, g1X0 + 130, gf), GROUND - Math.sin(gf * Math.PI) * 26, {
        ...idle(t), rot: lerp(0, 1.45, gf), white: true, alpha: ga,
      });
    }
  }
  A.drawRemy(x, S.g1, g1X, g1Y, {
    ...idle(t),
    rot: g1Rot, alpha: 1 - 0.15 * g1Fly, sy: 2 - 0.1 * g1Fly,
  });
  // goon 2: closes in, swings at 13.2, put down by the counter at 14.3
  const g2X0 = 920 - 46 * seg(g, STREETS_EV.block + 0.3, STREETS_EV.block + 1.3) - 84 * seg(g, 12.2, 13.4);
  const g2Hit = seg(g, STREETS_EV.counter, STREETS_EV.counter + 0.12);
  const g2Fly = E.outCubic(seg(g, 14.52, 15.4));
  const g2X = g < STREETS_EV.counter ? g2X0 : lerp(g2X0, g2X0 + 124, g2Hit + g2Fly * 0.999);
  const g2Rot = g < STREETS_EV.counter ? 0 : lerp(0, -1.5, g2Fly);
  const swing = seg(g, STREETS_EV.swing2 - 0.35, STREETS_EV.swing2 + 0.25);
  const g2Lean = g < 13 ? 0 : -0.14 - 0.24 * Math.sin(swing * Math.PI);
  ART.shadow(x, g2X, GROUND, 16, 0.3);
  A.drawRemy(x, S.g2, g2X, GROUND, { ...idle(t), rot: g2Rot, lean: g2Lean, sy: 2 });
  // alley darkness closes in after the walk
  const alley = seg(g, 5.4, 7.0);
  if (alley > 0) {
    x.fillStyle = `rgba(5,6,10,${0.55 * alley})`;
    x.fillRect(-cam, 132, 190, 200);
    x.fillRect(960 + 640 - cam - 240, 132, 240, 200);
  }
  // impact chips + burst rings (world coords; rt blooms through the freeze)
  ART.chips(x, S.streetsChips, rt, '186,200,230', 11);
  burst(x, S.streetsChips, rt);
  x.restore(); // camera
  ART.rainLayers(x, t, 0.95);
  ART.splashes(x, t, 464, 0.7, 9);
  ART.darkness(x, 0.22, [{ x: heroX - cam, y: 360, r: 200, soft: 0.85 }]);
  blit(ctx);
}

// ---------- SHOT 5: the club — the comb, the boss, the betrayal ----------
function drawClub(ctx, lt, dur, t, ov) {
  const x = beginLow();
  const { g, stop } = CLUB_CLOCK.warp(lt);
  const z = 1.06 - 0.06 * E.outCubic(seg(lt, 0, 6));
  x.save();
  x.translate(480, 300); x.scale(z, z); x.translate(-480, -300);
  x.drawImage(S.club, -ART.OVER, -ART.OVER);
  // the comb under the lamp
  const glint = Math.max(0, Math.sin(t * 0.9)) ** 4;
  ART.comb(x, 644, 342, 1.6, 0.25 + 0.5 * glint);
  // hero enters, holds at 380
  const heroX = g < CLUB_EV.heroIn ? lerp(60, 380, g / CLUB_EV.heroIn) : 380;
  const hWalk = g < CLUB_EV.heroIn;
  const postRip = g >= CLUB_EV.rip;
  ART.shadow(x, heroX, GROUND + 8, 17, 0.3);
  A.drawRemy(x, S.det, heroX, GROUND + 8, {
    ...(hWalk ? walkCycle(g * 7) : idle(t)),
    sy: 2 * (1 + 0.012 * Math.sin(t * 12.4)),
    glow: postRip ? '#e8cf7e' : '#9fb2d6', glowA: postRip ? 0.16 : 0.08,
  });
  // boss + flanker emerge from the dark (rim light does the introduction)
  const bIn = seg(g, CLUB_EV.bossIn, CLUB_EV.bossIn + 1.6);
  if (bIn > 0) {
    const bossLean = seg(g, CLUB_EV.point, CLUB_EV.point + 0.5) * 0.1;
    ART.shadow(x, 770, GROUND + 8, 17, 0.3 * bIn);
    A.drawRemy(x, S.boss, 770, GROUND + 8, {
      ...idle(t, 0.6), alpha: bIn, lean: -bossLean, sy: 2.08,
      glow: '#9fb2d6', glowA: 0.22,
    });
    // shades glint
    const sg = hash(Math.floor(t / 2.7) + 4) > 0.6 ? Math.max(0, Math.sin((t % 2.7) * 9)) ** 8 : 0;
    if (sg > 0) {
      x.fillStyle = `rgba(232,238,250,${0.7 * sg})`;
      x.fillRect(764, 346, 4, 2); x.fillRect(772, 346, 4, 2);
    }
    const g3Step = seg(g, CLUB_EV.rush, 15);
    A.drawRemy(x, S.g3, lerp(850, 764, g3Step), GROUND + 8, { ...idle(t, 0.5), alpha: bIn, sy: 2 });
  }
  // the femme: enters behind him, colour and all — then the wig comes off
  if (g >= CLUB_EV.femmeIn) {
    const fg = g - CLUB_EV.femmeIn;
    const fx = fg < 2.5 ? lerp(40, 300, fg / 2.5) : 300;
    const fWalk = fg < 2.5;
    ART.shadow(x, fx, GROUND + 8, 16, 0.3);
    const pose = fWalk ? walkCycle(fg * 6.2) : idle(t, 0.8);
    // the swap lands AT the rip: the freeze itself shows the bald scalp + departing wig
    const rig = g >= CLUB_EV.rip ? S.femmeBald : S.femme;
    // a beat of flare right before the rip
    const flare = seg(g, CLUB_EV.rip - 0.5, CLUB_EV.rip);
    A.drawRemy(x, rig, fx, GROUND + 8, {
      ...pose, sy: 2 - 0.05 * flare, flip: fWalk ? false : true,
      glow: g < CLUB_EV.rip ? '#a4474a' : null, glowA: 0.16 * (1 - seg(g, CLUB_EV.rip - 0.2, CLUB_EV.rip)),
    });
    // the wig: on her head → peeled at the rip → ballistic arc → floor
    // (arc keys off real time through the freeze so it visibly lifts off)
    if (g < CLUB_EV.rip) {
      const wob = Math.sin(t * 1.8) * 0.04;
      ART.drawWig(x, S.wig, fx + 6, GROUND + 8 - 106, wob, 1);
    } else {
      const gt = (g - CLUB_EV.rip) + (stop ? stop.sl : 0);
      if (gt < 0.75) {
        const wx = HIT.rip.x + 90 * gt;
        const wy = HIT.rip.y - 150 * gt + 190 * gt * gt;
        ART.drawWig(x, S.wig, wx, wy, -0.2 - 5 * gt, 1);
      } else {
        ART.drawWig(x, S.wig, HIT.rip.x + 68, GROUND + 6, 2.72 + 0.02 * Math.sin(t * 2), 1, true);
      }
    }
  }
  // lamp cone + haze
  ART.spotlight(x, 644, 112, 412, 92, t, 0.15);
  // crimson strands + a crimson burst ring at the rip (rt blooms through the freeze)
  const crt = g + (stop ? stop.sl : 0);
  ART.chips(x, S.ripChips, crt, '164,71,74', 6);
  burst(x, S.ripChips, crt, '190,90,92');
  x.restore();
  // freeze beat: white rim the instant the world stops
  if (stop) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = `rgba(210,220,240,${0.05 * Math.max(0, 1 - (stop ? lt - CLUB_CLOCK.filmT(CLUB_EV.rip) : 9) / 0.3)})`;
    x.fillRect(0, 0, LW, LH);
    x.restore();
  }
  ART.rainLayers(x, t, 0.22);
  ART.darkness(x, 0.34, [
    { x: 644, y: 380, r: 150 },
    { x: 380, y: 390, r: 110 },
    { x: 770, y: 380, r: 90 },
  ]);
  // overlay: the comb's periodic gold wink under the lamp
  const ph = (t - T.club) % 2.7;
  const ck = Math.max(0, Math.sin(ph * 2.4)) ** 6;
  star(ov, 1288, 676, 44, t * 0.15, 0.4 * ck * seg(t, T.club + 0.4, T.club + 1.2));
  blit(ctx);
}

// ---------- SHOT 6: rooftop — the scrap, the pile-up, the comb aloft ----------
function drawRoof(ctx, lt, dur, t, ov) {
  const x = beginLow();
  const { g, stop } = ROOF_CLOCK.warp(lt);
  const rt = g + (stop ? stop.sl : 0); // impact visuals bloom through the freeze
  // impact shake on real time
  let sh = 0;
  for (const ev of [ROOF_EV.upper, ROOF_EV.pile]) {
    const d = lt - ROOF_CLOCK.filmT(ev);
    if (d >= 0 && d < 0.4) sh = Math.max(sh, 2.6 * Math.exp(-d / 0.16));
  }
  x.save();
  x.translate(Math.sin(t * 61) * sh, Math.cos(t * 53) * sh * 0.6);
  // city behind the roof (glow first, so the tower silhouettes against it)
  x.drawImage(S.sky.c, -60, 30, 1120, 460);
  for (let i = 0; i < S.sky.beacons.length; i++) {
    const [bx, by] = S.sky.beacons[i];
    if (hash(i + Math.floor(t * 1.4)) > 0.55) {
      x.fillStyle = 'rgba(226,92,80,0.85)';
      x.fillRect(bx - 50, by + 38, 2, 2);
    }
  }
  ART.cityGlow(x, t, 0.4);
  x.drawImage(S.roof, -ART.OVER, -ART.OVER);
  // aviation beacon on the tower finial
  if (hash(99 + Math.floor(t * 1.2)) > 0.5) {
    x.fillStyle = 'rgba(226,92,80,0.9)';
    x.fillRect(752, 58, 3, 3);
    ART.warmGlow(x, 753, 59, 12, 0.1, '226,92,80');
  }
  // the comb on the fallen crate until the hero lifts it
  const lifted = g > ROOF_EV.pick;
  if (!lifted) ART.comb(x, 560, 402, 1.5, 0.3 + 0.4 * Math.max(0, Math.sin(t * 1.1)) ** 4);
  // hero: duck → uppercut (dash + stretch that HOLDS through the freeze) → sidestep → walk to the comb → aloft
  const duck = seg(g, ROOF_EV.duck, ROOF_EV.duck + 0.25) * (1 - seg(g, ROOF_EV.upper - 0.2, ROOF_EV.upper));
  const rise = seg(g, ROOF_EV.upper - 0.3, ROOF_EV.upper);
  let heroX = 384;
  if (rise > 0 && rise < 1) heroX = lerp(384, 440, rise);       // step into the shot
  else if (g >= ROOF_EV.upper) heroX = 440;
  if (g > ROOF_EV.sidestep) heroX = lerp(440, 340, E.outCubic(seg(g, ROOF_EV.sidestep, ROOF_EV.sidestep + 0.4)));
  if (g > ROOF_EV.pick) heroX = lerp(340, 560, E.inOutCubic(seg(g, ROOF_EV.pick, ROOF_EV.pick + 1)));
  const heroPose = g > ROOF_EV.pick && g < ROOF_EV.pick + 1 ? walkCycle((g - ROOF_EV.pick) * 7) : idle(t);
  const riseK = Math.sin(rise * Math.PI / 2);                   // peaks at contact, holds through the freeze
  ART.shadow(x, heroX, GROUND + 14, 17, 0.35);
  A.drawRemy(x, S.det, heroX, GROUND + 14, {
    ...heroPose,
    sy: (2 - 0.44 * duck) + 0.34 * riseK,
    lift: rise >= 0.99 ? [0, 7] : heroPose.lift,
    lean: heroPose.lean + 0.08 * riseK,
    glow: g > ROOF_EV.pick ? '#e8cf7e' : '#9fb2d6', glowA: g > ROOF_EV.pick ? 0.22 : 0.08,
  });
  // the comb in his grip, then aloft
  if (lifted) {
    const up = E.outCubic(seg(g, ROOF_EV.aloft - 0.6, ROOF_EV.aloft));
    ART.warmGlow(x, heroX + 16, lerp(370, 296, up), 30, 0.14, '255,216,115');
    ART.comb(x, heroX + 14, lerp(370, 298, up), 2.5, 0.4 + 0.5 * Math.max(0, Math.sin(t * 2.2)) ** 4);
  }
  // goon 3 with the umbrella: swing, miss, launched by the uppercut
  const swing = seg(g, ROOF_EV.swing, ROOF_EV.swing + 0.9);
  const g3Fly = E.outCubic(seg(g, ROOF_EV.upper + 0.24, ROOF_EV.upper + 1.3));
  const g3X = g < ROOF_EV.upper ? lerp(520, 500, seg(g, 0, 1)) : lerp(500, 646, g3Fly);
  const g3Y = g < ROOF_EV.upper ? GROUND + 14 : GROUND + 14 - Math.sin(g3Fly * Math.PI) * 34;
  const g3Rot = g < ROOF_EV.upper ? 0 : lerp(0, 1.5, g3Fly);
  ART.shadow(x, g3X, Math.max(g3Y, GROUND + 10), 16, 0.3);
  A.drawRemy(x, S.g3, g3X, g3Y, { ...idle(t), rot: g3Rot, sy: 2 });
  // umbrella: in his hand, arcing through the swing, then away
  if (g < ROOF_EV.upper) {
    umbrella(x, g3X - 26, GROUND + 14 - 58, -0.7 + 1.9 * Math.sin(swing * Math.PI), false);
  } else {
    const ugt = (g - ROOF_EV.upper) + (stop ? stop.sl : 0);
    if (ugt < 1.1) {
      umbrella(x, 470 + 60 * ugt, 360 - 120 * ugt + 160 * ugt * ugt, -0.4 + 6 * ugt, false, 1 - ugt * 0.4);
    } else {
      umbrella(x, 536, GROUND + 10, 1.25, false, 0.95); // planted in the tar
    }
  }
  // boss: advance, lunge, skid (accelerating) into the tower base
  const bossX0 = lerp(620, 520, seg(g, 2.5, 5));
  const lunge = seg(g, ROOF_EV.lunge, ROOF_EV.lunge + 0.4);
  const skid = E.inQuad(seg(g, ROOF_EV.sidestep, ROOF_EV.pile));
  const bossX = g < ROOF_EV.lunge ? bossX0 : lerp(bossX0, 480, lunge);
  const bossFinal = g < ROOF_EV.sidestep + 0.2 ? bossX : lerp(480, 688, skid);
  const bossRot = g < ROOF_EV.sidestep + 0.2 ? 0 : lerp(0, 1.15, skid);
  const bossLean = g < ROOF_EV.lunge ? 0 : 0.3 * lunge * (1 - skid);
  ART.shadow(x, bossFinal, GROUND + 14, 17, 0.35);
  A.drawRemy(x, S.boss, bossFinal, GROUND + 14, {
    ...(g < 2.5 || g > ROOF_EV.lunge ? idle(t, 0.6) : walkCycle(g * 4.5)),
    rot: bossRot, lean: -bossLean, sy: 2.08, glow: '#9fb2d6', glowA: 0.18,
  });
  // dust + burst rings where the hits land (rt blooms through the freeze)
  ART.chips(x, S.roofChips, rt, '150,164,196', 10);
  burst(x, S.roofChips, rt);
  // rain quits when the comb goes up
  const rainK = 1 - 0.85 * seg(g, ROOF_EV.aloft, ROOF_EV.aloft + 1.4);
  if (rainK > 0.05) ART.rainLayers(x, t, rainK * 0.8);
  const fk = flashK(t);
  if (fk > 0.03) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = `rgba(150,180,250,${0.26 * Math.min(1, fk)})`;
    x.fillRect(0, 0, LW, LH);
    x.restore();
  }
  ART.darkness(x, 0.3, [{ x: heroX, y: 370, r: 160 }, { x: 560, y: 400, r: 90 }]);
  x.restore();
  // overlay: the aloft comb blazes — the one object allowed full saturation
  if (g > ROOF_EV.aloft - 0.6) {
    const k = seg(g, ROOF_EV.aloft - 0.4, ROOF_EV.aloft + 0.5);
    star(ov, 1148, 636, 150, t * 0.08, 0.7 * k);
    star(ov, 1148, 636, 74, -t * 0.13, 0.5 * k);
  }
  blit(ctx);
}

// ---------- SHOT 7: coda — paid in full ----------
function drawCoda(ctx, lt, dur, t) {
  const x = beginLow();
  const g = lt;
  x.drawImage(S.sky.c, -40, 40, 1120, 460);
  for (let i = 0; i < S.sky.beacons.length; i++) {
    const [bx, by] = S.sky.beacons[i];
    if (hash(i + Math.floor(t * 1.4)) > 0.55) {
      x.fillStyle = 'rgba(226,92,80,0.85)';
      x.fillRect(bx - 40, by + 38, 2, 2);
    }
  }
  x.drawImage(S.facades, -600, 132, 2160, 300);
  ART.neon(x, 'WIGS', 480, 252, 20, t, 47);
  x.drawImage(S.street, -600, 460, 2160, 120);
  // lamppost — the one warm pool on the street
  x.fillStyle = '#232b38'; x.fillRect(738, 336, 6, 132);
  x.fillStyle = '#2c3646'; x.fillRect(726, 330, 31, 9);
  x.fillStyle = 'rgba(238,242,250,0.95)'; x.fillRect(731, 337, 6, 4); x.fillRect(746, 337, 6, 4);
  ART.warmGlow(x, 742, 342, 44, 0.2, '214,222,240');
  x.save();
  x.globalCompositeOperation = 'lighter';
  const pool = x.createRadialGradient(742, 462, 4, 742, 462, 66);
  pool.addColorStop(0, 'rgba(190,200,224,0.10)'); pool.addColorStop(1, 'rgba(190,200,224,0)');
  x.fillStyle = pool;
  x.beginPath(); x.ellipse(742, 464, 66, 14, 0, 0, 7); x.fill();
  x.restore();
  // the hero walks out of the story
  const hx = lerp(760, 300, E.inOutCubic(clamp01(g / 6.8)));
  ART.shadow(x, hx, GROUND, 16, 0.3);
  ART.reflect(x, hx, GROUND, t, (rc) => {
    A.drawRemy(rc, S.det, 0, 0, { ...walkCycle(g * 6.6), flip: true, sy: 2, alpha: 0.9 });
  }, 0.26);
  A.drawRemy(x, S.det, hx, GROUND, { ...walkCycle(g * 6.6), flip: true, sy: 2 });
  // her wig, adrift in a puddle — the last colour in town
  ART.drawWig(x, S.wig, 618, 458, 2.8 + 0.03 * Math.sin(t * 1.2), 0.95, true);
  const wob = Math.sin(t * 1.1) * 3;
  x.save();
  x.globalCompositeOperation = 'lighter';
  const wg = x.createLinearGradient(600, 458, 640, 500);
  wg.addColorStop(0, 'rgba(164,71,74,0.16)'); wg.addColorStop(1, 'rgba(164,71,74,0)');
  x.fillStyle = wg;
  x.fillRect(600 + wob, 458, 40, 44);
  x.restore();
  ART.darkness(x, 0.3, [{ x: 460, y: 380, r: 260, soft: 0.8 }]);
  // iris out onto the walker, then the end card owns the black
  circleIris(x, seg(lt, 5.2, 6.5), 300, 350, 760);
  blit(ctx);
}

// ---------- the film ----------
async function prepare() {
  S.low = A.canvas(LW, LH);
  S.sky = ART.bakeSky();
  S.facades = ART.bakeFacades();
  S.street = ART.bakeStreetBase();
  S.office = ART.bakeOffice();
  S.club = ART.bakeClub();
  S.roof = ART.bakeRoof();
  S.polaroid = ART.bakePolaroid();
  // rigs, duotoned by hair; the Cabald runs slate
  const det = await A.loadRemy(CAST.DET, false);
  S.det = ART.duo(det, DUO.DET, 0.55);
  const femme = await A.loadRemy(CAST.FEMME, false);
  S.femme = ART.duo(femme, DUO.FEMME, 0.6);
  S.femmeSlate = ART.duo(femme, DUO.CABALD, 0.45);
  S.femmeBald = ART.duo(ART.baldify(femme, PAL.FEMME.skin), DUO.CABALD, 0.45);
  S.g1 = ART.duo(await A.loadRemy(CAST.GOON1, false), DUO.CABALD, 0.42);
  S.g2 = ART.duo(await A.loadRemy(CAST.GOON2, false), DUO.CABALD, 0.42);
  S.g3 = ART.duo(await A.loadRemy(CAST.GOON3, false), DUO.CABALD, 0.42);
  S.boss = ART.duo(await A.loadRemy(CAST.BOSS, false), DUO.CABALD, 0.48);
  S.wig = ART.bakeWig('#9a4046');
  const orig109 = await ART.loadOrig(CAST.FEMME);
  S.pFemme = ART.framePortrait(orig109, '#a4474a', 0.62);
  // immutable particle tables (world coords in g-domain)
  S.streetsChips = [
    { g: STREETS_EV.punch1, x: 746, y: 334, seed: 11 },
    { g: STREETS_EV.counter, x: 750, y: 338, seed: 14 },
  ];
  S.ripChips = [];
  for (let i = 0; i < 6; i++) S.ripChips.push({ g: CLUB_EV.rip, x: HIT.rip.x + i * 3 - 6, y: HIT.rip.y, seed: 20 + i });
  S.roofChips = [
    { g: ROOF_EV.upper, x: HIT.roofUpper.x, y: HIT.roofUpper.y, seed: 31 },
    { g: 6.0, x: 540, y: 442, seed: 41 },  // skid dust
    { g: 6.2, x: 620, y: 444, seed: 42 },
    { g: ROOF_EV.pile, x: HIT.roofPile.x, y: HIT.roofPile.y, seed: 36 },
  ];}

const fxNoir = (extra = {}) => (lt, t) => ({
  letterbox: 0.8, vignette: 1.05, grain: 0.06, bloom: 0.09, bloomThresh: 0.85,
  sat: 0.8, tint: [0.88, 0.96, 1.12], contrast: 1.06, ...extra,
});

export default {
  title: 'FADE TO BALD — a Remy Boys film noir',
  output: 'fade-to-bald.mp4',
  duration: DURATION,
  prepare,
  shots: [
    { name: 'skyline', t0: T.skyline, t1: T.office, draw: drawSkyline, fx: fxNoir({ vignette: 1.14, grain: 0.065 }) },
    { name: 'office', t0: T.office, t1: T.pitch, draw: drawOffice, fx: fxNoir({ vignette: 1.0, grain: 0.05 }) },
    { name: 'pitch', t0: T.pitch, t1: T.streets, draw: drawPitch, fx: fxNoir({ vignette: 0.92, grain: 0.06 }) },
    { name: 'streets', t0: T.streets, t1: T.club, draw: drawStreets, fx: fxNoir({ vignette: 1.06 }) },
    { name: 'club', t0: T.club, t1: T.rooftop, draw: drawClub, fx: (lt, t) => ({ ...fxNoir({ vignette: 1.18, grain: 0.07, bloom: 0.1 })(lt, t), aber: CLUB_CLOCK.warp(lt).stop ? 0.004 : 0 }) },
    { name: 'rooftop', t0: T.rooftop, t1: T.coda, draw: drawRoof, fx: fxNoir({ vignette: 1.0 }) },
    { name: 'coda', t0: T.coda, t1: DURATION, draw: drawCoda, fx: fxNoir({ vignette: 1.12, grain: 0.065 }) },
  ],
  captions: [
    { text: 'REMY BOYS PICTURES presents', t0: 1.2, t1: 4.4, style: 'presents' },
    { text: 'The city never sleeps.\nNeither does the dandruff.', t0: 4.6, t1: 9.4, style: 'vo' },
    { text: 'FADE TO BALD', t0: 5.2, t1: 10.4, style: 'title' },
    { text: 'Tuesday, 11 p.m. She walked in like a headline —\ntwice as dangerous.', t0: 11.8, t1: 16.3, style: 'vo' },
    { text: '“They took the Golden Comb, detective.\nBring it home.”', t0: 16.8, t1: 21.5, style: 'dlg' },
    { text: 'The Golden Comb of Madame Bouffant.\nA hundred years of perfect hair.', t0: 24.6, t1: 29.4, style: 'vo' },
    { text: 'Every Cabald in town wanted it.\nI took the case. Bad idea — hers.', t0: 30.0, t1: 34.6, style: 'vo' },
    { text: 'The trail ran through the rinse racks, the wig racks,\ndown streets shinier than the clientele.', t0: 36.8, t1: 42.4, style: 'vo' },
    { text: '“Wrong alley, hairball.”', t0: 43.1, t1: 46.0, style: 'dlg', minHold: 2.2 },
    { text: 'I declined their invitation.', t0: 47.7, t1: 50.9, style: 'vo' },
    { text: 'The Cabald doesn\u2019t steal combs for money.\nThey steal them so nobody else can have hair.', t0: 52.0, t1: 57.2, style: 'vo' },
    { text: '“Bald is beautiful, detective.”', t0: 57.2, t1: 60.2, style: 'dlg' },
    { text: '“You brought it right to us, detective.”', t0: 59.9, t1: 62.7, style: 'dlg' },
    { text: 'The hair was a lie. Then again —\nin this town, everything is.', t0: 63.0, t1: 65.9, style: 'vo' },
    { text: '“Not tonight.”', t0: 68.4, t1: 71.4, style: 'dlg' },
    { text: 'In this town, hair is currency.\nTonight, I got paid.', t0: 77.6, t1: 82.4, style: 'vo' },
    { text: 'THE END', t0: 83.6, t1: 87.4, style: 'endT' },
    { text: 'a Remy Boys picture', t0: 84.2, t1: 87.2, style: 'endS' },
  ],
  captionStyles: {
    vo: {
      font: F.serif, weight: 'italic 600', size: 36, color: '#ded7c4', align: 'center',
      x: 960, y: 878, lineHeight: 1.2, track: 0.5, anim: 'rise', in: 0.35, out: 0.35,
      shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 12,
    },
    dlg: {
      font: F.serif, weight: 'italic 600', size: 38, color: '#f0e9d4', align: 'center',
      x: 960, y: 878, lineHeight: 1.2, track: 0.5, anim: 'fade', in: 0.25, out: 0.25,
      shadow: '#0a0c10', glow: '#0a0c10', glowBlur: 14,
    },
    presents: {
      font: F.serif, weight: 'italic 500', size: 30, color: '#b7b1a2', align: 'center',
      x: 960, y: 620, track: 6, anim: 'fade', in: 0.5, out: 0.5, shadow: '#0a0c10',
    },
    title: {
      font: F.serif, weight: 600, size: 138, color: '#e7e1d0', align: 'center',
      x: 960, y: 560, track: 16, anim: 'rise', rise: 20, in: 0.7, out: 0.6,
      glow: '#000000', glowBlur: 30,
    },
    endT: {
      font: F.serif, weight: 600, size: 96, color: '#e7e1d0', align: 'center',
      x: 960, y: 520, track: 10, anim: 'fade', in: 0.4, out: 0.8, glow: '#000000', glowBlur: 20,
    },
    endS: {
      font: F.serif, weight: 'italic 500', size: 26, color: '#b7b1a2', align: 'center',
      x: 960, y: 596, track: 4, anim: 'fade', in: 0.4, out: 0.8, shadow: '#0a0c10',
    },
  },
  flashes: FLASHES,
  score,
  audio: { seed: 1946, reverb: 2.4, reverbGain: 0.34 },
  lint: { captionHold: 2.2, safe: { margin: 0.05, letterbox: true } },
};
