import { useEffect, useRef, useState } from 'react'
import type { AppProps } from '../../os/apps'
import { AboutDialog, BestScoresDialog, ChooseRemyDialog, GameDialog, GameMenuBar, LedCounter, NameEntryDialog, loadGame, saveGame, useCrispCanvas, useGamesMuted, useGamesPlayer, useWindowFit, useWindowState, unlockAudio, toggleGamesMuted, tone, sweep, noise, playMusic, stopMusic, playJingle, stopSounds } from '../kit'
import { createState, step, passwordLevel, levelScore, Tile, type Direction } from './engine'
import { LEVELS } from './levels'
import { createTileSheet, drawViewport, drawInventory, loadChallengeArt, type ChallengeArt } from './render'
import { songForLevel, winJingle, deathJingle } from './music/jingles'
import icon from './icon'
import { TITLE, ABOUT, MENU, ACCEL, PANEL, DEATH, DEATH_TITLE, ITEM_NAMES, levelCard, COMPLETE, GOTO, BEST, ANNOUNCE, TOUCH, STORY, CERTIFICATE, HELP, MISC } from './strings'
import './challenge.css'

type Save = {
  unlocked: number[]
  times: (number | null)[]
  scores: number[]
  attempts: number[]
  music: boolean
  colorOff: boolean
}
const defaults = (): Save => ({ unlocked: [1], times: Array(40).fill(null), scores: Array(40).fill(0), attempts: Array(40).fill(0), music: true, colorOff: false })
const integer = (v: unknown, max: number) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max
function validSave(value: unknown): value is Save {
  if (!value || typeof value !== 'object') return false
  const s = value as Save
  return Array.isArray(s.unlocked) && s.unlocked.includes(1) && s.unlocked.length <= 40 && new Set(s.unlocked).size === s.unlocked.length && s.unlocked.every(n => integer(n, 40) && n > 0)
    && Array.isArray(s.times) && s.times.length === 40 && s.times.every(n => n === null || integer(n, 1000000))
    && Array.isArray(s.scores) && s.scores.length === 40 && s.scores.every(n => integer(n, 100000000))
    && Array.isArray(s.attempts) && s.attempts.length === 40 && s.attempts.every(n => integer(n, 1000000))
    && typeof s.music === 'boolean' && typeof s.colorOff === 'boolean'
}
type Dialog = 'goto' | 'best' | 'help' | 'about' | 'choose' | 'death' | 'complete' | 'story' | 'name' | 'certificate' | null
const directions: Record<string, Direction> = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }
const items = [Tile.BlueKey, Tile.RedKey, Tile.GreenKey, Tile.YellowKey, Tile.Flippers, Tile.FireBoots, Tile.Skates, Tile.SuctionBoots]
const names = [ITEM_NAMES.blueKey, ITEM_NAMES.redKey, ITEM_NAMES.greenKey, ITEM_NAMES.yellowKey, ITEM_NAMES.flippers, ITEM_NAMES.fireBoots, ITEM_NAMES.skates, ITEM_NAMES.suction]

