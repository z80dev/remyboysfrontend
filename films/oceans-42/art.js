// OCEAN'S FORTY-TWO — baked art. Everything deterministic (hash-seeded), prepared once.
// Smooth 1080p bakes for the media shots (skyline, marquee, blueprint, ID cards);
// chunky pixel bakes for the world shots (casino floor, ducts, vault, getaway car).
import { hash, lerp, txt, measure } from 'filmkit/lib.js';

const cv = (w, h, smooth = false) => {
  const c = document.createElement('canvas');
  c.width = Math.round(w); c.height = Math.round(h);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = smooth;
  return c;
};
export { cv };

const rr = (x, X, y, w, h, r) => { // rounded-rect path on ctx x
  x.beginPath();
  x.moveTo(X + r, y);
  x.arcTo(X + w, y, X + w, y + h, r);
  x.arcTo(X + w, y + h, X, y + h, r);
  x.arcTo(X, y + h, X, y, r);
  x.arcTo(X, y, X + w, y, r);
  x.closePath();
};

// ---------- smooth night city (strip shot) ----------

export function nightSky(w = 1920, h = 1080) {
  const c = cv(w, h, true), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#04050d');
  g.addColorStop(0.45, '#0a0d20');
  g.addColorStop(0.75, '#1b1233');
  g.addColorStop(1, '#3d1f42');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 170; i++) {
    const sx = hash(i * 3 + 1) * w, sy = hash(i * 5 + 2) * h * 0.62;
    const a = 0.25 + hash(i + 9) * 0.65, r = hash(i * 7) > 0.9 ? 2 : 1;
    x.fillStyle = `rgba(226,232,255,${a})`;
    x.fillRect(sx, sy, r, r);
  }
  // moon + halo
  const mg = x.createRadialGradient(1518, 208, 6, 1518, 208, 130);
  mg.addColorStop(0, 'rgba(240,238,255,0.5)'); mg.addColorStop(0.35, 'rgba(220,220,255,0.12)'); mg.addColorStop(1, 'rgba(220,220,255,0)');
  x.fillStyle = mg; x.fillRect(1360, 50, 320, 320);
  x.fillStyle = '#efeeff';
  x.beginPath(); x.arc(1518, 208, 34, 0, 7); x.fill();
  x.fillStyle = 'rgba(190,190,225,0.55)';
  x.beginPath(); x.arc(1508, 200, 7, 0, 7); x.fill();
  x.beginPath(); x.arc(1528, 220, 5, 0, 7); x.fill();
  return c;
}

// tower silhouette row; lit windows warm/cyan; palms in front (Remypolis kitsch)
export function cityFar(w = 2400, h = 340) {
  const c = cv(w, h, true), x = c.getContext('2d');
  let px = 0, i = 0;
  while (px < w) {
    const tw = 90 + hash(i * 13 + 3) * 130;
    const th = 110 + hash(i * 17 + 5) * 190;
    x.fillStyle = '#11162c';
    x.fillRect(px, h - th, tw, th);
    x.fillStyle = '#0c1022';
    x.fillRect(px + tw * 0.3, h - th - 14, 6, 14); // antenna stub
    if (hash(i * 7 + 1) > 0.72) x.fillRect(px + tw * 0.55, h - th - 26, 4, 26);
    for (let wy = h - th + 12; wy < h - 16; wy += 18) {
      for (let wx = px + 8; wx < px + tw - 10; wx += 14) {
        const lit = hash(wx * 31 + wy * 7);
        if (lit > 0.74) {
          x.fillStyle = lit > 0.93 ? 'rgba(127,227,222,0.8)' : 'rgba(255,214,130,0.75)';
          x.fillRect(wx, wy, 5, 7);
        }
      }
    }
    px += tw + 14 + hash(i * 11) * 40; i++;
  }
  return c;
}

