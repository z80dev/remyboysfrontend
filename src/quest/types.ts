/** Shared contract between the engine (maps/logic), world art (gfx/world.ts) and audio (audio.ts). */

/** World tile size in logical pixels. The engine renders to a low-res canvas and upscales by an integer factor. */
export const TILE = 16

export type Dir = 'down' | 'up' | 'left' | 'right'

/** Palette / mood of a map. Art and ambient effects key off this. */
export type Theme = 'town' | 'meadow' | 'city' | 'canyon' | 'gallery'

/**
 * Ground legend, one char per tile in `MapDef.grid`.
 *  .  grass                 ,  grass with flowers (walkable, animated flowers)
 *  "  tall grass (wild encounters, animated sway, covers the lower half of actors standing in it)
 *  :  dirt path             =  paved road / plaza tiles
 *  s  sand                  ~  water (animated, solid)
 *  w  wooden bridge (walkable, over water)
 *  d  rocky canyon floor (walkable)
 *  T  tree (solid; canopy may overhang the tile above via the `above` layer)
 *  #  cliff / rock wall (solid; autotiled faces)
 *  ^  ledge: solid except the player may hop DOWN (south) over it, landing 2 tiles below
 *  F  fence (solid)         b  small bush (solid)
 *  Interior ('gallery' theme):
 *  o  polished floor (walkable)   r  red carpet runner (walkable)
 *  W  interior wall (solid; paintings hang on it via `frame` objects)
 */
export type Ground = '.' | ',' | '"' | ':' | '=' | 's' | '~' | 'w' | 'd' | 'T' | '#' | '^' | 'F' | 'b' | 'o' | 'r' | 'W'

export type ObjKind =
  | 'house'
  | 'lab'
  | 'center'
  | 'mart'
  | 'exchange'
  | 'tower'
  | 'sign'
  | 'lamp'
  | 'atm'
  | 'server'
  | 'mailbox'
  | 'flowerpot'
  | 'rock'
  | 'crystal'
  | 'candle_green'
  | 'candle_red'
  | 'statue'
  | 'bench'
  | 'fountain'
  /** Framed Remy painting (uses MapObject.idx for the art). Hangs on a wall tile. */
  | 'frame'
  /** Outdoor billboard showing a Remy (MapObject.idx). */
  | 'billboard'
  /** Museum pedestal with a small Remy bust/hologram (MapObject.idx). */
  | 'pedestal'
  | 'terminal'
  | 'departure_board'
  | 'bridge_gate'
  | 'bag_scanner'
  /** Street / interior dressing. `sconce` hangs on a wall tile. */
  | 'planter'
  | 'vending'
  | 'bin'
  | 'hydrant'
  | 'cafe'
  | 'palm'
  | 'stanchion'
  | 'sconce'
  | 'crate'
  | 'barrel'

/**
 * Footprints in tiles. (x, y) of a MapObject is its top-left footprint tile. Every footprint tile is solid,
 * except `door` (relative), which is walkable and triggers the building's event when entered from below.
 * Art may overhang the footprint upward by up to 2 tiles (roofs, tall candles, lamp heads) via the `above` layer.
 */
export const OBJ_SIZE: Record<ObjKind, { w: number; h: number; door?: { x: number; y: number } }> = {
  house: { w: 4, h: 3, door: { x: 1, y: 2 } },
  lab: { w: 6, h: 4, door: { x: 2, y: 3 } },
  center: { w: 5, h: 4, door: { x: 2, y: 3 } },
  mart: { w: 4, h: 3, door: { x: 2, y: 2 } },
  exchange: { w: 7, h: 5, door: { x: 3, y: 4 } },
  tower: { w: 5, h: 6, door: { x: 2, y: 5 } },
  sign: { w: 1, h: 1 },
  lamp: { w: 1, h: 1 },
  atm: { w: 1, h: 1 },
  server: { w: 1, h: 1 },
  mailbox: { w: 1, h: 1 },
  flowerpot: { w: 1, h: 1 },
  rock: { w: 1, h: 1 },
  crystal: { w: 1, h: 1 },
  candle_green: { w: 1, h: 1 },
  candle_red: { w: 1, h: 1 },
  statue: { w: 1, h: 1 },
  bench: { w: 2, h: 1 },
  fountain: { w: 3, h: 3 },
  frame: { w: 1, h: 1 },
  billboard: { w: 3, h: 1 },
  pedestal: { w: 1, h: 1 },
  terminal: { w: 6, h: 4, door: { x: 2, y: 3 } },
  departure_board: { w: 8, h: 3 },
  bridge_gate: { w: 4, h: 2 },
  bag_scanner: { w: 2, h: 1 },
  planter: { w: 1, h: 1 },
  vending: { w: 1, h: 1 },
  bin: { w: 1, h: 1 },
  hydrant: { w: 1, h: 1 },
  cafe: { w: 1, h: 1 },
  palm: { w: 1, h: 1 },
  stanchion: { w: 1, h: 1 },
  sconce: { w: 1, h: 1 },
  crate: { w: 1, h: 1 },
  barrel: { w: 1, h: 1 },
}

export interface MapObject {
  kind: ObjKind
  x: number
  y: number
  /** Remy art index for art-bearing objects (frame, billboard, pedestal). */
  idx?: number
  /** Terminal gate palette and destination; never a logo or art index. */
  chain?: 'base' | 'mainnet' | 'solana' | 'robinhood'
}

/** Look of an overworld character (chibi, big head — Remy style: bald head, huge anime eyes, t-shirt). */
export interface ActorLook {
  skin: string // css hex
  hair: 'bald' | 'short' | 'spiky' | 'long' | 'cap' | 'beanie' | 'afro' | 'bun'
  hairColor: string
  shirt: string
  pants: string
  /** Optional accessory. `coat` = long lab coat over the shirt; `suit` = black suit + tie. */
  extra?: 'glasses' | 'shades' | 'chain' | 'coat' | 'suit'
}

/** Emote bubble drawn above an actor's head. */
export type Emote = 'alert' | 'question' | 'heart' | 'dots' | 'note'

/** `cabald` = the Cabald's sinister-comic battle march (grunt battles). `gallery` = THE FLOOR museum. */
export type Track =
  | 'title'
  | 'town'
  | 'route'
  | 'city'
  | 'canyon'
  | 'battle'
  | 'trainer'
  | 'boss'
  | 'victory'
  | 'ending'
  | 'cabald'
  | 'gallery'

export type Sfx =
  | 'cursor'
  | 'select'
  | 'back'
  | 'bump'
  | 'door'
  | 'step'
  | 'text'
  | 'hit'
  | 'hitWeak'
  | 'hitSuper'
  | 'crit'
  | 'faint'
  | 'throw'
  | 'shake'
  | 'catchFail'
  | 'escape'
  | 'statUp'
  | 'statDown'
  | 'heal'
  | 'alert'
  | 'encounter'
  | 'ledge'
  | 'save'
  | 'money'
  | 'error'

export type Jingle = 'heal' | 'catch' | 'levelup' | 'item' | 'badge'
