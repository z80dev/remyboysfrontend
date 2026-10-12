// STILL HERE — scenes2.js: the second half of the trailer. Acts V–VIII (film 26–64).
// Every painter is a pure function of (lt, t) — deterministic, no state between frames.
// ctx = 1920×1080 scene canvas (the world); ov = overlay canvas (crisp trailer type only).
import { E, H, W, clamp, hash, lerp, seg } from "filmkit/lib.js";
import { ART, bsod, chart, counterPanel, flagMark, photo, slam, xpWindow } from "./art.js";
import { FLAG, LUNA } from "./timeline.js";

// ————————————————————————————————— helpers —————————————————————————————————

const hex = (h) => [
  Number.parseInt(h.slice(1, 3), 16),
  Number.parseInt(h.slice(3, 5), 16),
  Number.parseInt(h.slice(5, 7), 16),
];
const mix = (a, b, u) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], u))).join(",")})`;
};

// right-aligned letter-spaced line (canvas has no tracking)
function trackedR(c, s, x, y, sp) {
  const chars = [...s];
  const w = chars.reduce((a, ch) => a + c.measureText(ch).width + sp, -sp);
  let cx = x - w;
  for (const ch of chars) {
    c.fillText(ch, cx, y);
    cx += c.measureText(ch).width + sp;
  }
}

function vignette(c, cx, cy, inner, outer, alpha) {
  const g = c.createRadialGradient(cx, cy, inner, cx, cy, outer);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${alpha})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

// ————————————————————————————————— ACT V — the Cabald (26–34) —————————————————————————————————

export function drawDark(ctx, lt, t, ov) {
  // near-black with a red rim rising from the bottom
  ctx.fillStyle = "#07040a";
  ctx.fillRect(0, 0, W, H);
  const rim = ctx.createLinearGradient(0, H, 0, H * 0.5);
  rim.addColorStop(0, "rgba(158,20,14,0.55)");
  rim.addColorStop(1, "rgba(158,20,14,0)");
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, W, H);

  // — phase A (0–3): the Cabald wall, 48 balds in a 12×4 grid, sliding in row-staggered
  const wallA = 1 - seg(lt, 2.9, 3.5);
  if (wallA > 0) {
    ctx.save();
    ctx.globalAlpha = wallA;
    ctx.translate(Math.sin(t * 0.5) * 6, 0); // slow parallax drift
    const FILTER = "grayscale(0.55) brightness(0.62) contrast(1.15)"
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 10; col++) {
        const i = row * 10 + col
        if (i >= ART.cabald.length) break
        const d = E.outCubic(seg(lt, i * 0.035, i * 0.035 + 0.6))
        if (d <= 0) continue
        const m = ART.cabald[i]
        const x = 12 + col * 191 - 500 * (1 - d)
        const y = 316 + row * 176
        ctx.save()
        ctx.globalAlpha = wallA * clamp(d * 2, 0, 1)
        ctx.filter = FILTER
        ctx.fillStyle = m.pal.bg
        ctx.fillRect(x, y, 188, 172)
        ctx.drawImage(m.img, x + 2, y + 2, 184, 168)
        ctx.restore()
      }
    }
    // one red scan light sweeps the wall (1.2–2.6)
    const sp = seg(lt, 1.2, 2.6);
    if (sp > 0 && sp < 1) {
      const sx = lerp(-200, 2100, sp);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const sg = ctx.createLinearGradient(sx - 170, 0, sx + 170, 0);
      sg.addColorStop(0, "rgba(255,42,30,0)");
      sg.addColorStop(0.5, "rgba(255,64,42,0.32)");
      sg.addColorStop(1, "rgba(255,42,30,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(sx - 170, 190, 340, 700);
      ctx.restore();
    }
    ctx.restore();
    vignette(ctx, 960, 520, 380, 1150, 0.62 * wallA);
  }

  // — phase B (3–5.5): RUG LORD, dramatic push-in
  const bossA = seg(lt, 3.0, 3.6);
  if (bossA > 0 && lt < 5.5) {
    const shake = lt < 5 ? (hash(Math.floor(t * 13)) - 0.5) * 4 : 0;
    ctx.save();
    ctx.translate(shake, shake * 0.6);
    const zoom = 1 + 0.12 * seg(lt, 3, 5.5);
    ctx.globalAlpha = bossA;
    ctx.translate(960, 530);
    ctx.scale(zoom, zoom);
    ctx.translate(-960, -530);
    photo(ctx, ART.cabald[0], 680, 150, 560, { shadow: false })
    // red under-glow from the bottom
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const ug = ctx.createLinearGradient(0, 890, 0, 520);
    ug.addColorStop(0, "rgba(255,46,26,0.4)");
    ug.addColorStop(1, "rgba(255,46,26,0)");
    ctx.fillStyle = ug;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.restore();
    vignette(ctx, 960, 480, 240, 1060, 0.85 * bossA);
  }

  // name plate — slam is pure, call every frame to hold it (above the caption zone)
  if (lt < 5.5) {
    slam(ov, "RUG LORD", lt, 3.15, {
      size: 110,
      y: 790,
      color: "#ff4a3d",
      glowColor: "rgba(255,74,61,0.45)",
      sub: "CABALD · BOSS",
      subColor: "#ffb24d",
      subDy: 30,
      dur: 0.3,
    })
  }

  // — phase C (5.5–8): BSOD, with a dump that never quite finishes
  if (lt >= 5.5) {
    bsod(ctx, lt - 5.5);
    if (lt > 7.5) {
      const raw = (lt - 7.5) * 190;
      const pct = Math.min(99, Math.floor(raw + hash(Math.floor(raw * 0.5)) * 5));
      ctx.font = '24px "JetBrains Mono"';
      ctx.textAlign = "right";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(`collecting data ... ${pct}%`, 1848, 928);
    }
  }
}

// ————————————————————————————————— ACT VI — the floor (34–42) —————————————————————————————————

export function drawFloor(ctx, lt, t, ov) {
  const cast3 = [ART.cast.AMY, ART.cast.CARL, ART.cast.NURSE];
  const faller = (i) => {
    const remy = i % 4 === 2 ? cast3[i % 3] : ART.pool[i * 7];
    const size = 90 + hash(i * 3 + 1) * 60;
    const x = 280 + hash(i * 5 + 2) * 1360;
    const y = -300 + ((lt * (170 + hash(i) * 190)) % 1500);
    const a = clamp((y + 280) / 220, 0, 1) * clamp(1 - (y - 760) / 260, 0, 1);
    if (a <= 0) return;
    photo(ctx, remy, x, y, size, { rot: Math.sin(lt * 0.9 + i) * 0.35, alpha: a * 0.96 });
  };

  // impact judder, decaying over 0.6 s
  const judder = 1 - seg(lt, 3, 3.6);
  ctx.save();
  if (judder < 1)
    ctx.translate((hash(Math.floor(t * 17)) - 0.5) * 10 * judder, (hash(Math.floor(t * 17) + 5) - 0.5) * 7 * judder);

  // bg: cold void with a faint red horizon
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#05070d");
  bg.addColorStop(1, "#0d0714");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(960, 1020);
  ctx.scale(1, 0.32);
  const hz = ctx.createRadialGradient(0, 0, 0, 0, 0, 900);
  hz.addColorStop(0, "rgba(255,64,40,0.17)");
  hz.addColorStop(1, "rgba(255,64,40,0)");
  ctx.fillStyle = hz;
  ctx.fillRect(-960, -3200, 1920, 6400);
  ctx.restore();

  for (let i = 0; i < 11; i += 2) faller(i); // half the cards behind the chart

  // the crash — progress eased so the line lands as THE FLOOR slams (lt 3)
  chart(ctx, 240, 240, 1440, 520, E.outCubic(seg(lt, 0.4, 5.6)), { mode: "crash", jitter: true, label: "FLOOR" });

  for (let i = 1; i < 11; i += 2) faller(i); // the other half in front

  // dust burst + shockwave at the chart's floor point (1680, 687)
  const db = lt - 3;
  if (db > 0 && db < 1.1) {
    const IX = 1680;
    const IY = 687;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 40; k++) {
      const a = hash(k * 7 + 11) * Math.PI * 2;
      const sp = 120 + hash(k * 13 + 5) * 420;
      ctx.globalAlpha = clamp(1 - db / 0.9, 0, 1) * (0.3 + hash(k + 31) * 0.45);
      ctx.fillStyle = k % 4 === 0 ? "#e8c8a0" : "#c4b2a0";
      ctx.beginPath();
      ctx.arc(IX + Math.cos(a) * sp * db, IY + Math.sin(a) * sp * db, 1.5 + hash(k * 3 + 1) * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = clamp(1 - db / 0.7, 0, 1) * 0.5;
    ctx.strokeStyle = "#ffb08a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(IX, IY, 30 + 640 * db, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // after the landing: the line sits at the bottom, pulsing dim red
  if (lt > 5.6) {
    const pulse = 0.3 + 0.2 * Math.sin(t * 2);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(1680, 687, 0, 1680, 687, 230);
    g.addColorStop(0, `rgba(255,74,61,${pulse})`);
    g.addColorStop(1, "rgba(255,74,61,0)");
    ctx.fillStyle = g;
    ctx.fillRect(1400, 420, 560, 540);
    ctx.restore();
  }

  // the lights go down toward the cut
  const dark = seg(lt, 6.4, 8);
  if (dark > 0) vignette(ctx, 960, 540, 260, 1150, 0.72 * dark);
  ctx.restore();

  // dark backing so THE FLOOR reads over the chart line, fading as it settles
  const bk = seg(lt, 2.9, 3.3) * (1 - 0.55 * seg(lt, 4.2, 5.4))
  if (bk > 0) {
    const g = ctx.createRadialGradient(960, 545, 60, 960, 545, 760)
    g.addColorStop(0, `rgba(4,5,10,${0.6 * bk})`)
    g.addColorStop(1, "rgba(4,5,10,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  slam(ov, "THE FLOOR", lt, 3.0, { size: 160, y: 548, color: "#ff4a3d", dur: 0.35, glowColor: "rgba(255,74,61,0.5)" })
}

// ————————————————————————————————— ACT VII — recovery (42–52) —————————————————————————————————

export function drawRecovery(ctx, lt, t, ov) {
  const p = seg(lt, 0, 8); // dawn progress

  // dawn bg
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mix("#05070d", "#0a1a2e", p));
  bg.addColorStop(1, mix("#0d0714", "#2a3a5e", p));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // horizon gold
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(960, 1030);
  ctx.scale(1, 0.4);
  const hz = ctx.createRadialGradient(0, 0, 0, 0, 0, 1000);
  hz.addColorStop(0, `rgba(232,160,78,${0.05 + 0.34 * p})`);
  hz.addColorStop(1, "rgba(232,160,78,0)");
  ctx.fillStyle = hz;
  ctx.fillRect(-960, -2600, 1920, 5200);
  ctx.restore();

  // three god-ray streaks from the top-left, drifting
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const ang = 0.96 + i * 0.24 + Math.sin(t * 0.14 + i * 2.1) * 0.02;
    ctx.save();
    ctx.translate(120 + i * 210 + Math.sin(t * 0.1 + i) * 36, -60);
    ctx.rotate(ang);
    const rg = ctx.createLinearGradient(0, 0, 2100, 0);
    rg.addColorStop(0, `rgba(255,228,168,${0.06 * (0.3 + 0.7 * p)})`);
    rg.addColorStop(1, "rgba(255,228,168,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, 2100, 130 + i * 70);
    ctx.restore();
  }
  ctx.restore();

  // Remys rising behind the chart, warm-tinted
  ctx.save();
  ctx.filter = "sepia(0.15) saturate(1.1)";
  for (let i = 0; i < 12; i++) {
    const d0 = (i % 6) * 0.55;
    const u = seg(lt, d0, d0 + 9.5);
    if (u <= 0) continue;
    const m = ART.pool[(i * 17 + 5) % 160];
    const x = 90 + hash(i * 9 + 3) * 1740 + Math.sin(t * 0.7 + i * 1.9) * 22;
    photo(ctx, m, x, lerp(1000, 120, u), 84 + hash(i * 4 + 8) * 40, {
      rot: Math.sin(t * 0.5 + i) * 0.06,
      alpha: 0.42 * seg(lt, d0, d0 + 1.2),
      shadow: false,
    });
  }
  ctx.restore();

  // the V
  chart(ctx, 240, 240, 1440, 520, seg(lt, 0.2, 7.2), { mode: "recover", label: "fREMY" });

  // Recovery Center window slides up at lt 3 (film 45)
  if (lt >= 3) {
    const wy = 170 + 240 * (1 - E.outCubic(seg(lt, 3, 3.7)));
    xpWindow(
      ctx,
      1210,
      wy,
      580,
      540,
      "Recovery Center — RemyReclaim",
      (c, x, y, w, h, lt) => {
        c.font = '16px "JetBrains Mono"';
        c.textAlign = "left";
        c.textBaseline = "alphabetic";
        c.fillStyle = "#4a4638";
        c.fillText("wave 1 · wave 2 — RECLAIMED", x + 24, y + 32);
        // 4×2 grid of reclaimed Remys, green checks popping in staggered
        const gx = x + (w - (4 * 110 + 3 * 16)) / 2;
        for (let i = 0; i < 8; i++) {
          const px = gx + (i % 4) * 126;
          const py = y + 56 + Math.floor(i / 4) * 152;
          photo(c, ART.pool[(i * 19 + 13) % 160], px, py, 110, { shadow: false });
          const cp = E.outBack(seg(lt, 3.6 + i * 0.18, 3.92 + i * 0.18));
          if (cp > 0) {
            c.save();
            c.translate(px + 106, py + 4);
            c.scale(cp, cp);
            c.fillStyle = LUNA.ok;
            c.beginPath();
            c.arc(0, 0, 21, 0, Math.PI * 2);
            c.fill();
            c.strokeStyle = "#fff";
            c.lineWidth = 4.5;
            c.lineCap = "round";
            c.lineJoin = "round";
            c.beginPath();
            c.moveTo(-8, 1);
            c.lineTo(-2, 8);
            c.lineTo(9, -7);
            c.stroke();
            c.restore();
          }
        }
        // progress bar to 100% by lt 6.5, counting with it
        const frac = E.outCubic(seg(lt, 3.2, 6.5));
        const bx = x + 24;
        const bw = w - 48;
        const by = y + h - 44;
        c.fillStyle = "#d9d4c0";
        c.beginPath();
        c.roundRect(bx, by, bw, 16, 8);
        c.fill();
        if (frac > 0) {
          c.save();
          c.beginPath();
          c.roundRect(bx, by, bw, 16, 8);
          c.clip();
          const pg = c.createLinearGradient(bx, 0, bx + bw, 0);
          pg.addColorStop(0, "#3ddc84");
          pg.addColorStop(1, "#2b7a0b");
          c.fillStyle = pg;
          c.fillRect(bx, by, bw * frac, 16);
          c.restore();
        }
        c.font = '14px "JetBrains Mono"';
        c.textAlign = "right";
        c.fillStyle = "#4a4638";
        c.fillText(`${Math.round(frac * 4490).toLocaleString("en-US")} / 4,490`, bx + bw, by - 10);
      },
      lt,
    );
  }

  // reclaimed counter — mirrors the genesis counter landing on 4,490
  const ca = seg(lt, 2.6, 3.2)
  if (ca > 0) {
    ctx.save()
    ctx.globalAlpha = ca
    counterPanel(ctx)
    ctx.textAlign = "right"
    ctx.textBaseline = "alphabetic"
    ctx.font = '700 64px "JetBrains Mono"'
    ctx.shadowColor = "rgba(255,190,90,0.5)"
    ctx.shadowBlur = 26
    ctx.fillStyle = "#ffe9c2"
    ctx.fillText(Math.round(E.outExpo(seg(lt, 3, 8)) * 4490).toLocaleString("en-US"), 1790, 250)
    ctx.shadowBlur = 0
    ctx.font = '600 20px "Space Grotesk"'
    ctx.fillStyle = "#3ddc84"
    trackedR(ctx, "REMYS RECLAIMED", 1790, 288, 7)
    ctx.restore()
  }

  // swell toward the title
  const haze = seg(lt, 8, 10);
  if (haze > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,222,178,${0.11 * haze})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ————————————————————————————————— ACT VIII — the title (52–64) —————————————————————————————————

export function drawTitle(ctx, lt, t, ov) {
  // black void with a faint glow where the title lands
  ctx.fillStyle = "#040409";
  ctx.fillRect(0, 0, W, H);
  const cg = seg(lt, 0.35, 1.4);
  if (cg > 0) {
    const g = ctx.createRadialGradient(960, 490, 0, 960, 490, 660);
    g.addColorStop(0, `rgba(46,42,62,${0.5 * cg})`);
    g.addColorStop(1, "rgba(46,42,62,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // four flag-colour streaks burst outward from centre (0.05–0.45)
  const gp = seg(lt, 0.05, 0.45);
  const sa = 0.85 * (1 - seg(lt, 0.18, 0.55));
  if (gp > 0 && sa > 0) {
    const L = 1400 * E.outCubic(gp);
    const angs = [-Math.PI * 0.72, -Math.PI * 0.24, Math.PI * 0.24, Math.PI * 0.72];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    FLAG.forEach((c, i) => {
      ctx.globalAlpha = sa;
      ctx.strokeStyle = c;
      ctx.lineWidth = 11;
      ctx.shadowColor = c;
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.moveTo(960, 540);
      ctx.lineTo(960 + Math.cos(angs[i]) * L, 540 + Math.sin(angs[i]) * L);
      ctx.stroke();
    });
    ctx.restore();
  }

  // faint white motes drifting up under the titles
  const ma = 0.25 * seg(lt, 2.8, 3.6) * (1 - seg(lt, 8.3, 8.9));
  if (ma > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#fff";
    for (let k = 0; k < 46; k++) {
      const sp = 22 + hash(k * 7 + 2) * 34;
      const yy = (hash(k * 5 + 1) * 780 - (lt - 3) * sp) % 780;
      const x = (hash(k * 3 + 7) * 1920 + Math.sin(t * 0.4 + k) * 26 + 1920) % 1920;
      ctx.globalAlpha = ma * (0.4 + hash(k) * 0.6);
      ctx.beginPath();
      ctx.arc(x, 160 + (((yy % 780) + 780) % 780), 1.2 + hash(k * 11 + 4) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4-colour flag strip under the main title
  const fade = 1 - seg(lt, 8.5, 9.3);
  const sw = 640 * E.outCubic(seg(lt, 1.2, 2.4));
  if (sw > 0 && fade > 0) {
    ctx.save();
    ctx.globalAlpha = fade;
    const segw = sw / 4;
    FLAG.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(960 - 320 + i * segw, 560, segw + (i === 3 ? 0.5 : 0), 6);
    });
    ctx.restore();
  }

  // titles: slam pops until 8.5, then a manual fade-up-and-out replica
  if (lt < 8.5) {
    slam(ov, "REMY BOYS", lt, 0.5, { size: 235, y: 480, dur: 0.42 });
    slam(ov, "STILL HERE.", lt, 5.0, { size: 110, y: 690, color: "#ffbe1a", dur: 0.3 });
  } else if (fade > 0) {
    const dy = -46 * seg(lt, 8.5, 9.3);
    ov.save();
    ov.globalAlpha = fade;
    ov.textAlign = "center";
    ov.textBaseline = "alphabetic";
    ov.font = "235px Anton";
    ov.shadowColor = "rgba(255,255,255,0.35)";
    ov.shadowBlur = 34;
    ov.fillStyle = "#fff";
    ov.fillText("REMY BOYS", 960, 480 + dy);
    ov.fillStyle = "#ffbe1a";
    ov.fillText("STILL HERE.", 960, 690 + dy);
    ov.restore();
  }

  // end card (film 60.5–64)
  const ea = E.inOutCubic(seg(lt, 8.8, 9.8)) * (1 - seg(lt, 11.5, 12));
  if (ea > 0) {
    ctx.save();
    ctx.globalAlpha = ea;
    flagMark(ctx, 908, 300, 104); // centred, 104 wide
    ctx.restore();
    ov.save();
    ov.globalAlpha = ea;
    ov.textAlign = "center";
    ov.textBaseline = "alphabetic";
    ov.font = '36px "JetBrains Mono"';
    ov.fillStyle = "#fff";
    ov.fillText("basedremyboys.club", 960, 560);
    ov.font = '20px "JetBrains Mono"';
    ov.fillStyle = "#8a94a8";
    ov.fillText("Remy OS xp · Based Edition · Build 4490", 960, 615);
    ov.font = '17px "JetBrains Mono"';
    ov.fillStyle = "#5a6478";
    ov.fillText("© 2023–2026 Based Remy Boys", 960, 655);
    ov.restore();
  }

  // fade to black
  const bk = seg(lt, 11.5, 12);
  if (bk > 0) {
    ctx.fillStyle = `rgba(0,0,0,${bk})`;
    ctx.fillRect(0, 0, W, H);
  }
}
