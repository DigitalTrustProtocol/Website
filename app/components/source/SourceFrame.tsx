import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { StatusBadge } from '~/components/content/StatusBadge';
import type { RenderedPageData } from '~/content/rendered-types';
import type { SourceSection } from '~/content/sources';
import styles from './SourceFrame.module.css';
import { SpecBody } from './SpecBody';

const SECTION_HOME: Record<SourceSection, { to: string; labelKey: string }> = {
  protocol: { to: '/protocol', labelKey: 'nav.protocol' },
  docs: { to: '/docs', labelKey: 'nav.docs' },
  'personal-server': { to: '/personal-server', labelKey: 'nav.personalServer' },
  'global-server': { to: '/global-server', labelKey: 'nav.globalServer' },
  attention: { to: '/attention', labelKey: 'nav.attention' },
};

export function SourceFooter({ page }: { page: RenderedPageData }) {
  const { t } = useTranslation();
  const { source } = page;
  return (
    <footer className={styles.sourceFooter}>
      <p>
        {t('source.label')}: <strong>{source.repoLabel}</strong> · <code>{source.path}</code> @{' '}
        <a href={source.viewUrl} rel="noopener">
          <code>{source.refShort}</code>
        </a>{' '}
        · <a href={source.editUrl} rel="noopener">{t('source.edit')}</a>
      </p>
      {source.pinned ? null : <p className={styles.warning}>{t('source.unpinned')}</p>}
    </footer>
  );
}

/** Page frame for a document rendered from its owner repo. */
export function SourceFrame({ page, Preface }: { page: RenderedPageData; Preface?: ComponentType }) {
  const { t } = useTranslation();
  const home = SECTION_HOME[page.section];
  const showToc = page.headings.filter((heading) => heading.depth === 2).length >= 3;

  return (
    <article className={`container page ${styles.layout} ${showToc ? styles.withToc : ''}`}>
      <header className={`page-header ${styles.header}`}>
        <p className="eyebrow">
          <Link to={home.to}>{t(home.labelKey)}</Link>
        </p>
        <h1>{page.title}</h1>
        <div className={styles.meta}>
          {page.status ? <StatusBadge status={page.status} /> : null}
          <span>{page.kind === 'policy' ? t('source.policyNote') : t('source.englishOnly')}</span>
        </div>
      </header>

      {showToc ? (
        <nav className={styles.toc} aria-labelledby="toc-title">
          <p id="toc-title" className={styles.tocTitle}>
            {t('a11y.onThisPage')}
          </p>
          <ol>
            {page.headings
              .filter((heading) => heading.depth === 2)
              .map((heading) => (
                <li key={heading.id}>
                  <a href={`#${heading.id}`}>{heading.text}</a>
                </li>
              ))}
          </ol>
        </nav>
      ) : null}

      <div className={styles.body}>
        {Preface && !page.missing ? <Preface /> : null}
        {page.missing ? (
          <div className={styles.missing} data-source-missing="">
            <h2>{t('source.missingTitle')}</h2>
            <p>{t('source.missingBody', { repo: page.source.repo, path: page.source.path })}</p>
          </div>
        ) : (
          <SpecBody html={page.html} hasDiagrams={page.hasDiagrams} />
        )}
        <SourceFooter page={page} />
      </div>
    </article>
  );
}
