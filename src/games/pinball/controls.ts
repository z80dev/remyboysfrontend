export const CONTROL_ACTIONS = ['left', 'right', 'plunger', 'nudgeLeft', 'nudgeRight', 'nudgeUp'] as const
export type ControlAction = typeof CONTROL_ACTIONS[number]
export type Controls = Record<ControlAction, string>
export const DEFAULT_CONTROLS: Controls = {
  left: 'z', right: '/', plunger: ' ', nudgeLeft: 'x', nudgeRight: '.', nudgeUp: 'ArrowUp',
}

export function validControls(value: unknown): value is Controls {
  if (!value || typeof value !== 'object') return false
  const controls = value as Record<string, unknown>
  const used = new Set<string>()
  for (const action of CONTROL_ACTIONS) {
    const key = controls[action]
    if (typeof key !== 'string' || key.length === 0 || key.length > 24 || /^F\d+$/.test(key) || used.has(key)) return false
    used.add(key)
  }
  return true
}

export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}

export function controlForKey(controls: Controls, key: string): ControlAction | undefined {
  const normalized = normalizeKey(key)
  for (const action of CONTROL_ACTIONS) if (controls[action] === normalized) return action
  return undefined
}
