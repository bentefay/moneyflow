/**
 * Pending member-person link marker (HS-012).
 *
 * The owner's linked Person is seeded into the vault at creation
 * (`ensureDefaultVault`). A member who accepts an invite has no such seed:
 * their linked Person must be materialized when they first open the shared
 * vault after accepting.
 *
 * Acceptance records a durable per-vault marker in localStorage, so it survives
 * a refresh and is shared across tabs. Opening the shared vault reconciles the
 * marker: it materializes the member's Person if absent and clears the marker
 * only once the Person is confirmed durably present. The reconcile is therefore
 * idempotent and re-runnable — a lost sync, a refresh, or a concurrent tab all
 * converge on the single deterministic member Person rather than silently
 * missing it forever.
 *
 * Gating the write on this acceptance marker is what keeps an ordinary re-open
 * (an already-linked member, or a member added out-of-band by a test fixture)
 * from emitting a redundant synced `vault_ops` op that would perturb live-sync
 * timing for every already-linked member.
 */

const STORAGE_KEY_PREFIX = "moneyflow_pending_person_link:";

function storageKey(vaultId: string): string {
    return `${STORAGE_KEY_PREFIX}${vaultId}`;
}

/** Records that the given vault's next open must materialize this member's Person. */
export function markPendingPersonLink(vaultId: string): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(storageKey(vaultId), "1");
}

/** Whether a pending materialization is still outstanding for this vault. */
export function hasPendingPersonLink(vaultId: string): boolean {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(storageKey(vaultId)) != null;
}

/**
 * Retires the marker once the member's Person is confirmed durably present, so
 * later opens neither repeat the linkage write nor re-emit a synced op.
 */
export function clearPendingPersonLink(vaultId: string): void {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(storageKey(vaultId));
}
