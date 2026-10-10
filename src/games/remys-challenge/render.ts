import { CAST, cabaldRemy, loadCabald, loadHeads, loadPalette, type RemyHeads, type RemyPalette } from '../kit'
import { PALETTE as P } from './creative-spec'
import { MAP_SIZE, Tile, type Actor, type Direction, type State } from './types'

export type ChallengeArt = {
  heads: RemyHeads | null
  player: number
  cabald: number
  nobody: number
  palette: RemyPalette | null
}

/** Load only shared head atlases and metadata. The UI owns the returned handle's lifetime. */
export async function loadChallengeArt(player: number, level: number): Promise<ChallengeArt> {
  const [heads, palette, bald, nobody] = await Promise.all([
    loadHeads().catch(() => null),
    loadPalette(player).catch(() => null),
    loadCabald().catch(() => [] as number[]),
    cabaldRemy(CAST.NOBODY).catch(() => -1)
  ])
  return { heads, palette, player, cabald: bald.length ? bald[((level * 2654435761) >>> 0) % bald.length] : -1, nobody }
}

const TILE_COUNT = Tile.IceSE + 1
const COLUMNS = 16
const rect = (c: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) => {
  c.fillStyle = color
  c.fillRect(x, y, w, h)
}

function bevel(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, inset = false) {
  rect(c, color, x, y, w, h)
  rect(c, inset ? P.wallLo : P.wallHi, x, y, w, 2)
  rect(c, inset ? P.wallLo : P.wallHi, x, y, 2, h)
  rect(c, inset ? P.wallHi : P.wallLo, x, y + h - 2, w, 2)
  rect(c, inset ? P.wallHi : P.wallLo, x + w - 2, y, 2, h)
}

function floor(c: CanvasRenderingContext2D) {
  rect(c, P.floor, 0, 0, 32, 32)
  rect(c, P.floorLine, 31, 0, 1, 32)
  rect(c, P.floorLine, 0, 31, 32, 1)
}

function shape(c: CanvasRenderingContext2D, n: number, x: number, y: number, color: string) {
  if (n === 0) {
    rect(c, color, x + 1, y, 4, 1)
    rect(c, color, x, y + 1, 6, 4)
    rect(c, color, x + 1, y + 5, 4, 1)
    rect(c, P.floor, x + 2, y + 2, 2, 2)
  } else if (n === 1) {
    for (let i = 0; i < 3; i++) rect(c, color, x + 2 - i, y + i, 2 + i * 2, 1)
    for (let i = 0; i < 3; i++) rect(c, color, x + i, y + 3 + i, 6 - i * 2, 1)
  } else if (n === 2) {
    for (let i = 0; i < 6; i++) rect(c, color, x + 3 - Math.floor(i / 2), y + i, 1 + Math.floor(i / 2) * 2, 1)
  } else rect(c, color, x, y, 6, 6)
}

function arrow(c: CanvasRenderingContext2D, y: number) {
  for (let i = 0; i < 6; i++) {
    rect(c, P.black, 15 - i, y + i, 2, 3)
    rect(c, P.black, 15 + i, y + i, 2, 3)
    rect(c, P.forceArrow, 15 - i, y + i, 2, 2)
    rect(c, P.forceArrow, 15 + i, y + i, 2, 2)
  }
}

