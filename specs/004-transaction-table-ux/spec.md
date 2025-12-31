# Feature Specification: Transaction Table UX Improvements

**Feature Branch**: `004-transaction-table-ux`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "Transaction table UX improvements - inline editing with minimalist always-editable cells, checkbox column for bulk selection, bulk operations for tags/description/amount, column alignment fixes, merchant/description field separation, account column, Temporal API date formatting, actions column"

## Clarifications

### Session 2025-12-31

- Q: What should the final column order be for the transaction table? → A: Checkbox → Date → Merchant → Account → Tags → Status → Amount → Balance → Actions
- Q: Should the transaction table include keyboard navigation between cells? → A: Yes, full arrow key navigation (↑↓←→) between cells when not editing

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Inline Cell Editing (Priority: P1)

A user viewing their transactions wants to quickly edit any field (date, merchant, tags, status, amount) by simply clicking on it, without any visual transition or "mode switch". The cells should always appear subtly editable (minimalist input styling) so clicking feels natural and there's no jarring UI change.

**Why this priority**: Inline editing is the primary interaction pattern for transaction management. Users spend most of their time reviewing and correcting transaction data. A seamless, jitter-free editing experience is critical for productivity.

**Independent Test**: Can be fully tested by clicking any cell, editing the value, and verifying the change persists and syncs. Delivers immediate value by enabling rapid transaction correction.

**Acceptance Scenarios**:

1. **Given** a user viewing the transaction table, **When** they look at any editable cell, **Then** the cell has a subtle input appearance (faint border, monospace font for numbers) that indicates it's editable.
2. **Given** a user viewing a cell, **When** they single-click on it, **Then** focus moves to that cell's input and a cursor appears—no visual "mode switch" or layout shift occurs.
3. **Given** a user editing a cell, **When** they press Enter or Tab, **Then** the value is saved, synced to other users, and focus moves appropriately (Tab moves to next cell, Enter confirms).
4. **Given** a user editing a cell, **When** they press Escape, **Then** the edit is cancelled and the original value is restored.
5. **Given** a user editing a cell, **When** they click outside the cell, **Then** the value is saved automatically.
6. **Given** multiple users viewing the same vault, **When** one user edits a cell, **Then** the other user sees the change in near real-time (<500ms).

---

### User Story 2 - Checkbox Selection Column (Priority: P1)

A user wants to select multiple transactions using checkboxes so they can perform bulk operations. The header checkbox should select all transactions matching the current filter, even those not currently rendered due to virtualization.

**Why this priority**: Bulk operations are essential for managing large transaction sets (e.g., tagging 50 imported transactions at once). Without checkboxes, users must tediously click each row.

**Independent Test**: Can be fully tested by checking individual checkboxes, using the header checkbox, and verifying selection state. Delivers value by enabling efficient multi-select.

**Acceptance Scenarios**:

1. **Given** a user viewing the transaction table, **When** they see the leftmost column, **Then** there is a checkbox in each row and a checkbox in the header.
2. **Given** a user clicking a row's checkbox, **When** the click completes, **Then** that transaction is selected (checkbox checked) without selecting the row for editing.
3. **Given** a user with some transactions selected, **When** they click the header checkbox, **Then** ALL transactions matching the current filter are selected (not just visible/rendered rows).
4. **Given** a user with all filtered transactions selected, **When** they click the header checkbox, **Then** all transactions are deselected.
5. **Given** a user with some (but not all) filtered transactions selected, **When** they view the header checkbox, **Then** it shows an indeterminate state (dash or partial fill).
6. **Given** a user holding Shift and clicking a checkbox, **When** they already have a checkbox selected, **Then** all transactions between the two are selected (range select).

---

### User Story 3 - Bulk Edit Operations (Priority: P1)

A user with multiple transactions selected wants to bulk-edit tags, description, or amount to save time when categorizing or correcting imported data.

**Why this priority**: After importing transactions, users often need to apply the same tags or corrections to many rows. Bulk editing dramatically reduces repetitive work.

**Independent Test**: Can be fully tested by selecting multiple transactions, using the bulk edit toolbar, and verifying all selected transactions are updated. Delivers value by reducing manual effort.

**Acceptance Scenarios**:

1. **Given** a user with 2+ transactions selected, **When** the selection exists, **Then** a bulk edit toolbar appears at the bottom of the screen.
2. **Given** the bulk edit toolbar visible, **When** the user clicks "Set Tags", **Then** a tag picker opens allowing them to select tags to apply (replaces existing tags on all selected transactions).
3. **Given** the bulk edit toolbar visible, **When** the user clicks "Set Description", **Then** a text input appears allowing them to set a description on all selected transactions.
4. **Given** the bulk edit toolbar visible, **When** the user clicks "Set Amount", **Then** a number input appears allowing them to set the amount on all selected transactions.
5. **Given** a bulk edit action completed, **When** the changes are applied, **Then** all selected transactions are updated simultaneously and synced to other users.
6. **Given** a bulk edit in progress, **When** the user presses Escape, **Then** the bulk edit is cancelled without changes.

