import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface AuthoredFrontmatter {
  title: string;
  description: string;
  route: string;
  modelVersion?: string;
}

export interface AuthoredPage {
  /** Path relative to the Website root, forward slashes. */
  file: string;
  locale: string;
  frontmatter: AuthoredFrontmatter;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

export function parseFrontmatter(text: string, file: string): AuthoredFrontmatter {
  const match = FRONTMATTER.exec(text);
  if (!match?.[1]) throw new Error(`${file}: missing frontmatter`);
  const data = parseYaml(match[1]) as Record<string, unknown> | null;
  const problems: string[] = [];
  for (const key of ['title', 'description', 'route'] as const) {
    if (typeof data?.[key] !== 'string' || data[key] === '') problems.push(`"${key}" is required`);
  }
  if (data?.modelVersion !== undefined && typeof data.modelVersion !== 'string') {
    problems.push('"modelVersion" must be a string');
  }
  if (problems.length > 0) throw new Error(`${file}: ${problems.join(', ')}`);
  return data as unknown as AuthoredFrontmatter;
}

/** Every `content/pages/<locale>/*.mdx` file with its parsed frontmatter. */
export async function readAuthoredPages(root: string): Promise<AuthoredPage[]> {
  const pagesDir = join(root, 'content', 'pages');
  const pages: AuthoredPage[] = [];
  for (const locale of await readdir(pagesDir)) {
    for (const name of await readdir(join(pagesDir, locale))) {
      if (!name.endsWith('.mdx')) continue;
      const path = join(pagesDir, locale, name);
      const file = relative(root, path).replace(/\\/g, '/');
      pages.push({ file, locale, frontmatter: parseFrontmatter(await readFile(path, 'utf8'), file) });
    }
  }
  return pages;
}

/**
 * Pages that summarize the model declare `modelVersion`; each must equal the
 * version of the pinned `wot-model.md` so the summary is reviewed whenever
 * the model changes.
 */
export function checkModelVersions(pages: AuthoredPage[], pinnedVersion: string | null): string[] {
  const declaring = pages.filter((page) => page.frontmatter.modelVersion !== undefined);
  if (pinnedVersion === null) return [];
  return declaring
    .filter((page) => page.frontmatter.modelVersion !== pinnedVersion)
    .map(
      (page) =>
        `${page.file}: modelVersion is ${page.frontmatter.modelVersion}, but the pinned wot-model.md declares ${pinnedVersion}. Review the summary, then update modelVersion.`,
    );
}
