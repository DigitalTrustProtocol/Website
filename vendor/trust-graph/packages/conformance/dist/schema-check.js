/**
 * Telemetry contract checks for the session suite (telemetry.md
 * § Conformance): a JSON Schema subset validator for
 * `schemas/telemetry.v1.json`, and a Prometheus exposition check against the
 * shared metric names and labels.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { corpusDir } from './corpus';
export const schemasDir = resolve(corpusDir, '..', 'schemas');
export function loadTelemetrySchema() {
    return JSON.parse(readFileSync(resolve(schemasDir, 'telemetry.v1.json'), 'utf8'));
}
function typeOf(value) {
    if (value === null)
        return 'null';
    if (Array.isArray(value))
        return 'array';
    if (typeof value === 'number')
        return Number.isInteger(value) ? 'integer' : 'number';
    return typeof value;
}
function typeMatches(value, type) {
    const actual = typeOf(value);
    return actual === type || (type === 'number' && actual === 'integer');
}
/** Validate `value` against the supported subset; returns error paths. */
export function validateSchema(value, schema, root = schema, path = '$') {
    if (schema.$ref) {
        const name = schema.$ref.replace('#/$defs/', '');
        const target = root.$defs?.[name];
        if (!target)
            return [`${path}: unknown $ref ${schema.$ref}`];
        return validateSchema(value, target, root, path);
    }
    const errors = [];
    if (schema.const !== undefined && value !== schema.const) {
        errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);
    }
    if (schema.enum && !schema.enum.includes(value))
        errors.push(`${path}: not in enum`);
    if (schema.type) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        if (!types.some((t) => typeMatches(value, t))) {
            return [...errors, `${path}: expected ${types.join('|')}, got ${typeOf(value)}`];
        }
    }
    if (value === null)
        return errors;
    if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path}: below minimum ${schema.minimum}`);
    }
    if (Array.isArray(value) && schema.items) {
        value.forEach((item, i) => errors.push(...validateSchema(item, schema.items, root, `${path}[${i}]`)));
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        const record = value;
        for (const key of schema.required ?? []) {
            if (!(key in record))
                errors.push(`${path}.${key}: missing`);
        }
        for (const [key, item] of Object.entries(record)) {
            const prop = schema.properties?.[key];
            if (prop)
                errors.push(...validateSchema(item, prop, root, `${path}.${key}`));
            else if (schema.additionalProperties === false)
                errors.push(`${path}.${key}: not allowed`);
            else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
                errors.push(...validateSchema(item, schema.additionalProperties, root, `${path}.${key}`));
            }
        }
    }
    return errors;
}
/** Parse Prometheus text exposition (samples only). */
export function parsePrometheus(text) {
    const samples = [];
    for (const line of text.split('\n')) {
        if (line === '' || line.startsWith('#'))
            continue;
        const match = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{([^}]*)\})?\s+(\S+)/.exec(line);
        if (!match)
            continue;
        const labels = {};
        for (const part of (match[3] ?? '').match(/[a-zA-Z_][a-zA-Z0-9_]*="(?:[^"\\]|\\.)*"/g) ?? []) {
            const eq = part.indexOf('=');
            labels[part.slice(0, eq)] = part.slice(eq + 2, -1);
        }
        samples.push({ name: match[1], labels, value: Number(match[4]) });
    }
    return samples;
}
/**
 * Every shared metric must be exposed (a `# TYPE` line), and every sample's
 * label names must equal the shared label list. Histograms may add `le`.
 * Metrics outside the list must use the `dtp_impl_` prefix.
 */
export function checkMetrics(text, shared) {
    const errors = [];
    const declared = new Set(text
        .split('\n')
        .filter((line) => line.startsWith('# TYPE '))
        .map((line) => line.split(' ')[2]));
    for (const name of Object.keys(shared)) {
        if (!declared.has(name))
            errors.push(`missing metric ${name}`);
    }
    for (const sample of parsePrometheus(text)) {
        const base = sample.name.replace(/_(bucket|sum|count)$/, '');
        const labels = shared[sample.name] ?? shared[base];
        if (!labels) {
            if (!sample.name.startsWith('dtp_impl_'))
                errors.push(`unexpected metric ${sample.name}`);
            continue;
        }
        const names = Object.keys(sample.labels).filter((l) => l !== 'le').sort();
        const want = [...labels].sort();
        if (names.join(',') !== want.join(',')) {
            errors.push(`${sample.name}: labels ${names.join(',')} != ${want.join(',')}`);
        }
    }
    return errors;
}
