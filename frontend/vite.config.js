import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    // Proxy API requests to the FastAPI backend during development.
    // Any request to /api/* will be forwarded to http://localhost:8000
    // This avoids CORS issues and mimics production (where both
    // frontend and backend are served from the same domain).
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
