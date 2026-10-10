import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, BestScoresDialog, FLAG_COLORS, GameDialog, GameMenuBar, NameEntryDialog, loadCabald, loadFrontHeads, loadGame, loadPalette,
  mulberry32, noise, saveGame, sequence, tone, unlockAudio, useCrispCanvas, useGamesMuted, useGamesPlayer, useWindowFit, useWindowState,
} from '../kit'
import type { FrontRemyHeads, GameMenu, RemyPalette } from '../kit'
import { FLAG, HIDDEN, LEVELS, QUESTION, REVEALED, chordCell, chordPreview, clampCustom, createGame, cycleMark, reveal, tick } from './engine'
import type { Config, Game, Level } from './engine'
import { BOARD_X, BOARD_Y, FALLBACK_PALETTE, HEADER_HEIGHT, cellAt, drawBoard, drawHeader } from './render'
import type { MineArt } from './render'
import { icon } from './icon'
import { S } from './strings'
import './minesweeper.css'

export { icon } from './icon'

type Score = { time: number; name: string }
type Preferences = { level: Level; custom: Config; marks: boolean; color: boolean; scores: Record<'beginner' | 'intermediate' | 'expert', Score> }
type Dialog = 'help' | 'about' | 'scores' | 'custom' | 'name' | null
type Gesture = {
  kind: 'reveal' | 'mark' | 'chord' | 'pan' | 'suppressed'
  pointer: number
  index: number
  touch: boolean
  x: number
  y: number
  startX: number
  startY: number
}
type Pinch = { distance: number; zoom: number; anchorX: number; anchorY: number }
const STANDARD = ['beginner', 'intermediate', 'expert'] as const
const defaultScores = () => ({ beginner: { time: 999, name: S.defaultName }, intermediate: { time: 999, name: S.defaultName }, expert: { time: 999, name: S.defaultName } })
const defaults = (): Preferences => ({ level: 'beginner', custom: { ...LEVELS.beginner }, marks: true, color: true, scores: defaultScores() })

function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object') return false
  const p = value as Preferences
  if (![...STANDARD, 'custom'].includes(p.level) || typeof p.marks !== 'boolean' || typeof p.color !== 'boolean' || !p.custom || !p.scores) return false
  const custom = clampCustom(p.custom.rows, p.custom.cols, p.custom.mines)
  if (custom.rows !== p.custom.rows || custom.cols !== p.custom.cols || custom.mines !== p.custom.mines) return false
  return STANDARD.every((level) => {
    const score = p.scores[level]
    return score && Number.isInteger(score.time) && score.time >= 1 && score.time <= 999 && typeof score.name === 'string' && score.name.length <= 32
  })
}

