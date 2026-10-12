import type { CardPointerFeedback } from './interaction'
import { CARD_H, CARD_W, type Card } from './model'
import { drawCardIndex, drawFace } from './render'
import './cards.css'

/** A difference dotted line remains visible on both white faces and dark backs. */
export function drawFocus(ctx: CanvasRenderingContext2D, x: number, y: number, width = CARD_W, height = CARD_H) {
  ctx.save()
  ctx.globalCompositeOperation = 'difference'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.setLineDash([1, 1])
  ctx.strokeRect(Math.round(x) + 2.5, Math.round(y) + 2.5, Math.round(width) - 5, Math.round(height) - 5)
  ctx.restore()
}

/** XP FreeCell cells use an inset rim, without assigning a suit before an Ace arrives. */
export function drawSunkenEmpty(ctx: CanvasRenderingContext2D, x: number, y: number) {
  x = Math.round(x)
  y = Math.round(y)
  ctx.save()
  ctx.fillStyle = '#004000'
  ctx.fillRect(x + 2, y, CARD_W - 4, 1)
  ctx.fillRect(x, y + 2, 1, CARD_H - 4)
  ctx.fillRect(x + 1, y + 1, 1, 1)
  ctx.fillStyle = '#00a000'
  ctx.fillRect(x + 2, y + CARD_H - 1, CARD_W - 4, 1)
  ctx.fillRect(x + CARD_W - 1, y + 2, 1, CARD_H - 4)
  ctx.fillRect(x + CARD_W - 2, y + CARD_H - 2, 1, 1)
  ctx.restore()
}

/** Surface-local CSS pixels, deliberately above rather than beneath the touch point. */
export function CardHoldFeedback({ hold }: { hold: CardPointerFeedback | null }) {
  return hold && <span aria-hidden='true' className='remy-card-hold' style={{
    left: hold.x - 22,
    top: hold.y - 70,
    transform: `scale(${1 - hold.progress})`,
  }} />
}

type PocketFaceOptions = { indexScale?: number; selected?: boolean; ghost?: boolean }
const pocketDefaults: PocketFaceOptions = {}
const pocketBodyOptions = { smoothing: true }

function pocketIndex(ctx: CanvasRenderingContext2D, card: Card, scale: number) {
  const rankWidth = (card.rank === 10 ? 9 : 7) * scale
  ctx.save()
  ctx.beginPath()
  ctx.rect(3, 3, rankWidth, 9 * scale)
  ctx.clip()
  drawCardIndex(ctx, card, 3, 3, scale)
  ctx.restore()
  const pipX = 3 + rankWidth + 2
  const pipY = 3 + Math.floor((9 * scale - 7) / 2)
  ctx.save()
  ctx.beginPath()
  ctx.rect(pipX, pipY, 7, 7)
  ctx.clip()
  drawCardIndex(ctx, card, pipX - (card.rank === 10 ? 1 : 0), pipY - 10)
  ctx.restore()
}

/** Pocket cards keep the original body aspect ratio and paint enlarged, integer CSS-pixel indices. */
export function drawPocketFace(
  ctx: CanvasRenderingContext2D, card: Card, x: number, y: number, width: number, height: number, opts = pocketDefaults,
) {
  x = Math.round(x)
  y = Math.round(y)
  width = Math.round(width)
  height = Math.round(height)
  const indexScale = opts.indexScale ?? 2
  const margin = 9 * indexScale + 4
  const bodyScale = Math.min(width / CARD_W, (height - margin * 2) / 72)
  ctx.save()
  ctx.translate(x, y)
  if (opts.ghost) ctx.globalAlpha *= 0.45
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(2, 1, width - 4, height - 2)
  ctx.fillRect(1, 2, width - 2, height - 4)
  ctx.fillStyle = '#000000'
  ctx.fillRect(2, 0, width - 4, 1)
  ctx.fillRect(2, height - 1, width - 4, 1)
  ctx.fillRect(0, 2, 1, height - 4)
  ctx.fillRect(width - 1, 2, 1, height - 4)
  ctx.fillRect(1, 1, 1, 1)
  ctx.fillRect(1, height - 2, 1, 1)
  ctx.fillRect(width - 2, 1, 1, 1)
  ctx.fillRect(width - 2, height - 2, 1, 1)
  ctx.save()
  ctx.beginPath()
  ctx.rect(2, margin, width - 4, height - margin * 2)
  ctx.clip()
  ctx.translate((width - CARD_W * bodyScale) / 2, (height - CARD_H * bodyScale) / 2)
  ctx.scale(bodyScale, bodyScale)
  ctx.beginPath()
  ctx.rect(12, 2, 47, 92)
  ctx.clip()
  drawFace(ctx, card, 0, 0, pocketBodyOptions)
  ctx.restore()
  pocketIndex(ctx, card, indexScale)
  ctx.save()
  ctx.transform(-1, 0, 0, -1, width, height)
  pocketIndex(ctx, card, indexScale)
  ctx.restore()
  if (opts.selected) {
    ctx.globalCompositeOperation = 'difference'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(1, 1, width - 2, height - 2)
  }
  ctx.restore()
}
