# P14 Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package / requirement / revision: `P14` / `HS-008` / `01`.
- Literal original BASE and clean pre-implementation HEAD:
  `b9105028926d24a5a0c5454777a6c33379ca606a`.
- This sole revision-01 worker artifact was created before any product or test edit.
- Existing dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; the index was empty.
- The future reviewer artifact `reviews/P14-review-01.md` did not exist and was not created.

## Deterministic red counterexamples

- Before product edits, this clean-process command:
  `pnpm exec vitest run tests/unit/crdt/transaction-mutations.test.ts
  tests/unit/sync/manager.test.ts --pool=forks --maxWorkers=1`
  produced **3 failed / 37 passed**:
  - deleting an import-A parent also lost its nested import-B child;
  - the first actual imported amount edit did not create `originalAmount`;
  - one 1,000-row Mirror update reached `SyncManager.encryptUpdate` and failed with
    `RangeError: Maximum call stack size exceeded` at the unbounded
    `String.fromCharCode(...encrypted)` conversion.
- The original imports page also called two independently history-wrapped actions
  (`deleteTransactionsByImport` and `deleteImportRecord`) for one confirmation. Source inspection
  therefore established a split two-action history counterexample before the real-Loro atomic
  integration test was added.
- The initial manager red test exposed a test-cleanup defect after its expected rejection; cleanup
  was corrected and the unchanged product was rerun to the exact three requirement-owned failures
  above. No product fix was credited to test contamination.

## Implementation and acceptance mapping

- `schema.ts` adds backward-compatible optional `originalAmount` minor units to both parent and
  nested transaction maps. Legacy objects without the key remain valid and materialize it as
  `undefined`.
- `mutations.ts` centralizes provenance at the generic update boundary. Only a real amount change
  on a row with a non-empty `importId` captures the current amount, and only while
  `originalAmount` is nullish. Callers cannot mutate `importId`, `originalAmount`,
  `creationInstant`, or `importRowIndex` through the generic update input.
- Parent/nested insertion, physical canonical identity, copying, date/account movement, unnesting
  and swapping now carry `originalAmount`. Query canonicalization/materialization and maintenance
  shadows also include it. Alias-aware manual insertion explicitly leaves both import lineage and
  original amount absent.
- Deletion scans every physical parent/nested representation. A target-import parent is removed,
  but nested rows owned by another import are deterministically deduplicated and rehomed as a
  standalone row when no surviving physical representation exists. Existing pruning runs only
  after preservation and removes only empty account/date buckets.
- `deleteDescriptionAliasedTransactionsByImport` unlinks matching alias backlinks, performs the
  transaction deletion, and soft-deletes the import record inside the same Mirror draft. The
  imports page now invokes only this one history action. The real-Loro test proves one Undo restores
  both record and rows, a second Undo is unavailable, and Redo repeats the isolated deletion.
- The dialog names the exact linked-row consequence, states that other imports/manual rows remain,
  and states that Undo is one action.
- The ordinary amount input receives the row's original minor units and uses the existing shadcn
  tooltip primitives. Its accessible name includes the account currency, its accessible
  description contains the original formatted amount, and unedited/manual rows render no tooltip
  wrapper or description. `Intl.NumberFormat` is constrained to the currency metadata's exact
  precision; the table covers USD negative/zero, JPY 0-decimal, KWD 3-decimal and BTC 8-decimal
  values.
- `SyncManager` now base64-encodes encrypted bytes and version vectors in bounded `0x8000` chunks,
  preserving exact bytes while eliminating argument-count overflow. The 1,000-row test proves
  immediate IndexedDB caching, server push, ciphertext privacy, decryption, and exact recovery of
  all 1,000 IDs/import links.
- The seven root-authorized expansion paths contain only mechanical
  `originalAmount: undefined` compatibility for loro-mirror's optional-input convention and
  directly owner-aligned retention assertions. No parser, server, crypto, dependency, migration or
  configuration owner was expanded.

## Automated validation

- Final focused profile, in three separate clean processes:
  `pnpm exec vitest run tests/unit/crdt/hierarchical-schema.test.ts
  tests/unit/crdt/transaction-mutations.test.ts
  tests/unit/crdt/transaction-queries.test.ts
  tests/integration/transaction-operations.test.ts tests/unit/sync/manager.test.ts
  --pool=forks --maxWorkers=1`
  passed **5 files / 118 tests** each time (4.29s, 4.29s, 4.30s).
