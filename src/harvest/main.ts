/**
 * Remy's Harvest: boot, input, the frame loop, title / pause / game-over screens and the share loop. Runs full-bleed so
 * the same page is basedremyboys.club/harvest/ and the X player card iframe that plays inside a post.
 */
import '@fontsource/lilita-one/400.css'
import './style.css'
import { load, save } from '../haunt/store'
import { type Art, loadArt } from './art'
import { audio } from './audio'
import { FIELD_H, Game, PER_LEVEL } from './game'
import { Renderer } from './render'

const SITE = 'https://basedremyboys.club'
const PAGE = `${SITE}/harvest/`
const BEST_KEY = 'harvest.best'
/** Narrowest field (units); tall phones get a little less corn at the edges rather than letterbox bands. */
const MIN_W = 340

const root = document.getElementById('harvest') as HTMLElement
const view = document.createElement('canvas')
const ui = document.createElement('div')
ui.className = 'ui'
const pauseBtn = document.createElement('button')
pauseBtn.className = 'pausebtn'
pauseBtn.setAttribute('aria-label', 'Pause')
pauseBtn.textContent = 'II'
root.append(view, ui, pauseBtn)
const ctx = view.getContext('2d') as CanvasRenderingContext2D

type State = 'loading' | 'title' | 'play' | 'paused' | 'over'
let state: State = 'loading'
let best = Number(load(BEST_KEY)) || 0
let art: Art | null = null
let renderer: Renderer | null = null
let game: Game | null = null
let fw = FIELD_H
const keys = { left: false, right: false }

const params = new URLSearchParams(location.search)
const challenge = (() => {
  const s = Number(params.get('s'))
  const c = Number(params.get('c'))
  return Number.isSafeInteger(s) && s > 0 ? { score: s, corn: Number.isInteger(c) && c > 0 ? c : 0 } : null
})()
const embedded = (() => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
})()
const touch = matchMedia('(pointer: coarse)').matches

function fit() {
  const cw = Math.max(1, root.clientWidth)
  const ch = Math.max(1, root.clientHeight)
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  view.width = Math.round(cw * dpr)
  view.height = Math.round(ch * dpr)
  fw = Math.round(Math.max(MIN_W, Math.min(FIELD_H, (cw / ch) * FIELD_H)))
  renderer?.layout(view.width, view.height, fw)
  game?.resize(fw)
}
new ResizeObserver(fit).observe(root)

// ---------------------------------------------------------------- input

const fieldX = (e: PointerEvent) => {
  const r = view.getBoundingClientRect()
  return renderer ? renderer.toField(((e.clientX - r.left) / r.width) * view.width) : 0
}
view.addEventListener('pointerdown', (e) => {
  if (state !== 'play' || !game) return
  view.setPointerCapture(e.pointerId)
  game.target = fieldX(e)
})
view.addEventListener('pointermove', (e) => {
  if (state !== 'play' || !game) return
  // Mouse steers by hovering; touch and pen while pressed.
  if (e.pointerType === 'mouse' || e.buttons) game.target = fieldX(e)
})
function setKeys() {
  if (!game) return
  game.keyDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
  if (game.keyDir) game.target = null
}
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase()
  if (k === 'arrowleft' || k === 'a') keys.left = true
  else if (k === 'arrowright' || k === 'd') keys.right = true
  else if (k === 'm') toggleMute()
  else if ((k === 'p' || k === 'escape') && state === 'play') pause()
  else if ((k === 'p' || k === 'escape' || k === ' ') && state === 'paused') resume()
  else if ((k === 'enter' || k === ' ') && (state === 'title' || state === 'over')) start()
  else return
  e.preventDefault()
  setKeys()
})
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase()
  if (k === 'arrowleft' || k === 'a') keys.left = false
  else if (k === 'arrowright' || k === 'd') keys.right = false
  setKeys()
})
window.addEventListener('blur', () => state === 'play' && pause())
document.addEventListener('visibilitychange', () => document.hidden && state === 'play' && pause())
pauseBtn.addEventListener('click', () => (state === 'play' ? pause() : resume()))

// ---------------------------------------------------------------- screens

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
const fmt = (n: number) => n.toLocaleString('en-US')
const muteLabel = () => (audio.muted ? '🔇' : '🔊')

function toggleMute() {
  audio.toggleMute()
  for (const b of ui.querySelectorAll<HTMLButtonElement>('.mute')) b.textContent = muteLabel()
}

function chrome() {
  const full = embedded ? `<a class="full" href="${esc(PAGE + location.search)}" target="_blank" rel="noopener">⛶ FULL SCREEN</a>` : ''
  return `<button class="mute" aria-label="Sound">${muteLabel()}</button>${full}`
}

function showTitle() {
  state = 'title'
  root.dataset.state = state
  game = null
  renderer?.reset()
  const ch = challenge
  ui.innerHTML = `
    ${chrome()}
    <div class="title">
      ${ch ? `<p class="dare">A friend harvested <b>${fmt(ch.score)}</b> pts${ch.corn ? ` (${fmt(ch.corn)} corn)` : ''}. Beat it!</p>` : ''}
      <button class="play">PLAY</button>
      <p class="keys">${touch ? 'DRAG TO MOVE REMY' : '← → / A D OR MOUSE TO MOVE'} · CATCH CORN · DODGE THE CABALD</p>
      <p class="foot">${best ? `BEST ${fmt(best)} · ` : ''}<a href="${SITE}" target="_blank" rel="noopener">BASEDREMYBOYS.CLUB</a></p>
    </div>`
  ui.querySelector('.mute')?.addEventListener('click', toggleMute)
  ui.querySelector('.play')?.addEventListener('click', start)
}

