import { useState, type ReactNode } from 'react'
import { GameDialog } from '../kit'
import './cards.css'

export type CardHelpSections = { Rules: ReactNode; Scoring: ReactNode; Keyboard: ReactNode; Tips: ReactNode }
const TABS = ['Rules', 'Scoring', 'Keyboard', 'Tips'] as const

export function CardHelp({ title, sections, onClose }: { title: string; sections: CardHelpSections; onClose: () => void }) {
  const [tab, setTab] = useState<typeof TABS[number]>('Rules')
  return <GameDialog title={`${title} Help`} width={440} onClose={onClose}>
    <div className="remy-card-help-tabs" role="tablist" aria-label="Help sections">
      {TABS.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item}
        className={`btn${tab === item ? ' default' : ''}`} onClick={() => setTab(item)} onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          const next = TABS[(TABS.indexOf(tab) + (e.key === 'ArrowLeft' ? 3 : 1)) % 4]
          setTab(next)
          const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')
          buttons?.[TABS.indexOf(next)].focus()
        }}>{item}</button>)}
    </div>
    <div className="remy-card-help-body" role="tabpanel">{sections[tab]}</div>
  </GameDialog>
}
