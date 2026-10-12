// DAWN OF THE BALD art: prepare-time bakes (dusk/night/dawn skies, title ridge,
// dawn yard, RBG news studio + county map, golden-hour highway, CUTZ GALLERY mall
// exterior/interior, rooftop) + pure per-frame painters (chopper, barber pole,
// styling chair, clippers, mirror pole, boards, blinds, duffel, razor, sink,
// glass + spiderweb, pressed palm, ball gleams, procedural hair caps, newsboy cap,
// CRT broadcast overlay, TV snow, glow). Romero grade: seeded texture, one light
// direction per set, contact shadows, no flat fills. Everything deterministic:
// hash/rng only, every painter a pure function of t.
import { hash, rng, lerp, txt, F } from 'filmkit/lib.js'
import { DRAWN } from './timeline.js'

export const W = 1920, H = 1080

const hexRgb = (h) => [Number.parseInt(h.slice(1, 3), 16), Number.parseInt(h.slice(3, 5), 16), Number.parseInt(h.slice(5, 7), 16)]
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const h2 = (x, y, s = 0) => hash(x * 7349 + y * 92821 + s * 1013)
function shadeHex(hex, k) {
  const [r, g, b] = hexRgb(hex)
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}
function normalizeHex(c) {
  return c ? (c.startsWith('#') ? c : '#' + c) : '#888888'
}

// pixel-crisp structural canvas
function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = Math.round(w)
  c.height = Math.round(h)
  const x = c.getContext('2d')
  x.imageSmoothingEnabled = false
  return c
}

// seeded speckle texture pass
function speckle(x, x0, y0, w, h, seed, n, col, aMin = 0.05, aMax = 0.2, sz = 3) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    x.fillStyle = css(col, aMin + r() * (aMax - aMin))
    x.fillRect(x0 + r() * w, y0 + r() * h, sz * (0.5 + r()), sz * (0.5 + r()))
  }
}

// ---------- skies (dithered Bayer ramps + seeded cloud strata) ----------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
function skyBake(stops) {
  const c = canvas(W, H), ctx = c.getContext('2d')
  const img = ctx.createImageData(W, H), d = img.data
  const st = stops.map(([p, hex]) => [p, hexRgb(hex)])
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1)
    for (let x = 0; x < W; x++) {
      const q = v * 48, b0 = Math.floor(q), f = q - b0
      const pk = f * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? b0 + 1 : b0
      const p = Math.min(1, pk / 48)
      let k = 0
      while (k < st.length - 2 && p > st[k + 1][0]) k++
      const pa = st[k][0], ca = st[k][1], pb = st[k + 1][0], cb = st[k + 1][1]
      const u = clamp01((p - pa) / (pb - pa || 1))
      const i = (y * W + x) * 4
      d[i] = ca[0] + (cb[0] - ca[0]) * u
      d[i + 1] = ca[1] + (cb[1] - ca[1]) * u
      d[i + 2] = ca[2] + (cb[2] - ca[2]) * u
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}
// long flat cloud banks; rim = lit underside toward the set's light side
function cloudStrata(x, seed, yMin, yMax, n, col, rim, aMax) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const cy = yMin + r() * (yMax - yMin)
    const cx = r() * W
    const wd = 260 + r() * 640
    const ht = 10 + r() * 26
    x.fillStyle = css(col, aMax * (0.4 + r() * 0.6))
    x.beginPath()
    x.ellipse(cx, cy, wd, ht, 0, 0, 7)
    x.fill()
    x.fillStyle = css(rim, aMax * 0.5 * (0.3 + r() * 0.7))
    x.beginPath()
    x.ellipse(cx - wd * 0.12, cy + ht * 0.5, wd * 0.66, ht * 0.42, 0, 0, 7)
    x.fill()
  }
}
function starDots(x, seed, n, yMax, col, aMax = 0.8) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const b = r()
    if (b < 0.4) continue
    x.fillStyle = css(col, aMax * b * (0.4 + r() * 0.6))
    x.fillRect(Math.floor(r() * W), Math.floor(r() * yMax), 2, 2)
  }
}

// Dusk: deep teal falling into an ember band, dark strata crossing it.
export function bakeSkyDusk() {
  const c = skyBake([[0, '#081d29'], [0.30, '#113740'], [0.52, '#28484a'], [0.68, '#5c4a38'], [0.82, '#96552c'], [1, '#c67a35']])
  const x = c.getContext('2d')
  starDots(x, 5, 22, 280, '203,216,224', 0.4)
  cloudStrata(x, 11, 40, 360, 9, [14, 38, 46], [214, 128, 66], 0.5)
  cloudStrata(x, 23, 560, 860, 7, [24, 30, 40], [232, 152, 84], 0.42)
  return c
}

// Night: ink green-black, sodium-orange practical haze pooling at the horizon.
export function bakeSkyNight() {
  const c = skyBake([[0, '#030707'], [0.38, '#050d0b'], [0.66, '#081511'], [1, '#0d1e16']])
  const x = c.getContext('2d')
  starDots(x, 8, 90, 620, '188,206,200', 0.7)
  cloudStrata(x, 17, 100, 420, 6, [8, 18, 16], [40, 54, 46], 0.4)
  const hz = x.createLinearGradient(0, 700, 0, 1080)
  hz.addColorStop(0, 'rgba(255,154,60,0)')
  hz.addColorStop(0.65, 'rgba(255,154,60,0.10)')
  hz.addColorStop(1, 'rgba(255,154,60,0.16)')
  x.fillStyle = hz
  x.fillRect(0, 700, W, 380)
  for (const [px, py, pr, pa] of [[300, 1010, 240, 0.10], [960, 1050, 320, 0.12], [1620, 1000, 260, 0.10]]) {
    const g = x.createRadialGradient(px, py, 10, px, py, pr)
    g.addColorStop(0, `rgba(255,170,80,${pa})`)
    g.addColorStop(1, 'rgba(255,170,80,0)')
    x.fillStyle = g
    x.fillRect(px - pr, py - pr, pr * 2, pr * 2)
  }
  return c
}

