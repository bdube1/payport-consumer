import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'https://api.payport.africa', changeOrigin: true }
    }
  },
  preview: {
    allowedHosts: ['app.payport.africa', 'app-staging.payport.africa', 'localhost']
  }
})
