import { describe, expect, test } from 'bun:test'
import {
  BALL_SAVE_SECONDS, FLAG_SPINS, HYPERSPACE_WINDOW, MAX_SCORE, POINTS, POST_SECONDS, RANKS,
  availableMissions, createGame, drainBall, enableTestMode, highScoreCandidates, hit, launchRules,
  missionGoal, missionName, nudgeRules, qualifiesHighScore, recordHighScore, replayGame, reseatBall, rotateReentry,
  sanitizeHighScores, selectMission, tickRules
} from '../../src/games/pinball/rules'
import type { Game, HighScore, MissionId, TableEvent } from '../../src/games/pinball/rules'
import { CONTROL_ACTIONS, DEFAULT_CONTROLS, controlForKey, normalizeKey, validControls } from '../../src/games/pinball/controls'
import type { Controls } from '../../src/games/pinball/controls'
import { missionGoal as goalText } from '../../src/games/pinball/strings'

const MISSION_RANK: Record<MissionId, number> = {
  launch: 0, bridge: 0, gas: 0, mint: 0,
  bug: 1, recovery: 1, menace: 1, secret: 1,
  airdrop: 3, spike: 3, rug: 3, plague: 3,
  ledger: 5, recon: 5, tower: 5, reorg: 5, cabald: 7
}

function repeat(game: Game, event: TableEvent, count: number, bank = false) {
  for (let i = 0; i < count; i++) hit(game, event, bank ? i % 3 : 0)
}

function startMission(id: MissionId, rank = MISSION_RANK[id]): Game {
  const game = createGame()
  game.player.rank = rank
  expect(selectMission(game, availableMissions(rank).indexOf(id))).toBe(true)
  expect(launchRules(game)).toBe(true)
  hit(game, 'ramp')
  expect(game.mission?.id).toBe(id)
  return game
}

function completeMission(game: Game, id: MissionId) {
  switch (id) {
    case 'launch': repeat(game, 'ramp', 3); break
    case 'bridge': repeat(game, 'reentry', 3, true); break
    case 'gas': repeat(game, 'bumper', 8); break
    case 'mint': repeat(game, 'drop', 9, true); break
    case 'bug': repeat(game, 'spot', 15, true); break
    case 'recovery': repeat(game, 'spinner', FLAG_SPINS); hit(game, 'hyperspace'); break
    case 'menace': repeat(game, 'reentry', 3, true); repeat(game, 'bumper', 8); break
    case 'secret': repeat(game, 'wormhole', 3, true); break
    case 'airdrop': repeat(game, 'rightHazard', 3, true); hit(game, 'hyperspace'); break
    case 'spike': repeat(game, 'leftHazard', 3, true); hit(game, 'wormhole', 2); break
    case 'rug': repeat(game, 'engine', 3, true); hit(game, 'blackhole'); break
    case 'plague': repeat(game, 'spinner', 75); hit(game, 'warp'); break
    case 'ledger': repeat(game, 'satellite', 3); break
    case 'recon': repeat(game, 'lane', 15); break
    case 'tower':
      for (let i = 0; i < 3; i++) {
        hit(game, 'outlane', i % 2)
        expect(drainBall(game)).toBe(true)
        expect(launchRules(game)).toBe(true)
      }
      break
    case 'reorg': repeat(game, 'rebound', 25); hit(game, 'ramp'); break
    case 'cabald':
      repeat(game, 'drop', 3, true)
      repeat(game, 'spot', 3, true)
      repeat(game, 'lane', 5)
      hit(game, 'fuel')
      hit(game, 'ramp')
      hit(game, 'spinner')
      hit(game, 'wormhole', 2)
      hit(game, 'hyperspace')
      break
  }
}

function loseBall(game: Game) {
  expect(launchRules(game)).toBe(true)
  tickRules(game, BALL_SAVE_SECONDS + 0.01)
  expect(drainBall(game)).toBe(false)
}

