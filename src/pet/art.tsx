/** Remygotchi pixel art: hats drawn as palette grids, and where a Quest chibi's head is so a hat can sit on it. */
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import { questSrc } from '../lib/media'
import type { HatId } from './engine'

type Pixels = { rows: string[]; pal: Record<string, string>; /** Rows of the hat that sink into the hair. */ sink: number }

const K = '#2a1a10'
const GOLD = { k: K, y: '#ffcf2e', Y: '#fff3a6', o: '#d18b00' }

/** One char per pixel; `.` is transparent. Widths are in Quest-sprite pixels (the chibi is 76×116). */
export const HAT_PIXELS: Record<HatId, Pixels> = {
  party: {
    sink: 3,
    pal: { k: K, m: '#ff4fa3', c: '#3ad6ff', y: '#ffe14a', w: '#ffffff' },
    rows: [
      '.....y.....',
      '....yyy....',
      '.....y.....',
      '....kmk....',
      '....mcm....',
      '...kmmmk...',
      '...mwccm...',
      '..kmmmmmk..',
      '..mwcccmm..',
      '.kmmmmmmmk.',
      '.mwccccccm.',
      'kmmmmmmmmmk',
      'kyyyyyyyyyk',
      '.kkkkkkkkk.',
    ],
  },
  crown: {
    sink: 3,
    pal: { ...GOLD, r: '#e8304a', b: '#2d8cff', g: '#2fd16b' },
    rows: [
      '.k.....k.....k.',
      'kYk...kYk...kYk',
      'kyk...kyk...kyk',
      'kyyk.kyyyk.kyyk',
      'kyyykyyyyykyyyk',
      'kyYyyyyyyyyyyok',
      'kyyyyyyyyyyyyok',
      'kYryyybyyygyyok',
      'kyyyyyyyyyyyyok',
      'koooooooooooook',
      '.kkkkkkkkkkkkk.',
    ],
  },
  diamond: {
    sink: 3,
    pal: { k: '#0e2a4a', w: '#ffffff', c: '#9ff3ff', b: '#3bc6ff', d: '#1a7fd1', p: '#ff7ce0' },
    rows: [
      '...k.....k.....k...',
      '..kwk...kwk...kwk..',
      '.kcbdk.kcwbk.kcbdk.',
      '..kck...kck...kck..',
      '.kccck.kcccck.kcck.',
      '.kcwccckcccccckcck.',
      '.kccccccccccccccdk.',
      '.kcwpccccwccccpcdk.',
      '.kccccccccccccccdk.',
      '.kbbbbbbbbbbbbbbdk.',
      '..kkkkkkkkkkkkkkk..',
    ],
  },
  halo: {
    sink: -1,
    pal: { k: '#c99a00', y: '#fff36b', Y: '#ffffff' },
    rows: [
      '....kkkkkkkkkk....',
      '..kkyyYYYYYYyykk..',
      '.kyyk........kyyk.',
      '.kyyk........kyyk.',
      '..kkyyyyyyyyyykk..',
      '....kkkkkkkkkk....',
    ],
  },
  wizard: {
    sink: 3,
    pal: { k: '#1b0f33', p: '#5b3cc4', P: '#7d5cff', y: '#ffe14a', b: '#2a1a6e' },
    rows: [
      '...........kk......',
      '..........kPpk.....',
      '.........kPppk.....',
      '.........kPpk......',
      '........kPppk......',
      '........kPypk......',
      '.......kPppppk.....',
      '.......kPpppyk.....',
      '......kPppppppk....',
      '......kPpyppppk....',
      '.....kPpppppppk....',
      '.....kPpppppyppk...',
      '....kbbbbbbbbbbk...',
      '..kkPpppppppppppkk.',
      '.kPppppppppppppppPk',
      '.kkkkkkkkkkkkkkkkk.',
    ],
  },
  beanie: {
    sink: 6,
    pal: { k: K, r: '#e23b3b', R: '#ff6b5b', d: '#a8222a', w: '#ffffff', W: '#e6e6f0' },
    rows: [
      '.......kkkk.......',
      '......kwWwWk......',
      '......kWwwWk......',
      '.....kkkkkkkk.....',
      '...kkRrrrrrrrkk...',
      '..kRrrrrrrrrrrdk..',
      '.kRrrrrrrrrrrrrdk.',
      '.kRrrrrrrrrrrrrdk.',
      'kwWwWwWwWwWwWwWwWk',
      'kWwWwWwWwWwWwWwWwk',
      '.kkkkkkkkkkkkkkkk.',
    ],
  },
  chef: {
    sink: 3,
    pal: { k: '#5a5a6e', w: '#ffffff', g: '#dfe3ee' },
    rows: [
      '...kkk..kkk..kk...',
      '..kwwwkkwwwkkwwk..',
      '.kwwwwwwwwwwwwwwk.',
      'kwwwwwwwwwwwwwwwgk',
      'kwwwwwwwwwwwwwwggk',
      '.kwwwwwwwwwwwwwgk.',
      '..kwwwwwwwwwwwgk..',
      '..kwwgwwwgwwwggk..',
      '..kwwgwwwgwwwggk..',
      '..kwwwwwwwwwwwgk..',
      '..kkkkkkkkkkkkkk..',
    ],
  },
  cowboy: {
    sink: 3,
    pal: { k: '#3a1f0a', b: '#a8642a', B: '#c98444', d: '#7a4517', r: '#d43a2a' },
    rows: [
      '........kkkkkkkk........',
      '.......kBbbbbbbdk.......',
      '......kBbbbkkbbbdk......',
      '......kBbbbbbbbbdk......',
      '......kBbbbbbbbbdk......',
      '......krrrrrrrrrrk......',
      'kk....kddddddddddk....kk',
      'kBkkkkBbbbbbbbbbbbkkkkdk',
      '.kBBbbbbbbbbbbbbbbbbbdk.',
      '..kkkkkkkkkkkkkkkkkkkk..',
    ],
  },
  witch: {
    sink: 3,
    pal: { k: '#0e0a16', b: '#2e2540', B: '#4a3d66', p: '#9b4dff', y: '#ffd23a' },
    rows: [
      '..kk..................',
      '..kBkk................',
      '...kBbk...............',
      '....kBbk..............',
      '.....kBbk.............',
      '......kBbk............',
      '......kBbbk...........',
      '.......kBbbk..........',
      '.......kBbbbk.........',
      '......kBbbbbbk........',
      '......kBbbbbbbk.......',
      '.....kppppyypppk......',
      '.....kppppyypppk......',
      '..kkkBbbbbbbbbbbkkk...',
      'kkBBbbbbbbbbbbbbbbbbkk',
      '.kkkkkkkkkkkkkkkkkkkk.',
    ],
  },
  propeller: {
    sink: 4,
    pal: { k: K, r: '#ff3b3b', y: '#ffd23a', b: '#2d8cff', g: '#2fd16b', w: '#ffffff' },
    rows: [
      'kkkkkkkk..kkkkkkkk',
      'krrrrrrkkkbbbbbbbk',
      '.kkkkkkkykkkkkkkk.',
      '........k.........',
      '.....kkkkkkkk.....',
      '...kkrrryybbbkk...',
      '..krrrrryybbbbbk..',
      '.krrrrrryybbbbbbk.',
      '.kggggggggggggggk.',
      'kkkkkkkkkkkkkkkkkk',
    ],
  },
  santa: {
    sink: 5,
    pal: { k: '#3a0a0a', r: '#e02c2c', R: '#ff5a4a', d: '#a3141c', w: '#ffffff', W: '#e6e6f0' },
    rows: [
      '................kkk.',
      '............kkkkwWWk',
      '.........kkkRrrkWwWk',
      '.......kkRrrrrrdkkk.',
      '.....kkRrrrrrrrrdk..',
      '....kRrrrrrrrrrrdk..',
      '...kRrrrrrrrrrrrrdk.',
      '..kRrrrrrrrrrrrrrrdk',
      '.kwWwWwWwWwWwWwWwWwk',
      '.kWwWwWwWwWwWwWwWwWk',
      '..kkkkkkkkkkkkkkkkk.',
    ],
  },
  bow: {
    sink: 5,
    pal: { k: '#5a0a3a', p: '#ff6ec7', P: '#ffa6de', d: '#d43f9a' },
    rows: [
      '.kkk.......kkk.',
      'kPppkk...kkppPk',
      'kPpppdkkkdpppPk',
      'kPppppkpkppppPk',
      'kpppppkPkpppppk',
      'kdpppdkpkdpppdk',
      'kddkkk.k.kkkddk',
      '.kk.......kk...',
    ],
  },
}

