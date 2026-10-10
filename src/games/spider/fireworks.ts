import { FLAG_COLORS, noise, sweep } from '../kit'

/** Analytic, preallocated celebration: no frame allocations, no independent timers.
 * Every fourth shell has 48 targets around four wavy pane outlines, held for 400 ms.
 */
export class Fireworks {
  private x = new Float32Array(48)
  private y = new Float32Array(48)
  private lastBurst = -1
  draw(ctx: CanvasRenderingContext2D, elapsed: number, w: number, h: number) {
    const shell = Math.floor(elapsed / 440)
    for (let n = Math.max(0, shell - 3); n <= shell; n++) {
      const age = elapsed - n * 440
      const cx = w * (.18 + ((n * 37) % 65) / 100)
      const cy = h * (.2 + ((n * 19) % 32) / 100)
      if (age < 350) {
        const t = age / 350
        const y = h - (h - cy) * t
        ctx.fillStyle = FLAG_COLORS[n % 4]
        for (let trail = 0; trail < 8; trail++) {
          ctx.globalAlpha = (1 - trail / 8) * .8
          ctx.fillRect(Math.round(cx), Math.round(y + trail * 3), 2, 3)
        }
      } else if (age < 1550) {
        if (n > this.lastBurst) {
          this.lastBurst = n
          noise(.16, { filter: 'lowpass', freq: 320, to: 100, vol: .14, owner: 'spider' })
          sweep(130, 48, .15, { type: 'sine', vol: .12, owner: 'spider' })
          for (let tick = 0; tick < 6; tick++) noise(.015, { filter: 'highpass', freq: 3600, vol: .035, delay: tick * .045 + (tick % 2) * .013, owner: 'spider' })
        }
        const t = (age - 350) / 1000
        ctx.globalAlpha = t < .4 ? 1 : t < .8 ? .65 : .3
        for (let i = 0; i < 48; i++) {
          const angle = i / 48 * Math.PI * 2
          let x: number
          let y: number
          if (n % 4 === 3) {
            const pane = Math.floor(i / 12)
            const edge = i % 12 / 3
            const side = Math.floor(edge)
            const u = edge - side
            const px = side === 0 ? u : side === 1 ? 1 : side === 2 ? 1 - u : 0
            const py = side === 0 ? 0 : side === 1 ? u : side === 2 ? 1 : 1 - u
            const settle = Math.min(1, t / .2)
            x = ((pane % 2) * 31 + px * 28 - 30) * settle
            y = (Math.floor(pane / 2) * 25 + py * 22 - 24 + Math.sin(px * Math.PI * 2) * 4) * settle
            if (t > .4) y += .05 * ((t - .4) * 60) ** 2
            ctx.fillStyle = FLAG_COLORS[pane]
          } else {
            x = Math.cos(angle) * 95 * t
            y = Math.sin(angle) * 95 * t + .05 * (t * 60) ** 2
            ctx.fillStyle = FLAG_COLORS[n % 4]
          }
          this.x[i] = cx + x
          this.y[i] = cy + y
          ctx.fillRect(Math.round(this.x[i]), Math.round(this.y[i]), 2, 2)
        }
      }
    }
    ctx.globalAlpha = 1
  }
}
