import type { MetaDescriptor } from 'react-router';

/** Contact address from the Chrome Web Store listing (AttentionX docs/chrome-web-store.md). */
export const CONTACT_EMAIL = 'attention@trust.dance';

export const GITHUB_ORG_URL = 'https://github.com/DigitalTrustProtocol';

/**
 * Chrome Web Store listing for Attention. `null` until the listing is public;
 * install buttons then point to the install section on /attention.
 */
export const CHROME_WEB_STORE_URL: string | null = null;

/** Where the published extension's privacy link points today; must keep working (site.md). */
export const LEGACY_PRIVACY_URL = 'https://digitaltrustprotocol.github.io/BrowserExtension/privacy.html';

const SITE_NAME = 'Digital Trust Protocol';

/** Base path the site is served under, always ending in a slash. */
export const BASE_PATH = import.meta.env.BASE_URL;

/** Canonical URL of a route; directory-style with a trailing slash, as GitHub Pages serves it. */
export function canonicalUrl(route: string): string {
  const path = route === '/' ? '' : `${route.replace(/^\/|\/$/g, '')}/`;
  return `${import.meta.env.VITE_SITE_ORIGIN}${BASE_PATH}${path}`;
}

/** Prefixes a site-absolute path (`/protocol`) with the base path. */
export function withBase(path: string): string {
  return `${BASE_PATH}${path.replace(/^\//, '')}`;
}

export interface PageMetaInput {
  title: string;
  description: string;
  route: string;
  image?: { url: string; alt: string };
  noindex?: boolean;
}

export function pageMeta({ title, description, route, image, noindex }: PageMetaInput): MetaDescriptor[] {
  const fullTitle = route === '/' ? `${SITE_NAME} — ${title}` : `${title} · ${SITE_NAME}`;
  const url = canonicalUrl(route);
  const meta: MetaDescriptor[] = [
    { title: fullTitle },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
  ];
  if (image) {
    meta.push(
      { property: 'og:image', content: `${import.meta.env.VITE_SITE_ORIGIN}${withBase(image.url)}` },
      { property: 'og:image:alt', content: image.alt },
      { name: 'twitter:card', content: 'summary_large_image' },
    );
  }
  if (noindex) meta.push({ name: 'robots', content: 'noindex' });
  return meta;
}
