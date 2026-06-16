import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(root, 'index.html'),
        studio: path.resolve(root, 'studio.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    // VITE_DISABLE_HMR=1 — no live reload while studying; refresh manually when ready (npm run dev:study).
    hmr: process.env.VITE_DISABLE_HMR === '1' ? false : undefined,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/user-data': 'http://127.0.0.1:3001',
    },
  },
});
