import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, ChooseRemyDialog, GameDialog, GameHelpTabs, GameMenuBar, loadGame, saveGame, loadRemy, loadCabald, loadPalette,
  useGamesPlayer, useGamesMuted, useWindowState, useWindowFit, useAnimationFrame, unlockAudio, tone, midiHz, playJingle, stopSounds,
} from '../kit'
import { counts, initialBoard, legalMoves, playMove, turnState, SKILLS, type Board, type Side, type Skill, type SearchResult } from './engine'
import { reversiIcon } from './icon'
import { strings as s } from './strings'
import { winJingle, lossJingle, tieJingle } from './audio'
import { hintPhase } from './animation'
import './reversi.css'

type Options = { skill: Skill; legal: boolean }
type Animation = { from: Board; side: Side; placed: number; squares: number[]; maxRing: number; elapsed: number; sounded: number }
type Dialog = 'help' | 'about' | 'message' | 'choose' | null
const validOptions = (v: unknown): v is Options => !!v && typeof v === 'object' && 'skill' in v && SKILLS.includes(v.skill as Skill) &&
  'legal' in v && typeof v.legal === 'boolean'

export default function Reversi({ param, close }: AppProps) {
  const [stored] = useState(() => loadGame<Options>('reversi', { skill: 'novice', legal: false }, validOptions))
  const [skill, setSkill] = useState<Skill>(SKILLS.includes(param as Skill) ? param as Skill : stored.skill)
  const [showLegal, setShowLegal] = useState(stored.legal)
  const [board, setBoard] = useState(initialBoard)
  const [side, setSide] = useState<Side>(1)
  const [seed, setSeed] = useState(() => Date.now() >>> 0)
  const [animations, setAnimations] = useState<Animation[]>([])
  const [cursor, setCursor] = useState(19)
  const [keyboard, setKeyboard] = useState(false)
  const [hint, setHint] = useState<{ square: number; elapsed: number } | null>(null)
  const [flash, setFlash] = useState<{ square: number; elapsed: number } | null>(null)
  const [hintRequested, setHintRequested] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ended, setEnded] = useState(false)
  const [endShown, setEndShown] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [message, setMessage] = useState(s.intro)
  const [announcement, setAnnouncement] = useState(s.intro)
  const [helpTab, setHelpTab] = useState(0)
  const [portraits, setPortraits] = useState<{ remy?: string; cabald?: string }>({})
  const [artWidth, setArtWidth] = useState<128 | 320 | 600>(128)
  const [hair, setHair] = useState('#613b20')
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [touchInput, setTouchInput] = useState(() => matchMedia('(pointer: coarse)').matches)
  const { player } = useGamesPlayer()
  const { muted, toggleMuted } = useGamesMuted()
  const { active, hidden, pocket: mobile } = useWindowState()
  const fit = useWindowFit()
  const surface = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const scrollGesture = useRef<{ pointer: number; y: number; top: number } | null>(null)
  const response = useRef<SearchResult | null>(null)
  const thinkElapsed = useRef(0)
  const lastFlipSound = useRef(-Infinity)
  const resultCounts = useMemo(() => counts(board), [board])
  const legal = useMemo(() => legalMoves(board, 1), [board])
  const flipping = animations.some((animation) => animation.elapsed < animation.maxRing * (reduced ? 20 : 40) + 220)
  const lock = busy || side !== 1 || ended || !!dialog || flipping
  const forcedPass = !ended && side === 1 && turnState(board, 1) === 'pass'
  const touchPass = mobile || touchInput
  const passPrompt = touchPass ? s.yourPassTouch : s.yourPass

  useEffect(() => {
    const element = menu.current
    if (!element) return
    const measure = () => fit(400, 424 + element.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [fit])
  useEffect(() => {
    if (SKILLS.includes(param as Skill)) setSkill(param as Skill)
  }, [param])
  useEffect(() => {
    if (hidden) stopSounds('reversi')
    return () => stopSounds('reversi')
  }, [hidden])
  useEffect(() => { saveGame('reversi', { skill, legal: showLegal }) }, [skill, showLegal])
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (active && !hidden && !dialog) surface.current?.focus({ preventScroll: true })
  }, [active, hidden, dialog])
  useEffect(() => { scrollGesture.current = null }, [active, hidden, dialog, mobile])
  useEffect(() => {
    if (mobile && keyboard && active && !hidden && !dialog) {
      const cell = surface.current?.children[cursor]
      const area = surface.current?.parentElement?.parentElement
      if (cell instanceof HTMLElement && area) {
        const target = cell.getBoundingClientRect()
        const view = area.getBoundingClientRect()
        if (target.top < view.top) area.scrollTop += target.top - view.top
        else if (target.bottom > view.bottom) area.scrollTop += target.bottom - view.bottom
      }
    }
  }, [mobile, keyboard, active, hidden, dialog, cursor])
  useEffect(() => {
    const element = surface.current
    if (!element) return
    const resize = () => {
      const pixels = element.getBoundingClientRect().width / 8 * 0.84 * devicePixelRatio
      setArtWidth(pixels <= 128 ? 128 : pixels <= 320 ? 320 : 600)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    window.addEventListener('resize', resize)
    return () => { observer.disconnect(); window.removeEventListener('resize', resize) }
  }, [])
  useEffect(() => {
    let live = true
    setPortraits((old) => ({ ...old, remy: undefined }))
    loadRemy(player.remy, artWidth).then((image) => { if (live) setPortraits((old) => ({ ...old, remy: image.src })) }).catch(() => {})
    loadPalette(player.remy).then((palette) => { if (live) setHair(palette.hair) }).catch(() => {})
    return () => { live = false }
  }, [player.remy, artWidth])
  useEffect(() => {
    let live = true
    setPortraits((old) => ({ ...old, cabald: undefined }))
    loadCabald().then((members) => loadRemy(members[seed % members.length], artWidth)).then((image) => {
      if (live) setPortraits((old) => ({ ...old, cabald: image.src }))
    }).catch(() => {})
    return () => { live = false }
  }, [seed, artWidth])

  function showMessage(text: string) {
    setMessage(text)
    setAnnouncement(text)
    setDialog('message')
  }

  function makeMove(square: number, mover: Side) {
    const result = playMove(board, square, mover)
    if (!result) {
      setFlash({ square, elapsed: 0 })
      setAnnouncement(s.illegal)
      return
    }
    tone(midiHz(55), 0.055, { type: 'triangle', vol: 0.08, to: midiHz(43), owner: 'reversi' })
    const maxRing = Math.max(...result.flips.map((flip) => Math.max(Math.abs(flip % 8 - square % 8), Math.abs((flip >> 3) - (square >> 3)))))
    setAnimations((old) => [...old, { from: board, side: mover, placed: square, squares: result.flips, maxRing, elapsed: 0, sounded: 0 }])
    setBoard(result.board)
    setHint(null)
    setCursor(square)
    setSide(-mover as Side)
    setAnnouncement(`${s.placed(mover, square, result.flips.length)} ${s.status(counts(result.board).remys, counts(result.board).cabald)}`)
  }

  function newGame() {
    stopSounds('reversi')
    setBoard(initialBoard())
    setSide(1)
    setSeed(Date.now() >>> 0)
    setAnimations([])
    setEnded(false)
    setEndShown(false)
    setDialog(null)
    setHint(null)
    setFlash(null)
    setHintRequested(false)
    setCursor(19)
    response.current = null
    setAnnouncement(s.intro)
  }

  function pass() {
    if (ended || side !== 1 || busy || dialog || flipping) return
    if (legal.length) { showMessage(s.passDenied); return }
    if (turnState(board, 1) === 'end') return
    tone(midiHz(76), 0.09, { type: 'sine', vol: 0.06, owner: 'reversi' })
    tone(midiHz(72), 0.09, { type: 'sine', vol: 0.06, delay: 0.1, owner: 'reversi' })
    setSide(-1)
  }

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!active || hidden || dialog || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
          event.key.toLowerCase() !== 'p' || (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return
      event.preventDefault()
      pass()
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  })

  useEffect(() => {
    if (hidden || dialog || ended) return
    const state = turnState(board, side)
    if (state === 'end') { setEnded(true); return }
    if (side === -1 && state === 'pass') {
      setSide(1)
      tone(midiHz(76), 0.09, { type: 'sine', vol: 0.06, owner: 'reversi' })
      tone(midiHz(72), 0.09, { type: 'sine', vol: 0.06, delay: 0.1, owner: 'reversi' })
      showMessage(s.computerPass)
    } else if (side === 1 && state === 'pass') setAnnouncement(passPrompt)
  }, [board, side, hidden, dialog, ended, passPrompt])

  useEffect(() => {
    if (!ended || endShown || hidden || dialog || animations.length) return
    setEndShown(true)
    const diff = resultCounts.remys - resultCounts.cabald
    showMessage(diff > 0 ? s.win(diff) : diff < 0 ? s.loss(-diff) : s.tie)
    void playJingle(diff > 0 ? winJingle : diff < 0 ? lossJingle : tieJingle, 'reversi')
  }, [ended, endShown, hidden, dialog, animations.length, resultCounts.remys, resultCounts.cabald])

  useEffect(() => {
    if (hidden || dialog || ended || (side === 1 && !hintRequested) || !legalMoves(board, side).length) return
    const worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' })
    response.current = null
    thinkElapsed.current = 0
    setBusy(true)
    setAnnouncement(hintRequested ? s.hintThinking : s.thinking)
    worker.onmessage = (event: MessageEvent<SearchResult>) => { response.current = event.data }
    worker.onerror = () => {
      setBusy(false)
      setHintRequested(false)
      showMessage(s.workerError)
    }
    worker.postMessage({ id: seed, board, side, skill, seed })
    return () => { worker.terminate(); response.current = null; setBusy(false) }
  }, [board, side, skill, seed, hidden, dialog, ended, hintRequested])

  useAnimationFrame((dt, now) => {
    const ms = dt * 1000
    for (const animation of animations) {
      const ring = Math.min(animation.maxRing, Math.floor((animation.elapsed + ms) / (reduced ? 20 : 40)))
      if (ring > animation.sounded && now - lastFlipSound.current >= 40) {
        lastFlipSound.current = now
        tone(midiHz([72, 74, 76, 77, 79][Math.min(4, ring - 1)]), 0.025, { type: 'triangle', vol: 0.06, owner: 'reversi' })
      }
    }
    if (animations.length) setAnimations((old) => old.flatMap((animation) => {
      const elapsed = animation.elapsed + ms
      const stagger = reduced ? 20 : 40
      const ring = Math.min(animation.maxRing, Math.floor(elapsed / stagger))
      return elapsed >= animation.maxRing * stagger + (reduced ? 220 : 660) ? [] : [{ ...animation, elapsed, sounded: ring }]
    }))
    if (hint) setHint((old) => old && hintPhase(old.elapsed + ms) !== 'done' ? { ...old, elapsed: old.elapsed + ms } : null)
    if (flash) setFlash((old) => old && old.elapsed + ms < 260 ? { ...old, elapsed: old.elapsed + ms } : null)
    if (busy) {
      thinkElapsed.current += ms
      if (response.current && thinkElapsed.current >= 400) {
        const answer = response.current
        response.current = null
        setBusy(false)
        if (hintRequested) {
          setHintRequested(false)
          if (answer.move !== null) {
            setCursor(answer.move)
            setKeyboard(true)
            setHint({ square: answer.move, elapsed: 0 })
            setAnnouncement(s.cell(answer.move, 0, true))
          }
        } else if (answer.move !== null) makeMove(answer.move, -1)
      }
    }
  }, { activeOnly: false, paused: hidden || (!animations.length && !hint && !flash && !busy) })

  return (
    <div className={`reversi${hidden ? ' reversi-hidden' : ''}${mobile ? ' reversi-pocket' : ''}`} onPointerDownCapture={(event) => {
      setTouchInput(event.pointerType === 'touch')
      unlockAudio()
      if (ended) { setAnimations([]); stopSounds('reversi') }
    }} onKeyDownCapture={() => {
      setTouchInput(false)
      unlockAudio()
      if (ended) { setAnimations([]); stopSounds('reversi') }
    }}>
      <div ref={menu} className="reversi-menu">
      <GameMenuBar disabled={!!dialog} onOpenChange={(open) => {
        if (!open && active && !hidden && !dialog) surface.current?.focus({ preventScroll: true })
      }} menus={[
        { label: s.game, items: [
          { label: s.newGame, hotkey: 'F2', onClick: newGame }, '-',
          { label: s.hint, hotkey: 'H', disabled: lock || !legal.length, onClick: () => setHintRequested(true) },
          { label: s.pass, hotkey: 'P', accel: false, disabled: ended || side !== 1 || busy || flipping || !!legal.length, onClick: pass }, '-',
          { label: s.sound, checked: !muted, onClick: () => toggleMuted() },
          { label: s.legal, checked: showLegal, onClick: () => setShowLegal(!showLegal) }, '-',
          { label: s.exit, onClick: close },
        ] },
        { label: s.skill, items: SKILLS.map((level) => ({ label: s.skills[level], radio: true, checked: skill === level, onClick: () => setSkill(level) })) },
        { label: s.options, items: [{ label: s.chooseRemy, onClick: () => setDialog('choose') }] },
        { label: s.help, items: [{ label: s.contents, hotkey: 'F1', onClick: () => setDialog('help') }, '-',
          { label: s.about, onClick: () => setDialog('about') }] },
      ]} />
      </div>
      <div className="reversi-play-area" onPointerDown={(event) => {
        if (!mobile || !active || hidden || dialog || event.pointerType !== 'touch' ||
            (event.target instanceof Element && event.target.closest('.reversi-board')) ||
            event.currentTarget.scrollHeight <= event.currentTarget.clientHeight) return
        event.preventDefault()
        scrollGesture.current = { pointer: event.pointerId, y: event.clientY, top: event.currentTarget.scrollTop }
        event.currentTarget.setPointerCapture(event.pointerId)
      }} onPointerMove={(event) => {
        const gesture = scrollGesture.current
        if (!gesture || gesture.pointer !== event.pointerId) return
        event.preventDefault()
        event.currentTarget.scrollTop = gesture.top + gesture.y - event.clientY
      }} onPointerUp={(event) => {
        if (scrollGesture.current?.pointer === event.pointerId) scrollGesture.current = null
      }} onPointerCancel={() => { scrollGesture.current = null }}>
        <div className={`reversi-frame${busy ? ' reversi-thinking' : ''}`}>
          <div className="reversi-board" ref={surface} role="application" aria-label={s.title} tabIndex={0}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (!active || hidden || dialog || event.altKey || event.ctrlKey || event.metaKey) return
              if (ended && animations.length) { setAnimations([]); event.preventDefault(); return }
              const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 }
              if (event.key in steps) {
                event.preventDefault()
                setKeyboard(true)
                const dx = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
                const dy = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
                setCursor(((cursor % 8 + dx + 8) % 8) + (((cursor >> 3) + dy + 8) % 8) * 8)
              } else if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault()
                if (!lock) {
                  if (forcedPass) pass()
                  else makeMove(cursor, 1)
                }
              }
            }}>
            {Array.from(board, (cell, square) => {
              let animation: Animation | undefined
              for (let i = animations.length - 1; i >= 0; i--) if (animations[i].squares.includes(square)) { animation = animations[i]; break }
              const ring = animation ? Math.max(Math.abs(square % 8 - animation.placed % 8), Math.abs((square >> 3) - (animation.placed >> 3))) : 0
              const age = animation ? animation.elapsed - ring * (reduced ? 20 : 40) : 1000
              const shown = animation && age < 110 ? animation.from[square] : cell
              const squash = animation && age >= 0 && age < 220 ? Math.max(0.035, Math.abs(Math.cos(age / 220 * Math.PI))) : 1
              const blink = hint?.square === square && hintPhase(hint.elapsed) === 'on'
              const isLegal = legal.includes(square)
              const particleAge = age - 110
              return (
                <button key={square} type="button" tabIndex={-1} className={`reversi-cell${isLegal && !lock ? ' legal' : ''}${keyboard && cursor === square && hint?.square !== square ? ' cursor' : ''}${blink ? ' hint' : ''}${flash?.square === square ? ' illegal' : ''}`}
                  aria-label={s.cell(square, cell, isLegal)} aria-disabled={lock} onPointerDown={(event) => {
                    if (event.button !== 0 || !active || hidden) return
                    event.preventDefault()
                    surface.current?.focus({ preventScroll: true })
                    if (ended && animations.length) { setAnimations([]); return }
                    if (lock) return
                    setKeyboard(false)
                    setCursor(square)
                    makeMove(square, 1)
                  }}>
                  {showLegal && isLegal && !ended && <span className="reversi-legal-ring" />}
                  {!!cell && <span className={`reversi-coin ${shown === 1 ? 'remy' : 'cabald'}`} style={{ transform: `scaleX(${squash}) scale(${animations.some((item) => item.placed === square && item.elapsed < 17) ? 1.1 : 1})` }}>
                    {squash > 0.15 && (portraits[shown === 1 ? 'remy' : 'cabald']
                      ? <i className="reversi-portrait" style={{ backgroundImage: `url("${portraits[shown === 1 ? 'remy' : 'cabald']}")` }} />
                      : <span>{shown === 1 ? s.remyGlyph : s.cabaldGlyph}</span>)}
                  </span>}
                  {animation && !reduced && particleAge >= 0 && particleAge < 550 && (animation.side === -1
                    ? [0, 1, 2, 3].map((i) => {
                      const t = particleAge / 1000
                      const x = ((i & 1) ? 1 : -1) * (25 + i * 10) * t
                      const y = -(60 + i * 17) * t + 450 * t * t
                      return <i key={i} className="reversi-hair" style={{ background: hair, transform: `translate(${Math.round(x)}px, ${Math.round(y)}px) rotate(${(i & 1 ? 1 : -1) * t * 480}deg)`, opacity: Math.min(1, (550 - particleAge) / 150), '--clump': i } as CSSProperties} />
                    })
                    : particleAge < 250 && <i className="reversi-sparkle" style={{ opacity: 1 - particleAge / 250 }} />)}
                </button>
              )
            })}
            {[18, 22, 50, 54].map((point) => <i className="reversi-dot" key={point} style={{ left: `${point % 8 * 12.5}%`, top: `${(point >> 3) * 12.5}%` }} />)}
          </div>
        </div>
      </div>
      <div className={`reversi-status${forcedPass && touchPass ? ' reversi-status-touch-pass' : ''}`} aria-label={s.status(resultCounts.remys, resultCounts.cabald)}>
        <span className="reversi-status-coin remy">{s.remyGlyph}</span>{s.remys}: {resultCounts.remys}
        <span className="reversi-status-coin cabald">{s.cabaldGlyph}</span>{s.cabald}: {resultCounts.cabald}
        {forcedPass && <button type="button" className="reversi-pass" disabled={lock} onClick={pass}>{passPrompt}</button>}
      </div>
      <span className="reversi-live" aria-live="polite" aria-atomic="true">{announcement}</span>
      {dialog === 'message' && <GameDialog title={s.title} onClose={() => setDialog(null)}><p>{message}</p></GameDialog>}
      {dialog === 'help' && <GameDialog title={s.helpTitle} onClose={() => setDialog(null)} width={420}>
        <GameHelpTabs tabs={s.tabs} selected={helpTab} onChange={setHelpTab} label={s.helpTitle}>
          <p>{s.helpSections[helpTab]}</p>
        </GameHelpTabs>
      </GameDialog>}
      {dialog === 'choose' && <ChooseRemyDialog onClose={() => setDialog(null)} />}
      {dialog === 'about' && <AboutDialog game={s.title} icon={reversiIcon} version={s.version} flavour={s.flavour} lines={s.aboutLines} onClose={() => setDialog(null)} />}
    </div>
  )
}
