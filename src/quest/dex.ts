/** Virtualized collection: only the visible rows own DOM/canvases, regardless of collection size. */
import { art } from './art'
import { audio } from './audio'
import { REMY_COUNT, TYPE_COLOR, artSrc, species } from './data'
import { input } from './input'
import { MAPS, RESERVED, STARTERS } from './maps'
import { S } from './state'
import { el, uiRoot } from './ui'
import { viewArt } from './viewer'
import './dex.css'
import { view } from './view'

const FILTERS = ['ALL', 'SEEN', 'MINTED', 'BULL', 'BEAR', 'WHALE', 'DEGEN'] as const
const ALL = Array.from({ length: REMY_COUNT }, (_, i) => i)

export function miniPortrait(idx: number, hidden = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  canvas.className = 'remy-mini'
  const c = canvas.getContext('2d')
  if (!c) return canvas
  c.imageSmoothingEnabled = false
  const rect = art.mini(idx)
  if (rect) {
    c.drawImage(rect.img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, 32, 32)
    if (hidden) {
      c.fillStyle = '#060d24e8'
      c.fillRect(0, 0, 32, 32)
    }
  } else {
    c.fillStyle = '#111f43'
    c.fillRect(0, 0, 32, 32)
  }
  if (hidden || !rect) {
    c.fillStyle = '#8397c4'
    c.font = 'bold 18px monospace'
    c.textAlign = 'center'
    c.fillText('?', 16, 23)
  }
  return canvas
}

/** One HD image, CSS foil, and event-driven tilt; no animation loop or decoded image copies. */
export function holoCard(idx: number): HTMLElement {
  const card = el('div', 'remy-holo')
  card.style.setProperty('--art-accent', art.get(idx).palette.accent)
  card.innerHTML = `<img src="${artSrc(idx)}" alt="Original Remy #${idx} artwork" draggable="false"><i class="remy-foil"></i><span class="remy-edition">BASED ORIGINAL / ${String(idx).padStart(4, '0')}</span>`
  const reset = () => {
    card.classList.remove('tilting')
    card.style.removeProperty('--rx')
    card.style.removeProperty('--ry')
  }
  card.addEventListener('pointermove', (event) => {
    const b = card.getBoundingClientRect()
    const x = (event.clientX - b.left) / b.width
    const y = (event.clientY - b.top) / b.height
    card.classList.add('tilting')
    card.style.setProperty('--rx', `${(0.5 - y) * 12}deg`)
    card.style.setProperty('--ry', `${(x - 0.5) * 12}deg`)
    card.style.setProperty('--shine-x', `${x * 100}%`)
  })
  card.addEventListener('pointerleave', reset)
  card.addEventListener('pointerup', reset)
  card.addEventListener('pointercancel', reset)
  return card
}

function habitat(idx: number): string {
  if (STARTERS.includes(idx)) return 'Prof. Gwei offers this Remy as a starter.'
  if (RESERVED.has(idx)) return 'A familiar face from the story. Not found in wild grass.'
  const type = species(idx).type
  const maps = Object.values(MAPS)
    .filter((map) => (map.encounters?.weights[type] ?? 0) > 0)
    .sort((a, b) => {
      const weight = (m: typeof a) => {
        const weights = m.encounters?.weights ?? {}
        return (weights[type] ?? 0) / Object.values(weights).reduce((sum, n) => sum + n, 0)
      }
      return weight(b) - weight(a)
    })
  return maps.length ? `Seek ${type} Remys in ${maps.slice(0, 2).map((m) => m.name).join(' or ')}.` : 'Keep exploring the tall grass. Every original has a story.'
}

