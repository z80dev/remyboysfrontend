// THE BALD AND THE BEAUTIFUL — a Remy Boys daytime drama
// 84 s · 90 BPM · 6/8. Episode 44: "The Twin Cometh".
// Visual grammar: storm-night parlour wides on a 960×540 pixel stage (2× nearest),
// full-res close-up INSERT punch-ins from the 600×600 originals, crash zooms,
// one hit-stop slap, freeze-frame cliffhanger, night-fountain credits.
import { W, H, seg, lerp, E, hash, txt, F, clamp, smooth } from 'filmkit/lib.js'
import * as A from '../remy-bros/art.js'
import { DUR, S, CAST, PCROP, ZOOMS, zoomAt, INSERTS, LIGHTNING, FREEZE_T, SLAP, POS, twinX, heroineX, heroX, warp, filmT } from './timeline.js'
import { score } from './score.js'

const LW = 960, LH = 540
const SER = '"Cormorant Garamond"'
const GOLD = '#e8c877'
const ART = {}

const frac = (v) => v - Math.floor(v)
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
async function img(url) { const i = new Image(); i.src = url; await i.decode(); return i }

// ---------- shared drawing helpers ----------
function runCycle(px) {
  const s = Math.sin(px / 26 * Math.PI * 2)
  return { lift: [Math.round(Math.max(0, s) * 5), Math.round(Math.max(0, -s) * 5)], stride: [Math.round(s * 2), Math.round(-s * 2)], lean: 0.05 }
}
const idle = (t, ph) => ({ bob: Math.round(Math.sin(t * 1.9 + ph) * 1.4), lean: 0.01 * Math.sin(t * 1.3 + ph) })

// Museum frame around a pre-cropped portrait canvas.
function framePanel(ctx, c, x, y, s) {
  const w = c.width * s
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#6b4a1c'; ctx.fillRect(-w / 2 - 18, -w / 2 - 18, w + 36, w + 36)
  ctx.fillStyle = '#c9a44a'; ctx.fillRect(-w / 2 - 12, -w / 2 - 12, w + 24, w + 24)
  ctx.fillStyle = '#8a6a24'; ctx.fillRect(-w / 2 - 6, -w / 2 - 6, w + 12, w + 12)
  ctx.drawImage(c, -w / 2, -w / 2, w, w)
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.fillRect(-w / 2, -w / 2, w, 10); ctx.fillRect(-w / 2, -w / 2, 10, w)
  ctx.restore()
}

// Full-res close-up INSERT: dark spotlight, zoom punch on a framed portrait.
function drawInsert(ctx, t, ins) {
  const u = clamp01((t - ins.t0) / 0.5)
  const punch = 1 + 0.17 * E.outCubic(u)
  const sway = Math.sin((t - ins.t0) * 1.1) * 6 * (1 - u)
  const g = ctx.createRadialGradient(W / 2 + sway, 500, 200, W / 2, 540, 1150)
  g.addColorStop(0, ins.who === 'twin' ? '#2a0d16' : '#241a2e')
  g.addColorStop(1, '#050308')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  framePanel(ctx, ART.port[ins.who], W / 2 + sway, 520, punch)
  // name plate
  const nm = CAST[ins.who].name
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(W / 2 - 190, 1006, 380, 62)
  txt(ctx, nm, W / 2, 1048, { size: 42, font: SER, weight: '600', color: '#f3e6c8', align: 'center', track: 6 })
  if (ins.who === 'twin') {
    ctx.fillStyle = 'rgba(120,0,20,0.16)'; ctx.fillRect(0, 0, W, H)
    const v = ctx.createRadialGradient(W / 2, 540, 500, W / 2, 540, 1150)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(40,0,8,0.55)')
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
  }
}

// =====================================================================
// BAKED SETS (960×540, painted once — every animated layer is drawn per frame)
// =====================================================================
function brick(x, bx, by, bw, bh) {
  x.fillStyle = '#4d3226'; x.fillRect(bx, by, bw, bh)
  for (let r = 0; r * 14 < bh; r++) {
    const off = (r % 2) * 22
    for (let c = -1; c * 44 + off < bw + 44; c++) {
      const h1 = hash(r * 91 + c * 17 + 5)
      x.fillStyle = ['#6a4030', '#75493a', '#5e382c', '#6e4534'][Math.floor(h1 * 4)]
      x.fillRect(bx + off + c * 44 + 2, by + r * 14 + 2, 40, 10)
    }
  }
}

