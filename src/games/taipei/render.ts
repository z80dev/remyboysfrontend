import { FLAG_COLORS } from '../kit'
import { isFree } from './engine'
import type { Game, Pair, Position } from './engine'
import { strings } from './strings'

export const WIDTH = 640
export const HEIGHT = 430
export type TileSet = 'remy' | 'classic'
export type View = { zoom: number; panX: number; panY: number }
export type BoardGeometry = { x: number; y: number; scale: number; width: number; height: number; padding: number; contentWidth: number; contentHeight: number; order: number[] }
export type Portraits = Record<number, HTMLImageElement>
const dots: readonly (readonly [number, number])[][] = [
  [[20, 27]], [[20, 15], [20, 37]], [[10, 13], [20, 26], [30, 39]], [[11, 15], [29, 15], [11, 37], [29, 37]],
  [[10, 14], [30, 14], [20, 26], [10, 38], [30, 38]], [[11, 13], [29, 13], [11, 26], [29, 26], [11, 39], [29, 39]],
  [[20, 11], [11, 22], [29, 22], [11, 32], [29, 32], [11, 42], [29, 42]],
  [[11, 11], [29, 11], [11, 21], [29, 21], [11, 31], [29, 31], [11, 41], [29, 41]],
  [[10, 12], [20, 12], [30, 12], [10, 26], [20, 26], [30, 26], [10, 40], [20, 40], [30, 40]]
]
const chineseDigits = [
  [[5, 12, 25, 12]], [[5, 8, 25, 8], [5, 17, 25, 17]], [[5, 5, 25, 5], [5, 12, 25, 12], [5, 19, 25, 19]],
  [[5, 4, 5, 20], [5, 4, 25, 4], [25, 4, 25, 20], [5, 20, 25, 20], [12, 5, 12, 13], [19, 5, 19, 13]],
  [[5, 4, 25, 4], [15, 4, 11, 20], [7, 11, 23, 11], [23, 11, 23, 20], [5, 20, 25, 20]],
  [[15, 2, 18, 6], [5, 8, 25, 8], [12, 12, 5, 20], [19, 12, 26, 20]],
  [[5, 10, 26, 7], [15, 2, 15, 20], [15, 20, 26, 20]],
  [[12, 4, 5, 20], [19, 4, 26, 20]],
  [[5, 9, 24, 9], [15, 3, 12, 16], [12, 16, 5, 21], [24, 9, 24, 21], [24, 21, 29, 21]]
]
const brushDigits = [
  [[2, 3, 5, 1, 5, 9, 2, 9, 8, 9]],
  [[1, 3, 2, 1, 6, 1, 8, 3, 1, 9, 8, 9]],
  [[1, 1, 7, 1, 4, 5, 7, 5, 7, 9, 1, 9]],
  [[6, 9, 6, 1, 1, 6, 8, 6]],
  [[7, 1, 1, 1, 1, 5, 6, 5, 8, 7, 6, 9, 1, 9]],
  [[7, 1, 3, 1, 1, 4, 1, 8, 3, 9, 6, 9, 8, 7, 6, 5, 1, 5]],
  [[1, 1, 8, 1, 3, 9]],
  [[3, 1, 6, 1, 8, 3, 6, 5, 3, 5, 1, 3, 3, 1], [3, 5, 1, 7, 3, 9, 6, 9, 8, 7, 6, 5]],
  [[7, 5, 2, 5, 1, 3, 2, 1, 6, 1, 8, 3, 8, 7, 6, 9, 2, 9]]
]
function lines(ctx: CanvasRenderingContext2D, strokes: readonly number[][], x = 0, y = 0) {
  ctx.beginPath()
  for (const s of strokes) { ctx.moveTo(x + s[0], y + s[1]); for (let i = 2; i < s.length; i += 2) ctx.lineTo(x + s[i], y + s[i + 1]) }
  ctx.stroke()
}
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 9, color = '#202020') {
  ctx.font = `bold ${size}px Tahoma, sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.fillText(text, x, y)
}
function portrait(ctx: CanvasRenderingContext2D, face: number, art: Portraits, frame: string) {
  ctx.save()
  ctx.beginPath(); ctx.rect(2, 2, 36, 48); ctx.clip()
  if (art[face]) {
    const image = art[face]
    const cropWidth = image.width * 36 / 48
    ctx.drawImage(image, (image.width - cropWidth) / 2, 0, cropWidth, image.height, 2, 2, 36, 48)
  }
  else {
    ctx.fillStyle = frame
    ctx.beginPath(); ctx.arc(20, 20, 8, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(20, 43, 14, 15, 0, Math.PI, 0); ctx.fill()
  }
  ctx.strokeStyle = frame; ctx.lineWidth = 2; ctx.strokeRect(3, 3, 34, 46)
  ctx.restore()
}

export function drawFace(ctx: CanvasRenderingContext2D, face: number, set: TileSet, art: Portraits) {
  const classic = set === 'classic'
  const n = face % 9 + 1
  ctx.lineWidth = 1.5
  if (face < 9) {
    for (const [x, pipY] of dots[n - 1]) {
      const y = 21 + (pipY - 11) * 0.72
      const r = n === 1 ? 12 : n < 5 ? 5.5 : n === 7 || n === 8 ? 3.1 : 4.3
      ctx.fillStyle = classic ? ['#246a9f', '#a52925', '#247440'][Math.round(y / 10) % 3] : '#e8b830'
      ctx.strokeStyle = classic ? '#183d48' : '#8a6010'
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      if (classic) { ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.stroke() }
      else { ctx.font = `italic bold ${r * 1.8}px Georgia, serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#8a6010'; ctx.fillText(strings.coinGlyph, x, y + r * 0.55) }
    }
  } else if (face < 18) {
    if (n === 1 && classic) {
      ctx.fillStyle = '#247440'; ctx.beginPath(); ctx.ellipse(20, 28, 8, 13, -0.3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(23, 13, 5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(27, 12); ctx.lineTo(34, 15); ctx.lineTo(27, 17); ctx.fill()
      ctx.strokeStyle = '#247440'; lines(ctx, [[16, 36, 10, 46], [18, 38, 22, 46], [15, 29, 8, 38], [23, 29, 29, 39]])
    } else {
      for (const [index, [x, pipY]] of dots[n - 1].entries()) {
        const y = 23 + (pipY - 11) * 0.68
        const h = n === 1 ? 30 : 5
        const w = n === 1 ? 9 : 4
        const color = n === 1 || index % 3 !== 1 ? '#1f8a3a' : '#c0392b'
        ctx.strokeStyle = color; ctx.lineWidth = 1; lines(ctx, [[x, y - h / 2 - 0.7, x, y + h / 2 + 0.7]])
        ctx.fillStyle = color; ctx.fillRect(x - w / 2, y - h / 2, w, h)
        if (classic) { ctx.fillStyle = '#f5f0dc'; ctx.fillRect(x - w / 2, y - 1, w, 1) }
        if (n === 1) { ctx.strokeStyle = '#1f8a3a'; lines(ctx, [[x - 4, y - 12, x - 7, y - 15, x - 6, y - 19], [x + 4, y - 12, x + 7, y - 15, x + 6, y - 19]]) }
      }
    }
  } else if (face < 27) {
    if (classic) {
      ctx.strokeStyle = '#b01818'; ctx.lineWidth = 2; lines(ctx, chineseDigits[n - 1], 9, 8)
      ctx.strokeStyle = '#202020'; lines(ctx, [[7, 28, 32, 28], [14, 25, 14, 31], [25, 25, 25, 31], [10, 34, 29, 34], [10, 34, 10, 43, 29, 43, 29, 34], [20, 33, 20, 47], [14, 39, 25, 39], [7, 47, 30, 47]])
    } else portrait(ctx, face, art, '#b01818')
  } else if (face < 31) {
    const wind = face - 27
    if (classic) {
      ctx.strokeStyle = '#202020'; ctx.lineWidth = 2
      const strokes = [
        [[5, 15, 35, 15], [20, 9, 20, 43], [9, 21, 31, 21, 31, 33, 9, 33, 9, 21], [9, 27, 31, 27], [20, 33, 7, 44], [20, 33, 33, 44]],
        [[7, 14, 33, 14], [20, 7, 20, 19], [9, 20, 31, 20, 31, 45], [9, 20, 9, 45], [14, 27, 27, 27], [14, 34, 27, 34], [20, 27, 20, 43]],
        [[6, 13, 34, 13], [8, 20, 32, 20, 32, 43, 8, 43, 8, 20], [16, 13, 16, 31, 11, 36], [24, 13, 24, 32, 30, 32]],
        [[16, 11, 16, 42], [7, 23, 16, 23], [7, 38, 16, 33], [25, 11, 25, 42, 33, 42], [25, 25, 34, 19]]
      ]
      lines(ctx, strokes[wind])
    } else {
      ctx.fillStyle = ['#377bb9', '#777777', '#8654a4', '#287a42'][wind]
      if (wind === 0) { ctx.beginPath(); ctx.arc(20, 23, 11, 0, Math.PI * 2); ctx.fill() }
      if (wind === 1) { ctx.fillRect(7, 14, 26, 5); ctx.fillRect(9, 19, 6, 15); ctx.fillRect(25, 19, 6, 15) }
      if (wind === 2) { ctx.beginPath(); ctx.arc(20, 29, 12, Math.PI, 0); ctx.fill(); ctx.fillRect(8, 29, 24, 2) }
      if (wind === 3) { ctx.beginPath(); ctx.ellipse(20, 23, 6, 15, 0.6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#183c22'; lines(ctx, [[10, 38, 29, 12]]) }
      label(ctx, strings.chains[wind], 20, 45, 8)
    }
    label(ctx, strings.compass[wind], 34, 9, 8)
  } else if (face < 34) {
    const dragon = face - 31
    ctx.strokeStyle = ['#c0392b', '#1f7a3a', '#2a5fa8'][dragon]; ctx.lineWidth = 2
    if (classic && dragon === 2) { ctx.strokeRect(6, 12, 28, 30); ctx.strokeRect(9, 15, 22, 24) }
    else if (classic && dragon === 0) lines(ctx, [[9, 18, 31, 18, 31, 35, 9, 35, 9, 18], [20, 10, 20, 45]])
    else if (classic) lines(ctx, [[15, 9, 10, 16, 6, 18], [14, 14, 10, 11], [24, 9, 28, 15, 34, 18], [26, 14, 30, 10], [15, 19, 25, 19], [8, 23, 17, 23, 17, 28, 9, 28, 9, 32, 17, 32, 16, 43, 12, 45], [23, 22, 29, 22, 29, 27, 33, 27], [22, 31, 32, 31, 28, 39, 22, 45], [23, 34, 28, 40, 34, 44]])
    else if (dragon === 0) {
      ctx.fillStyle = '#c0392b'
      ctx.beginPath(); ctx.moveTo(13, 20); ctx.quadraticCurveTo(3, 18, 5, 9); ctx.lineTo(15, 16)
      ctx.lineTo(25, 16); ctx.lineTo(35, 9); ctx.quadraticCurveTo(37, 18, 27, 20)
      ctx.lineTo(27, 29); ctx.quadraticCurveTo(20, 40, 13, 29); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#f5f0dc'; ctx.fillRect(15, 23, 3, 2); ctx.fillRect(22, 23, 3, 2)
      ctx.beginPath(); ctx.ellipse(20, 31, 5, 3, 0, 0, Math.PI * 2); ctx.fill()
    } else if (dragon === 1) {
      ctx.fillStyle = '#1f7a3a'
      for (const x of [11, 29]) { ctx.beginPath(); ctx.arc(x, 15, 5, 0, Math.PI * 2); ctx.fill() }
      ctx.beginPath(); ctx.ellipse(20, 26, 12, 13, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#f5f0dc'; ctx.fillRect(13, 23, 3, 2); ctx.fillRect(24, 23, 3, 2)
      ctx.beginPath(); ctx.ellipse(20, 32, 6, 4, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#1f7a3a'; ctx.beginPath(); ctx.arc(20, 30, 2, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.fillStyle = '#2a5fa8'
      ctx.beginPath(); ctx.moveTo(20, 33); ctx.quadraticCurveTo(18, 16, 5, 14)
      ctx.quadraticCurveTo(5, 29, 17, 28); ctx.lineTo(20, 36); ctx.lineTo(23, 28)
      ctx.quadraticCurveTo(35, 29, 35, 14); ctx.quadraticCurveTo(22, 16, 20, 33); ctx.fill()
      ctx.beginPath(); ctx.moveTo(5, 38); ctx.quadraticCurveTo(12, 33, 20, 38); ctx.quadraticCurveTo(28, 43, 35, 38); ctx.stroke()
    }
    if (!classic) label(ctx, strings.dragons[dragon], 20, 47, 7)
  } else if (classic) {
    const flower = face < 38
    const rank = face - (flower ? 34 : 38)
    ctx.strokeStyle = flower ? ['#a62644', '#6547a6', '#bd7c16', '#247440'][rank] : '#387aaa'
    ctx.lineWidth = 1.5
    lines(ctx, [[20, 45, 19, 27], [19, 36, 9, 31], [19, 40, 30, 34]])
    if (flower) {
      for (let i = 0; i < 5 + rank; i++) {
        const a = i * Math.PI * 2 / (5 + rank)
        ctx.beginPath(); ctx.ellipse(20 + Math.cos(a) * 7, 21 + Math.sin(a) * 7, 5, 3, a, 0, Math.PI * 2); ctx.stroke()
      }
    } else {
      const branches = [[[20, 29, 12, 16], [20, 25, 29, 13]], [[10, 20, 30, 20], [20, 10, 20, 29]], [[20, 30, 20, 12], [20, 23, 9, 18], [20, 19, 30, 12], [20, 28, 30, 23]], [[10, 15, 30, 28], [10, 28, 30, 15], [20, 10, 20, 32]]]
      lines(ctx, branches[rank])
      if (rank === 0) {
        for (const [x, y] of [[12, 16], [29, 13]]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.stroke() }
      } else if (rank === 2) lines(ctx, [[9, 18, 9, 13], [9, 18, 5, 19], [30, 12, 34, 14], [30, 23, 33, 28]])
      ctx.beginPath(); ctx.arc(20, 20, 12, 0, Math.PI * 2); ctx.stroke()
    }
    label(ctx, String(rank + 1), 33, 10, 8)
  } else {
    const flower = face < 38
    portrait(ctx, face, art, flower ? FLAG_COLORS[face - 34] : '#704898')
    label(ctx, String(face - (flower ? 34 : 38) + 1), 33, 10, 8, '#202020')
  }
  if (face >= 34) {
    ctx.fillStyle = '#f5f0dc'; ctx.fillRect(1, 1, 12, 14)
    if (face < 38) {
      ctx.strokeStyle = '#202020'; ctx.lineWidth = 1
      for (let petal = 0; petal < 4; petal++) {
        const angle = petal * Math.PI / 2
        ctx.beginPath(); ctx.ellipse(7 + Math.cos(angle) * 3, 8 + Math.sin(angle) * 3, 2.5, 1.8, angle, 0, Math.PI * 2); ctx.stroke()
      }
    } else label(ctx, classic ? strings.numerals[face - 38] : strings.seasonGlyph, 7, 11, 11)
  }
  if (face < 27) {
    const offsetX = classic && face >= 18 ? 2 : 1
    const offsetY = classic && face >= 18 ? 2 : 1
    ctx.fillStyle = '#f5f0dc'; ctx.fillRect(offsetX, offsetY, 11, 13)
    ctx.save()
    ctx.translate(offsetX, offsetY); ctx.scale(classic && face >= 18 ? 1 : 1.3, classic && face >= 18 ? 1 : 1.3)
    ctx.strokeStyle = '#b01818'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    lines(ctx, brushDigits[n - 1])
    ctx.restore()
  }
}

export function drawTile(ctx: CanvasRenderingContext2D, face: number, set: TileSet, art: Portraits, selected = false, glow = false, focused = false) {
  ctx.fillStyle = '#c8b98a'
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(40, 0); ctx.lineTo(44, 4); ctx.lineTo(44, 56); ctx.lineTo(4, 56); ctx.lineTo(0, 52); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#6b5a2e'; ctx.lineWidth = 1; ctx.stroke()
  ctx.strokeStyle = '#2f7f4f'; ctx.lineWidth = 2; lines(ctx, [[43, 5, 43, 55, 5, 55]])
  ctx.fillStyle = '#f5f0dc'; ctx.fillRect(0, 0, 40, 52)
  drawFace(ctx, face, set, art)
  ctx.strokeStyle = '#6b5a2e'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, 39, 51)
  ctx.strokeStyle = '#fffbea'; lines(ctx, [[1.5, 50, 1.5, 1.5, 38, 1.5]])
  if (selected) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 40, 52); ctx.restore() }
  if (glow) { ctx.save(); ctx.strokeStyle = '#f4d36c'; ctx.shadowColor = '#f4d36c'; ctx.shadowBlur = 3; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 38, 50); ctx.restore() }
  if (focused) {
    ctx.save(); ctx.strokeStyle = '#fffbea'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 36, 48)
    ctx.strokeStyle = '#111111'; ctx.lineWidth = 2; ctx.setLineDash([3, 2]); ctx.strokeRect(2, 2, 36, 48); ctx.restore()
  }
}

