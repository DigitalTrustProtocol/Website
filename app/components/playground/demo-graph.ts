import type { DemoGraph } from './engine';

/**
 * Provisional demo graph for the playground controls. It will be replaced by
 * data built from the TrustGraph corpus `demo-chain` cases and the
 * extension's demo WoT seed (tech.md § Playground), and CI will compare the
 * preset results with those corpus cases. Keys are readable placeholders,
 * not real pubkeys.
 */
export const DEMO_GRAPH: DemoGraph = {
  people: [
    { pubkey: 'you', label: 'You' },
    { pubkey: 'alice', label: 'Alice' },
    { pubkey: 'bob', label: 'Bob' },
    { pubkey: 'carol', label: 'Carol' },
    { pubkey: 'dave', label: 'Dave' },
    { pubkey: 'erin', label: 'Erin' },
    { pubkey: 'mallory', label: 'Mallory' },
    { pubkey: 'news-desk', label: 'News desk (npub A)' },
    { pubkey: 'impostor', label: 'Impostor (npub B)' },
  ],
  xAccounts: [{ id: '1001', handle: '@newsdesk' }],
  statements: [
    { id: 's1', pubkey: 'you', createdAt: 100, subjectType: 'p', subject: 'alice', context: 'identity', value: 1 },
    { id: 's2', pubkey: 'you', createdAt: 100, subjectType: 'p', subject: 'bob', context: 'identity', value: 1 },
    { id: 's3', pubkey: 'alice', createdAt: 110, subjectType: 'p', subject: 'carol', context: 'identity', value: 1 },
    { id: 's4', pubkey: 'bob', createdAt: 110, subjectType: 'p', subject: 'carol', context: 'identity', value: 1 },
    { id: 's5', pubkey: 'bob', createdAt: 120, subjectType: 'p', subject: 'mallory', context: 'identity', value: -1 },
    { id: 's6', pubkey: 'carol', createdAt: 130, subjectType: 'p', subject: 'dave', context: 'identity', value: 1 },
    { id: 's7', pubkey: 'dave', createdAt: 140, subjectType: 'p', subject: 'erin', context: 'identity', value: 0 },
    {
      id: 's8', pubkey: 'alice', createdAt: 150, subjectType: 'i', subject: 'user:id:1001',
      context: 'identity', value: 1, hintPubkey: 'news-desk',
    },
    {
      id: 's9', pubkey: 'carol', createdAt: 160, subjectType: 'i', subject: 'user:id:1001',
      context: 'identity', value: 1, hintPubkey: 'impostor',
    },
    {
      id: 's10', pubkey: 'bob', createdAt: 170, subjectType: 'p', subject: 'dave', context: 'identity',
      value: 1, activate: 200, expire: 400,
    },
  ],
  // Only the real owner claims the X account, so strict mode cuts the impostor hint.
  claims: [{ pubkey: 'news-desk', xId: '1001' }],
};
