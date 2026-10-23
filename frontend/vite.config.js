import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
  const api = { target, changeOrigin: true }
  const proxy = {
    '^/(analyze|health|languages|radar|report|mock)([/?].*)?$': api,
    '^/admin/.*': api,
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,woff2}'],
          runtimeCaching: [{
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [0, 200] },
            },
          }],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/admin/, /^\/console/],
        },
        manifest: {
          name: 'CyberCheckmate',
          short_name: 'CheckMate',
          description: 'Detect scams before they reach you',
          theme_color: '#051F20',
          background_color: '#051F20',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          share_target: {
            action: '/share',
            method: 'POST',
            enctype: 'multipart/form-data',
            params: {
              title: 'title',
              text: 'text',
              url: 'url',
              files: [{ name: 'image', accept: ['image/*'] }],
            },
          },
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        devOptions: { enabled: true },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@contracts': fileURLToPath(new URL('../contracts', import.meta.url)),
      },
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy,
      fs: { allow: ['..'] },
    },
    preview: {
      port: 4173,
      strictPort: true,
      proxy,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('scheduler')) {
                return 'vendor-react'
              }
              if (id.includes('motion') || id.includes('gsap')) {
                return 'vendor-animation'
              }
              if (id.includes('@hugeicons')) {
                return 'vendor-icons'
              }
            }
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/__tests__/setup.js'],
    },
  }
})
