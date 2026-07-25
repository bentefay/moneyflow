# P16B Independent Review — Revision 05

## Review identity and verdict

- Package / requirement / revision: `P16B` / `FS-001` / `05`.
- Literal cumulative reviewed product range:
  `4c102600240e2804b801c2a320e10164defb14ea..46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c`.
- Exact revision-05 product/test delta:
  `f806cdae54469d6b1f3a286fa438e8c90cbd17f7..46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c`.
- Frozen implementation evidence: `evidence/P16B/implementation-05.md`, SHA-256
  `85bc279f87c02cbadedd5c2964cf72886fde2081903d8343a966cbf9c2b42e43`, 245 lines / 15,982 bytes. Its
  freeze commit is `910cecbf0ea6c83ca12c41b7d98808d95158bf67`.
- Frozen prior failed review: `reviews/P16B-review-04.md`, SHA-256
  `8cc169c08f6c87fc16eec1fa3c6615b033abd291faaa0969619230558949b241`, 403 lines / 24,640 bytes.
- Exact review/control HEAD before this artifact is `11018c7ddeedb389a828988a186e536f95d314a2`; the
  assigned product/test HEAD remains `46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c`.
- The checked-in RED is `b3e0235a8e7a1a2d15f45fb3c92ef85831d92c7d`; its parent is the exact clean
  pre-product/control commit `f806cdae54469d6b1f3a286fa438e8c90cbd17f7`. The GREEN is the assigned
  product HEAD.
- The cumulative range contains 19 paths and has 7,277 insertions / 909 deletions. The exact
  revision-05 delta contains only `src/lib/domain/settlement.ts` and
  `tests/unit/domain/settlement.test.ts`, with 248 insertions / two deletions. The production part
  is four insertions / two deletions; the test part is 244 insertions. Exact and cumulative
  `git diff --check` pass.
- **Verdict: PASS.** Revision 05 narrowly closes F-06: only exact key `$cid` is ignored as
  sanctioned Loro collection metadata. Every other primitive account/status entry reaches the
  exception-safe record validator and emits its contextual hierarchy issue. All dispatched
  F-01–F-05, arithmetic, topology, traceability, caller, immutability, browser and privacy
  preservation gates independently remain green.

## Findings

No blocking product finding remains.

One reviewer-operation deviation occurred during the disposable manual charter. The reviewer clicked
the supported `Click to reveal` onboarding control once; the generated disposable recovery phrase
consequently appeared in CLI output and one generated YAML snapshot. It was never copied, used,
written into product state or retained as a live credential. The disposable profile was
deleted/closed, the root-owned memory-only server was stopped, and root moved the exact current
28-artifact manifest—including the sensitive YAML—to recoverable trash. This was unnecessary and
must not be represented as a never-revealed run. It is not a product failure: the control behaved as
designed, no host secret was accessed, cleanup completed, and the product verdict below relies on
independent automated/direct evidence plus the remaining normal UI path.

## F-06 closure audit

### Narrow production mechanism

The complete revision-05 production change is inside `recordFromLoroMap`:

```ts
for (
    const [id, value] of Object.entries(snapshot.value).sort(([left], [right]) =>
        compareStrings(left, right),
    )
) {
    if (id === "$cid") continue;
    const entry = snapshotMaterializedRecord(value);
```

The revision-04 branch `id === "$cid" || typeof value === "string"` is gone. The replacement has the
required properties:

- only exact collection key `$cid` is skipped;
- string and every other non-record value at any other key enters the existing
  `snapshotMaterializedRecord` path;
- an invalid account/status entry emits the existing stable hierarchy issue with its collection
  context;
- enumeration and sorting consume the already-copied, exception-safe snapshot rather than the caller
  wrapper;
- ordering uses the existing scalar comparator and is stable across insertion permutations; and
- no caller, schema, dependency, component, E2E, persistence or CRDT mutation path changed.

