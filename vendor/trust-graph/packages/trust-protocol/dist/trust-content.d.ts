/**
 * Plain-text sanitization for kind 32009 `content` (human trust reasons).
 * Not structured protocol data — strip markup/script vectors before sign/store.
 */
/** Attention compose / publish clamp (stricter than NIP ≤1024). */
export declare const ATTENTIONX_TRUST_CONTENT_UI_LIMIT = 144;
/**
 * Sanitize optional trust-statement content for local publish.
 * Strips controls and common injection shapes; clamps Unicode length.
 * Empty after sanitize is valid (`""`).
 */
export declare function sanitizeTrustContent(input: string, limit?: number): string;
