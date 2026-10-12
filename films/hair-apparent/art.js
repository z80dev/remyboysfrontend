// Baked-once static art + pure painters. Sets are baked at the 1440×1080 Academy stage size.
// Palette is authored as warm monochrome values — the post grade (sat 0 + sepia tint) unifies the print.
import { E, clamp, hash, lerp, seg } from "filmkit/lib.js";
import * as A from "../remy-bros/art.js";
import { SH, SW } from "./timeline.js";

const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013);

async function img(url) {
  const i = new Image();
  i.src = url;
  await i.decode();
  return i;
}

export const PAPER = {
  paper: "#e9d8b4",
  paperLo: "#d8c39a",
  ink: "#241a10",
  frame: "#463019",
  skyHi: "#f4e6c4",
  skyLo: "#d9c294",
  haze: "#cdb98f",
  brick: "#a87a58",
  brickLo: "#845e42",
  mortar: "#6e543e",
  cornice: "#c9b28a",
  awnA: "#a84c42",
  awnB: "#e6d5ae",
  wood: "#b09468",
  woodLo: "#8a6f4c",
  woodHi: "#c8ac7c",
  cobble: "#97835f",
  cobbleLo: "#7b6950",
  cobbleInk: "#5d4e3c",
  grass: "#a08c56",
  grassHi: "#c0aa6c",
  grassLo: "#7c6c42",
  ballast: "#9d8767",
  ballastLo: "#83704f",
  ballastHi: "#b59d79",
  rail: "#ece5d2",
  railLo: "#6b5d47",
  iron: "#38322c",
  ironLo: "#292420",
  ironHi: "#544c44",
  brass: "#d8b262",
  brassHi: "#f2dc9a",
  cab: "#6e4a34",
  coal: "#1d1a17",
  dress: "#8a3244",
  dressLo: "#5e2030",
  comb: "#f0c040",
  combLo: "#a87c12",
};

// ---------- cast: near sprites + the one dressed variant + villain portrait ----------
export async function prepareArt() {
  const S = {};
  S.hero = await A.loadRemy(42, false); // Remy Fairhair (never mirrored — printed tee)
  S.heroine = await A.loadRemy(46, false); // Miss Tresses
  S.dressed = dressUp(S.heroine); // 1920s drop-waist dress over the tee
  S.villain = await A.loadRemy(452, false); // Lord Baldwin
  S.goon1 = await A.loadRemy(5, false);
  S.goon2 = await A.loadRemy(834, false);
  const face = await img(new URL("../../media/remy/Character452.webp", import.meta.url).href);
  S.bossCard = duotoneOval(face);
  S.setCard = cardBase(true);
  S.setCardPlain = cardBase(false);
  S.setStreet = streetSet();
  S.setRail = railSet();
  return S;
}

// Drop-waist dress painted under the sprite's alpha (source-atop keeps the cutout clean).
function dressUp(R) {
  const c = A.canvas(R.w, R.h);
  const x = c.getContext("2d");
  x.drawImage(R.c, 0, 0);
  const top = R.top + 42;
  const waist = R.top + 74;
  const hem = R.bottom - 1;
  const cx = R.cx;
  x.globalCompositeOperation = "source-atop";
  // bodice/waist
  x.fillStyle = PAPER.dress;
  x.beginPath();
  x.moveTo(cx - 15, top);
  x.lineTo(cx + 15, top);
  x.lineTo(cx + 12, waist);
  x.lineTo(cx - 12, waist);
  x.closePath();
  x.fill();
  // skirt (drop waist, gentle A-line)
  x.beginPath();
  x.moveTo(cx - 12, waist);
  x.lineTo(cx + 12, waist);
  x.lineTo(cx + 24, hem);
  x.lineTo(cx - 24, hem);
  x.closePath();
  x.fill();
  // belt + left-light fold
  x.fillStyle = PAPER.dressLo;
  x.fillRect(cx - 12, waist - 3, 24, 4);
  x.fillStyle = "rgba(255,235,220,0.28)";
  x.fillRect(cx - 12, top + 2, 3, hem - top - 4);
  x.fillRect(cx - 24 + 2, waist + 4, 3, hem - waist - 6);
  x.globalCompositeOperation = "source-over";
  return { ...R, c };
}

// Oval duotone portrait of Lord Baldwin (the mustache-twirl insert).
function duotoneOval(face) {
  const w = 640;
  const h = 820;
  const c = A.canvas(w, h);
  const x = c.getContext("2d");
  x.fillStyle = PAPER.ink;
  x.fillRect(0, 0, w, h);
  x.save();
  x.beginPath();
  x.ellipse(w / 2, h / 2, w / 2 - 42, h / 2 - 42, 0, 0, 7);
  x.clip();
  x.drawImage(face, 20, 10, 560, 560, 40, 60, 560, 560);
  x.globalCompositeOperation = "saturation";
  x.fillStyle = "#808080";
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = "color";
  x.fillStyle = "#8a6a44";
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = "multiply";
  const g = x.createRadialGradient(w / 2, h / 2 - 80, 160, w / 2, h / 2, 460);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.75, "#e9dcbc");
  g.addColorStop(1, "#a89068");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  x.restore();
  x.lineWidth = 10;
  x.strokeStyle = PAPER.frame;
  x.beginPath();
  x.ellipse(w / 2, h / 2, w / 2 - 42, h / 2 - 42, 0, 0, 7);
  x.stroke();
  x.lineWidth = 3;
  x.beginPath();
  x.ellipse(w / 2, h / 2, w / 2 - 30, h / 2 - 30, 0, 0, 7);
  x.stroke();
  return c;
}