export function cityMid(w = 2400, h = 460) {
  const c = cv(w, h, true), x = c.getContext('2d');
  const neons = ['#ff5f9e', '#59d6d0', '#ffcf6e', '#b58cff'];
  let px = 20, i = 0;
  while (px < w) {
    const tw = 150 + hash(i * 19 + 7) * 170;
    const th = 200 + hash(i * 23 + 11) * 200;
    x.fillStyle = '#191f40';
    x.fillRect(px, h - th, tw, th);
    x.fillStyle = '#141936';
    x.fillRect(px, h - th, tw, 10);
    // windows grid, fewer lit
    for (let wy = h - th + 22; wy < h - 30; wy += 26) {
      for (let wx = px + 12; wx < px + tw - 16; wx += 20) {
        const lit = hash(wx * 17 + wy * 13 + i);
        if (lit > 0.8) {
          x.fillStyle = 'rgba(255,207,110,0.6)';
          x.fillRect(wx, wy, 7, 9);
        }
      }
    }
    // neon strips / billboards on some towers
    const n = Math.floor(hash(i * 29 + 2) * 5);
    if (n < 4) {
      const col = neons[n];
      const sx = px + 14 + hash(i * 31) * (tw - 40);
      const sy = h - th + 26 + hash(i * 37) * (th * 0.4);
      x.fillStyle = col;
      x.globalAlpha = 0.85;
      if (hash(i * 41 + 6) > 0.5) {
        x.fillRect(sx, sy, 7, 70 + hash(i * 43) * 70); // vertical strip
      } else {
        x.fillRect(sx, sy, 60 + hash(i * 47) * 60, 9); // horizontal
      }
      x.globalAlpha = 0.22;
      x.fillRect(sx - 5, sy - 5, 17, 80 + hash(i * 43) * 70);
      x.globalAlpha = 1;
    }
    // palm between towers
    if (hash(i * 53 + 4) > 0.45) {
      const bx = px + tw + 8;
      x.strokeStyle = '#0d1128'; x.lineWidth = 7; x.lineCap = 'round';
      x.beginPath(); x.moveTo(bx, h);
      x.quadraticCurveTo(bx + 6, h - 40, bx + 2, h - 78); x.stroke();
      x.lineWidth = 5;
      for (let f = 0; f < 6; f++) {
        const a = -Math.PI / 2 + (f - 2.5) * 0.5;
        x.beginPath(); x.moveTo(bx + 2, h - 78);
        x.quadraticCurveTo(bx + 2 + Math.cos(a) * 26, h - 78 + Math.sin(a) * 26 - 8, bx + 2 + Math.cos(a) * 46, h - 78 + Math.sin(a) * 46 + 6);
        x.stroke();
      }
    }
    px += tw + 26 + hash(i * 59) * 60; i++;
  }
  return c;
}

// the BALD PALADE frontage — art-deco casino face with marquee (text drawn live so
// letters can flicker), bulb sockets baked unlit; film lights them.
export const MARQUEE = { x: 96, y: 148, w: 728, h: 168, bulbs: [] };

export function facade() {
  const w = 920, h = 1160;
  const c = cv(w, h, true), x = c.getContext('2d');
  // wings
  x.fillStyle = '#241030';
  x.fillRect(0, 300, w, h - 300);
  x.fillStyle = '#2f163d';
  x.fillRect(30, 300, 120, h - 300); x.fillRect(w - 150, 300, 120, h - 300);
  // vertical gold ribs on wings
  x.fillStyle = '#6b4a1e';
  for (const wx of [44, 74, 104, w - 134, w - 104, w - 74]) x.fillRect(wx, 320, 6, h - 340);
  // central tower
  x.fillStyle = '#38194a';
  x.fillRect(190, 40, 540, h - 40);
  x.fillStyle = '#2a1239';
  x.fillRect(190, 40, 540, 26);
  // stepped crown
  x.fillStyle = '#4a2170';
  x.fillRect(330, 12, 260, 40); x.fillRect(380, -18, 160, 40);
  x.fillStyle = '#ffcf6e';
  x.fillRect(452, -34, 16, 24); // spire tip
  // marquee board
  const { x: mx, y: my, w: mw, h: mh } = MARQUEE;
  x.fillStyle = '#170a20';
  rr(x, mx, my, mw, mh, 22); x.fill();
  x.strokeStyle = '#6b4a1e'; x.lineWidth = 6;
  rr(x, mx + 6, my + 6, mw - 12, mh - 12, 18); x.stroke();
  // bulb sockets around the marquee (film draws the lit bulbs)
  MARQUEE.bulbs = [];
  const per = 13;
  for (let i = 0; i <= per; i++) {
    const bx = mx + 8 + ((mw - 16) * i) / per;
    MARQUEE.bulbs.push([bx, my + 8], i < per ? [bx + (mw - 16) / per / 2, my + mh - 8] : null);
  }
  MARQUEE.bulbs = MARQUEE.bulbs.filter(Boolean);
  // subline plate under marquee
  x.fillStyle = '#0d0616';
  x.fillRect(mx + 40, my + mh + 10, mw - 80, 44);
  x.strokeStyle = '#3a2a4e'; x.lineWidth = 2;
  x.strokeRect(mx + 40, my + mh + 10, mw - 80, 44);
  // entrance: glass doors + canopy
  x.fillStyle = '#0e0716';
  x.fillRect(330, 700, 260, 240);
  const dg = x.createLinearGradient(0, 700, 0, 940);
  dg.addColorStop(0, 'rgba(255,196,110,0.5)'); dg.addColorStop(1, 'rgba(255,170,90,0.08)');
  x.fillStyle = dg; x.fillRect(334, 704, 252, 232);
  x.fillStyle = '#6b4a1e';
  for (let i = 0; i < 4; i++) x.fillRect(330 + i * 65, 700, 6, 240);
  x.fillRect(457, 700, 6, 240);
  // canopy
  x.fillStyle = '#8a1e3a';
  rr(x, 300, 660, 320, 44, 10); x.fill();
  x.fillStyle = '#ffcf6e'; x.fillRect(300, 700, 320, 8);
  // steps
  x.fillStyle = '#1c1226';
  x.fillRect(280, 940, 360, 60);
  x.fillStyle = '#241832';
  x.fillRect(250, 1000, 420, 70);
  x.fillStyle = '#2e2040';
  x.fillRect(220, 1070, 480, 90);
  // gold trim lines on steps
  x.fillStyle = 'rgba(255,207,110,0.35)';
  x.fillRect(280, 940, 360, 4); x.fillRect(250, 1000, 420, 4);
  return c;
}

