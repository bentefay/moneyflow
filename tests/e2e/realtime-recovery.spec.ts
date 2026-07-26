import { expect, type Page, test } from "@playwright/test";

import { createNewIdentity, goToTags, goToTransactions } from "./helpers";
import { shareActiveVaultWithMember } from "./helpers/realtime";
import { installVisibilityControl, setDocumentVisibility } from "./helpers/visibility";

/**
 * HS-015 recovery behaviour: after the live push is missed — because the tab was backgrounded, or
 * because the connection dropped — the client must converge on the durable `vault_ops` stream
 * without a reload, without leaking data it is not entitled to, and without stalling.
 *
 * Every assertion here is about CONVERGENCE OF STATE. No wall-clock latency is asserted anywhere.
 *
 * On the visibility mock specifically: `installVisibilityControl` redefines the
 * `document.visibilityState` / `document.hidden` getters and dispatches `visibilitychange`. That
 * flips only the JS predicate the application branches on — it does NOT background the renderer or
 * throttle the socket. These tests therefore prove the client's re-sync LOGIC, and no number
 * observed under this mock is measured hidden-tab network timing. (The 2026-07-26 capability probe
 * found CDP `Emulation.setVisibilityState` absent from the bundled Chromium; raw CDP is not used.)
 */

const missedWhileHidden = "Tag created while receiver was hidden";
const missedWhileOffline = "Tag created while receiver was offline";

function tagLabel(page: Page, name: string) {
    return page.getByText(name, { exact: true });
}

async function createTag(page: Page, name: string): Promise<void> {
    await page.getByRole("button", { name: /add tag/i }).click();
    await page.getByPlaceholder("Enter tag name").fill(name);
    await page.getByRole("button", { name: "Add Tag", exact: true }).click();
    await expect(tagLabel(page, name)).toBeVisible();
}

/** Collects console/page errors so a "converged" state can also be shown to be a healthy one. */
function collectRuntimeProblems(pages: readonly Page[]): string[] {
    const problems: string[] = [];
    for (const page of pages) {
        page.on("console", (message) => {
            if (message.type() === "error") problems.push(message.text());
        });
        page.on("pageerror", (error) => problems.push(error.message));
    }
    return problems;
}

/**
 * Drops transport-layer noise so the assertion is about application health.
 *
 * These tests deliberately sever or suppress the connection, and the full suite runs several
 * browsers against one dev server, so a dropped socket or a failed fetch is an expected condition
 * the client is supposed to absorb — not a defect. Anything else still fails the test. Data
 * exposure is never judged by this filter; it is asserted directly on the rendered state.
 */
function nonTransportProblems(problems: readonly string[]): string[] {
    return problems.filter(
        (problem) =>
            !/websocket|realtime|presence|fetch|network|disconnected|connection|Failed to (load|fetch)/i.test(
                problem
            )
    );
}

interface LivePushSuppression {
    /** Starts dropping server -> page `vault_ops` pushes. The channel stays joined. */
    start(): void;
    /** Number of pushes withheld so far, proving the update really was missed. */
    suppressedCount(): number;
}

/**
 * Routes the Realtime socket so live `vault_ops` pushes can be withheld on demand.
 *
 * Must be installed BEFORE the page navigates: `routeWebSocket` only applies to sockets opened
 * after the route exists, so installing it later would silently suppress nothing. Withholding the
 * push is a deterministic stand-in for a delivery the client never received; it is not a timing
 * measurement and does not slow the socket.
 */
async function suppressLiveVaultOpsPushes(page: Page): Promise<LivePushSuppression> {
    let suppressing = false;
    let suppressed = 0;

    await page.routeWebSocket(/\/realtime\/v1\/websocket/, (route) => {
        const server = route.connectToServer();
        route.onMessage((message) => server.send(message));
        server.onMessage((message) => {
            const text = typeof message === "string" ? message : message.toString("utf8");
            // Realtime frames are arrays: [join_ref, ref, topic, event, payload].
            const isVaultOpsPush =
                text.includes('"postgres_changes"') && text.includes('"table":"vault_ops"');
            if (suppressing && isVaultOpsPush) {
                suppressed += 1;
                return;
            }
            route.send(message);
        });
    });

    return {
        start: () => {
            suppressing = true;
        },
        suppressedCount: () => suppressed
    };
}

