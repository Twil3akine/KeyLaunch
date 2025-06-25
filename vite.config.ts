// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        background: 'public/background.js' // 追加
      },
      output: {
        entryFileNames: 'assets/[name].js'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  }
})

