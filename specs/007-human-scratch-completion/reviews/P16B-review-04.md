# P16B Independent Review — Revision 04

## Review identity and verdict

- Package / requirement / revision: `P16B` / `FS-001` / `04`.
- Literal cumulative reviewed product range:
  `4c102600240e2804b801c2a320e10164defb14ea..e09eb6bdbbfd796d970d85ef36c212795bcb4912`.
- Exact revision-04 product/test delta:
  `e9ece18b11cd3ad0b6b8783b6c80200599e617fd..e09eb6bdbbfd796d970d85ef36c212795bcb4912`.
- Frozen implementation evidence: `evidence/P16B/implementation-04.md`, SHA-256
  `a49c3f89693fae09e7b176612e11c57c416814ecb531313ac6ffa7c4882ab001`, 283 lines / 19,250 bytes. The
  evidence freeze commit is `86dd6fc63a8476bd9aaf3a6b56f1571240803f45`.
- Frozen prior failed review: `reviews/P16B-review-03.md`, SHA-256
  `5eac6d9a52f5cf96fe921df734a4f52367b898ce94a7af9130ee6af21883af8d`, 377 lines / 21,986 bytes.
- Exact review/control HEAD before this artifact is `27a5e32018f817075e7e4dd26e4a8ffb685efe92`; the
  assigned product/test HEAD remains exactly `e09eb6bdbbfd796d970d85ef36c212795bcb4912`.
- The cumulative range contains 17 paths and has 6,279 insertions / 906 deletions. The exact
  revision-04 delta contains exactly the two assigned paths and has 1,027 insertions / 103
  deletions: `src/lib/domain/settlement.ts` and `tests/unit/domain/settlement.test.ts`. Both exact
  and cumulative `git diff --check` pass.
- **Verdict: FAIL.** Revision 04 independently closes the dispatched review-03 F-04/F-05
  reflection/snapshot, identity and calendar failures. However, the same account/status collection
  boundary now silently treats every string-valued entry as metadata. A malformed retained status
  can therefore disappear with no issue, and unrelated malformed account/status entries can coexist
  with an issue-free plausible settlement total. That violates the canonical invalid-data rule and
  the dispatch's explicit complete-issue decision rule.

## Blocking finding

### F-06 — arbitrary string-valued account/status entries are silently discarded as metadata

**Severity:** blocking.

The new snapshot boundary correctly materializes the account/status collection before enumeration.
The collection adapter then skips two distinct cases in one condition:

```text
src/lib/domain/settlement.ts:321-325
```

```ts
for (const [id, value] of Object.entries(snapshot.value)) {
    if (id === "$cid" || typeof value === "string") continue;
```

The exact `$cid` key is sanctioned Loro metadata. A string under any other account/status key is a
malformed collection entry, not metadata. Because the broad string branch runs before
`snapshotMaterializedRecord`, those entries never reach the contextual account/status issue path at
lines 325–336.

The loss is observable downstream:

- `calculateSettlementBalances` incorporates only the issues returned by the two collection adapters
  at lines 1064–1081;
- a missing account becomes a transaction-scoped `missing-account` at lines 1090–1097, which loses
  the collection-entry failure;
- a missing/malformed status is simply treated as non-paid at lines 1087–1088, with no issue at all;
  and
- a string entry not referenced by the valid transaction disappears completely while the valid
  transaction still commits its total.

### Direct production reproductions

The reviewer bundled the assigned production export with repository-installed `esbuild` and called
it directly. The common fixture contained one retained paid USD transaction `t`, amount `-100`,
Alice 100% ownership and Bob 100% allocation.

1. Referenced account entry `{ a: "not-metadata" }`:

    ```json
    {
        "issues": [{ "accountId": "a", "transactionId": "t", "type": "missing-account" }],
        "qualifying": 0,
        "obligations": []
    }
    ```

    The malformed account entry itself is not reported as the required account-hierarchy issue.

2. Referenced status entry `{ paid: "not-metadata" }`:

    ```json
    {
        "issues": [],
        "qualifying": 0,
        "obligations": []
    }
    ```

    The retained transaction and its malformed referenced status are silently reclassified as no
    qualifying transaction.

3. Unreferenced string account entry alongside valid `a`:

    ```json
    {
        "issues": [],
        "qualifying": 1,
        "obligations": [{ "amount": 100, "from": "bob", "to": "alice" }]
    }
    ```

