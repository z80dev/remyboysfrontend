/** Full-screen story scenes: title, professor intro + naming, starter pick, Hall of Fame. */
import { art } from './art'
import { audio } from './audio'
import { REMY_COUNT, TYPE_BLURB, artSrc, makeRemy, remyName, species } from './data'
import { input } from './input'
import { CAST, STARTERS, rivalStarter, rivalTrainer } from './maps'
import { portrait, typeBadge } from './menus'
import { S, addItem, hasSave, healParty, loadSave, newGame, receiveRemy, save, setState } from './state'
import './scenes.css'
import { ask, choose, closeText, el, fade, say, sleep, talk, uiRoot } from './ui'
import { enterWorld, flag, loadMap, player, render, trainerBattle } from './world'

const PROF = { speaker: 'PROF. GWEI', get portrait() { return CAST.prof } }

function scene(cls: string, html: string) {
  const s = el('div', `scene ${cls}`, html)
  uiRoot.appendChild(s)
  return s
}

const randIdx = () => Math.floor(Math.random() * REMY_COUNT)

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function artCanvas(size: number, cls: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  canvas.className = cls
  canvas.setAttribute('aria-hidden', 'true')
  return canvas
}

function mini(ctx: CanvasRenderingContext2D, idx: number, x: number, y: number, size: number) {
  const tile = art.mini(idx)
  if (tile) ctx.drawImage(tile.img, tile.sx, tile.sy, tile.sw, tile.sh, x, y, size, size)
  else {
    ctx.fillStyle = art.get(idx).palette.bg
    ctx.fillRect(x, y, size, size)
    ctx.fillStyle = art.get(idx).palette.skin
    ctx.fillRect(x + size / 4, y + size / 4, size / 2, size / 2)
  }
}

/** One pre-rendered wall; the compositor does the drifting, not the game loop. */
function titleWall(root: HTMLElement) {
  const wall = el('div', 't-wall')
  const canvas = artCanvas(768, 't-mosaic')
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.imageSmoothingEnabled = false
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      mini(ctx, (y * 977 + x * 137) % REMY_COUNT, x * 24, y * 24, 23)
    }
  }
  wall.appendChild(canvas)
  // Only four HD downloads: the rest of this thousand-portrait wall is one atlas-backed canvas.
  for (const [i, [x, y]] of [[6, 14], [23, 18], [11, 24], [26, 8]].entries()) {
    const idx = (y * 977 + x * 137) % REMY_COUNT
    const flip = el('div', 't-flip', `<img src="${artSrc(idx)}" alt="" decoding="async">`)
    flip.style.cssText = `left:${x * 3.125}%;top:${y * 3.125}%;--delay:${i * -4}s`
    wall.appendChild(flip)
  }
  root.querySelector('.t-sky')?.after(wall)
}

function pixelPortrait(host: HTMLElement, idx: number) {
  const canvas = artCanvas(32, 'scene-pixels')
  mini(canvas.getContext('2d') as CanvasRenderingContext2D, idx, 0, 0, 32)
  host.querySelector('.pf')?.appendChild(canvas)
  return canvas
}

function materialize(host: HTMLElement) {
  if (reducedMotion()) return
  const pixels = host.querySelector('.scene-pixels')
  if (!pixels) return
  for (const animation of pixels.getAnimations()) animation.cancel()
  pixels.animate(
    [
      { opacity: 1, clipPath: 'inset(100% 0 0)' },
      { opacity: 1, clipPath: 'inset(0)', offset: 0.35 },
      { opacity: 1, clipPath: 'inset(0)', offset: 0.65 },
      { opacity: 0, clipPath: 'inset(0)' },
    ],
    { duration: 850, easing: 'steps(8)', fill: 'none' },
  )
}

