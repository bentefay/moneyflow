# P12 Implementation Evidence — Revision 08

## Immutable dispatch boundary

- Package / requirement / revision: `P12` / `HS-005` / `08`.
- Literal cumulative BASE: `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`.
- Clean revision-08 pre-implementation HEAD: `a5570e3d805cbb65af3f4cf5cead554fef279bce`.
- Scope: close review-07 findings F-08 and F-09 only.

## Initial state

- Product/test HEAD matched the dispatched pre-implementation HEAD.
- Existing dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`.
- The index was empty.
- This is the sole writable worker artifact and was created before product/test edits.

## Implementation

### Path-lazy public-state membrane

- Revision 07's eager recursive projection was replaced with a cached path-lazy `Proxy` membrane.
  Creating the application-state and transaction-store projections is constant work: neither
  operation visits an account, date bucket, parent transaction or nested duplicate.
- A transaction-store property read wraps only the requested account tree. Year, month and day
  arrays wrap their entries only as those entries are explicitly traversed. Parent and nested
  transaction lists build public-index maps only when caller code explicitly reads, enumerates or
  mutates those particular lists.
- The public-index maps are cached for the life of the raw draft/snapshot array and invalidated by
  writes. Separate `WeakMap` caches retain stable projections for application state, stores, account
  trees, bucket arrays/buckets, transaction arrays/transactions and nested duplicate arrays.
- The store membrane hides the revision-04 reserved account through direct reads, descriptors, `in`
  and enumeration. Parent lists use the canonical `isPublicTransaction` boundary, while nested
  duplicate lists use the canonical maintenance-shadow identity helper.
- The filtered array membrane exposes consistent public `length`, numeric properties, descriptors,
  `in` and `ownKeys`. It translates numeric assignment, deletion, `length`, `push` and `splice` back
  to raw draft indices so generic application mutations retain Mirror's write-through behavior
  without revealing private entries.
- No CRDT field, maintenance task or synchronous background walk was added. The existing bounded
  request-animation-frame scheduler remains the only owner of physical cleanup.

### All exported application-state callbacks

- `useVaultSelector` continues to receive the application-state projection.
- `useVaultAction` now projects the draft state before invoking the caller updater.
- `useVaultEditAction.update` now projects the draft state before invoking the caller updater, both
  inside an active edit session and in the standalone-edit path.
- Internal specialized actions continue to use the raw state behind their audited helpers. The
  public generic selector/action/edit APIs therefore share one boundary without changing their
  explicit user origins or Undo grouping.

### Deterministic coverage

- A deliberately large real-provider fixture contains 24 accounts, four public parents per account
  and one public nested duplicate per parent: 96 parent paths plus 96 nested paths.
- Actual selector components read one account tree and the reserved key. Spies on both public-parent
  and nested-shadow classifiers remain at zero during initial selection and during an ordinary
  transaction note update. The selectors rerender for the real provider notification, proving the
  absence of hidden whole-vault work rather than absence of notification.
- A second real-provider fixture imports a late physical legacy marker plus a public parent/public
  nested child, private parent and private nested child while cleanup frames are paused.
  `useVaultAction` and `useVaultEditAction` callbacks observe direct reads, store/list enumeration,
  descriptors and nested graphs before cleanup. Every shape excludes the reserved account and both
  private transaction forms.
- The generic action also changes public notes and inserts a real transaction through the projected
  list. The generic edit changes a preference. The first cleanup frame removes the marker with
  exactly one `system:gc` update at that boundary; later bounded frames drain remaining private
  shadows. One Undo group reverts the generic public mutations while the marker stays absent.

## Counterexamples

### Review-07 F-08

- Before the revision-08 membrane, the large 24-account fixture read only
  `state.transactions["account-0"]` and the reserved key, yet the revision-07 eager projection
  called `transactionSchema.isPublicTransaction` 96 times. Expected classifier calls were zero.
- The focused test was red at that exact assertion before implementation. The nested classifier was
  part of the same eager projection; the first failed assertion stopped the test before its
  independent count could be reported.
- After implementation, both classifier spies remain at zero for the initial selectors and after an
  ordinary transaction update. Work is paid only when consumer code explicitly traverses a selected
  transaction list and is therefore bounded by that consumer-requested path rather than vault size.

### Review-07 F-09

- Before projecting updater state, the real `useVaultAction` counterexample enumerated
  `["account", "__moneyflow_gc_metadata__"]`; the expected visible account keys were `["account"]`.
- That red observation was recorded from the exported generic action boundary, not a direct internal
  helper. The same fixture covers generic edit callbacks and direct/enumerated/descriptor/ nested
  reads.
- After implementation, action and edit callbacks cannot observe the reserved account, private
  parent or private nested child before the paused cleanup frame, while their ordinary writes,
  explicit user origin, single Undo group and cleanup lifecycle remain correct.

## Automated validation

- Final focused P12 profile ran in three separate Vitest processes:
  `tests/unit/crdt/maintenance.test.ts`, `tests/unit/crdt/transaction-mutations.test.ts`,
  `tests/unit/crdt/transaction-queries.test.ts`, and `tests/integration/vault-maintenance.test.tsx`.
  Every process completed 4 files / 107 tests; the recorded durations were 3.70, 3.34 and 3.23
  seconds.
- Final `pnpm test`: 60 files / 1,280 tests completed successfully.
- Final `pnpm typecheck`: clean.
- Final `pnpm lint`: exit 0 with the inherited 10 warnings and no errors.
- `pnpm build`: Next 16.2.10 compiled, generated types and static output, and built all 17 routes.
- Changed-path `oxfmt --check` completed successfully for both revision-08 paths.
- Revision-only
  `git diff --check a5570e3d805cbb65af3f4cf5cead554fef279bce..a2a31839f6bb57855fa60b8cfcc06feed069cafa`
  completed successfully. Cumulative `git diff --check` reports only the frozen revision-06 evidence
  line-191 blank-at-EOF finding; revision 08 has no authority to edit that artifact.
- Repository `pnpm format:check`: **FAIL** only on thirteen control/frozen files: `DECISIONS.md`,
  `DEPENDENCIES.md`, root-owned `HANDOFF.md` and `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, frozen
  `implementation-03.md`, `implementation-04.md`, `implementation-05.md`, `implementation-06.md`,
  frozen `P12-review-05.md`, frozen `P12-review-06.md`, and `specs/human-scratch.md`. Neither
  revision-08 product/test path nor this evidence artifact fails formatting.
