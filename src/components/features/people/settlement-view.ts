/**
 * Pure presentation model for the People-page settlement experience.
 *
 * This module contains no settlement mathematics. It consumes the canonical `SettlementResult`
 * produced by the sole production engine in `src/lib/domain/settlement.ts` verbatim and reshapes it
 * for rendering. Explicit/effective allocation text on a source row is derived through the same
 * P16A primitive the engine itself uses, so the page can never show a second interpretation of the
 * numbers.
 *
 * Currencies are kept strictly apart: the model exposes per-currency sections and deliberately has
 * no field capable of expressing a combined cross-currency total.
 */

import type { SettlementIssue, SettlementResult } from "@/lib/domain/settlement";

/** Why a Person label is not a plain active name. */
export type SettlementPersonLabelKind = "active" | "deleted" | "unknown";

export interface SettlementPersonLabel {
    readonly kind: SettlementPersonLabelKind;
    /** Human-presentable label; always stable for a given person ID. */
    readonly text: string;
}

export interface SettlementAllocationEntry {
    readonly effectivePercentage: string;
    readonly explicitPercentage: string | null;
    readonly person: SettlementPersonLabel;
    readonly personId: string;
}

export interface SettlementSourceRow {
    readonly accountName: string;
    /**
     * Signed relative to the obligation direction: positive increases the obligation, negative is a
     * reverse-direction amount removed by netting.
     */
    readonly amountMinor: number;
    /** Allocation context for the source transaction, empty when it can no longer be derived. */
    readonly allocations: readonly SettlementAllocationEntry[];
    readonly date: string;
    /** Resolved description alias when present, otherwise the stored description. */
    readonly description: string;
    readonly transactionId: string;
}

export interface SettlementObligationView {
    readonly amountMinor: number;
    readonly creditor: SettlementPersonLabel;
    readonly creditorPersonId: string;
    readonly currency: string;
    readonly debtor: SettlementPersonLabel;
    readonly debtorPersonId: string;
    /** Stable key unique across the whole result. */
    readonly key: string;
    /** True when the current linked Person is the debtor or the creditor. */
    readonly involvesLinkedPerson: boolean;
    readonly sources: readonly SettlementSourceRow[];
}

export interface SettlementCurrencySection {
    readonly currency: string;
    readonly obligations: readonly SettlementObligationView[];
}

export interface SettlementIssueSummary {
    /** Number of distinct transactions excluded from the displayed totals. */
    readonly affectedTransactionCount: number;
    /** Deterministically ordered, human-presentable reasons. Contains no vault plaintext. */
    readonly reasons: readonly string[];
}

/**
 * The five canonical People-page states. `incomplete` outranks everything else so an invalid vault
 * can never be presented as settled.
 */
export type SettlementViewState =
    | { readonly kind: "incomplete"; readonly summary: SettlementIssueSummary }
    | { readonly kind: "no-qualifying-transactions" }
    | { readonly kind: "settled" }
    | { readonly kind: "obligations"; readonly sections: readonly SettlementCurrencySection[] };

export interface SettlementView {
    readonly state: SettlementViewState;
}

export interface SettlementViewPerson {
    readonly deleted: boolean;
    readonly name: string;
}

export interface SettlementViewTransaction {
    readonly accountName: string;
    readonly allocations: readonly SettlementAllocationEntry[];
    readonly date: string;
    readonly description: string;
}

export interface SettlementViewInput {
    /** Person ID currently linked to this browser identity, when one exists. */
    readonly linkedPersonId?: string;
    /** Stable label for a person ID, including deleted and entirely unknown IDs. */
    readonly resolvePerson: (personId: string) => SettlementViewPerson | undefined;
    readonly result: SettlementResult;
    /** Source-transaction context, or undefined when the transaction is no longer retained. */
    readonly resolveTransaction: (transactionId: string) => SettlementViewTransaction | undefined;
}

