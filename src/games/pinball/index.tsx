import { useEffect, useRef, useState } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, BestScoresDialog, ChooseRemyDialog, GameDialog, GameMenuBar, NameEntryDialog,
  cabaldRemy, loadCabald, loadGame, loadRemy, saveGame, unlockAudio, useAnimationFrame, useCrispCanvas,
  useGamesMuted, useGamesPlayer, useWindowFit, useWindowState,
} from '../kit'
import { Panel } from './Panel'
import { CONTROL_ACTIONS, DEFAULT_CONTROLS, controlForKey, normalizeKey, validControls, type Controls } from './controls'
import { createPhysics, launchBall, nudgePhysics, resetBall, stepPhysics } from './physics'
import { EVENT_NAMES, FLIPPERS } from './geometry'
import { createTableLayer, drawTable } from './render'
import {
  createGame, drainBall, enableTestMode, highScoreCandidates, hit, launchRules, missionGoal, missionName, nudgeRules,
  qualifiesHighScore, recordHighScore, RANKS, rotateReentry, sanitizeHighScores, tickRules, type HighScore, type TableEvent,
} from './rules'
import { setPinballMusic, sound, stopPinballAudio } from './audio'
import { PANEL_COPY, STRINGS as S } from './strings'
import icon from './icon'
import './pinball.css'

