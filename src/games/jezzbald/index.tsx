import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, BestScoresDialog, GameDialog, GameMenuBar, NameEntryDialog, civRemy, loadCabald, loadGame, loadHeads,
  loadPalette, loadRemy, loadRemyMeta, mulberry32, saveGame, unlockAudio, useAnimationFrame, useCrispCanvas, useGamesMuted,
  useWindowFit, useWindowState, type GameMenu,
} from '../kit'
import { GameAudio } from './audio'
import { advance, createGame, nextLevel, startWall, CELL, COLS, HEIGHT, ROWS, WIDTH, type Orientation } from './engine'
import { icon } from './icon'
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
  const [initial] = useState(() => createGame(1, 1992, settings.fast))
  const game = useRef(initial)
  const [round, setRound] = useState(0)
  const [, refresh] = useState(0)
  const [paused, setPaused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<Modal>(null)
  const [helpTab, setHelpTab] = useState(0)
  const [orientation, setOrientation] = useState<Orientation>('vertical')
  const [touch, setTouch] = useState(false)
  const [ring, setRing] = useState<{ x: number; y: number } | null>(null)
  const [announcement, announce] = useState(s.start)
  const [balloon, setBalloon] = useState(false)
  const surface = useRef<HTMLDivElement>(null)
  const painter = useRef<Painter | null>(null)
  const [audio] = useState(() => new GameAudio())
  const [motion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)'))
  const cursor = useRef({ x: 18, y: 9, orientation: 'vertical' as Orientation })
  const gesture = useRef({ primary: -1, secondary: -1, skip: false, x: 0, y: 0, startX: 0, startY: 0 })
  const pressTimer = useRef<number | undefined>(undefined)
  const fade = useRef(0)
  const reported = useRef({ seconds: 80, score: 0, lives: 2, phase: 'playing', balloon: false })
  const { active, hidden } = useWindowState()
  const { muted, toggleMuted } = useGamesMuted()
  const fit = useWindowFit()
  const canvas = useCrispCanvas(WIDTH, HEIGHT, { onResize: () => paint() })
  const g = game.current
  const blocked = paused || menuOpen || modal !== null || !active || hidden

  function paint() {
    if (canvas.ctx.current && painter.current) {
      draw(canvas.ctx.current, painter.current, game.current, cursor.current.x, cursor.current.y, cursor.current.orientation,
        pictures.current, Math.min(1, fade.current / 1200))
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
    game.current = createGame(1, 1992, settings.fast)
    fade.current = 0
    reported.current = { seconds: 80, score: 0, lives: 2, phase: 'playing', balloon: false }
    setBalloon(false)
    setPaused(false)
    setModal(null)
    setRound((value) => value + 1)
    announce(s.start)
  }

  function continueLevel() {
    audio.reset()
    game.current = nextLevel(game.current)
    fade.current = 0
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
    cursor.current.x = Math.max(0, Math.min(COLS - 1, Math.floor((e.clientX - rect.left) * WIDTH / rect.width / CELL)))
    cursor.current.y = Math.max(0, Math.min(ROWS - 1, Math.floor((e.clientY - rect.top) * HEIGHT / rect.height / CELL)))
    paint()
  }

  useEffect(() => {
    fit(608, 400) // 24px kit menu + the specified 376px field/status client.
  }, [fit])

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
    } else if (!modal && !menuOpen) surface.current?.focus({ preventScroll: true })
  }, [active, hidden])

  useEffect(() => {
    if (blocked || muted) audio.stop()
    if (blocked) {
      gesture.current.primary = gesture.current.secondary = -1
      gesture.current.skip = true
      cancelPress()
    }
  }, [blocked, muted, audio])

  useEffect(() => {
    if (painter.current) painter.current.dirty = true
    paint()
    if (!modal && !menuOpen && active) surface.current?.focus({ preventScroll: true })
  }, [settings.reveal, orientation, modal, paused, menuOpen])

  useAnimationFrame((dt) => {
    const current = game.current
    if (current.phase === 'playing') {
      advance(current, dt * 1000)
      audio.update(current)
      const r = reported.current
      const seconds = Math.ceil(current.remaining / 1000)
      if (seconds !== r.seconds || current.score !== r.score || current.lives !== r.lives || current.phase !== r.phase) {
        if (current.lives !== r.lives) {
          announce(s.lostAnnouncement(current.lives))
          if (!r.balloon) {
            r.balloon = true
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
      if (fade.current >= 1200) setModal('complete')
    }
    paint()
  }, { paused: blocked || g.phase === 'over' })

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
        const ratio = fast ? 1.5 : 1 / 1.5
        for (let i = 0; i < game.current.atomCount; i++) {
          game.current.vx[i] *= ratio
          game.current.vy[i] *= ratio
        }
        game.current.fast = fast
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

  return <div className={`jezzbald${touch ? ' jezzbald-touch' : ''}`}>
    <GameMenuBar menus={menus} onOpenChange={setMenuOpen} />
    <div className="jezzbald-surface" ref={surface} tabIndex={0} role="application" aria-label={s.title}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (!active || hidden || modal || menuOpen || e.altKey || e.ctrlKey || e.metaKey) return
        unlockAudio()
        if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3') return
        if (paused || game.current.phase === 'complete') {
          e.preventDefault()
          if (paused) setPaused(false)
          else skipReveal()
          return
        }
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'r', 'R', 'Tab'].includes(e.key)) return
        e.preventDefault()
        if (e.key === 'r' || e.key === 'R' || e.key === 'Tab') changeOrientation()
        else if (e.key === ' ') build()
        else {
          if (e.key === 'ArrowLeft') cursor.current.x = Math.max(0, cursor.current.x - 1)
          if (e.key === 'ArrowRight') cursor.current.x = Math.min(COLS - 1, cursor.current.x + 1)
          if (e.key === 'ArrowUp') cursor.current.y = Math.max(0, cursor.current.y - 1)
          if (e.key === 'ArrowDown') cursor.current.y = Math.min(ROWS - 1, cursor.current.y + 1)
          paint()
        }
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'touch') {
          point(e)
          return
        }
        if (e.pointerId === gesture.current.primary && Math.hypot(e.clientX - gesture.current.startX, e.clientY - gesture.current.startY) > 10) {
          gesture.current.skip = true
          cancelPress()
        }
      }}
      onPointerDown={(e) => {
        e.preventDefault()
        if (!active || hidden || modal || menuOpen) return
        const resumed = activate()
        point(e)
        if (resumed) return
        if (e.pointerType !== 'touch') {
          setTouch(false)
          if (e.button === 2) changeOrientation()
          else if (e.button === 0) build()
          return
        }
        setTouch(true)
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
          navigator.vibrate?.(10)
          cursor.current.x = state.x
          cursor.current.y = state.y
          changeOrientation()
          build()
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
      {paused && <div className="jezzbald-overlay"><strong>{s.paused}</strong><span>{s.resume}</span></div>}
      {!paused && g.phase === 'over' && <div className="jezzbald-overlay"><strong>{s.over}</strong><span>{s.overMessage}</span>
        <button type="button" className="btn" onClick={newGame}>{s.newGame.replace('&', '')}</button></div>}
      {!paused && g.phase === 'playing' && g.starts === 0 && <div className="jezzbald-caption">{s.start}</div>}
      {!paused && g.phase === 'complete' && painter.current && painter.current.art.idx >= 0 &&
        <div className="jezzbald-caption">{s.caption(g.level, painter.current.art.idx, painter.current.art.epithet)}</div>}
      {balloon && g.phase === 'playing' && <button type="button" className="jezzbald-balloon"
        onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} onClick={() => setBalloon(false)}>{s.lifeLost}</button>}
    </div>
    <div className="jezzbald-status">
      <span>{s.level}: {g.level} · {s.lives}: {g.lives}</span>
      <span>{s.area}: {g.area}%</span>
      <span>{s.score}: {g.score} · {s.time}: {Math.ceil(g.remaining / 1000)}</span>
    </div>
    <div className="jezzbald-controls">
      <button type="button" className="btn" aria-label={s.orientation} onClick={() => {
        unlockAudio()
        changeOrientation()
      }}>
        {orientation === 'horizontal' ? s.horizontal : s.vertical}
      </button>
      <button type="button" className="btn" onClick={() => { if (!activate()) build() }}>{s.build}</button>
      <button type="button" className="btn" onClick={() => setPaused((value) => !value)}>{s.pause.replace('&', '')}</button>
    </div>
    <div className="jezzbald-live" aria-live="polite">{announcement}</div>
    {modal === 'help' && <GameDialog title={s.helpTitle} onClose={() => setModal(null)} width={440}>
      <div className="jezzbald-help-tabs" role="tablist">{s.tabs.map((label, index) => <button key={label} type="button" role="tab"
        aria-selected={helpTab === index} id={`jezzbald-tab-${index}`} aria-controls="jezzbald-help-panel" onClick={() => setHelpTab(index)}>{label}</button>)}</div>
      <p id="jezzbald-help-panel" role="tabpanel" aria-labelledby={`jezzbald-tab-${helpTab}`}>{s.helpText[helpTab]}</p>
    </GameDialog>}
    {modal === 'about' && <AboutDialog game={s.title} icon={icon} version={s.version} flavour={s.flavour} lines={s.aboutLines}
      onClose={() => setModal(null)} />}
    {modal === 'scores' && <BestScoresDialog title={s.scoreTitle}
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
        <dt>{s.areaBonus}</dt><dd>{g.tally.area}</dd><dt>{s.livesBonus}</dt><dd>{g.tally.lives}</dd>
        <dt>{s.timeBonus}</dt><dd>{g.tally.time}</dd><dt>{s.total}</dt><dd>{g.tally.total}</dd>
      </dl>
    </GameDialog>}
  </div>
}
