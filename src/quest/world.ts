/** Overworld runtime: map loading, grid movement, NPCs, trainers, encounters, camera, rendering, transitions. */
import { audio } from './audio'
import { type BattleResult, battle } from './battle'
import { type Remy, makeRemy, randomRemyIdx, remyName, rng, species, statsOf } from './data'
import { drawRemyActor } from './gfx/remyactor'
import {
  buildMapLayers,
  drawActor,
  drawAmbient,
  drawAnimated,
  drawEmote,
  drawGrassRustle,
  drawItemBall,
  drawLedgeDust,
  drawShadow,
  drawTallGrassFront,
} from './gfx/world'
import { input } from './input'
import { MAPS, type MapDef, type NpcDef, RESERVED, type TrainerDef, finale, itemLine } from './maps'
import { startMenu } from './menus'
import { S, addItem, healParty, save } from './state'
import { type ActorLook, type Dir, type Emote, OBJ_SIZE, TILE } from './types'
import { banner, closeText, fade, flash, say, sleep, talk } from './ui'
import { present, view } from './view'

export interface Actor {
  id: string
  x: number
  y: number
  /** Pixel position (top-left of the tile it occupies/moves through). */
  px: number
  py: number
  dir: Dir
  look: ActorLook
  move: { fx: number; fy: number; tx: number; ty: number; t: number; dur: number; hop: boolean } | null
  step: number
  frame: number
  emote: { kind: Emote; t0: number } | null
  def?: NpcDef
  home?: { x: number; y: number }
  nextWander?: number
  /** Actual collection portrait; absent for the town's ordinary pixel-art residents. */
  idx?: number
  remy?: Remy
  expires?: number
}

const DV: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
const SOLID_GROUND = new Set(['~', 'T', '#', 'F', 'b', '^', 'W'])
const DIRECTIONS: Dir[] = ['up', 'down', 'left', 'right']

function mkActor(id: string, x: number, y: number, dir: Dir, look: ActorLook): Actor {
  return { id, x, y, px: x * TILE, py: y * TILE, dir, look, move: null, step: 0, frame: 0, emote: null }
}

/** The classic Remy: bald, white tee, jeans. */
const PLAYER_LOOK: ActorLook = { skin: '#f6d2b3', hair: 'bald', hairColor: '#3a2a1a', shirt: '#ffffff', pants: '#2f4f9a' }
export const player: Actor = mkActor('player', 0, 0, 'down', PLAYER_LOOK)
player.idx = 0
const follower = mkActor('follower', 0, 0, 'down', PLAYER_LOOK)
let lead: Remy | undefined
let followerHidden = false
let roamers: Actor[] = []
let pendingRoamer: Actor | undefined
const grassTiles: number[] = []
let roamerCount = 0
let nextSpawn = 0
const drawOrder: Actor[] = []
const byY = (a: Actor, b: Actor) => a.py - b.py

let map: MapDef
let layers: { below: HTMLCanvasElement; above: HTMLCanvasElement }
const layerCache = new Map<string, { below: HTMLCanvasElement; above: HTMLCanvasElement }>()
let npcs: Actor[] = []
/** footprint occupancy: key → 'solid' | door index */
let solidObj = new Set<number>()
let doorAt = new Map<number, number>()
let busy = 0
let clock = 0
let camX = 0
let camY = 0
let bumpT = 0
let grassSteps = 0
let turnHold = 0
let running = false
const effects: { kind: 'rustle' | 'dust'; x: number; y: number; t0: number }[] = []
let wipe: { t0: number; dur: number; style: 'wild' | 'trainer' | 'boss' } | null = null
const encounterRng = rng(Date.now() & 0xffffffff)

const key = (x: number, y: number) => y * 1024 + x

export const flag = (f: string) => {
  S.flags[f] = true
}

export function npc(id: string): Actor {
  const a = npcs.find((n) => n.id === id)
  if (!a) throw new Error(`npc ${id} not on map`)
  return a
}

function visibleNpc(d: NpcDef) {
  return !(d.hideIf && S.flags[d.hideIf]) && !(d.showIf && !S.flags[d.showIf])
}

function tileAt(x: number, y: number) {
  return map.grid[y]?.[x] ?? 'T'
}

function itemAt(x: number, y: number) {
  return map.items.find((i) => i.x === x && i.y === y && !S.flags[`i:${i.id}`])
}

