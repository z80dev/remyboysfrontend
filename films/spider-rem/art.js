// SPIDER-REM — comic art library. Bakes happen once in prepare(); painters are pure in t.
// Comic language: fat ink outlines, flat 2-tone faces, Ben-Day dots, starbursts, gold strands.
import { hash, lerp, seg, clamp, E } from 'filmkit/lib.js'

// ---- world geometry -------------------------------------------------------------------------------
export const OVER_X = 540, OVER_Y = 220
export const AW = 1920 + 2 * OVER_X   // 3000
export const AH = 1080 + 2 * OVER_Y  // 1520

// ---- palette ---------------------------------------------------------------------------------------
export const PAL = {
  ink: '#191423',
  paper: '#f4eeda', paperWarm: '#ffe9ad',
  gold: '#e8cf7e', goldHi: '#fff3c4', goldDeep: '#b98a2e', strandHi: '#f4dfa0', strandBase: '#6a4a22',
  red: '#e04a3a', redDeep: '#a52a22', orange: '#ffb03a',
  white: '#ffffff',
  // day city
  day: {
    skyStops: [[0, '#4a90c8'], [0.45, '#7ab8e0'], [0.78, '#b8ddf0'], [1, '#e8f6f8']],
    sun: null, far: '#a8c4d8', mid: '#7c9cb8', near: '#48688c', nearLit: '#5e80a6',
    winLit: '#dceaf2', winDim: '#33475e', litT: 0.9, street: '#2a3448', groundLine: '#1a2334',
    cloud: '#ffffff', haze: '#d8ecf4',
  },
  // sunset city (sun side LEFT everywhere)
  sun: {
    skyStops: [[0, '#2a1a4a'], [0.35, '#6a3060'], [0.62, '#c85848'], [0.82, '#f0925a'], [1, '#ffcf8a']],
    sun: { x: 460, y: 300, r: 120, core: '#fff3c4', halo: '#ffcf8a' },
    far: '#6a4470', mid: '#482e54', near: '#241830', nearLit: '#40284a',
    winLit: '#ffd9a0', winDim: '#241a30', litT: 0.78, street: '#181022', groundLine: '#0e0816',
    cloud: '#e8a888', haze: '#b06878',
  },
}
// goblin greens (engine glow, labels)
export const GOB = { glow: '#d8e44a', hull: '#f2ece2', belly: '#241830', label: '#ffdf6a' }

// ---- Ben-Day / halftone ----------------------------------------------------------------------------
// Small tile canvases; live frames use createPattern('repeat') with globalAlpha/multiply.
export function benTile(pitch, col, rMax) {
  const c = document.createElement('canvas')
  c.width = c.height = pitch * 2 // hex-staggered needs a 2-row tile
  const x = c.getContext('2d')
  x.fillStyle = 'rgba(0,0,0,0)'
  for (const [cx, cy] of [[pitch * 0.25, pitch * 0.25], [pitch * 0.75, pitch * 0.75]]) {
    x.beginPath(); x.arc(cx, cy, rMax, 0, 7); x.fillStyle = col; x.fill()
  }
  return c
}
// seeded dot field inside a rect (panel shading / photo halftone); edges fade out so the
// patch never reads as a hard texture rectangle
export function halftone(x, px, py, pw, ph, pitch, col, dens, seed) {
  x.save(); x.beginPath(); x.rect(px, py, pw, ph); x.clip()
  const rows = Math.ceil(ph / pitch), cols = Math.ceil(pw / pitch)
  const fade = (cx, cy) => {
    const dEdge = Math.min(cx - px, px + pw - cx, cy - py, py + ph - cy)
    return dEdge > 26 ? 1 : Math.max(0, dEdge / 26)
  }
  x.fillStyle = col
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c <= cols; c++) {
      const h1 = hash((r + seed) * 7349 + c * 92821 + seed * 1013)
      const cx = px + c * pitch + (r & 1 ? pitch / 2 : 0), cy = py + r * pitch
      if (h1 > dens * fade(cx, cy)) continue
      x.beginPath(); x.arc(cx, cy, pitch * (0.24 + 0.2 * hash(h1 * 991)), 0, 7); x.fill()
    }
  x.restore()
}