// Dawn: rose falling to gold with a low sun disc (film composites this behind
// the rooftop bake and flies the chopper into it).
export function bakeSkyDawn() {
  const c = skyBake([[0, '#3c2f4e'], [0.28, '#6e4050'], [0.48, '#a85e48'], [0.66, '#d08a52'], [0.82, '#eeb86e'], [1, '#f8dc9a']])
  const x = c.getContext('2d')
  cloudStrata(x, 29, 60, 380, 8, [52, 40, 62], [244, 190, 130], 0.42)
  cloudStrata(x, 31, 470, 600, 4, [70, 48, 52], [250, 208, 140], 0.30)
  const sx0 = 1500, sy0 = 740
  const halo = x.createRadialGradient(sx0, sy0, 20, sx0, sy0, 330)
  halo.addColorStop(0, 'rgba(255,226,158,0.55)')
  halo.addColorStop(0.4, 'rgba(255,204,130,0.22)')
  halo.addColorStop(1, 'rgba(255,204,130,0)')
  x.fillStyle = halo
  x.fillRect(sx0 - 340, sy0 - 340, 680, 680)
  x.fillStyle = '#ffe9b4'
  x.beginPath()
  x.arc(sx0, sy0, 46, 0, 7)
  x.fill()
  x.fillStyle = '#fff6d8'
  x.beginPath()
  x.arc(sx0 - 8, sy0 - 8, 36, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(210,140,110,0.35)'
  for (const [cy, cw] of [[716, 150], [742, 210], [764, 120]]) {
    x.beginPath()
    x.ellipse(sx0 - 40, cy, cw, 5, 0, 0, 7)
    x.fill()
  }
  return c
}

// Title foreground ridge: 1920x~300 alpha strip, drawn at H-height so silhouettes
// stalk BEHIND its crest and the close walker crosses IN FRONT of it.
export function bakeRidge() {
  const h = 300
  const c = canvas(W, h), x = c.getContext('2d')
  const r = rng(4242)
  const crest = []
  for (let i = 0; i <= 48; i++) {
    const tx = (i / 48) * W
    crest.push([tx, 118 + Math.sin(i * 0.55) * 24 + (h2(i, 3, 41) - 0.5) * 52])
  }
  x.fillStyle = '#0a1013'
  x.beginPath()
  x.moveTo(0, h)
  x.lineTo(crest[0][0], crest[0][1])
  for (let i = 1; i < crest.length; i++) {
    const [px, py] = crest[i - 1]
    const [qx, qy] = crest[i]
    x.quadraticCurveTo((px + qx) / 2, (py + qy) / 2 - 8, qx, qy)
  }
  x.lineTo(W, h)
  x.closePath()
  x.fill()
  const crestAt = (tx) => {
    const f = (tx / W) * (crest.length - 1)
    const i = Math.min(crest.length - 2, Math.floor(f))
    return lerp(crest[i][1], crest[i + 1][1], f - i)
  }
  // dead trees strung along the crest
  for (let i = 0; i < 46; i++) {
    const tx = r() * W
    const tw = 8 + r() * 22
    const th = 12 + r() * 32
    const ty = crestAt(tx) + 6
    x.beginPath()
    x.moveTo(tx - tw, ty)
    x.quadraticCurveTo(tx - tw * 0.4, ty - th * 0.7, tx, ty - th)
    x.quadraticCurveTo(tx + tw * 0.4, ty - th * 0.7, tx + tw, ty)
    x.closePath()
    x.fill()
  }
  // water tower + radio mast silhouettes
  const wtx = 460, wty = crestAt(460)
  x.fillRect(wtx - 3, wty - 92, 6, 92)
  x.beginPath()
  x.ellipse(wtx, wty - 104, 30, 20, 0, 0, 7)
  x.fill()
  x.fillRect(wtx - 26, wty - 108, 52, 6)
  const mtx = 1560, mty = crestAt(1560)
  x.fillRect(mtx - 2, mty - 150, 4, 150)
  for (const my of [mty - 140, mty - 118, mty - 96]) x.fillRect(mtx - 14, my, 28, 3)
  x.fillStyle = 'rgba(255,120,90,0.8)'
  x.fillRect(mtx - 2, mty - 154, 4, 4)
  // ember rim off the dusk sky behind
  x.strokeStyle = 'rgba(198,122,53,0.30)'
  x.lineWidth = 2
  x.beginPath()
  x.moveTo(crest[0][0], crest[0][1])
  for (let i = 1; i < crest.length; i++) {
    const [px, py] = crest[i - 1]
    const [qx, qy] = crest[i]
    x.quadraticCurveTo((px + qx) / 2, (py + qy) / 2 - 8, qx, qy)
  }
  x.stroke()
  return c
}

// ---------- S2: the yard (dawn suburb, house front LEFT, light low from the left) ----------
// Anchors the film blocks against: big window (boarded + blinded) center-right,
// attached garage right, hedge line with three gaps, sodium porch lamp.
export function bakeYard() {
  const c = canvas(W, H), x = c.getContext('2d')
  // dawn sky strip above the roofline
  const sky = x.createLinearGradient(0, 0, 0, 250)
  sky.addColorStop(0, '#54405a')
  sky.addColorStop(0.55, '#8a5550')
  sky.addColorStop(1, '#d99a5e')
  x.fillStyle = sky
  x.fillRect(0, 0, W, 252)
  const sunG = x.createRadialGradient(170, 235, 12, 170, 235, 300)
  sunG.addColorStop(0, 'rgba(255,214,150,0.55)')
  sunG.addColorStop(1, 'rgba(255,214,150,0)')
  x.fillStyle = sunG
  x.fillRect(-130, -65, 600, 600)
  cloudStrata(x, 43, 30, 170, 4, [58, 44, 62], [244, 190, 130], 0.4)
  // roof band + fascia (the house wraps the whole frame; the garage tucks under it)
  x.fillStyle = '#38302c'
  x.fillRect(0, 118, W, 122)
  for (let ry = 126; ry < 238; ry += 14) {
    x.fillStyle = 'rgba(12,8,6,0.35)'
    x.fillRect(0, ry, W, 3)
    x.fillStyle = 'rgba(200,170,140,0.07)'
    x.fillRect(0, ry + 3, W, 2)
  }
  speckle(x, 0, 118, W, 120, 61, 300, [16, 12, 10], 0.05, 0.16, 3)
  x.fillStyle = '#574438'
  x.fillRect(0, 240, W, 26)
  x.fillStyle = 'rgba(255,222,180,0.16)'
  x.fillRect(0, 240, W, 4)
  x.fillStyle = 'rgba(10,6,4,0.5)'
  x.fillRect(0, 262, W, 16)
  // clapboard facade (light from the left: ramp falls to the right)
  const fg = x.createLinearGradient(0, 0, W, 0)
  fg.addColorStop(0, '#8a7a66')
  fg.addColorStop(0.55, '#7a6a58')
  fg.addColorStop(1, '#615344')
  x.fillStyle = fg
  x.fillRect(0, 266, W, 664)
  for (let by = 266; by < 930; by += 22) {
    x.fillStyle = 'rgba(30,20,12,0.28)'
    x.fillRect(0, by, W, 2)
    x.fillStyle = 'rgba(255,230,190,0.07)'
    x.fillRect(0, by + 2, 900, 2)
  }
  speckle(x, 0, 266, W, 664, 62, 520, [40, 30, 20], 0.04, 0.14, 3)
  // corner boards
  for (const cbx of [468, 1008, 1560]) {
    x.fillStyle = 'rgba(255,236,200,0.10)'
    x.fillRect(cbx, 266, 8, 664)
    x.fillStyle = 'rgba(20,12,8,0.25)'
    x.fillRect(cbx + 8, 266, 3, 664)
  }
  // porch (left): roof, posts, floor
  x.fillStyle = '#3a322c'
  x.fillRect(40, 400, 520, 42)
  x.fillStyle = 'rgba(255,222,180,0.12)'
  x.fillRect(40, 400, 520, 4)
  x.fillStyle = 'rgba(8,5,3,0.45)'
  x.fillRect(52, 442, 508, 26)
  for (const px of [90, 300, 520]) {
    const pg = x.createLinearGradient(px, 0, px + 14, 0)
    pg.addColorStop(0, '#6a5644')
    pg.addColorStop(1, '#42342a')
    x.fillStyle = pg
    x.fillRect(px, 442, 14, 462)
  }
  x.fillStyle = '#5a4c3e'
  x.fillRect(40, 902, 520, 28)
  x.fillStyle = 'rgba(20,12,8,0.4)'
  for (let px = 40; px < 560; px += 46) x.fillRect(px, 902, 2, 28)
  // porch rail
  x.fillStyle = '#4a3c30'
  x.fillRect(456, 690, 104, 8)
  for (let bx = 462; bx < 556; bx += 12) x.fillRect(bx, 698, 4, 92)
  // front door (doorX 392)
  x.fillStyle = '#3a2a20'
  x.fillRect(320, 580, 140, 326)
  const dg = x.createLinearGradient(332, 0, 448, 0)
  dg.addColorStop(0, '#5c3a28')
  dg.addColorStop(1, '#422a1c')
  x.fillStyle = dg
  x.fillRect(332, 588, 116, 316)
  for (const [px, py, pw, ph] of [[340, 596, 100, 34], [340, 646, 100, 108], [340, 770, 100, 118]]) {
    x.fillStyle = 'rgba(16,8,4,0.5)'
    x.fillRect(px, py, pw, ph)
    x.fillStyle = 'rgba(255,210,160,0.08)'
    x.fillRect(px, py, pw, 3)
  }
  x.fillStyle = '#c9a23c'
  x.fillRect(432, 740, 6, 14)
  // porch step
  x.fillStyle = '#6a5c4c'
  x.fillRect(312, 904, 156, 12)
  x.fillStyle = '#5a4d3f'
  x.fillRect(304, 916, 172, 14)
  // porch lamp on the siding RIGHT of the door frame — the film glows at
  // (doorX, 700) = (480, 700), so the sconce hangs exactly there
  x.fillStyle = '#2c2620'
  x.fillRect(476, 664, 8, 18)
  x.fillStyle = '#1e1a16'
  x.fillRect(468, 680, 24, 8)
  const lg = x.createLinearGradient(468, 684, 492, 708)
  lg.addColorStop(0, '#ffdf9e')
  lg.addColorStop(1, '#c67f36')
  x.fillStyle = lg
  x.beginPath()
  x.roundRect(470, 684, 20, 26, 4)
  x.fill()
  x.fillStyle = '#1e1a16'
  x.fillRect(468, 708, 24, 6)
  // big window (anchor rect) with dark interior + cold reflection
  x.fillStyle = '#4a3c30'
  x.fillRect(1068, 548, 364, 324)
  x.fillStyle = '#241c14'
  x.fillRect(1074, 554, 352, 312)
  const wgr = x.createLinearGradient(1080, 560, 1420, 860)
  wgr.addColorStop(0, '#12201f')
  wgr.addColorStop(0.6, '#0d1719')
  wgr.addColorStop(1, '#0a1113')
  x.fillStyle = wgr
  x.fillRect(1080, 560, 340, 300)
  // faint curtain + interior shapes behind the glass
  x.fillStyle = 'rgba(52,74,70,0.30)'
  x.fillRect(1096, 576, 60, 284)
  x.fillRect(1330, 590, 44, 270)
  x.fillStyle = 'rgba(90,120,110,0.10)'
  x.fillRect(1180, 640, 90, 220)
  const refl = x.createLinearGradient(1120, 600, 1360, 820)
  refl.addColorStop(0.30, 'rgba(214,236,240,0)')
  refl.addColorStop(0.45, 'rgba(214,236,240,0.085)')
  refl.addColorStop(0.55, 'rgba(214,236,240,0.03)')
  refl.addColorStop(0.7, 'rgba(214,236,240,0)')
  x.fillStyle = refl
  x.fillRect(1080, 560, 340, 300)
  // mullions + sill
  x.fillStyle = '#3a2f26'
  x.fillRect(1244, 560, 12, 300)
  x.fillRect(1080, 676, 340, 10)
  x.fillStyle = '#6a5a48'
  x.fillRect(1060, 872, 380, 14)
  x.fillStyle = 'rgba(255,230,190,0.14)'
  x.fillRect(1060, 872, 380, 3)
  // shutters
  for (const sx0 of [1020, 1436]) {
    x.fillStyle = '#3f4a44'
    x.fillRect(sx0, 556, 42, 310)
    x.fillStyle = 'rgba(14,20,16,0.32)'
    for (let ly = 566; ly < 860; ly += 12) x.fillRect(sx0 + 4, ly, 34, 4)
    x.fillStyle = 'rgba(220,240,230,0.08)'
    x.fillRect(sx0, 556, 4, 310)
  }
  // upstairs bath window (dim)
  x.fillStyle = '#2c241c'
  x.fillRect(652, 322, 100, 96)
  x.fillStyle = '#131b1e'
  x.fillRect(660, 330, 84, 80)
  x.fillStyle = '#2c241c'
  x.fillRect(698, 330, 8, 80)
  // attached garage right (anchor rect)
  x.fillStyle = '#40362c'
  x.fillRect(1560, 636, 360, 70)
  x.fillStyle = 'rgba(12,8,6,0.4)'
  for (let ry = 646; ry < 700; ry += 12) x.fillRect(1560, ry, 360, 3)
  x.fillStyle = 'rgba(255,214,160,0.10)'
  x.fillRect(1560, 636, 360, 4)
  x.fillStyle = '#332b23'
  x.fillRect(1592, 692, 316, 244)
  const gg2 = x.createLinearGradient(1600, 0, 1900, 0)
  gg2.addColorStop(0, '#5f574b')
  gg2.addColorStop(1, '#494138')
  x.fillStyle = gg2
  x.fillRect(1600, 700, 300, 230)
  for (let py = 714; py < 924; py += 44) {
    x.fillStyle = 'rgba(18,12,8,0.42)'
    x.fillRect(1604, py, 292, 5)
    x.fillStyle = 'rgba(240,220,190,0.06)'
    x.fillRect(1604, py + 5, 292, 2)
  }
  x.fillStyle = '#8a8276'
  x.fillRect(1736, 792, 28, 6)
  x.fillStyle = '#26201a'
  x.fillRect(1596, 696, 8, 238)
  x.fillRect(1896, 696, 8, 238)
  // driveway + walkway
  const dv = x.createLinearGradient(0, 930, 0, 1080)
  dv.addColorStop(0, '#565249')
  dv.addColorStop(1, '#403c35')
  x.fillStyle = dv
  x.fillRect(1556, 930, 364, 150)
  x.fillStyle = dv
  x.fillRect(322, 930, 140, 150)
  x.fillStyle = 'rgba(20,16,12,0.5)'
  for (const [cx0, cy0, cw] of [[1640, 964, 130], [1700, 1020, 90], [380, 990, 70], [350, 1044, 110]]) {
    x.fillRect(cx0, cy0, cw, 2)
  }
  // back fence + hedge line with three gaps (risers at x 300 / 428 / 556)
  x.fillStyle = '#4a4038'
  x.fillRect(40, 786, 940, 98)
  x.fillStyle = 'rgba(20,14,10,0.4)'
  for (let fx2 = 40; fx2 < 980; fx2 += 26) x.fillRect(fx2, 786, 3, 98)
  x.fillStyle = '#57493c'
  x.fillRect(40, 780, 940, 8)
  const bush = (bx0, bw) => {
    const r = rng(Math.round(bx0) * 7 + 13)
    // dark under-mass
    x.fillStyle = '#142a1a'
    x.beginPath()
    x.ellipse(bx0 + bw / 2, 874, bw * 0.55, 54, 0, 0, 7)
    x.fill()
    // clumped domes along the segment
    const n = Math.max(2, Math.round(bw / 52))
    for (let i = 0; i < n; i++) {
      const cx0 = bx0 + (bw / n) * (i + 0.5)
      const rad = (bw / n) * (0.62 + r() * 0.2)
      x.fillStyle = '#1f3a26'
      x.beginPath()
      x.ellipse(cx0, 856 - rad * 0.55, rad, rad * 0.78, 0, 0, 7)
      x.fill()
    }
    // moonlit (dawn-left) top rims + leaf speckle
    for (let i = 0; i < n; i++) {
      const cx0 = bx0 + (bw / n) * (i + 0.5)
      const rad = (bw / n) * (0.62 + r() * 0.2)
      x.fillStyle = 'rgba(110,158,96,0.42)'
      x.beginPath()
      x.ellipse(cx0 - rad * 0.22, 850 - rad * 0.62, rad * 0.62, rad * 0.26, -0.22, 0, 7)
      x.fill()
    }
    speckle(x, bx0, 810, bw, 76, Math.round(bx0) + 3, Math.round(bw * 1.6), [150, 190, 130], 0.04, 0.14, 2)
    // contact shadow cast right (light from the left)
    x.fillStyle = 'rgba(8,12,8,0.35)'
    x.beginPath()
    x.ellipse(bx0 + bw * 0.78, 884, bw * 0.34, 8, 0, 0, 7)
    x.fill()
  }
  bush(60, 208)
  bush(336, 58)
  bush(462, 58)
  bush(590, 370)
  // lawn (ground 930 line) with dawn pool from the left + mow stripes
  const lng = x.createLinearGradient(0, 0, W, 0)
  lng.addColorStop(0, '#31491f')
  lng.addColorStop(1, '#1d3018')
  x.fillStyle = lng
  x.fillRect(0, 884, W, 196)
  for (let ly = 900; ly < 1080; ly += 44) {
    x.fillStyle = 'rgba(120,160,90,0.06)'
    x.fillRect(0, ly, W, 18)
  }
  speckle(x, 0, 884, W, 196, 63, 900, [140, 180, 100], 0.03, 0.1, 2)
  speckle(x, 0, 884, W, 196, 64, 500, [10, 20, 8], 0.05, 0.14, 2)
  return {
    canvas: c,
    window: { x: 1080, y: 560, w: 340, h: 300 },
    garage: { x: 1600, y: 700, w: 300, h: 230 },
    hedgeY: 880,
    doorX: 480,
  }
}

// ---------- S1: RBG ACTION NEWS studio (night city window over an anchor desk) ----------
// film.js slices this canvas at deskY: everything above is backdrop, everything
// below MUST be opaque desk front (the anchor rig is sandwiched between).
export function bakeNewsSet() {
  const c = canvas(W, H), x = c.getContext('2d')
  const deskY = 700
  // studio wall
  const wg = x.createLinearGradient(0, 0, 0, deskY)
  wg.addColorStop(0, '#10151f')
  wg.addColorStop(1, '#1a2230')
  x.fillStyle = wg
  x.fillRect(0, 0, W, deskY)
  for (let px = 120; px < W; px += 240) {
    x.fillStyle = 'rgba(6,10,16,0.5)'
    x.fillRect(px, 0, 4, deskY)
  }
  x.fillStyle = '#1d2634'
  x.fillRect(0, 92, W, 10)
  x.fillStyle = 'rgba(120,160,210,0.10)'
  x.fillRect(0, 102, W, 3)
  // night-city window behind the anchor
  x.fillStyle = '#232c3a'
  x.fillRect(330, 120, 1260, 530)
  const csg = x.createLinearGradient(0, 130, 0, 640)
  csg.addColorStop(0, '#0a1220')
  csg.addColorStop(1, '#101c2c')
  x.fillStyle = csg
  x.fillRect(346, 136, 1228, 498)
  const r = rng(1201)
  for (let b = 0; b < 15; b++) {
    const bw = 60 + r() * 130
    const bh = 130 + r() * 330
    const bx = 356 + b * 81 + r() * 14
    const by = 634 - bh
    x.fillStyle = '#0e1826'
    x.fillRect(bx, by, bw, bh)
    x.fillStyle = 'rgba(150,180,220,0.10)'
    x.fillRect(bx, by, bw, 4)
    for (let wy = by + 12; wy < 622; wy += 18) {
      for (let wx = bx + 8; wx < bx + bw - 10; wx += 16) {
        const lit = r()
        if (lit < 0.42) continue
        x.fillStyle = lit > 0.85 ? 'rgba(159,196,232,0.55)' : 'rgba(255,217,138,0.6)'
        x.fillRect(wx, wy, 7, 8)
      }
    }
    if (bh > 380) {
      x.fillStyle = 'rgba(255,80,80,0.9)'
      x.fillRect(bx + bw / 2 - 2, by - 6, 4, 4)
    }
  }
  // mullions + frame
  x.fillStyle = '#1c2430'
  x.fillRect(748, 136, 14, 498)
  x.fillRect(1158, 136, 14, 498)
  x.fillRect(346, 385, 1228, 12)
  x.fillStyle = '#2a3546'
  x.fillRect(330, 120, 1260, 14)
  x.fillRect(330, 644, 1260, 14)
  // show slug (ledger string) + cove wash
  txt(x, DRAWN.program, 960, 84, { size: 26, font: F.grot, weight: 700, color: 'rgba(214,226,238,0.5)', align: 'center', track: 3 })
  // desk top face (thin perspective) then opaque front
  x.fillStyle = '#6a4a30'
  x.fillRect(0, 682, W, 24)
  x.fillStyle = 'rgba(255,224,180,0.22)'
  x.fillRect(0, 682, W, 4)
  x.fillStyle = 'rgba(20,10,4,0.4)'
  x.fillRect(0, 702, W, 4)
  x.fillStyle = '#5c4630'
  x.fillRect(900, 686, 130, 14)
  x.fillStyle = '#e8e2d2'
  x.fillRect(1060, 688, 92, 10)
  x.fillStyle = '#20303a'
  x.fillRect(1180, 684, 22, 16)
  x.fillStyle = '#c9c2ae'
  x.fillRect(1183, 680, 16, 5)
  const dfg = x.createLinearGradient(0, 706, 0, 1080)
  dfg.addColorStop(0, '#4a1420')
  dfg.addColorStop(0.5, '#3c101a')
  dfg.addColorStop(1, '#26090f')
  x.fillStyle = dfg
  x.fillRect(0, 706, W, 374)
  // red accent band — the lower third rides over this
  x.fillStyle = '#5c1a28'
  x.fillRect(0, 726, W, 76)
  x.fillStyle = 'rgba(255,120,110,0.14)'
  x.fillRect(0, 726, W, 4)
  x.fillStyle = 'rgba(10,4,6,0.5)'
  x.fillRect(0, 798, W, 4)
  for (let px = 40; px < W; px += 160) {
    x.fillStyle = 'rgba(12,4,8,0.45)'
    x.fillRect(px, 826, 3, 234)
  }
  speckle(x, 0, 706, W, 374, 77, 260, [255, 140, 120], 0.02, 0.07, 3)
  // portrait prop spot (film drops the framed original here)
  const pr = { x: 180, y: 760, w: 150, h: 150 }
  x.fillStyle = 'rgba(8,2,4,0.55)'
  x.fillRect(pr.x - 8, pr.y - 8, pr.w + 16, pr.h + 16)
  x.fillStyle = 'rgba(0,0,0,0.5)'
  x.fillRect(pr.x + 10, pr.y + 12, pr.w, pr.h)
  x.fillStyle = '#7a6234'
  x.fillRect(pr.x + 30, pr.y + pr.h + 12, 90, 8)
  // etched station plate, low center (under the ticker bar)
  x.fillStyle = '#7a6234'
  x.beginPath()
  x.roundRect(830, 996, 260, 44, 6)
  x.fill()
  x.fillStyle = '#4a3818'
  x.beginPath()
  x.roundRect(836, 1002, 248, 32, 4)
  x.fill()
  txt(x, DRAWN.station, 960, 1026, { size: 22, font: F.grot, weight: 700, color: '#2a1c08', align: 'center', track: 2 })
  return { canvas: c, deskY, portraitRect: pr }
}

// ---------- S1: FOLLICLE COUNTY map board ----------
// film.js draws the title (top-left), the growing Shed-Zone blob (centered on the
// city ring) and two AFFLICTED portrait insets (x 1330..1850, y 250..470) live —
// keep those neighbourhoods quiet under them.
export function bakeNewsMap() {
  const c = canvas(W, H), x = c.getContext('2d')
  const board = x.createLinearGradient(0, 0, W, H)
  board.addColorStop(0, '#242a33')
  board.addColorStop(1, '#1b2028')
  x.fillStyle = board
  x.fillRect(0, 0, W, H)
  speckle(x, 0, 0, W, H, 301, 1600, [90, 80, 66], 0.02, 0.08, 3)
  // survey grid
  x.strokeStyle = 'rgba(90,100,116,0.14)'
  x.lineWidth = 1
  for (let gx = 48; gx < W; gx += 96) {
    x.beginPath()
    x.moveTo(gx, 30)
    x.lineTo(gx, H - 30)
    x.stroke()
  }
  for (let gy = 48; gy < H; gy += 96) {
    x.beginPath()
    x.moveTo(30, gy)
    x.lineTo(W - 30, gy)
    x.stroke()
  }
  // river (clear of the inset zone)
  x.strokeStyle = '#2e5a66'
  x.lineWidth = 26
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(1300, 60)
  x.bezierCurveTo(1120, 340, 1180, 620, 1220, 760)
  x.bezierCurveTo(1250, 870, 1120, 980, 980, 1060)
  x.stroke()
  x.strokeStyle = 'rgba(160,210,220,0.18)'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(1292, 70)
  x.bezierCurveTo(1114, 340, 1172, 620, 1212, 758)
  x.stroke()
  // county boundary (dashed)
  x.strokeStyle = 'rgba(120,128,112,0.5)'
  x.lineWidth = 3
  x.setLineDash([16, 12])
  x.beginPath()
  x.ellipse(940, 600, 700, 372, 0, 0, 7)
  x.stroke()
  x.setLineDash([])
  // roads radiating from the city
  x.strokeStyle = '#8a8574'
  x.lineWidth = 6
  const road = (pts) => {
    x.beginPath()
    x.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1])
    x.stroke()
  }
  road([[810, 560], [560, 500], [0, 430]])
  road([[810, 560], [700, 350], [620, 140]])
  road([[810, 560], [1020, 360], [1240, 160]])
  road([[810, 560], [1180, 660], [1560, 720], [1920, 760]])
  road([[810, 560], [1020, 800], [1620, 1060]])
  road([[810, 560], [480, 700], [0, 780]])
  x.strokeStyle = 'rgba(60,56,44,0.6)'
  x.lineWidth = 1.6
  for (const o of [-6, 6]) {
    road([[810 + o, 560 + o], [560 + o, 500 + o], [o, 430 + o]])
  }
  // secondary roads + ring road
  x.strokeStyle = 'rgba(138,133,116,0.45)'
  x.lineWidth = 3
  road([[560, 500], [420, 620], [480, 700]])
  road([[1020, 360], [1120, 260], [1240, 160]])
  road([[1020, 800], [1180, 660]])
  road([[700, 350], [560, 500]])
  x.beginPath()
  x.ellipse(810, 560, 210, 140, 0, 0, 7)
  x.stroke()
  // towns: small squares at the road ends
  const towns = [[420, 620], [1120, 260], [700, 350], [1560, 720], [480, 700], [560, 500], [1180, 660]]
  for (const [tx2, ty2] of towns) {
    x.fillStyle = 'rgba(160,152,130,0.55)'
    x.fillRect(tx2 - 7, ty2 - 7, 14, 14)
    x.fillStyle = 'rgba(30,28,22,0.5)'
    x.fillRect(tx2 - 3, ty2 - 3, 6, 6)
  }
  // city block clusters (quiet near title/insets)
  const r = rng(555)
  for (let i = 0; i < 46; i++) {
    const bx = 240 + r() * 1180
    const by = 320 + r() * 560
    if (bx > 1280 && by > 220 && by < 500) continue
    if (bx < 660 && by < 300) continue
    x.fillStyle = `rgba(70,80,96,${0.25 + r() * 0.3})`
    const bw = 10 + r() * 26
    x.fillRect(bx, by, bw, bw * (0.5 + r() * 0.6))
  }
  // city marker ring (film writes HAIRHAM above it)
  x.strokeStyle = '#c9c2ae'
  x.lineWidth = 3
  x.beginPath()
  x.arc(810, 560, 18, 0, 7)
  x.stroke()
  x.fillStyle = '#c9c2ae'
  x.beginPath()
  x.arc(810, 560, 7, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(201,194,174,0.5)'
  x.lineWidth = 1.5
  x.beginPath()
  x.arc(810, 560, 30, 0, 7)
  x.stroke()
  // legend box bottom-left (swatches only) — above the letterbox line
  x.fillStyle = '#20262e'
  x.fillRect(80, 770, 280, 150)
  x.strokeStyle = '#3a424e'
  x.lineWidth = 4
  x.strokeRect(80, 770, 280, 150)
  const sw = [[8, '#8a8574'], [8, '#2e5a66'], [6, '#e5484d']]
  sw.forEach(([w2, col], i) => {
    x.fillStyle = col
    x.fillRect(100, 798 + i * 38, 34, w2 + 6)
    x.fillStyle = 'rgba(200,206,216,0.35)'
    x.fillRect(148, 800 + i * 38, 150, 4)
  })
  // compass rose (no text)
  x.strokeStyle = '#8a8574'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(1700, 590)
  x.lineTo(1700, 520)
  x.moveTo(1665, 555)
  x.lineTo(1735, 555)
  x.stroke()
  x.fillStyle = '#8a8574'
  x.beginPath()
  x.moveTo(1700, 508)
  x.lineTo(1710, 530)
  x.lineTo(1690, 530)
  x.closePath()
  x.fill()
  x.beginPath()
  x.arc(1700, 555, 26, 0, 7)
  x.stroke()
  // frame + screws
  x.strokeStyle = '#3a3f4a'
  x.lineWidth = 18
  x.strokeRect(9, 9, W - 18, H - 18)
  x.strokeStyle = '#262b33'
  x.lineWidth = 4
  x.strokeRect(22, 22, W - 44, H - 44)
  for (const [sx0, sy0] of [[26, 26], [W - 34, 26], [26, H - 34], [W - 34, H - 34]]) {
    x.fillStyle = '#565e6a'
    x.beginPath()
    x.arc(sx0 + 4, sy0 + 4, 5, 0, 7)
    x.fill()
  }
  return c
}

