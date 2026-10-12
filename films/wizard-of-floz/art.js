// THE WIZARD OF FLOZ art: rig repaints per casting.md (Dot sliver mask + gingham +
// ruby slippers, witch green/black + baked hat with the WIG kept separate, wizard
// tailcoat, scarecrow burlap, tin chrome, lion mane, guard armor, munchkin flower
// hats, East-feet crop) + prepare-time set bakes (sepia farm, twister rooms, the
// door, munchkin village, follicle road, poppy fields, emerald gate, throne hall,
// haunted forest + tower room, courtyard, bedroom, meadow, skywriting, the GIANT
// HEAD, four horse hue variants) + pure per-frame painters (funnel, wig, broom,
// bicycle, hourglass, bubble, smoke, slippers, flames). Full-res painted stage,
// sprites 2.4-3.2x nearest. Every painter a pure function of t; hash/rng only.
import { hash, rng, lerp } from 'filmkit/lib.js'
import { canvas, headIcon } from '../remy-bros/art.js'

const W = 1920, H = 1080
export const OS = 240 // overscan painted around the stage so camera moves never expose edges

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

export function shadeHex(hex, k) {
  const [r, g, b] = hexRgb(hex)
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

function whiteSil(c, w, h) {
  const s = canvas(w, h), x = s.getContext('2d')
  x.drawImage(c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = '#fff'
  x.fillRect(0, 0, w, h)
  return s
}

// Solid-colour silhouette copy of a rig keeping the pose rig.
export function tint(R, color) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, R.w, R.h)
  return { ...R, c }
}

// Keep only the largest 4-connected alpha component — drops detached bake artefacts
// (pirates pattern; runs after every aggressive repaint).
export function keepMain(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const n = R.w * R.h
  const seen = new Uint8Array(n)
  const alpha = (i) => p[i * 4 + 3] > 8
  let best = null, bestN = 0
  for (let s = 0; s < n; s++) {
    if (seen[s] || !alpha(s)) continue
    const comp = [s]
    seen[s] = 1
    for (let h2 = 0; h2 < comp.length; h2++) {
      const i = comp[h2], xx = i % R.w, y = (i / R.w) | 0
      for (const j of [y > 0 ? i - R.w : -1, y < R.h - 1 ? i + R.w : -1, xx > 0 ? i - 1 : -1, xx < R.w - 1 ? i + 1 : -1]) {
        if (j >= 0 && !seen[j] && alpha(j)) { seen[j] = 1; comp.push(j) }
      }
    }
    if (comp.length > bestN) { bestN = comp.length; best = comp }
  }
  if (!best) return { ...R, c }
  const keep = new Uint8Array(n)
  for (const i of best) keep[i] = 1
  for (let i = 0; i < n; i++) if (!keep[i]) p[i * 4 + 3] = 0
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// ============================== rig repaints ==============================

// Zone-classified duotone repaint (ghoulize pattern): each pixel classifies to the
// nearest palette ref; zone 'skip' keeps the pixel, zone ramps remap by luminance
// (pairs are [dark, light]), dark outlines always stay ink.
function zoneRepaint(R, refs, ramps) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const table = refs.map(([hex, zone]) => ({ rgb: hexRgb(hex), zone }))
  const rampOf = {}
  for (const [zone, pair] of Object.entries(ramps)) rampOf[zone] = [hexRgb(pair[0]), hexRgb(pair[1])]
  for (let i = 0; i < R.w * R.h; i++) {
    if (p[i * 4 + 3] < 8) continue
    const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2]
    const L = (r + g + b) / 765
    if (L < 0.16) continue // true outlines stay ink
    let zone = 'skip', bd = 1e9
    for (const f of table) {
      const dd = (r - f.rgb[0]) ** 2 + (g - f.rgb[1]) ** 2 + (b - f.rgb[2]) ** 2
      if (dd < bd) { bd = dd; zone = f.zone }
    }
    const ramp = rampOf[zone]
    if (!ramp) continue
    const col = mix(ramp[0], ramp[1], clamp01((L - 0.14) / 0.6))
    p[i * 4] = col[0]; p[i * 4 + 1] = col[1]; p[i * 4 + 2] = col[2]
  }
  x.putImageData(d, 0, 0)
  return c
}

// DOT (12): mask the tan bandage artifact (top-right block ≈ x44+, y<=33 — it is
// the SAME colour family as her hair, so the mask is geometric, then keepMain
// reattaches the fringe), repaint the royal-blue dress family to the gingham ramp
// (predicate pass — face/skin/hair never match), ruby shoes only in the foot rows,
// then bake pigtails + a bib that stays BELOW her chin. rubyShoes=false bakes her
// Kansas pair (native grey) for the pre-transfer scenes.
export function dotify(R, rubyShoes = true) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  // bandage mask: the artifact block sits top-right (measured x44..75, y0..33 —
  // bottom edge ~y27 with a thin tab at the right edge to y33). Her fringe ends
  // near x56 on those rows, so three geometric bands clear it without shaving
  // the bob's right bulge (x62-66 at y27-33).
  for (let y = 0; y < R.h; y++)
    for (let xx = 0; xx < R.w; xx++) {
      if (!((y <= 13 && xx >= 44) || (y <= 27 && xx >= 56) || (y <= 33 && xx >= 69))) continue
      p[(y * R.w + xx) * 4 + 3] = 0
    }
  x.putImageData(d, 0, 0)
  // dress pass: PREDICATE-based (blue-dominant pixels only — hair/skin never match)
  const d2 = x.getImageData(0, 0, R.w, R.h), q0 = d2.data
  const dressDark = hexRgb('#27499c'), dressLight = hexRgb('#3b6fd4')
  for (let i = 0; i < R.w * R.h; i++) {
    if (q0[i * 4 + 3] < 8) continue
    const r = q0[i * 4], g = q0[i * 4 + 1], b = q0[i * 4 + 2]
    if (!(b > r + 40 && b > 110)) continue
    const L = (r + g + b) / 765
    const col = mix(dressDark, dressLight, clamp01((L - 0.14) / 0.6))
    q0[i * 4] = col[0]; q0[i * 4 + 1] = col[1]; q0[i * 4 + 2] = col[2]
  }
  x.putImageData(d2, 0, 0)
  const g = x.getImageData(0, 0, R.w, R.h), q = g.data
  // ruby slippers: foot rows only, low-saturation pixels (her golden hair is safe)
  if (rubyShoes) {
    for (let y = R.h - 13; y < R.h; y++)
      for (let xx = 0; xx < R.w; xx++) {
        const i = (y * R.w + xx) * 4
        if (q[i + 3] < 8) continue
        const r = q[i], gg = q[i + 1], b = q[i + 2]
        const L = (r + gg + b) / 765
        if (L < 0.2 || Math.max(r, gg, b) - Math.min(r, gg, b) > 40) continue
        const col = mix(hexRgb('#b83838'), hexRgb('#d83838'), clamp01((L - 0.2) / 0.5))
        q[i] = col[0]; q[i + 1] = col[1]; q[i + 2] = col[2]
      }
  }
  // gingham weave: white crosshatch over dress-family pixels only
  for (let y = 0; y < R.h; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4
      if (q[i + 3] < 8) continue
      const r = q[i], gg = q[i + 1], b = q[i + 2]
      if (!(b > r + 24 && b > 90)) continue
      const wx = (xx % 7) < 3, wy = (y % 7) < 3
      if (wx !== wy) {
        const w = 0.42
        q[i] = Math.round(r * (1 - w) + 250 * w)
        q[i + 1] = Math.round(gg * (1 - w) + 246 * w)
        q[i + 2] = Math.round(b * (1 - w) + 238 * w)
      }
    }
  x.putImageData(g, 0, 0)
  const out = keepMain({ ...R, c })
  // restore the bob silhouette the bandage mask notched away (top-right): fill
  // with the sprite's own fringe colour, clipped to the mask's stepped bands
  {
    const o0 = out.c.getContext('2d')
    let hairCol = '#b39a4e'
    for (let sy = 4; sy < 40; sy += 4) {
      const d0 = o0.getImageData(out.cx - 8, R.top + sy, 1, 1).data
      if (d0[3] > 200) { hairCol = `rgb(${d0[0]},${d0[1]},${d0[2]})`; break }
    }
    const bands = [
      { x0: 44, y0: 13 }, { x0: 56, y0: 27 }, { x0: 69, y0: 33 },
    ]
    for (const [bx, by, br] of [[58, 7, 5], [64, 13, 6], [69, 21, 6], [72, 29, 4]]) {
      o0.save()
      o0.beginPath()
      for (const b of bands) o0.rect(b.x0, 0, R.w - b.x0, b.y0)
      o0.clip()
      o0.fillStyle = hairCol
      o0.beginPath()
      o0.arc(bx, by, br, 0, 7)
      o0.fill()
      o0.restore()
    }
  }
  // pinafore bib BELOW the chin (eyes ~top+49-58, chin ~top+68) + shoulder straps
  const o = out.c.getContext('2d')
  o.fillStyle = '#f5eee0'
  o.beginPath()
  o.moveTo(out.cx - 9, R.top + 74)
  o.lineTo(out.cx + 9, R.top + 74)
  o.lineTo(out.cx + 13, R.top + 100)
  o.lineTo(out.cx - 13, R.top + 100)
  o.closePath()
  o.fill()
  o.fillRect(out.cx - 10, R.top + 68, 5, 8)
  o.fillRect(out.cx + 5, R.top + 68, 5, 8)
  // a small mouth so her face reads (the original sprite has none at this scale)
  o.fillStyle = '#8f4a44'
  o.fillRect(out.cx - 2, R.top + 62, 5, 2)
  o.fillRect(out.cx - 3, R.top + 61, 1, 1)
  o.fillRect(out.cx + 3, R.top + 61, 1, 1)
  // procedural pigtail tufts at ear height, ON the hair mass
  const pig = (px, py, s) => {
    o.fillStyle = '#9c8942'
    for (const [dx, dy, r] of [[0, 0, 4.6 * s], [-3.2 * s, 3.8 * s, 3.8 * s], [3.2 * s, 3.8 * s, 3.8 * s], [0, 7 * s, 3.2 * s]]) {
      o.beginPath()
      o.arc(px + dx, py + dy, r, 0, 7)
      o.fill()
    }
  }
  pig(out.cx - 21, R.top + 46, 1.05)
  pig(out.cx + 21, R.top + 46, 1.05)
  return { ...out, sil: whiteSil(out.c, out.w, out.h) }
}

