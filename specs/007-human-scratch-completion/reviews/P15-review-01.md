# P15 Independent Review — Revision 01

## Review identity and verdict

- Package / requirement / revision: `P15` / `HS-013` / `01`.
- Literal reviewed range:
  `b3e96ba9e9487d13df56956d220fffca63d6482d..d652032ea4f738e06fd5a29018bd341010285696`.
- Exact product implementation range:
  `f0373722ffeca6812820f5270190c203300f712b..d652032ea4f738e06fd5a29018bd341010285696`.
- Frozen implementation evidence: `evidence/P15/implementation-01.md`, SHA-256
  `5ad467cdaaec07685d20fdeff28aff1d5564e571fbd5e3ca99d6a452c97cd05e`, 177 lines / 13,180 bytes.
- The cumulative range contains 15 paths, 1,360 insertions and 387 deletions. Two paths are
  root-owned `HANDOFF.md` / `PROGRESS.md`; the other 13 are the authorized product/test paths, with
  1,209 insertions and 225 deletions. `git diff --check BASE..HEAD` passes.
- **Verdict: FAIL.** The shared original-`File` handoff, bounded sniff, pre-navigation error path,
  explicit-import boundary, route/vault cleanup, encryption and both surface integrations are
  structurally sound. However, the validator rejects a supported XML OFX form and accepts obvious
  JSON renamed as CSV; the alert fails normal-text contrast in both themes; its overlay and alert
  move wholly below the viewport at 200% zoom; and a virtual child unmount can strand the overlay.
  HS-013 must remain unchecked.

## Findings

### F-01 — Medium / blocking Compatibility: supported XML OFX is rejected before parsing

`hasOFXSignature` accepts only a leading `OFXHEADER:` or `<OFX`
(`src/lib/import/file-validation.ts:68-70`). A standard XML-style OFX file can instead begin with an
XML declaration and OFX processing instruction before `<OFX>`. The existing parser already supports
that established form; its exact XML OFX unit test passes independently.

In the installed application, dropping a complete, otherwise valid bank statement beginning with
`<?xml version="1.0"?>` and `<?OFX OFXHEADER="200" ...?>` as `application/x-ofx` produced the
actionable content-mismatch alert and stayed on `/transactions`. It never reached the existing
parser or preview. This is a regression in the required CSV/OFX/QFX compatibility, not an invalid
fixture.

Required closure: align the shared validation predicate with the existing parser's OFX-format
recognition, including bounded leading XML declarations/processing instructions. Add validator and
real `File`/`DataTransfer` coverage for XML OFX through both target surfaces and preserve the SGML
OFX/QFX cases.

### F-02 — Medium / blocking Security/validation: obvious JSON renamed as CSV passes the sniff

`hasCSVSignature` rejects a short blacklist, then treats any comma, semicolon or tab on the first
line as sufficient CSV evidence (`src/lib/import/file-validation.ts:73-85`). A JSON object normally
contains commas, so the implementation does not meet the pre-navigation “clearly spoofed content”
boundary.

In the installed application, an obvious JSON object named `p15-spoofed-json.csv` with MIME
`text/csv` passed validation, navigated to `/imports/new`, and rendered as `CSV • 1 rows`. The JSON
keys were interpreted as headers. Import remained disabled only because later mapping was
incomplete; the content gate itself had already accepted and parsed the spoof.

Required closure: use a robust, bounded CSV recognition rule that rejects obvious JSON and other
known non-CSV document signatures without rejecting legitimate quoted/multiline bank exports. Cover
renamed JSON plus representative PDF/binary/markup payloads in the shared validator and behavior-led
drop/picker tests.

### F-03 — Medium / blocking Accessibility: validation alert text misses WCAG AA contrast

The alert uses `bg-destructive text-destructive-foreground`
(`src/components/features/import/ImportDropTarget.tsx:166-172`), but `src/app/globals.css` defines
only the destructive color mapping/value, not a `destructive-foreground` mapping/value. The text
therefore inherits the surface foreground.

Computed colors for the exact installed alert were:

- light: foreground `rgb(2, 6, 24)` on background `rgb(231, 0, 11)`, contrast **4.2259:1**;
- dark: foreground `rgb(248, 250, 252)` on background `rgb(255, 100, 103)`, contrast **2.7605:1**.

Both are below the 4.5:1 requirement for the alert's normal 14 px text. Its `role="alert"` and focus
restoration are otherwise correct.

Required closure: define/use an explicit foreground/background pair that meets normal-text AA in
both themes. Add deterministic computed-color contrast assertions for both theme states.

### F-04 — Medium / blocking Accessibility/reflow: zoom places all drop guidance off-screen

