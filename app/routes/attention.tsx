import Content, { frontmatter } from '../../content/pages/en/attention.mdx';
import { AuthoredPage } from '~/components/content/AuthoredPage';
import { pageMeta } from '~/lib/site';

export const meta = () =>
  pageMeta({
    ...frontmatter,
    image: {
      url: '/brand/attention-promo-1400x560.png',
      alt: 'Attention: let your personal peers decide what deserves your attention.',
    },
  });

export default function Attention() {
  return <AuthoredPage frontmatter={frontmatter} Content={Content} wide />;
}
