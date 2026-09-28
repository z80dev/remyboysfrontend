import { keccak_256 } from '@noble/hashes/sha3'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils'
import {
  A,
  BASE_RPCS,
  BLOCKSCOUT,
  LABELS,
  LEGACY_KEYS,
  type LegacyKey,
  MAINNET_RPCS,
  POOL_ID,
  SEL,
  START_BLOCK,
  STUCK,
  TOKEN_KEYS,
  TOKENS,
  TOPIC,
  type TokenKey,
  USER_AGENT,
  WHALE_EXCLUDED,
} from './config'
import owedData from './owed.json'
import {
  ZERO,
  abiBytes,
  addrOfWord,
  blockTag,
  chunksOf,
  lensCalls,
  lensCodes,
  lensHolders,
  lensWords,
  Meter,
  Rpc,
  type LensCall,
  type RpcCall,
  word,
} from './rpc'
import { amountsForLiquidity, ethPriceAtSqrt, getSqrtPriceAtTick } from './v4math'

/* ---------- API contract (fixed; the admin UI depends on it) ---------- */

export type Snapshot = {
  generatedAt: string
  block: number
  complete: Record<string, { supply: string; verifiedSum: string; complete: boolean }>
  labels: Record<string, string>
  stuck: {
    totalRemys: number
    contracts: {
      key: string
      name: string
      address: string
      remys: number
      claimToken?: { key: string; symbol: string; address: string; supply: string; remysPerToken: number }
    }[]
  }
  legacy: {
    key: LegacyKey
    symbol: string
    address: string
    decimals: 18
    supply: string
    remysPerToken: number
    holders: {
      address: string
      balance: string
      remys: number
      isContract: boolean
      lockedUntil?: number
      label?: string
    }[]
  }[]
  collection: {
    totalSupply: number
    holderCount: number
    top: { address: string; nfts: number; isContract: boolean; label?: string }[]
  }
  vault: {
    inventory: number
    reserve: string
    fremySupply: string
    fremyOutsideVault: string
    price: number
    fremyHolders: { address: string; balance: string; label?: string }[]
    lp: {
      tokenId: string
      owner: string
      tickLower: number
      tickUpper: number
      liquidity: string
      fremy: string
      eth: string
      inRange: boolean
      label?: string
    }[]
  }
  recovery: {
    claimsEnabled: boolean
    victims: { address: string; owed: number; claimed: number }[]
    stolenStillWithAttacker: number
    stolenTotal: number
  }
  whales: {
    address: string
    nfts: number
    legacyRemys: number
    fremy: number
    lpRemys: number
    total: number
    isContract: boolean
    label?: string
    ens?: string
  }[]
}

/** Indexer memory kept between runs (KV key `state`). */
export type IndexState = {
  v: 1
  /** Last block whose logs have been scanned. */
  cursor: number
  /** When the last full build ran (ms); quiet runs don't rewrite state. */
  builtAt: number
  /** Addresses with a non-zero verified balance at the last run, per token. */
  candidates: Record<TokenKey, string[]>
  /** PositionManager token ids in our pool with liquidity at the last run. */
  lpIds: string[]
  /** Highest existing Remy Boys token id at the last run. */
  maxId: number
  /** When Blockscout holders were last merged in, per token (ms). */
  scoutedAt: Partial<Record<TokenKey, number>>
  /** Tokens whose verified sum missed totalSupply last run (forces a Blockscout re-scout). */
  incomplete: TokenKey[]
  /** Code kind per listed address (0 EOA, 1 contract, 2 EIP-7702 delegated EOA) and when it was read (ms). */
  codes: Record<string, [kind: 0 | 1 | 2, at: number]>
  /** ENS / Basename primary name per listed address ('' = none) and when it was looked up (ms). */
  names: Record<string, [name: string, at: number]>
}