4. Unreferenced string status entry alongside valid `paid` returned the same issue-free qualifying
   total.

No reproduction threw. That is still blocking: complete exception containment cannot turn malformed
retained input into invisible input. The result is allowed to preserve a valid sibling's financial
output only when the complete issue set makes the result explicitly incomplete.

### Independent generated confirmation

Reviewer seed `2607250801` generated 1,000 non-`$cid` keys and string payloads, varying collection
insertion order:

- 334 referenced malformed statuses all returned zero issues and zero qualifying transactions;
- 333 unreferenced malformed accounts all returned zero issues beside a valid qualifying obligation;
  and
- 333 unreferenced malformed statuses did the same.

Final PRNG state was `466329537`. The property establishes the mechanism beyond the four literal
examples and is not explained by one special key or insertion order.

### Coverage gap

The revision-04 tests prove the real initialized Loro mirror with its sanctioned metadata at
`tests/unit/domain/settlement.test.ts:358-374`. They test collection reflection traps at lines
942–981 and generated financial-map descriptor mechanisms at lines 1310–1370. They do not test a
non-`$cid` primitive entry within an otherwise valid account/status collection, whether referenced,
unreferenced, before or after a valid entry.

The TypeScript union `Record<string, Account | string>` / `Record<string, Status | string>` at
`src/lib/domain/settlement.ts:1058-1062` accommodates root metadata; it is not runtime authority to
discard arbitrary string values. The implementation already has the exact metadata key and the
entry-level typed issue path needed to distinguish the cases.

### Required narrow revision-05 correction

1. Skip only the exact sanctioned `$cid` collection key. Send every other entry, including strings,
   through the exception-safe entry snapshot/validation path and emit the stable contextual
   `account` or `status` hierarchy issue when invalid.
2. Add direct red tests for referenced and unreferenced string account/status entries. Assert the
   complete exact issue set, atomic exclusion of an affected transaction, preservation of valid
   siblings only under an incomplete result, deterministic insertion order, frozen output and
   unchanged/unfrozen input.
3. Add a generated primitive-entry property across account/status boundaries and insertion
   permutations. Retain the real initialized Loro-mirror test proving exact `$cid` acceptance.
4. Preserve the now independently proven revision-04 snapshot and calendar implementation. No
   caller, schema, dependency, E2E or component expansion is required by this finding.

## Revision-03 F-04/F-05 closure audit

### F-04 closed — the dispatched untrusted-runtime lifecycle is snapshotted safely

The new `snapshotMaterializedRecord` at `src/lib/domain/settlement.ts:220-254` contains prototype,
own-key and descriptor reflection in one catch boundary. It accepts ordinary/null-prototype data
records, rejects symbols/accessors/unapproved hidden fields, copies approved values into a fresh
null-prototype record and never invokes getters.

The parallel array boundary at lines 256–305 validates the real array prototype, own keys, length
descriptor, dense canonical indices and data descriptors before copying. Traversal therefore does
not invoke untrusted length, index or iterator access.

Those snapshots are applied before:

- account/status collection and entry consumption at lines 307–338;
- store/tree/year/month/day/transaction and duplicate traversal at lines 463–639;
- transaction physical-copy identity/fingerprinting; and
- allocation/ownership validation and cache identity at lines 1121–1151.

Reviewer-owned direct probes independently established:

- `getPrototypeOf`, `ownKeys` and `getOwnPropertyDescriptor` traps at allocation, ownership,
  account/status collection and entry, store, account-tree and array boundaries return typed issues
  without escaping;
- enumerable getters are never invoked;
- hidden financial entries, symbols and class/prototype shapes are rejected;
- hierarchy arrays with trapped iterator/index reads remain valid after descriptor copying, while
  reflection traps return contextual hierarchy issues;
- transparent ordinary-record proxy wrappers are copied and calculate correctly; and
- an armed descriptor proxy was inspected exactly once and was not touched after snapshot.

The mechanism generator below further covers these cases. No dispatched F-04 throw, later wrapper
read or hidden plausible-value loss was reproduced.

### F-05 closed — retained identity and supported calendar semantics are enforced