export function limo() {
  const w = 470, h = 130;
  const c = cv(w, h, true), x = c.getContext('2d');
  // body
  x.fillStyle = '#0a0a12';
  rr(x, 10, 46, w - 20, 44, 16); x.fill();
  rr(x, 80, 20, 280, 46, 18); x.fill();
  // cabin glass
  x.fillStyle = 'rgba(255,196,110,0.35)';
  rr(x, 100, 30, 60, 26, 6); x.fill();
  rr(x, 180, 30, 60, 26, 6); x.fill();
  rr(x, 260, 30, 60, 26, 6); x.fill();
  // chrome trim + lights
  x.fillStyle = '#3d4258';
  x.fillRect(14, 76, w - 28, 5);
  x.fillStyle = '#ffe9b0';
  x.fillRect(w - 18, 62, 8, 12);
  x.fillStyle = '#ff5f5f';
  x.fillRect(10, 62, 7, 11);
  // wheels
  for (const wx of [96, 356]) {
    x.fillStyle = '#05050a';
    x.beginPath(); x.arc(wx, 92, 22, 0, 7); x.fill();
    x.fillStyle = '#262b3d';
    x.beginPath(); x.arc(wx, 92, 9, 0, 7); x.fill();
  }
  return c;
}

// ---------- dossier ID cards (smooth) ----------

export function cardPanel(img, w = 540, h = 300) {
  const c = cv(w, h, true), x = c.getContext('2d');
  x.fillStyle = '#12101d';
  rr(x, 0, 0, w, h, 18); x.fill();
  x.strokeStyle = '#2c2742'; x.lineWidth = 3;
  rr(x, 2, 2, w - 4, h - 4, 16); x.stroke();
  // photo window: cover-crop the 600×600 original onto the upper 2/3
  const pw = 246, ph = h - 56;
  x.save();
  rr(x, 24, 28, pw, ph, 12); x.clip();
  const s = Math.max(pw / 600, ph / 380) * 1.02;
  x.drawImage(img, (600 - pw / s) / 2, 6, pw / s, ph / s, 24, 28, pw, ph);
  // scanner-grade scanlines + edge vignette
  x.globalAlpha = 0.10; x.fillStyle = '#000';
  for (let sy = 30; sy < 28 + ph; sy += 5) x.fillRect(24, sy, pw, 2);
  x.globalAlpha = 0.28;
  const v = x.createLinearGradient(24, 28, 24 + pw, 28);
  v.addColorStop(0, 'rgba(0,0,0,0.6)'); v.addColorStop(0.35, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.25)');
  x.fillStyle = v; x.fillRect(24, 28, pw, ph);
  x.restore();
  // corner rivets
  x.fillStyle = '#4a4560';
  for (const [rx, ry] of [[12, 12], [w - 16, 12], [12, h - 16], [w - 16, h - 16]]) x.fillRect(rx, ry, 4, 4);
  // top strip
  x.fillStyle = '#1d1930';
  x.fillRect(24, 6, w - 48, 16);
  return c;
}

// ---------- pixel world bakes ----------

