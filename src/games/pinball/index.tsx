import { useEffect, useRef, useState } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, BestScoresDialog, ChooseRemyDialog, GameDialog, GameMenuBar, NameEntryDialog,
  cabaldRemy, loadCabald, loadGame, loadRemy, saveGame, unlockAudio, useAnimationFrame, useCrispCanvas,
  useGamesMuted, useGamesPlayer, useWindowFit, useWindowState,
} from '../kit'
import { Panel } from './Panel'
import { CONTROL_ACTIONS, DEFAULT_CONTROLS, controlForKey, normalizeKey, validControls, type Controls } from './controls'
import { advanceDrag, applyFlipperInput, createPhysics, dragBall, launchBall, nudgePhysics, resetBall, stepPhysics } from './physics'
import { EVENT_NAMES, FLIPPERS } from './geometry'
import { createTableLayer, drawTable } from './render'
import {
  createGame, drainBall, enableTestMode, highScoreCandidates, hit, launchRules, missionGoal, missionName, nudgeRules,
  qualifiesHighScore, recordHighScore, replayGame, reseatBall, RANKS, rotateReentry, sanitizeHighScores, tickRules, type HighScore, type TableEvent,
} from './rules'
import { setPinballMusic, sound, stopPinballAudio } from './audio'
import { PANEL_COPY, STRINGS as S } from './strings'
import icon from './icon'
import './pinball.css'

type Options = { players: number; music: boolean; controls: Controls; scores: HighScore[] }
const DEMO_FLIPPER_PULSE = 0.12
const DEMO_FLIPPER_RELEASE = 0.24
const defaults: Options = { players: 1, music: true, controls: DEFAULT_CONTROLS, scores: [] }
function validOptions(value: unknown): value is Options {
  if (!value || typeof value !== 'object') return false
  const v = value as Options
  return Number.isInteger(v.players) && v.players >= 1 && v.players <= 4 && typeof v.music === 'boolean' && validControls(v.controls) && Array.isArray(v.scores)
}

