# P12 Independent Review — Revision 01

## Review identity and verdict

- Package / requirement / revision: `P12` / `HS-005` / `01`.
- Literal reviewed range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..f9edda60afc946ddda927616a16435a075167d7c`.
- Frozen implementation evidence: `evidence/P12/implementation-01.md`, SHA-256
  `f67fec9718efadcd1bf7d3f8036b29afab68d5a618985f899ec328511ea2d452`, 256 lines / 19,209 bytes.
- The range is one commit and changes exactly the seven authorized product/test paths: 1,798
  insertions and 3 deletions. `git diff --check BASE..HEAD` passes.
- **Verdict: FAIL.** The range does not keep reads correct while a transaction is copied between
  conflict buckets, permits user edits/deletes/moves in that observable interval to leave divergent
  duplicates or resurrect deleted data, makes current-session alias collection depend on provider
  remount, and does not truly bound work or guarantee phase progress. In addition, the new required
  large-conflict test is independently flaky and failed in four of six isolated/focused processes.
  HS-005 must remain unchecked and P12 requires revision 02.

## Findings

### F-01 — High / blocking: copy and removal are observably non-atomic and intervening user actions corrupt semantics

The structural repair copies a complete transaction into the canonical bucket in one `system:gc`
commit (`src/lib/crdt/maintenance.ts:714-740`). A structural mutation then resets the cursor and
returns the frame immediately (`maintenance.ts:786-817`). Removal of the old source transaction or
source bucket can only be discovered and committed by later maintenance work
(`maintenance.ts:741-779`). This creates a normal observable state containing two transactions with
the same logical ID.

That intermediate state is not hidden or coalesced at the read boundary:

- `getAccountTransactions()` explicitly unions every same-day conflict bucket by appending all
  transactions, with no ID deduplication (`src/lib/crdt/queries.ts:154-201`).
- `useActiveTransactions()` likewise walks every bucket and appends every active transaction
  (`src/lib/crdt/context.tsx:460-492`).
- `TransactionTable` derives selection IDs and its ID-to-index map from the duplicated list, then
  renders `key={transaction.id}`
  (`src/components/features/transactions/TransactionTable.tsx:208-214, 411-423`). The UI can
  therefore render a duplicate row/count and has ambiguous selection, focus, presence and React
  identity while maintenance is between frames.

The interval is not merely cosmetic. All normal mutations locate the first matching ID across the
day buckets and return (`src/lib/crdt/mutations.ts:363-399, 406-429, 449-475, 482-511`). After the
copy commit, this resolves to the newly inserted canonical copy. Consequently:

1. Editing the canonical copy makes it differ from the old source. The later structural-removal
   proof then refuses removal because `transactionsMatch()` is false
   (`maintenance.ts:68-105, 748-779`). Neither copy is subsequently eligible, so divergent duplicate
   rows remain permanently.
2. Deleting the canonical copy leaves the old source. The next scan sees no earlier copy and copies
   the source back into the canonical bucket, resurrecting the user's deleted transaction.
3. Moving the canonical copy leaves the source at the old date. Maintenance copies the old source
   into the old canonical bucket, leaving the same ID visible at both the old and new dates because
   repair only compares copies for the source transaction's date.

The stale-plan test mutates before the first copy plan is applied and only proves that one stale
plan is rejected (`tests/unit/crdt/maintenance.test.ts:226-245`). It does not subscribe or query
between copy/removal frames and does not edit, delete or move during that interval. The property
test drains both peers to a final state and generates disjoint `left-*` and `right-*` IDs
(`maintenance.test.ts:330-374`); it never exercises concurrent same-ID histories or operations
between the two commits. This violates the frozen requirements for correct reads before completion,
no dependent intermediate reads, and no loss/reordering/duplication under concurrent same-ID
edits/deletes/moves.

Required closure: make relocation unobservable as a duplicate logical record and safe against
intervening operations. A revision must prove subscribed query/UI state at every maintenance commit,
plus edit, hard/soft delete, move and same-ID concurrent peer cases between copy and removal. Final
drain-only assertions are insufficient.

### F-02 — High / blocking: the alias safety barrier never expires, so active-session GC requires remount

`startVaultMaintenanceScheduler()` keeps an append-only `sessionChangedAliasIds` set
(`src/lib/crdt/maintenance.ts:843-846`). Every non-GC alias event adds the affected ID, and there is
no deletion or history-lifecycle transition (`maintenance.ts:881-898`). Both direct-reference
rewrite and hard-delete plans for any ID in the set are rejected forever by that scheduler instance
(`maintenance.ts:853-869`).

This means the ordinary current-session **Change all** path creates a source symlink which the
active worker is permanently forbidden to rewrite or collect. The new integration test explicitly
freezes this behavior: it expects `session-source` still to exist after all active frames, disposes
the scheduler, mounts a new scheduler, and only then expects the source to disappear
(`tests/integration/vault-maintenance.test.tsx:166-186`). Provider replacement/remount is therefore
the collection trigger, not a test artifact.

This contradicts HANDOFF's explicit rejection of a remount-only substitute and the frozen
requirement that the production RAF worker actually rewrites direct references and hard-deletes
proven-unreferenced symlinks. The direct and nested rewrite functions and their fresh hard-delete
proof are locally sound (`src/lib/crdt/description-aliases.ts:231-321`), but the production
scheduler prevents them from running for precisely the aliases created or changed in the live
session.

Required closure: replace the session-lifetime blacklist with an explicit, finite Undo/Redo safety
condition and reschedule the alias when that condition clears. Prove change-all, Undo, Redo, history
invalidation/clear, active-provider collection, hidden/resume, document replacement and final
disposal without using remount as the normal completion mechanism.

### F-03 — High / blocking: the declared frame budget does not bound actual work and lower phases can starve

The frame loop checks time only before a discovery step (`src/lib/crdt/maintenance.ts:794-807`). It
does not check or cooperatively yield within planning, after planning, before apply, within apply,
or after apply. Yet one counted “item” can perform work proportional to the whole vault:

- Transaction discovery filters all matching year/month/day buckets, scans candidate transactions,
  recursively copies nested duplicate/tag/allocation data, and serializes both full records for
  equality (`src/lib/crdt/mutations.ts:202-222`; `src/lib/crdt/maintenance.ts:21-105, 535-560`).
- Structural apply re-runs whole-source proofs; a year removal flattens all of its days, and
  `canRemoveCopiedDays()` scans every transaction and earlier candidate (`maintenance.ts:748-779`).
- Alias hard-delete apply scans every direct and nested transaction reference and then every alias
  in one mutation (`src/lib/crdt/description-aliases.ts:258-320`).
- Copy apply recursively recreates an arbitrarily large transaction, including allocations, tags and
  suspected duplicates, in one commit (`maintenance.ts:21-65, 727-739`).

The time test supplies `apply: () => false` and advances its fake clock only when the outer loop
asks for `now()` (`tests/unit/crdt/maintenance.test.ts:149-177`). It therefore measures none of the
expensive planning or mutation work and cannot establish a 4 ms bound. The 256-item fixture uses
`now: () => 0` through `drainMaintenance()` and checks only `processed <= 32`
(`maintenance.test.ts:101-123, 207-223`), so it also says nothing about wall-clock work, nested
payload size or proof-scan cost.

Progress is not guaranteed either. Every relevant non-GC transaction or alias event rebuilds the
cursor at the initial `transactions` phase (`maintenance.ts:205-227, 881-898`). A sustained stream
of transaction edits can repeatedly restart the full transaction scan and indefinitely starve
`days`, `months`, `years` and `aliases`. Thus the worker is resumable only in a quiet document, not
under the continuous activity and large-vault conditions required by the package.

Required closure: define a genuinely bounded unit for discovery and mutation/proof work, include
that work in the clock/budget contract, and preserve fair progress across invalidations. Tests must
use large nested payloads and many aliases/transactions, measure or deterministically instrument all
work performed per callback, and demonstrate completion under sustained relevant edits.

### F-04 — Medium / blocking gate: the new large-conflict test is nondeterministically red

The 256-transaction fixture creates equal `creationInstant`/`importRowIndex` pairs across peers,
then uses JavaScript's stable sort over a locally concatenated left-before-right array as the
expected order (`tests/unit/crdt/maintenance.test.ts:207-220`). The converged Loro array's tie order
depends on the generated peer identities, so runs alternate between the assumed order and
deterministic right-before-left swaps for tied pairs.

Independent results were reproducible:

- The five-file focused P12 command, run in three separate processes, produced FAIL / PASS / FAIL;
  each red run had exactly this test failing (1 failed, 25 passed tests).
- The single large-conflict test, run in three further separate processes, again produced FAIL /
  PASS / FAIL with the same paired swaps.
- One broad `pnpm test` process happened to pass all 60 files / 1,247 tests; it does not negate the
  four independently reproduced failures.

Required closure: specify a total order for exact timestamp/index ties and implement/assert it, or
assert the actual documented CRDT invariant without assuming local peer order. The corrected focused
gate must pass at least three clean processes.

## Independent automated validation

| Check                                                                       | Independent result                                                                                   |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Focused P12 five-file set, three processes                                  | **FAIL / PASS / FAIL**; the large-conflict fixture failed in runs 1 and 3.                           |
| Large-conflict fixture alone, three processes                               | **FAIL / PASS / FAIL** with identical peer-tie swaps.                                                |
| `pnpm test`                                                                 | PASS in this process, 60 files / 1,247 tests.                                                        |
| `pnpm lint`                                                                 | Exit 0, 0 errors / 10 disclosed warnings, including the inherited TanStack Virtual compiler warning. |
| `pnpm typecheck`                                                            | PASS.                                                                                                |
| `pnpm build`                                                                | PASS, production build / 17 routes.                                                                  |
| Scoped `oxfmt --check` over all seven range paths                           | PASS.                                                                                                |
| `git diff --check BASE..HEAD`                                               | PASS.                                                                                                |
| Targeted four-journey E2E matrix, `--workers=1 --retries=0 --repeat-each=3` | PASS, 12/12 in 3.1 minutes.                                                                          |
| Full E2E, `--workers=4 --retries=0`                                         | PASS, 87/87 in 1.7 minutes.                                                                          |

The automated successes establish the tested clean end states, direct/nested alias rewrite, fresh
hard-delete proof, scheduler lifecycle/mock isolation, encrypted IndexedDB/server sync, no remote
echo and `system:gc` exclusion from Undo. They do not cover F-01's state between frames, F-02's
active-session completion, F-03's real work bound/fairness, or F-04's repeated-process gate.
Repository-wide `pnpm format:check` remains inherited red only on the seven disclosed root-owned
ledger/scratch files (`DECISIONS`, `DEPENDENCIES`, `HANDOFF`, `PROGRESS`, `QUESTIONS`, `RISKS` and
`human-scratch`); all P12 range paths pass the scoped formatter.

## Independent installed-CLI manual evidence

- Used the repository-installed `pnpm exec playwright-cli` with unique non-persistent session
  `p12-review-01` against the real Next application and hermetic Realtime container. The recovery
  phrase was never printed into tool output, logs or this artifact.
- Created two transactions sharing `Maintenance Coffee`, created `Maintenance Target`, selected the
  existing target and used rendered **Change all**. Both rows changed to the target. Rendered Undo
  restored both source descriptions and Redo restored both targets; the management page exposed only
  the legal real target.
- A second tab opened through `window.open()` inherited the live session and rendered the same two
  target rows. An offline amount edit to `13.37` remained locally visible; after reconnect and fresh
  navigation it persisted, the UI reached **Saved**, and current sync/realtime requests
  returned 200. Expected `ERR_INTERNET_DISCONNECTED` diagnostics occurred only while the context was
  deliberately offline.
- Route navigation, provider retention, reload/reconnect, duplicate-tab convergence and the
  management/transaction surfaces remained functional. The first root server attempt lacked the
  hermetic JWKS setup and returned one realtime-authorize 500; root replaced that environment before
  the functional charter resumed, after which authorization and sync requests were green. This was
  setup evidence, not a product finding.
- At a 320×720 viewport and 100% zoom, document width equalled viewport width. With dark OS
  preference active, the body still rendered the light `lab(100 0 0)` surface. At 200% CSS zoom the
  document measured 320/524 client/scroll width, the body 160/262, and the transaction grid's
  internal scroller 110/1,040. These are inherited accessibility/style findings: P12 changes no
  table or theme styles, so they remain routed to P20B/HS-021 (and theme presentation to P20A/P20B)
  rather than being misattributed to this range.
- Deleted both disposable transactions and the sole disposable real alias through rendered controls.
  Closed/deleted the CLI session and verified the installed CLI reports no browsers.

## Q-PROPOSAL-P12-01-01 — Finite Undo-safe alias collection barrier

- **Ambiguity:** the frozen requirement simultaneously requires current production GC to hard-delete
  obsolete symlinks and requires user Undo/Redo to remain correct, but no durable authority defines
  exactly when a source alias stops being reachable from history. Revision 01 resolves that gap by
  retaining every current-session alias until remount, which violates the active-worker requirement.
- **Option A — history reachability barrier (default):** the Undo coordinator exposes whether a
  specific alias can still be resurrected by live undo/redo entries. GC defers that alias only while
  reachable, subscribes to history-frontier changes, and requeues it as soon as unreachable. This
  gives finite, explainable retention and preserves active-provider collection, at the cost of an
  explicit maintenance/history interface.
- **Option B — durable undo payload independent of the live alias map:** history retains enough
  immutable payload to recreate the source even after GC. This permits immediate collection but adds
  schema/history complexity and a larger privacy/storage surface.
- **Option C — retain until provider remount (current behavior):** simplest, but collection may
  never happen in long-lived sessions and directly contradicts HANDOFF; reject.
- **Proposed default:** Option A. Require deterministic tests for change-all → GC barrier →
  Undo/Redo, history clear/trim → same-provider GC completion, and document replacement/disposal.
  Root alone should transcribe/adjudicate this proposal in `QUESTIONS.md`.

## Risk and ownership adjudication

- F-01 is a direct P12 data-integrity/read-correctness failure, not inherited risk. It affects
  concurrent same-ID operation ordering, edits, delete resurrection, moves, row identity and counts.
- F-02 is a direct P12 lifecycle/definition-of-done failure. Provider remount coverage cannot
  substitute for active-session completion.
- F-03 is a direct P12 boundedness/progress failure. The nominal item/time constants do not bound
  the actual callback, CRDT mutation or proof work.
- F-04 is a direct P12 required-test reliability failure. No retry was used or accepted.
- The dark-preference/light-surface and 200%-zoom overflow observations are inherited and remain
  routed to P20A/P20B; they do not alter this already-failing P12 verdict.
- No new crypto, plaintext, server-auth, transport, remote-echo or Undo-origin regression was found.
  Those focused tests and E2E paths passed, but cannot compensate for the four blockers above.

## Boundary, frozen-source and cleanup verification

- Final product/test HEAD remained exactly `f9edda60afc946ddda927616a16435a075167d7c` and the index
  remained empty. Before this review file, dirt was exactly root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md` and frozen untracked `evidence/P12/implementation-01.md`.
- Scratch remains SHA-256 `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350
  lines / 24,246 bytes. All 21 ordered blocks normalize byte-for-byte to SCOPE; the checked set is
  exactly HS-002/HS-004/HS-006/HS-010/HS-014/HS-017/HS-018. HS-005 remains unchecked.
- Immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes with 22 requirements.
- Root stopped the task-owned server; port 3000 is closed. No task-owned browser, Playwright-test or
  Next process remains. Exact generated `.playwright-cli`, `test-results`, `playwright-report` and
  `.next` artifacts were removed and generated `next-env.d.ts` was restored byte-for-byte.
- This review artifact is the sole reviewer-authored path and is intentionally uncommitted. I made
  no product, test, evidence, ledger, source, marker, configuration or prior-review edit.

## Single final verdict

**FAIL.** Revision 01 has material data-correctness, lifecycle, boundedness/fairness and
required-test reliability defects. Root must preserve this immutable failure review, record the Q
proposal and route F-01 through F-04 into P12 revision 02. HS-005 must remain unchecked.
