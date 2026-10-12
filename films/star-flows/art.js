// STAR FLOWS — art: prepare-time bakes + every painter.
// Pure functions of time; aux canvases are baked once in prepare() and never mutated.
import { W, H, txt, F } from 'filmkit/lib.js'
import { lookAt, bake } from 'filmkit/cam3d.js'
import * as A from '../remy-bros/art.js'
import * as T from './timeline.js'

const { seg, clamp, lerp, E, hash } = T

export const HAIRCOLS = ['#e07a3f', '#f2d16b', '#6fb7ff', '#d9dee8', '#9ff2c8']
export const RAZOR_PILOTS = [125, 233, 125, 233]

export const S = {
  rigs: {}, far: {}, heads: null, icons: {},
  fw: {}, fwRear: null, razors: [], cruiser: null,
  bs: null, planet: null, neb: [],
}

// ---------------------------------------------------------------- stars ----
const STARS = (() => {
  const arr = []
  for (let i = 0; i < 820; i++) {
    const r1 = hash(i * 3 + 1), r2 = hash(i * 3 + 2), r3 = hash(i * 3 + 3)
    arr.push({
      p: [lerp(-1700, 1700, r1), lerp(-850, 850, r2), lerp(-500, 2000, r3)],
      mag: 0.4 + 1.5 * hash(i * 7 + 4),
      col: hash(i + 11) > 0.82 ? '#ffe9c9' : hash(i + 11) > 0.6 ? '#cfe4ff' : '#ffffff',
      tw: 0.5 + hash(i + 31) * 1.4,
      ph: hash(i + 51) * 6.28,
    })
  }
  return arr
})()

let NEBS = []

export function drawStars(ctx, cam, t, tint = 1) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const n of NEBS) {
    const pr = cam.project(n.p)
    if (!pr) continue
    const w = n.w * pr.s
    ctx.globalAlpha = n.a * tint
    ctx.drawImage(n.img, pr.x - w / 2, pr.y - w / 2, w, w * n.img.height / n.img.width)
  }
  for (const st of STARS) {
    const pr = cam.project(st.p)
    if (!pr) continue
    const r = st.mag * clamp(pr.s * 0.8, 0.45, 3.4)
    ctx.globalAlpha = clamp((0.55 + 0.45 * Math.sin(t * st.tw + st.ph)) * tint, 0, 1)
    ctx.fillStyle = st.col
    ctx.beginPath()
    ctx.arc(pr.x, pr.y, r, 0, 6.29)
    ctx.fill()
  }
  ctx.restore()
}

// sprite billboard through a cam3d camera; returns projection or null
export function sprite3(ctx, cam, img, pos, o = {}) {
  const pr = cam.project(pos)
  if (!pr) return null
  const w = (o.worldW ?? 40) * pr.s
  const h = w * img.height / img.width
  ctx.save()
  ctx.translate(pr.x, pr.y)
  if (o.roll) ctx.rotate(o.roll)
  if (o.sx) ctx.scale(o.sx, o.sy ?? 1)
  ctx.globalAlpha = o.alpha ?? 1
  if (o.glow) {
    ctx.shadowColor = o.glow
    ctx.shadowBlur = o.glowBlur ?? 24
  }
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  ctx.restore()
  return pr
}

