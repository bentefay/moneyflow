# P16C Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package / requirements / revision: `P16C` / `FS-001`, `HS-009` / `01`.
- Literal original cumulative review BASE and clean pre-product HEAD:
  `0a7c9a49722ddc4d955f910af6dbb19cfffbd600`.
- Root dispatch/control HEAD: `9418fa29003df3aa9ea659580593891d0bb8dddd`.
- This sole revision-01 worker artifact was created before any test or product edit. The index and
  worktree were empty at implementation start. Future `reviews/P16C-review-01.md` did not exist and
  was not created.
- Frozen source boundary matched:
    - `specs/human-scratch.md` `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`,
      350 lines / 24,250 bytes;
    - immutable FS-001 `specs/008-transaction-percentage-allocations-settlement/spec.md`
      `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes;
      and
    - `SCOPE.json` `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
      27,382 bytes.
- Passed P16B preservation artifacts matched:
    - implementation-05 `85bc279f87c02cbadedd5c2964cf72886fde2081903d8343a966cbf9c2b42e43`, 245
      lines / 15,982 bytes;
    - review-05 `edf379ab4d9c0d1dc64d158fdbc14caad06fcefe89eb6985ea14972321b3108e`, 340 lines /
      22,883 bytes.

## Unchanged-product RED checkpoint

Before any product edit, I added only `tests/integration/allocation-crdt.test.ts` and one focused
case in `tests/unit/domain/automation.test.ts`. The unchanged baseline command
`pnpm vitest run tests/integration/allocation-crdt.test.ts tests/unit/domain/automation.test.ts --reporter=verbose`
produced 5 expected failures and 39 passes: both central mutation exports were absent; the generic
updater replaced both valid siblings with unchecked `{ mallory: 101 }`; invalid insertion returned
`undefined` and created structure; the stable presence helper was absent; and an invalid `-0`
automation allocation was returned together with an unrelated tag change. The real
initialized-mirror legacy hydration control passed and retained `{ alice: 150, bob: 25 }`.

The exact RED checkpoint is `ff45176c5e30f66e8d10990daddb955d1c2277ad`.

## Central API, path matrix and preservation

- Final committed product/test HEAD: `7cf66fbf7f4b845355c5f956cdfa955ee6db2b59`
  (`feat centralize allocation mutations`), tree `3e6e80a030e81ae68a4ab3b499a544b1b9ceac26`.
- The committed P16C-only path index from dispatch/control HEAD to final HEAD is exactly:
    - added `src/lib/crdt/allocations.ts`;
    - modified `src/lib/crdt/context.tsx`;
    - modified `src/lib/crdt/description-aliases.ts`;
    - modified `src/lib/crdt/index.ts`;
    - modified `src/lib/crdt/mutations.ts`;
    - modified `src/lib/domain/automation.ts`;
    - added `tests/integration/allocation-crdt.test.ts`; and
    - modified `tests/unit/domain/automation.test.ts`. No page, schema, migration, snapshot,
      settlement, ownership, configuration, frozen-source, ledger or review path changed.
- `src/lib/crdt/allocations.ts` owns the typed immutable result boundary. It exports
  `setTransactionAllocation`, `replaceTransactionAllocations`, `prepareAllocationReplacement`,
  `prepareInsertedAllocations`, `copyAllocationData`, `allocationPresenceField`, their inputs, the
  success summary, and the error/result union. Success reports `{ affectedTransactions, changed }`;
  expected failures are discriminated `invalid-person-id`, `invalid-allocations`,
  `invalid-allocation-container`, or `transaction-not-found` data. The returned result graph and
  nested validation errors are frozen.
- One-key set/remove creates a one-entry candidate and calls P16A `validateAllocationSet`; it does
  not duplicate numeric validation. It rejects non-number, positive/negative infinity, `NaN`,
  negative zero, below `-100`, and above `100` before finding or changing a transaction. Inclusive
  boundaries, signed decimals and totals below/at/above 100 remain exact. Zero removes only that
  Person key. A nonzero edit assigns only that key and never replaces the allocation map or rewrites
  siblings.
