import { StatusBar } from '../os/ui'

export function Quest() {
  return (
    <div className="app-col">
      <iframe className="app-frame quest-frame" src="/quest/" title="Remy Quest" allow="autoplay; fullscreen" />
      <StatusBar
        right={
          <a href="/quest/" target="_blank" rel="noreferrer">
            Play full screen
          </a>
        }
      >
        Arrows move · Space = A · X = B / run · Esc = menu · Touch controls on mobile
      </StatusBar>
    </div>
  )
}
