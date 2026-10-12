// THE HAIRYWEIGHT CHAMPIONSHIP — baked sets, props and atmosphere painters.
// Everything deterministic: hash/rng seeded, no Math.random, every painter pure in t.
// The world is authored on a 2160x1320 canvas with 120 px overscan around the 1920x1080 frame,
// so camera pans, punch-ins and shake never expose an edge. Bakes use real colour ramps
// (outline/shadow/base/light/highlight) plus seeded texture — no flat rect + gradient.
import { hash, rng } from 'filmkit/lib.js'
import { canvas } from '../remy-bros/art.js'

export const OVER = 120
export const AW = 2160, AH = 1320
export const FS = 4 // fighter sprite scale (76x116 near sprite -> 304x464)

// Shared ring geometry (world coords, same domain as stage() in film.js)
export const RING = {
  feet: 884,   // fighters' foot line at centre depth
  backY: 706,  // canvas floor, back edge
  apronY: 952, // canvas floor, front edge
  heroX: 780, champX: 1140, refX: 960,
}

const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

function px(w, h) {
  const c = canvas(w, h)
  const x = c.getContext('2d')
  return { c, x }
}

// Seeded speckle/texture pass over a region.
function speckle(x, x0, y0, w, h, seed, n, col, aMax = 0.14, sMax = 3) {
  for (let i = 0; i < n; i++) {
    const sx = x0 + h2(i, seed, 1) * w, sy = y0 + h2(i, seed, 2) * h
    x.fillStyle = `rgba(${col},${(h2(i, seed, 3) * aMax).toFixed(3)})`
    x.fillRect(Math.floor(sx), Math.floor(sy), 1 + Math.floor(h2(i, seed, 4) * sMax), 1)
  }
}