// FLOWTO (62, far cut): white tee -> brown fur, warm skin -> muzzle tan; hair crop,
// dark eyes and the red paw accents stay.
export function flowtify(R) {
  const c = zoneRepaint(R, [
    ['#eeeeee', 'fur'], ['#e8e8e8', 'fur'], ['#f4f4f4', 'fur'],
    ['#d0b49a', 'muzzle'], ['#c8a888', 'muzzle'], ['#b89878', 'muzzle'],
  ], { fur: ['#4a3220', '#6b4a2f'], muzzle: ['#b08858', '#c9a37a'] })
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// GLINDA (2577): grey sweatshirt -> pink ball-gown ramp, gold trim sash baked.
export function glindify(R) {
  const c = zoneRepaint(R, [
    ['#8c8a95', 'gown'], ['#9c849c', 'gown'], ['#7c7a88', 'gown'],
  ], { gown: ['#d987ad', '#f2b8cf'] })
  const x = c.getContext('2d')
  x.strokeStyle = '#ffcc2e'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(R.cx - 18, R.top + 84)
  x.quadraticCurveTo(R.cx, R.top + 90, R.cx + 18, R.top + 84)
  x.stroke()
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// WICKED WITCH (1445): white gi -> black dress, skin + dome -> wicked green, mustard
// collar stays as the sash; pointed hat + buckle baked on (moves with the rig); the
// WIG is never baked — it is a separate prop canvas lifted off and chased.
export function witchify(R) {
  const PA = 30 // headroom for the hat
  const c = canvas(R.w, R.h + PA), x = c.getContext('2d')
  const body = zoneRepaint(R, [
    ['#dadad8', 'dress'], ['#e4e4e4', 'dress'], ['#d0d0ce', 'dress'],
    ['#685240', 'skin'], ['#7a6248', 'skin'], ['#5a4636', 'skin'],
    ['#3a7a80', 'dress'], ['#2a5a60', 'dress'],
  ], { dress: ['#0c0c10', '#17171c'], skin: ['#3f6b36', '#6fae5c'] })
  x.drawImage(body, 0, PA)
  // sash keeps the mustard collar read
  x.fillStyle = '#6b5541'
  x.fillRect(R.cx - 16, R.top + PA + 62, 32, 7)
  // pointed hat: wide brim + bent cone + silver buckle
  const hy = R.top + PA + 16
  x.fillStyle = '#0c0c10'
  x.beginPath()
  x.ellipse(R.cx, hy, 26, 7, 0, 0, 7)
  x.fill()
  x.beginPath()
  x.moveTo(R.cx - 15, hy - 2)
  x.quadraticCurveTo(R.cx - 6, hy - 34, R.cx + 16, hy - 46)
  x.quadraticCurveTo(R.cx + 2, hy - 26, R.cx + 15, hy - 3)
  x.closePath()
  x.fill()
  x.fillStyle = '#c9c9c9'
  x.fillRect(R.cx - 6, hy - 20, 11, 8)
  x.fillStyle = '#0c0c10'
  x.fillRect(R.cx - 3, hy - 18, 5, 4)
  return { c, sil: whiteSil(c, c.width, c.height), w: c.width, h: c.height, legTop: R.legTop + PA, cx: R.cx, top: R.top + PA, bottom: R.bottom + PA }
}

// THE WIZARD (1264): black tee -> charcoal tailcoat, ivory shirtfront painted over
// the donut print, white beard under the native mustache.
export function wizardify(R) {
  const c = zoneRepaint(R, [
    ['#29282b', 'coat'], ['#333238', 'coat'], ['#1f1e22', 'coat'],
  ], { coat: ['#14161c', '#23262e'] })
  const x = c.getContext('2d')
  // shirtfront V + lapels (also buries the baked print)
  x.fillStyle = '#f0ece2'
  x.beginPath()
  x.moveTo(R.cx - 9, R.top + 40)
  x.lineTo(R.cx + 9, R.top + 40)
  x.lineTo(R.cx + 5, R.top + 92)
  x.lineTo(R.cx - 5, R.top + 92)
  x.closePath()
  x.fill()
  x.strokeStyle = '#14161c'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(R.cx - 9, R.top + 40)
  x.lineTo(R.cx - 14, R.top + 92)
  x.moveTo(R.cx + 9, R.top + 40)
  x.lineTo(R.cx + 14, R.top + 92)
  x.stroke()
  // procedural white beard under the mustache
  x.fillStyle = '#e8e4da'
  x.beginPath()
  x.ellipse(R.cx, R.top + 36, 10, 8, 0, 0, 7)
  x.fill()
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// SCARECROW (30): shirt -> patched burlap, rope belt, straw tufts at cuffs, baked
// wide-brim hat; the platinum bowl hair already reads as straw.
export function scarecrowfy(R) {
  const PA = 22
  const c = canvas(R.w, R.h + PA), x = c.getContext('2d')
  const body = zoneRepaint(R, [
    ['#cdb468', 'coat'], ['#b8a058', 'coat'], ['#dcc478', 'coat'],
  ], { coat: ['#8a6a38', '#b98e4e'] })
  x.drawImage(body, 0, PA)
  // patches: two seeded squares with stitch strokes
  const r = rng(303)
  for (let i = 0; i < 2; i++) {
    const px = 14 + r() * (R.w - 40), py = R.top + PA + 56 + r() * 34
    x.fillStyle = '#7a5c30'
    x.fillRect(px, py, 13, 11)
    x.strokeStyle = '#4a3618'
    x.lineWidth = 1
    x.strokeRect(px, py, 13, 11)
  }
  // rope belt + straw tufts at the cuffs
  x.strokeStyle = '#a5854e'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(R.cx - 20, R.top + PA + 88)
  x.quadraticCurveTo(R.cx, R.top + PA + 93, R.cx + 20, R.top + PA + 88)
  x.stroke()
  x.strokeStyle = '#e3c268'
  x.lineWidth = 2.4
  for (const sx of [8, 16, R.w - 9, R.w - 17])
    for (let k = 0; k < 3; k++) {
      x.beginPath()
      x.moveTo(sx, R.top + PA + 84)
      x.lineTo(sx + (k - 1) * 3, R.top + PA + 78 - k * 2)
      x.stroke()
    }
  // wide-brim hat
  const hy = R.top + PA + 14
  x.fillStyle = '#d9b356'
  x.beginPath()
  x.ellipse(R.cx, hy, 27, 7, 0, 0, 7)
  x.fill()
  x.beginPath()
  x.ellipse(R.cx, hy - 9, 14, 11, 0, 0, 7)
  x.fill()
  x.fillStyle = '#a5854e'
  x.fillRect(R.cx - 14, hy - 8, 28, 4)
  return { c, sil: whiteSil(c, c.width, c.height), w: c.width, h: c.height, legTop: R.legTop + PA, cx: R.cx, top: R.top + PA, bottom: R.bottom + PA }
}

// TIN MAN (76): full chrome repaint (cloth + hair cap), rivets, and the heart-meter
// door plate painted over the chest print.
export function tinnify(R) {
  const c = zoneRepaint(R, [
    ['#dd7575', 'cap'], ['#e08888', 'cap'], ['#d06060', 'cap'],
    ['#4a4e58', 'chrome'], ['#3a3e48', 'chrome'], ['#5a5e68', 'chrome'],
    ['#f0f0f4', 'chrome'], ['#e8e8ec', 'chrome'],
  ], { cap: ['#8a97a4', '#b9c2cc'], chrome: ['#5f6b78', '#cfd6de'] })
  const x = c.getContext('2d')
  // rivets down the arms + collar seam
  x.fillStyle = '#e8edf2'
  for (const ry of [58, 70, 82]) {
    x.beginPath(); x.arc(6, R.top + ry, 1.6, 0, 7); x.fill()
    x.beginPath(); x.arc(R.w - 6, R.top + ry, 1.6, 0, 7); x.fill()
  }
  // heart-meter door plate (covers the pill print; mirror-safe)
  x.fillStyle = '#d8dee6'
  x.fillRect(R.cx - 15, R.top + 58, 30, 26)
  x.strokeStyle = '#9aa6b2'
  x.lineWidth = 2
  x.strokeRect(R.cx - 15, R.top + 58, 30, 26)
  x.fillStyle = '#c23b4a'
  x.beginPath()
  x.moveTo(R.cx, R.top + 78)
  x.bezierCurveTo(R.cx - 12, R.top + 66, R.cx - 7, R.top + 58, R.cx, R.top + 63)
  x.bezierCurveTo(R.cx + 7, R.top + 58, R.cx + 12, R.top + 66, R.cx, R.top + 78)
  x.fill()
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// COWARDLY LION (18): cream tee + skin -> fur ramp, mane ring + ears baked at the
// crown (the muscle-torso print disappears under fur).
export function lionify(R) {
  const PA = 16
  const c = canvas(R.w, R.h + PA), x = c.getContext('2d')
  const body = zoneRepaint(R, [
    ['#edbfaf', 'fur'], ['#e0b09c', 'fur'], ['#d8a890', 'fur'],
    ['#c89070', 'fur'], ['#b88060', 'fur'],
  ], { fur: ['#96662f', '#c98f4e'] })
  x.drawImage(body, 0, PA)
  const hy = R.top + PA + 18
  // mane ring: shaggy locks around the crown, face window left open
  const lock = (a0, a1, col) => {
    x.strokeStyle = col
    x.lineWidth = 7
    x.lineCap = 'round'
    x.beginPath()
    const mx = R.cx + Math.cos((a0 + a1) / 2) * 20
    const my = hy + Math.sin((a0 + a1) / 2) * 18
    x.quadraticCurveTo(mx * 0.4 + R.cx * 0.6, my * 0.4 + hy * 0.6 + 14, mx, my + 6)
    x.stroke()
  }
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * (0.06 + (i / 7) * 0.88)
    lock(Math.PI - a - 0.12, Math.PI - a + 0.12, i % 2 ? '#8a5a28' : '#7a4c20')
  }
  // ears peeking through the mane
  x.fillStyle = '#c98f4e'
  x.beginPath(); x.ellipse(R.cx - 21, hy - 8, 6, 7, -0.3, 0, 7); x.fill()
  x.beginPath(); x.ellipse(R.cx + 21, hy - 8, 6, 7, 0.3, 0, 7); x.fill()
  x.fillStyle = '#7a4c20'
  x.beginPath(); x.ellipse(R.cx - 21, hy - 8, 3, 4, -0.3, 0, 7); x.fill()
  x.beginPath(); x.ellipse(R.cx + 21, hy - 8, 3, 4, 0.3, 0, 7); x.fill()
  // chin tuft
  x.strokeStyle = '#8a5a28'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(R.cx - 5, hy + 26)
  x.lineTo(R.cx - 2, hy + 36)
  x.moveTo(R.cx + 5, hy + 26)
  x.lineTo(R.cx + 2, hy + 36)
  x.stroke()
  return { c, sil: whiteSil(c, c.width, c.height), w: c.width, h: c.height, legTop: R.legTop + PA, cx: R.cx, top: R.top + PA, bottom: R.bottom + PA }
}

// WINKIE GUARDS (4187 / 3140): red serape + jeans -> grey armor ramp, baked cap.
export function guardify(R) {
  const PA = 12
  const c = canvas(R.w, R.h + PA), x = c.getContext('2d')
  const body = zoneRepaint(R, [
    ['#a21f2c', 'armor'], ['#a5212b', 'armor'], ['#8a1a24', 'armor'],
    ['#3a4a6a', 'armor'], ['#2c3a56', 'armor'],
  ], { armor: ['#59636e', '#8b95a2'] })
  x.drawImage(body, 0, PA)
  const hy = R.top + PA + 12
  x.fillStyle = '#3a4450'
  x.beginPath()
  x.ellipse(R.cx, hy - 2, 17, 10, 0, Math.PI, 0)
  x.fill()
  x.fillStyle = '#2c3440'
  x.fillRect(R.cx - 19, hy - 4, 38, 4)
  return { c, sil: whiteSil(c, c.width, c.height), w: c.width, h: c.height, legTop: R.legTop + PA, cx: R.cx, top: R.top + PA, bottom: R.bottom + PA }
}

// MUNCHKINS (33/87/96/14, far cuts): procedural flower hat baked at the crown.
export function munchkinify(R, petal) {
  const PA = 10
  const c = canvas(R.w, R.h + PA), x = c.getContext('2d')
  x.drawImage(R.c, 0, PA)
  const hy = R.top + PA + 12
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2
    x.fillStyle = petal
    x.beginPath()
    x.ellipse(R.cx + Math.cos(a) * 7, hy - 6 + Math.sin(a) * 5, 4.4, 3, a, 0, 7)
    x.fill()
  }
  x.fillStyle = '#ffcc2e'
  x.beginPath()
  x.arc(R.cx, hy - 6, 3, 0, 7)
  x.fill()
  return { c, sil: whiteSil(c, c.width, c.height), w: c.width, h: c.height, legTop: R.legTop + PA, cx: R.cx, top: R.top + PA, bottom: R.bottom + PA }
}

// WITCH OF THE EAST (482): feet crop y90-116, striped stockings over the WHOLE
// leg zone (a 14px stripe band read as a blanket), shoes brightened to read as
// the ruby pair at distance. plain=true bakes the SHED pair (ruby -> dark brown)
// for the moment the slippers transfer to the hero.
export function eastFeetBake(R, plain = false) {
  const cy = 88, ch = R.h - cy
  const c = canvas(R.w, ch + 6), x = c.getContext('2d')
  x.drawImage(R.c, 0, cy, R.w, ch, 0, 6, R.w, ch)
  // striped stockings over every leg row (jeans zone included)
  for (let y = 0; y < ch; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const d = x.getImageData(xx, y + 6, 1, 1).data
      if (d[3] < 8) continue
      x.fillStyle = (xx + y) % 8 < 4 ? '#4a3b6b' : '#c9b45a'
      x.fillRect(xx, y + 6, 1, 1)
    }
  // shoes: the bottom-most OPAQUE rows (the rig canvas pads below the feet, so a
  // fixed offset never lands) -> bright ruby, with a dark sole line
  {
    const probe = x.getImageData(0, 0, c.width, c.height).data
    let maxY = 0
    for (let y = c.height - 1; y >= 0; y--) {
      let n = 0
      for (let xx = 0; xx < c.width; xx++) if (probe[(y * c.width + xx) * 4 + 3] > 8) n++
      if (n > 4) { maxY = y; break }
    }
    for (let y = Math.max(0, maxY - 13); y <= maxY; y++)
      for (let xx = 0; xx < c.width; xx++) {
        const i = (y * c.width + xx) * 4
        if (probe[i + 3] < 8) continue
        const L = (probe[i] + probe[i + 1] + probe[i + 2]) / 765
        x.fillStyle = plain ? '#4a3626' : (L < 0.4 ? '#c24040' : '#e85858')
        x.fillRect(xx, y, 1, 1)
      }
    for (let xx = 0; xx < c.width; xx++)
      if (probe[(maxY * c.width + xx) * 4 + 3] > 8) {
        x.fillStyle = '#6e1f1f'
        x.fillRect(xx, maxY, 1, 1)
      }
  }
  if (plain) {
    const d = x.getImageData(0, 0, c.width, c.height), q = d.data
    for (let i = 0; i < c.width * c.height; i++) {
      if (q[i * 4 + 3] < 8) continue
      const r = q[i * 4], g = q[i * 4 + 1], b = q[i * 4 + 2]
      if (!(r > 140 && g < 110 && b < 110 && r > b + 60)) continue
      q[i * 4] = 74; q[i * 4 + 1] = 54; q[i * 4 + 2] = 38
    }
    x.putImageData(d, 0, 0)
  }
  return { c, w: c.width, h: c.height }
}

// ============================== prop painters (pure t) ==============================

// THE WIG — auburn mass, separate from the witch so it can smolder, float, flee.
export function wig(x, cx, cy, s, t, o = {}) {
  x.save()
  x.translate(cx, cy + Math.sin(t * (o.bob ?? 2.4)) * (o.bobA ?? 4))
  x.rotate(o.rot ?? Math.sin(t * 1.6) * 0.06)
  x.scale(s, s)
  x.fillStyle = '#7a3b24'
  x.beginPath()
  x.ellipse(0, 0, 17, 13, 0, 0, 7)
  x.fill()
  x.fillStyle = '#5a2a18'
  x.beginPath()
  x.ellipse(-4, 5, 13, 8, 0.2, 0, 7)
  x.fill()
  x.fillStyle = '#8a4526'
  for (const [dx, dy, r] of [[-10, -8, 6], [0, -11, 7], [10, -8, 6], [-15, 0, 5], [15, 0, 5]]) {
    x.beginPath()
    x.arc(dx, dy, r, 0, 7)
    x.fill()
  }
  x.strokeStyle = '#9c5432'
  x.lineWidth = 1.6
  for (let i = -2; i <= 2; i++) {
    x.beginPath()
    x.moveTo(i * 6, -6)
    x.quadraticCurveTo(i * 7, 2, i * 6, 10)
    x.stroke()
  }
  if (o.smolder) {
    for (let i = 0; i < 4; i++) {
      const u = ((t * 0.5 + hash(i * 7)) % 1)
      x.globalAlpha = (1 - u) * 0.5
      x.fillStyle = '#8a8a8a'
      x.beginPath()
      x.arc(-8 + hash(i) * 16, -14 - u * 26, 3 + u * 6, 0, 7)
      x.fill()
    }
    x.globalAlpha = 1
  }
  x.restore()
}

// Broom: straw head + haft; ang tilts it.
export function broom(x, cx, cy, ang, s) {
  x.save()
  x.translate(cx, cy)
  x.rotate(ang)
  x.scale(s, s)
  x.strokeStyle = '#6b4a2f'
  x.lineWidth = 5
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(-46, 0)
  x.lineTo(24, 0)
  x.stroke()
  x.fillStyle = '#c9a351'
  x.beginPath()
  x.moveTo(22, -7)
  x.quadraticCurveTo(48, -12, 56, -9)
  x.lineTo(56, 9)
  x.quadraticCurveTo(48, 12, 22, 7)
  x.closePath()
  x.fill()
  x.strokeStyle = '#8a6a30'
  x.lineWidth = 1.4
  for (let i = 0; i < 4; i++) {
    x.beginPath()
    x.moveTo(30 + i * 7, -8)
    x.lineTo(32 + i * 7, 8)
    x.stroke()
  }
  x.fillStyle = '#4a3620'
  x.fillRect(20, -8, 5, 16)
  x.restore()
}

// Bicycle with a rider (bald neighbor): wheels = circles with hash spokes, legs on
// rotating cranks; sign rides the front basket.
export function bicycle(x, cx, cy, s, t, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  const spin = t * 9
  const wheel = (wx, wy, r) => {
    x.strokeStyle = '#3a3430'
    x.lineWidth = 3
    x.beginPath()
    x.arc(wx, wy, r, 0, 7)
    x.stroke()
    x.strokeStyle = '#5a544c'
    x.lineWidth = 1.2
    for (let i = 0; i < 6; i++) {
      const a = spin + i * 1.047 + hash(i + (o.seed ?? 0)) * 0.3
      x.beginPath()
      x.moveTo(wx, wy)
      x.lineTo(wx + Math.cos(a) * r, wy + Math.sin(a) * r)
      x.stroke()
    }
  }
  x.strokeStyle = '#4a5462'
  x.lineWidth = 3.4
  x.beginPath()
  x.moveTo(-26, -2)
  x.lineTo(-8, -20)
  x.lineTo(20, -20)
  x.lineTo(28, -2)
  x.lineTo(-26, -2)
  x.moveTo(-8, -20)
  x.lineTo(-2, -2)
  x.moveTo(24, -22)
  x.lineTo(30, -26)
  x.stroke()
  wheel(-24, 0, 13)
  wheel(26, 0, 13)
  // crank + pedalling legs
  const ca = spin * 1.1
  const px = 1, py = -11
  const f1x = px + Math.cos(ca) * 7, f1y = py + Math.sin(ca) * 7
  const f2x = px + Math.cos(ca + Math.PI) * 7, f2y = py + Math.sin(ca + Math.PI) * 7
  x.strokeStyle = '#3a3430'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(px - 2, -34)
  x.lineTo(f1x, f1y)
  x.moveTo(px + 2, -34)
  x.lineTo(f2x, f2y)
  x.stroke()
  if (o.sign) {
    // sign rides HIGH on a pole — clears the rider's head AND the hero's as the
    // bike crosses her (world ~y 592-652, the gap under the title band)
    x.strokeStyle = '#5a544c'
    x.lineWidth = 2
    x.beginPath()
    x.moveTo(30, -24)
    x.lineTo(50, -90)
    x.stroke()
    x.fillStyle = '#e8e0cc'
    x.fillRect(26, -100, 80, 20)
    x.strokeStyle = '#3a3430'
    x.lineWidth = 1.4
    x.strokeRect(26, -100, 80, 20)
    x.fillStyle = '#2a242e'
    x.font = '700 8px "JetBrains Mono"'
    x.textAlign = 'center'
    x.fillText('TAKEN TO BE', 66, -92)
    x.fillText('SHORN', 66, -83)
    x.textAlign = 'left'
  }
  if (o.horn && Math.sin(t * 6) > 0.7) {
    x.strokeStyle = 'rgba(226,232,240,0.6)'
    x.lineWidth = 1.6
    for (let i = 0; i < 3; i++) {
      x.beginPath()
      x.arc(38, -28, 6 + i * 5, -0.7, 0.7)
      x.stroke()
    }
  }
  x.restore()
  return { pedal: [cx + (px * s), cy + (py * s)], seat: [cx + (px * s), cy - 34 * s], head: [cx + (px * s), cy - 52 * s] }
}

// Water bucket (innocent-looking).
export function bucket(x, cx, cy, s, rot = 0) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  x.strokeStyle = '#5a544c'
  x.lineWidth = 2
  x.beginPath()
  x.arc(0, -14, 8, Math.PI * 1.15, Math.PI * 1.85)
  x.stroke()
  const g = x.createLinearGradient(-14, 0, 14, 0)
  g.addColorStop(0, '#8a6a48')
  g.addColorStop(0.45, '#b08a5c')
  g.addColorStop(1, '#6a4e34')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(-13, -12)
  x.lineTo(13, -12)
  x.lineTo(10, 8)
  x.lineTo(-10, 8)
  x.closePath()
  x.fill()
  x.fillStyle = '#4a3a26'
  x.fillRect(-13, -14, 26, 4)
  x.restore()
}

// Water arc + droplets (age-keyed, analytic gravity on the tail).
export function waterArc(x, x0, y0, x1, y1, age, life) {
  if (age <= 0 || age > life) return
  const u = age / life
  x.strokeStyle = `rgba(214,236,250,${0.85 * (1 - u * 0.4)})`
  x.lineWidth = 7 * (1 - u * 0.5)
  x.beginPath()
  x.moveTo(x0, y0)
  x.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 90, x1, y1 + 120 * u * u)
  x.stroke()
  x.fillStyle = 'rgba(214,236,250,0.8)'
  for (let i = 0; i < 8; i++) {
    const du = clamp01(u + hash(i * 9) * 0.1)
    const dx = (1 - du) * (1 - du) * x0 + 2 * (1 - du) * du * ((x0 + x1) / 2) + du * du * x1
    const dy = (1 - du) * (1 - du) * y0 + 2 * (1 - du) * du * (Math.min(y0, y1) - 90) + du * du * (y1 + 120 * u * u)
    x.beginPath()
    x.arc(dx + (hash(i) - 0.5) * 14, dy + hash(i * 3) * 10, 2.4 + hash(i * 5) * 2.4, 0, 7)
    x.fill()
  }
}