---

### User Story 4 - Inline Tag Creation (Priority: P2)

A user editing a transaction's tags wants to quickly create a new tag without leaving the inline editor. The "Create" option should always be visible, not only when search yields no results.

**Why this priority**: Tag creation during transaction review is a common workflow. Hiding the create option until "no results" slows users down and requires them to type the full name first.

**Independent Test**: Can be fully tested by opening the tag editor, typing a new tag name, and clicking the always-visible "Create" button. Delivers value by streamlining categorization.

**Acceptance Scenarios**:

1. **Given** a user editing the Tags cell, **When** the tag dropdown opens, **Then** they see a "Create [typed value]" option at the bottom of the dropdown (always visible, even with matches).
2. **Given** a user typing in the tag search, **When** matches exist, **Then** the "Create" button remains visible below the matching tags.
3. **Given** a user clicking "Create [tag name]", **When** the action completes, **Then** a new tag is created with that name and immediately added to the transaction.
4. **Given** a newly created tag, **When** the user views the Tags page, **Then** the tag appears in the list.
5. **Given** a user creating a tag that matches an automation rule, **When** the tag is added, **Then** automation rules are re-evaluated.

---

### User Story 5 - Merchant/Description Field Separation (Priority: P2)

A user wants to see the merchant (payee) as the primary identifier in the main row, with the ability to add a longer description/memo that expands below the row. This matches how bank statements work (merchant is primary, memo is supplementary).

**Why this priority**: Merchant names are the primary way users identify transactions. Descriptions/memos are secondary context that clutters the main view. Separation improves scanability.

**Independent Test**: Can be fully tested by viewing merchants in the main row, clicking the "add description" action, and verifying the description appears below. Delivers value by improving transaction identification.

**Acceptance Scenarios**:

1. **Given** a user viewing a transaction row, **When** they see the main columns, **Then** there is a "Merchant" column (renamed from "Description") showing the payee name.
2. **Given** a transaction without a description, **When** the user views the Actions column, **Then** they see an "Add description" button/icon.
3. **Given** a user clicking "Add description", **When** the action triggers, **Then** an editable description row expands below the transaction, spanning all columns.
4. **Given** a transaction with an existing description, **When** the user views the row, **Then** the description is visible in the expanded area below, and the action shows "Edit description".
5. **Given** a user editing the description, **When** they press Enter or click away, **Then** the description is saved and the expanded row can be collapsed.
6. **Given** a search/filter for text, **When** the user searches, **Then** both merchant and description fields are searched.

---

### User Story 6 - Account Column (Priority: P2)

A user wants to see which account each transaction belongs to in a dedicated column, not buried below the description/merchant.

**Why this priority**: When viewing transactions across multiple accounts, the account is essential context. Hiding it below another field makes scanning difficult.

**Independent Test**: Can be fully tested by viewing transactions from multiple accounts and verifying the Account column shows clearly. Delivers value by improving multi-account workflows.

**Acceptance Scenarios**:

1. **Given** a user viewing the transaction table, **When** they see the columns, **Then** there is a dedicated "Account" column.
2. **Given** a transaction row, **When** the user views the Account column, **Then** it displays the account name clearly.
3. **Given** a user clicking on the Account cell, **When** they edit it, **Then** they can change the transaction's account via a dropdown selector.
4. **Given** multiple accounts with different currencies, **When** the user views the Account column, **Then** the currency is indicated (e.g., "Checking (USD)").

---

### User Story 7 - Column Alignment Consistency (Priority: P2)

A user expects column headers to align with their cell content. Currently, Status is right-aligned in cells but left-aligned in headers, causing visual disconnect.

**Why this priority**: Visual consistency is a fundamental UX principle. Misaligned columns make the interface feel unpolished and harder to scan.

**Independent Test**: Can be fully tested by visually inspecting column headers and cell content for alignment consistency. Delivers value by improving visual polish.

**Acceptance Scenarios**:

1. **Given** any column with right-aligned cell content (Amount, Balance), **When** the user views the header, **Then** the header text is also right-aligned.
2. **Given** any column with left-aligned cell content (Date, Merchant, Account), **When** the user views the header, **Then** the header text is also left-aligned.
3. **Given** any column with center-aligned cell content (Status, Tags), **When** the user views the header, **Then** the header text is also center-aligned.
4. **Given** the entire table, **When** the user scans vertically, **Then** content and headers align precisely with no visual offset.

