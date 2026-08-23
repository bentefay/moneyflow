import { describe, expect, it } from "vitest";

import {
    enrichmentPlan,
    FIXTURE_ACCOUNTS,
    FIXTURE_FIELD_RULES,
    FIXTURE_PEOPLE,
    FIXTURE_TAGS,
    FIXTURE_TRANSACTION_COUNT,
    fixtureCsvByAccount,
    fixtureCsvDigest,
    fixtureDigest,
    fixtureEnrichmentCounts,
    fixtureEnrichmentDigest,
    fixtureTransaction,
    fixtureTransactions,
    formatAmount
} from "./transaction-fixture";
import { validateImportLedger } from "./vault-setup";

describe("fixture determinism", () => {
    it("produces exactly 10,000 transactions", () => {
        expect(fixtureTransactions()).toHaveLength(FIXTURE_TRANSACTION_COUNT);
    });

    it("produces the same bytes on every call", () => {
        expect(fixtureDigest()).toBe(fixtureDigest());
        expect(fixtureCsvDigest()).toBe(fixtureCsvDigest());
    });

    it("derives each row independently of draw order", () => {
        // Counter-mode hashing, not a stateful PRNG: row 9,999 is the same
        // whether or not rows 0-9,998 were generated first.
        const direct = fixtureTransaction(9_999);
        expect(fixtureTransactions()[9_999]).toEqual(direct);
    });

    it("pins the fixture digest so a silent generator change is a failing test", () => {
        // Regenerate deliberately if the fixture definition is intended to change.
        expect(fixtureDigest()).toBe(
            "55ad36c8a81fd67c72887642dfcb11803c93cfb1f18f4e9cd8467e6c0543af90"
        );
    });
});

describe("fixture variety", () => {
    const transactions = fixtureTransactions();

    it("spans all four accounts about evenly", () => {
        const perAccount = FIXTURE_ACCOUNTS.map(
            (_unused, index) => transactions.filter((t) => t.accountIndex === index).length
        );
        expect(perAccount.reduce((total, count) => total + count, 0)).toBe(
            FIXTURE_TRANSACTION_COUNT
        );
        // Drawn from a hash rather than round-robin, so approximately even. The
        // reason is in `accountIndexFor`: round-robin was correlated with the year.
        for (const count of perAccount) {
            expect(count).toBeGreaterThan(2350);
            expect(count).toBeLessThan(2650);
        }
    });

    it("puts every account in every year, so the date order is not account-ordered", () => {
        // The defect this replaces: account 3 held only 2022 and 2026, so the
        // grid showed 1,250 consecutive rows of one account and a cursor merging
        // accounts by date had almost nothing to merge.
        for (const year of new Set(transactions.map((t) => t.date.slice(0, 4)))) {
            const accounts = new Set(
                transactions.filter((t) => t.date.startsWith(year)).map((t) => t.accountIndex)
            );
            expect(accounts.size, year).toBe(FIXTURE_ACCOUNTS.length);
        }
    });

    it("interleaves accounts in date order, which is what a k-way merge must handle", () => {
        const byDateDescending = [...transactions].sort((left, right) =>
            left.date === right.date
                ? left.rowIndex - right.rowIndex
                : left.date < right.date
                  ? 1
                  : -1
        );
        const switches = byDateDescending.filter(
            (transaction, index) =>
                index > 0 && byDateDescending[index - 1]?.accountIndex !== transaction.accountIndex
        ).length;
        // Independent draws over four accounts switch on 3 of every 4 adjacent
        // pairs in expectation; anything near zero means the correlation is back.
        expect(switches / (byDateDescending.length - 1)).toBeGreaterThan(0.6);
    });

    it("spans eight years and every month", () => {
        const years = new Set(transactions.map((t) => t.date.slice(0, 4)));
        const months = new Set(transactions.map((t) => t.date.slice(5, 7)));
        expect(years.size).toBe(8);
        expect(months.size).toBe(12);
    });

    it("keeps day buckets small, so the CRDT tree is deep rather than wide", () => {
        const perDay = new Map<string, number>();
        for (const t of transactions) {
            const key = `${String(t.accountIndex)}/${t.date}`;
            perDay.set(key, (perDay.get(key) ?? 0) + 1);
        }
        expect(Math.max(...perDay.values())).toBeLessThan(20);
    });

    it("includes descriptions of very different widths", () => {
        const lengths = transactions.map((t) => t.description.length);
        expect(Math.min(...lengths)).toBeLessThan(6);
        expect(Math.max(...lengths)).toBeGreaterThan(200);
    });

    it("repeats descriptions enough for alias grouping to have mass", () => {
        const counts = new Map<string, number>();
        for (const t of transactions)
            counts.set(t.description, (counts.get(t.description) ?? 0) + 1);
        const repeated = [...counts.values()].filter((count) => count > 100);
        expect(repeated.length).toBeGreaterThanOrEqual(8);
    });

    it("includes both signs and a wide amount range", () => {
        expect(transactions.some((t) => t.amountMinorUnits > 0)).toBe(true);
        expect(transactions.some((t) => t.amountMinorUnits < 0)).toBe(true);
        expect(Math.max(...transactions.map((t) => Math.abs(t.amountMinorUnits)))).toBeGreaterThan(
            1_000_000
        );
    });

    it("plans notes for a meaningful subset of grid positions", () => {
        const plan = enrichmentPlan();
        expect(plan.notedRows.length).toBeGreaterThan(300);
        expect(plan.notedRows.length).toBeLessThan(600);
        // Spread, not clustered: every tenth of the range holds some.
        const decileCounts = Array.from(
            { length: 10 },
            (_unused, decile) =>
                plan.notedRows.filter(
                    (row) => row.rowIndex >= decile * 1000 && row.rowIndex < (decile + 1) * 1000
                ).length
        );
        expect(Math.min(...decileCounts)).toBeGreaterThan(20);
    });
});