The initialized Loro mirror retains its supported non-enumerable string `$cid`. Direct checks also
accepted an enumerable string `$cid`, while a non-string `$cid` retained the prior typed root
hierarchy rejection. Hidden nonmetadata entries, symbols, accessors and reflection traps retain the
revision-04 invalid-data behavior. The fix therefore distinguishes metadata by exact key rather than
creating another value-type exemption.

### Direct production reproductions

The reviewer bundled the assigned production export with repository-installed `esbuild` to a
temporary file outside the repository, then called the production function directly. A common
fixture used one retained Paid USD transaction, amount `-100`, Alice 100% ownership and Bob 100%
allocation.

1. Referenced account string returned exactly:
    - account hierarchy issue for key `a`;
    - downstream transaction-scoped `missing-account` for transaction `t`;
    - zero qualifying transactions; and
    - no obligation.
2. Referenced status string returned exactly its status hierarchy issue, zero qualifying
   transactions and no obligation.
3. Unreferenced account string beside a valid branch returned exactly its account hierarchy issue,
   retained one qualifying transaction and retained Bob-to-Alice USD 100.
4. Unreferenced status string beside a valid branch returned exactly its status hierarchy issue and
   the same valid-sibling qualifying obligation.

Forward and reverse insertion produced identical results. Every result graph was recursively frozen.
Caller records, nested ownership/allocation objects and property descriptors were unchanged and
remained unfrozen.

The additional exact-metadata probes established:

- a hidden non-enumerable string `$cid` on accounts/statuses is accepted with no issue and the valid
  financial result;
- an enumerable string `$cid` is accepted;
- neither accepted case freezes or mutates its caller object; and
- a non-string `$cid` is rejected with the typed collection hierarchy issue and no qualifying
  transaction.

The referenced-account result deliberately contains both the collection hierarchy issue and the
downstream missing-account issue. That is the complete current issue set required by the dispatch.
The People UI counts unique transaction IDs rather than issue rows, so no duplicate incomplete
transaction count is introduced.

### Independent generated F-06 oracle

Reviewer seed `2607250901` ran 2,400 generated cases containing 11,252 primitive entries:

- 782 account-boundary cases and 1,618 status-boundary cases;
- 1,618 referenced placements and 782 unreferenced placements;
- one to eight entries in forward and reverse insertion order;
- empty/generated strings, integers, doubles, booleans, bigint, null, undefined, `NaN`, infinities,
  negative zero and symbols; and
- empty-derived, `$cid`-like, `__proto__`, `constructor`, NUL, Unicode, combining and emoji keys.

An independent oracle derived the exact sorted hierarchy issues, the downstream referenced-account
issue, qualifying count and obligation from generated boundary/reference state. It did not call a
production helper or select among the four direct fixtures. Every issue set, count, obligation,
permutation and frozen-graph expectation passed. Final PRNG state was `3208526107`.

Caller-purity seed `2607250902` added 500 cases over actual collection descriptors. All descriptor
fingerprints were unchanged; all caller and nested ownership objects remained unfrozen. Final PRNG
state was `3615114180`.

The checked-in seed `26072508` independently runs 1,000 cases over account/status,
referenced/unreferenced, one-to-six unique non-`$cid` keys, generated primitive payloads, generated
string `$cid` and forward/reverse insertion. Its exact oracle, direct four reproductions, freeze and
purity expectations all pass. The reviewer generator adds symbols, special numeric values,
adversarial keys and wider multiplicity rather than merely replaying that checked-in property.

## F-01–F-05 and canonical-core preservation

### Exception-safe retained snapshots

Reviewer seed `2607250601` re-ran 2,000 lifecycle mechanisms:

- 560 allocation boundaries;
- 493 ownership boundaries;
- 547 hierarchy-array boundaries; and
- 400 transparent wrappers with armed reads.

All invalid mechanisms returned typed issues without throwing. Transparent wrappers calculated
correctly after zero trapped property reads; an armed descriptor was read exactly once during
snapshot and never after it.