function blocked(x: number, y: number, self?: Actor) {
  if (y < 0 || y >= map.grid.length || x < 0 || x >= map.grid[0].length) return true
  if (SOLID_GROUND.has(tileAt(x, y))) return true
  const k = key(x, y)
  if (solidObj.has(k)) return true
  if (itemAt(x, y)) return true
  for (const a of [player, ...npcs]) {
    if (a === self) continue
    if (a.x === x && a.y === y) return true
    if (a.move && a.move.tx === x && a.move.ty === y) return true
  }
  return false
}

// ─────────── Map loading ───────────

export function loadMap(id: string, x: number, y: number, dir: Dir) {
  map = MAPS[id]
  // Saves predating the occupation keep their earned access; no retroactive gym gate.
  if (S.flags.badge_mm || S.flags.rug || S.flags['t:cabald_escrow']) S.flags.cabald_city = true
  const w = map.grid[0].length
  for (const [i, row] of map.grid.entries()) if (row.length !== w) throw new Error(`${id} row ${i} is ${row.length} wide, expected ${w}`)
  let l = layerCache.get(id)
  if (!l) {
    l = buildMapLayers(map.grid, map.objects, map.theme)
    layerCache.set(id, l)
  }
  layers = l
  solidObj = new Set()
  doorAt = new Map()
  for (const o of map.objects) {
    const sz = OBJ_SIZE[o.kind]
    for (let dy = 0; dy < sz.h; dy++)
      for (let dx = 0; dx < sz.w; dx++) {
        if (sz.door && sz.door.x === dx && sz.door.y === dy) doorAt.set(key(o.x + dx, o.y + dy), 1)
        else solidObj.add(key(o.x + dx, o.y + dy))
      }
  }
  refreshNpcs()
  S.map = id
  placePlayer(x, y, dir)
  seedRoamers()
}

export function refreshNpcs() {
  npcs = map.npcs.filter(visibleNpc).map((d) => {
    const a = mkActor(d.id, d.x, d.y, d.dir, d.look)
    a.def = d
    a.idx = d.portrait ?? (d.trainer ? resolveTrainer(d.trainer).portrait : undefined)
    a.home = { x: d.x, y: d.y }
    a.nextWander = clock + 1 + Math.random() * 3
    return a
  })
}

function placePlayer(x: number, y: number, dir: Dir) {
  player.x = x
  player.y = y
  player.px = x * TILE
  player.py = y * TILE
  player.dir = dir
  player.move = null
  S.x = x
  S.y = y
  S.dir = dir
  resetFollower()
  snapCamera()
}

/** Fade-warp to another map (scripts use this for doors into interiors). */
export async function warpTo(to: string, x: number, y: number, dir: Dir) {
  await changeMap(to, x, y, dir)
}

async function changeMap(to: string, x: number, y: number, dir: Dir) {
  busy++
  audio.sfx('door')
  await fade(true, 220)
  const prev = map.id
  loadMap(to, x, y, dir)
  if (audio.current !== map.music) audio.play(map.music)
  render()
  save()
  await fade(false, 220)
  if (prev !== to) banner(map.name)
  busy--
}

// ─────────── Actor movement ───────────

function startMove(a: Actor, dir: Dir, dur: number) {
  const [dx, dy] = DV[dir]
  a.dir = dir
  const hop = a === player && dir === 'down' && tileAt(a.x, a.y + 1) === '^'
  const tx = a.x + dx * (hop ? 2 : 1)
  const ty = a.y + dy * (hop ? 2 : 1)
  a.move = { fx: a.x, fy: a.y, tx, ty, t: 0, dur: hop ? dur * 2.2 : dur, hop }
  a.step++
  if (a === player && !followerHidden) followPreviousTile(dur)
  if (hop) audio.sfx('ledge')
}

function canStep(a: Actor, dir: Dir) {
  const [dx, dy] = DV[dir]
  const nx = a.x + dx
  const ny = a.y + dy
  if (a === player && dir === 'down' && tileAt(nx, ny) === '^') return !blocked(nx, ny + 1, a)
  if (doorAt.has(key(nx, ny))) return a === player && dir === 'up'
  return !blocked(nx, ny, a)
}

/** Resolves when the actor finishes walking `n` tiles in `dir` (scripted). */
export async function walk(a: Actor, dir: Dir, n = 1, dur = 0.22) {
  if (busy) followerHidden = true
  for (let i = 0; i < n; i++) {
    startMove(a, dir, dur)
    while (a.move) await nextFrame()
  }
  a.frame = 0
}

/** Walk through waypoints with straight segments (x first, then y). */
export async function walkPath(a: Actor, ...points: [number, number][]) {
  for (const [x, y] of points) {
    while (a.x !== x) await walk(a, x > a.x ? 'right' : 'left')
    while (a.y !== y) await walk(a, y > a.y ? 'down' : 'up')
  }
}