// ---------- S3: golden-hour highway ----------
// ground 930; vanX 1560 is the sliding-door tackle pivot; every car anchor keeps
// clear floor so the risen can stand up beside it.
function carPaint(x, cx, baseY, w, flip, body, seed, o = {}) {
  const r = rng(seed)
  x.save()
  x.translate(cx, baseY)
  if (o.rot) x.rotate(o.rot)
  x.scale(flip ? -1 : 1, 1)
  const h = w * 0.34
  x.fillStyle = 'rgba(10,8,6,0.35)'
  x.beginPath()
  x.ellipse(0, 2, w * 0.56, 7, 0, 0, 7)
  x.fill()
  // cabin + glass
  x.fillStyle = shadeHex(body, 0.78)
  x.beginPath()
  x.moveTo(-w * 0.30, -h)
  x.quadraticCurveTo(-w * 0.24, -h - w * 0.17, -w * 0.05, -h - w * 0.18)
  x.quadraticCurveTo(w * 0.16, -h - w * 0.16, w * 0.26, -h)
  x.closePath()
  x.fill()
  x.fillStyle = '#1a2228'
  x.beginPath()
  x.moveTo(-w * 0.24, -h - 2)
  x.quadraticCurveTo(-w * 0.18, -h - w * 0.13, -w * 0.04, -h - w * 0.14)
  x.quadraticCurveTo(w * 0.11, -h - w * 0.125, w * 0.2, -h - 2)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(232,176,112,0.25)'
  x.beginPath()
  x.moveTo(-w * 0.2, -h - 3)
  x.lineTo(-w * 0.06, -h - w * 0.13)
  x.lineTo(-w * 0.02, -h - w * 0.12)
  x.lineTo(-w * 0.14, -h - 3)
  x.closePath()
  x.fill()
  // body with golden-hour ramp (light from the left = -x, which flip mirrors)
  const g = x.createLinearGradient(-w * 0.5, 0, w * 0.5, 0)
  g.addColorStop(0, shadeHex(body, 1.24))
  g.addColorStop(0.45, body)
  g.addColorStop(1, shadeHex(body, 0.6))
  x.fillStyle = g
  x.beginPath()
  x.moveTo(-w * 0.5, -6)
  x.quadraticCurveTo(-w * 0.52, -h * 0.9, -w * 0.44, -h)
  x.lineTo(w * 0.3, -h)
  x.quadraticCurveTo(w * 0.5, -h * 0.8, w * 0.5, -h * 0.35)
  x.quadraticCurveTo(w * 0.5, -6, w * 0.42, -5)
  x.closePath()
  x.fill()
  // wheels + arches
  for (const wx of [-w * 0.3, w * 0.3]) {
    x.fillStyle = '#14161a'
    x.beginPath()
    x.arc(wx, -w * 0.11, w * 0.11, 0, 7)
    x.fill()
    x.fillStyle = '#3c4046'
    x.beginPath()
    x.arc(wx, -w * 0.11, w * 0.045, 0, 7)
    x.fill()
  }
  // trim + rust streaks
  x.fillStyle = 'rgba(232,176,112,0.35)'
  x.fillRect(-w * 0.44, -h, w * 0.74, 3)
  x.fillStyle = 'rgba(80,50,30,0.5)'
  for (let i = 0; i < 3; i++) {
    const rx0 = -w * 0.4 + r() * w * 0.8
    x.fillRect(rx0, -h * 0.5, 3 + r() * 3, h * (0.2 + r() * 0.3))
  }
  // ajar door on demand
  if (o.ajar) {
    x.save()
    x.translate(w * 0.08, -h)
    x.rotate(0.55)
    x.fillStyle = shadeHex(body, 0.55)
    x.fillRect(0, 0, w * 0.3, h * 0.94)
    x.fillStyle = '#1a2228'
    x.fillRect(w * 0.04, h * 0.08, w * 0.22, h * 0.4)
    x.restore()
  }
  x.restore()
}

