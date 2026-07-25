# P16B Implementation Evidence — Revision 04

## Immutable dispatch boundary

- Package / requirement / revision: `P16B` / `FS-001` / `04`.
- Literal original cumulative review BASE: `4c102600240e2804b801c2a320e10164defb14ea`.
- Revision-03 product/test HEAD: `cd643afc8f168b3c8328eb54f1d5f280ca7ec717`.
- Revision-03 failure integration / clean pre-revision HEAD:
  `f343f496f8838ce237d3866124f7a3112b6a6938`.
- Root dispatch/control and clean pre-product HEAD: `e9ece18b11cd3ad0b6b8783b6c80200599e617fd`.
- This sole revision-04 worker artifact was created before any test or product edit. The index and
  worktree were empty at implementation start.
- Immutable revision-03 evidence and review matched their dispatched SHA/line/byte identities.
  Future `reviews/P16B-review-04.md` did not exist and was not created.

## F-04/F-05 red reproductions

- This evidence existed before any product/test edit. The exact checked-in red-tests commit is
  `0d96c25c50f86590c5c7df3dccc8370ea247e9e3` (`test: capture P16B complete snapshot regressions`).
  It changed only `tests/unit/domain/settlement.test.ts`; revision-03 production
  `src/lib/domain/settlement.ts` remained byte-identical at dispatched SHA-256
  `4c2ca9676d71a1c7041a93cddce5842f02a1e54f4b453577f4ff3f10bb48403b`.
- The exact unchanged-product focused process was:

    ```text
    pnpm exec vitest run tests/unit/domain/settlement.test.ts \
      tests/unit/domain/balance.test.ts \
      tests/unit/components/balance-summary.test.tsx \
      --pool=forks --maxWorkers=1
    ```

    It exited 1 with one failed file / two passed files and 41 failed / 108 passed / one skipped
    tests in 4.09 seconds.

- Every new F-04 mechanism failed under unchanged production:
    - account/status collection, store, retained-record, financial-map and array reflection traps
      either escaped as exceptions or were never observed;
    - transaction and financial accessors were invoked;
    - iterator, index and length traps escaped during hierarchy/duplicate traversal;
    - hidden Bob and unexpected-symbol financial values were accepted as plausible totals;
    - a prototype-spoofed class proxy was read directly and threw; and
    - the generated descriptor-shape property failed immediately at seed `26072506`, minimized to an
      allocation `ownKeys` trap.
- Every new F-05 mechanism failed under unchanged production:
    - missing, null, numeric, empty and mismatched account-tree identities were accepted;
    - a transaction/tree account mismatch reached a misleading `missing-account` issue;
    - non-finite, fractional, negative-zero, unsafe and out-of-supported-range years; invalid
      months/days; impossible leap/short-month dates; and dates outside the Temporal boundary were
      accepted;
    - the generated numeric hierarchy property failed immediately at seed `26072507`, minimized to a
      `NaN` month.
- All pre-revision focused expectations stayed green during red. No production correction preceded
  or weakened the committed red checkpoint.
- The first installed-CLI journey then exposed a fresh integration regression that isolated tests
  had not modeled: root Loro mirrors carry their own non-enumerable string `$cid`. The production
  snapshot rejected that sanctioned runtime metadata and the People page rendered
  `Settlement incomplete` with account, status and store-root hierarchy issues.
- The exact separately checked-in mirror red test is `3d2a51e56060388c4d34f6181eb2d806d8259bb6`
  (`test: capture P16B mirror metadata regression`). It changed only the settlement test and uses
  the established `createVaultMirror`/`initializeVaultDefaults` runtime path. Production remained
  byte-identical to first green at SHA-256
  `e873d623ed622a4dc48a93bbdc43076b98eea5d5e3c4a8116f9e6df0b1f40831`; the test failed with the three
  observed hierarchy issues rather than accepting a misleading settled result.

## Remediation mechanisms and preserved core

### Complete materialized snapshots

- The settlement runtime now has reusable exception-safe record and array snapshot boundaries. They
  inspect only prototype, own keys and own property descriptors inside `try/catch`; they never call
  a property getter, array iterator or caller-owned index/length getter.
- Records accept only an observable ordinary/null prototype, own enumerable string data fields and
  no symbol/accessor/hidden fields, except the exact Loro mirror metadata contract: an own
  non-enumerable data `$cid` whose value is a string. Arrays accept only an observable array
  prototype, the canonical non-enumerable data `length`, and a complete dense set of own enumerable
  data indices with no extra strings or symbols. Every accepted value is copied into newly created
  safe storage with `$cid` retaining its non-enumerable descriptor.
