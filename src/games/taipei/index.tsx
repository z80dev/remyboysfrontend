import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, BestScoresDialog, GameDialog, GameHelpTabs, GameMenuBar, NameEntryDialog, cabaldRemy, civRemy, loadGame, loadRemy,
  mulberry32, saveGame, unlockAudio, useAnimationFrame, useCrispCanvas, useGamesMuted, useWindowFit, useWindowState
} from '../kit'
import type { GameMenu } from '../kit'
import { createSounds } from './audio'
import { LAYOUT_IDS, availablePairs, backup, clockRuns, clockSeconds, createDeal, freeTiles, nearestFree, noMoves, parseGameNumber, remaining, selectTile, startGame } from './engine'
import type { LayoutId, Pair } from './engine'
import { icon } from './icon'
import { defaults, isPreferences } from './preferences'
import type { Preferences } from './preferences'
import { HEIGHT, WIDTH, boardGeometry, clampView, createTileAtlas, drawBoard, hitTile } from './render'
import type { Portraits, View } from './render'
import { faceLabel, strings } from './strings'
import type { HelpTab } from './strings'
import './taipei.css'

type Dialog = 'help' | 'about' | 'best' | 'select' | 'no-moves' | 'win' | 'name' | null
type Gesture = { id: number; x: number; y: number; base: View; tile: number | null; moved: boolean; peek: boolean; touch: boolean; right: boolean; doubleTap: boolean }
const initialView: View = { zoom: 1, panX: 0, panY: 0 }
const civilianSeeds = [16, 9, 13, 54, 29, 35, 2005, 46, 2084, 2069, 420, 777, 42]
const cabaldSeeds = [67, 1010, 57, 2086]
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

