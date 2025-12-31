/**
 * Vault Default Initialization
 *
 * Provides functions to initialize a new vault with default entities:
 * - Default account: "Default" (user can rename/edit later)
 * - Default statuses: "For Review", "Paid" (with "Treat as Paid" behavior)
 *
 * This is called when creating a new vault to ensure users never see an empty state.
 */

import type { AccountInput, StatusInput, VaultInput } from "./schema";

/**
 * Default account ID (stable for reference in code)
 */
export const DEFAULT_ACCOUNT_ID = "account-default";

/**
 * Default account for a new vault.
 *
 * Users can rename or edit this account later.
 * It serves as a starting point so new vaults aren't empty.
 */
export const DEFAULT_ACCOUNT: AccountInput = {
	id: DEFAULT_ACCOUNT_ID,
	name: "Default",
	accountNumber: "",
	currency: "USD",
	accountType: "checking",
	balance: 0,
	ownerships: {},
	deletedAt: 0,
};

/**
 * Default status IDs (stable for reference in code)
 */
export const DEFAULT_STATUS_IDS = {
	FOR_REVIEW: "status-for-review",
	PAID: "status-paid",
} as const;

/**
 * Default statuses for a new vault.
 *
 * - "For Review": No behavior, transactions pending review
 * - "Paid": Has "treatAsPaid" behavior, included in settlement calculations
 *
 * Note: Empty string for behavior means "no special behavior"
 * Note: deletedAt of 0 means "not deleted"
 */
export const DEFAULT_STATUSES: Record<string, StatusInput> = {
	[DEFAULT_STATUS_IDS.FOR_REVIEW]: {
		id: DEFAULT_STATUS_IDS.FOR_REVIEW,
		name: "For Review",
		behavior: "", // No special behavior
		isDefault: true,
		deletedAt: 0, // Not deleted
	},
	[DEFAULT_STATUS_IDS.PAID]: {
		id: DEFAULT_STATUS_IDS.PAID,
		name: "Paid",
		behavior: "treatAsPaid",
		isDefault: true,
		deletedAt: 0, // Not deleted
	},
};

/**
 * Returns the default initial state for a new vault.
 *
 * Includes:
 * - Default statuses ("For Review", "Paid")
 * - Empty collections for all other entities
 * - Default preferences
 */
export function getDefaultVaultState(): VaultInput {
	return {
		people: {},
		accounts: { [DEFAULT_ACCOUNT_ID]: { ...DEFAULT_ACCOUNT } },
		tags: {},
		statuses: { ...DEFAULT_STATUSES },
		transactions: {},
		imports: {},
		importTemplates: {},
		automations: {},
		automationApplications: {},
		preferences: {
			automationCreationPreference: "manual",
			defaultCurrency: "USD",
		},
	};
}

/**
 * Initializes a vault draft with default entities.
 *
 * Call this within a setState() mutation to add defaults to a new vault:
 *
 * ```ts
 * mirror.setState((draft) => {
 *   initializeVaultDefaults(draft);
 * });
 * ```
 *
 * @param draft - The vault draft to initialize (from loro-mirror setState)
 */
export function initializeVaultDefaults(draft: VaultInput): void {
	// Add default account if it doesn't exist
	if (!draft.accounts[DEFAULT_ACCOUNT_ID]) {
		draft.accounts[DEFAULT_ACCOUNT_ID] = { ...DEFAULT_ACCOUNT };
	}

	// Add default statuses if they don't exist
	for (const [id, status] of Object.entries(DEFAULT_STATUSES)) {
		if (!draft.statuses[id]) {
			draft.statuses[id] = status;
		}
	}

	// Ensure preferences exist with defaults
	if (!draft.preferences) {
		draft.preferences = {
			automationCreationPreference: "manual",
			defaultCurrency: "USD",
		};
	}
}

/**
 * Checks if a vault has been initialized with defaults.
 *
 * @param state - The vault state to check
 * @returns true if default account and statuses exist
 */
export function hasVaultDefaults(state: {
	accounts: Record<string, unknown>;
	statuses: Record<string, unknown>;
}): boolean {
	return (
		DEFAULT_ACCOUNT_ID in state.accounts &&
		DEFAULT_STATUS_IDS.FOR_REVIEW in state.statuses &&
		DEFAULT_STATUS_IDS.PAID in state.statuses
	);
}
