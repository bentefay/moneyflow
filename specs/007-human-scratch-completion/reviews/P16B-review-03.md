# P16B Independent Review — Revision 03

## Review identity and verdict

- Package / requirement / revision: `P16B` / `FS-001` / `03`.
- Literal cumulative reviewed product range:
  `4c102600240e2804b801c2a320e10164defb14ea..cd643afc8f168b3c8328eb54f1d5f280ca7ec717`.
- Exact revision-03 product/test delta:
  `0fd7b884975c6c954d70b224aecf05dc28bd947c..cd643afc8f168b3c8328eb54f1d5f280ca7ec717`.
- Frozen implementation evidence: `evidence/P16B/implementation-03.md`, SHA-256
  `f3dc7f26695109ec941eb308846872474cba72008e824970a86d7189334ef649`, 298 lines / 18,960 bytes. The
  evidence freeze commit is `8f5eaad6a271058b2c5ef6842fc8840f44473df7`.
- Frozen prior failed review: `reviews/P16B-review-02.md`, SHA-256
  `09814cd6a719189afd4951e6683b2f216d6eace729fe230d55add4a2c497054f`, 329 lines / 19,155 bytes.
- Exact review/control HEAD before this artifact is `caccf5d91b7835e1cda852910b44506dbc8e5b80`; the
  assigned product/test HEAD remains exactly `cd643afc8f168b3c8328eb54f1d5f280ca7ec717`.
- The cumulative range contains 15 paths and has 4,613 insertions / 916 deletions. The exact
  revision-03 delta contains exactly the two assigned paths and has 596 insertions / 22 deletions:
  `src/lib/domain/settlement.ts` and `tests/unit/domain/settlement.test.ts`. Both exact and
  cumulative `git diff --check` pass.
- **Verdict: FAIL.** Revision 03 closes the exact `Map`/`Set`/date/class cases and ordinary
  malformed hierarchy envelopes reported by review 02. It does not close the underlying
  untrusted-runtime boundaries. Trap-bearing records and lists still escape as exceptions, while
  missing or invalid required account-tree/date discriminators are accepted and can produce
  issue-free, plausible totals. Either behavior independently requires FAIL under the dispatch.

## Findings

### F-04 remains — plain-prototype recognition is not an exception-safe record boundary

**Severity:** blocking.

The new predicate checks only whether `Object.getPrototypeOf` returns `Object.prototype` or `null`
and catches only an exception from that one operation:

```text
src/lib/domain/settlement.ts:203-211
```

Every later access remains outside the guard. Examples include:

- `Object.entries(collection)` for account/status collections at lines 213–219;
- `Object.entries(store)` and direct hierarchy-property reads at lines 349–357;
- array iteration and direct hierarchy-property reads at lines 362–401;
- transaction core-field and duplicate-list reads at lines 270–310 and 420–448;
- `Object.entries` in identity/cache derivation at lines 226–262 and 815–823; and
- financial-map enumeration after the allocation/ownership checks at lines 929–956.

A reviewer-owned production-bundle probe used an otherwise valid retained paid USD transaction, 100%
Alice ownership and a Bob 100% explicit allocation. These record-shaped values all passed the
prototype check and then threw out of the public calculation:

```text
new Proxy({ bob: 100 }, { ownKeys() { throw Error("allocation-ownKeys-trap"); } })
Object.defineProperty({}, "bob", {
    enumerable: true,
    get() { throw Error("allocation-getter-trap"); }
})
new Proxy({ bob: 100 }, {
    getOwnPropertyDescriptor() { throw Error("allocation-descriptor-trap"); }
})
```

Observed respectively:

```text
THREW allocation-ownKeys-trap
THREW allocation-getter-trap
THREW allocation-descriptor-trap
```

The equivalent ownership `ownKeys` trap also threw. Adjacent probes established that the same escape
exists before financial validation: trap-bearing account/status collections and the store root throw
during `Object.entries`; an account-tree `years` getter throws; and a proxied years array with a
throwing `Symbol.iterator` or a throwing index getter escapes during traversal. A proxy whose
`getPrototypeOf` trap throws is converted to the typed issue, proving that only the single guarded
operation is safe.

