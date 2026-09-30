import { describe, expect, it } from 'vitest';
import { refForRepo, shortRef, SOURCES_CONFIG, validateSourcesConfig } from './sources';

const repos = { 'Org/A': { label: 'A', localDir: '../A', defaultBranch: 'main' } };
const entry = { id: 'one', repo: 'Org/A', path: 'docs/one.md', ref: 'r1', route: '/protocol/one', section: 'protocol', title: 'One' };

describe('content.sources.json', () => {
  it('is valid and lists the sources the sitemap renders', () => {
    const routes = SOURCES_CONFIG.sources.map((source) => source.route);
    expect(routes).toEqual(
      expect.arrayContaining([
        '/protocol/two-questions',
        '/protocol/nip-32009',
        '/protocol/nip-32014',
        '/protocol/nip-39',
        '/protocol/wot-model',
        '/protocol/identity-binding',
        '/protocol/conformance',
        '/attention/privacy',
      ]),
    );
  });

  it('pins every repo at one ref', () => {
    const multiRef = Object.keys(SOURCES_CONFIG.repos).filter(
      (repo) => new Set(SOURCES_CONFIG.sources.filter((source) => source.repo === repo).map((source) => source.ref)).size > 1,
    );
    expect(multiRef).toEqual([]);
  });

  it('renders the extension privacy policy from its source file', () => {
    const privacy = SOURCES_CONFIG.sources.find((source) => source.route === '/attention/privacy');
    expect(privacy).toMatchObject({ repo: 'DigitalTrustProtocol/BrowserExtension', path: 'docs/privacy.html', kind: 'policy' });
  });
});

describe('validateSourcesConfig', () => {
  it('reports every problem at once', () => {
    expect(() =>
      validateSourcesConfig({
        repos,
        sources: [
          entry,
          { ...entry, path: 'docs/two.md' },
          { ...entry, id: 'three', route: '/Bad/', repo: 'Org/Missing', path: 'x.txt' },
          { ...entry, id: 'four', route: '/protocol/four', path: 'docs/four.md', ref: 'r2' },
        ],
      }),
    ).toThrow(/duplicate id[\s\S]*duplicate route[\s\S]*route must look like[\s\S]*not listed in "repos"[\s\S]*path must end in[\s\S]*pin each repo at one commit/);
  });

  it('resolves refs per repo', () => {
    const config = validateSourcesConfig({ repos, sources: [entry] });
    expect(refForRepo(config, 'Org/A')).toBe('r1');
    expect(shortRef('ccd7c462240f71bf0afc9c8408a4f7f8b5aebc2f')).toBe('ccd7c46');
    expect(shortRef('main')).toBe('main');
  });
});
