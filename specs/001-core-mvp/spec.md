# Feature Specification: MoneyFlow Core MVP

**Feature Branch**: `001-core-mvp`  
**Created**: 2025-12-23  
**Status**: Draft  
**Input**: User description: "MoneyFlow Core MVP - Marketing landing page, authentication, accounts, people, tags, transactions, and import functionality"

## Clarifications

### Session 2025-12-24

- Q: Should spec reflect key-only auth (seed phrase) instead of email/password? → A: Yes, update spec to match key-only auth model
- Q: How should the Balance column be calculated? → A: Running balance per account (cumulative after each transaction, chronological)
- Q: What happens to running balance when filters are active? → A: Show original balance (filters reduce visible rows, don't recalculate)
- Q: What are the uptime/availability targets? → A: Defer to Supabase/Vercel SLAs; aim for zero scheduled outages
- Q: How long should vault invite links remain valid? → A: 24 hours (high security)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Identity Creation & Unlock (Priority: P1)

A new user discovers MoneyFlow via the marketing landing page and wants to create an identity to start tracking their shared household expenses. They need a secure onboarding experience with maximum privacy.

**Why this priority**: Without identity creation, no other features can be used. This is the entry point for all users.

**Independent Test**: Can be fully tested by generating an identity (which creates a default vault), closing the tab, and unlocking with seed phrase. Delivers immediate value by providing an immediately usable vault.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page, **When** they click "Get Started", **Then** they see a screen that generates a 12-word BIP39 seed phrase and instructs them to write it down.
2. **Given** a user viewing their seed phrase, **When** they confirm they've saved it (checkbox + button), **Then** their identity is created, a default vault named "My Vault" is automatically created with them as the sole member, and they enter the transactions view.
3. **Given** a returning user on the landing page, **When** they click "Unlock" and enter their 12-word seed phrase, **Then** they are authenticated and see their vault (creating a default vault if none exists).
4. **Given** a user entering an invalid seed phrase, **When** they submit the form, **Then** they see "Invalid recovery phrase" error.
5. **Given** a user closing their browser tab, **When** they return later, **Then** they must re-enter their seed phrase (no local storage of secrets).
6. **Given** a user on the unlock screen, **When** they view the UI, **Then** they see a centered circle containing the seed phrase input field, clear instructions, and an "Unlock" button, with an animated aurora borealis gradient effect on the outer area.
7. **Given** a user entering a valid seed phrase, **When** the unlock succeeds, **Then** the transactions view loads behind the unlock screen, the inner circle fades out via mask, and the outer aurora circle expands outward to reveal the app (smooth unlock animation).

---

### User Story 2 - Configure Accounts (Priority: P2)

A user wants to set up their bank accounts, credit cards, and cash accounts so they can track transactions across all their financial holdings.

**Why this priority**: Accounts are the foundation for transactions. Users need somewhere to import/record transactions before anything else.

**Independent Test**: Can be fully tested by creating, editing, and viewing accounts. Delivers value by establishing the user's financial structure.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they navigate to the Accounts page, **Then** they see an inline-editable table of their accounts (initially empty).
2. **Given** a user on the Accounts page, **When** they add a new account, **Then** they can specify: account name, account number (optional), currency, account type (checking/savings/credit/cash/loan), and associated people with their default ownership percentages.
3. **Given** a user associating people with an account, **When** they specify ownership, **Then** they can set a default percentage for each person (e.g., 50%/50% for a joint account, or 100% for a single owner).
4. **Given** a user with an existing account, **When** they edit the current balance inline, **Then** the balance is updated in real-time.
5. **Given** multiple users sharing a vault, **When** one user edits an account, **Then** the other user sees the change in near real-time without refreshing.

---

### User Story 3 - Configure People (Priority: P2)

A user wants to set up the people in their household (themselves, spouse, parents) so expenses can be allocated to specific individuals, and see at a glance how much each person owes each other.

**Why this priority**: People are required for the core allocation feature. Without people, transactions cannot be split.

**Independent Test**: Can be fully tested by creating and managing people. Delivers value by defining who participates in expense sharing.

**Acceptance Scenarios**:

1. **Given** an unlocked user, **When** they navigate to the People page, **Then** they see a list of people in their vault (initially just themselves).
2. **Given** a user on the People page, **When** they add a person, **Then** they can specify a name; to grant vault access, they create an invite link.
3. **Given** an invite link, **When** a new user opens it and creates/enters their seed phrase, **Then** they access the same vault as the person who invited them.
4. **Given** a user editing a person, **When** they change details inline, **Then** changes sync to all connected users in near real-time.
5. **Given** a user on the People page, **When** they view the list, **Then** they see a summary showing how much each person owes every other person (based on transaction allocations with "Treat as Paid" status).

---

### User Story 4 - Configure Tags (Priority: P2)

A user wants to create tags to categorize transactions (e.g., "Groceries", "Dining", "Utilities") and organize them hierarchically.

**Why this priority**: Tags enable categorization and reporting. Transfer tags are essential for accurate reporting (excluding internal transfers).

**Independent Test**: Can be fully tested by creating tags and marking transfer tags. Delivers value by enabling organization.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they navigate to the Tags page, **Then** they see all tags in an inline-editable list showing name, parent tag (if nested), and transfer flag.
2. **Given** a user creating a tag, **When** they enter a name, **Then** the tag is created with that name.
3. **Given** a user marking a tag as "transfer", **When** transactions have this tag, **Then** they are excluded from spending reports (they represent internal account transfers).
4. **Given** a user creating a nested tag (e.g., "Food > Groceries"), **When** they select a parent tag, **Then** the hierarchy is displayed and respected in filtering.

---

### User Story 5 - View & Edit Transactions (Priority: P1)

A user wants to see all their transactions in a unified view, filter and search them, and edit details like tags and person allocations inline.

**Why this priority**: This is the primary interface users interact with daily. Transaction viewing and editing is the core experience.

**Independent Test**: Can be fully tested by viewing, filtering, sorting, and editing transactions. Delivers the core value proposition of unified transaction management.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they navigate to Transactions (default page), **Then** they see an infinite-scrolling table sorted reverse-chronologically.
2. **Given** a user viewing transactions, **When** they see the table, **Then** columns include: Date, Merchant, Description, Amount (red negative/green positive), Tags, Account, Balance, Status, Automation, and configurable person columns.
3. **Given** a user clicking on any cell, **When** they edit the value inline, **Then** the change is saved automatically and synced to other users in near real-time.
4. **Given** a user with person columns visible, **When** they enter "50" in a person's column, **Then** that person owes 50% of the transaction amount to the account owner(s).
5. **Given** a user entering a negative percentage, **When** the transaction is negative (expense), **Then** the sign flips and that person receives credit instead.
6. **Given** a user selecting multiple transactions via checkboxes, **When** they bulk-edit a property (e.g., tag), **Then** all selected transactions are updated.
7. **Given** a user shift-clicking two transactions, **When** they complete the action, **Then** all transactions between them are selected.
8. **Given** a user applying filters, **When** they filter by tags, date range, people, accounts, status, or free-text search, **Then** only matching transactions are shown.
9. **Given** a user selecting a date preset (e.g., "Last 30 days"), **When** the filter is applied, **Then** transactions from that period are shown.
10. **Given** a user wanting to add a transaction manually, **When** they click "Add Transaction", **Then** an empty new row appears inline at the top of the list for them to fill in.
11. **Given** a user editing the Tags cell, **When** they click on it, **Then** they see a beautiful inline tag editor showing: existing tags as pills with × to remove, a text input to filter/search tags, a filtered dropdown of matching tags, and a "Create [typed value]" button always visible.
12. **Given** a transaction with automation rules applied, **When** the user views the Automation column, **Then** they see the rule(s) that were applied with an edit button for each.
13. **Given** a user clicking the edit button on an applied automation, **When** the popup opens, **Then** they can edit the rule inline or exclude this specific transaction from the rule.
14. **Given** a transaction that doesn't match any automation rule, **When** the user views the Automation column, **Then** they see a dropdown with "Create automatically" / "Manual" options.
15. **Given** a user with "Create automatically" selected (remembered preference), **When** they finish editing a transaction and leave the row, **Then** an automation rule is created based on the transaction's values.
16. **Given** a user with "Manual" selected, **When** they view the Automation column, **Then** they see a "Create" button to manually create a rule from this transaction.
17. **Given** a user editing a transaction that has automation rules applied, **When** they change a field that the rule set, **Then** an "Update" button appears on the automation to update the rule with the new value.

---

### User Story 6 - Import Transactions (Priority: P1)

A user wants to import transactions from their bank via CSV or OFX files, mapping columns and setting formatting options, so they don't have to enter transactions manually.

**Why this priority**: Import is how users get data into the system. Without import, manual entry would be impractical for hundreds of transactions.

**Independent Test**: Can be fully tested by importing a CSV file and verifying transactions appear correctly. Delivers massive value by eliminating manual data entry.

**Acceptance Scenarios**:

1. **Given** a user on the Transactions page, **When** they drag and drop a CSV/OFX file, **Then** an import modal opens.
2. **Given** a user in the import modal (Step 1), **When** they see the wizard, **Then** they can choose/drag a file if not already selected.
3. **Given** a user in Step 2, **When** they see tabs for "Use Template" / "Column Mapping" / "Formatting", **Then** they can configure the import.
4. **Given** a user on the Templates tab, **When** they select a saved template, **Then** Column Mapping and Formatting tabs are auto-configured.
5. **Given** a user on Column Mapping, **When** they see the interface, **Then** each MoneyFlow field has a dropdown showing source columns with example values from the first non-empty row.
6. **Given** a user mapping columns, **When** they see a "Has Headers" checkbox, **Then** toggling it updates the preview appropriately.
7. **Given** a user on Formatting tab, **When** they configure thousand separator, decimal separator, and date format, **Then** the preview updates to show parsed values.
8. **Given** a user completing Step 2, **When** they proceed to Step 3, **Then** they see a preview of how transactions will appear in the system.
9. **Given** a user confirming import, **When** they click "Start Import", **Then** transactions are created with status "For Review" and linked to this import.
10. **Given** a user importing an OFX file, **When** the file contains account information, **Then** the account is auto-detected and created if it doesn't exist.
11. **Given** a user completing an import without selecting a template, **When** the import finishes, **Then** the current configuration is saved as a template automatically.

---

### User Story 7 - Manage Imports (Priority: P3)

A user wants to view past imports and delete an import along with all its associated transactions if they made a mistake.

**Why this priority**: Import management is needed for error recovery but is not part of the happy path.

**Independent Test**: Can be fully tested by viewing imports and deleting one. Delivers value by allowing users to recover from import mistakes.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they navigate to the Imports page, **Then** they see a list of past imports with date, file name, and transaction count.
2. **Given** a user viewing an import, **When** they click delete, **Then** they are asked to confirm.
3. **Given** a user confirming deletion, **When** the action completes, **Then** the import and all associated transactions are permanently removed.

---

### User Story 8 - Marketing Landing Page (Priority: P1)

A potential user visits the MoneyFlow website and wants to understand what the product does, see that it's trustworthy, and easily get started or unlock their vault.

**Why this priority**: Without a landing page, users cannot discover or access the product. First impressions determine conversion.

**Independent Test**: Can be fully tested by visiting the URL and navigating. Delivers value by acquiring users.

**Acceptance Scenarios**:

1. **Given** a visitor, **When** they visit the MoneyFlow URL, **Then** they see a beautiful, modern marketing page inspired by PocketSmith/Budgero/SplitMyExpenses.
2. **Given** a visitor on the landing page, **When** they look at the header, **Then** they see "Unlock" and "Get Started" buttons.
3. **Given** a visitor scrolling, **When** they view the page, **Then** they see: hero section, key features, security/privacy messaging, testimonials (placeholder), and pricing (free for now).
4. **Given** a visitor clicking "Get Started", **When** the page loads, **Then** they see the identity creation screen with seed phrase generation.
5. **Given** a visitor clicking "Unlock", **When** the page loads, **Then** they see the seed phrase entry form.

---

### User Story 9 - Configure Statuses (Priority: P2)

A user wants to customize transaction statuses to match their workflow (e.g., "For Review", "Paid", "Disputed") and define what each status means for settlement calculations.

**Why this priority**: Statuses determine which transactions are included in settlement calculations. The default "For Review" and "Paid" cover most cases, but customization is needed.

**Independent Test**: Can be fully tested by creating, editing, and assigning statuses. Delivers value by allowing users to track transaction states.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they navigate to the Statuses page, **Then** they see a list of statuses (default: "For Review", "Paid").
2. **Given** a user on the Statuses page, **When** they create a new status, **Then** they can specify a name and assign a behavior.
3. **Given** a user creating a status, **When** they select a behavior, **Then** they can choose from available behaviors (currently: "Treat as Paid" or none).
4. **Given** a status with "Treat as Paid" behavior, **When** transactions have this status, **Then** they are included in the settlement calculations (funds are considered disbursed per allocations).
5. **Given** a status without "Treat as Paid" behavior, **When** transactions have this status, **Then** they are excluded from settlement calculations (still pending).
6. **Given** a user editing a status inline, **When** they change the name or behavior, **Then** the change syncs to all connected users in near real-time.

---

### User Story 10 - Configure Automations (Priority: P2)

A user wants to create automation rules that automatically categorize and allocate transactions based on conditions, so they don't have to manually tag and split every transaction.

**Why this priority**: Automations dramatically reduce manual work for recurring transaction patterns. Without them, users would spend excessive time on repetitive categorization.

**Independent Test**: Can be fully tested by creating rules and verifying they apply to matching transactions. Delivers value by eliminating repetitive manual work.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they navigate to the Automations page, **Then** they see a list of all automation rules with their conditions and actions.
2. **Given** a user creating an automation rule, **When** they define conditions, **Then** they can specify: column name, operator ("contains" / "regex match"), value to match, and a case-sensitive toggle.
3. **Given** a user adding multiple conditions to a rule, **When** they save the rule, **Then** the conditions are OR'd together (any match triggers the rule).
4. **Given** a user defining actions for a rule, **When** they configure actions, **Then** they can set any column value including: adding tags, setting person allocation percentages, setting status, etc.
5. **Given** a user saving a new automation rule, **When** the rule is created, **Then** it immediately runs on all existing transactions and applies to matching ones.
6. **Given** new transactions being imported or created, **When** they enter the system, **Then** all automation rules are evaluated and applied to matching transactions.
7. **Given** a user editing an existing rule from the Automations page, **When** they modify conditions or actions, **Then** the system tracks what changes were made for potential undo.
8. **Given** a transaction with an automation applied, **When** the user wants to exclude it from that rule, **Then** they can mark the transaction as excluded from that specific rule without deleting the rule.
9. **Given** a user wanting to undo automation changes, **When** they view a rule's history, **Then** they can see what the rule changed and revert those changes.
10. **Given** thousands of transactions, **When** automations are evaluated, **Then** the system performs efficiently (target: evaluate all rules on 10,000 transactions in under 2 seconds).

---

### Edge Cases

- What happens when a user imports a CSV with completely empty rows? → Rows are silently dropped.
- What happens when allocation percentages for a transaction don't sum to 100%? → The remainder is allocated to the account owner(s) according to their default ownership percentages. For example, if a transaction on a 50/50 joint account has 30% allocated to a third person, the remaining 70% is split 35%/35% between the two owners.
- What happens when allocation percentages are negative? → Allowed; flips credit/debit direction for that person.
- How does the system handle concurrent edits to the same transaction? → Last write wins with real-time sync showing changes.
- What happens when a user deletes a person who has allocations? → Allocations remain but show "Deleted Person" or similar.
- What happens when a user deletes an account with transactions? → Transactions remain but show "Deleted Account" indicator.
- How does the system handle OFX files with accounts that don't match existing ones? → Creates a new account automatically.
- What happens when an automation regex pattern is invalid? → Show validation error, prevent saving until fixed.
- What happens when a user enters an invalid seed phrase? → Show "Invalid recovery phrase" error; no indication of whether identity exists.
- What happens when a user loses their seed phrase? → Unrecoverable; this is documented during onboarding.
- What happens when a user deletes a status that has transactions? → Transactions revert to "For Review" status.
- What happens when a user deletes an automation rule? → The rule is deleted; changes it made to transactions remain (but can be undone first if desired).
- What happens when multiple automation rules match the same transaction? → All matching rules are applied; if they set the same field, the last rule wins (rules are ordered).
- What happens when a user excludes a transaction from a rule? → The exclusion is stored; the rule no longer applies to that transaction even if conditions match.
- What happens when automation is set to "Create automatically" and the user leaves a row? → A rule is created matching the transaction's description (contains match) with the current field values as actions.
- What happens when a potential duplicate is detected on import? → Transaction is flagged with "Dup?" badge; user can Keep (clears flag) or Delete with 1-2 keystrokes.
- What happens when duplicate detection finds multiple potential matches? → Flag references the most recent matching transaction.
- What happens when a user Keeps a flagged duplicate? → The duplicateOf flag is cleared; transaction is treated as normal.
- What happens when a user deletes a transaction that other transactions are flagged as duplicates of? → The duplicateOf references remain but show "Original deleted" indicator.
- What happens when a user's presence times out? → Their avatar disappears and cursor highlights are removed after 30 seconds of inactivity.
- What happens when two users edit the same cell simultaneously? → Both see each other's cursors; Loro CRDT resolves conflict on save (last write wins).
- What happens when a user switches vaults? → Their presence is removed from the old vault and added to the new vault.

## Requirements _(mandatory)_

### Functional Requirements

**Identity & Security**

- **FR-001**: System MUST generate a BIP39 12-word seed phrase (128-bit entropy) for new identities.
- **FR-002**: System MUST derive Ed25519 signing keypair from seed phrase for request authentication.
- **FR-003**: System MUST NOT store seed phrase or private keys locally; user enters seed each session.
- **FR-004**: System MUST authenticate API requests via Ed25519 signatures (timestamp, method, path, body hash).
- **FR-005**: System MUST encrypt all user data end-to-end per Constitution Principle I.
- **FR-005a**: Unlock screen MUST display a centered circle with seed phrase input, instructions, and "Unlock" button, surrounded by an animated aurora borealis gradient effect.
- **FR-005b**: On successful unlock, system MUST play a smooth transition: preload transactions view behind the unlock screen, fade out inner circle via mask, then expand outer aurora circle outward to reveal the app.

**People Management**

- **FR-006**: System MUST allow creating people with a name.
- **FR-006a**: System MUST allow generating invite links to grant vault access to new users.
- **FR-006b**: Vault invite links MUST expire after 24 hours.
- **FR-007**: System MUST allow multiple people to access the same vault using their own seed phrases.
- **FR-008**: System MUST sync people changes across all connected sessions in near real-time.
- **FR-009**: System MUST display person-to-person balances on the People page showing how much each person owes every other person.

**Account Management**

- **FR-010**: System MUST allow creating accounts with: name, account number (optional), currency, type (checking/savings/credit/cash/loan), and associated people with default ownership percentages.
- **FR-011**: System MUST allow specifying a default ownership percentage for each person associated with an account (must sum to 100%).
- **FR-012**: System MUST allow editing account balance inline.
- **FR-013**: System MUST display accounts in an inline-editable table format.
- **FR-014**: System MUST sync account changes across all connected sessions in near real-time.
- **FR-015**: System MUST use account ownership percentages to allocate the remainder when transaction allocations don't sum to 100%.

**Tag Management**

- **FR-016**: System MUST allow creating tags with name and optional parent tag (nesting).
- **FR-017**: System MUST allow multiple tags to be marked as "transfer" tags.
- **FR-018**: System MUST exclude transactions with transfer tags from spending reports.
- **FR-019**: System MUST allow inline editing of all tag properties.
- **FR-020**: System MUST sync tag changes across all connected sessions in near real-time.

**Transaction Management**

- **FR-021**: System MUST display transactions in an infinite-scrolling table, sorted reverse-chronologically by default.
- **FR-022**: System MUST display columns: Date, Merchant, Description, Amount, Tags, Account, Balance, Status, Automation, plus configurable person columns.
- **FR-022a**: Balance column MUST show running balance per account (cumulative total after each transaction in chronological order).
- **FR-022b**: Balance column MUST show original running balance regardless of active filters (filtering reduces visible rows, does not recalculate balance).
- **FR-023**: System MUST color amounts red for negative (expense) and green for positive (income).
- **FR-024**: System MUST allow inline editing of all transaction fields.
- **FR-025**: System MUST allow percentage allocation per person per transaction.
- **FR-026**: System MUST support negative percentages (flipping credit/debit direction).
- **FR-027**: System MUST support multi-select via checkboxes, shift-click range selection, and "select all visible" checkbox (selects only currently visible filtered rows).
- **FR-028**: System MUST support bulk editing of selected transactions.
- **FR-029**: System MUST support filtering by: tags (multi), date range (with presets), people (multi), accounts (multi), status (multi), and free-text search on merchant/description.
- **FR-030**: System MUST provide date presets: last 14 days, last 30 days, last 90 days, month to date, last month, year to date, last year.
- **FR-031**: System MUST sync transaction changes across all connected sessions in near real-time.
- **FR-032**: System MUST allow creating new transactions inline via an "Add Transaction" action that inserts an empty editable row.
- **FR-033**: System MUST provide an inline tag editor with: existing tags displayed as pills with × to remove, text input for filtering, dropdown of matching tags, and "Create" button for new tags.
- **FR-034**: System MUST display applied automation rules in the Automation column with edit buttons.
- **FR-035**: System MUST show "Update" button on automations when transaction edits conflict with rule-set values.
- **FR-036**: System MUST provide dropdown ("Create automatically" / "Manual") for transactions without matching rules.
- **FR-037**: System MUST remember user's automation creation preference ("Create automatically" vs "Manual").
- **FR-038**: System MUST auto-create automation rules when user leaves a row (if "Create automatically" is selected).
- **FR-038a**: System MUST allow deleting individual transactions with confirmation.
- **FR-038b**: System MUST allow bulk deletion of selected transactions with confirmation.
- **FR-038c**: Transaction deletion is permanent (Loro tracks history for audit).

**Duplicate Detection**

- **FR-038d**: System MUST detect potential duplicates on import by matching: same amount AND same date AND (description contains same merchant OR Levenshtein distance < 3).
- **FR-038e**: System MUST check imported transactions against existing transactions from last 7 days.
- **FR-038f**: System MUST flag potential duplicates with `duplicateOf` reference to suspected original transaction.
- **FR-038g**: System MUST display "Dup?" badge on flagged transactions (not a full column).
- **FR-038h**: System MUST show on hover/click: "Possible duplicate of [date] [merchant] [amount]" with link to original.
- **FR-038i**: System MUST provide quick actions: **Keep** (clears flag) | **Delete** (removes transaction).
- **FR-038j**: System MUST support keyboard shortcuts for duplicate resolution: `k` = keep, `d` = delete (when focused).
- **FR-038k**: System MUST support filtering transactions by "Show duplicates only".

**Automation**

- **FR-039**: System MUST allow creating automation rules with conditions and actions.
- **FR-040**: System MUST support conditions with: column name, operator ("contains" / "regex match"), value, and case-sensitive toggle.
- **FR-041**: System MUST OR multiple conditions together (any match triggers the rule).
- **FR-042**: System MUST allow actions to set any column value (tags, person allocations, status, etc.).
- **FR-043**: System MUST run all automation rules on newly imported or created transactions.
- **FR-044**: System MUST run new automation rules on all existing transactions when created.
- **FR-045**: System MUST validate regex patterns in automation conditions before saving.
- **FR-046**: System MUST track automation changes for undo capability.
- **FR-047**: System MUST allow excluding specific transactions from specific automation rules.
- **FR-048**: System MUST evaluate all automations on 10,000 transactions in under 2 seconds.
- **FR-049**: System MUST allow ordering automation rules (last rule wins for conflicting field sets).

**Import**

- **FR-050**: System MUST support importing CSV and OFX files via file picker or drag-and-drop.
- **FR-051**: System MUST provide a wizard with steps: 1) File selection, 2) Configuration (Template/Column Mapping/Formatting tabs), 3) Preview.
- **FR-052**: System MUST allow saving and reusing import templates.
- **FR-053**: System MUST auto-save import configuration as a template when no template was selected.
- **FR-054**: System MUST show example values from source columns in mapping dropdowns.
- **FR-055**: System MUST provide a "Has Headers" checkbox affecting column mapping.
- **FR-056**: System MUST support configuring: thousand separator, decimal separator, date format.
- **FR-057**: System MUST assign status "For Review" to all imported transactions.
- **FR-058**: System MUST link all imported transactions to their import (unique import ID).
- **FR-059**: System MUST auto-detect and create accounts from OFX files if they don't exist.
- **FR-060**: System MUST drop completely empty rows during import.

