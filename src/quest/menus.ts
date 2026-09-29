/** Full-screen panels: party, summary, bag, Remydex, shop, cold storage, trainer card, start menu. */
import { art } from './art'
import { audio } from './audio'
import {
  ITEM_ORDER,
  ITEMS,
  type ItemId,
  MOVES,
  REMY_COUNT,
  type Remy,
  TYPE_BLURB,
  TYPE_COLOR,
  artSrc,
  remyName,
  species,
  statsOf,
  xpForLevel,
} from './data'
import { dexScreen, holoCard, miniPortrait, pickFavorite } from './dex'
import { input } from './input'
import { MAPS } from './maps'
import { S, addItem, save, takeItem, useItemOn } from './state'
import { choose, closeText, el, fmt, itemIcon, say, uiRoot } from './ui'
import { view } from './view'

export const typeBadge = (t: string) => `<span class="type" style="background:${TYPE_COLOR[t as keyof typeof TYPE_COLOR]}">${t}</span>`

export function hpBar(hp: number, max: number) {
  const f = Math.max(0, hp / max)
  return `<div class="hpbar"><i class="${f <= 0.2 ? 'low' : f <= 0.5 ? 'mid' : ''}" style="width:${(f * 100).toFixed(1)}%"></i></div>`
}

export function portrait(r: { idx: number; gold?: boolean }, cls = '') {
  const t = species(r.idx).type
  return `<div class="pf ${r.gold ? 'gold' : ''} ${cls}" style="--rim:${TYPE_COLOR[t]}"><img src="${artSrc(r.idx)}" alt="" draggable="false"></div>`
}

interface NavOpts {
  cols: () => number
  start?: number
  onMove?: (i: number) => void
  onPick: (i: number) => void
  onCancel?: () => void
  onKey?: (b: string, i: number) => boolean
}

interface NavCtl {
  pop(): void
  readonly sel: number
}

/** Grid/list navigation over `items` with focus-stack input and tap support. */
function nav(items: HTMLElement[], o: NavOpts): NavCtl {
  let sel = Math.min(o.start ?? 0, Math.max(0, items.length - 1))
  const draw = () => {
    items.forEach((it, i) => it.classList.toggle('sel', i === sel))
    items[sel]?.scrollIntoView?.({ block: 'nearest' })
    o.onMove?.(sel)
  }
  items.forEach((it, i) =>
    it.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (sel !== i) {
        sel = i
        audio.sfx('cursor')
        draw()
        return
      }
      o.onPick(i)
    }),
  )
  draw()
  const pop = input.push((b) => {
    if (o.onKey?.(b, sel)) return
    const c = o.cols()
    const n = items.length
    let next = sel
    if (b === 'up') next = sel - c
    else if (b === 'down') next = sel + c
    else if (b === 'left' && c > 1) next = sel - 1
    else if (b === 'right' && c > 1) next = sel + 1
    else if (b === 'a') return n ? o.onPick(sel) : undefined
    else if (b === 'b' || b === 'start') {
      if (o.onCancel) {
        audio.sfx('back')
        o.onCancel()
      }
      return
    }
    if (next !== sel && next >= 0 && next < n) {
      sel = next
      audio.sfx('cursor')
      draw()
    }
  })
  return {
    pop,
    get sel() {
      return sel
    },
  }
}

function openPanel(title: string, right = '') {
  const p = el('div', 'panel', `<div class="panel-head"><span>${title}</span><span class="panel-right">${right}</span></div><div class="panel-body"></div><div class="panel-foot"></div>`)
  uiRoot.appendChild(p)
  return {
    p,
    body: p.querySelector('.panel-body') as HTMLElement,
    foot: p.querySelector('.panel-foot') as HTMLElement,
    right: p.querySelector('.panel-right') as HTMLElement,
    close: () => {
      p.classList.add('closing')
      setTimeout(() => p.remove(), 120)
    },
  }
}

const cols2 = () => (view.H > view.W * 0.8 ? 1 : 2)

