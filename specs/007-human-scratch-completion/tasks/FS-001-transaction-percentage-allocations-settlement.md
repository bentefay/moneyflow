# FS-001 — Transaction Percentage Allocations and Settlement

- **Status:** queued
- **Source:** entire immutable `specs/008-transaction-percentage-allocations-settlement/spec.md`,
  lines 1–715, 25,441 bytes, SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`
- **Packages:** P16A, P16B, P16C, P16D, P16E
- **Lifecycle:** identical evidence, exact BASE..HEAD, independent revisioned review, integration
  and definition-of-done gates as every other first-class Goal requirement
- **Source completion:** no checkbox and no source mutation; root records completion only after all
  five packages pass

## Canonical authority

The entire canonical source is binding. Implementer and reviewer must read it completely before each
P16 package and use its sections 1–17 directly; this task is a routing contract, not a replacement
or narrower summary. If this task, an older spec, existing behavior or an old test conflicts with
the canonical source, the canonical source wins. A proposed deviation must be returned as a Q
proposal with evidence but cannot be silently implemented or accepted.

The source expressly supersedes the assumption in `specs/004-transaction-table-ux/spec.md` that
allocation editing is sufficient. FS provenance does not make this requirement secondary: GOAL may
not complete until FS-001 and every HS requirement pass.

## Binding conflict resolutions and boundaries

- Stored explicit allocations are user overrides and may total below, at or above 100. Never
  silently normalize them. The derived owner remainder is `100 - sum(explicit)` and may be positive,
  zero or negative. Distribute it proportionally by valid account ownership; derived effective
  allocations total exactly 100 before money rounding.
- Every explicit allocation must be finite and inclusively `-100..100`; decimals and negative values
  are valid. Reject invalid input at every boundary. Never clamp, normalize, delete or rewrite
  invalid values. A stored zero is normally removed; an absent key means explicit zero.
- Ownership is a distinct domain: every value is finite `0..100`, at least one owner, collective
  total 100 within established tolerance. Ownership changes recompute settlement without rewriting
  transactions.
- One production engine in `src/lib/domain/settlement.ts` owns settlement semantics. Remove/rename
  competing implementations; running/account balances may remain elsewhere but cannot duplicate
  settlement. Do not persist settlement caches or add plaintext/server audit storage; Loro history
  is the allocation version record.
- Only qualifying canonical top-level, non-deleted Treat-as-Paid transactions participate. A deleted
  referenced status still qualifies if its retained behavior is Treat-as-Paid. Nested suspected
  duplicates do not participate. Transfer tags never silently exclude or change settlement.
- Currency resolves account → vault default → USD. Calculate, aggregate and reverse-net only within
  a currency; never convert, compare, net or show a combined total across currencies.
- Missing/deleted People remain in historical calculations by stable ID. Invalid allocation,
  ownership/account data produces typed issues and excludes affected transactions from displayed
  totals; UI says settlement is incomplete and never falsely says everyone is settled.
- Scope excludes payment recording, periods, conversion, loans/interest, recurring/group settlement,
  generic column order/resize, full automation redesign, and transfer-side matching.

## P16A — Allocation, ownership, remainder and exact apportionment

- **Depends on:** P01
- Introduce domain-specific allocation and ownership schemas/types rather than unrestricted generic
  Percentage. Parse/reject negative zero, NaN, infinities, out-of-range and invalid ownership
  consistently; HTML min/max is not the validation boundary.
- Derive owner remainder and effective allocation over the union of explicit People and account
  owners. Preserve any explicit total and prove effective decimal weights total exactly 100,
  including empty maps, multiple owners, decimal/negative explicit values and remainder below/at/
  above zero.
- Build one production exact signed-minor-unit apportionment using an established decimal library
  added as a direct dependency if existing currency utilities are insufficient. Sort stable person
  IDs, mathematically floor exact shares including negatives, allocate remaining units by largest
  fractional remainder, break ties by ascending person ID and conserve the original signed amount.
- Provide typed, reusable pure results/errors for P16B/C/D and tests. Do not calculate independent
  binary floating-point rounded shares.

### P16A acceptance

- All boundary/decimal/remainder/effective invariants and insertion-order independence are property
  tested against production functions. Both effective and ownership apportionments independently sum
  to the source amount for positive/negative/one-cent/zero-decimal-currency cases.
- HS-009's bounds are satisfied here only through rejection; no clamp or explicit-total
  normalization exists.

## P16B — Sole canonical settlement engine

- **Depends on:** P16A
- Make `src/lib/domain/settlement.ts` the sole callable production settlement engine and
  update/remove competitors so callers cannot select different semantics.
- Implement eligibility, currency resolution, signed positions as effective share minus ownership
  share, deterministic debtor/creditor matching, directed positive contributions with source
  transaction IDs, currency/person-pair aggregation, reverse netting, zero removal and deterministic
  result ordering.
- Return structured obligations by currency, per-person net positions by currency, source
  transaction contributions and typed calculation issues. Obligations use positive integer minor
  units and retain enough positive/negative contribution detail to explain the net. Issues have
  stable type, transaction/account context where applicable and no sensitive log payload.
- Preserve deleted/unknown people, deleted qualifying statuses and immutable historical meaning;
  exclude non-paid/deleted/nested duplicates and invalid financial inputs exactly as canonical.
- Give every canonical example A, B, C, D, E, F, G and H its own named production unit/property
  expectation for expenses, income, remainder, joint owners, negative allocation, equal ownership
  and status exclusion. All eight are mandatory; no combined case, general conservation test or
  end-to-end journey substitutes for any one. Separately prove per-transaction and per-currency
  zero-sum conservation.
- Keep computation linear/near-linear in transactions plus relevant allocation/owner entries; do not
  scan every Person per transaction. Benchmark 100,000 transactions against approximately 200ms in
  production build, or provide measured evidence and a documented optimization follow-up without
  claiming the target passed.

### P16B acceptance

- No orphan/competing settlement implementation or vacuous test remains; all current callers use the
  canonical structured result. Different currencies never net, source traceability survives netting,
  and invalid data cannot produce plausible totals.

## P16C — CRDT mutation APIs, every write path and preservation

- **Depends on:** P16A, P16B, P09, P14
- Preserve `transaction.allocations` as a Loro map keyed by Person ID. Central APIs set/remove one
  key and replace a complete explicit set. One-person edits touch only that key; different-person
  concurrent edits merge and same-key edits follow established LWW convergence.
- Complete-set replacement validates every entry before one logical vault action, removes absent
  keys, stores explicit values only and leaves no partial update on failure. It must never derive,
  store, clamp or normalize an effective set.
- Route every current production path through central validation/mutations: grid, add-row insertion,
  existing automation allocation actions, automation undo/restoration, import-time automation,
  migration/hydration repair and future bulk replacement. No path may cast or write around
  validation.
- Moving/swapping/nesting/unnesting transactions preserves allocations.
  Snapshot/export/import/reload and encrypted collaboration sync preserve them. Valid existing maps
  require no destructive schema migration; invalid legacy data is retained and surfaced until a user
  repairs an individual value.
- Use draft-style loro-mirror mutation and Loro operation history only. If UndoManager exists, one
  allocation commit/replacement is one undo action. Editing presence identifies
  `allocation:<personId>`.

### P16C acceptance

- Integration tests cover set/update/remove, atomic complete replacement, invalid rollback,
  same/different-key concurrency, persistence/convergence, structural transaction operations, every
  automation/import/undo/hydration path and non-destructive valid-map compatibility.

## P16D — Real virtualized transaction-grid and add-row UX

- **Depends on:** P16C, P13
- Surface one percentage column per active Person in the actual grid plus clearly marked deleted or
  unknown historical columns whenever displayed transactions contain nonzero references. Use stable
  IDs and labels; do not drop balances because a Person record is missing.
- Header, data rows, notes rows and add row share one memoized computed grid template. Many People
  use horizontal scrolling without breaking row/header alignment, focus, presence or virtualization.
  Do not add generic reorder/resize.
- Display explicit stored values only: blank/muted dash for absent/zero, signed decimal percentage
  for nonzero without surprise rounding. Tooltip/accessible description distinguishes explicit,
  effective and relevant owner remainder; never display implicit remainder as user-entered.
- Actual grid cells enter edit by pointer/keyboard, accept signed decimals, save Enter/blur, cancel
  Escape preserving original, remove zero keys, keep invalid typed text local and show accessible
  validation without resizing/occluding the table. Editing exposes effective result/remainder nearby
  and presence distinguishes Person.
- Add row uses identical columns and carries allocations through `NewTransactionData` and insertion;
  blank People persist `{}` and derive ownership-only effective allocation. Replace/decompose/retire
  the orphan multi-person component; unused controls do not satisfy this package.

### P16D acceptance

- Manual and automated real-grid evidence covers active/historical/missing People, pointer/keyboard,
  paste/decimal/-101/101, Enter/blur/Escape, add/manual/import rows, refresh/undo, two-tab/user
  different-cell sync, narrow horizontal scroll, dark/reduced motion, role/name/state, reflow/zoom,
  contrast, console/network and <100ms allocation interaction target.

## P16E — People obligations, issues, traceability and integrated hardening

- **Depends on:** P16D, P08, P11C
- Replace the People summary with canonical obligations grouped in separate currency sections. Show
  debtor/creditor names, correctly formatted positive amount and current linked-Person highlighting;
  never produce a combined cross-currency total.
- Expand each obligation into contributing transactions with date, resolved description/alias,
  account, signed contribution and relevant explicit/effective allocations. “View transaction” opens
  Transactions and focuses/filters the stable source ID.
- Implement distinct states: everyone settled only with no obligations/issues; neutral
  no-qualifying- paid state; prominent “Settlement incomplete” with affected count/reasons; multiple
  currencies; deleted/unknown stable labels.
- Complete full integration/performance/memoization hardening. Derived columns/lookups/results are
  memoized; settlement is never persisted as cache. Update affected repository documentation.

### P16E acceptance

- Give every canonical example A, B, C, D, E, F, G and H its own named E2E expectation against the
  production settlement path. All eight are mandatory in E2E as well as P16B unit/property coverage;
  no general journey, combined example or manually observed result substitutes for any one.
- Mandatory E2E follows canonical steps 1–12: create/unlock, Bob, default Me ownership,
  paid -$100,
  real-grid 50/50, Bob owes Me $50, expand source, navigate back, reload, non-paid
  removal, restore, negative reversal, and invalid/paste/decimal/edit semantics.
- Additional E2E/manual coverage includes add row, imported edit, joint ownership, multiple
  currency, historical Person, invalid warnings, collaboration, keyboard, responsive/horizontal
  scroll, dark/ reduced motion, deterministic accessibility, console/network and repeated
  retries-disabled runs.
- Full unit/property/integration/E2E/lint/typecheck/format/build pass and production benchmark
  evidence is linked. No misleading total, validation bypass, traceability gap or competing engine
  remains.

## Canonical sections 1–17 coverage matrix

| Canonical section        | Primary package(s)     | Non-negotiable evidence                                                                    |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------ |
| 1 Objective              | P16A–E                 | Complete edit → derive → obligation → source navigation → collaboration journey            |
| 2 Sources/resolutions    | P16A, P16C             | Explicit totals preserved; effective total 100; reusable validated whole-set API           |
| 3 Scope                  | P16A–E                 | Every in-scope item owned; explicit out-of-scope and transfer-tag behavior unchanged       |
| 4 Terminology            | P16A                   | Explicit/ownership/remainder/effective typed and tested exactly                            |
| 5 Invariants             | P16A, P16B             | Bounds, remainder, historical People, ownership recomputation, invalid issues              |
| 6 Canonical calculation  | P16A, P16B             | Sole engine, eligibility/currency/positions/exact apportionment/net/contributions          |
| 7 Examples A–H           | P16B, P16E             | All eight each have a named production unit/property expectation and named E2E expectation |
| 8 Transaction table      | P16D                   | Actual virtual grid/add row, historical columns, display/edit/remainder UX                 |
| 9 CRDT/mutations         | P16C                   | Per-key merge, atomic complete set, preservation, encryption, undo/presence                |
| 10 Validation boundaries | P16A, P16C             | Every listed production path uses central schemas/mutations; no HTML-only guard            |
| 11 Invalid/legacy        | P16B, P16C, P16E       | Retain data, typed exclusions/issues, incomplete UI, safe individual repair                |
| 12 Result model          | P16B                   | Obligations, positions, contributions and typed issues with stable context                 |
| 13 People page           | P16E                   | Currency groups, expand/source navigation, linked/high-risk/empty states                   |
| 14 Performance           | P16A, P16B, P16D, P16E | <100ms edit, preserved virtualization, near-linear engine, 100k benchmark                  |
| 15 Automated tests       | P16A–E                 | Production unit/property, CRDT integration, mandatory/additional E2E and repeats           |
| 16 Sequence              | P16A–E                 | Dependency order and caller migration match the canonical sequence                         |
| 17 Definition of done    | P16E then P21          | Every canonical bullet linked to PASS evidence and final independent audit                 |

## Automated and manual evidence ownership

- P16A owns parsing/schema/remainder/effective/apportionment unit and property tests.
- P16B owns a named production unit/property expectation for each example A–H, plus conservation,
  ordering, eligibility/currency/issues/netting tests and benchmark.
- P16C owns CRDT/concurrency/persistence/structural/automation/import/undo/hydration integration
  tests.
- P16D owns grid/add-row component/E2E/manual allocation interaction, accessibility, collaboration
  and virtualization evidence.
- P16E owns a named E2E expectation for each example A–H, People obligations/issues/source
  navigation, the mandatory 12-step end-to-end journey, extra matrices, final feature performance
  and full-suite repeats. Each package still receives independent manual Playwright CLI review
  appropriate to its surfaced behavior; later packages do not waive earlier review.

## Risks and question routing

Highest risks are silent financial normalization/clamping, incorrect signed/negative floor rounding,
lost minor units, cross-currency netting, duplicate settlement engines, invalid data shown as truth,
per-key CRDT overwrite, automation/import bypass, historical Person loss, virtual-grid jank and
source traceability drift. Each package returns complete Q proposals in assigned evidence; workers
never edit canonical sources or global ledgers and never weaken an explicit canonical clause through
a default.

## FS-001 definition of done

FS-001 passes only when P16A–E all pass independently and every canonical section 17 bullet has
linked evidence: real grid and add-row persistence, all-path rejection bounds, no normalization,
correct remainder/ownership/expense/income/negative/joint/currency/exact-unit settlement,
source-linked obligations, honest invalid-data issues, convergent CRDT edits, targeted/full/repeated
automated and manual verification, one canonical engine, updated affected documentation, exact-path
commits and preserved unrelated work. Root records the immutable canonical source hash and FS-001
completion in PROGRESS; it never edits the canonical source.
