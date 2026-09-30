/**
 * Telemetry contract checks for the session suite (telemetry.md
 * § Conformance): a JSON Schema subset validator for
 * `schemas/telemetry.v1.json`, and a Prometheus exposition check against the
 * shared metric names and labels.
 */
type Schema = {
    $ref?: string;
    type?: string | string[];
    required?: string[];
    properties?: Record<string, Schema>;
    additionalProperties?: Schema | boolean;
    items?: Schema;
    enum?: unknown[];
    const?: unknown;
    minimum?: number;
    $defs?: Record<string, Schema>;
};
export declare const schemasDir: string;
export declare function loadTelemetrySchema(): Schema;
/** Validate `value` against the supported subset; returns error paths. */
export declare function validateSchema(value: unknown, schema: Schema, root?: Schema, path?: string): string[];
export interface MetricSample {
    name: string;
    labels: Record<string, string>;
    value: number;
}
/** Parse Prometheus text exposition (samples only). */
export declare function parsePrometheus(text: string): MetricSample[];
/**
 * Every shared metric must be exposed (a `# TYPE` line), and every sample's
 * label names must equal the shared label list. Histograms may add `le`.
 * Metrics outside the list must use the `dtp_impl_` prefix.
 */
export declare function checkMetrics(text: string, shared: Readonly<Record<string, readonly string[]>>): string[];
export {};