function partyRow(r: Remy, i: number) {
  const st = statsOf(r)
  const row = el('div', `prow ${r.hp <= 0 ? 'fainted' : ''} ${i === 0 ? 'lead' : ''}`)
  row.innerHTML = `${portrait(r, 'pf-sm')}<div class="prow-info"><div class="prow-name">${remyName(r)}</div><div class="prow-meta">${typeBadge(species(r.idx).type)}<span class="lv">Lv${r.level}</span></div>${hpBar(r.hp, st.hp)}<div class="prow-hp">${r.hp <= 0 ? '<b>FAINTED</b>' : ''}<span>${Math.max(0, r.hp)}/${st.hp}</span></div></div>`
  return row
}

export type PartyMode = 'field' | 'switch' | 'forced' | 'item'

export function partyScreen(o: { mode: PartyMode; active?: number; item?: ItemId; prompt?: string }): Promise<number> {
  return new Promise((resolve) => {
    const title = o.mode === 'item' && o.item ? `USE ${ITEMS[o.item].name.toUpperCase()}` : 'REMYS'
    const P = openPanel(title, `<small>${S.party.length}/6</small>`)
    const grid = el('div', 'party-grid')
    P.body.appendChild(grid)
    let swapFrom = -1
    let rows: HTMLElement[] = []
    let navCtl: NavCtl | null = null
    const prompt = () => {
      if (o.prompt) return o.prompt
      if (swapFrom >= 0) return 'Move to which spot?'
      if (o.mode === 'item') return 'Use on which Remy?'
      if (o.mode === 'forced') return 'Choose the next Remy to send out!'
      if (o.mode === 'switch') return 'Switch to which Remy?'
      return 'Choose a Remy.'
    }
    const render = (start: number) => {
      navCtl?.pop()
      grid.innerHTML = ''
      rows = S.party.map((r, i) => {
        const row = partyRow(r, i)
        if (i === swapFrom) row.classList.add('swapping')
        grid.appendChild(row)
        return row
      })
      P.foot.innerHTML = fmt(prompt())
      navCtl = nav(rows, { cols: cols2, start, onPick, onCancel: o.mode === 'forced' ? undefined : cancel })
    }
    const finish = (i: number) => {
      navCtl?.pop()
      P.close()
      resolve(i)
    }
    const cancel = () => {
      if (swapFrom >= 0) {
        swapFrom = -1
        render(navCtl?.sel ?? 0)
        return
      }
      finish(-1)
    }
    const onPick = async (i: number) => {
      audio.sfx('select')
      const r = S.party[i]
      if (swapFrom >= 0) {
        const tmp = S.party[swapFrom]
        S.party[swapFrom] = S.party[i]
        S.party[i] = tmp
        swapFrom = -1
        render(i)
        return
      }
      if (o.mode === 'item') return finish(i)
      navCtl?.pop()
      const opts =
        o.mode === 'field' ? ['SUMMARY', 'SWITCH', 'CANCEL'] : ['SEND OUT', 'SUMMARY', 'CANCEL']
      const c = await choose(opts, { cancel: 2, cls: 'menu-right menu-panel' })
      const pick = opts[c]
      if (pick === 'SUMMARY') {
        const at = await summaryScreen(i)
        render(at)
      } else if (pick === 'SWITCH') {
        swapFrom = i
        render(i)
      } else if (pick === 'SEND OUT') {
        if (r.hp <= 0) {
          P.foot.innerHTML = fmt(`${remyName(r)} has fainted!`)
          audio.sfx('error')
          navCtl = nav(rows, { cols: cols2, start: i, onPick, onCancel: o.mode === 'forced' ? undefined : cancel })
        } else if (i === o.active) {
          P.foot.innerHTML = fmt(`${remyName(r)} is already in battle!`)
          audio.sfx('error')
          navCtl = nav(rows, { cols: cols2, start: i, onPick, onCancel: o.mode === 'forced' ? undefined : cancel })
        } else finish(i)
      } else render(i)
    }
    // Switching: start on the first Remy that can actually be sent out.
    const valid = S.party.findIndex((r, i) => r.hp > 0 && i !== o.active)
    render(o.mode === 'switch' || o.mode === 'forced' ? Math.max(0, valid) : (o.active ?? 0))
  })
}