There is also a silent plausible-total variant. A plain-prototype allocation with a non-enumerable
own `bob: 100` property was accepted as an empty allocation:

```json
{
    "issues": [],
    "obligations": [],
    "qualifyingTransactionCount": 1
}
```

The intended enumerable form makes Bob owe Alice 100 minor units. A class instance wrapped in a
proxy that reports `Object.prototype` was likewise accepted and calculated. Prototype identity alone
therefore neither safely snapshots the materialized record nor establishes the data properties the
engine will consume.

The revision-03 tests at `tests/unit/domain/settlement.test.ts:99-108` and 539–668 cover built-in
non-record objects, direct class instances, ordinary records and null-prototype records. They do not
cover `ownKeys`, descriptor, property-get or iterator traps, enumerable accessors, non-enumerable
financial entries, proxy prototype spoofing, or the adjacent account/status/store collection
boundaries. The generated test chooses only among the same finite factory list, so its 200 passes do
not exercise these cases.

Required narrow revision-04 correction:

1. Create one exception-safe materialized-envelope/snapshot boundary and use it consistently before
   any untrusted enumeration, property access, identity encoding or traversal. Catch the complete
   inspection, not only `getPrototypeOf`.
2. Inspect own keys and descriptors without invoking accessors. Accept the sanctioned ordinary and
   null-prototype materialized data records, but reject accessors, hidden financial entries,
   unexpected symbols and inconsistent/spoofed record shapes with a stable typed issue.
3. Apply equivalent exception containment to account/status collections, store/tree records,
   transaction records, duplicate lists and hierarchy arrays. A throwing proxy/getter/iterator must
   return a contextual issue and must never escape the public engine.
4. Add direct production tests for every exact reproduction above at allocation, ownership and
   hierarchy/collection boundaries. Assert no throw, zero qualifying contribution from the invalid
   branch, deterministic issue context/order, valid-sibling preservation, frozen outputs and
   unchanged/unfrozen inputs.

### F-05 remains — required hierarchy identity and date discriminators are not validated

**Severity:** blocking.

Revision 03 correctly emits contextual issues for malformed container/envelope types, including the
exact `years: null` report. However, account-tree identity is used only as an optional fallback:

```text
src/lib/domain/settlement.ts:349-357
```

The tree's required `accountId` is never validated against the map key. Year, month and day require
only `typeof value === "number"`:

```text
src/lib/domain/settlement.ts:362-390
```

That admits `NaN`, infinities, fractional values and out-of-calendar-range components.

A reviewer-owned production probe placed one otherwise valid retained paid transaction under the
`account-a` tree. Each tree variant below returned zero issues, one qualifying transaction and the
same Bob-to-Alice obligation of 100 minor units:

```text
accountId omitted
accountId: null
accountId: 42
accountId: "other"    // disagrees with the account-tree key and retained transaction
```

The same issue-free plausible obligation survived each sampled discriminator:

```text
year: NaN | Infinity | -Infinity | 2024.5
month: NaN | Infinity | 0 | 13 | 1.5
day: NaN | Infinity | 0 | 32 | 1.5
```

These fields define the retained topology being trusted for settlement eligibility. Silently
accepting invalid bucket identity/components does not prove that the retained subtree is a valid
source. It lets invalid retained data participate in an issue-free total, which the explicit
dispatch says must fail.

Positive neighbor probes passed:

- exact `years: null` returns a contextual `invalid-hierarchy` issue and no qualifying transaction;
- a valid sibling alongside `years: null` preserves its valid obligation and reports the issue,
  independent of insertion order; and
- sanctioned root `$cid` metadata is ignored.