describe('rank selection and all seventeen missions', () => {
  const groups: readonly MissionId[][] = [
    ['launch', 'bridge', 'gas', 'mint'],
    ['bug', 'recovery', 'menace', 'secret'],
    ['bug', 'recovery', 'menace', 'secret'],
    ['airdrop', 'spike', 'rug', 'plague'],
    ['airdrop', 'spike', 'rug', 'plague'],
    ['ledger', 'recon', 'tower', 'reorg'],
    ['ledger', 'recon', 'tower', 'reorg'],
    ['plague', 'secret', 'reorg', 'cabald'],
    ['plague', 'secret', 'reorg', 'cabald']
  ]

  test('preserves the exact nine ranks and each rank mission bank', () => {
    expect(RANKS).toEqual(['Cadet', 'Ensign', 'Lieutenant', 'Captain', 'Lieutenant Commander', 'Commander', 'Commodore', 'Admiral', 'Fleet Admiral'])
    for (let rank = 0; rank < 9; rank++) {
      expect(availableMissions(rank)).toEqual(groups[rank])
      const game = createGame()
      game.player.rank = rank
      for (let choice = 0; choice < 4; choice++) {
        expect(selectMission(game, choice)).toBe(true)
        expect(game.selectedMission).toBe(groups[rank][choice])
        expect(missionName(game).length).toBeGreaterThan(0)
        expect(missionGoal(game)).not.toContain('0 more')
      }
    }
  })

  test('mission countdown nouns are singular for one and plural for two', () => {
    const cases = [
      ['mint', 0, 'Hit 1 more Drop Target', 'Hit 2 more Drop Targets'],
      ['bug', 0, 'Hit 1 more Target', 'Hit 2 more Targets'],
      ['airdrop', 0, 'Light 1 more Right Hazard Light', 'Light 2 more Right Hazard Lights'],
      ['spike', 0, 'Light 1 more Left Hazard Light', 'Light 2 more Left Hazard Lights'],
      ['recon', 0, 'Pass 1 more Lane', 'Pass 2 more Lanes'],
      ['cabald', 0, 'Hit 1 more Drop Target', 'Hit 2 more Drop Targets'],
      ['cabald', 1, 'Hit 1 more Spot Target', 'Hit 2 more Spot Targets'],
      ['cabald', 2, 'Pass 1 more Lane', 'Pass 2 more Lanes']
    ] as const
    for (const [id, stage, singular, plural] of cases) {
      expect(goalText(id, stage, 1)).toBe(singular)
      expect(goalText(id, stage, 2)).toBe(plural)
    }
  })

  test('Recovery exposes the remaining spin countdown without changing its upgrade stage', () => {
    expect(goalText('recovery', 0, 75)).toBe('Upgrade the Flags: 75 spins left')
    expect(goalText('recovery', 0, 2)).toBe('Upgrade the Flags: 2 spins left')
    expect(goalText('recovery', 0, 1)).toBe('Upgrade the Flags: 1 spin left')
    expect(goalText('recovery', 1, 1)).toBe('Enter the Hyperspace Kicker')
    const game = startMission('recovery')
    repeat(game, 'spinner', FLAG_SPINS - 1)
    expect(missionGoal(game)).toBe('Upgrade the Flags: 1 spin left')
    expect(game.mission?.stage).toBe(0)
  })

  test('rejects invalid selection and does not replace an accepted mission', () => {
    const game = startMission('gas')
    const selected = game.selectedMission
    expect(selectMission(game, 1)).toBe(false)
    expect(selectMission(game, -1)).toBe(false)
    expect(selectMission(game, 4)).toBe(false)
    expect(selectMission(game, 1.5)).toBe(false)
    hit(game, 'spot', 0)
    expect(game.selectedMission).toBe(selected)
    expect(game.mission?.id).toBe('gas')
  })

  test('mission spot targets cycle all four choices and ramp accepts, but does not count, the launch', () => {
    const game = createGame()
    launchRules(game)
    const selected: MissionId[] = []
    for (let i = 0; i < 4; i++) {
      hit(game, 'spot', i % 3)
      selected.push(game.selectedMission)
    }
    expect(selected).toEqual(['bridge', 'gas', 'mint', 'launch'])
    hit(game, 'ramp')
    expect(game.mission).toMatchObject({ id: 'launch', stage: 0, progress: 0, target: 3 })
    expect(game.message).toBe('Mission Accepted: Launch Training')
    hit(game, 'ramp')
    expect(game.mission?.progress).toBe(1)
    expect(missionGoal(game)).toContain('2 more times')
  })

  for (const id of Object.keys(MISSION_RANK) as MissionId[]) {
    test(`${id} is reachable and completes in ball-drag test mode`, () => {
      const game = startMission(id)
      enableTestMode(game)
      completeMission(game, id)
      expect(game.mission).toBeNull()
      expect(game.player.completedMissions).toBe(1)
      expect(game.missionCount).toBe(1)
      expect(game.testMode).toBe(true)
      expect(game.player.score).toBeGreaterThan(POINTS.mission * (MISSION_RANK[id] + 1))
    })
  }

  test('counts only the task event and finishes at the exact eighth bumper', () => {
    const game = startMission('gas')
    repeat(game, 'rebound', 8)
    repeat(game, 'engine', 3, true)
    repeat(game, 'satellite', 8)
    expect(game.mission?.progress).toBe(0)
    repeat(game, 'bumper', 7)
    expect(game.mission?.progress).toBe(7)
    expect(game.player.completedMissions).toBe(0)
    hit(game, 'bumper')
    expect(game.mission).toBeNull()
    expect(game.message).toBe('Mission Completed')
  })

  test('Mint Mission needs nine actual drops, not repeated hits on a down target', () => {
    const game = startMission('mint')
    repeat(game, 'drop', 5)
    expect(game.mission?.progress).toBe(1)
    hit(game, 'drop', 1)
    hit(game, 'drop', 2)
    repeat(game, 'drop', 5, true)
    expect(game.mission?.progress).toBe(8)
    hit(game, 'drop', 2)
    expect(game.player.completedMissions).toBe(1)
  })

  test('Bug Bounty counts target banks, not lanes, bumpers or rebounds', () => {
    const game = startMission('bug')
    for (const event of ['lane', 'bumper', 'satellite', 'rebound', 'spinner', 'ramp'] as TableEvent[]) hit(game, event)
    expect(game.mission?.progress).toBe(0)
    for (const event of ['drop', 'spot', 'engine', 'leftHazard', 'rightHazard'] as TableEvent[]) hit(game, event)
    expect(game.mission?.progress).toBe(5)
  })

  test('Recovery upgrades flags before hyperspace, including at maximum flag level', () => {
    const game = startMission('recovery')
    game.flagLevel = 4
    hit(game, 'hyperspace')
    expect(game.mission?.stage).toBe(0)
    repeat(game, 'spinner', 24)
    expect(game.mission?.progress).toBe(24)
    hit(game, 'spinner')
    expect(game.mission).toMatchObject({ stage: 1, progress: 0 })
    expect(game.flagLevel).toBe(4)
    hit(game, 'hyperspace')
    expect(game.mission).toBeNull()
    expect(game.message).toBe('Stolen Remys returned. Reclaim honoured.')
  })

  test('Recovery takes account of a partly upgraded flag bank at acceptance', () => {
    const game = createGame()
    game.player.rank = 1
    launchRules(game)
    repeat(game, 'spinner', 20)
    selectMission(game, 1)
    hit(game, 'ramp')
    expect(game.mission?.progress).toBe(20)
    repeat(game, 'spinner', 5)
    expect(game.mission?.stage).toBe(1)
  })

  test('Cabald Menace first upgrades attack bumpers, then requires eight fresh hits', () => {
    const game = startMission('menace')
    game.bumperLevel = 4
    repeat(game, 'bumper', 8)
    expect(game.mission?.stage).toBe(0)
    repeat(game, 'reentry', 3)
    expect(game.mission?.stage).toBe(0)
    hit(game, 'reentry', 1)
    hit(game, 'reentry', 2)
    expect(game.mission).toMatchObject({ stage: 1, progress: 0, target: 8 })
    repeat(game, 'bumper', 7)
    expect(game.mission?.progress).toBe(7)
    hit(game, 'bumper')
    expect(game.player.completedMissions).toBe(1)
  })

  test('There Is No Mission accepts only yellow, red, then green', () => {
    const game = startMission('secret')
    hit(game, 'wormhole', 2)
    hit(game, 'wormhole', 1)
    expect(game.mission?.stage).toBe(0)
    expect(missionGoal(game)).toBe('Enter the Yellow Wormhole')
    hit(game, 'wormhole', 0)
    hit(game, 'wormhole', 0)
    hit(game, 'wormhole', 2)
    expect(game.mission?.stage).toBe(1)
    expect(missionGoal(game)).toBe('Enter the Red Wormhole')
    hit(game, 'wormhole', 1)
    expect(missionGoal(game)).toBe('Enter the Green Wormhole')
    hit(game, 'wormhole', 2)
    expect(game.mission).toBeNull()
  })

  for (const [id, bank, end] of [
    ['airdrop', 'rightHazard', 'hyperspace'],
    ['spike', 'leftHazard', 'wormhole'],
    ['rug', 'engine', 'blackhole']
  ] as const) {
    test(`${id} requires three unique bank targets before its finishing shot`, () => {
      const game = startMission(id)
      hit(game, end)
      repeat(game, bank, 3)
      expect(game.mission).toMatchObject({ stage: 0, progress: 1 })
      hit(game, bank, 1)
      hit(game, bank, 2)
      expect(game.mission).toMatchObject({ stage: 1, progress: 0 })
      hit(game, 'lane')
      expect(game.mission?.stage).toBe(1)
      hit(game, end)
      expect(game.mission).toBeNull()
    })
  }

  test('FUD Plague needs exactly seventy-five spins followed by warp', () => {
    const game = startMission('plague')
    hit(game, 'warp')
    repeat(game, 'spinner', 74)
    expect(game.mission).toMatchObject({ stage: 0, progress: 74 })
    hit(game, 'spinner')
    expect(game.mission).toMatchObject({ stage: 1, progress: 0 })
    hit(game, 'spinner')
    expect(game.mission?.progress).toBe(0)
    hit(game, 'warp')
    expect(game.mission).toBeNull()
  })

  test('Mempool Recon counts every lane class, but not ramps or kickers', () => {
    const game = startMission('recon')
    for (const event of ['reentry', 'lane', 'outlane', 'fuel', 'warp', 'bonus'] as TableEvent[]) hit(game, event)
    expect(game.mission?.progress).toBe(6)
    for (const event of ['ramp', 'hyperspace', 'blackhole', 'wormhole'] as TableEvent[]) hit(game, event)
    expect(game.mission?.progress).toBe(6)
  })

  test('Rug Tower saves all three out-lane passes without consuming the ball or ordinary saver', () => {
    const game = startMission('tower')
    tickRules(game, 11)
    for (let pass = 0; pass < 3; pass++) {
      hit(game, 'outlane', pass % 2)
      if (pass < 2) expect(game.mission?.progress).toBe(pass + 1)
      expect(drainBall(game)).toBe(true)
      expect(game.player.ballsPlayed).toBe(0)
      expect(game.ballSaveUsed).toBe(false)
      launchRules(game)
    }
    expect(game.mission).toBeNull()
    expect(game.player.completedMissions).toBe(1)
  })

  test('THE CABALD enforces all eight stages in order and does not double-count the advancing event', () => {
    const game = startMission('cabald')
    for (const event of ['spot', 'lane', 'fuel', 'ramp', 'spinner', 'wormhole', 'hyperspace'] as TableEvent[]) hit(game, event)
    expect(game.mission?.stage).toBe(0)
    repeat(game, 'drop', 3, true)
    expect(game.mission).toMatchObject({ stage: 1, progress: 0 })
    repeat(game, 'spot', 3)
    expect(game.mission?.progress).toBe(1)
    hit(game, 'spot', 1)
    hit(game, 'spot', 2)
    expect(game.mission).toMatchObject({ stage: 2, progress: 0 })
    repeat(game, 'lane', 4)
    hit(game, 'fuel')
    expect(game.mission).toMatchObject({ stage: 3, progress: 0 })
    hit(game, 'ramp')
    expect(game.mission?.stage).toBe(3)
    hit(game, 'fuel')
    expect(game.mission?.stage).toBe(4)
    hit(game, 'ramp')
    expect(game.mission?.stage).toBe(5)
    hit(game, 'spinner')
    expect(game.mission?.stage).toBe(6)
    hit(game, 'wormhole', 2)
    expect(game.mission?.stage).toBe(7)
    hit(game, 'hyperspace')
    expect(game.mission).toBeNull()
    expect(game.message).toBe('There is no Cabald. I love you.')
    expect(game.cabaldMessageShown).toBe(true)
    selectMission(game, availableMissions(game.player.rank).indexOf('cabald'))
    hit(game, 'ramp')
    completeMission(game, 'cabald')
    expect(game.message).not.toContain('There is no Cabald')
  })
})

