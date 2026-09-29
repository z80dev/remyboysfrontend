/** Real portrait heads on tiny walking bodies. All compositing happens once, never in the world frame. */
import { art, type AtlasRect } from '../art'
import type { Dir } from '../types'
import { drawActor } from './actors'

const DIR_INDEX: Record<Dir, number> = { down: 0, up: 1, left: 2, right: 3 }
type Outfit = 'cabald' | 'cabald-admin'
const cache = new Map<number, HTMLCanvasElement>()
// Bound long-session memory: 768 cached poses, evicting the oldest generated pose when full.
const MAX_SPRITES = 768

function sprite(idx: number, dir: Dir, frame: number, head: AtlasRect | null, outfit?: Outfit): HTMLCanvasElement {
  const info = art.get(idx)
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 24
  const ctx = c.getContext('2d') as CanvasRenderingContext2D
  ctx.imageSmoothingEnabled = false
  const bob = frame ? 1 : 0
  // Preserve the existing beautifully shaded arms, tiny shoes and alternating-foot walk cycle.
  ctx.save()
  if (head) {
    ctx.beginPath()
    ctx.rect(0, 15 + bob, 16, 9 - bob)
    ctx.clip()
  }
  const look = outfit ? { ...info.look, shirt: '#11131b', pants: '#20232c', extra: undefined } : info.look
  drawActor(ctx, look, dir, frame, 0, 8)
  ctx.restore()
  if (outfit) {
    // Keep the costume inside the torso silhouette; it is layered over the animated base body.
    ctx.fillStyle = '#11131b'
    ctx.fillRect(4, 15 + bob, 8, 6)
    ctx.fillRect(3, 16 + bob, 2, 4)
    ctx.fillRect(11, 16 + bob, 2, 4)
    ctx.fillStyle = '#262a35'
    ctx.fillRect(5, 15 + bob, 6, 1)
    ctx.fillRect(5, 20 + bob, 6, 1)
    if (outfit === 'cabald-admin') {
      ctx.fillStyle = '#a51e32'
      ctx.fillRect(4, 15 + bob, 1, 6)
      ctx.fillRect(11, 15 + bob, 1, 6)
      ctx.fillRect(5, 20 + bob, 6, 1)
      ctx.fillRect(12, 16 + bob, 2, 5)
      ctx.fillRect(13, 17 + bob, 1, 5)
    }
    // Tiny gold C / bald head / red-heart insignia.
    ctx.fillStyle = '#f2c84b'
    ctx.fillRect(6, 17 + bob, 3, 1)
    ctx.fillRect(6, 18 + bob, 1, 1)
    ctx.fillRect(6, 19 + bob, 3, 1)
    ctx.fillStyle = '#f2c84b'
    ctx.fillRect(8, 18 + bob, 1, 1)
    ctx.fillStyle = '#e83b4d'
    ctx.fillRect(9, 18 + bob, 1, 1)
    ctx.fillRect(11, 18 + bob, 1, 1)
    ctx.fillRect(10, 19 + bob, 1, 1)
    // The full fallback actor above keeps its head when the atlas is unavailable.
  }

  if (!head) return c
  const h = document.createElement('canvas')
  h.width = h.height = 16
  const hc = h.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  hc.imageSmoothingEnabled = false
  const side = art.side(idx) ?? head
  if (dir === 'up') {
    // The back of the head: the real silhouette (caps, afros and long hair survive the turn), repainted as a lit
    // hair ramp with the pipeline's dark rim, and a sliver of neck.
    hc.drawImage(head.img, head.sx, head.sy, head.sw, head.sh, 0, 0, 16, 16)
    const img = hc.getImageData(0, 0, 16, 16)
    const d = img.data
    const base = hexRgb(info.bald ? info.palette.skin : info.palette.hair)
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < 16 && y < 16 && d[(y * 16 + x) * 4 + 3] > 0
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (!solid(x, y)) continue
        const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)
        const k = edge ? -0.62 : x + y < 9 ? 0.22 : x > 11 || y > 12 ? -0.24 : 0
        const i = (y * 16 + x) * 4
        for (let ch = 0; ch < 3; ch++) {
          const v = base[ch]
          d[i + ch] = k < 0 ? v + (RIM[ch] - v) * -k : v + (255 - v) * k
        }
      }
    hc.putImageData(img, 0, 0)
    hc.fillStyle = info.palette.skin
    hc.fillRect(6, 14, 4, 2)
  } else if (dir === 'left' || dir === 'right') {
    if (dir === 'left') {
      hc.translate(16, 0)
      hc.scale(-1, 1)
    }
    hc.drawImage(side.img, side.sx, side.sy, side.sw, side.sh, 0, 0, 16, 16)
  } else {
    hc.drawImage(head.img, head.sx, head.sy, head.sw, head.sh, 0, 0, 16, 16)
  }
  ctx.drawImage(h, 0, bob)
  return c
}

const RIM = [26, 18, 40]
function hexRgb(hex: string): number[] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Tile-anchored, 16×24 max: the head extends eight logical pixels above the standing tile. */
export function drawRemyActor(
  ctx: CanvasRenderingContext2D, idx: number, dir: Dir, frame: number, px: number, py: number, outfit?: Outfit,
): void {
  const step = frame === 1 ? 1 : frame === 3 ? 2 : 0
  const outfitKey = outfit === 'cabald-admin' ? 2 : outfit ? 1 : 0
  const key = idx * 36 + DIR_INDEX[dir] * 9 + step * 3 + outfitKey
  let image = cache.get(key)
  if (!image) {
    image = sprite(idx, dir, step === 2 ? 3 : step, art.head(idx), outfit)
    if (cache.size >= MAX_SPRITES) cache.delete(cache.keys().next().value as number)
    cache.set(key, image)
  }
  ctx.drawImage(image, px | 0, (py | 0) - 8)
}
