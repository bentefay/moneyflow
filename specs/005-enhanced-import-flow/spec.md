# Feature Specification: Enhanced Import Flow

**Feature Branch**: `005-enhanced-import-flow`  
**Created**: 3 January 2026  
**Status**: Draft  
**Input**: Enhanced import flow with configurable duplicate detection, side-by-side raw/preview table UI, tabbed configuration, account selection, and whitespace options

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Side-by-Side Import Preview (Priority: P1)

A user imports a CSV or OFX file and sees both the raw file data and the parsed preview in a unified table, allowing them to configure the import while seeing real-time results.

**Why this priority**: This is the core UX change that makes the entire import flow more intuitive and efficient. Users can see cause-and-effect instantly.

**Independent Test**: Can be fully tested by dropping a file and verifying the split-table displays raw data on the left and parsed preview on the right, updating as settings change.

**Acceptance Scenarios**:

1. **Given** a user is on the import page, **When** they drop a CSV file, **Then** a split table appears with raw columns on the left (unformatted) and preview columns on the right (formatted like transaction table), separated by a strong vertical line.
2. **Given** a file is loaded, **When** the user changes column mappings in the tabs, **Then** the preview columns update immediately to reflect the new mapping.
3. **Given** the screen width is narrow, **When** the import view renders, **Then** the table stacks vertically (raw above, preview below) instead of side-by-side.
4. **Given** a file is loaded, **When** the user views the table, **Then** summary statistics (total rows, valid transactions, rows with errors) are displayed prominently.

---

### User Story 2 - Tabbed Configuration Panel (Priority: P1)

A user configures the import using tabs instead of a step-by-step wizard, allowing non-linear access to all settings while the preview remains visible.

**Why this priority**: Enables users to jump directly to the setting they need without navigating through wizard steps sequentially.

**Independent Test**: Can be tested by loading a file and verifying all configuration tabs are accessible in any order, with changes reflected immediately in preview.

**Acceptance Scenarios**:

1. **Given** a file is loaded, **When** the import panel displays, **Then** tabs are shown for: Template, Column Mapping, Formatting, Duplicates, and Account.
2. **Given** the user is on any tab, **When** they click a different tab, **Then** that tab's content displays immediately without losing previous settings.
3. **Given** the user is on any tab, **When** they click the Import button, **Then** the import proceeds with current settings (import is always available, not gated by steps).
4. **Given** a CSV file is loaded, **When** auto-detection runs, **Then** column mappings and formatting are automatically applied without requiring user clicks on "auto-detect" buttons.

---

### User Story 3 - Account Selection for Import (Priority: P1)

A user selects which account to import transactions into, with smart defaults for OFX files that contain account information.

**Why this priority**: Transactions must be associated with an account; this is required for the import to complete.

**Independent Test**: Can be tested by importing files and verifying account selection is required for CSV and smart-defaulted for OFX.

**Acceptance Scenarios**:

1. **Given** a user loads a CSV file, **When** they view the Account tab, **Then** they must select an account from the dropdown (required field, no default).
2. **Given** a user loads an OFX file with account ID "12345", **When** that ID matches an existing account's external ID, **Then** that account is pre-selected.
3. **Given** a user loads an OFX file with account ID "12345", **When** no existing account has that external ID, **Then** the user must select an account manually.
4. **Given** a user selects an account that has no external ID, **When** the OFX file contains an account number, **Then** after import, the selected account's external ID is set to the OFX account number.
5. **Given** the import button is clicked without an account selected, **When** CSV is the file type, **Then** validation prevents import and highlights the Account tab.

---

### User Story 4 - Configurable Duplicate Detection (Priority: P2)

A user configures how duplicates are detected, choosing between exact matching or fuzzy matching with configurable tolerances.

**Why this priority**: Different banks format transactions differently; users need control over duplicate sensitivity.

**Independent Test**: Can be tested by importing files with near-duplicate transactions and verifying detection changes based on settings.

