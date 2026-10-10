import type { PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useState, useSyncExternalStore } from 'react'

/** Follows one pointer from a pointerdown (captured on the target) until it is released. */
export function track(e: ReactPointerEvent, move: (ev: PointerEvent) => void, end?: (ev: PointerEvent) => void) {
  const el = e.currentTarget as HTMLElement
  const id = e.pointerId
  el.setPointerCapture(id)
  const onMove = (ev: PointerEvent) => ev.pointerId === id && move(ev)
  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
    end?.(ev)
  }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
}

/**
 * Slider value 0..1 for a pointer over `el` (`size` skin px long): the thumb (`thumb` px, moving over `travel` px)
 * centres on the pointer, as clicking a Winamp track jumps the thumb there.
 */
export function slideValue(
  ev: { clientX: number; clientY: number },
  el: Element,
  axis: 'x' | 'y',
  size: number,
  thumb: number,
  travel = size - thumb,
) {
  const r = el.getBoundingClientRect()
  const px = axis === 'x' ? ((ev.clientX - r.left) / r.width) * size : ((ev.clientY - r.top) / r.height) * size
  return Math.min(1, Math.max(0, (px - thumb / 2) / travel))
}

/** m:ss */
export function mmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** m:ss, or h:mm:ss from an hour up. */
export function hmmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  if (s < 3600) return mmss(s)
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/* Marquee override text ("VOLUME: 63%", "SEEK TO: …") while a control is being dragged. */
let message: string | undefined
const listeners = new Set<() => void>()

export function setMessage(text?: string) {
  if (text === message) return
  message = text
  for (const l of listeners) l()
}

export function useMessage() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => message,
  )
}

/** Re-renders every `ms` while `on`: for displays that follow `player.time()`. */
export function useTicker(on: boolean, ms = 250) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!on) return
    const t = window.setInterval(() => setTick((n) => n + 1), ms)
    return () => window.clearInterval(t)
  }, [on, ms])
}
