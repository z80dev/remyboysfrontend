// THE BIG SHEDDING — art. All static painting is baked once in prepareArt();
// everything time-dependent (rain, neon, fan, steam, spotlights) is drawn pure
// from t in scenes.js using the painters exported here. Deep-blue night noir:
// amber windows, cyan/pink neon, the hero's red hair is the only warm thing.
import { E, clamp, hash, lerp, measure, rng, txt, vnoise } from "filmkit/lib.js";
import { loadHeads, loadRemy } from "../remy-bros/art.js";
import { CAST } from "./timeline.js";

export const F = {
  anton: "Anton",
  mono: '"JetBrains Mono"',
  grot: '"Space Grotesk"',
  vt: "VT323",
  serif: '"Cormorant Garamond"',
};

// ── palette ─────────────────────────────────────────────────────────────────
export const PAL = {
  skyTop: "#04050c",
  skyMid: "#0a1024",
  skyLow: "#131f3a",
  haze: "#1a2745",
  moon: "#e8eeff",
  moonGlow: "#8fa6d8",
  far: "#0b1120",
  farLit: "#4a5f8c",
  mid: "#10182c",
  brick: "#151f38",
  mortar: "#0b1222",
  winAmber: "#ffb95e",
  winPale: "#cfe0ff",
  winCyan: "#7fd8ff",
  winDead: "#131a2e",
  sidewalk: "#1a2336",
  curb: "#0b101d",
  road: "#080d18",
  sheen: "#121c33",
  neonCyan: "#59e8ff",
  neonPink: "#ff5a7a",
  neonAmber: "#ffc866",
  lamp: "#ffd9a0",
  wall: "#1a2033",
  wood: "#2e2436",
  woodLo: "#221a29",
  floorA: "#151a2e",
  floorB: "#0d1120",
  red: "#c8375a",
};

export const ART = {};

// ── character loading (rig from remy-bros; sprites + framed duotone portraits) ──
const remyUrl = (i) => new URL(`../../media/remy/Character${i}.webp`, import.meta.url).href;
function loadImg(url) {
  const i = new Image();
  i.src = url;
  return i.decode().then(() => i);
}

// Noir duotone portrait card: white matte, desaturated + blue-tinted print.
export function duotoneCard(img, size, o = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d");
  const m = Math.round(size * 0.05);
  x.fillStyle = "#f2efe6";
  x.fillRect(0, 0, size, size);
  x.strokeStyle = "rgba(20,26,44,0.9)";
  x.lineWidth = 2;
  x.strokeRect(1, 1, size - 2, size - 2);
  x.save();
  x.beginPath();
  x.rect(m, m, size - 2 * m, size - 2 * m);
  x.clip();
  x.drawImage(img, m, m, size - 2 * m, size - 2 * m);
  x.globalCompositeOperation = "saturation";
  x.fillStyle = "#808080";
  x.fillRect(m, m, size - 2 * m, size - 2 * m);
  x.globalCompositeOperation = "color";
  x.fillStyle = o.tint || "#435377";
  x.fillRect(m, m, size - 2 * m, size - 2 * m);
  x.globalCompositeOperation = "multiply";
  const g = x.createLinearGradient(m, m, m, size);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.8, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(120,130,160,1)");
  x.fillStyle = g;
  x.fillRect(m, m, size - 2 * m, size - 2 * m);
  x.restore();
  return c;
}

export async function prepareArt() {
  // sprite rig (near sprites)
  const [hero, baron, goonA, goonB, witness, midnight] = await Promise.all([
    loadRemy(CAST.HERO, false),
    loadRemy(CAST.BARON, false),
    loadRemy(CAST.GOON_A, false),
    loadRemy(CAST.GOON_B, false),
    loadRemy(CAST.WITNESS, false),
    loadRemy(CAST.MIDNIGHT, false),
  ]);
  ART.hero = hero;
  ART.baron = baron;
  ART.goonA = goonA;
  ART.goonB = goonB;
  ART.witness = witness;
  ART.midnight = midnight;
  // originals → framed portraits
  const [oMid, oWit, oBaron, oHero] = await Promise.all(
    [CAST.MIDNIGHT, CAST.WITNESS, CAST.BARON, CAST.HERO].map((i) => loadImg(remyUrl(i))),
  );
  ART.cardMid = duotoneCard(oMid, 420, { tint: "#4a5578" });
  ART.cardWit = duotoneCard(oWit, 360, { tint: "#43537a" });
  ART.cardBaron = duotoneCard(oBaron, 420, { tint: "#574a63" });
  ART.cardHero = duotoneCard(oHero, 340, { tint: "#5a4a4a" });
  // painted sets (office = { bg, desk } two layers so actors can sit behind the desk)
  ART.sky = bakeSky(1920, 1080);
  ART.far = bakeFar(2300, 560);
  ART.mid = bakeMid(2400, 720);
  ART.near = bakeNear(2400, 780);
  ART.office = { bg: bakeOffice(1920, 1080, false), desk: bakeDesk(1920, 1080) };
  ART.officeDawn = { bg: bakeOffice(1920, 1080, true), desk: bakeDesk(1920, 1080) };
  ART.club = bakeClub(1920, 1080);
  ART.heads = await loadHeads();
}

// ── sky: gradient, moon in a halo, cloud slivers ────────────────────────────
function bakeSky(w, h) {
  const c = mk(w, h);
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, PAL.skyTop);
  g.addColorStop(0.55, PAL.skyMid);
  g.addColorStop(1, PAL.skyLow);
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  // moon (low enough to clear the 2.39:1 letterbox band)
  const mx = w * 0.74;
  const my = h * 0.26;
  const mr = 74;
  const halo = x.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 5);
  halo.addColorStop(0, "rgba(190,205,255,0.5)");
  halo.addColorStop(0.25, "rgba(140,160,220,0.16)");
  halo.addColorStop(1, "rgba(140,160,220,0)");
  x.fillStyle = halo;
  x.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
  x.fillStyle = PAL.moon;
  x.beginPath();
  x.arc(mx, my, mr, 0, 7);
  x.fill();
  // craters, barely there
  x.fillStyle = "rgba(160,175,215,0.5)";
  for (let i = 0; i < 5; i++) {
    const a = hash(80 + i) * 7;
    const r = mr * (0.15 + hash(90 + i) * 0.4);
    x.beginPath();
    x.arc(mx + Math.cos(a) * mr * 0.5, my + Math.sin(a) * mr * 0.5, r, 0, 7);
    x.fill();
  }
  // cloud slivers crossing the halo
  x.fillStyle = "rgba(10,14,28,0.55)";
  for (let i = 0; i < 7; i++) {
    const cy = h * (0.1 + hash(i) * 0.22);
    const cw = 300 + hash(i + 40) * 700;
    const ch = 14 + hash(i + 80) * 26;
    const cx = hash(i + 120) * w;
    for (let s = 0; s < 3; s++) {
      x.beginPath();
      x.ellipse(cx + s * cw * 0.3, cy + s * 6, cw * (0.55 - s * 0.1), ch * (0.6 + s * 0.2), 0.05, 0, 7);
      x.fill();
    }
  }
  return c;
}