**Acceptance Scenarios**:

1. **Given** a user is on the Duplicates tab, **When** they view the settings, **Then** they see options for: date tolerance (exact or within X days) and description matching (exact or similar with threshold).
2. **Given** date tolerance is set to "within 3 days", **When** an imported transaction has a date 2 days different from an existing transaction with same amount, **Then** it is flagged as a potential duplicate.
3. **Given** description matching is set to "similar (60% threshold)", **When** an imported transaction has "AMAZON MARKETPLACE" and existing has "AMAZON.COM", **Then** similarity is calculated and compared against threshold.
4. **Given** duplicate detection is configured, **When** duplicates are found, **Then** they are only detected against existing transactions in the same account (not against other transactions in the import file or other accounts).

---

### User Story 5 - Old Transaction Filtering (Priority: P2)

A user configures how to handle transactions older than a certain threshold, allowing automatic filtering of historical data they've already imported.

**Why this priority**: Prevents re-importing old transactions when users download overlapping statement periods.

**Independent Test**: Can be tested by importing a file with old and new transactions and verifying filtering based on cutoff settings.

**Acceptance Scenarios**:

1. **Given** the account has existing transactions with newest dated Jan 15, **When** cutoff is set to 10 days with "ignore duplicates" mode, **Then** the cutoff date is Jan 5.
2. **Given** cutoff date is Jan 5 with "ignore duplicates" mode, **When** an imported transaction dated Jan 3 is a duplicate, **Then** it is skipped (not imported).
3. **Given** cutoff date is Jan 5 with "ignore duplicates" mode, **When** an imported transaction dated Jan 3 is NOT a duplicate, **Then** it is imported.
4. **Given** cutoff date is Jan 5 with "ignore duplicates" mode, **When** an imported transaction dated Jan 10 is a duplicate, **Then** it is imported (flagged as duplicate).
5. **Given** cutoff date is Jan 5 with "ignore all" mode, **When** any imported transaction is dated before Jan 5, **Then** it is skipped regardless of duplicate status.
6. **Given** cutoff is set to "do not ignore", **When** any transaction is imported, **Then** all transactions are imported regardless of age (duplicates flagged but included).

---

### User Story 6 - Whitespace Normalization (Priority: P3)

A user chooses to collapse excessive whitespace in descriptions during import, cleaning up poorly formatted bank data.

**Why this priority**: Nice-to-have formatting improvement; not blocking for core import functionality.

**Independent Test**: Can be tested by importing a file with multi-space descriptions and verifying normalization when enabled.

**Acceptance Scenarios**:

1. **Given** the user is on the Formatting tab, **When** they view options, **Then** there is a checkbox for "Collapse whitespace in descriptions".
2. **Given** the checkbox is enabled, **When** a description contains "AMAZON    MARKETPLACE   INC", **Then** the preview shows "AMAZON MARKETPLACE INC".
3. **Given** the checkbox is disabled, **When** a description contains multiple spaces, **Then** the preview preserves the original whitespace.

---

### Edge Cases

- What happens when the account has no existing transactions? The cutoff date has no reference point, so all transactions are treated as "new" (within cutoff).
- What happens when user tries to delete the last account? Deletion is blocked with a message explaining at least one account must exist.
- What happens when OFX account ID matches multiple accounts? First match is used (accounts should have unique external IDs).
- What happens when import file has zero valid rows? Import is disabled with clear error message.
- What happens when all rows are filtered out by old transaction cutoff? Warning is displayed but import can proceed (imports nothing).

## Requirements _(mandatory)_

### Functional Requirements

**UI/Layout:**