// Spear (guards), tip up; ang tilts (domino weight).
export function spear(x, cx, cy, ang, s) {
  x.save()
  x.translate(cx, cy)
  x.rotate(ang)
  x.scale(s, s)
  x.strokeStyle = '#6b4a2f'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(0, 60)
  x.lineTo(0, -56)
  x.stroke()
  x.fillStyle = '#cfd6de'
  x.beginPath()
  x.moveTo(-5, -54)
  x.lineTo(0, -74)
  x.lineTo(5, -54)
  x.closePath()
  x.fill()
  x.fillStyle = '#ffcc2e'
  x.fillRect(-4, -52, 8, 5)
  x.restore()
}

// Comb prop (giant bell-pull / gift / token).
export function comb(x, cx, cy, rot, s) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  x.fillStyle = '#ffcc2e'
  x.fillRect(-26, -4, 52, 11)
  x.fillStyle = '#e08a0c'
  for (let i = 0; i < 8; i++) x.fillRect(-23 + i * 6.4, 6, 3, 10)
  x.fillStyle = '#fff6b0'
  x.fillRect(-26, -4, 52, 2.4)
  x.restore()
}

// Ruby slipper prop with bow + heel.
export function slipper(x, cx, cy, s, rot = 0) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  x.fillStyle = '#d83838'
  x.beginPath()
  x.moveTo(-16, 0)
  x.quadraticCurveTo(-18, -10, -6, -11)
  x.lineTo(14, -9)
  x.quadraticCurveTo(20, -7, 18, -1)
  x.lineTo(16, 4)
  x.lineTo(-14, 4)
  x.closePath()
  x.fill()
  x.fillStyle = '#b83838'
  x.fillRect(-14, 2, 30, 4)
  x.fillStyle = '#b83838'
  x.fillRect(8, 4, 6, 7)
  x.fillStyle = '#ff9aa2'
  x.beginPath()
  x.ellipse(-2, -11, 5, 3.4, 0.2, 0, 7)
  x.fill()
  x.fillStyle = '#ffe3e3'
  x.beginPath()
  x.arc(-1, -12, 1.6, 0, 7)
  x.fill()
  x.restore()
}

// Four-point star glint, k 0..1 (house pattern).
export function starGlint(x, cx, cy, s, k, col = '#fff6d8') {
  if (k <= 0 || k >= 1) return
  x.save()
  x.translate(cx, cy)
  x.globalAlpha = Math.sin(k * Math.PI)
  x.fillStyle = col
  const r = s * (0.4 + 0.6 * Math.sin(k * Math.PI))
  x.beginPath()
  x.moveTo(0, -r)
  x.quadraticCurveTo(2, -2, r, 0)
  x.quadraticCurveTo(2, 2, 0, r)
  x.quadraticCurveTo(-2, 2, -r, 0)
  x.quadraticCurveTo(-2, -2, 0, -r)
  x.closePath()
  x.fill()
  x.restore()
}

// Expanding spark ring + radial glints (heel clicks, wand flicks); age-keyed.
export function sparkRing(x, cx, cy, age, life, col = 'rgba(255,230,150,') {
  if (age <= 0 || age >= life) return
  const u = age / life
  x.strokeStyle = col + (0.9 * (1 - u)) + ')'
  x.lineWidth = 4 * (1 - u) + 1
  x.beginPath()
  x.ellipse(cx, cy, 10 + u * 120, (10 + u * 120) * 0.45, 0, 0, 7)
  x.stroke()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + hash(i) * 0.5
    const rr = 12 + u * 130
    starGlint(x, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.5, 12, 1 - u)
  }
}

// Twister funnel: tapering wobbling vortex bands + collar cloud. Pure t.
export function funnel(x, cx, topY, baseY, t, o = {}) {
  const spin = t * (o.spin ?? 2.4)
  const n = 15
  for (let i = n; i >= 0; i--) {
    const u = i / n
    const y = topY + (baseY - topY) * u
    const w = (o.wTop ?? 26) + ((o.wBase ?? 200) - (o.wTop ?? 26)) * Math.pow(u, 1.35)
    const wob = Math.sin(spin * (1.25 - u * 0.8) + u * 7.2) * (8 + u * (o.sway ?? 40))
    x.globalAlpha = o.alpha ?? 0.6
    x.fillStyle = i % 2 ? (o.dark ?? 'rgba(74,66,56,1)') : (o.light ?? 'rgba(106,94,80,1)')
    x.beginPath()
    x.ellipse(cx + wob, y, w, Math.max(7, w * 0.2), 0, 0, 7)
    x.fill()
  }
  x.globalAlpha = 1
  // collar cloud where the funnel meets the sky
  for (let i = 0; i < 5; i++) {
    x.fillStyle = o.dark ?? 'rgba(74,66,56,0.85)'
    x.beginPath()
    x.ellipse(cx + (i - 2) * 90 + Math.sin(spin + i) * 14, topY + 10 - (i % 2) * 26, 120 + hash(i) * 60, 34 + hash(i * 3) * 18, 0, 0, 7)
    x.fill()
  }
}