// ── far skyline: silhouettes + sparse lit windows, hazed at the base ─────────
function bakeFar(w, h) {
  const c = mk(w, h);
  const x = c.getContext("2d");
  const r = rng(11);
  let px = -40;
  while (px < w) {
    const bw = 60 + r() * 130;
    const bh = h * (0.3 + r() * 0.62);
    const top = h - bh;
    x.fillStyle = PAL.far;
    x.fillRect(px, top, bw, bh);
    // sparse windows
    x.fillStyle = PAL.farLit;
    for (let wy = top + 10; wy < h - 14; wy += 13)
      for (let wx = px + 5; wx < px + bw - 6; wx += 9) if (r() < 0.055) x.fillRect(wx, wy, 3, 5);
    // roof furniture
    if (r() < 0.4) {
      x.fillRect(px + bw * 0.3, top - 14, 3, 14);
      x.fillRect(px + bw * 0.55, top - 8, 2, 8);
    }
    if (r() < 0.22) x.fillRect(px + bw * 0.5 - 12, top - 10, 24, 10); // water tank base
    px += bw + 2 + r() * 26;
  }
  // haze into the distance
  const g = x.createLinearGradient(0, h * 0.4, 0, h);
  g.addColorStop(0, "rgba(19,31,58,0)");
  g.addColorStop(1, "rgba(19,31,58,0.95)");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  return c;
}

// ── mid row: brick faces, fire escapes, windows …─────────────────────────────
function bakeMid(w, h) {
  const c = mk(w, h);
  const x = c.getContext("2d");
  const r = rng(23);
  let px = -30;
  while (px < w) {
    const bw = 170 + r() * 220;
    const bh = h * (0.55 + r() * 0.4);
    const top = h - bh;
    // face + brick texture
    const face = x.createLinearGradient(px, top, px, h);
    face.addColorStop(0, PAL.mid);
    face.addColorStop(1, "#0c1426");
    x.fillStyle = face;
    x.fillRect(px, top, bw, bh);
    x.fillStyle = PAL.mortar;
    for (let by = top + 4; by < h; by += 7) {
      x.globalAlpha = 0.25 + r() * 0.2;
      x.fillRect(px, by, bw, 1);
      for (let bx = px + ((by / 7) % 2 ? 8 : 16); bx < px + bw; bx += 16) x.fillRect(bx, by, 1, 7);
    }
    x.globalAlpha = 1;
    // cornice + roof edge
    x.fillStyle = "#1a2340";
    x.fillRect(px - 4, top, bw + 8, 6);
    if (r() < 0.5) {
      // water tower silhouette
      const tx = px + bw * (0.2 + r() * 0.5);
      x.fillStyle = "#0d1526";
      x.fillRect(tx - 16, top - 34, 32, 22);
      x.beginPath();
      x.moveTo(tx - 20, top - 34);
      x.lineTo(tx, top - 48);
      x.lineTo(tx + 20, top - 34);
      x.closePath();
      x.fill();
      x.fillRect(tx - 10, top - 12, 3, 12);
      x.fillRect(tx + 7, top - 12, 3, 12);
    }
    // window grid: lit amber / pale / dead
    const cols = Math.max(2, Math.floor(bw / 34));
    const rows = Math.floor(bh / 46);
    const ox = px + (bw - cols * 30 + 6) / 2;
    const oy = top + 16;
    for (let cy = 0; cy < rows; cy++)
      for (let cx = 0; cx < cols; cx++) {
        const wx = ox + cx * 30;
        const wy = oy + cy * 44;
        if (wy > h - 40) continue;
        const v = hash(wx * 3 + wy * 7 + 500);
        let col = PAL.winDead;
        if (v > 0.87) col = PAL.winAmber;
        else if (v > 0.83) col = PAL.winPale;
        else if (v > 0.815) col = PAL.winCyan;
        x.fillStyle = col;
        x.fillRect(wx, wy, 22, 30);
        x.fillStyle = "rgba(6,10,20,0.85)";
        x.fillRect(wx + 10, wy, 2, 30);
        x.fillRect(wx, wy + 14, 22, 2);
        if (col !== PAL.winDead && v > 0.965) {
          // a lit curtain
          x.fillStyle = "rgba(255,190,120,0.35)";
          x.fillRect(wx + 2, wy + 18, 18, 12);
        }
        // sill glow under lit windows
        if (col === PAL.winAmber || col === PAL.winPale) {
          x.fillStyle = col === PAL.winAmber ? "rgba(255,185,94,0.14)" : "rgba(207,224,255,0.1)";
          x.fillRect(wx - 3, wy + 30, 28, 5);
        }
      }
    // fire escape zigzags on some faces
    if (r() < 0.45) {
      const fx = px + bw * (0.25 + r() * 0.5);
      x.strokeStyle = "rgba(6,10,20,0.9)";
      x.lineWidth = 3;
      for (let fy = top + 30; fy < h - 50; fy += 88) {
        x.strokeRect(fx - 26, fy, 52, 40);
        x.beginPath();
        x.moveTo(fx - 26, fy + 40);
        x.lineTo(fx + 26, fy + 88);
        x.stroke();
        x.beginPath();
        x.moveTo(fx + 26, fy + 40);
        x.lineTo(fx - 26, fy + 88);
        x.stroke();
      }
    }
    px += bw + 6 + r() * 18;
  }
  return c;
}

// ── near street level (2400×780): storefronts, club entrance, lamps, car ─────
// ground line: sidewalk top at y 560, road below y 700. Exported: doorways/lamps.
export const NEAR = { groundY: 560, doorways: [], lamps: [], grateX: 1810, clubX: 1180, barberX: 640 };