export function slot(seed) {
  const w = 44, h = 74;
  const c = cv(w, h), x = c.getContext('2d');
  x.fillStyle = '#3c1e5c'; x.fillRect(0, 8, w, h - 8);        // body
  x.fillStyle = '#2a1444'; x.fillRect(w - 8, 8, 8, h - 8);    // shaded side
  x.fillStyle = '#ffcf6e'; x.fillRect(0, 8, w, 3);            // marquee bar
  x.fillStyle = '#8a5a2a'; x.fillRect(0, 0, w, 8);            // top cap
  // screen with three windows
  x.fillStyle = '#0d0a1c'; x.fillRect(5, 16, 30, 18);
  const sym = (i, sx) => {
    const k = hash(seed * 7 + i * 13);
    if (k > 0.66) { x.fillStyle = '#ff5f6e'; x.fillRect(sx + 2, 24, 4, 4); x.fillRect(sx + 3, 22, 2, 2); } // cherry
    else if (k > 0.33) { x.fillStyle = '#ffd98a'; x.fillRect(sx + 1, 23, 6, 2); x.fillRect(sx + 2, 26, 4, 1); } // bar
    else { x.fillStyle = '#59d6d0'; x.fillRect(sx + 3, 21, 2, 8); x.fillRect(sx + 1, 23, 6, 4); } // seven-ish
  };
  for (let i = 0; i < 3; i++) sym(i, 7 + i * 10);
  // tray + lever
  x.fillStyle = '#1d1030'; x.fillRect(6, 46, 26, 6);
  x.fillStyle = '#b9c4cc'; x.fillRect(w - 4, 18, 2, 22);
  x.fillStyle = '#ff4a5a'; x.fillRect(w - 6, 14, 6, 6);
  // legs
  x.fillStyle = '#1d1030'; x.fillRect(2, h - 4, 8, 4); x.fillRect(w - 12, h - 4, 8, 4);
  return c;
}

export function floorBg(portrait) {
  const w = 960, h = 540;
  const c = cv(w, h), x = c.getContext('2d');
  // back wall
  const g = x.createLinearGradient(0, 0, 0, 230);
  g.addColorStop(0, '#241028'); g.addColorStop(1, '#38163a');
  x.fillStyle = g; x.fillRect(0, 0, w, 230);
  // wall panels + gold line
  x.fillStyle = '#1d0c22';
  for (let px = 40; px < w; px += 160) x.fillRect(px, 16, 6, 200);
  x.fillStyle = '#ffcf6e'; x.fillRect(0, 224, w, 4);
  x.fillStyle = '#8a5a2a'; x.fillRect(0, 228, w, 2);
  // framed portrait of THE HOUSE above the doors
  x.fillStyle = '#8a5a2a'; x.fillRect(438, 40, 84, 92);
  x.fillStyle = '#ffcf6e'; x.fillRect(442, 44, 76, 84);
  x.imageSmoothingEnabled = true;
  x.drawImage(portrait, 90, 40, 420, 400, 446, 48, 68, 66);
  x.imageSmoothingEnabled = false;
  // entrance doors behind (center-back)
  x.fillStyle = '#12060f'; x.fillRect(420, 150, 120, 80);
  x.fillStyle = 'rgba(255,196,110,0.4)'; x.fillRect(423, 153, 114, 74);
  x.fillStyle = '#8a5a2a'; x.fillRect(478, 150, 4, 80);
  // chandelier (left of the portrait so both read)
  x.fillStyle = '#3a2a10'; x.fillRect(337, 0, 6, 34);
  x.fillStyle = '#ffcf6e'; x.fillRect(300, 34, 80, 8);
  for (const cx of [304, 326, 348, 370]) {
    x.fillStyle = '#ffe9a8'; x.fillRect(cx, 44, 8, 10);
    x.fillStyle = '#fff8e0'; x.fillRect(cx + 2, 46, 4, 6);
  }
  // carpet: deep red with gold diamond lattice
  const cg = x.createLinearGradient(0, 230, 0, h);
  cg.addColorStop(0, '#4a1420'); cg.addColorStop(1, '#2c0a14');
  x.fillStyle = cg; x.fillRect(0, 230, w, h - 230);
  x.strokeStyle = 'rgba(255,207,110,0.22)'; x.lineWidth = 2;
  for (let d = -h; d < w + h; d += 52) {
    x.beginPath(); x.moveTo(d, 230); x.lineTo(d + h, h); x.stroke();
    x.beginPath(); x.moveTo(d + h, 230); x.lineTo(d, h); x.stroke();
  }
  x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 230, w, 10);
  // card tables (right side): green felt semicircles
  for (const [tx, ty] of [[740, 330], [880, 400]]) {
    x.fillStyle = '#0d3a24';
    x.beginPath(); x.arc(tx, ty, 58, Math.PI, 0); x.fill();
    x.fillStyle = '#12804a'; x.beginPath(); x.arc(tx, ty, 50, Math.PI, 0); x.fill();
    x.fillStyle = '#ffcf6e'; x.fillRect(tx - 58, ty - 3, 116, 5);
    x.fillStyle = '#3a1050'; x.fillRect(tx - 58, ty + 2, 116, 8);
  }
  // floor grate (the hatch), closed
  grate(x, 300, 500, 46, 26);
  return c;
}