function boot(c: CanvasRenderingContext2D, tile: Tile) {
  for (let foot = 0; foot < 2; foot++) {
    const x = 5 + foot * 12
    if (tile === Tile.Flippers) {
      rect(c, P.black, x + 2, 7, 6, 17)
      rect(c, P.black, x, 20, 10, 7)
      rect(c, P.cyan, x + 3, 8, 4, 14)
      rect(c, P.cyan, x + 1, 21, 8, 5)
      rect(c, P.water, x + 4, 9, 2, 5)
      rect(c, P.white, x + 2, 22, 1, 3)
    } else {
      const color = tile === Tile.FireBoots ? P.red : tile === Tile.Skates ? P.grey : P.brown
      rect(c, P.black, x + 2, 7, 7, 17)
      rect(c, P.black, x, 18, 10, 7)
      rect(c, color, x + 3, 8, 5, 13)
      rect(c, color, x + 1, 19, 8, 4)
      rect(c, P.white, x + 3, 9, 2, 5)
      if (tile === Tile.FireBoots) {
        rect(c, P.fireHi, x + 5, 15, 2, 6)
        rect(c, P.fireHi, x + 4, 17, 4, 2)
      } else if (tile === Tile.Skates) {
        rect(c, P.wallLo, x + 2, 25, 2, 2)
        rect(c, P.wallLo, x + 7, 25, 2, 2)
        rect(c, P.white, x, 27, 11, 2)
      } else for (let i = 0; i < 3; i++) rect(c, P.black, x + i * 4, 25, 3, 3)
    }
  }
  // A tiny bitmap initial preserves the boot distinction in monochrome.
  const bits = tile === Tile.Flippers ? [7, 4, 6, 4, 4] : tile === Tile.FireBoots ? [6, 5, 6, 5, 6] : tile === Tile.Skates ? [7, 4, 7, 1, 7] : [5, 5, 5, 5, 7]
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (bits[y] & (4 >> x)) rect(c, P.black, 1 + x, 1 + y, 1, 1)
}

