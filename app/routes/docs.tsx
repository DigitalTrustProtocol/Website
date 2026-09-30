import Content, { frontmatter } from '../../content/pages/en/docs.mdx';
import { AuthoredPage } from '~/components/content/AuthoredPage';
import { pageMeta } from '~/lib/site';

export const meta = () => pageMeta(frontmatter);

export default function Docs() {
  return <AuthoredPage frontmatter={frontmatter} Content={Content} wide />;
}
