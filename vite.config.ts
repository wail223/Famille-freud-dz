
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement depuis le fichier .env (s'il existe)
  // Le troisième argument '' permet de charger toutes les variables, pas seulement celles préfixées par VITE_
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild'
    },
    define: {
      // Injecte la clé API dans le code client de manière sécurisée lors du build
      'process.env': {
          API_KEY: JSON.stringify(env.API_KEY || "AIzaSyArdIzFUUDFMR510ylL-hmY-GvzuB2lQII")
      }
    }
  };
});
