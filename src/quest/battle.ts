/** Turn-based battles: rules (damage, AI, catching, XP) and the whole battle presentation. Sizes are rem = 1 logical px. */
import './battle.css'
import { art } from './art'
import { audio } from './audio'
import {
  artSrc,
  effectiveness,
  expGain,
  forgetIndex,
  ITEMS,
  type ItemId,
  MOVES,
  type Move,
  type MoveId,
  movesAt,
  type Remy,
  remyName,
  rng,
  type StatKey,
  type Stats,
  species,
  stageMult,
  statsOf,
  TYPE_COLOR,
  xpForLevel,
} from './data'
import { type Btn, input, tap } from './input'
import { bagScreen, partyScreen } from './menus'
import { markSeen, partyAlive, receiveRemy, S, takeItem, useItemOn } from './state'
import type { Theme, Track } from './types'
import { closeText, el, fade, itemIcon, say, sleep, uiRoot } from './ui'
import { view } from './view'

export interface BattleSetup {
  kind: 'wild' | 'trainer'
  /** wild: exactly 1; trainer: 1..6 in send-out order (fresh objects owned by the battle). */
  foes: Remy[]
  trainer?: { name: string; title: string; portrait: number; intro?: string; lose: string; prize: number }
  bg: Theme | 'exchange' | 'tower'
  /** Default: 'battle' for wild, 'trainer' for trainer. */
  music?: Track
  /** Default: wild true, trainer false. */
  canRun?: boolean
  /** Default: wild true, trainer false. */
  canCatch?: boolean
}
export type BattleResult = 'win' | 'lose' | 'run' | 'caught'

/**
 * Mounts the battle UI over the world, runs it to completion, then fades to black and removes all its DOM.
 * Resolves with the screen still black (the ui fader is opaque): the caller fades back in.
 * Mutates S (party HP/PP/xp/levels/moves, bag, money, seen/caught). Blackout and overworld music are the caller's job.
 */
export function battle(setup: BattleSetup): Promise<BattleResult> {
  return new Battle(setup).run()
}

// ───────────────────────────── rules ─────────────────────────────

type Stage = 'atk' | 'def' | 'spd'
type Who = 'me' | 'foe'
type Action = { kind: 'move'; slot: number } | { kind: 'used' } | { kind: 'end'; result: BattleResult }
type Geo = { x: number; feet: number; size: number }

/** Struggle: used automatically when every move is out of PP. */
const PANIC: Move = {
  name: 'Panic Sell',
  type: 'MEME',
  power: 50,
  acc: 100,
  pp: 1,
  effect: { kind: 'recoil', frac: 0.25 },
  desc: 'Dumps everything at the bottom. Hurts the user too.',
}
const STAT_NAME: Record<Stage, string> = { atk: 'ATTACK', def: 'DEFENSE', spd: 'SPEED' }
const STAGE_CAP = 4
const MAX_LEVEL = 100
const ACTIONS = ['FIGHT', 'BAG', 'REMYS', 'RUN']

const rand = Math.random
const pick = <T>(a: readonly T[]): T => a[Math.floor(rand() * a.length)]
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const isStage = (s: StatKey): s is Stage => s !== 'hp'
const xpFrac = (r: Remy) => {
  if (r.level >= MAX_LEVEL) return 1
  const a = xpForLevel(r.level)
  return clamp((r.xp - a) / (xpForLevel(r.level + 1) - a), 0, 1)
}

function anim(e: Element, kf: Keyframe[], o: number | KeyframeAnimationOptions): Promise<void> {
  const a = e.animate(kf, typeof o === 'number' ? { duration: o, fill: 'forwards' } : { fill: 'forwards', ...o })
  return a.finished.then(
    () => undefined,
    () => undefined,
  )
}

/** 2×2 grid cursor movement; stays put when the target cell is empty. */
function gridNav(sel: number, b: Btn, n: number): number {
  const r = sel >> 1
  const c = sel & 1
  const next = b === 'up' ? c : b === 'down' ? 2 + c : b === 'left' ? r * 2 : b === 'right' ? r * 2 + 1 : sel
  return next < n ? next : sel
}

const note = (t: string, ms = 750) => say(t, { auto: ms })
const tell = (t: string) => say(t)
const show = (t: string) => say(t, { noWait: true })

function preload(idx: number): Promise<void> {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => res()
    img.onerror = () => res()
    img.src = artSrc(idx)
    window.setTimeout(res, 1500)
  })
}


/** Transient canvas only: coarse blocks → atlas portrait → HD; fainting runs the sequence backwards. */
async function pixelPortrait(side: Side, reverse = false) {
  const canvas = document.createElement('canvas')
  canvas.className = 'bt-pixels'
  canvas.width = canvas.height = 192
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const sample = document.createElement('canvas')
  sample.width = sample.height = 32
  const sc = sample.getContext('2d')
  if (!sc) return
  const mini = art.mini(side.remy.idx)
  const paint = (n: number) => {
    sc.clearRect(0, 0, 32, 32)
    if (mini) sc.drawImage(mini.img, mini.sx, mini.sy, mini.sw, mini.sh, 0, 0, n, n)
    else if (side.img.complete && side.img.naturalWidth) sc.drawImage(side.img, 0, 0, n, n)
    else {
      sc.fillStyle = art.get(side.remy.idx).palette.accent
      sc.fillRect(0, 0, n, n)
    }
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sample, 0, 0, n, n, 48, 48, 96, 96)
  }
  const seeded = rng(side.remy.idx + 71)
  const tiles = Array.from({ length: 64 }, (_, i) => ({
    x: i % 8, y: Math.floor(i / 8), order: seeded(),
    dx: (seeded() - 0.5) * 82, dy: -12 - seeded() * 44,
  }))
  side.card.appendChild(canvas)
  side.card.classList.add('materializing')
  const started = performance.now()
  const duration = reverse ? 860 : 780
  let scattering = false
  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      const t = clamp((now - started) / duration, 0, 1)
      ctx.clearRect(0, 0, 192, 192)
      if (reverse && t > 0.46) {
        if (!scattering) {
          paint(32)
          ctx.clearRect(0, 0, 192, 192)
          scattering = true
        }
        const k = (t - 0.46) / 0.54
        side.img.style.opacity = '0'
        side.card.classList.add('dematerializing')
        ctx.globalAlpha = 1 - k
        for (const tile of tiles) {
          ctx.drawImage(sample, tile.x * 4, tile.y * 4, 4, 4,
            48 + tile.x * 12 + tile.dx * k, 48 + tile.y * 12 + tile.dy * k + k * k * 40,
            12 * (1 - k * 0.6), 12 * (1 - k * 0.6))
        }
        ctx.globalAlpha = 1
      } else {
        const p = reverse ? 1 - t / 0.46 : t
        const n = p < 0.18 ? 4 : p < 0.34 ? 8 : p < 0.48 ? 16 : 32
        paint(n)
        side.img.style.opacity = p >= 0.55 ? '1' : '0'
        if (p >= 0.55) {
          const dissolve = (p - 0.55) / 0.45
          for (const tile of tiles) {
            if (tile.order < dissolve) ctx.clearRect(48 + tile.x * 12, 48 + tile.y * 12, 12, 12)
          }
        }
      }
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
  canvas.remove()
  side.card.classList.remove('materializing')
  if (!reverse) side.img.style.opacity = ''
}

/** Cabald's denial seal: integer SVG coordinates keep the bald head, C and heart pixel-crisp. */
const CABALD_SEAL = `<svg viewBox="0 0 40 40" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="M10 2h20v4h6v7h-6V9H12v4H8v14h4v4h18v-4h6v7h-6v4H10v-4H4V6h6z"/><path fill="currentColor" d="M18 11h6v2h3v3h2v8h-3v5H16v-5h-3v-8h2v-3h3z"/><path fill="#ff9fb9" d="M30 18h3v2h2v-2h3v5h-2v2h-2v2h-2v-2h-2z"/></svg>`

function cabaldBackdrop(): string {
  return `<div class="bc-propaganda" aria-hidden="true"><div class="bc-watermark">${CABALD_SEAL}</div><div class="bc-banner">THERE IS NO CABALD <span>♥</span></div></div>`
}
// ───────────────────────────── backdrops ─────────────────────────────

/** A seamless (periodic) candlestick strip, drawn twice so it can scroll by -50% forever. */
function candles(seed: number, n: number, cls = ''): string {
  const r = rng(seed)
  const k = [1 + Math.floor(r() * 2), 3 + Math.floor(r() * 3), 7 + Math.floor(r() * 4)]
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28]
  const y = (i: number) =>
    50 +
    26 * Math.sin((6.2832 * k[0] * i) / n + ph[0]) +
    12 * Math.sin((6.2832 * k[1] * i) / n + ph[1]) +
    6 * Math.sin((6.2832 * k[2] * i) / n + ph[2])
  let s = ''
  let line = ''
  for (let i = 0; i < n * 2; i++) {
    const o = y(i - 1)
    const c = y(i)
    const top = Math.min(o, c)
    const bot = Math.max(o, c)
    const u = c < o ? 'u' : 'd'
    const j = i % n
    const wt = top - 2 - ((j * 7) % 6)
    const wb = bot + 2 + ((j * 5) % 5)
    const x = i * 6
    s += `<rect class="${u}" x="${x + 2}" y="${wt.toFixed(1)}" width="1" height="${(wb - wt).toFixed(1)}"/><rect class="${u}" x="${x}" y="${top.toFixed(1)}" width="5" height="${Math.max(2, bot - top).toFixed(1)}"/>`
    line += `${i ? 'L' : 'M'}${x + 2.5} ${(c - 8).toFixed(1)}`
  }
  return `<svg class="candles ${cls}" viewBox="0 0 ${n * 12} 100" preserveAspectRatio="none" shape-rendering="crispEdges">${s}<path class="ln" d="${line}"/></svg>`
}

/** Rolling ridge line (hills) as a filled SVG. */
function ridge(seed: number, amp: number, fill: string, bumps = 5, trees = 0): string {
  const r = rng(seed)
  const ph = [r() * 6.28, r() * 6.28]
  const pts: string[] = []
  const h = (x: number) => 30 - amp * (0.6 * Math.sin((x / 400) * 6.28 * (bumps / 2) + ph[0]) + 0.4 * Math.sin((x / 400) * 6.28 * bumps + ph[1]))
  for (let x = 0; x <= 400; x += 8) pts.push(`${x},${h(x).toFixed(1)}`)
  let t = ''
  for (let i = 0; i < trees; i++) {
    const x = Math.floor(r() * 392)
    const y = h(x + 4)
    t += `<path d="M${x} ${y + 2}h8l-4 -9z" fill="${fill}" /><rect x="${x + 3}" y="${y}" width="2" height="4" fill="${fill}"/>`
  }
  return `<svg viewBox="0 0 400 60" preserveAspectRatio="none" shape-rendering="crispEdges"><polygon points="0,60 ${pts.join(' ')} 400,60" fill="${fill}"/>${t}</svg>`
}

function skyline(seed: number, fill: string, minH: number, maxH: number, windows: boolean): string {
  const r = rng(seed)
  let s = ''
  let w = ''
  for (let x = -4; x < 400; ) {
    const bw = 10 + Math.floor(r() * 20)
    const bh = minH + Math.floor(r() * (maxH - minH))
    s += `<rect x="${x}" y="${80 - bh}" width="${bw}" height="${bh}"/>`
    if (r() < 0.3) s += `<rect x="${x + Math.floor(bw / 2)}" y="${80 - bh - 8}" width="1" height="8"/>`
    if (r() < 0.25) s += `<rect x="${x + 2}" y="${80 - bh - 3}" width="${bw - 4}" height="3"/>`
    if (windows)
      for (let wy = 80 - bh + 4; wy < 76; wy += 5)
        for (let wx = x + 2; wx < x + bw - 3; wx += 4)
          if (r() < 0.32) w += `<rect class="w${Math.floor(r() * 3)}" x="${wx}" y="${wy}" width="2" height="2"/>`
    x += bw + Math.floor(r() * 3)
  }
  return `<svg viewBox="0 0 400 80" preserveAspectRatio="none" shape-rendering="crispEdges"><g fill="${fill}">${s}</g><g class="wins">${w}</g></svg>`
}

function mesas(seed: number, fill: string, top: string): string {
  const r = rng(seed)
  let p = '0,70'
  let caps = ''
  let x = 0
  while (x < 400) {
    const gap = 10 + Math.floor(r() * 40)
    x += gap
    const w = 30 + Math.floor(r() * 60)
    const h = 22 + Math.floor(r() * 36)
    const s = 4 + Math.floor(r() * 6)
    p += ` ${x},70 ${x + s},${70 - h + 4} ${x + s + 2},${70 - h} ${x + w - s - 2},${70 - h} ${x + w - s},${70 - h + 4} ${x + w},70`
    caps += `<rect x="${x + s + 2}" y="${70 - h}" width="${w - 2 * s - 4}" height="2" fill="${top}"/>`
    for (let k = 0; k < 2; k++) caps += `<rect x="${x + s + 2}" y="${70 - h + 8 + k * 9}" width="${w - 2 * s - 6}" height="1" fill="${top}" opacity=".35"/>`
    x += w
  }
  return `<svg viewBox="0 0 400 70" preserveAspectRatio="none" shape-rendering="crispEdges"><polygon points="${p} 400,70" fill="${fill}"/>${caps}</svg>`
}

const CLOUD = `<svg viewBox="0 0 32 12" shape-rendering="crispEdges"><path d="M9 4h3V2h8v2h3v2h5v2h2v3H2V8h3V6h4z" fill="#fff"/><path d="M2 10h28v1H2z" fill="#cfe6ff"/></svg>`

