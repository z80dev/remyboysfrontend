import { useEffect, useRef, useState } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, BestScoresDialog, ChooseRemyDialog, GameDialog, GameHelpTabs, GameMenuBar, NameEntryDialog, loadGame, saveGame,
  loadPalette, loadRemyMeta, useGamesPlayer, useGamesMuted, useWindowFit, useWindowState, useCrispCanvas, useAnimationFrame,
  unlockAudio, tone, sweep, noise, playJingle, stopSounds, mulberry32,
} from '../kit'
import { createGame, moveMouse, step, nextLevel, selectSpeed, parseLevel, scoreTables, qualifiesScore, Event, type Score } from './engine'
import { DEFAULT_PALETTE, paintStatic, paintActors, paintHeader } from './art'
import { clearJingle } from './music/clear'
import { S } from './strings'
import { icon } from './icon'
import { beginSwipe, createHeldKeys, pressKey, releaseKey, clearHeldKeys, directionForKey, updateSwipe, repeatDirection } from './input'
import { fitBoard } from './layout'
import './style.css'

type Settings = {
  level: number
  speed: number
  scores: Score[]
}
const defaults: Settings = { level: 1, speed: 2, scores: [] }
function guard(value: unknown): value is Settings {
  if (!value || typeof value !== 'object') return false
  const v = value as Settings
  return Number.isInteger(v.level) && v.level >= 1 && v.level <= 50 && Number.isInteger(v.speed) && v.speed >= 0 && v.speed <= 4
    && Array.isArray(v.scores) && v.scores.length <= 20 && v.scores.every(s => s !== null && typeof s === 'object'
      && typeof s.name === 'string' && s.name === s.name.trim() && s.name.length > 0 && s.name.length <= 32
      && Number.isSafeInteger(s.score) && s.score >= 0 && Number.isSafeInteger(s.at) && s.at >= 0)
}
const pad = [7, 0, 1, 6, -1, 2, 5, 4, 3]
export default function Revenge({ param, close }: AppProps) {
  const [initialSettings] = useState(() => loadGame('remys-revenge', defaults, guard))
  const settings = useRef(initialSettings)
  const [initialGame] = useState(() => createGame(
    parseLevel(param, initialSettings.level), initialSettings.speed, crypto.getRandomValues(new Uint32Array(1))[0],
  ))
  const game = useRef(initialGame)
  const startingLevel = useRef(initialGame.level)
  const previousParam = useRef(param)
  const { active, hidden, pocket } = useWindowState()
  const fit = useWindowFit()
  const { player } = useGamesPlayer()
  const { muted, setMuted } = useGamesMuted()
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuOpenRef = useRef(false)
  const [dialog, setDialog] = useState('')
  const [tab, setTab] = useState(0)
  const [table, setTable] = useState(0)
  const [levelInput, setLevelInput] = useState(String(startingLevel.current))
  const [touch, setTouch] = useState(false)
  const [announcement, setAnnouncement] = useState(S.levelStart(game.current.level))
  const [flashMessage, setFlashMessage] = useState(announcement)
  const [flashing, setFlashing] = useState(true)
  const flashRemaining = useRef(1500)
  const [overLine, setOverLine] = useState('')
  const [controls, setControls] = useState(false)
  const [landscape, setLandscape] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const [, refresh] = useState(0)
  const surface = useRef<HTMLDivElement>(null)
  const palette = useRef(DEFAULT_PALETTE)
  const shades = useRef(false)
  const staticBoard = useRef<HTMLCanvasElement | null>(null)
  const dirty = useRef(true)
  const accumulator = useRef(0)
  const soundTimes = useRef(new Float64Array(8).fill(-Infinity))
  const [audioRandom] = useState(() => mulberry32(0x524556))
  const denialUsed = useRef(false)
  const scoreOffered = useRef(false)
  const drag = useRef({ id: -1, x: 0, y: 0, lastX: 0, lastY: 0, direction: -1, elapsed: 0, moved: false, repeating: false })
  const padHeld = useRef(-1)
  const [keyboard] = useState(createHeldKeys)
  const paint = useRef<() => void>(() => {})
  const board = useCrispCanvas(368, 368, { onResize: () => {
    dirty.current = true
    paint.current()
  } })
  const header = useCrispCanvas(400, 48, { onResize: () => paint.current() })
  function pause(value: boolean) {
    pausedRef.current = value
    padHeld.current = -1
    clearHeldKeys(keyboard)
    drag.current.direction = -1
    setPaused(value)
    paint.current()
  }
  function flash(message: string) {
    flashRemaining.current = 1500
    setFlashMessage(message)
    setFlashing(true)
    setAnnouncement(message)
  }
  function persist() { saveGame('remys-revenge', settings.current) }
  function start(level = startingLevel.current) {
    stopSounds('revenge')
    game.current = createGame(level, settings.current.speed, crypto.getRandomValues(new Uint32Array(1))[0])
    startingLevel.current = level
    scoreOffered.current = false
    dirty.current = true
    accumulator.current = 0
    setOverLine('')
    pause(false)
    setDialog('')
    flash(S.levelStart(level))
    refresh(n => n + 1)
    paint.current()
    surface.current?.focus()
  }
  paint.current = () => {
    const ctx = board.ctx.current
    const hctx = header.ctx.current
    const g = game.current
    if (ctx && staticBoard.current) {
      const back = staticBoard.current.getContext('2d')
      if (dirty.current && back) {
        paintStatic(back, g)
        dirty.current = false
      }
      ctx.drawImage(staticBoard.current, 0, 0, 368, 368)
      paintActors(ctx, g, palette.current, shades.current)
    }
    if (hctx) paintHeader(hctx, g, palette.current, shades.current, flashRemaining.current > 0 && !pausedRef.current)
  }
  function events(now: number) {
    const g = game.current
    const ev = g.events
    if (!ev) return
    g.events = 0
    if (ev & (Event.Push | Event.Cheese | Event.Trapped | Event.Respawn)) dirty.current = true
    if (ev & Event.Rug) flash(S.rugged)
    else if (ev & Event.Death) flash(S.deaths[g.death])
    else if (ev & Event.Trapped) flash(S.trapped)
    else if (ev & Event.Cheese) setAnnouncement(S.status(g.level, g.lives, g.score))
    const sound = ev & Event.Death ? 0 : ev & Event.Trapped ? 1 : ev & Event.Cheese ? 2 : ev & Event.Spawn ? 3
      : ev & Event.Push ? 4 : ev & Event.Move ? 5 : -1
    if (!muted && sound >= 0 && now - soundTimes.current[sound] >= 40) {
      soundTimes.current[sound] = now
      if (sound === 0) sweep(1800, 400, 0.35, { vol: 0.06, vibrato: 5, owner: 'revenge' })
      else if (sound === 1) {
        tone(1318.5, 0.09, { type: 'sine', vol: 0.05, owner: 'revenge' })
        tone(1975.5, 0.09, { type: 'sine', vol: 0.05, delay: 0.09, owner: 'revenge' })
      } else if (sound === 2) {
        noise(0.06, { vol: 0.035, freq: 1300, to: 400, owner: 'revenge' })
        noise(0.04, { vol: 0.025, freq: 900, to: 300, delay: 0.07, owner: 'revenge' })
      } else if (sound === 3) {
        sweep(400, 640, 0.15, { type: 'sine', fmRatio: 2, fmDepth: 60, vol: 0.045, owner: 'revenge' })
      } else if (sound === 4) noise(0.075, { vol: 0.035, freq: 700, owner: 'revenge' })
      else tone(1500 * (0.97 + audioRandom() * 0.06), 0.025, { type: 'sine', vol: 0.025, owner: 'revenge' })
    }
    if (ev & Event.Clear) {
      if (!(ev & Event.Trapped)) flash(S.clearFlavour)
      setAnnouncement(S.clearMessage(g.levelBonus, S.speeds[g.speed], g.speed + 1))
      if (!muted) void playJingle(clearJingle, 'revenge')
      refresh(n => n + 1)
    }
    if (g.phase === 'over' && !scoreOffered.current) {
      scoreOffered.current = true
      const line = denialUsed.current ? '' : S.denial
      setOverLine(line)
      setAnnouncement(line || S.gameOver)
      denialUsed.current = true
      if (qualifiesScore(settings.current.scores, g.score, Date.now())) setDialog('name')
      refresh(n => n + 1)
    }
  }
  function action(direction: number) {
    if (!active || hidden || dialog || pausedRef.current || menuOpenRef.current) return
    moveMouse(game.current, direction)
    events(performance.now())
    paint.current()
  }
  function continueLevel() {
    stopSounds('revenge')
    game.current = nextLevel(game.current)
    dirty.current = true
    accumulator.current = 0
    pause(false)
    flash(S.levelStart(game.current.level))
    refresh(n => n + 1)
    paint.current()
  }
  // Fit changes must not discard the static cache. Effect re-setup (including Fast Refresh) always starts dirty.
  useEffect(() => {
    staticBoard.current = document.createElement('canvas')
    staticBoard.current.width = 368
    staticBoard.current.height = 368
    dirty.current = true
    paint.current()
    surface.current?.focus()
    return () => {
      if (staticBoard.current) {
        staticBoard.current.width = 0
        staticBoard.current.height = 0
      }
      stopSounds('revenge')
      staticBoard.current = null
    }
  }, [])
  useEffect(() => { fit(400, controls ? 664 : 472) }, [fit, controls])
  const pendingSpeed = game.current.pendingSpeed !== game.current.speed
  useEffect(() => {
    const element = root.current
    if (!element) return
    const resize = () => {
      const showControls = touch || pocket
      setControls(showControls)
      const menuHeight = element.querySelector<HTMLElement>('.gk-menubar')?.getBoundingClientRect().height ?? 22
      const statusHeight = element.querySelector<HTMLElement>('.revenge-status')?.getBoundingClientRect().height ?? 0
      const layout = fitBoard(element.clientWidth, element.clientHeight, menuHeight, showControls, statusHeight)
      element.style.setProperty('--revenge-board', `${layout.board}px`)
      element.style.setProperty('--revenge-frame-padding', `${layout.padding}px`)
      setLandscape(layout.landscape)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    const status = element.querySelector<HTMLElement>('.revenge-status')
    if (status) observer.observe(status)
    window.addEventListener('resize', resize)
    resize()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [touch, pendingSpeed, pocket])
  useEffect(() => {
    if (previousParam.current === param) return
    previousParam.current = param
    const level = parseLevel(param, 0)
    if (level) start(level)
  }, [param])
  useEffect(() => {
    let alive = true
    palette.current = DEFAULT_PALETTE
    shades.current = false
    void loadPalette(player.remy).then(p => {
      if (alive) {
        palette.current = p
        paint.current()
      }
    }).catch(() => {})
    void loadRemyMeta(player.remy).then(m => {
      if (alive) {
        shades.current = m.shades
        paint.current()
      }
    }).catch(() => {})
    return () => { alive = false }
  }, [player.remy])
  useEffect(() => {
    if (!active || hidden) {
      pause(true)
      stopSounds('revenge')
    }
  }, [active, hidden])
  useEffect(() => {
    if (!active || hidden || dialog || menuOpen) return
    const id = requestAnimationFrame(() => surface.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [active, hidden, dialog, menuOpen])
  useAnimationFrame((dt, now) => {
    if (pausedRef.current || menuOpenRef.current || dialog) return
    if (flashRemaining.current > 0) {
      flashRemaining.current = Math.max(0, flashRemaining.current - dt * 1000)
      if (!flashRemaining.current) setFlashing(false)
    }
    accumulator.current += dt * 1000
    while (accumulator.current >= 1000 / 60) {
      accumulator.current -= 1000 / 60
      step(game.current, 1000 / 60)
      const input = repeatDirection(drag.current, padHeld.current >= 0 ? padHeld.current : keyboard.direction, 1000 / 60)
      if (input >= 0) moveMouse(game.current, input)
    }
    events(now)
    paint.current()
  }, { paused: paused || menuOpen || !!dialog || (!flashing && game.current.phase !== 'playing' && game.current.phase !== 'dead'), maxDt: 0.1 })
  const tables = scoreTables(settings.current.scores, Date.now())
  const rows = Array.from({ length: 10 }, (_, index) => {
    const entry = (table ? tables.recent : tables.overall)[index]
    return { label: S.rank(index + 1), score: entry?.score ?? null, name: entry?.name }
  })
  const closeDialog = () => setDialog('')
  const okButton = { label: S.ok, onClick: closeDialog, default: true, cancel: true }
  return <div ref={root} className={`revenge-app${landscape ? ' revenge-landscape' : ''}`}
    onPointerDown={() => unlockAudio()} onKeyDown={() => unlockAudio()}>
    <GameMenuBar onOpenChange={open => {
      menuOpenRef.current = open
      padHeld.current = -1
      clearHeldKeys(keyboard)
      drag.current.direction = -1
      accumulator.current = 0
      if (open) stopSounds('revenge')
      setMenuOpen(open)
    }} menus={[
      { label: S.game, items: [
        { label: S.new, hotkey: 'F2', onClick: () => start() },
        { label: S.pause, hotkey: 'F3', checked: paused, onClick: () => pause(!pausedRef.current) }, '-',
        { label: S.best, onClick: () => {
          pause(true)
          setDialog('scores')
        } }, '-', { label: S.exit, onClick: close },
      ] },
      { label: S.options, items: [
        { label: S.level, onClick: () => {
          pause(true)
          setLevelInput(String(startingLevel.current))
          setDialog('level')
        } },
        { label: S.speed, items: S.speeds.map((label, speed) => ({ label, radio: true, checked: settings.current.speed === speed,
          onClick: () => {
            settings.current.speed = speed
            selectSpeed(game.current, speed)
            persist()
            refresh(n => n + 1)
          } })) }, '-',
        { label: S.sound, checked: !muted, onClick: () => setMuted(!muted) },
        { label: S.choose, onClick: () => {
          pause(true)
          setDialog('choose')
        } },
      ] },
      { label: S.help, items: [{ label: S.contents, hotkey: 'F1', onClick: () => {
        pause(true)
        setDialog('help')
      } }, '-',
        { label: S.about, onClick: () => {
          pause(true)
          setDialog('about')
        } }] },
    ]} />
    <div ref={surface} className='revenge-surface' tabIndex={0} role='application' aria-label={S.title}
      onContextMenu={e => e.preventDefault()} onKeyDown={e => {
        if (!active || dialog || menuOpenRef.current || e.defaultPrevented || (e.key === 'Escape' && game.current.phase !== 'clear')) return
        if (game.current.phase === 'clear') {
          e.preventDefault()
          continueLevel()
          return
        }
        if (pausedRef.current && !['F1', 'F2', 'F3', 'Alt', 'F10', 'Tab'].includes(e.key)) {
          e.preventDefault()
          pause(false)
          return
        }
        const direction = e.repeat ? directionForKey(e.key) : pressKey(keyboard, e.key)
        if (direction !== undefined) {
          e.preventDefault()
          if (!e.repeat) {
            action(direction)
            drag.current.elapsed = 0
            drag.current.repeating = false
          }
        }
      }} onKeyUp={e => { releaseKey(keyboard, e.key) }} onBlur={() => {
        clearHeldKeys(keyboard)
        padHeld.current = -1
        drag.current.id = -1
        drag.current.direction = -1
      }}>
      <div className='revenge-header-wrap'>
        <canvas ref={header.ref} className='revenge-header' aria-hidden='true' />
        {flashing && !paused && <span className='revenge-flash' aria-hidden='true'>{flashMessage}</span>}
      </div>
      {pendingSpeed && <div className='revenge-status'>{S.speedPending(S.speeds[game.current.pendingSpeed])}</div>}
      <div className='revenge-playfield'>
        <div className='revenge-frame'>
          <canvas ref={board.ref} className='revenge-board' aria-label={`${S.board} ${S.intro}`}
            onPointerDown={e => {
              if (menuOpenRef.current || dialog || !active || hidden) return
              if (e.pointerType === 'touch') setTouch(true)
              if (pausedRef.current) {
                pause(false)
                return
              }
              if (game.current.phase === 'clear') {
                continueLevel()
                return
              }
              e.currentTarget.setPointerCapture(e.pointerId)
              beginSwipe(drag.current, e.pointerId, e.clientX, e.clientY)
            }} onPointerMove={e => {
              const direction = updateSwipe(drag.current, e.pointerId, e.clientX, e.clientY)
              if (direction >= 0) action(direction)
            }} onPointerUp={() => {
              drag.current.id = -1
              drag.current.direction = -1
            }} onPointerCancel={() => {
              drag.current.id = -1
              drag.current.direction = -1
            }} />
          {(paused || game.current.phase === 'clear' || game.current.phase === 'over') && <button className='revenge-overlay'
            onClick={() => game.current.phase === 'clear' ? continueLevel() : game.current.phase === 'over' ? start() : pause(false)}>
            <strong>{game.current.phase === 'clear' ? S.clear : game.current.phase === 'over' ? S.gameOver : S.paused}</strong>
            {game.current.phase === 'clear' && <>
              <span>{S.levelBonus(game.current.levelBonus, S.speeds[game.current.speed], game.current.speed + 1)}</span>
              <span>{S.clearFlavour}</span>
            </>}
            {game.current.phase === 'over' && <span>{overLine || S.deaths[game.current.death]}</span>}
            <span>{game.current.phase === 'clear' ? S.continueHint : game.current.phase === 'over' ? S.overHint : S.resumeHint}</span>
          </button>}
        </div>
        {controls && <div className='revenge-pad'>
          {pad.map((direction, i) => direction < 0 ? <span key={i} /> : <button key={i} aria-label={S.direction[direction]}
            onPointerDown={e => {
              if (menuOpenRef.current || dialog || !active || hidden) return
              e.preventDefault()
              unlockAudio()
              if (pausedRef.current) {
                pause(false)
                return
              }
              if (game.current.phase === 'clear') {
                continueLevel()
                return
              }
              e.currentTarget.setPointerCapture(e.pointerId)
              action(direction)
              padHeld.current = direction
              drag.current.elapsed = 0
              drag.current.repeating = false
            }} onPointerUp={() => { padHeld.current = -1 }} onPointerCancel={() => { padHeld.current = -1 }}>
            <svg viewBox='0 0 16 16' aria-hidden='true' shapeRendering='crispEdges'>
              <g transform={`rotate(${direction * 45} 8 8)`}>
                <path d='M7 2h2v1h1v1h1v1h1v1h1v2h-3V7H9v7H7V7H6v1H3V6h1V5h1V4h1V3h1z' fill='currentColor' />
              </g>
            </svg>
          </button>)}
        </div>}
      </div>
    </div>
    <div className='revenge-live' aria-live='polite'>{announcement}</div>
    {dialog === 'about' && <AboutDialog game={S.title} icon={icon} version={S.version} flavour={S.flavour}
      lines={S.aboutLines} onClose={closeDialog} />}
    {dialog === 'choose' && <ChooseRemyDialog onClose={closeDialog} />}
    {dialog === 'help' && <GameDialog title={S.helpTitle} onClose={closeDialog} width={Math.min(380, root.current?.clientWidth ?? 380)}
      className={`revenge-help${pocket ? ' revenge-help-pocket' : ''}`} buttons={[okButton]}>
      <GameHelpTabs tabs={S.tabs} selected={tab} onChange={setTab}><p>{S.helpText[tab]}</p></GameHelpTabs>
    </GameDialog>}
    {dialog === 'level' && <GameDialog title={S.levelTitle} onClose={closeDialog} buttons={[
      { label: S.ok, disabled: !/^(?:[1-9]|[1-4][0-9]|50)$/.test(levelInput), default: true,
        onClick: () => {
          settings.current.level = Number(levelInput)
          persist()
          start(Number(levelInput))
        } },
      { label: S.cancel, cancel: true, onClick: closeDialog },
    ]}><label>{S.levelLabel} <input type='number' min={1} max={50} value={levelInput}
      onChange={e => setLevelInput(e.target.value)} /></label></GameDialog>}
    {dialog === 'scores' && <BestScoresDialog title={S.scores} heading={table ? S.recent : S.overall} rows={rows} format={String}
      onClose={closeDialog} onReset={() => {
        settings.current.scores = []
        persist()
        refresh(n => n + 1)
      }}>
      <div className='revenge-score-tabs' role='group' aria-label={S.scores}>
        <button type='button' aria-pressed={table === 0}
          onClick={() => setTable(0)}>{S.overall}</button>
        <button type='button' aria-pressed={table === 1}
          onClick={() => setTable(1)}>{S.recent}</button>
      </div>
    </BestScoresDialog>}
    {dialog === 'name' && <NameEntryDialog title={S.scoreName} message={S.scoreMessage} onCancel={closeDialog}
      onSubmit={name => {
        const now = Date.now()
        const all = [...settings.current.scores, { name: name.trim().slice(0, 32), score: game.current.score, at: now }]
        const t = scoreTables(all, now)
        settings.current.scores = [...new Set([...t.overall, ...t.recent])]
        persist()
        setDialog('scores')
      }} />}
  </div>
}
