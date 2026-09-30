import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkModelVersions, parseFrontmatter, readAuthoredPages, type AuthoredPage } from './pages';
import { extractModelVersion } from './render';

const root = resolve(import.meta.dirname, '..', '..');

describe('frontmatter', () => {
  it('requires title, description, and route', () => {
    expect(() => parseFrontmatter('---\ntitle: T\n---\nbody', 'x.mdx')).toThrow('"description" is required');
    expect(() => parseFrontmatter('no frontmatter', 'x.mdx')).toThrow('missing frontmatter');
    expect(parseFrontmatter('---\ntitle: T\ndescription: D\nroute: /t\n---\n', 'x.mdx')).toEqual({
      title: 'T',
      description: 'D',
      route: '/t',
    });
  });
});

describe('modelVersion check', () => {
  const page = (modelVersion?: string): AuthoredPage => ({
    file: 'content/pages/en/glance.mdx',
    locale: 'en',
    frontmatter: { title: 'T', description: 'D', route: '/protocol/wot-model', modelVersion },
  });

  it('fails when a summary declares a different model version', () => {
    const problems = checkModelVersions([page('dtp-wot/1')], 'dtp-wot/2');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('declares dtp-wot/2');
  });

  it('passes when versions match and ignores pages without modelVersion', () => {
    expect(checkModelVersions([page('dtp-wot/1'), page()], 'dtp-wot/1')).toEqual([]);
  });

  it('matches the model version of the synced (pinned) wot-model.md, when synced', async () => {
    const pages = await readAuthoredPages(root);
    const glance = pages.find((entry) => entry.file.endsWith('wot-model-glance.mdx'));
    expect(glance?.frontmatter.modelVersion).toMatch(/^dtp-wot\/\d+$/);
    let spec: string | null = null;
    try {
      spec = readFileSync(resolve(root, 'content', '_imported', 'raw', 'wot-model.md'), 'utf8');
    } catch {
      return; // Not synced (or TrustGraph not published yet); content:build enforces it when it is.
    }
    expect(glance?.frontmatter.modelVersion).toBe(extractModelVersion(spec));
  });
});
