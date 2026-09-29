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
  const hc = h.getContext('2d') as CanvasRenderingContext2D
  hc.imageSmoothingEnabled = false
  if (dir === 'up') {
    // Reuse the actual silhouette, so a cap, afro or long hair survives the turn away.
    hc.drawImage(head.img, head.sx, head.sy, head.sw, head.sh, 0, 0, 16, 16)
    hc.globalCompositeOperation = 'source-in'
    hc.fillStyle = info.bald ? info.palette.skin : info.palette.hair
    hc.fillRect(0, 0, 16, 16)
    hc.globalCompositeOperation = 'source-atop'
    hc.fillStyle = '#ffffff'
    hc.globalAlpha = info.bald ? 0.25 : 0.17
    hc.fillRect(3, 2, 7, 2)
    hc.fillRect(2, 4, 3, 4)
    hc.fillStyle = '#172035'
    hc.globalAlpha = 0.28
    hc.fillRect(12, 4, 4, 12)
    hc.fillRect(0, 13, 16, 3)
    hc.globalAlpha = 1
    hc.fillStyle = info.palette.skin
    hc.fillRect(6, 14, 4, 2)
  } else if (dir === 'left' || dir === 'right') {
    // A three-quarter turn: narrower face, looking toward the leading edge, with a shaded back quarter.
    if (dir === 'left') {
      hc.translate(16, 0)
      hc.scale(-1, 1)
    }
    hc.drawImage(head.img, head.sx, head.sy, head.sw, head.sh, 3, 0, 13, 16)
    hc.globalCompositeOperation = 'source-atop'
    hc.fillStyle = info.bald ? info.palette.skin : info.palette.hair
    hc.fillRect(3, 3, 3, 11)
    hc.fillStyle = '#172035'
    hc.globalAlpha = 0.16
    hc.fillRect(3, 5, 2, 9)
  } else {
    hc.drawImage(head.img, head.sx, head.sy, head.sw, head.sh, 0, 0, 16, 16)
  }
  ctx.drawImage(h, 0, bob)
  return c
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
