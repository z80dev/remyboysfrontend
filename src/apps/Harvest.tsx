import { StatusBar } from '../os/ui'

/** Remy's Harvest, the standalone /harvest/ game (also the X player card), in an OS window. */
export function Harvest() {
  return (
    <div className="app-col">
      <iframe className="app-frame quest-frame" src="/harvest/" title="Remy's Harvest" allow="autoplay; fullscreen" />
      <StatusBar
        right={
          <a href="/harvest/" target="_blank" rel="noreferrer">
            Play full screen
          </a>
        }
      >
        ← → / A D or mouse to move · P pause · M mute · Drag on mobile
      </StatusBar>
    </div>
  )
}
