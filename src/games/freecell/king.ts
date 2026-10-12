import type { RemyPalette } from '../kit'

const crown = [
  '.K...K...K.',
  'KYK.KYK.KYK',
  'KYYKYYYKYYK',
  'KYBYYRYYBYK',
  'KSSSSSSSSSK',
  'KKKKKKKKKKK'
]
const hand = ['.K.K.', 'KsKsK', 'KsssK', 'KsssK', 'KsssK', '.KsK.', '..K..']
const holding = ['KKKK', 'KssK', 'KssK', '.KK.']

/** ArtDirector-approved 24×24 pixels, drawn at integer 2× inside the complete 48×48 panel. */
export function drawKing(ctx: CanvasRenderingContext2D, p: RemyPalette, look: number, mood: 'idle' | 'win' | 'loss', frame: number) {
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.scale(2, 2)
  const bow = mood === 'win' && frame === 1 ? 2 : 0
  const colors: Record<string, string> = { K: '#000000', Y: '#ffd700', S: '#c09000', R: '#e00000', B: '#0000c0', s: p.skin }
  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }
  const pixels = (rows: readonly string[], x: number, y: number, tipped = false) => {
    rows.forEach((row, r) => {
      const shift = tipped ? Math.floor((5 - r) / 2) : 0
      for (let column = 0; column < row.length; column++) {
        const color = colors[row[column]]
        if (color) box(color, x + column + shift, y + r, 1, 1)
      }
    })
  }
  box('#000000', 4, 17, 16, 7)
  box(p.shirt, 5, 18, 14, 5)
  box('#000000', 6, 6 + bow, 12, 12)
  box(p.skin, 7, 7 + bow, 10, 10)
  box(p.hair, 6, 6 + bow, 12, 3)
  box(p.hair, 7, 9 + bow, 2, 2)
  box(p.hair, 15, 9 + bow, 2, 2)
  box('#ffffff', 7, 10 + bow, 4, 3)
  box('#ffffff', 13, 10 + bow, 4, 3)
  box(p.eye, 8 + look, 10 + bow, 2, 3)
  box(p.eye, 14 + look, 10 + bow, 2, 3)
  box('#000000', 10, 15 + bow, 4, 1)
  box('#ffffff', 4, 17, 16, 2)
  for (let x = 5; x <= 17; x += 3) box('#000000', x, 18, 1, 1)
  pixels(crown, bow ? 8 : mood === 'loss' ? 8 : 6, mood === 'loss' ? 1 : 0, !!bow)
  if (bow) pixels(holding, 18, 5)
  if (mood === 'win') {
    box('#000000', 7, 10 + bow, 10, 2)
    box('#ffffff', 8, 10 + bow, 1, 1)
    box('#ffffff', 14, 10 + bow, 1, 1)
    if (frame === 2) {
      box('#ffffff', 16, 1, 3, 1)
      box('#ffffff', 17, 0, 1, 3)
    }
  }
  if (mood === 'loss') {
    pixels(hand, 7, 11)
    pixels(hand, 13, 11)
    box('#1f9bf0', 19, 9, 1, 1)
  }
  ctx.restore()
}