export function summaryScreen(start: number): Promise<number> {
  return new Promise((resolve) => {
    let i = start
    const P = openPanel('SUMMARY')
    P.p.classList.add('summary')
    const draw = () => {
      const r = S.party[i]
      const sp = species(r.idx)
      const st = statsOf(r)
      const next = xpForLevel(r.level + 1)
      const cur = xpForLevel(r.level)
      const f = Math.min(1, (r.xp - cur) / (next - cur))
      P.right.innerHTML = `<button class="collection-back" data-summary="-1">◀</button> <small>${i + 1}/${S.party.length}</small> <button class="collection-back" data-summary="1">▶</button> <button class="collection-back" data-summary="0">BACK</button>`
      P.body.innerHTML = `
        <div class="sum">
          <div class="sum-card">${portrait(r, 'pf-lg')}<div class="sum-name">${remyName(r)}</div><div class="sum-meta">${typeBadge(sp.type)} <span class="lv">Lv${r.level}</span></div></div>
          <div class="sum-info">
            <div class="sum-stats">
              <div><span>HP</span><b>${Math.max(0, r.hp)}/${st.hp}</b></div>${hpBar(r.hp, st.hp)}
              <div><span>ATTACK</span><b>${st.atk}</b></div>
              <div><span>DEFENSE</span><b>${st.def}</b></div>
              <div><span>SPEED</span><b>${st.spd}</b></div>
              <div><span>NEXT LV</span><b>${Math.max(0, next - r.xp)} XP</b></div>
              <div class="xpbar"><i style="width:${(f * 100).toFixed(1)}%"></i></div>
            </div>
            <div class="sum-moves">${r.moves
              .map((m) => {
                const mv = MOVES[m.id]
                return `<div class="mv" style="--c:${TYPE_COLOR[mv.type]}"><b>${mv.name}</b><span>${mv.power ? `PWR ${mv.power}` : 'STATUS'}</span><span>PP ${m.pp}/${mv.pp}</span></div>`
              })
              .join('')}</div>
          </div>
        </div>`
      P.body.querySelector('.sum-card .pf')?.replaceWith(holoCard(r.idx))
      P.p.style.setProperty('--art-bg', art.get(r.idx).palette.bg)
      const swatches = el('div', 'detail-swatches')
      for (const color of Object.values(art.get(r.idx).palette)) {
        const swatch = el('i')
        swatch.style.background = color
        swatches.appendChild(swatch)
      }
      P.body.querySelector('.sum-card')?.appendChild(swatches)
      const where = r.caughtAt && (MAPS[r.caughtAt]?.name ?? r.caughtAt)
      P.foot.innerHTML = fmt(`${TYPE_BLURB[sp.type]}${where ? ` Minted at *${where}*.` : ''}`)
    }
    draw()
    P.right.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest<HTMLElement>('[data-summary]')
      if (!button) return
      const step = Number(button.dataset.summary)
      if (step) {
        i = (i + step + S.party.length) % S.party.length
        audio.sfx('cursor')
        draw()
      } else {
        pop()
        audio.sfx('back')
        P.close()
        resolve(i)
      }
    })
    const pop = input.push((b) => {
      if (b === 'up' || b === 'down') {
        P.body.scrollBy({ top: b === 'up' ? -60 : 60, behavior: 'smooth' })
      } else if ((b === 'left' || b === 'right') && S.party.length > 1) {
        i = (i + (b === 'left' ? -1 : 1) + S.party.length) % S.party.length
        audio.sfx('cursor')
        draw()
      } else if (b === 'a' || b === 'b' || b === 'start') {
        pop()
        audio.sfx('back')
        P.close()
        resolve(i)
      }
    })
  })
}

const usableIn = (id: ItemId, ctx: 'field' | 'battle') => ctx === 'battle' || ITEMS[id].kind !== 'ball'

export function bagScreen(ctx: 'field' | 'battle'): Promise<ItemId | null> {
  return new Promise((resolve) => {
    const P = openPanel('BAG', `<small>${S.money.toLocaleString()} $REMY</small>`)
    const list = el('div', 'bag-list')
    P.body.appendChild(list)
    const ids = ITEM_ORDER.filter((id) => (S.bag[id] ?? 0) > 0)
    const rows = ids.map((id) => {
      const row = el('div', `bag-row ${usableIn(id, ctx) ? '' : 'dim'}`, `${itemIcon(id)}<span class="bag-name">${ITEMS[id].name}</span><span class="bag-n">×${S.bag[id]}</span>`)
      list.appendChild(row)
      return row
    })
    if (!ids.length) list.innerHTML = '<div class="empty">Your bag is empty. Visit a Remy Mart.</div>'
    const done = (v: ItemId | null) => {
      ctl.pop()
      P.close()
      resolve(v)
    }
    const ctl = nav(rows, {
      cols: () => 1,
      onMove: (i) => {
        P.foot.innerHTML = ids[i] ? fmt(ITEMS[ids[i]].desc) : ''
      },
      onPick: (i) => {
        const id = ids[i]
        if (!usableIn(id, ctx)) {
          audio.sfx('error')
          P.foot.innerHTML = fmt('Use this in a *wild Remy* battle.')
          return
        }
        audio.sfx('select')
        done(id)
      },
      onCancel: () => done(null),
    })
    if (!ids.length) P.foot.innerHTML = 'Press B to close.'
  })
}