function bakeNear(w, h) {
  const c = mk(w, h);
  const x = c.getContext("2d");
  const r = rng(37);
  const gTop = NEAR.groundY;
  // facade band above the sidewalk
  const fg = x.createLinearGradient(0, 0, 0, gTop);
  fg.addColorStop(0, "#0d1426");
  fg.addColorStop(1, "#141d33");
  x.fillStyle = fg;
  x.fillRect(0, 0, w, gTop);
  // storefront cornice line
  x.fillStyle = "#1c2742";
  x.fillRect(0, 64, w, 10);

  const store = (x0, sw, kind) => {
    // shop window frame
    x.fillStyle = "#0a0f1e";
    x.fillRect(x0, 120, sw, gTop - 150);
    if (kind === "dead") {
      // boarded window
      x.fillStyle = "#151b2c";
      for (let b = 0; b < 4; b++) x.fillRect(x0 + 6 + b * (sw / 4), 130 + (b % 2) * 40, sw / 5, 90);
    } else {
      // glowing interior
      const warm =
        kind === "barber"
          ? "rgba(255,200,140,0.16)"
          : kind === "club"
            ? "rgba(120,230,255,0.13)"
            : "rgba(255,200,140,0.1)";
      x.fillStyle = warm;
      x.fillRect(x0 + 6, 126, sw - 12, gTop - 156);
      // mullions
      x.fillStyle = "#0a0f1e";
      x.fillRect(x0 + sw / 2 - 3, 120, 6, gTop - 150);
      x.fillRect(x0, 300, sw, 6);
      // silhouette junk inside
      x.fillStyle = "rgba(5,8,16,0.8)";
      for (let j = 0; j < 5; j++) {
        const jw = 20 + r() * 60;
        x.fillRect(x0 + 14 + r() * (sw - 40), 380 + r() * 60, jw, 70 + r() * 60);
      }
    }
    // door beside the window
    const dw = 74;
    const dx = x0 + sw + 14;
    x.fillStyle = "#0a0f1e";
    x.fillRect(dx, 240, dw, gTop - 240);
    NEAR.doorways.push({ x: dx + 6, w: dw - 12, y: 246 });
    // transom + awning
    x.fillStyle = kind === "club" ? "rgba(90,232,255,0.25)" : "rgba(255,200,140,0.2)";
    x.fillRect(dx + 8, 250, dw - 16, 14);
    x.fillStyle = kind === "club" ? "#17303c" : "#241a26";
    x.beginPath();
    x.moveTo(x0 - 8, 140);
    x.lineTo(x0 + sw + dw + 26, 140);
    x.lineTo(x0 + sw + dw + 14, 210);
    x.lineTo(x0 + 4, 210);
    x.closePath();
    x.fill();
    x.fillStyle = "rgba(0,0,0,0.35)";
    for (let s = 0; s < sw + dw; s += 46) x.fillRect(x0 - 8 + s, 141, 23, 68);
    // hanging sign plate (dead shops get a blank one)
    x.fillStyle = "#0c1322";
    x.fillRect(x0 + sw * 0.5 - 40, 96, 80, 30);
    x.strokeStyle = "#253356";
    x.lineWidth = 2;
    x.strokeRect(x0 + sw * 0.5 - 40, 96, 80, 30);
    return dx + dw;
  };

  let px = 30;
  // laundromat (dead-ish warm)
  px = store(px, 250, "warm") + 40;
  // tenement wall gap
  x.fillStyle = "#0f1628";
  x.fillRect(px, 60, 190, gTop - 60);
  x.fillStyle = PAL.mortar;
  for (let by = 66; by < gTop; by += 8) x.fillRect(px, by, 190, 1);
  x.fillStyle = "rgba(255,185,94,0.5)";
  for (let i = 0; i < 3; i++) {
    const wx = px + 30 + i * 56;
    x.fillRect(wx, 150, 16, 24);
    x.fillRect(wx, 230, 16, 24);
  }
  px += 230;
  // barber shop (window x0 = 638 — neon goes above it)
  px = store(px, 220, "barber") + 30;
  NEAR.barberX = 638;
  // gap: fire-escaped tenement
  x.fillStyle = "#0e1526";
  x.fillRect(px, 60, 260, gTop - 60);
  x.strokeStyle = "rgba(5,8,16,0.9)";
  x.lineWidth = 3;
  for (let fy = 100; fy < gTop - 60; fy += 90) {
    x.strokeRect(px + 100, fy, 60, 46);
    x.beginPath();
    x.moveTo(px + 100, fy + 46);
    x.lineTo(px + 160, fy + 90);
    x.stroke();
  }
  px += 290;
  // THE COMB CLUB — the destination (window x0 = 1266, door 1580–1654)
  px = store(px, 300, "club") + 26;
  NEAR.clubX = 1610;
  // side alley
  x.fillStyle = "#060a14";
  x.fillRect(px, 150, 90, gTop - 150);
  px += 120;
  // another dead storefront to fill
  store(px, 260, "dead");
  px += 360;

  // sidewalk (wet sheen) + curb + road
  x.fillStyle = PAL.sidewalk;
  x.fillRect(0, gTop, w, 78);
  x.fillStyle = "rgba(255,255,255,0.05)";
  for (let s = 0; s < w; s += 64) x.fillRect(s, gTop, 2, 78);
  x.fillStyle = PAL.curb;
  x.fillRect(0, gTop + 78, w, 16);
  x.fillStyle = PAL.road;
  x.fillRect(0, gTop + 94, w, h - gTop - 94);
  // manhole
  x.fillStyle = "#0a0f1c";
  x.beginPath();
  x.ellipse(900, gTop + 150, 34, 10, 0, 0, 7);
  x.fill();
  x.strokeStyle = "#1c2946";
  x.lineWidth = 2;
  x.beginPath();
  x.ellipse(900, gTop + 150, 34, 10, 0, 0, 7);
  x.stroke();
  // steam grate
  x.fillStyle = "#0c1322";
  x.fillRect(NEAR.grateX - 40, gTop + 12, 80, 10);
  for (let b = 0; b < 7; b++) x.fillRect(NEAR.grateX - 36 + b * 11, gTop + 12, 4, 10);

  // street lamps (posts baked; cones + halo drawn live)
  for (let lx = 190; lx < w; lx += 470) {
    x.fillStyle = "#0a1020";
    x.fillRect(lx - 3, 190, 6, gTop + 60 - 190);
    x.beginPath();
    x.moveTo(lx - 3, 196);
    x.quadraticCurveTo(lx, 168, lx + 26, 172);
    x.lineTo(lx + 26, 178);
    x.quadraticCurveTo(lx + 4, 176, lx + 3, 200);
    x.closePath();
    x.fill();
    x.fillStyle = "#0d1526";
    x.fillRect(lx - 7, gTop + 52, 14, 8);
    NEAR.lamps.push(lx);
  }
  // parked noir sedan
  const carX = 1330;
  const carY = gTop + 8;
  x.fillStyle = "#070b16";
  x.beginPath();
  x.moveTo(carX, carY - 26);
  x.quadraticCurveTo(carX + 30, carY - 78, carX + 110, carY - 80);
  x.quadraticCurveTo(carX + 210, carY - 82, carX + 240, carY - 30);
  x.quadraticCurveTo(carX + 252, carY - 12, carX + 244, carY);
  x.lineTo(carX - 8, carY);
  x.closePath();
  x.fill();
  // wet roof highlight
  x.fillStyle = "rgba(120,150,210,0.25)";
  x.beginPath();
  x.ellipse(carX + 120, carY - 78, 96, 9, 0, 0, 7);
  x.fill();
  // wheel wells
  x.fillStyle = "#04060d";
  x.beginPath();
  x.arc(carX + 52, carY, 22, 0, 7);
  x.arc(carX + 188, carY, 22, 0, 7);
  x.fill();
  x.fillStyle = "#141c30";
  x.beginPath();
  x.arc(carX + 52, carY, 10, 0, 7);
  x.arc(carX + 188, carY, 10, 0, 7);
  x.fill();
  // hydrant + trash cans
  x.fillStyle = "#101828";
  x.fillRect(240, gTop - 34, 18, 34);
  x.fillRect(236, gTop - 38, 26, 7);
  x.fillRect(234, gTop - 22, 30, 5);
  for (const tx of [430, 462]) {
    x.fillStyle = "#0d1424";
    x.fillRect(tx, gTop - 40, 26, 40);
    x.fillStyle = "#141d33";
    x.fillRect(tx - 2, gTop - 44, 30, 7);
  }
  return c;
}

