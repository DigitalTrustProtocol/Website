import type { Options } from '@mdx-js/rollup';
import rehypeShiki from '@shikijs/rehype';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import { SHIKI_LANGS, SHIKI_OPTIONS } from './scripts/lib/shiki.ts';

/** MDX options for Website-authored pages; shared by Vite and Vitest. */
export const mdxOptions: Options = {
  remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: 'frontmatter' }], remarkGfm],
  rehypePlugins: [rehypeSlug, [rehypeShiki, { ...SHIKI_OPTIONS, langs: SHIKI_LANGS }]],
};
