/**
 * Value-Driven Column and Format Detection
 *
 * Identifies what each column of a delimited file holds by looking at the
 * values it contains, rather than at a header name.
 *
 * Header-name matching cannot work on a file with no header row: the parser
 * synthesises "Column 1", "Column 2", ... and none of those match "date" or
 * "amount", so detection returns nothing and the user is left mapping every
 * column by hand. Bank exports frequently ship headerless, so the values are
 * the only evidence available.
 *
 * Date-format inference reads the WHOLE column for the same reason a single
 * sample is not enough: in `dd/MM/yyyy` versus `MM/dd/yyyy` any single value
 * whose leading field is 12 or less is genuinely ambiguous, and a file can
 * easily open with a run of such values. One value that exceeds 12 anywhere in
 * the column settles the order for every value in it.
 */

import { parseDate } from "./csv";

/**
 * A numeric date layout this module can recognise.
 *
 * `dayFirst` distinguishes the two readings of the same shape, which is the
 * only ambiguity the values themselves can resolve.
 */
interface DateFormatCandidate {
    /** date-fns pattern handed to `parseDate`. */
    readonly format: string;
    /** Shape the values must match for this candidate to be considered. */
    readonly shape: RegExp;
    /** Whether the leading numeric field is the day. */
    readonly dayFirst: boolean;
    /** Whether the leading two fields could be read either way round. */
    readonly ambiguous: boolean;
}

/**
 * Candidate layouts, most specific shape first.
 *
 * ISO leads because a four-digit leading field cannot be a day or a month, so
 * it is never ambiguous. The slash, dot and dash families follow.
 */
const DATE_FORMAT_CANDIDATES: readonly DateFormatCandidate[] = [
    { format: "yyyy-MM-dd", shape: /^\d{4}-\d{1,2}-\d{1,2}$/, dayFirst: false, ambiguous: false },
    { format: "yyyy/MM/dd", shape: /^\d{4}\/\d{1,2}\/\d{1,2}$/, dayFirst: false, ambiguous: false },
    { format: "dd/MM/yyyy", shape: /^\d{2}\/\d{2}\/\d{4}$/, dayFirst: true, ambiguous: true },
    { format: "MM/dd/yyyy", shape: /^\d{2}\/\d{2}\/\d{4}$/, dayFirst: false, ambiguous: true },
    { format: "d/M/yyyy", shape: /^\d{1,2}\/\d{1,2}\/\d{4}$/, dayFirst: true, ambiguous: true },
    { format: "M/d/yyyy", shape: /^\d{1,2}\/\d{1,2}\/\d{4}$/, dayFirst: false, ambiguous: true },
    { format: "dd.MM.yyyy", shape: /^\d{2}\.\d{2}\.\d{4}$/, dayFirst: true, ambiguous: false },
    { format: "dd-MM-yyyy", shape: /^\d{2}-\d{2}-\d{4}$/, dayFirst: true, ambiguous: true },
    { format: "MM-dd-yyyy", shape: /^\d{2}-\d{2}-\d{4}$/, dayFirst: false, ambiguous: true }
];

/**
 * Proportion of a column's non-empty values that must parse for the column to
 * be classified.
 *
 * Not 1.0: a real export carries the occasional malformed row, and one bad row
 * should not cost the user the whole mapping. High enough that a column of
 * free text cannot reach it by accident.
 */
const CLASSIFICATION_THRESHOLD = 0.8;

/** Non-empty, trimmed values of a column. */
function presentValues(values: readonly string[]): string[] {
    return values.map((value) => value.trim()).filter((value) => value !== "");
}

/**
 * Read the leading numeric field of a value, or null if there is not one.
 *
 * This is what decides day-first versus month-first: a leading field above 12
 * cannot be a month.
 */
function leadingField(value: string): number | null {
    const match = /^(\d{1,2})[/.-]/.exec(value.trim());
    if (!match) return null;

    const parsed = Number.parseInt(match[1], 10);
    return Number.isNaN(parsed) ? null : parsed;
}