// ------------------------------------------------------------ explosions --
export function explosion(ctx, x, y, age, s = 1, col = '#ffb46b') {
  if (age < 0 || age > 1.1) return
  const fade = 1 - age / 1.1
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const r = s * (26 + 210 * age)
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(255,255,240,${0.95 * fade})`)
  g.addColorStop(0.35, col)
  g.addColorStop(1, 'rgba(255,90,40,0)')
  ctx.globalAlpha = fade
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, 6.29)
  ctx.fill()
  ctx.strokeStyle = `rgba(255,210,120,${0.5 * fade})`
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(x, y, s * age * 330, 0, 6.29)
  ctx.stroke()
  for (let i = 0; i < 12; i++) {
    const a = hash(i * 13 + 7) * 6.28
    const sp = s * (140 + 260 * hash(i + 99))
    const d = sp * age
    ctx.strokeStyle = `rgba(255,200,130,${0.8 * fade})`
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
    ctx.lineTo(x + Math.cos(a) * (d + s * 40 * fade), y + Math.sin(a) * (d + s * 40 * fade))
    ctx.stroke()
  }
  ctx.restore()
}

// the razor's bald head pops out spinning — a readable, funny kill
export function flyingHead(ctx, icon, x, y, age, dir) {
  if (age < 0 || age > 1.3 || !icon) return
  const u = age / 1.3
  const px = x + dir * 90 * age
  const py = y - 40 * age + 60 * age * age
  ctx.save()
  ctx.globalAlpha = 1 - u
  ctx.translate(px, py)
  ctx.rotate(dir * age * 6)
  const w = 56 * (1 - u * 0.3)
  ctx.drawImage(icon, -w / 2, -w / 2, w, w)
  ctx.restore()
}

// ------------------------------------------------------------ hair nova ---
const NOVA = (() => {
  const arr = []
  for (let i = 0; i < 1050; i++) {
    const a = hash(i * 5 + 2) * 6.28
    const up = hash(i * 5 + 3)
    arr.push({
      d: [Math.cos(a), Math.sin(a) * 0.86],
      sp: 260 + 620 * Math.pow(hash(i * 5 + 4), 1.4),
      len: 26 + 90 * hash(i * 5 + 5),
      col: HAIRCOLS[i % HAIRCOLS.length],
      wob: 0.5 + hash(i + 77) * 1.2,
      ph: hash(i + 177) * 6.28,
    })
  }
  return arr
})()

export function hairNova(ctx, cx, cy, age) {
  if (age < 0) return
  const life = 4.4
  const u = clamp(age / life)
  const fade = 1 - u
  if (fade <= 0) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // rings
  for (let k = 0; k < 3; k++) {
    const r = 60 + (age - k * 0.18) * (520 + k * 160)
    if (r <= 60) continue
    ctx.globalAlpha = fade * (0.5 - k * 0.12)
    ctx.strokeStyle = k === 0 ? '#fff6df' : k === 1 ? '#ffd9a0' : '#9ff2c8'
    ctx.lineWidth = 8 - k * 2
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, 6.29)
    ctx.stroke()
  }
  // strands
  for (let i = 0; i < NOVA.length; i++) {
    const n = NOVA[i]
    const drag = 1 - 0.22 * u
    const rr = n.sp * age * drag
    const wob = Math.sin(age * 3 * n.wob + n.ph) * 0.5
    const dx = n.d[0] * Math.cos(wob) - n.d[1] * Math.sin(wob)
    const dy = n.d[0] * Math.sin(wob) + n.d[1] * Math.cos(wob)
    const L = n.len * (0.4 + fade)
    ctx.globalAlpha = fade * 0.85
    ctx.strokeStyle = n.col
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(cx + dx * rr, cy + dy * rr)
    ctx.lineTo(cx + dx * (rr + L), cy + dy * (rr + L))
    ctx.stroke()
  }
  // core — blazing white-hot at impact, cooling to amber
  const coreA = Math.max(0, 1 - age * 1.1)
  ctx.globalAlpha = coreA
  const cr = 130 + 150 * Math.exp(-age * 1.8)
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr)
  g.addColorStop(0, 'rgba(255,255,252,1)')
  g.addColorStop(0.4, 'rgba(255,236,190,0.92)')
  g.addColorStop(0.7, 'rgba(255,190,110,0.55)')
  g.addColorStop(1, 'rgba(255,150,80,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, cr, 0, 6.29)
  ctx.fill()
  ctx.restore()
}

// ---------------------------------------------------------------- bolts ----
export function drawBolt(ctx, cam, b, g) {
  const age = g - b.g
  if (age < 0 || age > b.life) return null
  const lenU = b.len ?? 46
  const p0 = T.vadd(b.o, T.vscl(b.d, b.v * age))
  const p1 = T.vadd(b.o, T.vscl(b.d, b.v * age - Math.min(lenU, b.v * age)))
  const a = cam.project(p0)
  const c = cam.project(p1)
  if (!a || !c) return null
  const wA = age < 0.08 ? age / 0.08 : 1
  const wZ = clamp(age / b.life, 0, 1)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  const wid = clamp(a.s * 1.6, 2, 7) * (b.wmul ?? 1)
  ctx.globalAlpha = 0.3 * wA * (1 - wZ * 0.7)
  ctx.strokeStyle = b.col
  ctx.lineWidth = wid * 3
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(c.x, c.y)
  ctx.stroke()
  ctx.globalAlpha = 0.95 * wA * (1 - wZ * 0.6)
  ctx.lineWidth = wid
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(c.x, c.y)
  ctx.stroke()
  ctx.restore()
  return a
}

// ---------------------------------------------------------------- bakes ----
function bakeBaldStar() {
  return bake('sf-bs', 1300, 1300, (x, w, h) => {
    const cx = w / 2, cy = h / 2, r = 610
    x.save()
    // skull sphere
    const g = x.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.1, cx, cy, r)
    g.addColorStop(0, '#f9ddc2')
    g.addColorStop(0.35, '#e7bd9c')
    g.addColorStop(0.72, '#b98a70')
    g.addColorStop(0.92, '#7c523f')
    g.addColorStop(1, '#51372c')
    x.fillStyle = g
    x.beginPath()
    x.arc(cx, cy, r, 0, 6.29)
    x.fill()
    x.clip()
    // pores
    for (let i = 0; i < 1100; i++) {
      const a = hash(i * 3 + 1) * 6.28
      const rr = Math.sqrt(hash(i * 3 + 2)) * r
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr
      x.fillStyle = hash(i) > 0.5 ? 'rgba(90,55,40,0.10)' : 'rgba(255,240,225,0.08)'
      x.beginPath()
      x.arc(px, py, 2 + hash(i + 5) * 5, 0, 6.29)
      x.fill()
    }
    // superlaser dish — the shave port
    const dx = cx - r * 0.34, dy = cy - r * 0.38, dr = r * 0.27
    const dg = x.createRadialGradient(dx, dy, dr * 0.1, dx, dy, dr)
    dg.addColorStop(0, '#1c1512')
    dg.addColorStop(0.55, '#33231d')
    dg.addColorStop(0.85, '#4a3128')
    dg.addColorStop(1, '#d8ac8d')
    x.fillStyle = dg
    x.beginPath()
    x.arc(dx, dy, dr, 0, 6.29)
    x.fill()
    x.strokeStyle = 'rgba(120,255,170,0.5)'
    x.lineWidth = 3
    for (let k = 1; k <= 3; k++) {
      x.globalAlpha = 0.7 - k * 0.15
      x.beginPath()
      x.arc(dx, dy, dr * k * 0.26, 0, 6.29)
      x.stroke()
    }
    x.globalAlpha = 1
    // equatorial trench
    const ty = cy + r * 0.1
    const tg = x.createLinearGradient(0, ty - 40, 0, ty + 40)
    tg.addColorStop(0, 'rgba(40,22,16,0)')
    tg.addColorStop(0.3, 'rgba(40,22,16,0.75)')
    tg.addColorStop(0.5, 'rgba(22,10,7,0.95)')
    tg.addColorStop(0.7, 'rgba(40,22,16,0.75)')
    tg.addColorStop(1, 'rgba(40,22,16,0)')
    x.fillStyle = tg
    x.fillRect(cx - r, ty - 40, r * 2, 80)
    for (let px = -r; px < r; px += 26) {
      x.fillStyle = 'rgba(20,9,6,0.6)'
      x.fillRect(cx + px, ty - 14, 5, 28)
    }
    // cranial shine + chin shadow
    const sh = x.createRadialGradient(cx - r * 0.42, cy - r * 0.5, 0, cx - r * 0.42, cy - r * 0.5, r * 0.6)
    sh.addColorStop(0, 'rgba(255,248,238,0.55)')
    sh.addColorStop(1, 'rgba(255,248,238,0)')
    x.fillStyle = sh
    x.fillRect(0, 0, w, h)
    const ch = x.createRadialGradient(cx, cy + r * 1.15, r * 0.2, cx, cy + r * 1.15, r * 0.8)
    ch.addColorStop(0, 'rgba(30,14,10,0.5)')
    ch.addColorStop(1, 'rgba(30,14,10,0)')
    x.fillStyle = ch
    x.fillRect(0, 0, w, h)
    x.restore()
  })
}

function bakePlanet() {
  return bake('sf-planet', 880, 880, (x, w) => {
    const cx = w / 2, cy = w / 2, r = 360
    x.save()
    const g = x.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r)
    g.addColorStop(0, '#bfeee6')
    g.addColorStop(0.4, '#5fb8ad')
    g.addColorStop(0.75, '#2e7d80')
    g.addColorStop(1, '#173f4c')
    x.fillStyle = g
    x.beginPath()
    x.arc(cx, cy, r, 0, 6.29)
    x.fill()
    x.clip()
    for (let i = 0; i < 22; i++) {
      const a = hash(i * 9 + 1) * 6.28
      const rr = Math.sqrt(hash(i * 9 + 2)) * r * 0.92
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr
      const sz = 30 + hash(i + 40) * 90
      x.fillStyle = i % 3 === 0 ? '#3f8a58' : i % 3 === 1 ? '#4e9d67' : '#35714a'
      x.beginPath()
      const pts = 9
      for (let k = 0; k <= pts; k++) {
        const pa = (k / pts) * 6.28
        const pr = sz * (0.6 + 0.4 * hash(i * 20 + k))
        const qx = px + Math.cos(pa) * pr, qy = py + Math.sin(pa) * pr * 0.7
        if (k === 0) x.moveTo(qx, qy)
        else x.lineTo(qx, qy)
      }
      x.closePath()
      x.fill()
    }
    // poles + cloud streaks
    x.fillStyle = 'rgba(235,250,250,0.75)'
    x.beginPath()
    x.ellipse(cx, cy - r * 0.94, r * 0.55, r * 0.22, 0, 0, 6.29)
    x.fill()
    x.fillStyle = 'rgba(235,250,250,0.5)'
    x.beginPath()
    x.ellipse(cx, cy + r * 0.96, r * 0.5, r * 0.18, 0, 0, 6.29)
    x.fill()
    for (let i = 0; i < 14; i++) {
      const py = cy - r + hash(i + 3) * r * 2
      x.fillStyle = `rgba(255,255,255,${0.10 + 0.12 * hash(i + 9)})`
      x.beginPath()
      x.ellipse(cx + (hash(i + 21) - 0.5) * r, py, r * (0.2 + hash(i + 31) * 0.4), 7 + hash(i + 41) * 9, 0, 0, 6.29)
      x.fill()
    }
    x.restore()
    // atmosphere rim
    x.strokeStyle = 'rgba(150,240,225,0.5)'
    x.lineWidth = 7
    x.beginPath()
    x.arc(cx, cy, r + 3, 0, 6.29)
    x.stroke()
  })
}

function bakeFlowWing(accent, headId) {
  return bake(`sf-fw-${accent}-${headId}`, 300, 160, (x, w, h) => {
    const cx = w / 2, cy = h / 2
    x.save()
    x.translate(cx, cy)
    const foil = (ang, flipY) => {
      x.save()
      x.rotate(ang)
      x.fillStyle = '#9aa5b3'
      x.beginPath()
      x.moveTo(-64, flipY ? 5 : -5)
      x.lineTo(46, flipY ? 8 : -8)
      x.lineTo(64, flipY ? 3 : -3)
      x.lineTo(64, flipY ? -3 : 3)
      x.lineTo(46, flipY ? -8 : 8)
      x.lineTo(-64, flipY ? -5 : 5)
      x.closePath()
      x.fill()
      x.fillStyle = accent
      x.fillRect(-10, flipY ? 2 : -6, 56, 4)
      x.fillStyle = '#2b2f38'
      x.fillRect(58, -4, 12, 8)
      x.fillStyle = '#ff5a4d'
      x.fillRect(68, -2, 6, 4)
      x.restore()
    }
    foil(-0.42, true)
    foil(0.42, false)
    foil(-0.9, true)
    foil(0.9, false)
    // fuselage
    const fg = x.createLinearGradient(0, -20, 0, 22)
    fg.addColorStop(0, '#e8edf3')
    fg.addColorStop(0.55, '#b9c2ce')
    fg.addColorStop(1, '#7d8794')
    x.fillStyle = fg
    x.beginPath()
    x.moveTo(128, 0)
    x.quadraticCurveTo(70, -17, -20, -13)
    x.lineTo(-78, -8)
    x.lineTo(-78, 8)
    x.lineTo(-20, 13)
    x.quadraticCurveTo(70, 17, 128, 0)
    x.closePath()
    x.fill()
    x.strokeStyle = '#39404b'
    x.lineWidth = 2
    x.stroke()
    // engine glows
    for (const ex of [-70, -56]) {
      const eg = x.createRadialGradient(ex, 0, 1, ex, 0, 14)
      eg.addColorStop(0, '#fff7df')
      eg.addColorStop(0.4, '#ffb454')
      eg.addColorStop(1, 'rgba(255,140,60,0)')
      x.fillStyle = eg
      x.beginPath()
      x.arc(ex, 0, 14, 0, 6.29)
      x.fill()
    }
    x.fillStyle = accent
    x.fillRect(20, -12, 8, 24)
    x.fillRect(42, -9, 5, 18)
    // canopy with pilot head
    x.save()
    x.beginPath()
    x.ellipse(78, -4, 21, 12, 0, 0, 6.29)
    x.clip()
    x.fillStyle = '#1d2a40'
    x.fillRect(57, -18, 42, 30)
    if (S.icons[headId]) x.drawImage(S.icons[headId], 62, -14, 30, 30)
    x.fillStyle = 'rgba(200,230,255,0.35)'
    x.beginPath()
    x.ellipse(84, -9, 9, 4, -0.3, 0, 6.29)
    x.fill()
    x.restore()
    x.strokeStyle = '#2b3340'
    x.lineWidth = 2.5
    x.beginPath()
    x.ellipse(78, -4, 21, 12, 0, 0, 6.29)
    x.stroke()
    x.restore()
  })
}

function bakeFlowWingRear(headId) {
  return bake(`sf-fwr-${headId}`, 180, 170, (x, w, h) => {
    const cx = w / 2, cy = h / 2
    x.save()
    x.translate(cx, cy)
    const foil = (ang) => {
      x.save()
      x.rotate(ang)
      x.fillStyle = '#9aa5b3'
      x.beginPath()
      x.moveTo(0, -5)
      x.lineTo(76, -9)
      x.lineTo(76, 9)
      x.lineTo(0, 5)
      x.closePath()
      x.fill()
      x.fillStyle = '#2b2f38'
      x.fillRect(70, -5, 10, 10)
      x.restore()
    }
    for (const a of [-2.5, -0.65, 0.65, 2.5]) foil(a)
    // fuselage from behind
    const fg = x.createRadialGradient(-6, -6, 4, 0, 0, 34)
    fg.addColorStop(0, '#dfe5ec')
    fg.addColorStop(1, '#77808d')
    x.fillStyle = fg
    x.beginPath()
    x.ellipse(0, 0, 24, 26, 0, 0, 6.29)
    x.fill()
    x.strokeStyle = '#39404b'
    x.lineWidth = 2
    x.stroke()
    // engine bells
    for (const [ex, ey] of [[-15, -12], [15, -12], [-15, 12], [15, 12]]) {
      const eg = x.createRadialGradient(ex, ey, 1, ex, ey, 12)
      eg.addColorStop(0, '#ffffff')
      eg.addColorStop(0.35, '#ffc46b')
      eg.addColorStop(1, 'rgba(255,130,40,0)')
      x.fillStyle = eg
      x.beginPath()
      x.arc(ex, ey, 12, 0, 6.29)
      x.fill()
    }
    // canopy bump + pilot
    x.save()
    x.beginPath()
    x.ellipse(0, -24, 12, 9, 0, 0, 6.29)
    x.clip()
    x.fillStyle = '#1d2a40'
    x.fillRect(-14, -35, 28, 22)
    if (S.icons[headId]) x.drawImage(S.icons[headId], -9, -33, 18, 18)
    x.restore()
    x.strokeStyle = '#2b3340'
    x.lineWidth = 2
    x.beginPath()
    x.ellipse(0, -24, 12, 9, 0, 0, 6.29)
    x.stroke()
    x.restore()
  })
}

function bakeRazor(headId) {
  return bake(`sf-rz-${headId}`, 210, 170, (x, w, h) => {
    const cx = w / 2, cy = h / 2
    x.save()
    x.translate(cx, cy)
    const panel = (side) => {
      x.save()
      x.translate(side * 48, 0)
      x.fillStyle = '#23262e'
      x.beginPath()
      x.moveTo(0, -56)
      x.lineTo(side * 24, -36)
      x.lineTo(side * 24, 36)
      x.lineTo(0, 56)
      x.lineTo(-side * 24, 36)
      x.lineTo(-side * 24, -36)
      x.closePath()
      x.fill()
      x.strokeStyle = '#b23a48'
      x.lineWidth = 3.5
      x.stroke()
      x.strokeStyle = 'rgba(140,150,170,0.3)'
      x.lineWidth = 2
      for (let k = -1; k <= 1; k++) {
        x.beginPath()
        x.moveTo(-side * 24, k * 20)
        x.lineTo(side * 24, k * 20)
        x.stroke()
      }
      x.restore()
    }
    // fuselage tube connecting the panels through the cockpit
    x.fillStyle = '#3a3f4a'
    x.beginPath()
    x.moveTo(-48, -9)
    x.lineTo(48, -9)
    x.lineTo(48, 9)
    x.lineTo(-48, 9)
    x.closePath()
    x.fill()
    panel(1)
    panel(-1)
    // bald cockpit ball
    const bg = x.createRadialGradient(-8, -8, 3, 0, 0, 30)
    bg.addColorStop(0, '#f3d9c0')
    bg.addColorStop(1, '#8a5f49')
    x.fillStyle = bg
    x.beginPath()
    x.arc(0, 0, 30, 0, 6.29)
    x.fill()
    x.strokeStyle = '#2a2d35'
    x.lineWidth = 5
    x.stroke()
    if (S.icons[headId]) x.drawImage(S.icons[headId], -17, -17, 34, 34)
    // chin cannons
    x.fillStyle = '#2b2f38'
    x.fillRect(-9, 28, 6, 13)
    x.fillRect(3, 28, 6, 13)
    x.restore()
  })
}

function bakeCruiser() {
  return bake('sf-cr', 380, 140, (x, w, h) => {
    const cx = w / 2, cy = h / 2
    x.save()
    x.translate(cx, cy)
    const fg = x.createLinearGradient(0, -30, 0, 30)
    fg.addColorStop(0, '#efece3')
    fg.addColorStop(0.55, '#cfc9bc')
    fg.addColorStop(1, '#8f887b')
    x.fillStyle = fg
    x.beginPath()
    x.moveTo(-165, -6)
    x.quadraticCurveTo(-60, -26, 120, -14)
    x.quadraticCurveTo(168, -9, 172, 0)
    x.quadraticCurveTo(168, 9, 120, 14)
    x.quadraticCurveTo(-60, 26, -165, 6)
    x.closePath()
    x.fill()
    x.strokeStyle = '#5d5749'
    x.lineWidth = 2.5
    x.stroke()
    // cockpit bulb
    x.fillStyle = '#b9c2ce'
    x.beginPath()
    x.ellipse(150, -2, 16, 11, 0, 0, 6.29)
    x.fill()
    x.stroke()
    x.fillStyle = '#2b4a6b'
    x.beginPath()
    x.ellipse(154, -3, 8, 6, 0, 0, 6.29)
    x.fill()
    // princess wisp in the window
    x.strokeStyle = '#f2d16b'
    x.lineWidth = 2
    x.beginPath()
    x.moveTo(156, -6)
    x.quadraticCurveTo(151, -3, 154, 0)
    x.stroke()
    // fin + stripe
    x.fillStyle = '#a9a294'
    x.beginPath()
    x.moveTo(-40, -18)
    x.lineTo(-12, -34)
    x.lineTo(-2, -18)
    x.closePath()
    x.fill()
    x.fillStyle = '#c23a3a'
    x.fillRect(-150, -8, 250, 5)
    // engine bells
    for (const ex of [-160, -140]) {
      x.fillStyle = '#3a3f4a'
      x.beginPath()
      x.ellipse(ex, 0, 7, 13, 0, 0, 6.29)
      x.fill()
      const eg = x.createRadialGradient(ex, 0, 1, ex, 0, 12)
      eg.addColorStop(0, '#fff3d8')
      eg.addColorStop(0.5, '#ffa54e')
      eg.addColorStop(1, 'rgba(255,140,60,0)')
      x.fillStyle = eg
      x.beginPath()
      x.arc(ex - 8, 0, 12, 0, 6.29)
      x.fill()
    }
    x.restore()
  })
}

function bakeNeb(seed, col) {
  return bake(`sf-neb-${seed}`, 640, 400, (x, w, h) => {
    x.save()
    for (let i = 0; i < 16; i++) {
      const r = 40 + hash(seed + i * 7) * 110
      // keep every blob fully inside the canvas so no hard edges show
      const px = r + hash(seed * 31 + i) * (w - 2 * r)
      const py = r + hash(seed * 47 + i) * (h - 2 * r)
      const g = x.createRadialGradient(px, py, 0, px, py, r)
      g.addColorStop(0, col + '0.035)')
      g.addColorStop(1, col + '0)')
      x.fillStyle = g
      x.beginPath()
      x.arc(px, py, r, 0, 6.29)
      x.fill()
    }
    x.restore()
  })
}

function bakeThrone() {
  return bake('sf-throne', W, H, (x) => {
    // wall
    const wg = x.createLinearGradient(0, 0, 0, H)
    wg.addColorStop(0, '#d9cdb8')
    wg.addColorStop(0.6, '#c4b49a')
    wg.addColorStop(1, '#a0906f')
    x.fillStyle = wg
    x.fillRect(0, 0, W, H)
    // warm wall panels
    x.strokeStyle = 'rgba(90,70,40,0.25)'
    x.lineWidth = 3
    for (let py = 0; py < 660; py += 132) {
      x.beginPath()
      x.moveTo(0, py + 60)
      x.lineTo(W, py + 60)
      x.stroke()
    }
    // great round window
    const wcx = 960, wcy = 430, wr = 285
    x.fillStyle = '#0a0d18'
    x.beginPath()
    x.arc(wcx, wcy, wr + 26, 0, 6.29)
    x.fill()
    const sg = x.createRadialGradient(wcx - 60, wcy - 60, 10, wcx, wcy, wr)
    sg.addColorStop(0, '#141b30')
    sg.addColorStop(1, '#060811')
    x.fillStyle = sg
    x.beginPath()
    x.arc(wcx, wcy, wr, 0, 6.29)
    x.fill()
    x.save()
    x.clip()
    x.fillStyle = '#cfe4ff'
    for (let i = 0; i < 90; i++) {
      const a = hash(i * 3 + 1) * 6.28
      const rr = Math.sqrt(hash(i * 3 + 2)) * wr
      x.globalAlpha = 0.3 + 0.7 * hash(i + 5)
      x.beginPath()
      x.arc(wcx + Math.cos(a) * rr, wcy + Math.sin(a) * rr, 0.8 + hash(i + 9) * 1.6, 0, 6.29)
      x.fill()
    }
    x.globalAlpha = 1
    // Flowhome seen from orbit
    x.fillStyle = '#2e7d80'
    x.beginPath()
    x.arc(wcx + wr * 0.5, wcy + wr * 0.42, 62, 0, 6.29)
    x.fill()
    x.fillStyle = '#4e9d67'
    x.beginPath()
    x.arc(wcx + wr * 0.44, wcy + wr * 0.38, 18, 0, 6.29)
    x.arc(wcx + wr * 0.58, wcy + wr * 0.5, 14, 0, 6.29)
    x.fill()
    x.restore()
    // gold window frame
    x.strokeStyle = '#caa548'
    x.lineWidth = 16
    x.beginPath()
    x.arc(wcx, wcy, wr + 18, 0, 6.29)
    x.stroke()
    x.strokeStyle = '#8a6d2b'
    x.lineWidth = 4
    x.beginPath()
    x.arc(wcx, wcy, wr + 28, 0, 6.29)
    x.stroke()
    // side arched windows
    const arch = (ax) => {
      x.fillStyle = '#0a0d18'
      x.beginPath()
      x.moveTo(ax - 62, 700)
      x.lineTo(ax - 62, 300)
      x.arc(ax, 300, 62, Math.PI, 0)
      x.lineTo(ax + 62, 700)
      x.closePath()
      x.fill()
      x.strokeStyle = '#caa548'
      x.lineWidth = 8
      x.stroke()
      x.save()
      x.clip()
      x.fillStyle = '#cfe4ff'
      for (let i = 0; i < 22; i++) {
        x.globalAlpha = 0.3 + 0.7 * hash(ax + i)
        x.beginPath()
        x.arc(ax + (hash(i * 3 + ax) - 0.5) * 124, 240 + hash(i * 5 + ax) * 440, 1.4, 0, 6.29)
        x.fill()
      }
      x.restore()
    }
    arch(330)
    arch(1590)
    // columns
    const column = (cx2) => {
      const cg = x.createLinearGradient(cx2 - 52, 0, cx2 + 52, 0)
      cg.addColorStop(0, '#6e5f45')
      cg.addColorStop(0.3, '#c9b88f')
      cg.addColorStop(0.55, '#e2d4ae')
      cg.addColorStop(1, '#7c6c4d')
      x.fillStyle = cg
      x.fillRect(cx2 - 52, 130, 104, 700)
      x.strokeStyle = 'rgba(60,45,25,0.35)'
      x.lineWidth = 3
      for (let k = -2; k <= 2; k++) {
        x.beginPath()
        x.moveTo(cx2 + k * 19, 140)
        x.lineTo(cx2 + k * 19, 820)
        x.stroke()
      }
      x.fillStyle = '#8a7a55'
      x.fillRect(cx2 - 66, 96, 132, 40)
      x.fillRect(cx2 - 66, 818, 132, 44)
    }
    column(120)
    column(500)
    column(1420)
    column(1800)
    // hair pennant banners
    const pennant = (bx, col) => {
      x.fillStyle = col
      x.beginPath()
      x.moveTo(bx - 58, 0)
      x.lineTo(bx + 58, 0)
      x.lineTo(bx + 58, 280)
      x.lineTo(bx, 336)
      x.lineTo(bx - 58, 280)
      x.closePath()
      x.fill()
      x.strokeStyle = '#caa548'
      x.lineWidth = 5
      x.stroke()
      // flowing-lock emblem: three tapering bezier strands
      x.strokeStyle = 'rgba(20,60,45,0.8)'
      x.lineCap = 'round'
      for (let k = 0; k < 3; k++) {
        x.lineWidth = 9 - k * 2.5
        x.beginPath()
        x.moveTo(bx - 6 + k * 7, 92)
        x.bezierCurveTo(bx + 34 + k * 7, 130, bx - 30 + k * 7, 170, bx + 6 + k * 7, 224)
        x.stroke()
      }
    }
    pennant(310, '#9ff2c8')
    pennant(690, '#9ff2c8')
    pennant(1230, '#9ff2c8')
    pennant(1610, '#9ff2c8')
    // floor
    const fg = x.createLinearGradient(0, 830, 0, H)
    fg.addColorStop(0, '#4a3f33')
    fg.addColorStop(0.25, '#38302a')
    fg.addColorStop(1, '#241f1c')
    x.fillStyle = fg
    x.fillRect(0, 830, W, H - 830)
    x.fillStyle = '#1d1917'
    x.fillRect(0, 826, W, 8)
    // inlay arcs + gloss
    x.strokeStyle = 'rgba(202,165,72,0.4)'
    x.lineWidth = 3
    for (let k = 0; k < 3; k++) {
      x.beginPath()
      x.ellipse(960, 1000, 320 + k * 260, 66 + k * 52, 0, Math.PI, 0, true)
      x.stroke()
    }
    const gl = x.createLinearGradient(0, 830, 0, 1000)
    gl.addColorStop(0, 'rgba(255,240,200,0.16)')
    gl.addColorStop(1, 'rgba(255,240,200,0)')
    x.fillStyle = gl
    x.fillRect(0, 830, W, 170)
  })
}

// -------------------------------------------------------------- prepare ----
export async function prepare() {
  S.heads = await A.loadHeads()
  const ids = [T.HERO, 24, 28, 12, 32, 23, ...T.FLEET_IDS, ...RAZOR_PILOTS]
  for (const id of ids) S.icons[id] = A.headIcon(S.heads, id, 5)
  S.rigs[T.HERO] = await A.loadRemy(T.HERO, false)
  S.rigs[12] = await A.loadRemy(12, false)
  S.rigs[32] = await A.loadRemy(32, false)
  S.rigs[24] = await A.loadRemy(24, false)
  S.rigs[28] = await A.loadRemy(28, false)
  for (const id of T.FLEET_IDS) S.rigs[id] = await A.loadRemy(id, false)
  for (const id of T.CROWD_IDS) S.far[id] = await A.loadRemy(id, true)

  S.fw[T.HERO] = bakeFlowWing('#e07a3f', T.HERO)
  S.fw[24] = bakeFlowWing('#f2d16b', 24)
  S.fw[28] = bakeFlowWing('#6fb7ff', 28)
  S.fwRear = bakeFlowWingRear(T.HERO)
  S.razors = RAZOR_PILOTS.map((id) => bakeRazor(id))
  S.cruiser = bakeCruiser()
  S.bs = bakeBaldStar()
  S.planet = bakePlanet()
  S.throne = bakeThrone()
  S.nebA = bakeNeb(3, 'rgba(120,220,190,')
  S.nebB = bakeNeb(8, 'rgba(150,140,230,')
  NEBS = [
    { img: S.nebA, p: [-700, 260, 1500], w: 2400, a: 0.9 },
    { img: S.nebB, p: [800, -320, 1750], w: 2600, a: 0.55 },
  ]
}

// painters wired in film.js live below -------------------------------------

// Crawl geometry: a hyperbolic recede plane. Convergence is physical (real
// crawls squeeze far text), so per-line z-gaps GROW with depth for headroom
// and lines fade out once the squeeze would collide them.
const crawlY = (z) => 262 + 700 / (1 + (z - 4) / 60)
const crawlScale = (z) => 1 / (1 + (z - 4) / 70)
const CRAWL_CUM = (() => {
  const cum = [0]
  let bodyN = 0
  for (let i = 0; i < T.CRAWL_LINES.length; i++) {
    const ln = T.CRAWL_LINES[i]
    const next = T.CRAWL_LINES[i + 1]
    let gap
    if (ln.kind === 'ep') gap = 20
    else if (ln.kind === 'sub') gap = 16
    else if (!ln.s) gap = 10
    else {
      gap = 13 + bodyN
      bodyN++
      if (next && !next.s) gap = 10
    }
    cum.push(cum[i] + gap)
  }
  return cum
})()

export function drawCrawl(ctx, t) {
  const n = T.CRAWL_LINES.length
  for (let i = 0; i < n; i++) {
    const ln = T.CRAWL_LINES[i]
    if (!ln.s) continue
    const z = T.CRAWL_Z0 + (t - T.T.crawl) * T.CRAWL_SPEED - CRAWL_CUM[i]
    if (z < 4 || z > 122) continue
    const sc = crawlScale(z)
    const base = ln.kind === 'ep' ? 96 : ln.kind === 'sub' ? 72 : 62
    const size = base * sc
    if (size < 11) continue
    const alpha = clamp(seg(z, 4, 12)) * clamp(1 - seg(z, 84, 122))
    txt(ctx, ln.s, 960, crawlY(z), {
      size, font: ln.kind ? F.anton : F.grot, weight: ln.kind ? '' : 700,
      color: '#ffd23f', align: 'center', base: 'middle', track: ln.kind ? 8 : 1, alpha,
      stroke: size > 24 ? '#3a2a06' : null, strokeW: Math.max(1, size * 0.04),
    })
  }
}

export function starStreaks(ctx, k) {
  if (k <= 0) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 64; i++) {
    const a = hash(i * 11 + 3) * 6.28
    const r0 = 150 + hash(i + 31) * 200
    const len = k * (260 + hash(i + 51) * 520)
    ctx.globalAlpha = 0.7 * k
    ctx.strokeStyle = i % 5 === 0 ? '#cfe4ff' : '#ffffff'
    ctx.lineWidth = 1.5 + hash(i + 9) * 2
    ctx.beginPath()
    ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0)
    ctx.lineTo(W / 2 + Math.cos(a) * (r0 + len), H / 2 + Math.sin(a) * (r0 + len))
    ctx.stroke()
  }
  ctx.restore()
}

export function drawLogo(ctx, t) {
  const p = E.outCubic(seg(t, T.T.logo, T.T.logo + 0.55))
  if (p <= 0) return
  const out = seg(t, 8.4, 9.9)
  const scale = lerp(2.6, 1, p) * lerp(1, 0.55, E.inCubic(out))
  const shake = t > T.T.logoLand && t < T.T.logoLand + 0.4 ? Math.sin(t * 90) * 9 * (1 - seg(t, T.T.logoLand, T.T.logoLand + 0.4)) : 0
  const alpha = clamp(1 - seg(t, 8.9, 9.9))
  ctx.save()
  ctx.translate(W / 2 + shake, 545)
  ctx.scale(scale, scale)
  const size = 330
  for (const [s, yy] of [['STAR', -170], ['FLOWS', 150]]) {
    txt(ctx, s, 0, yy, {
      size, font: F.anton, color: '#ffd23f', align: 'center', base: 'middle',
      track: 10, alpha, stroke: '#241a05', strokeW: 12, glow: '#ffb42e', glowBlur: 26,
    })
  }
  ctx.restore()
  // episode subtitle while the logo holds
  const sub = clamp(seg(t, 6.4, 7.1)) * alpha
  if (sub > 0) {
    txt(ctx, 'E P I S O D E   I V   —   A   N E W   F L O W', W / 2, 902, {
      size: 34, font: F.mono, weight: 500, color: '#cfe4ff', align: 'center',
      base: 'middle', track: 2, alpha: sub,
    })
  }
}

// ------------------------------------------------------------ pursuit -----
// The Bald Star is staged in screen space so its eclipse of the frame is
// deterministic (world-space projection undersold the reveal in QA round 1).
function drawBaldStarScreen(ctx, g) {
  const u = E.outQuad(seg(g, T.BS_START, T.T.dog - 0.2))
  const cy = lerp(1900, 952, u)
  const cx = lerp(980, 924, u)
  const r = 800
  ctx.save()
  ctx.globalAlpha = 0.98
  ctx.drawImage(S.bs, cx - r, cy - r, r * 2, r * 2)
  ctx.restore()
}

export function drawPursuit(ctx, g, t) {
  const cam = lookAt(
    [10 * Math.sin(g * 0.09), 26, -150 + (g - 26) * 10],
    [60, 10, 1000], 46,
  )
  drawStars(ctx, cam, t)
  sprite3(ctx, cam, S.planet, T.PLANET.p, { worldW: T.PLANET.r * 2.2 })
  // cruiser + flow-drive trail
  if (g < T.JUMP_G + 0.7) {
    const p = T.cruiserPos(Math.min(g, T.JUMP_G))
    const jump = seg(g, T.JUMP_G, T.JUMP_G + 0.55)
    // flowing drive trail — one continuous strand, waving
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = '#9ff2c8'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const [lw, aa] of [[10, 0.35], [4.5, 0.85]]) {
      ctx.globalAlpha = aa * (1 - jump * 0.8)
      ctx.lineWidth = lw
      ctx.beginPath()
      let started = false
      for (let k = 0; k <= 9; k++) {
        const back = T.vadd(p, [-46 - k * 34, -2 + Math.sin(g * 3 + k * 0.75) * (4 + k * 2.6), -k * 6])
        const pr = cam.project(back)
        if (!pr) { started = false; continue }
        if (!started) { ctx.moveTo(pr.x, pr.y); started = true } else ctx.lineTo(pr.x, pr.y)
      }
      ctx.stroke()
    }
    ctx.restore()
    const sx = jump > 0 ? 1 + jump * 2.6 : 1
    sprite3(ctx, cam, S.cruiser, p, {
      worldW: 132, sx, sy: 1 - jump * 0.5,
      alpha: 1 - seg(g, T.JUMP_G + 0.35, T.JUMP_G + 0.7),
      glow: '#9ff2c8', glowBlur: 18,
    })
    if (g >= T.JUMP_G && g < T.JUMP_G + 0.3) {
      const pr = cam.project(p)
      if (pr) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 1 - jump
        const rr = 60 + 260 * jump
        const gg = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, rr)
        gg.addColorStop(0, 'rgba(255,255,255,0.9)')
        gg.addColorStop(1, 'rgba(159,242,200,0)')
        ctx.fillStyle = gg
        ctx.beginPath()
        ctx.arc(pr.x, pr.y, rr, 0, 6.29)
        ctx.fill()
        ctx.restore()
      }
    }
    // grazes
    if (Math.abs(g - T.GRAZE_G) < 0.5) {
      const pr = cam.project(T.vadd(p, [30, -6, 0]))
      if (pr) explosion(ctx, pr.x, pr.y, (g - T.GRAZE_G) / 0.5, 0.32, '#ffd9a0')
    }
  }
  // pursuing green fire
  for (const b of T.PURSUIT_BOLTS) drawBolt(ctx, cam, b, g)
  // star-streak settle on cut in
  starStreaks(ctx, 1 - seg(g, 26, 27.6))
  // the Bald Star rises until it owns the lower frame
  drawBaldStarScreen(ctx, g)
  return cam
}

// ------------------------------------------------------------ dogfight ----
// Three camera phases: wide (38→46), kill chase (46→48, tuned numerically —
// hero upper-left firing down-right at razor 1), wide again for the flee.
export function dogCam(g) {
  if (g >= 46.0 && g < 48.0) {
    const m0 = T.vscl(T.vadd(T.heroPos(g), T.razorPos(1, g)), 0.5)
    return lookAt(T.vadd(m0, [30, -50, -260]), T.vadd(m0, [0, 26, 100]), 40)
  }
  return lookAt([30 * Math.sin(g * 0.12), 55, -170], [10, 15, 440], 50)
}

export function drawDogfight(ctx, g, t) {
  const cam = dogCam(g)
  drawStars(ctx, cam, t)
  const layers = []
  const addShip = (img, pos, o) => {
    const pr = cam.project(pos)
    if (pr) layers.push({ z: pr.z, pr, img, pos, o })
  }
  addShip(S.fw[24], T.wing1Pos(g), { worldW: 38, roll: T.bankRoll(T.wing1Pos, g), flip: T.wing1Pos(g + 0.05)[0] < T.wing1Pos(g - 0.05)[0] })
  addShip(S.fw[28], T.wing2Pos(g), { worldW: 38, roll: T.bankRoll(T.wing2Pos, g), flip: T.wing2Pos(g + 0.05)[0] < T.wing2Pos(g - 0.05)[0] })
  addShip(S.fw[T.HERO], T.heroPos(g), { worldW: 44, roll: T.bankRoll(T.heroPos, g), flip: T.heroPos(g + 0.05)[0] < T.heroPos(g - 0.05)[0], glow: '#e07a3f', glowBlur: 10 })
  for (let i = 0; i < 4; i++) {
    const alive = (i === 0 && g < T.T.kill1) || (i === 1 && g < T.T.kill2) || (i >= 2 && g < T.T.flee + 3.4)
    if (!alive) continue
    addShip(S.razors[i], T.razorPos(i, g), { worldW: 34, roll: T.bankRoll((gg, ii) => T.razorPos(ii, gg), g, i) })
  }
  layers.sort((a, b) => b.z - a.z)
  for (const l of layers) {
    sprite3(ctx, cam, l.img, l.pos, l.o)
  }
  for (const b of T.BOLTS) drawBolt(ctx, cam, b, g)
  // kills: fireball + spinning bald head + debris. Age runs on REAL film time
  // so the burst grows through the hit-stop freeze (world age would stay 0).
  for (const k of T.KILLS) {
    const pr = cam.project(T.razorPos(k.razor, k.g))
    if (!pr) continue
    const age = t - T.filmAbs(k.g)
    const sz = k.g === T.T.kill2 ? 2.6 : 1.2
    explosion(ctx, pr.x, pr.y, age, sz)
    flyingHead(ctx, S.icons[RAZOR_PILOTS[k.razor]], pr.x, pr.y, age, k.razor % 2 ? 1 : -1)
  }
  return cam
}

// Screen-space starfield for the trench run: the corridor travels z 0→2340
// but the 3D star box ends at z≈2000, so projected stars fall behind the
// camera during the climb. These wrap with the camera and survive the pull-up.
export function drawStarsScreen(ctx, t, drift, up = 0) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const layers = [
    { n: 130, f: 0.22, mag: 1.4 },
    { n: 90, f: 0.45, mag: 2.1 },
  ]
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li]
    for (let i = 0; i < L.n; i++) {
      const seed = i * 3 + li * 500 + 1
      let x = (hash(seed) * 1920 + drift * L.f) % 1920
      if (x < 0) x += 1920
      const y = hash(seed + 1) * 1080
      const r = L.mag * (0.4 + hash(seed + 2) * 0.9)
      ctx.globalAlpha = (0.35 + 0.5 * hash(seed + 3)) * (0.55 + 0.45 * up)
      ctx.fillStyle = hash(seed + 4) > 0.85 ? '#ffe9c9' : '#cfe4ff'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 6.29)
      ctx.fill()
    }
  }
  ctx.restore()
}

// ------------------------------------------------------------- trench -----
export function trenchCam(g) {
  const up = E.outQuad(seg(g, T.T.pullUp, T.T.pullUp + 2.0))
  const app = T.approach(g)
  const z = T.shipZ(g) - 56
  // camera rides above the cockpit so the ship sits low in frame and the
  // corridor + pore stay readable over the pilot's head
  const pos = [T.weave(g) * 0.55 * (1 - 0.55 * app) - 9 * app, 24 + 16 * up, z]
  const tgt = [lerp(T.weave(g) * 0.3, 0, up) - 4 * app, lerp(10, 96, up), T.shipZ(g) + 130]
  return lookAt(pos, tgt, 58)
}

export function drawTrench(ctx, g, t) {
  const cam = trenchCam(g)
  const up = E.outQuad(seg(g, T.T.pullUp, T.T.pullUp + 2.0))
  drawStarsScreen(ctx, t, T.shipZ(g) * 0.12, up)
  // station surface below the horizon: fills [hy, 1080]; during the pull-up
  // the camera pitches up so the horizon sinks off the bottom of frame
  ctx.save()
  const hy = 150 + up * 1250
  if (hy < 1080) {
    const hg = ctx.createLinearGradient(0, hy, 0, 1080)
    hg.addColorStop(0, '#caa488')
    hg.addColorStop(0.35, '#8a6450')
    hg.addColorStop(1, '#3a2620')
    ctx.fillStyle = hg
    ctx.beginPath()
    ctx.moveTo(0, hy)
    ctx.quadraticCurveTo(960, hy + 230, 1920, hy)
    ctx.lineTo(1920, 1080)
    ctx.lineTo(0, 1080)
    ctx.closePath()
    ctx.fill()
    // far trench scars on the surface
    ctx.strokeStyle = 'rgba(40,22,16,0.5)'
    for (let k = 0; k < 3; k++) {
      ctx.lineWidth = 3 - k
      ctx.beginPath()
      ctx.moveTo(0, hy + 55 + k * 55)
      ctx.quadraticCurveTo(960, hy + 260 + k * 55, 1920, hy + 55 + k * 55)
      ctx.stroke()
    }
  }
  ctx.restore()
  // trench geometry: walls + floor strips from the camera outward
  const camZ = T.shipZ(g) - 46
  const far = camZ + 560
  for (let z0 = camZ + 4; z0 < far; z0 += T.RIB_GAP) {
    const z1 = Math.min(z0 + T.RIB_GAP, far)
    const fog = clamp(1 - (z0 - camZ) / 560, 0.14, 1)
    const parity = (Math.round(z0 / T.RIB_GAP) % 2) === 0
    const q = (pts) => {
      ctx.beginPath()
      for (let k = 0; k < pts.length; k++) {
        const pr = cam.project(pts[k])
        if (!pr) return null
        if (k === 0) ctx.moveTo(pr.x, pr.y)
        else ctx.lineTo(pr.x, pr.y)
      }
      ctx.closePath()
      return true
    }
    const sh = parity ? 0 : 1
    // floor
    if (q([[-T.TRENCH_HALF, 0, z0], [T.TRENCH_HALF, 0, z0], [T.TRENCH_HALF, 0, z1], [-T.TRENCH_HALF, 0, z1]])) {
      ctx.fillStyle = `rgba(${34 + sh * 6},${20 + sh * 4},${18 + sh * 3},${fog})`
      ctx.fill()
    }
    // walls
    for (const s of [-1, 1]) {
      const wallShade = s === 1 ? 1 : 0.72
      if (q([[s * T.TRENCH_HALF, 0, z0], [s * T.TRENCH_HALF, 0, z1], [s * T.TRENCH_HALF, T.WALL_H, z1], [s * T.TRENCH_HALF, T.WALL_H, z0]])) {
        ctx.fillStyle = `rgba(${Math.round((52 + sh * 8) * wallShade)},${Math.round((34 + sh * 5) * wallShade)},${Math.round((30 + sh * 4) * wallShade)},${fog})`
        ctx.fill()
        // rib lip
        ctx.strokeStyle = `rgba(190,140,110,${fog * 0.7})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
    // conduit pipes on each wall
    for (const s of [-1, 1]) {
      for (const py of [8, 19]) {
        const a1 = cam.project([s * T.TRENCH_HALF, py, z0])
        const a2 = cam.project([s * T.TRENCH_HALF, py, z1])
        if (a1 && a2) {
          ctx.strokeStyle = `rgba(120,84,66,${fog})`
          ctx.lineWidth = 2.6
          ctx.beginPath()
          ctx.moveTo(a1.x, a1.y)
          ctx.lineTo(a2.x, a2.y)
          ctx.stroke()
        }
      }
    }
  }
  // turrets
  for (const tu of T.TURRETS) {
    if (tu.z < camZ + 10 || tu.z > far) continue
    const pr = cam.project([tu.side * (T.TRENCH_HALF - 4), 3, tu.z])
    if (!pr) continue
    const r = clamp(6 * pr.s * 0.5, 2, 14)
    ctx.fillStyle = '#241d1a'
    ctx.beginPath()
    ctx.arc(pr.x, pr.y, r, 0, 6.29)
    ctx.fill()
    ctx.strokeStyle = '#5a4a3e'
    ctx.lineWidth = Math.max(1, r * 0.22)
    ctx.stroke()
    const firing = T.TRENCH_BOLTS.some((b) => Math.abs(b.g - g) < 0.07 && b.o[2] === tu.z)
    if (firing) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const fg = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, r * 3)
      fg.addColorStop(0, 'rgba(220,255,220,0.95)')
      fg.addColorStop(1, 'rgba(120,255,150,0)')
      ctx.fillStyle = fg
      ctx.beginPath()
      ctx.arc(pr.x, pr.y, r * 3, 0, 6.29)
      ctx.fill()
      ctx.restore()
    }
  }
  // the pore, dead ahead
  if (T.PORE_Z > camZ + 20 && T.PORE_Z < far + 200) {
    const pr = cam.project([0, 0, T.PORE_Z])
    if (pr) {
      const r = 40 * pr.s
      const hitFlash = Math.abs(g - T.T.poreHit) < 0.45 && g > T.T.poreHit - 0.45
      ctx.save()
      const pg = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, r)
      pg.addColorStop(0, '#050203')
      pg.addColorStop(0.7, '#170a08')
      pg.addColorStop(1, '#3a201a')
      ctx.fillStyle = pg
      ctx.beginPath()
      ctx.arc(pr.x, pr.y, r, 0, 6.29)
      ctx.fill()
      ctx.strokeStyle = hitFlash ? '#9ff2c8' : 'rgba(202,140,110,0.9)'
      ctx.lineWidth = Math.max(2, r * 0.09)
      ctx.stroke()
      for (let k = 0; k < 4; k++) {
        const a = k * 1.57 + 0.6
        const lx = pr.x + Math.cos(a) * r * 1.28, ly = pr.y + Math.sin(a) * r * 1.28
        ctx.fillStyle = Math.sin(t * 7 + k * 2) > 0 ? '#ff5a4d' : 'rgba(120,30,20,0.6)'
        ctx.beginPath()
        ctx.arc(lx, ly, Math.max(2, r * 0.08), 0, 6.29)
        ctx.fill()
      }
      // breathing approach beacon so the target reads at distance
      const bp = 0.5 + 0.5 * Math.sin(t * 3)
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.35 + 0.3 * bp
      ctx.strokeStyle = '#ff8d7a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pr.x, pr.y, r * (1.7 + 0.5 * bp), 0, 6.29)
      ctx.stroke()
      if (hitFlash) {
        ctx.globalAlpha = 0.8
        const hf = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, r * 2.4)
        hf.addColorStop(0, 'rgba(200,255,230,0.9)')
        hf.addColorStop(1, 'rgba(159,242,200,0)')
        ctx.fillStyle = hf
        ctx.beginPath()
        ctx.arc(pr.x, pr.y, r * 2.4, 0, 6.29)
        ctx.fill()
      }
      ctx.restore()
    }
  }
  // turret fire past the cockpit
  for (const b of T.TRENCH_BOLTS) drawBolt(ctx, cam, b, g)
  // RED-42 from behind (torpedoes draw after the ship — they fly ahead of it)
  const ship = T.shipPos(g)
  sprite3(ctx, cam, S.fwRear, ship, {
    worldW: 30,
    roll: clamp((T.weave(g + 0.06) - T.weave(g - 0.06)) * 0.5, -0.5, 0.5),
    glow: '#ffb454', glowBlur: 14,
  })
  if (g >= T.T.torpLaunch && g < T.T.poreHit + 0.1) {
    for (const k of [0, 1]) {
      const p = T.torpPos(k, g)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let j = 1; j <= 7; j++) {
        const q = T.torpPos(k, g - j * 0.05)
        const pr1 = cam.project(q)
        const pr0 = cam.project(T.torpPos(k, g - (j - 1) * 0.05))
        if (!pr1 || !pr0) continue
        ctx.globalAlpha = 0.9 - j * 0.09
        ctx.strokeStyle = j > 4 ? '#ffb95e' : '#ff7a2e'
        ctx.lineWidth = Math.max(1.6, 8 - j * 0.8)
        ctx.beginPath()
        ctx.moveTo(pr0.x, pr0.y)
        ctx.lineTo(pr1.x, pr1.y)
        ctx.stroke()
      }
      const pr = cam.project(p)
      if (pr) {
        const tr = 13
        const tg2 = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, tr)
        tg2.addColorStop(0, '#ffffff')
        tg2.addColorStop(0.45, '#ffd9a0')
        tg2.addColorStop(1, 'rgba(255,150,80,0)')
        ctx.globalAlpha = 1
        ctx.fillStyle = tg2
        ctx.beginPath()
        ctx.arc(pr.x, pr.y, tr, 0, 6.29)
        ctx.fill()
        // flare cross
        ctx.strokeStyle = 'rgba(255,240,210,0.8)'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(pr.x - tr * 1.7, pr.y)
        ctx.lineTo(pr.x + tr * 1.7, pr.y)
        ctx.moveTo(pr.x, pr.y - tr * 1.4)
        ctx.lineTo(pr.x, pr.y + tr * 1.4)
        ctx.stroke()
      }
      ctx.restore()
    }
  }
  return cam
}

