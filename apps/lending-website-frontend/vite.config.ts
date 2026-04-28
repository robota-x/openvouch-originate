import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const lendingApiUrl = env.VITE_API_BASE_URL || 'http://localhost:8787'
  const identityApiUrl = env.VITE_IDENTITY_API_BASE_URL || 'http://localhost:8789'

  return {
    plugins: [
      tailwindcss(),  // must precede vue()
      vue(),
    ],

    // Dev proxy: forwards /api/* to the backend so the browser never makes a
    // cross-origin request during development. In production the frontend build
    // uses the full VITE_API_BASE_URL or relies on CF Pages routing.
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target:       lendingApiUrl,
          changeOrigin: true,
        },
        '/identity-api': {
          target:       identityApiUrl,
          changeOrigin: true,
          rewrite:      (p) => p.replace(/^\/identity-api/, ''),
        },
      },
    },

    test: {
      environment: 'happy-dom',
    },
  }
})
