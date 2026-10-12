import { type KeyboardEvent, type PointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, ChooseRemyDialog, civRemy, GameDialog, GameHelpTabs, GameMenuBar, loadPalette, unlockAudio,
  useAnimationFrame, useCrispCanvas, useGamesMuted, useGamesPlayer, useWindowFit, useWindowState, type GameMenu,
} from '../kit'
import { createInput, editInput, quantizeRemyPalette, playMml, type InputLine, type MmlPlayback } from '../qbasic'
import {
  continueGame, createGame, DEATH, DOWN, EAT, GAME_OVER, LEFT, LEVEL, pauseGame, queueTurn, RIGHT, stepGame, stepInterval, UP,
  type Direction, type Game, type Options,
} from './engine'
import { beginGesture, clickContinues, moveGesture, touchForInput, type Gesture } from './gestures'
import { icon } from './icon'
import { EAT_NUMBER, END_GAME, LEVEL_START, LOSE_LIFE } from './music/phrases'
import { createPainter, type HeadColors, type Painter } from './render'
import { deathAnnouncement, eatAnnouncement, levelMessage, scoreLine, strings } from './strings'
import './nibbles.css'

type Screen = 'startup' | 'intro' | 'setup' | 'game'
type Session = {
  screen: Screen
  prompt: number
  input: InputLine
  answers: string[]
  invalid: boolean
  elapsed: number
  frame: number
  accumulated: number
  options: Options
  game: Game | null
  painter: Painter | null
  heads: HeadColors[]
  gestures: Gesture[]
  loreCount: number
  showLore: boolean
  lastSound: number
}

