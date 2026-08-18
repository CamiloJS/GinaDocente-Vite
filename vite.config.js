import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
    versionPlugin(currentBuildTime)
  ],
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
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
})