function bakeParlor() {
  const c = A.canvas(LW, LH), x = c.getContext('2d')
  // back wall: damask bands + motif dots
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#4a2437' : '#451f32'; x.fillRect(i * 120, 0, 120, 330) }
  for (let r = 0; r < 7; r++) for (let col = 0; col < 12; col++) {
    const px = col * 80 + (r % 2) * 40, py = r * 46 + 24
    x.fillStyle = 'rgba(214,164,190,0.13)'
    x.beginPath(); x.moveTo(px, py - 7); x.lineTo(px + 6, py); x.lineTo(px, py + 7); x.lineTo(px - 6, py); x.fill()
    x.fillRect(px - 1, py - 11, 2, 4); x.fillRect(px - 1, py + 7, 2, 4)
  }
  x.fillStyle = '#2c1520'; x.fillRect(0, 0, LW, 14)
  x.fillStyle = '#5c3a4a'; x.fillRect(0, 14, LW, 6)
  // wainscot
  x.fillStyle = '#3a2015'; x.fillRect(0, 330, LW, 60)
  for (let p = 0; p < 16; p++) {
    x.fillStyle = '#48291a'; x.fillRect(p * 62 + 6, 336, 50, 48)
    x.fillStyle = '#553323'; x.fillRect(p * 62 + 10, 340, 42, 40)
  }
  x.fillStyle = '#5c3a26'; x.fillRect(0, 326, LW, 8)
  // floor
  x.fillStyle = '#241109'; x.fillRect(0, 390, LW, LH - 390)
  for (let i = 0; i < 26; i++) {
    const h1 = hash(i * 31 + 3)
    x.fillStyle = ['#31200f', '#382613', '#2b1b0d'][Math.floor(h1 * 3)]
    x.fillRect(0, 392 + i * 6, LW, 5)
  }
  x.fillStyle = '#4a341d'; x.fillRect(0, 390, LW, 4)
  // rug
  x.fillStyle = '#5e2430'; x.fillRect(150, 430, 660, 96)
  x.fillStyle = '#7a3341'; x.fillRect(166, 438, 628, 80)
  x.fillStyle = '#5e2430'; x.fillRect(178, 446, 604, 64)
  for (let i = 0; i < 12; i++) { x.fillStyle = '#caa468'; x.fillRect(190 + i * 50, 468, 26, 5) }
  // window (left): storm night outside
  const wx = 118, wy = 62, ww = 128, wh = 240
  const sky = x.createLinearGradient(0, wy, 0, wy + wh)
  sky.addColorStop(0, '#0d1430'); sky.addColorStop(1, '#27305c')
  x.fillStyle = sky; x.fillRect(wx, wy, ww, wh)
  x.fillStyle = 'rgba(255,255,255,0.5)'
  for (let i = 0; i < 8; i++) x.fillRect(wx + 8 + hash(i * 7) * (ww - 16), wy + 10 + hash(i * 13 + 2) * 70, 2, 2)
  x.fillStyle = '#141b38'
  x.beginPath(); x.ellipse(wx + 34, wy + 54, 46, 18, 0, 0, 7); x.fill()
  x.beginPath(); x.ellipse(wx + 96, wy + 84, 52, 20, 0, 0, 7); x.fill()
  // window frame + mullions + sill
  x.fillStyle = '#e8dcc8'; x.fillRect(wx - 10, wy - 10, ww + 20, wh + 20)
  x.fillStyle = sky; x.fillRect(wx, wy, ww, wh)
  x.fillStyle = '#e8dcc8'
  x.fillRect(wx - 10, wy + wh / 2 - 4, ww + 20, 8); x.fillRect(wx + ww / 2 - 4, wy - 10, 8, wh + 20)
  x.fillStyle = '#c9bda6'; x.fillRect(wx - 16, wy + wh + 10, ww + 32, 12)
  // curtains
  x.fillStyle = '#6e1626'; x.fillRect(wx - 34, wy - 22, 30, wh + 40); x.fillRect(wx + ww + 4, wy - 22, 30, wh + 40)
  x.fillStyle = '#8a2233'
  for (let i = 0; i < 5; i++) { x.fillRect(wx - 34 + i * 6, wy - 22, 3, wh + 40); x.fillRect(wx + ww + 8 + i * 6, wy - 22, 3, wh + 40) }
  x.fillStyle = '#7d1c2c'; x.fillRect(wx - 40, wy - 34, ww + 80, 16)
  x.fillStyle = '#a03448'; x.fillRect(wx - 40, wy - 34, ww + 80, 5)
  // fireplace (right)
  brick(x, 700, 120, 190, 270)
  x.fillStyle = '#1c0e08'; x.fillRect(726, 214, 138, 150) // firebox
  x.fillStyle = '#120806'; x.fillRect(726, 214, 138, 26)
  x.fillStyle = '#805a30'; x.fillRect(688, 186, 214, 18)  // mantle
  x.fillStyle = '#9a7038'; x.fillRect(688, 186, 214, 6)
  x.fillStyle = '#6e4c24'; x.fillRect(678, 386, 236, 12)  // hearth
  // family portrait above mantle (pixel heads of the couple)
  x.fillStyle = '#8a6a24'; x.beginPath(); x.ellipse(795, 120, 58, 66, 0, 0, 7); x.fill()
  x.fillStyle = '#c9a44a'; x.beginPath(); x.ellipse(795, 120, 52, 60, 0, 0, 7); x.fill()
  x.fillStyle = '#20122b'; x.beginPath(); x.ellipse(795, 120, 48, 56, 0, 0, 7); x.fill()
  if (ART.mantle) x.drawImage(ART.mantle, 795 - 46, 120 - 54, 92, 108)
  x.fillStyle = '#9a7038'; x.fillRect(760, 48, 70, 6) // picture light
  // candlesticks on mantle
  for (const cx of [712, 700 + 96, 700 + 150]) {
    x.fillStyle = '#c9b26a'; x.fillRect(cx - 5, 160, 10, 26); x.fillRect(cx - 8, 158, 16, 5)
  }
  // side table between window and sofa
  x.fillStyle = '#4a2f18'; x.fillRect(268, 356, 12, 46); x.fillRect(340, 356, 12, 46); x.fillRect(258, 348, 104, 10)
  x.fillStyle = '#8a5c30'; x.fillRect(258, 344, 104, 6)
  x.fillStyle = '#3f6f4f'; x.fillRect(288, 316, 44, 30) // vase
  x.fillStyle = '#568f66'; x.fillRect(292, 306, 6, 12); x.fillRect(322, 310, 6, 8)
  // sofa (center)
  const sx = 392, sy = 300
  x.fillStyle = '#2d4a6b'; x.fillRect(sx, sy + 60, 240, 66)          // base
  x.fillStyle = '#38597f'; x.fillRect(sx + 8, sy + 66, 108, 44); x.fillRect(sx + 124, sy + 66, 108, 44) // cushions
  x.fillStyle = '#46688f'; x.fillRect(sx, sy, 240, 70)              // backrest
  for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) { x.fillStyle = '#26405c'; x.fillRect(sx + 26 + i * 46 + (r % 2) * 20, sy + 14 + r * 26, 5, 5) }
  x.fillStyle = '#2d4a6b'; x.fillRect(sx - 26, sy + 18, 30, 110); x.fillRect(sx + 236, sy + 18, 30, 110) // arms
  x.fillStyle = '#38597f'; x.fillRect(sx - 22, sy + 22, 22, 102); x.fillRect(sx + 240, sy + 22, 22, 102)
  x.fillStyle = '#5c3a1c'; x.fillRect(sx - 20, sy + 126, 10, 14); x.fillRect(sx + 250, sy + 126, 10, 14) // feet
  return c
}

// The parlour door. Swings away from camera: horizontal foreshortening about the
// hinge edge (a front view cannot rotate a door into the screen plane honestly).
function drawDoor(x, t) {
  const open = t < 43.0 ? 0 : t < 43.4 ? E.outCubic(seg(t, 43.0, 43.4)) : 1
  const dw = 84, dh = 302, dx = 6, dy = 88
  // dark hallway behind the open door
  x.fillStyle = '#0c0608'; x.fillRect(dx + 4, dy + 2, dw - 8, dh - 4)
  if (open > 0.05) {
    const g2 = x.createRadialGradient(dx + dw / 2, dy + dh - 40, 6, dx + dw / 2, dy + dh - 40, 120)
    g2.addColorStop(0, `rgba(200,150,80,${0.16 * open})`); g2.addColorStop(1, 'rgba(200,150,80,0)')
    x.fillStyle = g2; x.fillRect(dx - 60, dy + dh - 200, dw + 120, 240)
  }
  const w = Math.round(dw * (1 - 0.86 * open))
  x.drawImage(ART.doorC, 0, 0, dw, dh, dx, dy, w, dh)
  if (w > 20) { x.fillStyle = '#c9a44a'; x.beginPath(); x.arc(dx + w - 7, dy + dh / 2, 3.5, 0, 7); x.fill() }
  // frame
  x.fillStyle = '#241105'
  x.fillRect(dx - 6, dy - 8, dw + 12, 8); x.fillRect(dx - 6, dy - 8, 6, dh + 16); x.fillRect(dx + dw, dy - 8, 6, dh + 16)
  x.fillStyle = '#3a2415'; x.fillRect(dx - 2, dy - 2, dw + 4, 4)
}

