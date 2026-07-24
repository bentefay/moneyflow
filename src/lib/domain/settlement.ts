/**
 * Canonical settlement calculation.
 *
 * This module is the sole production owner of person-to-person settlement semantics. It derives
 * immutable results from retained vault state and never persists a cache or rewrites source data.
 */

import type { Account, Status, Transaction } from "@/lib/crdt/schema";

import {
    apportionMinorUnits,
    deriveEffectiveAllocations,
    type EffectiveAllocationResult,
    type ExactPercentageWeights,
    type MinorUnitApportionmentResult
} from "./allocation";
import { isValidCurrencyCode, resolveAccountCurrency } from "./currency";

export interface SettlementContribution {
    readonly amountMinor: number;
    readonly creditorPersonId: string;
    readonly currency: string;
    readonly debtorPersonId: string;
    readonly transactionId: string;
}

export interface SettlementSourceContribution {
    /**
     * Signed relative to the final obligation direction. Positive contributions increase the
     * obligation; negative contributions are reverse-direction amounts removed by netting.
     */
    readonly amountMinor: number;
    readonly transactionId: string;
}

export interface SettlementObligation {
    readonly amountMinor: number;
    readonly creditorPersonId: string;
    readonly currency: string;
    readonly debtorPersonId: string;
    readonly sourceContributions: readonly SettlementSourceContribution[];
}

export interface SettlementPersonPosition {
    /** Positive means owed money; negative means owes money. */
    readonly amountMinor: number;
    readonly personId: string;
}

export interface SettlementCurrencyPositions {
    readonly currency: string;
    readonly people: readonly SettlementPersonPosition[];
}

export type SettlementIssue =
    | {
          readonly accountId: string;
          readonly transactionId: string;
          readonly type: "missing-account";
      }
    | {
          readonly accountId: string;
          readonly currencyCode: string;
          readonly transactionId: string;
          readonly type: "invalid-currency";
      }
    | {
          readonly accountId: string;
          readonly personId: string;
          readonly reason: "negative-zero" | "not-finite" | "not-number" | "out-of-range";
          readonly transactionId: string;
          readonly type: "invalid-allocation";
      }
    | {
          readonly accountId: string;
          readonly personId?: string;
          readonly reason:
              | "empty"
              | "invalid-total"
              | "negative-zero"
              | "not-finite"
              | "not-number"
              | "out-of-range";
          readonly total?: string;
          readonly transactionId: string;
          readonly type: "invalid-ownership";
      }
    | {
          readonly accountId: string;
          readonly reason: "not-safe-integer";
          readonly transactionId: string;
          readonly type: "invalid-amount";
      }
    | {
          readonly accountId: string;
          readonly stage:
              | "aggregate"
              | "effective-apportionment"
              | "ownership-apportionment"
              | "position";
          readonly transactionId: string;
          readonly type: "unsafe-calculation";
      };

export interface SettlementResult {
    /** Positive directed per-transaction contributions before pair aggregation and reverse netting. */
    readonly contributions: readonly SettlementContribution[];
    readonly issues: readonly SettlementIssue[];
    readonly obligations: readonly SettlementObligation[];
    readonly positions: readonly SettlementCurrencyPositions[];
    /** Number of valid Treat-as-Paid top-level transactions included in the result. */
    readonly qualifyingTransactionCount: number;
}

interface TransactionCalculation {
    readonly contributions: readonly Omit<SettlementContribution, "currency" | "transactionId">[];
    readonly positions: Readonly<Record<string, number>>;
}

interface DirectedAggregate {
    amountMinor: number;
    readonly sources: SettlementContribution[];
}

