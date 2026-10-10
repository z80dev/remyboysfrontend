import type { AppProps } from '../os/apps'
import { WinampApp } from '../winamp/ui/Winamp'

/** Classic Winamp 2.x (main window, equalizer, playlist editor) with the built-in skin; `src/winamp/`. */
export function Winamp({ close }: AppProps) {
  return <WinampApp close={close} />
}