const ISSUE_REASON_TEXT = {
    "invalid-allocation": "Allocation percentages are invalid",
    "invalid-amount": "Transaction amount is not a whole number of minor units",
    "invalid-currency": "Account currency cannot be resolved",
    "invalid-ownership": "Account ownership is invalid",
    "invalid-transaction": "Transaction data is malformed",
    "missing-account": "Transaction references a missing account",
    "unsafe-calculation": "Amounts are too large to settle safely"
} as const satisfies Record<SettlementIssue["type"], string>;

function compareStrings(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

/** Truncated so an opaque ID stays readable without ever being mistaken for a name. */
function unknownPersonLabel(personId: string): string {
    return `Unknown person ${personId.slice(0, 8)}`;
}

export function resolvePersonLabel(
    personId: string,
    resolvePerson: SettlementViewInput["resolvePerson"]
): SettlementPersonLabel {
    const person = resolvePerson(personId);
    if (person == null) return { kind: "unknown", text: unknownPersonLabel(personId) };
    return person.deleted
        ? { kind: "deleted", text: `${person.name} (deleted)` }
        : { kind: "active", text: person.name };
}

export function summarizeIssues(issues: readonly SettlementIssue[]): SettlementIssueSummary | null {
    if (issues.length === 0) return null;
    const transactionIds = new Set<string>();
    const reasons = new Set<string>();
    for (const issue of issues) {
        transactionIds.add(issue.transactionId);
        reasons.add(ISSUE_REASON_TEXT[issue.type]);
    }
    return Object.freeze({
        affectedTransactionCount: transactionIds.size,
        reasons: Object.freeze([...reasons].sort(compareStrings))
    });
}

function buildSourceRow(
    transactionId: string,
    amountMinor: number,
    resolveTransaction: SettlementViewInput["resolveTransaction"]
): SettlementSourceRow {
    const transaction = resolveTransaction(transactionId);
    return Object.freeze({
        accountName: transaction?.accountName ?? "Unknown account",
        allocations: transaction?.allocations ?? Object.freeze([]),
        amountMinor,
        date: transaction?.date ?? "",
        description: transaction?.description ?? "",
        transactionId
    });
}

/**
 * Build the complete People-page view model.
 *
 * Ordering is inherited from the canonical engine, which already returns obligations in
 * currency/debtor/creditor order and source contributions in transaction order.
 */
export function buildSettlementView({
    linkedPersonId,
    resolvePerson,
    result,
    resolveTransaction
}: SettlementViewInput): SettlementView {
    const freezeView = (state: SettlementViewState): SettlementView =>
        Object.freeze({ state: Object.freeze(state) });

    const summary = summarizeIssues(result.issues);
    if (summary != null) return freezeView({ kind: "incomplete", summary });

    if (result.obligations.length === 0) {
        return freezeView(
            result.qualifyingTransactionCount === 0
                ? { kind: "no-qualifying-transactions" }
                : { kind: "settled" }
        );
    }

    const sections = new Map<string, SettlementObligationView[]>();
    for (const obligation of result.obligations) {
        const view: SettlementObligationView = Object.freeze({
            amountMinor: obligation.amountMinor,
            creditor: resolvePersonLabel(obligation.creditorPersonId, resolvePerson),
            creditorPersonId: obligation.creditorPersonId,
            currency: obligation.currency,
            debtor: resolvePersonLabel(obligation.debtorPersonId, resolvePerson),
            debtorPersonId: obligation.debtorPersonId,
            involvesLinkedPerson:
                linkedPersonId != null &&
                (obligation.debtorPersonId === linkedPersonId ||
                    obligation.creditorPersonId === linkedPersonId),
            key: `${obligation.currency}:${obligation.debtorPersonId}:${obligation.creditorPersonId}`,
            sources: Object.freeze(
                obligation.sourceContributions.map(({ amountMinor, transactionId }) =>
                    buildSourceRow(transactionId, amountMinor, resolveTransaction)
                )
            )
        });
        const existing = sections.get(obligation.currency);
        if (existing == null) sections.set(obligation.currency, [view]);
        else existing.push(view);
    }

    return freezeView({
        kind: "obligations",
        sections: Object.freeze(
            [...sections.entries()].map(([currency, obligations]) =>
                Object.freeze({ currency, obligations: Object.freeze(obligations) })
            )
        )
    });
}
