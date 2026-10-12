import { useEffect, useRef, useState } from 'react'
import type { AppProps } from '../../os/apps'
import { AboutDialog, GameDialog, GameMenuBar, loadGame, saveGame, useWindowFit, useWindowMinSize, useWindowState, useGamesMuted,
  setGamesMuted, unlockAudio, playJingle, stopSounds } from '../kit'
import { BACKS, CardHelp, CardHoldFeedback, DeckDialog, cardLabel, cardSfx, drawFace, drawBack, drawEmpty, drawFocus, hitTestPiles,
  subscribeCardArt, useCardPointer, useCardTweens, useDeckBack, useStockAnimation, type CardHit } from '../cards'
import { autoHome, canRecycle, cheatWin, deal, draw, flip, home, move, pile, tick, undo, vegasBank, DEFAULT_OPTIONS, type Options, type Source, type State } from './engine'
import { S } from './strings'
import { icon } from './icon'
import { winSong } from './music/win'
import { createCascade, stepCascade, type Cascade } from './cascade'
import { boardScale, dealOrder, layouts, positions } from './layout'
import './solitaire.css'

type Saved = { options: Options, bank: number }
function guarded(v: unknown): v is Saved {
  const s = v as Saved | null
  return !!s && Number.isFinite(s.bank) && !!s.options && [1, 3].includes(s.options.draw) && ['standard', 'vegas', 'none'].includes(s.options.scoring)
    && ['timed', 'status', 'outline', 'keep'].every(k => typeof s.options[k as keyof Options] === 'boolean')
}
function dealFlick() { cardSfx('deal') }
export default function Solitaire({ close }: AppProps) {
  const initial = useRef(loadGame<Saved>('solitaire', { options: DEFAULT_OPTIONS, bank: 0 }, guarded))
  const bank = useRef(initial.current.bank)
  const [state, setState] = useState(() => deal(Date.now(), initial.current.options, initial.current.bank))
  const current = useRef(state)
  current.current = state
  const [dialog, setDialog] = useState<'deck' | 'options' | 'confirm' | 'help' | 'about' | 'again' | null>(null)
  const [draft, setDraft] = useState<Options>(state.options)
  const [draftSound, setDraftSound] = useState(true)
  const [announcement, announce] = useState(S.dealt)
  const [selected, select] = useState<Source | null>(null)
  const [cursor, setCursor] = useState<Source>({ pile: 0, depth: 0 })
  const [keyboard, setKeyboard] = useState(false)
  const [size, setSize] = useState({ width: 585, height: 388 })
  const [art, setArt] = useState(0)
  const [celebrating, celebrate] = useState(false)
  const surface = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const overlay = useRef<HTMLCanvasElement>(null)
  const cascade = useRef<HTMLCanvasElement>(null)
  const physics = useRef<Cascade | null>(null)
  const modifiers = useRef(false)
  const { active, hidden, pocket } = useWindowState()
  const { muted } = useGamesMuted()
  const { back, remy } = useDeckBack()
  const fit = useWindowFit()
  const tween = useCardTweens(hidden)
  const scale = boardScale(state, size.width, size.height, pocket)
  const width = size.width / scale
  const height = size.height / scale
  const geometry = positions(state, width, height, pocket)
  const geomRef = useRef(geometry)
  geomRef.current = geometry
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  function commit(next: State, message: string, animate = true) {
    const old = current.current
    if (next === old) {
      cardSfx('invalid')
      announce(S.invalid)
      return
    }
    current.current = next
    setState(next)
    select(null)
    announce(next.options.scoring === 'none' ? message : `${message} ${S.score} ${next.score}`)
    if (animate) {
      const before = positions(old, width, height, pocket)
      const after = positions(next, width, height, pocket)
      tween.start(after.flatMap(h => {
        const prev = before.find(p => p.card?.id === h.card?.id)
        return h.card && prev && (h.x !== prev.x || h.y !== prev.y) ? [{ card: h.card, fromX: prev.x, fromY: prev.y, toX: h.x, toY: h.y }] : []
      }))
    }
    cardSfx(message === S.flipped ? 'flip' : message === S.drawn ? 'flick' : 'place')
  }
  function newDeal(options = current.current.options) {
    bank.current = vegasBank(current.current, bank.current)
    const next = deal(Date.now(), options, bank.current)
    celebrate(false)
    setDialog(null)
    tween.cancel()
    select(null)
    current.current = next
    setState(next)
    announce(S.dealt)
    cardSfx('shuffle')
    const hits = dealOrder(positions(next, width, height, pocket))
    tween.start(hits.map((h, i) => ({ card: h.card!, fromX: 11, fromY: 11, toX: h.x, toY: h.y, delay: i * 25, onStart: dealFlick })))
  }
  function finish() {
    celebrate(false)
    setDialog('again')
  }
  function tap(hit: CardHit | null) {
    if (!hit) {
      select(null)
      return
    }
    const s = current.current
    if (hit.pile === 0) {
      commit(draw(s, modifiers.current), S.drawn)
      return
    }
    if (selected) {
      const next = move(s, selected, hit.pile)
      if (next !== s) {
        commit(next, S.moved)
        return
      }
    }
    if (hit.card && !hit.card.faceUp) {
      commit(flip(s, hit), S.flipped, false)
      return
    }
    if (hit.card?.faceUp && (hit.pile !== 1 || hit.depth === s.waste.length - 1)) {
      select(hit)
      cardSfx('flick')
      announce(`${S.picked} ${cardLabel(hit.card)}`)
    }
  }
  const pointer = useCardPointer({
    disabled: !active || hidden || !!dialog || celebrating,
    outline: state.options.outline,
    hitTest: (x, y) => {
      const nx = x / scaleRef.current, ny = y / scaleRef.current
      const s = current.current
      const hits = geomRef.current
      for (let i = hits.length - 1; i >= 0; i--) {
        const h = hits[i]
        if (nx >= h.x && nx < h.x + 71 && ny >= h.y && ny < h.y + 96) {
          if (h.pile === 0 || (h.pile === 1 && h.depth !== s.waste.length - 1)) return { ...h, card: undefined }
          return h
        }
      }
      const empty = hitTestPiles(layouts(s, size.width / scaleRef.current, size.height / scaleRef.current, pocket), nx, ny)
      return empty?.card ? null : empty
    },
    onTap: tap,
    onDoubleTap: h => commit(home(current.current, h), S.moved),
    onDrop: (from, to) => {
      select(null)
      if (to) commit(move(current.current, from, to.pile), S.moved)
    },
    onContext: h => commit(h ? home(current.current, h) : autoHome(current.current), S.moved)
  })
  useEffect(() => { if (pointer.drag) select(null) }, [pointer.drag])
  const stockTime = useStockAnimation(BACKS[back].animated && !!state.stock.length, hidden || celebrating, !!pointer.drag)
  useWindowMinSize(585, 432)
  useEffect(() => { fit(585, 432) }, [])
  useEffect(() => subscribeCardArt(() => setArt(n => n + 1)), [])
  useEffect(() => {
    if (!surface.current) return
    const observer = new ResizeObserver(entries => {
      const r = entries[0].contentRect
      setSize({ width: r.width, height: r.height })
    })
    observer.observe(surface.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => { if (active && !dialog) surface.current?.focus({ preventScroll: true }) }, [active, dialog])
  useEffect(() => {
    bank.current = vegasBank(state, bank.current)
    saveGame('solitaire', { options: state.options, bank: bank.current })
  }, [state.options, state.score])
  useEffect(() => {
    if (hidden || !state.started || state.won || !state.options.timed || state.options.scoring !== 'standard') return
    const timer = window.setInterval(() => setState(s => {
      const n = tick(s)
      current.current = n
      return n
    }), 1000)
    return () => clearInterval(timer)
  }, [hidden, state.started, state.won, state.options.timed, state.options.scoring])
  useEffect(() => {
    if (state.won) {
      celebrate(true)
      announce(S.won)
      void playJingle(winSong, 'solitaire')
    }
  }, [state.won])
  useEffect(() => {
    if (hidden) stopSounds('solitaire')
    return () => stopSounds('solitaire')
  }, [hidden])
  useEffect(() => {
    const c = canvas.current
    if (!c || celebrating) return
    const dpr = window.devicePixelRatio || 1
    c.width = Math.round(size.width * dpr)
    c.height = Math.round(size.height * dpr)
    const ctx = c.getContext('2d')!
    ctx.scale(dpr * scale, dpr * scale)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#008000'
    ctx.fillRect(0, 0, width, height)
    for (const l of layouts(state, width, height, pocket)) {
      if (!l.cards.length) drawEmpty(ctx, l.pile === 0 ? canRecycle(state) ? 'recycle' : 'exhausted' : l.pile < 6 && l.pile > 1 ? 'home' : 'pile', l.x, l.y)
    }
    const moving = new Set(tween.tweens.map(t => t.card.id))
    for (const h of geometry) {
      if (!h.card || moving.has(h.card.id)) continue
      if (!state.options.outline && pointer.drag?.source.card?.faceUp && h.pile === pointer.drag.source.pile && h.depth >= pointer.drag.source.depth) continue
      if (h.card.faceUp) drawFace(ctx, h.card, h.x, h.y, { selected: selected?.pile === h.pile && h.depth >= selected.depth })
      else drawBack(ctx, back, h.x, h.y, h.pile === 0 ? stockTime : 0, remy)
    }
    if (keyboard) {
      const h = geometry.find(h => h.pile === cursor.pile && h.depth === cursor.depth) ?? layouts(state, width, height, pocket).find(l => l.pile === cursor.pile)
      if (h) drawFocus(ctx, h.x, h.y)
    }
  }, [state, size, pocket, art, back, remy, stockTime, keyboard, cursor, selected, pointer.drag, tween.tweens, celebrating])
  useEffect(() => {
    if (!celebrating) return
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.save()
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
    ctx.imageSmoothingEnabled = false
    // Lazy court decodes refresh only foundation faces, never the felt or trail surface.
    for (const h of geometry) {
      if (h.pile >= 2 && h.pile < 6 && h.card) drawFace(ctx, h.card, h.x, h.y)
    }
    ctx.restore()
    const simulation = physics.current
    const trails = cascade.current?.getContext('2d')
    if (!simulation || simulation.done || !trails) return
    const card = state.homes[simulation.homes[simulation.index % 4]][12 - Math.floor(simulation.index / 4)]
    if (!card) return
    trails.save()
    trails.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
    trails.imageSmoothingEnabled = false
    drawFace(trails, card, simulation.x, simulation.y)
    trails.restore()
  }, [art, celebrating])
  useEffect(() => {
    const c = overlay.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = Math.round(size.width * dpr)
    c.height = Math.round(size.height * dpr)
    const ctx = c.getContext('2d')!
    ctx.scale(dpr * scale, dpr * scale)
    const paint = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'
      for (const t of tween.tweens) {
        if (t.card.faceUp) drawFace(ctx, t.card, t.x, t.y)
        else drawBack(ctx, back, t.x, t.y, 0, remy)
      }
      const drag = pointer.drag
      if (drag) {
        const dx = (drag.x - drag.originX) / scale
        const dy = (drag.y - drag.originY) / scale
        for (const h of geometry) {
          if (!h.card || h.pile !== drag.source.pile || h.depth < drag.source.depth || !h.card.faceUp) continue
          if (state.options.outline) {
            ctx.globalCompositeOperation = 'difference'
            ctx.strokeStyle = '#fff'
            ctx.lineWidth = 1
            ctx.strokeRect(Math.round(h.x + dx) + .5, Math.round(h.y + dy) + .5, 70, 95)
          } else drawFace(ctx, h.card, h.x + dx, h.y + dy)
        }
      }
    }
    paint()
    if (!pointer.drag || hidden) return
    let frame = 0
    const step = () => {
      paint()
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [pointer.drag, tween.tweens, size, pocket, back, remy, state.options.outline, hidden])
  useEffect(() => {
    if (!celebrating || hidden) return
    const c = cascade.current!
    const dpr = window.devicePixelRatio || 1
    if (c.width !== Math.round(size.width * dpr) || c.height !== Math.round(size.height * dpr)) {
      c.width = Math.round(size.width * dpr)
      c.height = Math.round(size.height * dpr)
    }
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
    ctx.imageSmoothingEnabled = false
    const simulation = physics.current ?? createCascade(width, state.homes)
    physics.current = simulation
    let frame = 0, previous = 0, debt = 0, bounceAt = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const step = (now: number) => {
      debt += previous ? Math.min(100, now - previous) : 1000 / 60
      previous = now
      while (debt >= 1000 / 60) {
        debt -= 1000 / 60
        if (stepCascade(simulation, width, height) && now - bounceAt >= 125) {
          cardSfx('place')
          bounceAt = now
        }
        if (simulation.done || (reduced && simulation.elapsed >= 1400)) {
          finish()
          return
        }
        const card = state.homes[simulation.homes[simulation.index % 4]][12 - Math.floor(simulation.index / 4)]
        if (card) drawFace(ctx, card, simulation.x, simulation.y)
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [celebrating, hidden, size])
  useEffect(() => {
    if (!celebrating && dialog !== 'again') {
      physics.current = null
      cascade.current?.getContext('2d')?.clearRect(0, 0, cascade.current.width, cascade.current.height)
    }
  }, [celebrating, dialog])
  function applyOptions() {
    if (draft.draw !== state.options.draw || draft.scoring !== state.options.scoring) {
      setDialog('confirm')
      return
    }
    setGamesMuted(!draftSound)
    setState(s => ({ ...s, options: draft }))
    setDialog(null)
  }
  return <div className='solitaire' onPointerDownCapture={e => {
    if (celebrating && active) {
      e.preventDefault()
      e.stopPropagation()
      finish()
    }
  }} onKeyDownCapture={e => {
    if (celebrating && active) {
      e.preventDefault()
      e.stopPropagation()
      finish()
    }
  }}>
    <GameMenuBar menus={[
      { label: S.game, items: [{ label: S.deal, hotkey: 'F2', onClick: () => newDeal() }, '-',
        { label: S.undo, hotkey: 'Ctrl+Z', disabled: !state.undo || celebrating, onClick: () => commit(undo(current.current), S.undone, false) }, '-',
        { label: S.deck, onClick: () => setDialog('deck') }, { label: S.options, onClick: () => {
          setDraft({ ...state.options })
          setDraftSound(!muted)
          setDialog('options')
        } }, '-',
        { label: S.exit, onClick: close }] },
      { label: S.help, items: [{ label: S.contents, hotkey: 'F1', onClick: () => setDialog('help') }, '-', { label: S.about, onClick: () => setDialog('about') }] }
    ]}/>
    <div ref={surface} className='solitaire-felt' tabIndex={0} role='application' aria-label={S.title}
      onPointerMove={pointer.onPointerMove} onPointerUp={pointer.onPointerUp} onPointerCancel={pointer.onPointerCancel}
      onLostPointerCapture={pointer.onLostPointerCapture} onContextMenu={pointer.onContextMenu} onPointerDown={e => {
        if (!active) return
        unlockAudio()
        setKeyboard(false)
        if (celebrating) {
          finish()
          return
        }
        modifiers.current = e.ctrlKey && e.altKey && e.shiftKey
        pointer.onPointerDown(e)
      }} onKeyDown={e => {
        if (!active) return
        unlockAudio()
        if (celebrating) {
          e.preventDefault()
          finish()
          return
        }
        if (dialog) return
        if (e.altKey && e.shiftKey && e.code === 'Digit2') {
          e.preventDefault()
          commit(cheatWin(current.current), S.won, false)
          return
        }
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape'].includes(e.key)) return
        e.preventDefault()
        setKeyboard(true)
        if (e.key === 'Escape') {
          select(null)
          announce(S.cancelled)
          return
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const p = (cursor.pile + (e.key === 'ArrowLeft' ? 12 : 1)) % 13
          setCursor({ pile: p, depth: Math.max(0, pile(state, p).length - 1) })
          return
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          if (cursor.pile >= 6) {
            const cards = pile(state, cursor.pile)
            const first = cards.findIndex(c => c.faceUp)
            setCursor({ ...cursor, depth: Math.max(Math.max(0, first), Math.min(cards.length - 1, cursor.depth + (e.key === 'ArrowUp' ? -1 : 1))) })
          }
          return
        }
        const depth = Math.min(cursor.depth, Math.max(0, pile(state, cursor.pile).length - 1))
        const h = geometry.find(h => h.pile === cursor.pile && h.depth === depth)
        tap(h ?? { pile: cursor.pile, depth: -1, x: 0, y: 0 })
      }}>
      <canvas ref={canvas}/><canvas ref={cascade} className='solitaire-cascade'/>
      <canvas ref={overlay} className='solitaire-overlay'
        style={{ mixBlendMode: state.options.outline && pointer.drag ? 'difference' : 'normal' }}/>
      <CardHoldFeedback hold={pointer.longPress}/>
    </div>
    {state.options.status && <div className='solitaire-status'><span>{celebrating ? S.cabald : ''}</span>
      <span title={state.options.scoring === 'vegas' ? S.bankTip : undefined} className={state.score < 0 ? 'negative' : ''}>
        {state.options.scoring !== 'none' && `${S.score} ${state.options.scoring === 'vegas' ? '$' : ''}${state.score}`}
        {state.options.timed && state.options.scoring === 'standard' && `  ${S.time} ${state.seconds}`}
      </span></div>}
    <span className='solitaire-live' aria-live='polite'>{announcement}</span>
    {dialog === 'deck' && <DeckDialog onClose={() => setDialog(null)}/>}
    {dialog === 'help' && <CardHelp title={S.title} sections={S.sections} onClose={() => setDialog(null)}/>}
    {dialog === 'about' && <AboutDialog game={S.title} icon={icon} version={S.version} flavour={S.flavour} lines={S.credits} onClose={() => setDialog(null)}/>}
    {dialog === 'options' && <GameDialog title={S.optionTitle} width={330} onClose={() => setDialog(null)} buttons={[
      { label: S.ok, default: true, onClick: applyOptions }, { label: S.cancel, cancel: true, onClick: () => setDialog(null) }
    ]}><div className='solitaire-options'>
      <fieldset><legend>{S.draw}</legend>{([1, 3] as const).map(d => <label key={d}><input type='radio' name='draw' checked={draft.draw === d}
        onChange={() => setDraft({ ...draft, draw: d })}/>{d === 1 ? S.one : S.three}</label>)}</fieldset>
      <fieldset><legend>{S.scoring}</legend>{(['standard', 'vegas', 'none'] as const).map(scoring => <label key={scoring}>
        <input type='radio' name='scoring' checked={draft.scoring === scoring} onChange={() => setDraft({ ...draft, scoring })}/>{S[scoring]}</label>)}</fieldset>
      {(['timed', 'status', 'outline', 'keep'] as const).map(k => <label key={k}><input type='checkbox' checked={draft[k]}
        disabled={k === 'timed' ? draft.scoring !== 'standard' : k === 'keep' ? draft.scoring !== 'vegas' : false}
        onChange={e => setDraft({ ...draft, [k]: e.target.checked })}/>{S[k]}</label>)}
      <label><input type='checkbox' checked={draftSound} onChange={e => setDraftSound(e.target.checked)}/>{S.sound}</label>
    </div></GameDialog>}
    {(dialog === 'confirm' || dialog === 'again') && <GameDialog title={S.title} onClose={() => setDialog(null)} buttons={[
      { label: S.yes, default: true, onClick: () => {
        if (dialog === 'confirm') setGamesMuted(!draftSound)
        newDeal(dialog === 'confirm' ? draft : state.options)
      } },
      { label: S.no, cancel: true, onClick: () => setDialog(dialog === 'confirm' ? 'options' : null) }
    ]}><p>{dialog === 'confirm' ? S.confirm : S.again}</p></GameDialog>}
  </div>
}