`src/lib/domain/settlement.ts:493-500` requires a non-empty string tree `accountId` equal to its map
key. Lines 583–598 require the retained transaction account to agree with the canonical tree.

Calendar components require safe integers and reject negative zero at lines 444–447. Year support
and full dates use `Temporal.PlainDate` with overflow rejection at lines 449–460 and 515–552.

Direct probes independently passed:

- missing, null, numeric, empty and different account-tree IDs;
- transaction/tree identity disagreement;
- `NaN`, both infinities, fractions, negative zero and unsafe integers;
- years outside the supported range, months 0/13, day 0/32, non-leap February and April 31;
- leap day and exact `-271821-04-19` / `275760-09-13` supported endpoints; and
- mixed valid/invalid siblings, with the valid branch retained and the exact contextual issue
  preserved.

No dispatched F-05 invalid identity/date branch contributed to qualifying count or financial output.

## Canonical mapping

| Authority                                                                                                             | Independent adjudication                                                                                              |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Canonical spec §5.10, line 166: invalid data must never produce a plausible incorrect result                          | **FAIL:** arbitrary string collection entries disappear; valid siblings can still yield an issue-free plausible total |
| Canonical spec §11, lines 502–513: invalid legacy data is surfaced as typed issues and affected totals are incomplete | **FAIL:** a referenced malformed status and unreferenced malformed collection entries produce no issue                |
| Canonical spec §12, lines 538–543: stable issue type and applicable context                                           | **FAIL:** status context is absent; account entry context degrades to `missing-account` only when referenced          |
| Binding P16B task lines 86–91: structured typed issues and exact invalid exclusion                                    | **FAIL** on complete issue reporting; financial exclusion itself remains atomic                                       |
| Binding P16B acceptance lines 102–106: invalid data cannot produce plausible totals                                   | **FAIL** on the unreferenced-string sibling reproductions                                                             |
| Handoff residual F-04/F-05                                                                                            | **PASS:** exact snapshot/trap/identity/calendar failures close                                                        |
| Handoff decision rule: any hidden plausible loss or issue-free invalid total fails                                    | **FAIL:** F-06 is exactly that adjacent collection-entry loss                                                         |