function compareStrings(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function freezeResultGraph<T extends object>(value: T): T {
    for (const nested of Object.values(value)) {
        if (nested != null && typeof nested === "object") freezeResultGraph(nested);
    }
    return Object.freeze(value);
}

function recordFromLoroMap<T extends object>(
    collection: Readonly<Record<string, T | string>>
): Map<string, T> {
    const result = new Map<string, T>();
    for (const [id, value] of Object.entries(collection)) {
        if (typeof value === "object" && value !== null) result.set(id, value);
    }
    return result;
}

function unknownValueKey(value: unknown): string {
    if (typeof value === "number") {
        if (Object.is(value, -0)) return "number:-0";
        return `number:${String(value)}`;
    }
    return `${typeof value}:${String(value)}`;
}

function recordKey(record: Readonly<Record<string, unknown>>): string {
    return Object.entries(record)
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([key, value]) => `${key.length}:${key}=${unknownValueKey(value)}`)
        .join("|");
}

function transactionOrder(left: Transaction, right: Transaction): number {
    const idOrder = compareStrings(left.id, right.id);
    if (idOrder !== 0) return idOrder;
    return compareStrings(left.$cid ?? "", right.$cid ?? "");
}

function validTopLevelTransactions(transactions: readonly Transaction[]): readonly Transaction[] {
    const nestedIds = new Set<string>();
    for (const transaction of transactions) {
        for (const duplicate of transaction.suspectedDuplicates) nestedIds.add(duplicate.id);
    }

    const seenIds = new Set<string>();
    return [...transactions].sort(transactionOrder).filter((transaction) => {
        if (seenIds.has(transaction.id) || nestedIds.has(transaction.id)) return false;
        seenIds.add(transaction.id);
        return !transaction.deletedAt;
    });
}

function allocationAndOwnershipIssues(
    result: EffectiveAllocationResult,
    transactionId: string,
    accountId: string
): readonly SettlementIssue[] {
    if (result.ok) return [];
    return [...result.errors]
        .sort((left, right) => {
            const domainOrder = compareStrings(left.domain, right.domain);
            if (domainOrder !== 0) return domainOrder;
            const leftPerson = "personId" in left ? left.personId : "";
            const rightPerson = "personId" in right ? right.personId : "";
            const personOrder = compareStrings(leftPerson, rightPerson);
            return personOrder !== 0 ? personOrder : compareStrings(left.reason, right.reason);
        })
        .map((error): SettlementIssue => {
            if (error.domain === "allocation") {
                return {
                    accountId,
                    personId: error.personId,
                    reason: error.reason,
                    transactionId,
                    type: "invalid-allocation"
                };
            }
            return {
                accountId,
                ...("personId" in error ? { personId: error.personId } : {}),
                reason: error.reason,
                ...("total" in error ? { total: error.total } : {}),
                transactionId,
                type: "invalid-ownership"
            };
        });
}

function apportionmentIssue(
    result: MinorUnitApportionmentResult,
    stage: "effective-apportionment" | "ownership-apportionment",
    transactionId: string,
    accountId: string
): SettlementIssue | null {
    if (result.ok) return null;
    return {
        accountId,
        stage,
        transactionId,
        type: "unsafe-calculation"
    };
}

function calculateTransaction(
    amountMinor: number,
    effectiveWeights: ExactPercentageWeights,
    ownershipWeights: ExactPercentageWeights
):
    | { readonly calculation: TransactionCalculation; readonly ok: true }
    | {
          readonly ok: false;
          readonly stage: "effective-apportionment" | "ownership-apportionment" | "position";
      } {
    const effectiveShares = apportionMinorUnits(amountMinor, effectiveWeights);
    if (!effectiveShares.ok) return { ok: false, stage: "effective-apportionment" };
    const ownershipShares = apportionMinorUnits(amountMinor, ownershipWeights);
    if (!ownershipShares.ok) return { ok: false, stage: "ownership-apportionment" };

    const personIds = Array.from(
        new Set([...Object.keys(effectiveShares.value), ...Object.keys(ownershipShares.value)])
    ).sort(compareStrings);
    const positions: Record<string, number> = {};
    for (const personId of personIds) {
        const position =
            (effectiveShares.value[personId] ?? 0) - (ownershipShares.value[personId] ?? 0);
        if (!Number.isSafeInteger(position)) return { ok: false, stage: "position" };
        positions[personId] = position;
    }
    if (Object.values(positions).reduce((sum, position) => sum + position, 0) !== 0) {
        return { ok: false, stage: "position" };
    }

    const debtors = Object.entries(positions)
        .filter(([, position]) => position < 0)
        .map(([personId, position]) => ({ personId, remaining: -position }));
    const creditors = Object.entries(positions)
        .filter(([, position]) => position > 0)
        .map(([personId, position]) => ({ personId, remaining: position }));
    const contributions: Array<Omit<SettlementContribution, "currency" | "transactionId">> = [];
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
        const debtor = debtors[debtorIndex];
        const creditor = creditors[creditorIndex];
        if (debtor == null || creditor == null) return { ok: false, stage: "position" };
        const amount = Math.min(debtor.remaining, creditor.remaining);
        if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, stage: "position" };
        contributions.push({
            amountMinor: amount,
            creditorPersonId: creditor.personId,
            debtorPersonId: debtor.personId
        });
        debtor.remaining -= amount;
        creditor.remaining -= amount;
        if (debtor.remaining === 0) debtorIndex += 1;
        if (creditor.remaining === 0) creditorIndex += 1;
    }
    if (
        debtors.some(({ remaining }) => remaining !== 0) ||
        creditors.some(({ remaining }) => remaining !== 0)
    ) {
        return { ok: false, stage: "position" };
    }

    return { calculation: { contributions, positions }, ok: true };
}

