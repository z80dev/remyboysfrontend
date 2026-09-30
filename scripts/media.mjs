/**
 * Art pipeline for the remy-media Worker (workers/remy-media, R2 bucket `remy-media`, served at /media/*).
 *
 *   node scripts/media.mjs build   write every Remy variant into .cache/media (no network)
 *   node scripts/media.mjs sync    build, then upload new or changed objects (MEDIA_UPLOAD_TOKEN required)
 *
 * Keys (see src/lib/media.ts):
 *   remy/<recipe>/<width>/<idx>.webp   128/320 px resized from media/remy/Character<idx>.webp; 600 is the original bytes
 *   quest/<hash>/<path>                media/quest/<path>, versioned by a content hash of the whole directory
 * Sync compares local MD5s with the R2 ETags from the Worker's list endpoint, so reruns only upload what changed.
 * vite.config.ts imports questVersion() and localFile() to serve the same keys in dev.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { REMY_RECIPE, REMY_WIDTHS, remyKey } from '../src/lib/media.ts'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const ORIGINALS = join(ROOT, 'media/remy')
const QUEST = join(ROOT, 'media/quest')
const CACHE = join(ROOT, '.cache/media')
const REMY_COUNT = 4490
const QUALITY = 82

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(path)))
    else if (entry.isFile()) out.push(path)
  }
  return out
}

/** media/quest files as [relative posix path, absolute path], sorted. */
async function questFiles() {
  const files = await walk(QUEST)
  return files.map((f) => [relative(QUEST, f).split(sep).join('/'), f]).sort(([a], [b]) => (a < b ? -1 : 1))
}

/** 16-hex content hash of media/quest: paths and bytes, so any regenerated file moves every Quest URL. */
export async function questVersion() {
  const h = createHash('sha256')
  for (const [rel, file] of await questFiles()) {
    h.update(rel)
    h.update('\0')
    h.update(await readFile(file))
    h.update('\0')
  }
  return h.digest('hex').slice(0, 16)
}

let sharp
/** Local file for a Remy variant; resized variants are generated into .cache/media on first use. */
async function remyFile(idx, width) {
  const original = join(ORIGINALS, `Character${idx}.webp`)
  if (width === 600) return original
  const file = join(CACHE, remyKey(idx, width))
  if (existsSync(file)) return file
  sharp ??= (await import('sharp')).default
  const webp = await sharp(original).resize({ width, height: width, fit: 'inside' }).webp({ quality: QUALITY, effort: 6 }).toBuffer()
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, webp)
  await rename(tmp, file)
  return file
}

const REMY_KEY = new RegExp(`^remy/${REMY_RECIPE}/(\\d+)/(\\d+)\\.webp$`)
const QUEST_KEY = /^quest\/[0-9a-f]{16}\/([\w-]+(?:\/[\w-]+)*\.(?:webp|json))$/

/** Dev server: a /media key to a local file (Quest keys ignore the hash), or null when it isn't one of ours. */
export async function localFile(key) {
  const remy = REMY_KEY.exec(key)
  if (remy) {
    const width = Number(remy[1])
    const idx = Number(remy[2])
    if (!REMY_WIDTHS.includes(width) || idx >= REMY_COUNT) return null
    return remyFile(idx, width)
  }
  const quest = QUEST_KEY.exec(key)
  if (quest) {
    const file = join(QUEST, quest[1])
    return existsSync(file) ? file : null
  }
  return null
}

export const contentType = (key) => (key.endsWith('.json') ? 'application/json' : 'image/webp')

/** Runs `fn` over `items` with at most `limit` in flight; rejects on the first failure. */
async function pool(items, limit, fn) {
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++])
    }),
  )
}

/** Every object the site needs, as { key, file }. Generates missing Remy variants. */
async function build() {
  const entries = []
  for (let idx = 0; idx < REMY_COUNT; idx++) for (const w of REMY_WIDTHS) entries.push({ key: remyKey(idx, w), idx, w })
  let done = 0
  await pool(entries, availableParallelism(), async (e) => {
    e.file = await remyFile(e.idx, e.w)
    if (++done % 1000 === 0) console.log(`variants ${done}/${entries.length}`)
  })
  const version = await questVersion()
  for (const [rel, file] of await questFiles()) entries.push({ key: `quest/${version}/${rel}`, file })
  return { entries, version }
}

async function remoteEtags(origin, token, prefix) {
  const etags = new Map()
  let cursor = ''
  do {
    const url = `${origin}/media/_admin/list?prefix=${encodeURIComponent(prefix)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`list ${prefix}: ${res.status} ${await res.text()}`)
    const page = await res.json()
    for (const o of page.objects) etags.set(o.key, o.etag)
    cursor = page.cursor ?? ''
  } while (cursor)
  return etags
}

async function sync() {
  const origin = (process.env.MEDIA_ORIGIN ?? 'https://basedremyboys.club').replace(/\/$/, '')
  const token = process.env.MEDIA_UPLOAD_TOKEN
  if (!token) throw new Error('MEDIA_UPLOAD_TOKEN is not set (the remy-media Worker secret)')
  const { entries, version } = await build()
  const remote = new Map([
    ...(await remoteEtags(origin, token, `remy/${REMY_RECIPE}/`)),
    ...(await remoteEtags(origin, token, `quest/${version}/`)),
  ])
  const todo = []
  for (const e of entries) {
    if (remote.get(e.key) !== createHash('md5').update(await readFile(e.file)).digest('hex')) todo.push(e)
  }
  console.log(`${entries.length} objects, ${entries.length - todo.length} already in R2, uploading ${todo.length}`)
  let done = 0
  await pool(todo, 16, async (e) => {
    const body = await readFile(e.file)
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(`${origin}/media/${e.key}`, {
        method: 'PUT',
        headers: { authorization: `Bearer ${token}`, 'content-type': contentType(e.key) },
        body,
      }).catch((error) => ({ ok: false, status: 0, text: async () => String(error) }))
      if (res.ok) break
      if (attempt === 4) throw new Error(`PUT ${e.key}: ${res.status} ${await res.text()}`)
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
    }
    if (++done % 500 === 0 || done === todo.length) console.log(`uploaded ${done}/${todo.length}`)
  })
  console.log(`Quest art version ${version}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const cmd = process.argv[2]
  if (cmd === 'build') {
    const { entries, version } = await build()
    console.log(`${entries.length} objects ready (Quest art version ${version})`)
  } else if (cmd === 'sync') await sync()
  else {
    console.error('usage: node scripts/media.mjs build|sync')
    process.exit(1)
  }
}