Those closures do not cover required field semantics. The checked-in malformed-hierarchy table and
generated oracle at `tests/unit/domain/settlement.test.ts:970-1166` vary container types and record
presence, but construct numeric `2024 / 1 / 1` discriminators for every valid envelope. They never
vary missing/mismatched tree `accountId`, non-finite/fractional numbers or supported calendar
ranges.

Required narrow revision-04 correction:

1. Validate each account tree's required `accountId` as the canonical string identity and require
   consistency with its retained map key.
2. Require safe integral discriminators and validate supported calendar semantics: year within the
   application's supported `Temporal.PlainDate` range, month 1–12, and day valid for the resolved
   year/month rather than merely 1–31.
3. Emit stable contextual hierarchy issues, exclude only invalid branches, preserve valid siblings,
   and retain deterministic ordering, immutability and caller-input purity.
4. Add direct and generated tests for missing/null/primitive/mismatched `accountId`; `NaN`,
   infinities, negative zero, fractions, unsafe integers and boundary years; invalid months; and
   impossible dates including leap/non-leap February. Run each under insertion permutations and
   alongside valid siblings.

## Revision-02 closure audit

Revision 03 materially closes the literal examples dispatched from review 02:

- **F-04 exact built-in/class cases closed.** Non-empty/empty `Map`, `Set`, `Date`, `RegExp`, typed
  collections and direct class instances now receive `invalid-container` at both allocation and
  ownership boundaries. Ordinary and null-prototype records remain accepted. Missing allocation
  remains the canonical empty allocation.
- **F-05 exact malformed-container cases closed.** Store root, account tree, years, year, months,
  month, days, day, transactions and transaction shapes now produce typed contextual issues. Mixed
  malformed elements retain every duplicate occurrence; malformed transaction issues use
  deterministic logical deduplication; valid siblings survive.

The closure is shape-specific rather than boundary-complete. F-04 remains because later operations
can throw or silently omit hidden values; F-05 remains because required semantic fields are still
accepted without validation.

## Passing canonical-engine audit

- `settlement.ts` remains the only callable production settlement implementation. There is no
  compatibility alias, caller-side transaction flattening or competing formula.
- Canonical examples A–H, signed expenses/income, positive/zero/negative owner remainder, deleted
  Treat-as-Paid status behavior, non-paid exclusion and transfer-tag neutrality pass.
- Retained parent/nested topology, active-before-same-ID selection and exact active-copy collapse
  remain deterministic. The retired flat-array runtime input is rejected.
- P16A exact apportionment remains the arithmetic authority. Currency positions conserve exactly;
  matching removes zeros, reverse-nets within one currency and preserves signed source traceability.
- Collision-framed successful cache identity and non-cached validation failures remain correct for
  delimiter, NUL and Unicode identities.
- Aggregate writes remain transaction-atomic at the safe-integer boundary. Result graphs are newly
  allocated and recursively frozen without freezing or mutating valid caller inputs.
- `BalanceSummary` passes the retained store to the sole engine, groups by currency and suppresses
  settled claims whenever issues exist. P16D allocation editing and P16E source expansion,
  no-qualifying detail and optimization remain outside this package.
- No settlement result, cache value, description, note, amount, person marker or key material is
  persisted by this implementation.

## Independent arithmetic and adversarial evidence

The reviewer bundled the production export in memory with repository-installed `esbuild` and piped
it directly to Node. No script, fixture, test or configuration file was created.

1. Initial seed `26072501`, 5,000 two-person signed cases:
    - amounts spanned ±1,000,000 minor units;
    - explicit Bob percentages spanned `-100..100`, with Alice receiving the exact remainder;
    - ownership remained Alice 100%; and
    - an independent BigInt hundredths oracle used mathematical negative floor, remainder ranking
      and ascending stable-ID ties.

    Every production position matched the oracle and every case conserved to zero. The emitted final
    PRNG state was `170605125`.

2. Initial seed `16001611`, 1,000 eight-transaction USD/EUR batches:
    - reversing transaction order and reversing account-tree insertion preserved the complete
      result; and
    - every returned currency position independently conserved to zero.

    The emitted final PRNG state was `2582854411`.