export default function Pinball({ close }: AppProps) {
  const [options, setOptions] = useState(() => {
    const stored = loadGame('pinball', defaults, validOptions)
    return { ...stored, controls: { ...stored.controls }, scores: sanitizeHighScores(stored.scores) }
  })
  const [initialGame] = useState(() => createGame(options.players))
  const [initialPhysics] = useState(createPhysics)
  const gameRef = useRef(initialGame)
  const physicsRef = useRef(initialPhysics)
  const [revision, refresh] = useState(0)
  const [paused, setPaused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [demo, setDemo] = useState(false)
  const [dialog, setDialog] = useState<'help' | 'about' | 'scores' | 'controls' | 'remy' | null>(null)
  const [helpTab, setHelpTab] = useState(0)
  const [mappingAction, setMappingAction] = useState<typeof CONTROL_ACTIONS[number] | null>(null)
  const [mappingError, setMappingError] = useState(false)
  const [draftControls, setDraftControls] = useState<Controls>({ ...options.controls })
  const { active, hidden, pocket } = useWindowState()
  const [touch, setTouch] = useState(pocket)
  const [fullscreen, setFullscreen] = useState(false)
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false)
  const [replayDismissed, setReplayDismissed] = useState(false)
  const [portrait, setPortrait] = useState<string>()
  const [portraitSize, setPortraitSize] = useState<128 | 320 | 600 | null>(null)
  const [scoreQueue, setScoreQueue] = useState<{ player: number; score: number; rank: number }[]>([])
  const { player } = useGamesPlayer()
  const { muted, setMuted } = useGamesMuted()
  const fit = useWindowFit()
  const root = useRef<HTMLDivElement>(null)
  const touchControls = useRef<HTMLDivElement>(null)
  const inputs = useRef({ left: false, right: false, plunger: false, pull: 0, drag: -1, dragPending: false, swipeY: 0, swipeDistance: 0 })
  const pointers = useRef(new Map<number, 'left' | 'right' | 'plunger'>())
  const demoFlippers = useRef({ leftUntil: 0, rightUntil: 0, leftReadyAt: 0, rightReadyAt: 0 })
  const staticLayer = useRef<HTMLCanvasElement | null>(null)
  const art = useRef<{ bumpers: HTMLImageElement[]; rugLord?: HTMLImageElement }>({ bumpers: [] })
  const cheat = useRef('')
  const lastPanel = useRef(0)
  const lastMessage = useRef(-1)
  const game = gameRef.current
  const physics = physicsRef.current
  const canvas = useCrispCanvas(375, 416, {
    minScale: fullscreen || fallbackFullscreen ? 2 : 1,
    onResize: (scale) => { staticLayer.current = createTableLayer(scale); redraw() },
  })
  const suspended = paused || menuOpen || !!dialog || scoreQueue.length > 0 || game.phase === 'over'
  const replayOffer = game.phase === 'over' && game.replays > 0 && !replayDismissed && !dialog && !scoreQueue.length
  const panelMessage = !game.tilted && demo ? S.demoMode : game.message
  const goal = missionGoal(game)
  const panelGoal = game.tilted || game.phase === 'over' || panelMessage === goal ? '' : goal

  const redraw = () => {
    if (!canvas.ctx.current) return
    if (!staticLayer.current) staticLayer.current = createTableLayer(canvas.scale.current)
    drawTable(canvas.ctx.current, staticLayer.current, physicsRef.current, gameRef.current, art.current)
  }
  const updateOptions = (patch: Partial<Options>) => setOptions((old) => {
    const next = { ...old, ...patch }
    saveGame('pinball', next)
    return next
  })
  const clearInputs = () => {
    inputs.current.left = inputs.current.right = inputs.current.plunger = false
    inputs.current.pull = 0
    physicsRef.current.plunger = 0
    applyFlipperInput(physicsRef.current, false, false)
    inputs.current.drag = -1
    inputs.current.dragPending = false
    physicsRef.current.eventCount = 0
    pointers.current.clear()
    demoFlippers.current.leftUntil = demoFlippers.current.rightUntil = 0
    demoFlippers.current.leftReadyAt = demoFlippers.current.rightReadyAt = 0
    redraw()
  }
  const pressFlipper = (side: 'left' | 'right') => {
    if (inputs.current[side]) return
    inputs.current[side] = true
    physicsRef.current.tilted = gameRef.current.tilted
    applyFlipperInput(physicsRef.current, inputs.current.left, inputs.current.right)
    rotateReentry(gameRef.current, side === 'left' ? -1 : 1)
    sound('flipper')
    redraw()
    refresh((n) => n + 1)
  }
  const newGame = (attract = false) => {
    gameRef.current = createGame(options.players)
    resetBall(physicsRef.current)
    clearInputs()
    setPaused(false)
    setDemo(attract)
    setScoreQueue([])
    setReplayDismissed(false)
    refresh((n) => n + 1)
    redraw()
  }
  const playReplay = () => {
    const next = replayGame(gameRef.current)
    if (!next) return
    gameRef.current = next
    resetBall(physicsRef.current)
    clearInputs()
    setPaused(false)
    setDemo(false)
    setReplayDismissed(false)
    refresh((n) => n + 1)
    redraw()
  }
  const releasePlunger = () => {
    const input = inputs.current
    if (!input.plunger) return
    input.plunger = false
    if (launchRules(gameRef.current)) {
      launchBall(physicsRef.current, Math.max(0.08, Math.min(1, input.pull / 0.8)))
      sound('plunger-release')
    }
    input.pull = 0
    physicsRef.current.plunger = 0
    refresh((n) => n + 1)
  }
  const pressPlunger = () => {
    if (gameRef.current.phase !== 'ready' || suspended || !active) return
    unlockAudio()
    inputs.current.plunger = true
    inputs.current.pull = 0
    sound('plunger-pull')
    refresh((n) => n + 1)
  }
  const launchCommand = () => {
    if (launchRules(gameRef.current)) {
      launchBall(physicsRef.current, 1)
      sound('plunger-release')
      refresh((n) => n + 1)
    }
  }
  const nudge = (direction: 'left' | 'right' | 'up') => {
    if (suspended || !active) return
    if (nudgeRules(gameRef.current)) {
      nudgePhysics(physicsRef.current, direction === 'left' ? -110 : direction === 'right' ? 110 : 0, direction === 'up' ? -140 : -30)
      sound('nudge')
    } else if (gameRef.current.tilted) sound('tilt')
    refresh((n) => n + 1)
  }
  const fullScreen = async () => {
    if (fallbackFullscreen) { setFallbackFullscreen(false); return }
    if (document.fullscreenElement) {
      try { await document.exitFullscreen?.() } catch {}
      return
    }
    const element = root.current
    if (!element) return
    if (!element.requestFullscreen) { setFallbackFullscreen(true); return }
    try { await element.requestFullscreen() } catch { setFallbackFullscreen(true) }
  }

  useEffect(() => {
    if (fullscreen || fallbackFullscreen) return
    const resize = () => fit(600, 438 + (touchControls.current?.getBoundingClientRect().height ?? 0))
    const observer = new ResizeObserver(resize)
    if (touchControls.current) observer.observe(touchControls.current)
    window.addEventListener('resize', resize)
    resize()
    return () => { observer.disconnect(); window.removeEventListener('resize', resize) }
  }, [fit, touch, fullscreen, fallbackFullscreen])
  useEffect(() => {
    const element = root.current
    if (!element) return
    const resize = () => {
      if (pocket) setTouch(true)
      const nativeFullscreen = document.fullscreenElement === element
      setFullscreen(nativeFullscreen)
      const menuHeight = element.querySelector<HTMLElement>('.gk-menubar')?.getBoundingClientRect().height ?? 22
      const availableHeight = element.clientHeight - menuHeight - (touchControls.current?.getBoundingClientRect().height ?? 0)
      const ratio = (nativeFullscreen || fallbackFullscreen) && !pocket
        ? Math.min(element.clientWidth / 600, availableHeight / 416) : 1
      element.style.setProperty('--pinball-scale', String(ratio >= 2 ? Math.floor(ratio) : Math.max(0, ratio)))
      const portraitWidth = element.querySelector<HTMLElement>('.base-cadet-porthole img, .base-cadet-silhouette')
        ?.getBoundingClientRect().width ?? 0
      const portraitPixels = portraitWidth * window.devicePixelRatio
      setPortraitSize(portraitPixels > 0 ? portraitPixels <= 128 ? 128 : portraitPixels <= 320 ? 320 : 600 : null)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    if (touchControls.current) observer.observe(touchControls.current)
    window.addEventListener('resize', resize)
    document.addEventListener('fullscreenchange', resize)
    resize()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('fullscreenchange', resize)
    }
  }, [touch, fallbackFullscreen, pocket])
  useEffect(() => { redraw() }, [revision, canvas])
  useEffect(() => {
    if (active && !hidden && paused && !menuOpen && !dialog && !scoreQueue.length && !replayOffer) canvas.ref.current?.focus({ preventScroll: true })
    if (!active || hidden) { setPaused(true); clearInputs() }
  }, [active, hidden])
  useEffect(() => {
    if (active && !hidden && !paused && !menuOpen && !dialog && !scoreQueue.length && !replayOffer) canvas.ref.current?.focus({ preventScroll: true })
  }, [active, hidden, paused, menuOpen, dialog, scoreQueue.length, replayOffer])
  useEffect(() => { if (menuOpen || dialog || scoreQueue.length) clearInputs() }, [menuOpen, dialog, scoreQueue.length])
  useEffect(() => {
    if (hidden || !active || suspended) stopPinballAudio()
    setPinballMusic(options.music && !muted && !hidden && active && !suspended, !!game.mission)
  }, [options.music, muted, hidden, active, suspended, !!game.mission])
  useEffect(() => {
    if (!portraitSize) return
    let cancelled = false
    loadRemy(player.remy, portraitSize).then((image) => { if (!cancelled) setPortrait(image.src) }).catch(() => {})
    return () => { cancelled = true }
  }, [player.remy, portraitSize])
  useEffect(() => {
    let cancelled = false
    loadCabald().then(async (indices) => {
      const portraits = await Promise.all(indices.slice(0, 3).map((index) => loadRemy(index, 128)))
      if (!cancelled) { art.current.bumpers = portraits; redraw() }
    }).catch(() => {})
    cabaldRemy(67).then((index) => loadRemy(index, 128)).then((image) => {
      if (!cancelled) { art.current.rugLord = image; redraw() }
    }).catch(() => {})
    return () => { cancelled = true; staticLayer.current = null; art.current.bumpers.length = 0; art.current.rugLord = undefined; stopPinballAudio() }
  }, [])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!active || hidden || menuOpen || dialog || scoreQueue.length || replayOffer
        || /^(INPUT|SELECT|TEXTAREA)$/.test((event.target as HTMLElement)?.tagName)) return
      unlockAudio()
      if (demo) { setDemo(false); newGame(); return }
      if (paused && !/^F\d+$/.test(event.key)) { event.preventDefault(); setPaused(false); return }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        cheat.current = (cheat.current + event.key.toLowerCase()).slice(-11)
        if (cheat.current === 'hidden test') { enableTestMode(gameRef.current); refresh((n) => n + 1) }
      }
      const action = controlForKey(options.controls, event.key)
      if (!action) return
      event.preventDefault()
      if (event.repeat) return
      if (action === 'left' || action === 'right') pressFlipper(action)
      else if (action === 'plunger') pressPlunger()
      else nudge(action === 'nudgeLeft' ? 'left' : action === 'nudgeRight' ? 'right' : 'up')
    }
    const up = (event: KeyboardEvent) => {
      const action = controlForKey(options.controls, event.key)
      if (action === 'left' || action === 'right') {
        inputs.current[action] = false
        applyFlipperInput(physicsRef.current, inputs.current.left, inputs.current.right)
        redraw()
        refresh((n) => n + 1)
      }
      else if (action === 'plunger') releasePlunger()
    }
    const blur = () => { clearInputs(); setPaused(true) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [active, hidden, menuOpen, dialog, scoreQueue.length, replayOffer, options.controls, paused, demo, suspended])

  useAnimationFrame((dt, now) => {
    const g = gameRef.current
    const p = physicsRef.current
    const input = inputs.current
    if (input.plunger) { input.pull = Math.min(0.8, input.pull + dt); p.plunger = input.pull / 0.8 }
    if (demo && g.phase === 'ready') { launchRules(g); launchBall(p, 0.85) }
    tickRules(g, dt)
    p.tilted = g.tilted
    p.postRaised = g.postRaisedUntil > g.time
    p.dropTargets = g.dropTargets
    p.gates = g.outlaneSave
    let left = input.left
    let right = input.right
    if (demo) {
      const ai = demoFlippers.current
      // Tap descending balls near the flippers, then allow a full release instead of holding a permanent cradle.
      if (p.ball.active && p.ball.layer === 0 && p.ball.vy > 0 && p.ball.y > FLIPPERS[0].y - 60 && p.ball.y < FLIPPERS[0].y + 10) {
        if (p.ball.x > FLIPPERS[0].x - 35 && p.ball.x < 205 && g.time >= ai.leftReadyAt) {
          ai.leftUntil = g.time + DEMO_FLIPPER_PULSE
          ai.leftReadyAt = ai.leftUntil + DEMO_FLIPPER_RELEASE
        }
        if (p.ball.x > 150 && p.ball.x < FLIPPERS[1].x + 35 && g.time >= ai.rightReadyAt) {
          ai.rightUntil = g.time + DEMO_FLIPPER_PULSE
          ai.rightReadyAt = ai.rightUntil + DEMO_FLIPPER_RELEASE
        }
      }
      left = g.time < ai.leftUntil
      right = g.time < ai.rightUntil
    }
    if (input.drag >= 0 || input.dragPending) advanceDrag(p, dt, left, right)
    else stepPhysics(p, dt, left, right)
    if (p.reseated && reseatBall(g)) refresh((n) => n + 1)
    for (let i = 0; i < p.eventCount; i++) {
      const event = EVENT_NAMES[p.contacts[i * 2]]
      const index = p.contacts[i * 2 + 1]
      if (event === 'drain') {
        const saved = drainBall(g)
        sound(saved ? 'ball-saved' : 'drain')
        resetBall(p)
        if (saved) { launchRules(g); launchBall(p, 0.92) }
        if (g.phase === 'over') {
          if (demo) { newGame(true); return }
          setScoreQueue(highScoreCandidates(g).filter((candidate) => qualifiesHighScore(options.scores, candidate.score, g.testMode)))
        }
      } else if (event && event !== 'launch') {
        hit(g, event as TableEvent, index)
        sound(event === 'bumper' || event === 'satellite' ? 'bumper' : event === 'rebound' ? 'slingshot' : event === 'drop' ? 'drop'
          : event === 'wormhole' || event === 'hyperspace' || event === 'ramp' || event === 'spinner' ? event
          : event === 'blackhole' ? 'black-hole' : event === 'spot' || event === 'engine' || event.endsWith('Hazard') ? 'target' : 'rollover', g.bumperLevel)
      }
    }
    p.eventCount = 0
    input.dragPending = false
    if (g.messageSerial !== lastMessage.current) {
      lastMessage.current = g.messageSerial
      const cue = g.messageId === 'accepted' ? 'mission' : ['completed', 'recoveryCompleted', 'cabaldCompleted'].includes(g.messageId) ? 'mission-complete'
        : g.messageId === 'extraBall' ? 'extra' : g.messageId === 'lowFuel' ? 'fuel-low' : g.messageId
      if (['promotion', 'mission-complete', 'mission', 'extra', 'replay', 'fuel-low', 'tilt'].includes(cue)) sound(cue)
      refresh((n) => n + 1)
    } else if (now - lastPanel.current >= 100) { lastPanel.current = now; refresh((n) => n + 1) }
    redraw()
  }, { paused: suspended || (game.phase === 'ready' && inputs.current.drag < 0 && !inputs.current.dragPending
    && !inputs.current.plunger && !inputs.current.left && !inputs.current.right && !demo
    && physics.leftAngle === FLIPPERS[0].rest && physics.rightAngle === FLIPPERS[1].rest), maxDt: 0.05 })

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * 375 / rect.width, y: (event.clientY - rect.top) * 416 / rect.height }
  }
  const releasePointer = (event: React.PointerEvent<HTMLElement>) => {
    const side = pointers.current.get(event.pointerId)
    pointers.current.delete(event.pointerId)
    if (side === 'plunger') releasePlunger()
    else if (side) {
      inputs.current[side] = false
      for (const held of pointers.current.values()) if (held === side) { inputs.current[side] = true; break }
      applyFlipperInput(physicsRef.current, inputs.current.left, inputs.current.right)
      redraw()
    }
    if (inputs.current.drag === event.pointerId) inputs.current.drag = -1
    refresh((n) => n + 1)
  }

  return <div className={`pinball-app${fallbackFullscreen ? ' pinball-fullviewport' : ''}`} ref={root}
    onPointerDownCapture={(event) => { unlockAudio(); setTouch(event.pointerType === 'touch' || pocket) }}
    onKeyDownCapture={() => { unlockAudio(); setTouch(pocket) }}>
    <GameMenuBar onOpenChange={setMenuOpen} disabled={!!dialog || !!scoreQueue.length || replayOffer} menus={[
      { label: S.game, items: [
        { label: S.newGame, hotkey: 'F2', onClick: () => newGame() },
        { label: S.launch, hotkey: 'Space', accel: false, onClick: launchCommand },
        { label: S.pause, hotkey: 'F3', onClick: () => { clearInputs(); setPaused((value) => !value) } }, '-',
        { label: S.highScores, onClick: () => setDialog('scores') }, { label: S.demo, onClick: () => newGame(true) }, '-',
        { label: S.exit, onClick: close },
      ] },
      { label: S.options, items: [
        { label: S.fullScreen, hotkey: 'F4', onClick: fullScreen },
        { label: S.players, items: [1, 2, 3, 4].map((count) => ({ label: S.playerItem[count - 1], radio: true, checked: options.players === count,
          onClick: () => {
            updateOptions({ players: count }); gameRef.current = createGame(count); resetBall(physicsRef.current)
            clearInputs(); setPaused(false); setDemo(false); setReplayDismissed(false); refresh((n) => n + 1)
          } })) },
        { label: S.controls, hotkey: 'F8', onClick: () => { setDraftControls({ ...options.controls }); setDialog('controls') } }, '-',
        { label: S.sound, checked: !muted, onClick: () => setMuted(!muted) },
        { label: S.music, checked: options.music, onClick: () => updateOptions({ music: !options.music }) },
        { label: S.chooseRemy, onClick: () => setDialog('remy') },
      ] },
      { label: S.help, items: [{ label: S.contents, hotkey: 'F1', onClick: () => setDialog('help') }, '-',
        { label: S.about, onClick: () => setDialog('about') }] },
    ]} />
    <div className="pinball-stage" onPointerDown={(event) => {
      if (event.pointerType !== 'touch' || (event.target as HTMLElement).closest('button')) return
      if (paused) { setPaused(false); return }
      if (demo) { newGame(); return }
      if (suspended || !active) return
      event.currentTarget.setPointerCapture(event.pointerId)
      const stageRect = event.currentTarget.getBoundingClientRect()
      const tableRect = canvas.ref.current?.getBoundingClientRect()
      const tableX = tableRect ? (event.clientX - tableRect.left) * 375 / tableRect.width : -1
      const tableY = tableRect ? (event.clientY - tableRect.top) * 416 / tableRect.height : -1
      const side = tableX > 300 && tableX < 375 && tableY > 345 && tableY < 416 && game.phase === 'ready'
        ? 'plunger' : event.clientX < stageRect.left + stageRect.width / 2 ? 'left' : 'right'
      pointers.current.set(event.pointerId, side)
      if (side === 'plunger') {
        inputs.current.swipeY = event.clientY
        inputs.current.swipeDistance = 0
        pressPlunger()
      } else pressFlipper(side)
    }} onPointerMove={(event) => {
      if (event.pointerType !== 'touch' || pointers.current.get(event.pointerId) !== 'plunger') return
      const input = inputs.current
      input.swipeDistance = Math.max(input.swipeDistance, input.swipeY - event.clientY)
      input.pull = Math.min(0.8, Math.max(input.pull, input.swipeDistance * 0.8 / 120))
      physicsRef.current.plunger = input.pull / 0.8
      redraw()
    }} onPointerUp={(event) => { if (event.pointerType === 'touch') releasePointer(event) }}
      onPointerCancel={(event) => { if (event.pointerType === 'touch') releasePointer(event) }}
      onLostPointerCapture={(event) => { if (event.pointerType === 'touch') releasePointer(event) }}>
      <div className="pinball-playfield"><div className="pinball-table-wrap">
        <canvas ref={canvas.ref} className="pinball-table" tabIndex={0} role="application" aria-label={S.title}
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch') return
            unlockAudio()
            if (paused) { setPaused(false); return }
            if (demo) { newGame(); return }
            if (suspended) return
            event.currentTarget.setPointerCapture(event.pointerId)
            const position = pointerPosition(event)
            if (game.testMode && event.button === 0) {
              inputs.current.drag = event.pointerId
              if (game.phase === 'ready') launchRules(game)
              dragBall(physics, position.x, position.y)
              inputs.current.dragPending = true
              redraw()
              refresh((n) => n + 1)
              return
            }
          }}
          onPointerMove={(event) => {
            if (inputs.current.drag === event.pointerId && game.testMode) {
              const position = pointerPosition(event)
              if (gameRef.current.phase === 'ready') launchRules(gameRef.current)
              dragBall(physics, position.x, position.y)
              inputs.current.dragPending = true
              redraw()
            }
          }} onPointerUp={(event) => { if (event.pointerType !== 'touch') releasePointer(event) }}
            onPointerCancel={(event) => { if (event.pointerType !== 'touch') releasePointer(event) }}
            onLostPointerCapture={(event) => { if (event.pointerType !== 'touch') releasePointer(event) }} />
        {paused && <div className="pinball-pause"><span>{S.paused}</span><button onClick={() => setPaused(false)}>{S.resume}</button></div>}
      </div></div>
      <div className="pinball-panel-wrap"><Panel score={game.player.score} player={game.currentPlayer + 1} ball={game.ball} rank={RANKS[game.player.rank]}
        rankIndex={game.player.rank} message={panelMessage} goal={panelGoal} portrait={portrait}
        paused={paused} testMode={game.testMode && !game.tilted} fuel={game.fuel} multiplier={game.multiplier} /></div>
    </div>
    {touch && <div className="pinball-touch" ref={touchControls}>
      <button aria-label={S.controlLabels.nudgeLeft} onClick={() => nudge('left')}>←</button>
      <button aria-label={S.controlLabels.nudgeUp} onClick={() => nudge('up')}>↑</button>
      <button aria-label={S.controlLabels.nudgeRight} onClick={() => nudge('right')}>→</button>
      <button onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pressPlunger() }}
        onPointerUp={releasePlunger} onPointerCancel={releasePlunger}>{S.touchPlunger}</button>
    </div>}
    <span className="pinball-live" aria-live="polite">{panelMessage} {game.tilted ? '' : missionName(game)} {panelGoal}
      {' '}{PANEL_COPY.score}: {game.player.score.toLocaleString('en-US')}</span>
    {dialog === 'help' && <GameDialog title={S.helpTitle} onClose={() => setDialog(null)} width={470}>
      <div className="pinball-help-tabs" role="tablist">{S.helpTabs.map((label, index) => <button key={label} role="tab" aria-selected={index === helpTab}
        onClick={() => setHelpTab(index)}>{label}</button>)}</div><div className="pinball-help-copy" role="tabpanel">{S.helpTexts[helpTab]}</div>
    </GameDialog>}
    {dialog === 'about' && <AboutDialog game={S.title} icon={icon} version="5.1 (Build 2600.remy_sp2.4490)" flavour={S.aboutFlavour}
      lines={[...S.aboutLines]} onClose={() => setDialog(null)} />}
    {dialog === 'scores' && <BestScoresDialog title={S.highScoresTitle} heading={S.highScoresHeading} nameFirst
      headings={{ label: S.rankHeader, name: S.nameHeader, score: S.scoreHeader }} rows={Array.from({ length: 5 }, (_, index) => {
      const score = options.scores[index]
      return { label: String(index + 1), name: score?.name, score: score?.score ?? null }
    })} format={(score) => score.toLocaleString('en-US')} onReset={() => updateOptions({ scores: [] })} onClose={() => setDialog(null)} />}
    {dialog === 'remy' && <ChooseRemyDialog onClose={() => setDialog(null)} />}
    {dialog === 'controls' && <GameDialog title={S.controlsTitle} onClose={() => { setDialog(null); setMappingAction(null) }} buttons={[
      { label: S.ok, default: true, onClick: () => { updateOptions({ controls: draftControls }); setDialog(null); setMappingAction(null) } },
      { label: S.cancel, cancel: true, onClick: () => { setDialog(null); setMappingAction(null) } },
    ]} onKeyDownCapture={(event) => {
      if (!mappingAction) return
      event.preventDefault(); event.stopPropagation()
      if (event.key === 'Escape') { setMappingAction(null); setMappingError(false); return }
      const key = normalizeKey(event.key)
      if (/^F\d+$/.test(key) || ['Alt', 'Control', 'Meta', 'Shift', 'Tab'].includes(key)
        || CONTROL_ACTIONS.some((action) => action !== mappingAction && draftControls[action] === key)) { setMappingError(true); return }
      setDraftControls({ ...draftControls, [mappingAction]: key }); setMappingAction(null); setMappingError(false)
    }}><div className="pinball-controls">
      {CONTROL_ACTIONS.map((action) => <div className="pinball-control-row" key={action}><span>{S.controlLabels[action]}</span>
        <button onClick={() => { setMappingAction(action); setMappingError(false) }}>{mappingAction === action ? S.keyPrompt
          : S.keyNames[draftControls[action]]
            ?? (draftControls[action].length === 1 ? draftControls[action].toUpperCase() : draftControls[action])}</button></div>)}
      {mappingError && <p role="alert">{S.duplicateKey}</p>}
      <button onClick={() => { setDraftControls({ ...DEFAULT_CONTROLS }); setMappingAction(null) }}>{S.defaults.replace('&', '')}</button>
    </div></GameDialog>}
    {scoreQueue.length > 0 && <NameEntryDialog title={S.nameEntryTitle} level={RANKS[scoreQueue[0].rank]}
      message={`${S.gameOver} ${scoreQueue[0].score.toLocaleString('en-US')}`} onSubmit={(name) => {
        const score = scoreQueue[0]
        const scores = recordHighScore(options.scores, name, score.score, score.rank, game.testMode)
        updateOptions({ scores })
        setScoreQueue((queue) => queue.slice(1).filter((candidate) => qualifiesHighScore(scores, candidate.score, game.testMode)))
      }} onCancel={() => setScoreQueue((queue) => queue.slice(1))} />}
    {replayOffer && <GameDialog title={S.replayTitle} onClose={() => setReplayDismissed(true)} buttons={[
      { label: S.playReplay.replace('&', ''), default: true, onClick: playReplay },
      { label: S.notNow, cancel: true, onClick: () => setReplayDismissed(true) },
    ]}><p>{S.replayMessage}</p><p>{S.replayCredits} {game.replays}</p></GameDialog>}
  </div>
}