- Complete replacement first inspects every own enumerable descriptor into a null-prototype record.
  It rejects arrays/non-records, custom/inherited prototypes, enumerable symbols, accessors and
  uninspectable proxy traps; it never invokes a getter or mutates the caller. Exact `$cid` is
  treated only as collection metadata. Legitimate adversarial IDs `$cid-like`, `constructor` and
  `__proto__` remain data. Only after the complete set validates does it delete absent keys, omit
  zero entries and set exact nonzero values.
- Both mutations traverse all physical matches in the location's real Loro day buckets, including
  nested duplicates and conflict copies. They mutate draft Loro map keys directly. There is no
  detached replacement record and no parallel allocation state. `allocationPresenceField(id)`
  deterministically returns `allocation:<id>` for P16D.
- `UpdateTransactionInput` statically omits `allocations`, and its runtime loop also ignores an
  injected `allocations` property. The description-alias updater rejects the same runtime bypass
  before alias or transaction mutation.

### Current write-path matrix

- **Transaction/add/manual insertion:** public `insertTransaction` validates the parent allocation
  set and every supplied nested-duplicate set before creating any bucket or duplicate structure. It
  then copies the validated maps so loro-mirror may add its own collection metadata. The current
  Transactions add row calls this boundary with `{}`. The alias-only manual insertion checks the
  typed result before creating or linking an alias; a nonempty valid-map and invalid-map integration
  case proves both outcomes.
- **Import insertion/delete:** the current import page calls the same public insertion with `{}`.
  There is no current nonempty import allocation source. Import deletion may promote a surviving
  nested transaction, so its private stored-structure path copies every numeric own Person entry
  except exact `$cid`; a distinct-date/import test proves `{-12.5, 87.5}` survives parent-import
  deletion exactly.
- **Automation evaluation/application:** every `setAllocation` action is completely prepared before
  tags/status changes are returned. Invalid matched automation carries an error and batch/tracking
  functions omit it. Valid evaluation copies the prepared set. `applyAutomationChanges` validates
  both current and target allocation maps before changing allocation/status/tags in one caller-owned
  action. Capture excludes exact `$cid`; `restoreAutomationApplication` uses the same boundary and
  rejects invalid restoration without touching other fields. There is currently no product caller
  that applies automations during import or directly mutates a transaction; that absence is recorded
  rather than claimed as a routed UI path.
- **Complete/bulk route:** the central complete replacement is exported through the CRDT barrel and
  `useTransactionActions` as one `"edit"` vault action. No current bulk-allocation UI invokes it;
  P16D owns the grid/person-column UI.
- **Hydration/migration/repair:** existing schema maps and ordinary mirror hydration remain
  unchanged; no destructive migration was added. A real snapshot containing legacy `alice: 150`
  hydrates with `bob: 25` untouched. Exact-key repair changes only Alice to `-50`.
- **Structural operations:** move across account/date, nest, unnest, parent swap, alias-aware update
  and import-delete preservation copy own numeric allocation data without `$cid` and without
  normalization. Private stored-structure insertion deliberately bypasses new-input validation so
  structural movement cannot silently destroy an invalid legacy value.

### CRDT, history, persistence and preservation proof

- A literal initialized-snapshot two-peer test performs Alice/shared edits on one peer and
  Bob/shared edits on the other. Alice and Bob merge, the shared key uses Loro's same-key LWW
  result, and importing the two actual update byte arrays in both orders converges.
- Fixed seed `0x16c2026` drives 66 production one-key operations: 32 distinct left keys, 32 distinct
  right keys and one shared-key operation on each peer. Both update orders converge to 65 explicit
  keys and match an independently accumulated oracle for all 64 nonconflicting keys.
- A failed complete replacement produces no document history. A successful complete replacement is
  one `VaultUndoCoordinator` action; one undo restores `{ alice: 40, bob: 60 }`, a second undo is
  unavailable, and one redo restores `{ alice: -10, carol: 25.5 }`.
