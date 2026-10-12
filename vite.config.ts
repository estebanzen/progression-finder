import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/progression-finder/',
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'icons.svg', 'apple-touch-icon.png'],
    manifest: {
      id: '/progression-finder/',
      name: 'ProgressionFinder',
      short_name: 'ProgressionFinder',
      description: 'Explorá escalas, analizá progresiones y escuchá acordes.',
      lang: 'es',
      start_url: '/progression-finder/',
      scope: '/progression-finder/',
      display: 'standalone',
      theme_color: '#13111f',
      background_color: '#13111f',
      icons: [
        { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,mp3}'],
      navigateFallback: '/progression-finder/index.html',
      cleanupOutdatedCaches: true,
    },
  })],
})
