/** Full-screen panels: party, summary, bag, shop, cold storage, trainer card, start menu. */
import { audio } from './audio'
import {
  ITEM_ORDER,
  ITEMS,
  type ItemId,
  MOVES,
  type Remy,
  TYPE_BLURB,
  mintableCount,
  remyName,
  species,
  statsOf,
  xpForLevel,
} from './data'
import { dexScreen, pickFavorite } from './dex'
import { input, tap } from './input'
import { MAPS } from './maps'
import { icon, remyBust, remySprite, stageStyle, typeBadge } from './skin'
import { S, addItem, cycleTextSpeed, prefs, save, takeItem, useItemOn } from './state'
import { ask, choose, closeText, el, fmt, itemIcon, say, uiRoot } from './ui'
import { view } from './view'
import { viewArt } from './viewer'

export { typeBadge }

/** HP bar in whole pixels; color steps at the classic 50% / 20% thresholds. */
export function hpBar(hp: number, max: number) {
  const f = Math.max(0, Math.min(1, hp / max))
  return `<div class="hp"><b><i class="${f <= 0.2 ? 'low' : f <= 0.5 ? 'mid' : ''}" style="--f:${f.toFixed(3)}"></i></b></div>`
}

const xpBar = (f: number) => `<div class="xp"><b><i style="--f:${Math.max(0, Math.min(1, f)).toFixed(3)}"></i></b></div>`

const isTall = () => view.H > view.W * 0.8

