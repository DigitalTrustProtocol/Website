// Ported from AttentionX src/graph/heap-test-harness.ts (imports rewritten for @dtp/* packages).
/**
 * Test-only heap driver. Production uses GraphManager.
 */
import { slotAddressableId } from '@dtp/trust-protocol';
import { TRUST_STATEMENT_KIND } from '@dtp/trust-protocol';
import { RATING_STATEMENT_KIND } from '@dtp/trust-protocol';
import { normalizeResolveBounds } from './bounds';
import { executeTrustQuery } from './query';
import { indexResolver } from '@dtp/trust-graph';
import { artifactRatingResolver } from './ratings/ArtifactRatingResolver';
import { Graph } from '@dtp/trust-graph';
import { WOT_MAX_DEGREE_DEFAULT } from './shared/wot-max-degree';
import { neighborhoodFromHeap } from './graph';
export function trustRecord(eventId, author, subject, value, options = {}) {
    const context = options.context ?? '';
    const pubkey = author.toLowerCase();
    const normalized = {
        type: subject.type,
        value: subject.value.toLowerCase(),
    };
    return {
        id: eventId,
        pubkey,
        created_at: options.createdAt ?? 1,
        kind: TRUST_STATEMENT_KIND,
        tags: [],
        content: options.content ?? '',
        sig: '',
        firstSeenAt: 0,
        addressKey: `${TRUST_STATEMENT_KIND}:${pubkey}:${slotAddressableId(pubkey, normalized, context)}`,
        subject: normalized.value,
        subjectType: subject.type,
        c_tag: context,
        nValue: value,
        addressableId: slotAddressableId(author, subject, context),
        ...(options.activeFrom !== undefined ? { activate: options.activeFrom } : {}),
        ...(options.activeUntil !== undefined ? { expire: options.activeUntil } : {}),
        ...(options.labels !== undefined ? { labels: options.labels } : {}),
        ...(options.labelHints !== undefined ? { labelHints: options.labelHints } : {}),
    };
}
export function ratingRecord(eventId, author, subject, score, options = {}) {
    const context = options.context ?? '';
    const pubkey = author.toLowerCase();
    const normalized = {
        type: subject.type,
        value: subject.value.toLowerCase(),
    };
    return {
        id: eventId,
        pubkey,
        created_at: options.createdAt ?? 1,
        kind: RATING_STATEMENT_KIND,
        tags: [],
        content: options.content ?? '',
        sig: '',
        firstSeenAt: 0,
        addressKey: `${RATING_STATEMENT_KIND}:${pubkey}:${slotAddressableId(pubkey, normalized, context)}`,
        subject: normalized.value,
        subjectType: subject.type,
        c_tag: context,
        nValue: score,
        addressableId: slotAddressableId(author, subject, context),
        ...(options.activeFrom !== undefined ? { activate: options.activeFrom } : {}),
        ...(options.activeUntil !== undefined ? { expire: options.activeUntil } : {}),
        ...(options.labels !== undefined ? { labels: [...options.labels] } : { labels: [] }),
        ...(options.labelHints !== undefined ? { labelHints: options.labelHints } : {}),
    };
}
export class HeapTrustHarness {
    graph = new Graph();
    graphVersion = 0;
    defaultBounds;
    #resolver = indexResolver;
    constructor(statements = [], defaultBounds = {}, resolver = indexResolver) {
        this.defaultBounds = normalizeResolveBounds({
            maxDepth: WOT_MAX_DEGREE_DEFAULT,
            ...defaultBounds,
        });
        this.#resolver = resolver;
        for (const statement of statements) {
            this.graph.applyTrustEvent(statement);
        }
        this.graphVersion += 1;
    }
    upsert(statement) {
        const ok = this.graph.applyTrustEvent(statement);
        if (ok)
            this.graphVersion += 1;
        return ok;
    }
    rebuild(statements) {
        this.graph.clear();
        let accepted = 0;
        for (const statement of statements) {
            if (this.graph.applyTrustEvent(statement))
                accepted += 1;
        }
        this.graphVersion += 1;
        return { accepted, graphVersion: this.graphVersion };
    }
    get trustGraph() {
        return this.graph;
    }
    bindIdentity(iSubject, pubkey) {
        this.graph.bindIdentity(iSubject, pubkey);
    }
    query(query) {
        return executeTrustQuery(this.graph, this.#resolver, {
            ...query,
            bounds: { ...this.defaultBounds, ...query.bounds },
        }, this.graphVersion);
    }
    rebuildClaims(claims) {
        for (const claim of claims) {
            this.graph.applyTrustEvent(claim);
        }
        this.graphVersion += 1;
    }
    queryRating(query) {
        return artifactRatingResolver.resolve(this.graph, this.#resolver, query, this.graphVersion, this.defaultBounds);
    }
    neighborhood(centerId, options = {}) {
        return neighborhoodFromHeap(this.graph, this.graphVersion, centerId, options);
    }
}
