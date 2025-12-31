# Feature Specification: Optional Account Currency & Accounts Page Improvements

**Feature Branch**: `003-account-currency-styling`  
**Created**: 2024-12-31  
**Status**: Draft  
**Input**: User description: "Update account modelling so that currency is optional. When optional it falls back to the vault currency (e.g. when showing on the accounts page - but make it clear its default to the vault currency). Improve the styling of the accounts page - the currency and owners columns are very close together, and the currency and balance has padding that makes it look misaligned compared to owners and type. Add a default person 'Me' to the vault on creation and use that as the default owner for the default account."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Accounts with Clear Currency Display (Priority: P1)

A user views the Accounts page and sees each account's currency clearly displayed. If an account uses the vault's default currency (no explicit currency set), the display shows the vault currency with a visual indicator (e.g., muted/italic text or "(default)" suffix) so users understand it's inherited from vault settings rather than explicitly set.

**Why this priority**: This is the core display change that affects how users understand their account configuration. Without clear visual distinction between explicit and inherited currency, users may be confused about which accounts will be affected if they change the vault's default currency.

**Independent Test**: Navigate to Accounts page with accounts that have both explicit currencies and inherited (null) currencies. Verify explicit currencies appear normally while inherited currencies show visual distinction.

**Acceptance Scenarios**:

1. **Given** an account with an explicit currency (e.g., EUR), **When** viewing the Accounts page, **Then** the currency displays as "EUR" in normal text styling.
2. **Given** an account with no explicit currency (null/undefined), **When** viewing the Accounts page, **Then** the currency displays as the vault's default currency with a visual indicator (e.g., muted text or "(default)" label).
3. **Given** the vault's default currency is changed, **When** viewing accounts with no explicit currency, **Then** their displayed currency updates to reflect the new default.

---

### User Story 2 - New Vault Includes Default "Me" Person and Account Owner (Priority: P1)

A new user creates their identity and unlocks MoneyFlow for the first time. The system automatically creates their vault with a default person named "Me" and assigns this person as the 100% owner of the default account. The user never sees "Account must have at least one owner" validation errors.

**Why this priority**: New users currently encounter confusing validation messages because the default account has no owners (since no people exist yet). This creates a poor first-run experience. By including "Me" as a default person and owner, users see a functional starting state they can customize.

**Independent Test**: Complete new user onboarding, verify the vault contains a "Me" person and the default account shows "Me (100%)" as owner.

**Acceptance Scenarios**:

1. **Given** a new user completing onboarding, **When** their vault is created, **Then** the vault includes a person named "Me".
2. **Given** a new vault is created, **When** viewing the default account, **Then** it shows "Me" as the owner with 100% ownership.
3. **Given** an existing vault (already created before this feature), **When** viewed, **Then** it continues to work without modification (backward compatible).

---

### User Story 3 - Properly Aligned Accounts Page Columns (Priority: P2)

A user views the Accounts page and all columns are visually well-aligned. The Type, Currency, Owners, and Balance columns have appropriate spacing and don't appear cramped or misaligned. The page looks professional and easy to scan.

**Why this priority**: Visual alignment improves readability and professional appearance. While not functionally critical, poor alignment creates cognitive friction when scanning account data.

**Independent Test**: Navigate to Accounts page with multiple accounts, visually verify column alignment matches header alignment and spacing is comfortable.

**Acceptance Scenarios**:

1. **Given** accounts exist in the vault, **When** viewing the Accounts page, **Then** all data columns align with their respective headers.
2. **Given** the Accounts table header, **When** viewing, **Then** Currency and Owners columns have sufficient visual separation (not cramped together).
3. **Given** accounts with varying balance lengths, **When** viewing, **Then** the Balance column remains right-aligned and visually consistent with other columns.

---

### User Story 4 - Create Account with Optional Currency (Priority: P2)

A user creates a new account and can optionally specify a currency. If they don't specify a currency, the account inherits from the vault's default currency. The create account dialog clearly indicates this optional behavior.

**Why this priority**: Complements US1 by ensuring new accounts can take advantage of the optional currency feature. Reduces friction for users who primarily work in a single currency.

**Independent Test**: Create a new account without selecting a currency, verify it displays with the vault's default currency indicator.

**Acceptance Scenarios**:

