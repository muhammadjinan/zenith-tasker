import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true, // Needed for Docker container mapping
        port: parseInt(process.env.VITE_PORT) || 3000,
        allowedHosts: process.env.VITE_ALLOWED_HOSTS
            ? process.env.VITE_ALLOWED_HOSTS.split(',')
            : ['localhost'],
    }
})