- Plain Loro snapshot/update exchange plus production encrypted snapshot and incremental-update
  helpers retain signed decimals and exact maps. Encrypted payload strings do not contain the Person
  keys used as plaintext sentinels.
- P16A allocation validation/apportionment and P16B settlement owners were not edited. Their full
  repository tests pass. P09 history, P11 description aliases and P14 import lineage/delete behavior
  pass focused, broad and Chromium regression profiles.

## Automation, performance and installed-CLI evidence

### Automated gates on the final code

- Focused command:
  `pnpm vitest run tests/integration/allocation-crdt.test.ts tests/unit/domain/automation.test.ts`
  ran in three clean Vitest processes. Each passed 2 files / 66 tests. Durations were 1.41s, 1.42s
  and 1.40s. The allocation file itself has 27 production-boundary tests; automation has 39.
- Broad command:
  `pnpm vitest run tests/integration/allocation-crdt.test.ts tests/integration/automation.test.ts tests/unit/domain/automation.test.ts tests/unit/crdt/transaction-mutations.test.ts tests/integration/transaction-operations.test.ts tests/integration/import.test.ts tests/unit/crdt/undo.test.tsx tests/unit/crdt/sync.test.ts tests/integration/sync-offline.test.ts tests/integration/description-alias-actions.test.ts --reporter=dot`
  passed 10 files / 209 tests in 1.63s. The description-alias tests emitted their inherited React
  `act(...)` advisories but had no failure.
- `pnpm test -- --run` passed 64 files, 1,483 tests and the same 2 inherited skips in 6.76s.
- `pnpm typecheck` passed. An earlier final-code attempt identified only missing `VaultState`
  callback annotations in the new alias-path test; those annotations were corrected before the
  successful run and commit.
- `pnpm lint` passed with 0 errors and 10 inherited warnings: the existing TanStack Virtual React
  Compiler advisory plus existing unused test/query imports.
- `pnpm build` passed its optimized production compile, TypeScript phase and all 17 routes.
- Exact changed-path `pnpm exec oxfmt --check ...` passed all 9 checked product/test/evidence paths
  in 210ms. Exact changed-path ESLint and `git diff --check` also passed.
- Repository `pnpm format:check` remained nonzero only for 14 inherited, out-of-scope files:
  `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, P12
  implementations 03–06, P14 implementation-01, P12 reviews 05–06 and `specs/human-scratch.md`. The
  P16C evidence is not in that list.
- Affected read-only Chromium:
  `pnpm exec playwright test tests/e2e/accounts.spec.ts tests/e2e/transactions.spec.ts tests/e2e/import.spec.ts tests/e2e/undo-redo.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line`
  passed 66/66 in 4.5m.
- Full read-only Chromium:
  `pnpm exec playwright test --project=chromium --workers=1 --retries=0 --reporter=line` passed
  102/102 in 6.6m. Existing offline/realtime/auth cases intentionally emitted connection/fetch
  warnings while interrupting connectivity; no test failed.

### Performance evidence

- Environment: Linux `7.0.0-15-generic` x86_64, AMD Ryzen 9 5950X (16 cores / 32 logical CPUs), Node
  `v22.21.1`, pnpm `11.13.1`, Vitest `4.1.10`.
- The integration benchmark uses production `insertTransaction`, `setTransactionAllocation` and
  `replaceTransactionAllocations`, fixed seed `0x16c2026`, 1,000 transactions each containing the
  same representative 250-key signed allocation map, 20 warmups and 100 measured samples per
  operation. The measured transaction is in the middle of the set and replacement alternates one
  value so calls are real changes.
- Representative final verbose result:
    - one-key edit mean `0.06028116ms`, p50 `0.057228ms`, p95 `0.065183ms`, max `0.178836ms`;
    - complete replacement mean `0.32999547ms`, p50 `0.318188ms`, p95 `0.365667ms`, max
      `0.629353ms`. The other two clean processes measured one-key means `0.05656064ms` and
      `0.05754385ms`, and replacement means `0.33445233ms` and `0.33064314ms`.
- This directly measures the P16C mutation boundary and is comfortably below the existing 100ms
  one-edit target on this environment. It does not claim P16E's future 100,000-transaction
  settlement/UI target. An initial ad-hoc `tsx -e` harness could not load the project's ESM temporal
  dependency through its CJS evaluation path; the committed Vitest benchmark uses the repository's
  supported transform and is the recorded result.

### Installed `playwright-cli` charter

- Root ran the keyed dev server; I used only installed headless `playwright-cli` session
  `p16c-impl-01`. Onboarding completed without revealing or copying the masked recovery phrase.
- Manual transaction journey: added a row, set description `Manual boundary row`, amount `-12.34`,
  moved date from 7/25 to 7/24/2026, created and moved it to Secondary account, reloaded, and
  observed the exact date/description/account/amount persist. Delete followed by the single history
  Undo restored the exact row.
- CSV journey used one valid row (`Imported boundary row`, 7/23/2026, `-45.67`), previewed 1 valid /
  0 errors, imported it, and observed both the manual and imported rows after navigation. The
  existing People caller showed one member and the neutral “Everyone is settled up” state.
- P16D allocation cells/columns are not surfaced, so I did not fake allocation editing or claim UI
  acceptance. Accessibility snapshots exposed semantic navigation, headings, transaction grid, named
  row selection controls and history controls. Normal 390×844 reflow produced the mobile banner/menu
  layout. At desktop viewport, CSS 200% zoom retained headings/controls with no horizontal document
  overflow. Dark color scheme and reduced-motion media queries were active.
- At the corrected `http://localhost:3000` origin, console inspection returned 0 errors and observed
  navigation/sync requests were successful. The earlier `127.0.0.1` attempt produced only a
  development HMR origin mismatch; root corrected the harness origin without product/config edits.