// Ordered dither between two colours down a vertical span (4x4 Bayer).
function ditherBands(x, x0, y0, w, h, top, bot, bands = 10) {
  for (let yy = 0; yy < h; yy++) {
    const v = yy / (h - 1), q = v * bands, b0 = Math.floor(q), f = q - b0
    const pick = f * 16 > BAYER[(yy & 3) * 4 + ((x0 + yy) & 3)] ? b0 + 1 : b0
    const p = Math.min(1, pick / bands)
    const c = top.map((a, i) => Math.round(a + (bot[i] - a) * p))
    x.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`
    x.fillRect(x0, y0 + yy, w, 1)
  }
}

function ell(x, cx, cy, rx, ry, col, rot = 0) {
  x.fillStyle = col
  x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, 7); x.fill()
}

// Tint everything already painted on a (transparent) bake canvas.
function tintOver(c, col, a) {
  const x = c.getContext('2d')
  x.save()
  x.globalCompositeOperation = 'source-atop'
  x.fillStyle = `rgba(${col},${a})`
  x.fillRect(0, 0, c.width, c.height)
  x.restore()
}

// Additive warm/cool glow (live).
export function warmGlow(x, gx, gy, r, a, col = '255,200,120') {
  x.save()
  x.globalCompositeOperation = 'lighter'
  const g = x.createRadialGradient(gx, gy, 0, gx, gy, r)
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.5, `rgba(${col},${a * 0.32})`); g.addColorStop(1, `rgba(${col},0)`)
  x.fillStyle = g
  x.beginPath(); x.arc(gx, gy, r, 0, 7); x.fill()
  x.restore()
}

// ---------- ARENA BOWL (behind the crowd) -------------------------------------
export function bakeArenaBack() {
  const { c, x } = px(AW, AH)
  x.translate(OVER, OVER)
  // dome: darkest at the top corners, faint warm haze above the ring
  const dome = x.createRadialGradient(1080, 980, 120, 1080, 760, 1500)
  dome.addColorStop(0, '#151b2e'); dome.addColorStop(0.45, '#0d1220'); dome.addColorStop(1, '#05070f')
  x.fillStyle = dome; x.fillRect(-OVER, -OVER, AW, AH)
  ditherBands(x, -OVER, -OVER, AW, 260, [7, 9, 17], [11, 15, 26], 8)
  // roof truss
  x.fillStyle = '#0a0e19'; x.fillRect(-OVER, 64, AW, 10); x.fillRect(-OVER, 96, AW, 6)
  for (let tx = -OVER; tx < AW; tx += 96) { x.fillStyle = '#0b101d'; x.fillRect(tx, 60, 5, 48) }
  // hanging light rig: 4 cans over the ring (cones drawn live)
  for (const cx of [480, 880, 1280, 1680]) {
    x.fillStyle = '#070a12'; x.fillRect(cx - 2, 96, 4, 34)
    x.fillStyle = '#141926'; x.beginPath(); x.moveTo(cx - 26, 130); x.lineTo(cx + 26, 130); x.lineTo(cx + 18, 168); x.lineTo(cx - 18, 168); x.closePath(); x.fill()
    x.fillStyle = '#272f42'; x.fillRect(cx - 26, 130, 52, 5)
    ell(x, cx, 170, 15, 5, '#ffe9c0'); ell(x, cx, 170, 8, 3, '#fff6df')
  }
  // tier front slabs (crowd baselines sit on these)
  for (const [ty, dim] of [[330, 1], [470, 0.85], [620, 0.7]]) {
    x.fillStyle = `rgba(16,22,38,1)`; x.fillRect(-OVER, ty, AW, 26)
    x.fillStyle = `rgba(30,40,62,${dim})`; x.fillRect(-OVER, ty, AW, 4)
    x.fillStyle = `rgba(5,7,13,1)`; x.fillRect(-OVER, ty + 26, AW, 18)
    // bulb strip along the slab edge
    for (let bx = -OVER + 8; bx < AW; bx += 26) {
      x.fillStyle = h2(bx, ty, 5) > 0.12 ? 'rgba(255,214,150,0.85)' : 'rgba(120,90,60,0.6)'
      x.fillRect(bx, ty + 9, 3, 3)
    }
  }
  // banner on the back wall, behind the ring
  x.fillStyle = '#101a30'; x.fillRect(860, 360, 440, 120)
  x.strokeStyle = '#22304e'; x.lineWidth = 5; x.strokeRect(860, 360, 440, 120)
  x.font = '600 44px Anton'; x.textAlign = 'center'; x.textBaseline = 'middle'
  x.fillStyle = '#8fa4c8'; x.fillText('THE FLOW DOME', 1080, 412)
  x.font = '600 20px "Space Grotesk"'; x.fillStyle = '#5c6c8c'
  x.fillText('HOME OF THE HAIRYWEIGHT', 1080, 452)
  // warm haze rising over the ring
  warmGlow(x, 1080, 700, 620, 0.10, '255,196,130')
  speckle(x, -OVER, -OVER, AW, AH, 91, 260, '180,196,230', 0.05, 2)
  return c
}

// ---------- THE RING (ropes, posts, canvas floor, apron) ----------------------
export function bakeRing() {
  const { c, x } = px(AW, AH)
  x.translate(OVER, OVER)
  const { backY, apronY } = RING
  // apron skirt first (behind floor front edge)
  const ap = x.createLinearGradient(0, apronY, 0, 1070)
  ap.addColorStop(0, '#1d3157'); ap.addColorStop(0.7, '#13223f'); ap.addColorStop(1, '#080d18')
  x.fillStyle = ap; x.fillRect(-OVER, apronY, AW, 130)
  x.fillStyle = '#a82632'; x.fillRect(-OVER, apronY, AW, 9)
  x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(-OVER, apronY, AW, 2)
  x.font = '600 34px Anton'; x.textAlign = 'center'; x.textBaseline = 'middle'
  for (let cx2 = 130; cx2 < AW; cx2 += 470) {
    x.fillStyle = '#e8dfc8'; x.fillText('HAIRYWEIGHT', cx2, apronY + 48)
    x.fillStyle = '#8c98b4'; x.font = '700 18px "Space Grotesk"'
    x.fillText('R P P V', cx2 + 210, apronY + 46)
    x.font = '600 34px Anton'
  }
  x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(-OVER, apronY + 96, AW, 60)
  // canvas floor: light, worn, perspective quad
  const quad = [[260, backY], [1900, backY], [2000, apronY], [120, apronY]]
  const inQuad = (qx, qy) => {
    let inside = false
    for (let i = 0, j = 3; i < 4; j = i++) {
      const [xi, yi] = quad[i], [xj, yj] = quad[j]
      if ((yi > qy) !== (yj > qy) && qx < ((xj - xi) * (qy - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  const fl = x.createLinearGradient(0, backY, 0, apronY)
  fl.addColorStop(0, '#a9b6c2'); fl.addColorStop(0.55, '#c3cdd6'); fl.addColorStop(1, '#dbe2e8')
  x.fillStyle = fl
  x.beginPath(); x.moveTo(...quad[0]); x.lineTo(...quad[1]); x.lineTo(...quad[2]); x.lineTo(...quad[3]); x.closePath(); x.fill()
  // board seams converging with perspective
  x.strokeStyle = 'rgba(96,110,126,0.5)'; x.lineWidth = 2
  for (let i = 1; i < 8; i++) {
    const u = i / 8
    const xbn = 260 + (1900 - 260) * u, xfn = 120 + (2000 - 120) * u
    x.beginPath(); x.moveTo(xbn, backY); x.lineTo(xfn, apronY); x.stroke()
  }
  // centre scuff wear + seeded stains
  ell(x, 1080, 828, 420, 62, 'rgba(255,255,255,0.10)')
  speckle(x, 200, backY, 1760, apronY - backY, 17, 300, '70,84,100', 0.16, 2)
  for (let i = 0; i < 26; i++) { // scuff streaks
    const sx = 300 + h2(i, 23, 1) * 1560, sy = backY + 14 + h2(i, 23, 2) * (apronY - backY - 30)
    x.save(); x.translate(sx, sy); x.rotate((h2(i, 23, 3) - 0.5) * 0.9)
    x.fillStyle = `rgba(80,94,112,${0.10 + h2(i, 23, 4) * 0.13})`
    x.fillRect(-14 - h2(i, 23, 5) * 22, 0, 28 + h2(i, 23, 5) * 44, 2)
    x.restore()
  }
  // centre logo: squashed ellipse ring + wordmark
  ell(x, 1080, 830, 268, 50, 'rgba(28,46,84,0.9)')
  ell(x, 1080, 830, 256, 44, 'rgba(203,214,224,1)')
  ell(x, 1080, 830, 240, 39, 'rgba(179,40,52,0.85)')
  ell(x, 1080, 830, 226, 34, 'rgba(203,214,224,1)')
  x.save(); x.translate(1080, 826); x.scale(1, 0.42)
  x.font = '600 84px Anton'; x.textAlign = 'center'; x.textBaseline = 'middle'
  x.fillStyle = '#1c2e54'; x.fillText('HAIRYWEIGHT', 0, 0)
  x.restore()
  x.font = '600 20px "Space Grotesk"'; x.fillStyle = 'rgba(120,30,40,0.8)'
  x.fillText('R P P V', 1080, 872)
  // front edge shadow + apron lip highlight
  x.fillStyle = 'rgba(20,30,48,0.35)'; x.fillRect(120, apronY, 1880, 5)
  // posts (back pair carry the corner pads, front pair crop at frame edge)
  const post = (bx, by, w, hgt) => {
    const g = x.createLinearGradient(bx - w / 2, 0, bx + w / 2, 0)
    g.addColorStop(0, '#181c26'); g.addColorStop(0.4, '#3c4452'); g.addColorStop(0.62, '#586274'); g.addColorStop(1, '#20242e')
    x.fillStyle = g; x.fillRect(bx - w / 2, by - hgt, w, hgt)
    ell(x, bx, by - hgt, w * 0.62, w * 0.3, '#2c3340')
    ell(x, bx - w * 0.16, by - hgt - 1, w * 0.22, w * 0.12, '#78849a')
    x.fillStyle = '#14181f'; x.fillRect(bx - w, by - 6, w * 2, 8)
  }
  const pad = (bx, by, base, trim) => {
    const w = 64, hgt = 168, top = by - 210
    const g = x.createLinearGradient(bx - w / 2, 0, bx + w / 2, 0)
    g.addColorStop(0, base[2]); g.addColorStop(0.42, base[1]); g.addColorStop(0.7, base[0]); g.addColorStop(1, base[2])
    x.fillStyle = g
    x.beginPath(); x.roundRect(bx - w / 2, top, w, hgt, 14); x.fill()
    x.strokeStyle = trim; x.lineWidth = 4
    x.beginPath(); x.roundRect(bx - w / 2 + 3, top + 3, w - 6, hgt - 6, 11); x.stroke()
    x.fillStyle = 'rgba(10,12,18,0.8)'
    for (const sy of [top + 40, top + 88, top + 136]) x.fillRect(bx - w / 2 + 4, sy, w - 8, 5)
  }
  post(300, backY, 26, 244); post(1860, backY, 26, 244)
  pad(300, backY, ['#c23444', '#8c1f2c', '#5c141d'], '#f0d9dc') // hero corner: red with pale trim
  pad(1860, backY, ['#1a1b20', '#101115', '#08090c'], '#e8e6e0') // champ corner: black with white trim
  post(150, apronY, 30, 320); post(1995, apronY, 30, 320)
  // back ropes with sag + rope shadows on the canvas
  const ropeCols = [['#7d1d28', '#c23444'], ['#6d7076', '#e8e6e0'], ['#1c3768', '#2c4a8c']]
  const backTop = backY - 244 + 16
  for (let r = 0; r < 3; r++) {
    const y0 = backTop + r * 62
    x.strokeStyle = 'rgba(30,42,60,0.18)'; x.lineWidth = 10
    x.beginPath(); x.moveTo(310, y0 + 240); x.quadraticCurveTo(1080, y0 + 250, 1850, y0 + 240); x.stroke()
    x.strokeStyle = ropeCols[r][0]; x.lineWidth = 7
    x.beginPath(); x.moveTo(310, y0); x.quadraticCurveTo(1080, y0 + 15, 1850, y0); x.stroke()
    x.strokeStyle = ropeCols[r][1]; x.lineWidth = 4
    x.beginPath(); x.moveTo(310, y0 - 1); x.quadraticCurveTo(1080, y0 + 13, 1850, y0 - 1); x.stroke()
    x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 1
    x.beginPath(); x.moveTo(310, y0 - 3); x.quadraticCurveTo(1080, y0 + 10, 1850, y0 - 3); x.stroke()
  }
  // ring steps (both corners)
  const steps = (sx, dir) => {
    for (let i = 0; i < 3; i++) {
      const w = 66 - i * 0, hgt = 22, x0 = sx + dir * i * 46, y0 = apronY - 4 - i * 22
      x.fillStyle = i % 2 ? '#3a414e' : '#2c323d'; x.fillRect(x0 - w / 2, y0 - hgt, w, hgt)
      x.fillStyle = '#4c5563'; x.fillRect(x0 - w / 2, y0 - hgt, w, 4)
      x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(x0 - w / 2, y0 - 3, w, 3)
    }
  }
  steps(1930, -1); steps(190, 1)
  // towel draped on the hero-corner ropes
  x.save(); x.translate(392, backY - 180); x.rotate(0.06)
  x.drawImage(bakeTowel(), -33, -8)
  x.restore()
  speckle(x, -OVER, apronY, AW, 140, 41, 160, '0,0,0', 0.2, 2)
  return c
}

// ---------- CROWD (heads-atlas tiers, two bob variants per tier) ---------------
// Returns layers: draw c[variant] each frame; variant flips at a rate keyed to crowd level.
export function bakeCrowd(heads) {
  const defs = [
    { y1: 322, rows: 8, s: 1, gap: 17, dim: 0.50, seed: 1101, nearK: 0.35 },
    { y1: 462, rows: 5, s: 2, gap: 30, dim: 0.34, seed: 2203, nearK: 0.7 },
    { y1: 616, rows: 3, s: 3, gap: 46, dim: 0.20, seed: 3307, nearK: 1 },
  ]
  const layers = []
  const TORSO = ['#141b2e', '#1a2338', '#10182a', '#232c44', '#0d1424', '#2a3049']
  for (const d of defs) {
    const step = 16 * d.s * 0.66
    const cs = [canvas(AW, AH), canvas(AW, AH)]
    for (let v = 0; v < 2; v++) {
      const x = cs[v].getContext('2d')
      const r = rng(d.seed + v * 977)
      let n = 0
      for (let row = d.rows - 1; row >= 0; row--) { // farthest row first
        const base = d.y1 - row * step
        let pxx = -18 + r() * 12
        while (pxx < AW - 8) {
          const id = Math.floor(r() * 4489)
          const sx = (id % 67) * 16, sy = Math.floor(id / 67) * 16
          const lift = v === 1 && r() > 0.45 ? 2 * d.s : 0
          const jx = (r() - 0.5) * 5
          // torso blob
          const tw = 15 * d.s, th = 13 * d.s
          x.fillStyle = TORSO[Math.floor(r() * TORSO.length)]
          x.beginPath(); x.roundRect(pxx + jx - tw / 2, base - th + 2 * d.s + lift, tw, th + 6 * d.s, 5 * d.s); x.fill()
          // head
          x.drawImage(heads, sx, sy, 16, 16, pxx + jx - 8 * d.s, base - 16 * d.s + lift, 16 * d.s, 16 * d.s)
          n++
          pxx += d.gap * (0.84 + r() * 0.34)
        }
      }
      tintOver(cs[v], `12,18,34`, d.dim)
      d.count = n
    }
    layers.push({ c: cs, seed: d.seed, nearK: d.nearK, count: d.count })
  }
  return layers
}

// phone flashes: deterministic twinkles over the crowd band (walks, eruptions)
export function phoneFlashes(x, t, k, y0 = 180, y1 = 640, seed = 5) {
  if (k <= 0.02) return
  x.save()
  x.globalCompositeOperation = 'lighter'
  const n = Math.round(14 * k)
  for (let i = 0; i < n; i++) {
    const cyc = 0.55 + h2(i, seed, 1) * 0.9
    const ph = (t / cyc + h2(i, seed, 2)) % 1
    if (ph > 0.16) continue
    const a = (1 - ph / 0.16) * 0.8 * k
    const fx = h2(i, seed, 3) * 2160 - OVER, fy = y0 + h2(i, seed, 4) * (y1 - y0)
    x.fillStyle = `rgba(235,242,255,${a})`
    x.fillRect(fx - 1, fy - 5, 2, 10); x.fillRect(fx - 5, fy - 1, 10, 2)
    ell(x, fx, fy, 3.4, 3.4, `rgba(235,242,255,${a * 0.4})`)
  }
  x.restore()
}

// spotlight cone from the rig down to the floor (walks, talks)
export function cone(x, cx, topY, floorY, r, t, a = 0.14, col = '255,222,160', seed = 3) {
  x.save()
  x.globalCompositeOperation = 'lighter'
  const sway = Math.sin(t * 0.5 + seed) * 12
  const g = x.createLinearGradient(0, topY, 0, floorY)
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},${a * 0.3})`)
  x.fillStyle = g
  x.beginPath(); x.moveTo(cx - 10 + sway * 0.2, topY); x.lineTo(cx + 10 + sway * 0.2, topY)
  x.lineTo(cx + r + sway, floorY); x.lineTo(cx - r + sway, floorY); x.closePath(); x.fill()
  const pg = x.createRadialGradient(cx + sway, floorY, 0, cx + sway, floorY, r * 1.2)
  pg.addColorStop(0, `rgba(${col},${a * 1.2})`); pg.addColorStop(1, `rgba(${col},0)`)
  x.fillStyle = pg
  x.beginPath(); x.ellipse(cx + sway, floorY, r * 1.2, r * 0.22, 0, 0, 7); x.fill()
  for (let i = 0; i < 10; i++) {
    const ph = t * (0.16 + h2(i, seed, 1) * 0.2) + h2(i, seed, 2) * 9
    const my = topY + ((ph * 110) % (floorY - topY))
    const spread = 10 + ((my - topY) / (floorY - topY)) * (r - 12)
    const mx = cx + sway * ((my - topY) / (floorY - topY)) + (h2(i, seed, 3) - 0.5) * 2 * spread
    const al = 0.10 + 0.10 * Math.sin(ph * 3.1 + i)
    if (al <= 0) continue
    x.fillStyle = `rgba(${col},${al})`
    x.fillRect(mx, my, 1.6, 1.6)
  }
  x.restore()
}