3. Empty, colon, pipe, equals, NUL, embedded NUL, combining Unicode, emoji and a supplementary-plane
   person ID all remained distinct across nine independent cases.

4. The exact malformed cache-collision pair returned three distinct issues, while a
   `Number.MAX_SAFE_INTEGER` multi-creditor case returned one atomic `unsafe-calculation` at the
   position stage.

All arithmetic/adversarial oracles passed. The dedicated production-boundary probes above establish
F-04/F-05 independently of those passes.

## Independent automation

| Gate                                                     | Independent result                                         |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| Settlement/balance/caller focus, clean run 1             | PASS; 3 files / 107 passed + 1 skipped in 4.00 s           |
| Settlement/balance/caller focus, clean run 2             | PASS; 3 files / 107 passed + 1 skipped in 4.00 s           |
| Settlement/balance/caller focus, clean run 3             | PASS; 3 files / 107 passed + 1 skipped in 4.02 s           |
| Full domain plus changed caller                          | PASS; 14 files / 506 passed + 2 skipped in 11.45 s         |
| `pnpm test -- --pool=forks --maxWorkers=1`               | PASS; 63 files / 1,398 passed + 2 skipped in 6.58 s        |
| `pnpm typecheck`                                         | PASS                                                       |
| `pnpm lint`                                              | PASS exit 0; 0 errors / 10 inherited warnings              |
| `pnpm build`                                             | PASS; compile 6.2 s, TypeScript 9.1 s, 17 routes generated |
| Exact two-path `oxfmt --check` / ESLint                  | PASS / PASS with no diagnostics                            |
| Exact and cumulative `git diff --check`                  | PASS / PASS                                                |
| Accounts + Transactions Chromium, one worker / retries 0 | PASS; 46/46 in 3.0 minutes                                 |
| Full Chromium, one worker / retries 0                    | PASS; 102/102 in 6.7 minutes                               |

Repository `pnpm format:check` exits 1 on exactly the frozen 14 Markdown paths: six root ledgers,
P12 implementations 03–06, P12 reviews 05–06, P14 implementation revision 01 and
`specs/human-scratch.md`. No P16B product/test path fails its exact format or lint gate.

The full Chromium run emitted deliberate offline/authentication diagnostics only in journeys that
exercise those states; all 102 tests passed without retry. The checked-in suites do not construct
the proxy/getter/iterator traps or invalid required hierarchy discriminators from F-04/F-05.

## Performance

The independent opt-in benchmark used Node `v22.21.1`, excluded fixture construction, ran five
1,000-transaction warmups and retained full immutable output:

- 10,000 transactions: `28.84` ms;
- 50,000 transactions: `138.39` ms; and
- 100,000 transactions: `255.33`, `292.06`, `248.83`, `253.73`, `254.21` ms.

Every 100k sample returned 75,000 contributions, two obligations, zero issues and exact position /
source conservation. Scaling remains near-linear. The approximate 200 ms target did not pass; the
implementation evidence reports this honestly as the existing P16E optimization risk. Under the
explicit dispatch adjudication, it is not an additional P16B correctness blocker.

## Independent manual-browser adjudication

Root cleaned automation state and started a fresh keyed app server at `http://localhost:3000`. The
reviewer used only repository-installed `playwright-cli`, unique disposable session
`p16b-review-03`.

- Fresh onboarding completed through the real app. All 12 recovery entries remained masked behind
  `Click to reveal`; the phrase was never revealed, copied, read or printed.
- Through normal UI only, the reviewer created person `P16B03ReviewBob`, USD account
  `P16B03ReviewJoint` with Me/Bob ownership 50%/50%, Paid `-100.00` transaction `P16B03Paid`, and
  For Review `-20.00` transaction `P16B03ForReview`.