export function remyDetail(idx: number): Promise<void> {
  return new Promise((resolve) => {
    const known = S.seen.includes(idx) || S.caught.includes(idx)
    const minted = S.caught.includes(idx)
    const sp = species(idx)
    const info = art.get(idx)
    const epithet = 'epithet' in info && typeof info.epithet === 'string' ? info.epithet : 'A BASED ORIGINAL'
    const panel = el('section', 'panel collection-detail')
    panel.style.setProperty('--art-accent', info.palette.accent)
    panel.style.setProperty('--art-bg', info.palette.bg)
    panel.innerHTML = `<div class="panel-head"><span>REMYDEX / ${String(idx).padStart(4, '0')}</span><button class="collection-back">BACK</button></div><div class="panel-body"><div class="detail-layout"><div class="detail-art"></div><div class="detail-info"><div class="collection-eyebrow">${minted ? 'MINTED · YOUR COLLECTION' : known ? 'ENCOUNTER RECORDED' : 'UNDISCOVERED ORIGINAL'}</div><h2>${known ? `REMY #${idx}` : '???'}</h2><p class="detail-epithet"></p><div class="detail-data"></div></div></div></div><div class="panel-foot">${known ? 'A · ART / ↑↓ · SCROLL / B · BACK' : 'Meet this Remy to reveal its story. B · BACK'}</div>`
    const subtitle = panel.querySelector('.detail-epithet') as HTMLElement
    subtitle.textContent = known ? epithet : 'A new friend is out there.'
    const artHost = panel.querySelector('.detail-art') as HTMLElement
    const data = panel.querySelector('.detail-data') as HTMLElement
    if (known) {
      artHost.appendChild(holoCard(idx))
      const where = [...S.party, ...S.storage].find((r) => r.idx === idx)?.caughtAt
      data.innerHTML = `<span class="type" style="background:${TYPE_COLOR[sp.type]}">${sp.type}</span><div class="detail-swatches">${Object.entries(info.palette).map(([name, color]) => `<i style="background:${color}" title="${name}" aria-label="${name}"></i>`).join('')}</div><div class="collection-eyebrow">BASE STATS</div><div class="detail-stats">${Object.entries(sp.base).map(([name, n]) => `<div><span>${name.toUpperCase()}</span><i><b style="width:${Math.min(100, n)}%"></b></i><strong>${n}</strong></div>`).join('')}</div><p class="detail-origin">${minted ? `MINTED · ${where ? (MAPS[where]?.name ?? where) : 'Your collection'}` : 'Not minted yet — bring a Cold Wallet.'}</p><p class="detail-habitat">${habitat(idx)}</p><button class="collection-primary">VIEW ART ↗</button>`
    } else {
      artHost.appendChild(miniPortrait(idx, true))
      data.innerHTML = `<p class="detail-habitat">${habitat(idx)}</p><p class="detail-origin">Meet this Remy to reveal its artwork, colors and stats.</p>`
    }
    uiRoot.appendChild(panel)
    let busy = false
    const open = async () => {
      if (!known || busy) return
      busy = true
      await viewArt(idx)
      busy = false
    }
    const done = () => {
      if (busy) return
      pop()
      panel.remove()
      resolve()
    }
    panel.querySelector('.collection-back')?.addEventListener('click', done)
    panel.querySelector('.collection-primary')?.addEventListener('click', open)
    const pop = input.push((b) => {
      if (busy) return
      if (b === 'b' || b === 'start') done()
      else if (b === 'a') void open()
      else if (b === 'up' || b === 'down') panel.querySelector('.panel-body')?.scrollBy({ top: (b === 'up' ? -1 : 1) * 60, behavior: 'smooth' })
    })
  })
}

function jumpTo(start: number): Promise<number | null> {
  return new Promise((resolve) => {
    const digits = String(start).padStart(4, '0').split('').map(Number)
    let at = 0
    const modal = el('div', 'collection-jump', '<div class="jump-box"><div class="collection-eyebrow">COLLECTION COORDINATES</div><h2>JUMP TO #</h2><div class="jump-digits"></div><p>0000 — 4489 · ←→ DIGIT · ↑↓ CHANGE</p><div class="jump-actions"><button class="jump-cancel">BACK</button><button class="collection-primary jump-go">GO →</button></div></div>')
    const host = modal.querySelector('.jump-digits') as HTMLElement
    const draw = () => {
      host.innerHTML = digits.map((n, i) => `<div class="jump-digit ${i === at ? 'sel' : ''}"><button data-digit="${i}" data-step="1" aria-label="Increase digit ${i + 1}">▲</button><button data-digit="${i}" data-step="0" aria-label="Select digit ${i + 1}">${n}</button><button data-digit="${i}" data-step="-1" aria-label="Decrease digit ${i + 1}">▼</button></div>`).join('')
    }
    const step = (n: number) => {
      digits[at] = (digits[at] + n + 10) % 10
      audio.sfx('cursor')
      draw()
    }
    const done = (value: number | null) => {
      pop()
      modal.remove()
      resolve(value)
    }
    const go = () => {
      const n = Number(digits.join(''))
      if (n >= REMY_COUNT) {
        const hint = modal.querySelector('p') as HTMLElement
        hint.textContent = 'Choose an art number from 0 to 4489.'
        audio.sfx('error')
      } else done(n)
    }
    host.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-digit]')
      if (!button) return
      at = Number(button.dataset.digit)
      step(Number(button.dataset.step))
    })
    modal.querySelector('.jump-go')?.addEventListener('click', go)
    modal.querySelector('.jump-cancel')?.addEventListener('click', () => done(null))
    uiRoot.appendChild(modal)
    draw()
    const pop = input.push((b) => {
      if (b === 'b' || b === 'start') done(null)
      else if (b === 'a') go()
      else if (b === 'up' || b === 'down') step(b === 'up' ? 1 : -1)
      else if (b === 'left' || b === 'right') {
        at = (at + (b === 'left' ? 3 : 1)) % 4
        draw()
      }
    })
  })
}

