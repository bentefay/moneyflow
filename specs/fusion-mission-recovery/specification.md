# Fusion mission specification recovered on 2026-10-05

Mission: `M-MTPN1LI4-0001-JANZ` — Refine transaction editing and simplify automation rules

Source: the project-scoped Fusion database, read without modifying its task or mission state. This
preserves the saved mission plan and acceptance criteria, not a claim of completed implementation.
The original interview transcript is not present in the available database. Descriptions below are
Fusion’s saved specification; they must not be represented as a verbatim transcript of the human.

Produce interactive HTML mockups specifically for the automation rules UI and its creation/editing
flows, obtain approval, then implement the approved design alongside transaction-table interaction
refinements. Combine compatible automation outputs into multi-field rules without introducing
transaction-to-rule links. Preserve existing matching precedence and field-specific eligibility.
Improve nullable numeric editing, keyboard consistency, cell-range selection, and inspector
scrolling. Table interactions do not require mockups.

## Automation design and approval

Ground the design in current behavior and deliver automation-only HTML mockups before product
implementation.

**Verification:** The user approves interactive automation mockups and the documented behavior
contract; unresolved rule semantics are resolved before implementation.

**Acceptance criteria:** - Audit matching, precedence, and application behavior: The contract
explicitly rejects stored transaction-to-rule links; records description, amount, account, and
account-plus-amount precedence; preserves alias lifecycle behavior and field-specific eligibility.

### Establish the interaction and rule contract

Inspect existing implementation, repository guidance, and relevant specifications without starting
the separate human-scratch execution goal.

**Verification:** A behavior matrix distinguishes confirmed requirements, existing behavior to
preserve, and decisions requiring mockup approval.

#### Audit matching, precedence, and application behavior

Feature: `F-MTPN1LJ1-0006-I4HJ`

Document independent rule matching, per-field precedence, description aliases, manual-transaction
eligibility, remembered preferences, and row-blur application.

**Acceptance criteria:** The contract explicitly rejects stored transaction-to-rule links; records
description, amount, account, and account-plus-amount precedence; preserves alias lifecycle behavior
and field-specific eligibility.

#### Specify grouped-rule ownership and conflicts

Feature: `F-MTPN1LK4-0009-OYN1`

Define how edits extend currently applicable rules, preferring the description rule when multiple
rules apply. Specify handling for existing field owners, mismatched outputs, and ambiguous fallback
selection.

**Acceptance criteria:** Examples cover no matching rule, one constrained rule, multiple applicable
rules, previously split fields, and conflicting field ownership. No unrelated rules silently merge;
ambiguous cases have an approved resolution.

#### Record scope and automatic-application semantics

Feature: `F-MTPN1LKU-000B-WQCS`

Separate application scope from automatic application and clarify behavior outside transaction
context, deletion, pending edits, and preference persistence.

**Acceptance criteria:** Update all includes all matching rows; transaction-context Update new
includes matching rows dated on or after the selected row. Future-import behavior remains supported.
Automatic application retains the row-loses-focus baseline unless an alternative is explicitly
approved.

### Interactive automation HTML mockups

Explore a clearer, roomier inspector and shared rule editor without mocking table keyboard or
selection behavior.

**Verification:** Locally viewable HTML demonstrates the main rule workflows and receives explicit
user approval before product changes.

#### Unified create and edit layout

Feature: `F-MTPN1LLR-000F-K44C`

Mock a common editor with visible matching conditions, field-output badges, Update all/Update new
radios, an Apply on blur checkbox, and Apply/Delete actions.

**Acceptance criteria:** Creation and editing share the same structure; legacy duplicate action
buttons are replaced; scope wording explains the inclusive date cutoff without relying on a separate
explanation button. Delete appears only where applicable.

#### Grouped outputs and split interactions

Feature: `F-MTPN1LMG-000H-9WWV`

Demonstrate description editing followed by tagging and allocation edits, including constrained
rules, tag add/set modes, and splitting a field.

**Acceptance criteria:** Mock interactions show added outputs joining an applicable rule,
description-rule preference, and Split moving exactly one output into a separate rule while copying
matching conditions and application settings. Allocation output represents the complete
person-allocation set.

#### Matching, mismatch, and contextual states