function paintTile(c: CanvasRenderingContext2D, tile: Tile, frame: number) {
  floor(c)
  if (tile === Tile.Wall || tile === Tile.ToggleWall || tile === Tile.BlueWall || tile === Tile.FakeBlueWall) {
    bevel(c, 0, 0, 32, 32, tile === Tile.BlueWall || tile === Tile.FakeBlueWall ? P.blue : P.wall)
    if (tile === Tile.ToggleWall) {
      rect(c, P.green, 2, 2, 28, 2)
      rect(c, P.green, 2, 2, 2, 28)
      rect(c, P.green, 2, 28, 28, 2)
      rect(c, P.green, 28, 2, 2, 28)
    }
  } else if (tile === Tile.Chip) {
    for (let i = 0; i < 3; i++) {
      rect(c, P.wallLo, 9 + i * 5, 3, 2, 26)
      rect(c, P.wallLo, 3, 9 + i * 5, 26, 2)
      rect(c, P.white, 9 + i * 5, 3, 1, 4)
    }
    bevel(c, 7, 7, 18, 18, P.charcoal)
    rect(c, P.goldLo, 10, 9, 12, 14)
    rect(c, P.gold, 9, 11, 14, 10)
    rect(c, P.gold, 11, 9, 10, 14)
    rect(c, P.goldHi, 11, 10, 8, 2)
    rect(c, P.goldHi, 10, 12, 2, 5)
    rect(c, P.black, 15, 12, 2, 9)
    rect(c, P.black, 16, 12, 3, 2)
    rect(c, P.black, 13, 15, 6, 2)
  } else if (tile === Tile.Socket) {
    bevel(c, 3, 2, 6, 28, P.charcoal)
    bevel(c, 24, 2, 6, 28, P.charcoal)
    for (let x = 10; x < 24; x += 4) rect(c, P.goldLo, x, 4, 2, 24)
    for (let y = 6; y < 29; y += 5) rect(c, P.gold, 9, y, 15, 2)
    rect(c, P.black, 13, 12, 7, 8)
    rect(c, P.goldHi, 15, 14, 3, 4)
  } else if (tile === Tile.Exit || tile === Tile.Teleport) {
    rect(c, P.black, 0, 0, 32, 32)
    const colors = [P.waterLo, P.blue, P.cyan, P.white]
    for (let i = 0; i < 4; i++) rect(c, colors[(i + frame) % 4], 2 + i * 4, 2 + i * 4, 28 - i * 8, 28 - i * 8)
    rect(c, P.black, 14, 14, 4, 4)
    if (tile === Tile.Teleport) {
      c.save()
      c.translate(16, 16)
      c.rotate(frame * Math.PI / 2)
      rect(c, P.waterLo, -14, -2, 12, 4)
      rect(c, P.waterLo, -2, 2, 4, 12)
      rect(c, P.white, -1, -8, 2, 4)
      c.restore()
    }
  } else if (tile === Tile.Water) {
    rect(c, P.water, 0, 0, 32, 32)
    for (let y = 5; y < 32; y += 10) for (let x = -8; x < 32; x += 8) {
      const xx = x + frame * 2
      rect(c, P.waterHi, xx, y, 4, 2)
      rect(c, P.waterHi, xx + 4, y + 2, 4, 2)
      rect(c, P.waterLo, xx + 1, y + 4, 2, 1)
    }
  } else if (tile === Tile.Fire) {
    rect(c, P.fire, 0, 0, 32, 32)
    for (let i = 0; i < 3; i++) {
      const h = [18, 24, 14][(i + frame) % 3]
      const x = 2 + i * 10
      rect(c, P.fireMid, x, 32 - h + 5, 8, h - 5)
      rect(c, P.fireMid, x + 2, 32 - h, 4, h)
      rect(c, P.fireHi, x + 3, 32 - h + 8, 3, h - 8)
      rect(c, P.fireHi, x + 1, 27, 7, 5)
    }
  } else if (tile === Tile.Ice || tile >= Tile.IceNW) {
    rect(c, P.iceLo, 0, 0, 32, 32)
    rect(c, P.ice, 1, 1, 30, 30)
    for (let i = 4; i < 27; i++) rect(c, P.iceHi, i, 30 - i, 3, 2)
    rect(c, P.iceHi, 20, 7, 6, 1)
    if (tile >= Tile.IceNW) {
      const east = tile === Tile.IceNE || tile === Tile.IceSE
      const south = tile === Tile.IceSW || tile === Tile.IceSE
      for (let i = 0; i < 32; i++) {
        const y = south ? 31 - i : i
        rect(c, i < 2 ? P.wallHi : P.wall, east ? i : 0, y, 32 - i, 1)
        rect(c, P.wallLo, east ? i : 31 - i, y, 1, 1)
      }
    }
  } else if (tile >= Tile.ForceN && tile <= Tile.ForceRandom) {
    rect(c, P.force, 0, 0, 32, 32)
    c.save()
    c.translate(16, 16)
    c.rotate((tile === Tile.ForceRandom ? frame : tile - Tile.ForceN) * Math.PI / 2)
    c.translate(-16, -16)
    for (let i = -1; i < 3; i++) arrow(c, ((i * 16 - frame * 4) % 32 + 32) % 32 - 4)
    c.restore()
  } else if (tile >= Tile.BlueKey && tile <= Tile.YellowDoor) {
    const door = tile >= Tile.BlueDoor
    const n = tile - (door ? Tile.BlueDoor : Tile.BlueKey)
    const color = [P.blue, P.red, P.green, P.yellow][n]
    if (door) {
      bevel(c, 0, 0, 32, 32, color)
      rect(c, P.black, 6, 5, 20, 22)
      rect(c, color, 8, 7, 16, 18)
      shape(c, n, 13, 10, P.black)
      rect(c, P.black, 15, 16, 2, 6)
      rect(c, P.goldHi, 25, 16, 2, 2)
    } else {
      rect(c, P.black, 5, 5, 12, 12)
      rect(c, color, 6, 6, 10, 10)
      rect(c, P.floor, 8, 8, 6, 6)
      for (let i = 0; i < 12; i++) rect(c, P.black, 13 + i, 13 + i, 4, 4)
      for (let i = 0; i < 12; i++) rect(c, color, 14 + i, 14 + i, 2, 2)
      rect(c, P.black, 19, 24, 3, 5)
      rect(c, color, 20, 24, 1, 4)
      rect(c, P.black, 24, 20, 5, 3)
      rect(c, color, 25, 21, 3, 1)
      shape(c, n, 8, 8, P.black)
    }
  } else if (tile >= Tile.Flippers && tile <= Tile.SuctionBoots) boot(c, tile)
  else if (tile === Tile.Dirt || tile === Tile.Gravel) {
    rect(c, tile === Tile.Dirt ? P.dirt : P.gravel, 0, 0, 32, 32)
    for (let y = 2; y < 32; y += tile === Tile.Dirt ? 7 : 4) for (let x = 2; x < 32; x += tile === Tile.Dirt ? 9 : 5) {
      rect(c, (x + y) % 3 ? P.charcoal : tile === Tile.Dirt ? P.brown : P.white, (x + y * 3) % 30, y, 2, 2)
    }
  } else if (tile === Tile.Bomb) {
    rect(c, P.black, 8, 12, 16, 14)
    rect(c, P.black, 10, 10, 12, 18)
    rect(c, P.white, 11, 13, 4, 2)
    rect(c, P.white, 10, 15, 2, 3)
    rect(c, P.brown, 18, 6, 2, 5)
    rect(c, P.brown, 20, 4, 4, 2)
    rect(c, frame % 2 ? P.fireHi : P.fireMid, 24, 2, 3, 5)
    rect(c, P.fireHi, 22, 4, 7, 1)
  } else if (tile === Tile.Trap) {
    bevel(c, 4, 4, 24, 24, P.brown, true)
    rect(c, P.black, 7, 9, 18, 3)
    rect(c, P.black, 7, 21, 18, 3)
    for (let i = 0; i < 4; i++) {
      rect(c, P.grey, 8 + i * 5, 12, 2, 3)
      rect(c, P.grey, 8 + i * 5, 18, 2, 3)
    }
  } else if (tile === Tile.Clone) {
    bevel(c, 1, 1, 30, 30, P.charcoal)
    for (let y = 4; y < 30; y += 23) for (let x = 4; x < 30; x += 23) rect(c, P.grey, x, y, 2, 2)
    rect(c, P.black, 7, 7, 18, 18)
    rect(c, P.grey, 10, 12, 12, 2)
    rect(c, P.grey, 10, 17, 12, 2)
    rect(c, P.gold, 14, 9, 3, 13)
  } else if (tile >= Tile.BrownButton && tile <= Tile.BlueButton) {
    const n = tile - Tile.BrownButton
    rect(c, P.wallLo, 9, 10, 14, 13)
    rect(c, P.wallLo, 11, 8, 10, 17)
    rect(c, [P.brown, P.red, P.green, P.blue][n], 10, 10, 12, 12)
    rect(c, P.white, 12, 10, 6, 1)
    if (n === 0) {
      rect(c, P.black, 13, 13, 6, 2)
      rect(c, P.black, 15, 15, 2, 5)
    } else if (n === 1) {
      rect(c, P.black, 15, 12, 2, 8)
      rect(c, P.black, 12, 15, 8, 2)
    } else if (n === 2) for (let i = 0; i < 6; i++) rect(c, P.black, 18 - i, 13 + i, 2, 1)
    else {
      for (let i = 0; i < 3; i++) {
        rect(c, P.black, 12 + i, 15 - i, 1, 1)
        rect(c, P.black, 12 + i, 15 + i, 1, 1)
        rect(c, P.black, 19 - i, 15 - i, 1, 1)
        rect(c, P.black, 19 - i, 15 + i, 1, 1)
      }
    }
  } else if (tile === Tile.ToggleFloor) {
    for (let i = 3; i < 29; i += 6) {
      rect(c, P.green, i, 3, 3, 1)
      rect(c, P.green, i, 28, 3, 1)
      rect(c, P.green, 3, i, 1, 3)
      rect(c, P.green, 28, i, 1, 3)
    }
  } else if (tile === Tile.Thief) {
    rect(c, P.charcoal, 8, 5, 16, 15)
    rect(c, P.black, 5, 19, 22, 11)
    rect(c, P.red, 10, 23, 12, 4)
  } else if (tile === Tile.Hint) {
    bevel(c, 5, 4, 22, 24, P.grey, true)
    const rows = [14, 17, 1, 2, 4, 4, 0, 4]
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < 5; x++) if (rows[y] & (16 >> x)) rect(c, P.black, 11 + x * 2, 7 + y * 2, 2, 2)
  } else if (tile === Tile.Popup || tile === Tile.RecessedWall) bevel(c, 3, 3, 26, 26, P.floor, tile === Tile.RecessedWall)
  else if (tile >= Tile.ThinN && tile <= Tile.ThinSE) {
    if (tile === Tile.ThinN) bevel(c, 0, 0, 32, 3, P.wall)
    if (tile === Tile.ThinE || tile === Tile.ThinSE) bevel(c, 29, 0, 3, 32, P.wall)
    if (tile === Tile.ThinS || tile === Tile.ThinSE) bevel(c, 0, 29, 32, 3, P.wall)
    if (tile === Tile.ThinW) bevel(c, 0, 0, 3, 32, P.wall)
  }
  // Invisible and unrevealed hidden walls deliberately use the floor tile.
}

