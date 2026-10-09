import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000', // Explicit IPv4 loopback fixes Codespaces 502 Bad Gateway
        changeOrigin: true,
        secure: false,
      },
      '/whatsapp': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },

    },

  },
});