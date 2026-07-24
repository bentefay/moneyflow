# P15 Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package / requirement / revision: `P15` / `HS-013` / `01`.
- Literal cumulative review BASE: `b3e96ba9e9487d13df56956d220fffca63d6482d`.
- Exact clean implementation-start/control HEAD: `f0373722ffeca6812820f5270190c203300f712b`.
- This sole revision-01 worker artifact was created before any product or test edit. The
  implementation-start index and worktree were empty.
- The future reviewer artifact `reviews/P15-review-01.md` did not exist and was not created.

## Static owner analysis and red-to-green

- The original implementation had two independent validation paths: `FileDropzone.tsx` and the
  imports-list page both performed their own extension/size/read checks. The imports list also
  copied the complete file through `FileReader` -> JSON -> `sessionStorage.pendingImportFile`; the
  transactions page had no drop owner. The app layout is the narrowest persistent owner shared by
  both source routes and `/imports/new`.
- The existing import parser, `ImportPanel`, CRDT mutations, sync transport, schemas and persistence
  did not need changes. They remained outside the authorized diff. The new owners feed the existing
  workflow the original browser `File`.
- Before product edits, checked-in behavior tests were run against the unchanged implementation:
    - `pnpm exec vitest run tests/unit/import/file-validation.test.ts tests/unit/components/import-drop-target.test.tsx --pool=forks --maxWorkers=1`
      failed as expected: **2 failed suites / 0 tests** in 1.24s because neither shared owner
      existed.
    - `pnpm exec playwright test tests/e2e/import.spec.ts --grep "transaction surface drop|imports surface overlay|imports drop rejects|imports surface drops OFX" --project=chromium --workers=1 --retries=0 --reporter=list`
      failed **0/4** against the root-owned server. The transactions target was absent, child leave
      dismissed the imports overlay, invalid drops had no actionable pre-navigation alert, and the
      imports surface could not perform the new shared handoff. Individual failures completed in
      10.0s, 8.2s, 7.4s and 30.0s.
- After implementation, the exact focused unit command passed **2 files / 9 tests** in three
  separate clean processes: 1.56s, 1.59s and 1.55s.
- The exact four E2E journeys passed **4/4 in 19.1s**. After strengthening the transaction journey,
  that journey passed **1/1 in 10.7s**. The exact four-journey command with `--repeat-each=3` then
  passed **12/12 in 43.0s**, one worker and retries zero.

## Implementation and acceptance mapping

- `src/lib/import/file-validation.ts` is the sole typed picker/drop validator. It returns explicit
  success/error results for no file, multiple files, zero bytes, more than 10 MiB, unsupported
  extension, MIME mismatch, content mismatch and unreadable input. It accepts mixed-case CSV/OFX/QFX
  names and appropriate bank-export MIME types. Content inspection reads at most 8 KiB, rejects
  HTML/binary spoofing, recognizes OFX headers, and returns the original `File` without copying its
  complete contents.
- `ImportDropTarget.tsx` is the one reusable surface owner. A nested-enter depth keeps the overlay
  stable across children; target leave plus window `dragend`/`drop` cleanup prevents stranded state.
  The absolute overlay has `pointer-events: none`; children keep their native scrolling, focus and
  selection. The owner sets honest single/multiple `dropEffect`, validates before navigation,
  announces actionable invalid results with `role="alert"`, and restores the prior focus owner.
  Reduced-motion and established light/dark tokens are used.
- `ImportFileTransferProvider.tsx`, mounted once inside the persistent app layout and keyed to the
  active vault, holds only the original in-memory `File`, a transfer ID and source path. Stage/take
  is one-shot. Route replacement, vault change and provider unmount clear stale state. No file
  name/content enters session/local storage, IndexedDB, a URL, a log or a request.
- The whole imports content surface and the ordinary transaction-table content surface use the
  shared target. The app shell, navigation and portaled controls are not targets. Transaction child
  rows, filtered/virtualized rows and edges bubble to the same owner.
- `/imports/new` consumes a staged file once and otherwise retains its keyboard picker. Cancel uses
  the captured source path. `FileDropzone` now composes the shared owner and validator; Enter and
  Space still open its labelled file input. The previous FileReader/JSON/sessionStorage handoff is
  removed.