- Expanded owner-aligned profile:
  `pnpm exec vitest run tests/integration/description-alias-actions.test.ts
  tests/integration/description-alias-crdt.test.ts
  tests/integration/description-alias-lookup-lifecycle.test.tsx
  tests/integration/transaction-operations.test.ts
  tests/integration/vault-maintenance.test.tsx
  tests/unit/crdt/description-alias-mutations.test.ts
  tests/unit/crdt/hierarchical-schema.test.ts tests/unit/crdt/maintenance.test.ts
  tests/unit/crdt/transaction-mutations.test.ts
  tests/unit/crdt/transaction-ordering.test.ts
  tests/unit/crdt/transaction-queries.test.ts tests/unit/sync/manager.test.ts
  --pool=forks --maxWorkers=1`
  passed **12 files / 195 tests**.
- `pnpm test` passed **60 files / 1,296 tests**.
- `pnpm typecheck` passed.
- `pnpm build` passed compilation, TypeScript, all 17 static pages, and route generation.
- `git diff --name-only -- '*.ts' '*.tsx' | xargs pnpm exec oxfmt --check` passed all
  24 changed TypeScript/TSX paths.
- `git diff --name-only -- '*.ts' '*.tsx' | xargs pnpm exec eslint` exited zero with no errors.
  It reported nine unchanged, inherited unused-import warnings already present in the BASE versions
  of the listed query/test files.
- `git diff --check` passed before staging, for the exact staged diff, and after commit.
- After the manual 200%-zoom findings, both isolated accessibility follow-up states passed
  `pnpm exec oxfmt --check
  src/components/features/transactions/cells/InlineEditableAmount.tsx`,
  `pnpm exec eslint src/components/features/transactions/cells/InlineEditableAmount.tsx`,
  `pnpm typecheck`, and
  `pnpm exec vitest run tests/integration/transaction-operations.test.ts`
  (**1 file / 16 tests**).
- The checked-in behavior journey:
  `pnpm exec playwright test tests/e2e/import.spec.ts --project=chromium --workers=1
  --retries=0 --grep "CSV and OFX lineage"` passed its third clean run as **1/1 in 18.2s**.
  Its first two clean retries-disabled runs against the root-owned keyed server also passed
  **1/1 in 7.5s** and **1/1 in 7.4s**. The temporary external reuse-server config used only for
  those first two automated runs was deleted and never entered the worktree.
- The same exact journey was rerun after the accessibility follow-up against a keyed server with
  retries disabled and passed **1/1 in 7.4s**. Its temporary external config was deleted and never
  entered the worktree.
- After the final zoom-alignment correction it passed once more, retries disabled, as **1/1 in
  7.5s**. That temporary external config was also deleted and never entered the worktree.
- The journey imports CSV and OFX, edits an imported amount twice, checks accessible hover/focus
  provenance after reload, records exact transaction IDs, deletes only one import, and proves exact
  one-step Undo/Redo while the OFX and manual IDs remain.
