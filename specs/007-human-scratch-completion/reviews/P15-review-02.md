# P15 Independent Review — Revision 02

## Review identity and verdict

- Package / requirement / revision: `P15` / `HS-013` / `02`.
- Literal cumulative reviewed range:
  `b3e96ba9e9487d13df56956d220fffca63d6482d..91931688ef9463576b757a097968af543a4b8a75`.
- Revision-02 implementation range:
  `6751860ba4d1501404b35bca27d0711b93424eb6..91931688ef9463576b757a097968af543a4b8a75`.
- Frozen revision-02 implementation evidence: `evidence/P15/implementation-02.md`, SHA-256
  `a92301725fe0ee553cf5b21d9fb3796c92330994019c0224cf4952af5a21b501`, 169 lines / 12,275 bytes.
- The cumulative range contains 18 paths, 2,476 insertions and 391 deletions. It includes the
  complete revision-01 architecture/product/test delta plus the root control history, immutable
  revision-01 evidence and immutable failed review. The revision-02 delta contains exactly the five
  authorized product/test paths, with 686 insertions and 21 deletions. `git diff --check` passes.
- Current repository HEAD is the subsequent root-only review-state commit
  `02b5c1fd72a5dedcc8ddbb2efeee8d66021cd87b`; the assigned product/test HEAD remains unchanged at
  `91931688ef9463576b757a097968af543a4b8a75`.
- **Verdict: PASS.** Revision 02 independently closes all five revision-01 findings. The cumulative
  implementation now accepts supported XML OFX without loosening arbitrary markup, rejects renamed
  JSON/document signatures before navigation, exposes AA alert contrast in both themes, contains
  guidance and feedback at 200% zoom on both surfaces, and clears stale virtual-child depth on an
  outer leave without `dragend`. The shared original-`File` architecture, explicit confirmation,
  scale, encryption/privacy and P13/P14 behavior remain intact.

## Revision-01 finding closure

### F-01 — Closed: parser-compatible XML OFX reaches the existing workflow

`hasOFXSignature` retains the established SGML/direct-root cases and now accepts a bounded optional
XML declaration followed by a required bounded OFX processing instruction and `<OFX>` root
(`src/lib/import/file-validation.ts:70-79`). Arbitrary XML remains rejected.

Independent unit coverage passes the standard declaration/instruction form and rejects an unrelated
XML wrapper. Real browser `File`/`DataTransfer` E2E covers the keyboard picker plus Imports and
Transactions surfaces. The installed application independently reached `OFX • 2 rows` and an enabled
one-transaction confirmation from a complete XML OFX document through the direct picker dropzone and
both whole-surface targets. Cancel returned to the exact source without adding a transaction or
history record.

### F-02 — Closed: renamed JSON and known documents fail the bounded CSV gate

The validator rejects JSON object/array, XML/markup, PDF, ZIP/control-byte, RTF and common image
signatures, then uses the established Papa Parse dependency to require consistent bounded CSV row
structure (`src/lib/import/file-validation.ts:81-123`). The final potentially partial record is
excluded when the 8 KiB slice ends before EOF. BOM, quoted delimiters, multiline/escaped fields,
one-column exports, semicolon/Windows-1252 content and a record cut at the sniff boundary remain
green.

Obvious JSON renamed `.csv` was independently rejected through the direct picker/dropzone and both
whole-surface targets. Each surface stayed on its source route, exposed the actionable CSV
content-mismatch alert, and restored prior Search/picker focus. No CSV preview appeared.

### F-03 — Closed: normal-size alert text meets AA in both themes

The alert now uses explicit opaque `text-white` with light `bg-red-900` and dark `bg-red-950`
(`src/components/features/import/ImportDropTarget.tsx:280-287`). Browser-canvas conversion of the
actual computed CSS colors measured:

- light: `rgb(255,255,255)` on `rgb(130,24,26)`, **10.0251:1**;
- dark: `rgb(255,255,255)` on `rgb(70,8,9)`, **16.1651:1**.

Both comfortably exceed 4.5:1 for the 14 px alert text. The alert retains `role="alert"`, focus
restoration and pointer noninterference.

### F-04 — Closed: guidance and alert use the visible target/viewport intersection

The owner derives target/visual-viewport intersection geometry with collision margins and CSS zoom
scaling, updates it on target resize plus window/visual-viewport resize/scroll, and ensures a
minimum visible target area before presentation
(`src/components/features/import/ImportDropTarget.tsx:42-79`, `:147-169`, `:261-287`).

At an actual 390 × 844 viewport and 200% document zoom:

