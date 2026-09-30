import { index, route, type RouteConfig } from '@react-router/dev/routes';
import { SOURCES_CONFIG } from './content/sources';

/** Website-authored pages (specs/site.md sitemap). */
const authored = [
  index('routes/home.tsx'),
  route('trust', 'routes/trust.tsx'),
  route('how-it-works', 'routes/how-it-works.tsx'),
  route('protocol', 'routes/protocol.tsx'),
  route('attention', 'routes/attention.tsx'),
  route('attention/support', 'routes/attention-support.tsx'),
  route('personal-server', 'routes/personal-server.tsx'),
  route('global-server', 'routes/global-server.tsx'),
  route('docs', 'routes/docs.tsx'),
  route('code', 'routes/code.tsx'),
  route('about', 'routes/about.tsx'),
  // Prerendered, then copied to /404.html for GitHub Pages.
  route('404', 'routes/not-found.tsx'),
];

/** Pages rendered from their owner repos (content.sources.json). */
const rendered = SOURCES_CONFIG.sources.map((source) =>
  route(source.route.slice(1), 'routes/source-page.tsx', { id: `source/${source.id}` }),
);

export default [...authored, ...rendered] satisfies RouteConfig;