- A valid drop only enters the existing parse, format, mapping, duplicate, account and preview flow.
  Neither CSV nor OFX/QFX creates data until the existing explicit import button is pressed.
  Cancel/back does not mutate data, and same-file retry works.
- Unit/component coverage includes the complete validation result matrix, mixed-case names, QFX,
  MIME mismatch, spoofed/binary content, oversized and unreadable `File` subclasses, nested depth,
  outside cleanup, honest drop effect, focus-restoring alert, exact `File` identity, child
  noninterference, one-shot transfer, route cleanup, storage absence and vault switch.
- Real browser `File`/`DataTransfer` E2E coverage includes transaction/import surfaces; CSV, OFX/QFX
  and invalid payloads; child, edge, filtered and virtualized row drops; nested/outside lifecycle;
  cancel/back; same-file retry; plaintext storage/URL absence; explicit 60-row confirmation; bounded
  mounted rows; and cancel after a filtered-row follow-up drop. Existing picker CSV and OFX journeys
  remain green.
- P13 filtering/virtualization/add-row behavior and P14 lineage, original-amount, import-history,
  delete/Undo/Redo and parser behavior are preserved by the affected and full regression suites.
  CRDT/sync/crypto/server/parser code has no P15 product diff.

## Automated validation

- Import unit/integration profile:
  `pnpm exec vitest run tests/unit/import tests/integration/import.test.ts tests/unit/components/import-drop-target.test.tsx --pool=forks --maxWorkers=1`
  passed **8 files / 262 tests** in 6.37s.
- Existing picker preservation:
  `pnpm exec playwright test tests/e2e/import.spec.ts --grep "CSV import journey|OFX import journey" --project=chromium --workers=1 --retries=0 --reporter=list`
  passed **2/2 in 9.6s** (4.3s and 2.4s).
- The affected six-spec matrix:
  `pnpm exec playwright test tests/e2e/description-aliases.spec.ts tests/e2e/import.spec.ts tests/e2e/sync-persistence.spec.ts tests/e2e/tab-duplication.spec.ts tests/e2e/transactions.spec.ts tests/e2e/undo-redo.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list`
  passed **66/66 in 4.8 minutes**.
- Full `pnpm test` passed **62 files / 1,307 tests** in 6.40s.
- Full Chromium:
  `pnpm exec playwright test --project=chromium --workers=1 --retries=0 --reporter=list` passed
  **99/99 in 6.5 minutes**. Output contained only the expected explicit offline/auth/presence
  scenario diagnostics.
- `pnpm typecheck` passed.
- `pnpm lint` exited zero with the exact inherited **10 warnings**: the existing TanStack compiler
  warning plus the same nine P14 unused-import warnings; there were no errors.
