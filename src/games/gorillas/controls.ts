import { createInput, type InputLine } from '../qbasic/screen'
import { launchMatch, type Match } from './engine'
import { STRINGS as S } from './strings'

export type Aim = { prompt: 'angle' | 'velocity'; angle: string; input: InputLine; error: string }

export const TRANSITION_CLICK_GUARD_MS = 350

/** Ignore compatibility clicks aimed at controls created by a pointer-driven transition. */
export function isTransitionClickBlocked(now: number, transitionAt: number | null): boolean {
  return transitionAt !== null && now - transitionAt < TRANSITION_CLICK_GUARD_MS
}

export function touchControlLayout(width: number, height: number): 'side' | 'below' {
  return width > height ? 'side' : 'below'
}

/** The same typed INPUT submission is used by keyboard and the real touch keypad. */
export function enterAim(aim: Aim, match: Match): boolean {
  const value = Number(aim.input.value)
  if (aim.prompt === 'angle') {
    if (!aim.input.value.trim() || !Number.isFinite(value) || value < 0 || value > 360) aim.error = S.invalidAngle
    else {
      aim.angle = aim.input.value
      aim.prompt = 'velocity'
      aim.input = createInput(12)
      aim.error = ''
    }
    return false
  }
  if (!launchMatch(match, Number(aim.angle), value)) {
    aim.error = S.invalidVelocity
    return false
  }
  aim.error = ''
  return true
}
