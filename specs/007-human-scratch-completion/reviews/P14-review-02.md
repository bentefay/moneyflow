# P14 Independent Review — Revision 02

## Review identity and verdict

- Package / requirement / revision: `P14` / `HS-008` / `02`.
- Literal cumulative reviewed range:
  `b9105028926d24a5a0c5454777a6c33379ca606a..93d89145fe910a1348ccd4a4f0c79f2022801465`.
- Revision-02 delta:
  `7db79a68db5e08f9ad4f8dfd0b01fb16b31b98a2..93d89145fe910a1348ccd4a4f0c79f2022801465`.
- Frozen implementation evidence: `evidence/P14/implementation-02.md`, SHA-256
  `e7d8dcf685f920f1ab182a2719fb3573fc3daceb199c01852505eaefad5eeb52`, 156 lines / 11,793 bytes.
- Immutable revision-01 review: `reviews/P14-review-01.md`, SHA-256
  `92bbcf462e6cceb973adb9525402cc357ed37706d67752169506ae286e1b621f`, 171 lines / 13,684 bytes.
- The revision-02 delta is exactly two authorized paths, 58 insertions and 11 deletions. The
  cumulative range is 28 paths, 1,437 insertions and 176 deletions, including the prior authorized
  P14 implementation/tests and root-owned control commits. `git diff --check` passes.
- **Verdict: FAIL.** Revision 02 fixes the revision-01 stale count for ordinary top-level imported
  rows, and the cumulative lineage, immutable origin, presentation, encrypted persistence and atomic
  history behavior remain sound. However, the new live-count projection omits distinct imported
  transactions nested as suspected duplicates. The destructive dialog can therefore say zero while
  confirmation deletes one linked transaction. HS-008 must remain unchecked.

## Finding

### F-02 — Medium / blocking Requirements/UX: live count omits nested imported transactions

The revision-02 Imports page counts `useActiveTransactions()` by `importId`
(`src/app/(app)/imports/page.tsx:29-42`) and passes that count to both the table and destructive
dialog (`src/app/(app)/imports/page.tsx:47-59`,
`src/components/features/import/ImportsTable.tsx:81-87`). That hook calls
`getAllTransactions(...).filter(...)` (`src/lib/crdt/context.tsx:848-855`).
`getAccountTransactions()` only pushes top-level `dayBucket.transactions` into its result
(`src/lib/crdt/queries.ts:240-283`); it does not materialize the distinct transaction identities
inside a parent's `suspectedDuplicates`.

Normal import behavior does create that state. A row detected as a duplicate is inserted with a
`suspectedDuplicateOf` location (`src/app/(app)/imports/new/page.tsx:177-208`) and is stored beneath
the existing parent. The atomic delete correctly has broader semantics: when the parent belongs to
another import, it removes matching linked rows from `suspectedDuplicates`
(`src/lib/crdt/mutations.ts:826-853`). The displayed cardinality and actual destructive set are
therefore different.

The mismatch was reproduced in the exact reviewed build using only the installed CLI and ordinary
UI:

1. Import `p14r2-parent.csv` containing one USD `12.34` transaction.
2. Import an identical row from `p14r2-nested.csv` using normal auto-detection, account selection
   and import confirmation.
3. Transactions contains one top-level parent row and its `Potential duplicate` control, proving the
   second imported identity is nested beneath it.
4. Imports reports one transaction for the parent import but zero for `p14r2-nested.csv`.
5. The nested import's alert dialog says: “This will also delete 0 transactions linked to this
   import.”
6. Confirming removes the nested import record and the `Potential duplicate` entry while preserving
   the parent row. One Undo restores both the nested record and duplicate entry; one Redo removes
   both again. The table/dialog count remains zero.

The operation thus deletes one linked imported transaction after advertising zero. This is precise
destructive feedback required by the package and is blocking even though the underlying atomic
mutation removes the correct physical target.

Required closure: derive the displayed live count from canonical identity enumeration that includes
every distinct active top-level transaction and every distinct active nested `suspectedDuplicates`
transaction, deduplicated by logical ID across physical relocation/conflict copies. Use the same
identity-set semantics as the atomic delete. Add behavior-led E2E coverage that creates a duplicate
through the ordinary import UI, proves table and dialog count one, confirms deletion removes exactly
the nested linked identity and record while preserving the parent and unrelated imports, then proves
one Undo and one Redo restore/remove that exact set.