- Prototype, `ownKeys`, descriptor, revoked/inconsistent proxy and accessor failures become stable
  contextual issues. Transparent wrappers that are observationally identical to approved data are
  copied and remain valid; downstream code never touches their traps.
- The boundary is applied before enumerating or reading account/status collections and entries,
  store/tree/year/month/day/transaction records, every hierarchy array, duplicate lists and nested
  duplicate records, and allocation/ownership maps. Identity selection encodes only scalar fields
  and a safely materialized scalar financial-map representation; an object-valued core field is
  never recursively traversed.
- Invalid store/hierarchy shapes use static non-sensitive `invalid-hierarchy` contexts. Invalid
  duplicate and financial containers retain their existing transaction-scoped issue contracts. Valid
  siblings remain calculable, while any retained issue prevents an issue-free settled claim.

### Canonical identity and supported calendar

- Each account tree now requires a non-empty string `accountId` equal to its map key. Every retained
  transaction must carry that same account ID; mismatch is atomically excluded with the static
  transaction-account hierarchy path.
- Year, month and day must be finite safe integers and not negative zero. Year support and the exact
  Gregorian date are validated with the repository's installed `temporal-polyfill`
  `Temporal.PlainDate` using `overflow: "reject"`; month/day bounds are rejected at their own
  hierarchy level.
- Leap day `2024-02-29` and the supported boundary dates `-271821-04-19` and `+275760-09-13` remain
  valid. Adjacent unsupported dates, impossible dates and years with no supported date are excluded
  without calculating their transactions.

### Preserved canonical engine

- `settlement.ts` remains the sole callable implementation and accepts only the retained
  `TransactionStore`; no compatibility overload, alternate engine, persistence or caller-side
  flattening was introduced.
- Revision-03 active-copy selection, nested exclusion, collision-free derivation/calculation caches,
  issue completeness, exact signed apportionment, deterministic matching, reverse netting, source
  traceability, currency isolation, caller purity and recursive result freezing remain green.
- The components guide caused no component write: the current BalanceSummary caller contract was
  preserved and verified. The E2E guide required repository-installed headless CLI and one-worker,
  zero-retry Chromium gates; no component, E2E or configuration path was edited.
- The exact first green is `8e607a1254e7494eaf4a0ca9fab64826e810bfee`
  (`fix: materialize settlement runtime boundaries`). The separately reviewed mirror correction is
  `e09eb6bdbbfd796d970d85ef36c212795bcb4912` (`fix: admit sanctioned Loro metadata snapshots`):
  seven additions/two deletions limited to the record snapshot boundary. Arbitrary hidden fields,
  non-string `$cid`, symbols, accessors and reflection failures remain rejected.

## Fixed-seed and direct coverage

- Focused settlement coverage now collects 141 tests: 140 normal tests pass and the scale benchmark
  remains opt-in.
- F-04 direct coverage includes:
    - prototype, `ownKeys` and descriptor traps on collection/store/transaction/financial/array
      boundaries;
    - record and array accessors, iterator/index/length traps, hidden values and unexpected symbols;
    - duplicate-list and nested-record failure context;
    - transparent prototype spoofing copied without direct access;
    - real initialized Loro mirror roots with sanctioned non-enumerable string `$cid`;
    - object-valued core identity input not traversed;
    - ordinary/null-prototype financial records;
    - atomic issue/output assertions, caller mutability and immutable results.
- F-05 direct coverage includes:
    - missing, null, numeric, empty and different account-tree IDs;
    - transaction/tree identity mismatch;
    - `NaN`, positive/negative infinity, fractions, negative zero and unsafe integers;
    - month/day numeric bounds, supported-year bounds, leap day, non-leap February and short-month
      impossibilities;
    - exact lower/upper Temporal boundary dates and adjacent invalid dates.
- New mechanism-generating properties are independent of a finite factory list:
    - seed `26072506`, 300 runs: generated property names/percentages, boundary choice and
      prototype/ownKeys/descriptor/accessor/hidden/symbol mechanisms, with exact atomic issue
      oracle;
    - seed `26072507`, 500 runs: generated integers, doubles and exceptional numbers, with an
      independent `Temporal.PlainDate` supported-year/full-date oracle and exact hierarchy context.
- All prior fixed-seed rational, currency, collision/NUL/Unicode, malformed-entry and insertion
  properties remain green, including the independent 5,000-case BigInt rational oracle.

## Automation and benchmark

### Focused, broader, full and static gates

- Three final exact-HEAD focused processes each passed 3 files / 159 tests plus one skipped
  benchmark in 4.56, 4.59 and 4.63 seconds.