describe("field-rule enrichment", () => {
    it("every rule matches a description the fixture actually emits", () => {
        const emitted = new Set(
            fixtureTransactions().map((transaction) => transaction.description)
        );
        for (const rule of FIXTURE_FIELD_RULES) {
            expect(emitted.has(rule.descriptionText), rule.descriptionText).toBe(true);
        }
    });

    it("counts the rows the rules will enrich, and they are a substantial minority", () => {
        const counts = fixtureEnrichmentCounts();
        // A rule that matched nothing would leave the fixture bare while every
        // assertion about rule creation still passed.
        for (const [description, count] of [
            ...counts.taggedRowsByDescription,
            ...counts.allocatedRowsByDescription
        ]) {
            expect(count, description).toBeGreaterThan(100);
        }
        expect(counts.taggedRows).toBeGreaterThan(1000);
        expect(counts.taggedRows).toBeLessThan(FIXTURE_TRANSACTION_COUNT / 2);
        expect(counts.allocatedRows).toBeGreaterThan(500);
        expect(counts.allocatedRows).toBeLessThan(FIXTURE_TRANSACTION_COUNT / 2);
    });

    it("tag rules and allocation rules do not fight over the same rows", () => {
        const tagged = new Set(
            FIXTURE_FIELD_RULES.filter((rule) => rule.field === "tags").map(
                (rule) => rule.descriptionText
            )
        );
        const allocated = FIXTURE_FIELD_RULES.filter((rule) => rule.field === "allocation").map(
            (rule) => rule.descriptionText
        );
        for (const description of allocated) expect(tagged.has(description)).toBe(false);
    });

    it("allocation percentages leave a remainder for the account owner", () => {
        for (const rule of FIXTURE_FIELD_RULES) {
            if (rule.field !== "allocation") continue;
            const total = rule.allocations.reduce(
                (sum, allocation) => sum + allocation.percentage,
                0
            );
            expect(total, rule.descriptionText).toBeGreaterThan(0);
            expect(total, rule.descriptionText).toBeLessThan(100);
        }
    });

    it("names only people the fixture creates", () => {
        for (const rule of FIXTURE_FIELD_RULES) {
            if (rule.field !== "allocation") continue;
            for (const allocation of rule.allocations) {
                expect(FIXTURE_PEOPLE).toContain(allocation.person);
            }
        }
    });

    it("names only tags the fixture creates", () => {
        for (const rule of FIXTURE_FIELD_RULES) {
            if (rule.field !== "tags") continue;
            for (const tag of rule.tags) expect(FIXTURE_TAGS).toContain(tag);
        }
    });

    it("pins the enrichment digest so a silent change to people, tags or rules fails", () => {
        expect(fixtureEnrichmentDigest()).toBe(
            "9e32ed1e477553bbe447974f7d490cdf332d1ef4b9f697191f6e0d7ee0df4422"
        );
    });
});

