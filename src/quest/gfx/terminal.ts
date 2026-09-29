/** Cached terminal architecture and split-flap signage; words and palettes, never chain logos. */
import type { MapObject } from '../types'
import { IRON, METAL, SHC, STONE, WHITEWALL, finish, litGlass, neon, pane } from './facade'
import type { Door, Light, ObjSprite } from './objects'
import { OUT } from './palette'
import { Px, hex, mix, shade, text, textWidth, withAlpha } from './px'

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
const BEZEL = [hex('#0c1626'), hex('#22344c'), hex('#3c5470'), hex('#7893ae'), hex('#b8cce0')]

function label(p: Px, s: string, y: number, color = white) {
  text(p, s, Math.floor((p.w - textWidth(s)) / 2), y, color)
}

/** Brushed-metal bezel: lit top-left edges, shaded bottom-right. */
function bezel(p: Px, x: number, y: number, w: number, h: number): void {
  p.rect(x, y, w, h, BEZEL[2])
  p.hl(x, y, w, BEZEL[4])
  p.vl(x, y, h, BEZEL[3])
  p.hl(x, y + h - 1, w, BEZEL[1])
  p.vl(x + w - 1, y, h, BEZEL[1])
}

export function terminal(): ObjSprite {
  const b = new Px(96, 84)
  // wave roof: a shallow metal arc with seams, overhanging the facade
  for (let x = 0; x < 96; x++) {
    const top = 6 + Math.round(5 * Math.abs(x - 47.5) / 47.5)
    for (let y = top; y < 19; y++) {
      let c = y === top ? METAL[4] : (x % 6 === 0 ? METAL[1] : y < top + 3 ? METAL[3] : METAL[2])
      if (x < 3) c = shade(c, 0.2)
      b.set(x, y, c)
    }
  }
  // radar mast + HVAC on the roof
  b.vl(78, 0, 8, IRON[3])
  b.rect(74, 1, 9, 2, METAL[3])
  b.set(78, 0, hex('#ff5a5a'))
  b.rect(12, 3, 12, 5, METAL[3])
  b.hl(12, 3, 12, METAL[4])
  b.ellipse(17.5, 5.5, 2, 1.5, IRON[2])
  // fascia with the four chain stripes
  b.rect(0, 17, 96, 3, METAL[1])
  b.hl(0, 17, 96, METAL[3])
  for (let i = 0; i < 4; i++) b.rect(2 + i * 23, 20, 23, 2, hex(CHAINS[i].color))
  b.hl(2, 22, 92, withAlpha(SHC, 110))
  // walls + backlit name sign
  b.rect(3, 22, 90, 62, WHITEWALL[2])
  b.vl(3, 22, 62, WHITEWALL[4])
  b.vl(92, 22, 62, WHITEWALL[0])
  b.hl(3, 23, 90, withAlpha(SHC, 60))
  b.rect(9, 24, 78, 11, ink)
  b.hl(9, 24, 78, BEZEL[2])
  label(b, 'BRIDGE TERMINAL', 27)
  // curtain-wall glazing with mullions, a transom and passengers' silhouettes inside
  const gx = 6
  const gy = 38
  const gw = 84
  const gh = 40
  b.rect(gx - 1, gy - 1, gw + 2, gh + 2, OUT)
  pane(b, gx, gy, gw, gh)
  for (let x = gx + 12; x < gx + gw; x += 12) b.vl(x, gy, gh, METAL[3])
  b.hl(gx, gy + 12, gw, METAL[3])
  b.hl(gx, gy + 13, gw, METAL[1])
  for (const px of [12, 20, 64, 78]) {
    const c = mix(ink, BEZEL[2], 0.3)
    b.rect(gx + px, gy + gh - 7, 3, 7, c)
    b.rect(gx + px, gy + gh - 10, 3, 3, c)
  }
  // entrance canopy and sliding doors (door tile 2,3 → x32..47)
  b.rect(28, 52, 24, 3, WHITEWALL[4])
  b.hl(28, 54, 24, blue)
  b.hl(28, 55, 24, OUT)
  b.hl(29, 56, 22, withAlpha(SHC, 90))
  const door: Door = { x: 33, y: 58, w: 14, h: 22, style: 'glass' }
  b.rect(door.x - 2, door.y - 2, door.w + 4, door.h + 2, OUT)
  b.rect(door.x - 1, door.y - 1, door.w + 2, door.h + 1, METAL[3])
  pane(b, door.x, door.y, 7, door.h)
  pane(b, door.x + 7, door.y, 7, door.h)
  b.vl(door.x + 6, door.y, door.h, OUT)
  b.hl(door.x + 3, door.y + 11, 2, METAL[4])
  b.hl(door.x + 9, door.y + 11, 2, METAL[4])
  // arrivals screen
  b.rect(54, 57, 31, 17, OUT)
  bezel(b, 55, 58, 29, 15)
  b.rect(56, 59, 27, 13, ink)
  text(b, 'ARRIVE', 59, 60, white)
  text(b, 'EXPLORE', 56, 66, hex('#b8e96b'))
  b.rect(3, 80, 90, 4, STONE[2])
  b.hl(3, 80, 90, STONE[4])
  b.hl(3, 83, 90, STONE[1])
  b.rect(30, 80, 20, 4, STONE[3])
  b.hl(30, 80, 20, STONE[4])
  b.outline(OUT)
  const glow = [litGlass(b, gx, gy, gw, gh, true, '150,200,255'), litGlass(b, door.x, door.y, door.w, door.h, false, '255,210,150')]
  const signs = [neon(b, 10, 26, 76, 7, [white], hex('#ffffff'), blue, '100,160,255')]
  const p = finish(b, 5, [3, 92])
  return { img: p.toCanvas(), ox: 0, oy: -20, door, glow, neon: signs }
}

