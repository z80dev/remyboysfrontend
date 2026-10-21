import { describe, expect, test } from 'bun:test'
import {
  MAX_STRAYS, OFFLINE_CAP_H, adopt, bathe, buy, claimGift, createSave, dayKey, feed, finishGame, levelInfo, pat,
  questsFor, switchPet, sync, toggleSleep, xpFor,
} from '../src/pet/engine'
import type { QuestKind, Result, Save } from '../src/pet/engine'

const H = 3_600_000
/** Local noon on a calendar day, so drains during a test never cross midnight by accident. */
const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime()

function withPet(now: number): Save {
  return adopt(createSave(now), now, { art: 42 }).save
}

/** Complete today's quests the way a player would, returning the final result. */
function finishDay(start: Save, now: number): Result {
  let r: Result = sync(start, now)
  const all: Result['events'] = [...r.events]
  // A day away leaves the Remy asleep or sick; the player wakes and nurses it before the quests.
  Object.assign(r.save.pets[0], { asleep: false, sick: false, health: 100, poops: 0, stats: { hunger: 60, fun: 60, energy: 80, clean: 80 } })
  const run = (next: Result) => {
    r = next
    all.push(...next.events)
  }
  for (const q of r.save.today.quests) {
    const kind: QuestKind = q.kind
    for (let i = 0; i < q.goal; i++) {
      if (kind === 'feed') {
        r.save.pets[0].stats.hunger = 40
        run(feed(r.save, now, 'corn'))
      }
      if (kind === 'treat') {
        r.save.items.pizza = 1
        run(feed(r.save, now, 'pizza'))
      }
      if (kind === 'play' || kind === 'win') run(finishGame(r.save, now, true))
      if (kind === 'bath') run(bathe(r.save, now))
      if (kind === 'pet') run(pat(r.save, now))
      if (kind === 'nap') {
        r.save.pets[0].stats.energy = 40
        run(toggleSleep(r.save, now))
        run(toggleSleep(r.save, now))
      }
      if (kind === 'happy') {
        r.save.pets[0].stats = { hunger: 90, fun: 90, energy: 90, clean: 90 }
        run(sync(r.save, now))
      }
    }
  }
  return { save: r.save, events: all }
}

describe('Remygotchi daily quests', () => {
  test('three distinct quests, feeding first, the same for everyone on a date', () => {
    for (const date of ['2026-10-21', '2026-12-25', '2027-02-28']) {
      const qs = questsFor(date)
      expect(qs).toHaveLength(3)
      expect(qs[0].kind).toBe('feed')
      expect(new Set(qs.map((q) => q.kind)).size).toBe(3)
      expect(questsFor(date)).toEqual(qs)
    }
  })

  test('finishing every quest secures the day exactly once and pays the bonus', () => {
    const now = noon(2026, 10, 21)
    const { save, events } = finishDay(withPet(now), now)
    expect(save.today.done).toBe(true)
    expect(save.streak).toMatchObject({ count: 1, best: 1, last: '2026-10-21' })
    expect(events.filter((e) => e.type === 'dayDone')).toHaveLength(1)
    // More care the same day does not extend the streak again.
    const again = finishGame(save, now + 60_000, true)
    expect(again.save.streak.count).toBe(1)
    expect(again.events.some((e) => e.type === 'dayDone')).toBe(false)
  })
})

describe('Remygotchi streak', () => {
  test('consecutive days extend it; a missed day without a freeze resets it', () => {
    let save = withPet(noon(2026, 10, 1))
    for (let d = 1; d <= 3; d++) save = finishDay(save, noon(2026, 10, d)).save
    expect(save.streak.count).toBe(3)
    expect(save.owned).toContain('party')

    // Skip Oct 4: opening on Oct 5 ends the streak.
    const lost = sync(save, noon(2026, 10, 5))
    expect(lost.events).toContainEqual({ type: 'streakLost', was: 3 })
    expect(lost.save.streak.count).toBe(0)
    expect(lost.save.streak.best).toBe(3)
    expect(finishDay(lost.save, noon(2026, 10, 5)).save.streak.count).toBe(1)
  })

  test('day seven unlocks the crown and a freeze, which covers one missed day', () => {
    let save = withPet(noon(2026, 10, 1))
    for (let d = 1; d <= 7; d++) save = finishDay(save, noon(2026, 10, d)).save
    expect(save.streak.count).toBe(7)
    expect(save.streak.freezes).toBe(1)
    expect(save.owned).toContain('crown')

    const frozen = sync(save, noon(2026, 10, 9))
    expect(frozen.events).toContainEqual({ type: 'freezeUsed', days: 1 })
    expect(frozen.save.streak).toMatchObject({ count: 7, freezes: 0 })
    expect(finishDay(frozen.save, noon(2026, 10, 9)).save.streak.count).toBe(8)
  })

  test('two missed days with one freeze still reset the streak', () => {
    let save = withPet(noon(2026, 10, 1))
    for (let d = 1; d <= 7; d++) save = finishDay(save, noon(2026, 10, d)).save
    const r = sync(save, noon(2026, 10, 10))
    expect(r.save.streak.count).toBe(0)
    expect(r.save.streak.freezes).toBe(1)
  })

  test('midnight is local: 23:59 and 00:01 are different days', () => {
    const late = new Date(2026, 9, 21, 23, 59).getTime()
    const early = new Date(2026, 9, 22, 0, 1).getTime()
    const save = finishDay(withPet(late), late).save
    const next = sync(save, early).save
    expect(next.today.date).toBe(dayKey(early))
    expect(next.today.done).toBe(false)
    expect(finishDay(next, early).save.streak.count).toBe(2)
  })
})