// ---------- intertitle card ----------
function cardBase(sunburst) {
  const c = A.canvas(SW, SH);
  const x = c.getContext("2d");
  x.fillStyle = PAPER.paper;
  x.fillRect(0, 0, SW, SH);
  // mottled paper
  for (let i = 0; i < 260; i++) {
    const r = 24 + h2(i, 3) * 90;
    x.fillStyle = i % 2 ? "rgba(120,90,50,0.028)" : "rgba(255,246,224,0.05)";
    x.beginPath();
    x.arc(h2(i, 1) * SW, h2(i, 2) * SH, r, 0, 7);
    x.fill();
  }
  x.filter = "none";
  if (sunburst) {
    // deco sunburst behind the main title
    x.save();
    x.translate(SW / 2, SH * 0.44);
    for (let i = 0; i < 28; i++) {
      const a0 = (i / 28) * Math.PI * 2;
      const a1 = a0 + Math.PI / 28;
      x.fillStyle = i % 2 ? "rgba(120,86,44,0.10)" : "rgba(255,240,205,0.16)";
      x.beginPath();
      x.moveTo(0, 0);
      x.arc(0, 0, 860, a0, a1);
      x.closePath();
      x.fill();
    }
    x.beginPath();
    x.arc(0, 0, 120, 0, 7);
    x.fillStyle = "rgba(150,108,52,0.16)";
    x.fill();
    x.restore();
  }
  // double rule frame + corner rosettes
  x.strokeStyle = PAPER.frame;
  x.lineWidth = 12;
  x.strokeRect(64, 64, SW - 128, SH - 128);
  x.lineWidth = 3;
  x.strokeRect(92, 92, SW - 184, SH - 184);
  for (const [rx, ry] of [
    [64, 64],
    [SW - 64, 64],
    [64, SH - 64],
    [SW - 64, SH - 64],
  ]) {
    x.fillStyle = PAPER.frame;
    x.beginPath();
    x.arc(rx, ry, 26, 0, 7);
    x.fill();
    x.fillStyle = PAPER.paper;
    x.beginPath();
    x.arc(rx, ry, 16, 0, 7);
    x.fill();
    x.fillStyle = PAPER.frame;
    x.beginPath();
    x.arc(rx, ry, 7, 0, 7);
    x.fill();
  }
  // fleurons
  for (const fx of [SW / 2]) {
    for (const fy of [92, SH - 92]) {
      x.save();
      x.translate(fx, fy);
      x.fillStyle = PAPER.frame;
      for (const d of [-1, 1]) {
        x.beginPath();
        x.moveTo(d * 8, 0);
        x.lineTo(d * 46, -5);
        x.lineTo(d * 46, 5);
        x.closePath();
        x.fill();
        x.beginPath();
        x.arc(d * 54, 0, 6, 0, 7);
        x.fill();
      }
      x.beginPath();
      x.moveTo(0, -9);
      x.lineTo(8, 0);
      x.lineTo(0, 9);
      x.lineTo(-8, 0);
      x.closePath();
      x.fill();
      x.restore();
    }
  }
  return c;
}

// ---------- street set: the Tonsorial Parlour block ----------
function streetSet() {
  const c = A.canvas(SW, SH);
  const x = c.getContext("2d");
  // sky
  const sky = x.createLinearGradient(0, 0, 0, 660);
  sky.addColorStop(0, PAPER.skyHi);
  sky.addColorStop(1, PAPER.skyLo);
  x.fillStyle = sky;
  x.fillRect(0, 0, SW, 660);
  // soft clouds
  x.filter = "blur(7px)";
  for (const [cx, cy, r] of [
    [240, 150, 66],
    [330, 168, 48],
    [1080, 110, 72],
    [1180, 132, 50],
    [700, 90, 44],
  ]) {
    x.fillStyle = "rgba(250,242,220,0.85)";
    x.beginPath();
    x.arc(cx, cy, r, 0, 7);
    x.arc(cx + r * 0.8, cy + 8, r * 0.7, 0, 7);
    x.arc(cx - r * 0.8, cy + 10, r * 0.62, 0, 7);
    x.fill();
  }
  x.filter = "none";
  // far rooftops
  x.fillStyle = "#8a7050";
  x.beginPath();
  x.moveTo(0, 420);
  for (let i = 0; i <= 12; i++) {
    const px = i * 120;
    const peak = 420 - (26 + h2(i, 5) * 54);
    x.lineTo(px, peak + 40);
    x.lineTo(px + 60, peak);
    x.lineTo(px + 120, peak + 40);
  }
  x.lineTo(SW, 660);
  x.lineTo(0, 660);
  x.closePath();
  x.fill();
  // left building — HOTEL (brick)
  building(x, 0, 300, 640, 560, { brick: true, windows: 4, sign: "HOTEL REMY" });
  // center — alley wall + barber pole bracket
  building(x, 340, 250, 660, 520, { windows: 2, plain: true });
  // right building — the parlour itself
  building(x, 620, SW - 620, 700, 540, { parlour: true, windows: 3, sign: "TONSORIAL PARLOUR" });
  // boardwalk
  const bw = x.createLinearGradient(0, 812, 0, 912);
  bw.addColorStop(0, PAPER.woodHi);
  bw.addColorStop(0.25, PAPER.wood);
  bw.addColorStop(1, PAPER.woodLo);
  x.fillStyle = bw;
  x.fillRect(0, 812, SW, 100);
  x.fillStyle = "rgba(60,40,22,0.5)";
  for (let px = 0; px < SW; px += 96) x.fillRect(px + 92, 812, 4, 100);
  x.fillStyle = "rgba(255,240,210,0.35)";
  x.fillRect(0, 812, SW, 5);
  x.fillStyle = PAPER.woodLo;
  x.fillRect(0, 806, SW, 8);
  // cobbled street
  const st = x.createLinearGradient(0, 912, 0, SH);
  st.addColorStop(0, "#8d7a5d");
  st.addColorStop(1, "#6e5d45");
  x.fillStyle = st;
  x.fillRect(0, 912, SW, SH - 912);
  for (let row = 0; row < 7; row++) {
    const y = 928 + row * 26;
    const off = (row % 2) * 24;
    for (let px = -24; px < SW; px += 48) {
      const v = h2(px, row, 2);
      x.fillStyle = v > 0.6 ? PAPER.cobble : v > 0.3 ? PAPER.cobbleLo : PAPER.cobbleInk;
      x.beginPath();
      x.ellipse(px + off + 24, y, 22 - v * 3, 10, 0, 0, 7);
      x.fill();
      x.fillStyle = "rgba(255,240,210,0.20)";
      x.beginPath();
      x.ellipse(px + off + 19, y - 3, 8, 3.4, 0, 0, 7);
      x.fill();
    }
  }
  // lamp post + glow
  lamp(x, 120, 812);
  // hydrant
  x.fillStyle = "#7c4436";
  x.fillRect(508, 774, 18, 34);
  x.beginPath();
  x.arc(517, 774, 10, Math.PI, 0);
  x.fill();
  x.fillRect(502, 784, 30, 6);
  // poster kiosk
  kiosk(x, 330, 812);
  // vanity outside the parlour (right): mirror + table + stool
  vanity(x, 1075, 812);
  // hanging sign bracket over the parlour door (sign board painted per-frame: it swings)
  x.fillStyle = PAPER.iron;
  x.fillRect(840, 336, 8, 46);
  x.fillRect(840, 336, 250, 8);
  return c;
}

