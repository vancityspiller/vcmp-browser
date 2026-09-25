import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Tauri shows its own startup output; let it stay on screen
  clearScreen: false,

  server: {
    port: 3000,
    // the Tauri dev command expects this exact port
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**', '**/crates/**', '**/target/**']
    }
  },

  envPrefix: ['VITE_', 'TAURI_'],

  build: {
    // the app only ever runs in WebView2, so there is no need to transpile further
    target: 'chrome105',
    sourcemap: false
  }
})
