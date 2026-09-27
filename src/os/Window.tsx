import { type PointerEvent as ReactPointerEvent, type ReactNode, useRef } from 'react'
import { Icon } from './icons'

export type WinGeom = { x: number; y: number; w: number; h: number }

type Props = {
  title: string
  icon: string
  accent: string
  geom: WinGeom
  z: number
  active: boolean
  maximized: boolean
  mobile: boolean
  onFocus: () => void
  onClose: () => void
  onMinimize: () => void
  onToggleMax: () => void
  onGeom: (g: WinGeom) => void
  children: ReactNode
}

const TASKBAR = 48

function track(e: ReactPointerEvent, move: (dx: number, dy: number) => void) {
  const sx = e.clientX
  const sy = e.clientY
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  const onMove = (ev: PointerEvent) => move(ev.clientX - sx, ev.clientY - sy)
  const onUp = () => {
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointercancel', onUp)
  }
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
  target.addEventListener('pointercancel', onUp)
}

export function Window(p: Props) {
  const start = useRef(p.geom)
  const free = !p.mobile && !p.maximized

  const onDrag = (e: ReactPointerEvent) => {
    if (!free || e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    start.current = p.geom
    track(e, (dx, dy) => {
      const g = start.current
      const x = Math.min(Math.max(g.x + dx, 80 - g.w), window.innerWidth - 80)
      const y = Math.min(Math.max(g.y + dy, 0), window.innerHeight - TASKBAR - 32)
      p.onGeom({ ...g, x, y })
    })
  }

  const onResize = (e: ReactPointerEvent) => {
    e.stopPropagation()
    start.current = p.geom
    track(e, (dx, dy) => {
      const g = start.current
      p.onGeom({ ...g, w: Math.max(360, g.w + dx), h: Math.max(260, g.h + dy) })
    })
  }

  const style = free ? { left: p.geom.x, top: p.geom.y, width: p.geom.w, height: p.geom.h, zIndex: p.z } : { zIndex: p.z }

  return (
    <section
      className={`window${p.active ? ' active' : ''}${p.maximized ? ' maximized' : ''}`}
      style={{ ...style, ['--accent' as string]: p.accent }}
      onPointerDownCapture={p.onFocus}
      aria-label={p.title}
    >
      <header className="titlebar" onPointerDown={onDrag} onDoubleClick={() => !p.mobile && p.onToggleMax()}>
        <span className="title-icon">
          <Icon name={p.icon} size={16} />
        </span>
        <span className="title-text">{p.title}</span>
        <div className="title-controls">
          <button type="button" className="tc min" aria-label="Minimize" onClick={p.onMinimize}>
            <span />
          </button>
          {!p.mobile && (
            <button type="button" className="tc max" aria-label="Maximize" onClick={p.onToggleMax}>
              <span />
            </button>
          )}
          <button type="button" className="tc close" aria-label="Close" onClick={p.onClose}>
            <span />
          </button>
        </div>
      </header>
      <div className="window-body">{p.children}</div>
      {free && <div className="resize-grip" onPointerDown={onResize} />}
    </section>
  )
}