export function bakeHighway() {
  const c = canvas(W, H), x = c.getContext('2d')
  const cars = [
    { x: 160, w: 215, flip: false },
    { x: 398, w: 195, flip: true },
    { x: 636, w: 220, flip: false },
    { x: 872, w: 180, flip: true },
    { x: 1108, w: 210, flip: false },
    { x: 1344, w: 165, flip: true },
    { x: 1790, w: 215, flip: false },
    { x: 1902, w: 180, flip: true },
  ]
  // golden-hour sky (sun low right, haze bands)
  const sky = x.createLinearGradient(0, 0, 0, 705)
  sky.addColorStop(0, '#2c3a4a')
  sky.addColorStop(0.34, '#5a4a44')
  sky.addColorStop(0.6, '#8a5a3c')
  sky.addColorStop(0.82, '#c08048')
  sky.addColorStop(1, '#e8ac6a')
  x.fillStyle = sky
  x.fillRect(0, 0, W, 705)
  const sun = x.createRadialGradient(1640, 668, 16, 1640, 668, 300)
  sun.addColorStop(0, 'rgba(255,220,160,0.65)')
  sun.addColorStop(0.5, 'rgba(255,190,120,0.25)')
  sun.addColorStop(1, 'rgba(255,190,120,0)')
  x.fillStyle = sun
  x.fillRect(1340, 368, 600, 600)
  x.fillStyle = '#fff0d0'
  x.beginPath()
  x.arc(1640, 668, 26, 0, 7)
  x.fill()
  cloudStrata(x, 71, 60, 380, 6, [46, 40, 44], [240, 170, 110], 0.4)
  // far hills + tree line
  x.fillStyle = '#3a3430'
  x.beginPath()
  x.moveTo(0, 700)
  x.lineTo(0, 646)
  x.quadraticCurveTo(300, 612, 620, 648)
  x.quadraticCurveTo(980, 684, 1300, 640)
  x.quadraticCurveTo(1620, 604, 1920, 652)
  x.lineTo(1920, 700)
  x.closePath()
  x.fill()
  x.fillStyle = '#2e2a26'
  for (let i = 0; i < 40; i++) {
    const tx = i * 50 + h2(i, 9, 5) * 30
    const th = 8 + h2(i, 4, 6) * 22
    x.beginPath()
    x.moveTo(tx - 7, 656 + (tx % 90) * 0.2)
    x.lineTo(tx, 656 + (tx % 90) * 0.2 - th)
    x.lineTo(tx + 7, 656 + (tx % 90) * 0.2)
    x.closePath()
    x.fill()
  }
  // heat haze over the far road
  for (let i = 0; i < 14; i++) {
    x.fillStyle = `rgba(240,214,170,${0.04 + h2(i, 3, 8) * 0.05})`
    x.beginPath()
    x.ellipse(h2(i, 1, 2) * W, 636 + h2(i, 2, 4) * 44, 90 + h2(i, 5, 1) * 130, 4 + h2(i, 6, 3) * 5, 0, 0, 7)
    x.fill()
  }
  // shoulder + concrete barrier along the far edge
  x.fillStyle = '#56504a'
  x.fillRect(0, 700, W, 46)
  x.fillStyle = '#6e665e'
  x.fillRect(0, 700, W, 5)
  const brg = x.createLinearGradient(0, 730, 0, 790)
  brg.addColorStop(0, '#8a9096')
  brg.addColorStop(0.28, '#b9bfc4')
  brg.addColorStop(0.6, '#6a7278')
  brg.addColorStop(1, '#3a4046')
  x.fillStyle = brg
  x.beginPath()
  x.moveTo(0, 744)
  x.lineTo(W, 744)
  x.lineTo(W, 790)
  x.lineTo(0, 790)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(255,222,170,0.30)'
  x.fillRect(0, 744, W, 4)
  // barrier segment seams + impact smudges
  for (let px = 40; px < W; px += 210) {
    x.fillStyle = 'rgba(30,34,40,0.5)'
    x.fillRect(px, 748, 3, 42)
  }
  speckle(x, 0, 744, W, 46, 83, 120, [40, 36, 30], 0.05, 0.16, 4)
  // asphalt with left-light sheen
  const asg = x.createLinearGradient(0, 784, 0, 1080)
  asg.addColorStop(0, '#2b2c33')
  asg.addColorStop(1, '#3c3d44')
  x.fillStyle = asg
  x.fillRect(0, 784, W, 296)
  speckle(x, 0, 784, W, 296, 81, 700, [180, 160, 130], 0.02, 0.07, 2)
  speckle(x, 0, 784, W, 296, 82, 400, [10, 10, 14], 0.05, 0.14, 3)
  // warm sheen from the low sun on the left half
  const wsh = x.createLinearGradient(0, 0, 900, 0)
  wsh.addColorStop(0, 'rgba(232,176,112,0.10)')
  wsh.addColorStop(1, 'rgba(232,176,112,0)')
  x.fillStyle = wsh
  x.fillRect(0, 784, 900, 296)
  // edge lines + receding dashed centre (converging toward a right-hand VP)
  x.fillStyle = '#c9b98a'
  x.fillRect(0, 806, W, 5)
  x.globalAlpha = 0.75
  x.fillRect(0, 1052, W, 7)
  x.globalAlpha = 1
  let dy = 830
  let dashW = 5
  let dashH = 22
  let cxLine = 1080
  for (let i = 0; i < 8; i++) {
    x.globalAlpha = 0.55 + i * 0.055
    x.fillStyle = '#d8cba0'
    x.fillRect(cxLine - dashW / 2, dy, dashW, dashH)
    dy += dashH * 1.75
    dashW *= 1.32
    dashH *= 1.42
    cxLine += 24
  }
  x.globalAlpha = 1
  // abandoned cars (clear floor kept around each anchor)
  const bodies = ['#6e5a48', '#4a5a66', '#7a4438', '#5c6152', '#8a7a5c', '#4e4452', '#6a4e3e', '#54585e']
  cars.forEach((car, i) => {
    const baseY = 872 + (i % 4) * 17 + h2(i, 2, 9) * 10
    carPaint(x, car.x, baseY, car.w, car.flip, bodies[i], 900 + i * 7, { rot: (h2(i, 5, 3) - 0.5) * 0.16, ajar: i === 2 || i === 5 })
  })
  // THE VAN (sliding-door tackle prop): dark, plain-sided around x 1560
  const vx = 1560
  x.fillStyle = 'rgba(10,8,6,0.4)'
  x.beginPath()
  x.ellipse(vx, 894, 128, 9, 0, 0, 7)
  x.fill()
  const vg = x.createLinearGradient(1450, 0, 1690, 0)
  vg.addColorStop(0, '#3a3f46')
  vg.addColorStop(0.4, '#282c32')
  vg.addColorStop(1, '#17191d')
  x.fillStyle = vg
  x.beginPath()
  x.roundRect(1450, 678, 236, 208, 10)
  x.fill()
  // cab window + roof highlight
  x.fillStyle = '#0f141a'
  x.beginPath()
  x.roundRect(1462, 694, 40, 62, 6)
  x.fill()
  x.fillStyle = 'rgba(160,190,210,0.10)'
  x.fillRect(1466, 698, 32, 12)
  x.fillStyle = 'rgba(232,176,112,0.22)'
  x.fillRect(1450, 678, 236, 4)
  // sliding-door recess (the live door swings from vanX, 868)
  x.fillStyle = 'rgba(8,9,11,0.85)'
  x.fillRect(1512, 692, 140, 186)
  x.strokeStyle = '#3c4148'
  x.lineWidth = 4
  x.strokeRect(1512, 692, 140, 186)
  x.fillStyle = '#111317'
  x.fillRect(1504, 782, 156, 8)
  for (const wx of [1498, 1640]) {
    x.fillStyle = '#101216'
    x.beginPath()
    x.arc(wx, 890, 24, 0, 7)
    x.fill()
    x.fillStyle = '#33383e'
    x.beginPath()
    x.arc(wx, 890, 9, 0, 7)
    x.fill()
  }
  speckle(x, 1450, 678, 236, 208, 99, 60, [200, 190, 170], 0.02, 0.08, 2)
  return { canvas: c, ground: 930, cars, vanX: 1560 }
}

// ---------- S3 reveal: CUTZ GALLERY mall exterior (transparent sky) ----------
export function bakeMallExt() {
  const c = canvas(W, H), x = c.getContext('2d')
  const signRect = { x: 700, y: 430, w: 550, h: 80 }
  // parking lot (ground 930)
  const lot = x.createLinearGradient(0, 865, 0, 1080)
  lot.addColorStop(0, '#46433f')
  lot.addColorStop(1, '#31333a')
  x.fillStyle = lot
  x.fillRect(0, 865, W, 215)
  speckle(x, 0, 865, W, 215, 111, 700, [190, 180, 160], 0.02, 0.07, 2)
  speckle(x, 0, 865, W, 215, 112, 400, [10, 10, 12], 0.05, 0.12, 3)
  // stall rows + oil stains
  x.fillStyle = 'rgba(220,214,196,0.22)'
  x.fillRect(0, 880, W, 4)
  x.fillRect(0, 944, W, 4)
  for (const [ox2, oy2, or2] of [[420, 990, 26], [1180, 1010, 34], [820, 970, 18]]) {
    x.fillStyle = 'rgba(12,12,14,0.4)'
    x.beginPath()
    x.ellipse(ox2, oy2, or2, or2 * 0.4, 0, 0, 7)
    x.fill()
  }
  // building: parapet + stucco facade, pilasters lit from the left
  x.fillStyle = '#54503f'
  x.fillRect(0, 585, W, 12)
  const fc = x.createLinearGradient(0, 0, W, 0)
  fc.addColorStop(0, '#5a5044')
  fc.addColorStop(1, '#423a32')
  x.fillStyle = fc
  x.fillRect(0, 597, W, 268)
  for (let px = 0; px <= W; px += 220) {
    const pg = x.createLinearGradient(px, 0, px + 26, 0)
    pg.addColorStop(0, '#6e6252')
    pg.addColorStop(1, '#4a4036')
    x.fillStyle = pg
    x.fillRect(px, 585, 26, 280)
  }
  speckle(x, 0, 597, W, 268, 113, 500, [30, 26, 20], 0.03, 0.1, 3)
  // rooftop clutter peeking over the parapet
  for (const bx of [300, 1540]) {
    x.fillStyle = '#3a3a3e'
    x.fillRect(bx, 548, 90, 38)
    x.fillStyle = 'rgba(240,200,150,0.2)'
    x.fillRect(bx, 548, 90, 4)
  }
  // barber-pole mount column (the spinning pole itself is painted LIVE at 580,560)
  x.fillStyle = '#3c4046'
  x.fillRect(574, 370, 12, 216)
  x.fillStyle = '#565e66'
  for (const by of [420, 480, 540]) x.fillRect(571, by, 18, 6)
  x.fillStyle = '#2c3036'
  x.beginPath()
  x.ellipse(580, 586, 26, 7, 0, 0, 7)
  x.fill()
  // shopfront band: sidewalk, then lit bays
  x.fillStyle = '#57534b'
  x.fillRect(0, 856, W, 14)
  const bay = (bx, lit) => {
    x.fillStyle = '#33291f'
    x.fillRect(bx - 6, 634, 182, 208)
    if (!lit) {
      x.fillStyle = '#1c1916'
      x.fillRect(bx, 640, 170, 196)
      return
    }
    const wg2 = x.createLinearGradient(bx, 640, bx, 836)
    wg2.addColorStop(0, '#f0b872')
    wg2.addColorStop(1, '#b06a34')
    x.fillStyle = wg2
    x.fillRect(bx, 640, 170, 196)
    // interior shelving silhouettes
    x.fillStyle = 'rgba(60,30,12,0.55)'
    for (let sy = 668; sy < 812; sy += 36) x.fillRect(bx + 12, sy, 146, 8)
    for (let sx2 = bx + 20; sx2 < bx + 150; sx2 += 34) {
      x.fillStyle = 'rgba(60,30,12,0.35)'
      x.fillRect(sx2, 660, 10, 150)
    }
    const rf2 = x.createLinearGradient(bx, 640, bx + 170, 836)
    rf2.addColorStop(0.4, 'rgba(224,240,244,0)')
    rf2.addColorStop(0.5, 'rgba(224,240,244,0.10)')
    rf2.addColorStop(0.6, 'rgba(224,240,244,0)')
    x.fillStyle = rf2
    x.fillRect(bx, 640, 170, 196)
    x.fillStyle = 'rgba(255,232,190,0.35)'
    x.fillRect(bx, 640, 170, 3)
  }
  bay(150, true)
  bay(375, false)
  bay(600, true)
  bay(1275, true)
  bay(1500, false)
  bay(1725, true)
  // THE ENTRANCE: tall glass centered ~x1000 (the palms press HERE)
  x.fillStyle = '#33291f'
  x.fillRect(872, 592, 256, 264)
  const eg = x.createLinearGradient(880, 600, 1120, 856)
  eg.addColorStop(0, '#dfe8ea')
  eg.addColorStop(0.5, '#9ab4bc')
  eg.addColorStop(1, '#5a7078')
  x.fillStyle = eg
  x.fillRect(880, 600, 240, 256)
  x.fillStyle = 'rgba(240,210,160,0.30)'
  x.fillRect(880, 600, 240, 256)
  x.fillStyle = '#33291f'
  x.fillRect(996, 600, 8, 256)
  x.fillRect(880, 700, 240, 6)
  const erf = x.createLinearGradient(900, 620, 1100, 840)
  erf.addColorStop(0.35, 'rgba(230,244,248,0)')
  erf.addColorStop(0.5, 'rgba(230,244,248,0.16)')
  erf.addColorStop(0.62, 'rgba(230,244,248,0)')
  x.fillStyle = erf
  x.fillRect(880, 600, 240, 256)
  x.fillStyle = 'rgba(255,236,200,0.4)'
  x.fillRect(880, 600, 240, 3)
  // dead signage band above the bays (strip lighting)
  for (let px = 60; px < W; px += 300) {
    x.fillStyle = 'rgba(255,214,150,0.18)'
    x.fillRect(px, 612, 180, 6)
  }
  // THE SIGN: mounted on posts over the roofline, lit warm
  for (const px of [730, 1208]) {
    x.fillStyle = '#3a3630'
    x.fillRect(px, 508, 12, 80)
    x.fillStyle = 'rgba(240,200,150,0.2)'
    x.fillRect(px, 508, 4, 80)
  }
  const glow = x.createRadialGradient(975, 470, 30, 975, 470, 320)
  glow.addColorStop(0, 'rgba(255,190,110,0.20)')
  glow.addColorStop(1, 'rgba(255,190,110,0)')
  x.fillStyle = glow
  x.fillRect(655, 150, 640, 640)
  x.fillStyle = '#241a12'
  x.fillRect(700, 430, 550, 80)
  x.strokeStyle = '#8a5c34'
  x.lineWidth = 6
  x.strokeRect(703, 433, 544, 74)
  x.fillStyle = 'rgba(255,214,150,0.12)'
  x.fillRect(706, 436, 538, 10)
  txt(x, DRAWN.mall, 975, 484, { size: 46, font: F.anton, color: '#ffd9a0', align: 'center', glow: 'rgba(255,170,80,0.85)', glowBlur: 18, track: 4 })
  txt(x, DRAWN.mallSub, 975, 504, { size: 13, font: F.grot, weight: 700, color: '#c98858', align: 'center', track: 2 })
  // abandoned cars on the lot
  carPaint(x, 265, 920, 112, false, '#5a4a3c', 311, { rot: 0.05 })
  carPaint(x, 428, 910, 100, true, '#44525c', 312, { rot: -0.04 })
  carPaint(x, 1762, 916, 112, false, '#61443a', 313, { rot: 0.09 })
  return {
    canvas: c,
    ground: 930,
    poleX: 580,
    poleY: 560,
    signRect,
    roofSpot: { x: 960, y: 580 },
  }
}

// ---------- S4/S5: CUTZ GALLERY interior (one geometry, two light grades) ----------
// evening | night. Anchors align pixel-perfect between phases so cuts match.
const CHAIR_XS = [420, 620, 820, 1020, 1260, 1460]

