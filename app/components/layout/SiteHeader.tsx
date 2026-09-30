import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';
import { WotMark } from '~/components/brand/WotMark';
import { MAIN_NAV } from './nav';
import styles from './SiteHeader.module.css';
import { ThemeToggle } from './ThemeToggle';

export function SiteHeader() {
  const { t } = useTranslation();
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label={t('a11y.home')}>
          <WotMark size={30} />
          <span className={styles.brandName}>{t('site.name')}</span>
        </Link>
        <nav aria-label={t('a11y.mainNav')} className={styles.nav}>
          <ul>
            {MAIN_NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => (isActive ? styles.active : undefined)}>
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
