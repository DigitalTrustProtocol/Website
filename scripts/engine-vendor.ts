/**
 * `npm run engine:vendor [-- --ref <commit>]`
 *
 * Rebuilds vendor/trust-graph (the playground engine and the corpus) from the
 * sibling TrustGraph checkout at a commit: by default the TrustGraph ref in
 * content.sources.json. `--verify` only checks the vendored files against
 * VENDOR.json. Decision W-D9 in PLAN.md.
 */
import { resolve } from 'node:path';
import { refForRepo, SOURCES_CONFIG } from '../app/content/sources';
import { TRUST_GRAPH_REPO, VENDOR_DIR, vendorEngine, verifyVendor } from './lib/engine-vendor';

const root = resolve(import.meta.dirname, '..');

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const vendorDir = resolve(root, VENDOR_DIR);
  if (args.includes('--verify')) {
    const problems = await verifyVendor(vendorDir);
    if (problems.length > 0) throw new Error(`${VENDOR_DIR} does not match VENDOR.json:\n  ${problems.join('\n  ')}`);
    console.log(`engine:vendor: ${VENDOR_DIR} matches VENDOR.json`);
    return;
  }
  const repo = SOURCES_CONFIG.repos[TRUST_GRAPH_REPO];
  if (!repo) throw new Error(`${TRUST_GRAPH_REPO} is not in content.sources.json`);
  const ref = argValue(args, '--ref') ?? refForRepo(SOURCES_CONFIG, TRUST_GRAPH_REPO);
  const lock = await vendorEngine({ repoDir: resolve(root, repo.localDir), repoName: TRUST_GRAPH_REPO, ref, websiteRoot: root });
  console.log(`engine:vendor: ${TRUST_GRAPH_REPO} @ ${lock.ref.slice(0, 12)} → ${VENDOR_DIR} (${Object.keys(lock.files).length} files)`);
  for (const [name, version] of Object.entries(lock.packages)) console.log(`  ${name} ${version}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