describe('Remygotchi needs', () => {
  test('needs drain in real time, faster awake than asleep', () => {
    const now = noon(2026, 10, 21)
    const save = withPet(now)
    const awake = sync(save, now + 4 * H).save.pets[0]
    expect(awake.stats.hunger).toBeCloseTo(70 - 24, 5)

    save.pets[0].stats.energy = 40
    const slept = toggleSleep(save, now).save
    const asleep = sync(slept, now + 4 * H).save.pets[0]
    expect(asleep.stats.hunger).toBeCloseTo(70 - 12, 5)
    expect(asleep.stats.energy).toBeGreaterThan(40)
  })

  test('a long absence drains no more than the offline cap and leaves messes and sickness', () => {
    const now = noon(2026, 10, 1)
    const save = withPet(now)
    const capped = sync(save, now + OFFLINE_CAP_H * H).save.pets[0]
    const month = sync(save, now + 30 * 24 * H).save.pets[0]
    expect(month.stats).toEqual(capped.stats)
    expect(month.poops).toBeGreaterThan(0)
    expect(month.sick).toBe(true)
  })

  test('daycare pets do not drain', () => {
    const now = noon(2026, 10, 21)
    let save = adopt(withPet(now), now, { art: 7 }).save
    save = sync(save, now + 10 * H).save
    const first = save.pets.find((p) => p.art === 42)
    expect(first?.stats.hunger).toBe(70)
    save = switchPet(save, now + 10 * H, 'a42').save
    expect(save.pets.find((p) => p.art === 42)?.stats.hunger).toBe(70)
  })

  test('a full Remy refuses a meal but not a treat', () => {
    const now = noon(2026, 10, 21)
    const save = withPet(now)
    save.pets[0].stats.hunger = 99
    const meal = feed(save, now, 'corn')
    expect(meal.events).toContainEqual({ type: 'say', text: "I'm stuffed!", tone: 'no' })
    expect(meal.save.life.fed).toBe(0)
    const treat = feed(save, now, 'candy')
    expect(treat.save.items.candy).toBe(save.items.candy - 1)
  })
})

describe('Remygotchi economy and adoption', () => {
  test('strays are capped; wallet Remys are not', () => {
    const now = noon(2026, 10, 21)
    let save = createSave(now)
    for (let i = 0; i < MAX_STRAYS + 1; i++) save = adopt(save, now, { art: i }).save
    expect(save.pets).toHaveLength(MAX_STRAYS)
    save = adopt(save, now, { art: 99, token: '1234' }).save
    expect(save.pets).toHaveLength(MAX_STRAYS + 1)
    expect(save.active).toBe('t1234')
  })

  test('shop spends kernels and refuses what you cannot afford', () => {
    const now = noon(2026, 10, 21)
    const save = withPet(now)
    const bought = buy(save, now, 'bow').save
    expect(bought.owned).toContain('bow')
    expect(bought.kernels).toBe(save.kernels - 30)
    const broke = buy({ ...bought, kernels: 0 }, now, 'arcade').save
    expect(broke.owned).not.toContain('arcade')
  })

  test('the daily gift is claimed once per day', () => {
    const now = noon(2026, 10, 21)
    const once = claimGift(withPet(now), now).save
    const twice = claimGift(once, now).save
    expect(twice.kernels).toBe(once.kernels)
    expect(claimGift(twice, noon(2026, 10, 22)).save.kernels).toBeGreaterThan(once.kernels)
  })

  test('levels need ever more XP', () => {
    expect(levelInfo(0).level).toBe(1)
    expect(levelInfo(xpFor(2)).level).toBe(2)
    expect(levelInfo(xpFor(2) - 1).level).toBe(1)
    expect(xpFor(3) - xpFor(2)).toBeGreaterThan(xpFor(2) - xpFor(1))
    expect(levelInfo(xpFor(25)).stage).toBe('Legend')
  })
})
