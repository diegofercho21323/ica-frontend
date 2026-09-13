import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    // generateSW precaches the built app shell (JS/CSS/HTML) so a cached
    // route loads offline. registerType 'prompt' + injectRegister false hand
    // lifecycle control to src/app/pwa/registerSW.tsx instead of silently
    // auto-reloading the page underneath the operator.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Tallycore',
        short_name: 'Tallycore',
        description: 'Captura ciega de inventario',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f6f9',
        theme_color: '#0b5cd6',
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico}'],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
