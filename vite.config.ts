import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    allowedHosts: process.env.TUNNEL_MODE === 'true' ? true : ['localhost', '127.0.0.1'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