describe("csv serialisation", () => {
    it("emits one file per account, together holding every transaction", () => {
        const files = fixtureCsvByAccount();
        expect(files).toHaveLength(4);
        let dataRows = 0;
        for (const file of files) {
            const lines = file.split("\n");
            expect(lines[0]).toBe("Date,Description,Amount");
            expect(lines.length).toBeGreaterThan(2351);
            dataRows += lines.length - 1;
        }
        expect(dataRows).toBe(FIXTURE_TRANSACTION_COUNT);
    });

    it("quotes descriptions containing commas or quotes", () => {
        const joined = fixtureCsvByAccount().join("\n");
        expect(joined).toContain('"Café 東京 — quoted merchant, branch 17"');
    });

    it("formats JPY without a fractional part and USD with two places", () => {
        expect(formatAmount(-12_345, "USD")).toBe("-123.45");
        expect(formatAmount(-12_345, "JPY")).toBe("-12345");
        expect(formatAmount(5, "USD")).toBe("0.05");
    });
});

describe("the import ledger's own shape check", () => {
    // The abort this gates says "a write was lost", which outranks the performance
    // goal — so it must be impossible for a misparse of the Imports table to fire
    // it. These cases are the misparses, and each must come back untrusted.
    it("trusts four plausible per-import counts that sum to the fixture", () => {
        const ledger = validateImportLedger([2464, 2476, 2527, 2533], 4, 10_000);
        expect(ledger.trusted).toBe(true);
        expect(ledger.total).toBe(10_000);
        expect(ledger.note).toBeNull();
    });

    it("reports a genuine shortfall as trusted, so the lost-write abort can fire", () => {
        const ledger = validateImportLedger([2464, 2476, 2527, 2532], 4, 10_000);
        expect(ledger.trusted).toBe(true);
        expect(ledger.total).toBe(9_999);
    });

    it("does not trust the wrong number of rows", () => {
        expect(validateImportLedger([2464, 2476, 2527], 4, 10_000).trusted).toBe(false);
        expect(validateImportLedger([], 4, 10_000).trusted).toBe(false);
        expect(validateImportLedger([2464, 2476, 2527, 2533, 12], 4, 10_000).trusted).toBe(false);
    });

    it("does not trust counts that look like another column", () => {
        // Dates, percentages or row indexes read in place of the count column.
        expect(validateImportLedger([2026, 2026, 2026, 2026], 4, 10_000).trusted).toBe(false);
        expect(validateImportLedger([1, 2, 3, 4], 4, 10_000).trusted).toBe(false);
    });

    it("does not trust a sum above what was imported", () => {
        const ledger = validateImportLedger([2600, 2600, 2600, 2600], 4, 10_000);
        expect(ledger.trusted).toBe(false);
        expect(ledger.note).toMatch(/above the 10000 imported/);
    });
});