function building(x, bx, bw, bh, byTop, o = {}) {
  const y0 = 812 - bh + 152;
  // facade
  x.fillStyle = o.brick ? PAPER.brick : o.parlour ? "#c2a87e" : "#b39a6f";
  x.fillRect(bx, y0, bw, 812 - y0);
  if (o.brick) {
    x.strokeStyle = "rgba(70,48,28,0.35)";
    x.lineWidth = 1.5;
    for (let yy = y0 + 12; yy < 800; yy += 11) {
      x.beginPath();
      x.moveTo(bx, yy);
      x.lineTo(bx + bw, yy);
      x.stroke();
    }
    for (let yy = y0, r = 0; yy < 800; yy += 11, r++)
      for (let px = bx + (r % 2) * 14; px < bx + bw; px += 28) {
        x.beginPath();
        x.moveTo(px, yy);
        x.lineTo(px, yy + 11);
        x.stroke();
      }
  }
  // cornice
  x.fillStyle = PAPER.cornice;
  x.fillRect(bx - 10, y0 - 18, bw + 20, 20);
  x.fillStyle = "#9a8260";
  x.fillRect(bx - 10, y0 + 2, bw + 20, 6);
  // parapet teeth
  x.fillStyle = PAPER.cornice;
  for (let px = bx + 4; px < bx + bw - 10; px += 34) x.fillRect(px, y0 - 30, 20, 14);
  // sign board
  if (o.sign) {
    x.fillStyle = PAPER.ink;
    x.fillRect(bx + bw / 2 - 170, y0 + 26, 340, 56);
    x.strokeStyle = PAPER.frame;
    x.lineWidth = 3;
    x.strokeRect(bx + bw / 2 - 170, y0 + 26, 340, 56);
    x.fillStyle = "#e9d8b4";
    x.font = '600 34px "Cormorant Garamond"';
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(o.sign, bx + bw / 2, y0 + 55);
  }
  // windows / shopfront
  if (o.parlour) {
    // two arched windows + recessed door + awning brackets
    for (const wx of [bx + 56, bx + bw - 216]) {
      x.fillStyle = "#5c4a34";
      x.beginPath();
      x.moveTo(wx, 700);
      x.lineTo(wx, 640);
      x.arc(wx + 40, 640, 40, Math.PI, 0);
      x.lineTo(wx + 80, 700);
      x.closePath();
      x.fill();
      x.fillStyle = "rgba(250,240,215,0.5)";
      x.beginPath();
      x.moveTo(wx + 6, 694);
      x.lineTo(wx + 6, 640);
      x.arc(wx + 40, 640, 34, Math.PI, 0);
      x.lineTo(wx + 74, 694);
      x.closePath();
      x.fill();
      x.strokeStyle = "#7c6446";
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(wx + 40, 608);
      x.lineTo(wx + 40, 694);
      x.stroke();
    }
    // door
    x.fillStyle = "#4c3826";
    x.fillRect(bx + bw / 2 - 34, 628, 68, 130);
    x.fillStyle = "rgba(240,225,195,0.4)";
    x.fillRect(bx + bw / 2 - 28, 636, 24, 46);
    x.fillRect(bx + bw / 2 + 4, 636, 24, 46);
    x.fillStyle = PAPER.brass;
    x.beginPath();
    x.arc(bx + bw / 2 + 24, 700, 4, 0, 7);
    x.fill();
    // awning (scalloped stripes)
    const ay = 596;
    const ax = bx + 20;
    const aw = bw - 40;
    for (let i = 0, sx = ax; sx < ax + aw; i++, sx += 46) {
      x.fillStyle = i % 2 ? PAPER.awnA : PAPER.awnB;
      x.beginPath();
      x.moveTo(sx, ay);
      x.lineTo(sx + 46, ay);
      x.lineTo(sx + 46, ay + 34);
      x.arc(sx + 23, ay + 34, 23, 0, Math.PI);
      x.closePath();
      x.fill();
    }
    x.fillStyle = PAPER.iron;
    x.fillRect(ax - 6, ay - 8, aw + 12, 8);
  } else {
    const n = o.windows ?? 3;
    for (let i = 0; i < n; i++) {
      const wx = bx + 34 + (i * (bw - 100)) / Math.max(1, n - 1);
      x.fillStyle = "#5c4a34";
      x.fillRect(wx, y0 + 60, 56, 96);
      x.fillStyle = "rgba(250,240,215,0.42)";
      x.fillRect(wx + 5, y0 + 65, 46, 86);
      x.strokeStyle = "#7c6446";
      x.lineWidth = 3;
      x.strokeRect(wx, y0 + 60, 56, 96);
      x.beginPath();
      x.moveTo(wx + 28, y0 + 60);
      x.lineTo(wx + 28, y0 + 156);
      x.stroke();
      x.fillStyle = "#4c3c2a";
      x.fillRect(wx - 5, y0 + 156, 66, 10);
    }
    if (o.plain) {
      // barber pole bracket (pole body painted per-frame: stripes rotate)
      x.fillStyle = PAPER.frame;
      x.fillRect(455, 596, 16, 14);
      x.fillRect(455, 742, 16, 14);
      x.fillStyle = "#cbb88e";
      x.fillRect(466, 600, 30, 152);
      x.fillStyle = "rgba(60,40,22,0.35)";
      x.fillRect(490, 600, 6, 152);
    }
  }
}

function lamp(x, lx, ground) {
  x.fillStyle = PAPER.iron;
  x.fillRect(lx - 5, ground - 236, 10, 236);
  x.fillRect(lx - 20, ground - 8, 40, 8);
  x.beginPath();
  x.arc(lx, ground - 240, 16, 0, 7);
  x.fill();
  x.fillStyle = "rgba(255,236,180,0.85)";
  x.beginPath();
  x.arc(lx, ground - 240, 11, 0, 7);
  x.fill();
  x.fillStyle = PAPER.iron;
  x.beginPath();
  x.moveTo(lx - 20, ground - 250);
  x.lineTo(lx + 20, ground - 250);
  x.lineTo(lx, ground - 268);
  x.closePath();
  x.fill();
}

function kiosk(x, kx, ground) {
  x.fillStyle = PAPER.woodLo;
  x.fillRect(kx - 8, ground - 180, 96, 180);
  x.fillStyle = PAPER.wood;
  x.fillRect(kx, ground - 172, 80, 120);
  x.fillStyle = PAPER.ink;
  x.fillRect(kx + 5, ground - 167, 70, 110);
  // poster: a dapper bald silhouette + COMING SOON
  x.fillStyle = "#e9d8b4";
  x.beginPath();
  x.arc(kx + 40, ground - 136, 15, 0, 7);
  x.fill(); // head
  x.fillRect(kx + 26, ground - 122, 28, 26); // shoulders
  x.fillStyle = PAPER.ink;
  x.font = '600 13px "Cormorant Garamond"';
  x.textAlign = "center";
  x.fillText("REMY BOYS", kx + 40, ground - 86);
  x.fillText("PICTURES", kx + 40, ground - 71);
  x.font = 'italic 11px "Cormorant Garamond"';
  x.fillText("coming soon", kx + 40, ground - 59);
}

