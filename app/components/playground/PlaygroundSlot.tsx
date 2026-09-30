import { useTranslation } from 'react-i18next';
import styles from './Playground.module.css';

/**
 * Prerendered placeholder for the playground island. The enhance script
 * (app/enhance) mounts the island into `#playground-root`, which React never
 * gives children, so a hydrating dev build and the island do not collide.
 */
export function PlaygroundSlot() {
  const { t } = useTranslation();
  return (
    <div className={styles.slot}>
      <p className={styles.notice} data-island-fallback="">
        {t('playground.loading')}
      </p>
      <noscript>
        <p>{t('playground.needsJs')}</p>
      </noscript>
      <div id="playground-root" />
    </div>
  );
}
