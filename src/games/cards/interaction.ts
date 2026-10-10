import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { unlockAudio } from '../kit'
import { easeOut, isDoubleClick, moveDuration, type Card, type CardHit } from './model'

export type CardDrag = { source: CardHit; x: number; y: number; originX: number; originY: number }
export type CardPointerOptions = {
  hitTest: (x: number, y: number) => CardHit | null
  onTap: (hit: CardHit | null, x: number, y: number) => void
  onDoubleTap: (hit: CardHit, x: number, y: number) => void
  onDrop: (source: CardHit, target: CardHit | null, x: number, y: number) => void
  onContext: (hit: CardHit | null, x: number, y: number) => void
  disabled?: boolean
  outline?: boolean
}

type Press = { pointer: number; hit: CardHit | null; x: number; y: number; moved: boolean; consumed: boolean; time: number }

export function useCardPointer(options: CardPointerOptions) {
  const callbacks = useRef(options)
  callbacks.current = options
  const press = useRef<Press | null>(null)
  const previous = useRef<{ time: number; key: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const frame = useRef<number | null>(null)
  const [drag, setDrag] = useState<CardDrag | null>(null)
  const [longPress, setLongPress] = useState<{ x: number; y: number; progress: number } | null>(null)

  function stopHold() {
    window.clearTimeout(timer.current)
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    timer.current = undefined
    frame.current = null
    setLongPress(null)
  }
  function cancel() {
    stopHold()
    press.current = null
    setDrag(null)
  }

  useEffect(() => () => {
    window.clearTimeout(timer.current)
    if (frame.current !== null) cancelAnimationFrame(frame.current)
  }, [])
  useEffect(() => { if (options.disabled) cancel() }, [options.disabled])

  const point = (e: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (callbacks.current.disabled || e.button !== 0) return
    unlockAudio()
    e.currentTarget.focus({ preventScroll: true })
    const { x, y } = point(e)
    const hit = callbacks.current.hitTest(x, y)
    press.current = { pointer: e.pointerId, hit, x, y, moved: false, consumed: false, time: performance.now() }
    e.currentTarget.setPointerCapture(e.pointerId)
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      const pulse = () => {
        const held = press.current
        if (!held || held.moved || held.consumed) return
        setLongPress({ x: held.x, y: held.y, progress: Math.min(1, (performance.now() - held.time) / 450) })
        frame.current = requestAnimationFrame(pulse)
      }
      frame.current = requestAnimationFrame(pulse)
      timer.current = window.setTimeout(() => {
        const held = press.current
        if (!held || held.moved || held.consumed) return
        held.consumed = true
        stopHold()
        navigator.vibrate?.(10)
        callbacks.current.onContext(held.hit, held.x, held.y)
      }, 450)
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const held = press.current
    if (!held || held.pointer !== e.pointerId || held.consumed) return
    const { x, y } = point(e)
    if (!held.moved && Math.hypot(x - held.x, y - held.y) > 5) {
      held.moved = true
      stopHold()
    }
    if (held.moved && held.hit?.card) setDrag({ source: held.hit, x, y, originX: held.x, originY: held.y })
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const held = press.current
    if (!held || held.pointer !== e.pointerId) return
    const { x, y } = point(e)
    stopHold()
    press.current = null
    setDrag(null)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (held.consumed || callbacks.current.disabled) return
    const hit = callbacks.current.hitTest(x, y)
    if (held.moved) {
      if (held.hit?.card) callbacks.current.onDrop(held.hit, hit, x, y)
      previous.current = null
      return
    }
    const time = performance.now()
    const key = hit ? `${hit.pile}:${hit.depth}:${hit.card?.id ?? 'empty'}` : 'felt'
    if (hit?.card && isDoubleClick(previous.current, key, time)) {
      previous.current = null
      callbacks.current.onDoubleTap(hit, x, y)
    } else {
      previous.current = { time, key }
      callbacks.current.onTap(hit, x, y)
    }
  }

  const onContextMenu = (e: ReactMouseEvent<HTMLElement>) => {
    e.preventDefault()
    if (callbacks.current.disabled) return
    unlockAudio()
    const { x, y } = point(e)
    callbacks.current.onContext(callbacks.current.hitTest(x, y), x, y)
  }

  return { drag, longPress, onPointerDown, onPointerMove, onPointerUp, onPointerCancel: cancel, onLostPointerCapture: cancel, onContextMenu }
}

/** Win3.x backs sleep between cycles. Hidden windows and dragging cancel all work. */
export function useStockAnimation(enabled: boolean, hidden: boolean, dragging: boolean): number {
  const [time, setTime] = useState(0)
  useEffect(() => {
    if (!enabled || hidden || dragging) {
      setTime(0)
      return
    }
    let timeout: number
    let frame = 0
    let disposed = false
    const schedule = () => {
      timeout = window.setTimeout(() => {
        const start = performance.now()
        const step = (now: number) => {
          if (disposed) return
          const elapsed = now - start
          if (elapsed < 1800) {
            setTime(elapsed + 1)
            frame = requestAnimationFrame(step)
          } else {
            setTime(0)
            frame = 0
            schedule()
          }
        }
        frame = requestAnimationFrame(step)
      }, 6000 + Math.random() * 4000)
    }
    schedule()
    return () => {
      disposed = true
      clearTimeout(timeout)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled, hidden, dragging])
  return time
}

export type CardTweenMove = { card: Card; fromX: number; fromY: number; toX: number; toY: number; delay?: number }
export type CardTween = { card: Card; x: number; y: number }

/** Transient overlay positions; commit the engine move first and omit these cards from the static layer. */
export function useCardTweens(hidden: boolean) {
  const [tweens, setTweens] = useState<CardTween[]>([])
  const frame = useRef(0)
  const done = useRef<(() => void) | undefined>(undefined)
  const hiddenRef = useRef(hidden)
  hiddenRef.current = hidden
  const cancel = () => {
    cancelAnimationFrame(frame.current)
    frame.current = 0
    done.current = undefined
    setTweens([])
  }
  useEffect(() => {
    if (hidden) {
      cancelAnimationFrame(frame.current)
      frame.current = 0
      setTweens([])
      const callback = done.current
      done.current = undefined
      callback?.()
    }
  }, [hidden])
  useEffect(() => () => {
    cancelAnimationFrame(frame.current)
    done.current = undefined
  }, [])
  const start = (moves: readonly CardTweenMove[], onComplete?: () => void) => {
    cancelAnimationFrame(frame.current)
    done.current = onComplete
    if (moves.length === 0 || hiddenRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTweens([])
      done.current = undefined
      onComplete?.()
      return
    }
    const began = performance.now()
    const durations = moves.map((move) => moveDuration(Math.hypot(move.toX - move.fromX, move.toY - move.fromY)))
    const tick = (now: number) => {
      const positions: CardTween[] = []
      for (let i = 0; i < moves.length; i++) {
        const move = moves[i]
        const progress = Math.max(0, (now - began - (move.delay ?? 0)) / durations[i])
        if (progress >= 1) continue
        const eased = easeOut(progress)
        positions.push({ card: move.card, x: move.fromX + (move.toX - move.fromX) * eased, y: move.fromY + (move.toY - move.fromY) * eased })
      }
      setTweens(positions)
      if (positions.length) frame.current = requestAnimationFrame(tick)
      else {
        frame.current = 0
        const callback = done.current
        done.current = undefined
        callback?.()
      }
    }
    tick(began)
  }
  return { tweens, start, cancel }
}
