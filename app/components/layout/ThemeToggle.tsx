import { useTranslation } from 'react-i18next';
import styles from './SiteHeader.module.css';

/**
 * Static markup; app/enhance/theme-toggle.ts adds the behavior and keeps the
 * label in sync. CSS picks the icon from the current theme.
 */
export function ThemeToggle() {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={styles.themeToggle}
      data-theme-toggle=""
      data-label-to-dark={t('theme.toDark')}
      data-label-to-light={t('theme.toLight')}
      aria-label={t('theme.toDark')}
      title={t('theme.toDark')}
    >
      <svg className="icon-moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
      </svg>
      <svg className="icon-sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
