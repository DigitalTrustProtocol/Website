/**
 * Deployment settings shared by Vite, React Router, the content build, and
 * the post-build checks. Both values come from the environment so one build
 * can target GitHub Pages (`/Website/`) today and a custom domain later
 * (decision W-D1).
 */

function normalizeBasePath(raw: string | undefined): string {
  const value = (raw ?? '/').trim() || '/';
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function normalizeOrigin(raw: string | undefined): string {
  const value = (raw ?? 'https://digitaltrustprotocol.github.io').trim();
  return value.replace(/\/+$/, '');
}

/** URL path prefix the site is served under, always with leading and trailing slash. */
export const BASE_PATH = normalizeBasePath(process.env.BASE_PATH);

/** Scheme and host used for canonical URLs and the sitemap. */
export const SITE_ORIGIN = normalizeOrigin(process.env.SITE_ORIGIN);

/** Absolute site root, for example `https://digitaltrustprotocol.github.io/Website/`. */
export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}`;
