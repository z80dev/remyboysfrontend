/**
 * Night of the Cabald: boot, the frame loop, title / pause / game-over screens and the share loop. Runs full-bleed so
 * the same page is both basedremyboys.club/halloween/ and the X player card iframe that plays inside a post.
 */
import '@fontsource/press-start-2p/400.css'
import './style.css'
import { remySrc } from '../lib/media'
import { type Catalogue, REMY_COUNT, loadCatalogue, randomRemy, remyFace, remySprite } from './assets'
import { audio } from './audio'
import { type Sprites, Game } from './game'
import {
  type Materials,
  type Tex,
  bat,
  blast,
  cabaldify,
  candelabra,
  fireball,
  ghostify,
  jack,
  materials,
  pickupTex,
  sheetGhost,
  tombstone,
  viewModels,
  zombify,
} from './gfx'
import { BAR, type Faces, drawHud, isAmmoPanel, makeFaces, text } from './hud'
import { Controls } from './input'
import { buildLevel } from './level'
import { Renderer } from './render'
import { load, save } from './store'

const SITE = 'https://basedremyboys.club'
const PAGE = `${SITE}/halloween/`
const REMY_KEY = 'haunt.remy'
const BEST_KEY = 'haunt.best'

const root = document.getElementById('haunt') as HTMLElement
const view = document.createElement('canvas')
const ui = document.createElement('div')
ui.className = 'ui'
root.append(view, ui)
const ctx = view.getContext('2d') as CanvasRenderingContext2D
const renderer = new Renderer(ctx)

let W = 0
let H = 0
function fit() {
  const cw = Math.max(1, root.clientWidth)
  const ch = Math.max(1, root.clientHeight)
  const scale = Math.max(1, ch / 240)
  const nh = Math.round(ch / scale)
  const nw = Math.round(cw / scale)
  if (nw === W && nh === H) return
  W = nw
  H = nh
  view.width = W
  view.height = H
  ctx.imageSmoothingEnabled = false
  renderer.resize(W, H, H - BAR)
}
new ResizeObserver(fit).observe(root)
fit()

const params = new URLSearchParams(location.search)
const challenge = (() => {
  const s = Number(params.get('s'))
  const w = Number(params.get('w'))
  const r = Number(params.get('r'))
  return Number.isFinite(s) && s > 0 && Number.isInteger(r) && r >= 0 && r < REMY_COUNT
    ? { score: Math.floor(s), wave: Math.max(1, Math.floor(w) || 1), remy: r }
    : null
})()
const embedded = (() => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
})()

type State = 'loading' | 'title' | 'play' | 'paused' | 'over'
let state: State = 'loading'
let best = Number(load(BEST_KEY)) || 0
let cat: Catalogue | null = null
let remy = 0
let spr: Sprites | null = null
let mats: Materials | null = null
let faces: Faces | null = null
let game: Game | null = null
let touch = matchMedia('(pointer: coarse)').matches
let hadLock = false

const controls = new Controls(
  view,
  (cx, cy) => {
    const r = view.getBoundingClientRect()
    return [((cx - r.left) / r.width) * W, ((cy - r.top) / r.height) * H]
  },
  (x, y) => isAmmoPanel(W, H, x, y),
  () => state === 'play',
)
view.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') touch = true
  else if (state === 'play') touch = false
})
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === view) hadLock = true
  else if (state === 'play' && hadLock && !touch) pause()
})
window.addEventListener('blur', () => state === 'play' && pause())
document.addEventListener('visibilitychange', () => document.hidden && state === 'play' && pause())
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state === 'paused') resume()
  else if (e.key.toLowerCase() === 'm') toggleMute()
  else if (e.key.toLowerCase() === 'p' && state === 'play') pause()
})

// ---------------------------------------------------------------- loading