function collectionCascade(root: HTMLElement) {
  const canvas = artCanvas(320, 'i-cascade')
  canvas.height = 64
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.imageSmoothingEnabled = false
  root.appendChild(canvas)
  let step = 0
  const draw = () => {
    for (let i = 0; i < 20; i++) mini(ctx, ((step * 20 + i) * 137) % REMY_COUNT, (i % 10) * 32, Math.floor(i / 10) * 32, 30)
    step++
  }
  draw()
  const timer = reducedMotion() ? undefined : window.setInterval(draw, 180)
  return () => {
    window.clearInterval(timer)
    canvas.remove()
  }
}

/**
 * A 1,024-tile keepsake. Collection members get first choice of their closest target
 * pixel; remaining cells color-match the collection. Work is done once, off-frame.
 * Overflow collections cycle through each tile on arrival, never adding draw calls.
 */
function fameMosaic(lead: number) {
  const size = 32
  const count = size * size
  const canvas = artCanvas(512, 'hof-mosaic')
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.imageSmoothingEnabled = false
  const sample = artCanvas(size, '')
  const sc = sample.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  mini(sc, lead, 0, 0, size)
  const target = sc.getImageData(0, 0, size, size).data
  const known = [...new Set([...S.caught, ...S.seen, ...S.party.map((r) => r.idx)])]
  const candidates = [...new Set([...known, ...Array.from({ length: 768 }, (_, i) => (i * 137) % REMY_COUNT)])]
  sample.width = candidates.length
  sample.height = 1
  for (let i = 0; i < candidates.length; i++) mini(sc, candidates[i], i, 0, 1)
  const colors = sc.getImageData(0, 0, candidates.length, 1).data
  const distance = (cell: number, candidate: number) => {
    const a = cell * 4
    const b = candidate * 4
    return (target[a] - colors[b]) ** 2 * 2 + (target[a + 1] - colors[b + 1]) ** 2 * 3 +
      (target[a + 2] - colors[b + 2]) ** 2
  }
  const tiles = new Int32Array(count).fill(-1)
  for (let k = 0; k < Math.min(known.length, count); k++) {
    let best = -1
    let score = Number.POSITIVE_INFINITY
    for (let cell = 0; cell < count; cell++) {
      if (tiles[cell] !== -1) continue
      const d = distance(cell, k)
      if (d < score) { score = d; best = cell }
    }
    tiles[best] = known[k]
  }
  for (let cell = 0; cell < count; cell++) {
    if (tiles[cell] !== -1) continue
    let best = 0
    let score = Number.POSITIVE_INFINITY
    for (let k = 0; k < candidates.length; k++) {
      const d = distance(cell, k)
      if (d < score) { score = d; best = k }
    }
    tiles[cell] = candidates[best]
  }
  const glazes = Array.from({ length: count }, (_, cell) => {
    const p = cell * 4
    return `rgba(${target[p]},${target[p + 1]},${target[p + 2]},0.38)`
  })
  const overflowWaves = Math.ceil(Math.max(0, known.length - count) / count)
  const paint = (cell: number, x: number, y: number, idx = tiles[cell]) => {
    mini(ctx, idx, x, y, 16)
    // A translucent target glaze preserves both the face at a distance and each little Remy up close.
    ctx.fillStyle = glazes[cell]
    ctx.fillRect(x, y, 16, 16)
  }
  const assemble = () => new Promise<void>((resolve) => {
    const start = performance.now()
    const still = reducedMotion()
    let last = Number.NEGATIVE_INFINITY
    const frame = (now: number) => {
      const elapsed = still ? 4000 : now - start
      if (elapsed < 3600 && now - last < 32) { requestAnimationFrame(frame); return }
      last = now
      ctx.clearRect(0, 0, 512, 512)
      for (let cell = 0; cell < count; cell++) {
        const delay = ((cell * 73) % count) * 1.6
        const t = Math.min(1, Math.max(0, (elapsed - delay) / 1300))
        if (!t) continue
        const drift = (1 - t) ** 3
        const x = (cell % size) * 16
        const y = Math.floor(cell / size) * 16
        const extra = count + cell + Math.floor(t / 0.85 * overflowWaves) * count
        const idx = t < 0.85 && extra < known.length ? known[extra] : tiles[cell]
        paint(cell, x + (x - 248) * drift * 3, y + (y - 248) * drift * 3, idx)
      }
      if (elapsed < 3000 && canvas.isConnected) requestAnimationFrame(frame)
      else resolve()
    }
    requestAnimationFrame(frame)
  })
  return { canvas, assemble }
}