// Flying debris chunk orbiting a centre (S2 exterior): ellipse orbit, depth scale.
export function orbitDebris(x, cx, cy, rx, ry, a0, spin, t, kind, seed) {
  const a = a0 + spin * t
  const px = cx + Math.cos(a) * rx
  const py = cy + Math.sin(a) * ry
  const depth = 0.55 + 0.45 * Math.sin(a + Math.PI / 2)
  const s = depth
  x.save()
  x.translate(px, py)
  x.scale(s, s)
  x.rotate(a + spin * 0.4)
  x.globalAlpha = 0.55 + depth * 0.45
  if (kind === 'cow') {
    x.fillStyle = '#8a827a'
    x.beginPath()
    x.ellipse(0, 0, 22, 12, 0, 0, 7)
    x.fill()
    x.fillStyle = '#6e675f'
    x.beginPath()
    x.ellipse(20, -8, 8, 6, 0.4, 0, 7)
    x.fill()
    x.strokeStyle = '#5a544c'
    x.lineWidth = 3
    x.beginPath()
    x.moveTo(-12, 10)
    x.lineTo(-12, 16)
    x.moveTo(10, 10)
    x.lineTo(10, 16)
    x.stroke()
  } else if (kind === 'haystack') {
    x.fillStyle = '#b09a5c'
    x.beginPath()
    x.ellipse(0, 4, 26, 16, 0, Math.PI, 0)
    x.fill()
    x.strokeStyle = '#8a7642'
    x.lineWidth = 1.4
    for (let i = 0; i < 4; i++) {
      x.beginPath()
      x.moveTo(-18 + i * 9, 2 - i)
      x.lineTo(-14 + i * 9, -12 + i)
      x.stroke()
    }
  } else if (kind === 'piano') {
    x.fillStyle = '#3a3440'
    x.fillRect(-20, -12, 40, 22)
    x.fillStyle = '#e8e4da'
    x.fillRect(-16, 4, 32, 5)
    x.fillStyle = '#2a2430'
    for (let i = 0; i < 7; i++) x.fillRect(-15 + i * 4.6, 4, 2, 5)
  } else {
    // fence rail
    x.fillStyle = '#7a6c58'
    x.fillRect(-26, -4, 52, 8)
    x.fillRect(-18, -10, 8, 20)
    x.fillRect(12, -10, 8, 20)
  }
  x.restore()
  x.globalAlpha = 1
  void seed
}

// Glinda's soap bubble: rim @35% + pure-white highlight arc.
export function bubble(x, cx, cy, r, t) {
  x.save()
  const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r)
  g.addColorStop(0, 'rgba(255,255,255,0.34)')
  g.addColorStop(0.7, 'rgba(207,233,255,0.16)')
  g.addColorStop(1, 'rgba(207,233,255,0.4)')
  x.fillStyle = g
  x.beginPath()
  x.arc(cx, cy, r, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(207,233,255,0.55)'
  x.lineWidth = 2.6
  x.beginPath()
  x.arc(cx, cy, r, 0, 7)
  x.stroke()
  x.strokeStyle = 'rgba(255,255,255,0.8)'
  x.lineWidth = 3.4
  x.beginPath()
  x.arc(cx, cy, r * 0.82, Math.PI * 1.05 + Math.sin(t) * 0.1, Math.PI * 1.45 + Math.sin(t) * 0.1)
  x.stroke()
  x.restore()
}

// Bubble pop: iridescent shards, hue keyed by angle, expanding as the bubble dies.
export function bubbleShards(x, cx, cy, r0, age, life) {
  if (age <= 0 || age >= life) return
  const u = age / life
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    const rr = r0 * (0.4 + u * 1.7)
    const px = cx + Math.cos(a) * rr
    const py = cy + Math.sin(a) * rr
    x.strokeStyle = `hsla(${Math.round(((a + Math.PI) / (Math.PI * 2)) * 360)}, 80%, 75%, ${1 - u})`
    x.lineWidth = 3 * (1 - u) + 0.6
    x.beginPath()
    x.arc(px, py, 5 + u * 9, a, a + 0.9)
    x.stroke()
  }
}

// Smoke puff / ring: jittered seeded circles; ring = expanding hollow torus read.
export function smokePuff(x, cx, cy, age, life, o = {}) {
  if (age <= 0 || age >= life) return
  const u = age / life
  const n = o.n ?? 12
  const r = rng(o.seed ?? 5)
  for (let i = 0; i < n; i++) {
    const dx = (r() - 0.5) * 150 * (0.3 + u)
    const dy = -(r() * 90) * u + (r() - 0.5) * 40
    x.globalAlpha = (1 - u) * (0.4 + r() * 0.35)
    x.fillStyle = o.col ?? '#b9c2c9'
    x.beginPath()
    x.arc(cx + dx, cy + dy, 12 + r() * 26 * (0.4 + u), 0, 7)
    x.fill()
  }
  x.globalAlpha = 1
}
export function smokeRing(x, cx, cy, age, life) {
  if (age <= 0 || age >= life) return
  const u = age / life
  x.strokeStyle = `rgba(150,158,164,${0.7 * (1 - u)})`
  x.lineWidth = 26 * (1 - u) + 3
  x.beginPath()
  x.ellipse(cx, cy, 20 + u * 190, (20 + u * 190) * 0.42, 0, 0, 7)
  x.stroke()
}

// Fire for the pylons: layered flickering tongues, pure t.
export function flame(x, cx, cy, hgt, t, seed = 0) {
  x.save()
  x.globalCompositeOperation = 'lighter'
  const tongues = [[0.5, '#ff6a1e'], [0.32, '#ffc23c'], [0.16, '#fff3c4']]
  for (const [wf, col] of tongues) {
    x.fillStyle = col
    x.beginPath()
    const n = 7
    x.moveTo(cx - hgt * 0.3 * wf, cy)
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const fx = cx - hgt * 0.3 * wf + hgt * 0.6 * wf * u
      const fy = cy - hgt * (0.55 + 0.45 * hash(Math.floor(t * 9) + i * 3 + seed)) * Math.sin(u * Math.PI)
      x.lineTo(fx, fy)
    }
    for (let i = n; i >= 0; i--) {
      const u = i / n
      const fy = cy - hgt * (0.55 + 0.45 * hash(Math.floor(t * 9) + i * 5 + seed + 40)) * Math.sin(u * Math.PI)
      x.lineTo(cx - hgt * 0.3 * wf + hgt * 0.6 * wf * u, fy + hgt * 0.14 * wf)
    }
    x.closePath()
    x.fill()
  }
  x.restore()
}

// Hair hourglass: pink strands fall with sway; pile mound grows with progress
// p (0..1). oneLeft trembles the final strand.
export function hourglass(x, cx, cy, s, p, t) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  // glass bulbs
  x.fillStyle = 'rgba(207,233,255,0.14)'
  x.beginPath()
  x.moveTo(-20, -42)
  x.quadraticCurveTo(-20, -6, 0, 0)
  x.quadraticCurveTo(20, -6, 20, -42)
  x.closePath()
  x.fill()
  x.beginPath()
  x.moveTo(-20, 42)
  x.quadraticCurveTo(-20, 6, 0, 0)
  x.quadraticCurveTo(20, 6, 20, 42)
  x.closePath()
  x.fill()
  x.strokeStyle = '#c9b45a'
  x.lineWidth = 3.4
  x.beginPath()
  x.moveTo(-24, -42)
  x.lineTo(24, -42)
  x.moveTo(-24, 42)
  x.lineTo(24, 42)
  x.moveTo(-20, -42)
  x.quadraticCurveTo(-20, -6, 0, 0)
  x.quadraticCurveTo(20, -6, 20, -42)
  x.moveTo(-20, 42)
  x.quadraticCurveTo(-20, 6, 0, 0)
  x.quadraticCurveTo(20, 6, 20, 42)
  x.stroke()
  // falling strands above the neck
  const n = 9
  const fallN = Math.min(n, Math.floor(p * (n + 1)))
  // top-bulb residue: the upper chamber visibly EMPTIES as the pile grows
  const surf = -8 - (1 - p) * 28
  const hw = 15 * (1 - p * 0.55)
  x.strokeStyle = '#e89ab8'
  x.lineWidth = 2.4
  x.beginPath()
  x.moveTo(-hw, surf)
  x.quadraticCurveTo(0, surf + 4, hw, surf)
  x.stroke()
  for (let i = 0; i < fallN; i++) {
    const su = clamp01(p * (n + 1) - i)
    const sy = -38 + su * 38
    const sway = i === n - 1 && p > 0.92 ? Math.sin(t * 21) * 3 : Math.sin(t * 4 + i) * 1.6
    x.strokeStyle = i % 2 ? '#f2b8cf' : '#e89ab8'
    x.lineWidth = 2
    x.beginPath()
    x.moveTo(sway, sy - 34 + i * 3)
    x.quadraticCurveTo(sway * 2, sy - 14, sway * 0.5, sy)
    x.stroke()
  }
  // growing pile
  const pileH = 4 + p * 22
  x.fillStyle = '#e89ab8'
  x.beginPath()
  x.ellipse(0, 38 - pileH * 0.4, 16, pileH, 0, Math.PI, 0)
  x.fill()
  x.strokeStyle = '#d87ea6'
  x.lineWidth = 1.4
  const r = rng(77)
  for (let i = 0; i < 7; i++) {
    const ex = -13 + r() * 26
    x.beginPath()
    x.moveTo(ex, 38 - pileH * 0.5 + (r() - 0.5) * 4)
    x.lineTo(ex + (r() - 0.5) * 8, 40 - pileH * 0.2)
    x.stroke()
  }
  x.restore()
}

// Confetti burst (celebration): seeded rects with analytic fall + sway.
export function confetti(x, cx, cy, age, life, seed) {
  if (age <= 0 || age > life) return
  const r = rng(seed)
  for (let i = 0; i < 22; i++) {
    const sp = 90 + r() * 160
    const dx = (r() - 0.5) * 2 * sp * age
    const dy = -(r() * 190 + 60) * age + 210 * age * age
    const hue = ['#ff8a8a', '#ffcc2e', '#8fd460', '#f2b8cf', '#7db0d7'][i % 5]
    x.globalAlpha = Math.max(0, 1 - age / life)
    x.fillStyle = hue
    x.save()
    x.translate(cx + dx, cy + dy)
    x.rotate(age * 6 + i)
    x.fillRect(-4, -2.4, 8, 4.8)
    x.restore()
  }
  x.globalAlpha = 1
}

// Procedural snowfall (Glinda's wake): hash flakes falling with sway.
export function snowfall(x, t, n, seed = 9) {
  for (let i = 0; i < n; i++) {
    const spd = 46 + hash(i * 3 + seed) * 60
    const y = ((t * spd + hash(i + seed) * 1400) % 1400) - 200
    const sx = hash(i * 7 + seed) * 2100 - 90 + Math.sin(t * 1.4 + i) * 26
    if (y < -20 || y > 1150) continue
    x.globalAlpha = 0.5 + hash(i * 11) * 0.4
    x.fillStyle = '#ffffff'
    x.beginPath()
    x.arc(sx, y, 1.6 + hash(i * 13) * 2.6, 0, 7)
    x.fill()
  }
  x.globalAlpha = 1
}

// Wind streaks (sepia gales): horizontal speed lines fading at the edges.
export function windStreaks(x, t, n, seed) {
  for (let i = 0; i < n; i++) {
    const y = 120 + hash(i * 3 + seed) * 820
    const spd = 900 + hash(i * 5 + seed) * 700
    const lx = ((t * spd + hash(i + seed) * 2600) % 2600) - 300
    x.globalAlpha = 0.14 + hash(i * 7 + seed) * 0.16
    x.fillStyle = '#d8d2c4'
    x.fillRect(lx, y, 130 + hash(i * 11) * 190, 2.4)
  }
  x.globalAlpha = 1
}

// ============================== set bakes ==============================

const bakeCanvas = () => {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  return [c, x]
}

