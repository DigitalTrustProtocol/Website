/**
 * NIP-09 slot floors (wot-model.md §2.4, gap G11 in the extension). A
 * deletion removes the slot's winner from the heap and records a floor;
 * records for that slot at or below the floor are discarded, so nothing
 * older is revived and the deleted event cannot come back.
 *
 * The ledger holds one number per deleted slot — slot state, not an event
 * list. Stores persist it (Personal Server `slot_floors`) and reload it.
 */
import type { Graph, ITrustEvent } from '@dtp/trust-graph';
export declare class SlotFloors {
    #private;
    get size(): number;
    get(addressKey: string): number | undefined;
    /** Raise the floor (never lowers it). Returns the effective floor. */
    raise(addressKey: string, createdAt: number): number;
    /** True when a record for this slot is at or below the slot's floor. */
    blocks(record: {
        addressKey: string;
        created_at: number;
    }): boolean;
    entries(): IterableIterator<[string, number]>;
    clear(): void;
}
export type FloorApplyResult = 'applied' | 'ignored' | 'blocked';
/** Heap apply that honours slot floors first. `ignored`: not newer than the winner. */
export declare function applyWithFloors(graph: Graph, floors: SlotFloors, record: ITrustEvent): FloorApplyResult;
/** The current heap winner of a slot, if any (including Delete winners). */
export declare function slotWinner(graph: Graph, addressKey: string): ITrustEvent | undefined;
export interface DeletionOutcome {
    addressKey: string;
    /** The winner that was removed, if one was. */
    removed?: ITrustEvent;
    floor: number;
}
/**
 * NIP-09 `a` target: clear the slot up to the deletion time. A winner newer
 * than the deletion stays (the deletion cannot reach forward in time).
 */
export declare function deleteSlotAt(graph: Graph, floors: SlotFloors, addressKey: string, deletionCreatedAt: number): DeletionOutcome;
/**
 * NIP-09 `e` target: remove `winner` (the slot's current winner with that id,
 * found by the caller's id index) when the deletion's author wrote it.
 * The floor is the deleted event's `created_at`.
 */
export declare function deleteWinner(graph: Graph, floors: SlotFloors, winner: ITrustEvent, deletionAuthor: string): DeletionOutcome | undefined;
