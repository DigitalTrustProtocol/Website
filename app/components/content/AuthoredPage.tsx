import type { ComponentType, ReactNode } from 'react';
import type { MDXComponents, MDXProps } from 'mdx/types';
import { mdxComponents } from './mdx-components';

export interface Frontmatter {
  title: string;
  description: string;
  route: string;
  modelVersion?: string;
}

/**
 * Frame for a Website-authored MDX page: title and lead from frontmatter,
 * body from the MDX file.
 */
export function AuthoredPage({
  frontmatter,
  Content,
  eyebrow,
  wide = false,
  components,
}: {
  frontmatter: Frontmatter;
  Content: ComponentType<MDXProps>;
  eyebrow?: ReactNode;
  wide?: boolean;
  /** Page-specific components on top of the shared MDX set. */
  components?: MDXComponents;
}) {
  return (
    <article className="container page">
      <header className="page-header">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{frontmatter.title}</h1>
        <p className="page-lead">{frontmatter.description}</p>
      </header>
      <div className={wide ? 'prose prose-wide' : 'prose'}>
        <Content components={components ? { ...mdxComponents, ...components } : mdxComponents} />
      </div>
    </article>
  );
}
