/** Builds the page chrome (screen, UI layer, handheld pad) and wires input + scaling. */
import '@fontsource/pixelify-sans/500.css'
import '@fontsource/pixelify-sans/600.css'
import '@fontsource/pixelify-sans/700.css'
import '@fontsource/press-start-2p/400.css'
import './style.css'
import { audio } from './audio'
import { bindKeyboard, input, mountPad } from './input'
import { initUi } from './ui'
import { initView } from './view'

export function mountShell(root: HTMLElement) {
  const touch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
  const embedded = window.self !== window.top
  root.innerHTML = `
    <div class="slot"><div class="screen"><canvas class="world"></canvas><div class="ui"></div></div></div>
    <div class="brand">REMY <b>ADVANCE</b></div>
    <div class="pad"></div>
    <div class="keys"><kbd>←↑↓→</kbd> move · <kbd>Z</kbd> A · <kbd>X</kbd> B / hold to run · <kbd>Esc</kbd> menu</div>`
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
  // iOS needs the AudioContext resumed inside a user gesture.
  const unlock = () => audio.unlock()
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
  input.onAny(unlock)
  // Block pinch/double-tap zoom on iOS.
  document.addEventListener('gesturestart', (e) => e.preventDefault())
  document.addEventListener('dblclick', (e) => e.preventDefault())
}
