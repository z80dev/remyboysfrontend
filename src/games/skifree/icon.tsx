import type { ReactNode } from 'react'

/**
 * SkiFree icon: a 1991-style pixel skier in a red jacket carving downhill, with a tiny bald (and pink) Abominable
 * Cabald peeking over a snow ridge. Authored as pixel rows and emitted as one crisp path per VGA colour.
 */
const COLOURS: Record<string, string> = {
  k: '#000000',
  r: '#ff0000',
  m: '#800000',
  n: '#000080',
  w: '#ffffff',
  s: '#c0c0c0',
  g: '#808080',
  M: '#ff00ff',
}

const SKIER = [
  '.....ww.........',
  '....wwkkk.......',
  '.....knnnk......',
  '....knnnnnk.....',
  '...knnnnnnnk....',
  '...ksssssssk....',
  '...kwkwwwkwk....',
  '...kwwwwwwwk....',
  '....kwkkkwk.....',
  '....kkwwwkk.....',
  '...krrrrrrrk....',
  '..krrrrrrrrrk...',
  '.krrkrrmrrkrrk..',
  'krrk.krmrk.krrk.',
  'kwwk.krrrk.kwwk.',
  '.kk..knnnk..kk..',
  '.....knnnnk.....',
  '.....knnknnk....',
  '......knk.knk...',
  '......kkk.kkk...',
]

const CABALD = [
  '...kkkkkk...',
  '..kPPwwPPk..',
  '.kPPPPwPPPk.',
  'kPPPPPPPPPPk',
  'kPkkPPPPkkPk',
  'kPrkPPPPkrPk',
  'kPPPPPPPPPPk',
  'kPPPkkkkPPPk',
]

const HAND = ['.kkk.', 'kwwwk', 'k.k.k']

const grid: string[] = new Array(32 * 32).fill('')

function plot(x: number, y: number, c: string, under = false): void {
  if (x < 0 || y < 0 || x > 31 || y > 31) return
  if (under && grid[y * 32 + x]) return
  grid[y * 32 + x] = c
}

function art(rows: string[], ox: number, oy: number): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.') continue
      plot(ox + x, oy + y, ch === 'P' ? ((ox + x + oy + y) & 1 ? 'M' : 'w') : ch)
    }
  })
}

function line(x0: number, y0: number, x1: number, y1: number, c: string, under = false): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= steps; i++) plot(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), c, under)
}

// The Cabald, then the snow ridge he hides behind, then his claws on the ridge.
art(CABALD, 20, 20)
for (let x = 14; x < 32; x++) {
  const top = x < 16 ? 29 - (x - 14) : 27
  plot(x, top, 'k')
  for (let y = top + 1; y < 32; y++) plot(x, y, (x * 7 + y * 3) % 11 === 0 ? 's' : 'w')
}
plot(13, 30, 'k')
plot(12, 31, 'k')
art(HAND, 17, 25)

// The skier, skis passing behind the boots, poles and a puff of snow spray.
art(SKIER, 5, 2)
line(8, 18, 16, 24, 'k', true)
line(12, 18, 20, 24, 'k', true)
line(6, 17, 3, 24, 'g')
line(18, 17, 21, 23, 'g')
for (const [x, y] of [[3, 20], [1, 22], [5, 24], [2, 25], [6, 27], [9, 26], [4, 28]]) plot(x, y, 's')

const paths: Record<string, string> = {}
for (let y = 0; y < 32; y++) {
  let x = 0
  while (x < 32) {
    const c = grid[y * 32 + x]
    let end = x + 1
    while (end < 32 && grid[y * 32 + end] === c) end++
    if (c) paths[c] = `${paths[c] ?? ''}M${x} ${y}h${end - x}v1h-${end - x}z`
    x = end
  }
}

export const skiFreeIcon: ReactNode = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shapeRendering="crispEdges" aria-hidden="true">
    {Object.keys(paths).map((c) => (
      <path key={c} fill={COLOURS[c]} d={paths[c]} />
    ))}
  </svg>
)
