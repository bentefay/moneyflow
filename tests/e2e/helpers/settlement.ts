/**
 * Settlement E2E Helpers
 *
 * Multi-step vault-shaping flows reused by the People-page settlement journeys. Every helper drives
 * the real production UI — people, accounts, ownership and the real virtualized transaction grid —
 * so the assertions exercise the production settlement path end to end.
 */

import { expect, type Locator, type Page } from "@playwright/test";

import { goToAccounts, goToPeople, goToTransactions } from "./nav";

/** Name of the person seeded into every new vault. */
export const DEFAULT_PERSON_NAME = "Me";
/** Name of the account seeded into every new vault. */
export const DEFAULT_ACCOUNT_NAME = "Default";
/** Seeded status carrying `behavior: "treatAsPaid"`. */
export const PAID_STATUS_NAME = "Paid";
/** Seeded default status with no settlement behavior. */
export const UNPAID_STATUS_NAME = "For Review";

export interface TransactionSpec {
    /** Account name; defaults to the seeded account. */
    readonly account?: string;
    /** Explicit allocations to enter through real grid cells, keyed by person name. */
    readonly allocations?: Readonly<Record<string, string>>;
    /** Major-unit amount string, e.g. "-100.00". */
    readonly amount: string;
    readonly description?: string;
    /** Status name; defaults to the Treat-as-Paid status. */
    readonly status?: string;
}

/** Adds a person to the vault. Assumes the People page is already open. */
export async function addPerson(page: Page, name: string): Promise<void> {
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter person's name").fill(name);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
}

/** Navigates to People and adds each named person in order. */
export async function addPeople(page: Page, names: readonly string[]): Promise<void> {
    await goToPeople(page);
    for (const name of names) await addPerson(page, name);
}

/** Locates an account row on the Accounts page by its visible name. */
export function accountRow(page: Page, name: string): Locator {
    return page.getByRole("row").filter({ hasText: name }).first();
}

/** Creates an account through the Accounts page inline add row. It inherits the vault currency. */
export async function addAccount(page: Page, name: string): Promise<void> {
    await goToAccounts(page);
    await page.getByRole("button", { name: /add account/i }).click();
    await page
        .getByPlaceholder(/account name/i)
        .last()
        .fill(name);
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
}

/** Gives an account an explicit currency through the row's currency control. */
export async function setAccountCurrency(
    page: Page,
    accountName: string,
    currencyCode: string,
    currencyName: string
): Promise<void> {
    await goToAccounts(page);
    const row = accountRow(page, accountName);
    await row.getByTitle("Click to change currency").click();
    await row.getByRole("combobox").click();
    await page.getByPlaceholder("Search currencies...").fill(currencyCode);
    await page.getByRole("button", { name: `${currencyCode} ${currencyName}` }).click();
    await expect(row).toContainText(currencyCode);
}

/**
 * Expands an account row and returns the ownership panel.
 *
 * The row's balance cell is the only always-present region that bubbles to the expand handler; the
 * name, type and currency cells all stop propagation to enter their own inline editors.
 */
export async function openOwnershipEditor(page: Page, accountName: string): Promise<Locator> {
    await goToAccounts(page);
    const row = accountRow(page, accountName);
    await row.locator("div.w-28.text-right").click();
    const panel = row.locator("..");
    await expect(panel.getByRole("heading", { name: "Ownership" })).toBeVisible();
    return panel;
}

function ownershipInput(panel: Locator, personName: string): Locator {
    return panel.getByRole("spinbutton", { name: `Ownership percentage for ${personName}` });
}

/**
 * Sets account ownership to the given whole-percentage split.
 *
 * The editor auto-scales the remaining owners whenever one value changes, so only the leading
 * owners are typed and the final owner receives the balance. Ownership persists immediately; there
 * is no separate save step.
 */
