import { type IndexState, type RunMeta, runIndex } from './snapshot'

export interface Env {
  INDEX: KVNamespace
  /** Secret for GET /api/admin/refresh?key=…[&full] (manual run; `full` forces a rebuild). */
  REFRESH_KEY?: string
  /** Secret: Alchemy `remy index` server key, the only RPC for Base and Ethereum mainnet reads. */
  ALCHEMY_API_KEY: string
}

/** KV keys: full snapshot JSON, indexer state, and small run metadata for /health and /stats. */
const K = { snapshot: 'snapshot', state: 'state', meta: 'meta' } as const

const STALE_AFTER_S = 3600

const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?basedremyboys\.club$/,
  /^https:\/\/([a-z0-9-]+\.)*remyboysfrontend\.pages\.dev$/,
  /^https:\/\/([a-z0-9-]+\.)*remyboys\.pages\.dev$/,
  /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/,
]

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.some((re) => re.test(origin))) return { vary: 'Origin' }
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

function json(req: Request, body: string, status = 200, cache = 'public, max-age=60') {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache, ...corsHeaders(req) },
  })
}

/**
 * Runs the indexer from the stored state and persists the result. A quiet run (no tracked events since the last
 * build) only re-stamps the stored snapshot's `generatedAt`/`block`, keeping CPU far under the Free-plan limit.
 */
async function run(env: Env, force = false): Promise<RunMeta> {
  const stored = await env.INDEX.get<IndexState>(K.state, 'json')
  const prev = stored?.v === 1 && stored.builtAt ? stored : null
  try {
    const result = await runIndex(prev, env.ALCHEMY_API_KEY, force)
    if (result.quiet) {
      const body = await env.INDEX.get(K.snapshot)
      const generatedAt = new Date().toISOString()
      const head = `{"generatedAt":"${generatedAt}","block":${result.stats.block},`
      const stamped = body?.replace(/^\{"generatedAt":"[^"]*","block":\d+,/, head)
      if (!stamped?.startsWith(head)) return run(env, true)
      const meta: RunMeta = { generatedAt, block: result.stats.block, stats: result.stats }
      await Promise.all([env.INDEX.put(K.snapshot, stamped), env.INDEX.put(K.meta, JSON.stringify(meta))])
      return meta
    }
    const { snapshot, state, stats } = result
    const meta: RunMeta = { generatedAt: snapshot.generatedAt, block: snapshot.block, stats }
    await Promise.all([
      env.INDEX.put(K.snapshot, JSON.stringify(snapshot)),
      env.INDEX.put(K.state, JSON.stringify(state)),
      env.INDEX.put(K.meta, JSON.stringify(meta)),
    ])
    return meta
  } catch (e) {
    const old = await env.INDEX.get<RunMeta>(K.meta, 'json')
    const lastError = { at: new Date().toISOString(), message: (e as Error).message }
    if (old) await env.INDEX.put(K.meta, JSON.stringify({ ...old, lastError }))
    throw e
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(req, '{"error":"method not allowed"}', 405, 'no-store')

    switch (url.pathname) {
      case '/api/admin/snapshot': {
        const body = await env.INDEX.get(K.snapshot, { cacheTtl: 60 })
        return body ? json(req, body) : json(req, '{"error":"no snapshot yet"}', 503, 'no-store')
      }
      case '/api/admin/health': {
        const meta = await env.INDEX.get<RunMeta>(K.meta, { type: 'json', cacheTtl: 60 })
        if (!meta) return json(req, JSON.stringify({ ok: false, generatedAt: null, block: null, ageSeconds: null }), 503, 'no-store')
        const ageSeconds = Math.round((Date.now() - Date.parse(meta.generatedAt)) / 1000)
        return json(
          req,
          JSON.stringify({ ok: ageSeconds < STALE_AFTER_S, generatedAt: meta.generatedAt, block: meta.block, ageSeconds }),
          200,
          'public, max-age=30',
        )
      }
      case '/api/admin/stats': {
        const meta = await env.INDEX.get(K.meta)
        return json(req, meta ?? 'null', 200, 'no-store')
      }
      case '/api/admin/refresh': {
        if (!env.REFRESH_KEY || url.searchParams.get('key') !== env.REFRESH_KEY)
          return json(req, '{"error":"forbidden"}', 403, 'no-store')
        const meta = await run(env, url.searchParams.has('full'))
        return json(req, JSON.stringify(meta), 200, 'no-store')
      }
      default:
        return json(req, '{"error":"not found"}', 404, 'no-store')
    }
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(run(env))
  },
} satisfies ExportedHandler<Env>