// S1: sepia farm — sky, distant fields, plowed furrows, wheat, barn, crooked
// windmill, fence line. Painted warm-grey so the fx sepia grade prints true.
export function farmBake() {
  const [c, x] = bakeCanvas()
  const r = rng(1939)
  // sky: green-brown dread gathering at the top (Kansas before the twist)
  const g = x.createLinearGradient(0, -OS, 0, 620)
  g.addColorStop(0, '#8a8474')
  g.addColorStop(0.5, '#a89c84')
  g.addColorStop(1, '#c9bda0')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, 640 + OS)
  // low sepia cloud shelf
  for (let i = 0; i < 8; i++) {
    x.fillStyle = `rgba(134,126,110,${0.28 + r() * 0.22})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, 60 + r() * 220, 160 + r() * 190, 30 + r() * 26, 0, 0, 7)
    x.fill()
  }
  // horizon fields
  x.fillStyle = '#9a8c68'
  x.fillRect(-OS, 560, W + OS * 2, 60)
  x.fillStyle = '#8a7c5c'
  for (let i = 0; i < 16; i++) {
    x.beginPath()
    x.ellipse(-100 + i * 150 + r() * 60, 570 + r() * 16, 90 + r() * 60, 8 + r() * 6, 0, 0, 7)
    x.fill()
  }
  // mid ground: plowed field with converging furrows
  const pg = x.createLinearGradient(0, 620, 0, 860)
  pg.addColorStop(0, '#8a7250')
  pg.addColorStop(1, '#6e5a40')
  x.fillStyle = pg
  x.fillRect(-OS, 620, W + OS * 2, 240)
  x.strokeStyle = 'rgba(52,42,30,0.55)'
  for (let i = 0; i < 22; i++) {
    const u = i / 21
    x.lineWidth = 2 + u * 6
    x.beginPath()
    x.moveTo(700 + (u - 0.5) * 500, 620)
    x.lineTo(-OS + (u - 0.5) * 2600, 900)
    x.stroke()
  }
  // wheat strip right of the furrows
  x.fillStyle = '#a8925e'
  x.fillRect(1150, 620, W + OS - 1150, 300)
  x.strokeStyle = 'rgba(140,118,72,0.8)'
  x.lineWidth = 2
  for (let i = 0; i < 90; i++) {
    const wx = 1160 + r() * (W + OS - 1170)
    const wy = 640 + r() * 260
    x.beginPath()
    x.moveTo(wx, wy)
    x.quadraticCurveTo(wx + 4, wy - 12, wx + 2, wy - 22)
    x.stroke()
  }
  // barn (left, mid-distance)
  x.fillStyle = '#6e4a3a'
  x.fillRect(150, 560, 200, 120)
  x.fillStyle = '#4a3228'
  x.beginPath()
  x.moveTo(130, 560)
  x.lineTo(250, 500)
  x.lineTo(370, 560)
  x.closePath()
  x.fill()
  x.fillStyle = '#3a2a20'
  x.fillRect(220, 600, 60, 80)
  // silo
  x.fillStyle = '#7a7266'
  x.fillRect(370, 520, 54, 160)
  x.beginPath()
  x.ellipse(397, 520, 27, 16, 0, Math.PI, 0)
  x.fill()
  // crooked windmill (right): leaning tower + 4 sails
  x.save()
  x.translate(1660, 700)
  x.rotate(0.06)
  x.fillStyle = '#7a7266'
  x.beginPath()
  x.moveTo(-34, 0)
  x.lineTo(-18, -210)
  x.lineTo(18, -210)
  x.lineTo(34, 0)
  x.closePath()
  x.fill()
  x.fillStyle = '#5a544a'
  x.fillRect(-24, -216, 48, 12)
  x.strokeStyle = '#4a443a'
  x.lineWidth = 5
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4
    x.beginPath()
    x.moveTo(0, -222)
    x.lineTo(Math.cos(a) * 110, -222 + Math.sin(a) * 110)
    x.stroke()
    x.fillStyle = 'rgba(216,208,188,0.7)'
    x.save()
    x.translate(0, -222)
    x.rotate(a)
    x.fillRect(14, -9, 92, 18)
    x.restore()
  }
  x.restore()
  // front dirt road
  x.fillStyle = '#7a6a50'
  x.beginPath()
  x.moveTo(-OS, 1000)
  x.quadraticCurveTo(500, 900, 1100, 960)
  x.quadraticCurveTo(1700, 1020, W + OS, 940)
  x.lineTo(W + OS, H + OS)
  x.lineTo(-OS, H + OS)
  x.closePath()
  x.fill()
  // fence line across the front with posts + two rails
  x.strokeStyle = '#5a4c3a'
  for (let px = -OS; px < W + OS; px += 130) {
    x.lineWidth = 9
    x.beginPath()
    x.moveTo(px, 852 + Math.sin(px * 0.01) * 8)
    x.lineTo(px, 948)
    x.stroke()
  }
  x.lineWidth = 6
  x.beginPath()
  x.moveTo(-OS, 866)
  x.quadraticCurveTo(500, 878, W + OS, 858)
  x.stroke()
  x.beginPath()
  x.moveTo(-OS, 906)
  x.quadraticCurveTo(500, 918, W + OS, 898)
  x.stroke()
  // seeded grit
  for (let i = 0; i < 120; i++) {
    x.fillStyle = `rgba(58,48,36,${0.12 + r() * 0.2})`
    x.fillRect(r() * (W + OS * 2) - OS, 640 + r() * (H - 560), 3 + r() * 5, 2 + r() * 3)
  }
  return c
}

// S1/S3: the farmhouse as its own canvas so it can lift, tilt and crash.
export function houseBake() {
  const c = canvas(760, 620), x = c.getContext('2d')
  // gable body
  const g = x.createLinearGradient(0, 180, 0, 600)
  g.addColorStop(0, '#9a8e78')
  g.addColorStop(1, '#6e6454')
  x.fillStyle = g
  x.fillRect(80, 220, 600, 380)
  // roof
  x.fillStyle = '#4e4238'
  x.beginPath()
  x.moveTo(40, 230)
  x.lineTo(380, 60)
  x.lineTo(720, 230)
  x.closePath()
  x.fill()
  x.fillStyle = '#5e5248'
  x.fillRect(40, 222, 680, 14)
  // porch + door
  x.fillStyle = '#5a4e40'
  x.fillRect(300, 480, 160, 120)
  x.fillStyle = '#3a3026'
  x.fillRect(340, 500, 80, 100)
  x.fillStyle = '#c9b45a'
  x.beginPath()
  x.arc(352, 550, 4, 0, 7)
  x.fill()
  // windows with warm panes
  for (const [wx, wy] of [[150, 300], [150, 420], [560, 300], [560, 420]]) {
    x.fillStyle = '#383026'
    x.fillRect(wx - 4, wy - 4, 92, 78)
    x.fillStyle = '#c9b88e'
    x.fillRect(wx, wy, 84, 70)
    x.strokeStyle = '#383026'
    x.lineWidth = 4
    x.beginPath()
    x.moveTo(wx + 42, wy)
    x.lineTo(wx + 42, wy + 70)
    x.moveTo(wx, wy + 35)
    x.lineTo(wx + 84, wy + 35)
    x.stroke()
  }
  // chimney
  x.fillStyle = '#6a5a4c'
  x.fillRect(540, 110, 46, 120)
  x.fillStyle = '#54483c'
  x.fillRect(532, 100, 62, 16)
  // board seams
  x.strokeStyle = 'rgba(40,34,26,0.4)'
  x.lineWidth = 3
  for (let wy = 250; wy < 590; wy += 34) {
    x.beginPath()
    x.moveTo(82, wy)
    x.lineTo(678, wy)
    x.stroke()
  }
  return c
}

// S2 interior: warm wallpaper wall with a round window HOLE (transparent) so the
// vortex shows through; dresser, framed picture, rug — a lived-in kitchen.
export function twisterRoomBake() {
  const [c, x] = bakeCanvas()
  const r = rng(234)
  // wallpaper: warm two-tone stripes
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#7a6650')
  g.addColorStop(1, '#584838')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  x.fillStyle = 'rgba(44,34,24,0.3)'
  for (let px = -OS; px < W + OS; px += 96) x.fillRect(px, -OS, 34, H + OS * 2)
  // wainscot rail + darker dado
  x.fillStyle = '#4a3c2e'
  x.fillRect(-OS, 700, W + OS * 2, 22)
  x.fillStyle = '#54432f'
  x.fillRect(-OS, 722, W + OS * 2, 120)
  x.strokeStyle = 'rgba(30,22,14,0.4)'
  x.lineWidth = 3
  for (let px = -OS; px < W + OS; px += 64) {
    x.beginPath()
    x.moveTo(px, 722)
    x.lineTo(px, 842)
    x.stroke()
  }
  // floor boards
  x.fillStyle = '#64503a'
  x.fillRect(-OS, 842, W + OS * 2, H + OS - 842)
  x.fillStyle = 'rgba(30,22,14,0.5)'
  for (let px = -OS; px < W + OS; px += 110) x.fillRect(px, 844, 6, H + OS)
  // oval rug (flowto's spot)
  x.fillStyle = '#7a4a3a'
  x.beginPath()
  x.ellipse(520, 960, 220, 54, 0, 0, 7)
  x.fill()
  x.strokeStyle = '#8a5a46'
  x.lineWidth = 8
  x.beginPath()
  x.ellipse(520, 960, 180, 40, 0, 0, 7)
  x.stroke()
  // round window hole (transparent) at (1240, 470)
  x.save()
  x.globalCompositeOperation = 'destination-out'
  x.beginPath()
  x.arc(1240, 470, 172, 0, 7)
  x.fill()
  x.restore()
  // window frame ring + cross bars drawn back over the hole edge
  x.strokeStyle = '#3a2e24'
  x.lineWidth = 22
  x.beginPath()
  x.arc(1240, 470, 182, 0, 7)
  x.stroke()
  x.fillStyle = '#3a2e24'
  x.fillRect(1064, 462, 352, 14)
  x.fillRect(1232, 294, 14, 352)
  // dresser with dishes (left)
  x.fillStyle = '#4e3a28'
  x.fillRect(180, 560, 260, 290)
  x.fillStyle = '#5e4832'
  x.fillRect(180, 560, 260, 22)
  for (const dy of [640, 720]) {
    x.fillStyle = '#c9b45a'
    x.fillRect(210, dy, 200, 7)
    x.beginPath()
    x.arc(310, dy + 22, 7, 0, 7)
    x.fill()
  }
  x.fillStyle = '#e8e0d0'
  for (const dx of [230, 280, 330]) {
    x.beginPath()
    x.arc(dx, 545, 16, 0, 7)
    x.fill()
  }
  // framed picture above the dresser
  x.fillStyle = '#3a2c20'
  x.fillRect(255, 300, 110, 140)
  x.fillStyle = '#c9b88e'
  x.fillRect(267, 312, 86, 116)
  x.fillStyle = '#6a5a3c'
  x.beginPath()
  x.moveTo(267, 428)
  x.lineTo(300, 350)
  x.lineTo(330, 400)
  x.lineTo(353, 372)
  x.lineTo(353, 428)
  x.closePath()
  x.fill()
  // hanging lamp (swings live in the film)
  x.strokeStyle = '#2c221a'
  x.lineWidth = 6
  x.beginPath()
  x.moveTo(1560, -OS)
  x.lineTo(1560, 170)
  x.stroke()
  x.fillStyle = '#4a3a2a'
  x.beginPath()
  x.moveTo(1530, 170)
  x.lineTo(1590, 170)
  x.lineTo(1575, 230)
  x.lineTo(1545, 230)
  x.closePath()
  x.fill()
  // seeded wear
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(30,22,14,${0.08 + r() * 0.12})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, r() * 840, 20 + r() * 50, 6 + r() * 12, r(), 0, 7)
    x.fill()
  }
  return c
}

// S3 interior: plaster wall + centred door frame; the DOOR itself is separate.
export function doorRoomBake() {
  const [c, x] = bakeCanvas()
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#7a6c58')
  g.addColorStop(1, '#5a4e3e')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // wallpaper stripes
  x.fillStyle = 'rgba(48,40,30,0.24)'
  for (let px = -OS; px < W + OS; px += 64) x.fillRect(px, -OS, 18, H + OS * 2)
  // floor boards
  x.fillStyle = '#64503a'
  x.fillRect(-OS, 820, W + OS * 2, H + OS - 820)
  x.strokeStyle = 'rgba(34,26,18,0.55)'
  x.lineWidth = 4
  for (let px = -OS; px < W + OS; px += 96) {
    x.beginPath()
    x.moveTo(px, 820)
    x.lineTo(px - 60, H + OS)
    x.stroke()
  }
  x.beginPath()
  x.moveTo(-OS, 880)
  x.lineTo(W + OS, 880)
  x.stroke()
  // bed corner left
  x.fillStyle = '#8a7a60'
  x.fillRect(120, 700, 340, 140)
  x.fillStyle = '#c9bda0'
  x.fillRect(140, 660, 300, 60)
  x.fillStyle = '#4a3e30'
  x.fillRect(120, 830, 24, 60)
  x.fillRect(456, 830, 24, 60)
  // door frame (dark opening; door covers it)
  x.fillStyle = '#241c14'
  x.fillRect(838, 300, 244, 524)
  x.strokeStyle = '#3a2e22'
  x.lineWidth = 18
  x.strokeRect(830, 292, 260, 540)
  // small round mirror + shelf right
  x.fillStyle = '#3a2e22'
  x.beginPath()
  x.arc(1530, 380, 46, 0, 7)
  x.fill()
  x.fillStyle = '#8a94a2'
  x.beginPath()
  x.arc(1530, 380, 38, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(255,255,255,0.4)'
  x.beginPath()
  x.ellipse(1516, 364, 12, 20, -0.6, 0, 7)
  x.fill()
  x.fillStyle = '#4a3a28'
  x.fillRect(1470, 452, 120, 10)
  return c
}

// S3: the door panel (hinged at its left edge; opening = horizontal squash).
export function doorBake() {
  const c = canvas(250, 540), x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 250, 0)
  g.addColorStop(0, '#6e5a42')
  g.addColorStop(1, '#4e3e2c')
  x.fillStyle = g
  x.fillRect(0, 0, 250, 540)
  x.strokeStyle = 'rgba(30,22,14,0.6)'
  x.lineWidth = 5
  for (const [px, py, pw, ph] of [[26, 30, 198, 190], [26, 250, 198, 260]]) x.strokeRect(px, py, pw, ph)
  x.fillStyle = '#c9b45a'
  x.beginPath()
  x.arc(216, 280, 10, 0, 7)
  x.fill()
  return c
}

// S3/S10: munchkin village / FLOZ meadow. Candy palette for S3, sepia variant for
// the S10 drain target is a separate bake (meadowBake). Hatch mouths are baked dark
// so villagers can pop from them.
export function villageBake() {
  const [c, x] = bakeCanvas()
  const r = rng(303)
  // unbelievable blue sky
  const g = x.createLinearGradient(0, -OS, 0, 600)
  g.addColorStop(0, '#4aa8f0')
  g.addColorStop(0.6, '#8fd0ff')
  g.addColorStop(1, '#d2f0ff')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, 620 + OS)
  // puffy clouds with seams
  for (let i = 0; i < 6; i++) {
    const cx0 = r() * (W + OS * 2) - OS, cy0 = 90 + r() * 200
    x.fillStyle = '#ffffff'
    for (const [dx, dy, cr] of [[0, 0, 46], [-52, 10, 34], [52, 12, 36], [0, 20, 40]]) {
      x.beginPath()
      x.arc(cx0 + dx, cy0 + dy, cr, 0, 7)
      x.fill()
    }
    x.fillStyle = '#dceafc'
    x.beginPath()
    x.ellipse(cx0, cy0 + 26, 70, 16, 0, 0, 7)
    x.fill()
  }
  // candy hills
  x.fillStyle = '#7ed07c'
  x.beginPath()
  x.moveTo(-OS, 560)
  for (let px = -OS; px <= W + OS; px += 40) x.lineTo(px, 520 + Math.sin(px * 0.004) * 46 + Math.sin(px * 0.013) * 18)
  x.lineTo(W + OS, 700)
  x.lineTo(-OS, 700)
  x.closePath()
  x.fill()
  // ground
  const gg = x.createLinearGradient(0, 600, 0, H + OS)
  gg.addColorStop(0, '#58c84c')
  gg.addColorStop(1, '#3f9e3a')
  x.fillStyle = gg
  x.fillRect(-OS, 600, W + OS * 2, H + OS - 600)
  // flower speckle
  for (let i = 0; i < 130; i++) {
    const fx = r() * (W + OS * 2) - OS, fy = 620 + r() * (H - 480)
    x.fillStyle = ['#ff8a8a', '#ffcc2e', '#f2b8cf', '#ffffff'][i % 4]
    x.beginPath()
    x.arc(fx, fy, 3 + r() * 3, 0, 7)
    x.fill()
  }
  // curly-roof cottages row (spiral roofs = stacked shrinking arcs)
  const cottage = (cx0, baseY, s, wall, roof) => {
    x.fillStyle = wall
    x.fillRect(cx0 - 70 * s, baseY - 96 * s, 140 * s, 96 * s)
    x.fillStyle = '#3a2a20'
    x.fillRect(cx0 - 20 * s, baseY - 56 * s, 40 * s, 56 * s)
    x.fillStyle = '#ffe9a0'
    x.fillRect(cx0 - 54 * s, baseY - 78 * s, 24 * s, 24 * s)
    x.fillRect(cx0 + 30 * s, baseY - 78 * s, 24 * s, 24 * s)
    x.fillStyle = roof
    for (let i = 0; i < 5; i++) {
      x.beginPath()
      x.ellipse(cx0, baseY - 96 * s - i * 12 * s, (70 - i * 13) * s, 13 * s, 0, Math.PI, 0)
      x.fill()
    }
    x.fillStyle = '#ffcc2e'
    x.beginPath()
    x.arc(cx0, baseY - 96 * s - 5 * 12 * s, 6 * s, 0, 7)
    x.fill()
  }
  cottage(220, 640, 1.1, '#f2b8cf', '#e07a9c')
  cottage(620, 620, 0.9, '#a8d8f0', '#5a9ec9')
  cottage(1000, 645, 1.15, '#ffe9a0', '#e0a83c')
  cottage(1420, 618, 0.85, '#c9f0d0', '#5cb87c')
  cottage(1760, 640, 1.0, '#e0c0f8', '#9a6ac9')
  // lollipop trees
  for (const [lx, ly, lr, lc] of [[420, 600, 40, '#f26a8a'], [860, 590, 34, '#8fd460'], [1620, 596, 42, '#ffb84a']]) {
    x.fillStyle = '#8a6a48'
    x.fillRect(lx - 5, ly, 10, 60)
    x.fillStyle = lc
    x.beginPath()
    x.arc(lx, ly - 10, lr, 0, 7)
    x.fill()
    x.fillStyle = 'rgba(255,255,255,0.5)'
    x.beginPath()
    x.arc(lx - lr * 0.3, ly - 10 - lr * 0.3, lr * 0.2, 0, 7)
    x.fill()
  }
  // hatch mouths (dark ovals the munchkins pop from) + one barrel
  for (const [hx, hy] of [[520, 900], [840, 930], [1180, 908], [1480, 940], [320, 956], [1690, 916]]) {
    x.fillStyle = '#241a12'
    x.beginPath()
    x.ellipse(hx, hy, 44, 16, 0, 0, 7)
    x.fill()
    x.strokeStyle = '#8a6a48'
    x.lineWidth = 6
    x.beginPath()
    x.ellipse(hx, hy, 44, 16, 0, 0, 7)
    x.stroke()
  }
  x.fillStyle = '#8a6a48'
  x.fillRect(1345, 880, 66, 74)
  x.strokeStyle = '#5a4028'
  x.lineWidth = 5
  for (const by of [900, 928]) {
    x.beginPath()
    x.moveTo(1345, by)
    x.lineTo(1411, by)
    x.stroke()
  }
  x.fillStyle = '#a8845c'
  x.beginPath()
  x.ellipse(1378, 880, 33, 10, 0, 0, 7)
  x.fill()
  return c
}

// S4: the follicle road — a WIDE bake the film scrolls right-to-left; yellow brick
// road in perspective winding to the distant emerald skyline.
export function roadBake() {
  const SC = 900 // extra scroll width
  const c = canvas(W + OS * 2 + SC, H + OS * 2), x = c.getContext('2d')
  x.translate(OS, OS)
  const r = rng(411)
  const w2 = W + SC
  // sky
  const g = x.createLinearGradient(0, -OS, 0, 560)
  g.addColorStop(0, '#3e9df0')
  g.addColorStop(0.65, '#9fd4ff')
  g.addColorStop(1, '#e2f4ff')
  x.fillStyle = g
  x.fillRect(-OS, -OS, w2 + OS * 2, 570 + OS)
  for (let i = 0; i < 5; i++) {
    const cx0 = r() * w2, cy0 = 80 + r() * 160
    x.fillStyle = '#ffffff'
    for (const [dx, dy, cr] of [[0, 0, 42], [-46, 8, 30], [48, 10, 32]]) {
      x.beginPath()
      x.arc(cx0 + dx, cy0 + dy, cr, 0, 7)
      x.fill()
    }
  }
  // EMERALD SKYLINE on the horizon: spired towers + wall, glow halo
  const hx = w2 * 0.62
  const halo = x.createRadialGradient(hx, 430, 20, hx, 430, 560)
  halo.addColorStop(0, 'rgba(120,240,180,0.4)')
  halo.addColorStop(1, 'rgba(120,240,180,0)')
  x.fillStyle = halo
  x.fillRect(hx - 560, -60, 1120, 700)
  const tower = (tx, tw2, th2, spire) => {
    x.fillStyle = '#1f8a5c'
    x.fillRect(tx - tw2 / 2, 545 - th2, tw2, th2)
    x.fillStyle = '#58d194'
    x.fillRect(tx - tw2 / 2, 545 - th2, tw2 * 0.32, th2)
    if (spire) {
      x.fillStyle = '#2fae72'
      x.beginPath()
      x.moveTo(tx - tw2 / 2, 545 - th2)
      x.quadraticCurveTo(tx, 545 - th2 - spire * 1.5, tx + tw2 / 2, 545 - th2)
      x.closePath()
      x.fill()
      x.fillStyle = '#ffcc2e'
      x.beginPath()
      x.arc(tx, 545 - th2 - spire * 1.42, 5, 0, 7)
      x.fill()
    }
    x.fillStyle = '#0f6b44'
    for (let wy = 545 - th2 + 18; wy < 540; wy += 34) x.fillRect(tx - 6, wy, 12, 16)
  }
  tower(hx - 190, 56, 190, 70)
  tower(hx, 84, 290, 120)
  tower(hx + 170, 48, 150, 60)
  tower(hx + 90, 34, 110, 44)
  x.fillStyle = '#2fae72'
  x.fillRect(hx - 300, 528, 560, 20)
  // candy field bands
  x.fillStyle = '#8fd460'
  x.fillRect(-OS, 540, w2 + OS * 2, 60)
  x.fillStyle = '#6cc24e'
  x.fillRect(-OS, 596, w2 + OS * 2, 80)
  const fg = x.createLinearGradient(0, 660, 0, H + OS)
  fg.addColorStop(0, '#58c84c')
  fg.addColorStop(1, '#37923a')
  x.fillStyle = fg
  x.fillRect(-OS, 660, w2 + OS * 2, H + OS - 660)
  // mint + pink field patches
  x.fillStyle = 'rgba(140,226,190,0.5)'
  x.beginPath()
  x.ellipse(320, 760, 300, 90, 0, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(242,184,207,0.45)'
  x.beginPath()
  x.ellipse(1500, 820, 380, 110, 0, 0, 7)
  x.fill()
  // THE ROAD: winds from bottom-left up TO THE SKYLINE (hx above), perspective bricks
  const roadEdge = (u) => lerp(430, hx - 120, u * u * (3 - 2 * u)) + Math.sin(u * 4.4) * 80 * (1 - u)
  const roadY = (u) => 950 - u * 400
  const halfW = (u) => 34 + (1 - u) * 240
  // road bed
  x.fillStyle = '#d9a41e'
  x.beginPath()
  x.moveTo(roadEdge(0) - halfW(0), 950)
  for (let i = 0; i <= 40; i++) {
    const u = i / 40
    x.lineTo(roadEdge(u) - halfW(u), roadY(u))
  }
  for (let i = 40; i >= 0; i--) {
    const u = i / 40
    x.lineTo(roadEdge(u) + halfW(u), roadY(u))
  }
  x.closePath()
  x.fill()
  // brick rows shrinking with distance
  const rows = 30
  for (let i = 0; i < rows; i++) {
    const u = i / (rows - 1)
    const y = roadY(u)
    const y2 = roadY(u + 1 / rows) - 1
    const xe = roadEdge(u), hw = halfW(u)
    const n = Math.max(2, Math.round(5 + (1 - u) * 12))
    for (let k2 = 0; k2 < n; k2++) {
      const bx = xe - hw + ((k2 + (i % 2) * 0.5) / n) * hw * 2
      const bw = (hw * 2) / n - 3
      x.fillStyle = k2 % 2 ? '#f2c53c' : '#e8b52e'
      x.fillRect(bx, y2, bw, Math.max(2, y - y2 - 2))
    }
    x.fillStyle = 'rgba(160,110,20,0.5)'
    x.fillRect(xe - hw, y - 1, hw * 2, 1.4)
  }
  // lit edges
  x.strokeStyle = '#ffe27a'
  x.lineWidth = 6
  x.beginPath()
  for (let i = 0; i <= 40; i++) {
    const u = i / 40
    const px = roadEdge(u) - halfW(u), py = roadY(u)
    if (i === 0) x.moveTo(px, py)
    else x.lineTo(px, py)
  }
  x.stroke()
  x.beginPath()
  for (let i = 0; i <= 40; i++) {
    const u = i / 40
    const px = roadEdge(u) + halfW(u), py = roadY(u)
    if (i === 0) x.moveTo(px, py)
    else x.lineTo(px, py)
  }
  x.stroke()
  // lollipop trees + candy bushes flanking
  for (let i = 0; i < 14; i++) {
    const u = (i % 7) / 7
    const side = i < 7 ? -1 : 1
    const tx = roadEdge(u) + side * (halfW(u) + 90 + r() * 200)
    const ty = roadY(u) + 30
    const s = 0.5 + (1 - u) * 1.1
    x.fillStyle = '#8a6a48'
    x.fillRect(tx - 4 * s, ty - 90 * s, 8 * s, 90 * s)
    x.fillStyle = ['#f26a8a', '#8fd460', '#ffb84a', '#7db0d7'][i % 4]
    x.beginPath()
    x.arc(tx, ty - 100 * s, 34 * s, 0, 7)
    x.fill()
    x.fillStyle = 'rgba(255,255,255,0.5)'
    x.beginPath()
    x.arc(tx - 10 * s, ty - 110 * s, 7 * s, 0, 7)
    x.fill()
  }
  return c
}

// S5: rainbow poppy field, tilted; kind 'open' full cups vs 'buds' after the snow.
export function poppyBake(kind) {
  const [c, x] = bakeCanvas()
  const r = rng(555)
  // warm hazy sky
  const g = x.createLinearGradient(0, -OS, 0, 420)
  g.addColorStop(0, '#ffd9a0')
  g.addColorStop(1, '#ffefc9')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, 440 + OS)
  for (let i = 0; i < 5; i++) {
    x.fillStyle = 'rgba(255,255,255,0.5)'
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, 60 + r() * 160, 130 + r() * 120, 22 + r() * 14, 0, 0, 7)
    x.fill()
  }
  // 7 hue rows receding to the horizon — each band tinted toward its own hue
  const hues = ['#e04a3a', '#f28a3c', '#ffcc2e', '#8fd460', '#5ab8d8', '#b28ae0', '#f28ab8']
  const rowBase = [123, 143, 96] // leaf green to blend from
  for (let row = 0; row < 7; row++) {
    const u = row / 6
    const y0 = 400 + u * 580
    const rh = 580 / 7
    const hc = hexRgb(hues[row])
    const band = mix(rowBase, hc, 0.24)
    x.fillStyle = `rgb(${band[0]},${band[1]},${band[2]})`
    x.fillRect(-OS, y0, W + OS * 2, rh + 4)
    // flowers: filled cups on thick stems, growing with depth
    const n = 12 + row * 7
    for (let i = 0; i < n; i++) {
      const sx = -OS + r() * (W + OS * 2)
      const sy = y0 + 10 + r() * (rh - 6)
      const sh = 22 + u * 52
      const fr = 7 + u * 13
      x.strokeStyle = 'rgba(52,96,40,0.9)'
      x.lineWidth = 2.4 + u * 3
      x.beginPath()
      x.moveTo(sx, sy)
      x.quadraticCurveTo(sx + 5, sy - sh * 0.5, sx, sy - sh)
      x.stroke()
      x.fillStyle = hues[row]
      x.beginPath()
      x.ellipse(sx, sy - sh - fr * 0.4, fr, fr * 0.82, 0, 0, 7)
      x.fill()
      x.fillStyle = shadeHex(hues[row], 0.78)
      x.beginPath()
      x.ellipse(sx + fr * 0.34, sy - sh - fr * 0.3, fr * 0.4, fr * 0.34, 0.4, 0, 7)
      x.fill()
      x.fillStyle = '#2a1a10'
      x.beginPath()
      x.ellipse(sx, sy - sh - fr * 0.4, fr * 0.3, fr * 0.26, 0, 0, 7)
      x.fill()
    }
    // soft haze band between rows (no hard seams)
    x.fillStyle = `rgba(255,240,206,${0.2 - u * 0.15})`
    x.fillRect(-OS, y0 - 5, W + OS * 2, 10)
  }
  return c
}

// S6: the emerald gate — green wall, art-deco doors, comb bell-pull, the painted
// BELL OUT OF ORDER sign (diegetic text lives here, not in captions).
export function gateBake() {
  const [c, x] = bakeCanvas()
  // sky
  const g = x.createLinearGradient(0, -OS, 0, 520)
  g.addColorStop(0, '#3e9df0')
  g.addColorStop(1, '#bce6ff')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, 540 + OS)
  // emerald wall
  const wg = x.createLinearGradient(0, 160, 0, 980)
  wg.addColorStop(0, '#2fae72')
  wg.addColorStop(1, '#0f6b44')
  x.fillStyle = wg
  x.fillRect(-OS, 220, W + OS * 2, 780)
  // wall bevels + glints
  x.fillStyle = 'rgba(120,240,180,0.24)'
  for (let px = -OS; px < W + OS; px += 180) x.fillRect(px, 220, 60, 780)
  x.fillStyle = 'rgba(6,52,34,0.5)'
  for (let px = -OS + 120; px < W + OS; px += 180) x.fillRect(px, 220, 30, 780)
  // crenellation
  x.fillStyle = '#58d194'
  for (let px = -OS; px < W + OS; px += 90) x.fillRect(px, 190, 52, 34)
  // doors (centre opening, halves slide apart at runtime — bake them shut with a seam)
  x.fillStyle = '#12603e'
  x.fillRect(660, 320, 600, 660)
  x.fillStyle = '#1f8a5c'
  x.fillRect(668, 328, 584, 652)
  x.strokeStyle = '#0a4a2e'
  x.lineWidth = 8
  x.beginPath()
  x.moveTo(960, 328)
  x.lineTo(960, 980)
  x.stroke()
  // deco arch over the doors
  x.strokeStyle = '#ffcc2e'
  x.lineWidth = 10
  x.beginPath()
  x.moveTo(640, 330)
  x.quadraticCurveTo(960, 150, 1280, 330)
  x.stroke()
  // guard peek slot (eyelid slit) in the left door
  x.fillStyle = '#062e1e'
  x.fillRect(770, 520, 130, 34)
  // painted sign board on chains
  x.strokeStyle = '#0a4a2e'
  x.lineWidth = 6
  for (const chx of [810, 1110]) {
    x.beginPath()
    x.moveTo(chx, 160)
    x.lineTo(chx, 208)
    x.stroke()
  }
  x.fillStyle = '#f5eee0'
  x.fillRect(700, 205, 520, 64)
  x.strokeStyle = '#ffcc2e'
  x.lineWidth = 6
  x.strokeRect(700, 205, 520, 64)
  x.fillStyle = '#1a4a30'
  x.font = '700 30px Anton'
  x.textAlign = 'center'
  x.fillText('BELL OUT OF ORDER — PLEASE KNOCK', 960, 248)
  x.textAlign = 'left'
  // ground
  const gg = x.createLinearGradient(0, 960, 0, H + OS)
  gg.addColorStop(0, '#0f6b44')
  gg.addColorStop(1, '#0a4a2e')
  x.fillStyle = gg
  x.fillRect(-OS, 960, W + OS * 2, H + OS - 960)
  x.fillStyle = 'rgba(255,226,122,0.2)'
  x.fillRect(-OS, 960, W + OS * 2, 6)
  return c
}

// S6/S9: the throne hall — columns, arched wall, floor, pylon plinths; the GIANT
// HEAD and flames are painted live.
export function throneBake() {
  const [c, x] = bakeCanvas()
  const r = rng(1264)
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#04140c')
  g.addColorStop(0.6, '#0a2e1c')
  g.addColorStop(1, '#06180e')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // arched back wall
  x.fillStyle = '#0d3a24'
  x.beginPath()
  x.moveTo(400, 1000)
  x.lineTo(400, 320)
  x.quadraticCurveTo(960, 40, 1520, 320)
  x.lineTo(1520, 1000)
  x.closePath()
  x.fill()
  x.strokeStyle = '#1f8a5c'
  x.lineWidth = 6
  x.stroke()
  // columns
  for (const cx0 of [220, 560, 1360, 1700]) {
    const cg = x.createLinearGradient(cx0 - 44, 0, cx0 + 44, 0)
    cg.addColorStop(0, '#0a2e1c')
    cg.addColorStop(0.4, '#1f8a5c')
    cg.addColorStop(1, '#06180e')
    x.fillStyle = cg
    x.fillRect(cx0 - 44, -OS, 88, 1010)
    x.fillStyle = '#2fae72'
    x.fillRect(cx0 - 58, 200, 116, 26)
    x.fillRect(cx0 - 58, 950, 116, 26)
  }
  // floor with perspective seams
  const fg = x.createLinearGradient(0, 820, 0, H + OS)
  fg.addColorStop(0, '#0a2e1c')
  fg.addColorStop(1, '#030d08')
  x.fillStyle = fg
  x.fillRect(-OS, 860, W + OS * 2, H + OS - 860)
  x.strokeStyle = 'rgba(46,174,114,0.24)'
  x.lineWidth = 3
  for (let i = -6; i <= 6; i++) {
    x.beginPath()
    x.moveTo(960 + i * 90, 862)
    x.lineTo(960 + i * 420, H + OS)
    x.stroke()
  }
  for (const fy of [900, 960, 1040]) {
    x.beginPath()
    x.moveTo(-OS, fy)
    x.lineTo(W + OS, fy)
    x.stroke()
  }
  // throne steps + dais centre
  for (let i = 0; i < 3; i++) {
    x.fillStyle = i % 2 ? '#0f5236' : '#12603e'
    x.fillRect(700 - i * 40, 940 + i * 26, 520 + i * 80, 26)
  }
  // fire pylon plinths (flames live)
  for (const px of [560, 1360]) {
    x.fillStyle = '#0a4a2e'
    x.fillRect(px - 46, 640, 92, 220)
    x.fillStyle = '#12603e'
    x.fillRect(px - 58, 620, 116, 30)
    x.fillStyle = '#1a0c06'
    x.fillRect(px - 30, 560, 60, 66)
  }
  // seeded ember motes baked into the walls
  for (let i = 0; i < 60; i++) {
    x.fillStyle = `rgba(255,154,60,${0.1 + r() * 0.2})`
    x.fillRect(r() * (W + OS * 2) - OS, r() * 900, 2.4, 2.4)
  }
  return c
}

// S7: haunted forest edge + witch castle battlements (first half of the shot).
export function forestBake() {
  const [c, x] = bakeCanvas()
  const r = rng(616)
  const g = x.createLinearGradient(0, -OS, 0, 500)
  g.addColorStop(0, '#1a2438')
  g.addColorStop(0.7, '#2e3a50')
  g.addColorStop(1, '#4a5068')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, 520 + OS)
  // castle battlements on the horizon
  x.fillStyle = '#232c40'
  x.fillRect(1050, 200, 700, 320)
  x.fillStyle = '#2c364e'
  for (let px = 1050; px < 1750; px += 70) x.fillRect(px, 170, 44, 34)
  x.beginPath()
  x.moveTo(1560, 200)
  x.lineTo(1620, 40)
  x.lineTo(1680, 200)
  x.closePath()
  x.fill()
  x.fillStyle = '#ffd98a'
  for (const [wx, wy] of [[1180, 280], [1400, 260], [1600, 300]]) x.fillRect(wx, wy, 26, 40)
  // twisted trees flanking a clearing
  const tree = (tx, ty, s, flip) => {
    x.save()
    x.translate(tx, ty)
    x.scale(flip * s, s)
    x.strokeStyle = '#1c1420'
    x.lineWidth = 26
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(0, 0)
    x.quadraticCurveTo(-20, -160, 10, -300)
    x.stroke()
    x.lineWidth = 12
    for (const [bx, by, cx2, cy2] of [[6, -240, 120, -320], [-8, -180, -140, -260], [4, -110, 110, -160]]) {
      x.beginPath()
      x.moveTo(bx, by)
      x.quadraticCurveTo(cx2 * 0.6, cy2 * 0.7, cx2, cy2)
      x.stroke()
    }
    x.restore()
  }
  for (let i = 0; i < 6; i++) tree(-80 + i * 120 + r() * 40, 560 + r() * 30, 0.8 + r() * 0.5, i % 2 ? 1 : -1)
  tree(1880, 600, 1.2, -1)
  tree(1790, 580, 0.8, 1)
  // ground
  const gg = x.createLinearGradient(0, 540, 0, H + OS)
  gg.addColorStop(0, '#243040')
  gg.addColorStop(1, '#101822')
  x.fillStyle = gg
  x.fillRect(-OS, 540, W + OS * 2, H + OS - 540)
  // gnarled roots + rocks
  for (let i = 0; i < 26; i++) {
    x.fillStyle = `rgba(10,14,20,${0.3 + r() * 0.3})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, 600 + r() * 420, 30 + r() * 70, 8 + r() * 14, r(), 0, 7)
    x.fill()
  }
  return c
}