function vanity(x, vx, ground) {
  // oval mirror
  x.fillStyle = PAPER.frame;
  x.beginPath();
  x.ellipse(vx + 110, ground - 232, 78, 116, 0, 0, 7);
  x.fill();
  x.fillStyle = "#c9b78e";
  x.beginPath();
  x.ellipse(vx + 110, ground - 232, 66, 104, 0, 0, 7);
  x.fill();
  x.fillStyle = "rgba(255,246,226,0.5)";
  x.beginPath();
  x.ellipse(vx + 92, ground - 252, 30, 52, -0.4, 0, 7);
  x.fill();
  x.fillStyle = "rgba(60,40,22,0.3)";
  x.beginPath();
  x.ellipse(vx + 132, ground - 200, 24, 40, -0.3, 0, 7);
  x.fill();
  // table
  x.fillStyle = PAPER.wood;
  x.fillRect(vx - 8, ground - 96, 236, 14);
  x.fillStyle = PAPER.woodLo;
  x.fillRect(vx + 2, ground - 82, 16, 82);
  x.fillRect(vx + 200, ground - 82, 16, 82);
  x.fillRect(vx + 2, ground - 60, 214, 8);
  // drawers + brushes
  x.fillStyle = PAPER.woodHi;
  x.fillRect(vx + 30, ground - 88, 52, 22);
  x.strokeStyle = PAPER.woodLo;
  x.strokeRect(vx + 30, ground - 88, 52, 22);
  x.fillStyle = PAPER.brass;
  x.fillRect(vx + 50, ground - 79, 12, 4);
  // stool
  x.fillStyle = PAPER.wood;
  x.beginPath();
  x.ellipse(vx - 60, ground - 44, 30, 9, 0, 0, 7);
  x.fill();
  x.fillRect(vx - 63, ground - 44, 6, 44);
  x.fillRect(vx - 39, ground - 44, 6, 44);
}

// ---------- rail cut set ----------
function railSet() {
  const c = A.canvas(SW, SH);
  const x = c.getContext("2d");
  // sky
  const sky = x.createLinearGradient(0, 0, 0, 700);
  sky.addColorStop(0, "#f6ead0");
  sky.addColorStop(0.7, PAPER.skyLo);
  sky.addColorStop(1, "#e3cf9f");
  x.fillStyle = sky;
  x.fillRect(0, 0, SW, 700);
  x.filter = "blur(8px)";
  for (const [cx, cy, r] of [
    [420, 130, 80],
    [530, 158, 60],
    [1050, 210, 92],
    [1160, 236, 62],
    [820, 120, 50],
  ]) {
    x.fillStyle = "rgba(252,244,222,0.9)";
    x.beginPath();
    x.arc(cx, cy, r, 0, 7);
    x.arc(cx + r * 0.85, cy + 10, r * 0.7, 0, 7);
    x.arc(cx - r * 0.85, cy + 12, r * 0.6, 0, 7);
    x.fill();
  }
  x.filter = "none";
  // hills
  x.fillStyle = "#b49a6e";
  x.beginPath();
  x.moveTo(0, 560);
  for (let px = 0; px <= SW; px += 60) x.lineTo(px, 540 - 26 * Math.sin(px * 0.006) - 30 * Math.sin(px * 0.0023 + 2));
  x.lineTo(SW, 700);
  x.lineTo(0, 700);
  x.closePath();
  x.fill();
  // treeline
  for (let i = 0; i < 90; i++) {
    const tx = i * 17 + h2(i, 7) * 9;
    const th = 20 + h2(i, 8) * 26;
    x.fillStyle = i % 3 ? "#8a7448" : "#7a6640";
    x.beginPath();
    x.moveTo(tx - 7, 596);
    x.lineTo(tx, 596 - th);
    x.lineTo(tx + 7, 596);
    x.closePath();
    x.fill();
  }
  x.fillStyle = "#967e4e";
  x.fillRect(0, 590, SW, 14);
  // fields w/ furrows
  const fld = x.createLinearGradient(0, 604, 0, 772);
  fld.addColorStop(0, "#a8925e");
  fld.addColorStop(1, "#8d7a4e");
  x.fillStyle = fld;
  x.fillRect(0, 604, SW, 168);
  x.strokeStyle = "rgba(70,56,32,0.30)";
  x.lineWidth = 2;
  for (let i = 0; i < 22; i++) {
    const fy = 616 + i * 7.4;
    x.beginPath();
    x.moveTo(0, fy);
    x.lineTo(SW, fy + 3);
    x.stroke();
  }
  // fence line
  x.strokeStyle = "#6e5a38";
  x.lineWidth = 3;
  for (let px = 30; px < SW; px += 90) {
    x.beginPath();
    x.moveTo(px, 640);
    x.lineTo(px, 606);
    x.stroke();
  }
  x.beginPath();
  x.moveTo(0, 616);
  x.lineTo(SW, 620);
  x.stroke();
  // ballast bed
  const bl = x.createLinearGradient(0, 760, 0, 900);
  bl.addColorStop(0, PAPER.ballastLo);
  bl.addColorStop(0.4, PAPER.ballast);
  bl.addColorStop(1, "#8d7a58");
  x.fillStyle = bl;
  x.fillRect(0, 760, SW, 140);
  for (let i = 0; i < 1500; i++) {
    const sx = h2(i, 11) * SW;
    const sy = 764 + h2(i, 12) * 132;
    const v = h2(i, 13);
    x.fillStyle = v > 0.66 ? PAPER.ballastHi : v > 0.33 ? PAPER.ballastLo : "#6e5c40";
    x.fillRect(sx, sy, 2 + v * 3, 2 + v * 2);
  }
  // sleepers
  x.fillStyle = "#4c3a24";
  for (let px = 8; px < SW; px += 88) x.fillRect(px, 800, 58, 18);
  // rails (near rail y 830, far rail y 800 — slight perspective splay at the left edge)
  for (const [ry, w, col] of [
    [802, 5, "#c9bb9c"],
    [836, 7, PAPER.rail],
  ]) {
    x.fillStyle = "#5a4c38";
    x.fillRect(0, ry + w, SW, 4);
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(0, ry);
    x.lineTo(SW, ry - 3);
    x.lineTo(SW, ry - 3 + w);
    x.lineTo(0, ry + w);
    x.closePath();
    x.fill();
    x.fillStyle = "rgba(255,250,230,0.8)";
    x.beginPath();
    x.moveTo(0, ry);
    x.lineTo(SW, ry - 3);
    x.lineTo(SW, ry - 1);
    x.lineTo(0, ry + 2);
    x.closePath();
    x.fill();
  }
  // rail joints
  x.fillStyle = "#4c4030";
  for (let px = 210; px < SW; px += 350) {
    x.fillRect(px, 798, 8, 12);
    x.fillRect(px + 30, 832, 9, 14);
  }
  // telegraph poles receding left → horizon
  for (let i = 0; i < 7; i++) {
    const s = 1 - i * 0.12;
    const px = 60 + i * 74;
    const ph = 240 * s;
    const py = 660;
    x.fillStyle = "#4c3c26";
    x.fillRect(px, py - ph, 7 * s + 2, ph);
    x.fillRect(px - 26 * s, py - ph + 10, 60 * s + 4, 5 * s + 2);
    x.strokeStyle = "rgba(60,48,30,0.7)";
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(px, py - ph + 14);
    x.quadraticCurveTo(px + 40, py - ph + 40, px + 74, py - 240 * (1 - (i + 1) * 0.12) + 14);
    x.stroke();
  }
  // water tower, left background
  const tx = 200;
  const ty = 560;
  x.strokeStyle = "#4c3c26";
  x.lineWidth = 5;
  for (const [dx, dy] of [
    [-34, 0],
    [34, 0],
    [-16, -8],
    [16, -8],
  ]) {
    x.beginPath();
    x.moveTo(tx + dx, ty + dy + 46);
    x.lineTo(tx + dx * 0.5, ty - 26);
    x.stroke();
  }
  x.fillStyle = "#7c6440";
  x.fillRect(tx - 46, ty - 60, 92, 40);
  x.fillStyle = "#8d7248";
  x.beginPath();
  x.moveTo(tx - 52, ty - 60);
  x.lineTo(tx, ty - 84);
  x.lineTo(tx + 52, ty - 60);
  x.closePath();
  x.fill();
  x.fillStyle = "#5c4a2e";
  x.fillRect(tx - 36, ty - 48, 72, 14);
  x.fillStyle = "#efe2c0";
  x.font = '600 17px "Cormorant Garamond"';
  x.textAlign = "center";
  x.fillText("BALDVILLE", tx, ty - 37);
  // milepost, right
  x.fillStyle = "#e9dcc0";
  x.fillRect(1258, 756, 8, 52);
  x.fillStyle = "#f2e8ce";
  x.fillRect(1240, 730, 44, 30);
  x.strokeStyle = "#463019";
  x.lineWidth = 2;
  x.strokeRect(1240, 730, 44, 30);
  x.fillStyle = "#241a10";
  x.font = '600 17px "Cormorant Garamond"';
  x.fillText("5 MI", 1262, 746);
  // foreground grass
  const fg = x.createLinearGradient(0, 900, 0, SH);
  fg.addColorStop(0, PAPER.grass);
  fg.addColorStop(1, PAPER.grassLo);
  x.fillStyle = fg;
  x.fillRect(0, 900, SW, SH - 900);
  for (let i = 0; i < 700; i++) {
    const gx = h2(i, 21) * SW;
    const gy = 906 + h2(i, 22) * 180;
    x.strokeStyle = h2(i, 23) > 0.5 ? "rgba(60,48,26,0.5)" : "rgba(210,190,140,0.5)";
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(gx, gy);
    x.lineTo(gx - 3 + h2(i, 24) * 6, gy - 9 - h2(i, 25) * 7);
    x.stroke();
  }
  return c;
}

