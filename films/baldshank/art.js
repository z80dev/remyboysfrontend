// THE BALDSHANK REDEMPTION art: rig prep (prison-denim repaints, warden card-fan
// strip, sword -> tiny rock-comb, BROOKS cardigan, gray guard uniforms, the worn
// BALD CAP) + prepare-time bakes (rain-bus ridge road, gates yard, day/dusk/storm
// yards, intake shave room, cell interior, warden's office, FLOW LIBRARY, storm
// creek, hair-lined tunnel, Pacific beach) + pure per-frame painters (posters with
// painted manes, hair-snow, clippers, tiny comb, ledger pages, BUGLE front page,
// sprinkler rainbow, lightning, bald-cap sliver, THE CASCADE, wind manes, crow,
// rat, pigeon, dominoes). Pirates-cabald quality bar: ramped paint, seeded texture,
// no flat fills. Everything deterministic: hash/rng only, every painter pure in t.
import { hash, rng } from 'filmkit/lib.js'
import { canvas } from '../remy-bros/art.js'
import {
  W, H, SAFE, YARD, SHAVE_ROOM, CELL, POSTER_RECT, TUNNEL, CREEK, BEACH, OFFICE, BUS_RIDE, SNOW,
} from './timeline.js'

export const OS = 240 // overscan painted around the stage so camera moves never expose edges

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]
export const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
export const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
export function shadeHex(hex, k) {
  const [r, g, b] = hexRgb(hex)
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}
const lerp = (a, b, u) => a + (b - a) * u

// ============================== rig prep ==============================

export function tintR(R, color) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, R.w, R.h)
  return { ...R, c }
}

function whiteSil(c, w, h) {
  const s = canvas(w, h), x = s.getContext('2d')
  x.drawImage(c, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = '#fff'
  x.fillRect(0, 0, w, h)
  return s
}

// skin-ish pixels survive uniform repaints (hands/neck/face): warm hue, r >= g >= b.
const isSkin = (r, g, b) => r >= g - 4 && g >= b - 6 && r - b > 16 && r > 62

// Per-pixel cloth repaint of the torso band. Every non-skin pixel below yCut takes
// the ramp by lightness (this erases mirrored chest prints wholesale), then baked
// shaping (placket, pockets, collar) sells the garment. ramp = [dark, lo, mid, hi].
function clothRepaint(R, ramp, shape) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const yCut = R.top + Math.round((R.legTop - R.top) * 0.52)
  const yEnd = R.legTop + Math.round((R.h - R.legTop) * 0.28)
  for (let y = yCut; y < yEnd; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if (isSkin(r, g, b)) continue
      const L = (r + g + b) / 765
      const col = L < 0.22 ? ramp[0] : L < 0.42 ? ramp[1] : L < 0.68 ? ramp[2] : ramp[3]
      p[i] = col[0] + ((hash(xx * 31 + y * 7) - 0.5) * 10) | 0
      p[i + 1] = col[1] + ((hash(xx * 17 + y * 13) - 0.5) * 10) | 0
      p[i + 2] = col[2] + ((hash(xx * 7 + y * 29) - 0.5) * 10) | 0
    }
  x.putImageData(d, 0, 0)
  shape(x, R, yCut)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// Prison denim (chambray blue) — hero, RED, yard inmates. Center placket + pocket
// stitches + collar shadow, all in the shirt band only.
export function denim(R) {
  return clothRepaint(R, [hexRgb('#333f52'), hexRgb('#465871'), hexRgb('#5f7391'), hexRgb('#7c8fa6')], (x, R, yCut) => {
    const ty = R.legTop - 4
    x.strokeStyle = 'rgba(38,48,64,0.75)'
    x.lineWidth = 1.6
    x.beginPath()
    x.moveTo(R.cx, yCut + 3)
    x.lineTo(R.cx, ty)
    x.stroke()
    x.strokeStyle = 'rgba(150,168,190,0.5)'
    x.beginPath()
    x.moveTo(R.cx + 1.6, yCut + 4)
    x.lineTo(R.cx + 1.6, ty - 2)
    x.stroke()
    x.strokeStyle = 'rgba(38,48,64,0.55)'
    for (const px of [R.cx - 14, R.cx + 10]) {
      x.beginPath()
      x.moveTo(px, ty - 12)
      x.lineTo(px + 9, ty - 9)
      x.stroke()
    }
    x.fillStyle = 'rgba(30,38,50,0.5)'
    x.fillRect(R.cx - 12, yCut, 24, 2.4)
  })
}

// Cabald guard gray uniform — 3807/1558/2862 (jerseys/tees -> uniform; 2862 keeps
// his mustache, which lives above the band). Tie + brass badge baked.
export function grayUniform(R) {
  return clothRepaint(R, [hexRgb('#3c414a'), hexRgb('#565c66'), hexRgb('#767c86'), hexRgb('#9aa0a8')], (x, R, yCut) => {
    x.fillStyle = '#2c3038'
    x.fillRect(R.cx - 3, yCut + 2, 6, R.legTop - 8 - yCut)
    x.fillStyle = '#c9a441'
    x.fillRect(R.cx + 7, yCut + 10, 4, 3)
    x.strokeStyle = 'rgba(24,26,32,0.7)'
    x.lineWidth = 2
    x.beginPath()
    x.moveTo(R.cx - 15, yCut + 2)
    x.lineTo(R.cx - 11, R.legTop - 10)
    x.moveTo(R.cx + 15, yCut + 2)
    x.lineTo(R.cx + 11, R.legTop - 10)
    x.stroke()
    x.fillStyle = 'rgba(210,218,228,0.35)'
    x.fillRect(R.cx - 16, yCut, 32, 2)
  })
}

// BROOKS's librarian cardigan (erases the PILL print): brown tweed + button
// placket + collar V.
export function cardigan(R) {
  return clothRepaint(R, [hexRgb('#4a3620'), hexRgb('#6a4e2e'), hexRgb('#8a6a44'), hexRgb('#a8845c')], (x, R, yCut) => {
    x.strokeStyle = 'rgba(52,36,16,0.8)'
    x.lineWidth = 1.8
    x.beginPath()
    x.moveTo(R.cx - 2, yCut + 2)
    x.lineTo(R.cx - 2, R.legTop - 4)
    x.stroke()
    x.fillStyle = '#3c2a14'
    for (let i = 0; i < 3; i++) {
      x.beginPath()
      x.arc(R.cx - 2, yCut + 10 + i * ((R.legTop - 14 - yCut) / 2), 1.8, 0, 7)
      x.fill()
    }
    x.strokeStyle = 'rgba(150,116,72,0.55)'
    x.lineWidth = 1.4
    x.beginPath()
    x.moveTo(R.cx - 11, yCut + 1)
    x.lineTo(R.cx - 3, yCut + 12)
    x.moveTo(R.cx + 11, yCut + 1)
    x.lineTo(R.cx + 3, yCut + 12)
    x.stroke()
  })
}

// Strip the greatsword baked into a 42 sprite (near AND far geometry: the blade
// hugs the viewer-left edge, gray steel + yellow guard at hand height; per-scanline
// drop the detached left-edge run, then clear the left columns of blade-family
// colour, then sweep the crossing blade diagonally). Pattern from raiders art.js.
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
  const colCut = Math.max(16, Math.round(R.w * 0.3))
  for (let y = 0; y < R.h; y++)
    for (let xx = 0; xx < colCut * 0.6; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] === 0) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if (b >= r || (g > 150 && b < 90 && r > 140)) p[i + 3] = 0
    }
  for (let y = Math.round(R.h * 0.3); y < R.h; y++)
    for (let xx = 0; xx < colCut; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] === 0) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if ((b >= r + 8 && b > 80) || (g > 150 && b < 90 && r > 140)) p[i + 3] = 0
    }
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// The stripped sword hand now holds a TINY rock-comb (the contraband): a speck of
// gray stone with four teeth + a glint facet. Nearly microscopic at near scale;
// oversized on far rigs so it still reads at distance (casting risk 4).
export function combify(R, far) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const hx = Math.round(R.cx * 0.42), hy = R.legTop - (far ? 10 : 22)
  if (far) {
    x.fillStyle = '#6e7480'
    x.fillRect(hx - 4, hy, 9, 3)
    x.fillStyle = '#494f5a'
    for (let i = 0; i < 4; i++) x.fillRect(hx - 4 + i * 2.4, hy + 3, 1.6, 3)
    x.fillStyle = '#c9d2de'
    x.fillRect(hx - 3, hy, 2, 1)
  } else {
    x.fillStyle = '#6e7480'
    x.fillRect(hx - 4, hy, 9, 4)
    x.fillStyle = '#494f5a'
    for (let i = 0; i < 4; i++) x.fillRect(hx - 4 + i * 2.4, hy + 4, 1.6, 4)
    x.fillStyle = '#8a919e'
    x.fillRect(hx - 4, hy, 9, 1.4)
    x.fillStyle = '#c9d2de'
    x.fillRect(hx - 3, hy + 1, 2, 1.4)
  }
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// WARDEN 452: strip the playing-card fan at the viewer-left hand (casting risk 1).
// Pale card pixels in the hand region become tux black; the dark-skin hand stays.
export function stripCards(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const y0 = R.legTop - 42, y1 = R.legTop - 6
  for (let y = y0; y < y1; y++)
    for (let xx = 0; xx < R.cx; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      const pale = r > 150 && g > 110 && b > 100 && Math.max(r, g, b) - Math.min(r, g, b) < 70
      if (pale && !isSkin(r, g, b)) {
        p[i] = 22; p[i + 1] = 21; p[i + 2] = 26
      }
    }
  x.putImageData(d, 0, 0)
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// The BALD CAP: 42's crimson bob recoloured to his own skin ramp above the
// shoulders (fresh cap), plus a baked crown sheen and a seam ring — reads as the
// regulation shaved scalp at any scale. Sampled skin keeps the cap colour exact
// (casting risk 3); the crimson UNDER the cap only ever shows through the live
// sliver/rip painters.
export function baldCap(R) {
  const c = canvas(R.w, R.h), x = c.getContext('2d')
  x.drawImage(R.c, 0, 0)
  const d = x.getImageData(0, 0, R.w, R.h), p = d.data
  const yCut = R.top + Math.round((R.legTop - R.top) * 0.92)
  // sample the face for the cap colour
  const samples = []
  for (let y = R.top + 12; y < R.top + 40; y++)
    for (let xx = Math.round(R.cx * 0.5); xx < R.cx * 1.5; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] > 8 && isSkin(p[i], p[i + 1], p[i + 2])) samples.push([p[i], p[i + 1], p[i + 2]])
    }
  samples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]))
  const base = samples.length ? samples[samples.length >> 1] : [226, 202, 188]
  const hi = mix(base, [255, 246, 238], 0.35), shade = mix(base, [40, 28, 26], 0.22)
  const edgeRows = new Int16Array(R.w).fill(-1)
  for (let y = R.top; y < yCut; y++)
    for (let xx = 0; xx < R.w; xx++) {
      const i = (y * R.w + xx) * 4
      if (p[i + 3] < 8) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      const redHair = r > 84 && r > g * 1.32 && r > b * 1.32
      if (!redHair) continue
      edgeRows[xx] = y
      const col = y < R.top + (R.legTop - R.top) * 0.4 ? hi : base
      p[i] = col[0] + ((hash(xx * 13 + y * 3) - 0.5) * 8) | 0
      p[i + 1] = col[1] + ((hash(xx * 5 + y * 11) - 0.5) * 8) | 0
      p[i + 2] = col[2] + ((hash(xx * 23 + y * 7) - 0.5) * 8) | 0
    }
  x.putImageData(d, 0, 0)
  // cap edge: under-shade the lowest recoloured pixel of each column
  for (let xx = 0; xx < R.w; xx++) {
    const ey = edgeRows[xx]
    if (ey < 0) continue
    const i = (ey * R.w + xx) * 4
    x.fillStyle = css(shade, 0.85)
    x.fillRect(xx, ey, 1, 1.6)
    void i
  }
  // crown sheen + cap seam
  const sx = Math.round(R.cx * 0.8), sy = R.top + Math.round((R.legTop - R.top) * 0.18)
  x.fillStyle = 'rgba(255,250,244,0.3)'
  x.beginPath()
  x.ellipse(sx, sy, R.w * 0.12, R.w * 0.05, -0.5, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(70,50,44,0.28)'
  x.lineWidth = 1
  x.beginPath()
  x.moveTo(Math.round(R.cx * 0.45), sy + 3)
  x.quadraticCurveTo(R.cx, sy + 6, Math.round(R.cx * 1.55), sy + 3)
  x.stroke()
  return { ...R, c, sil: whiteSil(c, R.w, R.h) }
}

// ============================== image loading ==============================

async function loadImg(url) {
  const img = new Image()
  img.src = url
  await img.decode()
  return img
}

// ============================== the pin-up posters ==============================

// Poster comps from the orig 600x600 renders (opaque), cropped to the 3:4 frame,
// chest prints cleaned, manes painted fuller (casting.md: the poster IS the
// promise), title band + tagline. kinds match SIGNAGE POSTER_*.
export const POSTER_ART = {
  rita: { id: 825, crop: [40, 0, 490, 600], head: [232, 208, 96], hair: '#8a3c3b', title: 'RITA HAIRWORTH', tag: 'VOLUME.', clean: 'green' },
  flowlyn: { id: 12, crop: [20, 0, 470, 600], head: [250, 210, 110], hair: '#b89a4e', title: 'FLOWLYN MONROE', tag: 'WAVE.', clean: null },
  raquel: { id: 139, crop: [110, 0, 560, 600], head: [238, 216, 92], hair: '#2b2c30', title: 'RAQUEL MANE', tag: 'ROOTED.', clean: 'red' },
}