/** Four pre-rendered 200ms phases; create once per UI mount and reuse across levels. */
export function createTileSheet(): HTMLCanvasElement {
  const sheet = document.createElement('canvas')
  sheet.width = COLUMNS * 32
  sheet.height = Math.ceil(TILE_COUNT * 4 / COLUMNS) * 32
  const c = sheet.getContext('2d')!
  c.imageSmoothingEnabled = false
  for (let frame = 0; frame < 4; frame++) for (let tile = 0; tile < TILE_COUNT; tile++) {
    const slot = frame * TILE_COUNT + tile
    c.save()
    c.translate(slot % COLUMNS * 32, Math.floor(slot / COLUMNS) * 32)
    c.beginPath()
    c.rect(0, 0, 32, 32)
    c.clip()
    paintTile(c, tile, frame)
    c.restore()
  }
  return sheet
}

function tileImage(c: CanvasRenderingContext2D, sheet: HTMLCanvasElement, tile: Tile, frame: number, x: number, y: number) {
  const slot = (frame & 3) * TILE_COUNT + tile
  c.drawImage(sheet, slot % COLUMNS * 32, Math.floor(slot / COLUMNS) * 32, 32, 32, x, y, 32, 32)
}

export function drawInventory(ctx: CanvasRenderingContext2D, tile: Tile, x: number, y: number, sheet?: HTMLCanvasElement): void {
  ctx.save()
  ctx.imageSmoothingEnabled = false
  if (sheet) tileImage(ctx, sheet, tile, 0, x, y)
  else {
    ctx.translate(x, y)
    ctx.beginPath()
    ctx.rect(0, 0, 32, 32)
    ctx.clip()
    paintTile(ctx, tile, 0)
  }
  ctx.restore()
}