- Broader domain/current-caller passed 14 files / 558 tests plus two skips in 12.02 seconds.
- Full Vitest passed 63 files / 1,450 tests plus two skips in 6.48 seconds.
- `pnpm typecheck` passed. Exact two-path ESLint and oxfmt checks passed without diagnostics;
  cumulative `git diff --check 4c102600240e2804b801c2a320e10164defb14ea..HEAD` passed.
- Repository `pnpm lint` passed with zero errors and the same ten inherited warnings: one TanStack
  virtualizer compiler warning, two unused query types and seven unused existing CRDT-test
  types/imports. No warning names a P16B path.
- Production `pnpm build` passed: optimized compilation 5.2 seconds, TypeScript 8.5 seconds and all
  17 routes generated.
- Repository `pnpm format:check` reports only the inherited 14 Markdown paths: six current ledgers,
  P12 implementations 03-06, P12 reviews 05-06, P14 implementation 01 and `specs/human-scratch.md`.
  This evidence was formatted directly while remaining the required uncommitted artifact; no
  inherited file was rewritten.

### Browser gates

- Accounts/Transactions Chromium passed 46/46 in 2.9 minutes.
- Full Chromium passed 102/102 in 6.6 minutes.
- Both commands used one worker, Chromium, retries zero and read-only E2E files. Deliberate
  offline/authentication/realtime diagnostics appeared only in journeys that exercise those states;
  no test failed or retried.

### Deterministic full-output scale

- Node `v22.21.1`; deterministic fixture construction excluded; retained hierarchy projection
  included; five 1,000-transaction warmups; full immutable output materialized.
- Command:
  `P16B_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/settlement.test.ts -t 'production settlement scale' --pool=forks --maxWorkers=1 --disableConsoleIntercept --reporter=verbose`.
- Results: 10,000 `79.32`ms; 50,000 `387.07`ms; 100,000 samples `793.97`, `783.69`, `861.52`,
  `754.47`, `774.82`ms.
- Every 100k sample returned 100,000 qualifying transactions, 75,000 positive source contributions,
  two obligations and zero issues; per-currency position and signed-source conservation passed.
- This evidence does not claim the strict 200ms target. Complete defensive materialization is now
  visible in the retained projection cost. P16E retains the recorded production-profile,
  stable-revision/memoized-projection and safe interning follow-up; correctness, privacy and
  traceability were not weakened to hide the cost.

## Installed-CLI functional, responsive and privacy evidence

- All interaction used the repository-installed `playwright-cli` with the uniquely prefixed
  `p16b-impl-04` session. No browser automation library or hand-written browser test was used.
- The initial journey was deliberately stopped when People rendered the mirror-metadata failure
  described in the separate red checkpoint above. Its browser was closed and its local data removed
  before the correction.
- A wholly fresh post-correction journey generated a 12-word identity phrase, counted exactly 12
  masked word fields and confirmed the single `Click to reveal` control. The phrase was never
  revealed, read, copied or included in output. Identity creation landed on Vault Settings.
- People initially rendered `Settlement Summary`, `Everyone is settled up` and no
  `Settlement incomplete`. Creating person `P16B04Bob` preserved that result. Accounts rendered
  `Default`, default currency `USD`, `Me (100%)` and `$0.00`.
- Transactions created and saved two real Default-account rows: `P16B04Groceries` / `-100.00` /
  `Paid`, and `P16B04Pending` / `-20.00` / `For Review`. Independent reloads retained both rows,
  values and statuses. People retained Bob, the summary and settled state with no incomplete
  warning.
- At a 390x844 viewport, dark color preference, reduced motion and 200% document zoom, the mobile
  menu remained operable and navigated back to People. Settlement Summary remained visible at
  x=98/y=366, width=257/height=112 CSS pixels. Measured horizontal extent was 134 physical pixels
  (`root client/scroll 390/524`, logical body client/scroll 195/262); a complete rightward and
  return-to-zero scroll proved the content remained reachable rather than silently clipped.
- A transient Next dev-HMR invalid-response interruption occurred only after those assertions. Root
  restarted the memory-only server at exact product HEAD while preserving the browser profile.
  Reload then independently recovered both transactions and People state. Final fresh-page console
  inspection contained five informational entries, zero errors and zero warnings.
- For privacy, the pending description was changed to `P16B04PendingPrivate` while waiting for the
  exact `sync.pushOps` response. It returned HTTP 200; boolean-only inspection found the private
  marker in neither URL nor POST body and the UI retained the committed value. A following reload
  retained both rows/amounts and the renamed value.
