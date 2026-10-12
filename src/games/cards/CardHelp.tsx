import { useState, type ReactNode } from 'react'
import { GameDialog, GameHelpTabs } from '../kit'
import { CARD_HELP_LABEL, CARD_HELP_SUFFIX, CARD_HELP_TABS as TABS } from './strings'
import './cards.css'

export type CardHelpSections = { Rules: ReactNode; Scoring: ReactNode; Keyboard: ReactNode; Tips: ReactNode }

export function CardHelp({ title, sections, onClose }: { title: string; sections: CardHelpSections; onClose: () => void }) {
  const [tab, setTab] = useState<typeof TABS[number]>(TABS[0])
  return <GameDialog title={`${title}${CARD_HELP_SUFFIX}`} width={440} onClose={onClose}>
    <GameHelpTabs tabs={TABS} selected={TABS.indexOf(tab)} onChange={(index) => setTab(TABS[index])} label={CARD_HELP_LABEL}>
      {sections[tab]}
    </GameHelpTabs>
  </GameDialog>
}