interface NavOpts {
  cols: () => number
  start?: number
  onMove?: (i: number) => void
  onPick: (i: number) => void
  onCancel?: () => void
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

interface Panel {
  p: HTMLElement
  body: HTMLElement
  foot: HTMLElement
  /** Replaces the right-hand info while keeping the back button. */
  setRight(html: string): void
  close(): void
}

/** Wallpapered full-screen panel: title strip (icon + title + right info + tappable B), body, cream help window. */
function openPanel(title: string, right = '', ico = ''): Panel {
  const p = el(
    'div',
    'panel',
    `<div class="panel-head"><span>${ico ? icon(ico) : ''}${title}</span><span class="panel-right">${right}<button class="pbtn panel-x" aria-label="Back">B</button></span></div><div class="panel-body"></div><div class="panel-foot"></div>`,
  )
  p.querySelector('.panel-x')?.addEventListener('click', () => tap('b'))
  uiRoot.appendChild(p)
  const rightEl = p.querySelector('.panel-right') as HTMLElement
  return {
    p,
    body: p.querySelector('.panel-body') as HTMLElement,
    foot: p.querySelector('.panel-foot') as HTMLElement,
    setRight: (html: string) => {
      const x = rightEl.querySelector('.panel-x') as HTMLElement
      rightEl.innerHTML = html
      rightEl.append(x)
    },
    close: () => {
      p.classList.add('closing')
      setTimeout(() => p.remove(), 100)
    },
  }
}

function partySlot(r: Remy, lead: boolean): HTMLElement {
  const st = statsOf(r)
  const slot = el('div', `pslot ring${lead ? ' lead' : ''}${r.hp <= 0 ? ' fainted' : ''}`)
  slot.innerHTML = `<div class="nm">${remyName(r)}</div>${typeBadge(species(r.idx).type)}<div class="row2"><span class="lv">${r.level}</span>${hpBar(r.hp, st.hp)}<span class="num">${Math.max(0, r.hp)}/${st.hp}</span></div>`
  const [w, h] = lead ? (isTall() ? [44, 40] : [64, 72]) : [26, 24]
  slot.prepend(remyBust(r.idx, w, h, { backdrop: lead }))
  return slot
}

/** Emerald-style party layout: the lead on the left (on top when tall), the rest stacked, empty slots dashed. */
function partyLayout(host: HTMLElement, list: Remy[], leadFirst: boolean): HTMLElement[] {
  host.innerHTML = ''
  const slots = list.map((r, i) => partySlot(r, leadFirst && i === 0))
  host.append(...slots)
  if (leadFirst) for (let i = list.length; i < 6; i++) host.appendChild(el('div', 'party-empty', '— — —'))
  return slots
}

const partyCols = () => (isTall() ? 1 : 2)

export type PartyMode = 'field' | 'switch' | 'forced' | 'item'

export function partyScreen(o: { mode: PartyMode; active?: number; item?: ItemId; prompt?: string }): Promise<number> {
  return new Promise((resolve) => {
    const title = o.mode === 'item' && o.item ? `USE ${ITEMS[o.item].name.toUpperCase()}` : 'REMYS'
    const P = openPanel(title, `<small>${S.party.length}/6</small>`, 'party')
    const grid = el('div', 'party')
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
      rows = partyLayout(grid, S.party, true)
      if (swapFrom >= 0) rows[swapFrom]?.classList.add('swapping')
      P.foot.innerHTML = fmt(prompt())
      // The lead spans the left column and the rest stack beside it, so the order is one list: up/down walk it.
      navCtl = nav(rows, { cols: () => 1, start, onPick, onCancel: o.mode === 'forced' ? undefined : cancel })
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
      const opts = o.mode === 'field' ? ['SUMMARY', 'SWITCH', 'CANCEL'] : ['SEND OUT', 'SUMMARY', 'CANCEL']
      P.foot.innerHTML = fmt(`Do what with *${remyName(r)}*?`)
      const c = await choose(opts, { cancel: 2, cls: 'menu-right menu-panel' })
      const pick = opts[c]
      if (pick === 'SUMMARY') {
        const at = await summaryScreen(i)
        render(at)
      } else if (pick === 'SWITCH') {
        swapFrom = i
        render(i)
      } else if (pick === 'SEND OUT') {
        if (r.hp <= 0 || i === o.active) {
          render(i)
          P.foot.innerHTML = fmt(r.hp <= 0 ? `${remyName(r)} has fainted!` : `${remyName(r)} is already in battle!`)
          audio.sfx('error')
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
    let busy = false
    const P = openPanel('SUMMARY', '', 'party')
    const draw = () => {
      const r = S.party[i]
      const sp = species(r.idx)
      const st = statsOf(r)
      const next = xpForLevel(r.level + 1)
      const cur = xpForLevel(r.level)
      const many = S.party.length > 1
      P.setRight(
        many
          ? `<button class="pbtn" data-step="-1" aria-label="Previous">◀</button><small>${i + 1}/${S.party.length}</small><button class="pbtn" data-step="1" aria-label="Next">▶</button>`
          : '',
      )
      const moves = Array.from({ length: 4 }, (_, k) => r.moves[k])
      P.body.innerHTML = `
        <div class="sum">
          <div class="sum-stage" style="${stageStyle(r.idx)}"><span class="sum-no">No.${String(r.idx).padStart(4, '0')}</span></div>
          <div class="sum-side">
            <div class="win-chip sum-head"><div class="nm">${remyName(r)}</div>${typeBadge(sp.type)}<span class="lv">${r.level}</span></div>
            <div class="win sum-stats">
              <div class="sum-hp">${hpBar(r.hp, st.hp)}<b>${Math.max(0, r.hp)}/${st.hp}</b></div>
              <div class="sum-grid">
                <div class="stat"><span>Attack</span><b>${st.atk}</b></div>
                <div class="stat"><span>Defense</span><b>${st.def}</b></div>
                <div class="stat"><span>Speed</span><b>${st.spd}</b></div>
                <div class="stat"><span>Next Lv</span><b>${Math.max(0, next - r.xp)}</b></div>
              </div>
              ${xpBar((r.xp - cur) / (next - cur))}
            </div>
            <div class="sum-moves">${moves
              .map((m) => {
                if (!m) return '<div class="mv empty-move"><b>—</b></div>'
                const mv = MOVES[m.id]
                return `<div class="mv"><b>${mv.name}</b>${typeBadge(mv.type)}<span>PP${m.pp}/${mv.pp}</span></div>`
              })
              .join('')}</div>
          </div>
        </div>`
      ;(P.body.querySelector('.sum-stage') as HTMLElement).append(remySprite(r.idx))
      const where = r.caughtAt && (MAPS[r.caughtAt]?.name ?? r.caughtAt)
      P.foot.innerHTML = fmt(`${TYPE_BLURB[sp.type]}${where ? ` Minted at *${where}*.` : ''}`)
    }
    const step = (d: number) => {
      if (S.party.length < 2) return
      i = (i + d + S.party.length) % S.party.length
      audio.sfx('cursor')
      draw()
    }
    const close = () => {
      pop()
      audio.sfx('back')
      P.close()
      resolve(i)
    }
    const art = async () => {
      busy = true
      await viewArt(S.party[i].idx)
      busy = false
    }
    draw()
    P.p.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest<HTMLElement>('[data-step]')
      if (button) step(Number(button.dataset.step))
      else if ((e.target as HTMLElement).closest('.sum-stage')) void art()
    })
    const pop = input.push((b) => {
      if (busy) return
      if (b === 'up' || b === 'down') P.body.scrollBy({ top: b === 'up' ? -40 : 40 })
      else if (b === 'left' || b === 'right') step(b === 'left' ? -1 : 1)
      else if (b === 'a') void art()
      else if (b === 'b' || b === 'start') close()
    })
  })
}

const usableIn = (id: ItemId, ctx: 'field' | 'battle') => (ctx === 'battle' ? ITEMS[id].kind !== 'repel' : ITEMS[id].kind !== 'ball')

/** Bag/shop body: pocket art on the left (current item, big), cream item list on the right. */
function bagLayout(P: Panel, pocket: string) {
  const wrap = el(
    'div',
    'bag',
    `<div class="bag-side"><span class="bag-pocket">${pocket}</span><div class="bag-pic"></div><div class="bag-money"><small>$REMY</small>${S.money.toLocaleString()}</div></div><div class="win bag-list"></div>`,
  )
  P.body.appendChild(wrap)
  const pic = wrap.querySelector('.bag-pic') as HTMLElement
  const money = wrap.querySelector('.bag-money') as HTMLElement
  return {
    list: wrap.querySelector('.bag-list') as HTMLElement,
    show: (id: ItemId | undefined) => {
      pic.innerHTML = id ? itemIcon(id) : icon('bag')
    },
    money: () => {
      money.innerHTML = `<small>$REMY</small>${S.money.toLocaleString()}`
    },
  }
}

export function bagScreen(ctx: 'field' | 'battle'): Promise<ItemId | null> {
  return new Promise((resolve) => {
    const P = openPanel('BAG', '', 'bag')
    const B = bagLayout(P, 'ITEMS')
    const ids = ITEM_ORDER.filter((id) => (S.bag[id] ?? 0) > 0)
    const rows = ids.map((id) => {
      const row = el(
        'div',
        `bag-row ${usableIn(id, ctx) ? '' : 'dim'}`,
        `<span class="bag-name">${ITEMS[id].name}</span><span class="bag-n">×${S.bag[id]}</span>`,
      )
      B.list.appendChild(row)
      return row
    })
    if (!ids.length) {
      B.list.innerHTML = '<div class="empty">Your bag is empty. Visit a Remy Mart.</div>'
      B.show(undefined)
      P.foot.innerHTML = 'Press B to close.'
    }
    const done = (v: ItemId | null) => {
      ctl.pop()
      P.close()
      resolve(v)
    }
    const ctl = nav(rows, {
      cols: () => 1,
      onMove: (i) => {
        B.show(ids[i])
        if (ids[i]) P.foot.innerHTML = fmt(ITEMS[ids[i]].desc)
      },
      onPick: (i) => {
        const id = ids[i]
        if (!usableIn(id, ctx)) {
          audio.sfx('error')
          P.foot.innerHTML = fmt(ctx === 'battle' ? 'Use this out in the *field*.' : 'Use this in a *wild Remy* battle.')
          return
        }
        audio.sfx('select')
        done(id)
      },
      onCancel: () => done(null),
    })
  })
}

/** Field bag flow: pick → target → apply. */
export async function fieldBag() {
  for (;;) {
    const id = await bagScreen('field')
    if (!id) return
    if (ITEMS[id].kind === 'repel') {
      takeItem(id)
      S.repel = (S.repel ?? 0) + (ITEMS[id].amount ?? 0)
      audio.sfx('heal')
      await say(`You routed through a *Private Mempool*. Wild Remys can’t see you for ${S.repel} grass steps.`)
      closeText()
      return
    }
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
    const P = openPanel('REMY MART', '', 'bag')
    const B = bagLayout(P, 'FOR SALE')
    const rows = ITEM_ORDER.map((id) => {
      const row = el(
        'div',
        'bag-row',
        `<span class="bag-name">${ITEMS[id].name}</span><span class="bag-have">×${S.bag[id] ?? 0}</span><span class="bag-n">$${ITEMS[id].price}</span>`,
      )
      B.list.appendChild(row)
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
        B.show(ITEM_ORDER[i])
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
          B.money()
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
      foot.innerHTML = `<div class="qty"><span>${ITEMS[id].name}</span><button class="pbtn" data-q="-1" aria-label="Fewer">▼</button><b>×${String(q).padStart(2, '0')}</b><button class="pbtn" data-q="1" aria-label="More">▲</button><span class="qty-total">$${(q * price).toLocaleString()}</span><button class="pbtn gold" data-q="0">BUY</button></div>`
    }
    const step = (d: number) => {
      q = ((q - 1 + d + max) % max) + 1
      audio.sfx('cursor')
      draw()
    }
    const onTap = (e: PointerEvent) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-q]')
      if (!b) return
      e.stopPropagation()
      const d = Number(b.dataset.q)
      if (d) step(d)
      else end(q)
    }
    const end = (v: number) => {
      pop()
      foot.removeEventListener('pointerdown', onTap)
      resolve(v)
    }
    draw()
    foot.addEventListener('pointerdown', onTap)
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
    const P = openPanel('COLD STORAGE', `<small>${S.storage.length} REMYS</small>`, 'save')
    const grid = el('div', 'party storage')
    P.body.appendChild(grid)
    const rows = partyLayout(grid, S.storage, false)
    P.foot.innerHTML = 'Withdraw which Remy?'
    const done = (v: number) => {
      ctl.pop()
      P.close()
      resolve(v)
    }
    const ctl = nav(rows, { cols: partyCols, onPick: (i) => done(i), onCancel: () => done(-1) })
  })
}