// S7: tower room — stone interior, barred window, table for the hourglass.
export function towerRoomBake() {
  const [c, x] = bakeCanvas()
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#1c1a26')
  g.addColorStop(1, '#100e18')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // stone blocks
  x.strokeStyle = 'rgba(60,56,80,0.5)'
  x.lineWidth = 4
  for (let wy = 40; wy < 860; wy += 80) {
    x.beginPath()
    x.moveTo(-OS, wy)
    x.lineTo(W + OS, wy)
    x.stroke()
  }
  for (let px = -OS; px < W + OS; px += 160) {
    x.beginPath()
    x.moveTo(px + (((px / 160) | 0) % 2) * 80, 0)
    x.lineTo(px + (((px / 160) | 0) % 2) * 80, 860)
    x.stroke()
  }
  // floor
  x.fillStyle = '#141220'
  x.fillRect(-OS, 860, W + OS * 2, H + OS - 860)
  // barred window (moonlight painted live through it)
  x.fillStyle = '#0a0812'
  x.fillRect(1330, 260, 240, 300)
  x.strokeStyle = '#2c2838'
  x.lineWidth = 10
  for (let i = 0; i < 4; i++) {
    x.beginPath()
    x.moveTo(1360 + i * 60, 260)
    x.lineTo(1360 + i * 60, 560)
    x.stroke()
  }
  // hero's cell bars (left)
  x.fillStyle = '#06040a'
  x.fillRect(60, 220, 420, 640)
  x.strokeStyle = '#3a3448'
  x.lineWidth = 14
  for (let i = 0; i < 5; i++) {
    x.beginPath()
    x.moveTo(110 + i * 80, 220)
    x.lineTo(110 + i * 80, 860)
    x.stroke()
  }
  x.beginPath()
  x.moveTo(60, 220)
  x.lineTo(480, 220)
  x.moveTo(60, 860)
  x.lineTo(480, 860)
  x.lineWidth = 18
  x.stroke()
  // hourglass table (right)
  x.fillStyle = '#2c2418'
  x.fillRect(1560, 700, 260, 30)
  x.fillStyle = '#1c160e'
  x.fillRect(1590, 730, 30, 130)
  x.fillRect(1760, 730, 30, 130)
  return c
}