export function face(a: Actor, dir: Dir) {
  a.dir = dir
}

export async function emote(a: Actor, kind: Emote, ms = 700) {
  a.emote = { kind, t0: clock }
  await sleep(ms)
  a.emote = null
}

let frameWaiters: (() => void)[] = []
const nextFrame = () => new Promise<void>((r) => frameWaiters.push(r))

function updateActor(a: Actor, dt: number) {
  const m = a.move
  if (!m) return
  m.t = Math.min(1, m.t + dt / m.dur)
  a.px = (m.fx + (m.tx - m.fx) * m.t) * TILE
  a.py = (m.fy + (m.ty - m.fy) * m.t) * TILE
  // Step foot for the first half of each tile, alternating feet.
  a.frame = m.t < 0.5 ? (a.step % 2 ? 1 : 3) : 0
  if (m.t >= 1) {
    a.x = m.tx
    a.y = m.ty
    a.px = a.x * TILE
    a.py = a.y * TILE
    a.move = null
    a.frame = 0
    if (m.hop) effects.push({ kind: 'dust', x: a.x, y: a.y, t0: clock })
    if (tileAt(a.x, a.y) === '"') effects.push({ kind: 'rustle', x: a.x, y: a.y, t0: clock })
    if (a === player) arrived()
  }
}

// ─────────── Player ───────────

function arrived() {
  S.x = player.x
  S.y = player.y
  S.dir = player.dir
  const k = key(player.x, player.y)
  if (doorAt.has(k)) return void run(() => enterDoor(player.x, player.y))
  const warp = map.warps.find((w) => w.x === player.x && w.y === player.y)
  if (warp) return void run(() => changeMap(warp.to, warp.tx, warp.ty, warp.dir))
  const trig = map.triggers.find((t) => t.x === player.x && t.y === player.y)
  if (trig) {
    void run(async () => {
      await trig.run()
    })
    return
  }
  if (checkTrainers()) return
  if (checkRoamers()) return
  if (tileAt(player.x, player.y) === '"' && map.encounters && S.party.length) {
    grassSteps++
    if (grassSteps > 2 && encounterRng() < map.encounters.rate / 2) {
      grassSteps = 0
      void run(() => wildEncounter())
    }
  }
}

async function enterDoor(x: number, y: number) {
  const d = map.doors.find((dd) => dd.x === x && dd.y === y)
  audio.sfx('door')
  await fade(true, 200)
  placePlayer(x, y + 1, 'down')
  render()
  await fade(false, 200)
  if (d) await d.run()
  closeText()
}

function playerUpdate(dt: number) {
  if (busy || input.focused || player.move) return
  const d = input.dir()
  running = input.held('b')
  if (!d) {
    turnHold = 0
    player.frame = 0
    return
  }
  if (d !== player.dir && turnHold === 0) {
    // Tap to turn in place, hold to walk.
    player.dir = d
    turnHold = 0.09
    return
  }
  if (turnHold > 0) {
    turnHold -= dt
    if (turnHold > 0) return
  }
  turnHold = -1
  if (canStep(player, d)) {
    startMove(player, d, running ? 0.12 : 0.21)
    if (!running) audio.sfx('step')
    bumpT = 0
  } else {
    player.dir = d
    player.frame = Math.floor(clock * 4) % 2 ? 1 : 3
    if (clock - bumpT > 0.4) {
      audio.sfx('bump')
      bumpT = clock
    }
  }
}

function onPress(b: string) {
  if (busy || input.focused || player.move) return
  if (b === 'a') interact()
  else if (b === 'start') void run(() => startMenu())
}

function interact() {
  const [dx, dy] = DV[player.dir]
  const tx = player.x + dx
  const ty = player.y + dy
  const a = npcs.find((n) => n.x === tx && n.y === ty && !n.move)
  if (a?.def) return void run(() => talkTo(a))
  if (lead && !followerHidden && !follower.move && follower.x === tx && follower.y === ty)
    return void run(talkToFollower)
  const item = itemAt(tx, ty)
  if (item)
    return void run(async () => {
      flag(`i:${item.id}`)
      addItem(item.item, item.n)
      audio.jingle('item')
      await say(itemLine(item.item, item.n))
      save()
    })
  const sign = map.signs.find((s) => s.x === tx && s.y === ty)
  if (sign) return void run(() => talk(sign.text))
  const it = map.interacts?.find((s) => s.x === tx && s.y === ty)
  if (it) return void run(it.run)
}