- **FR-001**: System MUST display a split-table view with raw file data on the left and parsed preview on the right, separated by a strong vertical border.
- **FR-002**: System MUST display raw data columns unformatted (as they appear in the file).
- **FR-003**: System MUST display preview columns formatted consistently with the main transaction table (formatted dates, formatted amounts, status indicators).
- **FR-004**: System MUST stack the table vertically (raw above, preview below) on narrow screens.
- **FR-005**: System MUST display summary statistics: total rows, valid transactions, rows with errors, duplicate count.
- **FR-006**: System MUST replace the current wizard with a tabbed panel using animate-ui tabs component.
- **FR-007**: System MUST allow the Import button to be clicked from any tab (not gated by step completion).
- **FR-008**: System MUST auto-apply detection (column mappings, date format, number format) without requiring "auto-detect" button clicks.

**Account Selection:**

- **FR-009**: System MUST require account selection for CSV imports (no default).
- **FR-010**: System MUST pre-select account for OFX imports when the OFX account ID matches an existing account's external ID.
- **FR-011**: System MUST require manual account selection for OFX imports when no account ID match exists.
- **FR-012**: System MUST update the selected account's external ID with the OFX account number if the account doesn't already have an external ID.
- **FR-013**: System MUST prevent deletion of the last account in a vault.

**Duplicate Detection:**

- **FR-014**: System MUST support configurable date tolerance for duplicate detection (exact match, or within X days, default 3 days).
- **FR-015**: System MUST support configurable description matching (exact match, or similar with configurable threshold, default 60%).
- **FR-016**: System MUST only compare imported transactions against existing transactions in the same account.
- **FR-017**: System MUST NOT compare transactions within the same import file against each other for duplicate detection (duplicates are only detected against existing account data).

**Old Transaction Filtering:**

- **FR-018**: System MUST support configurable cutoff (X days older than newest existing transaction, default 10 days).
- **FR-019**: System MUST support three modes for old transactions: "ignore all", "ignore duplicates" (default), "do not ignore".
- **FR-020**: System MUST import all transactions newer than the cutoff (duplicates flagged but included).
- **FR-021**: System MUST apply the selected mode only to transactions older than the cutoff.

**Formatting:**

- **FR-022**: System MUST support optional whitespace collapsing in descriptions (multiple spaces → single space).

**Templates:**

- **FR-023**: System MUST preserve existing template functionality (save, load, delete templates).
- **FR-024**: System MUST preserve existing column mapping functionality.
- **FR-025**: System MUST preserve existing date/number format detection and configuration.
- **FR-026**: System MUST auto-save a template on first import if no templates exist, capturing all current settings (column mappings, formatting, duplicate detection, old transaction cutoff).
- **FR-027**: System MUST auto-select the most recently used template when starting a new import.
- **FR-028**: System MUST allow users to duplicate an existing template to create a modified version.
- **FR-029**: System MUST allow users to create a new template with reset/default settings.

### Key Entities

- **Import Configuration**: Settings for a single import session including account, duplicate detection settings, old transaction cutoff settings, and formatting options.
- **Account External ID**: Optional identifier on accounts used to match OFX account numbers for auto-selection.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can complete a typical import (drop file → import) in under 60 seconds when using defaults.
- **SC-002**: Users can see the effect of any configuration change in the preview within 500ms.
- **SC-003**: Duplicate detection correctly identifies 95%+ of true duplicates while flagging fewer than 5% false positives with default settings.
- **SC-004**: Users can access any import setting with at most 2 clicks (select tab, change setting).
- **SC-005**: Import preview accurately reflects final import result (what you see is what you get).
- **SC-006**: Old transaction filtering reduces average import size by 30%+ for users re-importing overlapping statement periods.

## Assumptions

- A default account always exists in the vault (created during vault setup).
- Existing import templates remain compatible with the new tabbed UI.
- The animate-ui tabs component is compatible with the existing shadcn/ui setup.
- OFX files contain account identifiers in a standard field that can be extracted reliably.
- Users typically import monthly statements with 10-30 days of overlap with previous imports.

## Clarifications

### Session 2026-01-03

- Q: Should import settings be remembered between import sessions? → A: Yes, settings saved per-template in vault. First import auto-saves a template which is auto-selected for future imports. Users can create new templates, duplicate existing ones, or delete them.
