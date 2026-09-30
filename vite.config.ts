import mdx from '@mdx-js/rollup';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import { mdxOptions } from './mdx.config.ts';
import { BASE_PATH, SITE_ORIGIN } from './site.config.ts';
import { aliases } from './vite.aliases.ts';

export default defineConfig({
  base: BASE_PATH,
  define: {
    'import.meta.env.VITE_SITE_ORIGIN': JSON.stringify(SITE_ORIGIN),
  },
  resolve: {
    alias: aliases,
  },
  plugins: [{ enforce: 'pre', ...mdx(mdxOptions) }, reactRouter()],
});
