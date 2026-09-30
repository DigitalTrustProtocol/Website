import type { Config } from '@react-router/dev/config';
import { BASE_PATH } from './site.config.ts';

// Decision W-D2: React Router v7 framework mode, static output only.
// `ssr: false` + `prerender: true` writes HTML for every static route at
// build time; there is no server at runtime.
export default {
  appDirectory: 'app',
  ssr: false,
  prerender: true,
  basename: BASE_PATH,
} satisfies Config;
