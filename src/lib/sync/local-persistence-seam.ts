/**
 * Local-persistence test seam.
 *
 * A document change is visible in the DOM as soon as the loro-mirror commit re-renders, but
 * persistence runs downstream of that render: `SyncManager` enqueues the raw update
 * (`manager.ts:292-296`), dynamically imports crypto, encrypts, and only then appends it to
 * IndexedDB (`manager.ts:312-345`). A full document teardown inside that window discards the queued
 * work and no op row is ever written — MEASURED in
 * `specs/007-human-scratch-completion/evidence/P21/diagnostic-Q-P20B-26.md`.
 *
 * `SyncManager.awaitLocalPersistence()` is the barrier that closes the window, but nothing a browser
 * automation harness can reach was able to call it: every save signal in the DOM is either upstream
 * of the write (the edited cell's own text) or a 2s poll (`usePollUnsavedChanges`). This publishes
 * the existing barrier on `window` so an E2E test can wait for durability before it deliberately
 * tears the document down.
 *
 * It is a seam, not a feature: no application code reads it, it exposes no vault data, and it
 * neither schedules nor alters any persistence work — it only awaits work already in flight. It is
 * also harness-only, so it is gated out of production builds entirely: `process.env.NODE_ENV` is
 * inlined at build time, which leaves the install below as dead code a production bundle drops.
 * `playwright.config.ts` runs the harness against `pnpm run dev`, so the gate never closes on it —
 * and if a future run ever does use a production build, `tests/e2e/helpers/persistence.ts` fails
 * loudly on the absent seam rather than silently skipping the barrier.
 */

import type { SyncManager } from "./manager";

/** Lets a caller tell "the vault acknowledged its writes" from "no vault was mounted to ask". */
export type LocalPersistenceBarrierOutcome = "no-active-vault" | "persisted";

export interface LocalPersistenceSeam {
    readonly awaitLocalPersistence: () => Promise<LocalPersistenceBarrierOutcome>;
}

declare global {
    interface Window {
        __moneyflowLocalPersistence?: LocalPersistenceSeam;
    }
}

/**
 * The single `window` property this seam owns; the E2E helper reads it by name.
 *
 * Deliberately not exported: the only reference is inside the gated install below, so a production
 * build eliminates this string along with it and the key never appears in a shipped bundle.
 */
const LOCAL_PERSISTENCE_SEAM_KEY = "__moneyflowLocalPersistence";

/**
 * Publishes the barrier and returns its teardown.
 *
 * `readActiveManager` is consulted on every call rather than captured, so the seam always addresses
 * the manager that is live now — a vault switch replaces the manager but not the seam.
 *
 * Installs nothing in a production build; see the module comment.
 */
export function installLocalPersistenceSeam(
    readActiveManager: () => Pick<SyncManager, "awaitLocalPersistence"> | null
): () => void {
    if (process.env.NODE_ENV === "production") return () => undefined;
    if (typeof window === "undefined") return () => undefined;

    const seam: LocalPersistenceSeam = {
        awaitLocalPersistence: async () => {
            const manager = readActiveManager();
            if (manager == null) return "no-active-vault";
            await manager.awaitLocalPersistence();
            return "persisted";
        }
    };

    window[LOCAL_PERSISTENCE_SEAM_KEY] = seam;

    return () => {
        // A later provider may already own the property; only the installer clears its own seam.
        if (window[LOCAL_PERSISTENCE_SEAM_KEY] === seam) {
            delete window[LOCAL_PERSISTENCE_SEAM_KEY];
        }
    };
}