/** Read the second numeric field of a value, or null if there is not one. */
function secondField(value: string): number | null {
    const match = /^\d{1,2}[/.-](\d{1,2})[/.-]/.exec(value.trim());
    if (!match) return null;

    const parsed = Number.parseInt(match[1], 10);
    return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Infer the date format of a whole column of values.
 *
 * A candidate qualifies when enough of the column both matches its shape and
 * parses under it. Where two candidates describe the same shape and differ
 * only in field order, the column as a whole decides:
 *
 * - any value whose leading field exceeds 12 makes the column day-first;
 * - otherwise any value whose second field exceeds 12 makes it month-first;
 * - a column in which every value reads both ways is genuinely undecidable
 *   from its values, and falls to the tie-break below.
 *
 * @param values - Every value of the candidate date column, not a sample
 * @returns date-fns format pattern, or null if no candidate fits
 */
export function inferDateFormat(values: readonly string[]): string | null {
    const present = presentValues(values);
    if (present.length === 0) return null;

    const qualifying = DATE_FORMAT_CANDIDATES.filter((candidate) => {
        const parsed = present.filter(
            (value) => candidate.shape.test(value) && parseDate(value, candidate.format) !== null
        );
        return parsed.length / present.length >= CLASSIFICATION_THRESHOLD;
    });

    if (qualifying.length === 0) return null;

    const unambiguous = qualifying.find((candidate) => !candidate.ambiguous);
    if (unambiguous) return unambiguous.format;

    const hasDayFirstEvidence = present.some((value) => {
        const leading = leadingField(value);
        return leading !== null && leading > 12;
    });
    if (hasDayFirstEvidence) {
        return qualifying.find((candidate) => candidate.dayFirst)?.format ?? qualifying[0].format;
    }

    const hasMonthFirstEvidence = present.some((value) => {
        const second = secondField(value);
        return second !== null && second > 12;
    });
    if (hasMonthFirstEvidence) {
        return qualifying.find((candidate) => !candidate.dayFirst)?.format ?? qualifying[0].format;
    }

    // Tie-break, reached only when every value in the column reads both ways.
    // Month-first, which is what this codebase resolved such columns to before
    // whole-column inference existed. Documented and fixed rather than derived
    // from the viewer's locale: a bank file means the same thing wherever it is
    // opened, so the reading must not change with who opens it.
    return qualifying.find((candidate) => !candidate.dayFirst)?.format ?? qualifying[0].format;
}

/**
 * Whether a value carries a sign, written either way round.
 *
 * A signed value is strong evidence of money: a check number, a reference and
 * an account number are never written `-5.50` or `(5.50)`.
 */
function carriesSign(value: string): boolean {
    const trimmed = value.trim().replace(/[$€£¥₹]/g, "");
    return (
        trimmed.startsWith("-") ||
        trimmed.startsWith("+") ||
        (trimmed.startsWith("(") && trimmed.endsWith(")"))
    );
}

/**
 * Whether a value has a minor-unit fraction, e.g. `-5.50` or `1.234,56`.
 *
 * This is what separates money from an identifier that merely happens to be
 * numeric: a check number is a whole number, an amount is written to its
 * currency's decimal places.
 */
function carriesMinorUnits(value: string): boolean {
    return /[.,]\d{1,2}$/.test(
        value
            .trim()
            .replace(/[$€£¥₹\s]/g, "")
            .replace(/\)$/, "")
    );
}

/**
 * Whether a value reads as a monetary amount.
 *
 * Deliberately accepts both separator conventions. Column classification runs
 * before the number format is known - detecting the format needs the amount
 * column, and finding the amount column needs to recognise amounts - so this
 * must not depend on a configured separator pair.
 */
function looksLikeAmount(value: string): boolean {
    const withoutSymbols = value.trim().replace(/[$€£¥₹]/g, "");
    const unwrapped =
        withoutSymbols.startsWith("(") && withoutSymbols.endsWith(")")
            ? withoutSymbols.slice(1, -1)
            : withoutSymbols;
    const unsigned =
        unwrapped.startsWith("-") || unwrapped.startsWith("+") ? unwrapped.slice(1) : unwrapped;
    const withoutSpaces = unsigned.replace(/[\s  ]/g, "");

    if (withoutSpaces === "") return false;

    // Either a grouped integer part or an ungrouped run of digits, each with an
    // optional fractional part introduced by either separator. The ungrouped
    // alternative is required: an export that omits thousands separators writes
    // "2500.00", which no grouped pattern matches.
    return /^(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d+)?$/.test(withoutSpaces);
}

/** Whether a value reads as a date under any candidate layout. */
function looksLikeDate(value: string): boolean {
    const trimmed = value.trim();
    return DATE_FORMAT_CANDIDATES.some(
        (candidate) =>
            candidate.shape.test(trimmed) && parseDate(trimmed, candidate.format) !== null
    );
}

/** Proportion of a column's non-empty values satisfying a predicate. */
function matchRate(values: readonly string[], predicate: (value: string) => boolean): number {
    const present = presentValues(values);
    if (present.length === 0) return 0;
    return present.filter(predicate).length / present.length;
}

