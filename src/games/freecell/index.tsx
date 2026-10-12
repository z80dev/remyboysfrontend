import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { AppProps } from '../../os/apps'
import { AboutDialog, ChooseRemyDialog, GameDialog, GameMenuBar, loadGame, saveGame, useWindowFit, useWindowState,
  useWindowTitle, useWindowCloseGuard, useGamesMuted, useGamesPlayer, loadPalette, unlockAudio, playJingle, stopSounds, type RemyPalette } from '../kit'
import { cardLabel, drawFace, drawEmpty, drawSunkenEmpty, drawFocus, CardHoldFeedback, subscribeCardArt, useCardPointer, useCardTweens,
  DeckDialog, CardHelp, cardSfx, type CardHit, type CardTweenMove } from '../cards'
import { at, asksColumn, cascadeGap, cardsLeft, deal, emptyStats, hasLegalMove, homeIndex, homeSequence, move, moveSource, needsResign, parseNumber, peekSource, pointerSource, record, run, selectSource, undo, validNumber, won,
  type Location, type Stats } from './engine'
import { S } from './strings'
import { drawKing } from './king'
import { winSong } from './music/win'
import icon from './icon'
import './freecell.css'

type Preferences = { illegal: boolean; quick: boolean; double: boolean; stats: Stats }
type Modal = 'select' | 'stats' | 'options' | 'about' | 'help' | 'deck' | 'illegal' | 'cheat' | 'win' | 'loss' | 'clear' | 'resign' | 'column' | 'player' | null
const defaults: Preferences = { illegal: true, quick: false, double: true, stats: emptyStats() }
const guard = (v: unknown): v is Preferences => {
  if (!v || typeof v !== 'object') return false
  const p = v as Preferences
  return typeof p.illegal === 'boolean' && typeof p.quick === 'boolean' && typeof p.double === 'boolean' && !!p.stats &&
    ['won', 'lost', 'bestWins', 'bestLosses'].every(k => Number.isSafeInteger(p.stats[k as keyof Stats]) && p.stats[k as keyof Stats] >= 0) &&
    Number.isSafeInteger(p.stats.streak)
}
const fallbackPalette: RemyPalette = { skin: '#f0c8a0', hair: '#603010', shirt: '#008080', bg: '#008000', accent: '#ffd700', eye: '#000000' }