// --------------------------------------------------------------- blast ----
export function drawBlast(ctx, g, t) {
  const cam = lookAt(T.BS_CAM.pos, [0, 0, 0], T.BS_CAM.fov)
  drawStars(ctx, cam, t)
  const pr = cam.project([0, 0, 0])
  if (g < T.T.det) {
    if (pr) {
      const r = T.BS_R * pr.s
      ctx.drawImage(S.bs, pr.x - r, pr.y - r, r * 2, r * 2)
      // cracks spreading from the dish
      const ck = seg(g, 74.75, T.T.det)
      if (ck > 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const flick = 0.55 + 0.45 * hash(Math.floor(g * 26))
        const dx = pr.x - r * 0.34, dy = pr.y - r * 0.38
        for (let i = 0; i < 11; i++) {
          const a = hash(i * 7 + 2) * 6.28
          let px = dx, py = dy
          ctx.strokeStyle = `rgba(255,214,140,${0.85 * flick})`
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.moveTo(px, py)
          for (let k2 = 0; k2 < 5; k2++) {
            const step = (r * 0.16) * ck * (1 + hash(i * 13 + k2) * 0.8)
            const aa = a + (hash(i + k2 * 3) - 0.5) * 0.8
            px += Math.cos(aa) * step
            py += Math.sin(aa) * step
            ctx.lineTo(px, py)
          }
          ctx.stroke()
        }
        // dish glow building
        const dgr = ctx.createRadialGradient(dx, dy, 0, dx, dy, r * 0.3)
        dgr.addColorStop(0, `rgba(160,255,190,${0.5 * ck * flick})`)
        dgr.addColorStop(1, 'rgba(120,255,170,0)')
        ctx.fillStyle = dgr
        ctx.beginPath()
        ctx.arc(dx, dy, r * 0.3, 0, 6.29)
        ctx.fill()
        ctx.restore()
      }
    }
  } else {
    const age = g - T.T.det
    if (pr) hairNova(ctx, pr.x, pr.y, age)
    // the ember nebula that stays behind once the streaks are gone
    if (pr && age > 0.9) {
      const em = clamp(seg(age, 0.9, 2.0)) * clamp(1 - seg(g, T.T.det + 2.4, T.T.novaEnd + 1.2))
      if (em > 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const er = 200 + 240 * clamp(age / 3)
        const eg = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, er)
        eg.addColorStop(0, `rgba(255,190,130,${0.4 * em})`)
        eg.addColorStop(0.45, `rgba(159,242,200,${0.22 * em})`)
        eg.addColorStop(1, 'rgba(120,200,180,0)')
        ctx.fillStyle = eg
        ctx.beginPath()
        ctx.arc(pr.x, pr.y, er, 0, 6.29)
        ctx.fill()
        ctx.restore()
      }
    }
  }
  return cam
}

