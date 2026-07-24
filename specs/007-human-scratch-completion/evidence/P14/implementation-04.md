# P14 Implementation Evidence — Revision 04

## Immutable dispatch boundary

- Package / requirement / revision: `P14` / `HS-008` / `04`.
- Literal cumulative review BASE: `b9105028926d24a5a0c5454777a6c33379ca606a`.
- Exact revision-04 preimplementation HEAD: `8fc2163b6a44cb01775d4134f702b98f4ff9a680`.
- Immutable revision-03 FAIL: `reviews/P14-review-03.md`, SHA-256
  `e5df38ff0486c5f65d8f734e7dcdd87522ea169667f477d1bdaac6f1f1b57af8`, 201 lines / 16,049 bytes.
- This sole revision-04 worker artifact was created before any revision-04 product or test edit.
  Existing dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; the index was empty.
- The future reviewer artifact `reviews/P14-review-04.md` did not exist and was not created.

## F-03 red-to-green geometry

- Before touching production code, I added the checked-in ordinary-import browser journey
  `original amount tooltip stays inside the zoomed virtualized viewport`. It imports 14 USD rows,
  edits rows 00/05/10, uses 390x844, `documentElement.style.zoom = "2"`, dark mode and reduced
  motion, then checks first-row control, lower visible row and horizontally offset virtual row by
  real pointer hover and keyboard focus. Every complete content, direct rendered-text and arrow box
  must remain within `window.innerWidth`/`innerHeight`; exact localized text and the input
  `aria-description` must remain present.
- On unchanged revision-03 production code, the final credited red command
  `pnpm exec playwright test tests/e2e/import.spec.ts --grep "original amount tooltip stays inside" --project=chromium --workers=1 --retries=0 --reporter=list`
  failed **1/1** in 8.99s (5.2s test). Both first-row control interactions were contained, proving
  position dependence. The lower-row hover content was x=16.2..356.3/y=1219.4..1303 with arrow
  bottom 1312.635; focus was x=4.1757..357.5618/y=1203.516..1290.382 with arrow bottom 1300.393. The
  right-offset hover content was x=92..432.1/y=960.4..1044 with arrow right 436.035; focus was
  x=92..442.4075/y=948.653..1034.787 with arrow right 446.462. The viewport was x=0..390/y=0..844
  and the exact accessible origins remained intact.
- After the component-local placement fix, that exact command passed **1/1** in 8.5s (5.6s test).
  The exact journey repeated three times in one no-retry, one-worker run and passed **3/3** in 18.3s
  (5.4s, 4.5s and 4.5s tests). There are no arbitrary waits: Playwright polling observes the actual
  complete geometry until collision correction settles, then a second hard containment assertion
  records any residual box.

## Implementation and acceptance mapping

- `InlineEditableAmount` keeps the established shadcn/Radix tooltip, input description, localized
  text, start alignment and wrapped visual content. It controls only open state and resets a local
  translation for each opening; no shared primitive, schema, mutation, import, history, sync or
  cryptography code changed.
- While the tooltip is open, `keepTooltipInsideViewport()` unions the content and Radix arrow
  rectangles, compares all four edges with the actual `visualViewport` (or inner-viewport fallback)
  at an 8px collision padding, and converts the visual-pixel correction into the tooltip's local CSS
  coordinate scale. This conversion is necessary under document zoom.
- A layout effect observes late portal placement and virtualized/nested-scroll movement through an
  open-only animation-frame monitor, a content `ResizeObserver`, capture-phase scroll, window resize
  and `visualViewport` resize/scroll. Cleanup cancels the frame and removes every observer/listener.
  Radix `collisionPadding` remains enabled as the first positioning layer; the local translation
  corrects the zoom/nested-scroll cases Radix left outside the visual viewport.
- The implementation does not hide the visual tooltip, substitute an aria-only assertion, disable
  zoom or virtualization, or alter hover/focus semantics. The accessible textbox name remains
  currency-specific and its description continues to expose the immutable localized origin.
- Browser layout owns the behavior meaningfully, so no synthetic unit test was added. The new
  behavior-led Chromium journey owns actual portal, arrow, zoom, nested scroll, virtualization,
  focus and pointer geometry.
- Revision-01/02/03 cumulative lineage, immutable first-origin, 0/2/3/8-decimal formatting,
  nested-import identity count/deletion, one-action history, large encrypted persistence and peer
  convergence paths are unchanged.

