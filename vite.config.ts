import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Proxy API calls to the Nest backend so the browser sees one origin
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
