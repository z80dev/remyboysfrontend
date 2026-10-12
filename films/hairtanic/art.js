// HAIRTANIC art: prepare-time bakes + pure per-frame painters. Full-res 1920×1080
// painted-vector stage (goldflow lineage): ramped skies, layered seas, blob-shaded
// masses, rim-lit sprites. Everything deterministic — hash/rng baked in prepare,
// per-frame painters are pure functions of t. No Math.random, no cross-frame state.
import { hash, rng, mixHex, F, txt } from 'filmkit/lib.js'
import { canvas } from '../remy-bros/art.js'

const W = 1920, H = 1080
const OS = 280 // overscan margin painted around the stage so camera moves never expose edges

// ============================== rig helpers ==============================

// Strip the greatsword baked into hero 42's near sprite (blade hugs the left edge).
// Pass 1: per scanline, clear the detached left-edge run when a >=3px transparent gap
// separates it from the body (hair rows merge and are spared). Pass 2: in the left
// strip, clear by colour — the blade family is blue-grey / yellow guard while hair and
// skin are warm (r > b). Deterministic, runs once in prepare().
export function stripBlade(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const a = (xx, y) => p[(y * R.w + xx) * 4 + 3]
  for (let y = 0; y < R.h; y++) {
    let x0 = 0
    while (x0 < R.w && a(x0, y) === 0) x0++
    if (x0 > 8) continue
    let x1 = x0
    while (x1 < R.w && a(x1, y) > 0) x1++
    if (x1 - x0 > 15) continue
    let gap = 0, xx = x1
    while (xx < R.w && a(xx, y) === 0) { gap++; xx++ }
    if (gap < 3) continue
    for (let xb = x0; xb < x1; xb++) p[(y * R.w + xb) * 4 + 3] = 0
  }
  for (let y = 0; y < R.h; y++)
    for (let xx = 0; xx < 23; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] === 0) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if (b >= r || (g > 150 && b < 90 && r > 140)) p[i + 3] = 0
    }
  x.putImageData(d, 0, 0)
  const sil = canvas(R.w, R.h), sx = sil.getContext('2d')
  sx.drawImage(c, 0, 0)
  sx.globalCompositeOperation = 'source-in'
  sx.fillStyle = '#fff'
  sx.fillRect(0, 0, R.w, R.h)
  return { ...R, c, sil }
}

// Solid-colour silhouette from a rig, keeping the pose rig (rim copies, dark guards).
export function tint(R, color) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, R.w, R.h)
  return c
}

// ============================== environment bakes ==============================

// S1 — the rusted wreck: a broken hull skeleton with real mass — stern section listing
// with torn plating, rib cage amidships, bow run with railing stubs, prop + rudder.
export function wreckBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(1912)
  x.translate(OS, OS)
  // sea floor silt mound
  const g = x.createLinearGradient(0, 900, 0, H + OS)
  g.addColorStop(0, '#0e2032')
  g.addColorStop(1, '#050b14')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(-OS, H + OS)
  x.lineTo(-OS, 1020)
  for (let px = -OS; px <= W + OS; px += 60)
    x.lineTo(px, 1010 + 26 * Math.sin(px * 0.004 + 1.7) + 10 * Math.sin(px * 0.013))
  x.lineTo(W + OS, H + OS)
  x.closePath(); x.fill()
  // torn stern section: a mass of black plating listing to port, ribs torn open
  x.fillStyle = '#0c0a08'
  x.beginPath()
  x.moveTo(-200, 990)
  x.lineTo(-150, 660)
  x.lineTo(-40, 610)
  x.lineTo(180, 640)
  x.lineTo(420, 700)
  x.lineTo(560, 830)
  x.lineTo(520, 960)
  x.lineTo(-200, 990)
  x.closePath(); x.fill()
  // plating sheen (lamp side) + torn edge rust
  x.fillStyle = '#1c1410'
  x.beginPath()
  x.moveTo(-150, 660); x.lineTo(-40, 610); x.lineTo(180, 640); x.lineTo(420, 700)
  x.lineTo(370, 760); x.lineTo(120, 700); x.lineTo(-130, 730)
  x.closePath(); x.fill()
  x.strokeStyle = '#6b4530'
  x.lineWidth = 5
  x.beginPath(); x.moveTo(-150, 662); x.lineTo(-40, 612); x.lineTo(180, 642); x.lineTo(420, 702); x.stroke()
  // railing stubs on the stern's broken deck edge
  for (let i = 0; i < 5; i++) {
    const bx = -120 + i * 74
    x.strokeStyle = '#6b4530'
    x.lineWidth = 4
    x.beginPath(); x.moveTo(bx, 640 - i * 6); x.lineTo(bx, 590 - i * 6); x.stroke()
  }
  x.strokeStyle = '#6b4530'
  x.lineWidth = 3
  x.beginPath(); x.moveTo(-130, 596); x.lineTo(150, 622); x.stroke()
  // ribs springing from the open frame, curved, bases half-buried at varying depths
  const ribTop = []
  for (let i = 0; i < 11; i++) {
    const bx = 560 + i * 108
    const h = 210 + r() * 230
    const base = 952 + Math.sin(i * 2.3) * 26
    const lean = 0.2 * Math.sin(i * 1.7 + 0.6)
    const tipX = bx + lean * 170, tipY = base - h
    ribTop.push([tipX, tipY])
    x.strokeStyle = '#241812'
    x.lineWidth = 22
    x.beginPath(); x.moveTo(bx, base); x.bezierCurveTo(bx + 10, base - h * 0.5, tipX - 30, base - h * 0.75, tipX, tipY); x.stroke()
    x.strokeStyle = '#4a3226'
    x.lineWidth = 10
    x.beginPath(); x.moveTo(bx, base - 6); x.bezierCurveTo(bx + 10, base - h * 0.5 - 6, tipX - 30, base - h * 0.75 - 6, tipX, tipY - 4); x.stroke()
    x.strokeStyle = '#7a5238'
    x.lineWidth = 3
    x.beginPath(); x.moveTo(bx - 5, base - 12); x.bezierCurveTo(bx + 5, base - h * 0.5 - 12, tipX - 34, base - h * 0.75 - 12, tipX - 4, tipY - 9); x.stroke()
  }
  // a sagging broken deck beam tying the rib tops together (the ship reads, not a fence)
  x.strokeStyle = '#3a2718'
  x.lineWidth = 13
  x.beginPath()
  x.moveTo(ribTop[0][0], ribTop[0][1] + 6)
  for (let i = 1; i < ribTop.length; i++) {
    const [tx, ty] = ribTop[i]
    const sag = i >= 4 && i <= 7 ? 46 : 8
    x.quadraticCurveTo((ribTop[i - 1][0] + tx) / 2, (ribTop[i - 1][1] + ty) / 2 + sag, tx, ty + 6)
  }
  x.stroke()
  x.strokeStyle = '#54392a'
  x.lineWidth = 4
  x.stroke()
  // bow run: low keel with railing stubs
  x.strokeStyle = '#1c1410'
  x.lineWidth = 22
  x.lineCap = 'round'
  x.beginPath(); x.moveTo(1690, 950); x.lineTo(2100, 880); x.stroke()
  x.strokeStyle = '#54392a'
  x.lineWidth = 7
  x.beginPath(); x.moveTo(1690, 942); x.lineTo(2100, 872); x.stroke()
  x.strokeStyle = '#6b4530'
  x.lineWidth = 4
  for (let i = 0; i < 6; i++) {
    const bx = 1720 + i * 66
    x.beginPath(); x.moveTo(bx, 938 - i * 10); x.lineTo(bx, 878 - i * 10); x.stroke()
  }
  x.beginPath(); x.moveTo(1700, 884); x.lineTo(2080, 818); x.stroke()
  // propeller + rudder at the stern
  x.fillStyle = '#3a2718'
  for (let i = 0; i < 3; i++) {
    x.save()
    x.translate(-60, 850)
    x.rotate(i * 2.09)
    x.beginPath(); x.ellipse(46, 0, 46, 17, 0, 0, 7); x.fill()
    x.restore()
  }
  x.fillStyle = '#54392a'
  x.beginPath(); x.arc(-60, 850, 16, 0, 7); x.fill()
  x.fillStyle = '#241812'
  x.beginPath(); x.moveTo(-90, 860); x.quadraticCurveTo(-40, 920, -110, 990); x.lineTo(-190, 990); x.quadraticCurveTo(-150, 900, -160, 850); x.closePath(); x.fill()
  // half-buried plates + scattered debris
  for (let i = 0; i < 10; i++) {
    const px = 200 + r() * 1500, py = 970 + r() * 90, w2 = 60 + r() * 130
    x.save()
    x.translate(px, py)
    x.rotate((r() - 0.5) * 0.7)
    x.fillStyle = '#33241a'
    x.fillRect(-w2 / 2, -7, w2, 14)
    x.fillStyle = '#54392a'
    x.fillRect(-w2 / 2, -7, w2, 4)
    x.restore()
  }
  return c
}