export type RunStats = {
  /** No tracked events since the cursor: the stored snapshot was re-stamped instead of rebuilt. */
  quiet: boolean
  block: number
  head: number
  logsFrom: number
  logsTo: number
  logs: number
  subrequests: number
  wallMs: number
  candidates: Record<string, number>
  scouted: string[]
  codeLookups: number
  nameLookups: number
  rpcRetries: string[]
  warnings: string[]
}

/** Small per-run record stored next to the snapshot (KV key `meta`) for /health and /stats. */
export type RunMeta = { generatedAt: string; block: number; stats: RunStats; lastError?: { at: string; message: string } }

const LOG_RANGE = 2000 // mainnet.base.org caps eth_getLogs at 2,000 blocks
const MAX_LOG_CHUNKS = 30 // per run; a stale cursor catches up over several runs
const SWEEP_STEP = 2000 // ownerOf ids per extra holders() call when the collection grows past the guess
const E18 = 10n ** 18n
const SCOUT_EVERY_MS = 6 * 3600_000 // Blockscout is only a candidate cross-check once the log cursor is live
const CODE_TTL_MS = 6 * 3600_000
const NAME_TTL_MS = 24 * 3600_000
const FULL_EVERY_MS = 3600_000 // rebuild at least hourly even when quiet (lock expiry, roles, name/code refresh)

/** ENS namehash (hex, no 0x). Only used for the handful of Basenames found. */
function namehash(name: string): string {
  let node: Uint8Array = new Uint8Array(32)
  for (const label of name.split('.').reverse()) {
    const joined = new Uint8Array(64)
    joined.set(node)
    joined.set(keccak_256(utf8ToBytes(label)), 32)
    node = keccak_256(joined)
  }
  return bytesToHex(node)
}

const round6 = (x: number) => Math.round(x * 1e6) / 1e6
const ZERO_WORD = '0'.repeat(64)
const int24OfWord = (w: string) => {
  const x = Number.parseInt(w.slice(58, 64), 16)
  return x >= 0x800000 ? x - 0x1000000 : x
}

/** Reads an ABI string from packed words whose length word is at index `lenWord` (data follows it). */
function stringAt(chunk: string, lenWord: number): string | undefined {
  const at = lenWord * 64
  const len = Number.parseInt(chunk.slice(at, at + 64), 16)
  if (!len || len * 2 > chunk.length - at - 64) return undefined
  return new TextDecoder().decode(hexToBytes(chunk.slice(at + 64, at + 64 + len * 2)))
}

/** Every holder address Blockscout lists for a token (v2 API, 50 per page). Balances are ignored: often wrong. */
async function blockscoutHolders(meter: Meter, token: string): Promise<string[] | string> {
  const out: string[] = []
  let query = ''
  try {
    for (let page = 0; page < 100; page++) {
      const res = await meter.fetch(`${BLOCKSCOUT}/api/v2/tokens/${token}/holders${query}`, {
        headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
      })
      if (!res.ok) return `HTTP ${res.status}`
      const body = (await res.json()) as {
        items?: { address?: { hash?: string } }[]
        next_page_params?: Record<string, string | number> | null
      }
      if (!Array.isArray(body.items)) return 'unexpected response'
      for (const h of body.items) if (h.address?.hash) out.push(h.address.hash.toLowerCase())
      if (!body.next_page_params) return out
      query = `?${new URLSearchParams(Object.entries(body.next_page_params).map(([k, v]): [string, string] => [k, String(v)]))}`
    }
  } catch (e) {
    return (e as Error).message
  }
  return 'too many pages'
}

type Log = { address: string; topics: string[]; data: string }

export type RunResult = { stats: RunStats } & (
  | { quiet: true }
  | { quiet: false; snapshot: Snapshot; state: IndexState }
)

/**
 * One indexing run. Scans Transfer logs (tokens + collection) and pool events since `prev.cursor`; if nothing
 * happened and the last full build is recent, returns `quiet` (the stored snapshot is still exact, only its
 * block/time move). Otherwise verifies every candidate balance on-chain at a single pinned block and assembles
 * the admin snapshot. Pure apart from network I/O; the caller persists the result.
 */