// ── the office (night + dawn variants) ──────────────────────────────────────
function bakeOffice(w, h, dawn) {
  const c = mk(w, h);
  const x = c.getContext("2d");
  // walls (a touch above pitch black so silhouettes still read)
  const wall = x.createLinearGradient(0, 0, 0, h);
  if (dawn) {
    wall.addColorStop(0, "#2c2638");
    wall.addColorStop(1, "#1b1729");
  } else {
    wall.addColorStop(0, "#1c2338");
    wall.addColorStop(1, "#131828");
  }
  x.fillStyle = wall;
  x.fillRect(0, 0, w, h);
  // baseboard + floor
  x.fillStyle = dawn ? "#241d2e" : "#131828";
  x.fillRect(0, 900, w, 180);
  x.fillStyle = "rgba(0,0,0,0.4)";
  x.fillRect(0, 900, w, 6);
  for (let px2 = 0; px2 < w; px2 += 140) x.fillRect(px2, 906, 2, 174);
  // window (right half) — blinds at night, open at dawn
  const wx = 1150;
  const wy = 150;
  const ww = 560;
  const wh = 470;
  x.fillStyle = "#0a0f1e";
  x.fillRect(wx - 14, wy - 14, ww + 28, wh + 28);
  if (dawn) {
    const skyG = x.createLinearGradient(0, wy, 0, wy + wh);
    skyG.addColorStop(0, "#8fb4d8");
    skyG.addColorStop(0.6, "#e8c9a4");
    skyG.addColorStop(1, "#f2d9b0");
    x.fillStyle = skyG;
    x.fillRect(wx, wy, ww, wh);
    // rising sun + skyline cut
    x.fillStyle = "rgba(255,244,214,0.95)";
    x.beginPath();
    x.arc(wx + ww * 0.62, wy + wh * 0.66, 58, 0, 7);
    x.fill();
    x.fillStyle = "#4a4056";
    for (let b = 0; b < 9; b++) {
      const bw2 = 40 + hash(b + 9) * 70;
      const bh2 = 60 + hash(b + 20) * 150;
      x.fillRect(wx + b * 64 - 10, wy + wh - bh2, bw2, bh2);
    }
    // mullions
    x.fillStyle = "#0a0f1e";
    x.fillRect(wx + ww / 2 - 4, wy, 8, wh);
    x.fillRect(wx, wy + wh / 2 - 4, ww, 8);
  } else {
    // night city through glass, rain hinted by streak highlights
    const skyG = x.createLinearGradient(0, wy, 0, wy + wh);
    skyG.addColorStop(0, "#0a1024");
    skyG.addColorStop(1, "#152242");
    x.fillStyle = skyG;
    x.fillRect(wx, wy, ww, wh);
    x.fillStyle = "#0d1526";
    for (let b = 0; b < 10; b++) {
      const bw2 = 50 + hash(b + 3) * 80;
      const bh2 = 90 + hash(b + 30) * 240;
      x.fillRect(wx + b * 58 - 8, wy + wh - bh2, bw2, bh2);
    }
    x.fillStyle = "rgba(255,185,94,0.75)";
    for (let i = 0; i < 26; i++) x.fillRect(wx + hash(i + 60) * ww, wy + hash(i + 90) * wh * 0.8 + 60, 4, 6);
    x.fillStyle = "rgba(160,190,255,0.5)";
    for (let i = 0; i < 14; i++) x.fillRect(wx + hash(i + 160) * ww, wy + wh * 0.4 + hash(i + 190) * wh * 0.55, 2, 14); // rain on glass
    // blinds (slats)
    for (let sy2 = wy + 4; sy2 < wy + wh - 6; sy2 += 26) {
      x.fillStyle = "#1b2238";
      x.fillRect(wx, sy2, ww, 18);
      x.fillStyle = "rgba(120,140,190,0.18)";
      x.fillRect(wx, sy2, ww, 3);
    }
    x.fillStyle = "#0a0f1e";
    x.fillRect(wx + ww / 2 - 4, wy, 8, wh);
  }
  // filing cabinet (left of window)
  x.fillStyle = "#1a2136";
  x.fillRect(960, 560, 150, 340);
  x.fillStyle = "#232c48";
  x.fillRect(960, 560, 150, 14);
  for (let d2 = 0; d2 < 4; d2++) {
    x.fillStyle = "#141a2c";
    x.fillRect(976, 590 + d2 * 78, 118, 64);
    x.fillStyle = "#2a3452";
    x.fillRect(1010, 622 + d2 * 78, 50, 7);
  }
  // coat rack + hat (left, by the door)
  x.fillStyle = "#241a26";
  x.fillRect(120, 380, 8, 520);
  x.fillRect(88, 380, 72, 8);
  x.fillStyle = "#1a1320";
  x.fillRect(96, 384, 26, 60); // coat
  x.beginPath();
  x.ellipse(146, 388, 22, 9, -0.12, 0, 7);
  x.fill();
  x.fillStyle = "#231b2c";
  x.fillRect(132, 366, 28, 18);
  // door frame (left edge)
  x.fillStyle = "#0c1120";
  x.fillRect(0, 140, 96, 760);
  x.fillStyle = "#151d33";
  x.fillRect(80, 150, 14, 748);
  // wall interest: a framed "first mane" certificate, left of the desk
  x.fillStyle = "#0e1426";
  x.fillRect(470, 330, 130, 100);
  x.strokeStyle = "#6a5a2c";
  x.lineWidth = 3;
  x.strokeRect(470, 330, 130, 100);
  x.strokeStyle = "#3a3324";
  x.lineWidth = 1.5;
  x.strokeRect(478, 338, 114, 84);
  x.fillStyle = "#4a4230";
  for (let ly = 0; ly < 3; ly++) x.fillRect(492, 366 + ly * 14, 86 - ly * 14, 3);
  x.fillStyle = "#8a7440";
  x.fillRect(492, 352, 40, 6);
  // radiator below it, bottom-left
  x.fillStyle = "#141a2c";
  x.fillRect(300, 796, 220, 104);
  x.fillStyle = "#0e1322";
  for (let f = 0; f < 11; f++) x.fillRect(310 + f * 19, 806, 11, 84);
  x.fillStyle = "#1a2136";
  x.fillRect(300, 792, 220, 8);
  return c;
}