1. **Given** a user creating a new account, **When** they don't select a currency, **Then** the account is created with null currency (inherits from vault).
2. **Given** a user creating a new account, **When** they explicitly select a currency, **Then** the account is created with that specific currency.
3. **Given** the Create Account dialog, **When** displayed, **Then** the currency field shows a clear indication that it defaults to the vault currency if not selected.

---

### User Story 5 - Inline Edit All Account Settings (Priority: P2)

A user can edit all account settings directly from the Accounts page without opening a separate dialog. Clicking on any editable field (name, account number, type, currency, owners) transforms it into an inline editor. Changes save automatically or on blur/enter.

**Why this priority**: Inline editing reduces friction for common account management tasks. Users can quickly update multiple fields without modal interruptions, improving workflow efficiency.

**Independent Test**: Click on each editable field in an account row, verify it becomes editable inline and changes persist after saving.

**Acceptance Scenarios**:

1. **Given** an account row on the Accounts page, **When** the user clicks on the account name, **Then** it becomes an editable text input.
2. **Given** an account row, **When** the user clicks on the account type, **Then** it becomes a dropdown selector with available account types.
3. **Given** an account row, **When** the user clicks on the currency field, **Then** it becomes a dropdown selector showing "Use vault default" option plus explicit currency choices.
4. **Given** an inline edit in progress, **When** the user presses Enter or clicks away, **Then** the change is saved and the field returns to display mode.
5. **Given** an inline edit in progress, **When** the user presses Escape, **Then** the change is cancelled and the original value is restored.

---

### Edge Cases

- What happens when displaying an account with null currency but the vault has no default currency set? The system falls back to USD as the ultimate default.
- How does currency inheritance affect transaction imports? Imported transactions continue to use the account's resolved currency (explicit or inherited).
- What if a user deletes the "Me" person? The account ownership becomes empty (existing behavior), user can add other people as owners.
- What if the default account already has owners from a previous vault state? During migration/initialization, only add "Me" if the account has no owners.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow account currency to be optional (null/undefined).
- **FR-002**: System MUST display accounts with null currency using the vault's default currency with visual distinction (muted styling or explicit "(default)" indicator).
- **FR-003**: System MUST resolve account currency at display time: explicit currency → vault default → "USD" fallback.
- **FR-004**: System MUST create a default person named "Me" when initializing a new vault.
- **FR-005**: System MUST assign the "Me" person as 100% owner of the default account on new vault creation.
- **FR-006**: System MUST maintain backward compatibility with existing vaults (no data migration required for existing accounts).
- **FR-007**: Accounts page columns MUST be visually aligned with proper spacing between Type, Currency, Owners, and Balance columns.
- **FR-008**: The Create Account dialog MUST clearly indicate that currency is optional and defaults to vault currency.
- **FR-009**: System MUST allow users to explicitly set currency to a specific value or leave it as "use vault default".
- **FR-010**: All account fields (name, account number, type, currency) MUST be inline editable from the Accounts page.
- **FR-011**: Inline edits MUST save on Enter key or blur, and cancel on Escape key.
- **FR-012**: Currency inline editor MUST offer "Use vault default" as a selectable option alongside explicit currencies.

### Key Entities

- **Account**: Extended to allow `currency` field to be null/undefined (previously required). Resolution logic determines display currency.
- **Person**: New default person "Me" created on vault initialization. Stable ID: `person-default-me`.
- **Vault Preferences**: Existing `defaultCurrency` used as fallback for accounts with null currency.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: New users completing onboarding see a default account with "Me (100%)" as owner—no validation errors about missing owners.
- **SC-002**: Users can distinguish between accounts with explicit currency vs. inherited currency at a glance.
- **SC-003**: Accounts page columns are visually aligned—Currency, Owners, and Balance columns have consistent spacing that matches their headers.
- **SC-004**: Creating a new account without specifying currency results in an account that displays with the vault's default currency indicator.
- **SC-005**: Users can edit any account field (name, number, type, currency) inline without opening a dialog.

## Assumptions

- The vault's `defaultCurrency` preference is already implemented and defaults to "USD" if not set.
- The Create Account dialog exists and can be modified to make currency optional.
- Backward compatibility means existing accounts with explicit currencies continue to work unchanged.
