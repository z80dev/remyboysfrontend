import { art } from './art'
import { titleScreen } from './scenes'
import { mountShell } from './shell'
import { fade } from './ui'

mountShell(document.getElementById('quest') as HTMLElement)

void (async () => {
  const loading = document.createElement('div')
  loading.setAttribute('role', 'status')
  loading.setAttribute('aria-label', 'Loading the Remy collection')
  loading.style.cssText = 'position:absolute;inset:0;z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12rem;background:#10283c;color:#f5ecd2;font-family:\"Press Start 2P\",monospace;text-align:center'
  loading.innerHTML = `
    <div style="font-size:7rem;letter-spacing:3rem;color:#7bd1bb">REMY QUEST</div>
    <div style="font-size:17rem;text-shadow:2rem 2rem #176854">ART IS ALIVE</div>
    <div style="width:140rem;padding:3rem;border:1rem solid #7198a2;background:#081923">
      <div data-art-bar style="height:5rem;width:0;background:#f2cd72;transition:width .18s steps(8)"></div>
    </div>
    <div style="font-size:5rem;color:#a8c5ce">LOADING 4,490 ORIGINALS…</div>`
  document.querySelector('.screen')?.append(loading)
  const bar = loading.querySelector('[data-art-bar]') as HTMLElement
  const progress = setInterval(() => { bar.style.width = `${Math.max(4, art.progress * 100)}%` }, 80)
  await Promise.all([art.ready, document.fonts.ready])
  clearInterval(progress)
  bar.style.width = '100%'
  await fade(true, 1)
  loading.remove()
  await titleScreen()
})()