/** Field bag flow: pick → target → apply. */
export async function fieldBag() {
  for (;;) {
    const id = await bagScreen('field')
    if (!id) return
    const t = await partyScreen({ mode: 'item', item: id })
    if (t < 0) continue
    const msg = useItemOn(id, S.party[t])
    if (!msg) {
      audio.sfx('error')
      await say('It won\u2019t have any effect.')
      closeText()
      continue
    }
    takeItem(id)
    audio.sfx('heal')
    await say(msg)
    closeText()
  }
}


export function shopScreen(): Promise<void> {
  return new Promise((resolve) => {
    const P = openPanel('REMY MART', '')
    const money = () => {
      P.right.innerHTML = `<small>${S.money.toLocaleString()} $REMY</small>`
    }
    money()
    const list = el('div', 'bag-list')
    P.body.appendChild(list)
    const rows = ITEM_ORDER.map((id) => {
      const row = el('div', 'bag-row', `${itemIcon(id)}<span class="bag-name">${ITEMS[id].name}</span><span class="bag-have">×${S.bag[id] ?? 0}</span><span class="bag-n">$${ITEMS[id].price}</span>`)
      list.appendChild(row)
      return row
    })
    let busy = false
    const done = () => {
      ctl.pop()
      P.close()
      resolve()
    }
    const ctl = nav(rows, {
      cols: () => 1,
      onMove: (i) => {
        if (!busy) P.foot.innerHTML = fmt(ITEMS[ITEM_ORDER[i]].desc)
      },
      onPick: async (i) => {
        if (busy) return
        const id = ITEM_ORDER[i]
        const price = ITEMS[id].price
        if (S.money < price) {
          audio.sfx('error')
          P.foot.innerHTML = fmt('Not enough *$REMY* for this item.')
          return
        }
        audio.sfx('select')
        busy = true
        const qty = await quantity(P.foot, id, price)
        busy = false
        if (qty > 0) {
          S.money -= qty * price
          addItem(id, qty)
          audio.sfx('money')
          money()
          if (id === 'wallet' && qty >= 10) addItem('ledger', 1)
          for (const [k, row] of rows.entries()) {
            const have = row.querySelector('.bag-have')
            if (have) have.textContent = `×${S.bag[ITEM_ORDER[k]] ?? 0}`
          }
          P.foot.innerHTML = fmt(
            id === 'wallet' && qty >= 10
              ? `Bought ${qty} *Cold Wallets*! Bonus: one *Ledger Pro*.`
              : `Bought ${qty} × *${ITEMS[id].name}*. Thanks!`,
          )
        } else P.foot.innerHTML = fmt(ITEMS[id].desc)
      },
      onCancel: () => {
        if (!busy) done()
      },
    })
  })
}

/** Inline quantity picker in the footer. Resolves 0 on cancel. */
function quantity(foot: HTMLElement, id: ItemId, price: number): Promise<number> {
  return new Promise((resolve) => {
    const max = Math.max(1, Math.min(99, Math.floor(S.money / price)))
    let q = 1
    const draw = () => {
      foot.innerHTML = `<div class="qty"><span>${ITEMS[id].name}</span><button class="q-dn">▼</button><b>×${String(q).padStart(2, '0')}</b><button class="q-up">▲</button><span class="qty-total">$${(q * price).toLocaleString()}</span><button class="q-ok">BUY</button></div>`
      foot.querySelector('.q-dn')?.addEventListener('pointerdown', (e) => {
        e.stopPropagation()
        step(-1)
      })
      foot.querySelector('.q-up')?.addEventListener('pointerdown', (e) => {
        e.stopPropagation()
        step(1)
      })
      foot.querySelector('.q-ok')?.addEventListener('pointerdown', (e) => {
        e.stopPropagation()
        end(q)
      })
    }
    const step = (d: number) => {
      q = ((q - 1 + d + max) % max) + 1
      audio.sfx('cursor')
      draw()
    }
    const end = (v: number) => {
      pop()
      resolve(v)
    }
    draw()
    const pop = input.push((b) => {
      if (b === 'up' || b === 'right') step(b === 'up' ? 1 : 10)
      else if (b === 'down' || b === 'left') step(b === 'down' ? -1 : -10)
      else if (b === 'a') end(q)
      else if (b === 'b') {
        audio.sfx('back')
        end(0)
      }
    })
  })
}