/** Box-shadow scatter (stars, flowers, grass tufts). `pow` > 1 crowds dots toward the top (the horizon). */
function scatter(seed: number, n: number, w: number, h: number, cls: string, colors: string[], pow = 1): string {
  const r = rng(seed)
  const s: string[] = []
  for (let i = 0; i < n; i++) {
    const y = Math.floor(h * r() ** pow)
    const big = pow > 1 ? y > h * 0.35 : r() < 0.2
    s.push(`${Math.floor(r() * w)}rem ${y}rem 0 ${big ? '0.5rem' : '0'} ${colors[Math.floor(r() * colors.length)]}`)
  }
  return `<i class="${cls}" style="box-shadow:${s.join(',')}"></i>`
}
const STARS = ['rgba(255,255,255,.9)', 'rgba(255,255,255,.6)', 'rgba(255,240,200,.8)', 'rgba(200,220,255,.7)']
const field = (seed: number, flowers: number, tufts = ['rgba(40,120,40,.45)', 'rgba(255,255,255,.35)']) =>
  `<div class="flora">${scatter(seed, 70, 440, 150, 'tuft', tufts, 1.6)}${
    flowers ? scatter(seed + 1, flowers, 440, 150, 'bloom', ['#fff', '#ffd34d', '#ff8ac4', '#fff', '#8fd0ff'], 1.7) : ''
  }</div>`

function clouds(seed: number, n: number): string {
  const r = rng(seed)
  let s = ''
  for (let i = 0; i < n; i++) {
    const w = 26 + Math.floor(r() * 26)
    s += `<i class="cloud" style="top:${4 + Math.floor(r() * 40)}rem;width:${w}rem;height:${Math.round(w * 0.375)}rem;animation-duration:${60 + Math.floor(r() * 60)}s;animation-delay:-${Math.floor(r() * 90)}s;opacity:${(0.75 + r() * 0.25).toFixed(2)}">${CLOUD}</i>`
  }
  return s
}

/** Horizontal bands that get wider toward the viewer: cheap ground perspective. */
function bands(a: string, b: string, n = 9): string {
  const stops: string[] = []
  for (let i = 0; i < n; i++) {
    const p0 = ((i / n) ** 1.8 * 100).toFixed(1)
    const p1 = (((i + 1) / n) ** 1.8 * 100).toFixed(1)
    const c = i % 2 ? a : b
    stops.push(`${c} ${p0}% ${p1}%`)
  }
  return `linear-gradient(${stops.join(',')})`
}

function floorGrid(cls: string): string {
  let l = ''
  for (let x = -150; x <= 250; x += 12.5) l += `<line x1="50" y1="0" x2="${x}" y2="100"/>`
  for (let i = 1; i < 9; i++) {
    const y = ((i / 9) ** 1.9 * 100).toFixed(1)
    l += `<line x1="-50" y1="${y}" x2="150" y2="${y}"/>`
  }
  return `<svg class="${cls}" viewBox="0 0 100 100" preserveAspectRatio="none">${l}</svg>`
}

function backdrop(bg: BattleSetup['bg']): string {
  switch (bg) {
    case 'town':
      return `<div class="sky"></div>${clouds(11, 4)}
        <div class="chart far">${candles(5, 36)}</div>
        <div class="hills h1">${ridge(3, 14, '#9ad7ff', 3)}</div>
        <div class="hills h2">${ridge(4, 10, '#7fcf86', 4, 9)}</div>
        <div class="hills h3">${ridge(7, 6, '#5fb865', 6, 5)}</div>
        <div class="ground" style="background:${bands('#8cd874', '#7ccb66')}"></div>${field(51, 18)}`
    case 'meadow':
      return `<div class="sky"></div><i class="sun"></i><i class="rays"></i>${clouds(21, 3)}
        <div class="chart far">${candles(9, 30)}</div>
        <div class="hills h1">${ridge(12, 12, '#b5ecff', 3)}</div>
        <div class="hills h2">${ridge(13, 9, '#9fe07a', 5, 4)}</div>
        <div class="ground" style="background:${bands('#9ee872', '#8edc62')}"></div>${field(61, 60)}`
    case 'city':
      return `<div class="sky"></div>${scatter(5, 18, 420, 40, 'stars', STARS)}<i class="sun"></i>
        <div class="chart far">${candles(17, 40)}</div>
        <div class="skyline s1">${skyline(31, '#5b2d6e', 18, 56, false)}</div>
        <div class="skyline s2">${skyline(32, '#2a1740', 10, 44, true)}</div>
        <div class="ground"></div>${floorGrid('grid')}`
    case 'canyon':
      return `<div class="sky"></div>${scatter(9, 40, 420, 70, 'stars', STARS)}<i class="moon"></i>
        <div class="chart far">${candles(23, 34)}</div>
        <div class="mesa m1">${mesas(41, '#8a4a5c', '#b2687a')}</div>
        <div class="mesa m2">${mesas(42, '#b4552e', '#e08a4e')}</div>
        <div class="ground" style="background:${bands('#d4874d', '#c47440', 11)}"></div>
        ${field(71, 0, ['rgba(120,50,30,.55)', 'rgba(255,220,170,.4)', 'rgba(90,40,30,.4)'])}<div class="dust"></div>`
    case 'exchange': {
      let mons = ''
      for (let i = 0; i < 8; i++) mons += `<div class="mon" style="--d:${14 + ((i * 7) % 11)}s">${candles(100 + i, 14 + (i % 3) * 4)}</div>`
      const tick =
        'BASE BUILDERS ONLINE · MAINNET SETTLED · SOLANA FULL SPEED · ROBINHOOD CHAIN OPEN ALL HOURS · ORDERS MATCHED · LUNCH PENDING · '
      return `<div class="wall"></div><div class="monitors">${mons}</div>
        <div class="ticker"><span>${tick.repeat(2)}</span><span>${tick.repeat(2)}</span></div>
        <div class="ground"></div>${floorGrid('grid')}<i class="glow"></i>`
    }
    case 'gallery':
      return `<div class="gallery-wall"><i></i><i></i><i></i></div><div class="ground"></div>${floorGrid('grid')}`
    case 'tower':
      return `<div class="void"></div><div class="swirl"></div><div class="rug r1"></div><div class="rug r2"></div>${scatter(77, 36, 420, 200, 'stars', STARS)}
        <div class="chart far">${candles(66, 26)}</div>
        <div class="ground"></div><div class="motes"></div>`
  }
}

// ───────────────────────────── one side of the field ─────────────────────────────

class Side {
  remy!: Remy
  stages: Record<Stage, number> = { atk: 0, def: 0, spd: 0 }
  hpShown = 0
  readonly who: Who
  readonly slot: HTMLElement
  readonly mover: HTMLElement
  readonly card: HTMLElement
  readonly img: HTMLImageElement
  readonly info: HTMLElement
  private readonly bar: HTMLElement
  private readonly cur: HTMLElement | null
  private readonly xp: HTMLElement | null

  constructor(who: Who, parent: HTMLElement, infoParent: HTMLElement) {
    this.who = who
    this.slot = el('div', `bt-slot ${who} gone`)
    this.slot.innerHTML = `<i class="bt-shadow"></i><div class="bt-mover"><div class="bt-bob"><div class="bt-tilt"><div class="bt-card"><img alt="" draggable="false"><i class="holo"></i><i class="flash"></i></div></div>${'<i class="spk"></i>'.repeat(5)}</div></div>`
    parent.appendChild(this.slot)
    this.mover = this.slot.querySelector('.bt-mover') as HTMLElement
    this.card = this.slot.querySelector('.bt-card') as HTMLElement
    this.img = this.slot.querySelector('img') as HTMLImageElement
    this.info = el('div', `bt-info ${who} off`)
    this.info.innerHTML = `<div class="bi-top"><b class="bi-name"></b><span class="bi-lv"></span></div><span class="bi-new" hidden>NEW!</span>
      <div class="bi-mid"><span class="bi-type"></span><span class="bi-hp">HP</span><div class="hpbar"><i></i></div></div>
      ${who === 'me' ? '<div class="bi-nums"><b></b></div><div class="bi-xp"><span>XP</span><div class="xpbar"><i></i></div></div>' : ''}`
    infoParent.appendChild(this.info)
    this.bar = this.info.querySelector('.hpbar i') as HTMLElement
    this.cur = this.info.querySelector('.bi-nums b')
    this.xp = this.info.querySelector('.xpbar i')
  }

  get max() {
    return statsOf(this.remy).hp
  }

  set(r: Remy) {
    this.remy = r
    this.stages = { atk: 0, def: 0, spd: 0 }
    this.reset()
    const t = species(r.idx).type
    this.img.src = artSrc(r.idx)
    const palette = art.get(r.idx).palette
    this.slot.style.setProperty('--art-accent', palette.accent)
    this.slot.parentElement?.style.setProperty('--art-accent', palette.accent)
    this.slot.parentElement?.style.setProperty('--art-bg', palette.bg)
    ;(this.info.querySelector('.bi-new') as HTMLElement).hidden = this.who !== 'foe' || S.seen.includes(r.idx)
    for (const e of [this.slot, this.info]) {
      e.style.setProperty('--tc', TYPE_COLOR[t])
      e.classList.toggle('gold', !!r.gold)
    }
    ;(this.info.querySelector('.bi-name') as HTMLElement).textContent = `REMY #${r.idx}`
    ;(this.info.querySelector('.bi-type') as HTMLElement).innerHTML = `<span class="type" style="background:${TYPE_COLOR[t]}">${t}</span>${
      this.who === 'foe' && S.caught.includes(r.idx) ? `<i class="bi-owned" title="Minted">${itemIcon('wallet')}</i>` : ''
    }`
    this.refreshLevel()
    this.hpShown = r.hp
    this.drawHp(r.hp)
    this.drawXp(xpFrac(r))
  }

  refreshLevel() {
    ;(this.info.querySelector('.bi-lv') as HTMLElement).innerHTML = `<small>Lv</small>${this.remy.level}`
  }

  /** Cancels every lingering motion so the card sits in its rest pose. */
  reset() {
    for (const a of this.mover.getAnimations()) a.cancel()
    for (const a of this.card.getAnimations()) a.cancel()
    this.slot.classList.remove('clip')
    this.card.classList.remove('sil', 'glitch')
    this.card.classList.remove('dematerializing')
    this.img.style.opacity = ''
  }

  drawHp(v: number) {
    const max = this.max
    const f = clamp(v / max, 0, 1)
    // Quantised to 48 steps like the GBA bars.
    this.bar.style.width = `${(Math.ceil(f * 48) / 48) * 100}%`
    this.bar.className = f <= 0.2 ? 'low' : f <= 0.5 ? 'mid' : ''
    if (this.cur) this.cur.textContent = `${Math.ceil(clamp(v, 0, max))}/${max}`
    this.info.classList.toggle('danger', this.who === 'me' && v > 0 && f <= 0.2)
  }

  tweenHp(to: number): Promise<void> {
    const from = this.hpShown
    this.hpShown = to
    if (from === to) return Promise.resolve()
    const max = this.max
    const dur = clamp((Math.abs(to - from) / max) * 1400, 260, 1000)
    return new Promise((res) => {
      const t0 = performance.now()
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / dur)
        this.drawHp(from + (to - from) * k)
        if (k < 1) requestAnimationFrame(step)
        else res()
      }
      requestAnimationFrame(step)
    })
  }

  drawXp(f: number) {
    if (this.xp) this.xp.style.width = `${(Math.floor(f * 64) / 64) * 100}%`
  }

  tweenXp(from: number, to: number): Promise<void> {
    const dur = clamp((to - from) * 1300, 200, 1100)
    return new Promise((res) => {
      const t0 = performance.now()
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / dur)
        this.drawXp(from + (to - from) * k)
        if (k < 1) requestAnimationFrame(step)
        else res()
      }
      requestAnimationFrame(step)
    })
  }

  showInfo(on: boolean) {
    this.info.classList.toggle('off', !on)
  }
}

// ───────────────────────────── the battle ─────────────────────────────

class Battle {
  readonly setup: BattleSetup
  readonly wild: boolean
  readonly cabald: boolean
  readonly foes: Remy[]
  readonly canRun: boolean
  readonly canCatch: boolean
  readonly root: HTMLElement
  readonly field: HTMLElement
  readonly fxl: HTMLElement
  /** Full-field move backdrops (washes, giant charts) between the scenery and the cards. */
  readonly sfx: HTMLElement
  readonly foeSide: HTMLElement
  readonly meSide: HTMLElement
  readonly me: Side
  readonly foe: Side
  readonly trainerEl: HTMLElement | null = null
  readonly pipsFoe: HTMLElement
  readonly pipsMe: HTMLElement
  pi = 0
  fi = 0
  participants = new Set<number>()
  runs = 0
  foeTurns = 0
  menuOpen = false
  lastAct = 0
  lastMove = 0
  g = { me: { x: 0, feet: 0, size: 0 }, foe: { x: 0, feet: 0, size: 0 }, W: 240, H: 168 }
  private popSwallow: () => void = () => {}
  private readonly onLayout = () => this.place()

