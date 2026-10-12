// PIRATES OF THE CABALD art: rig prep (blade strip, sliver cleanup, ghoul duotone,
// costume repaints) + prepare-time bakes (two brigs, deck, cave, dock) + pure
// per-frame painters (night/day sea, moon, moonbeam scanner, tricorns, cutlasses,
// chest, kraken, parrot). Full-res painted stage, sprites 2.4-3.2x nearest.
// Everything deterministic: hash/rng only, every painter a pure function of t.
import { hash, rng } from 'filmkit/lib.js'
import { canvas, flag as flagPennant } from '../remy-bros/art.js'

const W = 1920, H = 1080
export const SHIP_NAME = { hero: 'BLACK FLOW', villain: "RAZOR'S EDGE" }
export const OS = 280 // overscan painted around the stage so camera moves never expose edges

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// ============================== rig prep ==============================

// Solid-colour silhouette from a rig, keeping the pose rig (rim copies, night masses).
export function tint(R, color) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, R.w, R.h)
  return { ...R, c }
}

// Strip the greatsword baked into a near sprite (42 and 48 share the geometry:
// blade hugs the viewer-left edge, yellow pommel at the waist). Verified pattern
// from films/hairtanic — per scanline drop the detached left-edge run, then clear
// the left 23 columns of blade-family colour (blue-grey blade / yellow guard).
export function stripBlade(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const a = (xx, y) => (xx < 0 || xx >= R.w ? 0 : p[(y * R.w + xx) * 4 + 3])
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
  // pass 3: the blade crosses the body diagonally (tip up-left, guard at the waist,
  // lower blade to the feet) with no transparent gap — sweep the light blade family
  // and yellow guard inside the left 36 columns below the face; the dark warm coat
  // (b < 80) and the warm trousers survive
  for (let y = 40; y < R.h; y++)
    for (let xx = 0; xx < 36; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] === 0) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if ((b >= r + 8 && b > 80) || (g > 150 && b < 90 && r > 140)) p[i + 3] = 0
    }
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

function whiteSil(c, w, h) {
  const s = canvas(w, h), x = s.getContext('2d')
  x.drawImage(c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = '#fff'
  x.fillRect(0, 0, w, h)
  return s
}

// Keep only the largest 4-connected alpha component (the body) — drops detached
// bake artefacts like Elizabeth 12's floating tan slab at bbox (40,1)-(74,39)
// without hard-cutting hair that genuinely touches the head.
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

// Leather baldric (shoulder-to-hip strap + buckle) baked over the chest — covers
// the low-contrast cursive print that mirrors on flip. Sprite torso spans roughly
// y top+44..top+85 (the face is above top+40), so the strap rides shoulder->hip.
export function baldric(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const y0 = R.top + 62, y1 = Math.min(R.h - 8, R.top + 96)
  const strap = (col, w) => {
    x.strokeStyle = col
    x.lineWidth = w
    x.lineCap = 'butt'
    x.beginPath()
    x.moveTo(R.cx + 16, y0)
    x.lineTo(R.cx - 13, y1)
    x.stroke()
  }
  strap('#151009', 5)
  strap('#3a2a18', 3)
  x.fillStyle = '#ffcc2e'
  x.fillRect(R.cx - 15, y1 - 4, 5, 4)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Elizabeth 12: remap the royal-blue dress family to her ivory/cream ramp, then a
// royal sash at the waist so the silhouette keeps its regality (casting note).
export function ivoryDress(R, refs = { cloth: [[0, 32, 112], [0, 16, 96], [0, 48, 144]] }) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const light = hexRgb('#f2e8cc'), dark = hexRgb('#cdbd94'), ink = hexRgb('#8a7a52')
  for (let i = 0; i < R.w * R.h; i++) {
    if (p[i * 4 + 3] < 8) continue
    const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2]
    if (b <= r + 20 || b < 60) continue // blues only: b dominant, cool
    const L = (r + g + b) / 765
    const col = L < 0.22 ? ink : mix(dark, light, clamp01((L - 0.1) / 0.4))
    p[i * 4] = col[0]; p[i * 4 + 1] = col[1]; p[i * 4 + 2] = col[2]
  }
  x.putImageData(d, 0, 0)
  // sash: royal band across the dress (the dress body starts ~y top+69 on this
  // sprite; the face is well above), with a coin buckle
  const sy = R.top + 86
  x.save()
  x.translate(R.cx, sy)
  x.rotate(-0.14)
  x.fillStyle = '#062465'
  x.fillRect(-23, -4, 46, 8)
  x.fillStyle = 'rgba(10,40,120,0.8)'
  x.fillRect(-23, 2, 46, 2)
  x.fillStyle = '#ffcc2e'
  x.fillRect(-3, -3, 6, 6)
  x.restore()
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Ghoul duotone from the timeline GHOUL table + casting.md: zone-classify each pixel
// against the id's palette refs, remap skin->BONE ramp / cloth->CLOTH ramp by
// luminance, accents to the cold mid; keep dark outlines; stamp the #bfe9ff eye
// glow on the darkest face pixels per side; rim-light the dome crown.
export function ghoulize(R, pal) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const bone = [hexRgb(pal.bone[1]), hexRgb(pal.bone[0])]
  const cloth = [hexRgb(pal.cloth[1]), hexRgb(pal.cloth[0])]
  const cold = hexRgb(pal.accent)
  const warm = hexRgb('#c2521e')
  const boneBleach = hexRgb('#efead8')
  const refs = pal.refs.map(([hex, zone]) => ({ rgb: hexRgb(hex), zone }))
  for (let i = 0; i < R.w * R.h; i++) {
    const a = p[i * 4 + 3]
    if (a < 8) continue
    const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2]
    const L = (r + g + b) / 765
    if (L < 0.16) continue // true outlines stay ink
    // true gold (pommels, coins, trim) survives regardless of zone — tested as a
    // predicate, and only for rigs that actually carry gold props (5's whole shirt
    // is coin-coloured, so he opts out)
    if (pal.keepGold !== false && r > 235 && g > 170 && b < 90) continue
    // nearest palette ref decides the zone
    let zone = 'accent', bd = 1e9
    for (const f of refs) {
      const dd = (r - f.rgb[0]) ** 2 + (g - f.rgb[1]) ** 2 + (b - f.rgb[2]) ** 2
      if (dd < bd) { bd = dd; zone = f.zone }
    }
    let col
    if (pal.hairBleach && zone === 'hair') col = mix(bone[0], boneBleach, 0.8)
    else if (zone === 'flame') col = mix(cold, warm, 0.45)
    else if (zone === 'blade') col = hexRgb('#9fb4cf')
    else if (zone === 'skin') col = mix(bone[0], bone[1], clamp01((L - 0.15) / 0.55))
    else if (zone === 'cloth') col = mix(cloth[0], cloth[1], clamp01((L - 0.1) / 0.6))
    else col = cold
    p[i * 4] = col[0]; p[i * 4 + 1] = col[1]; p[i * 4 + 2] = col[2]
  }
  // skeletal eyes: mute white pupil shines in the face band, then stamp a 4px
  // diamond of cold fire on each pupil (search below the brow line)
  for (let y = R.top + 8; y < R.top + 30; y++)
    for (let xx = Math.max(0, R.cx - 22); xx < Math.min(R.w, R.cx + 22); xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const l = (p[i] + p[i + 1] + p[i + 2]) / 765
      if (l > 0.72 && p[i + 2] >= p[i] - 20) {
        p[i] = Math.round(p[i] * 0.3 + 30 * 0.7)
        p[i + 1] = Math.round(p[i + 1] * 0.3 + 40 * 0.7)
        p[i + 2] = Math.round(p[i + 2] * 0.3 + 66 * 0.7)
      }
    }
  const eyeAt = (xa, xb) => {
    let bi = -1, bl = 1e9, bx = 0, by = 0
    for (let y = R.top + 12; y < R.top + 26; y++)
      for (let xx = xa; xx < xb; xx++) {
        const i = (y * R.w + xx) * 4
        if (p[i + 3] < 8) continue
        const l = p[i] + p[i + 1] + p[i + 2]
        if (l < bl) { bl = l; bi = i; bx = xx; by = y }
      }
    if (bi < 0 || bl > 330) return
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [0, 2]]) {
      const j = ((by + dy) * R.w + (bx + dx)) * 4
      if (p[j + 3] > 0) { p[j] = 0xbf; p[j + 1] = 0xe9; p[j + 2] = 0xff }
    }
  }
  eyeAt(Math.max(0, R.cx - 24), R.cx - 2)
  eyeAt(R.cx + 2, Math.min(R.w, R.cx + 24))
  // dome rim: crown-edge skin pixels catch the moon at 25%
  const rim = hexRgb('#e6f2ff')
  for (let y = R.top; y < R.top + 16; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const up = y === 0 || p[((y - 1) * R.w + xx) * 4 + 3] < 8
      if (!up) continue
      p[i] = Math.round(p[i] * 0.75 + rim[0] * 0.25)
      p[i + 1] = Math.round(p[i + 1] * 0.75 + rim[1] * 0.25)
      p[i + 2] = Math.round(p[i + 2] * 0.75 + rim[2] * 0.25)
    }
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Zone refs per Cabald id — casting.md palettes; 'flame' keeps 347's hem warm,
// 'hair' is 382's side-tufts (bleach to bone), 'gold' survives everywhere.
export const GHOUL_REFS = {
  347: { refs: [['#a07e63', 'skin'], ['#0b0d0f', 'cloth'], ['#2a1c2f', 'accent'], ['#b03a1e', 'flame'], ['#e07830', 'flame'], ['#481010', 'flame']], hairBleach: false },
  48: { refs: [['#685240', 'skin'], ['#f8e5e5', 'cloth'], ['#413d30', 'accent'], ['#8ea6bd', 'blade'], ['#aebfd4', 'blade']], hairBleach: false },
  382: { refs: [['#c0aa98', 'skin'], ['#f8e6e3', 'cloth'], ['#806b52', 'accent'], ['#e0b050', 'hair'], ['#f0e080', 'hair']], hairBleach: true },
  233: { refs: [['#d0bdb2', 'skin'], ['#b26bea', 'cloth'], ['#272425', 'accent'], ['#f0f0f0', 'cloth']], hairBleach: false },
  5: { refs: [['#a07e63', 'skin'], ['#dccc5e', 'cloth'], ['#c2beb8', 'accent']], hairBleach: false, keepGold: false },
  834: { refs: [['#c0aa98', 'skin'], ['#d5d5d5', 'cloth'], ['#3c7281', 'accent'], ['#50a0f0', 'hair']], hairBleach: false },
  129: { refs: [['#685240', 'skin'], ['#0a0a0a', 'cloth'], ['#ececec', 'accent']], hairBleach: false },
  1217: { refs: [['#a07e63', 'skin'], ['#dad6d3', 'cloth'], ['#7288b0', 'accent'], ['#50a0e0', 'hair']], hairBleach: false },
}

