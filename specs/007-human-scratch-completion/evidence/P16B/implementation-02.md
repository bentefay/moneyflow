# P16B Implementation Evidence — Revision 02

## Immutable dispatch boundary

- Package / requirement / revision: `P16B` / `FS-001` / `02`.
- Literal original cumulative review BASE: `4c102600240e2804b801c2a320e10164defb14ea`.
- Revision-01 product/test HEAD: `5242a2422cd86dd48eac07a4422491d5079ccd23`.
- Revision-01 failure integration / clean pre-revision HEAD:
  `e33453f098f4bdea62d6ea358d2e86b5d0f9356b`.
- Root dispatch/control and clean pre-product HEAD: `125f50ff404f088d3dbb70c578b1cdc548f755ea`.
- This sole revision-02 worker artifact was created before any test or product edit. The index and
  worktree were empty at implementation start.
- Immutable revision-01 evidence and review matched their dispatched SHA/line/byte identities.
  Future `reviews/P16B-review-02.md` did not exist and was not created.

## F-01/F-02/F-03 red reproductions

- The evidence file existed before any product/test edit. With revision-01 product owners still
  byte-identical (`settlement.ts`
  `6a2e4a64846a606e3b9fe3ba3f6875df45c512ac06620ffed37d5f7d8699e8d3`, `BalanceSummary.tsx`
  `028cabacc06341939f4ae82734da7526c6b4a405273dd2e1507a6c2a1fd8e3d9`), the checked-in red tests
  commit was `6574405d1635c957299ef4650ccbc9bbfc7e0a00`
  (`test: capture P16B retained-state regressions`).
- The focused red process collected 48 tests and failed 18:
    - missing/null allocation and ownership maps threw at `Object.entries`;
    - missing duplicate lists threw during iteration;
    - numeric currency threw at `toUpperCase`;
    - hierarchical stores threw because the public boundary still expected an array;
    - both component expectations received a materialized array instead of the retained store;
    - active/deleted relocation, duplicate-bucket and deleted-parent topology cases could not enter
      the array boundary; and
    - the reviewer's exact allocation pair `{ a: "x|1:b=string:y" }` / `{ a: "x", b: "y" }` lost the
      second `b` issue through a fingerprint collision.
- The same red process already passed the NUL-directed-pair probe. It remained checked in as a
  preservation guard while the implementation removed every composite aggregation key.
- The red commit touched only the two authorized tests. The two product owners remained
  byte-identical until that exact failing checkpoint was committed.

## Remediation mechanisms and preserved core

### Safe retained runtime boundary

- Missing `transaction.allocations` is sanitized to a shared frozen empty record only for
  calculation. The caller's retained transaction remains mutable and unaliased. Null, array and
  primitive allocation containers produce one contextual `invalid-allocation / invalid-container`
  issue and no financial contribution.
- Missing/null/array/primitive ownership containers produce contextual
  `invalid-ownership / invalid-container`; missing duplicate lists become empty, while null,
  primitive, non-list and mixed duplicate containers produce contextual
  `invalid-transaction / invalid-duplicate-list`.
- Accounts, statuses, transaction trees, hierarchy buckets, core transaction fields, allocation
  maps, ownership maps and duplicate lists are narrowed from `unknown` before object, iterable or
  string operations. Non-string account/default currency yields `invalid-currency / not-string`;
  invalid strings retain the code with `invalid-code`; empty/missing account and vault currencies
  retain the canonical USD fallback.
- P16A validation remains unchanged. Every invalid allocation/ownership entry still receives its
  original exact P16A reason. A malformed transaction is excluded atomically, output issue and
  success graphs are recursively frozen, and retained inputs are neither frozen nor mutated.

### Canonical topology at the sole public boundary

- `calculateSettlementBalances` now accepts only `TransactionStore`; no array overload or
  compatibility wrapper remains. `BalanceSummary` passes the retained store directly and no longer
  calls `getAllTransactions`.
- A settlement-local read-only projection traverses Account -> Year -> Month -> Day -> top-level
  transaction. It ignores maintenance shadows, gathers nested logical IDs from all retained public
  parents (including deleted parents and deleted nested records), filters deleted top-level physical
  copies before canonicalization and excludes every nested logical ID.
