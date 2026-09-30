/**
 * Sync frontier (wot-model.md §8): whose events to fetch. Ported from
 * AttentionX `GraphManager.positiveChildren` / `positiveAuthorFrontier`;
 * adds each author's depth and one `via` parent to the result.
 * Not a trust result: it ignores the hop threshold.
 */
import { IDENTITY_TRUST_CONTEXT } from './shared/trust-context';
const PUBKEY_HEX = /^[0-9a-f]{64}$/;
/**
 * Positive, active, heap-resolved pubkey hops from these authors, including
 * `user:id` aliases bound onto a pubkey node. Returns child → first parent.
 */
export function positiveChildren(graph, authors, nowSeconds) {
    const out = new Map();
    const opts = {
        context: IDENTITY_TRUST_CONTEXT,
        value: 1,
        includeInactive: false,
        now: nowSeconds,
    };
    for (const author of authors) {
        const hex = author.trim().toLowerCase();
        if (!PUBKEY_HEX.test(hex))
            continue;
        for (const conn of graph.out(hex, opts)) {
            let child;
            if (conn.subjectType === 'p' && PUBKEY_HEX.test(conn.subject)) {
                child = conn.subject.toLowerCase();
            }
            else if (conn.subjectType === 'i') {
                const bound = graph.iToP.get(conn.subject.toLowerCase());
                if (bound && PUBKEY_HEX.test(bound))
                    child = bound;
            }
            if (child !== undefined && !out.has(child))
                out.set(child, hex);
        }
    }
    return new Map([...out].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
export function positiveAuthorFrontier(graph, roots, limits, nowSeconds = Math.floor(Date.now() / 1_000)) {
    const reasons = new Set();
    let current = [
        ...new Set(roots
            .map((root) => root.trim().toLowerCase())
            .filter((root) => PUBKEY_HEX.test(root))),
    ].sort();
    if (current.length > limits.maxAuthorsPerLevel) {
        current = current.slice(0, limits.maxAuthorsPerLevel);
        reasons.add('maxAuthorsPerLevel');
    }
    if (current.length > limits.maxTotalAuthors) {
        current = current.slice(0, limits.maxTotalAuthors);
        reasons.add('maxTotalAuthors');
    }
    const discovered = new Map(current.map((pubkey) => [pubkey, { pubkey, depth: 0 }]));
    for (let depth = 0; depth <= limits.maxDepth; depth += 1) {
        const children = [...positiveChildren(graph, current, nowSeconds)].filter(([pubkey]) => !discovered.has(pubkey));
        if (depth === limits.maxDepth) {
            if (children.length > 0)
                reasons.add('maxDepth');
            break;
        }
        let next = children;
        if (next.length > limits.maxAuthorsPerLevel) {
            next = next.slice(0, limits.maxAuthorsPerLevel);
            reasons.add('maxAuthorsPerLevel');
        }
        const remaining = limits.maxTotalAuthors - discovered.size;
        if (next.length > remaining) {
            next = next.slice(0, Math.max(0, remaining));
            reasons.add('maxTotalAuthors');
        }
        for (const [pubkey, via] of next) {
            discovered.set(pubkey, { pubkey, depth: depth + 1, via });
        }
        current = next.map(([pubkey]) => pubkey);
        if (current.length === 0)
            break;
    }
    return { authors: [...discovered.values()], reasons: [...reasons] };
}
