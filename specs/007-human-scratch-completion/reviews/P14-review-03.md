# P14 Independent Review — Revision 03

## Review identity and verdict

- Package / requirement / revision: `P14` / `HS-008` / `03`.
- Literal cumulative reviewed range:
  `b9105028926d24a5a0c5454777a6c33379ca606a..cf6456eeb5bd4029ae57eeb83da7e53194396a4d`.
- Revision-03 delta:
  `3f9597873ea965638a8f53e08ced339cdc3ce8ca..cf6456eeb5bd4029ae57eeb83da7e53194396a4d`.
- Frozen implementation evidence: `evidence/P14/implementation-03.md`, SHA-256
  `c07a417ba39a58801e7d411adcd4c87c47614e526d6c35aa1e456a306e85eb8d`, 159 lines / 11,901 bytes.
- Immutable prior reviews:
    - `reviews/P14-review-01.md`, SHA-256
      `92bbcf462e6cceb973adb9525402cc357ed37706d67752169506ae286e1b621f`, 171 lines / 13,684 bytes.
    - `reviews/P14-review-02.md`, SHA-256
      `e6c4d2fdbd4ce5b2c5d6db75f6451a19d0a1901bb769640a1933e9fa9fdab7c4`, 191 lines / 14,936 bytes.
- The revision-03 delta is exactly five authorized paths, 275 insertions and 5 deletions. The
  cumulative range is 31 paths, 2,099 insertions and 177 deletions, including the prior authorized
  P14 implementation/tests and root-owned control commits. `git diff --check` passes.
- **Verdict: FAIL.** Revision 03 closes the revision-02 nested-identity count defect, and the
  cumulative lineage, immutable origin, encrypted persistence, exact atomic deletion and history
  behavior remain sound. However, the required original-amount tooltip can render partly or wholly
  outside the viewport for visible lower/offset virtualized rows at 200% zoom. HS-008 must remain
  unchecked.

## Finding

### F-03 — Medium / blocking Accessibility/UX: origin tooltip is clipped at 200% zoom

The amount editor correctly gives an edited imported amount the currency-specific accessible name
and `aria-description`, then wraps it in a tooltip
(`src/components/features/transactions/cells/InlineEditableAmount.tsx:161-205`). The tooltip uses
fixed `align="start"` with `alignOffset={-70}` and a width class based on the viewport
(`InlineEditableAmount.tsx:197-201`). In the installed exact build, collision behavior does not keep
that visual description within the zoomed viewport for ordinary visible rows at different
virtualized offsets.

This was reproduced deterministically using the explicit HS-008 zoom/reflow charter at a 390 × 844
viewport, dark preference, reduced motion and 200% document zoom:

1. On an edited imported row lower in the virtualized list, the focused input was visible at
   x=83..307 / y=594..650. Its open tooltip had `data-state="instant-open"` but was positioned at
   x=26..approximately 368 / y=1098..1182, wholly below the 844-pixel viewport. Moving the document
   and inner transaction scrollers to their maxima did not make the tooltip visible. The same row's
   hover sample was likewise below the viewport at approximately y=1082.
2. In that same state, focusing the edited first row produced a contained tooltip at x=26..384 /
   y=168..256. This control proves the trigger and tooltip mounted and isolates the problem to row
   position rather than missing content.
3. After a fresh reload with the 1,000-row dataset, the visible edited row `P14 R3 large 0004` had
   input bounds x=116..340 / y=394..450. Its open tooltip was x=92..432 / y=700.4..784: the
   rightmost 42 pixels were outside the 390-pixel viewport. The input still exposed the exact
   programmatic description `Original imported amount: USD 5.00`.

Thus keyboard focus and pointer hover do not reliably expose the visual original-amount cue under
the package's required zoom/reflow condition. A favorable first-row sample cannot establish the
behavior for a virtualized grid whose trigger position changes with row and scroll offset. The
programmatic `aria-description` is correct but does not cure the clipped hover/focus tooltip that
HS-008 explicitly requires.

Required closure: make tooltip placement collision-aware for the actual zoomed viewport and nested
scroll context so the complete origin text remains visible for edited rows throughout the
virtualized list. Add deterministic coverage that focuses and hovers edited imported rows at both
lower vertical and right-offset positions under the specified narrow 200% zoom state and asserts the
tooltip's full bounding box is contained in the viewport. Re-run the installed-app manual reflow
charter across more than one row position.

