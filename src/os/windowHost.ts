import { createContext } from 'react'

/** Private shell bridge: the live physical frame changes while the application portal stays mounted. */
export const WindowHostContext = createContext<HTMLElement | null>(null)
