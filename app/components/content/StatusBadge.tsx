import { useTranslation } from 'react-i18next';
import styles from './content.module.css';

const KNOWN = ['available', 'beta', 'inDesign', 'inDevelopment', 'draft', 'informative', 'optional', 'final'] as const;
type KnownStatus = (typeof KNOWN)[number];

const TONE: Record<KnownStatus, 'ok' | 'progress' | 'plan'> = {
  available: 'ok',
  final: 'ok',
  beta: 'progress',
  inDevelopment: 'progress',
  draft: 'plan',
  inDesign: 'plan',
  informative: 'plan',
  optional: 'plan',
};

function isKnown(value: string): value is KnownStatus {
  return (KNOWN as readonly string[]).includes(value);
}

/** Status pill for products, repos, and specs. Unknown statuses from sources show verbatim. */
export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const key = status.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  const label = isKnown(key) ? t(`status.${key}`) : status;
  const tone = isKnown(key) ? TONE[key] : 'plan';
  return <span className={`${styles.badge} ${styles[`badge-${tone}`]}`}>{label}</span>;
}
