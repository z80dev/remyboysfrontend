import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, BestScoresDialog, CAST, ChooseRemyDialog, GameDialog, GameMenuBar, NameEntryDialog,
  cabaldRemy, loadGame, loadHeads, loadPalette, saveGame, unlockAudio, useAnimationFrame, useCrispCanvas, useGamesMuted,
  useGamesPlayer, useWindowState, type BestScoreRow, type GameMenu,
} from '../kit'
import { command, createGame, FIXED_DT, steer, stepGame } from './engine'
import { skiFreeIcon } from './icon'
import { disposeSprites, renderSlope } from './render'
import { createSkiAudio, type SkiAudio } from './sound'
import { STRINGS } from './strings'
import type { Course, GameEvent, SkiArt, SkiCommand, SkiState } from './types'
import './skifree.css'

type RecordKey = 'slalom' | 'tree' | 'freestyle' | 'distance'
type BestRecord = { score: number; name: string }
type SavedGame = { version: 1; snowboard: boolean; best: Record<RecordKey, BestRecord | null> }
type Dialog = 'new' | 'scores' | 'player' | 'help' | 'about' | 'name' | null
type Terminal = 'course' | 'over' | null
type Viewport = { width: number; height: number; scale: number; pocket: boolean }
type Candidate = { key: RecordKey; score: number }

const RECORD_KEYS: RecordKey[] = ['slalom', 'tree', 'freestyle', 'distance']
const COURSES: Course[] = ['free', 'slalom', 'tree', 'freestyle']
const emptyBest = (): SavedGame['best'] => ({ slalom: null, tree: null, freestyle: null, distance: null })
const defaultSave = (): SavedGame => ({ version: 1, snowboard: false, best: emptyBest() })

function menuCaption(label: string): string {
  return label.replace(/&&|&/g, (mark) => mark === '&&' ? '&' : '')
}