// S2 — the painted liner, side-on, bow LEFT: black hull, gold line, white
// superstructure rows with lit windows, four buff funnels, masts + rigging.
export function linerBake() {
  const w = 1720, h = 820
  const c = canvas(w, h), x = c.getContext('2d')
  const r = rng(42)
  // masts + rigging (behind superstructure)
  x.strokeStyle = '#2a2018'
  x.lineWidth = 6
  for (const mx of [300, 1330]) {
    x.beginPath(); x.moveTo(mx, 260); x.lineTo(mx, 40); x.stroke()
    x.beginPath(); x.moveTo(mx - 130, 120); x.lineTo(mx + 130, 120); x.stroke()
  }
  x.strokeStyle = 'rgba(42,32,24,0.55)'
  x.lineWidth = 2
  for (let i = 0; i < 7; i++) {
    x.beginPath(); x.moveTo(170, 60 + i * 24); x.lineTo(1460, 60 + i * 24); x.stroke()
  }
  // hull: black with gold line, sheer curve, bow raking left
  x.fillStyle = '#10151c'
  x.beginPath()
  x.moveTo(1740, 560)
  x.lineTo(1740, 700)
  x.lineTo(60, 700)
  x.quadraticCurveTo(0, 690, 8, 640)
  x.lineTo(40, 560)
  x.quadraticCurveTo(120, 520, 240, 522)
  x.lineTo(1660, 522)
  x.quadraticCurveTo(1720, 530, 1740, 560)
  x.closePath(); x.fill()
  // hull plating sheer + rust streaks
  x.fillStyle = '#1a222e'
  x.fillRect(240, 522, 1400, 10)
  for (let i = 0; i < 26; i++) {
    x.fillStyle = `rgba(64,50,38,${0.2 + r() * 0.25})`
    x.fillRect(260 + r() * 1380, 540 + r() * 140, 3 + r() * 5, 20 + r() * 60)
  }
  // gold line along the hull
  x.fillStyle = '#c9a45c'
  x.fillRect(210, 560, 1510, 6)
  x.fillStyle = '#e8cf8a'
  x.fillRect(210, 560, 1510, 2)
  // portholes
  for (let px = 300; px < 1680; px += 44)
    for (const py of [600, 640]) {
      x.fillStyle = '#c9a45c'
      x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill()
      x.fillStyle = '#f2e3c2'
      x.beginPath(); x.arc(px, py, 3, 0, 7); x.fill()
    }
  // name on the bow
  x.fillStyle = '#e8cf8a'
  x.font = `600 34px ${F.serif}`
  x.fillText('RMS HAIRTANIC', 260, 688)
  // white superstructure: three tiers of rows with windows
  const tier = (x0, x1, y0, y1) => {
    const t = x.createLinearGradient(0, y0, 0, y1)
    t.addColorStop(0, '#f4efe2')
    t.addColorStop(1, '#cfc8b6')
    x.fillStyle = t
    x.fillRect(x0, y0, x1 - x0, y1 - y0)
    x.fillStyle = '#8f8874'
    x.fillRect(x0, y1 - 5, x1 - x0, 5)
    for (let wx = x0 + 14; wx < x1 - 14; wx += 22) {
      x.fillStyle = r() > 0.25 ? '#3a3c40' : '#f2e3c2'
      x.fillRect(wx, y0 + 10, 10, 14)
    }
  }
  tier(300, 1560, 440, 522)
  tier(360, 1500, 366, 440)
  tier(430, 1420, 296, 366)
  // bridge
  x.fillStyle = '#e8e2d2'
  x.fillRect(180, 440, 150, 82)
  x.fillStyle = '#26303a'
  x.fillRect(190, 452, 130, 26)
  // four buff funnels with black tops + steam whistles
  for (const fx of [480, 740, 1000, 1260]) {
    const fg = x.createLinearGradient(fx - 52, 0, fx + 52, 0)
    fg.addColorStop(0, '#c88d3c')
    fg.addColorStop(0.5, '#e8b05c')
    fg.addColorStop(1, '#96622a')
    x.fillStyle = fg
    x.fillRect(fx - 48, 160, 96, 140)
    x.fillStyle = '#141414'
    x.fillRect(fx - 48, 160, 96, 34)
    x.fillStyle = 'rgba(20,20,20,0.35)'
    x.fillRect(fx - 48, 268, 96, 8)
  }
  // venting cluster aft
  for (const vx of [1360, 1400, 1436]) {
    x.fillStyle = '#d8d2c0'
    x.beginPath(); x.arc(vx, 440 - 26, 16, Math.PI, 0); x.fill()
    x.fillStyle = '#b0a890'
    x.fillRect(vx - 10, 428, 20, 14)
  }
  return c
}

