import mdx from '@mdx-js/rollup';
import { reactRouter } from '@react-router/dev/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { mdxOptions } from './mdx.config.ts';
import { BASE_PATH, SITE_ORIGIN } from './site.config.ts';

export default defineConfig({
  base: BASE_PATH,
  define: {
    'import.meta.env.VITE_SITE_ORIGIN': JSON.stringify(SITE_ORIGIN),
  },
  resolve: {
    alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) },
  },
  plugins: [{ enforce: 'pre', ...mdx(mdxOptions) }, reactRouter()],
});