- Active same-ID copies are selected deterministically by `$cid`, with a length-framed, type-tagged
  semantic fallback when `$cid` is absent. Final logical transactions and issues are sorted
  independently of tree, bucket, list and map insertion order. An invalid duplicate-list copy marks
  its whole logical ID invalid, so another physical copy cannot manufacture a plausible total.

### Collision-free local caches and aggregation

- Invalid/failure derivations are never cached. The only derivation-cache entries are successful
  numeric allocation/ownership records. Each component uses sorted, length-framed string keys and
  type-complete number identities (`-0`, finite, non-finite and `NaN` are distinct before success
  admission); ownership and allocation are separate nested `Map` dimensions rather than a
  delimiter-concatenated key.
- Calculation caching uses the successful immutable derivation object in a `WeakMap`, then the
  signed numeric amount as its own `Map` key. Currency is deliberately applied only after the
  currency-independent exact calculation.
- Positions are `currency -> personId` nested maps. Directed aggregates are
  `currency -> debtorId -> creditorId` nested maps, and unordered pairs are nested
  `currency -> leftId -> rightId` sets. Person/account IDs containing NUL, delimiters, empty
  strings, combining Unicode or supplementary Unicode can no longer alias.
- All caches remain per-call and ephemeral. Cached successes contain no transaction/account issue
  context; every failure is freshly mapped to the current transaction/account/person.
- The revision preserved named examples A-H, exact signed P16A positions, largest-remainder
  apportionment, deterministic matching, reverse netting, signed source traceability, cross-currency
  isolation, safe aggregate rejection, unknown/deleted People behavior, issue privacy, result
  freezing, caller-input purity and the incomplete-state UI.

## Fixed-seed and direct coverage

- Final focused files collect 72 tests: 71 passed and the opt-in benchmark skipped. Direct
  revision-02 cases cover:
    - missing allocation and duplicate maps;
    - null, array, primitive, non-list and mixed allocation/ownership/duplicate containers;
    - string, object, array, `-0`, `NaN` and both infinities as invalid entry values;
    - non-string/invalid currency and absent fallback;
    - immutable result with mutable, byte-stable transaction store/accounts/statuses;
    - active/deleted same-ID copies in both list and `$cid` orders;
    - exact active copies in separate buckets and reversed bucket order;
    - active/deleted parent and nested topology combinations;
    - the exact reviewer allocation collision and corresponding ownership collision;
    - NUL-delimited directed pairs, invalid/valid cache separation, signed amounts and USD/EUR; and
    - deterministic qualifying counts, contributions, issues and complete issue context.
- Fixed independent properties:
    - seed `16001611`, 1,000 signed amount/percentage cases against a BigInt hundredths oracle;
    - reviewer seed `26072501`, 5,000 two-owner/two-explicit-Person cases, including explicit
      `-1/0/1`, alternating allocation/ownership insertion, positive/zero/negative owner remainder
      and an independent denominator-10,000 BigInt rational oracle;
    - reviewer seed `26072501`, 1,000 batches of exactly eight signed USD/EUR transactions,
      reversed-store equality, independent Alice/Bob currency sums and signed source conservation;
    - seed `26072502`, 500 generated delimiter/NUL/empty/combining/supplementary-Unicode ID
      permutations across valid success paths; and
    - seed `26072503`, 500 generated malformed-entry insertion permutations, asserting every
      distinct Person issue survives and no transaction qualifies.
- The safe aggregate limit remains a direct production test. Properties compare concrete positions,
  issue IDs and source sums; none succeeds solely by comparing empty results.

## Automation and benchmark

### Focused, broader, static and browser gates

- Three clean focused processes used:
  `pnpm exec vitest run tests/unit/domain/settlement.test.ts tests/unit/domain/balance.test.ts tests/unit/components/balance-summary.test.tsx --pool=forks --maxWorkers=1`.
  Each passed 3 files / 71 tests plus 1 benchmark skip in `4.05`, `3.96` and `3.99` seconds.
- Broader domain/current caller passed 14 files / 470 tests plus 2 skips in 11.42 seconds.
- Full `pnpm test -- --pool=forks --maxWorkers=1` passed 63 files / 1,362 tests plus 2 skips in 6.66
  seconds.
- `pnpm typecheck` passed. Exact four-path ESLint and oxfmt checks passed with no diagnostics;
  `git diff --check` passed. Repository lint passed with 0 errors and the same 10 inherited warnings
  (TanStack virtualizer, unused query types and unused existing CRDT-test types/imports); no warning
  names a P16B path.
