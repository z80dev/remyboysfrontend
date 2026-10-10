import { chooseMove, type Board, type Side, type Skill } from './engine'

export type SearchRequest = { id: number; board: Board; side: Side; skill: Skill; seed: number }
self.onmessage = (event: MessageEvent<SearchRequest>) => {
  const { id, board, side, skill, seed } = event.data
  const result = chooseMove(board, side, skill, { seed, now: () => performance.now(), budgetMs: 1000 })
  self.postMessage({ id, ...result })
}
