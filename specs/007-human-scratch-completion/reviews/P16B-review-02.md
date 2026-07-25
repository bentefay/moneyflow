# P16B Independent Review — Revision 02

## Review identity and verdict

- Package / requirement / revision: `P16B` / `FS-001` / `02`.
- Literal cumulative reviewed product range:
  `4c102600240e2804b801c2a320e10164defb14ea..50b36beb0c7cf9a73d623ed964b6ba05919fffc6`.
- Exact revision-02 product/test delta:
  `125f50ff404f088d3dbb70c578b1cdc548f755ea..50b36beb0c7cf9a73d623ed964b6ba05919fffc6`.
- Frozen implementation evidence: `evidence/P16B/implementation-02.md`, SHA-256
  `75f0b7e4c7ca72c38be5843a2ef2e0de032a9b2539979990573068ef08c5c75e`, 264 lines / 18,293 bytes. The
  evidence freeze commit is `c43d07ead0af9c0d72ff9a457cc8d2fc2377cbd2`.
- Frozen prior failed review: `reviews/P16B-review-01.md`, SHA-256
  `5dd6be1a1efbdbecb0a4a3e42e54ec7d0b55a05555deebd88c3009c97fd7df38`.
- Corrected review/control HEAD before this artifact is `c2ae5701e4f1688133ea2b7b620d794fa3703373`;
  the assigned product/test HEAD remains exactly `50b36beb0c7cf9a73d623ed964b6ba05919fffc6`.
- The cumulative range contains 13 paths and has 3,404 insertions / 922 deletions. The exact
  revision-02 delta contains exactly the four assigned paths and has 1,187 insertions / 192
  deletions: `src/lib/domain/settlement.ts`, `src/components/features/people/BalanceSummary.tsx`,
  `tests/unit/domain/settlement.test.ts`, and `tests/unit/components/balance-summary.test.tsx`.
  `git diff --check` passes.
- **Verdict: FAIL.** Revision 02 closes review-01 F-01, F-02 and F-03 for the cases assigned, and
  its arithmetic, deterministic topology selection, collision-free successful cache, caller,
  regression, browser and manual happy-path evidence all pass. Two retained-runtime boundary defects
  remain: non-plain allocation containers can be treated as valid empty allocation maps, and
  malformed transaction-store hierarchy nodes can disappear without an issue. Each can yield an
  issue-free, plausible settled result from invalid retained data.

## Findings

### F-04 — Non-plain allocation containers are accepted as valid empty records

**Severity:** blocking.

The shared runtime predicate accepts every non-null, non-array object:

```text
src/lib/domain/settlement.ts:179-181
return value != null && typeof value === "object" && !Array.isArray(value)
```

The allocation boundary then accepts anything satisfying that predicate
(`src/lib/domain/settlement.ts:842-857`). `Map`, `Set`, `Date`, class instances and other non-record
objects therefore pass as allocation records. `Object.entries` observes common instances such as
`Map` and `Date` as empty, so the engine derives the full owner remainder instead of returning the
intended `invalid-allocation` / `invalid-container` issue.

A reviewer-owned in-memory production-bundle probe used an otherwise valid retained paid USD
transaction for an account owned 100% by Alice:

```text
allocations: new Map([["bob", 100]])
amount: -100
```

Observed:

```json
{
    "issues": [],
    "obligations": [],
    "positions": [{ "currency": "USD", "people": [{ "personId": "alice", "amountMinor": 0 }] }],
    "qualifyingTransactionCount": 1
}
```

Replacing the `Map` with `new Date(0)` produced the same issue-free qualifying result. The `Map`
actually directs 100% to Bob, so treating it as empty is not merely incomplete diagnostics: it
changes a Bob-to-Alice obligation of 100 into a false settled total.

The checked-in parameterized allocation-container test covers only `null`, array, number and string
(`tests/unit/domain/settlement.test.ts:496-516`). It does not cover `Map`, `Set`, `Date`, a
non-plain class instance or other object containers, so its pass does not exercise this boundary.
The same permissive predicate also guards ownership and materialized collection values; the
correction must not leave an equivalent financial-map ambiguity at those boundaries.

Required correction:

1. Distinguish the intended materialized record envelope from arbitrary objects. A valid map may
   have `Object.prototype` or a null prototype as the contract requires, but collection/date/class
   instances must not silently become empty records.
