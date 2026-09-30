import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation } from 'react-router';
import type { Route } from './+types/root';
import { SiteFooter } from './components/layout/SiteFooter';
import { SiteHeader } from './components/layout/SiteHeader';
import { NotFoundContent } from './components/NotFoundContent';
import './i18n';
import { CSP_PLACEHOLDER } from './lib/csp';
import { withBase } from './lib/site';
import { THEME_INIT_SCRIPT } from './lib/theme';
import './styles/tokens.css';
import './styles/global.css';
import './styles/prose.css';
import './styles/layout.css';

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: withBase('/brand/wot-mark.svg'), type: 'image/svg+xml' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  return (
    <html lang={i18n.language}>
      <head>
        <meta charSet="utf-8" />
        {import.meta.env.PROD ? <meta httpEquiv="Content-Security-Policy" content={CSP_PLACEHOLDER} /> : null}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body>
        <a className="skip-link" href="#main">
          {t('a11y.skipToContent')}
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Production pages load the enhance bundle as a plain script
 * (scripts/postbuild.ts); the hydrated dev server runs the same code once per
 * page, keyed by pathname.
 */
function DevEnhance() {
  useEffect(() => {
    void import('./enhance').then(({ enhance }) => enhance());
  }, []);
  return null;
}

export default function App() {
  const location = useLocation();
  return (
    <>
      <Outlet />
      {import.meta.env.DEV ? <DevEnhance key={location.pathname} /> : null}
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useTranslation();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundContent />;
  const detail = import.meta.env.DEV && error instanceof Error ? error.stack : undefined;
  return (
    <div className="container page">
      <h1>{t('error.title')}</h1>
      {detail ? <pre>{detail}</pre> : null}
    </div>
  );
}
