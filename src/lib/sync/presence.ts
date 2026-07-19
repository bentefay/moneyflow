/**
 * Minimal authenticated presence transport boundary.
 *
 * P10 owns encrypted active-transaction/editing presence. P05 intentionally exposes only opaque
 * connection identifiers and timestamps so no identity hash or financial UI state is broadcast.
 */

import { Temporal } from "temporal-polyfill";

import { createVaultRealtimeSync, type VaultRealtimeSync } from "@/lib/supabase/realtime";

export interface PresenceData {
    userId: string;
    updatedAt: number;
}

export type OnPresenceStateChange = (users: PresenceData[]) => void;

export class EphemeralPresenceManager {
    private transport: VaultRealtimeSync | null = null;
    private isSubscribed = false;

    constructor(private readonly vaultId: string) {}

    async subscribe(onStateChange: OnPresenceStateChange): Promise<void> {
        if (this.transport) return;
        const transport = createVaultRealtimeSync(this.vaultId, "presence");
        this.transport = transport;
        try {
            await transport.subscribe({
                onPresence: (presence) => {
                    onStateChange(
                        presence.map((entry) => ({
                            userId: entry.userId,
                            updatedAt: Temporal.Instant.from(entry.lastSeen).epochMilliseconds
                        }))
                    );
                }
            });
            if (this.transport === transport) this.isSubscribed = true;
        } catch (error) {
            if (this.transport === transport) this.transport = null;
            await transport.unsubscribe();
            throw error;
        }
    }

    async updatePresence(): Promise<void> {
        await this.transport?.updatePresence();
    }

    async unsubscribe(): Promise<void> {
        const transport = this.transport;
        this.transport = null;
        this.isSubscribed = false;
        await transport?.unsubscribe();
    }

    get subscribed(): boolean {
        return this.isSubscribed;
    }
}

export function createEphemeralPresenceManager(vaultId: string): EphemeralPresenceManager {
    return new EphemeralPresenceManager(vaultId);
}
