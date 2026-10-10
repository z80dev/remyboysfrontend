import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './kit.css'
import { useWindowState } from './window'
import { getGamesPlayer, setGamesPlayerName } from './player'

/** One push button of a {@link GameDialog}. */
export interface GameDialogButton {
  label: ReactNode
  onClick: () => void
  disabled?: boolean
  /** Enter presses this button (blue-rimmed). At most one. */
  default?: boolean
  /** Esc presses this button; without one Esc calls `onClose`. At most one. */
  cancel?: boolean
}

/** Props of {@link GameDialog}. */
export interface GameDialogProps {
  title: string
  /** Close box, Esc without a `cancel` button, and the lone OK of the default button row. */
  onClose: () => void
  /** Buttons left to right; omitted = a single default+cancel OK that calls `onClose`. */
  buttons?: GameDialogButton[]
  /** Body content. Mark the element to focus first with `data-autofocus`; otherwise the default button is focused. */
  children: ReactNode
  /** CSS width of the dialog (`'320px'`), clamped to the window. */
  width?: string | number
  className?: string
}

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'

/**
 * Modal Luna dialog rendered inside the game's own window (portalled into the nearest `.window`, below its title bar),
 * so it follows the window and blocks the game and its menu bar. Parent games SHOULD pause while one is mounted.
 *
 * Keyboard: focus moves into the dialog on mount and is restored on close; Tab cycles within it; Enter presses the
 * default button (unless another button holds focus); Esc presses the cancel button / `onClose`. Keys never reach the
 * game. The menu bar's accelerators are suspended while any `.gk-modal` is mounted.
 */
export function GameDialog({ title, onClose, buttons, children, width, className }: GameDialogProps) {
  const { active, hidden } = useWindowState()
  const titleId = useId()
  const [host, setHost] = useState<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const rows = buttons ?? [{ label: 'OK', onClick: onClose, default: true, cancel: true }]
  const defaultBtn = rows.find((b) => b.default)
  const cancelBtn = rows.find((b) => b.cancel)

  // The sentinel sits in the game's tree; the dialog lives in its Luna window.
  const sentinel = useCallback((el: HTMLElement | null) => {
    if (el) setHost(el.closest<HTMLElement>('.window') ?? document.body)
  }, [])

  const focusFirst = useCallback(() => {
    const d = dialogRef.current
    if (!d) return
    const target =
      d.querySelector<HTMLElement>('[data-autofocus]') ??
      d.querySelector<HTMLElement>('.dialog-buttons .btn.default:not(:disabled)') ??
      d.querySelector<HTMLElement>(FOCUSABLE)
    target?.focus()
    if (target instanceof HTMLInputElement) target.select()
  }, [])

  useEffect(() => {
    if (!host) return
    const before = document.activeElement as HTMLElement | null
    focusFirst()
    return () => {
      if (before?.isConnected) before.focus({ preventScroll: true })
    }
  }, [host, focusFirst])

  // Back in front (window re-activated): take the keyboard back.
  useEffect(() => {
    if (active && !hidden && dialogRef.current && !dialogRef.current.contains(document.activeElement)) focusFirst()
  }, [active, hidden, focusFirst])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing) return
    e.stopPropagation()
    const target = e.target as HTMLElement
    if (e.key === 'Escape') {
      e.preventDefault()
      if (cancelBtn) {
        if (!cancelBtn.disabled) cancelBtn.onClick()
      } else onClose()
    } else if (e.key === 'Enter') {
      if (target.closest('button, a, textarea')) return
      e.preventDefault()
      if (defaultBtn && !defaultBtn.disabled) defaultBtn.onClick()
    } else if (e.key === 'Tab') {
      const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
      if (items.length === 0) return e.preventDefault()
      const i = items.indexOf(document.activeElement as HTMLElement)
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : i === items.length - 1 ? 0 : i + 1
      e.preventDefault()
      items[next].focus()
    }
  }
  const keyHandler = useRef(onKeyDown)
  keyHandler.current = onKeyDown
  useEffect(() => {
    if (!host || !active || hidden) return
    const keydown = (event: KeyboardEvent) => keyHandler.current(event)
    const keyup = (event: KeyboardEvent) => event.stopPropagation()
    const focus = (event: FocusEvent) => {
      const target = event.target as Node | null
      if (target && !dialogRef.current?.contains(target) && (target === document.body || host.contains(target))) focusFirst()
    }
    window.addEventListener('keydown', keydown, true)
    window.addEventListener('keyup', keyup, true)
    document.addEventListener('focusin', focus)
    return () => {
      window.removeEventListener('keydown', keydown, true)
      window.removeEventListener('keyup', keyup, true)
      document.removeEventListener('focusin', focus)
    }
  }, [host, active, hidden, focusFirst])

  return (
    <>
      <span ref={sentinel} hidden />
      {host &&
        createPortal(
          <div
            className={`gk-modal${host === document.body ? ' fixed' : ''}`}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault()
                focusFirst()
              }
            }}
          >
            <dialog
              ref={dialogRef}
              className={`window active dialog msgbox gk-dialog${className ? ` ${className}` : ''}`}
              open
              aria-modal="true"
              aria-labelledby={titleId}
              style={width === undefined ? undefined : { width }}
            >
              <header className="titlebar">
                <span className="title-text" id={titleId}>
                  {title}
                </span>
                <div className="title-controls">
                  <button type="button" className="cap close" aria-label="Close" onClick={onClose} />
                </div>
              </header>
              <div className="window-body">
                {children}
                <div className="dialog-buttons">
                  {rows.map((b, i) => (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: buttons are positional
                      key={i}
                      type="button"
                      className={`btn${b.default ? ' default' : ''}`}
                      disabled={b.disabled}
                      onClick={b.onClick}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </dialog>
          </div>,
          host,
        )}
    </>
  )
}

