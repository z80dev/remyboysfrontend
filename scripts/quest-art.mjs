#!/usr/bin/env node
/** Stage 1 of `npm run quest:art` (requires ffmpeg and cwebp): the art catalogue and 32px portraits.
 * 96px area sampling -> palette samples, art-derived types/epithets (art.json) and quantized minis.webp.
 * Stage 2 (quest-art.py) cuts the Remys out and paints sprites, heads and the canonical bald (Cabald) flags.
 * All indices, palette samples and type balancing are deterministic across worker order.
 */
import { spawn } from 'node:child_process'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const OUT = `${ROOT}public/quest/`
const COUNT = 4490
const COLS = 67
const ROWS = Math.ceil(COUNT / COLS)
const SIZE = 96
const FRAME = SIZE * SIZE * 4
const minis = Buffer.alloc(COLS * 32 * ROWS * 32 * 4)
const records = new Array(COUNT)
const scores = new Array(COUNT)

function run(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    const out = []
    const err = []
    child.stdout.on('data', (b) => out.push(b))
    child.stderr.on('data', (b) => err.push(b))
    child.on('error', reject)
    child.on('close', (code) => code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`${command}: ${Buffer.concat(err)}`)))
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
}
const pixel = (b, x, y) => [...b.subarray((Math.round(y) * SIZE + Math.round(x)) * 4, (Math.round(y) * SIZE + Math.round(x)) * 4 + 3)]
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))
const saturation = (c) => Math.max(...c) - Math.min(...c)
const hex = (c) => c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
function sample(b, points) {
  const cs = points.map(([x, y]) => pixel(b, x, y))
  return [0, 1, 2].map((i) => cs.map((c) => c[i]).sort((a, b) => a - b)[Math.floor(cs.length / 2)])
}
function hue(c) {
  const max = Math.max(...c)
  const min = Math.min(...c)
  const d = max - min
  if (!d) return 0
  return ((max === c[0] ? (c[1] - c[2]) / d : max === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4) * 60 + 360) % 360
}
function colorName(c) {
  if (saturation(c) < 28) return Math.max(...c) < 65 ? 'Midnight' : Math.max(...c) > 195 ? 'Pearl' : 'Silver'
  const h = hue(c)
  return h < 20 || h >= 345 ? 'Crimson' : h < 48 ? 'Copper' : h < 75 ? 'Gold' : h < 165 ? 'Moss' : h < 200 ? 'Aqua' : h < 260 ? 'Cobalt' : h < 300 ? 'Violet' : 'Candy'
}
function put(atlas, size, idx, x, y, c, alpha = 255) {
  const p = (((Math.floor(idx / COLS) * size + y) * COLS * size) + (idx % COLS) * size + x) * 4
  const step = size === 32 ? 32 : 24
  for (let k = 0; k < 3; k++) atlas[p + k] = Math.min(255, Math.round(c[k] / step) * step)
  atlas[p + 3] = alpha
}
function analyze(b, idx) {
  const skin = sample(b, [[48, 52], [52, 55], [54, 54], [49, 57], [51, 59]])
  const hair = sample(b, [[40, 22], [48, 20], [55, 23], [35, 25], [59, 27]])
  const shirt = sample(b, [[37, 78], [36, 84], [63, 81], [64, 85], [42, 74]])
  const bg = sample(b, [[5, 5], [90, 5], [5, 48], [90, 48], [5, 90], [90, 90]])
  const eye = sample(b, [[43, 50], [44, 49], [64, 48]])
  const bald = distance(skin, hair) < 40
  const side = sample(b, [[24, 51], [25, 55], [68, 58]])
  const brim = sample(b, [[42, 32], [49, 31], [58, 30]])
  const hat = !bald && Math.min(...brim) > 175 && saturation(brim) < 45 && distance(brim, hair) > 70
  const hairStyle = bald ? 0 : hat ? 4 : distance(side, hair) < 55 ? 3 : 1
  const shades = [[52, 45], [54, 45], [56, 45], [54, 47]].filter(([x, y]) => Math.max(...pixel(b, x, y)) < 65).length >= 3
  const accent = [hair, shirt, eye].sort((a, c) => saturation(c) - saturation(a))[0]
  const epithet = `${colorName(bald ? shirt : hair)} ${shades ? 'Shades' : bald ? 'Soul' : hat ? 'Visor' : hairStyle === 3 ? 'Flow' : 'Crown'}`
  records[idx] = [skin, hair, shirt, bg, accent, eye].map(hex).concat([hairStyle, Number(shades), 0, Number(bald), epithet])
  const h = hue(accent)
  const targets = [125, 25, 215, 300]
  scores[idx] = targets.map((target, t) => saturation(accent) / 255 * (1 - Math.min(Math.abs(h - target), 360 - Math.abs(h - target)) / 180) + (((idx * 1664525 + t * 1013904223) >>> 0) % 997) / 9970)

  // Area-reduced portraits retain the actual photograph, deliberately posterized rather than blurred.
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const c = [0, 0, 0]
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
      const p = ((y * 3 + dy) * SIZE + x * 3 + dx) * 4
      for (let k = 0; k < 3; k++) c[k] += b[p + k] / 9
    }
    put(minis, 32, idx, x, y, c)
  }
}