---

### User Story 8 - Date Formatting with Temporal API (Priority: P3)

A user expects dates to be formatted according to their locale settings, using the modern Temporal API for consistency and correctness.

**Why this priority**: Locale-appropriate date formatting is expected in modern applications. The Temporal API provides better timezone and locale handling than legacy Date methods.

**Independent Test**: Can be fully tested by viewing dates and verifying they match the browser's locale settings. Delivers value by improving internationalization.

**Acceptance Scenarios**:

1. **Given** a user with a US locale, **When** they view a date, **Then** it displays as "Dec 31, 2025" (or similar US format).
2. **Given** a user with a UK locale, **When** they view a date, **Then** it displays as "31 Dec 2025" (or similar UK format).
3. **Given** a user with a German locale, **When** they view a date, **Then** it displays as "31. Dez. 2025" (or similar German format).
4. **Given** date formatting, **When** implemented, **Then** it uses the Temporal API (not legacy Date.toLocaleDateString) for consistency.
5. **Given** a user editing a date, **When** they open the date picker, **Then** the date picker respects locale settings (week start day, format).

---

### User Story 9 - Actions Column (Priority: P3)

A user wants a dedicated rightmost column for row-level actions (add description, delete, etc.) rather than having actions hidden or scattered.

**Why this priority**: Explicit action buttons improve discoverability and reduce cognitive load. Users don't have to hunt for actions or remember keyboard shortcuts.

**Independent Test**: Can be fully tested by clicking action buttons and verifying the corresponding action executes. Delivers value by improving action discoverability.

**Acceptance Scenarios**:

1. **Given** a user viewing a transaction row, **When** they see the rightmost column, **Then** there is an "Actions" column with action buttons/icons.
2. **Given** the Actions column, **When** the user sees available actions, **Then** they include: add/edit description, delete transaction, and potentially more (automation, duplicate resolution).
3. **Given** a user hovering over an action icon, **When** they pause, **Then** a tooltip explains the action.
4. **Given** a user clicking the delete action, **When** the click occurs, **Then** a confirmation prompt appears before deletion.
5. **Given** limited row space, **When** there are many actions, **Then** they are accessible via a "more" menu (three-dot icon).

---

### Edge Cases

- What happens when a user bulk-edits 1000+ transactions? → Operation is batched to prevent UI freeze; progress indicator shown.
- What happens when checkbox select-all is clicked with 10,000 filtered transactions? → All IDs are collected (not just rendered); warning shown if count exceeds threshold (e.g., 500).
- What happens when two users bulk-edit the same transactions simultaneously? → CRDT merge applies both changes; last-write-wins for conflicting fields.
- What happens when a user tries to create a tag that already exists? → Existing tag is selected instead of creating a duplicate.
- What happens when inline editing conflicts with keyboard shortcuts? → When a cell is focused for editing, global shortcuts (k, d, etc.) are disabled.
- What happens when the Temporal API polyfill is needed? → Graceful fallback to Intl.DateTimeFormat with same locale settings.
- What happens when a transaction has no merchant (manual entry)? → Merchant shows placeholder "No merchant" in muted text; still editable.
- What happens when description row is expanded and user scrolls? → Expanded row scrolls with its parent transaction (virtualization aware).
- What happens when amount is bulk-set to a negative value? → Allowed; respects the sign for expense/income.

## Requirements _(mandatory)_

### Functional Requirements

**Inline Cell Editing**

- **FR-001**: All editable cells MUST have a minimalist, always-visible input appearance (subtle border, appropriate font).
- **FR-002**: Single-click on any editable cell MUST activate editing without layout shift or visual transition.
- **FR-003**: Enter key MUST save and confirm the edit; Tab MUST save and move to next editable cell.
- **FR-004**: Escape key MUST cancel the edit and restore the original value.
- **FR-005**: Clicking outside an active cell MUST save the current value automatically.
- **FR-006**: Cell edits MUST sync to other users in near real-time (<500ms).
- **FR-006a**: Arrow keys (↑↓←→) MUST navigate between cells when not in edit mode.
- **FR-006b**: Arrow key navigation MUST be disabled when a cell is actively being edited (to allow cursor movement within text).

**Checkbox Selection**