- Full no-retry E2E:
  `pnpm exec playwright test --project=chromium --workers=1 --retries=0 --reporter=list`
  passed **93/93 in 6.4 minutes**, including retained import, virtualization, offline, duplicate-tab,
  sync, history, description-alias and transaction editing journeys.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli` with disposable session `p14` against
  the root-owned keyed server. The session was closed; the server was stopped; post-charter
  `.next`, report/test output, CLI artifacts and `next-env.d.ts` drift were recoverably cleaned by
  root.
- Created a KWD account and imported `cli-kwd-lineage.csv` with duplicate-looking rows and
  negative `-1.234`, positive `2.500`, and zero `0.000` values. Keyboard ArrowRight traversed all
  five named import tabs to Account; the import control remained reachable at 320px.
- Edited zero to `0.001`, negative to `-2.345`, and positive through `3.000`, `4.000`, then an
  offline `5.000`. Focus exposed tooltip and accessible description
  `Original imported amount: KWD 2.500`; reload and reconnect retained `5.000` without overwriting
  the origin. Dark plus reduced-motion emulation kept the focus tooltip visible.
- A duplicate tab correctly required its own unlock context rather than leaking the in-memory key.
  Offline mutation remained locally usable, reconnect reached Saved, and reload recovered it. A
  hard reload while the development server was unreachable produced the expected
  `ERR_INTERNET_DISCONNECTED` app-shell limitation; it did not lose the cached mutation.
- Imported a separate USD file into Default and observed accessible amount name
  `Transaction amount in USD` and exact `1.23`, independently of the KWD rows.
- Imported a real generated 1,000-row CSV through the normal file-input event. Import navigation
  completed in 2.71s, showed `1,004 transactions`, rendered only 14 virtual rows, reached Saved,
  reloaded, and recovered exact last row `CLI large 0999` with `1000.000`. The captured push request
  exposed only `encryptedData` and `versionVector`; source filenames/descriptions were absent.
- Added `CLI manual survivor`, then deleted the four-row KWD import. The dialog explicitly named
  linked rows, other imports/manual preservation, and one-action Undo. Reliable filtered probes
  observed deletion `{small: 0, large: 1, manual: 1}`, Undo restored the import record plus two
  exact duplicate-description rows while large/manual stayed `{2,1,1}`, and Redo returned
  `{0,1,1}`.
- Final online CLI console capture reported **0 errors / 0 warnings** and the request scan contained
  no failed request or raw imported values. The expected offline fetch errors were confined to the
  deliberate offline interval.
- A fresh disposable follow-up session `p14a` exercised exact 390x844 viewport and PROCESS 200%
  CSS zoom. After editing an imported USD `1.25` row through `2` and `3`, keyboard focus and
  deterministic pointer hover exposed accessible name `Transaction amount in USD`, description
  `Original imported amount: USD 1.25`, and the wrapped tooltip. It also found that the initial
  tooltip x=221..561 extended past both the 390px viewport and 524px scroll document; this was
  treated as a real clipping defect and drove a conservative Radix alignment correction.
- An offset without explicit start alignment left the tooltip at x=220.95..561.05 and was rejected.
  Explicit start alignment with offset -60 improved it to x=46..404 but still exceeded the
  viewport by 14px, so that intermediate was also rejected rather than credited as visible.
- Final disposable session `p14b` recaptured the same exact viewport/zoom and pointer-hover matrix.
  The input occupied x=83..307. The tooltip box occupied x=26..384, y=680..768, its arrow occupied
  x=359.86..388.14, y=749.86..778.14, and its two direct rendered text spans occupied
  x=50..253.53, y=691..756. Programmatic containment checks proved the complete box, arrow, and
  every rendered text span were inside the 390x844 viewport and the text spans were inside the
  tooltip box.
- Computed WCAG contrast was **4.94:1** for the positive amount on white and **20.17:1** for the
  tooltip foreground/background, both above the applicable 4.5:1 threshold. This capture found and
  drove the isolated `text-green-700`/wrapped-tooltip follow-up. Both follow-up sessions reported
  **0 console errors / 0 warnings** and were closed.

## Questions and risks

- No Q proposal is required. Existing conventions plus the PROCESS data-preservation hierarchy
  selected physical linked-row removal inside one reversible Loro history action, import-record
  soft deletion, and preservation/rehoming of unrelated nested rows.
- Residual implementation risk is concentrated in very large multi-peer updates beyond the tested
  1,000-row payload. Bounded chunking removes the reproduced argument overflow and exact decryption
  proves byte preservation; snapshot owners outside the reproduced path were not broadened.
- Development-mode offline hard reload cannot refetch the application shell. Offline editing,
  durable local queueing, reconnect push and online reload recovery are covered and passed.

## Boundary and cleanup

- Original package BASE and clean pre-implementation HEAD:
  `b9105028926d24a5a0c5454777a6c33379ca606a`.
- Root inserted an authorized control-only commit during implementation, so the product/test commit
  parent was `4514403df9370063457221c1b3b3e5611831bdbd`. The required cumulative review range remains the
  original BASE through product/test HEAD.
- Initial product/test commit:
  `1d9d394a262575f098144a85dc945d72f7bb2be5`
  (`Implement import lineage and reversible deletion`), **24 authorized paths**, 787 insertions and
  37 deletions.
- Accessibility follow-up commit:
  `8d1e67bb3060f84765a79a781f6f31079df497d9`
  (`Improve amount tooltip accessibility`), one already-authorized product path, 5 insertions and
  2 deletions.
- Zoom-alignment follow-up commit:
  `8643fff75f8d70a6485f9c23fcca33a231d9d9cf`
  (`Keep amount tooltip within zoomed viewport`), the same already-authorized product path, 2
  insertions. Cumulative product/test HEAD is this commit: **24 authorized paths**, 793 insertions
  and 38 deletions from the product/test parent. Evidence was deliberately excluded from all three
  commits.
- After commit the index was empty and the only dirty path was this assigned evidence directory.
  No review artifact was created.
- Frozen boundary after automation:
  - scratch `b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`,
    350 lines / 24,248 bytes;
  - FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`,
    715 lines / 25,441 bytes;
  - SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
    450 lines / 27,382 bytes.
- Scratch checked set remains
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018; HS-008 was not edited or
  checked. SCOPE and both frozen sources were not edited.