The overlay fills the complete scrollable target and centers within it, while the alert is
absolutely anchored to the target's bottom
(`src/components/features/import/ImportDropTarget.tsx:151-172`). This does not account for the
visible viewport intersection of a target taller than the viewport.

At the required 390 × 844 viewport with 200% document zoom on Imports:

- the target/overlay occupied `y=112..1688`;
- the two instruction text boxes occupied `y=880..936` and `y=952..1032`;
- the alert occupied `y=1448..1656`.

Both the drag instructions and subsequent validation feedback were wholly below the viewport. At 320
× 720 without zoom the overlay remained contained, so this is specifically a zoom/reflow failure.

Required closure: position guidance and feedback against the currently visible viewport
intersection, with collision/containment behavior for zoomed and scrolled surfaces. Add E2E geometry
assertions at 390 × 844 and 200% zoom for both target surfaces, overlay copy and invalid-file alert.

### F-05 — Medium / blocking Interaction lifecycle: virtual child unmount strands drag state

The owner tracks a pure enter/leave depth (`src/components/features/import/ImportDropTarget.tsx:46`,
`:75-101`). It does not resolve a leave against `relatedTarget` or the target boundary. When a child
that contributed an enter is unmounted by virtualization, its matching leave may never occur.

Using the transaction surface with 60 virtualized rows and an actual browser `DataTransfer`:

1. Entering the target and then mounted row `0000` produced one visible overlay.
2. Scrolling the virtualizer to the bottom unmounted row `0000`.
3. Dispatching the outer target leave reduced depth from two to one, so the overlay remained.
4. Only a later global `dragend` reset it.

The measured state was
`{before: 1, rowUnmounted: true, afterOuterLeave: 1, afterDragEnd: 0, scrollTop: 1921}`. A target
leave must not depend on a now-impossible child leave. The checked-in nested test balances every
child enter with a child leave and therefore misses the required virtual mount/unmount boundary.

Required closure: make outside-boundary detection authoritative even when nested elements disappear,
while retaining stable transitions across ordinary live children. Add a real browser test that
enters a virtual row, scroll-unmounts it, leaves the target without a child leave, and proves the
overlay clears without waiting for `dragend`.

## Other acceptance, safety and compatibility observations

- One reusable target and one shared picker/drop validator replace the duplicated validation paths.
  Both Imports content and the transaction table content have bounded targets; the app shell,
  navigation and portaled controls are outside them.
- The transfer provider retains only the original browser `File`, a transfer ID and source path in
  memory. Consumption is one-shot; route replacement, vault change and provider unmount clear stale
  state. No P15 file name/content was found in local/session storage, URL state or sync plaintext.
- CSV, SGML OFX and QFX drops reached the existing configuration/preview flow. Cancel returned to
  the correct source without creating data. The picker remained keyboard-operable and used the same
  validator.
- An explicit 60-row CSV import created exactly 60 encrypted transactions only after confirmation.
  Reload retained 60 while the virtualizer mounted 18. P14 import history and first-original-amount
  presentation remained intact, and a filtered virtual-row follow-up drop could be cancelled without
  mutation.
- The successful `sync.pushOps` body exposed `encryptedData` and `versionVector` but none of the
  synthetic filename, description, pending-file key or plaintext CSV content.
- No recovery material was revealed or read. No plaintext persistence, auth bypass, compatibility
  dual-write, arbitrary retry mask or unrelated product change was found in the exact range.

## Independent automation

| Gate                                                                     | Independent result                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Focused validator/drop-target Vitest                                     | PASS in three clean processes; 2 files / 9 tests each, in 1.56 s, 1.56 s and 1.57 s.        |
| Import unit/integration profile                                          | PASS; 8 files / 262 tests in 6.35 s.                                                        |
| Existing XML OFX parser unit case                                        | PASS; 1 passed / 39 skipped in 670 ms.                                                      |
| `pnpm test`                                                              | PASS; 62 files / 1,307 tests in 6.48 s.                                                     |
| `pnpm typecheck`                                                         | PASS.                                                                                       |
| `pnpm lint`                                                              | PASS exit 0; 0 errors / 10 warnings (one TanStack warning and nine inherited P14 warnings). |
| `pnpm build`                                                             | PASS; Next 16.2.10 compiled and built all 17 routes.                                        |
| Exact 13-path `oxfmt --check` / ESLint                                   | PASS / PASS with no output.                                                                 |
| Frozen evidence exact-path `oxfmt --check`                               | PASS.                                                                                       |
| `git diff --check BASE..HEAD`                                            | PASS.                                                                                       |
| Four changed journeys, Chromium, no retry, `--repeat-each=3 --workers=1` | PASS; 12/12 in 46.9 s.                                                                      |
| Existing CSV/OFX picker preservation, Chromium, no retry                 | PASS; 2/2 in 13.5 s.                                                                        |
| Six-spec affected matrix, Chromium, no retry, `--workers=1`              | PASS; 66/66 in 5.0 minutes.                                                                 |
| Full Chromium E2E, no retry, `--workers=1`                               | PASS; 99/99 in 6.6 minutes.                                                                 |

