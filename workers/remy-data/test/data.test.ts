import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { type Hex, decodeFunctionData, encodeAbiParameters, encodeEventTopics, encodeFunctionResult, multicall3Abi, pad, toHex } from 'viem'
import { erc20Abi, poolEventsAbi, positionManagerAbi, quoterAbi, remyAbi, stateViewAbi, vaultAbi } from '../../../src/abis'
import type { DataSnapshot, MarketLog } from '../../../src/lib/data-schema'
import { Q128, getSqrtPriceAtTick } from '../../../src/lib/v4math'
import { A, KEY, POOL, START, mergeLogs, positionRanges } from '../src/chain'

mock.module('cloudflare:workers', () => ({
  DurableObject: class {
    constructor(
      public ctx: unknown,
      public env: unknown,
    ) {}
  },
}))
const { RemyData, default: worker } = await import('../src/worker')

const owner = '0x0000000000000000000000000000000000000123'
function modify(block: bigint, id: bigint, delta: bigint, sender = A.positionManager): MarketLog {
  return {
    blockNumber: block.toString(),
    logIndex: Number(block),
    transactionHash: pad(toHex(block)),
    topics: encodeEventTopics({
      abi: poolEventsAbi,
      eventName: 'ModifyLiquidity',
      args: { id: POOL, sender },
    }) as Hex[],
    data: encodeAbiParameters([{ type: 'int24' }, { type: 'int24' }, { type: 'int256' }, { type: 'bytes32' }], [69000, 71000, delta, pad(toHex(id))]),
  }
}
const liquidity = 10n ** 20n
const fixtureLogs = [modify(START + 1n, 99n, liquidity)]
const now = Date.now
const realFetch = globalThis.fetch
let rpcCalls: string[]
let failed: boolean
let object: InstanceType<typeof RemyData>
let state: ReturnType<typeof memoryState>
let subscriptions: string[]
function memoryState() {
  const values = new Map<string, unknown>()
  let snapshot: string | undefined
  let alarm: number | null = null
  return {
    waitUntil: (promise: Promise<unknown>) => promise,
    storage: {
      get: async (key: string) => values.get(key),
      put: async (key: string, value: unknown) => values.set(key, value),
      getAlarm: async () => alarm,
      setAlarm: async (value: number) => {
        alarm = value
      },
      sql: {
        exec: (sql: string, ...args: unknown[]) => {
          if (sql.startsWith('INSERT')) snapshot = args[1] as string
          return { toArray: () => (sql.startsWith('SELECT') && snapshot ? [{ value: snapshot }] : []) }
        },
      },
    },
  }
}
function contractResult(target: string, data: Hex): Hex {
  const abi =
    target.toLowerCase() === A.stateView.toLowerCase()
      ? stateViewAbi
      : target.toLowerCase() === A.positionManager.toLowerCase()
        ? positionManagerAbi
        : target.toLowerCase() === A.vault.toLowerCase()
          ? vaultAbi
          : target.toLowerCase() === A.quoter.toLowerCase()
            ? quoterAbi
            : target.toLowerCase() === A.remy.toLowerCase()
              ? remyAbi
              : erc20Abi
  const call = decodeFunctionData({ abi, data })
  const results: Record<string, unknown> = {
    getSlot0: [getSqrtPriceAtTick(70000), 70000, 0, 10000],
    getLiquidity: liquidity,
    inventoryCount: 231n,
    maxBatch: 100n,
    balanceOf: 4259n * 10n ** 18n,
    ownerOf: owner,
    getPositionInfo: [liquidity, 0n, 0n],
    getFeeGrowthInside: [Q128, 2n * Q128],
    quoteExactOutputSingle: [2500000000000000n, 100000n],
  }
  const result = call.functionName === 'totalSupply' ? (target.toLowerCase() === A.remy.toLowerCase() ? 4490n : 4491n * 10n ** 18n) : results[call.functionName]
  // Fixture dispatch is intentionally ABI-independent of the worker's call ordering.
  return encodeFunctionResult({ abi, functionName: call.functionName, result } as Parameters<typeof encodeFunctionResult>[0])
}
beforeEach(() => {
  failed = false
  rpcCalls = []
  subscriptions = []
  state = memoryState()
  object = new RemyData(state as unknown as DurableObjectState, { ALCHEMY_API_KEY: 'test-only' } as never)
  globalThis.fetch = mock(async (_input: unknown, init?: RequestInit) => {
    if (new Headers(init?.headers).get('Upgrade')) {
      const handlers = new Map<string, (event: { data: string }) => void>()
      return {
        webSocket: {
          accept() {},
          close() {},
          addEventListener: (type: string, cb: (event: { data: string }) => void) => handlers.set(type, cb),
          send: (body: string) => {
            const req = JSON.parse(body)
            subscriptions.push(req.method)
            handlers.get('message')?.({ data: JSON.stringify({ id: req.id, result: `subscription-${req.id}` }) })
          },
        },
      }
    }
    const req = JSON.parse(String(init?.body))
    rpcCalls.push(req.method)
    if (failed) return Response.json({ jsonrpc: '2.0', id: req.id, error: { code: -32000, message: 'provider unavailable' } })
    let result: unknown
    if (req.method === 'eth_getBlockByNumber')
      result = {
        number: toHex(START + 100n),
        timestamp: toHex(BigInt(Math.floor(Date.now() / 1000))),
        hash: pad('0x01'),
        transactions: [],
      }
    else if (req.method === 'eth_getLogs')
      result = fixtureLogs.map((l) => ({
        ...l,
        blockNumber: toHex(BigInt(l.blockNumber)),
        logIndex: toHex(l.logIndex),
      }))
    else if (req.method === 'eth_call') {
      const request = req.params[0]
      if (request.to.toLowerCase() === '0xca11bde05977b3631167028862be2a173976ca11') {
        const { args } = decodeFunctionData({ abi: multicall3Abi, data: request.data })
        result = encodeFunctionResult({
          abi: multicall3Abi,
          functionName: 'aggregate3',
          result: (args?.[0] ?? []).map((c) => ({ success: true, returnData: contractResult(c.target, c.callData) })),
        })
      } else result = contractResult(request.to, request.data)
    } else throw new Error(`Unexpected RPC ${req.method}`)
    return Response.json({ jsonrpc: '2.0', id: req.id, result })
  }) as unknown as typeof fetch
})
afterEach(() => {
  globalThis.fetch = realFetch
  Date.now = now
})