function isSavedGame(value: unknown): value is SavedGame {
  if (!value || typeof value !== 'object') return false
  const saved = value as Record<string, unknown>
  if (saved.version !== 1 || typeof saved.snowboard !== 'boolean' || !saved.best || typeof saved.best !== 'object') return false
  const best = saved.best as Record<string, unknown>
  return RECORD_KEYS.every((key) => {
    const record = best[key]
    if (record === null) return true
    if (!record || typeof record !== 'object') return false
    const entry = record as Record<string, unknown>
    return typeof entry.score === 'number' && Number.isFinite(entry.score) && entry.score >= 0 &&
      typeof entry.name === 'string' && entry.name.length <= 32 && entry.name.trim().length > 0 && entry.name === entry.name.trim()
  })
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds * 100))
  const hours = Math.floor(total / 360000)
  const minutes = Math.floor(total / 6000) % 60
  const secs = Math.floor(total / 100) % 60
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(total % 100).padStart(2, '0')}`
}

function formatRecord(key: RecordKey, score: number): string {
  if (key === 'slalom' || key === 'tree') return formatTime(score)
  if (key === 'distance') return `${Math.floor(score)}${STRINGS.ui.distanceUnit}`
  return `${Math.round(score)} ${STRINGS.ui.styleUnit}`
}

function keyboardCommand(event: KeyboardEvent): SkiCommand | null {
  switch (event.code) {
    case 'Numpad4': return 'left'
    case 'Numpad6': return 'right'
    case 'Numpad2': return 'down'
    case 'Numpad8': return 'up'
    case 'Numpad1': return 'diagonal-left'
    case 'Numpad3': return 'diagonal-right'
    case 'Numpad7': return 'horizontal-left'
    case 'Numpad9': return 'horizontal-right'
    case 'Numpad0': return 'jump'
  }
  switch (event.key) {
    case 'ArrowLeft': return 'left'
    case 'ArrowRight': return 'right'
    case 'ArrowDown': return 'down'
    case 'ArrowUp': return 'up'
    case 'Insert': return 'jump'
    case 'f':
    case 'F': return 'fast'
    default: return null
  }
}

export default function SkiFree({ close }: AppProps) {
  const { active, hidden } = useWindowState()
  const { muted, toggleMuted } = useGamesMuted()
  const { player } = useGamesPlayer()
  const [saved, setSaved] = useState(() => loadGame('skifree', defaultSave(), isSavedGame))
  const [paused, setPaused] = useState(() => !active || hidden || !document.hasFocus())
  const [dialog, setDialog] = useState<Dialog>(null)
  const [terminal, setTerminal] = useState<Terminal>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [fast, setFast] = useState(false)
  const [touch, setTouch] = useState(false)
  const [courseChoice, setCourseChoice] = useState<Course>('free')
  const [helpTab, setHelpTab] = useState(0)
  const [announcement, setAnnouncement] = useState({ text: STRINGS.startLine, serial: 0 })
  const [viewport, setViewport] = useState<Viewport>({ width: 640, height: 448, scale: 1, pocket: false })
  const surfaceRef = useRef<HTMLDivElement>(null)
  const helpRefs = useRef<(HTMLButtonElement | null)[]>([])
  const helpId = useId()
  const gameRef = useRef<SkiState | null>(null)
  if (!gameRef.current) gameRef.current = createGame((Math.random() * 0x100000000) >>> 0)
  const savedRef = useRef(saved)
  const viewportRef = useRef(viewport)
  const playerRef = useRef(player)
  const candidatesRef = useRef<Candidate[]>([])
  const accumulator = useRef(0)
  const mounted = useRef(true)
  const audioRef = useRef<SkiAudio | null>(null)
  const artRef = useRef<SkiArt>({ heads: null, remy: player.remy, cabald: -1, shirt: '#ff0000', snowboard: saved.snowboard })
  const paintRef = useRef<() => void>(() => {})
  const flow = useRef({ active, hidden, muted, paused, dialog, terminal, menuOpen, blurred: !document.hasFocus() })
  const pointer = useRef({ id: -1, x: 0, y: 0, dragged: false })
  const canvas = useCrispCanvas(viewport.width, viewport.height, { smoothing: false, onResize: () => paintRef.current() })

  savedRef.current = saved
  viewportRef.current = viewport
  playerRef.current = player
  Object.assign(flow.current, { active, hidden, muted, paused, dialog, terminal, menuOpen })
  artRef.current.snowboard = saved.snowboard

  const paint = useCallback(() => {
    const ctx = canvas.ctx.current
    const state = gameRef.current
    if (!ctx || !state || !mounted.current || flow.current.hidden) return
    const view = viewportRef.current
    renderSlope(ctx, state, view.width, view.height, artRef.current)
  }, [canvas.ctx])
  paintRef.current = paint

  const running = useCallback(() => {
    const current = flow.current
    return mounted.current && current.active && !current.hidden && !current.blurred && !current.paused &&
      !current.dialog && !current.terminal && !current.menuOpen && !gameRef.current?.gameOver
  }, [])

  const syncAudio = useCallback(() => {
    const live = running() && !flow.current.muted
    audioRef.current?.update(live ? gameRef.current?.speed ?? 0 : 0, live)
  }, [running])

  const announce = useCallback((text: string) => {
    setAnnouncement((previous) => ({ text, serial: previous.serial + 1 }))
  }, [])

  const persist = useCallback((next: SavedGame) => {
    savedRef.current = next
    saveGame('skifree', next)
    setSaved(next)
  }, [])

  const showDialog = useCallback((next: Dialog) => {
    flow.current.dialog = next
    accumulator.current = 0
    setDialog(next)
    syncAudio()
  }, [syncAudio])

  const setPause = useCallback((next: boolean) => {
    flow.current.paused = next
    accumulator.current = 0
    setPaused(next)
    syncAudio()
  }, [syncAudio])

  const pauseGame = useCallback(() => {
    if (gameRef.current?.gameOver || flow.current.terminal) return
    const next = !flow.current.paused
    if (!next && (!flow.current.active || flow.current.hidden || flow.current.blurred)) return
    setPause(next)
    announce(next ? STRINGS.announcements.pause : STRINGS.announcements.resume)
    if (!next) surfaceRef.current?.focus({ preventScroll: true })
  }, [announce, setPause])

  const finish = useCallback((result: Exclude<Terminal, null>) => {
    const state = gameRef.current
    if (!state) return
    flow.current.terminal = result
    accumulator.current = 0
    setTerminal(result)
    const candidates: Candidate[] = []
    const best = { ...savedRef.current.best }
    const name = playerRef.current.name.trim().slice(0, 32)
    if (result === 'course' && state.course !== 'free') {
      const key = state.course
      const score = key === 'freestyle' ? Math.max(0, state.style) : state.courseTime + state.penalties
      const old = best[key]
      if (Number.isFinite(score) && score >= 0 && (!old || (key === 'freestyle' ? score > old.score : score < old.score))) {
        best[key] = { score, name }
        candidates.push({ key, score })
      }
    }
    if (state.distance > 0 && (!best.distance || state.distance > best.distance.score)) {
      best.distance = { score: state.distance, name }
      candidates.push({ key: 'distance', score: state.distance })
    }
    candidatesRef.current = candidates
    if (candidates.length) {
      persist({ ...savedRef.current, best })
      showDialog('name')
    }
    syncAudio()
  }, [persist, showDialog, syncAudio])

  const consumeEvents = useCallback(() => {
    const state = gameRef.current
    if (!state) return
    let notice: string | undefined
    for (let i = 0; i < state.events.length; i++) {
      const event: GameEvent = state.events[i]
      const current = flow.current
      if (current.active && !current.hidden && !current.blurred && !current.muted) audioRef.current?.event(event)
      switch (event) {
        case 'course-start': notice = `${STRINGS.announcements.courseStart} ${STRINGS.courseNames[state.course]}`; break
        case 'course-finish':
          notice = `${STRINGS.announcements.courseFinish} ${STRINGS.courseNames[state.course]}`
          finish('course')
          break
        case 'game-over': notice = STRINGS.announcements.gameOver; finish('over'); break
        case 'gate-pass': notice = STRINGS.announcements.gatePass; break
        case 'gate-miss': notice = STRINGS.announcements.gateMiss; break
        case 'crash': notice = STRINGS.announcements.crash; break
        case 'jump': notice = STRINGS.announcements.jump; break
        case 'trick': notice = STRINGS.announcements.trick; break
        case 'roar': notice = STRINGS.announcements.monster; break
        case 'fast':
          setFast(state.fast)
          notice = state.fast ? STRINGS.announcements.fastOn : STRINGS.announcements.fastOff
          break
      }
    }
    state.events.length = 0
    if (notice) announce(notice)
  }, [announce, finish])

  const applyCommand = useCallback((action: SkiCommand) => {
    if (!running() || !gameRef.current) return
    command(gameRef.current, action)
    consumeEvents()
    syncAudio()
    paint()
  }, [consumeEvents, paint, running, syncAudio])

  const advanceFrame = useCallback(() => {
    const current = flow.current
    if (!current.active || current.hidden || current.blurred || !current.paused || current.dialog || current.menuOpen || current.terminal || !gameRef.current) return
    accumulator.current = 0
    stepGame(gameRef.current, FIXED_DT)
    consumeEvents()
    syncAudio()
    paint()
  }, [consumeEvents, paint, syncAudio])

  const openNewGame = useCallback(() => {
    setCourseChoice(gameRef.current?.course ?? 'free')
    showDialog('new')
  }, [showDialog])

  const startGame = useCallback(() => {
    gameRef.current = createGame((Math.random() * 0x100000000) >>> 0, courseChoice)
    candidatesRef.current = []
    pointer.current.id = -1
    accumulator.current = 0
    flow.current.terminal = null
    setTerminal(null)
    setFast(false)
    setPause(!flow.current.active || flow.current.hidden || flow.current.blurred)
    showDialog(null)
    announce(`${STRINGS.announcements.newGame} ${STRINGS.courseNames[courseChoice]}`)
    paint()
    surfaceRef.current?.focus({ preventScroll: true })
  }, [announce, courseChoice, paint, setPause, showDialog])

  const continueSkiing = useCallback(() => {
    if (!flow.current.active || flow.current.hidden || flow.current.blurred || gameRef.current?.gameOver) return
    flow.current.terminal = null
    setTerminal(null)
    setPause(false)
    announce(STRINGS.announcements.resume)
    surfaceRef.current?.focus({ preventScroll: true })
  }, [announce, setPause])

  const submitName = useCallback((name: string) => {
    const best = { ...savedRef.current.best }
    for (const candidate of candidatesRef.current) {
      const record = best[candidate.key]
      if (record?.score === candidate.score) best[candidate.key] = { score: candidate.score, name: name.trim().slice(0, 32) }
    }
    persist({ ...savedRef.current, best })
    candidatesRef.current = []
    showDialog(null)
  }, [persist, showDialog])

  const changeMenu = useCallback((open: boolean) => {
    if (!mounted.current) return
    flow.current.menuOpen = open
    setMenuOpen(open)
    accumulator.current = 0
    if (open) syncAudio()
  }, [syncAudio])

  const inputRef = useRef({ applyCommand, advanceFrame, pauseGame, setPause, announce })
  inputRef.current = { applyCommand, advanceFrame, pauseGame, setPause, announce }

  useEffect(() => {
    mounted.current = true
    audioRef.current = createSkiAudio()
    const element = canvas.ref.current
    return () => {
      mounted.current = false
      accumulator.current = 0
      pointer.current.id = -1
      audioRef.current?.dispose()
      audioRef.current = null
      artRef.current.heads = null
      disposeSprites()
      if (element) {
        element.width = 0
        element.height = 0
      }
    }
  }, [canvas.ref])

  useLayoutEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return
    const pocketQuery = window.matchMedia('(max-width: 719px)')
    const fit = () => {
      const box = surface.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) return
      const pocket = pocketQuery.matches
      const scale = pocket ? (box.width >= 480 ? 3 : 2) : 1
      const width = Math.max(1, Math.floor(box.width / scale))
      const height = Math.max(1, Math.floor(box.height / scale))
      setViewport((old) => old.width === width && old.height === height && old.scale === scale && old.pocket === pocket
        ? old : { width, height, scale, pocket })
    }
    const observer = new ResizeObserver(fit)
    observer.observe(surface)
    pocketQuery.addEventListener('change', fit)
    fit()
    return () => {
      observer.disconnect()
      pocketQuery.removeEventListener('change', fit)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadHeads().then((heads) => {
      if (cancelled) return
      artRef.current.heads = heads
      paint()
    }).catch(() => {})
    cabaldRemy(CAST.RUG_LORD).then((cabald) => {
      if (cancelled) return
      artRef.current.cabald = cabald
      paint()
    }).catch(() => {})
    return () => { cancelled = true }
  }, [paint])

  useEffect(() => {
    let cancelled = false
    artRef.current.remy = player.remy
    artRef.current.shirt = '#ff0000'
    paint()
    loadPalette(player.remy).then((palette) => {
      if (cancelled) return
      artRef.current.shirt = palette.shirt
      paint()
    }).catch(() => {})
    return () => { cancelled = true }
  }, [paint, player.remy])

  useLayoutEffect(() => {
    if (!active || hidden) {
      pointer.current.id = -1
      if (!flow.current.paused) announce(STRINGS.announcements.pause)
      setPause(true)
    }
    paint()
    syncAudio()
  }, [active, hidden, announce, paint, setPause, syncAudio])

  useLayoutEffect(() => { paint() }, [paint, viewport.width, viewport.height, saved.snowboard])

  useEffect(() => {
    syncAudio()
  }, [active, hidden, muted, paused, dialog, terminal, menuOpen, syncAudio])

  useEffect(() => {
    if (active && !hidden && !dialog && !menuOpen && !flow.current.blurred) surfaceRef.current?.focus({ preventScroll: true })
  }, [active, hidden, dialog, menuOpen])

  useEffect(() => {
    const blur = () => {
      flow.current.blurred = true
      pointer.current.id = -1
      inputRef.current.setPause(true)
      inputRef.current.announce(STRINGS.announcements.pause)
    }
    const focus = () => {
      flow.current.blurred = false
      if (flow.current.active && !flow.current.hidden && !flow.current.dialog && !flow.current.menuOpen) surfaceRef.current?.focus({ preventScroll: true })
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const current = flow.current
      if (!current.active || current.hidden || current.blurred || current.dialog || current.menuOpen || event.defaultPrevented || event.isComposing ||
        event.altKey || event.ctrlKey || event.metaKey || !surfaceRef.current?.contains(document.activeElement)) return
      if (event.key.toLowerCase() === 't' && current.paused) {
        event.preventDefault()
        if (!event.repeat) inputRef.current.advanceFrame()
        return
      }
      if (current.paused && event.target === surfaceRef.current && !event.repeat &&
        event.key !== 'Tab' && event.key !== 'Shift' && event.key !== 'CapsLock' && event.key !== 'NumLock' && event.key !== 'ScrollLock') {
        event.preventDefault()
        inputRef.current.pauseGame()
        return
      }
      const action = keyboardCommand(event)
      if (!action) return
      event.preventDefault()
      if (current.paused || current.terminal || (event.repeat && (action === 'fast' || action === 'jump'))) return
      inputRef.current.applyCommand(action)
    }
    window.addEventListener('blur', blur)
    window.addEventListener('focus', focus)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('blur', blur)
      window.removeEventListener('focus', focus)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useAnimationFrame((dt) => {
    if (!running() || !gameRef.current) {
      accumulator.current = 0
      syncAudio()
      return
    }
    accumulator.current += dt
    while (accumulator.current >= FIXED_DT) {
      accumulator.current -= FIXED_DT
      stepGame(gameRef.current, FIXED_DT)
      consumeEvents()
      syncAudio()
      if (!running()) {
        accumulator.current = 0
        break
      }
    }
    paint()
  }, { paused: paused || !!dialog || !!terminal || menuOpen, maxDt: 0.1 })

  const pointSkier = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!running() || !gameRef.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const view = viewportRef.current
    const x = (event.clientX - rect.left) * view.width / rect.width
    const y = (event.clientY - rect.top) * view.height / rect.height
    steer(gameRef.current, x - Math.floor(view.width / 2), y - Math.floor(view.height / 3))
    consumeEvents()
    syncAudio()
    paint()
  }

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    surfaceRef.current?.focus({ preventScroll: true })
    if (flow.current.paused && flow.current.active && !flow.current.hidden && !flow.current.blurred && !flow.current.dialog && !flow.current.menuOpen && !flow.current.terminal) {
      event.preventDefault()
      pauseGame()
      return
    }
    if (!running() || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      if (pointer.current.id !== -1) return
      pointer.current.id = event.pointerId
      pointer.current.x = event.clientX
      pointer.current.y = event.clientY
      pointer.current.dragged = false
      event.currentTarget.setPointerCapture(event.pointerId)
    } else {
      pointSkier(event)
      applyCommand('jump')
    }
  }

  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse') {
      pointSkier(event)
      return
    }
    const current = pointer.current
    if (current.id !== event.pointerId) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    if (dx * dx + dy * dy >= 64) current.dragged = true
    if (current.dragged) pointSkier(event)
  }

  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = pointer.current
    if (current.id !== event.pointerId) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    const jump = !current.dragged && dx * dx + dy * dy < 64
    current.id = -1
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (jump) applyCommand('jump')
  }

  const menus: GameMenu[] = [
    { label: STRINGS.ui.gameMenu, items: [
      { label: STRINGS.ui.newGame, hotkey: STRINGS.ui.newGameKey, onClick: openNewGame },
      { label: STRINGS.ui.pause, hotkey: STRINGS.ui.pauseKey, checked: paused, disabled: !!terminal, onClick: pauseGame },
      '-',
      { label: STRINGS.ui.bestScores, onClick: () => showDialog('scores') },
      '-',
      { label: STRINGS.ui.exit, onClick: close },
    ] },
    { label: STRINGS.ui.optionsMenu, items: [
      { label: STRINGS.ui.sound, checked: !muted, onClick: () => { toggleMuted() } },
      { label: STRINGS.ui.chooseRemy, onClick: () => showDialog('player') },
      { label: STRINGS.ui.snowboarder, checked: saved.snowboard, onClick: () => persist({ ...savedRef.current, snowboard: !savedRef.current.snowboard }) },
    ] },
    { label: STRINGS.ui.helpMenu, items: [
      { label: STRINGS.ui.contents, hotkey: STRINGS.ui.helpKey, onClick: () => showDialog('help') },
      '-',
      { label: STRINGS.ui.about, onClick: () => showDialog('about') },
    ] },
  ]
  const rows: BestScoreRow[] = RECORD_KEYS.map((key) => ({ label: STRINGS.scoreNames[key], score: saved.best[key]?.score ?? null, name: saved.best[key]?.name }))
  const state = gameRef.current
  const showControls = touch || viewport.pocket
  const showPause = !dialog && !terminal && paused
  const nameMessage = `${STRINGS.ui.nameMessage} ${candidatesRef.current.map((candidate) => `${STRINGS.scoreNames[candidate.key]}: ${formatRecord(candidate.key, candidate.score)}`).join('; ')}`

  return (
    <div
      className={`skifree${showControls ? ' skifree-touch' : ''}`}
      onPointerDownCapture={(event) => {
        unlockAudio()
        setTouch(event.pointerType === 'touch')
      }}
      onKeyDownCapture={() => {
        unlockAudio()
        setTouch(false)
      }}
    >
      <GameMenuBar menus={menus} disabled={!!dialog} onOpenChange={changeMenu} />
      <div ref={surfaceRef} className="skifree-surface" role="application" aria-label={STRINGS.ui.slopeAria} tabIndex={0} onContextMenu={(event) => event.preventDefault()}>
        <canvas
          ref={canvas.ref}
          className="skifree-canvas"
          aria-hidden="true"
          style={{ width: viewport.width * viewport.scale, height: viewport.height * viewport.scale }}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={() => { pointer.current.id = -1 }}
          onLostPointerCapture={() => { pointer.current.id = -1 }}
        />
        {showControls && !terminal && (
          <div className="skifree-controls" role="group" aria-label={STRINGS.ui.controlsAria}>
            <button className="btn skifree-pause-control" type="button" disabled={!!dialog || !active || hidden} onClick={pauseGame} aria-label={paused ? STRINGS.ui.resume : STRINGS.ui.pauseButton}>
              {paused ? STRINGS.ui.resume : STRINGS.ui.pauseButton}
            </button>
            <button className="btn skifree-jump-control" type="button" disabled={paused || !!dialog || !active || hidden} onClick={() => applyCommand('jump')}>
              {STRINGS.ui.jump}
            </button>
            <button className="btn skifree-fast-control" type="button" disabled={paused || !!dialog || !active || hidden} aria-label={STRINGS.ui.fastButton} aria-pressed={fast} onClick={() => applyCommand('fast')}>
              {STRINGS.ui.fast}
            </button>
          </div>
        )}
        {showPause && (
          <section className="skifree-panel" aria-label={STRINGS.paused}>
            <h2>{STRINGS.announcements.pause}</h2>
            <p>{STRINGS.ui.pausedHint}</p>
            <div className="skifree-panel-buttons">
              <button className="btn default" type="button" onClick={pauseGame} disabled={!active || hidden}>{STRINGS.ui.resume}</button>
              <button className="btn" type="button" onClick={openNewGame}>{menuCaption(STRINGS.ui.newGame)}</button>
            </div>
            <p className="skifree-frame-hint">{STRINGS.ui.frameStep}</p>
          </section>
        )}
        {!dialog && terminal && state && (
          <section className="skifree-panel" aria-label={terminal === 'course' ? STRINGS.ui.courseComplete : STRINGS.gameOver}>
            <h2>{terminal === 'course' ? STRINGS.ui.courseComplete : STRINGS.gameOver}</h2>
            {terminal === 'course' && <p>{STRINGS.ui.courseResult(STRINGS.courseNames[state.course], formatRecord(state.course === 'freestyle' ? 'freestyle' : 'slalom', state.course === 'freestyle' ? Math.max(0, state.style) : state.courseTime + state.penalties))}</p>}
            {terminal === 'course' && state.course !== 'freestyle' && state.penalties > 0 && <p>{STRINGS.ui.penaltyNote(state.penalties)}</p>}
            <p>{STRINGS.scoreNames.distance}: {formatRecord('distance', state.distance)}</p>
            <div className="skifree-panel-buttons">
              {terminal === 'course' && <button className="btn default" type="button" onClick={continueSkiing}>{STRINGS.ui.continueSkiing}</button>}
              <button className={`btn${terminal === 'over' ? ' default' : ''}`} type="button" onClick={openNewGame}>{menuCaption(STRINGS.ui.newGame)}</button>
              <button className="btn" type="button" onClick={() => showDialog('scores')}>{menuCaption(STRINGS.ui.bestScores)}</button>
            </div>
          </section>
        )}
      </div>
      <div className="skifree-announcement" role="status" aria-live="polite" aria-atomic="true"><span key={announcement.serial}>{announcement.text}</span></div>
      {dialog === 'new' && (
        <GameDialog title={STRINGS.ui.newGameTitle} onClose={() => showDialog(null)} width={360} buttons={[
          { label: STRINGS.ui.start, default: true, onClick: startGame },
          { label: STRINGS.ui.cancel, cancel: true, onClick: () => showDialog(null) },
        ]}>
          <p>{STRINGS.startLine}</p>
          <fieldset className="skifree-course-chooser">
            <legend>{STRINGS.ui.coursePrompt}</legend>
            {COURSES.map((course) => (
              <label key={course}>
                <input type="radio" name="skifree-course" value={course} checked={courseChoice === course} onChange={() => setCourseChoice(course)} />
                {STRINGS.courseNames[course]}
              </label>
            ))}
          </fieldset>
          <p>{STRINGS.ui.newGameHint}</p>
        </GameDialog>
      )}
      {dialog === 'scores' && (
        <BestScoresDialog
          title={STRINGS.ui.bestTitle}
          heading={STRINGS.ui.bestHeading}
          rows={rows}
          format={(score, row) => formatRecord(RECORD_KEYS.find((key) => STRINGS.scoreNames[key] === row.label) ?? 'distance', score)}
          onReset={() => persist({ ...savedRef.current, best: emptyBest() })}
          onClose={() => showDialog(null)}
        />
      )}
      {dialog === 'name' && <NameEntryDialog title={STRINGS.ui.nameTitle} message={nameMessage} defaultName={player.name} maxLength={32} onSubmit={submitName} />}
      {dialog === 'player' && <ChooseRemyDialog onClose={() => showDialog(null)} />}
      {dialog === 'about' && <AboutDialog game={STRINGS.title} icon={skiFreeIcon} version={STRINGS.version} flavour={STRINGS.flavour} lines={[...STRINGS.aboutLines]} onClose={() => showDialog(null)} />}
      {dialog === 'help' && (
        <GameDialog title={STRINGS.helpTitle} onClose={() => showDialog(null)} width={480} buttons={[{ label: STRINGS.ui.ok, default: true, cancel: true, onClick: () => showDialog(null) }]}>
          <div className="skifree-help-tabs" role="tablist" aria-label={STRINGS.ui.helpTabsAria}>
            {STRINGS.help.map((section, index) => (
              <button
                key={section.title}
                ref={(element) => { helpRefs.current[index] = element }}
                className={`btn${helpTab === index ? ' skifree-selected-tab' : ''}`}
                type="button"
                role="tab"
                id={`${helpId}-tab-${index}`}
                aria-selected={helpTab === index}
                aria-controls={`${helpId}-panel`}
                tabIndex={helpTab === index ? 0 : -1}
                onClick={() => setHelpTab(index)}
                onKeyDown={(event) => {
                  let next = index
                  if (event.key === 'ArrowRight') next = (index + 1) % STRINGS.help.length
                  else if (event.key === 'ArrowLeft') next = (index + STRINGS.help.length - 1) % STRINGS.help.length
                  else if (event.key === 'Home') next = 0
                  else if (event.key === 'End') next = STRINGS.help.length - 1
                  else return
                  event.preventDefault()
                  setHelpTab(next)
                  helpRefs.current[next]?.focus()
                }}
              >{section.title}</button>
            ))}
          </div>
          <div className="skifree-help-panel" role="tabpanel" id={`${helpId}-panel`} aria-labelledby={`${helpId}-tab-${helpTab}`} tabIndex={0}>
            {STRINGS.help[helpTab].text}
          </div>
        </GameDialog>
      )}
    </div>
  )
}