export default function Taipei({ param, close }: AppProps) {
  const [prefs, setPrefs] = useState(() => loadGame<Preferences>('taipei', defaults, isPreferences))
  const [game, setGame] = useState(() => startGame(createDeal(parseGameNumber(param) ?? Date.now() % 99999 + 1, prefs.layout, prefs.solvable)))
  const [elapsed, setElapsed] = useState(0)
  const [clockRevision, setClockRevision] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [helpTab, setHelpTab] = useState<HelpTab>('Rules')
  const [numberText, setNumberText] = useState('')
  const [numberError, setNumberError] = useState(false)
  const [hint, setHint] = useState<Pair | null>(null)
  const [hintAnimating, setHintAnimating] = useState(false)
  const [hintInverted, setHintInverted] = useState(false)
  const [focus, setFocus] = useState<number | null>(null)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const [clockStarted, setClockStarted] = useState(false)
  const [peek, setPeek] = useState<number | null>(null)
  const [view, setView] = useState<View>(initialView)
  const [viewport, setViewport] = useState({ height: HEIGHT, padding: 8 })
  const [art, setArt] = useState<Portraits>({})
  const [announcement, setAnnouncement] = useState(strings.start)
  const [celebrating, setCelebrating] = useState(false)
  const [record, setRecord] = useState(false)
  const [hold, setHold] = useState<{ x: number; y: number } | null>(null)
  const { active, hidden, pocket } = useWindowState()
  const { muted, toggleMuted } = useGamesMuted()
  const fit = useWindowFit()
  const surface = useRef<HTMLDivElement>(null)
  const sounds = useMemo(createSounds, [])
  const geometry = useMemo(() => boardGeometry(game.deal.positions, viewport.height, viewport.padding), [game.deal.positions, viewport])
  const gesture = useRef<Gesture | null>(null)
  const holdTimer = useRef<number | undefined>(undefined)
  const hintElapsed = useRef(0)
  const lastTap = useRef({ time: -Infinity, x: 0, y: 0 })
  const hintIndex = useRef(0)
  const clock = useRef({ milliseconds: 0, since: null as number | null, revision: 0 })
  const previousParam = useRef(param)
  const matchStreak = useRef({ time: -Infinity, count: 0 })
  const celebrationTime = useRef(0)
  const particles = useMemo(() => new Float32Array(144 * 6), [])
  const fireworksAtlas = useRef<HTMLCanvasElement | null>(null)
  const redraw = useRef(() => {})
  const reducedMotion = useRef(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const canvas = useCrispCanvas(WIDTH, viewport.height, { smoothing: true, minScale: 2, onResize: () => redraw.current() })
  const count = remaining(game)

  useLayoutEffect(() => {
    const element = surface.current
    if (!element) return
    const measure = () => {
      const { width, height } = element.getBoundingClientRect()
      if (width <= 0 || height <= 0) return
      const next = { height: Math.max(1, Math.round(height * WIDTH / width)), padding: 8 * WIDTH / width }
      setViewport((previous) => previous.height === next.height && previous.padding === next.padding ? previous : next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => { setView((current) => clampView(geometry, current)) }, [geometry])
  useEffect(() => {
    if (hint === null) { setHintAnimating(false); setHintInverted(false) }
  }, [hint])

  function clearGesture() {
    window.clearTimeout(holdTimer.current)
    holdTimer.current = undefined
    gesture.current = null
    setHold(null)
    setPeek(null)
  }
  function newDeal(number = Date.now() % 99999 + 1, layout = prefs.layout, solvable = prefs.solvable) {
    clearGesture()
    sounds.stop()
    setGame(startGame(createDeal(number, layout, solvable)))
    setElapsed(0)
    setClockStarted(false)
    clock.current = { milliseconds: 0, since: null, revision: clock.current.revision + 1 }
    setClockRevision(clock.current.revision)
    setHint(null)
    hintIndex.current = 0
    setFocus(null)
    setView(initialView)
    setDialog(null)
    setCelebrating(false)
    setRecord(false)
    matchStreak.current = { time: -Infinity, count: 0 }
    setAnnouncement(`${strings.gameNumber(number)}. ${strings.layouts[layout]}. ${strings.start}`)
    surface.current?.focus()
  }
  function startOver() {
    clearGesture()
    sounds.stop()
    setGame(startGame(game.deal))
    setElapsed(0)
    setClockStarted(false)
    clock.current = { milliseconds: 0, since: null, revision: clock.current.revision + 1 }
    setClockRevision(clock.current.revision)
    setHint(null)
    hintIndex.current = 0
    setFocus(null)
    setDialog(null)
    setCelebrating(false)
    setRecord(false)
    matchStreak.current = { time: -Infinity, count: 0 }
    setAnnouncement(strings.start)
    surface.current?.focus()
  }
  function chooseLayout(layout: LayoutId) {
    setPrefs((p) => ({ ...p, layout }))
    newDeal(game.deal.number, layout)
  }
  function backupMove() {
    clearGesture()
    const next = backup(game)
    if (next === game) return
    sounds.stop()
    sounds.play('backup')
    setGame(next)
    setHint(null)
    hintIndex.current = 0
    setDialog(null)
    setCelebrating(false)
    setRecord(false)
    setAnnouncement(strings.restored(remaining(next)))
    surface.current?.focus()
  }
  function showHint() {
    clearGesture()
    const pairs = availablePairs(game)
    if (!pairs.length) { setAnnouncement(strings.noHint); sounds.play('invalid'); return }
    const pair = pairs[hintIndex.current++ % pairs.length]
    setHint(pair)
    hintElapsed.current = 0
    setHintInverted(true)
    setHintAnimating(true)
    setFocus(pair[0])
    sounds.play('hint')
    setAnnouncement(strings.hintPair(faceLabel(game.deal.faces[pair[0]], prefs.set === 'classic'), faceLabel(game.deal.faces[pair[1]], prefs.set === 'classic')))
    revealFocus(pair[0])
  }
  function finishCelebration() {
    sounds.stop()
    fireworksAtlas.current = null
    setCelebrating(false)
    setDialog('win')
  }
  function select(index: number) {
    if (!active || hidden || dialog) return
    if (celebrating) { finishCelebration(); return }
    const next = selectTile(game, index)
    if (next === game) { sounds.play('invalid'); return }
    if (!clockStarted) setClockStarted(true)
    setHint(null)
    hintIndex.current = 0
    setFocus(index)
    setGame(next)
    if (next.history.length > game.history.length) {
      const now = performance.now()
      if (remaining(next) === 0) {
        const current = clock.current
        current.milliseconds += current.since === null ? 0 : now - current.since
        current.since = null
        setElapsed(Math.floor(current.milliseconds / 1000))
      }
      matchStreak.current = { time: now, count: now - matchStreak.current.time < 4000 ? matchStreak.current.count + 1 : 0 }
      sounds.play('match', matchStreak.current.count)
      const nextFocus = nearestFree(next, index)
      setFocus(nextFocus)
      if (keyboardFocus) revealFocus(nextFocus)
      setAnnouncement(strings.match(remaining(next)))
    } else {
      sounds.play('select')
      setAnnouncement(strings.tile(faceLabel(game.deal.faces[index], prefs.set === 'classic'), next.selected === index ? strings.selectedLabel : strings.freeLabel))
    }
  }
  function toggleZoom(x = geometry.width / 2, y = geometry.height / 2) {
    clearGesture()
    lastTap.current.time = -Infinity
    setView((v) => v.zoom === 2 ? initialView : clampView(geometry, {
      zoom: 2,
      panX: geometry.width / 2 - x,
      panY: geometry.height / 2 - y
    }))
  }
  function revealFocus(index: number | null) {
    if (index === null || view.zoom === 1) return
    const p = game.deal.positions[index]
    const x = geometry.x + (p.x * 40 - p.z * 4 + 20) * geometry.scale
    const y = geometry.y + (p.y * 52 - p.z * 4 + 26) * geometry.scale
    setView((v) => clampView(geometry, { ...v, panX: (geometry.width / 2 - x) * 2, panY: (geometry.height / 2 - y) * 2 }))
  }
  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * geometry.width / rect.width, y: (event.clientY - rect.top) * geometry.height / rect.height }
  }
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    unlockAudio()
    if (!active || hidden || dialog) return
    event.preventDefault()
    setKeyboardFocus(false)
    surface.current?.focus()
    if (celebrating) { finishCelebration(); return }
    if (event.button !== 0 && event.button !== 2 || gesture.current) return
    const p = point(event)
    const tile = hitTile(game, geometry, view, p.x, p.y)
    const doubleTap = event.pointerType === 'touch' && tile === null && performance.now() - lastTap.current.time < 320 && Math.hypot(p.x - lastTap.current.x, p.y - lastTap.current.y) < 36
    const g: Gesture = { id: event.pointerId, x: p.x, y: p.y, base: view, tile, moved: false, peek: event.button === 2, touch: event.pointerType === 'touch', right: event.button === 2, doubleTap }
    gesture.current = g
    event.currentTarget.setPointerCapture(event.pointerId)
    if (g.right) setPeek(tile)
    if (g.touch && tile !== null) {
      const rect = surface.current!.getBoundingClientRect()
      setHold({ x: event.clientX - rect.left, y: event.clientY - rect.top })
      holdTimer.current = window.setTimeout(() => {
        if (gesture.current !== g || g.moved) return
        g.peek = true
        setPeek(tile)
        setHold(null)
        setAnnouncement(strings.peekLabel)
        navigator.vibrate?.(10)
      }, 450)
    }
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const g = gesture.current
    if (!g || g.id !== event.pointerId || !active || hidden) return
    const p = point(event)
    const rect = event.currentTarget.getBoundingClientRect()
    if (Math.hypot(p.x - g.x, p.y - g.y) * rect.width / WIDTH > 6) {
      g.moved = true
      window.clearTimeout(holdTimer.current)
      holdTimer.current = undefined
      setHold(null)
    }
    if (g.peek) setPeek(hitTile(game, geometry, view, p.x, p.y))
    else if (g.moved && g.base.zoom === 2) setView(clampView(geometry, { zoom: 2,
      panX: g.base.panX + p.x - g.x,
      panY: g.base.panY + p.y - g.y }))
  }
  function pointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const g = gesture.current
    if (!g || g.id !== event.pointerId) return
    const p = point(event)
    clearGesture()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (!active || hidden || dialog || g.peek || g.moved || g.right) return
    const now = performance.now()
    if (g.touch && g.tile === null && g.doubleTap) {
      toggleZoom(p.x, p.y)
      lastTap.current.time = -Infinity
      return
    }
    lastTap.current = g.touch && g.tile === null ? { time: now, ...p } : { time: -Infinity, x: 0, y: 0 }
    if (g.tile !== null) select(g.tile)
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    unlockAudio()
    if (!active || hidden || dialog || (event.target instanceof HTMLElement && event.target.closest('button,input,[role="menubar"]'))) return
    setKeyboardFocus(true)
    if (celebrating) { event.preventDefault(); finishCelebration(); return }
    const dirs: Record<string, readonly [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (dirs[event.key]) {
      event.preventDefault()
      const [dx, dy] = dirs[event.key]
      const next = nearestFree(game, focus, dx, dy)
      setFocus(next)
      revealFocus(next)
      if (next !== null) setAnnouncement(strings.tile(faceLabel(game.deal.faces[next], prefs.set === 'classic'), strings.freeLabel))
    } else if (event.key === ' ') {
      event.preventDefault()
      const next = focus ?? freeTiles(game.deal.positions, game.removed)[0]
      if (next !== undefined && next !== null) select(next)
    } else if (event.key.toLowerCase() === 'p') {
      event.preventDefault()
      const next = focus ?? freeTiles(game.deal.positions, game.removed)[0]
      if (next !== undefined && next !== null) { setPeek(next); setAnnouncement(strings.peekLabel) }
    } else if (event.key === '+' || event.key === '-' || event.key === '=') {
      event.preventDefault()
      toggleZoom()
    }
  }

  useEffect(() => { saveGame('taipei', prefs) }, [prefs])
  useEffect(() => { fit(640, 480) }, [fit, prefs.layout])
  useEffect(() => { if (active && !hidden && !dialog) surface.current?.focus() }, [active, hidden, dialog])
  useEffect(() => {
    if (param === previousParam.current) return
    previousParam.current = param
    const number = parseGameNumber(param)
    if (number !== null) newDeal(number)
  }, [param])
  useEffect(() => {
    if (!clockRuns(clockStarted, hidden, !!dialog, count)) return
    const current = clock.current
    current.since = performance.now()
    const timer = window.setInterval(() => {
      setElapsed(clockSeconds(current.milliseconds, current.since, performance.now()))
    }, 1000)
    return () => {
      window.clearInterval(timer)
      if (clock.current !== current) return
      current.milliseconds += current.since === null ? 0 : performance.now() - current.since
      current.since = null
      setElapsed(Math.floor(current.milliseconds / 1000))
    }
  }, [hidden, dialog, count === 0, clockStarted, clockRevision])
  useEffect(() => {
    if (hidden || !active || dialog) clearGesture()
    if (hidden || !active) sounds.stop()
  }, [hidden, active, dialog, sounds])
  useEffect(() => {
    let live = true
    const width = 44 * geometry.scale * 8 / viewport.padding * view.zoom * (window.devicePixelRatio || 1)
    const variant = width <= 128 ? 128 : width <= 320 ? 320 : 600
    if (prefs.set === 'remy') {
      civilianSeeds.forEach((seed, i) => {
        const face = i < 9 ? i + 18 : i + 25
        void civRemy(seed).then((idx) => loadRemy(idx, variant)).then((image) => { if (live) setArt((previous) => ({ ...previous, [face]: image })) }).catch(() => {})
      })
      cabaldSeeds.forEach((seed, i) => {
        void cabaldRemy(seed).then((idx) => loadRemy(idx, variant)).then((image) => { if (live) setArt((previous) => ({ ...previous, [38 + i]: image })) }).catch(() => {})
      })
    }
    return () => { live = false }
  }, [prefs.set, view.zoom, geometry.scale, viewport.padding])
  useEffect(() => () => {
    window.clearTimeout(holdTimer.current)
    sounds.stop()
    gesture.current = null
    fireworksAtlas.current = null
  }, [sounds])
  useEffect(() => {
    if (count === 0) {
      const best = prefs.best[game.deal.layout]
      setRecord(!best || elapsed < best.seconds)
      setAnnouncement(strings.win)
      celebrationTime.current = 0
      fireworksAtlas.current = createTileAtlas(prefs.set, art)
      const random = mulberry32(game.deal.number ^ 0x544149)
      const pool = particles
      for (let i = 0; i < 144; i++) {
        const angle = random() * Math.PI * 2
        const speed = 80 + random() * 180
        const offset = i * 6
        pool[offset] = Math.cos(angle) * speed
        pool[offset + 1] = Math.sin(angle) * speed - 70
        pool[offset + 2] = reducedMotion.current ? 0 : Math.floor(i / 48) * 0.18
        pool[offset + 3] = (random() - 0.5) * 8
        pool[offset + 4] = random() * Math.PI * 2
        pool[offset + 5] = i
      }
      setCelebrating(true)
      sounds.play('win')
    } else if (noMoves(game)) {
      setDialog('no-moves')
      setAnnouncement(strings.noMoves)
      sounds.play('no-moves')
    }
  }, [game.removed])

  redraw.current = () => {
    if (canvas.ctx.current && !celebrating && !hidden) drawBoard(canvas.ctx.current, game, geometry, view, prefs.set, art, { highlight: prefs.highlight, hint, hintInverted, peek, focus: keyboardFocus ? focus : null })
  }
  useEffect(() => { redraw.current() }, [game, geometry, view, prefs.set, prefs.highlight, art, hint, hintInverted, peek, focus, keyboardFocus, hidden, celebrating])
  useAnimationFrame((dt) => {
    if (!celebrating) {
      hintElapsed.current += dt
      const time = hintElapsed.current
      setHintInverted(time < 0.2 || time >= 0.4 && time < 0.6)
      if (time >= 0.8) { setHintAnimating(false); setHintInverted(false) }
      return
    }
    const ctx = canvas.ctx.current
    const atlas = fireworksAtlas.current
    if (!ctx || !atlas) return
    celebrationTime.current += dt
    const time = celebrationTime.current
    const duration = reducedMotion.current ? 1.2 : 2.5
    ctx.clearRect(0, 0, geometry.width, geometry.height)
    const pool = particles
    for (let i = 0; i < 144; i++) {
      const offset = i * 6
      const t = time - pool[offset + 2]
      if (t < 0) continue
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, (duration - time) * 2))
      ctx.translate(geometry.width / 2 + pool[offset] * t, geometry.height / 2 + pool[offset + 1] * t + 80 * t * t)
      ctx.rotate(pool[offset + 4] + pool[offset + 3] * t)
      ctx.scale(0.25, 0.25)
      const face = game.deal.faces[pool[offset + 5]]
      ctx.drawImage(atlas, face % 7 * 44, Math.floor(face / 7) * 56, 44, 56, 0, 0, 44, 56)
      ctx.restore()
    }
    if (time >= duration) finishCelebration()
  }, { paused: !celebrating && !hintAnimating || !!dialog, activeOnly: false })

  const menus: GameMenu[] = [
    { label: strings.menu.game, items: [
      { label: strings.menu.new, hotkey: 'F2', onClick: () => newDeal() },
      { label: strings.menu.select, hotkey: 'F3', onClick: () => { setNumberText(String(game.deal.number)); setNumberError(false); setDialog('select') } },
      { label: strings.menu.restart, onClick: startOver }, '-',
      { label: strings.menu.backup, hotkey: 'Ctrl+Z', disabled: !game.history.length, onClick: backupMove },
      { label: strings.menu.hint, hotkey: 'H', disabled: count === 0, onClick: showHint }, '-',
      { label: strings.menu.best, onClick: () => setDialog('best') }, '-', { label: strings.menu.exit, onClick: close }
    ] },
    { label: strings.menu.options, items: [
      { label: strings.menu.layout, items: LAYOUT_IDS.map((id) => ({ label: strings.layouts[id], checked: prefs.layout === id, radio: true, onClick: () => chooseLayout(id) })) },
      { label: strings.menu.solvable, checked: prefs.solvable, onClick: () => { setPrefs((p) => ({ ...p, solvable: !p.solvable })); newDeal(game.deal.number, prefs.layout, !prefs.solvable) } },
      { label: strings.menu.timer, checked: prefs.timer, onClick: () => setPrefs((p) => ({ ...p, timer: !p.timer })) },
      { label: strings.menu.free, checked: prefs.highlight, onClick: () => setPrefs((p) => ({ ...p, highlight: !p.highlight })) },
      { label: strings.menu.sound, checked: !muted, onClick: toggleMuted },
      { label: strings.menu.tiles, items: (['remy', 'classic'] as const).map((set) => ({ label: strings.sets[set], checked: prefs.set === set, radio: true, onClick: () => setPrefs((p) => ({ ...p, set })) })) }
    ] },
    { label: strings.menu.help, items: [{ label: strings.menu.contents, hotkey: 'F1', onClick: () => setDialog('help') }, '-', { label: strings.menu.about, onClick: () => setDialog('about') }] }
  ]
  const closeDialog = () => setDialog(null)
  function acceptNumber() {
    const number = parseGameNumber(numberText)
    if (number === null) { setNumberError(true); return }
    newDeal(number)
  }
  function recordName(name: string) {
    const trimmed = name.trim().slice(0, 32)
    setPrefs((p) => ({ ...p, best: { ...p.best, [game.deal.layout]: { seconds: elapsed, name: trimmed } } }))
    setDialog(null)
  }
  function dismissWin() { setDialog(record ? 'name' : null) }

  return <div className={`taipei${pocket ? ' taipei-pocket' : ''}`}
    onKeyDownCapture={(event) => { unlockAudio(); setKeyboardFocus(true); if (celebrating && active && !hidden) { event.preventDefault(); event.stopPropagation(); finishCelebration() } }}
    onPointerDownCapture={(event) => { unlockAudio(); setKeyboardFocus(false); if (celebrating && active && !hidden) { event.preventDefault(); event.stopPropagation(); finishCelebration() } }}>
    <GameMenuBar menus={menus} disabled={celebrating} />
    <div className='taipei-surface' ref={surface} tabIndex={0} role='application' aria-label={strings.title} onKeyDown={keyDown}
      onKeyUp={(event) => { if (event.key.toLowerCase() === 'p') setPeek(null) }}
      onBlur={() => { if (!gesture.current) setPeek(null) }} onContextMenu={(event) => event.preventDefault()}>
      <canvas ref={canvas.ref} className='taipei-board' onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
        onPointerCancel={clearGesture} onLostPointerCapture={() => { if (gesture.current) clearGesture() }} />
      {hold && <span className='taipei-hold' style={{ left: hold.x, top: hold.y }} />}
      <div className='taipei-accessible' aria-live='polite' aria-atomic='true'>{announcement}</div>
    </div>
    <div className='taipei-status'><span>{strings.tilesLeft(count)}</span><span>{strings.gameNumber(game.deal.number)}</span><span>{strings.layouts[game.deal.layout]}</span>{prefs.timer && <span>{strings.time(formatTime(elapsed))}</span>}
      <button className='taipei-zoom' title={strings.zoomLabel} aria-label={strings.zoomLabel} aria-pressed={view.zoom === 2} onClick={() => toggleZoom()}>{view.zoom === 2 ? strings.zoomOut : strings.zoomIn}</button>
    </div>
    {dialog === 'select' && <GameDialog title={strings.selectTitle} onClose={closeDialog} buttons={[
      { label: strings.ok, onClick: acceptNumber, default: true }, { label: strings.cancel, onClick: closeDialog, cancel: true }
    ]}><label className='taipei-number'>{strings.selectPrompt}<input data-autofocus type='text' inputMode='numeric' value={numberText} maxLength={5}
      onFocus={(event) => event.currentTarget.select()} onChange={(event) => { setNumberText(event.target.value); setNumberError(false) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); acceptNumber() } }} aria-invalid={numberError} /></label>
      {numberError && <p role='alert'>{strings.invalidNumber}</p>}
    </GameDialog>}
    {dialog === 'help' && <GameDialog title={strings.helpTitle} onClose={closeDialog} width={490}>
      <GameHelpTabs tabs={Object.keys(strings.help)} selected={Object.keys(strings.help).indexOf(helpTab)}
        onChange={(index) => setHelpTab((Object.keys(strings.help) as HelpTab[])[index])}>
        <p>{strings.help[helpTab]}</p>
      </GameHelpTabs>
    </GameDialog>}
    {dialog === 'about' && <AboutDialog game={strings.title} icon={icon} version={strings.version} flavour={strings.flavour} lines={strings.about} onClose={closeDialog} />}
    {dialog === 'best' && <BestScoresDialog title={strings.bestTitle} heading={strings.bestHeading} format={formatTime}
      rows={LAYOUT_IDS.map((id) => ({ label: strings.layouts[id], score: prefs.best[id]?.seconds ?? null, name: prefs.best[id]?.name }))}
      onReset={() => setPrefs((p) => ({ ...p, best: {} }))} onClose={closeDialog} />}
    {dialog === 'no-moves' && <GameDialog title={strings.title} onClose={closeDialog} buttons={[
      { label: strings.backup, onClick: backupMove, disabled: !game.history.length }, { label: strings.startOver, onClick: startOver }, { label: strings.newGame, onClick: () => newDeal(), default: true }
    ]}><p>{strings.noMoves}</p></GameDialog>}
    {dialog === 'win' && <GameDialog title={strings.title} onClose={dismissWin} buttons={[{ label: strings.ok, onClick: dismissWin, default: true }]}>
      <p>{strings.win}</p><p>{strings.time(formatTime(elapsed))}</p>
    </GameDialog>}
    {dialog === 'name' && <NameEntryDialog level={strings.layouts[game.deal.layout]} message={strings.record} onSubmit={recordName} />}
  </div>
}
