/**
 * Vendored from DigitalTrustProtocol/Trust (IndexResolver.ts).
 * Attention: returns Score[] (no ApiEnvelope); default followTrustThreshold = 75.
 *
 * @dtp/trust-graph (decision D3): the walk follows wot-model.md §6 exactly.
 * One selected statement per author and node, first bucket of the chain,
 * then P2 inside the bucket (G2); ratings read their exact context only
 * (G1); disconnected results carry no evidence (G4, D4 option A); the
 * subject's hit counters are separate from its peer counters (G7); binds
 * are decided per root, level, and mode inside the walk (G8,
 * identity-binding.md §4); node / record / time budgets stop the walk at a
 * level boundary (G10, §6.2); `walk()` and `field()` expose the level
 * structure and the binds (G12). See DIVERGENCE.json.
 */
import { isValidAt, trustEdgeValue } from './Edge';
import { USER_ID_PREFIX } from './Graph';
import { ScoreFactory, TrustScore } from './Score';
import { TRUST_STATEMENT_KIND } from './constants';
import { RATING_STATEMENT_KIND } from './constants';
import { meetsFollowTrustGreen } from './threshold';
import { FOLLOW_TRUST_GREEN_DEFAULT } from './constants';
import { WOT_MAX_DEGREE_HARD_CAP } from './constants';
const MAX_DEPTH = WOT_MAX_DEGREE_HARD_CAP;
/** Walk budget defaults (resolver-api.md § Guardrails). */
export const DEFAULT_MAX_REACHED_NODES = 5_000_000;
export const DEFAULT_MAX_WALK_RECORDS = 50_000_000;
/** The deadline is also checked every this many scanned records inside a level. */
const DEADLINE_CHECK_EVERY = 4096;
/** P2 inside one bucket: higher scopeRank, then newer created_at, then lower id. */
function tieBreakLess(a, b) {
    const rankA = a.scopeRank ?? 0;
    const rankB = b.scopeRank ?? 0;
    if (rankA !== rankB)
        return rankA > rankB;
    if (a.created_at !== b.created_at)
        return a.created_at > b.created_at;
    return a.id < b.id;
}
/** A walk in progress; also builds the root field (no subject). */
class Walk {
    graph;
    p;
    states = new Map();
    /** `levels[ℓ]` = nodes that joined the frontier at level ℓ. */
    levels;
    contrib = new Map();
    bound = new Map();
    scanned = 0;
    records = 0;
    constructor(graph, p) {
        this.graph = graph;
        this.p = p;
        this.states.set(p.root, { level: 0, trust: 0, distrust: 0, neutral: 0, frontier: 0 });
        this.levels = [[p.root]];
    }
    node(index) {
        return this.graph.nodesList[index];
    }
    edge(index) {
        return this.graph.edgesList[index];
    }
    qualifies(a) {
        if (a === this.p.root)
            return true;
        const state = this.states.get(a);
        if (!state)
            return false;
        return meetsFollowTrustGreen(state.trust, state.distrust, this.p.threshold);
    }
    frontierAtMost(a, level) {
        const frontier = this.states.get(a)?.frontier;
        return frontier !== undefined && frontier <= level ? frontier : undefined;
    }
    active(edge) {
        return !!edge && edge.nValue !== undefined && isValidAt(edge, this.p.now);
    }
    bindable(index) {
        const node = this.node(index);
        return node.type === 'i' && node.id.startsWith(USER_ID_PREFIX);
    }
    deadlinePassed() {
        return this.p.deadline !== undefined && Date.now() >= this.p.deadline;
    }
    // ---------------------------------------------------------------- binds
    claimOf(pubkey, twitterId) {
        return this.graph.identityClaim(this.node(pubkey).id, twitterId);
    }
    cutReason(pubkey) {
        const claim = this.graph.identityClaims.get(this.node(pubkey).id);
        return claim && claim.twitterIds.size > 0 ? 'false-hint' : 'no-claim';
    }
    hintNode(edge) {
        return this.graph.nodesIndex.get(edge.hintPubkey.toLowerCase());
    }
    /** Each author's newest active witness statement about X. */
    witnessesByAuthor(x) {
        const best = new Map();
        for (const index of this.graph.witnessIn.get(x) ?? []) {
            const edge = this.graph.edgesList[index];
            if (!edge || !isValidAt(edge, this.p.now))
                continue;
            const author = this.graph.nodesIndex.get(edge.pubkey.toLowerCase());
            if (author === undefined)
                continue;
            const current = best.get(author);
            if (current === undefined) {
                best.set(author, index);
                continue;
            }
            const other = this.edge(current);
            if (edge.created_at > other.created_at || (edge.created_at === other.created_at && edge.id < other.id)) {
                best.set(author, index);
            }
        }
        return best;
    }
    ownWitness(x) {
        return this.witnessesByAuthor(x).get(this.p.root);
    }
    /** `bind(R, X, ℓ)`. */
    bind(x, level) {
        const done = this.bound.get(x);
        if (done) {
            // A bind is stable from its witness's level on; shallower levels
            // (root-field hit tests) are decided afresh.
            if (level >= (done.bind?.witnessLevel ?? 0))
                return done;
            return this.computeBind(x, level);
        }
        const outcome = this.computeBind(x, level);
        const stable = outcome.bind !== undefined ||
            this.p.own.some((own) => own.x === x) ||
            (outcome.cut !== undefined && this.ownWitness(x) !== undefined);
        if (stable)
            this.bound.set(x, outcome);
        return outcome;
    }
    decideSingle(twitterId, pubkey, source, witness, witnessLevel) {
        const claim = this.claimOf(pubkey, twitterId);
        if (this.p.mode === 'strict' && !claim) {
            return { cut: { pubkey, reason: this.cutReason(pubkey) } };
        }
        return {
            bind: {
                pubkey,
                source,
                ...(witness !== undefined ? { witness } : {}),
                ...(witnessLevel !== undefined ? { witnessLevel } : {}),
                ...(claim ? { claim } : {}),
            },
        };
    }
    computeBind(x, level) {
        if (!this.bindable(x))
            return {};
        const twitterId = this.node(x).id.slice(USER_ID_PREFIX.length);
        // Step 1: own evidence (Bio beats linking post).
        const own = this.p.own
            .filter((entry) => entry.x === x)
            .sort((a, b) => (a.source === b.source ? 0 : a.source === 'bio' ? -1 : 1))[0];
        if (own) {
            return this.decideSingle(twitterId, own.pubkey, own.source === 'bio' ? 'own-bio' : 'own-post');
        }
        const witnesses = this.witnessesByAuthor(x);
        // Step 2: own witness.
        const rootWitness = witnesses.get(this.p.root);
        if (rootWitness !== undefined) {
            return this.decideSingle(twitterId, this.hintNode(this.edge(rootWitness)), 'own-statement', rootWitness, 0);
        }
        // Steps 3–5: WoT witnesses by qualifying frontier authors at ≤ level.
        const candidates = [];
        for (const [author, index] of witnesses) {
            const authorLevel = this.frontierAtMost(author, level);
            if (authorLevel === undefined || !this.qualifies(author))
                continue;
            const edge = this.edge(index);
            candidates.push({
                level: authorLevel,
                trust: this.states.get(author)?.trust ?? 0,
                createdAt: edge.created_at,
                authorKey: this.node(author).id,
                edge: index,
                pubkey: this.hintNode(edge),
            });
        }
        candidates.sort((a, b) => a.level - b.level ||
            b.trust - a.trust ||
            b.createdAt - a.createdAt ||
            (a.authorKey < b.authorKey ? -1 : a.authorKey > b.authorKey ? 1 : 0));
        for (const candidate of candidates) {
            const claim = this.claimOf(candidate.pubkey, twitterId);
            if (this.p.mode === 'strict' && !claim)
                continue;
            return {
                bind: {
                    pubkey: candidate.pubkey,
                    source: 'witness',
                    witness: candidate.edge,
                    witnessLevel: candidate.level,
                    ...(claim ? { claim } : {}),
                },
            };
        }
        const top = candidates[0];
        return top ? { cut: { pubkey: top.pubkey, reason: this.cutReason(top.pubkey) } } : {};
    }
    /** Binds decided so far, sorted by X key. */
    boundList() {
        const out = [];
        for (const [x, outcome] of this.bound)
            if (outcome.bind)
                out.push([x, outcome.bind]);
        return out.sort(([a], [b]) => (this.node(a).id < this.node(b).id ? -1 : 1));
    }
    /** `resolve(node, ℓ)`: the bound pubkey of a bindable X, else the node; undefined for an unbound X. */
    resolveNode(index, level) {
        if (!this.bindable(index))
            return index;
        return this.bind(index, level).bind?.pubkey;
    }
    /** `node(resolve(S, ℓ))`. */
    subjectNodeAt(subject, level) {
        if (subject === undefined)
            return undefined;
        if (!this.bindable(subject))
            return subject;
        return this.bind(subject, level).bind?.pubkey ?? subject;
    }
    // ------------------------------------------------------------ selection
    /** One statement per kept author over `buckets` (chain order) from the in-runs of `sources`. */
    selectIn(sources, buckets, keep) {
        const best = new Map();
        const consider = (author, edges, pos) => {
            for (const index of edges) {
                const edge = this.graph.edgesList[index];
                if (!this.active(edge))
                    continue;
                const current = best.get(author);
                if (!current)
                    best.set(author, { pos, edge: index });
                else if (current.pos === pos && tieBreakLess(edge, this.edge(current.edge))) {
                    best.set(author, { pos, edge: index });
                }
            }
        };
        for (const [pos, bucket] of buckets.entries()) {
            for (const source of sources) {
                const inMap = this.node(source).inbound.get(bucket);
                if (!inMap)
                    continue;
                if (keep.size < inMap.size) {
                    for (const author of keep) {
                        const edges = inMap.get(author);
                        if (edges)
                            consider(author, edges, pos);
                    }
                }
                else {
                    for (const [author, edges] of inMap)
                        if (keep.has(author))
                            consider(author, edges, pos);
                }
            }
        }
        return best;
    }
    /** In-edge sources of subject node `ns` at level ℓ: the node plus every X bound to it at ℓ. */
    sourcesFor(ns, level) {
        const sources = [ns];
        if (this.node(ns).type !== 'p')
            return sources;
        for (const x of this.graph.hintedAs.get(ns)?.keys() ?? []) {
            if (this.bind(x, level).bind?.pubkey === ns)
                sources.push(x);
        }
        for (const own of this.p.own) {
            if (own.pubkey === ns && !sources.includes(own.x) && this.bind(own.x, level).bind?.pubkey === ns) {
                sources.push(own.x);
            }
        }
        return sources;
    }
    /** Evidence about `subject` at degree `level + 1`, from the levels built so far. */
    hitsFor(subject, buckets, level) {
        const ns = this.subjectNodeAt(subject, level);
        if (ns === undefined)
            return { hits: [] };
        const frontier = this.levels[level];
        if (!frontier)
            return { ns, hits: [] };
        const keep = new Set(frontier.filter((a) => a !== ns && this.qualifies(a)));
        if (keep.size === 0)
            return { ns, hits: [] };
        const best = this.selectIn(this.sourcesFor(ns, level), buckets, keep);
        const hits = [...best].map(([author, { edge }]) => ({ author, edge }));
        hits.sort((a, b) => a.edge - b.edge);
        return { ns, hits };
    }
    /** `counted(hits)`: ±1 hits for 32009, every hit for 32014. */
    counted(hits) {
        if (this.p.kind !== TRUST_STATEMENT_KIND)
            return hits.length;
        let count = 0;
        for (const hit of hits) {
            const value = trustEdgeValue(this.edge(hit.edge));
            if (value === 1 || value === -1)
                count += 1;
        }
        return count;
    }
    /** Author `a`'s hop statements at level ℓ: one per resolved `p` peer. */
    selectOut(a, level) {
        const best = new Map();
        for (const [pos, bucket] of this.p.hopBuckets.entries()) {
            const outMap = this.node(a).outbound.get(bucket);
            if (!outMap)
                continue;
            for (const [peerIndex, edges] of outMap) {
                for (const index of edges) {
                    this.scanned += 1;
                    if (this.scanned % DEADLINE_CHECK_EVERY === 0 && this.deadlinePassed())
                        return 'timeBudget';
                    const edge = this.graph.edgesList[index];
                    if (!this.active(edge))
                        continue;
                    const peer = this.resolveNode(peerIndex, level);
                    if (peer === undefined || this.node(peer).type !== 'p')
                        continue;
                    const value = trustEdgeValue(edge);
                    if (value === undefined)
                        continue;
                    const current = best.get(peer);
                    if (!current)
                        best.set(peer, { pos, edge: index, value });
                    else if (current.pos === pos && tieBreakLess(edge, this.edge(current.edge))) {
                        best.set(peer, { pos, edge: index, value });
                    }
                }
            }
        }
        const out = [...best].map(([peer, { edge, value }]) => [peer, edge, value]);
        return out.sort((x, y) => x[1] - y[1]);
    }
    /** Scanned records (§6.2): one per (author, subject) in the hop buckets. */
    exactCost(authors) {
        let total = 0;
        const subjects = new Set();
        for (const a of authors) {
            subjects.clear();
            for (const bucket of this.p.hopBuckets) {
                for (const peer of this.node(a).outbound.get(bucket)?.keys() ?? [])
                    subjects.add(peer);
            }
            total += subjects.size;
        }
        return total;
    }
    expandingAuthors(level, skip) {
        return this.levels[level].filter((a) => this.qualifies(a) && (a !== skip || a === this.p.root));
    }
    /**
     * Builds level `level + 1` from the frontier at `level`, skipping `skip`
     * (the subject for 32009). False when the new frontier is empty; a
     * truncation reason when a budget stops it (the level is not applied).
     */
    expand(level, skip) {
        if (this.deadlinePassed())
            return 'timeBudget';
        const d = level + 1;
        const authors = this.expandingAuthors(level, skip);
        const cost = this.exactCost(authors);
        if (this.records + cost > this.p.maxRecords)
            return 'edgeBudget';
        const picks = [];
        for (const a of authors) {
            const selected = this.selectOut(a, level);
            if (typeof selected === 'string')
                return selected;
            picks.push(...selected);
        }
        const newNodes = new Set();
        for (const [peer] of picks)
            if (!this.states.has(peer))
                newNodes.add(peer);
        if (this.states.size + newNodes.size > this.p.maxNodes)
            return 'nodeBudget';
        this.records += cost;
        const next = [];
        for (const [peer, edge, value] of picks) {
            let state = this.states.get(peer);
            if (!state) {
                state = { level: d, trust: 0, distrust: 0, neutral: 0 };
                this.states.set(peer, state);
            }
            if (state.level < d)
                continue;
            if (value === 1)
                state.trust += 1;
            else if (value === -1)
                state.distrust += 1;
            else
                state.neutral += 1;
            if (value === 1 && state.frontier === undefined) {
                state.frontier = d;
                next.push(peer);
            }
            if (this.p.trackContrib) {
                const list = this.contrib.get(peer);
                if (list)
                    list.push(edge);
                else
                    this.contrib.set(peer, [edge]);
            }
        }
        next.sort((x, y) => x - y);
        this.levels.push(next);
        return next.length > 0;
    }
    /** Whether any record in `buckets` can address `subject` or an X account that could bind to it. */
    hasEvidenceSources(subject, buckets) {
        if (subject === undefined)
            return false;
        const hasIn = (n) => buckets.some((b) => (this.node(n).inbound.get(b)?.size ?? 0) > 0);
        if (hasIn(subject))
            return true;
        if (this.bindable(subject)) {
            if (this.p.own.some((own) => own.x === subject && hasIn(own.pubkey)))
                return true;
            for (const index of this.graph.witnessIn.get(subject) ?? []) {
                const edge = this.graph.edgesList[index];
                if (edge && hasIn(this.hintNode(edge)))
                    return true;
            }
            return false;
        }
        if (this.node(subject).type === 'p') {
            for (const x of this.graph.hintedAs.get(subject)?.keys() ?? [])
                if (hasIn(x))
                    return true;
            return this.p.own.some((own) => own.pubkey === subject && hasIn(own.x));
        }
        return false;
    }
    /** The full walk for the subject (wot-model.md §6). */
    run() {
        const { subject, maxDepth, kind, scoreBuckets } = this.p;
        if (!this.hasEvidenceSources(subject, scoreBuckets)) {
            return { degree: 0, hits: [], lastLevel: 0, ...(subject !== undefined ? { subjectNode: subject } : {}), completeDepth: 0 };
        }
        let lastNode = subject;
        for (let d = 1; d <= maxDepth; d += 1) {
            const level = d - 1;
            const { ns, hits } = this.hitsFor(subject, scoreBuckets, level);
            lastNode = ns;
            const found = { lastLevel: level, ...(ns !== undefined ? { subjectNode: ns } : {}) };
            if (this.counted(hits) > 0)
                return { degree: d, hits, ...found, completeDepth: level };
            if (d === maxDepth)
                break;
            const expanded = this.expand(level, kind === TRUST_STATEMENT_KIND ? ns : undefined);
            if (expanded === false)
                return { degree: 0, hits: [], ...found, completeDepth: d };
            if (typeof expanded === 'string') {
                return { degree: 0, hits: [], ...found, truncated: expanded, completeDepth: level };
            }
        }
        const last = maxDepth - 1;
        return { degree: 0, hits: [], lastLevel: last, ...(lastNode !== undefined ? { subjectNode: lastNode } : {}), completeDepth: last };
    }
    toBindOutcome(outcome) {
        const out = {};
        if (outcome.bind) {
            const { pubkey, source, witness, witnessLevel, claim } = outcome.bind;
            out.bind = {
                pubkey: this.node(pubkey).id,
                source,
                ...(witness !== undefined ? { witnessEventId: this.edge(witness).id } : {}),
                ...(witnessLevel !== undefined ? { witnessLevel } : {}),
                ...(claim?.eventId !== undefined ? { claimEventId: claim.eventId } : {}),
                confirmed: claim !== undefined,
            };
        }
        if (outcome.cut)
            out.cut = { pubkey: this.node(outcome.cut.pubkey).id, reason: outcome.cut.reason };
        return out;
    }
    isBindable(index) {
        return this.bindable(index);
    }
}
function emptyWalk(mode) {
    return {
        scores: [],
        connected: false,
        degree: 0,
        lastLevel: 0,
        completeDepth: 0,
        mode,
        scannedRecords: 0,
        reachedNodes: 0,
    };
}
export class IndexResolver {
    name = 'graph';
    resolve(observerId, subjectId, options = {}) {
        return this.walk(observerId, subjectId, options).scores;
    }
    walk(observerId, subjectId, options = {}) {
        const mode = options.bindingMode ?? 'lenient';
        const graph = options.graph;
        if (!graph)
            return emptyWalk(mode); // If the graph is not found, return an empty result, should never happen
        observerId = observerId.toLowerCase().trim();
        subjectId = subjectId.toLowerCase().trim();
        const observerNode = graph.getNode(observerId);
        const subjectNode = graph.getNode(subjectId);
        if (!observerNode || !subjectNode)
            return emptyWalk(mode);
        const kind = options.kind ?? TRUST_STATEMENT_KIND;
        const walker = this.walker(graph, observerNode.index, subjectNode.index, kind, options, mode);
        const outcome = walker.run();
        const connected = outcome.degree > 0;
        const hitScore = ScoreFactory(outcome.subjectNode ?? subjectNode.index, outcome.degree, kind);
        hitScore.subject = subjectId;
        for (const hit of outcome.hits)
            hitScore.add(graph.edgesList[hit.edge]);
        hitScore.connected = connected;
        hitScore.degree = outcome.degree;
        const scores = [hitScore];
        if (connected && options.format === 'path')
            scores.push(...this.pathScores(graph, walker, outcome.hits));
        return {
            scores,
            connected,
            degree: outcome.degree,
            lastLevel: outcome.lastLevel,
            completeDepth: outcome.completeDepth,
            ...(outcome.truncated !== undefined ? { truncated: outcome.truncated } : {}),
            mode,
            ...(walker.isBindable(subjectNode.index)
                ? { subjectBind: walker.toBindOutcome(walker.bind(subjectNode.index, outcome.lastLevel)) }
                : {}),
            scannedRecords: walker.records,
            reachedNodes: walker.states.size,
        };
    }
    /**
     * The walk's level structure from the root with no subject (gap G12):
     * levels `0 ..= D − 1`, qualifying nodes only, and the binds decided
     * while building them.
     */
    field(observerId, options = {}) {
        const mode = options.bindingMode ?? 'lenient';
        const maxDepth = clampDepth(options.maxDepth);
        const root = observerId.toLowerCase().trim();
        const graph = options.graph;
        const observerNode = graph?.getNode(root);
        if (!graph || !observerNode)
            return { completeDepth: maxDepth - 1, levels: [[root]], binds: [] };
        const walker = this.walker(graph, observerNode.index, undefined, TRUST_STATEMENT_KIND, options, mode);
        let completeDepth = 0;
        let truncated;
        for (let level = 0; level < maxDepth - 1; level += 1) {
            const expanded = walker.expand(level, undefined);
            if (typeof expanded === 'string') {
                truncated = expanded;
                break;
            }
            completeDepth = level + 1;
            if (!expanded) {
                completeDepth = maxDepth - 1;
                break;
            }
        }
        const levels = walker.levels
            .slice(0, maxDepth)
            .map((level) => level.filter((n) => walker.qualifies(n)).map((n) => graph.nodesList[n].id).sort());
        const binds = walker.boundList().map(([x, bind]) => ({
            subject: `i:${graph.nodesList[x].id}`,
            pubkey: graph.nodesList[bind.pubkey].id,
            source: bind.source,
            ...(bind.witnessLevel !== undefined ? { level: bind.witnessLevel } : {}),
            ...(bind.witness !== undefined ? { witnessEventId: graph.edgesList[bind.witness].id } : {}),
        }));
        return { completeDepth, levels, binds, ...(truncated !== undefined ? { truncated } : {}) };
    }
    walker(graph, root, subject, kind, options, mode) {
        const scoreContext = options.scoreContext ?? '';
        const exactRating = graph.getContextIndex(scoreContext, RATING_STATEMENT_KIND);
        const own = [];
        for (const entry of graph.ownEvidenceFor(graph.nodesList[root].id)) {
            const x = graph.nodesIndex.get(entry.iKey);
            const pubkey = graph.nodesIndex.get(entry.pubkey);
            if (x !== undefined && pubkey !== undefined)
                own.push({ x, pubkey, source: entry.source });
        }
        return new Walk(graph, {
            root,
            ...(subject !== undefined ? { subject } : {}),
            kind,
            hopBuckets: graph.getContextIndexes(options.trustContext ?? '', TRUST_STATEMENT_KIND),
            scoreBuckets: kind === RATING_STATEMENT_KIND
                ? exactRating !== undefined
                    ? [exactRating]
                    : []
                : graph.getContextIndexes(scoreContext, kind),
            threshold: options.followTrustThreshold ?? FOLLOW_TRUST_GREEN_DEFAULT,
            maxDepth: clampDepth(options.maxDepth),
            now: options.now ?? Math.floor(Date.now() / 1000),
            mode,
            own,
            maxNodes: options.budgets?.maxReachedNodes ?? DEFAULT_MAX_REACHED_NODES,
            maxRecords: options.budgets?.maxWalkRecords ?? DEFAULT_MAX_WALK_RECORDS,
            ...(options.budgets?.deadline !== undefined ? { deadline: options.budgets.deadline } : {}),
            trackContrib: options.format === 'path',
        });
    }
    /** Path format (wot-model.md §7.2): backward union of the statements that reached each evidence author. */
    pathScores(graph, walker, hits) {
        const out = [];
        const visited = new Set();
        const queue = hits.map((hit) => hit.author);
        while (queue.length > 0) {
            const author = queue.shift();
            if (visited.has(author))
                continue;
            visited.add(author);
            const score = new TrustScore(author, walker.states.get(author)?.level ?? 0, TRUST_STATEMENT_KIND);
            out.push(score);
            if (author === walker.p.root)
                continue;
            for (const index of walker.contrib.get(author) ?? []) {
                const edge = graph.edgesList[index];
                score.add(edge);
                const from = graph.nodesIndex.get(edge.pubkey.toLowerCase());
                if (from !== undefined)
                    queue.push(from);
            }
            score.connected = score.count > 0;
        }
        return out;
    }
}
function clampDepth(maxDepth) {
    return Math.max(1, Math.min(maxDepth ?? MAX_DEPTH, MAX_DEPTH));
}
const indexResolver = new IndexResolver();
export default indexResolver;
