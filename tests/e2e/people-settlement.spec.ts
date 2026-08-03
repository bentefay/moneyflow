/**
 * E2E: People-page settlement experience
 *
 * Covers the canonical settlement specification against the PRODUCTION settlement path:
 * - one named journey per canonical example A-H (section 7)
 * - the mandatory 12-step end-to-end journey (section 15.3)
 * - the additional matrices: add row, imported edit, joint ownership, multiple currency,
 *   historical Person, invalid warnings, keyboard-only operation, narrow viewport/horizontal
 *   scrolling, dark mode and reduced motion, deterministic accessibility, and a clean
 *   console/network surface.
 *
 * Every amount asserted here is produced by `calculateSettlementBalances` through the real UI. No
 * test computes a settlement value itself.
 *
 * The vault's default currency is inferred from the browser's time zone, so the time zone is pinned
 * to a US one to keep the USD amounts asserted below deterministic on any host. Currency inference
 * itself is covered in `onboarding-vault.spec.ts`.
 */

import { expect, test, type Locator, type Page } from "@playwright/test";

import {
    awaitVaultPersistence,
    createNewIdentity,
    goToAccounts,
    goToPeople,
    goToStatuses,
    goToTransactions,
    reloadPage
} from "./helpers";
import {
    addAccount,
    addEmptyTransaction,
    addPeople,
    addTransaction,
    createTransaction,
    currencySection,
    expandObligation,
    expectEveryoneSettled,
    expectNoQualifyingTransactions,
    expectObligation,
    expectSettlementIncomplete,
    PAID_STATUS_NAME,
    readPersonIds,
    rowById,
    setAccountCurrency,
    setAccountOwnership,
    setAllocation,
    setStatus,
    settlementCard,
    UNPAID_STATUS_NAME
} from "./helpers/settlement";
import {
    createStatus,
    deleteStatus,
    disableTreatAsPaid,
    enableTreatAsPaid,
    renameStatus,
    statusRow,
    TREAT_AS_PAID_LABEL
} from "./helpers/statuses";

// Keeps the inferred vault default currency at USD regardless of the host's time zone.
test.use({ timezoneId: "America/New_York" });

/**
 * Pre-existing local-stack transport noise, not attributable to the settlement surface.
 *
 * The dev `webServer` intermittently rejects `sync.pushOps` with "Request authentication failed",
 * which the sync manager reports through `console.error`. It originates in
 * `src/lib/sync/manager.ts` and `src/components/providers/vault-provider.tsx`, is unrelated to any
 * People/settlement code path, and reproduces on the pre-existing suite. Everything else is fatal.
 */
const PRE_EXISTING_TRANSPORT_NOISE =
    /SyncManager error|Failed to push to server|Failed to fetch|ERR_ABORTED/;

/** Fails the test on any console error or failed request attributable to this feature. */
function observeBrowserHealth(page: Page): { assertClean: () => void } {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
        const text = message.text();
        if (message.type() === "error" && !PRE_EXISTING_TRANSPORT_NOISE.test(text)) {
            consoleErrors.push(text);
        }
    });
    page.on("requestfailed", (request) => {
        const failure = request.failure()?.errorText ?? "";
        if (!PRE_EXISTING_TRANSPORT_NOISE.test(failure)) {
            failedRequests.push(`${request.method()} ${request.url()} ${failure}`);
        }
    });
    page.on("response", (response) => {
        if (response.status() >= 500) {
            failedRequests.push(`${String(response.status())} ${response.url()}`);
        }
    });

    return {
        assertClean: () => {
            expect(consoleErrors).toEqual([]);
            expect(failedRequests).toEqual([]);
        }
    };
}

// ---------------------------------------------------------------------------
// Section 7: canonical examples A-H, one named E2E each. All eight are mandatory.
// ---------------------------------------------------------------------------