// ---------- period costumes / props (drawn per-frame over sprites) ----------
// Top hat for Lord Baldwin. (hx, hy) = crown base centre. Tilted by rot.
export function topHat(x, hx, hy, s, rot = 0, flight = 0) {
  x.save();
  x.translate(hx, hy);
  x.rotate(rot);
  x.scale(s, s);
  x.fillStyle = "rgba(20,14,8,0.35)";
  x.beginPath();
  x.ellipse(0, 3, 44, 10, 0, 0, 7);
  x.fill();
  x.fillStyle = "#211a14";
  x.beginPath();
  x.ellipse(0, 0, 44, 12, 0, 0, 7);
  x.fill();
  x.fillStyle = "#181310";
  x.beginPath();
  x.moveTo(-26, 0);
  x.lineTo(-23, -58);
  x.quadraticCurveTo(0, -66, 23, -58);
  x.lineTo(26, 0);
  x.closePath();
  x.fill();
  x.fillStyle = "#2c241c";
  x.fillRect(-24, -14, 48, 8);
  x.fillStyle = "rgba(240,225,195,0.22)";
  x.fillRect(-20, -56, 7, 42);
  x.restore();
}

// Flat cap for a goon: (hx, hy) head top, dir −1/1.
export function flatCap(x, hx, hy, s, dir = 1, colour = "#6a5236") {
  x.save();
  x.translate(hx, hy);
  x.scale(s * dir, s);
  x.fillStyle = colour;
  x.beginPath();
  x.arc(0, 0, 13, Math.PI, 0);
  x.closePath();
  x.fill();
  x.beginPath();
  x.ellipse(12, -1, 12, 3.4, -0.12, 0, 7);
  x.fill();
  x.fillStyle = "rgba(255,240,215,0.25)";
  x.beginPath();
  x.arc(-4, -5, 6, Math.PI, 0);
  x.closePath();
  x.fill();
  x.restore();
}

// The Golden Comb — heirloom of the House of Tresses.
export function comb(x, cx, cy, s, rot = 0) {
  x.save();
  x.translate(cx, cy);
  x.rotate(rot);
  x.scale(s, s);
  x.fillStyle = PAPER.combLo;
  for (let i = 0; i < 7; i++) x.fillRect(-18 + i * 6, 2, 3.4, 13);
  const g = x.createLinearGradient(0, -12, 0, 4);
  g.addColorStop(0, PAPER.comb);
  g.addColorStop(1, "#c89a1c");
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(-21, -8);
  x.quadraticCurveTo(0, -15, 21, -8);
  x.lineTo(20, 4);
  x.quadraticCurveTo(0, -2, -20, 4);
  x.closePath();
  x.fill();
  x.fillStyle = PAPER.brassHi;
  x.beginPath();
  x.moveTo(-16, -8);
  x.quadraticCurveTo(0, -13, 14, -8);
  x.lineTo(12, -5);
  x.quadraticCurveTo(0, -9, -14, -5);
  x.closePath();
  x.fill();
  x.restore();
}

// Pocket watch on a swing (villain checks the express timetable).
export function pocketWatch(x, hx, hy, ang, s) {
  x.save();
  x.translate(hx, hy);
  x.rotate(ang);
  x.strokeStyle = PAPER.brass;
  x.lineWidth = 2.4;
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(0, 26 * s);
  x.stroke();
  x.fillStyle = PAPER.brass;
  x.beginPath();
  x.arc(0, 40 * s, 15 * s, 0, 7);
  x.fill();
  x.fillStyle = "#f4ecd6";
  x.beginPath();
  x.arc(0, 40 * s, 11 * s, 0, 7);
  x.fill();
  x.strokeStyle = "#241a10";
  x.lineWidth = 1.6;
  x.beginPath();
  x.moveTo(0, 40 * s);
  x.lineTo(0, 32 * s);
  x.stroke();
  x.beginPath();
  x.moveTo(0, 40 * s);
  x.lineTo(6 * s, 43 * s);
  x.stroke();
  x.restore();
}

