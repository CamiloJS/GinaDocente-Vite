import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

const currentBuildTime = Date.now();

const versionPlugin = (buildTime) => ({
  name: 'version-generator',
  transformIndexHtml(html) {
    return html.replace(/__BUILD_TIMESTAMP__/g, String(buildTime));
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ version: buildTime, buildTime: new Date(buildTime).toISOString() })
    });
  }
});

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 49', 'firefox >= 52', 'safari >= 10', 'edge >= 15', 'not IE 11'],
      renderLegacyChunks: true
    }),
    versionPlugin(currentBuildTime)
  ],
  esbuild: {
    target: 'es2018'
  },
  define: {
    __APP_BUILD_TIME__: currentBuildTime
  },
  server: {
    port: 5173,
    host: true,
    open: false,
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
    target: 'es2018',
    cssTarget: 'chrome61',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
})