// The desk + clutter as its own layer, so actors can stand behind it.
function bakeDesk(w, h) {
  const c = mk(w, h);
  const x = c.getContext("2d");
  const dy = 812;
  x.fillStyle = PAL.woodLo;
  x.fillRect(560, dy, 760, 26);
  x.fillStyle = "#191223";
  x.fillRect(576, dy + 26, 24, 130);
  x.fillRect(1280, dy + 26, 24, 130);
  const deskTop = x.createLinearGradient(0, dy - 6, 0, dy + 12);
  deskTop.addColorStop(0, "#3d2f45");
  deskTop.addColorStop(1, PAL.wood);
  x.fillStyle = deskTop;
  x.fillRect(560, dy - 8, 760, 20);
  // desk clutter: blotter, phone, mug, paper stack
  x.fillStyle = "#20263c";
  x.fillRect(700, dy - 6, 300, 16);
  x.fillStyle = "#101524";
  x.fillRect(1080, dy - 34, 92, 30);
  x.fillStyle = "#161d31";
  x.fillRect(1088, dy - 42, 40, 10);
  x.fillStyle = "#3a2c40";
  x.fillRect(1000, dy - 24, 26, 22);
  x.fillStyle = "#241d30";
  x.fillRect(620, dy - 22, 120, 18);
  // desk lamp (banker's green), right of desk — cone drawn live in scenes
  x.fillStyle = "#0f1524";
  x.fillRect(1266, dy - 8, 10, 8);
  x.fillRect(1262, dy - 60, 6, 54);
  x.beginPath();
  x.moveTo(1256, dy - 58);
  x.quadraticCurveTo(1240, dy - 108, 1188, dy - 118);
  x.lineTo(1196, dy - 92);
  x.quadraticCurveTo(1240, dy - 88, 1262, dy - 50);
  x.closePath();
  x.fill();
  x.fillStyle = "#2e5a44";
  x.beginPath();
  x.ellipse(1200, dy - 100, 44, 22, -0.18, 0, 7);
  x.fill();
  return c;
}

// ── the Comb Club interior ───────────────────────────────────────────────────
function bakeClub(w, h) {
  const c = mk(w, h);
  const x = c.getContext("2d");
  // back wall — deep oxblood
  const bg = x.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#1c0f18");
  bg.addColorStop(1, "#2a1420");
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  // wall paneling
  x.strokeStyle = "rgba(0,0,0,0.35)";
  x.lineWidth = 3;
  for (let px2 = 60; px2 < w; px2 += 220) {
    x.beginPath();
    x.moveTo(px2, 120);
    x.lineTo(px2, 760);
    x.stroke();
  }
  x.fillStyle = "rgba(0,0,0,0.3)";
  x.fillRect(0, 118, w, 10);
  x.fillRect(0, 756, w, 10);
  // bottle shelf along the back (amber + cyan glints)
  for (let bx = 180; bx < 1500; bx += 54) {
    const bh2 = 40 + hash(bx) * 46;
    x.fillStyle = "#0d0810";
    x.fillRect(bx, 420 - bh2, 20, bh2);
    x.fillStyle = hash(bx + 3) > 0.5 ? "rgba(255,190,110,0.5)" : "rgba(130,225,255,0.4)";
    x.fillRect(bx + 5, 420 - bh2 + 8, 4, bh2 - 22);
    x.fillStyle = "#1a1020";
    x.fillRect(bx + 6, 420 - bh2 - 12, 8, 14);
  }
  x.fillStyle = "#0f0a14";
  x.fillRect(150, 420, 1400, 14);
  // mirror smears behind bottles
  x.fillStyle = "rgba(150,170,210,0.08)";
  for (let s = 0; s < 8; s++) x.fillRect(180 + s * 180, 250, 90, 160);
  // bar counter
  x.fillStyle = "#241528";
  x.fillRect(140, 640, 1420, 40);
  x.fillStyle = "#2f1c30";
  x.fillRect(140, 680, 1420, 120);
  x.fillStyle = "rgba(255,205,130,0.07)";
  for (let s = 0; s < 9; s++) x.fillRect(150 + s * 160, 645, 120, 26); // counter top sheen
  // floor base fill so the checkerboard edges never show raw wall
  x.fillStyle = PAL.floorB;
  x.fillRect(0, 756, w, h - 756);
  // checkerboard floor in perspective (vanishing at 960, 620)
  const vpx = 960;
  const vpy = 600;
  for (let row = 0; row < 16; row++) {
    const t0 = row / 16;
    const t1 = (row + 1) / 16;
    const yA = 760 + t0 ** 1.7 * 320;
    const yB = 760 + t1 ** 1.7 * 320;
    const wA = lerp(60, 1880, t0 ** 1.6);
    const wB = lerp(60, 1880, t1 ** 1.6);
    const n = 18;
    for (let i = 0; i < n; i++) {
      if ((i + row) % 2) continue;
      const ax0 = vpx + (i / n - 0.5) * wA;
      const ax1 = vpx + ((i + 1) / n - 0.5) * wA;
      const bx0 = vpx + (i / n - 0.5) * wB;
      const bx1 = vpx + ((i + 1) / n - 0.5) * wB;
      x.fillStyle = (i + row) % 2 ? PAL.floorA : PAL.floorB;
      x.beginPath();
      x.moveTo(ax0, yA);
      x.lineTo(ax1, yA);
      x.lineTo(bx1, yB);
      x.lineTo(bx0, yB);
      x.closePath();
      x.fill();
    }
  }
  // soft radial sheen pool where the spotlight lands (no hard rectangle)
  const sheen = x.createRadialGradient(960, 940, 20, 960, 940, 330);
  sheen.addColorStop(0, "rgba(255,210,150,0.10)");
  sheen.addColorStop(1, "rgba(255,210,150,0)");
  x.fillStyle = sheen;
  x.beginPath();
  x.ellipse(960, 950, 340, 130, 0, 0, 7);
  x.fill();
  // ceiling: rig + string bulbs (live glow)
  x.fillStyle = "#120a12";
  x.fillRect(0, 0, w, 90);
  x.strokeStyle = "#1e1220";
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(0, 96);
  x.quadraticCurveTo(480, 150, 960, 110);
  x.quadraticCurveTo(1440, 150, 1920, 96);
  x.stroke();
  x.fillStyle = "#241626";
  x.fillRect(880, 90, 12, 60);
  x.fillRect(1030, 90, 12, 60); // spot rigs
  // stage-right curtain sliver
  x.fillStyle = "#38141f";
  x.fillRect(0, 110, 120, 640);
  for (let s = 0; s < 6; s++) {
    x.fillStyle = "rgba(0,0,0,0.3)";
    x.fillRect(6 + s * 20, 110, 10, 640);
  }
  return c;
}

