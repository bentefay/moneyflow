/**
 * Settlement Balance Calculation
 *
 * Calculates who owes whom based on transaction allocations and statuses.
 * Only transactions with statuses marked as "treatAsPaid" are included.
 *
 * The settlement algorithm:
 * 1. For each "treatAsPaid" transaction, calculate each person's share
 * 2. The person who paid (account owner) is owed their share minus what they own
 * 3. Aggregate all debts between person pairs
 * 4. Net out mutual debts (if A owes B $50 and B owes A $30, A owes B $20)
 */

import type { Person, Status, Transaction } from "@/lib/crdt/schema";
import type { MoneyMinorUnits } from "./currency";

export interface SettlementBalance {
	/** Person who owes money */
	personId: string;
	/** Person who is owed money (if undefined, this is a net balance) */
	owedToPersonId: string | undefined;
	/** Amount owed in minor units (positive = owes, negative = is owed) */
	amount: MoneyMinorUnits;
	/** Currency code */
	currency: string;
}

/**
 * Filters out loro-mirror's $cid injection from object entries.
 */
function filterCid<T>(record: Record<string, T>): Array<[string, T]> {
	return Object.entries(record).filter(([key]) => key !== "$cid");
}

/**
 * Gets status IDs that have "treatAsPaid" behavior.
 */
function getTreatAsPaidStatusIds(statuses: Record<string, Status>): Set<string> {
	const ids = new Set<string>();
	for (const [id, status] of filterCid(statuses)) {
		if (status && typeof status === "object" && status.behavior === "treatAsPaid") {
			ids.add(id);
		}
	}
	return ids;
}

/**
 * Calculates settlement balances between all people in the vault.
 *
 * @param transactions - All transactions in the vault
 * @param statuses - All statuses (to identify "treatAsPaid")
 * @param people - All people in the vault
 * @param accountCurrencies - Mapping of account ID to currency code
 * @returns Array of settlement balances
 */
export function calculateSettlementBalances(
	transactions: Record<string, Transaction>,
	statuses: Record<string, Status>,
	people: Record<string, Person>,
	accountCurrencies: Record<string, string>
): SettlementBalance[] {
	const treatAsPaidIds = getTreatAsPaidStatusIds(statuses);

	// Track debt between person pairs: Map<"debtorId:creditorId", amount>
	const debts = new Map<string, { amount: number; currency: string }>();

	// Process each transaction
	for (const [, transaction] of filterCid(transactions)) {
		if (!transaction || typeof transaction !== "object") continue;
		if (transaction.deletedAt) continue;
		if (!treatAsPaidIds.has(transaction.statusId)) continue;

		const allocations = transaction.allocations || {};
		const amount = transaction.amount as number;
		const currency = accountCurrencies[transaction.accountId] || "USD";

		// Skip if no allocations (no one owes anyone)
		const allocationEntries = filterCid(allocations as Record<string, number>);
		if (allocationEntries.length === 0) continue;

		// Get the primary account owner (person who paid)
		// For simplicity, we assume the first person in allocations with 100% owns the account
		// In a real implementation, this would come from account.ownerships
		// For now, we calculate based on who has non-zero allocation

		// Each person's share of the expense
		for (const [personId, percentage] of allocationEntries) {
			if (percentage === 0) continue;

			const personShare = Math.round((amount * percentage) / 100);

			// Find other people who should split with this person
			for (const [otherPersonId, otherPercentage] of allocationEntries) {
				if (otherPersonId === personId) continue;
				if (otherPercentage === 0) continue;

				// If this is an expense (negative), person A owes person B proportionally
				// This is simplified - real logic would track who paid vs who benefited
				// For now, we assume the person with higher allocation "paid"
				if (percentage > otherPercentage && amount < 0) {
					const otherShare = Math.round((Math.abs(amount) * otherPercentage) / 100);
					const key = `${otherPersonId}:${personId}`;
					const existing = debts.get(key);
					debts.set(key, {
						amount: (existing?.amount || 0) + otherShare,
						currency,
					});
				}
			}
		}
	}

	// Convert debts to settlement balances and net out mutual debts
	const netted = new Map<string, { amount: number; currency: string }>();

	for (const [key, debt] of debts) {
		const [debtorId, creditorId] = key.split(":");
		const reverseKey = `${creditorId}:${debtorId}`;
		const reverseDebt = debts.get(reverseKey);

		// Only process each pair once (when debtor < creditor alphabetically)
		if (debtorId > creditorId) continue;

		const forwardAmount = debt.amount;
		const reverseAmount = reverseDebt?.amount || 0;
		const netAmount = forwardAmount - reverseAmount;

		if (netAmount > 0) {
			netted.set(key, { amount: netAmount, currency: debt.currency });
		} else if (netAmount < 0) {
			netted.set(reverseKey, { amount: -netAmount, currency: debt.currency });
		}
	}

	// Also handle pairs where only reverse exists
	for (const [key, debt] of debts) {
		const [debtorId, creditorId] = key.split(":");
		if (debtorId <= creditorId) continue; // Already processed

		const forwardKey = `${creditorId}:${debtorId}`;
		if (debts.has(forwardKey)) continue; // Already processed

		netted.set(key, { amount: debt.amount, currency: debt.currency });
	}

	// Convert to SettlementBalance array
	return Array.from(netted.entries()).map(([key, { amount, currency }]) => {
		const [debtorId, creditorId] = key.split(":");
		return {
			personId: debtorId,
			owedToPersonId: creditorId,
			amount: amount as MoneyMinorUnits,
			currency,
		};
	});
}

/**
 * Calculates the net balance for a single person.
 *
 * @param personId - The person to calculate balance for
 * @param balances - All settlement balances
 * @returns Net amount (positive = owes money, negative = is owed money)
 */
export function getNetBalanceForPerson(
	personId: string,
	balances: SettlementBalance[]
): MoneyMinorUnits {
	let net = 0;

	for (const balance of balances) {
		if (balance.personId === personId) {
			net += balance.amount; // Person owes this amount
		}
		if (balance.owedToPersonId === personId) {
			net -= balance.amount; // Person is owed this amount
		}
	}

	return net as MoneyMinorUnits;
}

/**
 * Gets all balances involving a specific person.
 *
 * @param personId - The person to filter by
 * @param balances - All settlement balances
 * @returns Balances where this person is debtor or creditor
 */
export function getBalancesForPerson(
	personId: string,
	balances: SettlementBalance[]
): SettlementBalance[] {
	return balances.filter((b) => b.personId === personId || b.owedToPersonId === personId);
}
