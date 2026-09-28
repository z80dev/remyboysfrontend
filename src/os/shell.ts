import { createContext, useContext, useSyncExternalStore } from 'react'

/*
 * Shell-wide state that lives outside the window tree: tray balloons, message boxes and the
 * Display Properties preferences. A tiny external store keeps producers (apps, hooks) decoupled
 * from the components that draw them.
 */

export type Balloon = { key: string; title: string; text: string; icon: string; app?: string; href?: string }
export type MessageBox = { id: number; title: string; text: string; icon: 'error' | 'warning' | 'info' | 'question' }

export type Wallpaper = { kind: 'bliss' } | { kind: 'solid' } | { kind: 'remy'; art: number; fit: 'stretch' | 'center' | 'tile' }
export type Theme = 'blue' | 'olive' | 'silver'
export type Prefs = { wallpaper: Wallpaper; theme: Theme }

type State = { balloons: Balloon[]; boxes: MessageBox[]; prefs: Prefs }

const PREFS_KEY = 'remyxp.prefs'
const SEEN_KEY = 'remyxp.balloons'

function loadPrefs(): Prefs {
  const fallback: Prefs = { wallpaper: { kind: 'bliss' }, theme: 'blue' }
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }
  } catch {
    return fallback
  }
}

let state: State = { balloons: [], boxes: [], prefs: loadPrefs() }
const listeners = new Set<() => void>()

function set(next: Partial<State>) {
  state = { ...state, ...next }
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useShell<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state))
}

function seen(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

/** Queue a tray balloon. Keys shown once per session unless `repeat` (transaction receipts). */
export function balloon(b: Balloon, repeat = false) {
  if (!repeat) {
    const s = seen()
    if (s.has(b.key)) return
    s.add(b.key)
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...s]))
  }
  if (state.balloons.some((x) => x.key === b.key)) return
  set({ balloons: [...state.balloons, b] })
}

export function dismissBalloon(key: string) {
  set({ balloons: state.balloons.filter((b) => b.key !== key) })
}

let boxId = 0
export function messageBox(m: Omit<MessageBox, 'id'>) {
  set({ boxes: [...state.boxes, { ...m, id: ++boxId }] })
}

export function closeMessageBox(id: number) {
  set({ boxes: state.boxes.filter((b) => b.id !== id) })
}

export function setPrefs(p: Partial<Prefs>) {
  const prefs = { ...state.prefs, ...p }
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  set({ prefs })
}

/** wagmi's generic EIP-1193 connector is called "Injected"; people know it as their browser wallet. */
export const connectorLabel = (name: string) => (name === 'Injected' ? 'Browser wallet' : name)

export const MobileContext = createContext(false)
export const useIsMobile = () => useContext(MobileContext)