const fmtTime = (ms: number) => {
  const m = Math.floor(ms / 60000)
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

const BADGES = [
  ['badge_mm', 'MARKET MAKER'],
  ['badge_rug', 'RUG SLAYER'],
] as const

const trainerId = () => String((S.name.length * 7919 + 1234) % 100000).padStart(5, '0')

export function cardScreen(): Promise<void> {
  // ES2022/iPhone target does not provide Promise.withResolvers.
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  const P = openPanel('TRAINER CARD', '', 'card')
  let busy = false
  const favorite = () => {
    const flag = Object.keys(S.flags).find((key) => key.startsWith('fav:') && S.caught.includes(Number(key.slice(4))))
    return flag ? Number(flag.slice(4)) : (S.caught[0] ?? S.party[0]?.idx ?? S.avatar)
  }
  const draw = () => {
    const fav = favorite()
    P.body.innerHTML = `
      <div class="tcard">
        <div class="tcard-main">
          <div class="trainer-avatar" style="${stageStyle(S.avatar)}"></div>
          <div class="tcard-rows">
            <div><span>NAME</span><b class="trainer-name"></b></div>
            <div><span>IDNo.</span><b>${trainerId()}</b></div>
            <div><span>$REMY</span><b>${S.money.toLocaleString()}</b></div>
            <div><span>REMYDEX</span><b>${S.caught.length}/${mintableCount().toLocaleString()}</b></div>
            <div><span>TIME</span><b>${fmtTime(S.playMs)}</b></div>
          </div>
        </div>
        <div class="tcard-foot">
          <div class="tcard-badges">${BADGES.map(([f, n]) => `<span class="badge ${S.flags[f] ? 'on' : ''}" title="${n}">${icon('star')}</span>`).join('')}</div>
          <div class="trainer-mosaic"></div>
          <button class="pbtn gold">FAVORITE</button>
        </div>
      </div>`
    ;(P.body.querySelector('.trainer-name') as HTMLElement).textContent = S.name
    const avatar = P.body.querySelector('.trainer-avatar') as HTMLElement
    avatar.append(remySprite(S.avatar), remyBust(fav, 24, 24, { backdrop: true }, 'rb tcard-fav'))
    const mosaic = P.body.querySelector('.trainer-mosaic') as HTMLElement
    const recent = S.caught.slice(-5).reverse()
    for (const idx of recent) mosaic.appendChild(remyBust(idx, 20, 20, { backdrop: true }))
    if (!recent.length) mosaic.textContent = 'Your first mint starts the story.'
    P.body.querySelector('.tcard-foot .pbtn')?.addEventListener('click', () => void chooseFavorite())
    P.foot.innerHTML = fmt(`Favorite: *REMY #${fav}*. Press A to choose another.`)
  }
  const chooseFavorite = async () => {
    if (busy) return
    if (!S.caught.length) {
      audio.sfx('error')
      P.foot.textContent = 'Mint a Remy first to choose your favorite.'
      return
    }
    audio.sfx('select')
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
    else if (b === 'a') void chooseFavorite()
    else if (b === 'up' || b === 'down') P.body.scrollBy({ top: b === 'up' ? -40 : 40 })
  })
  draw()
  return promise
}

