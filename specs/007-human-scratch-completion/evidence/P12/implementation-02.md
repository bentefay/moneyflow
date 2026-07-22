# P12 Implementation Evidence — Revision 02

## Immutable dispatch boundary

- Package / requirement / revision: `P12` / `HS-005` / `02`.
- Original cumulative BASE: `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`.
- Clean revision-02 pre-implementation HEAD: `b21ef639fb24020978cb39c2b69b83d6ff261ebb`.
- Revision-01 implementation evidence, failed review, and Q-018 were read before product/test edits
  and remain immutable.
- The sole worker artifact is this file. It was created before product/test edits and will remain
  uncommitted for independent review.
- Initial index and untracked set were empty. Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md`.
- Frozen boundaries initially matched their assigned SHA-256 and metadata values. Root ledgers,
  prior artifacts/reviews, scratch, FS-001, SCOPE, configuration, and unrelated code/tests remain
  immutable.

## Revision plan

1. Add deterministic red counterexamples for F-01 through F-04 before remediation.
2. Make duplicate-bucket relocation logically atomic/canonical at every read and mutation boundary.
3. Replace provider-lifetime alias blocking with Q-018's live per-alias Undo reachability frontier.
4. Bound and instrument every cooperative maintenance work unit while preserving fair phase
   progress.
5. Define peer-independent exact-tie ordering, retain cumulative P12 behavior, and complete required
   repeats, full gates, installed-CLI charter, exact cleanup, commit, and final evidence.

## Status

Implementation and validation are complete at immutable worker commit
`e8f2ca5be7ffa03c0ad6ac8e3fb72aac2accca3e`. This artifact makes no PASS claim; the exact cumulative
range and evidence are for independent review.

- Revision-02 commit: `e8f2ca5be7ffa03c0ad6ac8e3fb72aac2accca3e`.
- Exact revision-02 range:
  `b21ef639fb24020978cb39c2b69b83d6ff261ebb..e8f2ca5be7ffa03c0ad6ac8e3fb72aac2accca3e`.
- Exact cumulative P12 review range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..e8f2ca5be7ffa03c0ad6ac8e3fb72aac2accca3e`.

## Counterfactual reds

- Before product remediation, the exact focused command
  `pnpm exec vitest run tests/unit/crdt/maintenance.test.ts tests/integration/vault-maintenance.test.tsx --reporter=verbose`
  failed 5 of 14 tests. The failures independently exposed: a visible duplicate logical ID after the
  copy commit; first-copy mutation behavior; a source alias retained after history clear;
  transaction edits restarting the scan until aliases starved; and non-total exact-tie ordering.
- The existing 256-record conflict fixture also failed independently in that red run with peer-tie
  swaps, reproducing review F-04 rather than assuming the revision-01 green process.
- The first revision-02 transaction-boundary run reduced the focused failures to only Q-018 and
  fairness plus a missing-container-ID canonical-selection case. The latter established that Mirror
  output cannot use `$cid` as its only deterministic selector.
- A final full browser process was 86/87 because the unrelated shift-click selection test observed
  `2 selected` instead of `3 selected`. Its isolated no-retry repeat was PASS / FAIL / FAIL, with
  the red snapshots showing Range 3 and Range 2 selected while a newly sorted Range 4 sat above the
  anchor. This is disclosed as a final gate failure, not represented as green or silently retried.

## F-01 closure: one logical transaction throughout relocation

- `getAccountTransactions()`, `getAllTransactions()`, and the production active-transaction hook now
  collapse physical conflict copies by logical transaction ID before exposing rows, counts, React
  keys, selection IDs or presence IDs. Container identity is preferred when available; a
  deterministic value key covers Mirror output where `$cid` is absent.
- Ordinary edit, soft/hard delete and move mutations now visit every matching physical parent or
  nested copy. Move removes all source copies and inserts one detached serializable value; copied
  allocation maps omit Mirror's `$cid` metadata. Description-alias assign/create/change-one/remove-
  one/delete boundaries likewise mutate or unlink every physical copy.
- Regression coverage subscribes at each GC commit, asserts one logical row during copy/removal, and
  applies edit, hard delete and move between those commits. It separately covers soft deletion and
  concurrent same-ID replicas imported in both delivery orders.
- The peer-independent read order is date descending, creation instant descending, import row
  ascending, then logical ID ascending. Both the exact-tie regression and the large conflict fixture
  assert that contract; the raw two-peer convergence property remains intact.

## F-02 closure: Q-018 live Undo reachability

- `VaultUndoCoordinator` mirrors alias IDs reachable from the live Undo and Redo stacks through
  Loro's `onPush`/`onPop` lifecycle. New actions invalidate the mirrored Redo frontier, configured
  max-history trimming releases old groups, and clear/clearUndo/clearRedo/disposal publish the
  resulting finite frontier.
- A narrow document-lifecycle registry connects the already-created coordinator to the scheduler;
  the owning provider layering does not place the maintenance owner beneath `VaultUndoProvider`.
  Registration is replaced per document and conditionally removed on exact coordinator disposal.
