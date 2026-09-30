import { useTranslation } from 'react-i18next';

/**
 * Sanitized HTML rendered at build time from a source repo. Diagrams are
 * drawn by the enhance script (app/enhance), which reads its labels from the
 * data attributes.
 */
export function SpecBody({ html, hasDiagrams }: { html: string; hasDiagrams: boolean }) {
  const { t } = useTranslation();
  const diagramProps = hasDiagrams
    ? { 'data-diagrams': '', 'data-label-source': t('diagram.source'), 'data-label-failed': t('diagram.failed') }
    : {};
  return <div className="prose" {...diagramProps} dangerouslySetInnerHTML={{ __html: html }} />;
}
