import { Px, canvas, ctx2d, hash, hex, text, textWidth } from '../../gfx/px'
/**
 * Cabald propaganda overlay: a festival banner strung across the upper-left sky with a grinning bald-head seal and
 * the party line "THERE IS NO CABALD ♥ I LOVE YOU.", chase-light bulbs on its ropes and a sweeping searchlight.
 * When the last Cabald foe falls it breaks: the banner rips after "THERE IS", the right half tumbles away, the left
 * half swings down on one rope with the seal cracked, the bulbs spark out and the searchlight dies.
 */
import type { BackdropGeo } from '../backdrops'
import { bayer, stampRows } from './kit'

const HEART = ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..']

const C = {
  cloth: hex('#fbeede'),
  fold: hex('#eed6c8'),
  trim: hex('#e8609a'),
  dots: hex('#ffb0cc'),
  ink: hex('#5a1040'),
  pink: hex('#e0407a'),
  heart: hex('#ff3a6a'),
  out: hex('#3a1030'),
  rope: hex('#4a2a3a'),
  gold: [hex('#6a4410'), hex('#c89020'), hex('#f0c850'), hex('#fff0a0')],
  sealBg: hex('#ff9ac0'),
  skin: [hex('#b87a68'), hex('#dca488'), hex('#f4d0b0'), hex('#fff4e8')],
  eye: hex('#1a0a1a'),
  crack: hex('#2a0a1a'),
}

/** The seal: gold stamp ring, pink field, a bald head with shiny dome, pinprick pupils and a too-wide smile. */
function seal(S: number, cracked: boolean): Px {
  const p = new Px(S, S)
  const c = (S - 1) / 2
  const R = S / 2
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - c, y - c)
      if (d > R) continue
      const a = Math.atan2(y - c, x - c)
      if (d > R - 1.2) p.set(x, y, Math.round((a / Math.PI) * 8 + 8) % 2 ? C.gold[1] : C.gold[2])
      else if (d > R - 2.4) p.set(x, y, x + y < S - 2 ? C.gold[3] : C.gold[1])
      else p.set(x, y, C.sealBg)
    }
  // Head: a dome, lit from the top-left with the unmistakable bald shine.
  const hx = c
  const hy = c + S * 0.08
  const rx = S * 0.3
  const ry = S * 0.3
  p.ellipse(hx + 0.5, hy + 0.5, rx, ry, (x, y, nx, ny) => {
    const l = -nx * 0.6 - ny * 0.8
    const v = 1.8 + l * 1.4
    return C.skin[Math.max(0, Math.min(3, Math.round(v + (bayer(x, y) - 0.5) * 0.6)))]
  })
  p.set(Math.round(hx - rx * 0.45), Math.round(hy - ry * 0.6), hex('#ffffff'))
  p.set(Math.round(hx - rx * 0.3), Math.round(hy - ry * 0.7), hex('#ffffff'))
  const ey = Math.round(hy - ry * 0.05)
  const el = Math.round(hx - rx * 0.4)
  const er = Math.round(hx + rx * 0.4)
  for (const ex of [el, er]) {
    p.set(ex, ey, C.eye)
    p.set(ex, ey + 1, C.eye)
    p.set(ex - 1, ey + 2, C.dots)
  }
  const my = Math.round(hy + ry * 0.45)
  for (let x = Math.round(hx - rx * 0.6); x <= Math.round(hx + rx * 0.6); x++) {
    const k = (x - hx) / (rx * 0.6)
    p.set(x, my - Math.round(k * k * 1.5) + 1, C.ink)
  }
  p.outline(C.out)
  if (cracked) {
    // Jagged fracture from the top-right of the ring through the grin; a chip knocked out of the dome.
    let x = Math.round(S * 0.78)
    for (let y = 1; y < S - 1; y++) {
      x += y % 3 === 0 ? -2 : y % 3 === 1 ? 1 : -1
      if (p.get(x, y)) p.put(x, y, C.crack)
      if (p.get(x + 1, y)) p.put(x + 1, y, C.gold[3])
    }
    for (let y = 0; y < 3; y++)
      for (let k = 0; k < 3 - y; k++) p.put(Math.round(hx + rx * 0.2) + k, Math.round(hy - ry) + y, C.crack)
    p.set(er, ey, C.skin[2])
    p.set(er, ey + 1, C.eye)
  }
  return p
}