const silhouettes = new WeakMap<ChallengeArt, Map<number, HTMLCanvasElement>>()

function silhouette(art: ChallengeArt, idx: number, color: string, burnt: boolean) {
  let cache = silhouettes.get(art)
  if (!cache) {
    cache = new Map()
    silhouettes.set(art, cache)
  }
  const key = idx + (burnt ? 4490 : 0)
  let image = cache.get(key)
  if (!image) {
    image = document.createElement('canvas')
    image.width = 32
    image.height = 32
    const ctx = image.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    const r = art.heads!.rect(idx)
    ctx.drawImage(art.heads!.front, r.sx, r.sy, r.sw, r.sh, 0, 0, 32, 32)
    ctx.globalCompositeOperation = 'source-in'
    rect(ctx, color, 0, 0, 32, 32)
    cache.set(key, image)
  }
  return image
}

function head(c: CanvasRenderingContext2D, art: ChallengeArt | null, idx: number, dir: Direction, color: string, swim = false, burnt = false) {
  c.save()
  c.beginPath()
  c.rect(0, 0, 32, swim ? 25 : 20)
  c.clip()
  if (art?.heads && idx >= 0 && dir !== 0 && !burnt) {
    const r = art.heads.rect(idx)
    if (dir === 3 && !swim) {
      c.translate(32, 0)
      c.scale(-1, 1)
    }
    c.drawImage(dir === 2 || swim ? art.heads.front : art.heads.side, r.sx, r.sy, r.sw, r.sh, 0, swim ? 0 : -8, 32, 32)
  } else if (art?.heads && idx >= 0) {
    c.drawImage(silhouette(art, idx, color, burnt), 0, swim ? 0 : -8)
    if (!burnt) rect(c, P.charcoal, 7, 1, 18, 2)
  } else {
    // Back view and offline art share a period silhouette, never a fabricated face.
    rect(c, color, 6, swim ? 8 : 0, 20, 16)
    rect(c, color, 4, swim ? 11 : 3, 24, 10)
    rect(c, burnt ? P.black : P.charcoal, 7, swim ? 9 : 1, 18, 2)
    if (dir !== 0 && !burnt) rect(c, art?.palette?.skin ?? P.goldHi, 8, swim ? 16 : 10, 16, 8)
  }
  c.restore()
}