**Import Management**

- **FR-061**: System MUST display a list of past imports with date, filename, and transaction count.
- **FR-062**: System MUST allow deleting an import and all its associated transactions with confirmation.

**Status Management**

- **FR-063**: System MUST provide default statuses: "For Review" and "Paid".
- **FR-064**: System MUST allow creating custom statuses with a name and behavior.
- **FR-065**: System MUST support the "Treat as Paid" behavior indicating funds are disbursed per allocations.
- **FR-066**: System MUST only include transactions with "Treat as Paid" behavior in settlement calculations.
- **FR-067**: System MUST allow inline editing of status properties.
- **FR-068**: System MUST sync status changes across all connected sessions in near real-time.

**Landing Page**

- **FR-069**: System MUST display a marketing landing page with hero, features, security messaging, and call-to-action buttons.
- **FR-070**: System MUST provide "Unlock" and "Get Started" navigation buttons.
- **FR-071**: Landing page MUST be visually polished, modern, and inspired by PocketSmith/Budgero/SplitMyExpenses aesthetic.

**Real-Time Collaboration**

- **FR-072**: System MUST support multiple users/tabs editing the same vault simultaneously.
- **FR-073**: System MUST propagate changes to all connected clients in near real-time (target: <500ms).

**Vault Selection**

