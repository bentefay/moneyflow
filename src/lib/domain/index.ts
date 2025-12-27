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
  calculateSettlementBalances,
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
