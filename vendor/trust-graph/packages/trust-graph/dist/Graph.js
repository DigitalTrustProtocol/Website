/**
 * Vendored from DigitalTrustProtocol/Trust (src/lib/trust/graph/Graph.ts).
 * Attention: edges are EventRecord.
 * @dtp/trust-graph (decision D3): X accounts and pubkeys stay separate nodes;
 * own evidence, claims, and witness statements are indexed here and the
 * walk decides binds per root, level, and mode (G8). A Delete unlinks only
 * its own slot (G3). See DIVERGENCE.json.
 */
import { isValidAt, trustEdgeValue } from './Edge';
import { eachPeerEdge, removePeerEdge, Node } from './Node';
import { TRUST_STATEMENT_KIND } from './constants';
import { RATING_STATEMENT_KIND } from './constants';
/** Context bucket keys: kind, then optional `c` segments (`32009:identity`). */
function contextIndexKeys(kind, context) {
    const bucket = String(kind);
    if (context.length === 0)
        return [bucket];
    const keys = [];
    let key = '';
    for (const segment of [bucket, ...context.split(':')]) {
        key = key.length > 0 ? `${key}:${segment}` : segment;
        keys.push(key);
    }
    return keys.reverse();
}
function contextKey(kind, context) {
    return contextIndexKeys(kind, context)[0];
}
const OWN_EVIDENCE_SOURCES = ['bio', 'post'];
function ownEvidenceKey(root, iKey, source) {
    return `${root ?? ''}\n${iKey}\n${source}`;
}
export const USER_ID_PREFIX = 'user:id:';
/** Witness candidate: a `v=1` 32009 about `user:id:X` with an npub hint that is not the author. */
function isWitnessEdge(edge) {
    return (edge.kind === TRUST_STATEMENT_KIND &&
        edge.subjectType === 'i' &&
        edge.subject !== undefined &&
        edge.subject.toLowerCase().startsWith(USER_ID_PREFIX) &&
        edge.hintPubkey !== undefined &&
        edge.hintPubkey.toLowerCase() !== edge.pubkey.toLowerCase() &&
        edge.nValue === 1);
}
function unlinkPeerEdge(adjacency, contextIndex, peerIndex, edgeIndex) {
    const peers = adjacency.get(contextIndex);
    if (!peers)
        return;
    removePeerEdge(peers, peerIndex, edgeIndex);
    if (peers.size === 0)
        adjacency.delete(contextIndex);
}
function shouldReplaceEdge(existing, incoming) {
    if (existing.created_at > incoming.created_at)
        return 'ignore';
    if (existing.created_at < incoming.created_at)
        return 'replace';
    if (incoming.id.localeCompare(existing.id) < 0)
        return 'replace';
    if (incoming.id === existing.id)
        return 'replace';
    return 'ignore';
}
export class Graph {
    nodesIndex = new Map();
    nodesList = [];
    contextIndex = new Map();
    contextList = [];
    edgesIndex = new Map();
    edgesList = [];
    /**
     * Root-less own evidence: canonical i-subject (`user:id:<digits>`) → pubkey.
     * A view of `ownEvidence` for callers outside the walk (sync frontier,
     * neighborhood). The walk decides binds itself (gap G8).
     */
    iToP = new Map();
    /** Pubkey → i-subjects of root-less own evidence. 1 Nostr → N X. */
    pToI = new Map();
    /**
     * The observer's own evidence (Bio / linking post), keyed by
     * `root \n iKey \n source`. Input to `bind(R, X, ℓ)` step 1; never a
     * global bind (identity-binding.md §4).
     */
    ownEvidence = new Map();
    /** Identity claims: pubkey → the X ids its winning kind 10011 names. */
    identityClaims = new Map();
    /** X node index → witness edge indexes (32009, v=1, npub hint, hint ≠ author). */
    witnessIn = new Map();
    /** Hinted pubkey node index → X node index → witness edge count. */
    hintedAs = new Map();
    eventAddedSinceLastSave = 0;
    eventRemovedSinceLastSave = 0;
    clear() {
        this.nodesIndex.clear();
        this.nodesList = [];
        this.contextIndex.clear();
        this.contextList = [];
        this.edgesIndex.clear();
        this.edgesList = [];
        this.iToP.clear();
        this.pToI.clear();
        this.ownEvidence.clear();
        this.identityClaims.clear();
        this.witnessIn.clear();
        this.hintedAs.clear();
        this.eventAddedSinceLastSave = 0;
        this.eventRemovedSinceLastSave = 0;
    }
    /**
     * Records own evidence that `iSubject` is controlled by `pubkey`, for
     * `options.root` only, or for every root when `root` is omitted (the
     * extension's single operator). The walk turns it into a bind per root,
     * level, and binding mode (gap G8); nodes are never merged.
     */
    bindIdentity(iSubject, pubkey, options = {}) {
        const iKey = iSubject.toLowerCase();
        const pKey = pubkey.toLowerCase();
        const root = options.root?.toLowerCase();
        const source = options.source ?? 'bio';
        this.addNode(iKey, 'i');
        this.addNode(pKey, 'p');
        this.ownEvidence.set(ownEvidenceKey(root, iKey, source), {
            iKey,
            pubkey: pKey,
            source,
            ...(root !== undefined ? { root } : {}),
        });
        if (root === undefined)
            this.refreshRootlessBind(iKey);
    }
    /**
     * Removes own evidence for `iSubject` (gap G6): for `options.root` (or the
     * root-less entry when omitted), for one `source` or all of them. Returns
     * whether anything was removed.
     */
    unbindIdentity(iSubject, options = {}) {
        const iKey = iSubject.toLowerCase();
        const root = options.root?.toLowerCase();
        let removed = false;
        for (const source of options.source ? [options.source] : OWN_EVIDENCE_SOURCES) {
            removed = this.ownEvidence.delete(ownEvidenceKey(root, iKey, source)) || removed;
        }
        if (root === undefined)
            this.refreshRootlessBind(iKey);
        return removed;
    }
    /** Own evidence that applies to `root`: its own entries plus root-less ones. */
    ownEvidenceFor(root) {
        const key = root.toLowerCase();
        return [...this.ownEvidence.values()].filter((entry) => entry.root === undefined || entry.root === key);
    }
    /** Replaces the X ids claimed by `pubkey` (its winning kind 10011). */
    setIdentityClaims(pubkey, twitterIds, eventId) {
        this.identityClaims.set(pubkey.toLowerCase(), {
            twitterIds: new Set(twitterIds),
            ...(eventId !== undefined ? { eventId } : {}),
        });
    }
    /** Adds one claimed X id for `pubkey`. */
    addIdentityClaim(pubkey, twitterId, eventId) {
        const key = pubkey.toLowerCase();
        const existing = this.identityClaims.get(key);
        if (existing) {
            existing.twitterIds.add(twitterId);
            if (eventId !== undefined)
                existing.eventId = eventId;
            return;
        }
        this.setIdentityClaims(key, [twitterId], eventId);
    }
    removeIdentityClaims(pubkey) {
        return this.identityClaims.delete(pubkey.toLowerCase());
    }
    /** P's claim of X, or undefined when P's kind 10011 does not name X. */
    identityClaim(pubkey, twitterId) {
        const claim = this.identityClaims.get(pubkey.toLowerCase());
        return claim?.twitterIds.has(twitterId) ? claim : undefined;
    }
    refreshRootlessBind(iKey) {
        const previous = this.iToP.get(iKey);
        const entry = this.ownEvidence.get(ownEvidenceKey(undefined, iKey, 'bio')) ??
            this.ownEvidence.get(ownEvidenceKey(undefined, iKey, 'post'));
        if (previous !== undefined && previous !== entry?.pubkey) {
            const aliases = this.pToI.get(previous);
            aliases?.delete(iKey);
            if (aliases?.size === 0)
                this.pToI.delete(previous);
        }
        if (!entry) {
            this.iToP.delete(iKey);
            return;
        }
        this.iToP.set(iKey, entry.pubkey);
        let aliases = this.pToI.get(entry.pubkey);
        if (!aliases) {
            aliases = new Set();
            this.pToI.set(entry.pubkey, aliases);
        }
        aliases.add(iKey);
    }
    indexWitness(edge, index) {
        if (!isWitnessEdge(edge))
            return;
        const x = this.addNode(edge.subject, 'i').index;
        const p = this.addNode(edge.hintPubkey, 'p').index;
        let edges = this.witnessIn.get(x);
        if (!edges) {
            edges = new Set();
            this.witnessIn.set(x, edges);
        }
        edges.add(index);
        let xs = this.hintedAs.get(p);
        if (!xs) {
            xs = new Map();
            this.hintedAs.set(p, xs);
        }
        xs.set(x, (xs.get(x) ?? 0) + 1);
    }
    unindexWitness(edge, index) {
        if (!isWitnessEdge(edge))
            return;
        const x = this.nodesIndex.get(edge.subject.toLowerCase());
        const p = this.nodesIndex.get(edge.hintPubkey.toLowerCase());
        if (x === undefined || p === undefined)
            return;
        const edges = this.witnessIn.get(x);
        if (edges?.delete(index) && edges.size === 0)
            this.witnessIn.delete(x);
        const xs = this.hintedAs.get(p);
        const count = xs?.get(x);
        if (!xs || count === undefined)
            return;
        if (count > 1)
            xs.set(x, count - 1);
        else {
            xs.delete(x);
            if (xs.size === 0)
                this.hintedAs.delete(p);
        }
    }
    applyTrustEvent(trust) {
        if (trust.kind !== TRUST_STATEMENT_KIND &&
            trust.kind !== RATING_STATEMENT_KIND) {
            return false;
        }
        if (!trust.subject || !trust.subjectType || !trust.addressKey) {
            return false;
        }
        const contextIndex = this.applyContext(trust.c_tag ?? '', trust.kind);
        const authorNode = this.addNode(trust.pubkey, 'p');
        const subjectNode = this.addNode(trust.subject, trust.subjectType);
        const edgeIndex = this.addEdge(trust);
        if (edgeIndex === null)
            return false;
        if (trust.nValue !== undefined) {
            authorNode.addOut(contextIndex, subjectNode.index, edgeIndex);
            subjectNode.addIn(contextIndex, authorNode.index, edgeIndex);
        }
        else {
            // A Delete unlinks only its own slot (gap G3); sibling slots from the
            // same author to the same node keep their edges.
            unlinkPeerEdge(authorNode.outbound, contextIndex, subjectNode.index, edgeIndex);
            unlinkPeerEdge(subjectNode.inbound, contextIndex, authorNode.index, edgeIndex);
        }
        this.eventAddedSinceLastSave++;
        return true;
    }
    removeTrustEvent(trust) {
        if (!trust.addressKey)
            return false;
        const key = trust.addressKey;
        const edgeIndex = this.edgesIndex.get(key);
        if (edgeIndex === undefined)
            return false;
        const edge = this.edgesList[edgeIndex];
        if (edge)
            this.unindexWitness(edge, edgeIndex);
        this.unlinkEdge(edgeIndex);
        this.edgesList[edgeIndex] = null;
        this.edgesIndex.delete(key);
        this.eventRemovedSinceLastSave++;
        return true;
    }
    getAllContextIndexes(context, kinds) {
        const result = [];
        for (const kind of kinds) {
            result.push(...this.getContextIndexes(context, kind));
        }
        return result;
    }
    getContextIndexes(context, kind) {
        const result = [];
        for (const key of contextIndexKeys(kind, context)) {
            const index = this.contextIndex.get(key);
            if (index !== undefined)
                result.push(index);
        }
        return result;
    }
    edgePayload(edge) {
        const trustValue = trustEdgeValue(edge);
        return {
            addressKey: edge.addressKey,
            dTag: edge.addressableId ?? '',
            author: edge.pubkey,
            kind: edge.kind,
            value: trustValue ?? 0,
            ...(edge.kind === RATING_STATEMENT_KIND && edge.nValue !== undefined
                ? { nValue: edge.nValue }
                : {}),
            context: edge.c_tag ?? '',
            createdAt: edge.created_at,
            eventId: edge.id,
            ...(edge.activate !== undefined ? { activate: edge.activate } : {}),
            ...(edge.expire !== undefined ? { expire: edge.expire } : {}),
            ...(edge.content !== undefined ? { content: edge.content } : {}),
        };
    }
    connections(nodeId, direction, options = {}) {
        const node = this.getNode(nodeId.toLowerCase());
        if (!node)
            return [];
        const now = options.now ?? Math.floor(Date.now() / 1000);
        const kind = options.kind ?? TRUST_STATEMENT_KIND;
        const seen = new Set();
        const result = [];
        const contextIndexes = this.getContextIndexes(options.context ?? '', kind);
        for (const contextIndex of contextIndexes) {
            const peerMap = node[direction === 'out' ? 'outbound' : 'inbound'].get(contextIndex);
            if (!peerMap)
                continue;
            for (const [peerIndex, edgeIndex] of eachPeerEdge(peerMap)) {
                const edge = this.edgesList[edgeIndex];
                if (!edge || edge.kind !== kind)
                    continue;
                if (!options.includeInactive && !isValidAt(edge, now))
                    continue;
                if (kind === TRUST_STATEMENT_KIND) {
                    const value = trustEdgeValue(edge);
                    if (value === undefined)
                        continue;
                    if (options.value !== undefined && value !== options.value) {
                        continue;
                    }
                }
                else if (edge.nValue === undefined) {
                    continue;
                }
                const peerNode = this.nodesList[peerIndex];
                if (!peerNode)
                    continue;
                const authorNode = direction === 'out' ? node : peerNode;
                const subjectNode = direction === 'out' ? peerNode : node;
                if (options.subjectType && subjectNode.type !== options.subjectType) {
                    continue;
                }
                const key = `${authorNode.index}:${subjectNode.index}:${edgeIndex}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                result.push({
                    author: authorNode.id,
                    subject: subjectNode.id,
                    subjectType: subjectNode.type,
                    edge: this.edgePayload(edge),
                });
            }
        }
        return result;
    }
    out(authorId, options = {}) {
        return this.connections(authorId, 'out', options);
    }
    in(subjectId, options = {}) {
        return this.connections(subjectId, 'in', options);
    }
    /** Nodes are never merged: an X account and a pubkey stay two nodes; the walk binds them (gap G8). */
    addNode(id, type) {
        const normalized = id.toLowerCase();
        const index = this.nodesIndex.get(normalized);
        if (index !== undefined) {
            const node = this.nodesList[index];
            if (node)
                return node;
        }
        return this.createNode(normalized, type);
    }
    getNode(id) {
        const index = this.nodesIndex.get(id.toLowerCase());
        if (index === undefined)
            return null;
        return this.nodesList[index] ?? null;
    }
    createNode(id, type) {
        const node = new Node(id.toLowerCase(), type);
        node.index = this.nodesList.push(node) - 1;
        this.nodesIndex.set(node.id, node.index);
        this.eventAddedSinceLastSave++;
        return node;
    }
    addEdge(trust) {
        if (!trust.addressKey)
            return null;
        const key = trust.addressKey;
        let index = this.edgesIndex.get(key);
        if (index !== undefined) {
            const existing = this.edgesList[index];
            if (!existing)
                return null; // Return should never happen
            if (shouldReplaceEdge(existing, trust) === 'ignore')
                return null;
            this.unindexWitness(existing, index);
            this.edgesList[index] = trust; // Overwrite the existing edge with the new one
        }
        else {
            index = this.edgesList.push(trust) - 1;
            this.edgesIndex.set(key, index);
        }
        trust.index = index;
        this.addNode(trust.pubkey, 'p').edges.add(index);
        this.indexWitness(trust, index);
        return index;
    }
    removeEdge(addressKey) {
        const index = this.edgesIndex.get(addressKey);
        if (index === undefined)
            return null;
        const edge = this.edgesList[index];
        if (!edge)
            return null;
        this.unindexWitness(edge, index);
        this.unlinkEdge(index);
        this.edgesList[index] = null;
        this.edgesIndex.delete(addressKey);
        return edge;
    }
    applyContext(context, kind) {
        return this.addContext(contextKey(kind, context));
    }
    getContextIndex(context, kind) {
        return this.contextIndex.get(contextKey(kind, context));
    }
    addContext(context) {
        const existing = this.contextIndex.get(context);
        if (existing !== undefined)
            return existing;
        const index = this.contextList.push(context) - 1;
        this.contextIndex.set(context, index);
        return index;
    }
    unlinkEdge(index) {
        const edge = this.edgesList[index];
        if (!edge)
            return;
        const authorNode = this.getNode(edge.pubkey);
        const subjectNode = edge.subject ? this.getNode(edge.subject) : null;
        const contextIndex = this.getContextIndex(edge.c_tag ?? '', edge.kind);
        if (authorNode && index !== undefined)
            authorNode.edges.delete(index);
        if (!authorNode || !subjectNode || contextIndex === undefined)
            return;
        unlinkPeerEdge(authorNode.outbound, contextIndex, subjectNode.index, index);
        unlinkPeerEdge(subjectNode.inbound, contextIndex, authorNode.index, index);
    }
}