async function boot() {
  await document.fonts.load('8px "Press Start 2P"').catch(() => {})
  drawLoading('SUMMONING THE CABALD...')
  cat = await loadCatalogue()
  const saved = load(REMY_KEY)
  const n = Number(saved)
  remy = saved !== null && Number.isInteger(n) && n >= 0 && n < REMY_COUNT ? n : pickCivilian()
  const bald = cat?.bald.length ? cat.bald : []
  const pickBald = (n: number) => Array.from({ length: n }, () => (bald.length ? bald[Math.floor(Math.random() * bald.length)] : -1))
  const ghosts = Array.from({ length: 5 }, () => pickCivilian())
  const portraits = Array.from({ length: 6 }, () => pickCivilian())
  const sprite = async (idx: number) => (idx >= 0 ? await remySprite(idx) : null)
  let done = 0
  const total = 5 + 3 + 1 + 5 + 6
  const track = <T>(p: Promise<T>) =>
    p.then((v) => {
      done++
      drawLoading('SUMMONING THE CABALD...', done / total)
      return v
    })
  const [grunts, admins, bosses, ghostTex, faceImgs] = await Promise.all([
    Promise.all(pickBald(5).map((i) => track(sprite(i)))),
    Promise.all(pickBald(3).map((i) => track(sprite(i)))),
    Promise.all(pickBald(1).map((i) => track(sprite(i)))),
    Promise.all(ghosts.map((i) => track(remySprite(i)))),
    Promise.all(portraits.map((i) => track(remyFace(i)))),
  ])
  const sheet = sheetGhost()
  const ok = (xs: (Tex | null)[]) => xs.filter((t): t is Tex => t !== null)
  const g = ok(grunts)
  const a = ok(admins)
  const gh = ok(ghostTex)
  mats = materials(faceImgs)
  spr = {
    grunt: (g.length ? g : [sheet]).map((t, i) => zombify(t, i + 1)),
    admin: (a.length ? a : g.length ? g : [sheet]).map((t) => cabaldify(t, false)),
    boss: cabaldify(bosses[0] ?? g[0] ?? sheet, true),
    ghost: (gh.length ? gh : [sheet]).map(ghostify),
    jackFoe: [jack(true, 0), jack(true, 1)],
    jackProp: [jack(false, 0), jack(false, 1)],
    candle: [candelabra(0), candelabra(1)],
    tomb: Array.from({ length: 6 }, (_, i) => tombstone(i)),
    bat: [bat(0), bat(1)],
    fireball: [fireball(0), fireball(1)],
    blast: Array.from({ length: 6 }, (_, i) => blast(i)),
    pickups: {
      candy: pickupTex('candy'),
      corn: pickupTex('corn'),
      shells: pickupTex('shells'),
      pumpkins: pickupTex('pumpkins'),
      boomstick: pickupTex('boomstick'),
      rush: pickupTex('rush'),
      launcher: pickupTex('launcher'),
    },
    vm: viewModels('#f6d2b3', '#ffffff'),
  }
  game = new Game(buildLevel(), spr, mats)
  showTitle()
}

function pickCivilian() {
  return randomRemy(cat?.bald ?? [])
}

function drawLoading(msg: string, k = 0) {
  ctx.fillStyle = '#0a0410'
  ctx.fillRect(0, 0, W, H)
  text(ctx, msg, W / 2, H / 2 - 12, 8, '#ff8a1a', 'center')
  const bw = Math.min(W - 40, 160)
  ctx.fillStyle = '#2a1838'
  ctx.fillRect((W - bw) / 2, H / 2 + 4, bw, 6)
  ctx.fillStyle = '#ff8a1a'
  ctx.fillRect((W - bw) / 2, H / 2 + 4, Math.round(bw * k), 6)
}

// ---------------------------------------------------------------- screens

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
const fmt = (n: number) => n.toLocaleString('en-US')

function muteLabel() {
  return audio.muted ? 'SOUND OFF' : 'SOUND ON'
}

function toggleMute() {
  audio.toggleMute()
  for (const b of ui.querySelectorAll<HTMLButtonElement>('.mute')) b.textContent = muteLabel()
}

