import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AboutDialog, GameDialog, GameMenuBar, loadGame, saveGame, unlockAudio, useGamesMuted, useWindowFit, useWindowState,
  stopSounds, playJingle, useCrispCanvas, useAnimationFrame, useWindowCloseGuard, useWindowMinSize } from '../kit'
import { BACKS, CARD_W, CARD_H, CardHelp, CardHoldFeedback, DeckDialog, cardLabel, cardSfx, drawBack, drawBackStrip, drawEmpty, drawFace,
  drawPocketFace, drawFocus, drawHighlight, isDoubleClick, pileCardPositions, subscribeCardArt, useCardPointer, useCardTweens, useDeckBack, useStockAnimation,
  type CardTweenMove } from '../cards'
import { availableMoves, canDeal, defaults, dealRow, exitAction, hintAt, movable, moveCards, newGame, openSavedGame, recordResult, storedGuard, undo,
  type Difficulty, type Options, type Position, type SpiderState } from './engine'
import { S } from './strings'
import { Fireworks } from './fireworks'
import { spiderHitTest, spiderLayout } from './layout'
import { runNote, winJingle } from './music/jingles'
import icon from './icon'
import './spider.css'

type Props = { param?: string; close: () => void; navigate: (path: string) => void }
type Dialog = 'help' | 'about' | 'deck' | 'difficulty' | 'stats' | 'options' | 'win' | null
type Question = { text: string; yes: () => void; no?: () => void; cancel?: boolean }