/** Read column `index` out of every row. */
function column(rows: readonly (readonly string[])[], index: number): string[] {
    return rows.map((row) => row[index] ?? "");
}

/**
 * Pick the column with the highest rate, requiring the threshold to be met.
 *
 * Ties fall to the leftmost column. That is adequate for roles where every
 * qualifying column is equally good, but NOT for the amount role, where two
 * columns routinely both qualify and only one holds money - see
 * `bestAmountColumn`.
 */
function bestColumn(
    candidateIndices: readonly number[],
    rows: readonly (readonly string[])[],
    predicate: (value: string) => boolean
): number | null {
    const scored = candidateIndices
        .map((index) => ({ index, rate: matchRate(column(rows, index), predicate) }))
        .filter((entry) => entry.rate >= CLASSIFICATION_THRESHOLD);

    if (scored.length === 0) return null;

    return scored.reduce((best, entry) => (entry.rate > best.rate ? entry : best)).index;
}

/** Header names that name the transaction amount itself. */
const AMOUNT_HEADER_PATTERN = /\bamount\b|\bdebit\b|\bcredit\b|\bvalue\b/i;

/**
 * Header names that read as numeric but are NOT the transaction amount.
 *
 * A running balance and a check number are the two that occur in real bank
 * exports and both parse as amounts, so a values-only rule cannot separate a
 * balance from an all-positive amount column at all.
 */