The checked-in revision-03 work was scoped to F-02 and does not add tooltip-containment coverage.
Its evidence appropriately did not claim a new zoom sample, but reliance on the prior review's one
favorable row was insufficient to detect positional variance. The assigned frozen evidence was not
modified.

## Closed prior findings and other acceptance observations

- **F-02 is closed.** `getActivePublicTransactionIdentities()` traverses every
  account/year/month/day bucket, excludes non-public maintenance shadow parents, enumerates active
  public parents and active materialized `suspectedDuplicates`, filters active physical
  representations before canonical logical-ID deduplication, and returns one active representation
  per logical identity (`src/lib/crdt/queries.ts:303-334`).
- The broader identity projection is intentionally separate from the existing parent-only
  transaction-grid contract (`src/lib/crdt/context.tsx:848-865`). The Imports page counts that
  projection by `importId` and supplies the resulting live count to the table/dialog
  (`src/app/(app)/imports/page.tsx:33-68`).
- Query tests cover parent and nested identities across physical account copies, deleted logical
  identities, and an active representation accompanied by a deleted copy. The ordinary-import E2E
  creates a nested duplicate, proves count one, then proves exact confirm, Undo and Redo isolation
  from its parent, an unrelated import and a manual transaction.
- Installed-app reproduction agreed: identical ordinary one-row imports created one parent and one
  `Potential duplicate`; parent, nested and unrelated import records each reported one. The nested
  dialog reported one; confirm removed only its nested identity and record, one Undo restored both,
  and one Redo removed both while all designated survivors remained.
- **F-01 remains closed.** An ordinary four-row import, independent ordinary deletion of one row,
  table/dialog count three, exact confirm set, preserved unrelated rows, and one-action Undo and
  Redo all passed again in automation and the installed app.
- `originalAmount` remains optional at parent and nested schema boundaries. The central amount
  mutation captures only the first real edit of an imported transaction and prevents caller
  replacement of lineage, origin and creation identity.
- Positive, negative and zero imported values retained exact first origins across repeated edits and
  reload: USD `2.50`, `-USD 1.25` and `USD 0.00`. An untouched imported value exposed no origin
  description. The first imported parent and a large-import row also retained exact origins after
  edits.
- Insert, duplicate, move, unnest, swap, query and maintenance paths retain optional-origin
  compatibility. Alias deletion and import-record deletion remain in the same history action as
  transaction removal.
- The delete mutation scans parent and nested physical representations, deterministically rehomes
  unrelated nested rows, cleans aliases and prunes buckets. Count projection and mutation semantics
  now agree for the ordinary nested-import case.
- Large encrypted updates retain bounded `0x8000` base64 conversion. No plaintext financial payload,
  recovery phrase, secret, compatibility dual-write, arbitrary retry mask or unrelated product
  change was found in the exact range.

## Independent automation

| Gate                                                                        | Independent result                                                                                    |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Focused Vitest profile for P14 transaction/import/sync behavior             | PASS in three clean processes; 5 files / 120 tests each, in 4.30 s, 4.31 s and 4.28 s.                |
| Broader owner profile                                                       | PASS; 12 files / 197 tests in 16.23 s.                                                                |
| `pnpm test`                                                                 | PASS; 60 files / 1,298 tests in 6.17 s.                                                               |
| `pnpm typecheck`                                                            | PASS.                                                                                                 |
| `pnpm lint`                                                                 | PASS exit 0; 0 errors / 10 warnings (one TanStack warning and nine inherited unused-symbol warnings). |
| `pnpm build`                                                                | PASS; Next 16.2.10 compiled, generated types and built all 17 routes.                                 |
| Cumulative changed-path `oxfmt --check`                                     | PASS; all 25 changed TypeScript/TSX paths.                                                            |
| Cumulative changed-path ESLint                                              | PASS; 0 errors / 9 inherited warnings.                                                                |
| Revision-03 five product/test paths plus frozen evidence formatting         | PASS.                                                                                                 |
| `git diff --check BASE..HEAD`                                               | PASS.                                                                                                 |
| Exact changed import E2E, Chromium, no retry, `--repeat-each=3 --workers=1` | PASS; 3/3 in 34.2 s.                                                                                  |
| Retained revision-01 import E2E, Chromium, no retry                         | PASS; 1/1 in 19.0 s.                                                                                  |
| Six-file affected E2E matrix, Chromium, no retry, `--workers=1`             | PASS; 61/61 in 4.7 minutes.                                                                           |
| Full Chromium E2E, no retry, `--workers=1`                                  | PASS; 94/94 in 6.2 minutes.                                                                           |

