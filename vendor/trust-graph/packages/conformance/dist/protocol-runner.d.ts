/** TypeScript protocol runner: `classifyEvent` → canonical verdict in model field names. */
import type { ProtocolCase } from './types';
export interface ProtocolVerdict {
    valid: boolean;
    prefix?: 'invalid' | 'blocked';
    eligible: boolean;
    record?: Record<string, unknown>;
    claim?: {
        pubkey: string;
        twitterId: string;
        eventId: string;
    } | null;
    deletion?: {
        eventIds: string[];
        addressKeys: string[];
    };
    message?: string;
}
export declare function runProtocolCase(testCase: ProtocolCase): Promise<ProtocolVerdict>;