const NON_AMOUNT_HEADER_PATTERN =
    /\bbalance\b|\bcheque?\s*(no|num|#)|\bcheck\s*(no|num|#)|\bref\b/i;

/** How strongly a column's values look like money rather than an identifier. */
interface AmountEvidence {
    readonly index: number;
    /** Values carry a sign - a check number never does. */
    readonly signedRate: number;
    /** Values are written to minor units - an identifier is a whole number. */
    readonly minorUnitRate: number;
    /** The column's own header names it, or disowns it. */
    readonly headerSays: "amount" | "not-amount" | "nothing";
}

/**
 * Choose the amount column from among the numeric ones.
 *
 * The naive rule - highest match rate, ties to the leftmost - is WRONG here and
 * silently so. In `Date,Check No,Description,Amount` the check numbers and the
 * amounts both score 1.0 against `looksLikeAmount`, so position decides, and
 * the check number is imported as money with every row marked valid. Wrong
 * money reported as success is worse than a visible failure.
 *
 * Columns are therefore ranked on evidence that distinguishes money from a
 * number that merely looks like one:
 *
 * 1. **A header that names or disowns the column.** Strongest when present. The
 *    frozen requirement is that detection works on a file with NO header, not
 *    that a header must be ignored when the file has one - discarding it throws
 *    away the only signal that can separate a running balance from an
 *    all-positive amount column, which no values-only rule can do.
 * 2. **Signs.** `-5.50` or `(5.50)` is money; a check number is never signed.
 * 3. **Minor units.** `-5.50` is money; `1001` is an identifier.
 *
 * Position is used only to break a tie between columns that are equal on all
 * three, where there is genuinely nothing else to go on.
 */
function bestAmountColumn(
    candidateIndices: readonly number[],
    rows: readonly (readonly string[])[],
    headers: readonly string[]
): number | null {
    const qualifying = candidateIndices.filter(
        (index) => matchRate(column(rows, index), looksLikeAmount) >= CLASSIFICATION_THRESHOLD
    );
    if (qualifying.length === 0) return null;

    const evidence: AmountEvidence[] = qualifying.map((index) => {
        const values = column(rows, index);
        const header = headers[index] ?? "";
        return {
            index,
            signedRate: matchRate(values, carriesSign),
            minorUnitRate: matchRate(values, carriesMinorUnits),
            headerSays: AMOUNT_HEADER_PATTERN.test(header)
                ? "amount"
                : NON_AMOUNT_HEADER_PATTERN.test(header)
                  ? "not-amount"
                  : "nothing"
        };
    });

    // A header naming exactly one column as the amount settles it outright.
    const named = evidence.filter((entry) => entry.headerSays === "amount");
    if (named.length === 1) return named[0].index;

    // Otherwise rank, preferring columns their header does not disown.
    const preferred = evidence.filter((entry) => entry.headerSays !== "not-amount");

    // When EVERY qualifying column is disowned by its header, the file has no
    // amount column. Falling back to the disowned set here - which this once
    // did - overrides the header exactly where it is unambiguous, and imports a
    // running balance or a check number as the transaction amount with every
    // row reported valid. There is no correct amount to choose in such a file,
    // so the honest answer is to map none: the rows then surface as errors,
    // which is what the user needs to see.
    if (preferred.length === 0) return null;

    return preferred.reduce((best, entry) => {
        if (entry.signedRate !== best.signedRate) {
            return entry.signedRate > best.signedRate ? entry : best;
        }
        if (entry.minorUnitRate !== best.minorUnitRate) {
            return entry.minorUnitRate > best.minorUnitRate ? entry : best;
        }
        return best;
    }).index;
}

/**
 * Identify the date, amount and description columns.
 *
 * Assignment runs most-constrained first. A date shape is the narrowest, so it
 * is claimed before amounts; a description is whatever text is left, so it is
 * claimed last and only from columns that are not already spoken for.
 *
 * @param dataRows - Data rows only, with any header row already removed
 * @param headers - Header names when the file has a header row, positionally
 *   aligned with the columns. Omit, or pass synthesised names, for a headerless
 *   file: every role is still decided from the values, and headers only break
 *   ties the values cannot - notably a running balance versus an all-positive
 *   amount column, which are indistinguishable by value alone.
 * @returns Column index as a string mapped to target field, in the shape
 *   `ImportConfig.columnMappings` uses. Empty when nothing can be identified.
 */
export function detectColumnMappingsFromValues(
    dataRows: readonly (readonly string[])[],
    headers: readonly string[] = []
): Record<string, string> {
    if (dataRows.length === 0) return {};

    const columnCount = dataRows.reduce((widest, row) => Math.max(widest, row.length), 0);
    const allIndices = Array.from({ length: columnCount }, (_, index) => index);

    const dateIndex = bestColumn(allIndices, dataRows, looksLikeDate);
    const afterDate = allIndices.filter((index) => index !== dateIndex);

    const amountIndex = bestAmountColumn(afterDate, dataRows, headers);
    const remaining = afterDate.filter((index) => index !== amountIndex);

    // The description is the remaining column carrying the most text. Every
    // column that reads as an amount is excluded here - including a balance or
    // check-number column that lost the amount role - so a numeric column
    // cannot become the description. Wholly empty columns score zero and cannot
    // win either.
    const textual = remaining.filter(
        (index) => matchRate(column(dataRows, index), looksLikeAmount) < CLASSIFICATION_THRESHOLD
    );
    const descriptionCandidates = textual.length > 0 ? textual : remaining;
    const descriptionIndex = bestColumn(
        descriptionCandidates,
        dataRows,
        (value) => value.trim() !== ""
    );

    const core = {
        ...(dateIndex !== null ? { [String(dateIndex)]: "date" } : {}),
        ...(amountIndex !== null ? { [String(amountIndex)]: "amount" } : {}),
        ...(descriptionIndex !== null ? { [String(descriptionIndex)]: "description" } : {})
    };

    return { ...core, ...secondaryRolesFromHeaders(headers, core) };
}

/**
 * Header patterns for the roles that carry no distinguishing value shape.
 *
 * A merchant, a memo and a description are all just text, and a check number
 * and a balance are both plain numbers, so nothing in the VALUES tells these
 * roles apart. A header name is the only evidence available, which is why these
 * are recovered from headers or not at all.
 */
const SECONDARY_ROLE_PATTERNS: readonly (readonly [RegExp, string])[] = [
    [/\bmerchant\b|\bpayee\b/i, "merchant"],
    [/\bmemo\b|\bnote/i, "memo"],
    [/\bcheque?\s*(no|num|#)|\bcheck\s*(no|num|#)/i, "checkNumber"],
    [/\bbalance\b/i, "balance"]
];

/**
 * Recover the optional roles a header names, for columns still unclaimed.
 *
 * Value-driven detection identifies the three roles the import pipeline parses
 * - date, amount, description - and those are decided from values alone so a
 * headerless file works. It cannot identify these secondary roles at all, and
 * dropping them would silently lose mappings the user could previously see and
 * rely on in the mapping UI. They are additive: a column already holding a core
 * role is never reassigned, and each role is claimed once.
 */
function secondaryRolesFromHeaders(
    headers: readonly string[],
    claimed: Readonly<Record<string, string>>
): Record<string, string> {
    const takenRoles = new Set(Object.values(claimed));

    return headers.reduce<Record<string, string>>((mappings, header, index) => {
        if (claimed[String(index)] !== undefined) return mappings;

        const matched = SECONDARY_ROLE_PATTERNS.find(
            ([pattern, role]) => !takenRoles.has(role) && pattern.test(header)
        );
        if (!matched) return mappings;

        takenRoles.add(matched[1]);
        return { ...mappings, [String(index)]: matched[1] };
    }, {});
}