// --------------------------------------------------------------- medal ----
export function drawMedal(ctx, g, t) {
  ctx.drawImage(S.throne, 0, 0)
  // Sheddius slips away in the great window — the sequel hook
  const esc = seg(g, T.T.escape, T.T.escape + 2.1)
  if (esc > 0 && esc < 1) {
    const ex = 1245 - esc * 570
    const ey = 430 + Math.sin(g * 2) * 4
    ctx.save()
    ctx.translate(ex, ey)
    ctx.scale(0.32, 0.32)
    ctx.drawImage(S.razors[1], -105, -85)
    ctx.restore()
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = '#ff5a4d'
    ctx.beginPath()
    ctx.arc(ex - 26 * 0.32, ey + 2, 3.2, 0, 6.29)
    ctx.fill()
    ctx.restore()
  }
  const shadow = (x, fy, w, a = 0.4) => {
    ctx.fillStyle = `rgba(15,10,8,${a})`
    ctx.beginPath()
    ctx.ellipse(x, fy + 4, w, w * 0.22, 0, 0, 6.29)
    ctx.fill()
  }
  // crowd of hairport well-wishers
  let ci = 0
  for (const id of T.CROWD_IDS) {
    const R = S.far[id]
    const x = 210 + hash(ci * 17 + 4) * 1500
    const fy = 742 + hash(ci + 44) * 34
    shadow(x, fy + 26, 34, 0.3)
    A.drawRemy(ctx, R, x, fy, { sx: 1.1, sy: 1.1, flip: x > 960, stride: [0, 0], lift: [0, 0] })
    ci++
  }
  // reformed Cabald watchers at the back (they kept the shades)
  for (let k = 0; k < 2; k++) {
    const id = T.FLEET_IDS[k]
    const x = 1360 + k * 96
    shadow(x, 788, 40, 0.3)
    A.drawRemy(ctx, S.rigs[id], x, 788, { sx: 1.7, sy: 1.7, flip: false, stride: [0, 0], lift: [0, 0] })
  }
  // wingmen at attention
  shadow(1150, 900, 74)
  A.drawRemy(ctx, S.rigs[24], 1150, 900, { sx: 2.7, sy: 2.7, flip: true, lean: -0.01, stride: [0, 0], lift: [0, 0] })
  shadow(1330, 900, 74)
  A.drawRemy(ctx, S.rigs[28], 1330, 900, { sx: 2.7, sy: 2.7, flip: true, lean: 0.01, stride: [0, 0], lift: [0, 0] })
  // the flow-ghost keeps watch, translucent
  const ga = 0.42 * clamp(seg(g, 80.8, 82)) * clamp(1 - seg(g, 88.2, 89.2))
  if (ga > 0.01) {
    A.drawRemy(ctx, S.rigs[32], 1618, 880 + 7 * Math.sin(g * 0.8), {
      sx: 2.9, sy: 2.9, flip: true, alpha: ga, glow: '#bfe0ff', glowA: 0.55, stride: [0, 0], lift: [0, 0],
    })
  }
  // Princess Flow and RED-42
  shadow(790, 900, 88)
  A.drawRemy(ctx, S.rigs[12], 790, 900, { sx: 3.0, sy: 3.0, flip: false, lean: -0.012, stride: [0, 0], lift: [0, 0] })
  shadow(995, 912, 100)
  A.drawRemy(ctx, S.rigs[T.HERO], 995, 912, { sx: 3.3, sy: 3.3, flip: true, lean: 0.015, stride: [0, 0], lift: [0, 0] })
  // the Golden Flow medal
  const pinned = g >= T.T.pin
  if (pinned) {
    const mx = 952, my = 742
    const pulse = 0.5 + 0.5 * Math.sin(t * 4)
    ctx.save()
    ctx.strokeStyle = '#caa548'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(mx - 16, my - 26)
    ctx.lineTo(mx, my - 6)
    ctx.lineTo(mx + 16, my - 26)
    ctx.stroke()
    const mg = ctx.createRadialGradient(mx - 6, my - 6, 2, mx, my, 24)
    mg.addColorStop(0, '#ffe9a8')
    mg.addColorStop(0.55, '#e8b83c')
    mg.addColorStop(1, '#9a7420')
    ctx.fillStyle = mg
    ctx.beginPath()
    ctx.arc(mx, my, 22, 0, 6.29)
    ctx.fill()
    ctx.strokeStyle = '#6e5216'
    ctx.lineWidth = 2
    ctx.stroke()
    // lock-of-flow emblem on the disc
    ctx.strokeStyle = 'rgba(110,70,10,0.8)'
    ctx.lineCap = 'round'
    for (let k = 0; k < 3; k++) {
      ctx.lineWidth = 3.4 - k
      ctx.beginPath()
      ctx.moveTo(mx - 4 + k * 4, my - 8)
      ctx.bezierCurveTo(mx + 8 + k * 4, my - 3, mx - 8 + k * 4, my + 3, mx + 3 + k * 4, my + 9)
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.35 + 0.3 * pulse
    const pg = ctx.createRadialGradient(mx, my, 4, mx, my, 46)
    pg.addColorStop(0, 'rgba(255,230,150,0.8)')
    pg.addColorStop(1, 'rgba(255,210,100,0)')
    ctx.fillStyle = pg
    ctx.beginPath()
    ctx.arc(mx, my, 46, 0, 6.29)
    ctx.fill()
    ctx.restore()
  }
  // iris out on the hero (cl: 0 = open, 1 = closed)
  const cl = seg(g, T.T.iris0, T.T.iris1)
  if (cl > 0) {
    const rad = 1180 * (1 - E.inOutCubic(cl))
    ctx.save()
    ctx.fillStyle = '#000'
    if (rad > 4) {
      ctx.beginPath()
      ctx.rect(0, 0, W, H)
      ctx.moveTo(995 + rad, 660)
      ctx.arc(995, 660, rad, 0, 6.29, true)
      ctx.fill('evenodd')
      ctx.strokeStyle = 'rgba(202,165,72,0.8)'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.arc(995, 660, rad, 0, 6.29)
      ctx.stroke()
    } else {
      ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
  }
}

// ------------------------------------------------------------ overlay UI --
export function drawInset(ctx, t) {
  const inn = clamp(seg(t, 33.0, 33.5))
  const out = clamp(1 - seg(t, 37.2, 37.6))
  const a = inn * out
  if (a <= 0.01) return
  ctx.save()
  ctx.globalAlpha = a
  const x0 = 64, y0 = 646, w = 560, h = 272
  ctx.fillStyle = 'rgba(6,10,16,0.92)'
  ctx.fillRect(x0, y0, w, h)
  ctx.strokeStyle = '#9ff2c8'
  ctx.lineWidth = 2
  ctx.strokeRect(x0, y0, w, h)
  ctx.globalAlpha = a * 0.1
  ctx.fillStyle = '#9ff2c8'
  for (let py = y0; py < y0 + h; py += 4) ctx.fillRect(x0, py, w, 1)
  ctx.globalAlpha = a
  // glitch cut
  if (hash(Math.floor(t * 22)) > 0.9) ctx.translate((hash(Math.floor(t * 22) + 1) - 0.5) * 10, 0)
  ctx.drawImage(S.icons[23], x0 + 22, y0 + 22, 96, 96)
  txt(ctx, 'LORD SHEDDIUS', x0 + 138, y0 + 44, {
    size: 30, font: F.anton, color: '#ffd23f', align: 'left', base: 'middle', alpha: a,
  })
  txt(ctx, 'THE CABALD ▸ FLAG BRIDGE', x0 + 138, y0 + 78, {
    size: 20, font: F.mono, weight: 500, color: '#9ff2c8', align: 'left', base: 'middle', track: 2, alpha: a * 0.9,
  })
  const line = 'BRING ME THE FLOW PLANS.'
  const chars = Math.floor(clamp((t - 33.7) / 0.9) * line.length)
  txt(ctx, line.slice(0, chars) + (t - 33.7 > 0.9 && Math.sin(t * 8) > 0 ? ' ▌' : ''), x0 + 24, y0 + 146, {
    size: 30, font: F.mono, weight: 500, color: '#cfe4ff', align: 'left', base: 'middle', alpha: a,
  })
  const rowIds = [125, 233, 125]
  for (let k = 0; k < 3; k++) {
    ctx.globalAlpha = a * (Math.sin(t * 3 + k * 2.1) > -0.2 ? 0.95 : 0.25)
    ctx.drawImage(S.icons[rowIds[k]], x0 + 30 + k * 96, y0 + 192, 56, 56)
    ctx.globalAlpha = a * 0.8
    txt(ctx, `S-${770 + k * 3}`, x0 + 30 + k * 96 + 28, y0 + 258, {
      size: 15, font: F.mono, weight: 500, color: '#7f95b5', align: 'center', base: 'middle', alpha: a,
    })
  }
  ctx.restore()
}

export function drawGhost(ctx, t) {
  const a = 0.5 * clamp(seg(t, 63.2, 64.4)) * clamp(1 - seg(t, 67.6, 68.6))
  if (a <= 0.01) return
  ctx.save()
  ctx.globalAlpha = a * 0.35
  const gg = ctx.createRadialGradient(1560, 640, 40, 1560, 640, 360)
  gg.addColorStop(0, 'rgba(150,210,255,0.5)')
  gg.addColorStop(1, 'rgba(150,210,255,0)')
  ctx.fillStyle = gg
  ctx.beginPath()
  ctx.arc(1560, 640, 360, 0, 6.29)
  ctx.fill()
  ctx.restore()
  A.drawRemy(ctx, S.rigs[32], 1560, 902 + 6 * Math.sin(t * 1.1), {
    sx: 2.8, sy: 2.8, flip: true, alpha: a, glow: '#bfe0ff', glowA: 0.6, stride: [0, 0], lift: [0, 0],
  })
}

export function drawHUD(ctx, g, t) {
  if (g < 56.4) return
  const mint = '#9ff2c8'
  const flowSight = g > T.HUD_OFF
  ctx.save()
  // project the pore through the same deterministic trench camera so the
  // targeting brackets converge exactly on it
  const cam = trenchCam(g)
  const pore = cam.project([0, 0, T.PORE_Z])
  if (!flowSight) {
    txt(ctx, 'RED-42 ▸ FLOW-WING', 72, 872, {
      size: 26, font: F.mono, weight: 500, color: mint, align: 'left', base: 'middle',
    })
    const spd = Math.round(lerp(232, 419, E.outCubic(seg(g, 56, 70))))
    txt(ctx, `SPD ${String(spd).padStart(3, '0')} KF`, 72, 906, {
      size: 26, font: F.mono, weight: 500, color: mint, align: 'left', base: 'middle',
    })
    if (pore) {
      // targeting brackets sweep in onto the pore
      const conv = seg(g, 66.5, T.HUD_OFF)
      const bx = lerp(pore.x, pore.x, conv) + lerp(240, 0, conv)
      const by = lerp(pore.y - 160, pore.y, conv)
      const sz = lerp(150, Math.max(58, 40 * pore.s * 1.3), conv)
      ctx.strokeStyle = mint
      ctx.lineWidth = 3
      for (const [sx2, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.beginPath()
        ctx.moveTo(bx + sx2 * sz, by + sy2 * sz - sy2 * 18)
        ctx.lineTo(bx + sx2 * sz, by + sy2 * sz)
        ctx.lineTo(bx + sx2 * sz - sx2 * 18, by + sy2 * sz)
        ctx.stroke()
      }
      txt(ctx, `RANGE ${Math.max(0, Math.round((T.PORE_Z - T.shipZ(g)) * 1.1))}`, bx, clamp(by + sz + 34, 200, 880), {
        size: 24, font: F.mono, weight: 500, color: mint, align: 'center', base: 'middle',
      })
    }
    // reticle ring on the corridor's vanishing point
    const vp = cam.project([T.weave(g) * 0.3, 4, T.shipZ(g) + 130])
    if (vp) {
      ctx.strokeStyle = 'rgba(159,242,200,0.7)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(vp.x, vp.y, 38, 0, 6.29)
      ctx.stroke()
      for (let k = 0; k < 4; k++) {
        const a = k * 1.57 + 0.78
        ctx.beginPath()
        ctx.moveTo(vp.x + Math.cos(a) * 30, vp.y + Math.sin(a) * 30)
        ctx.lineTo(vp.x + Math.cos(a) * 48, vp.y + Math.sin(a) * 48)
        ctx.stroke()
      }
    }
  } else {
    // the flow sight: three breathing strands of light
    const pulse = 0.6 + 0.4 * Math.sin(t * 5)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = `rgba(159,242,200,${0.5 * pulse})`
    ctx.lineCap = 'round'
    for (let k = 0; k < 3; k++) {
      ctx.lineWidth = 3.5 - k
      ctx.beginPath()
      ctx.moveTo(1020 - k * 12, 440 + k * 18)
      ctx.bezierCurveTo(1080, 470 + k * 18, 1030, 530 + k * 18, 1092 + k * 6, 576 + k * 18)
      ctx.stroke()
    }
    ctx.restore()
    txt(ctx, 'FLOW SIGHT', 72, 872, {
      size: 26, font: F.mono, weight: 500, color: '#cfe4ff', align: 'left', base: 'middle',
    })
  }
  // launch lamp
  if (g > T.T.torpLaunch - 1.2 && g < T.T.torpLaunch + 0.8) {
    const on = Math.sin(t * 14) > 0
    if (on) {
      ctx.fillStyle = '#ff5a4d'
      ctx.beginPath()
      ctx.arc(180, 812, 9, 0, 6.29)
      ctx.fill()
    }
    txt(ctx, 'TORPEDOES ARMED', 200, 812, {
      size: 26, font: F.mono, weight: 500, color: '#ffb0a8', align: 'left', base: 'middle',
    })
  }
  ctx.restore()
}
