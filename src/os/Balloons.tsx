import { useEffect, useRef, useState } from 'react'
import { Icon } from './icons'
import { closeMessageBox, dismissBalloon, useShell } from './shell'

/** Open an app through the hash router, re-firing if the hash already points at it. */
export function openApp(id: string) {
  const target = `#/${id}`
  if (window.location.hash === target) window.dispatchEvent(new HashChangeEvent('hashchange'))
  else window.location.hash = target
}

/** Yellow XP notification balloon pointing at the tray. One at a time; auto-hides unless hovered. */
export function BalloonHost() {
  const balloons = useShell((s) => s.balloons)
  const b = balloons[0]
  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (!b || hover) return
    const t = setTimeout(() => dismissBalloon(b.key), 9000)
    return () => clearTimeout(t)
  }, [b, hover])

  if (!b) return null
  const clickable = !!b.app
  return (
    <section className="balloon" aria-live="polite" aria-label="Notification" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button type="button" className="balloon-x" aria-label="Close notification" onClick={() => dismissBalloon(b.key)} />
      <button
        type="button"
        className="balloon-body"
        disabled={!clickable}
        onClick={() => {
          dismissBalloon(b.key)
          if (b.app) openApp(b.app)
        }}
      >
        <span className="balloon-title">
          <Icon name={b.icon} size={16} />
          {b.title}
        </span>
        <span className="balloon-text">{b.text}</span>
      </button>
    </section>
  )
}

export function MessageBoxHost() {
  const boxes = useShell((s) => s.boxes)
  const theme = useShell((s) => s.prefs.theme)
  const box = boxes[0]
  const ok = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!box) return
    ok.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && closeMessageBox(box.id)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [box])
  if (!box) return null
  return (
    <div className={`modal-layer theme-${theme}`}>
      <section className="window active dialog msgbox" role="alertdialog" aria-modal="true" aria-labelledby={`mb-${box.id}`}>
        <header className="titlebar">
          <span className="title-text" id={`mb-${box.id}`}>
            {box.title}
          </span>
          <div className="title-controls">
            <button type="button" className="cap close" aria-label="Close" onClick={() => closeMessageBox(box.id)} />
          </div>
        </header>
        <div className="window-body">
          <div className="msg-body">
            <Icon name={box.icon} size={32} />
            <p>{box.text}</p>
          </div>
          <div className="row center">
            {box.onConfirm ? (
              <>
                <button
                  type="button"
                  ref={ok}
                  className="btn default"
                  onClick={() => {
                    closeMessageBox(box.id)
                    box.onConfirm?.()
                  }}
                >
                  Yes
                </button>
                <button type="button" className="btn" onClick={() => closeMessageBox(box.id)}>
                  No
                </button>
              </>
            ) : (
              <button type="button" ref={ok} className="btn default" onClick={() => closeMessageBox(box.id)}>
                OK
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
