"use client";

/**
 * Vault Presence Hook
 *
 * Tracks which users are online in a vault for collaborative features.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { VaultRealtimeSync, createVaultRealtimeSync } from "@/lib/supabase/realtime";
import type { OnPresenceCallback } from "@/lib/supabase/realtime";

/**
 * Presence state for a user in a vault.
 */
export interface VaultPresence {
  userId: string;
  joinedAt: string;
  lastSeen: string;
  isOnline: boolean;
}

/**
 * Options for the useVaultPresence hook.
 */
export interface UseVaultPresenceOptions {
  /** Update presence every N milliseconds (default: 30000) */
  heartbeatInterval?: number;
  /** Consider offline after N milliseconds without heartbeat (default: 60000) */
  offlineThreshold?: number;
  /** Called when receiving updates from other users */
  onUpdate?: (update: {
    id: string;
    encryptedData: string;
    versionVector: string;
    seq: number;
    createdBy: string;
    createdAt: string;
  }) => void;
}

/**
 * Hook to track presence in a vault.
 *
 * @param vaultId - The vault to track presence for
 * @param pubkeyHash - Current user's pubkey hash
 * @param options - Configuration options
 * @returns Presence state and control functions
 */
export function useVaultPresence(
  vaultId: string | null,
  pubkeyHash: string | null,
  options: UseVaultPresenceOptions = {}
) {
  const { heartbeatInterval = 30000, offlineThreshold = 60000, onUpdate } = options;

  const [presence, setPresence] = useState<VaultPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const syncRef = useRef<VaultRealtimeSync | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const onUpdateRef = useRef(onUpdate);

  // Keep onUpdate ref current
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Handle presence updates with online status
  const handlePresence: OnPresenceCallback = useCallback(
    (presenceList) => {
      const now = Date.now();
      const withOnlineStatus = presenceList.map((p) => ({
        ...p,
        isOnline: now - new Date(p.lastSeen).getTime() < offlineThreshold,
      }));
      setPresence(withOnlineStatus);
    },
    [offlineThreshold]
  );

  // Connect/disconnect based on vaultId and pubkeyHash
  useEffect(() => {
    if (!vaultId || !pubkeyHash) {
      // Cleanup existing connection
      if (syncRef.current) {
        syncRef.current.unsubscribe();
        syncRef.current = null;
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      setIsConnected(false);
      setPresence([]);
      return;
    }

    // Create new sync instance
    const sync = createVaultRealtimeSync(vaultId, pubkeyHash);
    syncRef.current = sync;

    // Subscribe with callbacks
    sync.subscribe({
      onPresence: handlePresence,
      onUpdate: (update) => {
        onUpdateRef.current?.(update);
      },
    });

    setIsConnected(true);

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      sync.updatePresence();
    }, heartbeatInterval);

    // Cleanup on unmount or change
    return () => {
      sync.unsubscribe();
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [vaultId, pubkeyHash, heartbeatInterval, handlePresence]);

  // Force presence update
  const updatePresence = useCallback(async () => {
    await syncRef.current?.updatePresence();
  }, []);

  // Disconnect manually
  const disconnect = useCallback(async () => {
    await syncRef.current?.unsubscribe();
    syncRef.current = null;
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    setIsConnected(false);
    setPresence([]);
  }, []);

  // Get online users (excluding current user)
  const onlineUsers = presence.filter((p) => p.isOnline && p.userId !== pubkeyHash);

  return {
    /** All presence entries */
    presence,
    /** Only online users (excluding current user) */
    onlineUsers,
    /** Number of online users (excluding current user) */
    onlineCount: onlineUsers.length,
    /** Whether connected to realtime */
    isConnected,
    /** Force a presence update */
    updatePresence,
    /** Disconnect from realtime */
    disconnect,
  };
}
