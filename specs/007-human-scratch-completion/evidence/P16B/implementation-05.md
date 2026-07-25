# P16B Implementation Evidence — Revision 05

## Immutable dispatch boundary

- Package / requirement / revision: `P16B` / `FS-001` / `05`.
- Literal original cumulative review BASE: `4c102600240e2804b801c2a320e10164defb14ea`.
- Immutable revision-04 product/test HEAD: `e09eb6bdbbfd796d970d85ef36c212795bcb4912`.
- Revision-04 failure integration / clean pre-revision HEAD:
  `618254f1f381cd1e4dfb68a9258cccb667a0c838`.
- Root dispatch/control and clean pre-product HEAD: `f806cdae54469d6b1f3a286fa438e8c90cbd17f7`.
- Frozen revision-04 evidence matched SHA-256
  `a49c3f89693fae09e7b176612e11c57c416814ecb531313ac6ffa7c4882ab001`, 283 lines / 19,250 bytes.
- Immutable revision-04 FAIL review matched SHA-256
  `8cc169c08f6c87fc16eec1fa3c6615b033abd291faaa0969619230558949b241`, 403 lines / 24,640 bytes.
- This sole revision-05 implementer artifact was created before any test or product edit. The index
  and worktree were empty at implementation start. Future `reviews/P16B-review-05.md` did not exist
  and was not created.
- Dispatched revision-04 product identities before revision-05 edits:
    - `src/lib/domain/settlement.ts`
      `1cc750de91555e2c4c84a142930c28f48c144599224b50d884ab183761cce092`;
    - `tests/unit/domain/settlement.test.ts`
      `19fe6fb8cb9ea657f23df0e89a96368a5b2440e6c70966392811566ada4f1def`.

## F-06 red reproductions

- This evidence existed before any product/test edit. The exact checked-in red commit is
  `b3e0235a8e7a1a2d15f45fb3c92ef85831d92c7d`
  (`test: capture P16B primitive collection regressions`). It changes only
  `tests/unit/domain/settlement.test.ts`; revision-04 production remained byte-identical at SHA-256
  `1cc750de91555e2c4c84a142930c28f48c144599224b50d884ab183761cce092`.
- The exact unchanged-production focused command was:

    ```text
    pnpm exec vitest run tests/unit/domain/settlement.test.ts \
      tests/unit/domain/balance.test.ts \
      tests/unit/components/balance-summary.test.tsx \
      --pool=forks --maxWorkers=1
    ```

    It exited 1 in 4.59 seconds with the settlement file failed, the two preservation files passed,
    and five failed / 159 passed / one skipped tests. All five new expectations failed because the
    required collection-entry issue was absent:
    - referenced string account returned only the downstream `missing-account`;
    - referenced string status returned no issue and no qualifying transaction;
    - unreferenced string account and status entries returned issue-free plausible valid-sibling
      obligations; and
    - seed `26072508` failed on its first generated case and shrank to an unreferenced status entry
      with key `" "` and string payload `""`.

- The four direct tests independently assert the complete issue type/context, atomic exclusion for
  referenced malformed entries, preserved valid-sibling financial output only alongside a retained
  incomplete issue, stable insertion-independent issue order, fully frozen result graph and
  unchanged/unfrozen caller input.
- No production correction preceded or weakened the checked-in RED. Every pre-revision focused
  expectation remained green.

## Narrow remediation and generated oracle

### Exact-key metadata rule

- The exact GREEN product commit is `46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c`
  (`fix: validate nonmetadata Loro collection entries`). Its entire source delta is four additions /
  two deletions inside `recordFromLoroMap`.
- Collection entries are materialized by the accepted revision-04 exception-safe snapshot, sorted by
  ID with the existing scalar comparator, and only exact key `$cid` is skipped. Every other value,
  including every string or other primitive, enters `snapshotMaterializedRecord` and emits the
  existing contextual account/status hierarchy issue when invalid.
- The correction does not generalize the exemption by value type. The real initialized Loro
  non-enumerable string `$cid` test remains green; non-string `$cid`, arbitrary hidden fields,
  symbols, accessors, prototype/descriptor traps and non-record entries retain their prior exclusion
  behavior.
- Sorting is local to the already-materialized collection and makes complete issue ordering
  independent of account/status insertion order. It does not read caller wrappers after snapshot or
  change valid account/status map semantics.

### Genuine fixed-seed mechanism generation

- The new seed `26072508` runs 1,000 cases. It independently generates:
    - account versus status collection boundary;
    - referenced versus unreferenced placement;
    - one to six unique non-`$cid` keys;
    - generated string, integer, double, boolean, bigint, null and undefined payloads;
    - generated string `$cid` metadata; and
    - forward and reversed collection insertion.
- Its oracle is derived directly from generated IDs/boundary/reference state rather than from a
  finite reproduction factory or production helper. It expects sorted contextual issues for every
  primitive entry, plus the downstream referenced-account `missing-account` where applicable, exact
  qualifying count and exact obligation preservation/exclusion. Both insertion permutations must
  return the same recursively frozen result.
