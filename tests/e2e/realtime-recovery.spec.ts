import { expect, type Locator, type Page, test } from "@playwright/test";

import {
    createNewIdentity,
    dispatchVisibleStateCatchUp,
    goToTags,
    goToTransactions
} from "./helpers";
import {
    observeRealtimeCatchUp,
    observeRealtimeFrames,
    observeRealtimeLifecycle,
    observeRealtimeRuntimeProblems,
    shareActiveVaultWithMember,
    suppressLiveVaultOpsPushes
} from "./helpers/realtime";
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

// These tests route Realtime frames; retry tracing would retain payloads the assertions never need.
test.use({ trace: "off" });

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

async function becomesVisibleWithin(locator: Locator, timeout: number): Promise<boolean> {
    try {
        await expect(locator).toBeVisible({ timeout });
        return true;
    } catch {
        return false;
    }
}

test("a hidden receiver re-syncs missed vault_ops when it becomes visible", async ({ browser }) => {
    test.setTimeout(120_000);
    const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const receiverContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const owner = await ownerContext.newPage();
    const receiver = await receiverContext.newPage();
    const runtimeProblemObservers = [
        observeRealtimeRuntimeProblems(owner),
        observeRealtimeRuntimeProblems(receiver)
    ] as const;

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

            expect(
                runtimeProblemObservers.flatMap((observer) => observer.nonTransportMessages())
            ).toEqual([]);
        });
    } finally {
        for (const observer of runtimeProblemObservers) observer.stop();
        await ownerContext.close();
        await receiverContext.close();
    }
});

test("a visible receiver catches up only after an explicit visible-state barrier", async ({
    browser
}) => {
    test.setTimeout(120_000);
    const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const receiverContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const owner = await ownerContext.newPage();
    const receiver = await receiverContext.newPage();
    const runtimeProblemObservers = [
        observeRealtimeRuntimeProblems(owner),
        observeRealtimeRuntimeProblems(receiver)
    ] as const;
    const receiverCatchUp = observeRealtimeCatchUp(receiver);
    const receiverFrames = observeRealtimeFrames(receiver);
    const receiverLifecycle = observeRealtimeLifecycle(receiver);

    try {
        const suppression = await suppressLiveVaultOpsPushes(receiver);
        await createNewIdentity(owner);
        await createNewIdentity(receiver);
        await shareActiveVaultWithMember(owner, receiver);
        await goToTags(owner);
        await goToTags(receiver);
        expect(await receiver.evaluate(() => document.visibilityState)).toBe("visible");

        suppression.start();
        const noBarrierTag = "Visible catch-up no-barrier control";
        const noBarrierSuppressedBefore = suppression.suppressedCount();
        await createTag(owner, noBarrierTag);
        await expect
            .poll(() => suppression.suppressedCount(), { timeout: 20_000 })
            .toBeGreaterThan(noBarrierSuppressedBefore);
        expect(await becomesVisibleWithin(tagLabel(receiver, noBarrierTag), 3_000)).toBe(false);
        await dispatchVisibleStateCatchUp(receiver);
        await expect(tagLabel(receiver, noBarrierTag)).toBeVisible({ timeout: 20_000 });
        await expect.poll(() => receiverCatchUp.snapshot().inFlight).toBe(0);

        const correctedBoundary = {
            catchUp: receiverCatchUp.snapshot(),
            joins: receiverFrames.snapshot().postgresChangeJoins,
            lifecycle: receiverLifecycle.snapshot()
        };
        const correctedTag = "Visible catch-up corrected control";
        const correctedSuppressedBefore = suppression.suppressedCount();
        await createTag(owner, correctedTag);
        await expect
            .poll(() => suppression.suppressedCount(), { timeout: 20_000 })
            .toBeGreaterThan(correctedSuppressedBefore);
        await expect(tagLabel(receiver, correctedTag)).toHaveCount(0);
        expect(receiverCatchUp.snapshot()).toEqual(correctedBoundary.catchUp);
        expect(receiverFrames.snapshot().postgresChangeJoins).toBe(correctedBoundary.joins);
        expect(receiverLifecycle.snapshot()).toEqual(correctedBoundary.lifecycle);

        await dispatchVisibleStateCatchUp(receiver);
        await expect
            .poll(() => receiverCatchUp.snapshot().requested, { timeout: 20_000 })
            .toBe(correctedBoundary.catchUp.requested + 1);
        await expect
            .poll(() => receiverCatchUp.snapshot().completed, { timeout: 20_000 })
            .toBe(correctedBoundary.catchUp.completed + 1);
        await expect.poll(() => receiverCatchUp.snapshot().inFlight).toBe(0);
        const correctedCatchUp = receiverCatchUp.snapshot();
        expect(correctedCatchUp.failed).toBe(correctedBoundary.catchUp.failed);
        expect(correctedCatchUp.events.slice(correctedBoundary.catchUp.events.length)).toEqual([
            "requested",
            "completed"
        ]);
        expect(receiverFrames.snapshot().postgresChangeJoins).toBe(correctedBoundary.joins);
        expect(receiverLifecycle.snapshot()).toEqual(correctedBoundary.lifecycle);
        await expect(tagLabel(receiver, correctedTag)).toBeVisible({ timeout: 20_000 });
        expect(
            runtimeProblemObservers.flatMap((observer) => observer.nonTransportMessages())
        ).toEqual([]);
    } finally {
        receiverCatchUp.stop();
        receiverFrames.stop();
        receiverLifecycle.stop();
        for (const observer of runtimeProblemObservers) observer.stop();
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
    const runtimeProblemObservers = [
        observeRealtimeRuntimeProblems(owner),
        observeRealtimeRuntimeProblems(receiver)
    ] as const;

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

            expect(
                runtimeProblemObservers.flatMap((observer) => observer.nonTransportMessages())
            ).toEqual([]);
        });
    } finally {
        for (const observer of runtimeProblemObservers) observer.stop();
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
    const runtimeProblemObservers = [observeRealtimeRuntimeProblems(outsider)] as const;

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
            expect(
                runtimeProblemObservers.flatMap((observer) => observer.nonTransportMessages())
            ).toEqual([]);
        });
    } finally {
        for (const observer of runtimeProblemObservers) observer.stop();
        await ownerContext.close();
        await outsiderContext.close();
    }
});