function bakeClinic() {
  const c = A.canvas(LW, LH), x = c.getContext('2d')
  const wall = x.createLinearGradient(0, 0, 0, 420)
  wall.addColorStop(0, '#a7c2b2'); wall.addColorStop(1, '#8fb0a0')
  x.fillStyle = wall; x.fillRect(0, 0, LW, 420)
  // tile lower wall
  x.fillStyle = '#d8e6de'; x.fillRect(0, 420, LW, 46)
  for (let i = 0; i < 24; i++) { x.fillStyle = i % 2 ? '#c9dcd2' : '#d8e6de'; x.fillRect(i * 40, 420, 40, 46); x.fillStyle = '#b4c9be'; x.fillRect(i * 40, 420, 2, 46) }
  x.fillStyle = '#7f9c8e'; x.fillRect(0, 416, LW, 6)
  // floor: checker
  for (let r = 0; r < 5; r++) for (let col = 0; col < 16; col++) {
    x.fillStyle = (r + col) % 2 ? '#cfdcd6' : '#9fb2ab'
    x.fillRect(col * 62 - (r % 2) * 31, 466 + r * 16, 62, 16)
  }
  x.fillStyle = '#8fa69c'; x.fillRect(0, 464, LW, 4)
  // window + blinds (right)
  const wx = 640, wy = 60, ww = 220, wh = 190
  x.fillStyle = '#e9f2ee'; x.fillRect(wx - 10, wy - 10, ww + 20, wh + 20)
  const sk = x.createLinearGradient(0, wy, 0, wy + wh); sk.addColorStop(0, '#bcd8e8'); sk.addColorStop(1, '#8fb4c6')
  x.fillStyle = sk; x.fillRect(wx, wy, ww, wh)
  for (let i = 0; i < 11; i++) { x.fillStyle = '#f2f6f3'; x.fillRect(wx, wy + 6 + i * 17, ww, 11); x.fillStyle = 'rgba(70,90,84,0.35)'; x.fillRect(wx, wy + 15 + i * 17, ww, 3) }
  // light slashes on floor
  x.fillStyle = 'rgba(255,246,214,0.12)'
  for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(wx - 30 + i * 60, 470); x.lineTo(wx + 6 + i * 60, 470); x.lineTo(wx - 44 + i * 60, 540); x.lineTo(wx - 80 + i * 60, 540); x.fill() }
  // cabinet (left) with bottles
  x.fillStyle = '#5d7a6e'; x.fillRect(48, 120, 150, 300)
  x.fillStyle = '#48604f'; x.fillRect(56, 128, 134, 284)
  x.fillStyle = 'rgba(230,244,240,0.25)'; x.fillRect(64, 136, 118, 120); x.fillRect(64, 272, 118, 120)
  x.strokeStyle = '#5d7a6e'; x.lineWidth = 4; x.strokeRect(64, 136, 118, 120); x.strokeRect(64, 272, 118, 120)
  const cols = ['#c8e0d2', '#e8d4c2', '#d4c8e8', '#e2e8c8', '#c8d0e8']
  for (let i = 0; i < 6; i++) {
    const bx = 76 + (i % 3) * 38, by = 176 + Math.floor(i / 3) * 34
    x.fillStyle = cols[i % 5]; x.fillRect(bx, by, 16, 26); x.fillStyle = '#39524a'; x.fillRect(bx + 4, by - 6, 8, 7)
  }
  // exam bed
  x.fillStyle = '#b8c8c0'; x.fillRect(240, 372, 190, 14)
  x.fillStyle = '#e8efe9'; x.fillRect(244, 360, 182, 14)
  x.fillStyle = '#f4f8f4'; x.fillRect(250, 350, 54, 12)
  x.fillStyle = '#8fa69a'; x.fillRect(252, 386, 8, 80); x.fillRect(410, 386, 8, 80)
  x.fillStyle = '#71887c'; x.fillRect(244, 464, 182, 6)
  // FOLLICLE INDEX wall chart — the hair-growth stages, declining
  x.fillStyle = '#f4f2e6'; x.fillRect(470, 130, 150, 108)
  x.fillStyle = '#28332e'; x.fillRect(470, 130, 150, 18); x.fillRect(470, 228, 150, 10)
  x.fillStyle = '#f4f2e6'
  x.font = 'bold 14px monospace'; x.textAlign = 'center'
  x.fillText('FOLLICLE INDEX', 545, 144)
  x.strokeStyle = '#b84a4a'; x.lineWidth = 3; x.beginPath(); x.moveTo(484, 168); x.lineTo(606, 216); x.stroke()
  for (let i = 0; i < 5; i++) {
    const hx2 = 492 + i * 28, hy2 = 204 - i * 12
    x.fillStyle = '#c8a07c'; x.beginPath(); x.arc(hx2, hy2, 8, 0, 7); x.fill()
    x.fillStyle = ['#3a2a1c', '#4a3422', '#54402c', '#7a5a36', '#c8a07c'][4 - i]
    x.beginPath(); x.arc(hx2, hy2 - 2, 9, Math.PI, 0); x.fill()
  }
  // standing tray
  x.fillStyle = '#9aa8a0'; x.fillRect(560, 436, 60, 6); x.fillRect(586, 442, 6, 34)
  x.fillStyle = '#c8d4cc'; x.fillRect(566, 424, 20, 12); x.fillRect(596, 428, 16, 8)
  // ceiling lamp cone
  x.fillStyle = '#6e8278'; x.fillRect(468, 0, 8, 64); x.fillRect(438, 60, 68, 14)
  x.fillStyle = 'rgba(255,250,220,0.09)'
  x.beginPath(); x.moveTo(440, 74); x.lineTo(504, 74); x.lineTo(560, 470); x.lineTo(384, 470); x.fill()
  return c
}

function bakeMansion() {
  const c = A.canvas(LW, LH), x = c.getContext('2d')
  const sky = x.createLinearGradient(0, 0, 0, LH)
  sky.addColorStop(0, '#0a0e2a'); sky.addColorStop(0.7, '#1d2650'); sky.addColorStop(1, '#2c3166')
  x.fillStyle = sky; x.fillRect(0, 0, LW, LH)
  for (let i = 0; i < 46; i++) {
    const sx2 = hash(i * 3 + 1) * LW, sy2 = hash(i * 7 + 2) * 300
    x.fillStyle = `rgba(240,244,255,${0.35 + hash(i * 11) * 0.5})`
    x.fillRect(sx2, sy2, hash(i) > 0.8 ? 2 : 1, hash(i) > 0.8 ? 2 : 1)
  }
  // moon
  x.fillStyle = 'rgba(232,238,220,0.12)'; x.beginPath(); x.arc(810, 86, 54, 0, 7); x.fill()
  x.fillStyle = '#eef0dc'; x.beginPath(); x.arc(810, 86, 38, 0, 7); x.fill()
  x.fillStyle = '#d8dcbe'
  x.beginPath(); x.arc(798, 78, 8, 0, 7); x.fill(); x.beginPath(); x.arc(822, 96, 6, 0, 7); x.fill(); x.beginPath(); x.arc(812, 70, 4, 0, 7); x.fill()
  // lawn
  x.fillStyle = '#16250f'; x.fillRect(0, 436, LW, LH - 436)
  x.fillStyle = '#1d3013'; x.fillRect(0, 436, LW, 8)
  // the mansion (right)
  const mx = 560, my = 96
  x.fillStyle = '#241a2e'; x.fillRect(mx, my, 330, 348) // facade
  x.fillStyle = '#2f2338'; x.fillRect(mx - 14, my - 16, 358, 20)
  x.fillStyle = '#1a1220'; x.fillRect(mx - 14, my + 336, 358, 16)
  for (let f = 0; f < 3; f++) for (let i = 0; i < 5; i++) {
    const lit = hash(f * 17 + i * 5 + 9) > 0.45
    const wxx = mx + 18 + i * 62, wyy = my + 22 + f * 108
    x.fillStyle = lit ? '#f4d98a' : '#141020'
    x.fillRect(wxx, wyy, 40, 60)
    if (lit) { x.fillStyle = 'rgba(180,120,60,0.35)'; x.fillRect(wxx + 4, wyy + 30, 32, 4); x.fillRect(wxx + 18, wyy + 4, 4, 52) }
    else { x.strokeStyle = '#2c2440'; x.lineWidth = 3; x.strokeRect(wxx + 6, wyy + 8, 28, 44) }
    x.fillStyle = '#3a2c48'; x.fillRect(wxx - 4, wyy + 60, 48, 6)
  }
  // portico columns + steps + door
  x.fillStyle = '#3d2f4e'; x.fillRect(mx + 96, my + 60, 140, 288)
  for (let i = 0; i < 4; i++) { x.fillStyle = '#57447026'; x.fillRect(mx + 104 + i * 36, my + 72, 16, 268); x.fillStyle = '#4a3a5e'; x.fillRect(mx + 100 + i * 36, my + 72, 14, 270) }
  x.fillStyle = '#120d18'; x.fillRect(mx + 128, my + 210, 76, 138)
  x.fillStyle = '#f4d98a'; x.fillRect(mx + 134, my + 218, 64, 60)
  x.fillStyle = '#8a6a24'; x.beginPath(); x.arc(mx + 196, my + 288, 4, 0, 7); x.fill()
  x.fillStyle = '#2b2138'; x.fillRect(mx + 76, my + 348, 180, 10); x.fillRect(mx + 68, my + 358, 196, 10); x.fillRect(mx + 60, my + 368, 212, 10)
  // gate lamps (left)
  for (const lx of [96, 208]) {
    x.fillStyle = '#3a3244'; x.fillRect(lx - 4, 396, 8, 44)
    x.fillStyle = '#f4e6a0'; x.fillRect(lx - 8, 380, 16, 18)
    x.fillStyle = 'rgba(244,220,140,0.18)'; x.beginPath(); x.arc(lx, 388, 26, 0, 7); x.fill()
  }
  // fountain basin (static stone; water is animated per frame)
  x.fillStyle = '#585064'; x.beginPath(); x.ellipse(300, 470, 150, 34, 0, 0, 7); x.fill()
  x.fillStyle = '#6c6478'; x.beginPath(); x.ellipse(300, 462, 150, 34, 0, 0, 7); x.fill()
  x.fillStyle = '#27404e'; x.beginPath(); x.ellipse(300, 460, 138, 28, 0, 0, 7); x.fill()
  x.fillStyle = '#3d5a68'; x.beginPath(); x.ellipse(300, 458, 126, 23, 0, 0, 7); x.fill()
  x.fillStyle = '#7a7288'; x.fillRect(288, 350, 24, 108)
  x.fillStyle = '#8c849a'; x.beginPath(); x.ellipse(300, 348, 44, 12, 0, 0, 7); x.fill()
  x.fillStyle = '#9aa2ae'; x.beginPath(); x.ellipse(300, 342, 30, 8, 0, 0, 7); x.fill()
  // balustrade
  for (let i = 0; i < 15; i++) { x.fillStyle = '#4c4458'; x.fillRect(40 + i * 26, 412, 10, 26); }
  x.fillStyle = '#585064'; x.fillRect(30, 406, 400, 7)
  x.fillStyle = '#4c4458'; x.fillRect(760, 406, 190, 7)
  for (let i = 0; i < 7; i++) x.fillRect(766 + i * 26, 412, 10, 26)
  return c
}