- Focused settlement coverage now collects 146 tests: 145 normal tests pass and the production scale
  benchmark remains opt-in.

### Preserved revision-04 and canonical core

- The real initialized Loro mirror, complete record/array snapshot mechanisms, no post-snapshot
  wrapper reads, ordinary/null-prototype acceptance, arbitrary-object rejection, account/tree
  identity, Temporal calendar boundaries, duplicate/topology selection and every F-01–F-05
  regression remain green.
- Named examples A–H, exact P16A signed apportionment, positive/zero/negative remainder,
  transaction/currency conservation, deterministic matching, reverse netting, signed source
  traceability, collision-free cache/aggregate identity, safe aggregate exclusion, missing/deleted
  People, issue privacy, recursive result freezing and caller purity remain green.
- `settlement.ts` remains the sole callable engine over the retained `TransactionStore`; no caller,
  component, schema, CRDT/query/mutation, dependency, E2E, configuration or persistence path was
  edited. Components guidance therefore preserved the existing BalanceSummary contract. CRDT
  guidance preserved exact Loro runtime compatibility without changing draft/mutation owners. E2E
  guidance kept checked-in journeys read-only and required the installed headless CLI plus
  one-worker, zero-retry automated gates.

## Automation, benchmark and installed-CLI evidence

### Focused, broader, full and static gates

- Three final exact-HEAD focused processes each passed 3 files / 164 tests plus one skipped
  benchmark in 4.97, 5.05 and 5.01 seconds.
- Broader domain/current-caller passed 14 files / 563 tests plus two skips in 12.37 seconds.
- Full Vitest with forks/one worker passed 63 files / 1,455 tests plus two skips in 56.66 seconds.
- `pnpm typecheck` passed. Exact two-path ESLint and oxfmt checks passed without diagnostics.
  Revision-05 and cumulative `git diff --check` passed; the revision-05 product range names exactly
  the two authorized product/test paths.
- Repository `pnpm lint` passed with zero errors and the same ten inherited warnings: one TanStack
  virtualizer compiler warning, two unused query types and seven existing unused CRDT-test
  types/imports. No warning names a P16B path.
- Production `pnpm build` passed: optimized compilation 5.0 seconds, TypeScript 8.5 seconds and all
  17 routes generated.
- Before formatting this required evidence, repository `pnpm format:check` reported the inherited 14
  frozen Markdown paths plus this evidence. After direct evidence formatting, the final command
  reports only the same inherited 14; no inherited path was rewritten.

### Browser gates

- Accounts/Transactions Chromium passed 46/46 in 3.0 minutes.
- Full Chromium passed 102/102 in 6.6 minutes.
- Both commands used Chromium, one worker, retries zero and read-only E2E files. Deliberate
  offline/authentication/realtime diagnostics occurred only inside journeys that exercise those
  states; no test failed or retried.

### Honest deterministic full-output scale

- Node `v22.21.1`; deterministic fixture construction excluded; retained hierarchy projection
  included; five 1,000-transaction warmups; full immutable output materialized.
- Command:
  `P16B_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/settlement.test.ts -t 'production settlement scale' --pool=forks --maxWorkers=1 --disableConsoleIntercept --reporter=verbose`.
- Results: 10,000 `87.14`ms; 50,000 `385.37`ms; 100,000 samples `806.58`, `778.79`, `852.90`,
  `753.25`, `771.51`ms.
- Every 100k sample returned 100,000 qualifying transactions, 75,000 positive source contributions,
  two obligations and zero issues; per-currency position and signed-source conservation passed.
- This evidence does not claim the strict 200ms target. The already-recorded P16E
  production-profile, stable-revision/memoized-projection and safe interning follow-up remains;
  complete issue validation, privacy and traceability were not weakened to hide cost.

### Installed-CLI functional, responsive and privacy evidence

- All manual interaction used repository-installed `pnpm exec playwright-cli`, unique disposable
  session `p16b-impl-05` and the root-owned memory-only keyed server at exact product HEAD. No
  Playwright MCP, `npx`, temporary script/test/config, headed/debug/UI/dashboard mode or arbitrary
  sleep was used.
- Fresh onboarding generated exactly 12 masked recovery fields and one `Click to reveal` control.
  The phrase was never revealed, read, copied or emitted. The masked acknowledgement created the
  identity and landed on Vault Settings.
- The fresh initialized Loro mirror rendered People with `Settlement Summary`,
  `No outstanding balances between members`, `Everyone is settled up` and no
  `Settlement incomplete`. Creating `P16B05Bob` retained two People and the same issue-free
  settlement state. Accounts showed Default, USD, Me 100% ownership and `$0.00`.
- Transactions created two honest Default-account rows through normal UI: `P16B05Groceries` /
  `-100.00` / Paid and `P16B05Pending` / `-20.00` / For Review. Reload retained both descriptions,
  amounts, accounts and statuses. People retained Bob and the settled/no-issue result: the paid
  row's empty explicit map equals Default ownership, while the non-paid row is excluded.
