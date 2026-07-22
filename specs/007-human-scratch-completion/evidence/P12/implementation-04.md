# P12 Implementation Evidence — Revision 04

## Immutable dispatch boundary

- Package / requirement / revision: `P12` / `HS-005` / `04`.
- Original cumulative BASE: `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`.
- Clean revision-04 pre-implementation HEAD:
  `14259b5f6d02f566e32ac94ab4d63c20b5ef0353`.
- Revision-03 evidence and failed review were read before product/test edits. All prior artifacts and
  cumulative implementation are immutable.
- This file is the sole writable worker artifact. It was created before product/test edits and
  remains uncommitted for independent review.
- Initial index and untracked set were empty. Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md`.

## Status and exact ranges

Revision-04 implementation and validation are complete at immutable worker commit
`2489c41335ad2292f9005403c18022c46915507b`. This artifact makes no PASS claim; the exact range and
evidence are for independent review.

- Revision-04 range:
  `14259b5f6d02f566e32ac94ab4d63c20b5ef0353..2489c41335ad2292f9005403c18022c46915507b`.
- Cumulative P12 review range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..2489c41335ad2292f9005403c18022c46915507b`.
- Revision-04 is one commit, `2489c41335ad2292f9005403c18022c46915507b`, whose parent is exactly
  the dispatched clean pre-implementation HEAD. Its subject is
  `Complete bounded private vault maintenance`.
- The commit contains exactly seven authorized paths, 1,290 insertions and 173 deletions:
  `src/lib/crdt/maintenance.ts`, `src/lib/crdt/mutations.ts`, `src/lib/crdt/queries.ts`,
  `src/lib/crdt/schema.ts`, `tests/integration/vault-maintenance.test.tsx`,
  `tests/unit/crdt/maintenance.test.ts`, and `tests/unit/crdt/transaction-queries.test.ts`.

## Red-to-green counterexamples and revision-03 closure

- The first revision-04 counterexamples were red against the inherited implementation: oversized
  relocation reached a non-empty detached-map attachment; unscoped duplicate queries returned two
  physical copies; and selected multi-account pagination returned a total count of two for one
  logical ID. These directly reproduced revision-03 F-01 and F-02.
- A real subscribed Loro parameterized fixture was then added for both `unnestDuplicate` and
  `swapDuplicate`. It forks peers only after both date buckets exist, creates concurrent same-ID
  parent copies, divergent nested payloads, standalone/nested identity collisions, and direct plus
  nested description-alias pointers. Both import orders now converge to one logical result, the
  exact clean physical graph, and the expected alias pointers. This closes revision-03 F-03's
  missing evidence gate.
- Instrumentation during development caught a resume defect where a transaction was registered in
  same-ID cleanup before its persisted search finished and could later delete itself. Registration
  now occurs only after the search cursor completes; the focused tests cover the corrected path.
- An initial synced-metadata design added a new Mirror root. The first affected browser matrix then
  failed 12/12 during onboarding with `Map value must be an object`. That design was removed. The
  final metadata representation is a schema-valid private account-shaped entry described below.
- A later affected browser matrix passed 6/12: description-alias concurrency failed three repeats,
  and tab duplication observed two operations where one was expected in three repeats. Making the
  epoch active flag rotate only during an in-progress shadow removed the ordinary-edit maintenance
  operation. The two exact journeys passed individually, then the final affected 12/12 matrix
  passed.

## Genuinely bounded live maintenance staging

- Relocation no longer attaches a populated detached transaction tree. The target list first
  receives an empty `LoroMap`; fixed scalar fields and empty child containers are then installed on
  that already-attached private shadow.
- The reserved shadow ID encodes its maintenance prefix, epoch, source CID and eventual public ID.
  Schema helpers parse that identity and define public transactions. Every public query
  canonicalization path filters shadows, and public update/move/delete/import-delete discovery also
  ignores them. Observers therefore never receive a copy-only public state while the attached tree
  is under construction.
- Root tags, allocations, nested maps, nested tags and nested allocations are constructed directly
  on the attached shadow. Persistent progress keys record the next exact unit. Each `system:gc`
  commit performs one bounded dynamic unit; target and source/insertion searches likewise advance
  one item per step. Root allocation enumeration uses persistent generator state and is restart
  safe.
