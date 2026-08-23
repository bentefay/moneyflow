/**
 * The deterministic 10,000-transaction fixture.
 *
 * DETERMINISM. No clock, no `Math.random`, no locale-dependent formatting.
 * Every per-row choice is derived from `sha256(FIXTURE_SEED || rowIndex)`, so
 * the fixture is byte-identical on every run and on every machine, and
 * `fixtureDigest()` proves it.
 *
 * VARIETY. The fixture exists to stress the grid, so it deliberately spans the
 * cases that make rows expensive or unequal in height:
 *   - four accounts, so the CRDT's account->year->month->day tree has breadth;
 *   - dates spread across 8 years, every month and a spread of days, so the
 *     tree is deep and the day buckets are small;
 *   - descriptions of very different lengths, including a 300-character one and
 *     non-ASCII text, so text measurement and wrapping vary per row;
 *   - a small set of descriptions repeated many times, which is what the
 *     description-alias feature keys on;
 *   - amounts spanning six orders of magnitude and both signs.
 *
 * Notes, tags and allocations are NOT part of the CSV, because the product's
 * import path writes `notes: ""`, `tagIds: []` and `allocations: {}` for every
 * row (see `src/lib/crdt/import-commit.ts`).
 *
 * Tags and allocations arrive through the product's own field-rule engine
 * instead: `commitImportBatch` calls `applyFieldRulesToImport`, so rules defined
 * BEFORE an import enrich every matching row on the real write path. See
 * `FIXTURE_FIELD_RULES` and `fixtureEnrichmentCounts()`, which computes exactly
 * how many rows each rule will touch so the report can state a measured number
 * rather than an estimate. Notes still have no bulk product path and are typed
 * row by row through the grid — see `enrichmentPlan()`.
 */

import { createHash } from "node:crypto";

export const FIXTURE_SEED = "moneyflow/015-transaction-grid-tanstack/fixture-v1";
export const FIXTURE_TRANSACTION_COUNT = 10_000;

export interface FixtureAccount {
    readonly currency: string;
    readonly name: string;
}

export const FIXTURE_ACCOUNTS: readonly FixtureAccount[] = [
    { currency: "USD", name: "Everyday Checking" },
    { currency: "USD", name: "Travel Rewards Card" },
    { currency: "EUR", name: "Berlin Savings" },
    { currency: "JPY", name: "Tokyo Cash" }
];

export interface FixtureTransaction {
    readonly accountIndex: number;
    /** Minor units, signed. */
    readonly amountMinorUnits: number;
    /** ISO `YYYY-MM-DD`. */
    readonly date: string;
    readonly description: string;
    readonly rowIndex: number;
}

/**
 * Deterministic bytes for a row. SHA-256 is used as a counter-mode PRNG: it is
 * an established primitive with no hidden state, so the nth value never depends
 * on how many values were drawn before it.
 */
function rowBytes(rowIndex: number): Buffer {
    return createHash("sha256")
        .update(`${FIXTURE_SEED}#${String(rowIndex)}`)
        .digest();
}

/**
 * Which account a row belongs to.
 *
 * DRAWN FROM ITS OWN HASH, and that is the point. The obvious
 * `rowIndex % FIXTURE_ACCOUNTS.length` was measured to be perfectly correlated
 * with the year, because the year came from `rowIndex % 8`: every row in 2026 was
 * account 3, every row in 2025 account 2, and so on. The grid orders rows by date
 * across all accounts, so the seeded vault presented 1,250 consecutive Tokyo Cash
 * rows, then 1,250 Berlin Savings rows — DOM-verified, the fixture check saw rows
 * from exactly one account. A cursor merging accounts in date order would then
 * have had to merge only at 7 year boundaries in a 10,000-row list, which is not
 * a test of a k-way merge at all.
 *
 * A separate hash makes the account independent of year, month AND day, so rows
 * adjacent in date order usually come from different accounts. The cost is that
 * the four accounts hold approximately, not exactly, 2,500 rows each; the actual
 * counts are asserted in the fixture test and reported in the freeze evidence.
 * Real accounts do not hold identical row counts either.
 */
function accountIndexFor(rowIndex: number): number {
    const bytes = createHash("sha256")
        .update(`${FIXTURE_SEED}#account#${String(rowIndex)}`)
        .digest();
    return bytes.readUInt32BE(0) % FIXTURE_ACCOUNTS.length;
}

/** Unsigned integer from a byte window, for indexing into choice tables. */
function pick(bytes: Buffer, offset: number, modulus: number): number {
    return bytes.readUInt32BE(offset % 28) % modulus;
}

