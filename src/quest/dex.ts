/** Remydex: a virtualized grid of all originals (only visible rows own DOM) plus per-Remy entries. */
import { remySrc } from '../lib/media'
import { art } from './art'
import { audio } from './audio'
import { REMY_COUNT, isCabald, mintableCount, species } from './data'
import { hex, shade } from './gfx/px'
import { input, tap } from './input'
import { MAPS, reserved, starters } from './maps'
import { icon, remySprite, stageStyle, typeBadge } from './skin'
import { S } from './state'
import { el, fmt, uiRoot } from './ui'
import { viewArt } from './viewer'
import './dex.css'
import { view } from './view'

const FILTERS = ['ALL', 'SEEN', 'MINTED', 'BULL', 'BEAR', 'WHALE', 'DEGEN', 'CABALD'] as const
const ALL = Array.from({ length: REMY_COUNT }, (_, i) => i)
const no = (idx: number) => String(idx).padStart(4, '0')

/** Pixel "?" drawn over undiscovered portraits (5×7, 2px scale). */
const QUESTION = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..']

/** 32px posterized portrait; undiscovered ones are sunk into a dithered navy veil with a pixel "?". */
export function miniPortrait(idx: number, hidden = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  canvas.className = 'remy-mini'
  const c = canvas.getContext('2d') as CanvasRenderingContext2D
  c.imageSmoothingEnabled = false
  const rect = art.mini(idx)
  if (rect) c.drawImage(rect.img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, 32, 32)
  if (hidden || !rect) {
    const veil = c.getImageData(0, 0, 32, 32)
    const d = veil.data
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const i = (y * 32 + x) * 4
        // A 2×2 checker keeps a ghost of the silhouette readable through the veil.
        const k = (x + y) % 2 ? 0.12 : 0.22
        d[i] = 14 + d[i] * k
        d[i + 1] = 20 + d[i + 1] * k
        d[i + 2] = 58 + d[i + 2] * k
        d[i + 3] = 255
      }
    c.putImageData(veil, 0, 0)
    c.fillStyle = '#8fa6e8'
    QUESTION.forEach((row, y) => {
      for (let x = 0; x < 5; x++) if (row[x] === '#') c.fillRect(11 + x * 2, 9 + y * 2, 2, 2)
    })
  }
  return canvas
}

