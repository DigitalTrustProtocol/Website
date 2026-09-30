import Content, { frontmatter } from '../../content/pages/en/how-it-works.mdx';
import { AuthoredPage } from '~/components/content/AuthoredPage';
import { PlaygroundSlot } from '~/components/playground/PlaygroundSlot';
import { pageMeta } from '~/lib/site';

export const meta = () => pageMeta(frontmatter);

export default function HowItWorks() {
  return <AuthoredPage frontmatter={frontmatter} Content={Content} components={{ PlaygroundSlot }} />;
}