export default function RemysChallenge({ param, close }: AppProps) {
  const [saved, setSaved] = useState(() => loadGame<Save>('remys-challenge', defaults(), validSave))
  const savedRef = useRef(saved)
  const [initial] = useState(() => {
    const n = param && /^\d+$/.test(param) ? Number(param) : 1
    return saved.unlocked.includes(n) ? n : 1
  })
  const [initialState] = useState(() => createState(LEVELS[initial - 1]))
  const live = useRef(initialState)
  const [revision, refresh] = useState(0)
  const [phase, setPhase] = useState<'card' | 'playing' | 'paused' | 'celebrate' | 'finished'>('card')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [announcement, announce] = useState('')
  const [art, setArt] = useState<ChallengeArt | null>(null)
  const [sheet] = useState(createTileSheet)
  const [touch, setTouch] = useState(false)
  const [goNumber, setGoNumber] = useState('')
  const [goPassword, setGoPassword] = useState('')
  const [goError, setGoError] = useState('')
  const [helpTab, setHelpTab] = useState<typeof HELP.tabs[number]>('Rules')
  const [result, setResult] = useState({ timeBonus: 0, levelBonus: 0, score: 0, record: false, attempts: 1 })
  const held = useRef<Direction | undefined>(undefined)
  const pending = useRef<Direction | undefined>(undefined)
  const swipe = useRef<{ x: number, y: number } | null>(null)
  const surface = useRef<HTMLDivElement>(null)
  const inventory = useRef<HTMLCanvasElement>(null)
  const lastSounds = useRef<Partial<Record<string, number>>>({})
  const canvas = useCrispCanvas(288, 288, { smoothing: false })
  const fit = useWindowFit()
  const { active, hidden } = useWindowState()
  const { muted } = useGamesMuted()
  const { player, setName } = useGamesPlayer()
  const state = live.current
  const persist = (next: Save) => {
    savedRef.current = next
    setSaved(next)
    saveGame('remys-challenge', next)
  }
  const release = () => { held.current = undefined }
  const cancelInput = () => {
    held.current = undefined
    pending.current = undefined
    swipe.current = null
  }
  const focus = () => surface.current?.focus()
  const open = (next: Dialog) => {
    cancelInput()
    if (phase === 'playing') setPhase('paused')
    setDialog(next)
  }
  const dismiss = () => {
    setDialog(null)
    focus()
  }
  const loadLevel = (number: number) => {
    cancelInput()
    live.current = createState(LEVELS[number - 1])
    setDialog(null)
    setPhase('card')
    refresh(n => n + 1)
    focus()
  }
  const start = () => {
    unlockAudio()
    if (phase === 'card') {
      const next = { ...savedRef.current, attempts: [...savedRef.current.attempts] }
      next.attempts[state.level.number - 1]++
      persist(next)
      announce(ANNOUNCE.levelStart(state.level.number, state.level.title))
    } else announce(ANNOUNCE.resumed)
    setPhase('playing')
    focus()
  }
  const restart = () => loadLevel(state.level.number)
  const advance = () => {
    setPhase('finished')
    setDialog('complete')
  }
  const nextLevel = () => {
    const n = live.current.level.number + 1
    if (savedRef.current.unlocked.includes(n)) loadLevel(n)
    else dismiss()
  }
  const completeContinue = () => {
    const n = live.current.level.number
    if (n === 40) {
      setDialog('name')
      return
    }
    if (n === 10 || n === 20 || n === 30) {
      setDialog('story')
      return
    }
    nextLevel()
  }
  const goTo = () => {
    const number = goNumber.trim() ? Number(goNumber) : undefined
    const match = goPassword.trim() ? passwordLevel(LEVELS, goPassword) : undefined
    if (goPassword.trim() && (!match || (number !== undefined && number !== match.number))) {
      setGoError(GOTO.bad)
      return
    }
    const n = match?.number ?? number
    if (!n || !Number.isInteger(n) || n < 1 || n > LEVELS.length) {
      setGoError(GOTO.bad)
      return
    }
    if (!match && !savedRef.current.unlocked.includes(n)) {
      setGoError(GOTO.locked)
      return
    }
    if (!savedRef.current.unlocked.includes(n)) persist({ ...savedRef.current, unlocked: [...savedRef.current.unlocked, n] })
    loadLevel(n)
  }
  useEffect(() => { fit(544, 416) }, [fit])
  useEffect(() => { if (active && !hidden && !dialog) focus() }, [active, hidden, dialog])
  useEffect(() => {
    if (!active || hidden || menuOpen) {
      cancelInput()
      setPhase(p => p === 'playing' ? 'paused' : p)
    }
  }, [active, hidden, menuOpen])
  useEffect(() => {
    if (hidden || !active) stopSounds('remys-challenge')
  }, [hidden, active])
  useEffect(() => {
    let disposed = false
    setArt(null)
    loadChallengeArt(player.remy, state.level.number).then(value => { if (!disposed) setArt(value) }).catch(() => {})
    return () => { disposed = true }
  }, [player.remy, state.level.number])
  useEffect(() => {
    if (phase === 'playing' && active && !hidden && saved.music && !dialog && !menuOpen) playMusic(songForLevel(state.level.number))
    else stopMusic(200)
    return () => stopMusic(200)
  }, [phase, active, hidden, saved.music, state.level.number, dialog, menuOpen])
  useEffect(() => () => {
    stopMusic(200)
    stopSounds('remys-challenge')
  }, [])
  useEffect(() => {
    const ctx = canvas.ref.current?.getContext('2d')
    if (ctx) drawViewport(ctx, live.current, live.current.tick, art, sheet)
    const inv = inventory.current?.getContext('2d')
    if (inv) {
      inv.clearRect(0, 0, 128, 64)
      items.forEach((tile, i) => {
        if (i < 4 ? live.current.keys[i] > 0 : live.current.boots[i - 4]) drawInventory(inv, tile, (i % 4) * 32, Math.floor(i / 4) * 32, sheet)
        if (i < 4 && live.current.keys[i] > 0) {
          inv.fillStyle = '#000000'
          inv.fillRect(i * 32 + 20, 20, 12, 12)
          inv.fillStyle = '#ffffff'
          inv.font = 'bold 10px monospace'
          inv.textAlign = 'right'
          inv.fillText(String(live.current.keys[i]), i * 32 + 31, 30)
        }
      })
    }
  }, [revision, art, sheet, canvas.scale, canvas.ref])
  useEffect(() => {
    if (phase !== 'celebrate' || hidden || !active) return
    const timer = window.setTimeout(advance, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 500 : 1200)
    return () => window.clearTimeout(timer)
  }, [phase, hidden, active])
  useEffect(() => {
    if (phase !== 'playing' || hidden || !active || dialog || menuOpen) return
    const timer = window.setInterval(() => {
      const s = live.current
      const previousTime = s.timeLeft
      const previousThief = s.thief
      const key0 = s.keys[0]
      const key1 = s.keys[1]
      const key2 = s.keys[2]
      const key3 = s.keys[3]
      const previousBoots = s.boots.reduce((bits, boot, i) => bits | (boot ? 1 << i : 0), 0)
      step(s, pending.current ?? held.current)
      pending.current = undefined
      if (s.events.includes('chip')) announce(ANNOUNCE.chip(s.chipsLeft))
      if (s.events.includes('key')) {
        const i = s.keys[0] > key0 ? 0 : s.keys[1] > key1 ? 1 : s.keys[2] > key2 ? 2 : s.keys[3] > key3 ? 3 : -1
        if (i >= 0) announce(ANNOUNCE.key(names[i]))
      }
      if (s.events.includes('boots')) {
        const i = s.boots.findIndex((n, i) => n && !(previousBoots & (1 << i)))
        if (i >= 0) announce(ANNOUNCE.boots(names[i + 4]))
      }
      if (s.thief && !previousThief) announce(ANNOUNCE.thief)
      if (s.timeLeft !== previousTime && s.timeLeft < 15 && s.timeLeft > 0) announce(ANNOUNCE.timeLow(s.timeLeft))
      const now = performance.now()
      if (!muted) {
        for (const event of s.events) {
          if (now - (lastSounds.current[event] ?? -Infinity) < 40) continue
          lastSounds.current[event] = now
          const options = { vol: 0.06, owner: 'remys-challenge' }
          switch (event) {
            case 'chip':
              tone(880, 0.06, options)
              tone(1320, 0.08, { ...options, delay: 0.06 })
              break
            case 'socket':
              tone(523, 0.16, { ...options, type: 'sine' })
              tone(659, 0.16, { ...options, type: 'sine', delay: 0.07 })
              tone(784, 0.2, { ...options, type: 'sine', delay: 0.14 })
              break
            case 'door':
              noise(0.055, { ...options, filter: 'lowpass', freq: 700 })
              tone(130, 0.045, { ...options, type: 'triangle', delay: 0.04 })
              break
            case 'key':
              tone(1046, 0.045, { ...options, type: 'triangle' })
              tone(1568, 0.065, { ...options, type: 'triangle', delay: 0.04 })
              break
            case 'boots':
              sweep(180, 1400, 0.09, { ...options, type: 'triangle' })
              break
            case 'push':
              noise(0.12, { ...options, freq: 500, to: 220, q: 3, vol: 0.045 })
              break
            case 'splash':
              noise(0.18, { ...options, filter: 'lowpass', freq: 3000, to: 300 })
              tone(90, 0.1, { ...options, type: 'sine' })
              break
            case 'burn':
              noise(0.2, { ...options, filter: 'highpass', freq: 400, to: 3200, attack: 0.035 })
              break
            case 'bomb':
              noise(0.25, { ...options, filter: 'lowpass', freq: 1800, to: 80 })
              sweep(100, 32, 0.22, { ...options, type: 'sine' })
              break
            case 'teleport':
              sweep(160, 1600, 0.12, { ...options, type: 'sine' })
              sweep(1600, 320, 0.12, { ...options, type: 'sine', delay: 0.1 })
              break
            case 'button':
              tone(360, 0.025, { ...options, type: 'triangle' })
              break
            case 'toggle':
              noise(0.035, { ...options, filter: 'lowpass', freq: 1400 })
              tone(175, 0.07, { ...options, type: 'triangle', delay: 0.045 })
              break
            case 'tick':
              if (s.level.time > 0 && previousTime !== s.timeLeft && s.timeLeft < 15) tone(440, 0.025, { ...options, vol: 0.035 })
              break
          }
        }
      }
      if (s.status === 'dead') {
        release()
        setPhase('finished')
        setDialog('death')
        announce(DEATH[s.death!])
        void playJingle(deathJingle, 'remys-challenge')
      } else if (s.status === 'won') {
        release()
        const old = savedRef.current
        const i = s.level.number - 1
        const attempts = Math.max(1, old.attempts[i])
        const score = levelScore(s.level.number, s.timeLeft, attempts)
        const elapsed = Math.floor(s.tick / 5)
        const record = old.times[i] === null || elapsed < old.times[i]!
        const next = { ...old, times: [...old.times], scores: [...old.scores], unlocked: [...old.unlocked] }
        if (record) next.times[i] = elapsed
        next.scores[i] = Math.max(next.scores[i], score.score)
        if (s.level.number < 40 && !next.unlocked.includes(s.level.number + 1)) next.unlocked.push(s.level.number + 1)
        persist(next)
        setResult({ ...score, record, attempts })
        announce(ANNOUNCE.win(s.level.number, score.score))
        setPhase('celebrate')
        void playJingle(winJingle, 'remys-challenge')
      }
      refresh(n => n + 1)
    }, 200)
    return () => window.clearInterval(timer)
  }, [phase, active, hidden, dialog, menuOpen, muted])
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!active || hidden || dialog || event.altKey || event.ctrlKey || event.metaKey || /^F\d+$/.test(event.key)) return
    if (phase === 'celebrate') {
      event.preventDefault()
      advance()
      return
    }
    if (phase === 'card' || phase === 'paused') {
      event.preventDefault()
      start()
      if (event.key in directions) {
        held.current = directions[event.key]
        pending.current = directions[event.key]
      }
      return
    }
    if (event.key in directions) {
      event.preventDefault()
      held.current = directions[event.key]
      if (!event.repeat) pending.current = directions[event.key]
    }
  }
  const menus = [
    { label: MENU.game, items: [
      { label: MENU.newGame, hotkey: ACCEL.newGame, onClick: () => loadLevel(1) },
      { label: MENU.restart, hotkey: ACCEL.restart, onClick: restart },
      { label: MENU.next, hotkey: ACCEL.next, disabled: !saved.unlocked.includes(state.level.number + 1), onClick: nextLevel },
      { label: MENU.previous, hotkey: ACCEL.previous, disabled: !saved.unlocked.includes(state.level.number - 1), onClick: () => loadLevel(state.level.number - 1) },
      { label: MENU.goTo, hotkey: ACCEL.goTo, onClick: () => {
        setGoNumber('')
        setGoPassword('')
        setGoError('')
        open('goto')
      } },
      { label: MENU.pause, hotkey: ACCEL.pause, checked: phase === 'paused', onClick: () => {
        if (phase === 'playing') {
          cancelInput()
          setPhase('paused')
          announce(ANNOUNCE.paused)
        } else if (phase === 'paused' || phase === 'card') start()
      } },
      '-' as const, { label: MENU.bestTimes, onClick: () => open('best') }, '-' as const, { label: MENU.exit, onClick: close }
    ] },
    { label: MENU.options, items: [
      { label: MENU.sound, checked: !muted, onClick: toggleGamesMuted },
      { label: MENU.music, checked: saved.music, onClick: () => persist({ ...savedRef.current, music: !savedRef.current.music }) },
      { label: MENU.colorOff, checked: saved.colorOff, onClick: () => persist({ ...savedRef.current, colorOff: !savedRef.current.colorOff }) },
      { label: MENU.chooseRemy, onClick: () => open('choose') }
    ] },
    { label: MENU.help, items: [{ label: MENU.contents, hotkey: ACCEL.contents, onClick: () => open('help') }, '-' as const, { label: MENU.about, onClick: () => open('about') }] }
  ]
  const hint = state.tiles[state.player.pos] === Tile.Hint ? state.level.hint : state.tiles[state.player.pos] === Tile.Thief ? PANEL.thief : ''
  return <div className={`challenge${touch ? ' challenge-touch' : ''}`} onPointerDownCapture={event => {
    unlockAudio()
    if (event.pointerType === 'touch') setTouch(true)
    if (phase === 'celebrate' && !dialog) {
      event.preventDefault()
      event.stopPropagation()
      advance()
    }
  }} onKeyDownCapture={event => {
    unlockAudio()
    if (phase === 'celebrate' && !dialog && active && !hidden) {
      event.preventDefault()
      event.stopPropagation()
      advance()
    }
  }}>
    <GameMenuBar menus={menus} onOpenChange={setMenuOpen} />
    <div className="challenge-surface" ref={surface} tabIndex={0} role="application" aria-label={MISC.ariaLabel} onKeyDown={onKeyDown} onKeyUp={event => {
      if (event.key in directions) {
        event.preventDefault()
        if (held.current === directions[event.key]) release()
      }
    }} onBlur={cancelInput} onContextMenu={event => event.preventDefault()}>
      <div className={`challenge-board${saved.colorOff ? ' challenge-mono' : ''}`} onPointerDown={event => {
        focus()
        if (event.pointerType === 'touch') setTouch(true)
        if (phase === 'celebrate') {
          advance()
          return
        }
        if (phase === 'card' || phase === 'paused') {
          start()
          return
        }
        swipe.current = { x: event.clientX, y: event.clientY }
        event.currentTarget.setPointerCapture(event.pointerId)
      }} onPointerMove={event => {
        if (!swipe.current || phase !== 'playing') return
        const dx = event.clientX - swipe.current.x
        const dy = event.clientY - swipe.current.y
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= 18) {
          held.current = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 1 : 3 : dy > 0 ? 2 : 0
          pending.current = held.current
          swipe.current = { x: event.clientX, y: event.clientY }
        }
      }} onPointerUp={() => {
        swipe.current = null
        release()
      }} onPointerCancel={() => {
        swipe.current = null
        release()
      }}>
        <canvas ref={canvas.ref} aria-hidden="true" />
        {(phase === 'card' || phase === 'paused') && <div className="challenge-overlay"><strong>{phase === 'card' ? levelCard(state.level.number, state.level.title, state.level.password) : PANEL.paused}</strong><p>{PANEL.pausedHint}</p><button onPointerDown={event => event.stopPropagation()} onClick={start}>{COMPLETE.ok}</button></div>}
        {phase === 'celebrate' && <div className="challenge-overlay challenge-celebrate"><strong>{COMPLETE.title}</strong></div>}
      </div>
      <aside className="challenge-panel">
        <div className="challenge-meter"><button className="challenge-level" onClick={() => {
          setGoNumber(String(state.level.number))
          setGoPassword('')
          setGoError('')
          open('goto')
        }}>{PANEL.level}<LedCounter value={state.level.number} digits={3} scale={2} /></button></div>
        <div className="challenge-meter"><strong>{PANEL.time}</strong><LedCounter value={state.level.time ? state.timeLeft : PANEL.untimed} digits={3} scale={2} /></div>
        <div className="challenge-meter"><strong>{PANEL.chipsLeft}</strong><LedCounter value={state.chipsLeft} digits={3} scale={2} /></div>
        <div className={`challenge-inventory${saved.colorOff ? ' challenge-mono' : ''}`} role="img" aria-label={`${PANEL.inventory}: ${names.filter((_, i) => i < 4 ? state.keys[i] > 0 : state.boots[i - 4]).join(', ')}`}><canvas ref={inventory} width={128} height={64} /></div>
        {hint && <div className="challenge-hint">{hint}</div>}
      </aside>
      <div className="challenge-pad">{([0, 3, 2, 1] as Direction[]).map(d => <button key={d} className={`challenge-dir-${d}`} aria-label={[TOUCH.up, TOUCH.right, TOUCH.down, TOUCH.left][d]} onPointerDown={event => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        if (phase === 'card' || phase === 'paused') start()
        held.current = d
        pending.current = d
      }} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onKeyDown={event => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          held.current = d
          if (!event.repeat) pending.current = d
        }
      }} onKeyUp={release}>{['▲', '▶', '▼', '◀'][d]}</button>)}</div>
    </div>
    <div className="challenge-live" aria-live="polite">{announcement}</div>
    {dialog === 'death' && <GameDialog title={DEATH_TITLE} onClose={startAfterRestart} buttons={[{ label: MENU.restart.replace('&', ''), default: true, onClick: startAfterRestart }]}><p>{DEATH[state.death!]}</p></GameDialog>}
    {dialog === 'complete' && <GameDialog title={COMPLETE.title} onClose={completeContinue} buttons={[{ label: COMPLETE.ok, default: true, onClick: completeContinue }]}><dl className="challenge-results">{[[COMPLETE.timeBonus, result.timeBonus], [COMPLETE.levelBonus, result.levelBonus], [COMPLETE.levelScore, result.score], [COMPLETE.total, saved.scores.reduce((a, b) => a + b, 0)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{result.record && <p>{COMPLETE.record}</p>}<p>{COMPLETE.attempts(result.attempts)}</p></GameDialog>}
    {dialog === 'story' && <GameDialog title={STORY[state.level.number as 10 | 20 | 30].title} onClose={nextLevel} buttons={[{ label: COMPLETE.ok, default: true, onClick: nextLevel }]}><p>{STORY[state.level.number as 10 | 20 | 30].text}</p></GameDialog>}
    {dialog === 'name' && <NameEntryDialog title={CERTIFICATE.title} message={CERTIFICATE.body} defaultName={player.name} onSubmit={name => {
      setName(name)
      setDialog('certificate')
    }} onCancel={() => setDialog('certificate')} />}
    {dialog === 'certificate' && <GameDialog title={CERTIFICATE.title} width={440} onClose={dismiss} buttons={[{ label: CERTIFICATE.ok, default: true, onClick: dismiss }]}><div className="challenge-certificate"><h2>{CERTIFICATE.heading}</h2><h3>{CERTIFICATE.welcome(player.name)}</h3><p>{CERTIFICATE.body}</p><p>{CERTIFICATE.signed}</p><small>{CERTIFICATE.footer}</small></div></GameDialog>}
    {dialog === 'goto' && <GameDialog title={GOTO.title} onClose={dismiss} buttons={[{ label: GOTO.ok, default: true, onClick: goTo }, { label: GOTO.cancel, cancel: true, onClick: dismiss }]}><form className="challenge-goto" onSubmit={event => {
      event.preventDefault()
      goTo()
    }}><label>{GOTO.level.replace('&', '')}<input type="number" min={1} max={40} value={goNumber} onChange={event => setGoNumber(event.target.value)} /></label><label>{GOTO.password.replace('&', '')}<input value={goPassword} maxLength={4} onChange={event => setGoPassword(event.target.value.toUpperCase())} /></label>{goError && <p role="alert">{goError}</p>}</form></GameDialog>}
    {dialog === 'best' && <BestScoresDialog title={BEST.title} rows={[...LEVELS.flatMap(level => [{ label: `${BEST.level} ${level.number} — ${BEST.time}`, score: saved.times[level.number - 1] }, { label: `${BEST.level} ${level.number} — ${BEST.score}`, score: saved.scores[level.number - 1] || null }]), { label: BEST.total, score: saved.scores.reduce((a, b) => a + b, 0) }]} format={(score, row) => row.label.endsWith(BEST.time) ? `${score}s` : score.toLocaleString()} onReset={() => persist({ ...savedRef.current, times: Array(40).fill(null), scores: Array(40).fill(0) })} onClose={dismiss} />}
    {dialog === 'choose' && <ChooseRemyDialog onClose={dismiss} />}
    {dialog === 'about' && <AboutDialog game={TITLE} icon={icon} {...ABOUT} onClose={dismiss} />}
    {dialog === 'help' && <GameDialog title={HELP.title} width={460} onClose={dismiss} buttons={[{ label: COMPLETE.ok, default: true, onClick: dismiss }]}><div className="challenge-help-tabs" role="tablist">{HELP.tabs.map(tab => <button key={tab} role="tab" aria-selected={tab === helpTab} onClick={() => setHelpTab(tab)}>{tab}</button>)}</div><div role="tabpanel">{HELP.sections[helpTab].map(text => <p key={text}>{text}</p>)}</div></GameDialog>}
  </div>

  function startAfterRestart() {
    restart()
    const s = live.current
    const next = { ...savedRef.current, attempts: [...savedRef.current.attempts] }
    next.attempts[s.level.number - 1]++
    persist(next)
    announce(ANNOUNCE.levelStart(s.level.number, s.level.title))
    setPhase('playing')
  }
}
