# P14 Independent Review — Revision 04

## Review identity and verdict

- Package / requirement / revision: `P14` / `HS-008` / `04`.
- Literal cumulative reviewed range:
  `b9105028926d24a5a0c5454777a6c33379ca606a..305d6613673cf200d456276c076463b68c075500`.
- Revision-04 delta:
  `8fc2163b6a44cb01775d4134f702b98f4ff9a680..305d6613673cf200d456276c076463b68c075500`.
- Frozen implementation evidence: `evidence/P14/implementation-04.md`, SHA-256
  `c68488162a547ca369a8cd7734b40dccc95140407ec9c931efdb6b8e4b7521d3`, 184 lines / 13,865 bytes.
- Immutable prior review that assigned the revision: `reviews/P14-review-03.md`, SHA-256
  `e5df38ff0486c5f65d8f734e7dcdd87522ea169667f477d1bdaac6f1f1b57af8`, 201 lines / 16,049 bytes.
- The revision-04 delta is exactly two authorized paths, 285 insertions and 2 deletions. The
  cumulative range is 33 paths, 2,819 insertions and 179 deletions, including prior authorized P14
  implementation/tests and root-owned control commits. `git diff --check` passes.
- **Verdict: PASS.** Revision 04 closes F-03 with a component-local, collision-aware placement
  correction and deterministic zoomed virtual-grid browser coverage. Independent static analysis,
  automation and installed-app observation establish the complete HS-008 immutable-origin, identity,
  deletion/history, encrypted persistence, peer convergence and accessible-tooltip behavior. No
  material finding or open question remains.

## Closed finding

### F-03 — Closed: complete origin tooltip remains inside the zoomed virtual viewport

`InlineEditableAmount` retains the established Radix tooltip, localized origin text, input
`aria-description`, start alignment and wrapped content. Its new local open/translation state does
not touch schema, mutation, history, import, sync or cryptography behavior. While open,
`keepTooltipInsideViewport()` unions content and arrow rectangles, applies an eight-pixel collision
margin against `visualViewport` or the inner-viewport fallback, and converts visual-pixel
corrections through the rendered/offset scale needed under document zoom.

The layout effect covers late portal placement and nested/virtualized motion with an open-only
animation-frame monitor, content `ResizeObserver`, capture-phase document scroll, window resize and
visual-viewport resize/scroll listeners. Cleanup cancels the current frame, disconnects the observer
and removes every listener. Translation converges geometrically; changes below 0.5 pixels do not
update state, and a settled frame performs only the layout read. Twelve consecutive settled frames
were pixel-identical, and ten alternating focus/hover open-close cycles each mounted exactly one
accessible tooltip then detached it. I found no oscillation, accumulating observer/listener, reopen
residue or material idle cost.

The checked-in browser journey is behavior-led rather than a synthetic positioning test. It creates
an ordinary 14-row import, edits three separated rows, applies the exact 390 × 844 viewport, 200%
document zoom, dark preference and reduced motion, and exercises pointer hover and keyboard focus at
first, lower-visible and horizontally offset virtualized positions. It polls until complete content,
every direct rendered-text rectangle and the arrow are contained, then performs a second hard
containment assertion. There are no arbitrary waits.

Independent installed-app reproduction passed all six position/interaction samples. Representative
settled bounds were:

- first focus: content x=29.654..371.784 / y=698.973..783.072, arrow x=310.040..337.960 /
  y=754.483..782.402;
- lower hover: content x=29.671..371.781 / y=715.276..799.370, arrow x=310.042..337.958 /
  y=770.791..798.708;
- lower focus: content x=16..374 / y=696.279..784.279, with the translated lower trigger still fully
  visible;
- right-offset focus: content x=19.858..377.858 / y=710.910..798.910, arrow x=353.716..382 /
  y=780.768..809.053.

The tightest settled margin was exactly eight pixels. First-position behavior required no local
translation; lower and right-offset behavior received the expected correction. Every textbox
retained the exact currency-specific accessible name and localized nonbreaking-space description for
USD `1.00`, `11.00` and `6.00`; the inner accessible role was `tooltip` with the complete origin
name. An unedited imported row exposed neither tooltip nor origin description. Tooltip colors
`lab(100 0 0)` on `lab(1.76974 1.32743 -9.28855)` measured 20.157:1 WCAG contrast. F-03 is closed.

## Cumulative acceptance observations

- **F-02 remains closed.** The active public-identity projection counts the nested duplicate
  independently of its parent and deduplicates only logical representations. Ordinary identical
  parent/nested imports and an unrelated import each displayed count one. The nested destructive
  dialog reported one linked transaction and one action; confirm removed only the nested identity,
  record and duplicate marker. One Undo restored exactly that set, and one Redo removed it again
  while the parent, unrelated import and manual transaction identities remained exactly once.
