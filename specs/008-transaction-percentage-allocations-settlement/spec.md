# Feature Specification: Transaction Percentage Allocations and Settlement

## 1. Objective

Implement the complete, usable flow for assigning a percentage of each transaction to each person
and deriving accurate, deterministic person-to-person settlement obligations.

A user must be able to:

1. Set an explicit percentage for each person on a transaction.
2. Understand how any unallocated remainder is assigned to the account owners.
3. Use negative percentages to reverse the normal obligation direction.
4. See who owes whom on the People page.
5. Trace every settlement amount back to its contributing transactions.
6. Trust that calculations conserve every minor currency unit and synchronize correctly between
   collaborators.

This specification supersedes the assumption in `specs/004-transaction-table-ux/spec.md` that
allocation editing is already sufficient.

## 2. Source requirements and resolutions

The implementation must reconcile these existing sources:

- `specs/001-core-mvp/spec.md`
    - Requires configurable person columns.
    - Requires per-person percentage allocation per transaction.
    - Says entering 50 means the person owes 50% to the account owner or owners.
    - Allows negative percentages.
    - Assigns the unallocated remainder to account owners according to ownership.
    - Includes only “Treat as Paid” transactions in settlement.
- `specs/001-core-mvp/data-model.md`
    - Stores allocations as personId → percentage.
    - Allows stored allocations to total any value.
    - Requires account ownership to total 100%.
- `.specify/memory/constitution.md`
    - Requires allocations to total 100%, deterministic zero-sum settlement, bidirectional netting,
      auditability, and transaction-level traceability.
- `specs/003-account-currency-styling`
    - Makes account currency optional.
    - Resolves currency as account currency → vault default → USD.
    - Gives new vaults a default “Me” person owning the default account 100%.
- `specs/006-transaction-storage-optimization`
    - Requires compatibility with the hierarchical transaction store and 100,000-transaction scale.
- `specs/007-human-scratch-completion/tasks/HS-009-allocation-bounds.md`
    - Requires every individual allocation to be within -100..100.
    - Requires negative values, decimals, boundary validation, real grid wiring, and all-entry-path
      enforcement.
- `specs/007-human-scratch-completion/tasks/HS-007-automation-redesign.md`
    - Future automation rules operate on the entire set of person allocation columns.
    - This implementation must expose reusable validation and mutation APIs for that work but must
      not redesign the automation system.

### Resolved interpretation of the 100% conflict

Stored allocations are explicit user overrides and may total any value.

Effective allocations, after distributing the remainder to account owners, must total exactly 100%.

Therefore:

- The system must not normalize explicit user-entered allocations to 100%.
- It must derive an owner remainder of 100 − sum(explicit allocations).
- The constitution’s 100% invariant applies to the derived effective allocation, not necessarily the
  stored explicit map.

## 3. Scope

### In scope

- Allocation domain types and validation.
- Per-person allocation columns in the transaction table.
- Editing allocations on existing, manually created, and imported transactions.
- Allocation entry when creating a transaction.
- Per-key CRDT mutations and real-time synchronization.
- Remainder allocation through account ownership.
- Correct signed settlement calculation for expenses and income.
- Deterministic minor-unit rounding.
- Person-to-person settlement obligations grouped by currency.
- Settlement source-transaction details.
- Invalid legacy-data handling.
- Unit, property, integration, E2E, and manual browser testing.
- Compatibility with existing automation allocation actions.

### Out of scope

- Recording or confirming settlement payments.
- Historical settlement periods.
- Currency conversion or cross-currency netting.
- Loans, interest, or recurring obligations.
- Household/group settlement hierarchies.
- Generic transaction column ordering or resizing.
- Full automation redesign from HS-007.
- Matching the two sides of bank transfers.

A transfer tag must not silently exclude or alter settlement. Without an explicit linked-transfer
model, transfer tags retain their existing reporting meaning. Financial attribution is expressed
through account ownership and transaction allocations.

## 4. Domain terminology

### Explicit allocation

A stored percentage entered for a person on a transaction.

```text
transaction.allocations[personId] = percentage
```

An absent entry is equivalent to an explicit allocation of zero.

A stored zero should normally be removed from the map rather than retained.

### Account ownership

The percentage of an account owned by each person. Ownership values:

- Must be finite.
- Must each be between 0 and 100.
- Must collectively total 100 within the existing ownership tolerance.
- Must contain at least one owner.

### Owner remainder

