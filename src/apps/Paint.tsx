import { StatusBar } from '../os/ui'

export function Paint() {
  return (
    <div className="app-col">
      <iframe className="paint-frame" src="/jspaint/" title="Remy Paint" loading="lazy" />
      <StatusBar
        right={
          <a href="/jspaint/" target="_blank" rel="noreferrer">
            Open full screen
          </a>
        }
      >
        Make a Remy meme. Art lives at /images/CharacterN.webp.
      </StatusBar>
    </div>
  )
}