// ---- bakes -----------------------------------------------------------------------------------------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
export function skyBake(pal) {
  const w = 400, h = 360 // small: it sits far back and gets scaled — dither at bake rez
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const x = c.getContext('2d')
  const img = x.createImageData(w, h), d = img.data
  const stops = pal.skyStops.map(([p, hex]) => [p, [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]])
  const bands = 16
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1), q = v * bands, b0 = Math.floor(q), f = q - b0
    for (let px = 0; px < w; px++) {
      const pick = f * 16 > BAYER[(y & 3) * 4 + (px & 3)] ? b0 + 1 : b0
      const p = Math.min(1, pick / bands)
      let k = 0
      while (k < stops.length - 2 && p > stops[k + 1][0]) k++
      const [pa, ca] = stops[k], [pb, cb] = stops[k + 1], u = clamp((p - pa) / (pb - pa))
      const i = (y * w + px) * 4
      d[i] = lerp(ca[0], cb[0], u); d[i + 1] = lerp(ca[1], cb[1], u); d[i + 2] = lerp(ca[2], cb[2], u); d[i + 3] = 255
    }
  }
  x.putImageData(img, 0, 0)
  // sun + halo (sunset only) — bake coords land the sun at world (s.x, ~s.y) after the
  // drawImage scale (x: AW/400 ≈ 7.5, y: (900+OVER_Y)/360 ≈ 3.1)
  if (pal.sun) {
    const s = pal.sun
    const sx = s.x / 7.5, sy = s.y / 3.1
    const g = x.createRadialGradient(sx, sy, 4, sx, sy, 74)
    g.addColorStop(0, 'rgba(255,236,180,0.95)'); g.addColorStop(0.5, 'rgba(255,190,120,0.5)'); g.addColorStop(1, 'rgba(255,160,100,0)')
    x.fillStyle = g; x.fillRect(0, 0, w, h)
    x.beginPath(); x.arc(sx, sy, 27, 0, 7); x.fillStyle = s.core; x.fill()
    x.lineWidth = 2; x.strokeStyle = 'rgba(255,240,200,0.9)'; x.stroke()
  }
  // seeded cloud streaks
  for (let i = 0; i < 9; i++) {
    const cy = 30 + hash(i * 31 + 7) * 180, cw = 40 + hash(i * 17 + 3) * 90, ch = 4 + hash(i * 13 + 1) * 7
    const cx = hash(i * 47 + 11) * w
    x.globalAlpha = 0.5 + hash(i * 7) * 0.4
    x.fillStyle = pal.cloud
    x.beginPath(); x.ellipse(cx, cy, cw, ch, 0, 0, 7); x.fill()
    x.beginPath(); x.ellipse(cx + cw * 0.4, cy - ch * 0.7, cw * 0.55, ch * 0.7, 0, 0, 7); x.fill()
  }
  x.globalAlpha = 1
  return c
}

// radial manga rays, centre kept clear — stamped behind titles / flow-sense
export function raysBake(tint, seed, n = 130) {
  const w = 1400, h = 1400
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const x = c.getContext('2d')
  x.translate(w / 2, h / 2)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(seed * 31 + i) * 0.06
    const inner = 300 + hash(seed * 17 + i) * 90
    const outer = inner + 180 + hash(seed * 7 + i) * 320
    x.beginPath()
    x.moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
    x.lineTo(Math.cos(a + 0.012) * inner, Math.sin(a + 0.012) * inner)
    x.lineTo(Math.cos(a + 0.02) * outer, Math.sin(a + 0.02) * outer)
    x.closePath()
    x.globalAlpha = 0.16 + hash(seed + i) * 0.4
    x.fillStyle = tint; x.fill()
  }
  return c
}

// warm paper with a light Ben-Day tint + fibre flecks — comic page ground
export function paperBake() {
  const w = 960, h = 540
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const x = c.getContext('2d')
  x.fillStyle = PAL.paper; x.fillRect(0, 0, w, h)
  halftone(x, 0, 0, w, h, 14, 'rgba(214,180,120,0.10)', 0.8, 5)
  for (let i = 0; i < 260; i++) {
    x.globalAlpha = 0.05 + hash(i * 3) * 0.05
    x.fillStyle = hash(i) > 0.5 ? '#c8b890' : '#ffffff'
    x.fillRect(hash(i * 7) * w, hash(i * 13) * h, 1.5, 1.5)
  }
  x.globalAlpha = 1
  return c
}