- Maintenance skips a symlink only while its alias ID is reachable from either live stack. Frontier
  changes requeue the current provider immediately. Automated coverage proves Change all, Undo,
  Redo, clear, Redo invalidation, trimming and disposal without using remount as the normal trigger;
  existing hidden/resume, document replacement and final scheduler disposal coverage remains green.

## F-03 closure: budget observation and fair invalidation

- The frame clock is checked before discovery, after discovery/before apply, and after apply. If
  discovery consumes the time allowance its input cursor is retained so the plan is retried rather
  than lost. The existing item bound remains 32 transaction/bucket/alias discovery units and the
  default measured allowance remains 4 ms.
- Structural mutations no longer restart at the transaction phase. A persistent `needsRescan` bit
  allows the current pass to reach days, months, years and aliases, then performs a fresh proof pass
  before reporting completion. Relevant document and history invalidations similarly request a later
  fresh pass without discarding current phase progress.
- The continuous-edit integration runs a one-item frame budget while committing a relevant user
  transaction edit after every callback; the pre-existing alias is still rewritten and collected.
  The 256-conflict fixture continues to span multiple frames and never exceeds the item allowance.
- Planning and mutation are synchronous transaction-sized cooperative units; clock checks enclose
  their actual execution rather than the revision-01 `apply: false` path alone. Independent review
  should adjudicate whether this transaction-sized unit satisfies the frozen bounded-work wording
  for arbitrarily large nested payloads.

## F-04 closure and repeat evidence

- The ID tie-breaker removes generated-peer/list-materialization order from every production flat
  transaction read and insert boundary. The former locally concatenated expected array now uses the
  same explicit four-key order.
- On the final source tree, the five-file P12 profile ran in three clean processes. Every process
  passed 5 files / 32 tests; durations were 2.41 s, 2.38 s and 2.36 s.
- Before the final all-copy alias hardening, the four affected browser journeys ran with
  `--workers=1 --retries=0 --repeat-each=3` and passed 12/12. The final-code full browser run
  covered each of those journeys once without a failure; its only failure was the separately
  disclosed shift-click test.

## Final automated validation

- Tool profile: Node `v22.21.1`, pnpm `11.13.1`, Playwright `1.61.1`, repository Chromium project.
- Final `pnpm typecheck`: clean. Final production `pnpm build`: compiled, typechecked and generated
  all 17 routes.
- Final `pnpm test`: 60 files, 1,253/1,253 tests.
- Final `pnpm lint`: exit 0, zero errors and the same ten disclosed warnings (TanStack Virtual plus
  existing unused test/query imports).
- Scoped `oxfmt --check` over all eight implementation paths: clean. `git diff --check`: clean.
- Final-code full browser command,
  `pnpm exec playwright test --workers=4 --retries=0 --reporter=dot`: 86/87, with only the disclosed
  unrelated shift-click selection failure. The earlier full run before the final all-copy alias
  mutation was 87/87. The exact final failure repeated 1/3 in isolation with no retries.

## Installed headless Playwright CLI charter

- Used only repository-installed `pnpm exec playwright-cli` with disposable session
  `p12-r02-20260722`; no MCP, `npx`, temporary test/config, headed browser, dashboard `show`, UI,
  debug, pause or timing sleep. The recovery phrase remained masked in every snapshot and was never
  printed to tool output or this artifact.
- The first server launch lacked the Realtime signing secret and truthfully produced
  `Failed to load vault`. It was stopped, then relaunched using the symmetric key extracted from the
  local Realtime container without printing it. The same browser identity then loaded the
  authenticated vault with named navigation, online presence and `Saved` state.
- Normal controls created two `Manual Shared` transactions and a `Manual Target` alias. Editing one
  row to the exact target opened the single named `Change Description` dialog; choosing `Change all`
  changed both visible rows. Visible Undo restored both `Manual Shared` values and enabled Redo;
  Redo restored both `Manual Target` values.
- A hard reload reset local history. Normal navigation to `Tx Descriptions` then found no
  `Manual Shared` card and one `Manual Target — 2 transactions` card, observing production
  maintenance collection and preserved references. The disposable CLI browser was closed and the
  manually started development server was stopped.
- Operator-only corrections are retained: broad role locators for the second add row matched both
  toolbar and row controls, so exact data-test locators were used; an initial server setup lacked
  the required secret. Neither correction is counted as product behavior.

## Boundary and cleanup

- Frozen scratch remains SHA-256 `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`,
  350 lines / 24,246 bytes. Frozen FS-001 remains
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines
  / 27,382 bytes.
- The Next build's generated `next-env.d.ts` change was restored before staging. Root-owned
  `HANDOFF.md` and `PROGRESS.md` remain unstaged and untouched by this worker. No prior evidence,
  review, frozen source, configuration or unrelated product/test path is included.
- The revision-02 commit's parent is exactly the dispatched clean HEAD. Its diff contains exactly
  the eight authorized paths listed by `git diff-tree`; both revision and cumulative
  `git diff --check` are clean. This evidence remains the sole uncommitted worker artifact.