// ---------- COLD-OPEN EXTERIOR: The Flow Dome ----------------------------------
export function bakeMarquee() {
  const { c, x } = px(AW, AH)
  x.translate(OVER, OVER)
  // night sky
  const sky = x.createLinearGradient(0, -OVER, 0, 900)
  sky.addColorStop(0, '#05070f'); sky.addColorStop(0.6, '#0a1020'); sky.addColorStop(1, '#131c30')
  x.fillStyle = sky; x.fillRect(-OVER, -OVER, AW, AH)
  for (let i = 0; i < 130; i++) {
    const sxx = h2(i, 61, 1) * AW - OVER, syy = h2(i, 61, 2) * 640 - OVER
    x.fillStyle = `rgba(214,226,246,${0.14 + h2(i, 61, 3) * 0.5})`
    x.fillRect(sxx, syy, h2(i, 61, 4) > 0.85 ? 2 : 1, 1)
  }
  ell(x, 1800, 130, 44, 44, 'rgba(226,232,244,0.14)')
  ell(x, 1800, 130, 30, 30, 'rgba(238,242,250,0.5)')
  ell(x, 1788, 122, 9, 7, 'rgba(190,198,214,0.5)')
  // the dome itself
  x.fillStyle = '#0e1524'
  x.beginPath(); x.ellipse(1080, 620, 900, 240, 0, Math.PI, 0); x.closePath(); x.fill()
  for (let i = 0; i < 12; i++) {
    x.strokeStyle = 'rgba(26,36,58,0.9)'; x.lineWidth = 5
    x.beginPath(); x.moveTo(180 + i * 150, 620 - Math.cos((i / 11 - 0.5) * Math.PI) * 235)
    x.lineTo(1080 + (i - 5.5) * 40, 385); x.stroke()
  }
  // main facade
  ditherBands(x, 300, 600, 1560, 460, [26, 32, 48], [14, 18, 30], 12)
  x.fillStyle = '#1a2236'; x.fillRect(300, 580, 1560, 24)
  for (let pxx = 320; pxx < 1860; pxx += 120) { x.fillStyle = '#232c44'; x.fillRect(pxx, 600, 14, 460) }
  speckle(x, 300, 600, 1560, 440, 77, 220, '160,180,220', 0.06, 2)
  // marquee board
  x.fillStyle = '#12060a'; x.fillRect(430, 214, 1300, 348)
  const mb = x.createLinearGradient(0, 214, 0, 562)
  mb.addColorStop(0, '#42101c'); mb.addColorStop(0.5, '#2b0a12'); mb.addColorStop(1, '#1c060c')
  x.fillStyle = mb; x.fillRect(448, 232, 1264, 312)
  x.strokeStyle = '#57121f'; x.lineWidth = 8; x.strokeRect(448, 232, 1264, 312)
  x.textAlign = 'center'; x.textBaseline = 'middle'
  x.font = '600 96px Anton'
  x.fillStyle = '#f4ead6'; x.fillText('THE HAIRYWEIGHT', 1080, 320)
  x.fillStyle = '#f4ead6'; x.fillText('CHAMPIONSHIP', 1080, 424)
  x.font = '600 30px Anton'
  x.fillStyle = '#de9b9c'; x.fillText('CRIMSON CROWN', 890, 500)
  x.fillStyle = '#e8e6e0'; x.fillText('vs', 1078, 500)
  x.fillStyle = '#dad6d3'; x.fillText('PEARL SOUL', 1258, 500)
  x.font = '600 22px "Space Grotesk"'; x.fillStyle = '#c9a24a'
  x.fillText('RPPV PRESENTS  •  TONITE 8PM  •  ALL-SEATS', 1080, 548)
  // entrance + ticket booth
  x.fillStyle = '#0c1120'; x.fillRect(880, 660, 400, 420)
  const gl = x.createLinearGradient(0, 700, 0, 1080)
  gl.addColorStop(0, 'rgba(255,214,150,0.5)'); gl.addColorStop(1, 'rgba(255,214,150,0.08)')
  x.fillStyle = gl; x.fillRect(900, 680, 360, 400)
  x.fillStyle = '#161f36'; x.fillRect(1060, 680, 8, 400)
  x.fillStyle = '#0c1120'; x.fillRect(1420, 780, 190, 300)
  x.fillStyle = 'rgba(255,224,170,0.85)'; x.fillRect(1436, 800, 158, 90)
  x.fillStyle = '#10131c'; x.font = '600 22px Anton'; x.fillText('TICKETS', 1515, 845)
  // stanchions
  for (const sx of [770, 830, 1370, 1430]) {
    x.fillStyle = '#2c303c'; x.fillRect(sx - 3, 960, 6, 110)
    ell(x, sx, 954, 9, 5, '#3c414e')
  }
  // street
  ditherBands(x, -OVER, 1080, AW, 240, [16, 18, 26], [7, 8, 13], 8)
  x.fillStyle = 'rgba(255,214,150,0.05)'
  x.beginPath(); x.ellipse(1080, 1084, 560, 22, 0, 0, 7); x.fill()
  for (let i = 0; i < 40; i++) {
    const rx = h2(i, 83, 1) * AW - OVER, ry = 1090 + h2(i, 83, 2) * 200
    x.fillStyle = `rgba(255,220,160,${0.03 + h2(i, 83, 3) * 0.05})`
    x.fillRect(rx, ry, 24 + h2(i, 83, 4) * 50, 2)
  }
  // marquee light spill on the facade
  warmGlow(x, 1080, 560, 760, 0.10, '255,190,120')
  // bulb ring positions for the live chase
  const bulbs = []
  for (let bx = 424; bx <= 1756; bx += 38) { bulbs.push([bx, 206]); bulbs.push([bx, 570]) }
  for (let by = 206; by <= 570; by += 38) { bulbs.push([424, by]); bulbs.push([1756, by]) }
  return { c, bulbs }
}