// museum facade, baked (text drawn live over it)
export function museumBake() {
  const w = 2200, h = 1240
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const x = c.getContext('2d')
  x.drawImage(skyBake(PAL.day), 0, -60, w, 900)
  // plaza + steps
  x.fillStyle = '#b8ac94'; x.fillRect(0, 850, w, h - 850)
  for (let s = 0; s < 5; s++) {
    const y = 880 + s * 46, inset = 90 + s * 120
    x.fillStyle = s & 1 ? '#c8bca4' : '#d4c8b0'; x.fillRect(inset, y, w - inset * 2, 46)
    x.fillStyle = 'rgba(25,20,35,0.16)'; x.fillRect(inset, y + 40, w - inset * 2, 6)
  }
  x.fillStyle = PAL.ink; x.fillRect(0, 1102, w, 10)
  // facade block
  const fx = 380, fw = w - 760, fy = 330, fh = 560
  x.fillStyle = '#e8dcc4'; x.fillRect(fx, fy, fw, fh)
  x.lineWidth = 8; x.strokeStyle = PAL.ink; x.strokeRect(fx, fy, fw, fh)
  // pediment
  x.beginPath(); x.moveTo(fx - 30, fy); x.lineTo(fx + fw / 2, fy - 170); x.lineTo(fx + fw + 30, fy); x.closePath()
  x.fillStyle = '#e2d4b8'; x.fill(); x.stroke()
  x.fillStyle = PAL.goldDeep
  x.beginPath(); x.moveTo(fx + fw / 2, fy - 128); x.lineTo(fx + fw / 2 + 60, fy - 52); x.lineTo(fx + fw / 2 - 60, fy - 52); x.closePath(); x.fill()
  // columns
  for (let i = 0; i < 6; i++) {
    const cx = fx + 70 + i * ((fw - 140) / 5)
    x.fillStyle = '#f2e8d4'; x.fillRect(cx - 34, fy + 30, 68, fh - 60)
    x.fillStyle = 'rgba(25,20,35,0.12)'; x.fillRect(cx + 18, fy + 30, 16, fh - 60)
    x.strokeStyle = PAL.ink; x.lineWidth = 6; x.strokeRect(cx - 34, fy + 30, 68, fh - 60)
    x.fillStyle = PAL.ink; x.fillRect(cx - 42, fy + 18, 84, 14); x.fillRect(cx - 42, fy + fh - 34, 84, 16)
  }
  // doors + windows between columns
  for (let i = 0; i < 5; i++) {
    const dx = fx + 70 + 68 + i * ((fw - 140) / 5) - 4
    if (i === 2) { x.fillStyle = '#4a3020'; x.fillRect(dx - 6, fy + 250, 96, 300); x.strokeStyle = PAL.ink; x.lineWidth = 5; x.strokeRect(dx - 6, fy + 250, 96, 300) }
    else { x.fillStyle = '#9cc4d8'; x.fillRect(dx, fy + 120, 78, 130); x.strokeStyle = PAL.ink; x.lineWidth = 4; x.strokeRect(dx, fy + 120, 78, 130); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(dx + 8, fy + 128, 18, 114) }
  }
  // marquee sign box (text live)
  x.fillStyle = '#22284a'; x.fillRect(fx + 130, fy + 60, fw - 260, 88)
  x.strokeStyle = PAL.gold; x.lineWidth = 6; x.strokeRect(fx + 130, fy + 60, fw - 260, 88)
  // lamp globes along the step edges
  for (let i = 0; i < 10; i++) {
    const lx = 180 + i * 205
    x.fillStyle = PAL.ink; x.fillRect(lx - 3, 1010, 6, 46)
    x.beginPath(); x.arc(lx, 1000, 12, 0, 7); x.fillStyle = '#fff3c4'; x.fill(); x.stroke()
  }
  return c
}

