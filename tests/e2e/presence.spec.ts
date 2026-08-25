/**
 * HS-003 Loro ephemeral presence E2E.
 *
 * Exercises two distinct identities plus a duplicate tab of one of them against the real
 * P05-authorized presence channel, asserting behaviour (which rows carry an indicator, whether
 * focus is stolen, what reaches the wire) rather than user-facing copy.
 */

import { expect, test } from "@playwright/test";

import {
    createNewIdentity,
    expectPresentRows,
    goToTransactions,
    observePresenceTraffic,
    openDuplicateTab,
    readRowId,
    readRowPresenceEditing,
    reloadPage,
    shareActiveVaultWithMember
} from "./helpers";

/** Adds `count` empty rows, returning their stable ids in row order. */
async function seedRows(page: import("@playwright/test").Page, count: number): Promise<string[]> {
    const addButton = page.getByTestId("add-transaction-button");
    for (let index = 0; index < count; index += 1) {
        await addButton.click();
        await expect(page.getByTestId("transaction-row")).toHaveCount(index + 1);
    }
    const ids: string[] = [];
    for (let index = 0; index < count; index += 1) ids.push(await readRowId(page, index));
    return ids;
}

/**
 * Moves keyboard focus onto a row's checkbox gridcell without activating it, waiting for the
 * virtualizer to mount the row and confirming focus actually landed before returning.
 */
async function focusRow(
    page: import("@playwright/test").Page,
    transactionId: string
): Promise<void> {
    const row = page.locator(`[data-transaction-id="${transactionId}"]`).first();
    await row.waitFor({ state: "visible", timeout: 30_000 });
    await row.locator('[role="gridcell"][data-cell="checkbox"]').focus();
    await expect
        .poll(
            () =>
                page.evaluate(
                    () =>
                        document.activeElement
                            ?.closest("[data-transaction-id]")
                            ?.getAttribute("data-transaction-id") ?? null
                ),
            { timeout: 15_000 }
        )
        .toBe(transactionId);
}

test("two members and a duplicate tab track each other's rows and fields", async ({ browser }) => {
    test.setTimeout(180_000);

    const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const memberContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const owner = await ownerContext.newPage();
    const member = await memberContext.newPage();
    const runtimeProblems: string[] = [];

    for (const page of [owner, member]) {
        page.on("console", (message) => {
            if (message.type() === "error") runtimeProblems.push(message.text());
        });
        page.on("pageerror", (error) => runtimeProblems.push(error.message));
    }

    try {
        await createNewIdentity(owner);
        await createNewIdentity(member);
        const fixture = await shareActiveVaultWithMember(owner, member);

        await goToTransactions(owner);
        const rowIds = await seedRows(owner, 3);

        await goToTransactions(member);
        await expect(member.getByTestId("transaction-row")).toHaveCount(3, { timeout: 30_000 });

        // A second tab of the *same* identity: same pubkey, distinct presence session.
        const ownerSecondTab = await openDuplicateTab(ownerContext, owner);
        const traffic = observePresenceTraffic(ownerSecondTab, [
            ...rowIds,
            fixture.ownerHash,
            fixture.memberHash,
            "amount",
            "notes"
        ]);
        await expect(ownerSecondTab.getByTestId("transaction-row")).toHaveCount(3, {
            timeout: 30_000
        });

        await test.step("distinct sessions focus distinct rows", async () => {
            await focusRow(owner, rowIds[0]);
            await focusRow(member, rowIds[1]);
            await focusRow(ownerSecondTab, rowIds[2]);

            // Each session sees the other two rows decorated, never its own.
            await expectPresentRows(owner, [rowIds[1], rowIds[2]]);
            await expectPresentRows(member, [rowIds[0], rowIds[2]]);
            await expectPresentRows(ownerSecondTab, [rowIds[0], rowIds[1]]);
        });

        await test.step("presence does not steal focus", async () => {
            const focusedRow = await member.evaluate(
                () =>
                    document.activeElement
                        ?.closest("[data-transaction-id]")
                        ?.getAttribute("data-transaction-id") ?? null
            );
            expect(focusedRow).toBe(rowIds[1]);
        });

        await test.step("switching fields is reflected as editing", async () => {
            await owner
                .locator(`[data-transaction-id="${rowIds[0]}"]`)
                .getByTestId("description-editable")
                .focus();
            await expect
                .poll(() => readRowPresenceEditing(member, rowIds[0]), { timeout: 20_000 })
                .toBe(true);

            // Moving focus out of the table entirely retracts the row indicator. Only the duplicate
            // tab's row should remain. Retraction crosses two sockets plus a re-render, so this
            // waits longer than a same-tab assertion would.
            await owner.getByTestId("add-transaction-button").focus();
            await expectPresentRows(member, [rowIds[2]], { timeout: 40_000 });
        });

        await test.step("a peer's presence never blocks our own edit", async () => {
            // rowIds[2] is currently held by the duplicate tab, so this edits a row under presence.
            const description = member
                .locator(`[data-transaction-id="${rowIds[2]}"]`)
                .getByTestId("description-editable");
            await expect(description).toBeEditable();
            await description.fill("Member edit over peer presence");
            await description.press("Enter");
            await expect(description).toHaveValue("Member edit over peer presence");
        });

        await test.step("closing a tab retracts its presence", async () => {
            // Only the duplicate tab still holds focus: the owner moved out of the table above.
            await expectPresentRows(member, [rowIds[2]]);
            // `runBeforeUnload` makes Playwright run the page's unload handlers, matching a real
            // user closing a tab rather than the browser discarding it silently.
            //
            // Clearing is bounded by the ephemeral timeout, not by the unload handler: the
            // `untrack` frame is emitted but the socket is torn down before the server processes
            // it, so the peer's channel state still lists the connection. Expiry of the Loro entry
            // is what actually retracts the indicator, which is the same path a crashed or
            // network-dropped tab takes. See Q-P10-01.
            await ownerSecondTab.close({ runBeforeUnload: true });
            await expectPresentRows(member, [], { timeout: 60_000 });
        });

        await test.step("no plaintext presence metadata reaches the wire", () => {
            const report = traffic.report();
            expect(report.presenceFrames).toBeGreaterThan(0);
            expect(report.leakedFrames).toBe(0);
        });

        traffic.stop();
        expect(runtimeProblems).toEqual([]);
    } finally {
        await ownerContext.close();
        await memberContext.close();
    }
});

