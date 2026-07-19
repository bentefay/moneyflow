import { expect, test } from "@playwright/test";

import {
    countRealtimeGrants,
    createNewIdentity,
    goToImportNew,
    goToTransactions,
    removeFixtureMember,
    shareActiveVaultWithMember
} from "./helpers";
import {
    getRealtimeGrantAggregates,
    getRealtimeSubscriptionCounts,
    observeRealtimeFrames,
    observeRealtimeLifecycle
} from "./helpers/realtime";

const importedDescription = "Realtime encrypted import";
const editedDescription = "Realtime encrypted edit";

function descriptionInput(page: import("@playwright/test").Page, value: string) {
    return page.locator(`[data-testid="description-editable"][value="${value}"]`);
}

test("private vault_ops push synchronizes import, edit and delete and stops after removal", async ({
    browser
}, testInfo) => {
    test.setTimeout(120_000);
    const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const memberContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const owner = await ownerContext.newPage();
    const member = await memberContext.newPage();
    const runtimeProblems: string[] = [];
    const socketSafety: Array<{ secureShape: boolean; sensitiveScopeInUrl: boolean }> = [];
    const ownerLifecycle = observeRealtimeLifecycle(owner);
    const memberLifecycle = observeRealtimeLifecycle(member);
    const memberFrames = observeRealtimeFrames(member);

    for (const page of [owner, member]) {
        page.on("console", (message) => {
            if (message.type() === "error") runtimeProblems.push(message.text());
        });
        page.on("pageerror", (error) => runtimeProblems.push(error.message));
        page.on("websocket", (socket) => {
            const url = socket.url();
            if (!url.includes("/realtime/v1/websocket")) return;
            const parsedUrl = new URL(url);
            socketSafety.push({
                secureShape: url.startsWith("ws://127.0.0.1:") || url.startsWith("wss://"),
                sensitiveScopeInUrl:
                    url.includes("vault:") || parsedUrl.searchParams.has("access_token")
            });
        });
    }

    try {
        await test.step("create isolated owner and member identities", async () => {
            await createNewIdentity(owner);
            await createNewIdentity(member);
        });

        const fixture =
            await test.step("install the documented P08-independent member fixture", () =>
                shareActiveVaultWithMember(owner, member));

        await test.step("join the same encrypted vault in two real browser contexts", async () => {
            await goToTransactions(owner);
            await member.goto("/transactions");
            await expect(member.getByTestId("transaction-table-toolbar")).toBeVisible({
                timeout: 15_000
            });
        });

        await test.step("attribute initial sync and Presence lifecycle without identifiers", async () => {
            const browserLifecycle = {
                owner: ownerLifecycle.snapshot(),
                member: memberLifecycle.snapshot()
            };
            const grants = {
                owner: await getRealtimeGrantAggregates(fixture.ownerHash, fixture.vaultId),
                member: await getRealtimeGrantAggregates(fixture.memberHash, fixture.vaultId)
            };
            const subscriptions = getRealtimeSubscriptionCounts();
            const memberFrameRegistration = memberFrames.snapshot();
            testInfo.annotations.push({
                type: "realtime-lifecycle",
                description: JSON.stringify({
                    browserLifecycle,
                    grants,
                    subscriptions,
                    memberFrameRegistration
                })
            });
            expect(browserLifecycle.owner.authorize.sync).toBeLessThanOrEqual(2);
            expect(browserLifecycle.member.authorize.sync).toBeLessThanOrEqual(2);
            expect(browserLifecycle.owner.authorize.presence).toBeLessThanOrEqual(4);
            expect(browserLifecycle.member.authorize.presence).toBeLessThanOrEqual(4);
            expect(memberFrameRegistration.postgresChangeJoins).toBeGreaterThanOrEqual(1);
            expect(memberFrameRegistration.postgresChangeBindings).toBeGreaterThanOrEqual(1);
            expect(subscriptions.total).toBeGreaterThanOrEqual(2);
            expect(subscriptions.authenticated).toBe(subscriptions.total);
            expect(subscriptions.liveExactGrant).toBe(subscriptions.total);
        });

        await test.step("push an imported encrypted operation without member refresh", async () => {
            const memberFrameBaseline = memberFrames.snapshot().postgresChanges;
            await goToImportNew(owner);
            await owner.locator('input[type="file"]').setInputFiles({
                name: "realtime-security.csv",
                mimeType: "text/csv",
                buffer: Buffer.from(
                    `Date,Description,Amount\n2026-07-20,${importedDescription},12.34\n`
                )
            });
            await owner.getByRole("tab", { name: /Columns/i }).click();
            await owner.getByRole("button", { name: /Auto-detect/i }).click();
            await expect(owner.getByText(/All required fields mapped/i)).toBeVisible();
            await owner.getByRole("tab", { name: /Account/i }).click();
            await owner.locator("#account-select").click();
            await owner.getByRole("option", { name: /Default/i }).click();
            const importButton = owner.getByRole("button", { name: /Import 1 Transaction/i });
            await expect(importButton).toBeEnabled();
            await importButton.click();
            await expect(owner).toHaveURL(/\/transactions/);
            await expect
                .poll(() => memberFrames.snapshot().postgresChanges, {
                    message: "member receives a sanitized postgres_changes event kind",
                    timeout: 15_000
                })
                .toBeGreaterThan(memberFrameBaseline);
            await expect(descriptionInput(member, importedDescription)).toBeVisible({
                timeout: 15_000
            });
        });

        await test.step("push an encrypted inline edit while the member is foregrounded", async () => {
            await member.bringToFront();
            const description = descriptionInput(owner, importedDescription);
            await description.fill(editedDescription);
            await description.press("Enter");
            await expect(descriptionInput(member, editedDescription)).toBeVisible({
                timeout: 15_000
            });
        });

        await test.step("push the encrypted deletion without member refresh", async () => {
            const row = owner.getByTestId("transaction-row").filter({
                has: descriptionInput(owner, editedDescription)
            });
            await row.getByTestId("delete-button").click();
            await row.getByTestId("delete-button").click();
            await expect(descriptionInput(member, editedDescription)).toHaveCount(0, {
                timeout: 15_000
            });
        });

        await test.step("refresh the short-lived credential in-band without a reconnect storm", async () => {
            await expect
                .poll(() => countRealtimeGrants(fixture.ownerHash, fixture.vaultId), {
                    timeout: 70_000,
                    intervals: [1_000]
                })
                .toBeGreaterThanOrEqual(2);
        });

        await test.step("remove membership and deny future payloads safely", async () => {
            await removeFixtureMember(fixture.memberHash, fixture.vaultId);
            await owner.goto("/tags");
            await expect(owner.getByRole("button", { name: /add tag/i })).toBeVisible();
            await owner.getByRole("button", { name: /add tag/i }).click();
            await owner.getByPlaceholder("Enter tag name").fill("Removed member must not receive");
            await owner.getByRole("button", { name: "Add Tag", exact: true }).click();
            await expect(
                owner.getByText("Removed member must not receive", { exact: true })
            ).toBeVisible();
            await expect(
                member.getByText("Removed member must not receive", { exact: true })
            ).toHaveCount(0);
        });

        expect(socketSafety.length).toBeGreaterThanOrEqual(2);
        expect(socketSafety.every((socket) => socket.secureShape)).toBe(true);
        expect(socketSafety.some((socket) => socket.sensitiveScopeInUrl)).toBe(false);
        expect(runtimeProblems).toEqual([]);
    } finally {
        ownerLifecycle.stop();
        memberLifecycle.stop();
        memberFrames.stop();
        await ownerContext.close();
        await memberContext.close();
    }
});