// ---- city (per-frame, deterministic; parallax via per-layer offset) --------------------------------
// L: { p, seed, topMin, topMax, tone, lit, win } — buildings from a seeded table.
export const CITY_LAYERS = [
  { p: 0.12, seed: 11, topMin: 330, topMax: 520, hMin: 240, hMax: 560, win: 0 },
  { p: 0.32, seed: 22, topMin: 430, topMax: 640, hMin: 320, hMax: 640, win: 0.5 },
  { p: 0.64, seed: 33, topMin: 540, topMax: 840, hMin: 300, hMax: 540, win: 1 },
]
export function cityLayer(x, L, pal, cam, zoom, t, opts = {}) {
  const off = (cam.x - 960) * (1 - L.p)
  const offY = (cam.y - 540) * (1 - L.p) * 0.55
  const half = 960 / zoom + 80
  const x0 = Math.floor((cam.x - half - off - 200) / 150), x1 = Math.ceil((cam.x + half - off + 200) / 150)
  const ground = 1100
  for (let i = x0; i <= x1; i++) {
    const bx = i * 150 + hash(L.seed * 101 + i) * 70 - 75
    const bw = 96 + hash(L.seed * 17 + i * 3) * 92
    const top = lerp(L.topMin, L.topMax, hash(L.seed * 29 + i * 7)) + offY
    const bh = ground - top
    if (bh < 40) continue
    const w = Math.round(bx + off)
    // body
    x.fillStyle = L.win === 1 ? pal.near : L.win === 0.5 ? pal.mid : pal.far
    x.fillRect(w, top, bw, bh)
    // sun-side lit strip (LEFT — locked)
    if (L.win >= 0.5) { x.fillStyle = L.win === 1 ? pal.nearLit : pal.far; x.fillRect(w, top, 10, bh) }
    // ink outline (comic)
    x.lineWidth = L.win === 1 ? 5 : 3.5
    x.strokeStyle = PAL.ink; x.strokeRect(w + 0.5, top + 0.5, bw - 1, bh - 1)
    // windows
    if (L.win > 0) {
      const cols = Math.floor((bw - 16) / 24), rows = Math.floor((bh - 20) / 32)
      for (let r = 0; r < rows; r++)
        for (let cc = 0; cc < cols; cc++) {
          const lit = hash(i * 97 + cc * 13 + r * 7 + L.seed) > (pal.litT ?? 0.78)
          x.fillStyle = lit ? pal.winLit : pal.winDim
          x.fillRect(w + 10 + cc * 24, top + 14 + r * 32, 13, 17)
        }
    }
    // rooftop props on the near layer
    if (L.win === 1 && !opts.noProps) {
      const hp = hash(L.seed * 53 + i * 11)
      if (hp > 0.74) { // water tower
        const tw = 34, tx = w + bw / 2 - tw / 2, ty = top - 44
        x.fillStyle = '#3a2430'; x.fillRect(tx, ty, tw, 34)
        x.beginPath(); x.moveTo(tx - 4, ty); x.lineTo(tx + tw / 2, ty - 16); x.lineTo(tx + tw + 4, ty); x.closePath()
        x.fillStyle = '#2a1622'; x.fill()
        x.strokeStyle = PAL.ink; x.lineWidth = 3; x.strokeRect(tx, ty, tw, 34)
        x.fillStyle = PAL.ink; x.fillRect(tx + 3, ty + 34, 4, 12); x.fillRect(tx + tw - 7, ty + 34, 4, 12)
      } else if (hp > 0.6) { // antenna mast
        const ax2 = w + bw / 2
        x.strokeStyle = PAL.ink; x.lineWidth = 3
        x.beginPath(); x.moveTo(ax2, top); x.lineTo(ax2, top - 52); x.moveTo(ax2 - 12, top - 36); x.lineTo(ax2 + 12, top - 36); x.stroke()
        if (pal.sun && (t * 0.7) % 1 < 0.5) { x.fillStyle = PAL.goldHi; x.beginPath(); x.arc(ax2, top - 52, 3.5, 0, 7); x.fill() }
      }
    }
  }
}
export function cityGround(x, pal, cam, zoom) {
  const off = (cam.x - 960) * 0.1
  x.fillStyle = pal.street
  x.fillRect(-1600, 1100, AW + 3200, AH - 1100 + OVER_Y)
  x.fillStyle = pal.groundLine; x.fillRect(-1600, 1100, AW + 3200, 8)
  // street lamps (sun-left lit) every 260 world px
  const half = 960 / zoom + 100
  const i0 = Math.floor((cam.x - half - off) / 260), i1 = Math.ceil((cam.x + half - off) / 260)
  for (let i = i0; i <= i1; i++) {
    const lx = Math.round(i * 260 + off + hash(i * 31) * 60)
    x.strokeStyle = PAL.ink; x.lineWidth = 5
    x.beginPath(); x.moveTo(lx, 1100); x.lineTo(lx, 980); x.lineTo(lx - 22, 980); x.stroke()
    if (pal.sun) { x.fillStyle = 'rgba(255,220,150,0.85)'; x.beginPath(); x.arc(lx - 26, 984, 7, 0, 7); x.fill() }
  }
}
// foreground silhouette drawn POST-blit on the shot ctx (deepest parallax) — an EDGE only:
// a dark slab hugging the left frame border + a water tower poking in, never mid-frame
export function fgSil(ctx, cam, pal, seed = 9) {
  const off = -(cam.x - 960) * 0.38
  ctx.save()
  ctx.fillStyle = pal.sun ? '#0e081a' : '#1c2a44'
  const bx = -300 + off
  ctx.fillRect(bx, -40, 330, 1160)
  ctx.fillRect(bx + 60, 140, 40, 40) // window hole
  ctx.fillRect(bx + 180, -160, 150, 130) // water tower cresting the top-left corner
  ctx.beginPath(); ctx.moveTo(bx + 170, -160); ctx.lineTo(bx + 255, -230); ctx.lineTo(bx + 340, -160); ctx.closePath(); ctx.fill()
  ctx.restore()
}

// ---- gold hair strands ------------------------------------------------------------------------------
export function strand(x, ax, ay, hx, hy, sag, opts = {}) {
  const mx = (ax + hx) / 2, my = Math.max(ay, hy) + sag
  const lw = opts.lw ?? 7
  for (const [col, w] of [[PAL.strandBase, lw], [opts.hi ?? PAL.strandHi, Math.max(2, lw * 0.42)]]) {
    x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'
    x.beginPath(); x.moveTo(ax, ay); x.quadraticCurveTo(mx, my, hx, hy); x.stroke()
  }
  if (opts.nub !== false) { // anchor nub — a T-bar the strand is tied to
    x.strokeStyle = PAL.ink; x.lineWidth = 5; x.lineCap = 'round'
    x.beginPath(); x.moveTo(ax - 12, ay); x.lineTo(ax + 12, ay); x.stroke()
  }
}
// lively scalp strands (the hero's "flow-sense" hair) — k strands from a head point
export function scalpStrands(x, cx, cy, dir, t, k = 3, len = 26, aim = null) {
  for (let i = 0; i < k; i++) {
    const sway = aim ? 0 : Math.sin(t * 3.1 + i * 1.7) * 0.22
    const baseA = aim ? Math.atan2(aim.y - cy, aim.x - cx) : -Math.PI / 2 + (i - (k - 1) / 2) * 0.5 + sway
    const l = len * (0.7 + 0.3 * (1 + Math.sin(t * 2.2 + i)) / 2)
    x.strokeStyle = i & 1 ? PAL.gold : PAL.strandHi; x.lineWidth = 3.5; x.lineCap = 'round'
    x.beginPath(); x.moveTo(cx + dir * i * 3, cy)
    x.quadraticCurveTo(cx + Math.cos(baseA) * l * 0.6 + dir * 4, cy + Math.sin(baseA) * l * 0.6,
      cx + Math.cos(baseA) * l, cy + Math.sin(baseA) * l)
    x.stroke()
  }
}

