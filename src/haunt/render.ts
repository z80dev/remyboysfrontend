/**
 * Software raycaster into a packed ABGR framebuffer: textured walls (DDA), per-pixel floor/ceiling casting, a 360°
 * night-sky panorama over outdoor tiles, bilinear tile lighting plus the player's lantern, purple distance fog, and
 * z-buffered billboards. Eye height is 0.5 (walls are 1 tall), so ceiling rows mirror floor rows.
 */
import { EMISSIVE, type Materials, type Tex, rng } from './gfx'
import { type Level, MH, MW } from './level'

const FOG_R = 16
const FOG_G = 8
const FOG_B = 26
const FOG_NEAR = 1.2
const FOG_FAR = 11

export interface SpriteOpts {
  /** Hit flash: every opaque texel renders white. */
  flash?: boolean
  /** 0..1 blend over the scene (ghosts). */
  alpha?: number
  /** Texel row standing on z (defaults to the bottom row). */
  feet?: number
  /** Extra brightness multiplier. */
  bright?: number
}

export class Renderer {
  W = 0
  H = 0
  VH = 0
  hz = 0
  f = 0
  buf = new Uint32Array(0)
  img: ImageData | null = null
  zbuf = new Float32Array(0)
  rowDist = new Float32Array(0)
  rowFog = new Float32Array(0)
  rowLant = new Float32Array(0)
  camX = new Float32Array(0)
  skyU = new Int32Array(0)
  sky = new Uint32Array(0)
  skyW = 0
  /** Tile light map (RGB per tile), owned by the game, sampled bilinearly. */
  light = new Float32Array(MW * MH * 3)
  px = 0
  py = 0
  cos = 1
  sin = 0
  /** Lantern intensity (muzzle flashes push it up). */
  lantern = 0.8
  lightning = 0
  private lr = 0
  private lg = 0
  private lb = 0

  constructor(readonly ctx: CanvasRenderingContext2D) {}

  resize(W: number, H: number, VH: number) {
    this.W = W
    this.H = H
    this.VH = VH
    this.hz = VH >> 1
    this.f = Math.min(VH * 0.82, W / (2 * Math.tan(0.6)))
    this.img = this.ctx.createImageData(W, H)
    this.buf = new Uint32Array(this.img.data.buffer)
    this.zbuf = new Float32Array(W)
    this.camX = new Float32Array(W)
    for (let x = 0; x < W; x++) this.camX[x] = (x + 0.5 - W / 2) / this.f
    this.rowDist = new Float32Array(VH)
    this.rowFog = new Float32Array(VH)
    for (let y = this.hz; y < VH; y++) {
      const d = (0.5 * this.f) / (y - this.hz + 0.5)
      this.rowDist[y] = d
      this.rowFog[y] = fogK(d)
    }
    this.rowLant = new Float32Array(VH)
    this.skyU = new Int32Array(W)
    this.buildSky()
  }

  /** Night panorama sized so one sky texel spans one screen column at the view centre. */
  private buildSky() {
    const h = this.hz
    const w = Math.ceil(2 * Math.PI * this.f)
    this.skyW = w
    const sky = new Uint32Array(w * Math.max(1, h))
    const r = rng(7)
    for (let y = 0; y < h; y++) {
      const t = y / Math.max(1, h - 1)
      const R = 6 + t * t * 70
      const G = 4 + t * t * 22
      const B = 14 + t * 46
      for (let x = 0; x < w; x++) sky[y * w + x] = pack(R, G, B)
    }
    for (let i = 0; i < (w * h) / 90; i++) {
      const x = Math.floor(r() * w)
      const y = Math.floor(r() * r() * h * 0.8)
      const k = 120 + r() * 135
      sky[y * w + x] = pack(k, k, k * 0.9 + 25)
    }
    // A harvest moon low in the south (start view), with craters and a halo.
    const mx = Math.round((w * (Math.PI / 2 + 0.25)) / (2 * Math.PI))
    const my = Math.round(h * 0.36)
    const mr = Math.max(5, Math.round(h * 0.13))
    for (let y = Math.max(0, my - mr * 3); y < Math.min(h, my + mr * 3); y++)
      for (let x = mx - mr * 3; x < mx + mr * 3; x++) {
        const d = Math.hypot(x - mx, y - my)
        const i = y * w + ((x + w) % w)
        const c = sky[i]
        if (d < mr) {
          const crater = Math.sin(x * 0.9) * Math.sin(y * 1.1) > 0.55 ? 0.86 : 1
          const edge = 1 - (d / mr) ** 4 * 0.25
          sky[i] = pack(255 * crater * edge, 196 * crater * edge, 120 * crater * edge)
        } else {
          const glow = Math.max(0, 1 - (d - mr) / (mr * 2)) ** 2 * 0.55
          sky[i] = pack((c & 255) + glow * 180, ((c >> 8) & 255) + glow * 100, ((c >> 16) & 255) + glow * 60)
        }
      }
    // Hills and dead trees along the horizon.
    let hill = 0.25
    for (let x = 0; x < w; x++) {
      hill += (r() - 0.5) * 0.05
      hill = Math.min(0.42, Math.max(0.08, hill + (0.22 - hill) * 0.01))
      const top = Math.floor(h * (1 - hill))
      for (let y = top; y < h; y++) sky[y * w + x] = pack(10, 6, 16)
    }
    for (let k = 0; k < Math.floor(w / 60); k++) {
      const tx = Math.floor(r() * w)
      const base = h - Math.floor(h * 0.18)
      const th = Math.floor(h * (0.25 + r() * 0.2))
      for (let y = base - th; y < h; y++) {
        sky[y * w + tx] = pack(8, 4, 12)
        sky[y * w + ((tx + 1) % w)] = pack(8, 4, 12)
      }
      for (let b = 0; b < 5; b++) {
        let bx = tx
        let by = base - Math.floor(th * (0.3 + r() * 0.6))
        const dir = r() < 0.5 ? -1 : 1
        for (let s = 0; s < 4 + r() * 8; s++) {
          bx += dir
          if (r() < 0.6) by -= 1
          if (by >= 0 && by < h) sky[by * w + ((bx + w) % w)] = pack(8, 4, 12)
        }
      }
    }
    this.sky = sky
  }