- Affected no-retry browser journeys covered `description-aliases.spec.ts:305`,
  `description-aliases.spec.ts:403`, `transactions.spec.ts:139`, `tab-duplication.spec.ts:49`, and
  `tags.spec.ts:117`, with `--repeat-each=3 --workers=1 --retries=0 --reporter=dot`: 15/15 completed
  successfully in 3.3 minutes.
- Full no-retry browser suite with `--workers=1 --retries=0 --reporter=dot`: 87/87 completed
  successfully in 5.5 minutes.
- Browser test servers emitted the inherited missing-local-Realtime-signing configuration warnings;
  those warnings did not alter the no-retry results.

## Manual validation

- Used only the repository-installed headless CLI with disposable session `p12-impl-08`. No MCP,
  `npx`, temporary test/config, headed/UI/debug/show/pause mode or arbitrary sleep was used.
- The local Realtime JWT was derived in memory from the running local container and supplied only to
  the dev-server process. It was neither printed nor persisted.
- Created a fresh identity through `/new-user` while all twelve recovery words remained masked. They
  were never revealed, read, copied, entered or printed. Created owner vault `P12 Lazy Vault`; the
  authenticated shell showed online presence and `Saved`.
- The real vault-settings edit callback changed the name to `P12 Lazy Vault`; Undo and Redo both
  worked and the final state returned to `Saved`.
- Created one ordinary `P12 lazy action charter` transaction for `42.50` through named controls with
  default `7/24` date/account/status. Reload preserved exactly one row. Exact-description search
  returned that row and was then cleared.
- Navigated the actual People, Tags and Statuses routes and used their real generic actions to add
  `Manual Person`, `Manual Tag` and `Manual Status`. Each item was visible and persisted; the status
  route exposed Undo and returned to `Saved`.