/** Native 632×448 client; renderer/hit testing share the same logical table geometry, including Pocket scaling. */
export default function FreeCell({ param, close }: AppProps) {
  const [game, setGame] = useState(() => deal(validNumber(parseNumber(param ?? '')) ? parseNumber(param ?? '') : 1 + Math.floor(Math.random() * 32000)))
  const [prefs, setPrefs] = useState(() => loadGame('freecell', defaults, guard))
  const [draft, setDraft] = useState(prefs)
  const [peek, setPeek] = useState<Location | null>(null)
  const [session, setSession] = useState(emptyStats)
  const [selection, setSelection] = useState<Location | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [number, setNumber] = useState('')
  const [validation, setValidation] = useState(false)
  const [same, setSame] = useState(false)
  const [ended, setEnded] = useState(false)
  const [announce, setAnnounce] = useState(S.started(game.number))
  const [cursor, setCursor] = useState(0)
  const [cursorVisible, setCursorVisible] = useState(false)
  const [look, setLook] = useState(-1)
  const [palette, setPalette] = useState(fallbackPalette)
  const [frame, setFrame] = useState(-1)
  const [art, setArt] = useState(0)
  const [width, setWidth] = useState(632)
  const [height, setHeight] = useState(402)
  const [cursorDepth, setCursorDepth] = useState<number | undefined>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const pending = useRef<(() => void) | null>(null)
  const pendingColumn = useRef<{ from: Location; to: Location } | null>(null)
  const result = useRef(false)
  const { active, hidden, pocket } = useWindowState()
  const fit = useWindowFit()
  const { muted, toggleMuted } = useGamesMuted()
  const { player } = useGamesPlayer()
  const tween = useCardTweens(hidden)
  useWindowTitle(S.caption(game.number))
  const scale = width / 632
  const boardHeight = height - (pocket ? 40 : 0)
  const logicalHeight = boardHeight / scale
  const gap = cascadeGap(game, logicalHeight, scale, pocket)
  const position = (l: Location) => l.kind === 'cascade' ? { x: 4 + l.index * 79, y: 120 + (l.depth ?? game.cascades[l.index].length - 1) * gap } :
    { x: l.kind === 'free' ? 4 + l.index * 71 : 344 + l.index * 71, y: 8 }
  const location = (hit: CardHit): Location => hit.pile < 8 ? { kind: 'cascade', index: hit.pile, depth: Math.max(0, hit.depth) } :
    hit.pile < 12 ? { kind: 'free', index: hit.pile - 8 } : { kind: 'home', index: hit.pile - 12 }
  const hitTest = (cx: number, cy: number): CardHit | null => {
    const x = cx / scale, y = cy / scale
    if (y >= 8 && y <= 104) {
      const pile = x >= 4 && x < 288 ? 8 + Math.floor((x - 4) / 71) : x >= 344 && x < 628 ? 12 + Math.floor((x - 344) / 71) : -1
      if (pile < 0) return null
      const l: Location = { kind: pile < 12 ? 'free' : 'home', index: pile < 12 ? pile - 8 : pile - 12 }
      return { pile, depth: 0, ...position(l), card: at(game, l) ?? undefined }
    }
    const index = Math.floor((x - 4) / 79)
    if (index < 0 || index > 7 || y < 120 || x > 4 + index * 79 + 71) return null
    const depth = Math.min(game.cascades[index].length - 1, Math.floor((y - 120) / gap))
    if (y > 120 + Math.max(0, game.cascades[index].length - 1) * gap + 96) return null
    const l: Location = { kind: 'cascade', index, depth: Math.max(0, depth) }
    return { pile: index, depth, ...position(l), card: at(game, l) ?? undefined }
  }
  const persist = (p: Preferences) => { setPrefs(p); saveGame('freecell', p) }
  const finish = (win: boolean, celebrate = true) => {
    if (result.current) return
    result.current = true
    setEnded(true)
    setSession(s => record(s, win))
    persist({ ...prefs, stats: record(prefs.stats, win) })
    setSelection(null)
    setAnnounce(win ? S.win : S.loss)
    if (win) { if (celebrate) { setFrame(0); if (!muted) void playJingle(winSong, 'freecell') } }
    else setModal('loss')
  }
  const start = (n: number) => {
    tween.cancel()
    const next = deal(n)
    setGame(next); setSelection(null); setPeek(null); setModal(null); setEnded(false); result.current = false; setFrame(-1)
    setAnnounce(S.started(n))
    if (!prefs.quick) {
      const moves: CardTweenMove[] = []
      next.cascades.forEach((c, index) => c.forEach((card, depth) => moves.push({ card, fromX: 300, fromY: 8,
        toX: 4 + index * 79, toY: 120 + depth * cascadeGap(next, logicalHeight, scale, pocket), delay: (depth * 8 + index) * 8 })))
      tween.start(moves)
    }
    cardSfx('deal')
  }
  const newGame = () => start(1 + Math.floor(Math.random() * 32000))
  const request = (action: () => void) => {
    if (needsResign(game, ended)) { pending.current = action; setModal('resign') } else action()
  }
  useWindowCloseGuard(() => request(close))
  const invalid = () => { cardSfx('invalid'); setAnnounce(S.illegal); if (prefs.illegal) setModal('illegal') }
  const commit = (from: Location, to: Location, ask = true) => {
    from = moveSource(game, from, to)
    if (ask && asksColumn(game, from, to)) {
      pendingColumn.current = { from, to }; setModal('column'); return
    }
    const next = move(game, from, to)
    if (!next) return invalid()
    const victory = won(next)
    if (!prefs.quick) {
      const before = new Map<number, { x: number; y: number }>()
      game.cascades.forEach((c, index) => c.forEach((card, depth) => before.set(card.id, position({ kind: 'cascade', index, depth }))))
      game.free.forEach((card, index) => { if (card) before.set(card.id, position({ kind: 'free', index })) })
      const moves: CardTweenMove[] = []
      const add = (card: NonNullable<CardHit['card']>, x: number, y: number) => {
        const origin = before.get(card.id)
        if (origin && (origin.x !== x || origin.y !== y)) moves.push({ card, fromX: origin.x, fromY: origin.y, toX: x, toY: y })
      }
      const nextGap = cascadeGap(next, logicalHeight, scale, pocket)
      next.cascades.forEach((c, index) => c.forEach((card, depth) => add(card, 4 + index * 79, 120 + depth * nextGap)))
      next.free.forEach((card, index) => { if (card) add(card, 4 + index * 71, 8) })
      homeSequence(game, next).forEach(({ card, index }, order) => {
        const origin = before.get(card.id)
        if (origin) moves.push({ card, fromX: origin.x, fromY: origin.y, toX: 344 + index * 71, toY: 8,
          delay: order * 40, onStart: () => cardSfx('place') })
      })
      tween.start(moves, victory ? () => { setFrame(0); if (!muted) void playJingle(winSong, 'freecell') } : undefined)
    }
    setGame(next); setSelection(null); setAnnounce(S.moved(cardsLeft(next))); cardSfx('place')
    if (victory) finish(true, prefs.quick)
    else if (!victory && !hasLegalMove(next)) finish(false)
  }
  const choose = (l: Location) => {
    if (!active || hidden || modal || ended) return
    if (selection) {
      if (selection.kind === l.kind && selection.index === l.index && (l.kind !== 'cascade' ||
        (selection.depth ?? game.cascades[l.index].length - 1) === (l.depth ?? game.cascades[l.index].length - 1))) setSelection(null)
      else commit(selection, l)
    } else {
      const card = at(game, l)
      if (card && l.kind !== 'home') { setSelection(l); setCursor(l.kind === 'cascade' ? l.index : l.index + 8); setCursorDepth(l.depth); setAnnounce(S.selected(cardLabel(at(game, selectSource(game, l))!))); cardSfx('flick') }
    }
  }
  const sendFree = (l: Location, forceFree = false) => {
    const card = at(game, l)
    if (!card || l.kind === 'home') return
    if (l.kind === 'cascade' && l.depth !== undefined && l.depth !== game.cascades[l.index].length - 1) return invalid()
    const empty = prefs.double || forceFree ? game.free.findIndex(c => !c) : -1
    commit(l, empty >= 0 ? { kind: 'free', index: empty } : { kind: 'home', index: Math.max(0, homeIndex(game, card)) })
  }
  const pointer = useCardPointer({ hitTest, disabled: !active || hidden || !!modal || ended,
    onTap: hit => { if (hit) choose(hit.pile < 8 ? pointerSource(game, hit.pile, hit.depth) : location(hit)) },
    onDoubleTap: hit => { if (hit) sendFree(location(hit)) },
    onContext: hit => { if (hit) sendFree(location(hit), true) }, onDrop: (source, target) => { if (target) commit(location(source), location(target)) } })
  useEffect(() => { fit(632, 448) }, [fit])
  useEffect(() => { saveGame('freecell', prefs) }, [prefs])
  useEffect(() => subscribeCardArt(() => setArt(n => n + 1)), [])
  useEffect(() => { let alive = true; void loadPalette(player.remy).then(p => { if (alive) setPalette(p) }); return () => { alive = false } }, [player.remy])
  useEffect(() => {
    const host = surface.current
    if (!host) return
    const observer = new ResizeObserver(entries => {
      setWidth(Math.min(632, entries[0].contentRect.width))
      setHeight(entries[0].contentRect.height)
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])
  useEffect(() => { if (active && !modal) surface.current?.focus({ preventScroll: true }) }, [active, modal])
  useEffect(() => () => { stopSounds('freecell') }, [])
  useEffect(() => { if (hidden) stopSounds('freecell') }, [hidden])
  useEffect(() => {
    const n = parseNumber(param ?? '')
    if (validNumber(n) && n !== game.number) request(() => start(n))
  }, [param])
  useEffect(() => {
    if (!prefs.quick) {
      const moves: CardTweenMove[] = []
      game.cascades.forEach((c, index) => c.forEach((card, depth) => moves.push({ card, fromX: 300, fromY: 8,
        toX: 4 + index * 79, toY: 120 + depth * gap, delay: (depth * 8 + index) * 8 })))
      tween.start(moves)
    }
  }, [])
  useEffect(() => {
    if (frame < 0 || modal === 'win' || hidden) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = frame === 0 ? reduced ? 480 : 1875 : 160
    const id = setTimeout(() => { if (frame >= 2) { setModal('win'); setFrame(-1) } else setFrame(frame + 1) }, delay)
    return () => clearTimeout(id)
  }, [frame, hidden, modal])
  useEffect(() => {
    const el = canvas.current
    if (!el || hidden) return
    const dpr = window.devicePixelRatio || 1
    el.width = Math.round(width * dpr); el.height = Math.round(boardHeight * dpr)
    const ctx = el.getContext('2d')!
    ctx.scale(scale * dpr, scale * dpr); ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#008000'; ctx.fillRect(0, 0, 632, logicalHeight)
    const animated = new Set(tween.tweens.map(t => t.card.id))
    const dragCards = pointer.drag ? run(game, location(pointer.drag.source)) : []
    const dragged = new Set(dragCards.map(c => c.id))
    for (let i = 0; i < 4; i++) {
      drawSunkenEmpty(ctx, 4 + i * 71, 8); drawSunkenEmpty(ctx, 344 + i * 71, 8)
      const free = game.free[i], home = at(game, { kind: 'home', index: i })
      if (free && !animated.has(free.id) && !dragged.has(free.id)) drawFace(ctx, free, 4 + i * 71, 8, { selected: selection?.kind === 'free' && selection.index === i })
      if (home && !animated.has(home.id)) drawFace(ctx, home, 344 + i * 71, 8)
    }
    game.cascades.forEach((cards, index) => {
      if (!cards.length) drawEmpty(ctx, 'pile', 4 + index * 79, 120)
      cards.forEach((card, depth) => {
        if (!animated.has(card.id) && !dragged.has(card.id)) drawFace(ctx, card, 4 + index * 79, 120 + depth * gap,
          { selected: selection?.kind === 'cascade' && selection.index === index && depth >= selectSource(game, selection).depth! })
      })
    })
    if (width >= 360) {
      ctx.fillStyle = '#c0c0c0'; ctx.fillRect(292, 31, 48, 48)
      ctx.strokeStyle = '#000'; ctx.strokeRect(292.5, 31.5, 47, 47)
      ctx.strokeStyle = '#808080'; ctx.beginPath(); ctx.moveTo(292, 79); ctx.lineTo(292, 31); ctx.lineTo(340, 31); ctx.stroke()
      ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(292, 79); ctx.lineTo(340, 79); ctx.lineTo(340, 31); ctx.stroke()
      ctx.save(); ctx.translate(292, 31); drawKing(ctx, palette, look, ended && !won(game) ? 'loss' : frame >= 0 ? 'win' : 'idle', Math.max(0, frame)); ctx.restore()
    }
    if (cursorVisible) {
      const l: Location = cursor < 8 ? selectSource(game, { kind: 'cascade', index: cursor, depth: cursorDepth }) : cursor < 12 ? { kind: 'free', index: cursor - 8 } : { kind: 'home', index: cursor - 12 }
      const p = position(l)
      drawFocus(ctx, p.x, Math.max(l.kind === 'cascade' ? 120 : 8, p.y))
    }
    tween.tweens.forEach(t => drawFace(ctx, t.card, t.x, t.y))
    if (pointer.drag) dragCards.forEach((card, i) => drawFace(ctx, card, pointer.drag!.x / scale - (pointer.drag!.originX / scale - pointer.drag!.source.x),
      pointer.drag!.y / scale - (pointer.drag!.originY / scale - pointer.drag!.source.y) + i * gap, { ghost: true }))
    if (peek) {
      const card = at(game, peek)
      if (card) { const p = position(peek); drawFace(ctx, card, p.x, p.y) }
    }
  }, [game, selection, peek, cursor, cursorDepth, cursorVisible, width, height, palette, look, frame, ended, art, tween.tweens, pointer.drag, hidden])
  const doUndo = () => { if (!ended && !modal) { tween.cancel(); setGame(undo(game)); setSelection(null) } }
  const onKey = (e: KeyboardEvent) => {
    if (!active || hidden || modal) return
    unlockAudio()
    if (frame >= 0) { e.preventDefault(); setFrame(-1); setModal('win'); return }
    if (e.ctrlKey && e.shiftKey && e.key === 'F10') { e.preventDefault(); e.stopPropagation(); setModal('cheat'); return }
    if (e.key === 'F10') { e.preventDefault(); e.stopPropagation(); doUndo(); return }
    let l: Location | null = null
    if (/^[1-8]$/.test(e.key)) l = { kind: 'cascade', index: Number(e.key) - 1 }
    const free = 'qwer'.indexOf(e.key.toLowerCase())
    if (e.key.length === 1 && free >= 0) l = { kind: 'free', index: free }
    if (e.key.toLowerCase() === 'h' && selection) {
      e.preventDefault()
      const source = selection.kind === 'cascade' ? { ...selection, depth: game.cascades[selection.index].length - 1 } : selection
      const card = at(game, source)
      if (card) commit(source, { kind: 'home', index: Math.max(0, homeIndex(game, card)) })
      return
    }
    if (e.key.startsWith('Arrow')) {
      e.preventDefault(); setCursorVisible(true)
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && cursor < 8 && game.cascades[cursor].length) {
        const depth = Math.max(0, Math.min(game.cascades[cursor].length - 1,
          (cursorDepth ?? selectSource(game, { kind: 'cascade', index: cursor }).depth!) + (e.key === 'ArrowUp' ? -1 : 1)))
        setCursorDepth(depth)
        if (selection?.kind === 'cascade' && selection.index === cursor) {
          setSelection({ ...selection, depth }); setAnnounce(S.selected(cardLabel(game.cascades[cursor][depth])))
        }
      } else { setCursor((cursor + (e.key === 'ArrowLeft' ? 15 : e.key === 'ArrowRight' ? 1 : 8)) % 16); setCursorDepth(undefined) }
      return
    }
    if (e.key === ' ' || e.key === 'Enter') l = cursor < 8 ? { kind: 'cascade', index: cursor, depth: cursorDepth } : cursor < 12 ?
      { kind: 'free', index: cursor - 8 } : { kind: 'home', index: cursor - 12 }
    if (e.key === 'Escape') { e.preventDefault(); setSelection(null); return }
    if (l) { e.preventDefault(); choose(l) }
  }
  const dismiss = () => setModal(null)
  const openSelect = () => { setNumber(String(game.number)); setValidation(false); setModal('select') }
  const buttons = (yes: () => void) => [{ label: S.yes, onClick: yes, default: true }, { label: S.no, onClick: dismiss, cancel: true }]
  return <div className={`freecell-game${pocket ? ' freecell-pocket' : ''}`} onPointerDownCapture={e => {
    if (!active || hidden) return
    unlockAudio()
    if (frame >= 0) { e.stopPropagation(); setFrame(-1); setModal('win') }
  }}>
    <GameMenuBar disabled={frame >= 0} menus={[
      { label: S.game, items: [
        { label: S.new, hotkey: 'F2', onClick: () => request(newGame) }, { label: S.select, hotkey: 'F3', onClick: () => request(openSelect) },
        { label: S.restart, onClick: () => start(game.number) }, '-', { label: S.stats, hotkey: 'F4', onClick: () => setModal('stats') },
        { label: S.options, hotkey: 'F5', onClick: () => { setDraft(prefs); setModal('options') } }, '-',
        { label: S.undo, hotkey: 'F10', accel: 'F10', disabled: !game.history.length || ended, onClick: doUndo }, '-',
        { label: S.deck, onClick: () => setModal('deck') }, { label: S.player, onClick: () => setModal('player') },
        { label: S.sound, checked: !muted, onClick: toggleMuted }, '-', { label: S.exit, onClick: () => request(close) }
      ] }, { label: S.help, items: [{ label: S.contents, hotkey: 'F1', onClick: () => setModal('help') }, '-', { label: S.about, onClick: () => setModal('about') }] }
    ]}/>
    <div ref={surface} className='freecell-surface' tabIndex={0} role='application' aria-label={S.application} onKeyDown={onKey}
      onContextMenu={e => e.preventDefault()}
      onPointerMove={e => { if (!active || hidden) return; const r = e.currentTarget.getBoundingClientRect(); setLook(e.clientX - r.left < r.width / 2 ? -1 : 1) }}>
      <canvas ref={canvas} style={{ width, height: boardHeight }} onPointerDown={e => {
        if (e.button !== 2) { pointer.onPointerDown(e); return }
        e.preventDefault()
        if (!active || hidden || modal || ended) return
        const rect = e.currentTarget.getBoundingClientRect()
        const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top)
        setPeek(hit?.card && hit.pile < 8 ? peekSource(game, hit.pile, hit.depth) : null)
        e.currentTarget.setPointerCapture(e.pointerId)
      }} onPointerMove={pointer.onPointerMove}
        onPointerUp={e => { setPeek(null); if (e.button === 2) {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
        } else pointer.onPointerUp(e) }}
        onPointerCancel={() => { setPeek(null); pointer.onPointerCancel() }}
        onLostPointerCapture={() => { setPeek(null); pointer.onLostPointerCapture() }}/>
      <CardHoldFeedback hold={pointer.longPress}/>
      {pocket && gap * scale < 32 && selection?.kind === 'cascade' && <div className='freecell-depth-controls'>
        <button onClick={() => { const depth = selectSource(game, selection).depth!; const next = Math.max(0, depth - 1); setSelection({ ...selection, depth: next }); setAnnounce(S.selected(cardLabel(game.cascades[selection.index][next]))) }} disabled={selectSource(game, selection).depth === 0}>Earlier card</button>
        <span>{cardLabel(at(game, selectSource(game, selection))!)}</span>
        <button onClick={() => { const depth = selectSource(game, selection).depth!; const next = Math.min(game.cascades[selection.index].length - 1, depth + 1); setSelection({ ...selection, depth: next }); setAnnounce(S.selected(cardLabel(game.cascades[selection.index][next]))) }} disabled={selectSource(game, selection).depth === game.cascades[selection.index].length - 1}>Later card</button>
      </div>}
    </div>
    <div className='freecell-status'><span>{S.special(game.number)}</span><span>{S.cards(cardsLeft(game))}</span></div>
    <div className='freecell-live' aria-live='polite'>{announce}</div>
    {modal === 'deck' && <DeckDialog onClose={dismiss}/>}
    {modal === 'player' && <ChooseRemyDialog onClose={dismiss}/>}
    {modal === 'help' && <CardHelp title={S.title} sections={S.sections} onClose={dismiss}/>}
    {modal === 'about' && <AboutDialog game={S.title} icon={icon} version={S.version} flavour={S.flavour} lines={S.aboutLines} onClose={dismiss}/>}
    {modal === 'illegal' && <GameDialog title={S.title} onClose={dismiss}>{S.illegal}</GameDialog>}
    {modal === 'select' && <GameDialog title={S.numberTitle} width={300} onClose={dismiss} buttons={[
      { label: S.ok, default: true, onClick: () => { const n = parseNumber(number); if (!validNumber(n)) setValidation(true); else start(n) } },
      { label: S.cancel, cancel: true, onClick: dismiss }]}>
      <label className='freecell-number'>{S.number} <input data-autofocus value={number} onChange={e => setNumber(e.target.value)} inputMode='numeric'/> <span>{S.range}</span></label>
      {validation && <p role='alert'>{S.validation}</p>}
    </GameDialog>}
    {modal === 'options' && <GameDialog title={S.options.replace('&', '').replace('…', '')} onClose={dismiss} buttons={[
      { label: S.ok, default: true, onClick: () => { persist({ ...prefs, illegal: draft.illegal, quick: draft.quick, double: draft.double }); dismiss() } },
      { label: S.cancel, cancel: true, onClick: dismiss }]}>
      {(['illegal', 'quick', 'double'] as const).map((key, i) => <label className='freecell-option' key={key}>
        <input type='checkbox' checked={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.checked })}/>{[S.illegalOption, S.quick, S.double][i]}</label>)}
    </GameDialog>}
    {modal === 'stats' && <GameDialog title={S.statsTitle} onClose={dismiss} buttons={[
      { label: S.ok, default: true, cancel: true, onClick: dismiss }, { label: S.clear, onClick: () => setModal('clear') }]}>
      <div className='freecell-stats'>{[[S.session, session], [S.total, prefs.stats]].map(([label, value]) => {
        const s = value as Stats
        return <fieldset key={label as string}><legend>{label as string}</legend><p>{S.won}: {s.won}　{S.lost}: {s.lost}</p>
          {label === S.total && <p>{S.percent}: {s.won + s.lost ? Math.round(100 * s.won / (s.won + s.lost)) : 0}%</p>}</fieldset>
      })}<fieldset><legend>{S.streaks}</legend><p>{S.wins}: {prefs.stats.bestWins}　{S.losses}: {prefs.stats.bestLosses}</p>
        <p>{S.current}: {S.currentStreak(prefs.stats.streak)}</p></fieldset></div>
    </GameDialog>}
    {modal === 'clear' && <GameDialog title={S.title} onClose={dismiss} buttons={buttons(() => {
      persist({ ...prefs, stats: emptyStats() }); setSession(emptyStats()); setModal('stats')
    })}>{S.clearConfirm}</GameDialog>}
    {modal === 'resign' && <GameDialog title={S.title} onClose={dismiss} buttons={buttons(() => {
      if (!result.current) { persist({ ...prefs, stats: record(prefs.stats, false) }); setSession(s => record(s, false)); result.current = true }
      setEnded(true)
      pending.current?.(); pending.current = null
    })}>{S.resign}</GameDialog>}
    {modal === 'column' && <GameDialog title={S.title} onClose={dismiss} buttons={[
      { label: S.column, default: true, onClick: () => { const p = pendingColumn.current!; setModal(null); commit(p.from, p.to, false) } },
      { label: S.single, onClick: () => { const p = pendingColumn.current!; setModal(null); commit({ ...p.from, depth: game.cascades[p.from.index].length - 1 }, p.to, false) } }
    ]}>{S.empty}</GameDialog>}
    {modal === 'cheat' && <GameDialog title={S.cheat} onClose={dismiss} buttons={[
      { label: S.abort, onClick: () => { setGame({ ...game, cheat: true }); dismiss() } },
      { label: S.retry, onClick: () => { dismiss(); finish(false) } }, { label: S.ignore, cancel: true, default: true, onClick: dismiss }
    ]}>{S.cheatText}</GameDialog>}
    {(modal === 'win' || modal === 'loss') && <GameDialog title={S.title} onClose={dismiss}
      buttons={buttons(() => modal === 'loss' && same ? start(game.number) : newGame())}>
      <p>{modal === 'win' ? S.win : S.loss}</p>{modal === 'loss' && <label><input type='checkbox' checked={same} onChange={e => setSame(e.target.checked)}/>{S.same}</label>}
    </GameDialog>}
  </div>
}
