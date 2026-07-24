# P15 Implementation Evidence — Revision 02

## Immutable dispatch boundary

- Package / requirement / revision: `P15` / `HS-013` / `02`.
- Literal original cumulative review BASE: `b3e96ba9e9487d13df56956d220fffca63d6482d`.
- Immutable revision-01 product/test HEAD: `d652032ea4f738e06fd5a29018bd341010285696`.
- Immutable revision-01 failure integration: `49dcef93bdbd4d4d21f0313061bc262473801966`.
- Exact clean revision-02 dispatch/control HEAD: `6751860ba4d1501404b35bca27d0711b93424eb6`.
- The sole revision-02 worker artifact was created before any product or test edit. The index and
  worktree were empty at implementation start.
- The immutable failed review `reviews/P15-review-01.md` was read completely.
  `reviews/P15-review-02.md` did not exist and was not created.

## F-01 through F-05 red-to-green

- Before any product edit, the exact focused command
  `pnpm exec vitest run tests/unit/import/file-validation.test.ts tests/unit/components/import-drop-target.test.tsx --pool=forks --maxWorkers=1`
  failed as required: **2 failed files / 5 failed and 9 passed tests** in 2.59s.
    - F-01: the shared predicate rejected an XML declaration plus OFX processing instruction.
    - F-02: obvious JSON renamed as CSV passed the old separator-only sniff.
    - F-03: the alert retained the under-contrast destructive token pair.
    - F-04: there was no viewport-intersection positioning owner or guidance test identity.
    - F-05: a vanished nested child left depth stranded after the outer leave.
- After implementation, that exact command passed **2 files / 14 tests**. After the final
  visible-area scroll correction, it passed in three new clean processes in 1.61s, 1.62s and 1.62s.
- The validator now accepts either established SGML OFX or a bounded optional XML declaration,
  required bounded OFX processing instruction and `<OFX>` root. Arbitrary XML remains rejected.
- Bounded CSV recognition now rejects JSON object/array, XML/markup, PDF, ZIP/control-byte, RTF and
  common image signatures before using the established Papa Parse dependency to require consistent
  parsed row structure. It preserves BOM, quoted delimiters, multiline/escaped fields, one-column
  exports, Windows-1252 bytes and a record cut at the 8 KiB sniff boundary.
- Alert colors are explicitly white on red-900 in light mode and red-950 in dark mode. Guidance and
  feedback are positioned in the target/visual-viewport intersection with collision margins and
  CSS-zoom scaling. A target with too little visible height uses the standard centered
  `scrollIntoView` behavior before presentation.
- An outer-target leave whose related target is outside is authoritative and resets stale depth,
  while balanced transitions across live children retain the existing stable overlay.

## Implementation and cumulative preservation

- `src/lib/import/file-validation.ts` remains the sole picker/drop validation owner. It still reads
  no more than 8 KiB, enforces the existing one-file/10 MiB/extension/MIME rules and returns the
  original browser `File`.
- `ImportDropTarget.tsx` remains the sole shared surface owner. Its merged internal/external ref
  supports live viewport measurement without changing either page owner. ResizeObserver, window
  scroll/resize and visual-viewport scroll/resize keep floating content current.
- The three modified test owners cover XML OFX and renamed JSON through picker plus both real
  DataTransfer surfaces, deterministic contrast/zoom geometry on both surfaces, and the exact
  virtual-row-unmount lifecycle. Existing transaction, cancel, filtered-row and history assertions
  stay in the same journey.
- The implementation needed no page, provider, parser, FileDropzone, export, CRDT, sync, schema,
  persistence, configuration or dependency change. The original in-memory one-shot handoff, explicit
  confirmation boundary and encrypted persistence remain intact.
- An early E2E geometry loop incorrectly assumed the mobile sidebar link stayed available between
  iterations; it was excluded and changed to the established semantic navigation helper. The
  corrected test then exposed a real transaction-target case with only `y=744..844` visible at 200%
  zoom. The minimum-visible-area correction closed that case before the final evidence runs.

## Automated validation

- Focused F-01 through F-05 Chromium command with retries zero, one worker and `--repeat-each=3`:
  **12/12 in 44.4s**.
- Exact revision-01 four-journey preservation matrix with retries zero, one worker and
  `--repeat-each=3`: **12/12 in 41.1s**.
- Existing CSV and OFX picker journeys: **2/2 in 9.7s**.
- P14 lineage/history, nested duplicate and original-amount journeys: **3/3 in 22.2s**.
- Affected six-spec Chromium matrix (`description-aliases`, `import`, `sync-persistence`,
  `tab-duplication`, `transactions`, `undo-redo`), retries zero and one worker: **69/69 in 4.9
  minutes**.
- Full Chromium, retries zero and one worker: **102/102 in 6.6 minutes**. Output contained only the
  expected explicit offline/auth/presence scenario diagnostics.
- Final import unit/integration profile: **8 files / 267 tests** in 6.44s.
- The first final `pnpm test` run passed 1,311/1,312 tests but the existing duplicate-detection
  timing benchmark measured ratio 4.165 against its `<4` threshold. No P15 owner is in that
  benchmark. Its isolated file immediately passed **43/43 in 1.63s**, and an immediate full rerun
  passed **62 files / 1,312 tests in 6.58s**.
- `pnpm typecheck` passed. `pnpm lint` exited zero with exactly the inherited **10 warnings**: one
  TanStack compiler warning and the same nine P14 unused-import warnings.
- `pnpm build` passed: compilation in 5.1s, TypeScript in 9.1s and all 17 routes generated.
- Exact five-path `oxfmt --check` and ESLint passed cleanly. `git diff --check` passed before
  staging and for the exact staged product/test diff.