- **FR-074**: System MUST display a vault selector in the top-right header area.
- **FR-075**: System MUST show only one vault at a time (single active vault).
- **FR-076**: System MUST persist the selected vault ID in user's encrypted settings.
- **FR-077**: System MUST default to the user's first vault if no selection is stored.

**Presence Awareness**

- **FR-078**: System MUST display circular avatars (person's initials) for all active users in the current vault, shown in the top-right near the vault selector.
- **FR-079**: System MUST use Loro's EphemeralStore (from `loro-crdt`) for presence data (non-persistent, auto-expires after 30s).
- **FR-079a**: Presence data MUST be encrypted using XChaCha20-Poly1305 with a presence-specific key derived from vault key (single-pass HKDF for speed).
- **FR-080**: System MUST broadcast user's active row and cell when editing the transaction list.
- **FR-081**: System MUST highlight other users' active rows with a subtle colored left border (2px, user's color at 30% saturation).
- **FR-082**: System MUST show a colored cursor indicator (2px left border) on cells being actively edited by other users.
- **FR-083**: System MUST show tooltip on avatar hover with person's name and what they're currently editing.
- **FR-084**: Presence updates MUST propagate within 100ms for responsive cursor tracking.

### Key Entities

- **Identity**: A user's cryptographic identity. Derived from BIP39 seed phrase → Ed25519 keypair. Server knows only `pubkey_hash` (BLAKE2b hash of public key).
- **UserData**: Encrypted per-user storage containing: vault references (IDs + wrapped keys), global settings (active vault, theme, default currency). Stored server-side but only decryptable by user.
- **GlobalSettings**: App-wide user preferences stored in UserData: active vault selection, theme, default currency (ISO 4217 code for import fallback), future notification prefs. NOT vault-specific.
- **Vault**: An encrypted container for all financial data. Acts as a **tenant**—the entire app UI is scoped to the active vault. A user can belong to multiple vaults. Contains Accounts, People, Tags, Transactions, Imports, Automations, and vault-specific preferences.
- **VaultMembership**: Links an Identity to a Vault with a role (owner/member) and wrapped vault key.
- **VaultInvite**: A pending invitation to join a vault. Contains ephemeral public key for key exchange.
- **Person**: An individual for expense allocation within a vault. Has name. May be linked to an Identity for vault access.
- **Account**: A financial account. Has name, account number (optional), currency (ISO 4217, required), type, balance (in account's currency minor units), associated People with default ownership percentages (must sum to 100%). Each account has exactly one currency.
- **Tag**: A category for transactions. Has name, parent Tag (optional), transfer flag.
- **Transaction**: A financial event. Has date, merchant, description, amount (in account's currency minor units), Tags, Account, Status, allocations, Import reference, applied Automations, excluded Automations, duplicateOf (optional reference to suspected original).
- **Allocation**: A percentage split of a Transaction to a Person.
- **Import**: A batch import event. Has timestamp, filename, unique ID. References many Transactions.
- **ImportTemplate**: Saved import configuration. Has name, column mappings, formatting settings.
- **Status**: A transaction state. Has name, behavior (e.g., "Treat as Paid" or none). Default statuses: "For Review", "Paid".
- **Automation**: A rule for automatic transaction processing. Has name, conditions (column, operator, value, case-sensitive), actions (column values to set), order/priority.
- **AutomationApplication**: A record of an automation applied to a transaction. Tracks what was changed for undo capability.
- **VaultPreferences**: Per-vault settings stored in the vault CRDT. Includes automation creation preference ("Create automatically" vs "Manual"), default currency for new accounts.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can complete identity creation (generate + confirm seed phrase) in under 60 seconds.
- **SC-002**: Seed phrase unlock completes in under 2 seconds.
- **SC-003**: Transaction list renders first 50 items in under 500ms.
- **SC-004**: Infinite scroll loads next batch in under 300ms.
- **SC-005**: Inline edits sync to other users in under 500ms.
- **SC-006**: CSV import of 1000 transactions completes in under 10 seconds.
- **SC-007**: 90% of users successfully import a CSV file on first attempt.
- **SC-008**: Landing page achieves Lighthouse performance score of 90+.
- **SC-009**: All interactions feel instant (<100ms perceived latency) per Constitution Principle VI.
- **SC-010**: Automation rules evaluate on 10,000 transactions in under 2 seconds.
- **SC-011**: Zero local storage of secrets; seed phrase entered fresh each session.
- **SC-012**: System handles 10 concurrent users editing the same vault without conflicts.

## Assumptions

- **A-001**: Users will store their seed phrase in a password manager (recommended during onboarding).
- **A-002**: Real-time sync will use WebSockets or similar persistent connection technology.
- **A-003**: "Near real-time" means <500ms propagation under normal conditions.
- **A-004**: Initial launch will support single currency per account; multi-currency conversion is out of scope.
- **A-004a**: Settlement calculations assume all accounts use the same currency. Multi-currency vaults will show settlement per person, but users must manually handle cross-currency reconciliation.
- **A-004b**: OFX imports will validate that the file's currency (CURDEF) matches the target account's currency, rejecting mismatches with a clear error message.
- **A-005**: The landing page will use placeholder testimonials initially.
- **A-006**: OFX parsing will use an existing library rather than custom implementation.
- **A-007**: BIP39 12-word seed phrases provide sufficient entropy (128 bits) for collision resistance.
- **A-008**: Availability defers to Supabase and Vercel SLAs; no scheduled maintenance windows planned.

## Out of Scope

- Bank API integrations (automatic transaction fetching)
- Multi-currency conversion between accounts
- Multi-currency settlement tracking (settlement is per-currency; future: track net position per currency pair)
- Settlement payment tracking and recording (marking debts as settled) - balance viewing IS in scope
- Mobile native apps (web-responsive only for MVP)
- Reports and analytics dashboards (future feature)
- Recurring transaction rules
- Seed phrase recovery (impossible by design; users must backup their phrase)
- WebAuthn PRF "remember me" feature (future enhancement for hardware-backed convenience)
- Copy-paste import from bank web interfaces (HTML table parsing) - CSV/OFX only for MVP
- Cross-import duplicate detection with fuzzy matching (basic same-amount/date/merchant detection IS in scope)
