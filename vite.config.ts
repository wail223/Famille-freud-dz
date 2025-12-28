
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
    // On s'assure que process.env existe pour les bibliothèques comme @google/genai
    'process.env': {
        API_KEY: JSON.stringify(process.env.API_KEY || "")
    }
  }
});
