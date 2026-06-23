import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// PortabIA — build statique pur (aucune logique serveur). Le backend isolé est séparé.
export default defineConfig({
  // Déployé sous le sous-chemin /portabia/ sur preview.essn.fr (preview multi-maquettes).
  base: '/portabia/',
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: { port: 5173, host: '127.0.0.1' },
  build: { outDir: 'dist', target: 'es2020', sourcemap: false }
})
