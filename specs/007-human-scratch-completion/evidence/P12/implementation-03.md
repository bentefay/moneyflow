# P12 Implementation Evidence — Revision 03

## Immutable dispatch boundary

- Package / requirement / revision: `P12` / `HS-005` / `03`.
- Original cumulative BASE: `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`.
- Clean revision-03 pre-implementation HEAD:
  `b2c32a40e0aca052771c45d086180522e040e5f4`.
- Revision-02 failed review was read before product/test edits. Prior evidence, reviews and cumulative
  implementation remain immutable.
- This file is the sole writable worker artifact. It was created before product/test edits and will
  remain uncommitted for independent review.
- Initial index and untracked set were empty. Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md`.

## Revision plan

1. Add red counterexamples for physical-copy-complete unnest/swap, every exported query boundary and
   oversized inner maintenance work.
2. Define deterministic all-copy nested resolution and one canonical public query rule.
3. Replace transaction-sized recursive/proof/apply units with genuinely bounded resumable work.
4. Preserve cumulative P12 behavior and run focused repeats, full automation and the installed-CLI
   manual charter.
5. Commit only exact authorized product/test paths and leave this completed evidence uncommitted.

## Status

Revision-03 implementation and validation are complete at immutable worker commit
`058098dc74833523bc4a05094b164af5635f327f`. This artifact makes no PASS claim; the exact
cumulative range and evidence are for independent review.

- Revision-03 range:
  `b2c32a40e0aca052771c45d086180522e040e5f4..058098dc74833523bc4a05094b164af5635f327f`.
- Cumulative P12 review range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..058098dc74833523bc4a05094b164af5635f327f`.
- Revision-03 comprises the preserved interim commit
  `7e1fb5d1145cbf363751c4f7bc7748844b0fd104` and continuation commit
  `058098dc74833523bc4a05094b164af5635f327f`.

## Physical-copy-complete nested mutations

- `unnestDuplicate` now gathers every physical parent copy, deterministically selects one nested
  value, removes that logical duplicate from every parent and removes pre-existing standalone
  copies before inserting one standalone transaction.
- `swapDuplicate` now deterministically selects both the parent and promoted duplicate, deletes
  every physical old-parent and pre-existing promoted-parent copy, and unions remaining nested
  identities before inserting one promoted parent.
- New divergent-copy regressions cover both operations. The focused profile passes these together
  with the prior same-ID edit/delete/move and relocation-interleaving coverage.

## Canonical exported query boundaries

- `findTransaction` collects all matching parent and nested physical copies before applying the
  shared canonical selector.
- `findTransactionById` scans all account/date locations, applies the same value selection, and uses
  account/date as deterministic location tie-breakers.
- `getTransactionsInDateRange`, including the import duplicate-detection caller contract, now
  canonicalizes by logical ID before its ascending merge-scan order.
- One divergent physical fixture asserts that location, ID-only and date-range reads all select the
  same payload.

## Bounded maintenance work

- Root account and alias key discovery is a persistent generator phase that records at most one key
  per planning step instead of materializing whole maps inside an animation-frame callback.
- Transaction target discovery is a resumable year/month/day/transaction state machine. Each
  planning step examines at most one structural item, while a deterministic cached target avoids
  repeatedly rescanning the same conflicting date bucket.
- Relocation builds a detached low-level transaction clone incrementally. One apply invocation
  copies at most eight dynamic tag, allocation or nested-duplicate items; incomplete preparation
  makes no document mutation. The final invocation attaches the completed detached root and deletes
  the exact source in one `system:gc` commit, so observers never see a public copy-only state.
- Relocation plans carry exact source/target positions, an anchor identity and the proven state
  object. Apply performs fixed-depth index/state revalidation, and stale delayed plans are rejected
  before mutation. Empty-container pruning is likewise fixed-depth; recursive JSON equality and
  whole-source structural scans are absent from the frame path.