// S2 — painted dock banner (hung on a post frame, slight sway drawn live).
export function bannerBake(text) {
  const w = 560, h = 130
  const c = canvas(w, h), x = c.getContext('2d')
  x.fillStyle = '#a3322a'
  x.fillRect(6, 6, w - 12, h - 12)
  x.strokeStyle = '#e8cf8a'
  x.lineWidth = 4
  x.strokeRect(14, 14, w - 28, h - 28)
  txt(x, text, w / 2, h / 2 + 2, { size: 44, font: F.serif, weight: '700', color: '#f2e3c2', align: 'center', base: 'middle', track: 3 })
  // fold shading
  for (let i = 0; i < 5; i++) {
    x.fillStyle = `rgba(0,0,0,${0.05 + 0.04 * (i % 2)})`
    x.fillRect(90 + i * 90, 6, 26, h - 12)
  }
  return c
}

// S6/S7 — THE SIGNATURE IMAGE: the immense moon-white bald head as glacier.
// Brow ridge, nose hint, ear shelves, crown sheen, ice-blue shadow side. STILL.
export function bergBake() {
  const w = 1560, h = 1120
  const c = canvas(w, h), x = c.getContext('2d')
  const cx = 760, cy = 560, R = 520
  // skull mass (slightly squashed dome) merging into an ice foot below the waterline
  x.fillStyle = '#c9d8e4'
  x.beginPath()
  x.moveTo(-40, 1120)
  x.lineTo(-40, 830)
  x.quadraticCurveTo(10, 700, 120, 640)
  x.quadraticCurveTo(80, 380, 300, 200)
  x.quadraticCurveTo(560, -30, 900, 90)
  x.quadraticCurveTo(1240, 200, 1300, 520)
  x.quadraticCurveTo(1520, 600, 1560, 760)
  x.lineTo(1560, 1120)
  x.closePath(); x.fill()
  // lit side (moon is screen-left): overlay moon-white on the left 2/3
  x.save()
  x.beginPath()
  x.moveTo(-40, 1120); x.lineTo(-40, 830)
  x.quadraticCurveTo(10, 700, 120, 640)
  x.quadraticCurveTo(80, 380, 300, 200)
  x.quadraticCurveTo(560, -30, 900, 90)
  x.quadraticCurveTo(1240, 200, 1300, 520)
  x.quadraticCurveTo(1520, 600, 1560, 760)
  x.lineTo(1560, 1120); x.closePath()
  x.clip()
  const lit = x.createLinearGradient(0, 0, w * 0.9, 0)
  lit.addColorStop(0, '#eef4fa')
  lit.addColorStop(0.55, '#dbe6ef')
  lit.addColorStop(1, 'rgba(143,168,192,0)')
  x.fillStyle = lit
  x.fillRect(0, 0, w, h)
  // crown sheen: one broad soft highlight
  const sheen = x.createRadialGradient(cx - 180, 210, 30, cx - 180, 210, 420)
  sheen.addColorStop(0, 'rgba(255,255,255,0.85)')
  sheen.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = sheen
  x.fillRect(0, 0, w, 700)
  // brow ridge: a curved band that follows the skull (tapered ends, no hard rectangle)
  const browBand = (yy, h2, col) => {
    x.fillStyle = col
    x.beginPath()
    x.moveTo(130, yy - h2 / 2)
    x.quadraticCurveTo(760, yy - h2 / 2 - 54, 1390, yy - h2 / 2 + 8)
    x.lineTo(1390, yy + h2 / 2 + 8)
    x.quadraticCurveTo(760, yy + h2 / 2 - 54, 130, yy + h2 / 2)
    x.closePath(); x.fill()
  }
  browBand(500, 40, 'rgba(122,152,182,0.5)')
  browBand(482, 12, 'rgba(255,255,255,0.75)')
  browBand(566, 84, 'rgba(90,118,148,0.35)') // shadow under the brow
  // nose hint: small shading wedge below the brow centre
  x.fillStyle = 'rgba(108,136,164,0.55)'
  x.beginPath()
  x.moveTo(700, 560); x.quadraticCurveTo(740, 700, 690, 780)
  x.quadraticCurveTo(650, 830, 580, 820)
  x.quadraticCurveTo(660, 790, 660, 700)
  x.quadraticCurveTo(660, 620, 660, 560)
  x.closePath(); x.fill()
  // lips crease hint
  x.fillStyle = 'rgba(108,136,164,0.4)'
  x.beginPath()
  x.moveTo(430, 900); x.quadraticCurveTo(650, 954, 940, 906)
  x.quadraticCurveTo(660, 986, 430, 900)
  x.closePath(); x.fill()
  // ear shelf right
  x.fillStyle = 'rgba(122,152,182,0.6)'
  x.beginPath(); x.ellipse(1310, 660, 130, 90, -0.3, 0, 7); x.fill()
  x.fillStyle = 'rgba(238,244,250,0.5)'
  x.beginPath(); x.ellipse(1296, 640, 90, 54, -0.3, 0, 7); x.fill()
  // crevasse cracks
  x.strokeStyle = 'rgba(96,128,158,0.5)'
  x.lineWidth = 5
  const r = rng(7)
  for (let i = 0; i < 9; i++) {
    let px = 200 + r() * 1100, py = 120 + r() * 700
    x.beginPath(); x.moveTo(px, py)
    for (let k = 0; k < 4; k++) { px += (r() - 0.5) * 160; py += 40 + r() * 90; x.lineTo(px, py) }
    x.stroke()
  }
  // dandruff patches (snowfields) on ledges
  for (let i = 0; i < 26; i++) {
    const px = 150 + r() * 1200, py = 500 + r() * 520
    x.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.3})`
    x.beginPath(); x.ellipse(px, py, 12 + r() * 26, 4 + r() * 7, 0, 0, 7); x.fill()
  }
  x.restore()
  // rim outline (cold ink)
  x.strokeStyle = 'rgba(58,86,116,0.8)'
  x.lineWidth = 6
  x.beginPath()
  x.moveTo(-40, 830)
  x.quadraticCurveTo(10, 700, 120, 640)
  x.quadraticCurveTo(80, 380, 300, 200)
  x.quadraticCurveTo(560, -30, 900, 90)
  x.quadraticCurveTo(1240, 200, 1300, 520)
  x.quadraticCurveTo(1520, 600, 1560, 760)
  x.stroke()
  return c
}

// S9 — the door panel: waterlogged pine, dark planks, grain, hinges, tarnished knob.
export function doorBake() {
  const w = 700, h = 220
  const c = canvas(w, h), x = c.getContext('2d')
  const r = rng(2373)
  const g = x.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#6b5236')
  g.addColorStop(0.55, '#5a4228')
  g.addColorStop(1, '#42301c')
  x.fillStyle = g
  x.fillRect(0, 0, w, h)
  for (let i = 1; i < 5; i++) {
    x.fillStyle = 'rgba(16,10,4,0.7)'
    x.fillRect(i * (w / 5), 0, 3, h)
    x.fillStyle = 'rgba(220,200,160,0.12)'
    x.fillRect(i * (w / 5) - 6, 0, 4, h)
  }
  // grain + water stains
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(20,12,4,${0.18 + r() * 0.25})`
    x.fillRect(r() * w, r() * h, 30 + r() * 90, 2)
  }
  for (let i = 0; i < 8; i++) {
    x.fillStyle = `rgba(8,16,26,${0.2 + r() * 0.25})`
    x.beginPath(); x.ellipse(r() * w, h - 20 - r() * 60, 30 + r() * 70, 10 + r() * 16, 0, 0, 7); x.fill()
  }
  // hinge + knob (tarnished)
  x.fillStyle = '#26262c'
  x.fillRect(28, 40, 40, 14)
  x.fillRect(28, 160, 40, 14)
  x.fillStyle = '#8a7442'
  x.beginPath(); x.arc(w - 70, h / 2, 12, 0, 7); x.fill()
  x.fillStyle = '#5a4820'
  x.beginPath(); x.arc(w - 70, h / 2, 7, 0, 7); x.fill()
  // waterline stain band + wet sheen
  x.fillStyle = 'rgba(6,12,20,0.55)'
  x.fillRect(0, h - 40, w, 40)
  x.fillStyle = 'rgba(160,190,210,0.14)'
  x.fillRect(0, h - 42, w, 4)
  x.strokeStyle = '#0c1a2c'
  x.lineWidth = 6
  x.strokeRect(0, 0, w, h)
  return c
}