// S8: castle courtyard — walls, arch door, cauldron plinths (bubbles live).
export function courtyardBake() {
  const [c, x] = bakeCanvas()
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#241c30')
  g.addColorStop(1, '#141020')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // sky sliver above the wall
  x.fillStyle = '#101826'
  x.fillRect(-OS, -OS, W + OS * 2, 300 + OS)
  // curtain wall
  x.fillStyle = '#2c2438'
  x.fillRect(-OS, 300, W + OS * 2, 460)
  x.strokeStyle = 'rgba(70,60,90,0.6)'
  x.lineWidth = 5
  for (let wy = 340; wy < 760; wy += 78) {
    x.beginPath()
    x.moveTo(-OS, wy)
    x.lineTo(W + OS, wy)
    x.stroke()
  }
  for (let px = -OS; px < W + OS; px += 190) {
    x.beginPath()
    x.moveTo(px, 300)
    x.lineTo(px, 760)
    x.stroke()
  }
  x.fillStyle = '#1c1626'
  for (let px = -OS; px < W + OS; px += 96) x.fillRect(px, 262, 54, 40)
  // arch door (tower entrance) centre-right
  x.fillStyle = '#0a0612'
  x.beginPath()
  x.moveTo(1420, 760)
  x.lineTo(1420, 480)
  x.quadraticCurveTo(1540, 380, 1660, 480)
  x.lineTo(1660, 760)
  x.closePath()
  x.fill()
  x.strokeStyle = '#4a3e5c'
  x.lineWidth = 10
  x.stroke()
  // ground
  x.fillStyle = '#1a1424'
  x.fillRect(-OS, 760, W + OS * 2, H + OS - 760)
  x.strokeStyle = 'rgba(60,50,80,0.5)'
  for (let px = -OS; px < W + OS; px += 130) {
    x.beginPath()
    x.moveTo(px, 762)
    x.lineTo(px - 50, H + OS)
    x.stroke()
  }
  // cauldron plinths
  for (const px of [420, 700]) {
    x.fillStyle = '#241c30'
    x.fillRect(px - 60, 820, 120, 60)
  }
  return c
}