  /** Bilinear tile light at a world point → lr/lg/lb. */
  private sample(x: number, y: number) {
    const fx = Math.min(MW - 1.001, Math.max(0, x - 0.5))
    const fy = Math.min(MH - 1.001, Math.max(0, y - 0.5))
    const ix = fx | 0
    const iy = fy | 0
    const ax = fx - ix
    const ay = fy - iy
    const L = this.light
    const i00 = (iy * MW + ix) * 3
    const i10 = i00 + 3
    const i01 = i00 + MW * 3
    const i11 = i01 + 3
    const w00 = (1 - ax) * (1 - ay)
    const w10 = ax * (1 - ay)
    const w01 = (1 - ax) * ay
    const w11 = ax * ay
    this.lr = L[i00] * w00 + L[i10] * w10 + L[i01] * w01 + L[i11] * w11
    this.lg = L[i00 + 1] * w00 + L[i10 + 1] * w10 + L[i01 + 1] * w01 + L[i11 + 1] * w11
    this.lb = L[i00 + 2] * w00 + L[i10 + 2] * w10 + L[i01 + 2] * w01 + L[i11 + 2] * w11
  }

  /** Lit, fogged texel → packed pixel. */
  private shade(c: number, lr: number, lg: number, lb: number, fk: number): number {
    const inv = 1 - fk
    if (c >>> 24 === EMISSIVE) {
      const k = 1 - fk * 0.6
      return pack((c & 255) * k + FOG_R * fk, ((c >> 8) & 255) * k + FOG_G * fk, ((c >> 16) & 255) * k + FOG_B * fk)
    }
    return pack(
      (c & 255) * lr * inv + FOG_R * fk,
      ((c >> 8) & 255) * lg * inv + FOG_G * fk,
      ((c >> 16) & 255) * lb * inv + FOG_B * fk,
    )
  }