// ============================== prop & character painters ==============================

// Tricorn: charcoal brim with two upturned points, dome crown, gold trim, optional
// feather. Drawn over a sprite head; (cx, cy) is the crown centre, s ~ sy*1.15.
export function tricorn(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? 0)
  x.scale(s, s)
  if (o.feather) {
    x.save()
    x.rotate(-0.5)
    x.strokeStyle = o.feather
    x.lineWidth = 6
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(-8, 2)
    x.quadraticCurveTo(-40, -28, -58, -64)
    x.stroke()
    x.strokeStyle = 'rgba(255,255,255,0.25)'
    x.lineWidth = 2
    x.beginPath()
    x.moveTo(-14, -2)
    x.quadraticCurveTo(-38, -26, -52, -56)
    x.stroke()
    x.restore()
  }
  // brim: swooping band with kicked ends
  x.fillStyle = o.col ?? '#23262e'
  x.beginPath()
  x.moveTo(-64, 6)
  x.quadraticCurveTo(-58, -14, -34, -12)
  x.quadraticCurveTo(0, -6, 34, -12)
  x.quadraticCurveTo(58, -14, 64, 6)
  x.quadraticCurveTo(30, 16, 0, 14)
  x.quadraticCurveTo(-30, 16, -64, 6)
  x.closePath()
  x.fill()
  // crown dome
  x.fillStyle = o.col2 ?? '#2e323c'
  x.beginPath()
  x.moveTo(-30, -6)
  x.quadraticCurveTo(-26, -34, 0, -36)
  x.quadraticCurveTo(26, -34, 30, -6)
  x.quadraticCurveTo(0, -14, -30, -6)
  x.closePath()
  x.fill()
  // gold trim along the brim edge
  x.strokeStyle = o.trim ?? '#ffcc2e'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(-60, 4)
  x.quadraticCurveTo(0, 18, 60, 4)
  x.stroke()
  // crown sheen
  x.strokeStyle = 'rgba(210,220,238,0.35)'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(-18, -26)
  x.quadraticCurveTo(0, -32, 16, -24)
  x.stroke()
  x.restore()
}

// Bicorne for the East Baldia officer: wide fore-and-aft arc, gold cockade.
export function bicorne(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? 0)
  x.scale(s, s)
  x.fillStyle = o.col ?? '#101722'
  x.beginPath()
  x.moveTo(-66, 2)
  x.quadraticCurveTo(0, -46, 66, 2)
  x.quadraticCurveTo(0, 16, -66, 2)
  x.closePath()
  x.fill()
  x.strokeStyle = '#6f8b9c'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(-60, 2)
  x.quadraticCurveTo(0, -38, 60, 2)
  x.stroke()
  x.fillStyle = '#ffcc2e'
  x.beginPath()
  x.arc(0, -8, 6, 0, 7)
  x.fill()
  x.restore()
}

// Cutlass prop: gold basket hilt, curved grey-blue blade. ang 0 = blade up.
export function cutlass(x, cx, cy, ang, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(ang)
  x.scale(o.flipX ? -s : s, s)
  // blade: curved wedge with a bright edge and dark back
  x.fillStyle = '#9fb0c2'
  x.beginPath()
  x.moveTo(-6, -10)
  x.quadraticCurveTo(-4, -60, 22, -104)
  x.quadraticCurveTo(28, -110, 30, -102)
  x.quadraticCurveTo(14, -58, 8, -10)
  x.closePath()
  x.fill()
  x.strokeStyle = '#dfe9f4'
  x.lineWidth = 2.6
  x.beginPath()
  x.moveTo(24, -102)
  x.quadraticCurveTo(10, -56, 4, -12)
  x.stroke()
  // guard: gold dish + knuckle bar
  x.fillStyle = '#ffcc2e'
  x.beginPath()
  x.ellipse(-2, -6, 14, 10, -0.35, 0, 7)
  x.fill()
  x.fillStyle = '#e08a0c'
  x.beginPath()
  x.ellipse(-3, -5, 8, 6, -0.35, 0, 7)
  x.fill()
  x.strokeStyle = '#ffcc2e'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(8, -2)
  x.quadraticCurveTo(16, 8, 8, 18)
  x.stroke()
  // grip
  x.strokeStyle = '#3a2a18'
  x.lineWidth = 6
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(-4, -2)
  x.lineTo(-10, 14)
  x.stroke()
  x.restore()
}

// Comb prop (bent = the gag survivor). teeth up by default.
export function comb(x, cx, cy, rot, s, bent = false) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  x.fillStyle = '#2a2436'
  if (bent) {
    x.beginPath()
    x.moveTo(-26, 0)
    x.quadraticCurveTo(0, -10, 26, -2)
    x.lineTo(26, 6)
    x.quadraticCurveTo(0, -2, -26, 8)
    x.closePath()
    x.fill()
  } else x.fillRect(-26, -3, 52, 10)
  x.fillStyle = '#e8cf7e'
  for (let i = 0; i < 8; i++) {
    const tx = -23 + i * 6.4
    x.fillRect(tx, bent ? 4 - i * 0.6 : 6, 3, 10)
  }
  x.restore()
}

// Small painted parrot. o: { hat:'tricorn'|'wig'|null, coin: bool, flap: phase }
export function parrot(x, cx, cy, s, t, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  const flap = Math.sin(t * 11 + (o.phase ?? 0))
  // tail
  x.fillStyle = '#1d8a4a'
  x.beginPath()
  x.moveTo(6, -2)
  x.quadraticCurveTo(30, 8, 38, 26)
  x.quadraticCurveTo(22, 20, 4, 8)
  x.closePath()
  x.fill()
  // far wing
  x.fillStyle = '#13603a'
  x.save()
  x.rotate(flap * 0.5)
  x.beginPath()
  x.ellipse(-2, -8, 14, 8, -0.5, 0, 7)
  x.fill()
  x.restore()
  // body
  x.fillStyle = '#1d9a52'
  x.beginPath()
  x.ellipse(0, 0, 13, 16, 0.2, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(255,255,255,0.18)'
  x.beginPath()
  x.ellipse(-4, -5, 5, 8, 0.2, 0, 7)
  x.fill()
  // head
  x.fillStyle = '#d94436'
  x.beginPath()
  x.arc(-2, -17, 9, 0, 7)
  x.fill()
  // beak
  x.fillStyle = '#e8a02e'
  x.beginPath()
  x.moveTo(-10, -19)
  x.quadraticCurveTo(-19, -18, -16, -12)
  x.quadraticCurveTo(-12, -14, -9, -15)
  x.closePath()
  x.fill()
  // eye
  x.fillStyle = '#141b2b'
  x.beginPath()
  x.arc(-4, -19, 1.8, 0, 7)
  x.fill()
  // near wing (flaps)
  x.fillStyle = '#13603a'
  x.save()
  x.rotate(flap * 0.7)
  x.beginPath()
  x.ellipse(3, -3, 12, 7, -0.6, 0, 7)
  x.fill()
  x.restore()
  if (o.hat === 'tricorn') tricorn(x, -2, -26, 0.32, { trim: '#ffcc2e' })
  if (o.hat === 'wig') {
    x.fillStyle = '#e6e2d8'
    for (const [dx, dy, r] of [[-8, -22, 6], [0, -26, 7], [7, -22, 6], [-11, -14, 5], [11, -14, 5]]) {
      x.beginPath()
      x.arc(dx, dy, r, 0, 7)
      x.fill()
    }
  }
  if (o.coin) {
    x.fillStyle = '#ffcc2e'
    x.beginPath()
    x.ellipse(2, 20, 7, 8, 0, 0, 7)
    x.fill()
    x.fillStyle = '#6e4000'
    x.beginPath()
    x.ellipse(2, 20, 4, 5, 0, 0, 7)
    x.stroke()
  }
  x.restore()
}

// Hermit crab with a gold-coin shell (gag 8).
export function crab(x, cx, cy, s, t, dir = 1) {
  x.save()
  x.translate(cx, cy)
  x.scale(dir * s, s)
  const skit = Math.sin(t * 9) * 2
  x.fillStyle = '#ffcc2e'
  x.beginPath()
  x.arc(4, -6 + skit * 0.2, 9, 0, 7)
  x.fill()
  x.fillStyle = '#e08a0c'
  x.beginPath()
  x.arc(4, -6, 5.5, 0, 7)
  x.fill()
  x.fillStyle = '#c2521e'
  x.beginPath()
  x.arc(-6, -2, 5, 0, 7)
  x.fill()
  x.fillStyle = '#141b2b'
  x.beginPath()
  x.arc(-8, -3, 1.4, 0, 7)
  x.fill()
  x.strokeStyle = '#c2521e'
  x.lineWidth = 2
  x.lineCap = 'round'
  for (const [lx, ly] of [[-8, 3], [-4, 4], [1, 4], [-9, 0]]) {
    x.beginPath()
    x.moveTo(lx, ly)
    x.lineTo(lx - 2, ly + 4)
    x.stroke()
  }
  x.restore()
}

// Painted hair mass for the living Cabald (S6 wigs / S7 regrow). style picks the
// silhouette; k scales it from the crown point (grow-in), o.slide drops it like a
// pulled tablecloth, o.rot tips it.
export function paintedHair(x, cx, cy, style, k, t, col, o = {}) {
  if (k <= 0.01) return
  const dark = shadeHex(col, 0.55), hi = shadeHex(col, 1.35)
  x.save()
  x.translate(cx + (o.dx ?? 0), cy + (o.dy ?? 0) + (o.slide ?? 0) * 46)
  x.rotate(o.rot ?? 0)
  x.scale(k, k * (1 - (o.slide ?? 0) * 0.25))
  const lock = (pts, w, c) => {
    x.strokeStyle = c
    x.lineWidth = w
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length - 1; i += 2) x.quadraticCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])
    x.stroke()
  }
  const sway = Math.sin(t * 1.7) * 3
  if (style === 'mane') {
    // glorious upward wave: three locks rise and roll back off the crown
    lock([[-10, -8], [-30 - sway, -34], [-26, -66], [-38, -96]], 16, dark)
    lock([[0, -12], [-6 - sway, -44], [2, -78], [-8, -112]], 19, col)
    lock([[12, -8], [30 + sway, -38], [24, -70], [36, -98]], 15, dark)
    lock([[-2, -16], [4, -34], [0, -50]], 11, hi)
    lock([[16, -14], [26, -30], [22, -44]], 8, hi)
  } else if (style === 'ponytail') {
    x.fillStyle = col
    x.beginPath()
    x.arc(0, -4, 15, 0, 7)
    x.fill()
    lock([[6, 2], [16 + sway, 26], [12, 52], [18, 74]], 13, col)
    lock([[-2, -12], [0, -6], [-2, 0]], 8, hi)
  } else if (style === 'bob') {
    x.fillStyle = col
    x.beginPath()
    x.ellipse(0, -2, 19, 17, 0, 0, 7)
    x.fill()
    lock([[-16, 2], [-19, 16], [-15, 26]], 10, dark)
    lock([[16, 2], [19, 16], [15, 26]], 10, dark)
    x.fillStyle = hi
    x.beginPath()
    x.ellipse(-6, -10, 8, 4, -0.5, 0, 7)
    x.fill()
  } else if (style === 'pompadour') {
    x.fillStyle = col
    x.beginPath()
    x.moveTo(-20, 4)
    x.bezierCurveTo(-34, -34, 4, -58, 20, -38)
    x.bezierCurveTo(40, -50, 44, -8, 22, 6)
    x.closePath()
    x.fill()
    x.fillStyle = hi
    x.beginPath()
    x.ellipse(-2, -32, 12, 7, -0.4, 0, 7)
    x.fill()
    x.fillStyle = dark
    x.fillRect(-18, 0, 38, 5)
  } else {
    // tufts: side clusters only (the curse-missed strands look)
    lock([[-14, -4], [-24, 4], [-20, 14]], 9, col)
    lock([[14, -4], [24, 4], [20, 14]], 9, dark)
    lock([[-12, -8], [-18, -2]], 6, hi)
  }
  x.restore()
}

