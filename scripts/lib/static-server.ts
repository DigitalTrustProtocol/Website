import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

export type Resolution =
  | { kind: 'file'; path: string }
  | { kind: 'redirect'; location: string }
  | { kind: 'not-found' };

/**
 * GitHub Pages semantics for a static folder served under `basePath`:
 * files as-is, `dir/` → `dir/index.html`, `dir` → 301 to `dir/`, else 404.
 */
export function resolveRequest(root: string, basePath: string, pathname: string): Resolution {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { kind: 'not-found' };
  }
  if (!decoded.startsWith(basePath)) {
    return decoded === basePath.replace(/\/$/, '') ? { kind: 'redirect', location: basePath } : { kind: 'not-found' };
  }
  const relativePath = decoded.slice(basePath.length);
  const target = normalize(join(root, relativePath));
  if (target !== root && !target.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) return { kind: 'not-found' };

  if (existsSync(target) && statSync(target).isFile()) return { kind: 'file', path: target };
  if (existsSync(join(target, 'index.html'))) {
    return decoded.endsWith('/') ? { kind: 'file', path: join(target, 'index.html') } : { kind: 'redirect', location: `${decoded}/` };
  }
  return { kind: 'not-found' };
}

export function createStaticServer(root: string, basePath: string): Server {
  return createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const resolution = resolveRequest(root, basePath, url.pathname);
    void (async () => {
      switch (resolution.kind) {
        case 'redirect':
          response.writeHead(301, { location: `${resolution.location}${url.search}` });
          response.end();
          return;
        case 'file': {
          const body = await readFile(resolution.path);
          response.writeHead(200, { 'content-type': TYPES[extname(resolution.path)] ?? 'application/octet-stream' });
          response.end(body);
          return;
        }
        case 'not-found': {
          const notFound = join(root, '404.html');
          const body = existsSync(notFound) ? await readFile(notFound) : 'Not found';
          response.writeHead(404, { 'content-type': TYPES['.html'] ?? 'text/html' });
          response.end(body);
          return;
        }
        default: {
          const unhandled: never = resolution;
          throw new Error(`Unhandled resolution ${JSON.stringify(unhandled)}`);
        }
      }
    })().catch(() => {
      response.writeHead(500);
      response.end('Internal error');
    });
  });
}