await mkdir(OUT, { recursive: true })
const batch = 128
let next = 0
let complete = 0
await Promise.all(Array.from({ length: Math.min(8, availableParallelism()) }, async () => {
  while (next < COUNT) {
    const start = next
    next += batch
    const count = Math.min(batch, COUNT - start)
    const bytes = await run('ffmpeg', ['-v', 'error', '-threads', '1', '-start_number', String(start), '-i', `${ROOT}public/images/Character%d.webp`, '-frames:v', String(count), '-vf', `scale=${SIZE}:${SIZE}:flags=area`, '-threads', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'])
    if (bytes.length !== count * FRAME) throw new Error(`Incomplete batch at ${start}: ${bytes.length}`)
    for (let i = 0; i < count; i++) analyze(bytes.subarray(i * FRAME, (i + 1) * FRAME), start + i)
    complete += count
    if (complete % 512 === 0 || complete === COUNT) console.log(`Analyzed ${complete}/${COUNT}`)
  }
}))
// Assign most confident art matches first, cap each type at 25%; ambiguous colors fill the gaps.
const distribution = [0, 0, 0, 0]
const order = scores.map((s, idx) => ({ idx, confidence: Math.max(...s) - [...s].sort((a, b) => b - a)[1] })).sort((a, b) => b.confidence - a.confidence || a.idx - b.idx)
for (const { idx } of order) {
  const choices = [0, 1, 2, 3].sort((a, b) => scores[idx][b] - scores[idx][a] || a - b)
  const type = choices.find((t) => distribution[t] < Math.floor(COUNT / 4) + Number(t < COUNT % 4))
  records[idx][8] = type
  distribution[type]++
}
await writeFile(`${OUT}art.json`, JSON.stringify({ v: 1, cols: COLS, count: COUNT, rows: records }))
for (const [name, size, bytes] of [['minis', 32, minis]]) {
  const temp = `${OUT}.${name}.png`
  await run('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${COLS * size}x${ROWS * size}`, '-i', '-', '-frames:v', '1', '-threads', '1', temp], bytes)
  await run('cwebp', ['-quiet', '-lossless', '-z', '9', '-exact', temp, '-o', `${OUT}${name}.webp`])
  await rm(temp)
}
const sizes = await Promise.all(['art.json', 'minis.webp'].map(async (name) => [name, (await stat(`${OUT}${name}`)).size]))
console.log(JSON.stringify({ distribution: Object.fromEntries(['BULL', 'BEAR', 'WHALE', 'DEGEN'].map((t, i) => [t, distribution[i]])), sizes, total: sizes.reduce((n, [, size]) => n + size, 0) }, null, 2))
