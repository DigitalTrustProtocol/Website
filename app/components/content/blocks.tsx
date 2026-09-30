import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { WotMark } from '~/components/brand/WotMark';
import { SmartLink } from '~/components/SmartLink';
import { sourcesInSection, type SourceSection } from '~/content/sources';
import { CHROME_WEB_STORE_URL, GITHUB_ORG_URL, withBase } from '~/lib/site';
import styles from './content.module.css';
import { StatusBadge } from './StatusBadge';

export function Hero({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.heroInner}`}>
        <div>
          <h1 className={styles.heroTitle}>{title}</h1>
          <div className={styles.heroBody}>{children}</div>
        </div>
        <div className={styles.heroMarkWrap}>
          <WotMark size={220} className={styles.heroMark} />
        </div>
      </div>
    </section>
  );
}

export function Section({ title, id, children }: { title?: string; id?: string; children: ReactNode }) {
  return (
    <section className={`container ${styles.section}`} id={id} aria-labelledby={title && id ? `${id}-title` : undefined}>
      {title ? <h2 id={id ? `${id}-title` : undefined}>{title}</h2> : null}
      {children}
    </section>
  );
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className={styles.buttonRow}>{children}</div>;
}

export function ButtonLink({ to, variant = 'primary', children }: { to: string; variant?: 'primary' | 'secondary'; children: ReactNode }) {
  return (
    <SmartLink href={to} className={`${styles.button} ${styles[variant]}`}>
      {children}
    </SmartLink>
  );
}

/** "Add Attention to Chrome": the store listing when it is public, else the install section. */
export function InstallButton({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  const { t } = useTranslation();
  return (
    <ButtonLink to={CHROME_WEB_STORE_URL ?? '/attention#install'} variant={variant}>
      {t('cta.addToChrome')}
    </ButtonLink>
  );
}

export function CardGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 }) {
  return <div className={`${styles.cardGrid} ${columns === 2 ? styles.two : ''}`}>{children}</div>;
}

export function Card({ title, to, children }: { title: string; to?: string; children: ReactNode }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>{to ? <SmartLink href={to}>{title}</SmartLink> : title}</h3>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

export function ProductCard({
  name,
  to,
  status,
  audience,
  children,
}: {
  name: string;
  to: string;
  status: string;
  audience: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          <Link to={to}>{name}</Link>
        </h3>
        <StatusBadge status={status} />
      </div>
      <div className={styles.cardBody}>{children}</div>
      <p className={styles.cardMeta}>
        <strong>{t('products.whoFor')}:</strong> {audience}
      </p>
    </div>
  );
}

export function RepoCard({
  name,
  language,
  status,
  published = false,
  children,
}: {
  name: string;
  language: string;
  status: string;
  published?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const url = `${GITHUB_ORG_URL}/${name}`;
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          <code>DigitalTrustProtocol/{name}</code>
        </h3>
        <StatusBadge status={status} />
      </div>
      <div className={styles.cardBody}>{children}</div>
      <dl className={styles.facts}>
        <div>
          <dt>{t('repos.language')}</dt>
          <dd>{language}</dd>
        </div>
        <div>
          <dt>{t('repos.license')}</dt>
          <dd>MIT</dd>
        </div>
      </dl>
      <p className={styles.cardMeta}>
        {published ? (
          <a href={url} rel="noopener">
            {t('repos.open')}
          </a>
        ) : (
          <span>{t('repos.notPublished')}</span>
        )}
      </p>
    </div>
  );
}

export function Principles({ children }: { children: ReactNode }) {
  return <ul className={styles.principles}>{children}</ul>;
}

export function Principle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li>
      <strong>{title}</strong>
      <span>{children}</span>
    </li>
  );
}

export function Callout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className={styles.callout}>
      {title ? <p className={styles.calloutTitle}>{title}</p> : null}
      {children}
    </aside>
  );
}

export function Question({ kind, question, children }: { kind: string; question: string; children: ReactNode }) {
  return (
    <div className={styles.question}>
      <p className={styles.kind}>
        <code>{kind}</code>
      </p>
      <p className={styles.questionText}>{question}</p>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

/** Small text-first flow diagram: trust → walk → one indicator. */
export function Flow({ steps }: { steps: string[] }) {
  return (
    <ol className={styles.flow}>
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

export function Screenshot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className={styles.screenshot}>
      <img src={withBase(src)} alt={alt} width={1280} height={800} loading="lazy" decoding="async" />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

export function Gallery({ children }: { children: ReactNode }) {
  return <div className={styles.gallery}>{children}</div>;
}

/** Lists the pages rendered from sources in one section of content.sources.json. */
export function SourceList({ section }: { section: SourceSection }) {
  return (
    <ul className={styles.sourceList}>
      {sourcesInSection(section).map((source) => (
        <li key={source.id}>
          <Link to={source.route}>{source.title}</Link>
        </li>
      ))}
    </ul>
  );
}