export function cane(x, hx, hy, ang, s) {
  x.save();
  x.translate(hx, hy);
  x.rotate(ang);
  x.strokeStyle = "#241a10";
  x.lineWidth = 4.5 * s;
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(0, 78 * s);
  x.stroke();
  x.strokeStyle = PAPER.brass;
  x.lineWidth = 4.5 * s;
  x.beginPath();
  x.arc(7 * s, 2, 8 * s, Math.PI * 0.6, Math.PI * 1.6);
  x.stroke();
  x.restore();
}

// Four-point sparkle (comb glints, steel sparks).
export function sparkle(x, cx, cy, r, a, rot = 0) {
  if (a <= 0.01) return;
  x.save();
  x.translate(cx, cy);
  x.rotate(rot);
  x.globalAlpha = a;
  x.fillStyle = "#fff6da";
  x.beginPath();
  x.moveTo(0, -r);
  x.quadraticCurveTo(r * 0.16, -r * 0.16, r, 0);
  x.quadraticCurveTo(r * 0.16, r * 0.16, 0, r);
  x.quadraticCurveTo(-r * 0.16, r * 0.16, -r, 0);
  x.quadraticCurveTo(-r * 0.16, -r * 0.16, 0, -r);
  x.closePath();
  x.fill();
  x.restore();
}

// Rope band around a body lying along the rails: a vertical wrap + knot; ends whip after snap.
// snapAge < 0 → taut. w = band width across the body, h = body depth.
export function ropeBand(x, rx, ry, w, h, snapAge) {
  x.strokeStyle = "#3a2c1a";
  x.lineWidth = 5;
  if (snapAge < 0) {
    x.beginPath();
    x.moveTo(rx - w / 2, ry - h / 2);
    x.lineTo(rx - w / 2, ry + h / 2);
    x.moveTo(rx + w / 2, ry - h / 2);
    x.lineTo(rx + w / 2, ry + h / 2);
    x.stroke();
    x.fillStyle = "#4c3a22";
    x.beginPath();
    x.arc(rx, ry, 5.5, 0, 7);
    x.fill();
  } else {
    // snapped: ends spring up off the rails and settle
    const k = Math.max(0, 1 - snapAge * 2.2);
    x.beginPath();
    x.moveTo(rx - w / 2, ry - h / 2);
    x.quadraticCurveTo(rx - w / 2 - 13 * k, ry - h / 2 - 20 * k, rx - w / 2 - 4 * k, ry - h / 2 - 34 * k);
    x.moveTo(rx + w / 2, ry - h / 2);
    x.quadraticCurveTo(rx + w / 2 + 13 * k, ry - h / 2 - 20 * k, rx + w / 2 + 4 * k, ry - h / 2 - 34 * k);
    x.stroke();
  }
}

// ---------- vehicles ----------
// 1920s touring car, side view, facing right when dir=1. (x, y) = front axle ground contact.
export function motorcar(x, cx, cy, s, wheelA, dir = 1, roll = 0) {
  x.save();
  x.translate(cx, cy);
  x.scale(dir * s, s);
  x.rotate(roll);
  x.fillStyle = "rgba(30,20,10,0.30)";
  x.beginPath();
  x.ellipse(-10, 2, 150, 12, 0, 0, 7);
  x.fill();
  // body: rear cabin → hood
  x.fillStyle = "#4c3c30";
  x.beginPath();
  x.moveTo(-148, -6);
  x.lineTo(-148, -62);
  x.quadraticCurveTo(-146, -70, -136, -70);
  x.lineTo(-16, -70);
  x.lineTo(-16, -58);
  x.lineTo(-4, -50);
  x.lineTo(66, -50);
  x.quadraticCurveTo(80, -50, 84, -62);
  x.lineTo(84, -26);
  x.quadraticCurveTo(84, -6, 66, -6);
  x.closePath();
  x.fill();
  // folding top
  x.fillStyle = "#2e2620";
  x.beginPath();
  x.moveTo(-142, -68);
  x.quadraticCurveTo(-84, -128, -24, -68);
  x.closePath();
  x.fill();
  x.strokeStyle = "#463c32";
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(-142, -68);
  x.quadraticCurveTo(-84, -128, -24, -68);
  x.stroke();
  // cabin opening (occupants drawn behind this darkness by caller order: caller draws them first)
  x.fillStyle = "#221a14";
  x.fillRect(-132, -66, 104, 56);
  // windshield + hood seams + brass radiator
  x.fillStyle = "rgba(240,230,205,0.5)";
  x.fillRect(-14, -84, 4, 34);
  x.fillStyle = "#241c16";
  x.fillRect(-12, -88, 10, 4);
  x.fillRect(-14, -84, 14, 3);
  x.strokeStyle = "rgba(255,240,210,0.28)";
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(20, -48);
  x.lineTo(20, -8);
  x.moveTo(46, -48);
  x.lineTo(46, -8);
  x.stroke();
  x.fillStyle = PAPER.brass;
  x.fillRect(80, -46, 9, 36);
  // running board + fenders
  x.fillStyle = "#241c16";
  x.fillRect(-128, -8, 216, 7);
  x.strokeStyle = "#3a3028";
  x.lineWidth = 6;
  for (const wx of [96, -92]) {
    x.beginPath();
    x.arc(wx, -4, 40, Math.PI, 0);
    x.stroke();
  }
  // headlamps
  x.fillStyle = PAPER.brass;
  x.beginPath();
  x.arc(84, -56, 7, 0, 7);
  x.fill();
  x.beginPath();
  x.arc(76, -60, 6, 0, 7);
  x.fill();
  x.fillStyle = "rgba(255,244,210,0.9)";
  x.beginPath();
  x.arc(85, -56, 4, 0, 7);
  x.fill();
  // wheels
  wheel(x, 96, -2, 38, wheelA, 8);
  wheel(x, -92, -2, 38, wheelA + 2.1, 8);
  x.restore();
}

// Spoked wheel. crankPin at 0.62 r for side rods.
export function wheel(x, wx, wy, r, a, spokes = 8, pin = false) {
  x.save();
  x.translate(wx, wy);
  x.fillStyle = "#241f1a";
  x.beginPath();
  x.arc(0, 0, r, 0, 7);
  x.fill();
  x.fillStyle = "#d8ccae";
  x.beginPath();
  x.arc(0, 0, r * 0.82, 0, 7);
  x.fill();
  x.strokeStyle = "#a89878";
  x.lineWidth = Math.max(2, r * 0.14);
  x.beginPath();
  x.arc(0, 0, r * 0.72, 0, 7);
  x.stroke();
  x.strokeStyle = "#3a322a";
  x.lineWidth = Math.max(1.6, r * 0.1);
  for (let i = 0; i < spokes; i++) {
    const sa = a + (i / spokes) * Math.PI * 2;
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(Math.cos(sa) * r * 0.8, Math.sin(sa) * r * 0.8);
    x.stroke();
  }
  x.fillStyle = "#463c30";
  x.beginPath();
  x.arc(0, 0, r * 0.2, 0, 7);
  x.fill();
  if (pin) {
    x.fillStyle = "#241f1a";
    x.beginPath();
    x.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, Math.max(2.4, r * 0.1), 0, 7);
    x.fill();
  }
  x.restore();
}

