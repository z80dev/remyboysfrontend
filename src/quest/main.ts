import { art } from './art'
import { titleScreen } from './scenes'
import { loadingStage } from './scenestage'
import { mountShell } from './shell'
import { fade, sleep } from './ui'

mountShell(document.getElementById('quest') as HTMLElement)

void (async () => {
  const loading = document.createElement('div')
  loading.className = 'scene loading'
  loading.setAttribute('role', 'status')
  loading.setAttribute('aria-label', 'Loading the Remy collection')
  document.querySelector('.screen')?.append(loading)
  loadingStage(loading, () => art.progress)
  await Promise.all([art.ready, document.fonts.ready])
  // Let the bar's last segments land before the fade.
  await sleep(500)
  await fade(true, 250)
  loading.remove()
  await titleScreen()
})()
