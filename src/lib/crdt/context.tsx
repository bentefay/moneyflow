"use client";

/**
 * Loro Mirror React Context
 *
 * Provides React context and hooks for accessing vault state using loro-mirror-react.
 * Use this for reactive, type-safe access to vault data throughout the app.
 */

import { createLoroContext } from "loro-mirror-react";
import {
  vaultSchema,
  type VaultState,
  type Person,
  type Account,
  type Tag,
  type Transaction,
} from "./schema";

/**
 * Create typed context and hooks for vault state management.
 *
 * Exports:
 * - VaultProvider: Wrap your app to provide vault state
 * - useVaultContext: Access the underlying Mirror instance
 * - useVaultState: Get [state, setState] tuple for full state access
 * - useVaultSelector: Subscribe to specific state slices (efficient)
 * - useVaultAction: Create memoized mutation callbacks
 */
const loroContext = createLoroContext(vaultSchema);

export const VaultContext = loroContext.LoroContext;
export const VaultProvider = loroContext.LoroProvider;
export const useVaultContext = loroContext.useLoroContext;
export const useVaultState = loroContext.useLoroState;
export const useVaultSelector = loroContext.useLoroSelector;
export const useVaultAction = loroContext.useLoroAction;

/**
 * Hook to get all people in the vault
 *
 * @example
 * ```tsx
 * const people = usePeople();
 * // Returns Record<string, Person>
 * ```
 */
export function usePeople() {
  return useVaultSelector((state) => state.people);
}

/**
 * Hook to get all accounts in the vault
 */
export function useAccounts() {
  return useVaultSelector((state) => state.accounts);
}

/**
 * Hook to get all tags in the vault
 */
export function useTags() {
  return useVaultSelector((state) => state.tags);
}

/**
 * Hook to get all statuses in the vault
 */
export function useStatuses() {
  return useVaultSelector((state) => state.statuses);
}

/**
 * Hook to get all transactions in the vault
 */
export function useTransactions() {
  return useVaultSelector((state) => state.transactions);
}

/**
 * Hook to get all imports in the vault
 */
export function useImports() {
  return useVaultSelector((state) => state.imports);
}

/**
 * Hook to get all import templates in the vault
 */
export function useImportTemplates() {
  return useVaultSelector((state) => state.importTemplates);
}

/**
 * Hook to get all automations in the vault
 */
export function useAutomations() {
  return useVaultSelector((state) => state.automations);
}

/**
 * Hook to get vault preferences
 */
export function useVaultPreferences() {
  return useVaultSelector((state) => state.preferences);
}

/**
 * Hook to get a specific person by ID
 */
export function usePerson(personId: string) {
  return useVaultSelector((state) => state.people[personId]);
}

/**
 * Hook to get a specific account by ID
 */
export function useAccount(accountId: string) {
  return useVaultSelector((state) => state.accounts[accountId]);
}

/**
 * Hook to get a specific tag by ID
 */
export function useTag(tagId: string) {
  return useVaultSelector((state) => state.tags[tagId]);
}

/**
 * Hook to get a specific transaction by ID
 */
export function useTransaction(transactionId: string) {
  return useVaultSelector((state) => state.transactions[transactionId]);
}

/**
 * Hook to get active (non-deleted) people
 */
export function useActivePeople() {
  return useVaultSelector((state) =>
    Object.fromEntries(
      Object.entries(state.people).filter(([, p]) => typeof p === "object" && !p.deletedAt)
    )
  );
}

/**
 * Hook to get active (non-deleted) accounts
 */
export function useActiveAccounts() {
  return useVaultSelector((state) =>
    Object.fromEntries(
      Object.entries(state.accounts).filter(([, a]) => typeof a === "object" && !a.deletedAt)
    )
  );
}

/**
 * Hook to get active (non-deleted) tags
 */
export function useActiveTags() {
  return useVaultSelector((state) =>
    Object.fromEntries(
      Object.entries(state.tags).filter(([, t]) => typeof t === "object" && !t.deletedAt)
    )
  );
}

/**
 * Hook to get active (non-deleted) transactions
 */
export function useActiveTransactions() {
  return useVaultSelector((state) =>
    Object.fromEntries(
      Object.entries(state.transactions).filter(([, t]) => typeof t === "object" && !t.deletedAt)
    )
  );
}
