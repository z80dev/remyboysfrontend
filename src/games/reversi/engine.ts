export type Side = 1 | -1
export type Board = Int8Array
export type Skill = 'beginner' | 'novice' | 'expert' | 'master'
export const SKILLS: Skill[] = ['beginner', 'novice', 'expert', 'master']
export const DIRECTIONS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const
const WEIGHTS = new Int16Array([
  120, -25, 20, 5, 5, 20, -25, 120,
  -25, -45, -5, -5, -5, -5, -45, -25,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -25, -45, -5, -5, -5, -5, -45, -25,
  120, -25, 20, 5, 5, 20, -25, 120,
])
const RAYS = Array.from({ length: 64 }, (_, square) => DIRECTIONS.map(([dx, dy]) => {
  const ray: number[] = []
  for (let x = square % 8 + dx, y = (square >> 3) + dy; x >= 0 && x < 8 && y >= 0 && y < 8; x += dx, y += dy) ray.push(y * 8 + x)
  return new Uint8Array(ray)
}))

export function initialBoard(): Board {
  const board = new Int8Array(64)
  board[27] = board[36] = -1
  board[28] = board[35] = 1
  return board
}

// The caller supplies reusable storage during search; rule callers receive ordinary arrays.
function collect(board: Board, square: number, side: Side, out?: Uint8Array): number {
  if (square < 0 || square >= 64 || board[square]) return 0
  let count = 0
  for (const ray of RAYS[square]) {
    let n = 0
    while (n < ray.length && board[ray[n]] === -side) n++
    if (n && n < ray.length && board[ray[n]] === side) {
      if (out) for (let i = 0; i < n; i++) out[count + i] = ray[i]
      count += n
    }
  }
  return count
}

export function flipsFor(board: Board, square: number, side: Side): number[] {
  const out = new Uint8Array(64)
  return Array.from(out.subarray(0, collect(board, square, side, out)))
}

export function legalMoves(board: Board, side: Side): number[] {
  const moves: number[] = []
  for (let square = 0; square < 64; square++) if (collect(board, square, side)) moves.push(square)
  return moves
}

export function counts(board: Board): { remys: number; cabald: number; empty: number } {
  let remys = 0
  let cabald = 0
  for (const cell of board) {
    if (cell === 1) remys++
    else if (cell === -1) cabald++
  }
  return { remys, cabald, empty: 64 - remys - cabald }
}

export function turnState(board: Board, side: Side): 'move' | 'pass' | 'end' {
  if (legalMoves(board, side).length) return 'move'
  return legalMoves(board, -side as Side).length ? 'pass' : 'end'
}

export function playMove(board: Board, square: number, side: Side): { board: Board; flips: number[] } | null {
  const flips = flipsFor(board, square, side)
  if (!flips.length) return null
  const next = board.slice()
  next[square] = side
  for (const flip of flips) next[flip] = side
  return { board: next, flips }
}

export function passTurn(board: Board, side: Side): Side | null {
  return turnState(board, side) === 'pass' ? -side as Side : null
}

export type SearchOptions = { seed?: number; now?: () => number; budgetMs?: number }
export type SearchResult = { move: number | null; score: number; depth: number; exact: boolean; nodes: number }

