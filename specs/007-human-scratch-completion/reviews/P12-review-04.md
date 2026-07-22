# P12 Independent Review — Revision 04

## Review identity and verdict

- Package / requirement / revision: `P12` / `HS-005` / `04`.
- Literal cumulative reviewed range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..2489c41335ad2292f9005403c18022c46915507b`.
- Frozen implementation evidence: `evidence/P12/implementation-04.md`, SHA-256
  `8bc662894cf3efb60456ba235d539504f4520ef6b0af047e3d6eb882e6e63def`, 207 lines / 14,537 bytes.
- Revision-04 product/test delta is
  `14259b5f6d02f566e32ac94ab4d63c20b5ef0353..2489c41335ad2292f9005403c18022c46915507b`: one commit,
  exactly seven authorized paths, 1,290 insertions and 173 deletions. The cumulative range contains
  23 paths, 6,239 insertions and 344 deletions. `git diff --check BASE..HEAD` passes.
- **Verdict: FAIL.** Revision 04 removes the recursive detached-tree attach and closes the global
  multi-account query defect. It does not make the attached shadow private at every public boundary:
  two exported ID/location queries and `useTransaction()` can return an incompletely copied nested
  duplicate, and the persistent epoch/batch record is deliberately materialized inside the public
  Mirror transaction store. Remote invalidation also misclassifies a legal imported batch containing
  both maintenance metadata and an ordinary domain edit, permitting stale reveal. Finally, the new
  unnest/swap test does not exchange either operation's updates or compare converged physical docs,
  so revision-03 F-03's explicit evidence gate remains open. HS-005 must remain unchecked.

## Findings

### F-01 — High / blocking: incomplete nested shadows cross public read boundaries

The top-level selector is correct: `getCanonicalTransactions()` rejects a transaction whose own ID
has the private shadow prefix (`src/lib/crdt/queries.ts:185-198`). The two direct lookup exports do
not preserve that boundary for the shadow's children:

- `findTransaction()` scans `suspectedDuplicates` for every top-level container without first
  rejecting a private parent, then materializes each matching child as an ordinary transaction
  (`queries.ts:315-341`). The materialized child retains its real public ID, so the later
  `getCanonicalTransactions()` filter accepts it.
- `findTransactionById()` likewise scans every private parent's nested list and puts matching
  children directly into its candidate array (`queries.ts:348-396`).
- The exported React `useTransaction()` hook performs the same raw traversal and returns the first
  matching nested child (`src/lib/crdt/context.tsx:396-415`). This cumulative public boundary was
  not changed or audited in revision 04.

That is observable partial state, not a theoretical malformed-document case. During
`advanceAttachedTransactionShadow()`, `createAttachedNestedShadow()` attaches a child with its real
ID and scalars plus empty `tagIds` and `allocations`; subsequent commits copy one nested tag or
allocation at a time (`maintenance.ts:1584-1593,1663-1738`). Between those commits, either direct
query can select that incomplete child over the still-complete source child according to `$cid`
ordering. The oversized observer test calls only `getAccountTransactions()`, which drops the entire
private parent, so its unique-public-ID assertion cannot detect this leak
(`tests/unit/crdt/maintenance.test.ts:267-334`).

Required closure: every raw parent traversal must reject a private parent before inspecting its
children, including direct queries, hooks, alias/import helpers and hydration/migration paths. Add a
subscribed test that pauses in each nested-copy phase and exercises every public lookup using the
nested public ID, proving it always returns the complete source value.

### F-02 — High / blocking: mixed imported batches can bypass invalidation and reveal stale data

`hasRelevantMaintenanceChanges()` treats a remote event that touches the domain as irrelevant when
the same event contains any metadata `accountId` update (`maintenance.ts:1967-1991`). Loro does not
promise one subscriber event per original commit when an exported update contains more than one
commit. Against the installed `loro-crdt` 1.13.7 runtime, an independent two-commit reproduction
created a metadata commit followed by an ordinary account/domain commit, exported both from the
starting version, and imported once. The subscriber received one event with:

```text
by: import, origin: ""
paths: [transactions], [transactions, __moneyflow_gc_metadata__], [transactions, account]
```

For that exact legal event, `touchesDomain` is true and `hasEncodedMaintenanceBatch()` is also true,
so the function returns false. No epoch rotation, iterator clear, proof invalidation or reschedule
occurs (`maintenance.ts:2068-2081`). This matters when a receiver already has an active shadow: root
scalars were copied only when the shadow was created (`maintenance.ts:1562-1581`). A public-source
notes/status/amount edit arriving in such a mixed batch can therefore leave the epoch current; the
worker continues the old shadow and the fixed reveal changes its ID to public while deleting the
newly edited source (`maintenance.ts:1853-1899`). The public result can lose the remote edit.

The new sync test exports all maintenance commits together, but no ordinary edit is included in that
export (`tests/integration/vault-maintenance.test.tsx:550-612`). It therefore proves
maintenance-only batch classification and import no-echo, not the required remote-edit invalidation.
Real sync can also coalesce causally pending operations when a missing predecessor later arrives;
correctness cannot rely on server arrival preserving one original commit per import notification.

Required closure: classify mixed events conservatively. Any ordinary public-domain change bundled
with maintenance work must invalidate the active shadow, while a maintenance-only shadow batch must
remain no-echo. Add subscribed real-Loro cases for metadata-before-edit, edit-before-metadata,
dependency-delayed delivery, active receiver shadow, and both delivery orders; assert the edited
field survives final convergence.

### F-03 — Medium / blocking evidence gate: unnest/swap operations are never exchanged

The revised mutation logic unions divergent nested IDs across physical parents and is directionally
consistent (`src/lib/crdt/mutations.ts:625-779`). The new parameterized test is not the exchange
proof claimed by implementation evidence:

1. it creates left/right conflict updates and imports those setup updates in both orders;
2. only after both imports are complete does it install subscriptions;
3. it invokes `unnestDuplicate()` or `swapDuplicate()` independently on both already-converged docs;
4. it never exports or imports either resulting operation; and
5. it compares canonical public query arrays, not `doc.getMap("transactions").toJSON()` with private
   metadata stripped (`tests/unit/crdt/maintenance.test.ts:554-736`).

Thus the observations cover only each local mutation. They cannot show that an operation generated
on one peer merges with the other peer's concurrent physical graph, that both operation delivery
orders converge, or that the raw parent/standalone/nested graph is clean. Performing the same
deterministic function locally on two docs is not CRDT delivery evidence. Revision-03 F-03 and the
literal revision-04 HANDOFF gate therefore remain unclosed.

Required closure: capture the update produced by one peer's unnest/swap, exchange it against a
concurrent peer update in both orders through subscribed real Loro docs, then drain maintenance and
compare the complete physical transaction JSON (excluding only independently justified private
metadata). Assert exact parent, standalone, nested, alias-pointer and unrelated-anchor conservation
at every subscriber boundary.

### F-04 — Medium / blocking evidence gate: maintenance metadata is a permanent public Mirror entry

The HANDOFF requires proof that low-level metadata never enters public Mirror/default construction
and that no private marker leaks. Revision 04 instead stores its epoch, random batch ID and active
flag as a schema-valid `AccountTransactionTree` at the reserved top-level key
`transactions.__moneyflow_gc_metadata__` (`maintenance.ts:1459-1519`). The transaction store schema
is a `LoroMapRecord(accountTransactionTreeSchema)` (`schema.ts:197-213`), so Mirror hydration
materializes that record in `VaultState.transactions`; the exported `useTransactions()` hook returns
the raw store unchanged (`context.tsx:335-340`). `commitMaintenance()` keeps updating the entry and
never removes it after completion.

The property test itself deletes this reserved key from each document before comparing physical
transaction JSON (`tests/unit/crdt/maintenance.test.ts:936-940`), confirming both its persistence
and peer-local divergence. Empty `years` keeps most current transaction queries harmless, but it
does not satisfy the assigned non-leakage boundary and exposes internal epoch/batch state to any raw
store consumer or future account enumeration.

Required closure: keep coordination data outside the public Mirror schema, or add an explicitly
reviewed private schema boundary that cannot be returned by public state/hooks/defaults and is
cleaned when no shadow remains. Prove snapshot hydration, normal construction, completed GC and two
peer convergence without a public reserved-account artifact.

## Revision-03 finding adjudication

| Prior finding                              | Revision-04 adjudication                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 recursive detached-tree attach        | **Core cost defect closed; lifecycle gate still fails.** Only empty maps cross Loro attachment boundaries; tags, allocations and nested items are subsequently attached one bounded item at a time. Final reveal uses scalar/delete/list operations and fixed-depth pruning, with no recursive attach. The oversized instrumentation records more than 300 applies and at most 24 observed mutation calls per commit. However, F-01/F-02/F-04 above show visible child state, stale invalidation and metadata leakage, all explicit parts of the same required closure. |
| F-02 global multi-account queries          | **Closed.** Selected multi-account `queryTransactions()` and unscoped `getTransactionsWithDuplicates()` now canonicalize after concatenation (`queries.ts:455-475,675-710`). The new same-ID tests cover total count/page content and unscoped duplicate parents; static inspection found no remaining exported cross-account concatenation defect.                                                                                                                                                                                                                     |
| F-03 subscribed all-copy unnest/swap proof | **Still open.** Real Loro docs and subscriptions are present, but the operation updates themselves are not exchanged and the physical documents are not compared (F-03 above).                                                                                                                                                                                                                                                                                                                                                                                          |

## Other acceptance and safety observations

- The attached-shadow construction materially improves boundedness. Root and nested maps are empty
  at attachment, each dynamic tag/allocation/duplicate unit is committed separately, stale-shadow
  deletion is one list delete, and reveal performs only fixed-count field changes, source deletion
  and at most three fixed-depth bucket deletes. This removes revision-03's official Loro recursive
  attach counterexample.
- Top-level public queries and the revised mutation search helpers generally use
  `isPublicTransaction()`. Local ordinary edits observed while a shadow is active rotate the epoch,
  and the reload test shows an uninterrupted same-epoch shadow can resume. Those greens do not cover
  the direct nested lookups or mixed remote event above.
- Maintenance remains `system:gc`, excluded from Undo while local updates are available to encrypted
  persistence. The integration profile retains no-echo, undo, hidden/visible and provider disposal
  coverage. No new plaintext financial payload, auth bypass or secret was found in the revision-04
  delta.
- Alias proof/apply, adjacent bucket cleanup, exact CID/index revalidation, cancellation and fixed
  frame item/time checks remain present from the cumulative implementation. No new regression was
  found in those paths.

## Independent automation

| Gate                                                                                                       | Independent result                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused profile: maintenance, transaction mutations, transaction queries and vault-maintenance integration | PASS in three clean processes; 4 files / 91 tests each.                                                                                                                                                                                                                                      |
| `pnpm test`                                                                                                | PASS; 60 files / 1,264 tests.                                                                                                                                                                                                                                                                |
| `pnpm typecheck`                                                                                           | PASS.                                                                                                                                                                                                                                                                                        |
| `pnpm lint`                                                                                                | PASS exit 0; 0 errors / 10 warnings. Two warnings are in changed query files/tests (`queries.ts` unused type imports and `transaction-queries.test.ts` unused `InsertTransactionInput`); the rest are inherited.                                                                             |
| `pnpm build`                                                                                               | PASS; Next 16.2.10 compiled, type generation passed and all 17 routes built.                                                                                                                                                                                                                 |
| Changed-path `oxfmt --check`                                                                               | PASS; all seven revision-04 paths.                                                                                                                                                                                                                                                           |
| Repository `pnpm format:check`                                                                             | FAIL on exactly nine disclosed control/frozen/evidence files: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `implementation-03.md`, uncommitted `implementation-04.md`, and `specs/human-scratch.md`. No revision-04 product/test path failed. |
| `git diff --check BASE..HEAD`                                                                              | PASS.                                                                                                                                                                                                                                                                                        |
| Affected no-retry E2E, four journeys with `--repeat-each=3 --workers=1`                                    | PASS; 12/12 in 2.9 minutes.                                                                                                                                                                                                                                                                  |
| Full no-retry E2E, `--workers=1`                                                                           | PASS; 87/87 in 5.4 minutes. The implementation's inherited T021c suite-order red did not reproduce.                                                                                                                                                                                          |
| Exact T021c with `--repeat-each=3 --workers=1 --retries=0`                                                 | PASS; 3/3 in 13.4 seconds.                                                                                                                                                                                                                                                                   |

The green automation is reported exactly but does not cover the deterministic static/runtime
counterexamples in F-01 through F-04. Read-only command verification was delegated as required by
the reviewer authority; the reviewer independently inspected the full cumulative diff and executed
the Loro event reproduction and browser gates.

## Installed-CLI manual charter

- Used only repository-installed headless `pnpm exec playwright-cli` with disposable session
  `p12-review-04` against a local authenticated server. No MCP, `npx`, temporary test/config,
  headed/UI/debug/pause mode or arbitrary sleep was used.
- Created a fresh identity while all twelve recovery words remained masked. The phrase was never
  revealed, copied, read, entered or printed. Settings showed `My Vault`, owner, online presence and
  `Saved`.
- Through named controls, created `Review Visible` for `12.34`; reload preserved one row. While the
  loaded app was offline, changed it to `13.45`; reconnect plus reload preserved `13.45` and
  returned to `Saved`. Final console inspection returned zero errors and sync/realtime requests
  were 200.
- A newly opened second tab navigated to Unlock because the vault key is tab-local; it was closed
  without exposing or re-entering the recovery phrase. The affected automated matrix independently
  passed the actual duplicate-tab journey three times.
- At 390 × 844 the responsive header, named menu/history/filter controls and transaction row
  remained represented. Dark and reduced-motion preferences were active. At simulated 200% zoom, a
  1,280 px viewport retained a 1,280 px document width and all core controls/data; the 390 px view
  used a 524 px horizontal grid presentation. The computed body background remained white under dark
  preference, the inherited P20A/P20B theme limitation rather than a P12 regression.
- Normal UI cannot create concurrent physical buckets, pause within nested shadow copying or import
  a mixed maintenance/user batch. Those decisive cases are necessarily static/automated; ordinary
  manual success does not waive them.

## Boundary, cleanup and questions

- Frozen human scratch remains SHA-256
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines / 24,246 bytes, with
  HS-005 unchecked. Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Failed review-03 remains SHA-256
  `3d68ffd573feff3e42d2b56d4be9d4626a3c4317c7bbda1079846127d20098ec`.
- CLI session was closed and its data-deletion command found no residual browser data. The manual
  server was stopped; generated `.playwright-cli/`, `test-results/` and any report directory were
  moved to desktop trash; `next-env.d.ts` was restored. No reviewer browser/dev/test process
  remains.
- Before this review artifact, the only worktree entries were root-owned modified `HANDOFF.md` and
  `PROGRESS.md` plus frozen untracked `implementation-04.md`; the index was empty. This review is
  the sole reviewer-created repository artifact. No product, test, marker, ledger, evidence,
  configuration or prior-review file was edited.
- No new `Q-*` proposal is needed. The HANDOFF already explicitly rejects visible partial state,
  stale reveal, private-marker leakage and helper-only convergence evidence. These findings apply
  those settled gates rather than introduce a product ambiguity.

## Single final verdict

**FAIL.** The recursive-attach and global-query defects are substantially closed, but incomplete
nested shadow children remain publicly queryable, mixed remote batches can bypass shadow
invalidation and stale-reveal edited data, private metadata permanently enters the public Mirror
store, and the mandated unnest/swap operation-exchange proof is still absent. Root must preserve
this immutable review, keep HS-005 unchecked, and route F-01 through F-04 into P12 revision 05.
