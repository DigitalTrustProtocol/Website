/**
 * Write-time 32009/14 columns on EventRecord. Heap apply reads these fields
 * and does not parse tags again.
 */
import { type TrustSubject } from './kind-32009';
import type { EventRecord, SignedNostrEvent } from './types';
export declare const KIND_TRUST = 32009;
export type EventRecordGraphColumns = Pick<EventRecord, 'subject' | 'subjectType' | 'c_tag' | 'nValue' | 'addressableId' | 'activate' | 'expire' | 'labels' | 'labelHints'>;
export declare function slotAddressableId(author: string, subject: {
    type: string;
    value: string;
}, context: string): string;
/**
 * Normalized 32009/14 columns for Dexie. Undefined for other kinds or
 * rows that cannot be reduced (callers persist the signed event anyway).
 */
export declare function fillEventRecordColumns(event: SignedNostrEvent): EventRecordGraphColumns | undefined;
export declare function eventRecordSubject(record: Pick<EventRecord, 'subject' | 'subjectType'>): TrustSubject | undefined;