export async function posterBake(kind, pw = 600, ph = 800) {
  const art = POSTER_ART[kind]
  const img = await loadImg(new URL(`../../media/remy/Character${art.id}.webp`, import.meta.url).href)
  const c = canvas(pw, ph), x = c.getContext('2d')
  x.imageSmoothingEnabled = true
  const [cxr, cyr, cwr, chr] = art.crop
  x.drawImage(img, cxr, cyr, cwr, chr, 0, 0, pw, ph)
  // clean the chest print (poster art, not the sprite): repaint the garment family
  const d = x.getImageData(0, 0, pw, ph), p = d.data
  for (let y = Math.round(ph * 0.52); y < ph; y++)
    for (let xx = 0; xx < pw; xx++) {
      const i = (y * pw + xx) * 4
      if (p[i + 3] < 8) continue
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if (art.clean === 'green' && g > r + 12 && g > b + 12) {
        const L = (r + g + b) / 765
        const col = mix(hexRgb('#2e5c34'), hexRgb('#4a8a50'), cl((L - 0.15) / 0.5))
        p[i] = col[0]; p[i + 1] = col[1]; p[i + 2] = col[2]
      }
      if (art.clean === 'red' && r > g + 46 && r > b + 46 && y > ph * 0.56) {
        p[i] = 238; p[i + 1] = 234; p[i + 2] = 226
      }
    }
  x.putImageData(d, 0, 0)
  // THE MANE: painted fuller than any quest original (casting.md honest note) —
  // seeded ribbons hug the head rim and spill past the shoulders.
  const [hx, hy, hr] = [art.head[0] * pw / (art.crop[2]), art.head[1] * ph / 600, art.head[2] * pw / art.crop[2]]
  const r = rng(art.id + 7)
  const ramp = [shadeHex(art.hair, 0.55), art.hair, shadeHex(art.hair, 1.35)]
  for (let i = 0; i < 22; i++) {
    const side = r() > 0.5 ? 1 : -1
    const a0 = -0.5 + r() * 2.2
    const x0 = hx + Math.cos(a0) * hr * (0.8 + r() * 0.3) * (side > 0 ? 1 : 1)
    const y0 = hy + Math.sin(a0) * hr * 0.62
    const len = hr * (1.6 + r() * 2.6)
    const sweep = (0.5 + r()) * hr * side
    x.strokeStyle = ramp[i % 3]
    x.lineWidth = hr * (0.1 + r() * 0.14)
    x.lineCap = 'round'
    x.globalAlpha = 0.92
    x.beginPath()
    x.moveTo(x0, y0)
    x.bezierCurveTo(x0 + sweep * 0.4, y0 + len * 0.4, x0 + sweep, y0 + len * 0.7, x0 + sweep * 0.7 + Math.sin(i * 2.4) * 8, y0 + len)
    x.stroke()
  }
  x.globalAlpha = 1
  // crown wisp set on top
  for (let i = 0; i < 7; i++) {
    const a0 = -2.4 + i * 0.32
    x.strokeStyle = i % 2 ? ramp[2] : ramp[1]
    x.lineWidth = hr * 0.07
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(hx + Math.cos(a0) * hr * 0.7, hy + Math.sin(a0) * hr * 0.5)
    x.quadraticCurveTo(hx + Math.cos(a0) * hr * 1.15, hy + Math.sin(a0) * hr * 0.9 - 10, hx + Math.cos(a0) * hr * 1.3, hy + Math.sin(a0) * hr * 1.15 + 6)
    x.stroke()
  }
  // title band + tagline
  const bandY = Math.round(ph * 0.82)
  const bg = x.createLinearGradient(0, bandY - 8, 0, ph)
  bg.addColorStop(0, 'rgba(12,10,14,0)')
  bg.addColorStop(0.25, 'rgba(12,10,14,0.78)')
  bg.addColorStop(1, 'rgba(12,10,14,0.92)')
  x.fillStyle = bg
  x.fillRect(0, bandY - 8, pw, ph - bandY + 8)
  x.fillStyle = '#e8b23a'
  x.font = `700 ${Math.round(pw * 0.085)}px Anton`
  x.textAlign = 'center'
  x.fillText(art.title, pw / 2, bandY + pw * 0.075)
  x.fillStyle = '#f2ede0'
  x.font = `italic 700 ${Math.round(pw * 0.05)}px "Cormorant Garamond"`
  x.fillText(art.tag, pw / 2, bandY + pw * 0.135)
  x.textAlign = 'left'
  // pin frame
  x.strokeStyle = '#8a744c'
  x.lineWidth = Math.max(6, Math.round(pw * 0.016))
  x.strokeRect(4, 4, pw - 8, ph - 8)
  x.strokeStyle = 'rgba(240,228,190,0.35)'
  x.lineWidth = 2
  x.strokeRect(4 + pw * 0.016, 4 + pw * 0.016, pw - 8 - pw * 0.032, ph - 8 - pw * 0.032)
  return c
}

// ============================== bakes ==============================

// ---- shared painters used by more than one bake ----
function grayWall(x, w, h, top, base, r) {
  const g = x.createLinearGradient(0, top, 0, base)
  g.addColorStop(0, '#4c4f56')
  g.addColorStop(0.5, '#585c64')
  g.addColorStop(1, '#3c4048')
  x.fillStyle = g
  x.fillRect(-OS, top, w + OS * 2, base - top)
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(20,22,28,${0.05 + r() * 0.09})`
    x.beginPath()
    x.ellipse(r() * w, top + r() * (base - top), 24 + r() * 90, 8 + r() * 26, r(), 0, 7)
    x.fill()
  }
  // block courses
  for (let by = top + 46; by < base; by += 64) {
    x.fillStyle = 'rgba(16,18,24,0.4)'
    x.fillRect(-OS, by, w + OS * 2, 4)
    for (let bx = ((by / 64) | 0) % 2 ? -50 : 0; bx < w + OS; bx += 140) {
      x.fillStyle = 'rgba(16,18,24,0.32)'
      x.fillRect(bx, by, 3, 64)
    }
  }
}

// Tower with a searchlight lamp (beam painted live).
function guardTower(x, tx, baseY, s) {
  x.save()
  x.translate(tx, baseY)
  x.scale(s, s)
  x.fillStyle = '#3a3e46'
  x.fillRect(-46, -300, 92, 300)
  x.fillStyle = 'rgba(18,20,26,0.5)'
  for (let i = 0; i < 6; i++) x.fillRect(-46, -290 + i * 50, 92, 5)
  x.fillStyle = '#4a4e58'
  x.fillRect(-62, -330, 124, 34)
  x.beginPath()
  x.moveTo(-78, -330)
  x.lineTo(0, -392)
  x.lineTo(78, -330)
  x.closePath()
  x.fill()
  x.fillStyle = '#1c1e24'
  x.fillRect(-30, -300, 60, 60)
  x.fillStyle = '#2c3038'
  x.beginPath()
  x.ellipse(0, -268, 20, 13, -0.5, 0, 7)
  x.fill()
  x.fillStyle = '#c9b46a'
  x.beginPath()
  x.arc(6, -270, 7, 0, 7)
  x.fill()
  x.restore()
}

function chainFence(x, x0, x1, baseY, hgt) {
  x.strokeStyle = 'rgba(40,44,52,0.85)'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(x0, baseY - hgt)
  x.lineTo(x1, baseY - hgt)
  x.stroke()
  x.lineWidth = 2
  for (let px = x0; px < x1; px += 14) {
    x.beginPath()
    x.moveTo(px, baseY)
    x.lineTo(px + 7, baseY - hgt)
    x.moveTo(px + 7, baseY)
    x.lineTo(px, baseY - hgt)
    x.stroke()
  }
  for (let px = x0; px <= x1; px += 220) {
    x.fillStyle = '#34383f'
    x.fillRect(px - 3, baseY - hgt, 6, hgt)
  }
}

// ---- s1a: the rain-bus ridge road + prison walls (world 3600 wide) ----
export function busBake() {
  const w = 3600
  const c = canvas(w + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(1947)
  x.translate(OS, OS)
  // storm sky
  const g = x.createLinearGradient(0, -OS, 0, BUS_RIDE.roadY)
  g.addColorStop(0, '#23262e')
  g.addColorStop(0.5, '#3a3e48')
  g.addColorStop(0.82, '#565a64')
  g.addColorStop(1, '#6a6e78')
  x.fillStyle = g
  x.fillRect(-OS, -OS, w + OS * 2, BUS_RIDE.roadY + OS)
  for (let i = 0; i < 26; i++) {
    x.fillStyle = `rgba(12,14,18,${0.2 + r() * 0.25})`
    x.beginPath()
    x.ellipse(r() * w, 60 + r() * 260, 130 + r() * 220, 26 + r() * 40, 0, 0, 7)
    x.fill()
  }
  // far ridges (two parallax bands)
  x.fillStyle = '#3e4650'
  x.beginPath()
  x.moveTo(-OS, BUS_RIDE.ridgeY + 80)
  for (let px = -OS; px <= w + OS; px += 90) x.lineTo(px, BUS_RIDE.ridgeY + Math.sin(px * 0.004 + 1) * 46 + Math.sin(px * 0.011) * 18)
  x.lineTo(w + OS, BUS_RIDE.wallY + 40)
  x.lineTo(-OS, BUS_RIDE.wallY + 40)
  x.closePath()
  x.fill()
  x.fillStyle = '#343b44'
  x.beginPath()
  x.moveTo(-OS, BUS_RIDE.ridgeY + 150)
  for (let px = -OS; px <= w + OS; px += 80) x.lineTo(px, BUS_RIDE.ridgeY + 90 + Math.sin(px * 0.006 + 3) * 40 + Math.sin(px * 0.017 + 1) * 14)
  x.lineTo(w + OS, BUS_RIDE.wallY + 60)
  x.lineTo(-OS, BUS_RIDE.wallY + 60)
  x.closePath()
  x.fill()
  // the wall band with razor wire + towers
  grayWall(x, w, H, BUS_RIDE.wallY, BUS_RIDE.wallY + 170, r)
  x.strokeStyle = '#2a2e36'
  x.lineWidth = 3
  for (let px = -OS; px < w + OS; px += 46) {
    x.beginPath()
    x.moveTo(px, BUS_RIDE.wallY - 2)
    x.quadraticCurveTo(px + 23, BUS_RIDE.wallY - 16, px + 46, BUS_RIDE.wallY - 2)
    x.stroke()
    x.beginPath()
    x.moveTo(px + 23, BUS_RIDE.wallY - 14)
    x.lineTo(px + 23, BUS_RIDE.wallY - 24)
    x.stroke()
  }
  guardTower(x, 700, BUS_RIDE.wallY + 166, 1)
  guardTower(x, 2300, BUS_RIDE.wallY + 166, 1)
  // road
  const rg = x.createLinearGradient(0, BUS_RIDE.roadY - 60, 0, H + OS)
  rg.addColorStop(0, '#43464e')
  rg.addColorStop(0.4, '#3a3d44')
  rg.addColorStop(1, '#2c2f36')
  x.fillStyle = rg
  x.fillRect(-OS, BUS_RIDE.roadY - 60, w + OS * 2, H + OS - BUS_RIDE.roadY + 60)
  x.fillStyle = 'rgba(200,206,216,0.16)'
  for (let px = -100; px < w + OS; px += 240) x.fillRect(px, BUS_RIDE.roadY + 40, 130, 7)
  // wet sheen pools
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(190,200,220,${0.03 + r() * 0.05})`
    x.beginPath()
    x.ellipse(r() * w, BUS_RIDE.roadY + r() * 160, 30 + r() * 90, 4 + r() * 9, 0, 0, 7)
    x.fill()
  }
  return c
}

// The prison bus (side view, facing +x): rain-streaked windows, gray bodies.
export function busProp(x, cx, baseY, s) {
  x.save()
  x.translate(cx, baseY)
  x.scale(s, s)
  const w = 640, h = 210
  const g = x.createLinearGradient(0, -h, 0, 0)
  g.addColorStop(0, '#4c5866')
  g.addColorStop(0.5, '#3c4654')
  g.addColorStop(1, '#2a323e')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(-w / 2, 0)
  x.lineTo(-w / 2, -h + 34)
  x.quadraticCurveTo(-w / 2, -h, -w / 2 + 30, -h)
  x.lineTo(w / 2 - 44, -h)
  x.quadraticCurveTo(w / 2, -h, w / 2, -h + 40)
  x.lineTo(w / 2, 0)
  x.closePath()
  x.fill()
  // window band with bowed heads
  x.fillStyle = '#181d26'
  x.fillRect(-w / 2 + 24, -h + 22, w - 60, 62)
  for (let i = 0; i < 8; i++) {
    const wx = -w / 2 + 44 + i * 72
    x.fillStyle = 'rgba(200,210,224,0.12)'
    x.fillRect(wx - 20, -h + 26, 44, 54)
    x.fillStyle = '#0c0f16'
    x.beginPath()
    x.arc(wx, -h + 52, 13, 0, 7)
    x.fill()
    x.fillRect(wx - 11, -h + 60, 22, 18)
  }
  // stripe + wheels + wet splash
  x.fillStyle = '#c9a441'
  x.fillRect(-w / 2, -46, w, 7)
  for (const wx of [-w / 2 + 90, w / 2 - 110]) {
    x.fillStyle = '#14161c'
    x.beginPath()
    x.arc(wx, -8, 34, 0, 7)
    x.fill()
    x.fillStyle = '#3c4048'
    x.beginPath()
    x.arc(wx, -8, 13, 0, 7)
    x.fill()
  }
  x.fillStyle = 'rgba(190,200,220,0.2)'
  x.beginPath()
  x.ellipse(-w / 2 + 60, -4, 60, 7, 0, 0, 7)
  x.fill()
  x.restore()
}

