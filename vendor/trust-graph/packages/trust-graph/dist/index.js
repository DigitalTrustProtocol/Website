/**
 * Vendored Trust heap graph + resolvers (DigitalTrustProtocol/Trust).
 *
 * Do not modify this package without explicit permission. It is fragile
 * under AI interference. Change Attention wrappers in `src/graph`
 * (`graph.ts`, `adapter.ts`, `query.ts`, `ratings/`) instead.
 */
export { isValidAt, trustEdgeValue } from './Edge';
export { Graph, } from './Graph';
export { IndexResolver } from './IndexResolver';
export { default as indexResolver } from './IndexResolver';
export { Node } from './Node';
export { default as pathStrategyJson } from './pathStrategyJson';
export { IndexScoreMap, RatingScore, Score, TrustScore } from './Score';
