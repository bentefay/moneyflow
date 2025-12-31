# Feature Specification: Vault Settings & Navigation Improvements

**Feature Branch**: `002-vault-settings`  
**Created**: 31 December 2025  
**Status**: Draft  
**Input**: User description: "Vault settings page with default currency, navigation improvements including renaming Settings to Vault Settings, removing dashboard page, fixing accounts page alignment, and consistent menu styling"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Configure Vault Default Currency (Priority: P1)

A user creates a new vault and wants to set their preferred default currency for all new accounts and transactions. They navigate to the Vault Settings page where they can select from a list of supported currencies. Once saved, new accounts created in this vault will default to the selected currency.

**Why this priority**: Setting the default currency is essential for international users and multi-currency households. Without this, users must manually change currency on every account they create, which is tedious and error-prone.

**Independent Test**: Create a new vault, verify the settings page opens automatically, select a non-USD currency (e.g., EUR), create a new account, and verify the account defaults to EUR.

**Acceptance Scenarios**:

1. **Given** a user has just created a new vault, **When** they complete vault creation, **Then** they are automatically taken to the Vault Settings page
2. **Given** a user is on the Vault Settings page, **When** they select a currency from the dropdown and save, **Then** the default currency is persisted to the vault
3. **Given** a vault has a default currency set to EUR, **When** a user creates a new account, **Then** the account's currency field defaults to EUR

---

### User Story 2 - Access Vault Settings from Navigation (Priority: P1)

A user wants to change their vault's default currency after initial setup. They click on "Vault Settings" in the sidebar navigation and are taken to a settings page where they can modify vault-level preferences.

**Why this priority**: Users need ongoing access to vault settings, not just during creation. The renamed menu item ("Settings" → "Vault Settings") clarifies that these settings apply to the current vault scope.

**Independent Test**: Log in to an existing vault, click "Vault Settings" in the sidebar, verify the page loads with the vault's current settings displayed.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing any app page, **When** they look at the sidebar navigation, **Then** they see "Vault Settings" (not "Settings") in the bottom navigation section
2. **Given** a user clicks "Vault Settings" in navigation, **When** the page loads, **Then** they see the current vault's default currency pre-selected

---

### User Story 3 - Navigate to Transactions on Existing Vault Open (Priority: P2)

A returning user opens an existing vault and wants to immediately see their transaction list rather than an empty dashboard placeholder. The system takes them directly to the Transactions page, which is the most commonly used feature.

**Why this priority**: The dashboard page is currently a placeholder and provides no value. Defaulting to transactions gives users immediate access to their primary task—managing financial records.

**Independent Test**: Log in with an existing vault, verify the user lands on the Transactions page instead of Dashboard.

**Acceptance Scenarios**:

1. **Given** a user unlocks the app with an existing vault selected, **When** the app loads, **Then** they are taken to the Transactions page
2. **Given** a user clicks the "MoneyFlow" logo in the sidebar, **When** navigating from another page, **Then** they are taken to the Transactions page

---

### User Story 4 - View Account Details Clearly (Priority: P2)

A user viewing the Accounts page can clearly see each account's details in properly aligned columns. The currency, account number, and owners are displayed in separate, distinct columns. If an account has no account number set, a helpful placeholder text appears indicating this can be configured.

**Why this priority**: The current accounts table has alignment issues making it difficult to scan account information. Clear visual hierarchy improves usability for users managing multiple accounts.

**Independent Test**: Navigate to Accounts page, view an account row, verify columns (Type, Currency, Owners, Balance) are visually distinct and properly aligned.

**Acceptance Scenarios**:

1. **Given** a user is on the Accounts page, **When** they view the table header and rows, **Then** each column (Type, Currency, Owners, Balance) is clearly separated and aligned
2. **Given** an account has no account number set, **When** viewing the account row, **Then** the user sees placeholder text "No account number yet" in muted styling
3. **Given** an account has owners assigned, **When** viewing the Owners column, **Then** owner names are displayed in their own column, not merged with currency

