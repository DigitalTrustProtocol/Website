import type { ComponentType } from 'react';
import Glance, { frontmatter } from '../../../content/pages/en/wot-model-glance.mdx';
import { mdxComponents } from '~/components/content/mdx-components';
import styles from './RulesAtAGlance.module.css';

/**
 * Website-authored summary shown above the rendered model. Its
 * `modelVersion` must equal the pinned wot-model.md version, or
 * `npm run content:build` fails (content-pipeline.md).
 */
export function RulesAtAGlance() {
  return (
    <aside className={styles.glance} aria-labelledby="rules-at-a-glance">
      <h2 id="rules-at-a-glance" className={styles.title}>
        {frontmatter.title}
      </h2>
      <p className={styles.note}>
        {frontmatter.description} <code>{frontmatter.modelVersion}</code>
      </p>
      <div className={styles.body}>
        <Glance components={mdxComponents} />
      </div>
    </aside>
  );
}

/** Website-authored prefaces for rendered pages, by source id. */
export const PREFACES: Readonly<Record<string, ComponentType>> = {
  'wot-model': RulesAtAGlance,
};