// One falling red strand with a curl (the curse's price).
export function hairStrand(x, x0, y0, x1, y1, u, t) {
  if (u <= 0 || u >= 1) return
  const sway = Math.sin(t * 5) * 6
  x.save()
  x.strokeStyle = '#a03030'
  x.lineWidth = 4
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(x0, y0)
  x.quadraticCurveTo(x0 + (x1 - x0) * 0.3 + sway, y0 + (y1 - y0) * 0.5, x0 + (x1 - x0) * 0.8 + sway * 0.5, y0 + (y1 - y0) * 0.85)
  x.quadraticCurveTo(x0 + (x1 - x0) + sway * 0.2, y0 + (y1 - y0), x1 + 14, y1 - 6)
  x.stroke()
  x.strokeStyle = '#c85a48'
  x.lineWidth = 1.6
  x.stroke()
  x.restore()
}

// Living-hair palettes for the regrow (S6 wigs establish the colours; 347's mane is
// the dark red of his surviving sideburns — casting.md "red mane reborn").
export const LIVING_HAIR = {
  347: '#7a2f28', 48: '#241a14', 382: '#b06a28', 233: '#3a2a44',
  5: '#b08a3a', 834: '#2e241c', 129: '#1c1410', 1217: '#6a94c2',
}
export const HAIR_STYLE = {
  347: 'mane', 48: 'bob', 382: 'ponytail', 233: 'bob',
  5: 'pompadour', 834: 'tufts', 129: 'tufts', 1217: 'ponytail',
}

export function shadeHex(hex, k) {
  const [r, g, b] = hexRgb(hex)
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

// ============================== sky / sea / weather ==============================

export function sky(x, stops, o = {}) {
  const y0 = o.y0 ?? -OS, y1 = o.y1 ?? H
  const g = x.createLinearGradient(0, y0, 0, y1)
  for (const [p, c] of stops) g.addColorStop(p, c)
  x.fillStyle = g
  x.fillRect(-OS, y0, W + OS * 2, y1 - y0)
}

export function stars(x, t, seed, n, yMax, o = {}) {
  for (let i = 0; i < n; i++) {
    const tw = 0.5 + 0.5 * Math.sin(t * (0.4 + hash(i * 13 + seed) * 1.2) + i)
    x.fillStyle = `rgba(214,226,246,${(0.18 + 0.5 * hash(i * 7 + seed) * (0.5 + tw * 0.5)).toFixed(3)})`
    x.fillRect(Math.floor(hash(i * 3 + seed) * W), Math.floor(hash(i * 11 + seed + 5) * yMax), 2, 2)
  }
}

// Full moon: warm-white disc + craters + halo wash behind (call before the sea).
export function moon(x, cx, cy, r, o = {}) {
  const halo = x.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 5)
  halo.addColorStop(0, `rgba(216,228,246,${o.halo ?? 0.32})`)
  halo.addColorStop(1, 'rgba(216,228,246,0)')
  x.fillStyle = halo
  x.fillRect(cx - r * 5, cy - r * 5, r * 10, r * 10)
  x.fillStyle = '#e9edf4'
  x.beginPath()
  x.arc(cx, cy, r, 0, 7)
  x.fill()
  x.fillStyle = '#f7f9fc'
  x.beginPath()
  x.arc(cx - r * 0.25, cy - r * 0.25, r * 0.85, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(178,190,208,0.55)'
  for (const [dx, dy, dr] of [[-0.3, 0.1, 0.16], [0.25, -0.2, 0.11], [0.1, 0.35, 0.09], [-0.05, -0.42, 0.07], [0.45, 0.2, 0.07]]) {
    x.beginPath()
    x.arc(cx + dx * r, cy + dy * r, dr * r, 0, 7)
    x.fill()
  }
}

// Long night cloud banks with silver linings. part: 0 full cover, 1 fully parted
// (banks slide to the frame edges and thin out).
export function cloudBanks(x, t, part, seed = 4) {
  const r = rng(seed)
  for (let i = 0; i < 7; i++) {
    const baseY = 60 + r() * 300
    const drift = ((r() * 1200 + t * (4 + r() * 6)) % (W + 800)) - 400
    const cx0 = i % 2 ? lerpX(drift, -500, part) : lerpX(drift, W + 500, part)
    const sq = 1 - part * 0.75
    x.save()
    x.translate(cx0, baseY)
    x.scale(1 + r() * 0.8, sq * (0.5 + r() * 0.3))
    x.fillStyle = `rgba(16,22,36,${0.72 - part * 0.3})`
    x.beginPath()
    x.ellipse(0, 0, 190 + r() * 150, 34 + r() * 22, 0, 0, 7)
    x.fill()
    x.fillStyle = `rgba(190,205,230,${0.16 - part * 0.1})`
    x.beginPath()
    x.ellipse(-40, -12, 130 + r() * 90, 12, -0.05, 0, 7)
    x.fill()
    x.restore()
  }
}
const lerpX = (a, b, u) => a + (b - a) * u

// Layered parallax sea: bands near->far (far = horizon side), foam crests, and a
// moon/sun glint column of shimmering dashes. Pure in t.
export function sea(x, yTop, t, o = {}) {
  const bands = o.bands ?? ['#33506b', '#2b4460', '#243a54', '#1d3148', '#17293c']
  const amp = o.amp ?? 7
  const x0 = -OS, x1 = W + OS, yBot = H + OS
  x.fillStyle = bands[bands.length - 1]
  x.fillRect(x0, yTop, x1 - x0, yBot - yTop)
  const n = bands.length
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1)
    const y = yTop + 6 + f * f * (o.depth ?? 330)
    const a = amp * (0.45 + f * 0.9)
    const frq = 0.006 + 0.0035 * i
    const spd = 0.6 + 0.22 * i
    x.fillStyle = bands[i]
    x.beginPath()
    x.moveTo(x0, y)
    for (let px = x0; px <= x1; px += 44) x.lineTo(px, y + a * Math.sin(px * frq + t * spd + i * 2.4))
    x.lineTo(x1, yBot)
    x.lineTo(x0, yBot)
    x.closePath()
    x.fill()
    if (o.foam && f > 0.25) {
      x.fillStyle = o.foam
      for (let px = x0; px <= x1; px += 130) {
        const c2 = Math.sin(px * frq + t * spd + i * 2.4)
        if (c2 > 0.55) {
          x.globalAlpha = 0.16 + 0.14 * (c2 - 0.55) * 2
          x.fillRect(px, y + a * c2, 26 + 22 * ((px + i * 97) % 3), 2)
        }
      }
      x.globalAlpha = 1
    }
  }
  if (o.glintX != null) {
    x.fillStyle = o.glintCol ?? 'rgba(255,233,173,0.8)'
    for (let i = 0; i < 22; i++) {
      const yy = yTop + 10 + i * i * 0.75 + 6 * Math.sin(t * 1.1 + i * 2.2)
      const wG = Math.max(3, 90 - i * 3.6)
      const spread = 16 + i * 7
      x.globalAlpha = 0.34 * (1 - i / 26)
      x.fillRect(o.glintX + Math.sin(t * 1.35 + i * 2.4) * spread - wG / 2, yy, wG, 3)
    }
    x.globalAlpha = 1
  }
}

// Ripple ring on the water (age in seconds).
export function ripple(x, cx, cy, age, life, col = 'rgba(207,217,226,0.8)') {
  if (age <= 0 || age >= life) return
  const u = age / life
  x.strokeStyle = col
  x.globalAlpha = (1 - u) * 0.8
  x.lineWidth = 3 * (1 - u) + 1
  x.beginPath()
  x.ellipse(cx, cy, 12 + u * 170, (12 + u * 170) * 0.24, 0, 0, 7)
  x.stroke()
  x.globalAlpha = 1
}