// Analytic fountain droplets — pure functions of time, no simulation state.
function drawFountain(x, t) {
  const T = 1.15
  for (let i = 0; i < 34; i++) {
    const u = frac(t * 0.55 + hash(i * 13 + 5))
    const side = i % 2 === 0 ? 1 : -1
    const top = i < 8
    const x0 = top ? 300 : 300 + side * 26, y0 = top ? 344 : 352
    const vx = top ? (hash(i * 3) - 0.5) * 26 : side * (34 + hash(i * 7) * 58)
    const vy = top ? -(120 + hash(i * 5) * 60) : -(48 + hash(i * 5) * 80)
    const px = x0 + vx * u * T, py = y0 + vy * u * T + 0.5 * 300 * (u * T) * (u * T)
    if (py < 460) { x.fillStyle = `rgba(206,228,246,${(1 - u) * 0.85})`; x.fillRect(Math.round(px), Math.round(py), top ? 2 : 3, top ? 2 : 3) }
  }
  x.fillStyle = 'rgba(206,228,246,0.25)'; x.fillRect(300 - 1, 340 - (14 + Math.sin(t * 7) * 3), 2, 14)
}

// Evidence bag with the toupee — the episode's McGuffin.
function bakeToupee() {
  const c = A.canvas(112, 84), x = c.getContext('2d')
  x.fillStyle = 'rgba(220,230,240,0.16)'; x.fillRect(6, 10, 100, 70)
  x.strokeStyle = 'rgba(240,246,252,0.55)'; x.lineWidth = 2; x.strokeRect(6, 10, 100, 70)
  x.fillStyle = 'rgba(180,200,220,0.5)'; x.fillRect(6, 10, 100, 7)
  for (let i = 0; i < 9; i++) x.fillRect(10 + i * 11, 10, 2, 7)
  x.fillStyle = 'rgba(255,255,255,0.28)'; x.fillRect(14, 26, 4, 40) // gloss
  // the toupee: layered wavy strands
  x.fillStyle = '#3a2416'; x.beginPath(); x.ellipse(58, 52, 38, 20, 0, 0, 7); x.fill()
  for (let i = 0; i < 6; i++) {
    x.strokeStyle = ['#54371f', '#6b4a2a', '#7d5c36', '#54371f', '#6b4a2a', '#8a6840'][i]
    x.lineWidth = 5 - (i % 3)
    x.beginPath(); x.moveTo(26 + i * 12, 40 + (i % 2) * 6)
    x.bezierCurveTo(30 + i * 12, 28 + (i % 3) * 5, 44 + i * 12, 30 + (i % 2) * 6, 48 + i * 12, 44 - (i % 2) * 4)
    x.stroke()
  }
  x.fillStyle = '#f4f2e6'; x.fillRect(26, 66, 62, 14)
  x.fillStyle = '#28332e'; x.font = 'bold 11px monospace'; x.textAlign = 'center'
  x.fillText('EXHIBIT A', 57, 77)
  return c
}

// =====================================================================
// PER-FRAME STAGE SCENES (all repainted every frame; camera transform identity at rest)
// =====================================================================
function fireGlow(x, t, strong) {
  const fl = (i) => 0.6 + 0.4 * Math.sin(t * 11 + i * 2.4) * Math.sin(t * 17.3 + i)
  const base = strong ?? 1
  for (let i = 0; i < 3; i++) {
    const fh = (20 + i * 9) * fl(i) * base
    x.fillStyle = ['#e8863a', '#f2a24a', '#f8c470'][i]
    x.beginPath()
    x.moveTo(742 + i * 38 - 12, 364)
    x.quadraticCurveTo(742 + i * 38, 364 - fh * 1.7, 742 + i * 38 + 12, 364)
    x.fill()
  }
  const g = x.createRadialGradient(795, 350, 10, 795, 350, 200)
  g.addColorStop(0, `rgba(242,162,74,${0.16 * base})`); g.addColorStop(1, 'rgba(242,162,74,0)')
  x.fillStyle = g; x.fillRect(600, 150, 380, 380)
  // candle flames
  for (const cx of [712, 796, 850]) {
    x.fillStyle = '#f8c470'; x.fillRect(cx - 2, 148 - 7 * (0.7 + 0.3 * Math.sin(t * 9 + cx)), 4, 7)
  }
}

function lightningFlash(x, t) {
  for (const b of LIGHTNING) {
    const d = t - b
    if (d < 0 || d > 0.22) continue
    const a = (1 - d / 0.22) * 0.85
    x.fillStyle = `rgba(190,210,255,${a * 0.55})`
    x.fillRect(118, 62, 128, 240)
    x.fillStyle = `rgba(200,215,255,${a * 0.12})`
    x.fillRect(0, 0, LW, LH)
  }
}

// slap stars — analytic, freeze-aware: slow-motion bloom inside the stop, then resume
function slapStars(x, wt) {
  const { g, stop, sl } = wt
  const a = stop ? 0.02 + sl * 0.5 : g > 55.4 ? 0.02 + 0.175 + (g - 55.4) : -1
  if (a < 0 || a > 0.7) return
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 + hash(i * 31) * 0.6
    const d = 12 + 100 * a * (0.5 + hash(i * 7) * 0.7)
    x.fillStyle = i % 2 ? '#ffe9f2' : '#ffffff'
    x.globalAlpha = 1 - a / 0.7
    x.fillRect(Math.round(SLAP.x + Math.cos(ang) * d) - 2, Math.round(SLAP.y + Math.sin(ang) * d) - 2, 5, 5)
  }
  x.globalAlpha = 1
  x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.globalAlpha = Math.max(0, 1 - a / 0.5)
  x.beginPath(); x.arc(SLAP.x, SLAP.y, 6 + 75 * a, 0, 7); x.stroke()
  x.globalAlpha = 1
}

