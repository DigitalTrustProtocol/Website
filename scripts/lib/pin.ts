export interface RefChange {
  repo: string;
  from: string;
  to: string;
  sources: number;
}

interface PinnableConfig {
  sources: Array<{ repo: string; ref: string }>;
}

/**
 * Returns `config` with every source of each repo in `heads` pinned to that
 * repo's commit (one ref per repo, decision W-D7), plus what changed. Other
 * fields and their order are kept, so the file diff shows only the refs.
 */
export function pinRefs<T extends PinnableConfig>(config: T, heads: Record<string, string>): { config: T; changes: RefChange[] } {
  const changes: RefChange[] = [];
  for (const [repo, to] of Object.entries(heads)) {
    const repoSources = config.sources.filter((source) => source.repo === repo);
    const from = repoSources[0]?.ref;
    if (from !== undefined && from !== to) changes.push({ repo, from, to, sources: repoSources.length });
  }
  const sources = config.sources.map((source) => {
    const head = heads[source.repo];
    return head === undefined ? source : { ...source, ref: head };
  });
  return { config: { ...config, sources }, changes };
}

export function serializeSourcesConfig(config: unknown): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}
