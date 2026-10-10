import { type PointerEvent as ReactPointerEvent, createContext, useContext } from 'react'
import type { MenuItem } from './Menu'
import type { Layout, WinId } from './layout'

/** What the three windows need from the app root. */
export type Ui = {
  layout: Layout
  setLayout: (change: (l: Layout) => Layout) => void
  mobile: boolean
  /** Focused Winamp window while the OS window is active: its title bar is lit. */
  isActive: (id: WinId) => boolean
  /** Pointerdown on a window: focuses it and, unless on a control, starts moving it (docked windows follow main). */
  grab: (id: WinId, e: ReactPointerEvent) => void
  toggleShade: (id: WinId) => void
  toggleWindow: (id: WinId) => void
  /** Playlist resize in 25×29 steps from a pointerdown on its grip. */
  resizePlaylist: (e: ReactPointerEvent, widthOnly?: boolean) => void
  /** Double size, pulling the windows back on screen. */
  toggleDouble: () => void
  minimize: () => void
  exit: () => void
  openMenu: (x: number, y: number, items: MenuItem[]) => void
  mainMenu: () => MenuItem[]
  optionsMenu: () => MenuItem[]
  visMenu: () => MenuItem[]
  /** Audio file picker; `play` starts the first added file (eject), otherwise they are only appended (ADD FILE). */
  openFiles: (play: boolean) => void
  openDir: () => void
  openUrl: (play: boolean) => void
  openList: () => void
  saveList: () => void
  fileInfo: (index?: number) => void
  about: () => void
  /** Playlist selection (track ids). */
  selected: ReadonlySet<string>
  setSelected: (ids: ReadonlySet<string>) => void
}

export const UiContext = createContext<Ui | undefined>(undefined)

export function useUi(): Ui {
  const ui = useContext(UiContext)
  if (!ui) throw new Error('UiContext missing')
  return ui
}

/** Screen position just below an element (menus opened from a button). */
export function below(e: { currentTarget: Element }): [number, number] {
  const r = e.currentTarget.getBoundingClientRect()
  return [r.left, r.bottom]
}
