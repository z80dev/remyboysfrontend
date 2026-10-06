/**
 * Local runner: builds the same snapshot the Worker's cron does.
 *   bun run build-snapshot [--out snapshot.json] [--dir .state] [--fresh]
 * Writes state.json / snapshot.json / meta.json (the Worker's KV keys) into --dir, the snapshot to --out or
 * stdout, and run stats to stderr. State (log cursor, candidates, code/name caches) carries over between runs;
 * --fresh ignores it and rescans from the deploy block with Blockscout seeding. `bun run seed` uploads the
 * files to the production KV namespace (Blockscout rate-limits Cloudflare egress, so seed from here).
 */
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { type IndexState, type RunMeta, runIndex } from '../src/snapshot'

const { values } = parseArgs({
  options: {
    out: { type: 'string' },
    dir: { type: 'string', default: join(import.meta.dir, '../.state') },
    fresh: { type: 'boolean', default: false },
  },
})
const dir = values.dir as string
const statePath = join(dir, 'state.json')
const prev: IndexState | null =
  !values.fresh && existsSync(statePath) ? ((await Bun.file(statePath).json()) as IndexState) : null

const alchemyKey = process.env.ALCHEMY_API_KEY
if (!alchemyKey) throw new Error('set ALCHEMY_API_KEY (the Alchemy `remy index` server key)')
const cpu0 = process.cpuUsage()
// The local runner always rebuilds (quiet runs only make sense against the Worker's stored snapshot).
const result = await runIndex(prev, alchemyKey, true)
const cpu = process.cpuUsage(cpu0)
if (result.quiet) throw new Error('unreachable: forced run came back quiet')
const { snapshot, state, stats } = result
const json = JSON.stringify(snapshot)
const meta: RunMeta = { generatedAt: snapshot.generatedAt, block: snapshot.block, stats }

mkdirSync(dir, { recursive: true })
await Promise.all([
  Bun.write(statePath, JSON.stringify(state)),
  Bun.write(join(dir, 'snapshot.json'), json),
  Bun.write(join(dir, 'meta.json'), JSON.stringify(meta)),
])
if (values.out) await Bun.write(values.out, json)
else process.stdout.write(`${json}\n`)
console.error(
  JSON.stringify({ ...stats, processCpuMs: Math.round((cpu.user + cpu.system) / 1000), bytes: json.length }, null, 2),
)
