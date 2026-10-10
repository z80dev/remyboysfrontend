import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, GameDialog, GameMenuBar, loadGame, saveGame, loadRemy, loadCabald, loadPalette,
  useGamesPlayer, useGamesMuted, useWindowState, useWindowFit, useAnimationFrame, unlockAudio, tone, midiHz,
} from '../kit'
import { counts, initialBoard, legalMoves, playMove, turnState, SKILLS, type Board, type Side, type Skill, type SearchResult } from './engine'
import { reversiIcon } from './icon'
import { strings as s } from './strings'
import './reversi.css'

type Options = { skill: Skill; legal: boolean }
type Animation = { from: Board; side: Side; placed: number; squares: number[]; elapsed: number; sounded: number }
type Dialog = 'help' | 'about' | 'message' | null
const validOptions = (v: unknown): v is Options => !!v && typeof v === 'object' && 'skill' in v && SKILLS.includes(v.skill as Skill) &&
  'legal' in v && typeof v.legal === 'boolean'

export default function Reversi({ param, close }: AppProps) {
  const stored = useRef(loadGame<Options>('reversi', { skill: 'novice', legal: false }, validOptions))
  const [skill, setSkill] = useState<Skill>(SKILLS.includes(param as Skill) ? param as Skill : stored.current.skill)
  const [showLegal, setShowLegal] = useState(stored.current.legal)
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
  const [hair, setHair] = useState('#613b20')
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const { player } = useGamesPlayer()
  const { muted, toggleMuted } = useGamesMuted()
  const { active, hidden } = useWindowState()
  const fit = useWindowFit()
  const surface = useRef<HTMLDivElement>(null)
  const response = useRef<SearchResult | null>(null)
  const thinkElapsed = useRef(0)
  const resultCounts = counts(board)
  const legal = legalMoves(board, 1)
  const lock = busy || side !== 1 || ended || !!dialog || animations.length > 0

  useEffect(() => { fit(400, 424) }, [fit])
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
  useEffect(() => {
    let live = true
    setPortraits((old) => ({ ...old, remy: undefined }))
    const rect = surface.current?.getBoundingClientRect()
    const pixels = (rect?.width ?? 400) / 8 * devicePixelRatio
    const width = pixels <= 128 ? 128 : pixels <= 320 ? 320 : 600
    loadRemy(player.remy, width).then((image) => { if (live) setPortraits((old) => ({ ...old, remy: image.src })) }).catch(() => {})
    loadPalette(player.remy).then((palette) => { if (live) setHair(palette.hair) }).catch(() => {})
    return () => { live = false }
  }, [player.remy])
  useEffect(() => {
    let live = true
    setPortraits((old) => ({ ...old, cabald: undefined }))
    loadCabald().then((members) => loadRemy(members[seed % members.length], 128)).then((image) => {
      if (live) setPortraits((old) => ({ ...old, cabald: image.src }))
    }).catch(() => {})
    return () => { live = false }
  }, [seed])

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
    tone(midiHz(55), 0.055, { type: 'triangle', vol: 0.08, to: midiHz(43) })
    setAnimations((old) => [...old, { from: board, side: mover, placed: square, squares: result.flips, elapsed: 0, sounded: -1 }])
    setBoard(result.board)
    setHint(null)
    setCursor(square)
    setSide(-mover as Side)
    setAnnouncement(`${s.placed(mover, square, result.flips.length)} ${s.status(counts(result.board).remys, counts(result.board).cabald)}`)
  }

  function newGame() {
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
    if (ended || side !== 1 || busy || dialog) return
    if (legal.length) { showMessage(s.passDenied); return }
    if (turnState(board, 1) === 'end') return
    tone(midiHz(76), 0.09, { type: 'sine', vol: 0.06 })
    tone(midiHz(72), 0.09, { type: 'sine', vol: 0.06, delay: 0.1 })
    setSide(-1)
  }

  useEffect(() => {
    if (hidden || dialog || ended) return
    const state = turnState(board, side)
    if (state === 'end') { setEnded(true); return }
    if (side === -1 && state === 'pass') {
      setSide(1)
      tone(midiHz(76), 0.09, { type: 'sine', vol: 0.06 })
      tone(midiHz(72), 0.09, { type: 'sine', vol: 0.06, delay: 0.1 })
      showMessage(s.computerPass)
    } else if (side === 1 && state === 'pass') setAnnouncement(s.yourPass)
  }, [board, side, hidden, dialog, ended])

  useEffect(() => {
    if (!ended || endShown || hidden || animations.length) return
    setEndShown(true)
    const diff = resultCounts.remys - resultCounts.cabald
    showMessage(diff > 0 ? s.win(diff) : diff < 0 ? s.loss(-diff) : s.tie)
    const notes = diff > 0 ? [72, 76, 79, 84] : diff < 0 ? [67, 63, 60] : [72, 76, 72]
    notes.forEach((note, index) => tone(midiHz(note), index === notes.length - 1 ? 0.4 : 0.15, {
      type: diff > 0 ? 'square' : 'triangle', vol: 0.08, delay: index * 0.18,
    }))
  }, [ended, endShown, hidden, animations.length, resultCounts.remys, resultCounts.cabald])

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

  useAnimationFrame((dt) => {
    const ms = dt * 1000
    if (animations.length) setAnimations((old) => old.flatMap((animation) => {
      const elapsed = animation.elapsed + ms
      let maxRing = 0
      for (const square of animation.squares) maxRing = Math.max(maxRing, Math.max(Math.abs(square % 8 - animation.placed % 8), Math.abs((square >> 3) - (animation.placed >> 3))))
      const stagger = reduced ? 20 : 40
      const ring = Math.min(maxRing, Math.floor(elapsed / 40))
      if (!hidden && ring > animation.sounded) tone(midiHz([72, 74, 76, 77, 79][Math.min(4, ring)]), 0.025, { type: 'triangle', vol: 0.06 })
      return elapsed >= maxRing * stagger + (reduced ? 220 : 440) ? [] : [{ ...animation, elapsed, sounded: ring }]
    }))
    if (hint) setHint((old) => old && old.elapsed + ms < 1500 ? { ...old, elapsed: old.elapsed + ms } : null)
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
  }, { paused: hidden || (!animations.length && !hint && !flash && !busy) })

  return (
    <div className={`reversi${hidden ? ' reversi-hidden' : ''}`} onPointerDownCapture={() => unlockAudio()} onKeyDownCapture={() => unlockAudio()}>
      <GameMenuBar disabled={!!dialog} menus={[
        { label: s.game, items: [
          { label: s.newGame, hotkey: 'F2', onClick: newGame }, '-',
          { label: s.hint, hotkey: 'H', disabled: lock || !legal.length, onClick: () => setHintRequested(true) },
          { label: s.pass, hotkey: 'P', accel: false, disabled: ended || side !== 1 || busy || !!legal.length, onClick: pass }, '-',
          { label: s.sound, checked: !muted, onClick: () => toggleMuted() },
          { label: s.legal, checked: showLegal, onClick: () => setShowLegal(!showLegal) }, '-',
          { label: s.exit, onClick: close },
        ] },
        { label: s.skill, items: SKILLS.map((level) => ({ label: s.skills[level], radio: true, checked: skill === level, onClick: () => setSkill(level) })) },
        { label: s.help, items: [{ label: s.contents, hotkey: 'F1', onClick: () => setDialog('help') }, '-',
          { label: s.about, onClick: () => setDialog('about') }] },
      ]} />
      <div className="reversi-play-area">
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
                if (!lock) makeMove(cursor, 1)
              } else if (event.key.toLowerCase() === 'p') { event.preventDefault(); pass() }
            }}>
            {Array.from(board, (cell, square) => {
              const animation = [...animations].reverse().find((item) => item.squares.includes(square))
              const ring = animation ? Math.max(Math.abs(square % 8 - animation.placed % 8), Math.abs((square >> 3) - (animation.placed >> 3))) : 0
              const age = animation ? animation.elapsed - ring * (reduced ? 20 : 40) : 1000
              const shown = animation && age < 110 ? animation.from[square] : cell
              const squash = animation && age >= 0 && age < 220 ? Math.max(0.035, Math.abs(Math.cos(age / 220 * Math.PI))) : 1
              const blink = hint?.square === square && Math.floor(hint.elapsed / 250) % 2 === 0
              const isLegal = legal.includes(square)
              const particleAge = age - 110
              return (
                <button key={square} type="button" tabIndex={-1} className={`reversi-cell${isLegal && !lock ? ' legal' : ''}${keyboard && cursor === square ? ' cursor' : ''}${blink ? ' hint' : ''}${flash?.square === square ? ' illegal' : ''}`}
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
                  {!!cell && <span className={`reversi-coin ${shown === 1 ? 'remy' : 'cabald'}`} style={{ transform: `scaleX(${squash})` }}>
                    {squash > 0.15 && (portraits[shown === 1 ? 'remy' : 'cabald']
                      ? <img src={portraits[shown === 1 ? 'remy' : 'cabald']} alt="" draggable={false} />
                      : <span>{shown === 1 ? s.remyGlyph : s.cabaldGlyph}</span>)}
                  </span>}
                  {animation && !reduced && particleAge >= 0 && particleAge < 400 && (animation.side === -1
                    ? [0, 1, 2, 3].map((i) => {
                      const t = particleAge / 1000
                      const x = ((i & 1) ? 1 : -1) * (25 + i * 10) * t
                      const y = -(60 + i * 17) * t + 450 * t * t
                      return <i key={i} className="reversi-hair" style={{ background: hair, transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)`, opacity: Math.min(1, (400 - particleAge) / 150), '--clump': i } as CSSProperties} />
                    })
                    : particleAge < 250 && <i className="reversi-sparkle" style={{ opacity: 1 - particleAge / 250 }} />)}
                </button>
              )
            })}
            {[18, 22, 50, 54].map((point) => <i className="reversi-dot" key={point} style={{ left: `${point % 8 * 12.5}%`, top: `${(point >> 3) * 12.5}%` }} />)}
          </div>
        </div>
      </div>
      <div className="reversi-status" aria-label={s.status(resultCounts.remys, resultCounts.cabald)}>
        <span className="reversi-status-coin remy">{s.remyGlyph}</span>{s.remys}: {resultCounts.remys}
        <span className="reversi-status-coin cabald">{s.cabaldGlyph}</span>{s.cabald}: {resultCounts.cabald}
      </div>
      <span className="reversi-live" aria-live="polite" aria-atomic="true">{announcement}</span>
      {dialog === 'message' && <GameDialog title={s.title} onClose={() => setDialog(null)}><p>{message}</p></GameDialog>}
      {dialog === 'help' && <GameDialog title={s.helpTitle} onClose={() => setDialog(null)} width={420}>
        <div role="tablist" className="reversi-help-tabs">{s.tabs.map((tab, i) => <button key={tab} className="btn" role="tab" id={`reversi-tab-${i}`} aria-controls="reversi-help-panel" aria-selected={helpTab === i}
          onClick={() => setHelpTab(i)} onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault()
              const next = (i + (event.key === 'ArrowRight' ? 1 : 3)) % 4
              setHelpTab(next)
              document.getElementById(`reversi-tab-${next}`)?.focus()
            }
          }}>{tab}</button>)}</div>
        <p id="reversi-help-panel" role="tabpanel" aria-labelledby={`reversi-tab-${helpTab}`}>{s.helpSections[helpTab]}</p>
      </GameDialog>}
      {dialog === 'about' && <AboutDialog game={s.title} icon={reversiIcon} version={s.version} flavour={s.flavour} lines={s.aboutLines} onClose={() => setDialog(null)} />}
    </div>
  )
}