async function talkTo(a: Actor) {
  const d = a.def as NpcDef
  face(a, OPP[player.dir])
  const tr = d.trainer ? resolveTrainer(d.trainer) : undefined
  if (tr && !S.flags[`t:${d.id}`]) {
    await trainerEncounter(a, tr)
    return
  }
  if (tr) await talk(tr.after.length ? tr.after : [tr.lose], { speaker: `${tr.title} ${tr.name}`, portrait: tr.portrait })
  else if (typeof d.talk === 'function') await d.talk(a)
  else if (d.talk) await talk(d.talk, d.name ? { speaker: d.name, portrait: d.portrait } : {})
  closeText()
}

const resolveTrainer = (t: TrainerDef | (() => TrainerDef)) => (typeof t === 'function' ? t() : t)

/** Runs a script with the world paused; always closes the text box after. */
export async function run(fn: () => Promise<unknown>) {
  busy++
  input.releaseAll()
  try {
    await fn()
  } finally {
    closeText()
    busy--
    if (!busy && followerHidden) {
      followerHidden = false
      resetFollower()
    }
  }
}

// ─────────── Trainers ───────────

function checkTrainers() {
  for (const a of npcs) {
    const d = a.def
    if (!d?.trainer || S.flags[`t:${d.id}`]) continue
    const tr = resolveTrainer(d.trainer)
    if (!tr.sight) continue
    const [dx, dy] = DV[a.dir]
    for (let i = 1; i <= tr.sight; i++) {
      const x = a.x + dx * i
      const y = a.y + dy * i
      if (player.x === x && player.y === y) {
        void run(() => spotted(a, tr))
        return true
      }
      if (SOLID_GROUND.has(tileAt(x, y)) || solidObj.has(key(x, y))) break
    }
  }
  return false
}

async function spotted(a: Actor, tr: TrainerDef) {
  audio.sfx('alert')
  await emote(a, 'alert', 650)
  // Walk up until adjacent.
  while (Math.abs(a.x - player.x) + Math.abs(a.y - player.y) > 1) await walk(a, a.dir)
  face(player, OPP[a.dir])
  await trainerEncounter(a, tr)
}

async function trainerEncounter(a: Actor, tr: TrainerDef) {
  const id = a.def?.id ?? a.id
  // All but the last intro line play in the overworld; the last one is said as the trainer slides in.
  if (tr.intro.length > 1) await talk(tr.intro.slice(0, -1), { speaker: `${tr.title} ${tr.name}`, portrait: tr.portrait })
  closeText()
  const res = await trainerBattle(tr, id)
  if (res === 'win') await a.def?.onWin?.()
  if (res === 'win' && id === 'rug') await finale()
}

/** Full trainer battle incl. transition, music restore and blackout. */
export async function trainerBattle(tr: TrainerDef, id: string, opts: { noBlackout?: boolean } = {}): Promise<BattleResult> {
  const style = tr.music === 'boss' ? 'boss' : 'trainer'
  await battleTransition(style)
  const foes: Remy[] = tr.party.map(([idx, lv]) => makeRemy(idx, lv))
  const res = await battle({
    kind: 'trainer',
    foes,
    trainer: { name: tr.name, title: tr.title, portrait: tr.portrait, intro: tr.intro[tr.intro.length - 1], lose: tr.lose, prize: tr.prize },
    bg: tr.bg ?? map.theme,
    music: tr.music,
  })
  if (res === 'win') flag(`t:${id}`)
  await afterBattle(res, opts.noBlackout)
  return res
}

export async function wildBattle(r: Remy, bg = map.theme): Promise<BattleResult> {
  await battleTransition('wild')
  const res = await battle({ kind: 'wild', foes: [r], bg })
  await afterBattle(res)
  return res
}

async function wildEncounter() {
  const e = map.encounters
  if (!e) return
  const idx = randomRemyIdx(encounterRng, e.weights, RESERVED)
  const lv = e.levels[0] + Math.floor(encounterRng() * (e.levels[1] - e.levels[0] + 1))
  const gold = encounterRng() < 1 / 40
  await wildBattle(makeRemy(idx, lv, gold))
}

async function afterBattle(res: BattleResult, noBlackout = false) {
  if (res === 'lose') {
    if (noBlackout) healParty()
    else return blackout()
  }
  grassSteps = 0
  render()
  audio.play(map.music)
  await fade(false, 300)
  save()
}

export async function blackout() {
  await fade(true, 10)
  const lost = Math.floor(S.money / 2)
  S.money -= lost
  healParty()
  const r = S.respawn
  loadMap(r.map, r.x, r.y, 'down')
  render()
  audio.play(map.music)
  await fade(false, 500)
  await talk([
    lost ? `Back to safety!\nYou dropped ${lost.toLocaleString()} $REMY.` : 'Back to safety!\nNot a single $REMY lost.',
    'Your Remys are fully healed.\nTake a breath. Try a new plan!',
  ])
  save()
}