- Final reveal performs only fixed work in one commit: replace the reserved shadow ID with the real
  ID, remove progress keys, delete the exact source, perform fixed-depth empty-bucket pruning and
  commit. It contains no transaction-sized recursive attachment or rescan. Stale or malformed
  shadows are discarded with one bounded list deletion.
- The oversized regression instruments list/map mutation calls inside applies for a payload with
  wide tags, allocations and nested duplicates. Completion takes more than 300 applies, no
  non-empty map is attached, every public observation remains unique, every maintenance origin is
  `system:gc`, the maximum observed mutation count is at most 24 per commit, and the full payload is
  retained after reveal.
- Snapshot reload/resume, remote partial-batch classification, imported peer epoch preservation,
  local-echo suppression, active user-edit epoch invalidation, stale-shadow discard and final
  convergence all use real Loro documents in integration coverage. The active-edit fixture changes
  a stable non-conflicting field while a shadow exists, proves that the epoch changes and proves no
  private shadow remains.

## Synced epoch and private metadata design

- Maintenance metadata is stored under reserved transactions key
  `__moneyflow_gc_metadata__` as a valid empty `AccountTransactionTree`: its `accountId` encodes the
  reserved prefix, epoch, random batch identity and active flag, while `years` remains empty. It is
  therefore represented by existing schema-valid Loro containers without changing the Mirror root.
- Planner account discovery skips the reserved key, and public transaction queries observe no
  transaction from it. Maintenance commits update the random batch marker so imported events can
  distinguish maintenance work from domain edits across reloads and peers.
- The active flag is true only while a private shadow is in progress. Relevant local or imported
  domain changes rotate the epoch only when that flag is active. Ordinary edits and tab duplication
  therefore do not receive a gratuitous `system:gc` operation, while edits that could stale an
  in-flight shadow invalidate it deterministically.
- Independently maintaining peers use distinct batch identities. The convergence fixture strips
  the reserved private metadata key only when comparing the public domain transaction trees; it
  separately exercises imported maintenance batches and epoch behavior rather than treating
  private coordination metadata as user data.

## Physical duplicate cleanup and nested mutation convergence

- Maintenance now records same-logical-ID physical transaction copies in a deterministic map and
  deletes losers within the same account/date bucket. The resumable transaction-search guard
  prevents the current item from being counted twice across steps.
- `unnestDuplicate` unions all remaining nested IDs from every physical parent copy, chooses values
  with the peer-stable canonical selector and copies the result into every relevant parent before
  the selected nested transaction becomes standalone.
- `swapDuplicate` applies the same all-copy selection and union rule while promoting the chosen
  nested transaction. Both operations preserve direct and nested description-alias identities and
  remove stale physical parent/standalone collisions.
- The subscribed parameterized real-Loro test exchanges peer updates in both orders and observes
  operations through subscriptions before maintenance drains. It asserts the same unique logical
  state and exact physical tree for unnest and swap, including divergent payload conservation and
  alias pointers.

## Canonical exported query boundaries

- Unscoped `getTransactionsWithDuplicates()` now globally canonicalizes after its cross-account
  merge.
- Selected multi-account `queryTransactions()` globally canonicalizes before filters, sorting,
  pagination and total-count calculation. Its no-account branch continues through the shared
  canonical all-transactions boundary.
- Cross-account same-ID fixtures cover the unscoped export plus selected-account total count and
  page content. Together with inherited location, ID-only, account, all-account and date-range
  coverage, all exported flat transaction-array boundaries now apply the same public logical-ID
  rule.

## Automated validation

- The final focused profile passed in three clean processes: four files / 91 tests each
  (`maintenance.test.ts`, `transaction-mutations.test.ts`, `transaction-queries.test.ts`, and
  `vault-maintenance.test.tsx`).
- Final `pnpm test`: 60 files / 1,264 tests passed.
- Final `pnpm typecheck`: clean.
- Final `pnpm lint`: exit 0.
- Final `pnpm build`: compile, type generation and all 17 routes passed.
- Changed-path `oxfmt --check` passed for the seven revision-04 paths. `git diff --check` passed.
- Final affected no-retry browser matrix used the four exact journeys at
  `description-aliases.spec.ts:305`, `description-aliases.spec.ts:403`,
  `transactions.spec.ts:139`, and `tab-duplication.spec.ts:49`, with `--repeat-each=3 --workers=1
  --retries=0 --reporter=dot`: 12/12 passed in 2.8 minutes.
