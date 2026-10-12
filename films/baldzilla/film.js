// BALDZILLA — a Remy Boys monster movie. 90 s, 960×540 pixel stage → 2× nearest.
// Framing note: fx letterbox 1 (2.39:1) leaves only low-canvas rows ~69..471 visible.
// Every composition below keeps its content inside that band.
import { W, H, E, seg, clamp, lerp, hash, txt, F } from 'filmkit/lib.js';
import * as TL from './timeline.js';
import * as ART from './art.js';
import * as A from '../remy-bros/art.js';
import score from './score.js';

const { T, SEA, NEWS, RAMP, LAB, BATTLE, DAWN, RAMP_CLOCK, BATTLE_CLOCK, LW, LH } = TL;

// Monster path across the rampage (world g): enters fast, plants feet at the slam times.
const rampX = (g) =>
  g < 2.9 ? lerp(-140, 60, seg(g, 0, 2.9))
    : g < 4.3 ? lerp(60, 140, seg(g, 2.9, 4.3))
      : g < 9 ? lerp(140, 300, seg(g, 4.3, 9))
        : lerp(300, 430, E.outQuad(seg(g, 9, 12.4)));
// Monster chest anchor in battle framing (feet 600, s 5.2): chest ≈ 70% down the sprite.
const chestOf = (mxx) => ({ x: mxx + 4, y: 600 - 0.30 * 116 * 5.2 });

// ---------- overlay cards (1920×1080 overlay canvas) ----------
function titleCard(ov, t) {
  const ts = t - (T.sea + SEA.title);
  if (ts < 0 || ts > 2.8) return;
  const fade = 1 - seg(ts, 2.3, 2.8);
  const p = E.outCubic(seg(ts, 0, 0.45));
  const shake = Math.sin(ts * 60) * Math.exp(-ts * 5) * 8;
  ov.fillStyle = 'rgba(2,4,10,0.55)';
  ov.fillRect(0, 320, W, 440);
  txt(ov, 'A REMY BOYS MONSTER MOVIE', 960, 420, { size: 30, font: F.mono, weight: 600, color: '#9fb4d8', align: 'center', track: 10, alpha: seg(ts, 0.5, 1) * fade });
  const sc = lerp(2.2, 1, p);
  ov.save();
  ov.translate(960 + shake, 590);
  ov.scale(sc, sc);
  txt(ov, 'BALDZILLA', 0, 0, { size: 172, font: F.anton, color: '#eef2fa', align: 'center', track: 6, glow: '#3d6db5', glowBlur: 34, alpha: fade });
  ov.restore();
  const up = seg(ts, 0.9, 1.4);
  if (up > 0) {
    ov.fillStyle = `rgba(214,58,48,${0.9 * up * fade})`;
    ov.fillRect(960 - 430 * up, 660, 860 * up, 6);
    txt(ov, 'KING OF THE BALD', 960, 726, { size: 34, font: F.mono, weight: 700, color: '#d6b98a', align: 'center', track: 16, alpha: up * fade });
  }
}
function stampCard(ov, t) {
  const ts = t - 60.6;
  if (ts < 0 || ts > 1.4) return;
  const p = E.outBack(clamp(ts / 0.35, 0, 1));
  ov.save();
  ov.translate(1300, 600);
  ov.rotate(-0.1);
  ov.scale(p, p);
  ov.globalAlpha = 1 - seg(ts, 1.0, 1.4);
  ov.strokeStyle = '#d84a3a'; ov.lineWidth = 6;
  ov.strokeRect(-300, -74, 600, 148);
  txt(ov, 'APPROVED', 0, -12, { size: 44, font: F.mono, weight: 700, color: '#d84a3a', align: 'center', track: 8 });
  txt(ov, 'PROJECT REGROWTH', 0, 46, { size: 30, font: F.mono, weight: 700, color: '#d84a3a', align: 'center', track: 4 });
  ov.restore();
}
function endCard(ov, lt, t) {
  const ts = lt - (DAWN.endcard - 78);
  if (ts < 0) return;
  const a = seg(ts, 0, 0.5) * (1 - seg(t, DAWN.fade, 89.8));
  ov.fillStyle = `rgba(3,4,10,${0.74 * a})`;
  ov.fillRect(0, 138, W, 804); // stay inside the letterbox band
  txt(ov, 'REMY BOYS MONSTER PICTURES', 960, 400, { size: 26, font: F.mono, weight: 600, color: '#8fa4c8', align: 'center', track: 14, alpha: a });
  txt(ov, 'LONG LIVE THE FLOW', 960, 520, { size: 104, font: F.anton, color: '#f2ecd9', align: 'center', track: 4, glow: '#b5653a', glowBlur: 26, alpha: a });
  txt(ov, 'NO. 347 WILL RETURN · NO REMYS WERE PERMANENTLY BALDED', 960, 620, { size: 24, font: F.mono, color: '#c9b98f', align: 'center', track: 4, alpha: a });
}

// ---------- HUD helpers (low-res canvas) ----------
function recHud(x, lt) {
  const tc = `PM 11:47:${String(Math.floor(lt * 25) % 60).padStart(2, '0')}`;
  x.font = '11px "JetBrains Mono"';
  x.fillStyle = 'rgba(230,240,255,0.85)';
  x.fillText(tc, 22, 92);
  if (hash(Math.floor(lt * 2)) > 0.4) {
    x.fillStyle = '#e2554a'; x.beginPath(); x.arc(160, 88, 4, 0, 7); x.fill();
    x.fillStyle = 'rgba(230,240,255,0.85)'; x.fillText('REC', 170, 92);
  }
}
function ticker(x, t) {
  x.fillStyle = '#0c1322'; x.fillRect(0, 436, 960, 34);
  x.fillStyle = '#e2554a'; x.fillRect(0, 436, 960, 3);
  x.font = '13px "JetBrains Mono"';
  const tw = x.measureText(NEWS.ticker).width;
  const off = (t * 90) % tw;
  x.fillStyle = '#cdd9ec';
  x.fillText(NEWS.ticker, -off, 458);
  x.fillText(NEWS.ticker, -off + tw, 458);
}
function breaking(x) {
  x.fillStyle = '#b3271e'; x.fillRect(0, 16, 150, 34);
  x.fillStyle = '#7e120c'; x.fillRect(0, 16, 150, 3);
  x.font = '21px Anton';
  x.fillStyle = '#fff'; x.fillText('BREAKING', 14, 42);
  x.fillStyle = 'rgba(179,39,30,0.9)'; x.fillRect(158, 26, 8, 14);
}
function rnnBug(x) {
  x.fillStyle = '#0c1322'; x.fillRect(806, 396, 118, 34);
  x.strokeStyle = '#e2554a'; x.lineWidth = 2; x.strokeRect(806, 396, 118, 34);
  x.font = '19px Anton'; x.fillStyle = '#e2554a'; x.fillText('RNN', 820, 420);
  x.font = '11px "JetBrains Mono"'; x.fillStyle = '#cdd9ec'; x.fillText('CH 7', 878, 418);
}

