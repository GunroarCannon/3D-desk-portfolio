import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // ✅ important for Render or any static host
  build: {
    outDir: 'dist'
  }
})
