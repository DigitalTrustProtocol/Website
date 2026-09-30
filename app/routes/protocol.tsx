import Content, { frontmatter } from '../../content/pages/en/protocol.mdx';
import { AuthoredPage } from '~/components/content/AuthoredPage';
import { pageMeta } from '~/lib/site';

export const meta = () => pageMeta(frontmatter);

export default function Protocol() {
  return <AuthoredPage frontmatter={frontmatter} Content={Content} />;
}
