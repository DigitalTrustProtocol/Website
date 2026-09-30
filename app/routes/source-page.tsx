import { SourceFrame } from '~/components/source/SourceFrame';
import { PREFACES } from '~/components/source/RulesAtAGlance';
import { loadRenderedPage } from '~/content/rendered.server';
import { BASE_PATH, pageMeta } from '~/lib/site';
import type { Route } from './+types/source-page';

/** One route module for every page rendered from content.sources.json. */
export async function loader({ request }: Route.LoaderArgs) {
  return loadRenderedPage(new URL(request.url).pathname, BASE_PATH);
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [];
  return pageMeta({
    title: data.title,
    description: data.description || data.navTitle,
    route: data.route,
    noindex: data.missing,
  });
}

export default function SourcePage({ loaderData }: Route.ComponentProps) {
  return <SourceFrame page={loaderData} Preface={PREFACES[loaderData.id]} />;
}