export function grate(x, gx, gy, gw, gh) {
  x.fillStyle = '#120a18'; x.fillRect(gx - 2, gy - 2, gw + 4, gh + 4);
  x.fillStyle = '#2a2436';
  for (let i = 0; i < 5; i++) x.fillRect(gx + 2 + i * 9, gy + 2, 5, gh - 4);
}

export function ventPanel(w = 480, h = 540) {
  const c = cv(w, h), x = c.getContext('2d');
  x.fillStyle = '#0a0d16'; x.fillRect(0, 0, w, h);
  const band = (y0, hh, base) => {
    x.fillStyle = base; x.fillRect(0, y0, w, hh);
    x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(0, y0, w, 3);
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(0, y0 + hh - 5, w, 5);
    // rivets
    x.fillStyle = '#3d4458';
    for (let rx = 12; rx < w; rx += 48) x.fillRect(rx, y0 + Math.floor(hh / 2) - 2, 4, 4);
  };
  band(0, 120, '#232a3e');       // top duct wall
  band(h - 120, 120, '#1d2436'); // bottom duct floor
  x.fillStyle = '#151b2c'; x.fillRect(0, 120, w, 8);
  x.fillRect(0, h - 128, w, 8);
  // vertical seam at panel edge
  x.fillStyle = '#10141f'; x.fillRect(w - 8, 0, 8, h);
  x.fillStyle = '#2c3448'; x.fillRect(w - 9, 118, 2, h - 236);
  return c;
}

export function vaultRoom() {
  const w = 960, h = 540;
  const c = cv(w, h), x = c.getContext('2d');
  // steel wall
  const g = x.createLinearGradient(0, 0, 0, 360);
  g.addColorStop(0, '#181c26'); g.addColorStop(1, '#232936');
  x.fillStyle = g; x.fillRect(0, 0, w, 360);
  x.fillStyle = '#11141c';
  for (let px = 96; px < w; px += 96) x.fillRect(px - 2, 0, 4, 360);
  x.fillStyle = '#39404f';
  for (let px = 48; px < w; px += 96)
    for (let py = 30; py < 340; py += 90) x.fillRect(px - 2, py, 4, 4);
  // circular door recess (behind the door sprite)
  x.fillStyle = '#0d1017';
  x.beginPath(); x.arc(480, 240, 226, 0, 7); x.fill();
  x.strokeStyle = '#39404f'; x.lineWidth = 6;
  x.beginPath(); x.arc(480, 240, 232, 0, 7); x.stroke();
  // door glass window strip (SHADES' shadow crosses here) baked on recess
  x.fillStyle = '#1a2233'; x.fillRect(430, 176, 100, 12);
  // floor
  const fg = x.createLinearGradient(0, 360, 0, h);
  fg.addColorStop(0, '#141821'); fg.addColorStop(1, '#0b0e14');
  x.fillStyle = fg; x.fillRect(0, 360, w, h - 360);
  x.fillStyle = '#2c3444'; x.fillRect(0, 356, w, 5);
  // faint sheen bands on floor
  x.fillStyle = 'rgba(160,180,220,0.05)';
  x.fillRect(120, 380, 180, 40); x.fillRect(640, 420, 220, 50);
  // pedestal, center-front
  x.fillStyle = '#0e1119'; x.fillRect(438, 428, 84, 76);
  x.fillStyle = '#232a38'; x.fillRect(430, 420, 100, 12);
  x.fillStyle = '#39404f'; x.fillRect(430, 420, 100, 3);
  x.fillStyle = '#161b26'; x.fillRect(446, 436, 68, 60);
  return c;
}

export function vaultDoor() {
  const s = 300;
  const c = cv(s, s), x = c.getContext('2d');
  const cx = 150, cy = 150;
  // outer ring
  x.fillStyle = '#2e3442'; x.beginPath(); x.arc(cx, cy, 148, 0, 7); x.fill();
  x.fillStyle = '#232836'; x.beginPath(); x.arc(cx, cy, 140, 0, 7); x.fill();
  // rim bolts
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    x.fillStyle = '#4a5266';
    x.fillRect(cx + Math.cos(a) * 132 - 4, cy + Math.sin(a) * 132 - 4, 8, 8);
    x.fillStyle = '#6a7488';
    x.fillRect(cx + Math.cos(a) * 132 - 4, cy + Math.sin(a) * 132 - 4, 3, 3);
  }
  // brushed mid plate
  x.fillStyle = '#39404f'; x.beginPath(); x.arc(cx, cy, 112, 0, 7); x.fill();
  x.strokeStyle = 'rgba(255,255,255,0.06)'; x.lineWidth = 1;
  for (let r = 60; r < 110; r += 7) { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke(); }
  // inner plate + hub
  x.fillStyle = '#2e3442'; x.beginPath(); x.arc(cx, cy, 74, 0, 7); x.fill();
  x.fillStyle = '#ffcf6e'; x.beginPath(); x.arc(cx, cy, 26, 0, 7); x.fill();
  x.fillStyle = '#8a5a2a'; x.beginPath(); x.arc(cx, cy, 26, 0, 7); x.fill();
  x.fillStyle = '#ffcf6e'; x.beginPath(); x.arc(cx, cy, 19, 0, 7); x.fill();
  x.fillStyle = '#1a1e28'; x.fillRect(cx - 3, cy - 10, 6, 14); // keyway
  // three spokes
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    x.save(); x.translate(cx, cy); x.rotate(a);
    x.fillStyle = '#4a5266'; x.fillRect(-8, 24, 16, 84);
    x.fillStyle = '#6a7488'; x.fillRect(-8, 24, 5, 84);
    x.fillStyle = '#232836'; x.fillRect(-10, 100, 20, 14);
    x.restore();
  }
  return c;
}