- **FR-007**: Transaction table MUST have a leftmost checkbox column with a header checkbox.
- **FR-008**: Row checkboxes MUST toggle individual transaction selection without triggering row edit mode.
- **FR-009**: Header checkbox MUST select/deselect ALL transactions matching the current filter (including non-rendered rows).
- **FR-010**: Header checkbox MUST show indeterminate state when some (but not all) filtered transactions are selected.
- **FR-011**: Shift+click on checkboxes MUST select all transactions in the range.
- **FR-012**: Selected transaction IDs MUST be tracked even for virtualized (non-rendered) rows.

**Bulk Edit Operations**

- **FR-013**: Bulk edit toolbar MUST appear when 2+ transactions are selected.
- **FR-014**: Bulk edit MUST support setting tags (add/remove) on all selected transactions.
- **FR-015**: Bulk edit MUST support setting description on all selected transactions.
- **FR-016**: Bulk edit MUST support setting amount on all selected transactions.
- **FR-017**: Bulk edit operations MUST apply to all selected transactions atomically.
- **FR-018**: Bulk edit MUST show progress indicator for operations on 100+ transactions.

**Inline Tag Creation**

- **FR-019**: Tag editor dropdown MUST always show a "Create [typed value]" option at the bottom.
- **FR-020**: "Create" option MUST be visible even when matching tags exist.
- **FR-021**: Creating a tag MUST immediately add it to the transaction and persist it to the vault.

**Merchant/Description Separation**

- **FR-022**: "Description" column MUST be renamed to "Merchant" (reflecting payee/vendor name).
- **FR-023**: System MUST support a separate "description" field for each transaction (memo/notes).
- **FR-024**: Description MUST be displayed in an expandable row below the main transaction row.
- **FR-025**: Actions column MUST include "Add description" / "Edit description" action.
- **FR-026**: Search and filter MUST search both merchant and description fields.
- **FR-027**: _(Future Scope)_ Automation conditions SHOULD support matching against merchant OR description fields separately.

**Account Column**

- **FR-028**: Transaction table MUST have a dedicated "Account" column (not embedded in another column).
- **FR-029**: Account column MUST display account name and optionally currency indicator.
- **FR-030**: Account cell MUST be editable via dropdown selector.

**Column Alignment**

- **FR-031**: Column headers MUST align with their cell content (left, center, or right).
- **FR-032**: Amount and Balance columns MUST be right-aligned (header and cells).
- **FR-033**: Date, Merchant, and Account columns MUST be left-aligned (header and cells).
- **FR-033a**: Column order MUST be: Checkbox → Date → Merchant → Account → Tags → Status → Amount → Balance → Actions.

**Date Formatting**

- **FR-034**: Dates MUST be formatted according to the user's browser locale.
- **FR-035**: Date formatting MUST use the Temporal API via `@js-temporal/polyfill`.
- **FR-036**: Date picker MUST respect locale settings (week start day, date format).

**Actions Column**

- **FR-037**: Transaction table MUST have a rightmost "Actions" column.
- **FR-038**: Actions column MUST include: add/edit description, delete transaction.
- **FR-039**: Delete action MUST require confirmation before executing.
- **FR-040**: Actions MUST be accessible via icons with tooltips.

### Key Entities

- **Transaction.merchant**: String field containing the payee/vendor name (previously "description").
- **Transaction.description**: Optional string field containing user-added notes/memo.
- **Transaction expanded state**: UI state tracking which transactions have their description row expanded.
- **Selection state**: Set of transaction IDs currently selected (supports virtualized selection).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can edit any cell with a single click and zero layout shift.
- **SC-002**: Bulk selection of 500 transactions via header checkbox completes in under 100ms.
- **SC-003**: Bulk edit of 100 transactions completes in under 2 seconds with visual feedback.
- **SC-004**: Column headers and cell content are visually aligned across all columns.
- **SC-005**: Date formatting respects browser locale for 95%+ of supported locales.
- **SC-006**: Tag creation is accessible within 1 click of opening the tag editor.
- **SC-007**: Users can add a description to a transaction in under 3 clicks.
- **SC-008**: 90% of users can successfully bulk-edit transactions on first attempt.

## Assumptions

- **A-001**: Temporal API polyfill will be included for browsers without native support.
- **A-002**: The existing virtualization (TanStack Virtual) can handle tracking selection state for non-rendered rows.
- **A-003**: CRDT sync will handle bulk edit operations efficiently (Loro batching).
- **A-004**: "Merchant" is the preferred term over "Payee" for the vendor/store name field.
- **A-005**: Description field is optional and defaults to empty/null.

## Out of Scope

- Customizable column ordering (drag-and-drop columns)
- Column width resizing
- Column visibility toggles
- Keyboard-only bulk selection (without checkboxes)
- Split transactions (dividing one transaction into multiple)
- Inline editing of person allocation percentages (existing implementation sufficient)