// ─────────── Transitions ───────────

async function battleTransition(style: 'wild' | 'trainer' | 'boss') {
  audio.sfx('encounter')
  audio.play(style === 'wild' ? 'battle' : style === 'boss' ? 'boss' : 'trainer')
  await flash(2, 70)
  wipe = { t0: clock, dur: style === 'boss' ? 0.9 : 0.6, style }
  await sleep(wipe.dur * 1000 + 60)
  wipe = null
  await fade(true, 1)
}

function drawWipe(ctx: CanvasRenderingContext2D) {
  if (!wipe) return
  const p = Math.min(1, (clock - wipe.t0) / wipe.dur)
  const { W, H } = view
  if (wipe.style === 'wild') {
    // Pixel-block spiral closing in.
    const B = 12
    const cols = Math.ceil(W / B)
    const rowsN = Math.ceil(H / B)
    const total = cols * rowsN
    const n = Math.floor(total * p)
    ctx.fillStyle = '#05060f'
    let x0 = 0
    let y0 = 0
    let x1 = cols - 1
    let y1 = rowsN - 1
    let drawn = 0
    while (drawn < n && x0 <= x1 && y0 <= y1) {
      for (let x = x0; x <= x1 && drawn < n; x++, drawn++) ctx.fillRect(x * B, y0 * B, B, B)
      y0++
      for (let y = y0; y <= y1 && drawn < n; y++, drawn++) ctx.fillRect(x1 * B, y * B, B, B)
      x1--
      for (let x = x1; x >= x0 && drawn < n; x--, drawn++) ctx.fillRect(x * B, y1 * B, B, B)
      y1--
      for (let y = y1; y >= y0 && drawn < n; y--, drawn++) ctx.fillRect(x0 * B, y * B, B, B)
      x0++
    }
  } else {
    // Interleaved bars sweeping in from both sides; the boss gets a blood-red edge.
    const bars = 10
    const bh = Math.ceil(H / bars)
    for (let i = 0; i < bars; i++) {
      const w = Math.ceil(W * Math.min(1, p * 1.25 - (i % 2) * 0.12))
      if (w <= 0) continue
      const x = i % 2 ? W - w : 0
      if (wipe.style === 'boss') {
        ctx.fillStyle = '#b3123a'
        ctx.fillRect(i % 2 ? x - 3 : x + w, i * bh, 3, bh)
      }
      ctx.fillStyle = '#05060f'
      ctx.fillRect(x, i * bh, w, bh)
    }
  }
}

// ─────────── Traveling companion + visible wild encounters ───────────

function syncFollower() {
  let next: Remy | undefined
  for (const r of S.party) {
    if (r.hp > 0) {
      next = r
      break
    }
  }
  if (lead === next) return
  const needsPlace = !lead && !!next
  lead = next
  follower.idx = next?.idx
  if (needsPlace && map) resetFollower()
}

function resetFollower() {
  syncFollower()
  const [dx, dy] = DV[OPP[player.dir]]
  const x = player.x + dx
  const y = player.y + dy
  const behind = !blocked(x, y, follower) && !doorAt.has(key(x, y))
  follower.x = behind ? x : player.x
  follower.y = behind ? y : player.y
  follower.px = follower.x * TILE
  follower.py = follower.y * TILE
  follower.dir = player.dir
  follower.move = null
  follower.frame = 0
}

function followPreviousTile(dur: number) {
  if (!lead || (follower.x === player.x && follower.y === player.y)) return
  // The previous player tile is always a valid path, including a two-tile ledge crossing.
  const dx = player.x - follower.x
  const dy = player.y - follower.y
  follower.dir = dx ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
  const hop = Math.abs(dx) + Math.abs(dy) > 1
  follower.move = {
    fx: follower.x, fy: follower.y, tx: player.x, ty: player.y, t: 0, dur, hop,
  }
  follower.step++
}

