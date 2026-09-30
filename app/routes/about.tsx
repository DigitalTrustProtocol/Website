import Content, { frontmatter } from '../../content/pages/en/about.mdx';
import { AuthoredPage } from '~/components/content/AuthoredPage';
import { pageMeta } from '~/lib/site';

export const meta = () => pageMeta(frontmatter);

export default function About() {
  return <AuthoredPage frontmatter={frontmatter} Content={Content} />;
}