// ── lazy bakes (first draw, fonts guaranteed live) ───────────────────────────
const LAZY = {};
function lazy(key, w, h, paint) {
  if (!LAZY[key]) {
    const c = mk(w, h);
    paint(c.getContext("2d"), w, h);
    LAZY[key] = c;
  }
  return LAZY[key];
}

// Wanted poster: "HAVE YOU SEEN THIS HEAD?" + bald head silhouette
export function wantedPoster() {
  return lazy("poster", 250, 330, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#cfc4a2");
    g.addColorStop(1, "#a89877");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#efe8d2";
    x.fillRect(8, 8, w - 16, h - 16);
    x.fillStyle = "#241d12";
    txt(x, "WANTED", w / 2, 52, { size: 34, font: F.anton, align: "center", color: "#241d12" });
    txt(x, "HAVE YOU SEEN", w / 2, 84, {
      size: 15,
      font: F.mono,
      weight: 600,
      align: "center",
      color: "#3a2f1c",
      track: 1,
    });
    // bald head silhouette
    x.fillStyle = "#241d12";
    x.beginPath();
    x.ellipse(w / 2, 168, 62, 72, 0, 0, 7);
    x.fill();
    x.beginPath();
    x.ellipse(w / 2 - 8, 150, 40, 30, 0, 0, 7);
    x.fill(); // shine
    x.fillStyle = "#efe8d2";
    x.beginPath();
    x.ellipse(w / 2 + 26, 172, 5, 8, 0, 0, 7);
    x.fill(); // ear
    txt(x, "THIS HEAD?", w / 2, 276, {
      size: 17,
      font: F.mono,
      weight: 700,
      align: "center",
      color: "#241d12",
      track: 1,
    });
    txt(x, "REWARD: ONE MANE", w / 2, 306, { size: 12, font: F.mono, align: "center", color: "#5a4a2c" });
    // weathering
    x.fillStyle = "rgba(90,70,40,0.12)";
    for (let i = 0; i < 30; i++) x.fillRect(hash(i) * w, hash(i + 50) * h, 3, 3);
  });
}

// Case dossier: tabbed folder, strand sketch, stamps
export function dossier() {
  return lazy("dossier", 400, 300, (x, w, h) => {
    x.fillStyle = "#8a6a4a";
    x.fillRect(6, 10, w - 12, h - 16);
    x.fillStyle = "#9c7c58";
    x.fillRect(0, 0, w, h - 6);
    x.fillStyle = "#7c5c3e";
    x.fillRect(0, 0, w, 26);
    txt(x, 'CASE Nº 4490 — "THE SHEARING"', 20, 20, { size: 15, font: F.mono, weight: 700, color: "#2c1e10" });
    // clipped photo: one glowing strand
    x.fillStyle = "#efe8d2";
    x.fillRect(24, 44, 130, 120);
    x.fillStyle = "#d8d0b8";
    for (let i = 0; i < 6; i++) x.fillRect(28, 54 + i * 18, 122, 1);
    x.strokeStyle = "#b8862e";
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(50, 140);
    x.bezierCurveTo(70, 110, 90, 120, 105, 84);
    x.bezierCurveTo(115, 62, 126, 70, 134, 56);
    x.stroke();
    x.fillStyle = "#b8862e";
    x.fillRect(44, 138, 10, 6);
    // typewriter lines
    x.fillStyle = "#3a2c18";
    for (let i = 0; i < 5; i++) {
      const lw2 = 150 + hash(i + 7) * 90;
      txt(x, "█".repeat(Math.floor(lw2 / 9)), 176, 62 + i * 22, {
        size: 13,
        font: F.mono,
        color: "rgba(58,44,24,0.75)",
      });
    }
    txt(x, "VICTIMS: 12+   PARTINGS: 0", 176, 178, { size: 12, font: F.mono, weight: 700, color: "#2c1e10" });
    // stamps
    x.save();
    x.translate(310, 220);
    x.rotate(-0.22);
    x.strokeStyle = "#a2333f";
    x.lineWidth = 3;
    x.globalAlpha = 0.85;
    x.strokeRect(-64, -22, 128, 44);
    txt(x, "UNSOLVED", 0, 6, { size: 24, font: F.anton, align: "center", color: "#a2333f" });
    x.restore();
    x.save();
    x.translate(110, 236);
    x.rotate(0.12);
    x.globalAlpha = 0.7;
    txt(x, "EVIDENCE", 0, 0, { size: 18, font: F.anton, align: "center", color: "#3a5a8a" });
    x.restore();
  });
}

