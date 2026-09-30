import Content, { frontmatter } from '../../content/pages/en/attention-support.mdx';
import { AuthoredPage } from '~/components/content/AuthoredPage';
import { pageMeta } from '~/lib/site';

export const meta = () => pageMeta(frontmatter);

export default function AttentionSupport() {
  return <AuthoredPage frontmatter={frontmatter} Content={Content} eyebrow="Attention" />;
}
