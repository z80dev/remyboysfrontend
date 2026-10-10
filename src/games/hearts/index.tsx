import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppProps } from '../../os/apps'
import { AboutDialog, GameDialog, GameMenuBar, cabaldRemy, loadRemy, loadGame, saveGame, useGamesMuted, useWindowFit,
  useWindowState, unlockAudio, playJingle, noise, stopSounds, FLAG_COLORS } from '../kit'
import { CardHelp, DeckDialog, cardLabel, cardSfx, drawBack, drawFace, subscribeCardArt, useCardPointer, useCardTweens,
  useDeckBack, type CardHit } from '../cards'
import { acknowledge, aiPass, aiPlay, deal, nextHand, passCards, passDirection, playCard, winners, type HeartsState } from './engine'
import { S } from './strings'
import { icon } from './icon'
import * as music from './music/jingles'
import './hearts.css'

type Options = { speed: number; names: string[] }
const defaults: Options = { speed: 1, names: [...S.defaults] }
const guard = (value: unknown): value is Options => {
  const v = value as Options | null
  return !!v && Number.isInteger(v.speed) && v.speed >= 0 && v.speed <= 2 && Array.isArray(v.names) && v.names.length === 3 &&
    v.names.every(name => typeof name === 'string' && name.length <= 32)
}
const seed = () => Math.floor(Math.random() * 0xffffffff)
const seats = [{ x: 320, y: 340 }, { x: 70, y: 220 }, { x: 320, y: 64 }, { x: 570, y: 220 }]
const centers = [{ x: 285, y: 242 }, { x: 207, y: 160 }, { x: 285, y: 130 }, { x: 363, y: 160 }]

