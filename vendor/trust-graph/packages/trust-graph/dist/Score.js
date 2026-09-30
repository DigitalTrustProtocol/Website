/**
 * Vendored from DigitalTrustProtocol/Trust (src/lib/trust/resolvers/Score.ts).
 */
import { RATING_STATEMENT_KIND } from './constants';
import { trustEdgeValue } from './Edge';
import { TRUST_STATEMENT_KIND } from './constants';
const TRUST_SCORE_SLOT = 1;
const RATING_SCORE_SLOT = 2;
const SCORE_KIND_STRIDE = 10;
export class Score {
    subject;
    subjectIndex;
    count = 0;
    degree = 0;
    connected = false;
    visited = false;
    authorIndex;
    kind;
    context;
    edges;
    constructor(subjectIndex, degree = 0, kind) {
        this.subjectIndex = subjectIndex;
        this.degree = degree;
        this.kind = kind;
    }
    add(edge) {
        if (edge.index === undefined)
            return false; // The edge index is missing, this should never happen
        if (!this.edges)
            this.edges = [];
        this.edges.push(edge.index);
        return true;
    }
    reset() {
        this.edges = undefined;
        this.degree = 0;
        this.count = 0;
    }
}
export function ScoreFactory(subjectIndex, degree, kind = TRUST_STATEMENT_KIND) {
    if (kind === TRUST_STATEMENT_KIND) {
        return new TrustScore(subjectIndex, degree, kind);
    }
    if (kind === RATING_STATEMENT_KIND) {
        return new RatingScore(subjectIndex, degree, kind);
    }
    throw new Error(`Invalid kind: ${kind}`);
}
export class TrustScore extends Score {
    _nDegree = 0;
    _trustValue = 0;
    trust = 0;
    neutral = 0;
    distrust = 0;
    get trustValue() {
        return this._trustValue;
    }
    set trustValue(value) {
        this._trustValue = value;
    }
    add(edge) {
        if (edge.kind !== TRUST_STATEMENT_KIND)
            return false;
        const value = trustEdgeValue(edge);
        if (value === undefined)
            return false; // The edge value is missing, tombstone
        if (!super.add(edge))
            return false;
        if (value === 0) {
            this.neutral += 1;
            return true;
        }
        this.count += 1;
        this.trustValue += value;
        if (value === 1) {
            this.trust += 1;
        }
        else {
            this.distrust += 1;
        }
        return true;
    }
    reset() {
        this.neutral = 0;
        this.distrust = 0;
        this.trust = 0;
        this.trustValue = 0;
        super.reset();
    }
}
export class RatingScore extends Score {
    ratingValue = 0;
    add(edge) {
        if (edge.kind !== RATING_STATEMENT_KIND)
            return false;
        const value = edge.nValue;
        if (value === undefined)
            return false;
        if (!super.add(edge))
            return false;
        this.count += 1;
        this.ratingValue += value;
        return true;
    }
    reset() {
        this.ratingValue = 0;
        super.reset();
    }
}
export class IndexScoreMap extends Map {
    getScoreIndex(subjectIndex, kind) {
        switch (kind) {
            case TRUST_STATEMENT_KIND:
                return subjectIndex * SCORE_KIND_STRIDE + TRUST_SCORE_SLOT;
            case RATING_STATEMENT_KIND:
                return subjectIndex * SCORE_KIND_STRIDE + RATING_SCORE_SLOT;
            default:
                throw new Error(`Invalid kind: ${kind}`);
        }
    }
    peek(nodeIndex, kind = TRUST_STATEMENT_KIND) {
        return super.get(this.getScoreIndex(nodeIndex, kind));
    }
    ensure(nodeIndex, degree, kind = TRUST_STATEMENT_KIND) {
        const index = this.getScoreIndex(nodeIndex, kind);
        let score = super.get(index);
        if (!score) {
            score = ScoreFactory(nodeIndex, degree, kind);
            this.set(index, score);
        }
        return score;
    }
    getTrust(nodeIndex) {
        const score = this.peek(nodeIndex, TRUST_STATEMENT_KIND);
        if (!score || !(score instanceof TrustScore))
            return undefined;
        return score;
    }
}
