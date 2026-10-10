import { useEffect, useRef, useState } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, ChooseRemyDialog, GameDialog, GameMenuBar, cabaldRemy, civRemy, loadPalette, unlockAudio,
  useAnimationFrame, useCrispCanvas, useGamesMuted, useGamesPlayer, useWindowFit, useWindowState,
} from '../kit'
import { createInput, editInput, playMml, type MmlPlayback } from '../qbasic'
import {
  FIXED_DT, FLIGHT_RATE, chooseCpuThrow, createMatch, finishDance, finishExplosion, finishThrow, launchMatch, stepShot,
} from './engine'
import { CABALD_PALETTE, CIVILIAN_PALETTE, HERO_PALETTE, createSkylineLayer, drawScreen, quantizePalette, type RenderView } from './render'
import { createSetup, submitSetup } from './setup'
import { MML, STRINGS as S } from './strings'
import icon from './icon'
import './gorillas.css'

export default function Gorillas({ close }: AppProps) {
  const [view] = useState<RenderView>(() => ({
    screen: 'dos', clock: 0, input: createInput(), setupStep: 0, setupValues: [], names: [S.player1, S.player2],
    prompt: 'angle', angle: '', error: '', paused: false, cpu: false, cabaldMessage: true, match: createMatch(Date.now()),
    palettes: [HERO_PALETTE, CIVILIAN_PALETTE], skyline: null,
  }))
  const [setup] = useState(createSetup)
  const [revision, refresh] = useState(0)
  const [touch, setTouch] = useState(() => window.innerWidth < 720)
  const [dialog, setDialog] = useState<'help' | 'about' | 'remy' | 'confirm' | null>(null)
  const [helpTab, setHelpTab] = useState(0)
  const [live, announce] = useState<string>(S.title)
  const { player } = useGamesPlayer()
  const [muted, setMuted] = useGamesMuted()
  const { active, hidden } = useWindowState()
  const fit = useWindowFit()
  const surface = useRef<HTMLDivElement>(null)
  const nativeInput = useRef<HTMLInputElement>(null)
  const audio = useRef<MmlPlayback | null>(null)
  const accumulator = useRef(0)
  const cpuWait = useRef(0)
  const denials = useRef(0)
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const canvas = useCrispCanvas(640, 350, { onResize: () => redraw() })
  const phase = view.match.phase
  const animated = view.screen === 'dos' || view.screen === 'intro' || view.screen === 'preview'
    || view.screen === 'play' && (phase === 'flight' || phase === 'explosion' || phase === 'dance')

  function redraw() {
    if (canvas.ctx.current) drawScreen(canvas.ctx.current, view)
  }
  function changed(message?: string) {
    refresh((n) => n + 1)
    if (message) announce(message)
    redraw()
  }
  function sound(source: string) {
    audio.current?.stop()
    audio.current = null
    if (!muted && active && !hidden && !dialog) audio.current = playMml(source)
  }
  function toMenu() {
    audio.current?.stop()
    view.screen = 'menu'
    view.clock = 0
    view.paused = false
    view.error = ''
    view.input = createInput()
    accumulator.current = 0
    cpuWait.current = 0
    setDialog(null)
    changed(S.menuLines.join('. '))
  }
  function newGame() {
    audio.current?.stop()
    const fresh = createSetup()
    setup.step = fresh.step
    setup.values = fresh.values
    setup.names = fresh.names
    setup.target = fresh.target
    setup.gravity = fresh.gravity
    setup.cpu = fresh.cpu
    view.screen = 'setup'
    view.setupStep = 0
    view.setupValues = setup.values
    view.input = createInput(32)
    view.error = ''
    view.paused = false
    view.clock = 0
    setDialog(null)
    changed(S.setupPrompts[0])
  }
  function readyForTurn() {
    view.prompt = 'angle'
    view.angle = ''
    view.input = createInput(12)
    view.error = ''
    cpuWait.current = 0
    accumulator.current = 0
    changed(S.turn(view.names[view.match.round.turn]))
  }
  function startMatch() {
    audio.current?.stop()
    view.match = createMatch(Date.now() >>> 0, setup.target, setup.gravity)
    view.screen = 'play'
    view.paused = false
    view.clock = 0
    view.skyline = createSkylineLayer(view.match.round)
    readyForTurn()
  }
  function endDance() {
    const roundNumber = view.match.roundNumber
    finishDance(view.match)
    if (view.match.phase === 'over') {
      view.cabaldMessage = view.match.winner === 0 || denials.current < 2
      if (view.cpu && view.match.winner === 1 && view.cabaldMessage) denials.current++
      changed(S.matchWin(view.names[view.match.winner as 0 | 1]))
    } else {
      if (view.match.roundNumber !== roundNumber) view.skyline = createSkylineLayer(view.match.round)
      readyForTurn()
    }
  }
  function endExplosion() {
    finishExplosion(view.match)
    view.skyline = createSkylineLayer(view.match.round)
    if (view.match.phase === 'dance') {
      sound(MML.victory)
      changed(S.roundWin(view.names[view.match.winner as 0 | 1], view.match.scores[0], view.match.scores[1]))
    } else readyForTurn()
  }
  function confirmMenu() {
    audio.current?.stop()
    if (view.screen === 'play' && view.match.phase === 'flight') view.paused = true
    setDialog('confirm')
    changed()
  }
  function submit() {
    if (view.screen === 'setup') {
      view.error = submitSetup(setup, view.input.value)
      if (!view.error) {
        view.setupStep = setup.step
        view.input = createInput(setup.step < 2 ? 32 : 12)
        view.names = setup.names
        view.cpu = setup.cpu
        if (setup.step === 4) toMenu()
      }
      changed(view.error || (setup.step < 4 ? S.setupPrompts[setup.step] : undefined))
      return
    }
    if (view.screen !== 'play' || view.match.phase !== 'aim' || view.cpu && view.match.round.turn === 1) return
    const value = Number(view.input.value)
    if (view.prompt === 'angle') {
      if (!view.input.value.trim() || !Number.isFinite(value) || value < 0 || value > 360) view.error = S.invalidAngle
      else {
        view.angle = view.input.value
        view.prompt = 'velocity'
        view.input = createInput(12)
        view.error = ''
      }
    } else if (launchMatch(view.match, Number(view.angle), value)) {
      sound(MML.throw)
      view.error = ''
      accumulator.current = 0
    } else view.error = S.invalidVelocity
    changed(view.error || (view.prompt === 'velocity' ? S.velocity : undefined))
  }
  function key(keyName: string) {
    if (!active || hidden || dialog) return
    unlockAudio()
    if (view.paused) {
      if (keyName === 'Escape') confirmMenu()
      else {
        view.paused = false
        accumulator.current = 0
        changed()
      }
      return
    }
    if (view.screen === 'dos') {
      view.screen = 'intro'
      view.clock = 0
      sound(MML.intro)
      changed(S.introTitle)
      return
    }
    if (view.screen === 'intro') { newGame(); return }
    if (view.screen === 'preview') { toMenu(); return }
    if (view.screen === 'menu') {
      if (keyName.toUpperCase() === 'P') startMatch()
      else if (keyName.toUpperCase() === 'V') {
        view.screen = 'preview'
        view.clock = 0
        changed(S.preview)
      } else if (keyName.toUpperCase() === 'Q') close()
      return
    }
    if (keyName === 'Escape') { confirmMenu(); return }
    if (view.screen === 'play') {
      if (view.match.phase === 'over') { toMenu(); return }
      if (view.match.phase === 'explosion' || view.match.phase === 'dance') {
        audio.current?.stop()
        if (view.match.phase === 'explosion') endExplosion()
        if (view.match.phase === 'dance') endDance()
        return
      }
      if (view.match.phase !== 'aim' || view.cpu && view.match.round.turn === 1) return
    }
    const edited = editInput(view.input, keyName, view.screen === 'setup' && setup.step < 2 ? undefined : /[0-9.]/)
    if (!edited.handled) return
    view.input = edited.input
    view.error = ''
    if (edited.submitted) submit()
    else changed()
  }

  useEffect(() => { fit(640, 376) }, [fit])
  useEffect(() => { redraw() }, [revision])
  useEffect(() => {
    const box = surface.current
    const element = canvas.ref.current
    if (!box || !element) return
    const resize = () => {
      const scale = Math.min(box.clientWidth / 640, box.clientHeight / 350, 1)
      element.style.width = `${640 * Math.max(0, scale)}px`
      element.style.height = `${350 * Math.max(0, scale)}px`
      if (window.innerWidth < 720) setTouch(true)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(box)
    resize()
    return () => observer.disconnect()
  }, [canvas.ref])
  useEffect(() => {
    if (active && !hidden && !dialog) {
      if (view.screen === 'setup' && touch) nativeInput.current?.focus({ preventScroll: true })
      else surface.current?.focus({ preventScroll: true })
    }
    if ((!active || hidden || dialog) && view.screen === 'play' && view.match.phase === 'flight') {
      view.paused = true
      accumulator.current = 0
      changed()
    }
    if (!active || hidden || dialog || muted) audio.current?.stop()
  }, [active, hidden, dialog, muted, view.screen, touch])
  useEffect(() => {
    const blur = () => {
      audio.current?.stop()
      if (view.screen === 'play' && view.match.phase === 'flight') { view.paused = true; accumulator.current = 0; changed() }
    }
    window.addEventListener('blur', blur)
    return () => window.removeEventListener('blur', blur)
  }, [])
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!active || hidden || dialog || event.altKey || event.ctrlKey || event.metaKey) return
      if ((event.target as HTMLElement)?.closest('.game-menubar')) return
      if (event.key === 'F1' || event.key === 'F2' || event.key === 'F10') return
      if ((event.target as HTMLElement)?.tagName === 'INPUT') {
        if (event.key === 'Escape') { event.preventDefault(); confirmMenu() }
        return
      }
      if (event.key.length === 1 || ['Enter', 'Escape', 'Backspace', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault()
        setTouch(window.innerWidth < 720)
        key(event.key)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [active, hidden, dialog, muted, touch])
  useEffect(() => {
    if (!active || hidden || dialog || view.paused || !(view.screen === 'setup' || view.screen === 'play' && phase === 'aim')) return
    const timer = window.setInterval(() => {
      view.clock += 267
      if (view.screen === 'play' && view.cpu && view.match.round.turn === 1) {
        cpuWait.current += 267
        if (cpuWait.current >= 801) {
          const shot = chooseCpuThrow(view.match.round)
          view.angle = shot.angle.toFixed(1)
          view.prompt = 'velocity'
          view.input = createInput(12, shot.velocity.toFixed(1))
          // Use the displayed values, not hidden higher-precision input.
          launchMatch(view.match, Number(view.angle), Number(view.input.value))
          sound(MML.throw)
          accumulator.current = 0
          changed()
        }
      }
      redraw()
    }, 267)
    return () => window.clearInterval(timer)
  }, [active, hidden, dialog, view.paused, view.screen, phase, muted])
  useEffect(() => {
    let cancelled = false
    loadPalette(player.remy).then((palette) => {
      if (!cancelled) { view.palettes[0] = quantizePalette(palette); changed() }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [player.remy])
  useEffect(() => {
    let cancelled = false
    const seed = view.match.seed
    const chosen = view.cpu ? cabaldRemy(seed) : civRemy(seed)
    view.palettes[1] = view.cpu ? CABALD_PALETTE : CIVILIAN_PALETTE
    chosen.then(loadPalette).then((palette) => {
      if (!cancelled) {
        const colors = quantizePalette(palette)
        if (!view.cpu && colors.hair === view.palettes[0].hair && colors.shirt === view.palettes[0].shirt) {
          colors.shirt = colors.shirt === 11 ? 10 : 11
        }
        view.palettes[1] = colors
        changed()
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [view.cpu, view.match.seed])
  useEffect(() => () => { audio.current?.stop(); view.skyline = null }, [])

  useAnimationFrame((dt) => {
    view.clock += dt * 1000
    if (view.screen === 'dos') {
      if (view.clock >= 600) {
        view.screen = 'intro'
        view.clock = 0
        sound(MML.intro)
        changed(S.introTitle)
      }
    } else if (view.screen === 'play') {
      const match = view.match
      if (match.phase === 'flight') {
        accumulator.current += dt * FLIGHT_RATE
        const gasped = match.round.sunGasp
        while (accumulator.current >= FIXED_DT && match.round.shot.active) {
          stepShot(match.round)
          accumulator.current -= FIXED_DT
        }
        if (!gasped && match.round.sunGasp) { sound(MML.sun); announce(S.sunHit) }
        if (!match.round.shot.active) {
          finishThrow(match)
          if (match.phase === 'explosion') {
            sound(match.round.hit === 'player' ? MML.player : MML.building)
            changed(match.round.hit === 'building' ? S.buildingHit(view.names[match.round.turn]) : undefined)
          } else {
            announce(S.miss(view.names[(1 - match.round.turn) as 0 | 1]))
            readyForTurn()
          }
        }
      } else if (match.phase === 'explosion') {
        match.elapsed += dt
        if (match.elapsed >= 0.6) endExplosion()
      } else if (match.phase === 'dance') {
        match.elapsed += dt
        match.danceBeat = Math.min(3, Math.floor(match.elapsed * 3))
        if (match.elapsed >= (reducedMotion.current ? 1 : 4 / 3)) endDance()
      }
    }
    redraw()
  }, { paused: !animated || view.paused || !!dialog })

  const press = (keyName: string) => { key(keyName) }
  return <div className="qbasic-client gorillas-client" onPointerDownCapture={(event) => {
    unlockAudio()
    if (event.pointerType === 'touch') setTouch(true)
  }}>
    <GameMenuBar menus={[
      { label: S.gameMenu, items: [
        { label: S.newGame, hotkey: 'F2', onClick: newGame },
        { label: S.viewIntro, onClick: () => { audio.current?.stop(); view.screen = 'intro'; view.clock = 0; changed(); sound(MML.intro) } },
        { label: S.returnMenu, onClick: confirmMenu }, '-', { label: S.exit, onClick: close },
      ] },
      { label: S.optionsMenu, items: [
        { label: S.sound, checked: !muted, onClick: () => setMuted(!muted) },
        { label: S.chooseRemy, onClick: () => setDialog('remy') },
      ] },
      { label: S.helpMenu, items: [
        { label: S.contents, hotkey: 'F1', onClick: () => setDialog('help') }, '-',
        { label: S.about, onClick: () => setDialog('about') },
      ] },
    ]} onOpenChange={(open) => {
      if (open) {
        audio.current?.stop()
        if (view.screen === 'play' && view.match.phase === 'flight') { view.paused = true; changed() }
      }
    }} />
    <div ref={surface} className="qbasic-letterbox" tabIndex={0} role="application" aria-label={S.title}
      onContextMenu={(event) => event.preventDefault()} onPointerDown={(event) => {
        event.preventDefault()
        surface.current?.focus({ preventScroll: true })
        if (view.screen === 'dos' || view.screen === 'intro' || view.screen === 'preview' || view.paused
          || view.screen === 'play' && ['over', 'dance', 'explosion'].includes(view.match.phase)) key('Enter')
      }}>
      <canvas ref={canvas.ref} aria-hidden="true" />
    </div>
    {touch && view.screen === 'setup' && <form className="gorillas-setup qbasic-touch-controls" onSubmit={(event) => {
      event.preventDefault()
      submit()
    }}>
      <label htmlFor="gorillas-setup-input">{S.setupPrompts[setup.step]}</label>
      <div><input id="gorillas-setup-input" ref={nativeInput} aria-label={S.setupPrompts[setup.step]} autoComplete="off"
        inputMode={setup.step < 2 ? 'text' : 'decimal'} maxLength={setup.step < 2 ? 32 : 12} value={view.input.value}
        onChange={(event) => { view.input = createInput(setup.step < 2 ? 32 : 12, event.target.value); view.error = ''; changed() }} />
      <button type="submit">{S.submit}</button></div>
    </form>}
    {touch && view.screen === 'play' && view.match.phase === 'aim' && !(view.cpu && view.match.round.turn === 1) && !view.paused
      && <div className="qbasic-touch-controls gorillas-keypad" aria-label={S.input}>
        {S.numericKeys.map((label) => <button key={label} type="button" onClick={() => press(label === '⌫' ? 'Backspace' : label === '↵' ? 'Enter' : label)}
          aria-label={label === '⌫' ? S.backspace : label === '↵' ? S.enter : label}>{label}</button>)}
      </div>}
    {view.paused && <div className="qbasic-touch-controls"><button type="button" onClick={() => key('Enter')}>{S.resume}</button></div>}
    {touch && view.screen === 'menu' && <div className="qbasic-touch-controls">
      {S.menuLines.map((line) => <button key={line} type="button" onClick={() => key(line[0])}>{line}</button>)}
    </div>}
    <div className="qbasic-live" aria-live="polite" aria-atomic="true">{live}</div>
    {dialog === 'confirm' && <GameDialog title={S.confirmTitle} onClose={() => setDialog(null)} buttons={[
      { label: S.yes, onClick: toMenu, default: true }, { label: S.no, onClick: () => setDialog(null), cancel: true },
    ]}><p>{S.confirmMessage}</p></GameDialog>}
    {dialog === 'help' && <GameDialog title={S.helpTitle} onClose={() => setDialog(null)} buttons={[{ label: S.ok, onClick: () => setDialog(null) }]}>
      <div className="gorillas-help-tabs" role="tablist">{S.helpTabs.map((label, i) => <button type="button" key={label} role="tab"
        aria-selected={i === helpTab} onClick={() => setHelpTab(i)}>{label}</button>)}</div>
      <p role="tabpanel">{S.help[helpTab]}</p>
    </GameDialog>}
    {dialog === 'about' && <AboutDialog game={S.title} icon={icon} version={S.version} flavour={S.flavour}
      lines={[...S.aboutLines]} onClose={() => setDialog(null)} />}
    {dialog === 'remy' && <ChooseRemyDialog onClose={() => setDialog(null)} />}
  </div>
}
