/**
 * Cheap best-effort metadata for visitor files: ID3v2/ID3v1 artist + title, and sample rate / channels from the
 * container header (MP3, WAV, FLAC, Ogg Vorbis/Opus). Reads at most the first 256 KB and the last 128 bytes.
 */
export type Probe = { artist?: string; title?: string; sampleRate?: number; channels?: number }

const HEAD = 256 * 1024

function text(bytes: Uint8Array, encoding: number): string {
  const label = ['latin1', 'utf-16', 'utf-16be', 'utf-8'][encoding] ?? 'latin1'
  try {
    return new TextDecoder(label).decode(bytes).replace(/\0+$/, '').split('\0')[0].trim()
  } catch {
    return ''
  }
}

function syncsafe(b: Uint8Array, at: number): number {
  return ((b[at] & 0x7f) << 21) | ((b[at + 1] & 0x7f) << 14) | ((b[at + 2] & 0x7f) << 7) | (b[at + 3] & 0x7f)
}

/** Returns the tag size (bytes to skip) and fills artist/title. */
function id3v2(b: Uint8Array, out: Probe): number {
  if (b.length < 10 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return 0
  const version = b[3]
  const size = syncsafe(b, 6) + 10 + (b[5] & 0x10 ? 10 : 0)
  const end = Math.min(b.length, size)
  let at = 10
  if (b[5] & 0x40 && version >= 3)
    at += version === 4 ? syncsafe(b, 10) : ((b[10] << 24) | (b[11] << 16) | (b[12] << 8) | b[13]) + 4
  const idLength = version === 2 ? 3 : 4
  const headerLength = version === 2 ? 6 : 10
  while (at + headerLength < end) {
    const id = String.fromCharCode(...b.subarray(at, at + idLength))
    if (!/^[A-Z0-9]+$/.test(id)) break
    const length =
      version === 2
        ? (b[at + 3] << 16) | (b[at + 4] << 8) | b[at + 5]
        : version === 4
          ? syncsafe(b, at + 4)
          : ((b[at + 4] << 24) | (b[at + 5] << 16) | (b[at + 6] << 8) | b[at + 7]) >>> 0
    const body = b.subarray(at + headerLength, Math.min(end, at + headerLength + length))
    if (id === 'TIT2' || id === 'TT2') out.title ||= text(body.subarray(1), body[0])
    if (id === 'TPE1' || id === 'TP1') out.artist ||= text(body.subarray(1), body[0])
    at += headerLength + length
  }
  return size
}

const MPEG_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000],
}

function mpeg(b: Uint8Array, from: number, out: Probe): void {
  for (let at = from; at + 4 < b.length; at++) {
    if (b[at] !== 0xff || (b[at + 1] & 0xe0) !== 0xe0) continue
    const version = (b[at + 1] >> 3) & 3
    const layer = (b[at + 1] >> 1) & 3
    const bitrate = b[at + 2] >> 4
    const rate = (b[at + 2] >> 2) & 3
    if (version === 1 || layer === 0 || bitrate === 0 || bitrate === 15 || rate === 3) continue
    out.sampleRate = MPEG_RATES[version][rate]
    out.channels = b[at + 3] >> 6 === 3 ? 1 : 2
    return
  }
}

function ascii(b: Uint8Array, at: number, length: number): string {
  return String.fromCharCode(...b.subarray(at, at + length))
}

export async function probe(file: File): Promise<Probe> {
  const out: Probe = {}
  const head = new Uint8Array(await file.slice(0, HEAD).arrayBuffer())
  const view = new DataView(head.buffer)
  const tag = id3v2(head, out)
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 4) === 'WAVE') {
    for (let at = 12; at + 8 <= head.length; ) {
      const size = view.getUint32(at + 4, true)
      if (ascii(head, at, 4) === 'fmt ' && at + 16 <= head.length) {
        out.channels = view.getUint16(at + 10, true)
        out.sampleRate = view.getUint32(at + 12, true)
        break
      }
      at += 8 + size + (size & 1)
    }
  } else if (ascii(head, tag, 4) === 'fLaC' && tag + 26 <= head.length) {
    out.sampleRate = (head[tag + 18] << 12) | (head[tag + 19] << 4) | (head[tag + 20] >> 4)
    out.channels = ((head[tag + 20] >> 1) & 7) + 1
  } else if (ascii(head, 0, 4) === 'OggS') {
    const segments = head[26]
    const packet = 27 + segments
    if (ascii(head, packet + 1, 6) === 'vorbis' && packet + 16 <= head.length) {
      out.channels = head[packet + 11]
      out.sampleRate = view.getUint32(packet + 12, true)
    } else if (ascii(head, packet, 8) === 'OpusHead') {
      out.channels = head[packet + 9]
      out.sampleRate = 48000
    }
  } else if (tag > 0 || /\.mp[123]$/i.test(file.name) || file.type === 'audio/mpeg') mpeg(head, tag, out)
  if (!out.title && file.size > 128) {
    const tail = new Uint8Array(await file.slice(file.size - 128).arrayBuffer())
    if (ascii(tail, 0, 3) === 'TAG') {
      out.title = text(tail.subarray(3, 33), 0)
      out.artist ||= text(tail.subarray(33, 63), 0)
    }
  }
  return out
}

/** "Artist - Title" from a file name: extension stripped, underscores to spaces. */
export function nameTitle(name: string): string {
  const base = name
    .replace(/\.[a-z0-9]{1,5}$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return base || name
}