function start() {
  if (!renderer) return
  audio.unlock()
  audio.sfx('start')
  renderer.reset()
  game = new Game(fw)
  // Dev override: ?level=5 starts at the harvest moon.
  const devLevel = import.meta.env.DEV ? Number(params.get('level')) : 0
  if (devLevel > 1) {
    game.level = devLevel
    game.caught = (devLevel - 1) * PER_LEVEL
  }
  ui.innerHTML = ''
  state = 'play'
  root.dataset.state = state
  audio.music(true)
}

function pause() {
  state = 'paused'
  root.dataset.state = state
  keys.left = keys.right = false
  setKeys()
  ui.innerHTML = `
    ${chrome()}
    <div class="panel small">
      <h2>PAUSED</h2>
      <button class="play">RESUME</button>
      <button class="quit ghost">QUIT</button>
    </div>`
  ui.querySelector('.mute')?.addEventListener('click', toggleMute)
  ui.querySelector('.play')?.addEventListener('click', resume)
  ui.querySelector('.quit')?.addEventListener('click', () => {
    audio.music(false)
    showTitle()
  })
}

function resume() {
  if (state !== 'paused') return
  ui.innerHTML = ''
  state = 'play'
  root.dataset.state = state
  audio.unlock()
}

function showOver(g: Game) {
  state = 'over'
  root.dataset.state = state
  audio.music(false)
  const record = g.score > best
  if (record) {
    best = g.score
    save(BEST_KEY, String(best))
  }
  const beat = challenge && g.score > challenge.score
  const link = `${PAGE}?s=${g.score}&c=${g.caught}`
  const post = [
    `I harvested ${fmt(g.score)} pts in Remy's Harvest 🌽 (${g.caught} catches, level ${g.level})`,
    beat ? `(beat my friend's ${fmt(challenge.score)})` : '',
    'Happy Indigenous Peoples’ Day!',
    '',
    'think you can catch more? it plays right inside this post 👇',
  ]
    .filter((l, i) => l || i === 3)
    .join('\n')
  const intent = `https://x.com/intent/post?text=${encodeURIComponent(post)}&url=${encodeURIComponent(link)}&via=basedremyboys`
  ui.innerHTML = `
    ${chrome()}
    <div class="panel over">
      <h2>HARVEST'S IN!</h2>
      ${record ? '<p class="record">NEW BEST!</p>' : ''}
      ${beat ? '<p class="record">YOU BEAT YOUR FRIEND!</p>' : ''}
      <p class="score">${fmt(g.score)}</p>
      <dl>
        <div><dt>CAUGHT</dt><dd>${g.caught}</dd></div>
        <div><dt>LEVEL</dt><dd>${g.level}</dd></div>
        <div><dt>STREAK</dt><dd>${g.bestStreak}</dd></div>
        <div><dt>SISTERS</dt><dd>${g.sistersDone}</dd></div>
      </dl>
      <a class="share" href="${esc(intent)}" target="_blank" rel="noopener">POST YOUR SCORE ON 𝕏</a>
      <button class="play">PLAY AGAIN</button>
      <p class="fact">The Three Sisters (corn, beans and squash) have been planted together by Indigenous farmers for centuries: the corn holds up the beans, the beans feed the soil, the squash shades it.</p>
    </div>`
  ui.querySelector('.mute')?.addEventListener('click', toggleMute)
  ui.querySelector('.play')?.addEventListener('click', start)
}

// ---------------------------------------------------------------- boot + frame loop

function drawLoading(k: number) {
  const w = view.width
  const h = view.height
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#2a1408'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#5a3216'
  ctx.fillRect(w * 0.2, h * 0.5 - 6, w * 0.6, 12)
  ctx.fillStyle = '#ffc21a'
  ctx.fillRect(w * 0.2, h * 0.5 - 6, w * 0.6 * k, 12)
}

async function boot() {
  fit()
  drawLoading(0)
  const [loaded] = await Promise.all([loadArt(drawLoading), document.fonts.load('40px "Lilita One"').catch(() => [])])
  art = loaded
  renderer = new Renderer(ctx, art)
  fit()
  showTitle()
  requestAnimationFrame(frame)
}

let last = performance.now()
function frame(now: number) {
  const dt = Math.min(1 / 30, (now - last) / 1000)
  last = now
  if (renderer) {
    if (game && state === 'play') {
      game.update(dt)
      for (const e of game.events) {
        renderer.fx(e, game)
        if (e.type === 'catch') {
          audio.catch(e.streak)
          if (e.kind === 'golden') audio.sfx('golden')
          else if (e.kind === 'gem') audio.sfx('gem')
        } else if (e.type === 'sister') audio.sfx('sister')
        else if (e.type === 'sisters') audio.sfx('sisters')
        else if (e.type === 'miss') audio.sfx(e.lifeLost ? 'miss' : 'drop')
        else if (e.type === 'bonk') audio.sfx(e.kind === 'cabald' ? 'bonk' : 'rotten')
        else if (e.type === 'level') audio.sfx('level')
        else if (e.type === 'over') audio.sfx('over')
      }
      game.events.length = 0
      if (game.over && game.overT > 1.4) showOver(game)
    } else if (game && state === 'over') game.update(dt)
    renderer.update(state === 'paused' ? 0 : dt, game)
    renderer.draw(game, state === 'title' ? 'title' : state === 'over' ? 'over' : 'play')
  }
  requestAnimationFrame(frame)
}

void boot()
