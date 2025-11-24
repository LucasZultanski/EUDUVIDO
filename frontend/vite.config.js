import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/api/challenges': {
        target: 'http://localhost:8082',
        changeOrigin: true
      },
      '/api/dashboard': {
        target: 'http://localhost:8082',
        changeOrigin: true
      },
      '/api/proofs': {
        target: 'http://localhost:8084',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // Already logs: '[proxy /api/proofs] offline:', err.code
            // To suppress, just comment out or remove the console.warn below:
            // console.warn('[proxy /api/proofs] offline:', err.code)
          })
        }
      },
      '/api/wallet': {
        target: 'http://localhost:8083',
        changeOrigin: true
      },
      '/api/friends': {
        target: 'http://localhost:8086',
        changeOrigin: true
      },
      '/api/friend-requests': {
        target: 'http://localhost:8086',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
