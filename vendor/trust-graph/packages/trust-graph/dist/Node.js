/**
 * Vendored from DigitalTrustProtocol/Trust (src/lib/trust/graph/Node.ts).
 * Attention: `out`/`in` renamed to outbound/inbound (reserved-word safe for Oxc).
 * Context buckets are kind-prefixed; 32009 and 32014 do not share an index.
 * A peer may still hold multiple same-kind edge indexes in one bucket.
 */
function pushPeerEdge(map, peerIndex, edgeIndex) {
    let edges = map.get(peerIndex);
    if (!edges) {
        edges = [];
        map.set(peerIndex, edges);
    }
    if (!edges.includes(edgeIndex))
        edges.push(edgeIndex);
}
export function removePeerEdge(map, peerIndex, edgeIndex) {
    const edges = map.get(peerIndex);
    if (!edges)
        return;
    const next = edges.filter((index) => index !== edgeIndex);
    if (next.length === 0)
        map.delete(peerIndex);
    else
        map.set(peerIndex, next);
}
export function* eachPeerEdge(map) {
    for (const [peerIndex, edges] of map) {
        for (const edgeIndex of edges)
            yield [peerIndex, edgeIndex];
    }
}
export class Node {
    index = 0;
    id = '';
    type = 'p';
    identity;
    outbound = new Map();
    inbound = new Map();
    edges = new Set();
    constructor(id, type) {
        this.id = id;
        this.type = type;
    }
    get out() {
        return this.outbound;
    }
    get in() {
        return this.inbound;
    }
    *getOut(contextIndexes) {
        for (const contextIndex of contextIndexes) {
            const outMap = this.outbound.get(contextIndex);
            if (!outMap)
                continue;
            yield* eachPeerEdge(outMap);
        }
    }
    addOut(contextIndex, subjectIndex, edgeIndex) {
        let outMap = this.outbound.get(contextIndex);
        if (!outMap) {
            outMap = new Map();
            this.outbound.set(contextIndex, outMap);
        }
        pushPeerEdge(outMap, subjectIndex, edgeIndex);
    }
    addIn(contextIndex, subjectIndex, edgeIndex) {
        let inMap = this.inbound.get(contextIndex);
        if (!inMap) {
            inMap = new Map();
            this.inbound.set(contextIndex, inMap);
        }
        pushPeerEdge(inMap, subjectIndex, edgeIndex);
    }
    removeOut(graph, contextIndex, subjectIndex, createdAt, kind) {
        const contextMap = this.outbound.get(contextIndex);
        if (!contextMap)
            return;
        const edges = contextMap.get(subjectIndex);
        if (!edges)
            return;
        const keep = [];
        for (const edgeIndex of edges) {
            const edge = graph.edgesList[edgeIndex];
            if (edge &&
                edge.kind === kind &&
                edge.created_at <= createdAt) {
                continue;
            }
            keep.push(edgeIndex);
        }
        if (keep.length === 0)
            contextMap.delete(subjectIndex);
        else
            contextMap.set(subjectIndex, keep);
        if (contextMap.size === 0)
            this.outbound.delete(contextIndex);
    }
    removeIn(graph, contextIndex, subjectIndex, createdAt, kind) {
        const inMap = this.inbound.get(contextIndex);
        if (!inMap)
            return;
        const edges = inMap.get(subjectIndex);
        if (!edges)
            return;
        const keep = [];
        for (const edgeIndex of edges) {
            const edge = graph.edgesList[edgeIndex];
            if (edge &&
                edge.kind === kind &&
                edge.created_at <= createdAt) {
                continue;
            }
            keep.push(edgeIndex);
        }
        if (keep.length === 0)
            inMap.delete(subjectIndex);
        else
            inMap.set(subjectIndex, keep);
        if (inMap.size === 0)
            this.inbound.delete(contextIndex);
    }
}