/** FRLG-style save: a summary window, a confirmation, then the save itself. */
async function saveFlow() {
  const card = el(
    'div',
    'win save-card',
    `<b>${fmt(S.name)}</b><div><span>Badges</span>${BADGES.filter(([f]) => S.flags[f]).length}</div><div><span>Remydex</span>${S.caught.length}</div><div><span>Time</span>${fmtTime(S.playMs)}</div>`,
  )
  uiRoot.appendChild(card)
  const yes = await ask('Save your progress on this device?')
  if (yes) {
    closeText()
    save()
    audio.sfx('save')
    await say('Game saved on this device.\nYour adventure stays in this browser.')
  }
  closeText()
  card.remove()
}

const START_HINTS: Record<string, [string, string]> = {
  REMYS: ['party', 'Check your Remys’ health, stats and moves.'],
  BAG: ['bag', 'Items you’re carrying.'],
  REMYDEX: ['dex', 'Your record of the originals you’ve met.'],
  'TRAINER CARD': ['card', 'Your trainer profile and badges.'],
  SAVE: ['save', 'Save your progress on this device.'],
  SOUND: ['sound', 'Turn music and sound effects on or off.'],
  TEXT: ['text', 'How fast dialogue prints.'],
  EXIT: ['exit', 'Close this menu.'],
}