function fullLink() {
  if (!embedded) return ''
  const q = location.search
  return `<a class="full" href="${esc(PAGE + q)}" target="_blank" rel="noopener">FULL SCREEN</a>`
}

function showTitle() {
  state = 'title'
  if (game?.wave && spr && mats) game = new Game(buildLevel(), spr, mats)
  const ch = challenge
  ui.innerHTML = `
    <div class="panel title">
      <button class="mute">${muteLabel()}</button>
      <h1><small>NIGHT OF THE</small>CABALD</h1>
      <p class="tag">A REMY HALLOWEEN SHOOTER</p>
      ${
        ch
          ? `<p class="dare"><img src="${remySrc(ch.remy, 128)}" alt="">REMY #${ch.remy} SURVIVED ${ch.wave} WAVE${ch.wave === 1 ? '' : 'S'}<br>WITH <b>${fmt(ch.score)}</b> PTS. BEAT IT.</p>`
          : ''
      }
      <div class="pick">
        <button class="prev" aria-label="Previous Remy">◀</button>
        <img class="face" alt="">
        <div class="who"><label>REMY #<input class="idx" inputmode="numeric" maxlength="4"></label><small class="note"></small></div>
        <button class="next" aria-label="Next Remy">▶</button>
        <button class="dice" aria-label="Random Remy">?</button>
      </div>
      <button class="play">PLAY</button>
      <p class="keys">${
        touch ? 'LEFT THUMB MOVE · RIGHT THUMB AIM + FIRE · TAP AMMO TO SWAP' : 'WASD MOVE · MOUSE AIM · CLICK FIRE · 1-4 WEAPONS'
      }</p>
      <p class="foot">${best ? `YOUR BEST ${fmt(best)} · ` : ''}<a href="${SITE}" target="_blank" rel="noopener">BASEDREMYBOYS.CLUB</a></p>
      ${fullLink()}
    </div>`
  const face = ui.querySelector('.face') as HTMLImageElement
  const idx = ui.querySelector('.idx') as HTMLInputElement
  const note = ui.querySelector('.note') as HTMLElement
  const setRemy = (n: number) => {
    remy = ((Math.trunc(n) % REMY_COUNT) + REMY_COUNT) % REMY_COUNT
    save(REMY_KEY, String(remy))
    face.src = remySrc(remy, 128)
    idx.value = String(remy)
    note.textContent = cat?.bald.includes(remy) ? 'CABALD DEFECTOR' : 'YOUR REMY'
  }
  setRemy(remy)
  idx.addEventListener('change', () => setRemy(Number(idx.value) || 0))
  ui.querySelector('.prev')?.addEventListener('click', () => setRemy(remy - 1))
  ui.querySelector('.next')?.addEventListener('click', () => setRemy(remy + 1))
  ui.querySelector('.dice')?.addEventListener('click', () => setRemy(pickCivilian()))
  ui.querySelector('.mute')?.addEventListener('click', toggleMute)
  ui.querySelector('.play')?.addEventListener('click', (e) => void start((e as PointerEvent).pointerType === 'touch'))
}

async function start(byTouch: boolean) {
  if (!spr || !mats) return
  audio.unlock()
  if (byTouch) touch = true
  else lock()
  const img = await remyFace(remy)
  faces = makeFaces(img)
  const pal = cat?.palette(remy) ?? { skin: '#f6d2b3', shirt: '#ffffff' }
  spr.vm = viewModels(pal.skin, pal.shirt)
  game = new Game(buildLevel(), spr, mats)
  ui.innerHTML = ''
  state = 'play'
  audio.music(true)
}

function lock() {
  try {
    const p = view.requestPointerLock() as unknown
    if (p instanceof Promise) p.catch(() => {})
  } catch {
    // Embeds may refuse pointer lock; drag-to-look still works.
  }
}

function pause() {
  state = 'paused'
  controls.release()
  ui.innerHTML = `
    <div class="panel small">
      <h2>PAUSED</h2>
      <button class="play">RESUME</button>
      <button class="mute">${muteLabel()}</button>
      <button class="quit">QUIT</button>
    </div>`
  ui.querySelector('.play')?.addEventListener('click', (e) => {
    if ((e as PointerEvent).pointerType !== 'touch') lock()
    resume()
  })
  ui.querySelector('.mute')?.addEventListener('click', toggleMute)
  ui.querySelector('.quit')?.addEventListener('click', () => {
    audio.music(false)
    showTitle()
  })
}

function resume() {
  if (state !== 'paused') return
  ui.innerHTML = ''
  state = 'play'
  audio.unlock()
}

function showOver(g: Game) {
  state = 'over'
  controls.release()
  const record = g.score > best
  if (record) {
    best = g.score
    save(BEST_KEY, String(best))
  }
  const beat = challenge && g.score > challenge.score
  const link = `${PAGE}?s=${g.score}&w=${g.wave}&r=${remy}`
  const post = [
    `I survived ${g.wave} wave${g.wave === 1 ? '' : 's'} of THE CABALD as Remy #${remy} 🎃 ${fmt(g.score)} pts`,
    beat ? `(beat Remy #${challenge.remy}'s ${fmt(challenge.score)})` : '',
    '',
    'think you can last longer? it plays right inside this post 👇',
  ]
    .filter((l, i) => l || i === 2)
    .join('\n')
  const intent = `https://x.com/intent/post?text=${encodeURIComponent(post)}&url=${encodeURIComponent(link)}&via=basedremyboys`
  ui.innerHTML = `
    <div class="panel over">
      <h2>YOU GOT RUGGED</h2>
      ${record ? '<p class="record">NEW BEST!</p>' : ''}
      ${beat ? `<p class="record">YOU BEAT REMY #${challenge.remy}!</p>` : ''}
      <dl>
        <div><dt>SCORE</dt><dd>${fmt(g.score)}</dd></div>
        <div><dt>WAVE</dt><dd>${g.wave}</dd></div>
        <div><dt>KILLS</dt><dd>${g.kills}</dd></div>
        <div><dt>COMBO</dt><dd>x${g.bestCombo}</dd></div>
      </dl>
      <a class="share" href="${esc(intent)}" target="_blank" rel="noopener">POST YOUR SCORE ON 𝕏</a>
      <div class="row"><button class="play">AGAIN</button><button class="back">CHANGE REMY</button></div>
      ${fullLink()}
    </div>`
  ui.querySelector('.play')?.addEventListener('click', (e) => void start((e as PointerEvent).pointerType === 'touch'))
  ui.querySelector('.back')?.addEventListener('click', showTitle)
}

// ---------------------------------------------------------------- frame loop

let last = performance.now()
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  const g = game
  if (g && spr) {
    if (state === 'play') {
      g.update(dt, controls.read())
      if (g.dead > 1.8) showOver(g)
    } else if (state === 'over') g.update(dt, { fwd: 0, strafe: 0, turn: 0, look: 0, fire: false, slot: null, cycle: false })
    else if (state === 'title') g.ambient(dt)
    const shake = state === 'play' || state === 'over' ? g.shake : 0
    g.draw(renderer, (Math.random() - 0.5) * shake * 0.02)
    renderer.present()
    view.style.transform = shake > 0.05 ? `translate(${(Math.random() - 0.5) * shake * 6}px,${(Math.random() - 0.5) * shake * 6}px)` : ''
    if (state !== 'title' && faces) drawHud(ctx, g, W, H, faces, controls.stick, touch, best)
    else if (state === 'title') {
      // Dim the attract view under the title card; the status-bar strip has no HUD yet.
      ctx.fillStyle = 'rgba(10,4,16,0.35)'
      ctx.fillRect(0, 0, W, H - BAR)
      ctx.fillStyle = '#0a0410'
      ctx.fillRect(0, H - BAR, W, BAR)
    }
  }
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
void boot()