function positionKey(currency: string, personId: string): string {
    return `${currency.length}:${currency}${personId}`;
}

function directedKey(currency: string, debtorPersonId: string, creditorPersonId: string): string {
    return `${currency.length}:${currency}${debtorPersonId.length}:${debtorPersonId}${creditorPersonId}`;
}

function unorderedPairKey(currency: string, leftPersonId: string, rightPersonId: string): string {
    return `${currency.length}:${currency}${leftPersonId.length}:${leftPersonId}${rightPersonId}`;
}

function canCommitCalculation(
    calculation: TransactionCalculation,
    currency: string,
    positions: ReadonlyMap<string, number>,
    aggregates: ReadonlyMap<string, DirectedAggregate>
): boolean {
    for (const [personId, amountMinor] of Object.entries(calculation.positions)) {
        const next = (positions.get(positionKey(currency, personId)) ?? 0) + amountMinor;
        if (!Number.isSafeInteger(next)) return false;
    }
    const additions = new Map<string, number>();
    for (const contribution of calculation.contributions) {
        const key = directedKey(
            currency,
            contribution.debtorPersonId,
            contribution.creditorPersonId
        );
        additions.set(key, (additions.get(key) ?? 0) + contribution.amountMinor);
    }
    for (const [key, addition] of additions) {
        const next = (aggregates.get(key)?.amountMinor ?? 0) + addition;
        if (!Number.isSafeInteger(next)) return false;
    }
    return true;
}

function commitCalculation(
    calculation: TransactionCalculation,
    transactionId: string,
    currency: string,
    positions: Map<string, number>,
    aggregates: Map<string, DirectedAggregate>,
    contributions: SettlementContribution[]
): void {
    for (const [personId, amountMinor] of Object.entries(calculation.positions)) {
        const key = positionKey(currency, personId);
        positions.set(key, (positions.get(key) ?? 0) + amountMinor);
    }
    for (const contribution of calculation.contributions) {
        const source: SettlementContribution = {
            ...contribution,
            currency,
            transactionId
        };
        contributions.push(source);
        const key = directedKey(
            currency,
            contribution.debtorPersonId,
            contribution.creditorPersonId
        );
        const aggregate = aggregates.get(key);
        if (aggregate == null) {
            aggregates.set(key, { amountMinor: contribution.amountMinor, sources: [source] });
        } else {
            aggregate.amountMinor += contribution.amountMinor;
            aggregate.sources.push(source);
        }
    }
}

function contributionOrder(left: SettlementContribution, right: SettlementContribution): number {
    return (
        compareStrings(left.currency, right.currency) ||
        compareStrings(left.debtorPersonId, right.debtorPersonId) ||
        compareStrings(left.creditorPersonId, right.creditorPersonId) ||
        compareStrings(left.transactionId, right.transactionId) ||
        left.amountMinor - right.amountMinor
    );
}

