import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const pagesDemo = loadEnv(mode, process.cwd(), 'VITE_').VITE_PAGES_DEMO === 'true';
  return {
    base: pagesDemo ? '/easy-web-assistant/' : '/',
    // Offer images require HTTP(S) URLs, so keep small fixture SVGs as files.
    build: pagesDemo ? { assetsInlineLimit: 0 } : undefined,
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': 'http://127.0.0.1:3001',
        '/ws': { target: 'ws://127.0.0.1:3001', ws: true },
      },
    },
  };
});