// S8 — sliding deck chair (wicker with a moonlit top rail so it reads at night).
export function chairBake() {
  const c = canvas(190, 120), x = c.getContext('2d')
  x.strokeStyle = '#2c2118'
  x.lineCap = 'round'
  x.lineWidth = 10
  x.beginPath(); x.moveTo(20, 108); x.lineTo(60, 30); x.stroke() // back
  x.beginPath(); x.moveTo(20, 108); x.lineTo(150, 108); x.stroke() // seat rail
  x.beginPath(); x.moveTo(150, 108); x.lineTo(178, 66); x.stroke() // foot
  x.lineWidth = 7
  for (let i = 0; i < 5; i++) {
    x.strokeStyle = i % 2 ? '#4a3826' : '#3a2c1c'
    x.beginPath(); x.moveTo(46 + i * 9, 52 + i * 5); x.lineTo(80 + i * 9, 34 + i * 5); x.stroke()
  }
  x.strokeStyle = '#4a3826'
  x.lineWidth = 7
  x.beginPath(); x.moveTo(50, 92); x.lineTo(140, 92); x.stroke()
  x.strokeStyle = '#c9b088'
  x.lineWidth = 3
  x.beginPath(); x.moveTo(22, 100); x.lineTo(148, 100); x.stroke()
  x.strokeStyle = 'rgba(207,220,238,0.8)'
  x.lineWidth = 2
  x.beginPath(); x.moveTo(60, 30); x.lineTo(24, 104); x.stroke()
  return c
}

// Tapered limb from sampled points (the S3 arms-wide cheat: shoulder → spread hand).
export function limb(x, pts, w0, col) {
  x.fillStyle = col
  strandFill(x, pts, w0)
}

