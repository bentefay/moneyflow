/**
 * Domain Module
 *
 * Core business logic for financial calculations.
 */

export {
	type BalanceCalculationOptions,
	calculateAccountBalance,
	calculateAllAccountBalances,
	calculateRunningBalances,
	calculateSettlementBalances as calculateSimpleSettlementBalances,
	calculateTableRunningBalances,
	type TransactionWithBalance,
	useRunningBalances,
} from "./balance";

export {
	addOwner,
	createEqualOwnerships,
	isValidOwnership,
	normalizeOwnerships,
	OWNERSHIP_TOLERANCE,
	removeOwner,
	sumOwnerships,
	updateOwnerPercentage,
	validateOwnerships,
} from "./ownership";

export {
	calculateSettlementBalances,
	getBalancesForPerson,
	getNetBalanceForPerson,
	type SettlementBalance,
} from "./settlement";