function remy(c: CanvasRenderingContext2D, art: ChallengeArt | null, idx: number, dir: Direction, frame: number, villain: boolean, swim = false, burnt = false) {
  const hair = villain ? P.brown : art?.palette?.hair ?? P.brown
  if (burnt) {
    head(c, art, idx, dir, P.charcoal, false, true)
    rect(c, P.black, 8 + (frame & 3) * 2, 0, 5, 4)
    rect(c, P.charcoal, 6, 27, 21, 4)
    rect(c, P.fireMid, 12, 28, 2, 1)
    return
  }
  head(c, art, idx, dir, hair, swim)
  if (swim) {
    rect(c, P.waterHi, 2, 21, 28, 2)
    rect(c, P.water, 0, 24, 32, 8)
    rect(c, P.waterHi, 7, 26, 19, 2)
    rect(c, P.white, 1, 18 + frame % 2, 3, 2)
    rect(c, P.white, 28, 17 + frame % 2, 3, 2)
    return
  }
  const stride = frame & 1
  c.save()
  if (dir === 3) {
    c.translate(32, 0)
    c.scale(-1, 1)
  }
  if (villain) {
    for (let y = 17; y < 29; y++) rect(c, P.black, 10 - Math.floor((y - 17) / 3), y, 12 + Math.floor((y - 17) / 3) * 2, 1)
    if (dir !== 0) rect(c, P.red, 11, 21, 10, 5)
    rect(c, P.charcoal, 15, 19, 2, 9)
  } else {
    rect(c, P.black, 9, 16, 14, 10)
    rect(c, art?.palette?.shirt ?? P.blue, 10, 17, 12, 8)
    if (dir === 1 || dir === 3) {
      rect(c, P.black, 17, 18, 9, 4)
      rect(c, art?.palette?.skin ?? P.goldHi, 19, 19, 6, 2)
      rect(c, P.charcoal, 12, 18, 3, 6)
    } else {
      rect(c, P.black, 6, 18, 3, 8)
      rect(c, P.black, 23, 18, 3, 8)
      rect(c, art?.palette?.skin ?? P.goldHi, 7, 19, 2, 6)
      rect(c, art?.palette?.skin ?? P.goldHi, 23, 19, 2, 6)
      if (dir === 0) rect(c, P.charcoal, 11, 17, 10, 1)
    }
  }
  rect(c, P.waterLo, 10, 25, 5, 5 - stride)
  rect(c, P.waterLo, 17, 25, 5, 4 + stride)
  rect(c, P.black, 9, 29 - stride, 6, 2)
  rect(c, P.black, 17, 28 + stride, 6, 2)
  c.restore()
}