export default function Spider({ param, close }: Props) {
  const [stored, setStored] = useState(() => loadGame('spider', defaults(), storedGuard))
  const [state, setState] = useState<SpiderState>(() => {
    if (['1', '2', '4'].includes(param ?? '')) return newGame(Date.now() >>> 0, Number(param) as Difficulty)
    return stored.options.alwaysOpen && stored.saved ? stored.saved : newGame(Date.now() >>> 0)
  })
  const current = useRef(state)
  current.current = state
  const storage = useRef(stored)
  storage.current = stored
  const surface = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 536 })
  const [dialog, setDialog] = useState<Dialog>(null)
  const [touch, setTouch] = useState(false)
  const [question, setQuestion] = useState<Question | null>(null)
  const [message, setMessage] = useState(S.start)
  const [selection, setSelection] = useState<Position | null>(null)
  const [cursor, setCursor] = useState<Position>({ pile: 0, depth: state.piles[0].length - 1 })
  const [keyboardMode, setKeyboardMode] = useState(false)
  const [pages, setPages] = useState<number[]>([])
  const dealing = useRef(false)
  const stockGesture = useRef<{ time: number; key: string } | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>(state.difficulty)
  const [draft, setDraft] = useState<Options>(stored.options)
  const [statsDifficulty, setStatsDifficulty] = useState<Difficulty>(state.difficulty)
  const [hint, setHint] = useState<{ source: Position; to: number; phase: number } | null>(null)
  const hintIndex = useRef(0)
  const [celebrating, setCelebrating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const fireworks = useRef(new Fireworks())
  const accounted = useRef(state.completed.length === 8)
  const { active, hidden, pocket } = useWindowState()
  const fit = useWindowFit()
  const { muted, setMuted } = useGamesMuted()
  const deck = useDeckBack()
  const animation = useCardTweens(hidden)
  const [artVersion, redrawArt] = useState(0)
  const crisp = useCrispCanvas(Math.round(size.w), Math.round(size.h), { onResize: () => redrawArt(v => v + 1) })
  const canvas = crisp.ref
  const boardLayout = useMemo(() => spiderLayout(state, size.w, size.h, pocket, pages), [state, size, pocket, pages])
  const { scale, cardW, cardH, bottom, layouts, stockX, top, viewBottom } = boardLayout
  const blocked = !active || hidden || !!dialog || !!question || celebrating
  useWindowMinSize(760, 520)
  useWindowCloseGuard(exit)

  useEffect(() => { fit(800, 560) }, [fit])
  useEffect(() => {
    const node = surface.current
    if (!node) return
    const observer = new ResizeObserver(entries => {
      const r = entries[0].contentRect
      setSize({ w: r.width, h: r.height })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => subscribeCardArt(() => redrawArt(v => v + 1)), [])
  useEffect(() => { if (active && !dialog && !question) surface.current?.focus({ preventScroll: true }) }, [active, dialog, question])
  useEffect(() => { saveGame('spider', stored) }, [stored])
  useEffect(() => () => stopSounds('spider'), [])
  useEffect(() => { if (hidden) stopSounds('spider') }, [hidden])
  useEffect(() => {
    if (state.completed.length === 8) { setDialog('win'); return }
    if (state.moves || !stored.options.animation) return
    const target = spiderLayout(state, size.w, size.h, pocket)
    animation.start(target.layouts.flatMap(layout => pileCardPositions(layout).map(hit => ({
      card: hit.card!, fromX: target.stockX / target.scale, fromY: target.bottom / target.scale,
      toX: hit.x, toY: hit.y, delay: (hit.depth * 10 + hit.pile) * 9
    }))))
  }, [])

  function save() {
    const next = { ...storage.current, saved: current.current }
    saveGame('spider', next)
    setStored(next)
    setMessage(S.saved)
  }
  function countLoss() {
    const s = current.current
    if (!accounted.current && s.moves > 0 && s.completed.length < 8) {
      accounted.current = true
      const v = storage.current
      const next = { ...v, stats: { ...v.stats, [s.difficulty]: recordResult(v.stats[s.difficulty], false, s.score) } }
      storage.current = next
      saveGame('spider', next)
      setStored(next)
    }
  }
  function begin(d = current.current.difficulty, seed = Date.now() >>> 0) {
    countLoss()
    animation.cancel()
    dealing.current = false
    stockGesture.current = null
    const next = newGame(seed, d)
    setPages([])
    setCursor({ pile: 0, depth: next.piles[0].length - 1 })
    setState(next)
    if (storage.current.options.animation) {
      const target = spiderLayout(next, size.w, size.h, pocket)
      const moves = target.layouts.flatMap(layout => pileCardPositions(layout).map(hit => ({
        card: hit.card!, fromX: target.stockX / target.scale, fromY: target.bottom / target.scale,
        toX: hit.x, toY: hit.y, delay: (hit.depth * 10 + hit.pile) * 9
      })))
      animation.start(moves)
    }
    setSelection(null)
    setHint(null)
    setCelebrating(false)
    setElapsed(0)
    setDialog(null)
    hintIndex.current = 0
    accounted.current = false
    setMessage(S.new)
    cardSfx('shuffle')
  }
  function exit() {
    const action = exitAction(storage.current.options, current.current.moves > 0 && current.current.completed.length < 8)
    if (action === 'prompt') {
      setQuestion({ text: S.saveExit, yes: () => { save(); close() }, no: () => { countLoss(); close() }, cancel: true })
    } else { if (action === 'save') save(); else countLoss(); close() }
  }
  function open() {
    const loaded = openSavedGame(loadGame('spider', defaults(), storedGuard), current.current, accounted.current)
    if (!loaded?.saved) { setMessage(S.missing); setQuestion({ text: S.missing, yes: () => {} }); return }
    animation.cancel()
    dealing.current = false
    storage.current = loaded
    saveGame('spider', loaded)
    setStored(loaded)
    setState(loaded.saved)
    setPages([])
    setCursor({ pile: 0, depth: loaded.saved.piles[0].length - 1 })
    setSelection(null)
    setHint(null)
    setCelebrating(false)
    hintIndex.current = 0
    accounted.current = loaded.saved.completed.length === 8
    setMessage(S.opened)
    if (accounted.current) setDialog('win')
  }
  function commit(next: SpiderState, from?: Position, to?: number, deal = false) {
    const before = current.current
    if (next === before) { cardSfx('invalid'); setMessage(S.invalid); return }
    const moves: CardTweenMove[] = []
    const oldPositions = layouts.flatMap(pileCardPositions)
    const completed = next.completed.length > before.completed.length
    const target = spiderLayout(next, size.w, size.h, pocket)
    if (storage.current.options.animation) {
      const cards = deal ? before.stock.slice(0, 10).map(card => ({ ...card, faceUp: true })) : from ? before.piles[from.pile].slice(from.depth) : []
      for (const card of cards) {
        const old = oldPositions.find(p => p.card?.id === card.id)
        const p = next.piles.findIndex(pile => pile.some(c => c.id === card.id))
        if (p >= 0) {
          const depth = next.piles[p].findIndex(c => c.id === card.id)
          const positions = pileCardPositions(target.layouts[p])
          const dest = positions[depth]
          moves.push({ card, fromX: old?.x ?? stockX / scale, fromY: old?.y ?? bottom / scale,
            toX: dest.x, toY: dest.y, delay: deal ? p * 14 : 0 })
        }
      }
      for (let run = before.completed.length; run < next.completed.length; run++) for (let index = 0; index < 13; index++) {
        const card = next.completed[run][index]
        const old = oldPositions.find(p => p.card?.id === card.id)
        moves.push({ card, fromX: old?.x ?? layouts[to ?? 0].x, fromY: old?.y ?? layouts[to ?? 0].y,
          toX: (14 + run * 10) / scale, toY: bottom / scale, delay: (run - before.completed.length) * 780 + index * 60, onStart: () => runNote(index) })
      }
    }
    setState(next)
    setPages([])
    setCursor(c => ({ pile: c.pile, depth: next.piles[c.pile].length - 1 }))
    setSelection(null)
    setHint(null)
    hintIndex.current = 0
    if (moves.length) {
      dealing.current = deal
      animation.start(moves, () => { dealing.current = false })
    }
    cardSfx(deal ? 'deal' : 'place')
    if (before.piles.some((p, i) => p.some(c => !c.faceUp && next.piles[i].some(n => n.id === c.id && n.faceUp)))) cardSfx('flip')
    setMessage(completed ? `${S.completed(next.completed.length)} ${from ? cardLabel(before.piles[from.pile][from.depth]) : ''}` :
      from && to !== undefined ? S.moved(from.pile, to, next.score, cardLabel(before.piles[from.pile][from.depth])) : `${S.score}: ${next.score} / ${S.moves}: ${next.moves}`)
    if (next.completed.length === 8 && !accounted.current) {
      accounted.current = true
      setStored(s => ({ ...s, stats: { ...s.stats, [next.difficulty]: recordResult(s.stats[next.difficulty], true, next.score) } }))
      fireworks.current = new Fireworks()
      setElapsed(0)
      setCelebrating(true)
      setMessage(S.won)
      void playJingle(winJingle, 'spider')
    }
  }
  function deal() {
    if (dealing.current || !state.stock.length) return
    if (state.piles.some(p => !p.length) && state.stock.length) { setQuestion({ text: S.empty, yes: () => {} }); cardSfx('invalid'); return }
    if (canDeal(state)) commit(dealRow(state), undefined, undefined, true)
    else setQuestion({ text: S.none, yes: () => {} })
  }
  function stockTap() {
    if (blocked || !state.stock.length) return
    const now = performance.now()
    if (isDoubleClick(stockGesture.current, 'stock', now)) {
      stockGesture.current!.time = -Infinity
      return
    }
    if (dealing.current) return
    if (stockGesture.current) stockGesture.current.time = now
    else stockGesture.current = { time: now, key: 'stock' }
    deal()
  }
  function showHint(pile?: number) {
    if (pile !== undefined) {
      const m = availableMoves(state).find(m => m.pile === pile)
      if (m) { reveal(m); setHint({ source: m, to: m.to, phase: 0 }); setMessage(S.hintText(m.pile, m.to, cardLabel(state.piles[m.pile][m.depth]))); return }
      setQuestion({ text: S.noPileMoves(pile), yes: () => {} }); return
    }
    const h = hintAt(state, hintIndex.current++)
    if (h.kind === 'move') { reveal(h.move); setHint({ source: h.move, to: h.move.to, phase: 0 }); setMessage(S.hintText(h.move.pile, h.move.to, cardLabel(state.piles[h.move.pile][h.move.depth]))) }
    else {
      if (h.kind === 'none') hintIndex.current = 0
      setHint(null)
      setQuestion(h.kind === 'deal' ? { text: S.offer, yes: deal, no: () => {} } : {
        text: h.reason === 'finished' ? S.noMoreHints : h.reason === 'no-useful' ? S.noUseful : S.none, yes: () => {},
      })
    }
  }
  function reveal(position: Position) {
    const hit = pileCardPositions(layouts[position.pile])[position.depth]
    if (!hit) return
    const y = hit.y * scale
    if (y < top || y + cardH > viewBottom) setPages(p => {
      const next = [...p]
      next[position.pile] = Math.max(0, Math.min(boardLayout.maxScroll[position.pile], boardLayout.scroll[position.pile] + y - top))
      return next
    })
  }
  function returnRun(source: Position & { x: number; y: number }) {
    const drag = pointer.drag
    if (!drag || !movable(state, source.pile, source.depth)) return
    dealing.current = false
    animation.start(state.piles[source.pile].slice(source.depth).map((card, i) => ({
      card, fromX: source.x + (drag.x - drag.originX) / scale,
      fromY: source.y + (drag.y - drag.originY) / scale + i * (pocket ? 32 / scale : 18),
      toX: source.x, toY: source.y + i * (pocket ? 32 / scale : 18)
    })))
    cardSfx('invalid')
    setMessage(S.invalid)
  }
  const pointer = useCardPointer({
    disabled: blocked,
    hitTest: (x, y) => state.stock.length && y >= bottom && x >= stockX ? { pile: 10, depth: -1, x, y } : spiderHitTest(boardLayout, x, y),
    onTap: hit => {
      if (!hit) { setSelection(null); return }
      if (hit.pile === 10) { stockTap(); return }
      if (selection) {
        if (selection.pile === hit.pile) setSelection(null)
        else commit(moveCards(state, { ...selection, to: hit.pile }), selection, hit.pile)
      } else if (movable(state, hit.pile, hit.depth)) { setSelection(hit); setCursor(hit); setMessage(S.selected(hit.pile, cardLabel(state.piles[hit.pile][hit.depth]))); cardSfx('flick') }
    },
    onDoubleTap: hit => { if (hit?.pile === 10) stockTap() },
    onDrop: (source, target) => {
      if (source.pile >= 10) return
      const next = target && target.pile < 10 ? moveCards(state, { pile: source.pile, depth: source.depth, to: target.pile }) : state
      if (next === state) returnRun(source)
      else commit(next, source, target!.pile)
    },
    onContext: hit => { if (hit && hit.pile < 10) showHint(hit.pile) }
  })
  const stockTime = useStockAnimation(BACKS[deck.back].animated && state.stock.length > 0, hidden, !!pointer.drag)

  useEffect(() => {
    if (!hint || hidden) return
    const timer = window.setTimeout(() => {
      if (hint.phase === 3) reveal({ pile: hint.to, depth: state.piles[hint.to].length - 1 })
      setHint(h => h && h.phase < 7 ? { ...h, phase: h.phase + 1 } : null)
    }, 180)
    return () => clearTimeout(timer)
  }, [hint, hidden])
  useAnimationFrame(dt => {
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1200 : 6000
    const next = elapsed + dt * 1000
    setElapsed(next)
    if (next >= duration) { setCelebrating(false); setDialog('win') }
  }, { paused: !celebrating, activeOnly: false })
  useEffect(() => {
    const ctx = crisp.ctx.current
    if (!ctx || hidden) return
    ctx.setTransform(ctx.canvas.width / size.w, 0, 0, ctx.canvas.height / size.h, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#008000'
    ctx.fillRect(0, 0, size.w, size.h)
    ctx.save()
    ctx.scale(scale, scale)
    const face = (card: SpiderState['stock'][number], x: number, y: number) => {
      if (!pocket) { drawFace(ctx, card, x, y); return }
      ctx.save()
      ctx.scale(1 / scale, 1 / scale)
      drawPocketFace(ctx, card, x * scale, y * scale, cardW, cardH, { indexScale: 2 })
      ctx.restore()
    }
    ctx.save()
    const highlight = (x: number, y: number) => {
      ctx.save()
      ctx.translate(Math.round(x), Math.round(y))
      ctx.scale(1, cardH / scale / CARD_H)
      drawHighlight(ctx, 0, 0)
      ctx.restore()
    }
    ctx.beginPath()
    ctx.rect(0, top / scale, size.w / scale, (viewBottom - top) / scale)
    ctx.clip()
    const tweenIds = new Set(animation.tweens.map(t => t.card.id))
    const dragged = pointer.drag && pointer.drag.source.pile < 10 && movable(state, pointer.drag.source.pile, pointer.drag.source.depth)
      ? state.piles[pointer.drag.source.pile].slice(pointer.drag.source.depth) : []
    for (const layout of layouts) {
      if (!layout.cards.length) drawEmpty(ctx, 'pile', layout.x, layout.y)
      for (const hit of pileCardPositions(layout)) {
        const c = hit.card!
        if (tweenIds.has(c.id) || dragged.some(d => d.id === c.id)) continue
        const x = Math.round(hit.x)
        const y = Math.round(hit.y)
        if (c.faceUp) face(c, x, y)
        else if (hit.depth < layout.cards.length - 1) drawBackStrip(ctx, deck.back, x, y, 4, deck.remy)
        else drawBack(ctx, deck.back, x, y, 0, deck.remy)
        if (selection?.pile === hit.pile && hit.depth >= selection.depth) highlight(hit.x, hit.y)
        if (hint && hint.phase % 2 === 0 && (hint.phase < 4 ? hint.source.pile === hit.pile && hit.depth >= hint.source.depth : hint.to === hit.pile && hit.depth === layout.cards.length - 1)) highlight(hit.x, hit.y)
      }
      if (hint && hint.phase >= 4 && hint.phase % 2 === 0 && hint.to === layout.pile && !layout.cards.length) {
        ctx.strokeStyle = '#fff'; ctx.strokeRect(layout.x, layout.y, CARD_W, CARD_H)
      }
    }
    const focus = pileCardPositions(layouts[cursor.pile]).find(h => h.depth === cursor.depth)
    if (keyboardMode && active && !dialog && !question) {
      drawFocus(ctx, Math.round(focus?.x ?? layouts[cursor.pile].x), Math.round(focus?.y ?? layouts[cursor.pile].y), CARD_W, cardH / scale)
    }
    ctx.restore()
    for (let i = 0; i < state.completed.length; i++) {
      const c = state.completed[i][0]
      if (!tweenIds.has(c.id)) face(c, Math.round((14 + i * 10) / scale), Math.round(bottom / scale))
    }
    for (let i = 0; i < state.stock.length / 10; i++) drawBack(ctx, deck.back, Math.round((stockX + i * 5) / scale), Math.round(bottom / scale), stockTime, deck.remy)
    for (const t of animation.tweens) {
      if (t.card.faceUp) face(t.card, t.x, t.y)
      else drawBack(ctx, deck.back, t.x, t.y, 0, deck.remy)
    }
    if (pointer.drag) for (let i = 0; i < dragged.length; i++) {
      const x = (pointer.drag.x - pointer.drag.originX) / scale + pointer.drag.source.x
      const y = (pointer.drag.y - pointer.drag.originY) / scale + pointer.drag.source.y + i * (pocket ? 32 / scale : 18)
      face(dragged[i], x, y)
    }
    ctx.restore()
    if (celebrating) fireworks.current.draw(ctx, elapsed, size.w, size.h, pocket)
  }, [state, size, scale, cardW, cardH, top, viewBottom, pocket, layouts, bottom, stockX, deck.back, deck.remy, stockTime, selection, hint, pointer.drag,
    animation.tweens, cursor, keyboardMode, active, hidden, artVersion, dialog, question, celebrating, elapsed])

  function skip() { setCelebrating(false); setDialog('win'); stopSounds('spider') }
  function key(e: KeyboardEvent<HTMLDivElement>) {
    if (!active || hidden || e.target !== surface.current) return
    unlockAudio()
    if (celebrating) { e.preventDefault(); skip(); return }
    if (dialog || question) return
    setKeyboardMode(true)
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Escape'].includes(e.key)) e.preventDefault()
    if (e.key === 'Escape') setSelection(null)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const pile = (cursor.pile + (e.key === 'ArrowRight' ? 1 : 9)) % 10
      setCursor({ pile, depth: state.piles[pile].length - 1 })
      reveal({ pile, depth: state.piles[pile].length - 1 })
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const p = state.piles[cursor.pile]
      const delta = e.key === 'ArrowUp' ? -1 : 1
      const depth = Math.max(0, Math.min(p.length - 1, cursor.depth + delta))
      if (movable(state, cursor.pile, depth)) { setCursor({ ...cursor, depth }); reveal({ ...cursor, depth }) }
    } else if (e.key === ' ') {
      if (selection) commit(moveCards(state, { ...selection, to: cursor.pile }), selection, cursor.pile)
      else if (movable(state, cursor.pile, cursor.depth)) { setSelection(cursor); cardSfx('flick'); setMessage(S.selected(cursor.pile, cardLabel(state.piles[cursor.pile][cursor.depth]))) }
    }
  }
  function optionsDialog() { setDraft(stored.options); setDialog('options') }
  const menus = [
    { label: S.game, items: [
      { label: S.newGame, hotkey: 'F2', onClick: () => begin() }, { label: S.restart, onClick: () => begin(state.difficulty, state.seed) }, '-' as const,
      { label: S.undo, hotkey: 'Ctrl+Z', disabled: !state.history.length, onClick: () => commit(undo(state)) },
      { label: S.dealRow, hotkey: 'D', disabled: !state.stock.length, onClick: deal }, { label: S.hint, hotkey: 'M', onClick: () => showHint() }, '-' as const,
      { label: S.difficulty, hotkey: 'F3', onClick: () => { setDifficulty(state.difficulty); setDialog('difficulty') } },
      { label: S.stats, hotkey: 'F4', onClick: () => { setStatsDifficulty(state.difficulty); setDialog('stats') } },
      { label: S.options, hotkey: 'F5', onClick: optionsDialog }, '-' as const,
      { label: S.save, hotkey: 'Ctrl+S', onClick: save }, { label: S.open, hotkey: 'Ctrl+O', onClick: open }, '-' as const,
      { label: S.deck, onClick: () => setDialog('deck') }, '-' as const, { label: S.exit, onClick: exit }
    ] },
    { label: S.help, items: [{ label: S.contents, hotkey: 'F1', onClick: () => setDialog('help') }, '-' as const,
      { label: S.about, onClick: () => setDialog('about') }] }
  ]
  const stats = stored.stats[statsDifficulty]
  return <div className={`spider-game${pocket ? ' spider-pocket' : ''}`} onPointerDownCapture={e => {
    if (!active || hidden) return
    setTouch(e.pointerType === 'touch')
    setKeyboardMode(false)
    unlockAudio()
    if (celebrating) { e.preventDefault(); e.stopPropagation(); skip() }
  }} onKeyDownCapture={e => {
    if (!active || hidden) return
    setKeyboardMode(true)
    unlockAudio()
    if (celebrating) { e.preventDefault(); e.stopPropagation(); skip() }
  }}>
    <GameMenuBar menus={menus} disabled={celebrating || !!dialog || !!question} />
    <div ref={surface} className="spider-surface" role="application" aria-label={S.title} tabIndex={0} onKeyDown={key}
      onPointerMove={pointer.onPointerMove} onPointerUp={pointer.onPointerUp} onPointerCancel={pointer.onPointerCancel}
      onLostPointerCapture={pointer.onLostPointerCapture} onContextMenu={pointer.onContextMenu}
      onPointerDown={e => { if (celebrating && active) { skip(); return }; pointer.onPointerDown(e) }}>
      <canvas ref={canvas} aria-hidden="true" style={{ width: size.w, height: size.h }} />
      <CardHoldFeedback hold={pointer.longPress} />
      {layouts.map(layout => boardLayout.maxScroll[layout.pile] > 0 && [true, false].map(up => <button
        key={`${layout.pile}-${up}`} className="spider-page w9x-raised"
        style={{ left: layout.x * scale, top: up ? 0 : viewBottom, width: cardW }}
        disabled={blocked || (up ? boardLayout.scroll[layout.pile] <= 0 : boardLayout.scroll[layout.pile] >= boardLayout.maxScroll[layout.pile])}
        aria-label={S.page(layout.pile, up)} onClick={() => setPages(p => {
          const next = [...p]
          next[layout.pile] = Math.max(0, Math.min(boardLayout.maxScroll[layout.pile], boardLayout.scroll[layout.pile] + (up ? -1 : 1) * boardLayout.pageStep))
          return next
        })}>{up ? '▲' : '▼'}</button>))}
      <div className="spider-score" style={{ bottom: 16 }}>{S.score}: {state.score} / {S.moves}: {state.moves}</div>
      <button className={`spider-deal${touch || pocket ? ' spider-deal-touch' : ''}`} style={{ right: 12, bottom: 10, width: Math.max(44, cardW) }} disabled={blocked || !state.stock.length}
        aria-label={S.stock(state.stock.length / 10)} onPointerDown={e => e.stopPropagation()} onClick={event => {
          if (event.detail === 0) deal()
          else stockTap()
        }}>{S.deal}</button>
      <div className="spider-live" aria-live="polite">{message}</div>
    </div>
    {dialog === 'help' && <CardHelp title={S.title} sections={S.helpSections} onClose={() => setDialog(null)} />}
    {dialog === 'deck' && <DeckDialog onClose={() => setDialog(null)} />}
    {dialog === 'about' && <AboutDialog game={S.title} icon={icon} version="5.1 (Build 2600.remy_sp2.4490)" flavour={S.flavour} lines={S.aboutLines} onClose={() => setDialog(null)} />}
    {dialog === 'difficulty' && <GameDialog title={S.difficultyTitle} onClose={() => setDialog(null)} buttons={[
      { label: S.ok, default: true, onClick: () => {
        setDialog(null)
        if (difficulty !== state.difficulty) {
          if (state.moves > 0) setQuestion({ text: S.difficultyPrompt, yes: () => begin(difficulty), no: () => {} })
          else begin(difficulty)
        }
      } }, { label: S.cancel, cancel: true, onClick: () => setDialog(null) }
    ]}>{([1, 2, 4] as Difficulty[]).map(d => <label className="spider-option" key={d}><input type="radio" name="difficulty" checked={difficulty === d} onChange={() => setDifficulty(d)} />{S.difficulties[d]}</label>)}</GameDialog>}
    {dialog === 'options' && <GameDialog title={S.optionsTitle} onClose={() => setDialog(null)} buttons={[
      { label: S.ok, default: true, onClick: () => { setStored(s => ({ ...s, options: draft })); setDialog(null) } },
      { label: S.cancel, cancel: true, onClick: () => setDialog(null) }
    ]}>
      <label className="spider-option"><input type="checkbox" checked={!muted} onChange={e => setMuted(!e.target.checked)} />{S.sounds}</label>
      <label className="spider-option"><input type="checkbox" checked={draft.animation} onChange={e => setDraft({ ...draft, animation: e.target.checked })} />{S.animation}</label>
      <hr className="spider-options-separator" />
      <label className="spider-option"><input type="checkbox" checked={draft.prompt} onChange={e => setDraft({ ...draft, prompt: e.target.checked, alwaysSave: e.target.checked ? false : draft.alwaysSave })} />{S.prompt}</label>
      <label className="spider-option"><input type="checkbox" checked={draft.alwaysSave} onChange={e => setDraft({ ...draft, alwaysSave: e.target.checked, prompt: e.target.checked ? false : draft.prompt })} />{S.alwaysSave}</label>
      <label className="spider-option"><input type="checkbox" checked={draft.alwaysOpen} onChange={e => setDraft({ ...draft, alwaysOpen: e.target.checked })} />{S.alwaysOpen}</label>
    </GameDialog>}
    {dialog === 'stats' && <GameDialog title={S.statsTitle} onClose={() => setDialog(null)} buttons={[
      { label: S.resetButton, onClick: () => { setDialog(null); setQuestion({ text: S.reset, yes: () => {
        setStored(s => ({ ...s, stats: defaults().stats })); setDialog('stats')
      }, no: () => setDialog('stats') }) } }, { label: S.ok, default: true, onClick: () => setDialog(null) }
    ]}>
      <select aria-label={S.difficultyTitle} value={statsDifficulty} onChange={e => setStatsDifficulty(Number(e.target.value) as Difficulty)}>
        {([1, 2, 4] as Difficulty[]).map(d => <option key={d} value={d}>{S.difficulties[d]}</option>)}
      </select>
      <dl className="spider-stats">{[[S.high, stats.high], [S.wins, stats.wins], [S.losses, stats.losses],
        [S.rate, `${stats.wins + stats.losses ? Math.round(stats.wins / (stats.wins + stats.losses) * 100) : 0}%`],
        [S.longestWin, stats.longestWin], [S.longestLoss, stats.longestLoss], [S.streak, S.streakText(stats.streak)]].map(([label, value]) =>
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </GameDialog>}
    {dialog === 'win' && <GameDialog title={S.title} onClose={() => setDialog(null)} buttons={[
      { label: S.yes, default: true, onClick: () => begin() }, { label: S.no, cancel: true, onClick: () => setDialog(null) }
    ]}>{S.won}</GameDialog>}
    {question && <GameDialog title={S.title} onClose={() => setQuestion(null)} buttons={question.no ? [
      { label: S.yes, default: true, onClick: () => { const q = question; setQuestion(null); q.yes() } },
      { label: S.no, cancel: !question.cancel, onClick: () => { const q = question; setQuestion(null); q.no?.() } },
      ...(question.cancel ? [{ label: S.cancel, cancel: true, onClick: () => setQuestion(null) }] : [])
    ] : [{ label: S.ok, default: true, cancel: true, onClick: () => { const q = question; setQuestion(null); q.yes() } }]}>{question.text}</GameDialog>}
  </div>
}
