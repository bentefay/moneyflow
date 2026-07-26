"use client";

/**
 * BalanceSummary Component
 *
 * Renders the canonical settlement result on the People page: who owes whom, grouped into separate
 * per-currency sections, each obligation expandable to the source transactions that explain it.
 *
 * The component is a pure consumer of the sole production settlement engine. It never persists a
 * settlement cache and it never combines, converts or compares amounts across currencies — there is
 * deliberately no grand total anywhere in this file.
 */

import { AlertTriangle, ArrowRight, ChevronRight, Scale } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolvePersonDisplayName } from "@/lib/crdt/person";
import { getAllTransactions } from "@/lib/crdt/queries";
import type { Account, Person, Status, TransactionStore } from "@/lib/crdt/schema";
import { getEntriesOfLoroMap } from "@/lib/crdt/utils";
import { Currencies } from "@/lib/domain/currencies";
import { asMinorUnits, createCurrencyFormatter, getCurrency } from "@/lib/domain/currency";
import { calculateSettlementBalances } from "@/lib/domain/settlement";
import { cn } from "@/lib/utils";

import { buildAllocationEntries } from "./settlement-allocations";
import {
    buildSettlementView,
    type SettlementCurrencySection,
    type SettlementObligationView,
    type SettlementSourceRow,
    type SettlementViewPerson,
    type SettlementViewTransaction
} from "./settlement-view";

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
    /** Resolves a transaction's description alias to its display name. */
    resolveDescription?: (transactionId: string, description: string) => string;
    /** Vault currency fallback used when an account has no explicit currency. */
    vaultDefaultCurrency?: string;
    /** Additional CSS classes */
    className?: string;
}

function formatSignedPercentage(value: string): string {
    return `${value}%`;
}

/**
 * Displays canonical settlement obligations between vault members.
 */
