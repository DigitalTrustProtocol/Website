import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { WotMark } from '~/components/brand/WotMark';
import { CONTACT_EMAIL, GITHUB_ORG_URL } from '~/lib/site';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.about}>
          <p className={styles.brand}>
            <WotMark size={24} /> {t('site.name')}
          </p>
          <p className={styles.muted}>{t('site.tagline')}</p>
          <p className={styles.muted}>{t('footer.sitePrivacy')}</p>
        </div>
        <nav aria-label={t('a11y.footerNav')} className={styles.columns}>
          <div>
            <h2 className={styles.heading}>{t('footer.protocol')}</h2>
            <ul>
              <li><Link to="/trust">{t('nav.trust')}</Link></li>
              <li><Link to="/how-it-works">{t('nav.howItWorks')}</Link></li>
              <li><Link to="/protocol">{t('nav.protocol')}</Link></li>
              <li><Link to="/docs">{t('nav.docs')}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className={styles.heading}>{t('footer.products')}</h2>
            <ul>
              <li><Link to="/attention">{t('nav.attention')}</Link></li>
              <li><Link to="/attention/privacy">{t('footer.attentionPrivacy')}</Link></li>
              <li><Link to="/attention/support">{t('footer.support')}</Link></li>
              <li><Link to="/personal-server">{t('nav.personalServer')}</Link></li>
              <li><Link to="/global-server">{t('nav.globalServer')}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className={styles.heading}>{t('footer.project')}</h2>
            <ul>
              <li><Link to="/code">{t('nav.code')}</Link></li>
              <li><Link to="/about">{t('nav.about')}</Link></li>
              <li><a href={GITHUB_ORG_URL} rel="noopener">GitHub</a></li>
              <li>
                {t('footer.contact')}: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </li>
            </ul>
          </div>
        </nav>
      </div>
      <div className={`container ${styles.legal}`}>
        <span>© 2026 Digital Trust Protocol contributors · {t('footer.license')}</span>
      </div>
    </footer>
  );
}