export function bakeTaxi() {
  const w = 170, h = 84, { c, x } = px(w, h)
  // body
  x.fillStyle = '#8a6414'; x.beginPath(); x.roundRect(8, 30, 154, 34, 9); x.fill()
  x.fillStyle = '#e8b23c'; x.beginPath(); x.roundRect(8, 26, 154, 32, 9); x.fill()
  x.fillStyle = '#f7d06a'; x.fillRect(12, 28, 146, 6)
  // cabin
  x.fillStyle = '#c99a2e'; x.beginPath(); x.moveTo(42, 30); x.lineTo(58, 6); x.lineTo(118, 6); x.lineTo(134, 30); x.closePath(); x.fill()
  x.fillStyle = '#28374e'; x.beginPath(); x.moveTo(48, 28); x.lineTo(61, 10); x.lineTo(88, 10); x.lineTo(88, 28); x.closePath(); x.fill()
  x.fillStyle = '#34455e'; x.beginPath(); x.moveTo(92, 10); x.lineTo(115, 10); x.lineTo(129, 28); x.lineTo(92, 28); x.closePath(); x.fill()
  // checker band
  for (let i = 0; i < 19; i++) { x.fillStyle = i % 2 ? '#111111' : '#f4f0e4'; x.fillRect(10 + i * 8, 42, 8, 8) }
  // roof sign
  x.fillStyle = '#e8b23c'; x.beginPath(); x.roundRect(70, -4, 36, 12, 3); x.fill()
  x.fillStyle = '#fff3cf'; x.font = '700 10px "Space Grotesk"'; x.textAlign = 'center'; x.textBaseline = 'middle'
  x.fillText('TAXI', 88, 2)
  // wheels
  for (const wx of [42, 132]) {
    ell(x, wx, 64, 14, 14, '#0c0d10'); ell(x, wx, 64, 7, 7, '#3c414c'); ell(x, wx - 2, 62, 2.4, 2.4, '#8a92a2')
  }
  x.fillStyle = '#ffe9a8'; x.fillRect(0, 34, 7, 8)
  x.fillStyle = '#c23434'; x.fillRect(163, 34, 6, 8)
  return c
}

