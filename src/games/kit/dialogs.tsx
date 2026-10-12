import { type ReactNode, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './kit.css'
import { useWindowState } from './window'
import { WindowHostContext } from '../../os/windowHost'
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
  /** Requested CSS width (default 320px), clamped to the desktop viewport; Pocket uses the screen width. */
  width?: string | number
  className?: string
  /** Native capture hook before Enter/Esc/Tab handling (e.g. key mapping). `preventDefault()` skips the built-in action. */
  onKeyDownCapture?: (event: KeyboardEvent) => void
}

const FOCUSABLE = ':is(button,input,select,textarea,a[href],[tabindex]):not(:disabled):not([tabindex="-1"])'
const stopBubble = (event: { stopPropagation: () => void }) => event.stopPropagation()
type DialogPlacement = { left: number; top: number; maxWidth: number; maxHeight: number }

/**
 * Modal Luna dialog owned by the nearest game window. Its fixed-position frame uses its requested width and stays
 * inside the viewport; the owning-window backdrop blocks only that game's client area. Closing its window unmounts it.
 *
 * Keyboard: focus moves into the dialog on mount and is restored on close; Tab cycles within it; Enter presses the
 * default button (unless another button holds focus); Esc presses the cancel button / `onClose`. Keys never reach the
 * game. The menu bar's accelerators are suspended while any `.gk-modal` is mounted.
 */