- Production `pnpm build` passed: optimized compilation 5.2 seconds, TypeScript 8.4 seconds, 17
  routes generated.
- Repository format baseline failed only on the inherited 14 Markdown paths plus this unformatted
  draft. Formatting this artifact removes the draft from that set; no inherited file was rewritten.
- The first affected-browser launch correctly refused the already-running manual server because
  repository configuration fixes `reuseExistingServer: false`. Root stopped that clean server; the
  actual affected run then passed Accounts/Transactions 46/46 in 3.0 minutes. Full Chromium passed
  102/102 in 6.7 minutes. Both used one worker, zero retries and read-only E2E files. Expected
  offline/auth/presence diagnostics occurred only in journeys that deliberately exercise them.

### Deterministic full-output scale

- Node `v22.21.1`; deterministic store construction excluded; hierarchical projection included; five
  1,000-transaction warmups; full immutable positions/contributions/obligations/issues materialized.
- Command:
  `P16B_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/settlement.test.ts -t 'production settlement scale' --disableConsoleIntercept`.
- Results: 10,000 `28.41`ms; 50,000 `132.41`ms; 100,000 samples `264.55`, `288.03`, `270.07`,
  `256.16`, `259.44`ms.
- Every 100k sample returned 100,000 qualifying transactions, 75,000 positive source contributions,
  two obligations and zero issues; per-currency position and signed-source conservation passed.
- This evidence does not claim a strict 200ms target. P16E retains the explicit follow-up: profile
  projection/sorting/output allocation in a production bundle; add query-boundary stable revision
  fingerprints and memoized sorted projections without persisting settlement; evaluate safe interned
  tuple structures and immutable trace sharing; retain this exact 100k full-output oracle and accept
  an optimization only when all five samples meet the agreed envelope without reducing correctness,
  privacy or traceability.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli`, unique disposable session `p16b-impl-02`
  and root's in-memory-keyed `http://localhost:3000` server. No MCP browser, `npx`,
  headed/debug/UI/dashboard mode, temporary script/test or arbitrary sleep was used.
- Fresh onboarding generated 12 masked word cells and zero visible recovery text inputs. The words
  were never revealed, read, copied, emitted or recorded; the masked confirmation path created the
  identity.
- Real current flow:
    - created Person `P16B02Bob`;
    - verified Default/USD retained `Me (100%)`;
    - created `P16B02Travel`, observed `Me (50%), P16B02Bob (50%)`, and selected EUR through the
      custom currency picker;
    - created Paid Default/USD expense `P16B02Groceries` `-100.00`;
    - created For Review Travel/EUR expense `P16B02Pending` `-20.00`, later renamed
      `P16B02PendingPrivate` solely for the encrypted-write probe; and
    - reloaded, then verified both People, both accounts/ownership/currencies, both
      transaction/account/status/amount combinations and the renamed row persisted.
- People honestly displayed
  `Settlement Summary / No outstanding balances between members / Everyone is settled up` before and
  after reload. No explicit allocation was manufactured: the only paid transaction has no explicit
  allocation and therefore equals Default's 100% owner; the EUR transaction is non-paid. P16D
  editing and P16E source/navigation/neutral UI are not surfaced or claimed.
- Responsive/preference evidence:
    - viewport 390x844, document zoom 2, dark preference true and reduced-motion preference true;
    - root client/scroll widths 390/524 and body client/scroll widths 195/262; horizontal range
      x=0..134 was exercised and returned to zero;
    - at x=0, Settlement Summary occupied x=98..354; after scrolling into view the settled line
      occupied x=50..340 and y=472..552 inside the 390x844 viewport; and
    - computed body background remained the current light `lab(100 0 0)` despite dark preference.
      This is observation only; P16E owns final theme acceptance.
- Boolean-only privacy evidence emitted no stored/request values:
    - a listener observed 8 dynamic non-GET POSTs around navigation/write; every exact marker flag
      was false. Final request inventory showed 10 dynamic POSTs, including one encrypted
      `sync.pushOps`, all HTTP 200; 51 static requests were omitted by the CLI default list;
    - 1 localStorage entry, 5 sessionStorage entries and 1 IndexedDB / 3 stores / 13 entries each
      had `exactMarker: false` for all four complete markers; and
    - console inspection reported 5 messages, 0 errors and 0 warnings.