// ---------- PROPS ---------------------------------------------------------------
const GLOVE_RAMPS = {
  hero: { out: '#3a0d13', shadow: '#7c1e28', base: '#a8323e', light: '#cf5560', hi: '#f0939b', cuff: '#de9b9c', cuffLo: '#8c5a60' },
  champ: { out: '#26262a', shadow: '#8f8d88', base: '#e3e1dc', light: '#f5f4f1', hi: '#ffffff', cuff: '#1d1f26', cuffLo: '#0d0e12' },
}
export function bakeGlove(scheme) {
  const R = GLOVE_RAMPS[scheme], { c, x } = px(38, 32)
  // cuff
  x.fillStyle = R.cuffLo; x.beginPath(); x.roundRect(20, 20, 16, 11, 3); x.fill()
  x.fillStyle = R.cuff; x.beginPath(); x.roundRect(20, 18, 16, 11, 3); x.fill()
  x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(21, 19, 14, 2)
  // mitt
  ell(x, 17, 14, 14, 12, R.out)
  ell(x, 17, 13, 12.4, 10.4, R.base)
  ell(x, 12, 9.5, 5.6, 4.2, R.light)
  ell(x, 10.5, 8.5, 2.4, 1.8, R.hi)
  ell(x, 24, 15, 5.4, 4.6, R.shadow)
  // thumb + seam
  ell(x, 27, 9, 4.6, 3.8, R.base)
  ell(x, 27, 8.2, 2.2, 1.6, R.light)
  x.strokeStyle = R.shadow; x.lineWidth = 1.4
  x.beginPath(); x.moveTo(8, 17); x.quadraticCurveTo(16, 22, 25, 18); x.stroke()
  return c
}

