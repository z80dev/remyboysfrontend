import { FLAG_COLORS, noise, sweep } from '../kit'
import { flagPane } from '../../os/icons'
import { burstPositions, FIREWORK_PARTICLES } from './fireworks-model'

/** Analytic, preallocated celebration: 48 particles, no frame allocations or independent timers. */
export class Fireworks {
  private x = new Float32Array(FIREWORK_PARTICLES)
  private y = new Float32Array(FIREWORK_PARTICLES)
  private panes: Path2D[] | null = null
  private lastBurst = -1
  draw(ctx: CanvasRenderingContext2D, elapsed: number, w: number, h: number, pocket = false) {
    if (!this.panes) this.panes = [new Path2D(flagPane(0, 0)), new Path2D(flagPane(1, 0)), new Path2D(flagPane(0, 1)), new Path2D(flagPane(1, 1))]
    const shell = Math.floor(elapsed / 300)
    for (let n = Math.max(0, shell - 4); n <= shell; n++) {
      const age = elapsed - n * 300
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
      } else if (age < 1250) {
        if (n > this.lastBurst) {
          this.lastBurst = n
          noise(.16, { filter: 'lowpass', freq: 320, to: 100, vol: .14, owner: 'spider' })
          sweep(130, 48, .15, { type: 'sine', vol: .12, owner: 'spider' })
          for (let tick = 0; tick < 6; tick++) noise(.015, { filter: 'highpass', freq: 3600, vol: .035, delay: tick * .045 + (tick % 2) * .013, owner: 'spider' })
        }
        const t = (age - 350) / 900
        const alpha = age < 950 ? 1 : age < 1100 ? .7 : .4
        const flag = n % 4 === 3
        const flagScale = pocket ? 1 : 1.4
        if (flag && t >= .25 && t <= .65) {
          ctx.save()
          ctx.translate(cx, cy)
          ctx.scale(flagScale, flagScale)
          ctx.translate(-50, -44)
          for (let pane = 0; pane < 4; pane++) {
            ctx.globalAlpha = alpha * .3
            ctx.fillStyle = FLAG_COLORS[pane]
            ctx.fill(this.panes[pane])
          }
          ctx.restore()
        }
        if (!flag) for (let trail = 2; trail >= 1; trail--) {
          burstPositions(this.x, this.y, n, Math.max(350, age - trail * 40), cx, cy)
          ctx.globalAlpha = alpha * (trail === 1 ? .5 : .25)
          for (let i = 0; i < FIREWORK_PARTICLES; i++) {
            ctx.fillStyle = FLAG_COLORS[n % 2 && i % 2 ? (n + 1) % 4 : n % 4]
            ctx.fillRect(Math.round(this.x[i]) - 1, Math.round(this.y[i]) - 1, 2, 2)
          }
        }
        burstPositions(this.x, this.y, n, age, cx, cy, flagScale)
        const core = flag ? pocket ? 6 : 8 : 3
        const underlay = flag ? core + 1 : 5
        const offset = flag ? core / 2 : 1
        for (let i = 0; i < FIREWORK_PARTICLES; i++) {
          if (!flag && t > .8 && (i + Math.floor(age / 60)) % 3 === 0) continue
          const x = Math.round(this.x[i])
          const y = Math.round(this.y[i])
          ctx.globalAlpha = alpha * .55
          ctx.fillStyle = flag ? '#000000' : '#003000'
          ctx.fillRect(x - Math.floor(underlay / 2), y - Math.floor(underlay / 2), underlay, underlay)
          ctx.globalAlpha = alpha
          ctx.fillStyle = flag ? FLAG_COLORS[Math.floor(i / 12)] : age < 470 ? '#ffffff' : FLAG_COLORS[n % 2 && i % 2 ? (n + 1) % 4 : n % 4]
          ctx.fillRect(x - offset, y - offset, core, core)
          if (flag || alpha === 1) {
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(x - offset, y - offset, flag ? 2 : 1, flag ? 2 : 1)
          }
        }
        if (flag && t >= .25 && t <= .65) {
          ctx.save()
          ctx.translate(cx, cy)
          ctx.scale(flagScale, flagScale)
          ctx.translate(-50, -44)
          for (let pane = 0; pane < 4; pane++) {
            ctx.globalAlpha = alpha
            ctx.lineWidth = 1.5
            ctx.strokeStyle = FLAG_COLORS[pane]
            ctx.stroke(this.panes[pane])
            ctx.globalAlpha = alpha * .6
            ctx.lineWidth = 1
            ctx.strokeStyle = '#ffffff'
            ctx.stroke(this.panes[pane])
          }
          ctx.restore()
        }
        if (!flag && age < 420) {
          const arm = age < 385 ? 3 : 1
          ctx.globalAlpha = 1
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(Math.round(cx) - arm, Math.round(cy), arm * 2 + 1, 1)
          ctx.fillRect(Math.round(cx), Math.round(cy) - arm, 1, arm * 2 + 1)
          if (age < 385) {
            ctx.fillStyle = '#ffff80'
            ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3)
          }
        }
      }
    }
    ctx.globalAlpha = 1
  }
}
