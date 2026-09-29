/** Full-screen story scenes: title, professor intro + naming, starter pick, Hall of Fame. Painting lives in scenestage. */
import { art } from './art'
import { audio } from './audio'
import { REMY_COUNT, TYPE_BLURB, TYPE_COLOR, civRemy, isCabald, makeRemy, remyName, species } from './data'
import { drawRemyActor } from './gfx/remyactor'
import { input } from './input'
import { CAST, rivalStarter, rivalTrainer, starters } from './maps'
import { fontReady, loadSprite } from './scenekit'
import { type Credit, creditsStage, fameStage, introStage, labStage, titleStage } from './scenestage'
import './scenes.css'
import { remyBust, stageStyle, typeBadge } from './skin'
import { S, addItem, defaultAvatar, hasSave, healParty, loadSave, newGame, receiveRemy, save, setState } from './state'
import { ask, choose, closeText, el, fade, say, sleep, talk, uiRoot } from './ui'
import { enterWorld, flag, loadMap, player, render, trainerBattle } from './world'

const PROF = { speaker: 'PROF. GWEI', get portrait() { return CAST.prof } }

function scene(cls: string, html: string) {
  const s = el('div', `scene ${cls}`, html)
  uiRoot.appendChild(s)
  return s
}

const randIdx = () => Math.floor(Math.random() * REMY_COUNT)

// ─────────── Title ───────────

export async function titleScreen() {
  audio.play('title')
  await Promise.all([art.ready, fontReady()])
  const lineup: number[] = []
  while (lineup.length < 4) {
    const idx = civRemy(randIdx())
    if (!lineup.includes(idx)) lineup.push(idx)
  }
  await Promise.all(lineup.map(loadSprite))
  const s = scene('title', '')
  s.setAttribute('aria-label', 'Remy Quest. Press start.')
  const stage = titleStage(s, lineup)
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
  stage.press()
  await sleep(380)
  stage.menu(true)
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
  const s = scene('intro', '')
  const room = introStage(s, CAST.prof)
  await loadSprite(CAST.prof)
  await fade(false, 500)
  // The Prof stands on stage, so the text box only carries the name plate.
  const P = { speaker: PROF.speaker }
  await talk(["I'm *Prof. Gwei*, from Ethereum mainnet. More lab, less gas bill here on *Base*."], P)
  const idx = civRemy(randIdx())
  const summoned = room.summon(idx)
  audio.cry(idx)
  await summoned
  await talk(
    [
      'Meet a *Remy*! Born on Base. Built for more than a profile picture.',
      'Now liquidity is vanishing from every chain. *The Cabald* calls it a bridge. Nothing ever comes back.',
      'Who? Bald heads, gold capes, “There is no Cabald. I love you.” You’ll know them when you see them.',
    ],
    P,
  )
  await room.dismiss()
  await say('First things first. What should I call you?', { ...P, auto: 250 })
  closeText()
  const name = await nameEntry(idx)
  const avatar = await avatarPicker(name)
  setState(newGame(name, avatar))
  await room.summon(avatar)
  await talk([`*${name}*, a fine Remy with a full head of hair. Meet me outside my lab!`], P)
  closeText()
  await room.irisOut()
  await fade(true, 300)
  s.remove()
  await enterWorld()
}

/** GBA naming board: 10 columns; DEL and OK span five, SPACE four. */
const NAME_ROWS: [label: string, span: number][][] = [
  [...'ABCDEFGHIJ'].map((c) => [c, 1] as [string, number]),
  [...'KLMNOPQRST'].map((c) => [c, 1] as [string, number]),
  [...[...'UVWXYZ'].map((c) => [c, 1] as [string, number]), ['SPACE', 4]],
  [...'0123456789'].map((c) => [c, 1] as [string, number]),
  [
    ['DEL', 5],
    ['OK', 5],
  ],
]
const NAME_MAX = 8

