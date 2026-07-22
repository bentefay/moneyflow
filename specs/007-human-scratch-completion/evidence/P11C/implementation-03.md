# P11C Implementation Evidence — Revision 03

## Immutable dispatch boundary

- Package/scope/revision: `P11C` / `HS-004` integrated behavior and performance checkpoint / `03`.
- Original cumulative BASE: `0426866fa66cc022efca6d74cd5088d586d3d11b`.
- Clean revision-03 pre-implementation HEAD: `2540969134f002330ad505836bdd92d01eb56308`.
- Revision-03 implementation commit: `daab038ee741faa9f92a373b27efe0c8fe8940db`
  (`Observe description aliases across provider lifetime`).
- Immutable review range:
  `0426866fa66cc022efca6d74cd5088d586d3d11b..daab038ee741faa9f92a373b27efe0c8fe8940db`.
- Immutable failed reviews: `reviews/P11C-review-01.md` and `reviews/P11C-review-02.md`; revision 03
  closes only F-01.
- Sole writable evidence artifact:
  `specs/007-human-scratch-completion/evidence/P11C/implementation-03.md`, created before product or
  test edits and intentionally left uncommitted.
- Initial index and untracked set were empty. Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md`.
- Prior implementation/evidence/review artifacts, root ledgers, frozen sources, SCOPE, configuration
  and unrelated product/tests remain immutable.

## Implementation plan

1. Add red actual-provider regressions for local and remote alias mutations across a zero-consumer
   gap, an alias event at the render/getSnapshot-to-subscribe boundary, and provider/document
   teardown observer counts.
2. Bind semantic alias observation to the provider/document lifetime, not hook consumer count, with
   explicit disposal and no cache interval whose governing events were unobserved.
3. Retain the revision-02 exact 0/0/0 non-alias and 1/1/1 alias lifecycle matrix, first-empty
   insertion, raw boundary, legal lookup and history behavior.
4. Re-run cumulative automation, fresh browser repeats and the exact installed-CLI two-tab SPA gap
   sequence; clean all task state, commit exact authorized product/test paths and complete this
   evidence without a PASS claim.

## Status

Revision-03 implementation and worker validation are complete and ready for independent review. This
worker makes no PASS claim.

## F-01 counterexamples

- Before the product change, the expanded actual-provider lifecycle file ran five tests: the two
  retained tests passed and all three new lifecycle tests failed.
- In the zero-consumer test, aliases cached before every alias hook unmounted remained stale after a
  local alias rename in the gap: the remount still exposed the old `Café`/`Alias 0`…`Alias 499`
  collection and omitted exact ID `real-00042` for `Local During Gap`.
- In the setup-race test, an alias rename issued by an earlier sibling layout effect after the
  consumer render but before its subscription remained `Before Setup Race`; the current exact
  `setup-race` result never published.
- In observer accounting, removing the only alias consumer released the task observer immediately:
  counts changed from two active subscriptions to one active/one released, rather than retaining the
  provider-lifetime observer.
- These failures directly reproduce review-02 F-01. No timeout, retry or assertion was weakened.

## Product implementation

- `VaultProvider` now starts one semantic alias observer in a layout effect for each
  provider/document lifetime. React hook subscription churn only adds or removes revision listeners
  and never tears down document observation.
- Document replacement or provider unmount invokes the exact observer disposer. Render remains
  side-effect free: an aborted render cannot install a document subscription.
- The store records the latest observed document frontiers. `getAliases()` records the frontier of
  the legal collection it converts and caches.
- After installing the observer, `start()` compares the last observed frontier with the current
  frontier using Loro's operation diff. It advances the alias revision only when an affected
  container resolves to top-level `descriptionAliases`. This closes the render/getSnapshot-to-
  subscription interval without converting or rescanning for transaction-only changes.
- Normal observed events retain the revision-02 semantic event-path filter. Non-alias local and
  imported changes therefore do not invalidate the legal alias collection; alias changes notify once
  and publish the current legal collection.
- Existing legal conversion, canonical lookup, raw-wire isolation, history and interaction logic is
  unchanged.

## Actual-context lifecycle and observer measurements

- The zero-consumer regression seeds the same large legal graph: 500 real aliases plus 500 declared
  one-hop symlinks. It mounts the real `VaultProvider`, action hooks, alias collection and lookup,
  then repeatedly removes every alias consumer without replacing the provider/document.
- Three local transaction-note changes plus a peer-exported transaction insertion during the gap
  cause zero conversions, lookup builds or dependent-option builds. On remount, the legal collection
  is the exact same object; only the newly mounted lookup/options each build once.
- A local alias rename while no consumer exists does no eager conversion/build work. The remount's
  first committed state contains the new canonical exact result and performs exactly one conversion,
  one lookup build and one dependent-option build.
- A subscribed remote alias insertion during a second zero-consumer interval has the same result: no
  consumer work in the gap, then one current legal collection/lookup/options build on remount.
- The setup-boundary regression places an alias mutation in an earlier sibling layout effect. The
  initial snapshot plus exactly one reconciled mutation produce totals of two conversions, two
  lookup builds and two dependent-option builds; the final committed output is `During Setup Race`
  with exact ID `setup-race`.
- Observer accounting includes the inherited Mirror subscription and the new task subscription.
  Initial counts are two active/two subscribed/zero released. Four consumer unmount/remount changes
  leave those counts unchanged. Replacing the document releases exactly the old task observer and
  starts exactly one on the new document; provider unmount releases the new one. A late alias import
  after disposal invokes the released task callback zero times and causes 0/0/0 lifecycle work.

## Retained acceptance and regression gates

- The revised lifecycle file passes all five tests, including the retained empty-provider first
  insertion and large continuously-mounted local/remote/Undo/Redo matrix.
- The cumulative focused P11C set passed in three separate processes: six files and 25 tests in each
  process.
- Description-alias E2E with `--workers=1 --retries=0 --repeat-each=3`: 15/15 in 2.1 minutes.
- Large virtualized-transaction E2E with `--workers=1 --retries=0 --repeat-each=3`: 3/3 in 1.3
  minutes.
- Full E2E with `--workers=1 --retries=0`: 87/87 in 5.4 minutes, including T014a and T021c. Only the
  suites' expected intentional authentication, offline and realtime diagnostics were emitted; no
  retry masked a result.

## Automation

| Command / gate                                                     | Result                                                                                                                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final lifecycle regression                                         | 1 file / 5 tests passed.                                                                                                                                   |
| Final focused P11C set, three separate processes                   | 6 files / 25 tests passed in every process.                                                                                                                |
| `pnpm typecheck`                                                   | Passed.                                                                                                                                                    |
| `pnpm test`                                                        | 58 files / 1,237 tests passed.                                                                                                                             |
| `pnpm lint`                                                        | Exit 0, zero errors and the same 10 inherited warnings: TanStack incompatible-library warning, two unused query types and seven unused test imports/types. |
| `pnpm build`                                                       | Compiled, typechecked and generated all 17 routes.                                                                                                         |
| Scoped `oxfmt --check` over the two revision-03 product/test paths | Passed.                                                                                                                                                    |
| `git diff --check` over the two revision-03 product/test paths     | Passed.                                                                                                                                                    |
| Full `pnpm format:check` after evidence formatting                 | Expected inherited red only in the seven disclosed root ledger/scratch files; product, test and this evidence are clean.                                   |

## Repository CLI manual charter

- Used only repository-installed `pnpm browser` with disposable session `p11c-r03`, the real Next
  application and local Supabase/realtime stack. The local realtime secret remained in the server
  environment; no secret or recovery phrase was printed, revealed or copied.
- Created 101 aliases through the rendered management controls in 8,650 ms and imported 500
  deterministic CSV transactions through the real upload, Columns auto-detection, account/default
  and Import controls.
- Exact two-tab review-02 sequence: Tab A rendered alias `After Gap`, navigated through the sidebar
  to Accounts so every alias consumer unmounted, and retained the provider/document. Tab B renamed
  the alias to `During Gap` and both tabs reached Saved. Without reload, Tab A navigated back
  through the sidebar. A pre-navigation `MutationObserver` recorded the first committed alias text
  as exactly `During Gap`; only the current name was present, with no stale intermediate render.
- At rest, the 500-row transaction surface mounted 14 rows. A unique alias query mounted its one
  exact option; that DOM node and the focused query were retained for the following measurements.
- The peer tab imported one additional transaction through the rendered import flow. Tab A advanced
  to 501 transactions while preserving the exact same option node and active query; the attached
  observer recorded zero option-tree mutations.
- The peer then renamed that alias to `R03 Alias 099 Revised`. Tab A retained the exact same option
  node and active query, updated to the revised text, and recorded exactly one mutation.
- Repeated lazy bottom expansion reached data index 500 in 1,784 ms with 18 transaction rows
  mounted. The index-zero description input remained connected, focused on `R03 Row 027`, with caret
  index 4.
- A management rename, Undo, Redo and hard reload each produced the expected name; the durable final
  alias and count of 101 survived reload.
- Desktop 1,440×900 and mobile 390×844 retained the heading and Add Alias control in dark mode with
  reduced motion. Desktop and mobile document widths equalled their viewports. At desktop 200% zoom,
  both controls remained visible and the 1,440-pixel document had no horizontal viewport overflow.
- A plaintext sentinel rename produced seven inspected HTTP bodies and 49 inspected WebSocket
  frames; no inspected body or frame contained the sentinel. Only counts and booleans were returned.
- Final CLI console inspection reported zero warnings and zero errors. Inspected current product
  requests completed successfully.

## Cleanup and frozen boundaries

- Deleted all 501 transactions through 11 rendered select-all/bulk Delete/Confirm cycles, then
  deleted all 101 aliases through each rendered Delete/Confirm control. The UI showed no transaction
  rows, zero aliases and `Saved` before shutdown.
- Closed/deleted the disposable browser session; `pnpm browser list` reported no browsers. Stopped
  the task-owned dev server. Trashed exact generated `.playwright-cli`, `test-results` and `.next`
  directories; no task-owned browser/server process remains. Restored generated `next-env.d.ts` to
  tracked content.
- Final frozen-boundary values are unchanged:
    - `specs/human-scratch.md`: SHA-256
      `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350 lines / 24,245 bytes.
    - FS-001 canonical source: SHA-256
      `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
    - `SCOPE.json`: SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450
      lines / 27,382 bytes, with all 22 requirements present.
- The final index is empty. Before this evidence, Git-visible dirt is exactly root-owned
  `HANDOFF.md` and `PROGRESS.md`; this uncommitted evidence is the sole worker artifact outside the
  exact product/test commit.
- Revision 03 changes exactly the two authorized product/test paths: 398 insertions and 14
  deletions. The cumulative immutable range contains 24 paths, 2,749 insertions and 188 deletions.

## Questions, risks and reviewer focus

- No new product-policy ambiguity requires a Q proposal. Q-016 canonical name matching and Q-017
  stale-intent non-resurrection are unchanged.
- Reviewer focus: independently verify the literal cumulative `BASE..HEAD` range; provider/document
  observer lifetime and exact disposal; frontier reconciliation at setup; 0/0/0 transaction-only
  work; exact-one alias rebuild behavior; zero-consumer local/remote remount freshness; and retained
  raw-state, legal-graph, history, interaction, privacy and browser gates.
- R-008's missed-event and unrelated-rebuild dimensions are the principal revision-03 risks. The
  actual-provider counters and installed two-tab first-commit observation address both, but only the
  independent reviewer may approve the package.