Expected offline/authentication logs appeared only in the corresponding explicit E2E cases.
Repository `pnpm format:check` exits 1 on exactly the same 14 inherited Markdown paths recorded in
the evidence: six root ledgers, four P12 implementation artifacts, immutable P14 implementation-01,
two P12 reviews and frozen `specs/human-scratch.md`. Implementation-03 is not in that list and
passes its exact-path check. No P14 product/test path fails formatting.

The green automation is reported exactly but does not exercise tooltip containment at 200% zoom
across varied virtualized row positions. Direct geometric observation in the installed exact build
establishes F-03 independently of those passing controls.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli` with disposable session `p14-review-03`
  against the correctly keyed isolated server. No Playwright MCP, `npx`, headed, debug/pause mode,
  temporary test or temporary config was used.
- Created a fresh authenticated state while all twelve recovery words remained masked. The phrase
  was never revealed, read, copied, entered or printed.
- Reproduced the nested-import behavior through ordinary CSV imports. Both parent and nested import
  records reported one; the nested dialog reported one; confirm, Undo and Redo affected exactly the
  nested identity and record while preserving the parent, unrelated import and manual transaction.
- Separately imported four top-level rows. Repeated edits and reload preserved exact positive,
  negative and zero origins; an untouched imported row had no `aria-description`. Ordinary deletion
  of one row changed that import's count from four to three. Confirm removed exactly the three
  remaining target identities and record while preserving prior survivors; Undo restored exactly
  that set while the independently deleted row stayed absent; Redo removed the restored set again.
- The 200% zoom/reflow probes found F-03 on two visible lower/offset rows while the first-row
  control was contained. In a favorable contained sample, computed tooltip text contrast was
  20.157:1 and the positive amount input was approximately 4.52:1; contrast was not the failure.
- Imported an in-browser 1,000-row CSV through the ordinary UI. The app reached 1,003 active
  top-level transactions while only 14 transaction rows were mounted. Saved completed; reload
  retained 1,003, and searching the final description returned exactly one row with `1000.00`.
- Boolean-only inspection of the 257,746-byte successful `sync.pushOps` body confirmed
  `encryptedData` and `versionVector` were present while the first and last plaintext descriptions
  and filename were absent.
- A normally opened authenticated duplicate tab loaded all 1,003 transactions. Offline editing of
  the first large-import amount from `1.00` to `2.00` preserved
  `Original imported amount: USD 1.00`. The status showed the expected offline `Sync error`;
  reconnection reached Saved, and the duplicate tab converged without reload to `2.00` with the same
  origin.
- A final fresh online reload with event listeners retained 1,003 transactions and produced no
  console errors, page errors, failed requests or non-local requests.
- The isolated browser session was closed and its data deleted; browser listing reported no
  sessions. Root stopped the isolated server, restored `next-env.d.ts`, and moved only
  review-generated `.next`, `test-results` and the exact ten new CLI artifacts to recoverable trash.
  Older CLI artifacts were preserved.

## Boundary, frozen sources and questions

- Frozen human scratch remains SHA-256
  `b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`, 350 lines / 24,248 bytes, with
  HS-008 unchecked.
- Canonical FS-001 source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes. Its normalized 21 exact rolling checksum remains unchanged.
- Before this artifact, HEAD was exactly `cf6456eeb5bd4029ae57eeb83da7e53194396a4d`, the index was
  empty, and worktree dirt was exactly root-owned modified `HANDOFF.md` / `PROGRESS.md` plus frozen
  untracked implementation-03 evidence. Root confirmed the server and port clear, restored
  `next-env.d.ts`, and recoverably cleaned only review-generated artifacts.
- This review is the sole reviewer-created repository artifact. No product, test, source marker,
  ledger, evidence, configuration or prior-review file was edited or committed.
- No `Q-*` proposal is needed. Complete visual access to the origin cue under the explicit
  zoom/reflow requirement is settled; F-03 is an implementation defect, not a product ambiguity.

## Single final verdict

**FAIL.** P14 revision 03 correctly closes the nested imported-identity count defect and preserves
the cumulative lineage, immutable origin, encrypted persistence, exact deletion and one-action
history behavior. The origin tooltip nevertheless renders partly or wholly outside the viewport for
ordinary visible virtualized rows at 200% zoom. Root must preserve this immutable review, keep
HS-008 unchecked and route F-03 into the next revision with positional zoom/reflow coverage.
