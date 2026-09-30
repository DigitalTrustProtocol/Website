import { validateSourcesConfig, type SourcesConfig } from '../../app/content/sources';
import type { RepoTrees } from './links';

export const EXT_REF = 'ccd7c462240f71bf0afc9c8408a4f7f8b5aebc2f';
export const TG_REF = '8a4c43abfabefbcb2912e57c739cb80a05747f12';

/** A small two-repo workspace that mirrors the real sibling layout. */
export function fixtureConfig(): SourcesConfig {
  return validateSourcesConfig({
    repos: {
      'DigitalTrustProtocol/BrowserExtension': { label: 'BrowserExtension', localDir: '../AttentionX', defaultBranch: 'main' },
      'DigitalTrustProtocol/TrustGraph': { label: 'TrustGraph', localDir: '../TrustGraph', defaultBranch: 'main' },
    },
    sources: [
      {
        id: 'nip-32009', repo: 'DigitalTrustProtocol/BrowserExtension', path: 'docs/NIP-32009.md',
        ref: EXT_REF, route: '/protocol/nip-32009', section: 'protocol', title: 'NIP-32009',
      },
      {
        id: 'nip-32014', repo: 'DigitalTrustProtocol/BrowserExtension', path: 'docs/NIP-32014.md',
        ref: EXT_REF, route: '/protocol/nip-32014', section: 'protocol', title: 'NIP-32014',
      },
      {
        id: 'wot-model', repo: 'DigitalTrustProtocol/TrustGraph', path: 'specs/wot-model.md',
        ref: TG_REF, route: '/protocol/wot-model', section: 'protocol', title: 'Model',
      },
      {
        id: 'conformance', repo: 'DigitalTrustProtocol/TrustGraph', path: 'specs/conformance.md',
        ref: TG_REF, route: '/protocol/conformance', section: 'protocol', title: 'Conformance',
      },
    ],
  });
}

export function fixtureTrees(): RepoTrees {
  return {
    'DigitalTrustProtocol/BrowserExtension': new Set([
      'docs/NIP-32009.md',
      'docs/NIP-32014.md',
      'docs/architecture.md',
      'src/graph/trust/IndexResolver.ts',
    ]),
    'DigitalTrustProtocol/TrustGraph': new Set(['specs/wot-model.md', 'specs/conformance.md', 'README.md']),
  };
}

export function source(config: SourcesConfig, id: string) {
  const found = config.sources.find((entry) => entry.id === id);
  if (!found) throw new Error(`fixture source ${id} missing`);
  return found;
}
