import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import dynamicImport from 'vite-plugin-dynamic-import'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dynamicImport()],
  assetsInclude: ['**/*.md'],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        // allow backend port to be overridden via env variable for easier
        // dev setups where API runs on 8000 or another host.
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'build',
    // Week 3: Code splitting - manual chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries - load once, reuse across all chunks
          'react': ['react', 'react-dom', 'react-router-dom'],
          
          // UI & data libraries
          'ui': ['@tanstack/react-table', '@mui/material', '@mui/icons-material'],
          
          // Data visualization
          'charts': ['react-apexcharts', 'apexcharts'],
          
          // Data fetching & caching
          'data': ['swr', 'axios'],
          
          // Utilities
          'utils': ['lodash', 'date-fns', 'classnames'],
          
          // Virtualization for large lists
          'virtual': ['react-window'],
          
          // Icons & theming
          'icons': ['react-icons'],
        },
        // Optimize chunk file sizes
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    },
    // Increase chunk size warning threshold (default: 500KB)
    chunkSizeWarningLimit: 600,
    // Source maps in production for debugging
    sourcemap: false,
    // Minify with esbuild (fast)
    minify: 'esbuild',
    // Target modern browsers
    target: 'ES2020',
  }
})