2. Preserve the canonical special case that `allocations === undefined` means a valid empty
   allocation map.
3. Return a stable typed issue and zero qualifying contribution for every invalid object container.
4. Add direct production tests for `Map`, `Set`, `Date`, class instances and the same adversarial
   shapes at ownership/other financial-map boundaries, including a non-empty `Map` whose silent
   conversion would otherwise change the obligation.

### F-05 — Malformed retained hierarchy nodes silently disappear from the projection

**Severity:** blocking.

`projectTransactionStore` validates the store root, but then silently skips malformed descendants:

- a non-record account tree is skipped at `src/lib/domain/settlement.ts:310-312`;
- a non-array `years` value is skipped at `src/lib/domain/settlement.ts:314-315`;
- invalid year/month/day envelopes are skipped at `src/lib/domain/settlement.ts:317-323`; and
- no topology issue is added for any of those branches.

A reviewer-owned production-bundle probe supplied:

```json
{
    "tree": {
        "accountId": "acc",
        "years": null
    }
}
```

Observed:

```json
{
    "contributions": [],
    "issues": [],
    "obligations": [],
    "positions": [],
    "qualifyingTransactionCount": 0
}
```

The retained subtree has not been proven empty; it is malformed and has been discarded. An
issue-free zero result is therefore a plausible invalid total. `BalanceSummary` suppresses a settled
claim when issues exist, but there is no issue here, so the UI has no way to distinguish this
invalid projection from genuinely settled data.

The revision-02 tests prove valid parent/nested selection, deleted/active same-ID handling and an
invalid store root. They do not cover malformed account-tree, years, months, days or transactions
containers. Full unit and Chromium passes therefore do not close this retained-topology boundary.

Required correction:

1. Emit a deterministic contextual topology/invalid-transaction issue whenever a retained hierarchy
   envelope required for settlement has an invalid shape.
2. Preserve only explicitly sanctioned CRDT metadata/sentinel exemptions; do not report expected
   `$cid` placeholders as malformed data.
3. Ensure any malformed retained subtree prevents an issue-free settled claim, without committing
   partial plausible totals from that subtree.
4. Add tests for null, primitive, object, array and mixed-invalid shapes at tree, years, months,
   days and transactions levels, including insertion permutations, stable issue ordering, immutable
   results and no input mutation.

## Revision-01 finding closure audit

Revision 02 materially closes the three earlier findings for their assigned cases:

- **F-01 closed for the reported cases.** Missing `allocations` now means an empty record; missing
  duplicate lists are accepted; malformed duplicate lists, ownership containers and currency values
  return typed issues rather than throw. Reviewer probes for missing allocations, missing
  duplicates, missing ownership and numeric currency returned deterministic results without an
  exception.
- **F-02 closed for the reported cases.** The public engine now accepts the retained
  `TransactionStore` directly. It builds nested identity from retained parent topology and filters
  deleted representations before same-ID selection. Reviewer probes selected the live representation
  over a lower-sorting deleted copy, excluded retained nested identities and rejected the retired
  flat-array runtime input with a typed issue.
- **F-03 closed.** Numeric successful derivations use framed keys and nested maps; validation
  failures are not cached; aggregate identity also uses nested maps. The exact revision-01 collision
  pair now reports `a` for the first transaction and both `a` and `b` for the second. Empty,
  delimiter, NUL, combining-Unicode, emoji and supplementary-plane IDs remained distinct.

These closures do not waive F-04 or F-05. Both are adjacent invalid-retained-data cases required by
the same canonical safety boundary and produce plausible issue-free totals.

## Passing canonical-engine audit

- `settlement.ts` remains the only callable production settlement implementation. No compatibility
  alias, duplicate formula or caller-side transaction flattening remains.
- Canonical examples A through H, signed expenses/income, positive/zero/negative owner remainders,
  deleted Treat-as-Paid statuses, non-paid exclusion and transfer-tag neutrality pass.
- Currency resolution and final positions/obligations remain isolated by currency.
- P16A apportionment is used for effective and ownership shares. Valid transaction deltas and every
  returned currency position conserve exactly.
- Deterministic debtor/creditor matching removes zeros, nets reverse directions and retains signed
  source contributions whose sum equals each positive obligation.
- Aggregate writes are transaction-atomic. A safe `Number.MAX_SAFE_INTEGER` contribution remains
  while the next unsafe aggregate is excluded with one `unsafe-calculation` issue.