type FollowerChatter = readonly [Emote, string]
const FOLLOWER_CHATTER: Record<string, readonly FollowerChatter[]> = {
  tired: [
    ['dots', 'Leans on your leg.\nA little Hopium would help.'],
    ['heart', 'Still has your back.\nCould use a healing stop, though.'],
    ['dots', 'Tries to look brave.\nIts tiny knees disagree.'],
  ],
  town: [
    ['heart', 'Home on Base.\nEven the breeze feels blue.'],
    ['note', 'Spots another builder.\nOffers to supervise the snacks.'],
    ['heart', 'Practices its "stay based" nod.\nGetting pretty good at it.'],
    ['note', 'Soaks up the onchain summer.\nNo sunscreen. Mostly bald.'],
  ],
  city: [
    ['question', 'Studies the Exchange ticker.\nStill no snack symbol.'],
    ['note', 'Tries a mainnet greeting.\nA very tiny "ser."'],
    ['dots', 'Markets never sleep?\nThis Remy certainly does.'],
    ['heart', 'All these chains. All these faces.\nStill picks you out of the crowd.'],
  ],
  bridge: [
    ['note', 'Bows to a mainnet traveler.\nVery formal. Very tiny.'],
    ['alert', 'Waves to the Solana crowd.\nThey have already waved back.'],
    ['question', 'Heard about tokenized stocks.\nAsks if the snack cart has any.'],
    ['heart', 'Checks the sign for Genesis.\nHome is worth bookmarking.'],
  ],
  gallery: [
    ['alert', 'Looks for its own portrait.\nPractices a museum-worthy pose.'],
    ['question', 'Tilts its head at the artwork.\nThe artwork tilts back.'],
    ['heart', 'Sits very still by a frame.\nA living masterpiece.'],
    ['note', 'Admires the brushwork.\nResists licking the frame.'],
  ],
  canyon: [
    ['alert', 'Checks the path for loose rugs.\nAnd, more usefully, loose rocks.'],
    ['heart', 'Takes one brave step closer.\nYou are not doing this alone.'],
    ['dots', 'Hears an echo from the tower.\nDoes not love its tone.'],
    ['alert', 'Keeps watch across the canyon.\nNo chain gets left behind.'],
  ],
  meadow: [
    ['note', 'Chirps to the wild Remys.\nThe grass chirps back.'],
    ['alert', 'Races a Solana-bound traveler.\nWins at stopping for flowers.'],
    ['question', 'Finds a shiny pebble.\nNo whitepaper. Just shiny.'],
    ['heart', 'Tucks a leaf behind your ear.\nAdventure outfit: complete.'],
  ],
  WHALE: [
    ['note', 'Makes a very grand entrance.\nInto a very small puddle.'],
    ['heart', 'Offers some whale wisdom.\nIt sounds like a happy squeak.'],
    ['question', 'Inspects your snack supply.\nSuggests a larger reserve.'],
  ],
  BEAR: [
    ['heart', 'Checks behind you.\nBearish on danger. Bullish on you.'],
    ['dots', 'Plans for every possible risk.\nExcept running out of hugs.'],
    ['note', 'Finds a shady resting spot.\nExcellent bear-market research.'],
  ],
  DEGEN: [
    ['alert', 'Finds a suspicious pebble.\nGoes all in on carrying it.'],
    ['note', 'Has a bold new strategy.\nRun in circles. Look confident.'],
    ['heart', 'Could chase any shiny thing.\nChooses to stick with you.'],
  ],
  BULL: [
    ['heart', 'Bounces on its tiny shoes.\nReady when you are!'],
    ['alert', 'Charges toward tomorrow.\nWaits for you after two steps.'],
    ['note', 'Sees a long road ahead.\nCalls it room for adventure.'],
  ],
}
let lastFollowerLine = ''

async function talkToFollower() {
  const r = lead
  if (!r) return
  follower.dir = OPP[player.dir]
  const tired = r.hp <= statsOf(r).hp / 3
  const context = tired ? 'tired'
    : map.id === 'bridge' ? 'bridge'
    : tileAt(follower.x, follower.y) === '"' ? 'meadow'
    : map.theme
  const personal = FOLLOWER_CHATTER[species(r.idx).type]
  const lines = !tired && Math.random() < 0.25 ? personal : FOLLOWER_CHATTER[context] ?? personal
  const previous = lines.findIndex(([, text]) => text === lastFollowerLine)
  let index = Math.floor(Math.random() * (lines.length - (previous >= 0 ? 1 : 0)))
  if (previous >= 0 && index >= previous) index++
  const [mood, line] = lines[index]
  lastFollowerLine = line
  audio.cry(r.idx, tired ? 0.8 : 1.15)
  follower.emote = { kind: mood, t0: clock }
  try {
    await say(line, { speaker: remyName(r), portrait: r.idx })
  } finally {
    follower.emote = null
  }
}

