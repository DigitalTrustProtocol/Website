import rawConfig from '../../content.sources.json';

export type SourceKind = 'spec' | 'policy';

export const SOURCE_SECTIONS = [
  'protocol',
  'docs',
  'personal-server',
  'global-server',
  'attention',
] as const;
export type SourceSection = (typeof SOURCE_SECTIONS)[number];

export interface RepoConfig {
  /** Short name shown in the source footer, for example `BrowserExtension`. */
  label: string;
  /** Sibling checkout used by `content:sync --local`, relative to the Website root. */
  localDir: string;
  /** Branch used for "Edit on GitHub" links. */
  defaultBranch: string;
}

export interface SourceEntry {
  id: string;
  /** GitHub `owner/name`. */
  repo: string;
  /** File path inside the repo. */
  path: string;
  /** Pinned commit (or branch name until the repo is published). */
  ref: string;
  /** Website route without trailing slash, for example `/protocol/nip-32009`. */
  route: string;
  section: SourceSection;
  /** Navigation title; the page heading still comes from the source. */
  title: string;
  /** Status badge override when the source does not declare one. */
  status?: string;
  kind?: SourceKind;
}

export interface SourcesConfig {
  repos: Record<string, RepoConfig>;
  sources: SourceEntry[];
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROUTE_PATTERN = /^(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/;
const SUPPORTED_EXTENSIONS = ['.md', '.html'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  where: string,
  problems: string[],
): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    problems.push(`${where}: "${key}" must be a non-empty string`);
    return '';
  }
  return value;
}

/**
 * Validates `content.sources.json`. Throws one error listing every problem so
 * a bad edit is fixed in one pass.
 */
export function validateSourcesConfig(raw: unknown): SourcesConfig {
  const problems: string[] = [];
  if (!isRecord(raw) || !isRecord(raw.repos) || !Array.isArray(raw.sources)) {
    throw new Error('content.sources.json must have a "repos" object and a "sources" array');
  }

  const repos: Record<string, RepoConfig> = {};
  const localDirNames = new Set<string>();
  for (const [name, value] of Object.entries(raw.repos)) {
    const where = `repos["${name}"]`;
    if (!/^[\w.-]+\/[\w.-]+$/.test(name)) problems.push(`${where}: key must be "owner/name"`);
    if (!isRecord(value)) {
      problems.push(`${where}: must be an object`);
      continue;
    }
    const repo: RepoConfig = {
      label: requireString(value, 'label', where, problems),
      localDir: requireString(value, 'localDir', where, problems),
      defaultBranch: requireString(value, 'defaultBranch', where, problems),
    };
    const dirName = localDirBaseName(repo.localDir);
    if (localDirNames.has(dirName)) problems.push(`${where}: localDir folder "${dirName}" is used twice`);
    localDirNames.add(dirName);
    repos[name] = repo;
  }

  const sources: SourceEntry[] = [];
  const seenIds = new Set<string>();
  const seenRoutes = new Set<string>();
  const seenFiles = new Set<string>();
  const refByRepo = new Map<string, string>();

  raw.sources.forEach((value, index) => {
    const where = `sources[${index}]`;
    if (!isRecord(value)) {
      problems.push(`${where}: must be an object`);
      return;
    }
    const entry: SourceEntry = {
      id: requireString(value, 'id', where, problems),
      repo: requireString(value, 'repo', where, problems),
      path: requireString(value, 'path', where, problems),
      ref: requireString(value, 'ref', where, problems),
      route: requireString(value, 'route', where, problems),
      section: requireString(value, 'section', where, problems) as SourceSection,
      title: requireString(value, 'title', where, problems),
    };
    if (value.status !== undefined) entry.status = requireString(value, 'status', where, problems);
    if (value.kind !== undefined) {
      if (value.kind !== 'spec' && value.kind !== 'policy') {
        problems.push(`${where}: "kind" must be "spec" or "policy"`);
      } else {
        entry.kind = value.kind;
      }
    }

    const label = entry.id ? `source "${entry.id}"` : where;
    if (entry.id && !ID_PATTERN.test(entry.id)) problems.push(`${label}: id must be kebab-case`);
    if (entry.route && !ROUTE_PATTERN.test(entry.route)) {
      problems.push(`${label}: route must look like /segment/segment (lowercase, no trailing slash)`);
    }
    if (entry.repo && !repos[entry.repo]) problems.push(`${label}: repo "${entry.repo}" is not listed in "repos"`);
    if (entry.section && !SOURCE_SECTIONS.includes(entry.section)) {
      problems.push(`${label}: section must be one of ${SOURCE_SECTIONS.join(', ')}`);
    }
    if (entry.path && !SUPPORTED_EXTENSIONS.some((ext) => entry.path.endsWith(ext))) {
      problems.push(`${label}: path must end in ${SUPPORTED_EXTENSIONS.join(' or ')}`);
    }
    if (entry.path.startsWith('/') || entry.path.includes('..')) {
      problems.push(`${label}: path must be relative to the repo root`);
    }

    if (seenIds.has(entry.id)) problems.push(`${label}: duplicate id`);
    if (seenRoutes.has(entry.route)) problems.push(`${label}: duplicate route ${entry.route}`);
    const fileKey = `${entry.repo}:${entry.path}`;
    if (seenFiles.has(fileKey)) problems.push(`${label}: ${fileKey} is listed twice`);
    seenIds.add(entry.id);
    seenRoutes.add(entry.route);
    seenFiles.add(fileKey);

    const pinned = refByRepo.get(entry.repo);
    if (pinned === undefined) refByRepo.set(entry.repo, entry.ref);
    else if (pinned !== entry.ref) {
      problems.push(`${label}: ref ${entry.ref} differs from ${pinned}; pin each repo at one commit`);
    }
    sources.push(entry);
  });

  if (problems.length > 0) {
    throw new Error(`Invalid content.sources.json:\n- ${problems.join('\n- ')}`);
  }
  return { repos, sources };
}

/** Folder name of a repo's sibling checkout, as the specs' relative links use it (`AttentionX`). */
export function localDirBaseName(localDir: string): string {
  const parts = localDir.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] ?? localDir;
}

/** The single pinned ref for a repo, or its default branch when no source pins it. */
export function refForRepo(config: SourcesConfig, repo: string): string {
  const pinned = config.sources.find((source) => source.repo === repo)?.ref;
  return pinned ?? config.repos[repo]?.defaultBranch ?? 'main';
}

export function shortRef(ref: string): string {
  return /^[0-9a-f]{40}$/.test(ref) ? ref.slice(0, 7) : ref;
}

export const SOURCES_CONFIG: SourcesConfig = validateSourcesConfig(rawConfig);

export function sourcesInSection(section: SourceSection): SourceEntry[] {
  return SOURCES_CONFIG.sources.filter((source) => source.section === section);
}

export function sourceByRoute(route: string): SourceEntry | undefined {
  return SOURCES_CONFIG.sources.find((source) => source.route === route);
}
