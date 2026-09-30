import { NotFoundContent } from '~/components/NotFoundContent';
import { pageMeta } from '~/lib/site';

export const meta = () =>
  pageMeta({ title: 'Page not found', description: 'There is no page at this address.', route: '/404', noindex: true });

export default function NotFound() {
  return <NotFoundContent />;
}