export async function setAccountOwnership(
    page: Page,
    accountName: string,
    ownership: Readonly<Record<string, number>>
): Promise<void> {
    const panel = await openOwnershipEditor(page, accountName);
    const owners = Object.keys(ownership);

    for (const owner of owners) {
        const input = ownershipInput(panel, owner);
        if ((await input.count()) > 0) continue;
        await panel.getByRole("button", { name: "Add owner" }).click();
        await panel.getByRole("button", { name: owner, exact: true }).click();
        await expect(ownershipInput(panel, owner)).toBeVisible();
    }

    // Remove any pre-existing owner the caller did not ask for. Each removal re-renders the editor
    // and invalidates the remaining handles, so the unwanted set is re-resolved every iteration.
    for (;;) {
        const labels = await panel
            .getByRole("button", { name: /as owner$/ })
            .evaluateAll((buttons) =>
                buttons.map((button) => button.getAttribute("aria-label") ?? "")
            );
        const unwanted = labels
            .map((label) => label.replace(/^Remove /, "").replace(/ as owner$/, ""))
            .find((name) => name.length > 0 && !owners.includes(name));
        if (unwanted == null) break;

        await panel.getByRole("button", { name: `Remove ${unwanted} as owner` }).click();
        await expect(ownershipInput(panel, unwanted)).toHaveCount(0);
    }

    // Typing the last owner's value would rescale the others back, so it is left to settle.
    for (const owner of owners.slice(0, -1)) {
        await ownershipInput(panel, owner).fill(String(ownership[owner]));
    }

    for (const [owner, percentage] of Object.entries(ownership)) {
        await expect(ownershipInput(panel, owner)).toHaveValue(percentage.toFixed(2));
    }
    await expect(panel).toContainText("Total: 100.00%");
}

/**
 * Whichever row currently holds the caret in its description, if any.
 *
 * Add deliberately does not touch selection (UR-001), so this is how a user identifies the row they
 * just created. It is a locator over *transient* state, though: focus is not monotonic the way a
 * row count is, so a match can appear and disappear again. Use it to assert focus, not to
 * synchronise on it — {@link addEmptyTransaction} does the synchronising.
 */
export function newlyAddedRow(page: Page): Locator {
    return page.locator('[data-transaction-id]:has([data-testid="description-editable"]:focus)');
}

/** IDs of every currently selected row, in row order. */
export async function readSelectedRowIds(page: Page): Promise<string[]> {
    return page
        .locator('[data-transaction-id][aria-selected="true"]')
        .evaluateAll((elements) =>
            elements.map((element) => element.getAttribute("data-transaction-id") ?? "")
        );
}

/** Locates a transaction row by its stable transaction ID. */
export function rowById(page: Page, transactionId: string): Locator {
    return page.locator(`[data-transaction-id="${transactionId}"]`);
}

/**
 * Sets one allocation through a real grid cell and waits for the *stored* value to commit.
 *
 * The barrier asserts the cell's `Explicit:` clause rather than a substring of the whole cell,
 * because the cell renders a screen-reader description as a child of the same button:
 * `Explicit: X%. Effective: Y%. Owner remainder: Z%.` A substring match on `${value}%` is therefore
 * satisfied by the *derived* `Effective:` or `Owner remainder:` figures — which, for an even
 * ownership split, already read the target value before anything is stored at all. Such a barrier
 * can return without the write having landed, and the failure then surfaces at whatever settlement
 * assertion runs next, far from its cause.
 *
 * The `Explicit:` clause is the only part of the cell that reflects stored state. Entering zero is
 * the one case where the stored outcome is not the typed value: `setTransactionAllocation` treats
 * zero as removal at the CRDT boundary (`src/lib/crdt/allocations.ts:294-303` deletes the key), so
 * the committed cell reads `Explicit: not stored.` rather than `Explicit: 0%.`. Negatives store
 * normally and render `Explicit: -20%.` verbatim.
 */
export async function setAllocation(
    row: Locator,
    personName: string,
    value: string
): Promise<void> {
    const cell = row.getByRole("button", { name: `Edit ${personName} allocation` });
    await cell.click();
    const input = row.getByRole("textbox", { name: `${personName} allocation percentage` });
    await input.fill(value);
    await input.press("Enter");
    const committedExplicit =
        Number(value) === 0 ? "Explicit: not stored." : `Explicit: ${value}%.`;
    await expect(cell).toContainText(committedExplicit);
}

/** Sets a transaction's status by name through the real inline status control. */
export async function setStatus(page: Page, row: Locator, statusName: string): Promise<void> {
    const status = row.getByTestId("status-editable");
    await status.click();
    await page.getByRole("option", { name: statusName, exact: true }).click();
    await expect(status).toContainText(statusName);
}

/**
 * Attribute on `<html>` holding the stable ID latched by {@link latchNextDescriptionFocus}.
 *
 * `<html>` is outside React's tree, so no re-render can clear it. The name is namespaced to the
 * harness so it cannot collide with a product attribute.
 */
const LATCHED_ROW_ATTRIBUTE = "data-e2e-latched-description-focus";