// ---- s1b/s2/s3b/s5b/title: THE YARD (world 2400) in moods ----
export function yardBake(mood) {
  const w = 2400
  const c = canvas(w + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(mood === 'day' ? 21 : mood === 'dusk' ? 22 : 23)
  x.translate(OS, OS)
  // sky
  const g = x.createLinearGradient(0, -OS, 0, YARD.horizonY + 60)
  if (mood === 'day') {
    g.addColorStop(0, '#7c8894')
    g.addColorStop(0.7, '#9aa2ac')
    g.addColorStop(1, '#b4bac2')
  } else if (mood === 'dusk') {
    g.addColorStop(0, '#2c2438')
    g.addColorStop(0.55, '#5c4258')
    g.addColorStop(0.85, '#8a5a4e')
    g.addColorStop(1, '#a8724e')
  } else {
    g.addColorStop(0, '#1c202a')
    g.addColorStop(0.6, '#2c323e')
    g.addColorStop(1, '#424854')
  }
  x.fillStyle = g
  x.fillRect(-OS, -OS, w + OS * 2, YARD.horizonY + 60 + OS)
  for (let i = 0; i < 18; i++) {
    x.fillStyle = mood === 'day' ? `rgba(240,244,248,${0.12 + r() * 0.14})` : `rgba(16,18,26,${0.16 + r() * 0.2})`
    x.beginPath()
    x.ellipse(r() * w, 80 + r() * 220, 120 + r() * 180, 22 + r() * 34, 0, 0, 7)
    x.fill()
  }
  if (mood === 'dusk') {
    const sun = x.createRadialGradient(1720, 400, 20, 1720, 400, 260)
    sun.addColorStop(0, 'rgba(255,214,150,0.5)')
    sun.addColorStop(1, 'rgba(255,214,150,0)')
    x.fillStyle = sun
    x.fillRect(1420, 140, 600, 520)
  }
  // yard walls: inner face with the rim + towers beyond
  grayWall(x, w, H, YARD.wallTopY, YARD.wallBaseY, r)
  x.fillStyle = mood === 'dusk' ? 'rgba(255,190,120,0.14)' : 'rgba(220,228,240,0.1)'
  x.fillRect(-OS, YARD.wallTopY, w + OS * 2, 26)
  guardTower(x, 420, YARD.wallBaseY, 0.9)
  guardTower(x, 1500, YARD.wallBaseY, 0.9)
  // gate (left): steel doors + lamp
  const gx = YARD.gateX
  x.fillStyle = '#2c303a'
  x.fillRect(gx - 90, YARD.wallBaseY - 330, 180, 330)
  x.strokeStyle = '#1c2028'
  x.lineWidth = 5
  for (let i = 1; i < 4; i++) {
    x.beginPath()
    x.moveTo(gx - 90, YARD.wallBaseY - 330 + i * 82)
    x.lineTo(gx + 90, YARD.wallBaseY - 330 + i * 82)
    x.stroke()
  }
  x.fillStyle = '#48505e'
  x.fillRect(gx - 96, YARD.wallBaseY - 344, 192, 18)
  x.fillStyle = '#c9a441'
  x.beginPath()
  x.arc(gx, YARD.wallBaseY - 366, 10, 0, 7)
  x.fill()
  // fence + THE SIGN (YARD_SIGN: NO FLOW BEYOND THIS POINT) on the fence line
  chainFence(x, YARD.fence[0], YARD.fence[1], YARD.groundY, 210)
  const signX = 1180, signY = YARD.groundY - 240
  x.fillStyle = '#5c626e'
  x.fillRect(signX - 6, signY, 12, 240)
  x.fillStyle = '#d9d4c4'
  x.fillRect(signX - 128, signY - 56, 256, 64)
  x.strokeStyle = '#8a2f26'
  x.lineWidth = 5
  x.strokeRect(signX - 120, signY - 48, 240, 48)
  x.fillStyle = '#8a2f26'
  x.font = `700 27px "Space Grotesk"`
  x.textAlign = 'center'
  x.fillText('NO FLOW', signX, signY - 22)
  x.fillText('BEYOND THIS POINT', signX, signY + 6)
  x.textAlign = 'left'
  // PA speaker pole
  x.strokeStyle = '#2c3038'
  x.lineWidth = 8
  x.beginPath()
  x.moveTo(YARD.speakersX, YARD.groundY)
  x.lineTo(YARD.speakersX, YARD.wallBaseY - 60)
  x.stroke()
  x.fillStyle = '#3c424c'
  for (const dx of [-26, 26]) {
    x.beginPath()
    x.moveTo(YARD.speakersX + dx - 14, YARD.wallBaseY - 66)
    x.lineTo(YARD.speakersX + dx + 14, YARD.wallBaseY - 66)
    x.lineTo(YARD.speakersX + dx, YARD.wallBaseY - 26)
    x.closePath()
    x.fill()
  }
  // yard ground: packed dirt + puddles by mood
  const gg = x.createLinearGradient(0, YARD.horizonY + 40, 0, H + OS)
  if (mood === 'day') {
    gg.addColorStop(0, '#8a7a58')
    gg.addColorStop(0.5, '#7c6e4e')
    gg.addColorStop(1, '#685c40')
  } else if (mood === 'dusk') {
    gg.addColorStop(0, '#6a5442')
    gg.addColorStop(0.5, '#584636')
    gg.addColorStop(1, '#443628')
  } else {
    gg.addColorStop(0, '#4c483c')
    gg.addColorStop(0.5, '#423e34')
    gg.addColorStop(1, '#343028')
  }
  x.fillStyle = gg
  x.fillRect(-OS, YARD.horizonY + 40, w + OS * 2, H + OS - YARD.horizonY - 40)
  for (let i = 0; i < 70; i++) {
    x.fillStyle = `rgba(30,26,18,${0.06 + r() * 0.1})`
    x.beginPath()
    x.ellipse(r() * w, YARD.horizonY + 60 + r() * 320, 30 + r() * 110, 6 + r() * 14, 0, 0, 7)
    x.fill()
  }
  if (mood !== 'day') {
    for (let i = 0; i < 16; i++) {
      x.fillStyle = `rgba(180,190,210,${0.05 + r() * 0.07})`
      x.beginPath()
      x.ellipse(r() * w, YARD.horizonY + 140 + r() * 260, 40 + r() * 90, 6 + r() * 10, 0, 0, 7)
      x.fill()
    }
  }
  // croquet wickets + a bent shed-tuft wicket (gag C4) baked into the lawn
  for (const [wx, bent] of [[520, false], [880, true], [1660, false]]) {
    x.strokeStyle = '#4c4234'
    x.lineWidth = 6
    x.beginPath()
    if (bent) {
      x.moveTo(wx - 26, YARD.groundY)
      x.quadraticCurveTo(wx - 20, YARD.groundY - 60, wx + 6, YARD.groundY - 66)
      x.moveTo(wx + 26, YARD.groundY)
      x.quadraticCurveTo(wx + 18, YARD.groundY - 54, wx - 2, YARD.groundY - 62)
      // shed tuft on the bent wicket
      x.strokeStyle = '#7c6a48'
      x.lineWidth = 3
      for (let i = 0; i < 7; i++) {
        x.beginPath()
        x.moveTo(wx + (i - 3) * 4, YARD.groundY - 62)
        x.quadraticCurveTo(wx + (i - 3) * 7, YARD.groundY - 84, wx + (i - 3) * 10, YARD.groundY - 96 - (3 - Math.abs(i - 3)) * 6)
        x.stroke()
      }
    } else {
      x.moveTo(wx - 26, YARD.groundY)
      x.lineTo(wx - 20, YARD.groundY - 64)
      x.moveTo(wx + 26, YARD.groundY)
      x.lineTo(wx + 20, YARD.groundY - 64)
      x.moveTo(wx - 22, YARD.groundY - 62)
      x.lineTo(wx + 22, YARD.groundY - 62)
    }
    x.stroke()
  }
  return c
}

// ---- s1c: the intake SHAVE ROOM (world 2160) ----
export function shaveBake() {
  const w = 2160
  const c = canvas(w + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(9)
  x.translate(OS, OS)
  // green-tile wall band + upper plaster
  const g = x.createLinearGradient(0, -OS, 0, SHAVE_ROOM.lineY)
  g.addColorStop(0, '#5a6058')
  g.addColorStop(0.4, '#687066')
  g.addColorStop(1, '#525850')
  x.fillStyle = g
  x.fillRect(-OS, -OS, w + OS * 2, SHAVE_ROOM.lineY + OS)
  x.fillStyle = '#3c443c'
  x.fillRect(-OS, SHAVE_ROOM.lineY - 60, w + OS * 2, 60)
  // tile grid with grout + a few cracked tiles
  const ts = 46
  for (let ty = 120; ty < SHAVE_ROOM.lineY; ty += ts)
    for (let tx = -((ty / ts) | 0) % 2 * ts / 2; tx < w + OS; tx += ts) {
      x.strokeStyle = 'rgba(28,34,30,0.5)'
      x.lineWidth = 2
      x.strokeRect(tx, ty, ts, ts)
      const tg = x.createLinearGradient(tx, ty, tx + ts, ty + ts)
      tg.addColorStop(0, 'rgba(220,232,222,0.14)')
      tg.addColorStop(1, 'rgba(20,28,22,0.16)')
      x.fillStyle = tg
      x.fillRect(tx, ty, ts, ts)
      if (r() > 0.93) {
        x.strokeStyle = 'rgba(16,20,16,0.6)'
        x.lineWidth = 1.6
        x.beginPath()
        x.moveTo(tx + r() * ts, ty)
        x.lineTo(tx + r() * ts, ty + ts)
        x.stroke()
      }
    }
  // mirror row over the chairs
  for (const mx of SHAVE_ROOM.chairs) {
    x.fillStyle = '#2c3430'
    x.fillRect(mx - 52, 300, 104, 150)
    const mg = x.createLinearGradient(mx - 44, 308, mx + 44, 442)
    mg.addColorStop(0, '#9fb2b8')
    mg.addColorStop(0.5, '#c2d4d8')
    mg.addColorStop(1, '#8ba0a8')
    x.fillStyle = mg
    x.fillRect(mx - 44, 308, 88, 134)
    x.fillStyle = 'rgba(240,248,250,0.35)'
    x.beginPath()
    x.moveTo(mx - 34, 442)
    x.lineTo(mx - 6, 308)
    x.lineTo(mx + 10, 308)
    x.lineTo(mx - 18, 442)
    x.closePath()
    x.fill()
  }
  // sign band: FIRST SHAVE FREE. ALL SHAVES FREE.
  x.fillStyle = '#d9d4c4'
  x.fillRect(760, SHAVE_ROOM.signY - 40, 460, 74)
  x.strokeStyle = '#8a2f26'
  x.lineWidth = 5
  x.strokeRect(768, SHAVE_ROOM.signY - 32, 444, 58)
  x.fillStyle = '#1c2028'
  x.font = `700 30px "Space Grotesk"`
  x.textAlign = 'center'
  x.fillText('FIRST SHAVE FREE. ALL SHAVES FREE.', 990, SHAVE_ROOM.signY + 6)
  x.textAlign = 'left'
  // the window (yard beyond: gray light)
  const wx0 = SHAVE_ROOM.window[0], wx1 = SHAVE_ROOM.window[1]
  x.fillStyle = '#262c26'
  x.fillRect(wx0 - 14, 280, wx1 - wx0 + 28, 300)
  const wg = x.createLinearGradient(0, 294, 0, 566)
  wg.addColorStop(0, '#aab4bc')
  wg.addColorStop(1, '#7c868e')
  x.fillStyle = wg
  x.fillRect(wx0, 294, wx1 - wx0, 272)
  x.strokeStyle = '#262c26'
  x.lineWidth = 10
  x.beginPath()
  x.moveTo((wx0 + wx1) / 2, 294)
  x.lineTo((wx0 + wx1) / 2, 566)
  x.moveTo(wx0, 430)
  x.lineTo(wx1, 430)
  x.stroke()
  // floor: checker + drain
  const fg = x.createLinearGradient(0, SHAVE_ROOM.lineY - 40, 0, H + OS)
  fg.addColorStop(0, '#4c5048')
  fg.addColorStop(1, '#2e322c')
  x.fillStyle = fg
  x.fillRect(-OS, SHAVE_ROOM.lineY - 40, w + OS * 2, H + OS - SHAVE_ROOM.lineY + 40)
  for (let fy = SHAVE_ROOM.lineY - 40; fy < H + OS; fy += 58)
    for (let fx = ((fy / 58) | 0) % 2 * 29 - 29; fx < w + OS; fx += 58) {
      x.fillStyle = ((fx / 29) | 0) % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'
      x.fillRect(fx, fy, 29, 58)
    }
  x.fillStyle = '#22261f'
  x.beginPath()
  x.ellipse(1000, SHAVE_ROOM.lineY + 60, 40, 10, 0, 0, 7)
  x.fill()
  // barber chair row (the chairs sit behind the seated rigs; painted low)
  for (const cx of SHAVE_ROOM.chairs) {
    x.fillStyle = '#2a2e34'
    x.fillRect(cx - 54, SHAVE_ROOM.lineY - 64, 108, 30)
    x.fillStyle = '#3c424a'
    x.fillRect(cx - 44, SHAVE_ROOM.lineY - 34, 88, 40)
    x.fillRect(cx - 12, SHAVE_ROOM.lineY + 6, 24, 34)
    x.fillStyle = '#22262c'
    x.beginPath()
    x.ellipse(cx, SHAVE_ROOM.lineY + 44, 44, 10, 0, 0, 7)
    x.fill()
  }
  return c
}

// ---- cell interior (world 2200): bunk, desk, chart wall, THE POSTER WALL ----
// The poster rect is left as taped blank wall (posters hang live; the tunnel mouth
// hides behind it). Growth-chart labels are painted live (they climb).
export function cellBake() {
  const w = 2200
  const c = canvas(w + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(42)
  x.translate(OS, OS)
  // plaster wall
  const g = x.createLinearGradient(0, -OS, 0, CELL.floorY)
  g.addColorStop(0, '#5c5648')
  g.addColorStop(0.55, '#6a6354')
  g.addColorStop(1, '#544e40')
  x.fillStyle = g
  x.fillRect(-OS, -OS, w + OS * 2, CELL.floorY + OS)
  for (let i = 0; i < 120; i++) {
    x.fillStyle = `rgba(30,26,18,${0.04 + r() * 0.09})`
    x.beginPath()
    x.ellipse(r() * w, r() * CELL.floorY, 30 + r() * 100, 10 + r() * 30, r(), 0, 7)
    x.fill()
  }
  // damp stains + hairline cracks
  for (let i = 0; i < 5; i++) {
    const sx = 200 + i * 430 + r() * 160
    const sg = x.createLinearGradient(0, CELL.beamY, 0, CELL.beamY + 260)
    sg.addColorStop(0, 'rgba(40,34,22,0.2)')
    sg.addColorStop(1, 'rgba(40,34,22,0)')
    x.fillStyle = sg
    x.beginPath()
    x.moveTo(sx, CELL.beamY)
    x.quadraticCurveTo(sx + 30, CELL.beamY + 130, sx - 14, CELL.beamY + 260)
    x.lineTo(sx + 40, CELL.beamY + 260)
    x.quadraticCurveTo(sx + 60, CELL.beamY + 120, sx + 46, CELL.beamY)
    x.closePath()
    x.fill()
  }
  // tally scratches near the poster wall (19 years of them)
  x.strokeStyle = 'rgba(36,30,20,0.5)'
  x.lineWidth = 2
  for (let i = 0; i < 40; i++) {
    const tx = 660 + (i % 20) * 11 + ((i / 20) | 0) * 26, ty = 520 + ((i / 20) | 0) * 40
    x.beginPath()
    x.moveTo(tx + hash(i) * 6, ty)
    x.lineTo(tx + hash(i) * 6 + (i % 5 === 4 ? -14 : 0), ty + 16)
    x.stroke()
  }
  // beam + ceiling shadow
  x.fillStyle = '#3a3226'
  x.fillRect(-OS, CELL.beamY - 34, w + OS * 2, 34)
  x.fillStyle = '#2c261c'
  x.fillRect(-OS, CELL.beamY - 40, w + OS * 2, 8)
  const cg = x.createLinearGradient(0, -OS, 0, CELL.beamY)
  cg.addColorStop(0, 'rgba(0,0,0,0.75)')
  cg.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = cg
  x.fillRect(-OS, -OS, w + OS * 2, CELL.beamY + OS)
  // growth-chart wall plate (labels painted live by growthChart)
  x.fillStyle = 'rgba(38,32,22,0.35)'
  x.fillRect(CELL.chartX - 120, 300, 240, 360)
  x.strokeStyle = 'rgba(210,200,170,0.2)'
  x.lineWidth = 2
  x.strokeRect(CELL.chartX - 114, 306, 228, 348)
  // bunk (left)
  x.fillStyle = '#3c3428'
  x.fillRect(CELL.bunkX - 130, CELL.floorY - 130, 300, 22)
  x.fillStyle = '#6a6250'
  x.fillRect(CELL.bunkX - 124, CELL.floorY - 152, 288, 24)
  x.fillStyle = '#7a7260'
  x.fillRect(CELL.bunkX - 124, CELL.floorY - 178, 90, 30)
  x.fillStyle = '#5c5442'
  x.fillRect(CELL.bunkX - 118, CELL.floorY - 108, 12, 108)
  x.fillRect(CELL.bunkX + 148, CELL.floorY - 108, 12, 108)
  // desk + stool (right)
  x.fillStyle = '#4c4234'
  x.fillRect(CELL.deskX - 110, CELL.floorY - 150, 220, 20)
  x.fillStyle = '#3a3226'
  x.fillRect(CELL.deskX - 100, CELL.floorY - 130, 14, 130)
  x.fillRect(CELL.deskX + 86, CELL.floorY - 130, 14, 130)
  x.fillStyle = '#443a2c'
  x.beginPath()
  x.ellipse(CELL.deskX - 160, CELL.floorY - 34, 34, 12, 0, 0, 7)
  x.fill()
  x.fillRect(CELL.deskX - 166, CELL.floorY - 34, 12, 34)
  // floor: cold concrete
  const fg = x.createLinearGradient(0, CELL.floorY - 30, 0, H + OS)
  fg.addColorStop(0, '#4c483e')
  fg.addColorStop(1, '#2e2c26')
  x.fillStyle = fg
  x.fillRect(-OS, CELL.floorY - 30, w + OS * 2, H + OS - CELL.floorY + 30)
  x.strokeStyle = 'rgba(20,18,14,0.5)'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(-OS, CELL.floorY - 30)
  x.lineTo(w + OS, CELL.floorY - 30)
  x.stroke()
  // THE POSTER WALL: taped corners where the posters hang (poster live)
  x.fillStyle = 'rgba(210,200,170,0.5)'
  for (const [pxx, pyy] of [[POSTER_RECT.x - 10, POSTER_RECT.y - 8], [POSTER_RECT.x + POSTER_RECT.w - 6, POSTER_RECT.y - 8], [POSTER_RECT.x - 10, POSTER_RECT.y + POSTER_RECT.h - 8], [POSTER_RECT.x + POSTER_RECT.w - 6, POSTER_RECT.y + POSTER_RECT.h - 8]]) {
    x.save()
    x.translate(pxx, pyy)
    x.rotate(hash(pxx) * 1.2 - 0.6)
    x.fillRect(-9, -4, 18, 8)
    x.restore()
  }
  // faint poster-shadow ghost (the promise that survives every swap)
  x.fillStyle = 'rgba(30,26,18,0.18)'
  x.fillRect(POSTER_RECT.x + 8, POSTER_RECT.y + 10, POSTER_RECT.w, POSTER_RECT.h)
  // barred vent (thunder flickers through it in s5a)
  x.fillStyle = '#1c1a16'
  x.fillRect(1900 - OS, 360, 90, 60)
  for (let i = 0; i < 4; i++) x.fillRect(1900 - OS, 366 + i * 14, 90, 6)
  return c
}

// ---- warden's office (world 2160): desk, PA mic + speaker, record player ----
export function officeBake() {
  const w = 2160
  const c = canvas(w + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(88)
  x.translate(OS, OS)
  // wood panelling
  const g = x.createLinearGradient(0, -OS, 0, 940)
  g.addColorStop(0, '#4a3624')
  g.addColorStop(0.6, '#584028')
  g.addColorStop(1, '#3c2c1c')
  x.fillStyle = g
  x.fillRect(-OS, -OS, w + OS * 2, 940 + OS)
  for (let px = -80; px < w + OS; px += 110) {
    x.fillStyle = 'rgba(20,12,6,0.35)'
    x.fillRect(px, -OS, 5, 940 + OS)
    const pg = x.createLinearGradient(px + 5, 0, px + 105, 0)
    pg.addColorStop(0, 'rgba(120,84,44,0.16)')
    pg.addColorStop(1, 'rgba(0,0,0,0.1)')
    x.fillStyle = pg
    x.fillRect(px + 5, -OS, 100, 940 + OS)
  }
  // wainscot + framed FLOW motto
  x.fillStyle = '#2c1e12'
  x.fillRect(-OS, 620, w + OS * 2, 320)
  x.fillStyle = '#443018'
  x.fillRect(-OS, 620, w + OS * 2, 16)
  x.fillStyle = '#6e5428'
  x.fillRect(340, 200, 210, 120)
  x.fillStyle = '#e2d8bc'
  x.fillRect(350, 210, 190, 100)
  x.fillStyle = '#5c4014'
  x.font = `italic 700 26px "Cormorant Garamond"`
  x.textAlign = 'center'
  x.fillText('THE FLOW', 445, 252)
  x.fillText('LIES WITHIN', 445, 284)
  x.textAlign = 'left'
  // the door (left) — bolts painted live when it locks
  x.fillStyle = '#332416'
  x.fillRect(OFFICE.doorX - 70, 300, 140, 640)
  x.fillStyle = '#443020'
  x.fillRect(OFFICE.doorX - 60, 312, 120, 616)
  x.strokeStyle = '#241608'
  x.lineWidth = 5
  x.strokeRect(OFFICE.doorX - 60, 312, 120, 616)
  x.fillStyle = '#c9a441'
  x.beginPath()
  x.arc(OFFICE.doorX + 44, 640, 7, 0, 7)
  x.fill()
  // rug
  x.fillStyle = '#5c2c24'
  x.beginPath()
  x.ellipse(1150, 960, 480, 80, 0, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(232,178,58,0.35)'
  x.lineWidth = 6
  x.beginPath()
  x.ellipse(1150, 960, 430, 62, 0, 0, 7)
  x.stroke()
  // the desk (front-facing, hero's feet go ON it)
  const dx = OFFICE.deskX, dy = OFFICE.deskY
  const dg = x.createLinearGradient(0, dy - 30, 0, 940)
  dg.addColorStop(0, '#6e5432')
  dg.addColorStop(0.3, '#5a4426')
  dg.addColorStop(1, '#3c2c18')
  x.fillStyle = dg
  x.fillRect(dx - 330, dy, 660, 240)
  x.fillStyle = '#7c6038'
  x.fillRect(dx - 348, dy - 26, 696, 30)
  x.fillStyle = 'rgba(255,236,190,0.18)'
  x.fillRect(dx - 348, dy - 26, 696, 6)
  x.fillStyle = 'rgba(20,12,6,0.5)'
  for (let i = 0; i < 4; i++) x.fillRect(dx - 330 + i * 172, dy + 40, 6, 200)
  // blotter + pen set + ledger corner on the desktop
  x.fillStyle = '#26402c'
  x.fillRect(dx - 120, dy - 18, 240, 26)
  x.strokeStyle = 'rgba(230,240,220,0.3)'
  x.lineWidth = 2
  x.strokeRect(dx - 112, dy - 14, 224, 18)
  x.fillStyle = '#1c1410'
  x.fillRect(dx + 160, dy - 40, 10, 44)
  // THE RECORD PLAYER on the desk (lid + platter painted live when spinning)
  x.fillStyle = '#5c2c24'
  x.fillRect(dx - 300, dy - 64, 150, 44)
  x.fillStyle = '#742e24'
  x.fillRect(dx - 292, dy - 58, 134, 32)
  x.fillStyle = '#18120c'
  x.beginPath()
  x.ellipse(dx - 250, dy - 42, 40, 12, 0, 0, 7)
  x.fill()
  // PA microphone on a floor stand by the desk
  x.strokeStyle = '#1c1a18'
  x.lineWidth = 8
  x.beginPath()
  x.moveTo(dx + 390, 940)
  x.lineTo(dx + 390, 640)
  x.stroke()
  x.fillStyle = '#2c2a28'
  x.beginPath()
  x.ellipse(dx + 390, 940, 40, 10, 0, 0, 7)
  x.fill()
  x.save()
  x.translate(dx + 390, 620)
  x.rotate(0.5)
  x.fillStyle = '#3c3a38'
  x.fillRect(-7, 0, 14, 44)
  x.fillStyle = '#585654'
  x.beginPath()
  x.arc(0, -8, 15, 0, 7)
  x.fill()
  x.strokeStyle = '#787672'
  x.lineWidth = 2
  for (let i = -2; i <= 2; i++) {
    x.beginPath()
    x.moveTo(i * 6, -20)
    x.lineTo(i * 6, 4)
    x.stroke()
  }
  x.restore()
  // wall PA speaker (right) — the aria pours out of it
  x.fillStyle = '#2c2e34'
  x.fillRect(OFFICE.speakerX - 44, 330, 88, 150)
  x.strokeStyle = '#1a1c22'
  x.lineWidth = 5
  x.strokeRect(OFFICE.speakerX - 44, 330, 88, 150)
  x.fillStyle = '#43464e'
  x.beginPath()
  x.arc(OFFICE.speakerX, 384, 26, 0, 7)
  x.fill()
  x.fillStyle = '#2a2c32'
  x.beginPath()
  x.arc(OFFICE.speakerX, 444, 18, 0, 7)
  x.fill()
  // floor
  const fg = x.createLinearGradient(0, 920, 0, H + OS)
  fg.addColorStop(0, '#4a3a26')
  fg.addColorStop(1, '#2e2416')
  x.fillStyle = fg
  x.fillRect(-OS, 920, w + OS * 2, H + OS - 920)
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(16,10,4,${0.08 + r() * 0.12})`
    x.beginPath()
    x.ellipse(r() * w, 930 + r() * 130, 40 + r() * 90, 8 + r() * 12, 0, 0, 7)
    x.fill()
  }
  return c
}

// ---- FLOW LIBRARY (world 2200): shelves, ghost BROOM CLOSET paint, THE BEAM ----
export function libraryBake() {
  const w = 2200
  const c = canvas(w + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(63)
  x.translate(OS, OS)
  // warm dusty plaster
  const g = x.createLinearGradient(0, -OS, 0, 940)
  g.addColorStop(0, '#54473a')
  g.addColorStop(0.6, '#645446')
  g.addColorStop(1, '#463a2e')
  x.fillStyle = g
  x.fillRect(-OS, -OS, w + OS * 2, 940 + OS)
  for (let i = 0; i < 100; i++) {
    x.fillStyle = `rgba(28,22,14,${0.05 + r() * 0.08})`
    x.beginPath()
    x.ellipse(r() * w, r() * 940, 30 + r() * 90, 10 + r() * 26, r(), 0, 7)
    x.fill()
  }
  // bookshelf walls: rows of seeded book spines
  const shelf = (sx, sw, top, rows) => {
    for (let i = 0; i < rows; i++) {
      const sy = top + i * 118
      x.fillStyle = '#3a2e1e'
      x.fillRect(sx, sy + 96, sw, 12)
      let bx = sx + 8
      while (bx < sx + sw - 14) {
        const bw = 10 + r() * 16, bh = 74 + r() * 20
        const hue = r()
        x.fillStyle = hue < 0.2 ? '#6e4a3c' : hue < 0.4 ? '#4a5a48' : hue < 0.6 ? '#5c5340' : hue < 0.8 ? '#3c4658' : '#6a5a34'
        x.fillRect(bx, sy + 96 - bh, bw, bh)
        if (r() > 0.7) {
          x.fillStyle = 'rgba(232,220,190,0.4)'
          x.fillRect(bx + 2, sy + 96 - bh + 8, bw - 4, 3)
        }
        bx += bw + 2
      }
    }
  }
  shelf(-40, 560, 160, 7)
  shelf(1700, 560, 160, 7)
  // THE BEAM (carve surface; BROOKS WAS BALD carved live by DRAWN B1)
  x.fillStyle = '#4c3a22'
  x.fillRect(-OS, 120, w + OS * 2, 74)
  x.fillStyle = '#5c4628'
  x.fillRect(-OS, 120, w + OS * 2, 12)
  x.fillStyle = 'rgba(20,12,4,0.4)'
  for (let px = -100; px < w + OS; px += 160) x.fillRect(px, 120, 4, 74)
  // GHOST PAINT: FLOW LIBRARY nailed over BROOM CLOSET (S4a gag)
  x.fillStyle = 'rgba(226,216,188,0.16)'
  x.font = `700 44px "Space Grotesk"`
  x.textAlign = 'center'
  x.fillText('BROOM CLOSET', 1100, 620)
  x.fillStyle = '#d9d4c4'
  x.fillRect(950, 540, 300, 76)
  x.strokeStyle = '#6e5428'
  x.lineWidth = 6
  x.strokeRect(954, 544, 292, 68)
  x.fillStyle = '#1c2028'
  x.font = `700 34px "Space Grotesk"`
  x.fillText('FLOW LIBRARY', 1100, 572)
  x.font = `700 17px "Space Grotesk"`
  x.fillText('EST. SHED BY SHED', 1100, 600)
  x.textAlign = 'left'
  // Brooks's desk (left-of-centre) + the fan
  x.fillStyle = '#4c3c26'
  x.fillRect(560, 760, 300, 26)
  x.fillStyle = '#3a2e1c'
  x.fillRect(576, 786, 18, 160)
  x.fillRect(826, 786, 18, 160)
  x.fillStyle = '#2c2418'
  x.fillRect(760, 700, 8, 64)
  x.fillStyle = '#443a2a'
  x.beginPath()
  x.ellipse(764, 696, 30, 10, 0, 0, 7)
  x.fill()
  // return desk (the ledger desk, right)
  x.fillStyle = '#54442c'
  x.fillRect(1360, 780, 340, 28)
  x.fillStyle = '#3a2e1c'
  x.fillRect(1378, 808, 20, 138)
  x.fillRect(1662, 808, 20, 138)
  // floor
  const fg = x.createLinearGradient(0, 930, 0, H + OS)
  fg.addColorStop(0, '#544428')
  fg.addColorStop(1, '#332816')
  x.fillStyle = fg
  x.fillRect(-OS, 930, w + OS * 2, H + OS - 930)
  x.strokeStyle = 'rgba(16,10,4,0.4)'
  for (let px = -60; px < w + OS; px += 190) {
    x.lineWidth = 3
    x.beginPath()
    x.moveTo(px, 930)
    x.lineTo(px - 30, H + OS)
    x.stroke()
  }
  return c
}

// ---- storm creek (world 2400): the pipe mouth on the left bank ----
export function creekBake() {
  const w = 2400
  const c = canvas(w + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(76)
  x.translate(OS, OS)
  // storm sky
  const g = x.createLinearGradient(0, -OS, 0, CREEK.horizonY + 40)
  g.addColorStop(0, '#12141c')
  g.addColorStop(0.6, '#1e222e')
  g.addColorStop(1, '#2e3440')
  x.fillStyle = g
  x.fillRect(-OS, -OS, w + OS * 2, CREEK.horizonY + 40 + OS)
  for (let i = 0; i < 22; i++) {
    x.fillStyle = `rgba(8,10,14,${0.3 + r() * 0.3})`
    x.beginPath()
    x.ellipse(r() * w, 60 + r() * 240, 140 + r() * 240, 30 + r() * 44, 0, 0, 7)
    x.fill()
  }
  // far bank tree line
  x.fillStyle = '#171a14'
  x.beginPath()
  x.moveTo(-OS, CREEK.horizonY + 30)
  for (let px = -OS; px <= w + OS; px += 60) x.lineTo(px, CREEK.horizonY - 20 + Math.sin(px * 0.01) * 18 + hash(px) * 22)
  x.lineTo(w + OS, CREEK.horizonY + 60)
  x.lineTo(-OS, CREEK.horizonY + 60)
  x.closePath()
  x.fill()
  // the creek
  const wg = x.createLinearGradient(0, CREEK.horizonY + 40, 0, CREEK.waterY + 120)
  wg.addColorStop(0, '#2c3844')
  wg.addColorStop(1, '#1a242e')
  x.fillStyle = wg
  x.fillRect(-OS, CREEK.horizonY + 40, w + OS * 2, CREEK.waterY + 80 - CREEK.horizonY - 40)
  // banks (rocks + mud)
  const bank = (bx, bw) => {
    const bg = x.createLinearGradient(0, CREEK.waterY - 60, 0, H + OS)
    bg.addColorStop(0, '#3c3a2e')
    bg.addColorStop(0.5, '#33312a')
    bg.addColorStop(1, '#262420')
    x.fillStyle = bg
    x.beginPath()
    x.moveTo(bx, CREEK.waterY - 80)
    for (let px = 0; px <= bw; px += 50) x.lineTo(bx + px, CREEK.waterY - 20 + Math.sin(px * 0.02 + bx) * 22)
    x.lineTo(bx + bw, H + OS)
    x.lineTo(bx, H + OS)
    x.closePath()
    x.fill()
    for (let i = 0; i < 14; i++) {
      x.fillStyle = `rgba(90,88,78,${0.5 + r() * 0.3})`
      x.beginPath()
      x.ellipse(bx + 30 + r() * (bw - 60), CREEK.waterY + 20 + r() * 180, 14 + r() * 30, 8 + r() * 12, r(), 0, 7)
      x.fill()
      x.fillStyle = 'rgba(20,20,16,0.4)'
      x.beginPath()
      x.ellipse(bx + 34 + r() * (bw - 60), CREEK.waterY + 30 + r() * 180, 10 + r() * 20, 5 + r() * 7, r(), 0, 7)
      x.fill()
    }
  }
  bank(-OS, CREEK.banks[0] + OS)
  bank(CREEK.banks[1], w + OS - CREEK.banks[1])
  // THE PIPE MOUTH on the left bank (he emerges from it): rusted culvert
  const px0 = 190, py0 = CREEK.waterY - 60
  x.fillStyle = '#3c3226'
  x.beginPath()
  x.ellipse(px0 + 90, py0 + 40, 150, 120, 0, 0, 7)
  x.fill()
  const pg = x.createLinearGradient(px0 - 40, py0 - 120, px0 + 220, py0 + 140)
  pg.addColorStop(0, '#5c5244')
  pg.addColorStop(0.5, '#4a4032')
  pg.addColorStop(1, '#332b20')
  x.fillStyle = pg
  x.beginPath()
  x.ellipse(px0 + 90, py0 + 30, 130, 105, 0, 0, 7)
  x.fill()
  x.fillStyle = '#0e0c08'
  x.beginPath()
  x.ellipse(px0 + 96, py0 + 34, 96, 78, 0, 0, 7)
  x.fill()
  // rust streaks + rim bolts
  x.strokeStyle = 'rgba(140,84,40,0.55)'
  x.lineWidth = 5
  for (let i = 0; i < 7; i++) {
    const a = -2.6 + i * 0.42
    x.beginPath()
    x.moveTo(px0 + 90 + Math.cos(a) * 100, py0 + 30 + Math.sin(a) * 82)
    x.lineTo(px0 + 90 + Math.cos(a) * 126, py0 + 30 + Math.sin(a) * 102)
    x.stroke()
  }
  // shed-hair fringe around the mouth (the glisten lives)
  x.strokeStyle = 'rgba(120,104,88,0.8)'
  x.lineWidth = 4
  for (let i = 0; i < 16; i++) {
    const a = 2.6 + i * 0.18
    x.beginPath()
    x.moveTo(px0 + 96 + Math.cos(a) * 94, py0 + 34 + Math.sin(a) * 76)
    x.quadraticCurveTo(px0 + 96 + Math.cos(a) * 116, py0 + 34 + Math.sin(a) * 96, px0 + 96 + Math.cos(a) * 128, py0 + 34 + Math.sin(a) * 86 + 10)
    x.stroke()
  }
  return c
}

// ---- the hair-lined TUNNEL (world 2200, close-up wall for inserts + crawl) ----
export function tunnelBake() {
  const w = 2200
  const c = canvas(w + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(19)
  x.translate(OS, OS)
  // dark bore
  const g = x.createLinearGradient(0, -OS, 0, H + OS)
  g.addColorStop(0, '#0c0a08')
  g.addColorStop(0.5, '#14100c')
  g.addColorStop(1, '#080604')
  x.fillStyle = g
  x.fillRect(-OS, -OS, w + OS * 2, H + OS * 2)
  // the bore walls: compressed earth + hair lining (19 years of shed)
  x.fillStyle = '#241c12'
  x.beginPath()
  x.moveTo(-OS, -OS)
  x.lineTo(-OS, 240)
  for (let px = -OS; px <= w + OS; px += 40) x.lineTo(px, 260 + Math.sin(px * 0.01) * 30 + hash(px) * 24)
  x.lineTo(w + OS, -OS)
  x.closePath()
  x.fill()
  x.beginPath()
  x.moveTo(-OS, H + OS)
  x.lineTo(-OS, 900)
  for (let px = -OS; px <= w + OS; px += 40) x.lineTo(px, 880 + Math.sin(px * 0.013 + 2) * 26 + hash(px * 3) * 20)
  x.lineTo(w + OS, H + OS)
  x.closePath()
  x.fill()
  // hair lining: seeded strands combed along the flow (they catch light later)
  for (let i = 0; i < 130; i++) {
    const sx = r() * (w + OS * 2) - OS
    const top = r() > 0.5
    const y0 = top ? 250 + r() * 60 : 880 - r() * 60
    const len = 30 + r() * 90
    x.strokeStyle = ['#3c342a', '#4c4234', '#5c5244', '#6a5e4e'][i % 4]
    x.lineWidth = 2 + r() * 3
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(sx, y0)
    x.quadraticCurveTo(sx + 18, y0 + (top ? len * 0.6 : -len * 0.6), sx + 36 + r() * 20, y0 + (top ? len : -len))
    x.stroke()
  }
  // tool scratches + a board floor line
  x.strokeStyle = 'rgba(90,74,50,0.4)'
  x.lineWidth = 2
  for (let i = 0; i < 30; i++) {
    const sx = r() * w, sy = 420 + r() * 380
    x.beginPath()
    x.moveTo(sx, sy)
    x.lineTo(sx + 20 + r() * 30, sy + (r() - 0.5) * 10)
    x.stroke()
  }
  x.fillStyle = '#1c1610'
  x.fillRect(-OS, 600, w + OS * 2, 8)
  return c
}

// ---- Pacific BEACH (world 2400) with THE SKIFF baked (stern lettering) ----
export function beachBake() {
  const w = 2400
  const c = canvas(w + OS * 2, H + OS * 2), x = c.getContext('2d')
  const r = rng(51)
  x.translate(OS, OS)
  // dawn sky
  const g = x.createLinearGradient(0, -OS, 0, BEACH.horizonY + 60)
  g.addColorStop(0, '#42506e')
  g.addColorStop(0.5, '#7c7490')
  g.addColorStop(0.8, '#c98a6a')
  g.addColorStop(1, '#e8b48a')
  x.fillStyle = g
  x.fillRect(-OS, -OS, w + OS * 2, BEACH.horizonY + 60 + OS)
  for (let i = 0; i < 12; i++) {
    x.fillStyle = `rgba(255,232,200,${0.1 + r() * 0.14})`
    x.beginPath()
    x.ellipse(r() * w, 100 + r() * 200, 110 + r() * 160, 18 + r() * 26, 0, 0, 7)
    x.fill()
  }
  const sun = x.createRadialGradient(700, BEACH.horizonY - 20, 16, 700, BEACH.horizonY - 20, 240)
  sun.addColorStop(0, 'rgba(255,236,190,0.75)')
  sun.addColorStop(1, 'rgba(255,236,190,0)')
  x.fillStyle = sun
  x.fillRect(420, BEACH.horizonY - 260, 560, 520)
  x.fillStyle = '#ffeec2'
  x.beginPath()
  x.arc(700, BEACH.horizonY - 20, 40, 0, 7)
  x.fill()
  // sea
  const sg = x.createLinearGradient(0, BEACH.horizonY - 10, 0, BEACH.sandlineY)
  sg.addColorStop(0, '#3c5a72')
  sg.addColorStop(0.6, '#2e4a60')
  sg.addColorStop(1, '#243c50')
  x.fillStyle = sg
  x.fillRect(-OS, BEACH.horizonY - 10, w + OS * 2, BEACH.sandlineY - BEACH.horizonY + 10)
  // sand
  const bg = x.createLinearGradient(0, BEACH.sandlineY - 30, 0, H + OS)
  bg.addColorStop(0, '#c9a878')
  bg.addColorStop(0.5, '#bc9a6a')
  bg.addColorStop(1, '#a8865a')
  x.fillStyle = bg
  x.fillRect(-OS, BEACH.sandlineY - 30, w + OS * 2, H + OS - BEACH.sandlineY + 30)
  for (let i = 0; i < 50; i++) {
    x.fillStyle = `rgba(120,94,54,${0.05 + r() * 0.08})`
    x.beginPath()
    x.ellipse(r() * w, BEACH.sandlineY + r() * 140, 30 + r() * 80, 5 + r() * 10, 0, 0, 7)
    x.fill()
  }
  // THE FENCE (postcard gag: comb + pompadour hay bale live nearby)
  const fx = BEACH.fenceX
  x.fillStyle = '#6a5438'
  for (let i = 0; i < 5; i++) x.fillRect(fx + i * 130, BEACH.sandlineY - 120, 16, 120)
  x.fillStyle = '#7c6440'
  x.fillRect(fx - 40, BEACH.sandlineY - 108, 660, 14)
  x.fillRect(fx - 40, BEACH.sandlineY - 64, 660, 12)
  // a pompadour hay bale by the fence
  x.fillStyle = '#b89858'
  x.beginPath()
  x.ellipse(fx + 430, BEACH.sandlineY - 26, 74, 40, 0, 0, 7)
  x.fill()
  x.fillStyle = '#8a7440'
  x.beginPath()
  x.ellipse(fx + 430, BEACH.sandlineY - 60, 34, 26, 0.2, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(120,96,52,0.7)'
  x.lineWidth = 3
  for (let i = 0; i < 5; i++) {
    x.beginPath()
    x.moveTo(fx + 402 + i * 14, BEACH.sandlineY - 74)
    x.quadraticCurveTo(fx + 408 + i * 14, BEACH.sandlineY - 92, fx + 402 + i * 14, BEACH.sandlineY - 80)
    x.stroke()
  }
  // THE SKIFF at BEACH.skiffX: weathered hull, stern lettering THE FLOW IS GOOD
  const sx = BEACH.skiffX, sy = BEACH.sandlineY + 10
  x.save()
  x.translate(sx, sy)
  const hg = x.createLinearGradient(0, -120, 0, 0)
  hg.addColorStop(0, '#8a6a44')
  hg.addColorStop(0.55, '#6e5234')
  hg.addColorStop(1, '#4c3822')
  x.fillStyle = hg
  x.beginPath()
  x.moveTo(-210, 0)
  x.quadraticCurveTo(-230, -90, -180, -128)
  x.lineTo(150, -128)
  x.quadraticCurveTo(236, -96, 210, 0)
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(232,214,170,0.3)'
  x.beginPath()
  x.moveTo(-186, -122)
  x.lineTo(146, -122)
  x.quadraticCurveTo(206, -100, 196, -66)
  x.lineTo(-196, -66)
  x.quadraticCurveTo(-208, -100, -186, -122)
  x.closePath()
  x.fill()
  // gunwale + ribs
  x.fillStyle = '#3c2c1a'
  x.beginPath()
  x.moveTo(-196, -70)
  x.quadraticCurveTo(0, -56, 198, -70)
  x.lineTo(196, -58)
  x.quadraticCurveTo(0, -44, -194, -58)
  x.closePath()
  x.fill()
  for (let i = -2; i <= 2; i++) {
    x.strokeStyle = 'rgba(40,28,14,0.5)'
    x.lineWidth = 5
    x.beginPath()
    x.moveTo(i * 70, -122)
    x.lineTo(i * 74, -6)
    x.stroke()
  }
  // stern lettering
  x.fillStyle = '#2c2012'
  x.font = `700 34px "Space Grotesk"`
  x.textAlign = 'center'
  x.fillText('THE FLOW', -46, -92)
  x.fillText('IS GOOD', -46, -58)
  x.textAlign = 'left'
  x.restore()
  // oar + net garnish
  x.strokeStyle = '#5c462c'
  x.lineWidth = 8
  x.beginPath()
  x.moveTo(sx - 260, sy - 4)
  x.lineTo(sx - 380, sy - 34)
  x.stroke()
  x.fillStyle = '#6a5434'
  x.beginPath()
  x.ellipse(sx - 392, sy - 38, 16, 10, -0.3, 0, 7)
  x.fill()
  return c
}

// ============================== prop painters (pure) ==============================

// Tiny rock-comb held up (deal close-up, tunnel miner-canary). Oversize s for reads.
export function rockComb(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? 0)
  x.scale(s, s)
  const g = x.createLinearGradient(-10, -4, 10, 4)
  g.addColorStop(0, '#8a919e')
  g.addColorStop(0.5, '#6e7480')
  g.addColorStop(1, '#494f5a')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(-11, -3)
  x.quadraticCurveTo(0, -6, 11, -3)
  x.lineTo(11, 2)
  x.quadraticCurveTo(0, 4, -11, 2)
  x.closePath()
  x.fill()
  x.fillStyle = '#3a404a'
  for (let i = 0; i < 6; i++) {
    x.beginPath()
    x.moveTo(-10 + i * 3.8, 2)
    x.lineTo(-8.6 + i * 3.8, 8)
    x.lineTo(-7 + i * 3.8, 2)
    x.closePath()
    x.fill()
  }
  if (o.glow) {
    x.strokeStyle = `rgba(255,190,160,${0.5 + 0.4 * Math.sin((o.t ?? 0) * 3)})`
    x.lineWidth = 1.4
    x.strokeRect(-11, -4, 22, 12)
  }
  x.fillStyle = 'rgba(230,238,248,0.7)'
  x.fillRect(-8, -3, 3, 1.6)
  x.restore()
}

// Clippers (Hadbald runs the line). o.open = blade chatter, o.cord trails.
export function clippers(x, cx, cy, s, t, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? -0.15)
  x.scale(s, s)
  const chatter = Math.sin(t * 40) * 1.2 * (o.open ?? 1)
  x.fillStyle = '#2c3038'
  x.beginPath()
  x.moveTo(-16, 0)
  x.quadraticCurveTo(-20, -12, -8, -16)
  x.lineTo(14, -16)
  x.quadraticCurveTo(20, -12, 16, 0)
  x.closePath()
  x.fill()
  x.fillStyle = '#c2ccd8'
  x.fillRect(12, -13, 18, 6 + chatter * 0.3)
  x.fillStyle = '#8a94a4'
  for (let i = 0; i < 6; i++) x.fillRect(12 + i * 3, -13 + (i % 2) * 3, 2, 4)
  x.fillStyle = '#c9a441'
  x.fillRect(-6, -4, 8, 4)
  if (o.cord !== false) {
    x.strokeStyle = '#1c1e24'
    x.lineWidth = 2.4
    x.beginPath()
    x.moveTo(-14, -2)
    x.quadraticCurveTo(-30, 10 + Math.sin(t * 6) * 6, -44, 6)
    x.stroke()
  }
  x.restore()
}

// Tiny deadpan umbrella (the dry guard in the hair-snow). o.open 0..1.
export function umbrellaProp(x, cx, cy, ang, s, open, t, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(ang)
  x.scale(s * (o.flip ? -1 : 1), s)
  x.strokeStyle = '#3a2a18'
  x.lineWidth = 3.4
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(-4, 0)
  x.lineTo(30, 0)
  x.stroke()
  if (open > 0.02) {
    const k = open
    x.fillStyle = o.col ?? '#26303e'
    x.beginPath()
    x.moveTo(6, 0)
    x.quadraticCurveTo(14 - 4 * k, -14 * k, 26 * k, -9 * k)
    x.quadraticCurveTo(29 * k, -3 * k, 27 * k, 1 * k)
    x.quadraticCurveTo(15 * k, 4 * k, 6, 2)
    x.closePath()
    x.fill()
    x.strokeStyle = 'rgba(200,215,235,0.4)'
    x.lineWidth = 1
    x.beginPath()
    x.moveTo(10, 1)
    x.quadraticCurveTo(14 * k, -9 * k, 24 * k, -5 * k)
    x.stroke()
  }
  void t
  x.restore()
}

// Domino tile (the comb traveled inside one). o.label engraves BIGGER.
export function dominoProp(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? -0.08)
  x.scale(s, s)
  const g = x.createLinearGradient(-22, -34, 22, 34)
  g.addColorStop(0, '#e8e2d2')
  g.addColorStop(0.6, '#d2ccb8')
  g.addColorStop(1, '#b8b09a')
  x.fillStyle = g
  x.beginPath()
  x.roundRect(-22, -34, 44, 68, 6)
  x.fill()
  x.strokeStyle = '#4c463a'
  x.lineWidth = 2
  x.stroke()
  x.beginPath()
  x.moveTo(-18, 0)
  x.lineTo(18, 0)
  x.stroke()
  x.fillStyle = '#26221c'
  for (const [px, py] of [[-9, -18], [9, -18], [0, -8]]) {
    x.beginPath()
    x.arc(px, py, 4, 0, 7)
    x.fill()
  }
  for (const [px, py] of [[-9, 12], [9, 12], [-9, 26], [9, 26]]) {
    x.beginPath()
    x.arc(px, py, 4, 0, 7)
    x.fill()
  }
  if (o.label) {
    x.fillStyle = '#8a2f26'
    x.font = `700 13px "Space Grotesk"`
    x.textAlign = 'center'
    x.fillText('BIGGER', 0, -26)
    x.textAlign = 'left'
  }
  x.restore()
}

// Jeweler's loupe (Hadbald squint) — eye cup + rim glint.
export function loupe(x, cx, cy, s, k) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.fillStyle = '#181a20'
  x.beginPath()
  x.moveTo(-9, -12)
  x.lineTo(9, -12)
  x.lineTo(6, 10)
  x.lineTo(-6, 10)
  x.closePath()
  x.fill()
  x.fillStyle = '#2c313a'
  x.beginPath()
  x.ellipse(0, -12, 9, 4, 0, 0, 7)
  x.fill()
  if (k > 0) {
    x.strokeStyle = `rgba(255,244,200,${0.8 * k})`
    x.lineWidth = 1.6
    x.beginPath()
    x.arc(0, -12, 7, -2.2, -1.2)
    x.stroke()
  }
  x.restore()
}

// Guard's magnifying glass over the poster (he inspects HER mane, never the wall).
export function magnifier(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? -0.3)
  x.scale(s, s)
  x.fillStyle = 'rgba(190,220,240,0.16)'
  x.beginPath()
  x.arc(0, 0, 34, 0, 7)
  x.fill()
  x.strokeStyle = '#3c3226'
  x.lineWidth = 7
  x.beginPath()
  x.arc(0, 0, 34, 0, 7)
  x.stroke()
  x.strokeStyle = '#6e5a38'
  x.lineWidth = 9
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(24, 24)
  x.lineTo(56, 56)
  x.stroke()
  x.strokeStyle = 'rgba(255,255,255,0.5)'
  x.lineWidth = 3
  x.beginPath()
  x.arc(0, 0, 26, -2.4, -1.4)
  x.stroke()
  x.restore()
}

// Jake the crow (comb-over blows in the fan draft). o.flap fan-wind flutter.
export function crowProp(x, cx, cy, s, t, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.fillStyle = '#18161a'
  x.beginPath()
  x.ellipse(0, 0, 22, 13, -0.15, 0, 7)
  x.fill()
  x.beginPath()
  x.arc(16, -10, 8, 0, 7)
  x.fill()
  x.beginPath()
  x.moveTo(22, -10)
  x.lineTo(31, -7)
  x.lineTo(22, -5)
  x.closePath()
  x.fill()
  x.fillStyle = '#c9a441'
  x.beginPath()
  x.arc(18, -12, 1.6, 0, 7)
  x.fill()
  // tail + wing line
  x.beginPath()
  x.moveTo(-18, 2)
  x.lineTo(-34, 8)
  x.lineTo(-18, 8)
  x.closePath()
  x.fill()
  x.strokeStyle = '#2c2a30'
  x.lineWidth = 2
  x.beginPath()
  x.moveTo(-8, -2)
  x.quadraticCurveTo(2, 2, 12, -2)
  x.stroke()
  // legs
  x.strokeStyle = '#8a744c'
  x.lineWidth = 2.4
  x.beginPath()
  x.moveTo(-2, 12)
  x.lineTo(-2, 18)
  x.moveTo(6, 12)
  x.lineTo(6, 18)
  x.stroke()
  // THE COMB-OVER: three strands standing into the draft
  x.strokeStyle = '#4a4238'
  x.lineWidth = 2
  for (let i = 0; i < 3; i++) {
    const fl = Math.sin(t * 7 + i * 1.8) * (o.flap ? 5 : 2)
    x.beginPath()
    x.moveTo(12 + i * 4, -16)
    x.quadraticCurveTo(16 + i * 4 + fl, -26, 22 + i * 4 + fl * 1.6, -24 - i)
    x.stroke()
  }
  x.restore()
}

// The rat (cell night audience-wink; tunnel commuter). o.combover, o.wink.
export function ratProp(x, cx, cy, s, t, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.scale(s * (o.flip ? -1 : 1), s)
  const bob = Math.sin(t * 9) * 1
  x.translate(0, bob)
  x.fillStyle = '#6a6258'
  x.beginPath()
  x.ellipse(0, 0, 15, 8, 0, 0, 7)
  x.fill()
  x.beginPath()
  x.arc(13, -3, 6, 0, 7)
  x.fill()
  x.beginPath()
  x.moveTo(-14, 0)
  x.quadraticCurveTo(-26, 2 + Math.sin(t * 5) * 3, -32, -4)
  x.strokeStyle = '#8a8278'
  x.lineWidth = 2
  x.stroke()
  x.fillStyle = '#544c42'
  x.beginPath()
  x.arc(11, -8, 3, 0, 7)
  x.fill()
  x.fillStyle = '#181410'
  x.beginPath()
  x.arc(15, -4, 1.2, 0, 7)
  x.fill()
  if (o.combover) {
    x.strokeStyle = '#4a4238'
    x.lineWidth = 1.6
    x.beginPath()
    x.moveTo(10, -9)
    x.quadraticCurveTo(15, -17, 21, -14)
    x.stroke()
  }
  if (o.wink && Math.sin(t * 2) > 0.2) {
    x.strokeStyle = '#e8e4d8'
    x.lineWidth = 1
    x.beginPath()
    x.moveTo(14, -6)
    x.lineTo(18, -6)
    x.stroke()
  }
  x.restore()
}

// Pigeon on the PA (chirps in tune). o.bob chirp bounce.
export function pigeonProp(x, cx, cy, s, t, o = {}) {
  x.save()
  x.translate(cx, cy - (o.bob ? Math.abs(Math.sin(t * 8)) * 3 : 0))
  x.scale(s, s)
  x.fillStyle = '#8a8e96'
  x.beginPath()
  x.ellipse(0, 0, 14, 9, 0, 0, 7)
  x.fill()
  x.fillStyle = '#5c6068'
  x.beginPath()
  x.arc(10, -7, 6, 0, 7)
  x.fill()
  x.fillStyle = '#3c4048'
  x.beginPath()
  x.moveTo(15, -7)
  x.lineTo(22, -5)
  x.lineTo(15, -3)
  x.closePath()
  x.fill()
  x.fillStyle = '#c9a441'
  x.beginPath()
  x.arc(12, -9, 1.4, 0, 7)
  x.fill()
  x.strokeStyle = '#c9503c'
  x.lineWidth = 1.4
  x.beginPath()
  x.moveTo(6, 2)
  x.lineTo(2, 8)
  x.moveTo(-4, 2)
  x.lineTo(-6, 8)
  x.stroke()
  x.fillStyle = '#6a6e76'
  x.beginPath()
  x.moveTo(-4, -2)
  x.lineTo(-16, -6)
  x.lineTo(-4, -6)
  x.closePath()
  x.fill()
  x.restore()
}

// Warden's flip-chart: TWO THINGS — item 1 a ruling hand, item 2 a comb in a red
// no-circle (punchup S1-B4).
export function flipChart(x, cx, baseY, s) {
  x.save()
  x.translate(cx, baseY)
  x.scale(s, s)
  // easel legs
  x.strokeStyle = '#4c3a22'
  x.lineWidth = 8
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(-70, 0)
  x.lineTo(-30, -320)
  x.moveTo(70, 0)
  x.lineTo(30, -320)
  x.moveTo(0, -10)
  x.lineTo(0, -330)
  x.stroke()
  // pad
  x.fillStyle = '#e8e2d2'
  x.fillRect(-120, -460, 240, 160)
  x.fillStyle = '#cfc8b4'
  x.fillRect(-120, -470, 240, 12)
  x.fillStyle = '#1c2028'
  x.font = `700 30px "Space Grotesk"`
  x.textAlign = 'center'
  x.fillText('TWO THINGS', 0, -430)
  // item 1: the ruling hand
  x.strokeStyle = '#26221c'
  x.lineWidth = 5
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(-84, -404)
  x.lineTo(-84, -382)
  x.moveTo(-84, -398)
  x.lineTo(-66, -398)
  x.moveTo(-84, -392)
  x.lineTo(-70, -380)
  x.stroke()
  x.fillStyle = '#26221c'
  x.font = `700 16px "Space Grotesk"`
  x.fillText('DISCIPLINE.', -40, -386)
  // item 2: comb in a red no-circle
  x.fillStyle = '#494f5a'
  x.fillRect(28, -404, 30, 8)
  for (let i = 0; i < 5; i++) x.fillRect(30 + i * 6, -396, 3, 8)
  x.strokeStyle = '#a8281e'
  x.lineWidth = 4
  x.beginPath()
  x.ellipse(43, -394, 26, 16, 0, 0, 7)
  x.stroke()
  x.beginPath()
  x.moveTo(24, -408)
  x.lineTo(62, -380)
  x.stroke()
  x.fillText('THE BALD.', -38, -344)
  x.textAlign = 'left'
  x.restore()
}

// Bible with the comb-shaped hollow ("THE FLOW LIES WITHIN"); o.poke = finger
// stuck in the hollow, o.shake = warden shakes it off with dignity.
export function bibleProp(x, cx, baseY, s, t, o = {}) {
  x.save()
  x.translate(cx + (o.shake ? Math.sin(t * 30) * 4 * s : 0), baseY)
  x.rotate(o.rot ?? 0)
  x.scale(s, s)
  const open = !!o.open
  if (!open) {
    x.fillStyle = '#3c2a18'
    x.fillRect(-40, -56, 80, 56)
    x.fillStyle = '#54381e'
    x.fillRect(-36, -52, 72, 48)
    x.fillStyle = '#c9a441'
    x.fillRect(-8, -56, 16, 56)
    x.fillStyle = '#d9d0b4'
    x.font = `700 10px "Space Grotesk"`
    x.textAlign = 'center'
    x.fillText('THE FLOW', 0, -30)
    x.fillText('LIES WITHIN', 0, -18)
    x.textAlign = 'left'
    if (o.hollow) {
      x.fillStyle = '#181008'
      x.beginPath()
      x.roundRect(-12, -44, 24, 10, 4)
      x.fill()
    }
  } else {
    // open: pages + the comb-shaped cutout
    x.fillStyle = '#d9d0b4'
    x.beginPath()
    x.moveTo(-52, 0)
    x.quadraticCurveTo(-30, -14, 0, -10)
    x.quadraticCurveTo(30, -14, 52, 0)
    x.lineTo(52, 10)
    x.quadraticCurveTo(0, 2, -52, 10)
    x.closePath()
    x.fill()
    x.strokeStyle = 'rgba(120,110,88,0.5)'
    x.lineWidth = 1
    for (let i = 1; i < 7; i++) {
      x.beginPath()
      x.moveTo(-48 + i, -2 - i * 1.2)
      x.quadraticCurveTo(0, -12 - i * 1.2, 48 - i, -2 - i * 1.2)
      x.stroke()
    }
    x.fillStyle = '#181008'
    x.beginPath()
    x.roundRect(-16, -8, 32, 9, 4)
    x.fill()
  }
  x.restore()
}

// A thrown rock (volley + the frozen one). seed varies the silhouette.
export function rockProp(x, cx, cy, s, seed, rot = 0) {
  x.save()
  x.translate(cx, cy)
  x.rotate(rot)
  x.scale(s, s)
  const g = x.createLinearGradient(-10, -8, 10, 8)
  g.addColorStop(0, '#8a8478')
  g.addColorStop(0.6, '#6a6458')
  g.addColorStop(1, '#4c463c')
  x.fillStyle = g
  x.beginPath()
  const r = rng(seed)
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * 6.28
    const rr = 10 + r() * 5
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.82
    i === 0 ? x.moveTo(px, py) : x.lineTo(px, py)
  }
  x.closePath()
  x.fill()
  x.fillStyle = 'rgba(40,36,28,0.5)'
  x.beginPath()
  x.ellipse(3, 4, 5, 3, 0.4, 0, 7)
  x.fill()
  x.restore()
}

// Hair-growth chart: FLOW GROWTH CHART + ticks FUZZ STUBBLE CROP BOB FLOW climbing
// with prog 0..1 (19 years); margin note BURN BEFORE COUNT.
export function growthChart(x, cx, cy, w, h, prog) {
  x.save()
  x.translate(cx, cy)
  x.fillStyle = 'rgba(220,210,180,0.85)'
  x.font = `700 20px "Space Grotesk"`
  x.textAlign = 'center'
  x.fillText('FLOW GROWTH CHART', 0, -h / 2 + 26)
  x.textAlign = 'left'
  x.strokeStyle = 'rgba(60,50,34,0.8)'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(-w / 2 + 16, -h / 2 + 40)
  x.lineTo(-w / 2 + 16, h / 2 - 20)
  x.stroke()
  const labels = ['FUZZ', 'STUBBLE', 'CROP', 'BOB', 'FLOW']
  const shown = Math.min(5, Math.floor(prog * 5.4) + 1)
  for (let i = 0; i < shown; i++) {
    const ty = h / 2 - 40 - i * ((h - 80) / 4)
    x.strokeStyle = 'rgba(60,50,34,0.8)'
    x.lineWidth = 3
    x.beginPath()
    x.moveTo(-w / 2 + 16, ty)
    x.lineTo(-w / 2 + 34, ty)
    x.stroke()
    // a scratch of hair at the tick
    x.strokeStyle = 'rgba(50,42,28,0.85)'
    x.lineWidth = 2
    for (let k = 0; k < 3; k++) {
      x.beginPath()
      x.moveTo(-w / 2 + 40 + k * 6, ty + 2)
      x.lineTo(-w / 2 + 42 + k * 6, ty - 8 - i)
      x.stroke()
    }
    x.fillStyle = 'rgba(46,38,24,0.9)'
    x.font = `700 17px "Space Grotesk"`
    x.fillText(labels[i], -w / 2 + 62, ty + 6)
  }
  if (prog > 0.9) {
    x.fillStyle = 'rgba(140,50,40,0.85)'
    x.font = `italic 700 13px "Space Grotesk"`
    x.fillText('BURN BEFORE COUNT.', -w / 2 + 20, h / 2 - 2)
  }
  x.restore()
}

// The warden's ledger page: CLIP & SHIP / PREMIUM SHED — OFF THE BOOKS + rows.
// o.page 0|1 (page turns), o.noneOnFile lights row 4, o.flip 0..1 page-turn angle.
export function ledgerPage(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(-0.02)
  x.scale(s, s)
  // page stack
  x.fillStyle = '#cfc4a4'
  x.fillRect(-260, -170, 540, 350)
  x.fillStyle = '#e3d8b6'
  x.fillRect(-250, -180, 540, 350)
  x.strokeStyle = 'rgba(120,100,60,0.5)'
  x.lineWidth = 2
  x.strokeRect(-250, -180, 540, 350)
  // heading
  x.fillStyle = '#2c2014'
  x.font = `700 52px Anton`
  x.textAlign = 'center'
  x.fillText('CLIP & SHIP', 20, -120)
  x.font = `700 20px "Space Grotesk"`
  x.fillText('PREMIUM SHED — OFF THE BOOKS', 20, -84)
  x.textAlign = 'left'
  x.strokeStyle = '#8a6a34'
  x.lineWidth = 3
  x.beginPath()
  x.moveTo(-220, -64)
  x.lineTo(260, -64)
  x.stroke()
  // rows
  const rows = [
    ['YARD BLEND, 40 LBS', 'SOLD'],
    ['SILVER SURPLUS, 12 LBS', 'SOLD'],
    ['CELLBLOCK CURL', 'HELD FOR BUYER'],
    ['NO. 42, SHED:', 'NONE ON FILE'],
  ]
  for (const [i, [a, b]] of rows.entries()) {
    const ry = -30 + i * 52
    const hot = o.noneOnFile && i === 3
    x.fillStyle = hot ? '#8a2f26' : '#3c3020'
    x.font = `700 24px "Space Grotesk"`
    x.fillText(a, -220, ry)
    x.textAlign = 'right'
    x.fillText(b, 230, ry)
    x.textAlign = 'left'
    x.strokeStyle = 'rgba(140,120,80,0.4)'
    x.lineWidth = 1.4
    x.beginPath()
    x.moveTo(-220, ry + 12)
    x.lineTo(240, ry + 12)
    x.stroke()
    if (hot) {
      x.strokeStyle = '#8a2f26'
      x.lineWidth = 4
      x.beginPath()
      x.moveTo(-226, ry + 22)
      x.lineTo(244, ry - 34)
      x.stroke()
    }
  }
  // turned page (shadow flap) while o.flip in (0,1)
  if (o.flip > 0.01 && o.flip < 0.99) {
    x.save()
    const fw = 250 * (1 - Math.abs(o.flip - 0.5) * 2)
    x.fillStyle = 'rgba(238,228,200,0.95)'
    x.beginPath()
    x.moveTo(20, -180)
    x.quadraticCurveTo(20 + fw, -90, 20 + fw * 0.4, 0)
    x.lineTo(20, 0)
    x.closePath()
    x.fill()
    x.strokeStyle = 'rgba(120,100,60,0.5)'
    x.lineWidth = 2
    x.stroke()
    x.restore()
  }
  x.restore()
}

// FLOW DAILY BUGLE front page (slams on the rack at dawn).
export function buglePage(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? -0.03)
  x.scale(s, s)
  x.fillStyle = '#ece6d4'
  x.fillRect(-300, -210, 600, 420)
  x.strokeStyle = 'rgba(90,80,60,0.4)'
  x.lineWidth = 2
  x.strokeRect(-300, -210, 600, 420)
  // masthead
  x.fillStyle = '#181410'
  x.font = `700 58px Anton`
  x.textAlign = 'center'
  x.fillText('FLOW DAILY BUGLE', 0, -140)
  x.font = `700 15px "Space Grotesk"`
  x.fillStyle = '#5c5344'
  x.fillText('ALL THE SHED FIT TO SELL', 0, -112)
  x.strokeStyle = '#181410'
  x.lineWidth = 4
  x.beginPath()
  x.moveTo(-280, -100)
  x.lineTo(280, -100)
  x.stroke()
  // headline + subhead
  x.fillStyle = '#181410'
  x.font = `700 36px Anton`
  x.fillText("BALDTON'S CLIPPINGS-GATE!", 0, -56)
  x.font = `700 18px "Space Grotesk"`
  x.fillStyle = '#3c3428'
  x.fillText('WARDEN SOLD PRISON SHED FOR YEARS, AUDIT FINDS', 0, -26)
  x.beginPath()
  x.moveTo(-280, -10)
  x.lineTo(280, -10)
  x.lineWidth = 2
  x.stroke()
  // mugshot box + caption (headIcon of 452 passed via o.mug canvas)
  x.fillStyle = '#c9c2ac'
  x.fillRect(-230, 10, 170, 140)
  x.strokeStyle = '#181410'
  x.lineWidth = 3
  x.strokeRect(-230, 10, 170, 140)
  if (o.mug) x.drawImage(o.mug, -230 + 13, 10 + 14, 144, 112)
  x.fillStyle = '#3c3428'
  x.font = `italic 700 16px "Space Grotesk"`
  x.textAlign = 'center'
  x.fillText("SHOWN WITH SOMEONE ELSE'S SHED", -145, 172)
  // body column squiggles
  x.strokeStyle = 'rgba(60,52,40,0.5)'
  x.lineWidth = 3
  for (let i = 0; i < 12; i++) {
    const ly = 24 + i * 11
    x.beginPath()
    x.moveTo(-30, ly)
    x.lineTo(250 - (i % 3) * 40, ly)
    x.stroke()
  }
  x.restore()
  x.textAlign = 'left'
}

// Postcard FLOW HANCOCK (comb on a beach fence photo, pompadour bale).
export function postcardProp(x, cx, cy, s, o = {}) {
  x.save()
  x.translate(cx, cy)
  x.rotate(o.rot ?? 0.02)
  x.scale(s, s)
  x.fillStyle = '#e8e0cc'
  x.fillRect(-330, -220, 660, 440)
  x.strokeStyle = '#b8ac8c'
  x.lineWidth = 3
  x.strokeRect(-330, -220, 660, 440)
  // photo half
  const pg = x.createLinearGradient(-300, -190, 40, 150)
  pg.addColorStop(0, '#9ec4de')
  pg.addColorStop(0.7, '#c9a878')
  pg.addColorStop(1, '#a8865a')
  x.fillStyle = pg
  x.fillRect(-300, -190, 340, 360)
  // fence + comb + pompadour bale in the photo
  x.fillStyle = '#6a5438'
  for (let i = 0; i < 4; i++) x.fillRect(-280 + i * 84, -10, 10, 120)
  x.fillStyle = '#7c6440'
  x.fillRect(-300, 4, 340, 12)
  x.fillStyle = '#494f5a'
  x.fillRect(-160, -22, 34, 9)
  for (let i = 0; i < 5; i++) x.fillRect(-158 + i * 7, -13, 3, 9)
  x.fillStyle = '#b89858'
  x.beginPath()
  x.ellipse(6, 96, 60, 34, 0, 0, 7)
  x.fill()
  x.fillStyle = '#8a7440'
  x.beginPath()
  x.ellipse(6, 68, 26, 20, 0.2, 0, 7)
  x.fill()
  // stamp + postmark
  x.fillStyle = '#c95a44'
  x.fillRect(180, -180, 90, 106)
  x.fillStyle = '#e8d8b8'
  x.beginPath()
  x.ellipse(225, -127, 28, 34, 0, 0, 7)
  x.fill()
  x.strokeStyle = 'rgba(60,60,80,0.7)'
  x.lineWidth = 3
  x.beginPath()
  x.arc(230, -140, 44, 0.6, 4.6)
  x.stroke()
  // address lines + the back line
  x.strokeStyle = 'rgba(90,80,60,0.7)'
  x.lineWidth = 3
  for (let i = 0; i < 3; i++) {
    x.beginPath()
    x.moveTo(40, 20 + i * 44)
    x.lineTo(300, 20 + i * 44)
    x.stroke()
  }
  x.fillStyle = '#3c3428'
  x.font = `italic 700 24px "Cormorant Garamond"`
  x.textAlign = 'center'
  x.fillText('FLOW HANCOCK', 90, 140)
  x.font = `italic 700 17px "Cormorant Garamond"`
  x.fillText('NO RAZORS THIS FAR WEST.', 90, 176)
  x.textAlign = 'left'
  x.restore()
}

// Parole nameplate: ELLIS BOYD FLOWDING.
export function nameplate(x, cx, cy, s) {
  x.save()
  x.translate(cx, cy)
  x.scale(s, s)
  x.fillStyle = '#5c4426'
  x.beginPath()
  x.roundRect(-150, -26, 300, 52, 6)
  x.fill()
  x.fillStyle = '#74592f'
  x.beginPath()
  x.roundRect(-144, -20, 288, 40, 4)
  x.fill()
  x.fillStyle = '#e8dcb4'
  x.font = `700 25px "Space Grotesk"`
  x.textAlign = 'center'
  x.fillText('ELLIS BOYD FLOWDING', 0, 7)
  x.textAlign = 'left'
  x.restore()
}

// Evidence bag EXHIBIT A-1: THE REGIME holding the clippers, tags dangling.
export function evidenceBag(x, cx, baseY, s, t) {
  x.save()
  x.translate(cx, baseY)
  x.scale(s, s)
  x.fillStyle = 'rgba(210,220,228,0.55)'
  x.beginPath()
  x.roundRect(-70, -120, 140, 120, 8)
  x.fill()
  x.strokeStyle = 'rgba(90,100,110,0.8)'
  x.lineWidth = 3
  x.stroke()
  clippers(x, 0, -66, 1.15, t, { cord: false })
  x.fillStyle = '#d9d4c4'
  x.fillRect(-58, -104, 116, 26)
  x.fillStyle = '#1c2028'
  x.font = `700 15px "Space Grotesk"`
  x.textAlign = 'center'
  x.fillText('EXHIBIT A-1: THE REGIME', 0, -86)
  x.textAlign = 'left'
  // tags
  x.strokeStyle = '#8a6a34'
  x.lineWidth = 2
  for (const dx of [-40, 34]) {
    const sw = Math.sin(t * 3 + dx) * 4
    x.beginPath()
    x.moveTo(dx, -120)
    x.quadraticCurveTo(dx + sw, -138, dx + sw * 1.4, -148)
    x.stroke()
    x.fillStyle = '#c9a468'
    x.fillRect(dx + sw * 1.4 - 8, -156, 16, 10)
  }
  x.restore()
}

// ============================== fx painters (pure) ==============================

// Hair-snow: the shave-room fall / S5a winter callback. g-domain positions from
// the timeline's 24 seeded flakes; o.warm tints the clippings.
export function hairSnow(x, g, o = {}) {
  const a = o.alpha ?? 1
  for (const fl of SNOW) {
    const y = snowY(g, fl)
    const sx = fl.x + Math.sin(g * 1.4 + fl.ph) * fl.drift
    x.globalAlpha = a * (0.55 + hash(fl.seed * 3) * 0.45)
    x.fillStyle = o.warm ? '#c9b48c' : '#e8e4d8'
    x.fillRect(sx, y, 3 + (fl.seed % 3), 3 + (fl.seed % 3))
  }
  x.globalAlpha = 1
}

// Slanted rain streaks (k = intensity 0..1).
export function rain(x, t, k, slant = CREEK.rainSlant, o = {}) {
  if (k <= 0.01) return
  const n = o.n ?? 70
  x.strokeStyle = `rgba(190,205,225,${0.32 * k})`
  x.lineWidth = 2
  x.beginPath()
  for (let i = 0; i < n; i++) {
    const sx = ((hash(i * 13) * (W + 300) + t * (600 + hash(i) * 500) * slant) % (W + 300)) - 150
    const sy = ((hash(i * 7) * H + t * (900 + hash(i * 3) * 700)) % (H + 120)) - 60
    const ln = 18 + hash(i * 5) * 26
    x.moveTo(sx, sy)
    x.lineTo(sx + ln * slant, sy + ln)
  }
  x.stroke()
}

// Searchlight cone sweeping (ang in radians, 0 = straight up).
export function searchlight(x, cx, cy, ang, len, w, k, col = 'rgba(230,238,250,') {
  if (k <= 0.01) return
  x.save()
  x.globalCompositeOperation = 'lighter'
  const gx = cx + Math.sin(ang) * len
  const gy = cy - Math.cos(ang) * len
  const g = x.createLinearGradient(cx, cy, gx, gy)
  g.addColorStop(0, col + (0.3 * k) + ')')
  g.addColorStop(1, col + '0)')
  x.fillStyle = g
  x.beginPath()
  x.moveTo(cx - w * 0.4, cy)
  x.lineTo(cx + w * 0.4, cy)
  x.lineTo(gx + w * 2.6, gy)
  x.lineTo(gx - w * 2.6, gy)
  x.closePath()
  x.fill()
  x.restore()
}

// Water waves shimmer along a line (beach + creek).
export function waves(x, t, y, w, k = 1, col = 'rgba(220,236,250,') {
  x.strokeStyle = col + (0.3 * k) + ')'
  x.lineWidth = 3
  for (let i = 0; i < 7; i++) {
    const wy = y + i * 9
    x.beginPath()
    const ph = t * (1.1 + i * 0.2) + i * 2
    for (let px = -20; px < w + 20; px += 26) {
      const py = wy + Math.sin(px * 0.02 + ph) * 3
      px === -20 ? x.moveTo(px, py) : x.lineTo(px, py)
    }
    x.stroke()
  }
}

// Sprinkler fan + rainbow arcing off the PA speaker (the aria beat).
export function sprinklerRainbow(x, cx, cy, t, k, o = {}) {
  if (k <= 0.01) return
  // mist fan
  x.save()
  x.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 26; i++) {
    const a = -2.4 + (i / 26) * 1.9 + Math.sin(t * 3 + i) * 0.06
    const sp = 60 + hash(i * 9) * 130
    const px = cx + Math.cos(a) * sp, py = cy + Math.sin(a) * sp - 20
    x.fillStyle = `rgba(200,226,244,${0.2 * k * Math.sin((i / 26) * Math.PI)})`
    x.beginPath()
    x.arc(px, py, 5 + hash(i) * 9, 0, 7)
    x.fill()
  }
  // the small rainbow arc
  const r0 = o.r ?? 190
  for (let band = 0; band < 5; band++) {
    const cols = ['rgba(232,90,74,', 'rgba(232,164,58,', 'rgba(214,214,80,', 'rgba(90,168,90,', 'rgba(90,120,214,']
    x.strokeStyle = cols[band] + (0.4 * k) + ')'
    x.lineWidth = 5
    x.beginPath()
    x.arc(cx - r0 * 0.2, cy + 60, r0 + band * 6, -2.2, -0.7)
    x.stroke()
  }
  x.restore()
}

// Lightning bolt from the sky; k 0..1 lifecycle, seeded jitter.
export function lightningBolt(x, t, k, sx, o = {}) {
  if (k <= 0.01) return
  const r = rng(Math.floor(sx * 10) + (o.variant ?? 0))
  x.save()
  x.globalCompositeOperation = 'lighter'
  const draw = (jitter, lw, alpha) => {
    x.strokeStyle = `rgba(226,236,255,${alpha * k})`
    x.lineWidth = lw
    x.lineJoin = 'round'
    x.beginPath()
    let px = sx, py = -20
    x.moveTo(px, py)
    while (py < (o.endY ?? 700)) {
      px += (r() - 0.5) * 120 + jitter
      py += 60 + r() * 60
      x.lineTo(px, py)
    }
    x.stroke()
  }
  draw(0, 7, 0.95)
  draw(8, 3, 0.5)
  draw(-6, 2, 0.4)
  // ground glow at the strike foot
  const g = x.createRadialGradient(sx, o.endY ?? 700, 4, sx, o.endY ?? 700, 220)
  g.addColorStop(0, `rgba(200,220,255,${0.5 * k})`)
  g.addColorStop(1, 'rgba(200,220,255,0)')
  x.fillStyle = g
  x.fillRect(sx - 220, (o.endY ?? 700) - 220, 440, 440)
  x.restore()
}

// ============================== the BALD CAP + THE CASCADE ==============================

// The quiet-reveal sliver: the cap corner lifts and a line of crimson shows
// beneath (S1d cell night). k 0..1 peel, sliverK 0..1 crimson edge, s in px units.
export function capSliver(x, hx, hy, s, peelK, sliverK, t) {
  if (peelK <= 0.001 && sliverK <= 0.001) return
  x.save()
  x.translate(hx, hy)
  x.scale(s, s)
  // crimson under-edge first (a crescent at the hairline, viewer-left)
  if (sliverK > 0.001) {
    x.fillStyle = '#8a3c3b'
    x.beginPath()
    x.ellipse(-13, -2, 15 * sliverK, 5.5 * sliverK, -0.28, 0, 7)
    x.fill()
    x.fillStyle = '#a04a44'
    x.beginPath()
    x.ellipse(-13, -3.4, 12 * sliverK, 3.2 * sliverK, -0.28, 0, 7)
    x.fill()
  }
  // the lifting corner: a skin wedge peeling up-left with a slight tremble
  if (peelK > 0.001) {
    const tremble = Math.sin(t * 9) * 0.02 * peelK
    x.save()
    x.rotate(-0.5 * peelK + tremble)
    x.fillStyle = '#d8c2b2'
    x.beginPath()
    x.moveTo(-2, -4)
    x.quadraticCurveTo(-16 * peelK - 6, -10 - 8 * peelK, -22 * peelK - 4, -2)
    x.quadraticCurveTo(-12, 4, -2, 2)
    x.closePath()
    x.fill()
    x.fillStyle = 'rgba(60,44,40,0.4)'
    x.fillRect(-22 * peelK - 4, -3, 20 * peelK, 1.6)
    x.restore()
  }
  x.restore()
}

// THE CASCADE — money shot of the film: nineteen years of crimson flow bursting
// downwind at the creek. age = seconds since release (frozen through HIT-STOP 2
// because age is derived from the film clock's release instant); drift = sl-driven
// micro-motion so the freeze still breathes. Settles into the wind-blown mane.
export function cascade(x, cx, headY, age, drift, settle = 1) {
  const grow = cl(age / 0.5)
  const reach = cl(age / 1.4)
  const n = 90
  const down = drift
  for (let i = 0; i < n; i++) {
    const sd = i * 17
    const a0 = -2.6 + hash(sd) * 2.9
    const len = (60 + hash(sd + 1) * 150) * reach
    const wav = 0.5 + hash(sd + 2) * 0.9
    const ph = hash(sd + 3) * 6.28
    // ribbon path: out of the scalp, arcing downwind (to the right) with gravity
    const x0 = cx + Math.cos(a0) * 10
    const y0 = headY + Math.sin(a0) * 6
    const ex = x0 + len * (0.5 + hash(sd + 4) * 0.7) + 46 * reach
    const ey = y0 + len * (0.9 + hash(sd + 5) * 0.5)
    const mx = x0 + (ex - x0) * 0.5 + Math.sin(age * wav * 5 + ph) * 12 * (1 - settle) + down * 2
    const my = y0 + (ey - y0) * 0.42 + Math.cos(age * wav * 4 + ph) * 8 * (1 - settle)
    x.strokeStyle = i % 3 === 0 ? '#a04a44' : i % 3 === 1 ? '#893c3b' : '#74332f'
    x.lineWidth = 3 + hash(sd + 6) * 5
    x.lineCap = 'round'
    x.globalAlpha = 0.92 * grow
    x.beginPath()
    x.moveTo(x0, y0)
    x.quadraticCurveTo(mx, my, ex, ey + (1 - settle) * 0)
    x.stroke()
    // flyaway tip curl
    if (reach > 0.6 && i % 4 === 0) {
      x.lineWidth = 2
      x.beginPath()
      x.moveTo(ex, ey)
      x.quadraticCurveTo(ex + 8 + Math.sin(age * 6 + ph) * 4 * (1 - settle) + down, ey + 8, ex + 2 + down, ey + 18)
      x.stroke()
    }
  }
  // droplet particles: crimson motes lifting off the torrent (freeze micro-drift)
  for (let i = 0; i < 36; i++) {
    const sd = i * 31 + 7
    const px = cx + 30 + hash(sd) * 120 + reach * 60
    const py = headY + 20 + hash(sd + 1) * 150 + age * (40 + hash(sd + 2) * 90)
    const tw = 0.5 + 0.5 * Math.sin(i * 2.4 + age * 9)
    x.globalAlpha = 0.5 * grow * tw * (1 - settle * 0.4)
    x.fillStyle = i % 3 ? '#a04a44' : '#b85a50'
    x.fillRect(px + down, py, 3, 3)
  }
  x.globalAlpha = 1
  void grow
}

// Wind-blown mane for the beach (crimson for the hero, silver for RED): ribbons
// streaming from the crown, pure in t. col = base hex.
export function windMane(x, cx, headY, s, t, col = '#893c3b', k = 1) {
  if (k <= 0.01) return
  for (let i = 0; i < 16; i++) {
    const sd = i * 13
    const len = (26 + hash(sd) * 46) * s * k
    const y0 = headY + (hash(sd + 1) - 0.3) * 10 * s
    const wav = Math.sin(t * (2.2 + hash(sd + 2)) + i * 1.7) * 7 * s
    x.strokeStyle = i % 3 === 0 ? shadeHex(col, 1.3) : i % 3 === 1 ? col : shadeHex(col, 0.72)
    x.lineWidth = (2.4 + hash(sd + 3) * 3.6) * s
    x.lineCap = 'round'
    x.globalAlpha = 0.9
    x.beginPath()
    x.moveTo(cx + 2 * s, y0)
    x.quadraticCurveTo(cx - len * 0.5, y0 - 4 * s + wav * 0.4, cx - len, y0 + wav)
    x.stroke()
  }
  x.globalAlpha = 1
}

// ============================== shared small painters ==============================

export function glow(x, cx, cy, k, o = {}) {
  if (k <= 0.01) return
  const r2 = (o.r ?? 160) * k
  const g = x.createRadialGradient(cx, cy, 2, cx, cy, r2)
  const col = o.col ?? '255,207,138'
  g.addColorStop(0, `rgba(${col},${o.a ?? 0.6})`)
  g.addColorStop(0.45, `rgba(${col},${(o.a ?? 0.6) * 0.3})`)
  g.addColorStop(1, `rgba(${col},0)`)
  x.fillStyle = g
  x.fillRect(cx - r2, cy - r2, r2 * 2, r2 * 2)
}

export function dustPuff(x, cx, cy, age, life, seed, n = 10, col = 'rgba(190,170,140,') {
  if (age <= 0 || age >= life) return
  const u = age / life
  for (let i = 0; i < n; i++) {
    const a = hash(seed * 13 + i * 7) * 6.28
    const sp = (0.3 + hash(seed + i * 3) * 0.7) * 160
    const px = cx + Math.cos(a) * sp * age * 2.4
    const py = cy + Math.sin(a) * sp * age * 1.4 - 60 * age * (0.5 + hash(i * 11))
    x.fillStyle = col + (0.4 * (1 - u)).toFixed(3) + ')'
    x.beginPath()
    x.arc(px, py, 5 + hash(seed + i) * 12 * (0.4 + u), 0, 7)
    x.fill()
  }
}

export function glint(x, cx, cy, s, k, col = '#fff6d8') {
  if (k <= 0 || k >= 1) return
  x.save()
  x.translate(cx, cy)
  x.globalAlpha = Math.sin(k * Math.PI)
  x.fillStyle = col
  const r2 = s * (0.4 + 0.6 * Math.sin(k * Math.PI))
  x.beginPath()
  x.moveTo(0, -r2)
  x.quadraticCurveTo(2, -2, r2, 0)
  x.quadraticCurveTo(2, 2, 0, r2)
  x.quadraticCurveTo(-2, 2, -r2, 0)
  x.quadraticCurveTo(-2, -2, 0, -r2)
  x.closePath()
  x.fill()
  x.restore()
}

// Carved beam text (BROOKS WAS BALD / SO WAS RED.): dark inset + light bottom edge,
// revealed char by char (o.carve 0..1).
export function carveText(x, s, cx, cy, size, carve) {
  const chars = Math.floor(s.length * cl(carve))
  const shown = s.slice(0, chars)
  x.font = `700 ${size}px "Space Grotesk"`
  x.textAlign = 'center'
  const wpx = x.measureText(shown).width
  // fresh-carve chips at the writing tip
  if (chars > 0 && chars < s.length) {
    x.fillStyle = 'rgba(200,170,110,0.8)'
    const tw = x.measureText(shown).width
    for (let i = 0; i < 3; i++) {
      x.fillRect(cx + tw / 2 + (hash(i * 9) - 0.5) * 10, cy - size * 0.2 + (hash(i * 3) - 0.5) * 14, 3, 3)
    }
    void wpx
  }
  x.fillStyle = 'rgba(20,12,4,0.85)'
  x.fillText(shown, cx + 1.5, cy + 2)
  x.fillStyle = '#8a744c'
  x.fillText(shown, cx, cy)
  x.fillStyle = 'rgba(232,214,160,0.5)'
  x.fillText(shown, cx, cy - 1.5)
  x.textAlign = 'left'
  return chars
}
