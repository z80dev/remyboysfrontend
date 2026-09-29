/** Cached terminal architecture and split-flap signage; words and palettes, never chain logos. */
import type { MapObject } from '../types'
import type { Light, ObjSprite } from './objects'
import { Px, hex, text, textWidth } from './px'

const CHAINS = [
  { id: 'base', name: 'BASE', color: '#4386ff', rgb: '67,134,255' },
  { id: 'mainnet', name: 'ETH MAINNET', color: '#b4acef', rgb: '180,172,239' },
  { id: 'solana', name: 'SOLANA', color: '#57e3c1', rgb: '87,227,193' },
  { id: 'robinhood', name: 'ROBINHOOD CHAIN', color: '#b8e96b', rgb: '184,233,107' },
] as const
const ink = hex('#142338')
const rim = hex('#7893ae')
const white = hex('#eef6ff')
const blue = hex('#4386ff')

function label(p: Px, s: string, y: number, color = white) {
  text(p, s, Math.floor((p.w - textWidth(s)) / 2), y, color)
}

export function terminal(): ObjSprite {
  const p = new Px(96, 84)
  p.rect(2, 16, 92, 68, ink)
  p.rect(4, 18, 88, 64, hex('#c2d2e0'))
  p.rect(7, 39, 82, 38, hex('#477094'))
  for (let x = 8; x < 87; x += 13) {
    p.rect(x, 41, 11, 31, hex('#78b9df'))
    p.hl(x + 1, 43, 8, hex('#c3efff'))
    p.vl(x + 1, 44, 27, hex('#a0d9f4'))
  }
  p.rect(0, 13, 96, 9, ink)
  p.hl(1, 13, 94, white)
  for (let i = 0; i < 4; i++) p.rect(2 + i * 23, 17, 23, 3, hex(CHAINS[i].color))
  p.rect(9, 23, 78, 13, ink)
  label(p, 'BRIDGE TERMINAL', 27)
  p.rect(31, 53, 18, 31, ink)
  p.rect(33, 55, 14, 27, hex('#77c9ef'))
  p.vl(39, 55, 27, ink)
  p.hl(34, 69, 4, white)
  p.hl(41, 69, 4, white)
  p.rect(30, 81, 20, 3, rim)
  p.rect(57, 57, 25, 16, ink)
  text(p, 'ARRIVE', 58, 60, white)
  text(p, 'EXPLORE', 56, 67, hex('#b8e96b'))
  p.rect(11, 3, 15, 10, ink)
  p.rect(13, 5, 11, 8, blue)
  p.hl(16, 8, 5, white)
  p.rect(68, 4, 14, 9, rim)
  p.hl(69, 5, 12, white)
  return { img: p.toCanvas(), ox: 0, oy: -20 }
}

export function departureBoard(): ObjSprite {
  const p = new Px(128, 48)
  p.rect(1, 0, 126, 46, ink)
  p.hl(2, 0, 124, rim)
  p.vl(1, 1, 44, rim)
  p.rect(5, 4, 118, 9, hex('#2c4763'))
  label(p, 'DEPARTURES', 6)
  for (let i = 0; i < 4; i++) {
    p.rect(5, 16 + i * 7, 118, 6, hex('#0b1526'))
    p.rect(7, 17 + i * 7, 2, 3, hex(CHAINS[i].color))
    text(p, CHAINS[i].name, 13, 16 + i * 7, hex(CHAINS[i].color))
    text(p, `G${i + 1}`, 111, 16 + i * 7, white)
  }
  p.rect(12, 46, 5, 2, rim)
  p.rect(111, 46, 5, 2, rim)
  return { img: p.toCanvas(), ox: 0, oy: 0 }
}