test.describe("People page canonical settlement examples", () => {
    test("canonical example A: no explicit allocations produces no obligation", async ({
        page
    }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);

        // Amount -$100, ownership Me 100%, no explicit allocations.
        await createTransaction(page, { amount: "-100.00", description: "Example A" });

        await goToPeople(page);
        await expectEveryoneSettled(page);
    });

    test("canonical example B: basic 50/50 expense makes Bob owe Me $50", async ({ page }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        // Amount -$100, ownership Me 100%, explicit Me 50% / Bob 50%.
        await createTransaction(page, {
            allocations: { Bob: "50", Me: "50" },
            amount: "-100.00",
            description: "Example B"
        });

        await goToPeople(page);
        await expectObligation(page, {
            amountText: "$50.00",
            creditor: "Me",
            currencyCode: "USD",
            debtor: "Bob"
        });
    });

    test("canonical example C: owner remainder makes Bob owe Me $30", async ({ page }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        // Amount -$100, ownership Me 100%, explicit Bob 30% -> remainder 70% to Me.
        await createTransaction(page, {
            allocations: { Bob: "30" },
            amount: "-100.00",
            description: "Example C"
        });

        await goToPeople(page);
        await expectObligation(page, {
            amountText: "$30.00",
            creditor: "Me",
            currencyCode: "USD",
            debtor: "Bob"
        });
    });

    test("canonical example D: joint owners split the third person's share $18 and $12", async ({
        page
    }) => {
        test.setTimeout(150_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob", "Charlie"]);
        // Ownership Me 60% / Bob 40%.
        await setAccountOwnership(page, "Default", { Me: 60, Bob: 40 });

        // Amount -$100, explicit Charlie 30% -> remainder 70% split 42/28.
        await createTransaction(page, {
            allocations: { Charlie: "30" },
            amount: "-100.00",
            description: "Example D"
        });

        await goToPeople(page);
        await expectObligation(page, {
            amountText: "$18.00",
            creditor: "Me",
            currencyCode: "USD",
            debtor: "Charlie"
        });
        await expectObligation(page, {
            amountText: "$12.00",
            creditor: "Bob",
            currencyCode: "USD",
            debtor: "Charlie"
        });
    });

    test("canonical example E: a negative allocation reverses the direction so Me owes Bob $20", async ({
        page
    }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        // Amount -$100, ownership Me 100%, explicit Bob -20% -> remainder 120% to Me.
        await createTransaction(page, {
            allocations: { Bob: "-20" },
            amount: "-100.00",
            description: "Example E"
        });

        await goToPeople(page);
        await expectObligation(page, {
            amountText: "$20.00",
            creditor: "Bob",
            currencyCode: "USD",
            debtor: "Me"
        });
    });

    test("canonical example F: income makes the receiving owner owe Bob $50", async ({ page }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        // Amount +$100, ownership Me 100%, explicit Me 50% / Bob 50%.
        await createTransaction(page, {
            allocations: { Bob: "50", Me: "50" },
            amount: "100.00",
            description: "Example F"
        });

        await goToPeople(page);
        await expectObligation(page, {
            amountText: "$50.00",
            creditor: "Bob",
            currencyCode: "USD",
            debtor: "Me"
        });
    });

    test("canonical example G: equal joint ownership with no allocations produces no obligation", async ({
        page
    }) => {
        test.setTimeout(150_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);
        // Ownership Me 50% / Bob 50%, no explicit allocations.
        await setAccountOwnership(page, "Default", { Me: 50, Bob: 50 });

        await createTransaction(page, { amount: "-100.00", description: "Example G" });

        await goToPeople(page);
        await expectEveryoneSettled(page);
    });

    test("canonical example H: a status without Treat-as-Paid produces no obligation", async ({
        page
    }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        // Example B's data with a status whose behavior is not treatAsPaid.
        await createTransaction(page, {
            allocations: { Bob: "50", Me: "50" },
            amount: "-100.00",
            description: "Example H",
            status: UNPAID_STATUS_NAME
        });

        await goToPeople(page);
        await expectNoQualifyingTransactions(page);
    });
});

