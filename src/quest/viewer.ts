/** The collection at full resolution. Shared by world exhibits and the Remydex. */
import { art } from './art'
import { audio } from './audio'
import { TYPE_COLOR, artSrc, species } from './data'
import { input } from './input'
import { S } from './state'
import { el, sleep, uiRoot } from './ui'
import './viewer.css'

export interface ViewArtOptions {
  wing?: string
  living?: boolean
}

export async function viewArt(idx: number, opts: ViewArtOptions = {}): Promise<void> {
  // World interaction runs inside onAny, before the same press reaches the UI focus stack.
  await Promise.resolve()
  const info = art.get(idx)
  const type = species(idx).type
  const root = el('section', 'art-viewer')
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', `Remy #${idx} artwork`)
  root.style.setProperty('--art-accent', TYPE_COLOR[type])
  const header = el('div', 'art-viewer-header')
  header.append(el('span', '', 'THE FLOOR'), el('span', '', opts.wing ?? 'THE REMY COLLECTION'))
  const stage = el('div', 'art-viewer-stage')
  const frame = el('div', 'art-viewer-frame')
  const image = el('img', 'art-viewer-image')
  image.alt = `Original Based Remy Boys artwork #${idx}`
  image.src = artSrc(idx)
  image.decoding = 'async'
  const loading = el('span', 'art-viewer-loading', 'UNVEILING ORIGINAL…')
  image.onload = () => { loading.remove(); frame.classList.add('is-loaded') }
  image.onerror = () => { loading.textContent = 'ART UNAVAILABLE · TAP TO RETURN' }
  frame.append(image, loading)
  stage.append(frame)
  const plaque = el('div', 'art-viewer-plaque')
  const title = el('div', 'art-viewer-title')
  title.append(el('strong', '', `REMY #${idx}`), el('span', 'art-viewer-type', type))
  const epithet = 'epithet' in info && typeof info.epithet === 'string' ? info.epithet : 'One of 4,490. Never another you.'
  const status = S.caught.includes(idx) ? 'MINTED · IN YOUR COLLECTION' : S.seen.includes(idx) ? 'SEEN · NOT YET MINTED' : 'UNDISCOVERED · A NEW FACE'
  plaque.append(title, el('div', 'art-viewer-epithet', epithet), el('div', 'art-viewer-status', status))
  const footer = el('button', 'art-viewer-close', opts.living ? 'IT’S BREATHING… · TAP / A / B CLOSE' : 'TAP / A / B · RETURN')
  footer.type = 'button'
  root.append(header, stage, plaque, footer)
  uiRoot.append(root)
  audio.sfx('select')
  const previous = document.activeElement
  footer.focus({ preventScroll: true })
  return new Promise((resolve) => {
    let closed = false
    const close = () => {
      if (closed) return
      closed = true
      pop()
      root.remove()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true })
      audio.sfx('back')
      resolve()
    }
    const pop = input.push((b) => { if (b === 'a' || b === 'b' || b === 'start') close() })
    root.addEventListener('click', close)
  })
}

/** A living exhibit leaves its frame before the normal wild-battle transition. */
export async function awakenArt(idx: number): Promise<void> {
  const root = el('div', 'art-awakening')
  const head = art.head(idx)
  const portrait = el('canvas')
  portrait.width = 32
  portrait.height = 32
  const ctx = portrait.getContext('2d')
  if (ctx && head) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(head.img, head.sx, head.sy, head.sw, head.sh, 0, 0, 32, 32)
  }
  root.append(portrait, el('span', '', `REMY #${idx} STEPPED OUT OF THE FRAME!`))
  uiRoot.append(root)
  audio.sfx('alert')
  await sleep(950)
  root.remove()
}
