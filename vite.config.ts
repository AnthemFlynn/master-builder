import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  envPrefix: ['VITE_', 'ANTHROPIC_'],
  resolve: {
    alias: {
      '@dimforge/rapier3d': '@dimforge/rapier3d/rapier.js'
    }
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d']
  },
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()]
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    server: {
      deps: {
        inline: ['@dimforge/rapier3d']
      }
    }
  },
})