- Results are newly allocated and recursively frozen; source stores/accounts/statuses are neither
  frozen nor mutated.
- Deleted/unknown People remain calculation-independent and are surfaced by stable ID.
- `BalanceSummary` passes the retained store to the sole engine, groups by currency and suppresses
  settled claims when issues exist. P16D allocation editing and P16E source expansion,
  no-qualifying-state detail and optimization remain outside P16B.
- No settlement result, cache value, description, note, amount or key material is persisted by this
  implementation.

## Independent arithmetic and adversarial evidence

The reviewer bundled the production export in memory with repository-installed `esbuild` and piped
it directly to Node. No script, test or configuration file was created.

1. Seed `26072501`, 5,000 two-owner/two-explicit-person cases:
    - signed amounts included explicit `-1`, `0`, `1` and random values through ±1,000,000;
    - owner weights summed to 100;
    - explicit weights ranged from `-100..100`, exercising positive, zero and negative owner
      remainders;
    - input insertion order alternated; and
    - an independent BigInt rational oracle used mathematical negative floor, fractional ranking and
      ascending stable-ID ties at denominator 10,000.

    Every production position matched the oracle and every transaction conserved to zero.

2. The same seed generated 1,000 eight-transaction USD/EUR batches. Reversing input order preserved
   independent position totals, strict currency isolation and signed source conservation.

3. Adversarial IDs included empty string, `:`, `|`, `=`, NUL, embedded NUL, combining Unicode, emoji
   and a supplementary-plane character. All remained distinct.

4. The safe aggregate boundary retained the first valid transaction and rejected the second overflow
   atomically.

The combined oracle result was:

```text
PASS reviewer seed=26072501 rational=5000 reverseCurrency=1000 adversarialIds=8 safeAggregate=true
```

Dedicated production probes additionally established F-04 and F-05. Neighbor probes verified missing
allocation/duplicate fields, typed ownership/currency failures, live-over-deleted selection, nested
exclusion, retired array rejection and the corrected cache collision.

## Independent automation

| Gate                                                     | Independent result                                         |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| Settlement/balance/caller focus, clean run 1             | PASS; 3 files / 71 passed + 1 skipped in 3.93 s            |
| Settlement/balance/caller focus, clean run 2             | PASS; 3 files / 71 passed + 1 skipped in 3.95 s            |
| Settlement/balance/caller focus, clean run 3             | PASS; 3 files / 71 passed + 1 skipped in 3.93 s            |
| Full domain plus changed caller                          | PASS; 14 files / 470 passed + 2 skipped in 11.36 s         |
| `pnpm test -- --pool=forks --maxWorkers=1`               | PASS; 63 files / 1,362 passed + 2 skipped in 6.37 s        |
| `pnpm typecheck`                                         | PASS                                                       |
| `pnpm lint`                                              | PASS exit 0; 0 errors / 10 inherited warnings              |
| `pnpm build`                                             | PASS; compile 5.2 s, TypeScript 8.4 s, 17 routes generated |
| Exact four-path `oxfmt --check` / ESLint                 | PASS / PASS with no diagnostics                            |
| `git diff --check BASE..HEAD`                            | PASS                                                       |
| Accounts + Transactions Chromium, one worker / retries 0 | PASS; 46/46 in 3.0 minutes                                 |
| Full Chromium, one worker / retries 0                    | PASS; 102/102 in 6.6 minutes                               |

Repository `pnpm format:check` exits 1 on exactly the inherited 14 Markdown paths already recorded
by the package evidence: six root ledgers, P12 implementations 03–06, P12 reviews 05–06, P14
implementation revision 01 and `specs/human-scratch.md`. No P16B product/test path fails its exact
format or lint gate.

The full Chromium suite emitted deliberate offline/authentication diagnostics only in journeys that
exercise those states; 102 tests passed with no retry. The checked-in suites do not construct the
non-plain financial-map objects or malformed hierarchy descendants from F-04/F-05.

## Performance

The independent opt-in benchmark ran with fixture construction excluded, five 1,000-transaction
warmups and full immutable output:

- 10,000 transactions: `28.64` ms;
- 50,000 transactions: `133.19` ms; and
- 100,000 transactions: `252.34`, `273.41`, `257.68`, `247.81`, `245.96` ms.