export default function Minesweeper({ param, close }: AppProps) {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    const p = loadGame('minesweeper', defaults(), isPreferences)
    return STANDARD.includes(param as typeof STANDARD[number]) ? { ...p, level: param as Level } : p
  })
  const [game, setGame] = useState(() => createGame(preferences.level === 'custom' ? preferences.custom : LEVELS[preferences.level], Date.now() >>> 0))
  const gameRef = useRef(game)
  const preferencesRef = useRef(preferences)
  preferencesRef.current = preferences
  const [dialog, setDialog] = useState<Dialog>(null)
  const [helpTab, setHelpTab] = useState(0)
  const [customInput, setCustomInput] = useState({ rows: String(preferences.custom.rows), cols: String(preferences.custom.cols), mines: String(preferences.custom.mines) })
  const [record, setRecord] = useState<{ level: typeof STANDARD[number]; time: number } | null>(null)
  const [expertNotice, setExpertNotice] = useState(false)
  const [announcement, setAnnouncement] = useState(S.started(S.levelNames[preferences.level], game.config.mines))
  const [cursor, setCursor] = useState(0)
  const [keyboardCursor, setKeyboardCursor] = useState(false)
  const [preview, setPreview] = useState<number[]>([])
  const [pressing, setPressing] = useState(false)
  const [facePressed, setFacePressed] = useState(false)
  const [egg, setEgg] = useState(false)
  const eggKeys = useRef('')
  const [hover, setHover] = useState(-1)
  const [palette, setPalette] = useState<RemyPalette>(FALLBACK_PALETTE)
  const [atlas, setAtlas] = useState<{ heads: FrontRemyHeads; roster: number[] } | null>(null)
  const [mineArt, setMineArt] = useState<MineArt | null>(null)
  const { player } = useGamesPlayer()
  const { muted, toggleMuted } = useGamesMuted()
  const { active, hidden } = useWindowState()
  const fit = useWindowFit()
  const root = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 164, height: 229 })
  const [mobile, setMobile] = useState(() => window.innerWidth < 720)
  const [touchInput, setTouchInput] = useState(false)
  const [flagMode, setFlagMode] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [ring, setRing] = useState<{ x: number; y: number } | null>(null)
  const hold = useRef<number | undefined>()
  const gesture = useRef<Gesture | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<Pinch | null>(null)
  const pendingScroll = useRef<{ x: number; y: number } | null>(null)
  const clockRemaining = useRef(1000)
  const seedCounter = useRef(0)
  const width = game.config.cols * 16 + 20
  const boardHeight = game.config.rows * 16 + 14
  const toolbar = mobile || touchInput
  const naturalScale = mobile ? Math.max(1, Math.floor(Math.min(size.width / width, (size.height - 22 - 44) / (boardHeight + HEADER_HEIGHT)))) : 1
  const boardScale = mobile && game.config.cols >= 16 ? Math.max(1.5, naturalScale) * zoom : naturalScale * zoom
  const headerScale = mobile ? naturalScale : 1
  const headerWidth = mobile ? Math.max(164, Math.floor(size.width / headerScale)) : width
  const headerDraw = useRef<() => void>(() => {})
  const boardDraw = useRef<() => void>(() => {})
  const headerCanvas = useCrispCanvas(headerWidth, HEADER_HEIGHT, { onResize: () => headerDraw.current() })
  const boardCanvas = useCrispCanvas(width, boardHeight, { onResize: () => boardDraw.current() })
  headerDraw.current = () => {
    if (headerCanvas.ctx.current) drawHeader(headerCanvas.ctx.current, game, headerWidth, preferences.color ? palette : FALLBACK_PALETTE, pressing, facePressed)
  }
  boardDraw.current = () => {
    if (boardCanvas.ctx.current) drawBoard(boardCanvas.ctx.current, game, preferences.color, preview, keyboardCursor ? cursor : null, mineArt)
  }

  useLayoutEffect(() => {
    headerDraw.current()
    boardDraw.current()
  }, [game, headerWidth, palette, pressing, facePressed, preferences.color, preview, keyboardCursor, cursor, mineArt])

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const measure = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight })
      setMobile(window.innerWidth < 720)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  useLayoutEffect(() => {
    fit(width, game.config.rows * 16 + 63 + (menu.current?.getBoundingClientRect().height ?? 22) + (toolbar && !mobile ? 44 : 0))
  }, [fit, width, game.config.rows, toolbar, mobile])

  useEffect(() => { saveGame('minesweeper', preferences) }, [preferences])
  useEffect(() => {
    let disposed = false
    setPalette(FALLBACK_PALETTE)
    void loadPalette(player.remy).then((p) => { if (!disposed) setPalette(p) }).catch(() => {})
    return () => { disposed = true }
  }, [player.remy])
  useEffect(() => {
    let disposed = false
    void Promise.all([loadFrontHeads(), loadCabald()]).then(([heads, roster]) => {
      if (!disposed && roster.length) setAtlas({ heads, roster })
    }).catch(() => {})
    return () => { disposed = true }
  }, [])
  useEffect(() => {
    if (!atlas) return
    const ids = [...atlas.roster]
    const random = mulberry32(game.seed ^ 0xca8a1d)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      const previous = ids[i]
      ids[i] = ids[j]
      ids[j] = previous
    }
    setMineArt({ heads: atlas.heads, ids })
  }, [atlas, game.seed])

  const clearHold = () => {
    window.clearTimeout(hold.current)
    hold.current = undefined
    setRing(null)
  }
  const cancelGesture = () => {
    clearHold()
    gesture.current = null
    pointers.current.clear()
    pinch.current = null
    setPreview([])
    setPressing(false)
    setFacePressed(false)
  }
  useEffect(() => {
    if (hidden || !active || dialog) cancelGesture()
    if (active && !hidden && !dialog) root.current?.focus({ preventScroll: true })
  }, [active, hidden, dialog])
  useEffect(() => () => window.clearTimeout(hold.current), [])

  const commit = (next: Game) => {
    const previous = gameRef.current
    if (next === previous) return
    gameRef.current = next
    setGame(next)
    if (next.status === 'lost' && previous.status !== 'lost') {
      clearHold()
      setPreview([])
      setPressing(false)
      setAnnouncement(S.dead)
      if (!hidden) noise(0.8, { filter: 'lowpass', freq: 2000, to: 80, vol: 0.25 })
    } else if (next.status === 'won' && previous.status !== 'won') {
      clearHold()
      setPreview([])
      setPressing(false)
      setAnnouncement(S.won(next.seconds))
      if (!hidden) sequence([[72, 1], [76, 1], [79, 1], [84, 2]], { bpm: 300, gate: 0.95, vol: 0.1, attack: 0.005 })
      const p = preferencesRef.current
      if (p.level !== 'custom' && next.seconds < p.scores[p.level].time) {
        setRecord({ level: p.level, time: next.seconds })
        setExpertNotice(p.level === 'expert')
        setDialog('name')
      }
    } else {
      let count = 0
      for (let i = 0; i < next.cells.length; i++) if (next.cells[i] === REVEALED && previous.cells[i] !== REVEALED) count++
      if (count) setAnnouncement(S.revealed(count))
    }
  }

  const commitRef = useRef(commit)
  commitRef.current = commit
  useEffect(() => {
    if (hidden || game.status !== 'playing' || game.seconds === 999) return
    let timer: number
    let due = performance.now() + clockRemaining.current
    const advance = () => {
      const next = tick(gameRef.current)
      commitRef.current(next)
      tone(1000, 0.008, { type: 'square', vol: 0.08, attack: 0.001 })
      clockRemaining.current = 1000
      due = performance.now() + 1000
      if (next.status === 'playing' && next.seconds < 999) timer = window.setTimeout(advance, 1000)
    }
    timer = window.setTimeout(advance, clockRemaining.current)
    return () => {
      window.clearTimeout(timer)
      clockRemaining.current = gameRef.current.status === 'playing' ? Math.max(1, due - performance.now()) : 1000
    }
  }, [hidden, game.status, game.seconds === 999])

  const newGame = (level = preferencesRef.current.level, custom = preferencesRef.current.custom) => {
    cancelGesture()
    const nextPreferences = { ...preferencesRef.current, level, custom }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    const next = createGame(level === 'custom' ? custom : LEVELS[level], (Date.now() + ++seedCounter.current) >>> 0)
    gameRef.current = next
    clockRemaining.current = 1000
    setGame(next)
    setCursor(0)
    setPreview([])
    setHover(-1)
    setZoom(1)
    setDialog(null)
    setRecord(null)
    setExpertNotice(false)
    setAnnouncement(S.started(S.levelNames[level], next.config.mines))
    if (viewport.current) {
      viewport.current.scrollLeft = 0
      viewport.current.scrollTop = 0
    }
    root.current?.focus({ preventScroll: true })
  }
  const previousParam = useRef(param)
  useEffect(() => {
    if (previousParam.current !== param && STANDARD.includes(param as typeof STANDARD[number])) newGame(param as Level)
    previousParam.current = param
  }, [param])

  const describe = (index: number, current = gameRef.current) => {
    if (index < 0) return ''
    const cell = current.cells[index]
    const state = cell === FLAG ? S.flagged : cell === QUESTION ? S.question : cell === HIDDEN ? S.hidden : current.mines[index] ? S.mine : current.numbers[index] ? S.adjacent(current.numbers[index]) : S.empty
    return S.cell(Math.floor(index / current.config.cols) + 1, index % current.config.cols + 1, state)
  }
  const mark = (index: number) => {
    const next = cycleMark(gameRef.current, index, preferencesRef.current.marks)
    commit(next)
    if (index >= 0 && next.status !== 'won' && next.status !== 'lost') setAnnouncement(describe(index, next))
  }
  const touchAction = (index: number, marking: boolean) => {
    if (index < 0) return
    if (marking) mark(index)
    else commit(gameRef.current.cells[index] === REVEALED ? chordCell(gameRef.current, index) : reveal(gameRef.current, index))
  }
  const point = (e: PointerEvent<HTMLDivElement>) => {
    const rect = boardCanvas.ref.current?.getBoundingClientRect()
    if (!rect) return -1
    return cellAt(gameRef.current, (e.clientX - rect.left) * width / rect.width, (e.clientY - rect.top) * boardHeight / rect.height)
  }
  const pressPreview = (kind: Gesture['kind'], index: number) => {
    setPreview(index < 0 ? [] : kind === 'chord' ? chordPreview(gameRef.current, index) : kind === 'reveal' ? [index] : [])
    setPressing(index >= 0 && (kind === 'chord' || kind === 'reveal'))
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!active || hidden || dialog) return
    unlockAudio()
    e.preventDefault()
    root.current?.focus({ preventScroll: true })
    const touch = e.pointerType === 'touch'
    setTouchInput(touch)
    setKeyboardCursor(false)
    const index = point(e)
    setHover(index)
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (touch && pointers.current.size === 2) {
      clearHold()
      setPreview([])
      setPressing(false)
      const [a, b] = [...pointers.current.values()]
      const v = viewport.current
      if (v) {
        const rect = v.getBoundingClientRect()
        const mx = (a.x + b.x) / 2 - rect.left
        const my = (a.y + b.y) / 2 - rect.top
        pinch.current = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom, anchorX: v.scrollLeft + mx, anchorY: v.scrollTop + my }
      }
      gesture.current = { kind: 'pan', pointer: e.pointerId, index: -1, touch: true, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY }
      return
    }
    if (pointers.current.size > 1) return
    let kind: Gesture['kind'] = touch ? (index < 0 ? 'pan' : flagMode ? 'mark' : 'reveal') : (e.buttons & 4) || (e.buttons & 3) === 3 ? 'chord' : e.button === 2 ? 'mark' : 'reveal'
    if (gameRef.current.status === 'lost' || gameRef.current.status === 'won') kind = 'suppressed'
    gesture.current = { kind, pointer: e.pointerId, index, touch, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY }
    pressPreview(kind, index)
    if (!touch && kind === 'mark') mark(index)
    if (touch && index >= 0 && kind !== 'suppressed') {
      const rect = e.currentTarget.getBoundingClientRect()
      setRing({ x: e.clientX - rect.left + e.currentTarget.scrollLeft, y: e.clientY - rect.top + e.currentTarget.scrollTop })
      hold.current = window.setTimeout(() => {
        const g = gesture.current
        if (!g || g.index !== index || pointers.current.size !== 1) return
        touchAction(index, !flagMode)
        g.kind = 'suppressed'
        setPreview([])
        setPressing(false)
        clearHold()
        navigator.vibrate?.(10)
      }, 450)
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!active || hidden || dialog) return
    const index = point(e)
    setHover(index)
    const g = gesture.current
    if (!g || !pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (g.touch && pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const p = pinch.current
      const v = viewport.current
      if (!v) return
      const nextZoom = Math.max(1, Math.min(3, p.zoom * Math.hypot(a.x - b.x, a.y - b.y) / p.distance))
      const rect = v.getBoundingClientRect()
      const mx = (a.x + b.x) / 2 - rect.left
      const my = (a.y + b.y) / 2 - rect.top
      const desired = { x: p.anchorX * nextZoom / p.zoom - mx, y: p.anchorY * nextZoom / p.zoom - my }
      pendingScroll.current = desired
      setZoom(nextZoom)
      v.scrollLeft = desired.x
      v.scrollTop = desired.y
      return
    }
    if (g.touch && g.kind === 'pan') {
      if (viewport.current) {
        viewport.current.scrollLeft -= e.clientX - g.x
        viewport.current.scrollTop -= e.clientY - g.y
      }
      g.x = e.clientX
      g.y = e.clientY
      return
    }
    if (g.touch && (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > 8 || index !== g.index)) clearHold()
    if (!g.touch && g.kind !== 'suppressed') {
      const chording = (e.buttons & 4) !== 0 || (e.buttons & 3) === 3
      if (chording) g.kind = 'chord'
      else if (g.kind === 'chord') {
        commit(chordCell(gameRef.current, index))
        g.kind = 'suppressed'
      }
    }
    g.index = index
    pressPreview(g.kind, index)
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    const index = point(e)
    clearHold()
    pointers.current.delete(e.pointerId)
    if (pinch.current) {
      if (!pointers.current.size) cancelGesture()
      return
    }
    if (g && active && !hidden && !dialog) {
      if (g.touch && (g.kind === 'mark' || g.kind === 'reveal')) touchAction(index, g.kind === 'mark')
      else if (g.kind === 'reveal') commit(reveal(gameRef.current, index))
      else if (g.kind === 'chord') commit(chordCell(gameRef.current, index))
    }
    cancelGesture()
  }

  useLayoutEffect(() => {
    const v = viewport.current
    if (v && pendingScroll.current) {
      v.scrollLeft = pendingScroll.current.x
      v.scrollTop = pendingScroll.current.y
      pendingScroll.current = null
    }
  }, [zoom])
  useEffect(() => {
    if (!keyboardCursor || !viewport.current || !boardCanvas.ref.current) return
    const v = viewport.current
    const rect = boardCanvas.ref.current.getBoundingClientRect()
    const vr = v.getBoundingClientRect()
    const x = (BOARD_X + (cursor % game.config.cols) * 16) * boardScale + rect.left - vr.left
    const y = (BOARD_Y + Math.floor(cursor / game.config.cols) * 16) * boardScale + rect.top - vr.top
    if (x < 0) v.scrollLeft += x
    else if (x + 16 * boardScale > v.clientWidth) v.scrollLeft += x + 16 * boardScale - v.clientWidth
    if (y < 0) v.scrollTop += y
    else if (y + 16 * boardScale > v.clientHeight) v.scrollTop += y + 16 * boardScale - v.clientHeight
  }, [cursor, keyboardCursor, boardScale, game.config.cols])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!active || hidden || dialog || e.target !== root.current || e.altKey || e.ctrlKey || e.metaKey) return
    unlockAudio()
    setTouchInput(false)
    if (e.key === 'Enter' && e.shiftKey && eggKeys.current === 'xyzzy') {
      e.preventDefault()
      setEgg(true)
      return
    }
    if (e.key.length === 1 && !e.repeat) {
      const next = eggKeys.current + e.key.toLowerCase()
      eggKeys.current = next.endsWith('xyzzy') ? 'xyzzy' : 'xyzzy'.startsWith(next) ? next : e.key.toLowerCase() === 'x' ? 'x' : ''
    }
    let next = cursor
    if (e.key === 'ArrowLeft') next = Math.max(0, cursor % game.config.cols - 1) + Math.floor(cursor / game.config.cols) * game.config.cols
    else if (e.key === 'ArrowRight') next = Math.min(game.config.cols - 1, cursor % game.config.cols + 1) + Math.floor(cursor / game.config.cols) * game.config.cols
    else if (e.key === 'ArrowUp') next = Math.max(0, Math.floor(cursor / game.config.cols) - 1) * game.config.cols + cursor % game.config.cols
    else if (e.key === 'ArrowDown') next = Math.min(game.config.rows - 1, Math.floor(cursor / game.config.cols) + 1) * game.config.cols + cursor % game.config.cols
    else if (e.key === ' ') {
      if (!e.repeat) commit(reveal(gameRef.current, cursor))
    }
    else if ((e.key.toLowerCase() === 'f' || e.key === 'Enter') && !e.repeat) mark(cursor)
    else if (e.key.toLowerCase() === 'c' && !e.repeat) commit(chordCell(gameRef.current, cursor))
    else return
    e.preventDefault()
    setKeyboardCursor(true)
    setCursor(next)
    if (next !== cursor) setAnnouncement(describe(next))
  }

  const menus: GameMenu[] = [
    { label: S.game, items: [
      { label: S.newGame, hotkey: 'F2', onClick: () => newGame() }, '-',
      ...STANDARD.map((level) => ({ label: S.levels[level], radio: true, checked: preferences.level === level, onClick: () => newGame(level) })),
      { label: S.levels.custom, radio: true, checked: preferences.level === 'custom', onClick: () => {
        setCustomInput({ rows: String(game.config.rows), cols: String(game.config.cols), mines: String(game.config.mines) })
        setDialog('custom')
      } }, '-',
      { label: S.marks, checked: preferences.marks, onClick: () => setPreferences((p) => ({ ...p, marks: !p.marks })) },
      { label: S.color, checked: preferences.color, onClick: () => setPreferences((p) => ({ ...p, color: !p.color })) },
      { label: S.sound, checked: !muted, onClick: toggleMuted }, '-',
      { label: S.best, onClick: () => {
        setExpertNotice(false)
        setDialog('scores')
      } }, '-',
      { label: S.exit, onClick: close },
    ] },
    { label: S.help, items: [
      { label: S.contents, hotkey: 'F1', onClick: () => setDialog('help') }, '-',
      { label: S.about, onClick: () => setDialog('about') },
    ] },
  ]
  const closeDialog = () => {
    setDialog(null)
    setExpertNotice(false)
  }
  const changeZoom = (next: number) => {
    cancelGesture()
    setZoom(Math.max(1, Math.min(3, next)))
  }

  return (
    <div ref={root} className={`ms-game${mobile ? ' ms-pocket' : ''}`} role="application" aria-label={S.title} aria-describedby="ms-cursor-description" tabIndex={0} onKeyDown={onKeyDown}>
      <div ref={menu}><GameMenuBar menus={menus} disabled={dialog !== null} /></div>
      {egg && <span className="ms-egg" style={{ background: hover >= 0 && game.mines[hover] ? '#000000' : '#ffffff' }} aria-hidden="true" />}
      <div className="ms-header" style={{ width: headerWidth * headerScale, height: HEADER_HEIGHT * headerScale }}>
        <canvas ref={headerCanvas.ref} style={{ width: headerWidth * headerScale, height: HEADER_HEIGHT * headerScale }} aria-hidden="true" />
        <button type="button" className="ms-face" aria-label={S.face} style={{ left: (Math.floor(headerWidth / 2) - 12) * headerScale, top: 12 * headerScale, width: 24 * headerScale, height: 24 * headerScale }}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            unlockAudio()
            e.currentTarget.setPointerCapture(e.pointerId)
            setFacePressed(true)
          }}
          onPointerUp={(e) => {
            setFacePressed(false)
            if (e.button !== 0) return
            const rect = e.currentTarget.getBoundingClientRect()
            if (e.clientX >= rect.left && e.clientX < rect.right && e.clientY >= rect.top && e.clientY < rect.bottom) newGame()
          }}
          onPointerCancel={() => setFacePressed(false)} onLostPointerCapture={() => setFacePressed(false)}
          onClick={(e) => { if (e.detail === 0) newGame() }} />
      </div>
      <div ref={viewport} className="ms-viewport" style={mobile ? undefined : { width, height: boardHeight }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={cancelGesture}
        onLostPointerCapture={(e) => { if (pointers.current.has(e.pointerId)) cancelGesture() }}
        onPointerLeave={() => { if (!gesture.current) setHover(-1) }} onContextMenu={(e) => e.preventDefault()}>
        <canvas ref={boardCanvas.ref} className="ms-board" style={{ width: width * boardScale, height: boardHeight * boardScale }} aria-hidden="true" />
        {ring && <span className="ms-hold-ring" style={{ left: ring.x, top: ring.y }} aria-hidden="true" />}
      </div>
      {toolbar && <div className="ms-toolbar">
        <button type="button" className="btn ms-mode" aria-pressed={flagMode} onClick={() => {
          cancelGesture()
          setFlagMode((p) => !p)
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
            {flagMode ? <><path fill="#000" d="M8 3h1v9H8zM6 12h5v1H6zM4 13h9v2H4z" />
              {FLAG_COLORS.map((color, i) => <rect key={color} fill={color} x={2 + (i % 2) * 3} y={3 + Math.floor(i / 2) * 2} width={3} height={2} />)}
            </> : <><path fill="#000" d="M3 1h5v1H3zM3 2h1v4H3zM7 2h1v4H7zM4 6h3v5H4zM2 10h7v4H2zM3 14h5v1H3z" /><path fill="#808080" d="M3 11h5v3H3z" /></>}
          </svg>
          {flagMode ? S.flagMode : S.revealMode}
        </button>
        <button type="button" className="btn" aria-label={S.zoomOut} disabled={zoom <= 1} onClick={() => changeZoom(zoom - 0.25)}>{S.minus}</button>
        <button type="button" className="btn" aria-label={S.zoomIn} disabled={zoom >= 3} onClick={() => changeZoom(zoom + 0.25)}>{S.plus}</button>
        <button type="button" className="btn" onClick={() => {
          changeZoom(1)
          if (viewport.current) {
            viewport.current.scrollLeft = 0
            viewport.current.scrollTop = 0
          }
        }}>{S.fit}</button>
      </div>}
      <span className="ms-accessible" id="ms-cursor-description">{describe(cursor)}</span>
      <span className="ms-accessible" aria-live="polite" aria-atomic="true">{announcement}</span>
      {dialog === 'custom' && <GameDialog title={S.customTitle} onClose={closeDialog} width={300} buttons={[
        { label: S.ok, default: true, onClick: () => newGame('custom', clampCustom(Number(customInput.rows), Number(customInput.cols), Number(customInput.mines))) },
        { label: S.cancel, cancel: true, onClick: closeDialog },
      ]}>
        <div className="ms-custom">
          {(['rows', 'cols', 'mines'] as const).map((field, i) => <label key={field}>{[S.height, S.width, S.mines][i]}
            <input type="number" step={1} min={field === 'mines' ? 10 : 9} max={field === 'rows' ? 24 : field === 'cols' ? 30 : 667} value={customInput[field]} data-autofocus={i === 0 ? true : undefined}
              onChange={(e) => setCustomInput((p) => ({ ...p, [field]: e.target.value }))} />
          </label>)}
        </div><p>{S.customHint}</p>
      </GameDialog>}
      {dialog === 'help' && <GameDialog title={S.helpTitle} onClose={closeDialog} width={420}>
        <div className="ms-help-tabs" role="tablist" aria-label={S.helpTitle}>
          {S.tabs.map((tab, i) => <button type="button" key={tab} role="tab" id={`ms-tab-${i}`} aria-selected={helpTab === i} aria-controls={`ms-panel-${i}`} tabIndex={helpTab === i ? 0 : -1} onClick={() => setHelpTab(i)}
            onKeyDown={(e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
              e.preventDefault()
              const next = e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (i + (e.key === 'ArrowRight' ? 1 : 3)) % 4
              setHelpTab(next)
              e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
            } }}>{tab}</button>)}
        </div>
        <div className="ms-help-panel" role="tabpanel" id={`ms-panel-${helpTab}`} aria-labelledby={`ms-tab-${helpTab}`}>
          {S.helpSections[helpTab].map((line) => <p key={line}>{line}</p>)}
        </div>
      </GameDialog>}
      {dialog === 'about' && <AboutDialog game={S.title} icon={icon} version={S.version} flavour={S.aboutFlavour} lines={S.aboutLines} onClose={closeDialog} />}
      {dialog === 'name' && record && <NameEntryDialog title={S.title} level={record.level} message={S.recordMessage(record.level)} onSubmit={(name) => {
        setPreferences((p) => ({ ...p, scores: { ...p.scores, [record.level]: { time: record.time, name: name.trim().slice(0, 32) || S.defaultName } } }))
        setDialog('scores')
      }} />}
      {dialog === 'scores' && <BestScoresDialog title={S.fastestTitle} heading={expertNotice ? S.expertRecord : undefined}
        rows={STANDARD.map((level) => ({ label: S.levelNames[level], score: preferences.scores[level].time, name: preferences.scores[level].name }))}
        format={S.seconds} onReset={() => {
          setPreferences((p) => ({ ...p, scores: defaultScores() }))
          setExpertNotice(false)
        }} onClose={closeDialog} />}
    </div>
  )
}