// ---------- the cat + the jet ----------
function drawCat(x, px, py, g, balded) {
  const ph = g * 16;
  const bob = Math.abs(Math.sin(ph)) * 2;
  x.fillStyle = balded ? '#e8a4a0' : '#4a4038';
  x.fillRect(px, py - 5 - bob, 12, 5);
  x.fillRect(px + 10, py - 9 - bob, 6, 6);
  x.fillRect(px + 10, py - 11 - bob, 2, 2); x.fillRect(px + 14, py - 11 - bob, 2, 2);
  x.fillRect(px - 3, py - 7 - bob + Math.sin(ph) * 2, 3, 2);
  if (!balded) {
    x.fillStyle = '#3a322c';
    x.fillRect(px + 1, py - 6 - bob, 10, 1); x.fillRect(px + 9, py - 10 - bob, 8, 1);
  }
}
function jetPath(g) {
  const hit = RAMP.jetHit;
  const x = 990 - (g - 12.4) * 215; // enters while the beam is firing, gets caught mid-frame
  const baseY = 150 + Math.sin(g * 2.2) * 8;
  if (g < hit) return { x, y: baseY, rot: 0, down: false };
  const age = g - hit;
  return { x: x - age * 60, y: baseY + age * age * 120, rot: age * 7, down: true };
}

