export type Score = { score: number; name: string }
export type Settings = { fast: boolean; reveal: boolean; scores: Score[] }
export const defaults: Settings = { fast: false, reveal: true, scores: [] }

export function isSettings(value: unknown): value is Settings {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<Settings>
  return typeof v.fast === 'boolean' && typeof v.reveal === 'boolean' && Array.isArray(v.scores) && v.scores.length <= 10 && v.scores.every((row) =>
    row && typeof row.name === 'string' && row.name.length <= 32 && Number.isSafeInteger(row.score) && row.score >= 0)
}

export function qualifies(scores: readonly Score[], score: number): boolean {
  return score > 0 && (scores.length < 10 || score > scores[scores.length - 1].score)
}

export function addScore(scores: readonly Score[], score: number, name: string): Score[] {
  return [...scores, { score, name: name.trim().slice(0, 32) }].sort((a, b) => b.score - a.score).slice(0, 10)
}