---

### User Story 5 - Consistent Interactive Menu Styling (Priority: P3)

A user interacting with the sidebar navigation experiences consistent visual feedback across all menu items. All clickable items show a pointer cursor on hover and have consistent hover states, making it clear they are interactive.

**Why this priority**: Inconsistent interaction cues (like missing pointer cursor on "Lock") create confusion about what elements are clickable. Consistent styling improves perceived quality and usability.

**Independent Test**: Hover over each navigation item including "Lock", verify pointer cursor appears and hover styles are consistent.

**Acceptance Scenarios**:

1. **Given** a user hovers over the "Lock" menu item, **When** the cursor is over it, **Then** the cursor changes to pointer and a hover state is displayed
2. **Given** a user hovers over any navigation item, **When** comparing hover states, **Then** all items have consistent visual treatment (same hover background, cursor, text color changes)

---

### Edge Cases

- What happens when the vault has no default currency set? → System defaults to USD as fallback
- How does the system handle currency changes on existing accounts? → Existing accounts retain their set currency; only new accounts use the vault default
- What if a user navigates directly to /dashboard via URL? → The route still exists but redirects to /transactions

## Requirements _(mandatory)_

### Functional Requirements

**Vault Settings Page**
- **FR-001**: System MUST provide a Vault Settings page accessible from the sidebar navigation
- **FR-002**: Vault Settings page MUST display a currency selector with all supported currencies
- **FR-003**: System MUST persist the selected default currency to the vault's CRDT state
- **FR-004**: System MUST display the vault name on the settings page (read-only initially)

**Navigation Changes**
- **FR-005**: System MUST rename "Settings" navigation item to "Vault Settings"
- **FR-006**: System MUST navigate new vault users to Vault Settings page after vault creation
- **FR-007**: System MUST navigate existing vault users to Transactions page as default landing
- **FR-008**: System MUST update the logo link to navigate to Transactions instead of Dashboard
- **FR-009**: System MUST remove Dashboard from the main navigation items
- **FR-010**: Direct URL access to /dashboard MUST redirect to /transactions

**Accounts Page Fixes**
- **FR-011**: Accounts table MUST display columns in clearly aligned, separate sections
- **FR-012**: Account rows MUST show "No account number yet" placeholder when account number is empty
- **FR-013**: Owners column MUST be visually distinct from the Currency column

**Menu Consistency**
- **FR-014**: All sidebar navigation items (including "Lock") MUST display pointer cursor on hover
- **FR-015**: All sidebar navigation items MUST use consistent interactive styling

**Currency Default Behavior**
- **FR-016**: New accounts MUST default to the vault's default currency when set
- **FR-017**: System MUST fall back to USD when no vault default currency is configured

### Key Entities

- **Vault Settings**: Vault-level preferences including default currency. Stored within the vault's CRDT document alongside accounts, transactions, etc.
- **Default Currency**: ISO 4217 currency code (e.g., "USD", "EUR", "GBP") that determines the pre-selected currency when creating new accounts within the vault.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can set a default currency within 30 seconds of accessing Vault Settings
- **SC-002**: New vault users land on the settings page within 2 seconds of vault creation
- **SC-003**: Returning users land on the transactions page within 2 seconds of unlock
- **SC-004**: 100% of sidebar navigation items display pointer cursor on hover
- **SC-005**: Account table columns are visually distinct with no text overlap or mashing together
- **SC-006**: Users can identify an account without an account number by seeing placeholder text

## Assumptions

- The existing list of supported currencies in `src/lib/domain/currencies.ts` is comprehensive and will be used for the currency selector
- Vault settings are stored in the vault's CRDT document, consistent with the existing architecture
- The "Lock" functionality (clearing session and redirecting to /unlock) remains unchanged; only styling is updated
- Dashboard will be re-introduced in a future feature when actual dashboard functionality is built