The immutable canonical source remains SHA-256
`0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes. The
binding task remains SHA-256 `0d1c9512b74b23aa19e20e58a704a5212a4ae0ce1fc429707fe912fcd3f8be48`, 246
lines / 18,013 bytes.

## Passing canonical-engine and preservation audit

- `settlement.ts` remains the sole callable production settlement engine. The domain barrel exposes
  it; `balance.ts` has no competing implementation, and `BalanceSummary` passes the retained
  hierarchical store directly.
- Named canonical examples A–H, signed expense/income, positive/zero/negative owner remainder,
  deleted Treat-as-Paid status behavior, non-paid exclusion and transfer-tag neutrality pass.
- Retained parent/nested topology, active-before-same-ID selection and exact active-copy collapse
  remain deterministic. The retired flat-array runtime input remains rejected.
- P16A exact signed apportionment remains the arithmetic authority. Currency positions conserve
  exactly; deterministic matching removes zeros, reverse-nets only within one currency and retains
  signed source traceability.
- Collision-framed cache/aggregate identities preserve delimiter, NUL, combining Unicode, emoji and
  supplementary-plane identities. Validation failures are not cached as successful derivations.
- Aggregate writes remain transaction-atomic at the safe-integer boundary. Result graphs are newly
  allocated and recursively frozen without freezing or mutating valid caller inputs.
- The current People caller suppresses settled claims whenever issues exist. P16D allocation editing
  and P16E source expansion/no-qualifying detail remain outside this package.
- No settlement result, cache value, description, note, amount, person marker or key material is
  persisted by this implementation.

The blocking finding is narrow and does not invalidate these passing invariants.

## Independent generated and arithmetic evidence

All reviewer-owned probes called the production bundle directly; no script, fixture, test or
configuration file was created.

1. Snapshot mechanism seed `2607250601`, 2,000 cases:
    - 560 generated allocation boundaries;
    - 493 generated ownership boundaries;
    - 547 generated hierarchy-array boundaries; and
    - 400 transparent wrappers with armed property reads.

    Property names, percentages, boundary selection and reflection/accessor/hidden/symbol/prototype
    mechanisms varied. Every invalid case returned its typed issue without throwing; every
    transparent case calculated after zero trapped property reads.

2. Calendar seed `2607250701`, 5,000 cases:
    - 859 valid dates;
    - 4,141 invalid year/month/day inputs; and
    - an independent proleptic-Gregorian oracle with explicit supported endpoints `-271821-04-19` /
      `275760-09-13`.

    Production matched the expected valid result or exact hierarchy level in every case.

3. Rational seed `26072501`, 5,000 signed multi-owner cases:
    - amounts spanned ±1,000,000 minor units;
    - ownership and positive/zero/negative remainder paths varied; and
    - an independent BigInt rational oracle used mathematical negative floor, remainder ranking and
      stable-ID ties.

    Every production position matched, and every result conserved to zero. Final PRNG state was
    `3826238165`.

4. Reverse/currency seed `16001611`, 1,000 eight-transaction USD/EUR batches:
    - reversing transaction order and account-tree insertion preserved the complete result;
    - every currency independently conserved to zero; and
    - every obligation's signed source sum equalled its positive amount.

    Final PRNG state was `2470714763`.

All arithmetic and dispatched F-04/F-05 mechanisms pass. Finding seed `2607250801` is reported
separately because its 1,000 cases correctly force this review's FAIL.

## Independent automation

| Gate                                                     | Independent result                                         |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| Settlement/balance/caller focus, clean run 1             | PASS; 3 files / 159 passed + 1 skipped in 4.54 s           |
| Settlement/balance/caller focus, clean run 2             | PASS; 3 files / 159 passed + 1 skipped in 4.56 s           |
| Settlement/balance/caller focus, clean run 3             | PASS; 3 files / 159 passed + 1 skipped in 4.55 s           |
| Full domain plus current caller                          | PASS; 14 files / 558 passed + 2 skipped in 11.99 s         |
| Required full Vitest, forks / one worker                 | PASS; 63 files / 1,450 passed + 2 skipped in 56.52 s       |
| `pnpm typecheck`                                         | PASS                                                       |
| Exact two-path `oxfmt --check` / ESLint                  | PASS / PASS with no diagnostics                            |
| `pnpm lint`                                              | PASS exit 0; 0 errors / 10 inherited warnings              |
| `pnpm build`                                             | PASS; compile 4.9 s, TypeScript 8.4 s, 17 routes generated |
| Exact and cumulative `git diff --check`                  | PASS / PASS                                                |
| Accounts + Transactions Chromium, one worker / retries 0 | PASS; 46/46 in 3.0 minutes                                 |
| Full Chromium, one worker / retries 0                    | PASS; 102/102 in 6.7 minutes                               |

An initial repository-script invocation using a literal argument separator ran the full suite under
its default scheduling and hit only the unrelated duplicate-detection timing assertion: measured
ratio `4.1363815291788395` versus limit `< 4`. It reported 62 passing files, one timing failure,
1,449 passing tests and two skips. The required explicit forks/one-worker process above then passed
all 63 files, including that test. Both outcomes are retained; no P16B test failed.

Repository `pnpm format:check` exits 1 on exactly the frozen 14 Markdown paths: six current ledgers,
P12 implementations 03–06, P12 reviews 05–06, P14 implementation 01 and `specs/human-scratch.md`. No
assigned product/test path fails its exact format or lint gate.

The browser runs used read-only E2E files. Deliberate offline/authentication/realtime diagnostics
appeared only in journeys that exercise those states; no test failed or retried.

## Honest performance

The opt-in full-output benchmark used Node `v22.21.1`, excluded fixture construction, ran five
1,000-transaction warmups and retained complete immutable output:

- 10,000 transactions: `81.28` ms;
- 50,000 transactions: `391.86` ms; and
- 100,000 transactions: `815.32`, `787.80`, `852.72`, `751.29`, `761.14` ms.

The 100,000 fixture returned 75,000 contributions, two obligations, zero issues and exact
conservation. Scaling remains near-linear, but all five 100,000 samples exceed the strict
approximately 200 ms aspiration. This is the already disclosed P16E optimization follow-up and is
not an additional P16B revision-04 blocker under the handoff.

## Independent manual-browser adjudication

Root cleaned automation state and started a fresh keyed app server at `http://localhost:3000`. The
reviewer used only repository-installed `playwright-cli`, unique disposable session
`p16b-review-04`.