// Splash plume: vertical burst of droplets, age-keyed.
export function splash(x, cx, cy, age, o = {}) {
  if (age <= 0 || age > 1.2) return
  const r = rng(501)
  for (let i = 0; i < 22; i++) {
    const dx = (r() - 0.5) * 120 * age
    const dy = -(r() * 200 + 40) * age + 380 * age * age
    x.globalAlpha = (1 - age / 1.2) * 0.7
    x.fillStyle = o.col ?? '#dfe9f2'
    x.beginPath()
    x.arc(cx + dx, cy + dy, 2.4 + r() * 5, 0, 7)
    x.fill()
  }
  x.globalAlpha = 1
}

// Fog banks drifting (spyglass / pursuit).
export function fog(x, t, seed, n, y, alpha) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const bx = ((r() * 2400 + t * (10 + r() * 22)) % (W + 1000)) - 500
    x.save()
    x.translate(bx, y + (r() - 0.5) * 120)
    x.scale(1 + r(), 0.28 + r() * 0.2)
    x.globalAlpha = alpha * (0.5 + r() * 0.5)
    x.fillStyle = '#b9c6d4'
    x.beginPath()
    x.arc(0, 0, 140 + r() * 120, 0, 7)
    x.fill()
    x.restore()
  }
  x.globalAlpha = 1
}

// Moonbeam scanner band: additive column with a hot core. o.topX pins the top
// edge to the light source (moon disc / roof hole); the base sweeps to cx.
export function beam(x, cx, t, o = {}) {
  const wTop = (o.wTop ?? 90), wBot = (o.wBot ?? 240)
  const topX = o.topX ?? cx + (o.slant ?? 60)
  x.save()
  x.globalCompositeOperation = 'lighter'
  const g = x.createLinearGradient(0, o.y0 ?? 0, 0, o.y1 ?? H)
  g.addColorStop(0, `rgba(214,230,252,${o.aTop ?? 0.34})`)
  g.addColorStop(1, `rgba(214,230,252,${o.aBot ?? 0.1})`)
  x.fillStyle = g
  x.beginPath()
  x.moveTo(topX - wTop / 2, o.y0 ?? 0)
  x.lineTo(topX + wTop / 2, o.y0 ?? 0)
  x.lineTo(cx + wBot / 2, o.y1 ?? H)
  x.lineTo(cx - wBot / 2, o.y1 ?? H)
  x.closePath()
  x.fill()
  const core = x.createLinearGradient(cx - wBot * 0.2, 0, cx + wBot * 0.2, 0)
  core.addColorStop(0, 'rgba(240,248,255,0)')
  core.addColorStop(0.5, `rgba(240,248,255,${o.core ?? 0.28})`)
  core.addColorStop(1, 'rgba(240,248,255,0)')
  x.fillStyle = core
  x.fillRect(cx - wBot * 0.2, o.y0 ?? 0, wBot * 0.4, (o.y1 ?? H) - (o.y0 ?? 0))
  // dust motes inside the beam
  for (let i = 0; i < 12; i++) {
    const u = ((t * (0.12 + hash(i * 7) * 0.2) + hash(i * 3)) % 1)
    const px = cx + (hash(i * 13) - 0.5) * wBot * (0.4 + u * 0.6)
    const py = (o.y0 ?? 0) + u * ((o.y1 ?? H) - (o.y0 ?? 0))
    x.globalAlpha = 0.4 * Math.sin(u * Math.PI)
    x.fillStyle = '#e6f0ff'
    x.fillRect(px, py, 2.4, 2.4)
  }
  x.restore()
  x.globalAlpha = 1
}

// ============================== ships ==============================

// Side-view brig, bow LEFT. kind 'hero' = the Black Flow (blue-black hull, gold
// trim, cream canvas, crimson pennant) | 'villain' = the Razor's Edge (black hull,
// black canvas, gun-port rows, bone-white Cabald sigil flag).
export function shipBake(kind) {
  const w = 1560, h = 1020
  const c = canvas(w, h), x = c.getContext('2d')
  const r = rng(kind === 'hero' ? 88 : 66)
  const hero = kind === 'hero'
  const hull = hero ? '#151d28' : '#0b0d12'
  const hullLit = hero ? '#243244' : '#161a22'
  const trim = hero ? '#c9a45c' : '#4a3626'
  const canvasCol = hero ? '#ddd3b8' : '#2c2f36'
  const canvasHi = hero ? '#f2ecd8' : '#3d414a'
  const canvasLo = hero ? '#b3a784' : '#1c1f26'
  const WL = 900 // waterline y inside the bake
  // masts + yards first (behind sails)
  const mast = (mx, top, seg2) => {
    x.strokeStyle = '#241a10'
    x.lineWidth = 16
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(mx, WL - 20)
    x.lineTo(mx, top)
    x.stroke()
    x.strokeStyle = '#3d2c1a'
    x.lineWidth = 6
    x.beginPath()
    x.moveTo(mx - 5, WL - 20)
    x.lineTo(mx - 5, top)
    x.stroke()
    for (const yy of seg2) {
      x.strokeStyle = '#2c2014'
      x.lineWidth = 9
      x.beginPath()
      x.moveTo(mx - yy[1], yy[0])
      x.lineTo(mx + yy[1], yy[0])
      x.stroke()
    }
  }
  // bowsprit
  x.strokeStyle = '#241a10'
  x.lineWidth = 12
  x.beginPath()
  x.moveTo(250, WL - 190)
  x.lineTo(60, WL - 320)
  x.stroke()
  mast(620, 120, [[430, 250], [250, 290]])
  mast(1120, 190, [[480, 220], [300, 250]])
  // ratlines: shrouds from rail to mast tops
  x.strokeStyle = hero ? 'rgba(70,54,34,0.75)' : 'rgba(44,36,26,0.85)'
  x.lineWidth = 3
  for (const [mx, spread] of [[620, 190], [1120, 170]]) {
    for (let i = -5; i <= 5; i++) {
      x.beginPath()
      x.moveTo(mx + i * 24, WL - 165)
      x.lineTo(mx + i * 10, WL - 560)
      x.stroke()
    }
    for (let yy = WL - 200; yy > WL - 560; yy -= 36) {
      x.beginPath()
      x.moveTo(mx - spread * (1 - (WL - 200 - yy) / 420), yy)
      x.lineTo(mx + spread * (1 - (WL - 200 - yy) / 420), yy)
      x.stroke()
    }
  }
  // square sails with wind bulge (bellying to port/left) + a spanker aft
  const sail = (cx0, y0, y1, w2, bulge) => {
    x.fillStyle = canvasCol
    x.beginPath()
    x.moveTo(cx0 - w2 / 2, y0)
    x.lineTo(cx0 + w2 / 2, y0)
    x.quadraticCurveTo(cx0 + w2 / 2 + bulge, (y0 + y1) / 2, cx0 + w2 / 2 - 12, y1)
    x.quadraticCurveTo(cx0, y1 + 34, cx0 - w2 / 2 + 12, y1)
    x.quadraticCurveTo(cx0 - w2 / 2 - bulge, (y0 + y1) / 2, cx0 - w2 / 2, y0)
    x.closePath()
    x.fill()
    // vertical shading: lit side toward the moon (left), shadow right
    const g = x.createLinearGradient(cx0 - w2 / 2, 0, cx0 + w2 / 2, 0)
    g.addColorStop(0, canvasHi)
    g.addColorStop(0.55, 'rgba(0,0,0,0)')
    g.addColorStop(1, canvasLo)
    x.fillStyle = g
    x.fill()
    // cloth seams
    x.strokeStyle = 'rgba(30,26,18,0.28)'
    x.lineWidth = 2
    for (let i = 1; i < 4; i++) {
      const sx0 = cx0 - w2 / 2 + (i * w2) / 4
      x.beginPath()
      x.moveTo(sx0, y0 + 4)
      x.quadraticCurveTo(sx0 + bulge * 0.4, (y0 + y1) / 2, sx0 - 4, y1)
      x.stroke()
    }
    // reef bands
    x.strokeStyle = 'rgba(30,26,18,0.4)'
    x.beginPath()
    x.moveTo(cx0 - w2 / 2 + 10, y1 - 22)
    x.quadraticCurveTo(cx0, y1 + 14, cx0 + w2 / 2 - 10, y1 - 22)
    x.stroke()
  }
  sail(620, 445, 620, 430, 46)
  sail(620, 262, 424, 500, 58)
  sail(1120, 500, 664, 390, 42)
  sail(1120, 312, 494, 440, 52)
  // jib off the bowsprit
  x.fillStyle = canvasCol
  x.beginPath()
  x.moveTo(600, 445)
  x.quadraticCurveTo(320, 400, 96, WL - 316)
  x.quadraticCurveTo(330, 520, 560, 600)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(0,0,0,0.12)'
  x.fill()
  // spanker gaff sail at the stern
  x.fillStyle = canvasCol
  x.beginPath()
  x.moveTo(1160, 560)
  x.lineTo(1390, 430)
  x.lineTo(1400, 560)
  x.quadraticCurveTo(1300, 640, 1160, 620)
  x.closePath()
  x.fill()
  // hull: sheer from raked bow (left) to raised stern castle (right)
  x.fillStyle = hull
  x.beginPath()
  x.moveTo(96, WL - 240)
  x.quadraticCurveTo(120, WL - 60, 210, WL - 40)
  x.lineTo(1330, WL - 40)
  x.quadraticCurveTo(1450, WL - 60, 1470, WL - 170)
  x.lineTo(1470, WL - 330)
  x.lineTo(1400, WL - 330)
  x.quadraticCurveTo(1390, WL - 230, 1300, WL - 212)
  x.lineTo(320, WL - 212)
  x.quadraticCurveTo(170, WL - 220, 96, WL - 240)
  x.closePath()
  x.fill()
  // hull side light (moon key from the left) + planking seams
  const hg = x.createLinearGradient(0, WL - 240, 0, WL - 30)
  hg.addColorStop(0, hullLit)
  hg.addColorStop(0.5, 'rgba(0,0,0,0)')
  x.fillStyle = hg
  x.fill()
  x.strokeStyle = 'rgba(8,10,14,0.7)'
  x.lineWidth = 3
  for (let i = 1; i < 4; i++) {
    x.beginPath()
    x.moveTo(140, WL - 210 + i * 42)
    x.quadraticCurveTo(700, WL - 190 + i * 42, 1380, WL - 200 + i * 40)
    x.stroke()
  }
  // gold sheer line + bow flash
  x.fillStyle = trim
  x.fillRect(150, WL - 186, 1290, 7)
  x.fillStyle = hero ? '#e8cf8a' : '#6a543a'
  x.fillRect(150, WL - 186, 1290, 2)
  // figurehead + hawse
  x.fillStyle = trim
  x.beginPath()
  x.moveTo(96, WL - 240)
  x.quadraticCurveTo(60, WL - 260, 52, WL - 300)
  x.quadraticCurveTo(84, WL - 292, 106, WL - 268)
  x.closePath()
  x.fill()
  // stern windows (warm at night — lanterns within)
  for (let i = 0; i < 4; i++) {
    x.fillStyle = hero ? '#ffd98a' : '#c2803a'
    x.fillRect(1330 + i * 0, 0, 0, 0) // no-op guard for loop shape clarity
  }
  for (let i = 0; i < 3; i++) {
    x.fillStyle = hero ? '#ffcf7a' : '#b06a2a'
    x.fillRect(1352, WL - 300 + i * 46, 74, 26)
    x.fillStyle = 'rgba(20,16,10,0.8)'
    x.fillRect(1352, WL - 300 + i * 46, 74, 3)
    x.fillRect(1352, WL - 300 + i * 46, 3, 26)
  }
  // gun ports (the Razor's Edge is gun-laced; the Flow carries two)
  const guns = hero ? [[520, 1]] : [[420, 1], [560, 1], [700, 1], [840, 1], [980, 1], [1120, 1], [1240, 1]]
  for (const [gx] of guns) {
    x.fillStyle = '#05060a'
    x.fillRect(gx - 20, WL - 130, 40, 30)
    x.strokeStyle = trim
    x.lineWidth = 3
    x.strokeRect(gx - 20, WL - 130, 40, 30)
  }
  // bulwark rail + cannon barrel poking out
  x.fillStyle = hull
  x.fillRect(140, WL - 250, 1290, 26)
  x.fillStyle = hullLit
  x.fillRect(140, WL - 250, 1290, 6)
  if (!hero) {
    x.fillStyle = '#1a1e24'
    x.fillRect(560, WL - 268, 90, 14)
    x.fillRect(1080, WL - 268, 90, 14)
  }
  // anchors
  x.strokeStyle = '#20242c'
  x.lineWidth = 8
  x.beginPath()
  x.moveTo(300, WL - 200)
  x.lineTo(286, WL - 120)
  x.moveTo(262, WL - 140)
  x.quadraticCurveTo(286, -96 + WL, 310, WL - 140)
  x.stroke()
  // flag at the mainmast top (remy-bros pennant)
  const fg = flagPennant(hero ? '#8d3b3b' : '#0d1016', null)
  x.imageSmoothingEnabled = false
  x.drawImage(fg, 626, 86, 88, 68)
  if (!hero) {
    // Cabald sigil: bald head in a ring, painted over the black pennant
    x.strokeStyle = '#cfd6e0'
    x.lineWidth = 4
    x.beginPath()
    x.arc(670, 120, 22, 0, 7)
    x.stroke()
    x.fillStyle = '#cfd6e0'
    x.beginPath()
    x.arc(670, 116, 11, 0, 7)
    x.fill()
    x.fillStyle = '#0d1016'
    x.fillRect(660, 112, 20, 4)
  }
  return { c, w, h, wl: WL, kind }
}