- **F-01 remains closed.** An ordinary four-row import captured immutable positive, negative and
  zero origins as USD `2.50`, `-USD 1.25` and USD `0.00`; repeated edits and reload did not replace
  them. The untouched independently deleted row had no origin. The target import reported three live
  identities; delete, Undo and Redo affected exactly that set and its import record while designated
  survivors remained.
- `originalAmount` remains optional across parent/nested schema, duplication, movement, maintenance
  and query boundaries. The central amount mutation captures it only on the first real edit of an
  imported transaction and prevents caller replacement of lineage, origin and creation identity.
- Import deletion still scans parent and nested physical representations, deterministically rehomes
  unrelated nested rows, removes aliases and the import record in the same history action, and
  prunes empty buckets. Projection and mutation semantics agree.
- An ordinary BTC import/edit retained all eight decimal places and exposed exact
  `Original imported amount: BTC 0.12345678`; the account was then restored through the ordinary UI
  to its USD vault default before scale/convergence checks.
- Large encrypted updates retain bounded base64 conversion. Successful request-body inspection was
  boolean-only and found the expected encrypted envelope/version fields without sampled plaintext
  descriptions or filename. No recovery phrase, secret, compatibility dual-write, arbitrary retry
  mask or unrelated product change was found.

## Independent automation

| Gate                                                                      | Independent result                                                                                    |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Revision-04 F-03 import E2E, Chromium, no retry, repeat three, one worker | PASS; 3/3 in 26.0 s (11.1 s, 4.6 s and 4.9 s).                                                        |
| Retained F-02 import E2E, Chromium, no retry, repeat three, one worker    | PASS; 3/3 in 27.5 s (9.8 s, 7.1 s and 7.1 s).                                                         |
| Retained F-01 import E2E, Chromium, no retry                              | PASS; 1/1 in 12.2 s (9.6 s test).                                                                     |
| Focused Vitest profile for P14 transaction/import/sync behavior           | PASS in three clean processes; 5 files / 120 tests each, in 4.28 s, 4.32 s and 4.30 s.                |
| Broader owner profile                                                     | PASS; 12 files / 197 tests in 16.02 s.                                                                |
| `pnpm test`                                                               | PASS; 60 files / 1,298 tests in 6.12 s.                                                               |
| `pnpm typecheck`                                                          | PASS.                                                                                                 |
| `pnpm lint`                                                               | PASS exit 0; 0 errors / 10 warnings (one TanStack warning and nine inherited unused-symbol warnings). |
| `pnpm build`                                                              | PASS; Next 16.2.10 compiled, generated types and built all 17 routes.                                 |
| Cumulative changed-path `oxfmt --check`                                   | PASS; all 25 changed TypeScript/TSX paths.                                                            |
| Cumulative changed-path ESLint                                            | PASS; 0 errors / 9 inherited warnings.                                                                |
| Revision-04 two product/test paths plus frozen evidence formatting        | PASS.                                                                                                 |
| `git diff --check BASE..HEAD`                                             | PASS.                                                                                                 |
| Six-file affected E2E matrix, Chromium, no retry, `--workers=1`           | PASS; 62/62 in 4.6 minutes.                                                                           |
| Full Chromium E2E, no retry, `--workers=1`                                | PASS; 95/95 in 6.3 minutes.                                                                           |

Expected authentication, deliberate-offline and presence logs appeared only in their corresponding
tests. Repository `pnpm format:check` exits 1 on exactly the inherited 14 Markdown paths recorded in
the frozen evidence: six root ledgers, four P12 implementation artifacts, immutable P14
implementation-01, two P12 reviews and frozen `specs/human-scratch.md`. Revision-04 evidence and
both revision-04 product/test paths pass exact-path formatting. No P14 product/test path fails
formatting.

## Installed-CLI manual charter

- Used only installed headless `playwright-cli` with unique disposable session `p14-review-04`
  against the correctly keyed isolated server. No MCP browser, `npx`, headed/debug/pause mode,
  temporary test or temporary config was used.
- Created fresh authentication through the ordinary generate/confirm flow. All twelve recovery words
  stayed masked; the phrase was never revealed, read, copied, entered or printed.
- Performed the exact six-sample F-03 geometry, accessibility, contrast, stability and lifecycle
  observations described above through ordinary import/edit and real hover/focus interactions.
