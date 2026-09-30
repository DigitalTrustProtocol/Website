/**
 * Lookups (wot-model.md §8.1): one degree of stored winners, independent of
 * the observer. Grown from AttentionX `graph/incoming.ts`, `graph/outgoing.ts`
 * and `GraphManager.incomingRecords` / `outgoingUserRecords`: the same
 * `Graph` adjacency reads, plus filters, `selected` / `raw`, `mergeKeys`,
 * total order, keyset pages, and counts. Never walks more than one degree.
 */
import { RATING_STATEMENT_KIND, TRUST_STATEMENT_KIND, isValidAt, trustEdgeValue, } from '@dtp/trust-graph';
import { cloneLabelHints } from '@dtp/trust-protocol';
import { parseNodeId, subjectNodeId } from './shared/graph-deeplink';
export const DEFAULT_LOOKUP_LIMITS = Object.freeze({
    maxKeys: 50,
    maxPage: 500,
    maxRecords: 5_000_000,
});
export const DEFAULT_LOOKUP_PAGE_SIZE = 100;
/** Request errors map to `DTP-ERR invalid`. */
export class LookupError extends Error {
    code = 'invalid';
    constructor(message) {
        super(message);
        this.name = 'LookupError';
    }
}
const PUBKEY_HEX = /^[0-9a-f]{64}$/;
const KINDS = [TRUST_STATEMENT_KIND, RATING_STATEMENT_KIND];
function optionalInt(name, value) {
    if (value === undefined)
        return undefined;
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        throw new LookupError(`${name} must be a non-negative integer`);
    }
    return value;
}
function stringList(name, value) {
    if (value === undefined)
        return undefined;
    if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
        throw new LookupError(`${name} must be an array of strings`);
    }
    return value;
}
function parseKeys(keys, direction, limits) {
    if (!Array.isArray(keys) || keys.length === 0) {
        throw new LookupError('keys must be a non-empty array');
    }
    if (keys.length > limits.maxKeys) {
        throw new LookupError(`at most ${limits.maxKeys} keys per request`);
    }
    const parsed = [];
    const seen = new Set();
    for (const raw of keys) {
        if (typeof raw !== 'string')
            throw new LookupError('keys must be wire node ids');
        const subject = parseNodeId(raw);
        if (!subject)
            throw new LookupError(`invalid key: ${raw.slice(0, 80)}`);
        const normalized = { type: subject.type, value: subject.value.toLowerCase() };
        if (direction === 'outgoing' && (normalized.type !== 'p' || !PUBKEY_HEX.test(normalized.value))) {
            throw new LookupError('outgoing keys must be pubkeys (p:<hex>)');
        }
        const wire = subjectNodeId(normalized);
        if (seen.has(wire))
            continue;
        seen.add(wire);
        parsed.push({ wire: raw, subject: normalized });
    }
    return parsed;
}
function normalizeFilters(input) {
    const kinds = input.kinds ?? [TRUST_STATEMENT_KIND];
    if (!Array.isArray(kinds) || kinds.length === 0 || kinds.some((k) => !KINDS.includes(k))) {
        throw new LookupError('kinds must be a non-empty subset of [32009, 32014]');
    }
    const context = input.context ?? '';
    if (typeof context !== 'string')
        throw new LookupError('context must be a string');
    const contextMatch = input.contextMatch;
    if (contextMatch !== undefined && !['chain', 'exact', 'any'].includes(contextMatch)) {
        throw new LookupError('contextMatch must be chain, exact, or any');
    }
    let values;
    if (input.values !== undefined) {
        if (!Array.isArray(input.values) || input.values.some((v) => v !== 1 && v !== 0 && v !== -1)) {
            throw new LookupError('values must be a subset of [1, 0, -1]');
        }
        values = new Set(input.values);
    }
    let subjectTypes;
    const types = stringList('subjectTypes', input.subjectTypes);
    if (types) {
        const allowed = ['p', 'user:id', 'post:id', 'e', 'other'];
        if (types.some((t) => !allowed.includes(t))) {
            throw new LookupError('subjectTypes must be a subset of p, user:id, post:id, e, other');
        }
        subjectTypes = new Set(types);
    }
    const labels = stringList('labels', input.labels)?.filter((l) => l.length > 0);
    const mode = input.mode ?? 'selected';
    if (mode !== 'selected' && mode !== 'raw')
        throw new LookupError('mode must be selected or raw');
    const now = input.now ?? Math.floor(Date.now() / 1000);
    if (typeof now !== 'number' || !Number.isFinite(now))
        throw new LookupError('now must be finite');
    const since = optionalInt('since', input.since);
    const until = optionalInt('until', input.until);
    return {
        kinds: [...new Set(kinds)],
        context,
        ...(contextMatch !== undefined ? { contextMatch } : {}),
        ...(values ? { values } : {}),
        ...(subjectTypes ? { subjectTypes } : {}),
        ...(labels && labels.length > 0 ? { labels } : {}),
        includeInactive: input.includeInactive === true,
        now,
        ...(since !== undefined ? { since } : {}),
        ...(until !== undefined ? { until } : {}),
        mode,
        mergeKeys: input.mergeKeys === true,
    };
}
/** Bucket indexes for one kind, most specific first (`chain`), or all (`any`). */
function bucketIndexes(graph, kind, filters) {
    const match = filters.contextMatch ?? (kind === TRUST_STATEMENT_KIND ? 'chain' : 'exact');
    switch (match) {
        case 'chain':
            return graph.getContextIndexes(filters.context, kind);
        case 'exact': {
            const index = graph.getContextIndex(filters.context, kind);
            return index === undefined ? [] : [index];
        }
        case 'any': {
            const prefix = `${kind}:`;
            const result = [];
            graph.contextList.forEach((key, index) => {
                if (key === String(kind) || key?.startsWith(prefix))
                    result.push(index);
            });
            return result;
        }
        default: {
            const _exhaustive = match;
            return _exhaustive;
        }
    }
}
function subjectTypeOf(edge) {
    const subject = edge.subject ?? '';
    switch (edge.subjectType) {
        case 'p':
            return 'p';
        case 'e':
            return 'e';
        case 'i':
            if (subject.startsWith('user:id:'))
                return 'user:id';
            if (subject.startsWith('post:id:'))
                return 'post:id';
            return 'other';
        default:
            return 'other';
    }
}
/** P2 order inside a bucket: scopeRank desc, created_at desc, id asc. */
function preferRecord(a, b) {
    return ((b.scopeRank ?? 0) - (a.scopeRank ?? 0) ||
        b.created_at - a.created_at ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
function hasEvidence(edge, kind) {
    if (kind === TRUST_STATEMENT_KIND)
        return trustEdgeValue(edge) !== undefined;
    return edge.nValue !== undefined;
}
function collectCandidates(graph, keys, direction, filters, scan) {
    const out = [];
    const seen = new Set();
    for (const kind of filters.kinds) {
        const buckets = bucketIndexes(graph, kind, filters);
        if (buckets.length === 0)
            continue;
        for (const key of keys) {
            const node = graph.getNode(key.subject.value);
            if (!node)
                continue;
            const maps = direction === 'incoming' ? node.inbound : node.outbound;
            buckets.forEach((bucket, bucketRank) => {
                const peers = maps.get(bucket);
                if (!peers)
                    return;
                for (const edgeIndexes of peers.values()) {
                    for (const edgeIndex of edgeIndexes) {
                        if (scan.scanned >= scan.maxRecords) {
                            scan.exhausted = true;
                            return;
                        }
                        scan.scanned += 1;
                        if (seen.has(edgeIndex))
                            continue;
                        const edge = graph.edgesList[edgeIndex];
                        if (!edge || edge.kind !== kind || !hasEvidence(edge, kind))
                            continue;
                        if (direction === 'incoming') {
                            // Keys are not resolved through binds: keep only records whose
                            // own subject is this key (a bound user:id shares a heap node).
                            if (edge.subjectType !== key.subject.type)
                                continue;
                            if ((edge.subject ?? '').toLowerCase() !== key.subject.value)
                                continue;
                        }
                        else if (edge.pubkey.toLowerCase() !== key.subject.value) {
                            continue;
                        }
                        if (!filters.includeInactive && !isValidAt(edge, filters.now))
                            continue;
                        seen.add(edgeIndex);
                        out.push({ edge, key, bucketRank });
                    }
                }
            });
        }
    }
    return out;
}
function selectCandidates(candidates, filters) {
    if (filters.mode === 'raw')
        return [...candidates];
    const groups = new Map();
    for (const candidate of candidates) {
        const { edge } = candidate;
        // One statement per (author, subject, kind); for incoming the subject is the key.
        const slot = `${edge.pubkey.toLowerCase()}|${edge.subjectType}:${(edge.subject ?? '').toLowerCase()}|${edge.kind}`;
        const current = groups.get(slot);
        if (!current) {
            groups.set(slot, candidate);
            continue;
        }
        const anyMode = (filters.contextMatch ?? '') === 'any';
        const byBucket = anyMode ? 0 : candidate.bucketRank - current.bucketRank;
        if (byBucket < 0 || (byBucket === 0 && preferRecord(edge, current.edge) < 0)) {
            groups.set(slot, candidate);
        }
    }
    return [...groups.values()];
}
function toItem(edge) {
    const kind = edge.kind;
    const labelHints = cloneLabelHints(edge.labelHints);
    const subject = {
        type: edge.subjectType ?? 'i',
        value: edge.subject ?? '',
    };
    const item = {
        eventId: edge.id,
        connectionKey: edge.addressKey,
        kind,
        author: edge.pubkey.toLowerCase(),
        subject,
        context: edge.c_tag ?? '',
        createdAt: edge.created_at,
    };
    if (kind === TRUST_STATEMENT_KIND)
        item.value = trustEdgeValue(edge);
    else
        item.score = edge.nValue;
    if (edge.activate !== undefined)
        item.activeFrom = edge.activate;
    if (edge.expire !== undefined)
        item.activeUntil = edge.expire;
    if (edge.labels !== undefined && edge.labels.length > 0)
        item.labels = [...edge.labels];
    if (labelHints !== undefined)
        item.labelHints = labelHints;
    if (edge.content !== undefined && edge.content !== '')
        item.content = edge.content;
    return item;
}
function passesFilters(edge, direction, filters) {
    if (edge.kind === TRUST_STATEMENT_KIND && filters.values) {
        const value = trustEdgeValue(edge);
        if (value === undefined || !filters.values.has(value))
            return false;
    }
    if (edge.kind === RATING_STATEMENT_KIND && filters.labels) {
        const labels = edge.labels ?? [];
        if (!filters.labels.some((label) => labels.includes(label)))
            return false;
    }
    if (direction === 'outgoing' && filters.subjectTypes && !filters.subjectTypes.has(subjectTypeOf(edge))) {
        return false;
    }
    if (filters.since !== undefined && edge.created_at < filters.since)
        return false;
    if (filters.until !== undefined && edge.created_at > filters.until)
        return false;
    return true;
}
/**
 * `mergeKeys`: the extension's `omitSameValueUserIdDuplicate` rule — drop a
 * `user:id` trust row when the same author has a `p` row with the same value.
 */
function omitSameValueUserIdDuplicate(items) {
    const keyTrust = new Set(items.flatMap((row) => row.kind === TRUST_STATEMENT_KIND && row.subject.type === 'p'
        ? [`${row.author}:${row.value}`]
        : []));
    return items.filter((row) => {
        if (row.kind !== TRUST_STATEMENT_KIND)
            return true;
        if (row.subject.type !== 'i')
            return true;
        if (!row.subject.value.startsWith('user:id:'))
            return true;
        return !keyTrust.has(`${row.author}:${row.value}`);
    });
}
function sortKey(item, order) {
    return order === 'recent'
        ? [item.createdAt, item.eventId]
        : [item.author, item.createdAt, item.eventId];
}
function compareKeys(a, b, order) {
    if (order === 'recent') {
        const [ca, ia] = a;
        const [cb, ib] = b;
        return cb - ca || (ia < ib ? -1 : ia > ib ? 1 : 0);
    }
    const [aa, ca, ia] = a;
    const [ab, cb, ib] = b;
    return ((aa < ab ? -1 : aa > ab ? 1 : 0) ||
        cb - ca ||
        (ia < ib ? -1 : ia > ib ? 1 : 0));
}
function tally(items) {
    const totals = { trust: 0, neutral: 0, distrust: 0, ratings: 0 };
    for (const item of items) {
        if (item.kind === RATING_STATEMENT_KIND)
            totals.ratings += 1;
        else if (item.value === 1)
            totals.trust += 1;
        else if (item.value === -1)
            totals.distrust += 1;
        else if (item.value === 0)
            totals.neutral += 1;
    }
    return totals;
}
/** FNV-1a over the canonical filter, so a cursor cannot be reused with other filters. */
function fingerprint(value) {
    const text = JSON.stringify(value);
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}
function filterFingerprint(direction, keys, filters, order) {
    return fingerprint([
        direction,
        keys.map((k) => subjectNodeId(k.subject)).sort(),
        filters.kinds,
        filters.context,
        filters.contextMatch ?? null,
        filters.values ? [...filters.values].sort() : null,
        filters.subjectTypes ? [...filters.subjectTypes].sort() : null,
        filters.labels ?? null,
        filters.includeInactive,
        filters.since ?? null,
        filters.until ?? null,
        filters.mode,
        filters.mergeKeys,
        order,
    ]);
}
// Sort keys hold only numbers, hex ids, and pubkeys, so the JSON is ASCII.
function encodeCursor(key, fp) {
    const json = JSON.stringify({ v: 1, k: key, f: fp });
    return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeCursor(cursor, fp, order) {
    let parsed;
    try {
        parsed = JSON.parse(atob(cursor.replace(/-/g, '+').replace(/_/g, '/')));
    }
    catch {
        throw new LookupError('cursor is malformed');
    }
    if (parsed.v !== 1 || !Array.isArray(parsed.k))
        throw new LookupError('cursor is malformed');
    if (parsed.f !== fp)
        throw new LookupError('cursor does not match this lookup');
    const k = parsed.k;
    const ok = order === 'recent'
        ? k.length === 2 && typeof k[0] === 'number' && typeof k[1] === 'string'
        : k.length === 3 && typeof k[0] === 'string' && typeof k[1] === 'number' && typeof k[2] === 'string';
    if (!ok)
        throw new LookupError('cursor is malformed');
    return k;
}
function resolveItems(graph, keys, direction, filters, maxRecords) {
    const scan = { scanned: 0, maxRecords, exhausted: false };
    const candidates = collectCandidates(graph, keys, direction, filters, scan);
    const selected = selectCandidates(candidates, filters);
    let items = selected
        .filter(({ edge }) => passesFilters(edge, direction, filters))
        .map(({ edge }) => toItem(edge));
    if (direction === 'incoming' && filters.mergeKeys) {
        items = omitSameValueUserIdDuplicate(items);
    }
    return { items, exhausted: scan.exhausted };
}
function parseOrder(value) {
    const order = value ?? 'recent';
    if (order !== 'recent' && order !== 'author')
        throw new LookupError('order must be recent or author');
    return order;
}
/** `lookup.incoming` / `lookup.outgoing`: one page of stored winners. */
export function lookupPage(graph, graphVersion, direction, params, limits = DEFAULT_LOOKUP_LIMITS) {
    if (typeof params !== 'object' || params === null)
        throw new LookupError('params must be an object');
    const keys = parseKeys(params.keys, direction, limits);
    const filters = normalizeFilters(params);
    const order = parseOrder(params.order);
    const rawLimit = optionalInt('limit', params.limit) ?? DEFAULT_LOOKUP_PAGE_SIZE;
    const limit = Math.max(1, Math.min(rawLimit, limits.maxPage));
    const fp = filterFingerprint(direction, keys, filters, order);
    if (params.cursor !== undefined && typeof params.cursor !== 'string') {
        throw new LookupError('cursor must be a string');
    }
    const after = params.cursor !== undefined ? decodeCursor(params.cursor, fp, order) : undefined;
    const { items, exhausted } = resolveItems(graph, keys, direction, filters, limits.maxRecords);
    items.sort((a, b) => compareKeys(sortKey(a, order), sortKey(b, order), order));
    let start = 0;
    if (after) {
        while (start < items.length && compareKeys(sortKey(items[start], order), after, order) <= 0) {
            start += 1;
        }
    }
    const page = items.slice(start, start + limit);
    const hasMore = start + limit < items.length || (exhausted && page.length > 0);
    const result = { graphVersion, items: page };
    if (hasMore && page.length > 0) {
        result.nextCursor = encodeCursor(sortKey(page[page.length - 1], order), fp);
    }
    if (exhausted) {
        result.truncated = true;
        result.truncatedReasons = ['edgeBudget'];
    }
    else if (params.withTotals === true) {
        result.totals = tally(items);
    }
    return result;
}
/** `lookup.counts`: exact tallies per key, or for the merged alias set. */
export function lookupCounts(graph, graphVersion, params, limits = DEFAULT_LOOKUP_LIMITS) {
    if (typeof params !== 'object' || params === null)
        throw new LookupError('params must be an object');
    const direction = params.direction;
    if (direction !== 'incoming' && direction !== 'outgoing') {
        throw new LookupError('direction must be incoming or outgoing');
    }
    const keys = parseKeys(params.keys, direction, limits);
    const filters = normalizeFilters(params);
    const counts = {};
    let exhausted = false;
    if (direction === 'incoming' && filters.mergeKeys) {
        const resolved = resolveItems(graph, keys, direction, filters, limits.maxRecords);
        exhausted = resolved.exhausted;
        counts.merged = tally(resolved.items);
    }
    else {
        for (const key of keys) {
            const resolved = resolveItems(graph, [key], direction, filters, limits.maxRecords);
            exhausted ||= resolved.exhausted;
            counts[key.wire] = tally(resolved.items);
        }
    }
    const result = { graphVersion, counts };
    if (exhausted) {
        result.truncated = true;
        result.truncatedReasons = ['edgeBudget'];
    }
    return result;
}