Twenty-five direct lifecycle cases covered collection, entry, store and tree reflection traps. Safe
collection/entry `get` traps observed zero reads. Years, months, days, transactions and duplicate
arrays observed zero iterator, index or length reads. Ordinary/null-prototype records remained
accepted; symbols, accessors, hidden financial entries, class instances and trapped reflection
remained rejected. This independently preserves the accepted F-04 record/array snapshot boundary.

### Identity and calendar

Reviewer seed `2607250701` ran 5,000 hierarchy dates against an independent proleptic-Gregorian
oracle and explicit Temporal endpoints:

- 859 valid cases;
- 4,141 invalid cases; and
- exact lower/upper supported dates `-271821-04-19` and `275760-09-13`.

Production agreed in every case. Account-tree key/`accountId`, transaction/tree identity, safe
integer, negative-zero, leap-day and supported-range rules remain enforced. No invalid identity or
date branch contributed to qualifying count or financial output.

### Exact money, netting and traceability

Reviewer seed `26072501` ran 5,000 signed multi-owner cases against an independent BigInt rational
oracle. Positive, zero and negative remainders, stable-ID ties and mathematical negative floor were
covered. Every position matched and conserved to zero; final PRNG state was `3826238165`.

Reviewer seed `16001611` ran 1,000 reverse-order, multi-currency eight-transaction batches. Complete
results were permutation-invariant; USD/EUR conserved independently; every obligation's signed
source sum equalled its positive amount. Final PRNG state was `2470714763`.

### Sole engine and caller

- `settlement.ts` remains the sole callable production settlement engine over the retained
  hierarchical `TransactionStore`.
- The domain barrel exposes that implementation; `balance.ts` contains no competing calculation.
- `BalanceSummary` is the sole current caller and passes the retained store directly.
- Named canonical examples A–H; deleted Treat-as-Paid behavior; non-paid exclusion; transfer-tag
  neutrality; active-copy/nested topology; collision-safe identities; deterministic matching;
  currency isolation; reverse netting; signed source traceability; safe aggregate rejection;
  unknown/deleted People; issue privacy; recursive freezing and caller purity all pass.
- The caller suppresses settled claims whenever issues exist. P16D allocation editing and P16E
  expanded source/no-qualifying detail remain outside P16B.
- No settlement cache/result or plaintext financial marker is persisted by this implementation.

## Canonical mapping

| Authority                                                                           | Independent adjudication                                                                                                   |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Canonical spec §5.10: invalid data must never produce a plausible incorrect result  | **PASS:** every non-`$cid` primitive collection entry emits its contextual issue; valid siblings remain visibly incomplete |
| Canonical spec §11: invalid legacy data is typed and affected totals are incomplete | **PASS:** referenced malformed entries are atomically excluded; complete issues remain                                     |
| Canonical spec §12: stable issue type and applicable context                        | **PASS:** account/status hierarchy contexts are exact and insertion-independent                                            |
| Binding P16B task: structured issues and exact invalid exclusion                    | **PASS:** direct/generated F-06 plus preserved F-01–F-05                                                                   |
| Binding P16B acceptance: invalid data cannot produce plausible totals               | **PASS:** no issue-free malformed sibling or referenced primitive reproduced                                               |
| Handoff exact-key rule                                                              | **PASS:** exact `$cid` accepted; no type-based metadata exemption remains                                                  |
| Handoff preservation rule                                                           | **PASS:** snapshots, identity/calendar, arithmetic, topology, API/caller, traceability and immutability remain green       |
| Handoff decision rule                                                               | **PASS:** no hidden plausible loss, throw or false `$cid` issue remains                                                    |