/** A hat as crisp SVG rects (horizontal runs merged), sized in sprite pixels. */
export function HatArt({ hat, className, style }: { hat: HatId; className?: string; style?: CSSProperties }) {
  const { rows, pal } = HAT_PIXELS[hat]
  const w = Math.max(...rows.map((r) => r.length))
  const rects: ReactNode[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      let end = x + 1
      while (end < row.length && row[end] === c) end++
      // biome-ignore lint/suspicious/noArrayIndexKey: a pixel run's position is its identity
      if (c !== '.' && pal[c]) rects.push(<rect key={`${x}.${y}`} x={x} y={y} width={end - x} height={1} fill={pal[c]} />)
      x = end
    }
  })
  return (
    <svg
      className={className}
      style={style}
      width={w}
      height={rows.length}
      viewBox={`0 0 ${w} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rects}
    </svg>
  )
}

/** Hat pixels are 2×2 sprite pixels: the chibis' heads are ~40px wide, chunky hats read at a glance. */
const HAT_PX = 2

/** On-sprite size and sink of a hat, in sprite pixels. */
export const hatSize = (hat: HatId) => {
  const { rows, sink } = HAT_PIXELS[hat]
  return { w: Math.max(...rows.map((r) => r.length)) * HAT_PX, h: rows.length * HAT_PX, sink: sink * HAT_PX }
}

export const SPRITE_W = 76
export const SPRITE_H = 116
export const spriteSrc = (art: number) => questSrc(`sprites/${art}.webp`)

/** Top of the hair and the head's centre column, in sprite pixels. */
export type Anchor = { top: number; cx: number }
const FALLBACK: Anchor = { top: 4, cx: SPRITE_W / 2 }
const anchors = new Map<number, Promise<Anchor>>()

async function scan(art: number): Promise<Anchor> {
  const img = new Image()
  img.src = spriteSrc(art)
  await img.decode()
  const c = document.createElement('canvas')
  c.width = SPRITE_W
  c.height = SPRITE_H
  const g = c.getContext('2d', { willReadFrequently: true })
  if (!g) return FALLBACK
  g.drawImage(img, 0, 0)
  const { data } = g.getImageData(0, 0, SPRITE_W, SPRITE_H)
  const solid = (x: number, y: number) => data[(y * SPRITE_W + x) * 4 + 3] > 128
  let top = -1
  for (let y = 0; y < SPRITE_H && top < 0; y++) {
    let n = 0
    for (let x = 0; x < SPRITE_W; x++) if (solid(x, y)) n++
    if (n >= 3) top = y
  }
  if (top < 0) return FALLBACK
  // Centre of the head: mean of solid columns over the first 14 rows of hair.
  let sum = 0
  let n = 0
  for (let y = top; y < Math.min(SPRITE_H, top + 14); y++)
    for (let x = 0; x < SPRITE_W; x++)
      if (solid(x, y)) {
        sum += x
        n++
      }
  return { top, cx: n ? sum / n : FALLBACK.cx }
}

/** Cached per art index; a failed load or tainted canvas falls back to the sprite's top centre. */
function measure(art: number): Promise<Anchor> {
  let hit = anchors.get(art)
  if (!hit) {
    hit = scan(art).catch(() => FALLBACK)
    anchors.set(art, hit)
  }
  return hit
}

export function useAnchor(art: number | undefined): Anchor {
  const [anchor, setAnchor] = useState<Anchor>(FALLBACK)
  useEffect(() => {
    if (art === undefined) return
    let live = true
    void measure(art).then((a) => live && setAnchor(a))
    return () => {
      live = false
    }
  }, [art])
  return anchor
}