- Before the final viewport correction, the same focused, import, full-unit, typecheck, lint and
  build gates were also green. They were rerun afterward rather than reused.

## Installed-CLI manual charter

- Used only the installed headless `playwright-cli`, unique session `p15-impl-02`, against the
  root-owned keyed build server. A fresh identity was generated and confirmed while its recovery
  phrase remained masked; no recovery word was revealed, read, copied or recorded.
- XML OFX reached preview through the picker and both target surfaces. Both surface observations
  reported `OFX • 2 rows`; Cancel returned to the exact source and left zero transactions/history.
- Obvious JSON renamed as CSV was rejected before preview through the picker and both surfaces. Both
  surface alerts restored their prior picker/Search focus and stayed on the source route.
- At 390x844 and 200% document zoom:
    - Imports/light guidance and alert were contained in the visible target; alert contrast was
      **10.03:1**.
    - Transactions/dark guidance and alert were contained in the visible target; alert contrast was
      **16.17:1**.
    - Both overlays had `pointer-events: none`; with reduced motion, transition duration was `0s`.
- The original six invalid cases—multiple, empty, over 10 MiB, HTML spoof, unsupported PDF and
  image-MIME CSV—each produced its specific actionable Imports alert, restored focus and stayed on
  `/imports`. Balanced nested child transitions retained one overlay; outer leave and global dragend
  each cleared it.
- Mixed-case CSV drop/cancel created zero transactions, stored no filename/content/pending key, Back
  did not replay the staged file, and same-file retry returned to `CSV • 3 rows`. Complete SGML OFX
  and QFX files each reached `OFX • 2 rows`, then cancelled with no history entry.
- Explicitly confirming `p15-manual-60.csv` created exactly 60 transactions while the virtualizer
  mounted 18. For the exact F-05 sequence, the overlay count was one before scrolling, row 0000
  unmounted at scrollTop 1921, and outer-target leave cleared the overlay to zero without dragend.
- Reload retained 60 with 18 mounted. Editing the first amount to 1.50 retained the accessible P14
  original `USD 1.00` description/tooltip. Imports history reported the filename and count 60. A
  filtered virtual-row follow-up drop was cancelled and preserved 60.
- Local/session storage contained none of the synthetic filename, description or
  `pendingImportFile`. Successful `sync.pushOps` request 460 returned 200; a body sanitizer emitted
  only booleans: `encryptedData=1`, `versionVector=1`, and filename/description/CSV/pending-key
  leaks all `0`.
- Final semantic reload retained 60 with 18 mounted, reported zero non-local resources and no
  plaintext storage leak. CLI console inspection reported **0 errors / 0 warnings**; the request
  history sanitizer reported **0 HTTP/request failures**.
- Excluded probes are recorded exactly:
    1. A root-navigation result expression used unavailable `URL` after successfully reaching
       `/new-user`.
    2. The post-create probe assumed `/transactions` and timed out after the correct `/settings`
       navigation.
    3. The first XML keyboard-chooser flow completed its semantic cancel, but the CLI modal tracker
       remained active and was cleared by uploading harmless `package.json`.
    4. A separate probe treated the Imports chooser button as navigation; it correctly opened the
       chooser and was excluded/cleared.
    5. Three direct picker-payload attempts failed immediately because CLI run-code exposed neither
       `Buffer` nor `TextEncoder`, and Playwright rejected `Uint8Array` where it required Buffer.
       Actual browser `File`/`DataTransfer` change was used instead.
    6. A preservation script completed its actions but its final stale Transactions-toolbar read
       after navigating to Imports timed out; every resulting state was independently rechecked.
    7. The first request-body `awk` sanitizer had a syntax error and emitted no body; the corrected
       command emitted booleans only.
    8. The first final resource sanitizer referenced browser `location` outside page context after
       reload; the corrected in-page calculation passed. None is positive evidence or an application
       finding, and no arbitrary wait was credited.
- The CLI browser was closed. `delete-data` found no remaining user data, and `playwright-cli list`
  reported `(no browsers)`. Root stopped the server, verified port 3000 clear, restored
  `next-env.d.ts`, and moved only this run's `.next`, `test-results` and five new CLI YAML artifacts
  to recoverable trash while preserving 13 older unrelated CLI YAML files.

## Questions and risks

- No material ambiguity remained and no `Q-PROPOSAL-P15-02-*` is required.
- CSV recognition intentionally remains bounded to the first 8 KiB. If that slice can end inside a
  record, the potentially partial final parsed row is excluded from the consistency decision.
- Programmatic drag events cannot reliably establish the browser's final displayed `dropEffect`; the
  existing component test remains the deterministic owner for honest single/multiple effects.
- The viewport correction uses standard layout/visual-viewport measurements and `scrollIntoView`; no
  custom wheel, focus or selection interception was introduced.

## Boundary and cleanup

- Exact revision-02 product/test commit and proposed review HEAD:
  `91931688ef9463576b757a097968af543a4b8a75` (`Close import drop review findings`).
- Exact revision-02 delta:
  `6751860ba4d1501404b35bca27d0711b93424eb6..91931688ef9463576b757a097968af543a4b8a75`. It contains
  exactly the five authorized product/test paths and no others.
- Exact cumulative reviewer range:
  `b3e96ba9e9487d13df56956d220fffca63d6482d..91931688ef9463576b757a097968af543a4b8a75`.
- The product/test commit index is clean. The sole worker worktree path is this uncommitted evidence
  artifact. The immutable `reviews/P15-review-01.md` was not edited, and `reviews/P15-review-02.md`
  remains absent.
- Frozen scratch, FS-001 and SCOPE sources were not edited or re-derived. No checkbox was changed.
- This is implementer evidence only. It does not claim independent review or PASS; HS-013 remains
  unchecked pending a distinct reviewer over the exact cumulative range.