describe('promotions and Reorg', () => {
  test('promotes after two Cadet completions and exactly three at every later rank', () => {
    const game = createGame()
    launchRules(game)
    for (let rank = 0; rank < 8; rank++) {
      const required = rank === 0 ? 2 : 3
      for (let completed = 0; completed < required; completed++) {
        const id = availableMissions(rank)[0]
        selectMission(game, 0)
        hit(game, 'ramp')
        completeMission(game, id)
        if (completed < required - 1) {
          expect(game.player.rank).toBe(rank)
          expect(game.player.promotionProgress).toBe(completed + 1)
        }
      }
      expect(game.player.rank).toBe(rank + 1)
      expect(game.player.promotionProgress).toBe(0)
      expect(game.message).toBe(`Promotion to ${RANKS[rank + 1]}`)
    }
    expect(game.player.completedMissions).toBe(23)
  })

  test('Fleet Admiral remains capped after repeated completions', () => {
    const game = startMission('plague', 8)
    completeMission(game, 'plague')
    for (let i = 0; i < 4; i++) {
      selectMission(game, 0)
      hit(game, 'ramp')
      completeMission(game, 'plague')
    }
    expect(game.player.rank).toBe(8)
    expect(game.player.promotionProgress).toBe(3)
  })

  test('Reorg needs twenty-five rebounds before its rank-changing choice', () => {
    const game = startMission('reorg')
    game.player.promotionProgress = 2
    hit(game, 'hyperspace')
    hit(game, 'ramp')
    repeat(game, 'rebound', 24)
    expect(game.player.rank).toBe(5)
    expect(game.mission).toMatchObject({ stage: 0, progress: 24 })
    hit(game, 'rebound')
    expect(game.mission?.stage).toBe(1)
    hit(game, 'ramp')
    expect(game.player.rank).toBe(6)
    expect(game.player.promotionProgress).toBe(0)
    expect(game.message).toBe('Chain reorganised. You are now Commodore. Or were you always?')
  })

  test('Reorg hyperspace demotes instead of accidentally granting an ordinary promotion', () => {
    const game = startMission('reorg')
    game.player.promotionProgress = 2
    repeat(game, 'rebound', 25)
    const before = game.player.score
    hit(game, 'hyperspace')
    expect(game.player.rank).toBe(4)
    expect(game.player.promotionProgress).toBe(0)
    expect(game.player.score - before).toBe(POINTS.hyperspace + POINTS.mission * 6)
    expect(game.selectedMission).toBe('airdrop')
    expect(game.message).toContain('Lieutenant Commander')
  })

  test('Reorg cannot promote past Fleet Admiral or demote below Cadet', () => {
    const top = startMission('reorg', 8)
    repeat(top, 'rebound', 25)
    const before = top.player.score
    hit(top, 'ramp')
    expect(top.player.rank).toBe(8)
    expect(top.player.score - before).toBe(POINTS.ramp + POINTS.mission * 9)
    const bottom = startMission('reorg')
    bottom.player.rank = 0
    repeat(bottom, 'rebound', 25)
    hit(bottom, 'hyperspace')
    expect(bottom.player.rank).toBe(0)
  })

  test('promoting Recovery and THE CABALD retain their completion copy', () => {
    const recovery = startMission('recovery')
    recovery.player.promotionProgress = 2
    completeMission(recovery, 'recovery')
    expect(recovery.message).toContain('Promotion to Lieutenant')
    expect(recovery.message).toContain('Stolen Remys returned. Reclaim honoured.')
    const cabald = startMission('cabald')
    cabald.player.promotionProgress = 2
    completeMission(cabald, 'cabald')
    expect(cabald.message).toContain('Promotion to Fleet Admiral')
    expect(cabald.message).toContain('There is no Cabald. I love you.')
  })
})