// Draw a ship bake centred so its waterline sits at (x, wl) with roll/bob; s scales.
// The hull name is painted live (not baked) so it never mirrors on flipped rigs.
export function drawShip(ctx, ship, x, wl, s, o = {}) {
  ctx.save()
  ctx.translate(x, wl)
  if (o.rot) ctx.rotate(o.rot)
  ctx.scale(o.flipX ? -s : s, s)
  ctx.imageSmoothingEnabled = true // painted bake, keep the vector edges soft
  ctx.drawImage(ship.c, -ship.w / 2, -ship.wl)
  ctx.restore()
  const name = SHIP_NAME[o.kind ?? ship.kind]
  if (name && s > 0.3) {
    const nx = o.flipX ? x + 420 * s : x - 420 * s
    ctx.save()
    ctx.fillStyle = ship.kind === 'hero' ? '#e8cf8a' : '#8a7452'
    ctx.font = `600 ${Math.round(30 * s)}px "Cormorant Garamond"`
    ctx.textAlign = o.flipX ? 'right' : 'left'
    ctx.fillText(name, nx, wl - 158 * s)
    ctx.restore()
  }
}

// ============================== sets ==============================

// Black Flow quarterdeck set (S4/S5): planks, bulwark rail, mainmast + halyard,
// wheel, hatch grating, coiled ropes, lantern posts, cannon. Night-dark base;
// moon/lantern washes painted live. Overscanned for camera moves.
export function deckBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(1717)
  x.translate(OS, OS)
  // back sky gap above the bulwark stays transparent (film paints sky/sea behind)
  // deck planking
  const dg = x.createLinearGradient(0, 880, 0, H + OS)
  dg.addColorStop(0, '#3a2c1c')
  dg.addColorStop(0.5, '#2c2114')
  dg.addColorStop(1, '#1a130b')
  x.fillStyle = dg
  x.fillRect(-OS, 880, W + OS * 2, H + OS - 880)
  x.fillStyle = 'rgba(0,0,0,0.5)'
  for (let px = -OS; px < W + OS; px += 92) x.fillRect(px, 884, 5, H + OS)
  x.fillStyle = 'rgba(214,226,244,0.1)'
  x.fillRect(-OS, 880, W + OS * 2, 5)
  // bulwark behind (rail at ~700, planked up to it)
  x.fillStyle = '#241a10'
  x.fillRect(-OS, 726, W + OS * 2, 156)
  x.fillStyle = '#382a1a'
  for (let px = -OS; px < W + OS; px += 74) x.fillRect(px, 726, 4, 156)
  x.fillStyle = '#443321'
  x.fillRect(-OS, 700, W + OS * 2, 30)
  x.fillStyle = '#57422a'
  x.fillRect(-OS, 700, W + OS * 2, 7)
  // top rail posts
  x.fillStyle = '#57422a'
  for (let px = -80; px < W + OS; px += 178) x.fillRect(px, 700, 12, 4)
  // mainmast (right of centre) with bands + halyard block
  const mx = 1460
  const mg = x.createLinearGradient(mx - 22, 0, mx + 22, 0)
  mg.addColorStop(0, '#4a3620')
  mg.addColorStop(0.5, '#332414')
  mg.addColorStop(1, '#1c1208')
  x.fillStyle = mg
  x.fillRect(mx - 20, -OS, 40, 900)
  x.fillStyle = '#57422a'
  for (const by of [200, 420, 640]) x.fillRect(mx - 26, by, 52, 16)
  // halyard: rope from the mast top down to a cleat
  x.strokeStyle = '#8a6f48'
  x.lineWidth = 5
  x.beginPath()
  x.moveTo(mx - 30, 240)
  x.quadraticCurveTo(mx - 180, 480, mx - 210, 880)
  x.stroke()
  // shrouds with ratlines behind the deck
  x.strokeStyle = 'rgba(70,54,34,0.8)'
  x.lineWidth = 4
  for (let i = -4; i <= 4; i++) {
    x.beginPath()
    x.moveTo(mx - 40 + i * 26, 726)
    x.lineTo(mx - 10 + i * 9, -OS + 80)
    x.stroke()
  }
  for (let yy = -80; yy < 720; yy += 34) {
    const u = (720 - yy) / 800
    x.lineWidth = 2
    x.beginPath()
    x.moveTo(mx - 40 - 104 * (1 - u), yy)
    x.lineTo(mx - 40 + 104 * (1 - u), yy)
    x.stroke()
  }
  // ship's wheel (left)
  x.save()
  x.translate(240, 812)
  x.strokeStyle = '#57422a'
  x.lineWidth = 12
  x.beginPath()
  x.arc(0, 0, 62, 0, 7)
  x.stroke()
  x.lineWidth = 8
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    x.beginPath()
    x.moveTo(Math.cos(a) * 26, Math.sin(a) * 26)
    x.lineTo(Math.cos(a) * 96, Math.sin(a) * 96)
    x.stroke()
  }
  x.fillStyle = '#33241a'
  x.fillRect(-14, 60, 28, 70)
  x.restore()
  // hatch grating
  x.fillStyle = '#241a10'
  x.fillRect(560, 940, 220, 60)
  x.strokeStyle = '#443321'
  x.lineWidth = 5
  x.strokeRect(560, 940, 220, 60)
  for (let i = 1; i < 5; i++) {
    x.beginPath()
    x.moveTo(560 + i * 44, 940)
    x.lineTo(560 + i * 44, 1000)
    x.stroke()
  }
  // coiled ropes + barrels
  x.strokeStyle = '#8a6f48'
  x.lineWidth = 9
  for (const [rx, ry] of [[420, 1010], [1210, 1030], [1700, 990]]) {
    for (let i = 0; i < 3; i++) {
      x.beginPath()
      x.ellipse(rx, ry - i * 7, 44 - i * 8, 15 - i * 3, 0, 0, 7)
      x.stroke()
    }
  }
  // deck cannon (port side, aimed out through the bulwark gap)
  x.fillStyle = '#14181f'
  x.fillRect(60, 780, 150, 22)
  x.beginPath()
  x.moveTo(50, 791)
  x.lineTo(20, 784)
  x.lineTo(20, 800)
  x.closePath()
  x.fill()
  x.fillStyle = '#3a2c1c'
  x.beginPath()
  x.moveTo(90, 802)
  x.lineTo(150, 802)
  x.lineTo(140, 828)
  x.lineTo(100, 828)
  x.closePath()
  x.fill()
  // lantern posts (warm dots painted live; posts here)
  for (const lx of [340, 1080, 1760]) {
    x.fillStyle = '#241a10'
    x.fillRect(lx, 640, 9, 250)
    x.fillRect(lx - 12, 632, 33, 10)
  }
  // deck shadowing under the bulwark + moon pools seeded
  for (let i = 0; i < 26; i++) {
    x.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.16})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, 900 + r() * 160, 60 + r() * 130, 14 + r() * 18, 0, 0, 7)
    x.fill()
  }
  return c
}

