/**
 * Presence E2E helpers (HS-003).
 *
 * These assert observable behaviour — which rows carry an indicator, and whether any presence
 * traffic leaked plaintext — rather than user-facing copy. Nothing here reads or returns key
 * material; the network observer records only whether a frame *matched* a forbidden token, never
 * the frame itself.
 */

import type { BrowserContext, Page, WebSocket } from "@playwright/test";
import { expect } from "@playwright/test";

/** Rows currently showing someone else's presence, by transaction id. */
export async function readPresentRowIds(page: Page): Promise<string[]> {
    return page
        .locator('[data-testid="transaction-row"]:has([data-testid="row-presence-indicator"])')
        .evaluateAll((rows) =>
            rows.flatMap((row) => {
                const id = row.getAttribute("data-transaction-id");
                return id == null ? [] : [id];
            })
        );
}

/** Whether a specific row shows an editing (rather than merely viewing) indicator. */
export async function readRowPresenceEditing(page: Page, transactionId: string): Promise<boolean> {
    const indicator = page
        .locator(`[data-transaction-id="${transactionId}"]`)
        .locator('[data-testid="row-presence-indicator"]');
    if ((await indicator.count()) === 0) return false;
    return (await indicator.first().getAttribute("data-presence-editing")) === "true";
}

/** Waits until the set of rows showing presence matches `expected` exactly. */
export async function expectPresentRows(
    page: Page,
    expected: string[],
    options: { timeout?: number } = {}
): Promise<void> {
    await expect
        .poll(async () => (await readPresentRowIds(page)).sort(), {
            timeout: options.timeout ?? 20_000
        })
        .toEqual([...expected].sort());
}

/** Reads the transaction id of the nth row, so specs never hardcode generated ids. */
export async function readRowId(page: Page, index: number): Promise<string> {
    const id = await page
        .getByTestId("transaction-row")
        .nth(index)
        .getAttribute("data-transaction-id");
    if (id == null) throw new Error("Transaction row has no stable id");
    return id;
}

/**
 * Opens a second tab for an already-authenticated identity.
 *
 * `sessionStorage` is per-tab, so `context.newPage()` alone yields an unauthenticated page; a real
 * Duplicate Tab carries the session across. Copying it reproduces that without a browser extension,
 * giving two tabs that share one pubkey identity but must still be distinct presence sessions.
 */
export async function openDuplicateTab(
    context: BrowserContext,
    source: Page,
    path = "/transactions"
): Promise<Page> {
    const session = await source.evaluate(() => sessionStorage.getItem("moneyflow_session"));
    if (session == null) throw new Error("Source tab has no authenticated session to duplicate");

    const duplicate = await context.newPage();
    await duplicate.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [
        "moneyflow_session",
        session
    ] as const);
    await duplicate.goto(path);
    return duplicate;
}

export interface PresenceTrafficReport {
    /** Frames whose body contained a token that must never appear in cleartext. */
    readonly leakedFrames: number;
    /** Frames carrying a presence payload at all, to prove the channel was actually exercised. */
    readonly presenceFrames: number;
}

/**
 * Watches realtime frames for plaintext presence metadata.
 *
 * `forbidden` holds values that legitimately exist in the page (row ids, field names, pubkey
 * hashes) and therefore must be encrypted before transit. Only counts are retained.
 */
export function observePresenceTraffic(
    page: Page,
    forbidden: readonly string[]
): { report: () => PresenceTrafficReport; stop: () => void } {
    let leakedFrames = 0;
    let presenceFrames = 0;
    const listeners = new Map<WebSocket, (event: { payload: string | Buffer }) => void>();

    const inspect = (payload: string | Buffer) => {
        const text = typeof payload === "string" ? payload : payload.toString("utf8");
        if (!text.includes("presence")) return;
        presenceFrames += 1;
        if (forbidden.some((token) => token.length > 0 && text.includes(token))) leakedFrames += 1;
    };

    const socketListener = (socket: WebSocket) => {
        if (!socket.url().includes("/realtime/v1/websocket")) return;
        const handler = ({ payload }: { payload: string | Buffer }) => inspect(payload);
        listeners.set(socket, handler);
        socket.on("framesent", handler);
        socket.on("framereceived", handler);
    };
    page.on("websocket", socketListener);

    return {
        report: () => ({ leakedFrames, presenceFrames }),
        stop: () => {
            page.off("websocket", socketListener);
            for (const [socket, handler] of listeners) {
                socket.off("framesent", handler);
                socket.off("framereceived", handler);
            }
            listeners.clear();
        }
    };
}