/** Descriptions repeated across many rows, which the alias feature groups. */
const RECURRING_DESCRIPTIONS: readonly string[] = [
    "AMZN Mktp US*2Z4KL",
    "SQ *BLUE BOTTLE COFFEE",
    "TFL TRAVEL CHARGE",
    "Netflix.com",
    "SAFEWAY #1234",
    "Shell Oil 574839201",
    "UBER *TRIP HELP.UBER.CO",
    "WHOLEFDS LON 10233"
];

/** One-off descriptions chosen to vary text cost per row. */
const DISTINCTIVE_DESCRIPTIONS: readonly string[] = [
    "Café 東京 — quoted merchant, branch 17",
    "Rent",
    "München Stadtwerke Energieabrechnung Jahresausgleich 2024",
    "ATM WITHDRAWAL",
    "Płatność kartą — sklep spożywczy",
    "Consulting invoice 2024-0417, milestone 3 of 5, net 30 terms as agreed in the master services agreement dated the fourteenth of January, including the agreed travel reimbursement and the pro-rated support retainer for the quarter",
    "Refund: order #88-2910447-1123",
    "健康保険料"
];

/**
 * Dates are spread by walking a fixed stride through an 8-year window rather
 * than drawing randomly, so every month is populated and the day buckets stay
 * small — the shape that makes the CRDT tree deep.
 */
function fixtureDate(rowIndex: number, bytes: Buffer): string {
    const year = 2019 + (rowIndex % 8);
    const month = 1 + (Math.floor(rowIndex / 8) % 12);
    // 28 keeps every month valid without a calendar dependency.
    const day = 1 + pick(bytes, 4, 28);
    const pad = (value: number, width: number) => String(value).padStart(width, "0");
    return `${String(year)}-${pad(month, 2)}-${pad(day, 2)}`;
}

function fixtureDescription(rowIndex: number, bytes: Buffer): string {
    // 70% recurring so alias grouping has real mass; 30% distinctive.
    return pick(bytes, 8, 10) < 7
        ? (RECURRING_DESCRIPTIONS[pick(bytes, 12, RECURRING_DESCRIPTIONS.length)] ?? "Unknown")
        : (DISTINCTIVE_DESCRIPTIONS[pick(bytes, 16, DISTINCTIVE_DESCRIPTIONS.length)] ?? "Unknown");
}

function fixtureAmountMinorUnits(bytes: Buffer): number {
    // Six orders of magnitude, mostly small debits, occasional large credits.
    const magnitude =
        pick(bytes, 20, 100) < 90 ? pick(bytes, 24, 20_000) : pick(bytes, 24, 5_000_000);
    const negative = pick(bytes, 0, 10) < 8;
    return negative ? -magnitude : magnitude;
}

export function fixtureTransaction(rowIndex: number): FixtureTransaction {
    const bytes = rowBytes(rowIndex);
    return {
        accountIndex: accountIndexFor(rowIndex),
        amountMinorUnits: fixtureAmountMinorUnits(bytes),
        date: fixtureDate(rowIndex, bytes),
        description: fixtureDescription(rowIndex, bytes),
        rowIndex
    };
}

export function fixtureTransactions(): readonly FixtureTransaction[] {
    return Array.from({ length: FIXTURE_TRANSACTION_COUNT }, (_unused, index) =>
        fixtureTransaction(index)
    );
}

// ---------------------------------------------------------------------------
// CSV serialisation — the product's bulk-import format (`Date,Description,Amount`)
// ---------------------------------------------------------------------------

/** Minor units to a plain decimal string. No locale, no `Intl`, no rounding drift. */
export function formatAmount(amountMinorUnits: number, currency: string): string {
    // JPY has no minor unit; every other fixture currency has two.
    const exponent = currency === "JPY" ? 0 : 2;
    if (exponent === 0) return String(amountMinorUnits);
    const negative = amountMinorUnits < 0;
    const absolute = Math.abs(amountMinorUnits);
    const whole = Math.floor(absolute / 100);
    const fraction = String(absolute % 100).padStart(2, "0");
    return `${negative ? "-" : ""}${String(whole)}.${fraction}`;
}