/** `icon` is the Remy the Prof just introduced; it walks in place beside the name like the GBA naming screen. */
function nameEntry(icon: number): Promise<string> {
  return new Promise((resolve) => {
    const presets = ['REMY', 'ANON', 'BASED', 'SATO', 'GIGA']
    const keys = NAME_ROWS.flatMap((row, r) => {
      let col = 0
      return row.map(([label, span]) => {
        const key = { label, span, r, col }
        col += span
        return key
      })
    })
    const s = scene(
      'naming',
      `<div class="n-box win lift" role="dialog" aria-label="Your name">
        <div class="n-head"><canvas class="n-icon" width="16" height="24" aria-hidden="true"></canvas><span class="n-title">YOUR NAME?</span></div>
        <div class="n-slots win-inset" aria-hidden="true">${'<span class="n-slot"></span>'.repeat(NAME_MAX)}</div>
        <input class="n-input" aria-label="Trainer name" maxlength="${NAME_MAX}" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done">
        <div class="n-grid">${keys
          .map((k, i) => `<button class="n-key${k.span > 1 ? ' n-wide' : ''}" data-k="${i}" style="grid-column:span ${k.span}" aria-label="${k.label}">${k.label}</button>`)
          .join('')}</div>
        <div class="n-presets">${presets.map((p) => `<button class="pbtn" data-n="${p}">${p}</button>`).join('')}</div>
      </div>`,
    )
    const inp = s.querySelector('.n-input') as HTMLInputElement
    const slots = [...s.querySelectorAll<HTMLElement>('.n-slot')]
    const buttons = [...s.querySelectorAll<HTMLButtonElement>('.n-key')]
    const iconCtx = (s.querySelector('.n-icon') as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D
    let name = ''
    let sel = 0
    let step = 0
    const walker = window.setInterval(() => {
      iconCtx.clearRect(0, 0, 16, 24)
      drawRemyActor(iconCtx, icon, 'down', step++ % 4, 0, 8)
    }, 200)
    const clean = () => (name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim() || 'REMY').slice(0, NAME_MAX)
    const okIndex = keys.findIndex((k) => k.label === 'OK')
    const draw = () => {
      for (const [i, slot] of slots.entries()) {
        slot.textContent = name[i] ?? ''
        slot.classList.toggle('cur', i === name.length)
      }
      for (const [i, b] of buttons.entries()) b.classList.toggle('sel', i === sel)
      inp.value = name
    }
    const type = (ch: string) => {
      if (name.length >= NAME_MAX) return audio.sfx('error')
      name += ch
      audio.sfx('cursor')
      if (name.length === NAME_MAX) sel = okIndex
    }
    const del = () => {
      if (!name) return audio.sfx('error')
      name = name.slice(0, -1)
      audio.sfx('back')
    }
    const done = () => {
      pop()
      window.clearInterval(walker)
      inp.blur()
      audio.sfx('select')
      s.remove()
      resolve(clean())
    }
    const press = (i: number) => {
      const { label } = keys[i]
      if (label === 'OK') return done()
      if (label === 'DEL') del()
      else type(label === 'SPACE' ? ' ' : label)
      draw()
    }
    /** Moves the cursor like the GBA board: rows keep the column, so wide keys catch whatever is under them. */
    const move = (b: 'up' | 'down' | 'left' | 'right') => {
      const cur = keys[sel]
      if (b === 'left' || b === 'right') {
        const row = keys.filter((k) => k.r === cur.r)
        const at = row.indexOf(cur)
        sel = keys.indexOf(row[(at + (b === 'left' ? -1 : 1) + row.length) % row.length])
      } else {
        const r = (cur.r + (b === 'up' ? -1 : 1) + NAME_ROWS.length) % NAME_ROWS.length
        sel = keys.findIndex((k) => k.r === r && cur.col >= k.col && cur.col < k.col + k.span)
      }
      audio.sfx('cursor')
      draw()
    }
    // Keep keyboard focus in the hidden field so desktop typing continues after a click.
    for (const b of s.querySelectorAll('button')) b.addEventListener('pointerdown', (e) => e.preventDefault())
    // Acting on click (not pointerdown) keeps the tap that confirms from landing on the next screen.
    for (const [i, b] of buttons.entries())
      b.addEventListener('click', () => {
        sel = i
        press(i)
      })
    for (const b of s.querySelectorAll<HTMLButtonElement>('[data-n]'))
      b.addEventListener('click', () => {
        name = b.dataset.n as string
        sel = okIndex
        audio.sfx('cursor')
        draw()
      })
    // Physical keyboards type straight into the name; the board's cursor parks on OK so Enter confirms.
    inp.addEventListener('keydown', (e) => {
      const k = e.key
      if (e.metaKey || e.ctrlKey || e.altKey || k === 'Tab') return
      e.preventDefault()
      if (/^[a-z0-9 ]$/i.test(k)) {
        type(k.toUpperCase())
        sel = okIndex
        draw()
      } else if (k === 'Backspace') {
        del()
        draw()
      } else if (k === 'Enter') press(sel)
      else if (k === 'Escape') done()
      else if (k.startsWith('Arrow')) move(k.slice(5).toLowerCase() as 'up' | 'down' | 'left' | 'right')
    })
    const pop = input.push((b) => {
      if (b === 'a') press(sel)
      else if (b === 'b') {
        del()
        draw()
      } else if (b === 'start') done()
      else move(b)
    })
    draw()
    if (!window.matchMedia('(pointer: coarse)').matches) setTimeout(() => inp.focus(), 50)
  })
}

// ─────────── Choose your Remy ───────────

const AV_COLS = 4
const AV_PAGE = 12

/**
 * A browsable shortlist spanning every hair style, type and accessory in the collection, rebuilt from the catalogue
 * so it can never offer a bald (Cabald) Remy even after the catalogue is regenerated.
 */
export function avatarChoices(): number[] {
  const picks: number[] = []
  const buckets = new Map<string, number>()
  for (let pass = 1; pass <= 2 && picks.length < AV_PAGE * 4; pass++) {
    for (let i = 0; i < REMY_COUNT && picks.length < AV_PAGE * 4; i++) {
      const idx = (i * 1597 + 1) % REMY_COUNT
      if (isCabald(idx) || picks.includes(idx)) continue
      const a = art.get(idx)
      const key = `${a.look.hair}|${a.type}|${a.look.extra ?? ''}`
      if ((buckets.get(key) ?? 0) >= pass) continue
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
      picks.push(idx)
    }
  }
  const first = defaultAvatar()
  return [first, ...picks.filter((idx) => idx !== first)]
}

const CABALD_REJECTIONS = [
  'That Remy is bald, which makes them Cabald. There is no Cabald. So, no.',
  'Bald detected. The Cabald says they don’t exist, and they’d like their member back.',
  'Sorry, that head is Cabald property. Please pick someone with hair and plausible deniability.',
]

function avatarPicker(name: string): Promise<number> {
  return new Promise((resolve) => {
    const choices = avatarChoices()
    const pages = Math.ceil(choices.length / AV_PAGE)
    const s = scene(
      'avatar',
      `<div class="av-box" role="dialog" aria-label="Choose your Remy">
        <div class="av-title"></div>
        <div class="av-stage"><div class="av-hero"><canvas class="av-sprite" width="76" height="116" aria-hidden="true"></canvas><canvas class="av-walk" width="16" height="24" aria-hidden="true"></canvas></div>
          <div class="av-meta"><b class="av-name"></b><span class="av-epithet"></span><span class="av-type"></span></div></div>
        <div class="av-grid" role="listbox" aria-label="Suggested Remys"></div>
        <div class="av-tools"><button class="av-prev" aria-label="Previous page">◀</button><span class="av-page"></span><button class="av-next" aria-label="Next page">▶</button>
          <input class="av-num" aria-label="Token number" inputmode="numeric" enterkeyhint="go" maxlength="4" placeholder="#0000" autocomplete="off"><button class="av-random">RANDOM</button></div>
        <div class="av-msg" aria-live="polite"></div>
        <button class="av-ok">THIS IS ME</button></div>`,
    )
    ;(s.querySelector('.av-title') as HTMLElement).textContent = `WHICH REMY ARE YOU, ${name}?`
    const grid = s.querySelector('.av-grid') as HTMLElement
    const hero = s.querySelector('.av-sprite') as HTMLCanvasElement
    const walk = s.querySelector('.av-walk') as HTMLCanvasElement
    const msg = s.querySelector('.av-msg') as HTMLElement
    const num = s.querySelector('.av-num') as HTMLInputElement
    let page = 0
    let sel = 0
    let current = choices[0]
    let dir = 0
    const DIRS = ['down', 'left', 'up', 'right'] as const
    const walker = window.setInterval(() => {
      dir++
      const ctx = walk.getContext('2d') as CanvasRenderingContext2D
      ctx.clearRect(0, 0, 16, 24)
      drawRemyActor(ctx, current, DIRS[Math.floor(dir / 4) % 4], dir % 4, 0, 8)
    }, 220)
    const show = (idx: number) => {
      current = idx
      const a = art.get(idx)
      ;(s.querySelector('.av-name') as HTMLElement).textContent = `REMY #${idx}`
      ;(s.querySelector('.av-epithet') as HTMLElement).textContent = a.epithet
      ;(s.querySelector('.av-type') as HTMLElement).innerHTML = typeBadge(species(idx).type)
      s.style.setProperty('--art-bg', a.palette.bg)
      s.style.setProperty('--art-glow', a.palette.accent)
      ;(s.querySelector('.av-hero') as HTMLElement).setAttribute('style', stageStyle(idx))
      void art.sprite(idx).then((c) => {
        if (current !== idx) return
        const ctx = hero.getContext('2d') as CanvasRenderingContext2D
        ctx.imageSmoothingEnabled = false
        ctx.clearRect(0, 0, hero.width, hero.height)
        ctx.drawImage(c, 0, 0)
      })
    }
    const draw = () => {
      grid.replaceChildren()
      for (const [i, idx] of choices.slice(page * AV_PAGE, (page + 1) * AV_PAGE).entries()) {
        const b = el('button', `av-cell${i === sel ? ' sel' : ''}`)
        b.setAttribute('role', 'option')
        b.setAttribute('aria-selected', String(i === sel))
        b.setAttribute('aria-label', `Remy #${idx}`)
        b.append(remyBust(idx, 32, 32, { backdrop: true }, 'av-mini'), el('span', '', `#${idx}`))
        b.addEventListener('click', () => {
          sel = i
          pick()
        })
        grid.appendChild(b)
      }
      ;(s.querySelector('.av-page') as HTMLElement).textContent = `${page + 1}/${pages}`
    }
    const pick = () => {
      audio.sfx('cursor')
      msg.textContent = ''
      draw()
      show(choices[page * AV_PAGE + sel])
    }
    const turn = (d: number) => {
      page = (page + d + pages) % pages
      sel = Math.min(sel, Math.min(AV_PAGE, choices.length - page * AV_PAGE) - 1)
      pick()
    }
    const random = () => {
      let idx = Math.floor(Math.random() * REMY_COUNT)
      while (isCabald(idx)) idx = Math.floor(Math.random() * REMY_COUNT)
      audio.sfx('select')
      msg.textContent = `Rolled REMY #${idx}. Destiny, or at least Math.random().`
      show(idx)
    }
    const typed = () => {
      num.blur()
      const n = Number(num.value)
      if (!num.value || !Number.isInteger(n) || n < 0 || n >= REMY_COUNT) {
        audio.sfx('error')
        msg.textContent = `Token numbers run from 0 to ${REMY_COUNT - 1}.`
        return
      }
      if (isCabald(n)) {
        audio.sfx('error')
        msg.textContent = `REMY #${n}: ${CABALD_REJECTIONS[n % CABALD_REJECTIONS.length]}`
        return
      }
      audio.sfx('select')
      msg.textContent = ''
      show(n)
    }
    const done = () => {
      pop()
      window.clearInterval(walker)
      num.blur()
      audio.cry(current)
      audio.sfx('select')
      s.remove()
      resolve(current)
    }
    num.addEventListener('input', () => {
      num.value = num.value.replace(/\D/g, '').slice(0, 4)
    })
    num.addEventListener('change', typed)
    s.querySelector('.av-prev')?.addEventListener('click', () => turn(-1))
    s.querySelector('.av-next')?.addEventListener('click', () => turn(1))
    s.querySelector('.av-random')?.addEventListener('click', random)
    s.querySelector('.av-ok')?.addEventListener('click', done)
    const pop = input.push((b) => {
      const onPage = Math.min(AV_PAGE, choices.length - page * AV_PAGE)
      if (b === 'a' || b === 'start') return done()
      if (b === 'b') return random()
      if (b === 'left' && sel % AV_COLS === 0) return turn(-1)
      if (b === 'right' && (sel % AV_COLS === AV_COLS - 1 || sel === onPage - 1)) return turn(1)
      const next = sel + ({ left: -1, right: 1, up: -AV_COLS, down: AV_COLS } as Record<string, number>)[b]
      if (next >= 0 && next < onPage) {
        sel = next
        pick()
      }
    })
    draw()
    show(current)
  })
}

// ─────────── Starter selection (Prof's lab) ───────────

export async function starterScene() {
  await fade(true, 300)
  const s = scene('lab', '')
  const STARTERS = starters()
  const types = STARTERS.map((idx) => species(idx).type)
  const cards = STARTERS.map((idx, i) => {
    const c = el('div', 'st-card', typeBadge(types[i]))
    c.setAttribute('role', 'button')
    c.setAttribute('aria-label', `REMY #${idx}, ${types[i]} type`)
    s.appendChild(c)
    return c
  })
  labStage(s, STARTERS, cards, types.map((t) => TYPE_COLOR[t]))
  await Promise.all(STARTERS.map(loadSprite))
  await fade(false, 300)
  // The four starters stand on stage, so dialogue here carries name plates only: no portrait over the plinths.
  const P = { speaker: PROF.speaker }
  await talk(['Four *Cold Wallets*. Four future legends. Which Remy is coming with you?'], P)
  let sel = 0
  let picked = -1
  while (picked < 0) {
    const i = await pickCard(cards, sel)
    sel = i
    const idx = STARTERS[i]
    const t = species(idx).type
    audio.cry(idx)
    await say(`*REMY #${idx}*, the ${t} type. ${TYPE_BLURB[t]}`, P)
    // The standard YES/NO box would sit on top of the plinths; the lab tucks a compact row into the text box instead.
    await say(`Pick REMY #${idx}?`, { ...P, noWait: true })
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
  await talk(["Wait! You saved the best one for me, right?"], { speaker: 'JEET' })
  cards[ri].classList.add('taken')
  audio.cry(rival)
  await say(`JEET chose *REMY #${rival}*!`)
  await talk(["Mine *counters* yours. That's research, {P}. Let's battle!"], { speaker: 'JEET' })
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
    const draw = () => cards.forEach((c, i) => c.classList.toggle('sel', i === sel))
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
  const s = scene('hof', '')
  const hall = fameStage(
    s,
    S.party.map((r) => ({ idx: r.idx, name: remyName(r), level: r.level })),
  )
  await Promise.all(S.party.map((r) => loadSprite(r.idx)))
  await fade(false, 800, '#fff')
  await hall.dedicate([...new Set([...S.party.map((r) => r.idx), ...S.caught, ...S.seen])])
  for (const [i, r] of S.party.entries()) {
    audio.cry(r.idx)
    await hall.induct(i)
  }
  await sleep(500)
  const mins = Math.floor(S.playMs / 60000)
  // The party stands on the shelf, so the Prof speaks with a name plate only.
  await talk(
    [
      `*${S.name}*, you broke the Cabald's pipeline! *RUG LORD* is finished.`,
      'Liquidity flows home to *Base* and *Ethereum mainnet*...',
      '...and to *Solana* and *Robinhood Chain*. Four chains. One less cabal.',
      `Time: *${Math.floor(mins / 60)}h ${mins % 60}m*. Minted: *${S.caught.length}*. Seen: *${S.seen.length}*.`,
      'Partners, not just portraits. Your team belongs in the *Hall of Fame*!',
    ],
    { speaker: PROF.speaker },
  )
  closeText()
  const lines: Credit[] = [
    ['logo', 'REMY QUEST'],
    ['p', 'A BASED REMY BOYS adventure'],
    ['h2', 'STARRING'],
    ['p', S.name],
    ...S.party.map((r): Credit => ['p', remyName(r)]),
    ['h2', 'SPECIAL THANKS'],
    ['p', 'PROF. GWEI'],
    ['p', 'JEET (he insisted)'],
    ['p', 'MAXI THE MARKET MAKER'],
    ['h2', 'FELLOW TRAVELERS'],
    ['p', "BASE'S BUILDERS"],
    ['p', "ETHEREUM MAINNET'S OLD GUARD"],
    ['p', "SOLANA'S SPEEDSTERS"],
    ['p', "ROBINHOOD CHAIN'S NIGHT OWLS"],
    ['h2', 'THE REMYS'],
    ['p', 'All 4,490 originals'],
    ['p', 'And everyone who came along'],
    ['gap', ''],
    ['p', 'There is no Cabald.'],
    ['p', "For once, that's good news."],
    ['gap', ''],
    ['h1', 'THE END'],
    ['p', 'Thanks for playing!'],
  ]
  const credits = scene('credits', '')
  s.remove()
  await creditsStage(credits, lines, [S.avatar, ...S.party.map((r) => r.idx)], () => input.held('a'))
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