/** Props of {@link AboutDialog}. */
export interface AboutDialogProps {
  /** Game name; the title bar reads "About <game>". */
  game: string
  /** Icon shown at the left (a 32px node, e.g. an `<Icon>`). */
  icon?: ReactNode
  /** Version shown below Remy OS; defaults to 1.0. */
  version?: string
  /** A game's one-line Remy flavour text. */
  flavour?: ReactNode
  /** Extra lines under the name (version, credits, copyright). */
  lines?: ReactNode[]
  onClose: () => void
}

/** "About <game>" box: icon, bold name, Remy OS line and optional extra lines, OK. */
export function AboutDialog({ game, icon, version = '1.0', flavour = 'There is no Cabald. I love you.', lines, onClose }: AboutDialogProps) {
  return (
    <GameDialog title={`About ${game}`} onClose={onClose}>
      <div className="msg-body gk-about">
        {icon}
        <div>
          <p className="gk-about-name">{game}</p>
          <p>Remy OS</p>
          <p>Version {version}</p>
          <p>{flavour}</p>
          {lines?.map((l, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static lines
            <p key={i}>{l}</p>
          ))}
        </div>
      </div>
    </GameDialog>
  )
}

/** One category of a {@link BestScoresDialog} (e.g. a difficulty level). */
export interface BestScoreRow {
  label: string
  /** Best score, or null when none (shown as an en dash). */
  score: number | null
  name?: string
}

/** Props of {@link BestScoresDialog}. */
export interface BestScoresDialogProps {
  /** Title bar; default "Best Scores". */
  title?: string
  /** Header line over the table, e.g. "Fastest Mine Sweepers". */
  heading?: string
  rows: BestScoreRow[]
  /** Score formatter; default "<n> seconds". */
  format?: (score: number, row: BestScoreRow) => string
  /** Reset Scores pressed. The dialog stays open; the caller clears storage and passes new `rows`. */
  onReset: () => void
  onClose: () => void
}

/** Classic "Fastest Mine Sweepers" table: category, score, name; Reset Scores and OK. */
export function BestScoresDialog({ title = 'Best Scores', heading, rows, format = (n) => `${n} seconds`, onReset, onClose }: BestScoresDialogProps) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) return (
    <GameDialog title="Reset Scores" onClose={() => setConfirming(false)} buttons={[
      { label: 'Yes', default: true, onClick: () => { onReset(); setConfirming(false) } },
      { label: 'No', cancel: true, onClick: () => setConfirming(false) },
    ]}>
      <p>Are you sure you want to reset the scores?</p>
    </GameDialog>
  )
  return (
    <GameDialog
      title={title}
      onClose={onClose}
      buttons={[
        { label: 'Reset Scores', onClick: () => setConfirming(true) },
        { label: 'OK', onClick: onClose, default: true, cancel: true },
      ]}
    >
      {heading && <p className="gk-scores-heading">{heading}</p>}
      <table className="gk-scores">
        <tbody>
          {rows.map((r) => (
            <tr className="gk-scores-row" key={r.label}>
              <td>{r.label}:</td>
              <td className="gk-scores-score">{r.score === null ? '–' : format(r.score, r)}</td>
              <td>{r.score === null ? '' : (r.name ?? 'Anonymous')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </GameDialog>
  )
}

/** Props of {@link NameEntryDialog}. */
export interface NameEntryDialogProps {
  /** Title bar; default "New Record". */
  title?: string
  /** Record category used by the standard fastest-time prompt. */
  level?: string
  /** Optional custom prompt instead of the standard fastest-time message. */
  message?: ReactNode
  /** Prefilled name; defaults to the last name entered in any game, then "Anonymous". */
  defaultName?: string
  maxLength?: number
  /** Receives the trimmed name (never empty). Called on OK/Enter, and on Esc/close unless `onCancel` is given. */
  onSubmit: (name: string) => void
  /** Optional: Esc/close discards the entry instead of submitting it. */
  onCancel?: () => void
}

/** Record-holder name prompt. Like Windows' Minesweeper, dismissing it keeps the record under the typed name. */
export function NameEntryDialog({
  title = 'New Record',
  level = 'this level',
  message,
  defaultName = getGamesPlayer().name,
  maxLength = 32,
  onSubmit,
  onCancel,
}: NameEntryDialogProps) {
  const limit = Math.max(1, Math.min(32, maxLength))
  const [name, setName] = useState(defaultName.slice(0, limit))
  const submit = () => {
    const next = (name.trim() || defaultName.trim() || 'Anonymous').slice(0, limit)
    setGamesPlayerName(next)
    onSubmit(next)
  }
  const dismiss = onCancel ?? submit
  return (
    <GameDialog
      title={title}
      onClose={dismiss}
      buttons={[
        { label: 'OK', onClick: submit, default: true, cancel: !onCancel },
        ...(onCancel ? [{ label: 'Cancel', onClick: onCancel, cancel: true }] : []),
      ]}
    >
      <div className="gk-name">
        <p>{message ?? `You have the fastest time for ${level}. Please type your name:`}</p>
        <input className="input" data-autofocus value={name} maxLength={limit} aria-label="Name" onChange={(e) => setName(e.target.value)} />
      </div>
    </GameDialog>
  )
}