- `pnpm build` passed: compilation in 5.2s, TypeScript in 8.2s, all 17 routes generated.
- Exact 13-path `oxfmt --check` and ESLint both passed cleanly.
- `git diff --check` passed before staging and for the exact staged product/test diff.
- Repository `pnpm format:check` initially reported the same 14 inherited frozen/historical Markdown
  files plus this then-unformatted draft evidence. After formatting this evidence, the final rerun
  reported exactly the 14 inherited files: the six root ledgers, six P12 evidence/review artifacts,
  P14 implementation evidence and `specs/human-scratch.md`. This evidence passed its exact-path
  format check; no inherited file was rewritten.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli`, unique key `p15-impl-01`, against the
  root-owned keyed build server. Recovery material was never revealed, read or recorded.
- At 320x720 with dark styling and reduced motion:
    - the overlay was visible and within the viewport;
    - nested child enter/leave retained exactly one overlay;
    - a body `dragend` removed it;
    - computed `pointer-events` was `none` and transition duration was `0s`;
    - dark foreground/background tokens resolved distinctly.
- A two-file transaction drop stayed on `/transactions`, announced “Import one file at a time” with
  CSV/OFX/QFX recovery guidance, and restored focus to the Search control.
- On the imports surface, multiple, empty, 10 MiB-plus, HTML-spoofed CSV, unsupported PDF and
  CSV-with-image-MIME payloads each stayed on `/imports`, produced a specific actionable alert and
  restored focus to `Import new file`. Repeated nested enter/leave remained stable and outside drag
  end cleared the overlay.
- Pressing Enter on `Import new file` opened the native file chooser, proving the labelled keyboard
  alternative remained available.
- A mixed-case `.CsV` transaction drop at the edge entered the existing workflow. Cancel returned to
  Transactions; browser Back showed an empty dropzone instead of replaying the staged file; a
  same-file retry succeeded. After explicit mapping/account choices, confirmation created exactly
  two transactions. A later filtered-row child drop displayed the overlay, entered the workflow, and
  Cancel preserved the two original transactions.
- Valid `.ofx` and `.qfx` browser `File` payloads each reached the import configuration screen with
  the exact synthetic file name. Cancel returned to Imports, and neither appeared in import history.
- A separate deterministic persistence check explicitly confirmed one CSV transaction, waited for
  the toolbar and one mounted row, reloaded, then semantically waited for the same toolbar/count.
  The transaction remained. Before and after reload, local/session storage contained neither the
  synthetic filename/content/description nor a `pendingImportFile` key.
- CLI request history showed `sync.pushOps` returned 200. A sanitized body inspection found
  `encryptedData` and `versionVector` and found none of the synthetic filename, CSV content,
  description or pending-file key. Final CLI console inspection reported **0 errors / 0 warnings**.
- The optional final 60-row manual scroll probe became busy during its import click and is not
  acceptance evidence. Scrolled/virtualized row behavior is instead established by the repeated
  checked-in DataTransfer journey and the 66/66 plus 99/99 no-retry suites.
- Two exploratory event-listener privacy harnesses closed the CLI process and produced no acceptance
  result; they are excluded. Earlier deliberately malformed compact OFX probes that remained in
  “Loading file” are also excluded; only the complete valid OFX/QFX observations above are credited.
  No arbitrary timeout or wait is used as positive evidence.
- The CLI session was closed and `playwright-cli list` reported no browsers. Root stopped the
  server, verified the port clear, restored `next-env.d.ts`, and moved this run’s `.next`,
  `test-results` and nine P15 CLI artifacts to recoverable trash. Older unrelated CLI artifacts were
  preserved.

## Questions and risks

- No material ambiguity remained and no `Q-PROPOSAL-P15-01-*` was required. Existing policy resolved
  the single-file and 10 MiB limits.
- Browser-synthesized drag events do not reliably preserve a post-dispatch `dropEffect` value. Exact
  honest `dropEffect` behavior is therefore asserted in the component test; installed-CLI evidence
  covers lifecycle, overlay and navigation outcomes.
- The validator bounds content sniffing to 8 KiB and passes the original `File`, limiting memory
  amplification. The parser still performs its established read only after validation.
- The transfer is intentionally in-memory and route-scoped. A hard reload of `/imports/new` does not
  replay a financial file; the user must choose/drop it again.

## Boundary and cleanup

- Exact product/test commit and immutable review HEAD: `d652032ea4f738e06fd5a29018bd341010285696`
  (`Implement shared import drop targets`).
- Exact package delta:
  `f0373722ffeca6812820f5270190c203300f712b..d652032ea4f738e06fd5a29018bd341010285696`. It contains
  exactly the 13 authorized product/test paths listed in the dispatch and no others.
- Exact cumulative reviewer range:
  `b3e96ba9e9487d13df56956d220fffca63d6482d..d652032ea4f738e06fd5a29018bd341010285696`. The two
  additional cumulative-range paths are root-owned pre-dispatch `HANDOFF.md`/`PROGRESS.md` control
  changes.
- The product/test commit index is clean. The only worker worktree path is this uncommitted evidence
  artifact. `reviews/P15-review-01.md` remains absent.
- Frozen scratch, FS-001 and SCOPE identities from the dispatch were not edited or re-derived.
- This is implementer evidence only. It does not claim independent review or PASS; HS-013 remains
  unchecked pending a distinct reviewer over the exact cumulative range.