// THE GOLDEN MULLET — business up front, party in the back.
export function mullet(k = 1) {
  const w = 110 * k, h = 72 * k;
  const c = cv(w, h), x = c.getContext('2d');
  const P = (v) => Math.round(v * k);
  // back party: long flowing waves (drawn first, behind)
  x.fillStyle = '#c9871e';
  x.beginPath();
  x.moveTo(P(46), P(16));
  x.quadraticCurveTo(P(96), P(10), P(104), P(46));
  x.quadraticCurveTo(P(98), P(74), P(72), P(70));
  x.quadraticCurveTo(P(58), P(48), P(46), P(34));
  x.closePath(); x.fill();
  // separated lower strands
  x.strokeStyle = '#c9871e'; x.lineWidth = P(5); x.lineCap = 'round';
  for (const [x0, x1, dip] of [[70, 88, 66], [82, 100, 60]]) {
    x.beginPath(); x.moveTo(P(x0), P(46)); x.quadraticCurveTo(P((x0 + x1) / 2), P(dip + 8), P(x1), P(dip)); x.stroke();
  }
  // front business: short rounded fringe
  x.fillStyle = '#e9a83c';
  x.beginPath();
  x.moveTo(P(8), P(26));
  x.quadraticCurveTo(P(10), P(6), P(38), P(8));
  x.quadraticCurveTo(P(56), P(10), P(56), P(28));
  x.quadraticCurveTo(P(50), P(40), P(30), P(40));
  x.quadraticCurveTo(P(12), P(40), P(8), P(26));
  x.closePath(); x.fill();
  // top highlight sweep
  x.fillStyle = '#ffc95e';
  x.beginPath();
  x.moveTo(P(14), P(20));
  x.quadraticCurveTo(P(18), P(9), P(38), P(11));
  x.quadraticCurveTo(P(50), P(13), P(50), P(24));
  x.quadraticCurveTo(P(34), P(18), P(14), P(20));
  x.closePath(); x.fill();
  x.fillStyle = '#ffdf8a';
  x.fillRect(P(20), P(13), P(16), P(4));
  // back highlight
  x.strokeStyle = '#ffc95e'; x.lineWidth = P(6);
  x.beginPath(); x.moveTo(P(52), P(18)); x.quadraticCurveTo(P(88), P(16), P(94), P(40)); x.stroke();
  // glints
  x.fillStyle = '#fff8e0';
  x.fillRect(P(26), P(12), P(4), P(4)); x.fillRect(P(84), P(26), P(5), P(3));
  return c;
}

export function dome(k = 1) {
  const w = 96 * k, h = 86 * k;
  const c = cv(w, h, true), x = c.getContext('2d');
  const P = (v) => v * k;
  x.fillStyle = 'rgba(180,220,255,0.10)';
  x.beginPath(); x.ellipse(P(48), P(48), P(44), P(38), 0, 0, 7); x.fill();
  x.strokeStyle = 'rgba(210,235,255,0.55)'; x.lineWidth = 2 * k;
  x.beginPath(); x.ellipse(P(48), P(48), P(44), P(38), 0, 0, 7); x.stroke();
  x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 1.4 * k;
  x.beginPath(); x.ellipse(P(48), P(48), P(30), P(24), 0, 0, 7); x.stroke();
  // highlight streak
  x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 3 * k; x.lineCap = 'round';
  x.beginPath(); x.arc(P(48), P(50), P(32), -2.3, -1.6); x.stroke();
  // gold base
  x.fillStyle = '#8a5a2a'; x.fillRect(P(6), P(82), P(84), P(5));
  x.fillStyle = '#ffcf6e'; x.fillRect(P(6), P(82), P(84), P(2));
  return c;
}

// ---------- blueprint (plan shot) ----------