// ─────────── Title ───────────

export async function titleScreen() {
  audio.play('title')
  await art.ready
  const s = scene(
    'title',
    `<div class="t-sky"></div><div class="t-sun"></div><div class="t-grid"></div>
     <div class="t-logo"><div class="t-remy">REMY</div><div class="t-quest">QUEST</div><div class="t-sub">\u2726 A BASE ADVENTURE \u2726</div></div>
     <div class="t-press">PRESS START</div>
     <div class="t-foot">\u00a9 BASED REMY BOYS \u00b7 AT HOME ON BASE</div>`,
  )
  titleWall(s)
  await fade(false, 600)
  // Wait for any press (also tap).
  await new Promise<void>((resolve) => {
    const done = () => {
      pop()
      s.removeEventListener('pointerdown', done)
      resolve()
    }
    s.addEventListener('pointerdown', done)
    const pop = input.push((b) => {
      if (b === 'a' || b === 'start') done()
    })
  })
  audio.unlock()
  audio.play('title')
  audio.sfx('select')
  s.querySelector('.t-press')?.remove()
  for (;;) {
    const saved = hasSave()
    const opts = [...(saved ? ['CONTINUE'] : []), 'NEW GAME', `SOUND ${audio.muted ? 'OFF' : 'ON'}`]
    const c = await choose(opts, { cls: 'menu-title' })
    const pick = opts[c]
    if (pick.startsWith('SOUND')) {
      audio.setMuted(!audio.muted)
      continue
    }
    if (pick === 'CONTINUE') {
      const data = loadSave()
      if (!data) continue
      setState(data)
      await fade(true, 400)
      s.remove()
      await enterWorld()
      return
    }
    if (saved && !(await ask('Start a new game? Your saved progress will be overwritten.'))) {
      closeText()
      continue
    }
    closeText()
    await fade(true, 400)
    s.remove()
    await intro()
    return
  }
}

// ─────────── Intro ───────────

async function intro() {
  audio.play('town')
  const s = scene(
    'intro',
    `<div class="i-glow"></div><div class="i-prof">${portrait({ idx: CAST.prof }, 'pf-hero')}</div><div class="i-remy"></div>`,
  )
  await fade(false, 500)
  // The big portrait is on stage, so the text box only carries the name plate.
  const P = { speaker: PROF.speaker }
  await talk(["I'm *Prof. Gwei*, from Ethereum mainnet. More lab, less gas bill here on *Base*."], P)
  const remy = s.querySelector('.i-remy') as HTMLElement
  const idx = randIdx()
  remy.innerHTML = portrait({ idx }, 'pf-hero')
  pixelPortrait(remy, idx)
  materialize(remy)
  s.classList.add('pair')
  audio.cry(idx)
  const stopCascade = collectionCascade(s)
  await talk(
    [
      'Meet a *Remy*! Born on Base. Built for more than a profile picture.',
      'Solana couriers. Robinhood Chain traders. My lab gets the best visitors.',
      'Now their liquidity is vanishing. Every trail leads to *Rug Tower*.',
      '*The Cabald* calls it a bridge. Funny. Nothing ever comes back.',
    ],
    P,
  )
  stopCascade()
  s.classList.remove('pair')
  await talk(['What should I call you?'], P)
  closeText()
  const name = await nameEntry()
  setState(newGame(name))
  await talk([`*${name}*, find me outside my lab. Your first partner is waiting!`], P)
  closeText()
  s.classList.add('shrink')
  await sleep(700)
  await fade(true, 300)
  s.remove()
  await enterWorld()
}

