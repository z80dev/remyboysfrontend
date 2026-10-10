/** Window layout of the three Winamp windows: positions (skin px, relative to the app origin), docking and persistence. */

export type WinId = 'main' | 'eq' | 'pl'
export type VisMode = 'bars' | 'osc' | 'off'
export type Point = { x: number; y: number }
export type Box = { x: number; y: number; w: number; h: number }

export type Layout = {
  pos: Record<WinId, Point>
  open: Record<WinId, boolean>
  shade: Record<WinId, boolean>
  /** Playlist size in extra 25×29 segments beyond 275×116. */
  plSize: [number, number]
  double: boolean
  vis: VisMode
  remaining: boolean
  alwaysOnTop: boolean
}

export const WIN_IDS: readonly WinId[] = ['main', 'eq', 'pl']
export const SNAP = 10
const KEY = 'remyamp.layout.v1'

export const DEFAULT_LAYOUT: Layout = {
  pos: { main: { x: 0, y: 0 }, eq: { x: 0, y: 116 }, pl: { x: 0, y: 232 } },
  open: { main: true, eq: true, pl: true },
  shade: { main: false, eq: false, pl: false },
  plSize: [0, 4],
  double: false,
  vis: 'bars',
  remaining: false,
  alwaysOnTop: false,
}

export function loadLayout(): Layout {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Layout> | null
    if (!saved) return DEFAULT_LAYOUT
    return {
      ...DEFAULT_LAYOUT,
      ...saved,
      pos: { ...DEFAULT_LAYOUT.pos, ...saved.pos },
      open: { ...DEFAULT_LAYOUT.open, ...saved.open },
      shade: { ...DEFAULT_LAYOUT.shade, ...saved.shade },
    }
  } catch {
    return DEFAULT_LAYOUT
  }
}

export function saveLayout(l: Layout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(l))
  } catch {
    // Storage full or blocked: the layout just doesn't persist.
  }
}

export function winSize(l: Layout, id: WinId): [number, number] {
  if (id === 'pl') return [275 + 25 * l.plSize[0], l.shade.pl ? 14 : 116 + 29 * l.plSize[1]]
  return [275, l.shade[id] ? 14 : 116]
}