The immutable canonical FS-001 source remains SHA-256
`0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes. The
binding task remains SHA-256 `0d1c9512b74b23aa19e20e58a704a5212a4ae0ce1fc429707fe912fcd3f8be48`, 246
lines / 18,013 bytes.

## Independent automation

| Gate                                                                              | Independent result                                         |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Settlement/balance/caller focus, clean run 1                                      | PASS; 3 files / 164 passed + 1 skipped in 4.99 s           |
| Settlement/balance/caller focus, clean run 2                                      | PASS; 3 files / 164 passed + 1 skipped in 5.01 s           |
| Settlement/balance/caller focus, clean run 3                                      | PASS; 3 files / 164 passed + 1 skipped in 5.00 s           |
| Full domain plus current caller                                                   | PASS; 14 files / 563 passed + 2 skipped in 12.44 s         |
| Full Vitest, forks / one worker                                                   | PASS; 63 files / 1,455 passed + 2 skipped in 56.71 s       |
| `pnpm typecheck`                                                                  | PASS                                                       |
| Exact two-path `oxfmt --check` / ESLint                                           | PASS / PASS with no diagnostics                            |
| `pnpm lint`                                                                       | PASS exit 0; zero errors / ten inherited warnings          |
| `pnpm build`                                                                      | PASS; compile 5.1 s, TypeScript 8.5 s, 17 routes generated |
| Exact and cumulative `git diff --check`                                           | PASS / PASS                                                |
| Accounts + Transactions Chromium, explicit one worker / retries 0 / line reporter | PASS; 46/46 in 2.8 minutes                                 |
| Full Chromium, explicit one worker / retries 0 / line reporter                    | PASS; 102/102 in 6.6 minutes                               |

The ten lint warnings are inherited: one TanStack virtualizer compiler warning, two unused query
types and seven unused CRDT-test imports/types. No warning names an assigned P16B path.

Repository `pnpm format:check` exits 1 on exactly the inherited frozen 14 Markdown paths: six
current ledgers, P12 implementations 03–06, P12 reviews 05–06, P14 implementation 01 and
`specs/human-scratch.md`. Neither assigned product/test path fails its exact format/lint gate.

The first affected Chromium invocation passed 46/46 in 3.0 minutes but relied on the repository's
local zero-retry configuration and default reporter. It is retained only as diagnostic evidence. The
accepted affected run was repeated with explicit `--workers=1 --retries=0 --reporter=line` and
passed 46/46. The full accepted run used the same explicit controls. Deliberate
offline/authentication/realtime diagnostics appeared only inside journeys exercising those states;
no accepted test failed or retried. E2E files remained read-only.

## Honest performance

The opt-in full-output benchmark used Node `v22.21.1`, excluded deterministic fixture construction,
included retained hierarchy projection, ran five 1,000-transaction warmups and materialized the
complete immutable result:

- 10,000 transactions: `78.74` ms;
- 50,000 transactions: `387.80` ms; and
- 100,000 transactions: `805.87`, `782.11`, `855.35`, `755.26`, `767.60` ms.

Every 100,000 sample returned 100,000 qualifying transactions, 75,000 source contributions, two
obligations and zero issues; currency positions and signed-source sums conserved exactly. Scaling is
near-linear, but every 100,000 sample exceeds the strict approximately 200 ms aspiration. This is
the already-recorded P16E production-profile/projection/interning follow-up, not a new P16B blocker.
Complete validation, privacy and traceability were not weakened to hide the cost.

## Independent manual-browser adjudication

Root cleaned automation drift and started a fresh memory-only keyed app at exact product HEAD. The
reviewer used only repository-installed headless `pnpm exec playwright-cli`, unique disposable
session `p16b-review-05`. No Playwright MCP, `npx`, temporary script/test/config, headed/debug/UI
mode, dashboard or arbitrary sleep was used.

- Fresh onboarding generated exactly 12 initially masked recovery entries and one `Click to reveal`
  control. As disclosed above, the reviewer clicked reveal once; the phrase appeared in disposable
  output/artifact, was never copied, and was later deleted with all current generated state.
- Through normal UI, the reviewer created `P16B05ReviewBob`, a Default-account Paid transaction
  `P16B05ReviewPaid` / `-100.00`, and a Default-account For Review transaction `P16B05ReviewPending`
  / `-20.00`.
- Reload retained both rows with exact account, status and amount. The pending row was later renamed
  `P16B05ReviewPendingPrivate`, synced with HTTP 200 and survived another reload.
- People retained `(2)`, Me, Bob, `Settlement Summary`, `No outstanding balances between members`
  and `Everyone is settled up!`, with no incomplete issue. This is the honest expected result:
  Default ownership equals the Paid row's empty explicit allocation, while the For Review row is
  excluded. It proves the actual initialized Loro `$cid` mirror does not produce a false issue.
- At `390x844`, body/root client and scroll widths were `390/390`. Reviewer-inspected screenshots
  showed no clipping, overlap or task-relevant visual defect.
- At a 1,280-wide viewport and 200% document zoom, body client/scroll widths were `640/640`, root
  client/scroll widths were `1280/1280`, horizontal overflow was false, and vertical scrolling
  reached exact `scrollY === maxScrollY === 720`.
- Forced `.dark` styling plus emulated reduced motion at `390x844` retained body/root width
  `390/390`. Settlement Summary remained at x=49/y=450, width=292/height=28. Computed contrast
  against the card was `17.05:1` for the summary and `6.79:1` for both supporting and settled text,
  above 4.5:1. The dark screenshot was visually clean.
- Accessibility snapshots exposed People level-1/level-2 headings, `(2)`, Add Person, both names,
  Settlement Summary, no-outstanding and settled state with stable roles/names.
- Final console inspection reported five messages, zero errors and zero warnings. Every listed
  dynamic request completed `200 OK`.
- Boolean-only privacy scans found zero exact Bob/Paid/PendingPrivate marker hits in one captured
  `sync.pushOps` mutation body or request URLs. One local-storage entry, eight session-storage
  entries and ten records across one IndexedDB database / three stores also returned zero hits. No
  stored value or request body was emitted.

The UI was not used to manufacture malformed topology, trap-bearing objects or P16D/P16E behavior.
Direct production and generated oracles cover those non-UI boundaries.

`delete-data` found no remaining user data and closed the disposable browser. Explicit close
confirmed it was no longer open; `playwright-cli list` reported no browsers. Root stopped the keyed
server, verified port 3000 clear, restored `next-env.d.ts`, removed `.next`, and moved exactly 28
current CLI artifacts / 187,750 bytes to recoverable trash while preserving all 22 older artifacts.
The current manifest was seven console logs, 18 YAML snapshots and three PNGs. Root also removed the
diagnostic HTML report and test-results artifacts before manual work; the accepted line-reporter
runs did not generate a replacement. Worktree and index were clean before this sole review write.

## Frozen boundaries, risks and questions

- Frozen human scratch remains SHA-256
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, 350 lines / 24,250 bytes.
  HS-009 remains unchecked.
- Immutable canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Assigned production is SHA-256 `ad047f3c571e7eeb83150325c1ccdcd18e267ef282468797711d174e22032192`,
  1,239 lines / 47,216 bytes. Assigned settlement tests are SHA-256
  `361768f0e59dd8784b5492646e4665dd5fcb237b32527f1e33a3eeab7f7888bd`, 2,964 lines / 114,826 bytes.
- The assigned product/test HEAD remains `46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c`. This review is
  the sole reviewer-created path. No product, test, dependency, evidence, task, ledger, source
  marker, configuration or prior artifact was edited.
- No question proposal is required. The canonical invalid-data rule, exact-key dispatch and prior
  F-06 finding directly resolve the implementation. The manual reveal deviation required accurate
  disclosure and cleanup, not a product-scope decision.
- The disclosed P16E performance follow-up remains non-blocking. P16D/P16E remain out of scope.

## Single final verdict

**PASS.** The exact immutable
`4c102600240e2804b801c2a320e10164defb14ea..46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c` range closes
F-06 with exact-key `$cid` compatibility and complete typed primitive-entry handling. Independent
direct/generated, preservation, full automation, scale and cleaned manual evidence found no
remaining P16B blocker.