export function bakePlacard() {
  const { c, x } = px(224, 274)
  x.fillStyle = '#8c887c'; x.beginPath(); x.roundRect(5, 7, 214, 262, 8); x.fill()
  x.fillStyle = '#f2efe6'; x.beginPath(); x.roundRect(0, 0, 214, 262, 8); x.fill()
  const sheen = x.createLinearGradient(0, 0, 214, 262)
  sheen.addColorStop(0, 'rgba(255,255,255,0.5)'); sheen.addColorStop(0.4, 'rgba(255,255,255,0)')
  x.fillStyle = sheen; x.beginPath(); x.roundRect(0, 0, 214, 262, 8); x.fill()
  x.strokeStyle = '#a82632'; x.lineWidth = 7; x.strokeRect(10, 10, 194, 242)
  x.textAlign = 'center'; x.textBaseline = 'middle'
  x.font = '600 40px Anton'; x.fillStyle = '#20242c'; x.fillText('ROUND', 107, 52)
  x.font = '600 150px Anton'; x.fillStyle = '#a82632'; x.fillText('3', 107, 158)
  x.font = '700 22px "Space Grotesk"'; x.fillStyle = '#5c6470'; x.fillText('HAIRYWEIGHT', 107, 236)
  speckle(x, 0, 0, 214, 262, 55, 90, '120,116,104', 0.1, 2)
  return c
}

export function bakeTowel() {
  const { c, x } = px(66, 46)
  x.fillStyle = '#b8b4a8'; x.beginPath(); x.roundRect(2, 6, 62, 36, 10); x.fill()
  x.fillStyle = '#efece2'; x.beginPath(); x.roundRect(0, 2, 62, 36, 10); x.fill()
  x.fillStyle = '#c23444'; x.fillRect(0, 26, 62, 6)
  x.strokeStyle = 'rgba(120,116,104,0.5)'; x.lineWidth = 1.4
  for (const fy of [10, 17, 31]) { x.beginPath(); x.moveTo(6, fy); x.quadraticCurveTo(31, fy + 4, 56, fy); x.stroke() }
  speckle(x, 0, 0, 62, 40, 67, 60, '110,106,96', 0.12, 2)
  return c
}

export function bakeStool() {
  const { c, x } = px(76, 60)
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(38, 54, 30, 5, 0, 0, 7); x.fill()
  x.strokeStyle = '#78849a'; x.lineWidth = 5
  x.beginPath(); x.moveTo(24, 40); x.lineTo(16, 56); x.moveTo(52, 40); x.lineTo(60, 56)
  x.moveTo(28, 40); x.lineTo(36, 56); x.moveTo(48, 40); x.lineTo(42, 56); x.stroke()
  x.fillStyle = '#6e141d'; x.beginPath(); x.roundRect(8, 22, 60, 20, 9); x.fill()
  x.fillStyle = '#a82632'; x.beginPath(); x.roundRect(8, 18, 60, 20, 9); x.fill()
  x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(12, 20, 52, 4)
  return c
}

export function bakeSponge() {
  const { c, x } = px(16, 12)
  x.fillStyle = '#b09058'; x.beginPath(); x.roundRect(0, 0, 16, 12, 3); x.fill()
  x.fillStyle = '#d8bc84'; x.fillRect(1, 1, 14, 4)
  x.fillStyle = 'rgba(90,70,40,0.6)'
  for (const [hx, hy] of [[4, 6], [9, 8], [12, 4], [6, 9]]) x.fillRect(hx, hy, 2, 1)
  return c
}

