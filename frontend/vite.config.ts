import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://api:3000',
        changeOrigin: true,
        // Reenvía la IP real del cliente (X-Forwarded-For). Sin esto, todos los
        // usuarios llegan a la API con la IP del contenedor web y comparten el
        // límite de intentos de login por IP.
        xfwd: true,
      },
      '/uploads': {
        target: 'http://api:3000',
        changeOrigin: true,
        // Reenvía la IP real del cliente (X-Forwarded-For). Sin esto, todos los
        // usuarios llegan a la API con la IP del contenedor web y comparten el
        // límite de intentos de login por IP.
        xfwd: true,
      },
    },
  },
});
