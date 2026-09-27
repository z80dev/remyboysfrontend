export function Paint() {
  return (
    <div className="app-col">
      <iframe className="paint-frame" src="/jspaint/" title="Remy Paint" />
      <footer className="statusbar">
        <span>Make a Remy meme. Art lives at /images/CharacterN.webp.</span>
        <a href="/jspaint/" target="_blank" rel="noreferrer">
          open full screen
        </a>
      </footer>
    </div>
  )
}
