import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// У режимі розробки запити /api автоматично йдуть на бекенд (порт 5000),
// тому в коді клієнта не потрібні повні адреси і не виникає проблем з CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
    },
  },
});