export function blueprint() {
  const w = 1920, h = 1080;
  const c = cv(w, h, true), x = c.getContext('2d');
  x.fillStyle = '#0d2347'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(90,150,220,0.16)'; x.lineWidth = 1;
  for (let gx = 0; gx <= w; gx += 48) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, h); x.stroke(); }
  for (let gy = 0; gy <= h; gy += 48) { x.beginPath(); x.moveTo(0, gy); x.lineTo(w, gy); x.stroke(); }
  x.strokeStyle = 'rgba(110,170,235,0.30)';
  for (let gx = 0; gx <= w; gx += 240) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, h); x.stroke(); }
  for (let gy = 0; gy <= h; gy += 240) { x.beginPath(); x.moveTo(0, gy); x.lineTo(w, gy); x.stroke(); }
  // paper grain
  x.fillStyle = 'rgba(0,0,0,0.05)';
  for (let i = 0; i < 900; i++) x.fillRect(hash(i * 3) * w, hash(i * 7 + 1) * h, 2, 2);
  // border + title block
  x.strokeStyle = 'rgba(210,230,255,0.75)'; x.lineWidth = 3;
  x.strokeRect(36, 36, w - 72, h - 72);
  x.lineWidth = 2;
  x.strokeRect(w - 560, h - 128, 524, 92);
  txt(x, 'LEVEL 1 · CONFIDENTIAL', w - 540, h - 92, { size: 26, font: '"JetBrains Mono"', weight: 700, color: 'rgba(215,235,255,0.9)', track: 2 });
  txt(x, 'JOB 0042 · REV C', w - 540, h - 56, { size: 22, font: '"JetBrains Mono"', weight: 500, color: 'rgba(160,200,240,0.8)', track: 2 });
  // ---- floor plan geometry (white strokes) ----
  x.strokeStyle = 'rgba(225,240,255,0.95)'; x.lineWidth = 5;
  const room = (rx, ry, rw, rh) => x.strokeRect(rx, ry, rw, rh);
  room(320, 640, 480, 260);   // LOBBY (entrance, bottom center)
  room(160, 300, 480, 300);   // SLOTS (left hall)
  room(760, 300, 480, 300);   // TABLES (right hall)
  room(1320, 300, 380, 260);  // OFFICE (top right)
  // VAULT: thick double wall square, top left
  x.lineWidth = 7; room(200, 130, 300, 240);
  x.lineWidth = 3; room(216, 146, 268, 208);
  // vault circular door mark on its right wall
  x.lineWidth = 5;
  x.beginPath(); x.arc(500, 250, 26, 0, 7); x.stroke();
  x.beginPath(); x.moveTo(500, 218); x.lineTo(500, 282); x.moveTo(468, 250); x.lineTo(532, 250); x.stroke();
  // connecting openings
  x.fillStyle = '#0d2347';
  x.fillRect(640 - 12, 760, 24, 10); x.fillRect(636, 620, 10, 24); x.fillRect(700, 440, 10, 60);
  // duct run: SLOTS ceiling → VAULT (dashed)
  x.strokeStyle = 'rgba(255,207,110,0.85)'; x.lineWidth = 4;
  x.setLineDash([16, 12]);
  x.beginPath(); x.moveTo(400, 300); x.lineTo(400, 250); x.lineTo(200, 250); x.lineTo(200, 300); x.stroke();
  x.setLineDash([]);
  // room labels (kept clear of the token routes)
  const label = (s, lx, ly) => txt(x, s, lx, ly, { size: 30, font: '"JetBrains Mono"', weight: 700, color: 'rgba(215,235,255,0.85)', track: 6 });
  label('SLOTS', 330, 500);
  label('TABLES', 920, 500);
  label('LOBBY', 500, 782);
  label('OFFICE', 1430, 432);
  txt(x, 'VAULT', 236, 186, { size: 34, font: 'Anton', color: '#ffd98a', track: 4 });
  // entrance arrow
  x.strokeStyle = 'rgba(120,255,190,0.9)'; x.lineWidth = 5;
  x.beginPath(); x.moveTo(640, 950); x.lineTo(640, 906); x.moveTo(626, 922); x.lineTo(640, 902); x.lineTo(654, 922); x.stroke();
  txt(x, 'ENTRANCE', 640, 986, { size: 24, font: '"JetBrains Mono"', weight: 700, color: 'rgba(120,255,190,0.9)', align: 'center', track: 3 });
  return c;
}

// ---------- dawn + road (dawn shot) ----------

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