// The giant straight razor (open). Pivot at (26, 70); blade points +x.
export function razor() {
  return lazy("razor", 300, 150, (x, w, h) => {
    // handle
    x.fillStyle = "#141019";
    rrectFill(x, 10, 58, 96, 26, 12);
    x.fillStyle = "#241c2c";
    rrectFill(x, 16, 62, 82, 8, 6);
    x.fillStyle = "#c8a44a";
    x.beginPath();
    x.arc(30, 71, 6, 0, 7);
    x.fill();
    // blade
    const bg2 = x.createLinearGradient(0, 30, 0, 110);
    bg2.addColorStop(0, "#9aa8c4");
    bg2.addColorStop(0.45, "#e6ecf8");
    bg2.addColorStop(0.55, "#c4d0e6");
    bg2.addColorStop(1, "#7888a8");
    x.fillStyle = bg2;
    x.beginPath();
    x.moveTo(100, 44);
    x.lineTo(272, 38);
    x.quadraticCurveTo(292, 40, 288, 56);
    x.lineTo(120, 96);
    x.quadraticCurveTo(104, 98, 100, 84);
    x.closePath();
    x.fill();
    // cutting edge glint
    x.strokeStyle = "rgba(255,255,255,0.9)";
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(102, 92);
    x.lineTo(286, 52);
    x.stroke();
    // spine rivets
    x.fillStyle = "#5a6a88";
    for (const rx of [112, 150, 188, 226]) {
      x.beginPath();
      x.arc(rx, 46, 3, 0, 7);
      x.fill();
    }
    // etched comb glyph
    x.strokeStyle = "rgba(70,84,110,0.8)";
    x.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      x.moveTo(196, 52 + i * 5);
      x.lineTo(196, 66 + i * 2);
      x.stroke();
    }
  });
}

// Fedora/trilby for the hero — drawn above the sprite head at draw time.
export function drawHat(x, cx, cy, s, o = {}) {
  x.save();
  x.translate(cx, cy);
  x.rotate(o.rot || 0);
  x.scale(s, s);
  x.fillStyle = o.color || "#1c1622";
  x.beginPath();
  x.ellipse(0, 0, 30, 8, 0, 0, 7);
  x.fill(); // brim
  x.fillStyle = o.color || "#1c1622";
  rrectFill(x, -17, -22, 34, 24, 6); // crown
  x.fillStyle = o.band || "#7c2736";
  x.fillRect(-17, -9, 34, 6);
  x.fillStyle = "rgba(255,255,255,0.14)";
  x.fillRect(-17, -22, 34, 4);
  x.restore();
}

// ── live painters (pure in t) ────────────────────────────────────────────────

// Rain: layered streaks, deterministic per index. Depth drives length/alpha/speed.
export function rain(x, t, o = {}) {
  const W = o.w || 1920;
  const H = o.h || 1080;
  const slant = o.slant ?? -0.22;
  const layers = o.layers || [
    { n: 130, sp: 900, len: 26, a: 0.1, w: 1 },
    { n: 90, sp: 1250, len: 44, a: 0.16, w: 1.5 },
    { n: 46, sp: 1700, len: 78, a: 0.2, w: 2 },
  ];
  const alphaMul = o.alpha ?? 1;
  const drift = o.drift || 0;
  x.save();
  x.lineCap = "round";
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    x.strokeStyle = `rgba(178,196,235,${L.a * alphaMul})`;
    x.lineWidth = L.w;
    x.beginPath();
    for (let i = 0; i < L.n; i++) {
      const xi = hash(i * 3 + li * 771);
      const yi = hash(i * 7 + li * 913 + 3);
      const px = ((((xi * (W + 300) + drift * (0.5 + li * 0.4) - 150) % (W + 300)) + W + 300) % (W + 300)) - 150;
      const span = H + L.len * 2;
      const py = ((yi * span + L.sp * t) % span) - L.len;
      x.moveTo(px, py);
      x.lineTo(px + slant * L.len * 3, py + L.len);
    }
    x.stroke();
  }
  x.restore();
}

// Ground splash rings on a wet surface, deterministic buckets.
export function splashes(x, t, y, o = {}) {
  const W = o.w || 1920;
  const n = o.n || 26;
  x.save();
  for (let i = 0; i < n; i++) {
    const cyc = 0.55 + hash(i * 13 + 5) * 0.4;
    const ph = (t / cyc + hash(i * 7)) % 1;
    const px = hash(i * 3 + 11) * W;
    const rx = 3 + ph * 9;
    const ry = rx * 0.28;
    x.strokeStyle = `rgba(178,196,235,${0.22 * (1 - ph)})`;
    x.lineWidth = 1.4;
    x.beginPath();
    x.ellipse(px, y + hash(i * 17) * 26, rx, ry, 0, 0, 7);
    x.stroke();
  }
  x.restore();
}

// Neon sign text with buzz-flicker (mostly on, occasional dip).
export function neon(x, text, cx, cy, o = {}) {
  const size = o.size || 46;
  const font = o.font || F.anton;
  const seed = o.seed ?? 5;
  const on = neonOn(t0(), seed);
  const glow = o.glow || PAL.neonCyan;
  const col = o.color || "#eafcff";
  x.save();
  x.textAlign = "center";
  x.textBaseline = o.base || "middle";
  x.font = `${o.weight || ""} ${size}px ${font}`.trim();
  const a = o.alpha ?? 1;
  if (on > 0.02) {
    x.globalAlpha = a * on;
    x.shadowColor = glow;
    x.shadowBlur = o.blur ?? 38;
    x.fillStyle = glow;
    for (const pass of [0, 1]) x.fillText(text, cx, cy); // doubled for stronger bloom
    x.shadowBlur = (o.blur ?? 38) * 0.5;
    x.fillStyle = col;
    x.fillText(text, cx, cy);
    // dead-letter buzz: one letter darkens on a slow cycle
    const dead = Math.floor(t0() * 0.5) % text.length;
    if (o.deadLetters && hash(Math.floor(t0() * 0.5) + seed) > 0.6) {
      const wAll = x.measureText(text).width;
      const wDead = x.measureText(text[dead]);
      const before = x.measureText(text.slice(0, dead)).width;
      const lx = cx - wAll / 2 + before + wDead / 2;
      x.shadowBlur = 0;
      x.fillStyle = "rgba(20,30,50,0.85)";
      x.fillText(text[dead], lx, cy);
    }
  } else {
    x.globalAlpha = a;
    x.fillStyle = "rgba(40,60,90,0.55)";
    x.fillText(text, cx, cy);
  }
  x.restore();
}
// module-scoped clock for neon flicker; scenes set it each frame before calls
let _t = 0;
function t0() {
  return _t;
}
export function setClock(t) {
  _t = t;
}
export function neonOn(t, seed) {
  const b = hash(seed + Math.floor(t * 22));
  if (b < 0.06) return 0.15 + 0.3 * hash(seed + Math.floor(t * 60));
  return 0.9 + 0.1 * Math.sin(t * 37 + seed);
}