- Boolean-only storage inspection searched `P16B04Bob`, `P16B04Groceries` and
  `P16B04PendingPrivate`: one localStorage entry, 14 sessionStorage entries, and 14 records across
  three stores in one IndexedDB database all reported no plaintext marker. No stored value was
  printed.
- The final network inventory contained nine dynamic requests, all HTTP 200: one WASM request, vault
  list, two sync update requests, three realtime authorizations, one realtime revoke and the
  observed sync push. Fifty-one successful static requests were omitted by the CLI inventory.
- The final browser was closed; delete-data found no remaining prefixed profile; installed CLI
  listed no open browsers. Root separately owns server shutdown and recoverable artifact cleanup.

## Paths, commits and review request

- Authorized product/test paths only:
    - `src/lib/domain/settlement.ts`: 1,237 lines / 47,177 bytes / SHA-256
      `1cc750de91555e2c4c84a142930c28f48c144599224b50d884ab183761cce092`;
    - `tests/unit/domain/settlement.test.ts`: 2,720 lines / 104,548 bytes / SHA-256
      `19fe6fb8cb9ea657f23df0e89a96368a5b2440e6c70966392811566ada4f1def`.
- Revision-04 range
  `e9ece18b11cd3ad0b6b8783b6c80200599e617fd..e09eb6bdbbfd796d970d85ef36c212795bcb4912` changes those
  two paths only: 1,027 insertions / 103 deletions (settlement 281/85; test 746/18).
- Cumulative original review range
  `4c102600240e2804b801c2a320e10164defb14ea..e09eb6bdbbfd796d970d85ef36c212795bcb4912` contains 17
  paths / 6,279 insertions / 906 deletions: prior immutable artifacts/root transitions and
  revision-01 owners plus revision-04's exact two authorized paths. The authorized product/test
  subtotal is 3,784 insertions / 412 deletions (settlement 1,196/145; test 2,588/267).
- Ordered revision-04 product/test commits:
    1. `0d96c25c50f86590c5c7df3dccc8370ea247e9e3` — F-04/F-05 red;
    2. `8e607a1254e7494eaf4a0ca9fab64826e810bfee` — complete snapshots/canonical identity/calendar
       green;
    3. `3d2a51e56060388c4d34f6181eb2d806d8259bb6` — runtime mirror red;
    4. `e09eb6bdbbfd796d970d85ef36c212795bcb4912` — sanctioned Loro metadata green and final HEAD.
- This implementation artifact remains intentionally uncommitted for root/reviewer identity capture.
  No review file was created or modified. Independent review is requested for the exact cumulative
  immutable range and this sole evidence artifact; this evidence does not claim review approval.

## Frozen boundaries and cleanup

- Final frozen-source verification:
    - `specs/human-scratch.md` `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`,
      350 lines / 24,250 bytes;
    - immutable FS-001 `specs/008-transaction-percentage-allocations-settlement/spec.md`
      `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes;
    - `SCOPE.json` `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
      27,382 bytes;
    - revision-01 evidence/review `48f10876f8e69e7f3bff022598c0236a775d061e1cc06a86cb3d48bfc60d3dfd`
      (323 / 21,736) and `5dd6be1a1efbdbecb0a4a3e42e54ec7d0b55a05555deebd88c3009c97fd7df38` (314 /
      18,758);
    - revision-02 evidence/review `75f0b7e4c7ca72c38be5843a2ef2e0de032a9b2539979990573068ef08c5c75e`
      (264 / 18,293) and `09814cd6a719189afd4951e6683b2f216d6eace729fe230d55add4a2c497054f` (329 /
      19,155); and
    - revision-03 evidence/review `f3dc7f26695109ec941eb308846872474cba72008e824970a86d7189334ef649`
      (298 / 18,960) and `5eac6d9a52f5cf96fe921df734a4f52367b898ce94a7af9130ee6af21883af8d` (377 /
      21,986).
- Root cleanup is complete: server session `76428` stopped; listener PID `2555017` stopped; port
  3000 is clear; generated `next-env.d.ts` restored; current `.next` moved to recoverable
  `trash:///`; `test-results` was already absent; all and only the 32 enumerated revision-04 CLI
  artifacts moved to recoverable trash. `.playwright-cli` changed from 54 to 22 files, preserving
  every older artifact; the old `playwright-report` remains untouched.
- Product index/worktree is clean. The sole status entry is this untracked evidence. No scratch
  checkbox, canonical FS-001 byte, task, ledger, prior artifact, BalanceSummary, shared
  CRDT/query/schema owner, E2E/configuration path or future review was changed by this worker.
