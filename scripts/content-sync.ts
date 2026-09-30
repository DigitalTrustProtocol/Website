/**
 * `npm run content:sync [-- --local | --remote]`
 *
 * Fetches every source in content.sources.json at its pinned ref into
 * content/_imported/. `--local` (default) reads the sibling checkouts;
 * `--remote` reads GitHub (CI).
 */
import { resolve } from 'node:path';
import { SOURCES_CONFIG } from '../app/content/sources';
import { syncLocal, syncRemote, writeSyncResult, type SyncMode } from './lib/sync';

const root = resolve(import.meta.dirname, '..');

function parseMode(args: string[]): SyncMode {
  const remote = args.includes('--remote');
  const local = args.includes('--local');
  if (remote && local) throw new Error('Choose one of --local or --remote');
  return remote ? 'remote' : 'local';
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const result =
    mode === 'remote'
      ? await syncRemote(SOURCES_CONFIG, { token: process.env.GITHUB_TOKEN })
      : await syncLocal(SOURCES_CONFIG, root);
  await writeSyncResult(resolve(root, 'content/_imported'), result);

  for (const warning of result.warnings) console.warn(`warn: ${warning}`);
  const all = Object.values(result.manifest.sources);
  const ok = all.filter((source) => source.status === 'ok');
  console.log(`content:sync (${mode}): ${ok.length}/${all.length} sources synced`);
  for (const source of all) {
    const where = source.status === 'ok' ? `${source.origin} @ ${source.resolvedRef.slice(0, 12)}` : 'missing';
    console.log(`  ${source.id.padEnd(28)} ${where}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