/**
 * Arms a one-shot listener that records the next row to take description focus.
 *
 * Focus is *transient* state: a locator built on `:focus` is true only while the caret is still
 * there, so it can settle and then un-settle if a later commit remounts the input or the
 * virtualizer recycles the row. Waiting on such a locator is therefore not a converging wait — it
 * can resolve to zero forever, which is exactly the load-dependent failure recorded against the
 * previous version of {@link addEmptyTransaction}.
 *
 * `focusin` is the fix, for two independent reasons. It is delivered by the event loop rather than
 * sampled, so a focus that lands and moves on between two samples cannot be missed; and writing the
 * ID to an attribute converts that instant into monotonic state, which only ever goes from absent
 * to present. The caller can then wait for it with an ordinary converging wait.
 */
async function latchNextDescriptionFocus(page: Page): Promise<void> {
    await page.evaluate((attribute) => {
        document.documentElement.removeAttribute(attribute);

        // Only a row that does not exist yet can be the one Add is about to create. Ignoring the
        // rows already on screen means a caret returning to the row the caller was previously
        // editing — which a commit-driven remount can do — cannot be mistaken for the new row.
        const preExistingRowIds = new Set(
            Array.from(document.querySelectorAll("[data-transaction-id]"), (row) =>
                row.getAttribute("data-transaction-id")
            )
        );

        const latch = (event: FocusEvent) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            if (target.getAttribute("data-testid") !== "description-editable") return;
            const rowId = target
                .closest("[data-transaction-id]")
                ?.getAttribute("data-transaction-id");
            if (rowId == null || rowId.length === 0 || preExistingRowIds.has(rowId)) return;
            document.documentElement.setAttribute(attribute, rowId);
            document.removeEventListener("focusin", latch);
        };
        document.addEventListener("focusin", latch);
    }, LATCHED_ROW_ATTRIBUTE);
}

/**
 * Clicks Add and returns the stable ID of the row it creates.
 *
 * The row is identified by the caret Add puts in it, because UR-001 deliberately leaves selection
 * alone and focus is the only thing distinguishing the new row from its siblings. Identification
 * and synchronisation are separated, though: the caret is captured the instant it lands, and
 * everything after that waits on the row's stable `data-transaction-id`, which is monotonic.
 *
 * This helper does not assert that focus is still in the new row when it returns. That is UR-001
 * behaviour rather than a precondition for creating a row, and asserting it here would put a
 * transient-state assertion in the path of every Add-based test. It is asserted where it belongs:
 * in the UR-001 specs that own the behaviour, and in the `add-transaction-focus*` unit tests.
 */
export async function addEmptyTransaction(page: Page): Promise<string> {
    await latchNextDescriptionFocus(page);
    await page.getByTestId("add-transaction-button").click();

    // Sized like the sibling waits on `helpers/auth.ts:32`: Add resets the filters, extends the
    // displayed page, mounts the row through the virtualizer and scrolls to it before the caret can
    // land, and under full-suite parallel load that chain can exceed the 5s default. This is a
    // ceiling on a latch that never un-sets, not a sleep and not a retry.
    const latched = await page.waitForFunction(
        (attribute) => document.documentElement.getAttribute(attribute),
        LATCHED_ROW_ATTRIBUTE,
        { timeout: 15_000 }
    );
    const transactionId = await latched.jsonValue();
    await latched.dispose();
    if (transactionId == null || transactionId.length === 0) {
        throw new Error("Add did not focus a description belonging to a row with a stable ID");
    }

    // The row's own presence is the monotonic signal every caller actually depends on: they address
    // it by this ID from here on, so it must be mounted before they do.
    await expect(rowById(page, transactionId)).toHaveCount(1, { timeout: 15_000 });
    return transactionId;
}

/**
 * Creates a transaction through the real grid and returns its stable ID.
 *
 * Assumes the Transactions page is open. Allocation entry, status and amount all go through the
 * production controls so the resulting vault state is exactly what a user would produce.
 */
export async function addTransaction(page: Page, spec: TransactionSpec): Promise<string> {
    const transactionId = await addEmptyTransaction(page);
    // The focused-row locator stops matching the moment a field is committed and focus moves on, so
    // every later step addresses the row by its stable ID instead.
    const row = rowById(page, transactionId);

    if (spec.account != null) {
        const account = row.locator('[data-cell="account"]').getByRole("combobox");
        await account.click();
        await page.getByRole("option", { name: spec.account, exact: true }).click();
        await expect(account).toContainText(spec.account);
    }

    if (spec.description != null) {
        const description = row.getByTestId("description-editable");
        await description.click();
        await description.fill(spec.description);
        await description.press("Enter");
        // Committing re-sorts the grid and remounts the row, which detaches every element handle
        // inside it. Settling on the committed value here means the next field is addressed against
        // the post-commit DOM rather than racing the remount.
        await expect(description).toHaveValue(spec.description);
    }

    const amount = row.getByTestId("amount-editable");
    await amount.click();
    await amount.fill(spec.amount);
    await amount.press("Enter");
    await expect(amount).toHaveValue(spec.amount);

    await setStatus(page, row, spec.status ?? PAID_STATUS_NAME);

    for (const [personName, value] of Object.entries(spec.allocations ?? {})) {
        await setAllocation(row, personName, value);
    }

    return transactionId;
}

