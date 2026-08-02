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
 * Ties fall to the leftmost column, which matches the order a bank export
 * conventionally puts its columns in.
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

/**
 * Identify the date, amount and description columns from their values.
 *
 * Assignment runs most-constrained first. A date shape is the narrowest, so it
 * is claimed before amounts; a description is whatever text is left, so it is
 * claimed last and only from columns that are not already spoken for.
 *
 * @param dataRows - Data rows only, with any header row already removed
 * @returns Column index as a string mapped to target field, in the shape
 *   `ImportConfig.columnMappings` uses. Empty when nothing can be identified.
 */
export function detectColumnMappingsFromValues(
    dataRows: readonly (readonly string[])[]
): Record<string, string> {
    if (dataRows.length === 0) return {};

    const columnCount = dataRows.reduce((widest, row) => Math.max(widest, row.length), 0);
    const allIndices = Array.from({ length: columnCount }, (_, index) => index);

    const dateIndex = bestColumn(allIndices, dataRows, looksLikeDate);
    const afterDate = allIndices.filter((index) => index !== dateIndex);

    const amountIndex = bestColumn(afterDate, dataRows, looksLikeAmount);
    const remaining = afterDate.filter((index) => index !== amountIndex);

    // The description is the remaining column carrying the most text. Columns
    // that read as amounts are set aside first, so a trailing balance column
    // does not win the role, and wholly empty columns score zero and cannot.
    const textual = remaining.filter(
        (index) => matchRate(column(dataRows, index), looksLikeAmount) < CLASSIFICATION_THRESHOLD
    );
    const descriptionCandidates = textual.length > 0 ? textual : remaining;
    const descriptionIndex = bestColumn(
        descriptionCandidates,
        dataRows,
        (value) => value.trim() !== ""
    );

    return {
        ...(dateIndex !== null ? { [String(dateIndex)]: "date" } : {}),
        ...(amountIndex !== null ? { [String(amountIndex)]: "amount" } : {}),
        ...(descriptionIndex !== null ? { [String(descriptionIndex)]: "description" } : {})
    };
}