The green automation is reported exactly but does not cover XML-style OFX at the new gate, renamed
JSON, computed alert contrast, 200% overlay/alert geometry or a child disappearing between enter and
leave. The existing nested lifecycle test balances its child events and cannot establish F-05.

Repository `pnpm format:check` exits 1 on the same 14 inherited/frozen Markdown paths: the six root
ledgers, six P12 implementation/review artifacts, P14 implementation evidence and
`specs/human-scratch.md`. No P15 product/test path or P15 evidence failed its exact format check.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli` with unique disposable session
  `p15-review-01` against the correctly keyed local server. No Playwright MCP, `npx`, headed,
  debug/pause mode, temporary spec or temporary config was used.
- Generated a fresh authenticated state while all twelve recovery words remained masked. They were
  never revealed, read, copied or entered.
- At 320 × 720 with reduced motion, nested live-child enter/leave retained one overlay, global
  `dragend` cleared it, prior focus remained, pointer events were `none` and transition duration was
  zero. The dark overlay's primary and muted text had contrast ratios 16.47:1 and 7.72:1 against its
  composited background.
- On Imports, actual `DataTransfer` drops for multiple, empty, over-10-MiB, HTML-spoofed,
  unsupported-extension, MIME-mismatched and unreadable files each stayed on the source page,
  announced a specific actionable alert and restored picker focus. Pressing Enter on the picker
  opened its native chooser.
- Valid CSV, SGML OFX and QFX files reached preview and were cancelled without mutation. A valid
  SGML OFX transaction-surface drop did the same. F-01 and F-02 were separately reproduced with a
  complete XML OFX bank statement and obvious JSON renamed as CSV.
- F-03 was measured from computed foreground/background colors in both theme states. F-04 was
  measured at 390 × 844 with 200% zoom. F-05 used a mounted virtual row, an actual `DataTransfer`,
  scroll-driven unmount and an outer target leave.
- Explicitly confirming the 60-row CSV produced exactly 60 rows in about 3.0 seconds; reload
  retained 60 while only 18 were mounted. The first row's P14 edit showed the exact original USD
  1.00, and the P14 import record reported 60. Its delete dialog was cancelled, preserving the
  record and transactions.
- Final clean reload retained all 60 transactions with 18 mounted and produced zero console errors,
  zero warnings, zero page errors, zero request failures, zero HTTP failures and zero non-local
  requests. No plaintext storage leak was present.
- One deliberately offline exploratory route-navigation attempt was excluded because the locally
  hosted Next route itself became unavailable; it is neither positive evidence nor a finding.
- The CLI session closed, its data was deleted and browser listing was empty. Root stopped the
  server, verified the port clear, restored `next-env.d.ts`, and moved only review-generated
  `.next`, `test-results` and P15 CLI artifacts to recoverable trash while preserving unrelated
  artifacts.

## Boundary, frozen sources and questions

- Frozen human scratch remains SHA-256
  `f0adfef6e19b80969dae748cf8c616614af61ba778837234c97af385a19adcb1`, 350 lines / 24,249 bytes, with
  HS-013 unchecked.
- Canonical FS-001 source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes. Its normalized 21 exact rolling checksum remains unchanged.
- Before this artifact, HEAD was exactly `d652032ea4f738e06fd5a29018bd341010285696`, the index was
  empty, `next-env.d.ts` byte-matched HEAD, the server port was clear, and the only worktree entries
  were root-owned modified `HANDOFF.md` / `PROGRESS.md` plus frozen untracked P15 implementation
  evidence. This review is the sole reviewer-created repository artifact. No product, test, source
  marker, ledger, evidence, configuration or prior-review file was edited.
- No `Q-*` proposal is needed. The acceptance contract explicitly requires supported OFX
  compatibility, clearly spoofed-content rejection, accessible theme/zoom behavior and virtual-row
  mount/unmount cleanup; these are implementation defects rather than product ambiguities.

## Single final verdict

**FAIL.** P15 revision 01 establishes the intended shared in-memory drop architecture and preserves
explicit encrypted imports, but it rejects supported XML OFX, admits obvious renamed JSON, presents
an under-contrast alert, loses all guidance below the viewport at 200% zoom and can strand its
overlay after virtual-child unmount. Root must preserve this immutable review, keep HS-013 unchecked
and route F-01 through F-05 into P15 revision 02.
