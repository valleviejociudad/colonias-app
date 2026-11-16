import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La app se publica en https://valleviejociudad.com.ar/colonias/ detrás de un Cloudflare
// Worker que quita el prefijo /colonias antes de llegar al servidor.
export default defineConfig({
  base: '/colonias/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // En dev no hay Worker: el proxy hace de Worker y saca el prefijo.
      '/colonias/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/colonias/, '')
      }
    }
  }
});