/** Presentation owns delays only; the engine commits each play and score atomically before any animation. */
export default function Hearts({ close }: AppProps) {
  const [state, setState] = useState(() => deal(seed()))
  const [options, setOptions] = useState(() => loadGame('hearts', defaults, guard))
  const [draft, setDraft] = useState(options)
  const [dialog, setDialog] = useState<null | 'new' | 'score' | 'options' | 'deck' | 'help' | 'about' | 'ranking'>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [cursor, setCursor] = useState(0)
  const [peek, setPeek] = useState(false)
  const [message, setMessage] = useState('')
  const [balloon, setBalloon] = useState<{ text: string; seat: number; remaining: number } | null>(null)
  const [stamp, setStamp] = useState(0)
  const [celebration, setCelebration] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [revision, redraw] = useState(0)
  const [size, setSize] = useState({ width: 640, height: 432 })
  const [portraits, setPortraits] = useState<(HTMLImageElement | null)[]>([null, null, null])
  const surface = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const live = useRef(state)
  live.current = state
  const houseCount = useRef(0)
  const balloonTrick = useRef(-1)
  const pending = useRef<{ remaining: number; action: () => void } | null>(null)
  const [timerVersion, setTimerVersion] = useState(0)
  const { active, hidden } = useWindowState()
  const fit = useWindowFit()
  const { muted, setMuted } = useGamesMuted()
  const { back, remy } = useDeckBack()
  const tween = useCardTweens(hidden)
  const pocket = size.width < 500
  const scale = Math.min(size.width / 640, size.height / 432)
  const ox = (size.width - 640 * scale) / 2
  const oy = (size.height - 432 * scale) / 2
  const names = [S.south, ...options.names]
  const duration = [900, 500, 180][options.speed]

  const schedule = useCallback((ms: number, action: () => void) => {
    pending.current = { remaining: ms, action }
    setTimerVersion(v => v + 1)
  }, [])
  useEffect(() => {
    if (hidden || (dialog && !busy) || !pending.current) return
    const job = pending.current
    const start = performance.now()
    const id = window.setTimeout(() => {
      if (pending.current !== job) return
      pending.current = null
      job.action()
    }, job.remaining)
    return () => { window.clearTimeout(id); job.remaining = Math.max(0, job.remaining - (performance.now() - start)) }
  }, [hidden, dialog, busy, timerVersion])
  useEffect(() => { fit(640, 480) }, [fit])
  useEffect(() => {
    const node = surface.current
    if (!node) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => subscribeCardArt(() => redraw(v => v + 1)), [])
  useEffect(() => {
    let disposed = false
    ;[1010, 2086, 57].forEach((seed, i) => {
      void cabaldRemy(seed).then(index => loadRemy(index, 128)).then(image => {
        if (!disposed) setPortraits(prev => prev.map((old, j) => j === i ? image : old))
      }).catch(() => {})
    })
    return () => { disposed = true; stopSounds('hearts') }
  }, [])
  useEffect(() => { if (active && !dialog) surface.current?.focus() }, [active, dialog])
  useEffect(() => { if (hidden) stopSounds('hearts') }, [hidden])
  useEffect(() => {
    if (!balloon || hidden) return
    const start = performance.now()
    const id = window.setTimeout(() => setBalloon(null), balloon.remaining)
    return () => { clearTimeout(id); balloon.remaining = Math.max(0, balloon.remaining - (performance.now() - start)) }
  }, [balloon, hidden])
  useEffect(() => {
    if (!stamp || hidden) return
    const id = window.setTimeout(() => setStamp(0), 200)
    return () => clearTimeout(id)
  }, [stamp, hidden])

  const speak = useCallback((text: string, seat: number, trick: number) => {
    if (balloonTrick.current === trick) return
    if (text === S.house && houseCount.current >= 2) return
    if (text === S.house) houseCount.current++
    balloonTrick.current = trick
    setBalloon({ text, seat, remaining: 2500 })
  }, [])
  const finishHand = useCallback((next: HeartsState) => {
    setBusy(false)
    if (next.moon !== null) {
      setCelebration(next.moon)
      void playJingle(music.moon, 'hearts')
      noise(2.5, { filter: 'bandpass', freq: 300, to: 4000, vol: .1, owner: 'hearts' })
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      schedule(reduced ? 1500 : 2500, () => { setCelebration(null); setDialog('score') })
    } else {
      if (next.points[0] === 0) speak(S.zero, 2, next.hand * 100 + 14)
      setDialog('score')
    }
    if (next.phase === 'over') void playJingle(winners(next.totals).includes(0) ? music.won : music.lost, 'hearts')
  }, [schedule, speak])

  const commitPlay = useCallback((id: number) => {
    const old = live.current
    const next = playCard(old, id)
    if (next === old) { cardSfx('invalid'); setMessage(S.illegal); return }
    setBusy(true)
    setSelected([])
    setCursor(c => Math.min(c, next.hands[0].length - 1))
    setState(next)
    live.current = next
    const card = next.played[next.played.length - 1].card
    const turn = old.turn
    setMessage(`${names[turn]} ${S.played} ${cardLabel(card)}.`)
    cardSfx('place')
    const key = old.hand * 100 + old.tricks
    if (!old.broken && next.broken) { speak(S.broken, turn, key); void playJingle(music.broken, 'hearts') }
    const complete = next.tricks !== old.tricks
    const reveal = () => {
      if (complete) {
        const queen = next.lastTrick.some(p => p.card.suit === 'spades' && p.card.rank === 12)
        if (queen) {
          void playJingle(music.rugged, 'hearts')
          if (next.lastWinner === 0) setStamp(Date.now())
          else speak(S.queen, next.lastWinner!, key)
        }
        const previousShooter = old.points.findIndex((p, seat) => p >= 8 && old.points.every((v, other) => other === seat || v === 0))
        if (previousShooter >= 0 && next.lastWinner !== previousShooter && next.lastTrick.some(p => p.card.suit === 'hearts')) {
          speak(S.blocked, next.lastWinner!, key)
        }
        setMessage(`${names[next.lastWinner!]} ${S.trick}.`)
        schedule(duration, () => {
          const winner = seats[next.lastWinner!]
          tween.start(next.lastTrick.map(p => ({ card: p.card, fromX: centers[p.seat].x, fromY: centers[p.seat].y,
            toX: winner.x - 35, toY: winner.y - 48 })), () => {
            setState(current => ({ ...current, lastTrick: [] }))
            if (next.phase === 'score' || next.phase === 'over') finishHand(next)
            else setBusy(false)
          })
        })
      } else schedule(duration / 2, () => setBusy(false))
    }
    const origin = turn === 0 ? { x: 285 + (old.hands[0].findIndex(c => c.id === id) - (old.hands[0].length - 1) / 2) * 14, y: 328 } :
      { x: seats[turn].x - 35, y: seats[turn].y - 48 }
    tween.start([{ card, fromX: origin.x, fromY: origin.y, toX: centers[turn].x, toY: centers[turn].y }], reveal)
  }, [names, duration, tween.start, schedule, finishHand, speak])
  const playRef = useRef(commitPlay)
  playRef.current = commitPlay
  useEffect(() => {
    if (hidden || dialog || busy || celebration !== null || state.phase !== 'play' || state.turn === 0) return
    schedule(duration, () => playRef.current(aiPlay(live.current).id))
  }, [state, hidden, dialog, busy, celebration, duration, schedule])

  function confirmPass() {
    if (!active || busy) return
    if (state.phase === 'received') {
      setState(acknowledge(state)); setSelected([]); setMessage(S.turn); return
    }
    if (state.phase !== 'pass' || selected.length !== 3) return
    const next = passCards(state, [selected, ...state.hands.slice(1).map(aiPass)])
    setState(next); setSelected([]); cardSfx('deal')
    if (next.received.some(id => next.hands[0].some(c => c.id === id && c.suit === 'spades' && c.rank === 12))) {
      speak(S.house, (4 - [1, 3, 2, 0][state.hand % 4]) % 4, state.hand * 100 - 1)
    }
  }
  function selectCard(id: number, touch: boolean) {
    if (!active || hidden || dialog || busy || celebration !== null) return
    if (state.phase === 'pass') {
      setSelected(ids => ids.includes(id) ? ids.filter(v => v !== id) : ids.length < 3 ? [...ids, id] : ids)
      cardSfx('flick')
    } else if (state.phase === 'play' && state.turn === 0) {
      if (touch && !selected.includes(id)) { setSelected([id]); return }
      commitPlay(id)
    }
  }
  function hitTest(x: number, y: number): CardHit | null {
    x = (x - ox) / scale; y = (y - oy) / scale
    const cards = state.hands[0]
    const step = pocket ? Math.min(42, (610 - 71) / Math.max(1, cards.length - 1)) : 14
    const start = (640 - (71 + step * (cards.length - 1))) / 2
    for (let i = cards.length - 1; i >= 0; i--) {
      const cx = start + i * step
      const cy = 328 - (selected.includes(cards[i].id) || state.received.includes(cards[i].id) ? 15 : 0)
      if (x >= cx && x < cx + 71 && y >= cy && y < cy + 96) return { pile: 0, depth: i, x: cx * scale + ox, y: cy * scale + oy, card: cards[i] }
    }
    return null
  }
  const lastTouch = useRef(false)
  const pointer = useCardPointer({ hitTest, disabled: !active || hidden || !!dialog || busy,
    onTap: hit => { if (hit?.card) selectCard(hit.card.id, lastTouch.current) },
    onDoubleTap: hit => { if (hit.card) selectCard(hit.card.id, lastTouch.current) },
    onContext: hit => { if (hit?.card) setMessage(cardLabel(hit.card)) },
    onDrop: (source, _target, x, y) => {
      if (source.card && (y - oy) / scale < 310 && (x - ox) / scale > 170 && (x - ox) / scale < 470) selectCard(source.card.id, false)
    }
  })

  useEffect(() => {
    const node = canvas.current
    if (!node) return
    const dpr = window.devicePixelRatio || 1
    node.width = Math.round(size.width * dpr); node.height = Math.round(size.height * dpr)
    const ctx = node.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#008000'; ctx.fillRect(0, 0, size.width, size.height)
    ctx.translate(ox, oy); ctx.scale(scale, scale); ctx.imageSmoothingEnabled = false
    const tweenIds = tween.tweens.map(t => t.card.id)
    const cards = state.hands[0]
    const step = pocket ? Math.min(42, 539 / Math.max(1, cards.length - 1)) : 14
    const start = (640 - (71 + step * (cards.length - 1))) / 2
    cards.forEach((card, i) => {
      if (pointer.drag?.source.card?.id === card.id || tweenIds.includes(card.id)) return
      const y = 328 - (selected.includes(card.id) || state.received.includes(card.id) ? 15 : 0)
      drawFace(ctx, card, start + i * step, y)
      if (i === cursor && active) { ctx.strokeStyle = '#ffff00'; ctx.setLineDash([2, 2]); ctx.strokeRect(start + i * step + 2, y + 2, 67, 92); ctx.setLineDash([]) }
    })
    for (let seat = 1; seat < 4; seat++) {
      const cards = state.hands[seat]
      if (!pocket || peek) {
        ctx.save()
        const x = seats[seat].x
        const y = seats[seat].y
        ctx.translate(x, y)
        if (seat !== 2) ctx.rotate(seat === 1 ? Math.PI / 2 : -Math.PI / 2)
        const spacing = peek ? 14 : 5
        cards.forEach((card, i) => {
          if (tweenIds.includes(card.id)) return
          if (peek) drawFace(ctx, card, -(71 + spacing * (cards.length - 1)) / 2 + i * spacing, -48)
          else drawBack(ctx, back, -(71 + spacing * (cards.length - 1)) / 2 + i * spacing, -48, 0, remy)
        })
        ctx.restore()
      }
    }
    const displayed = state.lastTrick.length ? state.lastTrick : state.trick
    displayed.forEach(p => { if (!tweenIds.includes(p.card.id)) drawFace(ctx, p.card, centers[p.seat].x, centers[p.seat].y) })
    tween.tweens.forEach(t => drawFace(ctx, t.card, t.x, t.y))
    if (pointer.drag?.source.card) drawFace(ctx, pointer.drag.source.card, (pointer.drag.x - ox) / scale, (pointer.drag.y - oy) / scale)
    if (pointer.longPress) {
      ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc((pointer.longPress.x - ox) / scale, (pointer.longPress.y - oy) / scale,
        14 * (1 - pointer.longPress.progress), 0, Math.PI * 2); ctx.stroke()
    }
  }, [state, selected, cursor, active, size, back, remy, peek, pocket, scale, ox, oy, revision, tween.tweens, pointer.drag, pointer.longPress])

  function newGame() {
    if (state.played.length || state.rows.length || state.phase === 'received') setDialog('new')
    else reset()
  }
  function reset() {
    pending.current = null; tween.cancel(); setBusy(false); setCelebration(null); setDialog(null); setState(deal(seed())); setSelected([])
    setCursor(0); setMessage(S.select); balloonTrick.current = -1; setBalloon(null)
  }
  function skip() {
    pending.current = null; setTimerVersion(v => v + 1); setCelebration(null); stopSounds('hearts'); setDialog('score')
  }
  const menus = [
    { label: S.game, items: [
      { label: S.new, hotkey: 'F2', onClick: newGame }, { label: S.score, hotkey: 'F3', onClick: () => setDialog('score') }, '-' as const,
      { label: S.options, onClick: () => { setDraft({ ...options, names: [...options.names] }); setDialog('options') } },
      { label: S.deck, onClick: () => setDialog('deck') }, '-' as const, { label: S.exit, onClick: close }
    ] },
    { label: S.help, items: [{ label: S.contents, hotkey: 'F1', onClick: () => setDialog('help') }, '-' as const,
      { label: S.about, onClick: () => setDialog('about') }] }
  ]
  const status = message || (state.phase === 'pass' ? S.select : state.phase === 'received' ? S.received : state.turn === 0 ? S.turn : S.waiting)
  return <div className='hearts-game' onPointerDownCapture={event => {
    if (!active || hidden) return
    unlockAudio()
    if (celebration !== null) { event.stopPropagation(); skip() }
  }} onKeyDownCapture={event => {
    if (!active || hidden) return
    unlockAudio()
    if (celebration !== null) { event.preventDefault(); event.stopPropagation(); skip(); return }
    if (event.key === 'F12' && event.ctrlKey && event.altKey && event.shiftKey) {
      event.preventDefault(); setPeek(value => !value); setMessage(S.peek); return
    }
  }}>
    <GameMenuBar menus={menus} />
    <div ref={surface} className='hearts-surface' tabIndex={0} role='application' aria-label={S.title}
      onPointerMove={pointer.onPointerMove} onPointerUp={pointer.onPointerUp} onPointerCancel={pointer.onPointerCancel}
      onLostPointerCapture={pointer.onLostPointerCapture} onContextMenu={pointer.onContextMenu} onPointerDown={event => {
        if (celebration !== null && active) { skip(); return }
        lastTouch.current = event.pointerType === 'touch'
        pointer.onPointerDown(event)
      }} onKeyDown={event => {
        if (!active || hidden || dialog || busy) return
        if (['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(event.key)) event.preventDefault()
        if (event.key === 'ArrowLeft') setCursor(i => Math.max(0, i - 1))
        if (event.key === 'ArrowRight') setCursor(i => Math.min(state.hands[0].length - 1, i + 1))
        if (event.key === ' ' && state.hands[0][cursor]) selectCard(state.hands[0][cursor].id, false)
        if (event.key === 'Enter') confirmPass()
      }}>
      <canvas ref={canvas} aria-hidden='true' />
      <div className='hearts-plates' style={{ left: ox, top: oy, width: 640 * scale, height: 432 * scale }}>
        {[1, 2, 3].map(seat => <div key={seat} className={`hearts-plate seat-${seat}`}>
          {portraits[seat - 1] ? <img src={portraits[seat - 1]!.src} alt='' /> : <span className='hearts-portrait-placeholder' />}
          <span>{names[seat]}<br />{state.totals[seat]}{pocket ? ` · ${state.hands[seat].length}` : ''}</span>
        </div>)}
        <span className='hearts-your-score'>{names[0]} · {state.totals[0]}</span>
        {balloon && <div className={`hearts-balloon balloon-${balloon.seat}`}>{balloon.text}</div>}
        {stamp !== 0 && <span key={stamp} className='hearts-rugged' style={{ animationPlayState: hidden ? 'paused' : 'running' }}>{S.rugged}</span>}
      </div>
      {(state.phase === 'pass' || state.phase === 'received') && <button className='hearts-pass' disabled={state.phase === 'pass' && selected.length !== 3}
        onClick={confirmPass}>{state.phase === 'received' ? S.ok : S.pass[passDirection(state.hand)]}</button>}
      {celebration !== null && <div className='hearts-moon' style={{ animationPlayState: hidden ? 'paused' : 'running' }}>
        <strong>{S.moon}</strong><span className='hearts-moon-disc' />
        <div className={`hearts-rocket rocket-${celebration}`} style={{ animationPlayState: hidden ? 'paused' : 'running' }}>
          <span className='rocket-nose' /><span className='rocket-card'>♥</span><span className='rocket-fins' />
          <span className='rocket-exhaust'>{FLAG_COLORS.map(color => <i key={color} style={{ background: color }} />)}</span>
        </div>
      </div>}
    </div>
    <div className='hearts-status' role='status' aria-live='polite'>{status}</div>
    {dialog === 'new' && <GameDialog title={S.title} onClose={() => setDialog(null)} buttons={[
      { label: S.yes, onClick: reset }, { label: S.no, onClick: () => setDialog(null), cancel: true }
    ]}>{S.confirm}</GameDialog>}
    {dialog === 'score' && <GameDialog title={S.sheet} width={560} onClose={() => setDialog(null)} buttons={[
      { label: state.phase === 'score' ? S.next : S.ok, default: true, onClick: () => {
        if (state.phase === 'score') { setState(nextHand(state)); setSelected([]); setMessage(''); setCursor(0); setDialog(null) }
        else if (state.phase === 'over') setDialog('ranking')
        else setDialog(null)
      } }
    ]}><div className='hearts-sheet'><table><thead><tr><th>{S.hand}</th>{names.map((name, i) => <th key={i}>{name}</th>)}</tr></thead>
      <tbody>{state.rows.map((row, i) => <tr key={i}><th>{i + 1}{row.moon !== null ? ' ☾' : ''}</th>
        {row.points.map((point, seat) => <td key={seat}>{point} <small>({row.totals[seat]})</small></td>)}</tr>)}</tbody>
      <tfoot><tr><th>{S.total}</th>{state.totals.map((total, i) => <th key={i}>{total}</th>)}</tr></tfoot></table></div></GameDialog>}
    {dialog === 'ranking' && <GameDialog title={S.ranking} onClose={() => setDialog(null)} buttons={[
      { label: S.new.replace('&', ''), onClick: reset, default: true }, { label: S.ok, onClick: () => setDialog(null) }
    ]}><strong>{winners(state.totals).map(seat => names[seat]).join(' & ')} {S.wins}</strong>
      <ol>{[0, 1, 2, 3].sort((a, b) => state.totals[a] - state.totals[b]).map(seat => <li key={seat}>{names[seat]}: {state.totals[seat]}</li>)}</ol>
    </GameDialog>}
    {dialog === 'options' && <GameDialog title={S.options.replace('&', '').replace('…', '')} onClose={() => setDialog(null)} buttons={[
      { label: S.ok, default: true, onClick: () => {
        const next = { speed: draft.speed, names: draft.names.map((name, i) => name.trim().slice(0, 32) || S.defaults[i]) }
        setOptions(next); saveGame('hearts', next); setDialog(null)
        if (next.names.some(name => name.toLowerCase() === 'prof. gwei')) setMessage(S.nice)
      } }, { label: S.cancel, cancel: true, onClick: () => setDialog(null) }
    ]}><fieldset><legend>{S.speed}</legend>{S.speeds.map((speed, i) => <label key={speed}>
      <input type='radio' name='hearts-speed' checked={draft.speed === i} onChange={() => setDraft(v => ({ ...v, speed: i }))} />{speed}</label>)}</fieldset>
      <fieldset><legend>{S.players} ({S.standard})</legend>{draft.names.map((name, i) => <label key={i}>{S.defaults[i]}
        <input value={name} maxLength={32} onChange={event => setDraft(v => ({ ...v, names: v.names.map((old, j) => i === j ? event.target.value : old) }))} />
      </label>)}</fieldset><label><input type='checkbox' checked={!muted} onChange={() => setMuted(!muted)} />{S.sound}</label>
    </GameDialog>}
    {dialog === 'deck' && <DeckDialog onClose={() => setDialog(null)} />}
    {dialog === 'help' && <CardHelp title={S.helpTitle} sections={S.sections} onClose={() => setDialog(null)} />}
    {dialog === 'about' && <AboutDialog game={S.title} icon={icon} version={S.version} flavour={S.flavour} lines={S.credits} onClose={() => setDialog(null)} />}
  </div>
}