describe('field awards, upgrades, fuel and bonuses', () => {
  test('drop banks award their bonus at the old multiplier, then advance up to times five', () => {
    const game = createGame()
    launchRules(game)
    repeat(game, 'drop', 3, true)
    expect(game.player.score).toBe(32_500)
    expect(game.multiplier).toBe(2)
    repeat(game, 'drop', 3, true)
    expect(game.player.score).toBe(97_500)
    expect(game.multiplier).toBe(3)
    repeat(game, 'drop', 9, true)
    expect(game.multiplier).toBe(5)
    const before = game.player.score
    hit(game, 'spot')
    expect(game.player.score - before).toBe(5_000)
  })

  test('bumpers, engines and spinner flags upgrade, remain bounded and scale table awards', () => {
    const game = createGame()
    launchRules(game)
    repeat(game, 'reentry', 3, true)
    expect(game.bumperLevel).toBe(2)
    let before = game.player.score
    hit(game, 'bumper')
    expect(game.player.score - before).toBe(1_000)
    repeat(game, 'engine', 3, true)
    expect(game.engineLevel).toBe(2)
    before = game.player.score
    hit(game, 'blackhole')
    expect(game.player.score - before).toBe(40_000)
    repeat(game, 'spinner', FLAG_SPINS)
    expect(game.flagLevel).toBe(2)
    before = game.player.score
    hit(game, 'spinner')
    expect(game.player.score - before).toBe(200)
    repeat(game, 'reentry', 15, true)
    repeat(game, 'engine', 15, true)
    repeat(game, 'spinner', 150)
    expect([game.bumperLevel, game.engineLevel, game.flagLevel]).toEqual([4, 4, 4])
  })

  test('flipper lane rotation shifts all three lights circularly without scoring', () => {
    const game = createGame()
    game.reentryLights = 1
    rotateReentry(game, 1)
    expect(game.reentryLights).toBe(2)
    rotateReentry(game, 1)
    expect(game.reentryLights).toBe(4)
    rotateReentry(game, 1)
    expect(game.reentryLights).toBe(1)
    rotateReentry(game, -1)
    expect(game.reentryLights).toBe(4)
    game.reentryLights = 3
    rotateReentry(game, -1)
    expect(game.reentryLights).toBe(5)
    expect(game.player.score).toBe(0)
  })

  test('mission and promotion awards use one-based rank, not the field multiplier', () => {
    const game = startMission('gas')
    game.multiplier = 5
    game.player.promotionProgress = 1
    repeat(game, 'bumper', 7)
    const before = game.player.score
    hit(game, 'bumper')
    expect(game.player.score - before).toBe(2_500 + 50_000 + 100_000)
    expect(game.player.rank).toBe(1)
  })

  test('fuel drains only during live play, signals low/empty, blocks mission ramps and refills', () => {
    const game = createGame()
    tickRules(game, 90)
    expect(game.fuel).toBe(100)
    expect(game.time).toBe(0)
    launchRules(game)
    tickRules(game, 79)
    expect(game.fuel).toBe(21)
    tickRules(game, 1)
    expect(game.message).toBe('Gas Low')
    tickRules(game, 20)
    expect(game.fuel).toBe(0)
    hit(game, 'ramp')
    expect(game.mission).toBeNull()
    expect(game.messageId).toBe('noFuel')
    hit(game, 'fuel')
    expect(game.fuel).toBe(100)
    hit(game, 'ramp')
    expect(game.mission?.id).toBe('launch')
  })

  test('an active ramp task waits for refueling without losing other mission progress', () => {
    const game = startMission('launch')
    hit(game, 'ramp')
    tickRules(game, 100)
    hit(game, 'ramp')
    expect(game.mission?.progress).toBe(1)
    hit(game, 'fuel')
    hit(game, 'ramp')
    hit(game, 'ramp')
    expect(game.player.completedMissions).toBe(1)
  })

  test('end-of-ball tally uses lane and mission units, field multiplier and rank exactly once', () => {
    const game = startMission('gas')
    completeMission(game, 'gas')
    hit(game, 'lane')
    hit(game, 'bonus')
    game.multiplier = 3
    game.player.rank = 2
    tickRules(game, 11)
    const before = game.player.score
    expect(drainBall(game)).toBe(false)
    expect(game.lastBonus).toBe((2_000 + 10_000) * 3 * 3)
    expect(game.player.score - before).toBe(108_000)
    expect(game.message).toBe('Bonus 108,000')
    expect(game.multiplier).toBe(1)
    expect(game.laneCount).toBe(0)
    expect(game.missionCount).toBe(0)
  })

  test('wraps scores at one billion and does not hide the announcement behind a bank award', () => {
    const game = createGame()
    launchRules(game)
    game.player.score = MAX_SCORE - 499
    hit(game, 'bumper')
    expect(game.player.score).toBe(0)
    expect(game.player.wraps).toBe(1)
    expect(game.message).toBe('You have gone round the clock')
    tickRules(game, 0.1)
    hit(game, 'drop', 0)
    hit(game, 'drop', 1)
    game.player.score = MAX_SCORE - 999
    hit(game, 'drop', 2)
    expect(game.player.score).toBe(26_500)
    expect(game.player.wraps).toBe(2)
    expect(game.message).toBe('You have gone round the clock')
  })

  test('invalid bank indices do not score or advance a mission', () => {
    const game = startMission('mint')
    const before = game.player.score
    for (const index of [-1, 3, 0.5, NaN]) hit(game, 'drop', index)
    expect(game.player.score).toBe(before)
    expect(game.mission?.progress).toBe(0)
  })
})

