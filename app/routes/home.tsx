import Content, { frontmatter } from '../../content/pages/en/home.mdx';
import { mdxComponents } from '~/components/content/mdx-components';
import { pageMeta } from '~/lib/site';

export const meta = () => pageMeta(frontmatter);

export default function Home() {
  return <Content components={mdxComponents} />;
}
