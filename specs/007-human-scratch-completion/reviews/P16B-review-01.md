# P16B Independent Review — Revision 01

## Review identity and verdict

- Package / requirement / revision: `P16B` / `FS-001` / `01`.
- Literal cumulative reviewed product range:
  `4c102600240e2804b801c2a320e10164defb14ea..5242a2422cd86dd48eac07a4422491d5079ccd23`.
- Exact package implementation range:
  `a584203aea4b1ac030d76c95289d784e8d0937b3..5242a2422cd86dd48eac07a4422491d5079ccd23`.
- Frozen implementation evidence: `evidence/P16B/implementation-01.md`, SHA-256
  `48f10876f8e69e7f3bff022598c0236a775d061e1cc06a86cb3d48bfc60d3dfd`, 323 lines / 21,736 bytes.
- The cumulative range contains 10 paths and has 1,744 insertions / 931 deletions. The exact package
  delta contains the eight authorized source/test paths and has 1,575 insertions / 771 deletions.
  `git diff --check` passes.
- Current repository HEAD before this artifact is the later root-only review dispatch commit
  `032f38be6886d98391127a005bc980228c58d248`; the assigned product/test HEAD remains exactly
  `5242a2422cd86dd48eac07a4422491d5079ccd23`.
- **Verdict: FAIL.** The signed arithmetic, deterministic matching, currency isolation, netting and
  trace model pass independent checks, but three boundary failures remain. Most directly, a
  canonical explicitly supported legacy transaction with no `allocations` field throws before
  returning a result. Invalid legacy data can therefore crash the sole engine instead of becoming
  typed exclusions, and cache/duplicate handling can discard required identity or issue context.

## Findings

### F-01 — Missing or malformed legacy fields throw before typed settlement handling

**Severity:** blocking.

The canonical source explicitly says existing vaults may contain old transactions with no
allocations and that missing allocations are valid, mean an empty map and derive a 100% owner
remainder. P16B also owns typed invalid-data exclusions. The engine instead fingerprints fields
before it validates them:

- `validTopLevelTransactions` iterates `transaction.suspectedDuplicates` directly
  (`src/lib/domain/settlement.ts:167-171`);
- startup fingerprints every retained `account.ownerships` with `recordKey`
  (`src/lib/domain/settlement.ts:480-482`);
- each paid transaction fingerprints `transaction.allocations` with `recordKey`
  (`src/lib/domain/settlement.ts:526-530`); and
- resolved currency calls `.toUpperCase()` without first proving the runtime field is a string
  (`src/lib/domain/settlement.ts:514-516`).

A reviewer-owned in-memory call to the production export used an otherwise valid retained paid
transaction but omitted only `allocations`:

```text
calculateSettlementBalances(
  [{ id: "legacy", amount: -100, accountId: "acc", statusId: "paid",
     suspectedDuplicates: [], ... }],
  { acc: { currency: "USD", ownerships: { alice: 100 }, ... } },
  { paid: { behavior: "treatAsPaid", ... } }
)
```

Observed:

```text
TypeError: Cannot convert undefined or null to object
```

No `SettlementResult`, zero-allocation owner derivation or typed issue is returned. Three adjacent
runtime probes also throw rather than producing a safe result:

| Input shape                                         | Observed production result                                       |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| otherwise valid transaction, allocations absent     | `TypeError: Cannot convert undefined or null to object`          |
| otherwise valid transaction, duplicates list absent | `TypeError: transaction.suspectedDuplicates is not iterable`     |
| otherwise valid account, ownerships absent          | `TypeError: Cannot convert undefined or null to object`          |
| otherwise valid account, numeric currency           | `TypeError: resolvedCurrency.code.toUpperCase is not a function` |

The first case alone directly contradicts canonical section 11 and the P16B invalid-legacy
acceptance boundary. The other cases show the same ordering defect: untrusted retained runtime data
is dereferenced before the domain boundary can return a typed exclusion.

Required correction:

1. Treat a missing allocation map as an empty explicit map before fingerprinting or derivation.
2. Make eligibility traversal safe for the retained legacy shape, including a missing duplicate
   list.
3. Validate ownership/currency runtime envelopes before fingerprinting or calling string methods;
   return stable typed issues rather than throw.
4. Add direct production tests for every corrected branch, including the mandatory old-transaction
   no-allocations success case and immutable result/input-purity checks.

### F-02 — Physical/nested representation handling can suppress or include the wrong logical transaction

**Severity:** blocking.

`validTopLevelTransactions` sorts physical representations by logical ID then `$cid`, marks the
first ID as seen, and only afterward checks `deletedAt` (`src/lib/domain/settlement.ts:174-178`). A
deleted relocation representation can therefore hide a live representation of the same logical
transaction.

Reviewer reproduction supplied these two entries in either input order:

```text
{ id: "same", $cid: "a", deletedAt: <instant>, allocations: { bob: 100 }, ... }
{ id: "same", $cid: "b", deletedAt: undefined, allocations: { bob: 100 }, ... }
```

Both refer to the valid paid USD account owned 100% by Alice. Because deleted `$cid` `"a"` sorts
first, the result is:

```json
{
    "contributions": [],
    "issues": [],
    "obligations": [],
    "positions": [],
    "qualifyingTransactionCount": 0
}
```

The live logical transaction should qualify and make Bob owe Alice 100 minor units. The current
People caller uses `getAllTransactions`, but that query also canonicalizes physical copies before
the settlement call; the engine must not advertise duplicate protection that lets a deleted copy win
over a live copy at either boundary.

The nested safeguard also works only while the parent representation is present in the supplied
array. A materialized nested duplicate with its parent absent is structurally a `Transaction` with
an empty duplicate list. Passing that one retained representation produced one qualifying
transaction, positions Alice `+100` / Bob `-100`, and a Bob-to-Alice obligation of 100. The engine's
public signature and result contain no way to distinguish it from a canonical top-level item.

Required correction:

1. Filter active representations before same-ID canonicalization so a deleted copy cannot hide an
   active copy, matching the established active-identity query convention.
2. Make the top-level input contract mechanically unambiguous. Either accept an explicit canonical
   top-level projection/type or move canonical top-level extraction into the sole engine boundary;
   do not rely on a parent being co-present to recognize a nested item.
3. Test active/deleted same-ID representations in both array orders and both `$cid` orders, parent
   present/absent nested representations, and exact duplicate representations.

### F-03 — Collision-prone derivation fingerprints can alias invalid records and lose typed issues

**Severity:** blocking.

The per-call cache is appropriately non-persistent, but `recordKey` does not length-prefix or
otherwise escape values and joins entries with `|` (`src/lib/domain/settlement.ts:154-158`).
Untrusted invalid legacy values can therefore produce the same cache key for different records.

These two allocation records have the identical current fingerprint:

```text
{ a: "x|1:b=string:y" }
{ a: "x", b: "y" }

fingerprint for both:
1:a=string:x|1:b=string:y
```

The reviewer passed two otherwise valid paid transactions in deterministic ID order, the first with
the first record and the second with the second. The first derivation was cached and reused for the
second. Production returned only invalid-person `a` for each transaction; the required
invalid-person `b` issue for the second transaction disappeared.

Both transactions are excluded, so this counterexample does not create a plausible amount, but it
does violate the complete typed-issue contract and can misidentify what retained data needs repair.
The same encoding is reused for account ownership fingerprints, and NUL-delimited composite keys are
built without length-prefixing the component strings.

Required correction:

1. Use a collision-free canonical encoding for every cache component, including invalid runtime
   values and composite fields, or avoid caching validation failures.
2. Prove cache identity includes every semantic input without delimiter ambiguity.
3. Add adversarial person IDs/string legacy values, insertion permutations and success/failure
   separation tests that compare cached execution with uncached independent execution.

## Passing canonical-engine audit

The findings do not invalidate the substantial correct core:

- `settlement.ts` is the only callable production settlement implementation. `balance.ts` retains
  running/account balance logic only, the domain barrel exposes the exact canonical function, and
  repository search found no compatibility alias or second settlement formula.
- Named checked-in expectations independently cover canonical examples A through H. Reviewer
  inspection confirmed the expected expense, income, positive/zero/negative remainder, joint owner,
  negative allocation, equal ownership and status-exclusion directions.
- Retained deleted Treat-as-Paid statuses qualify; deleted top-level entries and non-paid statuses
  are excluded; transfer tags do not affect calculation.
- Currency resolves account then vault default then USD for valid strings. Obligations, positions,
  aggregates and reverse netting remain isolated by currency.
- Each valid transaction invokes P16A's exact effective and ownership apportionment independently,
  subtracts signed shares, checks safe integer positions and matches sorted debtors/creditors.
- Valid aggregate commits are transaction-atomic. The reviewer verified a second
  `Number.MAX_SAFE_INTEGER` contribution is rejected with one `unsafe-calculation` issue at
  `aggregate`, while the first safe transaction remains the only qualifying transaction.
- Contributions remain positive and directed before aggregation. Final obligations remove zeros and
  retain signed forward/reverse sources whose sum equals the positive net amount.
- Deleted/unknown People are calculation-independent and survive by stable ID. Current caller names
  absent records `Unknown (<stable ID>)`.
- The complete result graph is newly allocated and recursively frozen. Reviewed code and checked-in
  mutation tests show no source input is frozen or mutated.
- `BalanceSummary` consumes the structured result, passes retained accounts and the vault currency,
  groups obligations by currency and suppresses any settled claim whenever issues exist. P16E—not
  P16B—owns the distinct neutral no-qualifying state and detailed source expansion.
- No settlement values or cache objects are persisted, and issue payloads contain identifiers,
  validation reasons and stages rather than transaction descriptions, notes, key material or
  amounts.

## Independent arithmetic and adversarial evidence

A repository-installed TypeScript runner called the production export entirely in memory; it created
no script, test or configuration file.

1. Reviewer seed `26072501`, 5,000 cases:
    - signed amounts included explicit `-1`, `0`, `1` cases and random values through ±1,000,000;
    - two owners partitioned 100 exactly;
    - two explicit People independently ranged `-100..100`, producing positive, zero and negative
      owner remainder;
    - owner/allocation insertion order alternated; and
    - a separate BigInt rational oracle implemented mathematical negative floor, fractional ranking
      and ascending stable-ID ties at denominator 10,000.

    Every production person position matched the oracle and every transaction summed to zero.

2. The same seed then generated 1,000 batches of eight signed USD/EUR transactions with forward and
   reverse sources. Reversing every input array produced a deeply equal result. Per-currency Alice
   and Bob positions matched independent integer sums, currencies never netted together, zero pairs
   disappeared and each obligation's signed sources summed exactly to its positive amount.

3. Dedicated adversarial probes established F-01 through F-03, the active/deleted representation
   loss, the parent-absent nested inclusion and safe aggregate-limit behavior. These are production
   observations, not conclusions inferred only from source.

## Independent automation

| Gate                                                     | Independent result                                         |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| Settlement/balance/caller focus, clean run 1             | PASS; 3 files / 46 passed + 1 skipped in 2.91 s            |
| Settlement/balance/caller focus, clean run 2             | PASS; 3 files / 46 passed + 1 skipped in 2.91 s            |
| Settlement/balance/caller focus, clean run 3             | PASS; 3 files / 46 passed + 1 skipped in 2.90 s            |
| Full domain plus changed caller                          | PASS; 14 files / 445 passed + 2 skipped in 10.32 s         |
| `pnpm test -- --pool=forks --maxWorkers=1`               | PASS; 63 files / 1,337 passed + 2 skipped in 6.43 s        |
| `pnpm typecheck`                                         | PASS                                                       |
| `pnpm lint`                                              | PASS exit 0; 0 errors / 10 inherited warnings              |
| `pnpm build`                                             | PASS; compile 5.1 s, TypeScript 8.3 s, 17 routes generated |
| Exact eight-path `oxfmt --check` / ESLint                | PASS / PASS with no diagnostics                            |
| `git diff --check BASE..HEAD`                            | PASS                                                       |
| Accounts + Transactions Chromium, one worker / retries 0 | PASS; 46/46 in 3.0 minutes                                 |
| Full Chromium, one worker / retries 0                    | PASS; 102/102 in 6.6 minutes                               |