function nameEntry(): Promise<string> {
  return new Promise((resolve) => {
    const presets = ['REMY', 'ANON', 'BASED', 'SATO', 'GIGA']
    const s = scene(
      'naming',
      `<div class="n-box"><div class="n-title">YOUR NAME</div>
        <input class="n-input" aria-label="Trainer name" maxlength="8" value="REMY" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done">
        <div class="n-presets">${presets.map((p) => `<button data-n="${p}">${p}</button>`).join('')}</div>
        <button class="n-ok">LET'S GO</button></div>`,
    )
    const inp = s.querySelector('.n-input') as HTMLInputElement
    const clean = () => (inp.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim() || 'REMY').slice(0, 8)
    const done = () => {
      pop()
      inp.blur()
      audio.sfx('select')
      s.remove()
      resolve(clean())
    }
    inp.addEventListener('input', () => {
      inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 8)
    })
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') done()
    })
    for (const b of s.querySelectorAll<HTMLButtonElement>('[data-n]'))
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        inp.value = b.dataset.n as string
        audio.sfx('cursor')
      })
    s.querySelector('.n-ok')?.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      done()
    })
    // Pad users: A confirms (the default name) without needing the keyboard.
    const pop = input.push((b) => {
      if (b === 'a' || b === 'start') done()
    })
    if (!window.matchMedia('(pointer: coarse)').matches) setTimeout(() => inp.select(), 50)
  })
}

// ─────────── Starter selection (Prof's lab) ───────────

