import { STRINGS as S } from './strings'

export type Setup = { step: number; values: string[]; names: [string, string]; target: number; gravity: number; cpu: boolean }

export function createSetup(): Setup {
  return { step: 0, values: [], names: [S.player1, S.player2], target: 3, gravity: 9.8, cpu: false }
}

/** Empty INPUT applies the original defaults; validation leaves the current prompt in place. */
export function submitSetup(setup: Setup, value: string): string {
  const entered = value.trim()
  if (setup.step < 2) {
    const side = setup.step as 0 | 1
    setup.names[side] = entered.slice(0, 32) || (side === 0 ? S.player1 : S.player2)
    if (side === 1) {
      setup.cpu = entered.toUpperCase() === S.cpuTrigger
      if (setup.cpu) setup.names[1] = S.cpuName
    }
    setup.values.push(setup.names[side])
  } else if (setup.step === 2) {
    const target = entered === '' ? 3 : Number(entered)
    if (!Number.isSafeInteger(target) || target < 1) return S.invalidTarget
    setup.target = target
    setup.values.push(String(target))
  } else if (setup.step === 3) {
    const gravity = entered === '' ? 9.8 : Number(entered)
    if (!Number.isFinite(gravity) || gravity <= 0) return S.invalidGravity
    setup.gravity = gravity
    setup.values.push(String(gravity))
  }
  setup.step++
  return ''
}
