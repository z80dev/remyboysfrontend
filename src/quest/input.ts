/** Keyboard + on-screen pad → a tiny GBA-style button model with a handler stack for UI focus. */
import type { Dir } from './types'

export type Btn = Dir | 'a' | 'b' | 'start'
type Handler = (b: Btn) => void

const held: Record<Btn, boolean> = { up: false, down: false, left: false, right: false, a: false, b: false, start: false }
/** Most recently pressed direction first, so diagonals resolve to the newest key like the GBA games. */
const dirOrder: Dir[] = []
const stack: Handler[] = []
let anyListeners: ((b: Btn) => void)[] = []

const DIRS: Dir[] = ['up', 'down', 'left', 'right']
const isDir = (b: Btn): b is Dir => (DIRS as string[]).includes(b)

const KEYMAP: Record<string, Btn> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyZ: 'a',
  Space: 'a',
  KeyJ: 'a',
  Enter: 'a',
  KeyX: 'b',
  KeyK: 'b',
  Backspace: 'b',
  ShiftLeft: 'b',
  ShiftRight: 'b',
  Escape: 'start',
  KeyM: 'start',
  Tab: 'start',
}

const repeatTimers: Partial<Record<Btn, number>> = {}

function press(b: Btn) {
  if (held[b]) return
  held[b] = true
  if (isDir(b)) {
    const i = dirOrder.indexOf(b)
    if (i >= 0) dirOrder.splice(i, 1)
    dirOrder.unshift(b)
    // Menu auto-repeat for directions.
    repeatTimers[b] = window.setTimeout(function rep() {
      if (!held[b]) return
      emit(b)
      repeatTimers[b] = window.setTimeout(rep, 110)
    }, 340)
  }
  emit(b)
}

function release(b: Btn) {
  if (!held[b]) return
  held[b] = false
  if (isDir(b)) {
    const i = dirOrder.indexOf(b)
    if (i >= 0) dirOrder.splice(i, 1)
  }
  window.clearTimeout(repeatTimers[b])
}

function emit(b: Btn) {
  for (const l of anyListeners) l(b)
  stack[stack.length - 1]?.(b)
}

export const input = {
  held: (b: Btn) => held[b],
  /** Newest held direction. */
  dir: (): Dir | null => dirOrder[0] ?? null,
  /** UI focus: only the top handler receives presses. Returns a pop function. */
  push(h: Handler) {
    stack.push(h)
    return () => {
      const i = stack.lastIndexOf(h)
      if (i >= 0) stack.splice(i, 1)
    }
  },
  get focused() {
    return stack.length > 0
  },
  /** Every press regardless of focus (audio unlock, etc). */
  onAny(l: (b: Btn) => void) {
    anyListeners.push(l)
    return () => {
      anyListeners = anyListeners.filter((x) => x !== l)
    }
  },
  releaseAll() {
    for (const b of Object.keys(held) as Btn[]) release(b)
  },
}

export function bindKeyboard() {
  window.addEventListener('keydown', (e) => {
    const b = KEYMAP[e.code]
    if (!b) return
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return
    e.preventDefault()
    if (!e.repeat) press(b)
  })
  window.addEventListener('keyup', (e) => {
    const b = KEYMAP[e.code]
    if (b) release(b)
  })
  window.addEventListener('blur', () => input.releaseAll())
  document.addEventListener('visibilitychange', () => input.releaseAll())
}

const buzz = () => navigator.vibrate?.(6)

/** Builds the handheld control deck (D-pad, A, B, START) into `root`. */
export function mountPad(root: HTMLElement) {
  root.innerHTML = `
    <div class="pad-dpad" aria-label="D-pad">
      <div class="pad-cross"><i class="u"></i><i class="d"></i><i class="l"></i><i class="r"></i><b></b></div>
    </div>
    <div class="pad-mid"><button class="pad-start" data-b="start" aria-label="Menu"><span></span>MENU</button></div>
    <div class="pad-ab">
      <button class="pad-btn pad-b" data-b="b" aria-label="B">B</button>
      <button class="pad-btn pad-a" data-b="a" aria-label="A">A</button>
    </div>`
  const dpad = root.querySelector('.pad-dpad') as HTMLElement
  const cross = root.querySelector('.pad-cross') as HTMLElement
  let dpadDir: Dir | null = null
  let dpadPointer: number | null = null
  const setDir = (d: Dir | null) => {
    if (d === dpadDir) return
    if (dpadDir) release(dpadDir)
    dpadDir = d
    cross.dataset.dir = d ?? ''
    if (d) {
      buzz()
      press(d)
    }
  }
  const track = (e: PointerEvent) => {
    const r = cross.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    if (Math.hypot(dx, dy) < r.width * 0.1) return setDir(null)
    setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
  }
  dpad.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    dpadPointer = e.pointerId
    dpad.setPointerCapture(e.pointerId)
    track(e)
  })
  dpad.addEventListener('pointermove', (e) => {
    if (e.pointerId === dpadPointer) track(e)
  })
  const end = (e: PointerEvent) => {
    if (e.pointerId !== dpadPointer) return
    dpadPointer = null
    setDir(null)
  }
  dpad.addEventListener('pointerup', end)
  dpad.addEventListener('pointercancel', end)

  for (const el of root.querySelectorAll<HTMLElement>('[data-b]')) {
    const b = el.dataset.b as Btn
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      el.setPointerCapture(e.pointerId)
      el.classList.add('down')
      buzz()
      press(b)
    })
    const up = () => {
      el.classList.remove('down')
      release(b)
    }
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('contextmenu', (e) => e.preventDefault())
  }
}

/** Synthetic press for tappable DOM UI (menus, text boxes). */
export function tap(b: Btn) {
  emit(b)
}