- Final full no-retry browser suite with one worker: **FAIL**, 86/87 in 5.5 minutes. The sole red was
  inherited T021c at `transactions.spec.ts:1446`: after shift-clicking the third checkbox, expected
  text `3 selected` was absent. The exact T021c journey then passed in three separate clean
  no-retry processes, 1/1 each. This evidence reports the full gate as red and does not normalize it
  to green.
- Repository `pnpm format:check`: **FAIL** only on out-of-scope/frozen/control artifacts
  `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, frozen
  `implementation-03.md`, this uncommitted `implementation-04.md`, and `specs/human-scratch.md`.
  No revision-04 product/test path failed formatting.

## Installed headless Playwright CLI charter

- Used only repository-installed headless `pnpm exec playwright-cli`, session `p12-r04`, against a
  manually started local server. No MCP, `npx`, temporary config/test, headed mode, dashboard,
  debug/pause or arbitrary sleep was used.
- Created a fresh identity without revealing the recovery phrase. Every onboarding snapshot kept
  all twelve words masked; the phrase was never revealed, copied, read, re-entered or printed.
- The first Settings load truthfully reported failed vault loading because realtime authorization
  was unavailable. A restart with the REST container secret authorized the endpoint but did not
  connect realtime. A second restart used the existing realtime container's API JWT secret,
  extracted without printing it; Settings then showed `My Vault`, owner role, online presence and
  `Saved`. An initial `127.0.0.1` navigation caused a Next development HMR-origin/non-hydration
  issue; switching to the server's `localhost` origin restored normal controls.
- Through normal controls, created two `R04 Shared` transactions (`12.34` and `56.78`) and one
  `R04 Target` transaction (`90.12`). Editing one shared row to `R04 Unified` and choosing `Change
  all` changed both shared rows. Undo restored both to `R04 Shared`; Redo restored both to
  `R04 Unified`; reload preserved all three rows and reset history.
- Tx Descriptions showed `R04 Unified` with two transactions and `R04 Target` with one transaction.
  While deliberately offline, changed the target amount from `90.12` to `91.13`; reconnect pushed
  successfully, and reload retained `91.13`. Five console errors were the expected failed
  sync/dev-stack requests during that explicit offline window; the server subsequently recorded
  successful sync and realtime responses.
- A newly opened second tab correctly navigated to Unlock because the vault key is tab-local. It
  was closed without revealing or re-entering the recovery phrase. Independent duplicate-tab and
  presence behavior therefore remains automation-only in this charter.
- At 390 × 844 the responsive header, named menu/history controls and all three transaction rows
  remained available. Dark color preference, reduced-motion preference and simulated 200% zoom
  were applied together; core named controls and data remained represented.
- Normal UI cannot create concurrent same-ID physical buckets, a private maintenance shadow or a
  partially imported maintenance batch. Those cases are automation/static-audit only; manual
  success is not used to waive their gates.

## Boundary, cleanup and questions

- Frozen human scratch remains SHA-256
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines / 24,246 bytes,
  with HS-005 unchecked. Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines / 27,382 bytes.
- Frozen revision-03 evidence remains SHA-256
  `540a3e497d3d33f4d82be5925d588e31b9ce37d030d43e88d3e412f6a38a33ce`; failed review-03 remains
  SHA-256 `3d68ffd573feff3e42d2b56d4be9d4626a3c4317c7bbda1079846127d20098ec`.
- The CLI session and local server are stopped; no browser session or port-3000 listener remains.
  Generated `.playwright-cli/` and `test-results/` directories were moved to the desktop trash and
  are recoverable. `next-env.d.ts` was restored. No worker browser/dev/test process remains.
- Root-owned `HANDOFF.md` and `PROGRESS.md` remain unstaged and untouched by this worker. This
  evidence is the sole uncommitted worker artifact, and the index is empty.
- No new `Q-*` proposal is needed. Revision-04 implements the settled rejection conditions from
  review-03 without introducing an unresolved product or process ambiguity.
