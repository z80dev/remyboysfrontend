import { cabaldRemy, civRemy, loadRemy } from '../kit'
import { FLAG_COLORS, flagPane } from '../../os/icons'
import type { Card, Suit } from './model'

export { CARD_BACKS as BACKS } from './strings'

const glyphs: Record<string, string[]> = {
  W: ['11011', '11011', '11011', '11011', '11111', '11111', '01010'],
  H: ['11011', '11011', '11011', '11111', '11011', '11011', '11011'],
  L: ['11000', '11000', '11000', '11000', '11000', '11000', '11111'],
  A: ['01110', '11011', '11011', '11111', '11011', '11011', '11011'],
  '2': ['01110', '11011', '00011', '00110', '01100', '11000', '11111'],
  '3': ['11110', '00011', '00011', '01110', '00011', '00011', '11110'],
  '4': ['00011', '00111', '01111', '11011', '11111', '00011', '00011'],
  '5': ['11111', '11000', '11000', '11110', '00011', '11011', '01110'],
  '6': ['01110', '11000', '11000', '11110', '11011', '11011', '01110'],
  '7': ['11111', '00011', '00110', '00110', '01100', '01100', '01100'],
  '8': ['01110', '11011', '11011', '01110', '11011', '11011', '01110'],
  '9': ['01110', '11011', '11011', '01111', '00011', '00011', '01110'],
  '1': ['010', '110', '010', '010', '010', '010', '111'],
  '0': ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
  J: ['00111', '00011', '00011', '00011', '11011', '11011', '01110'],
  Q: ['01110', '11011', '11011', '11011', '11011', '01110', '00011'],
  K: ['11011', '11011', '11110', '11100', '11110', '11011', '11011'],
  R: ['11110', '11011', '11011', '11110', '11100', '11010', '11011'],
  E: ['11111', '11000', '11000', '11110', '11000', '11000', '11111'],
  M: ['11011', '11111', '11111', '11011', '11011', '11011', '11011'],
  Y: ['11011', '11011', '01110', '00100', '00100', '00100', '00100'],
  O: ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
  S: ['01111', '11000', '11000', '01110', '00011', '00011', '11110'],
  f: ['00111', '01100', '01100', '11110', '01100', '01100', '01100'],
}
const rankText = (rank: number) => rank === 1 ? 'A' : rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : String(rank)
function bitmap(c: CanvasRenderingContext2D, text: string, x: number, y: number, scale = 1) {
  c.beginPath()
  for (const letter of text) {
    const rows = glyphs[letter]
    if (!rows) { x += 4 * scale; continue }
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < rows[row].length; col++) if (rows[row][col] === '1') c.rect(x + col * scale, y + row * scale, scale, scale)
    }
    x += (rows[0].length + 1) * scale
  }
  c.fill()
}
function rect(c: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color
  c.fillRect(x, y, w, h)
}
function line(c: CanvasRenderingContext2D, color: string, x: number, y: number, xx: number, yy: number) {
  c.strokeStyle = color
  c.lineWidth = 1
  c.beginPath()
  c.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5)
  c.lineTo(Math.round(xx) + 0.5, Math.round(yy) + 0.5)
  c.stroke()
}
function oval(c: CanvasRenderingContext2D, color: string, x: number, y: number, rx: number, ry: number) {
  c.fillStyle = color
  for (let row = Math.ceil(-ry); row < ry; row++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - ((row + 0.5) / ry) ** 2)))
    c.fillRect(Math.round(x) - half, Math.round(y) + row, half * 2 + 1, 1)
  }
}
function polygon(c: CanvasRenderingContext2D, color: string, points: readonly number[]) {
  c.fillStyle = color
  c.beginPath()
  c.moveTo(points[0], points[1])
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1])
  c.closePath()
  c.fill()
}
function outline(c: CanvasRenderingContext2D) {
  c.beginPath()
  c.moveTo(2, 0.5)
  c.lineTo(69, 0.5)
  c.quadraticCurveTo(70.5, 0.5, 70.5, 2)
  c.lineTo(70.5, 94)
  c.quadraticCurveTo(70.5, 95.5, 69, 95.5)
  c.lineTo(2, 95.5)
  c.quadraticCurveTo(0.5, 95.5, 0.5, 94)
  c.lineTo(0.5, 2)
  c.quadraticCurveTo(0.5, 0.5, 2, 0.5)
  c.closePath()
}
function shell(c: CanvasRenderingContext2D) {
  outline(c)
  c.fillStyle = '#ffffff'
  c.fill()
  c.strokeStyle = '#000000'
  c.lineWidth = 1
  c.stroke()
}
const pipMasks: Record<Suit, readonly string[]> = {
  hearts: ['01110001110', '11111011111', '11111111111', '11111111111', '11111111111', '01111111110', '00111111100', '00011111000', '00001110000', '00000100000', '00000000000', '00000000000'],
  diamonds: ['00000100000', '00001110000', '00011111000', '00111111100', '01111111110', '11111111111', '11111111111', '01111111110', '00111111100', '00011111000', '00001110000', '00000100000'],
  spades: ['00000100000', '00001110000', '00011111000', '00111111100', '01111111110', '11111111111', '11111111111', '11111011111', '01110001110', '00000100000', '00001110000', '00011111000'],
  clubs: ['00001110000', '00011111000', '00011111000', '00001110000', '01110101110', '11111111111', '11111111111', '11111111111', '01110101110', '00000100000', '00001110000', '00011111000'],
}
function pipPath(c: CanvasRenderingContext2D, suit: Suit) {
  c.beginPath()
  const rows = pipMasks[suit]
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) if (rows[row][col] === '1') c.rect(col - 5.5, row - 6, 1, 1)
  }
}
function pip(c: CanvasRenderingContext2D, suit: Suit, x: number, y: number, scale = 1, inverted = false) {
  c.save()
  c.translate(x, y)
  c.scale(scale, scale)
  if (inverted) c.rotate(Math.PI)
  c.fillStyle = suit === 'hearts' || suit === 'diamonds' ? '#ff0000' : '#000000'
  pipPath(c, suit)
  c.fill()
  c.restore()
}