- At 390x844 with forced dark styling and reduced motion, root/body client and scroll widths were
  exactly 390/390; Settlement Summary remained visible at x=49/y=450, width=292/height=28. The
  accessible mobile `Open menu` → `People` path retained the summary and settled state.
- At a 1,280x720 viewport and 200% document zoom, root client/scroll widths were 1,280/1,280 and
  logical body client/scroll widths were 640/640. Vertical scrolling reached exact
  `scrollY === maxScrollY === 720`; no horizontal overflow or unreachable content was observed.
- Boolean-only privacy evidence renamed the pending row to `P16B05PendingPrivate` while awaiting the
  real `sync.pushOps` POST. It returned 200; the exact marker appeared in neither request URL nor
  body and the UI committed it. Reload retained both rows, both amounts and the renamed value.
- Boolean-only storage inspection searched Bob, Groceries and PendingPrivate markers: one
  localStorage entry, nine sessionStorage entries and ten records across three stores in one
  IndexedDB database all returned false. No stored value or request body was printed.
- Final network inventory listed eight dynamic requests, all HTTP 200: one WASM, vault list, two
  sync updates, three realtime authorizations and one realtime revoke; 43 successful static requests
  were omitted by the CLI. The privacy push was independently captured at HTTP 200 before the final
  page inventory.
- Final console inspection contained five informational messages, zero errors and zero warnings. The
  browser closed; delete-data found no remaining prefixed profile; CLI listed no browsers.
- One excluded CLI mistake clicked the Next devtools indicator through a stale guessed snapshot
  reference before the Create Account control was selected by role. It produced no product-state
  mutation or acceptance claim; onboarding then continued through the correct role selector.

## Risks and questions

- No material ambiguity remains and no `Q-PROPOSAL-P16B-05-*` is required. Canonical invalid-data
  authority and the immutable FAIL review directly require exact-key `$cid` handling.
- Valid-sibling financial output remains present when an unrelated primitive entry is invalid, but
  the complete retained issue set marks the result incomplete. This matches canonical partial
  preservation without an issue-free plausible total.
- The disclosed strict-200ms P16E follow-up remains non-blocking for this narrow correctness
  revision.

## Paths, immutable identities and review request

- RED test commit: `b3e0235a8e7a1a2d15f45fb3c92ef85831d92c7d`.
- GREEN product commit / proposed revision-05 product HEAD:
  `46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c`.
- Exact revision-05 range
  `f806cdae54469d6b1f3a286fa438e8c90cbd17f7..46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c` changes
  exactly two authorized paths / 248 insertions / two deletions:
    - `src/lib/domain/settlement.ts` (4/2);
    - `tests/unit/domain/settlement.test.ts` (244/0).
- Cumulative original review range
  `4c102600240e2804b801c2a320e10164defb14ea..46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c` contains 19
  paths / 7,277 insertions / 909 deletions: prior immutable artifacts/root transitions and
  revision-01 owners plus revision-05's exact two authorized paths. The authorized product/test
  subtotal is 4,030 insertions / 412 deletions (settlement 1,198/145; test 2,832/267).
- Final authorized-path identities:
    - `src/lib/domain/settlement.ts`
      `ad047f3c571e7eeb83150325c1ccdcd18e267ef282468797711d174e22032192`, 1,239 lines / 47,216
      bytes;
    - `tests/unit/domain/settlement.test.ts`
      `361768f0e59dd8784b5492646e4665dd5fcb237b32527f1e33a3eeab7f7888bd`, 2,964 lines / 114,826
      bytes.
- Frozen sources and dispatched artifacts remain exact:
    - `specs/human-scratch.md` `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`,
      350 lines / 24,250 bytes;
    - immutable FS-001 `specs/008-transaction-percentage-allocations-settlement/spec.md`
      `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes;
    - `SCOPE.json` `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
      27,382 bytes;
    - revision-04 evidence `a49c3f89693fae09e7b176612e11c57c416814ecb531313ac6ffa7c4882ab001`, 283
      lines / 19,250 bytes; and
    - revision-04 FAIL review `8cc169c08f6c87fc16eec1fa3c6615b033abd291faaa0969619230558949b241`,
      403 lines / 24,640 bytes.
- Root cleanup is complete: unified server `77546` and listener `2652746` stopped; port 3000 is
  clear; generated `next-env.d.ts` restored; current `.next` and `test-results` moved to recoverable
  `trash:///`; `playwright-report` was absent; all and only the exact 18 enumerated revision-05 CLI
  artifacts moved to recoverable trash. `.playwright-cli` changed from 40 to 22 files, preserving
  every older artifact.
- Product index/worktree is clean. The sole status entry is this untracked evidence. Future
  review-05 remains absent. No scratch checkbox, canonical FS-001 byte, task, ledger, prior
  artifact, caller/component, shared CRDT/query/schema owner, E2E/configuration path or future
  review was changed by this worker.
- This implementation artifact remains intentionally uncommitted for root/reviewer identity capture.
  Independent review is requested for the literal cumulative immutable range and this exact
  evidence; no independent PASS is claimed.
