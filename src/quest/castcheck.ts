/** Dev-only audit of the lore rule: every bald Remy is Cabald, and every Cabald Remy is bald. */
import { art } from './art'
import { REMY_COUNT, isCabald, randomRemyIdx, rng } from './data'
import { CAST, CAST_CABALD, MAPS, castTrainer, duoTrainers, isCabaldNpc, livingArt, maxiTrainer, rivalTrainer, starters } from './maps'
import { avatarChoices } from './scenes'
import { defaultAvatar } from './state'

export interface CastAudit {
  checks: number
  violations: string[]
  members: number
}

export function auditCast(): CastAudit {
  const violations: string[] = []
  let checks = 0
  const expect = (idx: number, cabald: boolean, where: string) => {
    checks++
    if (!Number.isInteger(idx) || idx < 0 || idx >= REMY_COUNT) return void violations.push(`${where}: #${idx} is not a collection index`)
    if (isCabald(idx) !== cabald) violations.push(`${where}: REMY #${idx} is ${isCabald(idx) ? 'bald' : 'not bald'} but ${cabald ? 'Cabald' : 'not Cabald'}`)
  }
  const trainer = (t: Parameters<typeof castTrainer>[0], cabald: boolean, where: string) => {
    const r = castTrainer(t)
    expect(r.portrait, cabald, `${where} portrait`)
    for (const [idx] of r.party) expect(idx, cabald, `${where} party`)
  }

  for (const map of Object.values(MAPS)) {
    for (const d of map.npcs) {
      const cabald = isCabaldNpc(d)
      if (d.portrait !== undefined) expect(d.portrait, cabald, `${map.id}/${d.id}`)
      if (d.trainer) {
        const t = typeof d.trainer === 'function' ? d.trainer() : d.trainer
        trainer(t, cabald, `${map.id}/${d.id} trainer`)
      }
    }
    for (const o of map.objects) if (o.idx !== undefined) expect(o.idx, o.kind === 'billboard' && o.idx === CAST.rug, `${map.id}/${o.kind}@${o.x},${o.y}`)
    if (map.encounters) {
      const rand = rng(0xba1d)
      for (let i = 0; i < 2000; i++) expect(randomRemyIdx(rand, map.encounters.weights, new Set()), false, `${map.id} wild pool`)
    }
  }
  for (const [i, t] of duoTrainers().entries()) trainer(t, true, `SHORT & SQUEEZE #${i + 1}`)
  trainer(maxiTrainer(), false, 'MAXI')
  for (const s of starters()) {
    expect(s, false, 'starter')
    trainer(rivalTrainer(1, s), false, `rival round 1 vs #${s}`)
    trainer(rivalTrainer(2, s), false, `rival round 2 vs #${s}`)
  }
  for (const [role, idx] of Object.entries(CAST)) expect(idx, CAST_CABALD.includes(role), `CAST.${role}`)
  for (const idx of livingArt()) expect(idx, false, 'gallery living art')
  expect(defaultAvatar(), false, 'default avatar')
  for (const idx of avatarChoices()) expect(idx, false, 'avatar picker')

  const members = art.baldList().length
  if (violations.length) console.error(`[cast] ${violations.length} bald⇔Cabald violations in ${checks} checks`, violations)
  else console.info(`[cast] bald⇔Cabald OK: ${checks} checks, 0 violations (${members} Cabald members)`)
  return { checks, violations, members }
}
