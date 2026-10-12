// Square meme renderer: a meme set module exports { size, css, memes: [{ name, html }] }; every meme is written as
// an HTML page next to its PNG and screenshotted by headless Chromium (Playwright from ~/dev/filmkit).
//
//   node scripts/meme/render.mjs scripts/meme/sets/ipd2026.mjs [--scale 2] [--only name,name]
//
// Pages load assets relative to output/meme/ (e.g. cut/42.png from scripts/meme/cutout.py) and fonts from
// filmkit's core/fonts. Output: output/meme/<set>/<nn>-<name>.png at size×scale px.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(pathToFileURL(path.join(os.homedir(), 'dev/filmkit/node_modules/playwright/index.mjs')).href);

const args = process.argv.slice(2);
const setPath = path.resolve(args[0]);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i < 0 ? d : args[i + 1];
};
const scale = Number(opt('scale', 2));
const only = opt('only', '')?.split(',').filter(Boolean) ?? [];
const set = await import(pathToFileURL(setPath).href);
const setName = path.basename(setPath, '.mjs');
const outDir = path.join(ROOT, 'output/meme', setName);
await mkdir(outDir, { recursive: true });

const FONTS = pathToFileURL(path.join(os.homedir(), 'dev/filmkit/core/fonts')).href;
const size = set.size ?? 1080;
const page = (m) => `<!doctype html><html><head><meta charset="utf-8">
<base href="${pathToFileURL(path.join(ROOT, 'output/meme')).href}/">
<style>
@font-face { font-family: Anton; src: url(${FONTS}/anton.woff2); }
@font-face { font-family: Grot; src: url(${FONTS}/space-grotesk.woff2); font-weight: 300 700; }
@font-face { font-family: Serif; src: url(${FONTS}/cormorant.woff2); font-weight: 300 700; }
html, body { margin: 0; background: #000; }
#stage { position: relative; width: ${size}px; height: ${size}px; overflow: hidden; background: #fff;
  font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; }
#stage * { box-sizing: border-box; }
${set.css ?? ''}
</style></head><body><div id="stage">${m.html}</div></body></html>`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: scale });
const tab = await ctx.newPage();
let n = 0;
for (const m of set.memes) {
  n++;
  if (only.length && !only.includes(m.name)) continue;
  const base = `${String(n).padStart(2, '0')}-${m.name}`;
  const htmlPath = path.join(outDir, `${base}.html`);
  await writeFile(htmlPath, page(m));
  await tab.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await tab.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode())));
    const bad = [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src);
    if (bad.length) throw new Error(`images failed: ${bad.join(', ')}`);
  });
  const file = path.join(outDir, `${base}.png`);
  await tab.locator('#stage').screenshot({ path: file });
  console.log(file);
}
await browser.close();