export function departureBoard(): ObjSprite {
  const b = new Px(128, 48)
  // hanging cables
  b.vl(12, 0, 2, IRON[2])
  b.vl(115, 0, 2, IRON[2])
  bezel(b, 1, 1, 126, 45)
  b.rect(3, 3, 122, 41, ink)
  b.rect(5, 4, 118, 9, hex('#2c4763'))
  b.hl(5, 4, 118, hex('#3c5a7a'))
  label(b, 'DEPARTURES', 6)
  // clock face in the header
  b.ellipse(117.5, 8.5, 3.2, 3.2, white)
  b.vl(117, 6, 3, ink)
  b.hl(117, 8, 3, ink)
  for (let i = 0; i < 4; i++) {
    const y = 16 + i * 7
    b.rect(5, y, 118, 6, hex('#0b1526'))
    b.hl(5, y + 5, 118, hex('#060c18'))
    b.rect(7, y + 1, 2, 3, hex(CHAINS[i].color))
    text(b, CHAINS[i].name, 13, y, hex(CHAINS[i].color))
    text(b, `G${i + 1}`, 111, y, white)
  }
  b.rect(12, 46, 5, 2, rim)
  b.rect(111, 46, 5, 2, rim)
  b.outline(OUT)
  return { img: finish(b, 3).toCanvas(), ox: 0, oy: 0 }
}

export function bridgeGate(variant: number): ObjSprite {
  const c = hex(CHAINS[variant].color)
  const b = new Px(64, 44)
  // portal frame: bezel columns, header sign, energy field (animated over)
  b.rect(1, 0, 62, 43, ink)
  b.rect(5, 14, 54, 28, hex('#1b3048'))
  for (let y = 14; y < 42; y++) b.hl(5, y, 54, mix(hex('#1b3048'), c, ((y - 14) / 28) * 0.35))
  bezel(b, 0, 0, 64, 12)
  b.rect(2, 2, 60, 8, ink)
  label(b, CHAINS[variant].name, 3, c)
  for (const x of [1, 59]) {
    bezel(b, x, 12, 4, 30)
    b.vl(x + 1, 15, 24, c)
    b.vl(x + 2, 15, 24, shade(c, -0.4))
  }
  b.hl(5, 41, 54, c)
  b.hl(5, 42, 54, shade(c, -0.4))
  b.rect(8, 43, 48, 1, rim)
  text(b, `G${variant + 1}`, 7, 16, white)
  b.outline(OUT)
  return { img: finish(b, 3).toCanvas(), ox: 0, oy: -12 }
}

