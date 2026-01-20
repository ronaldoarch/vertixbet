import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // Permitir todos os hosts (útil para deploy em subdomínios)
    allowedHosts: [
      'localhost',
      '.agenciamidas.com',
      '.localhost',
      'vertixbet.site',
      'www.vertixbet.site',
      'api.vertixbet.site',
      '.vertixbet.site'
    ]
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false
  }
})
