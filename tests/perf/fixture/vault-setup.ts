/**
 * Seeding the measured vault through the product's own UI.
 *
 * Every participant of the fixture is created the way a user creates it — the
 * accounts screen, the people screen, the tags screen, the Automations rule
 * editor, and four runs of the import flow. Nothing is written into the CRDT
 * behind the app's back, because a fixture assembled through a private seam
 * would not prove the product can hold this state.
 *
 * ORDER IS LOAD-BEARING. Field rules must exist BEFORE the imports:
 * `commitImportBatch` calls `applyFieldRulesToImport`, so rules defined first
 * enrich all 10,000 rows on the real write path with no per-row driving. Rules
 * created afterwards would leave every row bare.
 *
 * FOUR IMPORTS, NOT ONE. The import flow binds one file to one account, so four
 * files are the only way to spread 10,000 rows over four accounts. Beyond
 * realism, this is the only thing that exercises the transaction cursor's k-way
 * merge across accounts — a single-account fixture would let a merge bug through
 * silently.
 */

import type { Page } from "@playwright/test";

import {
    FIXTURE_ACCOUNTS,
    FIXTURE_FIELD_RULES,
    FIXTURE_PEOPLE,
    FIXTURE_TAGS,
    FIXTURE_TRANSACTION_COUNT,
    fixtureCsvByAccount,
    fixtureEnrichmentCounts,
    type FixtureAccount
} from "./transaction-fixture";

/**
 * The vault account each fixture account maps to.
 *
 * STATED DEVIATION: a new vault ships with one account called "Default", and
 * fixture account 0 is mapped onto it rather than renaming it to
 * "Everyday Checking". Currency (USD) matches; only the displayed name differs,
 * by 7 characters in one column of a fixed-width grid. The alternative — driving
 * the account-rename flow — adds a UI path to the seeding sequence for a
 * cosmetic gain.
 */
export const VAULT_DEFAULT_ACCOUNT_NAME = "Default";

export function vaultAccountName(fixtureAccountIndex: number): string {
    if (fixtureAccountIndex === 0) return VAULT_DEFAULT_ACCOUNT_NAME;
    const account = FIXTURE_ACCOUNTS[fixtureAccountIndex];
    if (account == null)
        throw new Error(`no fixture account at index ${String(fixtureAccountIndex)}`);
    return account.name;
}

/** Fixture accounts that must be created; index 0 already exists as "Default". */
export function accountsToCreate(): readonly (FixtureAccount & { readonly index: number })[] {
    return FIXTURE_ACCOUNTS.flatMap((account, index) =>
        index === 0 ? [] : [{ ...account, index }]
    );
}

export interface IdentityOutcome {
    readonly seconds: number;
}

/** Create a fresh identity and land on a mounted vault. */
export async function createIdentity(page: Page, baseUrl: string): Promise<IdentityOutcome> {
    const started = performance.now();
    await page.goto(`${baseUrl}/new-user`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="generate-button"]').click({ timeout: 60_000 });
    await page.waitForSelector('[data-testid="seed-phrase-word"]', { timeout: 60_000 });
    const reveal = page.getByRole("button", { name: /click to reveal/i });
    await reveal.waitFor({ state: "visible", timeout: 30_000 });
    await reveal.click();
    await page.locator('[data-testid="confirm-checkbox"]').check({ timeout: 30_000 });
    await page.locator('[data-testid="continue-button"]').click({ timeout: 30_000 });
    await page.waitForURL("**/settings", { timeout: 60_000 });
    await page.waitForFunction(
        () => localStorage.getItem("moneyflow_active_vault") != null,
        undefined,
        {
            timeout: 60_000
        }
    );
    return { seconds: (performance.now() - started) / 1000 };
}