// No eager fetches: only the portraits actually painted get resolved and decoded.
const art = new Map<string, HTMLImageElement | null>()
const resolved = new Map<string, Promise<number>>()
const listeners = new Set<() => void>()
const backCache = new Map<string, HTMLCanvasElement>()
const faceCache = new Map<string, HTMLCanvasElement>()
export function subscribeCardArt(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
function portrait(seed: number, cabald = false, raw = false): HTMLImageElement | null {
  const size = typeof window !== 'undefined' && window.devicePixelRatio >= 2 ? 320 : 128
  const role = `${raw ? 'raw' : cabald ? 'cabald' : 'civ'}:${seed}`
  const key = `${role}:${size}`
  if (!art.has(key)) {
    if (raw) {
      for (const oldKey of art.keys()) if (oldKey.startsWith('raw:') && oldKey !== key) art.delete(oldKey)
      for (const oldRole of resolved.keys()) if (oldRole.startsWith('raw:') && oldRole !== role) resolved.delete(oldRole)
    }
    art.set(key, null)
    let index = resolved.get(role)
    if (!index) {
      index = raw ? Promise.resolve(seed) : cabald ? cabaldRemy(seed) : civRemy(seed)
      resolved.set(role, index)
    }
    void index.then(idx => loadRemy(idx, size)).then(image => {
      if (!art.has(key)) return
      art.set(key, image)
      backCache.clear()
      faceCache.clear()
      for (const listener of listeners) listener()
    }).catch(() => { /* The monogram remains readable offline. */ })
  }
  return art.get(key) ?? null
}
const courts: Record<Suit, readonly number[]> = {
  hearts: [42, 14, 46],
  diamonds: [6, 2016, 2084],
  clubs: [777, 420, 2069],
  spades: [1010, 67, 2086],
}
function monogram(c: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number) {
  rect(c, '#000080', x, y, w, h)
  polygon(c, '#e00000', [x, y + h, x + w / 2, y + 3, x + w, y + h])
  oval(c, '#ffd700', x + w / 2, y + h / 2, 11, 12)
  c.fillStyle = '#000000'
  bitmap(c, text, x + w / 2 - 5, y + h / 2 - 7, 2)
  rect(c, '#fff4b0', x + 3, y + 3, 2, 2)
  rect(c, '#fff4b0', x + w - 5, y + h - 5, 2, 2)
}
function crop(c: CanvasRenderingContext2D, image: HTMLImageElement | null, x: number, y: number, w: number, h: number, letter: string) {
  if (!image) return monogram(c, letter, x, y, w, h)
  c.save()
  c.beginPath()
  c.rect(x, y, w, h)
  c.clip()
  c.imageSmoothingEnabled = true
  c.imageSmoothingQuality = 'high'
  c.drawImage(image, image.naturalWidth * 0.05, image.naturalHeight * 0.11, image.naturalWidth * 0.90, image.naturalHeight * 0.715, x, y, w, h)
  c.restore()
}
function court(c: CanvasRenderingContext2D, card: Card) {
  const seed = courts[card.suit][card.rank - 11]
  if (seed === undefined) return
  rect(c, '#000000', 12, 11, 47, 74)
  rect(c, '#ffd700', 13, 12, 45, 72)
  const trim = ['#0000c0', '#0000c0', '#ffd700', '#e00000', '#e00000', '#ffd700']
  for (let end = 0; end < 2; end++) {
    c.save()
    if (end) { c.translate(71, 96); c.rotate(Math.PI) }
    for (let px = 14; px <= 56; px++) rect(c, trim[(px - 14) % 6], px, 13, 1, 1)
    for (let py = 14; py <= 47; py++) {
      rect(c, trim[(py - 14) % 6], 14, py, 1, 1)
      rect(c, trim[(py - 14) % 6], 56, py, 1, 1)
    }
    rect(c, '#000000', 15, 14, 41, 33)
    const halfSeed = end && card.suit === 'spades' && card.rank === 11 ? 57 : seed
    crop(c, portrait(halfSeed, card.suit === 'spades'), 16, 15, 39, 31, rankText(card.rank))
    rect(c, '#ffffff', 16, 15, 9, 9)
    pip(c, card.suit, 20.5, 19.5, 0.5)
    c.restore()
  }
  rect(c, '#000000', 13, 46, 45, 4)
  rect(c, '#ffd700', 13, 47, 45, 2)
}
function flag(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, portraits = false) {
  c.save()
  c.translate(x, y)
  c.scale(w / 100, h / 86)
  const seeds = [2069, 420, 777, 42]
  for (let i = 0; i < 4; i++) {
    const path = new Path2D(flagPane((i % 2) as 0 | 1, (i >> 1) as 0 | 1))
    c.fillStyle = FLAG_COLORS[i]
    c.fill(path)
    if (portraits) {
      const image = portrait(seeds[i])
      if (image) {
        c.save()
        c.clip(path)
        c.imageSmoothingEnabled = true
        c.drawImage(image, i % 2 ? 42 : -6, i < 2 ? -6 : 32, 62, 62)
        c.globalCompositeOperation = 'color'
        c.globalAlpha = 0.6
        c.fillStyle = FLAG_COLORS[i]
        c.fill(path)
        c.globalCompositeOperation = 'source-over'
        c.globalAlpha = 0.18
        c.fill(path)
        c.restore()
      }
    }
    c.save()
    c.strokeStyle = '#ffffff'
    c.globalAlpha *= 0.55
    c.lineWidth = 1.2
    c.stroke(path)
    c.restore()
  }
  c.restore()
}
function ace(c: CanvasRenderingContext2D, suit: Suit) {
  if (suit !== 'spades') return pip(c, suit, 35.5, 48, 2.2)
  c.save()
  c.translate(35.5, 45)
  c.scale(3.6, 3.6)
  pipPath(c, 'spades')
  c.fillStyle = '#000000'
  c.fill()
  c.restore()
  c.save()
  c.translate(35.5, 45)
  c.scale(3.25, 3.25)
  pipPath(c, 'spades')
  c.clip()
  c.scale(1 / 3.25, 1 / 3.25)
  flag(c, -19, -17, 38, 31)
  c.restore()
  polygon(c, '#000000', [15, 71, 56, 71, 53, 80, 18, 80])
  c.fillStyle = '#ffffff'
  bitmap(c, 'REMY OS', 16, 73)
}
const layouts: readonly (readonly [number, number][])[] = [
  [], [], [[35.5, 24], [35.5, 72]], [[35.5, 24], [35.5, 48], [35.5, 72]],
  [[23, 24], [48, 24], [23, 72], [48, 72]],
  [[23, 24], [48, 24], [35.5, 48], [23, 72], [48, 72]],
  [[23, 24], [48, 24], [23, 48], [48, 48], [23, 72], [48, 72]],
  [[23, 24], [48, 24], [35.5, 36], [23, 48], [48, 48], [23, 72], [48, 72]],
  [[23, 24], [48, 24], [35.5, 36], [23, 48], [48, 48], [35.5, 60], [23, 72], [48, 72]],
  [[23, 21], [48, 21], [23, 39], [48, 39], [35.5, 48], [23, 57], [48, 57], [23, 75], [48, 75]],
  [[23, 21], [48, 21], [35.5, 30], [23, 39], [48, 39], [23, 57], [48, 57], [35.5, 66], [23, 75], [48, 75]],
]
export function drawFace(c: CanvasRenderingContext2D, card: Card, x: number, y: number, opts: { selected?: boolean; ghost?: boolean } = {}): void {
  if (typeof document === 'undefined') return paintFace(c, card, x, y, opts)
  const dpr = typeof window === 'undefined' ? 1 : Math.max(1, Math.min(3, window.devicePixelRatio || 1))
  const key = `${card.suit}:${card.rank}:${dpr}:${opts.selected ? 1 : 0}`
  let cached = faceCache.get(key)
  if (!cached) {
    cached = document.createElement('canvas')
    cached.width = Math.ceil(71 * dpr)
    cached.height = Math.ceil(96 * dpr)
    const layer = cached.getContext('2d')
    if (!layer) return paintFace(c, card, x, y, opts)
    layer.scale(dpr, dpr)
    paintFace(layer, card, 0, 0, { selected: opts.selected })
    if (faceCache.size >= 128) faceCache.clear()
    faceCache.set(key, cached)
  }
  c.save()
  if (opts.ghost) c.globalAlpha *= 0.45
  c.imageSmoothingEnabled = false
  c.drawImage(cached, 0, 0, 71 * dpr, 96 * dpr, x, y, 71, 96)
  c.restore()
}
function paintFace(c: CanvasRenderingContext2D, card: Card, x: number, y: number, opts: { selected?: boolean; ghost?: boolean }): void {
  c.save()
  c.translate(x, y)
  if (opts.ghost) c.globalAlpha *= 0.45
  shell(c)
  c.imageSmoothingEnabled = false
  for (let end = 0; end < 2; end++) {
    c.save()
    if (end) { c.translate(71, 96); c.rotate(Math.PI) }
    c.fillStyle = card.suit === 'hearts' || card.suit === 'diamonds' ? '#ff0000' : '#000000'
    bitmap(c, rankText(card.rank), 4, 4)
    pip(c, card.suit, card.rank === 10 ? 8 : 6.5, 18, 0.55)
    c.restore()
  }
  if (card.rank === 1) ace(c, card.suit)
  else if (card.rank >= 11) court(c, card)
  else for (const [px, py] of layouts[card.rank] ?? []) pip(c, card.suit, px, py, 0.95, py > 48)
  if (opts.selected) drawHighlight(c, 0, 0)
  c.restore()
}
export function drawHighlight(c: CanvasRenderingContext2D, x: number, y: number): void {
  c.save()
  c.translate(x, y)
  outline(c)
  c.clip()
  c.globalCompositeOperation = 'difference'
  rect(c, '#ffffff', 0, 0, 71, 96)
  c.restore()
}
export function drawEmpty(c: CanvasRenderingContext2D, kind: 'pile' | 'stock' | 'recycle' | 'exhausted' | 'home', x: number, y: number): void {
  c.save()
  c.translate(x, y)
  outline(c)
  c.strokeStyle = '#004000'
  c.lineWidth = 1
  c.stroke()
  if (kind === 'recycle') {
    c.strokeStyle = '#00c000'
    c.lineWidth = 4
    c.beginPath()
    c.arc(35.5, 48, 15, 0, Math.PI * 2)
    c.stroke()
  } else if (kind === 'exhausted') {
    c.strokeStyle = '#ff0000'
    c.lineWidth = 4
    c.beginPath()
    c.moveTo(23, 35)
    c.lineTo(48, 61)
    c.moveTo(48, 35)
    c.lineTo(23, 61)
    c.stroke()
  } else if (kind === 'home') {
    c.globalAlpha *= 0.35
    pip(c, 'spades', 35.5, 48, 1.6)
  }
  c.restore()
}
function stars(c: CanvasRenderingContext2D, color: string) {
  for (let i = 0; i < 18; i++) rect(c, color, 8 + (i * 17 % 55), 8 + (i * 11 % 38), 1, 1)
}
function waves(c: CanvasRenderingContext2D, color: string, start = 60) {
  for (let y = start; y < 90; y += 6) {
    for (let x = 6; x < 66; x += 12) {
      line(c, color, x, y + 2, x + 4, y)
      line(c, color, x + 4, y, x + 8, y + 2)
    }
  }
}
function rose(c: CanvasRenderingContext2D, x: number, y: number) {
  line(c, '#247733', x, y + 3, x - 3, y + 17)
  polygon(c, '#328847', [x - 2, y + 10, x - 8, y + 6, x - 6, y + 12])
  pip(c, 'hearts', x + 2, y + 12, 0.24)
  oval(c, '#780014', x, y, 6, 5)
  polygon(c, '#e00028', [x - 5, y - 1, x - 2, y - 5, x + 3, y - 4, x + 5, y, x + 1, y + 4, x - 4, y + 2])
  line(c, '#ff6a70', x - 3, y - 1, x + 1, y - 2)
  line(c, '#800010', x + 1, y - 2, x + 2, y + 1)
  rect(c, '#ff293e', x - 1, y, 2, 2)
}
function bat(c: CanvasRenderingContext2D, x: number, y: number, flap: number) {
  polygon(c, '#080818', [x - 7, y - flap, x - 4, y + 2, x - 1, y + 1, x, y + 3, x + 1, y + 1, x + 4, y + 2, x + 7, y - flap, x + 3, y, x, y - 2, x - 3, y])
}
/** t is supplied by the stock animation hook; this module never starts a timer or animation loop. */
export function drawBack(c: CanvasRenderingContext2D, backId: number, x: number, y: number, t = 0, remy = 42): void {
  const id = Number.isInteger(backId) && backId >= 0 && backId < 13 ? backId : 0
  if (typeof document === 'undefined') return paintBack(c, id, x, y, t, remy)
  const dpr = typeof window === 'undefined' ? 1 : Math.max(1, Math.min(3, window.devicePixelRatio || 1))
  const key = `${id}:${dpr}:${id === 12 ? remy : 0}`
  let cached = backCache.get(key)
  if (!cached) {
    cached = document.createElement('canvas')
    cached.width = Math.ceil(71 * dpr)
    cached.height = Math.ceil(96 * dpr)
    const layer = cached.getContext('2d')
    if (!layer) return paintBack(c, id, x, y, t, remy)
    layer.scale(dpr, dpr)
    paintBack(layer, id, 0, 0, 0, remy)
    // My Remy previews must not retain an unbounded catalog of raster surfaces.
    if (backCache.size >= 32) backCache.clear()
    backCache.set(key, cached)
  }
  c.save()
  c.imageSmoothingEnabled = false
  c.drawImage(cached, 0, 0, 71 * dpr, 96 * dpr, x, y, 71, 96)
  if (t > 0 && t < 1800 && (id === 2 || id === 6 || id === 7 || id === 8)) {
    // Repaint only the sprite region over the cached still layer. Tower lightning also changes its sky.
    c.beginPath()
    if (id === 2) c.rect(x + 24, y + 42, 23, 29)
    else if (id === 7) c.rect(x + 30, y + 21, 30, 27)
    else if (id === 6) c.rect(x + 4, y + 4, 63, 69)
    else c.rect(x + 15, y + 6, 43, 86)
    c.clip()
    paintBack(c, id, x, y, t, remy)
  }
  c.restore()
}
function paintBack(c: CanvasRenderingContext2D, backId: number, x: number, y: number, t: number, remy: number): void {
  c.save()
  c.translate(x, y)
  shell(c)
  c.beginPath()
  c.rect(4, 4, 63, 88)
  c.clip()
  c.imageSmoothingEnabled = false
  const id = Number.isInteger(backId) && backId >= 0 && backId < 13 ? backId : 0
  const phase = Number.isFinite(t) && t > 0 && t < 1800 ? t / 1800 : 0
  const pulse = phase ? Math.sin(Math.PI * phase) : 0
  if (id === 0) {
    rect(c, '#2058d8', 4, 4, 63, 88)
    for (let yy = -60; yy < 150; yy += 6) {
      line(c, '#9cc0ff', 4, yy, 67, yy + 63)
      line(c, '#9cc0ff', 4, yy, 67, yy - 63)
    }
    for (let yy = 12; yy < 92; yy += 24) for (let xx = 12; xx < 67; xx += 24) {
      rect(c, FLAG_COLORS[0], xx - 1, yy - 2, 1, 1)
      rect(c, FLAG_COLORS[1], xx, yy - 2, 1, 1)
      rect(c, FLAG_COLORS[0], xx - 2, yy - 1, 2, 1)
      rect(c, FLAG_COLORS[1], xx, yy - 1, 2, 1)
      rect(c, FLAG_COLORS[2], xx - 2, yy, 2, 1)
      rect(c, FLAG_COLORS[3], xx, yy, 2, 1)
      rect(c, FLAG_COLORS[2], xx - 1, yy + 1, 1, 1)
      rect(c, FLAG_COLORS[3], xx, yy + 1, 1, 1)
    }
  } else if (id === 1) {
    rect(c, '#830000', 4, 4, 63, 88)
    for (let yy = 4; yy < 92; yy += 6) for (let xx = 4; xx < 67; xx += 6) {
      const horizontal = ((xx - 4) / 6 + (yy - 4) / 6) % 2 === 0
      rect(c, '#ed4b4b', xx, yy, horizontal ? 6 : 4, horizontal ? 4 : 6)
      rect(c, '#ff9890', xx, yy, horizontal ? 5 : 1, 1)
      rect(c, '#b41522', xx + 1, yy + 2, horizontal ? 5 : 2, 1)
    }
  } else if (id === 2) {
    rect(c, '#008080', 4, 4, 63, 88)
    for (let yy = 7; yy < 92; yy += 4) for (let xx = 7; xx < 67; xx += 4) rect(c, '#00a0a0', xx, yy, 1, 1)
    rect(c, '#101820', 16, 70, 39, 13)
    rect(c, '#929fa7', 19, 69, 12, 14)
    rect(c, '#929fa7', 40, 69, 12, 14)
    rect(c, '#080c12', 16, 82, 18, 4)
    rect(c, '#080c12', 37, 82, 18, 4)
    rect(c, '#07111d', 13, 36, 45, 36)
    rect(c, '#aebdc4', 19, 34, 33, 38)
    rect(c, '#e6f2e4', 20, 35, 2, 33)
    rect(c, '#667782', 49, 35, 2, 35)
    rect(c, '#738591', 13, 40, 5, 25)
    rect(c, '#738591', 53, 40, 5, 25)
    rect(c, '#c7d6d2', 21, 17, 29, 20)
    rect(c, '#07111d', 25, 22, 21, 8)
    rect(c, '#66dfdd', 28, 24, 4, 3)
    rect(c, '#66dfdd', 39, 24, 4, 3)
    rect(c, '#e00000', 29, 33, 13, 2)
    line(c, '#e2b43b', 35.5, 17, 35.5, 11)
    polygon(c, '#8a481c', [27, 12, 29, 7, 32, 10, 35, 5, 38, 9, 42, 7, 43, 12])
    rect(c, '#27333d', 24, 42, 23, 19)
    oval(c, '#f7e8ac', 35.5, 51, 8, 7)
    line(c, '#000000', 35.5, 51, 35.5 + Math.sin(phase * Math.PI * 4) * 6, 45)
    for (let i = 0; i < 3; i++) oval(c, phase && Math.floor(phase * 12) % 3 === i ? '#ffff7b' : ['#ef3b39', '#68ac5c', '#409ac8'][i], 27 + i * 9, 66, 2, 2)
  } else if (id === 3) {
    rect(c, '#080808', 4, 4, 63, 88)
    for (let yy = 12; yy < 96; yy += 23) for (let xx = 13; xx < 70; xx += 22) rose(c, xx + (yy % 2 ? 5 : 0), yy)
  } else if (id === 4) {
    rect(c, '#f4f0d0', 4, 4, 63, 88)
    for (let xx = 11; xx < 67; xx += 17) {
      for (let yy = 5; yy < 92; yy += 12) {
        line(c, '#006000', xx, yy, xx + 5, yy + 6)
        line(c, '#006000', xx + 5, yy + 6, xx, yy + 12)
        polygon(c, '#20a020', [xx + 3, yy + 5, xx + 11, yy + 1, xx + 8, yy + 8])
        polygon(c, '#006000', [xx + 2, yy + 8, xx - 6, yy + 4, xx - 4, yy + 11])
        oval(c, '#1f9bf0', xx + 1, yy + 1, 4, 4)
        oval(c, '#c8e8ff', xx + 1, yy + 1, 3, 3)
        rect(c, '#ffffff', xx, yy - 1, 1, 1)
        line(c, '#4c8858', xx - 1, yy + 2, xx + 2, yy + 2)
      }
    }
  } else if (id === 5) {
    rect(c, '#a0d8ff', 4, 4, 63, 27)
    rect(c, '#ffffff', 4, 31, 63, 1)
    rect(c, '#0000c0', 4, 32, 63, 24)
    rect(c, '#000080', 4, 56, 63, 36)
    waves(c, '#4080ff', 49)
    oval(c, '#061d3e', 31, 61, 20, 11)
    polygon(c, '#061d3e', [45, 61, 60, 51, 62, 43, 54, 46, 52, 53])
    oval(c, '#234d75', 27, 58, 14, 6)
    oval(c, '#d4e9f0', 18, 58, 1, 1)
    line(c, '#d3f4ff', 24, 48, 24, 32)
    line(c, '#d3f4ff', 24, 35, 18, 29)
    line(c, '#d3f4ff', 24, 35, 31, 29)
    oval(c, '#d3f4ff', 18, 29, 3, 1)
    oval(c, '#d3f4ff', 31, 29, 3, 1)
    c.fillStyle = '#0000c0'
    bitmap(c, 'WHALE', 10, 11)
    c.fillStyle = '#ffffff'
    bitmap(c, 'WHALE', 9, 10)
  } else if (id === 6) {
    const flash = phase > 0.48 && phase < 0.51 || phase > 0.54 && phase < 0.56
    rect(c, flash ? '#d5c5ff' : '#101030', 4, 4, 63, 88)
    stars(c, '#aa83b9')
    oval(c, '#e3d4ae', 51, 19, 9, 9)
    oval(c, flash ? '#d5c5ff' : '#101030', 47, 16, 8, 8)
    polygon(c, '#110b20', [4, 83, 15, 72, 24, 80, 38, 70, 52, 80, 67, 73, 67, 92, 4, 92])
    rect(c, '#100b1d', 23, 32, 25, 51)
    rect(c, '#67527b', 25, 33, 21, 48)
    polygon(c, '#161025', [20, 33, 35, 16, 51, 33])
    for (let yy = 36; yy < 79; yy += 9) for (let xx = 25; xx < 47; xx += 7) line(c, '#493759', xx, yy, xx + 5, yy)
    for (let yy = 39; yy < 68; yy += 13) {
      rect(c, '#130d24', 29, yy, 4, 7)
      rect(c, '#ead475', 39, yy, 4, 7)
    }
    rect(c, '#1d102b', 32, 72, 7, 11)
    const flutter = phase ? Math.round(Math.sin(phase * Math.PI * 4)) : 0
    rect(c, '#ffd700', 37 + flutter, 57, 9, 13)
    rect(c, '#e00000', 38 + flutter, 58, 7, 11)
    polygon(c, '#0000c0', [41 + flutter, 59, 44 + flutter, 63, 41 + flutter, 67, 39 + flutter, 63])
    for (let xx = 37; xx < 46; xx += 2) rect(c, '#ffffff', xx + flutter, 70, 1, 2)
    bat(c, 14 + phase * 49, 25 + Math.sin(phase * Math.PI * 2) * 7, Math.floor(phase * 16) % 2 ? 4 : 1)
    bat(c, 57 - phase * 48, 40 + Math.sin(phase * Math.PI * 2) * 5, Math.floor(phase * 16) % 2 ? 1 : 4)
    if (flash) polygon(c, '#ffffff', [13, 8, 9, 25, 16, 23, 12, 42, 23, 18, 15, 21, 20, 8])
  } else if (id === 7) {
    rect(c, '#705180', 4, 4, 63, 88)
    rect(c, '#bf7880', 4, 30, 63, 15)
    rect(c, '#e7a073', 4, 45, 63, 13)
    oval(c, '#ffd354', 45, 34, 12, 12)
    c.save()
    c.beginPath()
    c.rect(30, 21, 30, 27)
    c.clip()
    const slide = phase ? Math.min(1, phase / 0.22, (1 - phase) / 0.22) : 0
    const sx = Math.round(45 - 32 * (1 - slide))
    rect(c, '#10131d', sx - 10, 32, 9, 6)
    rect(c, '#10131d', sx + 1, 32, 9, 6)
    line(c, '#10131d', sx - 1, 33, sx + 1, 33)
    line(c, '#7199ac', sx - 8, 33, sx - 4, 33)
    line(c, '#7199ac', sx + 3, 33, sx + 7, 33)
    c.restore()
    rect(c, '#144c81', 4, 58, 63, 34)
    waves(c, '#5d8da6', 61)
    oval(c, '#edbf77', 32, 81, 29, 6)
    polygon(c, '#6a3d25', [23, 81, 27, 43, 31, 44, 27, 81])
    for (let yy = 48; yy < 79; yy += 5) line(c, '#ad7240', 26, yy, 29, yy + 1)
    polygon(c, '#163d2a', [28, 43, 12, 39, 7, 43, 16, 34, 28, 39, 34, 29, 43, 31, 33, 39, 49, 41, 53, 48, 35, 44, 29, 55, 26, 49])
  } else if (id === 8) {
    rect(c, '#600020', 4, 4, 63, 88)
    for (let yy = 8; yy < 92; yy += 8) for (let xx = 8; xx < 67; xx += 8) rect(c, '#800030', xx, yy, 1, 1)
    c.save()
    c.translate(35, 51)
    c.rotate(-0.18)
    const rise = Math.round(pulse * 25)
    rect(c, '#000000', -11, -16 - rise, 23, 33)
    rect(c, '#ffffff', -10, -15 - rise, 21, 31)
    c.fillStyle = '#000000'
    bitmap(c, 'A', -8, -13 - rise)
    pip(c, 'spades', 1, -rise, 0.85)
    c.restore()
    polygon(c, '#090d19', [4, 80, 23, 49, 47, 59, 67, 87, 67, 92, 4, 92])
    polygon(c, '#272d45', [8, 80, 23, 57, 41, 64, 58, 92, 24, 92])
    polygon(c, '#ffd700', [22, 48, 49, 58, 46, 67, 18, 57])
    line(c, '#ffe379', 23, 50, 48, 59)
    line(c, '#c09000', 21, 55, 46, 64)
    oval(c, '#fff1a4', 37, 59, 3, 2)
  } else if (id === 9) {
    rect(c, '#523410', 4, 4, 63, 88)
    for (let yy = 12; yy < 99; yy += 18) for (let xx = 12; xx < 73; xx += 18) {
      const cx = xx + (Math.floor(yy / 18) % 2 ? 9 : 0)
      oval(c, '#191308', cx + 1, yy + 2, 8, 8)
      oval(c, '#d29b22', cx, yy, 8, 8)
      oval(c, '#ffe279', cx - 1, yy - 1, 6, 6)
      oval(c, '#bc8121', cx, yy, 5, 5)
      c.save()
      c.transform(1, 0, -0.25, 1, cx - 2, yy - 4)
      c.fillStyle = '#fff0a0'
      bitmap(c, 'f', 0, 0)
      c.restore()
      rect(c, '#fff3b0', cx - 5, yy - 5, 2, 1)
    }
  } else if (id === 10) {
    rect(c, '#3a6ea5', 4, 4, 63, 88)
    flag(c, 8, 23, 55, 49, true)
    line(c, '#d3b143', 9, 14, 62, 14)
    line(c, '#d3b143', 9, 81, 62, 81)
    for (let xx = 12; xx < 64; xx += 8) {
      polygon(c, '#d3b143', [xx, 10, xx + 2, 12, xx, 14, xx - 2, 12])
      polygon(c, '#d3b143', [xx, 81, xx + 2, 83, xx, 85, xx - 2, 83])
    }
  } else if (id === 11) {
    rect(c, '#6a1b9a', 4, 4, 63, 88)
    rect(c, '#ffff00', 12, 17, 1, 1)
    rect(c, '#ffff00', 59, 50, 1, 1)
    rect(c, '#ffff00', 18, 42, 1, 1)
    oval(c, '#b6e7c6', 43, 33, 12, 14)
    polygon(c, '#b6e7c6', [31, 32, 29, 61, 35, 57, 40, 63, 45, 57, 51, 61, 55, 36])
    const ghost = portrait(42)
    if (ghost) {
      c.save()
      c.globalAlpha = 0.45
      crop(c, ghost, 34, 22, 19, 24, 'R')
      c.restore()
    } else {
      polygon(c, '#6b7f69', [34, 25, 36, 19, 40, 22, 44, 17, 49, 22, 51, 29])
      oval(c, '#376d66', 39, 31, 2, 2)
      oval(c, '#376d66', 47, 31, 2, 2)
      oval(c, '#376d66', 43, 39, 2, 3)
    }
    oval(c, '#81351d', 27, 74, 19, 14)
    oval(c, '#ed7f20', 27, 72, 18, 13)
    oval(c, '#ff9f2d', 23, 72, 8, 13)
    line(c, '#b94c18', 19, 62, 17, 81)
    line(c, '#b94c18', 29, 60, 30, 84)
    line(c, '#b94c18', 35, 62, 39, 80)
    rect(c, '#497243', 25, 54, 4, 8)
    polygon(c, '#321348', [16, 70, 22, 64, 25, 71])
    polygon(c, '#321348', [30, 71, 33, 64, 39, 70])
    polygon(c, '#321348', [17, 76, 23, 79, 27, 76, 32, 79, 38, 75, 34, 83, 23, 84])
  } else {
    const index = Number.isInteger(remy) && remy >= 0 && remy < 4490 ? remy : 42
    const image = portrait(index, false, true)
    if (image) {
      c.imageSmoothingEnabled = true
      const sw = Math.min(image.naturalWidth, image.naturalHeight * 61 / 86)
      const sh = sw * 86 / 61
      c.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, 5, 5, 61, 86)
    } else monogram(c, 'R', 5, 5, 61, 86)
  }
  c.restore()
}