```text
remainder = 100 − sum(explicit allocations)
```

The remainder may be positive, zero, or negative.

It is distributed proportionally among the account owners.

### Effective allocation

For person p:

```text
effective[p] =
    explicit[p] +
    remainder × normalizedAccountOwnership[p] / 100
```

The calculation uses the union of:

- People with explicit allocations.
- People who own the transaction’s account.

Effective allocations must total exactly 100 before monetary rounding.

## 5. Allocation invariants

1. Each stored allocation must be a finite number in the inclusive range -100..100.
2. Decimal percentages are valid.
3. Explicit allocation totals may be below, equal to, or above 100.
4. Explicit allocations must never be silently normalized.
5. Negative percentages are valid and reverse the person’s normal financial direction.
6. Account ownership remains separately constrained to 0..100 and a collective total of 100.
7. An empty explicit allocation map is valid:
    - The owner remainder is 100%.
    - Effective allocations equal account ownership.
    - The transaction creates no settlement obligation.
8. Updating account ownership must immediately change derived settlement without rewriting
   transactions.
9. Deleted people referenced by historical allocations or ownership must remain part of the
   calculation.
10. Invalid data must never produce a plausible but incorrect settlement result.

## 6. Canonical settlement calculation

There must be one canonical production settlement engine in `src/lib/domain/settlement.ts`.

Remove, replace, or rename competing settlement implementations so callers cannot accidentally use
different financial semantics. Running/account balance functions may remain in `balance.ts`, but
settlement logic must not be duplicated there.

### 6.1 Eligibility

A top-level transaction participates only when:

- It is not soft-deleted.
- Its referenced status has `behavior === "treatAsPaid"`.
- It is a canonical top-level transaction, not a nested suspected duplicate.
- Its account exists and has valid ownership.
- Every explicit allocation is valid.

A deleted status may still qualify if the referenced soft-deleted status retains `treatAsPaid`;
deleting a status must not reinterpret historical transactions.

### 6.2 Currency

Resolve each account’s currency using:

```text
account currency → vault default currency → USD
```

Settlement obligations must be grouped and netted within one currency only.

Never combine, convert, or compare obligations from different currencies.

### 6.3 Signed transaction positions

Transaction amounts are integer minor units:

- Negative amount: expense/outflow.
- Positive amount: income/inflow.

For each transaction, apportion the signed amount twice:

1. Across effective allocations.
2. Across account ownership.

For each person:

```text
positionMinor =
    effectiveAllocationShareMinor − accountOwnershipShareMinor
```

Interpretation:

- Positive position: this person is owed money.
- Negative position: this person owes money.
- Zero: no obligation for this transaction.

This formula works for expenses, income, shared accounts, and negative allocations.

### 6.4 Deterministic minor-unit apportionment

Do not calculate settlement using binary floating-point rounding independently per person.

Use an established decimal arithmetic library. Add it as a direct dependency if the current currency
utilities cannot provide exact percentage arithmetic.

For a signed integer amount and percentage weights totaling 100:

1. Sort people by stable personId.
2. Calculate each exact decimal share.
3. Take the mathematical floor of each exact share.
4. Calculate the remaining minor units required to reach the original transaction amount.
5. Add one minor unit to entries with the largest fractional remainders.
6. Break equal fractional-remainder ties by ascending personId.

This algorithm must work when some effective percentages or exact shares are negative.

Both the effective-allocation shares and ownership shares must independently sum exactly to the
original signed transaction amount. Therefore, all person positions must sum exactly to zero.

### 6.5 Producing person-to-person obligations

For each transaction:

1. Sort debtors and creditors by personId.
2. Match negative positions to positive positions deterministically.
3. Produce positive directed contributions:

    ```text
    debtorPersonId → creditorPersonId: amountMinor
    ```

4. Preserve the source transaction ID on every contribution.

Across transactions:

1. Aggregate by currency, debtor, and creditor.
2. Net reverse obligations within the same person pair and currency.
3. Never net across currencies.
4. Remove zero results.
5. Return results in deterministic currency/debtor/creditor order.

Each final obligation must retain enough source information to explain which transactions increased
or decreased the net amount.

## 7. Required calculation examples

All examples below are mandatory unit and E2E expectations.

### Example A: No explicit allocations

- Amount: -$100
- Account ownership: Alice 100%
- Explicit allocations: none

Effective allocation:

- Alice 100%

Result: no settlement obligation.

