/**
 * One entry point for servers: validate an incoming event fully, apply the
 * scope profile, and produce the normalized record (wot-model.md §2.1–2.3,
 * resolver-api.md § Ingest). Rejections carry the NIP-01 `OK` prefix.
 */
import { validateEvent } from 'nostr-tools';
import { identityClaimFromEvent } from './claims';
import { hintPubkeyFor } from './hint';
import { NIP39_IDENTITY_KIND, validateSignedKind10011Event, } from './kind-10011';
import { DELETION_KIND, validateDeletionEvent } from './kind-5';
import { TRUST_STATEMENT_KIND, validateKind32009Event } from './kind-32009';
import { RATING_STATEMENT_KIND, validateKind32014Event } from './kind-32014';
import { fillEventRecordColumns } from './nip32009';
import { scopeVerdict } from './scope-profile';
/** `kind:pubkey:d` slot key; kind 10011 uses an empty `d`. */
export function eventAddressKey(kind, pubkey, d) {
    return `${kind}:${pubkey.toLowerCase()}:${d}`;
}
function signedFields(event) {
    return {
        id: event.id,
        pubkey: event.pubkey,
        created_at: event.created_at,
        kind: event.kind,
        tags: event.tags.map((tag) => [...tag]),
        content: event.content,
        sig: event.sig,
    };
}
function reject(prefix, message) {
    return { type: 'rejected', prefix, message };
}
export async function classifyEvent(input, options = {}) {
    if (typeof input !== 'object' ||
        input === null ||
        !('id' in input) ||
        !('sig' in input) ||
        !validateEvent(input)) {
        return reject('invalid', 'a complete signed Nostr event is required');
    }
    const kind = input.kind;
    const verify = { verifyEvent: options.verifyEvent !== false };
    const firstSeenAt = options.now ?? Math.floor(Date.now() / 1000);
    if (kind === TRUST_STATEMENT_KIND || kind === RATING_STATEMENT_KIND) {
        const result = kind === TRUST_STATEMENT_KIND
            ? await validateKind32009Event(input, verify)
            : await validateKind32014Event(input, verify);
        if (!result.valid)
            return reject('invalid', result.errors.join('; '));
        const statement = result.statement;
        const scope = scopeVerdict(kind, statement.scopes, options.profile);
        if (!scope.eligible) {
            return reject('blocked', `scope set [${statement.scopes.join(',')}] is not eligible`);
        }
        const event = signedFields(statement.event);
        const columns = fillEventRecordColumns(event);
        if (!columns)
            return reject('invalid', 'statement columns could not be reduced');
        const hintPubkey = hintPubkeyFor(statement.subject, statement.subjectHints, statement.scopes);
        return {
            type: 'statement',
            record: {
                ...event,
                firstSeenAt,
                addressKey: eventAddressKey(kind, event.pubkey, statement.d),
                ...columns,
                scopeRank: scope.scopeRank,
                ...(hintPubkey !== undefined ? { hintPubkey } : {}),
            },
        };
    }
    if (kind === NIP39_IDENTITY_KIND) {
        const result = validateSignedKind10011Event(input, verify);
        if (!result.valid)
            return reject('invalid', result.errors.join('; '));
        const event = signedFields(result.event);
        const claim = identityClaimFromEvent(result.event, { verifyEvent: false });
        return {
            type: 'identity',
            record: {
                ...event,
                firstSeenAt,
                addressKey: eventAddressKey(NIP39_IDENTITY_KIND, event.pubkey, ''),
            },
            ...(claim ? { claim } : {}),
        };
    }
    if (kind === DELETION_KIND) {
        const result = validateDeletionEvent(input, verify);
        if (!result.valid)
            return reject('invalid', result.errors.join('; '));
        const { deletion } = result;
        if (deletion.eventIds.length === 0 && deletion.addresses.length === 0) {
            return reject('blocked', 'deletion targets no held kind');
        }
        return { type: 'deletion', deletion };
    }
    return reject('blocked', `kind ${String(kind)} is not accepted`);
}