/** Cold Storage (the PC): deposit / withdraw Remys. */
export async function storageScreen() {
  for (;;) {
    await say('*Cold Storage*\nWithdraw or deposit a Remy?', { noWait: true })
    const c = await choose(['WITHDRAW', 'DEPOSIT', 'LOG OFF'], { cancel: 2 })
    if (c === 2) return closeText()
    closeText()
    if (c === 0) {
      if (!S.storage.length) {
        await say('Cold Storage is empty. Mint more Remys!')
        continue
      }
      const pick = await storagePick()
      if (pick < 0) continue
      const r = S.storage[pick]
      if (S.party.length < 6) {
        S.storage.splice(pick, 1)
        S.party.push(r)
        audio.sfx('select')
        await say(`Withdrew ${remyName(r)}.`)
      } else {
        await say('Your party is full. Swap with which Remy?')
        closeText()
        const t = await partyScreen({ mode: 'item', prompt: 'Swap out which Remy?' })
        if (t < 0) continue
        S.storage[pick] = S.party[t]
        S.party[t] = r
        audio.sfx('select')
        await say(`Swapped in ${remyName(r)}!`)
      }
    } else {
      if (S.party.length <= 1) {
        await say('You can\u2019t deposit your last Remy!')
        continue
      }
      const t = await partyScreen({ mode: 'item', prompt: 'Deposit which Remy?' })
      if (t < 0) continue
      const r = S.party[t]
      if (!S.party.some((x, i) => i !== t && x.hp > 0)) {
        await say('You need at least one Remy that can battle!')
        continue
      }
      S.party.splice(t, 1)
      S.storage.push(r)
      audio.sfx('select')
      await say(`${remyName(r)} is now in Cold Storage.`)
    }
  }
}

function storagePick(): Promise<number> {
  return new Promise((resolve) => {
    const P = openPanel('COLD STORAGE', `<small>${S.storage.length} REMYS</small>`)
    const grid = el('div', 'party-grid')
    P.body.appendChild(grid)
    const rows = S.storage.map((r, i) => {
      const row = partyRow(r, i)
      row.classList.remove('lead')
      grid.appendChild(row)
      return row
    })
    P.foot.innerHTML = 'Withdraw which Remy?'
    const done = (v: number) => {
      ctl.pop()
      P.close()
      resolve(v)
    }
    const ctl = nav(rows, { cols: cols2, onPick: (i) => done(i), onCancel: () => done(-1) })
  })
}

