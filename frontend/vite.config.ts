import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import tailwindcss from '@tailwindcss/vite'
import cesium from 'vite-plugin-cesium';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    [react(),tailwindcss(),cesium()],
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/cesium/Build/Cesium/Workers',
          dest: 'cesium'
        },
        {
          src: 'node_modules/cesium/Build/Cesium/ThirdParty',
          dest: 'cesium'
        },
        {
          src: 'node_modules/cesium/Build/Cesium/Assets',
          dest: 'cesium'
        },
        {
          src: 'node_modules/cesium/Build/Cesium/Widgets',
          dest: 'cesium'
        }
      ]
    })
  ],
  define: {
    // Define CESIUM_BASE_URL for proper asset loading
    CESIUM_BASE_URL: JSON.stringify('/cesium/')
  },
  optimizeDeps: {
    // Pre-bundle cesium for better performance
    include: ['cesium']
  },
  server: {
    // Configure dev server
    fs: {
      allow: ['..']
    }
  },
  build: {
    // Increase chunk size limit for cesium
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          cesium: ['cesium']
        }
      }
    }
  }
})