describe('ball saver, tilt, hyperspace, extra balls and replays', () => {
  test('test-mode drains redeploy indefinitely without consuming lives, missions, score or bonus', () => {
    const game = createGame(2)
    launchRules(game)
    selectMission(game, 1)
    hit(game, 'ramp')
    completeMission(game, 'bridge')
    selectMission(game, 2)
    hit(game, 'ramp')
    hit(game, 'bumper')
    hit(game, 'lane')
    game.multiplier = 3
    game.replays = 2
    enableTestMode(game)
    const mission = game.mission
    const player = game.player
    const score = player.score
    const lanes = game.laneCount
    const launch = game.launchedAt
    for (let drain = 0; drain < 5; drain++) {
      tickRules(game, 11)
      expect(drainBall(game)).toBe(true)
      expect(game.phase).toBe('ready')
      expect(game.currentPlayer).toBe(0)
      expect(game.ball).toBe(1)
      expect(game.player).toBe(player)
      expect(game.players.every(pilot => pilot.ballsPlayed === 0)).toBe(true)
      expect(game.mission).toBe(mission)
      expect(game.mission?.progress).toBe(1)
      expect(player.score).toBe(score)
      expect(game.laneCount).toBe(lanes)
      expect(game.missionCount).toBe(1)
      expect(game.multiplier).toBe(3)
      expect(game.lastBonus).toBe(0)
      expect(game.ballSaveUsed).toBe(false)
      expect(game.launchedAt).toBe(launch)
      expect(game.replays).toBe(2)
      expect(game.testMode).toBe(true)
      expect(launchRules(game)).toBe(true)
      expect(game.phase).toBe('playing')
      expect(game.messageId).toBe('saved')
      expect(game.message).toBe('Ball Saved')
    }
    repeat(game, 'bumper', 7)
    expect(game.mission).toBeNull()
    expect(game.player.completedMissions).toBe(2)
  })

  test('a tilted test-mode drain forfeits bonus and resets the ball without consuming or rotating the turn', () => {
    const game = createGame(2)
    loseBall(game)
    selectMission(game, 2)
    launchRules(game)
    hit(game, 'ramp')
    hit(game, 'bumper')
    hit(game, 'lane')
    game.multiplier = 4
    game.player.extraBalls = 2
    game.replays = 3
    enableTestMode(game)
    const player = game.player
    const score = player.score
    for (let nudge = 0; nudge < 4; nudge++) nudgeRules(game, game.time)
    expect(game.tilted).toBe(true)
    const frozenScore = game.player.score
    hit(game, 'bumper')
    expect(game.player.score).toBe(frozenScore)
    expect(drainBall(game)).toBe(true)
    expect(game.currentPlayer).toBe(1)
    expect(game.player).toBe(player)
    expect(player.ballsPlayed).toBe(0)
    expect(player.extraBalls).toBe(2)
    expect(player.score).toBe(score)
    expect(game.ball).toBe(1)
    expect(game.lastBonus).toBe(0)
    expect(game.laneCount).toBe(0)
    expect(game.missionCount).toBe(0)
    expect(game.mission).toBeNull()
    expect(game.multiplier).toBe(1)
    expect(game.tilted).toBe(false)
    expect(game.nudgeCount).toBe(0)
    expect(game.testMode).toBe(true)
    expect(game.replays).toBe(3)
    expect(game.phase).toBe('ready')
    expect(launchRules(game)).toBe(true)
    hit(game, 'bumper')
    expect(player.score).toBe(score + POINTS.bumper)
  })

  test('a weak launch reseats the same ball without draining, resetting progress or extending its saver', () => {
    const game = startMission('gas')
    hit(game, 'bumper')
    hit(game, 'lane')
    game.multiplier = 3
    tickRules(game, 4)
    const mission = game.mission
    const player = game.player
    const score = player.score
    expect(reseatBall(game)).toBe(true)
    expect(game.phase).toBe('ready')
    expect(game.mission).toBe(mission)
    expect(game.mission?.progress).toBe(1)
    expect(game.player).toBe(player)
    expect(player.score).toBe(score)
    expect(player.ballsPlayed).toBe(0)
    expect(game.ball).toBe(1)
    expect(game.multiplier).toBe(3)
    expect(game.laneCount).toBe(1)
    expect(game.fuel).toBe(96)
    expect(game.lastBonus).toBe(0)
    expect(game.ballSaveUsed).toBe(false)
    expect(game.launchedAt).toBe(0)
    tickRules(game, 20)
    expect(game.time).toBe(4)
    expect(launchRules(game)).toBe(true)
    expect(game.launchedAt).toBe(0)
    tickRules(game, 7)
    expect(drainBall(game)).toBe(false)
    expect(player.ballsPlayed).toBe(1)
  })

  test('reseating cannot restore a used saver and rejects ready, tilted or finished balls', () => {
    const game = createGame()
    expect(reseatBall(game)).toBe(false)
    launchRules(game)
    expect(drainBall(game)).toBe(true)
    launchRules(game)
    expect(reseatBall(game)).toBe(true)
    expect(game.ballSaveUsed).toBe(true)
    launchRules(game)
    expect(drainBall(game)).toBe(false)
    launchRules(game)
    for (let i = 0; i < 4; i++) nudgeRules(game, game.time)
    expect(game.tilted).toBe(true)
    expect(reseatBall(game)).toBe(false)
    game.phase = 'over'
    expect(reseatBall(game)).toBe(false)
  })

  test('saves once at the inclusive ten-second boundary and preserves the ball and mission', () => {
    const game = startMission('gas')
    hit(game, 'bumper')
    tickRules(game, 10)
    const before = game.player.score
    expect(drainBall(game)).toBe(true)
    expect(game.phase).toBe('ready')
    expect(game.ballSaveUsed).toBe(true)
    expect(game.mission?.progress).toBe(1)
    expect(game.player.score).toBe(before)
    expect(game.lastBonus).toBe(0)
    expect(game.player.ballsPlayed).toBe(0)
    expect(game.message).toBe('Ball Saved')
    const savedSerial = game.messageSerial
    launchRules(game)
    expect(game.launchedAt).toBe(0)
    expect(game.phase).toBe('playing')
    expect(game.messageId).toBe('saved')
    expect(game.message).toBe('Ball Saved')
    expect(game.messageSerial).toBe(savedSerial)
    expect(drainBall(game)).toBe(false)
    expect(game.player.ballsPlayed).toBe(1)
    expect(game.ballSaveUsed).toBe(false)
  })

  test('does not save just outside the window, and each new ball gets one saver', () => {
    const game = createGame()
    launchRules(game)
    tickRules(game, 10.000001)
    expect(drainBall(game)).toBe(false)
    expect(game.ball).toBe(2)
    launchRules(game)
    expect(drainBall(game)).toBe(true)
    expect(game.ball).toBe(2)
  })

  test('the fourth nudge within three seconds tilts, freezes scoring, forfeits bonus and beats saves', () => {
    const game = startMission('gas')
    hit(game, 'lane')
    expect(nudgeRules(game, 0)).toBe(true)
    expect(nudgeRules(game, 1)).toBe(true)
    expect(nudgeRules(game, 2)).toBe(true)
    expect(nudgeRules(game, 3)).toBe(false)
    expect(game.tilted).toBe(true)
    expect(game.message).toBe('Tilt!')
    const before = game.player.score
    hit(game, 'bumper')
    hit(game, 'fuel')
    expect(game.player.score).toBe(before)
    expect(game.mission?.progress).toBe(0)
    expect(nudgeRules(game, 3.1)).toBe(false)
    expect(drainBall(game)).toBe(false)
    expect(game.lastBonus).toBe(0)
    expect(game.player.score).toBe(before)
    expect(game.player.ballsPlayed).toBe(1)
    expect(game.tilted).toBe(false)
  })

  test('old nudges expire just outside three seconds and new balls reset the counter', () => {
    const game = createGame()
    launchRules(game)
    expect(nudgeRules(game, 0)).toBe(true)
    expect(nudgeRules(game, 1)).toBe(true)
    expect(nudgeRules(game, 2)).toBe(true)
    expect(nudgeRules(game, 3.000001)).toBe(true)
    expect(game.tilted).toBe(false)
    tickRules(game, 11)
    drainBall(game)
    expect(game.nudgeCount).toBe(0)
    expect(nudgeRules(game, 4)).toBe(false)
    launchRules(game)
    expect(nudgeRules(game, game.time)).toBe(true)
  })

  test('three quick hyperspace shots raise the post, a fourth lights a collectable extra ball', () => {
    const game = createGame()
    launchRules(game)
    for (let i = 0; i < 3; i++) {
      hit(game, 'hyperspace')
      if (i < 2) tickRules(game, HYPERSPACE_WINDOW)
    }
    expect(game.postRaisedUntil).toBe(game.time + POST_SECONDS)
    expect(game.extraBallLit).toBe(false)
    hit(game, 'hyperspace')
    expect(game.extraBallLit).toBe(true)
    expect(game.hyperspaceCount).toBe(0)
    hit(game, 'bonus')
    expect(game.player.extraBalls).toBe(1)
    expect(game.extraBallLit).toBe(false)
    expect(game.message).toBe('Extra Ball')
    tickRules(game, POST_SECONDS + 0.01)
    expect(game.postRaisedUntil).toBeLessThan(game.time)
  })

  test('slow hyperspace shots restart the quick chain', () => {
    const game = createGame()
    launchRules(game)
    hit(game, 'hyperspace')
    tickRules(game, HYPERSPACE_WINDOW + 0.01)
    hit(game, 'hyperspace')
    expect(game.hyperspaceCount).toBe(1)
    hit(game, 'hyperspace')
    expect(game.postRaisedUntil).toBe(0)
    hit(game, 'hyperspace')
    expect(game.postRaisedUntil).toBeGreaterThan(game.time)
  })

  test('hazard banks save only their matching out-lane once without spending the timed saver', () => {
    const game = createGame()
    launchRules(game)
    repeat(game, 'leftHazard', 3, true)
    expect(game.outlaneSave).toBe(1)
    tickRules(game, 11)
    hit(game, 'outlane', 0)
    expect(drainBall(game)).toBe(true)
    expect(game.ballSaveUsed).toBe(false)
    expect(game.outlaneSave).toBe(0)
    expect(game.leftHazards).toBe(0)
    launchRules(game)
    hit(game, 'outlane', 0)
    expect(drainBall(game)).toBe(false)
    launchRules(game)
    repeat(game, 'rightHazard', 3, true)
    expect(game.outlaneSave).toBe(2)
    tickRules(game, 11)
    hit(game, 'outlane', 0)
    expect(drainBall(game)).toBe(false)
  })

  test('lit extra balls can also be collected in an out-lane', () => {
    const game = createGame()
    launchRules(game)
    repeat(game, 'hyperspace', 4)
    hit(game, 'outlane', 1)
    expect(game.player.extraBalls).toBe(1)
    expect(game.extraBallLit).toBe(false)
  })

  test('extras play immediately before rotation and do not consume another normal ball', () => {
    const game = createGame(2)
    launchRules(game)
    repeat(game, 'hyperspace', 4)
    hit(game, 'bonus')
    tickRules(game, 11)
    drainBall(game)
    expect(game.currentPlayer).toBe(0)
    expect(game.extraBall).toBe(true)
    expect(game.ball).toBe(1)
    expect(game.player.ballsPlayed).toBe(1)
    expect(game.player.extraBalls).toBe(0)
    loseBall(game)
    expect(game.currentPlayer).toBe(1)
    expect(game.ball).toBe(1)
    expect(game.players[0].ballsPlayed).toBe(1)
  })

  test('wormholes start unlit, nonmatches only score, and one match consumes its light', () => {
    const game = createGame()
    launchRules(game)
    expect(game.wormholeColor).toBe(-1)
    hit(game, 'wormhole', 0)
    expect(game.replays).toBe(0)
    hit(game, 'warp')
    expect(game.wormholeColor).toBe(0)
    const before = game.player.score
    hit(game, 'wormhole', 1)
    expect(game.player.score - before).toBe(POINTS.wormhole)
    expect(game.replays).toBe(0)
    expect(game.wormholeColor).toBe(0)
    hit(game, 'wormhole', 0)
    expect(game.replays).toBe(1)
    expect(game.wormholeColor).toBe(-1)
    expect(game.message).toBe('Replay Awarded')
    expect(game.phase).toBe('playing')
    expect(game.player.extraBalls).toBe(0)
    hit(game, 'wormhole', 0)
    expect(game.replays).toBe(1)
  })

  test('warp-match cycles advance yellow, red, green independently of the extinguished light, without a cap', () => {
    const game = createGame()
    launchRules(game)
    for (let credit = 0; credit < 6; credit++) {
      const color = credit % 3
      hit(game, 'warp')
      expect(game.wormholeColor).toBe(color)
      hit(game, 'wormhole', color)
      expect(game.wormholeColor).toBe(-1)
      expect(game.replays).toBe(credit + 1)
      if (credit > 0) expect(game.message).toBe(`Replay Awarded (${credit + 1})`)
    }
    expect(game.wormholeNextColor).toBe(0)
  })

  test('replay credits are shared across players while wormhole light and cursor reset per ball', () => {
    const game = createGame(2)
    launchRules(game)
    hit(game, 'warp')
    hit(game, 'wormhole', 0)
    hit(game, 'warp')
    expect(game.wormholeColor).toBe(1)
    tickRules(game, 11)
    drainBall(game)
    expect(game.currentPlayer).toBe(1)
    expect(game.replays).toBe(1)
    expect(game.wormholeColor).toBe(-1)
    expect(game.wormholeNextColor).toBe(0)
    launchRules(game)
    hit(game, 'warp')
    hit(game, 'wormhole', 0)
    expect(game.replays).toBe(2)
    expect(game.message).toBe('Replay Awarded (2)')
  })

  test('replayGame spends one shared credit on a fully fresh game for the same number of players', () => {
    const game = createGame(3)
    expect(replayGame(game)).toBeNull()
    game.replays = 2
    game.players[0].score = 100_000
    game.players[0].rank = 4
    game.players[0].ballsPlayed = 3
    game.phase = 'over'
    const replay = replayGame(game)!
    expect(replay).not.toBe(game)
    expect(replay.players).toHaveLength(3)
    expect(replay.replays).toBe(1)
    expect(replay.phase).toBe('ready')
    expect(replay.ball).toBe(1)
    expect(replay.currentPlayer).toBe(0)
    expect(replay.players.every(player => player.score === 0 && player.rank === 0 && player.ballsPlayed === 0)).toBe(true)
    expect(replay.mission).toBeNull()
    expect(replay.fuel).toBe(100)
    expect(replay.wormholeColor).toBe(-1)
    expect(replayGame(replay)!.replays).toBe(0)
    expect(replayGame(replayGame(replay)!)).toBeNull()
  })
})

