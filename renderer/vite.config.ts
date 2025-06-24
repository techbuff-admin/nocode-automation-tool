import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // No need to set `root`—we'll run this from within renderer/
  base: './',    
  plugins: [react()],
  build: {
    // __dirname is the renderer folder; dist will live alongside public/ and src/
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: true,         // optional, but helpful in Electron
    chunkSizeWarningLimit: 1000, // in KB, default is 500
  },
  server: {
    port: 5173,
  },
});