// ---------------------------------------------------------------------------
// Section 15.3: the mandatory 12-step end-to-end journey.
// ---------------------------------------------------------------------------

test.describe("People page settlement journey", () => {
    test("mandatory journey: allocate, settle, trace, persist, exclude, restore and reverse", async ({
        page
    }) => {
        test.setTimeout(240_000);
        const health = observeBrowserHealth(page);

        await test.step("1. create and unlock a vault", async () => {
            await createNewIdentity(page);
        });

        await test.step("2. add Bob", async () => {
            await addPeople(page, ["Bob"]);
            await expect(page.getByText("Bob", { exact: true }).first()).toBeVisible();
        });

        await test.step("3. verify the default account is owned by Me 100%", async () => {
            await goToAccounts(page);
            await expect(page.getByText("Me (100%)")).toBeVisible();
        });

        const transactionId =
            await test.step("4. add a -$100 transaction with a Treat-as-Paid status", async () =>
                createTransaction(page, { amount: "-100.00", description: "Mandatory journey" }));

        await test.step("5. enter Me 50% and Bob 50% through real grid cells", async () => {
            const row = rowById(page, transactionId);
            await setAllocation(row, "Me", "50");
            await setAllocation(row, "Bob", "50");
        });

        const obligationText = await test.step("6. verify Bob owes Me $50 on People", async () => {
            await goToPeople(page);
            const row = await expectObligation(page, {
                amountText: "$50.00",
                creditor: "Me",
                currencyCode: "USD",
                debtor: "Bob"
            });
            return row;
        });

        await test.step("7. expand the obligation and verify the source transaction", async () => {
            const sources = await expandObligation(obligationText);
            const source = sources.getByTestId(`settlement-source-${transactionId}`);
            await expect(source).toBeVisible();
            await expect(source).toContainText("Mandatory journey");
            await expect(source).toContainText("Default");
            await expect(source).toContainText("$50.00");
            // Explicit and effective allocations are both shown, never conflated.
            await expect(source).toContainText("explicit 50%");
            await expect(source).toContainText("effective 50%");
        });

        await test.step("8. navigate back to that transaction", async () => {
            await obligationText.getByRole("link", { name: "View transaction" }).first().click();
            await page.waitForURL(/\/transactions\?transaction=/);
            const focused = rowById(page, transactionId);
            await expect(focused).toBeVisible();
            // The stable source ID is focused, not an index.
            await expect(focused).toHaveAttribute("aria-selected", "true");
        });

        await test.step("9. reload and verify allocations and settlement persist", async () => {
            await reloadPage(page);
            const reloaded = rowById(page, transactionId);
            // `Explicit:` is the only clause in the cell that reflects stored state. A bare "50%"
            // is also satisfied by the derived `Owner remainder: 50%.` that exists precisely
            // because Bob's allocation is missing, so it cannot fail on the loss this step names.
            await expect(
                reloaded.getByRole("button", { name: "Edit Bob allocation" })
            ).toContainText("Explicit: 50%.");

            await goToPeople(page);
            await expectObligation(page, {
                amountText: "$50.00",
                creditor: "Me",
                currencyCode: "USD",
                debtor: "Bob"
            });
        });

        await test.step("10. a non-paid status removes it from settlement", async () => {
            await goToTransactions(page);
            await setStatus(page, rowById(page, transactionId), UNPAID_STATUS_NAME);

            await goToPeople(page);
            await expectNoQualifyingTransactions(page);
        });

        await test.step("11. restore paid, enter Bob -20% and verify the reversal", async () => {
            await goToTransactions(page);
            const row = rowById(page, transactionId);
            await setStatus(page, row, "Paid");
            await setAllocation(row, "Me", "0");
            await setAllocation(row, "Bob", "-20");

            await goToPeople(page);
            // Remainder 120% to Me, Bob -20%: the direction reverses.
            await expectObligation(page, {
                amountText: "$20.00",
                creditor: "Bob",
                currencyCode: "USD",
                debtor: "Me"
            });
        });

        await test.step("12. invalid, paste, decimal and edit semantics", async () => {
            await goToTransactions(page);
            const row = rowById(page, transactionId);
            const cell = row.getByRole("button", { name: "Edit Bob allocation" });
            const input = row.getByRole("textbox", { name: "Bob allocation percentage" });

            await test.step("-101 is rejected without clamping", async () => {
                await cell.click();
                await input.fill("-101");
                await input.press("Enter");
                await expect(input).toHaveAttribute("aria-invalid", "true");
                await expect(row.getByRole("alert")).toBeVisible();
                await input.press("Escape");
                // The original value is preserved, never clamped to -100.
                await expect(cell).toContainText("-20%");
            });

            await test.step("101 is rejected without clamping", async () => {
                await cell.click();
                await input.fill("101");
                await input.press("Enter");
                await expect(input).toHaveAttribute("aria-invalid", "true");
                await input.press("Escape");
                await expect(cell).toContainText("-20%");
            });

            await test.step("a pasted decimal is accepted and saved on Enter", async () => {
                await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
                    origin: page.url().replace(/(\/\/[^/]+).*/, "$1")
                });
                await page.evaluate(() => navigator.clipboard.writeText("33.75"));

                await cell.click();
                await input.focus();
                // A real clipboard paste, not a synthetic fill.
                await page.keyboard.press("ControlOrMeta+v");
                await expect(input).toHaveValue("33.75");
                await input.press("Enter");
                await expect(cell).toContainText("33.75%");
            });

            await test.step("Escape preserves the original value", async () => {
                await cell.click();
                await input.fill("12");
                await input.press("Escape");
                await expect(cell).toContainText("33.75%");
            });

            await test.step("blur saves", async () => {
                await cell.click();
                await input.fill("25.5");
                await input.blur();
                await expect(cell).toContainText("25.5%");
            });

            await goToPeople(page);
            await expect(settlementCard(page)).toBeVisible();
        });

        health.assertClean();
    });
});