/** Nearest-neighbour rotation of `src` about pivot (px, py); returns the canvas and where the pivot landed in it. */
function rotate(src: Px, ang: number, px: number, py: number): { img: HTMLCanvasElement; ox: number; oy: number } {
  const cs = Math.cos(ang)
  const sn = Math.sin(ang)
  const pts = [
    [0, 0],
    [src.w, 0],
    [0, src.h],
    [src.w, src.h],
  ].map(([x, y]) => [(x - px) * cs - (y - py) * sn, (x - px) * sn + (y - py) * cs])
  const x0 = Math.floor(Math.min(...pts.map((q) => q[0])))
  const y0 = Math.floor(Math.min(...pts.map((q) => q[1])))
  const x1 = Math.ceil(Math.max(...pts.map((q) => q[0])))
  const y1 = Math.ceil(Math.max(...pts.map((q) => q[1])))
  const out = new Px(x1 - x0, y1 - y0)
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const dx = x + x0 + 0.5
      const dy = y + y0 + 0.5
      const sx = Math.floor(dx * cs + dy * sn + px)
      const sy = Math.floor(-dx * sn + dy * cs + py)
      const c = src.get(sx, sy)
      if (c) out.put(x, y, c)
    }
  return { img: out.toCanvas(), ox: -x0, oy: -y0 }
}

export interface Propaganda {
  draw(ctx: CanvasRenderingContext2D, t: number, camX: number): void
  shatter(): void
}

