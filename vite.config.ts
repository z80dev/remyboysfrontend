import { createReadStream } from 'node:fs'
import react from '@vitejs/plugin-react'
import { type Connect, type Plugin, defineConfig } from 'vite'
import { contentType, localFile, questVersion } from './scripts/media.mjs'

/** Serves /media/<key> from media/ and .cache/media (resizing on demand), mirroring the remy-media Worker. */
function localMedia(): Plugin {
  const serve: Connect.NextHandleFunction = (req, res, next) => {
    // Connect strips the /media mount, leaving "/<key>".
    const key = decodeURIComponent((req.url ?? '').split('?')[0].slice(1))
    localFile(key)
      .then((file) => {
        if (!file) {
          res.statusCode = 404
          res.end('Not found')
          return
        }
        res.setHeader('content-type', contentType(key))
        res.setHeader('cache-control', 'no-cache')
        createReadStream(file).pipe(res)
      })
      .catch(next)
  }
  return {
    name: 'remy-local-media',
    configureServer: (server) => void server.middlewares.use('/media/', serve),
    configurePreviewServer: (server) => void server.middlewares.use('/media/', serve),
  }
}

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), localMedia()],
  define: { __QUEST_MEDIA__: JSON.stringify(await questVersion()) },
  server: {
    proxy: {
      '/api/remix': 'http://127.0.0.1:8788',
    },
  },
  build: {
    rollupOptions: {
      // Remy OS shell + the standalone Remy Quest game (embedded by the OS, also playable full screen at /quest/).
      input: { main: 'index.html', quest: 'quest/index.html' },
    },
  },
}))
