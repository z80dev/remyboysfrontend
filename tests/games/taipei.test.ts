import { describe, expect, test } from 'bun:test'
import {
  FACE_COUNT, LAYOUTS, LAYOUT_IDS, TILE_COUNT, availablePairs, backup, createDeal, freeTiles, isFree, matches,
  nearestFree, noMoves, parseGameNumber, remaining, removePair, selectTile, solveDeal, startGame, type Deal, type Position
} from '../../src/games/taipei/engine'
import { defaults, isPreferences } from '../../src/games/taipei/preferences'
import { boardGeometry, hitTile } from '../../src/games/taipei/render'
import { faceLabel } from '../../src/games/taipei/strings'

function fixture(positions: readonly Position[], faces: readonly number[]): Deal {
  return { number: 1, layout: 'standard', positions, faces, solution: [] }
}
const row = (count: number): Position[] => Array.from({ length: count }, (_, x) => ({ x, y: 0, z: 0 }))

describe('Taipei free-tile geometry', () => {
  test('both side neighbors block the middle, either open side is enough', () => {
    const positions = row(3)
    expect(isFree(positions, [false, false, false], 0)).toBe(true)
    expect(isFree(positions, [false, false, false], 1)).toBe(false)
    expect(isFree(positions, [false, false, false], 2)).toBe(true)
    expect(isFree(positions, [true, false, false], 1)).toBe(true)
    expect(isFree(positions, [false, false, true], 1)).toBe(true)
    expect(isFree(positions, [false, true, false], 1)).toBe(false)
    expect(isFree(positions, [false, false, false], -1)).toBe(false)
  })
  test('an overlapping tile on any higher layer covers; half-tile offsets count', () => {
    const positions = [{ x: 0, y: 0, z: 0 }, { x: 0.5, y: 0.5, z: 2 }, { x: 1.5, y: 0.5, z: 2 }]
    expect(isFree(positions, [false, false, false], 0)).toBe(false)
    expect(isFree(positions, [false, true, false], 0)).toBe(true)
    expect(isFree(positions, [false, false, false], 1)).toBe(true)
  })
  test('touching edges do not cover and neighbors on other layers do not block sides', () => {
    const positions = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 }]
    expect(isFree(positions, [false, false, false], 0)).toBe(true)
  })
  test('partially overlapping rows still block a side', () => {
    const positions = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0.5, z: 0 }, { x: -1, y: -0.5, z: 0 }]
    expect(isFree(positions, [false, false, false], 0)).toBe(false)
  })
})

describe('Taipei faces and numbered deals', () => {
  test('identical faces match and flowers and seasons form separate groups', () => {
    for (let a = 0; a < FACE_COUNT; a++) for (let b = 0; b < FACE_COUNT; b++) {
      const expected = a === b || a >= 34 && a < 38 && b >= 34 && b < 38 || a >= 38 && b >= 38
      expect(matches(a, b)).toBe(expected)
    }
  })
  test('all 42 faces in both sets have individual readable labels', () => {
    for (const classic of [false, true]) {
      const labels = Array.from({ length: FACE_COUNT }, (_, face) => faceLabel(face, classic))
      expect(labels.every((label) => label.length > 0)).toBe(true)
      expect(new Set(labels).size).toBe(FACE_COUNT)
    }
  })
  test('every layout contains exactly 144 unique positions', () => {
    for (const id of LAYOUT_IDS) {
      const positions = LAYOUTS[id]
      expect(positions.length).toBe(TILE_COUNT)
      expect(new Set(positions.map((p) => `${p.x}:${p.y}:${p.z}`)).size).toBe(TILE_COUNT)
      expect(positions.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isInteger(p.z) && p.z >= 0)).toBe(true)
    }
    expect(Math.max(...LAYOUTS.standard.map((p) => p.z))).toBe(4)
  })
  test('game number and options reproduce the entire deal', () => {
    for (const layout of LAYOUT_IDS) for (const solvable of [true, false]) {
      expect(createDeal(71234, layout, solvable)).toEqual(createDeal(71234, layout, solvable))
      expect(createDeal(71235, layout, solvable).faces).not.toEqual(createDeal(71234, layout, solvable).faces)
    }
  })
  test('deal inventory has four of each ordinary face and one of each bonus face', () => {
    for (const layout of LAYOUT_IDS) for (const solvable of [true, false]) {
      const deal = createDeal(1, layout, solvable)
      expect(deal.faces.length).toBe(TILE_COUNT)
      for (let face = 0; face < FACE_COUNT; face++) expect(deal.faces.filter((f) => f === face).length).toBe(face < 34 ? 4 : 1)
      expect(deal.solution.length).toBe(solvable ? 72 : 0)
    }
  })
  test('valid deep-link numbers are accepted, invalid parameters silently ignored', () => {
    for (const param of ['1', '42', '99999', '00001']) expect(parseGameNumber(param)).toBe(Number(param))
    for (const param of [undefined, '', '0', '-1', '100000', '1.5', ' 2', '2 ', 'abc', '5/2']) expect(parseGameNumber(param)).toBeNull()
  })
})