export function BalanceSummary({
    people,
    transactions,
    statuses,
    accounts,
    currentPersonId,
    resolveDescription,
    vaultDefaultCurrency,
    className
}: BalanceSummaryProps) {
    const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(() => new Set());

    const result = useMemo(
        () => calculateSettlementBalances(transactions, accounts, statuses, vaultDefaultCurrency),
        [accounts, statuses, transactions, vaultDefaultCurrency]
    );

    const peopleById = useMemo(() => {
        const map = new Map<string, SettlementViewPerson>();
        for (const [id, person] of getEntriesOfLoroMap(people)) {
            map.set(id, {
                deleted: person.deletedAt != null,
                name: resolvePersonDisplayName(person)
            });
        }
        return map;
    }, [people]);

    const resolvePerson = useCallback((personId: string) => peopleById.get(personId), [peopleById]);

    const transactionsById = useMemo(() => {
        const map = new Map<string, SettlementViewTransaction>();
        for (const transaction of getAllTransactions(transactions)) {
            const account = accounts[transaction.accountId];
            const storedDescription = transaction.description ?? "";
            map.set(transaction.id, {
                accountName: typeof account === "object" ? account.name : "Unknown account",
                allocations: buildAllocationEntries(
                    transaction.allocations,
                    typeof account === "object" ? account.ownerships : undefined,
                    resolvePerson
                ),
                date: transaction.date.toString(),
                description:
                    resolveDescription?.(transaction.id, storedDescription) ?? storedDescription
            });
        }
        return map;
    }, [accounts, resolveDescription, resolvePerson, transactions]);

    const resolveTransaction = useCallback(
        (transactionId: string) => transactionsById.get(transactionId),
        [transactionsById]
    );

    const view = useMemo(
        () =>
            buildSettlementView({
                linkedPersonId: currentPersonId,
                resolvePerson,
                result,
                resolveTransaction
            }),
        [currentPersonId, resolvePerson, result, resolveTransaction]
    );

    const toggleExpanded = useCallback((key: string) => {
        setExpandedKeys((current) => {
            const next = new Set(current);
            if (!next.delete(key)) next.add(key);
            return next;
        });
    }, []);

    if (view.state.kind === "incomplete") {
        const { affectedTransactionCount, reasons } = view.state.summary;
        return (
            <Card
                className={cn("border-destructive/50 w-full", className)}
                data-testid="settlement-summary"
            >
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <AlertTriangle className="text-destructive h-5 w-5" />
                        Settlement incomplete
                    </CardTitle>
                    <CardDescription data-testid="settlement-incomplete-count">
                        {affectedTransactionCount}{" "}
                        {affectedTransactionCount === 1 ? "transaction needs" : "transactions need"}{" "}
                        attention and {affectedTransactionCount === 1 ? "is" : "are"} excluded from
                        the amounts below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                        {reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        );
    }

    if (view.state.kind === "no-qualifying-transactions") {
        return (
            <Card className={cn("w-full", className)} data-testid="settlement-summary">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Scale className="h-5 w-5" />
                        Settlement Summary
                    </CardTitle>
                    <CardDescription data-testid="settlement-no-qualifying">
                        No transactions have a Treat-as-Paid status yet, so there is nothing to
                        settle.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (view.state.kind === "settled") {
        return (
            <Card className={cn("w-full", className)} data-testid="settlement-summary">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Scale className="h-5 w-5" />
                        Settlement Summary
                    </CardTitle>
                    <CardDescription>No outstanding balances between members.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p
                        className="text-muted-foreground text-center text-sm"
                        data-testid="settlement-settled"
                    >
                        Everyone is settled up
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("w-full", className)} data-testid="settlement-summary">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Scale className="h-5 w-5" />
                    Settlement Summary
                </CardTitle>
                <CardDescription>
                    Based on transactions marked with a Treat-as-Paid status. Each currency is
                    settled separately.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {view.state.sections.map((section) => (
                        <CurrencySection
                            key={section.currency}
                            expandedKeys={expandedKeys}
                            onToggleExpanded={toggleExpanded}
                            section={section}
                        />
                    ))}
                </div>

                {currentPersonId != null && (
                    <p className="text-muted-foreground mt-4 text-xs">
                        Balances involving you are highlighted.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

interface CurrencySectionProps {
    readonly expandedKeys: ReadonlySet<string>;
    readonly onToggleExpanded: (key: string) => void;
    readonly section: SettlementCurrencySection;
}

function CurrencySection({ expandedKeys, onToggleExpanded, section }: CurrencySectionProps) {
    const formatter = useMemo(
        () => createCurrencyFormatter(getCurrency(section.currency) ?? Currencies.USD, "en-US"),
        [section.currency]
    );

    return (
        <section
            aria-labelledby={`settlement-currency-${section.currency}`}
            className="space-y-2"
            data-testid={`settlement-currency-section-${section.currency}`}
        >
            <h3 className="text-sm font-semibold" id={`settlement-currency-${section.currency}`}>
                {section.currency}
            </h3>
            {section.obligations.map((obligation) => (
                <ObligationRow
                    key={obligation.key}
                    formatAmount={formatter.format}
                    isExpanded={expandedKeys.has(obligation.key)}
                    obligation={obligation}
                    onToggleExpanded={onToggleExpanded}
                />
            ))}
        </section>
    );
}

interface ObligationRowProps {
    readonly formatAmount: (amountMinor: ReturnType<typeof asMinorUnits>) => string;
    readonly isExpanded: boolean;
    readonly obligation: SettlementObligationView;
    readonly onToggleExpanded: (key: string) => void;
}

function ObligationRow({
    formatAmount,
    isExpanded,
    obligation,
    onToggleExpanded
}: ObligationRowProps) {
    const sourcesId = `settlement-sources-${obligation.key}`;

    return (
        <div
            className={cn(
                "rounded-lg border",
                obligation.involvesLinkedPerson && "border-primary/40 bg-accent/50"
            )}
            data-testid={`settlement-obligation-${obligation.key}`}
        >
            <button
                aria-controls={sourcesId}
                aria-expanded={isExpanded}
                className="flex w-full items-center justify-between gap-2 p-3 text-left"
                onClick={() => onToggleExpanded(obligation.key)}
                type="button"
            >
                <span className="flex min-w-0 items-center gap-2">
                    <ChevronRight
                        aria-hidden="true"
                        className={cn(
                            "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
                            isExpanded && "rotate-90"
                        )}
                    />
                    <span className="truncate font-medium">{obligation.debtor.text}</span>
                    <ArrowRight
                        aria-hidden="true"
                        className="text-muted-foreground h-4 w-4 shrink-0"
                    />
                    <span className="truncate font-medium">{obligation.creditor.text}</span>
                </span>
                <span className="font-mono font-semibold">
                    {formatAmount(asMinorUnits(obligation.amountMinor))}
                </span>
            </button>

            {isExpanded && (
                <ul className="space-y-2 border-t p-3" id={sourcesId}>
                    {obligation.sources.map((source) => (
                        <SourceRow
                            key={source.transactionId}
                            formatAmount={formatAmount}
                            source={source}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

interface SourceRowProps {
    readonly formatAmount: (amountMinor: ReturnType<typeof asMinorUnits>) => string;
    readonly source: SettlementSourceRow;
}

function SourceRow({ formatAmount, source }: SourceRowProps) {
    return (
        <li
            className="flex flex-wrap items-start justify-between gap-2 text-sm"
            data-testid={`settlement-source-${source.transactionId}`}
        >
            <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground tabular-nums">{source.date}</span>
                    <span className="font-medium">{source.description || "No description"}</span>
                    <span className="text-muted-foreground">{source.accountName}</span>
                </div>
                {source.allocations.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                        {source.allocations.map((entry, index) => (
                            <span key={entry.personId}>
                                {index > 0 && " · "}
                                {entry.person.text}:{" "}
                                {entry.explicitPercentage == null
                                    ? "no explicit allocation"
                                    : `explicit ${formatSignedPercentage(entry.explicitPercentage)}`}
                                {", effective "}
                                {formatSignedPercentage(entry.effectivePercentage)}
                            </span>
                        ))}
                    </p>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono tabular-nums">
                    {formatAmount(asMinorUnits(source.amountMinor))}
                </span>
                <Link
                    className="text-primary text-xs underline underline-offset-2"
                    href={`/transactions?transaction=${encodeURIComponent(source.transactionId)}`}
                >
                    View transaction
                </Link>
            </div>
        </li>
    );
}