function paintParlorActors(x, t, wt, mode) {
  // mode 'confession' (26–42) or 'twin' (42–60): same continuous scene
  const storm = mode === 'twin'
  const g = wt.g
  // butler answers the door: present from the shot start, startles at the lightning
  if (storm) {
    const startled = seg(t, 43.1, 43.9)
    const id2 = idle(t, 2.1)
    A.drawRemy(x, ART.butler, POS.butler.x, POS.butler.fy + id2.bob, { flip: true, lean: -0.16 * startled + id2.lean, sy: 1, alpha: 1 })
  }
  // Baldwin — only from the moment the door is open (he steps through the threshold)
  if (storm && g >= 43.15) {
    const tx = twinX(g)
    const walking = (g > 43.2 && g < 45.2) || (g > 50.8 && g < 52.6)
    const recoil = g > 55.4 ? Math.exp(-(g - 55.4) * 3.2) : 0
    const glowA = g > 43.2 && g < 44.8 ? 0.5 * (1 - seg(g, 44.0, 44.8)) : 0
    const whiteFlash = (wt.stop != null && wt.sl < 0.14) || (g > 55.4 && g < 55.52)
    A.drawRemy(x, ART.twin, tx, POS.twinNear.fy, {
      ...(walking ? runCycle(tx) : idle(t, 4.2)),
      flip: false, lean: idle(t, 4.2).lean - 0.3 * recoil, rot: -0.1 * recoil,
      glow: '#9a7aff', glowA, white: whiteFlash,
    })
  }
  // heroine — she always faces left here (toward hero and Baldwin)
  const hx = storm ? heroineX(g) : POS.heroine.x
  const lungeLean = storm && g > 53.0 && g < 55.4 ? 0.3 * seg(g, 53.0, 55.4) : 0
  const backLean = storm && g > 55.4 && g < 57.4 ? -0.18 * (1 - seg(g, 55.4, 57.4)) : 0
  const gaspLean = !storm ? -0.12 * seg(t, 39.2, 39.8) * (1 - seg(t, 41.2, 42.0)) : 0
  const hId = idle(t, 1.3)
  A.drawRemy(x, ART.heroine, hx, POS.heroine.fy + hId.bob, {
    flip: true, ...(g > 53.0 && g < 55.4 ? { stride: [3, 1] } : {}),
    lean: hId.lean + lungeLean + backLean + gaspLean,
  })
  // hero
  const gx = storm ? heroX(g) : POS.hero.x
  const confess = !storm ? 0.14 * Math.sin(seg(t, 27.2, 28.4) * Math.PI) : 0
  const stepLean = storm && g > 56 ? 0.1 : 0
  const gId = idle(t, 0.4)
  A.drawRemy(x, ART.hero, gx, POS.hero.fy + gId.bob, {
    flip: false, lean: gId.lean + confess + stepLean,
    glow: '#7ac4ff', glowA: storm && g > 56.2 && g < 58 ? 0.4 : 0,
  })
  // the slap streak: her hand's swipe path to Baldwin's cheek, just before contact
  if (storm && g > 55.15 && g < 55.42) {
    const su = seg(g, 55.15, 55.4)
    x.strokeStyle = `rgba(255,255,255,${0.25 + 0.6 * su})`; x.lineWidth = 5; x.lineCap = 'round'
    x.beginPath(); x.moveTo(470 - 26 * su, 400 - 14 * su); x.lineTo(452 - 30 * su, 388 - 8 * su); x.stroke()
  }
  if (storm) slapStars(x, wt)
}

// Crash-zoom camera: magnify k× and CENTER the focus point on the canvas
// (translate the focus to canvas centre, not zoom about it in place).
function zoomCam(x, z) {
  x.translate(LW / 2, LH / 2)
  x.scale(z.k, z.k)
  x.translate(-z.z.x, -z.z.y)
}

function drawParlorStage(ctx, lt, t, mode) {
  const x = ART.low.getContext('2d')
  x.setTransform(1, 0, 0, 1, 0, 0)
  x.imageSmoothingEnabled = false
  x.globalAlpha = 1
  x.fillStyle = '#160a10'; x.fillRect(-40, -40, LW + 80, LH + 80)
  const wt = warp(t)
  const z = zoomAt(t)
  // camera shake on real time through the freeze
  const sd = t - filmT(55.4)
  const k = mode === 'twin' && sd >= 0 && sd < 0.5 ? 5 * Math.exp(-sd * 11) : 0
  x.save()
  x.translate(Math.round(Math.sin(t * 91) * k), Math.round(Math.cos(t * 83) * k))
  if (z.z) zoomCam(x, z)
  x.drawImage(ART.parlor, 0, 0)
  drawDoor(x, t)
  fireGlow(x, t, mode === 'twin' ? 0.85 : 1)
  lightningFlash(x, t)
  paintParlorActors(x, t, wt, mode)
  x.restore()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(ART.low, 0, 0, LW, LH, 0, 0, W, H)
}

function drawClinicStage(ctx, lt, t) {
  const x = ART.low.getContext('2d')
  x.setTransform(1, 0, 0, 1, 0, 0)
  x.imageSmoothingEnabled = false
  x.globalAlpha = 1
  x.fillStyle = '#0c1210'; x.fillRect(-40, -40, LW + 80, LH + 80)
  const z = zoomAt(t)
  x.save()
  if (z.z) zoomCam(x, z)
  x.drawImage(ART.clinic, 0, 0)
  // doctor (right, holds the evidence bag out to his side, away from his face)
  const dId = idle(t, 3.4)
  const raise = seg(t, 65.6, 66.1) * (1 - seg(t, 69.2, 69.9))
  A.drawRemy(x, ART.doctor, POS.doctor.x, POS.doctor.fy + dId.bob, { flip: true, lean: dId.lean - 0.05 * raise })
  // bag held out to his front (screen-left), forearm from his chest to the bag
  const bagX = POS.doctor.x - 152, bagY = POS.doctor.fy - 96 - raise * 74 + Math.sin(t * 2.1) * 2
  const bagW = 112, bagH = 84
  const handX = bagX + bagW - 14, handY = bagY + bagH - 8
  x.strokeStyle = '#dcd7d4'; x.lineWidth = 9; x.lineCap = 'round'
  x.beginPath(); x.moveTo(POS.doctor.x - 16, POS.doctor.fy - 68); x.lineTo(handX, handY); x.stroke()
  x.fillStyle = '#c8a07c'; x.beginPath(); x.arc(handX, handY, 5, 0, 7); x.fill()
  if (raise > 0.02) {
    const gg = x.createRadialGradient(bagX + bagW / 2, bagY + bagH / 2, 8, bagX + bagW / 2, bagY + bagH / 2, 130)
    gg.addColorStop(0, `rgba(244,220,140,${0.3 * Math.min(1, raise + 0.2)})`); gg.addColorStop(1, 'rgba(244,220,140,0)')
    x.fillStyle = gg; x.fillRect(bagX - 80, bagY - 90, bagW + 160, bagH + 180)
  }
  x.drawImage(ART.bag, Math.round(bagX), Math.round(bagY))
  // worried couple (left)
  const hId = idle(t, 1.1), gId = idle(t, 2.6)
  A.drawRemy(x, ART.heroine, POS.clinicHeroine.x, POS.clinicHeroine.fy + hId.bob, { flip: false, lean: hId.lean + 0.06 * seg(t, 66.4, 67.2) })
  A.drawRemy(x, ART.hero, POS.clinicHero.x, POS.clinicHero.fy + gId.bob, { flip: false, lean: gId.lean - 0.08 * seg(t, 66.4, 67.2) })
  x.restore()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(ART.low, 0, 0, LW, LH, 0, 0, W, H)
}