export default function Nibbles({ close }: AppProps) {
  const { active, hidden, pocket } = useWindowState()
  const fitWindow = useWindowFit()
  const { muted, toggleMuted } = useGamesMuted()
  const { player } = useGamesPlayer()
  const [session] = useState<Session>(() => ({
    screen: 'startup', prompt: 0, input: createInput(1), answers: [], invalid: false, elapsed: 0, frame: 0, accumulated: 0,
    options: { players: 1, skill: 50, increaseSpeed: true, monochrome: false }, game: null, painter: null,
    heads: [{ hair: 6, skin: 14 }, { hair: 0, skin: 12 }],
    gestures: [{ id: -1, x: 0, y: 0, player: 0 }, { id: -1, x: 0, y: 0, player: 0 }],
    loreCount: 0, showLore: false, lastSound: -Infinity,
  }))
  const [, refresh] = useState(0)
  const [announcement, announce] = useState(strings.startup)
  const [dialog, setDialog] = useState<'help' | 'about' | 'choose' | null>(null)
  const [helpTab, setHelpTab] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [lastTouch, setLastTouch] = useState(false)
  const touch = pocket || lastTouch
  const touchState = useRef(touch)
  touchState.current = touch
  const inputMode = (input: string) => setLastTouch((previous) => touchForInput(previous, input, false))
  const surface = useRef<HTMLDivElement>(null)
  const controls = useRef<HTMLDivElement>(null)
  const sound = useRef<MmlPlayback | null>(null)
  const redraw = useRef<() => void>(() => {})
  const lifecycle = useRef({ active, hidden, muted, dialog, menuOpen })
  lifecycle.current = { active, hidden, muted, dialog, menuOpen }
  const { ref: canvas, ctx } = useCrispCanvas(640, 400, { smoothing: false, onResize: () => redraw.current() })
  const screen = session.screen
  const phase = session.game?.phase

  const draw = () => {
    const context = ctx.current
    const painter = session.painter
    if (!context || !painter || lifecycle.current.hidden) return
    if (session.screen === 'startup') painter.startup(context)
    else if (session.screen === 'intro') painter.intro(context, session.frame, session.heads[0], touchState.current)
    else if (session.screen === 'setup') painter.setup(context, session.prompt, session.answers, session.input, session.elapsed, session.invalid)
    else if (session.game) painter.game(context, session.game, session.heads, session.showLore, touchState.current)
  }
  redraw.current = draw
  const changed = () => {
    draw()
    refresh((revision) => revision + 1)
  }
  const stopSound = () => {
    sound.current?.stop()
    sound.current = null
  }
  const phrase = (source: string, repeated = false) => {
    const state = lifecycle.current
    if (state.muted || !state.active || state.hidden || state.dialog || state.menuOpen) return
    const now = performance.now()
    if (repeated && now - session.lastSound < 40) return
    session.lastSound = now
    stopSound()
    sound.current = playMml(source)
  }
  const pause = () => {
    if (session.game && pauseGame(session.game)) {
      session.accumulated = 0
      for (const gesture of session.gestures) gesture.id = -1
      stopSound()
      announce(strings.pausedAnnouncement)
      changed()
    }
  }
  const showDialog = (next: 'help' | 'about' | 'choose') => {
    pause()
    stopSound()
    setDialog(next)
  }
  const intro = () => {
    stopSound()
    session.screen = 'intro'
    session.elapsed = 0
    session.frame = 0
    session.game = null
    announce(strings.introAnnouncement)
    changed()
  }
  const setup = () => {
    stopSound()
    session.screen = 'setup'
    session.prompt = 0
    session.input = createInput(1)
    session.answers.length = 0
    session.invalid = false
    session.elapsed = 0
    session.accumulated = 0
    session.game = null
    announce(strings.prompts[0])
    changed()
  }
  const start = () => {
    stopSound()
    session.game = createGame(Date.now() >>> 0, session.options)
    session.screen = 'game'
    session.accumulated = 0
    session.showLore = false
    announce(levelMessage(1))
    changed()
  }
  const submit = () => {
    const step = session.prompt
    const value = (session.input.value || strings.defaults[step]).toUpperCase()
    let valid = false
    if (step === 0 && /^[12]$/.test(value)) {
      session.options.players = Number(value) as 1 | 2
      valid = true
    } else if (step === 1 && /^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= 100) {
      session.options.skill = Number(value)
      valid = true
    } else if (step === 2 && /^[YN]$/.test(value)) {
      session.options.increaseSpeed = value === 'Y'
      valid = true
    } else if (step === 3 && /^[MC]$/.test(value)) {
      session.options.monochrome = value === 'M'
      valid = true
    }
    if (!valid) {
      session.invalid = true
      announce(strings.invalid[step])
      changed()
      return
    }
    session.answers[step] = value
    if (step === 3) return start()
    session.prompt++
    session.input = createInput(session.prompt === 1 ? 3 : 1)
    session.invalid = false
    session.elapsed = 0
    announce(strings.prompts[session.prompt])
    changed()
  }
  const proceed = () => {
    if (session.screen === 'startup') return intro()
    if (session.screen === 'intro') return setup()
    if (session.screen === 'setup') return submit()
    const game = session.game
    if (!game) return
    const wasReady = game.phase === 'ready'
    if (continueGame(game)) {
      session.accumulated = 0
      announce(strings.resumedAnnouncement)
      if (wasReady) phrase(LEVEL_START)
      changed()
    }
  }

  useLayoutEffect(() => {
    session.painter = createPainter()
    draw()
    return () => {
      session.painter?.dispose()
      session.painter = null
      stopSound()
    }
  }, [])

  useLayoutEffect(() => {
    const box = surface.current
    const element = canvas.current
    if (!box || !element) return
    const fit = () => {
      const available = Math.min(box.clientWidth / 640, box.clientHeight / 400)
      const scale = available >= 1 ? Math.floor(available) : Math.max(0, available)
      element.style.width = `${640 * scale}px`
      element.style.height = `${400 * scale}px`
    }
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    fit()
    return () => observer.disconnect()
  }, [canvas])

  useEffect(() => {
    const update = () => fitWindow(640, 422 + (touch && !pocket ? controls.current?.offsetHeight ?? 0 : 0))
    update()
    const observer = new ResizeObserver(update)
    if (controls.current) observer.observe(controls.current)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [fitWindow, pocket, touch, screen, phase, session.prompt])

  useEffect(() => { draw() }, [touch])

  useEffect(() => {
    let cancelled = false
    session.heads[0].hair = 6
    session.heads[0].skin = 14
    draw()
    loadPalette(player.remy).then((palette) => {
      if (cancelled) return
      const colors = quantizeRemyPalette(palette)
      session.heads[0].hair = colors.hair
      session.heads[0].skin = colors.skin
      draw()
    }).catch(() => {})
    return () => { cancelled = true }
  }, [player.remy])

  useEffect(() => {
    let cancelled = false
    civRemy(42).then((index) => loadPalette(index)).then((palette) => {
      if (cancelled) return
      const colors = quantizeRemyPalette(palette)
      session.heads[1].hair = colors.hair
      session.heads[1].skin = colors.skin
      draw()
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!active || hidden) {
      pause()
      stopSound()
      return
    }
    draw()
    if (!dialog && !menuOpen) surface.current?.focus({ preventScroll: true })
  }, [active, hidden, dialog, menuOpen, screen, phase])

  useEffect(() => {
    const blur = () => pause()
    window.addEventListener('blur', blur)
    return () => window.removeEventListener('blur', blur)
  }, [])

  useEffect(() => {
    if (muted) stopSound()
  }, [muted])

  // Startup freezes its remaining 600 ms while hidden, inactive, or in a menu/dialog.
  useEffect(() => {
    if (!active || hidden || dialog || menuOpen || screen !== 'startup') return
    const began = performance.now()
    const timer = window.setTimeout(intro, Math.max(0, 600 - session.elapsed))
    return () => {
      window.clearTimeout(timer)
      if (session.screen === 'startup') session.elapsed += performance.now() - began
    }
  }, [screen, active, hidden, dialog, menuOpen])

  // Neither a paused game nor a ready/game-over box owns an animation loop.
  useEffect(() => {
    if (!active || hidden || dialog || menuOpen) return
    if (screen !== 'intro' && screen !== 'setup') return
    if (screen === 'intro' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const interval = screen === 'intro' ? 120 : 1000 * 16 / 60
    const timer = window.setInterval(() => {
      session.elapsed += interval
      session.frame++
      draw()
    }, interval)
    return () => window.clearInterval(timer)
  }, [screen, active, hidden, dialog, menuOpen])

  useAnimationFrame((dt) => {
    const game = session.game
    if (!game || game.phase !== 'playing') return
    session.accumulated += dt * 1000
    const interval = stepInterval(game.options.skill, game.level, game.options.increaseSpeed)
    let moved = false
    while (session.accumulated >= interval && game.phase === 'playing') {
      session.accumulated -= interval
      const result = stepGame(game)
      moved = true
      if (result & DEATH) {
        announce(deathAnnouncement(game))
        phrase(LOSE_LIFE)
        if (result & GAME_OVER) {
          session.showLore = game.level > 3 && session.loreCount < 2
          if (session.showLore) session.loreCount++
          const deathSound = sound.current
          deathSound?.done.then(() => {
            if (sound.current === deathSound && session.game === game && game.phase === 'over') phrase(END_GAME)
          })
        }
        changed()
      } else if (result & EAT) {
        announce(eatAnnouncement(game) + (result & LEVEL ? ` ${levelMessage(game.level)}` : ''))
        phrase(EAT_NUMBER, true)
        changed()
      }
    }
    if (moved) draw()
  }, { paused: screen !== 'game' || phase !== 'playing' || !!dialog || menuOpen })

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!active || hidden || dialog || menuOpen || event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.target instanceof HTMLInputElement) return
    if (event.key === 'Tab' || event.key === 'F1' || event.key === 'F2' || event.key === 'F10') return
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return
    let handled = false
    if (session.screen === 'startup' || session.screen === 'intro') {
      proceed()
      handled = true
    } else if (session.screen === 'setup') {
      const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
      const edited = editInput(session.input, key, session.prompt <= 1 ? /[0-9]/ : /[A-Z]/)
      if (edited.submitted) submit()
      else if (edited.handled) {
        session.input = edited.input
        session.invalid = false
        changed()
      }
      handled = edited.handled
    } else if (session.game) {
      const game = session.game
      const key = event.key.toLowerCase()
      if (game.phase === 'over' && (key === 'y' || key === 'n')) {
        if (key === 'y') start()
        else intro()
        handled = true
      } else if (key === 'p') {
        pause()
        handled = true
      } else if (key === ' ') {
        proceed()
        handled = true
      } else {
        let direction: Direction | undefined
        let player = 0
        if (key === 'arrowup') direction = UP
        else if (key === 'arrowright') direction = RIGHT
        else if (key === 'arrowdown') direction = DOWN
        else if (key === 'arrowleft') direction = LEFT
        else if (key === 'w') {
          direction = UP
          player = 1
        } else if (key === 'd') {
          direction = RIGHT
          player = 1
        } else if (key === 's') {
          direction = DOWN
          player = 1
        } else if (key === 'a') {
          direction = LEFT
          player = 1
        }
        if (direction !== undefined) {
          if (!event.repeat) queueTurn(game, player, direction)
          handled = true
        }
      }
    }
    if (handled) event.preventDefault()
  }

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!active || hidden || dialog || menuOpen) return
    event.preventDefault()
    surface.current?.focus({ preventScroll: true })
    if (clickContinues(session.screen)) return
    const game = session.game
    if (!game) return
    const rect = canvas.current?.getBoundingClientRect()
    if (!rect) return
    if (beginGesture(game, session.gestures, event.pointerId, event.clientX, event.clientY, rect.left + rect.width / 2, proceed)) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!active || hidden || dialog || menuOpen || !session.game) return
    if (moveGesture(session.game, session.gestures, event.pointerId, event.clientX, event.clientY)) event.preventDefault()
  }
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointerMove(event)
    for (const gesture of session.gestures) if (gesture.id === event.pointerId) gesture.id = -1
  }

  const menus: GameMenu[] = [
    { label: strings.game, items: [
      { label: strings.new, hotkey: strings.newKey, onClick: setup },
      { label: strings.pause, hotkey: strings.pauseKey, accel: false, checked: phase === 'paused',
        disabled: phase !== 'playing' && phase !== 'paused', onClick: () => session.game?.phase === 'paused' ? proceed() : pause() },
      '-', { label: strings.sound, checked: !muted, onClick: toggleMuted }, '-', { label: strings.exit, onClick: close },
    ] },
    { label: strings.options, items: [{ label: strings.choose, onClick: () => showDialog('choose') }] },
    { label: strings.help, items: [
      { label: strings.contents, hotkey: strings.helpKey, onClick: () => showDialog('help') },
      '-', { label: strings.about, onClick: () => showDialog('about') },
    ] },
  ]

  return (
    <div className="qbasic-client nibbles-client" onKeyDown={keyDown}
      onPointerDownCapture={(event) => { unlockAudio(); inputMode(event.pointerType) }}
      onKeyDownCapture={() => { unlockAudio(); inputMode('keyboard') }}>
      <GameMenuBar className="nibbles-menu" menus={menus} onOpenChange={(open) => {
        if (open) {
          pause()
          stopSound()
        }
        setMenuOpen(open)
      }} />
      {touch && screen === 'game' && session.game && <div className="nibbles-phone-score" aria-label={strings.scoreLabel}>
        {session.game.snakes.length === 2 && <span>{scoreLine(session.game, 1).trim()}</span>}
        <span>{scoreLine(session.game, 0).trim()}</span>
      </div>}
      <div ref={surface} className="qbasic-letterbox" tabIndex={0} role="application" aria-label={strings.title}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
        onClick={() => { if (active && !hidden && !dialog && !menuOpen && clickContinues(session.screen)) proceed() }}
        onPointerCancel={(event) => { for (const gesture of session.gestures) if (gesture.id === event.pointerId) gesture.id = -1 }}
        onContextMenu={(event) => event.preventDefault()}>
        <canvas ref={canvas} width={640} height={400} aria-label={strings.description} />
      </div>
      {touch && <div ref={controls} className="qbasic-touch-controls nibbles-controls">
        {screen === 'setup' ? <form onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}>
          <label>{strings.prompts[session.prompt]}
            <input aria-label={strings.setupLabel} value={session.input.value} maxLength={session.input.maxLength}
              inputMode={session.prompt <= 1 ? 'numeric' : 'text'} autoComplete="off"
              onChange={(event) => {
                session.input = createInput(session.input.maxLength, event.target.value.toUpperCase())
                session.invalid = false
                changed()
              }} />
          </label>
          <button type="submit">{strings.enter}</button>
        </form> : phase === 'over' ? <>
          <button onClick={start}>{strings.yes}</button><button onClick={intro}>{strings.no}</button>
        </> : <>
          {screen === 'game' && phase === 'playing' && <span className="nibbles-swipe-label">
            {session.options.players === 2 ? <>{strings.jakeTouch}<br />{strings.remyTouch}</> : strings.swipeTouch}
          </span>}
          <button onClick={phase === 'playing' ? pause : proceed}>{phase === 'playing' ? strings.pauseButton : strings.continueButton}</button>
        </>}
      </div>}
      <div className="qbasic-live" aria-live="polite" aria-atomic="true">{announcement}</div>
      {dialog === 'choose' && <ChooseRemyDialog onClose={() => setDialog(null)} />}
      {dialog === 'about' && <AboutDialog game={strings.title} icon={icon} version={strings.version}
        flavour={strings.flavour} lines={strings.aboutLines} onClose={() => setDialog(null)} />}
      {dialog === 'help' && <GameDialog title={strings.helpTitle} width={440} onClose={() => setDialog(null)}>
        <GameHelpTabs tabs={strings.helpTabs} selected={helpTab} onChange={setHelpTab} label={strings.helpTitle}>
          <p>{strings.helpSections[helpTab]}</p>
        </GameHelpTabs>
      </GameDialog>}
    </div>
  )
}