export function propaganda(g: BackdropGeo): Propaganda {
  const { W } = g
  const hz = Math.round(g.horizon)
  // The torn half swings down around the left rope, so leave its height free to the left of the anchor.
  const room = Math.min(W - 12, g.foe.x - 44) - 34
  const big = room >= 190
  const sc = big ? 2 : 1
  const l1 = 'THERE IS NO CABALD'
  const l2 = 'I LOVE YOU.'
  const S = big ? 23 : 17
  const pad = 4
  const tw = textWidth(l1, sc) + 3 + 5 * sc
  const bw = pad + S + 4 + tw + pad
  const bh = Math.max(S, 5 * sc + 3 + 5) + 6
  const flag = 3

  // Banner cloth with scalloped pennant hem; the seal and text are stamped on.
  const bannerAt = (cracked: boolean) => {
    const p = new Px(bw, bh + flag)
    p.rect(0, 0, bw, bh, C.cloth)
    for (let x = 10; x < bw; x += 13) for (let y = 1; y < bh - 1; y++) if (bayer(x, y) < 0.5) p.set(x, y, C.fold)
    p.hl(0, 1, bw, C.trim)
    p.hl(0, bh - 2, bw, C.trim)
    for (let x = 2; x < bw - 2; x += 2) {
      p.set(x, 2, C.dots)
      p.set(x, bh - 3, C.dots)
    }
    for (let x = 0; x < bw; x++) {
      const k = x % 6
      const d = k < 3 ? k : 5 - k
      for (let y = 0; y < d; y++) p.set(x, bh + y, Math.floor(x / 6) % 2 ? C.trim : C.dots)
    }
    p.blit(seal(S, cracked), pad, ((bh - S) >> 1) + 0)
    const tx = pad + S + 4
    const ty = (bh - (5 * sc + 3 + 5)) >> 1
    text(p, l1, tx, ty, C.ink, sc)
    stampRows(p, HEART, tx + textWidth(l1, sc) + 3, ty + (sc - 1) * 2, C.heart, sc)
    const l2x = tx + ((tw - textWidth(l2) - 12) >> 1)
    stampRows(p, HEART, l2x, ty + 5 * sc + 3, C.heart, 1)
    text(p, l2, l2x + 7, ty + 5 * sc + 3, C.pink)
    p.outline(C.out)
    return p
  }
  const whole = bannerAt(false).toCanvas()
  const broken = bannerAt(true)
  const tear = pad + S + 4 + textWidth('THERE IS ', sc) - sc
  // Split along a ragged vertical tear.
  const left = new Px(tear + 2, broken.h)
  const right = new Px(bw - tear + 2, broken.h)
  for (let y = 0; y < broken.h; y++) {
    const cut = tear + Math.round(hash(y >> 1, 0, 151) * 3) - 1
    for (let x = 0; x < bw; x++) {
      const c = broken.d[y * bw + x]
      if (!c) continue
      if (x < cut) left.put(x, y, c)
      else right.put(x - tear + 2, y, c)
    }
  }
  const swing = Array.from({ length: 19 }, (_, i) => rotate(left, (i * 5 * Math.PI) / 180, 1, 1))
  const tumble = Array.from({ length: 7 }, (_, i) => rotate(right, (-i * 6 * Math.PI) / 180, right.w - 1, 1))

  const bx = bh + 3
  const by = Math.max(5, Math.round(hz * 0.1) + 3)
  // Rope anchor points above the top edge, bulbs strung along each rope.
  const ropes: [number, number, number, number][] = [
    [bx + 1, by, bx - 10, -2],
    [bx + bw - 2, by, bx + bw + 10, -2],
  ]
  const bulbs: [number, number, number][] = []
  for (let r = 0; r < ropes.length; r++) {
    const [x0, y0, x1, y1] = ropes[r]
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 4))
    for (let i = 1; i < n; i++)
      bulbs.push([Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n) + 1, r])
  }
  for (let x = bx + 6; x < bx + bw - 4; x += 9) bulbs.push([x, by - 1, 2])
  const bulbCols = ['#ffe07a', '#ff7ab0', '#8affd0']

  // Searchlight: dithered pink-white cone frames from the horizon, pre-rendered at 13 angles.
  const beamW = Math.max(10, Math.round(hz * 0.18))
  const sx0 = Math.round(W * 0.42)
  const beams = Array.from({ length: 13 }, (_, i) => {
    const a = -0.55 + (i / 12) * 1.1
    const c = canvas(W, hz)
    const p = new Px(W, hz)
    for (let y = 0; y < hz; y++) {
      const d = hz - y
      const cx = sx0 + Math.tan(a) * d
      const half = 1 + (d / hz) * beamW
      for (let x = Math.floor(cx - half); x <= cx + half; x++) {
        const k = 1 - Math.abs(x - cx) / half
        if (k * 0.7 > bayer(x, y)) p.set(x, y, hex('#fff0f4', 90 + Math.round(k * 70)))
      }
    }
    ctx2d(c).drawImage(p.toCanvas(), 0, 0)
    return c
  })

  let broke = false
  let t0 = -1
  const ropeCol = '#4a2a3a'
  const line = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
    for (let i = 0; i <= n; i++)
      ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1)
  }

  return {
    shatter() {
      broke = true
    },
    draw(ctx, t, camX) {
      if (broke && t0 < 0) t0 = t
      const dt = broke ? Math.max(0, t - t0) : -1
      const ox = Math.round(camX * 0.1)
      // Searchlight sweeps; after the break it stutters for a moment and dies.
      const beamOn = !broke || (dt < 0.9 && hash(Math.floor(dt * 14), 0, 152) < 0.5)
      if (beamOn) ctx.drawImage(beams[Math.round((Math.sin(t * 0.6) * 0.5 + 0.5) * 12)], ox, 0)
      ctx.fillStyle = ropeCol
      const [l, r] = ropes
      if (!broke) {
        line(ctx, l[0] + ox, l[1], l[2] + ox, l[3])
        line(ctx, r[0] + ox, r[1], r[2] + ox, r[3])
        ctx.drawImage(whole, bx + ox, by)
      } else {
        line(ctx, l[0] + ox, l[1], l[2] + ox, l[3])
        // Snapped right rope dangles from its anchor.
        line(ctx, r[2] + ox, r[3], r[2] + ox - 2, r[3] + 9)
        // Left half swings down on its rope with a damped overshoot; the angle settles near 70°.
        const ang = 70 * (1 - Math.exp(-3.2 * dt) * Math.cos(7 * dt))
        const f = swing[Math.max(0, Math.min(18, Math.round(ang / 5)))]
        ctx.drawImage(f.img, bx + ox + 1 - f.ox, by + 1 - f.oy)
        // Right half tumbles out of frame.
        if (dt < 2) {
          const fall = 60 * dt * dt
          const k = tumble[Math.min(6, Math.floor(dt * 6))]
          ctx.drawImage(
            k.img,
            bx + ox + tear - 2 + right.w - 1 - k.ox + Math.round(dt * 10),
            by + 1 - k.oy + Math.round(fall),
          )
        }
        // Sparks from the snapped rope ends.
        if (dt < 1.2)
          for (let i = 0; i < 8; i++) {
            const st = dt - i * 0.05
            if (st < 0) continue
            ctx.fillStyle = i % 2 ? '#fff0a0' : '#ff9a3a'
            ctx.fillRect(
              Math.round(bx + ox + tear + (hash(i, 1, 153) - 0.5) * 30 * st),
              Math.round(by + 40 * st * st + hash(i, 2, 153) * 6),
              1,
              1,
            )
          }
      }
      // Chase lights; after the break they flicker a few times and go dark.
      for (let i = 0; i < bulbs.length; i++) {
        const [x, y, rope] = bulbs[i]
        if (broke && rope !== 0) continue
        const on = broke ? dt < 0.7 && hash(i, Math.floor(dt * 20), 154) < 0.4 : (Math.floor(t * 4) + i) % 3 !== 0
        ctx.fillStyle = on ? bulbCols[i % 3] : '#3a2a34'
        ctx.fillRect(x + ox, y, 1, 1)
      }
    },
  }
}