## Automated validation

- Retained F-02:
  `pnpm exec playwright test tests/e2e/import.spec.ts --grep "nested duplicate import count matches its reversible exact deletion" --project=chromium --workers=1 --retries=0 --repeat-each=3 --reporter=list`
  passed **3/3** in 27.2s (9.3s, 7.0s and 7.0s tests).
- Retained F-01:
  `pnpm exec playwright test tests/e2e/import.spec.ts --grep "CSV and OFX lineage survives edits/reload and delete is isolated one-step history" --project=chromium --workers=1 --retries=0 --reporter=list`
  passed **1/1** in 11.7s (8.9s test).
- The focused cumulative profile
  `pnpm exec vitest run tests/unit/crdt/hierarchical-schema.test.ts tests/unit/crdt/transaction-mutations.test.ts tests/unit/crdt/transaction-queries.test.ts tests/integration/transaction-operations.test.ts tests/unit/sync/manager.test.ts --pool=forks --maxWorkers=1`
  passed **5 files / 120 tests** in each of three clean processes: 4.30s, 4.28s and 4.30s.
- The 12-file cumulative P14 owner profile passed **12 files / 197 tests** in 16.32s. `pnpm test`
  passed **60 files / 1,298 tests** in 6.39s.
- `pnpm typecheck` passed. `pnpm lint` exited zero with **0 errors / 10 inherited warnings**: the
  established TanStack Virtual compiler warning and nine unused-symbol warnings. Exact two-path
  scoped ESLint passed without output; cumulative changed-path ESLint exited zero with **0 errors /
  9 inherited warnings**.
- `pnpm build` passed compilation, TypeScript, page data and all **17 routes**.
- Exact two-path `oxfmt --check` passed. Cumulative changed-path `oxfmt --check` passed all **25
  TypeScript/TSX paths**. `git diff --check` passed on the worktree, exact staged product/test diff
  and committed range.
- The six-file affected Chromium matrix (`import`, `transactions`, `undo-redo`, `sync-persistence`,
  `description-aliases`, `tab-duplication`) with one worker and retries zero passed **62/62 in 4.6
  minutes**.
- Full Chromium E2E with one worker and retries zero passed **95/95 in 6.3 minutes**. Expected
  authentication/offline fetch and presence logs occurred only in their explicit scenarios; no test
  failed or retried.
