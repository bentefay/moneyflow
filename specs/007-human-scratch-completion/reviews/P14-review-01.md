# P14 Independent Review — Revision 01

## Review identity and verdict

- Package / requirement / revision: `P14` / `HS-008` / `01`.
- Literal reviewed range:
  `b9105028926d24a5a0c5454777a6c33379ca606a..8643fff75f8d70a6485f9c23fcca33a231d9d9cf`.
- Frozen implementation evidence: `evidence/P14/implementation-01.md`, SHA-256
  `7e4c4f8244484ee8885ecc4c547069a10d7891689a917e3332a652574754c522`, 220 lines / 14,875 bytes.
- The cumulative range contains 26 paths, 943 insertions and 174 deletions. Two paths are root-owned
  `HANDOFF.md` / `PROGRESS.md`; the other 24 are the authorized product/test paths. Seven expanded
  fixture paths contain only the required optional `originalAmount` compatibility or aligned
  assertions. `git diff --check BASE..HEAD` passes.
- **Verdict: FAIL.** Import lineage, immutable first-original-amount capture, accessible
  currency-precision presentation, encrypted 1,000-row persistence and the atomic live-set delete
  operation are sound. However, the destructive confirmation reports the import's immutable original
  batch size as the number of transactions it will now delete. After an ordinary deletion, the
  dialog deterministically overstates the live linked set. HS-008 must remain unchecked.

## Finding

### F-01 — Medium / blocking Requirements/UX: destructive dialog reports a stale linked count

The import list projects the stored `Import.transactionCount`
(`src/app/(app)/imports/page.tsx:35-47`). `ImportsTable` passes that value directly into the
confirmation dialog (`src/components/features/import/ImportsTable.tsx:81-87`), whose text
unconditionally says that this many transactions are linked and will be deleted
(`src/components/features/import/DeleteImportDialog.tsx:50-55`). The stored value is the original
batch size set at import creation; ordinary transaction deletion does not reduce it. By contrast,
the delete action correctly scans and removes the current physical transactions whose `importId`
matches (`src/lib/crdt/mutations.ts:813-877`).

This produces a deterministic mismatch in the exact reviewed build:

1. Import `p14-review-kwd.csv` with four ordinary transactions.
2. Delete one of those transactions through the ordinary row's two-confirm deletion control.
3. Search Transactions for the batch descriptions. Exactly three remain: `CLI KWD negative`,
   `CLI KWD duplicate look` and `CLI KWD zero`.
4. Open Imports. The row retains its original count of four.
5. Open its destructive confirmation. It says: “This will also delete 4 transactions linked to this
   import,” although the exact current linked set is three.
6. Confirming the action removes the correct three live transactions, not four.

This is material destructive feedback, not merely a historical table-label ambiguity. The operator
is told an exact consequence that the application knows is false. The current E2E covers the
unmodified-batch count only, so it cannot detect the stale-count journey.

Required closure: derive the destructive count from the current logical/physical linked set at
dialog-open/render time, using the same identity semantics as the atomic delete operation. The
Imports table may retain a clearly defined historical batch-size field if product semantics require
it, but that value must not be presented as the live destructive consequence. Add behavior-led E2E
coverage for import four → ordinary-delete one → dialog says three → confirm removes exactly those
three and the import record → unrelated imports/manual rows survive → one Undo restores exactly the
three and record → one Redo removes them again. The independently deleted row must stay deleted
through that Undo/Redo pair.

## Other acceptance, safety and compatibility observations

- `originalAmount` is optional at both parent and nested transaction schema boundaries. The generic
  amount mutation captures it only on a real amount change, only for an imported transaction and
  only when no origin has already been captured. Caller-supplied update data cannot replace
  `importId`, `originalAmount`, creation identity or import row identity.
- Insert, duplicate, move, unnest, swap, query and maintenance paths preserve the optional field.
  Manual insertion through an alias explicitly has no import lineage or original amount.
- Negative, positive and zero originals retain their first imported value across repeated edits,
  reload, an offline edit and duplicate-tab convergence. Unedited imported amounts expose no
  original-value description.
- The amount editor keeps its currency-specific accessible name and exposes the origin through
  `aria-description` plus a hover/focus tooltip. Formatting uses currency metadata rather than a
  hard-coded two-decimal assumption; focused tests cover 0-, 2-, 3- and 8-decimal currencies.
- The atomic delete scans parent and nested transactions, preserves unrelated nested rows by
  deterministic rehoming, removes linked nested entries, prunes empty buckets, cleans alias
  references and soft-deletes the import record within one history action. The installed-CLI journey
  confirmed that it operates on the current three-row linked set despite F-01's stale message.
- Large encrypted updates are converted to base64 in bounded `0x8000` chunks, avoiding the argument
  limit that motivated the 1,000-row persistence boundary.
- No plaintext financial payload, recovery phrase, secret, auth bypass, compatibility dual-write,
  arbitrary retry mask or unrelated product change was found in the exact range.

## Independent automation

