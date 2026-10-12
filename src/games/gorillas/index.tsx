import { useEffect, useRef, useState } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, ChooseRemyDialog, GameDialog, GameHelpTabs, GameMenuBar, cabaldRemy, civRemy, loadPalette, unlockAudio,
  useAnimationFrame, useCrispCanvas, useGamesMuted, useGamesPlayer, useWindowFit, useWindowState,
} from '../kit'
import { createInput, editInput, playMml, type MmlPlayback } from '../qbasic'
import {
  FIXED_DT, FLIGHT_RATE, chooseCpuThrow, createMatch, finishDance, finishExplosion, finishThrow, launchMatch, stepShot,
} from './engine'
import { CABALD_PALETTE, CIVILIAN_PALETTE, HERO_PALETTE, createSkylineLayer, drawScreen, quantizePalette, screenHeight, type RenderView } from './render'
import { createSetup, submitSetup } from './setup'
import { enterAim, isTransitionClickBlocked, touchControlLayout } from './controls'
import { KEYPAD_KEYS, MML, STRINGS as S } from './strings'
import icon from './icon'
import './gorillas.css'

export default function Gorillas({ close }: AppProps) {
  const [view] = useState<RenderView>(() => ({
    screen: 'dos', clock: 0, input: createInput(), setupStep: 0, setupValues: [], names: [S.player1, S.player2],
    prompt: 'angle', angle: '', error: '', paused: false, cpu: false, cabaldMessage: true, match: createMatch(Date.now()),
    palettes: [HERO_PALETTE, CIVILIAN_PALETTE], skyline: null, sunGaspAt: 0,
  }))
  const [setup] = useState(createSetup)
  const [revision, refresh] = useState(0)
  const [lastTouch, setTouch] = useState(false)
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [dialog, setDialog] = useState<'help' | 'about' | 'remy' | 'confirm' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpTab, setHelpTab] = useState(0)
  const [live, announce] = useState<string>(S.title)
  const { player } = useGamesPlayer()
  const { muted, setMuted } = useGamesMuted()
  const { active, hidden, pocket } = useWindowState()
  const fit = useWindowFit()
  const surface = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const touchControls = useRef<HTMLDivElement>(null)
  const nativeInput = useRef<HTMLInputElement>(null)
  const audio = useRef<MmlPlayback | null>(null)
  const accumulator = useRef(0)
  const cpuWait = useRef(0)
  const denials = useRef(0)
  const pointerTransitionAt = useRef<number | null>(null)
  const pointerDownState = useRef<string | null>(null)
  const previewReturn = useRef<{ screen: RenderView['screen']; clock: number } | null>(null)
  const previewTunePending = useRef(false)
  const touch = lastTouch || pocket
  const sideControls = touch && touchControlLayout(viewport.width, viewport.height) === 'side'
  const humanPrompt = view.screen === 'play' && view.match.phase === 'aim' && !(view.cpu && view.match.round.turn === 1) && !view.paused
  const height = screenHeight(view.screen)
  const canvas = useCrispCanvas(640, height, { onResize: () => redraw() })
  const phase = view.match.phase
  const animated = view.screen === 'play' && (phase === 'flight' || phase === 'explosion' || phase === 'dance')

  function redraw() {
    if (canvas.ctx.current) drawScreen(canvas.ctx.current, view, touch)
  }
  function changed(message?: string) {
    refresh((n) => n + 1)
    if (message) announce(message)
    redraw()
  }
  function sound(source: string) {
    audio.current?.stop()
    audio.current = null
    if (!muted && active && !hidden && !dialog && !menuOpen) audio.current = playMml(source)
  }
  function showPreview() {
    audio.current?.stop()
    if (view.screen === 'play') {
      previewReturn.current = { screen: view.screen, clock: view.clock }
      view.paused = true
      accumulator.current = 0
    } else if (view.screen !== 'preview') previewReturn.current = null
    view.screen = 'preview'
    view.clock = 0
    previewTunePending.current = true
    changed(`${S.starring} ${S.previewCast(view.names[0], view.names[1])}`)
  }
  function toMenu() {
    previewReturn.current = null
    previewTunePending.current = false
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
    previewReturn.current = null
    previewTunePending.current = false
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
      view.cabaldMessage = view.match.winner !== -1 && (view.match.winner === 0 || denials.current < 2)
      view.screen = 'over'
      view.clock = 0
      if (view.cpu && view.match.winner === 1 && view.cabaldMessage) denials.current++
      changed(view.match.winner === -1 ? view.cpu ? S.cpuDraw : S.draw : S.matchWin(view.names[view.match.winner]))
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
    if (enterAim(view, view.match)) {
      sound(MML.throw)
      accumulator.current = 0
    }
    changed(view.error || (view.prompt === 'velocity' ? S.velocity : undefined))
  }
  function key(keyName: string) {
    if (!active || hidden || dialog || menuOpen) return
    unlockAudio()
    if (view.screen === 'play' && view.paused) {
      if (keyName === 'Escape') confirmMenu()
      else {
        view.paused = false
        accumulator.current = 0
        changed(S.resumed)
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
    if (view.screen === 'preview') {
      audio.current?.stop()
      previewTunePending.current = false
      if (previewReturn.current) {
        view.screen = previewReturn.current.screen
        view.clock = previewReturn.current.clock
        previewReturn.current = null
        changed(S.paused(touch))
      } else toMenu()
      return
    }
    if (view.screen === 'menu') {
      if (keyName.toUpperCase() === 'P') startMatch()
      else if (keyName.toUpperCase() === 'V') showPreview()
      else if (keyName.toUpperCase() === 'Q') close()
      return
    }
    if (view.screen === 'over') { toMenu(); return }
    if (keyName === 'Escape' && !(view.screen === 'play' && ['over', 'dance', 'explosion'].includes(view.match.phase))) {
      confirmMenu()
      return
    }
    if (view.screen === 'play') {
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
  function pointerKey(keyName: string) {
    const now = performance.now()
    if (isTransitionClickBlocked(now, pointerTransitionAt.current)) return
    const before = `${view.screen}:${view.match.phase}:${view.paused}`
    key(keyName)
    if (`${view.screen}:${view.match.phase}:${view.paused}` !== before) pointerTransitionAt.current = now
  }

  useEffect(() => {
    const menuHeight = surface.current?.closest('.gorillas-client')?.querySelector<HTMLElement>(':scope > .gk-menubar')?.offsetHeight ?? 0
    const controlSize = touchControls.current
    const controlWidth = sideControls ? controlSize?.offsetWidth ?? 0 : 0
    const controlHeight = touch && !sideControls ? controlSize?.offsetHeight ?? 0 : 0
    fit(640 + controlWidth, height + controlHeight + menuHeight)
  }, [fit, height, touch, sideControls, viewport.width, viewport.height])
  useEffect(() => { redraw() }, [revision, touch])
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  useEffect(() => {
    const box = surface.current
    const element = canvas.ref.current
    if (!box || !element) return
    const resize = () => {
      const scale = Math.max(0, Math.min(box.clientWidth / 640, box.clientHeight / height, 1))
      element.style.width = `${640 * scale}px`
      element.style.height = `${height * scale}px`
    }
    const observer = new ResizeObserver(resize)
    observer.observe(box)
    if (body.current) observer.observe(body.current)
    resize()
    return () => observer.disconnect()
  }, [canvas.ref, height, touch, sideControls])
  useEffect(() => {
    if (previewTunePending.current && view.screen === 'preview' && active && !hidden && !dialog && !menuOpen) {
      previewTunePending.current = false
      sound(MML.intro)
    }
  }, [view.screen, active, hidden, dialog, menuOpen, muted])
  useEffect(() => {
    if (active && !hidden && !dialog && !menuOpen) {
      if (view.screen === 'setup' && touch) nativeInput.current?.focus({ preventScroll: true })
      else surface.current?.focus({ preventScroll: true })
    }
    if ((!active || hidden || dialog || menuOpen) && view.screen === 'play' && view.match.phase === 'flight') {
      view.paused = true
      accumulator.current = 0
      changed(S.paused(touch))
    }
    if (!active || hidden || dialog || menuOpen || muted) audio.current?.stop()
  }, [active, hidden, dialog, menuOpen, muted, view.screen, touch])
  useEffect(() => {
    const blur = () => {
      audio.current?.stop()
      if (view.screen === 'play' && view.match.phase === 'flight') { view.paused = true; accumulator.current = 0; changed(S.paused(touch)) }
    }
    window.addEventListener('blur', blur)
    return () => window.removeEventListener('blur', blur)
  }, [touch])
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !active || hidden || dialog || menuOpen || event.altKey || event.ctrlKey || event.metaKey) return
      if ((event.target as HTMLElement)?.closest('[data-gk-menu]')) return
      setTouch(false)
      if (event.key === 'F1') { event.preventDefault(); setDialog('help'); return }
      if (event.key === 'F2') { event.preventDefault(); newGame(); return }
      if (event.key === 'F10') return
      if ((event.target as HTMLElement)?.tagName === 'INPUT') {
        if (event.key === 'Escape') { event.preventDefault(); confirmMenu() }
        return
      }
      if (event.key.length === 1 || ['Enter', 'Escape', 'Backspace', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault()
        setTouch(false)
        key(event.key)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [active, hidden, dialog, menuOpen, muted, touch])
  useEffect(() => {
    if (!active || hidden || dialog || menuOpen || view.screen === 'play' && view.paused
      || !(view.screen === 'dos' || view.screen === 'intro' || view.screen === 'preview' || view.screen === 'menu'
        || view.screen === 'over' || view.screen === 'setup' || view.screen === 'play' && phase === 'aim')) return
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      const elapsed = now - last
      last = now
      view.clock += elapsed
      if (view.screen === 'dos' && view.clock >= 600) {
        view.screen = 'intro'
        view.clock = 0
        sound(MML.intro)
        changed(S.introTitle)
        return
      }
      if (view.screen === 'play' && view.cpu && view.match.round.turn === 1 && view.match.phase === 'aim') {
        cpuWait.current += elapsed
        if (cpuWait.current >= 801) {
          const shot = chooseCpuThrow(view.match.round)
          view.angle = shot.angle.toFixed(1)
          view.prompt = 'velocity'
          view.input = createInput(12, shot.velocity.toFixed(1))
          // Use the displayed values, not hidden higher-precision input.
          launchMatch(view.match, Number(view.angle), Number(view.input.value))
          sound(MML.throw)
          accumulator.current = 0
          changed(S.cpuThrow(view.angle, view.input.value))
        }
      }
      redraw()
    }, 100)
    return () => {
      window.clearInterval(timer)
      if (view.screen === 'play' && view.cpu && view.match.round.turn === 1 && view.match.phase === 'aim') {
        cpuWait.current += performance.now() - last
      }
    }
  }, [active, hidden, dialog, menuOpen, view.paused, view.screen, phase, muted])
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
    view.palettes[1] = view.cpu ? CABALD_PALETTE : CIVILIAN_PALETTE
    const choose = async () => {
      for (let attempt = 0; attempt < 16 && !cancelled; attempt++) {
        const index = await (view.cpu ? cabaldRemy(seed) : civRemy(seed + attempt))
        const colors = quantizePalette(await loadPalette(index))
        if (!view.cpu && colors.hair === view.palettes[0].hair && colors.shirt === view.palettes[0].shirt && attempt < 15) continue
        if (!cancelled) { view.palettes[1] = colors; changed() }
        return
      }
    }
    void choose().catch(() => {})
    return () => { cancelled = true }
  }, [view.cpu, view.match.seed, player.remy])
  useEffect(() => () => { audio.current?.stop(); view.skyline = null }, [])

  useAnimationFrame((dt) => {
    view.clock += dt * 1000
    if (view.screen === 'play') {
      const match = view.match
      if (match.phase === 'flight') {
        accumulator.current += dt * FLIGHT_RATE
        const gasped = match.round.sunGasp
        while (accumulator.current >= FIXED_DT && match.round.shot.active) {
          stepShot(match.round)
          accumulator.current -= FIXED_DT
        }
        if (!gasped && match.round.sunGasp) { view.sunGaspAt = view.clock; sound(MML.sun); announce(S.sunHit) }
        if (!match.round.shot.active) {
          finishThrow(match)
          if (view.match.phase === 'explosion') {
            sound(match.round.hit === 'player' ? MML.player : MML.building)
            changed(match.round.hit === 'building' ? S.buildingHit(view.names[match.round.turn]) : undefined)
          } else {
            announce(S.miss(view.names[(1 - match.round.turn) as 0 | 1]))
            readyForTurn()
          }
        }
      } else if (match.phase === 'explosion') {
        match.elapsed += dt
        if (match.elapsed >= (match.round.hit === 'player' ? 1.3 : 0.6)) endExplosion()
      } else if (match.phase === 'dance') {
        match.elapsed += dt
        match.danceBeat = Math.min(3, Math.floor(match.elapsed * 3))
        if (match.elapsed >= 4 / 3) endDance()
      }
    }
    redraw()
  }, { paused: !animated || view.paused || !!dialog || menuOpen })

  return <div className="qbasic-client gorillas-client" onPointerDownCapture={(event) => {
    unlockAudio()
    if (event.pointerType === 'touch') setTouch(true)
    else if (event.pointerType === 'mouse') setTouch(false)
    pointerDownState.current = (event.target as HTMLElement).closest('.gorillas-body')
      ? `${view.screen}:${view.match.phase}:${view.paused}` : null
  }} onClickCapture={(event) => {
    if (!(event.target as HTMLElement).closest('.gorillas-body')) return
    const now = performance.now()
    if (pointerDownState.current !== null && pointerDownState.current !== `${view.screen}:${view.match.phase}:${view.paused}`) {
      pointerTransitionAt.current = now
    }
    pointerDownState.current = null
    if (isTransitionClickBlocked(now, pointerTransitionAt.current)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }}>
    <GameMenuBar menus={[
      { label: S.gameMenu, items: [
        { label: S.newGame, hotkey: 'F2', onClick: newGame },
        { label: S.viewIntro, onClick: showPreview },
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
      setMenuOpen(open)
      if (open) {
        audio.current?.stop()
        if (view.screen === 'play' && view.match.phase === 'flight') { view.paused = true; changed(S.paused(touch)) }
      }
    }} />
    <div ref={body} className={`gorillas-body${sideControls ? ' gorillas-body--side' : ''}`}>
      <div ref={surface} className="qbasic-letterbox" tabIndex={0} role="application" aria-label={S.title}
        onContextMenu={(event) => event.preventDefault()} onPointerDown={() => {
          surface.current?.focus({ preventScroll: true })
        }} onClick={() => {
          if (view.screen === 'dos' || view.screen === 'intro' || view.screen === 'preview' || view.screen === 'over'
            || view.screen === 'play' && (view.paused || ['dance', 'explosion'].includes(view.match.phase))) pointerKey('Enter')
        }}>
        <canvas ref={canvas.ref} aria-hidden="true" />
      </div>
      {touch && <div ref={touchControls} className="gorillas-controls qbasic-touch-controls">
        {view.screen === 'setup' && <form className="gorillas-setup" onSubmit={(event) => {
          event.preventDefault()
          const now = performance.now()
          if (active && !hidden && !dialog && !menuOpen && !isTransitionClickBlocked(now, pointerTransitionAt.current)) {
            const before = view.screen
            submit()
            if (view.screen !== before) pointerTransitionAt.current = now
          }
        }}>
          <label htmlFor="gorillas-setup-input">{S.setupPrompts[setup.step]}</label>
          <div><input id="gorillas-setup-input" ref={nativeInput} aria-label={S.setupPrompts[setup.step]} autoComplete="off"
            inputMode={setup.step < 2 ? 'text' : 'decimal'} maxLength={setup.step < 2 ? 32 : 12} value={view.input.value}
            onChange={(event) => {
              if (!active || hidden || dialog || menuOpen) return
              view.input = createInput(setup.step < 2 ? 32 : 12, event.target.value)
              view.error = ''
              changed()
            }} />
            <button type="submit">{S.submit}</button></div>
        </form>}
        {view.screen === 'play' && <div className={`gorillas-keypad${humanPrompt ? '' : ' gorillas-keypad--disabled'}`} aria-label={S.input}>
          <div className="gorillas-keypad-value">{view.paused ? S.paused(true)
            : humanPrompt ? `${view.prompt === 'angle' ? S.angle : S.velocity} ${view.input.value}_`
              : phase === 'aim' ? S.cpuThinking : phase === 'flight' ? S.flying : S.celebrating}</div>
          {S.numericKeys.map((label) => <button key={label} type="button" disabled={!humanPrompt}
            onClick={() => pointerKey(KEYPAD_KEYS[label] ?? label)}
            aria-label={label === '⌫' ? S.backspace : label === '↵' ? S.enter : label}>{label}</button>)}
          {view.paused && <button className="gorillas-resume" type="button" onClick={() => pointerKey('Enter')}>{S.resume}</button>}
        </div>}
        {view.screen === 'menu' && <div className="gorillas-touch-menu">
          {S.menuLines.map((line) => <button key={line} type="button" onClick={() => pointerKey(line[0])}>{line}</button>)}
        </div>}
      </div>}
    </div>
    <div className="qbasic-live" aria-live="polite" aria-atomic="true">{live}</div>
    {dialog === 'confirm' && <GameDialog title={S.confirmTitle} onClose={() => setDialog(null)} buttons={[
      { label: S.yes, onClick: toMenu, default: true }, { label: S.no, onClick: () => setDialog(null), cancel: true },
    ]}><p>{S.confirmMessage}</p></GameDialog>}
    {dialog === 'help' && <GameDialog title={S.helpTitle} onClose={() => setDialog(null)} buttons={[{ label: S.ok, onClick: () => setDialog(null) }]}>
      <GameHelpTabs label={S.helpTitle} tabs={S.helpTabs} selected={helpTab} onChange={setHelpTab}>
        <p>{S.help[helpTab]}</p>
      </GameHelpTabs>
    </GameDialog>}
    {dialog === 'about' && <AboutDialog game={S.title} icon={icon} version={S.version} flavour={S.flavour}
      lines={[...S.aboutLines]} onClose={() => setDialog(null)} />}
    {dialog === 'remy' && <ChooseRemyDialog onClose={() => setDialog(null)} />}
  </div>
}