export function bakeMallInt(phase) {
  const night = phase === 'night'
  const P = night
    ? {
        ceil: '#0d1210', ceilLo: '#080c0a', beam: '#151b18',
        wall: '#222a24', wallLo: '#161c18', wain: '#2a2018',
        strip: '#41524a', stripGlow: 0.12,
        floorA: '#4a4c46', floorB: '#1c2422', sheen: 0.05,
        glass: '#0b1214', frame: '#3a3026',
        ball: '#5a707c', ambient: 'rgba(4,8,10,0.42)',
      }
    : {
        ceil: '#2c322e', ceilLo: '#20261f', beam: '#3a4038',
        wall: '#465044', wallLo: '#333b32', wain: '#54402c',
        strip: '#e8f2ea', stripGlow: 0.5,
        floorA: '#a8a094', floorB: '#2c3a36', sheen: 0.10,
        glass: '#20323a', frame: '#6a5638',
        ball: '#9ab4c0', ambient: 'rgba(0,0,0,0)',
      }
  const c = canvas(W, H), x = c.getContext('2d')
  // ceiling with receding coffers
  x.fillStyle = P.ceil
  x.fillRect(0, 0, W, 300)
  x.fillStyle = P.ceilLo
  x.fillRect(0, 250, W, 50)
  for (const [by, bh] of [[70, 16], [160, 20], [250, 26]]) {
    x.fillStyle = P.beam
    x.fillRect(120, by, W - 240, bh)
    x.fillStyle = 'rgba(0,0,0,0.35)'
    x.fillRect(120, by + bh - 4, W - 240, 4)
  }
  x.fillStyle = 'rgba(255,255,255,0.03)'
  x.fillRect(0, 0, W, 40)
  // fluoro strips (night: dim and half-dead)
  const strip = (sy, sx0, sx1) => {
    x.fillStyle = P.beam
    x.fillRect(sx0, sy - 8, sx1 - sx0, 8)
    x.fillStyle = P.strip
    x.fillRect(sx0 + 10, sy - 6, sx1 - sx0 - 20, 5)
    if (!night || sy < 200) {
      const g = x.createRadialGradient((sx0 + sx1) / 2, sy, 20, (sx0 + sx1) / 2, sy, 480)
      g.addColorStop(0, `rgba(226,244,236,${P.stripGlow})`)
      g.addColorStop(1, 'rgba(226,244,236,0)')
      x.fillStyle = g
      x.fillRect(sx0 - 400, sy - 160, sx1 - sx0 + 800, 340)
    }
  }
  strip(120, 240, 1680)
  strip(224, 380, 1540)
  // back wall + wainscot
  const wg2 = x.createLinearGradient(0, 300, 0, 700)
  wg2.addColorStop(0, P.wall)
  wg2.addColorStop(1, P.wallLo)
  x.fillStyle = wg2
  x.fillRect(0, 300, W, 400)
  x.fillStyle = P.wain
  x.fillRect(0, 610, W, 90)
  x.fillStyle = 'rgba(0,0,0,0.4)'
  x.fillRect(0, 610, W, 5)
  for (let px = 30; px < W; px += 130) {
    x.fillStyle = 'rgba(255,255,255,0.035)'
    x.fillRect(px, 320, 2, 280)
  }
  speckle(x, 0, 300, W, 400, 121, 420, [10, 14, 10], 0.03, 0.1, 3)
  // glass entry doors (anchor rect) — film draws glass/cracks/palms OVER this
  x.fillStyle = P.frame
  x.fillRect(798, 418, 324, 282)
  x.fillStyle = P.glass
  x.fillRect(810, 430, 300, 270)
  x.fillStyle = 'rgba(0,0,0,0.30)'
  x.fillRect(810, 430, 300, 270)
  x.fillStyle = P.frame
  x.fillRect(954, 430, 12, 270)
  // push bars + kick plates
  x.fillStyle = '#8a9298'
  x.fillRect(822, 636, 126, 10)
  x.fillRect(972, 636, 126, 10)
  x.fillStyle = 'rgba(230,240,244,0.25)'
  x.fillRect(822, 636, 126, 3)
  x.fillRect(972, 636, 126, 3)
  x.fillStyle = '#5a6268'
  x.fillRect(814, 664, 292, 32)
  x.fillStyle = 'rgba(0,0,0,0.35)'
  x.fillRect(814, 690, 292, 6)
  // EXIT box above the doors (warm green pill, no text)
  x.fillStyle = '#101512'
  x.fillRect(930, 386, 60, 26)
  x.fillStyle = night ? 'rgba(90,160,110,0.5)' : 'rgba(120,220,150,0.8)'
  x.beginPath()
  x.roundRect(938, 392, 44, 14, 7)
  x.fill()
  // CHAIR 3 hanging station sign at the chair3 x
  x.strokeStyle = '#4a4438'
  x.lineWidth = 2
  x.beginPath()
  x.moveTo(1058, 300)
  x.lineTo(1072, 356)
  x.moveTo(1122, 300)
  x.lineTo(1108, 356)
  x.stroke()
  x.fillStyle = '#20262a'
  x.beginPath()
  x.roundRect(1038, 356, 104, 34, 5)
  x.fill()
  x.strokeStyle = '#5a6268'
  x.lineWidth = 2
  x.strokeRect(1041, 359, 98, 28)
  txt(x, DRAWN.chair3, 1090, 379, { size: 16, font: F.grot, weight: 700, color: '#cfe0d8', align: 'center', track: 2 })
  // mirror wall along the LEFT (anchor band x 90..330, top at mirrorY)
  const mirrorY = 400
  x.fillStyle = '#6a5434'
  x.fillRect(60, mirrorY - 24, 300, 292)
  x.fillStyle = '#8a703f'
  x.fillRect(60, mirrorY - 24, 300, 5)
  const mg = x.createLinearGradient(90, mirrorY, 330, mirrorY + 240)
  mg.addColorStop(0, '#3c4a50')
  mg.addColorStop(0.55, '#2a363c')
  mg.addColorStop(1, '#1a2428')
  x.fillStyle = mg
  x.fillRect(90, mirrorY, 240, 240)
  // dim smudged reflections: doors + ball ghosts, vertical smears
  x.fillStyle = 'rgba(150,180,190,0.07)'
  x.fillRect(150, mirrorY + 60, 90, 180)
  x.beginPath()
  x.arc(210, mirrorY + 40, 16, 0, 7)
  x.fill()
  for (let i = 0; i < 6; i++) {
    x.fillStyle = `rgba(220,236,240,${0.02 + h2(i, 4, 6) * 0.035})`
    x.fillRect(96 + i * 38, mirrorY + 4, 16, 232)
  }
  x.strokeStyle = 'rgba(226,242,246,0.10)'
  x.lineWidth = 3
  x.strokeRect(93, mirrorY + 3, 234, 234)
  x.strokeStyle = '#6a5434'
  x.lineWidth = 6
  x.strokeRect(90, mirrorY, 240, 240)
  // station counters below the mirrors
  const cg2 = x.createLinearGradient(0, 660, 0, 910)
  cg2.addColorStop(0, '#7a5c3a')
  cg2.addColorStop(0.14, '#5a442c')
  cg2.addColorStop(1, '#3a2c1c')
  x.fillStyle = cg2
  x.fillRect(60, 660, 300, 250)
  x.fillStyle = 'rgba(255,230,190,0.22)'
  x.fillRect(60, 660, 300, 5)
  x.fillStyle = 'rgba(0,0,0,0.35)'
  x.fillRect(60, 672, 300, 6)
  for (let dy2 = 700; dy2 < 900; dy2 += 66) {
    x.fillStyle = 'rgba(16,10,6,0.5)'
    x.fillRect(76, dy2, 268, 3)
    x.fillStyle = '#8a8070'
    x.fillRect(190, dy2 + 12, 40, 5)
  }
  // right-hand back counter + shelf (sink zone x 1450..1710 floor stays CLEAR)
  x.fillStyle = P.wain
  x.fillRect(1760, 560, 160, 150)
  x.fillStyle = 'rgba(255,230,190,0.14)'
  x.fillRect(1760, 560, 160, 4)
  x.fillStyle = '#6e6252'
  x.fillRect(1748, 620, 172, 10)
  x.fillStyle = '#8a9298'
  x.fillRect(1790, 700, 60, 8)
  // mirror ball + cord (static; gleams are live)
  x.strokeStyle = '#3c4248'
  x.lineWidth = 2
  x.beginPath()
  x.moveTo(960, 250)
  x.lineTo(960, 305)
  x.stroke()
  const ball = x.createRadialGradient(952, 322, 3, 960, 330, 27)
  ball.addColorStop(0, '#dce8ec')
  ball.addColorStop(0.5, P.ball)
  ball.addColorStop(1, night ? '#232e34' : '#4e626e')
  x.fillStyle = ball
  x.beginPath()
  x.arc(960, 330, 26, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(240,248,252,0.22)'
  x.lineWidth = 1
  for (let fy = 312; fy < 352; fy += 7) {
    x.beginPath()
    x.ellipse(960, 330, 26 * Math.sqrt(Math.max(0, 1 - ((fy - 330) * (fy - 330)) / 676)), 2.2, 0, 0, 7)
    x.stroke()
  }
  x.fillStyle = 'rgba(255,255,255,0.5)'
  x.beginPath()
  x.arc(952, 322, 5, 0, 7)
  x.fill()
  // checkered floor in gentle perspective (ground 910 for the cast)
  x.fillStyle = P.floorB
  x.fillRect(0, 700, W, 380)
  const rows = 9
  let fy = 700
  let tile = 44
  for (let rI = 0; rI < rows; rI++) {
    const rh = 10 + Math.round(3.2 * rI * rI)
    const rhC = Math.min(rh, 1080 - fy)
    const par = rI % 2
    for (let col = -14; col < 14; col++) {
      if ((col + par) & 1) continue
      x.fillStyle = P.floorA
      x.fillRect(960 + col * tile - tile / 2, fy, tile, rhC)
    }
    // grout line + per-row wear
    x.fillStyle = 'rgba(0,0,0,0.30)'
    x.fillRect(0, fy, W, 2)
    speckle(x, 0, fy, W, rhC, 130 + rI * 3, 40 + rI * 14, [0, 0, 0], 0.06, 0.2, 3)
    fy += rhC
    tile = Math.round(tile * 1.28)
    if (fy >= 1080) break
  }
  // sheen band under the fluoros
  for (const [scx, sw2] of [[960, 700], [420, 300], [1500, 300]]) {
    const sg = x.createRadialGradient(scx, 800, 20, scx, 800, sw2)
    sg.addColorStop(0, `rgba(226,244,236,${P.sheen})`)
    sg.addColorStop(1, 'rgba(226,244,236,0)')
    x.fillStyle = sg
    x.fillRect(scx - sw2, 700, sw2 * 2, 380)
  }
  // contact shadows: soft pools under the counters and doors
  for (const [scx, sw2, syy] of [[210, 200, 912], [960, 190, 712], [640, 120, 916], [1300, 120, 916]]) {
    const shg = x.createRadialGradient(scx, syy, 4, scx, syy, sw2)
    shg.addColorStop(0, 'rgba(0,0,0,0.34)')
    shg.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = shg
    x.save()
    x.translate(scx, syy)
    x.scale(1, 0.16)
    x.beginPath()
    x.arc(0, 0, sw2, 0, 7)
    x.fill()
    x.restore()
  }
  // six styling chairs at their station anchors (ON the finished floor)
  for (const chx of CHAIR_XS) {
    const baseY = 902 + (chx > 1000 ? 4 : 0)
    x.fillStyle = 'rgba(0,0,0,0.30)'
    x.beginPath()
    x.ellipse(chx + 6, baseY + 3, 38, 7, 0, 0, 7)
    x.fill()
    x.fillStyle = '#262a30'
    x.fillRect(chx - 6, baseY - 44, 12, 44)
    x.fillStyle = '#31363d'
    x.beginPath()
    x.ellipse(chx, baseY, 26, 7, 0, 0, 7)
    x.fill()
    x.fillStyle = night ? '#3a1c22' : '#5c2a34'
    x.beginPath()
    x.roundRect(chx - 26, baseY - 64, 52, 22, 8)
    x.fill()
    x.save()
    x.translate(chx - 20, baseY - 58)
    x.rotate(0.14)
    x.fillStyle = night ? '#3a1c22' : '#5c2a34'
    x.beginPath()
    x.roundRect(-7, -52, 16, 54, 6)
    x.fill()
    x.restore()
    // chrome T-foot
    x.fillStyle = '#3c4248'
    x.fillRect(chx - 18, baseY + 2, 36, 4)
  }
  // night grade: dim wash + sodium pools by the doors
  if (night) {
    x.fillStyle = P.ambient
    x.fillRect(0, 0, W, H)
    for (const [px, py, pr2, pa] of [[900, 780, 220, 0.15], [1060, 800, 200, 0.13], [300, 760, 170, 0.08]]) {
      const g2 = x.createRadialGradient(px, py, 8, px, py, pr2)
      g2.addColorStop(0, `rgba(255,154,60,${pa})`)
      g2.addColorStop(1, 'rgba(255,154,60,0)')
      x.fillStyle = g2
      x.fillRect(px - pr2, py - pr2, pr2 * 2, pr2 * 2)
    }
  }
  return {
    canvas: c,
    ground: 910,
    doors: { x: 810, y: 430, w: 300, h: 270 },
    mirrorY,
    chairs: CHAIR_XS.slice(),
    sinkX: 1580,
    ballX: 960,
    ballY: 330,
    chair3: { x: 1090 },
  }
}

// ---------- S6: rooftop (sky above the parapet stays TRANSPARENT) ----------
export function bakeRooftop() {
  const c = canvas(W, H), x = c.getContext('2d')
  const parapetY = 870
  // distant Hairham skyline strip behind the parapet (mall glow low right)
  const r = rng(666)
  for (let i = 0; i < 26; i++) {
    const bw = 40 + r() * 110
    const bh = 22 + r() * 84
    const bx = r() * W
    x.fillStyle = 'rgba(22,30,38,0.85)'
    x.fillRect(bx, 772 - bh, bw, bh)
    if (r() > 0.6) {
      x.fillStyle = 'rgba(255,217,138,0.30)'
      for (let wy = 772 - bh + 8; wy < 768; wy += 12) x.fillRect(bx + 6 + r() * (bw - 12), wy, 4, 4)
    }
  }
  x.fillStyle = 'rgba(16,24,30,0.5)'
  x.fillRect(0, 660, W, 120)
  const mallGlow = x.createRadialGradient(1500, 762, 12, 1500, 762, 240)
  mallGlow.addColorStop(0, 'rgba(255,154,94,0.22)')
  mallGlow.addColorStop(1, 'rgba(255,154,94,0)')
  x.fillStyle = mallGlow
  x.fillRect(1260, 522, 480, 480)
  x.fillStyle = 'rgba(255,170,100,0.14)'
  x.fillRect(1420, 740, 170, 32)
  // parapet: gravel cap (the cast stands on it) + opaque wall face below
  const cap = x.createLinearGradient(0, 854, 0, 870)
  cap.addColorStop(0, '#7a7266')
  cap.addColorStop(1, '#5c554a')
  x.fillStyle = cap
  x.fillRect(0, 854, W, 16)
  speckle(x, 0, 854, W, 16, 141, 500, [230, 220, 200], 0.05, 0.16, 2)
  x.fillStyle = 'rgba(255,200,160,0.16)'
  x.fillRect(0, 854, W, 3)
  const pwg = x.createLinearGradient(0, 870, 0, 1080)
  pwg.addColorStop(0, '#3a342e')
  pwg.addColorStop(1, '#1c1814')
  x.fillStyle = pwg
  x.fillRect(0, 870, W, 210)
  for (let by = 884; by < 1080; by += 22) {
    x.fillStyle = 'rgba(8,6,4,0.4)'
    x.fillRect(0, by, W, 2)
  }
  speckle(x, 0, 870, W, 210, 142, 400, [120, 100, 80], 0.02, 0.08, 3)
  // roof door hut (STAFF ONLY) at door.x
  x.fillStyle = '#3a3f3a'
  x.fillRect(190, 640, 150, 216)
  x.fillStyle = '#4a504a'
  x.fillRect(184, 632, 162, 14)
  x.fillStyle = 'rgba(240,210,170,0.12)'
  x.fillRect(340, 640, 6, 216)
  const hd = x.createLinearGradient(225, 0, 300, 0)
  hd.addColorStop(0, '#4a3a2a')
  hd.addColorStop(1, '#33261a')
  x.fillStyle = hd
  x.fillRect(225, 690, 76, 166)
  x.fillStyle = 'rgba(10,6,4,0.5)'
  x.fillRect(232, 700, 62, 66)
  x.fillRect(232, 776, 62, 70)
  x.fillStyle = '#8a9298'
  x.fillRect(288, 766, 5, 12)
  x.fillStyle = '#20262a'
  x.fillRect(222, 662, 82, 20)
  x.strokeStyle = '#5a6268'
  x.lineWidth = 1.5
  x.strokeRect(225, 665, 76, 14)
  txt(x, DRAWN.roof, 260, 677, { size: 11, font: F.grot, weight: 700, color: '#c9d4cc', align: 'center', track: 2 })
  // AC unit + fan grill
  x.fillStyle = '#4e5258'
  x.fillRect(880, 778, 200, 86)
  x.fillStyle = '#5c6066'
  x.fillRect(874, 772, 212, 10)
  x.fillStyle = '#26292e'
  x.beginPath()
  x.arc(980, 818, 30, 0, 7)
  x.fill()
  x.strokeStyle = '#6e747a'
  x.lineWidth = 2
  for (let i = 0; i < 6; i++) {
    const aa = (i / 6) * Math.PI * 2
    x.beginPath()
    x.moveTo(980, 818)
    x.lineTo(980 + Math.cos(aa) * 28, 818 + Math.sin(aa) * 28)
    x.stroke()
  }
  x.fillStyle = 'rgba(240,210,170,0.14)'
  x.fillRect(880, 778, 200, 4)
  // vent pipes
  for (const vx of [1256, 1300, 1344]) {
    x.fillStyle = '#3e4248'
    x.fillRect(vx, 822, 16, 42)
    x.fillStyle = '#565c62'
    x.beginPath()
    x.ellipse(vx + 8, 822, 12, 5, 0, 0, 7)
    x.fill()
  }
  // antenna + sagging cable
  x.strokeStyle = '#3e4248'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(1520, 856)
  x.lineTo(1520, 560)
  x.stroke()
  for (const ay of [600, 640, 680]) {
    x.lineWidth = 2
    x.beginPath()
    x.moveTo(1504, ay)
    x.lineTo(1536, ay)
    x.stroke()
  }
  x.strokeStyle = 'rgba(30,34,40,0.8)'
  x.lineWidth = 2
  x.beginPath()
  x.moveTo(330, 700)
  x.quadraticCurveTo(600, 800, 880, 780)
  x.stroke()
  return { canvas: c, ground: 930, parapetY, door: { x: 262 }, skylineY: 700 }
}

// ============================== live painters ==============================

// Small news helicopter; (x, y) is the BODY CENTER. o.light adds the nose
// spotlight + downward cone, o.bank tilts the whole ship.
export function drawChopper(ctx, x, y, s, t, o = {}) {
  ctx.save()
  ctx.translate(x, y)
  if (o.bank) ctx.rotate(o.bank)
  ctx.scale(s, s)
  const rot = t * 30
  if (o.light) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const cg = ctx.createLinearGradient(0, 8, -60, 560)
    cg.addColorStop(0, 'rgba(224,238,246,0.28)')
    cg.addColorStop(1, 'rgba(224,238,246,0)')
    ctx.fillStyle = cg
    ctx.beginPath()
    ctx.moveTo(-44, 6)
    ctx.lineTo(-34, 6)
    ctx.lineTo(-170, 560)
    ctx.lineTo(60, 560)
    ctx.closePath()
    ctx.fill()
    const lg = ctx.createRadialGradient(-40, 4, 2, -40, 4, 30)
    lg.addColorStop(0, 'rgba(244,250,254,0.9)')
    lg.addColorStop(1, 'rgba(244,250,254,0)')
    ctx.fillStyle = lg
    ctx.fillRect(-72, -28, 64, 64)
    ctx.restore()
  }
  // tail boom + fin
  ctx.fillStyle = '#28343e'
  ctx.beginPath()
  ctx.moveTo(22, -7)
  ctx.quadraticCurveTo(70, -13, 116, -9)
  ctx.lineTo(116, 1)
  ctx.quadraticCurveTo(70, 3, 22, 9)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(200,220,232,0.14)'
  ctx.fillRect(30, -9, 80, 2)
  ctx.fillStyle = '#33424e'
  ctx.beginPath()
  ctx.moveTo(108, -4)
  ctx.lineTo(124, -34)
  ctx.lineTo(132, -32)
  ctx.lineTo(124, -2)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(110, 0)
  ctx.lineTo(128, 14)
  ctx.lineTo(120, 16)
  ctx.lineTo(106, 4)
  ctx.closePath()
  ctx.fill()
  // tail rotor (spinning blur)
  ctx.save()
  ctx.translate(126, -8)
  ctx.strokeStyle = 'rgba(210,226,236,0.6)'
  ctx.lineWidth = 2.5
  for (let k = 0; k < 3; k++) {
    const a = rot * 1.4 + (k * Math.PI) / 3
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3)
    ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(190,210,224,0.16)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, 15, 0, 7)
  ctx.stroke()
  ctx.restore()
  // body
  const bg = ctx.createLinearGradient(0, -22, 0, 22)
  bg.addColorStop(0, '#42586a')
  bg.addColorStop(0.5, '#2c3c4a')
  bg.addColorStop(1, '#18232c')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.moveTo(-48, -4)
  ctx.quadraticCurveTo(-46, -18, -26, -21)
  ctx.quadraticCurveTo(0, -25, 22, -18)
  ctx.quadraticCurveTo(32, -14, 30, -2)
  ctx.quadraticCurveTo(30, 12, 14, 18)
  ctx.quadraticCurveTo(-12, 24, -34, 16)
  ctx.quadraticCurveTo(-48, 12, -48, -4)
  ctx.closePath()
  ctx.fill()
  // canopy
  ctx.fillStyle = '#0f1a22'
  ctx.beginPath()
  ctx.moveTo(-44, -4)
  ctx.quadraticCurveTo(-42, -14, -26, -17)
  ctx.quadraticCurveTo(-12, -19, -2, -16)
  ctx.lineTo(-8, 6)
  ctx.quadraticCurveTo(-28, 10, -40, 6)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(190,220,236,0.20)'
  ctx.beginPath()
  ctx.moveTo(-38, -8)
  ctx.quadraticCurveTo(-30, -14, -16, -14)
  ctx.lineTo(-18, -9)
  ctx.quadraticCurveTo(-30, -8, -36, -5)
  ctx.closePath()
  ctx.fill()
  // round nose light
  ctx.fillStyle = '#8a929a'
  ctx.beginPath()
  ctx.arc(-44, 0, 7.5, 0, 7)
  ctx.fill()
  ctx.fillStyle = o.light ? '#f4f8fc' : '#cfe0ea'
  ctx.beginPath()
  ctx.arc(-45, 0, 5, 0, 7)
  ctx.fill()
  // mast + main rotor (arc blur + sweeping blades)
  ctx.fillStyle = '#222c34'
  ctx.fillRect(-3, -34, 6, 16)
  ctx.strokeStyle = 'rgba(200,218,230,0.16)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.ellipse(0, -36, 96, 7, 0, 0, 7)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(214,230,240,0.55)'
  ctx.lineWidth = 2.5
  for (let k = 0; k < 3; k++) {
    const a = rot + (k * Math.PI * 2) / 3
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 11, -36 + Math.sin(a) * 0.7)
    ctx.lineTo(Math.cos(a) * 96, -36 + Math.sin(a) * 6)
    ctx.stroke()
  }
  // skids
  ctx.strokeStyle = '#3c4650'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-22, 14)
  ctx.lineTo(-26, 44)
  ctx.moveTo(16, 14)
  ctx.lineTo(20, 44)
  ctx.stroke()
  ctx.strokeStyle = '#2a333c'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-44, 46)
  ctx.quadraticCurveTo(0, 50, 44, 46)
  ctx.stroke()
  // roundel + side text (readable from s 0.8 up)
  ctx.fillStyle = '#b3282e'
  ctx.beginPath()
  ctx.arc(20, -2, 5.5, 0, 7)
  ctx.fill()
  if (s >= 0.8) txt(ctx, DRAWN.chopper, 66, -2, { size: 11, font: F.grot, weight: 700, color: '#c9d6de', align: 'center' })
  ctx.restore()
}

