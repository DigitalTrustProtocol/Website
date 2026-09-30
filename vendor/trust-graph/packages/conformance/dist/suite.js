/**
 * Runs the corpus against the TypeScript packages. Used by the Vitest
 * wrapper in this package and by other TypeScript runtimes (Personal Server)
 * that want the same gate.
 */
import { canonicalizeSets } from './canonical';
import { loadCase, loadManifest, corpusDir } from './corpus';
import { matchPartial } from './match';
import { buildState, runLookupPages, runQuery } from './model-runner';
import { runProtocolCase } from './protocol-runner';
import { isProtocolCase } from './types';
export function loadCorpus(dir = corpusDir) {
    const manifest = loadManifest(dir);
    const entries = [];
    for (const file of manifest.cases) {
        const loaded = loadCase(file, dir).expanded;
        const cases = 'cases' in loaded ? loaded.cases : [loaded];
        for (const testCase of cases)
            entries.push({ file, testCase });
    }
    return entries;
}
export function gapTags(testCase) {
    return testCase.tags.filter((tag) => tag.startsWith('gap:'));
}
const MODES = ['lenient', 'strict'];
function isPerMode(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return false;
    const keys = Object.keys(value);
    return keys.length > 0 && keys.every((key) => key === 'lenient' || key === 'strict');
}
/** The TypeScript runner asserts `expectCurrent` for gap cases, else `expect`. */
export function tsExpectation(query, mode) {
    const chosen = query.expectCurrent !== undefined ? query.expectCurrent : query.expect;
    if (mode && isPerMode(chosen))
        return chosen[mode];
    return chosen;
}
function itemsForCompare(actual, expected) {
    if (Array.isArray(expected) && expected.length > 0 && typeof expected[0] === 'string') {
        return actual.map((item) => item.eventId);
    }
    if (Array.isArray(expected) && expected.length === 0)
        return actual;
    return actual;
}
export function runModelQuery(state, query, index) {
    const modes = query.modes ?? [undefined];
    const outcomes = [];
    for (const mode of modes) {
        const label = `#${index} ${query.type}${mode ? ` [${mode}]` : ''}${query.note ? ` — ${query.note}` : ''}`;
        const input = mode ? { ...query.input, bindingMode: mode } : query.input;
        const errors = [];
        if (query.pages && query.pages.length > 0) {
            // `pages` lists consecutive pages that all use the first entry's limit.
            const direction = query.type === 'lookup-outgoing' ? 'outgoing' : 'incoming';
            const actualPages = runLookupPages(state, direction, input, query.pages[0].limit);
            if (actualPages.length !== query.pages.length) {
                errors.push(`$.pages: expected ${query.pages.length} pages, got ${actualPages.length}`);
            }
            for (const [p, page] of query.pages.entries()) {
                const actual = actualPages[p];
                if (!actual)
                    continue;
                errors.push(...matchPartial(itemsForCompare(actual.items, page.expectItems), page.expectItems, `$.pages[${p}].items`), ...matchPartial(actual.nextCursor, page.expectNextCursor, `$.pages[${p}].nextCursor`));
            }
        }
        const expected = tsExpectation(query, mode);
        if (expected !== undefined) {
            const output = runQuery(state, query, input);
            if (Array.isArray(output.items)) {
                output.items = itemsForCompare(output.items, expected.items);
            }
            errors.push(...matchPartial(canonicalizeSets(query.type, output), canonicalizeSets(query.type, expected)));
        }
        outcomes.push({ label, errors });
    }
    return outcomes;
}
export function runModelCase(testCase) {
    const state = buildState(testCase);
    return testCase.queries.flatMap((query, index) => runModelQuery(state, query, index));
}
export async function runProtocolEntry(testCase) {
    const verdict = await runProtocolCase(testCase);
    return matchPartial(verdict, testCase.expect);
}
/** Structural checks every case must pass, independent of the runtime. */
export function lintCase(testCase) {
    const errors = [];
    if (!testCase.id)
        errors.push('missing id');
    if (!Array.isArray(testCase.tags))
        errors.push('missing tags');
    if (isProtocolCase(testCase))
        return errors;
    const gaps = gapTags(testCase);
    for (const [i, query] of testCase.queries.entries()) {
        const hasModel = query.expectModel !== undefined;
        const hasCurrent = query.expectCurrent !== undefined;
        if (hasModel !== hasCurrent)
            errors.push(`query ${i}: expectModel and expectCurrent go together`);
        if (hasModel && gaps.length === 0)
            errors.push(`query ${i}: expectModel needs a gap:Gn tag`);
        if (hasModel && query.expect !== undefined)
            errors.push(`query ${i}: use expect or expectModel/expectCurrent`);
        if (!hasModel && query.expect === undefined && !query.pages)
            errors.push(`query ${i}: no expectation`);
        if (testCase.tags.includes('bind') && !query.modes) {
            errors.push(`query ${i}: bind cases list both binding modes`);
        }
    }
    return errors;
}
export { MODES };
