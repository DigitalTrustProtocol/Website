/**
 * `npm run content:pin [-- --dry-run]`
 *
 * Re-pins every repo in content.sources.json to the HEAD commit of its
 * sibling checkout, re-syncs content/_imported at the new refs, and rebuilds
 * vendor/trust-graph at the new TrustGraph ref. `--dry-run` prints the
 * changes and writes nothing. Review and commit the result.
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateSourcesConfig } from '../app/content/sources';
import { resolveCommit, TRUST_GRAPH_REPO, VENDOR_DIR, vendorEngine } from './lib/engine-vendor';
import { pinRefs, serializeSourcesConfig } from './lib/pin';
import { syncLocal, writeSyncResult } from './lib/sync';

const root = resolve(import.meta.dirname, '..');
const configPath = resolve(root, 'content.sources.json');

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const raw = JSON.parse(await readFile(configPath, 'utf8')) as Parameters<typeof pinRefs>[0] & {
    repos: Record<string, { localDir: string }>;
  };
  const heads: Record<string, string> = {};
  for (const [repo, { localDir }] of Object.entries(raw.repos)) {
    const dir = resolve(root, localDir);
    if (!existsSync(dir)) {
      console.warn(`warn: ${repo}: ${localDir} not found; ref left unchanged`);
      continue;
    }
    heads[repo] = await resolveCommit(dir, 'HEAD');
  }

  const { config, changes } = pinRefs(raw, heads);
  for (const change of changes) {
    console.log(`  ${change.repo}: ${change.from.slice(0, 12)} → ${change.to.slice(0, 12)} (${change.sources} sources)`);
  }
  if (changes.length === 0) console.log('content:pin: every repo is already pinned to its HEAD');
  if (dryRun) return;

  const validated = validateSourcesConfig(config);
  await writeFile(configPath, serializeSourcesConfig(config));
  const result = await syncLocal(validated, root);
  await writeSyncResult(resolve(root, 'content/_imported'), result);
  for (const warning of result.warnings) console.warn(`warn: ${warning}`);

  const trustGraph = validated.repos[TRUST_GRAPH_REPO];
  const trustGraphHead = heads[TRUST_GRAPH_REPO];
  if (trustGraph && trustGraphHead) {
    const lock = await vendorEngine({
      repoDir: resolve(root, trustGraph.localDir),
      repoName: TRUST_GRAPH_REPO,
      ref: trustGraphHead,
      websiteRoot: root,
    });
    console.log(`  ${VENDOR_DIR} rebuilt at ${lock.ref.slice(0, 12)}`);
  }
  console.log('content:pin: done. Run `npm run check`, review the diff, and commit.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
