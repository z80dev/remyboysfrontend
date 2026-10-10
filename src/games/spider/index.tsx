import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AboutDialog, GameDialog, GameMenuBar, loadGame, saveGame, unlockAudio, useGamesMuted, useWindowFit, useWindowState, stopSounds, playJingle } from '../kit'
import { BACKS, CARD_W, CARD_H, CardHelp, DeckDialog, cardSfx, drawBack, drawEmpty, drawFace, drawHighlight,
  hitTestPiles, pileCardPositions, subscribeCardArt, useCardPointer, useCardTweens, useDeckBack, useStockAnimation,
  type CardPileLayout, type CardTweenMove } from '../cards'
import { availableMoves, canDeal, defaults, dealRow, exitAction, hintAt, movable, moveCards, newGame, recordResult, storedGuard, undo,
  type Difficulty, type Options, type Position, type SpiderState } from './engine'
import { S } from './strings'
import { Fireworks } from './fireworks'
import { runJingle, winJingle } from './music/jingles'
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
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 800, h: 536 })
  const [dialog, setDialog] = useState<Dialog>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [message, setMessage] = useState(S.start)
  const [selection, setSelection] = useState<Position | null>(null)
  const [cursor, setCursor] = useState<Position>({ pile: 0, depth: state.piles[0].length - 1 })
  const [difficulty, setDifficulty] = useState<Difficulty>(state.difficulty)
  const [draft, setDraft] = useState<Options>(stored.options)
  const [statsDifficulty, setStatsDifficulty] = useState<Difficulty>(state.difficulty)
  const [hint, setHint] = useState<{ source: Position; to: number; phase: number } | null>(null)
  const hintIndex = useRef(0)
  const [celebrating, setCelebrating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const fireworks = useRef(new Fireworks())
  const accounted = useRef(false)
  const { active, hidden } = useWindowState()
  const fit = useWindowFit()
  const { muted, setMuted } = useGamesMuted()
  const deck = useDeckBack()
  const animation = useCardTweens(hidden)
  const [artVersion, redrawArt] = useState(0)
  const scale = Math.min(1, Math.max(32, (size.w - 20) / 10 - 3) / CARD_W)
  const cardW = CARD_W * scale
  const cardH = CARD_H * scale
  const bottom = size.h - cardH - 14
  const layouts = useMemo<CardPileLayout[]>(() => state.piles.map((cards, pile) => {
    const natural = cards.slice(0, -1).reduce((n, c) => n + (c.faceUp ? 18 : 4), 0)
    const compress = Math.min(1, Math.max(12, (bottom - cardH - 22) / scale) / Math.max(1, natural))
    return { pile, cards, x: (10 + pile * (size.w - 20 - cardW) / 9) / scale, y: 10 / scale,
      offset: (c: { faceUp: boolean }) => (c.faceUp ? 18 : 4) * compress }
  }), [state.piles, scale, size.w, bottom, cardW, cardH])
  const stockX = size.w - cardW - 14 - Math.max(0, state.stock.length / 10 - 1) * 5
  const blocked = !active || hidden || !!dialog || !!question || celebrating

  useEffect(() => { fit(800, 560) }, [fit])
  useEffect(() => {
    const node = surface.current
    if (!node) return
    const observer = new ResizeObserver(entries => {
      const r = entries[0].contentRect
      setSize({ w: Math.max(350, r.width), h: Math.max(240, r.height) })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => subscribeCardArt(() => redrawArt(v => v + 1)), [])
  useEffect(() => { if (active && !dialog && !question) surface.current?.focus({ preventScroll: true }) }, [active, dialog, question])
  useEffect(() => { saveGame('spider', stored) }, [stored])
  useEffect(() => () => stopSounds('spider'), [])
  useEffect(() => { if (hidden) stopSounds('spider') }, [hidden])

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
      setStored(v => ({ ...v, stats: { ...v.stats, [s.difficulty]: recordResult(v.stats[s.difficulty], false, s.score) } }))
    }
  }
  function begin(d = current.current.difficulty, seed = Date.now() >>> 0) {
    countLoss()
    animation.cancel()
    setState(newGame(seed, d))
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
      setQuestion({ text: S.saveExit, yes: () => { save(); close() }, no: close, cancel: true })
    } else { if (action === 'save') save(); close() }
  }
  function open() {
    const loaded = loadGame('spider', defaults(), storedGuard)
    if (!loaded.saved) { setMessage(S.missing); setQuestion({ text: S.missing, yes: () => {} }); return }
    countLoss()
    animation.cancel()
    setStored(loaded)
    setState(loaded.saved)
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
    if (storage.current.options.animation) {
      const cards = deal ? next.piles.map(p => p.at(-1)!) : from ? before.piles[from.pile].slice(from.depth) : []
      for (const card of cards) {
        const old = oldPositions.find(p => p.card?.id === card.id)
        const p = next.piles.findIndex(pile => pile.some(c => c.id === card.id))
        if (p >= 0) {
          const depth = next.piles[p].findIndex(c => c.id === card.id)
          const positions = pileCardPositions({ ...layouts[p], cards: next.piles[p] })
          const dest = positions[depth]
          moves.push({ card, fromX: old?.x ?? stockX / scale, fromY: old?.y ?? bottom / scale,
            toX: dest.x, toY: dest.y, delay: deal ? p * 14 : 0 })
        }
      }
      for (let run = before.completed.length; run < next.completed.length; run++) for (const card of next.completed[run]) {
        const old = oldPositions.find(p => p.card?.id === card.id)
        moves.push({ card, fromX: old?.x ?? layouts[to ?? 0].x, fromY: old?.y ?? layouts[to ?? 0].y,
          toX: (14 + run * 10) / scale, toY: bottom / scale })
      }
    }
    setState(next)
    setSelection(null)
    setHint(null)
    hintIndex.current = 0
    if (moves.length) animation.start(moves)
    cardSfx(deal ? 'deal' : 'place')
    if (before.piles.some((p, i) => p.some(c => !c.faceUp && next.piles[i].some(n => n.id === c.id && n.faceUp)))) cardSfx('flip')
    setMessage(completed ? S.completed(next.completed.length) : from && to !== undefined ? S.moved(from.pile, to, next.score) : `${S.score}: ${next.score} / ${S.moves}: ${next.moves}`)
    if (completed) void playJingle(runJingle, 'spider')
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
    if (state.piles.some(p => !p.length) && state.stock.length) { setQuestion({ text: S.empty, yes: () => {} }); cardSfx('invalid'); return }
    if (canDeal(state)) commit(dealRow(state), undefined, undefined, true)
    else setQuestion({ text: S.none, yes: () => {} })
  }
  function showHint(pile?: number) {
    if (pile !== undefined) {
      const m = availableMoves(state).find(m => m.pile === pile)
      if (m) { setHint({ source: m, to: m.to, phase: 0 }); setMessage(S.hintText(m.pile, m.to)); return }
      setQuestion({ text: S.none, yes: () => {} }); return
    }
    const h = hintAt(state, hintIndex.current++)
    if (h.kind === 'move') { setHint({ source: h.move, to: h.move.to, phase: 0 }); setMessage(S.hintText(h.move.pile, h.move.to)) }
    else {
      hintIndex.current = 0
      setHint(null)
      setQuestion(h.kind === 'deal' ? { text: S.offer, yes: deal, no: () => {} } : { text: S.none, yes: () => {} })
    }
  }
  const pointer = useCardPointer({
    disabled: blocked,
    hitTest: (x, y) => y >= bottom && x >= stockX ? { pile: 10, depth: -1, x, y } : hitTestPiles(layouts, x / scale, y / scale),
    onTap: hit => {
      if (!hit) { setSelection(null); return }
      if (hit.pile === 10) { deal(); return }
      if (selection) {
        if (selection.pile === hit.pile) setSelection(null)
        else commit(moveCards(state, { ...selection, to: hit.pile }), selection, hit.pile)
      } else if (movable(state, hit.pile, hit.depth)) { setSelection(hit); setCursor(hit); setMessage(S.selected(hit.pile, hit.depth)); cardSfx('flick') }
    },
    onDoubleTap: hit => { if (hit?.pile === 10) deal() },
    onDrop: (source, target) => { if (source.pile < 10 && target && target.pile < 10) commit(moveCards(state, { pile: source.pile, depth: source.depth, to: target.pile }), source, target.pile) },
    onContext: hit => { if (hit && hit.pile < 10) showHint(hit.pile) }
  })
  const stockTime = useStockAnimation(BACKS[deck.back].animated && state.stock.length > 0, hidden, !!pointer.drag)

  useEffect(() => {
    if (!hint || hidden) return
    const timer = window.setTimeout(() => setHint(h => h && h.phase < 7 ? { ...h, phase: h.phase + 1 } : null), 180)
    return () => clearTimeout(timer)
  }, [hint, hidden])
  useEffect(() => {
    if (!celebrating || hidden) return
    let frame = 0
    let last = performance.now()
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1200 : 6000
    const tick = (now: number) => {
      const dt = Math.min(100, now - last)
      last = now
      setElapsed(t => {
        const next = t + dt
        if (next >= duration) { setCelebrating(false); setDialog('win') }
        return next
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [celebrating, hidden])
  useEffect(() => {
    const node = canvas.current
    if (!node || hidden) return
    const dpr = window.devicePixelRatio || 1
    node.width = Math.round(size.w * dpr)
    node.height = Math.round(size.h * dpr)
    const ctx = node.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#008000'
    ctx.fillRect(0, 0, size.w, size.h)
    ctx.save()
    ctx.scale(scale, scale)
    const tweenIds = new Set(animation.tweens.map(t => t.card.id))
    const dragged = pointer.drag && pointer.drag.source.pile < 10 && movable(state, pointer.drag.source.pile, pointer.drag.source.depth)
      ? state.piles[pointer.drag.source.pile].slice(pointer.drag.source.depth) : []
    for (const layout of layouts) {
      if (!layout.cards.length) drawEmpty(ctx, 'pile', layout.x, layout.y)
      for (const hit of pileCardPositions(layout)) {
        const c = hit.card!
        if (tweenIds.has(c.id) || dragged.some(d => d.id === c.id)) continue
        if (c.faceUp) drawFace(ctx, c, hit.x, hit.y)
        else drawBack(ctx, deck.back, hit.x, hit.y, 0, deck.remy)
        if (selection?.pile === hit.pile && hit.depth >= selection.depth) drawHighlight(ctx, hit.x, hit.y)
        if (hint && hint.phase % 2 === 0 && (hint.phase < 4 ? hint.source.pile === hit.pile && hit.depth >= hint.source.depth : hint.to === hit.pile && hit.depth === layout.cards.length - 1)) drawHighlight(ctx, hit.x, hit.y)
      }
      if (hint && hint.phase >= 4 && hint.phase % 2 === 0 && hint.to === layout.pile && !layout.cards.length) {
        ctx.strokeStyle = '#fff'; ctx.strokeRect(layout.x, layout.y, CARD_W, CARD_H)
      }
    }
    for (let i = 0; i < state.completed.length; i++) {
      const c = state.completed[i][0]
      if (!tweenIds.has(c.id)) drawFace(ctx, c, (14 + i * 10) / scale, bottom / scale)
    }
    for (let i = 0; i < state.stock.length / 10; i++) drawBack(ctx, deck.back, (stockX + i * 5) / scale, bottom / scale, stockTime, deck.remy)
    if (!state.stock.length) drawEmpty(ctx, 'exhausted', stockX / scale, bottom / scale)
    for (const t of animation.tweens) drawFace(ctx, t.card, t.x, t.y)
    if (pointer.drag) for (let i = 0; i < dragged.length; i++) {
      const x = (pointer.drag.x - pointer.drag.originX) / scale + pointer.drag.source.x
      const y = (pointer.drag.y - pointer.drag.originY) / scale + pointer.drag.source.y + i * 18
      drawFace(ctx, dragged[i], x, y)
    }
    const focus = pileCardPositions(layouts[cursor.pile]).find(h => h.depth === cursor.depth)
    if (active && !dialog && !question) {
      ctx.setLineDash([2, 2]); ctx.strokeStyle = '#fff'
      ctx.strokeRect(focus?.x ?? layouts[cursor.pile].x, focus?.y ?? layouts[cursor.pile].y, CARD_W, CARD_H)
      ctx.setLineDash([])
    }
    ctx.restore()
    if (pointer.longPress) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath()
      ctx.arc(pointer.longPress.x, pointer.longPress.y, 15 * (1 - pointer.longPress.progress), 0, Math.PI * 2); ctx.stroke()
    }
    if (celebrating) fireworks.current.draw(ctx, elapsed, size.w, size.h)
  }, [state, size, scale, layouts, bottom, stockX, deck.back, deck.remy, stockTime, selection, hint, pointer.drag, pointer.longPress,
    animation.tweens, cursor, active, hidden, artVersion, dialog, question, celebrating, elapsed])

  function skip() { setCelebrating(false); setDialog('win'); stopSounds('spider') }
  function key(e: KeyboardEvent<HTMLDivElement>) {
    if (!active || hidden) return
    unlockAudio()
    if (celebrating) { e.preventDefault(); skip(); return }
    if (dialog || question) return
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Escape'].includes(e.key)) e.preventDefault()
    if (e.key === 'Escape') setSelection(null)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const pile = (cursor.pile + (e.key === 'ArrowRight' ? 1 : 9)) % 10
      setCursor({ pile, depth: state.piles[pile].length - 1 })
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const p = state.piles[cursor.pile]
      const delta = e.key === 'ArrowUp' ? -1 : 1
      const depth = Math.max(0, Math.min(p.length - 1, cursor.depth + delta))
      if (movable(state, cursor.pile, depth)) setCursor({ ...cursor, depth })
    } else if (e.key === ' ') {
      if (selection) commit(moveCards(state, { ...selection, to: cursor.pile }), selection, cursor.pile)
      else if (movable(state, cursor.pile, cursor.depth)) { setSelection(cursor); cardSfx('flick'); setMessage(S.selected(cursor.pile, cursor.depth)) }
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
  return <div className="spider-game" onPointerDownCapture={() => { if (active) unlockAudio() }}>
    <GameMenuBar menus={menus} disabled={celebrating || !!dialog || !!question} />
    <div ref={surface} className="spider-surface" role="application" aria-label={S.title} tabIndex={0} onKeyDown={key}
      onPointerMove={pointer.onPointerMove} onPointerUp={pointer.onPointerUp} onPointerCancel={pointer.onPointerCancel}
      onLostPointerCapture={pointer.onLostPointerCapture} onContextMenu={pointer.onContextMenu}
      onPointerDown={e => { if (celebrating && active) { skip(); return }; pointer.onPointerDown(e) }}>
      <canvas ref={canvas} aria-hidden="true" style={{ width: size.w, height: size.h }} />
      <div className="spider-score" style={{ bottom: 16 }}>{S.score}: {state.score} / {S.moves}: {state.moves}</div>
      <button className="spider-deal" style={{ right: 12, bottom: 10, width: Math.max(44, cardW) }} disabled={blocked || !state.stock.length}
        aria-label={S.stock(state.stock.length / 10)} onPointerDown={e => e.stopPropagation()} onClick={deal}>{S.deal}</button>
      <div className="spider-live" aria-live="polite">{message}</div>
    </div>
    {dialog === 'help' && <CardHelp title={S.helpTitle} sections={S.helpSections} onClose={() => setDialog(null)} />}
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
      <hr />
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
        [S.longestWin, stats.longestWin], [S.longestLoss, stats.longestLoss], [S.streak, stats.streak]].map(([label, value]) =>
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