export async function runIndex(prev: IndexState | null, force = false): Promise<RunResult> {
  const started = Date.now()
  const meter = new Meter()
  const base = new Rpc(BASE_RPCS, meter)
  const warnings: string[] = []

  const head = Number(await base.call<string>('eth_blockNumber', []))
  const B = head

  /* ---- logs since the cursor: candidate discovery and the "did anything change" check ---- */
  const logsFrom = prev ? prev.cursor + 1 : START_BLOCK
  const logsTo = Math.min(head, logsFrom + MAX_LOG_CHUNKS * LOG_RANGE - 1)
  if (logsTo < head) warnings.push(`log scan catching up: scanned to ${logsTo}, head ${head}`)
  const logCalls: RpcCall[] = []
  for (let f = logsFrom; f <= logsTo; f += LOG_RANGE) {
    const range = { fromBlock: blockTag(f), toBlock: blockTag(Math.min(logsTo, f + LOG_RANGE - 1)) }
    const transfers = [...TOKEN_KEYS.map((k) => TOKENS[k].address), A.remyBoys]
    logCalls.push(
      { method: 'eth_getLogs', params: [{ ...range, address: transfers, topics: [TOPIC.transfer] }] },
      { method: 'eth_getLogs', params: [{ ...range, address: A.poolManager, topics: [null, POOL_ID] }] },
    )
  }
  const logs = (await base.all(logCalls)).flat() as Log[]
  if (prev && !force && !logs.length && logsTo === head && started - prev.builtAt < FULL_EVERY_MS) {
    const stats: RunStats = {
      quiet: true,
      block: B,
      head,
      logsFrom,
      logsTo,
      logs: 0,
      subrequests: meter.subrequests,
      wallMs: Date.now() - started,
      candidates: {},
      scouted: [],
      codeLookups: 0,
      nameLookups: 0,
      rpcRetries: meter.retries,
      warnings,
    }
    return { quiet: true, stats }
  }

  // Blockscout seeds candidates on the first run, then re-checks every few hours or when a token didn't add up.
  const scoutKeys = TOKEN_KEYS.filter(
    (k) => !prev || prev.incomplete.includes(k) || started - (prev.scoutedAt[k] ?? 0) > SCOUT_EVERY_MS,
  )
  const scoutedAt = { ...(prev?.scoutedAt ?? {}) } as Record<TokenKey, number>
  const scouting = (async () => {
    const found: Partial<Record<TokenKey, string[]>> = {}
    for (const k of scoutKeys) {
      const list = await blockscoutHolders(meter, TOKENS[k].address)
      if (typeof list === 'string') {
        warnings.push(`blockscout holders for ${k}: ${list}`)
        continue
      }
      found[k] = list
      scoutedAt[k] = started
    }
    return found
  })()

  /* ---- round 1: header values, collection holders, recovery ---- */
  // Heterogeneous one-off reads, 2 words each (slot0 needs sqrtPrice + tick).
  const header: LensCall[] = [
    ...TOKEN_KEYS.map((k) => ({ target: TOKENS[k].address, data: SEL.totalSupply })),
    { target: A.remyBoys, data: SEL.totalSupply },
    { target: A.rbREMYLS, data: SEL.convertToAssets + word(E18) },
    { target: A.rbREMYLS, data: SEL.TIME_LOCK },
    { target: A.multicall3, data: SEL.getCurrentBlockTimestamp },
    { target: A.nftVault, data: SEL.inventoryCount },
    { target: A.nftVault, data: SEL.reserve },
    { target: A.fREMY, data: SEL.balanceOf + word(A.nftVault) },
    { target: A.stateView, data: SEL.getSlot0 + word(POOL_ID) },
    { target: A.remyBoys, data: SEL.isMinter + word(A.reclaim) },
  ]
  const victims = [...new Set(owedData.victims.map((v) => v.toLowerCase()))]
  const sweepEnd = (prev?.maxId ?? 4600) + 300

  const r1 = await base.all([
    lensCalls(header, 2, B),
    lensWords(A.reclaim, SEL.claimed, victims, 1, B),
    lensWords(A.reclaim, SEL.remaining, victims, 1, B),
    lensWords(A.remyBoys, SEL.ownerOf, owedData.ids, 1, B),
    lensHolders(A.remyBoys, 0, sweepEnd, B),
  ])
  const [h, claimedRaw, remainingRaw, stolenOwnersRaw, holdersRaw] = r1
  const headerWords = chunksOf(abiBytes(h), 64)
  const hv = headerWords.map((c) => BigInt(`0x${c.slice(0, 64)}`))
  const supply = Object.fromEntries(TOKEN_KEYS.map((k, i) => [k, hv[i]])) as Record<TokenKey, bigint>
  let i = TOKEN_KEYS.length
  const nftSupply = Number(hv[i++])
  const lsRate = hv[i++] // rbREMY per 1e18 rbREMYLS shares
  const timeLock = hv[i++]
  const blockTime = Number(hv[i++])
  const inventory = Number(hv[i++])
  const reserve = hv[i++]
  const vaultFremy = hv[i++]
  const slot0 = headerWords[i++]
  const sqrtP = BigInt(`0x${slot0.slice(0, 64)}`)
  const tick = int24OfWord(slot0.slice(64))
  const claimsEnabled = hv[i++] === 1n
  if (sqrtP === 0n || lsRate === 0n || nftSupply === 0) throw new Error('header reads returned zero')

  // Collection holders, aggregated on-node; extend the id range while short of totalSupply (mints past the guess).
  const nftCount = new Map<string, number>()
  let maxId = 0
  let found = 0
  const addHolders = (ret: unknown) => {
    const hex = (ret as string).slice(2)
    const n = Number.parseInt(hex.slice(0, 64), 16)
    if (n) maxId = Math.max(maxId, Number.parseInt(hex.slice(64, 128), 16))
    found += n
    const end = 256 + Number.parseInt(hex.slice(192, 256), 16) * 2
    for (let at = 256; at < end; at += 48) {
      const o = `0x${hex.slice(at, at + 40)}`
      nftCount.set(o, (nftCount.get(o) ?? 0) + Number.parseInt(hex.slice(at + 40, at + 48), 16))
    }
  }
  addHolders(holdersRaw)
  for (let from = sweepEnd; found < nftSupply && from < sweepEnd + 10 * SWEEP_STEP; from += SWEEP_STEP)
    addHolders(await base.call('eth_call', lensHolders(A.remyBoys, from, from + SWEEP_STEP, B).params))
  if (found !== nftSupply) warnings.push(`ownerOf sweep found ${found} of totalSupply ${nftSupply}`)

  // Logs → candidate addresses and LP token ids.
  const fromLogs: Record<TokenKey, Set<string>> = Object.fromEntries(TOKEN_KEYS.map((k) => [k, new Set<string>()])) as never
  const tokenByAddr = Object.fromEntries(TOKEN_KEYS.map((k) => [TOKENS[k].address, k])) as Record<string, TokenKey>
  const lpIds = new Set(prev?.lpIds ?? [])
  const pmTopic = `0x${word(A.positionManager)}`
  for (const l of logs) {
    if (l.address.toLowerCase() === A.poolManager) {
      // ModifyLiquidity by PositionManager: salt (4th data word) is the position token id.
      if (l.topics[0] === TOPIC.modifyLiquidity && l.topics[2] === pmTopic)
        lpIds.add(BigInt(`0x${l.data.slice(2 + 64 * 3, 2 + 64 * 4)}`).toString())
      continue
    }
    const key = tokenByAddr[l.address.toLowerCase()]
    if (!key || l.topics.length !== 3) continue // collection transfers only mark the run as dirty
    for (const t of [l.topics[1], l.topics[2]]) {
      const a = addrOfWord(t.slice(2))
      if (a !== ZERO) fromLogs[key].add(a)
    }
  }

  /* ---- round 2: verify balances of every candidate, rbREMYLS locks, LP positions ---- */
  const scouted = await scouting
  const candidates = Object.fromEntries(
    TOKEN_KEYS.map((k) => [k, [...new Set([...(prev?.candidates[k] ?? []), ...(scouted[k] ?? []), ...fromLogs[k]])]]),
  ) as Record<TokenKey, string[]>
  const ids = [...lpIds]
  const idArgs = ids.map(BigInt)
  const r2 = await base.all([
    ...TOKEN_KEYS.map((k) => lensWords(TOKENS[k].address, SEL.balanceOf, candidates[k], 1, B)),
    lensWords(A.rbREMYLS, SEL.locks, candidates.rbREMYLS, 2, B),
    lensWords(A.positionManager, SEL.getPoolAndPositionInfo, idArgs, 6, B),
    lensWords(A.positionManager, SEL.getPositionLiquidity, idArgs, 1, B),
    lensWords(A.positionManager, SEL.ownerOf, idArgs, 1, B),
  ])
  const balances = {} as Record<TokenKey, { address: string; balance: bigint }[]>
  const complete: Snapshot['complete'] = {}
  TOKEN_KEYS.forEach((k, ti) => {
    const words = chunksOf(abiBytes(r2[ti]), 32)
    const rows: { address: string; balance: bigint }[] = []
    let sum = 0n
    candidates[k].forEach((a, j) => {
      const b = BigInt(`0x${words[j]}`)
      if (b === 0n) return
      rows.push({ address: a, balance: b })
      sum += b
    })
    rows.sort((x, y) => (y.balance > x.balance ? 1 : y.balance < x.balance ? -1 : 0))
    balances[k] = rows
    complete[k] = { supply: supply[k].toString(), verifiedSum: sum.toString(), complete: sum === supply[k] }
    if (sum !== supply[k]) warnings.push(`${k}: verified ${sum} of supply ${supply[k]}`)
  })
  const lockWords = chunksOf(abiBytes(r2[TOKEN_KEYS.length]), 64)
  const lockedUntil = new Map<string, number>()
  candidates.rbREMYLS.forEach((a, j) => {
    const ts = BigInt(`0x${lockWords[j].slice(0, 64)}`)
    const amount = BigInt(`0x${lockWords[j].slice(64)}`)
    const until = Number(ts + timeLock)
    if (ts > 0n && amount > 0n && until > blockTime) lockedUntil.set(a, until)
  })

  const info = chunksOf(abiBytes(r2[TOKEN_KEYS.length + 1]), 192)
  const liq = chunksOf(abiBytes(r2[TOKEN_KEYS.length + 2]), 32)
  const pmOwner = chunksOf(abiBytes(r2[TOKEN_KEYS.length + 3]), 32)
  const lpRows: (Snapshot['vault']['lp'][number] & { fremyWei: bigint; ethWei: bigint })[] = []
  ids.forEach((id, j) => {
    // PositionInfo packing: | 200 bits poolId (truncated keccak of the pool key) | 24 tickUpper | 24 tickLower | 8 |
    const packed = info[j].slice(320)
    const liquidity = BigInt(`0x${liq[j]}`)
    if (!POOL_ID.startsWith(packed.slice(0, 50), 2) || liquidity === 0n || pmOwner[j] === ZERO_WORD) return
    const tickLower = int24OfWord(packed.slice(0, 62).padStart(64, '0'))
    const tickUpper = int24OfWord(packed.slice(0, 56).padStart(64, '0'))
    const amt = amountsForLiquidity(sqrtP, getSqrtPriceAtTick(tickLower), getSqrtPriceAtTick(tickUpper), liquidity)
    lpRows.push({
      tokenId: id,
      owner: addrOfWord(pmOwner[j]),
      tickLower,
      tickUpper,
      liquidity: liquidity.toString(),
      fremy: amt.amount1.toString(),
      eth: amt.amount0.toString(),
      inRange: tickLower <= tick && tick < tickUpper,
      fremyWei: amt.amount1,
      ethWei: amt.amount0,
    })
  })
  lpRows.sort((x, y) => (y.fremyWei > x.fremyWei ? 1 : y.fremyWei < x.fremyWei ? -1 : 0))
  const price = ethPriceAtSqrt(sqrtP)

  /* ---- per-address aggregation ---- */
  const remysPerToken: Record<LegacyKey, number> = {
    rbREMYLS: Number(lsRate) / 1e21,
    rbREMY: 0.001,
    wREMY: 1,
    REMY: 1,
  }
  const remysOf = (k: LegacyKey, b: bigint) =>
    k === 'rbREMYLS' ? round6(Number((b * lsRate) / E18) / 1e21) : k === 'rbREMY' ? round6(Number(b) / 1e21) : round6(Number(b) / 1e18)

  type Agg = { nfts: number; legacyRemys: number; fremy: number; lpRemys: number }
  const agg = new Map<string, Agg>()
  const aggOf = (a: string) => {
    let x = agg.get(a)
    if (!x) agg.set(a, (x = { nfts: 0, legacyRemys: 0, fremy: 0, lpRemys: 0 }))
    return x
  }
  for (const [a, n] of nftCount) aggOf(a).nfts = n
  for (const k of LEGACY_KEYS) for (const r of balances[k]) aggOf(r.address).legacyRemys += remysOf(k, r.balance)
  for (const r of balances.fREMY) aggOf(r.address).fremy = round6(Number(r.balance) / 1e18)
  for (const p of lpRows) aggOf(p.owner).lpRemys += Number(p.fremyWei) / 1e18 + Number(p.ethWei) / 1e18 / price
  const whaleRanked = [...agg]
    .filter(([a]) => !WHALE_EXCLUDED.has(a))
    .map(([a, x]) => ({ address: a, ...x, total: x.nfts + x.legacyRemys + x.fremy + x.lpRemys }))
    .sort((x, y) => y.total - x.total)
    .slice(0, 100)
  const collectionTop = [...nftCount].sort((x, y) => y[1] - x[1]).slice(0, 200)

  /* ---- round 3: contract / EIP-7702 status and names; cached in state, refreshed a slice per run ---- */
  const listedArr = [
    ...new Set<string>([
      ...LEGACY_KEYS.flatMap((k) => balances[k].map((r) => r.address)),
      ...collectionTop.map(([a]) => a),
      ...whaleRanked.map((w) => w.address),
      ...lpRows.map((p) => p.owner),
    ]),
  ]
  const whaleAddrs = whaleRanked.map((w) => w.address)
  const codes: IndexState['codes'] = {}
  const names: IndexState['names'] = {}
  for (const a of listedArr) {
    if (prev?.codes?.[a]) codes[a] = prev.codes[a]
    if (prev?.names?.[a]) names[a] = prev.names[a]
  }
  // Unknown addresses always; stale ones oldest-first up to `cap` so refreshes spread across runs.
  const due = (cache: Record<string, [unknown, number]>, addrs: string[], ttl: number, cap: number) => [
    ...addrs.filter((a) => !cache[a]),
    ...addrs
      .filter((a) => cache[a] && started - cache[a][1] > ttl)
      .sort((x, y) => cache[x][1] - cache[y][1])
      .slice(0, cap),
  ]
  const codeQuery = due(codes, listedArr, CODE_TTL_MS, 100)
  const nameQuery = due(names, whaleAddrs, NAME_TTL_MS, 20)
  // ENS primary names via the mainnet UniversalResolver (does forward verification itself): reverse(bytes,uint256)
  // returns (string, address, address) → words [offset, resolver, reverseResolver, len, data…].
  const ensCalls: LensCall[] = nameQuery.map((a) => ({
    target: A.ensUniversalResolver,
    data: `${SEL.reverse}${word(64)}${word(60)}${word(20)}${a.slice(2).padEnd(64, '0')}`,
  }))
  const mainnet = new Rpc(MAINNET_RPCS, meter)
  const [r3, ensRet] = await Promise.all([
    codeQuery.length || nameQuery.length
      ? base.batch([lensCodes(codeQuery, B), lensWords(A.baseL2ReverseRegistrar, SEL.nameForAddr, nameQuery, 4, B)])
      : undefined,
    nameQuery.length
      ? mainnet.call('eth_call', lensCalls(ensCalls, 6, 'latest').params).catch((e: Error) => {
          warnings.push(`ENS lookup failed: ${e.message}`)
          return undefined
        })
      : undefined,
  ])
  if (r3?.[0].error) warnings.push(`code lookup failed: ${r3[0].error.message}`)
  else if (r3)
    chunksOf(abiBytes(r3[0].result), 7).forEach((c, j) => {
      const kind = c.slice(8) === 'ef0100' ? 2 : Number.parseInt(c.slice(0, 8), 16) > 0 ? 1 : 0
      codes[codeQuery[j]] = [kind, started]
    })
  const labelOf = (a: string) => LABELS[a] ?? (codes[a]?.[0] === 2 ? '7702' : undefined)
  const isContract = (a: string) => codes[a]?.[0] === 1

  if (r3 && ensRet && !r3[1].error) {
    const found = new Map<string, string>()
    chunksOf(abiBytes(ensRet), 6 * 32).forEach((c, j) => {
      const primary = stringAt(c, 3)
      if (primary) found.set(nameQuery[j], primary)
    })
    // Basenames (ENSIP-19 reverse registrar on Base), kept only if the name resolves back to the address.
    const baseNames: [string, string][] = []
    chunksOf(abiBytes(r3[1].result), 4 * 32).forEach((c, j) => {
      const n = stringAt(c, 1)
      if (n && !found.has(nameQuery[j])) baseNames.push([nameQuery[j], n])
    })
    let verified = true
    if (baseNames.length) {
      const [fwd] = await base.batch([
        lensWords(A.basenamesL2Resolver, SEL.addr, baseNames.map(([, n]) => `0x${namehash(n)}`), 1, B),
      ])
      if (fwd.error) {
        verified = false
        warnings.push(`basenames forward check: ${fwd.error.message}`)
      } else
        chunksOf(abiBytes(fwd.result), 32).forEach((w, j) => {
          if (addrOfWord(w) === baseNames[j][0]) found.set(baseNames[j][0], baseNames[j][1])
        })
    }
    if (verified) for (const a of nameQuery) names[a] = [found.get(a) ?? '', started]
  } else if (r3?.[1].error) warnings.push(`basenames: ${r3[1].error.message}`)

  /* ---- assemble ---- */
  const legacy: Snapshot['legacy'] = LEGACY_KEYS.map((k) => ({
    key: k,
    symbol: TOKENS[k].symbol,
    address: TOKENS[k].address,
    decimals: 18,
    supply: supply[k].toString(),
    remysPerToken: remysPerToken[k],
    holders: balances[k].map((r) => ({
      address: r.address,
      balance: r.balance.toString(),
      remys: remysOf(k, r.balance),
      isContract: isContract(r.address),
      ...(k === 'rbREMYLS' && lockedUntil.has(r.address) ? { lockedUntil: lockedUntil.get(r.address) } : {}),
      ...(labelOf(r.address) ? { label: labelOf(r.address) } : {}),
    })),
  }))

  const stuckContracts: Snapshot['stuck']['contracts'] = STUCK.map((s) => ({
    key: s.key,
    name: s.name,
    address: s.address,
    remys: nftCount.get(s.address) ?? 0,
    ...(s.claim
      ? {
          claimToken: {
            key: s.claim,
            symbol: TOKENS[s.claim].symbol,
            address: TOKENS[s.claim].address,
            supply: supply[s.claim].toString(),
            remysPerToken: remysPerToken[s.claim],
          },
        }
      : {}),
  }))

  const claimed = chunksOf(abiBytes(claimedRaw), 32).map((w) => Number(BigInt(`0x${w}`)))
  const remaining = chunksOf(abiBytes(remainingRaw), 32).map((w) => Number(BigInt(`0x${w}`)))
  const attackerSet = new Set<string>([A.attacker, A.exploit])
  const stolenOwners = chunksOf(abiBytes(stolenOwnersRaw), 32).map(addrOfWord)

  const snapshot: Snapshot = {
    generatedAt: new Date().toISOString(),
    block: B,
    complete,
    labels: LABELS,
    stuck: { totalRemys: stuckContracts.reduce((n, c) => n + c.remys, 0), contracts: stuckContracts },
    legacy,
    collection: {
      totalSupply: nftSupply,
      holderCount: nftCount.size,
      top: collectionTop.map(([a, n]) => ({
        address: a,
        nfts: n,
        isContract: isContract(a),
        ...(labelOf(a) ? { label: labelOf(a) } : {}),
      })),
    },
    vault: {
      inventory,
      reserve: reserve.toString(),
      fremySupply: supply.fREMY.toString(),
      fremyOutsideVault: (supply.fREMY - vaultFremy).toString(),
      price,
      fremyHolders: balances.fREMY.map((r) => ({
        address: r.address,
        balance: r.balance.toString(),
        ...(LABELS[r.address] ? { label: LABELS[r.address] } : {}),
      })),
      lp: lpRows.map(({ fremyWei: _f, ethWei: _e, ...p }) => ({ ...p, ...(labelOf(p.owner) ? { label: labelOf(p.owner) } : {}) })),
    },
    recovery: {
      claimsEnabled,
      victims: victims
        .map((a, j) => ({ address: a, owed: claimed[j] + remaining[j], claimed: claimed[j] }))
        .sort((x, y) => y.owed - x.owed),
      stolenStillWithAttacker: stolenOwners.filter((o) => attackerSet.has(o)).length,
      stolenTotal: owedData.ids.length,
    },
    whales: whaleRanked.map((w) => ({
      address: w.address,
      nfts: w.nfts,
      legacyRemys: round6(w.legacyRemys),
      fremy: w.fremy,
      lpRemys: round6(w.lpRemys),
      total: round6(w.total),
      isContract: isContract(w.address),
      ...(labelOf(w.address) ? { label: labelOf(w.address) } : {}),
      ...(names[w.address]?.[0] ? { ens: names[w.address][0] } : {}),
    })),
  }

  // Scan cursor only advances to what was actually scanned; candidates keep only live holders.
  const state: IndexState = {
    v: 1,
    cursor: logsTo,
    builtAt: started,
    candidates: Object.fromEntries(TOKEN_KEYS.map((k) => [k, balances[k].map((r) => r.address)])) as Record<TokenKey, string[]>,
    lpIds: lpRows.map((p) => p.tokenId),
    maxId,
    scoutedAt,
    codes,
    names,
    incomplete: TOKEN_KEYS.filter((k) => !complete[k].complete),
  }
  const stats: RunStats = {
    quiet: false,
    block: B,
    head,
    logsFrom,
    logsTo,
    logs: logs.length,
    subrequests: meter.subrequests,
    wallMs: Date.now() - started,
    candidates: Object.fromEntries(TOKEN_KEYS.map((k) => [k, candidates[k].length])),
    scouted: Object.keys(scouted),
    codeLookups: codeQuery.length,
    nameLookups: nameQuery.length,
    rpcRetries: meter.retries,
    warnings,
  }
  return { quiet: false, snapshot, state, stats }
}
