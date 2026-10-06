import { DurableObject } from 'cloudflare:workers'
import type { DataSnapshot, MarketLog } from '../../../src/lib/data-schema'
import { A, EVENT_TOPICS, POOL, START, buildSnapshot, clientFor, loadLogs, mergeLogs } from './chain'

interface Env {
  MARKET: DurableObjectNamespace<RemyData>
  ALCHEMY_API_KEY: string
}
const INTERVAL = 30_000
const MAX_AGE = 120_000
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { 'cache-control': status === 200 ? 'public, max-age=15' : 'no-store' } })

/** A single durable cursor and coalesced refresh for all visitors. Reads never trigger per-user RPC work. */
export class RemyData extends DurableObject<Env> {
  private refreshing?: Promise<void>
  private socket?: WebSocket
  private subscribed = new Set<number>()
  private connecting?: Promise<void>
  private lastNotificationAt: string | null = null
  private lastPublishedAt = 0

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
  }

  private readSnapshot(): DataSnapshot | undefined {
    const row = this.ctx.storage.sql.exec<{ value: string }>('SELECT value FROM cache WHERE key = ?', 'snapshot').toArray()[0]
    return row ? JSON.parse(row.value) : undefined
  }

  private async armSoon() {
    const due = Math.max(Date.now() + 1000, this.lastPublishedAt + 15_000)
    const alarm = await this.ctx.storage.getAlarm()
    if (alarm === null || alarm > due) await this.ctx.storage.setAlarm(due)
  }

  /** Two shared subscriptions, never one subscription per visitor or per token. HTTP backfills every gap. */
  private connectUpstream() {
    if (this.socket || this.connecting || !this.env.ALCHEMY_API_KEY) return this.connecting
    this.connecting = (async () => {
      try {
        const response = await fetch(`https://base-mainnet.g.alchemy.com/v2/${this.env.ALCHEMY_API_KEY}`, {
          headers: { Upgrade: 'websocket' },
        })
        const socket = response.webSocket
        if (!socket) return
        this.socket = socket
        socket.accept()
        socket.addEventListener('message', (event) => {
          try {
            const message = JSON.parse(String(event.data))
            if (message.error) {
              socket.close()
              return
            }
            if ((message.id === 1 || message.id === 2) && typeof message.result === 'string') this.subscribed.add(message.id)
            if (message.method === 'eth_subscription') {
              this.lastNotificationAt = new Date().toISOString()
              this.ctx.waitUntil(this.armSoon())
            }
          } catch {
            /* Ignore invalid upstream notifications; the HTTP cursor remains authoritative. */
          }
        })
        const disconnected = () => {
          if (this.socket === socket) {
            this.socket = undefined
            this.subscribed.clear()
          }
        }
        socket.addEventListener('close', disconnected)
        socket.addEventListener('error', () => {
          socket.close()
          disconnected()
        })
        socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_subscribe',
            params: ['logs', { address: A.poolManager, topics: [EVENT_TOPICS, POOL] }],
          }),
        )
        socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'eth_subscribe',
            params: ['logs', { address: [A.remy, A.fremy, A.vault] }],
          }),
        )
      } catch {
        /* Bounded HTTP polling recovers if WebSockets are unavailable. */
      }
    })().finally(() => {
      this.connecting = undefined
    })
    return this.connecting
  }

  private refresh() {
    if (this.refreshing) return this.refreshing
    this.refreshing = this.update().finally(() => {
      this.refreshing = undefined
    })
    return this.refreshing
  }

  private async update() {
    try {
      if (!this.env.ALCHEMY_API_KEY) throw new Error('Alchemy server key missing')
      const client = clientFor(this.env.ALCHEMY_API_KEY)
      const old = this.readSnapshot()
      const block = await client.getBlock({ blockTag: 'latest' })
      const cursor = old ? BigInt(old.block.number) : START
      // Re-read a 256-second overlap. A backward provider head starts at the lower head instead.
      const head = cursor < block.number ? cursor : block.number
      const from = head < START + 128n ? START : head - 128n
      const logs: MarketLog[] = mergeLogs(old?.logs ?? [], await loadLogs(client, from, block.number), from, block.number)
      const snapshot = await buildSnapshot(client, block, logs)
      // Cursor and snapshot commit together; a failed refresh preserves the last complete result.
      this.ctx.storage.sql.exec('INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)', 'snapshot', JSON.stringify(snapshot))
      this.lastPublishedAt = Date.now()
      await this.ctx.storage.put('error', null)
    } catch {
      // Provider errors can contain the credential URL. Keep public diagnostics and logs credential-free.
      await this.ctx.storage.put('error', {
        at: new Date().toISOString(),
        message: 'Alchemy refresh failed; retained the previous snapshot.',
      })
    } finally {
      await this.ctx.storage.setAlarm(Date.now() + (this.subscribed.size === 2 ? 60_000 : INTERVAL))
    }
  }

  async alarm() {
    await this.refresh()
    await this.connectUpstream()
  }

  async fetch(req: Request) {
    const path = new URL(req.url).pathname
    if (path !== '/api/data/snapshot' && path !== '/api/data/health') return json({ error: 'not found' }, 404)
    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now() + 1)
    }
    const snapshot = this.readSnapshot()
    const error = await this.ctx.storage.get('error')
    const ageMs = snapshot ? Date.now() - Date.parse(snapshot.generatedAt) : null
    const ok = ageMs !== null && ageMs <= MAX_AGE
    if (path.endsWith('/health'))
      return json(
        {
          ok,
          generatedAt: snapshot?.generatedAt ?? null,
          block: snapshot?.block.number ?? null,
          ageSeconds: ageMs === null ? null : Math.round(ageMs / 1000),
          events: snapshot?.logs.length ?? 0,
          positions: snapshot?.positions.length ?? 0,
          subscriptions: this.subscribed.size,
          lastNotificationAt: this.lastNotificationAt,
          lastError: error ?? null,
        },
        ok ? 200 : 503,
      )
    return ok ? json(snapshot) : json({ error: snapshot ? 'snapshot stale' : 'index warming up', generatedAt: snapshot?.generatedAt ?? null }, 503)
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)
    const origin = req.headers.get('origin')
    if (origin && !['https://basedremyboys.club', 'https://www.basedremyboys.club', 'http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin))
      return json({ error: 'origin not allowed' }, 403)
    if (req.method !== 'GET' && req.method !== 'HEAD') return json({ error: 'method not allowed' }, 405)
    if (url.pathname !== '/api/data/snapshot' && url.pathname !== '/api/data/health') return json({ error: 'not found' }, 404)
    // Ignore arbitrary query strings so they cannot bypass the shared edge cache.
    const cacheKey = new Request(`${url.origin}${url.pathname}`)
    let response = await caches.default.match(cacheKey)
    if (!response) {
      response = await env.MARKET.get(env.MARKET.idFromName('base-remy-v1')).fetch(cacheKey)
      if (response.ok) ctx.waitUntil(caches.default.put(cacheKey, response.clone()))
    }
    const headers = new Headers(response.headers)
    if (origin) {
      headers.set('access-control-allow-origin', origin)
      headers.set('vary', 'Origin')
    }
    return new Response(req.method === 'HEAD' ? null : response.body, { status: response.status, headers })
  },
} satisfies ExportedHandler<Env>