// ---------- shots ----------
const DRAWS = {
  // ACT I — THE SEA -----------------------------------------------------------
  sea(x, lt, t) {
    x.drawImage(ART.S.sky, -40 + lt * 1.1, 0);
    ART.moon(x, 742, 86, 21, lt);
    ART.cloudSlabs(x, lt);
    const horizon = 336;
    if (lt < SEA.breach + 2) {
      const bp = seg(lt, SEA.ripples - 1.2, SEA.breach);
      if (bp > 0) {
        x.fillStyle = `rgba(10,16,36,${0.85 * bp})`;
        x.beginPath(); x.ellipse(560, horizon + 4, 60 + bp * 90, 10 + bp * 12, 0, 0, 7); x.fill();
      }
      for (let i = 0; i < 3; i++) {
        const u = seg(lt, SEA.ripples + i * 0.5, SEA.ripples + i * 0.5 + 2.6);
        if (u <= 0 || u >= 1) continue;
        x.strokeStyle = `rgba(190,205,240,${(1 - u) * 0.4})`; x.lineWidth = 2;
        x.beginPath(); x.ellipse(560, horizon + 2, u * 130 + i * 20, (u * 130) * 0.22, 0, 0, 7); x.stroke();
      }
    }
    const rise = E.outCubic(seg(lt, SEA.breach, SEA.breach + 1.6));
    const roarUp = seg(lt, SEA.roar, SEA.roar + 0.5) * 14 - seg(lt, SEA.roar + 0.6, SEA.roar + 1.4) * 10;
    if (rise > 0) {
      const feet = 980 - rise * 224 - roarUp;
      ART.drawKaiju(x, { x: 560, feet, s: 5.2, g: lt, sil: ART.S.kaijuSil, alpha: 0.96, glow: '#3d5da8', glowA: 0.28, lean: -0.012 * seg(lt, SEA.roar, SEA.roar + 0.4) });
      if (lt > SEA.breach && lt < SEA.breach + 1.1) {
        const u = (lt - SEA.breach) / 1.1;
        x.strokeStyle = `rgba(200,220,250,${(1 - u) * 0.75})`; x.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          x.beginPath(); x.ellipse(560, horizon - 40 - u * 120, 30 + u * 180, (30 + u * 180) * 0.3, 0, 0, 7); x.stroke();
        }
      }
      if (lt > SEA.roar && lt < SEA.roar + 1.2) {
        const u = (lt - SEA.roar) / 1.2;
        x.strokeStyle = `rgba(160,190,240,${(1 - u) * 0.5})`; x.lineWidth = 2;
        x.beginPath(); x.ellipse(560, 250, u * 420, u * 420 * 0.35, 0, 0, 7); x.stroke();
      }
    }
    for (let i = 0; i < 4; i++) {
      const u = seg(lt, SEA.ripples, SEA.ripples + 2.5);
      if (u <= 0) continue;
      const gx = 500 + i * 40 + u * (60 + i * 30), gy = 240 - u * 120 + Math.sin(lt * 6 + i) * 4;
      x.strokeStyle = 'rgba(200,212,235,0.7)'; x.lineWidth = 1.5;
      const fl = Math.sin(lt * 9 + i * 2) * 3;
      x.beginPath(); x.moveTo(gx - 4, gy - fl); x.lineTo(gx, gy); x.lineTo(gx + 4, gy - fl); x.stroke();
    }
    ART.seaRows(x, { horizon, t: lt, glintX: 742, glintA: 0.3 * (1 - seg(lt, SEA.breach, SEA.breach + 1)) });
    // the boat rides ON the water — must be drawn after the sea rows
    {
      const flee = seg(lt, SEA.flee, SEA.flee + 2.2);
      const bx = lerp(180, 1020, E.inQuad(flee));
      if (bx < 990) {
        const bob = Math.sin(lt * 1.4) * 2 * (1 + flee * 3), tilt = Math.sin(lt * 1.1) * 0.06 + flee * 0.09;
        x.save(); x.translate(bx, 372 + bob); x.rotate(tilt);
        x.drawImage(ART.S.boat, -15, -14);
        x.globalCompositeOperation = 'lighter';
        x.fillStyle = 'rgba(255,190,90,0.9)'; x.beginPath(); x.arc(14, -4, 3.5, 0, 7); x.fill();
        x.fillStyle = 'rgba(255,190,90,0.25)'; x.beginPath(); x.arc(14, -4, 9, 0, 7); x.fill();
        x.globalCompositeOperation = 'source-over';
        x.restore();
        if (flee > 0.1) {
          x.fillStyle = `rgba(200,215,240,${0.3 + flee * 0.3})`;
          for (let i = 0; i < 5; i++) x.fillRect(bx - 26 - i * 9 - flee * 30, 376 + Math.sin(lt * 7 + i) * 2, 6, 2);
        }
      }
    }
    if (lt > SEA.roar && lt < SEA.title && hash(Math.floor(lt * 3)) > 0.5) {
      x.globalCompositeOperation = 'lighter';
      x.fillStyle = 'rgba(255,80,60,0.12)'; x.fillRect(0, horizon, 960, LH - horizon);
      x.globalCompositeOperation = 'source-over';
    }
  },

  // ACT II — THE NEWS ---------------------------------------------------------
  news(x, lt, t) {
    // footage cut is lt 4.5..8.5 (shot-local); desk B from 8.5
    if (lt >= 4.5 && lt < 8.5) {
      const flt = lt + 14;
      x.fillStyle = '#04060c'; x.fillRect(0, 0, LW, LH);
      const hx = Math.sin(lt * 1.7) * 3 + (hash(Math.floor(lt * 7)) - 0.5) * 5;
      const hy = Math.cos(lt * 1.3) * 2 + (hash(Math.floor(lt * 7) + 3) - 0.5) * 4;
      x.save(); x.translate(hx, hy);
      const mx = 690 - lt * 26;
      for (const [dx, al] of [[-4, 0.3], [4, 0.3], [0, 0.92]]) {
        x.globalAlpha = al;
        ART.drawKaiju(x, { x: mx + dx, feet: 470, s: 6.4, g: lt, sil: '#141e36', flip: true, walking: 1, glow: '#2a3c66', glowA: 0.35 });
      }
      x.globalAlpha = 1;
      x.fillStyle = '#060a14';
      x.fillRect(0, 300, 190, LH - 300); x.fillRect(760, 300, 200, LH - 300);
      x.fillRect(150, 250, 34, 250); x.fillRect(770, 220, 30, 280);
      x.fillStyle = '#0b1120'; x.fillRect(0, 470, LW, 70);
      x.restore();
      ART.rain(x, lt, 1.25, '150,170,210');
      x.fillStyle = 'rgba(0,0,0,0.09)';
      for (let y = 0; y < LH; y += 3) x.fillRect(0, y, LW, 1);
      for (let i = 0; i < 60; i++) {
        x.fillStyle = `rgba(210,225,255,${hash(i * 7 + Math.floor(lt * 24)) * 0.08})`;
        x.fillRect(hash(i * 3 + Math.floor(lt * 24)) * LW, hash(i * 5 + Math.floor(lt * 24)) * LH, 2, 2);
      }
      x.fillStyle = 'rgba(179,39,30,0.9)'; x.fillRect(0, 440, 214, 26);
      x.font = '15px "JetBrains Mono"'; x.fillStyle = '#fff'; x.fillText('EXCLUSIVE', 12, 459);
      recHud(x, flt);
      return;
    }
    ART.drawDesk(x, lt, ART.S.anchorRemy);
    const deskB = lt >= 8.5;
    breaking(x);
    if (!deskB) ART.seismograph(x, lt, 70, 340, 210, 120, clamp((lt - 14) * 0.5, 0.2, 1));
    else ART.evacMap(x, lt, 70, 340, 210, 120);
    x.save();
    x.beginPath(); x.arc(856, 120, 44, 0, 7); x.clip();
    x.fillStyle = '#0a1220'; x.fillRect(812, 76, 88, 88);
    x.drawImage(ART.S.iconAnchor, 816, 80, 80, 80);
    x.restore();
    x.strokeStyle = '#e2554a'; x.lineWidth = 3;
    x.beginPath(); x.arc(856, 120, 45, 0, 7); x.stroke();
    ticker(x, t);
    rnnBug(x);
    if (deskB && hash(Math.floor(lt * 4)) > 0.5) {
      x.globalCompositeOperation = 'lighter';
      x.fillStyle = 'rgba(255,60,40,0.07)'; x.fillRect(0, 0, LW, LH);
      x.globalCompositeOperation = 'source-over';
    }
  },

  // ACT III — THE RAMPAGE -----------------------------------------------------
  rampage(x, lt, t) {
    const w = RAMP_CLOCK.warp(lt), g = w.g;
    const [shx, shy] = ART.shakeOf(t, TL.SHAKES);
    x.translate(shx * 0.6, shy * 0.6);
    if (g < 4.55) { // — wide: it comes ashore
      x.drawImage(ART.S.sky, -30, 0);
      ART.cloudSlabs(x, t * 1.4, 'rgba(24,32,60,0.85)');
      x.drawImage(ART.S.skyline, -20, 178, 1160, 268);
      for (let i = 0; i < (ART.S.beacons?.length ?? 0); i++) {
        const [bxx, byy] = ART.S.beacons[i];
        if (hash(i + Math.floor(t * 1.6)) > 0.55) {
          x.fillStyle = '#ff6a5a';
          x.fillRect(-20 + bxx * (1160 / 1120), 178 + byy * (268 / 300), 2, 2);
        }
      }
      x.fillStyle = '#10182c'; x.fillRect(0, 438, LW, 16);
      ART.drawKaiju(x, { x: rampX(g), feet: 520, s: 3.9, g, walking: 1, eyeGlow: 0.5, glow: '#46619e', glowA: 0.22 });
      ART.seaRows(x, { horizon: 446, t });
      for (const fg of [RAMP.footA, RAMP.footB]) {
        const age = g - fg;
        if (age > 0 && age < 1.6) {
          const u = age / 1.6;
          const fx0 = rampX(fg);
          x.strokeStyle = `rgba(190,205,240,${(1 - u) * 0.7})`; x.lineWidth = 4;
          x.beginPath(); x.ellipse(fx0, 464, u * 110 + 10, (u * 110 + 10) * 0.22, 0, 0, 7); x.stroke();
          x.strokeStyle = `rgba(190,205,240,${(1 - u) * 0.35})`; x.lineWidth = 2;
          x.beginPath(); x.ellipse(fx0, 464, u * 150 + 16, (u * 150 + 16) * 0.2, 0, 0, 7); x.stroke();
          // ground shockwave racing out from the planted foot
          x.strokeStyle = `rgba(120,110,100,${(1 - u) * 0.5})`; x.lineWidth = 3;
          x.beginPath(); x.ellipse(fx0, 448, u * 240 + 20, 7, 0, 0, 7); x.stroke();
        }
      }
    } else if (g < 11.4) { // — street level: panic + futile volleys
      x.drawImage(ART.S.sky, -30, -160);
      x.fillStyle = '#0d1424'; x.fillRect(0, 190, LW, 350);
      x.drawImage(ART.S.towers[0].c, 30, 180);
      x.drawImage(ART.S.towers[3].c, 660, 220);
      x.drawImage(ART.S.towers[4].c, 800, 170);
      x.fillStyle = '#151d31'; x.fillRect(0, 420, LW, 120);
      x.fillStyle = '#0f1626'; x.fillRect(0, 420, LW, 5);
      for (let i = 0; i < 16; i++) { x.fillStyle = '#2a3450'; x.fillRect(i * 62 + 10, 426, 30, 3); }
      ART.drawKaiju(x, { x: 330, feet: 490, s: 11, g, walking: g < RAMP.dustOff ? 1 : 0, sil: '#232c44', glow: '#46619e', glowA: 0.3 });
      if (g > RAMP.dustOff && g < RAMP.dustOff + 0.9) {
        const u = (g - RAMP.dustOff) / 0.9;
        x.fillStyle = `rgba(200,205,220,${(1 - u) * 0.5})`;
        for (let i = 0; i < 6; i++) x.fillRect(370 + i * 6, 120 - u * 30 + Math.sin(i) * 4, 3, 3);
      }
      for (let i = 0; i < 7; i++) {
        const r = ART.S.band[i % 5];
        const cy = 404 - (i % 3) * 14;
        const cx = ((hash(i * 13) * 1100) + (g - 4.55) * (120 + hash(i) * 70)) % 1150 - 90;
        if (cx < -60 || cx > 1020) continue;
        const sc = 1.1 + (i % 3) * 0.22;
        ART.shadow(x, cx, cy, 9 * sc, 0.3);
        A.drawRemy(x, r, cx, cy, { ...ART.runPose(g + i * 1.7, 1 + hash(i) * 0.3), sx: sc, sy: sc, flip: true });
      }
      const catBalded = g > RAMP.charge;
      const catx = ((260 + g * 150) % 1100) - 60;
      if (catx > -30 && catx < 990) drawCat(x, catx, 419, g, catBalded);
      if (catBalded && g < RAMP.charge + 1) {
        const u = g - RAMP.charge;
        x.fillStyle = `rgba(120,100,90,${clamp(1 - u, 0, 0.8)})`;
        for (let i = 0; i < 8; i++) x.fillRect(catx + 4 + (hash(i * 3) - 0.5) * 30 * u, 411 - u * 40 - hash(i) * 12, 2, 2);
      }
      if (g > 7.4) {
        const enter = seg(g, 7.4, 8.4);
        for (let i = 0; i < 3; i++) {
          const txx = 620 + i * 78 + (1 - enter) * 160, tyy = 424 - i * 3;
          const fired = g >= RAMP.tanks[i];
          x.save(); x.translate(txx, tyy); x.scale(-1.5, 1.5); // turret faces the monster (left)
          if (fired && g - RAMP.tanks[i] < 0.25) x.translate(3 * (1 - (g - RAMP.tanks[i]) / 0.25), 0);
          x.drawImage(ART.S.tank, -40, -16);
          x.restore();
          if (fired && g - RAMP.tanks[i] < 0.18) {
            x.globalCompositeOperation = 'lighter';
            x.fillStyle = 'rgba(255,220,140,0.95)';
            x.beginPath(); x.arc(txx - 58, tyy - 13, 5 + (g - RAMP.tanks[i]) * 60, 0, 7); x.fill();
            x.globalCompositeOperation = 'source-over';
          }
          if (fired && g - RAMP.tanks[i] < 0.7) {
            const u = (g - RAMP.tanks[i]) / 0.7;
            const px = lerp(txx - 56, 360, u), py = lerp(tyy - 13, 330, u) - Math.sin(u * Math.PI) * 70;
            x.fillStyle = 'rgba(255,230,160,0.9)'; x.fillRect(px - 1, py - 1, 3, 3);
            x.fillStyle = 'rgba(255,230,160,0.35)'; x.fillRect(px + 4, py + 2, 5, 2);
            if (u > 0.9) {
              x.fillStyle = `rgba(210,215,230,${1 - (u - 0.9) * 10})`;
              x.beginPath(); x.arc(360, 330, 6 + (u - 0.9) * 80, 0, 7); x.fill();
            }
          }
        }
      }
    } else if (g < 16) { // — the POLISH RAY
      x.drawImage(ART.S.sky, -30, -60);
      x.fillStyle = '#0d1424'; x.fillRect(0, 130, LW, 410);
      x.fillStyle = '#151d31'; x.fillRect(0, 452, LW, 88);
      const tow = ART.S.towers[2];
      const tx = 512, groundY = 460;
      const hit = RAMP.beamHit;
      if (g <= hit + 0.15) {
        x.drawImage(tow.c, tx, groundY - tow.h);
        const gleam = seg(g, RAMP.beam, hit); // builds while the beam bears down
        if (gleam > 0) {
          const flick = g > hit ? 0.6 + 0.4 * Math.sin(t * 44) : 1; // cracks strobe before the collapse
          x.globalAlpha = gleam * 0.85 * flick;
          x.globalCompositeOperation = 'lighter';
          x.fillStyle = '#eaf2ff'; x.fillRect(tx, groundY - tow.h, tow.w, tow.h);
          x.globalCompositeOperation = 'source-over';
          x.globalAlpha = 1;
        }
      } else {
        ART.rubbleMound(x, tx + tow.w / 2, groundY, tow.w + 20, g - hit);
        ART.shatter(x, g, hit + 0.15, tx, groundY - tow.h, tow.w, tow.h, 37);
        ART.dustPuffs(x, g, [{ g: hit + 0.15, x: tx + tow.w / 2, y: groundY - 30, seed: 91, life: 2.6 }]);
      }
      x.drawImage(ART.S.towers[4].c, 790, groundY - 260);
      const charge = seg(g, RAMP.charge, RAMP.beam);
      const monsterX = g < 12.4 ? rampX(g) : 430;
      // continuous slow push from the beam to the end of the block keeps the tail alive
      const push = 1 + 0.05 * seg(g, RAMP.beam, 17);
      x.translate(480, 270); x.scale(push, push); x.translate(-480, -270);
      const dome = ART.drawKaiju(x, {
        x: monsterX, feet: 640, s: 5.0, g, walking: g < 12.4 ? 1 : 0,
        eyeGlow: clamp(charge + 0.4, 0, 1) * (g < 14.6 ? 1 : 0.3 + 0.15 * Math.sin(t * 3)),
        charge: charge * (1 - seg(g, RAMP.sweepEnd, RAMP.sweepEnd + 0.3)),
        sy: 1 + 0.007 * Math.sin(t * 1.3), // breathing
      });
      if (g >= RAMP.beam && g <= RAMP.sweepEnd) {
        const u = E.outQuad(seg(g, RAMP.beam, RAMP.sweepEnd));
        const ang = lerp(1.02, 0.3, u); // bears down onto the tower face, then rakes off it
        ART.drawBeam(x, t, {
          x0: dome.x, y0: dome.y,
          x1: dome.x + Math.cos(ang) * 560, y1: dome.y + Math.sin(ang) * 560,
          w: 7, a: clamp(1 - seg(g, RAMP.sweepEnd - 0.3, RAMP.sweepEnd), 0, 1),
        });
      }
      const j = jetPath(g);
      if (j.x > -40 && j.y < 500) {
        x.save(); x.translate(j.x, j.y); x.rotate(j.rot);
        x.drawImage(ART.S.jet, -13, -6);
        if (j.down) {
          x.fillStyle = 'rgba(255,150,70,0.9)'; x.fillRect(11, 4, 3, 3);
          x.fillStyle = 'rgba(160,160,175,0.4)';
          for (let i = 1; i < 5; i++) x.fillRect(12 + i * 5, 6 + i * 7 + hash(i + Math.floor(g * 20)) * 4, 4, 4);
        }
        x.restore();
      }
      ART.seaRows(x, { horizon: 462, t, palette: ['#131b30', '#0f1628', '#16203c', '#0c1222'] });
      // aftermath: rubble fire + bright sweeping searchlights keep the tail alive
      if (g > RAMP.sweepEnd) {
        x.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const fl = 0.5 + 0.5 * Math.sin(t * 9 + i * 2.4);
          const fxx = 500 + i * 44, fyy = 446 - i * 8;
          const gr = x.createRadialGradient(fxx, fyy, 2, fxx, fyy, 30 + fl * 14);
          gr.addColorStop(0, `rgba(255,155,60,${0.5 * fl})`); gr.addColorStop(1, 'rgba(255,90,40,0)');
          x.fillStyle = gr; x.fillRect(fxx - 48, fyy - 48, 96, 96);
        }
        for (let i = 0; i < 2; i++) {
          const ang = Math.sin(t * 0.95 + i * 2.1) * 0.55 - Math.PI / 2 + (i ? 0.4 : -0.4);
          const ox = i ? 60 : 900;
          x.save();
          x.translate(ox, 472);
          x.rotate(ang);
          const bg = x.createLinearGradient(0, 0, 0, -430);
          bg.addColorStop(0, 'rgba(205,225,255,0.3)'); bg.addColorStop(1, 'rgba(205,225,255,0)');
          x.fillStyle = bg;
          x.beginPath(); x.moveTo(-8, 0); x.lineTo(-95, -430); x.lineTo(95, -430); x.lineTo(8, 0); x.closePath(); x.fill();
          x.restore();
        }
        x.globalCompositeOperation = 'source-over';
      }
    } else { // — hero wide: the squad watches (slow zoom keeps the hold alive)
      x.save();
      const hz = 1 + 0.055 * seg(g, 17, 19.3);
      x.translate(480, 250); x.scale(hz, hz); x.translate(-480, -250);
      x.drawImage(ART.S.sky, -30, -30);
      x.fillStyle = 'rgba(96,38,22,0.22)'; x.fillRect(0, 0, LW, 471); // fire-lit sky wash
      x.drawImage(ART.S.skyline, -20, 208, 1160, 268);
      x.globalCompositeOperation = 'lighter';
      for (const [fx, fy, fr] of [[470, 448, 96], [560, 458, 64], [820, 448, 74]]) {
        const flick = 0.5 + 0.5 * Math.sin(t * 7 + fx);
        const gr = x.createRadialGradient(fx, fy, 4, fx, fy, fr);
        gr.addColorStop(0, `rgba(255,140,60,${0.55 * flick})`); gr.addColorStop(1, 'rgba(255,90,40,0)');
        x.fillStyle = gr; x.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
      }
      // a slow roaming fire-light washes the skyline
      const roam = 480 + Math.sin(t * 0.5) * 260;
      const rgr = x.createRadialGradient(roam, 400, 20, roam, 400, 300);
      rgr.addColorStop(0, 'rgba(255,120,50,0.13)'); rgr.addColorStop(1, 'rgba(255,120,50,0)');
      x.fillStyle = rgr; x.fillRect(roam - 300, 120, 600, 340);
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#0c1220'; x.fillRect(0, 448, LW, 92);
      ART.seaRows(x, { horizon: 452, t, glintX: 742, glintA: 0.12 });
      ART.embers(x, t);
      // drifting smoke + fog keep the resolve alive
      for (let i = 0; i < 5; i++) {
        x.fillStyle = `rgba(40,44,58,${0.4 - i * 0.06})`;
        const sx = ((i * 197 + t * 26) % 1200) - 120;
        x.beginPath(); x.ellipse(sx, 420 - i * 22 - ((t * 16 + i * 40) % 50), 52 + i * 13, 17, 0, 0, 7); x.fill();
      }
      x.fillStyle = 'rgba(70,60,72,0.10)';
      x.beginPath(); x.ellipse(((t * 14) % 1400) - 200, 300, 260, 40, 0, 0, 7); x.fill();
      ART.drawKaiju(x, {
        x: 430, feet: 560, s: 3.9, g, walking: 0, eyeGlow: 0.5 + 0.2 * Math.sin(t * 2.2),
        sil: ART.S.kaijuSil, alpha: 0.94, glow: '#c96a3a', glowA: 0.25,
        rot: Math.sin(t * 0.7) * 0.012, sy: 1 + 0.008 * Math.sin(t * 1.1),
      });
      x.drawImage(ART.S.roof, 0, 370);
      x.fillStyle = '#0a0d18'; x.fillRect(0, 362, LW, 12);
      for (let i = 0; i < 5; i++) {
        const r = ART.S.band[i];
        const pace = i === 2 ? Math.sin(t * 0.85) * 9 : 0; // Silver paces the rooftop
        A.drawRemy(x, { ...r, c: ART.silhouette(r, '#0d1120') }, 560 + i * 62 + pace, 408 + (i % 2) * 3, {
          sx: 1.7, sy: 1.7, flip: true,
          lean: (i === 0 ? -0.02 : 0.01) + Math.sin(t * 1.3 + i * 1.9) * 0.012,
          glow: '#d98a4a', glowA: 0.18,
        });
      }
      x.restore();
    }
  },

  // ACT IV — THE PLAN ---------------------------------------------------------
  lab(x, lt, t) {
    if (lt < LAB.convoy - T.lab) {
      x.drawImage(ART.S.lab, 0, 0);
      // lights flicker on as we cut in
      if (lt < 0.45) {
        const step = hash(Math.floor(lt * 26)) > 0.45 ? 1 : 0.25;
        x.fillStyle = `rgba(2,4,8,${0.8 * (1 - seg(lt, 0.05, 0.45)) * step})`;
        x.fillRect(0, 0, LW, LH);
      }
      const bp = seg(lt, LAB.blueprint[0] - T.lab, LAB.blueprint[1] - T.lab);
      const bx = 100, by = 66, bw = 300, bh = 226;
      x.fillStyle = '#0a1c30'; x.fillRect(bx, by, bw, bh);
      x.strokeStyle = '#1e3a56'; x.lineWidth = 3; x.strokeRect(bx, by, bw, bh);
      x.save();
      x.beginPath(); x.rect(bx + 4, by + 4, bw - 8, bh - 8); x.clip();
      x.strokeStyle = '#7fb2d8'; x.fillStyle = '#7fb2d8'; x.lineWidth = 2;
      const strokes = [
        [0.05, () => x.strokeRect(bx + 40, by + 70, 170, 26)],
        [0.22, () => { x.beginPath(); x.arc(bx + 250, by + 120, 42, 0, 7); x.stroke(); }],
        [0.38, () => { for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(bx + 78 + i * 44, by + 83, 12, 0, 7); x.stroke(); } }],
        [0.52, () => { x.beginPath(); x.moveTo(bx + 120, by + 96); x.lineTo(bx + 96, by + 140); x.lineTo(bx + 152, by + 140); x.closePath(); x.stroke(); }],
        [0.66, () => {
          x.beginPath(); x.moveTo(bx + 250, by + 76); x.quadraticCurveTo(bx + 210, by + 60, bx + 176, by + 76); x.stroke();
          x.beginPath(); x.moveTo(bx + 176, by + 76); x.lineTo(bx + 182, by + 72); x.moveTo(bx + 176, by + 76); x.lineTo(bx + 182, by + 80); x.stroke();
        }],
        [0.78, () => {
          x.beginPath(); x.moveTo(bx + 40, by + 116); x.lineTo(bx + 210, by + 116); x.stroke();
          for (const dxx of [40, 210]) { x.beginPath(); x.moveTo(bx + dxx, by + 110); x.lineTo(bx + dxx, by + 122); x.stroke(); }
        }],
      ];
      for (const [g0, fn] of strokes) if (bp > g0) { x.globalAlpha = clamp((bp - g0) / 0.08, 0, 1); fn(); }
      x.globalAlpha = clamp((bp - 0.25) / 0.2, 0, 1);
      x.font = '13px "JetBrains Mono"'; x.fillStyle = '#a9d3ef';
      x.fillText('FLOW CANNON MK-I', bx + 12, by + 22);
      x.fillText('TONIC 10,000x', bx + 12, by + 210);
      x.globalAlpha = 1;
      x.restore();
      // bench + beakers (left end, clear of the sprites)
      x.fillStyle = '#1e303c'; x.fillRect(500, 306, 410, 12);
      for (let i = 0; i < 3; i++) {
        const bxx = 520 + i * 45, byy = 306;
        x.fillStyle = 'rgba(160,200,230,0.25)'; x.fillRect(bxx, byy - 26, 26, 26);
        x.fillStyle = ['#2c7a3f', '#b5486a', '#3a6ab0'][i];
        x.fillRect(bxx + 2, byy - 12 + Math.sin(t * 2 + i) * 1.5, 22, 12);
        x.strokeStyle = '#9db8cc'; x.lineWidth = 2; x.strokeRect(bxx, byy - 26, 26, 26);
        x.globalCompositeOperation = 'lighter';
        for (let b = 0; b < 4; b++) {
          const bu = (t * 1.4 + hash(i * 7 + b)) % 1;
          x.fillStyle = `rgba(220,240,250,${0.75 - bu * 0.6})`;
          x.beginPath(); x.arc(bxx + 6 + hash(i + b) * 14, byy - 3 - bu * 21, 1.8, 0, 7); x.fill();
        }
        x.globalCompositeOperation = 'source-over';
      }
      // status LEDs blink along the bench
      for (let i = 0; i < 6; i++) {
        const on = hash(i + Math.floor(t * 2.2)) > 0.4;
        x.fillStyle = on ? (i % 2 ? '#57e07a' : '#e0b04a') : '#1a2833';
        x.fillRect(510 + i * 66, 300, 4, 4);
      }
      // squad: Silver at the board (facing it), the rest along the bench
      const band = ART.S.band;
      A.drawRemy(x, band[2], 480, 334, { sx: 2.2, sy: 2.2, flip: true, lean: 0.05 });
      A.drawRemy(x, band[1], 660, 338, { sx: 2.1, sy: 2.1 });
      A.drawRemy(x, band[3], 738, 342, { sx: 2.1, sy: 2.1, lean: 0.04 });
      A.drawRemy(x, band[4], 880, 334, { sx: 2.0, sy: 2.0 });
      ART.shadow(x, 480, 334, 18, 0.35); ART.shadow(x, 660, 338, 18, 0.35);
      ART.shadow(x, 738, 342, 18, 0.35); ART.shadow(x, 880, 334, 17, 0.35);
      // member cards (kept above the letterbox line: text must end by y≈470)
      const fade = 1 - seg(lt, 60.0, 60.5);
      for (let i = 0; i < 5; i++) {
        const id = TL.CAST.BAND[i];
        const p = clamp(seg(lt, LAB.cards[0] - T.lab + i * 0.4, LAB.cards[0] - T.lab + i * 0.4 + 0.4), 0, 1);
        if (p <= 0 || fade <= 0) continue;
        const sc = E.outBack(p);
        const cxx = 150 + i * 168, cyy = 388;
        x.save();
        x.globalAlpha = fade * clamp(p * 3, 0, 1);
        x.translate(cxx, cyy);
        x.scale(sc, sc);
        const pc = ART.PCROP[id], img = ART.S.portraits[id];
        x.save();
        x.beginPath(); x.arc(0, 0, 44, 0, 7); x.clip();
        if (id === 4) x.filter = 'brightness(1.45)'; // Moss's original renders dark
        x.drawImage(img, pc.cx - pc.r, pc.cy - pc.r, pc.r * 2, pc.r * 2, -44, -44, 88, 88);
        x.restore();
        x.strokeStyle = '#2c7a3f'; x.lineWidth = 3;
        x.beginPath(); x.arc(0, 0, 46, 0, 7); x.stroke();
        const nm = TL.NAMES[id];
        x.font = '700 14px "JetBrains Mono"'; x.fillStyle = '#dfe9f5'; x.textAlign = 'center';
        x.fillText(nm[0], 0, 62);
        x.font = '10px "JetBrains Mono"'; x.fillStyle = '#7f97ad';
        x.fillText(nm[1], 0, 76);
        x.textAlign = 'left';
        x.restore();
      }
    } else {
      const clt = lt - (LAB.convoy - T.lab);
      const g = x.createLinearGradient(0, 0, 0, 400);
      g.addColorStop(0, '#2a2550'); g.addColorStop(0.5, '#8a4a52'); g.addColorStop(0.82, '#d8845a'); g.addColorStop(1, '#f2b065');
      x.fillStyle = g; x.fillRect(0, 0, LW, 400);
      // low warm sun in a sky gap, above the skyline
      x.globalCompositeOperation = 'lighter';
      const sgr = x.createRadialGradient(640, 256, 10, 640, 256, 120);
      sgr.addColorStop(0, 'rgba(255,190,110,0.8)'); sgr.addColorStop(1, 'rgba(255,190,110,0)');
      x.fillStyle = sgr; x.fillRect(520, 136, 240, 240);
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#ffc46a';
      x.beginPath(); x.arc(640, 256, 38, 0, 7); x.fill();
      for (let i = 0; i < 4; i++) {
        x.fillStyle = `rgba(60,40,70,${0.5 - i * 0.1})`;
        x.beginPath(); x.ellipse(120 + i * 240, 120 + Math.sin(i * 2) * 26, 90, 11, 0, 0, 7); x.fill();
      }
      x.globalAlpha = 0.92;
      x.drawImage(ART.S.skyline, -20, 168, 1160, 268);
      x.globalAlpha = 1;
      ART.drawKaiju(x, { x: 300, feet: 414, s: 1.9, g: clt, sil: ART.S.kaijuSil, alpha: 0.85 });
      x.fillStyle = '#3a2c34'; x.fillRect(0, 404, LW, 16);
      x.fillStyle = '#20242e'; x.fillRect(0, 420, LW, 120);
      x.fillStyle = '#565c6e';
      for (let i = 0; i < 12; i++) {
        const dash = ((i * 90 - clt * 260) % 1140 + 1140) % 1140 - 60;
        x.fillRect(dash, 444, 34, 4);
      }
      for (let i = 0; i < 3; i++) {
        const txx = -90 + i * 170 + clt * 175, ty = 434 + Math.sin(clt * 9 + i * 2) * 1.4;
        x.drawImage(ART.S.truck, txx, ty - 26);
        x.globalCompositeOperation = 'lighter';
        const gr = x.createRadialGradient(txx + 62, ty - 10, 2, txx + 62, ty - 10, 46);
        gr.addColorStop(0, 'rgba(255,230,150,0.55)'); gr.addColorStop(1, 'rgba(255,230,150,0)');
        x.fillStyle = gr; x.fillRect(txx + 16, ty - 56, 92, 92);
        x.globalCompositeOperation = 'source-over';
        x.fillStyle = 'rgba(120,100,90,0.25)';
        for (let d = 0; d < 3; d++) x.fillRect(txx - 8 - d * 10 - (clt * 40 % 10), ty, 6, 3);
      }
    }
  },

  // ACT V — THE BATTLE --------------------------------------------------------
  battle(x, lt, t) {
    const w = BATTLE_CLOCK.warp(lt), g = w.g;
    const [shx, shy] = ART.shakeOf(t, TL.SHAKES);
    x.translate(shx * 0.6, shy * 0.6);
    // camera pushes up with Crimson's leap to frame the strike on the dome
    const camY = 110 * (seg(g, BATTLE.leap, BATTLE.strike) - seg(g, 7.2, 8.2));
    x.translate(0, camY);
    x.drawImage(ART.S.sky, -30, -40);
    ART.cloudSlabs(x, t * 2.2, 'rgba(22,28,52,0.9)');
    x.drawImage(ART.S.skyline, -20, 128, 1160, 268);
    ART.seaRows(x, { horizon: 392, t, glintX: 742, glintA: 0.16 });
    const back = 46 * E.outCubic(seg(g, BATTLE.stagger, BATTLE.stagger + 1.2));
    const adv = lerp(250, 330, seg(g, 0, 9));
    const mxx = adv - back;
    const charge = seg(g, BATTLE.charge, BATTLE.beam);
    const calm = seg(g, BATTLE.grow[0], BATTLE.grow[2] + 0.4);
    const maneP = seg(g, BATTLE.grow[0], 11.0);
    const bowP = E.outCubic(seg(g, BATTLE.bow, BATTLE.bow + 1.2));
    const dome = ART.drawKaiju(x, {
      x: mxx, feet: 600, s: 5.2, g,
      walking: g < 9 ? 1 : 0,
      eyeGlow: clamp(0.4 + charge, 0, 1) * (1 - calm),
      charge: charge * (1 - seg(g, BATTLE.grow[0], BATTLE.grow[0] + 0.6)),
      mane: maneP, wind: 0.6 + calm * 0.8 - bowP * 0.5,
      lean: 0.05 * (g > BATTLE.shellHit ? Math.exp(-(g - BATTLE.shellHit) * 2) : 0),
      rot: bowP * 0.14, sy: 1 - 0.08 * bowP, // the bow: tips toward the rooftop and sinks
    });
    if (g > BATTLE.strike) {
      x.strokeStyle = `rgba(240,248,255,${0.8 - calm * 0.8})`; x.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        x.beginPath();
        x.moveTo(dome.x - 14 + i * 9, dome.y + 16);
        x.lineTo(dome.x - 12 + i * 9 + hash(i) * 8, dome.y + 30 + hash(i + 3) * 12);
        x.stroke();
      }
    }
    if (g >= BATTLE.beam && g <= BATTLE.strike + 0.4) {
      const u = seg(g, BATTLE.beam, BATTLE.leap);
      const tgx = lerp(430, 690, u), tgy = lerp(360, 300, u);
      const a = clamp(1 - seg(g, BATTLE.strike, BATTLE.strike + 0.4), 0, 1);
      ART.drawBeam(x, t, { x0: dome.x, y0: dome.y, x1: tgx, y1: tgy, w: 6, a });
      if (g > BATTLE.beam + 0.6) {
        x.fillStyle = `rgba(30,26,40,${0.5 * a})`;
        x.fillRect(430, 424, (tgx - 430) * 0.7, 4);
      }
    }
    x.drawImage(ART.S.roof, 0, 420);
    x.fillStyle = '#0d101b'; x.fillRect(0, 412, LW, 10);
    const aim = clamp(0.4 + seg(g, 0, BATTLE.cannonFire) * 0.6, 0, 1);
    const fire = g >= BATTLE.cannonFire && g < BATTLE.cannonFire + 0.4 ? g - BATTLE.cannonFire : -1;
    ART.drawCannon(x, 716, 432, 1.35, aim, Math.max(0, fire), t);
    const band = ART.S.band;
    const duck = g > BATTLE.beam + 0.4 && g < BATTLE.leap ? 0.08 : 0;
    A.drawRemy(x, band[4], 810, 446, { sx: 1.8, sy: 1.8, flip: true, lean: 0.05 + duck });
    A.drawRemy(x, band[3], 866, 450, { sx: 1.8, sy: 1.8, flip: true, lean: 0.03 + duck });
    A.drawRemy(x, band[1], 622, 448, { sx: 1.8, sy: 1.8, flip: true, lean: -0.02 + duck });
    const cx = 560, cy = 442;
    if (g < BATTLE.leap) {
      const parry = g > BATTLE.parry - 0.25 && g < BATTLE.parry + 0.35;
      A.drawRemy(x, band[0], cx, cy, {
        sx: 2.0, sy: 2.0, flip: true,
        lean: -0.1 * seg(g, BATTLE.beam, BATTLE.parry) - (parry ? 0.06 : 0),
        lift: parry ? [3, 0] : [0, 0],
        glow: parry ? '#9fd0ff' : null, glowA: parry ? 0.5 : 0,
      });
      if (parry) {
        x.globalCompositeOperation = 'lighter';
        const u = (g - BATTLE.parry + 0.25) / 0.6;
        for (let i = 0; i < 8; i++) {
          const sa = hash(i * 9) * 7;
          x.fillStyle = `rgba(200,230,255,${(1 - u) * 0.9})`;
          x.fillRect(cx + 14 + Math.cos(sa) * u * 44, cy - 66 + Math.sin(sa) * u * 44, 3, 3);
        }
        x.globalCompositeOperation = 'source-over';
      }
    } else if (g < BATTLE.strike + 0.7) {
      const lu = seg(g, BATTLE.leap, BATTLE.strike);
      const q = (a, b, c, u) => lerp(lerp(a, b, u), lerp(b, c, u), u);
      const lx = q(cx, 420, dome.x + 10, lu), ly = q(cy, 130, dome.y + 8, lu);
      for (let i = 3; i >= 1; i--) {
        const tu = clamp(lu - i * 0.05, 0, 1);
        A.drawRemy(x, band[0], q(cx, 420, dome.x + 10, tu), q(cy, 130, dome.y + 8, tu),
          { sx: 2.0, sy: 2.0, flip: true, rot: -0.9, alpha: 0.16 * (4 - i), white: true });
      }
      A.drawRemy(x, band[0], lx, ly, { sx: 2.0, sy: 2.0, flip: true, rot: -0.9 + lu * 0.5 });
      if (w.stop && g === BATTLE.strike) {
        x.globalCompositeOperation = 'lighter';
        const sl = w.sl;
        for (let i = 0; i < 14; i++) {
          const sa = hash(i * 7) * 7, sp2 = 60 + hash(i * 11) * 130;
          x.fillStyle = `rgba(255,240,200,${clamp(1 - sl * 3, 0, 0.95)})`;
          x.fillRect(dome.x + Math.cos(sa) * sp2 * sl * 3, dome.y + Math.sin(sa) * sp2 * sl * 3, 4, 4);
        }
        x.globalCompositeOperation = 'source-over';
      }
    } else {
      const low = seg(g, BATTLE.bow, BATTLE.bow + 1.4);
      A.drawRemy(x, band[0], cx + 26, cy, { sx: 2.0, sy: 2.0, flip: true, lean: -0.08 + low * 0.1 });
    }
    if (g >= BATTLE.cannonFire && g < BATTLE.shellHit) {
      const u = E.inQuad(seg(g, BATTLE.cannonFire, BATTLE.shellHit));
      const q = (a, b, c) => lerp(lerp(a, b, u), lerp(b, c, u), u);
      const chest = chestOf(mxx);
      const gx = q(660, 470, chest.x), gy = q(320, 130, chest.y);
      x.globalCompositeOperation = 'lighter';
      x.fillStyle = 'rgba(110,230,130,0.95)';
      x.beginPath(); x.arc(gx, gy, 11, 0, 7); x.fill();
      x.fillStyle = 'rgba(110,230,130,0.35)';
      x.beginPath(); x.arc(gx, gy, 18, 0, 7); x.fill();
      x.globalCompositeOperation = 'source-over';
      for (let i = 1; i < 4; i++) {
        x.fillStyle = `rgba(110,230,130,${0.5 - i * 0.12})`;
        x.beginPath(); x.arc(gx - (gx - 660) * i * 0.03, gy + i * 5, 6 - i, 0, 7); x.fill();
      }
    }
    if (g >= BATTLE.shellHit && g < BATTLE.shellHit + 1.2) {
      const chest = chestOf(mxx);
      ART.bits(x, g, { g: BATTLE.shellHit, x: chest.x, y: chest.y, seed: 77, bits: 22, spread: 200, up: 130, floor: 620 }, '120,235,140', 320);
      x.globalCompositeOperation = 'lighter';
      const u = (g - BATTLE.shellHit) / 1.2;
      x.fillStyle = `rgba(120,235,140,${(1 - u) * 0.35})`;
      x.beginPath(); x.arc(chest.x, chest.y, 20 + u * 90, 0, 7); x.fill();
      x.globalCompositeOperation = 'source-over';
    }
  },

  // ACT VI — THE DAWN ---------------------------------------------------------
  dawn(x, lt, t) {
    const g = x.createLinearGradient(0, 0, 0, 360);
    g.addColorStop(0, '#241f4e'); g.addColorStop(0.45, '#7a4050'); g.addColorStop(0.78, '#c8704a'); g.addColorStop(1, '#ffb765');
    x.fillStyle = g; x.fillRect(0, 0, LW, 360);
    const sunY = 322 - seg(lt, 0, 8) * 44;
    x.fillStyle = '#ffe2a8';
    x.beginPath(); x.arc(700, sunY, 30, 0, 7); x.fill();
    x.globalCompositeOperation = 'lighter';
    const gr = x.createRadialGradient(700, sunY, 20, 700, sunY, 150);
    gr.addColorStop(0, 'rgba(255,190,110,0.5)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
    x.fillStyle = gr; x.fillRect(550, sunY - 150, 300, 300);
    x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 4; i++) {
      x.fillStyle = `rgba(90,50,80,${0.55 - i * 0.12})`;
      x.beginPath(); x.ellipse(140 + i * 230, 90 + i * 26, 100, 11, 0, 0, 7); x.fill();
    }
    const dep = E.inOutCubic(seg(lt, DAWN.away[0] - 78, DAWN.away[1] - 78));
    const mx = lerp(560, 330, dep);
    const s = lerp(2.9, 2.2, dep);
    ART.drawKaiju(x, { x: mx, feet: 520, s, g: lt, flip: true, mane: 1, wind: 1.3, walking: 0.35 });
    ART.seaRows(x, {
      horizon: 340, t: lt, glintX: 700, glintA: 0.5, glintColor: 'rgba(255,214,140,ALPHA)',
      palette: ['#6a3c56', '#8a4a58', '#b0605c', '#d8866a'],
    });
    x.fillStyle = '#241a20'; x.fillRect(770, 438, 190, 10);
    for (let i = 0; i < 4; i++) { x.fillStyle = '#1a1218'; x.fillRect(780 + i * 48, 448, 8, 24); }
    const nodP = E.outBack(clamp((lt - (DAWN.nod - 78)) / 0.5, 0, 1)) * clamp(1 - (lt - (DAWN.nod - 78) - 1.1) / 0.5, 0, 1);
    for (let i = 0; i < 5; i++) {
      const r = ART.S.band[i];
      const px = 796 + i * 36, py = 436;
      x.fillStyle = 'rgba(20,10,16,0.4)';
      x.beginPath(); x.ellipse(px, py + 1, 16, 4, 0, 0, 7); x.fill();
      // warm rim light behind each silhouette so the squad reads against the dark
      A.drawRemy(x, { ...r, c: ART.silhouette(r, '#8a4636') }, px - 1, py - 2, {
        sx: 1.5, sy: 1.5, flip: true, alpha: 0.5,
        lean: (i === 0 ? -0.03 - nodP * 0.06 : 0.01) + Math.sin(t * 1.4 + i) * 0.006,
      });
      A.drawRemy(x, { ...r, c: ART.silhouette(r, '#2c1a24') }, px, py, {
        sx: 1.5, sy: 1.5, flip: true,
        lean: (i === 0 ? -0.03 - nodP * 0.06 : 0.01) + Math.sin(t * 1.4 + i) * 0.006,
      });
    }
    for (let i = 0; i < 3; i++) {
      const wing = Math.sin(t * 7 + i * 2) * 3;
      x.strokeStyle = 'rgba(50,32,40,0.8)'; x.lineWidth = 1.5;
      const gxx = 400 + i * 90 - Math.sin(t * 0.4 + i) * 60, gyy = 130 + i * 36 + Math.sin(t * 0.8 + i * 2) * 10;
      x.beginPath(); x.moveTo(gxx - 6, gyy); x.lineTo(gxx, gyy - wing); x.lineTo(gxx + 6, gyy); x.stroke();
    }
  },
};

