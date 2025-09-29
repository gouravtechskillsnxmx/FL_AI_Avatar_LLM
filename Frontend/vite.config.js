import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['853c4364eaa9.ngrok-free.app', '.ngrok-free.app']
  }
})