describe('one to four players and high-score persistence helpers', () => {
  for (const players of [1, 2, 3, 4]) {
    test(`${players} players rotate exactly three normal balls and retain independent scores and ranks`, () => {
      const game = createGame(players)
      for (let ball = 1; ball <= 3; ball++) {
        for (let player = 0; player < players; player++) {
          expect(game.currentPlayer).toBe(player)
          expect(game.ball).toBe(ball)
          if (ball === 1) {
            game.player.rank = player
            game.player.score = (player + 1) * 10_000
          }
          loseBall(game)
        }
      }
      expect(game.phase).toBe('over')
      expect(game.players.map(player => player.ballsPlayed)).toEqual(Array(players).fill(3))
      expect(game.players.map(player => player.rank)).toEqual(Array.from({ length: players }, (_, index) => index))
      expect(game.players.map(player => player.score)).toEqual(Array.from({ length: players }, (_, index) => (index + 1) * 10_000))
      expect(game.message).toBe('Game Over')
      expect(launchRules(game)).toBe(false)
      expect(drainBall(game)).toBe(false)
      expect(selectMission(game, 0)).toBe(false)
      const time = game.time
      tickRules(game, 20)
      expect(game.time).toBe(time)
    })
  }

  test('clamps player counts to the supported range and defaults non-finite values', () => {
    expect(createGame(0).players).toHaveLength(1)
    expect(createGame(9).players).toHaveLength(4)
    expect(createGame(2.8).players).toHaveLength(2)
    expect(createGame(NaN).players).toHaveLength(1)
  })

  test('bonus and per-ball table state reset while rank, score, missions and replay credits persist', () => {
    const game = startMission('gas')
    completeMission(game, 'gas')
    hit(game, 'warp')
    hit(game, 'wormhole', 0)
    repeat(game, 'reentry', 3, true)
    tickRules(game, 11)
    drainBall(game)
    expect(game.player.completedMissions).toBe(1)
    expect(game.player.promotionProgress).toBe(1)
    expect(game.replays).toBe(1)
    expect(game.bumperLevel).toBe(1)
    expect(game.fuel).toBe(100)
    expect(game.mission).toBeNull()
  })

  const scores: HighScore[] = [
    { name: 'One', score: 500, rank: 8 },
    { name: 'Two', score: 400, rank: 6 },
    { name: 'Three', score: 300, rank: 4 },
    { name: 'Four', score: 200, rank: 2 },
    { name: 'Five', score: 100, rank: 0 }
  ]

  test('top five are sorted, qualify strictly over fifth place, and do not mutate saved input', () => {
    expect(qualifiesHighScore(scores, 101)).toBe(true)
    expect(qualifiesHighScore(scores, 100)).toBe(false)
    expect(qualifiesHighScore([], 1)).toBe(true)
    expect(qualifiesHighScore([], 0)).toBe(false)
    const updated = recordHighScore(scores, 'New Pilot', 350, 3)
    expect(updated.map(entry => entry.score)).toEqual([500, 400, 350, 300, 200])
    expect(updated[2]).toEqual({ name: 'New Pilot', score: 350, rank: 3 })
    expect(scores[4].name).toBe('Five')
    expect(recordHighScore(scores, 'Tie', 100, 8)).toEqual(scores)
  })

  test('names are trimmed/capped and empty names fall back to Anonymous', () => {
    expect(recordHighScore([], '  Pilot  ', 100)[0].name).toBe('Pilot')
    expect(recordHighScore([], 'x'.repeat(40), 100)[0].name).toHaveLength(32)
    expect(recordHighScore([], '   ', 100)[0].name).toBe('Anonymous')
  })

  test('corrupt/foreign storage is guarded and invalid numeric scores/ranks are excluded', () => {
    expect(sanitizeHighScores(null)).toEqual([])
    expect(sanitizeHighScores({ scores })).toEqual([])
    expect(sanitizeHighScores([
      null, false, {}, { name: 'NaN', score: NaN, rank: 0 },
      { name: 'Fraction', score: 1.5, rank: 0 }, { name: 'Negative', score: -1, rank: 0 },
      { name: 'Too High', score: MAX_SCORE + 1, rank: 0 }, { name: 'No Rank', score: 123 },
      { name: 'Bad Rank', score: 123, rank: 9 }, { name: '  Safe  ', score: 456, rank: 1 }
    ])).toEqual([{ name: 'Safe', score: 456, rank: 1 }])
    expect(sanitizeHighScores([...scores].reverse()).map(entry => entry.score)).toEqual([500, 400, 300, 200, 100])
    expect(recordHighScore(scores, 'Invalid', NaN)).toEqual(scores)
    expect(recordHighScore(scores, 'Invalid', 999, 99)).toEqual(scores)
  })

  test('test mode is sticky and excludes every player from high scores', () => {
    expect(qualifiesHighScore(scores, 999, true)).toBe(false)
    expect(recordHighScore(scores, 'Test', 999, 8, true)).toEqual(scores)
    const game = createGame(2)
    game.players[0].score = 500
    game.players[1].score = 1_000
    enableTestMode(game)
    expect(game.message).toBe('Test Mode')
    // Test mode cannot exhaust lives; exclusion still applies if a session is explicitly ended.
    game.phase = 'over'
    expect(game.phase).toBe('over')
    expect(game.testMode).toBe(true)
    expect(highScoreCandidates(game)).toEqual([])
  })

  test('high-score candidates only appear after game over in descending score order', () => {
    const game = createGame(3)
    game.players[0].score = 500
    game.players[1].score = 1_000
    game.players[2].score = 0
    expect(highScoreCandidates(game)).toEqual([])
    for (let i = 0; i < 9; i++) loseBall(game)
    expect(highScoreCandidates(game)).toEqual([{ player: 1, score: 1_000, rank: 0 }, { player: 0, score: 500, rank: 0 }])
  })
})