function seedRoamers() {
  roamers = []
  pendingRoamer = undefined
  grassTiles.length = 0
  if (map.encounters) {
    for (let y = 0; y < map.grid.length; y++)
      for (let x = 0; x < map.grid[y].length; x++)
        if (tileAt(x, y) === '"' && !solidObj.has(key(x, y))) grassTiles.push(key(x, y))
  }
  roamerCount = grassTiles.length ? Math.min(4, Math.max(2, Math.floor(grassTiles.length / 45))) : 0
  for (let i = 0; i < roamerCount; i++) spawnRoamer()
  nextSpawn = clock + 6
}

function spawnRoamer() {
  const e = map.encounters
  if (!e || !grassTiles.length) return
  for (let attempt = 0; attempt < 80; attempt++) {
    const k = grassTiles[Math.floor(encounterRng() * grassTiles.length)]
    const x = k % 1024
    const y = Math.floor(k / 1024)
    const distance = Math.abs(player.x - x) + Math.abs(player.y - y)
    // Prefer nearby patches so each route feels alive, but never materialize under the player.
    if (distance < 3 || (attempt < 50 && distance > 12) || blocked(x, y)) continue
    if (roamers.some((a) => a.x === x && a.y === y)) continue
    let idx = randomRemyIdx(encounterRng, e.weights, RESERVED)
    while (RESERVED.has(idx)) idx = randomRemyIdx(encounterRng, e.weights, RESERVED)
    const lv = e.levels[0] + Math.floor(encounterRng() * (e.levels[1] - e.levels[0] + 1))
    const a = mkActor(`wild:${idx}`, x, y, 'down', PLAYER_LOOK)
    a.idx = idx
    a.remy = makeRemy(idx, lv, encounterRng() < 1 / 40)
    a.nextWander = clock + 1 + encounterRng() * 2
    a.expires = clock + 35 + encounterRng() * 25
    roamers.push(a)
    return
  }
}

function checkRoamers() {
  if (busy || input.focused || !lead) return false
  for (let i = 0; i < roamers.length; i++) {
    const a = roamers[i]
    if (player.move?.hop) continue
    if (a !== pendingRoamer && Math.abs(a.px - player.px) + Math.abs(a.py - player.py) > 10) continue
    if (player.move) {
      pendingRoamer = a
      return false
    }
    const r = a.remy
    if (!r) continue
    roamers.splice(i, 1)
    pendingRoamer = undefined
    nextSpawn = clock + 8
    void run(() => wildBattle(r))
    return true
  }
  return false
}

function updateRoamers(dt: number) {
  if (busy || input.focused) return
  for (let i = roamers.length - 1; i >= 0; i--) {
    const a = roamers[i]
    if (a === pendingRoamer) continue
    if (!a.move && clock > (a.expires ?? 0) && Math.abs(a.x - player.x) + Math.abs(a.y - player.y) > 7) {
      roamers.splice(i, 1)
      continue
    }
    if (!a.move && clock >= (a.nextWander ?? 0)) {
      a.nextWander = clock + 1.4 + encounterRng() * 3
      const dir = DIRECTIONS[Math.floor(encounterRng() * 4)]
      const [dx, dy] = DV[dir]
      const x = a.x + dx
      const y = a.y + dy
      a.dir = dir
      // Ignore the player for occupancy: a wild Remy can wander into you, never through an NPC.
      if (tileAt(x, y) === '"' && !blocked(x, y, player)
        && !roamers.some((r) => r !== a && ((r.x === x && r.y === y) || (r.move?.tx === x && r.move.ty === y)))) {
        startMove(a, dir, 0.38)
      }
    }
    updateActor(a, dt)
  }
  if (checkRoamers()) return
  if (roamers.length < roamerCount && clock >= nextSpawn) {
    spawnRoamer()
    nextSpawn = clock + 6
  }
}

// ─────────── NPC idle ───────────
function npcIdle(a: Actor) {
  if (!a.def?.wander || a.move || busy || (a.nextWander ?? 0) > clock) return
  a.nextWander = clock + 1.5 + Math.random() * 3
  const d = DIRECTIONS[Math.floor(Math.random() * 4)]
  const [dx, dy] = DV[d]
  const home = a.home ?? a
  const nx = a.x + dx
  const ny = a.y + dy
  if (Math.random() < 0.55 && Math.abs(nx - home.x) <= 2 && Math.abs(ny - home.y) <= 2 && !blocked(nx, ny, a) && !doorAt.has(key(nx, ny)) && tileAt(nx, ny) !== '"') {
    startMove(a, d, 0.28)
  } else a.dir = d
}

// ─────────── Camera + render ───────────

