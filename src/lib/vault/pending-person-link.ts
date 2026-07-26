/**
 * Pending member-person link marker (HS-012).
 *
 * The owner's linked Person is seeded into the vault at creation
 * (`ensureDefaultVault`), so a passive re-open never needs to write one. A
 * member who accepts an invite has no such seed: their linked Person must be
 * materialized once, the first time they open the shared vault after accepting.
 *
 * Gating that one-time write on an explicit acceptance marker — rather than
 * running it on every vault open — keeps ordinary re-opens from emitting a
 * redundant synced `vault_ops` op (which would otherwise perturb live-sync
 * timing for every already-linked member).
 *
 * The marker is per-vault and consumed exactly once.
 */

const STORAGE_KEY_PREFIX = "moneyflow_pending_person_link:";

function storageKey(vaultId: string): string {
    return `${STORAGE_KEY_PREFIX}${vaultId}`;
}

/** Flags a vault so its next open materializes the current member's Person. */
export function markPendingPersonLink(vaultId: string): void {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(storageKey(vaultId), "1");
}

/**
 * Returns true at most once per marked vault, clearing the flag so subsequent
 * opens do not repeat the linkage write.
 */
export function consumePendingPersonLink(vaultId: string): boolean {
    if (typeof sessionStorage === "undefined") return false;
    const key = storageKey(vaultId);
    const pending = sessionStorage.getItem(key) != null;
    if (pending) sessionStorage.removeItem(key);
    return pending;
}