Every 100k sample returned 100,000 qualifying transactions, 75,000 contributions, two obligations
and zero issues; position and signed-source conservation passed. Scaling remains near-linear. The
approximate 200 ms target did not pass. The implementation evidence reports that honestly and
records P16E optimization follow-up. Under the explicit dispatch adjudication, this is a disclosed
non-blocking risk rather than an additional P16B correctness blocker.

## Independent manual-browser adjudication

Root started a fresh keyed app server at `http://localhost:3000`. The reviewer used only the
repository-installed Playwright CLI with unique session `p16b-review-02`.

- Fresh onboarding completed through the real app. The generated recovery phrase stayed behind
  `Click to reveal`; it was never revealed, copied, read or printed.
- The reviewer created unique marker person `P16B02ReviewBob`, joint EUR account
  `P16B02ReviewTravel` with Bob 50% / Me 50%, a Paid `-100.00 EUR` transaction with no explicit
  allocation, and a For Review `-25.00 EUR` transaction.
- People showed `No outstanding balances between members` and `Everyone is settled up`. This is the
  expected honest total: the paid transaction's effective allocation equals the joint ownership,
  while the non-paid transaction is excluded.
- People, Accounts and both Transactions persisted after real page reloads with exact ownership,
  currency, statuses and amounts.
- At `390x844`, People cards and settlement summary reflowed with
  `body.scrollWidth === body.clientWidth === 390`. At document zoom 200%, the effective document
  width was 640 with no horizontal overflow; vertical scrolling reached the complete summary.
- Forced dark styling plus emulated reduced motion retained readable cards, hierarchy and settled
  state at the mobile viewport with no horizontal overflow.
- Accessibility snapshots exposed semantic navigation, headings, People count, Add Person control,
  member entries and Settlement Summary. No probative focus/control defect was observed.
- Final console inspection reported five messages total, zero errors and zero warnings.
- Two captured successful mutation requests had bodies, zero request failures and no exact marker in
  URL or body. Boolean-only scans found no exact marker in local storage, session storage or any
  value across the one IndexedDB database / three object stores. No stored value was emitted.

After the charter, `delete-data` found no remaining user data, the unique session was closed and
`playwright-cli list` reported no browsers. Root stopped the server, verified port 3000 clear,
restored generated `next-env.d.ts`, moved current `.next` and exactly 40 reviewer CLI artifacts (10
logs, 25 YAML snapshots, five PNG screenshots) to recoverable trash, found no `test-results`, and
preserved all 22 older CLI artifacts plus the older `playwright-report`. Worktree and index were
clean before this sole review write.

The normal UI cannot safely manufacture F-04/F-05 retained corruption. The happy-path manual pass
therefore does not overrule the direct production-boundary failures, and no P16D/P16E-only UI was
faked.

## Boundary, frozen sources, risks and questions

- Frozen human scratch remains SHA-256
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, 350 lines / 24,250 bytes.
  HS-009 remains unchecked.
- Immutable canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines
  / 27,382 bytes.
- The binding P16B task remains `tasks/FS-001-transaction-percentage-allocations-settlement.md`,
  SHA-256 `0d1c9512b74b23aa19e20e58a704a5212a4ae0ce1fc429707fe912fcd3f8be48`, 246 lines / 18,013
  bytes.
- The assigned product/test HEAD remains `50b36beb0c7cf9a73d623ed964b6ba05919fffc6`. This review is
  the sole reviewer-created path. No source, product, test, dependency, evidence, task, ledger,
  source marker, configuration or prior artifact was edited.
- No question proposal is required. Canonical invalid-data safety and the dispatch's explicit rule
  that topology ambiguity or a plausible invalid total must fail already decide F-04 and F-05.
- The P16E performance follow-up remains disclosed and non-blocking. F-04/F-05 require a new
  product/test HEAD and the next immutable implementation/review revisions.

## Single final verdict

**FAIL.** Revision 02 correctly repairs the three revision-01 failures and independently passes
exact arithmetic, deterministic matching, cache identity, regression automation, full Chromium and
the real-app manual happy path. It nevertheless accepts non-plain allocation objects as empty maps
and silently discards malformed hierarchy descendants. Both defects can turn invalid retained data
into an issue-free settled result. Root must preserve this failed review, keep P16B and FS-001 in
`changes_requested`, and dispatch a narrow revision 03 over a new immutable product/test HEAD.