Feature: `F-MTPN1LN3-000J-D5O3`

Show matching rules, divergent transaction values, pending changes, standalone automation editing,
and a long independently scrolling inspector.

**Acceptance criteria:** Mockups distinguish rule matching from current-value agreement, retain a
clear apply-to-this-transaction action where needed, demonstrate standalone future-import scope, and
capture approved deletion and blur behavior.

## Implement grouped automations and the approved editor

Deliver multi-field rules and the approved shared UI while preserving existing automation semantics
and data.

**Verification:** Grouped-rule creation, matching, application, splitting, persistence, and editing
pass unit, integration, and end-to-end tests using the approved behavior contract.

**Acceptance criteria:** - Extend rule storage compatibly: Existing single-field rules load without
losing conditions or outputs and are not automatically merged. Grouped rules survive persistence and
sync round trips without weakening encrypted storage.

### Multi-field rule model and execution

Support independently configurable outputs within one rule without changing the fundamental matching
model.

**Verification:** Tests demonstrate correct results across overlapping rules, constraints, date
boundaries, imports, and manual transactions.

#### Extend rule storage compatibly

Feature: `F-MTPN1LOA-000P-DREC`

Represent description, tag, and allocation outputs in a shared rule structure; retain tag add/set
behavior and whole-set allocation semantics.

**Acceptance criteria:** Existing single-field rules load without losing conditions or outputs and
are not automatically merged. Grouped rules survive persistence and sync round trips without
weakening encrypted storage.

#### Resolve and extend applicable rules

Feature: `F-MTPN1LP8-000S-S16R`

Use matching and precedence to select an existing rule for edited outputs, preferring the applicable
description rule and applying the approved conflict policy.

**Acceptance criteria:** Editing a tag after constraining an applicable description rule extends
that rule. Multiple-rule cases follow the approved policy; rules remain independent of transactions.

#### Apply grouped outputs with preserved eligibility

Feature: `F-MTPN1LPT-000U-GO8F`

Execute outputs using approved precedence and scope, including inclusive Update new date boundaries.

**Acceptance criteria:** Update all changes all eligible matches; Update new includes same-date
matches and later dates. Description rules retain imported-description eligibility, while tags and
allocations retain existing manual-transaction support. Overlap and mismatch regressions pass.

#### Split one output without changing effective results

Feature: `F-MTPN1LQF-000W-UJZL`

Move an output into a separate rule while retaining the remaining outputs and copying conditions and
application settings.

**Acceptance criteria:** Split neither duplicates nor drops the selected output; immediate
transaction results remain unchanged, and subsequent edits to either rule are independent.
Single-output and collision cases follow the approved contract.

### Shared automation editor and inspector integration

Implement the approved UI in the inspector and standalone automation management.

**Verification:** End-to-end tests cover seamless creation, grouped editing, split, scope selection,
automatic/manual application, and deletion in both contexts.

#### Build the common rule editor

Feature: `F-MTPN1LRM-0010-BUBB`

Implement shared conditions, output badges, split controls, tag mode, radios, checkbox, and
contextual actions.

**Acceptance criteria:** Create and edit use the same components; all controls have accessible names
and keyboard access; duplicate legacy actions are removed without losing required capabilities.

#### Integrate row edits and matching-rule indicators

Feature: `F-MTPN1LST-0012-D4C1`

Connect transaction edits to the common editor and preserve indicators for matching and divergent
values.

**Acceptance criteria:** Description, tag, and allocation edits surface the correct applicable
rules. Divergent values remain distinguishable, and applying to the current transaction works
without implying a stored rule link.

#### Implement scope, blur, and preference behavior

Feature: `F-MTPN1LTI-0014-TQAH`

Apply the approved focus boundary, remembered choices, pending-edit behavior, and delete semantics.

**Acceptance criteria:** Unchecked automatic application waits for Apply; checked behavior fires
only at the approved focus boundary. Moving among editor controls does not accidentally discard
edits or trigger unintended bulk changes. Contextual and standalone scopes behave as approved.

## Refine table interactions and verify release readiness

Implement the confirmed table behavior directly, fix viewport scrolling, and validate the complete
mission.