// 4-4-0 American locomotive, side view facing right. (x, y) = rail contact under the drivers.
// opts: { cars: n } trailing car bodies behind the tender (pass 1 → passenger, 2 → + caboose).
export function loco(x, cx, cy, s, wheelA, o = {}) {
  x.save();
  x.translate(cx, cy);
  x.scale(s, s);
  const dy = -62; // driver centre height
  x.fillStyle = "rgba(25,18,10,0.33)";
  x.beginPath();
  x.ellipse(-90, 0, 300, 14, 0, 0, 7);
  x.fill();
  // ----- trailing cars (drawn first: engine overlaps) -----
  if (o.cars) {
    // tender
    x.fillStyle = PAPER.iron;
    x.fillRect(-318, -128, 152, 66);
    x.fillStyle = PAPER.ironLo;
    x.fillRect(-318, -74, 152, 12);
    x.fillStyle = PAPER.coal;
    x.beginPath();
    x.moveTo(-306, -128);
    x.quadraticCurveTo(-242, -158, -178, -128);
    x.closePath();
    x.fill();
    x.fillStyle = "rgba(255,240,210,0.14)";
    x.fillRect(-312, -124, 8, 54);
    wheel(x, -286, -14, 22, wheelA, 6);
    wheel(x, -198, -14, 22, wheelA, 6);
    if (o.cars >= 1) {
      // caboose with cupola + rear platform
      x.fillStyle = "#7c3a2e";
      x.fillRect(-1082, -132, 320, 72);
      x.fillStyle = "#944c3a";
      x.fillRect(-1014, -164, 170, 34);
      x.fillStyle = "rgba(250,238,208,0.6)";
      x.fillRect(-996, -156, 34, 22);
      x.fillRect(-1064, -118, 30, 34);
      x.fillRect(-890, -118, 34, 34);
      x.fillStyle = "#4c3626";
      x.fillRect(-1090, -66, 12, 66);
      x.fillRect(-1090, -66, 40, 6);
      wheel(x, -1046, -16, 20, wheelA, 6);
      wheel(x, -812, -16, 20, wheelA, 6);
    }
    if (o.cars >= 2) {
      // passenger car
      x.fillStyle = "#5e4634";
      x.fillRect(-742, -140, 404, 78);
      x.fillStyle = "#7a5c42";
      x.fillRect(-742, -152, 404, 16);
      x.fillStyle = "#4a3626";
      x.fillRect(-742, -70, 404, 10);
      x.fillStyle = "rgba(250,238,208,0.55)";
      for (let i = 0; i < 6; i++) x.fillRect(-722 + i * 64, -124, 42, 40);
      x.strokeStyle = "#3a2c1e";
      x.lineWidth = 3;
      for (let i = 0; i < 6; i++) x.strokeRect(-722 + i * 64, -124, 42, 40);
      wheel(x, -700, -16, 20, wheelA, 6);
      wheel(x, -380, -16, 20, wheelA, 6);
    }
  }
  // ----- engine -----
  // cab
  x.fillStyle = PAPER.cab;
  x.fillRect(-176, -168, 96, 106);
  x.fillStyle = "#54382a";
  x.fillRect(-176, -180, 108, 14);
  x.fillStyle = "rgba(250,238,208,0.62)";
  x.fillRect(-160, -152, 44, 40);
  x.strokeStyle = "#3a281c";
  x.lineWidth = 3;
  x.strokeRect(-160, -152, 44, 40);
  x.fillStyle = "rgba(255,240,215,0.25)";
  x.fillRect(-172, -164, 7, 96);
  // boiler
  const bg = x.createLinearGradient(0, -128, 0, -64);
  bg.addColorStop(0, PAPER.ironHi);
  bg.addColorStop(0.4, PAPER.iron);
  bg.addColorStop(1, PAPER.ironLo);
  x.fillStyle = bg;
  x.fillRect(-86, -128, 226, 64);
  x.beginPath();
  x.moveTo(-86, -128);
  x.lineTo(140, -128);
  x.quadraticCurveTo(176, -122, 176, -96);
  x.quadraticCurveTo(176, -70, 140, -64);
  x.lineTo(-86, -64);
  x.closePath();
  x.fill();
  // boiler bands + rivet seams
  x.fillStyle = PAPER.brass;
  x.fillRect(-60, -128, 7, 64);
  x.fillRect(24, -128, 7, 64);
  x.fillRect(104, -128, 7, 64);
  x.fillStyle = "rgba(255,244,210,0.16)";
  x.fillRect(-80, -122, 300, 7);
  x.fillStyle = "rgba(0,0,0,0.28)";
  x.fillRect(-80, -72, 262, 6);
  // stack (flared diamond), dome, headlamp
  x.fillStyle = PAPER.ironLo;
  x.beginPath();
  x.moveTo(112, -128);
  x.lineTo(126, -188);
  x.lineTo(158, -188);
  x.lineTo(172, -128);
  x.closePath();
  x.fill();
  x.fillStyle = PAPER.iron;
  x.fillRect(104, -204, 76, 18);
  x.fillStyle = PAPER.brass;
  x.fillRect(100, -206, 84, 7);
  x.fillStyle = PAPER.brass;
  x.beginPath();
  x.arc(6, -132, 17, Math.PI, 0);
  x.closePath();
  x.fill();
  x.fillStyle = PAPER.brassHi;
  x.beginPath();
  x.arc(2, -136, 7, Math.PI, 0);
  x.closePath();
  x.fill();
  // headlamp + beam
  x.fillStyle = PAPER.iron;
  x.fillRect(148, -150, 34, 26);
  x.fillStyle = "#fff2c4";
  x.fillRect(154, -144, 22, 15);
  const lb = x.createLinearGradient(182, 0, 460, 0);
  lb.addColorStop(0, "rgba(255,238,180,0.30)");
  lb.addColorStop(1, "rgba(255,238,180,0)");
  x.fillStyle = lb;
  x.beginPath();
  x.moveTo(182, -140);
  x.lineTo(470, -236);
  x.lineTo(470, -36);
  x.closePath();
  x.fill();
  // bell
  x.strokeStyle = "#463c30";
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(58, -132);
  x.lineTo(58, -148);
  x.stroke();
  x.fillStyle = PAPER.brassHi;
  x.beginPath();
  x.arc(58, -152, 7, 0, Math.PI);
  x.closePath();
  x.fill();
  // cowcatcher
  x.fillStyle = PAPER.iron;
  x.beginPath();
  x.moveTo(176, -60);
  x.lineTo(246, 2);
  x.lineTo(176, 2);
  x.closePath();
  x.fill();
  x.strokeStyle = "#5c5248";
  x.lineWidth = 4;
  for (let i = 1; i < 5; i++) {
    x.beginPath();
    x.moveTo(176 + i * 14, -58 + i * 12);
    x.lineTo(176 + i * 14, 0);
    x.stroke();
  }
  // drivers + lead truck + side rod
  const p1 = { x: -46, y: dy };
  const p2 = { x: 66, y: dy };
  wheel(x, p1.x, p1.y, 62, wheelA, 10, true);
  wheel(x, p2.x, p2.y, 62, wheelA, 10, true);
  const pin = (p) => ({ x: p.x + Math.cos(wheelA) * 62 * 0.62, y: p.y + Math.sin(wheelA) * 62 * 0.62 });
  const a1 = pin(p1);
  const a2 = pin(p2);
  x.strokeStyle = "#b8ab8c";
  x.lineWidth = 8;
  x.beginPath();
  x.moveTo(a1.x, a1.y);
  x.lineTo(a2.x, a2.y);
  x.stroke();
  x.strokeStyle = "#463c30";
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(a1.x, a1.y);
  x.lineTo(a2.x, a2.y);
  x.stroke();
  wheel(x, 140, -26, 26, wheelA * 1.9, 6);
  wheel(x, 196, -26, 26, wheelA * 1.9, 6);
  x.restore();
}

