/** Builds the page chrome (the REMY ADVANCE handheld around the screen) and wires input + scaling. */
import '@fontsource/pixelify-sans/500.css'
import '@fontsource/pixelify-sans/600.css'
import '@fontsource/pixelify-sans/700.css'
import '@fontsource/press-start-2p/400.css'
import './shell.css'
import './style.css'
import { audio } from './audio'
import { Px, hex, stamp } from './gfx/px'
import { bindKeyboard, input, mountPad } from './input'
import { applySkin } from './skin'
import { initUi } from './ui'
import { initView, view } from './view'

/** Up arrow for the keycaps, drawn on the keycap font's own 1px grid; CSS turns it in 90° steps. */
function arrowUrl(): string {
  const p = new Px(7, 7)
  stamp(p, ['...k...', '..kkk..', '.kkkkk.', 'kkkkkkk', '..kkk..', '..kkk..', '..kkk..'], 0, 0, { k: hex('#efeaff') })
  return `url(${p.toCanvas().toDataURL()})`
}

/** A keycap that lights while any of the `codes` (KeyboardEvent.code) is held. */
const cap = (label: string, codes: string, cls = '') => `<kbd class="${cls}" data-k="${codes}">${label}</kbd>`

export function mountShell(root: HTMLElement) {
  const touch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
  const embedded = window.self !== window.top
  root.innerHTML = `
    <div class="dev">
      <i class="dev-sh l"><b>L</b></i><i class="dev-sh r"><b>R</b></i>
      <div class="bezel">
        <div class="bezel-top"><i class="led"></i><span>POWER</span><i class="stripe"></i></div>
        <div class="slot"><div class="screen"><canvas class="world"></canvas><div class="ui"></div></div></div>
        <div class="brand"><span>REMY</span><b>ADVANCE</b></div>
      </div>
      <div class="pad"></div>
      <div class="logo" aria-hidden="true"><span>REMY</span><b>ADVANCE</b></div>
      <i class="grille"></i>
    </div>
    <div class="keys">
      <span class="kg">${cap('', 'ArrowUp', 'ar u')}${cap('', 'ArrowLeft', 'ar l')}${cap('', 'ArrowDown', 'ar d')}${cap('', 'ArrowRight', 'ar r')}<i class="kx">/</i>${cap('WASD', 'KeyW KeyA KeyS KeyD')} MOVE</span>
      <span class="kg">${cap('Z', 'KeyZ')}<i class="kx">/</i>${cap('ENTER', 'Enter')} A</span>
      <span class="kg">${cap('X', 'KeyX')} B<i class="kh">HOLD TO WALK</i></span>
      <span class="kg">${cap('ESC', 'Escape')} MENU</span>
    </div>`
  root.style.setProperty('--kb-arrow', arrowUrl())
  applySkin()
  const html = document.documentElement
  const setLayout = () => {
    const portrait = window.innerHeight >= window.innerWidth
    html.classList.toggle('touch', touch)
    html.classList.toggle('desktop', !touch)
    html.classList.toggle('embedded', embedded)
    html.classList.toggle('layout-portrait', touch && portrait)
    html.classList.toggle('layout-landscape', touch && !portrait)
  }
  setLayout()
  window.addEventListener('resize', setLayout)
  const slot = root.querySelector('.slot') as HTMLElement
  const screen = root.querySelector('.screen') as HTMLElement
  initView(screen, root.querySelector('canvas.world') as HTMLCanvasElement, slot)
  initUi(root.querySelector('.ui') as HTMLElement)
  bindKeyboard()
  mountPad(root.querySelector('.pad') as HTMLElement)
  const keys = root.querySelector('.keys') as HTMLElement
  const light = (e: KeyboardEvent) => {
    for (const k of keys.querySelectorAll(`[data-k~="${e.code}"]`)) k.classList.toggle('on', e.type === 'keydown')
  }
  window.addEventListener('keydown', light)
  window.addEventListener('keyup', light)
  window.addEventListener('blur', () => {
    for (const k of keys.querySelectorAll('.on')) k.classList.remove('on')
  })
  // The device is centred with fluid CSS, so the screen (and the pixel-font hints) can land between device pixels
  // and get resampled; nudge them onto the device grid whenever anything around them moves.
  const snap = () => {
    const dpr = window.devicePixelRatio || 1
    for (const el of [screen, keys]) {
      el.style.translate = ''
      const r = el.getBoundingClientRect()
      const dx = (Math.round(r.left * dpr) - r.left * dpr) / dpr
      const dy = (Math.round(r.top * dpr) - r.top * dpr) / dpr
      if (dx || dy) el.style.translate = `${dx}px ${dy}px`
    }
  }
  new ResizeObserver(snap).observe(root)
  view.listeners.push(snap)
  window.addEventListener('resize', () => requestAnimationFrame(snap))
  document.fonts.ready.then(snap)
  // iOS needs the AudioContext resumed inside a user gesture.
  const unlock = () => audio.unlock()
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
  input.onAny(unlock)
  // Block pinch/double-tap zoom on iOS.
  document.addEventListener('gesturestart', (e) => e.preventDefault())
  document.addEventListener('dblclick', (e) => e.preventDefault())
}