| Gate                                                                            | Independent result                                                                                    |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Focused Vitest profile for P14 transaction/import/sync behavior                 | PASS in three clean processes; 5 files / 118 tests each, in 4.29 s, 4.29 s and 4.31 s.                |
| Broader owner profile                                                           | PASS; 12 files / 195 tests in 16.08 s.                                                                |
| `pnpm test`                                                                     | PASS; 60 files / 1,296 tests in 6.67 s.                                                               |
| `pnpm typecheck`                                                                | PASS.                                                                                                 |
| `pnpm lint`                                                                     | PASS exit 0; 0 errors / 10 warnings (one TanStack warning and nine inherited unused-symbol warnings). |
| `pnpm build`                                                                    | PASS; Next 16.2.10 compiled, generated types and built all 17 routes.                                 |
| Changed-path `oxfmt --check`                                                    | PASS; all 24 changed TypeScript/TSX paths.                                                            |
| Changed-path ESLint                                                             | PASS; 0 errors / 9 inherited warnings.                                                                |
| `git diff --check BASE..HEAD`                                                   | PASS.                                                                                                 |
| Exact changed lineage E2E, Chromium, no retry, `--repeat-each=3 --workers=1`    | PASS; 3/3 in 32.7 s.                                                                                  |
| Six-file affected E2E matrix, Chromium, no retry, `--repeat-each=3 --workers=1` | PASS; 180/180 in 13.3 minutes.                                                                        |
| Full Chromium E2E, no retry, `--workers=1`                                      | PASS; 93/93 in 6.1 minutes.                                                                           |

The green automation is reported exactly but does not cover F-01's ordinary-delete-before-import-
delete sequence. Read-only command verification was independently delegated as required by the
reviewer authority; the reviewer independently inspected the exact range, ran the focused and full
browser suites, and performed the installed-CLI charter.

Repository `pnpm format:check` is red on 14 paths. Thirteen are the already recorded
root-owned/frozen Markdown paths, but the fourteenth is the frozen P14 implementation evidence
itself. This contradicts that evidence's claims that the repository failure remained the prior 13
paths and that the evidence artifact was formatted. The evidence was not modified because its
assigned SHA is frozen. A subsequent implementation revision must report its gate result exactly and
format its newly assigned evidence before handoff. No P14 product/test path failed formatting.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli` with disposable session `p14-review-01`
  against the correctly keyed local server. No Playwright MCP, `npx`, headed, debug/pause mode,
  temporary test or temporary config was used.
- Created a fresh authenticated state while all twelve recovery words remained masked. The phrase
  was never revealed, read, copied, entered or printed.
- Created a KWD account and imported four rows through the ordinary file/column/account flow.
  Repeated edits preserved the exact first originals: negative `-KWD 1.234`, positive `KWD 2.500`
  and zero `KWD 0.000`. The untouched fourth row had no `aria-description`.
- Reload preserved all edited amounts and origins. A normally opened authenticated duplicate tab
  contained the same rows. Editing the positive amount while offline immediately retained
  `KWD 2.500` and showed `Saving`; reconnection reached `Saved`, and the duplicate tab converged to
  the new amount with the same origin.
- The input's accessible name was `Transaction amount in KWD`. At 390 × 844, dark preference,
  reduced motion and 200% document zoom, the delayed-open tooltip reached opacity 1 at x=26..384 /
  y=680..768. Its direct text wrapped into two contained lines at x=50..274 / y=691..756; its arrow
  was x=364..384 / y=768..788. Tooltip, text and arrow remained within the 390 × 844 viewport.
- Imported an in-browser 1,000-row CSV through the ordinary flow. The UI reached 1,004 total
  transactions while only the virtualized window was mounted; the duplicate tab converged to the
  same total. Reload retained 1,004, and searching `CLI large 0999` returned the exact final row
  with KWD `1000.000`.
- The successful 1,000-row `sync.pushOps` request returned HTTP 200. Boolean-only body inspection
  confirmed `encryptedData` and `versionVector` were present while the plaintext description and
  filename were absent. All observed requests remained on localhost.
- F-01 was reproduced with exact current count three versus dialog count four. Confirming left 1,001
  transactions: the separate 1,000-row import plus one unrelated manually added empty row. The
  chosen import and all three live linked KWD rows were gone.
- One Undo restored exactly the three still-linked KWD rows and the import record; the independently
  deleted positive row stayed absent. One Redo removed the exact three and record again. The
  1,000-row import and unrelated manual row survived both operations.
- A final fresh reload retained 1,001 transactions and produced zero console errors, zero page
  errors and zero non-local requests. The duplicate tab and CLI session were closed, `delete-data`
  reported no residual user data, and browser listing was empty.
- Root stopped the task-owned server, restored generated `next-env.d.ts`, and moved only
  review-generated `.next`, test-results and CLI artifacts to recoverable trash while preserving
  pre-existing artifacts.

## Boundary, frozen sources and questions

- Frozen human scratch remains SHA-256
  `b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`, 350 lines / 24,248 bytes, with
  HS-008 unchecked.
- Canonical FS-001 source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes. Its normalized 21 exact rolling checksum remains unchanged.
- Before this artifact, HEAD was exactly `8643fff75f8d70a6485f9c23fcca33a231d9d9cf`, the index was
  empty, and the only worktree entries were root-owned modified `HANDOFF.md` / `PROGRESS.md` plus
  frozen untracked P14 implementation evidence. This review is the sole reviewer-created repository
  artifact. No product, test, source marker, ledger, evidence, configuration or prior-review file
  was edited.
- No `Q-*` proposal is needed. The requirement for precise destructive feedback is settled; F-01 is
  an implementation defect, not a product ambiguity.

## Single final verdict

**FAIL.** P14 revision 01 correctly implements first-origin lineage, accessible currency-precision
presentation, encrypted large-import persistence and current-set atomic deletion, but its
confirmation dialog reports the immutable original batch size as the number it will now delete. Root
must preserve this immutable review, keep HS-008 unchecked and route F-01 plus the evidence-gate
discrepancy into P14 revision 02.