// Volumetric light cone from (x0,y0) spreading to (x1,y1).
export function cone(x, x0, y0, x1, y1, spread, o = {}) {
  const col = o.color || PAL.lamp;
  x.save();
  x.globalCompositeOperation = "lighter";
  const g = x.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, hexA(o.core || col, o.a ?? 0.34));
  g.addColorStop(1, hexA(col, 0));
  x.fillStyle = g;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  x.beginPath();
  x.moveTo(x0, y0);
  x.lineTo(x1 + nx * spread, y1 + ny * spread);
  x.lineTo(x1 - nx * spread, y1 - ny * spread);
  x.closePath();
  x.fill();
  // bulb halo
  const halo = x.createRadialGradient(x0, y0, 2, x0, y0, (o.halo ?? 26) * 2.2);
  halo.addColorStop(0, hexA("#fff8e8", 0.85));
  halo.addColorStop(0.3, hexA(col, 0.35));
  halo.addColorStop(1, hexA(col, 0));
  x.fillStyle = halo;
  x.beginPath();
  x.arc(x0, y0, (o.halo ?? 26) * 2.2, 0, 7);
  x.fill();
  x.restore();
}

// Drifting mist band at height y.
export function mist(x, t, y, seed, o = {}) {
  x.save();
  x.globalCompositeOperation = "screen";
  for (let i = 0; i < (o.n || 3); i++) {
    const xx = ((vnoise(t * 0.02 + seed + i * 10) * 2400 + t * (o.speed ?? 14)) % 2400) - 200;
    const g = x.createRadialGradient(xx, y + i * 26, 10, xx, y + i * 26, o.r || 420);
    g.addColorStop(0, `rgba(120,140,190,${0.055 * (o.a ?? 1)})`);
    g.addColorStop(1, "rgba(120,140,190,0)");
    x.fillStyle = g;
    x.fillRect(xx - 460, y - 130, 920, 300);
  }
  x.restore();
}

// Venetian-blind shadow bands across a rect (noir office essential).
export function blindsShadow(x, t, o = {}) {
  const x0 = o.x ?? 0;
  const y0 = o.y ?? 0;
  const w = o.w ?? 1920;
  const h = o.h ?? 1080;
  const band = o.band ?? 46;
  const tilt = o.tilt ?? 0.32;
  x.save();
  x.beginPath();
  x.rect(x0, y0, w, h);
  x.clip();
  x.translate(o.cx ?? 1430, o.cy ?? 380);
  x.rotate(tilt);
  for (let i = -14; i < 22; i++) {
    const g = x.createLinearGradient(0, i * band, 0, i * band + band * 0.55);
    g.addColorStop(0, `rgba(8,12,26,${o.a ?? 0.42})`);
    g.addColorStop(1, "rgba(8,12,26,0)");
    x.fillStyle = g;
    x.fillRect(-1400, i * band, 3000, band * 0.55);
  }
  x.restore();
}

// Contact shadow under an actor.
export function shadow(x, cx, y, w, a = 0.4) {
  x.save();
  x.fillStyle = `rgba(4,6,12,${a})`;
  x.beginPath();
  x.ellipse(cx, y, w, w * 0.22, 0, 0, 7);
  x.fill();
  x.restore();
}

// Mirror-wet reflection of a draw callback (used for actors on wet asphalt).
export function reflect(x, cx, feetY, h, drawFn, o = {}) {
  const c = lazy("refl", 420, 520, () => {});
  c.width = 420;
  c.height = 520; // fresh each call: reflections repaint fully
  const rc = c.getContext("2d");
  rc.clearRect(0, 0, 420, 520);
  rc.save();
  rc.translate(210, 500);
  drawFn(rc);
  rc.restore();
  x.save();
  x.globalAlpha = o.a ?? 0.16;
  x.globalCompositeOperation = "lighter";
  const wob = Math.sin((o.t ?? 0) * 1.7) * 2;
  x.translate(cx + wob, feetY + 4);
  x.scale(1, -(o.squash ?? 0.52));
  x.drawImage(c, -210, -500, 420, 500);
  x.restore();
}

// ── small utils ──────────────────────────────────────────────────────────────
export function mk(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = true;
  return c;
}
function hexA(hex, a) {
  const h = hex.replace("#", "");
  return `rgba(${Number.parseInt(h.slice(0, 2), 16)},${Number.parseInt(h.slice(2, 4), 16)},${Number.parseInt(h.slice(4, 6), 16)},${a})`;
}
function rrectFill(x, x0, y0, w, h, r) {
  x.beginPath();
  x.moveTo(x0 + r, y0);
  x.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
  x.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
  x.arcTo(x0, y0 + h, x0, y0, r);
  x.arcTo(x0, y0, x0 + w, y0, r);
  x.closePath();
  x.fill();
}
// steam curls above a point (mug / grate)
export function steam(x, t, px, py, o = {}) {
  x.save();
  x.globalCompositeOperation = "screen";
  for (let i = 0; i < (o.n || 4); i++) {
    const life = 2.6;
    const ph = (t * 0.4 + hash(i * 31 + 7)) % 1;
    const yy = py - ph * (o.rise ?? 120);
    const xx = px + Math.sin(ph * 5 + i * 2.1 + t * 0.3) * 16 * ph + (o.drift ?? 0) * ph;
    const rr = (o.r0 ?? 10) + ph * (o.grow ?? 26);
    const g = x.createRadialGradient(xx, yy, 2, xx, yy, rr);
    g.addColorStop(0, `rgba(200,214,240,${0.12 * (1 - ph)})`);
    g.addColorStop(1, "rgba(200,214,240,0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(xx, yy, rr, 0, 7);
    x.fill();
  }
  x.restore();
}
