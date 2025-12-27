/**
 * Domain Module
 *
 * Core business logic for financial calculations.
 */

export {
  calculateRunningBalances,
  calculateTableRunningBalances,
  calculateAccountBalance,
  calculateAllAccountBalances,
  calculateSettlementBalances as calculateSimpleSettlementBalances,
  useRunningBalances,
  type TransactionWithBalance,
  type BalanceCalculationOptions,
} from "./balance";

export {
  sumOwnerships,
  validateOwnerships,
  isValidOwnership,
  normalizeOwnerships,
  createEqualOwnerships,
  addOwner,
  removeOwner,
  updateOwnerPercentage,
  OWNERSHIP_TOLERANCE,
} from "./ownership";

export {
  calculateSettlementBalances,
  getNetBalanceForPerson,
  getBalancesForPerson,
  type SettlementBalance,
} from "./settlement";