export function bagScanner(): ObjSprite {
  const b = new Px(32, 27)
  // conveyor: rollers + belt
  b.rect(1, 11, 30, 15, ink)
  bezel(b, 1, 20, 30, 5)
  b.rect(2, 13, 28, 7, rim)
  for (let x = 3; x < 30; x += 3) b.vl(x, 14, 5, ink)
  // x-ray tunnel with lead curtain strips
  bezel(b, 8, 0, 17, 22)
  b.rect(10, 2, 13, 5, BEZEL[1])
  b.rect(13, 3, 7, 3, hex('#8aefc1'))
  b.rect(11, 8, 11, 13, hex('#172b43'))
  for (let x = 12; x < 22; x += 2) b.vl(x, 8, 9, hex('#2a4460'))
  // a suitcase waiting its turn
  b.rect(1, 16, 6, 5, hex('#c19b65'))
  b.hl(1, 16, 6, hex('#e0c08a'))
  b.rect(2, 14, 4, 2, ink)
  b.outline(OUT)
  return { img: finish(b, 2).toCanvas(), ox: 0, oy: -11 }
}

export function gateVariant(chain: MapObject['chain']): number {
  return Math.max(0, CHAINS.findIndex((c) => c.id === chain))
}

// Cache one strip per row once. Animation flips each letter by scaling its original pixels.
let boardRows: HTMLCanvasElement[] | undefined
function departureRows() {
  if (!boardRows)
    boardRows = CHAINS.map((c) => {
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
      ctx.fillRect(x + 13, yy, 96, 5)
      for (let col = 0; col < CHAINS[row].name.length; col++) {
        const phase = cycle - row * 0.18 - col * 0.025
        const h = phase >= 0 && phase < 0.5 ? Math.max(1, Math.round(5 * Math.abs(Math.cos(phase * Math.PI * 2)))) : 5
        ctx.drawImage(rows[row], col * 4, 0, 4, 5, x + 13 + col * 4, yy + Math.floor((5 - h) / 2), 4, h)
      }
      // boarding indicator blinks on the row whose gate is calling
      if (Math.floor(t / 2.25) % 4 === row && Math.floor(t * 3) % 2) {
        ctx.fillStyle = CHAINS[row].color
        ctx.fillRect(x + 104, yy + 1, 3, 3)
      }
    }
    lights.push({ x: x + 64, y: y + 30, r: 28, rgb: '120,170,255', a: 0.45 })
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
    lights.push({ x: x + 32, y: y + 24, r: 22, rgb: chain.rgb, a: 0.5 + pulse * 0.2 })
  } else if (o.kind === 'bag_scanner') {
    ctx.fillStyle = Math.floor(t * 2) % 2 ? '#a5ffd1' : '#3e8f77'
    ctx.fillRect(x + 14, y - 8, 5, 2)
    // belt slats creep toward the tunnel
    const off = Math.floor(t * 6) % 3
    ctx.fillStyle = '#7893ae'
    ctx.fillRect(x + 2, y + 3, 7, 5)
    ctx.fillRect(x + 24, y + 3, 6, 5)
    ctx.fillStyle = '#142338'
    for (let bx = 3 + off; bx < 30; bx += 3) if (bx < 9 || bx > 23) ctx.fillRect(x + bx, y + 3, 1, 5)
    lights.push({ x: x + 16, y: y - 4, r: 8, rgb: '120,255,200', a: 0.45 })
  } else if (o.kind === 'terminal') {
    // cursor underline hops between the two words of the arrivals screen
    const k = Math.floor(t * 0.5) % 2
    if (Math.floor(t * 4) % 2) {
      ctx.fillStyle = k ? '#b8e96b' : '#eef6ff'
      ctx.fillRect(x + (k ? 56 : 59), y - 20 + (k ? 71 : 65), k ? 27 : 23, 1)
    }
    lights.push({ x: x + 69, y: y - 20 + 66, r: 10, rgb: '120,200,255', a: 0.45 })
  }
}