**Verification:** Numeric, keyboard, range-selection, and scrolling scenarios pass automated tests;
approved automation workflows remain intact; repository-required checks pass.

**Acceptance criteria:** - Preserve blank and explicit zero: Clearing either field persists as blank
after reload. Explicit allocation 0 displays as an answered 0%, not a dash. Blank allocations
contribute 0% to calculations; downstream amount handling is explicitly audited for null safety.

### Nullable numeric editing

Make allocation and amount inputs permissive while preserving blank values distinctly from zero.

**Verification:** Unit and end-to-end tests cover normalization, persistence, calculations, and
navigation with incomplete or invalid input.

#### Preserve blank and explicit zero

Feature: `F-MTPN1LUU-001A-VGRP`

Support nullable allocation and amount values through editing and persistence; render blank
differently from numeric zero.

**Acceptance criteria:** Clearing either field persists as blank after reload. Explicit allocation 0
displays as an answered 0%, not a dash. Blank allocations contribute 0% to calculations; downstream
amount handling is explicitly audited for null safety.

#### Normalize numeric text on blur

Feature: `F-MTPN1LVU-001D-UV2L`

Allow free typing and normalize using deterministic, tested parsing rules without percentage
clamping.

**Acceptance criteria:** Allocation a.1 becomes 0.1; wholly nonnumeric text becomes blank; negative
and above-100 allocations remain valid. Amounts retain valid negatives and use currency precision
and integer minor-unit storage. Malformed signs and decimal separators have documented test cases.

#### Match description-cell navigation

Feature: `F-MTPN1LWC-001F-UD2C`

Reuse the description cell's current three-mode interaction contract for numeric cells.

**Acceptance criteria:** Mode transitions, Arrow, and Alt+Arrow behavior match the reference cell.
Invalid or incomplete text never blocks movement, and normalization occurs when leaving the input.

### Grid selection and action-cell keyboard behavior

Make non-edit selection spreadsheet-like while preserving native input editing.

**Verification:** End-to-end tests cover mode transitions, keyboard activation, Shift-click, drag
ranges, and native text selection inside inputs.

#### Implement action-cell focus navigation

Feature: `F-MTPN1LX9-001J-3L4Y`

Focus the first action button on edit entry and provide predictable internal navigation and exit.

**Acceptance criteria:** Left/Right moves among buttons without wrapping; Enter/Space activates
once; Escape returns to cell navigation; Alt+Arrow moves through the grid. Focus remains visibly
identifiable.

#### Prevent native text selection outside editing

Feature: `F-MTPN1LXX-001L-5X1R`

Disable browser text selection for non-edit cells without disrupting input text selection or grid
copy behavior.

**Acceptance criteria:** Click followed by Shift-click selects a cell range without browser text
highlighting. Editing inputs still supports cursor positioning, text dragging, and copying.

#### Implement rectangular drag selection

Feature: `F-MTPN1LYI-001N-FTFP`

Use the existing table-selection architecture rather than assuming TanStack provides the
interaction.

**Acceptance criteria:** Dragging across non-edit cells selects a rectangular range; Shift-click
extends from the anchor. Selection stays correct across virtualized rows and edge scrolling, while
input editing and action-button clicks remain usable.

### Viewport containment and final regression gate

Fix transaction-viewer overflow and validate the integrated changes.

**Verification:** Long-content scrolling scenarios pass and all required quality checks complete
successfully.

#### Contain inspector scrolling within the viewer

Feature: `F-MTPN1LZH-001R-OIBT`

Correct layout sizing and overflow so the inspector scrolls independently without creating a
document scrollbar.

**Acceptance criteria:** Opening, expanding, and scrolling long inspector content does not create
vertical page overflow. Table scrolling remains functional at supported viewport sizes and with
either inspector state.

#### Run full regression and delivery checks

Feature: `F-MTPN1M04-001T-0S2X`

Add required unit, integration, and end-to-end coverage; update relevant documentation and follow
repository delivery requirements.

**Acceptance criteria:** pnpm typecheck, pnpm lint, pnpm format:check, pnpm test, and pnpm test:e2e
pass. Regression coverage includes alias behavior, existing single-field rules, grouped outputs,
persistence, virtualized selection, and inspector focus. Changes are committed without including
unrelated work.