describe('Taipei solvable reverse-play generation', () => {
  for (const layout of LAYOUT_IDS) {
    test(`${layout}: solver validates all 144 removals on 500 seeds`, () => {
      for (let seed = 1; seed <= 500; seed++) {
        const deal = createDeal(seed, layout)
        const solution = solveDeal(deal)
        expect(solution).not.toBeNull()
        expect(solution?.length).toBe(72)
        let game = startGame(deal)
        for (const [a, b] of solution!) {
          expect(isFree(deal.positions, game.removed, a)).toBe(true)
          expect(isFree(deal.positions, game.removed, b)).toBe(true)
          expect(matches(deal.faces[a], deal.faces[b])).toBe(true)
          const next = removePair(game, a, b)
          expect(next).not.toBe(game)
          game = next
        }
        expect(remaining(game)).toBe(0)
        expect(noMoves(game)).toBe(false)
      }
    }, 120000)
  }
  test('solver also works without any generator witness', () => {
    const deal = fixture(row(4), [0, 1, 1, 0])
    expect(solveDeal(deal)).toEqual([[0, 3], [1, 2]])
    expect(solveDeal(fixture(row(4), [0, 0, 1, 1]))).toBeNull()
  })
  test('solver backtracks when a legal pair strands the covered tiles', () => {
    const positions = [{ x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }]
    const deal = fixture(positions, [0, 0, 0, 0])
    const solution = solveDeal(deal)
    expect(solution).not.toBeNull()
    expect(solution?.length).toBe(2)
    let game = startGame(deal)
    for (const [a, b] of solution!) game = removePair(game, a, b)
    expect(remaining(game)).toBe(0)
  })
})

describe('Taipei selection, backup, hints and no-moves behavior', () => {
  test('selection toggles, mismatches change selection, blocked clicks do nothing', () => {
    const game = startGame(fixture(row(4), [0, 1, 1, 2]))
    const selected = selectTile(game, 0)
    expect(selected.selected).toBe(0)
    expect(selectTile(selected, 0).selected).toBeNull()
    expect(selectTile(selected, 3).selected).toBe(3)
    expect(selectTile(selected, 1)).toBe(selected)
    expect(game.selected).toBeNull()
  })
  test('matching free tiles remove atomically and undo restores every level', () => {
    const game = startGame(fixture(row(6), [0, 1, 2, 2, 1, 0]))
    const first = selectTile(selectTile(game, 0), 5)
    const second = removePair(first, 1, 4)
    const third = removePair(second, 2, 3)
    expect(third.history.length).toBe(3)
    expect(remaining(third)).toBe(0)
    expect(backup(backup(backup(third)))).toEqual(game)
    expect(backup(game)).toBe(game)
    expect(game.removed.every((value) => !value)).toBe(true)
    expect(removePair(game, 0, 0)).toBe(game)
    expect(removePair(game, 0, 1)).toBe(game)
  })
  test('no-moves distinguishes a dead end from a completed game', () => {
    const dead = startGame(fixture(row(4), [0, 0, 1, 1]))
    expect(noMoves(dead)).toBe(true)
    expect(availablePairs(dead)).toEqual([])
    expect(noMoves(startGame(fixture([], [])))).toBe(false)
    expect(noMoves(startGame(fixture(row(4), [0, 1, 1, 0])))).toBe(false)
  })
  test('hint candidates are all legal and repeated cycling wraps', () => {
    const positions = row(4).map((p) => ({ ...p, x: p.x * 2 }))
    const game = startGame(fixture(positions, [0, 0, 1, 1]))
    const pairs = availablePairs(game)
    expect(pairs).toEqual([[0, 1], [2, 3]])
    expect(pairs[2 % pairs.length]).toEqual(pairs[0])
    expect(availablePairs(removePair(game, 0, 1))).toEqual([[2, 3]])
  })
  test('keyboard navigation visits only free tiles and honors direction', () => {
    const game = startGame(fixture(row(4), [0, 1, 1, 0]))
    expect(freeTiles(game.deal.positions, game.removed)).toEqual([0, 3])
    expect(nearestFree(game, null, 1, 0)).toBe(0)
    expect(nearestFree(game, 0, 1, 0)).toBe(3)
    expect(nearestFree(game, 3, -1, 0)).toBe(0)
    expect(nearestFree(game, 0, -1, 0)).toBe(0)
  })
  test('hit testing respects topmost layer, removed tiles, and zoom/pan', () => {
    const positions = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 2, y: 0, z: 0 }]
    const game = startGame(fixture(positions, [0, 0, 0]))
    const geometry = boardGeometry(positions)
    const x = geometry.x + 16 * geometry.scale
    const y = geometry.y + 22 * geometry.scale
    expect(hitTile(game, geometry, { zoom: 1, panX: 0, panY: 0 }, x, y)).toBe(1)
    const zoomX = (x - 320) * 2 + 320 + 15
    const zoomY = (y - 215) * 2 + 215 - 20
    expect(hitTile(game, geometry, { zoom: 2, panX: 15, panY: -20 }, zoomX, zoomY)).toBe(1)
    expect(hitTile({ ...game, removed: [false, true, false] }, geometry, { zoom: 1, panX: 0, panY: 0 }, x, y)).toBe(0)
  })
})

describe('Taipei persistent per-layout best times', () => {
  test('valid options and independent records pass the storage guard', () => {
    expect(isPreferences(defaults)).toBe(true)
    expect(isPreferences({ ...defaults, best: { standard: { seconds: 95, name: 'Remy Boy' }, spiral: { seconds: 120, name: 'Other Remy' } } })).toBe(true)
  })
  test('corrupt, foreign, malformed records cannot be restored', () => {
    for (const value of [null, [], {}, { ...defaults, layout: 'unknown' }, { ...defaults, solvable: 'yes' }, { ...defaults, best: [] },
      { ...defaults, best: { standard: { seconds: -1, name: 'A' } } }, { ...defaults, best: { flag: { seconds: NaN, name: 'A' } } },
      { ...defaults, best: { standard: { seconds: 10, name: 'A'.repeat(33) } } }, { ...defaults, best: { other: { seconds: 10, name: 'A' } } }]) {
      expect(isPreferences(value)).toBe(false)
    }
  })
})
