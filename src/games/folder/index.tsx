import { useState } from 'react'
import type { AppProps } from '../../os/apps'
import { Icon } from '../../os/icons'
import { useIsMobile } from '../../os/shell'
import { GAMES } from '../registry'
import './folder.css'

/** XP Explorer large-icons view of installed games; Pocket uses single-tap launch. */
export default function GamesFolder({ navigate }: AppProps) {
  const mobile = useIsMobile()
  const [selected, setSelected] = useState<string>()
  return (
    <div className="games-folder">
      <div className="games-folder-address">
        <span>Address</span>
        <Icon name="games" size={16} />
        <b>Games</b>
      </div>
      <div className="games-folder-main">
        <aside className="games-folder-tasks">
          <h2>Games</h2>
          <p>Classic games, Remy style.</p>
          <p>Select a game to see its description. Double-click to play.</p>
          {selected && <p>{GAMES.find((game) => game.id === selected)?.desc}</p>}
        </aside>
        <div className="games-folder-icons" aria-label="Installed games">
          {GAMES.length === 0 ? (
            <p className="games-folder-empty">This folder is empty.</p>
          ) : (
            GAMES.map((game) => (
              <button
                type="button"
                key={game.id}
                className={`games-folder-item${selected === game.id ? ' selected' : ''}`}
                title={game.desc}
                onClick={() => {
                  setSelected(game.id)
                  if (mobile) navigate(`#/${game.id}`)
                }}
                onDoubleClick={() => {
                  if (!mobile) navigate(`#/${game.id}`)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    navigate(`#/${game.id}`)
                  }
                }}
              >
                <Icon name={game.id} size={32} />
                <span>{game.short}</span>
              </button>
            ))
          )}
        </div>
      </div>
      <footer className="games-folder-status">
        {GAMES.length} object{GAMES.length === 1 ? '' : 's'}
        {selected && <span>{GAMES.find((game) => game.id === selected)?.title}</span>}
      </footer>
    </div>
  )
}
