import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // <--- THIS IS THE KEY FIX (Must be './' not '/')
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})