export async function starterScene() {
  await fade(true, 300)
  const s = scene('lab', `<div class="lab-floor"></div><div class="lab-row"></div><div class="lab-title">CHOOSE YOUR PARTNER</div>`)
  const row = s.querySelector('.lab-row') as HTMLElement
  const cards = STARTERS.map((idx) => {
    const sp = species(idx)
    const c = el(
      'div',
      'st-card',
      `${portrait({ idx }, 'pf-starter')}<div class="st-name">REMY #${idx}</div>${typeBadge(sp.type)}
       <div class="st-stats">${(['hp', 'atk', 'def', 'spd'] as const).map((stat) =>
         `<span><b>${stat.toUpperCase()}</b><i style="--stat:${Math.min(100, sp.base[stat])}%"></i><em>${sp.base[stat]}</em></span>`,
       ).join('')}</div>`,
    )
    const palette = art.get(idx).palette
    c.style.setProperty('--art-glow', palette.accent)
    c.style.setProperty('--art-bg', palette.bg)
    pixelPortrait(c, idx)
    c.addEventListener('pointerenter', () => materialize(c))
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || reducedMotion()) return
      const bounds = c.getBoundingClientRect()
      c.style.setProperty('--tilt-x', `${(0.5 - (e.clientY - bounds.top) / bounds.height) * 10}deg`)
      c.style.setProperty('--tilt-y', `${((e.clientX - bounds.left) / bounds.width - 0.5) * 12}deg`)
    })
    c.addEventListener('pointerleave', () => {
      c.style.setProperty('--tilt-x', '0deg')
      c.style.setProperty('--tilt-y', '0deg')
    })
    row.appendChild(c)
    return c
  })
  await fade(false, 300)
  await talk(['Four *Cold Wallets*. Four future legends. Which Remy is coming with you?'], PROF)
  let sel = 0
  let picked = -1
  while (picked < 0) {
    const i = await pickCard(cards, sel)
    sel = i
    const idx = STARTERS[i]
    const t = species(idx).type
    audio.cry(idx)
    await say(`*REMY #${idx}*, the ${t} type. ${TYPE_BLURB[t]}`, PROF)
    // The standard YES/NO box would sit on top of the cards; the lab tucks a compact row into the text box instead.
    await say(`Pick REMY #${idx}?`, { ...PROF, noWait: true })
    if ((await choose(['YES', 'NO'], { cancel: 1, cls: 'menu-lab', horizontal: true })) === 0) picked = i
    closeText()
  }
  const idx = STARTERS[picked]
  cards[picked].classList.add('chosen')
  const mine = makeRemy(idx, 5)
  receiveRemy(mine, 'Genesis Town')
  S.starter = idx
  flag('starter')
  await audio.jingle('catch')
  await say(`${S.name} received *${remyName(mine)}*!`)
  // Rival barges in.
  const rival = rivalStarter(idx)
  const ri = STARTERS.indexOf(rival)
  audio.sfx('alert')
  await talk(["Wait! You saved the best one for me, right?"], { speaker: 'JEET', portrait: CAST.rival })
  cards[ri].classList.add('taken')
  audio.cry(rival)
  await say(`JEET chose *REMY #${rival}*!`)
  await talk(["Mine *counters* yours. That's research, {P}. Let's battle!"], { speaker: 'JEET', portrait: CAST.rival })
  closeText()
  // Stage the world behind the lab so the battle returns to Genesis Town outside the lab.
  loadMap('genesis', 16, 8, 'up')
  render()
  s.remove()
  const res = await trainerBattle(rivalTrainer(1), 'rival1', { noBlackout: true })
  healParty()
  const jeet = { speaker: 'JEET', portrait: CAST.rival }
  if (res === 'win') await say("Beginner's luck! Next time, I'll do more research. See you in *Liquidity City*!", jeet)
  else await say("See? Research! I'll be in *Liquidity City*. Don't make me wait!", jeet)
  closeText()
  await talk(
    [
      'Your partner is rested and ready. A little tune-up. No gas fee.',
      'Weaken a wild Remy, then throw a *Cold Wallet* to *mint* it!',
    ],
    PROF,
  )
  addItem('wallet', 5)
  audio.jingle('item')
  await say(`${S.name} received 5 *Cold Wallets*!`)
  flag('dex')
  await talk(
    [
      'Your *Remydex* tracks Remys seen and minted. Find it in the MENU.',
      'Find the *Exchange* in Liquidity City. Someone there knows where the liquidity went.',
    ],
    PROF,
  )
  save()
  player.dir = 'up'
}

function pickCard(cards: HTMLElement[], start: number): Promise<number> {
  return new Promise((resolve) => {
    let sel = start
    const draw = () => {
      cards.forEach((c, i) => c.classList.toggle('sel', i === sel))
      materialize(cards[sel])
    }
    draw()
    const done = (i: number) => {
      pop()
      for (const [i2, c] of cards.entries()) c.removeEventListener('pointerdown', handlers[i2])
      audio.sfx('select')
      resolve(i)
    }
    const handlers = cards.map((c, i) => {
      const h = (e: Event) => {
        e.preventDefault()
        if (sel !== i) {
          sel = i
          audio.sfx('cursor')
          draw()
          return
        }
        done(i)
      }
      c.addEventListener('pointerdown', h)
      return h
    })
    const pop = input.push((b) => {
      const cols = cards.length
      if (b === 'left' || b === 'up') sel = (sel - 1 + cols) % cols
      else if (b === 'right' || b === 'down') sel = (sel + 1) % cols
      else if (b === 'a') return done(sel)
      else return
      audio.sfx('cursor')
      draw()
    })
  })
}

// ─────────── Hall of Fame ───────────

