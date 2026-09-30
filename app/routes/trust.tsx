import Content, { frontmatter } from '../../content/pages/en/trust.mdx';
import { AuthoredPage } from '~/components/content/AuthoredPage';
import { pageMeta } from '~/lib/site';

export const meta = () => pageMeta(frontmatter);

export default function Trust() {
  return <AuthoredPage frontmatter={frontmatter} Content={Content} />;
}
