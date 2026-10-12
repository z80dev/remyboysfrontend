import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, BestScoresDialog, GameDialog, GameHelpTabs, GameMenuBar, NameEntryDialog, civRemy, loadCabald, loadGame, loadHeads,
  loadPalette, loadRemy, loadRemyMeta, mulberry32, saveGame, unlockAudio, useAnimationFrame, useCrispCanvas, useGamesMuted,
  useWindowFit, useWindowState, type GameMenu,
} from '../kit'
import { GameAudio } from './audio'
import { advance, createGame, nextLevel, startWall, CELL, HEIGHT, WIDTH, type Orientation } from './engine'
import { icon } from './icon'
import { longPressWall, moveCursor, newRunSeed, pointCursor, type Cursor } from './input'
import { fitField, STATUS_HEIGHT } from './layout'
import { createPainter, draw, type Painter } from './render'
import { addScore, defaults, isSettings, qualifies } from './scores'
import { strings as s } from './strings'
import './style.css'

type Modal = 'help' | 'about' | 'scores' | 'name' | 'complete' | null

/** The engine owns all game rules. React owns lifecycle, dialogs and shared-kit persistence; the renderer only reads.
 * No progress is saved: closing ends this run. F2 intentionally starts a fresh run with persisted options.
 */
export default function JezzBald({ close }: AppProps) {
  const [settings, setSettings] = useState(() => loadGame('jezzbald', defaults, isSettings))
  const pictures = useRef(settings.reveal)
  pictures.current = settings.reveal
  const [initial] = useState(() => createGame(1, newRunSeed(), settings.fast))
  const game = useRef(initial)
  const [round, setRound] = useState(0)
  const [, refresh] = useState(0)
  const [paused, setPaused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<Modal>(null)
  const [helpTab, setHelpTab] = useState(0)
  const [orientation, setOrientation] = useState<Orientation>('vertical')
  const [touch, setTouch] = useState(false)
  const [layout, setLayout] = useState(() => ({ ...fitField(WIDTH, HEIGHT + STATUS_HEIGHT, false), controls: false }))
  const [revealed, setRevealed] = useState(false)
  const [ring, setRing] = useState<{ x: number, y: number } | null>(null)
  const [announcement, announce] = useState(s.start)
  const [balloon, setBalloon] = useState(false)
  const balloonEnd = useRef(0)
  const surface = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const painter = useRef<Painter | null>(null)
  const [audio] = useState(() => new GameAudio())
  const [motion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)'))
  const cursor = useRef<Cursor>({ x: 18, y: 9, px: 18 * CELL + CELL / 2, py: 9 * CELL + CELL / 2, orientation: 'vertical', visible: true })
  const gesture = useRef({ primary: -1, secondary: -1, skip: false, x: 0, y: 0, startX: 0, startY: 0 })
  const pressTimer = useRef<number | undefined>(undefined)
  const fade = useRef(0)
  const reported = useRef({ seconds: 80, score: 0, lives: 2, phase: 'playing', balloon: false })
  const { active, hidden, pocket } = useWindowState()
  const { muted, toggleMuted } = useGamesMuted()
  const fit = useWindowFit()
  const canvas = useCrispCanvas(WIDTH, HEIGHT, { onResize: () => paint() })
  const g = game.current
  const blocked = paused || menuOpen || modal !== null || !active || hidden
  const interaction = useRef(blocked)
  interaction.current = blocked

  function paint() {
    if (canvas.ctx.current && painter.current) {
      draw(canvas.ctx.current, painter.current, game.current, cursor.current, pictures.current,
        Math.min(1, fade.current / 1200), !interaction.current)
    }
  }

  function cancelPress() {
    window.clearTimeout(pressTimer.current)
    pressTimer.current = undefined
    setRing(null)
  }

  function changeOrientation() {
    cursor.current.orientation = cursor.current.orientation === 'horizontal' ? 'vertical' : 'horizontal'
    setOrientation(cursor.current.orientation)
    paint()
  }

  function build() {
    if (blocked || game.current.phase !== 'playing') return
    if (startWall(game.current, cursor.current.x, cursor.current.y, cursor.current.orientation)) {
      audio.update(game.current)
      refresh((value) => value + 1)
      paint()
    }
  }

  function newGame() {
    audio.reset()
    cancelPress()
    game.current = createGame(1, newRunSeed(), settings.fast)
    fade.current = 0
    setRevealed(false)
    reported.current = { seconds: 80, score: 0, lives: 2, phase: 'playing', balloon: false }
    setBalloon(false)
    setPaused(false)
    setModal(null)
    setRound((value) => value + 1)
    announce(s.start)
  }

  function continueLevel() {
    audio.reset()
    game.current = nextLevel(game.current, settings.fast)
    fade.current = 0
    setRevealed(false)
    reported.current = { seconds: Math.ceil(game.current.remaining / 1000), score: game.current.score,
      lives: game.current.lives, phase: 'playing', balloon: false }
    setBalloon(false)
    setPaused(false)
    setModal(null)
    setRound((value) => value + 1)
    announce(s.levelAnnouncement(game.current.level))
  }

  function skipReveal() {
    if (game.current.phase !== 'complete' || modal) return false
    fade.current = 1200
    paint()
    setModal('complete')
    return true
  }

  function activate() {
    unlockAudio()
    surface.current?.focus({ preventScroll: true })
    if (paused && active && !hidden && !modal) {
      setPaused(false)
      return true
    }
    return skipReveal()
  }

  function point(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    pointCursor(cursor.current, e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height)
    paint()
  }

  useEffect(() => {
    fit(608, touch ? 460 : 400) // 24px menu + 320px field + 56px status; touch adds a 60px thumb-control band.
  }, [fit, touch])

  useLayoutEffect(() => {
    const client = body.current
    if (!client) return
    const measure = () => {
      const controls = touch || pocket
      const next = fitField(client.clientWidth, client.clientHeight, controls)
      setLayout((previous) => previous.width === next.width && previous.height === next.height &&
        previous.landscape === next.landscape && previous.controls === controls ? previous : { ...next, controls })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(client)
    return () => {
      observer.disconnect()
    }
  }, [touch, pocket])

  useEffect(() => {
    painter.current = createPainter()
    paint()
    return () => {
      audio.stop()
      window.clearTimeout(pressTimer.current)
      if (painter.current) {
        painter.current.field.width = painter.current.reveal.width = 0
        painter.current.art.portrait = null
        painter.current.art.heads = null
      }
      painter.current = null
    }
  }, [audio])

  useEffect(() => {
    let disposed = false
    const p = painter.current
    if (!p) return
    p.art = { portrait: null, bg: '#808080', heads: null, rects: [], idx: -1, epithet: '' }
    p.dirty = true
    p.revision = -1
    paint()
    const current = game.current
    const seed = current.seed ^ Math.imul(current.level, 4490)
    const rand = mulberry32(seed)
    // Distinct per-atom membership is established before any atlas rectangles enter the render loop.
    void Promise.all([loadHeads(), loadCabald()]).then(([heads, members]) => {
      if (disposed) return
      const roster = members.slice()
      const count = Math.min(current.atomCount, roster.length)
      const rects = []
      for (let i = 0; i < count; i++) {
        const j = i + Math.floor(rand() * (roster.length - i))
        const value = roster[j]
        roster[j] = roster[i]
        roster[i] = value
        rects.push(heads.rect(value))
      }
      p.art.heads = heads
      p.art.rects = rects
      paint()
    }).catch(() => {}) // The classic atom is the specified offline fallback.
    void civRemy((seed >>> 0) % 4490).then(async (idx) => {
      if (disposed) return
      p.art.idx = idx
      void loadRemyMeta(idx).then((meta) => {
        if (!disposed) {
          p.art.epithet = meta.epithet
          refresh((value) => value + 1)
        }
      }).catch(() => {})
      void loadPalette(idx).then((palette) => {
        if (!disposed) {
          p.art.bg = palette.bg
          p.dirty = true
          paint()
        }
      }).catch(() => {})
      const portrait = await loadRemy(idx, 600)
      if (!disposed) {
        p.art.portrait = portrait
        p.dirty = true
        paint()
      }
    }).catch(() => {}) // Never guess a civilian identity when the canonical catalogue is offline.
    return () => { disposed = true }
  }, [round])

  useEffect(() => {
    if (!active || hidden) {
      setPaused(true)
      cancelPress()
      audio.stop()
    }
  }, [active, hidden])

  useEffect(() => {
    if (!active || hidden || modal || menuOpen) return
    // Title-bar activation finishes the shell's focus work first; one owned frame then restores the game cursor.
    const id = window.requestAnimationFrame(() => surface.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(id)
  }, [active, hidden, modal, menuOpen])

  useEffect(() => {
    // Terminal jingles may finish over their tally/name dialogs, but never over a pause, blur or hidden window.
    if (paused || menuOpen || !active || hidden || muted || (modal !== null && game.current.phase === 'playing')) audio.stop()
    if (blocked) {
      gesture.current.primary = gesture.current.secondary = -1
      gesture.current.skip = true
      cancelPress()
    }
  }, [blocked, muted, audio, paused, menuOpen, active, hidden, modal])

  useEffect(() => {
    if (painter.current) painter.current.dirty = true
    paint()
  }, [settings.reveal, orientation, modal, paused, menuOpen, touch, active, hidden])

  useAnimationFrame((dt) => {
    const current = game.current
    if (reported.current.phase === 'playing') {
      advance(current, dt * 1000)
      audio.update(current)
      if (balloon && current.elapsed >= balloonEnd.current) setBalloon(false)
      const r = reported.current
      const seconds = Math.ceil(current.remaining / 1000)
      if (seconds !== r.seconds || current.score !== r.score || current.lives !== r.lives || current.phase !== r.phase) {
        if (current.lives !== r.lives) {
          announce(s.lostAnnouncement(current.lives))
          if (!r.balloon) {
            r.balloon = true
            balloonEnd.current = current.elapsed + 2500
            setBalloon(true)
          }
        } else if (current.score !== r.score) announce(s.scoreAnnouncement(current.area, current.score))
        r.seconds = seconds
        r.score = current.score
        r.lives = current.lives
        r.phase = current.phase
        refresh((value) => value + 1)
        if (current.phase === 'complete') announce(s.levelComplete)
        if (current.phase === 'over') {
          announce(s.over)
          if (qualifies(settings.scores, current.score)) setModal('name')
        }
      }
    } else if (current.phase === 'complete') {
      fade.current = Math.min(1200, fade.current + dt * 1000 * (motion.matches ? 2 : 1))
      if (fade.current >= 1200) {
        setRevealed(true)
        announce(s.tallyPrompt)
      }
    }
    paint()
  }, { paused: blocked || g.phase === 'over' || revealed })

  const menus: GameMenu[] = [
    { label: s.game, items: [
      { label: s.newGame, hotkey: 'F2', onClick: newGame },
      { label: s.pause, hotkey: 'F3', checked: paused, disabled: g.phase === 'over', onClick: () => setPaused((value) => !value) },
      '-', { label: s.scores, onClick: () => setModal('scores') }, '-', { label: s.exit, onClick: close },
    ] },
    { label: s.options, items: [
      { label: s.sound, checked: !muted, onClick: () => { toggleMuted() } },
      { label: s.fast, checked: settings.fast, onClick: () => {
        const fast = !settings.fast
        announce(s.fastPending(fast))
        const next = { ...settings, fast }
        saveGame('jezzbald', next)
        setSettings(next)
      } },
      { label: s.reveal, checked: settings.reveal, onClick: () => {
        const next = { ...settings, reveal: !settings.reveal }
        saveGame('jezzbald', next)
        setSettings(next)
      } },
    ] },
    { label: s.help, items: [{ label: s.contents, hotkey: 'F1', onClick: () => setModal('help') }, '-',
      { label: s.about, onClick: () => setModal('about') }] },
  ]

  return <div className={`jezzbald${layout.controls ? ' jezzbald-touch' : ''}${layout.landscape ? ' jezzbald-landscape' : ''}`}
    onPointerDownCapture={(e) => {
      setTouch(e.pointerType === 'touch')
      if (e.pointerType === 'touch') {
        cursor.current.visible = false
        paint()
      }
    }}>
    <GameMenuBar menus={menus} onOpenChange={setMenuOpen} />
    <div className="jezzbald-body" ref={body} style={layout.landscape
      ? { gridTemplateColumns: `minmax(0, 1fr) ${layout.width}px minmax(0, 1fr)` }
      : { gridTemplateRows: `${layout.height}px ${STATUS_HEIGHT}px minmax(0, 1fr)` }}>
      <div className={`jezzbald-surface${blocked || g.phase !== 'playing' || touch ? ' jezzbald-native-cursor' : ''}`}
        style={{ width: layout.width, height: layout.height }} ref={surface} tabIndex={0} role="application" aria-label={s.title}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (!active || hidden || modal || menuOpen || e.altKey || e.ctrlKey || e.metaKey) return
          unlockAudio()
          if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3' || (e.key === 'Escape' && game.current.phase !== 'complete')) return
          if (paused || game.current.phase === 'complete') {
            e.preventDefault()
            if (paused) setPaused(false)
            else skipReveal()
            return
          }
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'r', 'R', 'Tab'].includes(e.key)) return
          e.preventDefault()
          setTouch(false)
          cursor.current.visible = true
          if (e.key === 'r' || e.key === 'R' || e.key === 'Tab') changeOrientation()
          else if (e.key === ' ') build()
          else {
            if (e.key === 'ArrowLeft') moveCursor(cursor.current, -1, 0)
            if (e.key === 'ArrowRight') moveCursor(cursor.current, 1, 0)
            if (e.key === 'ArrowUp') moveCursor(cursor.current, 0, -1)
            if (e.key === 'ArrowDown') moveCursor(cursor.current, 0, 1)
            paint()
          }
        }}
        onPointerMove={(e) => {
          if (e.pointerType !== 'touch') {
            cursor.current.visible = true
            setTouch(false)
            point(e)
            return
          }
          if (e.pointerId === gesture.current.primary && Math.hypot(e.clientX - gesture.current.startX, e.clientY - gesture.current.startY) > 10) {
            gesture.current.skip = true
            cancelPress()
          }
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'touch') return
          cursor.current.visible = false
          paint()
        }}
        onPointerDown={(e) => {
          e.preventDefault()
          if (!active || hidden || modal || menuOpen) return
          cursor.current.visible = e.pointerType !== 'touch'
          const resumed = activate()
          point(e)
          if (resumed) return
          if (e.pointerType !== 'touch') {
            if (e.button === 2) changeOrientation()
            else if (e.button === 0) build()
            return
          }
          e.currentTarget.setPointerCapture(e.pointerId)
          const state = gesture.current
          if (state.primary !== -1) {
            state.secondary = e.pointerId
            state.skip = true
            cancelPress()
            changeOrientation()
            return
          }
          state.primary = e.pointerId
          state.secondary = -1
          state.skip = false
          state.x = cursor.current.x
          state.y = cursor.current.y
          state.startX = e.clientX
          state.startY = e.clientY
          const rect = e.currentTarget.getBoundingClientRect()
          setRing({ x: (e.clientX - rect.left) / rect.width * 100, y: (e.clientY - rect.top) / rect.height * 100 })
          pressTimer.current = window.setTimeout(() => {
            pressTimer.current = undefined
            state.skip = true
            setRing(null)
            if (interaction.current) return
            cursor.current.x = state.x
            cursor.current.y = state.y
            if (longPressWall(game.current, cursor.current)) {
              navigator.vibrate?.(10)
              setOrientation(cursor.current.orientation)
              audio.update(game.current)
              refresh((value) => value + 1)
              paint()
            }
          }, 450)
        }}
        onPointerUp={(e) => {
          if (e.pointerType !== 'touch') return
          const state = gesture.current
          if (e.pointerId === state.primary) {
            cancelPress()
            if (!state.skip && state.secondary === -1) {
              cursor.current.x = state.x
              cursor.current.y = state.y
              build()
            }
            state.primary = -1
          }
          if (e.pointerId === state.secondary) state.secondary = -1
        }}
        onPointerCancel={() => {
          gesture.current.primary = gesture.current.secondary = -1
          gesture.current.skip = true
          cancelPress()
        }}
        onLostPointerCapture={(e) => {
          if (e.pointerId !== gesture.current.primary && e.pointerId !== gesture.current.secondary) return
          gesture.current.primary = gesture.current.secondary = -1
          gesture.current.skip = true
          cancelPress()
        }}>
        <canvas ref={canvas.ref} />
        {ring && <span className="jezzbald-ring" style={{ left: `${ring.x}%`, top: `${ring.y}%` }} />}
        {paused && <div className="jezzbald-overlay"><strong>{s.paused}</strong><span>{layout.controls ? s.resumeTouch : s.resume}</span></div>}
        {!paused && g.phase === 'over' && <div className="jezzbald-overlay"><strong>{s.over}</strong><span>{s.overMessage}</span>
          <button type="button" className="btn" onClick={newGame}>{s.newGame.replace('&', '')}</button></div>}
        {!paused && g.phase === 'complete' && <div className="jezzbald-caption">
          {painter.current && painter.current.art.idx >= 0 ? s.caption(g.level, painter.current.art.idx, painter.current.art.epithet) : s.levelComplete}
          {revealed && <small>{layout.controls ? s.tallyTouch : s.tallyPrompt}</small>}
        </div>}
        {balloon && !paused && g.phase === 'playing' && <button type="button" className="jezzbald-balloon"
          onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} onClick={() => setBalloon(false)}>{s.lifeLost}</button>}
      </div>
      <div className="jezzbald-status">
        <span>{s.level}: {g.level} · {s.lives}: {g.lives}</span>
        <span>{s.area}: {g.area}%</span>
        <span>{s.score}: {s.number(g.score)} · {s.time}: {Math.ceil(g.remaining / 1000)}</span>
        <small className="jezzbald-start-hint">{settings.fast !== g.fast ? s.fastPending(settings.fast)
          : g.phase === 'playing' && g.starts === 0 ? s.start : ''}</small>
      </div>
      <div className="jezzbald-controls">
        <button type="button" className="btn" aria-label={s.orientation} onClick={() => {
          if (activate()) return
          changeOrientation()
        }}>
          {orientation === 'horizontal' ? s.horizontal : s.vertical}
        </button>
        <button type="button" className="btn" onClick={() => { if (!activate()) build() }}>{s.build}</button>
        <button type="button" className="btn" onClick={() => setPaused((value) => !value)}>{paused ? s.resumeButton : s.pause.replace('&', '')}</button>
      </div>
    </div>
    <div className="jezzbald-live" aria-live="polite">{announcement}</div>
    {modal === 'help' && <GameDialog title={s.helpTitle} onClose={() => setModal(null)} width={440} className="jezzbald-help">
      <GameHelpTabs tabs={s.tabs} selected={helpTab} onChange={setHelpTab}><p>{s.helpText[helpTab]}</p></GameHelpTabs>
    </GameDialog>}
    {modal === 'about' && <AboutDialog game={s.title} icon={icon} version={s.version} flavour={s.flavour} lines={s.aboutLines}
      onClose={() => setModal(null)} />}
    {modal === 'scores' && <BestScoresDialog title={s.scoreTitle} format={s.number}
      rows={Array.from({ length: 10 }, (_, index) => ({ label: s.rank(index + 1), score: settings.scores[index]?.score ?? null,
        name: settings.scores[index]?.name }))}
      onReset={() => {
        const next = { ...settings, scores: [] }
        saveGame('jezzbald', next)
        setSettings(next)
      }}
      onClose={() => setModal(null)} />}
    {modal === 'name' && <NameEntryDialog title={s.nameTitle} message={s.entry(g.score)}
      onSubmit={(name) => {
        const next = { ...settings, scores: addScore(settings.scores, game.current.score, name) }
        saveGame('jezzbald', next)
        setSettings(next)
        setModal('scores')
      }} onCancel={() => setModal(null)} />}
    {modal === 'complete' && <GameDialog title={s.levelComplete} onClose={continueLevel} width={330}
      buttons={[{ label: s.next, onClick: continueLevel, default: true }]}>
      <dl className="jezzbald-tally">
        <dt>{s.areaBonus}</dt><dd>{s.number(g.tally.area)}</dd><dt>{s.livesBonus}</dt><dd>{s.number(g.tally.lives)}</dd>
        <dt>{s.timeBonus}</dt><dd>{s.number(g.tally.time)}</dd><dt>{s.total}</dt><dd>{s.number(g.tally.total)}</dd>
      </dl>
    </GameDialog>}
  </div>
}
