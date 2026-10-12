import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { AppProps } from '../../os/apps'
import {
  AboutDialog, BestScoresDialog, GameDialog, GameHelpTabs, GameMenuBar, LedCounter, NameEntryDialog, loadGame, saveGame, stopSounds,
  unlockAudio, useAnimationFrame, useCrispCanvas, useGamesMuted, useWindowFit, useWindowState
} from '../kit'
import {
  COLS, ROWS, addHighScore, advanceTo, createGame, DEFAULT_PREFERENCES, fastFlow, followingLevel, levelForPassword,
  levelParameters, nextCell, passwordForLevel, placePiece, sanitizePreferences, validPreferences
} from './engine'
import type { Piece, PipeGame, Preferences } from './engine'
import { AUDIO_OWNER, playEvents } from './audio'
import { icon } from './icon'
import { BoardRenderer, drawPiece } from './renderer'
import { strings } from './strings'
import './pipe-dream.css'

type Dialog = 'help' | 'about' | 'scores' | 'password' | 'record' | null
function Preview({ piece }: { piece: Piece }) {
  const canvas = useCrispCanvas(48, 48, { smoothing: true, onResize: () => { if (canvas.ctx.current) drawPiece(canvas.ctx.current, piece) } })
  useEffect(() => { if (canvas.ctx.current) drawPiece(canvas.ctx.current, piece) }, [piece])
  return <canvas ref={canvas.ref} aria-label={strings.pieceNames[piece]} />
}
export default function PipeDream({ close }: AppProps) {
  const fit = useWindowFit()
  const { active, hidden, pocket } = useWindowState()
  const { muted, toggleMuted } = useGamesMuted()
  const [preferences, setPreferences] = useState(() => sanitizePreferences(loadGame('pipe-dream', DEFAULT_PREFERENCES, validPreferences)))
  const [game, setGame] = useState(() => createGame(Date.now() >>> 0))
  const gameRef = useRef(game)
  const time = useRef(0)
  const [cursor, setCursor] = useState(() => nextCell(game, game.source, game.outlet))
  const cursorRef = useRef(cursor)
  cursorRef.current = cursor
  const [paused, setPaused] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [helpTab, setHelpTab] = useState(0)
  const [password, setPassword] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [bonusIntro, setBonusIntro] = useState(false)
  const celebrationTime = useRef(0)
  const recorded = useRef(false)
  const lastSounds = useRef<Record<string, number>>({})
  const [announcement, setAnnouncement] = useState(strings.start)
  const surface = useRef<HTMLDivElement>(null)
  const renderer = useRef<BoardRenderer | null>(null)
  const countdown = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(-1)
  const [touch, setTouch] = useState(false)
  const canvas = useCrispCanvas(480, 336, { smoothing: true, onResize: () => redraw() })
  const running = game.phase === 'countdown' || game.phase === 'flow'
  const obscured = paused || menuOpen || !!dialog
  const distance = game.bonus ? strings.bonusDistance : Math.max(0, levelParameters(game.level).distance - game.length)
  const celebrationLimit = useRef(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 600 : 1200)

  function redraw() {
    const context = canvas.ctx.current
    if (context) renderer.current?.draw(context, gameRef.current, time.current, cursorRef.current, preferences.grid, celebrating ? celebrationTime.current : 0, canvas.scale.current)
    const current = gameRef.current
    if (countdown.current) {
      const remaining = current.phase === 'countdown' ? Math.max(0, (current.deadline - time.current) / current.duration) : 0
      countdown.current.style.transform = `scaleX(${remaining})`
      countdown.current.style.backgroundColor = `hsl(${remaining * 120} 70% 36%)`
    }
  }
  function persist(next: Preferences) {
    const clean = sanitizePreferences(next)
    setPreferences(clean)
    saveGame('pipe-dream', clean)
  }
  function adopt(next: PipeGame) {
    if (next === gameRef.current) return
    const previous = gameRef.current
    gameRef.current = next
    setGame(next)
    if (!muted) playEvents(next, lastSounds.current, performance.now(), previous.queue[4])
    if (next.crosses >= 5 && previous.crosses < 5) setAnnouncement(strings.fiveCrosses)
    else if (next.length !== previous.length || next.score !== previous.score) {
      setAnnouncement(strings.scoreAnnouncement(next.score, next.bonus ? null : Math.max(0, levelParameters(next.level).distance - next.length)))
    }
    if (next.phase !== previous.phase && (next.phase === 'passed' || next.phase === 'failed' || next.phase === 'bonus-end')) {
      celebrationTime.current = 0
      setCelebrating(true)
      const drained = next.board[next.head] === 'drain' && next.filled[next.head] !== 0
      setAnnouncement(next.phase === 'passed' ? drained ? strings.drainPass : strings.pass
        : next.phase === 'failed' ? drained ? strings.drainShort : strings.fail : strings.bonusEnd)
      if (next.phase === 'bonus-end') {
        const word = passwordForLevel(next.level + 1)
        if (word && !preferences.passwords.includes(word)) persist({ ...preferences, passwords: [...preferences.passwords, word] })
      }
    }
  }
  function newGame(level = 1) {
    stopSounds(AUDIO_OWNER)
    const next = createGame(Date.now() >>> 0, level)
    gameRef.current = next
    time.current = 0
    setGame(next)
    setCursor(nextCell(next, next.source, next.outlet))
    setPaused(false)
    setDialog(null)
    setCelebrating(false)
    setBonusIntro(false)
    recorded.current = false
    lastSounds.current = {}
    setAnnouncement(strings.levelAnnouncement(level, levelParameters(level).distance))
    surface.current?.focus()
  }
  function openDialog(next: Dialog) {
    if (running) setPaused(true)
    stopSounds(AUDIO_OWNER)
    setDialog(next)
  }
  function finishCelebration() {
    setCelebrating(false)
    stopSounds(AUDIO_OWNER)
    const current = gameRef.current
    if (current.phase === 'failed' && current.score > 0 && !recorded.current &&
      (preferences.scores.length < 10 || current.score > preferences.scores[preferences.scores.length - 1].score)) {
      recorded.current = true
      setDialog('record')
      return true
    }
    return false
  }
  function continueLevel() {
    if (celebrating && finishCelebration()) return
    if (gameRef.current.phase === 'failed') {
      newGame()
      return
    }
    const next = followingLevel(gameRef.current)
    if (next === gameRef.current) return
    gameRef.current = next
    time.current = 0
    setGame(next)
    setBonusIntro(next.bonus)
    setCursor(nextCell(next, next.source, next.outlet))
    setPaused(false)
    setAnnouncement(next.bonus ? strings.bonus : strings.levelAnnouncement(next.level, levelParameters(next.level).distance))
    surface.current?.focus()
  }
  function togglePause() {
    if (!running && !celebrating) return
    setPaused(value => !value)
    stopSounds(AUDIO_OWNER)
  }
  function place(index: number) {
    if (!active || hidden || dialog || menuOpen) return
    unlockAudio()
    surface.current?.focus()
    if (celebrating) {
      finishCelebration()
      return
    }
    if (!running) return
    if (paused) {
      setPaused(false)
      return
    }
    setCursor(index)
    adopt(placePiece(gameRef.current, index, time.current))
    redraw()
  }
  function startFast() {
    if (!active || hidden || paused || dialog) return
    unlockAudio()
    adopt(fastFlow(gameRef.current, time.current))
    redraw()
  }
  function enterPassword() {
    const level = levelForPassword(password)
    if (level === null) {
      setPasswordError(true)
      return
    }
    newGame(level)
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!active || hidden || dialog || menuOpen || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'Tab') return
    unlockAudio()
    if (celebrating) {
      event.preventDefault()
      finishCelebration()
      return
    }
    if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', ' ', 'Enter'].includes(event.key)) return
    event.preventDefault()
    if (paused) {
      setPaused(false)
      return
    }
    if (!running) {
      if (event.key === ' ' || event.key === 'Enter') continueLevel()
      return
    }
    if (event.key === ' ' || event.key === 'Enter') {
      place(cursor)
      return
    }
    const x = cursor % COLS
    const y = Math.floor(cursor / COLS)
    if (event.key === 'ArrowLeft') setCursor(y * COLS + Math.max(0, x - 1))
    if (event.key === 'ArrowRight') setCursor(y * COLS + Math.min(COLS - 1, x + 1))
    if (event.key === 'ArrowUp') setCursor(Math.max(0, y - 1) * COLS + x)
    if (event.key === 'ArrowDown') setCursor(Math.min(ROWS - 1, y + 1) * COLS + x)
  }
  function cellAt(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(COLS - 1, Math.floor((event.clientX - bounds.left) / bounds.width * COLS)))
    const y = Math.max(0, Math.min(ROWS - 1, Math.floor((event.clientY - bounds.top) / bounds.height * ROWS)))
    return y * COLS + x
  }

  useEffect(() => {
    renderer.current = new BoardRenderer()
    redraw()
    return () => {
      renderer.current?.dispose()
      renderer.current = null
      stopSounds(AUDIO_OWNER)
    }
  }, [])
  useEffect(() => { fit(584, 424) }, [fit])
  useEffect(() => {
    if (!active || hidden) {
      setPaused(true)
      stopSounds(AUDIO_OWNER)
    } else if (!dialog) surface.current?.focus()
  }, [active, hidden, dialog])
  useEffect(() => { redraw() }, [game, cursor, preferences.grid, celebrating, paused])
  useAnimationFrame(dt => {
    if (celebrating) {
      celebrationTime.current += dt * 1000
      if (celebrationTime.current >= celebrationLimit.current) finishCelebration()
    } else {
      time.current += dt * 1000
      if (bonusIntro && time.current >= 1500) setBonusIntro(false)
      adopt(advanceTo(gameRef.current, time.current))
    }
    redraw()
  }, { paused: paused || menuOpen || !!dialog || (!running && !celebrating), maxDt: .1 })

  const menus = [
    { label: strings.game, items: [
      { label: strings.new, hotkey: strings.accelerators.new, onClick: () => newGame() },
      { label: strings.enterPassword, onClick: () => {
        setPassword('')
        setPasswordError(false)
        openDialog('password')
      } },
      { label: strings.pauseMenu, hotkey: strings.accelerators.pause, checked: paused, disabled: !running && !celebrating, onClick: togglePause },
      { label: strings.fastMenu, hotkey: strings.accelerators.fast, checked: game.fast, disabled: !running || game.bonus || paused, onClick: startFast },
      '-' as const, { label: strings.highScores, onClick: () => openDialog('scores') }, '-' as const, { label: strings.exit, onClick: close }
    ] },
    { label: strings.options, items: [
      { label: strings.sound, checked: !muted, onClick: () => {
        unlockAudio()
        toggleMuted()
      } },
      { label: strings.grid, checked: preferences.grid, onClick: () => persist({ ...preferences, grid: !preferences.grid }) }
    ] },
    { label: strings.help, items: [
      { label: strings.contents, hotkey: strings.accelerators.help, onClick: () => openDialog('help') }, '-' as const,
      { label: strings.about, onClick: () => openDialog('about') }
    ] }
  ]
  const selected = strings.selectedCell(cursor % COLS + 1, Math.floor(cursor / COLS) + 1, strings.pieceNames[game.board[cursor]])
  const drained = game.board[game.head] === 'drain' && game.filled[game.head] !== 0
  const endMessage = game.phase === 'passed' ? drained ? strings.drainPass : strings.pass
    : game.phase === 'failed' ? drained ? strings.drainShort : strings.fail : strings.bonusEnd
  const earnedPassword = game.phase === 'bonus-end' ? passwordForLevel(game.level + 1) : null
  const unused = game.placed.reduce((count, placed, index) => count + (placed && game.filled[index] === 0 ? 1 : 0), 0)
  return (
    <div className={`pipe-dream${pocket ? ' pd-pocket' : ''}${touch ? ' pd-touch' : ''}${obscured ? ' pd-obscured' : ''}`} onPointerDownCapture={event => {
      unlockAudio()
      if (event.pointerType === 'touch') setTouch(true)
    }}>
      <GameMenuBar menus={menus} disabled={!!dialog} onOpenChange={setMenuOpen} />
      <div className='pd-surface' ref={surface} tabIndex={0} role='application' aria-label={strings.title} aria-describedby='pd-selected-cell' onKeyDown={keyDown}>
        <header className='pd-header w9x-raised'>
          <label className='pd-level'>{strings.level}<strong>{game.level}</strong></label>
          <label>{strings.score}<LedCounter value={game.score} digits={6} /></label>
          <label>{strings.distance}<LedCounter value={distance} digits={2} /></label>
          <div className='pd-countdown w9x-sunken' role='img' aria-label={strings.countdown}><div ref={countdown} /></div>
          <button className='pd-fast w9x-raised' aria-label={strings.fastLabel} onClick={startFast} disabled={game.fast || game.bonus || !running || paused}>{strings.fast}</button>
        </header>
        <div className='pd-playfield'>
          <aside className={`pd-dispenser w9x-sunken${game.bonus ? ' pd-bonus-dispenser' : ''}`} aria-label={strings.dispenser} aria-hidden={game.bonus || obscured}>
            {game.queue.map((piece, index) => <div className={`pd-preview${index === 4 ? ' pd-next' : ''}`} key={index}><Preview piece={piece} />{index === 4 && <span>{strings.next}</span>}</div>)}
          </aside>
          <div className='pd-board w9x-sunken'>
            <canvas ref={canvas.ref} aria-label={obscured ? strings.boardCovered : selected}
              title={!obscured && hovered >= 0 && game.board[hovered] === 'block' ? strings.block : undefined}
              onPointerDown={event => {
                if (event.button === 0) {
                  event.preventDefault()
                  place(cellAt(event))
                }
              }}
              onPointerMove={event => setHovered(cellAt(event))} onPointerLeave={() => setHovered(-1)} onContextMenu={event => event.preventDefault()} />
            {bonusIntro && <div className='pd-bonus-banner w9x-raised'>{strings.bonus}</div>}
            {paused && running && !dialog && !menuOpen && <div className='pd-overlay pd-pause-overlay'><p>{strings.paused}</p><button onClick={() => {
              setPaused(false)
              surface.current?.focus()
            }}>{strings.resume}</button></div>}
            {!running && <div className='pd-overlay' onClick={() => { if (celebrating) finishCelebration() }}>
              <p>{endMessage}</p>
              {earnedPassword && <p className='pd-password'>{strings.passwordGiven(earnedPassword)}</p>}
              <strong>{strings.points(game.score)}</strong>
              <dl className='pd-tally'>
                <dt>{strings.sections}</dt><dd>{game.length}</dd>
                {!game.bonus && <><dt>{strings.crossovers}</dt><dd>{game.crosses}</dd>
                  <dt>{strings.unused}</dt><dd>{strings.unusedTally(unused)}</dd></>}
              </dl>
              <button onClick={event => {
                event.stopPropagation()
                continueLevel()
              }}>{game.phase === 'failed' ? strings.newGame : strings.continue}</button>
            </div>}
          </div>
        </div>
        <div className='pd-pocket-controls'>
          <button onClick={startFast} disabled={game.fast || game.bonus || !running || paused} aria-label={strings.fastLabel}>{strings.fast}</button>
          <button onClick={togglePause} disabled={!running}>{paused ? strings.resume : strings.pause}</button>
        </div>
        <footer className='statusbar'><span className='sb-cell grow'>{game.bonus ? strings.bonus : paused ? strings.paused : strings.start}</span></footer>
        <span id='pd-selected-cell' className='pd-sr-only'>{obscured ? strings.boardCovered : selected}</span>
        <span className='pd-sr-only' aria-live='polite'>{announcement}</span>
      </div>
      {dialog === 'help' && <GameDialog title={strings.helpTitle} onClose={() => setDialog(null)} width={470}>
        <GameHelpTabs tabs={strings.helpTabs} selected={helpTab} onChange={setHelpTab}>
          {helpTab === 0 ? <ol className='pd-help-rules'>{strings.helpPages[helpTab].map(paragraph =>
            <li key={paragraph}>{paragraph}</li>)}</ol>
            : strings.helpPages[helpTab].map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </GameHelpTabs>
      </GameDialog>}
      {dialog === 'about' && <AboutDialog game={strings.title} icon={icon} version={strings.version} flavour={strings.flavour} lines={strings.credits} onClose={() => setDialog(null)} />}
      {dialog === 'scores' && <BestScoresDialog title={strings.scoresTitle} heading={strings.scoresHeading} headings={strings.scoreHeadings} nameFirst width={480}
        rows={Array.from({ length: 10 }, (_, index) => ({
          label: strings.rank(index + 1), score: preferences.scores[index]?.score ?? null,
          name: preferences.scores[index]?.name, detail: preferences.scores[index]?.level ?? strings.noScore
        }))}
        format={strings.scoreValue} onReset={() => persist({ ...preferences, scores: [] })} onClose={() => setDialog(null)} />}
      {dialog === 'record' && <NameEntryDialog title={strings.recordTitle} message={strings.recordMessage} onSubmit={name => {
        persist({ ...preferences, scores: addHighScore(preferences.scores, name, game.score, game.level) })
        setDialog('scores')
      }} />}
      {dialog === 'password' && <GameDialog title={strings.passwordTitle} onClose={() => setDialog(null)} buttons={[
        { label: strings.ok, onClick: enterPassword, default: true }, { label: strings.cancel, onClick: () => setDialog(null), cancel: true }
      ]}>
        <label className='pd-password-entry'>{strings.passwordPrompt}<input className='input' data-autofocus value={password} maxLength={4}
          onChange={event => {
            setPassword(event.target.value.toUpperCase())
            setPasswordError(false)
          }} aria-invalid={passwordError} /></label>
        {passwordError && <p role='alert'>{strings.invalidPassword}</p>}
        <p>{strings.passwords}</p>
        {preferences.passwords.length ? <div className='pd-password-list'>{preferences.passwords.map(word => <button key={word} onClick={() => {
          setPassword(word)
          setPasswordError(false)
        }}>{word}</button>)}</div> : <p>{strings.noPasswords}</p>}
      </GameDialog>}
    </div>
  )
}
