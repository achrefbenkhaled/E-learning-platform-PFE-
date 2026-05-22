import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: true,
  },
  build: {
    // Split vendor libraries into separate chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react'],
          'vendor-state': ['zustand', 'axios'],
        },
      },
    },
    // Suppress chunk size warning (we handle splitting ourselves)
    chunkSizeWarningLimit: 600,
  },
})