export function winBox(l: Layout, id: WinId): Box {
  const [w, h] = winSize(l, id)
  return { ...l.pos[id], w, h }
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1

/** Edge-to-edge contact (Winamp docking). */
export function touching(a: Box, b: Box): boolean {
  const vx = overlaps(a.y, a.y + a.h, b.y, b.y + b.h)
  const hx = overlaps(a.x, a.x + a.w, b.x, b.x + b.w)
  return (vx && (a.x + a.w === b.x || b.x + b.w === a.x)) || (hx && (a.y + a.h === b.y || b.y + b.h === a.y))
}

/** Windows docked (transitively) to `id`, including it. */
export function dockedGroup(l: Layout, id: WinId): WinId[] {
  const open = WIN_IDS.filter((w) => l.open[w])
  const group = [id]
  for (let i = 0; i < group.length; i++)
    for (const w of open) if (!group.includes(w) && touching(winBox(l, group[i]), winBox(l, w))) group.push(w)
  return group
}

/** Windows hanging (transitively) below `id`'s bottom edge: they follow it when its height changes. */
function hangingBelow(l: Layout, id: WinId): WinId[] {
  const out: WinId[] = []
  const queue = [id]
  while (queue.length) {
    const a = winBox(l, queue.shift() as WinId)
    for (const w of WIN_IDS) {
      if (!l.open[w] || w === id || out.includes(w)) continue
      const b = winBox(l, w)
      if (b.y === a.y + a.h && overlaps(a.x, a.x + a.w, b.x, b.x + b.w)) {
        out.push(w)
        queue.push(w)
      }
    }
  }
  return out
}

/** Applies a size change to `id` (shade, playlist resize) keeping windows docked below attached, as Winamp does. */
export function resize(l: Layout, id: WinId, change: (l: Layout) => Layout): Layout {
  const below = hangingBelow(l, id)
  const before = winSize(l, id)[1]
  const next = change(l)
  const dy = winSize(next, id)[1] - before
  if (!dy || !below.length) return next
  const pos = { ...next.pos }
  for (const w of below) pos[w] = { x: pos[w].x, y: pos[w].y + dy }
  return { ...next, pos }
}

/**
 * Moves `group` by (dx, dy) from `start`, snapping its edges to the other open windows and to `bounds`
 * (the visible area, app coordinates) within SNAP px, then keeps it inside `bounds`.
 */
export function moveGroup(start: Layout, group: WinId[], dx: number, dy: number, bounds: Box): Layout {
  const moving = group.map((w) => winBox(start, w))
  const others = WIN_IDS.filter((w) => start.open[w] && !group.includes(w)).map((w) => winBox(start, w))
  let bestX = SNAP + 1
  let bestY = SNAP + 1
  const tryX = (from: number, to: number) => {
    if (Math.abs(to - from) < Math.abs(bestX)) bestX = to - from
  }
  const tryY = (from: number, to: number) => {
    if (Math.abs(to - from) < Math.abs(bestY)) bestY = to - from
  }
  for (const m0 of moving) {
    const m = { ...m0, x: m0.x + dx, y: m0.y + dy }
    for (const o of others) {
      if (overlaps(m.y - SNAP, m.y + m.h + SNAP, o.y, o.y + o.h)) {
        tryX(m.x, o.x + o.w)
        tryX(m.x + m.w, o.x)
        tryX(m.x, o.x)
        tryX(m.x + m.w, o.x + o.w)
      }
      if (overlaps(m.x - SNAP, m.x + m.w + SNAP, o.x, o.x + o.w)) {
        tryY(m.y, o.y + o.h)
        tryY(m.y + m.h, o.y)
        tryY(m.y, o.y)
        tryY(m.y + m.h, o.y + o.h)
      }
    }
    tryX(m.x, bounds.x)
    tryX(m.x + m.w, bounds.x + bounds.w)
    tryY(m.y, bounds.y)
    tryY(m.y + m.h, bounds.y + bounds.h)
  }
  let nx = Math.round(dx + (Math.abs(bestX) <= SNAP ? bestX : 0))
  let ny = Math.round(dy + (Math.abs(bestY) <= SNAP ? bestY : 0))
  // Keep the whole group on screen (the top-left wins when it can't fit).
  const minX = Math.min(...moving.map((b) => b.x))
  const minY = Math.min(...moving.map((b) => b.y))
  const maxX = Math.max(...moving.map((b) => b.x + b.w))
  const maxY = Math.max(...moving.map((b) => b.y + b.h))
  nx -= Math.max(0, maxX + nx - (bounds.x + bounds.w))
  ny -= Math.max(0, maxY + ny - (bounds.y + bounds.h))
  nx += Math.max(0, bounds.x - (minX + nx))
  ny += Math.max(0, bounds.y - (minY + ny))
  const pos = { ...start.pos }
  for (const w of group) pos[w] = { x: start.pos[w].x + Math.round(nx), y: start.pos[w].y + Math.round(ny) }
  return { ...start, pos }
}

/** Shifts every window so the open ones are inside `bounds` (after double size or a smaller screen). */
export function fitInto(l: Layout, bounds: Box): Layout {
  const open = WIN_IDS.filter((w) => l.open[w])
  if (!open.length) return l
  return moveGroup(l, open, 0, 0, bounds)
}

/** Phone: the open windows stacked top to bottom at x = 0. */
export function stacked(l: Layout): Layout {
  let y = 0
  const pos = { ...l.pos }
  for (const w of WIN_IDS) {
    if (!l.open[w]) continue
    pos[w] = { x: 0, y }
    y += winSize({ ...l, plSize: [0, l.plSize[1]] }, w)[1]
  }
  return { ...l, pos, plSize: [0, l.plSize[1]], double: false }
}
