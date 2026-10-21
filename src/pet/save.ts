/**
 * Remygotchi persistence and the tray reminder. Kept apart from the app (which is lazy-loaded) so the shell can
 * nudge a returning player without pulling the whole game into the main bundle.
 */
import { useEffect } from 'react'
import { loadGame } from '../games/kit/storage'
import { balloon } from '../os/shell'
import { type Save, activePet, isSave, needs, streakState, sync } from './engine'

export const SAVE_ID = 'remygotchi'

export const loadPetSave = () => loadGame<Save | null>(SAVE_ID, null, (v): v is Save | null => isSave(v))

/** After log-on: a streak about to end, or a Remy that needs something, gets one balloon per session. */
export function usePetBalloon(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const stored = loadPetSave()
    if (!stored?.active) return
    const { save } = sync(stored, Date.now())
    const pet = activePet(save)
    if (!pet) return
    const n = save.streak.count
    if (streakState(save) === 'risk')
      balloon({
        key: `pet-streak-${save.today.date}`,
        icon: 'pet',
        app: 'pet',
        title: `🔥 Your ${n}-day streak ends at midnight`,
        text: `${pet.name} is waiting! Finish today's three quests to keep it going.`,
      })
    else if (needs(pet).length > 0 && !save.today.done)
      balloon({
        key: `pet-needs-${save.today.date}`,
        icon: 'pet',
        app: 'pet',
        title: `${pet.name} needs you!`,
        text: pet.sick ? `${pet.name} is feeling sick. Click to check in.` : 'Your Remygotchi is hungry, bored or messy. Click to check in.',
      })
  }, [enabled])
}