- Imports target was `x=0..390 / y=112..1688`; guidance was `x=16..374 / y=346..610`, and the alert
  was `x=16..374 / y=334..622`.
- Transactions target was `x=48..342 / y=-26..870`; guidance was `x=66..328 / y=244..604`, and the
  alert was `x=66..328 / y=220..628`.

Every box and its text remained inside the visible target intersection with an explicit margin. Both
overlays had `pointer-events: none`; reduced-motion transition duration was `0s`. Ordinary
scrolling, focus and selection owners are unchanged.

### F-05 — Closed: outer leave is authoritative after virtual-child unmount

The leave handler identifies an actual outer-target leave whose related target is outside and resets
depth immediately, while ordinary nested live-child transitions continue to use balanced depth
(`src/components/features/import/ImportDropTarget.tsx:192-209`).

The installed application repeated the exact former counterexample on the confirmed 60-row
virtualized table: target enter plus row `0000` enter produced one overlay; scrolling to
`scrollTop=1921` unmounted the row; dispatching only the outer leave cleared the overlay from one to
zero. No `dragend` was dispatched. The checked-in browser journey performs the same real
`DataTransfer` sequence.

## Cumulative acceptance, safety and compatibility

- One reusable `ImportDropTarget` and one typed `validateImportFiles` owner still serve picker and
  drop paths. The Imports content and transaction-table content are the bounded targets; app shell,
  navigation and portals remain outside.
- Validation still reads at most 8 KiB, enforces exactly one file, 10 MiB maximum, extension/MIME
  compatibility and typed actionable failures, and passes the original browser `File` without
  copying its complete contents.
- The transfer provider holds only the original `File`, transfer ID and source path in memory.
  Consumption is one-shot; route replacement, vault change and unmount clear stale state. Back does
  not replay a consumed file, and the same file can be retried.
- CSV, XML OFX, SGML OFX and QFX all enter the existing mapping/account/preview workflow. None
  creates data before the explicit import button. Cancel from every sampled path preserves
  transactions and import history.
- The original six invalid cases—multiple, empty, over 10 MiB, HTML-spoofed CSV, unsupported PDF and
  image-MIME CSV—each stayed on Imports, announced specific recovery guidance and restored picker
  focus. Enter on the focused picker opened the native chooser.
- A 60-row transaction-surface CSV rendered `CSV • 61 rows` and an explicit `Import 60 Transactions`
  action. Confirmation created exactly 60 transactions in 442 ms while the virtualizer mounted 18.
  Reload retained 60/18.
- Filtering to row `0059`, entering/dropping at that child, cancelling, browser Back and same-file
  retry all preserved the confirmed 60. The consumed name did not replay on Back.
- P14 lineage/history remained correct: editing row `0000` from USD 1.00 to 1.50 exposed
  `Original imported amount: USD 1.00` through `aria-description` and tooltip; reload retained both.
  Imports history showed the exact filename and live count 60.
- The successful 60-row `sync.pushOps` request returned HTTP 200. A boolean-only body inspection
  found `encryptedData` and `versionVector`, while filename, description, CSV content and
  `pendingImportFile` leak flags were all false.
- Final authenticated reload retained 60 transactions with 18 mounted. Local/session storage
  contained none of the sampled filename, description, CSV or pending-key strings; all 58 observed
  resource entries were same-origin. Console inspection returned zero errors and zero warnings.
- No recovery word was revealed, read, copied, entered or printed. No plaintext financial
  persistence, auth bypass, compatibility dual-write, test-only production hook, hidden retry or
  unrelated product change was found.

## Independent automation

| Gate                                                                          | Independent result                                                                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Focused validator/drop-target Vitest                                          | PASS in three clean processes; 2 files / 14 tests each, in 1.60 s, 1.61 s and 1.61 s.       |
| Import unit/integration profile                                               | PASS; 8 files / 267 tests in 10.22 s while run concurrently with broader gates.             |
| `pnpm test`                                                                   | PASS; 62 files / 1,312 tests in 7.45 s.                                                     |
| `pnpm typecheck`                                                              | PASS.                                                                                       |
| `pnpm lint`                                                                   | PASS exit 0; 0 errors / 10 warnings (one TanStack warning and nine inherited P14 warnings). |
| `pnpm build`                                                                  | PASS; Next 16.2.10 compiled in 5.9 s, TypeScript in 8.3 s, and built all 17 routes.         |
| Exact five-path `oxfmt --check` / ESLint                                      | PASS / PASS with no output.                                                                 |
| Frozen evidence exact-path `oxfmt --check`                                    | PASS.                                                                                       |
| `git diff --check BASE..HEAD`                                                 | PASS.                                                                                       |
| F-01–F-05 browser closure, Chromium, `--repeat-each=3`, one worker/no retry   | PASS; 12/12 in 52.7 s.                                                                      |
| Revision-01 four-journey preservation, `--repeat-each=3`, one worker/no retry | PASS; 12/12 in 48.8 s.                                                                      |
| Existing CSV/OFX picker preservation, one worker/no retry                     | PASS; 2/2 in 13.3 s.                                                                        |
| P14 lineage/history/nested/zoom journeys, one worker/no retry                 | PASS; 3/3 in 28.4 s.                                                                        |
| Six-spec affected matrix, Chromium, one worker/no retry                       | PASS; 69/69 in 5.1 minutes.                                                                 |
| Full Chromium, one worker/no retry                                            | PASS; 102/102 in 6.6 minutes.                                                               |