### Example B: Basic 50/50 expense

- Amount: -$100
- Account ownership: Alice 100%
- Explicit allocations: Alice 50%, Bob 50%

Result:

Bob owes Alice $50

### Example C: Remainder to owner

- Amount: -$100
- Account ownership: Alice 100%
- Explicit allocations: Bob 30%

Remainder: 70%.

Effective allocation:

- Alice 70%
- Bob 30%

Result:

Bob owes Alice $30

### Example D: Joint owners and third person

- Amount: -$100
- Account ownership: Alice 60%, Bob 40%
- Explicit allocations: Charlie 30%

Remainder: 70%.

Effective allocation:

- Alice 42%
- Bob 28%
- Charlie 30%

Result:

Charlie owes Alice $18

Charlie owes Bob $12

### Example E: Negative allocation

- Amount: -$100
- Account ownership: Alice 100%
- Explicit allocations: Bob -20%

Remainder: 120%.

Effective allocation:

- Alice 120%
- Bob -20%

Result:

Alice owes Bob $20

### Example F: Income

- Amount: +$100
- Account ownership: Alice 100%
- Explicit allocations: Alice 50%, Bob 50%

Alice received the income through her account but Bob is entitled to half.

Result:

Alice owes Bob $50

### Example G: Equal joint ownership

- Amount: -$100
- Account ownership: Alice 50%, Bob 50%
- Explicit allocations: none

Result: no settlement obligation.

### Example H: Status exclusion

Example B with a status that does not have `treatAsPaid`.

Result: no settlement obligation.

## 8. Transaction-table experience

### 8.1 Person columns

The transaction grid must contain one percentage column per active person.

Also show a clearly marked deleted/unknown-person column when a currently displayed transaction
contains a nonzero allocation for that historical person.

Requirements:

- Column header shows the person’s name and %.
- Deleted people are labelled (deleted).
- Missing person records are labelled consistently using their stable ID.
- The virtualized header, data rows, notes rows, and add row must share one computed grid template.
- Large numbers of people must use horizontal scrolling without breaking virtualization.
- Do not implement column reordering or resizing.

### 8.2 Display state

Each cell displays the explicit stored percentage:

- Absent/zero allocation: blank or muted —.
- Nonzero allocation: signed percentage, including a visible minus sign.
- Decimal values must not be unexpectedly rounded in display.

A tooltip or accessible description must show:

- Explicit percentage.
- Effective percentage after owner remainder.
- The account-owner remainder where relevant.

The UI must not misrepresent an implicit owner remainder as an explicit user-entered value.

### 8.3 Edit state

Clicking or keyboard-activating a person cell enters inline edit mode.

- Accept negative and decimal input.
- Save on Enter or blur.
- Cancel on Escape.
- Preserve the original value when cancelled.
- Zero removes the allocation map entry.
- Reject non-finite or out-of-range values.
- Do not clamp or normalize silently.
- Keep invalid typed text local until corrected or cancelled.
- Show accessible inline validation without shifting or resizing the entire table.
- Pointer and keyboard editing must both work.

The cell must expose the effective result and current remainder while editing, either through an
adjacent non-occluding popover or accessible description.

### 8.4 Add transaction row

The add-transaction row must include the same person allocation columns.

`NewTransactionData` and the insertion path must carry allocations into the CRDT transaction. New
transactions must no longer be hard-coded to discard entered allocations.

Leaving every person blank stores `{}` and derives ownership-only allocation.

### 8.5 Current allocation component

The existing orphaned multi-person `PersonAllocationCell` may be replaced, decomposed, or retired.
The final implementation must use surfaced controls in the real transaction grid. Keeping an unused
component does not satisfy this specification.

## 9. CRDT and mutation requirements

1. Preserve `transaction.allocations` as a Loro map keyed by person ID.
2. Editing one person must mutate only that person’s map key.
3. Concurrent edits to different people must not overwrite one another.
4. Concurrent edits to the same person follow the established per-field LWW semantics.
5. Provide centralized mutations equivalent to:
    - Set/remove one person’s allocation.
    - Replace a complete allocation set for automation or future bulk operations.
6. Complete-set replacement must:
    - Validate every entry first.
    - Apply as one logical vault action.
    - Remove keys absent from the replacement.
    - Never leave a partially updated map after validation failure.