function buildPositions(positions: ReadonlyMap<string, number>): SettlementCurrencyPositions[] {
    const byCurrency = new Map<string, SettlementPersonPosition[]>();
    for (const [key, amountMinor] of positions) {
        const separator = key.indexOf(":");
        const currencyLength = Number(key.slice(0, separator));
        const currencyStart = separator + 1;
        const currency = key.slice(currencyStart, currencyStart + currencyLength);
        const personId = key.slice(currencyStart + currencyLength);
        const people = byCurrency.get(currency) ?? [];
        people.push({ amountMinor, personId });
        byCurrency.set(currency, people);
    }
    return Array.from(byCurrency.entries())
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([currency, people]) => ({
            currency,
            people: people.sort((left, right) => compareStrings(left.personId, right.personId))
        }));
}

function buildObligations(
    aggregates: ReadonlyMap<string, DirectedAggregate>,
    contributions: readonly SettlementContribution[]
): SettlementObligation[] {
    const pairs = new Map<
        string,
        { readonly currency: string; readonly left: string; readonly right: string }
    >();
    for (const contribution of contributions) {
        const [left, right] =
            compareStrings(contribution.debtorPersonId, contribution.creditorPersonId) < 0
                ? [contribution.debtorPersonId, contribution.creditorPersonId]
                : [contribution.creditorPersonId, contribution.debtorPersonId];
        pairs.set(unorderedPairKey(contribution.currency, left, right), {
            currency: contribution.currency,
            left,
            right
        });
    }
    const obligations: SettlementObligation[] = [];
    const orderedPairs = Array.from(pairs.values()).sort(
        (first, second) =>
            compareStrings(first.currency, second.currency) ||
            compareStrings(first.left, second.left) ||
            compareStrings(first.right, second.right)
    );
    for (const { currency, left, right } of orderedPairs) {
        const leftToRight = aggregates.get(directedKey(currency, left, right))?.amountMinor ?? 0;
        const rightToLeft = aggregates.get(directedKey(currency, right, left))?.amountMinor ?? 0;
        const net = leftToRight - rightToLeft;
        if (net === 0) continue;
        const debtorPersonId = net > 0 ? left : right;
        const creditorPersonId = net > 0 ? right : left;
        const forward =
            aggregates.get(directedKey(currency, debtorPersonId, creditorPersonId))?.sources ?? [];
        const reverse =
            aggregates.get(directedKey(currency, creditorPersonId, debtorPersonId))?.sources ?? [];
        const sourceContributions = [
            ...forward.map(({ amountMinor, transactionId }) => ({
                amountMinor,
                transactionId
            })),
            ...reverse.map(({ amountMinor, transactionId }) => ({
                amountMinor: -amountMinor,
                transactionId
            }))
        ].sort(
            (first, second) =>
                compareStrings(first.transactionId, second.transactionId) ||
                second.amountMinor - first.amountMinor
        );
        obligations.push({
            amountMinor: Math.abs(net),
            creditorPersonId,
            currency,
            debtorPersonId,
            sourceContributions
        });
    }
    return obligations.sort(
        (left, right) =>
            compareStrings(left.currency, right.currency) ||
            compareStrings(left.debtorPersonId, right.debtorPersonId) ||
            compareStrings(left.creditorPersonId, right.creditorPersonId)
    );
}

/**
 * Calculate the complete settlement result from canonical top-level transactions.
 *
 * The current caller supplies `getAllTransactions(...)`, and this boundary also rejects IDs that
 * appear in any supplied parent's nested suspected-duplicate list so an accidentally flattened
 * nested item cannot participate.
 */