- After formatting this artifact, repository `pnpm format:check` truthfully exited 1 on the same
  **14 inherited Markdown paths**: six root ledgers, four P12 implementation artifacts, immutable
  P14 implementation-01, two P12 reviews and frozen `specs/human-scratch.md`. This revision-04
  artifact was absent from the failure list and passes its exact-path `oxfmt --check`. Immutable
  revision-01 evidence remains the fourteenth failure identified by its independent review and was
  not edited.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli` with unique disposable session
  `p14-rev04` against the root-owned keyed server. Onboarding used the ordinary generate/confirm
  flow without activating the recovery reveal control and without reading, copying or printing any
  recovery word.
- Through an ordinary 14-row import and amount edits, recaptured exact F-03 conditions: 390x844,
  200% document zoom, dark and reduced motion. Complete content, both direct rendered text lines and
  arrow were programmatically contained for all six first/lower/right-offset hover/focus samples:
    - first hover content x=31.4..371.5/y=701.4..785, arrow x=310.565..337.435/y=767.765..794.635;
    - first focus content x=19.998..373.351/y=685.555..772.413, arrow
      x=310.041..337.959/y=754.506..782.424;
    - lower hover content x=29.677..371.78/y=715.284..799.377, arrow
      x=310.486..337.514/y=782.04..809.068;
    - lower focus content x=17.158..373.812/y=697.888..785.557, arrow
      x=309.911..338.089/y=767.483..795.661;
    - right-offset hover content x=35.121..377.224/y=729.028..813.12, arrow
      x=354.154..381.182/y=795.784..822.812;
    - right-offset focus content x=27.45..377.858/y=719.563..805.697, arrow
      x=354.228..381.912/y=787.939..815.624.
- The tightest margins were 8.088px at the right edge and 21.188px at the bottom. Every visible text
  rectangle was also contained. The inputs resolved as textboxes named `Transaction amount in USD`;
  exact descriptions/text were localized `USD 1.00`, `USD 11.00` and `USD 6.00` (including the
  formatter's nonbreaking separator). The Radix accessible tooltip role exposed the complete origin.
  Wrapped full tooltip text remained visible. Computed colors `lab(100 0 0)` on
  `lab(1.76974 1.32743 -9.28855)` measured **20.17:1** contrast.
- Ordinary identical parent/nested imports and an unrelated import each displayed current count `1`;
  the parent exposed `Potential duplicate`; and the destructive dialog said one transaction. Confirm
  removed only the nested identity/record and marker. Parent, unrelated import and manual IDs
  remained once. One Undo restored exactly the marker, nested record and count one; one Redo removed
  them again while all survivors remained.
- Imported a real generated 1,000-row CSV through the ordinary UI in 4.963s. The app showed **1,017
  transactions**, mounted only **18 rows** at 1280x900, reloaded to the same total, and exact
  final-description filtering returned one row with `1000.00`.
- Boolean-only inspection of a successful sync request body found `encryptedData` and
  `versionVector`; neither sampled first/last plaintext description nor filename appeared.
- A normally opened authenticated duplicate tab loaded the large import. During deliberate offline
  operation the primary edited its first imported row and showed the expected `Sync error`, while
  retaining exact origin `USD 1.00`. Reconnection reached Saved and converged primary `4` /
  duplicate `4.00` with the same origin in both tabs. A subsequent online edit converged `5` /
  `5.00`; its successful encrypted request again contained neither sampled plaintext nor filename.
- Final reload showed **1,017 transactions**, Saved, 18 mounted rows and **0 new console errors / 0
  warnings**. Deliberate offline fetch errors were confined to the offline interval. The duplicate
  was closed and `delete-data` ended the disposable browser; a close/list probe confirmed the
  session was no longer open.
- One initial manual evidence-harness poll compared a literal ASCII space with the localized
  nonbreaking currency separator and timed out. Inspection showed the fully contained tooltip; the
  harness was corrected to normalize whitespace without a product change. It is not a product red
  and none of its data is credited over the subsequent deterministic six-sample capture.

## Questions and risks

- No Q proposal is required. F-03 was an independently reproduced component-local placement defect
  with an explicit viewport-containment outcome.
- The frame monitor reads layout only while an origin tooltip is open and cancels immediately when
  it closes. This intentionally covers late Radix portal transforms and continuing virtual/nested
  scroll movement that one-shot correction and resize/scroll events did not reliably cover.
- The correction assumes the content's rendered-to-offset width/height ratios represent its local
  CSS scale. Chromium browser coverage exercises the required document zoom and all three positions;
  the visual-viewport fallback remains standard for browsers without `visualViewport`.

## Boundary and cleanup

- Product/test commit: `305d6613673cf200d456276c076463b68c075500`
  (`Keep amount tooltips within viewport`). Literal cumulative review HEAD is that exact commit;
  original cumulative BASE remains `b9105028926d24a5a0c5454777a6c33379ca606a`.
- Revision-04 product/test delta is exactly:
  `src/components/features/transactions/cells/InlineEditableAmount.tsx` and
  `tests/e2e/import.spec.ts`, **285 insertions / 2 deletions**. No optional unit path or shared
  tooltip primitive was changed.
- The index is empty. This evidence remains intentionally uncommitted. Root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md` were preserved and never staged. All prior implementation/review
  artifacts remain byte-for-byte untouched; `reviews/P14-review-04.md` remains absent.
- Root stopped keyed server session 23841 and confirmed its port clear, restored generated
  `next-env.d.ts`, and recoverably moved only revision-04 `.next`, prior automation `test-results`
  and the exact three revision-04 CLI files while preserving older CLI artifacts.
- Final index is empty and the exact worktree is root-owned modified `HANDOFF.md` / `PROGRESS.md`
  plus this assigned uncommitted evidence file. `git diff --check` passes. Frozen boundary remains:
    - scratch `b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`, 350 lines / 24,248
      bytes;
    - FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
      bytes;
    - SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines / 27,382
      bytes.
- Scratch checked set remains HS-001/HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018. HS-008
  was not edited or checked. All 21 normalized scope blocks, both frozen sources, SCOPE and every
  prior evidence/review artifact remain untouched. Revision-01/02/03 evidence and review hashes
  independently reverified exactly as dispatched, including revision-03 review at 201 lines / 16,049
  bytes.
