import { useEffect, useMemo, useState } from 'react'
import { remySrc } from '../../lib/media'
import './choose.css'
import { GameDialog } from './dialogs'
import { useGamesPlayer } from './player'
import { REMY_COUNT, loadCabald } from './remy'

/** Props of {@link ChooseRemyDialog}. */
export interface ChooseRemyDialogProps {
  /** Close box, Esc, Cancel, and after a successful OK. */
  onClose: () => void
  /** Called with the accepted (non-bald) index after it is stored as the shared player Remy, just before `onClose`. */
  onChoose?: (idx: number) => void
}

const STRIP_STEP = 48
const BALD_ERROR = 'That Remy is busy not existing. Pick another.'
const RANGE_ERROR = `Enter a number from 0 to ${REMY_COUNT - 1}.`

type Roster = { status: 'loading' } | { status: 'error' } | { status: 'ready'; bald: Set<number> }

/** Parse the number field: a plain non-negative integer string, else `undefined`. */
function parseIndex(text: string): number | undefined {
  return /^\d{1,5}$/.test(text.trim()) ? Number(text.trim()) : undefined
}

/**
 * Modal picker for the shared player Remy ("Choose Your Remy…"). A number field (0–{@link REMY_COUNT}-1), a Random
 * button and a horizontally scrollable strip of non-bald thumbnails that grows as it is scrolled. OK stores the pick
 * through {@link useGamesPlayer} and refuses bald Remys with "That Remy is busy not existing. Pick another.". The
 * Cabald roster is fetched on mount; until it loads (or if it cannot be loaded, with a Retry) nothing can be chosen,
 * so a bald Remy can never slip through. Thumbnails are lazy images over a flat placeholder, so art never blocks it.
 */
export function ChooseRemyDialog({ onClose, onChoose }: ChooseRemyDialogProps) {
  const { player, setRemy } = useGamesPlayer()
  const [roster, setRoster] = useState<Roster>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [text, setText] = useState(String(player.remy))
  const [anchor, setAnchor] = useState(player.remy)
  const [length, setLength] = useState(STRIP_STEP)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let live = true
    setRoster({ status: 'loading' })
    loadCabald().then(
      (list) => live && setRoster({ status: 'ready', bald: new Set(list) }),
      () => live && setRoster({ status: 'error' }),
    )
    return () => {
      live = false
    }
  }, [attempt])

  const bald = roster.status === 'ready' ? roster.bald : undefined
  const idx = parseIndex(text)
  const inRange = idx !== undefined && idx < REMY_COUNT
  const isBald = inRange && bald?.has(idx) === true
  const error = isBald ? BALD_ERROR : !inRange && (submitted || text.trim() !== '') ? RANGE_ERROR : undefined
  const pickable = inRange && bald !== undefined && !isBald ? idx : undefined

  // Non-bald Remys from `anchor` upwards (wrapping), as many as have been scrolled into view.
  const strip = useMemo(() => {
    const out: number[] = []
    if (!bald) return out
    for (let i = 0; i < REMY_COUNT && out.length < length; i++) {
      const n = (anchor + i) % REMY_COUNT
      if (!bald.has(n)) out.push(n)
    }
    return out
  }, [bald, anchor, length])

  const pick = (n: number) => {
    setText(String(n))
    setSubmitted(false)
  }

  const random = () => {
    if (!bald) return
    let n = Math.floor(Math.random() * REMY_COUNT)
    while (bald.has(n)) n = (n + 1) % REMY_COUNT
    pick(n)
    setAnchor(n)
    setLength(STRIP_STEP)
  }

  const choose = (n: number) => {
    setRemy(n)
    onChoose?.(n)
    onClose()
  }

  const submit = () => {
    setSubmitted(true)
    if (pickable !== undefined) choose(pickable)
  }

  return (
    <GameDialog
      title="Choose Your Remy"
      onClose={onClose}
      width={400}
      className="gk-choose-dialog"
      buttons={[
        { label: 'OK', onClick: submit, default: true, disabled: roster.status !== 'ready' },
        { label: 'Cancel', onClick: onClose, cancel: true },
      ]}
    >
      <div className="gk-choose">
        <div className="gk-choose-top">
          <div className="gk-choose-preview" aria-hidden="true">
            {pickable !== undefined && <img src={remySrc(pickable, 128)} alt="" width={96} height={96} />}
          </div>
          <div className="gk-choose-fields">
            <label className="gk-choose-label">
              Remy number (0–{REMY_COUNT - 1}):
              <input
                className="input"
                data-autofocus
                inputMode="numeric"
                value={text}
                maxLength={5}
                aria-label="Remy number"
                aria-invalid={error ? true : undefined}
                disabled={roster.status !== 'ready'}
                onChange={(e) => {
                  setText(e.target.value)
                  setSubmitted(false)
                  const n = parseIndex(e.target.value)
                  if (n !== undefined && n < REMY_COUNT) {
                    setAnchor(n)
                    setLength(STRIP_STEP)
                  }
                }}
              />
            </label>
            <button type="button" className="btn" onClick={random} disabled={roster.status !== 'ready'}>
              Random
            </button>
          </div>
        </div>
        {roster.status === 'loading' && <p className="gk-choose-note">Loading the Remy roster…</p>}
        {roster.status === 'error' && (
          <p className="gk-choose-note" role="alert">
            The Remy roster could not be loaded.{' '}
            <button type="button" className="btn" onClick={() => setAttempt((a) => a + 1)}>
              Retry
            </button>
          </p>
        )}
        {error && (
          <p className="gk-choose-error" role="alert">
            {error}
          </p>
        )}
        <div
          className="gk-choose-strip"
          role="listbox"
          aria-label="Remys"
          onScroll={(e) => {
            const el = e.currentTarget
            if (el.scrollLeft + el.clientWidth > el.scrollWidth - 120) setLength((l) => Math.min(l + STRIP_STEP, REMY_COUNT))
          }}
        >
          {strip.map((n) => (
            <button
              key={n}
              type="button"
              role="option"
              aria-selected={n === idx}
              aria-label={`Remy ${n}`}
              className={n === idx ? 'gk-choose-thumb sel' : 'gk-choose-thumb'}
              onClick={() => pick(n)}
              onDoubleClick={() => choose(n)}
            >
              <img src={remySrc(n, 128)} alt="" width={48} height={48} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      </div>
    </GameDialog>
  )
}
