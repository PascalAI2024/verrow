import { defineConfig } from 'vite-plus'
import react from '@vitejs/plugin-react'

// Shared Vite and Vite+ configuration.
export default defineConfig({
  plugins: [react()],
  lint: {
    ignorePatterns: ['dist/**', 'node_modules/**', 'src/spacetime/bindings/**'],
  },
  fmt: {
    semi: false,
    singleQuote: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