function snapCamera() {
  const mw = map.grid[0].length * TILE
  const mh = map.grid.length * TILE
  const cx = player.px + TILE / 2 - view.W / 2
  const cy = player.py + TILE / 2 - view.H / 2 - 4
  camX = mw <= view.W ? (mw - view.W) / 2 : Math.max(0, Math.min(mw - view.W, cx))
  camY = mh <= view.H ? (mh - view.H) / 2 : Math.max(0, Math.min(mh - view.H, cy))
}

export function render() {
  const ctx = view.ctx
  const { W, H } = view
  snapCamera()
  const cx = Math.round(camX)
  const cy = Math.round(camY)
  ctx.fillStyle = map.theme === 'canyon' ? '#2a1410' : '#0e2a12'
  ctx.fillRect(0, 0, W, H)
  ctx.drawImage(layers.below, -cx, -cy)
  drawAnimated(ctx, map.grid, map.objects, map.theme, cx, cy, W, H, clock)
  for (const it of map.items) {
    if (S.flags[`i:${it.id}`]) continue
    const x = it.x * TILE - cx
    const y = it.y * TILE - cy
    if (x > -TILE && y > -TILE && x < W && y < H) drawItemBall(ctx, x, y, clock)
  }
  drawOrder.length = 0
  for (const a of npcs) drawOrder.push(a)
  for (const a of roamers) drawOrder.push(a)
  if (lead && !followerHidden && (follower.px !== player.px || follower.py !== player.py)) drawOrder.push(follower)
  drawOrder.push(player)
  drawOrder.sort(byY)
  const actors = drawOrder
  for (const a of actors) {
    const x = Math.round(a.px) - cx
    const y = Math.round(a.py) - cy
    if (x < -TILE * 2 || y < -TILE * 3 || x > W + TILE || y > H + TILE) continue
    const hopY = a.move?.hop ? Math.round(-Math.sin(Math.PI * a.move.t) * 10) : 0
    drawShadow(ctx, x, y)
    if (a.idx !== undefined) drawRemyActor(ctx, a.idx, a.dir, a.frame, x, y + hopY, a.def?.outfit)
    else drawActor(ctx, a.look, a.dir, a.frame, x, y + hopY)
    if ((a.remy?.gold || (a === follower && lead?.gold)) && Math.floor(clock * 5) % 4 < 2) {
      const sx = x + (Math.floor(clock * 2) % 2 ? 15 : 0)
      const sy = y - 5 + hopY
      ctx.fillStyle = '#fff2a0'
      ctx.fillRect(sx - 2, sy, 5, 1)
      ctx.fillRect(sx, sy - 2, 1, 5)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(sx, sy, 1, 1)
    }
    const onGrass = !a.move ? tileAt(a.x, a.y) === '"' : a.move.t > 0.5 && tileAt(a.move.tx, a.move.ty) === '"'
    if (onGrass && !a.move?.hop) drawTallGrassFront(ctx, x, y, clock)
  }
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i]
    const t = clock - e.t0
    if (t > 0.4) {
      effects.splice(i, 1)
      continue
    }
    if (e.kind === 'rustle') drawGrassRustle(ctx, e.x * TILE - cx, e.y * TILE - cy, t)
    else drawLedgeDust(ctx, e.x * TILE - cx, e.y * TILE - cy, t)
  }
  ctx.drawImage(layers.above, -cx, -cy)
  for (const a of actors) {
    if (!a.emote) continue
    drawEmote(ctx, a.emote.kind, Math.round(a.px) - cx, Math.round(a.py) - cy, clock - a.emote.t0)
  }
  drawAmbient(ctx, map.theme, W, H, cx, cy, clock)
  drawWipe(ctx)
  present()
}

// ─────────── Loop ───────────

let last = 0
let started = false

function frame(now: number) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.05, (now - last) / 1000 || 0)
  last = now
  clock += dt
  if (!document.hidden) S.playMs += dt * 1000
  syncFollower()
  playerUpdate(dt)
  updateActor(player, dt)
  updateActor(follower, dt)
  updateRoamers(dt)
  for (const a of npcs) {
    npcIdle(a)
    updateActor(a, dt)
  }
  const waiters = frameWaiters
  frameWaiters = []
  for (const w of waiters) w()
  if (map) render()
}

export function startWorld() {
  if (started) return
  started = true
  input.onAny(onPress)
  view.listeners.push(() => map && render())
  requestAnimationFrame((t) => {
    last = t
    frame(t)
  })
}

/** Enter the world from a save (title → continue, or after the intro). */
export async function enterWorld() {
  loadMap(S.map, S.x, S.y, S.dir)
  startWorld()
  render()
  audio.play(map.music)
  await fade(false, 500)
  banner(map.name)
}
