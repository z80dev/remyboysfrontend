/**
 * Controls. Desktop: WASD / arrows, mouse look under pointer lock (drag-to-look when the embed denies pointer lock),
 * click or Space to fire, 1–4 / Q to switch. Touch: left thumb is a floating move stick, right thumb drags to aim and
 * fires while held; tapping the ammo panel cycles weapons.
 */
import type { Input } from './game'

export interface Stick {
  id: number
  ox: number
  oy: number
  x: number
  y: number
}

const LOOK_MOUSE = 0.0026
const LOOK_TOUCH = 0.0085
export const STICK_R = 34

export class Controls {
  keys = new Set<string>()
  look = 0
  mouseFire = false
  slot: number | null = null
  cycle = false
  stick: Stick | null = null
  aim: { id: number; x: number } | null = null
  touched = false
  locked = false
  private dragging = false
  private lastX = 0

  constructor(
    private el: HTMLElement,
    /** Client px → internal px. */
    private toInternal: (cx: number, cy: number) => [number, number],
    /** True if (internal) point is the ammo panel. */
    private isAmmoPanel: (x: number, y: number) => boolean,
    private active: () => boolean,
  ) {
    window.addEventListener('keydown', (e) => {
      if (!this.active()) return
      const k = e.key.toLowerCase()
      if (k >= '1' && k <= '4') this.slot = Number(k) - 1
      else if (k === 'q' || k === 'tab') this.cycle = true
      this.keys.add(k)
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].includes(k)) e.preventDefault()
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()))
    window.addEventListener('blur', () => this.release())
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.el
    })
    el.addEventListener('mousemove', (e) => {
      if (this.locked) this.look += e.movementX * LOOK_MOUSE
      else if (this.dragging) {
        this.look += (e.clientX - this.lastX) * LOOK_MOUSE * 1.6
        this.lastX = e.clientX
      }
    })
    el.addEventListener('pointerdown', (e) => {
      if (!this.active()) return
      if (e.pointerType === 'touch') {
        this.touched = true
        const [x, y] = this.toInternal(e.clientX, e.clientY)
        if (this.isAmmoPanel(x, y)) {
          this.cycle = true
          return
        }
        if (e.clientX < el.clientWidth * 0.45 && !this.stick) this.stick = { id: e.pointerId, ox: x, oy: y, x, y }
        else if (!this.aim) this.aim = { id: e.pointerId, x: e.clientX }
        e.preventDefault()
        return
      }
      if (e.button !== 0) return
      this.mouseFire = true
      if (!this.locked) {
        this.dragging = true
        this.lastX = e.clientX
        // Pointer lock may be refused inside a sandboxed embed; drag-to-look covers that.
        try {
          const p = el.requestPointerLock() as unknown
          if (p instanceof Promise) p.catch(() => {})
        } catch {
          // not available
        }
      }
    })
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch') return
      if (this.stick?.id === e.pointerId) {
        const [x, y] = this.toInternal(e.clientX, e.clientY)
        this.stick.x = x
        this.stick.y = y
      } else if (this.aim?.id === e.pointerId) {
        this.look += (e.clientX - this.aim.x) * LOOK_TOUCH * (400 / Math.max(300, el.clientWidth))
        this.aim.x = e.clientX
      }
    })
    const end = (e: PointerEvent) => {
      if (this.stick?.id === e.pointerId) this.stick = null
      if (this.aim?.id === e.pointerId) this.aim = null
      if (e.pointerType !== 'touch') {
        this.mouseFire = false
        this.dragging = false
      }
    }
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    el.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  release() {
    this.keys.clear()
    this.mouseFire = false
    this.dragging = false
    this.stick = null
    this.aim = null
    if (document.pointerLockElement === this.el) document.exitPointerLock()
  }

  /** Snapshot for one frame; consumes look deltas and one-shot requests. */
  read(): Input {
    const k = this.keys
    let fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0)
    let strafe = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0)
    const turn = (k.has('arrowright') ? 1 : 0) - (k.has('arrowleft') ? 1 : 0)
    if (this.stick) {
      const dx = (this.stick.x - this.stick.ox) / STICK_R
      const dy = (this.stick.y - this.stick.oy) / STICK_R
      strafe = Math.max(-1, Math.min(1, dx))
      fwd = Math.max(-1, Math.min(1, -dy))
    }
    const input: Input = {
      fwd,
      strafe,
      turn,
      look: this.look,
      fire: this.mouseFire || k.has(' ') || k.has('control') || this.aim !== null,
      slot: this.slot,
      cycle: this.cycle,
    }
    this.look = 0
    this.slot = null
    this.cycle = false
    return input
  }
}