- After real reload, both rows retained their exact account, status and amount. People retained two
  members and showed `No outstanding balances between members` / `Everyone is settled up`. This is
  the expected honest total: the paid transaction's effective allocation equals joint ownership,
  while the non-paid transaction is excluded.
- At `390x844`, body client/scroll width was exactly `390/390`. At 200% document zoom from a 1280
  viewport, effective body client/scroll width was `640/640`; vertical scrolling reached exact
  `scrollY === maxScrollY === 844`.
- Forced `.dark` styling plus emulated reduced motion at `390x844` retained `390/390` width.
  Computed dark-theme contrast was `17.05:1` for Settlement Summary and `6.79:1` for both supporting
  and settled text, each passing the recorded `4.5:1` threshold.
- Deterministic accessibility snapshots exposed the People level-1/level-2 headings, count `(2)`,
  Add Person button, both member names, Settlement Summary, no-outstanding text and settled state.
  No task-relevant focus, role, name, state or reflow defect was observed.
- Console inspection reported six messages total, zero errors and zero warnings. Completed listed
  requests were successful; one old line was still represented as in-flight, not as a failure.
- Boolean-only privacy scans found zero exact marker hits in the request URL list, ten captured
  mutation bodies, one local-storage entry, four session-storage entries, or 26 keys/values across
  one IndexedDB database / three stores. No stored value or request body was emitted.

The normal UI cannot safely manufacture malformed retained topology or trap-bearing runtime objects.
No test-only corruption, P16D allocation editor or P16E source-expansion UI was faked, so the
happy-path manual pass does not overrule the direct production failures.

`delete-data` found no remaining user data; the session was already not open when explicitly closed,
and `playwright-cli list` reported no browsers. The reviewer initially miscounted the enumerated
inventory as 23; root resolved it against the filesystem as exactly 22 current artifacts: one
console log plus 21 YAML snapshots. Root stopped the keyed server, verified port 3000 clear,
restored `next-env.d.ts`, moved current `.next` and exactly those 22 current artifacts to
recoverable trash, found no `test-results`, and preserved all 22 older CLI artifacts plus the older
`playwright-report`. Worktree and index were clean before this sole review write.

## Boundary, frozen sources, risks and questions

- Frozen implementation/review identities remain:
    - implementation 01: `48f10876f8e69e7f3bff022598c0236a775d061e1cc06a86cb3d48bfc60d3dfd`, 323
      lines / 21,736 bytes;
    - review 01: `5dd6be1a1efbdbecb0a4a3e42e54ec7d0b55a05555deebd88c3009c97fd7df38`, 314 lines /
      18,758 bytes;
    - implementation 02: `75f0b7e4c7ca72c38be5843a2ef2e0de032a9b2539979990573068ef08c5c75e`, 264
      lines / 18,293 bytes; and
    - review 02: `09814cd6a719189afd4951e6683b2f216d6eace729fe230d55add4a2c497054f`, 329 lines /
      19,155 bytes.
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
- The assigned product/test HEAD remains `cd643afc8f168b3c8328eb54f1d5f280ca7ec717`. This review is
  the sole reviewer-created path. No product, test, dependency, evidence, task, ledger, source
  marker, configuration or prior artifact was edited.
- No question proposal is required. The canonical invalid-data safety requirements and the
  dispatch's explicit rule that a throw, topology ambiguity or plausible invalid total must fail
  already decide F-04/F-05.
- The disclosed P16E performance follow-up remains non-blocking. F-04/F-05 require a new
  product/test HEAD and the next immutable implementation/review revisions.

## Single final verdict

**FAIL.** Revision 03 repairs the exact built-in-object and malformed-container reports and
independently passes arithmetic, deterministic matching, collision identity, automation, full
Chromium and the real-app manual happy path. It still lets trap-bearing retained records/lists throw
from the public calculation and still accepts missing/invalid account-tree and calendar
discriminators into issue-free plausible totals. Root must preserve this failed review, keep P16B
and FS-001 in `changes_requested`, and dispatch a narrow revision 04 over a new immutable
product/test HEAD.