/** Pure deterministic search. A worker may inject a monotonic clock for timed iterative deepening. */
export function chooseMove(input: Board, side: Side, skill: Skill, options: SearchOptions = {}): SearchResult {
  const board = input.slice()
  const rootMoves = legalMoves(board, side)
  const empty = counts(board).empty
  if (skill === 'beginner') {
    let max = 0
    const best: number[] = []
    for (const move of rootMoves) {
      const n = collect(board, move, side)
      if (n > max) { max = n; best.length = 0 }
      if (n === max) best.push(move)
    }
    // A fresh deterministic Mulberry32 draw for each move, not a fixed per-game tie index.
    let random = ((options.seed ?? 0) ^ (empty << 8) ^ side) + 0x6d2b79f5 | 0
    random = Math.imul(random ^ random >>> 15, random | 1)
    random ^= random + Math.imul(random ^ random >>> 7, random | 61)
    const fraction = ((random ^ random >>> 14) >>> 0) / 4294967296
    return { move: best.length ? best[Math.floor(fraction * best.length)] : null,
      score: max, depth: 1, exact: false, nodes: rootMoves.length }
  }
  const exact = skill === 'master' && empty <= 12
  rootMoves.sort((a, b) => WEIGHTS[b] - WEIGHTS[a])
  const moves = Array.from({ length: 130 }, () => new Uint8Array(64))
  const flips = Array.from({ length: 130 }, () => new Uint8Array(64))
  let nodes = 0
  let timed = false
  const now = options.now
  const started = now?.() ?? 0
  const deadline = started + (options.budgetMs ?? 1000)
  const timeout = Symbol()

  function evaluate(player: Side): number {
    let value = 0
    let mobility = 0
    for (let i = 0; i < 64; i++) {
      value += board[i] * WEIGHTS[i]
      if (skill !== 'novice' && !board[i]) mobility += Number(collect(board, i, 1) > 0) - Number(collect(board, i, -1) > 0)
    }
    return player * (value + mobility * 12)
  }

  function search(player: Side, depth: number, alpha: number, beta: number, ply: number, passed: boolean): number {
    nodes++
    if (timed && (nodes & 255) === 0 && now && now() >= deadline) throw timeout
    const list = moves[ply]
    let n = 0
    for (let i = 0; i < 64; i++) if (collect(board, i, player)) {
      let j = n
      while (j > 0 && WEIGHTS[list[j - 1]] < WEIGHTS[i]) { list[j] = list[j - 1]; j-- }
      list[j] = i
      n++
    }
    if (!n) {
      if (!passed) return -search(-player as Side, depth, -beta, -alpha, ply + 1, true)
      let diff = 0
      for (let i = 0; i < 64; i++) diff += board[i] * player
      return exact ? diff : Math.sign(diff) * 100000 + diff
    }
    if (depth === 0) return evaluate(player)
    let best = -Infinity
    const captured = flips[ply]
    for (let i = 0; i < n; i++) {
      const square = list[i]
      const count = collect(board, square, player, captured)
      board[square] = player
      for (let j = 0; j < count; j++) board[captured[j]] = player
      let value: number
      try { value = -search(-player as Side, depth - 1, -beta, -alpha, ply + 1, false) }
      finally {
        board[square] = 0
        for (let j = 0; j < count; j++) board[captured[j]] = -player
      }
      best = Math.max(best, value)
      alpha = Math.max(alpha, value)
      if (alpha >= beta) break
    }
    return best
  }

  let result: SearchResult = { move: rootMoves[0] ?? null, score: 0, depth: 0, exact, nodes: 0 }
  const minimum = exact ? empty : skill === 'novice' ? 2 : skill === 'expert' ? 4 : 6
  const maximum = skill === 'master' && !exact && now ? empty : minimum
  for (let depth = skill === 'master' && !exact && now ? 1 : minimum; depth <= maximum; depth++) {
    let best = -Infinity
    let bestMove: number | null = null
    timed = !exact && depth > minimum
    try {
      if (!rootMoves.length) best = search(side, depth, -Infinity, Infinity, 0, false)
      for (const square of rootMoves) {
        const captured = flips[0]
        const count = collect(board, square, side, captured)
        board[square] = side
        for (let j = 0; j < count; j++) board[captured[j]] = side
        let value: number
        try { value = -search(-side as Side, depth - 1, -Infinity, -best, 1, false) }
        finally {
          board[square] = 0
          for (let j = 0; j < count; j++) board[captured[j]] = -side
        }
        if (value > best) { best = value; bestMove = square }
      }
      result = { move: bestMove, score: best, depth, exact: exact || depth >= empty, nodes }
    } catch (error) {
      if (error !== timeout) throw error
      break
    }
    if (result.exact || !now || (depth >= minimum && now() >= deadline)) break
  }
  result.nodes = nodes
  return result
}
