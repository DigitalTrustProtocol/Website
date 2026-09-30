/**
 * Vendored from DigitalTrustProtocol/Trust (pathStrategyJson.ts).
 * Attention: walk predecessor via edge.author node index (fixed traverse).
 */
import type { Graph } from './Graph';
import { IndexScoreMap, type Score } from './Score';
declare class PathStrategyJson {
    resolve(authorIndex: number, subjectIndex: number, scores: IndexScoreMap, graph: Graph, scoreKind?: number): Score[];
}
declare const pathStrategyJson: PathStrategyJson;
export default pathStrategyJson;