test("presence recovers after a page reload", async ({ browser }) => {
    test.setTimeout(180_000);

    const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const memberContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const owner = await ownerContext.newPage();
    const member = await memberContext.newPage();

    try {
        await createNewIdentity(owner);
        await createNewIdentity(member);
        await shareActiveVaultWithMember(owner, member);

        await goToTransactions(owner);
        const rowIds = await seedRows(owner, 2);

        await goToTransactions(member);
        await expect(member.getByTestId("transaction-row")).toHaveCount(2, { timeout: 30_000 });

        await focusRow(owner, rowIds[0]);
        await expectPresentRows(member, [rowIds[0]]);

        // A reload tears the socket down and re-establishes it with a fresh grant and a new
        // session id. The owner must reappear rather than stay invisible behind stale state.
        await reloadPage(owner);
        await expect(owner.getByTestId("transaction-row")).toHaveCount(2, { timeout: 30_000 });
        await focusRow(owner, rowIds[1]);

        await expectPresentRows(member, [rowIds[1]], { timeout: 60_000 });
    } finally {
        await ownerContext.close();
        await memberContext.close();
    }
});

test("a stale session expires without a clean leave", async ({ browser }) => {
    test.setTimeout(180_000);

    const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const memberContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const owner = await ownerContext.newPage();
    const member = await memberContext.newPage();

    try {
        await createNewIdentity(owner);
        await createNewIdentity(member);
        await shareActiveVaultWithMember(owner, member);

        await goToTransactions(owner);
        const rowIds = await seedRows(owner, 1);

        await goToTransactions(member);
        await expect(member.getByTestId("transaction-row")).toHaveCount(1, { timeout: 30_000 });

        await focusRow(owner, rowIds[0]);
        await expectPresentRows(member, [rowIds[0]]);

        // Dropping the owner's context is an abrupt disappearance, not a clean unsubscribe.
        await ownerContext.close();

        // Presence must clear rather than flash indefinitely.
        await expectPresentRows(member, [], { timeout: 60_000 });
    } finally {
        await memberContext.close();
    }
});

