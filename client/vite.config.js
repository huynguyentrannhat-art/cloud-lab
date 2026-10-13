
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,

    allowedHosts: [
      'mern-frontend-236988.onrender.com',
      'localhost'
    ],

    proxy: {
      '/api': {
        target: process.env.RENDER
          ? 'https://mern-backend-236988.onrender.com'
          : 'http://mern-backend:5000',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