// Classic spinning barber pole at (x, base y): cylinder ~26x180 with scrolling
// diagonal red/blue stripes on white, chrome caps + wall bracket.
export function drawPole(ctx, x, y, s, t) {
  const w = 26 * s, h = 180 * s
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#3a3f45'
  ctx.beginPath()
  ctx.roundRect(-w * 0.62, -h - 6 * s, w * 1.24, h + 12 * s, 4 * s)
  ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(-w * 0.62, -h - 6 * s, w * 1.24, 3 * s)
  const cyl = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
  cyl.addColorStop(0, '#e8e4da')
  cyl.addColorStop(0.35, '#fbf8f0')
  cyl.addColorStop(0.75, '#c9c4b8')
  cyl.addColorStop(1, '#8f8a80')
  ctx.fillStyle = cyl
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h, w, h, 3 * s)
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h, w, h, 3 * s)
  ctx.clip()
  const pitch = 46 * s
  const phase = (t * 34 * s) % pitch
  for (let i = -1; i < h / pitch + 3; i++) {
    const yy = -h - pitch + i * pitch + phase
    ctx.fillStyle = '#b3282e'
    ctx.beginPath()
    ctx.moveTo(-w / 2, yy)
    ctx.lineTo(w / 2, yy - 14 * s)
    ctx.lineTo(w / 2, yy + 6 * s)
    ctx.lineTo(-w / 2, yy + 20 * s)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#284a86'
    ctx.beginPath()
    ctx.moveTo(-w / 2, yy + 23 * s)
    ctx.lineTo(w / 2, yy + 9 * s)
    ctx.lineTo(w / 2, yy + 29 * s)
    ctx.lineTo(-w / 2, yy + 43 * s)
    ctx.closePath()
    ctx.fill()
  }
  const sh = ctx.createLinearGradient(-w / 2, 0, 0, 0)
  sh.addColorStop(0, 'rgba(255,255,255,0.30)')
  sh.addColorStop(0.4, 'rgba(255,255,255,0.05)')
  sh.addColorStop(1, 'rgba(10,10,14,0.22)')
  ctx.fillStyle = sh
  ctx.fillRect(-w / 2, -h, w, h)
  ctx.restore()
  for (const [cy, ch2] of [[-h, 9 * s], [0, 8 * s]]) {
    const cg = ctx.createLinearGradient(0, cy - ch2, 0, cy + ch2)
    cg.addColorStop(0, '#e8ecf2')
    cg.addColorStop(0.5, '#9aa2ac')
    cg.addColorStop(1, '#4e565e')
    ctx.fillStyle = cg
    ctx.beginPath()
    ctx.ellipse(0, cy, w * 0.62, ch2, 0, 0, 7)
    ctx.fill()
  }
  ctx.fillStyle = '#4e565e'
  ctx.beginPath()
  ctx.ellipse(0, 2 * s, w * 0.8, 5 * s, 0, 0, 7)
  ctx.fill()
  ctx.restore()
}

// Heavy barber styling chair; rotated about its center, (x, groundY) at the floor.
export function drawChair(ctx, x, groundY, s, rot = 0, flip = false) {
  ctx.save()
  ctx.translate(x, groundY - 62 * s)
  if (rot) ctx.rotate(rot)
  ctx.scale((flip ? -1 : 1) * s, s)
  ctx.fillStyle = '#14161a'
  ctx.beginPath()
  ctx.ellipse(0, 60, 40, 10, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#2b2f36'
  ctx.beginPath()
  ctx.ellipse(0, 56, 34, 8, 0, 0, 7)
  ctx.fill()
  const cg = ctx.createLinearGradient(-7, 0, 7, 0)
  cg.addColorStop(0, '#9aa2aa')
  cg.addColorStop(0.5, '#565e66')
  cg.addColorStop(1, '#2e343a')
  ctx.fillStyle = cg
  ctx.fillRect(-7, -14, 14, 70)
  ctx.fillStyle = '#3a4046'
  ctx.beginPath()
  ctx.roundRect(20, 34, 34, 9, 4)
  ctx.fill()
  ctx.fillStyle = '#22262b'
  ctx.fillRect(24, 43, 26, 4)
  const sg = ctx.createLinearGradient(0, -26, 0, 4)
  sg.addColorStop(0, '#6e3038')
  sg.addColorStop(0.6, '#54222c')
  sg.addColorStop(1, '#38141c')
  ctx.fillStyle = sg
  ctx.beginPath()
  ctx.roundRect(-34, -24, 62, 26, 9)
  ctx.fill()
  ctx.save()
  ctx.translate(-26, -20)
  ctx.rotate(0.16)
  const bg2 = ctx.createLinearGradient(0, -76, 0, 0)
  bg2.addColorStop(0, '#6e3038')
  bg2.addColorStop(1, '#3a141c')
  ctx.fillStyle = bg2
  ctx.beginPath()
  ctx.roundRect(-9, -76, 20, 80, 8)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,220,220,0.10)'
  ctx.beginPath()
  ctx.roundRect(-6, -72, 6, 70, 3)
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = '#8a929a'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(8, -26)
  ctx.quadraticCurveTo(26, -30, 28, -8)
  ctx.stroke()
  ctx.fillStyle = '#54222c'
  ctx.beginPath()
  ctx.roundRect(-30, -92, 24, 16, 7)
  ctx.fill()
  ctx.restore()
}

// Hand clippers ~34px at s=1; on = vibrating teeth + warm hum glow. (x, y) center.
export function drawClippers(ctx, x, y, s, on, t, o = {}) {
  ctx.save()
  ctx.translate(x, y)
  if (o.rot) ctx.rotate(o.rot)
  ctx.scale(s, s)
  if (on) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const gl = ctx.createRadialGradient(8, 0, 2, 8, 0, 26)
    gl.addColorStop(0, 'rgba(255,206,140,0.38)')
    gl.addColorStop(1, 'rgba(255,206,140,0)')
    ctx.fillStyle = gl
    ctx.fillRect(-22, -26, 60, 52)
    ctx.restore()
  }
  const g = ctx.createLinearGradient(0, -8, 0, 9)
  g.addColorStop(0, '#4a4f58')
  g.addColorStop(0.5, '#33383f')
  g.addColorStop(1, '#1f242a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(-17, -7, 27, 14, 5)
  ctx.fill()
  ctx.fillStyle = '#14181c'
  ctx.fillRect(-15, 2, 22, 3)
  ctx.fillStyle = '#c9a23c'
  ctx.fillRect(2, -8.5, 6, 2)
  ctx.fillStyle = '#9aa4ae'
  ctx.beginPath()
  ctx.roundRect(8, -6, 9, 12, 2)
  ctx.fill()
  const jx = on ? (hash(Math.floor(t * 90) + 3) - 0.5) * 1.3 : 0
  ctx.fillStyle = '#d8e0e8'
  for (let i = 0; i < 5; i++) ctx.fillRect(17 + jx, -5.5 + i * 2.4, 3.4 - (i % 2) * 0.8, 1.3)
  ctx.restore()
}