/** Picking a favorite shares the virtualized browser, but never exposes unminted choices. */
export async function pickFavorite(): Promise<number | null> {
  return collection(true)
}

export async function dexScreen(): Promise<void> {
  await collection(false)
}

function collection(picking: boolean): Promise<number | null> {
  return new Promise((resolve) => {
    const minted = new Set(S.caught)
    const seen = new Set([...S.seen, ...S.caught])
    const panel = el('section', 'panel collection')
    panel.innerHTML = `<div class="panel-head"><span>${picking ? 'CHOOSE FAVORITE' : 'REMYDEX'}</span><button class="collection-back">BACK</button></div><div class="collection-counts"><div><b>${seen.size.toLocaleString()}</b><span>SEEN</span></div><div class="mint-count"><b>${minted.size.toLocaleString()}</b><span>MINTED</span></div><div><b>4,490</b><span>ORIGINALS</span></div><div class="collection-progress"><i style="width:${seen.size / REMY_COUNT * 100}%"></i><b style="width:${minted.size / REMY_COUNT * 100}%"></b></div></div><div class="collection-tools"></div><div class="collection-scroll"><div class="collection-space"></div></div><div class="panel-foot collection-foot"></div>`
    const tools = panel.querySelector('.collection-tools') as HTMLElement
    const scroll = panel.querySelector('.collection-scroll') as HTMLElement
    const space = panel.querySelector('.collection-space') as HTMLElement
    const foot = panel.querySelector('.collection-foot') as HTMLElement
    const names = picking ? ['MINTED', 'JUMP #'] : [...FILTERS, 'JUMP #']
    const buttons = names.map((name) => {
      const button = el('button', '', name)
      tools.appendChild(button)
      return button
    })
    let filter = picking ? 'MINTED' : 'ALL'
    let ids: number[] = []
    let sel = 0
    let toolAt = 0
    let zone: 'grid' | 'tools' = 'grid'
    let cols = 1
    let cell = 1
    let row = 1
    let wide = false
    let busy = false
    let frame = 0
    let closed = false
    const cells = new Map<number, HTMLElement>()
    const draw = () => {
      if (closed) return
      buttons.forEach((b, i) => {
        b.classList.toggle('active', names[i] === filter)
        b.classList.toggle('focused', zone === 'tools' && i === toolAt)
      })
      const first = Math.max(0, Math.floor(scroll.scrollTop / row) - 1) * cols
      const end = Math.min(ids.length, (Math.ceil((scroll.scrollTop + scroll.clientHeight) / row) + 1) * cols)
      for (const [index, node] of cells) {
        if (index < first || index >= end) {
          node.remove()
          cells.delete(index)
        }
      }
      for (let index = first; index < end; index++) {
        let node = cells.get(index)
        if (!node) {
          const idx = ids[index]
          const known = seen.has(idx)
          node = el('button', `collection-cell ${minted.has(idx) ? 'minted' : known ? 'seen' : 'unknown'}`)
          node.setAttribute('aria-label', `Remy #${idx}, ${minted.has(idx) ? 'minted' : known ? 'seen' : 'undiscovered'}`)
          node.appendChild(miniPortrait(idx, !known))
          node.appendChild(el('span', '', `#${String(idx).padStart(4, '0')}`))
          node.dataset.index = String(index)
          space.appendChild(node)
          cells.set(index, node)
        }
        node.style.left = `${index % cols * cell}px`
        node.style.top = `${Math.floor(index / cols) * row}px`
        node.style.width = `${cell}px`
        node.style.height = `${row}px`
        node.classList.toggle('sel', index === sel && zone === 'grid')
        node.setAttribute('aria-selected', String(index === sel))
      }
      const idx = ids[sel]
      foot.innerHTML = idx === undefined ? 'No originals here yet. Head for the tall grass.' : `<b>REMY #${idx}</b><span>${minted.has(idx) ? 'MINTED' : seen.has(idx) ? 'SEEN' : 'UNDISCOVERED'} · ${sel + 1}/${ids.length.toLocaleString()}</span><small>${wide ? (picking ? 'A · PICK / B · BACK' : 'A · OPEN / B · BACK') : `${picking ? 'A · SET FAVORITE' : 'A · DETAILS'} / ↑ AT TOP · FILTERS / ←→ EDGE · PAGE`}</small>`
    }
    const reveal = () => {
      const top = Math.floor(sel / cols) * row
      if (top < scroll.scrollTop) scroll.scrollTop = top
      else if (top + row > scroll.scrollTop + scroll.clientHeight) scroll.scrollTop = top + row - scroll.clientHeight
      draw()
    }
    const layout = () => {
      const unit = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      wide = view.H <= view.W * 0.8
      panel.classList.toggle('collection-wide', wide)
      const title = panel.querySelector('.panel-head > span') as HTMLElement
      title.textContent = picking ? (wide ? 'FAVORITE' : 'CHOOSE FAVORITE') : 'REMYDEX'
      cols = Math.max(1, Math.floor(scroll.clientWidth / ((wide ? 38 : 43) * unit)))
      cell = scroll.clientWidth / cols
      row = (wide ? 40 : 47) * unit
      space.style.height = `${Math.ceil(ids.length / cols) * row}px`
      reveal()
    }
    const apply = () => {
      ids = ALL.filter((idx) => {
        if (picking && !minted.has(idx)) return false
        if (filter === 'SEEN') return seen.has(idx)
        if (filter === 'MINTED') return minted.has(idx)
        return filter === 'ALL' || species(idx).type === filter
      })
      sel = 0
      scroll.scrollTop = 0
      cells.clear()
      space.replaceChildren()
      layout()
    }
    const done = (idx: number | null = null) => {
      if (busy || closed) return
      closed = true
      pop()
      cancelAnimationFrame(frame)
      observer.disconnect()
      panel.remove()
      resolve(idx)
    }
    const pick = async () => {
      if (busy || ids[sel] === undefined) return
      audio.sfx('select')
      if (picking) return done(ids[sel])
      busy = true
      await remyDetail(ids[sel])
      busy = false
    }
    const tool = async (i: number) => {
      if (busy) return
      toolAt = i
      if (names[i] === 'JUMP #') {
        busy = true
        const idx = await jumpTo(ids[sel] ?? 0)
        busy = false
        if (idx !== null) {
          if (picking && !minted.has(idx)) {
            foot.textContent = `REMY #${idx} is not minted. Choose from your collection.`
            audio.sfx('error')
            return
          }
          if (!ids.includes(idx)) {
            filter = picking ? 'MINTED' : 'ALL'
            apply()
          }
          sel = ids.indexOf(idx)
          zone = 'grid'
          reveal()
        }
      } else {
        filter = names[i]
        apply()
      }
    }
    buttons.forEach((button, i) => button.addEventListener('click', () => {
      zone = 'tools'
      void tool(i)
    }))
    panel.querySelector('.collection-back')?.addEventListener('click', () => done())
    space.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-index]')
      if (!target || busy) return
      sel = Number(target.dataset.index)
      zone = 'grid'
      draw()
      void pick()
    })
    scroll.addEventListener('scroll', () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        draw()
      })
    }, { passive: true })
    uiRoot.appendChild(panel)
    const observer = new ResizeObserver(layout)
    observer.observe(scroll)
    const pop = input.push((b) => {
      if (busy) return
      if (b === 'b' || b === 'start') return done()
      if (zone === 'tools') {
        if (b === 'left' || b === 'right') {
          toolAt = (toolAt + (b === 'left' ? names.length - 1 : 1)) % names.length
          buttons[toolAt].scrollIntoView({ block: 'nearest', inline: 'nearest' })
        } else if (b === 'down') zone = 'grid'
        else if (b === 'a') return void tool(toolAt)
        draw()
        return
      }
      if (b === 'a') return void pick()
      if (b === 'up' && sel < cols) {
        zone = 'tools'
        draw()
        return
      }
      const page = Math.max(1, Math.floor(scroll.clientHeight / row)) * cols
      let next = sel
      if (b === 'up') next -= cols
      else if (b === 'down') next += cols
      else if (b === 'left') next -= sel % cols === 0 ? page : 1
      else if (b === 'right') next += sel % cols === cols - 1 ? page : 1
      sel = Math.max(0, Math.min(ids.length - 1, next))
      audio.sfx('cursor')
      reveal()
    })
    apply()
  })
}