The browser tests use actual browser `File`/`DataTransfer`, semantic waits, behavior assertions and
retries zero. The focused matrix repeats every former failure three times. No arbitrary wait,
CSS-only substitute or post-dispatch `dropEffect` assumption is credited.

Repository `pnpm format:check` exits 1 on exactly the inherited 14 Markdown paths: the six root
ledgers, six P12 implementation/review artifacts, P14 implementation evidence and
`specs/human-scratch.md`. No P15 product/test path or revision-02 evidence failed its exact format
check.

## Installed-CLI manual charter and excluded probes

- Used only repository-installed headless `playwright-cli` with unique disposable session
  `p15-review-02` against the root-owned keyed server. No Playwright MCP, `npx`, headed, debug/pause
  mode, temporary test or temporary config was used.
- A fresh identity was created while all twelve recovery words remained masked. The manual results
  for F-01 through F-05, invalid cases, keyboard chooser, SGML/QFX, scale, P13/P14, persistence and
  privacy are recorded above.
- The following exploratory harnesses were excluded from acceptance:
    1. An initial compound picker script paused on the CLI file-chooser tracker; uploading harmless
       `package.json` cleared the modal.
    2. Two programmatic input-change probes navigated before their compound scripts could observe
       stable transferred state and remained at `Loading file...`; complete actual DataTransfer
       journeys were rerun independently and passed.
    3. A deliberately compact XML fixture reached the parser but correctly failed as structurally
       incomplete; the complete standard XML fixture passed and is the only XML acceptance input.
    4. A fresh-tab clean-page probe redirected to `/unlock` because the signing session is
       tab-scoped. That unauthenticated tab was closed and not used as persistence evidence.
    5. The contrast canvas emitted one performance warning about repeated pixel readback. It came
       from reviewer measurement code; a final authenticated reload then reported zero warnings and
       zero errors.
- The CLI browser was closed, `delete-data` reported no user data, and browser listing reported
  `(no browsers)`. Root stopped the keyed server, verified port 3000 clear, restored
  `next-env.d.ts`, and moved only this review's `.next`, `test-results` and 12 new CLI YAML
  artifacts to recoverable trash while preserving 13 older unrelated YAML artifacts.

## Boundary, frozen sources, risks and questions

- Frozen human scratch remains SHA-256
  `f0adfef6e19b80969dae748cf8c616614af61ba778837234c97af385a19adcb1`, 350 lines / 24,249 bytes. Its
  21 normalized blocks are exact; HS-013 remains unchecked during review.
- Canonical FS-001 source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Before this artifact, current HEAD was exactly `02b5c1fd72a5dedcc8ddbb2efeee8d66021cd87b`, the
  index and worktree were empty, `next-env.d.ts` matched HEAD, generated review artifacts were
  absent and port 3000 was clear. The literal reviewed product/test HEAD remained exactly
  `91931688ef9463576b757a097968af543a4b8a75`. This review is the sole reviewer-created repository
  path.
- CSV recognition intentionally remains bounded to 8 KiB and excludes a possibly partial terminal
  row from consistency checks. Honest final `dropEffect` remains deterministically owned by the
  component test because browser-synthesized drag events do not reliably expose it after dispatch.
  These are documented bounded-test risks, not acceptance failures.
- No `Q-*` proposal is required. The explicit revision-02 contract and established parser/security/
  accessibility behavior resolve the implementation choices.

## Single final verdict

**PASS.** P15 revision 02 closes F-01 through F-05 over the full cumulative range while preserving
the revision-01 shared original-`File` architecture, secure pre-navigation validation, explicit
confirmation, virtualized scale, encrypted persistence and P13/P14 behavior. Root may preserve this
immutable review, complete its integration checks, and only then perform the authorized HS-013
marker procedure.
