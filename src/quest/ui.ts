/** DOM UI primitives on top of the game screen: text box, choices, banners, fades. Sizes are in rem = 1 logical px. */
import { audio } from './audio'
import { type Btn, input } from './input'
import { remyBust } from './skin'
import { S, textMs } from './state'

export let uiRoot: HTMLElement

export function initUi(root: HTMLElement) {
  uiRoot = root
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html !== undefined) e.innerHTML = html
  return e
}

/** `*word*` → highlight, `{P}` → player name, `{R:n}` → rival, `$` money is plain text. */
export function fmt(text: string): string {
  return text
    .replace(/\{P\}/g, S.name)
    .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

/** Splits formatted HTML into per-character spans so the typewriter can reveal them without breaking words across lines. */
function typeSpans(target: HTMLElement, html: string): HTMLElement[] {
  target.innerHTML = html
  const spans: HTMLElement[] = []
  const walk = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment()
        for (const word of (child.textContent ?? '').split(/(\s+)/)) {
          if (!word) continue
          if (/^\s+$/.test(word)) {
            for (const ch of word) {
              if (ch === '\n') frag.appendChild(document.createElement('br'))
              else {
                const s = el('span', 'ch', ' ')
                spans.push(s)
                frag.appendChild(s)
              }
            }
            continue
          }
          const w = el('span', 'word')
          for (const ch of word) {
            const s = el('span', 'ch')
            s.textContent = ch
            spans.push(s)
            w.appendChild(s)
          }
          frag.appendChild(w)
        }
        child.replaceWith(frag)
      } else walk(child)
    }
  }
  walk(target)
  return spans
}

let box: HTMLElement | null = null
let boxText: HTMLElement
let boxName: HTMLElement
let boxPortrait: HTMLElement
let boxArrow: HTMLElement
let portraitIdx = -1

function ensureBox() {
  if (box) return
  box = el('div', 'tbox')
  box.innerHTML = `<div class="tbox-portrait"></div><div class="tbox-name"></div><div class="tbox-text"><div class="tbox-inner"></div></div><div class="tbox-arrow"></div>`
  boxText = box.querySelector('.tbox-inner') as HTMLElement
  boxName = box.querySelector('.tbox-name') as HTMLElement
  boxPortrait = box.querySelector('.tbox-portrait') as HTMLElement
  boxArrow = box.querySelector('.tbox-arrow') as HTMLElement
  portraitIdx = -1
  box.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    textTap?.()
  })
  uiRoot.appendChild(box)
}
let textTap: (() => void) | null = null

/** Swaps the floating portrait only when the speaker's Remy changes, replaying its pop-in. */
function setPortrait(idx: number | undefined) {
  if (idx === undefined || idx === portraitIdx) return
  portraitIdx = idx
  boxPortrait.replaceChildren(remyBust(idx, 40, 40, { backdrop: true }))
  boxPortrait.style.animation = 'none'
  void boxPortrait.offsetWidth
  boxPortrait.style.animation = ''
}

/** Typing ticks to hold after punctuation, so sentences breathe like spoken lines. */
const BEAT: Record<string, number> = { '.': 5, '!': 5, '?': 5, '…': 6, ',': 2, ';': 2, ':': 2 }

export interface SayOpts {
  speaker?: string
  portrait?: number
  /** Resolve as soon as the text finishes printing (no ▼ wait). Used before menus/choices. */
  noWait?: boolean
  /** Auto-advance after this many ms once printed (battle narration). */
  auto?: number
}

