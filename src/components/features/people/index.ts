/**
 * People Components
 *
 * Components for managing people in a vault.
 */

export { BalanceSummary, type BalanceSummaryProps } from "./BalanceSummary";
export { InviteLinkGenerator, type InviteLinkGeneratorProps } from "./InviteLinkGenerator";
export { PeopleTable, type PeopleTableProps } from "./PeopleTable";
export { PersonRow, type PersonRowProps } from "./PersonRow";
export { buildAllocationEntries } from "./settlement-allocations";
export {
    buildSettlementView,
    resolvePersonLabel,
    type SettlementAllocationEntry,
    type SettlementCurrencySection,
    type SettlementIssueSummary,
    type SettlementObligationView,
    type SettlementPersonLabel,
    type SettlementSourceRow,
    type SettlementView,
    type SettlementViewInput,
    type SettlementViewPerson,
    type SettlementViewState,
    type SettlementViewTransaction,
    summarizeIssues
} from "./settlement-view";