describe('keyboard control persistence and remapping', () => {
  test('the default controls cover every required table action', () => {
    expect(validControls(DEFAULT_CONTROLS)).toBe(true)
    expect(CONTROL_ACTIONS).toEqual(['left', 'right', 'plunger', 'nudgeLeft', 'nudgeRight', 'nudgeUp'])
    expect(DEFAULT_CONTROLS).toEqual({ left: 'z', right: '/', plunger: ' ', nudgeLeft: 'x', nudgeRight: '.', nudgeUp: 'ArrowUp' })
  })

  test('guard rejects missing actions, duplicate keys, function keys and corrupt stored controls', () => {
    expect(validControls(null)).toBe(false)
    expect(validControls([])).toBe(false)
    expect(validControls({ ...DEFAULT_CONTROLS, left: undefined })).toBe(false)
    expect(validControls({ ...DEFAULT_CONTROLS, left: DEFAULT_CONTROLS.right })).toBe(false)
    expect(validControls({ ...DEFAULT_CONTROLS, plunger: '' })).toBe(false)
    expect(validControls({ ...DEFAULT_CONTROLS, left: 90 })).toBe(false)
    expect(validControls({ ...DEFAULT_CONTROLS, left: 'a'.repeat(25) })).toBe(false)
    for (const key of ['F1', 'F2', 'F3', 'F4', 'F8', 'F12']) expect(validControls({ ...DEFAULT_CONTROLS, left: key })).toBe(false)
    const { nudgeUp: _removed, ...missing } = DEFAULT_CONTROLS
    expect(validControls(missing)).toBe(false)
  })

  test('normalization lowercases characters but preserves Space and named keys', () => {
    expect(normalizeKey('Z')).toBe('z')
    expect(normalizeKey('X')).toBe('x')
    expect(normalizeKey('/')).toBe('/')
    expect(normalizeKey(' ')).toBe(' ')
    expect(normalizeKey('ArrowUp')).toBe('ArrowUp')
    expect(normalizeKey('Enter')).toBe('Enter')
  })

  test('remapped actions match the new keys, case-insensitively for characters', () => {
    const controls: Controls = { left: 'a', right: 'd', plunger: 'Enter', nudgeLeft: 'j', nudgeRight: 'l', nudgeUp: 'k' }
    expect(validControls(controls)).toBe(true)
    for (const action of CONTROL_ACTIONS) expect(controlForKey(controls, controls[action])).toBe(action)
    expect(controlForKey(controls, 'A')).toBe('left')
    expect(controlForKey(controls, 'D')).toBe('right')
    expect(controlForKey(controls, 'Enter')).toBe('plunger')
    expect(controlForKey(controls, 'z')).toBeUndefined()
    expect(controlForKey(controls, ' ')).toBeUndefined()
    expect(controlForKey(controls, 'F2')).toBeUndefined()
  })
})