function drawCliffStage(ctx, lt, t) {
  const x = ART.low.getContext('2d')
  x.setTransform(1, 0, 0, 1, 0, 0)
  x.imageSmoothingEnabled = false
  x.globalAlpha = 1
  x.fillStyle = '#160a10'; x.fillRect(-40, -40, LW + 80, LH + 80)
  const ft = Math.min(lt, FREEZE_T - S.cliff.t0) // world freezes at 74.3
  const tt = S.cliff.t0 + ft
  // freeze-time zoom bump (real time)
  const bump = lt > 2.3 ? 1 + 0.06 * Math.exp(-(lt - 2.3) * 4) : 1
  x.save()
  x.translate(500, 300); x.scale(bump, bump); x.translate(-500, -300)
  x.drawImage(ART.parlor, 0, 0)
  drawDoor(x, 0)
  fireGlow(x, tt, 0.5)
  // Baldwin closes in from the right; Velvet backs away — he catches her wrist
  const u = E.outCubic(seg(ft, 0.1, 2.3))
  const tx = lerp(880, 548, u), vx = lerp(760, 478, u)
  A.drawRemy(x, ART.twin, tx, 470, { ...(ft < 2.3 ? runCycle(tx) : idle(tt, 4.2)), flip: true, lean: 0.18 * u, glow: '#9a7aff', glowA: 0.35 * u })
  A.drawRemy(x, ART.heroine, vx, 464, { ...(ft < 2.3 ? runCycle(vx) : idle(tt, 1.3)), flip: false, lean: -0.2 * u })
  // the grab itself: two arms from shoulder height meeting at her wrist
  if (u > 0.7) {
    const au = seg(u, 0.7, 1)
    x.lineCap = 'round'
    x.strokeStyle = '#b26bea'; x.lineWidth = 8 // Baldwin's arm (twin shirt)
    x.beginPath(); x.moveTo(tx - 10, 404); x.lineTo(520, 396); x.stroke()
    x.strokeStyle = '#052364'; x.lineWidth = 7 // Velvet's arm (navy top)
    x.beginPath(); x.moveTo(vx + 12, 392); x.lineTo(512, 395); x.stroke()
    x.fillStyle = '#c8a07c'; x.beginPath(); x.arc(516, 394, 5, 0, 7); x.fill() // her wrist
  }
  // wrist-grab spark at the freeze
  if (lt >= 2.3 && lt < 3.0) {
    const a = 1 - (lt - 2.3) / 0.7
    x.strokeStyle = `rgba(255,240,220,${a})`; x.lineWidth = 3
    x.beginPath(); x.arc(516, 394, 10 + 46 * (1 - a), 0, 7); x.stroke()
  }
  x.restore()
  // sepia grade deepens after the record scratch: warm multiply + faint cream lift
  const sep = clamp01((lt - 2.5) / 1.1)
  if (sep > 0) {
    x.globalCompositeOperation = 'multiply'
    x.fillStyle = `rgba(214,178,122,${sep})`; x.fillRect(0, 0, LW, LH)
    x.globalCompositeOperation = 'screen'
    x.fillStyle = `rgba(38,26,12,${sep * 0.5})`; x.fillRect(0, 0, LW, LH)
    x.globalCompositeOperation = 'source-over'
  }
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(ART.low, 0, 0, LW, LH, 0, 0, W, H)
}

// =====================================================================
// FULL-RES SCENES: cold open, titles, inserts, credits
// =====================================================================
function drawCold(ctx, lt, t) {
  ctx.fillStyle = '#140a10'; ctx.fillRect(0, 0, W, H)
  // faint damask texture
  ctx.strokeStyle = 'rgba(190,140,160,0.05)'; ctx.lineWidth = 2
  for (let i = -2; i < 16; i++) for (let j = 0; j < 10; j++) {
    const px = i * 160 + (j % 2) * 80, py = j * 130
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 60, py + 40); ctx.lineTo(px, py + 80); ctx.lineTo(px - 60, py + 40); ctx.closePath(); ctx.stroke()
  }
  const beats = [
    { t0: 2.2, t1: 5.9, kind: 'twins' },
    { t0: 6.3, t1: 9.95, kind: 'bald' },
    { t0: 10.0, t1: 13.65, kind: 'toupee' },
  ]
  for (const b of beats) {
    if (t < b.t0 || t > b.t1) continue
    const u = seg(t, b.t0 + 0.15, b.t1 - 0.15)
    const punch = 1 + 0.14 * E.outCubic(seg(t, b.t0, b.t0 + 0.5))
    const fade = Math.min(seg(t, b.t0, b.t0 + 0.12), 1 - seg(t, b.t1 - 0.12, b.t1))
    ctx.save()
    ctx.globalAlpha = fade
    if (b.kind === 'twins') {
      framePanel(ctx, ART.port.hero, 660, 540, punch)
      framePanel(ctx, ART.port.twin, 1290, 540, punch)
    } else if (b.kind === 'bald') {
      const g2 = ctx.createRadialGradient(960, 540, 260, 960, 540, 1200)
      g2.addColorStop(0, '#2a0d16'); g2.addColorStop(1, '#050308')
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H)
      framePanel(ctx, ART.port.twin, 960, 540, 1.3 * punch)
      ctx.fillStyle = `rgba(150,10,30,${0.12 + 0.08 * Math.sin(t * 3)})`; ctx.fillRect(0, 0, W, H)
    } else {
      const g3 = ctx.createRadialGradient(960, 620, 120, 960, 620, 900)
      g3.addColorStop(0, 'rgba(250,240,210,0.16)'); g3.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H)
      ctx.save(); ctx.translate(960, 600); ctx.scale(4.6 * punch, 4.6 * punch); ctx.rotate(Math.sin(t * 0.8) * 0.02)
      ctx.drawImage(ART.bag, -56, -42); ctx.restore()
    }
    ctx.restore()
  }
}

const TITLE_PANELS = [
  { t0: 15.7, t1: 17.85, who: ['hero', 'heroine'] },
  { t0: 17.95, t1: 20.1, who: ['twin'] },
  { t0: 20.2, t1: 22.35, who: ['doctor', 'butler'] },
]

function drawTitles(ctx, lt, t) {
  ctx.imageSmoothingEnabled = false
  // gentle push-in about the fountain
  const k = 1 + 0.05 * E.outCubic(seg(t, 14, 22))
  ctx.save()
  ctx.translate(600, 330); ctx.scale(k, k); ctx.translate(-600, -330)
  ctx.drawImage(ART.mansion, 0, 0, LW, LH, 0, 0, W, H)
  drawFountainScaled(ctx, t)
  ctx.restore()
  for (const p of TITLE_PANELS) {
    if (t < p.t0 || t > p.t1) continue
    const slideIn = smooth(seg(t, p.t0, p.t0 + 0.55))       // readable lateral slide
    const alphaIn = clamp01(seg(t, p.t0, p.t0 + 0.22) * 1.4) // alpha completes faster than the slide
    const outU = seg(t, p.t1 - 0.4, p.t1)
    const n = p.who.length
    p.who.forEach((who, i) => {
      const cx = n === 1 ? 960 : 640 + i * 640
      const dir = i % 2 ? 1 : -1
      const slide = (1 - slideIn) * 560 * dir + outU * 560 * -dir
      const cast = CAST[who]
      ctx.save()
      ctx.globalAlpha = alphaIn * (1 - outU)
      ctx.translate(cx + slide, 0)
      if (who === 'butler') framePanel(ctx, ART.portButler, 0, 460, 0.72 + 0.03 * slideIn)
      else framePanel(ctx, ART.port[who], 0, 470, 0.74 + 0.03 * slideIn)
      // name plate: epithet AS character
      const label = `${cast.epithet.toUpperCase()}`
      const as = `as ${cast.name}`
      ctx.fillStyle = 'rgba(8,6,14,0.55)'; ctx.fillRect(-330, 812, 660, 118)
      ctx.fillStyle = GOLD; ctx.fillRect(-330, 812, 660, 3); ctx.fillRect(-330, 927, 660, 3)
      txt(ctx, label, 0, 862, { size: 46, font: SER, weight: '700', color: '#f3e6c8', align: 'center', track: 4 })
      txt(ctx, as, 0, 912, { size: 32, font: SER, weight: 'italic 500', color: GOLD, align: 'center', track: 2 })
      if (who === 'twin') { ctx.fillStyle = `rgba(150,10,30,${0.10 + 0.06 * Math.sin(t * 5)})`; ctx.fillRect(-660, 0, 1320, 1080) }
      ctx.restore()
    })
  }
  // logo lockup
  const lu = clamp01((t - 22.4) / 0.7)
  if (lu > 0) {
    ctx.save()
    ctx.globalAlpha = lu
    ctx.fillStyle = 'rgba(6,4,12,0.55)'; ctx.fillRect(0, 290, W, 560)
    ctx.fillStyle = GOLD; ctx.fillRect(240, 302, W - 480, 3); ctx.fillRect(240, 836, W - 480, 3)
    txt(ctx, 'THE BALD', 960, 466, { size: 168, font: SER, weight: '700', color: '#f3e6c8', align: 'center', track: 10, shadow: 'rgba(0,0,0,0.6)' })
    txt(ctx, 'and the', 960, 580, { size: 56, font: SER, weight: 'italic 500', color: GOLD, align: 'center' })
    txt(ctx, 'BEAUTIFUL', 960, 720, { size: 168, font: SER, weight: '700', color: '#f3e6c8', align: 'center', track: 10, shadow: 'rgba(0,0,0,0.6)' })
    txt(ctx, 'EPISODE 44 — “THE TWIN COMETH”', 960, 806, { size: 38, font: SER, weight: 'italic 500', color: '#d8c9a8', align: 'center', track: 3, shadow: 'rgba(0,0,0,0.7)' })
    ctx.restore()
  }
}

