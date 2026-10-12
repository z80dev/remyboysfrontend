import { describe, expect, test } from 'bun:test'
import {
  FACE_COUNT, LAYOUTS, LAYOUT_IDS, TILE_COUNT, availablePairs, backup, clockRuns, clockSeconds, createDeal, freeTiles, isFree, matches,
  nearestFree, noMoves, parseGameNumber, remaining, removePair, selectTile, solveDeal, startGame
} from '../../src/games/taipei/engine'
import type { Deal, Position } from '../../src/games/taipei/engine'
import { defaults, isPreferences } from '../../src/games/taipei/preferences'
import { boardGeometry, clampView, drawFace, hitTile } from '../../src/games/taipei/render'
import { faceLabel, strings } from '../../src/games/taipei/strings'

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
  test('every layout leaves eight pixels around tile depth and cast shadows', () => {
    for (const id of LAYOUT_IDS) {
      const geometry = boardGeometry(LAYOUTS[id])
      for (const p of LAYOUTS[id]) {
        const x = geometry.x + (p.x * 40 - p.z * 4) * geometry.scale
        const y = geometry.y + (p.y * 52 - p.z * 4) * geometry.scale
        expect(x).toBeGreaterThanOrEqual(8 - 0.00001)
        expect(y).toBeGreaterThanOrEqual(8 - 0.00001)
        expect(x + 48 * geometry.scale).toBeLessThanOrEqual(geometry.width - 8 + 0.00001)
        expect(y + 60 * geometry.scale).toBeLessThanOrEqual(geometry.height - 8 + 0.00001)
      }
    }
  })
  test('Pocket zoom uses the full tall viewport, preserves tile aspect, and clamps pan', () => {
    const positions = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 2, y: 0, z: 0 }]
    const game = startGame(fixture(positions, [0, 0, 0]))
    const normal = boardGeometry(positions)
    const pocket = boardGeometry(positions, 1200)
    expect(pocket.height).toBe(1200)
    expect(pocket.scale).toBe(normal.scale)
    expect(pocket.y - normal.y).toBeCloseTo(385)
    const view = clampView(pocket, { zoom: 2, panX: 10000, panY: 10000 })
    expect(view.panY).toBe(0)
    const x = pocket.x + 16 * pocket.scale
    const y = pocket.y + 22 * pocket.scale
    expect(hitTile(game, pocket, view, (x - 320) * 2 + 320 + view.panX, (y - 600) * 2 + 600)).toBe(1)
  })
  test('tall Pocket layouts fit the actual height rather than a desktop cap', () => {
    for (const layout of LAYOUT_IDS) {
      const pocket = boardGeometry(LAYOUTS[layout], 1081, 8 * 640 / 390)
      expect(pocket.contentWidth).toBeCloseTo(640 - pocket.padding * 2)
      expect(pocket.contentHeight).toBeLessThanOrEqual(1081 - pocket.padding * 2)
      expect(pocket.scale * 40 * 390 / 640 * 2).toBeGreaterThanOrEqual(32)
    }
  })
  test('all layers paint diagonally bottom-right, with x breaking equal-depth ties', () => {
    for (const layout of LAYOUT_IDS) {
      const positions = LAYOUTS[layout]
      const order = boardGeometry(positions).order
      for (let i = 1; i < order.length; i++) {
        const a = positions[order[i - 1]]
        const b = positions[order[i]]
        expect(a.z < b.z || a.z === b.z && (a.x + a.y < b.x + b.y || a.x + a.y === b.x + b.y && a.x <= b.x)).toBe(true)
      }
    }
    const positions = [{ x: 1, y: 3, z: 0 }, { x: 0, y: 3.5, z: 0 }, { x: 2, y: 2, z: 0 }]
    expect(boardGeometry(positions).order).toEqual([1, 0, 2])
  })
  test('matching keeps keyboard focus near the removed tile rather than the first index', () => {
    const positions = [0, 8, 10, 12].map((x) => ({ x, y: 0, z: 0 }))
    const next = removePair(startGame(fixture(positions, [1, 2, 0, 0])), 2, 3)
    expect(nearestFree(next, 3)).toBe(1)
    expect(nearestFree({ ...next, removed: [true, true, true, true] }, 3)).toBeNull()
  })
  test('Flag has three layers and fewer open ends without changing its inventory', () => {
    const positions = LAYOUTS.flag
    expect(positions.length).toBe(144)
    expect(Math.max(...positions.map((p) => p.z))).toBe(2)
    expect(freeTiles(positions, positions.map(() => false)).length).toBeLessThan(40)
  })
  test('clock starts on selection and freezes for hidden windows, dialogs and wins', () => {
    expect(clockRuns(false, false, false, 144)).toBe(false)
    expect(clockRuns(true, false, false, 142)).toBe(true)
    expect(clockRuns(true, true, false, 142)).toBe(false)
    expect(clockRuns(true, false, true, 142)).toBe(false)
    expect(clockRuns(true, false, false, 0)).toBe(false)
    expect(clockSeconds(2500, 1000, 2500)).toBe(4)
    expect(clockSeconds(2500, null, 100000)).toBe(2)
  })
  test('Remy announcements name the depicted civilian and bonus groups', () => {
    expect(faceLabel(20, false)).toBe('Remy 3')
    expect(faceLabel(35, false)).toBe('Flag Remy 2 (Flower)')
    expect(faceLabel(40, false)).toBe('Cabald 3 (Season)')
    expect(faceLabel(35, true)).toBe('Orchid')
    expect(faceLabel(40, true)).toBe('Autumn')
  })
  test('Classic character indices stay inset and separate from Chinese numerals', () => {
    for (let face = 18; face < 27; face++) {
      let x = 0
      let y = 0
      let points: [number, number][] = []
      const strokes: [number, number][][] = []
      const panels: number[][] = []
      const context = {
        beginPath() { points = [] },
        moveTo(px: number, py: number) { points.push([px + x, py + y]) },
        lineTo(px: number, py: number) { points.push([px + x, py + y]) },
        stroke() { strokes.push(points) },
        fillRect(...rect: number[]) { panels.push(rect) },
        save() {},
        translate(dx: number, dy: number) { x += dx; y += dy },
        scale() {},
        restore() {}
      } as unknown as CanvasRenderingContext2D
      drawFace(context, face, 'classic', {})
      const index = strokes[strokes.length - 1]
      expect(panels).toEqual([[2, 2, 11, 13]])
      expect(Math.min(...index.map(([px]) => px)) - 0.8).toBeGreaterThanOrEqual(2)
      expect(Math.min(...index.map(([, py]) => py)) - 0.8).toBeGreaterThanOrEqual(2)
      expect(Math.max(...index.map(([px]) => px)) + 0.8).toBeLessThan(Math.min(...strokes[0].map(([px]) => px)) - 1)
    }
  })
  test('Rules retain the specified Seasons note and explain the Remy mapping', () => {
    expect(strings.help.Rules).toContain('The Seasons are interchangeable. Just like their alibis.')
    expect(strings.help.Rules).toContain('Coins = Dots')
    expect(strings.help.Rules).toContain('C-marked Cabalds = Seasons')
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
