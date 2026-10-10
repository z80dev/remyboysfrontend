import type { RemyPalette } from '../kit'

/** Opus-approved procedural 32×32 sprite; no portrait mirroring or network sprite assets. */
export function drawKing(ctx: CanvasRenderingContext2D, p: RemyPalette, look: number, mood: 'idle' | 'win' | 'loss', frame: number) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, 48, 48)
  ctx.clip()
  ctx.translate(-8, -8)
  ctx.scale(2, 2)
  const bow = mood === 'win' && frame === 1 ? 2 : 0
  const box = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y + bow, w, h) }
  box('#000000', 6, 21, 20, 11)
  box(p.shirt, 7, 22, 18, 10)
  box('#ffffff', 6, 21, 20, 4)
  for (let x = 7; x < 26; x += 3) box('#000000', x, 23, 1, 1)
  box('#000000', 8, 8, 16, 15)
  box(p.skin, 9, 10, 14, 12)
  box(p.hair, 8, 8, 16, 5)
  box(p.hair, 9, 12, 2, 3)
  box(p.hair, 14, 12, 2, 2)
  box(p.hair, 20, 12, 3, 3)
  box('#ffffff', 11, 15, 4, 4)
  box('#ffffff', 18, 15, 4, 4)
  box(p.eye, 12 + look, 15, 2, 3)
  box(p.eye, 19 + look, 15, 2, 3)
  box('#000000', 14, 20, 5, 1)
  ctx.save()
  if (mood === 'win' && frame === 1) { ctx.translate(22, 9); ctx.rotate(Math.PI / 9); ctx.translate(-16, -6) }
  if (mood === 'loss') ctx.translate(2, 0)
  box('#000000', 8, 5, 16, 5)
  box('#c09000', 9, 5, 14, 4)
  box('#ffd700', 9, 3, 3, 5)
  box('#ffd700', 14, 1, 4, 7)
  box('#ffd700', 20, 3, 3, 5)
  box('#ffd700', 9, 7, 14, 2)
  box('#e00000', 15, 6, 2, 2)
  box('#0000c0', 10, 6, 1, 1)
  ctx.restore()
  if (mood === 'win') {
    box('#000000', 10, frame === 0 ? 13 : 15, 13, 3)
    box('#ffffff', 11, frame === 0 ? 13 : 15, 2, 1)
    box('#ffffff', 19, frame === 0 ? 13 : 15, 2, 1)
    if (frame === 2) { box('#ffffff', 16, 0, 1, 3); box('#ffffff', 15, 1, 3, 1) }
  }
  if (mood === 'loss') { box(p.skin, 10, 15, 5, 7); box(p.skin, 18, 15, 5, 7); box('#1f9bf0', 24, 14, 1, 1) }
  ctx.restore()
}