function monster(c: CanvasRenderingContext2D, actor: Actor, frame: number, art: ChallengeArt | null) {
  const kind = actor.kind
  if (kind === 'teeth') {
    remy(c, art, art?.cabald ?? -1, actor.dir, frame, true)
    return
  }
  if (kind === 'block') {
    bevel(c, 1, 1, 30, 30, P.brown)
    bevel(c, 5, 5, 22, 22, P.dirt, true)
    for (let i = 4; i < 28; i++) {
      rect(c, P.wallLo, i, i, 2, 2)
      rect(c, P.wallLo, 30 - i, i, 2, 2)
    }
    return
  }
  c.save()
  c.translate(16, 16)
  c.rotate(actor.dir * Math.PI / 2)
  c.translate(-16, -16)
  const wobble = frame & 1
  if (kind === 'bug') {
    for (let y = 11; y < 25; y += 6) {
      rect(c, P.black, 3 + wobble, y, 26 - wobble * 2, 1)
      rect(c, P.black, 3 + wobble, y - 2, 1, 4)
      rect(c, P.black, 28 - wobble, y - 2, 1, 4)
    }
    rect(c, P.black, 10, 4, 1, 6)
    rect(c, P.black, 21, 4, 1, 6)
    rect(c, P.black, 6, 11, 20, 15)
    rect(c, P.purple, 7, 12, 18, 13)
    rect(c, P.purple, 10, 9, 12, 19)
    rect(c, P.black, 15, 10, 2, 17)
    rect(c, P.white, 11, 14, 3, 1)
    rect(c, P.white, 12, 13, 1, 4)
    rect(c, P.white, 19, 14, 2, 2)
    rect(c, P.white, 18, 17, 2, 2)
  } else if (kind === 'paramecium') {
    rect(c, P.black, 10, 9, 12, 17)
    rect(c, P.cyan, 11, 10, 10, 15)
    for (let i = 0; i < 4; i++) {
      rect(c, P.cyan, 6 + i * 5, 12 + (i % 2) * 7, 3, 6 + wobble)
      rect(c, P.cyan, 14, 3 + i * 4, 4, 5)
    }
    rect(c, P.white, 14, 11, 2, 8)
    rect(c, P.charcoal, 14, 25, 4, 4)
    rect(c, P.charcoal, 17, 27, 7, 2)
    rect(c, P.black, 22, 24, 2, 4)
  } else if (kind === 'fireball') {
    rect(c, P.fire, 10, 8, 12, 18)
    rect(c, P.fire, 7, 11, 18, 12)
    rect(c, P.fireMid, 9, 11, 14, 12)
    rect(c, P.fireHi, 12, 12, 8, 9)
    rect(c, P.white, 14, 13, 4, 4)
    rect(c, P.fireMid, 11 + wobble * 3, 24, 5, 7)
    rect(c, P.fireHi, 17, 24, 3, 4)
  } else if (kind === 'glider') {
    rect(c, P.blue, 8, 25, 18, 3)
    for (let y = 4; y < 25; y++) {
      const w = Math.floor((y - 4) / 2)
      rect(c, P.black, 15 - w, y, w * 2 + 2, 1)
      if (y > 5) rect(c, P.white, 16 - w, y, w * 2, 1)
    }
    rect(c, P.dark, 15, 7, 2, 18)
    rect(c, P.floor, 11, 23, 4, 3)
    rect(c, P.floor, 17, 23, 4, 3)
  } else if (kind === 'ball') {
    const y = 7 + wobble * 2
    rect(c, P.black, 8, y + 3, 18, 12 - wobble * 2)
    rect(c, P.black, 11, y, 12, 18 - wobble * 2)
    rect(c, P.purple, 9, y + 4, 16, 10 - wobble * 2)
    rect(c, P.purple, 12, y + 1, 10, 16 - wobble * 2)
    rect(c, P.white, 12, y + 3, 5, 2)
    rect(c, P.white, 11, y + 5, 2, 3)
    rect(c, P.green, 16, y + 8, 2, 7)
    rect(c, P.green, 14, y + 10, 6, 2)
    rect(c, P.green, 15, y + 9, 4, 1)
  } else if (kind === 'tank') {
    rect(c, P.black, 4, 9, 24, 19)
    rect(c, P.dark, 5, 10, 4, 17)
    rect(c, P.dark, 23, 10, 4, 17)
    for (let y = 11; y < 27; y += 4) {
      rect(c, P.grey, 5, y + wobble, 4, 1)
      rect(c, P.grey, 23, y + wobble, 4, 1)
    }
    rect(c, P.checkA, 9, 10, 14, 16)
    rect(c, P.black, 14, 3, 4, 11)
    rect(c, P.checkB, 15, 4, 2, 11)
    rect(c, P.gold, 12, 14, 8, 9)
    rect(c, P.black, 14, 16, 4, 1)
    rect(c, P.black, 14, 16, 1, 5)
    rect(c, P.black, 14, 20, 4, 1)
  } else if (kind === 'walker') {
    rect(c, P.black, 9, 23, 4, 6 - wobble)
    rect(c, P.black, 20, 23, 4, 5 + wobble)
    rect(c, P.charcoal, 4, 12, 24, 12)
    rect(c, P.charcoal, 9, 7, 8, 16)
    rect(c, P.charcoal, 18, 9, 7, 14)
    rect(c, P.grey, 5, 13, 22, 9)
    rect(c, P.grey, 10, 8, 6, 14)
    rect(c, P.grey, 19, 10, 5, 12)
    rect(c, P.yellow, 16, 13, 4, 5)
    rect(c, P.yellow, 13, 17, 5, 3)
    rect(c, P.yellow, 14, 20, 2, 5)
  } else if (kind === 'blob') {
    rect(c, P.black, 4, 10, 24, 17)
    rect(c, P.red, 5, 11 + wobble, 22, 14 - wobble)
    for (let i = 0; i < 6; i++) {
      rect(c, P.gold, 5 + i * 4, 8 + (i % 2) * wobble, 2, 4)
      rect(c, P.gold, 5 + i * 4, 25, 2, 4 - (i % 2) * wobble)
    }
    for (let i = 0; i < 5; i++) {
      rect(c, P.gold, 15 - i, 13 + i, 2, 1)
      rect(c, P.gold, 15 + i, 13 + i, 2, 1)
      rect(c, P.gold, 11 + i, 18 + i, 2, 1)
      rect(c, P.gold, 19 - i, 18 + i, 2, 1)
    }
  }
  c.restore()
}

