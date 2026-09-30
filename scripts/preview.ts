/**
 * `npm run preview` — serves build/client the way GitHub Pages will
 * (directory indexes, trailing-slash redirects, 404.html), under BASE_PATH.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BASE_PATH } from '../site.config';
import { createStaticServer } from './lib/static-server';

const root = resolve(import.meta.dirname, '..', 'build', 'client');
const port = Number(process.env.PORT ?? 4173);

if (!existsSync(root)) {
  console.error('build/client not found; run `npm run build` first.');
  process.exit(1);
}

createStaticServer(root, BASE_PATH).listen(port, '127.0.0.1', () => {
  console.log(`Preview: http://127.0.0.1:${port}${BASE_PATH}`);
});