/**
 * Durability barrier for a PRODUCTION build.
 *
 * `tests/e2e/helpers/persistence.ts` waits on `window.__moneyflowLocalPersistence`
 * — and cannot be used here, because that seam is deliberately compiled out of
 * production builds (`src/lib/sync/local-persistence-seam.ts` returns a no-op
 * install when `NODE_ENV === "production"`). Measured: it is absent on
 * `/settings` of the arm A build, and the helper fails loudly rather than
 * degrading to a no-op, exactly as its comment promises.
 *
 * So the barrier is taken one layer lower, against the artefact the seam's
 * barrier is waiting for: the `ops` rows in IndexedDB. `appendOp` writes each op
 * immediately for crash safety, downstream of encryption, so an op count that has
 * grown past its pre-write value proves the write survived encryption and reached
 * durable storage. This matters because a `page.goto` inside the encryption
 * window discards the queued update entirely — 195 runs, 50 losses, measured in
 * `specs/007-human-scratch-completion/evidence/P21/`.
 *
 * Read-only, and it never creates the database: `indexedDB.open(name)` without a
 * version would create an empty version-1 database, after which the app's own
 * `openDB(name, 1)` would skip its upgrade and find no object stores at all.
 */
async function readOpCount(page: Page): Promise<number | null> {
    const count: unknown = await page.evaluate(String.raw`(async () => {
        const databases = await indexedDB.databases();
        if (!databases.some((entry) => entry.name === "moneyflow-vault")) return null;
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open("moneyflow-vault");
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        if (!db.objectStoreNames.contains("ops")) { db.close(); return null; }
        const total = await new Promise((resolve, reject) => {
            const request = db.transaction("ops", "readonly").objectStore("ops").count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        db.close();
        return total;
    })()`);
    return typeof count === "number" ? count : null;
}

const OP_STABILITY_READS = 3;
const OP_POLL_INTERVAL_MS = 200;

/**
 * Wait until the op count has reached `minimumCount` and stopped moving.
 *
 * Growth alone is not enough for a write that produces several ops (an import
 * produces one per batched commit), and stability alone is not enough because a
 * queue that has not started yet is also stable. Both are required.
 */
async function awaitOpsDurable(
    page: Page,
    minimumCount: number,
    budgetMilliseconds = 120_000
): Promise<number> {
    const deadline = Date.now() + budgetMilliseconds;
    let stableReads = 0;
    let previous = -1;
    for (;;) {
        const count = await readOpCount(page);
        if (count == null) {
            // No vault database yet: nothing can have been queued.
            return 0;
        }
        if (count >= minimumCount) {
            stableReads = count === previous ? stableReads + 1 : 0;
            if (stableReads >= OP_STABILITY_READS) return count;
        }
        previous = count;
        if (Date.now() > deadline) {
            throw new Error(
                `IndexedDB op count stalled at ${String(count)} waiting for at least ${String(minimumCount)} durable ops. A navigation now would discard the queued write.`
            );
        }
        await new Promise((resolve) => setTimeout(resolve, OP_POLL_INTERVAL_MS));
    }
}

/** Op count now, for use as the baseline of the next `awaitOpsDurable`. */
async function opBaseline(page: Page): Promise<number> {
    return (await readOpCount(page)) ?? 0;
}

/** A full page load, with the vault's queued local writes made durable first. */
async function navigate(page: Page, baseUrl: string, path: string): Promise<void> {
    await awaitOpsDurable(page, 0);
    await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
}

/**
 * Create the three accounts the vault does not ship with, then set the currency
 * of the two that are not the vault default.
 *
 * The accounts screen adds an account with an inline row — a name and an "Add"
 * button, no currency field — so currency is a second, separate edit through the
 * row's own currency control. It has to happen BEFORE the imports: the import
 * preview formats amounts with the selected account's currency, and the fixture
 * writes JPY amounts with no fractional part.
 */
