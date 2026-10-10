import type { SheetName } from './sprites'
import { type PlaylistStyle, type Sheet, type Skin, toSheet } from './types'

type Bytes = Uint8Array<ArrayBuffer>

/** Minimal ZIP reader: central directory + stored/deflate entries (DecompressionStream). Keys are lower-case basenames. */
async function unzip(data: ArrayBuffer): Promise<Map<string, () => Promise<Bytes>>> {
  const view = new DataView(data)
  let eocd = -1
  for (let i = data.byteLength - 22; i >= Math.max(0, data.byteLength - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  if (eocd < 0) throw new Error('Not a skin file (no ZIP directory).')
  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const files = new Map<string, () => Promise<Bytes>>()
  const decoder = new TextDecoder()
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error('Damaged skin file.')
    const method = view.getUint16(p + 10, true)
    const size = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    const local = view.getUint32(p + 42, true)
    const name = decoder.decode(new Uint8Array(data, p + 46, nameLen))
    p += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/')) continue
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    const raw = new Uint8Array(data, start, size)
    const base = name.split(/[\\/]/).pop()?.toLowerCase() ?? name
    if (files.has(base)) continue // first match wins (skins sometimes nest a duplicate folder)
    if (method === 0) files.set(base, async () => raw)
    else if (method === 8)
      files.set(base, async () => new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()))
  }
  return files
}

async function decodeImage(bytes: Bytes): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/bmp' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')?.drawImage(img, 0, 0)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

const FILES: Record<SheetName, string> = {
  MAIN: 'main.bmp',
  TITLEBAR: 'titlebar.bmp',
  CBUTTONS: 'cbuttons.bmp',
  NUMBERS: 'numbers.bmp',
  NUMS_EX: 'nums_ex.bmp',
  TEXT: 'text.bmp',
  VOLUME: 'volume.bmp',
  BALANCE: 'balance.bmp',
  POSBAR: 'posbar.bmp',
  PLAYPAUS: 'playpaus.bmp',
  MONOSTER: 'monoster.bmp',
  SHUFREP: 'shufrep.bmp',
  EQMAIN: 'eqmain.bmp',
  EQ_EX: 'eq_ex.bmp',
  PLEDIT: 'pledit.bmp',
}

const hex = (v: string) => (/^#?[0-9a-f]{6}$/i.test(v.trim()) ? `#${v.trim().replace('#', '')}` : undefined)

export function parseViscolor(text: string, fallback: string[]): string[] {
  const colors = text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => `rgb(${m[1]},${m[2]},${m[3]})`)
  return fallback.map((c, i) => colors[i] ?? c)
}

export function parsePledit(text: string, fallback: PlaylistStyle): PlaylistStyle {
  const kv = new Map<string, string>()
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([a-z]+)\s*=\s*(.*?)\s*$/i)
    if (m) kv.set(m[1].toLowerCase(), m[2])
  }
  return {
    normal: hex(kv.get('normal') ?? '') ?? fallback.normal,
    current: hex(kv.get('current') ?? '') ?? fallback.current,
    normalBg: hex(kv.get('normalbg') ?? '') ?? fallback.normalBg,
    selectedBg: hex(kv.get('selectedbg') ?? '') ?? fallback.selectedBg,
    font: kv.get('font') || fallback.font,
  }
}

/** Loads a classic Winamp 2.x skin (.wsz/.zip). Sheets the skin lacks come from `fallback`, like Winamp's built-in defaults. */
export async function loadWsz(file: Blob, name: string, fallback: Skin): Promise<Skin> {
  const files = await unzip(await file.arrayBuffer())
  const read = async (key: string) => files.get(key)?.()
  const text = async (key: string) => {
    const bytes = await read(key)
    return bytes ? new TextDecoder('latin1').decode(bytes) : undefined
  }
  const decoded: Partial<Record<SheetName, Sheet>> = {}
  await Promise.all(
    (Object.keys(FILES) as SheetName[]).map(async (sheet) => {
      const bytes = await read(FILES[sheet])
      if (!bytes) return
      try {
        decoded[sheet] = toSheet(await decodeImage(bytes))
      } catch {
        // An undecodable bitmap falls back like a missing one.
      }
    }),
  )
  if (!decoded.MAIN) throw new Error('This does not look like a Winamp 2 skin (no MAIN.BMP).')
  const viscolor = await text('viscolor.txt')
  const pledit = await text('pledit.txt')
  return {
    name,
    sheets: {
      ...fallback.sheets,
      ...decoded,
      // Skins without BALANCE.BMP reuse the volume bar, as Winamp does.
      BALANCE: decoded.BALANCE ?? decoded.VOLUME ?? fallback.sheets.BALANCE,
      NUMS_EX: decoded.NUMS_EX,
    },
    viscolor: viscolor ? parseViscolor(viscolor, fallback.viscolor) : fallback.viscolor,
    pledit: pledit ? parsePledit(pledit, fallback.pledit) : fallback.pledit,
  }
}