test("a hidden receiver re-syncs missed vault_ops when it becomes visible", async ({ browser }) => {
    test.setTimeout(120_000);
    const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const receiverContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const owner = await ownerContext.newPage();
    const receiver = await receiverContext.newPage();
    const runtimeProblems = collectRuntimeProblems([owner, receiver]);

    try {
        const suppression =
            await test.step("install the visibility and socket controls before any application script runs", async () => {
                await installVisibilityControl(receiver);
                return suppressLiveVaultOpsPushes(receiver);
            });

        await test.step("create two identities sharing one encrypted vault", async () => {
            await createNewIdentity(owner);
            await createNewIdentity(receiver);
            await shareActiveVaultWithMember(owner, receiver);
        });

        await test.step("join the same vault in both clients", async () => {
            await goToTags(owner);
            await goToTags(receiver);
        });

        await test.step("background the receiver at the JS-predicate level", async () => {
            await setDocumentVisibility(receiver, "hidden");

            expect(await receiver.evaluate(() => document.visibilityState)).toBe("hidden");
            expect(await receiver.evaluate(() => document.hidden)).toBe(true);
        });

        await test.step("create an operation whose live push the receiver never gets", async () => {
            suppression.start();
            await createTag(owner, missedWhileHidden);

            await expect(tagLabel(receiver, missedWhileHidden)).toHaveCount(0);
            // Without this the test could pass on a push that was never actually withheld.
            await expect
                .poll(() => suppression.suppressedCount(), {
                    message: "the receiver's live vault_ops push was withheld",
                    timeout: 20_000
                })
                .toBeGreaterThan(0);
            await expect(tagLabel(receiver, missedWhileHidden)).toHaveCount(0);
        });

        await test.step("foreground the receiver and require convergence without a reload", async () => {
            await setDocumentVisibility(receiver, "visible");

            await expect(tagLabel(receiver, missedWhileHidden)).toBeVisible({ timeout: 20_000 });
        });

        await test.step("require a settled, error-free receiver rather than a stuck spinner", async () => {
            await expect(receiver.getByRole("status", { name: "Saved" })).toBeVisible({
                timeout: 20_000
            });
            await expect(receiver.getByRole("status", { name: "Syncing..." })).toHaveCount(0);

            expect(nonTransportProblems(runtimeProblems)).toEqual([]);
        });
    } finally {
        await ownerContext.close();
        await receiverContext.close();
    }
});

test("a receiver that goes offline catches up on durable ops after reconnecting", async ({
    browser
}) => {
    test.setTimeout(120_000);
    const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const receiverContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const owner = await ownerContext.newPage();
    const receiver = await receiverContext.newPage();
    const runtimeProblems = collectRuntimeProblems([owner, receiver]);

    try {
        await test.step("create two identities sharing one encrypted vault", async () => {
            await createNewIdentity(owner);
            await createNewIdentity(receiver);
            await shareActiveVaultWithMember(owner, receiver);
        });

        await test.step("join the same vault in both clients", async () => {
            await goToTags(owner);
            await goToTags(receiver);
        });

        await test.step("drop the receiver's connection entirely", () =>
            receiverContext.setOffline(true));

        await test.step("create the operation the offline receiver must miss", async () => {
            await createTag(owner, missedWhileOffline);
            await expect(tagLabel(receiver, missedWhileOffline)).toHaveCount(0);
        });

        await test.step("reconnect and require catch-up without a reload", async () => {
            await receiverContext.setOffline(false);

            await expect(tagLabel(receiver, missedWhileOffline)).toBeVisible({ timeout: 30_000 });
        });

        await test.step("require the receiver to settle rather than stall", async () => {
            await expect(receiver.getByRole("status", { name: "Saved" })).toBeVisible({
                timeout: 20_000
            });

            expect(nonTransportProblems(runtimeProblems)).toEqual([]);
        });
    } finally {
        await receiverContext.setOffline(false);
        await ownerContext.close();
        await receiverContext.close();
    }
});

test("a hidden client that was never entitled to a vault still sees nothing after foregrounding", async ({
    browser
}) => {
    test.setTimeout(120_000);
    const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const outsiderContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const owner = await ownerContext.newPage();
    const outsider = await outsiderContext.newPage();
    const runtimeProblems = collectRuntimeProblems([outsider]);

    try {
        await test.step("install the visibility control before any application script runs", () =>
            installVisibilityControl(outsider));

        await test.step("create two unrelated identities with no shared vault", async () => {
            await createNewIdentity(owner);
            await createNewIdentity(outsider);
        });

        await test.step("open both clients on their own vaults", async () => {
            await goToTags(owner);
            await goToTags(outsider);
        });

        const secret = "Owner private tag the outsider must never see";
        await test.step("background the outsider and create a private operation", async () => {
            await setDocumentVisibility(outsider, "hidden");
            await createTag(owner, secret);
        });

        await test.step("foregrounding must not leak another vault's data", async () => {
            await setDocumentVisibility(outsider, "visible");
            // The re-sync path runs on foreground; it must fetch only this identity's own vault.
            await goToTransactions(outsider);
            await goToTags(outsider);

            // The leak assertion above is the security claim and stays strict.
            await expect(tagLabel(outsider, secret)).toHaveCount(0);
            expect(nonTransportProblems(runtimeProblems)).toEqual([]);
        });
    } finally {
        await ownerContext.close();
        await outsiderContext.close();
    }
});