export function dawnSky(w = 960, h = 540) {
  const c = cv(w, h), x = c.getContext('2d');
  const stops = [
    [0, [22, 16, 46]], [0.32, [58, 28, 60]], [0.55, [122, 48, 66]],
    [0.72, [222, 108, 76]], [0.86, [255, 178, 96]], [1, [255, 214, 130]],
  ];
  const at = (u) => {
    for (let i = 1; i < stops.length; i++) if (u <= stops[i][0]) {
      const [u0, c0] = stops[i - 1], [u1, c1] = stops[i];
      const k = (u - u0) / (u1 - u0);
      return [0, 1, 2].map((j) => Math.round(lerp(c0[j], c1[j], k)));
    }
    return stops[stops.length - 1][1];
  };
  const img = x.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const row = at(y / (h - 1));
    for (let px = 0; px < w; px++) {
      const d = (BAYER[y & 3][px & 3] / 16 - 0.5) * 10;
      const i = (y * w + px) * 4;
      img.data[i] = Math.max(0, Math.min(255, row[0] + d));
      img.data[i + 1] = Math.max(0, Math.min(255, row[1] + d));
      img.data[i + 2] = Math.max(0, Math.min(255, row[2] + d));
      img.data[i + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  // sun disc low over the horizon
  const sy = 372;
  for (let r = 44; r > 0; r -= 2) {
    x.fillStyle = r > 34 ? '#ffe9b0' : '#fff8e0';
    x.beginPath(); x.arc(680, sy, r, 0, 7); x.fill();
  }
  // haze bands over the sun
  x.fillStyle = 'rgba(122,48,66,0.55)';
  x.fillRect(600, sy - 14, 160, 5); x.fillRect(580, sy + 4, 200, 4);
  // few warm clouds
  for (const [cx, cy, cw] of [[180, 130, 130], [460, 90, 110], [790, 160, 150]]) {
    x.fillStyle = 'rgba(255,178,120,0.35)';
    x.fillRect(cx, cy, cw, 10); x.fillRect(cx + 16, cy - 8, cw - 40, 8); x.fillRect(cx + 8, cy + 10, cw - 30, 7);
  }
  return c;
}

export function citySil(w = 1920, h = 190) {
  const c = cv(w, h), x = c.getContext('2d');
  let px = 0, i = 0;
  while (px < w) {
    const tw = 70 + Math.floor(hash(i * 13 + 3) * 110);
    const th = 60 + Math.floor(hash(i * 17 + 5) * 110);
    x.fillStyle = '#241432';
    x.fillRect(px, h - th, tw, th);
    x.fillStyle = 'rgba(255,214,130,0.5)';
    for (let k = 0; k < 5; k++) {
      if (hash(i * 31 + k * 7) > 0.6) x.fillRect(px + 6 + Math.floor(hash(k * 13 + i) * (tw - 12)), h - th + 8 + k * 14, 4, 5);
    }
    px += tw + 10; i++;
  }
  return c;
}

export function car() {
  const w = 150, h = 66;
  const c = cv(w, h), x = c.getContext('2d');
  // shadow-ish underbody
  x.fillStyle = '#0a0a12'; x.fillRect(14, 46, 122, 8);
  // body: low convertible wedge
  x.fillStyle = '#d24a3a';
  x.fillRect(12, 30, 126, 18);
  x.fillRect(24, 22, 90, 10);
  x.fillStyle = '#a83428'; x.fillRect(12, 42, 126, 6);
  x.fillStyle = '#ffcf6e'; x.fillRect(12, 34, 126, 4); // racing stripe
  // nose + tail fin
  x.fillStyle = '#d24a3a'; x.fillRect(4, 34, 10, 12); x.fillRect(134, 24, 10, 20);
  x.fillStyle = '#a83428'; x.fillRect(140, 24, 4, 18);
  // cockpit
  x.fillStyle = '#1a0d10'; x.fillRect(44, 20, 56, 12);
  x.fillStyle = '#59d6d0'; x.fillRect(100, 26, 8, 8); // windshield glint
  // wheels
  for (const wx of [36, 116]) {
    x.fillStyle = '#0a0a12'; x.beginPath(); x.arc(wx, 52, 13, 0, 7); x.fill();
    x.fillStyle = '#3d4258'; x.beginPath(); x.arc(wx, 52, 6, 0, 7); x.fill();
    x.fillStyle = '#b9c4cc'; x.fillRect(wx - 1, 45, 2, 3); x.fillRect(wx - 1, 56, 2, 3);
  }
  // headlight
  x.fillStyle = '#ffe9b0'; x.fillRect(6, 36, 5, 5);
  return c;
}

// velvet-rope stanchion (alarm shot)
export function stanchion() {
  const c = cv(14, 58), x = c.getContext('2d');
  x.fillStyle = '#8a5a2a'; x.fillRect(5, 0, 4, 46);
  x.fillStyle = '#ffcf6e'; x.fillRect(2, 0, 10, 6);
  x.fillStyle = '#1d1030'; x.fillRect(0, 46, 14, 12);
  return c;
}