export function bridgeGate(variant: number): ObjSprite {
  const c = hex(CHAINS[variant].color)
  const p = new Px(64, 44)
  p.rect(1, 0, 62, 43, ink)
  p.rect(5, 14, 54, 28, hex('#1b3048'))
  p.rect(0, 0, 64, 12, rim)
  p.rect(1, 1, 62, 10, ink)
  label(p, CHAINS[variant].name, 3, c)
  for (const x of [2, 59]) {
    p.rect(x, 13, 3, 28, rim)
    p.vl(x + 1, 15, 24, c)
  }
  p.hl(5, 41, 54, c)
  p.hl(9, 43, 46, rim)
  text(p, `G${variant + 1}`, 7, 16, white)
  return { img: p.toCanvas(), ox: 0, oy: -12 }
}

export function bagScanner(): ObjSprite {
  const p = new Px(32, 27)
  p.rect(1, 11, 30, 15, ink)
  p.rect(2, 13, 28, 10, rim)
  for (let x = 3; x < 30; x += 3) p.vl(x, 14, 8, ink)
  p.rect(8, 0, 17, 22, ink)
  p.rect(10, 2, 13, 19, hex('#a4bacd'))
  p.rect(12, 8, 9, 14, hex('#172b43'))
  p.rect(13, 3, 7, 3, hex('#8aefc1'))
  p.rect(1, 17, 6, 5, hex('#c19b65'))
  p.rect(2, 15, 4, 2, ink)
  return { img: p.toCanvas(), ox: 0, oy: -11 }
}

export function gateVariant(chain: MapObject['chain']): number {
  return Math.max(0, CHAINS.findIndex((c) => c.id === chain))
}

// Cache one strip per row once. Animation flips each letter by scaling its original pixels.
let boardRows: HTMLCanvasElement[] | undefined
function departureRows() {
  if (!boardRows) boardRows = CHAINS.map((c) => {
    const p = new Px(96, 5)
    text(p, c.name, 0, 0, hex(c.color))
    return p.toCanvas()
  })
  return boardRows
}

export function drawTerminalAnim(ctx: CanvasRenderingContext2D, o: MapObject, x: number, y: number, t: number, lights: Light[]) {
  if (o.kind === 'departure_board') {
    const rows = departureRows()
    const cycle = t % 9
    for (let row = 0; row < 4; row++) {
      const yy = y + 16 + row * 7
      ctx.fillStyle = '#0b1526'
      ctx.fillRect(x + 13, yy, 96, 6)
      for (let col = 0; col < CHAINS[row].name.length; col++) {
        const phase = cycle - row * 0.18 - col * 0.025
        const h = phase >= 0 && phase < 0.5 ? Math.max(1, Math.round(5 * Math.abs(Math.cos(phase * Math.PI * 2)))) : 5
        ctx.drawImage(rows[row], col * 4, 0, 4, 5, x + 13 + col * 4, yy + Math.floor((5 - h) / 2), 4, h)
      }
    }
  } else if (o.kind === 'bridge_gate') {
    const chain = CHAINS[gateVariant(o.chain)]
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + o.x)
    ctx.fillStyle = chain.color
    ctx.globalAlpha = 0.08 + pulse * 0.09
    ctx.fillRect(x + 8, y + 3, 48, 26)
    ctx.globalAlpha = 0.5
    for (let i = 0; i < 7; i++) {
      const yy = (i * 5 + Math.floor(t * 10)) % 24
      ctx.fillRect(x + 12 + i * 6, y + 4 + yy, 1, 2)
    }
    ctx.globalAlpha = 0.3 + pulse * 0.25
    ctx.fillRect(x + 13, y + 27, 38, 2)
    ctx.globalAlpha = 1
    lights.push({ x: x + 32, y: y + 16, r: 30, rgb: chain.rgb, a: 0.16 + pulse * 0.12 })
  } else if (o.kind === 'bag_scanner') {
    ctx.fillStyle = Math.floor(t * 2) % 2 ? '#a5ffd1' : '#3e8f77'
    ctx.fillRect(x + 14, y - 8, 5, 2)
  } else if (o.kind === 'terminal') {
    lights.push({ x: x + 40, y: y + 45, r: 35, rgb: '90,175,255', a: 0.25 })
  }
}