// ---------- per-shot post ----------
const FX = {
  sea: () => ({ letterbox: 1, vignette: 1.0, grain: 0.014, bloom: 0.1, bloomThresh: 0.75, sat: 0.82, tint: [0.92, 0.97, 1.12], contrast: 1.04 }),
  news: () => ({ letterbox: 1, vignette: 0.9, grain: 0.012, bloom: 0.13, bloomThresh: 0.7, sat: 0.88 }),
  rampage: (lt) => ({
    letterbox: 1, vignette: 1.05, grain: 0.016, bloom: 0.12, bloomThresh: 0.72,
    sat: 0.85, warm: 0.08, streak: 0.08, exposure: 0.1,
    aber: RAMP_CLOCK.warp(lt).stop ? 0.0012 : 0,
  }),
  lab: () => ({ letterbox: 1, vignette: 0.8, grain: 0.012, bloom: 0.08, bloomThresh: 0.75, sat: 0.95, warm: 0.1 }),
  battle: (lt) => {
    const w = BATTLE_CLOCK.warp(lt);
    const wonder = seg(w.g, BATTLE.grow[0], BATTLE.grow[2] + 0.6);
    return {
      letterbox: 1, vignette: 1.0, grain: 0.015,
      bloom: lerp(0.1, 0.2, wonder), bloomThresh: 0.72,
      sat: lerp(0.85, 1.05, wonder), warm: wonder * 0.12, streak: 0.1,
      aber: w.stop ? 0.0014 : 0,
    };
  },
  dawn: (lt, t) => ({
    letterbox: 1, vignette: 0.7, grain: 0.012, bloom: 0.12, bloomThresh: 0.8,
    sat: 1.02, warm: 0.16, rays: 0.07, lightX: 0.73, lightY: 0.85,
    fade: seg(t, DAWN.fade, 89.8),
  }),
};