// ---------------------------------------------------------------------------
// Additional required matrices.
// ---------------------------------------------------------------------------

test.describe("People page settlement matrices", () => {
    test("multiple currencies render as separate sections with no combined total", async ({
        page
    }) => {
        test.setTimeout(180_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);
        await addAccount(page, "Euro Account");
        await setAccountCurrency(page, "Euro Account", "EUR", "Euro");
        // A newly added account is seeded with equal ownership across every Person. Give it a sole
        // owner so the EUR expense produces an obligation rather than canonical example G.
        await setAccountOwnership(page, "Euro Account", { Me: 100 });

        await goToTransactions(page);
        // A new row defaults to whichever account the CRDT map yields first, so both accounts are
        // named explicitly rather than assumed.
        await addTransaction(page, {
            account: "Default",
            allocations: { Bob: "50", Me: "50" },
            amount: "-100.00",
            description: "USD expense"
        });
        await addTransaction(page, {
            account: "Euro Account",
            allocations: { Bob: "50", Me: "50" },
            amount: "-40.00",
            description: "EUR expense"
        });

        await goToPeople(page);
        await expectObligation(page, {
            amountText: "$50.00",
            creditor: "Me",
            currencyCode: "USD",
            debtor: "Bob"
        });
        await expectObligation(page, {
            amountText: "€20.00",
            creditor: "Me",
            currencyCode: "EUR",
            debtor: "Bob"
        });

        // Two separate sections, and the amounts are never summed into a $70.00 grand total.
        await expect(currencySection(page, "USD")).toBeVisible();
        await expect(currencySection(page, "EUR")).toBeVisible();
        await expect(settlementCard(page)).not.toContainText("70.00");
    });

    test("add-row allocations flow straight into settlement", async ({ page }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        await goToTransactions(page);
        // Allocations entered on the freshly added row, before any reload.
        const row = rowById(page, await addEmptyTransaction(page));
        const amount = row.getByTestId("amount-editable");
        await amount.click();
        await amount.fill("-60.00");
        await amount.press("Enter");
        await setStatus(page, row, "Paid");
        await setAllocation(row, "Bob", "50");
        await setAllocation(row, "Me", "50");

        await goToPeople(page);
        await expectObligation(page, {
            amountText: "$30.00",
            creditor: "Me",
            currencyCode: "USD",
            debtor: "Bob"
        });
    });

    test("editing an existing transaction's allocation updates settlement without rewriting it", async ({
        page
    }) => {
        test.setTimeout(150_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        const transactionId = await createTransaction(page, {
            allocations: { Bob: "50", Me: "50" },
            amount: "-100.00",
            description: "Editable"
        });

        await goToPeople(page);
        await expectObligation(page, {
            amountText: "$50.00",
            creditor: "Me",
            currencyCode: "USD",
            debtor: "Bob"
        });

        await goToTransactions(page);
        await setAllocation(rowById(page, transactionId), "Bob", "25");

        await goToPeople(page);
        // Explicit Me 50 / Bob 25 totals 75; the 25% remainder goes to the owner Me.
        await expectObligation(page, {
            amountText: "$25.00",
            creditor: "Me",
            currencyCode: "USD",
            debtor: "Bob"
        });
    });

    test("bidirectional obligations net within a currency and retain both sources", async ({
        page
    }) => {
        test.setTimeout(180_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        await goToTransactions(page);
        // Bob owes Me $50.
        const owedToMe = await addTransaction(page, {
            allocations: { Bob: "50", Me: "50" },
            amount: "-100.00",
            description: "Bob owes Me"
        });
        // Me owes Bob $20 (negative allocation reverses direction).
        const owedToBob = await addTransaction(page, {
            allocations: { Bob: "-20" },
            amount: "-100.00",
            description: "Me owes Bob"
        });

        await goToPeople(page);
        const obligation = await expectObligation(page, {
            amountText: "$30.00",
            creditor: "Me",
            currencyCode: "USD",
            debtor: "Bob"
        });

        const sources = await expandObligation(obligation);
        // Netting preserves traceability for both the increasing and decreasing source.
        await expect(sources.getByTestId(`settlement-source-${owedToMe}`)).toContainText("$50.00");
        await expect(sources.getByTestId(`settlement-source-${owedToBob}`)).toContainText(
            "-$20.00"
        );
    });

    test("a deleted Person keeps their historical balance under a stable deleted label", async ({
        page
    }) => {
        test.setTimeout(180_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob", "Charlie"]);
        // Bob earns his balance through account ownership rather than an explicit allocation, so he
        // remains deletable while still participating in the historical calculation.
        await setAccountOwnership(page, "Default", { Me: 50, Bob: 50 });

        await createTransaction(page, {
            allocations: { Charlie: "100" },
            amount: "-100.00",
            description: "Historical"
        });

        await goToPeople(page);
        await expectObligation(page, {
            amountText: "$50.00",
            creditor: "Bob",
            currencyCode: "USD",
            debtor: "Charlie"
        });

        await test.step("delete Bob", async () => {
            const bobRow = page.locator("div.group").filter({ hasText: "Bob" }).first();
            await bobRow.getByRole("button", { name: "Delete" }).click();
            await bobRow.getByRole("button", { name: "Confirm delete" }).click();
            await expect(bobRow).toHaveCount(0);
        });

        await reloadPage(page);
        await goToPeople(page);
        // The balance is retained, not dropped, and the label marks the Person as deleted.
        await expectObligation(page, {
            amountText: "$50.00",
            creditor: "Bob (deleted)",
            currencyCode: "USD",
            debtor: "Charlie"
        });
    });

    test("invalid ownership surfaces Settlement incomplete and never claims everyone is settled", async ({
        page
    }) => {
        test.setTimeout(180_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        await createTransaction(page, {
            allocations: { Bob: "50", Me: "50" },
            amount: "-100.00",
            description: "Will become invalid"
        });

        await goToPeople(page);
        await expectObligation(page, {
            amountText: "$50.00",
            creditor: "Me",
            currencyCode: "USD",
            debtor: "Bob"
        });

        await test.step("break the account ownership total", async () => {
            await goToAccounts(page);
            const row = page.getByRole("row").filter({ hasText: "Default" }).first();
            await row.locator("div.w-28.text-right").click();
            const panel = row.locator("..");
            await panel.getByRole("button", { name: "Add owner" }).click();
            await panel.getByRole("button", { name: "Bob", exact: true }).click();
            // Zero out one owner so the collective total is no longer 100%.
            await panel.getByRole("spinbutton", { name: "Ownership percentage for Bob" }).fill("0");
            await panel.getByRole("spinbutton", { name: "Ownership percentage for Me" }).fill("0");
        });

        await goToPeople(page);
        await expectSettlementIncomplete(page, 1);
        await expect(page.getByText("Account ownership is invalid")).toBeVisible();
    });

    test("obligations are keyboard operable, accessible and stable across themes and widths", async ({
        page
    }) => {
        test.setTimeout(180_000);
        const health = observeBrowserHealth(page);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        const transactionId = await createTransaction(page, {
            allocations: { Bob: "50", Me: "50" },
            amount: "-100.00",
            description: "Accessible"
        });

        const personIds = await readPersonIds(page);
        const bobId = personIds.get("Bob") ?? "";
        const meId = personIds.get("Me") ?? "";
        expect(bobId).not.toBe("");
        expect(meId).not.toBe("");

        await goToPeople(page);

        await test.step("deterministic role, name and state", async () => {
            const section = currencySection(page, "USD");
            // The section is a labelled region naming its currency.
            await expect(section.getByRole("heading", { name: "USD" })).toBeVisible();

            const toggle = page
                .getByTestId(`settlement-obligation-USD:${bobId}:${meId}`)
                .getByRole("button")
                .first();
            await expect(toggle).toHaveAttribute("aria-expanded", "false");
            await expect(toggle).toHaveAccessibleName(/Bob/);
            await expect(toggle).toHaveAccessibleName(/Me/);

            // aria-controls must name the panel the toggle actually reveals, otherwise the
            // wiring is decorative. The panel only exists while expanded, so expand, assert the
            // referenced element is the revealed source list, then restore the collapsed state
            // the next step starts from.
            const controls = await toggle.getAttribute("aria-controls");
            expect(controls).not.toBeNull();
            // Matched by attribute, not `#id`: these ids embed colon-separated UUIDs, which are
            // not valid in a bare CSS id selector and make querySelectorAll throw.
            const controlled = page.locator(`[id="${controls ?? ""}"]`);
            await expect(controlled).toHaveCount(0);
            await toggle.click();
            await expect(controlled).toBeVisible();
            await expect(controlled).toHaveRole("list");
            await toggle.click();
            await expect(toggle).toHaveAttribute("aria-expanded", "false");
        });

        await test.step("keyboard-only expansion and navigation", async () => {
            const toggle = page
                .getByTestId(`settlement-obligation-USD:${bobId}:${meId}`)
                .getByRole("button")
                .first();
            await toggle.focus();
            await expect(toggle).toBeFocused();
            await page.keyboard.press("Enter");
            await expect(toggle).toHaveAttribute("aria-expanded", "true");

            const link = page
                .getByTestId(`settlement-source-${transactionId}`)
                .getByRole("link", { name: "View transaction" });
            await expect(link).toBeVisible();
            await link.focus();
            await expect(link).toBeFocused();
            await page.keyboard.press("Enter");
            await page.waitForURL(/\/transactions\?transaction=/);
            await expect(rowById(page, transactionId)).toHaveAttribute("aria-selected", "true");
        });

        await test.step("narrow viewport keeps the obligation reachable", async () => {
            await page.setViewportSize({ height: 720, width: 320 });
            await goToPeople(page);
            await expect(
                page.getByTestId(`settlement-obligation-USD:${bobId}:${meId}`)
            ).toBeVisible();
            await expect(settlementCard(page)).toContainText("$50.00");
            await page.setViewportSize({ height: 720, width: 1280 });
        });

        await test.step("dark mode and reduced motion preserve the obligation", async () => {
            await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
            await goToPeople(page);
            await expect(
                page.getByTestId(`settlement-obligation-USD:${bobId}:${meId}`)
            ).toBeVisible();
            await expect(settlementCard(page)).toContainText("$50.00");
            await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
        });

        health.assertClean();
    });
});

// ---------------------------------------------------------------------------
// "View transaction" is a one-shot navigation intent, not a standing selection override.
//
// The landing must select and reveal the source row, but from then on the row is an ordinary
// selection the user owns: deselecting it must stick, and a later bulk action must not touch it.
// ---------------------------------------------------------------------------

test.describe("View transaction deep link", () => {
    /** Deep-links to a source transaction the way the People page does and waits for the landing. */
    async function openSourceTransaction(page: Page, transactionId: string): Promise<void> {
        // A deep link is a full document load like any other, so the writes it is about to leave
        // behind have to be durable before it fires.
        await awaitVaultPersistence(page);
        await page.goto(`/transactions?transaction=${encodeURIComponent(transactionId)}`);
        await expect(rowById(page, transactionId)).toHaveAttribute("aria-selected", "true");
    }

    /** The row's selection checkbox, addressed by the row's stable transaction ID. */
    function rowCheckbox(page: Page, transactionId: string): Locator {
        return rowById(page, transactionId).getByTestId("row-checkbox");
    }

    /** The count the toolbar reports as selected, which is the set every bulk handler acts on. */
    function selectedCountLabel(page: Page): Locator {
        return page.getByTestId("transaction-table-toolbar");
    }

    test("the deep-linked row lands selected and revealed, and can then be deselected", async ({
        page
    }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        const transactionId = await createTransaction(page, {
            allocations: { Bob: "50", Me: "50" },
            amount: "-100.00",
            description: "Deep link deselect"
        });

        // Arrive the way "View transaction" does: the row is revealed, highlighted and selected.
        await openSourceTransaction(page, transactionId);
        const row = rowById(page, transactionId);
        await expect(row).toBeInViewport();
        await expect(selectedCountLabel(page)).toContainText("1 selected");

        // The landing is spent: the param is dropped so it cannot re-assert the selection.
        await expect(page).toHaveURL(/\/transactions$/);

        // Deselecting the landed row must actually deselect it.
        await rowCheckbox(page, transactionId).click();
        await expect(row).toHaveAttribute("aria-selected", "false");
        await expect(selectedCountLabel(page)).not.toContainText("selected");
        await expect(page.getByTestId("bulk-edit-toolbar")).toHaveCount(0);

        // And it stays deselected across re-renders rather than snapping back.
        await expect(row).toHaveAttribute("aria-selected", "false");
    });

    test("a bulk delete after deselecting the deep-linked row preserves it", async ({ page }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        await goToTransactions(page);
        const firstTransactionId = await addTransaction(page, {
            allocations: { Bob: "50", Me: "50" },
            amount: "-100.00",
            description: "Deep link survivor"
        });
        const secondTransactionId = await addTransaction(page, {
            amount: "-40.00",
            description: "Bulk delete target"
        });

        // Land on t1 through the deep link, then deselect it and select t2 instead.
        await openSourceTransaction(page, firstTransactionId);
        await rowCheckbox(page, firstTransactionId).click();
        await expect(rowById(page, firstTransactionId)).toHaveAttribute("aria-selected", "false");

        await rowCheckbox(page, secondTransactionId).click();
        await expect(rowById(page, secondTransactionId)).toHaveAttribute("aria-selected", "true");
        // The bulk bar reports the user's real intent: exactly one row.
        await expect(selectedCountLabel(page)).toContainText("1 selected");
        await expect(page.getByTestId("bulk-edit-toolbar")).toContainText("Edit 1");

        await page.getByTestId("bulk-delete").click();
        await page.getByTestId("bulk-delete").click();

        // Only the row the user actually selected is deleted; the deep-linked row survives.
        await expect(rowById(page, secondTransactionId)).toHaveCount(0);
        await expect(rowById(page, firstTransactionId)).toHaveCount(1);

        // The surviving transaction still explains its obligation on the People page.
        await goToPeople(page);
        await expectObligation(page, {
            amountText: "$50.00",
            creditor: "Me",
            currencyCode: "USD",
            debtor: "Bob"
        });
    });
});

// ---------------------------------------------------------------------------
// The /statuses page is the only control over which transactions settlement even looks at:
// `calculateSettlementBalances` skips every transaction whose status lacks `behavior:
// "treatAsPaid"`. This journey covers the page's full lifecycle and proves the behavior toggle
// moves real money on the People page.
// ---------------------------------------------------------------------------

test.describe("Statuses page", () => {
    test("status lifecycle: create, rename, toggle Treat as Paid and delete", async ({ page }) => {
        test.setTimeout(120_000);
        await createNewIdentity(page);
        await addPeople(page, ["Bob"]);

        await test.step("seeded statuses report their settlement behavior", async () => {
            await goToStatuses(page);

            // Only the seeded "Paid" status carries the settlement behavior.
            await expect(statusRow(page, UNPAID_STATUS_NAME)).not.toContainText(
                TREAT_AS_PAID_LABEL
            );
            await expect(statusRow(page, PAID_STATUS_NAME)).toContainText(TREAT_AS_PAID_LABEL);
        });

        await test.step("an unused status can be created and deleted again", async () => {
            await createStatus(page, { name: "Awaiting Receipt" });
            await deleteStatus(page, "Awaiting Receipt");
        });

        await test.step("create a status with no settlement behavior", async () => {
            const row = await createStatus(page, { name: "Reimbursed" });
            await expect(row).not.toContainText(TREAT_AS_PAID_LABEL);
        });

        await test.step("rename the status", async () => {
            await renameStatus(page, "Reimbursed", "Settled Up");
        });

        const transactionId =
            await test.step("a transaction on the renamed status does not qualify for settlement", async () => {
                // The rename must have reached the transaction grid's status options.
                const id = await createTransaction(page, {
                    allocations: { Bob: "50", Me: "50" },
                    amount: "-100.00",
                    description: "Statuses journey",
                    status: "Settled Up"
                });

                await goToPeople(page);
                await expectNoQualifyingTransactions(page);
                return id;
            });

        await test.step("turning on Treat as Paid produces the obligation", async () => {
            await goToStatuses(page);
            await enableTreatAsPaid(page, "Settled Up");

            await goToPeople(page);
            await expectObligation(page, {
                amountText: "$50.00",
                creditor: "Me",
                currencyCode: "USD",
                debtor: "Bob"
            });
        });

        await test.step("a status in use cannot be deleted", async () => {
            await goToStatuses(page);
            const row = statusRow(page, "Settled Up");
            await row.hover();
            await expect(row.getByTestId("delete-status-btn")).toHaveCount(0);
        });

        // Regression cover for the sentinel leak this journey originally exposed: the row editor
        // used to write the literal string "none" into a StringEnum(["treatAsPaid"]) field,
        // because only the create path translated the Radix placeholder value back to "no
        // behavior". The sentinel is now confined to BehaviorSelector, so both paths agree.
        await test.step("turning Treat as Paid back off withdraws the obligation", async () => {
            await disableTreatAsPaid(page, "Settled Up");

            await goToPeople(page);
            await expectNoQualifyingTransactions(page);

            // The transaction itself is untouched; only its status's behavior changed.
            await goToTransactions(page);
            await expect(rowById(page, transactionId)).toContainText("Settled Up");
        });
    });
});
