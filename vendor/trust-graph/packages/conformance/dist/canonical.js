/**
 * Order-insensitive fields (conformance.md § Canonical comparison): both the
 * actual output and the expectation are sorted the same way before matching,
 * so expectations may list set-valued arrays in any order.
 */
function byString(key) {
    return (a, b) => {
        const x = key(a);
        const y = key(b);
        return x < y ? -1 : x > y ? 1 : 0;
    };
}
const str = (value) => (typeof value === 'string' ? value : JSON.stringify(value));
function sortInPlace(record, field, compare) {
    const value = record[field];
    if (Array.isArray(value))
        record[field] = [...value].sort(compare);
}
function field(item, name) {
    return item && typeof item === 'object' ? str(item[name]) : str(item);
}
/** Sort the set-valued arrays of one query output (or expectation) in place. */
export function canonicalizeSets(type, value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return value;
    const out = structuredClone(value);
    sortInPlace(out, 'sourceEventIds', byString(str));
    sortInPlace(out, 'reasons', byString(str));
    const view = out.pathView;
    if (view && typeof view === 'object') {
        sortInPlace(view, 'nodes', byString((n) => field(n, 'subject')));
        sortInPlace(view, 'edges', byString((e) => field(e, 'eventId')));
    }
    sortInPlace(out, 'ratingEdges', byString((e) => field(e, 'eventId')));
    if (type === 'neighborhood') {
        sortInPlace(out, 'nodes', byString((n) => field(n, 'subject')));
        sortInPlace(out, 'edges', byString((e) => field(e, 'eventId')));
    }
    if (type === 'frontier') {
        sortInPlace(out, 'authors', byString((a) => field(a, 'pubkey')));
    }
    return out;
}