// ---- comic bursts / onomatopoeia ---------------------------------------------------------------------
export function burst(x, cx, cy, r1, r2, n, seed, fill = '#ffd23f', stroke = '#191423') {
  x.beginPath()
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + (hash(seed * 31 + i) - 0.5) * 0.18
    const r = (i % 2 ? r2 : r1) * (0.85 + hash(seed * 17 + i) * 0.3)
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r
    i ? x.lineTo(px, py) : x.moveTo(px, py)
  }
  x.closePath(); x.fillStyle = fill; x.fill()
  x.lineWidth = 5; x.strokeStyle = stroke; x.lineJoin = 'round'; x.stroke()
}
export const ONO_STYLE = {
  gold:  { fill: '#ffd23f', stroke: '#191423', burst: '#e8cf7e', bstroke: '#191423' },
  snap:  { fill: '#ffffff', stroke: '#191423', burst: '#ff5d4e', bstroke: '#191423' },
  wham:  { fill: '#ff5d4e', stroke: '#191423', burst: '#ffb03a', bstroke: '#191423' },
  flake: { fill: '#ffffff', stroke: '#5a6472', burst: '#dedacb', bstroke: '#5a6472' },
}

// ---- the radioactive hair louse ----------------------------------------------------------------------
export function drawLouse(x, cx, cy, s, ph, o = {}) {
  const dir = o.dir ?? 1
  x.save(); x.translate(cx, cy); if (o.rot) x.rotate(o.rot); x.scale(s * dir, s)
  if (o.glow) { x.shadowColor = o.glow; x.shadowBlur = 14 }
  // legs (3 per side, phased)
  x.strokeStyle = '#4a2c18'; x.lineWidth = 2.4; x.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    const wig = Math.sin(ph * 9 + i * 2.1) * 0.28
    for (const side of [-1, 1]) {
      const bx = -6 + i * 6, by = side * 6
      const a1 = side * (0.9 + i * 0.12) + wig * side
      const kx = bx + Math.cos(a1) * 8, ky = by + Math.sin(a1) * 8
      const a2 = a1 + side * (o.salute && i === 0 && side === -1 ? -2.2 : 0.7)
      x.beginPath(); x.moveTo(bx, by); x.lineTo(kx, ky)
      x.lineTo(kx + Math.cos(a2) * 8, ky + Math.sin(a2) * 8); x.stroke()
    }
  }
  // body
  x.shadowBlur = 0
  x.beginPath(); x.ellipse(0, 0, 15, 10.5, 0, 0, 7)
  x.fillStyle = o.glow ? '#8a6a3a' : '#7a4a2a'; x.fill()
  x.lineWidth = 2.6; x.strokeStyle = PAL.ink; x.stroke()
  x.beginPath(); x.ellipse(-2, 2, 9, 5.5, 0, 0, 7); x.fillStyle = '#a87848'; x.fill() // belly
  // segmentation
  x.strokeStyle = 'rgba(25,20,35,0.5)'; x.lineWidth = 1.6
  for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(i * 6, -9); x.quadraticCurveTo(i * 6 + 2, 0, i * 6, 9); x.stroke() }
  // head + eye + antennae
  x.beginPath(); x.arc(13, -1, 5.6, 0, 7); x.fillStyle = '#5a3420'; x.fill(); x.lineWidth = 2.2; x.strokeStyle = PAL.ink; x.stroke()
  x.fillStyle = PAL.ink; x.beginPath(); x.arc(14.6, -2.6, 1.3, 0, 7); x.fill()
  x.strokeStyle = '#4a2c18'; x.lineWidth = 1.8
  for (const aa of [-0.5, 0.15]) {
    x.beginPath(); x.moveTo(16, -3)
    x.quadraticCurveTo(22, -8 + aa * 6, 26 + Math.sin(ph * 6) * 1.5, -10 + aa * 10); x.stroke()
  }
  if (o.salute) { // twinkle at the raised foreleg
    burst(x, -14, -18, 3, 7, 5, 77, PAL.goldHi, PAL.goldDeep)
  }
  x.restore()
}

