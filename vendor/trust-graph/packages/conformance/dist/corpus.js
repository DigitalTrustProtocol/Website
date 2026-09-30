/**
 * Corpus loading (conformance.md § Corpus layout). `@name` placeholders in
 * any string expand to `sha256(name)` as lowercase hex, so cases stay
 * readable and every runner derives identical ids and pubkeys.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const CORPUS_FORMAT = 'dtp-wot-corpus/1';
export const MODEL_VERSION = 'dtp-wot/1';
/** `TrustGraph/corpus`, resolved from this module (works from src and dist). */
export const corpusDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'corpus');
const PLACEHOLDER = /@([A-Za-z0-9_.-]+)/g;
export function placeholderHex(name) {
    return createHash('sha256').update(name, 'utf8').digest('hex');
}
/** Deep copy with every `@name` inside strings replaced by its hex. */
export function expandPlaceholders(value) {
    if (typeof value === 'string') {
        return value.replace(PLACEHOLDER, (_m, name) => placeholderHex(name));
    }
    if (Array.isArray(value))
        return value.map((item) => expandPlaceholders(item));
    if (value && typeof value === 'object') {
        const out = {};
        for (const [key, item] of Object.entries(value)) {
            out[expandPlaceholders(key)] = expandPlaceholders(item);
        }
        return out;
    }
    return value;
}
export function loadManifest(dir = corpusDir) {
    return JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8'));
}
export function loadCase(file, dir = corpusDir) {
    const raw = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
    return { file, raw, expanded: expandPlaceholders(raw) };
}