function drawFountainScaled(ctx, t) {
  // draw fountain water into the low canvas' coordinate space, scaled to full res
  const tmp = ART.fbuf.getContext('2d')
  tmp.clearRect(0, 0, LW, LH)
  drawFountain(tmp, t)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(ART.fbuf, 0, 0, LW, LH, 0, 0, W, H)
}

const CREDITS = [
  ['THE BALD AND THE BEAUTIFUL', 64, '#f3e6c8', '700'],
  ['Episode 44 — “The Twin Cometh”', 44, GOLD, 'italic 500'],
  ['', 0, '', ''],
  ['COBALT FLOW  as REMY FLOW', 40, '#f3e6c8', '600'],
  ['GOLD FLOW  as VELVET FLOW', 40, '#f3e6c8', '600'],
  ['VIOLET SOUL  as REMY BALDWIN', 40, '#f3e6c8', '600'],
  ['GOLD SHADES  as DR. SHEARS', 40, '#f3e6c8', '600'],
  ['COPPER FLOW  as BRISTLE', 40, '#f3e6c8', '600'],
  ['', 0, '', ''],
  ['Set Dressing — one sofa', 38, '#d8c9a8', 'italic 500'],
  ['Hair & Makeup — unavailable', 38, '#d8c9a8', 'italic 500'],
  ['Filmed before a live studio audience', 38, '#d8c9a8', 'italic 500'],
  ['of 4,490 Remys', 38, '#d8c9a8', 'italic 500'],
]

function drawCredits(ctx, lt, t) {
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(ART.mansion, 0, 0, LW, LH, 0, 0, W, H)
  drawFountainScaled(ctx, t)
  ctx.fillStyle = 'rgba(4,3,10,0.45)'; ctx.fillRect(0, 0, W, H)
  const speed = 372
  let y = 1260 - lt * speed
  for (const [line, size, color, weight] of CREDITS) {
    if (size) txt(ctx, line, 960, y, { size, font: SER, weight, color, align: 'center', track: 3, shadow: 'rgba(0,0,0,0.7)' })
    y += size + 42
  }
  // final card
  const fu = clamp01((lt - 5.1) / 0.6)
  if (fu > 0) {
    const bg = ctx.createLinearGradient(0, 340, 0, 440)
    bg.addColorStop(0, 'rgba(4,3,10,0)'); bg.addColorStop(1, `rgba(4,3,10,${0.5 * fu})`)
    ctx.fillStyle = bg; ctx.fillRect(0, 340, W, 100)
    ctx.fillStyle = `rgba(4,3,10,${0.5 * fu})`; ctx.fillRect(0, 440, W, 200)
    const bg2 = ctx.createLinearGradient(0, 640, 0, 740)
    bg2.addColorStop(0, `rgba(4,3,10,${0.5 * fu})`); bg2.addColorStop(1, 'rgba(4,3,10,0)')
    ctx.fillStyle = bg2; ctx.fillRect(0, 640, W, 100)
    ctx.save(); ctx.globalAlpha = fu
    txt(ctx, 'A CABALD-DAY PRODUCTION', 960, 560, { size: 64, font: SER, weight: '700', color: '#f3e6c8', align: 'center', track: 8, shadow: 'rgba(0,0,0,0.9)', glow: '#000000', glowBlur: 24 })
    ctx.restore()
  }
}