// ---- the Dandruff Goblin's flake-glider ---------------------------------------------------------------
export function drawGlider(x, cx, cy, rot, t, o = {}) {
  x.save(); x.translate(cx, cy); x.rotate(rot)
  const s = o.s ?? 1; x.scale(s, s)
  if (o.sil) x.globalAlpha = 0.92
  // engine glow under the hull
  const pulse = 0.6 + 0.4 * Math.sin(t * 26)
  x.fillStyle = `rgba(216,228,74,${0.35 * pulse})`
  x.beginPath(); x.ellipse(-8, 14, 66, 12, 0, 0, 7); x.fill()
  x.fillStyle = `rgba(255,244,180,${0.5 * pulse})`
  x.beginPath(); x.ellipse(-8, 11, 44, 6, 0, 0, 7); x.fill()
  // hull plank
  x.beginPath()
  x.moveTo(-88, -2); x.quadraticCurveTo(0, -14, 96, -10)
  x.quadraticCurveTo(104, -8, 100, 2); x.quadraticCurveTo(0, 16, -84, 8)
  x.closePath()
  x.fillStyle = o.sil ? '#c8c2b4' : GOB.hull; x.fill()
  x.lineWidth = 5; x.strokeStyle = PAL.ink; x.stroke()
  // purple belly stripe
  x.beginPath(); x.moveTo(-84, 4); x.quadraticCurveTo(0, 15, 98, 0); x.quadraticCurveTo(0, 20, -84, 4)
  x.closePath(); x.fillStyle = o.sil ? '#8a8478' : GOB.belly; x.fill()
  // nose + tail fins
  x.beginPath(); x.moveTo(88, -10); x.lineTo(108, -26); x.lineTo(96, -4); x.closePath()
  x.fillStyle = o.sil ? '#8a8478' : GOB.belly; x.fill(); x.stroke()
  x.beginPath(); x.moveTo(-86, -2); x.lineTo(-102, -16); x.lineTo(-78, 4); x.closePath(); x.fill(); x.stroke()
  // "POWDER FRESH" label
  if (!o.sil) {
    x.save(); x.rotate(-0.06)
    x.fillStyle = GOB.label; x.fillRect(-30, -8, 58, 9)
    x.fillStyle = PAL.ink; x.font = '700 7px "JetBrains Mono", monospace'; x.textAlign = 'center'
    x.fillText('POWDER FRESH', -1, -1)
    x.restore()
  }
  x.restore()
}
// dandruff dust trail behind the glider (analytic, seeded)
export function gliderDust(x, cx, cy, t, seed = 4) {
  for (let i = 0; i < 7; i++) {
    const age = ((t * 0.6 + hash(seed + i * 13)) % 1)
    const dx = -70 - age * 90, dy = (hash(seed * 7 + i) - 0.5) * 26 - age * 10
    x.globalAlpha = (1 - age) * 0.65
    x.fillStyle = '#f4f0e4'
    x.beginPath(); x.arc(cx + dx, cy + dy, 3.4 + hash(i * 31 + seed) * 3.6, 0, 7); x.fill()
  }
  x.globalAlpha = 1
}

// ---- flake bomb -----------------------------------------------------------------------------------------
export function drawBomb(x, cx, cy, rot, o = {}) {
  x.save(); x.translate(cx, cy); x.rotate(rot)
  x.beginPath(); x.arc(-9, 2, 11, 0, 7); x.arc(8, -3, 13, 0, 7); x.arc(4, 9, 8, 0, 7)
  x.fillStyle = o.sil ? '#c8c2b4' : '#f6f2e8'; x.fill()
  x.lineWidth = 4; x.strokeStyle = o.sil ? '#8a8478' : '#5a6472'; x.lineJoin = 'round'; x.stroke()
  x.beginPath(); x.arc(4, -7, 3, 0, 7); x.fillStyle = '#ffffff'; x.fill()
  if (!o.sil) {
    x.fillStyle = GOB.label; x.fillRect(-4, -2, 16, 7)
    x.fillStyle = PAL.ink; x.font = '700 5px "JetBrains Mono", monospace'; x.textAlign = 'center'
    x.fillText('FRESH', 4, 4)
    // fuse spark
    burst(x, 16, -10, 2, 5, 4, 91, PAL.goldHi, PAL.goldDeep)
  }
  x.restore()
}
export function powderPuff(x, cx, cy, r, alpha) {
  x.save(); x.globalAlpha = alpha
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2
    x.beginPath(); x.arc(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.55, r * 0.5, 0, 7)
    x.fillStyle = '#f6f2e8'; x.fill()
  }
  x.globalAlpha = alpha * 0.8; x.fillStyle = '#ffffff'
  x.beginPath(); x.arc(cx, cy, r * 0.55, 0, 7); x.fill()
  x.restore()
}

