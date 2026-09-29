import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