export async function createAccounts(page: Page, baseUrl: string): Promise<readonly string[]> {
    await navigate(page, baseUrl, "/accounts");
    await page.getByRole("heading", { level: 1, name: "Accounts" }).waitFor({ timeout: 30_000 });
    const created: string[] = [];
    for (const account of accountsToCreate()) {
        const baseline = await opBaseline(page);
        await page.getByRole("button", { name: /^add account$/i }).click({ timeout: 30_000 });
        const nameInput = page.getByPlaceholder("Account name");
        await nameInput.waitFor({ state: "visible", timeout: 15_000 });
        await nameInput.fill(account.name);
        await page.getByRole("button", { name: /^add$/i }).click({ timeout: 30_000 });
        await page.getByText(account.name, { exact: true }).first().waitFor({ timeout: 30_000 });
        await awaitOpsDurable(page, baseline + 1);
        created.push(account.name);
    }

    for (const account of accountsToCreate()) {
        if (account.currency === "USD") continue;
        const baseline = await opBaseline(page);
        const row = page.getByRole("row").filter({ hasText: account.name }).first();
        await row.locator('[title="Click to change currency"]').click({ timeout: 30_000 });
        await row.getByRole("combobox").click({ timeout: 15_000 });
        const search = page.getByPlaceholder("Search currencies...");
        await search.waitFor({ state: "visible", timeout: 15_000 });
        await search.fill(account.currency);
        await page
            .getByRole("button", { name: new RegExp(`^${account.currency}\\b`) })
            .first()
            .click({ timeout: 15_000 });
        // The row now shows the code without the "(default)" inheritance marker.
        await row.getByText(account.currency, { exact: true }).first().waitFor({ timeout: 30_000 });
        await awaitOpsDurable(page, baseline + 1);
    }
    return created;
}

/** Add the people whose allocation columns the grid must render. */
export async function createPeople(page: Page, baseUrl: string): Promise<readonly string[]> {
    await navigate(page, baseUrl, "/people");
    await page.getByRole("heading", { level: 1, name: "People" }).waitFor({ timeout: 30_000 });
    for (const person of FIXTURE_PEOPLE) {
        const baseline = await opBaseline(page);
        await page.getByRole("button", { name: /add person/i }).click({ timeout: 30_000 });
        const input = page.getByPlaceholder("Enter person's name");
        await input.waitFor({ state: "visible", timeout: 15_000 });
        await input.fill(person);
        await page.getByRole("button", { name: /^add$/i }).click({ timeout: 15_000 });
        await page.getByText(person, { exact: true }).first().waitFor({ timeout: 30_000 });
        await awaitOpsDurable(page, baseline + 1);
    }
    return FIXTURE_PEOPLE;
}

/** Add the tags the field rules apply. */
export async function createTags(page: Page, baseUrl: string): Promise<readonly string[]> {
    await navigate(page, baseUrl, "/tags");
    await page.getByRole("heading", { level: 1, name: "Tags" }).waitFor({ timeout: 30_000 });
    for (const tag of FIXTURE_TAGS) {
        const baseline = await opBaseline(page);
        await page.getByRole("button", { name: /add tag/i }).click({ timeout: 30_000 });
        const input = page.getByPlaceholder("Enter tag name");
        await input.waitFor({ state: "visible", timeout: 15_000 });
        await input.fill(tag);
        await page.getByRole("button", { name: /^add tag$/i }).click({ timeout: 15_000 });
        await page.getByText(tag, { exact: true }).first().waitFor({ timeout: 30_000 });
        await awaitOpsDurable(page, baseline + 1);
    }
    return FIXTURE_TAGS;
}

/**
 * Create the field rules, through the shared Automations editor.
 *
 * Allocation inputs are addressed by the person's own label, not by
 * `data-testid="rule-alloc-<personId>"`: the id is a runtime UUID, so the
 * accessible label is both stable and the thing a user actually reads.
 */