  /** Walls, floors, ceilings and sky for the camera. */
  world(level: Level, mats: Materials, x0: number, y0: number, angle: number) {
    const { W, VH, hz, buf, f } = this
    this.px = x0
    this.py = y0
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    this.cos = cos
    this.sin = sin
    const lant = this.lantern
    for (let y = hz; y < VH; y++) {
      const d = this.rowDist[y]
      this.rowLant[y] = lant / (1 + d * d * 0.22)
    }
    const skyW = this.skyW
    const sky = this.sky
    const flash = this.lightning
    const haunted = flash > 0.35
    for (let x = 0; x < W; x++) {
      const cx = this.camX[x]
      const rdx = cos - sin * cx
      const rdy = sin + cos * cx
      let su = Math.floor(((angle + Math.atan(cx)) / (2 * Math.PI)) * skyW) % skyW
      if (su < 0) su += skyW
      this.skyU[x] = su
      // DDA
      let mx = x0 | 0
      let my = y0 | 0
      const ddx = Math.abs(1 / rdx)
      const ddy = Math.abs(1 / rdy)
      const sx = rdx < 0 ? -1 : 1
      const sy = rdy < 0 ? -1 : 1
      let sdx = rdx < 0 ? (x0 - mx) * ddx : (mx + 1 - x0) * ddx
      let sdy = rdy < 0 ? (y0 - my) * ddy : (my + 1 - y0) * ddy
      let side = 0
      let w = 0
      for (let guard = 0; guard < 64; guard++) {
        if (sdx < sdy) {
          sdx += ddx
          mx += sx
          side = 0
        } else {
          sdy += ddy
          my += sy
          side = 1
        }
        if (mx < 0 || my < 0 || mx >= MW || my >= MH) break
        w = level.wall[my * MW + mx]
        if (w) break
      }
      const perp = Math.max(0.0001, side === 0 ? sdx - ddx : sdy - ddy)
      this.zbuf[x] = perp
      const lineH = f / perp
      const top = hz - lineH / 2
      const yTop = Math.max(0, Math.ceil(top - 0.5))
      const yBot = Math.min(VH, Math.ceil(hz + lineH / 2 - 0.5))
      if (w) {
        const hx = x0 + rdx * perp
        const hy = y0 + rdy * perp
        let wx = side === 0 ? hy : hx
        wx -= Math.floor(wx)
        let u = (wx * 64) | 0
        if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) u = 63 - u
        const variants = w === 3 && haunted ? mats.haunted : mats.walls[w]
        const tex = variants[(((mx * 73856093) ^ (my * 19349663)) >>> 0) % variants.length]
        const back = 0.05 / Math.hypot(rdx, rdy)
        this.sample(hx - rdx * back, hy - rdy * back)
        const shadeSide = side ? 0.78 : 1
        const ln = lant / (1 + perp * perp * 0.22)
        const lr = (this.lr + ln) * shadeSide
        const lg = (this.lg + ln * 0.8) * shadeSide
        const lb = (this.lb + ln * 0.58) * shadeSide
        const fk = fogK(perp)
        const step = 64 / lineH
        let v = (yTop + 0.5 - top) * step
        const td = tex.d
        for (let y = yTop; y < yBot; y++) {
          buf[y * W + x] = this.shade(td[((v | 0) & 63) * 64 + u], lr, lg, lb, fk)
          v += step
        }
      }
      // Floor and mirrored ceiling below/above the wall.
      for (let y = Math.max(hz, yBot); y < VH; y++) {
        const d = this.rowDist[y]
        const wx = x0 + rdx * d
        const wy = y0 + rdy * d
        const tx = wx | 0
        const ty = wy | 0
        const yc = 2 * hz - 1 - y
        if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) {
          buf[y * W + x] = 0xff000000
          if (yc >= 0) buf[yc * W + x] = 0xff000000
          continue
        }
        const ti = ty * MW + tx
        const u = ((wx - tx) * 64) | 0
        const v = ((wy - ty) * 64) | 0
        this.sample(wx, wy)
        const ln = this.rowLant[y]
        const lr = this.lr + ln
        const lg = this.lg + ln * 0.8
        const lb = this.lb + ln * 0.58
        const fk = this.rowFog[y]
        const fl = level.floor[ti]
        buf[y * W + x] = this.shade(mats.floors[fl].d[v * 64 + u], lr, lg, lb, fk)
        if (yc < 0) continue
        if (level.outdoor[ti]) {
          const c = sky[yc * skyW + su]
          buf[yc * W + x] = flash
            ? pack((c & 255) + flash * 90, ((c >> 8) & 255) + flash * 90, ((c >> 16) & 255) + flash * 130)
            : c
        } else buf[yc * W + x] = this.shade(mats.ceilings[fl].d[v * 64 + u], lr * 0.8, lg * 0.8, lb * 0.8, fk)
      }
    }
  }

  /** Z-buffered billboard standing at (wx, wy) with its feet at height z; `height` = world height of the whole Tex. */
  sprite(t: Tex, wx: number, wy: number, z: number, height: number, o: SpriteOpts = {}) {
    const dx = wx - this.px
    const dy = wy - this.py
    const depth = dx * this.cos + dy * this.sin
    if (depth < 0.12) return
    const side = -dx * this.sin + dy * this.cos
    const { W, VH, hz, f, buf } = this
    const scale = f / depth
    const k = (height * scale) / t.h
    const sx = W / 2 + (side / depth) * f
    const feet = o.feet ?? t.h
    const bottom = hz + (0.5 - z) * scale
    const top = bottom - feet * k
    const left = sx - (t.w * k) / 2
    const x0 = Math.max(0, Math.ceil(left - 0.5))
    const x1 = Math.min(W, Math.ceil(left + t.w * k - 0.5))
    const y0 = Math.max(0, Math.ceil(top - 0.5))
    // Nothing shows below the floor plane: monsters rising from graves are cut at the ground line.
    const y1 = Math.min(VH, Math.ceil(top + t.h * k - 0.5), Math.ceil(hz + 0.5 * scale - 0.5))
    if (x0 >= x1 || y0 >= y1) return
    this.sample(wx, wy)
    const ln = this.lantern / (1 + depth * depth * 0.22)
    const b = o.bright ?? 1
    const lr = (this.lr + ln) * b
    const lg = (this.lg + ln * 0.8) * b
    const lb = (this.lb + ln * 0.58) * b
    const fk = fogK(depth)
    const alpha = o.alpha ?? 1
    const td = t.d
    const inv = 1 / k
    for (let x = x0; x < x1; x++) {
      if (depth >= this.zbuf[x]) continue
      const u = Math.min(t.w - 1, ((x + 0.5 - left) * inv) | 0)
      for (let y = y0; y < y1; y++) {
        const v = Math.min(t.h - 1, ((y + 0.5 - top) * inv) | 0)
        const c = td[v * t.w + u]
        if (!(c >>> 24)) continue
        const i = y * W + x
        let p = o.flash ? 0xffffffff : this.shade(c, lr, lg, lb, fk)
        if (alpha < 1) {
          const q = buf[i]
          const a = alpha
          p = pack(
            (p & 255) * a + (q & 255) * (1 - a),
            ((p >> 8) & 255) * a + ((q >> 8) & 255) * (1 - a),
            ((p >> 16) & 255) * a + ((q >> 16) & 255) * (1 - a),
          )
        }
        buf[i] = p
      }
    }
  }

  /** A solid square particle of world size `s` (gore, sparks, embers). */
  particle(wx: number, wy: number, z: number, s: number, color: number, glow: boolean) {
    const dx = wx - this.px
    const dy = wy - this.py
    const depth = dx * this.cos + dy * this.sin
    if (depth < 0.15) return
    const side = -dx * this.sin + dy * this.cos
    const scale = this.f / depth
    // Capped so sparks right in front of the camera stay specks, not screen-filling blocks.
    const size = Math.min(4, Math.max(1, s * scale))
    const cx = this.W / 2 + (side / depth) * this.f
    const cy = this.hz + (0.5 - z) * scale
    const x0 = Math.max(0, Math.round(cx - size / 2))
    const x1 = Math.min(this.W, Math.max(x0 + 1, Math.round(cx + size / 2)))
    const y0 = Math.max(0, Math.round(cy - size / 2))
    const y1 = Math.min(this.VH, Math.max(y0 + 1, Math.round(cy + size / 2)))
    this.sample(wx, wy)
    const ln = this.lantern / (1 + depth * depth * 0.22)
    const texel = glow ? ((color & 0xffffff) | (EMISSIVE << 24)) >>> 0 : color
    const p = this.shade(texel, this.lr + ln, this.lg + ln * 0.8, this.lb + ln * 0.58, fogK(depth))
    for (let x = x0; x < x1; x++) {
      if (depth >= this.zbuf[x]) continue
      for (let y = y0; y < y1; y++) this.buf[y * this.W + x] = p
    }
  }

  /** Screen-space blit (first-person weapon), lit by the given multipliers; emissive texels stay full-bright. */
  overlay(t: Tex, sx: number, sy: number, scale: number, lr: number, lg: number, lb: number) {
    const { W, VH, buf } = this
    const w = Math.round(t.w * scale)
    const h = Math.round(t.h * scale)
    const x0 = Math.max(0, Math.round(sx))
    const y0 = Math.max(0, Math.round(sy))
    const x1 = Math.min(W, Math.round(sx) + w)
    const y1 = Math.min(VH, Math.round(sy) + h)
    const inv = 1 / scale
    for (let y = y0; y < y1; y++) {
      const v = Math.min(t.h - 1, ((y - Math.round(sy)) * inv) | 0)
      for (let x = x0; x < x1; x++) {
        const c = t.d[v * t.w + Math.min(t.w - 1, ((x - Math.round(sx)) * inv) | 0)]
        if (c >>> 24) buf[y * W + x] = this.shade(c, lr, lg, lb, 0)
      }
    }
  }

  present() {
    if (this.img) this.ctx.putImageData(this.img, 0, 0)
  }
}

function fogK(d: number): number {
  const k = Math.min(1, Math.max(0, (d - FOG_NEAR) / (FOG_FAR - FOG_NEAR)))
  return k * k * (3 - 2 * k)
}

export function pack(r: number, g: number, b: number): number {
  return (
    (0xff000000 | (Math.min(255, Math.max(0, b)) << 16) | (Math.min(255, Math.max(0, g)) << 8) | Math.min(255, Math.max(0, r))) >>>
    0
  )
}