export function createTileAtlas(set: TileSet, art: Portraits): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 44 * 7
  canvas.height = 56 * 6
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  for (let face = 0; face < 42; face++) {
    ctx.save()
    ctx.translate(face % 7 * 44, Math.floor(face / 7) * 56)
    drawTile(ctx, face, set, art)
    ctx.restore()
  }
  return canvas
}

export function boardGeometry(positions: readonly Position[], height = HEIGHT, padding = 8): BoardGeometry {
  const minX = Math.min(...positions.map((p) => p.x * 40 - p.z * 4))
  const minY = Math.min(...positions.map((p) => p.y * 52 - p.z * 4))
  const w = Math.max(...positions.map((p) => p.x * 40 - p.z * 4 + 44)) - minX
  const h = Math.max(...positions.map((p) => p.y * 52 - p.z * 4 + 56)) - minY
  const scale = Math.min((WIDTH - padding * 2) / (w + 4), (height - padding * 2) / (h + 4))
  return { x: (WIDTH - (w + 4) * scale) / 2 - minX * scale, y: (height - (h + 4) * scale) / 2 - minY * scale, scale,
    width: WIDTH, height, padding, contentWidth: (w + 4) * scale, contentHeight: (h + 4) * scale,
    order: positions.map((_, i) => i).sort((a, b) => positions[a].z - positions[b].z || positions[a].x + positions[a].y - positions[b].x - positions[b].y || positions[a].x - positions[b].x) }
}
export function clampView(geometry: BoardGeometry, view: View): View {
  const x = Math.max(0, (geometry.contentWidth * view.zoom - geometry.width) / 2 + geometry.padding)
  const y = Math.max(0, (geometry.contentHeight * view.zoom - geometry.height) / 2 + geometry.padding)
  return { zoom: view.zoom, panX: Math.max(-x, Math.min(x, view.panX)), panY: Math.max(-y, Math.min(y, view.panY)) }
}
export function hitTile(game: Game, geometry: BoardGeometry, view: View, x: number, y: number): number | null {
  x = (x - geometry.width / 2 - view.panX) / view.zoom + geometry.width / 2
  y = (y - geometry.height / 2 - view.panY) / view.zoom + geometry.height / 2
  x = (x - geometry.x) / geometry.scale
  y = (y - geometry.y) / geometry.scale
  for (let k = geometry.order.length - 1; k >= 0; k--) {
    const i = geometry.order[k]
    if (game.removed[i]) continue
    const p = game.deal.positions[i]
    const tx = p.x * 40 - p.z * 4
    const ty = p.y * 52 - p.z * 4
    if (x >= tx && x < tx + 44 && y >= ty && y < ty + 56) return i
  }
  return null
}
export function drawBoard(ctx: CanvasRenderingContext2D, game: Game, geometry: BoardGeometry, view: View, set: TileSet, art: Portraits,
  options: { highlight: boolean; hint: Pair | null; hintInverted?: boolean; peek: number | null; focus: number | null }) {
  ctx.clearRect(0, 0, geometry.width, geometry.height)
  ctx.save()
  ctx.translate(geometry.width / 2 + view.panX, geometry.height / 2 + view.panY); ctx.scale(view.zoom, view.zoom); ctx.translate(-geometry.width / 2, -geometry.height / 2)
  ctx.translate(geometry.x, geometry.y); ctx.scale(geometry.scale, geometry.scale)
  if (game.deal.layout === 'bridge') {
    ctx.save(); ctx.strokeStyle = '#366868'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(160, 416); ctx.quadraticCurveTo(280, 248, 400, 416); ctx.stroke(); ctx.restore()
  }
  const under = options.peek === null ? null : game.deal.positions[options.peek]
  for (const i of geometry.order) {
    if (game.removed[i]) continue
    const p = game.deal.positions[i]
    ctx.save(); ctx.translate(p.x * 40 - p.z * 4, p.y * 52 - p.z * 4)
    if (under && p.z <= under.z && Math.abs(p.x - under.x) < 1 && Math.abs(p.y - under.y) < 1) ctx.globalAlpha = 0.3
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(4, 4, 44, 56)
    const hinted = options.hint?.includes(i) ?? false
    drawTile(ctx, game.deal.faces[i], set, art, (game.selected === i) !== (hinted && !!options.hintInverted), hinted || options.highlight && isFree(game.deal.positions, game.removed, i), options.focus === i)
    ctx.restore()
  }
  ctx.restore()
  if (under) {
    // Keep the stack fade intact; isolate the nearest covered face from ghosting.
    const beneath = geometry.order.filter((i) => !game.removed[i] && game.deal.positions[i].z < under.z &&
      Math.abs(game.deal.positions[i].x - under.x) < 1 && Math.abs(game.deal.positions[i].y - under.y) < 1)
    const index = beneath[beneath.length - 1]
    if (index !== undefined) {
      ctx.save()
      ctx.translate(geometry.padding, geometry.padding)
      ctx.fillStyle = '#003030'; ctx.fillRect(-2, -2, 48, 76)
      drawTile(ctx, game.deal.faces[index], set, art)
      label(ctx, strings.peekInset, 22, 69, 8, '#fffbea')
      ctx.restore()
    }
  }
}