export function bakeBelt() {
  const { c, x } = px(430, 260)
  // strap
  x.fillStyle = '#170f08'; x.beginPath(); x.roundRect(6, 96, 418, 84, 26); x.fill()
  const st = x.createLinearGradient(0, 100, 0, 176)
  st.addColorStop(0, '#503620'); st.addColorStop(0.5, '#33220f'); st.addColorStop(1, '#1d1206')
  x.fillStyle = st; x.beginPath(); x.roundRect(10, 100, 410, 76, 22); x.fill()
  x.strokeStyle = 'rgba(220,190,140,0.5)'; x.lineWidth = 2
  x.beginPath(); x.moveTo(20, 112); x.lineTo(410, 112); x.moveTo(20, 164); x.lineTo(410, 164); x.stroke()
  // side plates
  for (const sx of [92, 338]) {
    x.fillStyle = '#6e4a12'; x.beginPath(); x.roundRect(sx - 44, 92, 88, 92, 16); x.fill()
    const g = x.createLinearGradient(sx - 40, 0, sx + 40, 0)
    g.addColorStop(0, '#8c6218'); g.addColorStop(0.45, '#d8a838'); g.addColorStop(0.7, '#f2cc5e'); g.addColorStop(1, '#9c7020')
    x.fillStyle = g; x.beginPath(); x.roundRect(sx - 40, 96, 80, 84, 13); x.fill()
    x.fillStyle = '#f7e09a'
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 5)
      x.beginPath(); x.arc(sx + Math.cos(a) * 24, 138 + Math.sin(a) * 24, 7, 0, 7); x.fill()
    }
    x.fillStyle = '#7a5210'; x.beginPath(); x.arc(sx, 138, 10, 0, 7); x.fill()
  }
  // centre plate: shield with the flowing-hair sigil
  x.fillStyle = '#5a3c0e'; x.beginPath(); x.roundRect(148, 54, 134, 158, 22); x.fill()
  const g2 = x.createLinearGradient(150, 0, 280, 0)
  g2.addColorStop(0, '#9c7020'); g2.addColorStop(0.35, '#e8bc4a'); g2.addColorStop(0.62, '#f7dc82'); g2.addColorStop(1, '#c89830')
  x.fillStyle = g2; x.beginPath(); x.roundRect(154, 60, 122, 146, 18); x.fill()
  x.strokeStyle = '#8a6214'; x.lineWidth = 3
  x.beginPath(); x.roundRect(161, 67, 108, 132, 14); x.stroke()
  // engraved flowing hair (three S-curves) + highlight offset
  for (const [dx, dy, col, wd] of [[0, 0, '#7a5210', 5], [2, 2, '#f7e6a8', 2]]) {
    x.strokeStyle = col; x.lineWidth = wd
    x.beginPath(); x.moveTo(182 + dx, 92 + dy)
    x.bezierCurveTo(222 + dx, 108 + dy, 176 + dx, 140 + dy, 216 + dx, 156 + dy)
    x.bezierCurveTo(244 + dx, 166 + dy, 236 + dx, 182 + dy, 208 + dx, 186 + dy)
    x.stroke()
    x.beginPath(); x.moveTo(244 + dx, 88 + dy)
    x.bezierCurveTo(216 + dx, 118 + dy, 252 + dx, 142 + dy, 226 + dx, 168 + dy)
    x.stroke()
  }
  // gems
  for (const [gx, gy] of [[180, 176], [215, 182], [250, 176]]) {
    x.fillStyle = '#5c0e16'; x.beginPath(); x.arc(gx, gy, 8, 0, 7); x.fill()
    x.fillStyle = '#c22a3a'; x.beginPath(); x.arc(gx, gy, 6, 0, 7); x.fill()
    x.fillStyle = 'rgba(255,220,220,0.8)'; x.fillRect(gx - 2, gy - 3, 2, 2)
  }
  // sheen
  const sh = x.createLinearGradient(140, 40, 300, 220)
  sh.addColorStop(0.25, 'rgba(255,255,240,0)'); sh.addColorStop(0.4, 'rgba(255,255,240,0.35)'); sh.addColorStop(0.55, 'rgba(255,255,240,0)')
  x.fillStyle = sh; x.fillRect(140, 40, 170, 190)
  return c
}

// VS card: opaque 600x600 original, cropped per CASTING.md, set in a museum frame.
export function bakeVsCard(img, name, sub, accent, cx, cy) {
  const size = 420
  const { c, x } = px(500, 572)
  // frame moulding (gold bevel)
  x.fillStyle = '#3a2a10'; x.fillRect(0, 0, 500, 572)
  const fm = x.createLinearGradient(0, 0, 500, 572)
  fm.addColorStop(0, '#f2d274'); fm.addColorStop(0.3, '#c89a3c'); fm.addColorStop(0.55, '#8c6218'); fm.addColorStop(0.8, '#c89a3c'); fm.addColorStop(1, '#f2d274')
  x.fillStyle = fm; x.fillRect(4, 4, 492, 564)
  x.fillStyle = '#2c1f0c'; x.fillRect(22, 22, 456, 528)
  x.fillStyle = '#101620'; x.fillRect(30, 30, 440, 440)
  // bust crop (clamped inside the 600x600 source)
  const sx = Math.max(0, Math.min(600 - size, cx - size / 2)), sy = Math.max(0, Math.min(600 - size, cy - size / 2))
  x.drawImage(img, sx, sy, size, size, 40, 40, 420, 420)
  // glass sheen
  const sh = x.createLinearGradient(40, 40, 460, 460)
  sh.addColorStop(0, 'rgba(235,242,252,0.16)'); sh.addColorStop(0.3, 'rgba(235,242,252,0.03)'); sh.addColorStop(0.32, 'rgba(235,242,252,0)'); sh.addColorStop(1, 'rgba(235,242,252,0)')
  x.fillStyle = sh; x.fillRect(40, 40, 420, 420)
  // nameplate
  x.fillStyle = '#2c1f0c'; x.fillRect(38, 486, 424, 64)
  const bp = x.createLinearGradient(0, 486, 0, 550)
  bp.addColorStop(0, '#f2d274'); bp.addColorStop(0.5, '#c89a3c'); bp.addColorStop(1, '#9c7020')
  x.fillStyle = bp; x.fillRect(40, 488, 420, 60)
  x.textAlign = 'center'; x.textBaseline = 'middle'
  x.font = '600 36px Anton'; x.fillStyle = '#2c1d08'; x.fillText(name, 250, 512)
  x.font = '600 26px "Space Grotesk"'; x.fillStyle = '#4a3414'; x.fillText(sub, 250, 540)
  x.fillStyle = accent
  x.beginPath(); x.arc(62, 518, 9, 0, 7); x.fill()
  x.beginPath(); x.arc(438, 518, 9, 0, 7); x.fill()
  // frame corner screws
  for (const [kx, ky] of [[14, 14], [486, 14], [14, 558], [486, 558]]) {
    x.fillStyle = '#5c4a20'; x.beginPath(); x.arc(kx, ky, 5, 0, 7); x.fill()
    x.fillStyle = '#e8cf7e'; x.fillRect(kx - 1, ky - 3, 2, 6)
  }
  speckle(x, 0, 0, 500, 572, 97, 140, '40,28,8', 0.12, 2)
  return c
}