// Skullshoal sea-cave (S7): rock shell, stalactites/stalagmites, plinth, black
// water shelf, roof hole (the moonshaft mouth, moon painted live inside it).
export function caveBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(882)
  x.translate(OS, OS)
  // back wall
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0d0f16')
  g.addColorStop(0.6, '#131622')
  g.addColorStop(1, '#0a0c12')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, H + OS * 2)
  // rock strata + seeded mottling
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(64,58,76,${0.05 + r() * 0.07})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, r() * H, 40 + r() * 160, 10 + r() * 30, r(), 0, 7)
    x.fill()
  }
  for (let wy = 0; wy < H; wy += 46) {
    x.fillStyle = 'rgba(0,0,0,0.22)'
    x.fillRect(-OS, wy + (((wy / 46) | 0) % 2) * 10, W + OS * 2, 8)
  }
  // roof hole (moonshaft mouth) at top centre-right — sky/moon painted live inside
  x.fillStyle = '#05060c'
  x.beginPath()
  x.moveTo(880, -OS)
  x.lineTo(880, 40)
  x.quadraticCurveTo(920, 96, 1030, 104)
  x.quadraticCurveTo(1170, 110, 1240, 60)
  x.lineTo(1260, -OS)
  x.closePath()
  x.fill()
  x.strokeStyle = '#2c2836'
  x.lineWidth = 14
  x.beginPath()
  x.moveTo(880, 40)
  x.quadraticCurveTo(920, 96, 1030, 104)
  x.quadraticCurveTo(1170, 110, 1240, 60)
  x.stroke()
  // stalactites
  x.fillStyle = '#181420'
  for (let i = 0; i < 14; i++) {
    const sx0 = 60 + i * 138 + r() * 40
    const len = 40 + r() * 150
    const w2 = 16 + r() * 18
    x.beginPath()
    x.moveTo(sx0 - w2, -6)
    x.quadraticCurveTo(sx0 - w2 * 0.3, len * 0.6, sx0, len)
    x.quadraticCurveTo(sx0 + w2 * 0.3, len * 0.6, sx0 + w2, -6)
    x.closePath()
    x.fill()
  }
  // side rock masses framing the chamber
  x.fillStyle = '#100d17'
  x.beginPath()
  x.moveTo(-OS, -OS)
  x.lineTo(260, -OS)
  x.quadraticCurveTo(150, 240, 240, 470)
  x.quadraticCurveTo(300, 660, 130, 860)
  x.lineTo(-OS, 1000)
  x.closePath()
  x.fill()
  x.beginPath()
  x.moveTo(W + OS, -OS)
  x.lineTo(1650, -OS)
  x.quadraticCurveTo(1760, 220, 1680, 470)
  x.quadraticCurveTo(1620, 660, 1800, 880)
  x.lineTo(W + OS, 1020)
  x.closePath()
  x.fill()
  // stalagmite rows along the shelf back
  x.fillStyle = '#1a1524'
  for (let i = 0; i < 12; i++) {
    const sx0 = 200 + i * 130 + r() * 40
    const hh = 30 + r() * 90
    x.beginPath()
    x.moveTo(sx0 - 18, 892)
    x.quadraticCurveTo(sx0 - 4, 892 - hh * 0.6, sx0, 892 - hh)
    x.quadraticCurveTo(sx0 + 4, 892 - hh * 0.6, sx0 + 18, 892)
    x.closePath()
    x.fill()
  }
  // black water shelf (film paints live shimmer on top)
  x.fillStyle = '#05070d'
  x.fillRect(-OS, 892, W + OS * 2, H + OS - 892)
  x.fillStyle = 'rgba(120,140,180,0.09)'
  x.fillRect(-OS, 892, W + OS * 2, 6)
  // stone plinth under the chest (mooncatching top face so the chest reads grounded)
  x.fillStyle = '#3a3648'
  x.fillRect(866, 812, 190, 84)
  x.fillStyle = '#565070'
  x.fillRect(842, 800, 238, 20)
  x.fillStyle = 'rgba(214,230,252,0.28)'
  x.fillRect(842, 800, 238, 6)
  return c
}

