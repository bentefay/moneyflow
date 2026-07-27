"use client";

/**
 * Vault Presence Hook (HS-003)
 *
 * Single source of vault presence: who is online, which transaction each session is on, and which
 * field they are editing. Backed by one Loro `EphemeralStore` per tab, broadcast encrypted over the
 * P05-authorized presence channel.
 *
 * There is deliberately only one presence system. The former parallel Supabase-Presence hook and
 * heartbeat are gone; this hook is the only presence subscriber in the app.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { derivePresenceKey } from "@/lib/crypto/presence-key";
import {
    createEphemeralPresenceManager,
    EMPTY_PRESENCE_SNAPSHOT,
    type EphemeralPresenceManager,
    type PresenceSnapshot
} from "@/lib/sync/presence";
import { IDLE_PRESENCE_STATE, type PresenceState } from "@/lib/sync/presence-protocol";

export interface VaultPresence {
    /** Live remote sessions, one entry per tab. */
    readonly snapshot: PresenceSnapshot;
    /** Peer identities with at least one live session, excluding this one. */
    readonly onlineIdentities: readonly string[];
    /**
     * Everyone currently in the vault, this identity first. The header renders this rather than
     * {@link onlineIdentities} so a lone member still sees an avatar confirming they are connected.
     */
    readonly presentIdentities: readonly string[];
    /** Whether the presence channel is connected. */
    readonly isConnected: boolean;
    /** Declare what this session is focused on. */
    readonly setPresenceState: (state: PresenceState) => void;
    /** Clear row focus while staying connected. */
    readonly clearPresenceFocus: () => void;
    /** Leave the channel — used on lock/logout. */
    readonly disconnect: () => Promise<void>;
}

/**
 * Tracks presence for a vault.
 *
 * @param vaultId - Vault to track, or null when none is selected
 * @param pubkeyHash - This identity's pubkey hash
 * @param vaultKey - Vault encryption key; the presence key is derived from it
 */
export function useVaultPresence(
    vaultId: string | null,
    pubkeyHash: string | null,
    vaultKey: Uint8Array | undefined
): VaultPresence {
    const [snapshot, setSnapshot] = useState<PresenceSnapshot>(EMPTY_PRESENCE_SNAPSHOT);
    const [isConnected, setIsConnected] = useState(false);
    const managerRef = useRef<EphemeralPresenceManager | null>(null);

    // Derivation is pure and cheap; memoising keeps the connect effect from re-running on every
    // render just because the caller handed us a fresh view over the same key bytes.
    const presenceKey = useMemo(
        () => (vaultKey == null ? undefined : derivePresenceKey(vaultKey)),
        [vaultKey]
    );

    useEffect(() => {
        if (vaultId == null || pubkeyHash == null || presenceKey == null) return;

        const manager = createEphemeralPresenceManager({ vaultId, pubkeyHash, presenceKey });
        managerRef.current = manager;
        let cancelled = false;

        void manager
            .connect((next) => {
                if (!cancelled) setSnapshot(next);
            })
            .then(() => {
                if (!cancelled) setIsConnected(true);
            })
            .catch(() => {
                // Presence is an enhancement: a failed channel must never block editing, so we
                // stay disconnected and silent rather than surfacing an error.
                if (!cancelled) setIsConnected(false);
            });

        // React cleanup does not run when the tab is closed or navigated away from, so peers would
        // otherwise hold a stale indicator until the ephemeral entry expires. Both events are
        // needed: `pagehide` covers navigation and bfcache eviction, while some teardown paths
        // (including a scripted tab close) deliver only `beforeunload`. Retracting twice is
        // harmless — the second call finds no channel.
        const leaveOnUnload = () => {
            // Retract synchronously first: an awaited disconnect is not guaranteed to finish during
            // teardown, whereas untracking on the still-open socket reaches peers immediately.
            manager.retract();
            void manager.disconnect();
        };
        window.addEventListener("pagehide", leaveOnUnload);
        window.addEventListener("beforeunload", leaveOnUnload);

        return () => {
            cancelled = true;
            window.removeEventListener("pagehide", leaveOnUnload);
            window.removeEventListener("beforeunload", leaveOnUnload);
            if (managerRef.current === manager) managerRef.current = null;
            setIsConnected(false);
            setSnapshot(EMPTY_PRESENCE_SNAPSHOT);
            void manager.disconnect();
        };
    }, [vaultId, pubkeyHash, presenceKey]);

    const setPresenceState = useCallback((state: PresenceState) => {
        void managerRef.current?.setState(state);
    }, []);

    const clearPresenceFocus = useCallback(() => {
        void managerRef.current?.setState(IDLE_PRESENCE_STATE);
    }, []);

    const disconnect = useCallback(async () => {
        const manager = managerRef.current;
        managerRef.current = null;
        setIsConnected(false);
        setSnapshot(EMPTY_PRESENCE_SNAPSHOT);
        await manager?.disconnect();
    }, []);

    const presentIdentities = useMemo(
        () =>
            isConnected && pubkeyHash != null
                ? [pubkeyHash, ...snapshot.onlineIdentities.filter((id) => id !== pubkeyHash)]
                : snapshot.onlineIdentities,
        [isConnected, pubkeyHash, snapshot.onlineIdentities]
    );

    return {
        snapshot,
        onlineIdentities: snapshot.onlineIdentities,
        presentIdentities,
        isConnected,
        setPresenceState,
        clearPresenceFocus,
        disconnect
    };
}