export function GameDialog({ title, onClose, buttons, children, width, className, onKeyDownCapture }: GameDialogProps) {
  const { active, hidden, pocket } = useWindowState()
  const windowHost = useContext(WindowHostContext)
  const titleId = useId()
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null)
  const host = windowHost ?? sentinel?.closest<HTMLElement>('.window') ?? (sentinel && !hidden ? document.body : null)
  const [portalMount] = useState(() => {
    const mount = document.createElement('div')
    mount.style.display = 'contents'
    return mount
  })
  const dialogRef = useRef<HTMLDialogElement>(null)
  const focusedRef = useRef<HTMLElement | null>(null)
  const [placement, setPlacement] = useState<DialogPlacement | null>(null)
  const rows = buttons ?? [{ label: 'OK', onClick: onClose, default: true, cancel: true }]
  const defaultBtn = rows.find((b) => b.default)
  const cancelBtn = rows.find((b) => b.cancel)

  // Keep the React portal and its children intact when the physical Luna/Pocket frame changes.
  useLayoutEffect(() => {
    const before = document.activeElement as HTMLElement | null
    return () => {
      portalMount.remove()
      if (before?.isConnected) before.focus({ preventScroll: true })
    }
  }, [portalMount])

  // Attach before measuring; without a shell, the sentinel resolves a local window or the document body.
  useLayoutEffect(() => {
    if (host) host.appendChild(portalMount)
    else portalMount.remove()
  }, [host, portalMount])

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!host || !dialog || hidden) return
    const fit = () => {
      const viewport = window.visualViewport
      const leftEdge = viewport?.offsetLeft ?? 0
      let topEdge = viewport?.offsetTop ?? 0
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth)
      let bottomEdge = topEdge + (viewport?.height ?? window.innerHeight)
      const pocket = host.classList.contains('pocket-window')
      if (pocket) {
        const body = host.closest('.pk-body')?.getBoundingClientRect()
        if (body) {
          topEdge = Math.max(topEdge, body.top)
          bottomEdge = Math.min(bottomEdge, body.bottom)
        }
      } else {
        const taskbar = host.closest('.desktop')?.querySelector('.taskbar')?.getBoundingClientRect()
        if (taskbar) bottomEdge = Math.min(bottomEdge, taskbar.top)
      }
      const maxWidth = Math.max(1, rightEdge - leftEdge - 16)
      const maxHeight = Math.max(1, bottomEdge - topEdge - 16)
      const owner = host.getBoundingClientRect()
      const rect = dialog.getBoundingClientRect()
      const w = Math.min(rect.width, maxWidth)
      const h = Math.min(rect.height, maxHeight)
      const left = Math.round(Math.max(leftEdge + 8, Math.min(owner.left + (owner.width - w) / 2, rightEdge - w - 8)))
      const top = Math.round(Math.max(topEdge + 8, Math.min(owner.top + (owner.height - h) / 2, bottomEdge - h - 8)))
      setPlacement((previous) =>
        previous?.left === left && previous.top === top && previous.maxWidth === maxWidth && previous.maxHeight === maxHeight
          ? previous
          : { left, top, maxWidth, maxHeight },
      )
    }
    fit()
    const resize = new ResizeObserver(fit)
    resize.observe(host)
    resize.observe(dialog)
    const moved = new MutationObserver(fit)
    moved.observe(host, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] })
    window.addEventListener('resize', fit)
    window.visualViewport?.addEventListener('resize', fit)
    window.visualViewport?.addEventListener('scroll', fit)
    return () => {
      resize.disconnect()
      moved.disconnect()
      window.removeEventListener('resize', fit)
      window.visualViewport?.removeEventListener('resize', fit)
      window.visualViewport?.removeEventListener('scroll', fit)
    }
  }, [host, hidden])

  const focusFirst = useCallback(() => {
    const d = dialogRef.current
    if (!d) return
    const focused = focusedRef.current
    if (focused?.isConnected && d.contains(focused) && focused.matches(FOCUSABLE)) {
      focused.focus({ preventScroll: true })
      return
    }
    const target =
      d.querySelector<HTMLElement>('[data-autofocus]:not(:disabled)') ??
      d.querySelector<HTMLElement>('.dialog-buttons .btn.default:not(:disabled)') ??
      d.querySelector<HTMLElement>(FOCUSABLE)
    target?.focus()
    if (target instanceof HTMLInputElement) target.select()
  }, [])

  // Wait for viewport placement (the initial frame is hidden), and reclaim focus when re-activated.
  useEffect(() => {
    if (host && active && !hidden && placement && dialogRef.current && !dialogRef.current.contains(document.activeElement)) focusFirst()
  }, [host, active, hidden, placement, focusFirst])

  const onKeyDown = (e: KeyboardEvent) => {
    onKeyDownCapture?.(e)
    if (e.defaultPrevented || e.isComposing) return
    const target = e.target as HTMLElement
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      if (cancelBtn) {
        if (!cancelBtn.disabled) cancelBtn.onClick()
      } else onClose()
    } else if (e.key === 'Enter') {
      if (target.closest('button, a, textarea')) return
      e.stopPropagation()
      e.preventDefault()
      if (defaultBtn && !defaultBtn.disabled) defaultBtn.onClick()
    } else if (e.key === 'Tab') {
      e.stopPropagation()
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
    const focus = (event: FocusEvent) => {
      const target = event.target as Node | null
      if (target && !dialogRef.current?.contains(target) && (target === document.body || host.contains(target))) focusFirst()
    }
    window.addEventListener('keydown', keydown, true)
    document.addEventListener('focusin', focus)
    return () => {
      window.removeEventListener('keydown', keydown, true)
      document.removeEventListener('focusin', focus)
    }
  }, [host, active, hidden, focusFirst])

  return (
    <>
      <span ref={setSentinel} hidden />
      {createPortal(
        <div
          className={`gk-modal${host === document.body ? ' fixed' : ''}`}
          onFocusCapture={(e) => {
            if (dialogRef.current?.contains(e.target)) focusedRef.current = e.target
          }}
          onKeyDown={stopBubble}
          onKeyUp={stopBubble}
          onPointerUp={stopBubble}
          onPointerMove={stopBubble}
          onMouseDown={stopBubble}
          onMouseUp={stopBubble}
          onMouseMove={stopBubble}
          onClick={stopBubble}
          onDoubleClick={stopBubble}
          onContextMenu={stopBubble}
          onPointerDown={(e) => {
            e.stopPropagation()
            if (e.target === e.currentTarget) {
              e.preventDefault()
              focusFirst()
            }
          }}
        >
          <dialog
            ref={dialogRef}
            className={`window${active ? ' active' : ''} dialog msgbox gk-dialog${className ? ` ${className}` : ''}`}
            open
            aria-modal="true"
            aria-labelledby={titleId}
            style={{
              width: pocket || host?.classList.contains('pocket-window') ? 'calc(100vw - 16px)' : width,
              left: placement?.left,
              top: placement?.top,
              maxWidth: placement?.maxWidth,
              maxHeight: placement?.maxHeight,
              visibility: placement ? 'visible' : 'hidden',
            }}
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
              <div className="gk-dialog-content">{children}</div>
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
        portalMount,
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
        {icon && (
          <span className="gk-about-icon" aria-hidden="true">
            {icon}
          </span>
        )}
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
  /** Optional extra column (e.g. level), shown between the name/score columns. */
  detail?: ReactNode
}

/** Props of {@link BestScoresDialog}. */
export interface BestScoresDialogProps {
  /** Title bar; default "Best Scores". */
  title?: string
  /** Requested table width; omitted sizes naturally for names (at least 320px), always viewport-clamped. */
  width?: string | number
  /** Header line over the table, e.g. "Fastest Mine Sweepers". */
  heading?: string
  /** Optional game-owned controls (e.g. score-table tabs), rendered before the heading and table. */
  children?: ReactNode
  /** Optional column captions; default Minesweeper view has no header row. */
  headings?: { label: string; score: string; name: string; detail?: string }
  /** Display label/name/score rather than label/score/name (for Pinball's Rank/Name/Score table). */
  nameFirst?: boolean
  rows: BestScoreRow[]
  /** Score formatter; default "<n> seconds". */
  format?: (score: number, row: BestScoreRow) => string
  /** Reset Scores pressed. The dialog stays open; the caller clears storage and passes new `rows`. */
  onReset: () => void
  onClose: () => void
}

/** Classic "Fastest Mine Sweepers" table: category, score, name; Reset Scores and OK. */
export function BestScoresDialog({
  title = 'Best Scores',
  width,
  heading,
  children,
  headings,
  nameFirst = false,
  rows,
  format = (n) => `${n} seconds`,
  onReset,
  onClose,
}: BestScoresDialogProps) {
  const [confirming, setConfirming] = useState(false)
  const detailed = headings?.detail !== undefined || rows.some((row) => row.detail != null)
  if (confirming)
    return (
      <GameDialog
        title="Reset Scores"
        onClose={() => setConfirming(false)}
        buttons={[
          {
            label: 'Yes',
            default: true,
            onClick: () => {
              onReset()
              setConfirming(false)
            },
          },
          { label: 'No', cancel: true, onClick: () => setConfirming(false) },
        ]}
      >
        <p>Are you sure you want to reset the scores?</p>
      </GameDialog>
    )
  return (
    <GameDialog
      title={title}
      width={width ?? 'max-content'}
      className={`gk-best-scores${width === undefined ? ' natural' : ''}`}
      onClose={onClose}
      buttons={[
        { label: 'Reset Scores', onClick: () => setConfirming(true) },
        { label: 'OK', onClick: onClose, default: true, cancel: true },
      ]}
    >
      {children}
      {heading && <p className="gk-scores-heading">{heading}</p>}
      <table className={`gk-scores${nameFirst ? ' names-first' : ''}${detailed ? ' detailed' : ''}`}>
        {headings && (
          <thead>
            <tr className="gk-scores-row">
              <th>{headings.label}</th>
              <th>{nameFirst ? headings.name : headings.score}</th>
              {detailed && <th>{headings.detail}</th>}
              <th>{nameFirst ? headings.score : headings.name}</th>
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((r) => (
            <tr className="gk-scores-row" key={r.label}>
              <td>
                {r.label}
                {headings ? '' : ':'}
              </td>
              {nameFirst ? (
                <td className="gk-scores-name" title={r.score === null ? '' : (r.name ?? 'Anonymous')}>
                  {r.score === null ? '' : (r.name ?? 'Anonymous')}
                </td>
              ) : (
                <td className="gk-scores-score">{r.score === null ? '–' : format(r.score, r)}</td>
              )}
              {detailed && <td>{r.detail ?? '–'}</td>}
              {nameFirst ? (
                <td className="gk-scores-score">{r.score === null ? '–' : format(r.score, r)}</td>
              ) : (
                <td className="gk-scores-name" title={r.score === null ? '' : (r.name ?? 'Anonymous')}>
                  {r.score === null ? '' : (r.name ?? 'Anonymous')}
                </td>
              )}
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