// Inspection mirror on a long pole; (x, y) at the base/hand, rot tilts it over.
export function drawMirrorPole(ctx, x, y, s, rot = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  const len = 185 * s
  const pg = ctx.createLinearGradient(-3 * s, 0, 3 * s, 0)
  pg.addColorStop(0, '#8a9298')
  pg.addColorStop(0.4, '#5a6268')
  pg.addColorStop(1, '#33393e')
  ctx.fillStyle = pg
  ctx.fillRect(-2.6 * s, -len, 5.2 * s, len)
  ctx.fillStyle = '#241a12'
  ctx.beginPath()
  ctx.roundRect(-4.4 * s, -26 * s, 8.8 * s, 30 * s, 4 * s)
  ctx.fill()
  ctx.translate(0, -len)
  ctx.fillStyle = '#3c4248'
  ctx.beginPath()
  ctx.ellipse(0, 0, 17 * s, 12 * s, 0, 0, 7)
  ctx.fill()
  const gg = ctx.createLinearGradient(-14 * s, -8 * s, 12 * s, 8 * s)
  gg.addColorStop(0, '#54707a')
  gg.addColorStop(0.5, '#31444c')
  gg.addColorStop(1, '#1c2a30')
  ctx.fillStyle = gg
  ctx.beginPath()
  ctx.ellipse(0, -1.5 * s, 14 * s, 9.5 * s, 0, 0, 7)
  ctx.fill()
  ctx.strokeStyle = 'rgba(220,236,242,0.5)'
  ctx.lineWidth = 1.6 * s
  ctx.beginPath()
  ctx.ellipse(0, -1.5 * s, 14 * s, 9.5 * s, 0, 0, 7)
  ctx.stroke()
  ctx.fillStyle = 'rgba(230,244,248,0.30)'
  ctx.beginPath()
  ctx.ellipse(-4 * s, -4 * s, 5 * s, 2.6 * s, -0.5, 0, 7)
  ctx.fill()
  ctx.restore()
}

// Nailed wooden plank; (x, y) is its top-left, w its width.
export function drawBoard(ctx, x, y, w, rot = 0) {
  const h = Math.max(16, Math.round(w * 0.085))
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate(rot)
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#8a6a44')
  g.addColorStop(0.45, '#6e5233')
  g.addColorStop(1, '#4a3620')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const r = rng(Math.round(w) * 13 + 5)
  ctx.strokeStyle = 'rgba(46,32,18,0.5)'
  ctx.lineWidth = 1
  for (let i = 0; i < 4; i++) {
    const gy = 2 + ((i + r() * 0.6) * (h - 4)) / 4
    ctx.beginPath()
    ctx.moveTo(2, gy)
    ctx.bezierCurveTo(w * 0.3, gy + (r() - 0.5) * 3, w * 0.7, gy + (r() - 0.5) * 3, w - 2, gy + (r() - 0.5) * 2)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,232,190,0.14)'
  ctx.fillRect(0, 0, w, 2)
  ctx.fillStyle = 'rgba(30,20,10,0.5)'
  ctx.fillRect(0, 0, 3, h)
  ctx.fillRect(w - 3, 0, 3, h)
  for (const nx of [7, w - 9]) {
    ctx.fillStyle = '#2a2a2e'
    ctx.beginPath()
    ctx.arc(nx, h * 0.5, 2.4, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#8a8a92'
    ctx.beginPath()
    ctx.arc(nx - 0.7, h * 0.5 - 0.7, 1.1, 0, 7)
    ctx.fill()
  }
  ctx.restore()
}

// Window blinds: u 0 = slats stacked at the top, 1 = full cover with slat lines.
export function drawBlinds(ctx, rect, u) {
  const uu = clamp01(u)
  const n = 9
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip()
  ctx.fillStyle = 'rgba(10,14,16,0.30)'
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  ctx.fillStyle = '#23282c'
  ctx.fillRect(rect.x, rect.y, rect.w, 10)
  ctx.fillStyle = 'rgba(255,255,255,0.10)'
  ctx.fillRect(rect.x, rect.y, rect.w, 2)
  const openH = rect.h * 0.2
  const pitch = (rect.h - 10) / n
  for (let i = 0; i < n; i++) {
    const closedY = rect.y + 10 + i * pitch
    const stackedY = rect.y + 12 + i * ((openH - 12) / n)
    const sy = lerp(stackedY, closedY, uu)
    const sh2 = lerp((openH / n) * 0.85, pitch * 0.86, uu)
    const g = ctx.createLinearGradient(0, sy, 0, sy + sh2)
    g.addColorStop(0, '#39424a')
    g.addColorStop(0.5, '#2c343b')
    g.addColorStop(1, '#1d2329')
    ctx.fillStyle = g
    ctx.fillRect(rect.x + 2, sy, rect.w - 4, sh2)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(rect.x + 2, sy + sh2 - 1.5, rect.w - 4, 1.5)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fillRect(rect.x + 2, sy, rect.w - 4, 1)
  }
  const shg = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h * 0.4)
  shg.addColorStop(0, 'rgba(0,0,0,0.26)')
  shg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = shg
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h * 0.4)
  ctx.restore()
}

// Canvas duffel bag with strap.
export function drawDuffel(ctx, x, y, s, rot = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(s, s)
  ctx.strokeStyle = '#3a3020'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(0, 6, 26, Math.PI * 1.12, Math.PI * 1.88)
  ctx.stroke()
  const g = ctx.createLinearGradient(0, -16, 0, 16)
  g.addColorStop(0, '#6e5c3a')
  g.addColorStop(0.5, '#57482c')
  g.addColorStop(1, '#3a3020')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(-34, -15, 68, 30, 14)
  ctx.fill()
  ctx.strokeStyle = 'rgba(20,14,8,0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-20, -14.5)
  ctx.lineTo(-20, 14.5)
  ctx.moveTo(20, -14.5)
  ctx.lineTo(20, 14.5)
  ctx.stroke()
  ctx.strokeStyle = '#8a7444'
  ctx.beginPath()
  ctx.moveTo(-30, -2)
  ctx.lineTo(30, -2)
  ctx.stroke()
  ctx.fillStyle = '#c9a23c'
  ctx.fillRect(24, -5, 5, 4)
  ctx.fillStyle = 'rgba(255,240,210,0.14)'
  ctx.fillRect(-28, -12, 50, 3)
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.fillRect(-30, 9, 60, 4)
  ctx.restore()
}

// Open straight razor: resin handle + steel blade off the pivot. (x, y) center.
export function drawRazor(ctx, x, y, s, rot = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(s, s)
  ctx.save()
  ctx.rotate(-0.16)
  const bg = ctx.createLinearGradient(0, -3.5, 0, 4)
  bg.addColorStop(0, '#e8eef4')
  bg.addColorStop(0.6, '#b9c2cc')
  bg.addColorStop(1, '#7a828c')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.moveTo(2, -3.5)
  ctx.lineTo(30, -3)
  ctx.quadraticCurveTo(34, 0, 30, 3.4)
  ctx.lineTo(2, 3.4)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f6fafc'
  ctx.fillRect(4, -3, 24, 1)
  ctx.restore()
  const hg = ctx.createLinearGradient(0, -4, 0, 5)
  hg.addColorStop(0, '#4a3020')
  hg.addColorStop(1, '#241608')
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.roundRect(-30, -4, 33, 8.5, 4)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,220,180,0.16)'
  ctx.fillRect(-27, -3, 27, 1.5)
  ctx.fillStyle = '#c9a23c'
  ctx.fillRect(0, -4, 3, 8.5)
  ctx.restore()
}

// Barber sink + counter + deep basin: a 1.45x sprite behind it keeps only the
// head and shoulders above the counter.
export function drawSink(ctx, x, groundY, s) {
  ctx.save()
  ctx.translate(x, groundY)
  ctx.scale(s, s)
  const cg = ctx.createLinearGradient(0, -150, 0, 0)
  cg.addColorStop(0, '#57422e')
  cg.addColorStop(0.6, '#463524')
  cg.addColorStop(1, '#2e2114')
  ctx.fillStyle = cg
  ctx.fillRect(-132, -150, 264, 150)
  ctx.strokeStyle = 'rgba(20,12,6,0.6)'
  ctx.lineWidth = 3
  ctx.strokeRect(-124, -142, 122, 134)
  ctx.strokeRect(2, -142, 122, 134)
  ctx.fillStyle = '#8a929a'
  ctx.fillRect(-36, -96, 72, 5)
  const tg = ctx.createLinearGradient(0, -162, 0, -146)
  tg.addColorStop(0, '#a8a294')
  tg.addColorStop(1, '#6e695e')
  ctx.fillStyle = tg
  ctx.fillRect(-142, -162, 284, 16)
  ctx.fillStyle = 'rgba(255,250,238,0.25)'
  ctx.fillRect(-142, -162, 284, 3)
  ctx.strokeStyle = 'rgba(90,86,78,0.4)'
  ctx.lineWidth = 1.2
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.moveTo(-134 + i * 56, -158)
    ctx.bezierCurveTo(-120 + i * 56, -154, -104 + i * 56, -152, -92 + i * 56, -150)
    ctx.stroke()
  }
  const bg2 = ctx.createRadialGradient(0, -176, 4, 0, -172, 74)
  bg2.addColorStop(0, '#c9c6bd')
  bg2.addColorStop(1, '#8f8c83')
  ctx.fillStyle = bg2
  ctx.beginPath()
  ctx.ellipse(0, -168, 64, 18, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#565349'
  ctx.beginPath()
  ctx.ellipse(0, -170, 50, 12, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = '#2c2a24'
  ctx.beginPath()
  ctx.ellipse(0, -171, 42, 9, 0, 0, 7)
  ctx.fill()
  ctx.strokeStyle = '#b9c2cc'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, -186)
  ctx.lineTo(0, -212)
  ctx.quadraticCurveTo(0, -224, -14, -224)
  ctx.lineTo(-20, -224)
  ctx.stroke()
  ctx.fillStyle = '#d8e0e8'
  ctx.fillRect(-24, -227, 8, 6)
  ctx.restore()
}

// Glass pane: sheen + outside tint; crack01 grows a seeded spiderweb outward
// from (o.cx, o.cy) — chalk-white spokes, rings, impact crush.
export function drawGlass(ctx, rect, crack01, o = {}) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip()
  ctx.fillStyle = 'rgba(10,20,22,0.20)'
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  const dg = ctx.createLinearGradient(rect.x, rect.y + rect.h, rect.x + rect.w, rect.y)
  dg.addColorStop(0.25, 'rgba(214,236,240,0)')
  dg.addColorStop(0.42, 'rgba(214,236,240,0.09)')
  dg.addColorStop(0.52, 'rgba(214,236,240,0.045)')
  dg.addColorStop(0.72, 'rgba(214,236,240,0)')
  ctx.fillStyle = dg
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 3
  ctx.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3)
  const k = clamp01(crack01)
  if (k > 0.01) {
    const cx0 = o.cx ?? rect.x + rect.w / 2
    const cy0 = o.cy ?? rect.y + rect.h / 2
    const maxR = Math.hypot(
      Math.max(cx0 - rect.x, rect.x + rect.w - cx0),
      Math.max(cy0 - rect.y, rect.y + rect.h - cy0),
    )
    const R = maxR * (1 - Math.pow(1 - k, 2))
    const SP = 12
    ctx.strokeStyle = `rgba(226,242,246,${0.30 + 0.30 * k})`
    ctx.lineWidth = 1.7
    for (let i = 0; i < SP; i++) {
      const a = (i / SP) * Math.PI * 2 + (hash(i * 31 + 7) - 0.5) * 0.22
      const rr = R * (0.9 + hash(i * 57 + 3) * 0.12)
      ctx.beginPath()
      ctx.moveTo(cx0, cy0)
      for (let sgm = 1; sgm <= 3; sgm++) {
        const f = sgm / 3
        const wob = (hash(i * 13 + sgm * 7) - 0.5) * 0.12 * f
        ctx.lineTo(cx0 + Math.cos(a + wob) * rr * f, cy0 + Math.sin(a + wob) * rr * f)
      }
      ctx.stroke()
    }
    ctx.lineWidth = 1.1
    ctx.strokeStyle = `rgba(226,242,246,${0.20 + 0.22 * k})`
    for (let ring = 1; ring <= 3; ring++) {
      const rr = R * (0.28 + 0.24 * ring) * (0.9 + hash(ring * 91) * 0.14)
      if (rr > R * 0.98) continue
      ctx.beginPath()
      for (let i = 0; i <= SP; i++) {
        const a = (i / SP) * Math.PI * 2 + (hash((i % SP) * 31 + 7) - 0.5) * 0.22
        const sag = 1 - 0.08 * hash(ring * 17 + i)
        const px = cx0 + Math.cos(a) * rr * sag
        const py = cy0 + Math.sin(a) * rr * sag
        if (i) ctx.lineTo(px, py)
        else ctx.moveTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }
    const cg = ctx.createRadialGradient(cx0, cy0, 1, cx0, cy0, Math.max(8, R * 0.18))
    cg.addColorStop(0, `rgba(240,250,252,${0.5 * k})`)
    cg.addColorStop(1, 'rgba(240,250,252,0)')
    ctx.fillStyle = cg
    ctx.fillRect(cx0 - R * 0.2, cy0 - R * 0.2, R * 0.4, R * 0.4)
  }
  ctx.restore()
}

