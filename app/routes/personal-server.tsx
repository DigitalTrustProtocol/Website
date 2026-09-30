import Content, { frontmatter } from '../../content/pages/en/personal-server.mdx';
import { AuthoredPage } from '~/components/content/AuthoredPage';
import { pageMeta } from '~/lib/site';

export const meta = () => pageMeta(frontmatter);

export default function PersonalServer() {
  return <AuthoredPage frontmatter={frontmatter} Content={Content} />;
}