/**
 * UR-003: a presence avatar shows initials of the member's NAME, never characters of their
 * pubkeyHash. The reported defect was an avatar reading "AD" — the first two hex characters of the
 * principal's own hash — with the full hash as its tooltip.
 *
 * Both linkage paths are exercised: the OWNER, who adopts the seeded "Me" person and so resolves to
 * a real name, and the INVITED MEMBER, who starts unnamed and must fall back to a person icon with
 * a human-readable label rather than to hash text.
 */
test("presence avatars are labelled by name, never by pubkey hash", async ({ browser }) => {
    test.setTimeout(180_000);

    const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const memberContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const owner = await ownerContext.newPage();
    const member = await memberContext.newPage();

    try {
        await createNewIdentity(owner);
        await createNewIdentity(member);
        const fixture = await shareActiveVaultWithMember(owner, member);

        await goToTransactions(owner);
        await goToTransactions(member);

        // The sidebar avatar group is the surface the defect was reported against: the member is
        // present, so the owner's shell renders an avatar for them and vice versa.
        const ownerAvatars = owner.locator("aside").getByRole("img");
        await expect(ownerAvatars.first()).toBeVisible({ timeout: 60_000 });

        await test.step("the OWNER resolves to their seeded name", async () => {
            // The owner adopted the default "Me" person, so the member's shell labels them "Me"
            // and shows "M" — not "AD"-style hash characters.
            //
            // `exact` matters: getByRole name matching is substring-based, and "Me" is a
            // substring of "Unnamed member", which is the label of the other avatar in this
            // very group.
            const ownerAsSeenByMember = member
                .locator("aside")
                .getByRole("img", { name: "Me", exact: true });
            await expect(ownerAsSeenByMember).toBeVisible({ timeout: 60_000 });
            await expect(ownerAsSeenByMember).toHaveText("M");
            // presentIdentities includes self first (use-vault-presence.ts:129-135), so the
            // member's own unnamed avatar sits alongside the owner's named one. Both cases
            // must render distinguishably side by side rather than collapsing onto one label.
            await expect(
                member.locator("aside").getByRole("img", { name: "Unnamed member", exact: true })
            ).toHaveCount(1);
        });

        await test.step("no avatar exposes any part of a pubkey hash", async () => {
            for (const [page, hashes] of [
                [owner, [fixture.ownerHash, fixture.memberHash]],
                [member, [fixture.ownerHash, fixture.memberHash]]
            ] as const) {
                const avatars = page.locator("aside").getByRole("img");
                const count = await avatars.count();
                expect(count).toBeGreaterThan(0);

                for (let index = 0; index < count; index += 1) {
                    const avatar = avatars.nth(index);
                    const text = (await avatar.textContent()) ?? "";
                    const label = (await avatar.getAttribute("aria-label")) ?? "";
                    const tooltip =
                        (await avatar
                            .locator("xpath=ancestor::*[@title][1]")
                            .getAttribute("title")) ?? "";

                    for (const hash of hashes) {
                        // Neither the initials, the accessible name, nor the tooltip may carry
                        // hash text — the first two characters are what produced "AD".
                        expect(text.toLowerCase()).not.toContain(hash.slice(0, 2).toLowerCase());
                        expect(label.toLowerCase()).not.toContain(hash.slice(0, 4).toLowerCase());
                        expect(tooltip.toLowerCase()).not.toContain(hash.slice(0, 4).toLowerCase());
                    }
                    // The tooltip must agree with the accessible name rather than be a hash.
                    expect(tooltip.startsWith(label)).toBe(true);
                }
            }
        });

        await test.step("an INVITED MEMBER with no name shows an icon, not hash initials", async () => {
            // The invited member was auto-created unnamed, so the owner's shell cannot resolve a
            // name for them. It must render the person icon and a readable label.
            const unnamed = owner
                .locator("aside")
                .getByRole("img", { name: "Unnamed member", exact: true });
            await expect(unnamed).toBeVisible({ timeout: 60_000 });
            await expect(unnamed).toHaveText("");
            await expect(unnamed.locator("svg")).toBeVisible();
        });
    } finally {
        await ownerContext.close();
        await memberContext.close();
    }
});
