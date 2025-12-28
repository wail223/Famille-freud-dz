
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild'
  },
  define: {
    // Permet de supporter à la fois process.env (Vite local) et import.meta.env (Prod)
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
});