/** One HD image, CSS foil, and event-driven tilt; no animation loop or decoded image copies. */
export function holoCard(idx: number): HTMLElement {
  const card = el('div', 'remy-holo')
  card.style.setProperty('--art-accent', art.get(idx).palette.accent)
  card.innerHTML = `<img src="${remySrc(idx, 320)}" alt="Original Remy #${idx} artwork" draggable="false"><i class="remy-foil"></i>`
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
  if (isCabald(idx)) {
    return S.caught.includes(idx)
      ? 'A bald Remy, so a Cabald member, who defected to your team before the Great Denial. Nobody asks questions.'
      : 'Bald, so Cabald. Uncatchable: only fights for Cabald bosses. There is no Cabald. It loves you.'
  }
  if (starters().includes(idx)) return 'Prof. Gwei offers this Remy as a starter.'
  if (reserved().has(idx)) return 'A familiar face from the story. Not found in wild grass.'
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

/** Dex panel chrome shared by the grid and entries: wallpaper, title strip with a tappable B, cream help window. */
function dexPanel(cls: string, title: string, body: string) {
  const panel = el(
    'section',
    `panel ${cls}`,
    `<div class="panel-head"><span>${icon('dex')}${title}</span><span class="panel-right"><button class="pbtn panel-x" aria-label="Back">B</button></span></div>${body}<div class="panel-foot"></div>`,
  )
  panel.querySelector('.panel-x')?.addEventListener('click', () => tap('b'))
  return panel
}

const STAT_NAMES: Record<string, string> = { hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD' }
const hex2css = (c: number) => `rgb(${c & 255},${(c >>> 8) & 255},${(c >>> 16) & 255})`

export function remyDetail(idx: number): Promise<void> {
  return new Promise((resolve) => {
    const known = S.seen.includes(idx) || S.caught.includes(idx)
    const minted = S.caught.includes(idx)
    const sp = species(idx)
    const info = art.get(idx)
    const cabald = isCabald(idx)
    const where = [...S.party, ...S.storage].find((r) => r.idx === idx)?.caughtAt
    const status = minted ? `MINTED · ${where ? (MAPS[where]?.name ?? where) : 'your collection'}` : known ? 'SEEN · not minted yet' : 'UNDISCOVERED'
    const panel = dexPanel(
      `dex-detail${cabald ? ' cabald' : ''}`,
      `No.${no(idx)}`,
      `<div class="panel-body"><div class="dexd">
        <div class="dexd-stage" style="${stageStyle(idx)}"><span class="dexd-status">${minted ? icon('star') : ''}</span></div>
        <div class="dexd-info">
          <div class="win dexd-card">
            <div class="dexd-title"><b>${known ? `REMY #${idx}` : '???'}</b>${known ? typeBadge(sp.type) : ''}</div>
            <p class="dexd-epithet"></p>
            ${
              known
                ? `<div class="dexd-swatches">${Object.entries(info.palette)
                    .map(([name, color]) => `<i style="background:${color}" title="${name}"></i>`)
                    .join('')}</div>
            <div class="dexd-stats">${Object.entries(sp.base)
              .map(
                ([name, n]) =>
                  `<span>${STAT_NAMES[name] ?? name}</span><i><b style="--f:${Math.min(1, n / 100).toFixed(3)}"></b></i><em>${n}</em>`,
              )
              .join('')}</div>
            <button class="pbtn gold dexd-art">VIEW ART</button>`
                : '<p class="dexd-hint">Meet this Remy to reveal its artwork, colors and stats.</p>'
            }
          </div>
          ${known ? '<div class="dexd-holo"></div>' : ''}
        </div>
      </div></div>`,
    )
    ;(panel.querySelector('.dexd-epithet') as HTMLElement).textContent = known ? info.epithet || 'A Based Original' : 'A new friend is out there.'
    const stage = panel.querySelector('.dexd-stage') as HTMLElement
    stage.prepend(remySprite(idx, known ? {} : { silhouette: hex2css(shade(hex(info.palette.bg), -0.7)) }))
    if (known) panel.querySelector('.dexd-holo')?.prepend(holoCard(idx))
    if (cabald) panel.querySelector('.dexd-card')?.prepend(el('div', 'dex-cabald-badge', 'CABALD MEMBER · BALD'))
    const origin = cabald && !minted ? 'Uncatchable — Cabald member. Wallets bounce off the denial.' : status
    const foot = panel.querySelector('.panel-foot') as HTMLElement
    foot.innerHTML = `<span><b>${fmt(origin)}</b> ${fmt(habitat(idx))}</span>`
    uiRoot.appendChild(panel)
    audio.cry(idx)
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
      audio.sfx('back')
      panel.classList.add('closing')
      setTimeout(() => panel.remove(), 100)
      resolve()
    }
    panel.querySelector('.dexd-art')?.addEventListener('click', open)
    panel.querySelector('.remy-holo')?.addEventListener('click', open)
    const pop = input.push((b) => {
      if (busy) return
      if (b === 'b' || b === 'start') done()
      else if (b === 'a') void open()
      else if (b === 'up' || b === 'down') panel.querySelector('.panel-body')?.scrollBy({ top: (b === 'up' ? -1 : 1) * 40 })
    })
  })
}

function jumpTo(start: number): Promise<number | null> {
  return new Promise((resolve) => {
    const digits = String(start).padStart(4, '0').split('').map(Number)
    let at = 0
    const modal = el(
      'div',
      'dex-jump',
      `<div class="win jump-box"><b class="jump-title">JUMP TO No.</b><div class="jump-digits"></div><p>0000 – ${REMY_COUNT - 1}</p><div class="jump-actions"><button class="pbtn jump-cancel">BACK</button><button class="pbtn gold jump-go">GO</button></div></div>`,
    )
    const host = modal.querySelector('.jump-digits') as HTMLElement
    const hint = modal.querySelector('p') as HTMLElement
    const draw = () => {
      host.innerHTML = digits
        .map(
          (n, i) =>
            `<div class="jump-digit ${i === at ? 'sel' : ''}"><button class="pbtn" data-digit="${i}" data-step="1" aria-label="Increase digit ${i + 1}">▲</button><button class="jump-n" data-digit="${i}" data-step="0" aria-label="Select digit ${i + 1}">${n}</button><button class="pbtn" data-digit="${i}" data-step="-1" aria-label="Decrease digit ${i + 1}">▼</button></div>`,
        )
        .join('')
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
        hint.textContent = `Choose a number from 0 to ${REMY_COUNT - 1}.`
        audio.sfx('error')
      } else {
        audio.sfx('select')
        done(n)
      }
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
      if (b === 'b' || b === 'start') {
        audio.sfx('back')
        done(null)
      } else if (b === 'a') go()
      else if (b === 'up' || b === 'down') step(b === 'up' ? 1 : -1)
      else if (b === 'left' || b === 'right') {
        at = (at + (b === 'left' ? 3 : 1)) % 4
        audio.sfx('cursor')
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

/** Grid cell footprint in logical px (rem); cells sit on whole-pixel positions so portraits never resample. */
const CELL_W = 38
const CELL_H = 46

function collection(picking: boolean): Promise<number | null> {
  return new Promise((resolve) => {
    const minted = new Set(S.caught)
    const seen = new Set([...S.seen, ...S.caught])
    const mintable = mintableCount()
    const panel = dexPanel(
      'dex',
      picking ? 'FAVORITE' : 'REMYDEX',
      `<div class="dex-counts"><span>SEEN<b>${seen.size.toLocaleString()}</b></span><span class="mint-count">MINTED<b>${minted.size.toLocaleString()}</b></span><span title="4,490 originals minus the Cabald's bald members">OF<b>${mintable.toLocaleString()}</b></span><div class="dex-prog"><i style="--f:${(seen.size / REMY_COUNT).toFixed(4)}"></i><b style="--f:${(minted.size / mintable).toFixed(4)}"></b></div></div><div class="dex-tools"></div><div class="dex-scroll"><div class="dex-space"></div></div>`,
    )
    const tools = panel.querySelector('.dex-tools') as HTMLElement
    const scroll = panel.querySelector('.dex-scroll') as HTMLElement
    const space = panel.querySelector('.dex-space') as HTMLElement
    const foot = panel.querySelector('.panel-foot') as HTMLElement
    const names = picking ? ['MINTED', 'JUMP #'] : [...FILTERS, 'JUMP #']
    const buttons = names.map((name) => {
      const button = el('button', 'pbtn', name)
      tools.appendChild(button)
      return button
    })
    let filter = picking ? 'MINTED' : 'ALL'
    let ids: number[] = []
    let sel = 0
    let toolAt = 0
    let zone: 'grid' | 'tools' = 'grid'
    let cols = 1
    let unit = 1
    let offset = 0
    let busy = false
    let frame = 0
    let closed = false
    const cells = new Map<number, HTMLElement>()
    const row = () => CELL_H * unit
    const draw = () => {
      if (closed) return
      buttons.forEach((b, i) => {
        b.classList.toggle('gold', names[i] === filter)
        b.classList.toggle('focus', zone === 'tools' && i === toolAt)
      })
      const first = Math.max(0, Math.floor(scroll.scrollTop / row()) - 1) * cols
      const end = Math.min(ids.length, (Math.ceil((scroll.scrollTop + scroll.clientHeight) / row()) + 1) * cols)
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
          const member = known && isCabald(idx)
          node = el('button', `dex-cell ring ${minted.has(idx) ? 'minted' : known ? 'seen' : 'unknown'}${member ? ' cabald' : ''}`)
          node.setAttribute('aria-label', `Remy #${idx}, ${minted.has(idx) ? 'minted' : known ? 'seen' : 'undiscovered'}${member ? ', Cabald member' : ''}`)
          node.appendChild(miniPortrait(idx, !known))
          node.appendChild(el('span', '', no(idx)))
          node.dataset.index = String(index)
          space.appendChild(node)
          cells.set(index, node)
        }
        node.style.left = `${offset + (index % cols) * CELL_W}rem`
        node.style.top = `${Math.floor(index / cols) * CELL_H}rem`
        node.classList.toggle('sel', index === sel && zone === 'grid')
        node.setAttribute('aria-selected', String(index === sel))
      }
      const idx = ids[sel]
      foot.innerHTML =
        idx === undefined
          ? filter === 'CABALD'
            ? 'No Cabald members met. Which is exactly what they want.'
            : 'No originals here yet. Head for the tall grass.'
          : `<span class="dex-foot-no">No.${no(idx)}</span><span>${isCabald(idx) && seen.has(idx) ? 'CABALD · ' : ''}${minted.has(idx) ? 'Minted' : seen.has(idx) ? 'Seen' : 'Undiscovered'} · ${sel + 1}/${ids.length.toLocaleString()}</span>`
    }
    const reveal = () => {
      const top = Math.floor(sel / cols) * row()
      if (top < scroll.scrollTop) scroll.scrollTop = top
      else if (top + row() > scroll.scrollTop + scroll.clientHeight) scroll.scrollTop = top + row() - scroll.clientHeight
      draw()
    }
    const layout = () => {
      unit = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      const width = Math.floor(scroll.clientWidth / unit)
      cols = Math.max(1, Math.floor(width / CELL_W))
      offset = Math.floor((width - cols * CELL_W) / 2)
      space.style.height = `${Math.ceil(ids.length / cols) * CELL_H}rem`
      panel.classList.toggle('dex-tall', view.H > view.W * 0.8)
      reveal()
    }
    const apply = () => {
      ids = ALL.filter((idx) => {
        if (picking && !minted.has(idx)) return false
        if (filter === 'SEEN') return seen.has(idx)
        if (filter === 'MINTED') return minted.has(idx)
        // Members only show up once met: the Cabald denies its roster even to the Remydex.
        if (filter === 'CABALD') return isCabald(idx) && seen.has(idx)
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
      panel.classList.add('closing')
      setTimeout(() => panel.remove(), 100)
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
      audio.sfx('select')
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
    buttons.forEach((button, i) =>
      button.addEventListener('click', () => {
        zone = 'tools'
        void tool(i)
      }),
    )
    space.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-index]')
      if (!target || busy) return
      const index = Number(target.dataset.index)
      zone = 'grid'
      // First tap selects, second tap opens — same as the pad.
      if (index !== sel) {
        sel = index
        audio.sfx('cursor')
        draw()
        return
      }
      void pick()
    })
    scroll.addEventListener(
      'scroll',
      () => {
        if (frame) return
        frame = requestAnimationFrame(() => {
          frame = 0
          draw()
        })
      },
      { passive: true },
    )
    uiRoot.appendChild(panel)
    const observer = new ResizeObserver(layout)
    observer.observe(scroll)
    const pop = input.push((b) => {
      if (busy) return
      if (b === 'b' || b === 'start') {
        audio.sfx('back')
        return done()
      }
      if (zone === 'tools') {
        if (b === 'left' || b === 'right') {
          toolAt = (toolAt + (b === 'left' ? names.length - 1 : 1)) % names.length
          buttons[toolAt].scrollIntoView({ block: 'nearest', inline: 'nearest' })
          audio.sfx('cursor')
        } else if (b === 'down') zone = 'grid'
        else if (b === 'a') return void tool(toolAt)
        draw()
        return
      }
      if (b === 'a') return void pick()
      if (b === 'up' && sel < cols) {
        zone = 'tools'
        audio.sfx('cursor')
        draw()
        return
      }
      const page = Math.max(1, Math.floor(scroll.clientHeight / row())) * cols
      let next = sel
      if (b === 'up') next -= cols
      else if (b === 'down') next += cols
      else if (b === 'left') next -= sel % cols === 0 ? page : 1
      else if (b === 'right') next += sel % cols === cols - 1 ? page : 1
      next = Math.max(0, Math.min(ids.length - 1, next))
      if (next === sel) return
      sel = next
      audio.sfx('cursor')
      reveal()
    })
    apply()
  })
}