- Navigated Imports, observed the accessible `Imports` heading, `Import new file` control and empty
  state, opened the native file chooser, and supplied checked-in `package.json` only to close the
  chooser. No import was created.
- With the browser context offline, keyboard-edited the transaction description to
  `P12 offline replay charter` and blurred. The UI entered `Saving...`; after reconnect it returned
  to `Saved`, and reload preserved the edit.
- A user-opener cloned the authenticated tab-local session. Both visible tabs showed two online
  presence entries. An edit in the first tab to `P12 two tab charter` appeared in the second tab
  through live synchronization before that tab was closed.
- At 390 × 844 with dark preference and reduced motion, accessible mobile header/menu, history
  controls, filters and transaction row remained available. Measured
  `innerWidth == clientWidth == scrollWidth == 390`; both media queries matched.
- In a separate 1,280 × 800 case, CSS page zoom was set to 200%. Computed zoom was `2` and measured
  `innerWidth == clientWidth == scrollWidth == 1280`, with the transaction controls still
  represented by accessible role/name.
- Final CLI console inspection returned zero error-level messages. Current navigation, vault, sync
  and Realtime requests were 200. The explicitly offline interval produced one expected
  `sync.pushOps` `ERR_INTERNET_DISCONNECTED` plus two Next development stack-frame request failures;
  a later `sync.pushOps` completed with 200 and persisted the edit.
- One CLI command timed out because its person-name locator used a curly apostrophe while the
  accessible label uses a straight apostrophe; retrying the correct named control added the person.
  A stale element reference after clearing search and two malformed/wrong-target wait expressions
  also produced harness-only command errors. Subsequent role snapshots and persisted state
  established the intended observations; none was a product failure or retry of an automated gate.
- Normal UI cannot inject a physical revision-04 reserved account or malformed private parent/nested
  tree while pausing cleanup. Those decisive conditions use real Loro documents and the actual
  provider/action/edit hooks in deterministic integration coverage.

## Boundary and cleanup

- Final revision-08 product/test HEAD is `a2a31839f6bb57855fa60b8cfcc06feed069cafa`.
- Revision-08 range:
  `a5570e3d805cbb65af3f4cf5cead554fef279bce..a2a31839f6bb57855fa60b8cfcc06feed069cafa`.
- Cumulative P12 review range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..a2a31839f6bb57855fa60b8cfcc06feed069cafa`.
- Revision 08 has one commit: `a2a31839f6bb57855fa60b8cfcc06feed069cafa` —
  `Bound public vault callback work`.
- The revision changes exactly the two authorized paths, 580 insertions and 51 deletions:
  `src/lib/crdt/context.tsx` and `tests/integration/vault-maintenance.test.tsx`.
- Frozen human scratch remains SHA-256
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines / 24,246 bytes, with
  HS-005 unchecked.
- Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Frozen revision-07 evidence remains SHA-256
  `f2bb54706d9f1c69b31573d6c3f9be3175043e63cb7a810f00d5917dc64c7a22`, 196 lines / 13,005 bytes.
  Failed review 07 remains SHA-256
  `2efb05fe259074868b4e2852550f9fcd8caf8ec654f1d1eb926e038f11d14ad5`, 209 lines / 21,524 bytes.
- CLI session `p12-impl-08` was closed. Only this run's UTC 08:46–08:50 timestamped
  `.playwright-cli` files and generated `test-results/.last-run.json` were moved to desktop trash;
  the pre-existing UTC 06:36–06:38 files were preserved. These items are recoverable.
- Generated `next-env.d.ts` drift was restored. Port 3000 is closed and no worker-owned Playwright
  CLI browser or dev-server process remains.
- Final worktree entries are exactly root-owned modified `HANDOFF.md` and `PROGRESS.md` plus this
  untracked evidence artifact. The index is empty.
- This artifact was created before product/test edits, is the sole worker artifact and remains
  uncommitted for independent review. It records implementation and evidence only and makes no PASS
  claim.
- No new `Q-*` proposal is needed. F-08 and F-09 specify the required exported boundary and bounded
  work model without a product decision gap.
