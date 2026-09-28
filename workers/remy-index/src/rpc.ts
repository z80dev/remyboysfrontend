import { LENS_CODE } from './lens'

export type Hex = `0x${string}`
export type RpcCall = { method: string; params: unknown[] }
type RpcReply = { id: number; result?: unknown; error?: { code: number; message: string; data?: unknown } }

async function sleep(ms: number) {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  return promise
}

/** Counts outbound HTTP requests so a run can report (and stay under) the Workers subrequest limit. */
export class Meter {
  subrequests = 0
  /** Why RPC attempts were retried (rate limits, HTTP errors), for run stats. */
  retries: string[] = []
  async fetch(url: string, init?: RequestInit) {
    this.subrequests++
    return fetch(url, init)
  }
}

const RATE_LIMIT_CODES = new Set([429, -32005, -32016])

export type Endpoint = { url: string; maxBatch: number }

/**
 * JSON-RPC over HTTP with batching. Rate-limited or dropped items are retried alone, alternating endpoints
 * and backing off; a per-call error is returned only once every endpoint has produced one.
 */
export class Rpc {
  constructor(
    private endpoints: Endpoint[],
    private meter: Meter,
  ) {}

  async batch(calls: RpcCall[]): Promise<RpcReply[]> {
    const out: RpcReply[] = new Array(calls.length)
    let pending = calls.map((_, i) => i)
    for (let attempt = 0; attempt < 8 && pending.length; attempt++) {
      const ep = this.endpoints[attempt % this.endpoints.length]
      const round = Math.floor(attempt / this.endpoints.length)
      if (round) await sleep(500 * 2 ** round)
      const groups: number[][] = []
      for (let i = 0; i < pending.length; i += ep.maxBatch) groups.push(pending.slice(i, i + ep.maxBatch))
      const retry = await Promise.all(groups.map((g) => this.post(ep.url, calls, g, out)))
      pending = retry.flat()
      // Capability errors (archive depth, log range, batch size) differ per endpoint: let the next one try.
      if (attempt < this.endpoints.length - 1)
        for (let i = 0; i < out.length; i++)
          if (out[i]?.error) {
            pending.push(i)
            delete out[i]
          }
    }
    if (pending.length) throw new Error(`rpc failed for ${pending.length} calls: ${this.meter.retries.at(-1)}`)
    return out
  }

  async call<T = unknown>(method: string, params: unknown[]): Promise<T> {
    const [r] = await this.batch([{ method, params }])
    if (r.error) throw new Error(`${method}: ${r.error.message}`)
    return r.result as T
  }

  /** Results of every call, throwing on the first error. */
  async all(calls: RpcCall[]): Promise<unknown[]> {
    const replies = await this.batch(calls)
    return replies.map((r, i) => {
      if (r.error) throw new Error(`${calls[i].method}: ${r.error.message}`)
      return r.result
    })
  }

  /** Sends one batch; fills `out` and returns the ids that need another attempt. */
  private async post(url: string, calls: RpcCall[], ids: number[], out: RpcReply[]): Promise<number[]> {
    let replies: RpcReply[]
    try {
      const res = await this.meter.fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(ids.map((i) => ({ jsonrpc: '2.0', id: i, ...calls[i] }))),
      })
      if (!res.ok) {
        this.meter.retries.push(`${url} HTTP ${res.status}`)
        return ids
      }
      const body = (await res.json()) as RpcReply[] | RpcReply
      replies = Array.isArray(body) ? body : [body]
    } catch (e) {
      this.meter.retries.push(`${url} ${(e as Error).message}`)
      return ids
    }
    let limited = 0
    for (const r of replies) {
      if (typeof r.id !== 'number' || !ids.includes(r.id)) continue
      if (r.error && (RATE_LIMIT_CODES.has(r.error.code) || /rate limit|too many/i.test(r.error.message))) limited++
      else out[r.id] = r
    }
    const retry = ids.filter((i) => !out[i])
    if (retry.length) this.meter.retries.push(`${url}: ${retry.length} of ${ids.length} (${limited} rate-limited)`)
    return retry
  }
}

/* ---------- ABI helpers (hand-rolled: the payloads are large and fixed-shape) ---------- */

export const word = (v: bigint | number | string) =>
  (typeof v === 'string' ? v.slice(2).toLowerCase() : BigInt(v).toString(16)).padStart(64, '0')
export const blockTag = (b: number) => `0x${b.toString(16)}`
export const addrOfWord = (w: string) => `0x${w.slice(24, 64)}`
export const ZERO = '0x0000000000000000000000000000000000000000'

/** Decode an ABI `bytes` return value into its raw hex (no 0x). */
export function abiBytes(ret: unknown): string {
  const h = ret as string
  const len = Number.parseInt(h.slice(66, 130), 16)
  return h.slice(130, 130 + len * 2)
}

/** Split a packed hex blob into `size`-byte items. */
export function chunksOf(hex: string, size: number): string[] {
  const n = hex.length / (size * 2)
  const out = new Array<string>(n)
  for (let i = 0; i < n; i++) out[i] = hex.slice(i * size * 2, (i + 1) * size * 2)
  return out
}

/* ---------- Lens: runtime code injected via eth_call state override ---------- */

const LENS = '0x000000000000000000000000000000000001e75e'
const OVERRIDE = { [LENS]: { code: LENS_CODE } }
const GAS = '0x3b9aca0' // 62.5M

type Block = number | 'latest'

const lensCall = (data: string, block: Block): RpcCall => ({
  method: 'eth_call',
  params: [{ to: LENS, data, gas: GAS }, typeof block === 'number' ? blockTag(block) : block, OVERRIDE],
})

/** Calldata for a call: selector followed by already-encoded argument words (hex, no 0x). */
export type LensCall = { target: string; data: string }

/** `k` words per arbitrary call; decode with `abiBytes` + `chunksOf(_, 32 * k)`. */
export function lensCalls(list: LensCall[], k: number, block: Block) {
  const n = list.length
  let offsets = ''
  let elems = ''
  let offset = 32 * n
  for (const c of list) {
    const hex = c.data.slice(2)
    const padded = hex.padEnd(Math.ceil(hex.length / 64) * 64, '0')
    offsets += word(offset)
    elems += word(hex.length / 2) + padded
    offset += 32 + padded.length / 2
  }
  const dataAt = 96 + 32 * (n + 1)
  const targets = word(n) + list.map((c) => word(c.target)).join('')
  return lensCall(`0xa1e37cd9${word(96)}${word(dataAt)}${word(k)}${targets}${word(n)}${offsets}${elems}`, block)
}

/** `k` words per `target.sel(arg)`; decode with `abiBytes` + `chunksOf(_, 32 * k)`. */
export function lensWords(target: string, sel: string, args: (bigint | number | string)[], k: number, block: Block) {
  const head = `0x42d7d3ac${word(target)}${sel.slice(2).padEnd(64, '0')}${word(128)}${word(k)}${word(args.length)}`
  return lensCall(head + args.map(word).join(''), block)
}

/** Per-holder `ownerOf` counts over ids [start, end); returns (found, maxId, packed (owner, uint32 count)[]). */
export function lensHolders(nft: string, start: number, end: number, block: Block) {
  return lensCall(`0x4e4ee847${word(nft)}${word(start)}${word(end)}`, block)
}

/** Per address: code size + first 3 bytes. */
export function lensCodes(addrs: string[], block: number) {
  return lensCall(`0xbd1b9e19${word(32)}${word(addrs.length)}${addrs.map(word).join('')}`, block)
}
