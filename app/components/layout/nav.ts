import type { Catalog } from '~/i18n';

export interface NavItem {
  to: string;
  labelKey: `nav.${keyof Catalog['nav']}`;
}

/** Header navigation, in reading order of the sitemap. */
export const MAIN_NAV: NavItem[] = [
  { to: '/trust', labelKey: 'nav.trust' },
  { to: '/how-it-works', labelKey: 'nav.howItWorks' },
  { to: '/protocol', labelKey: 'nav.protocol' },
  { to: '/attention', labelKey: 'nav.attention' },
  { to: '/personal-server', labelKey: 'nav.personalServer' },
  { to: '/global-server', labelKey: 'nav.globalServer' },
  { to: '/docs', labelKey: 'nav.docs' },
  { to: '/code', labelKey: 'nav.code' },
];
