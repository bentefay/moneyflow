# P12 Independent Review — Revision 02

## Review identity and verdict

- Package / requirement / revision: `P12` / `HS-005` / `02`.
- Literal cumulative reviewed range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..e8f2ca5be7ffa03c0ad6ac8e3fb72aac2accca3e`.
- Frozen implementation evidence: `evidence/P12/implementation-02.md`, SHA-256
  `7ed3e646ec39a75ab11650fbdc17498c94f27aa2c1d5208970eb79ea2a451574`, 166 lines / 11,337 bytes.
- Revision-02 product/test delta is
  `b21ef639fb24020978cb39c2b69b83d6ff261ebb..e8f2ca5be7ffa03c0ad6ac8e3fb72aac2accca3e`: one commit,
  exactly eight authorized paths, 792 insertions and 173 deletions. The cumulative range contains 16
  product/test/control/artifact paths, 3,234 insertions and 257 deletions.
  `git diff --check BASE..HEAD` passes.
- **Verdict: FAIL.** Revision 02 closes the active-session Undo frontier, fairness and exact-tie
  reliability defects, and it makes the principal flat reads plus edit/delete/move coherent during
  relocation. It still does not bound work inside a frame: a single counted planner/applier item can
  recursively copy or compare an arbitrarily large transaction or scan an arbitrarily large vault
  proof before the next clock check. It also leaves copy-sensitive nested-duplicate mutations and
  exported read boundaries operating on one/all raw physical copies. These are direct HS-005
  performance and correctness defects. HS-005 must remain unchecked and P12 requires revision 03.

## Findings

### F-01 — High / blocking: nested-duplicate resolution still mutates only one relocation copy

Revision 02 correctly canonicalizes `getAccountTransactions()`, `getAllTransactions()` and
`useActiveTransactions()`, and changes update, soft/hard delete and move to affect all temporary
copies. The new between-commit tests demonstrate those specific operations
(`tests/unit/crdt/maintenance.test.ts:266-379`). That is meaningful closure of the principal part of
revision-01 F-01, but the invariant is not enforced at every mutation boundary.

`unnestDuplicate()` obtains only the single transaction returned by `findParentTransaction()`,
splices the nested record from that one parent and inserts one standalone record
(`src/lib/crdt/mutations.ts:579-599`). `findParentTransaction()` deliberately selects only the first
physical identity from all matching parents (`mutations.ts:390-402`). `swapDuplicate()` is even more
direct: it stops at the first day bucket/parent match and replaces only that physical parent
(`mutations.ts:606-635`). Both are production operations; the transaction page invokes unnest when
the user resolves a suspected duplicate (`src/app/(app)/transactions/page.tsx:606-630`).

During the normal copy/remove interval, a parent and all of its nested duplicates exist in both
physical parents because relocation recursively copies `suspectedDuplicates`
(`src/lib/crdt/maintenance.ts:28-65, 718-750`). If the user resolves a nested duplicate then:

1. one parent loses the nested record and a standalone record is inserted;
2. the other physical parent retains the old nested record;
3. `transactionsMatch()` no longer permits source removal because the two parents differ; and
4. maintenance has no operation which reconciles the divergent parent payloads.

The result is permanent hidden physical divergence and a nested/standalone duplicate identity; the
same defect applies to swap, with competing parent graphs. None of the revision-02 maintenance tests
invokes `unnestDuplicate()` or `swapDuplicate()` between copy and removal. The existing unit tests
for those functions create only one physical parent. This violates HANDOFF's explicit "nested
copies" and "every mutation boundary" closure conditions and the frozen no-loss, no-duplication
requirement.

Required closure: define one logical operation over every physical parent copy for unnest and swap,
including deterministic handling when copies already differ. Add subscribed between-commit tests for
both operations, direct/nested alias pointers and both same-ID peer delivery orders, and prove a
clean final physical graph rather than only a deduplicated flat read.

### F-02 — Medium / blocking gate: several exported query boundaries still expose arbitrary physical state

The new canonical helper is not used at all exported transaction read boundaries:

- `findTransaction()` returns the first parent or nested match encountered in CRDT bucket order
  (`src/lib/crdt/queries.ts:298-331`).
- `findTransactionById()` returns the first match encountered across accounts/buckets and is used by
  the production import duplicate path (`queries.ts:338-379`;
  `src/app/(app)/imports/new/page.tsx:182`).
- `getTransactionsInDateRange()` appends every physical transaction and sorts only by date, without
  logical-ID collapse or the peer-independent total order (`queries.ts:385-430`).

Consequently, before GC completes, these boundaries can return a stale physical copy, duplicate the
same logical ID, or choose a different physical record after CRDT materialization order changes. The
revised tests cover canonical account/all/UI reads, but the query tests for these three exports use
only clean single-bucket fixtures (`tests/unit/crdt/transaction-queries.test.ts:188-350`). This does
not satisfy HANDOFF's required canonical semantics at every read boundary.

Required closure: route every public flat/single transaction read through one documented canonical
selection/location rule and add duplicate-bucket/same-ID tests for these exports, including the
production import caller.

### F-03 — High / blocking: the 4 ms frame budget still observes rather than bounds arbitrarily large work

Revision 02 adds clock checks before planning, after planning and after apply
(`src/lib/crdt/maintenance.ts:786-831`). Those checks can detect that the budget was exceeded, but
cannot yield until the complete synchronous unit has already monopolized the callback. Each
`processed` item remains unbounded:

- Copy/equality recursively copies allocations, tags and every nested duplicate, then serializes the
  whole result (`maintenance.ts:22-70`). One transaction can contain arbitrarily many allocations,
  tags or nested duplicates.
- Transaction discovery calls `getDayBuckets()`, scans earlier candidates and can perform that full
  recursive equality before returning one step (`maintenance.ts:535-550`).
- Structural discovery/apply calls `canRemoveCopiedDays()`, which scans every source transaction and
  earlier candidate; year apply first flattens every day in the year
  (`maintenance.ts:90-105, 752-783`).
- Alias hard-delete apply scans every parent/nested transaction and then every alias before deleting
  one symlink (`src/lib/crdt/description-aliases.ts:259-321`).
- Relocation apply recursively recreates the complete transaction in one CRDT mutation
  (`maintenance.ts:718-750`).

The post-step `now()` checks at lines 808 and 815 occur only after those full operations. An
arbitrarily large transaction, year, vault or alias set can therefore consume far more than 4 ms in
one RAF callback; returning `yieldReason: "time"` afterwards does not make that callback bounded.
This is the exact caveat disclosed in implementation evidence, and HANDOFF explicitly instructs the
reviewer to reject a single arbitrarily large transaction-sized synchronous unit.

The time test advances a fake clock only when the outer loop calls `now()` and supplies
`apply: () => false` (`tests/unit/crdt/maintenance.test.ts:164-203`). The 256-transaction test uses
`now: () => 0` through `drainMaintenance()` and asserts only the outer item count
(`maintenance.test.ts:221-245`). Neither test instruments recursive field visits, proof-scan work or
mutation size, and neither can establish a per-callback wall-clock bound.

Required closure: make the resumable cursor address work inside transaction copies/comparisons,
structural proof scans and alias-reference proofs, or otherwise impose and enforce a genuinely
bounded payload invariant. Instrument the real units performed per callback with oversized nested
payloads, wide aliases and structural trees. Time checks around an indivisible unit are not
sufficient.

## Revision-01 finding adjudication

| Revision-01 finding                      | Revision-02 adjudication                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 copy/removal observable corruption  | **Partially closed.** Canonical account/all/UI reads and edit, hard/soft delete and move now cover all parent copies; same-ID delivery order is deterministic. F-01 and F-02 above remain for unnest/swap and exported query boundaries.                                                                                                                                              |
| F-02 session-lifetime alias blacklist    | **Closed.** The provider-owned Undo coordinator exposes a finite live alias-history frontier; push/pop, redo invalidation, clear, trim and disposal update it, and the scheduler reschedules when reachability clears (`undo.tsx:64-74, 107-145, 203-264, 326-359`; `maintenance.ts:843-930`). Independent focused/integration automation and manual Change all → Undo → Redo passed. |
| F-03 unbounded work and phase starvation | **Partially closed.** Persistent cursor progress under sustained relevant edits is proven by `vault-maintenance.test.tsx:261-287`; the scheduler no longer restarts on every event. Actual intra-step work remains unbounded as F-03 above describes.                                                                                                                                 |
| F-04 flaky exact-tie fixture             | **Closed.** `compareTransactionOrder()` adds stable ID ordering (`queries.ts:120-148`). The five-file profile passed 32/32 in three independent processes, and the isolated 256-transaction fixture passed in three independent processes.                                                                                                                                            |

## Independent automated validation

| Check                                                                         | Independent result                                                                                                                                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Five-file focused P12 profile, three separate processes                       | PASS / PASS / PASS; 5 files, 32/32 each. React `act(...)` warnings remain in the description-alias integration tests.                                                    |
| 256-transaction fixture alone, three separate processes                       | PASS / PASS / PASS; 1 passed / 9 skipped each.                                                                                                                           |
| `pnpm test`                                                                   | PASS, 60 files / 1,253 tests.                                                                                                                                            |
| `pnpm lint`                                                                   | Exit 0, 0 errors / 10 warnings. Two warnings are unused `AccountTransactionTree` / `YearBucket` imports in changed `queries.ts`; the remainder are disclosed/inherited.  |
| `pnpm typecheck`                                                              | PASS.                                                                                                                                                                    |
| `pnpm build`                                                                  | PASS, production build / 17 routes.                                                                                                                                      |
| Scoped `oxfmt --check` over all eight revision-02 paths                       | PASS.                                                                                                                                                                    |
| `git diff --check BASE..HEAD`                                                 | PASS.                                                                                                                                                                    |
| Repository-wide `pnpm format --check`                                         | Expected inherited FAIL only on the seven root-owned ledger/scratch files: `DECISIONS`, `DEPENDENCIES`, `HANDOFF`, `PROGRESS`, `QUESTIONS`, `RISKS` and `human-scratch`. |
| Targeted four-journey E2E profile, workers 1 / retries 0 / repeat 3           | PASS, 12/12 in 2.9 minutes.                                                                                                                                              |
| Full E2E, workers 4 / retries 0                                               | PASS, 87/87 in 1.7 minutes.                                                                                                                                              |
| Disclosed unrelated T021c shift-click test, three isolated no-retry processes | PASS / PASS / PASS, 1/1 each.                                                                                                                                            |

The independent browser results do not reproduce implementation evidence's final 86/87 run or its
isolated PASS / FAIL / FAIL sequence. The exact same shift-click case passed four times in this
review (once in the full suite and three isolated processes), while all affected P12 journeys also
passed. I therefore attribute that disclosed instability to the pre-existing transaction-selection
test/path rather than P12. It is not used to fail or excuse this package. No retry was used.

The passing automation establishes the tested canonical parent reads/mutations, deterministic tie
order, finite Undo frontier, scheduler fairness/lifecycle, direct/nested alias rewriting, fresh
hard-delete proof, encrypted persistence/server sync, no remote echo and `system:gc` exclusion from
Undo. It cannot compensate for the untested copy-sensitive boundaries or the frozen intra-frame
bounded-work requirement.

## Independent installed-CLI manual evidence

- Used repository-installed `pnpm exec playwright-cli` with unique non-persistent session
  `p12-review-02` against the real Next application and hermetic Realtime server. The recovery
  phrase was never printed into tool output, logs or this artifact.
- Created two transactions sharing `P12 Source`, created `P12 Target`, selected the existing alias
  and used rendered **Change all**. Both rows changed to target. Rendered Undo restored both source
  descriptions and Redo restored both targets.
- A second tab opened through normal `window.open()` session inheritance rendered both target rows.
  An offline amount edit to `34.56` remained visible; after reconnect/reload it persisted in both
  tabs, and the UI reported **Saved**.
- After history-clearing reload, the management page rendered only the legal real `P12 Target`; the
  source symlink was absent. Same-provider clear/redo-invalidation/trim/disposal are not exposed by
  rendered UI controls and were independently covered by the focused integration tests rather than
  claimed as manual observations.
- Current console inspection reported zero warnings/errors. Current sync, push, update, presence
  authorization and revoke requests returned 200. Navigation, provider retention, reload/reconnect,
  duplicate-tab convergence and the changed transaction/alias surfaces remained functional.
- At 320×720 and 100% zoom, document and body width equalled the 320 px viewport. At 200% CSS zoom,
  document width was 320/556 client/scroll and body width 160/278. With dark preference and reduced
  motion active, the body still rendered the light `lab(100 0 0)` surface. These are inherited
  presentation/accessibility observations routed to P20A/P20B, not P12 findings.
- Deleted both disposable transactions and the disposable real alias through rendered controls.
  Closed/deleted the CLI session and verified the installed CLI reported no browsers.

## Risk, questions and ownership adjudication

- F-01 is a direct P12 data-integrity defect. It is created by P12's multi-commit physical-copy
  interval and affects production nested-duplicate resolution.
- F-02 is a direct P12 read-correctness/gate defect under HANDOFF's every-boundary requirement; its
  production import caller makes it more than dead utility code.
- F-03 is a direct P12 boundedness defect and the exact unresolved caveat disclosed by the
  implementer. It is not an inherited large-vault risk.
- Revision-01 F-02 and F-04 are closed; no new Undo, sync, crypto, privacy, echo, lifecycle or
  exact-tie defect was found.
- The unrelated shift-click flake was not independently reproduced. The inherited dark theme and
  200%-zoom observations remain routed to P20A/P20B.
- No new `Q-*` proposal is needed. The required decisions are already explicit: HANDOFF rejects an
  arbitrarily large synchronous unit, and every physical copy/read/mutation boundary must preserve
  one logical transaction.

## Boundary, frozen-source and cleanup verification

- Final product/test HEAD remained exactly `e8f2ca5be7ffa03c0ad6ac8e3fb72aac2accca3e`; the index
  remained empty. Before this review artifact, dirt was exactly root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md` and frozen untracked `evidence/P12/implementation-02.md`.
- Scratch remains SHA-256 `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350
  lines / 24,246 bytes. HS-005 remains unchecked. Immutable canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes with 22 requirements.
- Root stopped the task-owned server; port 3000 is closed. No task-owned browser, Playwright or Next
  process remains. Generated `.playwright-cli`, `test-results` and `.next` artifacts were removed
  and generated `next-env.d.ts` was restored byte-for-byte.
- This review artifact is the sole reviewer-authored path and is intentionally uncommitted. I made
  no product, test, evidence, ledger, source, marker, configuration or prior-review edit.

## Single final verdict

**FAIL.** Revision 02 fixes the finite Undo frontier, fairness and deterministic test issues and
substantially improves parent-copy semantics, but it still has material nested-duplicate/read
correctness gaps and does not meet the frozen per-frame bounded-work requirement. Root must preserve
this immutable failure review and route F-01 through F-03 into P12 revision 03. HS-005 must remain
unchecked.