/** Prints `text` into the dialogue box, two lines at a time (longer text scrolls up page by page). Resolves when the player advances. */
export function say(text: string, o: SayOpts = {}): Promise<void> {
  ensureBox()
  const b = box as HTMLElement
  b.classList.toggle('has-portrait', o.portrait !== undefined)
  b.classList.toggle('has-name', !!o.speaker)
  boxName.textContent = o.speaker ?? ''
  setPortrait(o.portrait)
  boxText.style.transition = 'none'
  boxText.style.transform = ''
  const spans = typeSpans(boxText, fmt(text))
  // Line index per character, from layout (spans are laid out even while transparent).
  const top0 = spans[0]?.offsetTop ?? 0
  const lineH = Number.parseFloat(getComputedStyle(boxText).lineHeight) || 15
  const lineOf = spans.map((s) => Math.round((s.offsetTop - top0) / lineH))
  boxArrow.classList.remove('on')
  return new Promise((resolve) => {
    let i = 0
    let page = 0
    let paused = false
    let done = false
    let timer = 0
    let hold = 0
    const pageEnd = () => i < spans.length && lineOf[i] >= (page + 1) * 2
    const tick = () => {
      if (hold > 0) {
        hold--
        return
      }
      let voiced = false
      for (let k = 0; k < 2 && i < spans.length && !pageEnd(); k++, i++) {
        const ch = spans[i].textContent ?? ''
        spans[i].classList.add('on')
        if (ch.trim()) voiced = true
        const beat = BEAT[ch]
        // A beat only lands at a real sentence break, not inside "3.5" or "...".
        if (beat && (spans[i + 1]?.textContent ?? ' ') === ' ') {
          hold = beat
          i++
          break
        }
      }
      if (voiced) audio.sfx('text')
      if (i >= spans.length) finish()
      else if (pageEnd()) pause()
    }
    const pause = () => {
      paused = true
      window.clearInterval(timer)
      boxArrow.classList.add('on')
    }
    const nextPage = () => {
      paused = false
      page++
      boxArrow.classList.remove('on')
      boxText.style.transition = 'transform 120ms steps(3)'
      boxText.style.transform = `translateY(${-page * 2 * lineH}px)`
      timer = startTyping()
    }
    const finish = () => {
      // Skip to the end of the current page only; later pages still need a press each.
      while (i < spans.length && !pageEnd()) spans[i++].classList.add('on')
      window.clearInterval(timer)
      if (i < spans.length) return pause()
      done = true
      if (o.noWait) return end()
      if (o.auto !== undefined) {
        window.setTimeout(end, o.auto)
        return
      }
      boxArrow.classList.add('on')
    }
    const end = () => {
      pop()
      textTap = null
      resolve()
    }
    const startTyping = () => {
      const ms = textMs()
      if (ms) return window.setInterval(tick, ms)
      queueMicrotask(finish)
      return 0
    }
    timer = startTyping()
    const advance = () => {
      if (paused) {
        audio.sfx('cursor')
        return nextPage()
      }
      if (!done) return finish()
      if (o.auto !== undefined || o.noWait) return
      audio.sfx('cursor')
      end()
    }
    textTap = advance
    const pop = input.push((btn: Btn) => {
      if (btn === 'a' || btn === 'b') advance()
    })
  })
}

/** Several lines from one speaker. */
export async function talk(lines: string[], o: SayOpts = {}) {
  for (const l of lines) await say(l, o)
}

export function closeText() {
  if (!box) return
  const b = box
  box = null
  b.classList.add('leave')
  setTimeout(() => b.remove(), 130)
}

export interface ChooseOpts {
  /** Index returned on B. Omit to make B do nothing. */
  cancel?: number
  /** Class for positioning variants. */
  cls?: string
  start?: number
  /** Extra html per option (right-aligned detail). */
  details?: string[]
  onMove?: (i: number) => void
  disabled?: boolean[]
  /** Lay options out in a row (left/right also move the cursor). */
  horizontal?: boolean
  /** Leading html per option (pixel icons). */
  icons?: string[]
}

/** Vertical menu with ▶ cursor. Keyboard/pad or tap. */
export function choose(options: string[], o: ChooseOpts = {}): Promise<number> {
  const m = el('div', `menu ${o.cls ?? 'menu-right'}${o.horizontal ? ' menu-row' : ''}`)
  const items = options.map((label, i) => {
    const it = el('div', 'menu-item', `<span class="menu-cursor"></span>${o.icons?.[i] ?? ''}<span class="menu-label">${fmt(label)}</span>${o.details?.[i] ? `<span class="menu-detail">${o.details[i]}</span>` : ''}`)
    if (o.disabled?.[i]) it.classList.add('disabled')
    m.appendChild(it)
    return it
  })
  uiRoot.appendChild(m)
  let sel = Math.min(o.start ?? 0, options.length - 1)
  const draw = () => {
    items.forEach((it, i) => it.classList.toggle('sel', i === sel))
    items[sel].scrollIntoView?.({ block: 'nearest' })
    o.onMove?.(sel)
  }
  draw()
  return new Promise((resolve) => {
    const done = (i: number) => {
      pop()
      m.remove()
      resolve(i)
    }
    const pick = (i: number) => {
      if (o.disabled?.[i]) return audio.sfx('error')
      audio.sfx('select')
      done(i)
    }
    items.forEach((it, i) =>
      it.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (sel !== i) {
          sel = i
          draw()
        }
        pick(i)
      }),
    )
    const pop = input.push((b) => {
      const prev = o.horizontal ? 'left' : 'up'
      const next = o.horizontal ? 'right' : 'down'
      if (b === 'up' || b === 'down' || b === prev || b === next) {
        const back = b === 'up' || b === prev
        sel = (sel + (back ? -1 : 1) + options.length) % options.length
        audio.sfx('cursor')
        draw()
      } else if (b === 'a') pick(sel)
      else if (b === 'b' && o.cancel !== undefined) {
        audio.sfx('back')
        done(o.cancel)
      }
    })
  })
}

export async function ask(text: string, o: SayOpts = {}): Promise<boolean> {
  await say(text, { ...o, noWait: true })
  return (await choose(['YES', 'NO'], { cancel: 1, cls: 'menu-right menu-yesno' })) === 0
}

