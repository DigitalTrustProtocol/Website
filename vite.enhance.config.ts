import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { BASE_PATH, SITE_ORIGIN } from './site.config.ts';

/**
 * Builds app/enhance — the only script production pages load up front — plus
 * its lazy chunks (Mermaid, the playground island) into build/client after
 * `react-router build`. scripts/postbuild.ts links the entry into every page
 * (decision W-D6).
 */
export default defineConfig({
  base: BASE_PATH,
  define: {
    'import.meta.env.VITE_SITE_ORIGIN': JSON.stringify(SITE_ORIGIN),
  },
  resolve: {
    alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) },
  },
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'build/client',
    emptyOutDir: false,
    manifest: 'enhance-manifest.json',
    // Mermaid's diagram chunks are large but lazy (loaded only where a diagram scrolls into view).
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: { enhance: fileURLToPath(new URL('./app/enhance/index.ts', import.meta.url)) },
      output: {
        entryFileNames: 'assets/enhance/[name]-[hash].js',
        chunkFileNames: 'assets/enhance/[name]-[hash].js',
        assetFileNames: 'assets/enhance/[name]-[hash][extname]',
      },
    },
  },
});