export async function createFieldRules(page: Page, baseUrl: string): Promise<number> {
    await navigate(page, baseUrl, "/automations");
    await page.getByRole("heading", { level: 1, name: "Automations" }).waitFor({ timeout: 30_000 });

    for (const rule of FIXTURE_FIELD_RULES) {
        const baseline = await opBaseline(page);
        await page.locator('[data-testid="new-rule-btn"]').click({ timeout: 30_000 });
        await page.locator('[data-testid="field-rule-editor"]').waitFor({ timeout: 30_000 });

        await page.locator('[data-testid="rule-field"]').click();
        await page
            .getByRole("option", { name: rule.field === "tags" ? "Tags" : "Person percentages" })
            .click({ timeout: 15_000 });

        await page.locator('[data-testid="rule-description"]').fill(rule.descriptionText);

        if (rule.field === "tags") {
            const group = page.getByRole("group", { name: /tags to apply/i });
            for (const tag of rule.tags) {
                await group
                    .getByRole("button", { name: tag, exact: true })
                    .click({ timeout: 15_000 });
            }
        } else {
            const grid = page.locator('[data-testid="rule-allocation-grid"]');
            await grid.waitFor({ timeout: 15_000 });
            for (const allocation of rule.allocations) {
                await grid.getByLabel(allocation.person).fill(String(allocation.percentage));
            }
        }

        await page.locator('[data-testid="rule-save"]').click({ timeout: 15_000 });
        // The saved rule appears in the active-rules list; wait for its own row
        // rather than a count, so a stale count cannot satisfy the wait.
        await page
            .locator('[data-testid="rule-list"]')
            .getByText(rule.descriptionText, { exact: false })
            .first()
            .waitFor({ timeout: 30_000 });
        await awaitOpsDurable(page, baseline + 1);
    }

    const listed = await page
        .locator('[data-testid="rule-list"]')
        .getByText(/exact description|→|:/)
        .count()
        .catch(() => 0);
    // The authoritative check is the per-rule wait above; this is only reported.
    return listed;
}

export interface ImportOutcome {
    readonly accountName: string;
    readonly commitSeconds: number;
    /**
     * Rows the preview flagged as potential duplicates of an EXISTING transaction.
     *
     * Recorded because the seeded vault's top-level row count was observed at both
     * 10,000 and 9,999 across two sessions of the same fixture, and a flagged
     * duplicate is nested under its original rather than listed. This makes the
     * detector's own count part of the artifact instead of something inferred
     * afterwards. Simulating the product's matcher over the fixture predicts ZERO
     * flags, so if this is 0 and rows still go missing, duplicate nesting is NOT
     * the explanation.
     */
    readonly duplicatesFlagged: number | null;
    readonly rowsImported: number;
    /** Grid row count once this import has propagated, from the toolbar. */
    readonly gridRowCountAfter: number | null;
}

/**
 * Import one account's CSV.
 *
 * The account is chosen explicitly on the Account tab. With four accounts in the
 * vault nothing can be inferred from a single-account default, and a wrong
 * choice would put every row on one account — the exact deficiency four imports
 * exist to remove.
 */
export async function importAccountCsv(
    page: Page,
    baseUrl: string,
    input: {
        readonly accountName: string;
        readonly csv: string;
        /** Cumulative rows expected in the grid once this import has landed. */
        readonly expectedTotalAfter: number;
        readonly expectedRows: number;
    }
): Promise<ImportOutcome> {
    await navigate(page, baseUrl, "/imports/new");
    await page.locator('input[type="file"]').setInputFiles({
        buffer: Buffer.from(input.csv, "utf8"),
        mimeType: "text/csv",
        name: `perf-fixture-${input.accountName.replaceAll(/\s+/g, "-").toLowerCase()}.csv`
    });

    const importButton = page.getByRole("button", { name: /Import [\d,]+ Transactions?/i });
    await importButton.waitFor({ state: "visible", timeout: 300_000 });
    const label = await importButton.innerText();
    const parsedRows = Number((/([\d,]+)/.exec(label)?.[1] ?? "0").replaceAll(",", ""));
    if (parsedRows !== input.expectedRows) {
        throw new Error(
            `Import of ${input.accountName} parsed ${String(parsedRows)} rows, expected ${String(input.expectedRows)}`
        );
    }

    // The preview's own duplicate count, before anything is committed.
    const duplicatesFlagged = await readDuplicateCount(page);

    await page.getByRole("tab", { name: /Account/i }).click({ timeout: 30_000 });
    await page.locator("#account-select").click({ timeout: 30_000 });
    await page
        .getByRole("option", { name: input.accountName, exact: true })
        .click({ timeout: 30_000 });

    const baseline = await opBaseline(page);
    const commitStarted = performance.now();
    await importButton.click();
    await page.waitForURL("**/transactions", { timeout: 900_000 });
    await page.waitForSelector('[data-testid="transaction-table"]', { timeout: 300_000 });
    await page.waitForFunction(
        () => document.querySelectorAll("[data-index]").length > 0,
        undefined,
        {
            timeout: 300_000
        }
    );
    // 2,500 rows is a large update to encrypt; the next import navigates away,
    // and a teardown inside that window would discard the whole batch.
    await awaitOpsDurable(page, baseline + 1, 600_000);
    // Wait for the grid to actually SHOW this import's rows before the next file is
    // parsed. The next import's duplicate detection runs against the transactions
    // the hook has at parse time, so parsing while the previous batch is still
    // propagating makes detection — and therefore the top-level row count —
    // dependent on timing. HYPOTHESIS for the 10,000-vs-9,999 variation, not yet
    // confirmed; the count is recorded either way.
    const gridRowCountAfter = await awaitGridRowCount(page, input.expectedTotalAfter);
    return {
        accountName: input.accountName,
        commitSeconds: (performance.now() - commitStarted) / 1000,
        duplicatesFlagged,
        gridRowCountAfter,
        rowsImported: parsedRows
    };
}