// ---- cocoon (the wrapped goblin) --------------------------------------------------------------------------
export function drawCocoon(x, cx, cy, w, o = {}) {
  // w: completeness 0..1; villain white silhouette behind the rings; dangle sway via o.rot
  x.save(); x.translate(cx, cy); if (o.rot) x.rotate(o.rot)
  const squash = o.boing ? 1 + 0.18 * Math.sin((o.boing) * 18) * Math.exp(-o.boing * 6) : 1
  x.scale(1 / squash, squash)
  if (o.vil) { x.globalAlpha = 0.55; x.drawImage(o.vil, -o.vil.width * 0.35, -o.vil.height * 0.42, o.vil.width * 0.7, o.vil.height * 0.84); x.globalAlpha = 1 }
  x.beginPath(); x.ellipse(0, 0, 36, 54, 0, 0, 7)
  x.fillStyle = '#f4f0e4'; x.fill(); x.lineWidth = 5; x.strokeStyle = PAL.ink; x.stroke()
  const rings = Math.max(1, Math.round(w * 6))
  for (let i = 0; i < rings; i++) {
    const ry = -30 + (i + 0.5) * (74 / Math.max(1, Math.round(w * 6)))
    const rw = 36 * Math.sqrt(Math.max(0.05, 1 - (ry / 54) ** 2))
    x.strokeStyle = i & 1 ? PAL.gold : '#ffffff'; x.lineWidth = 6
    x.beginPath(); x.ellipse(0, ry, rw, 7, 0.15, 0, 7); x.stroke()
  }
  // the scowl peeks out of the top gap — clearly bald, clearly furious
  x.fillStyle = '#c0aa98'
  x.beginPath(); x.arc(0, -46, 17, Math.PI, 0); x.fill()
  x.lineTo(17, -38); x.lineTo(-17, -38); x.closePath(); x.fill()
  x.lineWidth = 3.5; x.strokeStyle = PAL.ink; x.stroke()
  x.fillStyle = PAL.ink
  x.fillRect(-11, -50, 8, 3.4); x.fillRect(3, -50, 8, 3.4) // slanted angry brows
  x.save(); x.translate(-7, -42); x.rotate(0.35); x.fillRect(-2.6, 0, 5.2, 3); x.restore()
  x.save(); x.translate(7, -42); x.rotate(-0.35); x.fillRect(-2.6, 0, 5.2, 3); x.restore()
  x.restore()
}

// ---- world props ----------------------------------------------------------------------------------------
// construction scaffold centred x 1620, platforms y 300/480/660, collapses from g 44.6
export function drawScaffold(x, g) {
  const tilt = 0.55 * E.inQuad(seg(g, 44.6, 45.6))
  x.save(); x.translate(1620, 1090); x.rotate(tilt)
  x.strokeStyle = '#8a6a4a'; x.lineWidth = 7; x.lineCap = 'round'
  for (const sx of [-115, 115]) {
    x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx, -790); x.stroke()
    for (let ry = -60; ry > -780; ry -= 60) { x.beginPath(); x.moveTo(sx - 3, ry); x.lineTo(sx + 3, ry); x.stroke() }
  }
  x.strokeStyle = 'rgba(25,20,35,0.45)'; x.lineWidth = 4
  for (const py of [-790, -430]) {
    x.beginPath(); x.moveTo(-115, py); x.lineTo(115, py - 90); x.moveTo(115, py); x.lineTo(-115, py - 90); x.stroke()
  }
  x.fillStyle = '#b89058'; x.strokeStyle = PAL.ink; x.lineWidth = 3
  for (const py of [-790, -610, -430]) { x.fillRect(-130, py - 9, 260, 11); x.strokeRect(-130, py - 9, 260, 11) }
  x.restore()
  // the falling plank (separate ballistic tumble)
  const pu = seg(g, 45.0, 46.4)
  if (pu > 0 && pu < 1) {
    x.save(); x.translate(lerp(1600, 1500, pu), lerp(290, 1080, pu * pu)); x.rotate(pu * 2.4)
    x.fillStyle = '#b89058'; x.fillRect(-70, -6, 140, 12); x.strokeStyle = PAL.ink; x.lineWidth = 3; x.strokeRect(-70, -6, 140, 12)
    x.restore()
  }
}
// the balcony where civilian 24 is set down (building face x 1240..1600)
export function drawBalcony(x) {
  x.fillStyle = '#3a2838'; x.fillRect(1240, 560, 360, 620)
  x.strokeStyle = PAL.ink; x.lineWidth = 5; x.strokeRect(1240, 560, 360, 620)
  x.fillStyle = PAL.sun.winDim
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) x.fillRect(1270 + c * 110, 600 + r * 110, 70, 62)
  x.fillStyle = '#4a3448'; x.fillRect(1230, 812, 260, 14)
  x.strokeStyle = PAL.ink; x.lineWidth = 4; x.strokeRect(1230, 812, 260, 14)
  for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(1240 + i * 48, 812); x.lineTo(1240 + i * 48, 776); x.stroke() }
  x.beginPath(); x.moveTo(1230, 776); x.lineTo(1490, 776); x.stroke()
}
// hero landing roof (leg C) + wrap perch: flat roofs at fixed world coords
export function drawTower(x, x0, w, top, label) {
  x.fillStyle = '#3a2838'; x.fillRect(x0, top, w, 1100 - top)
  x.strokeStyle = PAL.ink; x.lineWidth = 6; x.strokeRect(x0, top, w, 1100 - top)
  x.fillStyle = '#4e3a50'; x.fillRect(x0 - 8, top - 14, w + 16, 16) // parapet
  x.strokeStyle = PAL.ink; x.lineWidth = 4; x.strokeRect(x0 - 8, top - 14, w + 16, 16)
  x.fillStyle = PAL.sun.winDim
  const cols = Math.floor(w / 90), rows = Math.floor((1100 - top) / 120)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    x.fillRect(x0 + 26 + c * 90, top + 30 + r * 120, 44, 54)
    if (hash(x0 + r * 13 + c * 7) > 0.86) { x.fillStyle = PAL.sun.winLit; x.fillRect(x0 + 26 + c * 90, top + 30 + r * 120, 44, 54); x.fillStyle = PAL.sun.winDim }
  }
  if (label) {
    x.fillStyle = PAL.gold; x.font = '700 26px "JetBrains Mono", monospace'; x.textAlign = 'center'
    x.fillText(label, x0 + w / 2, top + 330)
  }
}
export function drawAntenna(x, ax, topY) {
  x.strokeStyle = PAL.ink; x.lineWidth = 6
  x.beginPath(); x.moveTo(ax, topY); x.lineTo(ax, topY - 74); x.stroke()
  x.lineWidth = 4
  x.beginPath(); x.moveTo(ax - 18, topY - 52); x.lineTo(ax + 18, topY - 52); x.moveTo(ax - 12, topY - 64); x.lineTo(ax + 12, topY - 64); x.stroke()
  x.fillStyle = PAL.goldHi; x.beginPath(); x.arc(ax, topY - 74, 5, 0, 7); x.fill()
  x.strokeStyle = PAL.ink; x.lineWidth = 2.5; x.stroke()
}
// laundry lines + sagging awning (flakeBombs street life)
export function drawLaundry(x, t) {
  x.strokeStyle = 'rgba(25,20,35,0.8)'; x.lineWidth = 3
  for (const [x0, x1, y] of [[920, 1280, 560], [1360, 1720, 600]]) {
    x.beginPath(); x.moveTo(x0, y); x.quadraticCurveTo((x0 + x1) / 2, y + 46, x1, y); x.stroke()
    for (let i = 0; i < 4; i++) {
      const u = (i + 1) / 5
      const cx = lerp(x0, x1, u), cy = y + 46 * 2 * u * (1 - u) + 4
      const sway = Math.sin(t * 1.4 + i * 1.9 + x0) * 0.1
      x.save(); x.translate(cx, cy); x.rotate(sway)
      x.fillStyle = ['#e8b8b8', '#b8d0e8', '#e8e0b0', '#c8e8c0'][(i + x0) & 3]
      x.fillRect(-16, 0, 32, 40); x.strokeStyle = PAL.ink; x.lineWidth = 2.5; x.strokeRect(-16, 0, 32, 40)
      x.restore()
    }
  }
}
export function drawAwning(x, sag) {
  x.save(); x.translate(1330, 1000)
  x.fillStyle = '#e04a3a'
  x.beginPath(); x.moveTo(0, 0)
  x.quadraticCurveTo(70, 26 + sag * 54, 140, 0)
  x.lineTo(140, -12); x.quadraticCurveTo(70, 14 + sag * 54, 0, -12); x.closePath(); x.fill()
  x.strokeStyle = PAL.ink; x.lineWidth = 4; x.stroke()
  x.fillStyle = '#f4eeda'
  x.beginPath(); x.moveTo(35, -9 + sag * 8); x.quadraticCurveTo(52, 3 + sag * 22, 70, 2 + sag * 26)
  x.lineTo(70, -10 + sag * 10); x.closePath(); x.fill()
  x.fillStyle = '#f4eeda'; x.fillRect(52, -46, 8, 40); x.strokeStyle = PAL.ink; x.strokeRect(52, -46, 8, 40)
  x.restore()
}

