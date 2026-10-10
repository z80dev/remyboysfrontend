import { StatusBar } from '../os/ui'

/** Night of the Cabald, the standalone /halloween/ game (also the X player card), in an OS window. */
export function Haunt() {
  return (
    <div className="app-col">
      <iframe className="app-frame quest-frame" src="/halloween/" title="Night of the Cabald" allow="autoplay; fullscreen" />
      <StatusBar
        right={
          <a href="/halloween/" target="_blank" rel="noreferrer">
            Play full screen
          </a>
        }
      >
        WASD move · Mouse aim · Click fire · 1–4 weapons · M mute · Touch controls on mobile
      </StatusBar>
    </div>
  )
}