/**
 * The preview's "Duplicates (will be marked)" figure.
 *
 * Returns null rather than throwing when the summary is not rendered: this is
 * diagnostic evidence, and a missing panel must not fail a capture.
 */
async function readDuplicateCount(page: Page): Promise<number | null> {
    const text = await page
        .getByText(/Duplicates \(will be marked\)/i)
        .first()
        .locator("xpath=..")
        .innerText()
        .catch(() => "");
    const match = /(\d[\d,]*)/.exec(text.replace(/Duplicates \(will be marked\)/i, ""));
    return match == null ? null : Number(match[1].replaceAll(",", ""));
}

/** Read the grid's own row count from the toolbar, or null if not on the grid. */
async function readGridRowCount(page: Page): Promise<number | null> {
    const count: unknown = await page.evaluate(String.raw`(() => {
        const toolbar = document.querySelector('[data-testid="transaction-table-toolbar"]');
        if (toolbar == null) return null;
        const match = /([\d,]+)\s+transactions?/.exec(toolbar.textContent ?? "");
        return match == null ? null : Number(match[1].replace(/,/g, ""));
    })()`);
    return typeof count === "number" ? count : null;
}

/**
 * Wait until the grid reports `expected` rows, or return whatever it settled on.
 *
 * Deliberately does NOT throw on a shortfall. Whether the count converges is the
 * open question; failing the capture here would replace an answer with an abort.
 */
