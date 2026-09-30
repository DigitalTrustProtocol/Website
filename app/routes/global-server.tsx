import Content, { frontmatter } from '../../content/pages/en/global-server.mdx';
import { AuthoredPage } from '~/components/content/AuthoredPage';
import { pageMeta } from '~/lib/site';

export const meta = () => pageMeta(frontmatter);

export default function GlobalServer() {
  return <AuthoredPage frontmatter={frontmatter} Content={Content} />;
}