/** Render 288x288 logical pixels. Frame is an integer 200ms animation tick, not a timestamp. */
export function drawViewport(ctx: CanvasRenderingContext2D, state: State, frame: number, art: ChallengeArt | null, sheet: HTMLCanvasElement): void {
  const px = state.player.pos % MAP_SIZE
  const py = Math.floor(state.player.pos / MAP_SIZE)
  const cameraX = Math.max(0, Math.min(MAP_SIZE - 9, px - 4))
  const cameraY = Math.max(0, Math.min(MAP_SIZE - 9, py - 4))
  const phase = Math.floor(frame) & 3
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.beginPath()
  ctx.rect(0, 0, 288, 288)
  ctx.clip()
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
    const pos = (cameraY + y) * MAP_SIZE + cameraX + x
    const tile = state.tiles[pos]
    tileImage(ctx, sheet, tile, phase, x * 32, y * 32)
    if (tile === Tile.Thief) {
      ctx.save()
      ctx.translate(x * 32, y * 32)
      remy(ctx, art, art?.nobody ?? -1, 2, 0, true)
      ctx.restore()
    } else if (tile >= Tile.BrownButton && tile <= Tile.BlueButton) {
      let pressed = false
      for (const actor of state.actors) if (actor.alive && actor.pos === pos) {
        pressed = true
        break
      }
      if (pressed) {
        rect(ctx, P.wallLo, x * 32 + 10, y * 32 + 9, 12, 2)
        rect(ctx, P.charcoal, x * 32 + 11, y * 32 + 21, 10, 2)
      }
    } else if (tile === Tile.Trap) {
      let open = false
      for (const link of state.level.traps) if (link.target === pos) {
        for (const actor of state.actors) if (actor.alive && actor.pos === link.button) {
          open = true
          break
        }
        if (open) break
      }
      if (open) {
        rect(ctx, P.dirt, x * 32 + 7, y * 32 + 9, 18, 15)
        rect(ctx, P.wallLo, x * 32 + 7, y * 32 + 7, 18, 2)
        rect(ctx, P.wallLo, x * 32 + 7, y * 32 + 24, 18, 2)
      }
    }
  }
  for (const actor of state.actors) {
    if (!actor.alive || actor === state.player) continue
    const x = actor.pos % MAP_SIZE - cameraX
    const y = Math.floor(actor.pos / MAP_SIZE) - cameraY
    if (x < 0 || x >= 9 || y < 0 || y >= 9) continue
    ctx.save()
    ctx.translate(x * 32, y * 32)
    ctx.beginPath()
    ctx.rect(0, 0, 32, 32)
    ctx.clip()
    monster(ctx, actor, phase, art)
    ctx.restore()
  }
  ctx.save()
  ctx.translate((px - cameraX) * 32, (py - cameraY) * 32)
  ctx.beginPath()
  ctx.rect(0, 0, 32, 32)
  ctx.clip()
  remy(ctx, art, art?.player ?? -1, state.player.dir, state.tick, false,
    state.tiles[state.player.pos] === Tile.Water || state.death === 'water', state.death === 'fire')
  ctx.restore()
  ctx.restore()
}
