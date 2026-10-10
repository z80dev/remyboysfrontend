import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { AppProps } from '../../os/apps'
import { AboutDialog, ChooseRemyDialog, GameDialog, GameMenuBar, loadGame, saveGame, useWindowFit, useWindowState,
  useWindowTitle, useGamesMuted, useGamesPlayer, loadPalette, unlockAudio, playJingle, stopSounds, type RemyPalette } from '../kit'
import { CARD_W, CARD_H, SUITS, cardLabel, drawFace, drawEmpty, subscribeCardArt, useCardPointer, useCardTweens,
  DeckDialog, CardHelp, cardSfx, type CardHit, type CardTweenMove } from '../cards'
import { at, cardsLeft, deal, emptyStats, hasLegalMove, legal, move, orderedRun, record, run, undo, validNumber, won,
  type Game, type Location, type Stats } from './engine'
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
  const [game, setGame] = useState(() => deal(validNumber(Number(param)) ? Number(param) : 1 + Math.floor(Math.random() * 32000)))
  const [prefs, setPrefs] = useState(() => loadGame('freecell', defaults, guard))
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
  const canvas = useRef<HTMLCanvasElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const pending = useRef<(() => void) | null>(null)
  const pendingColumn = useRef<{ from: Location; to: Location } | null>(null)
  const result = useRef(false)
  const { active, hidden } = useWindowState()
  const fit = useWindowFit()
  const { muted, toggleMuted } = useGamesMuted()
  const { player } = useGamesPlayer()
  const tween = useCardTweens(hidden)
  useWindowTitle(S.caption(game.number))
  const scale = width / 632
  const gap = Math.min(32, 194 / Math.max(1, ...game.cascades.map(c => c.length - 1)))
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
  const finish = (win: boolean) => {
    if (result.current) return
    result.current = true
    setEnded(true)
    setSession(s => record(s, win))
    persist({ ...prefs, stats: record(prefs.stats, win) })
    setSelection(null)
    setAnnounce(win ? S.win : S.loss)
    if (win) { setFrame(0); if (!muted) void playJingle(winSong, 'freecell') }
    else setModal('loss')
  }
  const start = (n: number) => {
    tween.cancel()
    const next = deal(n)
    setGame(next); setSelection(null); setModal(null); setEnded(false); result.current = false; setFrame(-1)
    setAnnounce(S.started(n))
    if (!prefs.quick) {
      const moves: CardTweenMove[] = []
      next.cascades.forEach((c, index) => c.forEach((card, depth) => moves.push({ card, fromX: 300, fromY: 8,
        toX: 4 + index * 79, toY: 120 + depth * Math.min(32, 194 / 6), delay: (depth * 8 + index) * 8 })))
      tween.start(moves)
    }
    cardSfx('deal')
  }
  const newGame = () => start(1 + Math.floor(Math.random() * 32000))
  const request = (action: () => void) => {
    if (!ended && game.moves > 0) { pending.current = action; setModal('resign') } else action()
  }
  const invalid = () => { cardSfx('invalid'); setAnnounce(S.illegal); if (prefs.illegal) setModal('illegal') }
  const commit = (from: Location, to: Location, ask = true) => {
    const cards = run(game, from)
    if (ask && to.kind === 'cascade' && !game.cascades[to.index].length && cards.length > 1 && orderedRun(cards)) {
      pendingColumn.current = { from, to }; setModal('column'); return
    }
    const next = move(game, from, to)
    if (!next) return invalid()
    if (!prefs.quick) {
      const before = new Map<number, { x: number; y: number }>()
      game.cascades.forEach((c, index) => c.forEach((card, depth) => before.set(card.id, position({ kind: 'cascade', index, depth }))))
      game.free.forEach((card, index) => { if (card) before.set(card.id, position({ kind: 'free', index })) })
      const moves: CardTweenMove[] = []
      const add = (card: NonNullable<CardHit['card']>, x: number, y: number) => {
        const origin = before.get(card.id)
        if (origin && (origin.x !== x || origin.y !== y)) moves.push({ card, fromX: origin.x, fromY: origin.y, toX: x, toY: y })
      }
      const nextGap = Math.min(32, 194 / Math.max(1, ...next.cascades.map(c => c.length - 1)))
      next.cascades.forEach((c, index) => c.forEach((card, depth) => add(card, 4 + index * 79, 120 + depth * nextGap)))
      next.free.forEach((card, index) => { if (card) add(card, 4 + index * 71, 8) })
      before.forEach((_, id) => {
        const suit = id % 4, rank = Math.floor(id / 4) + 1
        if (rank > game.home[suit] && rank <= next.home[suit]) add({ id, rank, suit: SUITS[suit], faceUp: true }, 344 + suit * 71, 8)
      })
      tween.start(moves)
    }
    setGame(next); setSelection(null); setAnnounce(S.moved(cardsLeft(next))); cardSfx('place')
    if (won(next)) finish(true)
    else if (!hasLegalMove(next)) finish(false)
  }
  const choose = (l: Location) => {
    if (!active || hidden || modal || ended) return
    if (selection) {
      if (selection.kind === l.kind && selection.index === l.index && (l.kind !== 'cascade' || selection.depth === l.depth)) setSelection(null)
      else commit(selection, l)
    } else {
      const card = at(game, l)
      if (card && l.kind !== 'home') { setSelection(l); setAnnounce(S.selected(cardLabel(card))); cardSfx('flick') }
    }
  }
  const sendFree = (l: Location) => {
    const card = at(game, l)
    if (!card || l.kind === 'home') return
    const from = l.kind === 'cascade' ? { ...l, depth: game.cascades[l.index].length - 1 } : l
    const empty = prefs.double ? game.free.findIndex(c => !c) : -1
    commit(from, empty >= 0 ? { kind: 'free', index: empty } : { kind: 'home', index: SUITS.indexOf(at(game, from)!.suit) })
  }
  const pointer = useCardPointer({ hitTest, disabled: !active || hidden || !!modal || ended,
    onTap: hit => { if (hit) choose(location(hit)) }, onDoubleTap: hit => { if (hit) sendFree(location(hit)) },
    onContext: hit => { if (hit) sendFree(location(hit)) }, onDrop: (source, target) => { if (target) commit(location(source), location(target)) } })
  useEffect(() => { fit(632, 448) }, [fit])
  useEffect(() => { saveGame('freecell', prefs) }, [prefs])
  useEffect(() => subscribeCardArt(() => setArt(n => n + 1)), [])
  useEffect(() => { let alive = true; void loadPalette(player.remy).then(p => { if (alive) setPalette(p) }); return () => { alive = false } }, [player.remy])
  useEffect(() => {
    const host = surface.current
    if (!host) return
    const observer = new ResizeObserver(entries => setWidth(Math.min(632, entries[0].contentRect.width)))
    observer.observe(host)
    return () => observer.disconnect()
  }, [])
  useEffect(() => { if (active && !modal) surface.current?.focus({ preventScroll: true }) }, [active, modal])
  useEffect(() => () => { stopSounds('freecell') }, [])
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
    el.width = Math.round(width * dpr); el.height = Math.round(402 * scale * dpr)
    const ctx = el.getContext('2d')!
    ctx.scale(scale * dpr, scale * dpr); ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#008000'; ctx.fillRect(0, 0, 632, 402)
    const animated = new Set(tween.tweens.map(t => t.card.id))
    const dragCards = pointer.drag ? run(game, location(pointer.drag.source)) : []
    const dragged = new Set(dragCards.map(c => c.id))
    for (let i = 0; i < 4; i++) {
      drawEmpty(ctx, 'pile', 4 + i * 71, 8); drawEmpty(ctx, 'home', 344 + i * 71, 8)
      const free = game.free[i], home = at(game, { kind: 'home', index: i })
      if (free && !animated.has(free.id) && !dragged.has(free.id)) drawFace(ctx, free, 4 + i * 71, 8, { selected: selection?.kind === 'free' && selection.index === i })
      if (home && !animated.has(home.id)) drawFace(ctx, home, 344 + i * 71, 8)
    }
    game.cascades.forEach((cards, index) => {
      if (!cards.length) drawEmpty(ctx, 'pile', 4 + index * 79, 120)
      cards.forEach((card, depth) => {
        if (!animated.has(card.id) && !dragged.has(card.id)) drawFace(ctx, card, 4 + index * 79, 120 + depth * gap,
          { selected: selection?.kind === 'cascade' && selection.index === index && depth >= (selection.depth ?? cards.length - 1) })
      })
    })
    if (width >= 360) {
      ctx.fillStyle = '#c0c0c0'; ctx.fillRect(292, 31, 48, 48)
      ctx.strokeStyle = '#000'; ctx.strokeRect(292.5, 31.5, 47, 47)
      ctx.save(); ctx.translate(292, 31); drawKing(ctx, palette, look, ended && !won(game) ? 'loss' : frame >= 0 || won(game) ? 'win' : 'idle', Math.max(0, frame)); ctx.restore()
    }
    if (cursorVisible) {
      const l: Location = cursor < 8 ? { kind: 'cascade', index: cursor } : cursor < 12 ? { kind: 'free', index: cursor - 8 } : { kind: 'home', index: cursor - 12 }
      const p = position(l)
      ctx.strokeStyle = '#ffff00'; ctx.setLineDash([2, 2]); ctx.strokeRect(p.x + 2, Math.max(l.kind === 'cascade' ? 120 : 8, p.y) + 2, 67, 92); ctx.setLineDash([])
    }
    tween.tweens.forEach(t => drawFace(ctx, t.card, t.x, t.y))
    if (pointer.drag) dragCards.forEach((card, i) => drawFace(ctx, card, pointer.drag!.x / scale - (pointer.drag!.originX / scale - pointer.drag!.source.x),
      pointer.drag!.y / scale - (pointer.drag!.originY / scale - pointer.drag!.source.y) + i * gap, { ghost: true }))
    if (pointer.longPress) {
      ctx.beginPath(); ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2
      ctx.arc(pointer.longPress.x / scale, pointer.longPress.y / scale, 15 * (1 - pointer.longPress.progress), 0, Math.PI * 2); ctx.stroke()
    }
  }, [game, selection, cursor, cursorVisible, width, palette, look, frame, ended, art, tween.tweens, pointer.drag, pointer.longPress, hidden])
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
      const card = at(game, selection)
      if (card) l = { kind: 'home', index: SUITS.indexOf(card.suit) }
    }
    if (e.key.startsWith('Arrow')) { e.preventDefault(); setCursorVisible(true); setCursor((cursor + (e.key === 'ArrowLeft' ? 15 : e.key === 'ArrowRight' ? 1 : 8)) % 16); return }
    if (e.key === ' ' || e.key === 'Enter') l = cursor < 8 ? { kind: 'cascade', index: cursor } : cursor < 12 ?
      { kind: 'free', index: cursor - 8 } : { kind: 'home', index: cursor - 12 }
    if (e.key === 'Escape') { e.preventDefault(); setSelection(null); return }
    if (l) { e.preventDefault(); choose(l) }
  }
  const dismiss = () => setModal(null)
  const openSelect = () => { setNumber(String(game.number)); setValidation(false); setModal('select') }
  const buttons = (yes: () => void) => [{ label: S.yes, onClick: yes, default: true }, { label: S.no, onClick: dismiss, cancel: true }]
  return <div className='freecell-game'>
    <GameMenuBar menus={[
      { label: S.game, items: [
        { label: S.new, hotkey: 'F2', onClick: () => request(newGame) }, { label: S.select, hotkey: 'F3', onClick: () => request(openSelect) },
        { label: S.restart, onClick: () => start(game.number) }, '-', { label: S.stats, hotkey: 'F4', onClick: () => setModal('stats') },
        { label: S.options, hotkey: 'F5', onClick: () => setModal('options') }, '-',
        { label: S.undo, hotkey: 'F10', accel: false, disabled: !game.history.length || ended, onClick: doUndo }, '-',
        { label: S.deck, onClick: () => setModal('deck') }, { label: S.player, onClick: () => setModal('player') },
        { label: S.sound, checked: !muted, onClick: toggleMuted }, '-', { label: S.exit, onClick: close }
      ] }, { label: S.help, items: [{ label: S.contents, hotkey: 'F1', onClick: () => setModal('help') }, '-', { label: S.about, onClick: () => setModal('about') }] }
    ]}/>
    <div ref={surface} className='freecell-surface' tabIndex={0} role='application' aria-label={S.application} onKeyDown={onKey}
      onPointerDownCapture={e => { unlockAudio(); if (frame >= 0) { e.stopPropagation(); setFrame(-1); setModal('win') } }}
      onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); setLook(e.clientX - r.left < r.width / 2 ? -1 : 1) }}>
      <canvas ref={canvas} style={{ width, height: 402 * scale }} onPointerDown={pointer.onPointerDown} onPointerMove={pointer.onPointerMove}
        onPointerUp={pointer.onPointerUp} onPointerCancel={pointer.onPointerCancel} onLostPointerCapture={pointer.onLostPointerCapture}
        onContextMenu={pointer.onContextMenu}/>
    </div>
    <div className='freecell-status'><span>{S.special(game.number)}</span><span>{S.cards(cardsLeft(game))}</span></div>
    <div className='freecell-live' aria-live='polite'>{announce}</div>
    {modal === 'deck' && <DeckDialog onClose={dismiss}/>}
    {modal === 'player' && <ChooseRemyDialog onClose={dismiss}/>}
    {modal === 'help' && <CardHelp title={S.helpTitle} sections={S.sections} onClose={dismiss}/>}
    {modal === 'about' && <AboutDialog game={S.title} icon={icon} version={S.version} flavour={S.flavour} lines={S.aboutLines} onClose={dismiss}/>}
    {modal === 'illegal' && <GameDialog title={S.title} onClose={dismiss}>{S.illegal}</GameDialog>}
    {modal === 'select' && <GameDialog title={S.title} onClose={dismiss} buttons={[
      { label: S.ok, default: true, onClick: () => { const n = Number(number.trim()); if (!validNumber(n)) setValidation(true); else start(n) } },
      { label: S.cancel, cancel: true, onClick: dismiss }]}>
      <label>{S.number} <input data-autofocus value={number} onChange={e => setNumber(e.target.value)} inputMode='numeric'/> {S.range}</label>
      {validation && <p role='alert'>{S.validation}</p>}
    </GameDialog>}
    {modal === 'options' && <GameDialog title={S.options.replace('&', '').replace('…', '')} onClose={dismiss}>
      {(['illegal', 'quick', 'double'] as const).map((key, i) => <label className='freecell-option' key={key}>
        <input type='checkbox' checked={prefs[key]} onChange={e => persist({ ...prefs, [key]: e.target.checked })}/>{[S.illegalOption, S.quick, S.double][i]}</label>)}
    </GameDialog>}
    {modal === 'stats' && <GameDialog title={S.stats.replace('&', '').replace('…', '')} onClose={dismiss} buttons={[
      { label: S.ok, default: true, cancel: true, onClick: dismiss }, { label: S.clear, onClick: () => setModal('clear') }]}>
      <div className='freecell-stats'>{[[S.session, session], [S.total, prefs.stats]].map(([label, value]) => {
        const s = value as Stats
        return <fieldset key={label as string}><legend>{label as string}</legend><p>{S.won}: {s.won}　{S.lost}: {s.lost}</p>
          {label === S.total && <p>{S.percent}: {s.won + s.lost ? Math.round(100 * s.won / (s.won + s.lost)) : 0}%</p>}</fieldset>
      })}<fieldset><legend>{S.streaks}</legend><p>{S.wins}: {prefs.stats.bestWins}　{S.losses}: {prefs.stats.bestLosses}</p>
        <p>{S.current}: {Math.abs(prefs.stats.streak)} {prefs.stats.streak < 0 ? S.losses : S.wins}</p></fieldset></div>
    </GameDialog>}
    {modal === 'clear' && <GameDialog title={S.title} onClose={dismiss} buttons={buttons(() => {
      persist({ ...prefs, stats: emptyStats() }); setSession(emptyStats()); setModal('stats')
    })}>{S.clearConfirm}</GameDialog>}
    {modal === 'resign' && <GameDialog title={S.title} onClose={dismiss} buttons={buttons(() => {
      if (!result.current) { persist({ ...prefs, stats: record(prefs.stats, false) }); setSession(s => record(s, false)); result.current = true }
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
