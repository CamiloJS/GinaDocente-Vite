import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icono.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'English TECH Unipamplona',
        short_name: 'English TECH',
        description: 'Plataforma de clases de inglés de la profesora Gina Marcela Quintana Delgado (Universidad de Pamplona).',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#AD3333',
        orientation: 'portrait-primary',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    open: false,
    // En desarrollo, /api/gemini se redirige al endpoint de Vercel existente
    proxy: {
      '/api/gemini': {
        target: 'https://gina-docente.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
})