/** Navigates to Transactions and creates a transaction, returning its stable ID. */
export async function createTransaction(page: Page, spec: TransactionSpec): Promise<string> {
    await goToTransactions(page);
    return addTransaction(page, spec);
}

// ---------------------------------------------------------------------------
// People-page settlement assertions
// ---------------------------------------------------------------------------

/** The settlement card, in whichever state it is currently rendering. */
export function settlementCard(page: Page): Locator {
    return page.getByTestId("settlement-summary");
}

/** A per-currency settlement section. Asserting its absence proves no cross-currency mixing. */
export function currencySection(page: Page, currencyCode: string): Locator {
    return page.getByTestId(`settlement-currency-section-${currencyCode}`);
}

/** One obligation row, keyed by currency and the two stable person IDs. */
export function obligationRow(
    page: Page,
    currencyCode: string,
    debtorPersonId: string,
    creditorPersonId: string
): Locator {
    return page.getByTestId(
        `settlement-obligation-${currencyCode}:${debtorPersonId}:${creditorPersonId}`
    );
}

/** Resolves a person's stable CRDT ID from the People page allocation column it produces. */
export async function readPersonIds(page: Page): Promise<ReadonlyMap<string, string>> {
    await goToTransactions(page);
    const ids = new Map<string, string>();
    for (const cell of await page.locator("[data-presence-field^='allocation:']").all()) {
        const field = (await cell.getAttribute("data-presence-field")) ?? "";
        const label = (await cell.getAttribute("aria-label")) ?? "";
        const name = label.replace(/^Edit /, "").replace(/ allocation$/, "");
        const personId = field.replace(/^allocation:/, "");
        if (name.length > 0 && personId.length > 0) ids.set(name, personId);
    }
    return ids;
}

/**
 * Asserts a single obligation "debtor owes creditor amount" in one currency section.
 *
 * Matches on the rendered debtor/creditor names and the formatted positive amount, and returns the
 * obligation row so callers can expand it.
 */
export async function expectObligation(
    page: Page,
    options: {
        readonly amountText: string;
        readonly creditor: string;
        readonly currencyCode: string;
        readonly debtor: string;
    }
): Promise<Locator> {
    const section = currencySection(page, options.currencyCode);
    await expect(section).toBeVisible();
    const row = section
        .locator("[data-testid^='settlement-obligation-']")
        .filter({ hasText: options.debtor })
        .filter({ hasText: options.creditor })
        .filter({ hasText: options.amountText })
        .first();
    await expect(row).toBeVisible();
    return row;
}

/** Expands an obligation and returns its source-transaction list. */
export async function expandObligation(row: Locator): Promise<Locator> {
    const toggle = row.getByRole("button").first();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    return row.getByRole("list");
}

/** Asserts the People page claims no obligations exist because nothing qualifies yet. */
export async function expectNoQualifyingTransactions(page: Page): Promise<void> {
    await expect(page.getByTestId("settlement-no-qualifying")).toBeVisible();
    await expect(page.getByTestId("settlement-settled")).toHaveCount(0);
}

/** Asserts the everyone-settled state, which requires zero obligations AND zero issues. */
export async function expectEveryoneSettled(page: Page): Promise<void> {
    await expect(page.getByTestId("settlement-settled")).toBeVisible();
    await expect(page.getByTestId("settlement-no-qualifying")).toHaveCount(0);
    await expect(page.getByText("Settlement incomplete")).toHaveCount(0);
}

/** Asserts the prominent incomplete state and its affected-transaction count. */
export async function expectSettlementIncomplete(
    page: Page,
    affectedTransactionCount: number
): Promise<void> {
    await expect(page.getByText("Settlement incomplete")).toBeVisible();
    await expect(page.getByTestId("settlement-incomplete-count")).toContainText(
        String(affectedTransactionCount)
    );
    await expect(page.getByTestId("settlement-settled")).toHaveCount(0);
}