- Boolean-only privacy probes returned `false` for known manual/import transaction plaintext in
  localStorage, sessionStorage and every IndexedDB store. Seed controls remained masked. No raw
  store content or recovery phrase was printed.
- `close`, `delete-data`, then `list` closed the session, found no remaining user data and reported
  no browsers. Root removed exactly 28 new P16C CLI files to recoverable trash while retaining 22
  older files, removed generated test artifacts, restored `next-env.d.ts`, stopped/cleared port
  3000, and exact-path unlinked the 64-byte temporary CSV because that mount had no trash support.
  Root then moved the final 41,966,650-byte post-build `.next` directory to recoverable trash and
  confirmed test-results/report absent, port 3000 clear and only this evidence in the worktree.

## Paths, immutable identities, risks and review request

- Final commit chain for this revision is dispatch/control
  `9418fa29003df3aa9ea659580593891d0bb8dddd`, RED `ff45176c5e30f66e8d10990daddb955d1c2277ad`, and
  GREEN `7cf66fbf7f4b845355c5f956cdfa955ee6db2b59`.
- The worker staged exact paths only. After GREEN commit, the sole worktree item is this uncommitted
  revision-01 implementation evidence directory/file. No review artifact exists.
- Deliberate exclusions: no P16D transaction-grid/person-column UI; no P16E settlement/People
  obligation UI or 100,000-row claim; no schema/migration repair that would erase invalid legacy
  data; no automation/import feature expansion where a caller is currently absent.
- Residual review focus: independently challenge draft per-key merge/LWW semantics, physical-copy
  traversal, invalid-container determinism, automation transaction atomicity, public-versus-stored
  insertion separation, legacy-invalid structural preservation and the honest path absences. The
  benchmark is environment-specific and not a UI/render measurement.
- No material ambiguity required a `Q-PROPOSAL-P16C-01-*`; no invariant was weakened.
- Requested independent review range is literal cumulative
  `0a7c9a49722ddc4d955f910af6dbb19cfffbd600..7cf66fbf7f4b845355c5f956cdfa955ee6db2b59`, with this
  exact uncommitted artifact as the assigned implementation evidence. This document makes no
  independent-review `PASS` claim.
