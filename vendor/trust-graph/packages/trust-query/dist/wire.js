/**
 * Helpers that shape heap results for the resolver protocol
 * (resolver-api.md): canonical statement order (proposal P3), the
 * `statementLimit` / `maxPathNodes` result guardrails, and the
 * `graph.neighborhood` center forms. They wrap `executeTrustQuery`,
 * `executeRatingQuery`, and `neighborhoodFromHeap`; they never walk.
 */
import { neighborhoodFromHeap } from './graph';
import { parseNodeId } from './shared/graph-deeplink';
function byDistanceRecentId(a, b) {
    return (a.distance - b.distance ||
        b.createdAt - a.createdAt ||
        (a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0));
}
/** P3 order: distance asc, createdAt desc, eventId asc. */
export function sortStatements(statements) {
    return [...statements].sort(byDistanceRecentId);
}
export function sortClaims(claims) {
    return [...claims].sort(byDistanceRecentId);
}
function limitPathView(view, maxNodes) {
    if (!view || view.nodes.length <= maxNodes)
        return { view, cut: false };
    const nodes = [...view.nodes]
        .sort((a, b) => a.depth - b.depth || String(a.id).localeCompare(String(b.id)))
        .slice(0, maxNodes);
    const kept = new Set(nodes.map((node) => node.id));
    const edges = view.edges.filter((edge) => kept.has(edge.from) && kept.has(edge.to));
    return { view: { nodes, edges }, cut: true };
}
function addReason(target, reason) {
    target.truncated = true;
    const reasons = target.truncatedReasons ?? [];
    if (!reasons.includes(reason))
        target.truncatedReasons = [...reasons, reason];
}
/** Canonical order, then cut statements and path nodes; counts stay exact. */
export function limitTrustResult(result, limits) {
    const out = { ...result, statements: sortStatements(result.statements) };
    if (out.statements.length > limits.statementLimit) {
        out.statements = out.statements.slice(0, limits.statementLimit);
        out.statementsTruncated = true;
        addReason(out, 'statementLimit');
    }
    const path = limitPathView(result.pathView, limits.maxPathNodes);
    if (path.cut) {
        out.pathView = path.view;
        addReason(out, 'pathLimit');
    }
    return out;
}
export function limitRatingResult(result, limits) {
    const out = { ...result, claims: sortClaims(result.claims) };
    if (out.claims.length > limits.statementLimit) {
        out.claims = out.claims.slice(0, limits.statementLimit);
        out.statementsTruncated = true;
        addReason(out, 'statementLimit');
    }
    const path = limitPathView(result.pathView, limits.maxPathNodes);
    if (path.cut) {
        out.pathView = path.view;
        addReason(out, 'pathLimit');
    }
    return out;
}
/** A wire subject `{ type, value }`, or undefined when malformed. */
export function parseWireSubject(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const record = value;
    if ((record.type === 'p' || record.type === 'e' || record.type === 'i') &&
        typeof record.value === 'string' &&
        record.value.length > 0 &&
        record.value.length <= 1_024) {
        return { type: record.type, value: record.value };
    }
    return undefined;
}
/**
 * `graph.neighborhood`: center by heap index, wire id, or the first of `keys`
 * (the rest of `keys` that are pubkeys also expand outward, like the
 * extension's `outboundPubkeys`). A bound `user:id` center also walks its
 * pubkey (AttentionX `GraphManager.neighborhood`).
 */
export function neighborhoodLookup(graph, graphVersion, params, maxLimit) {
    let centerIndex;
    const outboundPubkeys = [];
    const centerRef = params.centerId ?? params.keys?.[0];
    if (typeof centerRef === 'number') {
        centerIndex = Number.isInteger(centerRef) && centerRef >= 0 ? centerRef : undefined;
    }
    else if (typeof centerRef === 'string') {
        const subject = parseNodeId(centerRef);
        if (subject)
            centerIndex = graph.nodesIndex.get(subject.value.toLowerCase());
    }
    for (const key of params.keys ?? []) {
        const subject = parseNodeId(key);
        if (subject?.type === 'p')
            outboundPubkeys.push(subject.value.toLowerCase());
    }
    if (centerIndex !== undefined) {
        const centerNode = graph.nodesList[centerIndex];
        if (centerNode?.type === 'i') {
            const bound = graph.iToP.get(centerNode.id);
            if (bound)
                outboundPubkeys.push(bound);
        }
    }
    const requested = params.limit ?? 200;
    const limit = Math.max(1, Math.min(requested, maxLimit));
    // Build at the server cap, then cut in eventId order so a truncated
    // neighborhood does not depend on heap insertion order.
    const full = neighborhoodFromHeap(graph, graphVersion, centerIndex ?? -1, {
        ...(params.direction !== undefined ? { direction: params.direction } : {}),
        ...(params.valueFilter !== undefined ? { valueFilter: params.valueFilter } : {}),
        ...(params.context !== undefined ? { context: params.context } : {}),
        ...(params.now !== undefined ? { now: params.now } : {}),
        limit: maxLimit,
        ...(outboundPubkeys.length > 0 ? { outboundPubkeys } : {}),
    });
    let result = full;
    if (full.edges.length > limit) {
        const edges = [...full.edges]
            .sort((a, b) => (a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0))
            .slice(0, limit);
        const kept = new Set([full.centerId]);
        for (const edge of edges) {
            kept.add(edge.from);
            kept.add(edge.to);
        }
        result = { ...full, truncated: true, edges, nodes: full.nodes.filter((node) => kept.has(node.id)) };
    }
    return result.truncated ? { ...result, truncatedReasons: ['neighborhoodLimit'] } : result;
}
