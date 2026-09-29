/**
 * Pixel-art battle backdrops. Each scene pre-renders its static layers once (sky bands, parallax silhouettes, the
 * perspective ground) into canvases; per frame it only blits them with camera parallax and paints a few animated
 * bits. Cabald battles get a propaganda overlay that can visibly break; boss fights get extra menace.
 */
import { Px, hex } from '../gfx/px'
import type { Theme } from '../types'
import { propaganda } from './bg/cabald'
import { gallery, tower } from './bg/indoor'
import { type Scene, bayer } from './bg/kit'
import { canyon, meadow, town } from './bg/outdoor'
import { city, exchange } from './bg/urban'

export type BattleBg = Theme | 'exchange' | 'tower'

export interface BackdropGeo {
  W: number
  H: number
  /** Rows 0..field are visible above the bottom command/text panel. */
  field: number
  /** Where the far ground plane meets the sky/background. */
  horizon: number
  foe: { x: number; feet: number }
  me: { x: number; feet: number }
}

export interface Backdrop {
  /** Everything behind the pads/sprites. camX shifts content right, scaled per layer by parallax. */
  draw(ctx: CanvasRenderingContext2D, t: number, camX: number): void
  /** Subtle overlay drawn after sprites. */
  front?(ctx: CanvasRenderingContext2D, t: number, camX: number): void
  /** Themed terrain pad, 2rx × (2ry+6); top ellipse centred at (rx, ry). Cached per size. */
  pad(rx: number, ry: number): HTMLCanvasElement
  /** Cabald battles: tear the banner, crack the seal, kill the lights. */
  breakPropaganda(): void
}

const SCENES: Record<BattleBg, (g: BackdropGeo, boss: boolean) => Scene> = {
  town,
  meadow,
  city,
  canyon,
  gallery,
  exchange,
  tower,
}

/** Boss dread: a stepped dark vignette closing in from the edges plus a blood-dark wash over the top of the sky. */
function menace(g: BackdropGeo): HTMLCanvasElement {
  const p = new Px(g.W, g.H)
  // Three flat alpha steps with dithered seams read as GBA-style darkness rather than a smooth gradient.
  const steps = [0, hex('#0c0412', 70), hex('#0c0412', 130), hex('#0c0412', 190)]
  const red = hex('#3a0618', 90)
  const cx = g.W / 2
  const cy = g.field / 2
  for (let y = 0; y < g.H; y++)
    for (let x = 0; x < g.W; x++) {
      const d = Math.hypot((x + 0.5 - cx) / (g.W * 0.6), (y + 0.5 - cy) / (g.field * 0.7))
      const v = Math.max(0, (d - 0.72) * 7)
      const i = Math.min(3, Math.floor(v) + (v - Math.floor(v) > 0.7 + bayer(x, y) * 0.3 ? 1 : 0))
      if (i > 0) p.set(x, y, steps[i])
      else if (y < g.horizon && (1 - y / (g.horizon * 0.6)) * 0.5 > bayer(x, y)) p.set(x, y, red)
    }
  return p.toCanvas()
}

export function makeBackdrop(bg: BattleBg, geo: BackdropGeo, opts: { cabald: boolean; boss: boolean }): Backdrop {
  const scene = SCENES[bg](geo, opts.boss)
  const prop = opts.cabald ? propaganda(geo) : null
  const dread = opts.boss ? menace(geo) : null
  return {
    draw(ctx, t, camX) {
      scene.draw(ctx, t, camX)
      prop?.draw(ctx, t, camX)
      if (dread) ctx.drawImage(dread, 0, 0)
    },
    front: scene.front,
    pad: scene.pad,
    breakPropaganda() {
      prop?.shatter()
    },
  }
}