// Bald zombie hand pressed flat on glass: press01 flattens/spreads it and
// whitens the fingertips against the pane.
export function drawPalmOnGlass(ctx, x, y, s, press01, skin) {
  const p = clamp01(press01)
  const sk = normalizeHex(skin)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.fillStyle = `rgba(4,10,12,${0.28 * (0.35 + 0.65 * p)})`
  ctx.beginPath()
  ctx.ellipse(0, 5, 24 + 5 * p, 28 + 4 * p, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = sk
  ctx.beginPath()
  ctx.roundRect(-15 - 2.5 * p, -12, 30 + 5 * p, 36, 10)
  ctx.fill()
  const finger = (fx, ang, len) => {
    ctx.save()
    ctx.translate(fx * (1 + 0.14 * p), -10)
    ctx.rotate(ang * (1 + 0.5 * p))
    ctx.fillStyle = sk
    ctx.beginPath()
    ctx.roundRect(-4.2 - p, -len, 8.4 + 2 * p, len + 6, 4.2 + p)
    ctx.fill()
    ctx.strokeStyle = 'rgba(60,34,24,0.35)'
    ctx.lineWidth = 1.2
    for (const cy of [-len * 0.38, -len * 0.68]) {
      ctx.beginPath()
      ctx.moveTo(-3, cy)
      ctx.lineTo(3, cy - 1)
      ctx.stroke()
    }
    ctx.fillStyle = `rgba(238,244,246,${0.18 + 0.4 * p})`
    ctx.beginPath()
    ctx.ellipse(0, -len + 2.6, 3.4, 3.2, 0, 0, 7)
    ctx.fill()
    ctx.restore()
  }
  finger(-11, -0.16, 24)
  finger(-3.5, -0.04, 27)
  finger(4, 0.07, 25)
  finger(11.5, 0.18, 19)
  ctx.save()
  ctx.translate(-14 - 2 * p, 8)
  ctx.rotate(-1.05 - 0.25 * p)
  ctx.fillStyle = sk
  ctx.beginPath()
  ctx.roundRect(-4, -20, 8.4, 22, 4.2)
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = 'rgba(70,40,28,0.18)'
  ctx.beginPath()
  ctx.ellipse(2, 8, 10, 9, 0, 0, 7)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,244,230,0.10)'
  ctx.beginPath()
  ctx.ellipse(-6, -4, 8, 7, 0, 0, 7)
  ctx.fill()
  ctx.restore()
}

// Mirror-ball glints: ~24 seeded sparkles sweeping a wide arc across the frame.
export function drawBallGleams(ctx, t, o = {}) {
  const a0 = o.a ?? 0.1
  if (a0 <= 0.005) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 24; i++) {
    const ph = hash(i * 97 + 11)
    const ang = (i / 24) * Math.PI * 2 + t * (0.30 + ph * 0.12)
    const rad = 200 + hash(i * 31) * 640
    const gx = 960 + Math.cos(ang) * rad * 1.12
    const gy = 470 + (0.5 + 0.5 * Math.sin(ang)) * 400 + hash(i * 13) * 60
    const blink = Math.max(0, Math.sin(t * (1.8 + ph * 1.6) + i * 2.63))
    const a = a0 * Math.pow(blink, 3) * (0.5 + ph * 0.5)
    if (a < 0.008) continue
    const sz = 4 + hash(i * 7) * 9
    ctx.globalAlpha = Math.min(1, a)
    ctx.fillStyle = '#eaf4f8'
    ctx.beginPath()
    ctx.moveTo(gx, gy - sz)
    ctx.quadraticCurveTo(gx + sz * 0.18, gy - sz * 0.18, gx + sz, gy)
    ctx.quadraticCurveTo(gx + sz * 0.18, gy + sz * 0.18, gx, gy + sz)
    ctx.quadraticCurveTo(gx - sz * 0.18, gy + sz * 0.18, gx - sz, gy)
    ctx.quadraticCurveTo(gx - sz * 0.18, gy - sz * 0.18, gx, gy - sz)
    ctx.fill()
  }
  ctx.restore()
  ctx.globalAlpha = 1
}

// Procedural hair over a BALD base rig: (x, headTopY) at the crown, s = sprite
// scale (head ~26*s wide). Erosion is RING-FIRST — a bald ring spreads from the
// crown/back as cover01 drops (0.55 = clear ring, 0 = bare); the side/back
// horseshoe resists longest, edges fray instead of snapping to a helmet line.
export function drawHairCap(ctx, x, headTopY, s, color, seed, cover01) {
  const c01 = clamp01(cover01)
  if (c01 <= 0.04) return
  const base = normalizeHex(color)
  const dark = shadeHex(base, 0.5)
  const hi = shadeHex(base, 1.42)
  const cx = x
  const cy = headTopY + 12 * s
  const rx = 15.2 * s
  const ry = 12.4 * s
  const bald = 1.42 * Math.pow(clamp01((1 - c01) / 0.94), 1.12)
  const baldEff = (phi) => Math.max(0, bald - (phi > 0.78 * Math.PI ? 0.46 : phi > 0.3 * Math.PI ? 0.3 : 0))
  const r = rng((seed | 0) * 131 + 17)
  // under-fill: eroded annular sectors so the strands read as a mass
  const SEC = 20
  for (let i = 0; i < SEC; i++) {
    const a0 = (i / SEC) * Math.PI * 2 - Math.PI * 0.5
    const a1 = a0 + (Math.PI * 2) / SEC + 0.02
    const phi = a0 + Math.PI / SEC + Math.PI / 2
    const kIn = baldEff(phi)
    if (kIn >= 0.97) continue
    ctx.fillStyle = phi > 0.62 * Math.PI ? dark : base
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * kIn, ry * kIn, 0, a0, a1)
    ctx.ellipse(cx, cy, rx * 1.02, ry * 1.02, 0, a1, a0, true)
    ctx.closePath()
    ctx.fill()
  }
  // strand clumps (lit from the upper left)
  ctx.lineCap = 'round'
  const N = 46
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / N) * Math.PI * 2 + (r() - 0.5) * 0.1
    const phi = a + Math.PI / 2
    const be = baldEff(phi)
    const k = 0.42 + r() * 0.62
    if (k < be) continue
    if (be > 0.7 && r() < 0.35) continue
    const kIn = Math.max(0.15, k - 0.26)
    const x0 = cx + Math.cos(a) * rx * kIn
    const y0 = cy + Math.sin(a) * ry * kIn
    const x1 = cx + Math.cos(a) * rx * (k * 0.98 + 0.03)
    const y1 = cy + Math.sin(a) * ry * (k * 0.98 + 0.03)
    ctx.strokeStyle = a < -Math.PI * 0.25 ? hi : a < Math.PI * 0.4 ? base : dark
    ctx.lineWidth = (1.5 + r() * 1.3) * s
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(cx + Math.cos(a + 0.1) * rx * k, cy + Math.sin(a + 0.1) * ry * k, x1, y1)
    ctx.stroke()
  }
  // hairline fringe across the forehead
  for (let i = 0; i < 9; i++) {
    if (bald > 0.72 && r() < (bald - 0.72) * 2.6) continue
    const fx = -0.78 + (i / 8) * 1.56 + (r() - 0.5) * 0.1
    const sx0 = cx + fx * rx
    const sy0 = headTopY + (4.6 + Math.abs(fx) * 2.6) * s
    ctx.strokeStyle = dark
    ctx.lineWidth = (1.4 + r()) * s
    ctx.beginPath()
    ctx.moveTo(sx0, sy0)
    ctx.quadraticCurveTo(sx0 + (r() - 0.5) * 2 * s, sy0 + 2.4 * s, sx0 + (r() - 0.5) * 3 * s, sy0 + 4.6 * s)
    ctx.stroke()
  }
  // sideburns — the last of the horseshoe to let go
  for (const side of [-1, 1]) {
    if (bald > 1.28 && r() < 0.6) continue
    const bx = cx + side * rx * 0.94
    ctx.strokeStyle = dark
    ctx.lineWidth = 2.6 * s
    ctx.beginPath()
    ctx.moveTo(bx, cy - 2 * s)
    ctx.quadraticCurveTo(bx + side * 1.5 * s, cy + 5 * s, bx + side * 0.5 * s, cy + 10.5 * s)
    ctx.stroke()
  }
  ctx.lineCap = 'butt'
}

// Newsboy cap sitting on headTopY; o.off lifts it away (the gust gag), o.rot
// tumbles it, o.flip mirrors the brim to the facing side.
export function drawHat(ctx, x, headTopY, s, o = {}) {
  const off = clamp01(o.off ?? 0)
  const lift = off * off * 64 * s + off * 26 * s
  ctx.save()
  ctx.translate(x, headTopY - lift)
  ctx.rotate((o.rot ?? 0) + off * 0.5)
  ctx.scale((o.flip ? -1 : 1) * s, s)
  ctx.fillStyle = '#3a2e20'
  ctx.beginPath()
  ctx.moveTo(6, 2)
  ctx.quadraticCurveTo(20, 0, 26, 6)
  ctx.quadraticCurveTo(16, 9, 5, 7)
  ctx.closePath()
  ctx.fill()
  const cg = ctx.createLinearGradient(0, -16, 0, 4)
  cg.addColorStop(0, '#6e5a40')
  cg.addColorStop(0.6, '#57452e')
  cg.addColorStop(1, '#3c2f1e')
  ctx.fillStyle = cg
  ctx.beginPath()
  ctx.moveTo(-17, 4)
  ctx.quadraticCurveTo(-19, -9, -8, -13)
  ctx.quadraticCurveTo(0, -16, 9, -13)
  ctx.quadraticCurveTo(18, -10, 17, 3)
  ctx.quadraticCurveTo(0, 8, -17, 4)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(28,20,10,0.55)'
  ctx.lineWidth = 1.4
  for (const px of [-8, 0, 8]) {
    ctx.beginPath()
    ctx.moveTo(px, -13 + Math.abs(px) * 0.35)
    ctx.quadraticCurveTo(px * 0.8, -6, px * 0.5, 4)
    ctx.stroke()
  }
  const r = rng(88)
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(200,180,140,${0.10 + r() * 0.12})`
    ctx.fillRect(-15 + r() * 30, -12 + r() * 14, 1.6, 1.6)
  }
  ctx.fillStyle = '#3c2f1e'
  ctx.beginPath()
  ctx.arc(0, -14, 2.4, 0, 7)
  ctx.fill()
  ctx.restore()
}

// ---------- broadcast / noise / glow ----------

// S1 CRT treatment over the full frame: scanlines, vignette, subtle chroma
// fringe; signal01 < 1 adds a rolling bar, tear streaks and rising noise.
let _scan = null
export function broadcastOverlay(ctx, t, signal01) {
  const sig = clamp01(signal01)
  if (!_scan) {
    _scan = canvas(W, 4)
    const sx = _scan.getContext('2d')
    sx.fillStyle = 'rgba(3,5,9,0.15)'
    sx.fillRect(0, 0, W, 2)
    sx.fillStyle = 'rgba(140,160,170,0.03)'
    sx.fillRect(0, 2, W, 1)
  }
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = 0.05
  ctx.drawImage(ctx.canvas, 1.7, -0.6)
  ctx.globalAlpha = 0.04
  ctx.drawImage(ctx.canvas, -1.7, 0.6)
  ctx.restore()
  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.fillStyle = ctx.createPattern(_scan, 'repeat')
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
  const vg = ctx.createRadialGradient(960, 540, 340, 960, 540, 1120)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(2,3,6,0.30)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)
  const q = 1 - sig
  if (q > 0.02) {
    const by = ((t * 150) % (H + 320)) - 160
    const bg = ctx.createLinearGradient(0, by - 90, 0, by + 90)
    bg.addColorStop(0, 'rgba(220,236,244,0)')
    bg.addColorStop(0.5, `rgba(220,236,244,${0.11 * q})`)
    bg.addColorStop(1, 'rgba(220,236,244,0)')
    ctx.fillStyle = bg
    ctx.fillRect(0, by - 90, W, 180)
    const step = Math.floor(t * 24)
    for (let i = 0; i < 3; i++) {
      const sy = Math.floor(hash(step * 7 + i * 37) * (H - 40))
      const sh2 = 6 + Math.floor(hash(step * 13 + i * 11) * 22)
      const dx = (hash(step * 17 + i * 5) - 0.5) * 220 * q
      ctx.drawImage(ctx.canvas, 0, sy, W, sh2, dx, sy, W, sh2)
    }
    for (let i = 0; i < 90; i++) {
      const nx = hash(step * 29 + i * 3) * W
      const ny = hash(step * 43 + i * 7) * H
      ctx.fillStyle = `rgba(226,238,244,${(0.05 + hash(i * 91 + step) * 0.22) * q})`
      ctx.fillRect(nx, ny, 2 + hash(i) * 4, 2)
    }
  }
}

// Deterministic TV snow: 4 noise strips baked once (immutable after), sampled
// at t-stepped offsets; amt = coverage/alpha.
let _noiseStrips = null
export function staticNoise(ctx, amt, t) {
  const a = clamp01(amt)
  if (a <= 0.01) return
  if (!_noiseStrips) {
    _noiseStrips = []
    for (let s = 0; s < 4; s++) {
      const n = canvas(480, 270)
      const nx = n.getContext('2d')
      const img = nx.createImageData(480, 270)
      const d = img.data
      const r = rng(9100 + s * 77)
      for (let i = 0; i < 480 * 270; i++) {
        const v = r()
        const g = v < 0.06 ? 235 : v < 0.12 ? 24 : 30 + Math.floor(r() * 150)
        d[i * 4] = g
        d[i * 4 + 1] = g
        d[i * 4 + 2] = g
        d[i * 4 + 3] = 255
      }
      nx.putImageData(img, 0, 0)
      _noiseStrips.push(n)
    }
  }
  const step = Math.floor(t * 30)
  const s0 = step % 4
  const s1 = (step * 3 + 1) % 4
  const ox = Math.floor(hash(step) * 480)
  const oy = Math.floor(hash(step + 55) * 270)
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.globalAlpha = Math.min(1, a * 1.12)
  const ox2 = [ox, 480 - ox]
  const oy2 = [oy, 270 - oy]
  const strips = [s0, s1]
  for (let L = 0; L < 2; L++) {
    for (let ty = -1; ty < 5; ty++) {
      for (let tx = -1; tx < 5; tx++) {
        ctx.drawImage(_noiseStrips[strips[L]], tx * 480 - ox2[L], ty * 270 - oy2[L])
      }
    }
  }
  ctx.restore()
}

// Soft radial glow, intensity 0..1, radius o.r (default 120), colour o.color.
export function glow(ctx, x, y, i, o = {}) {
  const k = clamp01(i)
  if (k <= 0.01) return
  const r = o.r ?? 120
  const [rr, gg, bb] = hexRgb(normalizeHex(o.color ?? '#ffb066'))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x, y, 1, x, y, r)
  g.addColorStop(0, `rgba(${rr},${gg},${bb},${0.62 * k})`)
  g.addColorStop(0.35, `rgba(${rr},${gg},${bb},${0.26 * k})`)
  g.addColorStop(1, `rgba(${rr},${gg},${bb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.restore()
}