- Fresh onboarding completed through the real app. All 12 recovery entries remained masked behind
  `Click to reveal`; the phrase was never revealed, copied, read or printed.
- Through normal UI only, the reviewer created person `P16B04ReviewBob`, USD account
  `P16B04ReviewJoint` with Me/Bob ownership 50%/50%, Paid `-100.00` transaction `P16B04Paid`, and
  For Review `-20.00` transaction `P16B04ForReview`.
- After real reload, both rows retained their exact account, status and amount. People retained two
  members and showed `No outstanding balances between members` / `Everyone is settled up`. This is
  the expected honest result: paid effective allocation equals joint ownership, while the non-paid
  transaction is excluded. It also re-proves that the real initialized Loro mirror does not produce
  a false incomplete issue.
- At `390x844`, document and body client/scroll widths were exactly `390/390`. At 200% document zoom
  from a 1,280-wide viewport, body client/scroll width was `640/640`; vertical scrolling reached
  exact `scrollY === maxScrollY === 844`.
- Forced `.dark` styling plus emulated reduced motion at `390x844` retained `390/390` body width.
  Computed dark-theme contrast was `17.05:1` for Settlement Summary and `6.79:1` for both supporting
  and settled text, above the recorded `4.5:1` threshold. Reviewer-inspected screenshots showed no
  clipping, overlap or task-relevant visual defect.
- Deterministic accessibility snapshots exposed People level-1/level-2 headings, count `(2)`, Add
  Person, both member names, Settlement Summary, no-outstanding text and settled state. No
  task-relevant focus, role, name, state or reflow defect was observed.
- Console inspection reported five messages total, zero errors and zero warnings. Every listed
  completed request returned `200 OK`.
- Boolean-only privacy scans found zero exact marker hits in request URLs, ten captured mutation
  bodies, one local-storage entry, four session-storage entries, or 26 keys/values across one
  IndexedDB database / three stores. No stored value or request body was emitted.

The normal UI cannot safely manufacture malformed retained topology or trap-bearing runtime objects.
No test-only corruption, P16D allocation editor or P16E source-expansion UI was faked, so the
happy-path manual pass does not overrule the direct F-06 production failure.

`delete-data` found no remaining user data; the session was already not open when explicitly closed,
and `playwright-cli list` reported no browsers.

Root stopped the keyed server and verified port 3000 clear, restored `next-env.d.ts`, moved current
`.next` and exactly 24 current manual artifacts to recoverable trash, and preserved all 22 older CLI
artifacts. The exact current manifest was one console log, 20 YAML snapshots and three PNGs. The
full Chromium run had replaced the older `playwright-report` timestamp; root truthfully treated that
regenerated report as current reviewer output and moved it to recoverable trash with `test-results`.
Worktree and index were clean before this sole review write.

## Frozen boundaries, risks and questions

- Frozen human scratch remains SHA-256
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, 350 lines / 24,250 bytes.
  HS-009 remains unchecked.
- Immutable canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- The assigned product/test HEAD remains `e09eb6bdbbfd796d970d85ef36c212795bcb4912`. This review is
  the sole reviewer-created path. No product, test, dependency, evidence, task, ledger, source
  marker, configuration or prior artifact was edited.
- No question proposal is required. The immutable invalid-data rule, binding P16B acceptance and
  dispatch decision rule directly decide F-06. Skipping only exact `$cid` is the narrow existing
  hierarchy; no ambiguity must be elevated to weaken complete typed exclusion.
- The disclosed P16E performance follow-up remains non-blocking. F-06 requires a new product/test
  HEAD and the next immutable implementation/review revisions.

## Single final verdict

**FAIL.** Revision 04 independently closes every dispatched review-03 trap/snapshot/spoof/hidden
value and identity/calendar reproduction, preserves arithmetic/currency/netting/source/immutability
invariants, and passes all required automation and honest manual-browser gates. It nevertheless
silently discards every non-`$cid` string-valued account/status entry. Referenced malformed statuses
produce no issue, and unreferenced malformed entries allow issue-free plausible valid-sibling
totals. Root must preserve this failed review, keep P16B and FS-001 in `changes_requested`, and
dispatch the narrow revision-05 correction over a new immutable product/test HEAD.