// Smoke puffs from the stack: puffs[] immutable {g, x, y, r0}; drawn by age.
export function puffs(x, worldG, list, drift = 1) {
  for (const p of list) {
    const age = worldG - p.g;
    if (age < 0 || age > 3.4) continue;
    const u = age / 3.4;
    const r = p.r0 + u * 64;
    const px = p.x + drift * age * (18 + p.r0 * 0.5);
    const py = p.y - age * (46 + p.r0 * 0.3);
    // soft body, then a gentle darker underside — a puff, never a ring
    x.fillStyle = `rgba(238,228,206,${0.52 * (1 - u) ** 1.3})`;
    x.beginPath();
    x.arc(px, py, r, 0, 7);
    x.arc(px + r * 0.35, py + 2, r * 0.8, 0, 7);
    x.fill();
    x.fillStyle = `rgba(150,132,104,${0.1 * (1 - u) ** 1.3})`;
    x.beginPath();
    x.arc(px + r * 0.18, py + r * 0.28, r * 0.6, 0, 7);
    x.fill();
  }
}

// ---------- print wear: scratches, dust, hair (per crank-frame, inside the stage) ----------
export function wear(x, t, seed, ox) {
  const fq = Math.floor(t * 16);
  x.save();
  x.beginPath();
  x.rect(ox, 0, 1440, 1080);
  x.clip();
  // vertical scratch, present on ~1/4 of crank frames
  if (hash(fq * 3 + seed) > 0.72) {
    const sx = ox + hash(fq * 5 + seed + 1) * 1440;
    const wob = (yy) => Math.sin(yy * 0.02 + fq) * 5;
    x.strokeStyle = `rgba(255,250,235,${0.1 + hash(fq * 7 + seed) * 0.13})`;
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(sx + wob(0), -4);
    for (let yy = 0; yy < 1088; yy += 68) x.lineTo(sx + wob(yy), yy);
    x.stroke();
  }
  // dust + hairs
  const n = 5 + Math.floor(hash(fq * 11 + seed) * 6);
  for (let i = 0; i < n; i++) {
    const dx = ox + hash(fq * 13 + i * 7 + seed) * 1440;
    const dy2 = hash(fq * 17 + i * 3 + seed) * 1080;
    if (hash(fq * 19 + i + seed) > 0.5) {
      x.fillStyle = hash(fq * 23 + i + seed) > 0.5 ? "rgba(30,22,12,0.5)" : "rgba(255,250,235,0.5)";
      x.fillRect(dx, dy2, 1 + hash(i + fq) * 2.2, 1 + hash(i * 3 + fq) * 2.2);
    } else {
      x.strokeStyle = "rgba(46,34,20,0.34)";
      x.lineWidth = 1.1;
      x.beginPath();
      x.moveTo(dx, dy2);
      x.quadraticCurveTo(dx + 6 * (hash(i * 5 + fq) - 0.5), dy2 + 6, dx + 11 * (hash(i * 9 + fq) - 0.5), dy2 + 13);
      x.stroke();
    }
  }
  // two permanent gate blotches
  x.fillStyle = "rgba(60,44,24,0.05)";
  x.beginPath();
  x.ellipse(ox + 120, 130, 70, 52, 0.4, 0, 7);
  x.fill();
  x.beginPath();
  x.ellipse(ox + 1370, 940, 60, 78, -0.3, 0, 7);
  x.fill();
  x.restore();
}

// ---------- irises ----------
// Circle iris mask: p 0..1 open radius. evenodd — moveTo before arc or you get a wedge.
export function circleIris(x, ox, p, cx, cy, maxR, fill = "#0a0705") {
  if (p <= 0) return;
  const r = Math.max(0.1, maxR * (1 - p) ** 1.9);
  x.fillStyle = fill;
  x.beginPath();
  x.rect(ox, 0, 1440, 1080);
  x.moveTo(ox + cx + r, cy);
  x.arc(ox + cx, cy, r, 0, 2 * Math.PI, true);
  x.fill("evenodd");
}

// Heart iris: scale grows from 0 to 1; outside darkens. squash < 1 keeps the tip inside the frame.
export function heartIris(x, ox, p, cx, cy, size, squash = 0.8) {
  const buildHeart = () => {
    x.save();
    x.translate(ox + cx, cy);
    x.scale(1, squash);
    heartPath(x, 0, 0, size);
    x.restore();
  };
  const dark = (a) => {
    x.fillStyle = `rgba(16,10,6,${a})`;
    x.beginPath();
    x.rect(ox, 0, 1440, 1080);
    buildHeart();
    x.fill("evenodd");
  };
  if (p <= 0) return;
  if (p < 0.24) dark(0.86 * E.outCubic(p / 0.24));
  else dark(0.86);
  // heart keyline
  x.strokeStyle = "rgba(240,220,180,0.5)";
  x.lineWidth = 5;
  x.save();
  x.globalAlpha = Math.min(1, p / 0.3);
  x.beginPath();
  buildHeart();
  x.stroke();
  x.restore();
}
export function heartPath(x, cx, cy, s) {
  x.moveTo(cx + s, cy + s * 0.32);
  x.bezierCurveTo(cx + s, cy - s * 0.42, cx, cy - s * 0.5, cx, cy - s * 0.06);
  x.bezierCurveTo(cx, cy - s * 0.5, cx - s, cy - s * 0.42, cx - s, cy + s * 0.32);
  x.bezierCurveTo(cx - s, cy + s * 0.78, cx - s * 0.4, cy + s * 1.04, cx, cy + s * 1.3);
  x.bezierCurveTo(cx + s * 0.4, cy + s * 1.04, cx + s, cy + s * 0.78, cx + s, cy + s * 0.32);
  x.closePath();
}
