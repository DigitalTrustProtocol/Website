import mdx from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { mdxOptions } from './mdx.config.ts';

export default defineConfig({
  define: {
    'import.meta.env.VITE_SITE_ORIGIN': JSON.stringify('https://example.test'),
  },
  resolve: {
    alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) },
  },
  plugins: [{ enforce: 'pre', ...mdx(mdxOptions) }, react()],
  test: {
    include: ['app/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