/** Area name plate that drops in on chains at the top-left; `theme` picks the plate material (world.css). */
export function banner(name: string, theme = '', kicker = '', glyph: 'sun' | 'moon' | 'dusk' | '' = '') {
  for (const old of uiRoot.querySelectorAll('.banner')) old.remove()
  const kick = kicker ? `<i class="kicker">${glyph ? `<b class="glyph ${glyph}"></b>` : ''}${kicker}</i>` : ''
  const b = el('div', `banner${theme ? ` theme-${theme}` : ''}`, `${kick}<span class="name">${name}</span><i class="rule"></i>`)
  uiRoot.appendChild(b)
  setTimeout(() => b.classList.add('out'), 2600)
  setTimeout(() => b.remove(), 2900)
}

let fader: HTMLElement | null = null
/** Fade the whole screen to/from a color. */
export async function fade(to: boolean, ms = 260, color = '#000') {
  if (!fader) {
    fader = el('div', 'fader')
    uiRoot.parentElement?.appendChild(fader)
  }
  fader.style.background = color
  // Stepped like a GBA palette fade (~30ms per step) instead of a smooth video crossfade.
  fader.style.transition = `opacity ${ms}ms steps(${Math.max(4, Math.round(ms / 30))})`
  fader.style.opacity = to ? '0' : '1'
  void fader.offsetWidth
  fader.style.opacity = to ? '1' : '0'
  await sleep(ms + 20)
}

export async function flash(times = 2, ms = 90) {
  const f = el('div', 'flashbang')
  uiRoot.appendChild(f)
  for (let i = 0; i < times; i++) {
    f.style.opacity = '1'
    await sleep(ms)
    f.style.opacity = '0'
    await sleep(ms)
  }
  f.remove()
}

/** Icon markup for an item id (pixel SVG). */
export function itemIcon(kind: string): string {
  const px = (rows: string[], pal: Record<string, string>) => {
    let r = ''
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = pal[row[x]]
        if (c) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${c}"/>`
      }
    })
    return `<svg class="px-icon" viewBox="0 0 12 12" shape-rendering="crispEdges">${r}</svg>`
  }
  const ICONS: Record<string, [string[], Record<string, string>]> = {
    wallet: [
      ['            ', '  kkkkkkkk  ', ' kbbbbbbbbk ', ' kbBBBBBBbk ', ' kbBwwwwBbk ', ' kbBwggwBbk ', ' kbBwwwwBbk ', ' kbBBBBBBbk ', ' kbbbbbbbbk ', '  kkkkkkkk  ', '   k    k   ', '            '],
      { k: '#141a33', b: '#0052ff', B: '#3d7bff', w: '#dfe9ff', g: '#27c46b' },
    ],
    ledger: [
      ['    kkkk    ', '   kyyyyk   ', '  kkkkkkkk  ', ' kddddddddk ', ' kdGGGGGGdk ', ' kdGwwwwGdk ', ' kdGGGGGGdk ', ' kddddddddk ', ' kdyyddyydk ', ' kddddddddk ', '  kkkkkkkk  ', '            '],
      { k: '#0e0e16', d: '#2b2d3a', G: '#1d2a22', w: '#7dffb1', y: '#f5c542' },
    ],
    hopium: [
      ['    kkkk    ', '    kwwk    ', '    kwwk    ', '   kkkkkk   ', '  kgggggGk  ', '  kgwgggGk  ', '  kgwgggGk  ', '  kggggggk  ', '  kGGGGGGk  ', '  kGGGGGGk  ', '   kkkkkk   ', '            '],
      { k: '#1b2a1b', w: '#ffffff', g: '#5cf08c', G: '#27c46b' },
    ],
    max_hopium: [
      ['    kkkk    ', '    kyyk    ', '    kyyk    ', '   kkkkkk   ', '  kppppPk   ', '  kpwpppPk  ', '  kpwpppPk  ', '  kppppppk  ', '  kPPPPPPk  ', '  kPPPPPPk  ', '   kkkkkk   ', '            '],
      { k: '#2a1033', w: '#ffffff', p: '#e27bff', P: '#b35cff', y: '#f5c542' },
    ],
    seed: [
      ['            ', '  kkkkkkkk  ', '  kwwwwwwk  ', '  kwllllwk  ', '  kwwwwwwk  ', '  kwllllwk  ', '  kwwwwwwk  ', '  kwlllwwk  ', '  kwwwwwwk  ', '  kkkkkkkk  ', '            ', '            '],
      { k: '#3b2a12', w: '#fff3cf', l: '#b08a4a' },
    ],
    mempool: [
      ['            ', '   kkkkkk   ', '  kssssssk  ', ' ksSSSSSSsk ', ' ksSwwwwSsk ', ' ksSwkkwSsk ', ' ksSwkkwSsk ', ' ksSwwwwSsk ', '  ksSSSSsk  ', '   kssssk   ', '    kkkk    ', '            '],
      { k: '#10162e', s: '#3d7bff', S: '#8fb4ff', w: '#e6eeff' },
    ],
  }
  const icon = ICONS[kind]
  return icon ? px(icon[0], icon[1]) : ''
}

/** Wait for a single A/B press (used by full-screen scenes). */
export function waitButton(): Promise<Btn> {
  return new Promise((resolve) => {
    const pop = input.push((b) => {
      if (b === 'a' || b === 'b' || b === 'start') {
        pop()
        resolve(b)
      }
    })
  })
}