// East Baldia wharf (S2): warehouse facade with diegetic signage, dock planks,
// bollards, crates, lantern posts. Night-lit base; lantern glows painted live.
export function dockBake() {
  const c = canvas(W + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(2026)
  x.translate(OS, OS)
  // warehouse wall behind
  const g = x.createLinearGradient(0, 0, 0, 760)
  g.addColorStop(0, '#10141d')
  g.addColorStop(1, '#1a212c')
  x.fillStyle = g
  x.fillRect(-OS, -OS, W + OS * 2, 770)
  x.fillStyle = '#0c1018'
  x.fillRect(-OS, 740, W + OS * 2, 40)
  // weatherboards + windows
  for (let wy = 40; wy < 720; wy += 34) {
    x.fillStyle = 'rgba(0,0,0,0.3)'
    x.fillRect(-OS, wy, W + OS * 2, 3)
  }
  for (let wx = -140; wx < W + OS; wx += 210) {
    for (const wy of [140, 330, 520]) {
      x.fillStyle = '#0a0e14'
      x.fillRect(wx, wy, 86, 110)
      x.fillStyle = 'rgba(255,196,120,0.16)'
      x.fillRect(wx + 6, wy + 6, 74, 98)
      x.fillStyle = '#1c2430'
      x.fillRect(wx + 40, wy + 6, 6, 98)
      x.fillRect(wx + 6, wy + 52, 74, 6)
    }
  }
  // painted sign, hung on chains from the roofline (diegetic)
  x.strokeStyle = '#39424f'
  x.lineWidth = 4
  for (const cxh of [600, 1320]) {
    x.beginPath()
    x.moveTo(cxh, -OS)
    x.lineTo(cxh, 66)
    x.stroke()
  }
  x.fillStyle = '#0a0e16'
  x.fillRect(560, 60, 800, 92)
  x.strokeStyle = '#26303e'
  x.lineWidth = 4
  x.strokeRect(560, 60, 800, 92)
  x.fillStyle = '#d9c98f'
  x.font = `600 44px "Cormorant Garamond"`
  x.textAlign = 'center'
  x.fillText('EAST BALDIA TRADING CO.', 960, 120)
  x.textAlign = 'left'
  // dock planks
  const dg = x.createLinearGradient(0, 780, 0, H + OS)
  dg.addColorStop(0, '#4a3a24')
  dg.addColorStop(0.4, '#3a2c1c')
  dg.addColorStop(1, '#241a10')
  x.fillStyle = dg
  x.fillRect(-OS, 780, W + OS * 2, H + OS - 780)
  x.fillStyle = 'rgba(0,0,0,0.45)'
  for (let px = -OS; px < W + OS; px += 104) x.fillRect(px, 784, 5, H + OS)
  x.fillStyle = 'rgba(0,0,0,0.35)'
  for (let py = 860; py < H + OS; py += 90) x.fillRect(-OS, py, W + OS * 2, 4)
  x.fillStyle = 'rgba(214,226,244,0.08)'
  x.fillRect(-OS, 780, W + OS * 2, 4)
  // dock edge + water gap at the front-right (mooring side)
  x.fillStyle = '#141a24'
  x.fillRect(W - 190, 780, OS + 190, 60)
  x.fillStyle = '#05070d'
  x.fillRect(W - 190, 840, OS + 190, H + OS - 840)
  // bollards
  for (const bx of [420, 880, 1560]) {
    x.fillStyle = '#1a1f28'
    x.beginPath()
    x.ellipse(bx, 806, 34, 14, 0, 0, 7)
    x.fill()
    x.fillStyle = '#242c38'
    x.fillRect(bx - 22, 758, 44, 48)
    x.beginPath()
    x.ellipse(bx, 758, 22, 9, 0, 0, 7)
    x.fill()
    x.fillStyle = 'rgba(214,226,244,0.16)'
    x.fillRect(bx - 22, 758, 44, 5)
  }
  // crates + barrels
  const crate = (cx0, cy0, s2) => {
    x.fillStyle = '#4a3a24'
    x.fillRect(cx0, cy0 - 78 * s2, 96 * s2, 78 * s2)
    x.strokeStyle = '#2c2114'
    x.lineWidth = 5
    x.strokeRect(cx0, cy0 - 78 * s2, 96 * s2, 78 * s2)
    x.beginPath()
    x.moveTo(cx0, cy0 - 78 * s2)
    x.lineTo(cx0 + 96 * s2, cy0)
    x.moveTo(cx0 + 96 * s2, cy0 - 78 * s2)
    x.lineTo(cx0, cy0)
    x.stroke()
  }
  crate(60, 880, 1)
  crate(170, 880, 1)
  crate(115, 812, 0.8)
  const barrel = (bx, by) => {
    const bg = x.createLinearGradient(bx - 34, 0, bx + 34, 0)
    bg.addColorStop(0, '#3a2a16')
    bg.addColorStop(0.45, '#54401f')
    bg.addColorStop(1, '#2c1e10')
    x.fillStyle = bg
    x.fillRect(bx - 34, by - 92, 68, 92)
    x.fillStyle = '#1c140a'
    x.fillRect(bx - 34, by - 74, 68, 7)
    x.fillRect(bx - 34, by - 34, 68, 7)
    x.fillStyle = '#6a5432'
    x.beginPath()
    x.ellipse(bx, by - 92, 34, 9, 0, 0, 7)
    x.fill()
  }
  barrel(1690, 900)
  barrel(1770, 904)
  // coiled mooring rope by the bollard
  x.strokeStyle = '#8a6f48'
  x.lineWidth = 9
  for (let i = 0; i < 3; i++) {
    x.beginPath()
    x.ellipse(980, 890 - i * 7, 50 - i * 9, 17 - i * 3, 0, 0, 7)
    x.stroke()
  }
  // lantern posts
  for (const lx of [280, 1180, 1720]) {
    x.fillStyle = '#141a24'
    x.fillRect(lx, 470, 10, 320)
    x.fillRect(lx - 16, 462, 42, 10)
  }
  for (let i = 0; i < 30; i++) {
    x.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.14})`
    x.beginPath()
    x.ellipse(r() * (W + OS * 2) - OS, 800 + r() * 240, 50 + r() * 120, 12 + r() * 16, 0, 0, 7)
    x.fill()
  }
  return c
}

// ============================== props & fx ==============================

// Treasure chest: body + lid angle (0 shut, 1 wide). Gold coins spill inside.
export function chest(x, cx, cy, s, lid, t) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  // lid (drawn open behind the pile when open)
  if (lid > 0.02) {
    x.save()
    x.translate(-64, -52)
    x.rotate(-lid * 1.9)
    x.fillStyle = '#54401f'
    x.beginPath()
    x.moveTo(0, 0)
    x.lineTo(128, 0)
    x.lineTo(128, -18)
    x.quadraticCurveTo(64, -46, 0, -18)
    x.closePath()
    x.fill()
    x.fillStyle = '#6a5432'
    x.fillRect(0, -14, 128, 6)
    x.fillStyle = '#2c1e10'
    x.fillRect(58, -34, 12, 22)
    x.restore()
  }
  // coin heap inside
  const r = rng(882)
  const n = Math.round(26 * clamp01(lid + 0.25))
  for (let i = 0; i < n; i++) {
    const px = -52 + r() * 104
    const py = -38 + r() * 16 - lid * 10
    const shimmy = 0.7 + 0.3 * Math.sin(t * 3 + i)
    x.fillStyle = i % 3 ? '#ffcc2e' : '#e08a0c'
    x.beginPath()
    x.ellipse(px, py, 9, 4, r() * 3, 0, 7)
    x.fill()
    if (i % 4 === 0) {
      x.fillStyle = `rgba(255,246,176,${0.5 * shimmy})`
      x.beginPath()
      x.ellipse(px - 2, py - 1.5, 4, 1.6, 0, 0, 7)
      x.fill()
    }
  }
  // body
  const bg = x.createLinearGradient(-70, 0, 70, 0)
  bg.addColorStop(0, '#3a2a16')
  bg.addColorStop(0.45, '#54401f')
  bg.addColorStop(1, '#2c1e10')
  x.fillStyle = bg
  x.fillRect(-70, -34, 140, 58)
  // iron bands
  x.fillStyle = '#242a33'
  x.fillRect(-70, -30, 140, 9)
  x.fillRect(-70, 8, 140, 9)
  x.fillStyle = '#39424f'
  x.fillRect(-70, -30, 140, 3)
  x.fillRect(-70, 8, 140, 3)
  // lock plate
  x.fillStyle = '#ffcc2e'
  x.fillRect(-9, -22, 18, 20)
  x.fillStyle = '#6e4000'
  x.beginPath()
  x.arc(0, -12, 3.4, 0, 7)
  x.fill()
  // lid front lip when shut
  if (lid <= 0.02) {
    x.fillStyle = '#54401f'
    x.beginPath()
    x.moveTo(-70, -34)
    x.lineTo(70, -34)
    x.lineTo(70, -46)
    x.quadraticCurveTo(0, -66, -70, -46)
    x.closePath()
    x.fill()
    x.fillStyle = '#6a5432'
    x.fillRect(-70, -40, 140, 6)
  }
  x.restore()
}

// Loose gold coins flying/bouncing: events [{t,x,y,seed}], age = real t - e.t.
export function coinBurst(x, evts, t, life) {
  for (const e of evts) {
    const age = t - e.t
    if (age <= 0 || age > life) continue
    const r = rng(e.seed)
    for (let i = 0; i < 9; i++) {
      const a = hash(e.seed + i * 13) * 6.283
      const sp = (0.3 + hash(e.seed + i * 29) * 0.7) * 300
      const px = e.x + Math.cos(a) * sp * age
      const py = e.y + Math.sin(a) * sp * age * 0.6 - 140 * age + 420 * age * age
      if (py > H + 40) continue
      const spinW = Math.max(2, Math.abs(Math.cos(age * 9 + i)) * 9)
      x.globalAlpha = Math.max(0, 1 - age / life)
      x.fillStyle = i % 3 ? '#ffcc2e' : '#fff6b0'
      x.beginPath()
      x.ellipse(px, py, spinW, 7, Math.sin(age * 7 + i) * 0.7, 0, 7)
      x.fill()
      x.strokeStyle = '#6e4000'
      x.lineWidth = 1
      x.stroke()
    }
    x.globalAlpha = 1
  }
}

// Gold glitter puff (transform ticks): rising sparkle cloud, age-keyed.
export function glitter(x, evts, t, life = 0.9) {
  for (const e of evts) {
    const age = t - e.t
    if (age <= 0 || age > life) continue
    for (let i = 0; i < 16; i++) {
      const a = hash(e.seed + i * 7) * 6.283
      const rr = 14 + hash(e.seed + i * 3) * 66
      const px = e.x + Math.cos(a) * rr * (0.4 + age * 1.4)
      const py = e.y + Math.sin(a) * rr * 0.7 - age * (60 + hash(i) * 90)
      x.globalAlpha = (1 - age / life) * (0.5 + hash(i * 11) * 0.5)
      x.fillStyle = i % 4 ? '#ffcc2e' : '#fff6d8'
      const s2 = 2.5 + hash(e.seed + i) * 3.5
      x.fillRect(px, py, s2, s2)
    }
    x.globalAlpha = 1
  }
}

// Four-point star glint, k 0..1.
export function starGlint(x, cx, cy, s, k) {
  if (k <= 0 || k >= 1) return
  x.save()
  x.translate(cx, cy)
  x.globalAlpha = Math.sin(k * Math.PI)
  x.fillStyle = '#fff6d8'
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

// Grappling hook on a rope, flying from (x0,y0) to (x1,y1) by u; hook bites at u=1.
export function grapple(x, x0, y0, x1, y1, u) {
  if (u <= 0 || u > 1.15) return
  const cxq = (x0 + x1) / 2
  const cyq = Math.min(y0, y1) - 130
  const t = Math.min(1, u)
  const hx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cxq + t * t * x1
  const hy = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cyq + t * t * y1
  x.strokeStyle = '#8a6f48'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(x0, y0)
  x.quadraticCurveTo(cxq, cyq, hx, hy)
  x.stroke()
  // hook
  x.save()
  x.translate(hx, hy)
  x.rotate(t * 5 - 0.6)
  x.strokeStyle = '#39424f'
  x.lineWidth = 6
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(0, 0)
  x.lineTo(0, 18)
  x.moveTo(-12, 10)
  x.quadraticCurveTo(0, 26, 12, 10)
  x.stroke()
  x.strokeStyle = '#5a6a7c'
  x.lineWidth = 2
  x.beginPath()
  x.moveTo(0, 0)
  x.lineTo(0, 18)
  x.stroke()
  x.restore()
}

// Spyglass POV: paint AFTER the scene — dark surround with a circular window,
// chromatic fringe, hairline scratches.
export function spyglass(x, cx, cy, r, t) {
  x.save()
  x.fillStyle = '#020308'
  x.beginPath()
  x.rect(-40, -40, W + 80, H + 80)
  x.arc(cx, cy, r, 0, 7, true)
  x.fill('evenodd')
  const ring = (rr, col, w2, a) => {
    x.strokeStyle = col
    x.globalAlpha = a
    x.lineWidth = w2
    x.beginPath()
    x.arc(cx, cy, rr, 0, 7)
    x.stroke()
  }
  ring(r + 6, 'rgba(255,80,80,0.35)', 5, 1)
  ring(r + 12, 'rgba(90,160,255,0.3)', 7, 1)
  ring(r + 2, 'rgba(10,12,18,0.9)', 4, 1)
  x.globalAlpha = 0.16
  x.strokeStyle = '#dfe9f4'
  x.lineWidth = 1.4
  for (let i = 0; i < 7; i++) {
    const a = hash(i * 9) * 6.28
    const rr = r * (0.2 + hash(i * 5) * 0.75)
    x.beginPath()
    x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
    x.lineTo(cx + Math.cos(a) * (rr + 30 + hash(i) * 60), cy + Math.sin(a) * (rr + 30 + hash(i) * 60))
    x.stroke()
  }
  x.globalAlpha = 1
  // slow wobble of the whole view is done by the caller via cx/cy
  void t
  x.restore()
}

// Kraken tentacle rising from (bx, by): tapered curling limb with suckers on the
// inner edge and a rim-lit outer edge; o.comb draws the prop at the tip.
export function tentacle(x, bx, by, rise, t, o = {}) {
  if (rise <= 0.01) return
  const hgt = 430 * rise
  const curl = 0.9 + 0.25 * Math.sin(t * 1.1)
  const lean = o.lean ?? 0
  const n = 16
  const pt = (i) => {
    const u = i / n
    return [bx + Math.sin(u * 2.2 * curl + 0.4) * 80 * u + lean * u * u * 130, by - hgt * u]
  }
  // tapered ribbon: offset edges perpendicular to the spine, filled
  const wAt = (u) => 58 * (1 - u) * (1 - u * 0.3) + 8
  const edge = (side) => {
    x.beginPath()
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const [px, py] = pt(i)
      const [qx, qy] = pt(Math.min(n, i + 1))
      const [ax, ay] = pt(Math.max(0, i - 1))
      const dx = qx - ax, dy = qy - ay
      const l = Math.hypot(dx, dy) || 1
      const ox2 = (-dy / l) * wAt(u) * 0.5 * side
      const oy2 = (dx / l) * wAt(u) * 0.5 * side
      if (i === 0) x.moveTo(px + ox2, py + oy2)
      else x.lineTo(px + ox2, py + oy2)
    }
    for (let i = n; i >= 0; i--) {
      const u = i / n
      const [px, py] = pt(i)
      const [qx, qy] = pt(Math.min(n, i + 1))
      const [ax, ay] = pt(Math.max(0, i - 1))
      const dx = qx - ax, dy = qy - ay
      const l = Math.hypot(dx, dy) || 1
      const ox2 = (-dy / l) * wAt(u) * 0.5 * -side
      const oy2 = (dx / l) * wAt(u) * 0.5 * -side
      x.lineTo(px + ox2, py + oy2)
    }
    x.closePath()
    x.fill()
  }
  x.save()
  x.fillStyle = '#16242c'
  edge(1)
  x.fillStyle = '#243a44'
  edge(1)
  // inner light core
  x.save()
  x.beginPath()
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const [px, py] = pt(i)
    const [qx, qy] = pt(Math.min(n, i + 1))
    const [ax, ay] = pt(Math.max(0, i - 1))
    const dx = qx - ax, dy = qy - ay
    const l = Math.hypot(dx, dy) || 1
    const ox2 = (-dy / l) * wAt(u) * 0.22
    const oy2 = (dx / l) * wAt(u) * 0.22
    if (i === 0) x.moveTo(px + ox2, py + oy2)
    else x.lineTo(px + ox2, py + oy2)
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n
    const [px, py] = pt(i)
    const [qx, qy] = pt(Math.min(n, i + 1))
    const [ax, ay] = pt(Math.max(0, i - 1))
    const dx = qx - ax, dy = qy - ay
    const l = Math.hypot(dx, dy) || 1
    const ox2 = (-dy / l) * wAt(u) * -0.22
    const oy2 = (dx / l) * wAt(u) * -0.22
    x.lineTo(px + ox2, py + oy2)
  }
  x.closePath()
  x.fillStyle = '#31495a'
  x.fill()
  x.restore()
  // rim light on the moon side + suckers along the inner edge
  const [tx, ty] = pt(n)
  x.strokeStyle = 'rgba(150,190,220,0.4)'
  x.lineWidth = 3
  x.beginPath()
  for (let i = 2; i <= n; i++) {
    const u = i / n
    const [px, py] = pt(i)
    const [qx, qy] = pt(Math.min(n, i + 1))
    const [ax, ay] = pt(Math.max(0, i - 1))
    const dx = qx - ax, dy = qy - ay
    const l = Math.hypot(dx, dy) || 1
    const ox2 = (dy / l) * wAt(u) * 0.44
    const oy2 = (-dx / l) * wAt(u) * 0.44
    if (i === 2) x.moveTo(px + ox2, py + oy2)
    else x.lineTo(px + ox2, py + oy2)
  }
  x.stroke()
  for (let i = 3; i < n; i += 2) {
    const u = i / n
    const [px, py] = pt(i)
    const [qx, qy] = pt(Math.min(n, i + 1))
    const [ax, ay] = pt(Math.max(0, i - 1))
    const dx = qx - ax, dy = qy - ay
    const l = Math.hypot(dx, dy) || 1
    const rr = 7 * (1 - u * 0.5)
    const sx = px - (dy / l) * wAt(u) * 0.3
    const sy = py + (dx / l) * wAt(u) * 0.3
    x.fillStyle = '#9fb2be'
    x.beginPath()
    x.arc(sx, sy, rr, 0, 7)
    x.fill()
    x.fillStyle = '#5a6e7c'
    x.beginPath()
    x.arc(sx, sy, rr * 0.5, 0, 7)
    x.fill()
  }
  x.restore()
  const tip = pt(n)
  if (o.comb) comb(x, tip[0] + (o.combDx ?? 18), tip[1] + (o.combDy ?? 0), o.combAng ?? -0.6, o.combS ?? 1.2, o.combBent ?? false)
  return tip
}

// Dinner-plate kraken eye: o.open 0..1; iris tracks o.look (-1..1).
export function krakenEye(x, cx, cy, r, open, t, look = 0) {
  if (open <= 0.01) return
  const lid = (1 - open) * r * 1.1
  x.save()
  x.beginPath()
  x.arc(cx, cy, r, 0, 7)
  x.clip()
  // socket
  x.fillStyle = '#141b2b'
  x.fillRect(cx - r, cy - r, r * 2, r * 2)
  // sclera (bone-pale, veined)
  x.fillStyle = '#cfd4c2'
  x.beginPath()
  x.arc(cx, cy, r * 0.96, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(150,90,90,0.35)'
  x.lineWidth = 2
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 6.28 + 0.3
    x.beginPath()
    x.moveTo(cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94)
    x.quadraticCurveTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6 + 6, cx + Math.cos(a + 0.2) * r * 0.42, cy + Math.sin(a + 0.2) * r * 0.42)
    x.stroke()
  }
  // golden iris + slit pupil (tracks)
  const ix = cx + look * r * 0.3
  const ig = x.createRadialGradient(ix, cy, r * 0.08, ix, cy, r * 0.5)
  ig.addColorStop(0, '#ffe9ad')
  ig.addColorStop(0.6, '#e0a52e')
  ig.addColorStop(1, '#7a4a10')
  x.fillStyle = ig
  x.beginPath()
  x.arc(ix, cy, r * 0.5, 0, 7)
  x.fill()
  x.fillStyle = '#0a0c12'
  x.beginPath()
  x.ellipse(ix, cy, r * 0.09, r * 0.4, 0, 0, 7)
  x.fill()
  x.fillStyle = 'rgba(255,255,255,0.65)'
  x.beginPath()
  x.arc(ix - r * 0.16, cy - r * 0.2, r * 0.07, 0, 7)
  x.fill()
  x.restore()
  // eyelids: two rocky arcs parting
  x.fillStyle = '#1d2b33'
  x.beginPath()
  x.moveTo(cx - r * 1.1, cy - r)
  x.quadraticCurveTo(cx, cy - r + lid * 1.4, cx + r * 1.1, cy - r)
  x.lineTo(cx + r * 1.1, cy - r * 1.2)
  x.lineTo(cx - r * 1.1, cy - r * 1.2)
  x.closePath()
  x.fill()
  x.beginPath()
  x.moveTo(cx - r * 1.1, cy + r)
  x.quadraticCurveTo(cx, cy + r - lid, cx + r * 1.1, cy + r)
  x.lineTo(cx + r * 1.1, cy + r * 1.2)
  x.lineTo(cx - r * 1.1, cy + r * 1.2)
  x.closePath()
  x.fill()
  void t
}

// Barnacle cone on a rock ledge.
export function barnacle(x, cx, cy, s) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.fillStyle = '#8a8578'
  x.beginPath()
  x.moveTo(-10, 4)
  x.quadraticCurveTo(-8, -12, 0, -14)
  x.quadraticCurveTo(8, -12, 10, 4)
  x.closePath()
  x.fill()
  x.fillStyle = '#b8b2a4'
  x.beginPath()
  x.ellipse(0, -12, 6, 3, 0, 0, 7)
  x.fill()
  x.fillStyle = '#5a5648'
  x.beginPath()
  x.ellipse(0, 4, 12, 4, 0, 0, 7)
  x.fill()
  x.restore()
}

// Warm lantern glow (post + light) for dock/deck lamps.
export function lantern(x, cx, cy, k, o = {}) {
  if (k <= 0.01) return
  x.save()
  const g = x.createRadialGradient(cx, cy, 2, cx, cy, (o.r ?? 130) * k)
  g.addColorStop(0, `rgba(255,207,138,${o.a ?? 0.85})`)
  g.addColorStop(0.4, `rgba(255,180,90,${(o.a ?? 0.85) * 0.35})`)
  g.addColorStop(1, 'rgba(255,180,90,0)')
  x.fillStyle = g
  x.fillRect(cx - (o.r ?? 130) * k, cy - (o.r ?? 130) * k, (o.r ?? 130) * 2 * k, (o.r ?? 130) * 2 * k)
  x.fillStyle = '#ffd98a'
  x.beginPath()
  x.arc(cx, cy, 7 * k, 0, 7)
  x.fill()
  x.restore()
}

// Paper permit sheet + quill prop.
export function permit(x, cx, cy, rot, s) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  x.fillStyle = '#e7e0cc'
  x.fillRect(-52, -66, 104, 132)
  x.fillStyle = 'rgba(120,110,90,0.5)'
  for (let i = 0; i < 5; i++) x.fillRect(-40, -46 + i * 18, 80, 3)
  x.strokeStyle = '#b04030'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(-40, 34)
  x.quadraticCurveTo(-10, 46, 40, 30)
  x.stroke()
  x.restore()
}

// Simple rowboat with rowers (S8 horizon gag / S7 shore boats).
export function rowboat(x, cx, cy, s, t, rowers = 1, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  const rock = Math.sin(t * 1.8) * 0.05
  x.rotate(rock)
  x.fillStyle = '#3a2c1c'
  x.beginPath()
  x.moveTo(-52, -8)
  x.quadraticCurveTo(0, 10, 52, -8)
  x.lineTo(44, 4)
  x.quadraticCurveTo(0, 18, -44, 4)
  x.closePath()
  x.fill()
  x.fillStyle = '#57422a'
  x.fillRect(-52, -10, 104, 4)
  for (let i = 0; i < rowers; i++) {
    const rx = -18 + i * 36
    const pull = Math.sin(t * 3 + i * 1.4)
    x.fillStyle = o.col ?? '#1d2430'
    x.beginPath()
    x.ellipse(rx, -14, 9, 11, 0, 0, 7)
    x.fill()
    x.fillStyle = o.skin ?? '#c0aa98'
    x.beginPath()
    x.arc(rx, -27, 6.4, 0, 7)
    x.fill()
    x.strokeStyle = '#54401f'
    x.lineWidth = 3.4
    x.beginPath()
    x.moveTo(rx, -18)
    x.lineTo(rx + (o.face ?? 1) * (14 + pull * 12), -4 + pull * 8)
    x.stroke()
  }
  x.restore()
}

// Wake foam trail behind a hull point (pure t).
export function wake(x, sx0, sy0, dir, t, len = 260) {
  x.fillStyle = 'rgba(214,228,242,0.5)'
  for (let i = 0; i < 9; i++) {
    const u = i / 9
    const wx = sx0 + dir * (20 + u * len)
    const wy = sy0 + u * u * 26 + Math.sin(t * 2 + i * 1.7) * 4
    x.globalAlpha = 0.4 * (1 - u)
    x.beginPath()
    x.ellipse(wx, wy, 16 + u * 34, 4 + u * 7, 0, 0, 7)
    x.fill()
  }
  x.globalAlpha = 1
}
