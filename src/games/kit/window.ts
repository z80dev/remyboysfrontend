import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react'

/** Window visibility supplied by the desktop and Pocket shells. */
export type GameWindowState = { active: boolean; hidden: boolean; pocket: boolean }

/** Shell bridge; standalone games are active and fitting is harmless by default. */
export const GameWindowContext = createContext<
  GameWindowState & {
    fit: (clientW: number, clientH: number) => void
    setTitle: (title: string | undefined) => void
    setCloseGuard: (guard: (() => void) | undefined) => void
    setMinSize: (size: { w: number; h: number } | undefined) => void
  }
>({
  active: true,
  hidden: false,
  pocket: false,
  fit: () => {},
  setTitle: () => {},
  setCloseGuard: () => {},
  setMinSize: () => {},
})

/** Resize the surrounding Luna window to a measured client size; no-op on Pocket or maximized windows. */
export function useWindowFit(): (clientW: number, clientH: number) => void {
  return useContext(GameWindowContext).fit
}

const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify)
  return () => document.removeEventListener('visibilitychange', notify)
}
const browserHidden = () => typeof document !== 'undefined' && document.hidden

/** Observe activation, minimization and the actual Pocket shell (including coarse-pointer landscape phones). */
export function useWindowState(): GameWindowState {
  const { active, hidden, pocket } = useContext(GameWindowContext)
  const tabHidden = useSyncExternalStore(subscribeVisibility, browserHidden, () => false)
  return { active, hidden: hidden || tabHidden, pocket }
}

/** Set this window's caption/taskbar/Pocket title; the app's normal title is restored when the hook unmounts. */
export function useWindowTitle(title: string): void {
  const { setTitle } = useContext(GameWindowContext)
  useEffect(() => {
    setTitle(title)
    return () => setTitle(undefined)
  }, [title, setTitle])
}

/** Intercept user close requests (caption/Pocket) while mounted. AppProps.close still closes directly after approval. */
export function useWindowCloseGuard(handler: (() => void) | undefined): void {
  const { setCloseGuard } = useContext(GameWindowContext)
  const latest = useRef(handler)
  latest.current = handler
  const enabled = handler !== undefined
  useEffect(() => {
    if (!enabled) return
    setCloseGuard(() => latest.current?.())
    return () => setCloseGuard(undefined)
  }, [enabled, setCloseGuard])
}

/** Enforce a measured minimum client size during desktop fitting/resizing; cleared on unmount, ignored on Pocket. */
export function useWindowMinSize(clientW: number, clientH: number): void {
  const { setMinSize } = useContext(GameWindowContext)
  useEffect(() => {
    setMinSize({ w: clientW, h: clientH })
    return () => setMinSize(undefined)
  }, [clientW, clientH, setMinSize])
}
