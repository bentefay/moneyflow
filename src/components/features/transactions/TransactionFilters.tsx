"use client";

/**
 * Transaction Filters
 *
 * Container component for all transaction filter controls.
 * Includes date range, tags, people, accounts, status, and search filters.
 */

import { cn } from "@/lib/utils";
import { DateRangeFilter, type DateRange } from "./filters/DateRangeFilter";
import { MultiSelectFilter, type FilterOption } from "./filters/MultiSelectFilter";
import { SearchFilter } from "./filters/SearchFilter";

export interface TransactionFiltersState {
  dateRange: DateRange;
  tagIds: string[];
  personIds: string[];
  accountIds: string[];
  statusIds: string[];
  search: string;
  showDuplicatesOnly: boolean;
}

export interface TransactionFiltersProps {
  /** Current filter state */
  filters: TransactionFiltersState;
  /** Callback when any filter changes */
  onChange: (filters: TransactionFiltersState) => void;
  /** Available tags for filtering */
  availableTags?: FilterOption[];
  /** Available people for filtering */
  availablePeople?: FilterOption[];
  /** Available accounts for filtering */
  availableAccounts?: FilterOption[];
  /** Available statuses for filtering */
  availableStatuses?: FilterOption[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Create initial empty filter state.
 */
export function createEmptyFilters(): TransactionFiltersState {
  return {
    dateRange: { start: null, end: null },
    tagIds: [],
    personIds: [],
    accountIds: [],
    statusIds: [],
    search: "",
    showDuplicatesOnly: false,
  };
}

/**
 * Check if any filters are active.
 */
export function hasActiveFilters(filters: TransactionFiltersState): boolean {
  return (
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null ||
    filters.tagIds.length > 0 ||
    filters.personIds.length > 0 ||
    filters.accountIds.length > 0 ||
    filters.statusIds.length > 0 ||
    filters.search !== "" ||
    filters.showDuplicatesOnly
  );
}

/**
 * Transaction filters component.
 */
export function TransactionFilters({
  filters,
  onChange,
  availableTags = [],
  availablePeople = [],
  availableAccounts = [],
  availableStatuses = [],
  className,
}: TransactionFiltersProps) {
  const updateFilter = <K extends keyof TransactionFiltersState>(
    key: K,
    value: TransactionFiltersState[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onChange(createEmptyFilters());
  };

  const activeFilterCount =
    (filters.dateRange.start || filters.dateRange.end ? 1 : 0) +
    (filters.tagIds.length > 0 ? 1 : 0) +
    (filters.personIds.length > 0 ? 1 : 0) +
    (filters.accountIds.length > 0 ? 1 : 0) +
    (filters.statusIds.length > 0 ? 1 : 0) +
    (filters.search ? 1 : 0) +
    (filters.showDuplicatesOnly ? 1 : 0);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search bar - full width */}
      <SearchFilter
        value={filters.search}
        onChange={(search) => updateFilter("search", search)}
        placeholder="Search merchant, description..."
        className="w-full"
      />

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date range */}
        <DateRangeFilter
          value={filters.dateRange}
          onChange={(dateRange) => updateFilter("dateRange", dateRange)}
        />

        {/* Tags */}
        {availableTags.length > 0 && (
          <MultiSelectFilter
            placeholder="Tags"
            options={availableTags}
            selectedIds={filters.tagIds}
            onChange={(tagIds) => updateFilter("tagIds", tagIds)}
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            }
          />
        )}

        {/* People */}
        {availablePeople.length > 0 && (
          <MultiSelectFilter
            placeholder="People"
            options={availablePeople}
            selectedIds={filters.personIds}
            onChange={(personIds) => updateFilter("personIds", personIds)}
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
          />
        )}

        {/* Accounts */}
        {availableAccounts.length > 0 && (
          <MultiSelectFilter
            placeholder="Accounts"
            options={availableAccounts}
            selectedIds={filters.accountIds}
            onChange={(accountIds) => updateFilter("accountIds", accountIds)}
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            }
          />
        )}

        {/* Statuses */}
        {availableStatuses.length > 0 && (
          <MultiSelectFilter
            placeholder="Status"
            options={availableStatuses}
            selectedIds={filters.statusIds}
            onChange={(statusIds) => updateFilter("statusIds", statusIds)}
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        )}

        {/* Duplicates toggle */}
        <button
          type="button"
          onClick={() => updateFilter("showDuplicatesOnly", !filters.showDuplicatesOnly)}
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
            "hover:bg-accent focus:ring-primary focus:ring-2 focus:outline-none",
            filters.showDuplicatesOnly && "border-primary bg-primary/10"
          )}
        >
          <svg
            className={cn("h-4 w-4", filters.showDuplicatesOnly && "text-primary")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className={cn(filters.showDuplicatesOnly && "font-medium")}>Duplicates</span>
        </button>

        {/* Clear all filters */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground text-sm hover:underline"
          >
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  );
}