The checked-in revision-02 E2E covers ordinary top-level rows only and cannot detect F-02. Evidence
lines 25-29 materially overstate the projection as counting each current canonical transaction once:
the selected canonical projection does not enumerate nested logical identities. The evidence's
repository-format correction is otherwise accurate, and its assigned artifact was not modified.

## Other acceptance, safety and compatibility observations

- Revision-01 F-01 is fixed for top-level imported transactions. An ordinary four-row import,
  ordinary deletion of one row, table/dialog count three, exact confirm set, preserved unrelated
  rows, one-action Undo and Redo all passed independently in automation and the installed app.
- `originalAmount` remains optional at parent and nested schema boundaries. The central amount
  mutation captures only the first real edit of an imported transaction and prevents caller
  replacement of lineage, origin and creation identity.
- Insert, duplicate, move, unnest, swap, query and maintenance paths retain optional origin
  compatibility. Alias deletion and import-record deletion remain in the same history action as
  transaction removal.
- Positive, negative and zero imported values retain exact first origins across repeated edits,
  reload, offline work and duplicate-tab convergence. Unedited imported rows expose no origin
  description.
- The amount editor retains its currency-specific accessible name and presents the origin through
  `aria-description` and delayed hover/focus tooltip. The existing formatter and tests cover 0-, 2-,
  3- and 8-decimal currencies.
- The delete mutation scans parent and nested physical representations, deterministically rehomes
  unrelated nested rows, cleans aliases and prunes buckets. F-02 concerns the count projection, not
  atomicity of that mutation.
- Large encrypted updates retain bounded `0x8000` base64 conversion. No plaintext financial payload,
  recovery phrase, secret, compatibility dual-write, arbitrary retry mask or unrelated product
  change was found in the exact range.

## Independent automation

| Gate                                                                        | Independent result                                                                                    |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Focused Vitest profile for P14 transaction/import/sync behavior             | PASS in three clean processes; 5 files / 118 tests each, in 4.30 s, 4.28 s and 4.30 s.                |
| Broader owner profile                                                       | PASS; 12 files / 195 tests in 16.30 s.                                                                |
| `pnpm test`                                                                 | PASS; 60 files / 1,296 tests in 6.28 s.                                                               |
| `pnpm typecheck`                                                            | PASS.                                                                                                 |
| `pnpm lint`                                                                 | PASS exit 0; 0 errors / 10 warnings (one TanStack warning and nine inherited unused-symbol warnings). |
| `pnpm build`                                                                | PASS; Next 16.2.10 compiled, generated types and built all 17 routes.                                 |
| Cumulative changed-path `oxfmt --check`                                     | PASS; all 24 changed TypeScript/TSX paths.                                                            |
| Cumulative changed-path ESLint                                              | PASS; 0 errors / 9 inherited warnings.                                                                |
| Revision-02 two product/test paths plus frozen evidence formatting          | PASS.                                                                                                 |
| `git diff --check BASE..HEAD`                                               | PASS.                                                                                                 |
| Exact changed import E2E, Chromium, no retry, `--repeat-each=3 --workers=1` | PASS; 3/3 in 33.0 s.                                                                                  |
| Six-file affected E2E matrix, Chromium, no retry, `--workers=1`             | PASS; 60/60 in 4.6 minutes.                                                                           |
| Full Chromium E2E, no retry, `--workers=1`                                  | PASS; 93/93 in 6.1 minutes.                                                                           |

Expected offline/authentication logs appeared only in the corresponding explicit E2E cases.
Repository `pnpm format:check` exits 1 on the same 14 inherited Markdown paths recorded in the
evidence: six root ledgers, four P12 implementation artifacts, immutable P14 implementation-01, two
P12 reviews and frozen `specs/human-scratch.md`. Implementation-02 is not in that list and passes
its exact-path check. No P14 product/test path fails formatting.