// S10: sepia farm bedroom — bed, quilt, window, dresser; family stands stage-left.
export function bedroomBake() {
  const [c, x] = bakeCanvas()
  const r = rng(1004)
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#9a8c74')
  g.addColorStop(1, '#7a6c56')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // wallpaper fleur speckle
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(122,108,86,${0.3 + r() * 0.3})`
    x.beginPath()
    x.arc(r() * (W + OS * 2) - OS, r() * 800, 3 + r() * 5, 0, 7)
    x.fill()
  }
  // window (left) with farm light
  x.fillStyle = '#4e4234'
  x.fillRect(150, 220, 300, 360)
  x.fillStyle = '#c9bd9c'
  x.fillRect(170, 240, 260, 320)
  x.strokeStyle = '#4e4234'
  x.lineWidth = 12
  x.beginPath()
  x.moveTo(300, 240)
  x.lineTo(300, 560)
  x.moveTo(170, 400)
  x.lineTo(430, 400)
  x.stroke()
  // dresser right
  x.fillStyle = '#5e5140'
  x.fillRect(1560, 560, 260, 300)
  x.fillStyle = '#c9b45a'
  for (const dy of [620, 700, 780]) {
    x.fillRect(1590, dy, 200, 8)
    x.beginPath()
    x.arc(1690, dy + 28, 8, 0, 7)
    x.fill()
  }
  // floor
  x.fillStyle = '#6e5c46'
  x.fillRect(-OS, 860, W + OS * 2, H + OS - 860)
  x.strokeStyle = 'rgba(40,32,22,0.5)'
  x.lineWidth = 4
  for (let px = -OS; px < W + OS; px += 120) {
    x.beginPath()
    x.moveTo(px, 862)
    x.lineTo(px - 70, H + OS)
    x.stroke()
  }
  // bed centre-right: frame + headboard (quilt painted live over the occupant)
  x.fillStyle = '#5e5140'
  x.fillRect(900, 640, 560, 34) // headboard top rail
  x.fillRect(900, 640, 30, 260)
  x.fillRect(1430, 640, 30, 260)
  x.fillStyle = '#6e5f48'
  x.fillRect(934, 800, 492, 120) // bed base shadow side
  x.fillStyle = '#9a8a68'
  x.fillRect(934, 780, 492, 40) // mattress
  return c
}

// S10: FLOZ meadow (color head of the shot). The drain reveals the bedroom bake.
export function meadowBake() {
  const [c, x] = bakeCanvas()
  const r = rng(1010)
  const g = x.createLinearGradient(0, -OS, 0, 560)
  g.addColorStop(0, '#3e9df0')
  g.addColorStop(0.7, '#9fd4ff')
  g.addColorStop(1, '#e2f4ff')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, 580 + OS)
  for (let i = 0; i < 6; i++) {
    const cx0 = r() * (W + OS * 2) - OS, cy0 = 80 + r() * 180
    x.fillStyle = '#ffffff'
    for (const [dx, dy, cr] of [[0, 0, 44], [-50, 10, 32], [50, 12, 34]]) {
      x.beginPath()
      x.arc(cx0 + dx, cy0 + dy, cr, 0, 7)
      x.fill()
    }
  }
  // distant emerald spire (home is always visible in FLOZ)
  x.fillStyle = 'rgba(88,209,148,0.7)'
  x.beginPath()
  x.moveTo(1740, 560)
  x.lineTo(1790, 300)
  x.lineTo(1840, 560)
  x.closePath()
  x.fill()
  // rolling hills + meadow
  x.fillStyle = '#7ed07c'
  x.beginPath()
  x.moveTo(-OS, 560)
  for (let px = -OS; px <= W + OS; px += 40) x.lineTo(px, 520 + Math.sin(px * 0.005) * 40)
  x.lineTo(W + OS, 720)
  x.lineTo(-OS, 720)
  x.closePath()
  x.fill()
  const gg = x.createLinearGradient(0, 640, 0, H + OS)
  gg.addColorStop(0, '#58c84c')
  gg.addColorStop(1, '#37923a')
  x.fillStyle = gg
  x.fillRect(-OS, 640, W + OS * 2, H + OS - 640)
  for (let i = 0; i < 150; i++) {
    const fx = r() * (W + OS * 2) - OS, fy = 660 + r() * (H - 500)
    x.fillStyle = ['#ff8a8a', '#ffcc2e', '#f2b8cf', '#ffffff', '#8fd460'][i % 5]
    x.beginPath()
    x.arc(fx, fy, 3 + r() * 4, 0, 7)
    x.fill()
  }
  return c
}

// S7: SURRENDER FLOWTO skywriting canvas (revealed by column clip at draw time).
export function skywriteBake() {
  const c = canvas(1300, 170), x = c.getContext('2d')
  x.font = '700 96px Anton'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  // smoky double-draw: wide soft pass + tight bright pass
  x.fillStyle = 'rgba(190,198,206,0.34)'
  for (let i = 0; i < 5; i++) x.fillText('SURRENDER FLOWTO', 650 + (hash(i * 7) - 0.5) * 7, 85 + (hash(i * 3) - 0.5) * 7)
  x.fillStyle = 'rgba(226,232,238,0.9)'
  x.fillText('SURRENDER FLOWTO', 650, 85)
  x.textAlign = 'left'
  x.textBaseline = 'alphabetic'
  return c
}

// S6/S9: THE GIANT BALD HEAD OF FLOZ — heads cell of 1264 at k=14 (192-256 spec),
// ember rim light + fire glow halo baked; live flame + arcs ride on top.
export function giantHeadBake(atlas) {
  const k = 14
  const base = headIcon(atlas, 1264, k) // 224x224 chunky pixels, cell (928,288)
  const S2 = 300
  const c = canvas(S2, S2), x = c.getContext('2d')
  // glow halo (2 layers)
  const g1 = x.createRadialGradient(S2 / 2, S2 / 2, 60, S2 / 2, S2 / 2, 150)
  g1.addColorStop(0, 'rgba(255,106,30,0.30)')
  g1.addColorStop(1, 'rgba(255,106,30,0)')
  x.fillStyle = g1
  x.fillRect(0, 0, S2, S2)
  const g2 = x.createRadialGradient(S2 / 2, S2 / 2, 30, S2 / 2, S2 / 2, 110)
  g2.addColorStop(0, 'rgba(255,194,60,0.18)')
  g2.addColorStop(1, 'rgba(255,194,60,0)')
  x.fillStyle = g2
  x.fillRect(0, 0, S2, S2)
  x.imageSmoothingEnabled = false
  x.drawImage(base, (S2 - 224) / 2, (S2 - 224) / 2)
  // ember rim light on crown-edge pixels (up-facing alpha edges)
  const d = x.getImageData(0, 0, S2, S2), p = d.data
  const at = (xx, y) => (xx < 0 || xx >= S2 || y < 0 || y >= S2 ? 0 : p[(y * S2 + xx) * 4 + 3])
  for (let y = 0; y < S2; y++)
    for (let xx = 0; xx < S2; xx++) {
      const i = (y * S2 + xx) * 4
      if (p[i + 3] < 8) continue
      // only the head pixels (inside the 224 box), only crown edges
      if (xx < 38 || xx > 262 || y < 38 || y > 262) continue
      if (!(at(xx, y - 2) < 8 || at(xx - 2, y) < 8)) continue
      p[i] = Math.round(p[i] * 0.55 + 255 * 0.45)
      p[i + 1] = Math.round(p[i + 1] * 0.55 + 154 * 0.45)
      p[i + 2] = Math.round(p[i + 2] * 0.55 + 60 * 0.45)
    }
  x.putImageData(d, 0, 0)
  return c
}

// S6: HORSE OF A DIFFERENT COLOR — four baked hue variants, cycled on 0.8 s beats;
// the driver's necktie rides the PREVIOUS variant (film.js passes that palette).
export const HORSE_PALS = [
  { body: '#b26bea', mane: '#7a3ba8', hoof: '#4a2470', tie: '#f2b8cf' },
  { body: '#f28ac2', mane: '#c2538e', hoof: '#7c3058', tie: '#8fd460' },
  { body: '#3fc0a8', mane: '#1f8a76', hoof: '#0f5044', tie: '#ffcc2e' },
  { body: '#ffc23c', mane: '#d18a10', hoof: '#8a5a06', tie: '#b26bea' },
]
export function horseBake(pal) {
  const c = canvas(360, 240), x = c.getContext('2d')
  // body raised so the live leg strokes show underneath
  x.fillStyle = pal.body
  x.beginPath()
  x.ellipse(170, 118, 108, 54, 0, 0, 7)
  x.fill()
  // thick arched neck + big head + ears + muzzle
  x.beginPath()
  x.moveTo(232, 96)
  x.quadraticCurveTo(276, 76, 292, 34)
  x.lineTo(318, 26)
  x.quadraticCurveTo(338, 22, 342, 40)
  x.lineTo(336, 62)
  x.quadraticCurveTo(324, 108, 282, 132)
  x.closePath()
  x.fill()
  x.fillStyle = shadeHex(pal.body, 0.82)
  x.beginPath()
  x.ellipse(344, 44, 15, 11, 0.5, 0, 7)
  x.fill()
  x.fillStyle = pal.body
  x.beginPath()
  x.moveTo(300, 22)
  x.lineTo(306, 2)
  x.lineTo(316, 20)
  x.closePath()
  x.fill()
  x.beginPath()
  x.moveTo(318, 18)
  x.lineTo(326, 0)
  x.lineTo(332, 18)
  x.closePath()
  x.fill()
  x.fillStyle = '#1a1228'
  x.beginPath()
  x.arc(326, 38, 3.6, 0, 7)
  x.fill()
  // mane + tail
  x.strokeStyle = pal.mane
  x.lineWidth = 14
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(292, 40)
  x.quadraticCurveTo(272, 74, 264, 108)
  x.stroke()
  x.beginPath()
  x.moveTo(68, 100)
  x.quadraticCurveTo(32, 122, 42, 170)
  x.stroke()
  // harness strap + plume
  x.strokeStyle = '#ffcc2e'
  x.lineWidth = 6
  x.beginPath()
  x.moveTo(86, 86)
  x.quadraticCurveTo(176, 60, 262, 84)
  x.stroke()
  x.fillStyle = pal.tie
  x.beginPath()
  x.ellipse(310, 6, 7, 12, 0.3, 0, 7)
  x.fill()
  return c
}