export async function hallOfFame() {
  flag('badge_rug')
  await fade(true, 800, '#fff')
  audio.play('ending')
  const s = scene('hof', `<div class="hof-stars"></div><div class="hof-title">HALL OF FAME</div><div class="hof-row"></div><div class="hof-confetti"></div>`)
  const mosaic = fameMosaic(S.party[0]?.idx ?? S.starter ?? 0)
  const stage = el('div', 'hof-mosaic-stage')
  stage.appendChild(mosaic.canvas)
  s.prepend(stage)
  s.appendChild(el('div', 'hof-dedication', 'EVERY REMY. EVERY MEMORY. ONE LEGEND.'))
  const row = s.querySelector('.hof-row') as HTMLElement
  const conf = s.querySelector('.hof-confetti') as HTMLElement
  conf.innerHTML = Array.from(
    { length: 40 },
    (_, i) => `<i style="--x:${(i * 53) % 100}%;--d:${(i % 7) * 0.4}s;--c:${['#27c46b', '#ec4a4a', '#2f8cff', '#b35cff', '#f5c542'][i % 5]}"></i>`,
  ).join('')
  await fade(false, 800, '#fff')
  await mosaic.assemble()
  await sleep(900)
  s.classList.add('hof-revealed')
  for (const r of S.party) {
    const c = el('div', 'hof-card', `${portrait(r, 'pf-hof')}<div class="hof-name">${remyName(r)}</div><div class="hof-lv">Lv${r.level}</div>`)
    row.appendChild(c)
    audio.cry(r.idx)
    await sleep(750)
  }
  await sleep(500)
  const mins = Math.floor(S.playMs / 60000)
  await talk(
    [
      `*${S.name}*, you broke the Cabald's pipeline! *RUG LORD* is finished.`,
      'Liquidity flows home to *Base* and *Ethereum mainnet*...',
      '...and to *Solana* and *Robinhood Chain*. Four chains. One less cabal.',
      `Time: *${Math.floor(mins / 60)}h ${mins % 60}m*. Minted: *${S.caught.length}*. Seen: *${S.seen.length}*.`,
      'Partners, not just portraits. Your team belongs in the *Hall of Fame*!',
    ],
    PROF,
  )
  closeText()
  const credits = scene(
    'credits',
    `<div class="cr-roll">
      <h1>REMY QUEST</h1>
      <p>A <b>BASED REMY BOYS</b> adventure</p>
      <h2>STARRING</h2><p>${S.name}</p>${S.party.map((r) => `<p>${remyName(r)}</p>`).join('')}
      <h2>SPECIAL THANKS</h2><p>PROF. GWEI</p><p>JEET (he insisted)</p><p>MAXI THE MARKET MAKER</p>
      <h2>FELLOW TRAVELERS</h2><p>BASE'S BUILDERS</p><p>ETHEREUM MAINNET'S OLD GUARD</p><p>SOLANA'S SPEEDSTERS</p><p>ROBINHOOD CHAIN'S NIGHT OWLS</p>
      <h2>THE REMYS</h2><p>All 4,490 originals</p><p>And everyone who came along</p>
      <p>There is no Cabald.<br>For once, that's good news.</p>
      <h1 class="cr-end">THE END</h1>
      <p class="cr-hint">Thanks for playing!</p>
    </div>`,
  )
  credits.prepend(stage)
  stage.classList.add('cr-mosaic')
  // Roll until "THE END" rests above the menu (measured, so it works on every screen shape).
  const roll = credits.querySelector('.cr-roll') as HTMLElement
  const dist = credits.clientHeight * 0.4 + roll.offsetHeight
  await roll.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-dist}px)` }], {
    duration: Math.max(9000, dist * 22),
    easing: 'linear',
    fill: 'forwards',
  }).finished
  const c = await choose(['KEEP EXPLORING', 'VISIT REMY VAULT'], { cls: 'menu-title' })
  if (c === 1) {
    const url = '/#/vault'
    if (window.top && window.top !== window) window.top.location.href = url
    else window.location.href = url
  }
  await fade(true, 500)
  credits.remove()
  s.remove()
  healParty()
  loadMap('canyon', 12, 9, 'down')
  render()
  audio.play('canyon')
  save()
  await fade(false, 500)
}
