"use client";

/**
 * BalanceSummary Component
 *
 * Shows a summary of who owes whom based on transaction allocations.
 * Only considers transactions with "Treat as Paid" status for settlement.
 */

import { ArrowRight, Scale } from "lucide-react";
import { useMemo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllTransactions } from "@/lib/crdt/queries";
import type { Account, Person, Status, TransactionStore } from "@/lib/crdt/schema";
import { getEntriesOfLoroMap } from "@/lib/crdt/utils";
import { Currencies } from "@/lib/domain/currencies";
import { asMinorUnits, createCurrencyFormatter, getCurrency } from "@/lib/domain/currency";
import { calculateSettlementBalances, type SettlementObligation } from "@/lib/domain/settlement";
import { cn } from "@/lib/utils";

export interface BalanceSummaryProps {
    /** All retained accounts, including historical soft-deleted accounts. */
    accounts: Record<string, Account | string>;
    /** All people in the vault (loro-mirror map with $cid) */
    people: Record<string, Person | string>;
    /** All transactions in the vault (hierarchical store) */
    transactions: TransactionStore;
    /** All statuses in the vault (loro-mirror map with $cid) */
    statuses: Record<string, Status | string>;
    /** Current user's person ID (to highlight their balances) */
    currentPersonId?: string;
    /** Vault currency fallback used when an account has no explicit currency. */
    vaultDefaultCurrency?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Displays settlement balances between vault members.
 */
export function BalanceSummary({
    people,
    transactions,
    statuses,
    accounts,
    currentPersonId,
    vaultDefaultCurrency,
    className
}: BalanceSummaryProps) {
    const result = useMemo(() => {
        const allTransactions = getAllTransactions(transactions);
        return calculateSettlementBalances(
            allTransactions,
            accounts,
            statuses,
            vaultDefaultCurrency
        );
    }, [accounts, statuses, transactions, vaultDefaultCurrency]);

    const obligationsByCurrency = useMemo(() => {
        const grouped = new Map<string, SettlementObligation[]>();
        for (const obligation of result.obligations) {
            const obligations = grouped.get(obligation.currency) ?? [];
            obligations.push(obligation);
            grouped.set(obligation.currency, obligations);
        }
        return Array.from(grouped.entries());
    }, [result.obligations]);

    // Build person lookup map (filtering out $cid)
    const personMap = useMemo(() => {
        const map = new Map<string, Person>();
        for (const [id, person] of getEntriesOfLoroMap(people)) {
            map.set(id, person);
        }
        return map;
    }, [people]);

    // Get person name by ID
    const getPersonName = (personId: string | undefined): string => {
        if (!personId) return "Unknown";
        const person = personMap.get(personId);
        return person?.name || `Unknown (${personId})`;
    };

    // Check if balance involves current user
    const involvesCurrentUser = (obligation: SettlementObligation): boolean => {
        return (
            obligation.debtorPersonId === currentPersonId ||
            obligation.creditorPersonId === currentPersonId
        );
    };

    if (result.issues.length > 0) {
        const affectedTransactionCount = new Set(
            result.issues.map(({ transactionId }) => transactionId)
        ).size;
        return (
            <Card className={cn("border-destructive/50 w-full", className)}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Scale className="h-5 w-5" />
                        Settlement incomplete
                    </CardTitle>
                    <CardDescription>
                        {affectedTransactionCount}{" "}
                        {affectedTransactionCount === 1 ? "transaction needs" : "transactions need"}{" "}
                        attention before balances can be trusted.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (result.obligations.length === 0) {
        return (
            <Card className={cn("w-full", className)}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Scale className="h-5 w-5" />
                        Settlement Summary
                    </CardTitle>
                    <CardDescription>No outstanding balances between members.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center text-sm">
                        🎉 Everyone is settled up!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("w-full", className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Scale className="h-5 w-5" />
                    Settlement Summary
                </CardTitle>
                <CardDescription>
                    Based on transactions marked with &quot;Treat as Paid&quot; status.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {obligationsByCurrency.map(([currencyCode, obligations]) => {
                        const currency = getCurrency(currencyCode) ?? Currencies.USD;
                        const formatter = createCurrencyFormatter(currency, "en-US");
                        return (
                            <section key={currencyCode} className="space-y-2">
                                <h3 className="text-sm font-semibold">{currencyCode}</h3>
                                {obligations.map((obligation) => {
                                    const isCurrentUserOwes =
                                        obligation.debtorPersonId === currentPersonId;
                                    const isCurrentUserOwed =
                                        obligation.creditorPersonId === currentPersonId;

                                    return (
                                        <div
                                            key={`${currencyCode}:${obligation.debtorPersonId}:${obligation.creditorPersonId}`}
                                            className={cn(
                                                "flex items-center justify-between rounded-lg border p-3",
                                                involvesCurrentUser(obligation) &&
                                                    "border-primary/20 bg-accent/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cn(
                                                        "font-medium",
                                                        isCurrentUserOwes && "text-destructive"
                                                    )}
                                                >
                                                    {getPersonName(obligation.debtorPersonId)}
                                                </span>
                                                <ArrowRight className="text-muted-foreground h-4 w-4" />
                                                <span
                                                    className={cn(
                                                        "font-medium",
                                                        isCurrentUserOwed &&
                                                            "text-green-600 dark:text-green-400"
                                                    )}
                                                >
                                                    {getPersonName(obligation.creditorPersonId)}
                                                </span>
                                            </div>
                                            <span
                                                className={cn(
                                                    "font-mono font-semibold",
                                                    isCurrentUserOwes && "text-destructive",
                                                    isCurrentUserOwed &&
                                                        "text-green-600 dark:text-green-400"
                                                )}
                                            >
                                                {formatter.format(
                                                    asMinorUnits(obligation.amountMinor)
                                                )}
                                            </span>
                                        </div>
                                    );
                                })}
                            </section>
                        );
                    })}
                </div>

                {currentPersonId && (
                    <p className="text-muted-foreground mt-4 text-xs">
                        Balances involving you are highlighted.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
