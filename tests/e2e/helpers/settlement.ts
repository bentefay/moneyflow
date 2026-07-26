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

/** The row created most recently by {@link addTransaction}, which is left selected. */
export function selectedRow(page: Page): Locator {
    return page.getByRole("row", { selected: true });
}

/** Locates a transaction row by its stable transaction ID. */
export function rowById(page: Page, transactionId: string): Locator {
    return page.locator(`[data-transaction-id="${transactionId}"]`);
}

/** Reads the stable transaction ID from a row. */
export async function readTransactionId(row: Locator): Promise<string> {
    const id = await row.getAttribute("data-transaction-id");
    expect(id).toBeTruthy();
    return id ?? "";
}

/** Sets one allocation through a real grid cell and waits for the committed display value. */
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
    await expect(cell).toContainText(`${value}%`);
}

/** Sets a transaction's status by name through the real inline status control. */
export async function setStatus(page: Page, row: Locator, statusName: string): Promise<void> {
    const status = row.getByTestId("status-editable");
    await status.click();
    await page.getByRole("option", { name: statusName, exact: true }).click();
    await expect(status).toContainText(statusName);
}

/**
 * Creates a transaction through the real grid and returns its stable ID.
 *
 * Assumes the Transactions page is open. Allocation entry, status and amount all go through the
 * production controls so the resulting vault state is exactly what a user would produce.
 */
export async function addTransaction(page: Page, spec: TransactionSpec): Promise<string> {
    await page.getByTestId("add-transaction-button").click();
    const row = selectedRow(page);
    await expect(row).toBeVisible();
    const transactionId = await readTransactionId(row);

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