async function awaitGridRowCount(page: Page, expected: number): Promise<number | null> {
    const deadline = Date.now() + 60_000;
    let last: number | null = null;
    for (;;) {
        last = await readGridRowCount(page);
        if (last === expected) return last;
        if (Date.now() > deadline) return last;
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

/** Run all four imports, in fixture account order. */
export async function importAllAccounts(
    page: Page,
    baseUrl: string
): Promise<readonly ImportOutcome[]> {
    const files = fixtureCsvByAccount();
    const outcomes: ImportOutcome[] = [];
    let cumulative = 0;
    for (const [index, csv] of files.entries()) {
        const rows = csv.split("\n").length - 1;
        cumulative += rows;
        outcomes.push(
            await importAccountCsv(page, baseUrl, {
                accountName: vaultAccountName(index),
                csv,
                expectedRows: rows,
                expectedTotalAfter: cumulative
            })
        );
    }
    return outcomes;
}

export interface ImportLedger {
    /** Why the ledger is not trusted, when it is not. */
    readonly note: string | null;
    /** Per-import transaction counts as the Imports page reports them. */
    readonly perImport: readonly number[];
    readonly total: number;
    /**
     * True only when the ledger's SHAPE is what four imports of this fixture must
     * produce. A misparse must never be allowed to masquerade as data loss, so an
     * untrusted ledger is reported and ignored rather than acted on.
     */
    readonly trusted: boolean;
}

/** Plausible per-import row count, given four hash-assigned accounts of ~2,500. */
const LEDGER_ROW_RANGE = { maximum: 2_700, minimum: 2_300 } as const;

/** Validate the ledger's shape before it is allowed to claim anything. */
export function validateImportLedger(
    perImport: readonly number[],
    expectedImports: number,
    expectedTotal: number
): ImportLedger {
    const total = perImport.reduce((sum, value) => sum + value, 0);
    const shapeProblem =
        perImport.length !== expectedImports
            ? `read ${String(perImport.length)} import rows, expected ${String(expectedImports)}`
            : perImport.some(
                    (count) => count < LEDGER_ROW_RANGE.minimum || count > LEDGER_ROW_RANGE.maximum
                )
              ? `per-import counts ${perImport.join("/")} are outside the plausible ${String(LEDGER_ROW_RANGE.minimum)}-${String(LEDGER_ROW_RANGE.maximum)} range, so the wrong column was probably read`
              : total > expectedTotal
                ? `per-import counts sum to ${String(total)}, above the ${String(expectedTotal)} imported`
                : null;
    return {
        note: shapeProblem,
        perImport,
        total,
        trusted: shapeProblem == null
    };
}

/**
 * Read the Imports page's own per-import transaction counts.
 *
 * DISCRIMINATOR, not decoration. The seeded vault's top-level row count was 10,000
 * in one session and 9,999 in another on the identical fixture. If these per-import
 * counts sum to 10,000 while the grid shows 9,999, the row is present in the vault
 * and absent from the LIST — canonicalisation, filtering or duplicate nesting. If
 * they sum to 9,999, a write was lost, which is a durability finding and a much
 * more serious one. Recording both makes the next capture answer the question
 * instead of raising it again.
 */
export async function readImportLedger(page: Page, baseUrl: string): Promise<ImportLedger> {
    await navigate(page, baseUrl, "/imports");
    await page.getByRole("heading", { level: 1, name: "Imports" }).waitFor({ timeout: 30_000 });
    const counts: unknown = await page.evaluate(String.raw`(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        return rows
            .map((row) => {
                const cells = Array.from(row.querySelectorAll("td")).map((cell) =>
                    (cell.textContent ?? "").trim()
                );
                // The count column is the only purely numeric cell in the row.
                const numeric = cells.filter((text) => /^\d[\d,]*$/.test(text));
                return numeric.length === 0 ? null : Number(numeric[0].replace(/,/g, ""));
            })
            .filter((value) => value != null);
    })()`);
    const perImport = Array.isArray(counts)
        ? counts.filter((v): v is number => typeof v === "number")
        : [];
    return validateImportLedger(perImport, FIXTURE_ACCOUNTS.length, FIXTURE_TRANSACTION_COUNT);
}

export interface FixtureDomEvidence {
    /** One per active person, from the grid's own column headers. */
    readonly allocationColumnCount: number;
    readonly allocationColumnLabels: readonly string[];
    /** Distinct account names seen across the sampled rows. */
    readonly accountsSeen: readonly string[];
    /** Rows sampled while sweeping the grid. */
    readonly rowsSampled: number;
    /** Sampled rows whose tags cell showed at least one tag. */
    readonly rowsWithTags: number;
    /** Sampled rows with at least one stored explicit allocation. */
    readonly rowsWithAllocations: number;
    /** Sampled rows whose allocation matches a percentage one of the rules sets. */
    readonly rowsWithRulePercentage: number;
    /** Evidence for one specific rule: description -> tags text found. */
    readonly taggedExample: { readonly description: string; readonly tags: string } | null;
    readonly allocatedExample: {
        readonly description: string;
        readonly values: readonly string[];
    } | null;
}

/**
 * Sweep the whole grid and read what the rows actually contain.
 *
 * ASSERTS ON CONTENT, NOT ON PRESENCE. The first version of this sweep counted a
 * row as tagged whenever its tags cell held any text and as allocated whenever an
 * allocation cell held any digit. Both were true of EVERY row — the empty tags
 * cell renders the placeholder "Add tags...", and an unallocated cell carries an
 * sr-only description reading "Explicit: not stored. Effective: 0%. Owner
 * remainder: 100%." So it reported 915 of 915 rows tagged and allocated on a
 * vault where the real rate is about a quarter, and it could not have failed.
 *
 * What it checks now is the fixture's own values: a tags cell must name one of the
 * fixture's tags, and an allocation cell's own description must state an explicit
 * percentage. Both can go red.
 */
export async function readFixtureDomEvidence(page: Page): Promise<FixtureDomEvidence> {
    const evidence: unknown = await page.evaluate(
        String.raw`(async (tagNames, rulePercentages) => {
        const table = document.querySelector('[data-testid="transaction-table"]');
        if (table == null) throw new Error("transaction table not found");
        let scroller = table;
        while (scroller != null && !(scroller.scrollHeight > scroller.clientHeight + 10)) {
            scroller = scroller.parentElement;
        }
        if (scroller == null) throw new Error("scrollable ancestor not found");
        const twoFrames = () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const allocationHeaders = Array.from(scroller.querySelectorAll('[role="columnheader"]'))
            .filter((element) => (element.getAttribute("title") ?? "").endsWith("allocation percentage"));

        const accountsSeen = new Set();
        let rowsSampled = 0;
        let rowsWithTags = 0;
        let rowsWithAllocations = 0;
        let rowsWithRulePercentage = 0;
        let taggedExample = null;
        let allocatedExample = null;

        const rowDescription = (row) => {
            const cell = row.querySelector('[data-cell="description"]');
            if (cell == null) return "";
            const field = cell.querySelector("input, textarea");
            const value = field == null ? null : field.value;
            return (value != null && value.length > 0 ? value : (cell.textContent ?? "")).trim();
        };

        // Sweep the WHOLE range, not the top of it. Sampling only the first few
        // thousand pixels is how an earlier version reported rows from exactly
        // one account: the grid orders by date, and any structure that groups
        // accounts by date confines a top-of-list sweep to one of them.
        const maxOffset = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        const steps = 40;
        for (let step = 0; step < steps; step += 1) {
            for (let hold = 0; hold < 3; hold += 1) {
                scroller.scrollTop = Math.round((maxOffset * step) / (steps - 1));
                await twoFrames();
            }
            for (const row of Array.from(scroller.querySelectorAll("[data-index]"))) {
                rowsSampled += 1;
                const account = (row.querySelector('[data-cell="account"]')?.textContent ?? "").trim();
                if (account.length > 0) accountsSeen.add(account);

                // A tag is present only when the cell names one of the fixture's
                // tags. "Add tags..." is the empty state, not a tag.
                const tagsCell = row.querySelector('[data-cell="tags"]');
                const tagsText = (tagsCell?.textContent ?? "").trim();
                const namedTags = tagNames.filter((name) => tagsText.includes(name));
                if (namedTags.length > 0) {
                    rowsWithTags += 1;
                    if (taggedExample == null) {
                        taggedExample = { description: rowDescription(row), tags: namedTags.join(", ") };
                    }
                }

                // An allocation is present only when the cell's own description
                // states a stored percentage. "Explicit: not stored." is absence.
                const explicit = Array.from(row.querySelectorAll('[data-cell^="allocation:"]'))
                    .map((cell) => (cell.textContent ?? "").trim())
                    .map((text) => /Explicit:\s*(-?[\d.]+)%/.exec(text))
                    .filter((match) => match != null)
                    .map((match) => Number(match[1]));
                if (explicit.length > 0) {
                    rowsWithAllocations += 1;
                    if (explicit.some((value) => rulePercentages.includes(value))) {
                        rowsWithRulePercentage += 1;
                    }
                    if (allocatedExample == null) {
                        allocatedExample = {
                            description: rowDescription(row),
                            values: explicit.map((value) => String(value))
                        };
                    }
                }
            }
        }

        for (let attempt = 0; attempt < 45; attempt += 1) {
            scroller.scrollTop = 0;
            await twoFrames();
            if (scroller.scrollTop <= 1 && attempt >= 5) break;
        }

        return {
            accountsSeen: Array.from(accountsSeen),
            allocationColumnCount: allocationHeaders.length,
            allocationColumnLabels: allocationHeaders.map((element) => (element.textContent ?? "").trim()),
            allocatedExample,
            rowsSampled,
            rowsWithAllocations,
            rowsWithRulePercentage,
            rowsWithTags,
            taggedExample
        };
    })(${JSON.stringify([...FIXTURE_TAGS])}, ${JSON.stringify(rulePercentages())})`
    );
    if (!isFixtureDomEvidence(evidence)) {
        throw new Error("fixture DOM sweep returned an unexpected shape");
    }
    return evidence;
}

/** Every percentage any allocation rule sets, for the content check. */
function rulePercentages(): readonly number[] {
    return FIXTURE_FIELD_RULES.flatMap((rule) =>
        rule.field === "allocation"
            ? rule.allocations.map((allocation) => allocation.percentage)
            : []
    );
}

function isFixtureDomEvidence(value: unknown): value is FixtureDomEvidence {
    if (typeof value !== "object" || value == null) return false;
    const record: Record<string, unknown> = { ...value };
    return (
        typeof record.allocationColumnCount === "number" &&
        Array.isArray(record.allocationColumnLabels) &&
        Array.isArray(record.accountsSeen) &&
        typeof record.rowsSampled === "number" &&
        typeof record.rowsWithTags === "number" &&
        typeof record.rowsWithAllocations === "number" &&
        typeof record.rowsWithRulePercentage === "number"
    );
}

/**
 * Fail the run when the seeded vault is not the fixture.
 *
 * Each check names the participant it protects, because a missing participant
 * makes the whole measurement describe a different product than the one the
 * thresholds are about.
 */
export function assertFixtureDomEvidence(evidence: FixtureDomEvidence): void {
    const expectedColumns = FIXTURE_PEOPLE.length + 1; // + the vault's own "Me"
    if (evidence.allocationColumnCount !== expectedColumns) {
        throw new Error(
            `grid rendered ${String(evidence.allocationColumnCount)} allocation columns (${evidence.allocationColumnLabels.join(", ")}), expected ${String(expectedColumns)} — one per active person`
        );
    }
    if (evidence.accountsSeen.length < FIXTURE_ACCOUNTS.length) {
        throw new Error(
            `grid showed rows from ${String(evidence.accountsSeen.length)} accounts (${evidence.accountsSeen.join(", ")}), expected ${String(FIXTURE_ACCOUNTS.length)} — the cursor's cross-account merge is not being exercised`
        );
    }
    if (evidence.rowsSampled < 200) {
        throw new Error(
            `the fixture sweep only saw ${String(evidence.rowsSampled)} rows, too few to say anything about enrichment rates`
        );
    }

    const counts = fixtureEnrichmentCounts();
    if (counts.taggedRows === 0 || counts.allocatedRows === 0) {
        throw new Error("fixture field rules match no rows; the rule descriptions are wrong");
    }

    // BOTH directions. "More than zero" would pass on a single tagged row, and it
    // would also pass on the earlier bug where every row counted as tagged because
    // the empty-state placeholder matched. The rate has to land near the rate the
    // fixture's own rules imply.
    const checkRate = (label: string, observed: number, expectedMatchingRows: number): void => {
        const expectedRate = expectedMatchingRows / FIXTURE_TRANSACTION_COUNT;
        const observedRate = observed / evidence.rowsSampled;
        if (observedRate < expectedRate / 2 || observedRate > Math.min(1, expectedRate * 2)) {
            throw new Error(
                `${label}: ${String(observed)} of ${String(evidence.rowsSampled)} sampled rows (${(observedRate * 100).toFixed(1)}%), but the fixture's rules imply ${(expectedRate * 100).toFixed(1)}%. Either the rules did not fire on import, or the check is matching the wrong thing.`
            );
        }
    };
    checkRate("tagged rows", evidence.rowsWithTags, counts.taggedRows);
    checkRate("allocated rows", evidence.rowsWithAllocations, counts.allocatedRows);

    // The allocations must carry the rules' OWN percentages. A row allocated by
    // some other mechanism would satisfy the rate check but not this one.
    if (evidence.rowsWithRulePercentage === 0) {
        throw new Error(
            `${String(evidence.rowsWithAllocations)} rows carried an allocation but none matched a percentage any fixture rule sets, so the allocations did not come from the rules`
        );
    }
    if (evidence.taggedExample == null) {
        throw new Error("no sampled row named one of the fixture's tags");
    }
}
