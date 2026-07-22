# P12 Independent Review — Revision 03

## Review identity and verdict

- Package / requirement / revision: `P12` / `HS-005` / `03`.
- Literal cumulative reviewed range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..058098dc74833523bc4a05094b164af5635f327f`.
- Frozen implementation evidence: `evidence/P12/implementation-03.md`, SHA-256
  `540a3e497d3d33f4d82be5925d588e31b9ce37d030d43e88d3e412f6a38a33ce`, 139 lines / 8,688 bytes.
- Revision-03 product/test delta is `b2c32a40..058098dc74833523bc4a05094b164af5635f327f`: two
  commits, exactly seven authorized paths, 1,241 insertions and 348 deletions. The cumulative range
  contains 20 paths, 4,697 insertions and 331 deletions. `git diff --check BASE..HEAD` passes.
- **Verdict: FAIL.** Revision 03 makes alias proof/apply resumable, incrementally prepares detached
  transaction clones, and materially improves all-copy nested mutations and the three query exports
  named in review 02. It does not satisfy the decisive bounded-work gate: Loro 1.13.7 recursively
  attaches the entire prepared detached transaction tree inside the final
  `targetList.pushContainer(job.root)` call. One RAF callback therefore still performs work
  proportional to all tags, allocations and nested duplicates. A separate multi-account exported
  query path still exposes two copies of one logical transaction, and the required subscribed
  all-copy unnest/swap evidence was not added. HS-005 must remain unchecked and P12 requires
  revision 04.

## Findings

### F-01 — High / blocking: final detached-container attach is still an arbitrarily large synchronous unit

The new clone job performs at most eight dynamic preparation items per call
(`src/lib/crdt/maintenance.ts:1160-1271`). That bounds construction of the _detached_ map, but it
does not bound insertion of that map into the live document. When preparation completes,
`applyVaultMaintenancePlan()` executes:

1. `targetList.pushContainer(job.root)`;
2. source-list deletion and fixed-depth empty-bucket pruning; and
3. one `system:gc` commit

in the same callback (`maintenance.ts:1389-1401`).

The installed dependency is `loro-crdt` 1.13.7. Independent inspection of the exact official tag
(`loro-crdt@1.13.7`, commit `664687f38119a5637dbbb53c742954ad96e41c8f`) establishes that attach is
recursive, not constant-time:

- attached-list insertion creates a child ID and calls `child.attach(...)`
  ([official handler.rs:3213-3241](https://github.com/loro-dev/loro/blob/loro-crdt%401.13.7/crates/loro-internal/src/handler.rs#L3213-L3241));
- detached-map attach iterates every entry and recursively inserts child handlers
  ([handler.rs:591-613](https://github.com/loro-dev/loro/blob/loro-crdt%401.13.7/crates/loro-internal/src/handler.rs#L591-L613));
  and
- detached-list attach iterates every item and recursively inserts child handlers
  ([handler.rs:832-854](https://github.com/loro-dev/loro/blob/loro-crdt%401.13.7/crates/loro-internal/src/handler.rs#L832-L854)).

Consequently, final attach re-emits the root scalars and every prepared tag, allocation map entry,
nested map, nested tag and nested allocation in one indivisible operation. The next frame-budget
clock check is only after `input.apply(step.plan)` returns (`maintenance.ts:1446-1451`), so it can
observe the overrun but cannot prevent it. Incremental detached preparation performs the traversal
once in bounded chunks and Loro performs it again, recursively, at attachment.

The oversized test does not instrument this inner work. It counts calls until one observer event,
asserts more than 20 preparation calls and then checks the final payload
(`tests/unit/crdt/maintenance.test.ts:257-305`). It records no Loro operations/container visits made
inside the final call. Its one `system:gc` event proves atomic visibility and origin, not bounded
execution. This is the exact reject condition in the revision-03 HANDOFF independent gate.

Required closure: do not attach an arbitrarily large detached tree in one RAF callback. Use a live
staging representation whose individual attached mutations are bounded without exposing a public
copy-only state, or define and enforce a genuinely finite payload invariant accepted through the
PROCESS decision hierarchy. Instrument operations performed _inside_ final apply on oversized tags,
allocations and nested duplicates; a call/chunk counter outside `pushContainer()` is not evidence of
the invariant.

### F-02 — Medium / blocking gate: the multi-account exported query path skips global canonicalization

Revision 03 closes the three specific review-02 exports: `findTransaction()`,
`findTransactionById()` and `getTransactionsInDateRange()` now collect/canonicalize their candidate
copies. `getAccountTransactions()` and `getAllTransactions()` also use the shared selector. However,
the required audit of **every** exported transaction query is incomplete.

`queryTransactions()` handles two or more selected accounts by flat-mapping the already
account-local results and sorting the concatenation (`src/lib/crdt/queries.ts:683-697`). It does not
call `getCanonicalTransactions()` on that concatenation. If the same logical ID is materialized in
two selected account trees—for example, concurrent account moves—the public result contains both
physical copies and pagination counts both. This is precisely the cross-account case the HANDOFF
requires the reviewer to reproduce and reject. The no-filter branch does not have the defect because
it calls globally canonicalizing `getAllTransactions()` (`queries.ts:698-700`).

The sole new query fixture puts two divergent copies in duplicate buckets within one account and
checks the three named exports (`tests/unit/crdt/transaction-queries.test.ts:305-326`). It does not
cover `queryTransactions()` with multiple account IDs, pagination, or a same-ID cross-account
fixture. `getTransactionsWithDuplicates()` likewise concatenates account-local results without a
final global collapse when no account is specified (`queries.ts:453-471`), although its current
production callers are test-only.

Required closure: canonicalize after every cross-account merge before filtering/pagination, audit
the other exported flat-array boundaries under their documented preconditions, and add
cross-account/date same-ID tests for `queryTransactions()` and its pagination wrappers/callers.

### F-03 — Medium / blocking evidence gate: all-copy unnest/swap lacks the mandated subscribed CRDT proof

The revised algorithms now gather every physical parent copy, deterministically choose a parent and
promoted/nested value, remove matching parent/standalone identities and insert one result
(`src/lib/crdt/mutations.ts:593-738`). Static inspection finds no remaining obvious first-parent
early exit in these two functions.

The added tests, however, operate on a plain object `TransactionStore`. They synthesize a second
year by object spread, invoke the mutation directly and inspect the object
(`tests/unit/crdt/transaction-mutations.test.ts:530-569,624-662`). They do not use a Loro document,
subscribe through the operation, exchange updates in both delivery orders, retain direct/nested
alias pointers, or prove a clean converged physical graph. No maintenance test invokes
`unnestDuplicate()` or `swapDuplicate()` at all. This falls short of the explicit revision-03 F-01
gate, even though the implementation is directionally correct.

The new atomic relocation design also removes the prior public copy/remove commit interval for a
single maintenance move; that is useful closure, but it does not replace the mandated same-ID peer
and pre-diverged graph proof. Manual UI cannot create CRDT conflict buckets or an in-progress
detached job through normal controls, so ordinary-path manual coverage cannot fill this evidence
gap.

Required closure: add subscribed Loro tests for unnest and swap over real concurrent same-ID parent
copies, divergent nested payloads, standalone/nested identity collisions and direct/nested alias
pointers; exchange the resulting updates in both orders and assert one logical result plus an exact
clean physical graph.

## Revision-02 finding adjudication

| Prior finding                                        | Revision-03 adjudication                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 nested resolution mutates one relocation copy   | **Implementation improved, evidence gate remains open.** Both functions enumerate all parent copies and plain-state divergent fixtures pass. Required subscribed same-ID peer/both-delivery/alias/physical-graph proof is absent (F-03 above). Atomic final relocation also removes the former observer-visible copy-only commit. |
| F-02 exported query boundaries expose physical state | **Partially closed.** The three named exports now share canonical selection and their divergent single-account fixture passes. The broader required audit still fails on multi-account `queryTransactions()` and unscoped `getTransactionsWithDuplicates()` (F-02 above).                                                         |
| F-03 frame work is not genuinely bounded             | **Still open / decisive.** Search cursors, alias proof and detached preparation are finite; hard-delete apply no longer rescans the vault. Official Loro source proves final detached attachment recursively walks the complete tree in one callback (F-01 above).                                                                |

## Other acceptance and safety observations

- Alias proof discovery advances one transaction/nested/alias item at a time, and
  `hardDeleteProvenDescriptionAliasSymlink()` now performs only exact target/backlink validation and
  two deletes. There is no apply-time vault rescan.
- User/remote transaction or alias events clear detached clone jobs and transaction search state;
  alias-sensitive events also clear alias proof state (`maintenance.ts:1469-1555`). Plans retain
  exact indices/CIDs and state identity checks. No stale-plan application defect was independently
  reproduced.
- Final attach, source delete, fixed-depth pruning and `system:gc` commit share one pending Loro
  transaction. The subscribed oversized test observes exactly one event, so no partial public
  copy-only state was found. Atomic visibility does not cure the unbounded synchronous attach.
- The all-copy unnest/swap code preserves description-alias IDs in the selected payloads and uses a
  peer-stable physical identity when real Loro `$cid` values exist. The missing CRDT exchange tests
  prevent this review from accepting convergence closure.
- No new crypto, secret persistence, network protocol or authorization surface is introduced by the
  revision-03 delta.

## Independent automation

| Gate                                                                                                       | Independent result                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused profile: maintenance, transaction mutations, transaction queries and vault-maintenance integration | PASS in three clean processes; 4 files / 85 tests each.                                                                                                                                                                                |
| `pnpm test`                                                                                                | PASS; 60 files / 1,258 tests.                                                                                                                                                                                                          |
| `pnpm typecheck`                                                                                           | PASS.                                                                                                                                                                                                                                  |
| `pnpm lint`                                                                                                | PASS exit 0; 0 errors / 10 warnings (the disclosed repository warning set, including unused imports in changed query/mutation-test files).                                                                                             |
| `pnpm build`                                                                                               | PASS; compile/type generation and all 17 routes.                                                                                                                                                                                       |
| Changed-path `oxfmt --check`                                                                               | PASS; seven revision-03 paths.                                                                                                                                                                                                         |
| Repository `pnpm format:check`                                                                             | FAIL on eight out-of-scope/frozen/control files: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, frozen `implementation-03.md`, and `specs/human-scratch.md`. No product/test path failed. |
| `git diff --check BASE..HEAD`                                                                              | PASS.                                                                                                                                                                                                                                  |
| Affected no-retry E2E, four journeys with `--repeat-each=3 --workers=1`                                    | PASS; 12/12 in 2.9 minutes.                                                                                                                                                                                                            |
| Full no-retry E2E, `--workers=1`                                                                           | FAIL; 86/87 in 5.7 minutes. Sole red was inherited R-009/T021c shift-click: expected `3 selected`, element absent.                                                                                                                     |
| Exact T021c isolated, three clean no-retry processes                                                       | PASS / PASS / PASS; 1/1 each. Three earlier launch attempts exited before collecting a test because the root-owned manual server intentionally held port 3000; after its clean stop all three real replays passed.                     |

The browser full-suite red is outside the P12 product/test delta and matches the already-recorded
suite-order T021c risk. It does not create a new P12 finding, but the full gate is reported as FAIL,
not normalized to green. The affected P12 journeys remained stable. The focused oversized test's
green result is not accepted as boundedness proof for the reasons in F-01.

## Installed-CLI manual charter

- Used only repository-installed headless `pnpm exec playwright-cli` with disposable session
  `p12-review-03` against the root-started authenticated server. No MCP, `npx`, temporary test,
  headed/UI/debug/pause mode or arbitrary sleep was used.
- Created a fresh identity while the recovery phrase stayed masked as twelve bullet values in every
  emitted snapshot; it was never revealed, copied, read or printed.
- Created two `Review Shared` transactions (`12.34` and `23.45`) and one `Review Target`
  transaction. Editing one shared row and choosing `Change all` changed all three visible rows to
  `Review Target`. Undo restored the two shared rows; Redo changed all three back. Reload preserved
  the data, reset Undo/Redo, and Tx Descriptions showed only `Review Target` with three references.
- Opened a second tab through the same opener. Both independent provider instances showed two online
  presence IDs and the same three logical rows. With the loaded first tab offline, changed `12.34`
  to `12.35`; reconnect reached `Saved`, and the second tab showed `12.35` without refresh.
- A deliberate direct navigation while offline produced two expected
  `net::ERR_INTERNET_DISCONNECTED` requests. The already-loaded app remained editable offline. After
  reconnect, current-tab console inspection returned zero errors and vault/sync/realtime API
  requests returned 200.
- At 320 px the document width remained 320 px and semantic controls retained accessible names; the
  transaction grid used its contained horizontal presentation. Reduced-motion media was active. At
  simulated 200% zoom the 1,280 px document retained a 1,280 px root width and core controls/data
  remained usable. Dark media preference was active but the UI remained on the light palette; this
  is the inherited P20A/P20B theme observation, not a P12 regression.
- Normal UI controls cannot create duplicate CRDT year/month/day buckets, concurrent same-ID parent
  copies, a wide alias proof graph, or pause during detached clone preparation. Those required
  internal cases were therefore automation/static-audit only; manual success is not used to waive
  F-01 or F-03.

## Boundary, cleanup and questions

- Frozen human scratch remains SHA-256
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines / 24,246 bytes, with
  HS-005 unchecked. Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Revision-02 review remains SHA-256
  `91fb0949549ffe2481f5109bf98808d07304bee97710ac244a0d2366cd79738b`.
- CLI session was closed; its data-deletion command found no residual user data. Root stopped the
  manual server cleanly. `.playwright-cli/`, `test-results/` and the exact temporary Loro source
  checkout were removed; `next-env.d.ts` was restored; no reviewer browser/dev/test process remains.
- Before this review artifact, the only worktree entries were root-owned modified `HANDOFF.md` and
  `PROGRESS.md` plus frozen untracked `implementation-03.md`; the index was empty. This review is
  the sole reviewer-created repository artifact. No product, test, marker, ledger, evidence,
  configuration or prior-review file was edited.
- No new `Q-*` proposal is needed. HANDOFF already expressly requires rejection when final detached
  attach recursively performs unbounded work and already requires global canonical query/all-copy
  subscribed proof. These findings apply that settled decision rather than introduce ambiguity.

## Single final verdict

**FAIL.** Revision 03 materially improves P12 and its ordinary user path is functional, but the
final Loro attach still performs transaction-sized recursive work in one RAF callback, an exported
multi-account query still exposes duplicate physical copies, and the required real-CRDT all-copy
unnest/swap proof is absent. Root must preserve this immutable failure review, keep HS-005
unchecked, and route F-01 through F-03 into P12 revision 04.