type Options = { players: number; music: boolean; controls: Controls; scores: HighScore[] }
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
  const [touch, setTouch] = useState(() => window.innerWidth < 720)
  const [portrait, setPortrait] = useState<string>()
  const [scoreQueue, setScoreQueue] = useState<{ player: number; score: number; rank: number }[]>([])
  const { player } = useGamesPlayer()
  const { muted, setMuted } = useGamesMuted()
  const { active, hidden } = useWindowState()
  const fit = useWindowFit()
  const root = useRef<HTMLDivElement>(null)
  const inputs = useRef({ left: false, right: false, plunger: false, pull: 0, drag: -1, swipeY: 0 })
  const pointers = useRef(new Map<number, 'left' | 'right' | 'plunger'>())
  const staticLayer = useRef<HTMLCanvasElement | null>(null)
  const art = useRef<{ bumpers: HTMLImageElement[]; rugLord?: HTMLImageElement }>({ bumpers: [] })
  const cheat = useRef('')
  const lastPanel = useRef(0)
  const lastMessage = useRef(-1)
  const game = gameRef.current
  const physics = physicsRef.current
  const canvas = useCrispCanvas(375, 416, { onResize: (scale) => { staticLayer.current = createTableLayer(scale) } })
  const suspended = paused || menuOpen || !!dialog || scoreQueue.length > 0 || game.phase === 'over'

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
    pointers.current.clear()
  }
  const newGame = (attract = false) => {
    gameRef.current = createGame(options.players)
    resetBall(physicsRef.current)
    clearInputs()
    setPaused(false)
    setDemo(attract)
    setScoreQueue([])
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
  const fullScreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void root.current?.requestFullscreen().catch(() => {})
  }

  useEffect(() => { fit(600, 438) }, [fit])
  useEffect(() => {
    const resize = () => {
      if (!root.current) return
      if (window.innerWidth < 720) setTouch(true)
      const fullscreen = document.fullscreenElement === root.current
      const ratio = fullscreen && window.innerWidth >= 720 ? Math.min(window.innerWidth / 600, (window.innerHeight - 28) / 416) : 1
      root.current.style.setProperty('--pinball-scale', String(ratio >= 1 ? Math.floor(ratio) : ratio))
    }
    window.addEventListener('resize', resize)
    document.addEventListener('fullscreenchange', resize)
    resize()
    return () => { window.removeEventListener('resize', resize); document.removeEventListener('fullscreenchange', resize) }
  }, [])
  useEffect(() => { redraw() }, [revision, canvas])
  useEffect(() => {
    if (active && !hidden) canvas.ref.current?.focus({ preventScroll: true })
    if (!active || hidden) { setPaused(true); clearInputs() }
  }, [active, hidden])
  useEffect(() => { if (menuOpen || dialog || scoreQueue.length) clearInputs() }, [menuOpen, dialog, scoreQueue.length])
  useEffect(() => {
    if (hidden || !active || suspended) stopPinballAudio()
    setPinballMusic(options.music && !muted && !hidden && active && !suspended, !!game.mission)
  }, [options.music, muted, hidden, active, suspended, !!game.mission])
  useEffect(() => {
    let cancelled = false
    loadRemy(player.remy, 128).then((image) => { if (!cancelled) setPortrait(image.src) }).catch(() => {})
    return () => { cancelled = true }
  }, [player.remy])
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
      if (!active || hidden || menuOpen || dialog || scoreQueue.length || /^(INPUT|SELECT|TEXTAREA)$/.test((event.target as HTMLElement)?.tagName)) return
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
      if (action === 'left' || action === 'right') {
        inputs.current[action] = true
        rotateReentry(gameRef.current, action === 'left' ? -1 : 1)
        sound('flipper')
        refresh((n) => n + 1)
      }
      else if (action === 'plunger') pressPlunger()
      else nudge(action === 'nudgeLeft' ? 'left' : action === 'nudgeRight' ? 'right' : 'up')
    }
    const up = (event: KeyboardEvent) => {
      const action = controlForKey(options.controls, event.key)
      if (action === 'left' || action === 'right') { inputs.current[action] = false; refresh((n) => n + 1) }
      else if (action === 'plunger') releasePlunger()
    }
    const blur = () => { clearInputs(); setPaused(true) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [active, hidden, menuOpen, dialog, scoreQueue.length, options.controls, paused, demo, suspended])

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
    stepPhysics(p, dt, demo ? p.ball.x < 205 && p.ball.y > 270 : input.left, demo ? p.ball.x > 150 && p.ball.y > 270 : input.right)
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
    if (g.messageSerial !== lastMessage.current) {
      lastMessage.current = g.messageSerial
      const cue = g.messageId === 'accepted' ? 'mission' : ['completed', 'recoveryCompleted', 'cabaldCompleted'].includes(g.messageId) ? 'mission-complete'
        : g.messageId === 'extraBall' ? 'extra' : g.messageId === 'lowFuel' ? 'fuel-low' : g.messageId
      if (['promotion', 'mission-complete', 'mission', 'extra', 'replay', 'fuel-low', 'tilt'].includes(cue)) sound(cue)
      refresh((n) => n + 1)
    } else if (now - lastPanel.current >= 100) { lastPanel.current = now; refresh((n) => n + 1) }
    redraw()
  }, { paused: suspended || (game.phase === 'ready' && !inputs.current.plunger && !inputs.current.left && !inputs.current.right && !demo
    && physics.leftAngle === FLIPPERS[0].rest && physics.rightAngle === FLIPPERS[1].rest), maxDt: 0.05 })

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * 375 / rect.width, y: (event.clientY - rect.top) * 416 / rect.height }
  }
  const releasePointer = (event: React.PointerEvent<HTMLElement>) => {
    const side = pointers.current.get(event.pointerId)
    pointers.current.delete(event.pointerId)
    if (side === 'plunger') releasePlunger()
    else if (side) inputs.current[side] = [...pointers.current.values()].includes(side)
    if (inputs.current.drag === event.pointerId) inputs.current.drag = -1
    refresh((n) => n + 1)
  }

  return <div className="pinball-app" ref={root} onPointerDownCapture={() => unlockAudio()} onKeyDownCapture={() => unlockAudio()}>
    <GameMenuBar onOpenChange={setMenuOpen} disabled={!!dialog || !!scoreQueue.length} menus={[
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
            clearInputs(); setPaused(false); setDemo(false); refresh((n) => n + 1)
          } })) },
        { label: S.controls, hotkey: 'F8', onClick: () => { setDraftControls({ ...options.controls }); setDialog('controls') } }, '-',
        { label: S.sound, checked: !muted, onClick: () => setMuted(!muted) },
        { label: S.music, checked: options.music, onClick: () => updateOptions({ music: !options.music }) },
        { label: S.chooseRemy, onClick: () => setDialog('remy') },
      ] },
      { label: S.help, items: [{ label: S.contents, hotkey: 'F1', onClick: () => setDialog('help') }, '-',
        { label: S.about, onClick: () => setDialog('about') }] },
    ]} />
    <div className="pinball-stage">
      <div className="pinball-table-wrap">
        <canvas ref={canvas.ref} className="pinball-table" tabIndex={0} role="application" aria-label={S.title}
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            unlockAudio()
            if (paused) { setPaused(false); return }
            if (demo) { newGame(); return }
            if (suspended) return
            event.currentTarget.setPointerCapture(event.pointerId)
            const position = pointerPosition(event)
            if (game.testMode && event.button === 0) {
              inputs.current.drag = event.pointerId
              physics.ball.x = position.x; physics.ball.y = position.y; physics.ball.vx = physics.ball.vy = 0; physics.ball.active = true
              if (game.phase === 'ready') launchRules(game)
              return
            }
            if (event.pointerType === 'touch') {
              setTouch(true)
              const side = position.x > 300 && position.y > 345 && game.phase === 'ready' ? 'plunger' : position.x < 187.5 ? 'left' : 'right'
              pointers.current.set(event.pointerId, side)
              if (side === 'plunger') { inputs.current.swipeY = event.clientY; pressPlunger() }
              else {
                inputs.current[side] = true
                rotateReentry(gameRef.current, side === 'left' ? -1 : 1)
                sound('flipper')
                refresh((n) => n + 1)
              }
            }
          }}
          onPointerMove={(event) => {
            if (inputs.current.drag === event.pointerId && game.testMode) {
              const position = pointerPosition(event)
              physics.ball.x = Math.max(8, Math.min(367, position.x)); physics.ball.y = Math.max(8, Math.min(408, position.y))
              physics.ball.vx = physics.ball.vy = 0
            } else if (pointers.current.get(event.pointerId) === 'plunger' && inputs.current.swipeY - event.clientY > 30) {
              inputs.current.pull = Math.min(0.8, Math.max(inputs.current.pull, (inputs.current.swipeY - event.clientY) / 150))
              releasePlunger()
            }
          }} onPointerUp={releasePointer} onPointerCancel={releasePointer} onLostPointerCapture={releasePointer} />
        {paused && <div className="pinball-pause"><span>{S.paused}</span><button onClick={() => setPaused(false)}>{S.resume}</button></div>}
      </div>
      <Panel score={game.player.score} player={game.currentPlayer + 1} ball={game.ball} rank={RANKS[game.player.rank]}
        rankIndex={game.player.rank} message={game.testMode ? S.testMode : game.message} goal={missionGoal(game)} portrait={portrait}
        paused={paused} testMode={game.testMode} fuel={game.fuel} multiplier={game.multiplier} />
    </div>
    {touch && <div className="pinball-touch">
      <button aria-label={S.controlLabels.nudgeLeft} onClick={() => nudge('left')}>←</button>
      <button aria-label={S.controlLabels.nudgeUp} onClick={() => nudge('up')}>↑</button>
      <button aria-label={S.controlLabels.nudgeRight} onClick={() => nudge('right')}>→</button>
      <button onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pressPlunger() }}
        onPointerUp={releasePlunger} onPointerCancel={releasePlunger}>{S.touchPlunger}</button>
    </div>}
    <span className="pinball-live" aria-live="polite">{game.message} {missionName(game)} {missionGoal(game)} {PANEL_COPY.score}: {game.player.score.toLocaleString('en-US')}</span>
    {dialog === 'help' && <GameDialog title={S.helpTitle} onClose={() => setDialog(null)} width={470}>
      <div className="pinball-help-tabs" role="tablist">{S.helpTabs.map((label, index) => <button key={label} role="tab" aria-selected={index === helpTab}
        onClick={() => setHelpTab(index)}>{label}</button>)}</div><div className="pinball-help-copy" role="tabpanel">{S.helpTexts[helpTab]}</div>
    </GameDialog>}
    {dialog === 'about' && <AboutDialog game={S.title} icon={icon} version="5.1 (Build 2600.remy_sp2.4490)" flavour={S.aboutFlavour}
      lines={[...S.aboutLines]} onClose={() => setDialog(null)} />}
    {dialog === 'scores' && <BestScoresDialog title={S.highScoresTitle} heading={S.highScoresHeading} rows={Array.from({ length: 5 }, (_, index) => {
      const score = options.scores[index]
      return { label: `${index + 1}. ${score ? RANKS[score.rank] : ''}`, name: score?.name, score: score?.score ?? null }
    })} format={(score) => score.toLocaleString('en-US')} onReset={() => updateOptions({ scores: [] })} onClose={() => setDialog(null)} />}
    {dialog === 'remy' && <ChooseRemyDialog onClose={() => setDialog(null)} />}
    {dialog === 'controls' && <GameDialog title={S.controlsTitle} onClose={() => { setDialog(null); setMappingAction(null) }} buttons={[
      { label: S.ok, default: true, onClick: () => { updateOptions({ controls: draftControls }); setDialog(null); setMappingAction(null) } },
      { label: S.cancel, cancel: true, onClick: () => { setDialog(null); setMappingAction(null) } },
    ]}><div className="pinball-controls" onKeyDown={(event) => {
      if (!mappingAction) return
      event.preventDefault(); event.stopPropagation()
      const key = normalizeKey(event.key)
      if (/^F\d+$/.test(key) || ['Alt', 'Control', 'Meta', 'Shift', 'Escape', 'Tab'].includes(key)
        || CONTROL_ACTIONS.some((action) => action !== mappingAction && draftControls[action] === key)) { setMappingError(true); return }
      setDraftControls({ ...draftControls, [mappingAction]: key }); setMappingAction(null); setMappingError(false)
    }}>
      {CONTROL_ACTIONS.map((action) => <div className="pinball-control-row" key={action}><span>{S.controlLabels[action]}</span>
        <button onClick={() => { setMappingAction(action); setMappingError(false) }}>{mappingAction === action ? S.keyPrompt
          : draftControls[action] === ' ' ? S.spaceLabel : draftControls[action]}</button></div>)}
      {mappingError && <p role="alert">{S.duplicateKey}</p>}
      <button onClick={() => { setDraftControls({ ...DEFAULT_CONTROLS }); setMappingAction(null) }}>{S.defaults.replace('&', '')}</button>
    </div></GameDialog>}
    {scoreQueue.length > 0 && <NameEntryDialog title={S.nameEntryTitle} level={RANKS[scoreQueue[0].rank]}
      message={`${S.gameOver} ${scoreQueue[0].score.toLocaleString('en-US')}`} onSubmit={(name) => {
        const score = scoreQueue[0]
        updateOptions({ scores: recordHighScore(options.scores, name, score.score, score.rank, game.testMode) })
        setScoreQueue((queue) => queue.slice(1))
      }} onCancel={() => setScoreQueue((queue) => queue.slice(1))} />}
  </div>
}
