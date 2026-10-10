import { createContext, useContext, useSyncExternalStore } from 'react'

/** Window visibility supplied by the desktop and Pocket shells. */
export type GameWindowState = { active: boolean; hidden: boolean }

/** Shell bridge; standalone games are active and fitting is harmless by default. */
export const GameWindowContext = createContext<GameWindowState & { fit: (clientW: number, clientH: number) => void }>({
  active: true,
  hidden: false,
  fit: () => {},
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

/** Observe activation and minimization so games can suspend input, timers and music. */
export function useWindowState(): GameWindowState {
  const { active, hidden } = useContext(GameWindowContext)
  const tabHidden = useSyncExternalStore(subscribeVisibility, browserHidden, () => false)
  return { active, hidden: hidden || tabHidden }
}