- One excluded readiness probe used `body.textContent` for an input value and timed out before its
  later `networkidle` clause; direct role/snapshot and reload checks proved the edit and
  persistence. It caused no mutation and contributes no acceptance claim. A cleanup-inventory shell
  loop briefly shadowed zsh's special `path` variable; the affected read-only commands did not run,
  and the inventory was immediately rerun with a task-specific variable.
- Session close succeeded, `delete-data` found no remaining user data, and final CLI list returned
  `(no browsers)`. Root stopped server session `13622`, confirmed port 3000 clear, restored
  `next-env.d.ts`, and moved current `.next`, `test-results` and the exact 35 new CLI artifacts to
  recoverable trash. Zero current artifacts remain; all 22 older CLI artifacts and the older
  `playwright-report` are preserved.

## Questions and risks

- No material ambiguity remains and no `Q-PROPOSAL-P16B-02-*` is required.
- The measured 100k projection/output path remains above a strict 200ms interpretation. It is
  reported honestly with the complete P16E follow-up above; correctness, issue completeness and
  source traceability were not weakened to chase it.
- Runtime cache identities are collision-free because only successful numeric maps are cached and
  every component occupies its own framed/nested key dimension. Invalid/malformed runtime values are
  intentionally recomputed so transaction/account/person context cannot be lost.
- Recursive freezing is restricted to newly constructed, known-acyclic output. The retained store,
  accounts and statuses remain mutable caller-owned objects.

## Boundary and cleanup

- Green product commit / proposed revision-02 review HEAD:
  `50b36beb0c7cf9a73d623ed964b6ba05919fffc6` (`fix: harden retained settlement boundaries`).
- Exact revision-02 package delta
  `125f50ff404f088d3dbb70c578b1cdc548f755ea..50b36beb0c7cf9a73d623ed964b6ba05919fffc6` contains
  exactly four authorized paths / 1,187 insertions / 192 deletions:
    - `src/lib/domain/settlement.ts`;
    - `src/components/features/people/BalanceSummary.tsx`;
    - `tests/unit/domain/settlement.test.ts`; and
    - `tests/unit/components/balance-summary.test.tsx`.
- Literal cumulative review range
  `4c102600240e2804b801c2a320e10164defb14ea..50b36beb0c7cf9a73d623ed964b6ba05919fffc6` contains 13
  paths / 3,404 insertions / 922 deletions: the revision-01 product/test owners and immutable
  artifacts, root-owned HANDOFF/PROGRESS/RISKS transitions and this revision's exact four
  product/test paths. The revision-02 worker edited only its exact four authorized product/test
  paths and this assigned evidence.
- Final four-path SHA-256 identities:
    - `settlement.ts` `f82320017d5212d8160f41b56ad354070b1bf5e05154f35976a4ef73d991f44e`;
    - `BalanceSummary.tsx` `f058671fd0feb5255a74bba317a1f2f29432be7ac4f0c479660c1643da4700cb`;
    - `settlement.test.ts` `2f963d85561cf7f4162948701e2bb418d105e6a8120cafadd49733968a157876`;
    - `balance-summary.test.tsx` `77c85b8fa572b72f0bad31afc79e7c906f66b3b26472bea5dd9892e78e84a2ac`.
- Product index/worktree are clean. The sole worktree path is this untracked/uncommitted evidence;
  future `reviews/P16B-review-02.md` remains absent.
- Final frozen-source verification:
    - `specs/human-scratch.md` `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`,
      350 lines / 24,250 bytes;
    - immutable FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines
      / 25,441 bytes;
    - `SCOPE.json` `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
      27,382 bytes;
    - revision-01 evidence `48f10876f8e69e7f3bff022598c0236a775d061e1cc06a86cb3d48bfc60d3dfd`, 323
      lines / 21,736 bytes; and
    - revision-01 review `5dd6be1a1efbdbecb0a4a3e42e54ec7d0b55a05555deebd88c3009c97fd7df38`, 314
      lines / 18,758 bytes.
- No scratch checkbox, canonical FS-001 byte, task, ledger, P16A/P16B revision-01 artifact, shared
  CRDT/query/schema owner, E2E/configuration path or future review was changed by this worker.
- This is implementer evidence only. It does not claim independent review or PASS. FS-001 remains
  open through the remaining lifecycle gates.
