import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config tuned for Capacitor + React.
// - base: './' ensures relative asset paths inside WKWebView.
// - sourcemap helps debugging in Xcode.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    sourcemap: true,
    target: 'es2022'
  },
})