- Reperformed nested-import count/delete/Undo/Redo isolation and top-level signed/zero immutable
  origin/delete/Undo/Redo behavior through ordinary UI operations, retaining exact transaction IDs
  and import-record counts for each survivor/removal assertion.
- Imported an in-browser generated 1,000-row CSV through the ordinary UI. The app reached **1,018
  transactions in 1.689 seconds** while mounting only **18 rows** at 1280 × 900. A cold reload
  completed in **2.093 seconds**, retained 1,018 and 18 mounted rows, and exact final-description
  filtering returned one `P14 R4 large 0999` row with `1000.00` and no origin.
- The corresponding successful `sync.pushOps` response was HTTP 200. Its 256,925-byte request body
  contained `encryptedData` and `versionVector`; neither first/last sampled plaintext description
  nor `p14-r4-large.csv` appeared.
- A normally opened authenticated duplicate tab loaded all 1,018 transactions. Both tabs initially
  showed the unedited first large row as `1.00` with no origin. While deliberately offline, the
  primary edited it to `2`, captured exact `Original imported amount: USD 1.00`, and showed the
  expected `Sync error`; the peer still showed `1.00`. Reconnection reached Saved and the peer
  converged without reload to `2.00` with the same exact origin. A later check confirmed the peer
  remained Saved with that value and origin.
- A fresh online reload retained `2.00`, its exact origin, 1,018 total and 18 mounted rows. Event
  listeners observed zero new console errors, page errors, failed requests, HTTP error responses or
  non-local requests. Deliberate offline fetch errors were confined to the explicit offline
  interval.
- One initial scale persistence harness waited for `1 transaction` although the UI truthfully
  rendered `1 transaction (filtered)`; the correct row and `1000.00` were visible and were then
  credited by an exact assertion. A later reload harness expected search state to survive reload;
  the app correctly reset the filter and showed all 1,018. Neither harness mismatch is a product
  red, and no raced/intermediate result is credited.
- The duplicate was closed, session data was deleted, and the final installed-CLI listing reported
  no browser sessions.

## Boundary, frozen sources and questions

- Frozen human scratch remains SHA-256
  `b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`, 350 lines / 24,248 bytes, with
  HS-008 unchecked at review time.
- Canonical FS-001 source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes. Its normalized 21 exact rolling checksum remains unchanged.
- Prior P14 evidence/reviews were independently reverified byte-for-byte:
    - implementation-01 `7e4c4a5052799c9c556771987c95a4ac16ecdf7580225350f4178d84819ca4df`, 220
      lines / 14,875 bytes;
    - implementation-02 `e7d8f6a09e12a7ceab462fa908e34a51914d4ac5507655192428574e9e0bed1f`, 156
      lines / 11,793 bytes;
    - implementation-03 `c07a417ba39a58801e7d411adcd4c87c47614e526d6c35aa1e456a306e85eb8d`, 159
      lines / 11,901 bytes;
    - review-01 `92bbcf462e6cceb973adb9525402cc357ed37706d67752169506ae286e1b621f`, 171 lines /
      13,684 bytes;
    - review-02 `e6c4d2fdbd4ce5b2c5d6db75f6451a19d0a1901bb769640a1933e9fa9fdab7c4`, 191 lines /
      14,936 bytes;
    - review-03 `e5df38ff0486c5f65d8f734e7dcdd87522ea169667f477d1bdaac6f1f1b57af8`, 201 lines /
      16,049 bytes.
- Before this artifact, HEAD was exactly `305d6613673cf200d456276c076463b68c075500`, the index was
  empty, and worktree dirt was exactly root-owned modified `HANDOFF.md` / `PROGRESS.md` plus frozen
  untracked implementation-04 evidence. This review is the sole reviewer-created repository
  artifact.
- Root stopped the keyed server and confirmed its port clear, restored `next-env.d.ts`, and
  recoverably moved only review-generated `.next`, `test-results` and the exact 21 new CLI
  artifacts. The older July 24 16:36–16:38 CLI artifacts were preserved and no new CLI files remain.
- No product, test, source marker, ledger, evidence, configuration or prior-review file was edited
  or committed. No `Q-*` proposal is needed: F-03's required containment is explicit and now
  independently verified.

## Single final verdict

**PASS.** P14 revision 04 closes the only remaining finding. The exact cumulative range satisfies
HS-008: imported identities retain immutable, currency-exact first origins; accessible hover/focus
tooltips remain complete and contained under the required narrow 200% zoomed virtual-grid
conditions; nested and top-level import deletion is identity-exact and one-action reversible; and
large encrypted state persists and converges across ordinary authenticated peers. Root may preserve
this immutable review, integrate the approved exact range and check only HS-008 under the process
gates.
