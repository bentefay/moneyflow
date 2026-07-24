/**
 * Domain Module
 *
 * Core business logic for financial calculations.
 */

export {
    type AllocationPercentage,
    AllocationPercentageSchema,
    type AllocationSetValidationResult,
    type AllocationValidationError,
    type ApportionmentError,
    apportionMinorUnits,
    deriveEffectiveAllocations,
    type EffectiveAllocationDerivation,
    type EffectiveAllocationResult,
    type ExactDecimalString,
    type ExactPercentageWeights,
    type ExactPercentageWeightsValidationResult,
    type MinorUnitApportionmentResult,
    type ValidatedAllocationSet,
    validateExactPercentageWeights,
    validateAllocationSet
} from "./allocation";
export {
    type BalanceCalculationOptions,
    calculateAccountBalance,
    calculateAllAccountBalances,
    calculateRunningBalances,
    calculateSettlementBalances as calculateSimpleSettlementBalances,
    calculateTableRunningBalances,
    type TransactionWithBalance,
    useRunningBalances
} from "./balance";
export {
    addOwner,
    createEqualOwnerships,
    isValidOwnership,
    normalizeOwnerships,
    OWNERSHIP_TOLERANCE,
    type OwnershipPercentage,
    OwnershipPercentageSchema,
    type OwnershipSetValidationResult,
    type OwnershipValidationError,
    removeOwner,
    sumOwnerships,
    updateOwnerPercentage,
    type ValidatedOwnershipSet,
    validateOwnershipSet,
    validateOwnerships
} from "./ownership";
export {
    calculateSettlementBalances,
    getBalancesForPerson,
    getNetBalanceForPerson,
    type SettlementBalance
} from "./settlement";
export {
    DEFAULT_TAG_COLOR,
    getContrastingTextColor,
    getNextTagColor,
    isValidHexColor,
    normalizeTagColor,
    TAG_COLOR_PALETTE,
    type TagColor
} from "./tag-colors";