/** START menu in the overworld: icon list on the right, help line along the bottom. */
export async function startMenu() {
  let start = 0
  let first = true
  const hint = el('div', 'win menu-hint')
  uiRoot.appendChild(hint)
  for (;;) {
    const opts = [
      ...(S.party.length ? ['REMYS'] : []),
      'BAG',
      ...(S.flags.dex ? ['REMYDEX'] : []),
      'TRAINER CARD',
      'SAVE',
      `SOUND ${audio.muted ? 'OFF' : 'ON'}`,
      `TEXT ${prefs.text.toUpperCase()}`,
      'EXIT',
    ]
    const key = (o: string) => (o.startsWith('SOUND') ? 'SOUND' : o.startsWith('TEXT') ? 'TEXT' : o)
    const icons = opts.map((o) => icon(o.startsWith('SOUND') && audio.muted ? 'mute' : START_HINTS[key(o)][0]))
    const c = await choose(opts, {
      cancel: opts.length - 1,
      cls: `menu-start${first ? '' : ' still'}`,
      start,
      icons,
      onMove: (i) => {
        hint.textContent = START_HINTS[key(opts[i])][1]
      },
    })
    first = false
    start = c
    const pick = opts[c]
    if (pick === 'EXIT') break
    hint.hidden = true
    if (pick === 'REMYS') await partyScreen({ mode: 'field' })
    else if (pick === 'BAG') await fieldBag()
    else if (pick === 'REMYDEX') await dexScreen()
    else if (pick === 'TRAINER CARD') await cardScreen()
    else if (pick === 'SAVE') await saveFlow()
    else if (pick.startsWith('SOUND')) audio.setMuted(!audio.muted)
    else if (pick.startsWith('TEXT')) cycleTextSpeed()
    hint.hidden = false
  }
  hint.remove()
}