  constructor(setup: BattleSetup) {
    this.setup = setup
    this.wild = setup.kind === 'wild'
    this.cabald = setup.trainer?.title.startsWith('CABALD') ?? false
    this.foes = setup.foes
    this.canRun = setup.canRun ?? this.wild
    this.canCatch = setup.canCatch ?? this.wild
    this.root = el('div', `bt bg-${setup.bg}${this.cabald ? ' cabald' : ''}`)
    this.root.innerHTML = `<div class="bt-field"><div class="bt-bg">${backdrop(setup.bg)}${this.cabald ? cabaldBackdrop() : ''}</div><div class="bt-art-air"><img alt=""><i></i></div><div class="bt-sfx"></div>
      <div class="bt-side foe"><i class="bt-plat foe"></i></div>
      <div class="bt-side me"><i class="bt-plat me"></i></div>
      <div class="bt-infos"></div><div class="bt-fx"></div></div>
      <div class="bt-curtain"><i></i><i></i></div>`
    this.field = this.root.querySelector('.bt-field') as HTMLElement
    this.fxl = this.root.querySelector('.bt-fx') as HTMLElement
    this.sfx = this.root.querySelector('.bt-sfx') as HTMLElement
    this.foeSide = this.root.querySelector('.bt-side.foe') as HTMLElement
    this.meSide = this.root.querySelector('.bt-side.me') as HTMLElement
    const infos = this.root.querySelector('.bt-infos') as HTMLElement
    this.foe = new Side('foe', this.foeSide, infos)
    this.me = new Side('me', this.meSide, infos)
    this.pipsFoe = el('div', 'bt-pips foe off')
    this.pipsMe = el('div', 'bt-pips me off')
    infos.append(this.pipsFoe, this.pipsMe)
    const t = setup.trainer
    if (!this.wild && t) {
      this.trainerEl = el('div', 'bt-trainer')
      this.trainerEl.innerHTML = `<div class="tr-card"><img src="${artSrc(t.portrait)}" alt="" draggable="false"><i class="holo"></i></div><div class="tr-plate"><small>${t.title}</small><b>${t.name}</b></div>`
      this.foeSide.appendChild(this.trainerEl)
    }
    // Tapping the scene advances text (but never picks menu entries).
    this.root.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      if (!this.menuOpen) tap('a')
    })
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      this.root.addEventListener('pointermove', (e) => {
        const rect = this.root.getBoundingClientRect()
        this.root.style.setProperty('--tilt-x', `${((e.clientY - rect.top) / rect.height - 0.5) * -8}deg`)
        this.root.style.setProperty('--tilt-y', `${((e.clientX - rect.left) / rect.width - 0.5) * 12}deg`)
      })
      this.root.addEventListener('pointerleave', () => {
        this.root.style.setProperty('--tilt-x', '0deg')
        this.root.style.setProperty('--tilt-y', '0deg')
      })
    }
  }

  private atmosphere(r: Remy) {
    const palette = art.get(r.idx).palette
    this.root.style.setProperty('--foe-accent', palette.accent)
    this.root.style.setProperty('--foe-bg', palette.bg)
    ;(this.root.querySelector('.bt-art-air img') as HTMLImageElement).src = artSrc(r.idx)
  }

  private async versus(lead: Remy) {
    const trainer = this.setup.trainer
    if (!trainer) return
    if (this.cabald) {
      await this.cabaldVersus()
      return
    }
    const boss = this.setup.bg === 'tower'
    const splash = el('div', `bt-versus${boss ? ' boss' : ''}`)
    splash.innerHTML = `<div class="bv-lines"></div><div class="bv-kicker">${boss ? 'THE FINAL FLOOR' : 'TRAINER CHALLENGE'}</div>
      <div class="bv-player"><img src="${artSrc(lead.idx)}" alt=""><span></span><small>REMY #${lead.idx}</small></div>
      <div class="bv-rival"><img src="${artSrc(trainer.portrait)}" alt=""><span></span><small></small></div>
      <i class="bv-slash"></i><b class="bv-vs">VS</b><div class="bv-footer">${boss ? 'ONLY THE BASED MAKE IT TO THE TOP' : 'ART MEETS ATTITUDE'}</div>`
    ;(splash.querySelector('.bv-player span') as HTMLElement).textContent = S.name
    ;(splash.querySelector('.bv-rival span') as HTMLElement).textContent = trainer.name
    ;(splash.querySelector('.bv-rival small') as HTMLElement).textContent = trainer.title
    splash.style.setProperty('--me-accent', art.get(lead.idx).palette.accent)
    this.root.appendChild(splash)
    audio.sfx('throw')
    await sleep(boss ? 1800 : 1350)
    await anim(splash, [{ opacity: 1 }, { opacity: 0, transform: 'scale(1.06)' }], 220)
    splash.remove()
  }

  /** Cabald titles opt into presentation only; backdrop, battle rules and rewards stay untouched. */
  private async cabaldVersus() {
    const trainer = this.setup.trainer
    if (!trainer) return
    const boss = trainer.title.startsWith('CABALD BOSS')
    const splash = el('div', `bt-versus bc-versus${boss ? ' bc-boss' : ''}`)
    splash.innerHTML = `<div class="bc-stripes"></div>
      ${boss ? '<svg class="bc-crack" viewBox="0 0 320 240" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0l100 62-12 28 65 25-15 43 41 23-9 59M320 0l-60 71-34-8-73 52 71 17 12 41 84 39M0 177l71-18 38 10 44-54"/></svg><div class="bc-scanlines"></div>' : ''}
      <div class="bc-kicker">${boss ? 'THE FINAL DENIAL' : 'AN UNOFFICIAL VISIT'}</div>
      <div class="bc-lineup"><div class="bc-insignia">${CABALD_SEAL}<small>THE CABALD</small></div>
      <div class="bc-portrait"><img src="${artSrc(trainer.portrait)}" alt="" draggable="false"><small></small><b></b></div></div>
      <div class="bc-denial"><strong>THERE IS NO CABALD</strong><span>I love you.</span></div>
      <div class="bc-footer">${boss ? 'YOUR LIQUIDITY IS IN LOVING HANDS' : 'PLEASE DISREGARD THE UNIFORM'}</div>`
    ;(splash.querySelector('.bc-portrait small') as HTMLElement).textContent = trainer.title
    ;(splash.querySelector('.bc-portrait b') as HTMLElement).textContent = trainer.name
    this.root.appendChild(splash)
    audio.sfx('throw')
    await sleep(boss ? 2700 : 2250)
    await anim(splash, [{ opacity: 1 }, { opacity: 0, transform: 'scale(1.04)' }], 240)
    splash.remove()
  }

  private async cabaldDenialBreaks() {
    const overlay = el('div', 'bc-defeat')
    overlay.innerHTML = `<div class="bc-broken-seal"><i>${CABALD_SEAL}</i><i>${CABALD_SEAL}</i><i>${CABALD_SEAL}</i></div>
      <strong>There is no Cabald.</strong><span>I love you.</span>`
    this.field.appendChild(overlay)
    this.root.classList.add('cabald-broken')
    await sleep(1150)
    await anim(overlay, [{ opacity: 1 }, { opacity: 0 }], 250)
    overlay.remove()
  }

  /** A battle keepsake, not an on-chain transaction. Catch rules and storage remain unchanged. */
  private async certificate(r: Remy) {
    closeText()
    const feature = art.get(r.idx)
    const epithet = 'epithet' in feature && typeof feature.epithet === 'string' ? feature.epithet : ''
    const places: Record<string, string> = {
      genesis: 'GENESIS TOWN', meadow: 'MEMPOOL MEADOW', city: 'LIQUIDITY CITY',
      canyon: 'RUG PULL CANYON', gallery: 'THE FLOOR',
    }
    const overlay = el('div', `bt-mint${r.gold ? ' gold' : ''}`)
    overlay.style.setProperty('--mint-accent', feature.palette.accent)
    overlay.innerHTML = `<div class="bm-heading">MINT CERTIFICATE<small>BASED REMY BOYS · QUEST COLLECTION</small></div>
      <div class="bm-card"><div class="bm-edition"><span>${r.gold ? 'GOLD EDITION' : 'ORIGINAL ART'}</span><b>#${String(S.caught.length).padStart(4, '0')}</b></div>
      <div class="bm-art"><img src="${artSrc(r.idx)}" alt="Remy #${r.idx}"><i></i></div>
      <div class="bm-details"><h2>REMY #${r.idx}</h2><div class="bm-epithet"></div>
      <div class="bm-traits"><span class="type" style="background:${TYPE_COLOR[species(r.idx).type]}">${species(r.idx).type}</span><b>Lv ${r.level}</b>
      <span class="bm-swatches">${[feature.palette.bg, feature.palette.skin, feature.palette.hair, feature.palette.shirt, feature.palette.accent].map((c) => `<i style="background:${c}"></i>`).join('')}</span></div>
      <div class="bm-place"></div></div><div class="bm-stamp">MINTED<span>IN THE QUEST</span></div></div>
      <div class="bm-continue">TAP / A TO COLLECT</div>`
    ;(overlay.querySelector('.bm-epithet') as HTMLElement).textContent = epithet
    ;(overlay.querySelector('.bm-place') as HTMLElement).textContent =
      `Minted at ${places[S.map] ?? S.map.replace(/_/g, ' ').toUpperCase()}`
    this.root.appendChild(overlay)
    await sleep(900)
    audio.sfx('select')
    await new Promise<void>((resolve) => {
      const done = () => {
        pop()
        overlay.removeEventListener('pointerdown', touch)
        resolve()
      }
      const touch = (e: PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        done()
      }
      const pop = input.push((b) => { if (b === 'a') done() })
      overlay.addEventListener('pointerdown', touch)
    })
    await anim(overlay, [{ opacity: 1 }, { opacity: 0 }], 180)
    overlay.remove()
  }

  // ─── lifecycle ───

  async run(): Promise<BattleResult> {
    uiRoot.appendChild(this.root)
    this.place()
    view.listeners.push(this.onLayout)
    this.popSwallow = input.push(() => {})
    audio.play(this.setup.music ?? (this.wild ? 'battle' : 'trainer'))
    await Promise.race([Promise.all([preload(this.foes[0].idx), ...S.party.map((r) => preload(r.idx))]), sleep(1600)])
    if (this.trainerEl) await preload(this.setup.trainer?.portrait ?? 0)
    // Clear whatever the world's transition left on the fader; our curtain is black too.
    await fade(false, 0)
    let result: BattleResult = 'lose'
    try {
      result = await this.main()
    } finally {
      await fade(true, 360)
      this.popSwallow()
      const i = view.listeners.indexOf(this.onLayout)
      if (i >= 0) view.listeners.splice(i, 1)
      for (const e of uiRoot.querySelectorAll('.bt-cmd, .bt-moves, .bt-lvl')) e.remove()
      this.root.remove()
      uiRoot.style.removeProperty('--bt-panel')
      closeText()
    }
    return result
  }

  private async main(): Promise<BattleResult> {
    const lead = S.party.findIndex((r) => r.hp > 0)
    if (lead < 0) return 'lose'
    await this.intro(lead)
    for (;;) {
      const act = await this.command()
      if (act.kind === 'end') return act.result
      await this.turn(act)
      const res = await this.resolve()
      if (res) return res
    }
  }

  /** Computes the field geometry from the logical screen size and publishes it as CSS vars. */
  place() {
    const W = view.W
    const H = view.H
    // Reserve the touch menu's full height in the field, not over the cards.
    const touch = document.documentElement.classList.contains('touch')
    const target = window.innerHeight >= window.innerWidth ? 34 : 28
    const unit = view.scale / (window.devicePixelRatio || 1)
    const panel = touch ? Math.max(46, Math.ceil((target * 2) / unit + 14)) : 46
    uiRoot.style.setProperty('--bt-panel', `${panel}rem`)
    const field = H - panel - 6
    const tall = H > W * 0.8
    const fs = Math.round(Math.min(W * (tall ? 0.3 : 0.21), field * 0.42))
    const ps = Math.round(Math.min(W * (tall ? 0.4 : 0.28), field * 0.54))
    const fx = Math.round(W - Math.max(fs * 0.5 + 16, W * 0.27))
    const fb = Math.round(tall ? Math.max(fs + 36, field * 0.44) : fs + 14)
    const px = Math.round(Math.max(ps * 0.5 + 12, W * 0.25))
    const pb = field - 6
    this.g = { me: { x: px, feet: pb, size: ps }, foe: { x: fx, feet: fb, size: fs }, W, H }
    const v: Record<string, number> = {
      fx,
      fb,
      fs,
      px,
      pb,
      ps,
      ts: Math.round(fs * 1.22),
      hz: Math.round(fb - fs * 0.16),
      iw: Math.round(Math.min(W * 0.47, 142)),
      sw: W,
      sh: H,
    }
    for (const k in v) this.root.style.setProperty(`--${k}`, `${v[k]}rem`)
    this.root.classList.toggle('tall', tall)
  }

  geo(s: Side): Geo {
    return s.who === 'me' ? this.g.me : this.g.foe
  }

  label(s: Side) {
    return s.who === 'me' ? remyName(s.remy) : `${this.wild ? 'Wild' : 'Foe'} ${remyName(s.remy)}`
  }

  speed(s: Side) {
    return statsOf(s.remy).spd * stageMult(s.stages.spd)
  }

  // ─── intro / send-outs ───

  private async slideIn() {
    const W = this.g.W
    const ease = 'cubic-bezier(.22,.8,.3,1)'
    const cur = this.root.querySelectorAll('.bt-curtain i')
    void anim(cur[0], [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: 520, easing: 'cubic-bezier(.6,0,.4,1)' })
    void anim(cur[1], [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: 520, easing: 'cubic-bezier(.6,0,.4,1)' })
    await Promise.all([
      anim(this.foeSide, [{ transform: `translateX(${W}rem)` }, { transform: 'translateX(0)' }], { duration: 950, easing: ease }),
      anim(this.meSide, [{ transform: `translateX(${-W}rem)` }, { transform: 'translateX(0)' }], { duration: 950, easing: ease }),
    ])
  }

  private async intro(lead: number) {
    const first = this.foes[0]
    this.foe.set(first)
    markSeen(first.idx)
    this.atmosphere(first)
    if (this.wild) {
      this.foe.slot.classList.remove('gone')
      this.foe.img.style.opacity = '0'
      await this.slideIn()
      audio.cry(first.idx)
      await pixelPortrait(this.foe)
      if (first.gold) void this.goldBurst(this.foe)
      this.foe.showInfo(true)
      await tell(first.gold ? `Whoa! A wild *GOLDEN REMY #${first.idx}* appeared!` : `A wild *${remyName(first)}* appeared!`)
    } else {
      const t = this.setup.trainer
      const name = t?.name ?? 'TRAINER'
      this.drawPips()
      await this.versus(S.party[lead])
      await this.slideIn()
      this.pipsFoe.classList.remove('off')
      this.pipsMe.classList.remove('off')
      await sleep(300)
      if (t?.intro) await say(t.intro, { speaker: name })
      await tell(`*${name}* challenges you!`)
      this.pipsFoe.classList.add('off')
      this.pipsMe.classList.add('off')
      if (this.trainerEl)
        void anim(this.trainerEl, [{ transform: 'translateX(0)' }, { transform: `translateX(${this.g.W - this.g.foe.x + 60}rem)` }], {
          duration: 480,
          easing: 'cubic-bezier(.5,0,.8,.4)',
        })
      await this.foeOut(first)
    }
    this.pi = lead
    this.participants = new Set([lead])
    await this.goOut(lead)
  }

  private drawPips() {
    const row = (list: Remy[]) =>
      Array.from({ length: 6 }, (_, i) => {
        const r = list[i]
        return `<i class="${!r ? 'pip-none' : r.hp > 0 ? 'pip-ok' : 'pip-ko'}"></i>`
      }).join('')
    this.pipsFoe.innerHTML = row(this.foes)
    this.pipsMe.innerHTML = row(S.party)
  }

  private async foeOut(r: Remy) {
    if (this.foe.remy !== r) this.foe.set(r)
    markSeen(r.idx)
    this.atmosphere(r)
    this.foeTurns = 0
    void show(`${this.setup.trainer?.name ?? 'The trainer'} sent out *${remyName(r)}*!`)
    await this.sendOut(this.foe)
    if (r.gold) void this.goldBurst(this.foe)
    this.foe.showInfo(true)
    await sleep(650)
  }

  private async goOut(i: number) {
    this.pi = i
    const r = S.party[i]
    this.me.set(r)
    this.root.style.setProperty('--me-accent', art.get(r.idx).palette.accent)
    this.participants.add(i)
    void show(`Go! *${remyName(r)}*!`)
    await this.sendOut(this.me)
    if (r.gold) void this.goldBurst(this.me)
    this.me.showInfo(true)
    await sleep(550)
  }

  /** A cold wallet is tossed in, pops open in a burst of light and the Remy card grows out of it. */
  private async sendOut(s: Side) {
    const { x, feet, size } = this.geo(s)
    s.reset()
    s.slot.classList.add('gone')
    s.card.classList.add('sil')
    const mine = s.who === 'me'
    const sx = mine ? -10 : this.g.W + 10
    const sy = mine ? feet - size * 0.9 : feet - size * 1.1
    const tx = x
    const ty = feet - size * 0.35
    const w = this.spawn('fx-wallet', sx, sy, 16, 16, itemIcon('wallet'))
    audio.sfx('throw')
    const kf: Keyframe[] = []
    for (let k = 0; k <= 10; k++) {
      const t = k / 10
      kf.push({ transform: `translate(${(tx - sx) * t}rem, ${(ty - sy) * t - Math.sin(Math.PI * t) * size * 0.5}rem) rotate(${t * 720}deg)` })
    }
    await anim(w, kf, { duration: 480, easing: 'linear' })
    w.remove()
    this.openBurst(tx, ty, size)
    s.slot.classList.remove('gone')
    const grow = anim(
      s.mover,
      [
        { transform: 'scale(0.05)', opacity: 0.4 },
        { transform: 'scale(1.12)', opacity: 1, offset: 0.65 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 340, easing: 'cubic-bezier(.2,.9,.3,1.1)' },
    )
    s.card.classList.remove('sil')
    s.img.style.opacity = '0'
    audio.cry(s.remy.idx)
    await Promise.all([grow, pixelPortrait(s)])
  }

  private async recall(s: Side) {
    const { x, feet, size } = this.geo(s)
    s.card.classList.add('sil')
    void this.burst('fx-beam red', x, feet - size * 0.5, size * 0.7, size * 1.1, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], 420)
    audio.sfx('back')
    await anim(
      s.mover,
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.05)', opacity: 0 },
      ],
      { duration: 320, easing: 'cubic-bezier(.6,0,.9,.5)' },
    )
    s.slot.classList.add('gone')
    s.showInfo(false)
  }

  // ─── menus ───

  private async command(): Promise<Action> {
    for (;;) {
      const c = await this.actionMenu()
      if (c === 0) {
        if (!this.me.remy.moves.some((m) => m.pp > 0)) return { kind: 'move', slot: -1 }
        const s = await this.moveMenu()
        if (s !== null) return { kind: 'move', slot: s }
      } else if (c === 1) {
        const a = await this.bag()
        if (a) return a
      } else if (c === 2) {
        const i = await partyScreen({ mode: 'switch', active: this.pi })
        if (i >= 0 && i !== this.pi) {
          await show(`${remyName(this.me.remy)}, come back!`)
          await this.recall(this.me)
          await this.goOut(i)
          return { kind: 'used' }
        }
      } else {
        const a = await this.tryRun()
        if (a) return a
      }
    }
  }

  private actionMenu(): Promise<number> {
    this.menuOpen = true
    const box = el('div', 'bt-cmd')
    box.innerHTML = `<div class="bc-prompt">What will<br><em>${remyName(this.me.remy)}</em> do?</div><div class="bc-acts">${ACTIONS.map(
      (l, i) => `<div class="bc-act a${i}"><span class="menu-cursor"></span><i></i>${l}</div>`,
    ).join('')}</div>`
    uiRoot.appendChild(box)
    const items = [...box.querySelectorAll<HTMLElement>('.bc-act')]
    let sel = this.lastAct
    const draw = () => items.forEach((it, i) => it.classList.toggle('sel', i === sel))
    draw()
    return new Promise((resolve) => {
      const done = (i: number) => {
        pop()
        box.remove()
        this.menuOpen = false
        this.lastAct = i
        audio.sfx('select')
        resolve(i)
      }
      items.forEach((it, i) =>
        it.addEventListener('pointerdown', (e) => {
          e.preventDefault()
          e.stopPropagation()
          sel = i
          draw()
          done(i)
        }),
      )
      box.addEventListener('pointerdown', (e) => e.preventDefault())
      const pop = input.push((b) => {
        if (b === 'a') return done(sel)
        if (b === 'b') {
          if (sel !== 3) audio.sfx('cursor')
          sel = 3
          return draw()
        }
        const n = gridNav(sel, b, 4)
        if (n !== sel) {
          sel = n
          audio.sfx('cursor')
          draw()
        }
      })
    })
  }

  private moveMenu(): Promise<number | null> {
    this.menuOpen = true
    const r = this.me.remy
    const foeType = species(this.foe.remy.idx).type
    const box = el('div', 'bt-moves')
    const grid = el('div', 'bm-grid')
    const side = el('div', 'bm-side')
    const back = el('div', 'bm-back', 'B · BACK')
    const items = [0, 1, 2, 3].map((i) => {
      const m = r.moves[i]
      const b = el('div', `bm-move${m ? '' : ' empty'}${m && m.pp <= 0 ? ' dry' : ''}`)
      if (m) {
        const mv = MOVES[m.id]
        b.style.setProperty('--tc', TYPE_COLOR[mv.type])
        b.innerHTML = `<span class="menu-cursor"></span><span class="bm-name${mv.name.length > 11 ? ' long' : ''}">${mv.name}</span>`
      } else b.innerHTML = '<span class="bm-name">—</span>'
      grid.appendChild(b)
      return b
    })
    box.append(grid, side, back)
    uiRoot.appendChild(box)
    let sel = Math.min(this.lastMove, r.moves.length - 1)
    const draw = () => {
      items.forEach((b, i) => b.classList.toggle('sel', i === sel))
      const m = r.moves[sel]
      const mv = MOVES[m.id]
      const e = effectiveness(mv.type, foeType)
      const hint =
        mv.power === 0
          ? '<span>STATUS</span>'
          : e > 1
            ? '<span class="good">SUPER EFF!</span>'
            : e < 1
              ? `<span class="weak">NOT VERY EFF.</span>`
              : `<span>ACC ${mv.acc}</span>`
      side.innerHTML = `<div class="bm-pp ${m.pp <= 0 ? 'out' : m.pp <= mv.pp / 4 ? 'low' : ''}"><small>PP</small><b>${m.pp}/${mv.pp}</b></div>
        <div class="bm-type"><span class="type" style="background:${TYPE_COLOR[mv.type]}">${mv.type}</span><small>${mv.power ? `PWR ${mv.power}` : ''}</small></div>
        <div class="bm-hint">${hint}</div>`
    }
    draw()
    return new Promise((resolve) => {
      const done = (v: number | null) => {
        pop()
        box.remove()
        this.menuOpen = false
        resolve(v)
      }
      const choose = () => {
        if (r.moves[sel].pp <= 0) {
          audio.sfx('error')
          side.classList.remove('nope')
          void side.offsetWidth
          side.classList.add('nope')
          return
        }
        audio.sfx('select')
        this.lastMove = sel
        done(sel)
      }
      const cancel = () => {
        audio.sfx('back')
        done(null)
      }
      items.forEach((b, i) =>
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!r.moves[i]) return
          if (sel !== i) {
            sel = i
            draw()
          }
          choose()
        }),
      )
      back.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        cancel()
      })
      box.addEventListener('pointerdown', (e) => e.preventDefault())
      const pop = input.push((b) => {
        if (b === 'a') return choose()
        if (b === 'b') return cancel()
        const n = gridNav(sel, b, r.moves.length)
        if (n !== sel) {
          sel = n
          audio.sfx('cursor')
          draw()
        }
      })
    })
  }

  private async bag(): Promise<Action | null> {
    const id = await bagScreen('battle')
    if (!id) return null
    const item = ITEMS[id]
    if (item.kind === 'ball') {
      if (!this.wild) {
        const name = this.setup.trainer?.name ?? 'The trainer'
        await this.deflect(id)
        await tell(`${name} blocked the ${item.name}!`)
        await say('Not your keys, not your Remy!', { speaker: name })
        return null
      }
      if (!this.canCatch) {
        await this.deflect(id)
        await tell(`${remyName(this.foe.remy)} dodged the ${item.name}!\nThis Remy can\u2019t be minted.`)
        return null
      }
      return this.throwWallet(id)
    }
    const i = await partyScreen({ mode: 'item', item: id })
    if (i < 0) return null
    const r = S.party[i]
    const line = useItemOn(id, r)
    if (!line) {
      await tell('It won\u2019t have any effect.')
      return null
    }
    takeItem(id)
    void show(`${S.name} used *${item.name}*!`)
    audio.sfx('heal')
    if (i === this.pi) {
      void this.fxHeal(this.me)
      await sleep(250)
      await this.me.tweenHp(r.hp)
    } else await sleep(400)
    await tell(line)
    return { kind: 'used' }
  }

  private async tryRun(): Promise<Action | null> {
    if (!this.wild) {
      await tell('No running from a trainer battle!')
      return null
    }
    if (!this.canRun) {
      await tell('There\u2019s no escaping this one!')
      return null
    }
    const ok = this.speed(this.me) >= this.speed(this.foe) || rand() < 0.5 + 0.15 * this.runs
    this.runs++
    if (ok) {
      audio.sfx('escape')
      void anim(this.me.mover, [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-this.g.W * 0.6}rem)`, opacity: 0 }], {
        duration: 420,
        easing: 'cubic-bezier(.6,0,.9,.5)',
      })
      this.me.showInfo(false)
      await tell('Got away safely!')
      return { kind: 'end', result: 'run' }
    }
    await note('Can\u2019t escape!', 850)
    return { kind: 'used' }
  }

  // ─── turn engine ───

  private foeChoice(): number {
    const r = this.foe.remy
    const usable = r.moves.map((m, i) => ({ m, i, mv: MOVES[m.id] })).filter((x) => x.m.pp > 0)
    if (!usable.length) return -1
    if (this.wild) return pick(usable).i
    const hodl = usable.find((x) => x.m.id === 'hodl')
    if (hodl && r.hp < this.foe.max * 0.35 && rand() < 0.8) return hodl.i
    const status = usable.filter((x) => {
      const e = x.mv.effect
      if (x.mv.power > 0 || e?.kind !== 'stat' || !isStage(e.stat)) return false
      return e.who === 'self' ? this.foe.stages[e.stat] < STAGE_CAP : this.me.stages[e.stat] > -STAGE_CAP
    })
    if (status.length && this.foeTurns < 2 && rand() < 0.35) return pick(status).i
    const myType = species(r.idx).type
    const theirType = species(this.me.remy.idx).type
    const scored = usable
      .filter((x) => x.mv.power > 0)
      .map((x) => ({
        i: x.i,
        s: x.mv.power * (x.mv.type === myType ? 1.5 : 1) * effectiveness(x.mv.type, theirType) * (x.mv.acc / 100),
      }))
      .sort((a, b) => b.s - a.s)
    if (!scored.length) return pick(usable).i
    if (rand() < 0.7) return scored[0].i
    const total = scored.reduce((a, b) => a + b.s, 0)
    let roll = rand() * total
    for (const x of scored) {
      roll -= x.s
      if (roll <= 0) return x.i
    }
    return scored[0].i
  }

  private moveOf(s: Side, slot: number): Move {
    return slot < 0 ? PANIC : MOVES[s.remy.moves[slot].id]
  }

  private async turn(act: Action) {
    const fslot = this.foeChoice()
    const queue: [Side, Side, number][] = []
    if (act.kind === 'move') {
      const pp = this.moveOf(this.me, act.slot).priority ?? 0
      const fp = this.moveOf(this.foe, fslot).priority ?? 0
      const ms = this.speed(this.me)
      const fs = this.speed(this.foe)
      const meFirst = pp !== fp ? pp > fp : ms !== fs ? ms > fs : rand() < 0.5
      const mine: [Side, Side, number] = [this.me, this.foe, act.slot]
      const theirs: [Side, Side, number] = [this.foe, this.me, fslot]
      queue.push(...(meFirst ? [mine, theirs] : [theirs, mine]))
    } else queue.push([this.foe, this.me, fslot])
    for (const [a, d, slot] of queue) {
      await this.useMove(a, d, slot)
      if (a === this.foe) this.foeTurns++
      if (this.me.remy.hp <= 0 || this.foe.remy.hp <= 0) break
    }
  }

  /** After a turn: faints, XP, replacements, victory/defeat. Returns a result when the battle is over. */
  private async resolve(): Promise<BattleResult | null> {
    const foeDown = this.foe.remy.hp <= 0
    const meDown = this.me.remy.hp <= 0
    const last = foeDown && this.fi >= this.foes.length - 1
    if (foeDown) {
      await this.faint(this.foe)
      if (last && this.cabald) await this.cabaldDenialBreaks()
      if (last) audio.play('victory')
      await tell(`${this.label(this.foe)} fainted!`)
    }
    if (meDown) {
      await this.faint(this.me)
      await tell(`${remyName(this.me.remy)} fainted!`)
    }
    if (foeDown) await this.awardXp(this.foe.remy)
    if (!partyAlive()) {
      await tell('Your whole party has fainted!\nYou blacked out!')
      return 'lose'
    }
    if (meDown) {
      const i = await partyScreen({ mode: 'forced', active: this.pi })
      await this.goOut(i)
    }
    if (foeDown) {
      if (last) {
        if (!this.wild) await this.trainerDefeated()
        return 'win'
      }
      this.fi++
      this.participants = new Set([this.pi])
      await this.foeOut(this.foes[this.fi])
    }
    return null
  }

  private damage(att: Side, def: Side, mv: Move, eff: number, crit: boolean): number {
    const L = att.remy.level
    const A = statsOf(att.remy).atk * stageMult(att.stages.atk)
    const D = statsOf(def.remy).def * stageMult(def.stages.def)
    const base = Math.floor((((2 * L) / 5 + 2) * mv.power * A) / D / 40 + 2)
    const stab = mv.type === species(att.remy.idx).type ? 1.5 : 1
    return Math.max(1, Math.floor(base * stab * eff * (crit ? 1.5 : 1) * (0.85 + rand() * 0.15)))
  }

  private async useMove(att: Side, def: Side, slot: number) {
    const r = att.remy
    const id: MoveId | 'panic' = slot < 0 ? 'panic' : r.moves[slot].id
    const mv = this.moveOf(att, slot)
    if (slot >= 0) r.moves[slot].pp = Math.max(0, r.moves[slot].pp - 1)
    else await note(`${this.label(att)} is out of PP!`)
    await show(`${this.label(att)} used *${mv.name}*!`)
    await sleep(200)
    const eff = mv.effect
    const selfMove = mv.power === 0 && (eff?.kind === 'heal' || (eff?.kind === 'stat' && eff.who === 'self'))
    if (!selfMove && rand() * 100 >= mv.acc) {
      void this.lunge(att)
      await sleep(180)
      await this.dodge(def)
      await note(`${this.label(att)}\u2019s attack missed!`, 900)
      return
    }
    if (mv.power === 0) {
      if (eff?.kind === 'stat') {
        const tgt = eff.who === 'self' ? att : def
        if (eff.who === 'self') void this.hop(att)
        else void this.lunge(att, 0.5)
        await sleep(160)
        await this.statChange(tgt, eff.stat, eff.stages, id)
      } else if (eff?.kind === 'heal') {
        void this.hop(att)
        if (r.hp >= att.max) {
          await note('But its HP is already full!', 900)
          return
        }
        audio.sfx('heal')
        await this.fxHeal(att)
        r.hp = Math.min(att.max, r.hp + Math.max(1, Math.floor(att.max * eff.frac)))
        await att.tweenHp(r.hp)
        await note(`${this.label(att)} regained HP!`, 900)
      } else await note('But nothing happened!')
      return
    }
    const typeEff = effectiveness(mv.type, species(def.remy.idx).type)
    const crit = rand() < (mv.highCrit ? 1 / 4 : 1 / 16)
    const dmg = this.damage(att, def, mv, typeEff, crit)
    void this.lunge(att)
    await sleep(170)
    await this.fxFor(id, mv, att, def)
    const dealt = Math.min(dmg, def.remy.hp)
    def.remy.hp -= dealt
    this.hitReact(def, typeEff, crit, dealt, TYPE_COLOR[mv.type])
    await def.tweenHp(def.remy.hp)
    await sleep(120)
    if (crit) await note('A critical hit!')
    if (typeEff > 1) await note('It\u2019s super effective!')
    else if (typeEff < 1) await note('It\u2019s not very effective\u2026')
    if (eff?.kind === 'recoil' && r.hp > 0) {
      r.hp = Math.max(0, r.hp - Math.max(1, Math.floor(dealt * eff.frac)))
      audio.sfx('hitWeak')
      void this.blink(att)
      await att.tweenHp(r.hp)
      await note(`${this.label(att)} ${id === 'leverage' ? 'took recoil. Margin call!' : 'took recoil damage!'}`, 900)
    } else if (eff?.kind === 'drain' && r.hp > 0 && r.hp < att.max) {
      const gain = Math.min(att.max - r.hp, Math.max(1, Math.floor(dealt * eff.frac)))
      await this.fxDrain(def, att)
      audio.sfx('heal')
      r.hp += gain
      await att.tweenHp(r.hp)
      await note(`${this.label(def)} had its yield farmed!`, 900)
    } else if (eff?.kind === 'stat' && (eff.who === 'self' ? r.hp > 0 : def.remy.hp > 0)) {
      await this.statChange(eff.who === 'self' ? att : def, eff.stat, eff.stages, id)
    }
  }

  private async statChange(t: Side, stat: StatKey, n: number, id: MoveId | 'panic') {
    if (!isStage(stat)) return
    const cur = t.stages[stat]
    const who = this.label(t)
    if (n > 0 && cur >= STAGE_CAP) return void (await note(`${who}\u2019s ${STAT_NAME[stat]} won\u2019t go any higher!`, 950))
    if (n < 0 && cur <= -STAGE_CAP) return void (await note(`${who}\u2019s ${STAT_NAME[stat]} won\u2019t go any lower!`, 950))
    t.stages[stat] = clamp(cur + n, -STAGE_CAP, STAGE_CAP)
    audio.sfx(n > 0 ? 'statUp' : 'statDown')
    await this.fxStat(t, n > 0, id)
    const verb = n > 1 ? 'sharply rose' : n > 0 ? 'rose' : n < -1 ? 'harshly fell' : 'fell'
    await note(`${who}\u2019s ${STAT_NAME[stat]} ${verb}!`, 900)
  }

  // ─── faint / XP / levels ───

  private async faint(s: Side) {
    audio.cry(s.remy.idx, 0.7)
    await pixelPortrait(s, true)
    audio.sfx('faint')
    s.slot.classList.add('gone')
    s.showInfo(false)
  }

  private async awardXp(foe: Remy) {
    const base = expGain(foe, !this.wild)
    const bench: [number, number][] = []
    const active = S.party[this.pi]
    if (active.hp > 0) await this.gainActive(active, this.participants.has(this.pi) ? base : Math.floor(base / 2))
    S.party.forEach((r, i) => {
      if (i === this.pi || r.hp <= 0) return
      const amt = this.participants.has(i) ? base : Math.floor(base / 2)
      if (amt > 0) bench.push([i, amt])
    })
    if (!bench.length) return
    await note(`Team XP:\n${bench.map(([i, a]) => `REMY #${S.party[i].idx}: +${a} XP`).join('\n')}`, 1200)
    for (const [i, amt] of bench) {
      const r = S.party[i]
      r.xp += amt
      while (r.level < MAX_LEVEL && r.xp >= xpForLevel(r.level + 1)) await this.levelUp(r, false)
    }
  }

  private async gainActive(r: Remy, amt: number) {
    if (amt <= 0) return
    void show(`${remyName(r)} gained *${amt} XP*!`)
    await sleep(250)
    let left = amt
    while (left > 0) {
      if (r.level >= MAX_LEVEL) {
        r.xp += left
        break
      }
      const step = Math.min(left, xpForLevel(r.level + 1) - r.xp)
      const from = xpFrac(r)
      r.xp += step
      left -= step
      const up = r.xp >= xpForLevel(r.level + 1)
      await this.me.tweenXp(from, up ? 1 : xpFrac(r))
      if (up) {
        await this.levelUp(r, true)
        this.me.drawXp(0)
      }
    }
    await sleep(500)
  }

  private async levelUp(r: Remy, active: boolean) {
    const before = statsOf(r)
    r.level++
    const after = statsOf(r)
    if (r.hp > 0) r.hp = Math.min(after.hp, r.hp + after.hp - before.hp)
    const name = remyName(r)
    void audio.jingle('levelup')
    if (active) {
      this.me.refreshLevel()
      this.me.hpShown = r.hp
      this.me.drawHp(r.hp)
      void this.fxLevel(this.me)
      await show(`${name} grew to *Lv. ${r.level}*!`)
      await this.statPanel(before, after)
    } else await tell(`${name} grew to *Lv. ${r.level}*!`)
    for (const id of movesAt(r.idx, r.level)) await this.learn(r, id)
  }

  private async statPanel(before: Stats, after: Stats) {
    const p = el('div', 'bt-lvl')
    const rows: [string, StatKey][] = [
      ['MAX HP', 'hp'],
      ['ATTACK', 'atk'],
      ['DEFENSE', 'def'],
      ['SPEED', 'spd'],
    ]
    p.innerHTML = rows
      .map(([l, k], i) => `<div class="bl-row" style="animation-delay:${i * 70}ms"><span>${l}</span><b>${after[k]}</b><em>+${after[k] - before[k]}</em></div>`)
      .join('')
    uiRoot.appendChild(p)
    await sleep(300)
    await this.waitA()
    p.remove()
  }

  private async learn(r: Remy, id: MoveId) {
    if (r.moves.some((m) => m.id === id)) return
    const k = forgetIndex(r, id)
    if (k === -2) return
    const mv = MOVES[id]
    void audio.jingle('item')
    if (k === -1) {
      r.moves.push({ id, pp: mv.pp })
      await tell(`${remyName(r)} learned *${mv.name}*!`)
      return
    }
    const old = MOVES[r.moves[k].id].name
    r.moves[k] = { id, pp: mv.pp }
    await tell(`${remyName(r)} forgot *${old}*.\nIt learned *${mv.name}*!`)
  }

  private waitA(): Promise<void> {
    this.menuOpen = true
    return new Promise((res) => {
      const done = () => {
        pop()
        uiRoot.removeEventListener('pointerdown', onTap, true)
        this.menuOpen = false
        audio.sfx('cursor')
        res()
      }
      const onTap = (e: Event) => {
        e.preventDefault()
        done()
      }
      const pop = input.push((b) => {
        if (b === 'a' || b === 'b') done()
      })
      uiRoot.addEventListener('pointerdown', onTap, true)
    })
  }

  private async trainerDefeated() {
    const t = this.setup.trainer
    if (!t) return
    if (this.trainerEl) {
      for (const a of this.trainerEl.getAnimations()) a.cancel()
      await anim(this.trainerEl, [{ transform: `translateX(${this.g.W - this.g.foe.x + 60}rem)` }, { transform: 'translateX(0)' }], {
        duration: 620,
        easing: 'cubic-bezier(.2,.8,.3,1)',
      })
    }
    await say(t.lose, { speaker: t.name })
    if (t.prize > 0) {
      S.money += t.prize
      audio.sfx('money')
      void this.coinShower()
      await tell(`You won *${t.prize.toLocaleString()} $REMY*!`)
    }
  }

  // ─── catching ───

  private async deflect(id: ItemId) {
    const f = this.g.foe
    const sx = 8
    const sy = this.g.me.feet - this.g.me.size * 0.7
    const w = this.spawn('fx-wallet', sx, sy, 16, 16, itemIcon(id))
    audio.sfx('throw')
    const tx = f.x - f.size * 0.2
    const ty = f.feet - f.size * 0.6
    const kf: Keyframe[] = []
    for (let k = 0; k <= 8; k++) {
      const t = k / 8
      kf.push({ transform: `translate(${(tx - sx) * t}rem, ${(ty - sy) * t - Math.sin(Math.PI * t) * 30}rem) rotate(${t * 540}deg)` })
    }
    await anim(w, kf, { duration: 420, easing: 'linear' })
    audio.sfx('bump')
    this.impact(tx, ty, '#ffffff', false)
    await anim(
      w,
      [
        { transform: `translate(${tx - sx}rem, ${ty - sy}rem) rotate(540deg)`, opacity: 1 },
        { transform: `translate(${tx - sx - 40}rem, ${ty - sy - 70}rem) rotate(900deg)`, opacity: 0 },
      ],
      { duration: 420, easing: 'cubic-bezier(.2,.6,.4,1)' },
    )
    w.remove()
  }

  private async throwWallet(id: ItemId): Promise<Action> {
    takeItem(id)
    const item = ITEMS[id]
    const foe = this.foe.remy
    const p = clamp(species(foe.idx).catchRate * (item.ballMult ?? 1) * (1 - ((2 / 3) * foe.hp) / this.foe.max) * (foe.gold ? 0.6 : 1), 0.05, 0.97)
    const q = p ** 0.25
    let passed = 0
    while (passed < 4 && rand() < q) passed++
    const caught = passed === 4
    const shakes = Math.min(3, passed)

    void show(`${S.name} threw a *${item.name}*!`)
    const { x, feet, size } = this.g.foe
    const sx = 8
    const sy = this.g.me.feet - this.g.me.size * 0.7
    const hx = x
    const hy = feet - size - 6
    const w = this.spawn('fx-wallet big', sx, sy, 24, 24, itemIcon(id))
    audio.sfx('throw')
    const kf: Keyframe[] = []
    for (let k = 0; k <= 10; k++) {
      const t = k / 10
      kf.push({ transform: `translate(${(hx - sx) * t}rem, ${(hy - sy) * t - Math.sin(Math.PI * t) * 36}rem) rotate(${t * 720}deg)` })
    }
    await anim(w, kf, { duration: 560, easing: 'linear' })
    this.place_(w, hx, hy, 24, 24)
    // Opens: a beam of light pulls the Remy in.
    void anim(w, [{ transform: 'scale(1)' }, { transform: 'scale(1.25) rotate(-8deg)' }, { transform: 'scale(1)' }], 360)
    void this.burst('fx-beam', x, feet - size * 0.5 - 4, size * 0.95, size + 12, [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], 700)
    audio.sfx('select')
    this.foe.card.classList.add('sil')
    await sleep(200)
    this.foe.mover.style.transformOrigin = '50% 0%'
    await anim(
      this.foe.mover,
      [
        { transform: 'translateY(0) scale(1)', opacity: 1 },
        { transform: `translateY(${-size * 0.15}rem) scale(0.02)`, opacity: 0.3 },
      ],
      { duration: 380, easing: 'cubic-bezier(.6,0,.9,.6)' },
    )
    this.foe.slot.classList.add('gone')
    this.foe.mover.style.transformOrigin = ''
    // Drops onto the platform.
    const gy = feet - 12
    await anim(
      w,
      [
        { transform: 'translateY(0)', easing: 'cubic-bezier(.5,0,1,1)' },
        { transform: `translateY(${gy - hy}rem)`, offset: 0.55, easing: 'cubic-bezier(0,0,.5,1)' },
        { transform: `translateY(${gy - hy - 7}rem)`, offset: 0.78, easing: 'cubic-bezier(.5,0,1,1)' },
        { transform: `translateY(${gy - hy}rem)` },
      ],
      500,
    )
    this.place_(w, hx, gy, 24, 24)
    w.style.transformOrigin = '50% 100%'
    await sleep(350)
    for (let i = 0; i < shakes; i++) {
      audio.sfx('shake')
      await anim(
        w,
        [{ transform: 'rotate(0)' }, { transform: 'rotate(-24deg)' }, { transform: 'rotate(0)' }, { transform: 'rotate(18deg)' }, { transform: 'rotate(0)' }],
        { duration: 520, easing: 'ease-in-out' },
      )
      await sleep(430)
    }
    if (caught) {
      audio.sfx('select')
      w.classList.add('locked')
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        void this.burst(
          'fx-spark gold',
          hx,
          gy - 4,
          7,
          7,
          [
            { transform: 'translate(0,0) scale(.3)', opacity: 1 },
            { transform: `translate(${Math.cos(a) * 20}rem, ${Math.sin(a) * 14 - 6}rem) scale(1)`, opacity: 1, offset: 0.6 },
            { transform: `translate(${Math.cos(a) * 26}rem, ${Math.sin(a) * 18 - 4}rem) scale(0)`, opacity: 0 },
          ],
          { duration: 700, easing: 'cubic-bezier(.2,.8,.3,1)' },
        )
      }
      this.foe.showInfo(false)
      const jingle = audio.jingle('catch')
      await tell(`Gotcha! *${remyName(foe)}* was minted!`)
      await jingle
      audio.play('victory')
      const where = receiveRemy(foe, S.map || 'wild')
      await this.certificate(foe)
      await tell(
        where === 'party'
          ? `${remyName(foe)} joined your party!`
          : `Party full!\n${remyName(foe)} moved to *Cold Storage*.`,
      )
      w.remove()
      return { kind: 'end', result: 'caught' }
    }
    // Breaks free.
    audio.sfx('catchFail')
    this.openBurst(hx, gy - 6, size)
    w.remove()
    this.foe.slot.classList.remove('gone')
    const back = anim(
      this.foe.mover,
      [
        { transform: 'scale(0.05)', opacity: 0.4 },
        { transform: 'scale(1.1)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 340, easing: 'cubic-bezier(.2,.9,.3,1.1)' },
    )
    await sleep(160)
    this.foe.card.classList.remove('sil')
    audio.cry(foe.idx)
    await back
    await tell(
      [
        'The Remy slipped out!',
        'One shake, then a breakout!',
        'Two shakes! Almost minted!',
        'So close! It broke free at the end!',
      ][shakes],
    )
    return { kind: 'used' }
  }

  // ─── motion + FX primitives ───

  private spawn(cls: string, x: number, y: number, w: number, h: number, html = ''): HTMLElement {
    const e = el('div', `fx ${cls}`, html)
    this.place_(e, x, y, w, h)
    this.fxl.appendChild(e)
    return e
  }

  /** Re-anchors an FX element centred on (x, y) and clears its animations. */
  private place_(e: HTMLElement, x: number, y: number, w: number, h: number) {
    for (const a of e.getAnimations()) a.cancel()
    e.style.left = `${x - w / 2}rem`
    e.style.top = `${y - h / 2}rem`
    e.style.width = `${w}rem`
    e.style.height = `${h}rem`
  }

  private burst(cls: string, x: number, y: number, w: number, h: number, kf: Keyframe[], o: number | KeyframeAnimationOptions, html = '') {
    const e = this.spawn(cls, x, y, w, h, html)
    if (typeof o !== 'number' && o.delay) e.style.opacity = '0'
    return anim(e, kf, o).then(() => e.remove())
  }

  private center(s: Side) {
    const g = this.geo(s)
    return { x: g.x, y: g.feet - g.size / 2, size: g.size, feet: g.feet }
  }

  private lunge(s: Side, k = 1) {
    const d = s.who === 'me' ? [16 * k, -9 * k] : [-16 * k, 9 * k]
    return anim(
      s.mover,
      [
        { transform: 'translate(0,0)' },
        { transform: `translate(${-d[0] * 0.25}rem, ${-d[1] * 0.25}rem)`, offset: 0.3 },
        { transform: `translate(${d[0]}rem, ${d[1]}rem)`, offset: 0.55 },
        { transform: 'translate(0,0)' },
      ],
      { duration: 380, easing: 'ease-out' },
    )
  }

  private hop(s: Side) {
    return anim(
      s.mover,
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-7rem)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-3rem)' }, { transform: 'translateY(0)' }],
      { duration: 420, easing: 'ease-out' },
    )
  }

  private dodge(s: Side) {
    const d = s.who === 'me' ? -12 : 12
    return anim(
      s.mover,
      [{ transform: 'translateX(0)' }, { transform: `translateX(${d}rem)`, offset: 0.3 }, { transform: `translateX(${d}rem)`, offset: 0.6 }, { transform: 'translateX(0)' }],
      { duration: 420, easing: 'ease-out' },
    )
  }

  private blink(s: Side) {
    return anim(s.card, [{ opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }], {
      duration: 420,
      easing: 'steps(1, end)',
    })
  }

  private shakeScreen(power = 1) {
    const p = 3 * power
    void anim(
      this.field,
      [
        { transform: 'translate(0,0)' },
        { transform: `translate(${p}rem, ${-p * 0.6}rem)` },
        { transform: `translate(${-p}rem, ${p * 0.5}rem)` },
        { transform: `translate(${p * 0.6}rem, ${p * 0.4}rem)` },
        { transform: `translate(${-p * 0.4}rem, ${-p * 0.3}rem)` },
        { transform: 'translate(0,0)' },
      ],
      { duration: 320, easing: 'steps(5, end)' },
    )
  }

  private hitReact(s: Side, eff: number, crit: boolean, dealt: number, color: string) {
    audio.sfx(eff > 1 ? 'hitSuper' : eff < 1 ? 'hitWeak' : 'hit')
    if (crit) window.setTimeout(() => audio.sfx('crit'), 90)
    const { x, y, size } = this.center(s)
    const dx = s.who === 'me' ? -4 : 4
    void anim(
      s.mover,
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(${dx}rem)` },
        { transform: `translateX(${-dx}rem)` },
        { transform: `translateX(${dx * 0.6}rem)` },
        { transform: `translateX(${-dx * 0.4}rem)` },
        { transform: 'translateX(0)' },
      ],
      { duration: 380, easing: 'steps(5, end)' },
    )
    void this.blink(s)
    const flash = s.card.querySelector('.flash') as HTMLElement
    flash.style.background = `color-mix(in srgb, ${color} 35%, #fff)`
    void anim(flash, [{ opacity: 0 }, { opacity: 0.9 }, { opacity: 0 }, { opacity: 0.6 }, { opacity: 0 }], { duration: 320, easing: 'steps(1, end)' })
    if (crit || eff > 1) {
      this.shakeScreen(crit && eff > 1 ? 1.6 : 1)
      const tint = this.spawn('fx-tint', this.g.W / 2, this.g.H / 2, this.g.W, this.g.H)
      tint.style.background = color
      void anim(tint, [{ opacity: 0.35 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' }).then(() => tint.remove())
    }
    const cls = crit ? 'crit' : eff > 1 ? 'super' : eff < 1 ? 'weak' : ''
    void this.burst(
      `fx-dmg ${cls}`,
      x + (rand() - 0.5) * 10,
      y - size * 0.12,
      70,
      16,
      [
        { transform: 'translateY(4rem) scale(.6)', opacity: 0 },
        { transform: 'translateY(-4rem) scale(1.25)', opacity: 1, offset: 0.18 },
        { transform: 'translateY(-8rem) scale(1)', opacity: 1, offset: 0.7 },
        { transform: 'translateY(-14rem) scale(1)', opacity: 0 },
      ],
      { duration: 1000, easing: 'cubic-bezier(.2,.8,.3,1)' },
      `<b>-${dealt}</b>${crit ? '<small>CRIT!</small>' : ''}`,
    )
  }

  private impact(x: number, y: number, color: string, big: boolean) {
    const s = big ? 64 : 44
    const e = this.spawn('fx-hit', x, y, s, s, '<i></i>')
    e.style.setProperty('--c', color)
    void anim(
      e,
      [
        { transform: 'scale(.2) rotate(0)', opacity: 1 },
        { transform: 'scale(1.1) rotate(20deg)', opacity: 1, offset: 0.4 },
        { transform: 'scale(1.3) rotate(30deg)', opacity: 0 },
      ],
      { duration: 280, easing: 'ease-out' },
    ).then(() => e.remove())
    const ring = this.spawn('fx-ring', x, y, s, s)
    ring.style.setProperty('--c', color)
    void anim(
      ring,
      [
        { transform: 'scale(.3)', opacity: 1 },
        { transform: 'scale(1.6)', opacity: 0 },
      ],
      { duration: 380, easing: 'ease-out' },
    ).then(() => ring.remove())
  }

  private openBurst(x: number, y: number, size: number) {
    const s = size * 1.5
    void this.burst(
      'fx-open',
      x,
      y,
      s,
      s,
      [
        { transform: 'scale(.15) rotate(0)', opacity: 1 },
        { transform: 'scale(1) rotate(40deg)', opacity: 0.9, offset: 0.5 },
        { transform: 'scale(1.25) rotate(60deg)', opacity: 0 },
      ],
      { duration: 480, easing: 'ease-out' },
    )
  }

  private goldBurst(s: Side) {
    const { x, y, size } = this.center(s)
    audio.sfx('statUp')
    const n = 14
    const all: Promise<void>[] = []
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.3
      const r = size * (0.55 + rand() * 0.35)
      const sz = 5 + rand() * 6
      all.push(
        this.burst(
          `fx-spark ${i % 3 ? 'gold' : ''}`,
          x,
          y,
          sz,
          sz,
          [
            { transform: 'translate(0,0) scale(0) rotate(0)', opacity: 1 },
            { transform: `translate(${Math.cos(a) * r}rem, ${Math.sin(a) * r}rem) scale(1.2) rotate(90deg)`, opacity: 1, offset: 0.55 },
            { transform: `translate(${Math.cos(a) * r * 1.15}rem, ${Math.sin(a) * r * 1.15}rem) scale(0) rotate(180deg)`, opacity: 0 },
          ],
          { duration: 900 + rand() * 300, delay: rand() * 180, easing: 'cubic-bezier(.2,.8,.3,1)' },
        ),
      )
    }
    const flash = this.spawn('fx-goldflash', x, y, size * 1.6, size * 1.6)
    all.push(
      anim(
        flash,
        [
          { opacity: 0, transform: 'scale(.4)' },
          { opacity: 1, transform: 'scale(1)', offset: 0.3 },
          { opacity: 0, transform: 'scale(1.3)' },
        ],
        800,
      ).then(() => flash.remove()),
    )
    return Promise.all(all)
  }

  private coinShower() {
    const { x, feet, size } = this.g.foe
    for (let i = 0; i < 14; i++) {
      const cx = x + (rand() - 0.5) * size * 1.6
      void this.burst(
        'fx-coin',
        cx,
        -8,
        7,
        7,
        [
          { transform: 'translateY(0) rotateY(0)', opacity: 1 },
          { transform: `translateY(${feet + 4}rem) rotateY(720deg)`, opacity: 1, offset: 0.85 },
          { transform: `translateY(${feet}rem) rotateY(900deg)`, opacity: 0 },
        ],
        { duration: 900 + rand() * 400, delay: i * 60, easing: 'cubic-bezier(.5,0,.9,.6)' },
      )
    }
  }

  // ─── per-type attack FX (resolve at the moment of impact) ───

  /** Screen-wide mood for a move: a coloured wash plus a giant pumping/dumping chart, wave, glitch or sunburst. */
  private sceneFx(type: Move['type'], big: boolean, target: Side) {
    const layer = el('div', `sfx sfx-${type.toLowerCase()}`)
    const { x, y } = this.center(target)
    layer.style.setProperty('--tx', `${x}rem`)
    layer.style.setProperty('--ty', `${y}rem`)
    const wash = el('i', 'sfx-wash')
    layer.appendChild(wash)
    const dur = big ? 1300 : 950
    const parts: Promise<void>[] = [
      anim(wash, [{ opacity: 0 }, { opacity: big ? 0.8 : 0.6, offset: 0.3 }, { opacity: big ? 0.8 : 0.6, offset: 0.6 }, { opacity: 0 }], dur),
    ]
    if (type === 'BULL' || type === 'BEAR') {
      const up = type === 'BULL'
      const chart = el('div', 'sfx-chart', candles(Math.floor(rand() * 999), 16))
      layer.appendChild(chart)
      parts.push(
        anim(
          chart,
          [
            { transform: `translateY(${up ? 45 : -45}%) scaleY(${up ? 0.6 : 1.3})`, opacity: 0 },
            { opacity: 0.85, offset: 0.35 },
            { transform: `translateY(${up ? -30 : 30}%) scaleY(1)`, opacity: 0 },
          ],
          { duration: dur, easing: 'cubic-bezier(.3,.6,.4,1)' },
        ),
      )
    } else if (type === 'WHALE') {
      const wave = el(
        'div',
        'sfx-wave',
        '<svg viewBox="0 0 120 30" preserveAspectRatio="none"><path d="M0 30V12Q10 2 20 10T40 10T60 10T80 10T100 10T120 10V30Z" fill="rgba(47,140,255,.55)"/><path d="M0 12Q10 2 20 10T40 10T60 10T80 10T100 10T120 10" fill="none" stroke="rgba(230,245,255,.8)" stroke-width="1.5"/></svg>',
      )
      layer.appendChild(wave)
      parts.push(
        anim(
          wave,
          [
            { transform: 'translate(-50%, 60%)', opacity: 0 },
            { transform: 'translate(-25%, 0)', opacity: 1, offset: 0.45 },
            { transform: 'translate(0, 30%)', opacity: 0 },
          ],
          { duration: dur, easing: 'ease-out' },
        ),
      )
    } else if (type === 'DEGEN') {
      const bg = this.root.querySelector('.bt-bg') as HTMLElement
      parts.push(
        anim(
          bg,
          [
            { filter: 'none', transform: 'translate(0,0)' },
            { filter: 'hue-rotate(120deg) saturate(2)', transform: 'translate(3rem,0)' },
            { filter: 'invert(1) hue-rotate(200deg)', transform: 'translate(-3rem,1rem)' },
            { filter: 'hue-rotate(260deg) saturate(3)', transform: 'translate(2rem,-1rem)' },
            { filter: 'none', transform: 'translate(0,0)' },
          ],
          { duration: 420, delay: 250, easing: 'steps(1, end)', fill: 'none' },
        ),
      )
      layer.appendChild(el('i', 'sfx-scan'))
    } else {
      const sun = el('i', 'sfx-sun')
      layer.appendChild(sun)
      parts.push(
        anim(
          sun,
          [
            { transform: 'translate(-50%,-50%) scale(.3) rotate(0)', opacity: 0 },
            { transform: 'translate(-50%,-50%) scale(1) rotate(40deg)', opacity: 0.9, offset: 0.4 },
            { transform: 'translate(-50%,-50%) scale(1.2) rotate(90deg)', opacity: 0 },
          ],
          { duration: dur, easing: 'ease-out' },
        ),
      )
    }
    this.sfx.appendChild(layer)
    void Promise.all(parts).then(() => layer.remove())
  }

  private async fxFor(id: MoveId | 'panic', mv: Move, att: Side, def: Side) {
    const accent = art.get(att.remy.idx).palette.accent
    const a = this.center(att)
    const b = this.center(def)
    for (let i = 0; i < 6; i++) {
      const mote = this.spawn('fx-art-mote', a.x, a.y, 3 + i % 2, 3 + i % 2)
      mote.style.background = accent
      void anim(mote, [
        { transform: 'translate(0,0) scale(.4)', opacity: 0 },
        { opacity: 0.9, offset: 0.2 },
        { transform: `translate(${b.x - a.x}rem, ${b.y - a.y + (i - 3) * 4}rem) scale(1)`, opacity: 0 },
      ], { duration: 650, delay: i * 45, easing: 'ease-in' }).then(() => mote.remove())
    }
    this.sceneFx(mv.type, mv.power >= 90, def)
    switch (mv.type) {
      case 'BULL':
        return this.fxBull(def, id)
      case 'BEAR':
        return this.fxBear(def, id)
      case 'WHALE':
        return this.fxWhale(att, def, id)
      case 'DEGEN':
        return this.fxDegen(att, def, id)
      default:
        return this.fxMeme(att, def, id)
    }
  }

  private async fxBull(t: Side, id: MoveId | 'panic') {
    const { x, feet, size } = this.center(t)
    const big = id === 'to_the_moon'
    const n = big ? 12 : id === 'bull_run' ? 9 : 7
    for (let i = 0; i < n; i++) {
      const h = size * (0.16 + rand() * (big ? 0.34 : 0.24))
      const sx = x + (rand() - 0.5) * size * 1.15
      const rise = size * (0.75 + rand() * 0.5)
      void this.burst(
        'fx-candle up',
        sx,
        feet - h / 2,
        Math.max(5, Math.round(size * 0.085)),
        h,
        [
          { transform: 'translateY(0) scaleY(.2)', opacity: 0 },
          { transform: `translateY(${-rise * 0.45}rem) scaleY(1)`, opacity: 1, offset: 0.35 },
          { transform: `translateY(${-rise}rem) scaleY(1)`, opacity: 0 },
        ],
        { duration: 600, delay: i * 40, easing: 'cubic-bezier(.2,.6,.3,1)' },
      )
    }
    for (let i = 0; i < 3; i++)
      void this.burst(
        'fx-chev up',
        x,
        feet - size * 0.2,
        size * 0.7,
        size * 0.34,
        [
          { transform: 'translateY(0)', opacity: 0 },
          { transform: `translateY(${-size * 0.4}rem)`, opacity: 1, offset: 0.4 },
          { transform: `translateY(${-size * 0.95}rem)`, opacity: 0 },
        ],
        { duration: 520, delay: 120 + i * 100, easing: 'ease-out' },
      )
    if (big)
      void this.burst(
        'fx-moon',
        x,
        -30,
        30,
        30,
        [
          { transform: 'translateY(0) scale(.6)', opacity: 0 },
          { transform: `translateY(${size * 0.55 + 20}rem) scale(1)`, opacity: 1, offset: 0.5 },
          { transform: `translateY(${size * 0.55 + 20}rem) scale(1)`, opacity: 0 },
        ],
        { duration: 900, easing: 'ease-out' },
      )
    await sleep(big ? 460 : 360)
    if (id === 'bull_run' || big) this.shakeScreen(0.6)
    this.impact(x, feet - size / 2, TYPE_COLOR.BULL, big)
  }

  private async fxBear(t: Side, id: MoveId | 'panic') {
    const { x, feet, size } = this.center(t)
    const top = feet - size
    if (id === 'capitulation') {
      const w = size * 0.34
      const h = size * 0.95
      void this.burst(
        'fx-candle down big',
        x,
        top + h / 2 - 4,
        w,
        h,
        [
          { transform: `translateY(${-top - h - 20}rem)`, opacity: 1 },
          { transform: 'translateY(0)', opacity: 1, offset: 0.45 },
          { transform: 'translateY(0) scaleY(.9)', opacity: 1, offset: 0.6 },
          { transform: 'translateY(4rem) scaleY(.9)', opacity: 0 },
        ],
        { duration: 900, easing: 'cubic-bezier(.55,0,.9,.4)' },
      )
      await sleep(400)
      this.shakeScreen(1.2)
      this.impact(x, feet - size * 0.2, TYPE_COLOR.BEAR, true)
      return
    }
    const n = id === 'wick_hunt' ? 4 : 6
    for (let i = 0; i < n; i++) {
      const h = size * (0.16 + rand() * 0.22)
      const sx = x + (rand() - 0.5) * size * 1.1
      void this.burst(
        'fx-candle down',
        sx,
        top - 10,
        Math.max(5, Math.round(size * 0.085)),
        h,
        [
          { transform: `translateY(${-30 - rand() * 20}rem)`, opacity: 0 },
          { transform: `translateY(${size * 0.35}rem)`, opacity: 1, offset: 0.55 },
          { transform: `translateY(${size * 0.75}rem)`, opacity: 0 },
        ],
        { duration: 480, delay: i * 45, easing: 'cubic-bezier(.5,0,.9,.5)' },
      )
    }
    await sleep(id === 'wick_hunt' ? 120 : 220)
    const slashes = id === 'wick_hunt' ? 3 : 2
    for (let i = 0; i < slashes; i++) {
      const oy = (i - (slashes - 1) / 2) * size * 0.24
      void this.burst(
        'fx-slash',
        x + oy * 0.4,
        feet - size / 2 + oy,
        size * 1.3,
        6,
        [
          { transform: 'rotate(-38deg) scaleX(0)', opacity: 1 },
          { transform: 'rotate(-38deg) scaleX(1)', opacity: 1, offset: 0.45 },
          { transform: 'rotate(-38deg) scaleX(1) scaleY(.3)', opacity: 0 },
        ],
        { duration: 300, delay: i * 70, easing: 'ease-out' },
      )
    }
    await sleep(160 + slashes * 60)
    this.impact(x, feet - size / 2, TYPE_COLOR.BEAR, false)
  }

  private async fxWhale(att: Side, t: Side, id: MoveId | 'panic') {
    const { x, feet, size } = this.center(t)
    const dir = att.who === 'me' ? 1 : -1
    const big = id === 'tsunami_sell'
    const w = size * (big ? 2.3 : 1.8)
    const h = size * (big ? 1.05 : 0.7)
    const wave = this.spawn(
      'fx-wave',
      x,
      feet - h / 2 + 4,
      w,
      h,
      `<svg viewBox="0 0 60 24" preserveAspectRatio="none"><path d="M0 24V14Q8 3 16 10T32 8T48 10T60 5V24Z" fill="#2f8cff"/><path d="M0 24V18Q10 12 20 16T40 15T60 13V24Z" fill="#1b5fd1"/><path d="M0 15Q8 4 16 11T32 9T48 11T60 6" fill="none" stroke="#e3f3ff" stroke-width="2.2"/></svg>`,
    )
    if (dir < 0) wave.style.scale = '-1 1'
    void anim(
      wave,
      [
        { transform: `translateX(${-dir * size * 0.9}rem) scaleY(.15)`, opacity: 0 },
        { transform: 'translateX(0) scaleY(1)', opacity: 1, offset: 0.5 },
        { transform: `translateX(${dir * size * 0.5}rem) scaleY(.5)`, opacity: 0 },
      ],
      { duration: big ? 820 : 640, easing: 'cubic-bezier(.3,.6,.4,1)' },
    ).then(() => wave.remove())
    await sleep(big ? 380 : 300)
    for (let i = 0; i < (big ? 14 : 9); i++) {
      const vx = (rand() - 0.5) * size * 1.4
      const vy = size * (0.5 + rand() * 0.6)
      void this.burst(
        'fx-drop',
        x,
        feet - size * 0.4,
        5,
        5,
        [
          { transform: 'translate(0,0)', opacity: 1 },
          { transform: `translate(${vx * 0.6}rem, ${-vy}rem)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${vx}rem, ${-vy * 0.2}rem)`, opacity: 0 },
        ],
        { duration: 620, easing: 'ease-out' },
      )
    }
    if (big)
      for (let i = 0; i < 10; i++)
        void this.burst(
          'fx-coin',
          x + (rand() - 0.5) * size * 1.3,
          feet - size - 20,
          6,
          6,
          [
            { transform: 'translateY(0) rotateY(0)', opacity: 0 },
            { transform: `translateY(${size * 0.6}rem) rotateY(540deg)`, opacity: 1, offset: 0.6 },
            { transform: `translateY(${size + 12}rem) rotateY(900deg)`, opacity: 0 },
          ],
          { duration: 700, delay: i * 40, easing: 'cubic-bezier(.5,0,.9,.6)' },
        )
    this.impact(x, feet - size / 2, TYPE_COLOR.WHALE, big)
  }

  private async fxDegen(att: Side, t: Side, id: MoveId | 'panic') {
    const { x, feet, size } = this.center(t)
    const cy = feet - size / 2
    if (id === 'rug_pull') {
      const rug = this.spawn('fx-rug', x, feet - 2, size * 1.5, size * 0.2)
      const dir = att.who === 'me' ? 1 : -1
      await anim(
        rug,
        [
          { transform: 'translateX(0) skewX(0)', opacity: 0 },
          { transform: 'translateX(0) skewX(0)', opacity: 1, offset: 0.35 },
          { transform: `translateX(${dir * size * 1.4}rem) skewX(${-dir * 30}deg)`, opacity: 0 },
        ],
        { duration: 560, easing: 'cubic-bezier(.7,0,.9,.4)' },
      )
      rug.remove()
      void anim(
        t.mover,
        [
          { transform: 'rotate(0) translateY(0)' },
          { transform: `rotate(${-dir * 14}deg) translateY(-6rem)`, offset: 0.35 },
          { transform: `rotate(${dir * 6}deg) translateY(4rem)`, offset: 0.7 },
          { transform: 'rotate(0) translateY(0)' },
        ],
        { duration: 520, easing: 'ease-out' },
      )
    } else {
      const a = this.center(att)
      const dx = x - a.x
      const dy = cy - a.y
      const rs = id === 'leverage' ? 40 : 30
      const rocket = this.spawn(
        'fx-rocket',
        a.x,
        a.y,
        rs,
        rs * 0.45,
        `<svg viewBox="0 0 22 10" shape-rendering="crispEdges"><path fill="#ff9d2e" d="M0 3h4v4H0z"/><path fill="#ffe27a" d="M1 4h4v2H1z"/><path fill="#8a3ddb" d="M4 2h12v6H4z"/><path fill="#b35cff" d="M4 2h12v3H4z"/><path fill="#fff" d="M16 3h3v4h-3z"/><path fill="#ff4fa0" d="M19 4h2v2h-2zM6 0h4v2H6zM6 8h4v2H6z"/><path fill="#7dffb1" d="M11 4h2v2h-2z"/></svg>`,
      )
      const kf: Keyframe[] = []
      for (let k = 0; k <= 8; k++) {
        const s = k / 8
        // Nose follows the tangent of the arc.
        const ang = (Math.atan2(dy - 22 * Math.PI * Math.cos(Math.PI * s), dx) * 180) / Math.PI
        kf.push({ transform: `translate(${dx * s}rem, ${dy * s - Math.sin(Math.PI * s) * 22}rem) rotate(${ang}deg)` })
      }
      await anim(rocket, kf, { duration: 420, easing: 'cubic-bezier(.5,0,.9,.6)' })
      rocket.remove()
      for (let i = 0; i < 12; i++) {
        const a2 = (i / 12) * Math.PI * 2
        const r = size * (0.4 + rand() * 0.35)
        void this.burst(
          `fx-pix c${i % 3}`,
          x,
          cy,
          5,
          5,
          [
            { transform: 'translate(0,0)', opacity: 1 },
            { transform: `translate(${Math.cos(a2) * r}rem, ${Math.sin(a2) * r}rem)`, opacity: 0 },
          ],
          { duration: 480, easing: 'cubic-bezier(.2,.8,.3,1)' },
        )
      }
      if (id === 'leverage')
        void this.burst(
          'fx-word lev',
          x,
          cy - size * 0.5,
          44,
          14,
          [
            { transform: 'scale(.3)', opacity: 0 },
            { transform: 'scale(1.2)', opacity: 1, offset: 0.3 },
            { transform: 'scale(1)', opacity: 1, offset: 0.75 },
            { transform: 'scale(1) translateY(-6rem)', opacity: 0 },
          ],
          800,
          '100x',
        )
    }
    t.card.classList.add('glitch')
    window.setTimeout(() => t.card.classList.remove('glitch'), 480)
    this.impact(x, cy, TYPE_COLOR.DEGEN, id === 'rug_pull' || id === 'leverage')
  }

  private async fxMeme(att: Side, t: Side, id: MoveId | 'panic') {
    const { x, feet, size } = this.center(t)
    const top = feet - size
    const words =
      id === 'ratio'
        ? ['RATIO', '+L', 'COPE']
        : id === 'shill'
          ? ['SHILL!', 'GM!', 'WAGMI']
          : id === 'flash_loan'
            ? ['$$$', 'REPAID', 'GG']
            : id === 'panic'
              ? ['SELL!!', 'REKT', 'NGMI']
              : ['LOL', 'GM', 'LFG']
    if (id === 'flash_loan') {
      const a = this.center(att)
      const len = Math.hypot(x - a.x, feet - size / 2 - a.y)
      const ang = (Math.atan2(feet - size / 2 - a.y, x - a.x) * 180) / Math.PI
      const streak = this.spawn('fx-streak', (a.x + x) / 2, (a.y + feet - size / 2) / 2, len, 4)
      await anim(
        streak,
        [
          { transform: `rotate(${ang}deg) scaleX(0)`, transformOrigin: att.who === 'me' ? '0 50%' : '100% 50%', opacity: 1 },
          { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 1, offset: 0.5 },
          { transform: `rotate(${ang}deg) scaleX(1) scaleY(0)`, opacity: 0 },
        ],
        { duration: 220, easing: 'ease-out' },
      )
      streak.remove()
    }
    const spots = [
      [-0.45, -0.05],
      [0.45, 0.15],
      [0, -0.28],
    ]
    words.forEach((w, i) => {
      const bw = w.length * 7 + 14
      void this.burst(
        `fx-bubble ${id === 'panic' ? 'red' : ''} ${i === 1 ? 'flip' : ''}`,
        x + spots[i][0] * size,
        top + size * (0.18 + spots[i][1]),
        bw,
        16,
        [
          { transform: 'scale(0)', opacity: 1 },
          { transform: 'scale(1.18)', opacity: 1, offset: 0.2 },
          { transform: 'scale(1)', opacity: 1, offset: 0.35 },
          { transform: 'scale(1)', opacity: 1, offset: 0.85 },
          { transform: 'scale(.9) translateY(-4rem)', opacity: 0 },
        ],
        { duration: 820, delay: i * 110, easing: 'ease-out' },
        `<span>${w}</span>`,
      )
    })
    for (let i = 0; i < 6; i++)
      void this.burst(
        `fx-spark ${i % 2 ? 'gold' : ''}`,
        x + (rand() - 0.5) * size * 1.2,
        feet - rand() * size,
        6,
        6,
        [
          { transform: 'scale(0) rotate(0)', opacity: 1 },
          { transform: 'scale(1.2) rotate(90deg)', opacity: 1, offset: 0.5 },
          { transform: 'scale(0) rotate(180deg)', opacity: 0 },
        ],
        { duration: 520, delay: 100 + i * 60, easing: 'ease-out' },
      )
    await sleep(330)
    this.impact(x, feet - size / 2, TYPE_COLOR.MEME, false)
  }

  private async fxStat(t: Side, up: boolean, id: MoveId | 'panic') {
    const { x, feet, size } = this.center(t)
    const cy = feet - size / 2
    const color = up ? (id === 'pump_it' ? '#ff7a2e' : '#4fd1ff') : '#7a5cff'
    const aura = this.spawn(`fx-aura ${up ? 'up' : 'down'}`, x, cy, size * 1.35, size * 1.35)
    aura.style.setProperty('--c', color)
    void anim(
      aura,
      [
        { transform: 'scale(.7)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1, offset: 0.3 },
        { transform: 'scale(1.05)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1.15)', opacity: 0 },
      ],
      { duration: 900, easing: 'ease-out' },
    ).then(() => aura.remove())
    t.card.classList.remove('buff', 'debuff')
    void t.card.offsetWidth
    t.card.classList.add(up ? 'buff' : 'debuff')
    window.setTimeout(() => t.card.classList.remove('buff', 'debuff'), 900)
    for (let i = 0; i < 7; i++) {
      const ax = x + (rand() - 0.5) * size * 1.05
      const from = up ? feet : feet - size
      const to = up ? feet - size * 1.1 : feet + 4
      void this.burst(
        `fx-arrow ${up ? 'up' : 'down'}`,
        ax,
        from,
        8,
        9,
        [
          { transform: 'translateY(0)', opacity: 0 },
          { transform: `translateY(${(to - from) * 0.35}rem)`, opacity: 1, offset: 0.3 },
          { transform: `translateY(${to - from}rem)`, opacity: 0 },
        ],
        { duration: 640, delay: i * 70, easing: 'ease-in-out' },
      )
    }
    if (id === 'fud') {
      void this.burst(
        'fx-cloud',
        x,
        feet - size - 6,
        size * 0.9,
        size * 0.4,
        [
          { transform: 'translateY(-6rem) scale(.6)', opacity: 0 },
          { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.25 },
          { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.8 },
          { transform: 'translateY(2rem) scale(1.05)', opacity: 0 },
        ],
        1000,
        '<span>FUD</span>',
      )
    } else if (id === 'paper_hands') {
      for (let i = 0; i < 6; i++)
        void this.burst(
          'fx-paper',
          x + (rand() - 0.5) * size,
          feet - size - 8,
          7,
          9,
          [
            { transform: 'translate(0,0) rotate(0)', opacity: 0 },
            { transform: `translate(${(rand() - 0.5) * 16}rem, ${size * 0.5}rem) rotate(${(rand() - 0.5) * 200}deg)`, opacity: 1, offset: 0.5 },
            { transform: `translate(${(rand() - 0.5) * 24}rem, ${size + 6}rem) rotate(${(rand() - 0.5) * 400}deg)`, opacity: 0 },
          ],
          { duration: 900, delay: i * 70, easing: 'ease-in' },
        )
    } else if (id === 'diamond_hands') {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        void this.burst(
          'fx-gem',
          x + Math.cos(a) * size * 0.55,
          cy + Math.sin(a) * size * 0.45,
          9,
          11,
          [
            { transform: 'scale(0) rotate(0)', opacity: 0 },
            { transform: 'scale(1.2) rotate(0)', opacity: 1, offset: 0.35 },
            { transform: 'scale(1) rotate(0)', opacity: 1, offset: 0.75 },
            { transform: 'scale(0) rotate(0)', opacity: 0 },
          ],
          { duration: 800, delay: i * 60, easing: 'ease-out' },
        )
      }
    } else if (id === 'pump_it') {
      void this.burst(
        'fx-word pump',
        x,
        feet - size - 4,
        44,
        14,
        [
          { transform: 'scale(.3)', opacity: 0 },
          { transform: 'scale(1.2)', opacity: 1, offset: 0.3 },
          { transform: 'scale(1)', opacity: 1, offset: 0.75 },
          { transform: 'scale(1) translateY(-6rem)', opacity: 0 },
        ],
        800,
        'PUMP!',
      )
    }
    await sleep(720)
  }

  private async fxHeal(t: Side) {
    const { x, feet, size } = this.center(t)
    const glow = this.spawn('fx-aura up', x, feet - size / 2, size * 1.3, size * 1.3)
    glow.style.setProperty('--c', '#5cf08c')
    void anim(
      glow,
      [
        { opacity: 0, transform: 'scale(.8)' },
        { opacity: 1, transform: 'scale(1)', offset: 0.35 },
        { opacity: 0, transform: 'scale(1.1)' },
      ],
      800,
    ).then(() => glow.remove())
    for (let i = 0; i < 9; i++)
      void this.burst(
        'fx-plus',
        x + (rand() - 0.5) * size * 1.1,
        feet - rand() * size * 0.3,
        7,
        7,
        [
          { transform: 'translateY(0) scale(.4)', opacity: 0 },
          { transform: `translateY(${-size * 0.4}rem) scale(1)`, opacity: 1, offset: 0.4 },
          { transform: `translateY(${-size * 0.9}rem) scale(.8)`, opacity: 0 },
        ],
        { duration: 760, delay: i * 55, easing: 'ease-out' },
      )
    await sleep(560)
  }

  private async fxDrain(from: Side, to: Side) {
    const a = this.center(from)
    const b = this.center(to)
    const all: Promise<void>[] = []
    for (let i = 0; i < 7; i++) {
      const bend = (rand() - 0.5) * 50
      all.push(
        this.burst(
          'fx-orb',
          a.x + (rand() - 0.5) * a.size * 0.5,
          a.y + (rand() - 0.5) * a.size * 0.5,
          6,
          6,
          [
            { transform: 'translate(0,0) scale(.4)', opacity: 0 },
            { transform: `translate(${(b.x - a.x) * 0.5 + bend}rem, ${(b.y - a.y) * 0.5 - 20}rem) scale(1)`, opacity: 1, offset: 0.5 },
            { transform: `translate(${b.x - a.x}rem, ${b.y - a.y}rem) scale(.5)`, opacity: 0 },
          ],
          { duration: 700, delay: i * 70, easing: 'ease-in-out' },
        ),
      )
    }
    await Promise.all(all)
  }

  private async fxLevel(s: Side) {
    const { x, feet, size } = this.center(s)
    const col = this.spawn('fx-lvl', x, feet - size * 0.6, size * 1.1, size * 1.4)
    await anim(
      col,
      [
        { opacity: 0, transform: 'scaleX(.2)' },
        { opacity: 1, transform: 'scaleX(1)', offset: 0.25 },
        { opacity: 0, transform: 'scaleX(1.1)' },
      ],
      900,
    )
    col.remove()
  }
}
