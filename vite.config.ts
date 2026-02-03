import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      './runtimeConfig': './runtimeConfig.browser'
    }
  },
  build: {
    // Force Rollup to ignore any lingering references if they exist deeply nested (which they shouldn't now)
    rollupOptions: {
      external: ['xlsx']
    }
  }
})