The green automation is reported exactly but does not exercise ordinary import creation of a nested
duplicate followed by deletion of that nested import record. Static review and the installed-app
reproduction establish F-02 independently of those passing controls.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli` with disposable session `p14-review-02`
  against the correctly keyed isolated server. No Playwright MCP, `npx`, headed, debug/pause mode,
  temporary test or temporary config was used.
- Created a fresh authenticated state while all twelve recovery words remained masked. The phrase
  was never revealed, read, copied, entered or printed.
- Reproduced F-02 using two ordinary one-row imports. The nested import showed table/dialog count
  zero, but confirm removed its distinct nested transaction and record. Undo restored both and Redo
  removed both while the other import's parent survived.
- Separately imported four top-level rows and created one manual survivor. Repeated edits preserved
  exact origins: positive USD `2.50`, negative `-USD 1.25` and zero `USD 0.00`; the untouched row
  had no `aria-description`. Reload retained the edited values and origins.
- At 390 × 844, dark preference, reduced motion and 200% document zoom, the positive tooltip reached
  opacity 1 at x=26..384 / y=680..768. Its two direct text lines were x=50..253.53 / y=691..756 and
  its arrow x=364..384 / y=768..788. Tooltip, text and arrow were contained by the viewport.
  Computed tooltip text contrast was 20.157:1 and the positive input 4.945:1.
- Ordinary deletion of one row changed the target import's table/dialog count from four to three.
  Confirm removed exactly the three remaining target IDs and record while preserving the parent
  import and manual survivor. Undo restored exactly those three and record, leaving the
  independently deleted row absent; Redo removed the restored set again.
- Imported an in-browser 1,000-row CSV through the ordinary UI. It reported 1,000 valid rows and the
  app reached 1,002 total transactions while only 14 transaction rows were mounted. Saved completed;
  reload retained 1,002, and searching the final description returned exactly one row with
  `1000.00`.
- Boolean-only inspection of the 257,726-byte successful `sync.pushOps` body confirmed
  `encryptedData` and `versionVector` were present while the first and last plaintext descriptions
  and filename were absent.
- A normally opened authenticated duplicate tab loaded all 1,002 transactions. Offline editing of
  the first large-import amount from `1.00` to `2.00` immediately showed `Saving` and preserved
  `Original imported amount: USD 1.00`. Reconnection reached Saved; the duplicate tab converged
  without reload to `2.00` with the same origin.
- During a final event-listener reload probe, the installed CLI session unexpectedly closed before
  returning the clean-reload console/page-error/non-local-request result. This probe is not
  credited. It did not alter the product finding or the already completed persistence/privacy
  samples. Browser listing immediately reported no sessions. Root then verified no CLI or server
  process and recoverably cleaned only review-generated artifacts.

## Boundary, frozen sources and questions

- Frozen human scratch remains SHA-256
  `b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`, 350 lines / 24,248 bytes, with
  HS-008 unchecked.
- Canonical FS-001 source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes. Its normalized 21 exact rolling checksum remains unchanged.
- Before this artifact, HEAD was exactly `93d89145fe910a1348ccd4a4f0c79f2022801465`, the index was
  empty, and worktree dirt was exactly root-owned modified `HANDOFF.md` / `PROGRESS.md` plus frozen
  untracked implementation-02 evidence. Root restored `next-env.d.ts`, stopped the isolated server
  and moved only review-generated `.next`, `test-results` and CLI artifacts to recoverable trash
  while preserving older artifacts.
- This review is the sole reviewer-created repository artifact. No product, test, source marker,
  ledger, evidence, configuration or prior-review file was edited or committed.
- No `Q-*` proposal is needed. The requirement that the displayed consequence match the exact linked
  transaction set is settled; F-02 is an implementation defect, not a product ambiguity.

## Single final verdict

**FAIL.** P14 revision 02 correctly repairs stale counts for ordinary top-level rows and preserves
the cumulative lineage, origin, presentation, encrypted persistence and atomic history behavior, but
its live projection excludes distinct nested imported transactions. The destructive dialog can
advertise zero and then delete one. Root must preserve this immutable review, keep HS-008 unchecked
and route F-02 into the next revision with nested-import behavior coverage.