Repository `pnpm format:check` exits 1 on exactly the inherited 14 Markdown paths: the six current
root ledgers, P12 implementations 03–06, P12 reviews 05–06, P14 implementation revision 01 and
`specs/human-scratch.md`. No P16B product/test path fails its exact format check.

Affected and full Chromium emitted only the established deliberate offline/authentication/presence
diagnostics in journeys that exercise those states. No test failed or retried. These suites do not
construct the malformed retained legacy fields or adversarial cache keys from F-01/F-03, which is
why their pass does not close the findings.

## Performance

The independent opt-in benchmark ran on Node `v22.21.1`, with fixture construction excluded, five
1,000-transaction warmups and full immutable output:

- 10,000 transactions: `27.66` ms;
- 50,000 transactions: `116.89` ms; and
- 100,000 transactions: `241.21`, `228.93`, `233.21`, `237.02`, `230.40` ms.

Every 100k sample returned 100,000 qualifying transactions, 75,000 positive contributions, two
obligations and zero issues; per-currency position conservation and signed source conservation
passed. Scaling is near-linear. The approximate 200 ms target did not pass, but the implementation
evidence states that honestly and records a specific P16E optimization follow-up without reducing
traceability or correctness. Under the dispatch's explicit performance adjudication, this measured
and documented miss is not an additional P16B blocker.

## Manual-browser adjudication and cleanup

No reviewer manual Playwright CLI session or root keyed manual server was started. Once the direct
production probes established deterministic blocking source defects, the current UI could not create
the malformed retained legacy inputs or adversarial invalid map values, and a normal manual journey
would add no material evidence beyond those source blockers. This omission was explicitly accepted
by root; it avoids manufacturing legacy state through a test-only hook and does not claim manual
acceptance.

Current surfaced caller regression coverage instead comes from the independent affected and full
Chromium runs above and the implementer's already frozen real-app charter. P16D allocation editing
and P16E source expansion/no-qualifying/theme acceptance remain future work and were not faked.

After automation, root confirmed port 3000 clear, restored `next-env.d.ts`, moved only the
current-owned `.next` and `test-results` paths to recoverable trash, preserved the older ignored
`playwright-report`, and verified an empty index/worktree before authorizing this sole review write.
No recovery words or secret-bearing browser state were accessed.

## Boundary, frozen sources, risks and questions

- Frozen human scratch remains SHA-256
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, 350 lines / 24,250 bytes.
  HS-009 remains unchecked.
- Immutable canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines
  / 27,382 bytes.
- The product/test HEAD remains `5242a2422cd86dd48eac07a4422491d5079ccd23`. This review is the sole
  reviewer-created repository path. No source, product, test, dependency, evidence, task, ledger,
  source marker, configuration or prior artifact was edited.
- No question proposal is required. Canonical sections 6 and 11 plus P16B acceptance already decide
  the invalid-data, duplicate and complete-issue behavior.
- The performance follow-up remains a disclosed non-blocking risk. F-01 through F-03 require a new
  product/test HEAD and the next immutable implementation/review revisions.

## Single final verdict

**FAIL.** Revision 01 establishes a strong and independently verified exact-arithmetic,
currency-isolated, deterministic settlement core, and all checked-in regression gates pass. However,
the sole engine still throws for the canonical old-transaction-without-allocations case, can let a
deleted/nested physical representation determine the wrong logical eligibility, and uses a
collision-prone validation cache key that loses typed issue context. Root must preserve this failed
review, move P16B to `changes_requested`, and dispatch a new revision over a new immutable
product/test HEAD. FS-001 remains open.