7. Use draft-style loro-mirror mutation; do not return replacement root objects.
8. Moving, swapping, nesting, or unnesting a transaction must preserve allocations unchanged.
9. Allocation mutations must remain encrypted through the existing vault sync path.
10. Changes must synchronize between collaborators within existing near-real-time expectations.
11. Use existing Loro operation history as the allocation change version record; do not add a
    parallel plaintext or server-side audit store.
12. Mutation boundaries must be compatible with the planned UndoManager work. If UndoManager is
    present, one allocation commit is one undoable action.

Presence editing-field identifiers should distinguish people, for example `allocation:<personId>`.

## 10. Validation boundaries

Central allocation validation must be used by every production entry path:

- Transaction-grid edits.
- Add-transaction submission.
- CRDT mutation helpers.
- Existing automation actions that set allocations.
- Automation undo/restoration.
- Import-time automation application.
- Migration or hydration repair tooling.
- Any future bulk replacement API.

Do not put the only validation in an HTML min/max attribute.

Introduce domain-specific allocation and ownership schemas/types rather than relying on an
unrestricted generic `Percentage`.

## 11. Invalid and legacy data

Existing vaults may contain:

- Out-of-range allocations.
- Non-finite values.
- Missing account records.
- Empty or invalid account ownership.
- Missing person records.
- Missing currency.
- Old transactions with no allocations.

Rules:

- Missing allocations are valid and mean owner remainder of 100%.
- Missing currency uses the established resolution fallback.
- Missing people do not invalidate otherwise valid historical calculations; retain the stable ID and
  show an unknown/deleted label.
- Invalid allocations or account ownership must produce typed settlement issues.
- Affected transactions must be excluded from displayed totals until repaired.
- The People page must display “Settlement incomplete” with the number of affected transactions and
  their reasons.
- It must not display “Everyone is settled up” while calculation issues exist.
- Never silently clamp, normalize, delete, or rewrite invalid legacy financial data.
- Editing and saving a bad legacy value through the surfaced UI may repair that individual value.

No transaction schema-format migration is required solely for valid existing allocation maps.

## 12. Settlement result model

The canonical engine should return a structured result, not only an array of balances:

```text
SettlementResult
├── obligations by currency
├── per-person net positions by currency
├── source transaction contributions
└── typed calculation issues
```

Every obligation must include:

- Currency.
- Debtor person ID.
- Creditor person ID.
- Positive integer amount in minor units.
- Contributing transaction IDs and amounts sufficient for explanation.

Every issue must include:

- Stable issue type.
- Transaction ID when applicable.
- Account ID when applicable.
- Human-presentable context without embedding sensitive data in logs.

## 13. People-page settlement experience

The People page must show settlement obligations grouped by currency.

For each obligation show:

- Debtor name.
- Creditor name.
- Correctly formatted positive amount.
- Visual highlighting when the current linked person is involved.

Each obligation must be expandable to show contributing transactions, including:

- Date.
- Description or resolved alias.
- Account.
- Contribution amount.
- Relevant explicit/effective allocations.

Each source row must provide a “View transaction” action that navigates to the Transactions page and
focuses or filters to that transaction.

Additional states:

- No obligations and no issues: “Everyone is settled up.”
- No qualifying paid transactions: neutral empty state.
- Calculation issues: prominent incomplete-warning state; do not claim settlement.
- Multiple currencies: separate sections with no combined grand total.
- Deleted/unknown people: stable, clearly labelled entries rather than dropping their balances.

## 14. Performance requirements

- Editing one allocation must complete within the existing <100ms interaction target.
- Person columns must preserve transaction-table virtualization.
- Settlement calculation should be linear or near-linear in transactions plus allocation/owner
  entries.
- It must not repeatedly scan all people for every transaction when only a small union is relevant.
- Calculation of 100,000 transactions should meet the existing account-balance target of
  approximately 200ms in a production build on the project’s benchmark environment, or provide
  measured evidence and a documented optimization follow-up.
- React rendering must memoize derived column definitions, lookup maps, and settlement results.
- No settlement values are persisted merely as a cache.

## 15. Automated testing

### 15.1 Unit and property tests

Production functions—not helpers defined inside test files—must be tested.

Cover:

- Allocation parsing and -100, 100, -101, 101.
- Decimals, negative zero, NaN, and infinities.
- Remainder calculation below, at, and above 100%.
- Effective allocations always totaling 100.
- Empty explicit maps.
- Multiple owners.
- Negative allocations.
- Positive and negative transaction amounts.
- Deterministic minor-unit rounding.
- One-cent and zero-decimal-currency cases.
- Sum of apportioned shares equals the original amount exactly.
- Sum of every transaction’s positions equals zero exactly.
- Sum of all net positions per currency equals zero exactly.
- Input map insertion order does not affect results.
- Bidirectional obligations net correctly.
- Different currencies never net.
- Deleted and non-paid transactions are excluded.
- Nested suspected duplicates are excluded.
- Missing people remain calculable.
- Invalid allocations/ownership produce typed issues.
- All examples in section 7.

Remove or strengthen vacuous assertions such as checking that an array length is greater than or
equal to zero.

### 15.2 CRDT integration tests

Cover:

- Set, update, and remove one allocation.
- Complete allocation-set replacement.
- Invalid replacement is atomic.
- Concurrent different-person edits merge.
- Concurrent same-person edits converge.
- Persistence through snapshot/export/import/reload.
- Transaction move, duplicate swap, nest, and unnest preserve allocations.
- Automation application and undo cannot bypass validation.
- Existing valid allocation maps require no destructive migration.

### 15.3 E2E journeys

Prefer extending the existing transaction and people journeys with `test.step()`.

Mandatory journey:

1. Create/unlock a vault.
2. Add Bob.
3. Verify the default account is owned by Me 100%.
4. Add a -$100 transaction with a Treat-as-Paid status.
5. Enter Me 50%, Bob 50% through real transaction-grid cells.
6. Verify Bob owes Me $50 on the People page.
7. Expand the obligation and verify the source transaction.
8. Navigate back to that transaction.
9. Reload and verify allocations and settlement persist.
10. Change the transaction to a non-paid status and verify it leaves settlement.
11. Restore paid status and enter Bob -20%; verify the direction reverses correctly.
12. Attempt -101, 101, paste, decimal entry, Enter, blur, and Escape.

Also cover:

- Manual add-row allocations.
- Imported transaction allocation editing.
- Multi-currency grouping.
- Joint account ownership.
- Deleted person with historical allocation.
- Two tabs or users synchronizing different person allocation cells.
- Invalid legacy data warning.
- Keyboard-only operation.
- Narrow viewport/horizontal scrolling.
- Dark mode and reduced motion.
- No browser console errors or failed network requests.

Run changed E2E journeys repeatedly with retries disabled.

## 16. Implementation sequence

1. Create canonical allocation types, validation, remainder derivation, apportionment, and
   settlement functions.
2. Replace duplicated or placeholder settlement logic and update callers.
3. Add focused CRDT allocation mutations.
4. Add allocations to transaction row/view/add data contracts.
5. Render dynamic person columns in the virtualized grid.
6. Wire existing and add-row edits to CRDT mutations.
7. Route existing automation allocation writes through centralized validation.
8. Replace the People-page summary with the canonical structured settlement result.
9. Add source-transaction details and navigation.
10. Add invalid-data handling.
11. Replace weak/local-only tests with production unit and property tests.
12. Add integration and E2E coverage.
13. Perform manual headless Playwright verification.
14. Run the full repository validation suite.

## 17. Definition of done

The feature is complete only when:

- Allocation values can be edited in the real transaction grid.
- Add-row allocations persist.
- All allocation write paths enforce -100..100.
- Explicit values are never silently normalized.
- Owner remainder is derived correctly.
- Settlement uses account ownership rather than guessing the payer from allocation size.
- Expense, income, negative allocation, and joint-account examples are correct.
- Every currency is calculated separately.
- Every minor unit is conserved deterministically.
- Settlement obligations link to source transactions.
- Invalid data is surfaced without producing misleading totals.
- Concurrent CRDT edits converge without losing unrelated person allocations.
- Targeted and full unit, integration, E2E, lint, typecheck, and formatting checks pass.
- Relevant E2E journeys pass repeated runs with retries disabled.
- Manual Playwright CLI testing verifies persistence, keyboard behavior, responsive layout, console,
  and network.
- No orphan or competing settlement implementation remains.
- Repository documentation affected by the implementation is updated.
- Changes are committed using exact-path staging; unrelated and user-owned work remains untouched.

If this work is assigned under `specs/007-human-scratch-completion/GOAL.md`, the coordinator must
first map it to an explicit package and follow `PROCESS.md`. The implementer must not edit frozen
scope, progress ledgers, or `specs/human-scratch.md` unless directed by that coordinator after
independent review.