// =====================================================================
export default {
  title: 'THE BALD AND THE BEAUTIFUL — a Remy Boys daytime drama',
  output: 'bald-and-beautiful.mp4',
  duration: DUR,
  async prepare() {
    ART.hero = await A.loadRemy(CAST.hero.id, false)
    ART.heroine = await A.loadRemy(CAST.heroine.id, false)
    ART.twin = await A.loadRemy(CAST.twin.id, false)
    ART.doctor = await A.loadRemy(CAST.doctor.id, false)
    ART.butler = await A.loadRemy(CAST.butler.id, true)
    // plain shades for the doctor: find the darkest band in the head (his real
    // shades row — wherever it is) and repaint it with generous margins so no
    // branded arch motif can peek out above or below the lenses
    {
      const d = ART.doctor, dx2 = d.c.getContext('2d')
      const dd = dx2.getImageData(0, 0, d.c.width, d.c.height).data
      const headBot = d.top + Math.round((d.bottom - d.top) * 0.55)
      const x0 = Math.max(0, d.cx - 30), x1 = Math.min(d.c.width, d.cx + 30)
      let bestY = -1, bestN = 0
      for (let y = d.top; y < headBot; y++) {
        let n = 0
        for (let xx = x0; xx < x1; xx++) {
          const i = (y * d.c.width + xx) * 4
          if (dd[i + 3] > 40 && dd[i] + dd[i + 1] + dd[i + 2] < 165) n++
        }
        if (n > bestN) { bestN = n; bestY = y }
      }
      if (bestN < 10) bestY = d.top + Math.round((d.bottom - d.top) * 0.3)
      const y0 = Math.max(d.top, bestY - 9), y1 = Math.min(headBot, bestY + 12)
      dx2.fillStyle = '#1c1c26'
      dx2.fillRect(x0, y0, x1 - x0, y1 - y0)
      dx2.fillStyle = '#2e2e3c'
      dx2.fillRect(x0 + 5, y0 + 3, 11, 3); dx2.fillRect(x1 - 16, y0 + 3, 11, 3)
      dx2.fillStyle = '#101018'
      dx2.fillRect(d.cx - 2, y0 + 2, 4, 3) // bridge
    }
    // six-panel door canvas (foreshortened horizontally when open)
    {
      const dc = A.canvas(84, 302), d2 = dc.getContext('2d')
      d2.fillStyle = '#33190d'; d2.fillRect(0, 0, 84, 302)
      d2.fillStyle = '#452613'; d2.fillRect(4, 4, 76, 294)
      for (let r = 0; r < 3; r++) {
        d2.fillStyle = '#2c1409'; d2.fillRect(10, 14 + r * 98, 64, 78)
        d2.fillStyle = '#58371f'; d2.fillRect(12, 16 + r * 98, 60, 8); d2.fillRect(12, 16 + r * 98, 8, 74)
      }
      ART.doorC = dc
    }
    const heads = await A.loadHeads()
    // mantle portrait: the happy couple (pixel heads in the oval)
    const mp = A.canvas(100, 104), mx2 = mp.getContext('2d')
    mx2.imageSmoothingEnabled = false
    mx2.drawImage(A.headIcon(heads, CAST.hero.id, 3), 1, 4)
    mx2.drawImage(A.headIcon(heads, CAST.heroine.id, 3), 50, 4)
    ART.mantle = mp
  // portrait crops (300×300 tight around the face — keeps busy original
  // backgrounds, e.g. the heroine's HUD scene, out of the frame)
  const crop = async (who) => {
    const im = await img(new URL(`../../media/remy/Character${CAST[who].id}.webp`, import.meta.url).href)
    const [cx, cy] = PCROP[who]
    const s = 300, sx = clamp(cx - s / 2, 0, 600 - s), sy = clamp(cy - s / 2, 0, 600 - s)
    const c = A.canvas(s, s)
    c.getContext('2d').drawImage(im, sx, sy, s, s, 0, 0, s, s)
    return c
  }
    ART.port = { hero: await crop('hero'), heroine: await crop('heroine'), twin: await crop('twin'), doctor: await crop('doctor') }
    // butler panel for titles: sprite (no good original needed) on a dark panel
    const bp = A.canvas(440, 440), bx = bp.getContext('2d')
    bx.fillStyle = '#241a2e'; bx.fillRect(0, 0, 440, 440)
    const g2 = bx.createRadialGradient(220, 260, 40, 220, 260, 300)
    g2.addColorStop(0, 'rgba(120,100,160,0.35)'); g2.addColorStop(1, 'rgba(0,0,0,0)')
    bx.fillStyle = g2; bx.fillRect(0, 0, 440, 440)
    bx.imageSmoothingEnabled = false
    bx.drawImage(ART.butler.c, 0, 0, ART.butler.w, ART.butler.h, 130, 40, 180, 360)
    ART.portButler = bp
    ART.bag = bakeToupee()
    ART.parlor = bakeParlor()
    ART.clinic = bakeClinic()
    ART.mansion = bakeMansion()
    ART.low = A.canvas(LW, LH)
    ART.fbuf = A.canvas(LW, LH)
  },
  shots: [
    {
      name: 'cold', t0: S.cold.t0, t1: S.cold.t1,
      draw(ctx, lt, dur, t) { drawCold(ctx, lt, t) },
      fx: () => ({ bloom: 0.1, bloomThresh: 0.9, vignette: 0.62, grain: 0.016 }),
    },
    {
      name: 'titles', t0: S.titles.t0, t1: S.titles.t1,
      draw(ctx, lt, dur, t) { drawTitles(ctx, lt, t) },
      fx: () => ({ bloom: 0.12, bloomThresh: 0.88, vignette: 0.4, grain: 0.008 }),
    },
    {
      name: 'parlor', t0: S.parlor.t0, t1: S.parlor.t1,
      draw(ctx, lt, dur, t) {
        const ins = INSERTS.find((i) => t >= i.t0 && t < i.t1)
        if (ins) return drawInsert(ctx, t, ins)
        drawParlorStage(ctx, lt, t, 'confession')
      },
      fx: () => ({ bloom: 0.08, bloomThresh: 0.92, vignette: 0.55, grain: 0.009, crt: 0.05 }),
    },
    {
      name: 'twin', t0: S.twin.t0, t1: S.twin.t1,
      draw(ctx, lt, dur, t) {
        const ins = INSERTS.find((i) => t >= i.t0 && t < i.t1)
        if (ins) return drawInsert(ctx, t, ins)
        drawParlorStage(ctx, lt, t, 'twin')
      },
      fx: () => ({ bloom: 0.08, bloomThresh: 0.92, vignette: 0.58, grain: 0.01, crt: 0.05 }),
    },
    {
      name: 'clinic', t0: S.clinic.t0, t1: S.clinic.t1,
      draw(ctx, lt, dur, t) {
        const ins = INSERTS.find((i) => t >= i.t0 && t < i.t1)
        if (ins) return drawInsert(ctx, t, ins)
        drawClinicStage(ctx, lt, t)
      },
      fx: () => ({ bloom: 0.09, bloomThresh: 0.9, vignette: 0.5, grain: 0.009, crt: 0.05 }),
    },
    {
      name: 'cliff', t0: S.cliff.t0, t1: S.cliff.t1,
      draw(ctx, lt, dur, t) { drawCliffStage(ctx, lt, t) },
      fx: (lt) => ({ bloom: 0.1, bloomThresh: 0.9, vignette: 0.68, grain: 0.012, crt: 0.05, fade: clamp((lt - 5.2) / 0.7) }),
    },
    {
      name: 'credits', t0: S.credits.t0, t1: S.credits.t1,
      draw(ctx, lt, dur, t) { drawCredits(ctx, lt, t) },
      fx: (lt) => ({ bloom: 0.11, bloomThresh: 0.88, vignette: 0.42, grain: 0.008, fade: clamp((lt - 5.5) / 0.5) }),
    },
  ],
  flashes: [
    [5.95, 0.3, 0.06], [9.9, 0.3, 0.06], [13.55, 0.5, 0.08],
    [43.0, 0.5, 0.1], [43.55, 0.35, 0.08],
    [filmT(55.4), 0.5, 0.12],
    [74.3, 0.4, 0.1],
  ],
  captions: [
    { id: 'prev', style: 'prev', text: 'PREVIOUSLY ON THE BALD AND THE BEAUTIFUL', t0: 0.2, t1: 2.55, minHold: 1.8 },
    { id: 'w1', style: 'whisper', text: 'You were twins.', t0: 2.9, t1: 5.9, minHold: 2.4 },
    { id: 'w2', style: 'whisper', text: 'One was born… bald.', t0: 6.3, t1: 9.95 },
    { id: 'w3', style: 'whisper', text: 'And he wants it BACK.', t0: 10.0, t1: 13.65 },
    { id: 'd1', style: 'dlg', text: 'Velvet… I must confess something.', t0: 26.7, t1: 30.3 },
    { id: 'd2', style: 'dlg', text: 'You have been strange since Tuesday.', t0: 31.0, t1: 34.6 },
    { id: 'd3', style: 'dlg', text: 'I have a twin brother.', t0: 34.9, t1: 38.6 },
    { id: 'd4', style: 'dlg', text: 'No… Remy… no…', t0: 39.0, t1: 41.95, minHold: 2.35 },
    { id: 'd5', style: 'dlg', text: 'Hello, brother.', t0: 44.3, t1: 47.95 },
    { id: 'd6', style: 'dlg', text: 'You destroyed my salon, Baldwin!', t0: 51.85, t1: 55.45 },
    { id: 'd7', style: 'dlg', text: 'I came for what is mine.', t0: 56.5, t1: 59.95, minHold: 2.85 },
    { id: 'd8', style: 'dlg', text: 'The transplant rejected him.', t0: 61.1, t1: 64.75 },
    { id: 'd9', style: 'dlg', text: 'That was never hair. It was his toupee.', t0: 66.0, t1: 69.8 },
    { id: 'tbc', style: 'tbc', text: 'TO BE CONTINUED…', t0: 74.7, t1: 78.0 },
  ],
  captionStyles: () => ({
    prev: { font: SER, size: 58, weight: '600', color: '#e9d8b8', align: 'center', x: 960, y: 520, lineHeight: 1.3, anim: 'fade', in: 0.3, out: 0.2, track: 6, shadow: 'rgba(0,0,0,0.85)', glow: '#3a1018', glowBlur: 26 },
    whisper: { font: SER, size: 46, weight: 'italic 600', color: '#e9dfe8', align: 'center', x: 960, y: 912, lineHeight: 1.3, anim: 'fade', in: 0.35, out: 0.25, track: 2, shadow: 'rgba(0,0,0,0.9)' },
    dlg: { font: SER, size: 50, weight: 'italic 600', color: '#f6e8c2', align: 'center', x: 960, y: 924, lineHeight: 1.3, anim: 'rise', in: 0.3, out: 0.25, rise: 14, track: 1, shadow: 'rgba(0,0,0,0.92)', glow: '#241028', glowBlur: 18 },
    tbc: { font: SER, size: 128, weight: '700', color: '#f3e6c8', align: 'center', x: 960, y: 545, lineHeight: 1.2, anim: 'cut', in: 0, out: 0.25, track: 8, shadow: 'rgba(0,0,0,0.8)', glow: '#7a1020', glowBlur: 34 },
  }),
  score,
  audio: { seed: 77, reverb: 2.2, reverbGain: 0.3 },
  lint: { safe: { margin: 0.04 } },
}
