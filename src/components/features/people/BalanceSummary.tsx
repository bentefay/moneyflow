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
import type { Person, Status, Transaction } from "@/lib/crdt/schema";
import { Currencies } from "@/lib/domain/currencies";
import {
	asMinorUnits,
	createCurrencyFormatter,
	getCurrency,
	type MoneyMinorUnits,
} from "@/lib/domain/currency";
import { calculateSettlementBalances, type SettlementBalance } from "@/lib/domain/settlement";
import { cn } from "@/lib/utils";

export interface BalanceSummaryProps {
	/** All people in the vault */
	people: Record<string, Person>;
	/** All transactions in the vault */
	transactions: Record<string, Transaction>;
	/** All statuses in the vault (to identify "Treat as Paid") */
	statuses: Record<string, Status>;
	/** Account ID to currency mapping */
	accountCurrencies: Record<string, string>;
	/** Current user's person ID (to highlight their balances) */
	currentPersonId?: string;
	/** Currency to display balances in (default: USD) */
	displayCurrency?: string;
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
	accountCurrencies,
	currentPersonId,
	displayCurrency = "USD",
	className,
}: BalanceSummaryProps) {
	// Calculate settlement balances
	const balances = useMemo(() => {
		return calculateSettlementBalances(transactions, statuses, people, accountCurrencies);
	}, [transactions, statuses, people, accountCurrencies]);

	// Get currency formatter
	const currency = getCurrency(displayCurrency) || Currencies.USD;
	const formatter = createCurrencyFormatter(currency, "en-US");

	// Filter out zero balances and get unique relationships
	const significantBalances = useMemo(() => {
		// Group by person pairs (debtor -> creditor)
		const pairs = new Map<string, SettlementBalance>();

		for (const balance of balances) {
			if (balance.amount === 0) continue;

			const key =
				balance.amount > 0
					? `${balance.personId}:${balance.owedToPersonId}`
					: `${balance.owedToPersonId}:${balance.personId}`;

			const existing = pairs.get(key);
			if (existing) {
				// Consolidate amounts
				const newAmount =
					(existing.amount as number) +
					(balance.amount > 0 ? (balance.amount as number) : -(balance.amount as number));
				pairs.set(key, { ...existing, amount: newAmount as MoneyMinorUnits });
			} else {
				pairs.set(key, {
					personId: balance.amount > 0 ? balance.personId : balance.owedToPersonId!,
					owedToPersonId: balance.amount > 0 ? balance.owedToPersonId : balance.personId,
					amount: Math.abs(balance.amount as number) as MoneyMinorUnits,
					currency: balance.currency,
				});
			}
		}

		return Array.from(pairs.values()).filter((b) => b.amount !== 0);
	}, [balances]);

	// Get person name by ID (filtering out $cid)
	const getPersonName = (personId: string | undefined): string => {
		if (!personId) return "Unknown";
		const person = people[personId];
		if (!person || typeof person !== "object") return "Unknown";
		return person.name || "Unknown";
	};

	// Check if balance involves current user
	const involvesCurrentUser = (balance: SettlementBalance): boolean => {
		return balance.personId === currentPersonId || balance.owedToPersonId === currentPersonId;
	};

	if (significantBalances.length === 0) {
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
					<p className="text-center text-muted-foreground text-sm">🎉 Everyone is settled up!</p>
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
					{significantBalances.map((balance, index) => {
						const isCurrentUserOwes = balance.personId === currentPersonId;
						const isCurrentUserOwed = balance.owedToPersonId === currentPersonId;

						return (
							<div
								key={`${balance.personId}-${balance.owedToPersonId}-${index}`}
								className={cn(
									"flex items-center justify-between rounded-lg border p-3",
									involvesCurrentUser(balance) && "border-primary/20 bg-accent/50"
								)}
							>
								<div className="flex items-center gap-2">
									<span className={cn("font-medium", isCurrentUserOwes && "text-destructive")}>
										{getPersonName(balance.personId)}
									</span>
									<ArrowRight className="h-4 w-4 text-muted-foreground" />
									<span
										className={cn(
											"font-medium",
											isCurrentUserOwed && "text-green-600 dark:text-green-400"
										)}
									>
										{getPersonName(balance.owedToPersonId)}
									</span>
								</div>
								<span
									className={cn(
										"font-mono font-semibold",
										isCurrentUserOwes && "text-destructive",
										isCurrentUserOwed && "text-green-600 dark:text-green-400"
									)}
								>
									{formatter.format(asMinorUnits(balance.amount))}
								</span>
							</div>
						);
					})}
				</div>

				{currentPersonId && (
					<p className="mt-4 text-muted-foreground text-xs">
						Balances involving you are highlighted.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