function csvField(value: string): string {
    return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * One CSV per account, because the import flow binds a file to a single
 * account. Returned in `FIXTURE_ACCOUNTS` order.
 */
export function fixtureCsvByAccount(): readonly string[] {
    const rowsByAccount = FIXTURE_ACCOUNTS.map((): string[] => []);
    for (const transaction of fixtureTransactions()) {
        const account = FIXTURE_ACCOUNTS[transaction.accountIndex];
        const rows = rowsByAccount[transaction.accountIndex];
        if (account == null || rows == null) continue;
        rows.push(
            [
                transaction.date,
                csvField(transaction.description),
                formatAmount(transaction.amountMinorUnits, account.currency)
            ].join(",")
        );
    }
    return rowsByAccount.map((rows) => ["Date,Description,Amount", ...rows].join("\n"));
}

// ---------------------------------------------------------------------------
// Digests
// ---------------------------------------------------------------------------

/**
 * SHA-256 of the fixture DEFINITION — what this file says the data should be.
 * Changing any generator input changes this hash, so a report can name the
 * exact fixture it measured.
 */
export function fixtureDigest(): string {
    const hash = createHash("sha256");
    hash.update(`${FIXTURE_SEED}|${String(FIXTURE_TRANSACTION_COUNT)}`);
    for (const account of FIXTURE_ACCOUNTS) hash.update(`|${account.name}:${account.currency}`);
    for (const transaction of fixtureTransactions()) {
        hash.update(
            `|${String(transaction.rowIndex)},${transaction.date},${transaction.description},${String(transaction.amountMinorUnits)},${String(transaction.accountIndex)}`
        );
    }
    return hash.digest("hex");
}

/** SHA-256 of the exact CSV bytes handed to the import flow. */
export function fixtureCsvDigest(): string {
    const hash = createHash("sha256");
    for (const csv of fixtureCsvByAccount()) hash.update(csv).update(" ");
    return hash.digest("hex");
}

// ---------------------------------------------------------------------------
// Post-import enrichment
// ---------------------------------------------------------------------------

/**
 * People added to the vault, on top of the default person the vault ships with
 * (`DEFAULT_PERSON`, "Me").
 *
 * These are load-bearing for the grid's WIDTH, not just its content: allocation
 * columns are materialised from `activePeople` (`buildAllocationColumnModel`),
 * one column per active person, so a vault with only "Me" renders a materially
 * narrower grid than the product does. Three people = three allocation columns.
 */
export const FIXTURE_PEOPLE: readonly string[] = ["Alex Rivera", "Priya Raman"];

/** The default person every vault starts with, for the column-count assertion. */
export const FIXTURE_DEFAULT_PERSON_NAME = "Me";

export const FIXTURE_TAGS: readonly string[] = ["Groceries", "Transport", "Subscriptions"];

/**
 * A field rule as the fixture defines it, in the same shape the Automations
 * editor collects: one field, one exact description, no amount or account
 * constraint.
 */
export type FixtureFieldRule =
    | {
          /** Percentage per person NAME; resolved to ids by the setup driver. */
          readonly allocations: readonly { readonly percentage: number; readonly person: string }[];
          readonly descriptionText: string;
          readonly field: "allocation";
      }
    | {
          readonly descriptionText: string;
          readonly field: "tags";
          readonly tags: readonly string[];
      };

/**
 * Rules applied to every import, keyed on descriptions the fixture repeats often
 * so each rule reaches a large, deterministic subset of rows.
 *
 * The exact row counts are computed, not estimated — see
 * `fixtureEnrichmentCounts()`. Composition rationale is in
 * `specs/015-transaction-grid-tanstack/evidence/freeze/fixture-composition.md`.
 */
export const FIXTURE_FIELD_RULES: readonly FixtureFieldRule[] = [
    { descriptionText: "SAFEWAY #1234", field: "tags", tags: ["Groceries"] },
    // Two tags on one rule, so some rows render more than one tag chip.
    { descriptionText: "TFL TRAVEL CHARGE", field: "tags", tags: ["Transport", "Subscriptions"] },
    { descriptionText: "Netflix.com", field: "tags", tags: ["Subscriptions"] },
    {
        allocations: [
            { percentage: 40, person: "Alex Rivera" },
            { percentage: 25, person: "Priya Raman" }
        ],
        descriptionText: "AMZN Mktp US*2Z4KL",
        field: "allocation"
    },
    {
        allocations: [{ percentage: 50, person: "Priya Raman" }],
        descriptionText: "SQ *BLUE BOTTLE COFFEE",
        field: "allocation"
    }
];

export interface FixtureEnrichmentCounts {
    /** Rows receiving at least one allocation, and the per-rule breakdown. */
    readonly allocatedRows: number;
    readonly allocatedRowsByDescription: readonly (readonly [string, number])[];
    /** Rows receiving at least one tag, and the per-rule breakdown. */
    readonly taggedRows: number;
    readonly taggedRowsByDescription: readonly (readonly [string, number])[];
}

/**
 * How many rows `FIXTURE_FIELD_RULES` will actually enrich.
 *
 * Derived from the fixture's own descriptions, so it is the count the seeded
 * vault must exhibit. The DOM check in the setup driver compares against it
 * rather than assuming the rules fired.
 */
export function fixtureEnrichmentCounts(): FixtureEnrichmentCounts {
    const transactions = fixtureTransactions();
    const countFor = (descriptionText: string): number =>
        transactions.filter((transaction) => transaction.description === descriptionText).length;

    const taggedRowsByDescription = FIXTURE_FIELD_RULES.filter((rule) => rule.field === "tags").map(
        (rule): readonly [string, number] => [rule.descriptionText, countFor(rule.descriptionText)]
    );
    const allocatedRowsByDescription = FIXTURE_FIELD_RULES.filter(
        (rule) => rule.field === "allocation"
    ).map((rule): readonly [string, number] => [
        rule.descriptionText,
        countFor(rule.descriptionText)
    ]);

    const sum = (entries: readonly (readonly [string, number])[]): number =>
        entries.reduce((total, [, count]) => total + count, 0);

    return {
        allocatedRows: sum(allocatedRowsByDescription),
        allocatedRowsByDescription,
        taggedRows: sum(taggedRowsByDescription),
        taggedRowsByDescription
    };
}

export interface EnrichmentPlan {
    /**
     * Grid positions that receive a note and are left expanded, with the note
     * text. These are the only variable-height rows in the fixture.
     *
     * `rowIndex` is a position in the grid's row list (`data-index`), NOT a
     * fixture row index: the grid orders rows by date across all four accounts,
     * so the two numberings differ. The plan is applied by position, which is
     * what makes it a 1-in-20 spread across the whole scroll range.
     */
    readonly notedRows: readonly { readonly note: string; readonly rowIndex: number }[];
}

const NOTE_TEXTS: readonly string[] = [
    "Split with flatmates, settle at month end.",
    "Reimbursable — attach receipt before the quarter closes, and remember that finance rejected the previous submission because the merchant name did not match the card statement.",
    "Check this one."
];

/**
 * Which grid positions get a note and stay expanded.
 *
 * Tags and allocations are NOT here: they arrive through `FIXTURE_FIELD_RULES`
 * on the product's own import path. Notes have no bulk product path — nothing
 * writes a note for many rows at once, and nothing auto-expands a row because it
 * has one — so they are typed through the grid's real notes editor one row at a
 * time, which is why this is a ~480-row subset rather than all 10,000.
 */
export function enrichmentPlan(): EnrichmentPlan {
    const notedRows: { readonly note: string; readonly rowIndex: number }[] = [];
    for (let rowIndex = 0; rowIndex < FIXTURE_TRANSACTION_COUNT; rowIndex += 1) {
        const bytes = rowBytes(rowIndex);
        if (pick(bytes, 0, 20) === 0) {
            notedRows.push({
                note: NOTE_TEXTS[pick(bytes, 4, NOTE_TEXTS.length)] ?? "Check this one.",
                rowIndex
            });
        }
    }
    return { notedRows };
}

/**
 * SHA-256 of the ENRICHMENT definition — people, tags, field rules and the notes
 * plan.
 *
 * Separate from `fixtureDigest()` on purpose: the 10,000 transactions are
 * unchanged by adding people or rules, so the transaction digest alone would not
 * distinguish a vault with allocation columns from one without. A report names
 * both.
 */
export function fixtureEnrichmentDigest(): string {
    const hash = createHash("sha256");
    hash.update(`${FIXTURE_SEED}|enrichment-v1`);
    for (const person of FIXTURE_PEOPLE) hash.update(`|person:${person}`);
    for (const tag of FIXTURE_TAGS) hash.update(`|tag:${tag}`);
    for (const rule of FIXTURE_FIELD_RULES) {
        hash.update(`|rule:${rule.field}:${rule.descriptionText}`);
        if (rule.field === "tags") {
            for (const tag of rule.tags) hash.update(`:${tag}`);
        } else {
            for (const allocation of rule.allocations) {
                hash.update(`:${allocation.person}=${String(allocation.percentage)}`);
            }
        }
    }
    for (const row of enrichmentPlan().notedRows) {
        hash.update(`|note:${String(row.rowIndex)}:${row.note}`);
    }
    return hash.digest("hex");
}
