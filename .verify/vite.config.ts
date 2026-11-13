import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: resolve(__dirname, 'out'),
    emptyOutDir: false,
    lib: { entry: resolve(__dirname, '../src/main.tsx'), formats: ['iife'], name: 'App', fileName: () => 'app.js' },
    cssCodeSplit: false,
  },
});
