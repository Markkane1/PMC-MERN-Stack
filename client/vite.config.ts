import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dynamicImport from 'vite-plugin-dynamic-import'

const normalizeId = (id: string) => id.split(path.sep).join('/')

const manualChunks = (id: string) => {
  const normalizedId = normalizeId(id)

  if (normalizedId.includes('/node_modules/react/') || normalizedId.includes('/node_modules/react-dom/') || normalizedId.includes('/node_modules/react-router')) {
    return 'vendor-react'
  }

  if (normalizedId.includes('/node_modules/react-apexcharts/') || normalizedId.includes('/node_modules/apexcharts/')) {
    return 'vendor-apexcharts'
  }

  if (normalizedId.includes('/node_modules/recharts/')) {
    return 'vendor-recharts'
  }

  if (normalizedId.includes('/node_modules/ol/')) {
    return 'vendor-openlayers'
  }

  if (normalizedId.includes('/node_modules/@react-google-maps/api/')) {
    return 'vendor-google-maps'
  }

  if (normalizedId.includes('/node_modules/material-react-table/') || normalizedId.includes('/node_modules/@tanstack/react-table/')) {
    return 'vendor-tables'
  }

  if (normalizedId.includes('/node_modules/@mui/') || normalizedId.includes('/node_modules/@emotion/')) {
    return 'vendor-mui'
  }

  if (normalizedId.includes('/node_modules/framer-motion/')) {
    return 'vendor-motion'
  }

  if (normalizedId.includes('/node_modules/axios/') || normalizedId.includes('/node_modules/swr/')) {
    return 'vendor-data'
  }

  if (normalizedId.includes('/node_modules/react-icons/')) {
    return 'vendor-icons'
  }

  if (normalizedId.includes('/node_modules/date-fns/') || normalizedId.includes('/node_modules/classnames/') || normalizedId.includes('/node_modules/lodash/')) {
    return 'vendor-utils'
  }

  if (normalizedId.includes('/src/views/AdvancedAnalyticsPage.tsx') || normalizedId.includes('/src/components/analytics/AnalyticsDashboard.tsx')) {
    return 'analytics-dashboard'
  }

  if (normalizedId.includes('/src/views/GISVisualizationPage.tsx') || normalizedId.includes('/src/components/gis/GISMapViewer.tsx') || normalizedId.includes('/src/views/supid/EPA/OpenLayersLocationPicker.tsx')) {
    return 'gis-dashboard'
  }

  return undefined
}

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
    rollupOptions: {
      output: {
        manualChunks,
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false,
    minify: 'esbuild',
    target: 'ES2020',
  }
})