const fmtTime = (ms: number) => {
  const m = Math.floor(ms / 60000)
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

export function cardScreen(): Promise<void> {
  // ES2022/iPhone target does not provide Promise.withResolvers.
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  const P = openPanel('TRAINER CARD')
  P.p.classList.add('tcard-panel')
  let busy = false
  let selected = 0
  const badges = [
    ['badge_mm', 'MARKET MAKER'],
    ['badge_rug', 'RUG SLAYER'],
  ]
  const favorite = () => {
    const flag = Object.keys(S.flags).find((key) => key.startsWith('fav:') && S.caught.includes(Number(key.slice(4))))
    return flag ? Number(flag.slice(4)) : (S.caught[0] ?? S.party[0]?.idx ?? 0)
  }
  const draw = () => {
    const idx = favorite()
    P.body.innerHTML = `
      <div class="tcard">
        <div class="tcard-top"><span>BASE</span><span>ID ${String((S.name.length * 7919 + 1234) % 100000).padStart(5, '0')}</span></div>
        <div class="tcard-main">
          <div class="trainer-favorite"></div>
          <div class="tcard-rows">
            <div><span>NAME</span><b class="trainer-name"></b></div>
            <div><span>$REMY</span><b>${S.money.toLocaleString()}</b></div>
            <div><span>REMYDEX</span><b>${S.caught.length}/${REMY_COUNT.toLocaleString()}</b></div>
            <div><span>TIME</span><b>${fmtTime(S.playMs)}</b></div>
          </div>
        </div>
        <div class="tcard-badges">${badges.map(([f, n]) => `<div class="badge ${S.flags[f] ? 'on' : ''}"><i></i><span>${n}</span></div>`).join('')}</div>
        <div class="collection-eyebrow">RECENT MINTS / YOUR CREW</div>
        <div class="trainer-mosaic"></div>
        <div class="trainer-actions"><button class="collection-primary">FAVORITE</button><button class="collection-back">CLOSE</button></div>
      </div>`
    const trainerName = P.body.querySelector('.trainer-name') as HTMLElement
    trainerName.textContent = S.name
    const portraitHost = P.body.querySelector('.trainer-favorite') as HTMLElement
    portraitHost.appendChild(holoCard(idx))
    portraitHost.appendChild(el('small', '', `FAVORITE #${idx}`))
    const mosaic = P.body.querySelector('.trainer-mosaic') as HTMLElement
    for (const recent of S.caught.slice(-8).reverse()) mosaic.appendChild(miniPortrait(recent))
    if (!S.caught.length) mosaic.textContent = 'Your first mint starts the story.'
    P.body.querySelector('.collection-primary')?.addEventListener('click', () => void chooseFavorite())
    P.body.querySelector('.collection-back')?.addEventListener('click', done)
    P.body.querySelectorAll('.trainer-actions button').forEach((button, i) => button.classList.toggle('sel', selected === i))
    P.foot.textContent = '←→ · CHOOSE   A · SELECT   B · BACK'
  }
  const chooseFavorite = async () => {
    if (busy) return
    if (!S.caught.length) {
      audio.sfx('error')
      P.foot.textContent = 'Mint a Remy first to choose your favorite.'
      return
    }
    busy = true
    const idx = await pickFavorite()
    if (idx !== null) {
      for (const key of Object.keys(S.flags)) if (key.startsWith('fav:')) delete S.flags[key]
      S.flags[`fav:${idx}`] = true
      save()
      audio.sfx('save')
    }
    busy = false
    draw()
  }
  const done = () => {
    if (busy) return
    pop()
    audio.sfx('back')
    P.close()
    resolve()
  }
  const pop = input.push((b) => {
    if (busy) return
    if (b === 'b' || b === 'start') done()
    else if (b === 'a') {
      if (selected === 0) void chooseFavorite()
      else done()
    } else if (b === 'left' || b === 'right') {
      selected = 1 - selected
      P.body.querySelectorAll('.trainer-actions button').forEach((button, i) => button.classList.toggle('sel', selected === i))
      audio.sfx('cursor')
    } else if (b === 'up' || b === 'down') P.body.scrollBy({ top: b === 'up' ? -60 : 60, behavior: 'smooth' })
  })
  draw()
  return promise
}

/** START menu in the overworld. */
export async function startMenu() {
  let start = 0
  for (;;) {
    const opts = [
      ...(S.party.length ? ['REMYS'] : []),
      'BAG',
      ...(S.flags.dex ? ['REMYDEX'] : []),
      'TRAINER CARD',
      'SAVE',
      `SOUND ${audio.muted ? 'OFF' : 'ON'}`,
      'EXIT',
    ]
    const c = await choose(opts, { cancel: opts.length - 1, cls: 'menu-start', start })
    start = c
    const pick = opts[c]
    if (pick === 'EXIT') return
    if (pick === 'REMYS') await partyScreen({ mode: 'field' })
    else if (pick === 'BAG') await fieldBag()
    else if (pick === 'REMYDEX') await dexScreen()
    else if (pick === 'TRAINER CARD') await cardScreen()
    else if (pick === 'SAVE') {
      save()
      audio.sfx('save')
      await say('Game saved on this device.\nYour adventure stays in this browser.')
      closeText()
    } else if (pick.startsWith('SOUND')) audio.setMuted(!audio.muted)
  }
}