// Soft dark scrim pill behind captions over bright set areas (stacked alpha = soft edge).
export function scrimPill(x, cx, cy, w, h, a) {
  if (a <= 0.01) return
  x.save()
  x.fillStyle = `rgba(5,9,16,${(a * 0.28).toFixed(3)})`
  x.beginPath(); x.roundRect(cx - w / 2 - 14, cy - h / 2 - 10, w + 28, h + 20, (h + 20) / 2); x.fill()
  x.fillStyle = `rgba(5,9,16,${(a * 0.45).toFixed(3)})`
  x.beginPath(); x.roundRect(cx - w / 2 - 6, cy - h / 2 - 4, w + 12, h + 8, (h + 8) / 2); x.fill()
  x.fillStyle = `rgba(5,9,16,${a.toFixed(3)})`
  x.beginPath(); x.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); x.fill()
  x.restore()
}

// S8 — painted string instruments for the far-sprite quartet (2 violins + viola + cello).
// violinBake(k, deep): k scales (viola = 1.18 + deeper varnish), 104×64 base.
export function violinBake(k = 1, deep = false) {
  const w = Math.round(104 * k), h = Math.round(64 * k)
  const c = canvas(w, h), x = c.getContext('2d')
  const body = deep ? '#6b3f1e' : '#7a4a26'
  x.save()
  x.scale(k, k)
  x.strokeStyle = '#3a2412'
  x.lineWidth = 7
  x.lineCap = 'round'
  x.beginPath(); x.moveTo(86, 44); x.lineTo(100, 10); x.stroke()
  x.fillStyle = '#241608'
  x.beginPath(); x.arc(101, 8, 5, 0, 7); x.fill()
  x.fillStyle = body
  x.beginPath()
  x.moveTo(18, 40)
  x.bezierCurveTo(2, 28, 6, 10, 26, 12)
  x.bezierCurveTo(40, 14, 44, 22, 52, 22)
  x.bezierCurveTo(60, 22, 64, 14, 78, 12)
  x.bezierCurveTo(98, 10, 102, 28, 86, 40)
  x.bezierCurveTo(70, 52, 34, 52, 18, 40)
  x.closePath(); x.fill()
  x.strokeStyle = '#3a2412'
  x.lineWidth = 3
  x.stroke()
  x.strokeStyle = 'rgba(232,207,138,0.5)'
  x.lineWidth = 2
  x.beginPath(); x.moveTo(16, 38); x.bezierCurveTo(40, 48, 66, 48, 88, 38); x.stroke()
  x.fillStyle = '#1c1006'
  for (const fx of [40, 64]) { x.beginPath(); x.ellipse(fx, 32, 2.6, 7, fx === 40 ? 0.25 : -0.25, 0, 7); x.fill() }
  x.beginPath(); x.ellipse(52, 40, 4, 7, 0, 0, 7); x.fill()
  x.restore()
  return c
}

// Cello: tall body + long neck + endpin, ~120×220 (drawn ~1.4x in shot).
export function celloBake() {
  const c = canvas(120, 220), x = c.getContext('2d')
  x.strokeStyle = '#3a2412'
  x.lineWidth = 9
  x.lineCap = 'round'
  x.beginPath(); x.moveTo(62, 88); x.lineTo(76, 12); x.stroke()
  x.fillStyle = '#241608'
  x.beginPath(); x.arc(77, 10, 6, 0, 7); x.fill()
  x.strokeStyle = '#1c1006'
  x.lineWidth = 4
  for (const py of [26, 44]) { x.beginPath(); x.moveTo(70, py); x.lineTo(56, py - 6); x.stroke() }
  x.fillStyle = '#6b3f1e'
  x.beginPath()
  x.moveTo(30, 92)
  x.bezierCurveTo(6, 104, 10, 138, 30, 148)
  x.bezierCurveTo(20, 160, 24, 192, 52, 200)
  x.bezierCurveTo(80, 208, 104, 190, 100, 164)
  x.bezierCurveTo(118, 148, 116, 116, 96, 100)
  x.bezierCurveTo(106, 84, 96, 66, 74, 68)
  x.bezierCurveTo(52, 70, 42, 80, 30, 92)
  x.closePath(); x.fill()
  x.strokeStyle = '#3a2412'
  x.lineWidth = 4
  x.stroke()
  x.strokeStyle = 'rgba(232,207,138,0.45)'
  x.lineWidth = 3
  x.beginPath(); x.moveTo(26, 96); x.bezierCurveTo(58, 116, 82, 116, 104, 98); x.stroke()
  x.fillStyle = '#1c1006'
  for (const fx of [48, 82]) { x.beginPath(); x.ellipse(fx, 136, 3.4, 11, fx === 48 ? 0.22 : -0.22, 0, 7); x.fill() }
  x.beginPath(); x.ellipse(64, 178, 5, 10, 0, 0, 7); x.fill()
  x.strokeStyle = '#1c1006'
  x.lineWidth = 3
  x.beginPath(); x.moveTo(64, 206); x.lineTo(64, 218); x.stroke()
  return c
}

// Bow arm: stick + hair, seesawing with the phrase (pure t).
export function bow(x, cx, cy, len, ang, t, ph) {
  x.save()
  x.translate(cx, cy)
  x.rotate(ang + Math.sin(t * 2.2 + ph * 1.7) * 0.06)
  x.strokeStyle = '#54391c'
  x.lineWidth = 3.4
  x.lineCap = 'round'
  x.beginPath(); x.moveTo(-len / 2, 0); x.lineTo(len / 2, 0); x.stroke()
  x.strokeStyle = 'rgba(230,220,200,0.7)'
  x.lineWidth = 1.6
  x.beginPath(); x.moveTo(-len / 2 + 5, 3); x.lineTo(len / 2 - 5, 3); x.stroke()
  x.restore()
}

// ============================== painters (pure in t) ==============================