// ---- comic panel chrome ------------------------------------------------------------------------------------
export function panelChrome(x, px, py, pw, ph) {
  x.fillStyle = PAL.ink; x.fillRect(px - 10, py - 10, pw + 20, ph + 20)
  x.fillStyle = '#ffffff'; x.fillRect(px - 3, py - 3, pw + 6, ph + 6)
  x.save(); x.beginPath(); x.rect(px, py, pw, ph); x.clip()
}
// goggles + emblem overdrawn on a drawn hero. Pixel-verified anchors for the near sprite
// (top=12, bottom=114, eye row=41, chest row≈63): place() maps image row y to feet+(y-115)*sy.
export function drawGoggles(x, hx, feet, sy, flip) {
  const gy = feet - 74 * sy
  x.save()
  x.strokeStyle = PAL.ink; x.lineWidth = 4 * sy
  x.beginPath(); x.moveTo(hx - 17 * sy, gy); x.lineTo(hx + 17 * sy, gy); x.stroke()
  for (const side of [-1, 1]) {
    x.beginPath(); x.arc(hx + side * 9.5 * sy, gy, 6.5 * sy, 0, 7)
    x.fillStyle = PAL.gold; x.fill(); x.stroke()
    x.fillStyle = PAL.ink
    x.beginPath(); x.arc(hx + side * 9.5 * sy + (flip ? 1 : -1) * 1.8 * sy, gy + 1 * sy, 2.4 * sy, 0, 7); x.fill()
  }
  x.restore()
}
export function drawEmblem(x, hx, feet, sy) {
  const ey = feet - 52 * sy
  x.beginPath(); x.arc(hx, ey, 8 * sy, 0, 7)
  x.fillStyle = PAL.red; x.fill(); x.strokeStyle = PAL.ink; x.lineWidth = 2.5 * sy; x.stroke()
  x.beginPath(); x.arc(hx, ey, 3.4 * sy, 0, 7); x.fillStyle = PAL.goldHi; x.fill()
}