// dark silhouette of a rig (for the champ's shadow crossing the canvas)
export function bakeSil(R, col = '#070a12') {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.sil, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = col
  x.fillRect(0, 0, R.w, R.h)
  return c
}

// grey paper for the replay sketch
export function bakePaper() {
  const { c, x } = px(512, 512)
  x.fillStyle = '#dcd8cc'; x.fillRect(0, 0, 512, 512)
  const g = x.createRadialGradient(256, 256, 80, 256, 256, 380)
  g.addColorStop(0, 'rgba(255,255,250,0.25)'); g.addColorStop(1, 'rgba(150,144,130,0.25)')
  x.fillStyle = g; x.fillRect(0, 0, 512, 512)
  speckle(x, 0, 0, 512, 512, 71, 900, '110,104,92', 0.16, 2)
  speckle(x, 0, 0, 512, 512, 72, 500, '255,255,248', 0.2, 2)
  return c
}

// horizontal scanline pattern for the replay
export function bakeScanlines() {
  const { c, x } = px(8, 6)
  x.fillStyle = 'rgba(8,10,14,0.16)'; x.fillRect(0, 4, 8, 2)
  x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(0, 0, 8, 1)
  return c
}

// ---------- FX PAINTERS (all analytic, keyed by real time) -----------------------
export function impactRing(x, ex, ey, age, col = '255,238,206') {
  if (age < 0 || age > 0.32) return
  const u = age / 0.32
  const r = 10 + u * 130
  x.save()
  x.globalCompositeOperation = 'lighter'
  x.strokeStyle = `rgba(${col},${0.6 * (1 - u)})`
  x.lineWidth = Math.max(1.2, 7 * (1 - u))
  x.beginPath(); x.arc(ex, ey, r, 0, 7); x.stroke()
  x.fillStyle = `rgba(${col},${0.28 * (1 - u)})`
  x.beginPath(); x.arc(ex, ey, r * 0.55, 0, 7); x.fill()
  // spark cross at birth
  if (u < 0.35) {
    const k = 1 - u / 0.35
    x.strokeStyle = `rgba(255,255,255,${0.8 * k})`; x.lineWidth = 3
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.4
      x.beginPath(); x.moveTo(ex + Math.cos(a) * 6, ey + Math.sin(a) * 6)
      x.lineTo(ex + Math.cos(a) * (16 + 26 * k), ey + Math.sin(a) * (16 + 26 * k)); x.stroke()
    }
  }
  x.restore()
}

// analytic sweat chips from immutable events {g->real, x, y, seed}
export function chips(x, events, rt, col = '224,232,244', n = 8) {
  for (const ev of events) {
    const age = rt - ev.real
    if (age < 0 || age > 0.8) continue
    for (let i = 0; i < n; i++) {
      const vx = (hash(ev.seed * 31 + i * 3) - 0.5) * 340
      const vy = -120 - hash(ev.seed * 31 + i * 5) * 220
      const px2 = ev.x + vx * age
      const py2 = ev.y + vy * age + 0.5 * 620 * age * age
      const a = 1 - age / 0.8
      x.fillStyle = `rgba(${col},${a})`
      x.fillRect(px2, py2, 4, 4)
    }
  }
}

// dust puff for falls/skids: {real, x, y, seed}
export function dust(x, events, rt) {
  for (const ev of events) {
    const age = rt - ev.real
    if (age < 0 || age > 0.8) continue
    const u = age / 0.8
    for (let i = 0; i < 7; i++) {
      const dir = i % 2 ? 1 : -1
      const px2 = ev.x + dir * (14 + i * 11) * (0.3 + u) + (hash(ev.seed + i) - 0.5) * 22
      const py2 = ev.y - 8 - u * (16 + hash(ev.seed + i * 3) * 26) + Math.sin(age * 9 + i) * 3
      const a = 0.34 * (1 - u)
      ell(x, px2, py2, 6 + u * 20, (4.5 + u * 12) * 0.8, `rgba(196,204,216,${a})`)
    }
  }
}

// radial speed lines for the BIG stop
export function speedLines(x, cx, cy, k, seed = 9) {
  if (k <= 0.01) return
  x.save()
  x.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + hash(seed + i) * 0.2
    const r0 = 70 + hash(seed * 7 + i) * 50
    const r1 = r0 + 140 + k * 420 + hash(seed * 3 + i) * 130
    x.strokeStyle = `rgba(255,244,224,${0.5 * k * (0.5 + hash(i, seed) * 0.5)})`
    x.lineWidth = 1.6 + hash(seed + i, 4) * 3.4
    x.beginPath()
    x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.9)
    x.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.9)
    x.stroke()
  }
  x.restore()
}

export async function loadOrig(id) {
  const i = new Image()
  i.src = new URL(`../../media/remy/Character${id}.webp`, import.meta.url).href
  await i.decode()
  return i
}
