import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import type { AppProps } from '../../os/apps'
import { AboutDialog, GameDialog, GameMenuBar, cabaldRemy, loadRemy, loadGame, saveGame, useGamesMuted, useWindowFit,
  useWindowState, useCrispCanvas, unlockAudio, playJingle, noise, stopSounds, FLAG_COLORS } from '../kit'
import { CardHelp, CardHoldFeedback, DeckDialog, cardLabel, cardSfx, drawBack, drawBackSideStrip, drawFace, drawFocus, subscribeCardArt, useCardPointer, useCardTweens,
  useDeckBack, type CardHit } from '../cards'
import { acknowledge, aiPass, aiPlay, deal, nextHand, passCards, passDirection, playCard, visibleMoonThreat, winners, type HeartsState } from './engine'
import { rankingMessage, S, trickMessage, trickSeatLabel } from './strings'
import { handCardPosition, handCardTarget, handScrollForCard, heartsLayout, hitHand, moonPath, opponentCardOrigin, opponentFanOffset } from './layout'
import { icon } from './icon'
import { RuggedStamp } from './stamp'
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

/** Presentation owns delays only; the engine commits each play and score atomically before any animation. */
export default function Hearts({ close }: AppProps) {
  const [state, setState] = useState(() => deal(seed()))
  const [options, setOptions] = useState(() => loadGame('hearts', defaults, guard))
  const [draft, setDraft] = useState(options)
  const [dialog, setDialog] = useState<null | 'new' | 'score' | 'options' | 'deck' | 'help' | 'about' | 'ranking'>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [cursor, setCursor] = useState(0)
  const [keyboardCursor, setKeyboardCursor] = useState(false)
  const [peek, setPeek] = useState(false)
  const [message, setMessage] = useState('')
  const [balloon, setBalloon] = useState<{ text: string; seat: number; remaining: number } | null>(null)
  const [stamp, setStamp] = useState(0)
  const [celebration, setCelebration] = useState<number | null>(null)
  const [busy, setBusy] = useState(true)
  const [revision, redraw] = useState(0)
  const [size, setSize] = useState({ width: 640, height: 432 })
  const [handScroll, setHandScroll] = useState(0)
  const [measured, setMeasured] = useState(false)
  const [portraits, setPortraits] = useState<(HTMLImageElement | null)[]>([null, null, null])
  const surface = useRef<HTMLDivElement>(null)
  const crisp = useCrispCanvas(Math.round(size.width), Math.round(size.height), { onResize: () => redraw(v => v + 1) })
  const canvas = crisp.ref
  const handViewport = useRef<HTMLDivElement>(null)
  const handPress = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const live = useRef(state)
  live.current = state
  const houseCount = useRef(0)
  const balloonTrick = useRef(-999)
  const pending = useRef<{ remaining: number; action: () => void } | null>(null)
  const [timerVersion, setTimerVersion] = useState(0)
  const { active, hidden, pocket } = useWindowState()
  const fit = useWindowFit()
  const { muted, setMuted } = useGamesMuted()
  const { back, remy } = useDeckBack()
  const tween = useCardTweens(hidden)
  const layout = heartsLayout(size.width, size.height, pocket, state.hands[0].length, handScroll)
  const { scale, ox, oy, seats, centers } = layout
  const layoutRef = useRef(layout)
  layoutRef.current = layout
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
  function revealCard(depth: number) {
    const node = handViewport.current
    if (!node) return
    node.scrollLeft = handScrollForCard(layoutRef.current, depth, live.current.hands[0].length)
    setHandScroll(node.scrollLeft)
  }
  useEffect(() => {
    if (handViewport.current) {
      handViewport.current.scrollLeft = 0
      setHandScroll(0)
    }
  }, [state.seed, state.hand])
  useEffect(() => {
    if (pocket && handViewport.current) handViewport.current.scrollLeft = handScroll
  }, [pocket])
  useEffect(() => { if (keyboardCursor) revealCard(cursor) }, [cursor, state.hands[0].length, pocket, keyboardCursor])
  useEffect(() => {
    const node = surface.current
    if (!node) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
      setMeasured(width > 0 && height > 0)
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
      setBalloon(null)
      setDialog('score')
    }
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
    if (!old.broken && next.broken) { speak(S.broken, turn === 0 ? 2 : turn, key); void playJingle(music.broken, 'hearts') }
    const complete = next.tricks !== old.tricks
    const reveal = () => {
      if (complete) {
        const queen = next.lastTrick.some(p => p.card.suit === 'spades' && p.card.rank === 12)
        if (queen) {
          void playJingle(music.rugged, 'hearts')
          if (next.lastWinner === 0) setStamp(Date.now())
          else speak(S.queen, next.lastWinner!, key)
        }
        const previousShooter = visibleMoonThreat(old)
        if (previousShooter !== null && visibleMoonThreat(next) === null && next.lastWinner !== previousShooter && next.lastTrick.some(p => p.card.suit === 'hearts')) {
          speak(S.blocked, next.lastWinner === 0 ? 2 : next.lastWinner!, key)
        }
        setMessage(trickMessage(names[next.lastWinner!], next.lastWinner!))
        schedule(duration, () => {
          const currentLayout = layoutRef.current
          const winner = currentLayout.seats[next.lastWinner!]
          tween.start(next.lastTrick.map(p => ({ card: p.card, fromX: currentLayout.centers[p.seat].x, fromY: currentLayout.centers[p.seat].y,
            toX: winner.x - 35, toY: winner.y - 48 })), () => {
            setState(current => ({ ...current, lastTrick: [] }))
            if (next.phase === 'score' || next.phase === 'over') finishHand(next)
            else setBusy(false)
          })
        })
      } else schedule(duration / 2, () => setBusy(false))
    }
    const currentLayout = layoutRef.current
    const depth = old.hands[turn].findIndex(c => c.id === id)
    const origin = turn === 0 ? handCardPosition(currentLayout, depth, selected.includes(id) || old.received.includes(id)) :
      opponentCardOrigin(currentLayout, turn, depth, old.hands[turn].length, peek)
    tween.start([{ card, fromX: origin.x, fromY: origin.y, toX: currentLayout.centers[turn].x, toY: currentLayout.centers[turn].y }], reveal)
  }, [names, selected, peek, duration, tween.start, schedule, finishHand, speak])
  const playRef = useRef(commitPlay)
  playRef.current = commitPlay
  const tweenRef = useRef(tween)
  tweenRef.current = tween
  useEffect(() => {
    if (!measured) return
    setBusy(true)
    cardSfx('shuffle')
    const cards = live.current.hands[0]
    const currentLayout = heartsLayout(size.width, size.height, pocket, cards.length)
    tweenRef.current.start(cards.map((card, i) => ({ card, fromX: currentLayout.width / 2 - 35, fromY: currentLayout.centers[2].y,
      toX: handCardPosition(currentLayout, i).x, toY: currentLayout.hand.y,
      delay: i * [30, 20, 10][options.speed] })), () => { setBusy(false); cardSfx('deal') })
  }, [state.seed, state.hand, measured])
  useEffect(() => {
    if (hidden || dialog || busy || celebration !== null || state.phase !== 'play' || state.turn === 0) return
    schedule(duration, () => playRef.current(aiPlay(live.current).id))
  }, [state, hidden, dialog, busy, celebration, duration, schedule])

  function confirmPass() {
    if (!active || busy) return
    if (state.phase === 'received') {
      setState(acknowledge(state)); setSelected([]); setMessage(''); return
    }
    if (state.phase !== 'pass' || selected.length !== 3) return
    const next = passCards(state, [selected, ...state.hands.slice(1).map(aiPass)])
    setState(next); setSelected([]); setMessage(''); cardSfx('deal')
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
    const depth = hitHand(layout, state.hands[0], [...selected, ...state.received], x, y)
    if (depth < 0) return null
    const card = state.hands[0][depth]
    const point = handCardPosition(layout, depth, selected.includes(card.id) || state.received.includes(card.id))
    return { pile: 0, depth, x: point.x * scale + ox, y: point.y * scale + oy, card }
  }
  const lastTouch = useRef(false)
  const pointer = useCardPointer({ hitTest, disabled: !active || hidden || !!dialog || busy || celebration !== null,
    onTap: hit => { if (hit?.card) selectCard(hit.card.id, lastTouch.current) },
    onDoubleTap: hit => { if (hit.card) selectCard(hit.card.id, lastTouch.current) },
    onContext: hit => { if (hit?.card) setMessage(cardLabel(hit.card)) },
    onDrop: (source, _target, x, y) => {
      if (source.card && (y - oy) / scale < layout.hand.viewport.y && (x - ox) / scale > layout.width / 2 - 150 &&
        (x - ox) / scale < layout.width / 2 + 150) selectCard(source.card.id, false)
    }
  })

  useEffect(() => {
    const node = canvas.current
    const ctx = crisp.ctx.current
    if (!node || !ctx || hidden) return
    ctx.setTransform(node.width / size.width, 0, 0, node.height / size.height, 0, 0)
    ctx.fillStyle = '#008000'; ctx.fillRect(0, 0, size.width, size.height)
    ctx.translate(ox, oy); ctx.scale(scale, scale); ctx.imageSmoothingEnabled = false
    const tweenIds = tween.tweens.map(t => t.card.id)
    const cards = state.hands[0]
    ctx.save()
    if (pocket) {
      const viewport = layout.hand.viewport
      ctx.beginPath(); ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height); ctx.clip()
    }
    cards.forEach((card, i) => {
      if (pointer.drag?.source.card?.id === card.id || tweenIds.includes(card.id)) return
      const point = handCardPosition(layout, i, selected.includes(card.id) || state.received.includes(card.id))
      const x = Math.round(point.x)
      const y = Math.round(point.y)
      drawFace(ctx, card, x, y)
      if (i === cursor && active && keyboardCursor) drawFocus(ctx, x, y)
    })
    ctx.restore()
    for (let seat = 1; seat < 4; seat++) {
      const cards = state.hands[seat]
      if (!pocket) {
        ctx.save()
        const x = Math.round(seats[seat].x)
        const y = Math.round(seats[seat].y)
        ctx.translate(x, y)
        if (seat !== 2) ctx.rotate(seat === 1 ? Math.PI / 2 : -Math.PI / 2)
        cards.forEach((card, i) => {
          if (tweenIds.includes(card.id)) return
          const x = Math.round(opponentFanOffset(i, cards.length, peek))
          if (peek) drawFace(ctx, card, x, -48)
          else if (i === cards.length - 1) drawBack(ctx, back, x, -48, 0, remy)
          else drawBackSideStrip(ctx, back, x, -48, 5, remy)
        })
        ctx.restore()
      }
    }
    const displayed = state.lastTrick.length ? state.lastTrick : state.trick
    displayed.forEach(p => { if (!tweenIds.includes(p.card.id)) drawFace(ctx, p.card, Math.round(centers[p.seat].x), Math.round(centers[p.seat].y)) })
    tween.tweens.forEach(t => drawFace(ctx, t.card, t.x, t.y))
    if (pointer.drag?.source.card) drawFace(ctx, pointer.drag.source.card,
      (pointer.drag.source.x + pointer.drag.x - pointer.drag.originX - ox) / scale,
      (pointer.drag.source.y + pointer.drag.y - pointer.drag.originY - oy) / scale)
  }, [state, selected, cursor, keyboardCursor, active, hidden, size, back, remy, peek, pocket, scale, ox, oy, layout, revision, tween.tweens, pointer.drag])

  function newGame() {
    if (state.phase !== 'over' && (state.played.length || state.rows.length || state.phase === 'received')) setDialog('new')
    else reset()
  }
  function reset() {
    pending.current = null; tween.cancel(); setBusy(false); setCelebration(null); setDialog(null); setState(deal(seed())); setSelected([])
    setCursor(0); setKeyboardCursor(false); setMessage(''); balloonTrick.current = -999; setBalloon(null)
  }
  function skip() {
    pending.current = null; setTimerVersion(v => v + 1); setCelebration(null); stopSounds('hearts'); setDialog('score')
  }
  function closeScore() {
    if (state.phase === 'score') {
      setState(nextHand(state)); setSelected([]); setMessage(''); setCursor(0); setDialog(null)
    } else if (state.phase === 'over') {
      setDialog('ranking')
      void playJingle(winners(state.totals).includes(0) ? music.won : music.lost, 'hearts')
    } else setDialog(null)
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
  const phaseStatus = state.phase === 'pass' ? S.select : state.phase === 'received' ? S.received :
    state.phase === 'score' ? S.sheet : state.phase === 'over' ? S.ranking : state.turn === 0 ? S.turn : S.waiting
  const status = message ? `${phaseStatus} ${message}` : phaseStatus
  return <div className={`hearts-game${pocket ? ' hearts-pocket' : ''}`} onPointerDownCapture={event => {
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
    <GameMenuBar menus={menus} disabled={celebration !== null} />
    <div ref={surface} className='hearts-surface' tabIndex={0} role='application' aria-label={S.title}
      onPointerMove={pointer.onPointerMove} onPointerUp={pointer.onPointerUp} onPointerCancel={pointer.onPointerCancel}
      onLostPointerCapture={pointer.onLostPointerCapture} onContextMenu={pointer.onContextMenu} onPointerDown={event => {
        if ((event.target as HTMLElement).closest('button, input, select, textarea, a, label, [role="button"]')) return
        setKeyboardCursor(false)
        if (celebration !== null && active) { skip(); return }
        lastTouch.current = event.pointerType === 'touch'
        pointer.onPointerDown(event)
      }} onKeyDown={event => {
        if (!active || hidden || dialog || busy) return
        if (['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(event.key)) event.preventDefault()
        if (['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(event.key)) setKeyboardCursor(true)
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          const next = Math.max(0, Math.min(state.hands[0].length - 1, cursor + (event.key === 'ArrowLeft' ? -1 : 1)))
          setCursor(next); revealCard(next)
        }
        if (event.key === ' ' && state.hands[0][cursor]) selectCard(state.hands[0][cursor].id, false)
        if (event.key === 'Enter') confirmPass()
      }}>
      <canvas ref={canvas} aria-hidden='true' />
      <CardHoldFeedback hold={pointer.longPress} />
      {pocket && <div ref={handViewport} className='hearts-hand-viewport' style={{ left: layout.hand.viewport.x, top: layout.hand.viewport.y,
        width: layout.hand.viewport.width, height: layout.hand.viewport.height }}
        aria-label={S.handViewport} onScroll={event => setHandScroll(event.currentTarget.scrollLeft)}
        onPointerDown={event => {
          event.stopPropagation()
          handPress.current = { x: event.clientX, y: event.clientY, moved: false }
        }} onPointerMove={event => {
          event.stopPropagation()
          const press = handPress.current
          if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5) press.moved = true
        }} onPointerCancel={event => {
          event.stopPropagation()
          if (handPress.current) handPress.current.moved = true
        }} onPointerUp={event => event.stopPropagation()} onContextMenu={event => { event.stopPropagation(); event.preventDefault() }}>
        <div className='hearts-hand-content' style={{ width: layout.hand.contentWidth, height: layout.hand.viewport.height }}>
          {state.hands[0].map((card, depth) => {
            const raised = selected.includes(card.id) || state.received.includes(card.id)
            const target = handCardTarget(layout, depth, state.hands[0].length, raised)
            return <button key={card.id} className='hearts-card-target' tabIndex={-1} aria-label={cardLabel(card)}
              aria-pressed={raised} disabled={!active || hidden || !!dialog || busy || celebration !== null}
              style={{ left: target.x - layout.hand.viewport.x + layout.hand.scroll, top: target.y - layout.hand.viewport.y,
                width: target.width, height: target.height }} onClick={event => {
                event.stopPropagation()
                if (handPress.current?.moved) return
                handPress.current = null
                setKeyboardCursor(false); setCursor(depth); selectCard(card.id, true); surface.current?.focus({ preventScroll: true })
              }} />
          })}
        </div>
      </div>}
      {pocket && layout.hand.scroll > 0 && <div className='hearts-hand-edge hearts-hand-edge-left'
        style={{ left: layout.hand.viewport.x, top: layout.hand.viewport.y, height: layout.hand.viewport.height }} />}
      {pocket && layout.hand.scroll < layout.hand.contentWidth - layout.hand.viewport.width && <div className='hearts-hand-edge hearts-hand-edge-right'
        style={{ left: layout.hand.viewport.x + layout.hand.viewport.width - 12, top: layout.hand.viewport.y, height: layout.hand.viewport.height }} />}
      {pocket && <div className='hearts-hand-navigation' style={{ left: layout.score.x, top: layout.score.y, width: layout.score.width, height: layout.score.height }}
        onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
        <button aria-label={S.previousCards} disabled={layout.hand.scroll === 0} onClick={() => {
          const node = handViewport.current
          if (node) node.scrollLeft -= Math.floor(layout.hand.viewport.width / layout.hand.step) * layout.hand.step
        }}>‹</button>
        <span className='hearts-hand-caption'><span>{names[0]} · {state.totals[0]}</span>
          {layout.hand.contentWidth > layout.hand.viewport.width && <span>{S.panHand}</span>}</span>
        <button aria-label={S.nextCards} disabled={layout.hand.scroll >= layout.hand.contentWidth - layout.hand.viewport.width} onClick={() => {
          const node = handViewport.current
          if (node) node.scrollLeft += Math.floor(layout.hand.viewport.width / layout.hand.step) * layout.hand.step
        }}>›</button>
      </div>}
      <div className={`hearts-plates${pocket ? ' hearts-pocket-plates' : ''}${layout.wideShort ? ' hearts-wide-short-plates' : ''}`} style={{ left: ox, top: oy,
        width: layout.width, height: layout.height, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        {[1, 2, 3].map(seat => <div key={seat} className={`hearts-plate seat-${seat}`}
          style={{ left: layout.plates[seat].x, top: layout.plates[seat].y, width: layout.plates[seat].width, height: layout.plates[seat].height }}>
          {portraits[seat - 1] ? <img src={portraits[seat - 1]!.src} alt='' /> : <span className='hearts-portrait-placeholder' />}
          <span className='hearts-opponent-copy'><span className='hearts-opponent-name'>{names[seat]}</span>
            <span>{state.totals[seat]}{pocket ? ` · ${state.hands[seat].length} ${S.cards}` : ''}</span></span>
        </div>)}
        {!pocket && <span className='hearts-your-score' style={{ left: layout.score.x, top: layout.score.y, width: layout.score.width,
          height: layout.score.height }}>{names[0]} · {state.totals[0]}</span>}
        {balloon && <div className={`hearts-balloon balloon-${balloon.seat}`}>{balloon.text}</div>}
        {stamp !== 0 && <RuggedStamp key={stamp} pocket={pocket} hidden={hidden} label={S.rugged} />}
      </div>
      {layout.compactTrick && (state.lastTrick.length ? state.lastTrick : state.trick).map(play => <span key={play.seat}
        className='hearts-trick-seat' title={names[play.seat]}
        style={{ left: layout.centers[play.seat].x, top: layout.centers[play.seat].y + 97 }}>
        {trickSeatLabel(names[play.seat], play.seat)}
      </span>)}
      {(state.phase === 'pass' || state.phase === 'received') && <button className='hearts-pass'
        style={{ left: ox + layout.pass.x * scale, top: oy + layout.pass.y * scale, width: layout.pass.width * scale, height: layout.pass.height * scale }}
        disabled={busy || (state.phase === 'pass' && selected.length !== 3)}
        onClick={event => { event.stopPropagation(); confirmPass() }}>{state.phase === 'received' ? S.ok : S.pass[passDirection(state.hand)]}</button>}
      {celebration !== null && <div className='hearts-moon' style={{ left: ox, top: oy, width: layout.width, height: layout.height,
        transform: `scale(${scale})`, transformOrigin: '0 0', animationPlayState: hidden ? 'paused' : 'running' }}>
        <strong>{S.moon}</strong><span className='hearts-moon-disc' style={{ top: (pocket ? 84 : 112) - 20 }} />
        <div className='hearts-rocket' style={{ offsetPath: moonPath(layout, celebration), animationPlayState: hidden ? 'paused' : 'running' }}>
          <span className='rocket-nose' /><span className='rocket-card'>♥</span><span className='rocket-fins' />
          <span className='rocket-exhaust'>{FLAG_COLORS.map(color => <i key={color} style={{ background: color }} />)}</span>
        </div>
      </div>}
    </div>
    <div className='hearts-status' role='status' aria-live='polite'>{status}</div>
    {dialog === 'new' && <GameDialog title={S.title} onClose={() => setDialog(null)} buttons={[
      { label: S.yes, onClick: reset }, { label: S.no, onClick: () => setDialog(null), cancel: true }
    ]}>{S.confirm}</GameDialog>}
    {dialog === 'score' && <GameDialog title={S.sheet} width={560} onClose={closeScore} buttons={[
      { label: state.phase === 'score' ? S.next : S.ok, default: true, onClick: closeScore }
    ]}><div className='hearts-sheet'><table><thead><tr><th>{S.hand}</th>{names.map((name, i) => <th key={i}>{name}</th>)}</tr></thead>
      <tbody>{state.rows.map((row, i) => <Fragment key={i}><tr><th>{i + 1}{row.moon !== null ? ' ☾' : ''}</th>
        {row.points.map((point, seat) => <td key={seat}>{point} <small>({row.totals[seat]})</small></td>)}</tr>
        {row.moon === null && row.points[0] === 0 && <tr className='hearts-sheet-flavour'><td colSpan={5}>{names[2]}: {S.zero}</td></tr>}
      </Fragment>)}</tbody>
      <tfoot><tr><th>{S.total}</th>{state.totals.map((total, i) => <th key={i}>{total}</th>)}</tr></tfoot></table></div></GameDialog>}
    {dialog === 'ranking' && <GameDialog title={S.ranking} onClose={() => setDialog(null)} buttons={[
      { label: S.new.replace('&', ''), onClick: reset, default: true }, { label: S.ok, onClick: () => setDialog(null) }
    ]}><strong>{rankingMessage(state.totals, names)}</strong>
      <ol>{[0, 1, 2, 3].sort((a, b) => state.totals[a] - state.totals[b]).map(seat => <li key={seat}>{names[seat]}: {state.totals[seat]}</li>)}</ol>
    </GameDialog>}
    {pocket && peek && !dialog && <GameDialog title={S.peek} onClose={() => setPeek(false)} buttons={[
      { label: S.ok, onClick: () => setPeek(false), default: true }
    ]}><div className='hearts-peek-hands'>{[1, 2, 3].map(seat => <div key={seat}>
      <p>{names[seat]}</p><canvas width={71 + Math.max(0, state.hands[seat].length - 1) * 14} height={96} aria-label={state.hands[seat].map(cardLabel).join(', ')}
        ref={node => {
          const ctx = node?.getContext('2d')
          if (!ctx || !node) return
          ctx.clearRect(0, 0, node.width, node.height)
          state.hands[seat].forEach((card, depth) => drawFace(ctx, card, depth * 14, 0))
        }} />
    </div>)}</div></GameDialog>}
    {dialog === 'options' && <GameDialog className='hearts-options' title={S.options.replace('&', '').replace('…', '')} onClose={() => setDialog(null)} buttons={[
      { label: S.ok, default: true, onClick: () => {
        const next = { speed: draft.speed, names: draft.names.map((name, i) => name.trim().slice(0, 32) || S.defaults[i]) }
        setOptions(next); saveGame('hearts', next); setDialog(null)
        if (next.names.some(name => name.toLowerCase() === 'prof. gwei')) setMessage(S.nice)
      } }, { label: S.cancel, cancel: true, onClick: () => setDialog(null) }
    ]}><fieldset><legend>{S.speed}</legend>{S.speeds.map((speed, i) => <label key={speed}>
      <input type='radio' name='hearts-speed' checked={draft.speed === i} onChange={() => setDraft(v => ({ ...v, speed: i }))} />{speed}</label>)}</fieldset>
      <fieldset><legend>{S.players} ({S.standard})</legend>{draft.names.map((name, i) => <label key={i}>{S.seats[i]}
        <input value={name} maxLength={32} onChange={event => setDraft(v => ({ ...v, names: v.names.map((old, j) => i === j ? event.target.value : old) }))} />
      </label>)}</fieldset><label><input type='checkbox' checked={!muted} onChange={() => setMuted(!muted)} />{S.sound}</label>
    </GameDialog>}
    {dialog === 'deck' && <DeckDialog onClose={() => setDialog(null)} />}
    {dialog === 'help' && <CardHelp title={S.helpTitle} sections={S.sections} onClose={() => setDialog(null)} />}
    {dialog === 'about' && <AboutDialog game={S.title} icon={icon} version={S.version} flavour={S.flavour} lines={S.credits} onClose={() => setDialog(null)} />}
  </div>
}