export function calculateSettlementBalances(
    transactions: readonly Transaction[],
    accounts: Readonly<Record<string, Account | string>>,
    statuses: Readonly<Record<string, Status | string>>,
    vaultDefaultCurrency?: string
): SettlementResult {
    const accountMap = recordFromLoroMap(accounts);
    const statusMap = recordFromLoroMap(statuses);
    const ownershipKeys = new Map(
        Array.from(accountMap, ([accountId, account]) => [accountId, recordKey(account.ownerships)])
    );
    const derivationCache = new Map<string, EffectiveAllocationResult>();
    const transactionCalculationCache = new Map<string, ReturnType<typeof calculateTransaction>>();
    const positions = new Map<string, number>();
    const aggregates = new Map<string, DirectedAggregate>();
    const contributions: SettlementContribution[] = [];
    const issues: SettlementIssue[] = [];
    let qualifyingTransactionCount = 0;

    for (const transaction of validTopLevelTransactions(transactions)) {
        const retainedStatus = statusMap.get(transaction.statusId);
        if (retainedStatus?.behavior !== "treatAsPaid") continue;

        const account = accountMap.get(transaction.accountId);
        if (account == null) {
            issues.push({
                accountId: transaction.accountId,
                transactionId: transaction.id,
                type: "missing-account"
            });
            continue;
        }
        if (!Number.isSafeInteger(transaction.amount)) {
            issues.push({
                accountId: transaction.accountId,
                reason: "not-safe-integer",
                transactionId: transaction.id,
                type: "invalid-amount"
            });
            continue;
        }

        const resolvedCurrency = resolveAccountCurrency(account.currency, vaultDefaultCurrency);
        const currency = resolvedCurrency.code.toUpperCase();
        if (!isValidCurrencyCode(currency)) {
            issues.push({
                accountId: transaction.accountId,
                currencyCode: resolvedCurrency.code,
                transactionId: transaction.id,
                type: "invalid-currency"
            });
            continue;
        }

        const derivationKey = `${transaction.accountId}\u0000${ownershipKeys.get(transaction.accountId) ?? ""}\u0000${recordKey(transaction.allocations)}`;
        const cachedDerivation = derivationCache.get(derivationKey);
        const derivation =
            cachedDerivation ??
            deriveEffectiveAllocations(transaction.allocations, account.ownerships);
        if (cachedDerivation == null) derivationCache.set(derivationKey, derivation);
        const validationIssues = allocationAndOwnershipIssues(
            derivation,
            transaction.id,
            transaction.accountId
        );
        if (validationIssues.length > 0 || !derivation.ok) {
            issues.push(...validationIssues);
            continue;
        }

        const calculationKey = `${transaction.amount}\u0000${derivationKey}`;
        const cachedCalculation = transactionCalculationCache.get(calculationKey);
        const calculationResult =
            cachedCalculation ??
            calculateTransaction(
                transaction.amount,
                derivation.value.effectiveAllocations,
                derivation.value.ownershipWeights
            );
        if (cachedCalculation == null) {
            transactionCalculationCache.set(calculationKey, calculationResult);
        }
        if (!calculationResult.ok) {
            const apportionmentResult =
                calculationResult.stage === "effective-apportionment"
                    ? apportionMinorUnits(transaction.amount, derivation.value.effectiveAllocations)
                    : apportionMinorUnits(transaction.amount, derivation.value.ownershipWeights);
            const issue =
                calculationResult.stage === "position"
                    ? {
                          accountId: transaction.accountId,
                          stage: "position" as const,
                          transactionId: transaction.id,
                          type: "unsafe-calculation" as const
                      }
                    : apportionmentIssue(
                          apportionmentResult,
                          calculationResult.stage,
                          transaction.id,
                          transaction.accountId
                      );
            if (issue != null) issues.push(issue);
            continue;
        }
        if (!canCommitCalculation(calculationResult.calculation, currency, positions, aggregates)) {
            issues.push({
                accountId: transaction.accountId,
                stage: "aggregate",
                transactionId: transaction.id,
                type: "unsafe-calculation"
            });
            continue;
        }

        commitCalculation(
            calculationResult.calculation,
            transaction.id,
            currency,
            positions,
            aggregates,
            contributions
        );
        qualifyingTransactionCount += 1;
    }

    contributions.sort(contributionOrder);
    return freezeResultGraph({
        contributions,
        issues,
        obligations: buildObligations(aggregates, contributions),
        positions: buildPositions(positions),
        qualifyingTransactionCount
    });
}
