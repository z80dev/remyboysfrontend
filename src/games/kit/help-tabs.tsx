import type { KeyboardEvent, ReactNode } from 'react'
import { useId, useRef } from 'react'
import './help-tabs.css'

/** Controlled Help sections; the game supplies the selected section as children. */
export interface GameHelpTabsProps {
  tabs: readonly string[]
  selected: number
  onChange: (index: number) => void
  children: ReactNode
  /** Accessible name for the tab strip, default "Help sections". */
  label?: string
}

/** Classic Help tab strip/panel: Left/Right/Home/End select tabs; Up/Down/PageUp/PageDown scroll the current section. */
export function GameHelpTabs({ tabs, selected, onChange, children, label = 'Help sections' }: GameHelpTabsProps) {
  const id = useId()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const panel = useRef<HTMLDivElement>(null)
  const panelId = `${id}-panel`
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      event.stopPropagation()
      const section = panel.current
      if (section) {
        const distance = event.key.startsWith('Page') ? Math.max(16, section.clientHeight - 16) : 16
        section.scrollTop += event.key.endsWith('Up') ? -distance : distance
      }
      return
    }
    let next: number
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
    else if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    event.stopPropagation()
    onChange(next)
    buttons.current[next]?.focus()
  }
  return (
    <div className="gk-help-tabs">
      <div className="gk-help-strip" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            key={tab}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            className={`gk-help-tab${index === selected ? ' selected' : ''}`}
            aria-selected={index === selected}
            aria-controls={panelId}
            tabIndex={index === selected ? 0 : -1}
            data-autofocus={index === selected ? '' : undefined}
            onClick={() => onChange(index)}
            onKeyDown={(event) => navigate(event, index)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div ref={panel} className="gk-help-panel" role="tabpanel" id={panelId} aria-labelledby={`${id}-tab-${selected}`}>
        {children}
      </div>
    </div>
  )
}
