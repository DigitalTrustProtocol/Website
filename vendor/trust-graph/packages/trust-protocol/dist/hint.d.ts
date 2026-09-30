/**
 * Identity witness hint (wot-model.md §2.1 `hintPubkey`,
 * identity-binding.md §2): the first bare `npub1…` hint on the primary `i`
 * tag, only for `user:id:<digits>` subjects whose scope set contains `x.com`.
 */
import { type SubjectHint } from './kind-32009';
/** Hex pubkey of a canonical npub, or undefined. */
export declare function npubToHex(npub: string): string | undefined;
/** Hint pubkey from a validated statement's subject, hints, and scopes. */
export declare function hintPubkeyFor(subject: {
    type: string;
    value: string;
}, hints: readonly SubjectHint[], scopes: readonly string[]): string | undefined;
/**
 * Hint pubkey read straight from tags (for rows validated earlier).
 * Malformed hints make the event invalid at validation, so they never get here.
 */
export declare function hintPubkeyFromTags(tags: readonly string[][]): string | undefined;