describe('shared data index', () => {
  test('one refresh batches stats/positions, preserves exact wei, and subscribes once', async () => {
    await Promise.all([object.alarm(), object.alarm()])
    const response = await object.fetch(new Request('https://test/api/data/snapshot'))
    const data = (await response.json()) as DataSnapshot
    expect(response.status).toBe(200)
    expect(rpcCalls).toEqual(['eth_getBlockByNumber', 'eth_getLogs', 'eth_call', 'eth_call', 'eth_call'])
    expect(subscriptions).toEqual(['eth_subscribe', 'eth_subscribe'])
    expect(data.pool.key).toEqual(KEY)
    expect(data.positions[0]).toMatchObject({
      tokenId: '99',
      owner,
      liquidity: liquidity.toString(),
      fee0: liquidity.toString(),
      fee1: (liquidity * 2n).toString(),
    })
    const before = rpcCalls.length
    await Promise.all(Array.from({ length: 20 }, () => object.fetch(new Request('https://test/api/data/snapshot'))))
    expect(rpcCalls.length).toBe(before)
  })
  test('failure retains complete state, then rejects a stale snapshot instead of zero data', async () => {
    await object.alarm()
    const old = await (await object.fetch(new Request('https://test/api/data/snapshot'))).json()
    failed = true
    await object.alarm()
    expect(await (await object.fetch(new Request('https://test/api/data/snapshot'))).json()).toEqual(old)
    Date.now = () => now() + 180000
    const response = await object.fetch(new Request('https://test/api/data/snapshot'))
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: 'snapshot stale' })
    expect(await state.storage.getAlarm()).not.toBeNull()
  })
  test('new index schedules warming without a per-visitor RPC', async () => {
    expect((await object.fetch(new Request('https://test/api/data/snapshot'))).status).toBe(503)
    expect(rpcCalls).toHaveLength(0)
    expect(await state.storage.getAlarm()).not.toBeNull()
  })
  test('reorg overlap drops orphaned logs, deduplicates replacements, and orders deterministically', () => {
    const before = modify(START + 1n, 1n, 3n)
    const orphan = modify(START + 5n, 1n, 7n)
    const replacement = { ...modify(START + 5n, 1n, 4n), transactionHash: pad('0xab') }
    expect(mergeLogs([before, orphan], [replacement, replacement], START + 2n, START + 5n)).toEqual([before, replacement])
    expect(mergeLogs([before, orphan], [], START + 2n, START + 3n)).toEqual([before])
  })
  test('position discovery handles adds, partial exits, burned positions and unrelated senders', () => {
    expect(
      positionRanges([
        modify(START + 1n, 1n, 100n),
        modify(START + 2n, 1n, -25n),
        modify(START + 3n, 2n, 80n),
        modify(START + 4n, 2n, -80n),
        modify(START + 5n, 3n, 90n, A.vault),
      ]),
    ).toEqual([['1', { tickLower: 69000, tickUpper: 71000, liquidity: 75n }]])
  })
  test('public route rejects arbitrary methods, origins and RPC-shaped paths before touching the index', async () => {
    const env = {
      MARKET: {
        get: () => {
          throw new Error('must not touch index')
        },
      },
    } as never
    const ctx = { waitUntil() {} } as never
    expect((await worker.fetch(new Request('https://test/api/data/rpc'), env, ctx)).status).toBe(404)
    expect((await worker.fetch(new Request('https://test/api/data/snapshot', { method: 'POST' }), env, ctx)).status).toBe(405)
    expect((await worker.fetch(new Request('https://test/api/data/snapshot', { headers: { Origin: 'https://unrelated.example' } }), env, ctx)).status).toBe(403)
  })
})