// Layered sea: never a flat fill. bands = colours near→far (far = horizon side).
export function sea(x, yTop, t, o = {}) {
  const bands = o.bands ?? ['#33506b', '#2b4460', '#243a54', '#1d3148', '#17293c']
  const amp = o.amp ?? 7, L = OS
  const x0 = -L, x1 = W + L, yBot = H + L
  x.fillStyle = bands[bands.length - 1]
  x.fillRect(x0, yTop, x1 - x0, yBot - yTop)
  const n = bands.length
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1)
    const y = yTop + 6 + f * f * (o.depth ?? 330)
    const a = amp * (0.45 + f * 0.9)
    x.fillStyle = bands[i]
    x.beginPath()
    x.moveTo(x0, y)
    for (let px = x0; px <= x1; px += 44)
      x.lineTo(px, y + a * Math.sin(px * (0.006 + 0.0035 * i) + t * (0.6 + 0.22 * i) + i * 2.4))
    x.lineTo(x1, yBot); x.lineTo(x0, yBot)
    x.closePath(); x.fill()
    if (o.foam && f > 0.25) {
      x.fillStyle = o.foam
      for (let px = x0; px <= x1; px += 130) {
        const c2 = Math.sin(px * (0.006 + 0.0035 * i) + t * (0.6 + 0.22 * i) + i * 2.4)
        if (c2 > 0.55) {
          x.globalAlpha = 0.16 + 0.14 * (c2 - 0.55) * 2
          x.fillRect(px, y + a * c2, 26 + 22 * ((px + i * 97) % 3), 2)
        }
      }
      x.globalAlpha = 1
    }
  }
  // glint column (sun/moon): shimmering dashes narrowing down
  if (o.glintX != null) {
    x.fillStyle = o.glintCol ?? '#ffe9ad'
    for (let i = 0; i < 22; i++) {
      const yy = yTop + 10 + i * i * 0.75 + 6 * Math.sin(t * 1.1 + i * 2.2)
      const wGlint = Math.max(3, 90 - i * 3.6), spread = 16 + i * 7
      x.globalAlpha = 0.34 * (1 - i / 26)
      x.fillRect(o.glintX + Math.sin(t * 1.35 + i * 2.4) * spread - wGlint / 2, yy, wGlint, 3)
    }
    x.globalAlpha = 1
  }
}

// Sky ramp painter: stops = [[pos, hex]...], painted with overscan.
export function sky(x, stops, o = {}) {
  const g = x.createLinearGradient(0, o.y0 ?? -OS, 0, o.y1 ?? H)
  for (const [p, c] of stops) g.addColorStop(p, c)
  x.fillStyle = g
  x.fillRect(-OS, o.y0 ?? -OS, W + OS * 2, (o.y1 ?? H) - (o.y0 ?? -OS))
}

// Soft cloud blobs (day sky), pure in t via slow drift phase.
export function clouds(x, t, seed, y, k, alpha) {
  const r = rng(seed)
  for (let i = 0; i < 5; i++) {
    const bx = ((r() * 2400 + t * (6 + r() * 8)) % (W + 900)) - 450
    const by = y + r() * 120, s = (0.6 + r() * 0.9) * k
    x.save()
    x.translate(bx, by)
    x.scale(s, s * 0.6)
    x.globalAlpha = alpha
    x.fillStyle = '#eef2f4'
    for (const [dx, dy, dr] of [[0, 0, 60], [50, 8, 44], [-52, 10, 40], [22, -18, 38], [-20, -12, 34]]) {
      x.beginPath(); x.arc(dx, dy, dr, 0, 7); x.fill()
    }
    x.restore()
  }
  x.globalAlpha = 1
}

// Submersible lamp cone: additive soft triangle, angle a pure function of t upstream.
export function lampCone(x, ox, oy, ang, len, spread, col, alpha) {
  x.save()
  x.translate(ox, oy)
  x.rotate(ang)
  x.globalCompositeOperation = 'lighter'
  const g = x.createLinearGradient(0, 0, len, 0)
  g.addColorStop(0, col)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  x.globalAlpha = alpha
  x.fillStyle = g
  x.beginPath()
  x.moveTo(0, 0)
  x.lineTo(len, -len * spread)
  x.quadraticCurveTo(len * 0.7, 0, len, len * spread)
  x.closePath(); x.fill()
  x.restore()
  x.globalAlpha = 1
}

// Drifting particulate motes (analytic, seeded; pure in t).
export function motes(x, t, seed, n, o = {}) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const bx = r() * (W + 400) - 200, sp = 6 + r() * 16, ph = r() * 6.28
    const yy = o.top ?? 0
    const range = (o.bottom ?? H) - yy
    const y = yy + (((r() * range + t * sp) % range) + range) % range
    const px = bx + Math.sin(t * (0.2 + r() * 0.3) + ph) * 40
    x.globalAlpha = (o.alpha ?? 0.3) * (0.4 + 0.6 * r())
    x.fillStyle = o.col ?? '#9fc0d8'
    const s = o.size ?? 2.4
    x.fillRect(px, y, s, s)
  }
  x.globalAlpha = 1
}

// Dandruff snow drifting on the wind (angled, seeded, pure in g).
export function snow(x, g, seed, n, o = {}) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const sp = 26 + r() * 60, drift = 20 + r() * 50, ph = r() * 6.28
    const y0 = r() * (H + 240) - 120
    const y = y0 + ((g * sp + ph * 100) % (H + 240))
    const px = ((r() * (W + 400) - 200) + g * drift + Math.sin(g * 0.8 + ph) * 30)
    const wrap = ((px % (W + 400)) + W + 400) % (W + 400) - 200
    x.globalAlpha = (o.alpha ?? 0.7) * (0.35 + 0.65 * r())
    x.fillStyle = o.col ?? '#eef4fa'
    const s = o.size ?? 3
    x.fillRect(wrap, ((y % (H + 240)) + H + 240) % (H + 240) - 120, s, s)
  }
  x.globalAlpha = 1
}

