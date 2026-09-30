import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function NotFoundContent() {
  const { t } = useTranslation();
  return (
    <div className="container page">
      <header className="page-header">
        <p className="eyebrow">404</p>
        <h1>{t('notFound.title')}</h1>
        <p className="page-lead">{t('notFound.body')}</p>
      </header>
      <p>
        <Link to="/">{t('notFound.home')}</Link> · <Link to="/docs">{t('notFound.docs')}</Link>
      </p>
    </div>
  );
}