// ---------- film ----------
export default {
  title: 'BALDZILLA — a Remy Boys monster movie',
  output: 'baldzilla.mp4',
  duration: TL.DUR,
  async prepare() {
    await ART.load(TL);
  },
  shots: [
    { name: 'sea', t0: T.sea, t1: T.news, draw: (ctx, lt, dur, t, ov) => { stage(ctx, lt, t, 'sea'); titleCard(ov, t); }, fx: (lt) => FX.sea(lt) },
    { name: 'news', t0: T.news, t1: T.rampage, draw: (ctx, lt, dur, t, ov) => { stage(ctx, lt, t, 'news'); void ov; }, fx: (lt) => FX.news(lt) },
    { name: 'rampage', t0: T.rampage, t1: T.lab, draw: (ctx, lt, dur, t, ov) => { stage(ctx, lt, t, 'rampage'); void ov; }, fx: (lt) => FX.rampage(lt) },
    { name: 'lab', t0: T.lab, t1: T.battle, draw: (ctx, lt, dur, t, ov) => { stage(ctx, lt, t, 'lab'); stampCard(ov, t); }, fx: (lt) => FX.lab(lt) },
    { name: 'battle', t0: T.battle, t1: T.dawn, draw: (ctx, lt, dur, t, ov) => { stage(ctx, lt, t, 'battle'); void ov; }, fx: (lt, t) => FX.battle(lt, t) },
    { name: 'dawn', t0: T.dawn, t1: TL.DUR, draw: (ctx, lt, dur, t, ov) => { stage(ctx, lt, t, 'dawn'); endCard(ov, lt, t); }, fx: (lt, t) => FX.dawn(lt, t) },
  ],
  captions: [
    { id: 'n1', text: 'BREAKING — A GIANT DOME HAS SURFACED OFF FLOW CITY', t0: 14.5, t1: 18.3, style: 'dlg' },
    { id: 'n2', text: 'VIEWER FOOTAGE · FLOW HARBOR · UNVERIFIED', t0: 18.6, t1: 22.3, style: 'chip' },
    { id: 'n3', text: 'MAYOR: "REMAIN CALM AND STAY MOISTURIZED"', t0: 22.8, t1: 27.5, style: 'dlg' },
    { id: 'l1', text: 'PROJECT REGROWTH — FLOW TONIC AT 10,000× STRENGTH', t0: 49.0, t1: 53.6, style: 'dlg' },
    { id: 'l2', text: 'DELIVERY FOR A KING.', t0: 57.6, t1: 61.3, style: 'chip' },
    { id: 'b1', text: 'THE FLOW ANSWERS.', t0: 71.6, t1: 75.4, style: 'chip' },
    { id: 'd1', text: "HE WASN'T A MONSTER. HE WAS JUST COLD.", t0: 79.2, t1: 84.6, style: 'dlg' },
  ],
  captionStyles: {
    dlg: { font: F.grot, size: 38, weight: 600, color: '#e6ecf8', x: 960, y: 872, lineHeight: 1.3, anim: 'rise', in: 0.4, out: 0.3, shadow: 'rgba(0,0,0,0.85)' },
    chip: { font: F.mono, size: 30, weight: 600, color: '#cdd9ec', x: 960, y: 884, lineHeight: 1.3, anim: 'fade', in: 0.4, out: 0.3, track: 2, shadow: 'rgba(0,0,0,0.85)' },
  },
  flashes: TL.FLASHES,
  lint: { captionHold: 3, safe: { margin: 0.05, letterbox: true } },
  audio: { seed: 3470, reverb: 2.8, reverbGain: 0.38 },
  score,
};

function stage(ctx, lt, t, name) {
  const x = ART.beginLow();
  DRAWS[name](x, lt, t);
  ART.blit(ctx);
}