// Tapered strand: polyline pts + width0 → filled tapered blade.
function strandFill(x, pts, w0) {
  x.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const [px, py, w] = pts[i]
    const nx = i === pts.length - 1 ? px - pts[i - 1][0] : pts[i + 1][0] - px
    const ny = i === pts.length - 1 ? py - pts[i - 1][1] : pts[i + 1][1] - py
    const l = Math.hypot(nx, ny) || 1
    const ox = (-ny / l) * w * 0.5, oy = (nx / l) * w * 0.5
    if (i === 0) x.moveTo(px + ox, py + oy)
    else x.lineTo(px + ox, py + oy)
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const [px, py, w] = pts[i]
    const nx = i === pts.length - 1 ? px - pts[i - 1][0] : pts[i + 1][0] - px
    const ny = i === pts.length - 1 ? py - pts[i - 1][1] : pts[i + 1][1] - py
    const l = Math.hypot(nx, ny) || 1
    x.lineTo(px + (ny / l) * w * 0.5, py - (nx / l) * w * 0.5)
  }
  x.closePath(); x.fill()
}

// Wind-blown hair ribbons streaming from a head point (pure t, seeded wave phases).
// dir: +1 streams right, -1 left. o: {n, len, col, hi, w, rise, gust}
export function hairStream(x, hx, hy, dir, t, seed, o = {}) {
  const n = o.n ?? 7, len = o.len ?? 220, col = o.col ?? '#893c3b'
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const ph = r() * 6.28, base = (r() - 0.5) * 44, sp = 2 + r() * 1.6
    const drop = (r() - 0.2) * (o.rise ?? 0)
    const gust = 1 + 0.18 * Math.sin(t * (1.1 + r()) + ph)
    const pts = []
    for (let k = 0; k <= 10; k++) {
      const s = k / 10
      const px = hx + dir * len * s * gust
      const py = hy + base * s + Math.sin(t * sp + ph + s * 5) * (6 + 26 * s) + drop * s * s
      pts.push([px, py, (o.w ?? 9) * (1 - s * 0.88) * (0.7 + 0.3 * Math.sin(ph + i))])
    }
    x.fillStyle = i % 3 === 0 ? (o.hi ?? '#a85a4a') : col
    x.globalAlpha = (o.alpha ?? 1) * (0.85 - 0.4 * (i / n))
    strandFill(x, pts, o.w ?? 9)
  }
  x.globalAlpha = 1
}

// Hair fanned FLAT radiating on the water surface around a swimmer's head (S9).
export function hairFan(x, cx, cy, t, seed, o = {}) {
  const n = o.n ?? 16, R = o.len ?? 250, col = o.col ?? '#b8402a'
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * 0.15 + (i / (n - 1)) * Math.PI * 1.3 // fan opens away from the door side
    const ph = r() * 6.28, sp = 0.9 + r() * 0.9
    const pts = []
    for (let k = 0; k <= 8; k++) {
      const s = k / 8
      const rr = R * s * (0.9 + 0.1 * Math.sin(t * sp + ph))
      const px = cx + Math.cos(a + Math.sin(t * sp + ph + s * 4) * 0.12) * rr
      const py = cy + Math.sin(a + Math.sin(t * sp + ph + s * 4) * 0.12) * rr * 0.32 // squashed onto the plane
      pts.push([px, py, (o.w ?? 8) * (1 - s * 0.9)])
    }
    x.fillStyle = i % 4 === 0 ? (o.hi ?? '#d15a3a') : col
    x.globalAlpha = (o.alpha ?? 0.9) * (1 - 0.35 * (i / n))
    strandFill(x, pts, o.w ?? 8)
  }
  x.globalAlpha = 1
}

// Analytic debris burst: events [{t, x, y, seed}], age from REAL shot time (t).
// cols = palette; up = initial upward kick; grav = gravity px/s^2.
export function chips(x, evts, t, life, cols, n, up, grav = 900) {
  for (const e of evts) {
    const age = t - e.t
    if (age <= 0 || age > life) continue
    for (let i = 0; i < n; i++) {
      const a = hash(e.seed + i * 13) * 6.283
      const sp = (0.3 + hash(e.seed + i * 29) * 0.7) * 460
      const px = e.x + Math.cos(a) * sp * age
      const py = e.y - up * Math.sin(a) * sp * age * 0.6 + 0.5 * grav * age * age
      if (py > H + 40) continue
      x.globalAlpha = Math.max(0, 1 - age / life)
      x.fillStyle = cols[i % cols.length]
      const s = 3 + hash(e.seed + i) * 5
      x.fillRect(px, py, s, s)
    }
    x.globalAlpha = 1
  }
}

// Expanding ripple ring on water (pure function of age).
export function ripple(x, cx, cy, age, life, col = 'rgba(207,217,226,0.8)') {
  if (age <= 0 || age >= life) return
  const u = age / life
  x.strokeStyle = col
  x.globalAlpha = (1 - u) * 0.8
  x.lineWidth = 3 * (1 - u) + 1
  x.beginPath(); x.ellipse(cx, cy, 12 + u * 150, (12 + u * 150) * 0.24, 0, 0, 7); x.stroke()
  x.globalAlpha = (1 - u) * 0.4
  x.beginPath(); x.ellipse(cx, cy, 4 + u * 90, (4 + u * 90) * 0.24, 0, 0, 7); x.stroke()
  x.globalAlpha = 1
}

// Breath vapor puffs in the cold: phase-locked puffs every per seconds (pure in g).
export function breath(x, px, py, g, per, seed, alpha = 0.5) {
  const k = Math.floor(g / per)
  const u = (g - k * per) / per // 0..1 puff life
  const h1 = hash(k * 131 + seed), h2 = hash(k * 197 + seed + 5)
  if (u > 0.96) return
  const r = 6 + u * 30 * (0.7 + h1 * 0.6)
  x.globalAlpha = alpha * (1 - u) * (1 - u)
  x.fillStyle = '#cfd9e2'
  x.beginPath()
  x.ellipse(px + h2 * 60 + u * 40, py - u * 34 - h1 * 20, r * 1.5, r, 0, 0, 7)
  x.fill()
  x.globalAlpha = 1
}