- Alias proof is a persistent transaction/alias graph cursor. It inspects one parent, nested or alias
  reference per step, records the proven state, and applies deletion by exact key with constant-work
  target/source revalidation rather than a whole-vault scan.
- Relevant transaction or alias-graph edits invalidate the corresponding proof/clone work. Unrelated
  notes edits do not continually reset alias progress, preserving scheduler fairness under sustained
  editing.
- Oversized counterexamples exercise a relocation containing 128 tags, 128 allocations and 64 nested
  duplicates across more than 20 preparation chunks, and an alias graph containing 128 transactions
  plus 128 other aliases across more than 256 planning steps. The relocation retains its full payload
  with exactly one `system:gc` origin; the alias is removed only after the bounded proof completes.

## Automated validation

- Three clean focused processes each passed 4 files / 85 tests:
  `tests/unit/crdt/maintenance.test.ts`, `transaction-mutations.test.ts`,
  `transaction-queries.test.ts`, and `tests/integration/vault-maintenance.test.tsx`.
- Final `pnpm test`: 60 files / 1,258 tests passed.
- Final `pnpm typecheck`: clean.
- Final `pnpm build`: compiled, typechecked and generated all 17 routes.
- Final `pnpm lint`: exit 0, zero errors and the same ten disclosed repository warnings.
- Final browser suite, with retries disabled:
  `pnpm exec playwright test --workers=4 --retries=0 --reporter=dot`; 87 / 87 passed.
- Scoped `oxfmt --check` and `git diff --check`: clean.

## Installed headless Playwright CLI charter

- Used only the repository-installed `pnpm exec playwright-cli` in headless mode, with session
  `p12-r03-20260722`. No MCP, `npx`, temporary config/test, headed mode, dashboard show,
  UI/debug/pause or sleep was used.
- Created a user and kept the recovery phrase masked throughout snapshots; it was never revealed,
  copied or printed. The first server start truthfully displayed `Failed to load vault` and
  `Realtime authorization unavailable` because `SUPABASE_JWT_SECRET` was absent. The server was
  restarted with the existing container secret extracted without printing it, after which Settings
  showed the vault, online presence and `Saved`.
- Through normal controls, created two `Manual Shared` transactions (`12.34` and `23.45`), observed
  their shared alias, added `Manual Target`, edited one row and used the single `Change Description`
  dialog's `Change all` action. Both rows changed to `Manual Target`; Undo restored both to
  `Manual Shared`; Redo changed both back; reload reset history with Undo/Redo disabled.
- Tx Descriptions then showed only `Manual Target` with two transactions, confirming collection of
  the source alias. `Saved` and online presence were observed before closing the CLI browser and
  stopping the manually started server. Locator correction used fresh snapshot refs after the first
  Add-transaction text locator did not match.

## Boundary and cleanup

- Frozen scratch remains SHA-256
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines / 24,246
  bytes. Frozen FS-001 remains
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes. `SCOPE.json` remains
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines / 27,382
  bytes.
- Revision-02 evidence remains SHA-256
  `7ed3e646ec39a75ab11650fbdc17498c94f27aa2c1d5208970eb79ea2a451574`; review-02 remains
  `91fb0949549ffe2481f5109bf98808d07304bee97710ac244a0d2366cd79738b`.
- The interim commit's parent is exactly the dispatched clean HEAD; the continuation commit's parent
  is exactly the interim commit. Across both commits, the revision contains exactly these seven
  authorized product/test paths: `src/lib/crdt/description-aliases.ts`,
  `src/lib/crdt/maintenance.ts`, `src/lib/crdt/mutations.ts`, `src/lib/crdt/queries.ts`,
  `tests/unit/crdt/maintenance.test.ts`, `tests/unit/crdt/transaction-mutations.test.ts`, and
  `tests/unit/crdt/transaction-queries.test.ts`.
- Root-owned `HANDOFF.md` and `PROGRESS.md` remain unstaged and untouched by this worker. This
  evidence is the sole uncommitted worker artifact, and the index is empty.