// Funnel smoke plume drifting aft (pure t, seeded).
export function smoke(x, ox, oy, t, seed, o = {}) {
  const r = rng(seed)
  for (let i = 0; i < 11; i++) {
    const u = ((t * (0.1 + r() * 0.05) + r()) % 1 + 1) % 1
    const px = ox + o.dir * (u * (o.drift ?? 300) + r() * 60) + Math.sin(u * 7 + i) * 16
    const py = oy - u * (o.rise ?? 200) - r() * 30
    const rad = 12 + u * (o.grow ?? 52)
    x.globalAlpha = (1 - u) * (o.alpha ?? 0.3)
    x.fillStyle = o.col ?? '#5a6672'
    x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill()
  }
  x.globalAlpha = 1
}

// Whistle steam blast: one big puff crossing the frame after ev (abs event time).
export function steamBlast(x, ox, oy, t, ev) {
  const age = t - ev
  if (age <= 0 || age > 3.2) return
  const r = rng(101)
  for (let i = 0; i < 14; i++) {
    const d = age * (240 + r() * 200)
    const px = ox + d + Math.sin(i * 2.2 + age * 3) * 22
    const py = oy - 30 * r() - age * 26 + Math.sin(age * 2 + i) * 14
    const rad = 16 + age * 62 * (0.6 + r() * 0.8)
    x.globalAlpha = Math.max(0, (1 - age / 3.2)) * 0.4
    x.fillStyle = '#eef4fa'
    x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill()
  }
  x.globalAlpha = 1
}

// Gull scatter after the whistle: small flapping vee birds, pure t.
export function gulls(x, t, ev, ox, oy, n = 7) {
  const age = t - ev
  if (age <= 0 || age > 4.5) return
  const r = rng(77)
  for (let i = 0; i < n; i++) {
    const px = ox + age * (90 + r() * 150) + (r() - 0.5) * 120
    const py = oy - age * (70 + r() * 90) + Math.sin(age * 2 + i * 1.7) * 24
    const flap = Math.sin(age * 16 + i * 2.4) * 7
    x.globalAlpha = 0.85 * Math.min(1, 4.5 - age)
    x.strokeStyle = '#2a3440'
    x.lineWidth = 3
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(px - 9, py + flap * 0.4)
    x.quadraticCurveTo(px, py - 6 - flap, px + 9, py + flap * 0.4)
    x.stroke()
  }
  x.globalAlpha = 1
}

// Star glint (four-point star flash), k in 0..1.
export function glint(x, cx, cy, s, k) {
  if (k <= 0 || k >= 1) return
  x.save()
  x.translate(cx, cy)
  x.globalAlpha = Math.sin(k * Math.PI)
  x.fillStyle = '#fff6d8'
  const r = s * (0.4 + 0.6 * Math.sin(k * Math.PI))
  x.beginPath()
  x.moveTo(0, -r); x.quadraticCurveTo(2, -2, r, 0); x.quadraticCurveTo(2, 2, 0, r)
  x.quadraticCurveTo(-2, 2, -r, 0); x.quadraticCurveTo(-2, -2, 0, -r)
  x.closePath(); x.fill()
  x.restore()
}

// The Heart of the Flow-cean: gold heart, blue-white core, soft glow.
export function gem(x, cx, cy, s, glowA = 1) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  const g = x.createRadialGradient(0, 0, 2, 0, 0, 46)
  g.addColorStop(0, `rgba(170,215,255,${0.55 * glowA})`)
  g.addColorStop(1, 'rgba(170,215,255,0)')
  x.fillStyle = g
  x.fillRect(-46, -46, 92, 92)
  x.fillStyle = '#d9b45c'
  x.beginPath()
  x.moveTo(0, 14)
  x.bezierCurveTo(-16, 0, -13, -13, -6, -13)
  x.bezierCurveTo(-2, -13, 0, -10, 0, -8)
  x.bezierCurveTo(0, -10, 2, -13, 6, -13)
  x.bezierCurveTo(13, -13, 16, 0, 0, 14)
  x.closePath(); x.fill()
  x.fillStyle = `rgba(214,236,255,${0.9 * glowA})`
  x.beginPath(); x.arc(-3, -4, 2.6, 0, 7); x.fill()
  x.restore()
}

// Bow spray bursts at the stem: periodic foam events, pure t.
export function spray(x, stemX, stemY, t, o = {}) {
  const per = o.per ?? 1.6
  for (let k = 0; k < 4; k++) {
    const tev = Math.floor(t / per) * per - k * per
    const age = t - tev
    if (age <= 0 || age > 1.1) continue
    const r = rng(900 + k)
    for (let i = 0; i < 10; i++) {
      const sp = 90 + r() * 160
      const px = stemX + (0.2 + r() * 0.8) * sp * age * 0.9
      const py = stemY - Math.sin((r() * 0.5 + 0.5) * 1.4) * sp * age * 0.55 + 160 * age * age
      if (py > H + 20) continue
      x.globalAlpha = (1 - age / 1.1) * 0.55
      x.fillStyle = o.col ?? '#dfe9f2'
      x.beginPath(); x.arc(px, py, 2.4 + r() * 4.4, 0, 7); x.fill()
    }
  }
  x.globalAlpha = 1
}

// Old-period engraved card ornament (S11): double rule border + corner rosettes.
export function engravedFrame(x, inset, col) {
  x.strokeStyle = col
  x.lineWidth = 3
  x.strokeRect(inset, inset, W - inset * 2, H - inset * 2)
  x.lineWidth = 1.2
  x.strokeRect(inset + 14, inset + 14, W - (inset + 14) * 2, H - (inset + 14) * 2)
  for (const [rx, ry] of [[inset + 14, inset + 14], [W - inset - 14, inset + 14], [inset + 14, H - inset - 14], [W - inset - 14, H - inset - 14]]) {
    x.fillStyle = col
    x.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const rr = i % 2 ? 3 : 8
      x.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr)
    }
    x.closePath(); x.fill()
  }
}
